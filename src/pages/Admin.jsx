import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const ADMIN_EMAIL = 'rashadalaa19co@gmail.com';

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  if (user?.email !== ADMIN_EMAIL) {
    return <div style={{color:'white',padding:40,textAlign:'center'}}>⛔ Access Denied</div>;
  }

  const load = async () => {
    const snap = await getDocs(collection(db, 'clinics'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (uid, current) => {
    await updateDoc(doc(db, 'clinics', uid), { isActive: !current });
    load();
  };

  return (
    <div>
      <h1 style={{fontSize:26,fontWeight:800,marginBottom:4}}>👑 Admin Panel</h1>
      <p style={{color:'var(--muted)',fontSize:14,marginBottom:24}}>Manage doctors & subscriptions</p>
      {loading ? <p style={{color:'var(--muted)'}}>Loading...</p> : (
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',padding:'10px 16px',background:'var(--surface2)',fontSize:12,color:'var(--muted)',fontWeight:600,textTransform:'uppercase'}}>
            <span>Email</span><span>Patients</span><span>Status</span><span>Action</span>
          </div>
          {users.length === 0 ? (
            <p style={{color:'var(--muted)',padding:20}}>No users yet</p>
          ) : users.map(u => (
            <div key={u.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',padding:'14px 16px',borderTop:'1px solid var(--border)',alignItems:'center',fontSize:14}}>
              <span>{u.id}</span>
              <span>{u.patientCount || 0}</span>
              <span>
                <span className={`badge ${u.isActive ? 'badge-done' : 'badge-danger'}`}>
                  {u.isActive ? '✅ Active' : '🔒 Locked'}
                </span>
              </span>
              <span>
                <button
                  onClick={() => toggle(u.id, u.isActive)}
                  style={{padding:'6px 14px',background: u.isActive ? 'rgba(248,81,73,0.1)' : 'rgba(63,185,80,0.15)',color: u.isActive ? 'var(--danger)' : 'var(--success)',border: u.isActive ? '1px solid rgba(248,81,73,0.2)' : '1px solid rgba(63,185,80,0.3)',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  {u.isActive ? '🔒 Lock' : '✅ Activate'}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
