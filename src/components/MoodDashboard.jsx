// src/components/MoodDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

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

export default function MoodDashboard({ onBack }) {
  const { user } = useAuth();
  const [selectedWeekId, setSelectedWeekId] = useState("this-week");

  // moodEvents now loaded from Firestore (with localStorage fallback)
  const [moodEvents, setMoodEvents] = useState([]);

  // load / reload mood events whenever the dashboard mounts (and when user changes)
  useEffect(() => {
    if (!user) {
      setMoodEvents([]);
      return;
    }

    let cancelled = false;

    async function loadMoodEvents() {
      try {
        let events = [];

        // 1) Try Firestore
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.moodEvents)) {
            events = data.moodEvents;
          }
        }

        // 2) Fallback to localStorage if Firestore empty
        if (!events.length) {
          try {
            const raw = window.localStorage.getItem(getMoodKey(user.uid));
            const parsed = raw ? JSON.parse(raw) : [];
            events = Array.isArray(parsed) ? parsed : [];
          } catch (err) {
            console.error("Failed to read mood events from localStorage", err);
          }
        }

        if (!cancelled) {
          setMoodEvents(events);
        }
      } catch (err) {
        console.error("Failed to load mood events from Firestore", err);

        // On error, still try localStorage
        try {
          const raw = window.localStorage.getItem(getMoodKey(user.uid));
          const parsed = raw ? JSON.parse(raw) : [];
          if (!cancelled) {
            setMoodEvents(Array.isArray(parsed) ? parsed : []);
          }
        } catch (err2) {
          console.error("Failed to read mood events from localStorage", err2);
          if (!cancelled) {
            setMoodEvents([]);
          }
        }
      }
    }

    loadMoodEvents();

    return () => {
      cancelled = true;
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
              <h3 className="text-sm font-semibold">Weekly mood line</h3>
              <span className="text-[11px] text-slate-500">
                Each bar shows how heavy/light the day felt based on EMOTI’s
                responses.
              </span>
            </div>

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
                        height: `${day.score > 0 ? Math.max(height, 10) : 4}%`,
                      }}
                    />
                    <span className="text-[10px] text-slate-400">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>

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
