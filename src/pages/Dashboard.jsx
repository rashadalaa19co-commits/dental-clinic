import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getPatients, getAppointments, checkAccess } from '../services/db';
import { format, isToday, parseISO, isAfter, startOfDay, subDays, compareAsc } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarPlus,
  ChevronRight,
  ImagePlus,
  Lock,
  MessageCircle,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import styles from './Dashboard.module.css';

const STATUS_BADGE = {
  Done: 'badge-done',
  'In progress': 'badge-progress',
  'Not started': 'badge-waiting',
  'Follow Up': 'badge-followup',
  'Lap waiting': 'badge-lap',
  Scheduled: 'badge-waiting',
  Confirmed: 'badge-progress',
};

const PLAN_LABELS = {
  free: 'Free Trial',
  silver: 'Silver Plan',
  gold: 'Gold Plan',
};

const timestampToDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value instanceof Date) return value;
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
};

const getPatientInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return '?';
  return parts.map((part) => part[0]?.toUpperCase()).join('');
};

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [patients, setPatients] = useState([]);
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getPatients(user.uid), getAppointments(user.uid), checkAccess(user.uid, user)])
      .then(([p, a, acc]) => {
        setPatients(p);
        setAppts(a);
        setAccess(acc);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const stats = useMemo(
    () => ({
      total: patients.length,
      inProgress: patients.filter((p) => p.status === 'In progress').length,
      done: patients.filter((p) => p.status === 'Done').length,
      notStarted: patients.filter((p) => p.status === 'Not started').length,
    }),
    [patients]
  );

  const patientsMap = useMemo(() => {
    const map = new Map();
    patients.forEach((p) => {
      if (p.id) map.set(p.id, p);
    });
    return map;
  }, [patients]);

  const todayAppts = useMemo(
    () =>
      appts
        .filter((a) => a.datetime && isToday(parseISO(a.datetime)))
        .sort((a, b) => compareAsc(parseISO(a.datetime), parseISO(b.datetime))),
    [appts]
  );

  const upcomingAppts = useMemo(
    () =>
      appts
        .filter((a) => a.datetime && isAfter(parseISO(a.datetime), new Date()))
        .sort((a, b) => compareAsc(parseISO(a.datetime), parseISO(b.datetime))),
    [appts]
  );

  const nextAppointment = upcomingAppts[0] || null;
  const recent = patients.slice(0, 4);

  const weeklyActivity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = startOfDay(subDays(new Date(), 6 - index));
      return {
        key: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEE'),
        fullDate: date,
        patients: 0,
        appointments: 0,
      };
    });

    const map = new Map(days.map((day) => [day.key, day]));

    patients.forEach((patient) => {
      const date = timestampToDate(patient.createdAt);
      if (!date) return;
      const key = format(startOfDay(date), 'yyyy-MM-dd');
      if (map.has(key)) map.get(key).patients += 1;
    });

    appts.forEach((appt) => {
      if (!appt.datetime) return;
      const date = parseISO(appt.datetime);
      const key = format(startOfDay(date), 'yyyy-MM-dd');
      if (map.has(key)) map.get(key).appointments += 1;
    });

    return days.map((day) => ({
      ...day,
      total: day.patients + day.appointments,
    }));
  }, [patients, appts]);

  const maxWeeklyTotal = Math.max(...weeklyActivity.map((day) => day.total), 1);
  const weekPatients = weeklyActivity.reduce((sum, day) => sum + day.patients, 0);
  const weekAppointments = weeklyActivity.reduce((sum, day) => sum + day.appointments, 0);
  const completionRate = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const occupancyText = todayAppts.length
    ? `${todayAppts.length} appointment${todayAppts.length > 1 ? 's' : ''} scheduled today`
    : 'No appointments booked for today';
  const followUpCount = stats.inProgress + stats.notStarted;

  const normalizePhone = (phone = '') => {
    const digits = String(phone).replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('20')) return digits;
    if (digits.startsWith('0')) return `20${digits.slice(1)}`;
    return digits;
  };

  const getAppointmentPhone = (appt) => {
    if (appt.phone) return normalizePhone(appt.phone);

    if (appt.patientId && patientsMap.has(appt.patientId)) {
      return normalizePhone(patientsMap.get(appt.patientId)?.phone || '');
    }

    const matchedPatient = patients.find(
      (p) => p.name?.trim()?.toLowerCase() === appt.patientName?.trim()?.toLowerCase()
    );

    return normalizePhone(matchedPatient?.phone || '');
  };

  const buildWhatsAppMessage = (appt) => {
    const time = appt.datetime ? format(parseISO(appt.datetime), 'hh:mm a') : '--';
    const date = appt.datetime ? format(parseISO(appt.datetime), 'dd/MM/yyyy') : '--';

    return `Hello ${appt.patientName || ''},\nThis is a reminder of your appointment at AuraDent.\nDate: ${date}\nTime: ${time}\nType: ${appt.type || 'Dental appointment'}\n\nPlease contact us if you need to reschedule.`;
  };

  const ensureGoldWhatsApp = () => {
    if (access?.plan === 'gold') return true;
    nav('/subscribe');
    return false;
  };

  const sendWhatsApp = (appt) => {
    if (!ensureGoldWhatsApp()) return;

    const phone = getAppointmentPhone(appt);

    if (!phone) {
      alert(`No phone number found for ${appt.patientName || 'this patient'}`);
      return;
    }

    const message = buildWhatsAppMessage(appt);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const sendTodayReminders = () => {
    if (!ensureGoldWhatsApp()) return;
    if (!todayAppts.length) return;
    const firstWithPhone = todayAppts.find((appt) => getAppointmentPhone(appt));

    if (!firstWithPhone) {
      alert('No phone numbers found for today\'s appointments');
      return;
    }

    sendWhatsApp(firstWithPhone);
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  const isGoldPlan = access?.plan === 'gold';

  return (
    <div className="motionPage">
      {access && !access.isActive && (
        <div className={`${styles.trialBanner} motionCard`}>
          <div>
            <div className={styles.trialTitle}>🔒 Free Trial — {access.patientCount}/5 patients used</div>
            <div className={styles.trialSub}>Upgrade to unlock unlimited patients and premium tools.</div>
          </div>
          <a
            href="https://wa.me/201555354570"
            target="_blank"
            rel="noreferrer"
            className={styles.trialLink}
          >
            📱 Contact on WhatsApp
          </a>
        </div>
      )}

      <section className={`${styles.topShell} motionHero`}>
        <div className={styles.topHeader}>
          <div>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.sub}>
              {format(new Date(), 'EEEE, MMMM d yyyy')} · Welcome back, Dr.{' '}
              {user?.displayName?.split(' ')[0]}
            </p>
          </div>
          <div className={styles.planBadge}>{PLAN_LABELS[access?.plan] || 'Clinic Plan'}</div>
        </div>

        <div className={styles.topGrid}>
          <div className={styles.todayPanel}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.sectionTitle}>📅 Today&apos;s Appointments</h3>
                <p className={styles.sectionSub}>{occupancyText}</p>
              </div>
              <div className={styles.todayPill}>{todayAppts.length} today</div>
            </div>

            <div className={styles.todayActions}>
              <button className={styles.primaryAction} type="button" onClick={() => nav('/appointments')}>
                <CalendarPlus size={16} />
                Add Appointment
              </button>
              <button
                className={`${styles.secondaryAction} ${!isGoldPlan ? styles.lockedAction : ''}`}
                type="button"
                onClick={isGoldPlan ? sendTodayReminders : () => nav('/subscribe')}
                title={isGoldPlan ? 'Send WhatsApp reminders' : 'Gold feature'}
              >
                {isGoldPlan ? <MessageCircle size={16} /> : <Lock size={16} />}
                {isGoldPlan ? 'Send Reminders' : 'Unlock WhatsApp'}
              </button>
            </div>

            {todayAppts.length === 0 ? (
              <div className={styles.emptyStateCompact}>
                <strong>You&apos;re free today 🎉</strong>
                <p>No appointments yet. Add one to start filling your day.</p>
              </div>
            ) : (
              <div className={styles.todayList}>
                {todayAppts.slice(0, 4).map((a) => (
                  <div key={a.id} className={styles.apptRowDense}>
                    <div className={styles.apptTimeBox}>
                      <strong>{a.datetime ? format(parseISO(a.datetime), 'HH:mm') : '--'}</strong>
                      <span>{a.datetime ? format(parseISO(a.datetime), 'aa') : ''}</span>
                    </div>

                    <div className={styles.apptInfo}>
                      <div className={styles.apptName}>{a.patientName || 'Unnamed patient'}</div>
                      <div className={styles.apptType}>{a.type || 'Dental appointment'}</div>
                    </div>

                    <span className={`badge ${STATUS_BADGE[a.status] || 'badge-waiting'}`}>
                      {a.status || 'Scheduled'}
                    </span>

                    <button
                      className={`${styles.whatsBtn} ${!isGoldPlan ? styles.lockedWhatsBtn : ''}`}
                      onClick={isGoldPlan ? () => sendWhatsApp(a) : () => nav('/subscribe')}
                      title={isGoldPlan ? 'Send WhatsApp' : 'Gold feature'}
                      type="button"
                    >
                      {isGoldPlan ? <MessageCircle size={16} /> : <Lock size={16} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.heroSide}>
            <div className={styles.heroStats}>
              <div className={`${styles.heroStatCard} ${styles.heroStatCompact}`}>
                <span>Patients</span>
                <strong>{stats.total}</strong>
                <small>{stats.inProgress} active cases now</small>
              </div>
              <div className={`${styles.heroStatCard} ${styles.heroStatCompact}`}>
                <span>Completion</span>
                <strong>{completionRate}%</strong>
                <small>{stats.done} cases marked done</small>
              </div>
              <div className={`${styles.heroStatCard} ${styles.heroStatCompact}`}>
                <span>Follow-up</span>
                <strong>{followUpCount}</strong>
                <small>Cases that still need attention</small>
              </div>
              <div className={`${styles.heroStatCard} ${styles.heroStatCompact}`}>
                <span>This week</span>
                <strong>{weekPatients + weekAppointments}</strong>
                <small>{weekPatients} patients · {weekAppointments} appointments</small>
              </div>
            </div>

            <div className={styles.quickActionsCompact}>
              <button className={styles.primaryAction} type="button" onClick={() => nav('/patients/new')}>
                <UserPlus size={16} />
                Add Patient
              </button>
              <button className={styles.ghostAction} type="button" onClick={() => nav('/analysis')}>
                <TrendingUp size={16} />
                Analysis
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.middleGrid} motionCard motionCardDelay2`}>
        <div className="card">
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.sectionTitle}>⚡ Today Focus</h3>
              <p className={styles.sectionSub}>What deserves attention first inside the clinic today</p>
            </div>
          </div>

          <div className={styles.focusGrid}>
            <div className={styles.focusItem}>
              <span>Next appointment</span>
              <strong>{nextAppointment?.patientName || 'No upcoming appointment'}</strong>
              <small>
                {nextAppointment?.datetime
                  ? format(parseISO(nextAppointment.datetime), 'dd MMM yyyy · HH:mm')
                  : 'Your schedule is clear for now'}
              </small>
            </div>
            <div className={styles.focusItem}>
              <span>Appointments today</span>
              <strong>{todayAppts.length}</strong>
              <small>{todayAppts.length ? 'Check reminders and arrivals' : 'No bookings yet today'}</small>
            </div>
            <div className={styles.focusItem}>
              <span>Need follow-up</span>
              <strong>{followUpCount}</strong>
              <small>In progress + not started cases</small>
            </div>
            <div className={styles.focusItem}>
              <span>Action</span>
              <strong>{access?.plan === 'gold' ? 'WhatsApp ready' : 'Upgrade available'}</strong>
              <small>
                {isGoldPlan
                  ? 'Send reminders directly from today list'
                  : 'Gold unlocks reminders and gallery tools'}
              </small>
            </div>
          </div>
        </div>

        <div className="card">
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.sectionTitle}>📈 Weekly Activity</h3>
              <p className={styles.sectionSub}>Patients added and appointments booked in the last 7 days</p>
            </div>
            <div className={styles.miniBadge}>{weekPatients + weekAppointments} total actions</div>
          </div>

          <div className={styles.weekChart}>
            {weeklyActivity.map((day) => {
              const height = Math.max((day.total / maxWeeklyTotal) * 100, day.total ? 16 : 0);
              return (
                <div key={day.key} className={styles.barCol}>
                  <div className={styles.barValue}>{day.total}</div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ height: `${height}%` }} />
                  </div>
                  <div className={styles.barMeta}>
                    <strong>{day.label}</strong>
                    <span>{day.patients}P · {day.appointments}A</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={`${styles.bottomGrid} motionCard motionCardDelay3`}>
        <div className="card">
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.sectionTitle}>👥 Recent Patients</h3>
              <p className={styles.sectionSub}>Your latest added cases with quick access</p>
            </div>
            <button className={styles.inlineAction} onClick={() => nav('/patients/new')} type="button">
              + New
            </button>
          </div>

          {recent.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No patients yet</strong>
              <p>Create your first patient profile to populate the dashboard.</p>
            </div>
          ) : (
            recent.map((p) => (
              <div key={p.id} className={styles.patientRow}>
                <div className={styles.patientAvatar}>{getPatientInitials(p.name)}</div>
                <div className={styles.patientText}>
                  <div className={styles.patientName}>{p.name}</div>
                  <div className={styles.patientMeta}>
                    {p.procedure || 'No procedure'}
                    {p.tooth ? ` · ${p.tooth}` : ''}
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[p.status] || 'badge-waiting'}`}>
                  {p.status || '-'}
                </span>
                <button className={styles.openBtn} onClick={() => nav(`/patients/${p.id}`)} type="button">
                  Open <ArrowRight size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className={styles.sideStack}>
          <div className="card">
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.sectionTitle}>🧰 Tools & Access</h3>
                <p className={styles.sectionSub}>Fast access to premium tools and key shortcuts</p>
              </div>
            </div>

            <div className={styles.toolGrid}>
              <button
                type="button"
                className={styles.toolCard}
                onClick={() => nav(access?.hasGallery ? '/gallery' : '/subscribe')}
              >
                <div>
                  <span>Gallery</span>
                  <strong>{access?.hasGallery ? 'Ready to use' : 'Gold feature'}</strong>
                </div>
                {access?.hasGallery ? <ImagePlus size={18} /> : <Lock size={18} />}
              </button>

              <button
                type="button"
                className={styles.toolCard}
                onClick={isGoldPlan ? sendTodayReminders : () => nav('/subscribe')}
              >
                <div>
                  <span>WhatsApp</span>
                  <strong>{isGoldPlan ? 'Send reminders' : 'Upgrade to unlock'}</strong>
                </div>
                {isGoldPlan ? <MessageCircle size={18} /> : <Lock size={18} />}
              </button>
            </div>
          </div>

          <div className="card">
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.sectionTitle}>📌 Quick Summary</h3>
                <p className={styles.sectionSub}>Compact overview of what is happening in the clinic</p>
              </div>
            </div>

            <div className={styles.summaryListCompact}>
              <div className={styles.summaryLine}>
                <span>Upcoming appointments</span>
                <strong>{upcomingAppts.length}</strong>
              </div>
              <div className={styles.summaryLine}>
                <span>Done cases</span>
                <strong>{stats.done}</strong>
              </div>
              <div className={styles.summaryLine}>
                <span>Need follow-up</span>
                <strong>{followUpCount}</strong>
              </div>
              <button className={styles.summaryLink} type="button" onClick={() => nav('/analysis')}>
                Open full analysis <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
