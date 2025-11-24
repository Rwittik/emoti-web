// src/components/MoodDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

/**
 * Fallback sample weekly mood data.
 * Used only when the user has no real mood events yet.
 */
const SAMPLE_WEEKS = [
  {
    id: "this-week",
    label: "This week",
    range: "Mon – Sun",
    days: [
      {
        id: "mon",
        label: "Mon",
        mood: "low",
        score: 2,
        note: "Felt heavy and tired after work.",
      },
      {
        id: "tue",
        label: "Tue",
        mood: "okay",
        score: 3,
        note: "Normal day, a bit stressed about tasks.",
      },
      {
        id: "wed",
        label: "Wed",
        mood: "high",
        score: 4,
        note: "Good conversation with a friend.",
      },
      {
        id: "thu",
        label: "Thu",
        mood: "low",
        score: 2,
        note: "Overthinking at night.",
      },
      {
        id: "fri",
        label: "Fri",
        mood: "okay",
        score: 3,
        note: "Finished some pending work.",
      },
      {
        id: "sat",
        label: "Sat",
        mood: "high",
        score: 5,
        note: "Felt relaxed, watched a movie.",
      },
      {
        id: "sun",
        label: "Sun",
        mood: "okay",
        score: 3,
        note: "Mixed – calm but a little lonely.",
      },
    ],
  },
  {
    id: "last-week",
    label: "Last week",
    range: "Mon – Sun",
    days: [
      {
        id: "mon",
        label: "Mon",
        mood: "low",
        score: 1,
        note: "Argument at home.",
      },
      {
        id: "tue",
        label: "Tue",
        mood: "low",
        score: 2,
        note: "Couldn’t focus on study/work.",
      },
      {
        id: "wed",
        label: "Wed",
        mood: "okay",
        score: 3,
        note: "Slowly felt a bit better.",
      },
      {
        id: "thu",
        label: "Thu",
        mood: "okay",
        score: 3,
        note: "Normal, nothing special.",
      },
      {
        id: "fri",
        label: "Fri",
        mood: "high",
        score: 4,
        note: "Fun evening outside.",
      },
      {
        id: "sat",
        label: "Sat",
        mood: "high",
        score: 4,
        note: "Productive and light mood.",
      },
      {
        id: "sun",
        label: "Sun",
        mood: "okay",
        score: 3,
        note: "Rest + planning for next week.",
      },
    ],
  },
];

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

// same but as hex colours for the SVG dots
function moodHex(mood) {
  switch (mood) {
    case "high":
      return "#34d399"; // emerald-400
    case "okay":
      return "#38bdf8"; // sky-400
    case "low":
    default:
      return "#fb7185"; // rose-400
  }
}

function moodLabel(mood) {
  if (mood === "high") return "Positive";
  if (mood === "okay") return "Neutral / Mixed";
  return "Heavy / Low";
}

// same key that PremiumChat uses (for local fallback)
function getMoodKey(uid) {
  return `emoti_mood_events_${uid}`;
}

// convert raw emotion strings into the 3 dashboard buckets
function normalizeMood(rawEmotion) {
  if (!rawEmotion) return "okay";
  const e = String(rawEmotion).toLowerCase();

  // clearly heavy/low emotions
  if (
    [
      "anxious",
      "anxiety",
      "stressed",
      "stress",
      "sad",
      "depressed",
      "low",
      "heavy",
      "angry",
      "lonely",
      "overwhelmed",
      "tired",
    ].some((k) => e.includes(k))
  ) {
    return "low";
  }

  // clearly positive
  if (
    [
      "high",
      "positive",
      "good",
      "better",
      "light",
      "relieved",
      "hopeful",
      "grateful",
      "calm",
      "happy",
      "peaceful",
    ].some((k) => e.includes(k))
  ) {
    return "high";
  }

  // everything else = neutral / mixed
  return "okay";
}

// numeric score for chart + averages
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

// get Monday of the week with an offset (0 = current, -1 = last week)
function getWeekStart(date, weekOffset = 0) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = (day + 6) % 7; // convert so Monday is 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday + weekOffset * 7);
  return d;
}

// build a Mon–Sun week view from mood events
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
      return {
        id,
        label: labels[index],
        mood: "okay",
        score: 0, // 0 = no data logged
        note: "No mood logged this day.",
      };
    }

    const moodCounts = { high: 0, okay: 0, low: 0 };
    let scoreSum = 0;

    dayEvents.forEach((ev) => {
      const mood = normalizeMood(ev.emotion);
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      scoreSum += moodScore(mood);
    });

    let mood = "okay";
    if (moodCounts.high >= moodCounts.okay && moodCounts.high >= moodCounts.low)
      mood = "high";
    else if (
      moodCounts.low >= moodCounts.okay &&
      moodCounts.low >= moodCounts.high
    )
      mood = "low";

    const avgScore = scoreSum / dayEvents.length;
    const roundedScore = Math.round(avgScore); // 1–5 for UI

    let note;
    if (mood === "high") {
      note = "Felt comparatively lighter today.";
    } else if (mood === "low") {
      note = "Felt heavier or more emotionally loaded today.";
    } else {
      note = "Mixed / neutral day overall.";
    }

    return {
      id,
      label: labels[index],
      mood,
      score: roundedScore,
      note,
    };
  });

  return {
    id: fallbackWeek.id,
    label: fallbackWeek.label,
    range: fallbackWeek.range,
    days,
  };
}

// build an SVG path string for the line chart
function buildLinePath(days) {
  if (!days || !days.length) return "";

  const points = days
    .map((day, index) => ({
      index,
      score: day.score && day.score > 0 ? day.score : null,
    }))
    .filter((p) => p.score !== null);

  if (!points.length) return "";

  const maxIndex = Math.max(days.length - 1, 1);

  return points
    .map((p, i) => {
      const x = (p.index / maxIndex) * 100;
      const y = 100 - ((p.score - 1) / 4) * 100; // score 1..5 -> 100..0
      const cmd = i === 0 ? "M" : "L";
      return `${cmd}${x},${y}`;
    })
    .join(" ");
}

export default function MoodDashboard({ onBack }) {
  const { user } = useAuth();
  const [selectedWeekId, setSelectedWeekId] = useState("this-week");

  // "line" | "bar"
  const [viewMode, setViewMode] = useState("line");

  // moodEvents now loaded from Firestore (with localStorage fallback)
  const [moodEvents, setMoodEvents] = useState([]);

  // 🔄 Real-time load / reload mood events whenever user changes
  useEffect(() => {
    if (!user) {
      setMoodEvents([]);
      return;
    }

    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        try {
          let events = [];
          if (snap.exists()) {
            const data = snap.data();
            if (Array.isArray(data.moodEvents)) {
              events = data.moodEvents;
            }
          }

          // Fallback to localStorage if Firestore has no moodEvents yet
          if (!events.length && typeof window !== "undefined") {
            try {
              const raw = window.localStorage.getItem(getMoodKey(user.uid));
              const parsed = raw ? JSON.parse(raw) : [];
              events = Array.isArray(parsed) ? parsed : [];
            } catch (err) {
              console.error(
                "Failed to read mood events from localStorage",
                err
              );
            }
          }

          setMoodEvents(events);
        } catch (err) {
          console.error("Error processing mood events snapshot", err);
        }
      },
      (error) => {
        console.error("Failed to subscribe to mood events:", error);

        // On error, still try localStorage once
        if (typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(getMoodKey(user.uid));
            const parsed = raw ? JSON.parse(raw) : [];
            setMoodEvents(Array.isArray(parsed) ? parsed : []);
          } catch (err2) {
            console.error("Failed to read mood events from localStorage", err2);
            setMoodEvents([]);
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // build "this week" + "last week" views, using real data if present
  const weeks = useMemo(() => {
    const [sampleThisWeek, sampleLastWeek] = SAMPLE_WEEKS;

    const realThisWeek = buildWeekFromEvents(moodEvents, 0, sampleThisWeek);
    const realLastWeek = buildWeekFromEvents(moodEvents, -1, sampleLastWeek);

    return [realThisWeek, realLastWeek];
  }, [moodEvents]);

  const activeWeek = useMemo(() => {
    return (
      weeks.find((w) => w.id === selectedWeekId) ||
      weeks[0] ||
      SAMPLE_WEEKS[0]
    );
  }, [weeks, selectedWeekId]);

  const summary = useMemo(() => {
    if (!activeWeek || !activeWeek.days) {
      return {
        counts: { high: 0, okay: 0, low: 0 },
        dominantMood: "okay",
        avgScore: "–",
        total: 0,
      };
    }

    const daysWithData = activeWeek.days.filter((d) => d.score > 0);
    if (daysWithData.length === 0) {
      return {
        counts: { high: 0, okay: 0, low: 0 },
        dominantMood: "okay",
        avgScore: "–",
        total: 0,
      };
    }

    const counts = { high: 0, okay: 0, low: 0 };
    daysWithData.forEach((d) => {
      counts[d.mood] = (counts[d.mood] || 0) + 1;
    });

    let dominantMood = "okay";
    if (counts.high >= counts.okay && counts.high >= counts.low)
      dominantMood = "high";
    else if (counts.low >= counts.okay && counts.low >= counts.high)
      dominantMood = "low";

    const avgScore =
      daysWithData.reduce((acc, d) => acc + (d.score || 0), 0) /
      daysWithData.length;

    return {
      counts,
      dominantMood,
      avgScore: avgScore.toFixed(1),
      total: daysWithData.length,
    };
  }, [activeWeek]);

  // line chart path
  const linePath = useMemo(
    () => buildLinePath(activeWeek?.days || []),
    [activeWeek]
  );

  const daysCount = activeWeek?.days?.length || 0;
  const maxIndex = Math.max(daysCount - 1, 1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">
              EMOTI · Mood dashboard
            </p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold">
              Weekly feelings overview
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-xl">
              This page summarises how your week emotionally felt, based on your
              EMOTI conversations. Use it as a gentle reflection, not a
              scorecard.
            </p>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-2 rounded-full border border-slate-700 text-xs text-slate-200 hover:border-amber-300 hover:text-amber-200"
            >
              ← Back to dashboard
            </button>
          )}
        </div>

        {/* Week selector + key stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {/* Week selector */}
          <div className="md:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Week selection</h2>
              <span className="text-[11px] text-slate-500">
                {activeWeek.range}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {weeks.map((week) => (
                <button
                  key={week.id}
                  onClick={() => setSelectedWeekId(week.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    week.id === activeWeek.id
                      ? "bg-amber-400/90 text-slate-950 border-amber-300"
                      : "bg-slate-950 text-slate-200 border-slate-700 hover:border-amber-300/60"
                  }`}
                >
                  {week.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary cards */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs">
            <p className="text-[11px] text-slate-400 mb-1">Average score</p>
            <p className="text-2xl font-semibold text-amber-300">
              {summary.avgScore}
              <span className="text-xs text-slate-500 ml-1">/ 5</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Higher = lighter / more positive days.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs">
            <p className="text-[11px] text-slate-400 mb-1">Dominant tone</p>
            <p className="text-lg font-semibold flex items-center gap-2">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${moodColor(
                  summary.dominantMood
                )}`}
              />
              {moodLabel(summary.dominantMood)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Based on {summary.total} logged days with EMOTI.
            </p>
          </div>
        </div>

        {/* Mood graph + legend */}
        <section className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="md:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold">
                  Weekly mood{" "}
                  {viewMode === "line" ? "trend (line)" : "intensity (bars)"}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {viewMode === "line"
                    ? "Line shows average mood score (1–5) for each day."
                    : "Bars show how heavy / light each day felt."}
                </span>
              </div>

              {/* tiny toggle */}
              <div className="flex items-center rounded-full bg-slate-900/80 border border-slate-700 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode("line")}
                  className={`px-2.5 py-1 rounded-full transition ${
                    viewMode === "line"
                      ? "bg-amber-400 text-slate-950"
                      : "text-slate-300 hover:text-amber-200"
                  }`}
                >
                  Line
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("bar")}
                  className={`px-2.5 py-1 rounded-full transition ${
                    viewMode === "bar"
                      ? "bg-amber-400 text-slate-950"
                      : "text-slate-300 hover:text-amber-200"
                  }`}
                >
                  Bars
                </button>
              </div>
            </div>

            {/* Chart body */}
            {viewMode === "line" ? (
              // LINE CHART
              <div className="mt-4">
                <div className="relative h-40">
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full"
                  >
                    {/* horizontal grid lines for scores 1–5 */}
                    {[1, 2, 3, 4, 5].map((score) => {
                      const y = 100 - ((score - 1) / 4) * 100;
                      return (
                        <g key={score}>
                          <line
                            x1="0"
                            x2="100"
                            y1={y}
                            y2={y}
                            stroke="#1f2937"
                            strokeWidth={0.3}
                            strokeDasharray="1.5 1.5"
                          />
                          <text
                            x="1"
                            y={y - 1.5}
                            fontSize="4"
                            fill="#6b7280"
                          >
                            {score}
                          </text>
                        </g>
                      );
                    })}

                    {/* mood line */}
                    {linePath && (
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#facc15"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* dots */}
                    {activeWeek.days.map((day, index) => {
                      if (!day.score || day.score <= 0) return null;
                      const x = (index / maxIndex) * 100;
                      const y = 100 - ((day.score - 1) / 4) * 100;
                      return (
                        <circle
                          key={day.id}
                          cx={x}
                          cy={y}
                          r="2"
                          fill={moodHex(day.mood)}
                          stroke="#020617"
                          strokeWidth="0.6"
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* X-axis labels */}
                <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                  {activeWeek.days.map((day) => (
                    <span key={day.id} className="w-8 text-center">
                      {day.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              // BAR CHART (old style, but inside same card)
              <div className="mt-4 flex items-end gap-3 h-40">
                {activeWeek.days.map((day) => {
                  const height = day.score > 0 ? (day.score / 5) * 100 : 0;
                  return (
                    <div
                      key={day.id}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div
                        className={`w-full max-w-[20px] rounded-full ${
                          day.score > 0
                            ? moodColor(day.mood)
                            : "bg-slate-800/60 border border-slate-700"
                        } transition`}
                        style={{
                          height: `${
                            day.score > 0 ? Math.max(height, 10) : 4
                          }%`,
                        }}
                      />
                      <span className="text-[10px] text-slate-400">
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-slate-400">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                Positive days ({summary.counts.high})
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-sky-400" />
                Neutral / mixed ({summary.counts.okay})
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                Heavy / low ({summary.counts.low})
              </div>
            </div>
          </div>

          {/* Reflection box */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 text-xs">
            <h3 className="text-sm font-semibold mb-2">Reflection note</h3>
            <p className="text-slate-300 mb-3">
              This week felt mostly{" "}
              <span className="font-semibold text-amber-300">
                {moodLabel(summary.dominantMood).toLowerCase()}
              </span>
              . Notice what was happening on the
              <span className="font-semibold"> toughest</span> days and the
              <span className="font-semibold"> lighter</span> days.
            </p>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              <li>
                Keep a small win or comforting moment from each lighter day.
              </li>
              <li>
                On heavier days, ask: &quot;What exactly was hard?&quot; instead
                of blaming yourself.
              </li>
              <li>Use this as information, not judgment.</li>
            </ul>
          </div>
        </section>

        {/* Daily notes list */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
          <h3 className="text-sm font-semibold mb-3">
            Daily emotional snapshots
          </h3>
          <p className="text-[11px] text-slate-500 mb-3">
            These come from how EMOTI tagged your premium chats for each day.
          </p>

          <div className="divide-y divide-slate-800 text-xs">
            {activeWeek.days.map((day) => (
              <div
                key={day.id}
                className="py-3 flex items-start justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full mt-[2px] ${
                      day.score > 0 ? moodColor(day.mood) : "bg-slate-700/80"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-slate-100">{day.label}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {day.note}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                  {day.score > 0 ? `Score: ${day.score}/5` : "No data"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
