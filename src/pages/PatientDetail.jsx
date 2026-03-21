import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPatients, deletePatient, updatePatient } from '../services/db';
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

function VisitForm({ fields, initial, onSave, onCancel }) {
  const [data, setData] = useState(initial || Object.fromEntries(fields.map(f => [f.k, ''])));
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:10,padding:14,background:'var(--surface2)',borderRadius:'var(--radius-sm)',marginBottom:12,border:'1px solid var(--border)',alignItems:'flex-end'}}>
      {fields.map(f => (
        <div key={f.k} style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:90}}>
          <label style={{fontSize:11,color:'var(--muted)'}}>{f.l}</label>
          <input type={f.t||'text'} value={data[f.k]||''} onChange={e=>setData(d=>({...d,[f.k]:e.target.value}))} style={{padding:'7px 10px'}}/>
        </div>
      ))}
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>onSave(data)} style={{padding:'8px 18px',background:'var(--success)',color:'#000',border:'none',borderRadius:'var(--radius-sm)',fontSize:13,fontWeight:600,cursor:'pointer'}}>Save</button>
        <button onClick={onCancel} style={{padding:'8px 14px',background:'transparent',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',fontSize:13,cursor:'pointer'}}>Cancel</button>
      </div>
    </div>
  );
}

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

  const load = () => getPatients(user.uid).then(pts => setPatient(pts.find(p => p.id === id) || null));
  useEffect(() => { if (user) load(); }, [user, id]);

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
    ['End', patient.dateEnd],
    ['Alert', patient.alert],
    ['Difficulty', patient.difficulty],
    ['Medical History', Array.isArray(patient.medicalHistory) ? patient.medicalHistory.join(', ') : (Array.isArray(patient.dentalHistory) ? patient.dentalHistory.join(', ') : patient.dentalHistory)],
  ];

  const visitConfigs = [
    { key:'operativeVisits', label:'Operative', color:'var(--operative)', fields:OPERATIVE_FIELDS },
    { key:'surgeryVisits',   label:'Surgery',   color:'var(--surgery)',   fields:SURGERY_FIELDS },
    { key:'prothVisits',     label:'Proth',     color:'var(--proth)',     fields:PROTH_FIELDS },
  ];

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
        {patient.notes && (
          <div className={styles.notes}>
            <div className={styles.infoLabel}>Notes</div>
            <div className={styles.notesText}>{patient.notes}</div>
          </div>
        )}
      </div>

      {patient.patientType === 'Adult' && (
        <>
          {/* ENDO */}
          <div className={`card ${styles.visitCard}`} style={{borderLeftColor:'var(--endo)'}}>
            <div className={styles.visitHeader}>
              <span className={styles.visitLabel} style={{color:'var(--endo)'}}>🔵 Endo</span>
              <span className={styles.visitCount}>{(patient.endoVisits||[]).length} visit{(patient.endoVisits||[]).length !== 1 ? 's' : ''}</span>
              <button className={styles.addVisitBtn} style={{color:'var(--endo)',borderColor:'var(--endo)'}}
                onClick={() => { setAdding(adding === 'endo' ? null : 'endo'); setEditing({type:null,idx:null}); }}>
                {adding === 'endo' ? 'Cancel' : '+ Add Visit'}
              </button>
            </div>
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
          </div>

          {/* OTHER VISITS */}
          {visitConfigs.map(cfg => {
            const visits = patient[cfg.key] || [];
            return (
              <div key={cfg.key} className={`card ${styles.visitCard}`} style={{borderLeftColor:cfg.color}}>
                <div className={styles.visitHeader}>
                  <span className={styles.visitLabel} style={{color:cfg.color}}>{cfg.label}</span>
                  <span className={styles.visitCount}>{visits.length} visit{visits.length !== 1 ? 's' : ''}</span>
                  <button className={styles.addVisitBtn} style={{color:cfg.color,borderColor:cfg.color}}
                    onClick={() => { setAdding(adding === cfg.key ? null : cfg.key); setEditing({type:null,idx:null}); }}>
                    {adding === cfg.key ? 'Cancel' : '+ Add Visit'}
                  </button>
                </div>
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
              <input value={newPhotoUrl} onChange={e=>setNewPhotoUrl(e.target.value)} placeholder="Paste Google Drive link here..." style={{padding:'9px 12px'}}/>
              <span style={{fontSize:11,color:'var(--muted)'}}>Google Drive → Right click photo → Share → Copy link</span>
            </div>
            <button onClick={handleAddPhoto} style={{padding:'9px 20px',background:'var(--accent)',color:'#000',border:'none',borderRadius:'var(--radius-sm)',fontSize:14,fontWeight:600,cursor:'pointer'}}>Save</button>
          </div>
        )}

        {(patient.photos||[]).length === 0 && !showAddPhoto && (
          <p className={styles.noVisits}>No photos yet</p>
        )}

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))',gap:12,marginTop:8}}>
          {(patient.photos||[]).map((url, i) => (
            <div key={i} style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1px solid var(--border)',aspectRatio:'1'}}>
              <img src={url} alt={'Photo ' + (i+1)} style={{width:'100%',height:'100%',objectFit:'cover'}}
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
              />
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
