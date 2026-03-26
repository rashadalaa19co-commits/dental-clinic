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
    setLoading(true);
    const clinicsSnap = await getDocs(collection(db, 'clinics'));
    const list = await Promise.all(clinicsSnap.docs.map(async d => {
      const data = { id: d.id, ...d.data() };
      // Get patient count
      try {
        const patientsSnap = await getDocs(collection(db, 'clinics', d.id, 'patients'));
        data.realPatientCount = patientsSnap.size;
        // Count photos
        let photoCount = 0;
        patientsSnap.docs.forEach(p => {
          const photos = p.data().photos || [];
          photoCount += photos.length;
        });
        data.photoCount = photoCount;
      } catch(e) {
        data.realPatientCount = data.patientCount || 0;
        data.photoCount = 0;
      }
      return data;
    }));
    list.sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
    setUsers(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getDaysLeft = (ts) => {
    if (!ts) return null;
    const expiry = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getLastLogin = (ts) => {
    if (!ts) return 'Never';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((new Date() - d) / (1000 * 60));
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return `${Math.floor(diff/1440)}d ago`;
  };

  // Silver = lifetime (no expiry), isActive = true forever
  const activateSilver = async (uid) => {
    await updateDoc(doc(db, 'clinics', uid), {
      isActive: true,
      plan: 'silver',
      silverExpiry: null, // null = lifetime
    });
    load();
  };

  // Gold = 31 days only, silver stays forever
  const activateGold = async (uid) => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 31);
    await updateDoc(doc(db, 'clinics', uid), {
      isActive: true, // silver stays
      hasGallery: true,
      plan: 'gold',
      silverExpiry: null, // silver = lifetime
      goldExpiry: Timestamp.fromDate(expiry), // gold = 31 days
    });
    load();
  };

  // Renew gold 31 more days
  const renewGold = async (uid, currentExpiry) => {
    const base = currentExpiry ? (currentExpiry.toDate ? currentExpiry.toDate() : new Date(currentExpiry)) : new Date();
    if (base < new Date()) base.setTime(new Date().getTime()); // if expired, start from now
    base.setDate(base.getDate() + 31);
    await updateDoc(doc(db, 'clinics', uid), {
      hasGallery: true,
      plan: 'gold',
      goldExpiry: Timestamp.fromDate(base),
    });
    load();
  };

  // Remove gold only (silver stays)
  const removeGold = async (uid) => {
    await updateDoc(doc(db, 'clinics', uid), {
      hasGallery: false,
      plan: 'silver',
      goldExpiry: null,
    });
    load();
  };

  // Lock everything
  const lockAll = async (uid) => {
    if (!confirm('Lock this doctor completely? They will lose Silver too!')) return;
    await updateDoc(doc(db, 'clinics', uid), {
      isActive: false,
      hasGallery: false,
      plan: 'free',
      silverExpiry: null,
      goldExpiry: null,
    });
    load();
  };

  const filtered = users.filter(u =>
    !search ||
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (ts) => {
    if (!ts) return '♾️ Lifetime';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  };

  const total = users.length;
  const silver = users.filter(u => u.isActive && !u.hasGallery).length;
  const gold = users.filter(u => u.hasGallery).length;
  const free = users.filter(u => !u.isActive).length;

  return (
    <div className="pageEnter">
      <h1 style={{fontSize:26,fontWeight:800,marginBottom:4}}>👑 Admin Panel</h1>
      <p style={{color:'var(--muted)',fontSize:14,marginBottom:24}}>Manage subscriptions</p>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}}>
        {[
          { label:'Total', value:total, color:'var(--accent)', icon:'👥' },
          { label:'Free', value:free, color:'var(--muted)', icon:'🆓' },
          { label:'Silver', value:silver, color:'#94a3b8', icon:'🥈' },
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
      <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'8px 14px',marginBottom:16,maxWidth:320}}>
        <span style={{color:'var(--muted)'}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email..."
          style={{border:'none',background:'transparent',color:'var(--text)',outline:'none',fontSize:14,width:'100%'}}/>
      </div>

      {/* Table */}
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,overflow:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:1000}}>
          <thead>
            <tr style={{background:'var(--surface2)',fontSize:12,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.5px'}}>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Doctor</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Last Login</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Plan</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Patients</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Photos</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Silver</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Gold Expiry</th>
              <th style={{padding:'12px 16px',textAlign:'left'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{padding:24,textAlign:'center',color:'var(--muted)'}}>Loading...</td></tr>
            ) : filtered.map(u => {
              const goldDays = getDaysLeft(u.goldExpiry);
              const plan = u.plan || 'free';
              return (
                <tr key={u.id} style={{borderTop:'1px solid var(--border)',fontSize:14}}>
                  {/* Doctor */}
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
                        <div style={{fontSize:11,color:'var(--muted)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email || u.id.slice(0,16)+'...'}</div>
                      </div>
                    </div>
                  </td>

                  {/* Last Login */}
                  <td style={{padding:'14px 16px',fontSize:13,color:'var(--muted)'}}>
                    {getLastLogin(u.lastLogin)}
                  </td>

                  {/* Plan */}
                  <td style={{padding:'14px 16px'}}>
                    <span style={{padding:'4px 12px',borderRadius:20,fontSize:12,fontWeight:600,
                      background: plan==='gold'?'rgba(245,158,11,0.15)':plan==='silver'?'rgba(148,163,184,0.15)':'rgba(107,114,128,0.1)',
                      color: plan==='gold'?'#f59e0b':plan==='silver'?'#94a3b8':'var(--muted)'}}>
                      {plan==='gold'?'🥇 Gold':plan==='silver'?'🥈 Silver':'🆓 Free'}
                    </span>
                  </td>

                  {/* Patients */}
                  <td style={{padding:'14px 16px',fontWeight:600,color:'var(--accent)'}}>
                    {u.realPatientCount ?? u.patientCount ?? 0}
                  </td>

                  {/* Photos */}
                  <td style={{padding:'14px 16px',fontWeight:600,color:'var(--proth)'}}>
                    {u.photoCount || 0} 📸
                  </td>

                  {/* Silver */}
                  <td style={{padding:'14px 16px',fontSize:13}}>
                    {u.isActive ? (
                      <span style={{color:'var(--success)'}}>♾️ Lifetime</span>
                    ) : (
                      <span style={{color:'var(--muted)'}}>—</span>
                    )}
                  </td>

                  {/* Gold Expiry */}
                  <td style={{padding:'14px 16px',fontSize:13}}>
                    {u.hasGallery ? (
                      <span style={{color: goldDays !== null && goldDays < 7 ? 'var(--danger)' : '#f59e0b'}}>
                        {goldDays === null ? '—' : goldDays < 0 ? '❌ Expired' : `${goldDays} days left`}
                        <div style={{fontSize:11,color:'var(--muted)'}}>{formatDate(u.goldExpiry)}</div>
                      </span>
                    ) : (
                      <span style={{color:'var(--muted)'}}>—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{padding:'14px 16px'}}>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {!u.isActive && (
                        <button onClick={()=>activateSilver(u.id)}
                          style={{padding:'5px 10px',background:'rgba(148,163,184,0.15)',color:'#94a3b8',border:'1px solid rgba(148,163,184,0.3)',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                          🥈 Silver
                        </button>
                      )}
                      {u.isActive && !u.hasGallery && (
                        <button onClick={()=>activateGold(u.id)}
                          style={{padding:'5px 10px',background:'rgba(245,158,11,0.15)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                          🥇 +Gold
                        </button>
                      )}
                      {u.hasGallery && (
                        <>
                          <button onClick={()=>renewGold(u.id, u.goldExpiry)}
                            style={{padding:'5px 10px',background:'rgba(245,158,11,0.15)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.3)',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                            🔄 +31d
                          </button>
                          <button onClick={()=>removeGold(u.id)}
                            style={{padding:'5px 10px',background:'rgba(248,81,73,0.1)',color:'var(--danger)',border:'1px solid rgba(248,81,73,0.2)',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                            ✕ Gold
                          </button>
                        </>
                      )}
                      {u.isActive && (
                        <button onClick={()=>lockAll(u.id)}
                          style={{padding:'5px 10px',background:'rgba(107,114,128,0.1)',color:'var(--muted)',border:'1px solid var(--border)',borderRadius:6,fontSize:11,cursor:'pointer'}}>
                          🔒
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
