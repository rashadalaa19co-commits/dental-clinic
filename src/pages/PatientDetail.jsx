import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPatients, deletePatient, addVisit, deleteVisit } from '../services/db';
import styles from './PatientDetail.module.css';

const STATUS_BADGE = {
  'Done':'badge-done','In progress':'badge-progress',
  'Not started':'badge-waiting','Follow Up':'badge-followup','Lap waiting':'badge-lap'
};

const VISIT_CONFIGS = [
  { key:'endoVisits',      label:'🔵 Endo',      color:'var(--endo)',
    cols:['toothName','canal','wl','maf','referencePoint','clamp','diagnosis','note','date'] },
  { key:'operativeVisits', label:'🟡 Operative',  color:'var(--operative)',
    cols:['toothName','toothClamp','classType','shade','date'] },
  { key:'surgeryVisits',   label:'🔴 Surgery',    color:'var(--surgery)',
    cols:['toothName','toothNum','typeOfEx','sutureType','complications','date'] },
  { key:'prothVisits',     label:'🟣 Proth',      color:'var(--proth)',
    cols:['toothName','teeth','labStage','material','shade','vitality','impression','labName','date'] },
];

const ENDO_FIELDS    = [{k:'toothName',l:'Tooth'},{k:'canal',l:'Canal'},{k:'wl',l:'WL'},{k:'maf',l:'MAF'},{k:'referencePoint',l:'Ref'},{k:'clamp',l:'Clamp'},{k:'diagnosis',l:'Diagnosis'},{k:'note',l:'Note'},{k:'date',l:'Date',t:'date'}];
const OPERATIVE_FIELDS=[{k:'toothName',l:'Tooth'},{k:'toothClamp',l:'Clamp'},{k:'classType',l:'Class'},{k:'shade',l:'Shade'},{k:'date',l:'Date',t:'date'}];
const SURGERY_FIELDS  =[{k:'toothName',l:'Tooth'},{k:'toothNum',l:'Num'},{k:'typeOfEx',l:'Type EX'},{k:'sutureType',l:'Suture'},{k:'complications',l:'Complications'},{k:'date',l:'Date',t:'date'}];
const PROTH_FIELDS    =[{k:'toothName',l:'Tooth'},{k:'teeth',l:'Teeth'},{k:'labStage',l:'Lab Stage'},{k:'material',l:'Material'},{k:'shade',l:'Shade'},{k:'vitality',l:'Vitality'},{k:'impression',l:'Impression'},{k:'labName',l:'Lab'},{k:'date',l:'Date',t:'date'}];

const FIELDS_MAP = { endoVisits:ENDO_FIELDS, operativeVisits:OPERATIVE_FIELDS, surgeryVisits:SURGERY_FIELDS, prothVisits:PROTH_FIELDS };

export default function PatientDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const nav = useNavigate();
  const [patient, setPatient] = useState(null);
  const [addingVisit, setAddingVisit] = useState(null); // key of visit type
  const [newVisitData, setNewVisitData] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () =>
    getPatients(user.uid).then(pts => setPatient(pts.find(p => p.id === id) || null));

  useEffect(() => { if (user) load(); }, [user, id]);

  const handleDelete = async () => {
    if (!confirm('Delete this patient and all their data?')) return;
    await deletePatient(user.uid, id);
    nav('/patients');
  };

  const startAddVisit = (key) => {
    setAddingVisit(key);
    setNewVisitData(Object.fromEntries(FIELDS_MAP[key].map(f => [f.k, ''])));
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
    ['🦷 Dental History', Array.isArray(patient.dentalHistory) ? patient.dentalHistory.join(', ') : patient.dentalHistory],
  ];

  return (
    <div>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => nav('/patients')}>← Back</button>
          <div>
            <h1 className={styles.name}>{patient.name}</h1>
            <div className={styles.headerMeta}>
              <span className={`badge ${STATUS_BADGE[patient.status] || 'badge-waiting'}`}>{patient.status || '-'}</span>
              {patient.alert && patient.alert !== 'None' && (
                <span className="badge badge-lap">{patient.alert}</span>
              )}
              <span className={styles.metaText}>{patient.patientType}</span>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.editBtn} onClick={() => nav(`/patients/${id}/edit`)}>✏️ Edit</button>
          <button className={styles.delBtn} onClick={handleDelete}>🗑️ Delete</button>
        </div>
      </div>

      {/* Info grid */}
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

      {/* Visit Sections — Adult only */}
      {patient.patientType === 'Adult' && VISIT_CONFIGS.map(cfg => {
        const visits = patient[cfg.key] || [];
        return (
          <div key={cfg.key} className={`card ${styles.visitCard}`} style={{ borderLeftColor: cfg.color }}>
            <div className={styles.visitHeader}>
              <span className={styles.visitLabel} style={{ color: cfg.color }}>{cfg.label}</span>
              <span className={styles.visitCount}>{visits.length} visit{visits.length !== 1 ? 's' : ''}</span>
              <button className={styles.addVisitBtn} style={{ color: cfg.color, borderColor: cfg.color }}
                onClick={() => addingVisit === cfg.key ? setAddingVisit(null) : startAddVisit(cfg.key)}>
                {addingVisit === cfg.key ? '✕ Cancel' : '+ Add Visit'}
              </button>
            </div>

            {/* Add visit inline form */}
            {addingVisit === cfg.key && (
              <div className={styles.inlineForm}>
                {FIELDS_MAP[cfg.key].map(f => (
                  <div key={f.k} className={styles.inlineField}>
                    <label>{f.l}</label>
                    <input type={f.t || 'text'} value={newVisitData[f.k] || ''}
                      onChange={e => setNewVisitData(d => ({ ...d, [f.k]: e.target.value }))} />
                  </div>
                ))}
                <button className={styles.saveVisitBtn} onClick={saveVisit} disabled={saving}>
                  {saving ? '...' : '💾 Save'}
                </button>
              </div>
            )}

            {/* Existing visits */}
            {visits.length === 0 ? (
              <p className={styles.noVisits}>No visits yet</p>
            ) : visits.map((v, i) => (
              <div key={i} className={styles.visitRow}>
                {cfg.cols.map(col => v[col] ? (
                  <div key={col} className={styles.visitField}>
                    <span className={styles.visitFieldLabel}>{col.replace(/([A-Z])/g,' $1').trim()}</span>
                    <span className={styles.visitFieldVal}>{v[col]}</span>
                  </div>
                ) : null)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
