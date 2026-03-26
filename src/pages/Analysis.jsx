import { useEffect, useMemo, useState } from 'react';
import { format, getDay, getHours, isThisMonth, parseISO } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { getAppointments, getPatients } from '../services/db';
import styles from './Analysis.module.css';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TREATMENT_KEYS = [
  { key: 'endo', label: 'Endo', color: 'var(--endo)' },
  { key: 'operative', label: 'Operative', color: 'var(--operative)' },
  { key: 'surgery', label: 'Surgery', color: 'var(--surgery)' },
  { key: 'proth', label: 'Proth', color: 'var(--proth)' },
  { key: 'general', label: 'General', color: 'var(--accent)' },
];

function safeDate(value) {
  if (!value) return null;
  try {
    if (value?.toDate) return value.toDate();
    if (value?.seconds) return new Date(value.seconds * 1000);
    if (typeof value === 'string') return parseISO(value);
    return new Date(value);
  } catch {
    return null;
  }
}

function formatPct(value, total) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function getInitials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'P'
  );
}

function normalizeSex(patient) {
  const raw = patient?.sex || patient?.gender || patient?.difficulty || '';
  const value = String(raw).trim().toLowerCase();
  if (value === 'male' || value === 'm' || value === 'ذكر') return 'Male';
  if (value === 'female' || value === 'f' || value === 'أنثى') return 'Female';
  return 'Unknown';
}

function getProcedureLabel(patient) {
  const procedure = String(patient?.procedure || '').trim().toLowerCase();
  if (patient?.endoVisits?.length || procedure.includes('endo') || procedure.includes('rct')) return 'endo';
  if (patient?.operativeVisits?.length || procedure.includes('operative') || procedure.includes('filling') || procedure.includes('restoration')) return 'operative';
  if (patient?.surgeryVisits?.length || procedure.includes('surgery') || procedure.includes('surgical') || procedure.includes('extraction')) return 'surgery';
  if (patient?.prothVisits?.length || procedure.includes('proth') || procedure.includes('crown') || procedure.includes('bridge') || procedure.includes('denture')) return 'proth';
  return 'general';
}

function DonutChart({ title, subtitle, data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 74;
  const strokeWidth = 22;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  let cumulative = 0;
  const top = [...data].sort((a, b) => b.value - a.value)[0];

  return (
    <div className={`card ${styles.chartCard}`}>
      <div className={styles.cardHead}>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className={styles.miniBadge}>{total} total</span>
      </div>

      <div className={styles.donutWrap}>
        <svg viewBox="0 0 180 180" className={styles.donutSvg}>
          <circle cx="90" cy="90" r={normalizedRadius} fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          {data.map((item) => {
            const segment = total ? (item.value / total) * circumference : 0;
            const dashArray = `${segment} ${circumference - segment}`;
            const dashOffset = -cumulative;
            cumulative += segment;
            return (
              <circle
                key={item.label}
                cx="90"
                cy="90"
                r={normalizedRadius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="butt"
                transform="rotate(-90 90 90)"
              />
            );
          })}
        </svg>

        <div className={styles.donutCenter}>
          <div className={styles.donutTotal}>{total}</div>
          <div className={styles.donutLabel}>{top?.label || 'No data'}</div>
        </div>
      </div>

      <div className={styles.legendList}>
        {data.map((item) => (
          <div key={item.label} className={styles.legendItem}>
            <div className={styles.legendLeft}>
              <span className={styles.legendDot} style={{ background: item.color }} />
              <span>{item.label}</span>
            </div>
            <div className={styles.legendRight}>
              <strong>{item.value}</strong>
              <span>{formatPct(item.value, total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ title, subtitle, data, color = 'var(--accent)' }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className={`card ${styles.chartCard}`}>
      <div className={styles.cardHead}>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className={styles.barChart}>
        {data.map((item) => (
          <div key={item.label} className={styles.barCol}>
            <div className={styles.barValue}>{item.value}</div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{
                  height: `${Math.max((item.value / max) * 100, item.value ? 10 : 0)}%`,
                  background: item.color || color,
                }}
              />
            </div>
            <div className={styles.barLabel}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Analysis() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getPatients(user.uid), getAppointments(user.uid)])
      .then(([p, a]) => {
        setPatients(p);
        setAppointments(a);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const analytics = useMemo(() => {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sexCounts = { Male: 0, Female: 0, Unknown: 0 };
    const treatmentCounts = { endo: 0, operative: 0, surgery: 0, proth: 0, general: 0 };
    const statusCounts = {
      'Not started': 0,
      'In progress': 0,
      Done: 0,
      'Follow Up': 0,
      'Lap waiting': 0,
    };

    const thisMonthPatients = patients.filter((patient) => {
      const date = safeDate(patient.createdAt || patient.dateStart);
      return date && isThisMonth(date);
    }).length;

    const lastMonthPatients = patients.filter((patient) => {
      const date = safeDate(patient.createdAt || patient.dateStart);
      return date && date.getMonth() === previousMonth.getMonth() && date.getFullYear() === previousMonth.getFullYear();
    }).length;

    patients.forEach((patient) => {
      const sex = normalizeSex(patient);
      sexCounts[sex] = (sexCounts[sex] || 0) + 1;
      treatmentCounts[getProcedureLabel(patient)] += 1;
      const status = patient.status || 'Not started';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const weekdayCounts = Array.from({ length: 7 }, (_, day) => ({ label: WEEKDAY_LABELS[day], value: 0 }));
    const hourBuckets = [
      { label: '9-12', value: 0 },
      { label: '12-3', value: 0 },
      { label: '3-6', value: 0 },
      { label: '6-9', value: 0 },
    ];

    let todayAppointments = 0;
    let followUpPatients = 0;
    let donePatients = 0;

    patients.forEach((patient) => {
      if (patient.status === 'Follow Up') followUpPatients += 1;
      if (patient.status === 'Done') donePatients += 1;
    });

    appointments.forEach((appointment) => {
      const date = safeDate(appointment.datetime);
      if (!date || Number.isNaN(date.getTime())) return;
      weekdayCounts[getDay(date)].value += 1;
      const hour = getHours(date);
      if (hour >= 9 && hour < 12) hourBuckets[0].value += 1;
      else if (hour >= 12 && hour < 15) hourBuckets[1].value += 1;
      else if (hour >= 15 && hour < 18) hourBuckets[2].value += 1;
      else if (hour >= 18 && hour < 21) hourBuckets[3].value += 1;

      if (date.toDateString() === now.toDateString()) todayAppointments += 1;
    });

    const sexData = [
      { label: 'Male', value: sexCounts.Male, color: 'var(--endo)' },
      { label: 'Female', value: sexCounts.Female, color: '#ff5ea8' },
      { label: 'Unknown', value: sexCounts.Unknown, color: 'rgba(255,255,255,0.18)' },
    ];

    const treatmentData = TREATMENT_KEYS.map((item) => ({
      label: item.label,
      value: treatmentCounts[item.key],
      color: item.color,
    }));

    const activeCases = (statusCounts['In progress'] || 0) + (statusCounts['Follow Up'] || 0) + (statusCounts['Lap waiting'] || 0);
    const completionRate = patients.length ? Math.round((donePatients / patients.length) * 100) : 0;
    const growth = lastMonthPatients ? Math.round(((thisMonthPatients - lastMonthPatients) / lastMonthPatients) * 100) : thisMonthPatients ? 100 : 0;
    const peakDay = [...weekdayCounts].sort((a, b) => b.value - a.value)[0];
    const peakHours = [...hourBuckets].sort((a, b) => b.value - a.value)[0];
    const topTreatment = [...treatmentData].sort((a, b) => b.value - a.value)[0];
    const healthScore = Math.max(45, Math.min(98, Math.round((completionRate * 0.45) + ((todayAppointments + activeCases) * 2) + (patients.length * 0.8))));

    const insights = [
      peakDay?.value
        ? `Your busiest day is ${peakDay.label} with ${peakDay.value} appointment${peakDay.value > 1 ? 's' : ''}.`
        : 'Start adding appointments to unlock traffic insights.',
      topTreatment?.value
        ? `${topTreatment.label} is leading your case mix at ${formatPct(topTreatment.value, patients.length || 1)} of patients.`
        : 'Treatment mix will appear automatically when you add cases.',
      followUpPatients
        ? `You have ${followUpPatients} follow-up case${followUpPatients > 1 ? 's' : ''} ready for recall or reminder.`
        : 'Great: there are no pending follow-up cases right now.',
      peakHours?.value
        ? `Peak hours are around ${peakHours.label}. This is a smart slot for premium bookings.`
        : 'Peak-hour analysis will show once appointments are booked.',
    ];

    const recentPatients = [...patients].slice(0, 5);

    return {
      sexData,
      treatmentData,
      weekdayCounts,
      hourBuckets,
      recentPatients,
      stats: {
        totalPatients: patients.length,
        totalAppointments: appointments.length,
        activeCases,
        completionRate,
        thisMonthPatients,
        growth,
        healthScore,
        todayAppointments,
      },
      insights,
      peakDay,
      peakHours,
    };
  }, [patients, appointments]);

  if (loading) return <div className={styles.loading}>Loading analysis...</div>;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <div className={styles.kicker}>Smart Analysis</div>
          <h1 className={styles.title}>See your clinic in one powerful view.</h1>
          <p className={styles.subtitle}>
            Trends, patient mix, peak hours, treatment breakdown, and quick insights that make the system feel premium from day one.
          </p>
        </div>
        <div className={styles.scoreCard}>
          <div className={styles.scoreRing} style={{ '--score': `${analytics.stats.healthScore}%` }}>
            <div>
              <strong>{analytics.stats.healthScore}</strong>
              <span>Clinic Health</span>
            </div>
          </div>
          <p>{analytics.stats.healthScore >= 80 ? 'Excellent momentum this month.' : 'Solid start — keep feeding the system data.'}</p>
        </div>
      </section>

      <section className={styles.statsGrid}>
        <div className={`card ${styles.statCard}`}>
          <span>👥 Total Patients</span>
          <strong>{analytics.stats.totalPatients}</strong>
          <small>{analytics.stats.thisMonthPatients} added this month</small>
        </div>
        <div className={`card ${styles.statCard}`}>
          <span>📅 Appointments</span>
          <strong>{analytics.stats.totalAppointments}</strong>
          <small>{analytics.stats.todayAppointments} scheduled today</small>
        </div>
        <div className={`card ${styles.statCard}`}>
          <span>🔄 Active Cases</span>
          <strong>{analytics.stats.activeCases}</strong>
          <small>{analytics.peakHours?.label || 'No peak yet'} busiest slot</small>
        </div>
        <div className={`card ${styles.statCard}`}>
          <span>📈 Monthly Growth</span>
          <strong>{analytics.stats.growth > 0 ? '+' : ''}{analytics.stats.growth}%</strong>
          <small>{analytics.stats.completionRate}% completion rate</small>
        </div>
      </section>

      <section className={styles.mainGrid}>
        <DonutChart
          title="Patient Gender Mix"
          subtitle="Quick visual of female vs male patients"
          data={analytics.sexData}
        />

        <DonutChart
          title="Treatment Mix"
          subtitle="Endo, operative, surgery, proth and general cases"
          data={analytics.treatmentData}
        />
      </section>

      <section className={styles.mainGrid}>
        <BarChart
          title="Appointments by Day"
          subtitle="Know which day brings the most traffic"
          data={analytics.weekdayCounts}
        />
        <BarChart
          title="Peak Hours"
          subtitle="The strongest booking windows inside your clinic"
          data={analytics.hourBuckets.map((item, index) => ({ ...item, color: TREATMENT_KEYS[index]?.color || 'var(--accent)' }))}
          color="var(--accent2)"
        />
      </section>

      <section className={styles.bottomGrid}>
        <div className={`card ${styles.insightsCard}`}>
          <div className={styles.cardHead}>
            <div>
              <h3>AI-Style Insights</h3>
              <p>Smart notes that make the app feel alive</p>
            </div>
          </div>
          <div className={styles.insightList}>
            {analytics.insights.map((text, index) => (
              <div key={index} className={styles.insightItem}>
                <span>{['⚡', '📌', '🔔', '🧠'][index] || '✨'}</span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`card ${styles.recentCard}`}>
          <div className={styles.cardHead}>
            <div>
              <h3>Recent Patients Snapshot</h3>
              <p>Fast preview that feels premium on first use</p>
            </div>
          </div>
          {analytics.recentPatients.length === 0 ? (
            <div className={styles.emptyState}>
              <strong>No patients yet</strong>
              <p>Add your first patient and the analysis page will start building itself automatically.</p>
            </div>
          ) : (
            <div className={styles.patientList}>
              {analytics.recentPatients.map((patient) => (
                <div key={patient.id} className={styles.patientRow}>
                  <div className={styles.avatar}>{getInitials(patient.name)}</div>
                  <div className={styles.patientMeta}>
                    <strong>{patient.name || 'Unnamed Patient'}</strong>
                    <span>
                      {normalizeSex(patient)} · {patient.procedure || 'General'} · {patient.status || 'No status'}
                    </span>
                  </div>
                  <div className={styles.rowDate}>{patient.dateStart ? format(new Date(patient.dateStart), 'dd MMM') : '—'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
