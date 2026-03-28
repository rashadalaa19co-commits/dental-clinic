import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPatients, deletePatient, updatePatient, getAppointments, addAppointment, updateAppointment } from '../services/db';
import { format, parseISO, isAfter, differenceInMinutes } from 'date-fns';
import styles from './PatientDetail.module.css';

const STATUS_BADGE = {
  'Done':'badge-done','In progress':'badge-progress',
  'Not started':'badge-waiting','Follow Up':'badge-followup','Lap waiting':'badge-lap'
};

const emptyCanal = () => ({ canal:'', wl:'', maf:'', note:'' });
const emptyTooth = () => ({ toothName:'', diagnosis:'', clamp:'', referencePoint:'', date:'', canals:[emptyCanal()] });

const OPERATIVE_FIELDS = [{k:'toothName',l:'Tooth Name'},{k:'toothClamp',l:'Clamp'},{k:'classType',l:'Class'},{k:'shade',l:'Shade'},{k:'date',l:'Date',t:'date'}];
const SURGERY_FIELDS = [{k:'toothName',l:'Tooth Name'},{k:'toothNum',l:'Tooth Num'},{k:'typeOfEx',l:'Type EX'},{k:'sutureType',l:'Suture'},{k:'complications',l:'Complications'},{k:'date',l:'Date',t:'date'}];
const PROTH_FIELDS = [{k:'toothName',l:'Tooth Name'},{k:'teeth',l:'Teeth'},{k:'labStage',l:'Lab Stage'},{k:'material',l:'Material'},{k:'shade',l:'Shade'},{k:'vitality',l:'Vitality'},{k:'impression',l:'Impression'},{k:'labName',l:'Lab'},{k:'date',l:'Date',t:'date'}];

function EndoForm({ initial, onSave, onCancel }) {
  const [teeth, setTeeth] = useState(initial ? [initial] : [emptyTooth()]);
  const addTooth = () => setTeeth(t => [...t, emptyTooth()]);
  const removeTooth = idx => setTeeth(t => t.filter((_,i) => i !== idx));
  const updateTooth = (idx, key, val) => setTeeth(t => t.map((x,i) => i===idx ? {...x,[key]:val} : x));
  const addCanal = idx => setTeeth(t => t.map((x,i) => i===idx ? {...x,canals:[...x.canals,emptyCanal()]} : x));
  const removeCanal = (ti,ci) => setTeeth(t => t.map((x,i) => i===ti ? {...x,canals:x.canals.filter((_,j)=>j!==ci)} : x));
  const updateCanal = (ti,ci,key,val) => setTeeth(t => t.map((x,i) => i===ti ? {...x,canals:x.canals.map((c,j)=>j===ci?{...c,[key]:val}:c)} : x));
  return (
    <div style={{padding:14,background:'var(--surface2)',borderRadius:'var(--radius-sm)',marginBottom:12,border:'1px solid var(--border)'}}>
      {teeth.map((tooth,ti) => (
        <div key={ti} style={{background:'var(--bg)',borderRadius:8,padding:12,marginBottom:10,border:'1px solid var(--border)'}}>
          <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:10,alignItems:'flex-end'}}>
            {[['toothName','Tooth Name'],['diagnosis','Diagnosis'],['clamp','Clamp'],['referencePoint','Ref Point']].map(([key,label]) => (
              <div key={key} style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:100}}>
                <label style={{fontSize:11,color:'var(--muted)'}}>{label}</label>
                <input value={tooth[key]||''} onChange={e=>updateTooth(ti,key,e.target.value)} style={{padding:'7px 10px'}}/>
              </div>
            ))}
            <div style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:100}}>
              <label style={{fontSize:11,color:'var(--muted)'}}>Date</label>
              <input type="date" value={tooth.date||''} onChange={e=>updateTooth(ti,'date',e.target.value)} style={{padding:'7px 10px'}}/>
            </div>
            {teeth.length > 1 && <button onClick={()=>removeTooth(ti)} style={{padding:'6px 10px',background:'rgba(248,81,73,0.15)',color:'var(--danger)',border:'none',borderRadius:6,cursor:'pointer',alignSelf:'flex-end'}}>X</button>}
          </div>
          <div style={{borderTop:'1px solid var(--border)',paddingTop:10}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:12,color:'var(--muted)',fontWeight:600}}>CANALS</span>
              <button onClick={()=>addCanal(ti)} style={{padding:'3px 10px',background:'rgba(56,139,253,0.1)',color:'var(--endo)',border:'1px solid rgba(56,139,253,0.3)',borderRadius:20,fontSize:12,cursor:'pointer'}}>+ Add Canal</button>
            </div>
            {tooth.canals.map((canal,ci) => (
              <div key={ci} style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'flex-end',padding:8,background:'var(--surface)',borderRadius:8,marginBottom:6}}>
                <span style={{fontSize:12,color:'var(--endo)',fontWeight:700,minWidth:20}}>{ci+1}</span>
                {[['canal','Canal'],['wl','WL'],['maf','MAF'],['note','Note']].map(([key,label]) => (
                  <div key={key} style={{display:'flex',flexDirection:'column',gap:3,flex:1,minWidth:80}}>
                    <label style={{fontSize:10,color:'var(--muted)'}}>{label}</label>
                    <input value={canal[key]||''} onChange={e=>updateCanal(ti,ci,key,e.target.value)} style={{padding:'6px 8px'}}/>
                  </div>
                ))}
                {tooth.canals.length > 1 && <button onClick={()=>removeCanal(ti,ci)} style={{padding:'4px 8px',background:'rgba(248,81,73,0.1)',color:'var(--danger)',border:'none',borderRadius:6,cursor:'pointer',alignSelf:'flex-end',fontSize:12}}>X</button>}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{display:'flex',gap:10,marginTop:10,alignItems:'center',flexWrap:'wrap'}}>
        {!initial && <button onClick={addTooth} style={{padding:'6px 14px',background:'rgba(56,139,253,0.1)',color:'var(--endo)',border:'1px solid rgba(56,139,253,0.3)',borderRadius:20,fontSize:13,cursor:'pointer'}}>+ Add Tooth</button>}
        <button onClick={()=>onSave(teeth)} style={{padding:'8px 18px',background:'var(--success)',color:'#000',border:'none',borderRadius:'var(--radius-sm)',fontSize:13,fontWeight:600,cursor:'pointer'}}>Save</button>
        <button onClick={onCancel} style={{padding:'8px 14px',background:'transparent',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',fontSize:13,cursor:'pointer'}}>Cancel</button>
      </div>
    </div>
  );
}

const VisitForm = ({ fields, initial, onSave, onCancel }) => {
  const [data, setData] = useState(initial || Object.fromEntries(fields.map(f => [f.k, ''])));
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:10,padding:14,background:'var(--surface2)',borderRadius:'var(--radius-sm)',marginBottom:12,border:'1px solid var(--border)',alignItems:'flex-end'}}>
      {fields.map(f => (
        <div key={f.k} style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:90}}>
          <label style={{fontSize:11,color:'var(--muted)'}}>{f.l}</label>
          <input type={f.t||'text'} value={data[f.k]||''} onChange={e=>{const val=e.target.value; setData(d=>({...d,[f.k]:val}));}} style={{padding:'7px 10px'}}/>
        </div>
      ))}
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>onSave(data)} style={{padding:'8px 18px',background:'var(--success)',color:'#000',border:'none',borderRadius:'var(--radius-sm)',fontSize:13,fontWeight:600,cursor:'pointer'}}>Save</button>
        <button onClick={onCancel} style={{padding:'8px 14px',background:'transparent',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',fontSize:13,cursor:'pointer'}}>Cancel</button>
      </div>
    </div>
  );
};

export default function PatientDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const nav = useNavigate();
  const [patient, setPatient] = useState(null);
  const [adding, setAdding] = useState(null);
  const [editing, setEditing] = useState({ type: null, idx: null });
  const [saving, setSaving] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [allAppts, setAllAppts] = useState([]);
  const [patientAppts, setPatientAppts] = useState([]);
  const [showAppts, setShowAppts] = useState(false);
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [newAppt, setNewAppt] = useState({ datetime:'', type:'', notes:'' });
  const [apptConflict, setApptConflict] = useState(null);
  const [editingApptId, setEditingApptId] = useState(null);
  const [editApptData, setEditApptData] = useState({});
  const [collapsedSections, setCollapsedSections] = useState({
    endoVisits: true,
    operativeVisits: true,
    surgeryVisits: true,
    prothVisits: true,
  });
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [timelineRefreshTick, setTimelineRefreshTick] = useState(0);
  const firstLoadRef = useRef(true);

  const load = async () => {
    if (!user) return;
    const [pts, appts] = await Promise.all([
      getPatients(user.uid),
      getAppointments(user.uid)
    ]);
    setPatient(pts.find(p => p.id === id) || null);
    setAllAppts(appts);
    setPatientAppts(appts.filter(a => a.patientId === id));
  };

  useEffect(() => { load(); }, [user, id]);

  const checkConflict = (datetime) => {
    if (!datetime) return null;
    const newTime = parseISO(datetime);
    for (const appt of allAppts) {
      if (appt.patientId === id) continue;
      if (!appt.datetime) continue;
      const existing = parseISO(appt.datetime);
      const diff = Math.abs(differenceInMinutes(newTime, existing));
      if (diff < 60) {
        return {
          patient: appt.patientName,
          time: format(existing, 'HH:mm'),
          diff: diff
        };
      }
    }
    return null;
  };

  const handleDateChange = (datetime) => {
    setNewAppt(a => ({...a, datetime}));
    setApptConflict(checkConflict(datetime));
  };

  const handleDelete = async () => {
    if (!confirm('Delete this patient?')) return;
    await deletePatient(user.uid, id);
    nav('/patients');
  };

  const saveVisits = async (type, visits) => {
    setSaving(true);
    await updatePatient(user.uid, id, { ...patient, [type]: visits });
    await load();
    setCollapsedSections((prev) => ({ ...prev, [type]: false }));
    setTimelineRefreshTick((prev) => prev + 1);
    setAdding(null);
    setEditing({ type: null, idx: null });
    setSaving(false);
  };

  const handleAddEndo = async (teeth) => {
    const current = patient.endoVisits || [];
    await saveVisits('endoVisits', [...current, ...teeth]);
  };

  const handleEditEndo = async (teeth) => {
    const current = [...(patient.endoVisits || [])];
    current[editing.idx] = teeth[0];
    await saveVisits('endoVisits', current);
  };

  const handleAddVisit = async (type, data) => {
    const current = patient[type] || [];
    await saveVisits(type, [...current, data]);
  };

  const handleEditVisit = async (type, data) => {
    const current = [...(patient[type] || [])];
    current[editing.idx] = data;
    await saveVisits(type, current);
  };

  const handleDeleteVisit = async (type, idx) => {
    if (!confirm('Delete this visit?')) return;
    const current = [...(patient[type] || [])];
    current.splice(idx, 1);
    await saveVisits(type, current);
  };

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddPhoto = async () => {
    if (!newPhotoUrl.trim()) return;
    const current = patient.photos || [];
    await updatePatient(user.uid, id, { ...patient, photos: [...current, newPhotoUrl.trim()] });
    await load();
    setNewPhotoUrl('');
    setShowAddPhoto(false);
  };

  const handleDeletePhoto = async (idx) => {
    if (!confirm('Delete this photo?')) return;
    const current = [...(patient.photos || [])];
    current.splice(idx, 1);
    await updatePatient(user.uid, id, { ...patient, photos: current });
    await load();
  };

  const handleAddAppt = async (force = false) => {
    if (!newAppt.datetime) return alert('Please select date and time');
    if (!force && apptConflict) return;
    setApptConflict(null);
    await addAppointment(user.uid, {
      patientId: id,
      patientName: patient.name,
      datetime: newAppt.datetime,
      type: newAppt.type,
      notes: newAppt.notes,
      status: 'Scheduled'
    });
    await load();
    setShowAddAppt(false);
    setNewAppt({ datetime:'', type:'', notes:'' });
  };

  const handleEditAppt = async () => {
    await updateAppointment(user.uid, editingApptId, editApptData);
    await load();
    setEditingApptId(null);
    setEditApptData({});
  };

  useEffect(() => {
    if (!patient) return;
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      return;
    }
    setTimelineRefreshTick((prev) => prev + 1);
  }, [patient?.id, patient?.totalTreatments, patient?.lastProcedure, JSON.stringify(patient?.treatments || [])]);

  const treatmentTimeline = useMemo(() => (
    [...(patient?.treatments || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  ), [patient?.treatments]);
  const visibleTimeline = showAllTimeline ? treatmentTimeline : treatmentTimeline.slice(0, 4);

  if (!patient) return <div className={styles.loading}>Loading...</div>;

  const info = [
    ['Phone', patient.phone],
    ['Age', patient.age],
    ['Occupation', patient.occupation],
    ['Type', patient.patientType],
    ['Complaint', patient.chiefComplaint],
    ['Tooth', patient.tooth],
    ['Last Treatment', patient.lastProcedure],
    ['Start', patient.dateStart],
    ['Alert', patient.alert],
    ['Sex', patient.sex || patient.Sex || patient.difficulty],
    ['Medical History', Array.isArray(patient.medicalHistory) ? patient.medicalHistory.join(', ') : (Array.isArray(patient.dentalHistory) ? patient.dentalHistory.join(', ') : patient.dentalHistory)],
  ];

  const visitConfigs = [
    { key:'operativeVisits', label:'Operative', color:'var(--operative)', fields:OPERATIVE_FIELDS },
    { key:'surgeryVisits',   label:'Surgery',   color:'var(--surgery)',   fields:SURGERY_FIELDS },
    { key:'prothVisits',     label:'Proth',     color:'var(--proth)',     fields:PROTH_FIELDS },
  ];

  const upcomingAppts = patientAppts.filter(a => a.datetime && isAfter(parseISO(a.datetime), new Date()));

  return (
    <div className="motionPage">
      <div className={`${styles.header} motionHero`}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => nav('/patients')}>Back</button>
          <div>
            <h1 className={styles.name}>{patient.name}</h1>
            <div className={styles.headerMeta}>
              <span className={`badge ${STATUS_BADGE[patient.status] || 'badge-waiting'}`}>{patient.status || '-'}</span>
              {patient.alert && patient.alert !== 'None' && <span className="badge badge-lap">{patient.alert}</span>}
              <span className={styles.metaText}>{patient.patientType}</span>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.editBtn} onClick={() => nav(`/patients/${id}/edit`)}>Edit</button>
          <button className={styles.delBtn} onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className={styles.quickStats}>
        <div className={styles.quickCard}>
          <span>Last Treatment</span>
          <strong>{patient.lastProcedure || 'None'}</strong>
        </div>
        <div className={styles.quickCard}>
          <span>Total Treatments</span>
          <strong>{patient.totalTreatments || 0}</strong>
        </div>
        <div className={styles.quickCard}>
          <span>Treated Teeth</span>
          <strong>{(patient.treatedTeeth || []).join(', ') || 'None'}</strong>
        </div>
      </div>

      <div className={`card ${styles.infoCard} motionCard motionCardDelay1`}>
        <div className={styles.infoGrid}>
          {info.map(([label, val]) => val ? (
            <div key={label} className={styles.infoItem}>
              <div className={styles.infoLabel}>{label}</div>
              <div className={styles.infoVal}>{val}</div>
            </div>
          ) : null)}
        </div>

        {/* Appointment bar */}
        <div style={{marginTop:14,paddingTop:14,borderTop:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:13,fontWeight:600,color:'var(--accent)'}}>📅 Appointments</span>
              <span style={{fontSize:12,color:'var(--muted)'}}>{patientAppts.length} total · {upcomingAppts.length} upcoming</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              {patientAppts.length > 0 && (
                <button onClick={() => setShowAppts(s=>!s)}
                  style={{padding:'4px 12px',background:'transparent',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,cursor:'pointer'}}>
                  {showAppts ? 'Hide' : 'Show All'}
                </button>
              )}
              <button onClick={() => setShowAddAppt(s=>!s)}
                style={{padding:'4px 14px',background:'var(--accent)',color:'#000',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {showAddAppt ? 'Cancel' : '+ Add'}
              </button>
            </div>
          </div>

          {upcomingAppts.length > 0 && !showAppts && (
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(63,185,80,0.05)',border:'1px solid rgba(63,185,80,0.2)',borderRadius:8}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'var(--success)'}}></div>
              <span style={{fontSize:13,fontWeight:600}}>Next: {format(parseISO(upcomingAppts.sort((a,b)=>a.datetime.localeCompare(b.datetime))[0].datetime),'EEE, d MMM yyyy · HH:mm')}</span>
              <span style={{fontSize:12,color:'var(--muted)'}}>{upcomingAppts[0].type||''}</span>
            </div>
          )}

          {/* Add appointment form */}
          {showAddAppt && (
            <div style={{marginTop:8}}>
              <div style={{display:'flex',flexWrap:'wrap',gap:10,padding:12,background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)',alignItems:'flex-end'}}>
                <div style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:160}}>
                  <label style={{fontSize:11,color:'var(--muted)'}}>Date & Time</label>
                  <input type="datetime-local" value={newAppt.datetime} onChange={e=>handleDateChange(e.target.value)}/>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:120}}>
                  <label style={{fontSize:11,color:'var(--muted)'}}>Type</label>
                  <select value={newAppt.type} onChange={e=>setNewAppt(a=>({...a,type:e.target.value}))}>
                    <option value="">Select...</option>
                    {['Endo','Operative','Surgery','Proth','Scaling','Follow Up','Other'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:120}}>
                  <label style={{fontSize:11,color:'var(--muted)'}}>Notes</label>
                  <input value={newAppt.notes} onChange={e=>setNewAppt(a=>({...a,notes:e.target.value}))} placeholder="Optional..."/>
                </div>
                {!apptConflict && (
                  <button onClick={()=>handleAddAppt(false)} style={{padding:'9px 20px',background:'var(--success)',color:'#000',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Save</button>
                )}
              </div>

              {/* Conflict Warning */}
              {apptConflict && (
                <div style={{background:'rgba(248,81,73,0.1)',border:'1px solid rgba(248,81,73,0.3)',borderRadius:8,padding:'12px 16px',marginTop:8}}>
                  <div style={{fontWeight:700,color:'var(--danger)',fontSize:14,marginBottom:6}}>⚠️ Time Conflict!</div>
                  <div style={{color:'var(--muted)',fontSize:13,marginBottom:10}}>
                    <strong style={{color:'var(--text)'}}>{apptConflict.patient}</strong> has an appointment at <strong style={{color:'var(--text)'}}>{apptConflict.time}</strong> — only <strong style={{color:'var(--warning)'}}>{apptConflict.diff} minutes</strong> apart (minimum 1 hour required)
                  </div>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                    <button onClick={()=>handleAddAppt(true)} style={{padding:'7px 16px',background:'var(--danger)',color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Book Anyway</button>
                    <button onClick={()=>{setNewAppt(a=>({...a,datetime:''}));setApptConflict(null);}} style={{padding:'7px 16px',background:'transparent',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:8,fontSize:13,cursor:'pointer'}}>Choose Another Time</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* All appointments list */}
          {showAppts && (
            <div style={{marginTop:8,background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)',overflow:'hidden'}}>
              {patientAppts.sort((a,b)=>(b.datetime||'').localeCompare(a.datetime||'')).map((a,i) => {
                const isPast = !a.datetime || !isAfter(parseISO(a.datetime), new Date());
                return (
                  <div key={a.id||i}>
                    {editingApptId === a.id ? (
                      <div style={{display:'flex',flexWrap:'wrap',gap:10,padding:12,background:'var(--bg)',alignItems:'flex-end',borderBottom:'1px solid var(--border)'}}>
                        <div style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:160}}>
                          <label style={{fontSize:11,color:'var(--muted)'}}>Date & Time</label>
                          <input type="datetime-local" value={editApptData.datetime||''} onChange={e=>setEditApptData(d=>({...d,datetime:e.target.value}))}/>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:120}}>
                          <label style={{fontSize:11,color:'var(--muted)'}}>Type</label>
                          <select value={editApptData.type||''} onChange={e=>setEditApptData(d=>({...d,type:e.target.value}))}>
                            <option value="">Select...</option>
                            {['Endo','Operative','Surgery','Proth','Scaling','Follow Up','Other'].map(o=><option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <button onClick={handleEditAppt} style={{padding:'8px 14px',background:'var(--success)',color:'#000',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>Save</button>
                          <button onClick={()=>setEditingApptId(null)} style={{padding:'8px 10px',background:'transparent',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:8,fontSize:13,cursor:'pointer'}}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom: i < patientAppts.length-1 ? '1px solid var(--border)' : 'none',opacity: isPast ? 0.6 : 1}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background: isPast ? 'var(--muted)' : 'var(--success)',flexShrink:0}}></div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:600}}>{a.datetime ? format(parseISO(a.datetime),'EEE, d MMM yyyy · HH:mm') : '--'}</div>
                          <div style={{fontSize:12,color:'var(--muted)'}}>{a.type||'-'} {a.notes?'· '+a.notes:''}</div>
                        </div>
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:20,background: isPast ? 'var(--surface)' : 'rgba(63,185,80,0.1)',color: isPast ? 'var(--muted)' : 'var(--success)'}}>{a.status||'-'}</span>
                        <button onClick={()=>{setEditingApptId(a.id);setEditApptData({datetime:a.datetime||'',type:a.type||'',notes:a.notes||''});}}
                          style={{padding:'3px 8px',background:'rgba(124,58,237,0.15)',color:'var(--proth)',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>Edit</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {patient.notes && (
          <div className={styles.notes}>
            <div className={styles.infoLabel}>Notes</div>
            <div className={styles.notesText}>{patient.notes}</div>
          </div>
        )}
      </div>

      <div className={`card ${styles.section} ${styles.timelinePanel} ${timelineRefreshTick ? styles.timelineRefresh : ''}`} key={`timeline-${timelineRefreshTick}`}>
        <div className={styles.timelineHeaderRow}>
          <h3 className={styles.sectionTitle}>Treatment Timeline</h3>
          {treatmentTimeline.length > 4 && (
            <button
              className={styles.timelineToggleBtn}
              onClick={() => setShowAllTimeline((prev) => !prev)}
            >
              {showAllTimeline ? 'Show less' : 'Show all'}
            </button>
          )}
        </div>
        {treatmentTimeline.length === 0 ? (
          <p className={styles.noVisits}>No treatments yet</p>
        ) : (
          <>
            {visibleTimeline.map((item) => (
              <div key={item.id} className={styles.timelineItem}>
                <div className={styles.timelineTop}>
                  <strong>{item.type}</strong>
                  <span>{item.date || 'No date'}</span>
                </div>
                <div className={styles.timelineMeta}>
                  Tooth {item.tooth || '-'} • {item.status || 'Not started'}
                </div>
              </div>
            ))}
            {!showAllTimeline && treatmentTimeline.length > 4 && (
              <div className={styles.timelineHint}>Showing latest 4 visits</div>
            )}
          </>
        )}
      </div>

      {/* Visits - Adult only */}
      {patient.patientType === 'Adult' && (
        <>
          <div className={`card ${styles.visitCard}`} style={{borderLeftColor:'var(--endo)'}}>
            <div className={styles.visitHeader}>
              <button
                type="button"
                className={styles.sectionToggleBtn}
                onClick={() => toggleSection('endoVisits')}
                aria-expanded={!collapsedSections.endoVisits}
              >
                <span className={styles.toggleIcon}>{collapsedSections.endoVisits ? '▸' : '▾'}</span>
                <span className={styles.visitLabel} style={{color:'var(--endo)'}}>🔵 Endo</span>
              </button>
              <span className={styles.visitCount}>{(patient.endoVisits||[]).length} visit{(patient.endoVisits||[]).length !== 1 ? 's' : ''}</span>
              <button className={styles.addVisitBtn} style={{color:'var(--endo)',borderColor:'var(--endo)'}}
                onClick={() => { setAdding(adding === 'endo' ? null : 'endo'); setEditing({type:null,idx:null}); setCollapsedSections((prev) => ({ ...prev, endoVisits: false })); }}>
                {adding === 'endo' ? 'Cancel' : '+ Add Visit'}
              </button>
            </div>
            {!collapsedSections.endoVisits && (
              <>
                {adding === 'endo' && <EndoForm onSave={handleAddEndo} onCancel={() => setAdding(null)}/>}
                {(patient.endoVisits||[]).length === 0 && adding !== 'endo' && <p className={styles.noVisits}>No endo visits yet</p>}
                {(patient.endoVisits||[]).map((tooth,ti) => (
              <div key={ti} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:14,marginBottom:10}}>
                {editing.type === 'endoVisits' && editing.idx === ti ? (
                  <EndoForm initial={tooth} onSave={handleEditEndo} onCancel={() => setEditing({type:null,idx:null})}/>
                ) : (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
                        {[['Tooth',tooth.toothName],['Diagnosis',tooth.diagnosis],['Clamp',tooth.clamp],['Ref Point',tooth.referencePoint],['Date',tooth.date]].map(([label,val]) => val ? (
                          <div key={label} style={{display:'flex',flexDirection:'column',gap:2}}>
                            <span style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase'}}>{label}</span>
                            <span style={{fontSize:14,fontWeight:500}}>{val}</span>
                          </div>
                        ) : null)}
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={() => setEditing({type:'endoVisits',idx:ti})} style={{padding:'4px 10px',background:'rgba(124,58,237,0.15)',color:'var(--proth)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:8,fontSize:12,cursor:'pointer'}}>Edit</button>
                        <button onClick={() => handleDeleteVisit('endoVisits',ti)} style={{padding:'4px 10px',background:'rgba(248,81,73,0.1)',color:'var(--danger)',border:'1px solid rgba(248,81,73,0.2)',borderRadius:8,fontSize:12,cursor:'pointer'}}>Delete</button>
                      </div>
                    </div>
                    {tooth.canals && tooth.canals.length > 0 && (
                      <div style={{borderTop:'1px solid var(--border)',paddingTop:10}}>
                        <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,marginBottom:8}}>CANALS</div>
                        {tooth.canals.map((canal,ci) => (
                          <div key={ci} style={{display:'flex',flexWrap:'wrap',gap:10,padding:8,background:'var(--bg)',borderRadius:8,marginBottom:6}}>
                            <span style={{fontSize:12,color:'var(--endo)',fontWeight:700,minWidth:20}}>{ci+1}</span>
                            {[['Canal',canal.canal],['WL',canal.wl],['MAF',canal.maf],['Note',canal.note]].map(([label,val]) => val ? (
                              <div key={label} style={{display:'flex',flexDirection:'column',gap:2}}>
                                <span style={{fontSize:10,color:'var(--muted)'}}>{label}</span>
                                <span style={{fontSize:13,fontWeight:500}}>{val}</span>
                              </div>
                            ) : null)}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
                ))}
              </>
            )}
          </div>

          {visitConfigs.map(cfg => {
            const visits = patient[cfg.key] || [];
            return (
              <div key={cfg.key} className={`card ${styles.visitCard}`} style={{borderLeftColor:cfg.color}}>
                <div className={styles.visitHeader}>
                  <button
                    type="button"
                    className={styles.sectionToggleBtn}
                    onClick={() => toggleSection(cfg.key)}
                    aria-expanded={!collapsedSections[cfg.key]}
                  >
                    <span className={styles.toggleIcon}>{collapsedSections[cfg.key] ? '▸' : '▾'}</span>
                    <span className={styles.visitLabel} style={{color:cfg.color}}>{cfg.label}</span>
                  </button>
                  <span className={styles.visitCount}>{visits.length} visit{visits.length !== 1 ? 's' : ''}</span>
                  <button className={styles.addVisitBtn} style={{color:cfg.color,borderColor:cfg.color}}
                    onClick={() => { setAdding(adding === cfg.key ? null : cfg.key); setEditing({type:null,idx:null}); setCollapsedSections((prev) => ({ ...prev, [cfg.key]: false })); }}>
                    {adding === cfg.key ? 'Cancel' : '+ Add Visit'}
                  </button>
                </div>
                {!collapsedSections[cfg.key] && (
                  <>
                    {adding === cfg.key && (
                      <VisitForm fields={cfg.fields} onSave={(data) => handleAddVisit(cfg.key, data)} onCancel={() => setAdding(null)}/>
                    )}
                    {visits.length === 0 && adding !== cfg.key && <p className={styles.noVisits}>No visits yet</p>}
                    {visits.map((v,i) => (
                  <div key={i} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:14,marginBottom:10}}>
                    {editing.type === cfg.key && editing.idx === i ? (
                      <VisitForm fields={cfg.fields} initial={v} onSave={(data) => handleEditVisit(cfg.key, data)} onCancel={() => setEditing({type:null,idx:null})}/>
                    ) : (
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
                          {cfg.fields.map(f => v[f.k] ? (
                            <div key={f.k} style={{display:'flex',flexDirection:'column',gap:2}}>
                              <span style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase'}}>{f.l}</span>
                              <span style={{fontSize:14,fontWeight:500}}>{v[f.k]}</span>
                            </div>
                          ) : null)}
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={() => setEditing({type:cfg.key,idx:i})} style={{padding:'4px 10px',background:'rgba(124,58,237,0.15)',color:'var(--proth)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:8,fontSize:12,cursor:'pointer'}}>Edit</button>
                          <button onClick={() => handleDeleteVisit(cfg.key,i)} style={{padding:'4px 10px',background:'rgba(248,81,73,0.1)',color:'var(--danger)',border:'1px solid rgba(248,81,73,0.2)',borderRadius:8,fontSize:12,cursor:'pointer'}}>Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* PHOTOS */}
      <div className={`card ${styles.visitCard}`} style={{borderLeftColor:'var(--accent)'}}>
        <div className={styles.visitHeader}>
          <span className={styles.visitLabel} style={{color:'var(--accent)'}}>📸 Case Photos</span>
          <span className={styles.visitCount}>{(patient.photos||[]).length} photo{(patient.photos||[]).length !== 1 ? 's' : ''}</span>
          <button className={styles.addVisitBtn} style={{color:'var(--accent)',borderColor:'var(--accent)'}}
            onClick={() => setShowAddPhoto(s => !s)}>
            {showAddPhoto ? 'Cancel' : '+ Add Photo'}
          </button>
        </div>
        {showAddPhoto && (
          <div style={{display:'flex',gap:10,padding:14,background:'var(--surface2)',borderRadius:'var(--radius-sm)',marginBottom:12,border:'1px solid var(--border)',flexWrap:'wrap',alignItems:'flex-end'}}>
            <div style={{display:'flex',flexDirection:'column',gap:6,flex:1,minWidth:200}}>
              <label style={{fontSize:12,color:'var(--muted)'}}>Google Drive Photo Link</label>
              <input value={newPhotoUrl} onChange={e=>setNewPhotoUrl(e.target.value)} placeholder="Paste Google Drive link here..."/>
              <span style={{fontSize:11,color:'var(--muted)'}}>Google Drive → Right click photo → Share → Copy link</span>
            </div>
            <button onClick={handleAddPhoto} style={{padding:'9px 20px',background:'var(--accent)',color:'#000',border:'none',borderRadius:'var(--radius-sm)',fontSize:14,fontWeight:600,cursor:'pointer'}}>Save</button>
          </div>
        )}
        {(patient.photos||[]).length === 0 && !showAddPhoto && <p className={styles.noVisits}>No photos yet</p>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',gap:12,marginTop:8}}>
          {(patient.photos||[]).map((url, i) => (
            <div key={i} style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1px solid var(--border)',aspectRatio:'1'}}>
              <img src={url} alt={'Photo '+(i+1)} style={{width:'100%',height:'100%',objectFit:'cover'}}
                onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>
              <div style={{display:'none',alignItems:'center',justifyContent:'center',height:'100%',background:'var(--surface2)',color:'var(--muted)',fontSize:12,flexDirection:'column',gap:8}}>
                <span>🔗</span>
                <a href={url} target="_blank" style={{color:'var(--accent)',fontSize:11}}>Open Link</a>
              </div>
              <button onClick={()=>handleDeletePhoto(i)} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.7)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>X</button>
              <a href={url} target="_blank" style={{position:'absolute',bottom:6,right:6,background:'rgba(0,0,0,0.7)',color:'white',borderRadius:6,padding:'2px 8px',fontSize:11,textDecoration:'none'}}>Open</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
