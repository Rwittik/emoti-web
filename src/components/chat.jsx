// src/components/chat.jsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const API_URL = "/api/chat";

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Default welcome message
function getInitialMessages() {
  return [
    {
      id: 1,
      from: "emoti",
      text: "Hi — I'm EMOTI. How are you feeling today?",
      time: Date.now(),
      emotion: "okay",
    },
  ];
}

// localStorage key helper
function getStorageKey(uid) {
  return `emoti_chat_${uid}`;
}

export default function Chat() {
  const { user, isPremium } = useAuth();

  const [messages, setMessages] = useState(getInitialMessages);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [personality, setPersonality] = useState("Friend");
  const [loading, setLoading] = useState(false);

  // Voice states
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);

  // Edit / delete helpers
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const boxRef = useRef(null);

  const canUseVoice = !!user && isPremium; // only premium & logged in

  // -----------------------------
  // Auto scroll chat
  // -----------------------------
  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  // -----------------------------
  // Load messages for this user (Firestore → localStorage → default)
  // -----------------------------
  useEffect(() => {
    if (!user) {
      setMessages(getInitialMessages());
      return;
    }

    const key = getStorageKey(user.uid);

    async function loadMessages() {
      try {
        let messagesToUse = [];

        // 1) Try Firestore
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.chatMessages)) {
            messagesToUse = data.chatMessages;
          }
        }

        // 2) Fallback to localStorage
        if (!messagesToUse.length) {
          try {
            const stored = window.localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                messagesToUse = parsed;
              }
            }
          } catch (err) {
            console.error("Chat: failed to read from localStorage", err);
          }
        }

        // 3) If still nothing, use default
        if (!messagesToUse.length) {
          messagesToUse = getInitialMessages();
        }

        setMessages(messagesToUse);
      } catch (err) {
        console.error("Chat: failed to load from Firestore", err);
        // final fallback
        setMessages(getInitialMessages());
      }
    }

    loadMessages();
  }, [user]);

  // -----------------------------
  // Persist messages whenever they change (Firestore + localStorage cache)
  // -----------------------------
  useEffect(() => {
    if (!user) return;

    const key = getStorageKey(user.uid);

    // localStorage cache (best effort)
    try {
      window.localStorage.setItem(key, JSON.stringify(messages));
    } catch (err) {
      console.error("Chat: failed to save to localStorage", err);
    }

    // Firestore sync (do not await here; fire-and-forget)
    async function saveToCloud() {
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(
          userRef,
          { chatMessages: messages },
          { merge: true } // do not overwrite other fields
        );
      } catch (err) {
        console.error("Chat: failed to sync messages to Firestore", err);
      }
    }

    saveToCloud();
  }, [messages, user]);

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
        // fallback error reply
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
      const reply = data.reply || "Thank you for sharing. Tell me more.";
      const emotion = data.emotion || "okay";

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

        // if no reply existed, append a new one
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
          text: "Network error while updating that reply, but I did notice your edit.",
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
            text: "Server unavailable — please try again.",
            time: Date.now(),
            emotion: "stressed",
          },
        ]);
        return;
      }

      const data = await res.json();
      const reply = data.reply || "Thank you for sharing. Tell me more.";
      const emotion = data.emotion || "okay";

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
  // EDIT / DELETE MESSAGE
  // -----------------------------
  const handleStartEdit = (msg) => {
    if (msg.from !== "user" || loading) return; // only edit own messages, not while loading
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
      // empty after edit = delete
      await handleDelete(editingId);
      return;
    }

    // update user message text
    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingId ? { ...m, text: trimmed, edited: true } : m
      )
    );
    const editedId = editingId;
    setEditingId(null);
    setEditingText("");

    // regenerate EMOTI reply for this user message
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

        // determine if this was the last user message
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
        // deleting EMOTI message alone
        next = prev.filter((m) => m.id !== id);
      }

      return next;
    });

    if (editingId === id) {
      setEditingId(null);
      setEditingText("");
    }

    // After deleting the last user turn, regenerate reply for the new last user
    if (deletedWasUserLast && previousUser) {
      await regenerateReplyForUserMessage(previousUser.id, previousUser.text);
    }
  };

  // -----------------------------
  // VOICE RECORDING START (premium only)
  // -----------------------------
  const startRecording = async () => {
    if (!canUseVoice || recording) return;

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

          const emotiMsg = {
            id: now + 1,
            from: "emoti",
            text: data.reply_text,
            time: Date.now(),
          };

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

  // VOICE RECORDING STOP
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
    <div className="w-full max-w-3xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-[0_0_40px_rgba(15,23,42,0.8)] border border-slate-800 flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="flex flex-col gap-2 sm:flex-row sm:gap-0 sm:items-center sm:justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/95">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A78BFA] via-sky-400 to-emerald-400 flex items-center justify-center text-slate-950 font-bold text-lg shadow-lg">
              🙂
            </div>
            <div>
              <h2 className="text-sm font-semibold">EMOTI</h2>
              <p className="text-[11px] text-slate-400">
                Anonymous emotional companion
              </p>
            </div>
          </div>

          {!user && (
            <p className="text-[10px] text-amber-300 mt-0.5">
              You&apos;re in guest mode. Chats are not saved to your account and
              may reset. Sign in from the top bar to keep them.
            </p>
          )}

          {user && !isPremium && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              Free mode · Your chat is saved to your EMOTI account and syncs
              across devices. Voice notes are part of EMOTI Premium.
            </p>
          )}

          {user && isPremium && (
            <p className="text-[10px] text-emerald-300 mt-0.5">
              Premium active · Voice notes and deeper tools are unlocked.
            </p>
          )}
        </div>

        {/* LANGUAGE + PERSONALITY */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:justify-end">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border border-slate-700 bg-slate-900/90 text-[11px] rounded-full px-3 py-1 text-slate-100"
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
            className="border border-slate-700 bg-slate-900/90 text-[11px] rounded-full px-3 py-1 text-slate-100"
          >
            <option>Friend</option>
            <option>Sister</option>
            <option>Brother</option>
            <option>Mentor</option>
            <option>Soft Romantic</option>
          </select>
        </div>
      </header>

      {/* CHAT MESSAGES */}
      <main
        ref={boxRef}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 min-h-[260px] sm:min-h-[280px] md:min-h-[320px]"
      >
        {messages.map((msg) => {
          const isUser = msg.from === "user";
          const isEditing = editingId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex ${
                isUser ? "justify-end" : "justify-start"
              } group`}
            >
              <div
                className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-sm whitespace-pre-wrap shadow-sm relative ${
                  isUser
                    ? "bg-sky-500/15 text-slate-50 rounded-br-sm border border-sky-500/40"
                    : "bg-slate-800/95 text-slate-50 rounded-bl-sm border border-slate-700/80"
                }`}
              >
                {/* EMOTI label */}
                {msg.from === "emoti" && (
                  <div className="text-[10px] uppercase tracking-wide text-sky-300 mb-1 flex items-center gap-1">
                    <span>EMOTI</span>
                    {msg.emotion && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-900/70 border border-sky-400/50 lowercase">
                        {msg.emotion}
                      </span>
                    )}
                  </div>
                )}

                {/* Message content or editor */}
                {isEditing ? (
                  <div className="flex flex-col gap-1">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      rows={2}
                      className="w-full text-xs bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1 text-slate-100"
                    />
                    <div className="flex justify-end gap-2 text-[10px] mt-1">
                      <button
                        onClick={handleCancelEdit}
                        className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-slate-950 font-medium"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>{msg.text}</div>
                )}

                {/* Meta row: time + edited + actions */}
                {!isEditing && (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>{formatTime(msg.time)}</span>
                      {msg.edited && (
                        <span className="text-[9px] italic text-slate-500">
                          · edited
                        </span>
                      )}
                    </div>

                    {isUser && (
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(msg)}
                          className="hover:text-emerald-300"
                        >
                          Edit
                        </button>
                        <span className="w-[1px] h-3 bg-slate-600" />
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="hover:text-rose-300"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start mt-1">
            <div className="bg-slate-800/90 border border-slate-700 px-3 py-2 rounded-2xl">
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
      <footer className="border-t border-slate-800 bg-slate-950/95 px-3 py-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Write something…"
            className="flex-1 resize-none border border-slate-700 bg-slate-950 rounded-2xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />

          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white px-4 py-2 rounded-2xl text-sm w-full sm:w-auto shadow-sm shadow-sky-500/40"
          >
            {loading ? "…" : "Send"}
          </button>

          {canUseVoice ? (
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`flex items-center justify-center gap-1 px-4 py-2 rounded-2xl text-sm text-white w-full sm:w-auto shadow-sm ${
                recording
                  ? "bg-rose-600 shadow-rose-500/40"
                  : "bg-purple-600 shadow-purple-500/40 hover:bg-purple-500"
              }`}
            >
              {recording ? "Stop" : "Voice"}
              <span role="img" aria-label="mic">
                🎤
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-1 px-4 py-2 rounded-2xl text-sm border border-slate-700 bg-slate-900 text-slate-500 cursor-not-allowed w-full sm:w-auto"
              title="Voice notes are available in EMOTI Premium"
            >
              <span role="img" aria-label="lock">
                🔒
              </span>
              <span>Voice</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
