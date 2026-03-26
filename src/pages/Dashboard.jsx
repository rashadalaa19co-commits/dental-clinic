import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getPatients, getAppointments, checkAccess } from '../services/db';
import { format, isToday, parseISO, isAfter, startOfDay, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarPlus,
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

  const stats = useMemo(() => ({
    total: patients.length,
    inProgress: patients.filter((p) => p.status === 'In progress').length,
    done: patients.filter((p) => p.status === 'Done').length,
    notStarted: patients.filter((p) => p.status === 'Not started').length,
  }), [patients]);

  const patientsMap = useMemo(() => {
    const map = new Map();
    patients.forEach((p) => {
      if (p.id) map.set(p.id, p);
    });
    return map;
  }, [patients]);

  const todayAppts = useMemo(
    () => appts.filter((a) => a.datetime && isToday(parseISO(a.datetime))),
    [appts]
  );

  const upcomingAppts = useMemo(
    () => appts.filter((a) => a.datetime && isAfter(parseISO(a.datetime), new Date())),
    [appts]
  );

  const nextAppointment = upcomingAppts[0] || null;
  const recent = patients.slice(0, 5);

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
    : 'No appointments yet today';

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
    const time = appt.datetime ? format(parseISO(appt.datetime), 'HH:mm') : '--';
    const date = appt.datetime ? format(parseISO(appt.datetime), 'dd/MM/yyyy') : '--';

    return `Hello ${appt.patientName || ''},\nThis is a reminder of your appointment at DentaCare Pro.\nDate: ${date}\nTime: ${time}\nType: ${appt.type || 'Dental appointment'}\n\nPlease contact us if you need to reschedule.`;
  };

  const sendWhatsApp = (appt) => {
    const phone = getAppointmentPhone(appt);

    if (!phone) {
      alert(`No phone number found for ${appt.patientName || 'this patient'}`);
      return;
    }

    const message = buildWhatsAppMessage(appt);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

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

      <section className={`${styles.overview} motionHero`}>
        <div className={styles.overviewMain}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Dashboard</h1>
              <p className={styles.sub}>
                {format(new Date(), 'EEEE, MMMM d yyyy')} · Welcome back, Dr.{' '}
                {user?.displayName?.split(' ')[0]}
              </p>
            </div>
            <div className={styles.planBadge}>{PLAN_LABELS[access?.plan] || 'Clinic Plan'}</div>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.heroStatCard}>
              <span>Patients</span>
              <strong>{stats.total}</strong>
              <small>{stats.inProgress} active cases now</small>
            </div>
            <div className={styles.heroStatCard}>
              <span>Today</span>
              <strong>{todayAppts.length}</strong>
              <small>{occupancyText}</small>
            </div>
            <div className={styles.heroStatCard}>
              <span>Completion</span>
              <strong>{completionRate}%</strong>
              <small>{stats.done} cases marked done</small>
            </div>
          </div>

          <div className={styles.quickActions}>
            <button className={styles.primaryAction} type="button" onClick={() => nav('/patients/new')}>
              <UserPlus size={16} />
              Add Patient
            </button>
            <button className={styles.secondaryAction} type="button" onClick={() => nav('/appointments')}>
              <CalendarPlus size={16} />
              Add Appointment
            </button>
            <button className={styles.secondaryAction} type="button" onClick={() => nav('/analysis')}>
              <TrendingUp size={16} />
              Open Analysis
            </button>
          </div>
        </div>

        <div className={styles.overviewSide}>
          <div className={styles.todayCard}>
            <div className={styles.sideLabel}>Next appointment</div>
            {nextAppointment ? (
              <>
                <strong>{nextAppointment.patientName || 'Unnamed patient'}</strong>
                <p>
                  {format(parseISO(nextAppointment.datetime), 'dd MMM yyyy · HH:mm')}
                  {nextAppointment.type ? ` · ${nextAppointment.type}` : ''}
                </p>
              </>
            ) : (
              <>
                <strong>You&apos;re free today 🎉</strong>
                <p>No upcoming appointments scheduled yet.</p>
              </>
            )}
          </div>

          <div className={styles.lockedGrid}>
            <button
              type="button"
              className={styles.lockedCard}
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
              className={styles.lockedCard}
              onClick={() => nav(access?.plan === 'gold' ? '/appointments' : '/subscribe')}
            >
              <div>
                <span>WhatsApp</span>
                <strong>{access?.plan === 'gold' ? 'Send reminders' : 'Upgrade to unlock'}</strong>
              </div>
              {access?.plan === 'gold' ? <MessageCircle size={18} /> : <Lock size={18} />}
            </button>
          </div>
        </div>
      </section>

      <section className={`${styles.statsGrid} motionCard motionCardDelay1`}>
        {[
          { label: 'Total Patients', value: stats.total, color: 'var(--accent)', icon: '👥' },
          { label: 'In Progress', value: stats.inProgress, color: 'var(--endo)', icon: '🔄' },
          { label: 'Done', value: stats.done, color: 'var(--success)', icon: '✅' },
          { label: 'Not Started', value: stats.notStarted, color: 'var(--warning)', icon: '⏳' },
        ].map((s) => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statNum} style={{ color: s.color }}>
              {s.value}
            </div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </section>

      <section className={`${styles.middleGrid} motionCard motionCardDelay2`}>
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

        <div className="card">
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.sectionTitle}>⚡ Quick Summary</h3>
              <p className={styles.sectionSub}>A fast look at what needs attention today</p>
            </div>
          </div>

          <div className={styles.summaryList}>
            <div className={styles.summaryItem}>
              <span>Appointments today</span>
              <strong>{todayAppts.length}</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Upcoming appointments</span>
              <strong>{upcomingAppts.length}</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Done cases</span>
              <strong>{stats.done}</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Need follow-up</span>
              <strong>{stats.inProgress + stats.notStarted}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.grid2} motionCard motionCardDelay3`}>
        <div className="card">
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.sectionTitle}>📅 Today&apos;s Appointments</h3>
              <p className={styles.sectionSub}>
                {todayAppts.length ? 'Stay on top of today’s schedule' : 'No appointments scheduled for today'}
              </p>
            </div>
            <button type="button" className={styles.inlineAction} onClick={() => nav('/appointments')}>
              + Add Appointment
            </button>
          </div>

          {todayAppts.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>You&apos;re free today 🎉</strong>
              <p>No appointments yet. Add one to start filling your day.</p>
            </div>
          ) : (
            todayAppts.map((a) => (
              <div key={a.id} className={styles.apptRow}>
                <div className={styles.apptTime}>
                  {a.datetime ? format(parseISO(a.datetime), 'HH:mm') : '--'}
                </div>

                <div className={styles.apptInfo}>
                  <div className={styles.apptName}>{a.patientName}</div>
                  <div className={styles.apptType}>{a.type || 'Dental appointment'}</div>
                </div>

                <span className={`badge ${STATUS_BADGE[a.status] || 'badge-waiting'}`}>
                  {a.status || 'Scheduled'}
                </span>

                <button
                  className={styles.whatsBtn}
                  onClick={() => sendWhatsApp(a)}
                  title="Send WhatsApp"
                  type="button"
                >
                  <MessageCircle size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.sectionTitle}>👥 Recent Patients</h3>
              <p className={styles.sectionSub}>Your latest added cases</p>
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
      </section>
    </div>
  );
}
