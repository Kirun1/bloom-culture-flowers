/* module.jsx, module page template. */
const { useState: useStateM, useEffect: useEffectM, useRef: useRefM } = React;
const SPARK_M = "\u2726";

/* ── wedding-date helpers (timeline date-awareness) ── */
function bcWeddingDate() {
  const s = typeof lsGet === "function" ? lsGet("weddingDate", "") : "";
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d) ? null : d;
}
function bcDaysUntilWedding() {
  const wd = bcWeddingDate();
  if (!wd) return null;
  return Math.ceil((wd - new Date(new Date().toDateString())) / 86400000);
}
/* wedding assumed Saturday; offsets for the day-by-day cards */
function bcDayDate(dayName) {
  const wd = bcWeddingDate();
  if (!wd) return null;
  const offsets = { wednesday: -3, thursday: -2, friday: -1, saturday: 0 };
  const off = offsets[(dayName || "").toLowerCase()];
  if (off === undefined) return null;
  const d = new Date(wd);
  d.setDate(d.getDate() + off);
  return d;
}
function bcFmt(d) {
  return d ? d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "";
}
function bcFmtShort(d) {
  return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
}
/* build calendar links (Google + downloadable .ics) for an all-day reminder */
function bcCalLinks(dateObj, title, details) {
  if (!dateObj) return null;
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const next = new Date(dateObj.getTime() + 86400000);
  const ny = next.getFullYear(),nm = String(next.getMonth() + 1).padStart(2, "0"),nd = String(next.getDate()).padStart(2, "0");
  const startD = `${y}${m}${dd}`,endD = `${ny}${nm}${nd}`;
  const desc = (details || "").replace(/\n/g, " ");
  const google = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&text=" + encodeURIComponent(title) +
  "&dates=" + startD + "/" + endD +
  "&details=" + encodeURIComponent(desc);
  const ics = "data:text/calendar;charset=utf-8," + encodeURIComponent(
    ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bloom Culture//Flower Planner//EN", "BEGIN:VEVENT",
    "DTSTART;VALUE=DATE:" + startD, "DTEND;VALUE=DATE:" + endD,
    "SUMMARY:" + title, "DESCRIPTION:" + desc, "END:VEVENT", "END:VCALENDAR"].join("\r\n"));
  return { google, ics };
}
/* a label like "roughly Mar – May" for a months/weeks-out phase range */
function bcRangeLabel(range) {
  const wd = bcWeddingDate();
  if (!wd || !range) return null;
  const mk = (n, unit) => {
    const d = new Date(wd);
    if (unit === "months") d.setMonth(d.getMonth() - n);else
    d.setDate(d.getDate() - n * 7);
    return d;
  };
  const from = mk(range.from, range.type);
  const to = mk(range.to, range.type);
  return bcFmtShort(from) + " – " + bcFmtShort(to);
}
/* is today within this phase's window? */
function bcPhaseCurrent(range) {
  const days = bcDaysUntilWedding();
  if (days == null || !range || days < 0) return false;
  const toDays = range.type === "months" ? range.to * 30.44 : range.to * 7;
  const fromDays = range.type === "months" ? range.from * 30.44 : range.from * 7;
  return days <= fromDays && days >= toDays - (range.type === "months" ? 15 : 4);
}
/* a sensible reminder date for the START of a phase window (wedding date minus range.from) */
function bcPhaseStartDate(range) {
  const wd = bcWeddingDate();
  if (!wd || !range) return null;
  const d = new Date(wd);
  if (range.type === "months") d.setMonth(d.getMonth() - range.from);else
  d.setDate(d.getDate() - range.from * 7);
  return d;
}

/* ── print just one element (a worksheet), not the whole module ── */
function printOnlyEl(el) {
  if (!el) return;
  el.classList.add("print-only-target");
  document.body.classList.add("print-only");
  const cleanup = () => {
    el.classList.remove("print-only-target");
    document.body.classList.remove("print-only");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  setTimeout(() => window.print(), 40);
}

/* ── build a clean printable booklet from module content data ── */
function bcEsc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function bcModulePrintHTML(m) {
  let h = `<section class="pm">`;
  h += `<div style="font-family:var(--mono);text-transform:uppercase;letter-spacing:.15em;font-size:10px;color:#aa2138;font-weight:600;margin-bottom:6px;">✦ Module ${bcEsc(m.num)}</div>`;
  h += `<h2 style="font-family:var(--serif);font-size:30px;color:#2b3c2c;margin:0 0 4px;">${bcEsc(m.label)}</h2>`;
  if (m.kicker) h += `<div style="font-family:var(--serif);font-style:italic;font-size:16px;color:#5d685a;margin-bottom:14px;">${bcEsc(m.kicker)}</div>`;
  if (m.intro) h += `<p style="font-size:14px;line-height:1.6;color:#2c352a;margin:0 0 16px;max-width:680px;">${bcEsc(m.intro)}</p>`;
  if (m.quick && m.quick.length) {
    h += `<div style="background:#e7ece3;border-radius:12px;padding:16px 20px;margin-bottom:18px;"><div style="font-family:var(--mono);text-transform:uppercase;letter-spacing:.14em;font-size:10px;color:#384d39;font-weight:600;margin-bottom:10px;">The quick version</div><ul style="margin:0;padding-left:18px;">`;
    m.quick.forEach((q) => h += `<li style="font-size:13.5px;line-height:1.55;color:#2c352a;margin-bottom:6px;">${bcEsc(q)}</li>`);
    h += `</ul></div>`;
  }
  if (m.steps && m.steps.length) {
    h += `<h3 style="font-family:var(--serif);font-size:19px;color:#2b3c2c;margin:18px 0 10px;">Step by step</h3><ol style="margin:0;padding-left:20px;">`;
    m.steps.forEach((s) => h += `<li style="font-size:13.5px;line-height:1.55;color:#2c352a;margin-bottom:9px;"><strong>${bcEsc(s.t)}.</strong> ${bcEsc(s.d)}</li>`);
    h += `</ol>`;
  }
  if (m.full && m.full.length) {
    m.full.forEach((s) => {
      if (s.h) h += `<h3 style="font-family:var(--serif);font-size:18px;color:#2b3c2c;margin:16px 0 6px;">${bcEsc(s.h)}</h3>`;
      if (s.p) h += `<p style="font-size:13.5px;line-height:1.6;color:#2c352a;margin:0 0 8px;max-width:680px;">${bcEsc(s.p)}</p>`;
      if (s.list && s.list.length) {
        h += `<ul style="margin:0 0 8px;padding-left:18px;">`;
        s.list.forEach((it) => h += `<li style="font-size:13.5px;line-height:1.5;color:#2c352a;margin-bottom:5px;">${bcEsc(it)}</li>`);
        h += `</ul>`;
      }
      if (s.days && s.days.length) {
        s.days.forEach((d) => {
          h += `<div class="pcard" style="margin:10px 0;"><div style="font-family:var(--serif);font-size:16px;color:#384d39;">${bcEsc(d.day)} <span style="font-style:italic;font-size:13px;color:#5d685a;">- ${bcEsc(d.theme)}</span></div><ul style="margin:6px 0 0;padding-left:18px;">`;
          d.items.forEach((it) => {const t = typeof it === "string" ? it : it.t + (it.d ? ", " + it.d : "");h += `<li style="font-size:13px;line-height:1.5;color:#2c352a;margin-bottom:4px;">${bcEsc(t)}</li>`;});
          h += `</ul></div>`;
        });
      }
    });
  }
  if (m.checklist && m.checklist.length) {
    h += `<h3 style="font-family:var(--serif);font-size:18px;color:#2b3c2c;margin:18px 0 8px;">Checklist</h3><ul style="list-style:none;margin:0;padding:0;">`;
    m.checklist.forEach((it) => h += `<li style="font-size:13.5px;line-height:1.7;color:#2c352a;">☐ ${bcEsc(it)}</li>`);
    h += `</ul>`;
  }
  h += `</section>`;
  return h;
}
function bcPrintBooklet(moduleIds) {
  const docEl = document.getElementById("bcf-print-doc");
  if (!docEl) return;
  const mods = moduleIds.map((id) => window.BC.byId[id]).filter(Boolean);
  let html = `<div style="max-width:720px;margin:0 auto;padding:24px 32px;">`;
  html += `<div style="text-align:center;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid #d6d2c3;"><div style="font-family:var(--serif);font-size:26px;color:#2b3c2c;">Bloom Culture™</div><div style="font-family:var(--mono);text-transform:uppercase;letter-spacing:.18em;font-size:10px;color:#98a18f;margin-top:4px;">DIY Wedding Flower Planner</div></div>`;
  mods.forEach((m) => html += bcModulePrintHTML(m));
  html += `</div>`;
  docEl.innerHTML = html;
  document.body.classList.add("printing-doc");
  const cleanup = () => {document.body.classList.remove("printing-doc");docEl.innerHTML = "";window.removeEventListener("afterprint", cleanup);};
  window.addEventListener("afterprint", cleanup);
  setTimeout(() => window.print(), 60);
}

/* ── print menu (this / all / choose) ── */
function PrintMenu({ currentId, accent, tint }) {
  const [open, setOpen] = useStateM(false);
  const [picking, setPicking] = useStateM(false);
  const [sel, setSel] = useStateM({});
  const mods = window.BC.modules;
  const toggle = (id) => setSel((s) => ({ ...s, [id]: !s[id] }));
  const printSel = () => {
    const ids = mods.filter((m) => sel[m.id]).map((m) => m.id);
    if (ids.length) {setOpen(false);setPicking(false);bcPrintBooklet(ids);}
  };
  return (
    <div style={{ position: "relative" }} className="no-print">
      <button onClick={() => {setOpen((o) => !o);setPicking(false);}} style={{ display: "inline-flex", alignItems: "center", gap: 8,
        fontSize: 13.5, fontWeight: 600, color: accent, padding: "9px 16px", borderRadius: 999, background: tint, border: "none", cursor: "pointer" }}>
        <Icon name="print" size={16} /> Print
      </button>
      {open &&
      <React.Fragment>
        <div onClick={() => {setOpen(false);setPicking(false);}} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 41, width: 256, background: "var(--paper)",
          border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 8 }}>
          {!picking ?
          <React.Fragment>
            <button onClick={() => {setOpen(false);bcPrintBooklet([currentId]);}} style={menuItemStyle}>
              <Icon name="print" size={15} style={{ color: accent }} /> Print this module
            </button>
            <button onClick={() => {setOpen(false);bcPrintBooklet(mods.map((m) => m.id));}} style={menuItemStyle}>
              <Icon name="list" size={15} style={{ color: accent }} /> Print entire planner
            </button>
            <button onClick={() => {setPicking(true);setSel({ [currentId]: true });}} style={menuItemStyle}>
              <Icon name="check" size={15} style={{ color: accent }} /> Choose modules…
            </button>
          </React.Fragment> :
          <React.Fragment>
            <div style={{ maxHeight: 260, overflowY: "auto", padding: "2px 2px 6px" }}>
              {mods.map((m) =>
              <button key={m.id} onClick={() => toggle(m.id)} style={{ ...menuItemStyle, padding: "7px 10px" }}>
                <span style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, border: sel[m.id] ? "none" : "1.5px solid var(--line-strong)",
                  background: sel[m.id] ? accent : "var(--paper)", display: "grid", placeItems: "center", color: "#fff" }}>
                  {sel[m.id] && <Icon name="check" size={11} stroke={2.6} />}</span>
                <span style={{ fontSize: 13 }}>{m.label}</span>
              </button>
              )}
            </div>
            <button onClick={printSel} style={{ width: "100%", marginTop: 4, background: accent, color: "#fff", border: "none",
              borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Print selected
            </button>
          </React.Fragment>}
        </div>
      </React.Fragment>}
    </div>);

}
const menuItemStyle = { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 8,
  background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "var(--ink)", fontSize: 13.5, fontWeight: 500 };
function PrintableBadge({ targetRef, tint, accent }) {
  return (
    <button onClick={() => printOnlyEl(targetRef.current)} className="no-print mono"
    title="Print just this worksheet"
    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: tint, color: accent,
      padding: "5px 11px", borderRadius: 999, fontSize: 10.5, cursor: "pointer" }}>
      <Icon name="print" size={12} /> PRINT
    </button>);

}

/* ── Budget Estimator (Paperform) config ──
   Paste your Paperform address below to embed the live form inline.
   Accepts either the slug ("yourname") or the full URL ("https://yourname.paperform.co").
   Leave blank to show the branded launcher fallback. */
const PAPERFORM = "comj9sqy";
const ESTIMATOR_URL = "https://bloomcultureflowers.com/pages/budget-estimator";
function paperformSrc() {
  if (!PAPERFORM) return null;
  if (/^https?:\/\//.test(PAPERFORM)) return PAPERFORM;
  return `https://${PAPERFORM}.paperform.co/`;
}

function ModulePage({ m, go, progress }) {
  const clay = m.accent === "clay";
  const accent = clay ? "var(--clay)" : "var(--accent-deep)";
  const tint = clay ? "var(--clay-tint)" : "var(--sage-tint)";
  const scrollRef = useRefM();
  useEffectM(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    try {window.scrollTo(0, 0);} catch (e) {}
  }, [m.id]);

  const idx = window.BC.modules.findIndex((x) => x.id === m.id);
  const next = window.BC.modules[idx + 1];
  const prev = window.BC.modules[idx - 1];

  return (
    <div ref={scrollRef} className="content-scroll" style={{ height: "100vh", overflowY: "auto" }}>
      {/* sticky action bar */}
      <div className="no-print sticky-actions" style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(247,246,240,.86)",
        backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)", padding: "13px 52px",
        display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => go("home")} style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "var(--ink-soft)", fontWeight: 500 }}>
          <Icon name="home" size={15} /> All modules
        </button>
        <span className="mono" style={{ color: "var(--ink-faint)", fontSize: 10 }}>/ {m.label}</span>
        <div style={{ flex: 1 }} />
        <PrintMenu currentId={m.id} accent={accent} tint={tint} />
      </div>

      <div className="print-area page-pad" style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 52px 80px" }}>
        {/* header */}
        <div style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 22 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, flexShrink: 0, display: "grid", placeItems: "center",
            background: clay ? "var(--clay)" : "var(--sage)", color: "#fff", boxShadow: "var(--shadow-md)" }}>
            <Icon name={MODULE_ICON[m.id]} size={28} stroke={1.6} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="mono" style={{ color: clay ? "var(--clay)" : "var(--rose-deep)", marginBottom: 9 }}>{SPARK_M} MODULE {m.num}</div>
            <h1 style={{ fontSize: "clamp(32px,3.6vw,46px)", lineHeight: 1.04, letterSpacing: "-.02em", marginBottom: 8 }}>{m.label}</h1>
            <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 19, color: "var(--ink-soft)" }}>{m.kicker}</p>
          </div>
        </div>

        <p style={{ fontSize: 17.5, lineHeight: 1.62, color: "var(--ink)", maxWidth: 760, marginBottom: 34 }}>{
          m.introLink ?
          m.intro.split(m.introLink.text).flatMap((seg, i) => i === 0 ? [seg] : [
          <a key={i} href={m.introLink.href} style={{ color: accent, fontWeight: 600, textDecoration: "underline", textDecorationColor: "var(--line-strong)" }}>{m.introLink.text}</a>,
          seg]
          ) :
          m.intro
          }</p>

        {/* reassurance banner */}
        {m.banner &&
        <div style={{ display: "flex", gap: 13, alignItems: "center", padding: "16px 20px", marginBottom: 30,
          background: "var(--sage-tint)", borderRadius: "var(--radius)", maxWidth: 760 }}>
            <Icon name="heart" size={20} style={{ color: "var(--sage-deep)", flexShrink: 0 }} />
            <span style={{ fontFamily: "var(--serif)", fontSize: 18, fontStyle: "italic", color: "var(--sage-deep)" }}>{m.banner}</span>
          </div>
        }

        {/* simple flower prep steps (visual + checkable) */}
        {m.flowSteps && <StepFlow flow={m.flowSteps} moduleId={m.id} accent={accent} />}

        {/* more quick fixes (list) */}
        {m.moreFixes && <MoreFixes data={m.moreFixes} accent={accent} />}

        {/* normal vs report split */}
        {m.normalVsReport && <NormalVsReport data={m.normalVsReport} accent={accent} />}

        {/* flower terminology glossary (thumbnail rows) */}
        {m.families && <FamilyGlossary families={m.families} accent={accent} />}

        {/* flower recipe card (dynamic) */}
        {m.recipe && <RecipeCard recipe={m.recipe} accent={accent} />}

        {/* design tutorials gallery (image + watch link) */}
        {m.tutorials && <TutorialGrid tutorials={m.tutorials} accent={accent} />}

        {/* order of operations (process strip) */}
        {m.orderOfOps && <OrderFlow flow={m.orderOfOps} accent={accent} />}

        {/* crew / hero photo slot */}
        {m.photo && <PhotoSlot photo={m.photo} accent={accent} />}

        {/* helper-count chart */}
        {m.helperChart && <HelperChart chart={m.helperChart} accent={accent} />}

        {/* jobs for helpers */}
        {m.jobs && <JobBoard jobs={m.jobs} accent={accent} />}

        {/* before / after image slots */}
        {m.beforeAfter && <BeforeAfter ba={m.beforeAfter} accent={accent} />}

        {/* time-scale infographic */}
        {m.scale && <ScaleStrip scale={m.scale} accent={accent} />}

        {/* full content, always shown */}
        {m.steps && <Steps steps={m.steps} accent={accent} tint={tint} />}
        {m.full && <FullSections sections={m.full} accent={accent} tint={tint} moduleId={m.id} collapsible={m.collapsibleFull} collapsibleHeading={m.fullHeading} />}

        {/* shop grid (clickable labeled product cards) */}
        {m.shop && <ShopGrid shop={m.shop} accent={accent} />}

        {/* venue placement diagram */}
        {m.venueDiagram && <VenueDiagram vd={m.venueDiagram} accent={accent} />}

        {/* venue questions checklist */}
        {m.venueQuestions && <VenueQuestions vq={m.venueQuestions} moduleId={m.id} accent={accent} tint={tint} />}

        {/* day-of contact list */}
        {m.contacts && <ContactList contacts={m.contacts} accent={accent} tint={tint} />}

        {/* vessel-size guide + centerpiece chart */}
        {m.vessels && <VesselGuide vessels={m.vessels} accent={accent} />}
        {m.cpChart && <CenterpieceChart chart={m.cpChart} accent={accent} go={go} />}
        {m.vaseTally && <VaseTally tally={m.vaseTally} accent={accent} tint={tint} />}

        {/* worksheet (printable) */}
        {m.worksheet && <Worksheet kind={m.worksheet} accent={accent} tint={tint} />}

        {/* TL;DR recap, the short version, above the checklist */}
        {m.quick && <div style={{ marginTop: 48 }}>
          <TLDR m={m} accent={accent} tint={tint} clay={clay} />
        </div>}

        {/* optional photo above the checklist */}
        {m.checklistPhoto && <div style={{ marginTop: 46 }}><PhotoSlot photo={m.checklistPhoto} accent={accent} /></div>}

        {/* checklist + notes side by side */}
        <div style={{ marginTop: 46, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, alignItems: "start" }} className="cl-grid">
          <Card><Checklist moduleId={m.id} items={m.checklist} note={m.checklistNote} /></Card>
          <Card><NotesBox moduleId={m.id} /></Card>
        </div>

        {/* helpful links */}
        {/* imagery placeholders */}
        {m.images && m.images.length > 0 &&
        <div className="no-print" style={{ marginTop: 38, display: "grid",
          gridTemplateColumns: `repeat(${Math.min(m.images.length, 2)},1fr)`, gap: 16 }}>
            {m.images.map((im, i) => <Placeholder key={i} label={im.label} note={im.note} height={200} />)}
          </div>
        }

        {/* prev / next */}
        <div className="no-print" style={{ marginTop: 48, display: "flex", justifyContent: "space-between", gap: 16, borderTop: "1px solid var(--line)", paddingTop: 24 }}>
          {prev ?
          <NavCard dir="prev" m={prev} go={go} /> :
          <span />}
          {next ? <NavCard dir="next" m={next} go={go} /> :
          <button onClick={() => go("home")} style={{ textAlign: "right", padding: "14px 20px", borderRadius: "var(--radius)",
            background: "transparent", border: "1px solid transparent", maxWidth: 300 }}
          onMouseEnter={(e) => {e.currentTarget.style.background = "var(--paper)";e.currentTarget.style.borderColor = "var(--line)";}}
          onMouseLeave={(e) => {e.currentTarget.style.background = "transparent";e.currentTarget.style.borderColor = "transparent";}}>
            <span className="mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>YOU'VE REACHED THE END ✦</span>
            <span style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: "flex-end", marginTop: 5 }}>
              <span style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)" }}>Back to Start</span>
              <Icon name="home" size={16} style={{ color: "var(--sage-deep)" }} />
            </span>
          </button>}
        </div>
        {!next &&
        <div className="no-print" style={{ marginTop: 24, textAlign: "center", padding: "22px 20px",
          background: "var(--sage-tint)", borderRadius: "var(--radius)" }}>
            <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, color: "var(--sage-deep)" }}>
              That's everything, friend, you're going to do beautifully. 🌸
            </span>
          </div>
        }

        {/* helpful links, footer style */}
        {m.links && m.links.length > 0 &&
        <div className="no-print" style={{ marginTop: 40, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
            <h3 className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontFamily: "var(--mono)", fontWeight: 600 }}>
              <Icon name="link" size={13} style={{ color: "var(--ink-faint)" }} /> HELPFUL LINKS
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 8 }}>
              {m.links.map((l, i) => <LinkCard key={i} link={l} accent={accent} go={go} />)}
            </div>
          </div>
        }
      </div>
    </div>);

}

/* ── TLDR card ── */
function TLDR({ m, accent, tint, clay }) {
  return (
    <div style={{ background: "var(--paper)", border: `1px solid var(--line)`, borderLeft: `4px solid ${accent}`,
      borderRadius: "var(--radius)", padding: "26px 30px", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span className="mono" style={{ background: tint, color: accent, padding: "5px 11px", borderRadius: 999, fontSize: 10.5 }}>TL;DR</span>
        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 17, color: "var(--ink-soft)" }}>the short version, keep this handy</span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 13 }}>
        {m.quick.map((q, i) =>
        <li key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start", fontSize: 16, lineHeight: 1.5 }}>
            <span style={{ color: clay ? "var(--clay)" : "var(--rose)", fontSize: 13, marginTop: 4, flexShrink: 0 }}>{SPARK_M}</span>
            <span>{q}</span>
          </li>
        )}
      </ul>
    </div>);

}

/* ── Steps (numbered) ── */
function Steps({ steps, accent, tint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 24, marginBottom: 20 }}>Step by step</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {steps.map((s, i) =>
        <div key={i} style={{ display: "flex", gap: 20, padding: "18px 0", borderBottom: i < steps.length - 1 ? "1px solid var(--line)" : "none" }}>
            <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: "50%", border: `1.5px solid ${accent}`,
            display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontSize: 18, color: accent }}>{i + 1}</div>
            <div style={{ flex: 1, paddingTop: 2 }}>
              <h4 style={{ fontSize: 18.5, marginBottom: 6 }}>{s.t}</h4>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--ink-soft)" }}>{s.d}</p>
            </div>
          </div>
        )}
      </div>
    </div>);

}

/* ── Full prose sections ── */
function FullSections({ sections, accent, tint, moduleId, collapsible, collapsibleHeading }) {
  if (collapsible) {
    return (
      <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 10 }}>
        {collapsibleHeading && <div className="mono" style={{ fontSize: 14, letterSpacing: ".14em", color: "var(--rose-deep)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <img src="assets/logo-mark.png" alt="" style={{ height: 20, width: "auto", display: "block" }} />
          {collapsibleHeading.replace(/^✦\s*/, "")}
        </div>}
        {sections.map((s, i) => <CollapsibleSection key={i} s={s} accent={accent} defaultOpen={i === 0} />)}
      </div>);
  }
  return (
    <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 30 }}>
      {sections.map((s, i) => {
        const rangeLabel = s.range ? bcRangeLabel(s.range) : null;
        const current = s.range ? bcPhaseCurrent(s.range) : false;
        return (
          <div key={i}>
          {s.h && <h3 style={{ fontSize: 23, marginBottom: s.p ? 10 : 14, display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: current ? accent : accent, flexShrink: 0 }} />{s.h}
            {rangeLabel && <span className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", fontWeight: 600 }}>· {rangeLabel}</span>}
            {current && <span className="mono" style={{ fontSize: 9, color: "#fff", background: accent, padding: "3px 9px", borderRadius: 999 }}>✦ YOU'RE HERE</span>}
          </h3>}
          {s.p && <p style={{ fontSize: 16, lineHeight: 1.66, color: "var(--ink)", maxWidth: 760, paddingLeft: s.h ? 18 : 0 }}>
            {String(s.p).split("\n").map((ln, li) => {
                const fine = ln.trim().startsWith("*");
                return <React.Fragment key={li}>
                {li > 0 && <br />}
                {fine ? <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{ln}</span> : ln}
              </React.Fragment>;
              })}
          </p>}
          {s.embed === "estimator" && <EstimatorEmbed ranges={s.ranges} accent={accent} />}
          {s.worksheet && <Worksheet kind={s.worksheet} accent={accent} tint={tint} />}
          {s.days && <DayAccordion days={s.days} note={s.note} moduleId={moduleId} sectionIdx={i} accent={accent} />}
          {s.palettes && <PaletteGallery palettes={s.palettes} accent={accent} />}
          {s.moodboard && <MoodBoard board={s.moodboard} accent={accent} />}
          {s.image &&
            <div style={{ marginTop: 16, paddingLeft: s.h ? 18 : 0, maxWidth: 560 }}>
              <Placeholder label={s.image.label} note={s.image.note} height={200} />
            </div>
            }
          {s.list && s.checkable &&
            <CheckableList storeKey={`${moduleId}.s${i}`} items={s.list} accent={accent} phaseHeading={s.h} range={s.range} />
            }
          {s.list && !s.checkable &&
            <ul style={{ margin: s.p ? "14px 0 0" : 0, padding: 0, paddingLeft: s.h ? 18 : 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
              {s.list.map((it, j) =>
              <li key={j} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 15.5, lineHeight: 1.5, color: "var(--ink)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ink-faint)", marginTop: 9, flexShrink: 0 }} />
                  <span>{it}</span>
                </li>
              )}
            </ul>
            }
        </div>);

      })}
    </div>);

}

/* ── collapsible reference section (e.g. Supplies Explained) ── */
function CollapsibleSection({ s, accent, defaultOpen }) {
  const [open, setOpen] = useStateM(!!defaultOpen);
  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
      overflow: "hidden", boxShadow: open ? "var(--shadow-sm)" : "none", transition: "box-shadow .2s" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "16px 20px", textAlign: "left", color: "var(--ink)", background: open ? "var(--sage-tint)" : "transparent", transition: "background .2s" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent, flexShrink: 0 }} />
        <span style={{ flex: 1, fontFamily: "var(--serif)", fontSize: 19, lineHeight: 1.1 }}>{s.h}</span>
        <Icon name="chevron" size={18} style={{ color: open ? accent : "var(--ink-faint)", flexShrink: 0,
          transform: open ? "rotate(90deg)" : "none", transition: "transform .22s" }} />
      </button>
      {open &&
      <div style={{ padding: "4px 22px 20px" }}>
          {s.p && <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--ink)", maxWidth: 720, fontWeight: "400", whiteSpace: "pre-line" }}>{
            s.pLink ?
            String(s.p).split(s.pLink.text).flatMap((seg, i) => i === 0 ? [seg] : [
              <a key={i} href={s.pLink.href} style={{ color: accent, fontWeight: 600 }}>{s.pLink.text}</a>, seg]) :
            s.p
          }</p>}
          {s.tip &&
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, padding: "12px 15px", background: "var(--rose-tint)", borderRadius: "var(--radius-sm)", maxWidth: 720 }}>
              <Icon name="spark" size={15} style={{ color: "var(--rose-deep)", flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>{s.tip}</span>
            </div>
        }
          {s.list &&
        <ul style={{ margin: s.p ? "12px 0 0" : 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
              {s.list.map((it, j) =>
          <li key={j} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 15, lineHeight: 1.5, color: "var(--ink)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ink-faint)", marginTop: 9, flexShrink: 0 }} />
                  <span>{it}</span>
                </li>
          )}
            </ul>
        }
        </div>
      }
    </div>);

}

/* ── day-by-day accordion (wedding week), vertical timeline style ── */
function DayAccordion({ days, note, moduleId, sectionIdx, accent }) {
  const [open, setOpen] = useStateM(0);
  return (
    <div style={{ marginTop: 18, paddingLeft: 18, maxWidth: 760 }}>
      {note &&
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 18, padding: "14px 16px",
        background: "var(--cream-deep)", borderRadius: "var(--radius-sm)" }}>
          <Icon name="calendar" size={17} style={{ color: "var(--sage)", flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-soft)" }}>{note}</span>
        </div>
      }
      <div style={{ position: "relative" }}>
        {/* the rail */}
        <div style={{ position: "absolute", left: 21, top: 22, bottom: 22, width: 2, background: "var(--line-strong)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {days.map((d, i) =>
          <DayCard key={i} d={d} isOpen={open === i} onToggle={() => setOpen(open === i ? -1 : i)}
          storeKey={`${moduleId}.s${sectionIdx}.${d.day.toLowerCase()}`} accent={accent} index={i} />
          )}
        </div>
      </div>
    </div>);

}

function DayCard({ d, isOpen, onToggle, storeKey, accent, index }) {
  const [checked, setChecked] = useLocal("phase." + storeKey, {});
  const toggle = (j) => setChecked((c) => ({ ...c, [j]: !c[j] }));
  const doneCount = d.items.filter((_, j) => checked[j]).length;
  const allDone = doneCount === d.items.length;
  const dayDate = bcDayDate(d.day);
  const dayLabel = dayDate ? dayDate.toLocaleDateString(undefined, { weekday: "long" }) : d.day;
  return (
    <div style={{ position: "relative", display: "flex", gap: 18, alignItems: "flex-start" }}>
      {/* timeline node */}
      <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, zIndex: 1,
        display: "grid", placeItems: "center", transition: "all .2s",
        background: allDone ? accent : "var(--paper)",
        border: `2px solid ${allDone ? accent : isOpen ? accent : "var(--line-strong)"}`,
        boxShadow: isOpen ? `0 0 0 4px var(--sage-tint)` : "none",
        color: allDone ? "#fff" : isOpen ? accent : "var(--ink-faint)" }}>
        {allDone ? <Icon name="check" size={20} stroke={2.4} /> :
        <span className="mono" style={{ fontSize: 11, letterSpacing: ".05em" }}>{dayLabel.slice(0, 3).toUpperCase()}</span>}
      </div>

      {/* card */}
      <div style={{ flex: 1, minWidth: 0, background: "var(--paper)", border: "1px solid var(--line)",
        borderRadius: "var(--radius)", overflow: "hidden", boxShadow: isOpen ? "var(--shadow-md)" : "var(--shadow-sm)", transition: "box-shadow .2s" }}>
        <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14,
          padding: "15px 18px", textAlign: "left", color: "var(--ink)",
          background: isOpen ? "var(--sage-tint)" : "transparent", transition: "background .2s" }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="mono" style={{ display: "block", fontSize: 9, color: isOpen ? "var(--sage-deep)" : "var(--ink-faint)", marginBottom: 3 }}>
              DAY {index + 1} · {d.theme.toUpperCase()}
            </span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--serif)", fontSize: 23, lineHeight: 1.02, letterSpacing: ".04em" }}>{dayLabel}</span>
              {dayDate && <span className="mono" style={{ fontSize: 10, color: accent, fontWeight: 600 }}>{bcFmtShort(dayDate)}</span>}
            </span>
          </span>
          <span className="mono" style={{ fontSize: 9.5, color: allDone ? accent : "var(--ink-faint)" }}>{doneCount}/{d.items.length}</span>
          <Icon name="chevron" size={18} style={{ color: isOpen ? accent : "var(--ink-faint)", flexShrink: 0,
            transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .22s" }} />
        </button>

        {isOpen &&
        <div style={{ padding: "6px 14px 16px" }}>
            {d.items.map((raw, j) => {
            const it = typeof raw === "string" ? { t: raw, d: "" } : raw;
            return (
              <button key={j} onClick={() => toggle(j)} style={{
                display: "flex", alignItems: "flex-start", gap: 13, textAlign: "left", width: "100%",
                padding: "11px 12px", borderRadius: 9, background: checked[j] ? "var(--sage-tint)" : "transparent",
                transition: "background .16s", color: "var(--ink)", marginTop: j === 0 ? 4 : 0 }}
              onMouseEnter={(e) => {if (!checked[j]) e.currentTarget.style.background = "var(--cream)";}}
              onMouseLeave={(e) => {if (!checked[j]) e.currentTarget.style.background = "transparent";}}>
                  <span style={{ width: 21, height: 21, borderRadius: 7, flexShrink: 0, marginTop: 1,
                  border: checked[j] ? "none" : "1.6px solid var(--line-strong)",
                  background: checked[j] ? accent : "var(--paper)",
                  display: "grid", placeItems: "center", color: "#fff", transition: "all .16s" }}>
                    {checked[j] && <Icon name="check" size={13} stroke={2.6} />}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 15.5, fontWeight: 600, lineHeight: 1.4,
                    color: checked[j] ? "var(--ink-soft)" : "var(--ink)",
                    textDecoration: checked[j] ? "line-through" : "none", textDecorationColor: "var(--ink-faint)" }}>{it.t}</span>
                    {it.d && <span style={{ display: "block", fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-faint)", marginTop: 3 }}>{it.d}</span>}
                    {it.dLink && <a href={it.dLink.href} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}
                      style={{ display: "inline-block", marginTop: 5, fontSize: 13, fontWeight: 600, color: accent, textDecoration: "none" }}>{it.dLink.text}</a>}
                  </span>
                </button>);

          })}
            {(d.tips || (d.tip ? [d.tip] : [])).length > 0 &&
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", margin: "14px 6px 2px", padding: "15px 17px",
            background: "var(--rose-tint)", borderRadius: "var(--radius-sm)" }}>
                <Icon name="spark" size={17} style={{ color: "var(--rose-deep)", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <span className="mono" style={{ display: "block", fontSize: 9.5, color: "var(--rose-deep)", marginBottom: 8 }}>PRO TIPS</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {(d.tips || [d.tip]).map((tp, k) =>
                <span key={k} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14, lineHeight: 1.55, color: "var(--ink)" }}>
                        <span style={{ color: "var(--rose)", fontSize: 12, marginTop: 3, flexShrink: 0 }}>{"\u2726"}</span>
                        <span>{tp}</span>
                      </span>
                )}
                  </div>
                </div>
              </div>
          }
            {(() => {
            const cal = bcCalLinks(dayDate, "Wedding flowers, " + d.theme, d.items.map((r) => "• " + (typeof r === "string" ? r : r.t)).join("\n"));
            if (!cal) return null;
            return (
              <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "14px 6px 2px", paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>REMIND ME</span>
                  <a href={cal.google} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: accent, background: "var(--sage-tint)", padding: "6px 12px", borderRadius: 999, textDecoration: "none" }}>
                    <Icon name="calendar" size={13} /> Google
                  </a>
                  <a href={cal.ics} download={"wedding-flowers-" + d.day.toLowerCase() + ".ics"} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: accent, background: "var(--sage-tint)", padding: "6px 12px", borderRadius: 999, textDecoration: "none" }}>
                    <Icon name="calendar" size={13} /> Apple / Outlook
                  </a>
                </div>);

          })()}
          </div>
        }
      </div>
    </div>);

}

/* ── inline checkable list (persistent) for timeline phases etc. ── */
function CheckableList({ storeKey, items, accent, phaseHeading, range }) {
  const [checked, setChecked] = useLocal("phase." + storeKey, {});
  const toggle = (i) => setChecked((c) => ({ ...c, [i]: !c[i] }));
  const doneCount = items.filter((_, i) => checked[i]).length;
  const phaseDate = bcPhaseStartDate(range);
  const cal = phaseDate ? bcCalLinks(phaseDate, "Wedding flowers, " + (phaseHeading || "to-do"), items.map((it) => "• " + it).join("\n")) : null;
  return (
    <div style={{ marginTop: 14, marginLeft: 18, background: "var(--paper)", border: "1px solid var(--line)",
      borderRadius: "var(--radius-sm)", padding: "8px 10px", maxWidth: 680 }}>
      {items.map((it, j) =>
      <button key={j} onClick={() => toggle(j)} style={{
        display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left", width: "100%",
        padding: "9px 11px", borderRadius: 8, background: checked[j] ? "var(--sage-tint)" : "transparent",
        transition: "background .16s", color: "var(--ink)" }}
      onMouseEnter={(e) => {if (!checked[j]) e.currentTarget.style.background = "var(--cream)";}}
      onMouseLeave={(e) => {if (!checked[j]) e.currentTarget.style.background = "transparent";}}>
          <span style={{ width: 19, height: 19, borderRadius: 6, flexShrink: 0, marginTop: 1,
          border: checked[j] ? "none" : "1.6px solid var(--line-strong)",
          background: checked[j] ? accent : "var(--paper)",
          display: "grid", placeItems: "center", color: "#fff", transition: "all .16s" }}>
            {checked[j] && <Icon name="check" size={12} stroke={2.6} />}</span>
          <span style={{ fontSize: 15.5, lineHeight: 1.5,
          color: checked[j] ? "var(--ink-soft)" : "var(--ink)",
          textDecoration: checked[j] ? "line-through" : "none", textDecorationColor: "var(--ink-faint)" }}>{it}</span>
        </button>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 11px 6px", gap: 10, flexWrap: "wrap" }}>
        {cal ?
        <span className="no-print" style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>REMIND ME</span>
              <a href={cal.google} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: accent, background: "var(--sage-tint)", padding: "5px 10px", borderRadius: 999, textDecoration: "none" }}>
                <Icon name="calendar" size={12} /> Google
              </a>
              <a href={cal.ics} download={"wedding-flowers-reminder.ics"} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: accent, background: "var(--sage-tint)", padding: "5px 10px", borderRadius: 999, textDecoration: "none" }}>
                <Icon name="calendar" size={12} /> Apple / Outlook
              </a>
            </span> :
        <span />}
        <span className="mono" style={{ fontSize: 9.5, color: doneCount === items.length ? accent : "var(--ink-faint)" }}>
          {doneCount}/{items.length} done
        </span>
      </div>
    </div>);

}

function Card({ children }) {
  return <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
    padding: "24px 26px", boxShadow: "var(--shadow-sm)" }}>{children}</div>;
}

/* ── Budget Estimator embed (Paperform) with launcher fallback ── */
function EstimatorEmbed({ ranges, accent }) {
  const [open, setOpen] = useStateM(false);
  const src = paperformSrc();
  return (
    <div style={{ marginTop: 18, paddingLeft: 18 }}>
      {src ?
      <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden",
        boxShadow: "var(--shadow-md)", background: "var(--paper)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "12px 18px", borderBottom: "1px solid var(--line)", background: "var(--paper)" }}>
            <Icon name="palette" size={16} style={{ color: accent }} />
            <span style={{ fontFamily: "var(--serif)", fontSize: 16 }}>Bloom Culture™ Budget Estimator</span>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 9, color: "var(--ink-faint)" }}>LIVE TOOL</span>
          </div>
          <iframe title="Budget Estimator" src={src}
        style={{ width: "100%", height: 780, border: "none", display: "block", background: "var(--paper)" }}
        loading="lazy" allow="clipboard-write"></iframe>
        </div> :

      <div style={{ position: "relative", overflow: "hidden", borderRadius: "var(--radius)",
        background: "var(--sage-deep)", color: "var(--cream)", padding: "30px 32px", boxShadow: "var(--shadow-md)" }}>
          <div style={{ position: "absolute", right: -30, top: -40, width: 150, height: 150, borderRadius: "50%", border: "1px solid rgba(255,255,255,.12)" }} />
          <div className="mono" style={{ color: "var(--rose)", fontSize: 10.5, marginBottom: 12 }}>{SPARK_M} INTERACTIVE TOOL</div>
          <h4 style={{ color: "var(--cream)", fontSize: 24, marginBottom: 9, maxWidth: 480 }}>Price out your whole wish list</h4>
          <p style={{ color: "rgba(247,246,240,.8)", fontSize: 15, lineHeight: 1.55, maxWidth: 460, marginBottom: 22 }}>
            Pick your arrangements, enter quantities, and get a real price range based on current wholesale pricing, in just a few clicks.
          </p>
          <a href={ESTIMATOR_URL} target="_blank" rel="noopener" style={{ textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 9, background: "var(--cream)", color: "var(--sage-deep)",
          padding: "13px 22px", borderRadius: 999, fontWeight: 600, fontSize: 14.5, boxShadow: "0 4px 14px rgba(0,0,0,.18)" }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "none"}>
            Open the Budget Estimator <Icon name="arrow" size={17} />
          </a>
        </div>
      }

      {/* ballpark ranges (collapsible) */}
      {ranges && ranges.length > 0 &&
      <div style={{ marginTop: 14, border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", background: "var(--paper)", overflow: "hidden" }}>
          <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "14px 18px", textAlign: "left", color: "var(--ink)" }}>
            <Icon name="list" size={16} style={{ color: accent }} />
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Quick ballpark, typical per-piece price ranges</span>
            <Icon name="chevron" size={16} style={{ marginLeft: "auto", color: "var(--ink-faint)", transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
          </button>
          {open &&
        <React.Fragment>
              <ul style={{ listStyle: "none", margin: 0, padding: "4px 18px 12px", display: "flex", flexDirection: "column", gap: 9 }}>
                {ranges.map((it, j) =>
            <li key={j} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 14.5, lineHeight: 1.5, color: "var(--ink-soft)" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--ink-faint)", marginTop: 8, flexShrink: 0 }} />
                    <span>{it}</span>
                  </li>
            )}
              </ul>
              <div style={{ margin: "0 18px 16px", padding: "13px 15px", background: "var(--cream)", borderRadius: "var(--radius-sm)",
            display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Icon name="spark" size={15} style={{ color: "var(--accent-deep)", flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ink-soft)" }}>
                  These are ballpark figures only. Actual pricing fluctuates with the flowers you choose, some varieties cost more than others, and with the size and fullness of each arrangement. Use the estimator above for a range based on your real selections.
                </span>
              </div>
            </React.Fragment>
        }
        </div>
      }
    </div>);

}

function LinkCard({ link, accent, go }) {
  const [hov, setHov] = useStateM(false);
  const isModule = !!link.module;
  const isExternal = !isModule && link.href && link.href !== "#";
  const onClick = (e) => {if (isModule) {e.preventDefault();if (go) go(link.module);} else if (!isExternal) {e.preventDefault();}};
  return (
    <a href={isExternal ? link.href : "#"} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener" : undefined}
    onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
      background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
      boxShadow: hov ? "var(--shadow-md)" : "none", transform: hov ? "translateY(-1px)" : "none", transition: "all .18s" }}>
      <span style={{ width: 26, height: 26, borderRadius: 7, background: "var(--cream-deep)", display: "grid", placeItems: "center", color: accent, flexShrink: 0 }}>
        <Icon name={isModule ? MODULE_ICON[link.module] || "arrowSm" : "link"} size={13} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{link.label}</span>
        {link.note && <span style={{ display: "block", fontSize: 11, color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{link.note}</span>}
      </span>
      <Icon name={isModule ? "arrowSm" : "link"} size={13} style={{ color: "var(--ink-faint)", flexShrink: 0 }} />
    </a>);

}

/* ── time-scale infographic (how long will design take?) ── */
function ScaleStrip({ scale, accent }) {
  return (
    <div style={{ marginTop: 30 }}>
      <h3 style={{ fontSize: 23, marginBottom: 6 }}>{scale.heading}</h3>
      <p style={{ fontSize: 14.5, color: "var(--ink-soft)", marginBottom: 18, maxWidth: 620 }}>{scale.sub}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }} className="scale-grid">
        {scale.tiers.map((t, i) =>
        <div key={i} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
          padding: "20px 20px 22px", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* level bars */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 30 }}>
              {[1, 2, 3].map((n) =>
            <span key={n} style={{ flex: 1, borderRadius: 3, height: `${n / 3 * 100}%`,
              background: n <= t.level ? accent : "var(--cream-deep)", transition: "background .2s" }} />
            )}
            </div>
            <div>
              <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginBottom: 4 }}>TIER {i + 1}</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 21, lineHeight: 1.05 }}>{t.name}</div>
            </div>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5, flex: 1 }}>{t.detail}</p>
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                <Icon name="calendar" size={15} style={{ color: accent }} />{t.time}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-soft)" }}>
                <Icon name="users" size={15} style={{ color: "var(--ink-faint)" }} />{t.helpers}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>);

}

function NavCard({ dir, m, go }) {
  const [hov, setHov] = useStateM(false);
  const isNext = dir === "next";
  return (
    <button onClick={() => go(m.id)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    style={{ textAlign: isNext ? "right" : "left", padding: "14px 20px", borderRadius: "var(--radius)",
      background: hov ? "var(--paper)" : "transparent", border: "1px solid", borderColor: hov ? "var(--line)" : "transparent",
      boxShadow: hov ? "var(--shadow-sm)" : "none", transition: "all .18s", maxWidth: 300 }}>
      <span className="mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{isNext ? "NEXT MODULE" : "PREVIOUS"}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 9, justifyContent: isNext ? "flex-end" : "flex-start", marginTop: 5 }}>
        {!isNext && <Icon name="arrow" size={16} style={{ color: "var(--sage-deep)", transform: "rotate(180deg)" }} />}
        <span style={{ fontFamily: "var(--serif)", fontSize: 18, color: "var(--ink)" }}>{m.label}</span>
        {isNext && <Icon name="arrow" size={16} style={{ color: "var(--sage-deep)" }} />}
      </span>
    </button>);

}

/* ── printable worksheet ── */
function Worksheet({ kind, accent, tint }) {
  if (kind === "needs") return <NeedsWorksheet accent={accent} tint={tint} />;
  if (kind === "supplies") return <SuppliesWorksheet accent={accent} tint={tint} />;
  if (kind === "helper") return <HelperWorksheet accent={accent} tint={tint} />;
  if (kind === "transport") return <TransportWorksheet accent={accent} tint={tint} />;
  const blank = (w = "100%") => <span style={{ display: "inline-block", width: w, borderBottom: "1.5px solid var(--line-strong)", height: 18 }} />;
  const rows = kind === "helper" ?
  ["Helper name", "Job assignment", "Arrangement(s) assigned", "Tutorials to watch", "Location", "Time", "Special notes"] :
  ["Arrangement", "Destination", "Loaded? (Y/N)", "Quantity", "Handling notes"];
  const ref = useRefM();
  return (
    <div ref={ref} style={{ marginTop: 42, background: "var(--paper)", border: `1px dashed var(--line-strong)`, borderRadius: "var(--radius)", padding: "28px 30px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
        <PrintableBadge targetRef={ref} tint={tint} accent={accent} />
        <h3 style={{ fontSize: 22 }}>{kind === "helper" ? "Helper Assignment Sheet" : "Transportation Worksheet"}</h3>
      </div>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 20 }}>
        {kind === "helper" ? "Print one for each helper and hand it out with their recipes." : "Print one per driver, along with your venue diagram."}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map((r, i) =>
        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-faint)", width: 160, flexShrink: 0 }}>{r}</span>
            {blank()}
          </div>
        )}
      </div>
    </div>);

}

/* ── pretty printable Flower Needs Worksheet ── */
const NEEDS_GROUPS = [
{ h: "Personal Flowers", icon: "heart", items: [
  "Bridal bouquet", "Bridesmaid bouquets", "Boutonnieres", "Corsages", "Flower crown / hair florals", "Flower girl pieces"]
},
{ h: "Ceremony", icon: "spark", items: [
  "Ceremony arrangements", "Arch / arbor / pergola", "Aisle markers", "Head Table / Sweetheart florals"]
},
{ h: "Reception", icon: "vase", items: [
  "Centerpieces, small", "Centerpieces, medium", "Centerpieces, large", "Bud vases", "Table garland", "Cake flowers", "Bar · sign · extras"]
}];


const EST_MULTIPLIER = 1; // prices in estimateItems are already final (rounded)
function NeedsWorksheet({ accent, tint }) {
  const ref = useRefM();
  const [data, setData] = useLocal("needsheet", {});
  const [weddingDate, setWeddingDate] = useLocal("weddingDate", "");
  const [palettePick] = useLocal("palettePick", "");
  const groups = window.BC.estimateItems || window.BC.arrangements;
  const get = (k) => k === "wdate" ? data.wdate || weddingDate :
  k === "palette" ? data.palette != null && data.palette !== "" ? data.palette : palettePick :
  data[k] || "";
  const set = (k, v) => {setData((d) => ({ ...d, [k]: v }));if (k === "wdate") setWeddingDate(v);};
  const onF = (e) => e.target.style.borderBottomColor = "var(--accent)";
  const onB = (e) => e.target.style.borderBottomColor = "var(--line-strong)";
  const lineInput = { border: "none", borderBottom: "1.5px solid var(--line-strong)", background: "transparent",
    fontSize: 15, padding: "4px 2px", color: "var(--ink)", outline: "none", fontFamily: "var(--sans)", width: "100%" };
  const fmtCurrency = (v) => {const n = (v || "").replace(/[^0-9]/g, "");return n ? Number(n).toLocaleString() : "";};

  // ── live estimate: sum (low/high × qty) across all rows, then ×1.12 ──
  let lowSum = 0,highSum = 0;
  groups.forEach((g, gi) => {
    const rows = data[`rows_${gi}`] || 3;
    for (let r = 0; r < rows; r++) {
      const pickName = data[`pick_${gi}_${r}`];
      const qty = parseInt(data[`pq_${gi}_${r}`], 10) || 0;
      if (!pickName || !qty) continue;
      const item = g.items.find((x) => x.name === pickName);
      if (item && item.low != null) {
        lowSum += item.low * qty * EST_MULTIPLIER;highSum += item.high * qty * EST_MULTIPLIER;
      }
    }
  });
  const lowEst = Math.round(lowSum);
  const highEst = Math.round(highSum);
  const hasEst = highEst > 0;

  const field = ({ label, k, prefix, type }) =>
  <div style={{ flex: 1, minWidth: 0 }}>
      <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 7 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {k === "palette" && (() => {const pal = getPalette(get("palette"));return pal ?
        <span style={{ display: "flex", flexShrink: 0 }}>
            {pal.colors.map((c, j) => <span key={j} style={{ width: 15, height: 15, borderRadius: "50%", background: c, border: "1.5px solid var(--paper)", marginLeft: j === 0 ? 0 : -5, boxShadow: "0 0 0 1px rgba(0,0,0,.05)" }} />)}
          </span> : null;})()}
        {prefix && <span style={{ fontFamily: "var(--serif)", fontSize: 16, color: "var(--ink-faint)" }}>{prefix}</span>}
        <input type={type || "text"}
      value={k === "budget" ? fmtCurrency(get(k)) : get(k)}
      inputMode={k === "budget" ? "numeric" : undefined}
      onChange={(e) => set(k, k === "budget" ? e.target.value.replace(/[^0-9]/g, "") : e.target.value)} onFocus={onF} onBlur={onB}
      style={{ ...lineInput, colorScheme: "light", height: 30, lineHeight: "20px", boxSizing: "border-box" }} />
      </div>
    </div>;

  const locked = !!data.locked;
  const showEst = !!data.showEst;
  const lockStyle = locked ? { opacity: .5, pointerEvents: "none", filter: "saturate(.55)" } : {};

  const emailEstimate = () => {
    const L = [];
    L.push("My DIY Wedding Flower Needs & Estimate 🌸");
    L.push("");
    if (get("wdate")) L.push("Wedding date: " + get("wdate"));
    if (get("palette")) L.push("Color palette: " + get("palette"));
    if (get("budget")) L.push("Budget goal: $" + fmtCurrency(get("budget")));
    groups.forEach((g, gi) => {
      const rows = data[`rows_${gi}`] || 3;const picked = [];
      for (let r = 0; r < rows; r++) {
        const nm = data[`pick_${gi}_${r}`];const q = parseInt(data[`pq_${gi}_${r}`], 10) || 0;
        if (nm && q) picked.push("• " + q + "× " + nm);
      }
      if (picked.length) {L.push("");L.push(g.group.toUpperCase() + ":");picked.push.apply(L, []);picked.forEach((p) => L.push(p));}
    });
    L.push("");L.push("ESTIMATED FLOWER BUDGET: " + (hasEst ? `$${lowEst.toLocaleString()} – $${highEst.toLocaleString()}` : "-"));
    if (get("musthaves")) {L.push("");L.push("Notes: " + get("musthaves"));}
    L.push("");L.push("Estimate based on current wholesale pricing, not a formal quote. via Bloom Culture™ DIY Wedding Flower Planner");
    window.location.href = "mailto:?subject=" + encodeURIComponent("My DIY Wedding Flower Estimate") + "&body=" + encodeURIComponent(L.join("\n"));
  };

  return (
    <div ref={ref} style={{ marginTop: 42, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
      padding: "30px 32px 34px", boxShadow: "var(--shadow-sm)" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 23 }}>Flower Needs &amp; Budget Estimate</h3>
        <button onClick={() => set("locked", !locked)} className="no-print" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7,
          fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: "7px 14px", borderRadius: 999,
          border: "1.5px solid " + (locked ? "var(--line-strong)" : accent), background: locked ? "var(--cream)" : tint, color: locked ? "var(--ink-soft)" : accent }}>
          {locked ? "🔒 Locked, tap to edit" : "🔓 Editing, tap to lock"}
        </button>
      </div>
      <p className="no-print" style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 18, maxWidth: 660 }}>
        <strong>How it works:</strong> pick each item and select how many you need in the three sections below. Your estimate updates in real time right under the Reception section. Lock the sheet when you're done so nothing shifts by accident, then print or email it anytime. Everything saves as you go.
      </p>

      {/* top fields */}
      <div style={{ display: "flex", gap: 26, marginBottom: 30, flexWrap: "wrap", ...lockStyle }}>
        {field({ label: "WEDDING DATE", k: "wdate", type: "date" })}
        {field({ label: "COLOR PALETTE", k: "palette" })}
        {field({ label: "BUDGET GOAL", k: "budget", prefix: "$" })}
      </div>

      {/* sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 26, ...lockStyle }}>
        {groups.map((g, gi) => {
          const rows = data[`rows_${gi}`] || 3;
          return (
            <div key={gi}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 18 }}>{g.group}</span>
                <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", width: 46, textAlign: "center" }}>QTY</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", width: 96, textAlign: "right" }}>EST.</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: rows }).map((_, r) => {
                  const pickName = get(`pick_${gi}_${r}`);
                  const qty = parseInt(get(`pq_${gi}_${r}`), 10) || 0;
                  const item = g.items.find((x) => x.name === pickName);
                  const lineLo = item && item.low != null ? item.low * qty : 0;
                  const lineHi = item && item.high != null ? item.high * qty : 0;
                  return (
                    <div key={r} className={(pickName && qty) ? "" : "no-print"} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <select className="no-print" value={pickName} onChange={(e) => set(`pick_${gi}_${r}`, e.target.value)}
                      style={{ flex: 1, minWidth: 0, fontFamily: "var(--sans)", fontSize: 14.5, padding: "9px 10px",
                        borderRadius: 8, border: "1.5px solid var(--line-strong)", background: "var(--paper)",
                        color: pickName ? "var(--ink)" : "var(--ink-faint)", outline: "none", cursor: "pointer" }}>
                        <option value="">- choose a piece -</option>
                        {g.items.map((it) => <option key={it.name} value={it.name}>{it.name}</option>)}
                      </select>
                      <input className="no-print" value={get(`pq_${gi}_${r}`)} onChange={(e) => set(`pq_${gi}_${r}`, e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric"
                      placeholder="0" style={{ width: 46, height: 38, borderRadius: 8, border: "1.5px solid var(--line-strong)", flexShrink: 0,
                        background: "var(--cream)", textAlign: "center", fontSize: 15, color: "var(--ink)", outline: "none", fontFamily: "var(--sans)" }}
                      onFocus={(e) => e.target.style.borderColor = "var(--accent)"} onBlur={(e) => e.target.style.borderColor = "var(--line-strong)"} />
                      {/* print-only clean line */}
                      <span className="print-only-line" style={{ display: "none", flex: 1, minWidth: 0, fontSize: 14, color: "var(--ink)" }}>
                        {qty}× {pickName}
                      </span>
                      <span style={{ width: 96, flexShrink: 0, textAlign: "right", fontSize: 13.5, fontFamily: "var(--mono)",
                        color: lineHi > 0 ? "var(--ink-soft)" : "var(--ink-faint)" }}>
                        {lineHi > 0 ? `$${lineLo}–$${lineHi}` : pickName && qty ? "-" : ""}
                      </span>
                    </div>);

                })}
              </div>
              <button className="no-print" onClick={() => set(`rows_${gi}`, rows + 1)} style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 7,
                fontSize: 12.5, fontWeight: 600, color: accent, background: "none", cursor: "pointer", padding: "3px 2px" }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add another
              </button>
            </div>);

        })}
      </div>

      {/* live estimate total, updates in real time */}
      <div style={{ marginTop: 26, padding: "22px 24px", borderRadius: "var(--radius)", background: "var(--sage-deep)", color: "var(--cream)" }}>
        <div className="mono" style={{ fontSize: 9.5, color: "rgba(247,246,240,.7)", marginBottom: 6 }}>YOUR ESTIMATED FLOWER BUDGET</div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 34, lineHeight: 1 }}>
          {hasEst ? `$${lowEst.toLocaleString()} – $${highEst.toLocaleString()}` : "Pick a few pieces above to see your estimate"}
        </div>
        {hasEst && <div style={{ fontSize: 12.5, color: "rgba(247,246,240,.7)", marginTop: 8, lineHeight: 1.5 }}>
          This estimate based on current wholesale pricing. Final costs fluctuate with the flowers and quantities you choose, as well as the size of each piece. This is only an estimate, not a formal quote.{window.BC_PREVIEW ? <React.Fragment>{" "}Want exact numbers tailored to your colors, style, and budget?{" "}
          <a href="https://bloomcultureflowers.com/pages/custom-floral-design" target="_blank" rel="noopener" style={{ color: "var(--cream)", textDecoration: "underline", fontWeight: 600 }}>Get a custom quote here.</a></React.Fragment> : ""}
        </div>}
      </div>

      {/* action row: email/print, below the estimate */}
      <div className="no-print" style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={emailEstimate} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--paper)", color: accent,
          border: "1.5px solid var(--line-strong)", borderRadius: 999, padding: "12px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Icon name="link" size={15} /> Email it
        </button>
        <button onClick={() => printOnlyEl(ref.current)} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--paper)", color: accent,
          border: "1.5px solid var(--line-strong)", borderRadius: 999, padding: "12px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          <Icon name="print" size={15} /> Print it
        </button>
      </div>

      {/* notes */}
      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--line)", ...lockStyle }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 9 }}>NOTES &amp; MUST-HAVES</div>
        <textarea value={get("musthaves")} onChange={(e) => set("musthaves", e.target.value)} onFocus={onF} onBlur={onB}
        style={{ ...lineInput, minHeight: 52, resize: "vertical", borderBottom: "1px dotted var(--line-strong)", lineHeight: 1.7 }} />
      </div>
    </div>);

}

/* ── color palette gallery (in-workspace, tap to pick) ── */
function PaletteGallery({ palettes, accent }) {
  const [pick, setPick] = useLocal("palettePick", "");
  return (
    <div style={{ marginTop: 18, paddingLeft: 18 }}>
      <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginBottom: 12 }}>
        ✦ TAP THE ONE THAT MAKES YOU GO OOOOH
      </div>
      <div className="palette-grid">
        {palettes.map((p, i) => {
          const sel = pick === p.name;
          return (
            <button key={i} onClick={() => setPick(sel ? "" : p.name)} style={{
              position: "relative", display: "flex", flexDirection: "column", gap: 11, textAlign: "left", width: "100%",
              padding: "15px 15px 16px", borderRadius: "var(--radius-sm)",
              background: sel ? "var(--sage-tint)" : "var(--paper)",
              border: "1.5px solid", borderColor: sel ? accent : "var(--line)",
              boxShadow: sel ? "var(--shadow-sm)" : "none", transition: "all .16s" }}
            onMouseEnter={(e) => {if (!sel) {e.currentTarget.style.borderColor = "var(--line-strong)";e.currentTarget.style.background = "var(--cream)";}}}
            onMouseLeave={(e) => {if (!sel) {e.currentTarget.style.borderColor = "var(--line)";e.currentTarget.style.background = "var(--paper)";}}}>
              {/* color chips */}
              <span style={{ display: "flex" }}>
                {p.colors.map((c, j) =>
                <span key={j} style={{ width: 24, height: 24, borderRadius: "50%", background: c,
                  border: "2px solid var(--paper)", marginLeft: j === 0 ? 0 : -8,
                  boxShadow: "0 0 0 1px rgba(0,0,0,.05)" }} />
                )}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: "var(--serif)", fontSize: 16, lineHeight: 1.15 }}>{p.name}</span>
                <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-faint)", marginTop: 3 }}>{p.mood}</span>
              </span>
              {sel &&
              <span style={{ position: "absolute", top: 12, right: 12, width: 22, height: 22, borderRadius: "50%",
                background: accent, color: "#fff", display: "grid", placeItems: "center" }}>
                  <Icon name="check" size={13} stroke={2.6} />
                </span>
              }
            </button>);

        })}
      </div>
      {pick &&
      <p style={{ marginTop: 14, fontSize: 13.5, color: "var(--ink-soft)" }}>
          Lovely choice, <strong style={{ color: "var(--ink)" }}>{pick}</strong> is saved as your color direction (you'll see it on your Home page too). Bring it to your consult and we'll translate it into real flower varieties. ✦
        </p>
      }
    </div>);

}

/* ── mood board: grid of user-fillable image slots ── */
function MoodBoard({ board, accent }) {
  const count = board.count || 6;
  return (
    <div style={{ marginTop: 26, paddingLeft: 18 }}>
      <h4 style={{ fontSize: 19, marginBottom: 6, display: "flex", alignItems: "center", gap: 9 }}>
        <Icon name="heart" size={17} style={{ color: accent }} /> {board.heading}
      </h4>
      <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ink-soft)", maxWidth: 640, marginBottom: 16 }}>{board.sub}</p>
      <div className="moodboard-grid">
        {Array.from({ length: count }).map((_, i) =>
        React.createElement("image-slot", {
          key: i,
          id: "moodboard-" + (i + 1),
          shape: "rounded",
          radius: "14",
          placeholder: "Drop inspo",
          style: { width: "100%", aspectRatio: "4 / 3", display: "block" }
        })
        )}
      </div>
      <MoodBoardStudio count={count} accent={accent} />
    </div>);

}

/* ── generate a downloadable mood board + color palette from the dropped photos ── */
function MoodBoardStudio({ count, accent }) {
  const [busy, setBusy] = useStateM(false);
  const [palette, setPalette] = useStateM([]);
  const [msg, setMsg] = useStateM("");

  const grabImages = () => {
    const out = [];
    for (let i = 1; i <= count; i++) {
      const el = document.getElementById("moodboard-" + i);
      let src = null;
      if (el) {
        if (el.shadowRoot) {
          const img = el.shadowRoot.querySelector("img");
          if (img && img.src && (img.src.startsWith("data:") || img.src.startsWith("http"))) src = img.src;
        }
        if (!src && el.getAttribute("src") && (el.getAttribute("src").startsWith("data:") || el.getAttribute("src").startsWith("http"))) src = el.getAttribute("src");
      }
      if (src) out.push(src);
    }
    return out;
  };

  const avgColor = (ctx, x, y, w, h) => {
    const d = ctx.getImageData(x, y, w, h).data;
    let r = 0,g = 0,b = 0,n = 0;
    for (let i = 0; i < d.length; i += 16) {r += d[i];g += d[i + 1];b += d[i + 2];n++;}
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  };
  const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  const toRgb = (h) => {const m = h.replace("#", "");return [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));};

  const generate = async (paletteOverride) => {
    const srcs = grabImages();
    if (srcs.length < 1) {setMsg("Add at least 1 photo to your board first 🌸");return;}
    setBusy(true);setMsg("");
    try {
      const imgs = await Promise.all(srcs.map((s) => new Promise((res, rej) => {
        const im = new Image();
        if (s.startsWith("http")) im.crossOrigin = "anonymous"; // prevent canvas CORS taint for Supabase URLs
        im.onload = () => res(im);im.onerror = rej;im.src = s;
      })));
      try {if (document.fonts && document.fonts.ready) await document.fonts.ready;} catch (e) {}
      let logoImg = null;
      try {
        const le = document.querySelector('img[alt="Bloom Culture"]') || document.querySelector('aside img');
        if (le && le.src) logoImg = await new Promise((r) => {const im = new Image();im.onload = () => r(im);im.onerror = () => r(null);im.src = le.src;});
      } catch (e) {}

      const roundRect = (c, x, y, w, h, r) => {
        r = Math.min(r, w / 2, h / 2);
        c.beginPath();
        c.moveTo(x + r, y);c.arcTo(x + w, y, x + w, y + h, r);c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);c.arcTo(x, y, x + w, y, r);c.closePath();
      };

      // ── sample each photo's representative color ──
      const sampled = paletteOverride && paletteOverride.length ?
      paletteOverride.map(toRgb) :
      imgs.map((im) => {
        const t = document.createElement("canvas");t.width = 40;t.height = 40;
        const tc = t.getContext("2d");tc.drawImage(im, 0, 0, 40, 40);
        return avgColor(tc, 8, 8, 24, 24);
      });
      // cap the palette at 5, evenly spaced across the photos
      let colors = sampled;
      if (!paletteOverride && sampled.length > 5) {
        const picks = [];const step = (sampled.length - 1) / 4;
        for (let k = 0; k < 5; k++) picks.push(sampled[Math.round(k * step)]);
        colors = picks;
      }

      // ── geometry: header on top · masonry collage middle · palette row bottom ──
      const S = 2;
      const pad = 54,gapC = 16;
      const headH = 150,palH = 178;
      const ncol = imgs.length <= 2 ? imgs.length : imgs.length <= 6 ? 3 : 4;
      const colW = 300;
      const photoAreaW = ncol * colW + (ncol - 1) * gapC;
      const colH = new Array(ncol).fill(0);
      const placed = imgs.map((im) => {
        const arRaw = im.width / im.height;
        const ar = Math.max(0.72, Math.min(1.45, arRaw));
        const h = colW / ar;
        let cmin = 0;for (let k = 1; k < ncol; k++) if (colH[k] < colH[cmin]) cmin = k;
        const x = cmin * (colW + gapC);const y = colH[cmin];
        colH[cmin] += h + gapC;
        return { im, x, y, w: colW, h, ar: arRaw };
      });
      const collageH = Math.max(...colH) - gapC;

      const W = pad * 2 + photoAreaW;
      const H = pad + headH + collageH + palH + pad;
      const cx = W / 2;
      const cv = document.createElement("canvas");cv.width = W * S;cv.height = H * S;
      const ctx = cv.getContext("2d");ctx.scale(S, S);
      ctx.textBaseline = "alphabetic";

      // background + thin inner frame
      ctx.fillStyle = "#f7f6f0";ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#e0dccd";ctx.lineWidth = 1.5;ctx.strokeRect(22, 22, W - 44, H - 44);

      // ── header (top, centered) ──
      ctx.textAlign = "center";
      ctx.fillStyle = "#8c1a2e";ctx.font = "700 17px Archivo, sans-serif";
      ctx.fillText("B L O O M   C U L T U R E ™", cx, pad + 30);
      ctx.fillStyle = "#2b3c2c";ctx.font = "500 52px Cabin, serif";
      ctx.fillText("My Bloom Culture Mood Board", cx, pad + 86);
      ctx.strokeStyle = "#7e8d6e";ctx.lineWidth = 1.4;
      ctx.beginPath();ctx.moveTo(cx - 80, pad + 110);ctx.lineTo(cx - 26, pad + 110);ctx.moveTo(cx + 26, pad + 110);ctx.lineTo(cx + 80, pad + 110);ctx.stroke();
      if (logoImg) {const ls = 30;ctx.drawImage(logoImg, cx - ls / 2, pad + 110 - ls / 2, ls, ls);} else
      {ctx.fillStyle = "#aa2138";ctx.font = "16px Cabin, serif";ctx.textAlign = "center";ctx.fillText("\u2726", cx, pad + 115);}

      // ── photo collage (masonry, centered) ──
      const gx = (W - photoAreaW) / 2,gy = pad + headH;
      placed.forEach((p) => {
        const x = gx + p.x,y = gy + p.y;
        let sw, sh, sx, sy;const tr = p.w / p.h;
        if (p.ar > tr) {sh = p.im.height;sw = sh * tr;sx = (p.im.width - sw) / 2;sy = 0;} else
        {sw = p.im.width;sh = sw / tr;sx = 0;sy = (p.im.height - sh) / 2;}
        ctx.save();
        ctx.shadowColor = "rgba(58,52,44,.15)";ctx.shadowBlur = 16;ctx.shadowOffsetY = 5;
        ctx.fillStyle = "#fff";roundRect(ctx, x, y, p.w, p.h, 14);ctx.fill();
        ctx.restore();
        ctx.save();roundRect(ctx, x, y, p.w, p.h, 14);ctx.clip();
        ctx.drawImage(p.im, sx, sy, sw, sh, x, y, p.w, p.h);
        ctx.restore();
      });

      // ── palette row (bottom, centered circles + hex) ──
      const n = colors.length;
      const palCY = gy + collageH + palH / 2 + 4;
      ctx.textAlign = "center";
      ctx.fillStyle = "#384d39";ctx.font = "700 14px Archivo, sans-serif";
      ctx.fillText("Y O U R   C O L O R   P A L E T T E", cx, gy + collageH + 38);
      const chip = Math.min(88, (photoAreaW - (n - 1) * 22) / n);
      const palRowW = n * chip + (n - 1) * 22;
      let pxp = cx - palRowW / 2;
      colors.forEach((col) => {
        const ccy = palCY + 26;
        ctx.save();
        ctx.shadowColor = "rgba(58,52,44,.16)";ctx.shadowBlur = 12;ctx.shadowOffsetY = 4;
        ctx.fillStyle = hex(col);
        ctx.beginPath();ctx.arc(pxp + chip / 2, ccy, chip / 2, 0, Math.PI * 2);ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#5d685a";ctx.font = "600 12px Archivo, monospace";ctx.textAlign = "center";
        ctx.fillText(hex(col).toUpperCase(), pxp + chip / 2, ccy + chip / 2 + 22);
        pxp += chip + 22;
      });
      ctx.textAlign = "left";

      setPalette(colors.map(hex));
      const fileName = "My Bloom Culture Mood Board.png";
      const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
      const file = blob ? new File([blob], fileName, { type: "image/png" }) : null;
      // On phones, use the native share sheet (Save to Photos / share), no "downloads folder" on iOS
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "My Bloom Culture Mood Board" });
          setMsg("Tap \u201cSave Image\u201d to add it to your photos 🌸");
          setBusy(false);
          return;
        } catch (e) {
          if (e && e.name === "AbortError") {setBusy(false);return;}
        }
      }
      // Desktop fallback: normal download
      const url = cv.toDataURL("image/png");
      const a = document.createElement("a");a.href = url;a.download = fileName;a.click();
      setMsg("Saved! Check your downloads 🌸");
    } catch (e) {
      setMsg("Hmm, couldn't read those photos, try re-dropping them.");
    }
    setBusy(false);
  };

  const setSwatch = (i, val) => setPalette((p) => p.map((c, k) => k === i ? val : c));
  const pickEyedropper = async (i) => {
    if (!window.EyeDropper) {setMsg("Your browser doesn't support the eyedropper, tap the swatch to pick a color instead.");return;}
    try {const ed = new window.EyeDropper();const res = await ed.open();setSwatch(i, res.sRGBHex);} catch (e) {}
  };

  return (
    <div className="no-print" style={{ marginTop: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
        <button onClick={() => generate()} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 9,
          background: "var(--sage-deep)", color: "var(--cream)", border: "none", borderRadius: 999,
          padding: "13px 22px", fontSize: 14.5, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? .6 : 1 }}>
          <Icon name="spark" size={17} /> {busy ? "Creating…" : "Create my mood board + palette"}
        </button>
        {msg && <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>{msg}</span>}
      </div>

      {palette.length > 0 &&
      <div style={{ marginTop: 16, padding: "16px 18px", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)", maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>YOUR PALETTE</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Love the auto colors? You're done. Want to tweak? Adjust any swatch below.</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            {palette.map((c, i) =>
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <label style={{ position: "relative", width: 40, height: 40, borderRadius: "50%", background: c,
              border: "2px solid var(--paper)", boxShadow: "0 0 0 1px rgba(0,0,0,.08)", cursor: "pointer", display: "block" }}
            title="Tap to change this color">
                  <input type="color" value={c} onChange={(e) => setSwatch(i, e.target.value)}
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
                </label>
                <span className="mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>{c.toUpperCase()}</span>
                {window.EyeDropper &&
            <button onClick={() => pickEyedropper(i)} title="Pick from screen" style={{ fontSize: 9, color: "var(--sage-deep)", background: "var(--sage-tint)", border: "none", borderRadius: 999, padding: "3px 7px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5l-1.5-1.5a2 2 0 0 0-3 0L12 6l3 3 2.5-2.5a2 2 0 0 0 1.5-1.5z" /><path d="M14 8l-8 8v3h3l8-8" /></svg>
                  </button>
            }
              </div>
          )}
          </div>
          <button onClick={() => generate(palette)} disabled={busy} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8,
          background: "var(--paper)", color: "var(--sage-deep)", border: "1.5px solid var(--sage)", borderRadius: 999,
          padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="print" size={15} /> Download with my colors
          </button>
        </div>
      }
    </div>);

}

/* ── vessel-size guide: thumbnail + spec rows ── */
function VesselGuide({ vessels, accent }) {
  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{vessels.heading}</h3>
      {vessels.sub && <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 700, marginBottom: 18 }}>{vessels.sub}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 760 }}>
        {vessels.items.map((v, i) =>
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 15, background: "var(--paper)",
          border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "12px 16px 12px 12px", boxShadow: "var(--shadow-sm)" }}>
            {React.createElement("image-slot", {
            id: v.id, shape: "rounded", radius: "10", placeholder: "photo", static: "true",
            style: { width: "68px", height: "68px", flexShrink: 0, display: "block" }
          })}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 19 }}>{v.name}</span>
                <span className="mono" style={{ fontSize: 10, color: accent, background: "var(--sage-tint)", padding: "3px 9px", borderRadius: 999 }}>{v.spec}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 5, lineHeight: 1.45 }}>{v.note}</div>
            </div>
          </div>
        )}
      </div>
    </div>);

}

/* ── centerpiece size & recipe chart ── */
function CenterpieceChart({ chart, accent, go }) {
  return (
    <div style={{ marginTop: 44 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{chart.heading}</h3>
      {chart.sub && <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 720, marginBottom: 18 }}>{chart.sub}</p>}
      {/* size silhouette cue */}
      {chart.sizeCue &&
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", justifyContent: "flex-start",
        maxWidth: 680, marginBottom: 22, padding: "18px 20px 14px", background: "var(--paper)",
        border: "1px solid var(--line)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)" }}>
          {chart.sizeCue.map((s, i) =>
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 9 }}>
              <div style={{ display: "flex", alignItems: "flex-end", height: 96 }}>
                {/* simple vessel silhouette */}
                <div style={{ width: s.w, height: s.h, background: "var(--sage-tint)", border: `1.5px solid ${accent}`,
              borderRadius: "6px 6px 14px 14px", position: "relative" }}>
                  <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)", width: s.w * 0.5,
                height: 8, borderRadius: 999, background: accent, opacity: .5 }} />
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--serif)", fontSize: 16, color: "var(--ink)" }}>{s.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{s.sub}</div>
              </div>
            </div>
        )}
        </div>
      }
      <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "var(--shadow-sm)", maxWidth: 680 }}>
        {/* header */}
        <div className="cp-row" style={{ background: "var(--sage-deep)" }}>
          <div className="mono" style={{ padding: "12px 16px", fontSize: 9.5, color: "var(--cream)" }}>INGREDIENT</div>
          {chart.sizes.map((s, i) =>
          <div key={i} className="mono" style={{ padding: "12px 8px", fontSize: 9.5, color: "var(--cream)", textAlign: "center" }}>{s.label}</div>
          )}
        </div>
        {/* rows */}
        {chart.rows.map((r, ri) =>
        <div key={ri} className="cp-row" style={{ background: ri % 2 ? "var(--cream)" : "var(--paper)", borderTop: "1px solid var(--line)" }}>
            <div style={{ padding: "11px 16px", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{r}</div>
            {chart.sizes.map((s, si) =>
          <div key={si} style={{ padding: "11px 8px", fontSize: 14, textAlign: "center",
            color: s.vals[ri] === "-" ? "var(--ink-faint)" : "var(--ink-soft)" }}>{s.vals[ri]}</div>
          )}
          </div>
        )}
      </div>
      {chart.note &&
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, padding: "13px 16px",
        background: "var(--rose-tint)", borderRadius: "var(--radius-sm)", maxWidth: 680 }}>
          <Icon name="spark" size={15} style={{ color: "var(--rose-deep)", flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)" }}>{chart.note}</span>
        </div>
      }
      {chart.glossaryNote && go &&
      <button onClick={() => go("design")} className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, width: "100%", maxWidth: 680,
        fontSize: 14, fontWeight: 600, color: accent, background: "var(--sage-tint)", border: "none", borderRadius: "var(--radius-sm)", padding: "14px 16px", cursor: "pointer", textAlign: "left" }}>
          <Icon name="flower" size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{chart.glossaryNote}</span>
          <Icon name="arrowSm" size={16} style={{ flexShrink: 0 }} />
        </button>
      }
    </div>);

}

/* ── vase tally (editable + printable count) ── */
function VaseTally({ tally, accent, tint }) {
  const ref = useRefM();
  const [data, setData] = useLocal("vasetally", {});
  const set = (i, v) => setData((d) => ({ ...d, [i]: v.replace(/[^0-9]/g, "") }));
  const total = tally.rows.reduce((sum, _, i) => sum + (parseInt(data[i]) || 0), 0);
  return (
    <div ref={ref} style={{ marginTop: 44, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
      padding: "30px 32px 30px", boxShadow: "var(--shadow-sm)", maxWidth: 620 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
        <PrintableBadge targetRef={ref} tint={tint} accent={accent} />
        <h3 style={{ fontSize: 23 }}>{tally.heading}</h3>
      </div>
      {tally.sub && <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 20, lineHeight: 1.55 }}>{tally.sub}</p>}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {tally.rows.map((r, i) =>
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 4px",
          borderBottom: "1px solid var(--line)" }}>
            <span style={{ flex: 1, fontSize: 15, color: "var(--ink)" }}>{r}</span>
            <input value={data[i] || ""} onChange={(e) => set(i, e.target.value)} inputMode="numeric" placeholder="0"
          style={{ width: 56, textAlign: "center", border: "1.5px solid var(--line-strong)", borderRadius: 8,
            background: "var(--cream)", fontSize: 15, padding: "7px 4px", color: "var(--ink)", outline: "none", fontFamily: "var(--sans)" }}
          onFocus={(e) => e.target.style.borderColor = "var(--accent)"} onBlur={(e) => e.target.style.borderColor = "var(--line-strong)"} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 4px 2px" }}>
          <span className="mono" style={{ flex: 1, fontSize: 10, color: "var(--ink-faint)" }}>TOTAL VESSELS</span>
          <span style={{ width: 56, textAlign: "center", fontFamily: "var(--serif)", fontSize: 22, color: accent }}>{total}</span>
        </div>
      </div>
      {tally.shopHref &&
      <a href={tally.shopHref} target="_blank" rel="noopener" className="no-print"
      style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 9, marginTop: 18,
        padding: "12px 20px", borderRadius: 999, background: "var(--accent-deep)", color: "#fff", fontSize: 14, fontWeight: 600 }}>
          <Icon name="link" size={16} /> {tally.shopLabel} <Icon name="arrowSm" size={15} />
        </a>
      }
    </div>);

}

/* ── venue questions checklist (persistent, printable) ── */
function VenueQuestions({ vq, moduleId, accent, tint }) {
  const ref = useRefM();
  const [checked, setChecked] = useLocal("venueq." + moduleId, {});
  const [ans, setAns] = useLocal("venueq.ans." + moduleId, {});
  const [custom, setCustom] = useLocal("venueq.custom." + moduleId, []);
  const toggle = (i) => setChecked((c) => ({ ...c, [i]: !c[i] }));
  const setAnswer = (i, v) => setAns((a) => ({ ...a, [i]: v }));
  const setCustomAt = (i, v) => setCustom((arr) => arr.map((x, n) => n === i ? v : x));
  const addCustom = () => setCustom((arr) => [...arr, ""]);
  const removeCustom = (i) => setCustom((arr) => arr.filter((_, n) => n !== i));
  const emailVenue = () => {
    const L = [];
    L.push("Questions to ask our wedding venue 🌸");
    L.push("");
    vq.items.forEach((q, i) => {L.push("• " + q);if (ans[i] && ans[i].trim()) L.push("   → " + ans[i]);});
    custom.filter((q) => q && q.trim()).forEach((q) => L.push("• " + q));
    L.push("");L.push("Thanks so much!");
    window.location.href = "mailto:?subject=" + encodeURIComponent("Flower questions for our venue") + "&body=" + encodeURIComponent(L.join("\n"));
  };
  return (
    <div ref={ref} style={{ marginTop: 44, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
      padding: "28px 30px 30px", boxShadow: "var(--shadow-sm)", maxWidth: 680 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6, flexWrap: "wrap" }}>
        <button onClick={emailVenue} className="mono no-print" title="Email these questions to your venue"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--sage-tint)", color: "var(--sage-deep)",
          padding: "5px 11px", borderRadius: 999, fontSize: 10.5, cursor: "pointer", border: "none" }}>
          <Icon name="note" size={12} /> EMAIL
        </button>
        <span className="no-print"><PrintableBadge targetRef={ref} tint={tint} accent={accent} /></span>
        <h3 style={{ fontSize: 23 }}>{vq.heading}</h3>
      </div>
      {vq.sub && <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 18, lineHeight: 1.55 }}>{vq.sub}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {vq.items.map((q, i) =>
        <div key={i} style={{ padding: "4px 0" }}>
            <button onClick={() => toggle(i)} style={{ display: "flex", alignItems: "flex-start", gap: 13, textAlign: "left",
            width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", background: checked[i] ? "var(--sage-tint)" : "transparent",
            transition: "background .16s", color: "var(--ink)" }}
          onMouseEnter={(e) => {if (!checked[i]) e.currentTarget.style.background = "var(--cream)";}}
          onMouseLeave={(e) => {if (!checked[i]) e.currentTarget.style.background = "transparent";}}>
              <span style={{ width: 21, height: 21, borderRadius: 7, flexShrink: 0, marginTop: 1,
              border: checked[i] ? "none" : "1.6px solid var(--line-strong)", background: checked[i] ? accent : "var(--paper)",
              display: "grid", placeItems: "center", color: "#fff" }}>{checked[i] && <Icon name="check" size={13} stroke={2.6} />}</span>
              <span style={{ fontSize: 15, lineHeight: 1.5, fontWeight: 600, color: "var(--ink)" }}>{q}</span>
            </button>
            <input value={ans[i] || ""} onChange={(e) => setAnswer(i, e.target.value)} placeholder=""
          style={{ width: "calc(100% - 46px)", marginLeft: 34, marginTop: 4, border: "none", borderBottom: "1px dotted var(--line-strong)",
            background: "transparent", fontSize: 14, padding: "5px 2px", color: "var(--ink-soft)", outline: "none", fontFamily: "var(--sans)" }}
          onFocus={(e) => e.target.style.borderBottomColor = "var(--accent)"} onBlur={(e) => e.target.style.borderBottomColor = "var(--line-strong)"} />
          </div>
        )}
      </div>
      {/* your own questions */}
      <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", margin: "18px 0 8px", letterSpacing: ".14em" }}>YOUR OWN QUESTIONS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(custom.length ? custom : [""]).map((q, i) =>
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flexShrink: 0 }} />
            <input value={q || ""} onChange={(e) => {if (!custom.length) setCustom([e.target.value]);else setCustomAt(i, e.target.value);}}
          placeholder="Type your own question…"
          style={{ flex: 1, minWidth: 0, border: "none", borderBottom: "1px dotted var(--line-strong)", background: "transparent",
            fontSize: 15, padding: "6px 2px", color: "var(--ink)", outline: "none", fontFamily: "var(--sans)" }}
          onFocus={(e) => e.target.style.borderBottomColor = "var(--accent)"} onBlur={(e) => e.target.style.borderBottomColor = "var(--line-strong)"} />
            {custom.length > 0 && <button onClick={() => removeCustom(i)} className="no-print" title="Remove"
          style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, color: "var(--ink-faint)", background: "var(--cream)", border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon name="x" size={13} /></button>}
          </div>
        )}
      </div>
      <button onClick={addCustom} className="no-print" style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 7,
        fontSize: 13, fontWeight: 600, color: accent, background: "none", cursor: "pointer", padding: "4px 2px" }}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> Add a question
      </button>
    </div>);

}

/* ── day-of contact list (editable, printable) ── */
function ContactList({ contacts, accent, tint }) {
  const ref = useRefM();
  const [data, setData] = useLocal("dayofcontacts", {});
  const [helpers] = useLocal("helperlist", [{}]);
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const fmtPhone = (v) => {const d = (v || "").replace(/\D/g, "").slice(0, 10);if (d.length <= 3) return d;if (d.length <= 6) return d.slice(0, 3) + "-" + d.slice(3);return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);};
  const JOBLABEL = { j1: "Receive & Process", j2b: "Bridal Party / Bouquets", j2c: "Centerpieces",
    j2cer: "Ceremony Flowers", j3cer: "Ceremony Set-up", j3rec: "Reception Set-up", j4: "Tear-down & Clean-up" };
  const helperRoster = (helpers || []).filter((h) => h && (h.name || h.phone)).map((h) => {
    const roles = Object.keys(JOBLABEL).filter((k) => h[k]).map((k) => JOBLABEL[k]);
    return { name: h.name || "", phone: h.phone || "", roles };
  });
  const xcount = data.__xcount || 0;
  const extraRows = Array.from({ length: xcount }, (_, n) => ({ key: `x${n}`, label: data[`x${n}.label`] || "" })).filter((e) => !data[`${e.key}.removed`]);
  const allRows = [
  ...contacts.rows.map((r, i) => ({ key: String(i), label: r, fixed: true })),
  ...extraRows.map((e) => ({ key: e.key, label: e.label, fixed: false }))];

  const pickedNames = allRows.map((row) => data[`${row.key}.name`]).filter(Boolean);
  const remainingCrew = helperRoster.filter((h) => h.name && !pickedNames.includes(h.name));
  const emailContacts = () => {
    const L = [];
    L.push("Wedding day-of contact list 🌸");
    const others = allRows.map((row) => ({ r: (data[`${row.key}.label`] != null ? data[`${row.key}.label`] : row.label) || "Contact", nm: data[`${row.key}.name`] || "", ph: data[`${row.key}.phone`] || "" })).filter((x) => x.nm || x.ph);
    if (others.length) {
      L.push("");L.push("KEY CONTACTS:");
      others.forEach((x) => L.push("• " + x.r + ": " + x.nm + (x.ph ? ", " + x.ph : "")));
    }
    if (remainingCrew.length) {
      L.push("");L.push("FLOWER CREW:");
      remainingCrew.forEach((h) => L.push("• " + h.name + (h.phone ? ", " + h.phone : "") + (h.roles.length ? "  (" + h.roles.join(", ") + ")" : "")));
    }
    L.push("");L.push("Keep this handy on the big day!");
    window.location.href = "mailto:?subject=" + encodeURIComponent("Wedding day-of contact list") + "&body=" + encodeURIComponent(L.join("\n"));
  };
  const fieldStyle = { border: "none", borderBottom: "1px dotted var(--line-strong)", background: "transparent",
    fontSize: 14.5, padding: "5px 2px", color: "var(--ink)", outline: "none", fontFamily: "var(--sans)", width: "100%" };
  const onF = (e) => e.target.style.borderBottomColor = "var(--accent)";
  const onB = (e) => e.target.style.borderBottomColor = "var(--line-strong)";
  return (
    <div ref={ref} style={{ marginTop: 30, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
      padding: "28px 30px 30px", boxShadow: "var(--shadow-sm)", maxWidth: 680 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6, flexWrap: "wrap" }}>
        <button onClick={emailContacts} className="mono no-print" title="Email this contact list"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--sage-tint)", color: "var(--sage-deep)",
          padding: "5px 11px", borderRadius: 999, fontSize: 10.5, cursor: "pointer", border: "none" }}>
          <Icon name="note" size={12} /> EMAIL
        </button>
        <span className="no-print"><PrintableBadge targetRef={ref} tint={tint} accent={accent} /></span>
        <h3 style={{ fontSize: 23 }}>{contacts.heading}</h3>
      </div>
      {contacts.sub && <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 18, lineHeight: 1.55 }}>{contacts.sub}{contacts.subNote && <span className="no-print"> {contacts.subNote}</span>}</p>}

      {/* KEY CONTACTS, first, with crew dropdown */}
      <div className="mono" style={{ fontSize: 9, color: accent, marginBottom: 10, letterSpacing: ".14em" }}>KEY CONTACTS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {allRows.map((row) => {
          const k = row.key;
          const nameVal = data[`${k}.name`] || "";
          const isHelper = helperRoster.some((h) => h.name === nameVal);
          const customMode = !!data[`${k}.custom`];
          return (
            <div key={k} className={!nameVal && !data[`${k}.phone`] ? "no-print" : ""} style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px", minWidth: 0 }}>
              <input value={data[`${k}.label`] != null ? data[`${k}.label`] : row.label}
                onChange={(e) => set(`${k}.label`, e.target.value)} onFocus={onF} onBlur={onB}
                placeholder={row.fixed ? "Label" : "Label (e.g. Officiant)"} className="mono"
                style={{ ...fieldStyle, fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 6, padding: "2px 2px" }} />
              {customMode ?
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input value={nameVal} onChange={(e) => set(`${k}.name`, e.target.value)} onFocus={onF} onBlur={onB}
                  placeholder="Type a name" autoFocus style={fieldStyle} />
                    <button onClick={() => {set(`${k}.custom`, false);set(`${k}.name`, "");set(`${k}.phone`, "");}} title="Pick from list instead"
                  className="no-print" style={{ flexShrink: 0, fontSize: 9, color: "var(--ink-faint)", background: "var(--cream)", border: "none",
                    borderRadius: 999, padding: "5px 9px", cursor: "pointer", fontFamily: "var(--mono)", letterSpacing: ".1em" }}>↺ LIST</button>
                  </div> :
                <select value={isHelper ? nameVal : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom") {set(`${k}.custom`, true);set(`${k}.name`, "");} else
                  if (v === "") {set(`${k}.custom`, false);set(`${k}.name`, "");set(`${k}.phone`, "");} else
                  {const m = helperRoster.find((h) => h.name === v);set(`${k}.custom`, false);set(`${k}.name`, v);if (m && m.phone) set(`${k}.phone`, m.phone);}
                }}
                style={{ ...fieldStyle, height: "32px", border: "1.5px solid var(--line-strong)", borderRadius: 8, padding: "0 8px", cursor: "pointer", borderBottom: "1.5px solid var(--line-strong)" }}>
                    <option value="">- choose -</option>
                    {helperRoster.length > 0 &&
                  <optgroup label="Your flower crew">
                        {helperRoster.map((h, n) => <option key={n} value={h.name}>{h.name}</option>)}
                      </optgroup>
                  }
                    <option value="__custom">+ Enter someone else…</option>
                  </select>}
            </div>
            <div style={{ flex: "1 1 140px", minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 6 }}>PHONE</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input value={data[`${k}.phone`] || ""} onChange={(e) => set(`${k}.phone`, fmtPhone(e.target.value))} onFocus={onF} onBlur={onB}
                  placeholder="555-555-5555" style={fieldStyle} />
                {!row.fixed &&
                  <button onClick={() => {["name", "phone", "label", "custom"].forEach((f) => set(`${k}.${f}`, undefined));set(`${k}.removed`, true);}}
                  title="Remove this contact" className="no-print" style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%",
                    display: "grid", placeItems: "center", color: "var(--ink-faint)", background: "var(--cream)", border: "none", cursor: "pointer" }}>
                    <Icon name="x" size={13} /></button>
                  }
              </div>
            </div>
          </div>);

        })}
      </div>
      <button onClick={() => set("__xcount", xcount + 1)} className="no-print" style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 7,
        fontSize: 13, fontWeight: 600, color: accent, background: "none", cursor: "pointer", padding: "4px 2px" }}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> Add a contact
      </button>

      {/* FLOWER CREW, at the bottom, only those NOT already a key contact */}
      {remainingCrew.length > 0 &&
      <div style={{ marginTop: 26 }}>
          <div className="mono" style={{ fontSize: 9, color: accent, marginBottom: 10, letterSpacing: ".14em" }}>{contacts.crewLabel || "MORE FLOWER HELPERS"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {remainingCrew.map((h, i) =>
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", padding: "9px 12px", background: "var(--sage-tint)", borderRadius: "var(--radius-sm)" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{h.name || "(unnamed helper)"}</span>
                {h.phone && <span style={{ fontSize: 14, color: "var(--ink-soft)" }}>{h.phone}</span>}
                {h.roles.length > 0 && <span className="mono" style={{ fontSize: 9, color: "var(--sage-deep)", marginLeft: "auto" }}>{h.roles.join(" · ")}</span>}
              </div>
          )}
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 9 }}>Auto-filled from your Helper Assignment Sheets. Anyone you set as a Key Contact above won't be repeated here.</p>
        </div>
      }
    </div>);

}

/* ── venue placement diagram (clean example + legend + how-to + drop slot) ── */
function VenueDiagram({ vd, accent }) {
  return (
    <div style={{ marginTop: 44 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{vd.heading}</h3>
      {vd.sub && <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 700, marginBottom: 22 }}>{vd.sub}</p>}

      {/* clean example diagram + legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "stretch", marginBottom: 30 }}>
        <div style={{ flex: "2 1 340px", minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--rose-deep)", marginBottom: 8 }}>✦ EXAMPLE DIAGRAM</div>
          <ExampleFloorPlan accent={accent} />
        </div>
        {vd.legend &&
        <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 9, color: "var(--rose-deep)", marginBottom: 8 }}>LEGEND</div>
            <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
              {vd.legend.map((it, i) =>
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "7px 0",
              borderBottom: i < vd.legend.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
                background: "var(--sage-deep)", color: "#fff", fontFamily: "var(--serif)", fontSize: 13 }}>{it.k}</span>
                  <span style={{ fontSize: 13.5, color: "var(--ink)" }}>{it.v}</span>
                </div>
            )}
            </div>
          </div>
        }
      </div>

      {/* make your own: how-to + drop slot */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start", borderTop: "1px solid var(--line)", paddingTop: 26 }}>
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <h4 style={{ fontSize: 18, marginBottom: 14 }}>Make your own</h4>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {vd.steps.map((s, i) =>
            <li key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
                background: "var(--sage-tint)", color: "var(--sage-deep)", fontFamily: "var(--serif)", fontSize: 15 }}>{i + 1}</span>
                <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ink)", paddingTop: 3 }}>{s}</span>
              </li>
            )}
          </ol>
        </div>
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <div style={{ borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)" }}>
            {React.createElement("image-slot", {
              id: vd.imgId, shape: "rect", placeholder: "Drop your venue diagram",
              style: { width: "100%", aspectRatio: "4 / 3", display: "block" }
            })}
          </div>
          {vd.caption && <p style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 8, textAlign: "center" }}>{vd.caption}</p>}
        </div>
      </div>
    </div>);

}

/* ── clean schematic example floor plan ── */
function ExampleFloorPlan({ accent }) {
  const tables = [
  { l: "A", x: 22, y: 34 }, { l: "B", x: 50, y: 30 }, { l: "C", x: 78, y: 34 },
  { l: "A", x: 22, y: 72 }, { l: "B", x: 50, y: 76 }, { l: "C", x: 78, y: 72 }];

  const zone = (label, style) =>
  <div className="mono" style={{ position: "absolute", fontSize: 8, letterSpacing: ".12em", color: "var(--ink-faint)",
    background: "var(--cream-deep)", padding: "4px 7px", borderRadius: 5, whiteSpace: "nowrap", transform: "translate(-50%,-50%)", ...style }}>{label}</div>;

  const badge = (l, style) =>
  <span style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", transform: "translate(-50%,-50%)",
    background: accent, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontSize: 12,
    boxShadow: "0 0 0 2px var(--paper)", ...style }}>{l}</span>;

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "var(--paper)",
      border: "1.5px solid var(--line-strong)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
      {/* dance floor */}
      <div className="mono" style={{ position: "absolute", left: "50%", top: "53%", transform: "translate(-50%,-50%)",
        width: "30%", height: "20%", border: "1.5px dashed var(--line-strong)", borderRadius: 8, display: "grid", placeItems: "center",
        fontSize: 9, letterSpacing: ".1em", color: "var(--ink-soft)", textAlign: "center", lineHeight: 1.15 }}>DANCE FLOOR</div>
      {/* sweetheart table */}
      <div style={{ position: "absolute", left: "50%", top: "12%", transform: "translate(-50%,-50%)", width: "22%", height: "8%",
        background: "var(--sage-tint)", border: "1px solid var(--sage)", borderRadius: 6, display: "grid", placeItems: "center" }}>
        <span className="mono" style={{ fontSize: 7.5, color: "var(--sage-deep)", letterSpacing: ".08em" }}>SWEETHEART</span>
      </div>
      {/* guest tables */}
      {tables.map((t, i) =>
      <div key={i} style={{ position: "absolute", left: `${t.x}%`, top: `${t.y}%`, transform: "translate(-50%,-50%)",
        width: 38, height: 38, borderRadius: "50%", background: "var(--cream)", border: "1.5px solid var(--line-strong)",
        display: "grid", placeItems: "center" }}>
          <span style={{ width: 21, height: 21, borderRadius: "50%", background: accent, color: "#fff", display: "grid", placeItems: "center",
          fontFamily: "var(--serif)", fontSize: 12 }}>{t.l}</span>
        </div>
      )}
      {/* extra arrangement + repurposed badges */}
      {badge("D", { left: "13%", top: "88%" })}
      {badge("E", { left: "63%", top: "10%" })}
      {badge("F", { left: "50%", top: "5%" })}
      {/* zone labels */}
      {zone("CAKE", { left: "85%", top: "10%" })}
      {zone("BUFFET", { left: "10%", top: "53%" })}
      {zone("BAR", { left: "90%", top: "53%" })}
      {zone("DJ", { left: "85%", top: "90%" })}
      {zone("ENTRY", { left: "50%", top: "95%" })}
    </div>);

}

/* ── editable + printable Transportation Checklist ── */
function TransportWorksheet({ accent, tint }) {
  const ref = useRefM();
  const [data, setData] = useLocal("transportlist", {});
  const rows = Array.from({ length: 12 });
  const get = (i, f) => data[`${i}.${f}`] || "";
  const set = (i, f, v) => setData((d) => ({ ...d, [`${i}.${f}`]: v }));
  const toggle = (i) => setData((d) => ({ ...d, [`${i}.loaded`]: !d[`${i}.loaded`] }));
  const gv = (k) => data[k] || "";
  const sv = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const inputStyle = { border: "none", borderBottom: "1px dotted var(--line-strong)", background: "transparent",
    fontSize: 14.5, padding: "4px 2px", color: "var(--ink)", outline: "none", fontFamily: "var(--sans)", width: "100%" };
  const onF = (e) => e.target.style.borderBottomColor = "var(--accent)";
  const onB = (e) => e.target.style.borderBottomColor = "var(--line-strong)";
  const emailTransport = () => {
    const L = [];
    L.push("Flower transport plan 🌸, thank you for driving our blooms!");
    L.push("");
    if (gv("driver")) L.push("Driver: " + gv("driver"));
    if (gv("vehicle")) L.push("Vehicle: " + gv("vehicle"));
    if (gv("dest")) L.push("Driving to: " + gv("dest"));
    if (gv("addr")) L.push("Address: " + gv("addr"));
    if (gv("leave")) L.push("Leave by: " + gv("leave"));
    L.push("");
    L.push("WHAT'S IN THE VEHICLE:");
    for (let i = 0; i < rows.length; i++) {
      const a = get(i, "arr");if (!a) continue;
      const q = get(i, "qty");
      L.push("• " + (q ? q + " × " : "") + a);
    }
    L.push("");
    L.push("Transport tips: keep boxes upright, pad between vessels, drive gently, and empty water before loading. 💛");
    window.location.href = "mailto:?subject=" + encodeURIComponent("Flower transport plan") + "&body=" + encodeURIComponent(L.join("\n"));
  };
  const headerFields = [["DRIVER", "driver"], ["VEHICLE", "vehicle"], ["DRIVING TO", "dest"], ["LEAVE BY", "leave"]];
  const addressField = ["DESTINATION ADDRESS", "addr"];
  return (
    <div ref={ref} style={{ marginTop: 42, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
      padding: "30px 32px 34px", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6, flexWrap: "wrap" }}>
        <button onClick={emailTransport} className="mono no-print" title="Email this plan to your driver"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--sage-tint)", color: "var(--sage-deep)",
          padding: "5px 11px", borderRadius: 999, fontSize: 10.5, cursor: "pointer", border: "none" }}>
          <Icon name="note" size={12} /> EMAIL
        </button>
        <span className="no-print"><PrintableBadge targetRef={ref} tint={tint} accent={accent} /></span>
        <h3 style={{ fontSize: 23 }}>Transportation Checklist</h3>
      </div>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 20, maxWidth: 640 }}>
        One sheet per vehicle: fill in who's driving and where, list what's riding along, and check things off as they're loaded. <strong>Email</strong> it to your driver or <strong>print</strong> a copy.
      </p>
      {/* trip header card */}
      <div style={{ background: "var(--cream)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)",
        padding: "18px 20px", marginBottom: 22 }}>
        <div className="mono" style={{ fontSize: 9.5, color: "var(--sage-deep)", marginBottom: 14, letterSpacing: ".14em" }}>THIS TRIP</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 24px" }}>
          {headerFields.map(([lab, k]) =>
          <div key={k} style={{ flex: "1 1 150px", minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 5 }}>{lab}</div>
              <input value={gv(k)} onChange={(e) => sv(k, e.target.value)} onFocus={onF} onBlur={onB}
                placeholder={k === "dest" ? "e.g. Ceremony venue" : ""} style={inputStyle} />
            </div>
          )}
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 5 }}>DESTINATION ADDRESS</div>
          <input value={gv("addr")} onChange={(e) => sv("addr", e.target.value)} onFocus={onF} onBlur={onB}
            placeholder="Street, city, paste from maps" style={inputStyle} />
        </div>
      </div>
      {/* what's loaded */}
      <div className="mono" style={{ fontSize: 9.5, color: "var(--sage-deep)", marginBottom: 10, letterSpacing: ".14em" }}>WHAT'S LOADED</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 4px 8px", borderBottom: "1px solid var(--line)" }}>
        <span className="mono" style={{ flex: 1, fontSize: 9, color: "var(--ink-faint)" }}>ARRANGEMENT</span>
        <span className="mono" style={{ width: 54, flexShrink: 0, fontSize: 9, color: "var(--ink-faint)", textAlign: "center" }}>QTY</span>
        <span className="mono" style={{ width: 60, flexShrink: 0, fontSize: 9, color: "var(--ink-faint)", textAlign: "center" }}>LOADED</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((_, i) => {
          const loaded = !!data[`${i}.loaded`];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 4px",
              borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
              <input value={get(i, "arr")} onChange={(e) => set(i, "arr", e.target.value)} onFocus={onF} onBlur={onB}
              placeholder={i === 0 ? "e.g. Tall centerpiece" : ""} style={{ ...inputStyle, flex: 1,
                textDecoration: loaded ? "line-through" : "none", color: loaded ? "var(--ink-faint)" : "var(--ink)" }} />
              <input value={get(i, "qty")} onChange={(e) => set(i, "qty", e.target.value)} onFocus={onF} onBlur={onB} style={{ ...inputStyle, width: 54, flexShrink: 0, textAlign: "center" }} />
              <div style={{ width: 60, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                <button onClick={() => toggle(i)} style={{ width: 24, height: 24, borderRadius: 7,
                  border: loaded ? "none" : "1.5px solid var(--line-strong)", background: loaded ? accent : "var(--cream)",
                  display: "grid", placeItems: "center", color: "#fff" }}>{loaded && <Icon name="check" size={13} stroke={2.6} />}</button>
              </div>
            </div>);

        })}
      </div>
    </div>);

}

/* ── editable + printable Helper Assignment Sheet ── */
function HelperWorksheet({ accent, tint }) {
  const [helpers, setHelpers] = useLocal("helperlist", [{}]);
  const updateH = (i, k, v) => setHelpers((hs) => hs.map((h, x) => x === i ? { ...h, [k]: v } : h));
  const toggleH = (i, k) => setHelpers((hs) => hs.map((h, x) => x === i ? { ...h, [k]: !h[k] } : h));
  const addHelper = () => setHelpers((hs) => [...hs, {}]);
  const removeHelper = (i) => setHelpers((hs) => hs.length > 1 ? hs.filter((_, x) => x !== i) : hs);
  return (
    <div style={{ marginTop: 42 }}>
      <h3 style={{ fontSize: 23, marginBottom: 6 }}>Helper Assignment Sheets</h3>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 22, maxWidth: 660 }}>
        Add a sheet for each helper, they save as you type. Then <strong>Email</strong> or <strong>Print</strong> any card to send that helper everything they need, their jobs, arrangements, and tutorial links all included.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {helpers.map((h, i) =>
        <HelperCard key={i} h={h} i={i} count={helpers.length} update={updateH} onToggle={toggleH} onRemove={removeHelper} accent={accent} tint={tint} />
        )}
      </div>
      <button onClick={addHelper} style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8,
        padding: "11px 18px", borderRadius: 999, border: "1.5px solid var(--line-strong)", background: "var(--paper)",
        color: "var(--ink)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add another helper
      </button>
    </div>);

}

/* ── custom arrangement picker: thumbnails + add-your-own ── */
function ArrangementPicker({ value, onChange, items, accent, done }) {
  const [open, setOpen] = useStateM(false);
  const [adding, setAdding] = useStateM(false);
  const [custom, setCustom] = useStateM("");
  const found = items.find((a) => a.name === value);
  const thumb = found && found.thumb || null;
  const Tile = ({ src }) => {
    const [failed, setFailed] = useStateM(false);
    return src && !failed ?
    <img src={src} alt="" onError={() => setFailed(true)} style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} /> :
    <span style={{ width: 30, height: 30, borderRadius: 7, background: "var(--sage-tint)", color: accent, display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="flower" size={16} /></span>;
  };
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "6px 10px", borderRadius: 8, border: "1.5px solid var(--line-strong)", background: "var(--paper)",
        cursor: "pointer", textAlign: "left", color: "var(--ink)" }}>
        <Tile src={thumb} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          color: value ? done ? "var(--ink-faint)" : "var(--ink)" : "var(--ink-faint)", textDecoration: done ? "line-through" : "none" }}>
          {value || "- choose -"}
        </span>
        <Icon name="chevron" size={15} style={{ color: "var(--ink-faint)", flexShrink: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform .18s" }} />
      </button>
      {open &&
      <React.Fragment>
          <div onClick={() => {setOpen(false);setAdding(false);}} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 41, maxHeight: 280, overflowY: "auto",
          background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 6 }}>
            {value && <button onClick={() => {onChange("");setOpen(false);}} style={{ width: "100%", textAlign: "left", padding: "8px 10px",
            fontSize: 13, color: "var(--ink-faint)", background: "none", cursor: "pointer", borderRadius: 7 }}>- clear -</button>}
            {items.map((a) =>
          <button key={a.name} onClick={() => {onChange(a.name);setOpen(false);}} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "7px 10px", borderRadius: 8, background: a.name === value ? "var(--sage-tint)" : "none", cursor: "pointer", textAlign: "left", color: "var(--ink)" }}
          onMouseEnter={(e) => {if (a.name !== value) e.currentTarget.style.background = "var(--cream)";}}
          onMouseLeave={(e) => {if (a.name !== value) e.currentTarget.style.background = "none";}}>
                <Tile src={a.thumb} />
                <span style={{ fontSize: 14, lineHeight: 1.3 }}>{a.name}</span>
              </button>
          )}
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 4 }}>
              {adding ?
            <div style={{ display: "flex", gap: 6, padding: "4px 6px" }}>
                    <input autoFocus value={custom} onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {if (e.key === "Enter" && custom.trim()) {onChange(custom.trim());setCustom("");setAdding(false);setOpen(false);}}}
              placeholder="Type a custom arrangement…"
              style={{ flex: 1, minWidth: 0, fontSize: 13.5, padding: "7px 9px", borderRadius: 7, border: "1.5px solid var(--accent)", outline: "none", fontFamily: "var(--sans)" }} />
                    <button onClick={() => {if (custom.trim()) {onChange(custom.trim());setCustom("");setAdding(false);setOpen(false);}}}
              style={{ background: accent, color: "#fff", border: "none", borderRadius: 7, padding: "0 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Add</button>
                  </div> :
            <button onClick={() => setAdding(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px",
              fontSize: 13.5, fontWeight: 600, color: accent, background: "none", cursor: "pointer", borderRadius: 7 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add your own
                  </button>}
            </div>
          </div>
        </React.Fragment>
      }
    </div>);

}

function HelperCard({ h, i, count, update, onToggle, onRemove, accent, tint }) {
  const ref = useRefM();
  const get = (k) => h[k] || "";
  const set = (k, v) => update(i, k, v);
  const toggle = (k) => onToggle(i, k);
  const fieldStyle = { border: "none", borderBottom: "1px dotted var(--line-strong)", background: "transparent",
    fontSize: 14.5, padding: "5px 2px", color: "var(--ink)", outline: "none", fontFamily: "var(--sans)", width: "100%" };
  const onF = (e) => e.target.style.borderBottomColor = "var(--accent)";
  const onB = (e) => e.target.style.borderBottomColor = "var(--line-strong)";
  const jobs = [
  ["j1", "Job 1, Receive & Process", "1"],
  ["j2b", "Job 2, Bridal Party / Bouquets", "2"],
  ["j2c", "Job 2, Centerpieces", "2"],
  ["j2cer", "Job 2, Ceremony Flowers", "2"],
  ["j3cer", "Job 3, Ceremony Set-up", "3"],
  ["j3rec", "Job 3, Reception Set-up", "3"],
  ["j4", "Job 4, Tear-down & Clean-up", "4"]];

  const fmtPhone = (v) => {
    const d = (v || "").replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return d.slice(0, 3) + "-" + d.slice(3);
    return d.slice(0, 3) + "-" + d.slice(3, 6) + "-" + d.slice(6);
  };
  const fld = ({ label, k, flex, type }) =>
  <div style={{ flex: flex || "1 1 180px", minWidth: 0 }}>
      <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 5 }}>{label}</div>
      <input type={type === "tel" ? "tel" : type || "text"} value={get(k)}
    onChange={(e) => set(k, type === "tel" ? fmtPhone(e.target.value) : e.target.value)} onFocus={onF} onBlur={onB}
    placeholder={type === "tel" ? "555-555-5555" : undefined}
    style={{ ...fieldStyle, height: "30px", boxSizing: "border-box", lineHeight: "20px", ...(type === "date" || type === "time" ? { fontFamily: "var(--sans)", colorScheme: "light" } : {}) }} />
    </div>;

  const emailHelper = () => {
    const fmtTime = (t) => {
      if (!t || t.indexOf(":") < 0) return t;
      let [hh, mm] = t.split(":").map(Number);
      const ap = hh >= 12 ? "PM" : "AM";
      hh = hh % 12 || 12;
      return hh + ":" + String(mm).padStart(2, "0") + " " + ap;
    };
    const jobsList = jobs.filter(([k]) => h[k]).map(([k, l, num]) => [l, num]);
    const L = [];
    const rule = "──────────────────────";
    L.push("Hi" + (get("name") ? " " + get("name") : "") + "! 🌸");
    L.push("");
    L.push("Here's your flower assignment for our DIY wedding flowers, thank you SO much for helping. Everything you need is below, including video tutorials for each arrangement.");
    L.push("");
    L.push(rule);
    L.push("THE DETAILS");
    L.push(rule);
    if (get("date")) L.push("Date:  " + get("date"));
    if (get("location")) L.push("Location:  " + get("location"));
    if (get("time")) L.push("Time:  " + fmtTime(get("time")));
    if (jobsList.length) {
      L.push("");L.push(rule);L.push("YOUR JOB(S)");L.push(rule);
      const jobItems = (window.BC.byId.helpers.jobs || {}).items || [];
      const seen = {};
      jobsList.forEach(([label, num]) => {
        L.push("");
        L.push(label.toUpperCase());
        if (num === "1") L.push("   ▸ Getting started video:  https://youtu.be/TJcue3iFRmw");
        if (seen[num]) return;
        seen[num] = true;
        const job = jobItems.find((j) => j.n === num);
        if (job) job.steps.forEach((s) => L.push("   • " + s));
      });
    }
    let arrIntroPushed = false;
    window.BC.arrangements.forEach((g, gi) => {
      const rows = h[`a${gi}_count`] || 3;
      const picked = [];
      for (let n = 0; n < rows; n++) {
        const v = h[`a${gi}_${n}`];
        if (!v) continue;
        const match = g.items.find((x) => x.name === v);
        const url = match && match.tut ? match.tut.indexOf("http") === 0 ? match.tut : window.BC.tutorialURLs[match.tut] : null;
        picked.push({ name: v, url });
      }
      if (picked.length) {
        if (!arrIntroPushed) {
          L.push("");L.push(rule);L.push("THE ARRANGEMENTS YOU'LL HELP MAKE");L.push(rule);
          L.push("Tap any link to watch the step-by-step tutorial!");
          arrIntroPushed = true;
        }
        L.push("");
        L.push(g.group.toUpperCase());
        picked.forEach((p) => {
          L.push("   • " + p.name);
          if (p.url) L.push("      ▸ Watch:  " + p.url);
        });
      }
    });
    if (get("notes")) {L.push("");L.push(rule);L.push("NOTES");L.push(rule);L.push(get("notes"));}
    L.push("");L.push("Can't wait, xo");
    const subject = "Your wedding flower assignment" + (get("name") ? ", " + get("name") : "");
    window.location.href = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(L.join("\n"));
  };
  return (
    <div ref={ref} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
      padding: "24px 26px 28px", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }}>
        <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--sage-deep)", color: "#fff",
          display: "grid", placeItems: "center", fontFamily: "var(--serif)", fontSize: 15, flexShrink: 0 }}>{i + 1}</span>
        <h4 style={{ fontSize: 19, flex: 1 }}>Helper {i + 1}</h4>
        <button onClick={emailHelper} title="Email this assignment to your helper" className="mono no-print"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--sage-tint)", color: "var(--sage-deep)",
          padding: "5px 11px", borderRadius: 999, fontSize: 10.5, cursor: "pointer", border: "none" }}>
          <Icon name="note" size={12} /> EMAIL
        </button>
        <span className="no-print"><PrintableBadge targetRef={ref} tint={tint} accent={accent} /></span>
        {count > 1 && <button onClick={() => onRemove(i)} title="Remove helper" className="no-print" style={{ width: 30, height: 30, borderRadius: "50%",
          display: "grid", placeItems: "center", color: "var(--ink-faint)", background: "var(--cream)", flexShrink: 0 }}><Icon name="x" size={15} /></button>}
      </div>

      {/* ===== EDITING UI (screen only) ===== */}
      <div className="helper-edit">
      {/* top fields */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "18px 24px", marginBottom: 24, alignItems: "flex-end" }}>
        {fld({ label: "HELPER NAME", k: "name", flex: "1 1 200px" })}
        {fld({ label: "PHONE", k: "phone", flex: "1 1 130px", type: "tel" })}
        {fld({ label: "DATE", k: "date", flex: "1 1 130px", type: "date" })}
        {fld({ label: "LOCATION", k: "location", flex: "1 1 180px" })}
        {fld({ label: "TIME", k: "time", flex: "1 1 110px", type: "time" })}
      </div>
      {/* job assignment checkboxes */}
      <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 10 }}>JOB ASSIGNMENT</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "8px 18px", marginBottom: 24 }} className="helper-jobs">
        {jobs.map(([k, label]) => {
            const on = !!h[k];
            return (
              <button key={k} onClick={() => toggle(k)} style={{ display: "flex", alignItems: "center", gap: 11, textAlign: "left",
                padding: "9px 12px", borderRadius: "var(--radius-sm)", background: on ? "var(--sage-tint)" : "transparent",
                border: "1px solid", borderColor: on ? "transparent" : "var(--line)", color: "var(--ink)", transition: "all .15s" }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: on ? "none" : "1.6px solid var(--line-strong)",
                  background: on ? accent : "var(--paper)", display: "grid", placeItems: "center", color: "#fff" }}>
                {on && <Icon name="check" size={12} stroke={2.6} />}</span>
              <span style={{ fontSize: 14, fontWeight: on ? 600 : 400 }}>{label}</span>
            </button>);

          })}
      </div>
      {/* arrangements, 3 sections (Wedding Party / Ceremony / Reception), each scoped dropdown + add your own */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: -6 }}>FLOWER ARRANGING ASSIGNMENT</div>
        {window.BC.arrangements.map((g, gi) => {
            const countKey = `a${gi}_count`;
            const rows = h[countKey] || 3;
            return (
              <div key={gi} style={{ width: "100%" }}>
              <div className="mono" style={{ fontSize: 9, color: accent, marginBottom: 10, letterSpacing: ".14em" }}>{g.group.toUpperCase()}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Array.from({ length: rows }).map((_, n) => {
                    const key = `a${gi}_${n}`,dk = `${key}_d`,on = !!h[dk];
                    const val = get(key);
                    const found = g.items.find((a) => a.name === val);
                    const tutURL = found && found.tut ? found.tut.indexOf("http") === 0 ? found.tut : window.BC.tutorialURLs[found.tut] : null;
                    return (
                      <div key={n} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <button onClick={() => toggle(dk)} style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          border: on ? "none" : "1.6px solid var(--line-strong)", background: on ? accent : "var(--paper)",
                          display: "grid", placeItems: "center", color: "#fff" }}>{on && <Icon name="check" size={12} stroke={2.6} />}</button>
                      <ArrangementPicker value={val} onChange={(v) => set(key, v)} items={g.items} accent={accent} done={on} />
                      {tutURL && window.BC.qrMap[tutURL] &&
                        <img className="print-only-qr" src={window.BC.qrMap[tutURL]} alt="" aria-hidden="true"
                        style={{ display: "none", width: 54, height: 54, flexShrink: 0 }} />
                        }
                      {tutURL ?
                        <a href={tutURL} target="_blank" rel="noopener" className="mono no-print" title="Watch the tutorial"
                        style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9, color: accent,
                          background: "var(--sage-tint)", padding: "6px 10px", borderRadius: 999, textDecoration: "none" }}>
                            <Icon name="play" size={12} /> TUTORIAL
                          </a> :
                        <span className="no-print" style={{ width: 74, flexShrink: 0 }} />}
                    </div>);

                  })}
              </div>
              <button onClick={() => set(countKey, rows + 1)} style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 7,
                  fontSize: 12.5, fontWeight: 600, color: accent, background: "none", cursor: "pointer", padding: "3px 2px" }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add another
              </button>
            </div>);

          })}
        <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: -4 }}>Pick from each list (or add your own), the matching tutorial links automatically and rides along in the print &amp; email.</p>
        <div style={{ width: "100%" }}>
          <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 7 }}>SPECIAL NOTES</div>
          <textarea value={get("notes")} onChange={(e) => set("notes", e.target.value)} onFocus={onF} onBlur={onB}
            style={{ ...fieldStyle, minHeight: 64, resize: "vertical", borderBottom: "1px dotted var(--line-strong)", lineHeight: 1.6 }} />
        </div>
      </div>
      </div>{/* end .helper-edit */}

      {/* ===== PRINT SUMMARY (print only) ===== */}
      <HelperPrintSummary h={h} get={get} jobs={jobs} accent={accent} />
    </div>);

}

/* ── clean print-only summary of a helper's assignment ── */
function HelperPrintSummary({ h, get, jobs, accent }) {
  const jobItems = (window.BC.byId.helpers.jobs || {}).items || [];
  const chosenJobs = jobs.filter(([k]) => h[k]);
  const seen = {};
  const fmtTime = (t) => {
    if (!t || t.indexOf(":") < 0) return t;
    let [hh, mm] = t.split(":").map(Number);
    const ap = hh >= 12 ? "PM" : "AM";hh = hh % 12 || 12;
    return hh + ":" + String(mm).padStart(2, "0") + " " + ap;
  };
  const fmtDate = (d) => {
    if (!d) return d;
    const dt = new Date(d + "T00:00:00");
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };
  const Label = ({ children }) =>
  <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".14em", margin: "18px 0 8px" }}>{children}</div>;

  // gather selected arrangements per group
  const groups = window.BC.arrangements.map((g, gi) => {
    const rows = h[`a${gi}_count`] || 3;
    const picks = [];
    for (let n = 0; n < rows; n++) {const v = h[`a${gi}_${n}`];if (v) picks.push({ name: v, item: g.items.find((x) => x.name === v) });}
    return { group: g.group, picks };
  }).filter((g) => g.picks.length);
  return (
    <div className="helper-print">
      {/* details */}
      <Label>THE DETAILS</Label>
      <div style={{ fontSize: 14.5, lineHeight: 1.7 }}>
        {get("name") && <div><strong>Helper:</strong> {get("name")}</div>}
        {get("date") && <div><strong>Date:</strong> {fmtDate(get("date"))}</div>}
        {get("location") && <div><strong>Location:</strong> {get("location")}</div>}
        {get("time") && <div><strong>Time:</strong> {fmtTime(get("time"))}</div>}
      </div>

      {/* QR disclaimer */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 16, padding: "11px 14px",
        background: "var(--sage-tint)", borderRadius: 8 }}>
        <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>
          📱 <strong>Scan the QR codes</strong> below with your phone camera to watch the step-by-step video tutorial for each job and arrangement.
        </span>
      </div>

      {/* jobs with detail */}
      <Label>YOUR JOB(S)</Label>
      {chosenJobs.length ? chosenJobs.map(([k, label, num]) => {
        const showSteps = !seen[num];seen[num] = true;
        const job = jobItems.find((j) => j.n === num);
        return (
          <div key={k} style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 16, marginBottom: 4 }}>{label}</div>
            {num === "1" &&
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0 8px" }}>
                {window.BC.qrMap["https://youtu.be/TJcue3iFRmw"] &&
              <img src={window.BC.qrMap["https://youtu.be/TJcue3iFRmw"]} alt="" style={{ width: 48, height: 48, flexShrink: 0 }} />}
                <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>Getting started video, scan to watch</span>
              </div>
            }
            {showSteps && job &&
            <ul style={{ margin: 0, paddingLeft: 18 }}>
                {job.steps.map((s, si) => <li key={si} style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink)" }}>{s}</li>)}
              </ul>
            }
          </div>);

      }) : <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>None needed.</div>}

      {/* arranging */}
      <Label>FLOWER ARRANGING ASSIGNMENT</Label>
      {groups.length ? groups.map((g, gi) =>
      <div key={gi} style={{ marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, color: accent, letterSpacing: ".14em", marginBottom: 6 }}>{g.group.toUpperCase()}</div>
          {g.picks.map((p, pi) => {
          const tut = p.item && p.item.tut ? p.item.tut.indexOf("http") === 0 ? p.item.tut : window.BC.tutorialURLs[p.item.tut] : null;
          const qr = tut && window.BC.qrMap[tut];
          return (
            <div key={pi} style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
                {qr && <img src={qr} alt="" style={{ width: 48, height: 48, flexShrink: 0 }} />}
                <span style={{ fontSize: 14.5 }}>{p.name}</span>
              </div>);

        })}
        </div>
      ) : <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>None needed.</div>}

      {/* notes */}
      {get("notes") && <React.Fragment>
        <Label>SPECIAL NOTES</Label>
        <div style={{ fontSize: 14.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{get("notes")}</div>
      </React.Fragment>}
    </div>);

}

/* ── editable + printable Supply Shopping List ── */
function SuppliesWorksheet({ accent, tint }) {
  const ref = useRefM();
  const [data, setData] = useLocal("supplylist", {});
  const rowCount = data.__count || 6;
  const get = (i, f) => data[`${i}.${f}`] || "";
  const set = (i, f, v) => setData((d) => ({ ...d, [`${i}.${f}`]: v }));
  const toggle = (i) => setData((d) => ({ ...d, [`${i}.done`]: !d[`${i}.done`] }));
  const supplyGroups = (window.BC.byId.supplies.shop || {}).groups || [];
  const findHref = (name) => {
    for (const g of supplyGroups) {const m = g.items.find((x) => x.label === name);if (m) return m.href;}
    return null;
  };
  const emailSupplies = () => {
    const L = [];
    L.push("My DIY wedding flower supply shopping list 🌸");
    L.push("");
    L.push("Tap any link to shop our exact BCF-approved pick:");
    L.push("");
    for (let i = 0; i < rowCount; i++) {
      const item = get(i, "item");if (!item) continue;
      const qty = get(i, "qty");
      const href = findHref(item) || get(i, "source");
      L.push("• " + (qty ? qty + " × " : "") + item + (href && href.indexOf("http") === 0 ? "\n   → " + href : ""));
    }
    L.push("");L.push("xo");
    window.location.href = "mailto:?subject=" + encodeURIComponent("My flower supply shopping list") + "&body=" + encodeURIComponent(L.join("\n"));
  };
  return (
    <div ref={ref} style={{ marginTop: 42, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
      padding: "30px 32px 34px", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6, flexWrap: "wrap" }}>
        <button onClick={emailSupplies} className="mono no-print" title="Email this list to yourself"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--sage-tint)", color: "var(--sage-deep)",
          padding: "5px 11px", borderRadius: 999, fontSize: 10.5, cursor: "pointer", border: "none" }}>
          <Icon name="note" size={12} /> EMAIL
        </button>
        <span className="no-print"><PrintableBadge targetRef={ref} tint={tint} accent={accent} /></span>
        <h3 style={{ fontSize: 23 }}>Supply Shopping List</h3>
      </div>
      <p style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 22, maxWidth: 640 }}>
        Pick what you need from the list, each item links straight to our BCF-approved Amazon pick. Add a quantity, check things off as you buy, and <strong>email</strong> or <strong>print</strong> the whole list to take shopping. Saves automatically.
      </p>
      <div className="print-only-qr" style={{ display: "none", gap: 10, alignItems: "flex-start", marginBottom: 18, padding: "11px 14px", background: "var(--sage-tint)", borderRadius: 8 }}>
        <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>📱 <strong>Scan any QR code</strong> below with your phone camera to shop that item instantly from our BCF-approved Amazon picks.</span>
      </div>
      {/* column headers */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 4px 8px", borderBottom: "1px solid var(--line)" }}>
        <span style={{ width: 24, flexShrink: 0 }} />
        <span className="mono" style={{ flex: 1, fontSize: 9, color: "var(--ink-faint)" }}>ITEM</span>
        <span className="mono" style={{ width: 56, flexShrink: 0, fontSize: 9, color: "var(--ink-faint)" }}>QTY</span>
        <span className="mono" style={{ width: 80, flexShrink: 0, fontSize: 9, color: "var(--ink-faint)", textAlign: "center" }}>SHOP</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {Array.from({ length: rowCount }).map((_, i) => {
          const done = !!data[`${i}.done`];
          const item = get(i, "item");
          const href = findHref(item);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 4px",
              borderBottom: i < rowCount - 1 ? "1px solid var(--line)" : "none" }}>
              <button onClick={() => toggle(i)} title="Got it" className="no-print" style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                border: done ? "none" : "1.5px solid var(--line-strong)", background: done ? accent : "var(--cream)",
                display: "grid", placeItems: "center", color: "#fff" }}>
                {done && <Icon name="check" size={13} stroke={2.6} />}
              </button>
              <div style={{ flex: 1, minWidth: 0, opacity: done ? 0.55 : 1 }}>
                <SupplyPicker value={item} onChange={(v) => set(i, "item", v)} groups={supplyGroups} accent={accent} done={done} />
              </div>
              <input value={get(i, "qty")} onChange={(e) => set(i, "qty", e.target.value)} placeholder="-"
              style={{ width: 56, flexShrink: 0, textAlign: "center", border: "1.5px solid var(--line-strong)", borderRadius: 8,
                background: "var(--cream)", fontSize: 14, padding: "7px 4px", color: "var(--ink)", outline: "none", fontFamily: "var(--sans)" }}
              onFocus={(e) => e.target.style.borderColor = "var(--accent)"} onBlur={(e) => e.target.style.borderColor = "var(--line-strong)"} />
              <div style={{ width: 80, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                {href ?
                <React.Fragment>
                      <a href={href} target="_blank" rel="noopener" className="mono no-print" style={{ display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 9, color: accent, background: "var(--sage-tint)", padding: "6px 9px", borderRadius: 999, textDecoration: "none" }}>
                        SHOP <Icon name="arrowSm" size={11} /></a>
                      {window.BC.qrMap[href] && <img className="print-only-qr" src={window.BC.qrMap[href]} alt="" style={{ display: "none", width: 52, height: 52 }} />}
                    </React.Fragment> :
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>-</span>}
              </div>
            </div>);
        })}
      </div>
      <button onClick={() => setData((d) => ({ ...d, __count: rowCount + 1 }))} className="no-print"
      style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600,
        color: accent, background: "none", cursor: "pointer", padding: "4px 2px" }}>
        <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> Add another item
      </button>
    </div>);

}

/* ── supply picker: dropdown of BCF supplies + add-your-own ── */
function SupplyPicker({ value, onChange, groups, accent, done }) {
  const [open, setOpen] = useStateM(false);
  const [adding, setAdding] = useStateM(false);
  const [custom, setCustom] = useStateM("");
  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button onClick={() => setOpen((o) => !o)} className="no-print" style={{ width: "100%", display: "flex", alignItems: "center", gap: 8,
        padding: "7px 10px", borderRadius: 8, border: "1.5px solid var(--line-strong)", background: "var(--paper)", cursor: "pointer", textAlign: "left", color: "var(--ink)" }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          color: value ? "var(--ink)" : "var(--ink-faint)", textDecoration: done ? "line-through" : "none" }}>{value || "- choose a supply -"}</span>
        <Icon name="chevron" size={15} style={{ color: "var(--ink-faint)", flexShrink: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform .18s" }} />
      </button>
      {/* plain text for print */}
      <span className="print-only-text" style={{ display: "none" }}>{value}</span>
      {open &&
      <React.Fragment>
          <div onClick={() => {setOpen(false);setAdding(false);}} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 41, maxHeight: 300, overflowY: "auto",
          background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "var(--shadow-lg)", padding: 6 }}>
            {value && <button onClick={() => {onChange("");setOpen(false);}} style={{ width: "100%", textAlign: "left", padding: "8px 10px",
            fontSize: 13, color: "var(--ink-faint)", background: "none", cursor: "pointer", borderRadius: 7 }}>- clear -</button>}
            {groups.map((g) =>
          <div key={g.h}>
                <div className="mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", padding: "8px 10px 4px", letterSpacing: ".12em" }}>{g.h.toUpperCase()}</div>
                {g.items.map((a) =>
            <button key={a.label} onClick={() => {onChange(a.label);setOpen(false);}} style={{ width: "100%", display: "flex", alignItems: "center",
              padding: "7px 10px", borderRadius: 8, background: a.label === value ? "var(--sage-tint)" : "none", cursor: "pointer", textAlign: "left", color: "var(--ink)" }}
            onMouseEnter={(e) => {if (a.label !== value) e.currentTarget.style.background = "var(--cream)";}}
            onMouseLeave={(e) => {if (a.label !== value) e.currentTarget.style.background = "none";}}>
                    <span style={{ fontSize: 14 }}>{a.label}</span>
                  </button>
            )}
              </div>
          )}
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 4 }}>
              {adding ?
            <div style={{ display: "flex", gap: 6, padding: "4px 6px" }}>
                    <input autoFocus value={custom} onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {if (e.key === "Enter" && custom.trim()) {onChange(custom.trim());setCustom("");setAdding(false);setOpen(false);}}}
              placeholder="Type a custom item…"
              style={{ flex: 1, minWidth: 0, fontSize: 13.5, padding: "7px 9px", borderRadius: 7, border: "1.5px solid var(--accent)", outline: "none", fontFamily: "var(--sans)" }} />
                    <button onClick={() => {if (custom.trim()) {onChange(custom.trim());setCustom("");setAdding(false);setOpen(false);}}}
              style={{ background: accent, color: "#fff", border: "none", borderRadius: 7, padding: "0 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Add</button>
                  </div> :
            <button onClick={() => setAdding(true)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "8px 10px",
              fontSize: 13.5, fontWeight: 600, color: accent, background: "none", cursor: "pointer", borderRadius: 7 }}>
                    <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add your own
                  </button>}
            </div>
          </div>
        </React.Fragment>
      }
    </div>);

}

/* ── more quick fixes (clean list) ── */
function MoreFixes({ data, accent }) {
  return (
    <div style={{ marginTop: 44 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{data.heading}</h3>
      {data.sub && <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 700, marginBottom: 18 }}>{data.sub}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 760 }}>
        {data.items.map((it, i) =>
        <div key={i} style={{ display: "flex", gap: 15, alignItems: "flex-start", padding: "15px 0",
          borderBottom: i < data.items.length - 1 ? "1px solid var(--line)" : "none" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: accent, flexShrink: 0, marginTop: 7 }} />
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: 17, marginBottom: 4 }}>{it.t}</h4>
              <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--ink-soft)" }}>{it.d}</p>
            </div>
          </div>
        )}
      </div>
    </div>);

}

/* ── normal vs. worth-an-email split ── */
function NormalVsReport({ data, accent }) {
  const col = (label, items, tone) =>
  <div style={{ flex: "1 1 280px", minWidth: 0, background: "var(--paper)", border: "1px solid var(--line)",
    borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px",
      background: tone === "ok" ? "var(--sage-tint)" : "var(--rose-tint)" }}>
        <Icon name={tone === "ok" ? "leaf" : "note"} size={17} style={{ color: tone === "ok" ? "var(--sage-deep)" : "var(--rose-deep)" }} />
        <span style={{ fontFamily: "var(--serif)", fontSize: 18, color: tone === "ok" ? "var(--sage-deep)" : "var(--rose-deep)" }}>{label}</span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 11 }}>
        {items.map((it, i) =>
      <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.5, color: "var(--ink)" }}>
            <Icon name={tone === "ok" ? "check" : "arrowSm"} size={14} stroke={2.2} style={{ color: tone === "ok" ? "var(--sage)" : "var(--rose)", flexShrink: 0, marginTop: 3 }} />
            <span>{it}</span>
          </li>
      )}
      </ul>
    </div>;

  return (
    <div style={{ marginTop: 44 }}>
      <h3 style={{ fontSize: 24, marginBottom: 16 }}>{data.heading}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, maxWidth: 760 }}>
        {col(data.normalLabel, data.normal, "ok")}
        {col(data.reportLabel, data.report, "report")}
      </div>
    </div>);

}

/* ── simple flower prep steps: visual cards w/ infographic slot + checkable ── */
function StepFlow({ flow, moduleId, accent }) {
  const [checked, setChecked] = useLocal("flowsteps." + moduleId, {});
  const toggle = (i) => setChecked((c) => ({ ...c, [i]: !c[i] }));
  const done = flow.steps.filter((_, i) => checked[i]).length;
  return (
    <div style={{ marginTop: 6, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <h3 style={{ fontSize: 24 }}>{flow.heading}</h3>
        <span className="mono" style={{ color: done === flow.steps.length ? accent : "var(--ink-faint)" }}>{done}/{flow.steps.length} done</span>
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 680, marginBottom: 20 }}>{flow.sub}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {flow.steps.map((s, i) => {
          const on = !!checked[i];
          return (
            <div key={i} className="step-row" style={{ position: "relative", background: "var(--paper)", border: "1.5px solid",
              borderColor: on ? accent : "var(--line)", borderRadius: "var(--radius)", overflow: "hidden",
              boxShadow: "var(--shadow-sm)", transition: "border-color .18s", display: "flex", alignItems: "stretch" }}>
              <div className="step-img" style={{ flexShrink: 0, alignSelf: "stretch" }}>
                {React.createElement("image-slot", {
                  id: `${flow.slotPrefix || "prep-step"}-${i + 1}`, shape: "rect", placeholder: "Drop step illustration",
                  ...(s.img ? { src: s.img } : {}),
                  style: { width: "100%", height: "100%", minHeight: "160px", display: "block" }
                })}
              </div>
              <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
                    background: on ? accent : "var(--sage-tint)", color: on ? "#fff" : "var(--sage)",
                    fontFamily: "var(--serif)", fontSize: 15 }}>{i + 1}</span>
                  <h4 style={{ fontSize: 19 }}>{s.t}</h4>
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink-soft)", flex: 1 }}>{s.d}</p>
                {s.tip &&
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 13px",
                  background: "var(--rose-tint)", borderRadius: "var(--radius-sm)" }}>
                    <Icon name="spark" size={14} style={{ color: "var(--rose-deep)", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}>{s.tip}</span>
                  </div>
                }
                <button onClick={() => toggle(i)} style={{ display: "inline-flex", alignItems: "center", gap: 8,
                  alignSelf: "flex-start", marginTop: 2, fontSize: 12.5, fontWeight: 600,
                  color: on ? accent : "var(--ink-soft)" }}>
                  <span style={{ width: 19, height: 19, borderRadius: 6, flexShrink: 0,
                    border: on ? "none" : "1.6px solid var(--line-strong)", background: on ? accent : "var(--paper)",
                    display: "grid", placeItems: "center", color: "#fff" }}>{on && <Icon name="check" size={12} stroke={2.6} />}</span>
                  {on ? "Done!" : "Mark done"}
                </button>
              </div>
            </div>);

        })}
      </div>
    </div>);

}

/* ── before / after hydration drop pair ── */
function BeforeAfter({ ba, accent }) {
  const slot = (s) =>
  <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ position: "relative" }}>
        {React.createElement("image-slot", {
        id: s.id, shape: "rounded", radius: "14", placeholder: s.label,
        style: { width: "100%", aspectRatio: "4 / 3", display: "block" }
      })}
        <span className="mono" style={{ position: "absolute", top: 8, left: 8, zIndex: 2, fontSize: 8.5,
        background: "rgba(44,53,42,.82)", color: "var(--cream)", padding: "4px 8px", borderRadius: 999,
        letterSpacing: ".14em", pointerEvents: "none" }}>EXAMPLE</span>
      </div>
      <div className="mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 8, textAlign: "center" }}>{s.label}</div>
    </div>;

  return (
    <div style={{ marginTop: 40 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{ba.heading}</h3>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 680, marginBottom: 18 }}>{ba.sub}</p>
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", maxWidth: 620 }}>
        {slot(ba.before)}
        <div style={{ alignSelf: "center", color: accent, flexShrink: 0, paddingTop: 10 }}><Icon name="arrow" size={22} /></div>
        {slot(ba.after)}
      </div>
    </div>);

}

/* ── order of operations: numbered process strip ── */
function OrderFlow({ flow, accent }) {
  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{flow.heading}</h3>
      {flow.sub && <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 700, marginBottom: 18 }}>{flow.sub}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "stretch", gap: 10 }}>
        {flow.steps.map((s, i) =>
        <React.Fragment key={i}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, background: "var(--paper)", border: "1px solid var(--line)",
            borderRadius: 999, padding: "9px 18px 9px 10px", boxShadow: "var(--shadow-sm)" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
              background: "var(--sage-tint)", color: "var(--sage-deep)", fontFamily: "var(--serif)", fontSize: 15 }}>{i + 1}</span>
              <span style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {i < flow.steps.length - 1 &&
          <span style={{ display: "flex", alignItems: "center", color: accent, flexShrink: 0 }}><Icon name="arrowSm" size={18} /></span>
          }
          </React.Fragment>
        )}
      </div>
    </div>);

}

/* ── crew / hero photo slot ── */
function PhotoSlot({ photo, accent }) {
  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <div style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
        {React.createElement("image-slot", {
          id: photo.id, shape: "rect", fit: photo.fit || "contain",
          ...(photo.src ? { src: photo.src } : {}),
          placeholder: photo.placeholder || "Drop a photo here",
          style: { width: "100%", aspectRatio: photo.ratio || "3 / 1", display: "block", background: "var(--cream-deep)" }
        })}
      </div>
      {photo.caption && <p style={{ fontSize: 13.5, fontStyle: "italic", fontFamily: "var(--serif)", color: "var(--ink-soft)", textAlign: "center", marginTop: 10 }}>{photo.caption}</p>}
    </div>);

}

/* ── helper-count chart (table infographic) ── */
function HelperChart({ chart, accent }) {
  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{chart.heading}</h3>
      {chart.sub && <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 700, marginBottom: 18 }}>{chart.sub}</p>}
      <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "var(--shadow-sm)", maxWidth: 760 }}>
        {/* header */}
        <div className="hchart-row" style={{ background: "var(--sage-deep)" }}>
          {chart.cols.map((c, i) =>
          <div key={i} className="mono" style={{ padding: "12px 16px", fontSize: 9.5, color: "var(--cream)",
            textAlign: i === chart.cols.length - 1 ? "center" : "left" }}>{c}</div>
          )}
        </div>
        {/* rows */}
        {chart.rows.map((r, ri) =>
        <div key={ri} className="hchart-row" style={{ background: ri % 2 ? "var(--cream)" : "var(--paper)",
          borderTop: "1px solid var(--line)" }}>
            {r.c.map((cell, ci) =>
          <div key={ci} style={{ padding: "13px 16px", fontSize: 14, display: "flex", alignItems: "center",
            justifyContent: ci === r.c.length - 1 ? "center" : "flex-start",
            color: ci === 0 ? "var(--ink)" : "var(--ink-soft)", fontWeight: ci === 0 ? 600 : 400 }}>
                {ci === r.c.length - 1 ?
            <span style={{ fontFamily: "var(--serif)", fontSize: 18, color: "#fff", background: accent,
              borderRadius: 999, padding: "3px 14px", minWidth: 54, textAlign: "center" }}>{cell}</span> :
            cell}
              </div>
          )}
          </div>
        )}
      </div>
    </div>);

}

/* ── jobs for helpers (organized cards) ── */
function JobBoard({ jobs, accent }) {
  return (
    <div style={{ marginTop: 44 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{jobs.heading}</h3>
      {jobs.sub && <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 720, marginBottom: 20 }}>{jobs.sub}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {jobs.items.map((j, i) =>
        <div key={i} style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: "var(--radius)",
          padding: "22px 24px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: j.team ? 6 : 14 }}>
              <span style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, display: "grid", placeItems: "center",
              background: "var(--sage-deep)", color: "#fff", fontFamily: "var(--serif)", fontSize: 18 }}>{j.n}</span>
              <div>
                <span className="mono" style={{ display: "block", fontSize: 9, color: "var(--ink-faint)", marginBottom: 2 }}>JOB {j.n}</span>
                <h4 style={{ fontSize: 21, lineHeight: 1.05 }}>{j.title}</h4>
              </div>
            </div>
            {j.team && <p style={{ fontSize: 13.5, color: "var(--rose-deep)", fontWeight: 600, margin: "0 0 14px 51px" }}>{j.team}</p>}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, paddingLeft: 51, display: "flex", flexDirection: "column", gap: 9 }}>
              {j.steps.map((s, k) =>
            <li key={k} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 15, lineHeight: 1.5, color: "var(--ink)" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, marginTop: 8, flexShrink: 0 }} />
                  <span>{s}</span>
                </li>
            )}
            </ul>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16, paddingLeft: 51 }}>
              {j.homework &&
            <div style={{ flex: "1 1 240px", display: "flex", gap: 9, alignItems: "flex-start", padding: "11px 14px",
              background: "var(--sage-tint)", borderRadius: "var(--radius-sm)" }}>
                  <Icon name="check" size={15} stroke={2.2} style={{ color: "var(--sage-deep)", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}><strong>Homework: </strong>{
                j.homeworkLink ?
                <React.Fragment>{j.homework} <a href={j.homeworkLink.href} target="_blank" rel="noopener" style={{ color: "var(--sage-deep)", fontWeight: 600 }}>{j.homeworkLink.text}</a></React.Fragment> :
                j.homework
                }</span>
                </div>
            }
              {j.fun &&
            <div style={{ flex: "1 1 240px", display: "flex", gap: 9, alignItems: "flex-start", padding: "11px 14px",
              background: "var(--rose-tint)", borderRadius: "var(--radius-sm)" }}>
                  <Icon name="spark" size={15} style={{ color: "var(--rose-deep)", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}><strong>Fun part: </strong>{j.fun}</span>
                </div>
            }
              {j.tip &&
            <div style={{ flex: "1 1 240px", display: "flex", gap: 9, alignItems: "flex-start", padding: "11px 14px",
              background: "var(--cream-deep)", borderRadius: "var(--radius-sm)" }}>
                  <Icon name="spark" size={15} style={{ color: "var(--sage-deep)", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ink)" }}><strong>Tip: </strong>{j.tip}</span>
                </div>
            }
            </div>
          </div>
        )}
      </div>
    </div>);

}

/* ── design tutorials gallery: image + WATCH link cards ── */
function TutorialGrid({ tutorials, accent }) {
  return (
    <div style={{ marginTop: 44 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{tutorials.heading}</h3>
      {tutorials.sub && <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 680, marginBottom: 24 }}>{tutorials.sub}</p>}
      <div className="shop-grid">
        {tutorials.items.map((it, i) => <TutorialCard key={i} item={it} accent={accent} />)}
      </div>
    </div>);

}
function TutorialCard({ item, accent }) {
  const [hov, setHov] = useStateM(false);
  const live = item.href && item.href !== "#";
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    style={{ display: "flex", flexDirection: "column", background: "var(--paper)", border: "1px solid var(--line)",
      borderRadius: "var(--radius)", overflow: "hidden", boxShadow: hov ? "var(--shadow-md)" : "var(--shadow-sm)",
      transform: hov ? "translateY(-2px)" : "none", transition: "all .18s" }}>
      <div style={{ position: "relative" }}>
        {React.createElement("image-slot", {
          id: item.id, shape: "rect", placeholder: "Tutorial thumbnail", static: "true",
          style: { width: "100%", aspectRatio: "16 / 9", display: "block" }
        })}
        <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
          <span style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(44,53,42,.55)", color: "#fff",
            display: "grid", placeItems: "center", backdropFilter: "blur(2px)" }}><Icon name="play" size={24} /></span>
        </span>
      </div>
      <a href={item.href || "#"} target={live ? "_blank" : undefined} rel={live ? "noopener" : undefined}
      onClick={(e) => {if (!live) e.preventDefault();}}
      style={{ textDecoration: "none", padding: "13px 15px", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, borderTop: "1px solid var(--line)" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{item.label}</span>
        <span className="mono" style={{ fontSize: 9, color: accent, display: "inline-flex", alignItems: "center", gap: 5 }}>
          WATCH <Icon name="play" size={12} />
        </span>
      </a>
    </div>);

}

/* ── flower recipe card (dynamic) ── */
function RecipeCard({ recipe, accent }) {
  return (
    <div style={{ marginTop: 44 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{recipe.heading}</h3>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 700, marginBottom: 22 }}>{recipe.intro}</p>
      <div style={{ display: "flex", gap: 0, flexWrap: "wrap", background: "var(--paper)", border: "1px solid var(--line)",
        borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "var(--shadow-sm)", maxWidth: 760 }} className="recipe-card">
        {/* photo */}
        <div style={{ flex: "1 1 260px", minWidth: 0, position: "relative", background: "var(--cream-deep)" }}>
          {React.createElement("image-slot", {
            id: recipe.imgId, shape: "rect", placeholder: "Labeled bouquet diagram", static: "true",
            style: { width: "100%", height: "100%", minHeight: "260px", display: "block" }
          })}
        </div>
        {/* ingredients */}
        <div style={{ flex: "1 1 300px", minWidth: 0, padding: "24px 26px" }}>
          <div className="mono" style={{ fontSize: 9.5, color: accent, marginBottom: 5 }}>RECIPE</div>
          <h4 style={{ fontSize: 21, marginBottom: 18 }}>{recipe.cardTitle}</h4>

          <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 8 }}>GREENERY</div>
          <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {recipe.greenery.map((g, i) =>
            <li key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 14.5, color: "var(--ink)" }}>
                <Icon name="leaf" size={14} style={{ color: "var(--sage)", flexShrink: 0 }} />{g}
              </li>
            )}
          </ul>

          <div className="mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginBottom: 8 }}>FLOWERS</div>
          <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
            {recipe.flowers.map((f, i) =>
            <li key={i} style={{ display: "flex", gap: 11, alignItems: "baseline", fontSize: 14.5, color: "var(--ink)" }}>
                <span style={{ minWidth: 26, fontFamily: "var(--serif)", fontSize: 16, color: accent, flexShrink: 0 }}>{f.q}</span>
                <span>{f.n}</span>
              </li>
            )}
          </ul>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <span className="mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>VESSEL</span>
            <span style={{ fontSize: 14.5, fontFamily: "var(--serif)" }}>{recipe.vessel}</span>
          </div>
        </div>
      </div>
    </div>);

}

/* ── flower terminology glossary: thumbnail rows ── */
function FamilyGlossary({ families, accent }) {
  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{families.heading}</h3>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 680, marginBottom: 18 }}>{families.sub}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}>
        {families.items.map((f, i) =>
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 15, background: "var(--paper)",
          border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "12px 16px 12px 12px", boxShadow: "var(--shadow-sm)" }}>
            {React.createElement("image-slot", {
            id: f.id, shape: "rounded", radius: "10", placeholder: "photo", static: "true",
            style: { width: "68px", height: "68px", flexShrink: 0, display: "block" }
          })}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--serif)", fontSize: 19 }}>{f.name}</span>
                <span style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>{f.desc}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 5, lineHeight: 1.45 }}>{f.examples}</div>
            </div>
          </div>
        )}
      </div>
    </div>);

}

/* ── shop grid: clickable labeled product cards (PDF "Our Fave Supplies") ── */
function ShopGrid({ shop, accent }) {
  return (
    <div style={{ marginTop: 44 }}>
      <h3 style={{ fontSize: 24, marginBottom: 6 }}>{shop.heading}</h3>
      {shop.sub && <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 680, marginBottom: 24 }}>{shop.sub}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        {shop.groups.map((g, gi) =>
        <div key={gi}>
            {g.h &&
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{g.h}</span>
                <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
              </div>
          }
            <div className="shop-grid">
              {g.items.map((it, i) => <ShopCard key={i} item={it} accent={accent} />)}
            </div>
          </div>
        )}
      </div>
    </div>);

}

function ShopCard({ item, accent }) {
  const [hov, setHov] = useStateM(false);
  const live = item.href && item.href !== "#";
  const slotId = "shop-" + item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    style={{ display: "flex", flexDirection: "column", background: "var(--paper)",
      border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden",
      boxShadow: hov ? "var(--shadow-md)" : "var(--shadow-sm)", transform: hov ? "translateY(-2px)" : "none", transition: "all .18s" }}>
      {/* user-fillable product photo */}
      {React.createElement("image-slot", {
        id: slotId,
        shape: "rect",
        placeholder: "Drop product photo",
        static: "true",
        style: { width: "100%", aspectRatio: "4 / 3", display: "block" }
      })}
      {/* clickable shop link */}
      <a href={item.href || "#"} target={live ? "_blank" : undefined} rel={live ? "noopener" : undefined}
      onClick={(e) => {if (!live) e.preventDefault();}}
      style={{ textDecoration: "none", padding: "13px 15px", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 8, borderTop: "1px solid var(--line)", background: "var(--paper)" }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{item.label}</span>
        <span className="mono" style={{ fontSize: 9, color: accent, display: "inline-flex", alignItems: "center", gap: 4 }}>
          SHOP <Icon name="arrowSm" size={12} />
        </span>
      </a>
    </div>);

}

Object.assign(window, { ModulePage });