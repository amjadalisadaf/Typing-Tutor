import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from "recharts";
import {
  Zap, Target, RotateCcw, TrendingUp, Award, Flame,
  Sun, Moon, ChevronRight, Play, Brain,
} from "lucide-react";

/* ─── Text Pools ──────────────────────────────────────────────────────────── */
const TEXTS = {
  easy: [
    "the quick brown fox jumps over the lazy dog and runs away fast",
    "a big cat sat on the mat and looked at the fat rat by the wall",
    "jack and jill went up the hill to fetch a pail of cold water today",
    "she sells sea shells by the sea shore on a warm and sunny summer day",
    "the sun sets in the west and always rises in the east every single day",
  ],
  medium: [
    "Programming is the art of telling another human what one wants the computer to do and making it happen correctly.",
    "The best way to predict the future is to invent it, so start building your dreams one line of code at a time.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts above all else.",
    "In the middle of every difficulty lies opportunity, and those who seek it with patience will surely find it.",
    "Technology is best when it brings people together and creates meaningful connections between curious minds.",
  ],
  hard: [
    "Asymptotic complexity analysis reveals that quicksort achieves O(n log n) average-case performance, maintaining cache efficiency through its clever partitioning strategy.",
    "The Byzantine generals problem exemplifies distributed consensus challenges: coordinating agreement among decentralized nodes when communication channels may be unreliable or adversarial.",
    "Functional programming paradigms emphasize immutability, pure functions, and declarative composition, enabling developers to reason about correctness with mathematical precision.",
    "Quantum entanglement demonstrates non-local correlations between particles, challenging classical intuitions about locality and providing computational advantages in cryptographic protocols.",
    "The Zermelo-Fraenkel axioms provide a rigorous foundation for set theory, resolving paradoxes inherent in naive comprehension through carefully crafted restrictions.",
  ],
};

/* ─── Keyboard Layout ─────────────────────────────────────────────────────── */
const KB_ROWS = [
  ["`","1","2","3","4","5","6","7","8","9","0","-","="],
  ["q","w","e","r","t","y","u","i","o","p","[","]","\\"],
  ["a","s","d","f","g","h","j","k","l",";","'"],
  ["z","x","c","v","b","n","m",",",".","/"],
];

/* ─── Badge Definitions ───────────────────────────────────────────────────── */
const BADGES = [
  { id:"first",   icon:"🎯", name:"First Steps",     desc:"Complete first test",   check:(s,_)=>s.length>=1 },
  { id:"wpm50",   icon:"⚡", name:"Speed Seeker",    desc:"Reach 50 WPM",          check:(s,_)=>s.some(x=>x.wpm>=50) },
  { id:"wpm80",   icon:"🔥", name:"Speed Demon",     desc:"Reach 80 WPM",          check:(s,_)=>s.some(x=>x.wpm>=80) },
  { id:"wpm100",  icon:"💯", name:"Century Club",    desc:"Reach 100 WPM",         check:(s,_)=>s.some(x=>x.wpm>=100) },
  { id:"acc99",   icon:"👑", name:"Accuracy King",   desc:"99%+ accuracy",         check:(s,_)=>s.some(x=>x.accuracy>=99) },
  { id:"perfect", icon:"✨", name:"Flawless",         desc:"100% accuracy",         check:(s,_)=>s.some(x=>x.accuracy===100) },
  { id:"str3",    icon:"📅", name:"Committed",        desc:"3-day streak",          check:(_,m)=>m.streak>=3 },
  { id:"str7",    icon:"🗓️", name:"Streak Master",   desc:"7-day streak",          check:(_,m)=>m.streak>=7 },
  { id:"t10",     icon:"🎓", name:"Dedicated",        desc:"10 tests completed",    check:(s,_)=>s.length>=10 },
  { id:"t50",     icon:"🏆", name:"Typing Veteran",  desc:"50 tests completed",    check:(s,_)=>s.length>=50 },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const wpm    = (cc, ms) => ms < 500 ? 0 : Math.round((cc / 5) / (ms / 60000));
const acc    = (c, t)   => t === 0  ? 100 : Math.round((c / t) * 100);
const xpFor  = (w, a)   => Math.round(w * (a / 100) * 2);
const lvlOf  = (xp)     => Math.floor(xp / 200) + 1;

const ls = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ─── Virtual Keyboard ────────────────────────────────────────────────────── */
function VirtualKeyboard({ active, errMap }) {
  const maxErr = Math.max(...Object.values(errMap), 1);
  const keyClass = k => {
    const e = errMap[k] || 0;
    if (!e) return "key";
    const r = e / maxErr;
    if (r > 0.66) return "key kerr3";
    if (r > 0.33) return "key kerr2";
    return "key kerr1";
  };
  return (
    <div className="kbwrap">
      {KB_ROWS.map((row, ri) => (
        <div key={ri} className="kbrow">
          {ri===0 && null}
          {ri===1 && <div className="key kwide" style={{minWidth:52}}>Tab</div>}
          {ri===2 && <div className="key kwide" style={{minWidth:64}}>Caps</div>}
          {ri===3 && <div className="key kwide" style={{minWidth:84}}>⇧</div>}
          {row.map(k => (
            <div key={k} className={`${keyClass(k.toLowerCase())} ${active===k?"kactive":""}`}>{k}</div>
          ))}
          {ri===0 && <div className="key kwide" style={{minWidth:64}}>⌫</div>}
          {ri===2 && <div className="key kwide" style={{minWidth:72}}>Enter ↵</div>}
          {ri===3 && <div className="key kwide" style={{minWidth:84}}>⇧</div>}
        </div>
      ))}
      <div className="kbrow"><div className="key kwide" style={{minWidth:260}}>Space</div></div>
    </div>
  );
}

/* ─── Stat Card ───────────────────────────────────────────────────────────── */
function Card({ label, value, unit, icon, accent }) {
  return (
    <div className="scard" style={{"--ac": accent}}>
      <div className="scard-icon">{icon}</div>
      <div className="scard-val">{value}<span className="scard-unit">{unit}</span></div>
      <div className="scard-lbl">{label}</div>
    </div>
  );
}

/* ─── Main App ────────────────────────────────────────────────────────────── */
export default function App() {
  /* UI state */
  const [dark,     setDark]     = useState(() => ls.get("tt-dark", true));
  const [view,     setView]     = useState("test");

  /* Test config */
  const [diff,     setDiff]     = useState("medium");
  const [dur,      setDur]      = useState(60);
  const [mode,     setMode]     = useState("paragraph");
  const [custom,   setCustom]   = useState("");

  /* Test runtime */
  const [phase,    setPhase]    = useState("idle"); // idle|running|done
  const [chars,    setChars]    = useState([]);      // [{c, st: pending|ok|bad}]
  const [idx,      setIdx]      = useState(0);
  const [tLeft,    setTLeft]    = useState(60);
  const [aKey,     setAKey]     = useState("");
  const [sessErr,  setSessErr]  = useState({});      // errors this session
  const [liveWPM,  setLiveWPM]  = useState(0);
  const [liveAcc,  setLiveAcc]  = useState(100);

  /* Persistent */
  const [sessions, setSessions] = useState(() => ls.get("tt-sess", []));
  const [totalXP,  setTotalXP]  = useState(() => ls.get("tt-xp",   0));
  const [streak,   setStreak]   = useState(() => ls.get("tt-str",  0));
  const [lastDate, setLastDate] = useState(() => ls.get("tt-ld",   null));
  const [badges,   setBadges]   = useState(() => ls.get("tt-bdg",  []));
  const [errMap,   setErrMap]   = useState(() => ls.get("tt-emap", {}));

  /* AI Coach */
  const [coachBusy, setCoachBusy] = useState(false);
  const [coach,     setCoach]     = useState(null);

  /* Refs to avoid stale closures */
  const phaseRef    = useRef("idle");
  const idxRef      = useRef(0);
  const textRef     = useRef("");
  const startRef    = useRef(null);
  const okRef       = useRef(0);
  const totRef      = useRef(0);
  const sessErrRef  = useRef({});
  const durRef      = useRef(60);
  const diffRef     = useRef("medium");
  const timerRef    = useRef(null);
  const finishRef   = useRef(null);

  /* Keep refs in sync */
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { idxRef.current   = idx;   }, [idx]);
  useEffect(() => { textRef.current  = textRef.current; }); // updated in initText
  useEffect(() => { durRef.current   = dur;   }, [dur]);
  useEffect(() => { diffRef.current  = diff;  }, [diff]);

  /* Init text */
  const initText = useCallback(() => {
    clearInterval(timerRef.current);
    const pool = mode === "custom" && custom.trim() ? [custom.trim()] : TEXTS[diff];
    const txt  = pool[Math.floor(Math.random() * pool.length)];
    textRef.current   = txt;
    idxRef.current    = 0;
    okRef.current     = 0;
    totRef.current    = 0;
    sessErrRef.current = {};
    setChars(txt.split("").map(c => ({ c, st: "pending" })));
    setIdx(0);
    setTLeft(dur);
    setLiveWPM(0);
    setLiveAcc(100);
    setSessErr({});
    setPhase("idle");
    phaseRef.current = "idle";
  }, [mode, custom, diff, dur]);

  useEffect(() => { initText(); }, [diff, dur, mode]); // eslint-disable-line

  /* Finish test */
  const finishTest = useCallback(() => {
    clearInterval(timerRef.current);
    const elapsed = Date.now() - (startRef.current || Date.now());
    const w = wpm(okRef.current, elapsed);
    const a = acc(okRef.current, totRef.current);
    const xp = xpFor(w, a);

    const sess = {
      id: Date.now(),
      date: new Date().toISOString(),
      wpm: w, accuracy: a, xp,
      duration: durRef.current,
      difficulty: diffRef.current,
      errors: { ...sessErrRef.current },
    };

    const newSessions = [sess, ...sessions].slice(0, 100);
    setSessions(newSessions);
    ls.set("tt-sess", newSessions);

    const newXP = totalXP + xp;
    setTotalXP(newXP);
    ls.set("tt-xp", newXP);

    // Update cumulative error map
    const newMap = { ...errMap };
    Object.entries(sessErrRef.current).forEach(([k, v]) => {
      newMap[k] = (newMap[k] || 0) + v;
    });
    setErrMap(newMap);
    ls.set("tt-emap", newMap);

    // Streak
    const today = new Date().toDateString();
    let newStreak = streak;
    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      newStreak = lastDate === yesterday ? streak + 1 : 1;
      setStreak(newStreak);
      setLastDate(today);
      ls.set("tt-str", newStreak);
      ls.set("tt-ld",  today);
    }

    // Badges
    const meta = { streak: newStreak };
    const earned = [...badges];
    BADGES.forEach(b => {
      if (!earned.includes(b.id) && b.check(newSessions, meta)) earned.push(b.id);
    });
    if (earned.length !== badges.length) {
      setBadges(earned);
      ls.set("tt-bdg", earned);
    }

    setLiveWPM(w);
    setLiveAcc(a);
    setPhase("done");
    phaseRef.current = "done";
  }, [sessions, totalXP, errMap, streak, lastDate, badges]);

  // Store latest finishTest in ref so keydown always has current version
  finishRef.current = finishTest;

  /* Timer */
  useEffect(() => {
    if (phase !== "running") return;
    timerRef.current = setInterval(() => {
      setTLeft(prev => {
        if (prev <= 1) { finishRef.current(); return 0; }
        if (startRef.current) {
          const el = Date.now() - startRef.current;
          setLiveWPM(wpm(okRef.current, el));
          setLiveAcc(acc(okRef.current, totRef.current));
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  /* Key handler */
  const handleKey = useCallback((e) => {
    const key = e.key;

    // Show active key on keyboard
    const display = key === " " ? "space" : key.toLowerCase();
    setAKey(display);
    setTimeout(() => setAKey(""), 120);

    if (key === "Escape") { initText(); return; }
    if (key === "Tab") { e.preventDefault(); return; }

    const curPhase = phaseRef.current;
    if (curPhase === "done") return;

    // Start test on first printable key
    if (curPhase === "idle" && key.length === 1) {
      phaseRef.current = "running";
      setPhase("running");
      startRef.current = Date.now();
    }

    if (phaseRef.current !== "running") return;

    if (key === "Backspace") {
      const ci = idxRef.current;
      if (ci <= 0) return;
      const ni = ci - 1;
      idxRef.current = ni;
      setIdx(ni);
      setChars(prev => {
        const next = [...prev];
        const wasOk = next[ni].st === "ok";
        next[ni] = { c: next[ni].c, st: "pending" };
        if (wasOk) okRef.current = Math.max(0, okRef.current - 1);
        totRef.current = Math.max(0, totRef.current - 1);
        return next;
      });
      return;
    }

    if (key.length !== 1) return;
    const ci = idxRef.current;
    const txt = textRef.current;
    if (ci >= txt.length) { finishRef.current(); return; }

    const expected = txt[ci];
    const ok = key === expected;
    totRef.current++;
    if (ok) {
      okRef.current++;
    } else {
      const ek = expected.toLowerCase();
      sessErrRef.current[ek] = (sessErrRef.current[ek] || 0) + 1;
      setSessErr(prev => ({ ...prev, [ek]: (prev[ek] || 0) + 1 }));
    }

    const ni = ci + 1;
    idxRef.current = ni;
    setIdx(ni);
    setChars(prev => {
      const next = [...prev];
      next[ci] = { c: expected, st: ok ? "ok" : "bad" };
      return next;
    });

    if (ni >= txt.length) finishRef.current();
  }, [initText]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  /* AI Coach */
  const genCoach = async () => {
    setCoachBusy(true);
    setCoach(null);
    const weak = Object.entries(errMap).sort(([,a],[,b]) => b - a).slice(0, 8).map(([k]) => k);
    const prompt = weak.length > 0
      ? `You are a typing coach. The user struggles most with these characters: ${weak.join(", ")}.
Generate a typing exercise (3-4 sentences, ~100 words) heavily using these characters.
Also give 2 practical tips for these specific keys.
Respond ONLY with valid JSON (no markdown, no prose outside the JSON):
{"exercise":"...","tips":["...","..."],"focusKeys":["..."]}`
      : `You are a typing coach. Generate a beginner typing warm-up exercise (3-4 sentences, ~80 words).
Respond ONLY with valid JSON:
{"exercise":"...","tips":["...","..."],"focusKeys":[]}`;

    try {
      const res  = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const raw  = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      setCoach(JSON.parse(clean));
    } catch {
      setCoach({
        exercise: "The five boxing wizards jump quickly. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! Sphinx of black quartz, judge my vow.",
        tips: ["Keep your fingers resting on the home row keys at all times.", "Focus on accuracy first — speed will follow naturally with practice."],
        focusKeys: [],
      });
    }
    setCoachBusy(false);
  };

  /* Derived data */
  const level     = lvlOf(totalXP);
  const xpProg    = totalXP % 200;
  const lastSess  = sessions[0];
  const chartData = [...sessions].reverse().slice(-20).map((s, i) => ({ n: i+1, wpm: s.wpm, acc: s.accuracy }));
  const avgWPM    = sessions.length ? Math.round(sessions.reduce((a,s) => a+s.wpm,0) / sessions.length) : 0;
  const bestWPM   = sessions.length ? Math.max(...sessions.map(s=>s.wpm)) : 0;
  const avgAcc    = sessions.length ? Math.round(sessions.reduce((a,s) => a+s.accuracy,0) / sessions.length) : 0;
  const timerPct  = (tLeft / dur) * 100;
  const progPct   = phase === "running" ? ((dur - tLeft) / dur) * 100 : 0;

  const tooltipStyle = { background: dark ? "#1e293b" : "#fff", border: "1px solid #334155", borderRadius: 8, fontSize: 12 };
  const tickStyle    = { fontSize: 11, fill: dark ? "#64748b" : "#94a3b8" };

  return (
    <div data-theme={dark ? "dark" : "light"} className="app">
      <style>{globalCSS}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="hdr">
        <div className="hdr-l">
          <span className="logo">⌨ TypeFlow</span>
          <div className="lvlbadge">
            <span className="lvlnum">Lv.{level}</span>
            <div className="xpbar"><div className="xpfill" style={{width:`${(xpProg/200)*100}%`}}/></div>
            <span className="xplbl">{xpProg}/200 XP</span>
          </div>
        </div>

        <nav className="nav">
          {[["test","⌨ Type"],["dashboard","📊 Stats"],["leaderboard","🏆 Ranks"],["coach","🧠 Coach"]].map(([v,lbl])=>(
            <button key={v} className={`navbtn ${view===v?"navact":""}`} onClick={()=>setView(v)}>{lbl}</button>
          ))}
        </nav>

        <div className="hdr-r">
          <div className="strkbdg"><Flame size={13}/>{streak}</div>
          <button className="thmbtn" onClick={()=>{ const d=!dark; setDark(d); ls.set("tt-dark",d); }}>
            {dark ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="main">

        {/* ════════════════════════ TEST VIEW ═════════════════════════════ */}
        {view==="test" && (
          <div className="testview">
            {/* Controls */}
            <div className="controls">
              <div className="cgrp">
                <span className="clbl">Time</span>
                {[30,60,120].map(d=>(
                  <button key={d} className={`cbtn ${dur===d?"cact":""}`} onClick={()=>setDur(d)}>{d}s</button>
                ))}
              </div>
              <div className="cgrp">
                <span className="clbl">Level</span>
                {["easy","medium","hard"].map(d=>(
                  <button key={d} className={`cbtn ${diff===d?"cact":""} diff-${d}`} onClick={()=>setDiff(d)}>{d}</button>
                ))}
              </div>
              <div className="cgrp">
                <span className="clbl">Mode</span>
                {["paragraph","custom"].map(m=>(
                  <button key={m} className={`cbtn ${mode===m?"cact":""}`} onClick={()=>setMode(m)}>{m}</button>
                ))}
              </div>
              {phase==="running" && (
                <button className="rstbtn" onClick={initText}><RotateCcw size={13}/> Reset</button>
              )}
            </div>

            {mode==="custom" && (
              <textarea
                className="custtxt"
                placeholder="Paste your custom text here…"
                value={custom}
                onChange={e=>setCustom(e.target.value)}
                rows={3}
              />
            )}

            {/* Live stats bar */}
            <div className="statsbar">
              <div className="statpill wpm-pill"><Zap size={13}/>{liveWPM} <span>WPM</span></div>
              <div className={`timerring ${tLeft<=10?"urgent":""}`}>
                <svg viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="23" className="ttrack"/>
                  <circle cx="28" cy="28" r="23" className="tarc"
                    strokeDasharray={`${(timerPct/100)*144.5} 144.5`}
                    strokeDashoffset="36"
                  />
                </svg>
                <span className="tnum">{tLeft}</span>
              </div>
              <div className="statpill acc-pill"><Target size={13}/>{liveAcc}<span>%</span></div>
            </div>

            {/* Progress bar */}
            <div className="progwrap"><div className="progfill" style={{width:`${progPct}%`}}/></div>

            {/* Typing area */}
            <div className={`typarea ${phase==="idle"?"idlearea":""}`} tabIndex={0}>
              {phase==="idle" && (
                <div className="starthint"><Play size={17}/> Start typing to begin…</div>
              )}
              <div className="typtext">
                {chars.map((ch, i) => (
                  <span key={i} className={`ch ch-${ch.st}${i===idx?" ch-cur":""}`}>
                    {ch.c===" " ? "\u00A0" : ch.c}
                  </span>
                ))}
              </div>
            </div>

            {/* Results overlay */}
            {phase==="done" && lastSess && (
              <div className="resultcard">
                <h2 className="restitle">Test Complete 🎉</h2>
                <div className="resgrid">
                  <div className="resstat"><span className="resval rv-wpm">{lastSess.wpm}</span><span className="reslbl">WPM</span></div>
                  <div className="resstat"><span className="resval rv-acc">{lastSess.accuracy}%</span><span className="reslbl">Accuracy</span></div>
                  <div className="resstat"><span className="resval rv-xp">+{lastSess.xp}</span><span className="reslbl">XP Earned</span></div>
                </div>
                <button className="retrybtn" onClick={initText}><RotateCcw size={14}/> Try Again</button>
              </div>
            )}

            {/* Virtual Keyboard */}
            <VirtualKeyboard active={aKey} errMap={sessErr}/>
          </div>
        )}

        {/* ════════════════════════ DASHBOARD VIEW ════════════════════════ */}
        {view==="dashboard" && (
          <div>
            <h2 className="ptitle">Your Progress</h2>
            <div className="scardgrid">
              <Card label="Average WPM"  value={avgWPM}          unit=""  icon={<Zap size={18}/>}       accent="var(--cyan)"/>
              <Card label="Best WPM"     value={bestWPM}         unit=""  icon={<TrendingUp size={18}/>} accent="var(--grn)"/>
              <Card label="Avg Accuracy" value={`${avgAcc}`}     unit="%" icon={<Target size={18}/>}    accent="var(--ylw)"/>
              <Card label="Tests Taken"  value={sessions.length} unit=""  icon={<Award size={18}/>}     accent="var(--pur)"/>
            </div>

            {chartData.length > 0 && (
              <div className="chartgrid">
                <div className="chartcard">
                  <p className="charttitle">Speed over time</p>
                  <ResponsiveContainer width="100%" height={190}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={dark?"#1e293b":"#e2e8f0"}/>
                      <XAxis dataKey="n" tick={tickStyle}/>
                      <YAxis tick={tickStyle}/>
                      <Tooltip contentStyle={tooltipStyle}/>
                      <Line type="monotone" dataKey="wpm" stroke="var(--cyan)" strokeWidth={2} dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="chartcard">
                  <p className="charttitle">Accuracy over time</p>
                  <ResponsiveContainer width="100%" height={190}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={dark?"#1e293b":"#e2e8f0"}/>
                      <XAxis dataKey="n" tick={tickStyle}/>
                      <YAxis domain={[0,100]} tick={tickStyle}/>
                      <Tooltip contentStyle={tooltipStyle}/>
                      <Line type="monotone" dataKey="acc" stroke="var(--grn)" strokeWidth={2} dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {Object.keys(errMap).length > 0 && (
              <div className="chartcard" style={{marginBottom:20}}>
                <p className="charttitle">Most mistyped keys</p>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={Object.entries(errMap).sort(([,a],[,b])=>b-a).slice(0,12).map(([k,v])=>({k:k===" "?"sp":k,v}))}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark?"#1e293b":"#e2e8f0"}/>
                    <XAxis dataKey="k" tick={{...tickStyle,fontSize:12}}/>
                    <YAxis tick={tickStyle}/>
                    <Tooltip contentStyle={tooltipStyle}/>
                    <Bar dataKey="v" fill="var(--ylw)" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <h3 className="ptitle" style={{marginTop:28,fontSize:17}}>Achievements</h3>
            <div className="bdggrid">
              {BADGES.map(b=>(
                <div key={b.id} className={`bdgcard ${badges.includes(b.id)?"bdgon":"bdgoff"}`}>
                  <span className="bdgico">{b.icon}</span>
                  <span className="bdgname">{b.name}</span>
                  <span className="bdgdesc">{b.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════ LEADERBOARD VIEW ══════════════════════ */}
        {view==="leaderboard" && (
          <div>
            <h2 className="ptitle">🏆 Personal Bests</h2>
            {sessions.length === 0 ? (
              <p className="empty">No sessions yet — complete a test to see your rankings!</p>
            ) : (
              <div className="ldrtbl">
                <div className="ldrhdr">
                  <span>#</span><span>Date</span><span>WPM</span><span>Acc</span><span>Time</span><span>XP</span>
                </div>
                {[...sessions].sort((a,b)=>b.wpm-a.wpm).slice(0,25).map((s,i)=>(
                  <div key={s.id} className={`ldrrow ${i===0?"gold":i===1?"silver":i===2?"bronze":""}`}>
                    <span>{i<3?["🥇","🥈","🥉"][i]:i+1}</span>
                    <span>{new Date(s.date).toLocaleDateString()}</span>
                    <span className="ldrwpm">{s.wpm}</span>
                    <span className={s.accuracy>=95?"gd":s.accuracy>=80?"md":"bd"}>{s.accuracy}%</span>
                    <span>{s.duration}s</span>
                    <span className="ldrxp">+{s.xp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════ COACH VIEW ════════════════════════════ */}
        {view==="coach" && (
          <div>
            <h2 className="ptitle"><Brain size={20} style={{display:"inline",verticalAlign:"middle",marginRight:8}}/>AI Typing Coach</h2>
            <p className="subdesc">Your personal coach analyzes your typing patterns and generates exercises targeting your weakest keys.</p>

            {Object.keys(errMap).length > 0 && (
              <div className="weakbox">
                <p className="weaklbl">Your weak keys</p>
                <div className="weaklist">
                  {Object.entries(errMap).sort(([,a],[,b])=>b-a).slice(0,8).map(([k,v])=>(
                    <div key={k} className="weakitem">
                      <kbd className="weakkey">{k===" "?"SPACE":k.toUpperCase()}</kbd>
                      <span className="weakcnt">{v} errors</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="coachlbtn" onClick={genCoach} disabled={coachBusy}>
              {coachBusy ? "Generating…" : "✨ Generate Personalized Exercise"}
            </button>

            {coach && (
              <div className="coachres">
                {coach.focusKeys?.length > 0 && (
                  <div className="focusrow">
                    <span className="focuslbl">Focus keys:</span>
                    {coach.focusKeys.map(k=><kbd key={k} className="focuskey">{k.toUpperCase()}</kbd>)}
                  </div>
                )}
                <div className="extext">{coach.exercise}</div>
                {coach.tips?.length > 0 && (
                  <div className="tipsbox">
                    <p className="tipstitle">💡 Tips</p>
                    {coach.tips.map((t,i)=><p key={i} className="tipitem">• {t}</p>)}
                  </div>
                )}
                <button className="usebtn" onClick={()=>{ setCustom(coach.exercise); setMode("custom"); setView("test"); }}>
                  <ChevronRight size={13}/> Practice this exercise
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Global CSS ──────────────────────────────────────────────────────────── */
const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

[data-theme="dark"]{
  --bg:#080c14;--surf:#0f172a;--surf2:#1e293b;--bdr:#1e293b;
  --tx:#e2e8f0;--tx2:#64748b;
  --cyan:#22d3ee;--grn:#34d399;--ylw:#fbbf24;--red:#f87171;--pur:#a78bfa;
}
[data-theme="light"]{
  --bg:#f1f5f9;--surf:#ffffff;--surf2:#f8fafc;--bdr:#e2e8f0;
  --tx:#0f172a;--tx2:#94a3b8;
  --cyan:#0891b2;--grn:#059669;--ylw:#d97706;--red:#dc2626;--pur:#7c3aed;
}

.app{min-height:100vh;background:var(--bg);color:var(--tx);font-family:'Sora',sans-serif;transition:background .3s,color .3s}

/* HEADER */
.hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 22px;
  background:var(--surf);border-bottom:1px solid var(--bdr);position:sticky;top:0;z-index:100}
.hdr-l{display:flex;align-items:center;gap:18px}
.logo{font-size:17px;font-weight:700;letter-spacing:-.5px;
  background:linear-gradient(120deg,var(--cyan),var(--pur));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent}
.lvlbadge{display:flex;align-items:center;gap:7px;background:var(--surf2);
  padding:5px 11px;border-radius:20px;border:1px solid var(--bdr)}
.lvlnum{font-size:11px;font-weight:700;color:var(--cyan)}
.xpbar{width:54px;height:3px;background:var(--bdr);border-radius:2px;overflow:hidden}
.xpfill{height:100%;background:linear-gradient(90deg,var(--cyan),var(--pur));transition:width .5s ease}
.xplbl{font-size:10px;color:var(--tx2)}
.nav{display:flex;gap:3px}
.navbtn{padding:6px 13px;border:none;border-radius:8px;cursor:pointer;
  font-size:12.5px;font-weight:500;font-family:'Sora',sans-serif;
  background:transparent;color:var(--tx2);transition:all .2s}
.navbtn:hover{background:var(--surf2);color:var(--tx)}
.navact{background:var(--surf2)!important;color:var(--cyan)!important;border:1px solid var(--bdr)}
.hdr-r{display:flex;align-items:center;gap:9px}
.strkbdg{display:flex;align-items:center;gap:4px;background:#7c3aed1a;
  color:var(--pur);padding:5px 10px;border-radius:12px;font-size:12px;font-weight:600;
  border:1px solid #7c3aed33}
.thmbtn{width:32px;height:32px;border-radius:8px;border:1px solid var(--bdr);
  background:var(--surf2);color:var(--tx2);cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:all .2s}
.thmbtn:hover{color:var(--tx);border-color:var(--cyan)}

/* MAIN */
.main{max-width:880px;margin:0 auto;padding:26px 20px}

/* CONTROLS */
.testview{}
.controls{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px;align-items:center}
.cgrp{display:flex;align-items:center;gap:5px;background:var(--surf);
  border:1px solid var(--bdr);border-radius:10px;padding:5px 9px}
.clbl{font-size:10px;font-weight:700;color:var(--tx2);text-transform:uppercase;
  letter-spacing:.5px;padding-right:5px;border-right:1px solid var(--bdr);margin-right:2px}
.cbtn{padding:4px 11px;border:none;border-radius:6px;background:transparent;
  color:var(--tx2);font-size:12px;font-weight:500;cursor:pointer;
  font-family:'Sora',sans-serif;transition:all .2s;text-transform:capitalize}
.cbtn:hover{background:var(--surf2);color:var(--tx)}
.cact{background:var(--cyan)!important;color:#000!important;font-weight:600}
.diff-easy.cact{background:var(--grn)!important}
.diff-hard.cact{background:var(--red)!important}
.rstbtn{display:flex;align-items:center;gap:5px;border:1px solid var(--bdr);
  background:transparent;color:var(--tx2);padding:6px 13px;border-radius:8px;
  cursor:pointer;font-size:12px;font-family:'Sora',sans-serif;transition:all .2s;margin-left:auto}
.rstbtn:hover{border-color:var(--red);color:var(--red)}
.custtxt{width:100%;background:var(--surf);border:1px solid var(--bdr);
  border-radius:10px;padding:11px 15px;color:var(--tx);
  font-family:'JetBrains Mono',monospace;font-size:13px;
  resize:vertical;outline:none;margin-bottom:15px;transition:border-color .2s}
.custtxt:focus{border-color:var(--cyan)}
.custtxt::placeholder{color:var(--tx2)}

/* STATS BAR */
.statsbar{display:flex;align-items:center;justify-content:center;gap:28px;margin:12px 0}
.statpill{display:flex;align-items:center;gap:7px;
  font-size:23px;font-weight:700;font-family:'JetBrains Mono',monospace;
  padding:9px 18px;background:var(--surf);border:1px solid var(--bdr);
  border-radius:11px;min-width:105px;justify-content:center}
.statpill span{font-size:11px;font-weight:500;color:var(--tx2);font-family:'Sora',sans-serif}
.wpm-pill{color:var(--cyan);border-color:#22d3ee2a}
.acc-pill{color:var(--grn);border-color:#34d3992a}

/* TIMER RING */
.timerring{position:relative;width:58px;height:58px;display:flex;align-items:center;justify-content:center}
.timerring svg{position:absolute;top:0;left:0;width:100%;height:100%;transform:rotate(-90deg)}
.ttrack{fill:none;stroke:var(--bdr);stroke-width:4}
.tarc{fill:none;stroke:var(--cyan);stroke-width:4;stroke-linecap:round;transition:stroke-dasharray 1s linear}
.urgent .tarc{stroke:var(--red);animation:urpulse .5s ease-in-out infinite alternate}
.tnum{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:700;color:var(--tx);z-index:1}
@keyframes urpulse{from{opacity:.65}to{opacity:1}}

/* PROGRESS BAR */
.progwrap{height:3px;background:var(--bdr);border-radius:2px;margin-bottom:18px;overflow:hidden}
.progfill{height:100%;background:linear-gradient(90deg,var(--cyan),var(--pur));
  border-radius:2px;transition:width 1s linear}

/* TYPING AREA */
.typarea{position:relative;background:var(--surf);border:2px solid var(--bdr);
  border-radius:16px;padding:26px 30px;margin-bottom:18px;cursor:text;
  min-height:116px;transition:border-color .2s;outline:none}
.typarea:focus{border-color:var(--cyan)}
.idlearea{border-style:dashed}
.starthint{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  display:flex;align-items:center;gap:9px;color:var(--tx2);font-size:13.5px;pointer-events:none}
.typtext{font-family:'JetBrains Mono',monospace;font-size:18px;line-height:2;letter-spacing:.03em;word-break:break-word}
.ch{position:relative;transition:color .04s}
.ch-pending{color:var(--tx2)}
.ch-ok{color:var(--tx)}
.ch-bad{color:var(--red);background:#f871711a;border-radius:2px}
.ch-cur::after{content:'';position:absolute;left:0;bottom:-1px;width:100%;height:2px;
  background:var(--cyan);animation:blink 1s step-end infinite;border-radius:1px}
.ch-cur.ch-pending{background:#22d3ee1a;border-radius:3px}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

/* RESULT CARD */
.resultcard{background:var(--surf);border:1px solid var(--bdr);border-radius:16px;
  padding:26px;margin-bottom:18px;text-align:center}
.restitle{font-size:21px;font-weight:700;margin-bottom:18px}
.resgrid{display:flex;justify-content:center;gap:36px;margin-bottom:22px}
.resstat{display:flex;flex-direction:column;align-items:center;gap:4px}
.resval{font-family:'JetBrains Mono',monospace;font-size:34px;font-weight:700}
.rv-wpm{color:var(--cyan)}.rv-acc{color:var(--grn)}.rv-xp{color:var(--ylw)}
.reslbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--tx2)}
.retrybtn{display:inline-flex;align-items:center;gap:7px;padding:9px 22px;
  background:var(--cyan);color:#000;border:none;border-radius:10px;
  font-size:13px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif;
  transition:all .2s}
.retrybtn:hover{opacity:.85;transform:translateY(-1px)}

/* KEYBOARD */
.kbwrap{display:flex;flex-direction:column;gap:5px;align-items:center;
  padding:14px;background:var(--surf);border:1px solid var(--bdr);
  border-radius:14px;overflow-x:auto;margin-top:22px}
.kbrow{display:flex;gap:4px}
.key{min-width:34px;height:34px;display:flex;align-items:center;justify-content:center;
  background:var(--surf2);border:1px solid var(--bdr);border-radius:6px;
  font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:500;
  color:var(--tx2);transition:all .12s;user-select:none;padding:0 6px;white-space:nowrap}
.kwide{padding:0 10px}
.kactive{background:var(--cyan)!important;color:#000!important;
  border-color:var(--cyan)!important;transform:translateY(1px);box-shadow:0 0 10px #22d3ee44}
.kerr1{background:#fbbf241a;border-color:#fbbf2433;color:var(--ylw)}
.kerr2{background:#f974161a;border-color:#f9741633;color:#fb923c}
.kerr3{background:#f871711a;border-color:#f8717133;color:var(--red)}

/* DASHBOARD */
.ptitle{font-size:19px;font-weight:700;margin-bottom:18px}
.scardgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:13px;margin-bottom:22px}
.scard{background:var(--surf);border:1px solid var(--bdr);border-radius:13px;padding:16px;
  display:flex;flex-direction:column;gap:5px}
.scard-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;
  background:color-mix(in srgb,var(--ac) 15%,transparent);color:var(--ac)}
.scard-val{font-family:'JetBrains Mono',monospace;font-size:27px;font-weight:700;color:var(--tx)}
.scard-unit{font-size:14px;font-weight:500;color:var(--tx2);margin-left:2px}
.scard-lbl{font-size:11.5px;color:var(--tx2);font-weight:500}
.chartgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.chartcard{background:var(--surf);border:1px solid var(--bdr);border-radius:13px;padding:16px}
.charttitle{font-size:12.5px;font-weight:600;margin-bottom:12px;color:var(--tx2)}
.bdggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:11px}
.bdgcard{background:var(--surf);border:1px solid var(--bdr);border-radius:11px;padding:13px;
  display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center;transition:all .2s}
.bdgon{border-color:var(--cyan);background:color-mix(in srgb,var(--cyan) 8%,var(--surf))}
.bdgoff{opacity:.35;filter:grayscale(1)}
.bdgico{font-size:26px}
.bdgname{font-size:11.5px;font-weight:700}
.bdgdesc{font-size:10px;color:var(--tx2)}

/* LEADERBOARD */
.ldrtbl{background:var(--surf);border:1px solid var(--bdr);border-radius:13px;overflow:hidden}
.ldrhdr{display:grid;grid-template-columns:44px 1fr 70px 70px 65px 60px;
  padding:11px 18px;background:var(--surf2);border-bottom:1px solid var(--bdr);
  font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--tx2)}
.ldrrow{display:grid;grid-template-columns:44px 1fr 70px 70px 65px 60px;
  padding:11px 18px;border-bottom:1px solid var(--bdr);font-size:12.5px;
  align-items:center;transition:background .2s}
.ldrrow:last-child{border-bottom:none}
.ldrrow:hover{background:var(--surf2)}
.gold{background:#fbbf241a}.silver{background:#94a3b81a}.bronze{background:#cd7c221a}
.ldrwpm{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--cyan)}
.gd{color:var(--grn);font-weight:600}.md{color:var(--ylw);font-weight:600}.bd{color:var(--red);font-weight:600}
.ldrxp{color:var(--ylw);font-weight:600;font-family:'JetBrains Mono',monospace}
.empty{color:var(--tx2);text-align:center;padding:60px 20px;font-size:14px}

/* COACH */
.subdesc{color:var(--tx2);font-size:13.5px;line-height:1.65;margin-bottom:22px}
.weakbox{background:var(--surf);border:1px solid var(--bdr);border-radius:13px;padding:16px;margin-bottom:18px}
.weaklbl{font-size:11.5px;font-weight:700;color:var(--tx2);text-transform:uppercase;
  letter-spacing:.5px;margin-bottom:11px}
.weaklist{display:flex;flex-wrap:wrap;gap:9px}
.weakitem{display:flex;align-items:center;gap:7px}
.weakkey{background:var(--surf2);border:1px solid var(--bdr);border-radius:6px;
  padding:3px 9px;font-family:'JetBrains Mono',monospace;font-size:12px;
  font-weight:600;color:var(--red)}
.weakcnt{font-size:11px;color:var(--tx2)}
.coachlbtn{padding:11px 26px;background:linear-gradient(125deg,var(--cyan),var(--pur));
  color:#fff;border:none;border-radius:11px;font-size:13.5px;font-weight:600;
  cursor:pointer;font-family:'Sora',sans-serif;transition:all .2s;
  margin-bottom:22px;display:inline-flex;align-items:center;gap:7px}
.coachlbtn:hover:not(:disabled){opacity:.85;transform:translateY(-1px);box-shadow:0 4px 18px #22d3ee33}
.coachlbtn:disabled{opacity:.55;cursor:not-allowed}
.coachres{background:var(--surf);border:1px solid var(--bdr);border-radius:13px;padding:22px}
.focusrow{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:13px}
.focuslbl{font-size:11.5px;font-weight:600;color:var(--tx2)}
.focuskey{background:#22d3ee1a;border:1px solid #22d3ee33;border-radius:5px;
  padding:2px 8px;font-family:'JetBrains Mono',monospace;font-size:11px;
  font-weight:600;color:var(--cyan)}
.extext{font-family:'JetBrains Mono',monospace;font-size:15.5px;line-height:1.85;
  color:var(--tx);background:var(--surf2);border-radius:10px;padding:15px;
  margin-bottom:15px;border:1px solid var(--bdr)}
.tipsbox{margin-bottom:15px}
.tipstitle{font-size:12.5px;font-weight:700;margin-bottom:7px}
.tipitem{font-size:12.5px;color:var(--tx2);line-height:1.6;padding:3px 0}
.usebtn{display:inline-flex;align-items:center;gap:5px;padding:9px 18px;
  background:var(--grn);color:#000;border:none;border-radius:9px;
  font-size:12.5px;font-weight:600;cursor:pointer;font-family:'Sora',sans-serif;transition:all .2s}
.usebtn:hover{opacity:.85;transform:translateY(-1px)}

@media(max-width:640px){
  .hdr{flex-wrap:wrap;gap:8px;padding:10px 14px}
  .nav{order:3;width:100%;justify-content:center}
  .lvlbadge{display:none}
  .chartgrid{grid-template-columns:1fr}
  .ldrhdr,.ldrrow{grid-template-columns:40px 1fr 60px 60px}
  .ldrhdr span:nth-child(5),.ldrhdr span:nth-child(6),
  .ldrrow span:nth-child(5),.ldrrow span:nth-child(6){display:none}
  .typtext{font-size:15px}
  .key{min-width:26px;height:28px;font-size:9px}
  .main{padding:18px 12px}
  .resgrid{gap:20px}
  .resval{font-size:28px}
}
`;
