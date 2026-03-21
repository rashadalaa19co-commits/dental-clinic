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

const ENDO_FIELDS = [
  {key:'toothName',label:'Tooth Name'},{key:'canal',label:'Canal'},
  {key:'wl',label:'WL'},{key:'maf',label:'MAF'},
  {key:'referencePoint',label:'Ref Point'},{key:'clamp',label:'Clamp'},
  {key:'diagnosis',label:'Diagnosis'},{key:'note',label:'Note'},{key:'date',label:'Date',type:'date'}
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
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          background:'var(--surface2)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-sm)', padding:'9px 12px', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          minHeight:42, flexWrap:'wrap', gap:6,
          borderColor: open ? 'var(--accent)' : 'var(--border)'
        }}
      >
        {selected.length === 0 ? (
          <span style={{color:'var(--muted)',fontSize:14}}>{placeholder}</span>
        ) : (
          <div style={{display:'flex',flexWrap:'wrap',gap:4,flex:1}}>
            {selected.map(s => (
              <span key={s} style={{
                background:'rgba(0,212,255,0.15)', color:'var(--accent)',
                padding:'2px 8px', borderRadius:20, fontSize:12,
                display:'flex', alignItems:'center', gap:4
              }}>
                {s}
                <span
                  onClick={e => { e.stopPropagation(); toggle(s); }}
                  style={{cursor:'pointer', fontWeight:700, fontSize:14}}
                >×</span>
              </span>
            ))}
          </div>
        )}
        <span style={{color:'var(--muted)',fontSize:12,flexShrink:0}}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, right:0,
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-sm)', zIndex:100,
          maxHeight:220, overflowY:'auto',
          boxShadow:'0 8px 24px rgba(0,0,0,0.3)'
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => toggle(opt)}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'10px 14px', cursor:'pointer',
                background: selected.includes(opt) ? 'rgba(0,212,255,0.08)' : 'transparent',
                transition:'background 0.15s'
              }}
            >
              <div style={{
                width:18, height:18, borderRadius:4,
                border: selected.includes(opt) ? '2px solid var(--accent)' : '2px solid var(--border)',
                background: selected.includes(opt) ? 'var(--accent)' : 'transparent',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, transition:'all 0.15s'
              }}>
                {selected.includes(opt) && <span style={{color:'#000',fontSize:12,fontWeight:700}}>✓</span>}
              </div>
              <span style={{fontSize:14, color: selected.includes(opt) ? 'var(--accent)' : 'var(--text)'}}>
                {opt}
              </span>
            </div>
          ))}
        </div>
      )}
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
        if (p) setForm({ ...p, medicalHistory: p.medicalHistory || p.dentalHistory || [] });
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
    <div className={styles.visitSection} style={{ borderLeftColor: color }}>
      <div className={styles.visitHeader}>
        <span className={styles.visitTitle} style={{ color }}>{title}</span>
        <button type="button" className={styles.addVisitBtn} style={{ background: color + '22', color }}
          onClick={() => addRow(setter, fields)}>+ Add Visit</button>
      </div>
      {rows.map((row, idx) => (
        <div key={idx} className={styles.visitRow}>
          {fields.map(f => (
            <div key={f.key} className={styles.visitField}>
              <label>{f.label}</label>
              <input type={f.type || 'text'} value={row[f.key] || ''}
                onChange={e => updateRow(setter, idx, f.key, e.target.value)} />
            </div>
          ))}
          <button type="button" className={styles.removeBtn}
            onClick={() => removeRow(setter, idx)}>✕</button>
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
          <div className={styles.field}><label>Full Name *</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name"/></div>
          <div className={styles.field}><label>Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone number"/></div>
          <div className={styles.field}><label>Age</label><input value={form.age} onChange={e => set('age', e.target.value)} placeholder="Age"/></div>
          <div className={styles.field}><label>Occupation</label><input value={form.occupation} onChange={e => set('occupation', e.target.value)} placeholder="Occupation"/></div>
          <div className={styles.field}><label>Chief Complaint</label><input value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)} placeholder="Chief complaint"/></div>
          <div className={styles.field}><label>Tooth</label><input value={form.tooth} onChange={e => set('tooth', e.target.value)} placeholder="Tooth number/name"/></div>
          <div className={styles.field}>
            <label>Procedure</label>
            <select value={form.procedure} onChange={e => set('procedure', e.target.value)}>
              <option value="">Select...</option>
              {['Endo','Operative','Surgery','Proth','Scaling','Other'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              {['Not started','In progress','Done','Follow Up','Lap waiting'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Difficulty</label>
            <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
              <option value="">Select...</option>
              {['Easy','Medium','Hard'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Alert</label>
            <select value={form.alert} onChange={e => set('alert', e.target.value)}>
              {['None','⚠️ Alert','🔴 Urgent'].map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className={styles.field}><label>Start Date</label><input type="date" value={form.dateStart} onChange={e => set('dateStart', e.target.value)}/></div>
          <div className={styles.field}><label>End Date</label><input type="date" value={form.dateEnd} onChange={e => set('dateEnd', e.target.value)}/></div>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label>Medical History</label>
            <MultiSelectDropdown
              options={MEDICAL_HISTORY_OPTIONS}
              selected={form.medicalHistory || []}
              onChange={val => set('medicalHistory', val)}
              placeholder="Select medical history..."
            />
          </div>
        </div>

        <div className={styles.field} style={{marginTop:12}}>
          <label>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes..."/>
        </div>
      </div>

      <div className={`card ${styles.section}`}>
        <h3 className={styles.sectionTitle}>Patient Type</h3>
        <div className={styles.typeRow}>
          {['Adult','Bedo'].map(t => (
            <label key={t} className={`${styles.typeOption} ${form.patientType === t ? styles.typeActive : ''}`}>
              <input type="radio" name="type" value={t} checked={form.patientType === t}
                onChange={() => set('patientType', t)} />
              {t === 'Adult' ? '🧑 Adult' : '👶 Bedo (Child)'}
            </label>
          ))}
        </div>
      </div>

      {form.patientType === 'Adult' && (
        <div className={`card ${styles.section}`}>
          <h3 className={styles.sectionTitle}>Visit Sessions</h3>
          <VisitSection title="🔵 Endo Visits" color="var(--endo)" rows={endoRows} setter={setEndoRows} fields={ENDO_FIELDS}/>
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
