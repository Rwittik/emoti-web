// src/components/Chat.jsx
import React, { useEffect, useRef, useState } from "react";

const API_URL = "/api/chat"; // works with mock (proxy) + real Vercel api/chat

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: "emoti",
      text: "Hi — I'm EMOTI. How are you feeling today?",
      time: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [personality, setPersonality] = useState("Friend");
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;

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
      const res = await fetch(API_ROUTE, {
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
            text: "Server unavailable — please try again.",
            time: Date.now(),
          },
        ]);
        return;
      }

      const data = await res.json();
      const reply = data.reply || "Thank you for sharing. Tell me more.";
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 2,
          from: "emoti",
          text: reply,
          time: Date.now(),
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

  return (
    <div className="w-full max-w-2xl bg-slate-900/70 backdrop-blur rounded-2xl shadow-lg border border-slate-800 flex flex-col overflow-hidden">
      {/* header row inside card */}
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

      {/* messages */}
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
              <div>{msg.text}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                {formatTime(msg.time)}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex">
            <div className="bg-slate-800 p-2 rounded-xl text-xs text-slate-300">
              Thinking…
            </div>
          </div>
        )}
      </main>

      {/* input */}
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
        </div>
      </footer>
    </div>
  );
}
