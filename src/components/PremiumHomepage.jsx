// src/components/PremiumHomepage.jsx
import React from "react";

export default function PremiumHomepage({ onOpenPremiumChat, user }) {
  const firstName =
    user?.displayName?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Friend";

  return (
    <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 min-h-screen pb-20">

      {/* -------- PREMIUM BANNER -------- */}
      <section className="relative border-b border-amber-400/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 blur-3xl opacity-50" />

        <div className="relative max-w-6xl mx-auto px-5 py-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/40 px-3 py-1 text-[11px] text-amber-200 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Premium Dashboard
          </div>

          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Welcome back,
            <span className="text-amber-300"> {firstName}</span> ✨
          </h1>

          <p className="mt-3 text-slate-300 max-w-xl text-sm md:text-base">
            You’re a Premium EMOTI member — enjoy deeper emotional insights,
            visual reflections, and priority AI responses designed just for you.
          </p>

          {/* Go to Premium Chat */}
          <button
            onClick={onOpenPremiumChat}
            className="mt-6 px-6 py-3 rounded-full bg-amber-400/90 hover:bg-amber-300 text-slate-900 shadow-lg font-semibold text-sm md:text-base transition"
          >
            Continue chatting
          </button>
        </div>
      </section>

      {/* -------- PREMIUM QUICK ACTIONS -------- */}
<section className="max-w-6xl mx-auto px-5 pt-10 grid md:grid-cols-4 gap-4">

  {/* Premium Chat */}
  <button
    onClick={onOpenPremiumChat}
    className="group rounded-2xl bg-gradient-to-br from-amber-400/15 via-amber-300/10 to-amber-500/10 
               border border-amber-300/40 px-4 py-4 shadow-lg text-left 
               hover:border-amber-300 hover:bg-amber-400/20 transition-all duration-300"
  >
    <p className="font-semibold text-amber-200 text-sm flex items-center gap-1">
      Premium Chat
      <span className="opacity-0 group-hover:opacity-100 transition-all">→</span>
    </p>
    <p className="text-[11px] text-slate-400">Go to your priority room</p>
  </button>

  {/* Mood Dashboard */}
  <div
    onClick={onOpenMoodDashboard}
    className="cursor-pointer rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-4 text-left 
               hover:border-amber-300/50 hover:bg-slate-900/90 transition-all duration-300 group"
  >
    <p className="font-semibold text-amber-200 text-sm flex items-center gap-1">
      Mood Dashboard
      <span className="opacity-0 group-hover:opacity-100 transition-all">→</span>
    </p>
    <p className="text-[11px] text-slate-400">Track weekly feelings</p>
  </div>

  {/* AI Emotion Images */}
  <div
    onClick={onOpenEmotionImages}
    className="cursor-pointer rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-4 text-left 
               hover:border-amber-300/50 hover:bg-slate-900/90 transition-all duration-300 group"
  >
    <p className="font-semibold text-amber-200 text-sm flex items-center gap-1">
      AI Emotion Images
      <span className="opacity-0 group-hover:opacity-100 transition-all">→</span>
    </p>
    <p className="text-[11px] text-slate-400">View mood reflections</p>
  </div>

  {/* Previous Chats */}
  <div
    onClick={onOpenPreviousChats}
    className="cursor-pointer rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-4 text-left 
               hover:border-amber-300/50 hover:bg-slate-900/90 transition-all duration-300 group"
  >
    <p className="font-semibold text-amber-200 text-sm flex items-center gap-1">
      Previous Chats
      <span className="opacity-0 group-hover:opacity-100 transition-all">→</span>
    </p>
    <p className="text-[11px] text-slate-400">Open saved sessions</p>
  </div>
</section>


      {/* -------- MOOD TREND -------- */}
      <section className="max-w-6xl mx-auto px-5 py-10 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-2xl bg-slate-900/70 border border-slate-800 p-5 shadow-xl">
          <h3 className="text-lg font-semibold mb-1">This week&apos;s mood trend</h3>
          <p className="text-sm text-slate-400 mb-4">
            EMOTI tracks your emotional patterns to help you understand yourself better.
          </p>
          <div className="h-44 rounded-xl bg-slate-800/50 border border-slate-700 flex flex-col items-center justify-center text-slate-500 text-xs">
            <span>(Graph comes here)</span>
            <span className="mt-1 text-[10px] text-slate-500">
              Will be auto-generated from your chat sessions.
            </span>
          </div>
        </div>

        {/* AI Reflection Images */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 shadow-xl">
          <h3 className="text-lg font-semibold mb-2">AI emotion images</h3>
          <p className="text-sm text-slate-400 mb-3">
            Visual reflections of your feelings based on recent chats.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-800/60 h-24 border border-slate-700 flex items-center justify-center text-[11px] text-slate-500">
              (Image 1)
            </div>
            <div className="rounded-xl bg-slate-800/60 h-24 border border-slate-700 flex items-center justify-center text-[11px] text-slate-500">
              (Image 2)
            </div>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            Generated from your emotional tone.
          </p>
        </div>
      </section>

      {/* -------- PREMIUM FEATURES LIST -------- */}
      <section className="max-w-6xl mx-auto px-5 py-10">
        <h2 className="text-xl font-semibold mb-4">Your premium tools</h2>

        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
            <h4 className="font-medium mb-1">🧠 Deep emotional analysis</h4>
            <p className="text-slate-400">
              Understand layered emotions behind your words across multiple chats.
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
            <h4 className="font-medium mb-1">🎨 AI mood images</h4>
            <p className="text-slate-400">
              Get visual forms of what you&apos;re feeling, to use in journaling or reflection.
            </p>
          </div>
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
            <h4 className="font-medium mb-1">📔 Private mood tracker</h4>
            <p className="text-slate-400">
              Your personal mental health diary summarising highs, lows, and emotional patterns.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
