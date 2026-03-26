.page { display:flex; flex-direction:column; gap:20px; }
.loading {
  min-height: 60vh; display:flex; align-items:center; justify-content:center;
  color: var(--muted); font-size: 16px;
}
.hero {
  display:grid; grid-template-columns: 1.6fr 0.9fr; gap:18px; align-items:stretch;
  padding: 24px; border-radius: 18px; border:1px solid var(--border);
  background:
    radial-gradient(circle at top right, rgba(0,212,255,0.14), transparent 30%),
    radial-gradient(circle at bottom left, rgba(124,58,237,0.18), transparent 30%),
    linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  animation: fadeUp .45s ease;
}
.kicker {
  display:inline-flex; padding:6px 12px; border-radius:999px; margin-bottom:14px;
  font-size:12px; letter-spacing:.08em; text-transform:uppercase;
  color: var(--accent); background: rgba(0,212,255,0.12); border:1px solid rgba(0,212,255,0.18);
}
.title { font-size: clamp(28px, 4vw, 42px); line-height:1.04; margin-bottom:16px; }
.scoreCard {
  background: rgba(13,17,23,.72); border:1px solid var(--border); border-radius: 16px;
  padding:18px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;
}
.scoreCard p { color: var(--muted); text-align:center; font-size:13px; }
.scoreRing {
  --score: 75%;
  width: 170px; height:170px; border-radius:50%; position:relative;
  background: conic-gradient(var(--accent) 0 var(--score), rgba(255,255,255,0.07) var(--score) 100%);
  display:grid; place-items:center;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.04) inset, 0 20px 40px rgba(0,0,0,0.22);
}
.scoreRing::before {
  content:''; position:absolute; inset:14px; border-radius:50%;
  background: linear-gradient(180deg, #0f1624, #121923); border:1px solid rgba(255,255,255,0.05);
}
.scoreRing > div { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; }
.scoreRing strong { font-size: 40px; font-family:'Syne', sans-serif; }
.scoreRing span { color: var(--muted); font-size: 12px; }
.breakdownList { display:grid; gap:10px; }
.breakdownItem {
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:12px 14px; border-radius:14px; border:1px solid rgba(255,255,255,0.06);
  background: rgba(8, 15, 25, 0.4);
}
.breakdownItem strong { display:block; font-size:14px; margin-bottom:4px; }
.breakdownItem span { color: var(--muted); font-size:12px; line-height:1.5; }
.breakdownScore {
  min-width:72px; text-align:center; font-weight:700; font-size:15px;
  padding:10px 12px; border-radius:12px; background: rgba(255,255,255,0.04);
}
.mainGrid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:16px; }
.bottomGrid { display:grid; grid-template-columns: 1fr; gap:16px; }
.progressSection { display:block; }
.chartCard, .insightsCard, .titlesCard { animation: fadeUp .65s ease; }
.cardHead { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:16px; }
.cardHead h3 { font-size: 20px; margin-bottom:6px; }
.cardHead p { color: var(--muted); font-size: 13px; }
.miniBadge {
  padding:6px 10px; border-radius:999px; border:1px solid var(--border);
  background: var(--surface2); font-size: 12px; color: var(--text);
}
.donutWrap { position:relative; width:100%; display:grid; place-items:center; margin:4px 0 18px; }
.donutSvg { width: 220px; height: 220px; filter: drop-shadow(0 12px 24px rgba(0,0,0,.22)); }
.donutCenter {
  position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;
  pointer-events:none;
}
.donutTotal { font-size: 36px; font-family:'Syne', sans-serif; }
.donutLabel { color: var(--muted); font-size: 13px; }
.legendList { display:flex; flex-direction:column; gap:10px; }
.legendItem {
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:10px 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.04);
}
.legendLeft, .legendRight { display:flex; align-items:center; gap:10px; }
.legendRight strong { font-size: 14px; }
.legendRight span { color: var(--muted); font-size: 12px; }
.legendDot { width:10px; height:10px; border-radius:50%; box-shadow:0 0 14px currentColor; }
.chartFooter {
  margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06);
}
.metricFooterBox {
  display:grid; place-items:center; gap:4px; text-align:center;
  min-height: 86px; border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  border:1px solid rgba(255,255,255,0.05);
}
.metricFooterBox span, .growthBox span { color: var(--muted); font-size: 12px; }
.metricFooterBox strong, .growthBox strong {
  font-size: 28px; font-family:'Syne', sans-serif;
}
.metricFooterBox small, .growthBox small { color: var(--muted); font-size: 12px; }
.barChart {
  height: 280px; display:grid; grid-template-columns: repeat(auto-fit, minmax(44px, 1fr)); gap:12px; align-items:end;
}
.barCol { height:100%; display:flex; flex-direction:column; align-items:center; gap:8px; }
.barValue { font-size: 12px; color: var(--muted); min-height: 18px; }
.barTrack {
  width:100%; flex:1; border-radius: 14px; border:1px solid rgba(255,255,255,0.05);
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  display:flex; align-items:flex-end; padding:6px;
}
.barFill { width:100%; border-radius:10px; min-height: 0; box-shadow: 0 10px 18px rgba(0,0,0,.18); animation: growUp .7s ease; }
.barLabel { font-size: 12px; color: var(--text); opacity:.9; }
.insightList { display:flex; flex-direction:column; gap:12px; }
.insightItem {
  display:grid; grid-template-columns: 38px 1fr; gap:12px; align-items:flex-start;
  padding:14px; border-radius:14px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  border:1px solid rgba(255,255,255,0.05);
}
.insightItem span {
  width:38px; height:38px; display:grid; place-items:center; border-radius:12px;
  background: rgba(0,212,255,0.1); font-size:18px;
}
.insightItem p { color: var(--text); line-height:1.6; font-size: 14px; }
.growthBox {
  margin-top: 16px; padding: 16px; border-radius: 16px;
  display:grid; gap:10px;
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  border:1px solid rgba(255,255,255,0.05);
}
.growthBox p { color: var(--text); font-size: 13px; line-height: 1.5; }
.titleList { display:flex; flex-direction:column; gap:10px; }
.titleGroup {
  border:1px solid rgba(255,255,255,0.05); border-radius:14px; overflow:hidden;
  background: rgba(255,255,255,0.02);
}
.titleRow {
  width:100%; background: transparent; border:none; color: inherit; cursor:pointer;
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:14px 16px; text-align:left;
}
.titleRow > div:first-child { min-width: 0; }
.titleRow > div:first-child strong, .titleRight strong { word-break: break-word; }
.titleRow > div:first-child span, .titleRight span { line-height: 1.45; }
.titleRow strong { display:block; font-size:15px; }
.titleRow span { color: var(--muted); font-size:12px; }
.titleRight {
  display:flex; align-items:center; gap:14px;
}
.titleRight > div { text-align:right; }
.chevron {
  font-size:14px; color: var(--accent); transition: transform .22s ease;
}
.chevronOpen { transform: rotate(180deg); }
.levelsPanel {
  display:flex; flex-direction:column; gap:8px; padding:0 14px 14px;
}
.levelRow {
  display:grid; grid-template-columns: 26px 1fr auto; gap:12px; align-items:center;
  padding:10px 12px; border-radius:12px; background: rgba(255,255,255,0.02);
  border:1px solid rgba(255,255,255,0.04);
}
.levelIcon { text-align:center; }
.levelMeta strong { display:block; font-size:14px; }
.levelMeta span { color: var(--muted); font-size:12px; }
.levelHint { font-size:12px; color: var(--accent); white-space:nowrap; }

@keyframes growUp {
  from { height: 0; opacity: .4; }
  to { opacity: 1; }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 1100px) {
  .mainGrid, .bottomGrid, .hero { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .page { gap: 16px; }
  .hero { padding: 18px; }
  .scoreCard { padding: 16px; }
  .mainGrid { grid-template-columns: 1fr; }
  .barChart { grid-template-columns: repeat(4, minmax(44px, 1fr)); }
  .cardHead { margin-bottom: 12px; }
  .cardHead h3 { font-size: 18px; }
  .titleRow {
    flex-direction: column;
    align-items: flex-start;
    padding: 14px;
  }
  .titleRight {
    width: 100%;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }
  .titleRight > div {
    text-align: left;
    min-width: 0;
    flex: 1;
  }
  .levelsPanel {
    padding: 0 10px 10px;
  }
  .levelRow {
    grid-template-columns: 22px 1fr;
    align-items: start;
  }
  .levelHint {
    grid-column: 2;
    white-space: normal;
    margin-top: 2px;
  }
  .donutSvg {
    width: 190px;
    height: 190px;
  }
}
