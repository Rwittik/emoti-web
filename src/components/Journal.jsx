// src/components/Journal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";

/**
 * Premium / usable Journal for busy users
 *
 * Features:
 * - Quick-capture (Busy Mode)
 * - Daily Suggestion box
 * - Quick templates & prompts
 * - Streak + simple stats
 * - Export / Import JSON
 * - Pin / favorite entries
 * - Draft autosave
 * - Compact / expanded list toggle
 * - Keeps localStorage based persistence (same key pattern as before)
 *
 * Note: This remains client-only (no remote Firestore writes here).
 */

/* ------------------------
   Config / helpers
   ------------------------ */

const MOOD_OPTIONS = [
  { id: "low", label: "Heavy", emoji: "😢", color: "bg-rose-400" },
  { id: "okay", label: "Mixed", emoji: "😐", color: "bg-amber-400" },
  { id: "high", label: "Light", emoji: "😌", color: "bg-sky-400" },
  { id: "grateful", label: "Grateful", emoji: "🙏", color: "bg-emerald-400" },
];

function basicSentiment(text) {
  const t = (text || "").toLowerCase();
  const negativeWords = [
    "sad",
    "anxious",
    "overwhelmed",
    "lonely",
    "tired",
    "angry",
    "guilty",
  ];
  const positiveWords = [
    "grateful",
    "happy",
    "hopeful",
    "excited",
    "calm",
    "peaceful",
  ];

  let score = 0;
  negativeWords.forEach((w) => {
    if (t.includes(w)) score -= 1;
  });
  positiveWords.forEach((w) => {
    if (t.includes(w)) score += 1;
  });

  if (score <= -1) return "low";
  if (score >= 1) return "high";
  return "okay";
}

function formatCreatedAt(createdAt) {
  try {
    if (!createdAt) return "";
    if (typeof createdAt === "number") {
      return new Date(createdAt).toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (createdAt.toDate) {
      return createdAt.toDate().toLocaleString([], {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return String(createdAt);
  } catch {
    return "";
  }
}

// simple streak calc: how many distinct recent nights in a row with at least one entry
function calcNightStreak(entries) {
  if (!entries || !entries.length) return 0;
  const days = new Set(
    entries.map((e) => new Date(e.createdAt).toISOString().slice(0, 10))
  );
  const today = new Date();
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) streak++;
    else break;
  }
  return streak;
}

// sample daily suggestions (rotate / randomize)
const DAILY_SUGGESTIONS = [
  "🧘 Take a 2-minute belly breath — slow in, slow out.",
  "✍️ Write one sentence about a small win today, however tiny.",
  "☕ Make a warm cup and sit quietly for 60 seconds.",
  "📞 If you can, text one friend: “thinking of you” — small connection helps.",
  "🌙 Try writing 3 things you’d like tomorrow to feel like.",
];

// quick templates for busy users
const QUICK_TEMPLATES = [
  "One thing that made me smile today was…",
  "I’m feeling heavy because…",
  "A small thing I can control right now is…",
  "Something I’m grateful for today: …",
  "A tiny step I can take tonight is…",
];

/* ------------------------
   Component
   ------------------------ */

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");
  const [moodTag, setMoodTag] = useState("okay");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMood, setFilterMood] = useState("all");

  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);

  const [compactView, setCompactView] = useState(true);
  const [busyMode, setBusyMode] = useState(false); // quick-capture small input
  const [dailySuggestion, setDailySuggestion] = useState("");
  const [draftKey, setDraftKey] = useState(null);
  const draftTimerRef = useRef(null);

  const storageKey = user ? `emoti_journal_${user.uid}` : null;
  const draftStorageKey = user ? `emoti_journal_draft_${user.uid}` : null;

  // ----- load on mount -----
  useEffect(() => {
    // choose a daily suggestion (persist for the day)
    try {
      const pickKey = user ? `emoti_daily_suggest_${user.uid}` : "emoti_daily_suggest_guest";
      const stored = window.localStorage.getItem(pickKey);
      const todayKey = new Date().toISOString().slice(0, 10);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === todayKey && parsed.text) {
          setDailySuggestion(parsed.text);
        } else {
          const pick = DAILY_SUGGESTIONS[Math.floor(Math.random() * DAILY_SUGGESTIONS.length)];
          window.localStorage.setItem(pickKey, JSON.stringify({ date: todayKey, text: pick }));
          setDailySuggestion(pick);
        }
      } else {
        const pick = DAILY_SUGGESTIONS[Math.floor(Math.random() * DAILY_SUGGESTIONS.length)];
        window.localStorage.setItem(pickKey, JSON.stringify({ date: todayKey, text: pick }));
        setDailySuggestion(pick);
      }
    } catch (err) {
      setDailySuggestion(DAILY_SUGGESTIONS[0]);
    }
  }, [user]);

  // ----- load entries -----
  useEffect(() => {
    if (!user || !storageKey) {
      setEntries([]);
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setEntries([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setEntries(parsed);
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error("Failed to load journal from localStorage:", err);
      setEntries([]);
    }
  }, [user, storageKey]);

  // ----- persist entries -----
  useEffect(() => {
    if (!user || !storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch (err) {
      console.error("Failed to save journal to localStorage:", err);
    }
  }, [entries, user, storageKey]);

  // ----- draft autosave -----
  useEffect(() => {
    if (!user || !draftStorageKey) return;
    // load draft once
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.text) {
          setText(parsed.text);
          setMoodTag(parsed.mood || "okay");
          setDraftKey(parsed.key || null);
        }
      }
    } catch (err) {
      // ignore
    }

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [user, draftStorageKey]);

  // autosave draft on text/mood change (debounced)
  useEffect(() => {
    if (!user || !draftStorageKey) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try {
        const payload = { text, mood: moodTag, key: draftKey || Date.now().toString() };
        window.localStorage.setItem(draftStorageKey, JSON.stringify(payload));
        setDraftKey(payload.key);
      } catch (err) {
        // ignore
      }
    }, 700); // small debounce
  }, [text, moodTag, user, draftStorageKey, draftKey]);

  // ----- quick helpers -----
  const startEdit = (entry) => {
    setEditingId(entry.id);
    setText(entry.text || "");
    setMoodTag(entry.mood || "okay");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setText("");
    setMoodTag("okay");
    // clear draft
    try {
      if (draftStorageKey) window.localStorage.removeItem(draftStorageKey);
    } catch {}
  };

  const handleDelete = (id) => {
    if (!user) return;
    const confirmDelete = window.confirm("Delete this journal entry?");
    if (!confirmDelete) return;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (editingId === id) cancelEdit();
  };

  // save or update entry
  const handleSave = () => {
    if (!user || !text.trim()) return;
    setSaving(true);
    try {
      const sentiment = basicSentiment(text);
      const now = Date.now();

      if (editingId) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === editingId
              ? {
                  ...e,
                  text: text.trim(),
                  mood: moodTag,
                  sentiment,
                  updatedAt: now,
                }
              : e
          )
        );
      } else {
        const newEntry = {
          id: `${now}_${Math.random().toString(16).slice(2)}`,
          text: text.trim(),
          mood: moodTag,
          sentiment,
          createdAt: now,
          updatedAt: now,
          pinned: false,
        };
        setEntries((prev) => [newEntry, ...prev]);
      }

      // clear editor + draft
      setText("");
      setMoodTag("okay");
      setEditingId(null);
      try {
        if (draftStorageKey) window.localStorage.removeItem(draftStorageKey);
      } catch {}
    } catch (err) {
      console.error("Failed to save journal entry:", err);
      alert("Could not save your entry locally. Please try again.");
    } finally {
      // small visible delay
      setTimeout(() => setSaving(false), 250);
    }
  };

  // quick-capture one-line (busy mode)
  const quickCapture = (quickText) => {
    if (!user) return;
    const now = Date.now();
    const newEntry = {
      id: `${now}_${Math.random().toString(16).slice(2)}`,
      text: quickText,
      mood: basicSentiment(quickText),
      sentiment: basicSentiment(quickText),
      createdAt: now,
      updatedAt: now,
      pinned: false,
    };
    setEntries((prev) => [newEntry, ...prev]);
    // micro animation: focus on top
    setTimeout(() => {
      const el = document.querySelector("[data-entry-first]");
      if (el) el.animate([{ transform: "translateY(-6px)" }, { transform: "none" }], { duration: 280 });
    }, 80);
  };

  // toggle pin
  const togglePin = (id) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e)));
  };

  // export entries JSON
  const exportEntries = () => {
    try {
      const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `emoti_journal_${user?.uid || "data"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed.");
    }
  };

  // import JSON file (simple)
  const importFileRef = useRef(null);
  const handleImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed)) {
          alert("Invalid file format: expected an array of entries.");
          return;
        }
        const normalized = parsed.map((p) => ({
          ...p,
          id: p.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
          createdAt: p.createdAt || Date.now(),
          updatedAt: p.updatedAt || p.createdAt || Date.now(),
        }));
        // merge (dedupe by id)
        setEntries((prev) => {
          const existingIds = new Set(prev.map((x) => x.id));
          const toAdd = normalized.filter((x) => !existingIds.has(x.id));
          return [...toAdd, ...prev].sort((a, b) => b.createdAt - a.createdAt);
        });
      } catch (err) {
        alert("Failed to import file.");
      }
    };
    reader.readAsText(file);
  };

  // AI summary (same idea as before)
  const generateSummary = async () => {
    if (!entries.length || summarizing) return;
    setSummarizing(true);
    setSummary("");
    try {
      const latest = entries.slice(0, 25);
      const joined = latest
        .map((e) => {
          const tag = e.mood || e.sentiment || "mood";
          return `(${tag}) ${e.text}`;
        })
        .join("\n\n");

      const prompt =
        "You are EMOTI, a gentle emotional companion. Read these journal entries and give a short, kind summary in 4–5 lines. " +
        "Highlight the main feelings, any patterns, and one tiny suggestion for self-care.\n\n" +
        joined;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: prompt,
          language: "English",
          personality: "Friend",
        }),
      });

      const data = await res.json();
      setSummary(
        data.reply ||
          "I’m here with you. I couldn’t generate a summary right now, but your entries show a lot of courage."
      );
    } catch (err) {
      console.error("Failed to summarise journal:", err);
      setSummary(
        "I had trouble summarising your journal just now. Please try again in a bit."
      );
    } finally {
      setSummarizing(false);
    }
  };

  // filtered entries
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = entries.filter((e) => {
      const matchesMood =
        filterMood === "all" ||
        e.mood === filterMood ||
        e.sentiment === filterMood;
      const matchesSearch = !q || (e.text && e.text.toLowerCase().includes(q));
      return matchesMood && matchesSearch;
    });
    // keep pinned items on top
    matched.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
    return matched;
  }, [entries, searchQuery, filterMood]);

  const totalEntries = entries.length;
  const nightStreak = calcNightStreak(entries);

  if (!user) {
    return (
      <p className="text-sm text-slate-400">
        Sign in to keep a private emotional journal connected to your chats.
      </p>
    );
  }

  /* ------------------------
     UI Render
     ------------------------ */
  return (
    <div className="w-full max-w-6xl mx-auto mt-6 pb-6 space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950/85 to-slate-900/80 px-4 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-lg shadow-black/40">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300/80">
            EMOTI · Emotional journal
          </p>
          <h2 className="text-xl md:text-2xl font-semibold">
            A quiet place to notice how you’re doing
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl">
            Capture quick thoughts or longer reflections. EMOTI helps summarize
            patterns, nudges small actions, and keeps things private to you.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-700 px-4 py-2 text-[12px] text-slate-200 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Entries</span>
              <span className="font-semibold text-sky-300">{totalEntries}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Night streak</span>
              <span className="font-semibold text-emerald-300">{nightStreak} nights</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              title="Export entries"
              onClick={exportEntries}
              className="px-3 py-1 rounded-full border border-slate-700 text-[11px] text-slate-200 hover:border-sky-400"
            >
              Export
            </button>

            <input
              ref={importFileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => handleImport(e.target.files?.[0])}
            />
            <button
              onClick={() => importFileRef.current?.click()}
              className="px-3 py-1 rounded-full border border-slate-700 text-[11px] text-slate-200 hover:border-emerald-300"
              title="Import JSON"
            >
              Import
            </button>

            <button
              onClick={() => { setBusyMode((s) => !s); setCompactView(true); }}
              className={`px-3 py-1 rounded-full text-[11px] font-medium ${
                busyMode ? "bg-emerald-500 text-slate-900" : "border border-slate-700 text-slate-200"
              }`}
              title="Toggle busy (quick-capture) mode"
            >
              {busyMode ? "Busy mode" : "Normal"}
            </button>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.75fr)] gap-5 items-start">
        {/* Left: editor + daily suggestion + AI summary */}
        <div className="space-y-4">
          {/* Daily suggestion & quick templates */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/90 to-slate-900/80 p-4 md:p-5 shadow-lg shadow-black/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-slate-950 text-lg shadow-md">
                🙂
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-amber-300/80 uppercase tracking-[0.14em]">Today’s suggestion</p>
                    <p className="font-semibold mt-1">{dailySuggestion}</p>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <button
                      onClick={() => {
                        const pick = DAILY_SUGGESTIONS[Math.floor(Math.random() * DAILY_SUGGESTIONS.length)];
                        setDailySuggestion(pick);
                      }}
                      className="px-2 py-1 rounded-full border border-slate-700 text-slate-200"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_TEMPLATES.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setText((s) => (s ? `${s}\n\n${t}` : t))}
                      className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900/80 text-[12px] text-slate-200 hover:border-sky-400"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Editor / Quick-capture */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/85 p-4 md:p-5 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-semibold">{editingId ? "Edit entry" : busyMode ? "Quick capture" : "New reflection"}</h3>
                <p className="text-[11px] text-slate-400">
                  {busyMode ? "Tap a template or type a short note — save with one tap." : "Write anything — EMOTI will softly tag mood and keep this private."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-[11px] text-slate-400 mr-2 hidden sm:block">Auto sentiment: <span className="capitalize ml-1">{basicSentiment(text || "")}</span></div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[12px] text-slate-400">
                    <span className="hidden sm:inline">View</span>
                    <button
                      onClick={() => setCompactView((s) => !s)}
                      className="px-2 py-1 rounded-full border border-slate-700 text-slate-200"
                      title="Toggle compact/expanded list"
                    >
                      {compactView ? "Compact" : "Expanded"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* mood chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {MOOD_OPTIONS.map((m) => {
                const active = moodTag === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMoodTag(m.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border transition text-[13px] ${
                      active ? `${m.color} bg-opacity-20 border-amber-300 text-amber-100 shadow-sm` : "bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Editor area */}
            {!busyMode ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="What felt heavy or light today? You can write in any language mix..."
                className="w-full rounded-2xl bg-slate-950 border border-slate-700 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 min-h-[140px]"
              />
            ) : (
              <div className="flex gap-2 items-center">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="One-line note…"
                  className="flex-1 rounded-full bg-slate-950 border border-slate-700 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (!text.trim()) return;
                    quickCapture(text.trim());
                    setText("");
                  }}
                  className="px-4 py-2 rounded-full bg-emerald-400 text-slate-900 font-semibold shadow-md hover:scale-[1.02] transform transition"
                >
                  Capture
                </button>
              </div>
            )}

            {/* actions */}
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px] text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Private to you · saved locally</span>
              </div>

              <div className="flex items-center gap-2">
                {editingId && (
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 rounded-full border border-slate-700 text-[12px] text-slate-200 hover:border-sky-400"
                  >
                    Cancel
                  </button>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving || !text.trim()}
                  className="px-4 py-1.5 rounded-full bg-sky-500 text-slate-900 text-[13px] font-semibold hover:bg-sky-400 disabled:opacity-60 transform transition"
                >
                  {saving ? "Saving…" : editingId ? "Save changes" : "Save entry"}
                </button>
              </div>
            </div>
          </div>

          {/* AI summary */}
          <div className="rounded-3xl border border-violet-400/30 bg-slate-950/95 p-4 md:p-5 shadow-lg shadow-violet-500/20">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-violet-300/80">AI reflection</p>
                <h3 className="text-sm font-semibold">Soft summary of recent entries</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateSummary}
                  disabled={!entries.length || summarizing}
                  className="px-3 py-1.5 rounded-full bg-violet-500/90 text-slate-950 text-[12px] font-semibold hover:bg-violet-400 disabled:opacity-60"
                >
                  {summarizing ? "Summarising…" : "Summarise last entries"}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-2">EMOTI reads a slice of your recent entries and reflects back the main feelings and a tiny suggestion.</p>

            <div className="text-xs text-slate-200 bg-slate-950/80 border border-slate-800 rounded-2xl px-3 py-3 min-h-[88px] whitespace-pre-wrap">
              {summary ? summary : "No summary yet. Save a few entries and tap “Summarise last entries”. 💙"}
            </div>
          </div>
        </div>

        {/* Right: list, search, filters */}
        <div className="space-y-3">
          {/* Search + mood filter */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[12px]">
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search entries, feelings, names..."
                className="flex-1 rounded-full bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterMood("all")}
                className={`px-3 py-1 rounded-full ${filterMood === "all" ? "border border-sky-400 bg-sky-500/10 text-sky-200" : "border border-slate-700 bg-slate-900 text-slate-300"}`}
              >
                All
              </button>
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setFilterMood(m.id)}
                  className={`px-3 py-1 rounded-full inline-flex items-center gap-2 ${filterMood === m.id ? `border border-amber-300 bg-amber-400/10 text-amber-100` : "border border-slate-700 bg-slate-900 text-slate-300"}`}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Entries list */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/85 p-4 md:p-5 max-h-[520px] min-h-[220px] overflow-y-auto shadow-xl shadow-black/40">
            {filteredEntries.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-xs text-slate-500 text-center max-w-sm">No entries yet with this filter. Try writing your first reflection.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((e, idx) => {
                  const created = formatCreatedAt(e.createdAt);
                  const moodObj = MOOD_OPTIONS.find((m) => m.id === e.mood) || MOOD_OPTIONS[1];
                  const isFirst = idx === 0;

                  return (
                    <article
                      key={e.id}
                      data-entry-first={isFirst ? "1" : undefined}
                      className={`group relative border border-slate-800 rounded-2xl px-3 py-3 bg-slate-900/80 hover:border-sky-400/60 transition ${compactView ? "text-sm" : "text-base"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${moodObj.color} text-slate-950 font-semibold shadow-sm`}>
                            {moodObj.emoji}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-[12px] text-slate-300 font-semibold truncate">{e.mood || e.sentiment || "okay"}</div>
                              {created && <div className="text-[11px] text-slate-500">{created}</div>}
                              {e.pinned && <div className="ml-2 text-[11px] text-amber-300">Pinned</div>}
                            </div>
                            <p className={`mt-1 ${compactView ? "text-sm leading-snug" : "text-base leading-relaxed"} text-slate-200 whitespace-pre-wrap`}>{e.text}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition text-[11px]">
                          <button
                            onClick={() => startEdit(e)}
                            className="px-2 py-0.5 rounded-full border border-slate-600 hover:border-sky-400 text-slate-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => togglePin(e.id)}
                            className={`px-2 py-0.5 rounded-full border ${e.pinned ? "border-amber-300 text-amber-200" : "border-slate-600 text-slate-300"}`}
                          >
                            {e.pinned ? "Unpin" : "Pin"}
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText?.(e.text || "");
                              // micro feedback
                              const el = document.createElement("div");
                              el.textContent = "Copied";
                              el.style.position = "fixed";
                              el.style.right = "12px";
                              el.style.top = "12px";
                              el.style.padding = "8px 10px";
                              el.style.borderRadius = "10px";
                              el.style.background = "rgba(2,6,23,0.9)";
                              el.style.color = "white";
                              el.style.zIndex = 9999;
                              document.body.appendChild(el);
                              setTimeout(() => el.remove(), 900);
                            }}
                            className="px-2 py-0.5 rounded-full border border-slate-600 text-slate-300"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="px-2 py-0.5 rounded-full border border-rose-400/60 text-rose-300 hover:bg-rose-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
