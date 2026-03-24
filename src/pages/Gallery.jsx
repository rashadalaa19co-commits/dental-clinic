import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getPatients, updatePatient, checkAccess } from '../services/db';

const CLOUD_NAME = 'dvpbbawh2';
const UPLOAD_PRESET = 'ntjnefxv';

export default function Gallery() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getPatients(user.uid), checkAccess(user.uid)])
      .then(([p, acc]) => { setPatients(p); setAccess(acc); })
      .finally(() => setLoading(false));
  }, [user]);

  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('cloud_name', CLOUD_NAME);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST', body: formData
    });
    const data = await res.json();
    return data.secure_url;
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !selectedPatient) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadToCloudinary));
      const current = selectedPatient.photos || [];
      const updated = { ...selectedPatient, photos: [...current, ...urls] };
      await updatePatient(user.uid, selectedPatient.id, updated);
      const refreshed = await getPatients(user.uid);
      setPatients(refreshed);
      setSelectedPatient(refreshed.find(p => p.id === selectedPatient.id));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (patient, idx) => {
    if (!confirm('Delete this photo?')) return;
    const current = [...(patient.photos || [])];
    current.splice(idx, 1);
    await updatePatient(user.uid, patient.id, { ...patient, photos: current });
    const refreshed = await getPatients(user.uid);
    setPatients(refreshed);
    if (selectedPatient?.id === patient.id) {
      setSelectedPatient(refreshed.find(p => p.id === patient.id));
    }
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',color:'var(--muted)'}}>Loading...</div>;

  // Locked screen
  if (!access?.hasGallery) {
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'70vh',gap:16,textAlign:'center',padding:'0 20px'}}>
        <div style={{fontSize:64}}>📸</div>
        <div style={{background:'linear-gradient(135deg,#f59e0b,#f97316)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',fontSize:28,fontWeight:800}}>
          Gold Plan Feature
        </div>
        <p style={{color:'var(--muted)',fontSize:16,maxWidth:400}}>
          Upgrade to Gold to unlock the Gallery — upload unlimited patient photos directly to the app!
        </p>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'24px 32px',maxWidth:380,width:'100%'}}>
          <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>🥇 Gold Plan</div>
          <div style={{fontSize:28,fontWeight:800,color:'#f59e0b',marginBottom:4}}>150 EGP<span style={{fontSize:14,color:'var(--muted)'}}>/month</span></div>
          <div style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>Unlimited patients + Gallery + Photos</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <a href="https://wa.me/201010562664" target="_blank"
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',background:'#25D366',color:'white',borderRadius:10,textDecoration:'none',fontWeight:600,fontSize:14}}>
              📱 WhatsApp to Subscribe
            </a>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div style={{background:'var(--surface2)',borderRadius:10,padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:11,color:'var(--muted)'}}>Vodafone Cash</div>
                <div style={{fontSize:14,fontWeight:600,marginTop:2}}>01010562664</div>
              </div>
              <div style={{background:'var(--surface2)',borderRadius:10,padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:11,color:'var(--muted)'}}>InstaPay</div>
                <div style={{fontSize:14,fontWeight:600,marginTop:2}}>01010562664</div>
              </div>
            </div>
          </div>
        </div>
        {!access?.isActive && (
          <div style={{marginTop:8,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 32px',maxWidth:380,width:'100%'}}>
            <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>🥈 Silver Plan — First step</div>
            <div style={{fontSize:22,fontWeight:800,color:'var(--accent)',marginBottom:4}}>800 EGP<span style={{fontSize:13,color:'var(--muted)'}}> one-time</span></div>
            <div style={{fontSize:12,color:'#f59e0b',marginBottom:4}}>🎉 First 10 doctors: 400 EGP only!</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>Unlimited patients + Appointments</div>
            <a href="https://wa.me/201010562664" target="_blank"
              style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px',background:'var(--accent)',color:'#000',borderRadius:10,textDecoration:'none',fontWeight:600,fontSize:14}}>
              📱 Subscribe Now
            </a>
          </div>
        )}
      </div>
    );
  }

  const patientsWithPhotos = patients.filter(p => (p.photos||[]).length > 0);
  const filtered = patients.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:800}}>📸 Gallery</h1>
          <p style={{color:'var(--muted)',fontSize:14,marginTop:4}}>{patientsWithPhotos.length} patients with photos · {patientsWithPhotos.reduce((a,p)=>a+(p.photos||[]).length,0)} total photos</p>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:20}}>
        {/* Left: Patient list */}
        <div>
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:16}}>
            <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',marginBottom:12}}>
              <span style={{color:'var(--muted)'}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patients..." style={{border:'none',background:'transparent',color:'var(--text)',outline:'none',fontSize:14,width:'100%'}}/>
            </div>
            <div style={{maxHeight:'70vh',overflowY:'auto'}}>
              {filtered.map(p => (
                <div key={p.id} onClick={()=>setSelectedPatient(p)}
                  style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,cursor:'pointer',marginBottom:4,background: selectedPatient?.id===p.id ? 'rgba(0,212,255,0.1)' : 'transparent',border: selectedPatient?.id===p.id ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',transition:'all 0.15s'}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(0,212,255,0.15)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0}}>
                    {p.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                    <div style={{fontSize:12,color:'var(--muted)'}}>{(p.photos||[]).length} photos</div>
                  </div>
                  {(p.photos||[]).length > 0 && (
                    <div style={{width:32,height:32,borderRadius:6,overflow:'hidden',flexShrink:0}}>
                      <img src={p.photos[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Photos grid */}
        <div>
          {!selectedPatient ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'60vh',color:'var(--muted)',gap:12}}>
              <div style={{fontSize:48}}>👈</div>
              <p style={{fontSize:16}}>Select a patient to view or add photos</p>
            </div>
          ) : (
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
                <div>
                  <h2 style={{fontSize:20,fontWeight:700}}>{selectedPatient.name}</h2>
                  <p style={{color:'var(--muted)',fontSize:13}}>{(selectedPatient.photos||[]).length} photos · {selectedPatient.procedure||'-'}</p>
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} style={{display:'none'}}/>
                  <button onClick={()=>fileRef.current.click()} disabled={uploading}
                    style={{padding:'9px 20px',background:'var(--accent)',color:'#000',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',opacity: uploading ? 0.6 : 1}}>
                    {uploading ? '⏳ Uploading...' : '📤 Upload Photos'}
                  </button>
                </div>
              </div>

              {(selectedPatient.photos||[]).length === 0 ? (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'40vh',color:'var(--muted)',gap:12,background:'var(--surface)',borderRadius:12,border:'2px dashed var(--border)'}}>
                  <div style={{fontSize:48}}>📷</div>
                  <p style={{fontSize:16}}>No photos yet</p>
                  <button onClick={()=>fileRef.current.click()}
                    style={{padding:'10px 24px',background:'var(--accent)',color:'#000',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer'}}>
                    Upload First Photo
                  </button>
                </div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:12}}>
                  {(selectedPatient.photos||[]).map((url,i) => (
                    <div key={i} style={{position:'relative',borderRadius:10,overflow:'hidden',border:'1px solid var(--border)',aspectRatio:'1',cursor:'pointer'}}
                      onClick={()=>setLightbox({url,patient:selectedPatient,idx:i})}>
                      <img src={url} alt={'Photo '+(i+1)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0)',transition:'background 0.2s'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.3)'}
                        onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0)'}>
                      </div>
                      <button onClick={e=>{e.stopPropagation();handleDeletePhoto(selectedPatient,i);}}
                        style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.7)',color:'white',border:'none',borderRadius:'50%',width:26,height:26,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        X
                      </button>
                    </div>
                  ))}
                  {/* Upload more */}
                  <div onClick={()=>fileRef.current.click()} style={{borderRadius:10,border:'2px dashed var(--border)',aspectRatio:'1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--muted)',gap:8,transition:'border-color 0.2s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                    <div style={{fontSize:28}}>+</div>
                    <div style={{fontSize:12}}>Add Photo</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={()=>setLightbox(null)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
          <img src={lightbox.url} alt="" style={{maxWidth:'90vw',maxHeight:'90vh',objectFit:'contain',borderRadius:8}}/>
          <button onClick={()=>setLightbox(null)}
            style={{position:'absolute',top:20,right:20,background:'rgba(255,255,255,0.2)',color:'white',border:'none',borderRadius:'50%',width:40,height:40,fontSize:20,cursor:'pointer'}}>
            X
          </button>
        </div>
      )}
    </div>
  );
}
