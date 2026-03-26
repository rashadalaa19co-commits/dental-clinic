import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getPatients, deletePatient } from '../services/db';
import styles from './Patients.module.css';

const STATUS_BADGE = {
  'Done': 'badge-done', 'In progress': 'badge-progress',
  'Not started': 'badge-waiting', 'Follow Up': 'badge-followup', 'Lap waiting': 'badge-lap'
};

export default function Patients() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    getPatients(user.uid).then(p => { setPatients(p); setLoading(false); });
  };

  useEffect(() => { if (user) load(); }, [user]);

  const filtered = patients.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search) ||
    p.status?.toLowerCase().includes(search.toLowerCase()) ||
    p.procedure?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this patient?')) return;
    await deletePatient(user.uid, id);
    load();
  };

  return (
    <div>
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Patients</h1>
          <p className={styles.sub}>{patients.length} total</p>
        </div>
        <div className={styles.actions}>
          <input
            className={styles.search}
            placeholder="🔍 Search name, phone, status..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <button className={styles.addBtn} onClick={() => nav('/patients/new')}>
            ➕ New Patient
          </button>
        </div>
      </div>

      {loading ? (
        <p className={styles.empty}>Loading...</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>No patients found</p>
      ) : (
        <div className={styles.table}>
          <div className={styles.thead}>
            <span>Name</span><span>Phone</span><span>Type</span>
            <span>Procedure</span><span>Status</span><span>Alert</span><span></span>
          </div>
          {filtered.map(p => (
            <div key={p.id} className={styles.row} onClick={() => nav(`/patients/${p.id}`)}>
              <span className={styles.nameCell}>
                <span className={styles.avatar}>{p.name?.[0]?.toUpperCase()}</span>
                {p.name}
              </span>
              <span className={styles.muted}>{p.phone || '-'}</span>
              <span className={styles.muted}>{p.patientType || '-'}</span>
              <span className={styles.muted}>{p.procedure || '-'}</span>
              <span>
                <span className={`badge ${STATUS_BADGE[p.status] || 'badge-waiting'}`}>
                  {p.status || '-'}
                </span>
              </span>
              <span>
                {p.alert && p.alert !== 'None' && (
                  <span className={`badge badge-lap`}>{p.alert}</span>
                )}
              </span>
              <span className={styles.rowActions}>
                <button className={styles.editBtn} onClick={e => { e.stopPropagation(); nav(`/patients/${p.id}`); }} title="View patient">👁️</button>
                <button className={styles.editBtn} onClick={e => { e.stopPropagation(); nav(`/patients/${p.id}/edit`); }} title="Edit patient">✏️</button>
                <button className={styles.delBtn} onClick={e => handleDelete(e, p.id)} title="Delete patient">🗑️</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
