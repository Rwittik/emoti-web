// src/components/Chat.jsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";

const API_URL = "/api/chat";

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// default welcome message
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
  const { user, loadingAuth } = useAuth();

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
  // Load stored messages per user
  // --------------------------------
  useEffect(() => {
    if (loadingAuth) return;

    // logged out → clear chat
    if (!user) {
      setMessages(getInitialMessages());
      return;
    }

    const loadMessages = async () => {
      try {
        const msgsRef = collection(db, "users", user.uid, "messages");
        const q = query(msgsRef, orderBy("time", "asc"));
        const snap = await getDocs(q);

        if (snap.empty) {
          setMessages(getInitialMessages());
          return;
        }

        const loaded = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            from: data.from,
            text: data.text,
            time: data.time || Date.now(),
            emotion: data.emotion || undefined,
          };
        });

        setMessages(loaded);
      } catch (err) {
        console.error("Failed to load messages", err);
        setMessages(getInitialMessages());
      }
    };

    loadMessages();
  }, [user, loadingAuth]);

  // --------------------------------
  // Save messages to Firestore
  // --------------------------------
  async function saveMessagesToFirestore(msgArray) {
    if (!user) return; // guest chats are not persisted

    try {
      const msgsRef = collection(db, "users", user.uid, "messages");
      for (const m of msgArray) {
        await addDoc(msgsRef, {
          from: m.from,
          text: m.text,
          time: m.time,
          emotion: m.emotion || null,
        });
      }
    } catch (err) {
      console.error("Failed to save messages", err);
    }
  }

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
        const errMsg = {
          id: now + 1,
          from: "emoti",
          text: "Server unavailable — please try again.",
          time: Date.now(),
          emotion: "stressed",
        };
        setMessages((m) => [...m, errMsg]);
        await saveMessagesToFirestore([userMsg, errMsg]);
        return;
      }

      const data = await res.json();
      const reply = data.reply || "Thank you for sharing. Tell me more.";
      const emotion = data.emotion || "okay";

      const emotiMsg = {
        id: now + 2,
        from: "emoti",
        text: reply,
        time: Date.now(),
        emotion,
      };

      setMessages((m) => [...m, emotiMsg]);
      await saveMessagesToFirestore([userMsg, emotiMsg]);
    } catch (e) {
      const errMsg = {
        id: Date.now() + 3,
        from: "emoti",
        text: "Network error. Please try again.",
        time: Date.now(),
        emotion: "stressed",
      };
      setMessages((m) => [...m, errMsg]);
      await saveMessagesToFirestore([userMsg, errMsg]);
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
          await saveMessagesToFirestore([userMsg, emotiMsg]);

          if (data.audio) {
            const audio = new Audio(
              "data:audio/mp3;base64," + data.audio
            );
            audio.play();
          }
        } catch (err) {
          const errMsg = {
            id: Date.now() + 2,
            from: "emoti",
            text: "I had trouble processing that voice message.",
            time: Date.now(),
          };
          setMessages((m) => [...m, errMsg]);
          await saveMessagesToFirestore([errMsg]);
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
