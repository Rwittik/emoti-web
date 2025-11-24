// src/components/PremiumChat.jsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

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

// save one mood point (called whenever EMOTI replies with an emotion)
async function appendMoodEvent(uid, emotion) {
  if (!uid || !emotion) return;

  const key = getMoodKey(uid);
  let updated = [];

  try {
    const raw = window.localStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];

    updated = [
      ...existing,
      {
        ts: Date.now(), // timestamp
        emotion, // e.g. "low", "okay", "high", "stressed"
      },
    ].slice(-500); // keep last 500 events only

    window.localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to append mood event in localStorage", err);
  }

  // 🔁 also sync to Firestore so all devices see the same mood data
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      { moodEvents: updated },
      { merge: true } // don’t overwrite other fields
    );
  } catch (err) {
    console.error("Failed to sync moodEvents to Firestore", err);
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
  // Load sessions for this user (Firestore → localStorage → default)
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

    async function loadSessions() {
      try {
        // 1) try Firestore
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        let sessionsFromCloud = [];

        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.premiumSessions)) {
            sessionsFromCloud = data.premiumSessions;
          }
        }

        // 2) fall back to localStorage if Firestore empty
        let sessionsToUse = sessionsFromCloud;
        if (!sessionsToUse.length) {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) sessionsToUse = parsed;
          }
        }

        // 3) if still nothing, create first session
        if (!sessionsToUse.length) {
          const firstSession = {
            id: Date.now().toString(),
            title: "First premium chat",
            createdAt: Date.now(),
            messages: getInitialMessages(),
          };
          sessionsToUse = [firstSession];
        }

        const lastSession = sessionsToUse[sessionsToUse.length - 1];

        setSessions(sessionsToUse);
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
    }

    loadSessions();
  }, [user]);

  // -----------------------------
  // Persist sessions whenever they change
  // -----------------------------
  useEffect(() => {
    if (!user) return;

    const key = getStorageKey(user.uid);

    // localStorage cache
    try {
      window.localStorage.setItem(key, JSON.stringify(sessions));
    } catch (err) {
      console.error("Failed to save premium sessions to localStorage:", err);
    }

    // Firestore sync
    async function saveToCloud() {
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(
          userRef,
          { premiumSessions: sessions },
          { merge: true }
        );
      } catch (err) {
        console.error("Failed to sync premium sessions to Firestore:", err);
      }
    }

    saveToCloud();
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

    // apply new active + messages after sessions updated
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
      const reply = data.reply || "Thank you for sharing. Tell me a bit more?";
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

          const emotion = data.emotion || "okay"; // make sure backend returns this

          const emotiMsg = {
            id: now + 1,
            from: "emoti",
            text: data.reply_text,
            time: Date.now(),
            emotion,
          };

          // log this emotion for the MoodDashboard
          await appendMoodEvent(user?.uid, emotion);

          setMessages((m) => [...m, userMsg, emotiMsg]);

          if (data.audio) {
            const audio = new Audio("data:audio/mp3;base64," + data.audio);
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
  const firstName =
    user?.displayName?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "You";

  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-b from-slate-950/90 via-slate-900/95 to-slate-950/90 rounded-[2rem] border border-amber-400/60 shadow-[0_0_55px_rgba(250,204,21,0.28)] flex flex-col overflow-hidden relative">
      {/* subtle inner glow */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-24 -left-10 h-40 w-40 bg-amber-400/30 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 right-0 h-52 w-52 bg-fuchsia-500/25 blur-3xl rounded-full" />
      </div>

      {/* HEADER */}
      <header className="relative flex flex-col gap-3 px-6 py-4 border-b border-amber-400/30 bg-slate-950/95">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-fuchsia-500 to-sky-400 flex items-center justify-center text-slate-950 font-bold text-lg shadow-lg">
              🙂
            </div>
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                EMOTI Premium
                <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/50 text-[10px] text-amber-200">
                  Priority space
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                A softer, deeper room just for you. Tonight, we&apos;ll also log
                how this feels into your mood dashboard.
              </p>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-end gap-1 text-[10px]">
            <div className="flex items-center gap-1 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Mood tracking on</span>
            </div>
            <span className="text-amber-100/80">
              Synced to your EMOTI account
            </span>
            <span className="text-slate-400">
              Talking as{" "}
              <span className="font-semibold text-slate-100">
                {firstName}
              </span>
            </span>
          </div>
        </div>

        {/* session controls: previous chats + new chat + rename + delete */}
        <div className="mt-2 flex flex-col gap-2 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Conversation:</span>
              <select
                value={activeSessionId || ""}
                onChange={(e) => switchSession(e.target.value)}
                className="border border-amber-400/40 bg-slate-950/90 rounded-full px-3 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-400/70"
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
                className="px-3 py-1.5 rounded-full bg-amber-400/95 hover:bg-amber-300 text-slate-950 text-[11px] font-semibold shadow-sm shadow-amber-400/40 transition"
              >
                + New premium chat
              </button>
              <button
                onClick={deleteCurrentSession}
                className="px-3 py-1.5 rounded-full border border-amber-400/60 text-amber-200 hover:bg-amber-400/10 text-[11px] transition"
              >
                Delete
              </button>
            </div>
          </div>

          {/* rename + tiny helper chips */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Rename:</span>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Conversation title"
                className="flex-1 bg-slate-900/80 border border-amber-400/30 rounded-full px-3 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/70"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
              <span className="px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/70">
                Private to your account
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/70">
                Helps build weekly mood view
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/70">
                You can reset anytime by deleting chats
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CHAT MESSAGES */}
      <main
        ref={boxRef}
        className="relative flex-1 overflow-y-auto px-6 py-5 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 min-h-[360px] md:min-h-[440px]"
      >
        {/* inner soft panel */}
        <div className="relative mx-auto max-w-full">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-amber-500/5 via-slate-900/60 to-slate-950/80 pointer-events-none" />
          <div className="relative space-y-3 px-1 py-1">
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
                      ? "bg-amber-400/95 text-slate-950 rounded-br-sm shadow-amber-400/40"
                      : "bg-slate-800/95 text-slate-50 rounded-bl-sm border border-amber-400/25"
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
                      msg.from === "user"
                        ? "text-slate-900/70"
                        : "text-slate-400"
                    }`}
                  >
                    {formatTime(msg.time)}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start mt-1">
                <div className="bg-slate-800/95 border border-amber-400/25 px-3 py-2 rounded-2xl">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.1s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* INPUT + VOICE */}
      <footer className="relative border-t border-amber-400/30 bg-slate-950/98 px-6 py-3">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder="Write from your heart…"
              className="flex-1 resize-none border border-slate-700 bg-slate-900/95 rounded-2xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/70"
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 px-5 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap shadow-sm shadow-amber-400/40 transition"
            >
              {loading ? "…" : "Send"}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  recording ? "bg-rose-600 text-white" : "bg-purple-600 text-white"
                }`}
              >
                {recording ? "Stop premium voice 🎙" : "Premium voice 🎤"}
              </button>
              <span className="hidden sm:inline">
                Press <span className="font-semibold text-slate-300">Enter</span>{" "}
                to send ·{" "}
                <span className="font-semibold text-slate-300">
                  Shift + Enter
                </span>{" "}
                for a new line
              </span>
            </div>
            <span className="text-right">
              Premium space · avoid sharing personal identifiers.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
