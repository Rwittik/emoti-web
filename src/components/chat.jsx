// src/components/chat.jsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";

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

export default function Chat() {
  // ⬇️ now also read isPremium so we can show different text for normal users
  const { user, isPremium } = useAuth();

  const [messages, setMessages] = useState(getInitialMessages);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [personality, setPersonality] = useState("Friend");
  const [loading, setLoading] = useState(false);

  // Voice states
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);

  const boxRef = useRef(null);

  // Auto scroll chat
  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  // --------------------------------
  // Load messages per user (localStorage)
  // --------------------------------
  useEffect(() => {
    // Logged out → clear chat
    if (!user) {
      setMessages(getInitialMessages());
      return;
    }

    const key = `emoti_chat_${user.uid}`;

    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        setMessages(getInitialMessages());
        return;
      }

      const parsed = JSON.parse(stored);

      // basic validation
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed);
      } else {
        setMessages(getInitialMessages());
      }
    } catch (err) {
      console.error("Failed to load stored chat:", err);
      setMessages(getInitialMessages());
    }
  }, [user]);

  // --------------------------------
  // Save messages whenever they change (only when logged in)
  // --------------------------------
  useEffect(() => {
    if (!user) return;
    const key = `emoti_chat_${user.uid}`;
    try {
      window.localStorage.setItem(key, JSON.stringify(messages));
    } catch (err) {
      console.error("Failed to save chat:", err);
    }
  }, [messages, user]);

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
  // VOICE RECORDING START
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

  // -----------------------------
  // VOICE RECORDING STOP
  // -----------------------------
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
    <div className="w-full max-w-2xl bg-slate-900/70 backdrop-blur rounded-2xl shadow-lg border border-slate-800 flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#38bdf8] flex items-center justify-center text-white font-bold text-lg">
              E
            </div>
            <div>
              <h2 className="text-sm font-semibold">EMOTI</h2>
              <p className="text-[11px] text-slate-400">
                Anonymous emotional companion
              </p>
            </div>
          </div>

          {/* Little status line for normal / guest / premium users */}
          {!user && (
            <p className="text-[10px] text-amber-300 mt-0.5">
              You&apos;re in guest mode. Chats are not saved and will reset if
              you refresh. Sign in from the top bar to keep your conversation.
            </p>
          )}

          {user && !isPremium && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              Free mode · Your messages are only stored on this device. Upgrade
              to EMOTI Premium for mood history, images & your own dashboard.
            </p>
          )}

          {user && isPremium && (
            <p className="text-[10px] text-emerald-300 mt-0.5">
              Premium active · This basic chat is for quick talks. Your longer
              reflections live in the Premium chatroom & mood tools.
            </p>
          )}
        </div>

        {/* LANGUAGE + PERSONALITY */}
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="border border-slate-700 bg-slate-900 text-[11px] rounded px-2 py-1"
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
            className="border border-slate-700 bg-slate-900 text-[11px] rounded px-2 py-1"
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
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/70"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.from === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
                msg.from === "user"
                  ? "bg-sky-500/20 text-right"
                  : "bg-slate-800 text-left"
              }`}
            >
              {/* EMOTI label + emotion */}
              {msg.from === "emoti" && (
                <div className="text-[10px] uppercase tracking-wide text-sky-300 mb-1">
                  EMOTI
                  {msg.emotion ? ` · ${msg.emotion}` : ""}
                </div>
              )}

              <div>{msg.text}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                {formatTime(msg.time)}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start mt-1">
            <div className="bg-slate-800 px-3 py-2 rounded-xl">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.1s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* INPUT + VOICE */}
      <footer className="border-t border-slate-800 bg-slate-900/90 px-3 py-2">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Write something…"
            className="flex-1 resize-none border border-slate-700 bg-slate-950 rounded px-3 py-2 text-sm text-slate-100"
          />

          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
          >
            {loading ? "…" : "Send"}
          </button>

          <button
            onClick={recording ? stopRecording : startRecording}
            className={`${
              recording ? "bg-red-600" : "bg-purple-600"
            } text-white px-4 py-2 rounded text-sm`}
          >
            {recording ? "Stop 🎙" : "Voice 🎤"}
          </button>
        </div>
      </footer>
    </div>
  );
}
