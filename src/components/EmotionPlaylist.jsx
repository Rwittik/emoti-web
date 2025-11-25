// READY-TO-USE UPDATED FILE
// src/components/EmotionPlaylist.jsx

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

const MOOD_OPTIONS = [
  { id: "chill", label: "Chill", emoji: "🧊" },
  { id: "sad", label: "Sad but comforting", emoji: "💙" },
  { id: "focus", label: "Focus mood", emoji: "🎧" },
  { id: "uplifting", label: "Uplifting", emoji: "✨" },
];

// In-app soundscapes (no Spotify needed)
const MOOD_SOUNDS = {
  chill: "/sounds/lofi1.mp3",
  sad: "/sounds/rain.mp3",
  focus: "/sounds/focus.mp3",
  uplifting: "/sounds/uplift.mp3",
};

// Micro tasks per mood (gamification)
const MOOD_TASKS = {
  chill: "Take a deep slow breath for 5 seconds.",
  sad: "Write 1 comforting sentence for yourself.",
  focus: "Close your eyes for 10 seconds and reset.",
  uplifting: "Smile gently for 3 seconds — you deserve light.",
};

const BADGES = {
  chill: "❄️ Chill Explorer",
  sad: "💧 Comfort Seeker",
  focus: "🎯 Focus Player",
  uplifting: "🌞 Mood Lifter",
};

export default function EmotionPlaylist({ onBack }) {
  const { user } = useAuth();

  // UI + mood states
  const [selectedMood, setSelectedMood] = useState("chill");

  // Gamification states
  const [xp, setXp] = useState(0);
  const [badge, setBadge] = useState("");
  const [taskDone, setTaskDone] = useState(false);
  const audioRef = useRef(null);

  // XP system
  const awardXP = (amount) => {
    setXp((prev) => {
      const newXP = prev + amount;
      const earnedBadge = newXP >= 30 ? BADGES[selectedMood] : "";
      if (earnedBadge) setBadge(earnedBadge);
      return newXP;
    });
  };

  // Play mood soundscape
  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    audioRef.current = new Audio(MOOD_SOUNDS[selectedMood]);
    audioRef.current.play();
    awardXP(5); // user listened
  };

  // Complete micro-task
  const completeTask = () => {
    setTaskDone(true);
    awardXP(10);
  };

  // Refresh mood
  useEffect(() => {
    setTaskDone(false);
    setBadge("");
  }, [selectedMood]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pb-16">
      <div className="max-w-5xl mx-auto px-4 pt-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">
              EMOTI · Mood soundscapes
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Feel-based soundscapes & mood XP
            </h1>
            <p className="mt-1 text-xs text-slate-400 max-w-lg">
              Instead of redirecting to music apps, EMOTI now gives you
              in-app emotional soundscapes, micro-tasks, and a mood XP system.
            </p>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="px-3 py-2 rounded-full border border-slate-700 text-xs text-slate-200 hover:border-amber-300"
            >
              ← Back
            </button>
          )}
        </div>

        {/* Mood selection */}
        <section className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 mb-4">
          <h2 className="text-sm font-semibold mb-3">
            Select your current mood
          </h2>

          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMood(m.id)}
                className={`px-3 py-2 rounded-full border flex items-center gap-2 text-xs transition ${
                  selectedMood === m.id
                    ? "bg-amber-400 text-slate-900 border-amber-300"
                    : "bg-slate-950 text-slate-200 border-slate-700 hover:border-amber-300/70"
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Soundscape + tasks */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 mb-10 flex flex-col gap-5">

          {/* Mood soundscape box */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-5">
            <h3 className="text-sm font-semibold mb-2">Soundscape</h3>

            <p className="text-xs text-slate-400 mb-3">
              A short audio designed to match your emotional state.
            </p>

            <button
              onClick={playSound}
              className="px-4 py-2 rounded-full bg-emerald-400 text-slate-900 text-sm font-medium hover:bg-emerald-300"
            >
              ▶ Play {selectedMood} soundscape
            </button>
          </div>

          {/* Micro task */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-5">
            <h3 className="text-sm font-semibold mb-2">Micro Action</h3>

            <p className="text-xs text-slate-300 mb-3">
              {MOOD_TASKS[selectedMood]}
            </p>

            <button
              onClick={completeTask}
              disabled={taskDone}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                taskDone
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-sky-400 text-slate-900 hover:bg-sky-300"
              }`}
            >
              {taskDone ? "Completed ✓" : "Complete task (+10 XP)"}
            </button>
          </div>

          {/* XP + badge box */}
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-5">
            <h3 className="text-sm font-semibold mb-2">Your Mood XP</h3>

            <div className="w-full h-3 bg-slate-800 rounded-full mt-2">
              <div
                className="h-3 bg-amber-400 rounded-full transition-all"
                style={{ width: `${Math.min(xp, 100)}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              XP: <span className="text-amber-200">{xp}</span> / 30
            </p>

            {badge && (
              <p className="mt-2 text-sm text-emerald-300 font-medium">
                🎉 Badge unlocked: {badge}
              </p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
