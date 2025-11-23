// src/components/CalmCompanion.jsx
import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";

const MODES = [
  { id: "anxiety", label: "Anxiety reset", emoji: "🌊" },
  { id: "grounding", label: "Grounding exercise", emoji: "🌱" },
  { id: "affirmations", label: "Affirmations", emoji: "💙" },
  { id: "sleep_story", label: "Sleep story", emoji: "🌙" },
];

const LENGTH_LABEL = {
  short: "Quick (3–5 min)",
  medium: "Standard (7–10 min)",
  long: "Deep (12–15 min)",
};

export default function CalmCompanion({ onBack }) {
  const { user } = useAuth();
  const [mode, setMode] = useState("anxiety");
  const [length, setLength] = useState("short");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [scriptText, setScriptText] = useState("");
  const [error, setError] = useState("");

  async function startSession() {
    if (!user) {
      setError("Please sign in to use Calm Companion.");
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
        // backend sends a JSON error message – try to show that
        let serverMsg = "I couldn’t start a calm session just now.";
        try {
          const errJson = await res.json();
          if (errJson?.error) serverMsg = errJson.error;
        } catch (_) {
          /* ignore JSON parse errors */
        }
        throw new Error(serverMsg);
      }

      const data = await res.json();

      const script = data.text || data.reply || "";
      if (script) {
        setScriptText(script);
      } else {
        setScriptText(
          "I created a calm script for you, but something went wrong while receiving it. You can try again in a moment."
        );
      }

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
      console.error("Calm Companion error:", e);
      setError(
        e.message ||
          "I couldn’t start a calm session just now. Your internet or EMOTI’s server may be busy. You can try again in a minute."
      );
    } finally {
      setLoading(false);
    }
  }

  const activeMode = MODES.find((m) => m.id === mode);

  return (
    <main className="bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 min-h-[calc(100vh-56px)] text-slate-50">
      <section className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-6">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80">
              EMOTI · Calm Companion
            </p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold">
              Soft voice support for heavy moments
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl">
              Choose a calm mode and EMOTI will guide you through grounding,
              affirmations, or a short sleep story. You can listen or just read
              the script slowly like a meditation.
            </p>
          </div>

          <button
            onClick={onBack}
            className="self-start text-xs px-3 py-1.5 rounded-full border border-slate-700 hover:border-emerald-300 hover:text-emerald-200"
          >
            ← Back to dashboard
          </button>
        </div>

        {/* MAIN GRID */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* LEFT: MODE + LENGTH + CTA */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl shadow-black/40 space-y-4">
            {/* subtle label pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-300/40 text-[11px] text-emerald-200 mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Calm session builder
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Choose a Calm mode</h2>
              <p className="text-[11px] text-slate-400">
                Pick what you need right now. EMOTI will adapt the script to
                that tone.
              </p>

              <div className="flex flex-wrap gap-2 text-[11px] mt-1">
                {MODES.map((m) => {
                  const active = m.id === mode;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition ${
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
            </div>

            {/* DESCRIPTION OF CURRENT MODE */}
            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-[11px] text-slate-300">
              {mode === "anxiety" && (
                <p>
                  A short, gentle script to lower anxiety with breathing +
                  grounding cues.
                </p>
              )}
              {mode === "grounding" && (
                <p>
                  A step-by-step 5-4-3-2-1 grounding exercise to bring you back
                  into your body.
                </p>
              )}
              {mode === "affirmations" && (
                <p>
                  A sequence of soft affirmations you can repeat in your mind or
                  whisper quietly.
                </p>
              )}
              {mode === "sleep_story" && (
                <p>
                  A slow, dreamy narration that eases you towards sleep — like a
                  tiny bedtime story.
                </p>
              )}
            </div>

            {/* LENGTH SELECTOR */}
            <div className="space-y-2 mt-3">
              <p className="text-[11px] text-slate-400">Length</p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {["short", "medium", "long"].map((len) => {
                  const active = length === len;
                  return (
                    <button
                      key={len}
                      onClick={() => setLength(len)}
                      className={`px-3 py-1.5 rounded-full border ${
                        active
                          ? "border-sky-300 bg-sky-400/10 text-sky-100 shadow-sm shadow-sky-500/30"
                          : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      {LENGTH_LABEL[len]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA + ERROR MESSAGE */}
            <div className="mt-4 space-y-3">
              <button
                onClick={startSession}
                disabled={loading}
                className="w-full px-5 py-2.5 rounded-full bg-emerald-400 text-slate-950 text-sm font-semibold hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Preparing your calm session…" : "Start calm session"}
              </button>

              {error && (
                <div className="rounded-2xl border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
                  {error}
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-relaxed">
                This feature is not a substitute for professional help. If
                you&apos;re in crisis, please reach out to local helplines or a
                trusted person immediately.
              </p>
            </div>
          </div>

          {/* RIGHT: "VOICE" + SCRIPT PREVIEW */}
          <div className="space-y-4">
            {/* Voice preview card */}
            <div className="rounded-3xl bg-slate-900/85 border border-slate-800 p-5 shadow-xl shadow-black/40">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300/80">
                    Voice preview
                  </p>
                  <h3 className="text-sm font-semibold">
                    {audioUrl ? activeMode?.label : "No session playing"}
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{audioUrl ? "Calm session ready" : "Waiting to start"}</span>
                </div>
              </div>

              {audioUrl ? (
                <audio controls autoPlay className="w-full mt-1">
                  <source src={audioUrl} type="audio/mpeg" />
                </audio>
              ) : (
                <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
                  <div className="flex gap-1">
                    <span className="h-2.5 w-8 rounded-full bg-slate-800 animate-pulse" />
                    <span className="h-2.5 w-10 rounded-full bg-slate-800 animate-pulse [animation-delay:-0.15s]" />
                    <span className="h-2.5 w-6 rounded-full bg-slate-800 animate-pulse [animation-delay:-0.3s]" />
                  </div>
                  <span>
                    When audio is enabled on your account, Calm Companion will
                    play here. For now, you can read the script slowly like a
                    guided meditation.
                  </span>
                </div>
              )}
            </div>

            {/* Script card */}
            <div className="rounded-3xl bg-slate-900/85 border border-slate-800 p-5 shadow-xl shadow-black/40">
              <p className="text-[11px] uppercase tracking-[0.2em] text-sky-300/80 mb-2">
                Script (you can read this even without audio)
              </p>
              {scriptText ? (
                <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-2xl px-3 py-3 text-[11px] leading-relaxed text-slate-200 bg-slate-950/70 whitespace-pre-wrap">
                  {scriptText}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  When you start a calm session, the full script will appear
                  here so you can read along or revisit it later.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
