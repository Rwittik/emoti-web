// src/components/EmotionPlaylist.jsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";

/*
  Premium, gamified EmotionPlaylist with:
   - In-app multi-track player (play/pause/next/prev/progress)
   - Daily streaks & daily check-in / daily free soundscape usage
   - Mood XP + badges + level unlocks
   - Animated EMOTI character (uses uploaded file path)
   - Micro-task completion award
   - Local persistence via localStorage per user (or public fallback)
*/

/* ---------- Config ---------- */
const MOOD_OPTIONS = [
  { id: "chill", label: "Chill", emoji: "🧊" },
  { id: "sad", label: "Sad but comforting", emoji: "💙" },
  { id: "focus", label: "Focus", emoji: "🎧" },
  { id: "uplifting", label: "Uplifting", emoji: "✨" },
];

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

// Use the image the user uploaded (developer: local path from conversation)
const EMOTI_SPRITE_URL = "/mnt/data/043c5785-eca7-46e5-88e5-6d0cdcddbd69.png";

/* Placeholder tracks — replace with your hosted audio files or CDN links */
const SAMPLE_TRACKS = [
  { id: "t1", title: "Late night lofi", src: "/sounds/track1.mp3", lengthText: "12:34" },
  { id: "t2", title: "Soft rain loop", src: "/sounds/track2.mp3", lengthText: "08:20" },
  { id: "t3", title: "Focus beat", src: "/sounds/track3.mp3", lengthText: "15:12" },
];

/* ---------- Utilities ---------- */
function getStorageKey(key, uid) {
  const id = uid ? uid : "public";
  return `emoti_${id}_${key}`;
}
function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/* ---------- Component ---------- */
export default function EmotionPlaylist({ onBack }) {
  const { user } = useAuth();
  const uid = user?.uid || null;
  const isPremium = !!user?.isPremium; // set by your auth backend
  const [selectedMood, setSelectedMood] = useState("chill");

  // Gamification + streaks
  const [xp, setXp] = useState(0);
  const [badge, setBadge] = useState("");
  const [lastCheckin, setLastCheckin] = useState(null); // ISO date
  const [streak, setStreak] = useState(0);
  const [dailyUses, setDailyUses] = useState(0); // free users limit per day
  const DAILY_FREE_LIMIT = 1; // free users can play one soundscape per day

  // Task completion
  const [taskDone, setTaskDone] = useState(false);

  // Player
  const [queue, setQueue] = useState(SAMPLE_TRACKS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0-1
  const audioRef = useRef(null);
  const progressRef = useRef(null);

  // Animated character state
  const [characterMood, setCharacterMood] = useState(selectedMood);
  const [characterBounce, setCharacterBounce] = useState(false);

  // Derived
  const currentTrack = queue[currentIndex];

  /* ---------- Persistence ---------- */
  useEffect(() => {
    // load persisted gamification state
    const xpKey = getStorageKey("xp", uid);
    const badgeKey = getStorageKey("badge", uid);
    const streakKey = getStorageKey("streak", uid);
    const lastKey = getStorageKey("lastCheckin", uid);
    const usesKey = getStorageKey("dailyUses", uid);

    try {
      const storedXp = parseInt(localStorage.getItem(xpKey), 10);
      if (!isNaN(storedXp)) setXp(storedXp);
      const storedBadge = localStorage.getItem(badgeKey);
      if (storedBadge) setBadge(storedBadge);
      const storedStreak = parseInt(localStorage.getItem(streakKey), 10);
      if (!isNaN(storedStreak)) setStreak(storedStreak);
      const storedLast = localStorage.getItem(lastKey);
      if (storedLast) setLastCheckin(storedLast);
      const storedUses = parseInt(localStorage.getItem(usesKey), 10);
      if (!isNaN(storedUses)) setDailyUses(storedUses);
    } catch (e) {
      console.error("Failed to load persistent state:", e);
    }
  }, [uid]);

  useEffect(() => {
    // persist xp & badge & streak & lastCheckin & dailyUses
    const xpKey = getStorageKey("xp", uid);
    const badgeKey = getStorageKey("badge", uid);
    const streakKey = getStorageKey("streak", uid);
    const lastKey = getStorageKey("lastCheckin", uid);
    const usesKey = getStorageKey("dailyUses", uid);

    try {
      localStorage.setItem(xpKey, String(xp));
      if (badge) localStorage.setItem(badgeKey, badge);
      localStorage.setItem(streakKey, String(streak));
      if (lastCheckin) localStorage.setItem(lastKey, lastCheckin);
      localStorage.setItem(usesKey, String(dailyUses));
    } catch (e) {
      console.error("Failed to save persistent state:", e);
    }
  }, [xp, badge, streak, lastCheckin, dailyUses, uid]);

  /* ---------- XP & Badges ---------- */
  const awardXp = (amount) => {
    setXp((prev) => {
      const next = Math.min(prev + amount, 9999);
      // unlock badge at threshold (example 30)
      if (next >= 30 && !badge) {
        const newBadge = BADGES[selectedMood] || "Mood Explorer";
        setBadge(newBadge);
      }
      return next;
    });
  };

  /* ---------- Daily check-in / streak ---------- */
  function markDailyCheckin() {
    const today = todayISO();
    if (lastCheckin === today) return false; // already checked in
    // update streak: if lastCheckin was yesterday increment, else reset to 1
    if (lastCheckin) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isoYesterday = yesterday.toISOString().slice(0, 10);
      if (lastCheckin === isoYesterday) {
        setStreak((s) => s + 1);
      } else {
        setStreak(1);
      }
    } else {
      setStreak(1);
    }
    setLastCheckin(today);
    awardXp(5); // small XP for daily checkin
    return true;
  }

  /* ---------- Player controls ---------- */
  useEffect(() => {
    // set up audio element and events
    if (!currentTrack) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(currentTrack.src);
    audioRef.current = audio;
    audio.preload = "auto";

    const onTime = () => {
      if (!audio.duration) return;
      setProgress(audio.currentTime / audio.duration);
    };
    const onEnd = () => {
      // auto-next
      handleNext();
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);

    // if playing state is true, start playing
    if (playing) {
      audio.play().catch((e) => {
        console.warn("Playback failed:", e);
        setPlaying(false);
      });
    }

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      try {
        audio.pause();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentTrack?.src]);

  useEffect(() => {
    // sync playing state with audio element
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch((e) => {
        console.warn("Playback play error", e);
        setPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [playing]);

  const handlePlayPause = () => {
    if (!currentTrack) return;
    // enforce daily limit for free users (only applies to "play soundscape" action)
    if (!isPremium && dailyUses >= DAILY_FREE_LIMIT) {
      alert(`Upgrade to Premium to play more soundscapes today. (Free limit: ${DAILY_FREE_LIMIT})`);
      return;
    }
    // Count this as a "use" for free users
    if (!isPremium) setDailyUses((d) => d + 1);
    // starting playback also counts as a small "listen" XP
    awardXp(5);
    setPlaying((p) => !p);
    // mark checkin when they interact
    markDailyCheckin();
    setCharacterBounce(true);
    setTimeout(() => setCharacterBounce(false), 700);
  };

  const handleNext = () => {
    setCurrentIndex((i) => (i + 1) % queue.length);
    setPlaying(true);
    setProgress(0);
    setCharacterMood(selectedMood);
  };

  const handlePrev = () => {
    setCurrentIndex((i) => (i - 1 + queue.length) % queue.length);
    setPlaying(true);
    setProgress(0);
  };

  const seekTo = (fraction) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    audio.currentTime = audio.duration * fraction;
    setProgress(fraction);
  };

  /* ---------- Mood selection side effects ---------- */
  useEffect(() => {
    setTaskDone(false);
    setCharacterMood(selectedMood);
    // when mood changes, small XP if user actively changes it
    awardXp(2);
  }, [selectedMood]); // eslint-disable-line

  /* ---------- Micro-task completion ---------- */
  const completeTask = () => {
    if (taskDone) return;
    setTaskDone(true);
    awardXp(10);
    // small animation
    setCharacterBounce(true);
    setTimeout(() => setCharacterBounce(false), 900);
  };

  /* ---------- Multi-track queue update (optional mood-based) ---------- */
  useEffect(() => {
    // naive mood -> queue mapping (you can replace with fetched playlists)
    const moodQueue =
      selectedMood === "chill"
        ? [
            { id: "t1", title: "Late night lofi", src: "/sounds/track1.mp3", lengthText: "12:34" },
            { id: "t2", title: "Bedroom rain", src: "/sounds/track2.mp3", lengthText: "08:20" },
          ]
        : selectedMood === "sad"
        ? [
            { id: "t2", title: "Soft rain loop", src: "/sounds/track2.mp3", lengthText: "08:20" },
            { id: "t3", title: "Warm strings", src: "/sounds/track4.mp3", lengthText: "10:00" },
          ]
        : selectedMood === "focus"
        ? [
            { id: "t3", title: "Focus beat", src: "/sounds/track3.mp3", lengthText: "15:12" },
            { id: "t1", title: "Lofi focus", src: "/sounds/track1.mp3", lengthText: "12:34" },
          ]
        : [
            { id: "t4", title: "Uplift mix", src: "/sounds/track5.mp3", lengthText: "11:14" },
            { id: "t1", title: "Bright lofi", src: "/sounds/track1.mp3", lengthText: "12:34" },
          ];

    setQueue(moodQueue);
    setCurrentIndex(0);
    setPlaying(false);
    setProgress(0);
  }, [selectedMood]);

  /* ---------- Helper: formatted level & progress ---------- */
  const level = Math.floor(xp / 10) + 1;
  const xpForNext = (level * 10) - xp;

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">
              EMOTI · Mood music & micro-care
            </p>
            <h1 className="mt-2 text-3xl font-semibold">In-app soundscapes & mood XP</h1>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Play soundscapes, complete quick micro-tasks, build daily streaks and earn Mood XP — all inside EMOTI.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <div className="text-slate-400">Level</div>
              <div className="text-lg font-semibold text-amber-300">{level}</div>
            </div>

            <div className="rounded-full w-10 h-10 bg-slate-900/70 border border-slate-800 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 font-semibold flex items-center justify-center">
                {level}
              </div>
            </div>

            {onBack && (
              <button onClick={onBack} className="px-3 py-2 rounded-full border border-slate-700 text-xs text-slate-200 hover:border-amber-300">
                ← Back
              </button>
            )}
          </div>
        </div>

        {/* Layout: left = player & character, right = mood & stats */}
        <div className="grid md:grid-cols-[1fr_360px] gap-6">

          {/* Left: Player + character + queue */}
          <div className="space-y-4">

            {/* Player card */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold">Now playing</h3>
                  <p className="text-xs text-slate-400 mt-1">{queue[currentIndex]?.title || "—"}</p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <div className="text-slate-400">XP: <span className="text-amber-200 font-semibold">{xp}</span></div>
                  {badge && <div className="text-emerald-300">{badge}</div>}
                </div>
              </div>

              {/* big controls */}
              <div className="flex items-center gap-4">
                <button onClick={handlePrev} className="p-3 rounded-full bg-slate-950/70 border border-slate-800 hover:scale-105 transition">
                  ⏮
                </button>

                <button
                  onClick={handlePlayPause}
                  className={`px-5 py-3 rounded-full font-semibold transition ${playing ? "bg-rose-400 text-slate-950" : "bg-emerald-400 text-slate-950"}`}
                >
                  {playing ? "Pause" : "Play"}
                </button>

                <button onClick={handleNext} className="p-3 rounded-full bg-slate-950/70 border border-slate-800 hover:scale-105 transition">
                  ⏭
                </button>

                <div className="ml-auto text-xs text-slate-400">
                  {queue[currentIndex]?.lengthText || ""}
                </div>
              </div>

              {/* progress bar */}
              <div className="mt-4">
                <div
                  ref={progressRef}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    seekTo(fraction);
                  }}
                  className="w-full h-2 bg-slate-800 rounded-full cursor-pointer"
                >
                  <div className="h-2 bg-amber-400 rounded-full" style={{ width: `${(progress || 0) * 100}%` }} />
                </div>
                <div className="mt-2 text-[11px] text-slate-400 flex justify-between">
                  <div>{Math.round((progress || 0) * 100)}%</div>
                  <div>Queue: {queue.length} tracks</div>
                </div>
              </div>
            </div>

            {/* Character + micro-task */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 flex gap-4 items-center">
              {/* animated character (sprite / image) */}
              <div
                className={`w-24 h-24 rounded-xl flex items-center justify-center overflow-hidden transition-transform ${characterBounce ? "scale-105" : "scale-100"}`}
                style={{
                  boxShadow: "0 6px 30px rgba(10,12,20,0.6)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                }}
              >
                <img src={EMOTI_SPRITE_URL} alt="Emoti" className="w-full h-full object-cover" />
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">EMOTI is listening</div>
                    <div className="text-xs text-slate-400">Mood: <span className="text-amber-200">{selectedMood}</span></div>
                  </div>

                  <div className="text-xs text-slate-400 text-right">
                    <div>Streak: <span className="text-emerald-300 font-medium">{streak} days</span></div>
                    <div className="mt-1">Last: <span className="text-slate-300">{lastCheckin || "—"}</span></div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-3">{MOOD_TASKS[selectedMood]}</p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={completeTask}
                    disabled={taskDone}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${taskDone ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-sky-400 text-slate-900 hover:bg-sky-300"}`}
                  >
                    {taskDone ? "Task done ✓" : "Complete micro-task (+10 XP)"}
                  </button>

                  <button
                    onClick={() => {
                      if (markDailyCheckin()) {
                        alert("Daily check-in recorded — +5 XP!");
                      } else {
                        alert("You've already checked in today. Keep your streak going!");
                      }
                    }}
                    className="px-3 py-1.5 rounded-full bg-amber-400 text-slate-900 text-sm font-medium"
                  >
                    Daily check-in
                  </button>
                </div>
              </div>
            </div>

            {/* Queue list */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
              <h4 className="text-sm font-semibold mb-3">Queue</h4>
              <div className="space-y-2 text-xs">
                {queue.map((t, i) => (
                  <div key={t.id} className={`flex items-center justify-between p-2 rounded ${i === currentIndex ? "bg-slate-800/60" : "bg-transparent"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center">🎵</div>
                      <div>
                        <div className="font-medium text-slate-100">{t.title}</div>
                        <div className="text-slate-400 text-[11px]">{t.lengthText || ""}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => { setCurrentIndex(i); setPlaying(true); }} className="px-2 py-1 rounded text-[11px] border border-slate-700">Play</button>
                      <button onClick={() => {
                        // remove from queue (premium only)
                        if (!isPremium) {
                          alert("Queue editing is a Premium feature.");
                          return;
                        }
                        setQueue((q) => q.filter((_t, idx) => idx !== i));
                        if (i <= currentIndex && currentIndex > 0) setCurrentIndex((ci) => Math.max(0, ci - 1));
                      }} className="px-2 py-1 rounded text-[11px] border border-rose-600 text-rose-300">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: mood select + stats */}
          <aside className="space-y-4">
            {/* Mood selector */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
              <h4 className="text-sm font-semibold mb-3">Choose mood</h4>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((m) => (
                  <button key={m.id} onClick={() => setSelectedMood(m.id)} className={`px-3 py-1.5 rounded-full text-xs border transition ${selectedMood === m.id ? "bg-amber-400/90 text-slate-900 border-amber-300" : "bg-slate-950 text-slate-200 border-slate-700 hover:border-amber-300/60"}`}>
                    <span className="mr-2">{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* XP + level */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs">
              <h4 className="text-sm font-semibold mb-2">Mood XP</h4>
              <div className="w-full h-2 bg-slate-800 rounded-full">
                <div className="h-2 bg-amber-400 rounded-full" style={{ width: `${Math.min((xp % 10) * 10, 100)}%` }} />
              </div>
              <p className="mt-2 text-slate-400">XP: <span className="text-amber-200 font-semibold">{xp}</span> · Level {level}</p>
              <p className="mt-1 text-slate-500 text-[12px]">Earn <span className="text-sky-300">{xpForNext}</span> XP to next level.</p>
              <div className="mt-3">
                <button onClick={() => { /* quick reward */ awardXp(3); }} className="px-3 py-1 rounded-full bg-sky-500 text-slate-900 text-sm">+3 XP (nudge)</button>
              </div>
            </div>

            {/* Streak & badges */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs">
              <h4 className="text-sm font-semibold mb-2">Streak & badges</h4>
              <p className="text-slate-400">Current streak: <span className="text-emerald-300 font-medium">{streak} days</span></p>
              <p className="text-slate-400 mt-1">Last check-in: <span className="text-slate-300">{lastCheckin || "—"}</span></p>
              <div className="mt-3">
                <div className="text-[13px]">{badge ? <span className="text-emerald-300">{badge}</span> : <span className="text-slate-500">No badge yet — earn XP to unlock</span>}</div>
              </div>
            </div>

            {/* Premium CTA (if not premium) */}
            {!isPremium && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs">
                <h4 className="text-sm font-semibold mb-2">Upgrade for more</h4>
                <p className="text-slate-400 mb-3">Premium unlocks multi-track queue editing, unlimited soundscapes, and exclusive badges.</p>
                <button onClick={() => alert("Open premium purchase flow (implement)")} className="px-3 py-2 rounded-full bg-amber-400 text-slate-900 font-semibold">Upgrade to Premium</button>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
