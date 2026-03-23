import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

/* ─── Text Pools ─────────────────────────────────────────────────────────── */
const TEXTS = {
  easy: [
    "the quick brown fox jumps over the lazy dog and runs away fast into the woods",
    "a big cat sat on the mat and looked at the fat rat sitting by the old red wall",
    "jack and jill went up the hill to fetch a pail of cold water on a bright sunny day",
  ],
  medium: [
    "Programming is the art of telling another human what one wants the computer to do and making it happen correctly.",
    "The best way to predict the future is to invent it, so start building your dreams one line of code at a time.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts above all else in life.",
    "Technology is best when it brings people together and creates meaningful connections between curious minds worldwide.",
  ],
  hard: [
    "Asymptotic complexity analysis reveals that quicksort achieves O(n log n) average-case performance, maintaining cache efficiency through its clever partitioning strategy.",
    "The Byzantine generals problem exemplifies distributed consensus challenges: coordinating agreement among decentralized nodes when communication channels may be unreliable.",
    "Functional programming paradigms emphasize immutability, pure functions, and declarative composition, enabling developers to reason about correctness with mathematical precision.",
  ],
};

/* ─── Keyboard Layout ──────────────────────────────────────────────────────*/
const KB_ROWS = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["z","x","c","v","b","n","m"],
];

/* ─── Badges ───────────────────────────────────────────────────────────────*/
const BADGES = [
  { id:"first",  icon:"🎯", name:"First Steps",   desc:"Complete your first test",  check:(s)=>s.length>=1 },
  { id:"wpm50",  icon:"⚡", name:"Speed Seeker",  desc:"Reach 50 WPM",              check:(s)=>s.some(x=>x.wpm>=50) },
  { id:"wpm80",  icon:"🔥", name:"Speed Demon",   desc:"Reach 80 WPM",              check:(s)=>s.some(x=>x.wpm>=80) },
  { id:"acc95",  icon:"🎪", name:"Sharpshooter",  desc:"95%+ accuracy",             check:(s)=>s.some(x=>x.accuracy>=95) },
  { id:"acc100", icon:"✨", name:"Flawless",       desc:"100% accuracy",             check:(s)=>s.some(x=>x.accuracy===100) },
  { id:"t10",    icon:"🏅", name:"Dedicated",      desc:"10 tests completed",        check:(s)=>s.length>=10 },
  { id:"t25",    icon:"🏆", name:"Veteran",        desc:"25 tests completed",        check:(s)=>s.length>=25 },
];

/* ─── Helpers ──────────────────────────────────────────────────────────────*/
const calcWPM = (cc, ms) => ms < 500 ? 0 : Math.round((cc / 5) / (ms / 60000));
const calcAcc = (c, t) => t === 0 ? 100 : Math.round((c / t) * 100);

const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ─── Virtual Keyboard ─────────────────────────────────────────────────────*/
function VirtualKeyboard({ activeKey, errorMap }) {
  const maxErr = Math.max(...Object.values(errorMap), 1);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,
      padding:"14px 12px",background:"var(--surf)",border:"1px solid var(--bdr)",
      borderRadius:14,marginTop:16,overflowX:"auto"}}>
      {KB_ROWS.map((row, ri) => (
        <div key={ri} style={{display:"flex",gap:4}}>
          {ri===1 && <div style={keyStyle({})}>↵</div>}
          {row.map(k => {
            const err = errorMap[k] || 0;
            const ratio = err / maxErr;
            const isActive = activeKey === k;
            const bgColor = isActive ? "#22d3ee"
              : ratio > 0.66 ? "#f8717133" : ratio > 0.33 ? "#fb923c22" : ratio > 0 ? "#fbbf2422" : "var(--surf2)";
            const txtColor = isActive ? "#000"
              : ratio > 0.66 ? "#f87171" : ratio > 0.33 ? "#fb923c" : ratio > 0 ? "#fbbf24" : "var(--tx2)";
            return (
              <div key={k} style={keyStyle({ bg: bgColor, color: txtColor, active: isActive })}>
                {k}
              </div>
            );
          })}
          {ri===2 && <div style={keyStyle({})}>⌫</div>}
        </div>
      ))}
      <div style={keyStyle({ width:160 })}>space</div>
    </div>
  );
}

const keyStyle = ({ bg, color, active, width }) => ({
  minWidth: width || 34, height: 34, display:"flex", alignItems:"center",
  justifyContent:"center", background: bg || "var(--surf2)",
  border: `1px solid ${active ? "#22d3ee" : "var(--bdr)"}`,
  borderRadius:6, fontFamily:"'JetBrains Mono',monospace", fontSize:11,
  fontWeight:500, color: color || "var(--tx2)", transition:"all .1s",
  userSelect:"none", padding:"0 6px", transform: active ? "translateY(1px)" : "none",
  boxShadow: active ? "0 0 8px #22d3ee44" : "none",
});

/* ─── Stat Pill ─────────────────────────────────────────────────────────── */
const StatPill = ({ value, unit, color, label }) => (
  <div style={{textAlign:"center"}}>
    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:28,fontWeight:700,color,
      lineHeight:1.1}}>
      {value}<span style={{fontSize:13,color:"var(--tx2)",marginLeft:2}}>{unit}</span>
    </div>
    <div style={{fontSize:10,color:"var(--tx2)",fontWeight:600,textTransform:"uppercase",
      letterSpacing:.5,marginTop:2}}>{label}</div>
  </div>
);

/* ─── Main App ──────────────────────────────────────────────────────────── */
export default function App() {
  const [dark, setDark] = useState(true);
  const [view, setView] = useState("test");
  const [diff, setDiff] = useState("medium");
  const [dur,  setDur]  = useState(60);

  const [phase,   setPhase]   = useState("idle");
  const [chars,   setChars]   = useState([]);
  const [idx,     setIdx]     = useState(0);
  const [tLeft,   setTLeft]   = useState(60);
  const [liveWPM, setLiveWPM] = useState(0);
  const [liveAcc, setLiveAcc] = useState(100);
  const [aKey,    setAKey]    = useState("");
  const [sessErr, setSessErr] = useState({});

  const [sessions, setSessions] = useState(() => ls.get("tf-sess", []));
  const [badges,   setBadges]   = useState(() => ls.get("tf-bdg",  []));
  const [errMap,   setErrMap]   = useState(() => ls.get("tf-emap", {}));
  const [streak,   setStreak]   = useState(() => ls.get("tf-str",  0));
  const [lastDate, setLastDate] = useState(() => ls.get("tf-ld",   null));
  const [totalXP,  setTotalXP]  = useState(() => ls.get("tf-xp",   0));

  const [coachBusy, setCoachBusy] = useState(false);
  const [coach,     setCoach]     = useState(null);

  // Refs for stale-closure safety
  const phaseR    = useRef("idle");
  const idxR      = useRef(0);
  const textR     = useRef("");
  const startR    = useRef(null);
  const okR       = useRef(0);
  const totR      = useRef(0);
  const sessErrR  = useRef({});
  const durR      = useRef(60);
  const diffR     = useRef("medium");
  const timerR    = useRef(null);
  const finishR   = useRef(null);

  useEffect(() => { durR.current = dur; },   [dur]);
  useEffect(() => { diffR.current = diff; }, [diff]);

  // Build text
  const initText = useCallback(() => {
    clearInterval(timerR.current);
    const pool = TEXTS[diff];
    const txt  = pool[Math.floor(Math.random() * pool.length)];
    textR.current  = txt;
    idxR.current   = 0;
    okR.current    = 0;
    totR.current   = 0;
    sessErrR.current = {};
    setChars(txt.split("").map(c => ({ c, st: "p" })));
    setIdx(0);
    setTLeft(dur);
    setLiveWPM(0);
    setLiveAcc(100);
    setSessErr({});
    setPhase("idle");
    phaseR.current = "idle";
  }, [diff, dur]);

  useEffect(() => { initText(); }, [diff, dur]); // eslint-disable-line

  // Finish test
  const finishTest = useCallback(() => {
    clearInterval(timerR.current);
    const elapsed = Date.now() - (startR.current || Date.now());
    const w = calcWPM(okR.current, elapsed);
    const a = calcAcc(okR.current, totR.current);
    const xp = Math.round(w * (a / 100) * 2);

    const sess = { id:Date.now(), date:new Date().toISOString(),
      wpm:w, accuracy:a, xp, duration:durR.current, difficulty:diffR.current };

    const newSessions = [sess, ...sessions].slice(0, 100);
    setSessions(newSessions);
    ls.set("tf-sess", newSessions);

    const nXP = totalXP + xp;
    setTotalXP(nXP);
    ls.set("tf-xp", nXP);

    const newMap = { ...errMap };
    Object.entries(sessErrR.current).forEach(([k,v]) => { newMap[k] = (newMap[k]||0)+v; });
    setErrMap(newMap);
    ls.set("tf-emap", newMap);

    const today = new Date().toDateString();
    let ns = streak;
    if (lastDate !== today) {
      const yesterday = new Date(Date.now()-86400000).toDateString();
      ns = lastDate === yesterday ? streak+1 : 1;
      setStreak(ns); setLastDate(today);
      ls.set("tf-str", ns); ls.set("tf-ld", today);
    }

    const earned = [...badges];
    BADGES.forEach(b => { if (!earned.includes(b.id) && b.check(newSessions)) earned.push(b.id); });
    if (earned.length !== badges.length) { setBadges(earned); ls.set("tf-bdg", earned); }

    setLiveWPM(w); setLiveAcc(a);
    setPhase("done"); phaseR.current = "done";
  }, [sessions, totalXP, errMap, streak, lastDate, badges]);

  finishR.current = finishTest;

  // Timer
  useEffect(() => {
    if (phase !== "running") return;
    timerR.current = setInterval(() => {
      setTLeft(prev => {
        if (prev <= 1) { finishR.current(); return 0; }
        if (startR.current) {
          const el = Date.now() - startR.current;
          setLiveWPM(calcWPM(okR.current, el));
          setLiveAcc(calcAcc(okR.current, totR.current));
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerR.current);
  }, [phase]);

  // Key handler
  const handleKey = useCallback((e) => {
    const key = e.key;
    if (["Tab","F5","F12"].includes(key)) return;
    if (key === "Escape") { initText(); return; }

    const displayKey = key === " " ? "space" : key.toLowerCase();
    setAKey(displayKey);
    setTimeout(() => setAKey(""), 120);

    if (phaseR.current === "done") return;

    if (phaseR.current === "idle" && key.length === 1) {
      phaseR.current = "running"; setPhase("running"); startR.current = Date.now();
    }
    if (phaseR.current !== "running") return;

    if (key === "Backspace") {
      const ci = idxR.current; if (ci <= 0) return;
      const ni = ci - 1; idxR.current = ni; setIdx(ni);
      setChars(prev => {
        const next = [...prev];
        if (next[ni].st === "ok") okR.current = Math.max(0, okR.current - 1);
        totR.current = Math.max(0, totR.current - 1);
        next[ni] = { c: next[ni].c, st: "p" };
        return next;
      });
      return;
    }
    if (key.length !== 1) return;

    const ci = idxR.current;
    const txt = textR.current;
    if (ci >= txt.length) { finishR.current(); return; }

    const ok = key === txt[ci];
    totR.current++;
    if (ok) { okR.current++; }
    else {
      const ek = txt[ci].toLowerCase();
      sessErrR.current[ek] = (sessErrR.current[ek] || 0) + 1;
      setSessErr(prev => ({ ...prev, [ek]: (prev[ek]||0)+1 }));
    }
    const ni = ci + 1; idxR.current = ni; setIdx(ni);
    setChars(prev => {
      const next = [...prev];
      next[ci] = { c: txt[ci], st: ok ? "ok" : "bad" };
      return next;
    });
    if (ni >= txt.length) finishR.current();
  }, [initText]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // AI Coach
  const genCoach = async () => {
    setCoachBusy(true); setCoach(null);
    const weak = Object.entries(errMap).sort(([,a],[,b])=>b-a).slice(0,6).map(([k])=>k);
    const prompt = weak.length > 0
      ? `You are a typing coach. User's weakest keys: ${weak.join(", ")}.
Write a short typing practice paragraph (~80 words) that heavily features these characters.
Then give 2 short tips for improving accuracy on these keys.
RESPOND ONLY with valid JSON, no markdown:
{"exercise":"...","tips":["...","..."]}` 
      : `You are a typing coach. Write a beginner typing warm-up paragraph (~70 words).
Then give 2 general typing tips.
RESPOND ONLY with valid JSON, no markdown:
{"exercise":"...","tips":["...","..."]}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:800,
          messages:[{ role:"user", content:prompt }] }),
      });
      const data = await res.json();
      const raw = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      setCoach(JSON.parse(raw.replace(/```json|```/g,"").trim()));
    } catch {
      setCoach({ exercise:"The five boxing wizards jump quickly. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! Sphinx of black quartz, judge my vow.",
        tips:["Keep your fingers resting on the home row (ASDF / JKL;) at all times.","Focus on accuracy first — speed will increase naturally with consistent practice."] });
    }
    setCoachBusy(false);
  };

  // Derived
  const level    = Math.floor(totalXP / 200) + 1;
  const xpProg   = totalXP % 200;
  const lastSess = sessions[0];
  const avgWPM   = sessions.length ? Math.round(sessions.reduce((a,s)=>a+s.wpm,0)/sessions.length) : 0;
  const bestWPM  = sessions.length ? Math.max(...sessions.map(s=>s.wpm)) : 0;
  const avgAcc   = sessions.length ? Math.round(sessions.reduce((a,s)=>a+s.accuracy,0)/sessions.length) : 0;
  const chartData = [...sessions].reverse().slice(-20).map((s,i)=>({ n:i+1, wpm:s.wpm, acc:s.accuracy }));
  const timerPct = (tLeft / dur) * 100;
  const progPct  = phase === "running" ? ((dur - tLeft) / dur) * 100 : 0;

  const D = { // design tokens
    bg:    dark?"#070b12":"#f1f5f9",
    surf:  dark?"#0f172a":"#ffffff",
    surf2: dark?"#1e293b":"#f8fafc",
    bdr:   dark?"#1e293b":"#e2e8f0",
    tx:    dark?"#e2e8f0":"#0f172a",
    tx2:   dark?"#64748b":"#94a3b8",
    cyan:  dark?"#22d3ee":"#0891b2",
    grn:   dark?"#34d399":"#059669",
    ylw:   dark?"#fbbf24":"#d97706",
    red:   dark?"#f87171":"#dc2626",
    pur:   dark?"#a78bfa":"#7c3aed",
  };

  const ttipStyle = { background:D.surf, border:`1px solid ${D.bdr}`, borderRadius:8, fontSize:12, color:D.tx };
  const tickS     = { fontSize:11, fill:D.tx2 };

  return (
    <div style={{ minHeight:"100vh", background:D.bg, color:D.tx,
      fontFamily:"'Sora',sans-serif", transition:"background .3s,color .3s",
      "--surf":D.surf,"--surf2":D.surf2,"--bdr":D.bdr,"--tx":D.tx,"--tx2":D.tx2 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .ch-cur::after{content:'';position:absolute;left:0;bottom:-1px;width:100%;height:2px;
          background:${D.cyan};animation:blink 1s step-end infinite;border-radius:1px}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .ch-cur{position:relative;background:${D.cyan}1a;border-radius:3px}
        .ch-ok{color:${D.tx}}
        .ch-bad{color:${D.red};background:${D.red}18;border-radius:2px}
        .ch-p{color:${D.tx2}}
        .tarc{animation-timing-function:linear}
        .nbtn:hover{background:${D.surf2}!important;color:${D.tx}!important}
        .cbtn-h:hover{background:${D.surf2}!important;color:${D.tx}!important}
        .ldr-row:hover{background:${D.surf2}!important}
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"10px 22px",background:D.surf,borderBottom:`1px solid ${D.bdr}`,
        position:"sticky",top:0,zIndex:100,flexWrap:"wrap",gap:8}}>

        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:17,fontWeight:700,letterSpacing:"-.5px",
            background:`linear-gradient(120deg,${D.cyan},${D.pur})`,
            WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            ⌨ TypeFlow
          </span>
          <div style={{display:"flex",alignItems:"center",gap:7,background:D.surf2,
            padding:"4px 11px",borderRadius:20,border:`1px solid ${D.bdr}`}}>
            <span style={{fontSize:11,fontWeight:700,color:D.cyan}}>Lv.{level}</span>
            <div style={{width:50,height:3,background:D.bdr,borderRadius:2,overflow:"hidden"}}>
              <div style={{width:`${(xpProg/200)*100}%`,height:"100%",borderRadius:2,
                background:`linear-gradient(90deg,${D.cyan},${D.pur})`,transition:"width .5s"}}/>
            </div>
            <span style={{fontSize:10,color:D.tx2}}>{xpProg}/200</span>
          </div>
        </div>

        <div style={{display:"flex",gap:3}}>
          {[["test","⌨ Type"],["dashboard","📊 Stats"],["leaderboard","🏆 Ranks"],["coach","🧠 Coach"]].map(([v,l])=>(
            <button key={v} className="nbtn" onClick={()=>setView(v)} style={{
              padding:"6px 13px",border:view===v?`1px solid ${D.bdr}`:"1px solid transparent",
              borderRadius:8,cursor:"pointer",fontSize:12.5,fontWeight:500,
              fontFamily:"'Sora',sans-serif",background:view===v?D.surf2:"transparent",
              color:view===v?D.cyan:D.tx2,transition:"all .2s"}}>
              {l}
            </button>
          ))}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:4,background:"#7c3aed1a",
            color:D.pur,padding:"4px 10px",borderRadius:12,fontSize:12,fontWeight:600,
            border:"1px solid #7c3aed33"}}>
            🔥{streak}
          </div>
          <button onClick={()=>setDark(!dark)} style={{width:32,height:32,borderRadius:8,
            border:`1px solid ${D.bdr}`,background:D.surf2,color:D.tx2,cursor:"pointer",
            fontSize:15,transition:"all .2s"}}>
            {dark?"☀":"🌙"}
          </button>
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <div style={{maxWidth:860,margin:"0 auto",padding:"26px 20px"}}>

        {/* ═══════════════════════ TEST VIEW ══════════════════════════════*/}
        {view==="test" && (
          <div>
            {/* Controls */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18,alignItems:"center"}}>
              {/* Time */}
              <div style={{display:"flex",alignItems:"center",gap:5,background:D.surf,
                border:`1px solid ${D.bdr}`,borderRadius:10,padding:"5px 10px"}}>
                <span style={{fontSize:10,fontWeight:700,color:D.tx2,textTransform:"uppercase",
                  letterSpacing:.5,paddingRight:6,borderRight:`1px solid ${D.bdr}`,marginRight:2}}>
                  Time
                </span>
                {[30,60,120].map(d=>(
                  <button key={d} className="cbtn-h" onClick={()=>setDur(d)} style={{
                    padding:"4px 11px",border:"none",borderRadius:6,cursor:"pointer",
                    fontSize:12,fontWeight:500,fontFamily:"'Sora',sans-serif",transition:"all .2s",
                    background:dur===d?D.cyan:"transparent",color:dur===d?"#000":D.tx2}}>
                    {d}s
                  </button>
                ))}
              </div>
              {/* Difficulty */}
              <div style={{display:"flex",alignItems:"center",gap:5,background:D.surf,
                border:`1px solid ${D.bdr}`,borderRadius:10,padding:"5px 10px"}}>
                <span style={{fontSize:10,fontWeight:700,color:D.tx2,textTransform:"uppercase",
                  letterSpacing:.5,paddingRight:6,borderRight:`1px solid ${D.bdr}`,marginRight:2}}>
                  Level
                </span>
                {[["easy",D.grn],["medium",D.cyan],["hard",D.red]].map(([d,clr])=>(
                  <button key={d} className="cbtn-h" onClick={()=>setDiff(d)} style={{
                    padding:"4px 11px",border:"none",borderRadius:6,cursor:"pointer",
                    fontSize:12,fontWeight:500,fontFamily:"'Sora',sans-serif",
                    textTransform:"capitalize",transition:"all .2s",
                    background:diff===d?clr:"transparent",color:diff===d?"#000":D.tx2}}>
                    {d}
                  </button>
                ))}
              </div>
              {phase==="running" && (
                <button onClick={initText} style={{display:"flex",alignItems:"center",gap:5,
                  padding:"7px 14px",border:`1px solid ${D.bdr}`,background:"transparent",
                  color:D.tx2,borderRadius:8,cursor:"pointer",fontSize:12,
                  fontFamily:"'Sora',sans-serif",transition:"all .2s",marginLeft:"auto"}}>
                  ↺ Reset
                </button>
              )}
            </div>

            {/* Stats bar */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",
              gap:28,marginBottom:14}}>
              <StatPill value={liveWPM} unit="wpm"  color={D.cyan} label="Speed"/>
              {/* Timer ring */}
              <div style={{position:"relative",width:60,height:60,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg viewBox="0 0 56 56" style={{position:"absolute",top:0,left:0,
                  width:"100%",height:"100%",transform:"rotate(-90deg)"}}>
                  <circle cx="28" cy="28" r="22" fill="none" stroke={D.bdr} strokeWidth={4}/>
                  <circle cx="28" cy="28" r="22" fill="none"
                    stroke={tLeft<=10?D.red:D.cyan} strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={`${(timerPct/100)*138.2} 138.2`}
                    style={{transition:"stroke-dasharray 1s linear"}}/>
                </svg>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,
                  fontWeight:700,color:tLeft<=10?D.red:D.tx,zIndex:1}}>{tLeft}</span>
              </div>
              <StatPill value={liveAcc} unit="%" color={D.grn} label="Accuracy"/>
            </div>

            {/* Progress bar */}
            <div style={{height:3,background:D.bdr,borderRadius:2,marginBottom:18,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progPct}%`,borderRadius:2,
                background:`linear-gradient(90deg,${D.cyan},${D.pur})`,transition:"width 1s linear"}}/>
            </div>

            {/* Typing area */}
            {phase !== "done" && (
              <div style={{position:"relative",background:D.surf,border:`2px solid ${phase==="running"?D.cyan:D.bdr}`,
                borderRadius:16,padding:"24px 28px",marginBottom:16,minHeight:110,
                borderStyle:phase==="idle"?"dashed":"solid",cursor:"text"}}>
                {phase==="idle" && (
                  <div style={{position:"absolute",top:"50%",left:"50%",
                    transform:"translate(-50%,-50%)",color:D.tx2,fontSize:13.5,
                    display:"flex",alignItems:"center",gap:8,pointerEvents:"none"}}>
                    ▶ Start typing to begin…
                  </div>
                )}
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:17,
                  lineHeight:2,letterSpacing:".02em",wordBreak:"break-word"}}>
                  {chars.map((ch,i) => (
                    <span key={i} className={`ch-${ch.st}${i===idx?" ch-cur":""}`}>
                      {ch.c===" "?"\u00A0":ch.c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Result card */}
            {phase==="done" && lastSess && (
              <div style={{background:D.surf,border:`1px solid ${D.bdr}`,borderRadius:16,
                padding:28,marginBottom:16,textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:700,marginBottom:20}}>Test Complete 🎉</div>
                <div style={{display:"flex",justifyContent:"center",gap:40,marginBottom:24}}>
                  {[
                    [lastSess.wpm,"WPM",D.cyan],
                    [`${lastSess.accuracy}%`,"Accuracy",D.grn],
                    [`+${lastSess.xp}`,"XP Earned",D.ylw],
                  ].map(([v,l,c])=>(
                    <div key={l} style={{textAlign:"center"}}>
                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:36,
                        fontWeight:700,color:c,lineHeight:1.1}}>{v}</div>
                      <div style={{fontSize:10,color:D.tx2,fontWeight:700,
                        textTransform:"uppercase",letterSpacing:.5,marginTop:4}}>{l}</div>
                    </div>
                  ))}
                </div>
                <button onClick={initText} style={{padding:"9px 22px",background:D.cyan,
                  color:"#000",border:"none",borderRadius:10,fontSize:13,fontWeight:600,
                  cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                  ↺ Try Again
                </button>
              </div>
            )}

            {/* Virtual Keyboard */}
            <VirtualKeyboard activeKey={aKey} errorMap={sessErr}/>
          </div>
        )}

        {/* ═══════════════════════ DASHBOARD VIEW ═════════════════════════*/}
        {view==="dashboard" && (
          <div>
            <div style={{fontSize:19,fontWeight:700,marginBottom:18}}>Your Progress</div>

            {/* Stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",
              gap:12,marginBottom:22}}>
              {[
                ["Avg WPM", avgWPM, "", D.cyan],
                ["Best WPM", bestWPM, "", D.grn],
                ["Avg Accuracy", avgAcc, "%", D.ylw],
                ["Tests Taken", sessions.length, "", D.pur],
              ].map(([l,v,u,c])=>(
                <div key={l} style={{background:D.surf,border:`1px solid ${D.bdr}`,
                  borderRadius:13,padding:16}}>
                  <div style={{width:34,height:34,borderRadius:9,marginBottom:10,
                    background:`${c}20`,display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:18}}>
                    {c===D.cyan?"⚡":c===D.grn?"📈":c===D.ylw?"🎯":"🏅"}
                  </div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:27,
                    fontWeight:700,color:D.tx}}>
                    {v}<span style={{fontSize:14,color:D.tx2}}>{u}</span>
                  </div>
                  <div style={{fontSize:11.5,color:D.tx2,marginTop:4}}>{l}</div>
                </div>
              ))}
            </div>

            {chartData.length > 1 && (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                {[
                  ["Speed over time","wpm",D.cyan],
                  ["Accuracy over time","acc",D.grn],
                ].map(([title,key,color])=>(
                  <div key={key} style={{background:D.surf,border:`1px solid ${D.bdr}`,
                    borderRadius:13,padding:16}}>
                    <div style={{fontSize:12.5,fontWeight:600,color:D.tx2,marginBottom:12}}>{title}</div>
                    <ResponsiveContainer width="100%" height={170}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={D.bdr}/>
                        <XAxis dataKey="n" tick={tickS}/>
                        <YAxis tick={tickS} domain={key==="acc"?[0,100]:["auto","auto"]}/>
                        <Tooltip contentStyle={ttipStyle}/>
                        <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={false}/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}

            {Object.keys(errMap).length > 0 && (
              <div style={{background:D.surf,border:`1px solid ${D.bdr}`,
                borderRadius:13,padding:16,marginBottom:22}}>
                <div style={{fontSize:12.5,fontWeight:600,color:D.tx2,marginBottom:12}}>Most mistyped keys</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={Object.entries(errMap).sort(([,a],[,b])=>b-a).slice(0,12)
                    .map(([k,v])=>({ k:k===" "?"sp":k, v }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={D.bdr}/>
                    <XAxis dataKey="k" tick={{...tickS,fontSize:12}}/>
                    <YAxis tick={tickS}/>
                    <Tooltip contentStyle={ttipStyle}/>
                    <Bar dataKey="v" fill={D.ylw} radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Badges */}
            <div style={{fontSize:17,fontWeight:700,marginBottom:14}}>Achievements</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
              {BADGES.map(b=>{
                const on = badges.includes(b.id);
                return (
                  <div key={b.id} style={{background:D.surf,
                    border:`1px solid ${on?D.cyan:D.bdr}`,borderRadius:11,padding:13,
                    textAlign:"center",opacity:on?1:.35,filter:on?"none":"grayscale(1)",
                    background:on?`${D.cyan}0d`:D.surf,transition:"all .2s"}}>
                    <div style={{fontSize:26,marginBottom:5}}>{b.icon}</div>
                    <div style={{fontSize:11.5,fontWeight:700,marginBottom:3}}>{b.name}</div>
                    <div style={{fontSize:10,color:D.tx2}}>{b.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════ LEADERBOARD VIEW ═══════════════════════*/}
        {view==="leaderboard" && (
          <div>
            <div style={{fontSize:19,fontWeight:700,marginBottom:18}}>🏆 Personal Bests</div>
            {sessions.length === 0 ? (
              <div style={{textAlign:"center",color:D.tx2,padding:"60px 20px",fontSize:14}}>
                No sessions yet — complete a test to see your stats!
              </div>
            ) : (
              <div style={{background:D.surf,border:`1px solid ${D.bdr}`,borderRadius:13,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"44px 1fr 70px 70px 60px 60px",
                  padding:"10px 16px",background:D.surf2,borderBottom:`1px solid ${D.bdr}`,
                  fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,color:D.tx2}}>
                  <span>#</span><span>Date</span><span>WPM</span><span>Acc</span><span>Time</span><span>XP</span>
                </div>
                {[...sessions].sort((a,b)=>b.wpm-a.wpm).slice(0,25).map((s,i)=>{
                  const bg = i===0?"#fbbf241a":i===1?"#94a3b81a":i===2?"#cd7c221a":"transparent";
                  const accColor = s.accuracy>=95?D.grn:s.accuracy>=80?D.ylw:D.red;
                  return (
                    <div key={s.id} className="ldr-row" style={{display:"grid",
                      gridTemplateColumns:"44px 1fr 70px 70px 60px 60px",
                      padding:"10px 16px",borderBottom:`1px solid ${D.bdr}`,
                      fontSize:12.5,alignItems:"center",background:bg,transition:"background .2s"}}>
                      <span>{i<3?["🥇","🥈","🥉"][i]:i+1}</span>
                      <span style={{color:D.tx2,fontSize:11.5}}>{new Date(s.date).toLocaleDateString()}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:D.cyan}}>{s.wpm}</span>
                      <span style={{fontWeight:600,color:accColor}}>{s.accuracy}%</span>
                      <span style={{color:D.tx2}}>{s.duration}s</span>
                      <span style={{color:D.ylw,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>+{s.xp}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ COACH VIEW ═════════════════════════════*/}
        {view==="coach" && (
          <div>
            <div style={{fontSize:19,fontWeight:700,marginBottom:8}}>🧠 AI Typing Coach</div>
            <p style={{color:D.tx2,fontSize:13.5,lineHeight:1.65,marginBottom:22}}>
              Your coach analyzes your error patterns and generates personalized exercises targeting your weakest keys.
            </p>

            {Object.keys(errMap).length > 0 && (
              <div style={{background:D.surf,border:`1px solid ${D.bdr}`,borderRadius:13,padding:16,marginBottom:18}}>
                <div style={{fontSize:11.5,fontWeight:700,color:D.tx2,textTransform:"uppercase",
                  letterSpacing:.5,marginBottom:11}}>Your weak keys</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
                  {Object.entries(errMap).sort(([,a],[,b])=>b-a).slice(0,8).map(([k,v])=>(
                    <div key={k} style={{display:"flex",alignItems:"center",gap:7}}>
                      <kbd style={{background:D.surf2,border:`1px solid ${D.bdr}`,borderRadius:6,
                        padding:"3px 9px",fontFamily:"'JetBrains Mono',monospace",fontSize:12,
                        fontWeight:600,color:D.red}}>{k===" "?"SPACE":k.toUpperCase()}</kbd>
                      <span style={{fontSize:11,color:D.tx2}}>{v} errors</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={genCoach} disabled={coachBusy} style={{
              padding:"11px 26px",background:`linear-gradient(125deg,${D.cyan},${D.pur})`,
              color:"#fff",border:"none",borderRadius:11,fontSize:13.5,fontWeight:600,
              cursor:coachBusy?"not-allowed":"pointer",fontFamily:"'Sora',sans-serif",
              opacity:coachBusy?.55:1,marginBottom:22,transition:"all .2s"}}>
              {coachBusy?"⏳ Generating…":"✨ Generate Personalized Exercise"}
            </button>

            {coach && (
              <div style={{background:D.surf,border:`1px solid ${D.bdr}`,borderRadius:13,padding:22}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:15.5,lineHeight:1.85,
                  color:D.tx,background:D.surf2,borderRadius:10,padding:15,marginBottom:16,
                  border:`1px solid ${D.bdr}`}}>
                  {coach.exercise}
                </div>
                {coach.tips?.length > 0 && (
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:12.5,fontWeight:700,marginBottom:8}}>💡 Tips</div>
                    {coach.tips.map((t,i)=>(
                      <p key={i} style={{fontSize:12.5,color:D.tx2,lineHeight:1.6,padding:"3px 0"}}>• {t}</p>
                    ))}
                  </div>
                )}
                <button style={{display:"inline-flex",alignItems:"center",gap:5,
                  padding:"9px 18px",background:D.grn,color:"#000",border:"none",
                  borderRadius:9,fontSize:12.5,fontWeight:600,cursor:"pointer",
                  fontFamily:"'Sora',sans-serif"}}>
                  ▶ Practice this exercise (copy it to custom mode)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
