/* app.jsx — root: access gate, routing, tweaks, mount. */
const { useState: useStateA, useEffect: useEffectA } = React;
const SPARK_A = "\u2726";

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "homeLayout": "editorial",
  "primary": "green",
  "fontScale": 100,
  "showGate": true
}/*EDITMODE-END*/;

/* ───────── access gate ───────── */
function Gate({ onEnter }){
  const [email, setEmail] = useStateA("");
  return (
    <div style={{ height:"100vh", display:"grid", gridTemplateColumns:"1fr 1fr" }} className="gate-grid">
      {/* left: brand panel */}
      <div className="gate-brand" style={{ background:"var(--sage-deep)", color:"var(--cream)", padding:"56px 60px",
        display:"flex", flexDirection:"column", justifyContent:"space-between", position:"relative", overflow:"hidden" }}>
        <Logo mono/>
        <div>
          <div className="mono" style={{ color:"var(--rose)", marginBottom:18, opacity:.95 }}>{SPARK_A} PRIVATE CUSTOMER WORKSPACE</div>
          <h1 style={{ color:"var(--cream)", fontSize:"clamp(32px,3.4vw,46px)", lineHeight:1.05, letterSpacing:"-.02em", marginBottom:18 }}>
            Everything you need to DIY like a pro — <span style={{ fontStyle:"italic" }}>without the overwhelm.</span>
          </h1>
          <p style={{ color:"rgba(247,246,240,.8)", fontSize:16.5, lineHeight:1.6, maxWidth:440 }}>
            Your calm, step-by-step planner for the big day. Timelines, tutorials, recipes, checklists, and a place for every note — all in one private space.
          </p>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 12px", color:"rgba(247,246,240,.7)", fontFamily:"var(--serif)", fontStyle:"italic", fontSize:15 }}>
          {["No wilted flowers","No stress","No surprises"].map((t,i)=>(
            <React.Fragment key={i}>{i>0 && <span style={{color:"var(--rose)",fontStyle:"normal"}}>{SPARK_A}</span>}<span>{t}</span></React.Fragment>
          ))}
        </div>
      </div>
      {/* right: enter */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"40px" }}>
        <div style={{ width:"100%", maxWidth:380 }}>
          <h2 style={{ fontSize:30, marginBottom:8 }}>Welcome back, friend.</h2>
          <p style={{ fontSize:15.5, color:"var(--ink-soft)", lineHeight:1.55, marginBottom:30 }}>
            This workspace is included with your Bloom Culture flower order. Pop in the email from your purchase — or just tap below to take a look around.
          </p>
          <label className="mono" style={{ fontSize:10, color:"var(--ink-faint)", display:"block", marginBottom:8 }}>EMAIL ADDRESS <span style={{ color:"var(--ink-faint)", opacity:.7 }}>(optional for now)</span></label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"
            onKeyDown={e=>{ if(e.key==="Enter") onEnter(); }}
            style={{ width:"100%", padding:"14px 16px", borderRadius:"var(--radius-sm)", border:"1.5px solid var(--line-strong)",
              fontSize:15, background:"var(--paper)", color:"var(--ink)", outline:"none", marginBottom:16 }}
            onFocus={e=>e.target.style.borderColor="var(--accent)"} onBlur={e=>e.target.style.borderColor="var(--line-strong)"}/>
          <Btn onClick={onEnter} icon="arrow" style={{ width:"100%", justifyContent:"center", padding:"15px" }}>Enter my workspace</Btn>
          <p style={{ fontSize:12.5, color:"var(--ink-faint)", textAlign:"center", marginTop:18, lineHeight:1.5 }}>
            No email needed to look around — just tap <strong>Enter my workspace</strong> to start exploring. 🌸
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────── App ───────── */
function App(){
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [entered, setEntered] = useLocal("entered", false);
  const [view, setView] = useStateA("home");
  const [menuOpen, setMenuOpen] = useStateA(false);
  const progress = useAllProgress();

  /* apply primary-accent + font-scale tweaks to :root */
  useEffectA(() => {
    const r = document.documentElement.style;
    if(t.primary === "rose"){
      r.setProperty("--accent", "var(--rose)");
      r.setProperty("--accent-deep", "var(--rose-deep)");
      r.setProperty("--accent-tint", "var(--rose-tint)");
    } else {
      r.setProperty("--accent", "var(--sage)");
      r.setProperty("--accent-deep", "var(--sage-deep)");
      r.setProperty("--accent-tint", "var(--sage-tint)");
    }
  }, [t.primary]);
  useEffectA(() => {
    document.documentElement.style.fontSize = (16 * (t.fontScale/100)) + "px";
  }, [t.fontScale]);

  const go = (v) => { setView(v); setMenuOpen(false); try { history.pushState({ bcView: v }, ""); } catch(e){} };

  /* phone/browser back button navigates within the app instead of leaving */
  useEffectA(() => {
    const onPop = (e) => {
      const v = (e.state && e.state.bcView) || "home";
      setView(v); setMenuOpen(false);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const showGate = t.showGate && !entered && !window.BC_CUSTOMER;

  const curLabel = view === "home" ? "Start Here" : (window.BC.byId[view] ? window.BC.byId[view].nav : "");

  return (
    <React.Fragment>
      {showGate ? (
        <Gate onEnter={() => setEntered(true)} />
      ) : (
        <div className={"app-shell" + (menuOpen ? " menu-open" : "")} style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
          {/* mobile top bar (hidden on desktop via CSS) */}
          <div className="mobile-bar no-print">
            <button onClick={() => setMenuOpen(o => !o)} aria-label="Menu"
              style={{ width:40, height:40, borderRadius:10, display:"grid", placeItems:"center", background:"var(--cream-deep)", color:"var(--ink)", flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
            <span style={{ fontFamily:"var(--serif)", fontSize:18, fontWeight:600, flex:1, minWidth:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{curLabel}</span>
            <button onClick={() => go("home")} aria-label="Home"
              style={{ width:40, height:40, borderRadius:10, display:"grid", placeItems:"center", background:"transparent", color:"var(--sage-deep)", flexShrink:0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9.5h12V10"/></svg>
            </button>
          </div>

          <div className="sidebar-scrim no-print" onClick={() => setMenuOpen(false)} />
          <Sidebar view={view} go={go} progress={progress} />
          <main style={{ flex:1, minWidth:0, height:"100vh", overflow:"hidden", background:"var(--cream)" }}>
            {view === "home"
              ? <div className="content-scroll" style={{ height:"100vh", overflowY:"auto" }}>
                  <Home layout="editorial" go={go} progress={progress} />
                  <ClosingBand progress={progress} go={go} />
                </div>
              : <ModulePage m={window.BC.byId[view]} go={go} progress={progress} />}
          </main>
        </div>
      )}

      {/* Tweaks panel */}
      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio label="Primary accent" value={t.primary}
          options={["green","rose"]}
          onChange={v => setTweak("primary", v)} />
        <TweakSlider label="Text size" value={t.fontScale} min={90} max={115} step={5} unit="%"
          onChange={v => setTweak("fontScale", v)} />
        <TweakSection label="Access" />
        <TweakToggle label="Show login gate" value={t.showGate}
          onChange={v => setTweak("showGate", v)} />
        <TweakButton label="Reset progress & notes" onClick={() => {
          if(confirm("Clear all checklists, notes, and saved date? This can't be undone.")){
            Object.keys(localStorage).filter(k=>k.startsWith("bcf.v1.")).forEach(k=>localStorage.removeItem(k));
            window.dispatchEvent(new Event("bcf-progress"));
            location.reload();
          }
        }} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
