import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { addPatient, updatePatient, getPatients } from '../services/db';
import styles from './PatientForm.module.css';

const MEDICAL_HISTORY_OPTIONS = [
  'Medical Free','Allergy','Diabetes','Hypertension','Heart Disease',
  'Infection','Pregnancy','Bleeding Disorder','Asthma','Kidney Disease',
  'Liver Disease','Cancer','Osteoporosis','Thyroid','Epilepsy','Other'
];

const OPERATIVE_FIELDS = [
  {key:'toothName',label:'Tooth Name'},{key:'toothClamp',label:'Tooth/Clamp'},
  {key:'classType',label:'Class'},{key:'shade',label:'Shade'},{key:'date',label:'Date',type:'date'}
];
const SURGERY_FIELDS = [
  {key:'toothName',label:'Tooth Name'},{key:'toothNum',label:'Tooth Num'},
  {key:'typeOfEx',label:'Type of EX'},{key:'sutureType',label:'Suture'},
  {key:'complications',label:'Complications'},{key:'date',label:'Date',type:'date'}
];
const PROTH_FIELDS = [
  {key:'toothName',label:'Tooth Name'},{key:'teeth',label:'Teeth'},
  {key:'labStage',label:'Lab Stage'},{key:'material',label:'Material'},
  {key:'shade',label:'Shade'},{key:'vitality',label:'Vitality'},
  {key:'impression',label:'Impression'},{key:'labName',label:'Lab Name'},{key:'date',label:'Date',type:'date'}
];

const emptyRow = fields => Object.fromEntries(fields.map(f => [f.key, '']));
const emptyCanal = () => ({ canal:'', wl:'', maf:'', note:'' });
const emptyTooth = () => ({ toothName:'', diagnosis:'', clamp:'', referencePoint:'', date:'', canals:[emptyCanal()] });

function MultiSelectDropdown({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = val => {
    if (selected.includes(val)) onChange(selected.filter(x => x !== val));
    else onChange([...selected, val]);
  };

  return (
    <div ref={ref} style={{position:'relative'}}>
      <div onClick={() => setOpen(o => !o)} style={{background:'var(--surface2)',border:'1px solid',borderColor:open?'var(--accent)':'var(--border)',borderRadius:'var(--radius-sm)',padding:'9px 12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:42,flexWrap:'wrap',gap:6}}>
        {selected.length === 0 ? (
          <span style={{color:'var(--muted)',fontSize:14}}>{placeholder}</span>
        ) : (
          <div style={{display:'flex',flexWrap:'wrap',gap:4,flex:1}}>
            {selected.map(s => (
              <span key={s} style={{background:'rgba(0,212,255,0.15)',color:'var(--accent)',padding:'2px 8px',borderRadius:20,fontSize:12,display:'flex',alignItems:'center',gap:4}}>
                {s}
                <span onClick={e=>{e.stopPropagation();toggle(s);}} style={{cursor:'pointer',fontWeight:700,fontSize:14}}>×</span>
              </span>
            ))}
          </div>
        )}
        <span style={{color:'var(--muted)',fontSize:12,flexShrink:0}}>{open?'▲':'▼'}</span>
      </div>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',zIndex:100,maxHeight:220,overflowY:'auto',boxShadow:'0 8px 24px rgba(0,0,0,0.3)'}}>
          {options.map(opt => (
            <div key={opt} onClick={()=>toggle(opt)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',cursor:'pointer',background:selected.includes(opt)?'rgba(0,212,255,0.08)':'transparent'}}>
              <div style={{width:18,height:18,borderRadius:4,border:selected.includes(opt)?'2px solid var(--accent)':'2px solid var(--border)',background:selected.includes(opt)?'var(--accent)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {selected.includes(opt) && <span style={{color:'#000',fontSize:12,fontWeight:700}}>✓</span>}
              </div>
              <span style={{fontSize:14,color:selected.includes(opt)?'var(--accent)':'var(--text)'}}>{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EndoSection({ rows, setRows }) {
  const addTooth = () => setRows(r => [...r, emptyTooth()]);
  const removeTooth = idx => setRows(r => r.filter((_,i) => i !== idx));
  const updateTooth = (idx, key, val) => setRows(r => r.map((t,i) => i===idx ? {...t,[key]:val} : t));
  const addCanal = idx => setRows(r => r.map((t,i) => i===idx ? {...t,canals:[...t.canals,emptyCanal()]} : t));
  const removeCanal = (ti,ci) => setRows(r => r.map((t,i) => i===ti ? {...t,canals:t.canals.filter((_,j)=>j!==ci)} : t));
  const updateCanal = (ti,ci,key,val) => setRows(r => r.map((t,i) => i===ti ? {...t,canals:t.canals.map((c,j)=>j===ci?{...c,[key]:val}:c)} : t));

  return (
    <div style={{borderLeft:'3px solid var(--endo)',paddingLeft:16,marginBottom:20}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <span style={{fontSize:14,fontWeight:700,color:'var(--endo)'}}>🔵 Endo Visits</span>
        <button type="button" onClick={addTooth} style={{padding:'5px 14px',background:'rgba(56,139,253,0.15)',color:'var(--endo)',border:'none',borderRadius:20,fontSize:13,fontWeight:600,cursor:'pointer'}}>+ Add Tooth</button>
      </div>
      {rows.map((tooth,ti) => (
        <div key={ti} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:14,marginBottom:10}}>
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
            <button type="button" onClick={()=>removeTooth(ti)} style={{padding:'6px 10px',background:'rgba(248,81,73,0.15)',color:'var(--danger)',border:'none',borderRadius:6,cursor:'pointer',alignSelf:'flex-end'}}>✕</button>
          </div>
          <div style={{borderTop:'1px solid var(--border)',paddingTop:10}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:12,color:'var(--muted)',fontWeight:600}}>CANALS</span>
              <button type="button" onClick={()=>addCanal(ti)} style={{padding:'3px 10px',background:'rgba(56,139,253,0.1)',color:'var(--endo)',border:'1px solid rgba(56,139,253,0.3)',borderRadius:20,fontSize:12,cursor:'pointer'}}>+ Add Canal</button>
            </div>
            {tooth.canals.map((canal,ci) => (
              <div key={ci} style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'flex-end',padding:8,background:'var(--bg)',borderRadius:8,marginBottom:6}}>
                <span style={{fontSize:12,color:'var(--endo)',fontWeight:700,minWidth:20}}>{ci+1}</span>
                {[['canal','Canal'],['wl','WL'],['maf','MAF'],['note','Note']].map(([key,label]) => (
                  <div key={key} style={{display:'flex',flexDirection:'column',gap:3,flex:1,minWidth:80}}>
                    <label style={{fontSize:10,color:'var(--muted)'}}>{label}</label>
                    <input value={canal[key]||''} onChange={e=>updateCanal(ti,ci,key,e.target.value)} style={{padding:'6px 8px'}}/>
                  </div>
                ))}
                {tooth.canals.length > 1 && (
                  <button type="button" onClick={()=>removeCanal(ti,ci)} style={{padding:'4px 8px',background:'rgba(248,81,73,0.1)',color:'var(--danger)',border:'none',borderRadius:6,cursor:'pointer',alignSelf:'flex-end',fontSize:12}}>✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PatientForm() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name:'', phone:'', age:'', occupation:'',
    patientType:'', medicalHistory:[],
    chiefComplaint:'', tooth:'', procedure:'',
    status:'Not started', difficulty:'', alert:'None',
    dateStart:'', dateEnd:'', notes:''
  });
  const [endoRows, setEndoRows] = useState([]);
  const [operativeRows, setOperativeRows] = useState([]);
  const [surgeryRows, setSurgeryRows] = useState([]);
  const [prothRows, setProthRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      getPatients(user.uid).then(patients => {
        const p = patients.find(x => x.id === id);
        if (p) {
          setForm({ ...p, medicalHistory: p.medicalHistory || p.dentalHistory || [] });
          setEndoRows(p.endoVisits || []);
          setOperativeRows(p.operativeVisits || []);
          setSurgeryRows(p.surgeryVisits || []);
          setProthRows(p.prothVisits || []);
        }
      });
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addRow = (setter, fields) => setter(r => [...r, emptyRow(fields)]);
  const updateRow = (setter, idx, key, val) =>
    setter(rows => rows.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  const removeRow = (setter, idx) => setter(rows => rows.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Please enter patient name');
    if (!form.patientType) return alert('Please select patient type');
    setSaving(true);
    try {
      const data = { ...form, endoVisits: endoRows, operativeVisits: operativeRows, surgeryVisits: surgeryRows, prothVisits: prothRows };
      if (isEdit) {
        await updatePatient(user.uid, id, data);
        nav(`/patients/${id}`);
      } else {
        const ref = await addPatient(user.uid, data);
        nav(`/patients/${ref.id}`);
      }
    } catch (err) {
      if (err.message === 'LIMIT_REACHED') {
        nav('/locked');
      } else {
        alert('Error saving patient!');
        console.error(err);
      }
    } finally { setSaving(false); }
  };

  const VisitSection = ({ title, color, rows, setter, fields }) => (
    <div style={{borderLeft:`3px solid ${color}`,paddingLeft:16,marginBottom:20}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <span style={{fontSize:14,fontWeight:700,color}}>{title}</span>
        <button type="button" onClick={()=>addRow(setter,fields)} style={{padding:'5px 14px',background:color+'22',color,border:'none',borderRadius:20,fontSize:13,fontWeight:600,cursor:'pointer'}}>+ Add Visit</button>
      </div>
      {rows.map((row,idx) => (
        <div key={idx} style={{display:'flex',flexWrap:'wrap',gap:10,padding:12,background:'var(--surface2)',borderRadius:'var(--radius-sm)',marginBottom:8,border:'1px solid var(--border)',alignItems:'flex-end'}}>
          {fields.map(f => (
            <div key={f.key} style={{display:'flex',flexDirection:'column',gap:4,flex:1,minWidth:90}}>
              <label style={{fontSize:11,color:'var(--muted)'}}>{f.label}</label>
              <input type={f.type||'text'} value={row[f.key]||''} onChange={e=>updateRow(setter,idx,f.key,e.target.value)} style={{padding:'7px 10px'}}/>
            </div>
          ))}
          <button type="button" onClick={()=>removeRow(setter,idx)} style={{padding:'6px 10px',background:'rgba(248,81,73,0.15)',color:'var(--danger)',border:'none',borderRadius:6,cursor:'pointer',alignSelf:'flex-end'}}>✕</button>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>{isEdit ? '✏️ Edit Patient' : '➕ New Patient'}</h1>
        </div>
        <div className={styles.topActions}>
          <button className={styles.cancelBtn} onClick={() => nav(-1)}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Patient'}
          </button>
        </div>
      </div>

      <div className={`card ${styles.section}`}>
        <h3 className={styles.sectionTitle}>Patient Info</h3>
        <div className={styles.grid4}>
          <div className={styles.field}><label>Full Name *</label><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Full name"/></div>
          <div className={styles.field}><label>Phone</label><input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="Phone number"/></div>
          <div className={styles.field}><label>Age</label><input value={form.age} onChange={e=>set('age',e.target.value)} placeholder="Age"/></div>
          <div className={styles.field}><label>Occupation</label><input value={form.occupation} onChange={e=>set('occupation',e.target.value)} placeholder="Occupation"/></div>
          <div className={styles.field}><label>Chief Complaint</label><input value={form.chiefComplaint} onChange={e=>set('chiefComplaint',e.target.value)} placeholder="Chief complaint"/></div>
          <div className={styles.field}><label>Tooth</label><input value={form.tooth} onChange={e=>set('tooth',e.target.value)} placeholder="Tooth number/name"/></div>
          <div className={styles.field}>
            <label>Procedure</label>
            <select value={form.procedure} onChange={e=>set('procedure',e.target.value)}>
              <option value="">Select...</option>
              {['Endo','Operative','Surgery','Proth','Scaling','Other'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Status</label>
            <select value={form.status} onChange={e=>set('status',e.target.value)}>
              {['Not started','In progress','Done','Follow Up','Lap waiting'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Difficulty</label>
            <select value={form.difficulty} onChange={e=>set('difficulty',e.target.value)}>
              <option value="">Select...</option>
              {['Easy','Medium','Hard'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Alert</label>
            <select value={form.alert} onChange={e=>set('alert',e.target.value)}>
              {['None','⚠️ Alert','🔴 Urgent'].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.field}><label>Start Date</label><input type="date" value={form.dateStart} onChange={e=>set('dateStart',e.target.value)}/></div>
          <div className={styles.field}><label>End Date</label><input type="date" value={form.dateEnd} onChange={e=>set('dateEnd',e.target.value)}/></div>
          <div className={styles.field} style={{gridColumn:'1/-1'}}>
            <label>Medical History</label>
            <MultiSelectDropdown options={MEDICAL_HISTORY_OPTIONS} selected={form.medicalHistory||[]} onChange={val=>set('medicalHistory',val)} placeholder="Select medical history..."/>
          </div>
        </div>
        <div className={styles.field} style={{marginTop:12}}>
          <label>Notes</label>
          <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Additional notes..."/>
        </div>
      </div>

      <div className={`card ${styles.section}`}>
        <h3 className={styles.sectionTitle}>Patient Type</h3>
        <div className={styles.typeRow}>
          {['Adult','Bedo'].map(t => (
            <label key={t} className={`${styles.typeOption} ${form.patientType===t?styles.typeActive:''}`}>
              <input type="radio" name="type" value={t} checked={form.patientType===t} onChange={()=>set('patientType',t)}/>
              {t==='Adult'?'🧑 Adult':'👶 Bedo (Child)'}
            </label>
          ))}
        </div>
      </div>

      {form.patientType === 'Adult' && (
        <div className={`card ${styles.section}`}>
          <h3 className={styles.sectionTitle}>Visit Sessions</h3>
          <EndoSection rows={endoRows} setRows={setEndoRows}/>
          <VisitSection title="🟡 Operative Visits" color="var(--operative)" rows={operativeRows} setter={setOperativeRows} fields={OPERATIVE_FIELDS}/>
          <VisitSection title="🔴 Surgery Visits" color="var(--surgery)" rows={surgeryRows} setter={setSurgeryRows} fields={SURGERY_FIELDS}/>
          <VisitSection title="🟣 Proth Visits" color="var(--proth)" rows={prothRows} setter={setProthRows} fields={PROTH_FIELDS}/>
        </div>
      )}

      <div className={styles.bottomActions}>
        <button className={styles.cancelBtn} onClick={() => nav(-1)}>Cancel</button>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Patient'}
        </button>
      </div>
    </div>
  );
}
