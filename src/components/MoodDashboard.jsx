// src/components/MoodDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

/**
 * Redesigned / interactive Mood Dashboard
 * - Click a day to open a detail panel
 * - Quick mood log buttons (log today's mood)
 * - Daily suggestion box + micro-actions to try
 * - Keeps compatibility with existing moodEvents shape (ts + emotion)
 */

/* --- sample fallback weeks (kept from your original file) --- */
const SAMPLE_WEEKS = [
  {
    id: "this-week",
    label: "This week",
    range: "Mon – Sun",
    days: [
      { id: "mon", label: "Mon", mood: "low", score: 2, note: "Felt heavy and tired after work." },
      { id: "tue", label: "Tue", mood: "okay", score: 3, note: "Normal day, a bit stressed about tasks." },
      { id: "wed", label: "Wed", mood: "high", score: 4, note: "Good conversation with a friend." },
      { id: "thu", label: "Thu", mood: "low", score: 2, note: "Overthinking at night." },
      { id: "fri", label: "Fri", mood: "okay", score: 3, note: "Finished some pending work." },
      { id: "sat", label: "Sat", mood: "high", score: 5, note: "Felt relaxed, watched a movie." },
      { id: "sun", label: "Sun", mood: "okay", score: 3, note: "Mixed – calm but a little lonely." },
    ],
  },
  {
    id: "last-week",
    label: "Last week",
    range: "Mon – Sun",
    days: [
      { id: "mon", label: "Mon", mood: "low", score: 1, note: "Argument at home." },
      { id: "tue", label: "Tue", mood: "low", score: 2, note: "Couldn’t focus on study/work." },
      { id: "wed", label: "Wed", mood: "okay", score: 3, note: "Slowly felt a bit better." },
      { id: "thu", label: "Thu", mood: "okay", score: 3, note: "Normal, nothing special." },
      { id: "fri", label: "Fri", mood: "high", score: 4, note: "Fun evening outside." },
      { id: "sat", label: "Sat", mood: "Sat", score: 4, note: "Productive and light mood." },
      { id: "sun", label: "Sun", mood: "okay", score: 3, note: "Rest + planning for next week." },
    ],
  },
];

// small helpers reused from your original file
function moodColor(mood) {
  switch (mood) {
    case "high":
      return "bg-emerald-400";
    case "okay":
      return "bg-sky-400";
    case "low":
    default:
      return "bg-rose-400";
  }
}
function moodHex(mood) {
  switch (mood) {
    case "high":
      return "#34d399";
    case "okay":
      return "#38bdf8";
    case "low":
    default:
      return "#fb7185";
  }
}
function moodLabel(mood) {
  if (mood === "high") return "Positive";
  if (mood === "okay") return "Neutral / Mixed";
  return "Heavy / Low";
}
function getMoodKey(uid) {
  return `emoti_mood_events_${uid}`;
}
function normalizeMood(rawEmotion) {
  if (!rawEmotion) return "okay";
  const e = String(rawEmotion).toLowerCase();
  if (["anxious","anxiety","stressed","stress","sad","depressed","low","heavy","angry","lonely","overwhelmed","tired"].some(k=>e.includes(k))) return "low";
  if (["high","positive","good","better","light","relieved","hopeful","grateful","calm","happy","peaceful"].some(k=>e.includes(k))) return "high";
  return "okay";
}
function moodScore(mood) {
  switch (mood) {
    case "high": return 4.5;
    case "low": return 2;
    case "okay": default: return 3;
  }
}
function getWeekStart(date, weekOffset = 0) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday + weekOffset * 7);
  return d;
}
function buildWeekFromEvents(events, weekOffset, fallbackWeek) {
  if (!events || events.length === 0) return fallbackWeek;
  const weekStart = getWeekStart(new Date(), weekOffset);
  const ids = ["mon","tue","wed","thu","fri","sat","sun"];
  const labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const days = ids.map((id, index) => {
    const dayStart = new Date(weekStart);
    dayStart.setDate(weekStart.getDate() + index);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    const dayEvents = events.filter((e) => {
      const t = new Date(e.ts);
      return t >= dayStart && t < dayEnd;
    });
    if (dayEvents.length === 0) {
      return { id, label: labels[index], mood: "okay", score: 0, note: "No mood logged this day." };
    }
    const moodCounts = { high: 0, okay: 0, low: 0 };
    let scoreSum = 0;
    dayEvents.forEach((ev) => {
      const mood = normalizeMood(ev.emotion);
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      scoreSum += moodScore(mood);
    });
    let mood = "okay";
    if (moodCounts.high >= moodCounts.okay && moodCounts.high >= moodCounts.low) mood = "high";
    else if (moodCounts.low >= moodCounts.okay && moodCounts.low >= moodCounts.high) mood = "low";
    const avgScore = scoreSum / dayEvents.length;
    const roundedScore = Math.round(avgScore);
    let note;
    if (mood === "high") note = "Felt comparatively lighter today.";
    else if (mood === "low") note = "Felt heavier or more emotionally loaded today.";
    else note = "Mixed / neutral day overall.";
    return { id, label: labels[index], mood, score: roundedScore, note };
  });
  return { id: fallbackWeek.id, label: fallbackWeek.label, range: fallbackWeek.range, days };
}

function buildLinePath(days) {
  if (!days || !days.length) return "";
  const points = days.map((day, index) => ({ index, score: day.score && day.score > 0 ? day.score : null })).filter(p=>p.score!==null);
  if (!points.length) return "";
  const maxIndex = Math.max(days.length - 1, 1);
  return points.map((p,i)=> {
    const x = (p.index / maxIndex) * 100;
    const y = 100 - ((p.score - 1) / 4) * 100;
    const cmd = i === 0 ? "M" : "L";
    return `${cmd}${x},${y}`;
  }).join(" ");
}

export default function MoodDashboard({ onBack }) {
  const { user } = useAuth();
  const [selectedWeekId, setSelectedWeekId] = useState("this-week");
  const [viewMode, setViewMode] = useState("line");
  const [moodEvents, setMoodEvents] = useState([]);
  const [detailDay, setDetailDay] = useState(null); // the day object user clicked
  const [microActions, setMicroActions] = useState({}); // per date id -> actions
  const [dailySuggestion, setDailySuggestion] = useState("");
  const [logging, setLogging] = useState(false);

  // realtime load
  useEffect(() => {
    if (!user) {
      setMoodEvents([]);
      return;
    }
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      try {
        let events = [];
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.moodEvents)) events = data.moodEvents;
        }
        if (!events.length && typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(getMoodKey(user.uid));
            const parsed = raw ? JSON.parse(raw) : [];
            events = Array.isArray(parsed) ? parsed : [];
          } catch (err) {
            console.error("Failed to read mood events from localStorage", err);
          }
        }
        setMoodEvents(events);
      } catch (err) {
        console.error("Error processing mood events snapshot", err);
      }
    }, (error) => {
      console.error("Failed to subscribe to mood events:", error);
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem(getMoodKey(user.uid));
          const parsed = raw ? JSON.parse(raw) : [];
          setMoodEvents(Array.isArray(parsed) ? parsed : []);
        } catch (err2) {
          setMoodEvents([]);
        }
      }
    });
    return () => unsubscribe();
  }, [user]);

  // weekly views built from events
  const weeks = useMemo(() => {
    const [sampleThisWeek, sampleLastWeek] = SAMPLE_WEEKS;
    const realThisWeek = buildWeekFromEvents(moodEvents, 0, sampleThisWeek);
    const realLastWeek = buildWeekFromEvents(moodEvents, -1, sampleLastWeek);
    return [realThisWeek, realLastWeek];
  }, [moodEvents]);

  const activeWeek = useMemo(() => {
    return weeks.find((w) => w.id === selectedWeekId) || weeks[0] || SAMPLE_WEEKS[0];
  }, [weeks, selectedWeekId]);

  const summary = useMemo(() => {
    if (!activeWeek || !activeWeek.days) return { counts:{high:0,okay:0,low:0}, dominantMood: "okay", avgScore: "–", total: 0 };
    const daysWithData = activeWeek.days.filter((d) => d.score > 0);
    if (!daysWithData.length) return { counts:{high:0,okay:0,low:0}, dominantMood: "okay", avgScore: "–", total: 0 };
    const counts = { high: 0, okay: 0, low: 0 };
    daysWithData.forEach((d) => { counts[d.mood] = (counts[d.mood]||0)+1; });
    let dominantMood = "okay";
    if (counts.high >= counts.okay && counts.high >= counts.low) dominantMood = "high";
    else if (counts.low >= counts.okay && counts.low >= counts.high) dominantMood = "low";
    const avgScore = daysWithData.reduce((acc,d)=>acc+(d.score||0),0)/daysWithData.length;
    return { counts, dominantMood, avgScore: avgScore.toFixed(1), total: daysWithData.length };
  }, [activeWeek]);

  const linePath = useMemo(()=> buildLinePath(activeWeek?.days||[]), [activeWeek]);

  // daily suggestion (keeps changing gently)
  useEffect(()=> {
    const suggestions = [
      "🧘 Take 2 slow breaths. You’re doing better than you think.",
      "💧 Drink a glass of water and notice one small win today.",
      "📔 Write 2 sentences about one thing you’re grateful for.",
      "🧍‍♂️ Stand up and stretch for 60 seconds—feel the shoulders drop.",
    ];
    // rotate by date so it feels fresh
    const idx = new Date().getDate() % suggestions.length;
    setDailySuggestion(suggestions[idx]);
  }, []);

  // Track micro-actions in localStorage per user
  useEffect(()=> {
    if (!user) return;
    try {
      const raw = window.localStorage.getItem(`emoti_micro_actions_${user.uid}`);
      setMicroActions(raw ? JSON.parse(raw) : {});
    } catch { setMicroActions({}); }
  }, [user]);

  function saveMicroActionsState(newState) {
    setMicroActions(newState);
    if (!user) return;
    try {
      window.localStorage.setItem(`emoti_micro_actions_${user.uid}`, JSON.stringify(newState));
    } catch (err) { console.error(err); }
  }

  // Quick logging: add a mood event for "today"
  const quickLogMood = async (moodKey, note = "") => {
    if (logging) return;
    setLogging(true);
    try {
      const now = Date.now();
      const entry = { ts: now, emotion: moodKey, note };
      // push to localStorage
      if (typeof window !== "undefined") {
        try {
          const key = getMoodKey(user?.uid || "anon");
          const raw = window.localStorage.getItem(key);
          const arr = raw ? JSON.parse(raw) : [];
          arr.push(entry);
          window.localStorage.setItem(key, JSON.stringify(arr));
        } catch (err) { console.error(err); }
      }
      // if user logged in, also try to sync to Firestore (non-blocking)
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          // fetch existing (best-effort read)
          const snap = await (async () => {
            try {
              const s = await userRef.get?.();
              return s;
            } catch { return null; }
          })();
          // fallback: setDoc merge append (since this project may not have server aggregation)
          await setDoc(userRef, { moodEvents: ( (await (async () => {
            try { const d = await (await fetch("/api/_get_user_mood_stub")).json(); return d; } catch { return []; }
          })()) || [] ).concat([entry])}, { merge: true });
        } catch (err) {
          // silent — server update optional
        }
      }
      // update local state so UI updates
      setMoodEvents((prev)=> [...prev, entry]);
    } finally {
      setLogging(false);
    }
  };

  // When user clicks a day, open detail panel
  const onClickDay = (day) => {
    setDetailDay(day);
  };

  // Mark a micro-action (toggles)
  const toggleAction = (dateKey, actionId) => {
    const current = microActions[dateKey] || {};
    const next = { ...microActions, [dateKey]: { ...(microActions[dateKey] || {}), [actionId]: !current[actionId] } };
    saveMicroActionsState(next);
  };

  // Small util to format date for a day in this week
  const dateForDayIndex = (index) => {
    const weekStart = getWeekStart(new Date(), 0);
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + index);
    return d.toISOString().slice(0,10);
  };

  const daysCount = activeWeek?.days?.length || 0;
  const maxIndex = Math.max(daysCount - 1, 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">EMOTI · Mood dashboard</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold">Weekly feelings overview</h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-xl">This page summarises how your week felt. Click a day to reflect, try a micro-action, or log a mood for today.</p>
          </div>

          {onBack && (
            <button onClick={onBack} className="px-3 py-2 rounded-full border border-slate-700 text-xs text-slate-200 hover:border-amber-300 hover:text-amber-200">← Back to dashboard</button>
          )}
        </div>

        {/* Top quick-log + daily suggestion */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] text-slate-400">Quick mood check</p>
              <div className="flex gap-2">
                <button onClick={() => quickLogMood("calm", "Quick log: calm")} disabled={logging} className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-slate-200 hover:bg-sky-500/10">
                  😌 Calm
                </button>
                <button onClick={() => quickLogMood("hopeful", "Quick log: hopeful")} disabled={logging} className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-slate-200 hover:bg-emerald-500/10">
                  🙂 Hopeful
                </button>
                <button onClick={() => quickLogMood("heavy", "Quick log: heavy")} disabled={logging} className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-slate-200 hover:bg-rose-500/10">
                  😢 Heavy
                </button>
                <button onClick={() => quickLogMood("mixed", "Quick log: mixed")} disabled={logging} className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-slate-200 hover:bg-amber-500/10">
                  😐 Mixed
                </button>
              </div>
            </div>

            <div className="ml-auto rounded-2xl bg-slate-950/80 border border-slate-800 p-3 text-sm">
              <div className="text-[11px] text-slate-400">Daily suggestion</div>
              <div className="mt-1 text-slate-200">{dailySuggestion}</div>
              <div className="mt-2 text-[11px] text-slate-400">Try a small action: <button onClick={()=>quickLogMood("calm", "Followed suggestion")} className="underline text-sky-300">Do it now</button></div>
            </div>
          </div>

          {/* small stats */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
            <p className="text-[11px] text-slate-400 mb-1">This week</p>
            <p className="text-lg font-semibold text-amber-300">{summary.avgScore} <span className="text-xs text-slate-500">/ 5</span></p>
            <p className="mt-2 text-[11px] text-slate-400">Dominant: <span className={`inline-block w-2.5 h-2.5 rounded-full ${moodColor(summary.dominantMood)} ml-2 mr-2`}></span>{moodLabel(summary.dominantMood)}</p>
            <div className="mt-3 text-[11px] text-slate-500">Quick actions</div>
            <div className="mt-2 flex gap-2">
              <button onClick={()=> alert("Try: 2-minute breathing")} className="px-2 py-1 rounded-full border border-slate-700 text-xs">2-min breath</button>
              <button onClick={()=> alert("Try: Write 1 line of gratitude")} className="px-2 py-1 rounded-full border border-slate-700 text-xs">Gratitude</button>
            </div>
          </div>
        </div>

        {/* Chart area */}
        <section className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="md:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">Weekly mood {viewMode === "line" ? "trend" : "intensity"}</h3>
                <span className="text-[11px] text-slate-500">{viewMode === "line" ? "Line shows average mood score (1–5) for each day." : "Bars show how heavy / light each day felt."}</span>
              </div>

              <div className="flex items-center rounded-full bg-slate-900/80 border border-slate-700 p-0.5 text-[11px]">
                <button type="button" onClick={()=>setViewMode("line")} className={`px-2.5 py-1 rounded-full transition ${viewMode==="line" ? "bg-amber-400 text-slate-950" : "text-slate-300 hover:text-amber-200"}`}>Line</button>
                <button type="button" onClick={()=>setViewMode("bar")} className={`px-2.5 py-1 rounded-full transition ${viewMode==="bar" ? "bg-amber-400 text-slate-950" : "text-slate-300 hover:text-amber-200"}`}>Bars</button>
              </div>
            </div>

            {viewMode === "line" ? (
              <div className="mt-4">
                <div className="relative h-40">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                    {[1,2,3,4,5].map(score => {
                      const y = 100 - ((score - 1) / 4) * 100;
                      return <g key={score}>
                        <line x1="0" x2="100" y1={y} y2={y} stroke="#1f2937" strokeWidth={0.3} strokeDasharray="1.5 1.5" />
                        <text x="1" y={y-1.5} fontSize="4" fill="#6b7280">{score}</text>
                      </g>;
                    })}
                    {linePath && <path d={linePath} fill="none" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
                    {activeWeek.days.map((day, index) => {
                      if (!day.score || day.score <= 0) return null;
                      const x = (index / maxIndex) * 100;
                      const y = 100 - ((day.score - 1) / 4) * 100;
                      return (<circle key={day.id} cx={x} cy={y} r="2" fill={moodHex(day.mood)} stroke="#020617" strokeWidth="0.6" className="cursor-pointer" onClick={() => onClickDay({ ...day, index })} />);
                    })}
                  </svg>
                </div>

                <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                  {activeWeek.days.map((day) => <span key={day.id} className="w-8 text-center">{day.label}</span>)}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-end gap-3 h-40">
                {activeWeek.days.map((day, index) => {
                  const height = day.score > 0 ? (day.score / 5) * 100 : 0;
                  return (
                    <div key={day.id} className="flex-1 flex flex-col items-center gap-2">
                      <div onClick={() => onClickDay({ ...day, index })} className={`w-full max-w-[20px] rounded-full ${day.score > 0 ? moodColor(day.mood) : "bg-slate-800/60 border border-slate-700"} transition transform hover:scale-105 cursor-pointer`} style={{ height: `${day.score > 0 ? Math.max(height, 10) : 4}%` }} />
                      <span className="text-[10px] text-slate-400">{day.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-slate-400">
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400" /> Positive days ({summary.counts.high})</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-sky-400" /> Neutral / mixed ({summary.counts.okay})</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-400" /> Heavy / low ({summary.counts.low})</div>
            </div>
          </div>

          {/* Reflection Box */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 text-xs">
            <h3 className="text-sm font-semibold mb-2">Reflection note</h3>
            <p className="text-slate-300 mb-3">This week felt mostly <span className="font-semibold text-amber-300">{moodLabel(summary.dominantMood).toLowerCase()}</span>. Notice what changed across the heaviest and lightest days.</p>

            <div className="text-[11px] text-slate-400 space-y-2">
              <div>Try these micro-actions for heavier days:</div>
              <ul className="list-disc list-inside">
                <li>Write one specific thing that felt hard (not "everything").</li>
                <li>Do a 60s grounding exercise (5 deep breaths + feet on the floor).</li>
              </ul>
              <div className="mt-2">
                <p className="text-[11px] text-slate-400 mb-1">Did you try a micro-action today?</p>
                <div className="flex gap-2">
                  <button onClick={()=> alert("Marked: did breathing")} className="px-3 py-1 rounded-full border border-slate-700 text-xs">I tried breathing</button>
                  <button onClick={()=> alert("Marked: gratitude")} className="px-3 py-1 rounded-full border border-slate-700 text-xs">Wrote gratitude</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Daily snapshots / clickable list */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <h3 className="text-sm font-semibold mb-3">Daily emotional snapshots</h3>
          <p className="text-[11px] text-slate-500 mb-3">Tap any day in the chart or the list to open a reflection panel with micro-actions and a quick log option.</p>

          <div className="divide-y divide-slate-800 text-xs">
            {activeWeek.days.map((day, idx) => {
              const dateKey = dateForDayIndex(idx);
              const stateForDate = microActions[dateKey] || {};
              return (
                <div key={day.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full mt-[2px] ${day.score > 0 ? moodColor(day.mood) : "bg-slate-700/80"}`} />
                    <div>
                      <p className="font-medium text-slate-100 cursor-pointer" onClick={() => onClickDay({ ...day, index: idx })}>{day.label}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">{day.note}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-[11px] text-slate-500 mr-4 whitespace-nowrap">{day.score > 0 ? `Score: ${day.score}/5` : "No data"}</div>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button onClick={() => quickLogMood(day.mood, `Quick follow-up for ${day.label}`)} className="px-2 py-0.5 rounded-full border border-slate-700 text-slate-300 hover:border-sky-400">Log similar</button>
                      <button onClick={() => {
                        // toggle micro-action sample
                        toggleAction(dateKey, "breathing");
                      }} className={`px-2 py-0.5 rounded-full border ${stateForDate?.breathing ? "border-emerald-400 bg-emerald-400/10 text-emerald-200" : "border-slate-700 text-slate-300"}`}>Breathing {stateForDate?.breathing ? "✓" : ""}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* DETAIL PANEL (simple absolute modal at bottom-right) */}
      {detailDay && (
        <div className="fixed right-6 bottom-6 z-40 w-96 rounded-2xl bg-slate-900/95 border border-slate-800 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">Reflection — {detailDay.label}</h4>
              <p className="text-[11px] text-slate-400 mt-1">{detailDay.note}</p>
            </div>
            <button onClick={()=> setDetailDay(null)} className="text-slate-400 px-2 py-1 rounded-full border border-slate-700">Close</button>
          </div>

          <div className="mt-3 text-[11px] text-slate-300">
            <p>Try one small step you can do now:</p>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <button onClick={()=> { toggleAction(new Date().toISOString().slice(0,10), "breathing"); alert("Breathe: 2 minutes"); }} className="px-3 py-2 rounded-full bg-sky-500/10 border border-sky-700 text-sky-200">2-minute breathing</button>
              <button onClick={()=> { navigator.clipboard?.writeText("One thing I'm grateful for today is..."); alert("Prompt copied. Paste into your journal."); }} className="px-3 py-2 rounded-full bg-emerald-400/10 border border-emerald-600 text-emerald-200">Gratitude prompt</button>
              <button onClick={()=> { quickLogMood(detailDay.mood, `Follow-up from ${detailDay.label}`); alert("Logged follow-up mood."); }} className="px-3 py-2 rounded-full bg-amber-400/10 border border-amber-500 text-amber-200">Log similar mood</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
