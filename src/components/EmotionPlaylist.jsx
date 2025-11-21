// src/components/EmotionPlaylist.jsx
import React, { useState } from "react";

const MOOD_OPTIONS = [
  { id: "chill", label: "Chill" },
  { id: "sad", label: "Sad but comforting" },
  { id: "focus", label: "Focus mood" },
  { id: "uplifting", label: "Uplifting" },
];

const LANGUAGE_OPTIONS = [
  "Hindi",
  "English",
  "Bengali",
  "Odia",
  "Tamil",
  "Telugu",
  "Marathi",
  "Mix",
];

export default function EmotionPlaylist({ onBack, defaultMood = "chill" }) {
  const [selectedMood, setSelectedMood] = useState(defaultMood);
  const [selectedLanguage, setSelectedLanguage] = useState("Mix");

  // Placeholder: later you can replace this with real playlists
  const mockPlaylists = [
    {
      id: "1",
      title: "Soft late-night vibes",
      description: "Gentle tracks to match your current mood.",
      length: "22 tracks · ~1 hr 30 min",
    },
    {
      id: "2",
      title: "EMOTI Focus mix",
      description: "Lo-fi, calm beats for study or work.",
      length: "18 tracks · ~1 hr",
    },
    {
      id: "3",
      title: "Comfort + hope",
      description: "Sad but comforting songs with a hopeful feel.",
      length: "20 tracks · ~1 hr 15 min",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">
              EMOTI · Emotion playlist
            </p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold">
              Music that matches your feelings
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-xl">
              Choose your mood and language, and EMOTI will suggest playlists
              that fit how you&apos;re feeling. Later this page can connect
              directly with Spotify / YouTube for real-time listening.
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

        {/* Mood + Language selectors */}
        <section className="grid md:grid-cols-3 gap-4 mb-8">
          {/* Mood selection */}
          <div className="md:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Select mood</h2>
              <span className="text-[11px] text-slate-500">
                Pick what matches you right now
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => setSelectedMood(mood.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    selectedMood === mood.id
                      ? "bg-amber-400/90 text-slate-950 border-amber-300"
                      : "bg-slate-950 text-slate-200 border-slate-700 hover:border-amber-300/60"
                  }`}
                >
                  {mood.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language selection */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
            <h2 className="text-sm font-semibold mb-2">Preferred language</h2>
            <p className="text-[11px] text-slate-400 mb-2">
              EMOTI will try to suggest playlists mainly in this language.
            </p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLanguage(lang)}
                  className={`px-3 py-1.5 rounded-full text-[11px] border transition ${
                    selectedLanguage === lang
                      ? "bg-sky-500/90 text-slate-950 border-sky-300"
                      : "bg-slate-950 text-slate-200 border-slate-700 hover:border-sky-400/70"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Playlist suggestions (placeholder content) */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 mb-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold">Suggested playlists</h3>
              <p className="text-[11px] text-slate-400">
                Mood:{" "}
                <span className="text-amber-200">
                  {
                    MOOD_OPTIONS.find((m) => m.id === selectedMood)?.label ??
                    "Chill"
                  }
                </span>{" "}
                · Language:{" "}
                <span className="text-sky-300">{selectedLanguage}</span>
              </p>
            </div>
            <p className="text-[10px] text-slate-500 max-w-xs">
              These are placeholder cards for now. Later you can plug in real
              playlist data from Spotify or YouTube based on mood + language.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {mockPlaylists.map((pl) => (
              <div
                key={pl.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col p-4"
              >
                <div className="mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 via-violet-500 to-amber-400 flex items-center justify-center text-lg">
                    🎧
                  </div>
                </div>
                <h4 className="text-sm font-semibold mb-1">{pl.title}</h4>
                <p className="text-[11px] text-slate-400 mb-2">
                  {pl.description}
                </p>
                <p className="text-[10px] text-slate-500 mb-4">
                  {pl.length}
                </p>
                <button
                  type="button"
                  className="mt-auto text-[11px] px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 cursor-not-allowed bg-slate-900/80"
                  title="You can wire this up to Spotify / YouTube later"
                >
                  Connect to music app (coming soon)
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Small note */}
        <p className="text-[10px] text-slate-500 max-w-xl">
          In the future, this page can call a backend route like{" "}
          <code className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700">
            /api/emotion-playlists
          </code>{" "}
          which talks to Spotify / YouTube and returns real playlist URLs based
          on the selected mood and language.
        </p>
      </div>
    </div>
  );
}
