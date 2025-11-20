// src/App.jsx
const [recording, setRecording] = useState(false);
const mediaRecorderRef = useRef(null);


import React, { useRef } from "react";
import Chat from "./components/chat";

export default function App() {
  const chatRef = useRef(null);

  const scrollToChat = () => {
    if (chatRef.current) {
      chatRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#38bdf8] flex items-center justify-center text-xs font-bold">
              E
            </div>
            <span className="font-semibold tracking-wide">EMOTI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <button onClick={scrollToChat} className="hover:text-sky-300">
              Chat
            </button>
            <a href="#how-it-works" className="hover:text-sky-300">
              How it works
            </a>
            <a href="#features" className="hover:text-sky-300">
              Features
            </a>
          </div>
          <button
            onClick={scrollToChat}
            className="text-xs md:text-sm bg-sky-500 hover:bg-sky-400 text-white px-3 py-1.5 rounded-full"
          >
            Start chatting
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="border-b border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-400 mb-3">
              Made for students & young adults
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              An anonymous emotional companion
              <span className="text-sky-400"> for India</span>.
            </h1>
            <p className="mt-4 text-sm md:text-base text-slate-300 max-w-xl">
              Talk about exam stress, breakups, career confusion, or just a bad
              day — in your own language. EMOTI listens without judging and
              replies in a warm, human tone.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={scrollToChat}
                className="bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 rounded-full text-sm font-medium"
              >
                Start chatting now
              </button>
              <span className="text-xs text-slate-400">
                No login required · Free to try
              </span>
            </div>
          </div>

          {/* Quick stats / highlights */}
          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400 mb-1">Multilingual support</p>
              <p className="text-sm">
                Chat in{" "}
                <span className="text-sky-300">
                  Hindi, Odia, Bengali, Tamil, Telugu, Marathi, English
                </span>{" "}
                and more.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400 mb-1">
                Anonymous & always available
              </p>
              <p className="text-sm">
                No awkward small talk. EMOTI is here at{" "}
                <span className="text-sky-300">2 AM</span> when you can’t text
                anyone else.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400 mb-1">Not a therapist</p>
              <p className="text-sm">
                EMOTI is an AI companion, not a replacement for professional
                help. For crisis situations, you’ll always see helpline
                guidance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="border-b border-slate-800 bg-slate-950"
      >
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
          <h2 className="text-xl md:text-2xl font-semibold mb-6">
            How EMOTI works
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="text-sky-400 text-xs font-semibold mb-1">
                1 · Share how you feel
              </div>
              <p className="text-slate-300">
                Type exactly what’s on your mind — in any mix of English +
                local language. No need to sound “perfect”.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="text-sky-400 text-xs font-semibold mb-1">
                2 · EMOTI listens & reflects
              </div>
              <p className="text-slate-300">
                The AI understands the emotion behind your words and responds
                with empathy, not lectures.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="text-sky-400 text-xs font-semibold mb-1">
                3 · Get gentle suggestions
              </div>
              <p className="text-slate-300">
                Receive small, practical steps you can try — journaling
                prompts, reframing, or simple self-care ideas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="border-b border-slate-800 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
          <h2 className="text-xl md:text-2xl font-semibold mb-6">
            Built for Indian students & young professionals
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="font-medium mb-2">Language flexibility</h3>
              <p className="text-slate-300">
                Switch language and personality on the fly — talk like you do
                with close friends.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="font-medium mb-2">Always on your side</h3>
              <p className="text-slate-300">
                No judging, scolding, or shaming. EMOTI aims to validate your
                feelings and gently guide you.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="font-medium mb-2">Privacy first</h3>
              <p className="text-slate-300">
                Conversations are processed by AI — you’ll clearly see a note
                that it’s not a human therapist and what data is stored.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CHAT SECTION */}
      <section
        ref={chatRef}
        id="chat"
        className="bg-gradient-to-b from-slate-950 to-slate-900"
      >
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 flex flex-col items-center gap-4">
          <h2 className="text-xl md:text-2xl font-semibold mb-2 text-center">
            Try EMOTI now
          </h2>
          <p className="text-sm text-slate-300 mb-4 text-center max-w-xl">
            This is an experimental AI companion. It may make mistakes. For
            urgent situations or thoughts of self-harm, please contact a
            trusted person or local helplines immediately.
          </p>

          <Chat />

          <p className="mt-3 text-[11px] text-slate-400 max-w-xl text-center">
            EMOTI does not provide medical, legal, or financial advice. It is
            not a substitute for professional mental health care.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 py-4 text-[11px] text-slate-500 flex flex-col md:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} EMOTI · Made in India</span>
          <span>
            If you are in crisis or danger, contact local emergency services or
            mental health helplines immediately.
          </span>
        </div>
      </footer>
    </div>
  );
}
