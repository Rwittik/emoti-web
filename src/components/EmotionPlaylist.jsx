// src/components/EmotionPlaylist.jsx
import React, { useEffect, useState } from "react";

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

// Fallback playlists if the API fails or returns nothing.
// These keep the UI feeling “alive” even when Spotify isn’t available.
const FALLBACK_PLAYLISTS = [
  {
    id: "fallback-1",
    title: "Soft late-night vibes",
    description: "Gentle tracks to match your current mood.",
    lengthText: "22 tracks · ~1 hr 30 min",
  },
  {
    id: "fallback-2",
    title: "EMOTI Focus mix",
    description: "Lo-fi, calm beats for study or work.",
    lengthText: "18 tracks · ~1 hr",
  },
  {
    id: "fallback-3",
    title: "Comfort + hope",
    description: "Sad but comforting songs with a hopeful feel.",
    lengthText: "20 tracks · ~1 hr 15 min",
  },
];

export default function EmotionPlaylist({ onBack, defaultMood = "chill" }) {
  const [selectedMood, setSelectedMood] = useState(defaultMood);
  const [selectedLanguage, setSelectedLanguage] = useState("Mix");

  const [playlists, setPlaylists] = useState([]); // data from backend
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentMoodLabel =
    MOOD_OPTIONS.find((m) => m.id === selectedMood)?.label ?? "Chill";

  // Fetch playlists whenever mood or language changes
  useEffect(() => {
    let cancelled = false;

    async function fetchPlaylists() {
      // guard for SSR
      if (typeof window === "undefined") return;

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          mood: selectedMood,
          language: selectedLanguage,
        });

        const res = await fetch(`/api/emotion-playlists?${params.toString()}`);

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const data = await res.json();

        // Expect: { playlists: [{ id, title, description, url, image, trackCount, lengthText? }] }
        const received = Array.isArray(data.playlists) ? data.playlists : [];

        if (!cancelled) {
          setPlaylists(received);
        }
      } catch (err) {
        console.error("Failed to fetch emotion playlists", err);
        if (!cancelled) {
          setError("Could not load playlists right now.");
          setPlaylists([]); // force fallback
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPlaylists();

    return () => {
      cancelled = true;
    };
  }, [selectedMood, selectedLanguage]);

  const usingReal = playlists.length > 0;
  const displayPlaylists = usingReal ? playlists : FALLBACK_PLAYLISTS;

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
              that fit how you&apos;re feeling. This tab pulls real playlists
              from Spotify through EMOTI&apos;s backend.
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

        {/* Playlist suggestions */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 mb-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold">Suggested playlists</h3>
              <p className="text-[11px] text-slate-400">
                Mood:{" "}
                <span className="text-amber-200">{currentMoodLabel}</span> ·
                Language:{" "}
                <span className="text-sky-300">{selectedLanguage}</span>
              </p>
              {loading && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Fetching playlists from Spotify…
                </p>
              )}
              {error && !loading && (
                <p className="text-[10px] text-rose-400 mt-1">{error}</p>
              )}
              {!usingReal && !loading && !error && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Showing EMOTI sample playlists until more data is available.
                </p>
              )}
            </div>
            <p className="text-[10px] text-slate-500 max-w-xs">
              When you tap &quot;Open in Spotify&quot;, EMOTI sends you to the
              official playlist in the Spotify app or web player.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {displayPlaylists.map((pl) => (
              <div
                key={pl.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col p-4"
              >
                <div className="mb-3">
                  {pl.image ? (
                    <img
                      src={pl.image}
                      alt={pl.title}
                      className="w-16 h-16 rounded-xl object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 via-violet-500 to-amber-400 flex items-center justify-center text-lg">
                      🎧
                    </div>
                  )}
                </div>

                <h4 className="text-sm font-semibold mb-1">{pl.title}</h4>

                <p className="text-[11px] text-slate-400 mb-2 line-clamp-3">
                  {pl.description || "Playlist from Spotify."}
                </p>

                <p className="text-[10px] text-slate-500 mb-4">
                  {pl.lengthText
                    ? pl.lengthText
                    : pl.trackCount
                    ? `${pl.trackCount} tracks`
                    : "Playlist length not available"}
                </p>

                {pl.url ? (
                  <a
                    href={pl.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto text-[11px] px-3 py-1.5 rounded-full border border-emerald-400 text-emerald-200 hover:bg-emerald-400/10 text-center"
                  >
                    Open in Spotify
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-auto text-[11px] px-3 py-1.5 rounded-full border border-slate-700 text-slate-300 cursor-not-allowed bg-slate-900/80"
                  >
                    Connect to music app (coming soon)
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Small note */}
        <p className="text-[10px] text-slate-500 max-w-xl">
          EMOTI calls a backend route{" "}
          <code className="px-1 py-0.5 rounded bg-slate-900 border border-slate-700">
            /api/emotion-playlists
          </code>{" "}
          which talks to Spotify (using your Client ID &amp; Secret) and returns
          playlists for the selected mood and language.
        </p>
      </div>
    </div>
  );
}
