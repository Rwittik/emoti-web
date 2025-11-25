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

/* -----------------------------
   Small shared EmotiAvatar component
   (calming violet → blue gradient)
   ----------------------------- */
function EmotiAvatar({ size = 28 }) {
  const s = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      aria-hidden="true"
      style={{
        width: s,
        height: s,
        borderRadius: "9999px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, rgba(139,92,246,0.95) 0%, rgba(56,189,248,0.9) 100%)",
        boxShadow: "0 6px 18px rgba(8,10,25,0.45)",
      }}
    >
      <div
        style={{
          width: `calc(${s} - 8px)`,
          height: `calc(${s} - 8px)`,
          borderRadius: "9999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          fontSize: Math.max(10, Math.round(parseInt(s, 10) / 2.6)),
        }}
      >
        🙂
      </div>
    </div>
  );
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

  // tiny UI flag for send micro-animation
  const [justSentId, setJustSentId] = useState(null);

  // -----------------------------
  // Edit/delete state (same behaviour as normal chat)
  // -----------------------------
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  // -----------------------------
  // Auto scroll chat
  // -----------------------------
  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight + 200;
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
      console.error("Failed to save premium sessions to localStorage", err);
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
    setEditingId(null);
    setEditingText("");
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
      setEditingId(null);
      setEditingText("");
    }
  };

  // -----------------------------
  // Helper: regenerate EMOTI reply for a given user message
  // -----------------------------
  const regenerateReplyForUserMessage = async (userMessageId, newText) => {
    if (!newText?.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newText.trim(),
          language,
          personality,
        }),
      });

      const now = Date.now();

      if (!res.ok) {
        setMessages((prev) => {
          const userIdx = prev.findIndex((m) => m.id === userMessageId);
          if (userIdx === -1) return prev;
          const replyIdx = prev.findIndex(
            (m, i) => i > userIdx && m.from === "emoti"
          );

          const errorReply = {
            id: replyIdx !== -1 ? prev[replyIdx].id : now,
            from: "emoti",
            text: "I had trouble updating that reply, but I saw your change.",
            time: now,
            emotion: "stressed",
          };

          if (replyIdx !== -1) {
            const copy = [...prev];
            copy[replyIdx] = errorReply;
            return copy;
          }
          return [...prev, errorReply];
        });
        return;
      }

      const data = await res.json();
      const reply = data.reply || "Thank you for sharing. Tell me a bit more?";
      const emotion = data.emotion || "okay";

      // log mood for regenerated reply as well
      await appendMoodEvent(user?.uid, emotion);

      setMessages((prev) => {
        const userIdx = prev.findIndex((m) => m.id === userMessageId);
        if (userIdx === -1) return prev;

        const replyIdx = prev.findIndex(
          (m, i) => i > userIdx && m.from === "emoti"
        );

        const updatedReply = {
          id: replyIdx !== -1 ? prev[replyIdx].id : now,
          from: "emoti",
          text: reply,
          time: now,
          emotion,
        };

        if (replyIdx !== -1) {
          const copy = [...prev];
          copy[replyIdx] = updatedReply;
          return copy;
        }

        return [...prev, updatedReply];
      });
    } catch (err) {
      const now = Date.now();
      setMessages((prev) => {
        const userIdx = prev.findIndex((m) => m.id === userMessageId);
        if (userIdx === -1) return prev;
        const replyIdx = prev.findIndex(
          (m, i) => i > userIdx && m.from === "emoti"
        );

        const errorReply = {
          id: replyIdx !== -1 ? prev[replyIdx].id : now,
          from: "emoti",
          text:
            "Network error while updating that reply, but I did notice your edit.",
          time: now,
          emotion: "stressed",
        };

        if (replyIdx !== -1) {
          const copy = [...prev];
          copy[replyIdx] = errorReply;
          return copy;
        }
        return [...prev, errorReply];
      });
    } finally {
      setLoading(false);
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

    // mark just-sent for micro animation
    setJustSentId(now);

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    // clear the just-sent flag shortly after to allow CSS animation
    setTimeout(() => setJustSentId(null), 220);

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
  // EDIT / DELETE MESSAGE (same behaviour as normal chat)
  // -----------------------------
  const handleStartEdit = (msg) => {
    if (msg.from !== "user" || loading) return;
    setEditingId(msg.id);
    setEditingText(msg.text);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingText.trim();
    if (!trimmed) {
      await handleDelete(editingId);
      return;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingId ? { ...m, text: trimmed, edited: true } : m
      )
    );
    const editedId = editingId;
    setEditingId(null);
    setEditingText("");

    await regenerateReplyForUserMessage(editedId, trimmed);
  };

  const handleDelete = async (id) => {
    let deletedWasUserLast = false;
    let previousUser = null;

    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx === -1) return prev;

      const msg = prev[idx];
      let next = prev;

      if (msg.from === "user") {
        // remove its EMOTI reply (first emoti after this message)
        const replyIdx = prev.findIndex(
          (m, i) => i > idx && m.from === "emoti"
        );
        next = prev.filter((_, i) => i !== idx && i !== replyIdx);

        // was this the last user message?
        const userIndices = prev
          .map((m, i) => (m.from === "user" ? i : -1))
          .filter((i) => i !== -1);

        if (userIndices.length && userIndices[userIndices.length - 1] === idx) {
          const secondLastIndex =
            userIndices.length > 1 ? userIndices[userIndices.length - 2] : null;
          if (secondLastIndex != null) {
            const u = prev[secondLastIndex];
            deletedWasUserLast = true;
            previousUser = { id: u.id, text: u.text };
          }
        }
      } else {
        // deleting only EMOTI message
        next = prev.filter((m) => m.id !== id);
      }

      return next;
    });

    if (editingId === id) {
      setEditingId(null);
      setEditingText("");
    }

    if (deletedWasUserLast && previousUser) {
      await regenerateReplyForUserMessage(previousUser.id, previousUser.text);
    }
  };

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
  // Small info for header session label
  // -----------------------------
  const activeIndex = sessions.findIndex((s) => s.id === activeSessionId);
  const sessionLabel =
    activeIndex >= 0
      ? `Session ${activeIndex + 1} of ${sessions.length}`
      : sessions.length > 0
      ? `${sessions.length} saved chats`
      : "1 saved chat";

  // -----------------------------
  // UI RENDER
  // -----------------------------
  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-b from-slate-950/90 via-slate-900/95 to-slate-950/90 rounded-[2rem] border border-amber-400/50 shadow-[0_0_50px_rgba(250,204,21,0.25)] flex flex-col overflow-hidden">
      {/* local CSS keyframes for tiny animations */}
      <style>{`
        @keyframes send-vibrate {
          0% { transform: translateY(0) scale(1); }
          30% { transform: translateY(-4px) scale(0.997); }
          60% { transform: translateY(2px) scale(0.998); }
          100% { transform: translateY(0) scale(1); }
        }

        @keyframes dot-pulse {
          0% { opacity: 0.18; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
          100% { opacity: 0.18; transform: translateY(0); }
        }
      `}</style>

      {/* HEADER */}
      <header className="flex flex-col gap-4 px-6 py-4 border-b border-amber-400/30 bg-slate-950/95">
        {/* top row: title + language/mode */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div style={{ width: 44, height: 44 }}>
              <EmotiAvatar size={44} />
            </div>
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2">
                EMOTI Premium
                <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/50 text-[10px] text-amber-200">
                  Priority space
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                A softer, deeper room just for you. Take your time.
              </p>
            </div>
          </div>

          {/* language + personality selection */}
          <div className="flex flex-col items-start md:items-end gap-1">
            <div className="flex gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="border border-amber-400/40 bg-slate-950/90 text-[11px] rounded-full px-3 py-1 text-slate-100 shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-300"
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
                className="border border-amber-400/40 bg-slate-950/90 text-[11px] rounded-full px-3 py-1 text-slate-100 shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-300"
              >
                <option>Friend</option>
                <option>Sister</option>
                <option>Brother</option>
                <option>Mentor</option>
                <option>Soft Romantic</option>
              </select>
            </div>
            <span className="text-[10px] text-slate-500">
              Switch language & tone anytime. EMOTI will adapt.
            </span>
          </div>
        </div>

        {/* session controls: previous chats + new chat + rename + delete */}
        <div className="rounded-2xl border border-amber-400/15 bg-slate-950/80 px-4 py-3 shadow-inner/30 shadow-[0_0_25px_rgba(15,23,42,0.8)] text-[11px]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                <span className="font-medium text-slate-100">
                  Conversation space
                </span>
              </div>
              <span className="text-[10px] text-slate-500">{sessionLabel}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Conversation:</span>
                <select
                  value={activeSessionId || ""}
                  onChange={(e) => switchSession(e.target.value)}
                  className="border border-amber-400/40 bg-slate-950/90 rounded-full px-3 py-1 text-[11px] text-slate-100 shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-300"
                >
                  {sessions.map((s, index) => (
                    <option key={s.id} value={s.id}>
                      {s.title || `Chat ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={startNewChat}
                  className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:via-amber-200 hover:to-amber-300 text-slate-950 text-[11px] font-semibold shadow-md"
                >
                  + New premium chat
                </button>
                <button
                  onClick={deleteCurrentSession}
                  className="px-3 py-1.5 rounded-full border border-rose-400/60 text-rose-200 hover:bg-rose-500/10 text-[11px]"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* rename field */}
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="flex items-center gap-2 md:min-w-[90px]">
              <span className="text-slate-400">Rename:</span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Conversation title"
                className="bg-slate-900/80 border border-amber-400/30 rounded-full px-3 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
              <span className="text-[10px] text-slate-500">
                Only you can see these titles. Use them to mark special nights
                or themes.
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CHAT MESSAGES */}
      <main
        ref={boxRef}
        className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 min-h-[360px] md:min-h-[440px]"
      >
        {messages.map((msg) => {
          const isUser = msg.from === "user";
          const isEditing = editingId === msg.id;
          const isJustSent = justSentId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"} group`}
            >
              {/* Emoti avatar on left for emoti messages */}
              {!isUser && (
                <div className="mr-3 flex-shrink-0">
                  <EmotiAvatar size={34} />
                </div>
              )}

              <div
                // apply micro-animation when user just sent that message
                style={
                  isJustSent
                    ? { animation: "send-vibrate 220ms ease-in-out" }
                    : undefined
                }
                className={`max-w-[80%] text-sm whitespace-pre-wrap shadow-sm
                  ${isUser ? "ml-4" : ""}
                `}
              >
                <div
                  className={`px-4 py-3 rounded-[20px] leading-relaxed break-words ${
                    isUser
                      ? "bg-amber-400/95 text-slate-950 rounded-bl-[20px] rounded-br-[6px] rounded-tl-[20px] rounded-tr-[20px]"
                      : "bg-slate-800/90 text-slate-50 rounded-br-[20px] rounded-bl-[6px] rounded-tl-[20px] rounded-tr-[20px] border border-amber-400/12"
                  }`}
                  style={{ boxShadow: "0 6px 14px rgba(2,6,23,0.45)" }}
                >
                  {msg.from === "emoti" && (
                    <div className="text-[10px] uppercase tracking-wide text-amber-200 mb-1 flex items-center gap-2">
                      <span>EMOTI</span>
                      {msg.emotion && (
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-900/70 border border-amber-300/40 lowercase text-[10px]">
                          {msg.emotion}
                        </span>
                      )}
                    </div>
                  )}

                  {/* content / editor */}
                  {isEditing ? (
                    <div className="flex flex-col gap-1">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={2}
                        className="w-full text-xs bg-slate-900/80 border border-amber-300/40 rounded-lg px-2 py-1 text-slate-100"
                      />
                      <div className="flex justify-end gap-2 text-[10px] mt-1">
                        <button
                          onClick={handleCancelEdit}
                          className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-medium"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>{msg.text}</div>
                  )}

                  {/* time + edited + actions */}
                  {!isEditing && (
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px]">
                      <div
                        className={`flex items-center gap-1 ${
                          isUser ? "text-slate-900/70" : "text-slate-400"
                        }`}
                      >
                        <span>{formatTime(msg.time)}</span>
                        {msg.edited && (
                          <span className="italic opacity-70">· edited</span>
                        )}
                      </div>

                      {isUser && (
                        <div className="flex items-center gap-2 text-slate-700 group-hover:text-slate-900/80">
                          <button
                            onClick={() => handleStartEdit(msg)}
                            className="hover:text-emerald-700"
                          >
                            Edit
                          </button>
                          <span className="w-[1px] h-3 bg-slate-500/70" />
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="hover:text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing / loading indicator (Emoti avatar + pulse dots) */}
        {loading && (
          <div className="flex justify-start mt-1 items-center gap-3">
            <div>
              <EmotiAvatar size={28} />
            </div>
            <div className="bg-slate-800/90 border border-amber-400/20 px-4 py-2 rounded-[20px]">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.85)",
                    display: "inline-block",
                    animation: "dot-pulse 900ms infinite",
                    animationDelay: "0ms",
                  }}
                />
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.85)",
                    display: "inline-block",
                    animation: "dot-pulse 900ms infinite",
                    animationDelay: "150ms",
                  }}
                />
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.85)",
                    display: "inline-block",
                    animation: "dot-pulse 900ms infinite",
                    animationDelay: "300ms",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* INPUT + VOICE */}
      <footer className="border-t border-amber-400/30 bg-slate-950/95 px-6 py-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {/* upgraded white input */}
            <div className="flex items-center gap-3 flex-1 bg-white rounded-2xl px-3 py-2 shadow-[0_6px_18px_rgba(2,6,23,0.35)]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Write from your heart…"
                className="flex-1 resize-none bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-500"
              />

              {/* mic button with glow while recording */}
              <button
                onClick={recording ? stopRecording : startRecording}
                aria-pressed={recording}
                className={`p-2 rounded-full transition-transform transform shadow-sm ${
                  recording
                    ? "bg-rose-600 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
                style={{
                  boxShadow: recording
                    ? "0 8px 30px rgba(255,100,120,0.22)"
                    : "0 6px 14px rgba(2,6,23,0.06)",
                }}
              >
                {/* mic svg */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z"
                    fill={recording ? "#fff" : "#0f172a"}
                    opacity="0.95"
                  />
                  <path
                    d="M19 11v1a7 7 0 0 1-14 0v-1"
                    stroke={recording ? "rgba(255,255,255,0.9)" : "#0f172a"}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path
                    d="M12 19v3"
                    stroke={recording ? "rgba(255,255,255,0.9)" : "#0f172a"}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </button>
            </div>

            {/* send button */}
            <button
              onClick={sendMessage}
              disabled={loading}
              className="px-4 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold shadow-md disabled:opacity-60 transform active:scale-95"
            >
              {loading ? "…" : "Send"}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Tip:</span>
              <span>Use voice or text — EMOTI listens either way.</span>
            </div>
            <span>Premium space · do not share private info.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
