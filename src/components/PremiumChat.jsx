// src/components/PremiumChat.jsx
import React, { useEffect, useRef, useState } from "react";

const API_URL = "/api/chat";

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function PremiumChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: "emoti",
      text: "Hi — I'm EMOTI Premium. What’s on your heart tonight?",
      time: Date.now(),
      emotion: "okay",
    },
  ]);

  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [personality, setPersonality] = useState("Friend");
  const [loading, setLoading] = useState(false);

  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);

  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      from: "user",
      text: input.trim(),
      time: Date.now(),
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
            id: Date.now() + 1,
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

      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 2,
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

          setMessages((m) => [
            ...m,
            {
              id: Date.now(),
              from: "user",
              text: data.user_text || "(voice message)",
              time: Date.now(),
            },
            {
              id: Date.now() + 1,
              from: "emoti",
              text: data.reply_text,
              time: Date.now(),
            },
          ]);

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

  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-b from-slate-950/90 via-slate-900/95 to-slate-950/90 rounded-[2rem] border border-amber-400/50 shadow-[0_0_50px_rgba(250,204,21,0.25)] flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-amber-400/30 bg-slate-950/90">
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
