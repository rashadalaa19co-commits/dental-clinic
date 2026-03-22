import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const ADMIN_EMAIL = 'rashadalaa19co@gmail.com';

export default function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  if (user?.email !== ADMIN_EMAIL) {
    return <div style={{color:'white',padding:40,textAlign:'center',fontSize:20}}>⛔ Access Denied</div>;
  }

  const load = async () => {
    const snap = await getDocs(collection(db, 'clinics'));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (uid, current) => {
    await updateDoc(doc(db, 'clinics', uid), { isActive: !current });
    load();
  };

  const filtered = users.filter(u =>
    !search ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.id?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (ts) => {
    if (!ts) return '-';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  };

  const formatTime = (ts) => {
    if (!ts) return '-';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  };

  const active = users.filter(u => u.isActive).length;
  const locked = users.filter(u => !u.isActive).length;
  const total = users.length;

  return (
    <div>
      <h1 style={{fontSize:26,fontWeight:800,marginBottom:4}}>👑 Admin Panel</h1>
      <p style={{color:'var(--muted)',fontSize:14,marginBottom:24}}>Manage doctors and subscriptions</p>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:24}}>
        {[
          { label:'Total Doctors', value:total, color:'var(--accent)', icon:'👥' },
          { label:'Active', value:active, color:'var(--success)', icon:'✅' },
          { label:'Locked', value:locked, color:'var(--danger)', icon:'🔒' },
        ].map(s => (
          <div key={s.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'18px 16px',display:'flex',alignItems:'center',gap:14}}>
            <div style={{fontSize:28}}>{s.icon}</div>
            <div>
              <div style={{fontSize:28,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:13,color:'var(--muted)',marginTop:2}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'8px 14px',marginBottom:16,width:320}}>
        <span style={{color:'var(--muted)'}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email..." style={{border:'none',background:'transparent',color:'var(--text)',outline:'none',fontSize:14,width:'100%'}}/>
      </div>

      {/* Table */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1.5fr 0.8fr 1.2fr 1.2fr 1fr',padding:'10px 16px',background:'var(--surface2)',fontSize:12,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>
          <span>Doctor</span>
          <span>Email</span>
          <span>Patients</span>
          <span>Joined</span>
          <span>Last Login</span>
          <span>Action</span>
        </div>

        {loading ? (
          <p style={{color:'var(--muted)',padding:24,textAlign:'center'}}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{color:'var(--muted)',padding:24,textAlign:'center'}}>No doctors found</p>
        ) : filtered.map(u => (
          <div key={u.id} style={{display:'grid',gridTemplateColumns:'2fr 1.5fr 0.8fr 1.2fr 1.2fr 1fr',padding:'14px 16px',borderTop:'1px solid var(--border)',alignItems:'center',fontSize:14}}>
            {/* Doctor name + avatar */}
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {u.photoURL ? (
                <img src={u.photoURL} alt="" style={{width:36,height:36,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>
              ) : (
                <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(0,212,255,0.15)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,flexShrink:0}}>
                  {u.displayName?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div style={{fontWeight:600,fontSize:14}}>{u.displayName || 'Unknown'}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>ID: {u.id.slice(0,8)}...</div>
              </div>
            </div>

            {/* Email */}
            <span style={{color:'var(--muted)',fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email || u.id}</span>

            {/* Patients count */}
            <span style={{fontWeight:600,color:u.patientCount > 0 ? 'var(--accent)' : 'var(--muted)'}}>{u.patientCount || 0}</span>

            {/* Joined */}
            <span style={{color:'var(--muted)',fontSize:12}}>{formatDate(u.createdAt)}</span>

            {/* Last login */}
            <span style={{color:'var(--muted)',fontSize:12}}>{formatTime(u.lastLogin)}</span>

            {/* Action */}
            <button
              onClick={() => toggle(u.id, u.isActive)}
              style={{padding:'6px 14px',background: u.isActive ? 'rgba(248,81,73,0.1)' : 'rgba(63,185,80,0.15)',color: u.isActive ? 'var(--danger)' : 'var(--success)',border: u.isActive ? '1px solid rgba(248,81,73,0.2)' : '1px solid rgba(63,185,80,0.3)',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
              {u.isActive ? '🔒 Lock' : '✅ Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
