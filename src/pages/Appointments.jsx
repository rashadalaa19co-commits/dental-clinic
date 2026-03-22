import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAppointments, addAppointment, updateAppointment, deleteAppointment, getPatients } from '../services/db';
import { format, isToday, isTomorrow, parseISO, isAfter, startOfDay, differenceInMinutes } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import styles from './Appointments.module.css';

const STATUS_OPTIONS = ['Scheduled','Confirmed','Done','Cancelled','No Show'];

function PatientFolder({ pf, nav, onEdit, onDelete, onStatus, STATUS_OPTIONS }) {
  const [open, setOpen] = useState(false);
  const upcoming = pf.appts.filter(a => a.datetime && isAfter(parseISO(a.datetime), new Date())).length;
  const past = pf.appts.length - upcoming;
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,marginBottom:10,overflow:'hidden'}}>
      <div onClick={() => setOpen(o => !o)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',cursor:'pointer'}}>
        <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(0,212,255,0.15)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16,flexShrink:0}}>
          {pf.name?.[0]?.toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pf.name}</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{past} past · {upcoming} upcoming</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          {pf.id && (
            <button onClick={e=>{e.stopPropagation();nav(`/patients/${pf.id}`);}}
              style={{padding:'4px 10px',background:'rgba(0,212,255,0.1)',color:'var(--accent)',border:'1px solid rgba(0,212,255,0.3)',borderRadius:8,fontSize:12,cursor:'pointer'}}>
              Profile
            </button>
          )}
          <span style={{color:'var(--muted)',fontSize:16}}>{open?'▲':'▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{borderTop:'1px solid var(--border)',padding:'8px 16px 12px'}}>
          {pf.appts.sort((a,b)=>(b.datetime||'').localeCompare(a.datetime||'')).map((a,i) => {
            const d = a.datetime ? parseISO(a.datetime) : null;
            const isPast = d && !isAfter(d, new Date());
            return (
             <div key={a.id||i} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:isPast?'var(--muted)':'var(--success)',flexShrink:0}}></div>
                <div style={{flex:1,minWidth:120}}>
  <div style={{fontSize:13,fontWeight:600}}>{d?format(d,'d MMM · HH:mm'):'--'}</div>
                  <div style={{fontSize:12,color:'var(--muted)'}}>{a.type||'-'} {a.notes?'· '+a.notes:''}</div>
                </div>
                <select value={a.status||'Scheduled'} onChange={e=>onStatus(a.id,e.target.value)}
                  style={{padding:'4px 6px',fontSize:11,borderRadius:6,minWidth:85}}>
                  {STATUS_OPTIONS.map(o=><option key={o}>{o}</option>)}
                </select>
                <button onClick={()=>onEdit(a)} style={{background:'rgba(124,58,237,0.15)',color:'var(--proth)',border:'none',borderRadius:6,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>✏️</button>
                <button onClick={()=>onDelete(a.id)} style={{background:'rgba(248,81,73,0.1)',color:'var(--danger)',border:'none',borderRadius:6,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>🗑️</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Appointments() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [appts, setAppts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [form, setForm] = useState({ patientName:'', patientId:'', datetime:'', type:'', status:'Scheduled', notes:'' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('upcoming');
  const [conflict, setConflict] = useState(null);
  const [mobileView, setMobileView] = useState('timeline');

  const load = () =>
    Promise.all([getAppointments(user.uid), getPatients(user.uid)])
      .then(([a, p]) => { setAppts(a); setPatients(p); });

  useEffect(() => { if (user) load(); }, [user]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectPatient = (pid) => {
    const p = patients.find(x => x.id === pid);
    setForm(f => ({ ...f, patientId: pid, patientName: p?.name || '' }));
  };

  const checkConflict = (datetime) => {
    if (!datetime) return null;
    const newTime = parseISO(datetime);
    for (const appt of appts) {
      if (editingAppt && appt.id === editingAppt.id) continue;
      if (!appt.datetime) continue;
      const existing = parseISO(appt.datetime);
      const diff = Math.abs(differenceInMinutes(newTime, existing));
      if (diff < 60) return { patient: appt.patientName, time: format(existing, 'HH:mm'), diff };
    }
    return null;
  };

  const handleDateChange = (datetime) => {
    set('datetime', datetime);
    setConflict(checkConflict(datetime));
  };

  const handleSave = async (force = false) => {
    if (!form.patientName || !form.datetime) return alert('Please fill patient and date/time');
    if (!force && conflict) return;
    setSaving(true);
    if (editingAppt) await updateAppointment(user.uid, editingAppt.id, form);
    else await addAppointment(user.uid, form);
    await load();
    cancelForm();
    setSaving(false);
  };

  const handleEdit = (appt) => {
    setEditingAppt(appt);
    setForm({ patientName:appt.patientName, patientId:appt.patientId||'', datetime:appt.datetime, type:appt.type||'', status:appt.status||'Scheduled', notes:appt.notes||'' });
    setShowForm(true);
    setConflict(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete appointment?')) return;
    await deleteAppointment(user.uid, id);
    load();
  };

  const handleStatus = async (id, status) => {
    await updateAppointment(user.uid, id, { status });
    load();
  };

  const cancelForm = () => {
    setShowForm(false); setEditingAppt(null); setConflict(null);
    setForm({ patientName:'', patientId:'', datetime:'', type:'', status:'Scheduled', notes:'' });
  };

  const now = new Date();
  const patientAppts = {};
  appts.forEach(a => {
    const key = a.patientId || a.patientName;
    if (!patientAppts[key]) patientAppts[key] = { name: a.patientName, id: a.patientId, appts: [] };
    patientAppts[key].appts.push(a);
  });

  const filtered = appts.filter(a => {
    if (!a.datetime) return filter === 'all';
    const d = parseISO(a.datetime);
    if (filter === 'today') return isToday(d);
    if (filter === 'upcoming') return isAfter(d, startOfDay(now));
    if (filter === 'past') return !isAfter(d, startOfDay(now));
    return true;
  });

  const patientFolders = Object.values(patientAppts).sort((a,b) => {
    const lastA = a.appts[a.appts.length-1]?.datetime || '';
    const lastB = b.appts[b.appts.length-1]?.datetime || '';
    return lastB.localeCompare(lastA);
  });

  const todayCount = appts.filter(a => a.datetime && isToday(parseISO(a.datetime))).length;

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Appointments</h1>
          <p className={styles.sub}>{todayCount} today · {appts.length} total</p>
        </div>
        <button className={styles.addBtn} onClick={() => { setShowForm(s=>!s); setEditingAppt(null); setConflict(null); }}>
          {showForm && !editingAppt ? '✕ Close' : '➕ New Appointment'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className={`card ${styles.formCard}`}>
          <h3 className={styles.formTitle}>{editingAppt ? '✏️ Edit Appointment' : '➕ New Appointment'}</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Patient *</label>
              <select value={form.patientId} onChange={e=>selectPatient(e.target.value)}>
                <option value="">Select patient...</option>
                {patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Or type name</label>
              <input value={form.patientName} onChange={e=>set('patientName',e.target.value)} placeholder="Patient name"/>
            </div>
            <div className={styles.field}>
              <label>Date & Time *</label>
              <input type="datetime-local" value={form.datetime} onChange={e=>handleDateChange(e.target.value)}/>
            </div>
            <div className={styles.field}>
              <label>Type</label>
              <select value={form.type} onChange={e=>set('type',e.target.value)}>
                <option value="">Select type...</option>
                {['Endo','Operative','Surgery','Proth','Scaling','Consultation','Follow Up','Other'].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Status</label>
              <select value={form.status} onChange={e=>set('status',e.target.value)}>
                {STATUS_OPTIONS.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div className={`${styles.field} ${styles.full}`}>
              <label>Notes</label>
              <input value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Optional notes..."/>
            </div>
          </div>

          {conflict && (
            <div style={{background:'rgba(248,81,73,0.1)',border:'1px solid rgba(248,81,73,0.3)',borderRadius:10,padding:'14px 18px',margin:'12px 0'}}>
              <div style={{fontWeight:700,color:'var(--danger)',fontSize:15,marginBottom:6}}>⚠️ Time Conflict!</div>
              <div style={{color:'var(--muted)',fontSize:14,marginBottom:12}}>
                <strong style={{color:'var(--text)'}}>{conflict.patient}</strong> has appointment at <strong style={{color:'var(--text)'}}>{conflict.time}</strong> — only <strong style={{color:'var(--warning)'}}>{conflict.diff} min</strong> apart
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <button onClick={()=>handleSave(true)} style={{padding:'8px 20px',background:'var(--danger)',color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer'}}>Book Anyway</button>
                <button onClick={()=>{set('datetime','');setConflict(null);}} style={{padding:'8px 20px',background:'transparent',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:8,fontSize:14,cursor:'pointer'}}>Choose Another Time</button>
              </div>
            </div>
          )}

          {!conflict && (
            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={cancelForm}>Cancel</button>
              <button className={styles.saveBtn} onClick={()=>handleSave(false)} disabled={saving}>
                {saving ? 'Saving...' : editingAppt ? '💾 Save Changes' : '💾 Save'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className={styles.tabs}>
        {['today','upcoming','past','all'].map(f => (
          <button key={f} className={`${styles.tab} ${filter===f?styles.activeTab:''}`} onClick={()=>setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {/* Mobile view toggle */}
      <div className={styles.viewTabs}>
        <button className={`${styles.viewTab} ${mobileView==='timeline'?styles.activeViewTab:''}`} onClick={()=>setMobileView('timeline')}>📅 Timeline</button>
        <button className={`${styles.viewTab} ${mobileView==='folders'?styles.activeViewTab:''}`} onClick={()=>setMobileView('folders')}>📁 Folders</button>
      </div>

      {/* Content grid */}
      <div className={styles.grid}>
        {/* Timeline */}
        <div style={{display: typeof window !== 'undefined' && window.innerWidth < 768 && mobileView !== 'timeline' ? 'none' : 'block'}}>
          <div className={styles.gridTitle}>📅 TIMELINE</div>
          {filtered.length === 0 ? (
            <p className={styles.empty}>No appointments</p>
          ) : filtered.map(a => {
            const d = a.datetime ? parseISO(a.datetime) : null;
            const isNow = d && isToday(d);
            const isTom = d && isTomorrow(d);
            return (
              <div key={a.id} className={`${styles.apptCard} ${isNow?styles.today:''}`}>
                <div className={styles.apptDate}>
                  <div className={styles.apptDay}>{d?format(d,'EEE'):'--'}</div>
                  <div className={styles.apptNum}>{d?format(d,'d'):'-'}</div>
                  <div className={styles.apptMonth}>{d?format(d,'MMM'):'-'}</div>
                </div>
                <div className={styles.apptTime}>{d?format(d,'HH:mm'):'--:--'}</div>
                <div className={styles.apptInfo}>
                  <div className={styles.apptName}>{a.patientName}</div>
                  <div className={styles.apptMeta}>
                    {a.type && <span className={styles.apptType}>{a.type}</span>}
                    {isNow && <span className={styles.todayTag}>Today</span>}
                    {isTom && <span className={styles.tomTag}>Tomorrow</span>}
                  </div>
                </div>
                <div className={styles.apptRight}>
                  <select className={styles.statusSelect} value={a.status||'Scheduled'} onChange={e=>handleStatus(a.id,e.target.value)}>
                    {STATUS_OPTIONS.map(o=><option key={o}>{o}</option>)}
                  </select>
                  <button onClick={()=>handleEdit(a)} style={{background:'rgba(124,58,237,0.15)',color:'var(--proth)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:8,padding:'5px 8px',fontSize:12,cursor:'pointer'}}>✏️</button>
                  {a.patientId && <button onClick={()=>nav(`/patients/${a.patientId}`)} style={{background:'rgba(0,212,255,0.1)',color:'var(--accent)',border:'1px solid rgba(0,212,255,0.3)',borderRadius:8,padding:'5px 8px',fontSize:12,cursor:'pointer'}}>👤</button>}
                  <button className={styles.delApptBtn} onClick={()=>handleDelete(a.id)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Patient Folders */}
        <div style={{display: typeof window !== 'undefined' && window.innerWidth < 768 && mobileView !== 'folders' ? 'none' : 'block'}}>
          <div className={styles.gridTitle}>📁 PATIENT FOLDERS</div>
          {patientFolders.length === 0 ? (
            <p className={styles.empty}>No appointments yet</p>
          ) : patientFolders.map(pf => (
            <PatientFolder key={pf.id||pf.name} pf={pf} nav={nav} onEdit={handleEdit} onDelete={handleDelete} onStatus={handleStatus} STATUS_OPTIONS={STATUS_OPTIONS}/>
          ))}
        </div>
      </div>
    </div>
  );
}
