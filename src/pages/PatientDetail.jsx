import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPatients, deletePatient, addVisit } from '../services/db';
import styles from './PatientDetail.module.css';

const STATUS_BADGE = {
  'Done':'badge-done','In progress':'badge-progress',
  'Not started':'badge-waiting','Follow Up':'badge-followup','Lap waiting':'badge-lap'
};

const OPERATIVE_FIELDS=[{k:'toothName',l:'Tooth'},{k:'toothClamp',l:'Clamp'},{k:'classType',l:'Class'},{k:'shade',l:'Shade'},{k:'date',l:'Date',t:'date'}];
const SURGERY_FIELDS=[{k:'toothName',l:'Tooth'},{k:'toothNum',l:'Num'},{k:'typeOfEx',l:'Type EX'},{k:'sutureType',l:'Suture'},{k:'complications',l:'Complications'},{k:'date',l:'Date',t:'date'}];
const PROTH_FIELDS=[{k:'toothName',l:'Tooth'},{k:'teeth',l:'Teeth'},{k:'labStage',l:'Lab Stage'},{k:'material',l:'Material'},{k:'shade',l:'Shade'},{k:'vitality',l:'Vitality'},{k:'impression',l:'Impression'},{k:'labName',l:'Lab'},{k:'date',l:'Date',t:'date'}];
const FIELDS_MAP = { operativeVisits:OPERATIVE_FIELDS, surgeryVisits:SURGERY_FIELDS, prothVisits:PROTH_FIELDS };

const emptyCanal = () => ({ canal:'', wl:'', maf:'', note:'' });
const emptyTooth = () => ({ toothName:'', diagnosis:'', clamp:'', referencePoint:'', date:'', canals:[emptyCanal()] });

function EndoDisplay({ visits }) {
  if (!visits || visits.length === 0) return <p style={{color:'var(--muted)',fontSize:13,padding:'8px 0'}}>No endo visits yet</p>;
  return visits.map((tooth, ti) => (
    <div key={ti} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:14,marginBottom:10}}>
      <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:10}}>
        {[['Tooth',tooth.toothName],['Diagnosis',tooth.diagnosis],['Clamp',tooth.clamp],['Ref Point',tooth.referencePoint],['Date',tooth.date]].map(([label,val]) => val ? (
          <div key={label} style={{display:'flex',flexDirection:'column',gap:2}}>
            <span style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase'}}>{label}</span>
            <span style={{fontSize:14,fontWeight:500}}>{val}</span>
          </div>
        ) : null)}
      </div>
      {tooth.canals && tooth.canals.length > 0 && (
        <div style={{borderTop:'1px solid var(--border)',paddingTop:10}}>
          <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,marginBottom:8}}>CANALS</div>
          {tooth.canals.map((canal, ci) => (
            <div key={ci} style={{display:'flex',flexWrap:'wrap',gap:10,padding:'8px',background:'var(--bg)',borderRadius:8,marginBottom:6}}>
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
    </div>
  ));
}

function AddEndoForm({ onSave, onCancel }) {
  const [teeth, setTeeth] = useState([emptyTooth()]);
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
            {teeth.length > 1 && <button onClick={()=>removeTooth(ti)} style={{padding:'6px 10px',background:'rgba(248,81,73,0.15)',color:'var(--danger)',border:'none',borderRadius:6,cursor:'pointer',alignSelf:'flex-end'}}>✕</button>}
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
                {tooth.canals.length > 1 && <button onClick={()=>removeCanal(ti,ci)} style={{padding:'4px 8px',background:'rgba(248,81,73,0.1)',color:'var(--danger)',border:'none',borderRadius:6,cursor:'pointer',alignSelf:'flex-end',fontSize:12}}>✕</button>}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{display:'flex',gap:10,marginTop:10,alignItems:'center'}}>
        <button onClick={addTooth} style={{padding:'6px 14px',background:'rgba(56,139,253,0.1)',color:'var(--endo)',border:'1px solid rgba(56,139,253,0.3)',borderRadius:20,fontSize:13,cursor:'pointer'}}>+ Add Tooth</button>
        <button onClick={()=>onSave(teeth)} style={{padding:'8px 18px',background:'var(--success)',color:'#000',border:'none',borderRadius:'var(--radius-sm)',fontSize:13,fontWeight:600,cursor:'pointer'}}>💾 Save</button>
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
  const [addingVisit, setAddingVisit] = useState(null);
  const [newVisitData, setNewVisitData] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => getPatients(user.uid).then(pts => setPatient(pts.find(p => p.id === id) || null));
  useEffect(() => { if (user) load(); }, [user, id]);

  const handleDelete = async () => {
    if (!confirm('Delete this patient and all their data?')) return;
    await deletePatient(user.uid, id);
    nav('/patients');
  };

  const saveEndoVisits = async (teeth) => {
    setSaving(true);
    for (const tooth of teeth) {
      await addVisit(user.uid, id, 'endoVisits', tooth);
    }
    await load();
    setAddingVisit(null);
    setSaving(false);
  };

  const saveVisit = async () => {
    setSaving(true);
    await addVisit(user.uid, id, addingVisit, newVisitData);
    await load();
    setAddingVisit(null);
    setSaving(false);
  };

  if (!patient) return <div className={styles.loading}>Loading...</div>;

  const info = [
    ['📞 Phone', patient.phone],
    ['🎂 Age', patient.age],
    ['💼 Occupation', patient.occupation],
    ['🏷️ Type', patient.patientType],
    ['😣 Complaint', patient.chiefComplaint],
    ['🦷 Tooth', patient.tooth],
    ['⚙️ Procedure', patient.procedure],
    ['📅 Start', patient.dateStart],
    ['📅 End', patient.dateEnd],
    ['⚠️ Alert', patient.alert],
    ['📊 Difficulty', patient.difficulty],
    ['💊 Medical History', Array.isArray(patient.medicalHistory) ? patient.medicalHistory.join(', ') : (Array.isArray(patient.dentalHistory) ? patient.dentalHistory.join(', ') : patient.dentalHistory)],
  ];

  const visitConfigs = [
    { key:'operativeVisits', label:'🟡 Operative', color:'var(--operative)', fields:OPERATIVE_FIELDS },
    { key:'surgeryVisits',   label:'🔴 Surgery',   color:'var(--surgery)',   fields:SURGERY_FIELDS },
    { key:'prothVisits',     label:'🟣 Proth',     color:'var(--proth)',     fields:PROTH_FIELDS },
  ];

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => nav('/patients')}>← Back</button>
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
          <button className={styles.editBtn} onClick={() => nav(`/patients/${id}/edit`)}>✏️ Edit</button>
          <button className={styles.delBtn} onClick={handleDelete}>🗑️ Delete</button>
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
            <div className={styles.infoLabel}>📝 Notes</div>
            <div className={styles.notesText}>{patient.notes}</div>
          </div>
        )}
      </div>

      {patient.patientType === 'Adult' && (
        <>
          {/* Endo Section */}
          <div className={`card ${styles.visitCard}`} style={{borderLeftColor:'var(--endo)'}}>
            <div className={styles.visitHeader}>
              <span className={styles.visitLabel} style={{color:'var(--endo)'}}>🔵 Endo</span>
              <span className={styles.visitCount}>{(patient.endoVisits||[]).length} visit{(patient.endoVisits||[]).length !== 1 ? 's' : ''}</span>
              <button className={styles.addVisitBtn} style={{color:'var(--endo)',borderColor:'var(--endo)'}}
                onClick={() => setAddingVisit(addingVisit === 'endoVisits' ? null : 'endoVisits')}>
                {addingVisit === 'endoVisits' ? '✕ Cancel' : '+ Add Visit'}
              </button>
            </div>
            {addingVisit === 'endoVisits' && <AddEndoForm onSave={saveEndoVisits} onCancel={() => setAddingVisit(null)}/>}
            <EndoDisplay visits={patient.endoVisits}/>
          </div>

          {/* Other visits */}
          {visitConfigs.map(cfg => {
            const visits = patient[cfg.key] || [];
            return (
              <div key={cfg.key} className={`card ${styles.visitCard}`} style={{borderLeftColor:cfg.color}}>
                <div className={styles.visitHeader}>
                  <span className={styles.visitLabel} style={{color:cfg.color}}>{cfg.label}</span>
                  <span className={styles.visitCount}>{visits.length} visit{visits.length !== 1 ? 's' : ''}</span>
                  <button className={styles.addVisitBtn} style={{color:cfg.color,borderColor:cfg.color}}
                    onClick={() => {
                      if (addingVisit === cfg.key) { setAddingVisit(null); return; }
                      setAddingVisit(cfg.key);
                      setNewVisitData(Object.fromEntries(cfg.fields.map(f => [f.k, ''])));
                    }}>
                    {addingVisit === cfg.key ? '✕ Cancel' : '+ Add Visit'}
                  </button>
                </div>
                {addingVisit === cfg.key && (
                  <div className={styles.inlineForm}>
                    {cfg.fields.map(f => (
                      <div key={f.k} className={styles.inlineField}>
                        <label>{f.l}</label>
                        <input type={f.t||'text'} value={newVisitData[f.k]||''}
                          onChange={e => setNewVisitData(d => ({...d,[f.k]:e.target.value}))}/>
                      </div>
                    ))}
                    <button className={styles.saveVisitBtn} onClick={saveVisit} disabled={saving}>
                      {saving ? '...' : '💾 Save'}
                    </button>
                  </div>
                )}
                {visits.length === 0 ? (
                  <p className={styles.noVisits}>No visits yet</p>
                ) : visits.map((v,i) => (
                  <div key={i} className={styles.visitRow}>
                    {cfg.fields.map(f => v[f.k] ? (
                      <div key={f.k} className={styles.visitField}>
                        <span className={styles.visitFieldLabel}>{f.l}</span>
                        <span className={styles.visitFieldVal}>{v[f.k]}</span>
                      </div>
                    ) : null)}
                  </div>
                ))}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
