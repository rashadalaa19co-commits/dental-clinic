import { useEffect, useMemo, useState } from 'react';
import { getDay, getHours, isThisMonth, parseISO } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { getAppointments, getPatients } from '../services/db';
import styles from './Analysis.module.css';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TREATMENT_KEYS = [
  { key: 'endo', label: 'Endo', color: 'var(--endo)' },
  { key: 'operative', label: 'Operative', color: 'var(--operative)' },
  { key: 'surgery', label: 'Surgery', color: 'var(--surgery)' },
  { key: 'proth', label: 'Fixed', color: 'var(--proth)' },
  { key: 'general', label: 'General', color: 'var(--accent)' },
];

const TITLE_LEVELS = {
  Endo: [
    { min: 0, max: 49, title: 'Senior' },
    { min: 50, max: 99, title: 'Endo Master' },
    { min: 100, max: 199, title: 'Root Canal Pro' },
    { min: 200, max: 399, title: 'Pulp Expert' },
    { min: 400, max: 999, title: 'Canal King' },
    { min: 1000, max: Infinity, title: 'Aura Endo' },
  ],
  Operative: [
    { min: 0, max: 49, title: 'Senior' },
    { min: 50, max: 99, title: 'Operative Pro' },
    { min: 100, max: 299, title: 'Smile Fixer' },
    { min: 300, max: 499, title: 'Precision Dentist' },
    { min: 500, max: 999, title: 'Cavity Hunter' },
    { min: 1000, max: Infinity, title: 'Aura Operative' },
  ],
  Surgery: [
    { min: 0, max: 9, title: 'Senior' },
    { min: 10, max: 99, title: 'Surgical Pro' },
    { min: 100, max: 199, title: 'Extraction Expert' },
    { min: 200, max: 999, title: 'Surgical Master' },
    { min: 1000, max: Infinity, title: 'Aura Surgery' },
  ],
  Fixed: [
    { min: 0, max: 9, title: 'Senior' },
    { min: 10, max: 49, title: 'Fixed Pro' },
    { min: 50, max: 199, title: 'Crown Expert' },
    { min: 200, max: 499, title: 'Smile Architect' },
    { min: 500, max: Infinity, title: 'Aura Fixed' },
  ],
  All: [
    { min: 0, max: 999, title: 'Rising' },
    { min: 1000, max: 4999, title: 'Maestro' },
    { min: 5000, max: Infinity, title: 'Aura' },
  ],
};

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
  if (patient?.prothVisits?.length || procedure.includes('proth') || procedure.includes('fixed') || procedure.includes('crown') || procedure.includes('bridge') || procedure.includes('denture')) return 'proth';
  return 'general';
}

function getVisitCounts(patient) {
  const endo = Array.isArray(patient?.endoVisits) ? patient.endoVisits.length : 0;
  const operative = Array.isArray(patient?.operativeVisits) ? patient.operativeVisits.length : 0;
  const surgery = Array.isArray(patient?.surgeryVisits) ? patient.surgeryVisits.length : 0;
  const proth = Array.isArray(patient?.prothVisits) ? patient.prothVisits.length : 0;

  if (endo || operative || surgery || proth) {
    return { endo, operative, surgery, proth, general: 0 };
  }

  return {
    endo: getProcedureLabel(patient) === 'endo' ? 1 : 0,
    operative: getProcedureLabel(patient) === 'operative' ? 1 : 0,
    surgery: getProcedureLabel(patient) === 'surgery' ? 1 : 0,
    proth: getProcedureLabel(patient) === 'proth' ? 1 : 0,
    general: getProcedureLabel(patient) === 'general' ? 1 : 0,
  };
}

function getLevelMeta(type, count) {
  const levels = TITLE_LEVELS[type] || [];
  const currentIndex = levels.findIndex((level) => count >= level.min && count <= level.max);
  const safeIndex = currentIndex === -1 ? levels.length - 1 : currentIndex;
  const current = levels[safeIndex];
  const next = levels[safeIndex + 1] || null;
  return {
    levels,
    current,
    next,
    left: next ? Math.max(next.min - count, 0) : 0,
  };
}

function DonutChart({ title, subtitle, data, footer }) {
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

      {footer ? <div className={styles.chartFooter}>{footer}</div> : null}
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

function TitleCard({ titles }) {
  const [openKey, setOpenKey] = useState('');

  return (
    <div className={`card ${styles.titlesCard}`}>
      <div className={styles.cardHead}>
        <div>
          <h3>Treatment Progress</h3>
          <p>Titles unlock automatically based on your real case volume</p>
        </div>
      </div>

      <div className={styles.titleList}>
        {titles.map((item) => {
          const expanded = openKey === item.key;
          return (
            <div key={item.key} className={styles.titleGroup}>
              <button
                type="button"
                className={styles.titleRow}
                onClick={() => setOpenKey(expanded ? '' : item.key)}
              >
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.count} case{item.count === 1 ? '' : 's'}</span>
                </div>
                <div className={styles.titleRight}>
                  <div>
                    <strong>{item.current.title}</strong>
                    {item.next ? <span>{item.left} left to {item.next.title}</span> : <span>Top title reached</span>}
                  </div>
                  <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>▾</span>
                </div>
              </button>

              {expanded ? (
                <div className={styles.levelsPanel}>
                  {item.levels.map((level, index) => {
                    const isCurrent = level.title === item.current.title;
                    const isDone = item.count >= level.min && !isCurrent;
                    const isNext = item.next && level.title === item.next.title;
                    return (
                      <div key={`${item.key}-${level.title}-${index}`} className={styles.levelRow}>
                        <span className={styles.levelIcon}>{isCurrent ? '⭐' : isDone ? '✓' : isNext ? '→' : '🔒'}</span>
                        <div className={styles.levelMeta}>
                          <strong>{level.title}</strong>
                          <span>
                            {level.max === Infinity ? `${level.min}+ cases` : `${level.min}-${level.max} cases`}
                          </span>
                        </div>
                        <div className={styles.levelHint}>
                          {isCurrent ? 'Current' : isNext ? `${item.left} left` : isDone ? 'Unlocked' : 'Locked'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
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

    let returningPatients = 0;
    let followUpPatients = 0;
    let donePatients = 0;

    patients.forEach((patient) => {
      const sex = normalizeSex(patient);
      sexCounts[sex] = (sexCounts[sex] || 0) + 1;
      const visitCounts = getVisitCounts(patient);
      treatmentCounts.endo += visitCounts.endo;
      treatmentCounts.operative += visitCounts.operative;
      treatmentCounts.surgery += visitCounts.surgery;
      treatmentCounts.proth += visitCounts.proth;
      treatmentCounts.general += visitCounts.general;

      const totalVisits = visitCounts.endo + visitCounts.operative + visitCounts.surgery + visitCounts.proth + visitCounts.general;
      if (totalVisits > 1) returningPatients += 1;
      if (patient.status === 'Follow Up') followUpPatients += 1;
      if (patient.status === 'Done') donePatients += 1;
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
    let thisMonthAppointments = 0;

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
      if (isThisMonth(date)) thisMonthAppointments += 1;
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

    const completionRate = patients.length ? Math.round((donePatients / patients.length) * 100) : 0;
    const growth = lastMonthPatients ? Math.round(((thisMonthPatients - lastMonthPatients) / lastMonthPatients) * 100) : thisMonthPatients ? 100 : 0;
    const peakDay = [...weekdayCounts].sort((a, b) => b.value - a.value)[0];
    const peakHours = [...hourBuckets].sort((a, b) => b.value - a.value)[0];
    const topTreatment = [...treatmentData].sort((a, b) => b.value - a.value)[0];

    const growthScore = clamp(lastMonthPatients ? Math.round(((thisMonthPatients / Math.max(lastMonthPatients, 1)) * 12.5)) : (thisMonthPatients ? 18 : 0), 0, 25);
    const returningScore = clamp(Math.round(((returningPatients / Math.max(patients.length, 1)) * 25)), 0, 25);
    const activityScore = clamp(Math.round((thisMonthAppointments / 20) * 20), 0, 20);
    const attendanceScore = clamp(Math.round((completionRate / 100) * 15), 0, 15);
    const activeDays = weekdayCounts.filter((day) => day.value > 0).length;
    const consistencyScore = clamp(Math.round((activeDays / 7) * 15), 0, 15);
    const healthScore = clamp(growthScore + returningScore + activityScore + attendanceScore + consistencyScore, 0, 100);

    const breakdown = [
      {
        label: 'Growth',
        value: growthScore,
        max: 25,
        tip: growth >= 0 ? 'More new patients are pushing your score.' : 'Add more new patients this month.',
      },
      {
        label: 'Returning',
        value: returningScore,
        max: 25,
        tip: returningPatients ? 'Returning patients are helping your retention.' : 'Need more repeat visits to grow loyalty.',
      },
      {
        label: 'Activity',
        value: activityScore,
        max: 20,
        tip: thisMonthAppointments ? 'Booking activity is feeding the analysis.' : 'Add appointments to unlock stronger activity score.',
      },
      {
        label: 'Attendance',
        value: attendanceScore,
        max: 15,
        tip: completionRate >= 50 ? 'Completed cases are lifting the score.' : 'Finish more cases to boost attendance.',
      },
      {
        label: 'Consistency',
        value: consistencyScore,
        max: 15,
        tip: activeDays >= 4 ? 'Good spread through the week.' : 'Spread appointments across more days.',
      },
    ];

    const insights = [
      peakDay?.value
        ? `Your busiest day is ${peakDay.label} with ${peakDay.value} appointment${peakDay.value > 1 ? 's' : ''}.`
        : 'Start adding appointments to unlock traffic insights.',
      topTreatment?.value
        ? `${topTreatment.label} is leading your case mix at ${formatPct(topTreatment.value, treatmentData.reduce((sum, item) => sum + item.value, 0) || 1)} of your cases.`
        : 'Treatment mix will appear automatically when you add cases.',
      followUpPatients
        ? `You have ${followUpPatients} follow-up case${followUpPatients > 1 ? 's' : ''} ready for recall or reminder.`
        : 'Great: there are no pending follow-up cases right now.',
      peakHours?.value
        ? `Peak hours are around ${peakHours.label}. This is a smart slot for premium bookings.`
        : 'Peak-hour analysis will show once appointments are booked.',
    ];

    const titleCounts = {
      Endo: treatmentCounts.endo,
      Operative: treatmentCounts.operative,
      Surgery: treatmentCounts.surgery,
      Fixed: treatmentCounts.proth,
      All: treatmentCounts.endo + treatmentCounts.operative + treatmentCounts.surgery + treatmentCounts.proth + treatmentCounts.general,
    };

    const titles = Object.entries(titleCounts).map(([label, count]) => ({
      key: label,
      label,
      count,
      ...getLevelMeta(label, count),
    }));

    let growthTone = 'Stable performance — keep building.';
    if (growth > 0) growthTone = 'Strong growth this month — keep pushing.';
    if (growth < 0) growthTone = 'Growth slipped this month — needs attention.';

    return {
      sexData,
      treatmentData,
      weekdayCounts,
      hourBuckets,
      titles,
      insights,
      breakdown,
      stats: {
        totalPatients: patients.length,
        totalAppointments: appointments.length,
        completionRate,
        thisMonthPatients,
        growth,
        healthScore,
        todayAppointments,
      },
      peakHours,
      monthlyGrowthTone: growthTone,
    };
  }, [patients, appointments]);

  if (loading) return <div className={styles.loading}>Loading analysis...</div>;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <div className={styles.kicker}>R7</div>
          <h1 className={styles.title}>See your clinic in one powerful view.</h1>
          <div className={styles.breakdownList}>
            {analytics.breakdown.map((item) => (
              <div key={item.label} className={styles.breakdownItem}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.tip}</span>
                </div>
                <div className={styles.breakdownScore}>{item.value}/{item.max}</div>
              </div>
            ))}
          </div>
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

      <section className={styles.progressSection}>
        <TitleCard titles={analytics.titles} />
      </section>

      <section className={styles.mainGrid}>
        <DonutChart
          title="Patient Gender Mix"
          subtitle="Quick visual of female vs male patients"
          data={analytics.sexData}
          footer={(
            <div className={styles.metricFooterBox}>
              <span>New Patients This Month</span>
              <strong>{analytics.stats.thisMonthPatients}</strong>
              <small>Added this month</small>
            </div>
          )}
        />

        <DonutChart
          title="Treatment Mix"
          subtitle="Endo, operative, surgery, fixed and general cases"
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
          <div className={styles.growthBox}>
            <div>
              <span>Monthly Growth</span>
              <strong>
                {analytics.stats.growth > 0 ? '+' : ''}
                {analytics.stats.growth}%
              </strong>
              <small>Compared to last month</small>
            </div>
            <p>{analytics.monthlyGrowthTone}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
