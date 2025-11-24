// src/components/SupportFab.jsx
import React, { useState } from "react";

export default function SupportFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-emerald-500 text-slate-950 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 shadow-lg shadow-emerald-500/40 hover:bg-emerald-400 transition"
      >
        <span className="hidden sm:inline">Need support?</span>
        <span className="sm:hidden">Help</span>
        <span className="h-2 w-2 rounded-full bg-emerald-900/70 border border-emerald-900" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* card */}
          <div className="relative max-w-md w-full mx-4 rounded-3xl bg-slate-950 border border-slate-700 shadow-2xl shadow-black/60 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 mb-1">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-300/80">
                  EMOTI Support
                </p>
                <h2 className="text-sm font-semibold text-slate-50">
                  How can we help?
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-full border border-slate-600 text-slate-300 text-xs flex items-center justify-center hover:border-rose-400 hover:text-rose-200 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-sm text-slate-300">
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
                📞 Call / WhatsApp:{" "}
                <a
                  href="tel:+918001164172"
                  className="text-sky-300 hover:underline"
                >
                  8001164172
                </a>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <a
                href="mailto:emotisupport@gmail.com?subject=EMOTI%20Support%20request"
                className="rounded-2xl border border-sky-500/60 bg-sky-500/10 px-3 py-2 hover:bg-sky-500/20 transition"
              >
                <p className="font-semibold text-sky-200 mb-0.5">
                  Email support
                </p>
                <p className="text-slate-300">
                  Describe your issue in a few lines.
                </p>
              </a>
              <a
                href="tel:+918001164172"
                className="rounded-2xl border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 hover:bg-emerald-500/20 transition"
              >
                <p className="font-semibold text-emerald-200 mb-0.5">
                  Call / WhatsApp
                </p>
                <p className="text-slate-300">Best for quick questions.</p>
              </a>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-400">
              EMOTI is not a crisis or emergency service. If you feel unsafe or
              at risk of self-harm, please contact local helplines or emergency
              services immediately.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
