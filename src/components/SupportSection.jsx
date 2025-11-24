// src/components/SupportSection.jsx
import React, { useState } from "react";

const FAQ_ITEMS = [
  {
    id: 1,
    question: "Is EMOTI a real therapist?",
    answer:
      "No. EMOTI is an AI emotional companion meant for listening, gentle reflections, and small suggestions. It cannot replace professional mental health care.",
  },
  {
    id: 2,
    question: "Is my conversation private?",
    answer:
      "Your chats are processed by AI. We don’t show your messages to other users. Avoid sharing very personal details such as full names, addresses, or financial information.",
  },
  {
    id: 3,
    question: "What’s included in EMOTI Premium?",
    answer:
      "Premium unlocks the dedicated premium chatroom, mood dashboard, AI emotion images, Calm Companion voice scripts, mood-based playlists, and private journaling tools.",
  },
  {
    id: 4,
    question: "How do I reach support if something feels off?",
    answer:
      "You can email emotisupport@gmail.com or call/WhatsApp 8001164172. If you ever feel unsafe, please contact local emergency services or trusted people immediately.",
  },
];

export default function SupportSection() {
  const [openId, setOpenId] = useState(FAQ_ITEMS[0].id);

  const toggle = (id) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="border-t border-slate-800 bg-slate-950/95">
      {/* subtle glow */}
      <div className="relative max-w-6xl mx-auto px-4 py-10 md:py-12">
        <div className="pointer-events-none absolute -top-10 right-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative grid md:grid-cols-3 gap-8 text-sm">
          {/* CONTACT COLUMN */}
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80">
              Support
            </p>
            <h2 className="text-lg md:text-xl font-semibold text-slate-50">
              Need help with EMOTI?
            </h2>
            <p className="text-slate-400 text-sm">
              Reach out anytime for account issues, payment questions, or
              feedback. We try to respond within 24 hours.
            </p>

            <div className="mt-3 space-y-2 text-slate-200">
              <p>
                📧 Email:{" "}
                <a
                  href="mailto:emotisupport@gmail.com"
                  className="text-sky-300 hover:underline"
                >
                  emotisupport@gmail.com
                </a>
              </p>
              <p>
                📞 Phone / WhatsApp:{" "}
                <a
                  href="tel:+918001164172"
                  className="text-sky-300 hover:underline"
                >
                  8001164172
                </a>
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3 text-[11px] text-slate-400">
              EMOTI is an AI companion, not a crisis service. If you feel in
              danger or have thoughts of self-harm, please contact local
              helplines or emergency services immediately.
            </div>
          </div>

          {/* FAQ ACCORDION (2 columns wide on desktop) */}
          <div className="md:col-span-2">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">
              FAQs · quick answers
            </h3>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item) => {
                const isOpen = openId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left text-sm text-slate-200"
                    >
                      <span>{item.question}</span>
                      <span
                        className={`ml-3 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-[11px] transition-transform ${
                          isOpen ? "rotate-90 border-emerald-400" : ""
                        }`}
                      >
                        ▸
                      </span>
                    </button>
                    <div
                      className={`px-4 pb-3 text-[13px] text-slate-400 transition-all duration-300 ease-out ${
                        isOpen
                          ? "max-h-40 opacity-100"
                          : "max-h-0 opacity-0 pointer-events-none"
                      }`}
                    >
                      {item.answer}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className="relative mt-8 text-center text-[11px] text-slate-500">
          For billing or technical issues, mention your registered email when
          you contact support.
        </p>
      </div>
    </section>
  );
}
