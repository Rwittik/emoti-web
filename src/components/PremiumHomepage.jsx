// src/components/PremiumHomepage.jsx
import React from "react";

// helper copied from MoodDashboard for consistent colors
function moodColor(mood) {
  switch (mood) {
    case "high":
      return "bg-emerald-400";
    case "okay":
      return "bg-sky-400";
    case "low":
    default:
      return "bg-rose-400";
  }
}

// preview data aligned with MoodDashboard "This week"
const MOOD_PREVIEW_DAYS = [
  { id: "mon", label: "Mon", mood: "low", score: 2 },
  { id: "tue", label: "Tue", mood: "okay", score: 3 },
  { id: "wed", label: "Wed", mood: "high", score: 4 },
  { id: "thu", label: "Thu", mood: "low", score: 2 },
  { id: "fri", label: "Fri", mood: "okay", score: 3 },
  { id: "sat", label: "Sat", mood: "high", score: 5 },
  { id: "sun", label: "Sun", mood: "okay", score: 3 },
];

export default function PremiumHomepage({
  onOpenPremiumChat = () => {},
  onOpenMoodDashboard = () => {},
  onOpenEmotionImages = () => {},
  onOpenEmotionPlaylist = () => {},    // 🔸 Emotion playlist opener
  onOpenJournal = () => {},            // 🔸 Emotional journal opener
  onOpenCalmCompanion = () => {},      // 🔸 Calm Companion opener
  user,
}) {
  const firstName =
    user?.displayName?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Friend";

  return (
    <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 min-h-screen pb-20">
      {/* -------- PREMIUM BANNER -------- */}
      <section className="relative border-b border-amber-400/20 overflow-hidden">
        {/* soft background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(14,165,233,0.16),_transparent_60%)]" />

        <div className="relative max-w-6xl mx-auto px-5 py-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/40 px-3 py-1 text-[11px] text-amber-200 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Premium Dashboard
            <span className="h-1 w-px bg-amber-400/40 mx-1" />
            <span className="text-[10px] text-amber-100/80">
              Private to you · Night-safe space
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
                Welcome back,
                <span className="text-amber-300"> {firstName}</span> ✨
              </h1>

              <p className="mt-3 text-slate-300 max-w-xl text-sm md:text-base">
                You’re a Premium EMOTI member — enjoy deeper emotional insights,
                visual reflections, mood-based music, and priority AI responses
                designed just for you.
              </p>

              {/* Go to Premium Chat */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  onClick={onOpenPremiumChat}
                  className="px-6 py-3 rounded-full bg-amber-400/90 hover:bg-amber-300 text-slate-900 shadow-lg shadow-amber-500/40 font-semibold text-sm md:text-base transition"
                >
                  Continue chatting
                </button>
                <button
                  onClick={onOpenEmotionPlaylist}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-300/60 text-amber-100 text-xs md:text-sm bg-slate-950/60 hover:bg-amber-400/10 transition"
                >
                  🎧 Open emotion playlist
                </button>
              </div>
            </div>

            {/* tiny “at a glance” stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-2xl bg-slate-950/70 border border-amber-300/30 px-3 py-3 shadow-md shadow-amber-500/20">
                <p className="text-[10px] text-amber-200/80 uppercase tracking-[0.16em] mb-1">
                  This week
                </p>
                <p className="text-lg font-semibold">5 chats</p>
                <p className="text-[11px] text-slate-400">
                  You’ve checked in on{" "}
                  <span className="text-sky-300 font-medium">most days</span>.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/70 border border-sky-400/40 px-3 py-3">
                <p className="text-[10px] text-sky-300/90 uppercase tracking-[0.16em] mb-1">
                  Current mood
                </p>
                <p className="text-lg font-semibold text-sky-200">Okay</p>
                <p className="text-[11px] text-slate-400">
                  Slightly heavy, but you&apos;re still moving.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/70 border border-emerald-400/40 px-3 py-3">
                <p className="text-[10px] text-emerald-300/90 uppercase tracking-[0.16em] mb-1">
                  Night streak
                </p>
                <p className="text-lg font-semibold text-emerald-200">
                  3 nights
                </p>
                <p className="text-[11px] text-slate-400">
                  Consistency helps EMOTI learn your patterns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------- PREMIUM QUICK ACTIONS -------- */}
      <section className="max-w-6xl mx-auto px-5 pt-10 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Premium Chat */}
        <button
          onClick={onOpenPremiumChat}
          className="group relative rounded-2xl bg-slate-950/80 border border-amber-300/40 px-4 py-4 text-left shadow-lg shadow-black/40 overflow-hidden"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-br from-amber-400/30 via-amber-500/10 to-rose-500/10 opacity-0 group-hover:opacity-100 blur-xl transition" />
          <div className="relative">
            <p className="font-semibold text-amber-200 text-sm flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20 text-[11px]">
                ⭐
              </span>
              Premium chat
              <span className="opacity-0 group-hover:opacity-100 transition-all">
                →
              </span>
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Go to your priority room with faster, deeper responses.
            </p>
          </div>
        </button>

        {/* Mood Dashboard */}
        <div
          onClick={onOpenMoodDashboard}
          className="cursor-pointer group rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-4 text-left hover:border-sky-300/60 hover:bg-slate-900/90 transition-all duration-300"
        >
          <p className="font-semibold text-sky-200 text-sm flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-400/15 text-[11px]">
              📊
            </span>
            Mood dashboard
            <span className="opacity-0 group-hover:opacity-100 transition-all">
              →
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            See weekly highs & lows, patterns, and your emotional timeline.
          </p>
        </div>

        {/* AI Emotion Images */}
        <div
          onClick={onOpenEmotionImages}
          className="cursor-pointer group rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-4 text-left hover:border-violet-300/60 hover:bg-slate-900/90 transition-all duration-300"
        >
          <p className="font-semibold text-violet-200 text-sm flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-400/15 text-[11px]">
              🎨
            </span>
            AI emotion images
            <span className="opacity-0 group-hover:opacity-100 transition-all">
              →
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            View abstract visuals of how your recent chats feel.
          </p>
        </div>

        {/* Emotion Playlist – premium music space */}
        <div
          onClick={onOpenEmotionPlaylist}
          className="cursor-pointer group rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-4 text-left hover:border-emerald-300/60 hover:bg-slate-900/90 transition-all duration-300"
        >
          <p className="font-semibold text-emerald-200 text-sm flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15 text-[11px]">
              🎧
            </span>
            Emotion playlist
            <span className="opacity-0 group-hover:opacity-100 transition-all">
              →
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Mood-based music in your language to wind down after chats.
          </p>
        </div>

        {/* Emotional Journal */}
        <div
          onClick={onOpenJournal}
          className="cursor-pointer group rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-4 text-left hover:border-pink-300/60 hover:bg-slate-900/90 transition-all duration-300"
        >
          <p className="font-semibold text-pink-200 text-sm flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-pink-400/15 text-[11px]">
              📔
            </span>
            Emotional journal
            <span className="opacity-0 group-hover:opacity-100 transition-all">
              →
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Write freely and let EMOTI reflect your feelings back to you.
          </p>
        </div>

        {/* Calm Companion */}
        <div
          onClick={onOpenCalmCompanion}
          className="cursor-pointer group rounded-2xl bg-slate-900/80 border border-emerald-400/60 px-4 py-4 text-left hover:border-emerald-300 hover:bg-slate-900/95 transition-all duration-300"
        >
          <p className="font-semibold text-emerald-200 text-sm flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-[11px]">
              🌙
            </span>
            Calm Companion
            <span className="opacity-0 group-hover:opacity-100 transition-all">
              →
            </span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Guided breathing, grounding, affirmations, and soft sleep stories.
          </p>
        </div>
      </section>

      {/* -------- MOOD TREND + RIGHT COLUMN -------- */}
      <section className="max-w-6xl mx-auto px-5 py-10 grid lg:grid-cols-3 gap-6 items-start">
        {/* This week's mood trend preview */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl shadow-black/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold">
              This week&apos;s mood trend
            </h3>
            <span className="text-[11px] px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              Preview · tap mood dashboard for full view
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            EMOTI tracks your emotional patterns to help you understand yourself
            better over time.
          </p>

          <div className="h-44 rounded-xl bg-slate-900/80 border border-slate-700 px-4 py-3 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] text-slate-500 mb-2">
              <span>Heavier days</span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> low
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" /> okay
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> high
                </span>
              </div>
              <span>Lighter days</span>
            </div>

            {/* mini bar graph similar to MoodDashboard */}
            <div className="flex-1 flex items-end gap-3">
              {MOOD_PREVIEW_DAYS.map((day) => {
                const height = (day.score / 5) * 100;
                return (
                  <div
                    key={day.id}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-full max-w-[18px] rounded-full ${moodColor(
                        day.mood
                      )} shadow-sm shadow-slate-900`}
                      style={{ height: `${Math.max(height, 14)}%` }}
                    />
                    <span className="text-[10px] text-slate-400">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="mt-2 text-[10px] text-slate-500 text-center">
              This is a soft preview of your week. Open the Mood Dashboard for
              deeper insights, journaling prompts, and patterns over time.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: AI images + playlist + Calm Companion preview */}
        <div className="space-y-4">
          {/* AI Reflection Images */}
          <div
            onClick={onOpenEmotionImages}
            className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl cursor-pointer hover:border-violet-300/70 hover:bg-slate-900 transition-all duration-300"
            role="button"
          >
            <h3 className="text-lg font-semibold mb-2">AI emotion images</h3>
            <p className="text-sm text-slate-400 mb-3">
              Visual reflections of your feelings based on recent chats.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Preview tile 1 – latest image */}
              <div className="relative rounded-xl h-24 border border-slate-700 overflow-hidden bg-slate-800/60 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/40 via-violet-500/30 to-slate-900 opacity-90" />
                <span className="relative text-[11px] text-slate-100 font-medium">
                  Latest reflection
                </span>
              </div>

              {/* Preview tile 2 – previous image */}
              <div className="relative rounded-xl h-24 border border-slate-700 overflow-hidden bg-slate-800/60 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/35 via-teal-400/25 to-slate-900 opacity-80" />
                <span className="relative text-[11px] text-slate-100 font-medium">
                  Previous reflection
                </span>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-500">
              Generated softly from your emotional tone — never shown to anyone
              else.
            </p>
            <p className="mt-1 text-[10px] text-amber-200">
              Click to open your full AI Emotion Images gallery.
            </p>
          </div>

          {/* Mini Emotion Playlist teaser */}
          <div
            onClick={onOpenEmotionPlaylist}
            className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-emerald-300/40 p-4 shadow-lg shadow-emerald-500/25 cursor-pointer hover:border-emerald-200 hover:shadow-emerald-400/30 transition-all duration-300"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                  Emotion playlist
                </p>
                <h4 className="text-sm font-semibold text-slate-50">
                  Tonight&apos;s suggested mood mix
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Based on your recent check-ins:{" "}
                  <span className="text-emerald-200 font-medium">
                    chill · a bit heavy · hopeful
                  </span>
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-400 flex items-center justify-center text-slate-950 text-lg shadow-md shadow-emerald-500/40">
                ▶
              </div>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] text-slate-200 mb-2">
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">
                Chill · late night
              </span>
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">
                Sad but comforting
              </span>
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">
                Focus & study
              </span>
            </div>

            <p className="text-[10px] text-slate-500">
              Tap to pick your language & platform (Spotify / YouTube, etc.).
            </p>
          </div>

          {/* Calm Companion preview */}
          <div
            onClick={onOpenCalmCompanion}
            className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-400/60 p-4 shadow-lg shadow-emerald-500/30 cursor-pointer hover:border-emerald-300 hover:bg-slate-900/95 transition-all duration-300"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                  Calm Companion
                </p>
                <h4 className="text-sm font-semibold text-slate-50">
                  Soft voice support for heavy nights
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Guided breathing, gentle affirmations, grounding exercises,
                  and cozy sleep stories in a slow, soothing tone.
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-400 flex items-center justify-center text-slate-950 text-lg shadow-md shadow-emerald-500/50">
                🌙
              </div>
            </div>

            <div className="flex flex-wrap gap-1 text-[10px] text-slate-200">
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">
                Anxiety reset
              </span>
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">
                Grounding exercise
              </span>
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">
                Affirmations
              </span>
              <span className="px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700">
                Sleep story
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* -------- PREMIUM FEATURES LIST -------- */}
      <section className="max-w-6xl mx-auto px-5 py-10">
        <h2 className="text-xl font-semibold mb-4">Your premium tools</h2>

        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 p-4 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-sky-500/10 blur-2xl" />
            <h4 className="font-medium mb-1">🧠 Deep emotional analysis</h4>
            <p className="text-slate-400 relative">
              Understand layered emotions behind your words across multiple
              chats, not just one conversation.
            </p>
          </div>
          <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 p-4 overflow-hidden">
            <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-violet-500/10 blur-2xl" />
            <h4 className="font-medium mb-1">🎨 AI mood images</h4>
            <p className="text-slate-400 relative">
              Get visual forms of what you&apos;re feeling, perfect for
              journaling, lock screens, or quiet reflection.
            </p>
          </div>
          <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 p-4 overflow-hidden">
            <div className="absolute -top-12 right-0 w-20 h-20 rounded-full bg-emerald-500/10 blur-2xl" />
            <h4 className="font-medium mb-1">📔 Private mood tracker</h4>
            <p className="text-slate-400 relative">
              A personal emotional diary summarising highs, lows, and patterns
              over weeks — only visible to you.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
