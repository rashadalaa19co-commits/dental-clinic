import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAppointments, addAppointment, updateAppointment, deleteAppointment, getPatients } from '../services/db';
import { format, isToday, isTomorrow, parseISO, isAfter, startOfDay } from 'date-fns';
import styles from './Appointments.module.css';

const STATUS_OPTIONS = ['Scheduled','Confirmed','Done','Cancelled','No Show'];

export default function Appointments() {
  const { user } = useAuth();
  const [appts, setAppts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientName:'', patientId:'', datetime:'', type:'', status:'Scheduled', notes:'' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('upcoming');

  const load = () =>
    Promise.all([getAppointments(user.uid), getPatients(user.uid)])
      .then(([a, p]) => { setAppts(a); setPatients(p); });

  useEffect(() => { if (user) load(); }, [user]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectPatient = (pid) => {
    const p = patients.find(x => x.id === pid);
    setForm(f => ({ ...f, patientId: pid, patientName: p?.name || '' }));
  };

  const handleSave = async () => {
    if (!form.patientName || !form.datetime) return alert('Please fill patient and date/time');
    setSaving(true);
    await addAppointment(user.uid, form);
    await load();
    setShowForm(false);
    setForm({ patientName:'', patientId:'', datetime:'', type:'', status:'Scheduled', notes:'' });
    setSaving(false);
  };

  const handleStatus = async (id, status) => {
    await updateAppointment(user.uid, id, { status });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete appointment?')) return;
    await deleteAppointment(user.uid, id);
    load();
  };

  const now = new Date();
  const filtered = appts.filter(a => {
    if (!a.datetime) return filter === 'all';
    const d = parseISO(a.datetime);
    if (filter === 'today') return isToday(d);
    if (filter === 'upcoming') return isAfter(d, startOfDay(now));
    if (filter === 'past') return !isAfter(d, startOfDay(now));
    return true;
  });

  const todayCount = appts.filter(a => a.datetime && isToday(parseISO(a.datetime))).length;

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Appointments</h1>
          <p className={styles.sub}>{todayCount} today · {appts.length} total</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ Close' : '➕ New Appointment'}
        </button>
      </div>

      {/* New appointment form */}
      {showForm && (
        <div className={`card ${styles.formCard}`}>
          <h3 className={styles.formTitle}>New Appointment</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Patient *</label>
              <select value={form.patientId} onChange={e => selectPatient(e.target.value)}>
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Or type name</label>
              <input value={form.patientName} onChange={e => set('patientName', e.target.value)} placeholder="Patient name"/>
            </div>
            <div className={styles.field}>
              <label>Date & Time *</label>
              <input type="datetime-local" value={form.datetime} onChange={e => set('datetime', e.target.value)}/>
            </div>
            <div className={styles.field}>
              <label>Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="">Select type...</option>
                {['Endo','Operative','Surgery','Proth','Scaling','Consultation','Follow Up','Other'].map(o =>
                  <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label>Notes</label>
              <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..."/>
            </div>
          </div>
          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Appointment'}
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className={styles.tabs}>
        {['today','upcoming','past','all'].map(f => (
          <button key={f} className={`${styles.tab} ${filter === f ? styles.activeTab : ''}`}
            onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Appointments list */}
      {filtered.length === 0 ? (
        <p className={styles.empty}>No appointments</p>
      ) : (
        <div className={styles.list}>
          {filtered.map(a => {
            const d = a.datetime ? parseISO(a.datetime) : null;
            const isNow = d && isToday(d);
            const isTom = d && isTomorrow(d);
            return (
              <div key={a.id} className={`${styles.apptCard} ${isNow ? styles.today : ''}`}>
                <div className={styles.apptDate}>
                  <div className={styles.apptDay}>{d ? format(d, 'EEE') : '--'}</div>
                  <div className={styles.apptNum}>{d ? format(d, 'd') : '-'}</div>
                  <div className={styles.apptMonth}>{d ? format(d, 'MMM') : '-'}</div>
                </div>
                <div className={styles.apptTime}>{d ? format(d, 'HH:mm') : '--:--'}</div>
                <div className={styles.apptInfo}>
                  <div className={styles.apptName}>{a.patientName}</div>
                  <div className={styles.apptMeta}>
                    {a.type && <span className={styles.apptType}>{a.type}</span>}
                    {isNow && <span className={styles.todayTag}>Today</span>}
                    {isTom && <span className={styles.tomTag}>Tomorrow</span>}
                    {a.notes && <span className={styles.apptNotes}>{a.notes}</span>}
                  </div>
                </div>
                <div className={styles.apptRight}>
                  <select className={styles.statusSelect} value={a.status || 'Scheduled'}
                    onChange={e => handleStatus(a.id, e.target.value)}>
                    {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                  <button className={styles.delApptBtn} onClick={() => handleDelete(a.id)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
