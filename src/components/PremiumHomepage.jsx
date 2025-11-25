// src/components/PremiumHomepage.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore"; // added setDoc

// ---------- helpers shared with MoodDashboard / EmotionImages ----------

// helper copied from MoodDashboard for consistent colors
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

// localStorage key used by PremiumChat / MoodDashboard
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

// get Monday of the week with an offset (0 = current)
function getWeekStart(date, weekOffset = 0) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diffToMonday + weekOffset * 7);
  return d;
}

// build a Mon–Sun week view from mood events (same as MoodDashboard)
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

// summarise a week's pattern for the Gentle recap sentence
function buildWeekSummary(week) {
  if (!week || !week.days) {
    return {
      phrase: "a mix of okay and heavy",
    };
  }

  const daysWithData = week.days.filter((d) => d.score > 0);
  if (!daysWithData.length) {
    return {
      phrase: "a soft mix of days — data will build up as you chat",
    };
  }

  const counts = { high: 0, okay: 0, low: 0 };
  daysWithData.forEach((d) => {
    counts[d.mood] = (counts[d.mood] || 0) + 1;
  });

  let phrase = "a mix of okay and heavy";

  if (counts.high >= counts.okay && counts.high >= counts.low) {
    phrase = "mostly on the lighter / positive side";
  } else if (counts.low >= counts.okay && counts.low >= counts.high) {
    phrase = "mostly on the heavier side";
  } else {
    // mix case
    if (counts.low && counts.high) {
      phrase = "quite up and down";
    } else if (counts.low) {
      phrase = "a mix of okay and heavy";
    } else {
      phrase = "a mix of okay and lighter days";
    }
  }

  return { phrase };
}

// --- EmotionImages-style helpers for AI image preview ---

function mapEmotionToMood(emotion) {
  if (!emotion) return "mixed";
  const e = String(emotion).toLowerCase();

  if (["calm", "relaxed", "grounded", "peaceful", "relief"].includes(e))
    return "calm";

  if (
    ["hopeful", "optimistic", "motivated", "encouraged", "excited"].includes(e)
  )
    return "hopeful";

  if (
    [
      "sad",
      "low",
      "down",
      "depressed",
      "stressed",
      "anxious",
      "overwhelmed",
      "lonely",
      "angry",
      "upset",
      "heavy",
    ].includes(e)
  )
    return "heavy";

  if (["okay", "neutral", "mixed", "tired", "meh"].includes(e)) return "mixed";

  return "mixed";
}

function getPresetForMood(mood, index = 0) {
  switch (mood) {
    case "calm":
      return {
        title: index === 0 ? "Quiet pocket of calm" : "Soft, grounded evening",
        tone: "Soft, peaceful, slightly reflective",
        description:
          "Gentle blue tones with soft light – like a slower, calmer moment after emotional noise.",
      };
    case "hopeful":
      return {
        title: index === 0 ? "Small window of hope" : "Quiet hopeful shift",
        tone: "Gentle but bright, like a small light in a dark room",
        description:
          "Deep navy background with a warm golden glow, symbolising tiny but real bits of hope showing up.",
      };
    case "heavy":
      return {
        title: index === 0 ? "Heavy cloud day" : "Overthinking storm",
        tone: "Dense, slightly chaotic, heavy in the chest",
        description:
          "Dark clouds with thin streaks of light trying to break through – mirroring stress, worry, and emotional weight.",
      };
    case "mixed":
    default:
      return {
        title: index === 0 ? "Mixed sky, mixed day" : "Up & down waves",
        tone: "Half bright, half cloudy – up and down",
        description:
          "One side clear and bright, the other cloudy and muted, for days that felt both okay and heavy at the same time.",
      };
  }
}

// same logic as EmotionImages: build 1 card per recent day (we only need titles)
function buildImagesFromEvents(events) {
  if (!events || events.length === 0) return [];

  const sorted = [...events].sort((a, b) => b.ts - a.ts);

  const byDay = new Map();
  for (const ev of sorted) {
    if (!ev.ts || !ev.emotion) continue;
    const d = new Date(ev.ts);
    const key = d.toISOString().slice(0, 10);
    const mood = mapEmotionToMood(ev.emotion);

    if (!byDay.has(key)) {
      byDay.set(key, {
        date: d,
        counts: { calm: 0, hopeful: 0, heavy: 0, mixed: 0 },
      });
    }
    byDay.get(key).counts[mood] += 1;
  }

  const dayEntries = Array.from(byDay.values())
    .sort((a, b) => b.date - a.date)
    .slice(0, 6);

  const results = dayEntries.map((entry, idx) => {
    const { date, counts } = entry;
    let dominant = "mixed";
    let best = -1;
    for (const m of ["calm", "hopeful", "heavy", "mixed"]) {
      if (counts[m] > best) {
        best = counts[m];
        dominant = m;
      }
    }

    const { title, tone, description } = getPresetForMood(dominant, idx);

    const createdAt = date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return {
      id: `auto-${date.toISOString()}`,
      title,
      mood: dominant,
      tone,
      description,
      createdAt,
    };
  });

  return results;
}

// ---------- preview fallback data (UI stays same if no data) ----------

// preview data aligned with MoodDashboard "This week"
const MOOD_PREVIEW_DAYS = [
  { id: "mon", label: "Mon", mood: "low", score: 2 },
  { id: "tue", label: "Tue", mood: "okay", score: 3 },
  { id: "wed", label: "Wed", mood: "high", score: 4 },
  { id: "thu", label: "Thu", mood: 2, score: 2 },
  { id: "fri", label: "Fri", mood: "okay", score: 3 },
  { id: "sat", label: "Sat", mood: "high", score: 5 },
  { id: "sun", label: "Sun", mood: "okay", score: 3 },
];

const SAMPLE_WEEK = {
  id: "this-week",
  label: "This week",
  range: "Mon – Sun",
  days: MOOD_PREVIEW_DAYS,
};

// ---------- NEW: Mood selector / daily suggestion helpers ----------

// small mapping for mood colors (hex for inline styles)
const MOOD_META = {
  happy: { label: "😄 Happy", color: "#10b981", bucket: "high" }, // emerald
  sad: { label: "😔 Sad", color: "#ef4444", bucket: "low" }, // red
  angry: { label: "😡 Angry", color: "#f97316", bucket: "low" }, // orange
  tired: { label: "😵 Tired", color: "#6b7280", bucket: "okay" }, // gray
  anxious: { label: "😰 Anxious", color: "#6366f1", bucket: "low" }, // indigo
};

// supportive response per mood (keeps it short & kind)
const SUPPORTIVE_RESPONSES = {
  happy: "That's wonderful — hold onto this little light. Would you like a short grounding or celebration prompt?",
  sad: "I’m sorry you’re feeling down. Would you like a comforting prompt or a breathing reset?",
  angry: "Anger is valid. Try a 1-minute grounding to let the intensity pass — I can guide you if you want.",
  tired: "You sound exhausted. A short rest exercise or a 2-minute breathing break could help — want to try?",
  anxious: "That tightness in your chest is important to notice. Want a gentle 3-step grounding routine now?",
};

// append mood event locally + sync to Firestore (used by mood selector)
async function appendMoodEventLocalAndCloud(uid, emotion) {
  if (!uid || !emotion) return;

  const key = getMoodKey(uid);
  let updated = [];

  try {
    const raw = typeof window !== "undefined" && window.localStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];

    updated = [
      ...existing,
      {
        ts: Date.now(),
        emotion,
      },
    ].slice(-500);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch (err) {
    console.error("Failed to append mood event in localStorage", err);
  }

  // also sync to Firestore
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { moodEvents: updated }, { merge: true });
  } catch (err) {
    console.error("Failed to sync moodEvents to Firestore", err);
  }
}

// ---------- component ----------

export default function PremiumHomepage({
  onOpenPremiumChat = () => {},
  onOpenMoodDashboard = () => {},
  onOpenEmotionImages = () => {},
  onOpenEmotionPlaylist = () => {},
  onOpenJournal = () => {},
  onOpenCalmCompanion = () => {},
  user,
}) {
  const { user: authUser } = useAuth();
  const effectiveUser = user || authUser;

  // state used only for data, not UI structure
  const [weekPreview, setWeekPreview] = useState(SAMPLE_WEEK);
  const [recapSummary, setRecapSummary] = useState(
    buildWeekSummary(SAMPLE_WEEK)
  );
  const [imagePreviewTitles, setImagePreviewTitles] = useState({
    latest: "Latest reflection",
    previous: "Previous reflection",
  });

  // --- new: daily suggestion + mood selector states
  const [dailySuggestion, setDailySuggestion] = useState("");
  const [selectedMood, setSelectedMood] = useState(null); // one of 'happy','sad','angry','tired','anxious'
  const [supportiveMessage, setSupportiveMessage] = useState("");
  const [moodPulseAt, setMoodPulseAt] = useState(0); // used to re-run pulse animation

  // small pool of friendly suggestions (feel free to expand)
  const SUGGESTIONS = [
    "🧘 “Take a deep breath… you’re doing great today.”",
    "🌙 “Pause for a moment. Small steps tonight count.”",
    "💧 “A 60-second stretch can ease tension — try it now.”",
    "✍️ “Write down one thing that went okay today — it matters.”",
    "☕ “Make a warm drink, and give yourself 5 calm minutes.”",
    "🌤️ “Try noticing 3 things you can hear right now — grounding helps.”",
  ];

  // generate daily suggestion (once per mount or per user)
  useEffect(() => {
    if (!dailySuggestion) {
      // pick deterministic-ish suggestion if user exists
      if (effectiveUser && effectiveUser.uid) {
        const idx = effectiveUser.uid
          .split("")
          .reduce((s, c) => s + c.charCodeAt(0), 0) % SUGGESTIONS.length;
        setDailySuggestion(SUGGESTIONS[idx]);
      } else {
        setDailySuggestion(
          SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)]
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUser]);

  // listen to moodEvents in real time and update preview states
  useEffect(() => {
    if (!effectiveUser) {
      setWeekPreview(SAMPLE_WEEK);
      setRecapSummary(buildWeekSummary(SAMPLE_WEEK));
      setImagePreviewTitles({
        latest: "Latest reflection",
        previous: "Previous reflection",
      });
      return;
    }

    const userRef = doc(db, "users", effectiveUser.uid);

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

        // fallback to localStorage if Firestore has no events yet
        if (!events.length && typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(getMoodKey(effectiveUser.uid));
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) {
              events = parsed;
            }
          } catch (err) {
            console.error("PremiumHomepage: failed to read moodEvents", err);
          }
        }

        // build week preview for mini graph + recap
        const week = buildWeekFromEvents(events, 0, SAMPLE_WEEK);
        setWeekPreview(week);
        setRecapSummary(buildWeekSummary(week));

        // build AI image preview titles
        const images = buildImagesFromEvents(events);
        if (images.length > 0) {
          setImagePreviewTitles({
            latest: images[0].title || "Latest reflection",
            previous:
              (images[1] && images[1].title) || "Previous reflection",
          });
        } else {
          setImagePreviewTitles({
            latest: "Latest reflection",
            previous: "Previous reflection",
          });
        }
      },
      (err) => {
        console.error("PremiumHomepage: moodEvents listener error", err);
      }
    );

    return () => unsubscribe();
  }, [effectiveUser]);

  const firstName =
    effectiveUser?.displayName?.split(" ")[0] ||
    effectiveUser?.email?.split("@")[0] ||
    "Friend";

  // ---------- mood selector action ----------
  const handleMoodTap = async (key) => {
    if (!MOOD_META[key]) return;

    // immediate UI feedback
    setSelectedMood(key);
    setSupportiveMessage(SUPPORTIVE_RESPONSES[key] || "I'm here with you.");
    setMoodPulseAt(Date.now());

    // record event locally + cloud
    try {
      await appendMoodEventLocalAndCloud(
        effectiveUser?.uid || "anonymous",
        MOOD_META[key].label
      );
    } catch (err) {
      console.error("Failed to append mood event:", err);
    }

    // auto-clear supportive message after some time (optional)
    setTimeout(() => {
      setSupportiveMessage("");
      // do not clear selectedMood immediately — keep glow for a short while
      setTimeout(() => setSelectedMood(null), 1500);
    }, 4200);
  };

  // regenerate daily suggestion
  const regenerateSuggestion = () => {
    setDailySuggestion(
      SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)]
    );
  };

  return (
    <div className="relative bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50 min-h-screen pb-20">
      {/* soft background orbs */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60">
        <div className="absolute -top-40 -left-10 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      {/* -------- PREMIUM BANNER -------- */}
      <section className="relative border-b border-amber-400/20 overflow-hidden">
        {/* soft background glow */}
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

              {/* Daily Suggestion (NEW) */}
              <div className="mt-3 max-w-md">
                <div className="rounded-2xl bg-slate-900/85 border border-slate-800 px-4 py-3 flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-sky-400 flex items-center justify-center text-slate-900 font-semibold shadow-md">
                      🕊️
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start gap-2">
                      <p className="text-sm text-slate-100">{dailySuggestion}</p>
                      <button
                        onClick={regenerateSuggestion}
                        className="ml-auto text-[11px] px-2 py-1 rounded-full bg-slate-800/70 border border-slate-700 hover:bg-slate-800/90"
                        aria-label="Regenerate suggestion"
                      >
                        ↻
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      A small wellness nudge to try tonight.
                    </p>
                  </div>
                </div>
              </div>

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

            {/* tiny “at a glance” stats (still simple for now) */}
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
      <section className="max-w-6xl mx-auto px-5 pt-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Premium Chat */}
        <button
          onClick={onOpenPremiumChat}
          className="group relative rounded-2xl bg-slate-950/90 border border-amber-300/50 px-4 py-4 text-left shadow-lg shadow-black/40 overflow-hidden"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-br from-amber-400/30 via-amber-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 blur-xl transition" />
          <div className="relative">
            <p className="font-semibold text-amber-200 text-sm flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20 text-[11px]">
                ⭐
              </span>
              Premium chat
              <span className="opacity-0 group-hover:opacity-100 transition-all">→</span>
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
            <span className="opacity-0 group-hover:opacity-100 transition-all">→</span>
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
            <span className="opacity-0 group-hover:opacity-100 transition-all">→</span>
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
            <span className="opacity-0 group-hover:opacity-100 transition-all">→</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Mood-based music in your language to wind down after chats.
          </p>
        </div>

        {/* Emotional Journal */}
        <div
          onClick={onOpenJournal}
          className="cursor-pointer group rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-4 text-left hover:border-pink-300/70 hover:bg-slate-900/95 transition-all duration-300"
        >
          <p className="font-semibold text-pink-200 text-sm flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-pink-400/15 text-[11px]">
              📔
            </span>
            Emotional journal
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-pink-500/10 border border-pink-300/60 text-pink-100">
              NEW
            </span>
            <span className="opacity-0 group-hover:opacity-100 transition-all">→</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Write freely and let EMOTI reflect your feelings back to you.
          </p>
        </div>

        {/* Calm Companion */}
        <div
          onClick={onOpenCalmCompanion}
          className="cursor-pointer group rounded-2xl bg-slate-900/90 border border-emerald-400/70 px-4 py-4 text-left hover:border-emerald-300 hover:bg-slate-900/95 transition-all duration-300"
        >
          <p className="font-semibold text-emerald-200 text-sm flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-[11px]">
              🌙
            </span>
            Calm Companion
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 border border-emerald-300/60 text-emerald-100">
              NEW
            </span>
            <span className="opacity-0 group-hover:opacity-100 transition-all">→</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Guided breathing, affirmations, grounding, and soft sleep stories.
          </p>
        </div>
      </section>

      {/* -------- INSIGHTS GRID (BALANCED TWO COLUMNS) -------- */}
      <section className="max-w-6xl mx-auto px-5 py-10 grid lg:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: Mood trend + recap card */}
        <div className="space-y-4">
          {/* This week's mood trend preview (now powered by weekPreview) */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl shadow-black/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h3 className="text-lg font-semibold">This week&apos;s mood trend</h3>
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

              {/* mini bar graph similar to MoodDashboard */}
              <div className="flex-1 flex items-end gap-3">
                {weekPreview.days.map((day) => {
                  const height =
                    day.score && day.score > 0 ? (day.score / 5) * 100 : 0;
                  return (
                    <div
                      key={day.id}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className={`w-full max-w-[18px] rounded-full ${
                          day.score && day.score > 0
                            ? moodColor(day.mood)
                            : "bg-slate-800/60 border border-slate-700"
                        } shadow-sm shadow-slate-900`}
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

          {/* Compact recap / nudge card (text driven by actual pattern) */}
          <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-5 shadow-xl shadow-black/40">
            <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80 mb-2">
              Gentle recap
            </p>
            <p className="text-sm text-slate-200">
              This week felt{" "}
              <span className="font-semibold text-emerald-200">
                {recapSummary.phrase}
              </span>
              . You still showed up and shared how you feel — that matters more
              than having “perfect” days.
            </p>
            <div className="mt-3 grid sm:grid-cols-3 gap-3 text-[11px]">
              <div className="rounded-xl bg-slate-950/70 border border-slate-700 px-3 py-2">
                <p className="text-slate-400 mb-1">Tiny win</p>
                <p className="text-slate-100">You checked in even when your mood was low.</p>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-slate-700 px-3 py-2">
                <p className="text-slate-400 mb-1">Tonight&apos;s nudge</p>
                <p className="text-slate-100">Try writing 2–3 sentences in your journal before sleep.</p>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-slate-700 px-3 py-2">
                <p className="text-slate-400 mb-1">Quick tool</p>
                <p className="text-slate-100">Use Calm Companion for a short anxiety reset session.</p>
              </div>
            </div>
          </div>

          {/* NEW: Mood Selector card (High impact, low effort) */}
          <div
            className="rounded-2xl bg-slate-900/85 border border-slate-800 p-5 shadow-xl shadow-black/40"
            style={{
              transition: "box-shadow 220ms ease, transform 220ms ease",
              boxShadow: selectedMood
                ? `0 18px 40px ${MOOD_META[selectedMood].color}22`
                : undefined,
              transform: selectedMood ? "translateY(-2px)" : undefined,
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/80">How are you feeling right now?</p>
                <h4 className="text-sm font-semibold text-slate-50 mt-1">Tap a mood — EMOTI will respond kindly</h4>
              </div>

              <div className="text-[10px] text-slate-400">Quick mood check</div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {Object.keys(MOOD_META).map((k) => {
                const meta = MOOD_META[k];
                const active = selectedMood === k;
                return (
                  <button
                    key={k}
                    onClick={() => handleMoodTap(k)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full border transition transform active:scale-95"
                    style={{
                      borderColor: active ? meta.color : "rgba(148,163,184,0.12)",
                      background: active ? `${meta.color}12` : "transparent",
                      boxShadow: active ? `0 8px 24px ${meta.color}22` : undefined,
                    }}
                    aria-pressed={active}
                  >
                    <span style={{ fontSize: 16 }}>{meta.label}</span>
                  </button>
                );
              })}

              {/* supportive response area */}
              <div className="w-full mt-3">
                <div
                  className="rounded-xl px-4 py-3 bg-slate-950/80 border border-slate-800"
                  style={{
                    transition: "box-shadow 300ms ease, border-color 300ms ease",
                    borderColor: selectedMood ? MOOD_META[selectedMood].color : undefined,
                    boxShadow: selectedMood ? `0 10px 30px ${selectedMood ? MOOD_META[selectedMood].color + "22" : ""}` : undefined,
                  }}
                >
                  {supportiveMessage ? (
                    <div className="flex items-start gap-3">
                      <div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/6 text-white text-sm">
                          🙂
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-slate-100">{supportiveMessage}</p>
                        <p className="text-[10px] text-slate-400 mt-1">If you want, EMOTI can open a breathing exercise or a journaling prompt.</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Tap a mood above to get a short supportive reply. Your choice is private and saved to your mood history.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI images + playlist + Calm Companion preview */}
        <div className="space-y-4">
          {/* AI Reflection Images (titles now reflect latest/previus mood images) */}
          <div
            onClick={onOpenEmotionImages}
            className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl cursor-pointer hover:border-violet-300/70 hover:bg-slate-900 transition-all duration-300"
            role="button"
          >
            <h3 className="text-lg font-semibold mb-2">AI emotion images</h3>
            <p className="text-sm text-slate-400 mb-3">
              Visual reflections of your feelings based on recent chats.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Preview tile 1 – latest image */}
              <div className="relative rounded-xl h-24 border border-slate-700 overflow-hidden bg-slate-800/60 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/40 via-violet-500/30 to-slate-900 opacity-90" />
                <span className="relative text-[11px] text-slate-100 font-medium text-center px-2">
                  {imagePreviewTitles.latest}
                </span>
              </div>

              {/* Preview tile 2 – previous image */}
              <div className="relative rounded-xl h-24 border border-slate-700 overflow-hidden bg-slate-800/60 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/35 via-teal-400/25 to-slate-900 opacity-80" />
                <span className="relative text-[11px] text-slate-100 font-medium text-center px-2">
                  {imagePreviewTitles.previous}
                </span>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              Generated softly from your emotional tone — never shown to anyone
              else.
            </p>
            <p className="mt-1 text-[10px] text-amber-200">
              Click to open your full AI Emotion Images gallery.
            </p>
          </div>

          {/* Mini Emotion Playlist teaser (unchanged for now) */}
          <div
            onClick={onOpenEmotionPlaylist}
            className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-emerald-300/40 p-4 shadow-lg shadow-emerald-500/25 cursor-pointer hover:border-emerald-200 hover:shadow-emerald-400/30 transition-all duration-300"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                  Emotion playlist
                </p>
                <h4 className="text-sm font-semibold text-slate-50">
                  Tonight&apos;s suggested mood mix
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Based on your recent check-ins:{" "}
                  <span className="text-emerald-200 font-medium">chill · a bit heavy · hopeful</span>
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-400 flex items-center justify-center text-slate-950 text-lg shadow-md shadow-emerald-500/40">
                ▶
              </div>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] text-slate-200 mb-2">
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">Chill · late night</span>
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">Sad but comforting</span>
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">Focus & study</span>
            </div>

            <p className="text-[10px] text-slate-500">
              Tap to pick your language & platform (Spotify / YouTube, etc.).
            </p>
          </div>

          {/* Calm Companion preview (unchanged) */}
          <div
            onClick={onOpenCalmCompanion}
            className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-400/60 p-4 shadow-lg shadow-emerald-500/30 cursor-pointer hover:border-emerald-300 hover:bg-slate-900/95 transition-all duration-300"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">Calm Companion</p>
                <h4 className="text-sm font-semibold text-slate-50">Soft voice support for heavy nights</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Guided breathing, gentle affirmations, grounding exercises,
                  and cozy sleep stories in a slow, soothing tone.
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-400 flex items-center justify-center text-slate-950 text-lg shadow-md shadow-emerald-500/50">
                🌙
              </div>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] text-slate-200">
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">Anxiety reset</span>
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">Grounding exercise</span>
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">Affirmations</span>
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">Sleep story</span>
            </div>
          </div>
        </div>
      </section>

      {/* -------- PREMIUM FEATURES LIST (unchanged) -------- */}
      <section className="max-w-6xl mx-auto px-5 py-8 md:py-10">
        <h2 className="text-xl font-semibold mb-4">Your premium tools</h2>

        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 p-4 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-sky-500/10 blur-2xl" />
            <h4 className="font-medium mb-1">🧠 Deep emotional analysis</h4>
            <p className="text-slate-400 relative">
              Understand layered emotions behind your words across multiple
              chats, not just one conversation.
            </p>
          </div>
          <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 p-4 overflow-hidden">
            <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-violet-500/10 blur-2xl" />
            <h4 className="font-medium mb-1">🎨 AI mood images</h4>
            <p className="text-slate-400 relative">
              Get visual forms of what you&apos;re feeling, perfect for
              journaling, lock screens, or quiet reflection.
            </p>
          </div>
          <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 p-4 overflow-hidden">
            <div className="absolute -top-12 right-0 w-20 h-20 rounded-full bg-emerald-500/10 blur-2xl" />
            <h4 className="font-medium mb-1">📔 Private mood tracker</h4>
            <p className="text-slate-400 relative">
              A personal emotional diary summarising highs, lows, and patterns
              over weeks — only visible to you.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
