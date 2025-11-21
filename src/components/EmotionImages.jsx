// src/components/EmotionImages.jsx
import React, { useMemo, useState } from "react";

/**
 * Sample AI emotion images data.
 * Later you can connect this to Firestore or your backend.
 */
const SAMPLE_EMOTION_IMAGES = [
  {
    id: "calm-1",
    title: "Quiet evening calm",
    mood: "calm",
    tone: "Soft, peaceful, slightly reflective",
    description:
      "Soft blue and purple tones with gentle light – representing a calmer, slower evening after a heavy week.",
    tags: ["calm", "relief", "evening"],
    createdAt: "Today · 9:32 PM",
  },
  {
    id: "heavy-1",
    title: "Overthinking cloud",
    mood: "heavy",
    tone: "Dense, slightly chaotic, heavy in the chest",
    description:
      "Dark clouds with thin lines of light trying to break through, visualising looping thoughts and mental noise.",
    tags: ["overthinking", "anxiety", "foggy"],
    createdAt: "Yesterday · 11:08 PM",
  },
  {
    id: "hope-1",
    title: "Small hope in the corner",
    mood: "hopeful",
    tone: "Gentle but bright, like a small light in a dark room",
    description:
      "Deep navy background with one warm golden window, symbolising a tiny but real sense of hope.",
    tags: ["hope", "resilience", "tiny-win"],
    createdAt: "2 days ago · 7:21 PM",
  },
  {
    id: "mixed-1",
    title: "Mixed day, mixed sky",
    mood: "mixed",
    tone: "Half bright, half cloudy – up and down",
    description:
      "Split sky: one side clear and blue, the other cloudy and muted, capturing a day that felt both okay and heavy.",
    tags: ["mixed", "up-and-down", "processing"],
    createdAt: "3 days ago · 10:15 PM",
  },
];

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

const FILTERS = [
  { id: "all", label: "All moods" },
  { id: "calm", label: "Calm" },
  { id: "hopeful", label: "Hopeful" },
  { id: "heavy", label: "Heavy" },
  { id: "mixed", label: "Mixed" },
];

export default function EmotionImages({ onBack }) {
  const [activeFilter, setActiveFilter] = useState("all");

  const visibleImages = useMemo(() => {
    if (activeFilter === "all") return SAMPLE_EMOTION_IMAGES;
    return SAMPLE_EMOTION_IMAGES.filter((img) => img.mood === activeFilter);
  }, [activeFilter]);

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
                  {/* Fake image preview */}
                  <div className="relative">
                    <div className="h-40 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden border border-slate-700">
                      <div
                        className={`absolute inset-0 opacity-80 blur-2xl ${
                          img.mood === "calm"
                            ? "bg-gradient-to-br from-sky-500/40 via-indigo-500/30 to-slate-900"
                            : img.mood === "hopeful"
                            ? "bg-gradient-to-br from-emerald-400/40 via-teal-400/30 to-slate-900"
                            : img.mood === "heavy"
                            ? "bg-gradient-to-br from-rose-500/45 via-slate-900 to-slate-950"
                            : "bg-gradient-to-br from-amber-400/40 via-sky-400/25 to-slate-900"
                        }`}
                      />
                      <div className="relative h-full w-full flex items-center justify-center text-[11px] text-slate-200">
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
                <li>Is there a small action that matches the &quot;hopeful&quot; image?</li>
              </ul>
            </div>

            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400 mb-1">
                Coming soon
              </p>
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
