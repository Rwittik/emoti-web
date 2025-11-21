// src/components/EmotionImages.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";

// Fallback sample AI emotion images data (used if no real mood events yet)
const SAMPLE_EMOTION_IMAGES = [
  {
    id: "calm-1",
    title: "Quiet evening calm",
    mood: "calm",
    tone: "Soft, peaceful, slightly reflective",
    description:
      "Soft blue and purple tones with gentle light – representing a calmer, slower evening after a heavy week.",
    tags: ["calm", "relief", "evening"],
    createdAt: "Sample · not yet personalised",
  },
  {
    id: "heavy-1",
    title: "Overthinking cloud",
    mood: "heavy",
    tone: "Dense, slightly chaotic, heavy in the chest",
    description:
      "Dark clouds with thin lines of light trying to break through, visualising looping thoughts and mental noise.",
    tags: ["overthinking", "anxiety", "foggy"],
    createdAt: "Sample · not yet personalised",
  },
  {
    id: "hope-1",
    title: "Small hope in the corner",
    mood: "hopeful",
    tone: "Gentle but bright, like a small light in a dark room",
    description:
      "Deep navy background with one warm golden window, symbolising a tiny but real sense of hope.",
    tags: ["hope", "resilience", "tiny-win"],
    createdAt: "Sample · not yet personalised",
  },
  {
    id: "mixed-1",
    title: "Mixed day, mixed sky",
    mood: "mixed",
    tone: "Half bright, half cloudy – up and down",
    description:
      "Split sky: one side clear and blue, the other cloudy and muted, capturing a day that felt both okay and heavy.",
    tags: ["mixed", "up-and-down", "processing"],
    createdAt: "Sample · not yet personalised",
  },
];

// same 4 categories we show in the UI
function moodColor(mood) {
  switch (mood) {
    case "calm":
      return "bg-sky-400";
    case "hopeful":
      return "bg-emerald-400";
    case "heavy":
      return "bg-rose-400";
    case "mixed":
    default:
      return "bg-amber-400";
  }
}

function moodLabel(mood) {
  switch (mood) {
    case "calm":
      return "Calm / grounded";
    case "hopeful":
      return "Hopeful";
    case "heavy":
      return "Heavy / overwhelmed";
    case "mixed":
    default:
      return "Mixed / unsure";
  }
}

// Filter chips
const FILTERS = [
  { id: "all", label: "All moods" },
  { id: "calm", label: "Calm" },
  { id: "hopeful", label: "Hopeful" },
  { id: "heavy", label: "Heavy" },
  { id: "mixed", label: "Mixed" },
];

// -------- helpers to read mood events from localStorage --------

function getMoodKey(uid) {
  return `emoti_mood_events_${uid}`;
}

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

  // default bucket
  return "mixed";
}

// create one “image card” per recent day of mood events (max 6)
function buildImagesFromEvents(events) {
  if (!events || events.length === 0) return [];

  // sort newest first
  const sorted = [...events].sort((a, b) => b.ts - a.ts);

  // group by date (YYYY-MM-DD)
  const byDay = new Map();
  for (const ev of sorted) {
    if (!ev.ts || !ev.emotion) continue;
    const d = new Date(ev.ts);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
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
    .slice(0, 6); // last 6 days max

  const results = dayEntries.map((entry, idx) => {
    const { date, counts } = entry;
    // find dominant mood for that day
    let dominant = "mixed";
    let best = -1;
    for (const m of ["calm", "hopeful", "heavy", "mixed"]) {
      if (counts[m] > best) {
        best = counts[m];
        dominant = m;
      }
    }

    const { title, tone, description, tags } = getPresetForMood(dominant, idx);

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
      tags,
      createdAt,
    };
  });

  return results;
}

function getPresetForMood(mood, index = 0) {
  switch (mood) {
    case "calm":
      return {
        title: index === 0 ? "Quiet pocket of calm" : "Soft, grounded evening",
        tone: "Soft, peaceful, slightly reflective",
        description:
          "Gentle blue tones with soft light – like a slower, calmer moment after emotional noise.",
        tags: ["calm", "grounded", "slow-breath"],
      };
    case "hopeful":
      return {
        title: index === 0 ? "Small window of hope" : "Quiet hopeful shift",
        tone: "Gentle but bright, like a small light in a dark room",
        description:
          "Deep navy background with a warm golden glow, symbolising tiny but real bits of hope showing up.",
        tags: ["hopeful", "tiny-win", "growing"],
      };
    case "heavy":
      return {
        title: index === 0 ? "Heavy cloud day" : "Overthinking storm",
        tone: "Dense, slightly chaotic, heavy in the chest",
        description:
          "Dark clouds with thin streaks of light trying to break through – mirroring stress, worry, and emotional weight.",
        tags: ["heavy", "anxious", "tired"],
      };
    case "mixed":
    default:
      return {
        title: index === 0 ? "Mixed sky, mixed day" : "Up & down waves",
        tone: "Half bright, half cloudy – up and down",
        description:
          "One side clear and bright, the other cloudy and muted, for days that felt both okay and heavy at the same time.",
        tags: ["mixed", "up-and-down", "processing"],
      };
  }
}

/**
 * Generate a unique abstract “image” style per card using gradients.
 * Deterministic: same id + mood -> same art, new day -> new art.
 */
function getCardStyle(img) {
  const id = img.id || "";
  const mood = img.mood || "mixed";

  // simple deterministic seed from id string
  let seed = 0;
  for (let i = 0; i < id.length; i++) {
    seed = (seed + id.charCodeAt(i) * (i + 11)) % 10000;
  }

  const baseHue =
    mood === "calm"
      ? 210 // blue
      : mood === "hopeful"
      ? 140 // green
      : mood === "heavy"
      ? 340 // pink/red
      : 45; // amber / mixed

  const shift1 = (seed % 40) - 20;
  const shift2 = (seed % 60) - 30;
  const shift3 = (seed % 80) - 40;

  const h1 = (baseHue + shift1 + 360) % 360;
  const h2 = (baseHue + shift2 + 360) % 360;
  const h3 = (baseHue + shift3 + 360) % 360;

  const intensity = 0.35 + (seed % 25) / 100; // 0.35 – 0.60

  return {
    backgroundImage: `
      radial-gradient(circle at 0% 0%, hsla(${h1}, 90%, 65%, ${intensity}) 0, transparent 58%),
      radial-gradient(circle at 100% 0%, hsla(${h2}, 95%, 60%, ${intensity}) 0, transparent 58%),
      radial-gradient(circle at 0% 100%, hsla(${h3}, 85%, 55%, ${intensity}) 0, transparent 60%),
      radial-gradient(circle at 50% 60%, hsl(222, 47%, 11%) 0, hsl(222, 47%, 7%) 65%)
    `,
    transform: `scale(1.03) rotate(${(seed % 10) - 5}deg)`,
  };
}

export default function EmotionImages({ onBack }) {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [images, setImages] = useState(SAMPLE_EMOTION_IMAGES);

  // Load mood events from localStorage and build personalised images
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;

    try {
      const key = getMoodKey(user.uid);
      const raw = window.localStorage.getItem(key);
      const events = raw ? JSON.parse(raw) : [];

      const built = buildImagesFromEvents(events);

      // if we have any real data, use it; otherwise keep the sample cards
      if (built.length > 0) {
        setImages(built);
      }
    } catch (err) {
      console.error("Failed to load mood events for EmotionImages:", err);
    }
  }, [user]);

  const visibleImages = useMemo(() => {
    if (activeFilter === "all") return images;
    return images.filter((img) => img.mood === activeFilter);
  }, [activeFilter, images]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">
              EMOTI · AI emotion images
            </p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold">
              Visual reflections of your feelings
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-xl">
              These images are visual summaries of how your recent chats felt —
              like mood postcards generated from your emotional tone, not your
              appearance.
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

        {/* Filters + legend */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {/* Filters */}
          <div className="md:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Filter by emotional tone</h2>
              <span className="text-[11px] text-slate-500">
                Showing {visibleImages.length} image
                {visibleImages.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    activeFilter === f.id
                      ? "bg-amber-400/90 text-slate-950 border-amber-300"
                      : "bg-slate-950 text-slate-200 border-slate-700 hover:border-amber-300/60"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs">
            <p className="text-[11px] text-slate-400 mb-2">
              Colour legend (mood tone)
            </p>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400" />
                Calm / grounded
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                Hopeful / growing
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                Heavy / overwhelmed
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                Mixed / up &amp; down
              </div>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <section className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
          {/* Image cards */}
          <div className="space-y-4">
            {visibleImages.map((img) => (
              <article
                key={img.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 md:p-5"
              >
                <div className="grid md:grid-cols-[220px,minmax(0,1fr)] gap-4">
                  {/* Auto-generated abstract image */}
                  <div className="relative">
                    <div
                      className="h-40 rounded-xl overflow-hidden border border-slate-700 shadow-[0_0_35px_rgba(15,23,42,0.9)] bg-slate-900"
                      style={getCardStyle(img)}
                    >
                      <div className="relative h-full w-full flex items-center justify-center text-[11px] text-slate-100/80 mix-blend-screen">
                        AI mood reflection
                      </div>
                    </div>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-900/90 border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300">
                      <span
                        className={`w-2 h-2 rounded-full ${moodColor(
                          img.mood
                        )}`}
                      />
                      {moodLabel(img.mood)}
                    </span>
                  </div>

                  {/* Text info */}
                  <div className="flex flex-col justify-between gap-2 text-xs md:text-[13px]">
                    <div>
                      <h3 className="text-sm md:text-base font-semibold mb-1">
                        {img.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mb-2">
                        Tone: {img.tone}
                      </p>
                      <p className="text-slate-300">{img.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {img.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {img.createdAt}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {visibleImages.length === 0 && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 text-center text-xs text-slate-400">
                No images for this mood yet. Once you have more EMOTI
                conversations, we&apos;ll generate reflections here.
              </div>
            )}
          </div>

          {/* Side panel: how this helps */}
          <aside className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 text-xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">
                How EMOTI uses images
              </h3>
              <p className="text-slate-400">
                These visuals are meant to make your feelings easier to notice.
                You can save, journal with, or simply look at them to check in
                with yourself.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold text-slate-300">
                Try this reflection:
              </h4>
              <ul className="space-y-1 text-slate-400 list-disc list-inside">
                <li>Which image feels closest to how today felt?</li>
                <li>
                  If this picture could talk, what would it say about what you
                  need right now?
                </li>
                <li>
                  Is there a small action that matches the &quot;hopeful&quot; image?
                </li>
              </ul>
            </div>

            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400 mb-1">Coming soon</p>
              <p className="text-slate-300">
                In the future, EMOTI can auto-generate new images after intense
                or important chats, so you&apos;ll slowly build a visual diary of
                your emotional journey.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
