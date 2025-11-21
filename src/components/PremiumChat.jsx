// src/components/PremiumChat.jsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase"; // ⬅️ adjust path if needed

const API_URL = "/api/chat";

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// default welcome message for premium
function getInitialMessages() {
  return [
    {
      id: 1,
      from: "emoti",
      text: "Hi — I'm EMOTI Premium. What’s on your heart tonight?",
      time: Date.now(),
      emotion: "okay",
    },
  ];
}

// localStorage key helper
function getStorageKey(uid) {
  return `emoti_premium_sessions_${uid}`;
}

// localStorage key for mood events (used by MoodDashboard)
function getMoodKey(uid) {
  return `emoti_mood_events_${uid}`;
}

// ---------- small helpers for dashboard metrics ----------

function dayKeyFromTs(ts) {
  return new Date(ts).toISOString().slice(0, 10); // YYYY-MM-DD
}

function previousDayKey(key) {
  const d = new Date(key + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function emotionScore(emotion) {
  const map = {
    low: 2,
    sad: 2,
    stressed: 2,
    anxious: 2,
    okay: 3,
    mixed: 3,
    neutral: 3,
    high: 4,
    happy: 4,
    hopeful: 4,
  };
  return map[emotion] ?? 3;
}

function moodSummaryForEmotion(emotion) {
  switch (emotion) {
    case "low":
    case "sad":
      return {
        label: "Low",
        description:
          "Feeling heavier than usual. Be gentle with yourself today.",
      };
    case "high":
    case "happy":
    case "hopeful":
      return {
        label: "High",
        description:
          "Lighter, more hopeful energy. Capture this in a journal note.",
      };
    case "stressed":
    case "anxious":
      return {
        label: "Stressed",
        description:
          "Your mind is busy. Slowing down and grounding might help.",
      };
    default:
      return {
        label: "Okay",
        description: "Slightly heavy, but you're still moving.",
      };
  }
}

// compute weeklyChats, nightStreak, moodPreviewDays from all mood events
function computeDashboardStats(allEvents) {
  if (!Array.isArray(allEvents) || allEvents.length === 0) {
    return {
      weeklyChats: 0,
      nightStreak: 0,
      currentMoodLabel: "Okay",
      currentMoodDescription:
        "Slightly heavy, but you're still moving.",
      moodPreviewDays: [],
    };
  }

  const now = new Date();
  const nowMs = now.getTime();
  const sevenDaysAgo = nowMs - 6 * 24 * 60 * 60 * 1000;

  // 1) recent events for "this week"
  const recent = allEvents.filter((e) => e.ts >= sevenDaysAgo);

  const daySetWeekly = new Set(recent.map((e) => dayKeyFromTs(e.ts)));
  const weeklyChats = daySetWeekly.size; // days with at least one chat

  // 2) night streak = consecutive days with any event, ending on latest day
  const allDayKeys = Array.from(
    new Set(allEvents.map((e) => dayKeyFromTs(e.ts)))
  ).sort(); // lexicographic works for YYYY-MM-DD

  let nightStreak = 0;
  if (allDayKeys.length > 0) {
    const lastDay = allDayKeys[allDayKeys.length - 1];
    const daySet = new Set(allDayKeys);
    let current = lastDay;
    while (daySet.has(current)) {
      nightStreak += 1;
      current = previousDayKey(current);
    }
  }

  // 3) current mood = from last event
  const lastEvent = allEvents[allEvents.length - 1];
  const { label: currentMoodLabel, description: currentMoodDescription } =
    moodSummaryForEmotion(lastEvent?.emotion || "okay");

  // 4) moodPreviewDays = 7 bars for last 7 days
  const previewDays = [];
  for (let i = 6; i >= 0; i--) {
    const dayMs = nowMs - (6 - i) * 24 * 60 * 60 * 1000;
    const key = dayKeyFromTs(dayMs);
    const label = new Date(dayMs).toLocaleDateString(undefined, {
      weekday: "short",
    }); // Mon, Tue...

    const eventsForDay = allEvents.filter(
      (e) => dayKeyFromTs(e.ts) === key
    );

    if (eventsForDay.length === 0) {
      previewDays.push({
        id: key,
        label,
        mood: "okay",
        score: 0,
      });
      continue;
    }

    const avgScore =
      eventsForDay.reduce((sum, e) => sum + emotionScore(e.emotion), 0) /
      eventsForDay.length;

    let mood;
    if (avgScore < 2.5) mood = "low";
    else if (avgScore > 3.5) mood = "high";
    else mood = "okay";

    previewDays.push({
      id: key,
      label,
      mood,
      score: avgScore,
    });
  }

  return {
    weeklyChats,
    nightStreak,
    currentMoodLabel,
    currentMoodDescription,
    moodPreviewDays: previewDays,
  };
}

// push stats into Firestore dashboard doc
async function syncDashboardToFirestore(uid, allEvents) {
  if (!uid || !db) return;
  const stats = computeDashboardStats(allEvents);

  try {
    const ref = doc(db, "users", uid, "premium", "dashboard");
    await setDoc(
      ref,
      {
        weeklyChats: stats.weeklyChats,
        nightStreak: stats.nightStreak,
        currentMoodLabel: stats.currentMoodLabel,
        currentMoodDescription: stats.currentMoodDescription,
        moodPreviewDays: stats.moodPreviewDays,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Failed to sync premium dashboard:", err);
  }
}

// save one mood point (called whenever EMOTI replies with an emotion)
async function appendMoodEvent(uid, emotion) {
  if (!uid || !emotion) return;
  if (typeof window === "undefined") return;

  const key = getMoodKey(uid);
  try {
    const raw = window.localStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];

    const updated = [
      ...existing,
      {
        ts: Date.now(), // timestamp
        emotion, // e.g. "low", "okay", "high", "stressed"
      },
    ].slice(-500); // keep last 500 events only

    window.localStorage.setItem(key, JSON.stringify(updated));

    // also sync to Firestore for PremiumHomepage
    await syncDashboardToFirestore(uid, updated);
  } catch (err) {
    console.error("Failed to append mood event", err);
  }
}

export default function PremiumChat() {
  const { user } = useAuth();

  const [sessions, setSessions] = useState([]); // [{id, title, createdAt, messages}]
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState(getInitialMessages);
  const [titleInput, setTitleInput] = useState("");

  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [personality, setPersonality] = useState("Friend");
  const [loading, setLoading] = useState(false);

  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);

  const boxRef = useRef(null);

  // -----------------------------
  // Auto scroll chat
  // -----------------------------
  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  // -----------------------------
  // Load sessions for this user
  // -----------------------------
  useEffect(() => {
    if (!user) {
      // logged out → clear local state
      setSessions([]);
      setActiveSessionId(null);
      setMessages(getInitialMessages());
      setTitleInput("");
      return;
    }

    const key = getStorageKey(user.uid);

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        const firstSession = {
          id: Date.now().toString(),
          title: "First premium chat",
          createdAt: Date.now(),
          messages: getInitialMessages(),
        };
        setSessions([firstSession]);
        setActiveSessionId(firstSession.id);
        setMessages(firstSession.messages);
        setTitleInput(firstSession.title);
        window.localStorage.setItem(key, JSON.stringify([firstSession]));
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const firstSession = {
          id: Date.now().toString(),
          title: "First premium chat",
          createdAt: Date.now(),
          messages: getInitialMessages(),
        };
        setSessions([firstSession]);
        setActiveSessionId(firstSession.id);
        setMessages(firstSession.messages);
        setTitleInput(firstSession.title);
        window.localStorage.setItem(key, JSON.stringify([firstSession]));
        return;
      }

      const lastSession = parsed[parsed.length - 1];
      setSessions(parsed);
      setActiveSessionId(lastSession.id);
      setMessages(lastSession.messages || getInitialMessages());
      setTitleInput(lastSession.title || "");
    } catch (err) {
      console.error("Failed to load premium sessions:", err);
      const firstSession = {
        id: Date.now().toString(),
        title: "Premium chat",
        createdAt: Date.now(),
        messages: getInitialMessages(),
      };
      setSessions([firstSession]);
      setActiveSessionId(firstSession.id);
      setMessages(firstSession.messages);
      setTitleInput(firstSession.title);
    }
  }, [user]);

  // -----------------------------
  // Persist sessions whenever they change
  // -----------------------------
  useEffect(() => {
    if (!user) return;
    const key = getStorageKey(user.uid);
    try {
      window.localStorage.setItem(key, JSON.stringify(sessions));
    } catch (err) {
      console.error("Failed to save premium sessions:", err);
    }
  }, [sessions, user]);

  // -----------------------------
  // Keep active session in sync with messages
  // -----------------------------
  useEffect(() => {
    if (!user || !activeSessionId) return;

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages } : s))
    );
  }, [messages, user, activeSessionId]);

  // -----------------------------
  // Keep title input in sync with active session
  // -----------------------------
  useEffect(() => {
    const cur = sessions.find((s) => s.id === activeSessionId);
    setTitleInput(cur?.title || "");
  }, [sessions, activeSessionId]);

  // -----------------------------
  // Create a new chat session
  // -----------------------------
  const startNewChat = () => {
    const baseMessages = getInitialMessages();
    const id = Date.now().toString();

    const newSession = {
      id,
      title: `Chat ${sessions.length + 1}`,
      createdAt: Date.now(),
      messages: baseMessages,
    };

    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(id);
    setMessages(baseMessages);
    setTitleInput(newSession.title);
  };

  // -----------------------------
  // Switch between previous chats
  // -----------------------------
  const switchSession = (sessionId) => {
    setActiveSessionId(sessionId);
    const session = sessions.find((s) => s.id === sessionId);
    setMessages(session?.messages || getInitialMessages());
    setTitleInput(session?.title || "");
  };

  // -----------------------------
  // Rename current conversation
  // -----------------------------
  const handleTitleChange = (value) => {
    setTitleInput(value);
    if (!activeSessionId) return;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, title: value.trim() || "Untitled chat" }
          : s
      )
    );
  };

  // -----------------------------
  // Delete current conversation
  // -----------------------------
  const deleteCurrentSession = () => {
    if (!activeSessionId) return;

    let nextActive = null;
    let nextMessages = getInitialMessages();

    setSessions((prev) => {
      if (prev.length <= 1) {
        const newSession = {
          id: Date.now().toString(),
          title: "New premium chat",
          createdAt: Date.now(),
          messages: getInitialMessages(),
        };
        nextActive = newSession;
        nextMessages = newSession.messages;
        return [newSession];
      }

      const idx = prev.findIndex((s) => s.id === activeSessionId);
      const filtered = prev.filter((s) => s.id !== activeSessionId);

      const chosen = filtered[Math.min(idx, filtered.length - 1)];
      nextActive = chosen;
      nextMessages = chosen.messages || getInitialMessages();

      return filtered;
    });

    if (nextActive) {
      setActiveSessionId(nextActive.id);
      setMessages(nextMessages);
      setTitleInput(nextActive.title || "");
    }
  };

  // -----------------------------
  // TEXT CHAT SEND
  // -----------------------------
  async function sendMessage() {
    if (!input.trim() || loading) return;

    const now = Date.now();

    const userMsg = {
      id: now,
      from: "user",
      text: input.trim(),
      time: now,
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: userMsg.text,
          language,
          personality,
        }),
      });

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: now + 1,
            from: "emoti",
            text: "Premium server is busy — please try again.",
            time: Date.now(),
            emotion: "stressed",
          },
        ]);
        return;
      }

      const data = await res.json();
      const reply =
        data.reply || "Thank you for sharing. Tell me a bit more?";
      const emotion = data.emotion || "okay";

      await appendMoodEvent(user?.uid, emotion);

      setMessages((m) => [
        ...m,
        {
          id: now + 2,
          from: "emoti",
          text: reply,
          time: Date.now(),
          emotion,
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 3,
          from: "emoti",
          text: "Network error. Please try again.",
          time: Date.now(),
          emotion: "stressed",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // -----------------------------
  // VOICE RECORDING
  // -----------------------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);

      recorder.onstop = async () => {
        setLoading(true);
        try {
          const blob = new Blob(chunks, { type: "audio/webm" });

          const res = await fetch("/api/voice", {
            method: "POST",
            body: blob,
          });

          const data = await res.json();

          const now = Date.now();

          const userMsg = {
            id: now,
            from: "user",
            text: data.user_text || "(voice message)",
            time: now,
          };

          const emotion = data.emotion || "okay"; // backend can add emotion later

          const emotiMsg = {
            id: now + 1,
            from: "emoti",
            text: data.reply_text,
            time: Date.now(),
            emotion,
          };

          await appendMoodEvent(user?.uid, emotion);

          setMessages((m) => [...m, userMsg, emotiMsg]);

          if (data.audio) {
            const audio = new Audio(
              "data:audio/mp3;base64," + data.audio
            );
            audio.play();
          }
        } catch (err) {
          setMessages((m) => [
            ...m,
            {
              id: Date.now() + 2,
              from: "emoti",
              text: "I had trouble processing that voice message.",
              time: Date.now(),
            },
          ]);
        } finally {
          setLoading(false);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      alert("Microphone permission denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  // -----------------------------
  // UI RENDER
  // -----------------------------
  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-b from-slate-950/90 via-slate-900/95 to-slate-950/90 rounded-[2rem] border border-amber-400/50 shadow-[0_0_50px_rgba(250,204,21,0.25)] flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="flex flex-col gap-3 px-6 py-4 border-b border-amber-400/30 bg-slate-950/90">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-fuchsia-500 to-sky-400 flex items-center justify-center text-slate-950 font-bold text-lg shadow-lg">
              🙂
            </div>
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                EMOTI Premium
                <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/50 text-[10px] text-amber-200">
                  Priority
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                A softer, deeper space just for you.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border border-amber-400/40 bg-slate-950/80 text-[11px] rounded-full px-3 py-1 text-slate-100"
            >
              <option>Hindi</option>
              <option>Odia</option>
              <option>Bengali</option>
              <option>Tamil</option>
              <option>Telugu</option>
              <option>Marathi</option>
              <option>English</option>
            </select>

            <select
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              className="border border-amber-400/40 bg-slate-950/80 text-[11px] rounded-full px-3 py-1 text-slate-100"
            >
              <option>Friend</option>
              <option>Sister</option>
              <option>Brother</option>
              <option>Mentor</option>
              <option>Soft Romantic</option>
            </select>
          </div>
        </div>

        {/* session controls */}
        <div className="flex flex-col gap-2 text-[11px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Conversation:</span>
              <select
                value={activeSessionId || ""}
                onChange={(e) => switchSession(e.target.value)}
                className="border border-amber-400/40 bg-slate-950/80 rounded-full px-3 py-1 text-[11px] text-slate-100"
              >
                {sessions.map((s, index) => (
                  <option key={s.id} value={s.id}>
                    {s.title || `Chat ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={startNewChat}
                className="px-3 py-1.5 rounded-full bg-amber-400/90 hover:bg-amber-300 text-slate-950 text-[11px] font-semibold"
              >
                + New premium chat
              </button>
              <button
                onClick={deleteCurrentSession}
                className="px-3 py-1.5 rounded-full border border-amber-400/50 text-amber-200 hover:bg-amber-400/10 text-[11px]"
              >
                Delete
              </button>
            </div>
          </div>

          {/* rename field */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Rename:</span>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Conversation title"
              className="flex-1 bg-slate-900/80 border border-amber-400/30 rounded-full px-3 py-1 text-[11px] text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>
      </header>

      {/* CHAT MESSAGES */}
      <main
        ref={boxRef}
        className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 min-h-[360px] md:min-h-[440px]"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.from === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                msg.from === "user"
                  ? "bg-amber-400/90 text-slate-950 rounded-br-sm"
                  : "bg-slate-800/90 text-slate-50 rounded-bl-sm border border-amber-400/20"
              }`}
            >
              {msg.from === "emoti" && (
                <div className="text-[10px] uppercase tracking-wide text-amber-200 mb-1 flex items-center gap-1">
                  <span>EMOTI</span>
                  {msg.emotion && (
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-900/70 border border-amber-300/40 lowercase">
                      {msg.emotion}
                    </span>
                  )}
                </div>
              )}

              <div>{msg.text}</div>
              <div
                className={`text-[10px] mt-1 ${
                  msg.from === "user" ? "text-slate-900/70" : "text-slate-400"
                }`}
              >
                {formatTime(msg.time)}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start mt-1">
            <div className="bg-slate-800/90 border border-amber-400/20 px-3 py-2 rounded-2xl">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.1s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* INPUT + VOICE */}
      <footer className="border-t border-amber-400/30 bg-slate-950/95 px-6 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder="Write from your heart…"
              className="flex-1 resize-none border border-slate-700 bg-slate-900/90 rounded-2xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 px-5 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap"
            >
              {loading ? "…" : "Send"}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                recording
                  ? "bg-rose-600 text-white"
                  : "bg-purple-600 text-white"
              }`}
            >
              {recording ? "Stop premium voice 🎙" : "Premium voice 🎤"}
            </button>
            <span>Premium space · do not share private info.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
