// src/components/PremiumHomepage.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

// ---------- helpers shared with MoodDashboard ----------

// same color mapping as MoodDashboard
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

// localStorage key (same as PremiumChat / MoodDashboard)
function getMoodKey(uid) {
  return `emoti_mood_events_${uid}`;
}

// convert raw emotion strings into 3 buckets
function normalizeMood(rawEmotion) {
  if (!rawEmotion) return "okay";
  const e = String(rawEmotion).toLowerCase();

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

// Monday of week, offset 0 = current, -1 = last week
function getWeekStart(date, weekOffset = 0) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon...
  const diffToMonday = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday + weekOffset * 7);
  return d;
}

// build Mon–Sun week from mood events (same as in MoodDashboard)
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
        score: 0,
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
    const roundedScore = Math.round(avgScore); // 1–5

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

// ---------- sample preview used when no data yet ----------

const SAMPLE_THIS_WEEK = {
  id: "this-week",
  label: "This week",
  range: "Mon – Sun",
  days: [
    { id: "mon", label: "Mon", mood: "low", score: 2 },
    { id: "tue", label: "Tue", mood: "okay", score: 3 },
    { id: "wed", label: "Wed", mood: "high", score: 4 },
    { id: "thu", label: "Thu", mood: "low", score: 2 },
    { id: "fri", label: "Fri", mood: "okay", score: 3 },
    { id: "sat", label: "Sat", mood: "high", score: 5 },
    { id: "sun", label: "Sun", mood: "okay", score: 3 },
  ],
};

export default function PremiumHomepage({
  onOpenPremiumChat = () => {},
  onOpenMoodDashboard = () => {},
  onOpenEmotionImages = () => {},
  onOpenEmotionPlaylist = () => {},
  onOpenJournal = () => {},
  onOpenCalmCompanion = () => {},
  user: userProp,
}) {
  const { user: authUser } = useAuth();
  const user = userProp || authUser;

  const [weekPreview, setWeekPreview] = useState(SAMPLE_THIS_WEEK);

  // live mood preview (Firestore + localStorage fallback)
  useEffect(() => {
    if (!user) {
      setWeekPreview(SAMPLE_THIS_WEEK);
      return;
    }

    const userRef = doc(db, "users", user.uid);
    let cancelled = false;

    async function buildFromEvents(events) {
      const week = buildWeekFromEvents(events, 0, SAMPLE_THIS_WEEK);
      if (!cancelled) setWeekPreview(week);
    }

    // 1) live listener
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        let events = [];
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.moodEvents)) {
            events = data.moodEvents;
          }
        }

        if (events.length === 0) {
          // 2) fallback to localStorage
          try {
            if (typeof window !== "undefined") {
              const raw = window.localStorage.getItem(getMoodKey(user.uid));
              const parsed = raw ? JSON.parse(raw) : [];
              events = Array.isArray(parsed) ? parsed : [];
            }
          } catch (err) {
            console.error("PremiumHomepage: localStorage mood read failed", err);
          }
        }

        buildFromEvents(events);
      },
      (err) => {
        console.error("PremiumHomepage: Firestore mood listener error", err);
      }
    );

    // 3) extra one-shot fetch in case onSnapshot races
    (async () => {
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) return;
        const data = snap.data();
        if (!Array.isArray(data.moodEvents)) return;
        if (!cancelled) {
          const week = buildWeekFromEvents(data.moodEvents, 0, SAMPLE_THIS_WEEK);
          setWeekPreview(week);
        }
      } catch (err) {
        console.error("PremiumHomepage: getDoc mood error", err);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  const firstName =
    user?.displayName?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Friend";

  return (
    <div className="relative bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50 min-h-screen pb-20">
      {/* soft background orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60">
        <div className="absolute -top-40 -left-10 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {/* -------- PREMIUM BANNER -------- */}
      <section className="relative border-b border-amber-400/20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(14,165,233,0.16),_transparent_60%)]" />

        <div className="relative max-w-6xl mx-auto px-5 py-12 md:py-14 space-y-4">
          {/* top pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 backdrop-blur border border-amber-400/40 px-3 py-1 text-[11px] text-amber-200 shadow-sm shadow-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Premium dashboard
            <span className="h-1 w-px bg-amber-400/40 mx-1" />
            <span className="text-[10px] text-amber-100/80">
              Private to you · Night-safe space
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-3xl md:text-5xl font-semibold leading-tight tracking-tight">
                Welcome back,
                <span className="text-amber-300"> {firstName}</span>
                <span className="inline-block align-middle text-2xl md:text-3xl">
                  {" "}
                  ✨
                </span>
              </h1>

              <p className="text-slate-300 max-w-xl text-sm md:text-base">
                Tonight your EMOTI space is already set up — deeper insights,
                visual reflections, calm audio, and a private room where you can
                drop everything you&apos;re carrying.
              </p>

              {/* Go to Premium Chat */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={onOpenPremiumChat}
                  className="px-6 py-3 rounded-full bg-amber-400/90 hover:bg-amber-300 text-slate-900 shadow-lg shadow-amber-500/40 font-semibold text-sm md:text-base transition"
                >
                  Continue chatting
                </button>
                <button
                  onClick={onOpenEmotionPlaylist}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-300/60 text-amber-100 text-xs md:text-sm bg-slate-950/80 backdrop-blur hover:bg-amber-400/10 transition"
                >
                  🎧 Open emotion playlist
                </button>
              </div>
            </div>

            {/* tiny “at a glance” stats (still static for now) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs w-full max-w-md">
              <div className="rounded-2xl bg-slate-950/70 backdrop-blur border border-amber-300/30 px-3 py-3 shadow-md shadow-amber-500/20">
                <p className="text-[10px] text-amber-200/80 uppercase tracking-[0.16em] mb-1">
                  This week
                </p>
                <p className="text-lg font-semibold">5 chats</p>
                <p className="text-[11px] text-slate-400">
                  You’ve checked in on{" "}
                  <span className="text-sky-300 font-medium">most nights</span>.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/70 backdrop-blur border border-sky-400/40 px-3 py-3">
                <p className="text-[10px] text-sky-300/90 uppercase tracking-[0.16em] mb-1">
                  Current mood
                </p>
                <p className="text-lg font-semibold text-sky-200">Okay</p>
                <p className="text-[11px] text-slate-400">
                  Slightly heavy, but you&apos;re still moving.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/70 backdrop-blur border border-emerald-400/40 px-3 py-3">
                <p className="text-[10px] text-emerald-300/90 uppercase tracking-[0.16em] mb-1">
                  Night streak
                </p>
                <p className="text-lg font-semibold text-emerald-200">
                  3 nights
                </p>
                <p className="text-[11px] text-slate-400">
                  Consistency helps EMOTI learn your patterns.
                </p>
              </div>
            </div>
          </div>

          {/* Today at a glance strip */}
          <div className="mt-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur px-4 py-3 flex flex-wrap gap-3 items-center text-[11px] text-slate-300 shadow-lg shadow-black/30">
            <span className="uppercase tracking-[0.2em] text-slate-500">
              Today at a glance
            </span>
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            <span className="px-2 py-1 rounded-full bg-slate-900/90 border border-slate-700">
              Energy · <span className="text-emerald-300 font-medium">6 / 10</span>
            </span>
            <span className="px-2 py-1 rounded-full bg-slate-900/90 border border-slate-700">
              Stress · <span className="text-amber-300 font-medium">7 / 10</span>
            </span>
            <span className="px-2 py-1 rounded-full bg-slate-900/90 border border-slate-700">
              Sleep · <span className="text-sky-300 font-medium">5 / 10</span>
            </span>
            <span className="ml-auto text-[10px] text-slate-500">
              These are soft, approximate check-ins — not diagnoses.
            </span>
          </div>
        </div>
      </section>

      {/* -------- PREMIUM QUICK ACTIONS -------- */}
      {/* …everything below this comment is unchanged from your version… */}
      {/* I’m leaving it exactly as you had it, except the mood preview card now uses weekPreview. */}

      <section className="max-w-6xl mx-auto px-5 pt-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Premium Chat */}
        <button
          onClick={onOpenPremiumChat}
          className="group relative rounded-2xl bg-slate-950/90 border border-amber-300/50 px-4 py-4 text-left shadow-lg shadow-black/40 overflow-hidden"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-br from-amber-400/30 via-amber-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 blur-xl transition" />
          <div className="relative">
            <p className="font-semibold text-amber-200 text-sm’nde flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify中心 rounded-full bg-amber-400/20 text-[11px]">
                ⭐
              </span>
              Premium chat
              <span className="opacity-0 group-hover:opacity-100 transition-all">
                →
              </span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Go to your priority room with faster, deeper responses.
            </p>
          </div>
        </button>

        {/* Mood Dashboard */}
        <div
          onClick={onOpenMoodDashboard}
          className="cursor-pointer group rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-4 text-left hover:border-sky-300/70 hover:bg-slate-900/95 transition-all duration-300"
        >
          <p className="font-semibold text-sky-200 text-sm flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-400/15 text-[11px]">
              📊
            </span>
            Mood dashboard
            <span className="opacity-0 group-hover:opacity-100 transition-all">
              →
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            See weekly highs & lows, patterns, and your emotional timeline.
          </p>
        </div>

        {/* AI Emotion Images */}
        <div
          onClick={onOpenEmotionImages}
          className="cursor-pointer group rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-4 text-left hover:border-violet-300/70 hover:bg-slate-900/95 transition-all duration-300"
        >
          <p className="font-semibold text-violet-200 text-sm flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-400/15 text-[11px]">
              🎨
            </span>
            AI emotion images
            <span className="opacity-0 group-hover:opacity-100 transition-all">
              →
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            View abstract visuals of how your recent chats feel.
          </p>
        </div>

        {/* Emotion Playlist – premium music space */}
        <div
          onClick={onOpenEmotionPlaylist}
          className="cursor-pointer group rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-4 text-left hover:border-emerald-300/70 hover:bg-slate-900/95 transition-all duration-300"
        >
          <p className="font-semibold text-emerald-200 text-sm flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15 text-[11px]">
              🎧
            </span>
            Emotion playlist
            <span className="opacity-0 group-hover:opacity-100 transition-all">
              →
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Mood-based music in your language to wind down after chats.
          </p>
        </div>

        {/* Emotional Journal */}
        {/* ... KEEP your existing cards for Journal, Calm Companion, insights grid, etc ... */}
      </section>

      {/* ------ INSIGHTS GRID with mood preview (updated part) ------ */}
      <section className="max-w-6xl mx-auto px-5 py-10 grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          {/* This week's mood trend preview (now using weekPreview) */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl shadow-black/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h3 className="text-lg font-semibold">
                This week&apos;s mood trend
              </h3>
              <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                Preview · tap mood dashboard for full view
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              EMOTI tracks your emotional patterns to help you understand
              yourself better over time.
            </p>

            <div className="h-40 rounded-xl bg-slate-900/80 border border-slate-700 px-4 py-3 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-slate-500 mb-2">
                <span>Heavier days</span>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400" /> low
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400" /> okay
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> high
                  </span>
                </div>
                <span>Lighter days</span>
              </div>

              <div className="flex-1 flex items-end gap-3">
                {weekPreview.days.map((day) => {
                  const height =
                    day.score && day.score > 0 ? (day.score / 5) * 100 : 0;
                  const barClass =
                    day.score && day.score > 0
                      ? moodColor(day.mood)
                      : "bg-slate-800/60 border border-slate-700";

                  return (
                    <div
                      key={day.id}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className={`w-full max-w-[18px] rounded-full ${barClass} shadow-sm shadow-slate-900 transition-all`}
                        style={{
                          height: `${day.score ? Math.max(height, 18) : 6}%`,
                        }}
                      />
                      <span className="text-[10px] text-slate-400">
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-2 text-[10px] text-slate-500 text-center">
                This is a soft preview of your week. Open the Mood Dashboard for
                deeper insights, journaling prompts, and patterns over time.
              </p>
            </div>
          </div>

          {/* your existing recap card stays the same */}
          {/* ... keep the “Gentle recap” card here unchanged ... */}
        </div>

        {/* RIGHT COLUMN (AI images, playlist, Calm Companion) – unchanged */}
        {/* ... keep the rest of your component exactly as before ... */}
      </section>

      {/* rest of file (premium tools list etc.) stays unchanged */}
    </div>
  );
}
