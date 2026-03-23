import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

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

  const getExpiry = (ts) => {
    if (!ts) return null;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d;
  };

  const getDaysLeft = (ts) => {
    if (!ts) return null;
    const expiry = getExpiry(ts);
    const diff = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const activateSilver = async (uid, months = 1) => {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);
    await updateDoc(doc(db, 'clinics', uid), {
      isActive: true,
      plan: 'silver',
      silverExpiry: Timestamp.fromDate(expiry),
    });
    load();
  };

  const activateGold = async (uid, months = 1) => {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);
    await updateDoc(doc(db, 'clinics', uid), {
      isActive: true,
      hasGallery: true,
      plan: 'gold',
      goldExpiry: Timestamp.fromDate(expiry),
      silverExpiry: Timestamp.fromDate(expiry),
    });
    load();
  };

  const activateSilverLifetime = async (uid) => {
    await updateDoc(doc(db, 'clinics', uid), {
      isActive: true,
      plan: 'silver',
      silverExpiry: null,
    });
    load();
  };

  const lock = async (uid) => {
    await updateDoc(doc(db, 'clinics', uid), {
      isActive: false,
      hasGallery: false,
      plan: 'free',
    });
    load();
  };

  const filtered = users.filter(u =>
    !search ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (ts) => {
    if (!ts) return 'Lifetime';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  };

  const active = users.filter(u => u.isActive).length;
  const gold = users.filter(u => u.hasGallery).length;
  const total = users.length;

  return (
    <div>
      <h1 style={{fontSize:26,fontWeight:800,marginBottom:4}}>👑 Admin Panel</h1>
      <p style={{color:'var(--muted)',fontSize:14,marginBottom:24}}>Manage subscriptions</p>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        {[
          { label:'Total', value:total, color:'var(--accent)', icon:'👥' },
          { label:'Free', value:total-active, color:'var(--muted)', icon:'🆓' },
          { label:'Silver', value:active-gold, color:'#94a3b8', icon:'🥈' },
          { label:'Gold', value:gold, color:'#f59e0b', icon:'🥇' },
        ].map(s => (
          <div key={s.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'16px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontSize:24}}>{s.icon}</div>
            <div>
              <div style={{fontSize:26,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{s.label}</div>
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
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:900}}>
          <thead>
            <tr style={{background:'var(--surface2)',fontSize:12,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.5px'}}>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Doctor</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Plan</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Patients</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Silver Expiry</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Gold Expiry</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{padding:24,textAlign:'center',color:'var(--muted)'}}>Loading...</td></tr>
            ) : filtered.map(u => {
              const silverDays = getDaysLeft(u.silverExpiry);
              const goldDays = getDaysLeft(u.goldExpiry);
              const plan = u.plan || 'free';
              return (
                <tr key={u.id} style={{borderTop:'1px solid var(--border)',fontSize:14}}>
                  <td style={{padding:'14px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" style={{width:36,height:36,borderRadius:'50%',objectFit:'cover'}}/>
                      ) : (
                        <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(0,212,255,0.15)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>
                          {u.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <div style={{fontWeight:600}}>{u.displayName || 'Unknown'}</div>
                        <div style={{fontSize:11,color:'var(--muted)'}}>{u.email || u.id.slice(0,16)+'...'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:'14px 16px'}}>
                    <span style={{padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:600,
                      background: plan==='gold' ? 'rgba(245,158,11,0.15)' : plan==='silver' ? 'rgba(148,163,184,0.15)' : 'rgba(107,114,128,0.1)',
                      color: plan==='gold' ? '#f59e0b' : plan==='silver' ? '#94a3b8' : 'var(--muted)'}}>
                      {plan==='gold'?'🥇 Gold':plan==='silver'?'🥈 Silver':'🆓 Free'}
                    </span>
                  </td>
                  <td style={{padding:'14px 16px',color:'var(--accent)',fontWeight:600}}>{u.patientCount||0}</td>
                  <td style={{padding:'14px 16px',fontSize:13}}>
                    {u.isActive ? (
                      <span style={{color: silverDays === null ? 'var(--success)' : silverDays < 7 ? 'var(--danger)' : 'var(--muted)'}}>
                        {silverDays === null ? '♾️ Lifetime' : silverDays < 0 ? '❌ Expired' : `${silverDays} days left`}
                      </span>
                    ) : <span style={{color:'var(--muted)'}}>—</span>}
                  </td>
                  <td style={{padding:'14px 16px',fontSize:13}}>
                    {u.hasGallery ? (
                      <span style={{color: goldDays < 7 ? 'var(--danger)' : '#f59e0b'}}>
                        {goldDays < 0 ? '❌ Expired' : `${goldDays} days left`}
                      </span>
                    ) : <span style={{color:'var(--muted)'}}>—</span>}
                  </td>
                  <td style={{padding:'14px 16px'}}>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {!u.isActive && (
                        <button onClick={()=>activateSilverLifetime(u.id)}
                          style={{padding:'5px 10px',background:'rgba(148,163,184,0.15)',color:'#94a3b8',border:'1px solid rgba(148,163,184,0.3)',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                          🥈 Silver (Lifetime)
                        </button>
                      )}
                      {u.isActive && !u.hasGallery && (
                        <button onClick={()=>activateGold(u.id,1)}
                          style={{padding:'5px 10px',background:'rgba(245,158,11,0.15)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                          🥇 +Gold 1mo
                        </button>
                      )}
                      {u.hasGallery && (
                        <button onClick={()=>activateGold(u.id,1)}
                          style={{padding:'5px 10px',background:'rgba(245,158,11,0.15)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                          🔄 Renew Gold
                        </button>
                      )}
                      {u.isActive && (
                        <button onClick={()=>lock(u.id)}
                          style={{padding:'5px 10px',background:'rgba(248,81,73,0.1)',color:'var(--danger)',border:'1px solid rgba(248,81,73,0.2)',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                          🔒 Lock
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
