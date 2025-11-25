// src/components/MoodDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

/**
 * Fallback sample weekly mood data (unchanged from your original).
 * Used only when the user has no real mood events yet.
 */
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
      { id: "sat", label: "Sat", mood: "high", score: 4, note: "Productive and light mood." },
      { id: "sun", label: "Sun", mood: "Sun", score: 3, note: "Rest + planning for next week." },
    ],
  },
];

// helpers
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
  if (["anxious", "anxiety", "stressed", "stress", "sad", "depressed", "low", "heavy", "angry", "lonely", "overwhelmed", "tired"].some((k) => e.includes(k))) {
    return "low";
  }
  if (["high", "positive", "good", "better", "light", "relieved", "hopeful", "grateful", "calm", "happy", "peaceful"].some((k) => e.includes(k))) {
    return "high";
  }
  return "okay";
}
function moodScore(mood) {
  switch (mood) {
    case "high":
      return 4.5;
    case "low":
      return 2;
    case "okay":
    default:
      return 3;
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
  const ids = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const points = days.map((day, index) => ({ index, score: day.score && day.score > 0 ? day.score : null })).filter((p) => p.score !== null);
  if (!points.length) return "";
  const maxIndex = Math.max(days.length - 1, 1);
  return points.map((p, i) => {
    const x = (p.index / maxIndex) * 100;
    const y = 100 - ((p.score - 1) / 4) * 100;
    const cmd = i === 0 ? "M" : "L";
    return `${cmd}${x},${y}`;
  }).join(" ");
}

/**
 * NEW: interactive MoodDashboard
 */
export default function MoodDashboard({ onBack }) {
  const { user } = useAuth();
  const [selectedWeekId, setSelectedWeekId] = useState("this-week");
  const [viewMode, setViewMode] = useState("line"); // "line" | "bar"
  const [moodEvents, setMoodEvents] = useState([]);
  const [expandedDay, setExpandedDay] = useState(null); // e.g. "mon"
  const [dayNoteDraft, setDayNoteDraft] = useState("");
  const [breathing, setBreathing] = useState(false); // breathing animation state
  const [loadingSync, setLoadingSync] = useState(false);

  // subscribe to Firestore mood events (with local fallback)
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
            console.error("Failed read local moodEvents", err);
          }
        }
        setMoodEvents(events);
      } catch (err) {
        console.error("Error in mood events snapshot", err);
      }
    }, (err) => {
      console.error("Failed to subscribe to mood events:", err);
      // fallback to localStorage one-time
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem(getMoodKey(user.uid));
          const parsed = raw ? JSON.parse(raw) : [];
          setMoodEvents(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          console.error(e);
          setMoodEvents([]);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // build weeks
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
    if (!activeWeek || !activeWeek.days) return { counts: { high: 0, okay: 0, low: 0 }, dominantMood: "okay", avgScore: "–", total: 0 };
    const daysWithData = activeWeek.days.filter((d) => d.score > 0);
    if (!daysWithData.length) return { counts: { high: 0, okay: 0, low: 0 }, dominantMood: "okay", avgScore: "–", total: 0 };
    const counts = { high: 0, okay: 0, low: 0 };
    daysWithData.forEach((d) => { counts[d.mood] = (counts[d.mood] || 0) + 1; });
    let dominantMood = "okay";
    if (counts.high >= counts.okay && counts.high >= counts.low) dominantMood = "high";
    else if (counts.low >= counts.okay && counts.low >= counts.high) dominantMood = "low";
    const avgScore = daysWithData.reduce((acc, d) => acc + (d.score || 0), 0) / daysWithData.length;
    return { counts, dominantMood, avgScore: avgScore.toFixed(1), total: daysWithData.length };
  }, [activeWeek]);

  const linePath = useMemo(() => buildLinePath(activeWeek?.days || []), [activeWeek]);

  const daysCount = activeWeek?.days?.length || 0;
  const maxIndex = Math.max(daysCount - 1, 1);

  // ---------------------------
  // Persistence helpers
  // ---------------------------
  async function persistMoodEvents(newEvents) {
    if (!user) {
      // store locally only
      try {
        window.localStorage.setItem(getMoodKey("public"), JSON.stringify(newEvents));
      } catch (e) {}
      setMoodEvents(newEvents);
      return;
    }
    setLoadingSync(true);
    try {
      // localStorage mirror
      try {
        window.localStorage.setItem(getMoodKey(user.uid), JSON.stringify(newEvents));
      } catch (e) {}
      // Firestore update (merge)
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { moodEvents: newEvents }, { merge: true });
      setMoodEvents(newEvents);
    } catch (err) {
      console.error("Failed to persist mood events:", err);
      // still update state locally so user sees immediate feedback
      setMoodEvents(newEvents);
    } finally {
      setLoadingSync(false);
    }
  }

  // create a simple mood event and append
  async function addMoodEvent({ emotion, note = "", ts = Date.now() }) {
    if (!user && typeof window === "undefined") return;
    const event = { ts, emotion, note };
    const updated = [...(moodEvents || []), event].slice(-500);
    await persistMoodEvents(updated);
  }

  // Quick mood buttons (emojis)
  const quickMoods = [
    { id: "happy", emoji: "😄", emotion: "happy", label: "Happy", mood: "high" },
    { id: "sad", emoji: "😔", emotion: "sad", label: "Sad", mood: "low" },
    { id: "angry", emoji: "😡", emotion: "angry", label: "Angry", mood: "low" },
    { id: "tired", emoji: "😵", emotion: "tired", label: "Tired", mood: "low" },
    { id: "anxious", emoji: "😰", emotion: "anxious", label: "Anxious", mood: "low" },
  ];

  async function handleQuickMood(q) {
    // create friendly message and small note automatically
    const note = q.label === "Happy" ? "Small win / brighter moment" : `Quick check-in: ${q.label.toLowerCase()}`;
    await addMoodEvent({ emotion: q.emotion, note, ts: Date.now() });
    // micro animation: flash then show breathing suggestion for low moods
    if (q.mood === "low") {
      setBreathing(true);
      setTimeout(() => setBreathing(false), 4200); // run breathing for ~4s
    }
  }

  // Expand a day card for editing/notes/actions
  function openDayCard(dayId) {
    setExpandedDay(dayId === expandedDay ? null : dayId);
    setDayNoteDraft("");
  }

  // Save the note for the selected day: this adds a moodEvent with the chosen note and preserves date
  async function saveDayNote(dayId, moodChoice = null) {
    // find the day date in current weekStart (we'll place ts at midday of that day)
    const dayIdx = activeWeek.days.findIndex((d) => d.id === dayId);
    const weekStart = getWeekStart(new Date(), activeWeek.id === "last-week" ? -1 : 0);
    const target = new Date(weekStart);
    target.setDate(weekStart.getDate() + dayIdx);
    target.setHours(14, 0, 0, 0);
    const emotion = moodChoice ? moodChoice : (dayNoteDraft || activeWeek.days[dayIdx]?.note || "checked in");
    await addMoodEvent({ emotion, note: dayNoteDraft || activeWeek.days[dayIdx]?.note || "", ts: target.getTime() });
    setExpandedDay(null);
    setDayNoteDraft("");
  }

  // Export the active week as JSON for the user to download
  function exportWeek() {
    const out = { week: activeWeek, moodEvents: moodEvents.filter((ev) => {
      // include events in the week range
      const wkStart = getWeekStart(new Date(), activeWeek.id === "last-week" ? -1 : 0);
      const wkEnd = new Date(wkStart);
      wkEnd.setDate(wkStart.getDate() + 7);
      const t = new Date(ev.ts);
      return t >= wkStart && t < wkEnd;
    })};
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeWeek.id || "week"}-mood-export.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Small helper to compute a day's dominant mood from events (used when expanding)
  function computeDayEvents(dayId) {
    const dayIdx = activeWeek.days.findIndex((d) => d.id === dayId);
    const wkStart = getWeekStart(new Date(), activeWeek.id === "last-week" ? -1 : 0);
    const dayStart = new Date(wkStart);
    dayStart.setDate(wkStart.getDate() + dayIdx);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    const events = (moodEvents || []).filter((ev) => {
      const t = new Date(ev.ts);
      return t >= dayStart && t < dayEnd;
    });
    return events;
  }

  // --- Small helpers for Emoti Insight card
  function insightAffirmation(mood) {
    switch (mood) {
      case "high":
        return "You’ve had lighter moments this week — notice them and hold on to one small win.";
      case "low":
        return "It’s okay to feel heavy — small acts of care matter more than big fixes.";
      case "okay":
      default:
        return "A mixed week — you showed up. Gentle consistency is how change happens.";
    }
  }
  function insightMicroStep(mood) {
    switch (mood) {
      case "high":
        return "Micro-step: Share one small win with someone or note it in your journal (30s).";
      case "low":
        return "Micro-step: Try 60s of deep breathing (inhale 4 → hold 2 → exhale 6).";
      case "okay":
      default:
        return "Micro-step: Write one sentence about one thing that felt slightly better today (30s).";
    }
  }

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Top */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">EMOTI · Mood dashboard</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold">Interactive mood dashboard</h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-xl">
              Explore your emotional week — tap days, add quick notes, or log a mood. Try the breathing exercise when nights get heavy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={exportWeek} className="px-3 py-2 rounded-full border border-slate-700 text-xs text-slate-200 hover:border-amber-300 hover:text-amber-200">
              Export week
            </button>
            {onBack && (
              <button onClick={onBack} className="px-3 py-2 rounded-full border border-slate-700 text-xs text-slate-200 hover:border-amber-300 hover:text-amber-200">
                ← Back
              </button>
            )}
          </div>
        </div>

        {/* Quick mood + week selector + key stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {/* Quick mood */}
          <div className="md:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Quick check-in</h2>
              <span className="text-[11px] text-slate-500">{loadingSync ? "Syncing…" : "Instant & private"}</span>
            </div>

            <p className="text-[13px] text-slate-300 mb-3">Tap an emoji to log how you feel right now. EMOTI will gently reflect back in chat.</p>

            <div className="flex gap-2 items-center flex-wrap">
              {quickMoods.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleQuickMood(q)}
                  className="px-3 py-2 rounded-full bg-slate-950/80 border border-slate-700 hover:scale-105 transform transition inline-flex items-center gap-2"
                >
                  <span className="text-lg">{q.emoji}</span>
                  <span className="text-xs text-slate-200 hidden sm:inline">{q.label}</span>
                </button>
              ))}

              {/* breathing micro button */}
              <button
                onClick={() => { setBreathing(true); setTimeout(() => setBreathing(false), 4200); }}
                className="px-3 py-2 rounded-full bg-slate-950/80 border border-slate-700 inline-flex items-center gap-2 hover:scale-105 transform transition"
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${breathing ? "animate-pulse" : ""}`} style={{ background: "linear-gradient(90deg,#0ea5e9,#6366f1)" }}>
                  🌬
                </span>
                <span className="text-xs text-slate-200">Try breathing</span>
              </button>
            </div>

            {/* micro breathing visual */}
            {breathing && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full bg-sky-400/20 animate-pulse-slow" />
                    <div className="relative text-slate-900 font-medium">Breathe</div>
                  </div>
                  <div className="text-sm text-slate-300">Slow inhale → hold → slow exhale. Repeat 3 times.</div>
                </div>
              </div>
            )}
          </div>

          {/* Week selector */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Week</h2>
              <span className="text-[11px] text-slate-500">{activeWeek.range}</span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {weeks.map((week) => (
                <button
                  key={week.id}
                  onClick={() => setSelectedWeekId(week.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${week.id === activeWeek.id ? "bg-amber-400/90 text-slate-950 border-amber-300" : "bg-slate-950 text-slate-200 border-slate-700 hover:border-amber-300/60"}`}
                >
                  {week.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary cards */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs">
            <p className="text-[11px] text-slate-400 mb-1">Average score</p>
            <p className="text-2xl font-semibold text-amber-300">{summary.avgScore}<span className="text-xs text-slate-500 ml-1">/ 5</span></p>
            <p className="mt-1 text-[11px] text-slate-400">Higher = lighter / more positive days.</p>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs">
            <p className="text-[11px] text-slate-400 mb-1">Dominant tone</p>
            <p className="text-lg font-semibold flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${moodColor(summary.dominantMood)}`} />
              {moodLabel(summary.dominantMood)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Based on {summary.total} logged days with EMOTI.</p>
          </div>
        </div>

        {/* Chart + side Emoti Insight */}
        <section className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="md:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold">Weekly mood {viewMode === "line" ? "trend" : "intensity"}</h3>
                <span className="text-[11px] text-slate-500">{viewMode === "line" ? "Line shows average mood score (1–5)." : "Bars show how heavy / light each day felt."}</span>
              </div>

              <div className="flex items-center rounded-full bg-slate-900/80 border border-slate-700 p-0.5 text-[11px]">
                <button type="button" onClick={() => setViewMode("line")} className={`px-2.5 py-1 rounded-full transition ${viewMode === "line" ? "bg-amber-400 text-slate-950" : "text-slate-300 hover:text-amber-200"}`}>Line</button>
                <button type="button" onClick={() => setViewMode("bar")} className={`px-2.5 py-1 rounded-full transition ${viewMode === "bar" ? "bg-amber-400 text-slate-950" : "text-slate-300 hover:text-amber-200"}`}>Bars</button>
              </div>
            </div>

            {/* Chart */}
            {viewMode === "line" ? (
              <div className="mt-4">
                <div className="relative h-40">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                    {[1, 2, 3, 4, 5].map((score) => {
                      const y = 100 - ((score - 1) / 4) * 100;
                      return (
                        <g key={score}>
                          <line x1="0" x2="100" y1={y} y2={y} stroke="#1f2937" strokeWidth={0.3} strokeDasharray="1.5 1.5" />
                          <text x="1" y={y - 1.5} fontSize="4" fill="#6b7280">{score}</text>
                        </g>
                      );
                    })}

                    {linePath && <path d={linePath} fill="none" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}

                    {activeWeek.days.map((day, index) => {
                      if (!day.score || day.score <= 0) return null;
                      const x = (index / maxIndex) * 100;
                      const y = 100 - ((day.score - 1) / 4) * 100;
                      return (
                        <circle key={day.id} cx={x} cy={y} r="2" fill={moodHex(day.mood)} stroke="#020617" strokeWidth="0.6" />
                      );
                    })}
                  </svg>
                </div>

                <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                  {activeWeek.days.map((day) => <span key={day.id} className="w-8 text-center">{day.label}</span>)}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-end gap-3 h-40">
                {activeWeek.days.map((day) => {
                  const height = day.score > 0 ? (day.score / 5) * 100 : 0;
                  return (
                    <div key={day.id} className="flex-1 flex flex-col items-center gap-2">
                      <div className={`w-full max-w-[20px] rounded-full ${day.score > 0 ? moodColor(day.mood) : "bg-slate-800/60 border border-slate-700"} transition`} style={{ height: `${day.score > 0 ? Math.max(height, 10) : 4}%` }} />
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

          {/* --- REPLACEMENT: Emoti Insight (Textual Premium Card) --- */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900/70 via-violet-800/30 to-sky-800/20 border border-amber-400/10 p-5 text-xs shadow-xl shadow-[0_10px_30px_rgba(99,102,241,0.06)]">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-emerald-300 flex items-center justify-center shadow-md">
                  <span className="text-slate-950 font-semibold">✨</span>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-semibold">Emoti Insight</h3>
                <p className="mt-1 text-[12px] text-slate-300">
                  This week felt mostly <span className="font-semibold text-amber-300">{moodLabel(summary.dominantMood).toLowerCase()}</span>.
                </p>

                <blockquote className="mt-3 text-sm italic text-slate-100 leading-snug">
                  {insightAffirmation(summary.dominantMood)}
                </blockquote>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-[13px] text-slate-200">{insightMicroStep(summary.dominantMood)}</div>
                </div>

                <div className="mt-3 text-[11px] text-slate-400">
                  <span className="text-slate-500">Tiny tip:</span> Consistency grater than intensity — repeat the micro-step whenever you notice the feeling.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Daily notes list with interactive cards */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <h3 className="text-sm font-semibold mb-3">Daily emotional snapshots</h3>
          <p className="text-[11px] text-slate-500 mb-3">Tap a day to expand, save a note, or change its mood.</p>

          <div className="divide-y divide-slate-800 text-xs">
            {activeWeek.days.map((day) => {
              const expanded = expandedDay === day.id;
              const dayEvents = computeDayEvents(day.id);
              const dayMood = day.score > 0 ? day.mood : "none";
              return (
                <div key={day.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-3.5 h-3.5 rounded-full mt-[4px] ${day.score > 0 ? moodColor(day.mood) : "bg-slate-700/80"}`} />
                      <div>
                        <p className="font-medium text-slate-100">{day.label}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{day.note}</p>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => openDayCard(day.id)} className="text-[11px] px-2 py-1 rounded-full bg-slate-950/80 border border-slate-700 hover:bg-slate-900/70">View & edit</button>
                          <button onClick={() => saveDayNote(day.id)} className="text-[11px] px-2 py-1 rounded-full bg-emerald-400 text-slate-900 hover:scale-105 transform">Log note</button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">{day.score > 0 ? `Score: ${day.score}/5` : "No data"}</span>
                      <div className="text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-slate-300">{dayMood === "none" ? "—" : moodLabel(day.mood)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded area */}
                  {expanded && (
                    <div className="mt-3 bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                      <div className="mb-2 text-[12px] text-slate-300">Past events for {day.label} (latest first):</div>
                      <div className="space-y-2 mb-3">
                        {dayEvents.length ? dayEvents.slice().sort((a,b)=>b.ts-a.ts).map((ev, i) => (
                          <div key={i} className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-[11px] text-slate-200">{ev.emotion}</div>
                              <div className="text-[11px] text-slate-400">{ev.note}</div>
                            </div>
                            <div className="text-[10px] text-slate-500">{new Date(ev.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                          </div>
                        )) : <div className="text-[11px] text-slate-400">No events recorded for this day.</div>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input value={dayNoteDraft} onChange={(e)=>setDayNoteDraft(e.target.value)} placeholder="Write a small note (private)" className="bg-slate-900/70 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
                        <div className="flex gap-2">
                          <select onChange={(e)=>setDayNoteDraft(prev => prev)} className="hidden" />
                          <button onClick={()=>saveDayNote(day.id)} className="px-3 py-2 rounded bg-amber-400 text-slate-900 font-medium">Save note</button>
                          <div className="ml-auto flex gap-1">
                            {/* quick mood set */}
                            <button onClick={()=>saveDayNote(day.id, "happy")} className="px-2 py-1 rounded-full bg-emerald-400 text-slate-900">😄</button>
                            <button onClick={()=>saveDayNote(day.id, "sad")} className="px-2 py-1 rounded-full bg-rose-400 text-white">😔</button>
                            <button onClick={()=>saveDayNote(day.id, "anxious")} className="px-2 py-1 rounded-full bg-rose-400 text-white">😰</button>
                          </div>
                        </div>

                        {/* suggestions */}
                        <div className="col-span-1 md:col-span-2 mt-2 text-[11px] text-slate-400">
                          <div className="mb-1 font-semibold text-slate-200">Try this</div>
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={()=>{ alert("Start 2-min breathing"); setBreathing(true); setTimeout(()=>setBreathing(false),4200); }} className="px-2 py-1 rounded bg-slate-950/80 border border-slate-700">2-min breathing</button>
                            <button onClick={()=>alert("Open playlist")} className="px-2 py-1 rounded bg-slate-950/80 border border-slate-700">Comforting music</button>
                            <button onClick={()=>alert("Journal prompt: What helped today?")} className="px-2 py-1 rounded bg-slate-950/80 border border-slate-700">Journal prompt</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
