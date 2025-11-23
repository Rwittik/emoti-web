// src/components/CalmCompanion.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";

const MODES = [
  { id: "anxiety", label: "Anxiety reset", emoji: "🌊" },
  { id: "grounding", label: "Grounding exercise", emoji: "🌱" },
  { id: "affirmations", label: "Affirmations", emoji: "💙" },
  { id: "sleep_story", label: "Sleep story", emoji: "🌙" },
];

export default function CalmCompanion({ onBack }) {
  const { user } = useAuth();
  const [mode, setMode] = useState("anxiety");
  const [length, setLength] = useState("short"); // "short" | "medium" | "long"
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [scriptText, setScriptText] = useState("");

  async function startSession() {
    if (!user) {
      alert("Sign in to use Calm Companion.");
      return;
    }

    setLoading(true);
    setAudioUrl(null);
    setScriptText("");

    try {
      const res = await fetch("/api/calm-companion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, length }),
      });

      if (!res.ok) {
        throw new Error("Bad response from server");
      }

      const data = await res.json();

      // text script (for accessibility / fallback)
      const script = data.text || data.reply || "";
      if (script) setScriptText(script);

      // optional audio
      if (data.audio_base64) {
        const byteCharacters = atob(data.audio_base64);
        const byteNumbers = new Array(byteCharacters.length)
          .fill(0)
          .map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      }
    } catch (e) {
      console.error(e);
      alert("Could not start Calm Companion right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 min-h-[calc(100vh-56px)]">
      <section className="max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80">
              EMOTI · Calm Companion
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold">
              Soft voice support for heavy moments
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
              Choose a calm mode and EMOTI will speak slowly, guiding you
              through grounding, affirmations, or a short sleep story.
            </p>
          </div>
          <button
            onClick={onBack}
            className="text-xs px-3 py-1.5 rounded-full border border-slate-700 hover:border-emerald-300 hover:text-emerald-200"
          >
            ← Back to dashboard
          </button>
        </div>

        {/* Mode + length selection */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
            <h2 className="text-sm font-semibold mb-1">Choose a Calm mode</h2>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border transition ${
                    mode === m.id
                      ? "border-emerald-300 bg-emerald-400/10 text-emerald-100"
                      : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-[11px] text-slate-400 mb-1">Length</p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {["short", "medium", "long"].map((len) => (
                  <button
                    key={len}
                    onClick={() => setLength(len)}
                    className={`px-3 py-1.5 rounded-full border ${
                      length === len
                        ? "border-sky-300 bg-sky-400/10 text-sky-100"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {len === "short" && "Quick (3–5 min)"}
                    {len === "medium" && "Standard (7–10 min)"}
                    {len === "long" && "Deep (12–15 min)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={startSession}
                disabled={loading}
                className="px-5 py-2 rounded-full bg-emerald-400 text-slate-950 text-sm font-semibold hover:bg-emerald-300 disabled:opacity-60"
              >
                {loading ? "Preparing your calm session…" : "Start calm session"}
              </button>
            </div>
          </div>

          {/* Simple player + text preview */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col gap-3 text-xs">
            <p className="text-[11px] text-slate-400">Now playing</p>
            <p className="font-semibold text-slate-100">
              {audioUrl ? MODES.find((m) => m.id === mode)?.label : "—"}
            </p>

            {audioUrl ? (
              <audio controls autoPlay className="w-full mt-1">
                <source src={audioUrl} type="audio/mpeg" />
              </audio>
            ) : (
              <p className="text-[11px] text-slate-500">
                Start a session to hear EMOTI’s calm voice.
              </p>
            )}

            {scriptText && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-slate-800 rounded-xl px-3 py-2 bg-slate-950/70 text-[11px] text-slate-300">
                {scriptText}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
