// src/components/CalmCompanion.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";

const MODES = [
  { id: "anxiety", label: "Anxiety reset", emoji: "🌊" },
  { id: "grounding", label: "Grounding exercise", emoji: "🌱" },
  { id: "affirmations", label: "Affirmations", emoji: "💙" },
  { id: "sleep_story", label: "Sleep story", emoji: "🌙" },
];

const MODE_DESCRIPTIONS = {
  anxiety:
    "A short, gentle script to lower anxiety with breathing + grounding cues.",
  grounding:
    "A 5-4-3-2-1 style grounding exercise to bring you back to the present moment.",
  affirmations:
    "Soft, repeated affirmations to remind you you’re safe, enough, and not alone.",
  sleep_story:
    "A slow, cosy sleep story to help your mind drift away from looping thoughts.",
};

export default function CalmCompanion({ onBack }) {
  const { user } = useAuth();
  const [mode, setMode] = useState("anxiety");
  const [length, setLength] = useState("short"); // "short" | "medium" | "long"
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [scriptText, setScriptText] = useState("");
  const [error, setError] = useState("");

  async function startSession() {
    if (!user) {
      setError("Please sign in to use Calm Companion with your premium space.");
      return;
    }

    setLoading(true);
    setAudioUrl(null);
    setScriptText("");
    setError("");

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

      const script = data.text || data.reply || "";
      if (script) setScriptText(script);

      // Optional audio from backend (if you add TTS later)
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
      setError(
        "I couldn’t start a calm session just now. Your internet or EMOTI’s server may be busy. You can try again in a minute."
      );
    } finally {
      setLoading(false);
    }
  }

  const currentDescription = MODE_DESCRIPTIONS[mode];

  return (
    <main className="bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 min-h-[calc(100vh-56px)] text-slate-50">
      <section className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80">
              EMOTI · Calm Companion
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold mt-1">
              Soft voice support for heavy moments
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-2 max-w-xl">
              Choose a calm mode and EMOTI will guide you slowly through
              grounding, affirmations, or a short sleep story. Designed as a
              gentle add-on to your premium chats.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-emerald-300/60 bg-emerald-400/10 text-[11px] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Premium calm mode
            </div>
            <button
              onClick={onBack}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-700 hover:border-emerald-300 hover:text-emerald-200"
            >
              ← Back to dashboard
            </button>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 items-start">
          {/* LEFT: MODE + LENGTH + CTA */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 space-y-4 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Choose a Calm mode</h2>
              <span className="text-[11px] text-slate-500">
                Pick what you need most right now.
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              {MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border transition ${
                      active
                        ? "border-emerald-300 bg-emerald-400/10 text-emerald-100 shadow-sm shadow-emerald-500/40"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mode explanation */}
            <div className="mt-2 rounded-2xl bg-slate-950/80 border border-slate-800 px-3 py-2 text-[11px] text-slate-300">
              {currentDescription}
            </div>

            {/* Length selector */}
            <div className="pt-3 border-t border-slate-800 mt-3">
              <p className="text-[11px] text-slate-400 mb-2">Length</p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {["short", "medium", "long"].map((len) => {
                  const active = length === len;
                  return (
                    <button
                      key={len}
                      onClick={() => setLength(len)}
                      className={`px-3 py-1.5 rounded-full border transition ${
                        active
                          ? "border-sky-300 bg-sky-400/10 text-sky-100"
                          : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {len === "short" && "Quick (3–5 min)"}
                      {len === "medium" && "Standard (7–10 min)"}
                      {len === "long" && "Deep (12–15 min)"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA + inline error */}
            <div className="pt-3 flex flex-col gap-3">
              <button
                onClick={startSession}
                disabled={loading}
                className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-emerald-400 text-slate-950 text-sm font-semibold hover:bg-emerald-300 disabled:opacity-60"
              >
                {loading ? "Preparing your calm session…" : "Start calm session"}
              </button>

              {error && (
                <div className="rounded-2xl bg-rose-900/40 border border-rose-500/60 px-3 py-2 text-[11px] text-rose-100">
                  {error}
                </div>
              )}

              <p className="text-[10px] text-slate-500">
                This feature is not a substitute for professional help. If
                you&apos;re in crisis, please reach out to local helplines or a
                trusted person immediately.
              </p>
            </div>
          </div>

          {/* RIGHT: PLAYER + SCRIPT */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 space-y-3 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/80">
                  Now playing
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  {audioUrl || scriptText
                    ? MODES.find((m) => m.id === mode)?.label
                    : "—"}
                </p>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {loading ? "Preparing session…" : "Tap play & close your eyes."}
              </div>
            </div>

            {/* Audio / visual loader */}
            {audioUrl ? (
              <audio controls autoPlay className="w-full mt-1">
                <source src={audioUrl} type="audio/mpeg" />
              </audio>
            ) : (
              <div className="mt-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-4 flex flex-col gap-3">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
                  Voice preview
                </div>
                <div className="flex items-end gap-1 h-10">
                  <span className="flex-1 h-6 rounded-full bg-slate-800/80" />
                  <span className="flex-1 h-8 rounded-full bg-slate-800/80" />
                  <span className="flex-1 h-5 rounded-full bg-slate-800/80" />
                  <span className="flex-1 h-9 rounded-full bg-slate-800/80" />
                  <span className="flex-1 h-7 rounded-full bg-slate-800/80" />
                </div>
                <p className="text-[11px] text-slate-500">
                  When audio is enabled on your account, Calm Companion will
                  play here. For now, you can read the script below slowly like
                  a guided meditation.
                </p>
              </div>
            )}

            {/* Script text */}
            <div className="mt-3">
              <p className="text-[11px] text-slate-400 mb-1">
                Script (you can read this even without audio)
              </p>
              <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-2xl px-3 py-2 bg-slate-950/70 text-[11px] text-slate-200 whitespace-pre-wrap">
                {scriptText
                  ? scriptText
                  : "When you start a calm session, the full script will appear here so you can read along or revisit it later."}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
