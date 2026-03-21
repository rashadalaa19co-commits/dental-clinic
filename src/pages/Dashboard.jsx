import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getPatients, getAppointments, checkAccess } from '../services/db';
import { format, isToday, parseISO } from 'date-fns';
import styles from './Dashboard.module.css';

const STATUS_BADGE = {
  'Done': 'badge-done', 'In progress': 'badge-progress',
  'Not started': 'badge-waiting', 'Follow Up': 'badge-followup', 'Lap waiting': 'badge-lap'
};

export default function Dashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getPatients(user.uid), getAppointments(user.uid), checkAccess(user.uid)])
      .then(([p, a, acc]) => { setPatients(p); setAppts(a); setAccess(acc); })
      .finally(() => setLoading(false));
  }, [user]);

  const stats = {
    total: patients.length,
    inProgress: patients.filter(p => p.status === 'In progress').length,
    done: patients.filter(p => p.status === 'Done').length,
    notStarted: patients.filter(p => p.status === 'Not started').length,
  };

  const todayAppts = appts.filter(a => a.datetime && isToday(parseISO(a.datetime)));
  const recent = patients.slice(0, 6);

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div>

     {access && !access.isActive && access.patientCount >= 0 && (
        <div style={{background:'rgba(248,81,73,0.1)',border:'1px solid rgba(248,81,73,0.3)',borderRadius:12,padding:'14px 20px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <div style={{fontWeight:700,color:'var(--danger)',fontSize:15}}>🔒 Free Trial — {access.patientCount}/2 patients used</div>
            <div style={{color:'var(--muted)',fontSize:13,marginTop:4}}>Upgrade to unlock unlimited patients!</div>
          </div>
          <a href="https://wa.me/201555354570" target="_blank"
            style={{padding:'8px 18px',background:'var(--success)',color:'#000',borderRadius:8,fontSize:14,fontWeight:600,textDecoration:'none'}}>
            📱 Contact on WhatsApp
          </a>
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.sub}>{format(new Date(), 'EEEE, MMMM d yyyy')} · Welcome back, Dr. {user?.displayName?.split(' ')[0]}</p>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {[
          { label: 'Total Patients', value: stats.total, color: 'var(--accent)', icon: '👥' },
          { label: 'In Progress',    value: stats.inProgress, color: 'var(--endo)', icon: '🔄' },
          { label: 'Done',           value: stats.done, color: 'var(--success)', icon: '✅' },
          { label: 'Not Started',    value: stats.notStarted, color: 'var(--warning)', icon: '⏳' },
          { label: "Today's Appts",  value: todayAppts.length, color: 'var(--proth)', icon: '📅' },
        ].map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statNum} style={{ color: s.color }}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.grid2}>
        <div className="card">
          <h3 className={styles.sectionTitle}>📅 Today's Appointments</h3>
          {todayAppts.length === 0 ? (
            <p className={styles.empty}>No appointments today</p>
          ) : todayAppts.map(a => (
            <div key={a.id} className={styles.apptRow}>
              <div className={styles.apptTime}>{a.datetime ? format(parseISO(a.datetime), 'HH:mm') : '--'}</div>
              <div>
                <div className={styles.apptName}>{a.patientName}</div>
                <div className={styles.apptType}>{a.type}</div>
              </div>
              <span className={`badge ${STATUS_BADGE[a.status] || 'badge-waiting'}`}>{a.status || 'Scheduled'}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 className={styles.sectionTitle}>👥 Recent Patients</h3>
          {recent.length === 0 ? (
            <p className={styles.empty}>No patients yet</p>
          ) : recent.map(p => (
            <div key={p.id} className={styles.patientRow}>
              <div className={styles.patientAvatar}>{p.name?.[0]?.toUpperCase()}</div>
              <div style={{flex:1}}>
                <div className={styles.patientName}>{p.name}</div>
                <div className={styles.patientMeta}>{p.procedure || '-'} · {p.tooth || ''}</div>
              </div>
              <span className={`badge ${STATUS_BADGE[p.status] || 'badge-waiting'}`}>{p.status || '-'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
