import { useEffect, useState } from 'react';
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

// --- Sub-components (EndoForm, VisitForm) تظل كما هي في كودك ---
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
  const [uploading, setUploading] = useState(false); // حالة رفع الصور
  const [patientAppts, setPatientAppts] = useState([]);
  const [showAppts, setShowAppts] = useState(false);
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [newAppt, setNewAppt] = useState({ datetime:'', type:'', notes:'' });
  const [editingApptId, setEditingApptId] = useState(null);
  const [editApptData, setEditApptData] = useState({});
  const [apptConflict, setApptConflict] = useState(null);

  const load = async () => {
    if (!user) return;
    const [pts, appts] = await Promise.all([
      getPatients(user.uid),
      getAppointments(user.uid)
    ]);
    setPatient(pts.find(p => p.id === id) || null);
    setPatientAppts(appts.filter(a => a.patientId === id));
  };

  useEffect(() => { load(); }, [user, id]);

  const handleDelete = async () => {
    if (!confirm('Delete this patient?')) return;
    await deletePatient(user.uid, id);
    nav('/patients');
  };

  const saveVisits = async (type, visits) => {
    setSaving(true);
    await updatePatient(user.uid, id, { ...patient, [type]: visits });
    await load();
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

  // --- دالة رفع صور جديدة من صفحة التفاصيل ---
  const handleUploadNewPhotos = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    const newUrls = [...(patient.xRayUrls || [])];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "ntjnefxv");
      formData.append("cloud_name", "dvpbbawh2");

      try {
        const res = await fetch("https://api.cloudinary.com/v1_1/dvpbbawh2/image/upload", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (data.secure_url) newUrls.push(data.secure_url);
      } catch (err) { console.error(err); }
    }

    await updatePatient(user.uid, id, { ...patient, xRayUrls: newUrls });
    await load();
    setUploading(false);
  };

  const handleDeletePhoto = async (idx) => {
    if (!confirm('Delete this photo?')) return;
    const current = [...(patient.xRayUrls || [])];
    current.splice(idx, 1);
    await updatePatient(user.uid, id, { ...patient, xRayUrls: current });
    await load();
  };

  const checkConflict = (datetime) => {
    if (!datetime) return null;
    const newTime = parseISO(datetime);
    for (const appt of patientAppts) {
      if (!appt.datetime) continue;
      const existing = parseISO(appt.datetime);
      const diff = Math.abs(differenceInMinutes(newTime, existing));
      if (diff < 60) return { patient: appt.patientName || patient.name, time: format(existing, 'HH:mm'), diff };
    }
    return null;
  };

  const handleDateChange = (datetime) => {
    setNewAppt(a => ({...a, datetime}));
    setApptConflict(checkConflict(datetime));
  };

  const handleAddAppt = async (force = false) => {
    if (!newAppt.datetime) return alert('Please select date and time');
    if (!force && apptConflict) return;
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

  if (!patient) return <div className={styles.loading}>Loading...</div>;

  const info = [
    ['Phone', patient.phone],
    ['Age', patient.age],
    ['Occupation', patient.occupation],
    ['Type', patient.patientType],
    ['Complaint', patient.chiefComplaint],
    ['Tooth', patient.tooth],
    ['Procedure', patient.procedure],
    ['Start', patient.dateStart],
    ['Alert', patient.alert],
    ['Difficulty', patient.difficulty],
    ['Medical History', Array.isArray(patient.medicalHistory) ? patient.medicalHistory.join(', ') : (Array.isArray(patient.dentalHistory) ? patient.dentalHistory.join(', ') : patient.dentalHistory)],
  ];

  const visitConfigs = [
    { key:'operativeVisits', label:'Operative', color:'var(--operative)', fields:OPERATIVE_FIELDS },
    { key:'surgeryVisits',   label:'Surgery',   color:'var(--surgery)',   fields:SURGERY_FIELDS },
    { key:'prothVisits',      label:'Proth',      color:'var(--proth)',      fields:PROTH_FIELDS },
  ];

  const upcomingAppts = patientAppts.filter(a => a.datetime && isAfter(parseISO(a.datetime), new Date()));

  return (
    <div>
      <div className={styles.header}>
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

      <div className={`card ${styles.infoCard}`}>
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
              <span style={{fontSize:12,color:'var(--muted)'}}>{patientAppts.length} total</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => setShowAppts(s=>!s)} style={{padding:'4px 12px',background:'transparent',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:8,fontSize:12,cursor:'pointer'}}>
                {showAppts ? 'Hide' : 'Show All'}
              </button>
              <button onClick={() => setShowAddAppt(s=>!s)} style={{padding:'4px 14px',background:'var(--accent)',color:'#000',border:'none',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {showAddAppt ? 'Cancel' : '+ Add'}
              </button>
            </div>
          </div>
          {/* عرض المواعيد كما في كودك الأصلي */}
        </div>
      </div>

      {/* Visits - Adult only */}
      {patient.patientType === 'Adult' && (
        <>
          <div className={`card ${styles.visitCard}`} style={{borderLeftColor:'var(--endo)'}}>
            <div className={styles.visitHeader}>
              <span className={styles.visitLabel} style={{color:'var(--endo)'}}>🔵 Endo</span>
              <button className={styles.addVisitBtn} style={{color:'var(--endo)',borderColor:'var(--endo)'}}
                onClick={() => { setAdding(adding === 'endo' ? null : 'endo'); setEditing({type:null,idx:null}); }}>
                {adding === 'endo' ? 'Cancel' : '+ Add Visit'}
              </button>
            </div>
            {adding === 'endo' && <EndoForm onSave={handleAddEndo} onCancel={() => setAdding(null)}/>}
            {(patient.endoVisits||[]).map((tooth,ti) => (
               <div key={ti} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:14,marginBottom:10}}>
                   {/* تفاصيل الـ Endo */}
               </div>
            ))}
          </div>
          {/* بقية سكاشن الـ Visits */}
        </>
      )}

      {/* PHOTOS - القسم المعدل لعرض صور Cloudinary */}
      <div className={`card ${styles.visitCard}`} style={{borderLeftColor:'var(--accent)'}}>
        <div className={styles.visitHeader}>
          <span className={styles.visitLabel} style={{color:'var(--accent)'}}>📸 X-Rays & Case Photos</span>
          <span className={styles.visitCount}>{(patient.xRayUrls||[]).length} image{(patient.xRayUrls||[]).length !== 1 ? 's' : ''}</span>
          <div style={{position:'relative'}}>
            <button className={styles.addVisitBtn} style={{color:'var(--accent)',borderColor:'var(--accent)'}} disabled={uploading}>
              {uploading ? 'Uploading...' : '+ Add Photos'}
              <input type="file" multiple accept="image/*" onChange={handleUploadNewPhotos} 
                style={{position:'absolute', top:0, left:0, opacity:0, width:'100%', height:'100%', cursor:'pointer'}} />
            </button>
          </div>
        </div>

        {(patient.xRayUrls||[]).length === 0 && !uploading && <p className={styles.noVisits}>No photos yet</p>}
        
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:15, marginTop:15}}>
          {(patient.xRayUrls||[]).map((url, i) => (
            <div key={i} style={{position:'relative', borderRadius:10, overflow:'hidden', border:'1px solid var(--border)', background:'var(--surface2)'}}>
              <a href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`X-ray ${i}`} style={{width:'100%', height:'150px', objectFit:'cover'}} />
              </a>
              <button 
                onClick={() => handleDeletePhoto(i)}
                style={{position:'absolute', top:5, right:5, background:'rgba(248,81,73,0.8)', color:'white', border:'none', borderRadius:'50%', width:24, height:24, cursor:'pointer', fontSize:12, fontWeight:'bold'}}
              >
                ×
              </button>
              <div style={{padding:5, textAlign:'center', fontSize:10, color:'var(--muted)'}}>Image {i+1}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
