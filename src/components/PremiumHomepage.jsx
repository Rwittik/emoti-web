import React from "react";

export default function PremiumHomepage({ scrollToChat, user }) {
  return (
    <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 min-h-screen pb-20">

      {/* PREMIUM BANNER */}
      <section className="relative border-b border-amber-400/20">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 blur-3xl opacity-50" />
        
        <div className="relative max-w-6xl mx-auto px-5 py-14">
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">
            Welcome back,
            <span className="text-amber-300"> {user.displayName?.split(" ")[0] || "Friend"}</span> ✨
          </h1>
          <p className="mt-3 text-slate-300 max-w-xl">
            You’re a Premium EMOTI member — enjoy deeper emotional insights,
            visual reflections, and priority AI responses designed just for you.
          </p>

          <button
            onClick={scrollToChat}
            className="mt-6 px-6 py-3 rounded-full bg-amber-400/90 hover:bg-amber-300 text-slate-900 shadow-lg font-semibold transition"
          >
            Continue Chatting
          </button>
        </div>
      </section>

      {/* DASHBOARD Section */}
      <section className="max-w-6xl mx-auto px-5 py-10 grid md:grid-cols-3 gap-6">

        {/* Mood Graph Card */}
        <div className="col-span-2 rounded-2xl bg-slate-900/70 border border-slate-800 p-5 shadow-xl">
          <h3 className="text-lg font-semibold mb-2">This Week's Mood Trend</h3>
          <p className="text-sm text-slate-400 mb-4">
            EMOTI tracks your emotional patterns to help you understand yourself better.
          </p>
          <div className="h-40 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-500">
            (Graph comes here)
          </div>
        </div>

        {/* AI Reflection Images */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 shadow-xl">
          <h3 className="text-lg font-semibold mb-2">AI Emotion Images</h3>
          <p className="text-sm text-slate-400 mb-3">Visual reflections of your feelings.</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-800/60 h-24 border border-slate-700 flex items-center justify-center text-slate-500">
              (Image 1)
            </div>
            <div className="rounded-xl bg-slate-800/60 h-24 border border-slate-700 flex items-center justify-center text-slate-500">
              (Image 2)
            </div>
          </div>
        </div>
      </section>

      {/* PREMIUM FEATURES */}
      <section className="max-w-6xl mx-auto px-5 py-10">
        <h2 className="text-xl font-semibold mb-4">Your Premium Tools</h2>

        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
            <h4 className="font-medium mb-1">🧠 Deep Emotional Analysis</h4>
            <p className="text-slate-400">Understand layered emotions behind your words.</p>
          </div>
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
            <h4 className="font-medium mb-1">🎨 AI Mood Images</h4>
            <p className="text-slate-400">Get a visual form of what you're feeling.</p>
          </div>
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
            <h4 className="font-medium mb-1">📔 Private Mood Tracker</h4>
            <p className="text-slate-400">Your personal mental health diary.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
