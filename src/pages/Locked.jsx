export default function Locked() {
  return (
    <div className="motionHero" style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
      <div className="motionCard motionCardDelay1" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:20,padding:'48px 40px',textAlign:'center',width:380,maxWidth:'90vw'}}>
        <div style={{fontSize:56,marginBottom:16}}>🔒</div>
        <h1 style={{fontSize:24,fontWeight:800,marginBottom:12}}>Free Trial Ended</h1>
        <p style={{color:'var(--muted)',fontSize:14,marginBottom:8}}>You have used your 7 free patients.</p>
        <p style={{color:'var(--muted)',fontSize:14,marginBottom:8}}>Contact us to unlock full access!</p>
        <a href="https://wa.me/01555354570" target="_blank"
          style={{display:'inline-flex',alignItems:'center',gap:8,marginTop:24,padding:'12px 24px',background:'var(--success)',color:'#000',borderRadius:'var(--radius-sm)',fontSize:15,fontWeight:600,textDecoration:'none'}}>
          📱 Contact on WhatsApp
        </a>
      </div>
    </div>
  );
}
