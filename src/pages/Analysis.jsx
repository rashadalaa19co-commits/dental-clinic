import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAppointments, getPatients } from '../services/db';
import styles from './Analysis.module.css';

const TREATMENT_KEYS = [
  { key: 'endo', label: 'Endo', color: 'var(--endo)' },
  { key: 'operative', label: 'Operative', color: 'var(--operative)' },
  { key: 'surgery', label: 'Surgery', color: 'var(--surgery)' },
  { key: 'proth', label: 'Proth', color: 'var(--proth)' },
  { key: 'general', label: 'General', color: 'var(--accent)' },
];

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_BUCKETS = [
  { label: 'Morning', start: 6, end: 12 },
  { label: 'Afternoon', start: 12, end: 17 },
  { label: 'Evening', start: 17, end: 22 },
  { label: 'Late', start: 22, end: 30 },
];

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isWithinDays(date, days, now = new Date()) {
  if (!date) return false;
  const diff = now.getTime() - date.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function previousWindow(date, fromDays, toDays, now = new Date()) {
  if (!date) return false;
  const diff = now.getTime() - date.getTime();
  return diff > fromDays * 24 * 60 * 60 * 1000 && diff <= toDays * 24 * 60 * 60 * 1000;
}

function clamp(num, min = 0, max = 100) {
  return Math.max(min, Math.min(max, num));
}

function toPct(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const rad = Math.PI / 180;
  const x1 = cx + r * Math.cos((startAngle - 90) * rad);
  const y1 = cy + r * Math.sin((startAngle - 90) * rad);
  const x2 = cx + r * Math.cos((endAngle - 90) * rad);
  const y2 = cy + r * Math.sin((endAngle - 90) * rad);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
}

function PieChart({ data, centerLabel, centerValue, centerSub }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  return (
    <div className={styles.pieWrap}>
      <svg viewBox="0 0 220 220" className={styles.pieSvg} aria-hidden="true">
        <circle cx="110" cy="110" r="96" fill="rgba(255,255,255,0.03)" />
        {total > 0 ? data.map((item) => {
          const angle = (item.value / total) * 360;
          const start = cursor;
          const end = cursor + angle;
          cursor = end;
          return <path key={item.label} d={arcPath(110, 110, 96, start, end)} fill={item.color} opacity={item.value ? 0.95 : 0.15} />;
        }) : null}
        <circle cx="110" cy="110" r="58" fill="var(--surface)" stroke="rgba(255,255,255,0.05)" />
      </svg>
      <div className={styles.pieCenter}>
        <span>{centerLabel}</span>
        <strong>{centerValue}</strong>
        {centerSub ? <small>{centerSub}</small> : null}
      </div>
    </div>
  );
}

function ScoreRing({ score }) {
  const circumference = 2 * Math.PI * 60;
  const progress = circumference - (clamp(score) / 100) * circumference;
  const level = score >= 90 ? 'Aura Elite' : score >= 75 ? 'Elite Clinic' : score >= 60 ? 'Strong Practice' : score >= 40 ? 'Rising Clinic' : 'Starter';
  const message = score >= 90 ? 'You are crushing it.' : score >= 75 ? 'Elite is active.' : score >= 60 ? 'Strong momentum.' : score >= 40 ? 'Keep pushing upward.' : 'Let’s build the rhythm.';
  return (
    <div className={styles.scoreHero}>
      <div className={styles.scoreRingWrap}>
        <svg viewBox="0 0 160 160" className={styles.scoreSvg}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r="60" className={styles.scoreTrack} />
          <circle cx="80" cy="80" r="60" className={styles.scoreProgress} strokeDasharray={circumference} strokeDashoffset={progress} />
        </svg>
        <div className={styles.scoreCenter}>
          <div className={styles.scoreValue}>{score}</div>
          <div className={styles.scoreOutOf}>/100</div>
        </div>
      </div>
      <div className={styles.scoreContent}>
        <div className={styles.sectionBadge}>Gamified Growth</div>
        <h2>Clinic Health Score</h2>
        <p>{message}</p>
        <div className={styles.levelPill}>{level}</div>
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
    let cancelled = false;
    async function load() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const [patientsData, appointmentsData] = await Promise.all([
          getPatients(user.uid),
          getAppointments(user.uid),
        ]);
        if (!cancelled) {
          setPatients(patientsData || []);
          setAppointments(appointmentsData || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  const analytics = useMemo(() => {
    const now = new Date();
    const patientTouchMap = new Map();
    const genderCounts = { male: 0, female: 0, unknown: 0 };
    const treatmentCounts = { endo: 0, operative: 0, surgery: 0, proth: 0, general: 0 };
    const weekdayCounts = WEEK_DAYS.map(label => ({ label, value: 0 }));
    const timeCounts = TIME_BUCKETS.map(bucket => ({ label: bucket.label, value: 0 }));
    const activeDays = new Set();

    let recentPatients = 0;
    let previousPatients = 0;

    patients.forEach((patient) => {
      const createdAt = toDate(patient.createdAt);
      if (isWithinDays(createdAt, 30, now)) recentPatients += 1;
      else if (previousWindow(createdAt, 30, 60, now)) previousPatients += 1;

      const sex = String(patient.sex || patient.Sex || '').toLowerCase();
      if (sex === 'male') genderCounts.male += 1;
      else if (sex === 'female') genderCounts.female += 1;
      else genderCounts.unknown += 1;

      const endo = Array.isArray(patient.endoVisits) ? patient.endoVisits.length : 0;
      const operative = Array.isArray(patient.operativeVisits) ? patient.operativeVisits.length : 0;
      const surgery = Array.isArray(patient.surgeryVisits) ? patient.surgeryVisits.length : 0;
      const proth = Array.isArray(patient.prothVisits) ? patient.prothVisits.length : 0;
      treatmentCounts.endo += endo;
      treatmentCounts.operative += operative;
      treatmentCounts.surgery += surgery;
      treatmentCounts.proth += proth;

      const touchCount = endo + operative + surgery + proth;
      if (touchCount > 0) patientTouchMap.set(patient.id, touchCount);

      [...(patient.endoVisits || []), ...(patient.operativeVisits || []), ...(patient.surgeryVisits || []), ...(patient.prothVisits || [])]
        .forEach((visit) => {
          const d = toDate(visit?.date);
          if (d && isWithinDays(d, 30, now)) {
            activeDays.add(startOfDay(d).toISOString());
            weekdayCounts[d.getDay()].value += 1;
            const hour = d.getHours();
            const bucket = TIME_BUCKETS.find(({ start, end }) => hour >= start && hour < end);
            if (bucket) {
              const item = timeCounts.find((x) => x.label === bucket.label);
              if (item) item.value += 1;
            }
          }
        });
    });

    let doneCount = 0;
    let noShowCount = 0;
    let cancelledCount = 0;
    let scheduledCount = 0;
    let upcomingCount = 0;
    let thisMonthAppointments = 0;

    appointments.forEach((appt) => {
      const d = toDate(appt.datetime);
      const status = String(appt.status || 'Scheduled').toLowerCase();
      const type = String(appt.type || '').toLowerCase();
      if (status === 'done') doneCount += 1;
      else if (status === 'no show') noShowCount += 1;
      else if (status === 'cancelled') cancelledCount += 1;
      else scheduledCount += 1;

      if (d) {
        if (d > now) upcomingCount += 1;
        if (isWithinDays(d, 30, now)) {
          thisMonthAppointments += 1;
          activeDays.add(startOfDay(d).toISOString());
          weekdayCounts[d.getDay()].value += 1;
          const hour = d.getHours();
          const bucket = TIME_BUCKETS.find(({ start, end }) => hour >= start && hour < end);
          if (bucket) {
            const item = timeCounts.find((x) => x.label === bucket.label);
            if (item) item.value += 1;
          }
        }
      }

      if (type.includes('endo')) treatmentCounts.endo += 1;
      else if (type.includes('operative') || type.includes('filling')) treatmentCounts.operative += 1;
      else if (type.includes('surgery') || type.includes('ex')) treatmentCounts.surgery += 1;
      else if (type.includes('proth') || type.includes('crown')) treatmentCounts.proth += 1;
      else if (type) treatmentCounts.general += 1;

      const key = appt.patientId || appt.patientName;
      if (key) patientTouchMap.set(key, (patientTouchMap.get(key) || 0) + 1);
    });

    const totalPatients = patients.length;
    const totalAppointments = appointments.length;
    const returningPatients = [...patientTouchMap.values()].filter((count) => count > 1).length;
    const treatmentTotal = Object.values(treatmentCounts).reduce((sum, v) => sum + v, 0);

    const growthRatio = previousPatients === 0 ? (recentPatients > 0 ? 1 : 0) : (recentPatients - previousPatients) / previousPatients;
    const growthScore = clamp(50 + growthRatio * 50);
    const returningScore = clamp((returningPatients / Math.max(totalPatients, 1)) * 100);
    const attendanceScore = clamp(((doneCount + scheduledCount * 0.6) / Math.max(totalAppointments, 1)) * 100 - ((noShowCount * 14 + cancelledCount * 8) / Math.max(totalAppointments, 1)));
    const activityScore = clamp((thisMonthAppointments / 24) * 100);
    const consistencyScore = clamp((activeDays.size / 18) * 100);

    const finalScore = Math.round(
      growthScore * 0.25 +
      returningScore * 0.25 +
      attendanceScore * 0.2 +
      activityScore * 0.15 +
      consistencyScore * 0.15
    );

    const level = finalScore >= 90 ? 'Aura Elite' : finalScore >= 75 ? 'Elite Clinic' : finalScore >= 60 ? 'Strong Practice' : finalScore >= 40 ? 'Rising Clinic' : 'Starter';
    const nextTarget = finalScore >= 90 ? 100 : finalScore >= 75 ? 90 : finalScore >= 60 ? 75 : finalScore >= 40 ? 60 : 40;
    const pointsToNext = Math.max(0, nextTarget - finalScore);

    const breakdown = [
      { label: 'Patient Growth', value: Math.round(growthScore), weight: '25%', hint: `${recentPatients} new in last 30 days` },
      { label: 'Returning Patients', value: Math.round(returningScore), weight: '25%', hint: `${returningPatients} patients came back` },
      { label: 'Attendance', value: Math.round(attendanceScore), weight: '20%', hint: `${doneCount} done · ${noShowCount} no show` },
      { label: 'Activity', value: Math.round(activityScore), weight: '15%', hint: `${thisMonthAppointments} appointments this month` },
      { label: 'Consistency', value: Math.round(consistencyScore), weight: '15%', hint: `${activeDays.size} active days in last 30` },
    ];

    const treatmentLeader = TREATMENT_KEYS
      .map((item) => ({ ...item, value: treatmentCounts[item.key] }))
      .sort((a, b) => b.value - a.value)[0];

    const topWeekday = [...weekdayCounts].sort((a, b) => b.value - a.value)[0];
    const topTime = [...timeCounts].sort((a, b) => b.value - a.value)[0];

    const badges = [
      finalScore >= 75 ? { label: 'Elite Push', tone: 'accent' } : null,
      noShowCount <= 1 && totalAppointments > 0 ? { label: 'Time Master', tone: 'success' } : null,
      returningPatients >= 5 ? { label: 'Loyalty Builder', tone: 'proth' } : null,
      recentPatients >= 5 ? { label: 'Patient Magnet', tone: 'endo' } : null,
      treatmentLeader?.value > 0 ? { label: `${treatmentLeader.label} Focus`, tone: 'warning' } : null,
    ].filter(Boolean);

    const insights = [
      recentPatients > previousPatients
        ? `New patients are up from ${previousPatients} to ${recentPatients} in the last 30 days.`
        : `Growth is softer this month: ${recentPatients} new patients vs ${previousPatients} in the previous period.`,
      topTime?.value > 0
        ? `Your busiest time is ${topTime.label.toLowerCase()} — keep prime slots available there.`
        : 'No clear peak time yet — more appointments will sharpen the pattern.',
      returningPatients / Math.max(totalPatients, 1) >= 0.4
        ? 'Retention is healthy. Patients are coming back consistently.'
        : 'Retention can improve. Push follow-up and reminders to bring more patients back.',
      noShowCount > 1
        ? `${noShowCount} no-show appointments are pulling your score down.`
        : 'Attendance looks solid with very low missed appointments.',
    ];

    const challenge = noShowCount > 1
      ? `Reduce missed appointments by ${Math.min(noShowCount, 3)} to unlock easy points.`
      : returningPatients < Math.max(4, Math.round(totalPatients * 0.4))
        ? `Bring back ${Math.max(1, Math.round(totalPatients * 0.4) - returningPatients)} inactive patients to climb faster.`
        : `You are ${pointsToNext} points away from the next level — keep momentum high this week.`;

    return {
      totalPatients,
      totalAppointments,
      upcomingCount,
      thisMonthAppointments,
      doneCount,
      recentPatients,
      returningPatients,
      noShowCount,
      cancelledCount,
      finalScore,
      level,
      nextTarget,
      pointsToNext,
      breakdown,
      badges,
      insights,
      challenge,
      genderData: [
        { label: 'Male', value: genderCounts.male, color: 'var(--endo)' },
        { label: 'Female', value: genderCounts.female, color: '#ec4899' },
        { label: 'Unknown', value: genderCounts.unknown, color: 'rgba(255,255,255,0.28)' },
      ],
      treatmentData: TREATMENT_KEYS.map((item) => ({ ...item, value: treatmentCounts[item.key] })),
      weekdayCounts,
      timeCounts,
      topWeekday,
      topTime,
      treatmentLeader,
      attendanceRate: toPct(doneCount, Math.max(totalAppointments, 1)),
    };
  }, [patients, appointments]);

  if (loading) {
    return <div className={styles.loading}>Loading analysis…</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Smart analytics</div>
          <h1 className={styles.title}>Analysis</h1>
          <p className={styles.sub}>A competitive dashboard that makes every clinic want a higher score.</p>
        </div>
        <div className={styles.headerPill}>{analytics.level}</div>
      </div>

      <ScoreRing score={analytics.finalScore} />

      <div className={styles.quickStats}>
        {[
          { label: 'Patients', value: analytics.totalPatients, sub: `${analytics.recentPatients} new this month` },
          { label: 'Appointments', value: analytics.totalAppointments, sub: `${analytics.thisMonthAppointments} in last 30 days` },
          { label: 'Returning', value: analytics.returningPatients, sub: 'Patients with repeat touch points' },
          { label: 'Done Rate', value: `${analytics.attendanceRate}%`, sub: `${analytics.doneCount} completed visits` },
        ].map((card) => (
          <div key={card.label} className={styles.statCard}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.sub}</small>
          </div>
        ))}
      </div>

      <div className={styles.gridTop}>
        <div className={`card ${styles.breakdownCard}`}>
          <div className={styles.cardHead}>
            <h3>Score Breakdown</h3>
            <span className={styles.cardHint}>{analytics.pointsToNext} pts to next level</span>
          </div>
          <div className={styles.breakdownList}>
            {analytics.breakdown.map((item) => (
              <div key={item.label} className={styles.breakdownRow}>
                <div className={styles.breakdownTop}>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </div>
                  <div className={styles.breakdownMeta}>{item.value}<span>/{item.weight}</span></div>
                </div>
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`card ${styles.challengeCard}`}>
          <div className={styles.cardHead}>
            <h3>Weekly Challenge</h3>
            <span className={styles.cardHint}>Keep users hooked</span>
          </div>
          <div className={styles.challengeBox}>
            <div className={styles.challengeTitle}>You are {analytics.pointsToNext} points away from {analytics.nextTarget >= 100 ? 'perfection' : 'the next level'}.</div>
            <p>{analytics.challenge}</p>
          </div>
          <div className={styles.badgesWrap}>
            {analytics.badges.map((badge) => (
              <span key={badge.label} className={`${styles.badge} ${styles[badge.tone]}`}>{badge.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.chartGrid}>
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.cardHead}>
            <h3>Gender Distribution</h3>
            <span className={styles.cardHint}>{analytics.totalPatients} patients</span>
          </div>
          <PieChart
            data={analytics.genderData}
            centerLabel="Patients"
            centerValue={analytics.totalPatients}
            centerSub={analytics.genderData[1].value > analytics.genderData[0].value ? 'Female lead' : analytics.genderData[0].value > analytics.genderData[1].value ? 'Male lead' : 'Balanced'}
          />
          <div className={styles.legendList}>
            {analytics.genderData.map((item) => (
              <div key={item.label} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: item.color }} />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.value} · {toPct(item.value, analytics.totalPatients)}%</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`card ${styles.chartCard}`}>
          <div className={styles.cardHead}>
            <h3>Treatment Mix</h3>
            <span className={styles.cardHint}>{analytics.treatmentLeader?.label || 'No data'} leads</span>
          </div>
          <PieChart
            data={analytics.treatmentData}
            centerLabel="Cases"
            centerValue={analytics.treatmentData.reduce((sum, item) => sum + item.value, 0)}
            centerSub={analytics.treatmentLeader?.label || 'Waiting for data'}
          />
          <div className={styles.legendList}>
            {analytics.treatmentData.map((item) => (
              <div key={item.label} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: item.color }} />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.value} · {toPct(item.value, analytics.treatmentData.reduce((sum, x) => sum + x.value, 0))}%</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.chartGrid}>
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.cardHead}>
            <h3>Busy Days</h3>
            <span className={styles.cardHint}>{analytics.topWeekday?.label || 'No peak yet'} is strongest</span>
          </div>
          <div className={styles.barList}>
            {analytics.weekdayCounts.map((item) => {
              const max = Math.max(...analytics.weekdayCounts.map((x) => x.value), 1);
              return (
                <div key={item.label} className={styles.barRow}>
                  <span>{item.label}</span>
                  <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${(item.value / max) * 100}%` }} /></div>
                  <strong>{item.value}</strong>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`card ${styles.chartCard}`}>
          <div className={styles.cardHead}>
            <h3>Peak Hours</h3>
            <span className={styles.cardHint}>{analytics.topTime?.label || 'No pattern yet'} wins</span>
          </div>
          <div className={styles.segmentList}>
            {analytics.timeCounts.map((item) => {
              const max = Math.max(...analytics.timeCounts.map((x) => x.value), 1);
              return (
                <div key={item.label} className={styles.segmentCard}>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                  <div className={styles.miniTrack}><div className={styles.miniFill} style={{ width: `${(item.value / max) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`card ${styles.insightsCard}`}>
        <div className={styles.cardHead}>
          <h3>Smart Insights</h3>
          <span className={styles.cardHint}>This is the addictive part</span>
        </div>
        <div className={styles.insightsGrid}>
          {analytics.insights.map((text, idx) => (
            <div key={idx} className={styles.insightItem}>
              <div className={styles.insightNum}>0{idx + 1}</div>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
