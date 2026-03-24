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
  const [uploadingId, setUploadingId] = useState(null);
  const fileRef = useRef(null);
  const fileRefs = useRef({});

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
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST', body: formData
    });
    const data = await res.json();
    return data.secure_url;
  };

  const handleUpload = async (e, patient) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingId(patient.id);
    try {
      const urls = await Promise.all(files.map(uploadToCloudinary));
      const current = patient.photos || [];
      const updated = { ...patient, photos: [...current, ...urls] };
      await updatePatient(user.uid, patient.id, updated);
      const refreshed = await getPatients(user.uid);
      setPatients(refreshed);
      if (selectedPatient?.id === patient.id) {
        setSelectedPatient(refreshed.find(p => p.id === patient.id));
      }
    } finally {
      setUploadingId(null);
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
      setSelectedPatient(refreshed.find(p => p.id === patient.id) || null);
    }
  };

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',color:'var(--muted)'}}>Loading...</div>;

  // Locked screen
  if (!access?.hasGallery) {
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'70vh',gap:16,textAlign:'center',padding:'20px'}}>
        <div style={{fontSize:64}}>📸</div>
        <div style={{fontSize:28,fontWeight:800,background:'linear-gradient(135deg,#f59e0b,#f97316)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          Gold Plan Feature
        </div>
        <p style={{color:'var(--muted)',fontSize:15,maxWidth:400}}>
          Upgrade to Gold to unlock the Gallery and upload unlimited patient photos!
        </p>
        <div style={{background:'var(--surface)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:16,padding:'24px 32px',maxWidth:380,width:'100%'}}>
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
      </div>
    );
  }

  const patientsWithPhotos = patients.filter(p => (p.photos||[]).length > 0);
  const allPatients = patients.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPhotos = patientsWithPhotos.reduce((a,p) => a + (p.photos||[]).length, 0);

  // If patient selected — show full view
  if (selectedPatient) {
    const p = patients.find(x => x.id === selectedPatient.id) || selectedPatient;
    return (
      <div>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24,flexWrap:'wrap'}}>
          <button onClick={()=>setSelectedPatient(null)}
            style={{padding:'8px 16px',background:'transparent',border:'1px solid var(--border)',color:'var(--muted)',borderRadius:8,fontSize:14,cursor:'pointer'}}>
            ← Back
          </button>
          <div style={{flex:1}}>
            <h2 style={{fontSize:22,fontWeight:800}}>{p.name}</h2>
            <p style={{color:'var(--muted)',fontSize:13}}>{(p.photos||[]).length} photos · {p.procedure||'-'}</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={e=>handleUpload(e,p)} style={{display:'none'}}/>
          <button onClick={()=>fileRef.current.click()} disabled={uploadingId===p.id}
            style={{padding:'9px 20px',background:'var(--accent)',color:'#000',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',opacity:uploadingId===p.id?0.6:1}}>
            {uploadingId===p.id ? '⏳ Uploading...' : '📤 Upload Photos'}
          </button>
        </div>

        {(p.photos||[]).length === 0 ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'40vh',color:'var(--muted)',gap:12,background:'var(--surface)',borderRadius:12,border:'2px dashed var(--border)'}}>
            <div style={{fontSize:48}}>📷</div>
            <p style={{fontSize:16}}>No photos yet</p>
            <button onClick={()=>fileRef.current.click()}
              style={{padding:'10px 24px',background:'var(--accent)',color:'#000',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer'}}>
              Upload First Photo
            </button>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:14}}>
            {(p.photos||[]).map((url,i) => (
              <div key={i} style={{position:'relative',borderRadius:12,overflow:'hidden',border:'1px solid var(--border)',aspectRatio:'1',cursor:'pointer',background:'var(--surface2)'}}
                onClick={()=>setLightbox({url,patient:p,idx:i})}>
                <img src={url} alt={'Photo '+(i+1)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0)',transition:'background 0.2s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(0,0,0,0.3)'}
                  onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0)'}/>
                <button onClick={e=>{e.stopPropagation();handleDeletePhoto(p,i);}}
                  style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.7)',color:'white',border:'none',borderRadius:'50%',width:28,height:28,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  X
                </button>
              </div>
            ))}
            <div onClick={()=>fileRef.current.click()}
              style={{borderRadius:12,border:'2px dashed var(--border)',aspectRatio:'1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--muted)',gap:8,transition:'all 0.2s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.color='var(--accent)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--muted)';}}>
              <div style={{fontSize:32}}>+</div>
              <div style={{fontSize:13}}>Add Photo</div>
            </div>
          </div>
        )}

        {lightbox && (
          <div onClick={()=>setLightbox(null)}
            style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}>
            <img src={lightbox.url} alt="" style={{maxWidth:'90vw',maxHeight:'90vh',objectFit:'contain',borderRadius:8}}/>
            <button onClick={()=>setLightbox(null)}
              style={{position:'absolute',top:20,right:20,background:'rgba(255,255,255,0.15)',color:'white',border:'none',borderRadius:'50%',width:44,height:44,fontSize:22,cursor:'pointer'}}>
              X
            </button>
          </div>
        )}
      </div>
    );
  }

  // Main gallery grid view
  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:800}}>📸 Gallery</h1>
          <p style={{color:'var(--muted)',fontSize:14,marginTop:4}}>
            {patientsWithPhotos.length} patients · {totalPhotos} photos
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={{display:'flex',alignItems:'center',gap:8,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 16px',marginBottom:24,maxWidth:360}}>
        <span style={{color:'var(--muted)',fontSize:16}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search patients..."
          style={{border:'none',background:'transparent',color:'var(--text)',outline:'none',fontSize:14,width:'100%'}}/>
      </div>

      {/* Patients with photos */}
      {patientsWithPhotos.length > 0 && !search && (
        <div style={{marginBottom:32}}>
          <h3 style={{fontSize:13,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:14}}>
            📷 Patients with Photos
          </h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',gap:16}}>
            {patientsWithPhotos.map(p => (
              <PatientCard key={p.id} p={p} onSelect={setSelectedPatient} onUpload={handleUpload} uploadingId={uploadingId} fileRefs={fileRefs}/>
            ))}
          </div>
        </div>
      )}


  );
}

function PatientCard({ p, onSelect, onUpload, uploadingId, fileRefs }) {
  const photos = p.photos || [];
  return (
    <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden',transition:'border-color 0.2s,transform 0.2s',cursor:'pointer'}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,212,255,0.4)';e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)';}}>

      {/* Photo preview grid */}
      <div onClick={()=>onSelect(p)} style={{aspectRatio:'16/9',background:'var(--surface2)',position:'relative',overflow:'hidden'}}>
        {photos.length === 0 ? (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',flexDirection:'column',gap:8,color:'var(--muted)'}}>
            <div style={{fontSize:32}}>📷</div>
            <div style={{fontSize:12}}>No photos</div>
          </div>
        ) : photos.length === 1 ? (
          <img src={photos[0]} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',height:'100%',gap:1}}>
            {photos.slice(0,4).map((url,i) => (
              <div key={i} style={{overflow:'hidden',position:'relative'}}>
                <img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                {i === 3 && photos.length > 4 && (
                  <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:18,fontWeight:700}}>
                    +{photos.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Patient info + upload button */}
      <div style={{padding:'12px 14px',display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:34,height:34,borderRadius:'50%',background:'rgba(0,212,255,0.15)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,flexShrink:0}}>
          {p.name?.[0]?.toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}} onClick={()=>onSelect(p)}>
          <div style={{fontSize:14,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
          <div style={{fontSize:12,color:'var(--muted)'}}>{photos.length} photo{photos.length!==1?'s':''} · {p.procedure||'-'}</div>
        </div>
        <div>
          <input type="file" accept="image/*" multiple
            ref={el => fileRefs.current[p.id] = el}
            onChange={e=>onUpload(e,p)} style={{display:'none'}}/>
          <button onClick={e=>{e.stopPropagation();fileRefs.current[p.id]?.click();}}
            disabled={uploadingId===p.id}
            style={{padding:'5px 10px',background:'rgba(0,212,255,0.1)',color:'var(--accent)',border:'1px solid rgba(0,212,255,0.3)',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',opacity:uploadingId===p.id?0.5:1,whiteSpace:'nowrap'}}>
            {uploadingId===p.id ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
  );
}
