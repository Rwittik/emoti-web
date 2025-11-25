// src/components/Journal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";

/**
 * Upgraded Journal.jsx
 * - Premium header image (local asset)
 * - Guided prompt carousel
 * - Daily reflection challenge (persisted in localStorage)
 * - Pin / favorite / export entry actions
 * - "Refine with EMOTI" button that calls /api/chat to produce a nicer draft (keeps existing pattern)
 *
 * NOTE: This file references a local image you uploaded. Path used:
 * /mnt/data/08f2e097-0f6c-4517-abaf-74c31be6d4d5.png
 */

const MOOD_OPTIONS = [
  { id: "low", label: "Heavy", emoji: "😢" },
  { id: "okay", label: "Mixed", emoji: "😐" },
  { id: "high", label: "Light", emoji: "😌" },
  { id: "grateful", label: "Grateful", emoji: "🙏" },
];

const HEADER_IMAGE = "/mnt/data/08f2e097-0f6c-4517-abaf-74c31be6d4d5.png";

function basicSentiment(text) {
  const t = (text || "").toLowerCase();
  const negativeWords = ["sad", "anxious", "overwhelmed", "lonely", "tired", "angry", "guilty"];
  const positiveWords = ["grateful", "happy", "hopeful", "excited", "calm", "peaceful"];
  let score = 0;
  negativeWords.forEach((w) => { if (t.includes(w)) score -= 1; });
  positiveWords.forEach((w) => { if (t.includes(w)) score += 1; });
  if (score <= -1) return "low";
  if (score >= 1) return "high";
  return "okay";
}

function formatCreatedAt(createdAt) {
  try {
    if (!createdAt) return "";
    if (typeof createdAt === "number") {
      return new Date(createdAt).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    }
    if (createdAt.toDate) {
      return createdAt.toDate().toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    }
    return String(createdAt);
  } catch { return ""; }
}

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
  const [isRefining, setIsRefining] = useState(false);
  const [favorites, setFavorites] = useState(() => (typeof window !== "undefined" ? JSON.parse(window.localStorage.getItem("emoti_journal_favs") || "[]") : []));
  const [pinnedId, setPinnedId] = useState(() => (typeof window !== "undefined" ? window.localStorage.getItem("emoti_journal_pinned") : null));

  // Guided prompts carousel state
  const PROMPTS = [
    "Name one small win from today (even tiny counts).",
    "Describe one feeling and where you feel it in your body.",
    "If today were a weather, what would it be? Why?",
    "Write one thing you're grateful for right now.",
  ];
  const [promptIndex, setPromptIndex] = useState(0);

  // daily reflection challenge state (persisted per-user)
  const challengeKey = user ? `emoti_daily_challenge_${user.uid}` : null;
  const storageKey = user ? `emoti_journal_${user.uid}` : null;

  const [challengeState, setChallengeState] = useState(() => {
    try {
      if (typeof window === "undefined" || !challengeKey) return { date: null, done: false };
      const raw = window.localStorage.getItem(challengeKey);
      return raw ? JSON.parse(raw) : { date: null, done: false };
    } catch { return { date: null, done: false }; }
  });

  // load entries
  useEffect(() => {
    if (!user || !storageKey) { setEntries([]); return; }
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setEntries(Array.isArray(parsed) ? parsed : []);
    } catch (err) { console.error(err); setEntries([]); }
  }, [user, storageKey]);

  // persist entries + favorites + pinned state
  useEffect(() => {
    if (!user || !storageKey) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(entries)); } catch (err) { console.error(err); }
  }, [entries, user, storageKey]);

  useEffect(() => {
    try { window.localStorage.setItem("emoti_journal_favs", JSON.stringify(favorites)); } catch {}
  }, [favorites]);

  useEffect(() => {
    try { if (pinnedId) window.localStorage.setItem("emoti_journal_pinned", pinnedId); else window.localStorage.removeItem("emoti_journal_pinned"); } catch {}
  }, [pinnedId]);

  useEffect(() => {
    // ensure challenge resets each day
    if (!challengeKey || typeof window === "undefined") return;
    const today = new Date().toISOString().slice(0, 10);
    if (challengeState.date !== today) {
      const next = { date: today, done: false };
      setChallengeState(next);
      try { window.localStorage.setItem(challengeKey, JSON.stringify(next)); } catch (err) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // STREAK: compute consecutive days with entries (simple)
  const streak = useMemo(() => {
    if (!entries.length) return 0;
    const seen = new Set(entries.map(e => new Date(e.createdAt).toISOString().slice(0, 10)));
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (seen.has(key)) s++; else break;
    }
    return s;
  }, [entries]);

  // Save / Edit entry
  const handleSave = () => {
    if (!user || !text.trim()) return;
    setSaving(true);
    try {
      const sentiment = basicSentiment(text);
      const now = Date.now();
      if (editingId) {
        setEntries(prev => prev.map(e => e.id === editingId ? { ...e, text: text.trim(), mood: moodTag, sentiment, updatedAt: now } : e));
      } else {
        const newEntry = { id: `${now}_${Math.random().toString(16).slice(2)}`, text: text.trim(), mood: moodTag, sentiment, createdAt: now, updatedAt: now };
        setEntries(prev => [newEntry, ...prev]);
      }
      // mark today's challenge as done if user saved
      try {
        if (challengeKey) {
          const today = new Date().toISOString().slice(0, 10);
          const next = { date: today, done: true };
          setChallengeState(next);
          window.localStorage.setItem(challengeKey, JSON.stringify(next));
        }
      } catch {}
      setText(""); setMoodTag("okay"); setEditingId(null);
    } catch (err) { console.error(err); alert("Could not save entry."); }
    finally { setTimeout(() => setSaving(false), 200); }
  };

  const startEdit = (entry) => { setEditingId(entry.id); setText(entry.text || ""); setMoodTag(entry.mood || "okay"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const cancelEdit = () => { setEditingId(null); setText(""); setMoodTag("okay"); };
  const handleDelete = (id) => { if (!user) return; if (!confirm("Delete this journal entry?")) return; setEntries(prev => prev.filter(e => e.id !== id)); if (editingId === id) cancelEdit(); };

  // favorites + pin + export
  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev]);
  };

  const togglePin = (id) => {
    setPinnedId(prev => (prev === id ? null : id));
  };

  const exportEntry = (entry) => {
    try {
      const blob = new Blob([`Journal entry — ${formatCreatedAt(entry.createdAt)}\n\n${entry.text}`], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `emoti_journal_${entry.id}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("export failed", err);
      alert("Could not export entry.");
    }
  };

  // Refine entry with EMOTI (paraphrase / tidy)
  const refineEntry = async (entry) => {
    if (!entry) return;
    setIsRefining(true);
    try {
      const prompt = `You are EMOTI, a gentle emotional companion. Improve this journal entry to be kinder and clearer, keeping the same feelings and voice. Make it 2-4 sentences.\n\nEntry:\n${entry.text}`;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prompt, language: "English", personality: "Friend" }),
      });
      const data = await res.json();
      if (data?.reply) {
        // create an editable draft entry prefilled with refined text
        setEditingId(null);
        setText(data.reply);
        setMoodTag(entry.mood || "okay");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        alert("EMOTI couldn't refine this right now.");
      }
    } catch (err) {
      console.error("refine error", err);
      alert("Refine failed. Try again later.");
    } finally {
      setIsRefining(false);
    }
  };

  // filtered entries
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesMood = filterMood === "all" || e.mood === filterMood || e.sentiment === filterMood;
      const matchesSearch = !q || (e.text && e.text.toLowerCase().includes(q));
      return matchesMood && matchesSearch;
    }).sort((a,b) => b.createdAt - a.createdAt);
  }, [entries, searchQuery, filterMood]);

  // AI summary (calls your /api/chat)
  const generateSummary = async () => {
    if (!entries.length || summarizing) return;
    setSummarizing(true);
    setSummary("");
    try {
      const latest = entries.slice(0, 25);
      const joined = latest.map(e => `(${e.mood || e.sentiment || "mood"}) ${e.text}`).join("\n\n");
      const prompt = "You are EMOTI, a gentle companion. Read these journal entries and give a short kind summary in 4–5 lines. Highlight main feelings and one tiny suggestion.\n\n" + joined;
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: prompt, language: "English", personality: "Friend" }) });
      const data = await res.json();
      setSummary(data.reply || "I’m here. I couldn't generate a summary.");
    } catch (err) {
      console.error("summarise error", err);
      setSummary("I had trouble summarising your journal right now. Try again later.");
    } finally { setSummarizing(false); }
  };

  // Quick templates
  const insertTemplate = (type) => {
    if (type === "gratitude") setText(prev => prev ? prev + "\n\nI am grateful for: " : "I am grateful for: ");
    if (type === "two-sent") setText(prev => prev ? prev + "\n\nTwo-sentence check: " : "Two-sentence check: ");
  };

  // small helper: create draft from image reflection (compat)
  const createJournalFromImage = (imgTitle, mood = "okay") => {
    if (!user) {
      alert("Sign in to save this reflection to your journal.");
      return;
    }
    const now = Date.now();
    const draft = {
      id: `${now}_${Math.random().toString(16).slice(2)}`,
      text: `Reflection on "${imgTitle}":\nWhat I notice: `,
      mood,
      sentiment: mood === "low" ? "low" : mood === "high" ? "high" : "okay",
      createdAt: now,
      updatedAt: now,
    };
    setEntries(prev => [draft, ...prev]);
    alert("Draft created in your journal.");
  };

  if (!user) {
    return <p className="text-sm text-slate-400">Sign in to keep a private emotional journal connected to your chats.</p>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto mt-6 pb-8 space-y-6">
      {/* Header with premium image */}
      <div className="rounded-3xl overflow-hidden relative border border-slate-800 bg-gradient-to-b from-slate-950/90 to-slate-900/70 shadow-2xl">
        <img src={HEADER_IMAGE} alt="Journal header" className="w-full h-44 object-cover opacity-95" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="p-6 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300/80">EMOTI · Emotional journal</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-50">A quiet place to empty your heart</h2>
            <p className="text-sm text-slate-300 max-w-xl mt-1">Capture small reflections. EMOTI tags mood and can gently summarize patterns. Your entries stay private. Premium touches make reflection easier.</p>
          </div>

          <div className="ml-4 rounded-2xl bg-slate-800/70 border border-amber-400/20 px-4 py-3 text-xs text-amber-50 shadow-lg">
            <div className="font-medium text-sm">Streak</div>
            <div className="text-right mt-1">
              <div className="text-2xl font-semibold">{streak}</div>
              <div className="text-[11px] text-slate-200">nights</div>
            </div>
            {streak >= 7 && <div className="mt-2 text-[11px] text-emerald-200">🔥 7-day streak — consistency badge</div>}
          </div>
        </div>
      </div>

      {/* main grid */}
      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] gap-5 items-start">
        <div className="space-y-4">
          {/* editor card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/85 p-4 md:p-5 shadow-xl shadow-black/40">
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{editingId ? "Edit entry" : "New reflection"}</h3>
                <span className="text-[11px] text-slate-400">Auto sentiment: <span className="capitalize">{basicSentiment(text || "")}</span></span>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                {MOOD_OPTIONS.map((m) => {
                  const active = moodTag === m.id;
                  return (
                    <button key={m.id} type="button" onClick={() => setMoodTag(m.id)} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border transition ${active ? "border-amber-300 bg-amber-400/10 text-amber-100 shadow-sm shadow-amber-500/30" : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500"}`}>
                      <span className="text-lg">{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="What felt heavy or light today? You can write in any language..." className="w-full rounded-2xl bg-slate-950 border border-slate-700 px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 min-h-[140px]" />

            {/* guided prompt carousel */}
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="text-[11px] text-slate-400">Need a prompt?</div>
                <div className="rounded-full bg-slate-900/80 border border-slate-700 px-3 py-1 text-[13px] text-slate-200 shadow-sm">{PROMPTS[promptIndex]}</div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => setPromptIndex((i) => (i - 1 + PROMPTS.length) % PROMPTS.length)} className="px-2 py-1 rounded-full border border-slate-700 text-slate-300 text-xs">◀</button>
                  <button onClick={() => setPromptIndex((i) => (i + 1) % PROMPTS.length)} className="px-2 py-1 rounded-full border border-slate-700 text-slate-300 text-xs">▶</button>
                </div>
                <button onClick={() => setText((t) => t ? t + "\n\n" + PROMPTS[promptIndex] : PROMPTS[promptIndex])} className="ml-2 px-3 py-1 rounded-full border border-sky-500 text-sky-300 text-xs">Use prompt</button>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={() => insertTemplate("gratitude")} className="px-3 py-1 rounded-full border border-slate-700 text-[11px] text-slate-300">Gratitude</button>
                <button type="button" onClick={() => insertTemplate("two-sent")} className="px-3 py-1 rounded-full border border-slate-700 text-[11px] text-slate-300">Two-sentence</button>
                {editingId && <button type="button" onClick={cancelEdit} className="px-3 py-1.5 rounded-full border border-slate-700 text-[11px] text-slate-300 hover:border-slate-500">Cancel</button>}
                <button type="button" onClick={handleSave} disabled={saving || !text.trim()} className="px-4 py-1.5 rounded-full bg-sky-500 text-slate-950 text-[11px] font-semibold hover:bg-sky-400 disabled:opacity-60">
                  {saving ? "Saving…" : editingId ? "Save changes" : "Save entry"}
                </button>
              </div>
            </div>
          </div>

          {/* AI summary */}
          <div className="rounded-3xl border border-violet-400/30 bg-gradient-to-br from-slate-950/95 to-slate-900/95 p-4 md:p-5 shadow-lg shadow-violet-500/15">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-violet-300/80">AI reflection</p>
                <h3 className="text-sm font-semibold">Soft summary of your journal</h3>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={generateSummary} disabled={!entries.length || summarizing} className="px-3 py-1.5 rounded-full bg-violet-500/90 text-slate-950 text-[11px] font-semibold hover:bg-violet-400 disabled:opacity-60">
                  {summarizing ? "Summarising…" : "Summarise"}
                </button>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(summary || ""); alert("Summary copied."); }} disabled={!summary} className="px-3 py-1.5 rounded-full border border-slate-700 text-[11px] text-slate-300">
                  Copy
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-2">EMOTI reads recent entries and reflects back the main feelings + a tiny suggestion.</p>
            <div className="text-xs text-slate-200 bg-slate-950/80 border border-slate-800 rounded-2xl px-3 py-3 min-h-[88px] whitespace-pre-wrap">
              {summary ? summary : "No summary yet. Save a few entries and tap “Summarise”. 💙"}
            </div>
          </div>
        </div>

        {/* RIGHT column: search/filter + list + challenge */}
        <div className="space-y-3">
          {/* search + filter */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-[11px]">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-slate-500 shrink-0">Search</span>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 rounded-full bg-slate-900 border border-slate-700 px-3 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400" placeholder="keywords, emotions..." />
            </div>
            <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2 md:mt-0">
              <button type="button" onClick={() => setFilterMood("all")} className={`px-3 py-1 rounded-full border ${filterMood === "all" ? "border-sky-400 bg-sky-500/10 text-sky-200" : "border-slate-700 bg-slate-900 text-slate-300"}`}>All</button>
              {MOOD_OPTIONS.map((m) => <button key={m.id} type="button" onClick={() => setFilterMood(m.id)} className={`px-3 py-1 rounded-full border inline-flex items-center gap-1 ${filterMood === m.id ? "border-amber-300 bg-amber-400/10 text-amber-100" : "border-slate-700 bg-slate-900 text-slate-300"}`}><span>{m.emoji}</span> {m.label}</button>)}
            </div>
          </div>

          {/* daily challenge */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-4 text-xs shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold">Daily reflection challenge</h4>
                <p className="text-slate-400 text-[12px]">Complete the small prompt below to keep the habit going.</p>
              </div>
              <div>
                <button onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const next = { date: today, done: !challengeState.done };
                  setChallengeState(next);
                  try { window.localStorage.setItem(challengeKey, JSON.stringify(next)); } catch {}
                }} className={`px-3 py-1 rounded-full text-[12px] ${challengeState.done ? "bg-emerald-400 text-slate-900" : "border border-slate-700 text-slate-300"}`}>
                  {challengeState.done ? "Completed ✓" : "Mark done"}
                </button>
              </div>
            </div>

            <div className="mt-3 text-slate-200">
              <div className="text-sm">Prompt</div>
              <div className="mt-1 px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-800 text-sm">
                Write one small thing that brought you comfort today.
              </div>
              <div className="mt-2 text-xs text-slate-400">Complete this each day to build a soft habit — EMOTI rewards consistency.</div>
            </div>
          </div>

          {/* entries list */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/85 p-4 md:p-5 max-h-[560px] min-h-[220px] overflow-y-auto shadow-xl shadow-black/40">
            {filteredEntries.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-xs text-slate-500 text-center max-w-sm">No entries yet with this filter. Try changing the mood filter or writing your first reflection.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map(e => {
                  const created = formatCreatedAt(e.createdAt);
                  const moodEmoji = e.mood === "low" ? "😢" : e.mood === "high" ? "😌" : e.mood === "grateful" ? "🙏" : "😐";
                  const isFav = favorites.includes(e.id);
                  const isPinned = pinnedId === e.id;
                  return (
                    <div key={e.id} className={`group border border-slate-800 rounded-2xl px-3 py-3 bg-slate-900/80 hover:border-sky-400/60 transition shadow-sm ${isPinned ? "ring-1 ring-amber-400/30" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-700">
                            <span>{moodEmoji}</span>
                            <span className="capitalize">{e.mood || e.sentiment || "okay"}</span>
                          </span>
                          {created && <span>{created}</span>}
                          {isPinned && <span className="ml-1 text-amber-300 text-[11px]">📌 pinned</span>}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition text-[11px]">
                          <button onClick={() => startEdit(e)} className="px-2 py-0.5 rounded-full border border-slate-600 hover:border-sky-400 text-slate-300">Edit</button>
                          <button onClick={() => handleDelete(e.id)} className="px-2 py-0.5 rounded-full border border-rose-500/60 text-rose-300 hover:bg-rose-500/10">Delete</button>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{e.text}</p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[11px]">
                          <button onClick={() => toggleFavorite(e.id)} className={`px-2 py-0.5 rounded-full border ${isFav ? "border-emerald-400 bg-emerald-400/10 text-emerald-200" : "border-slate-700 text-slate-300"}`}>{isFav ? "★ Fav" : "☆ Fav"}</button>
                          <button onClick={() => togglePin(e.id)} className={`px-2 py-0.5 rounded-full border ${isPinned ? "border-amber-300 bg-amber-400/10 text-amber-100" : "border-slate-700 text-slate-300"}`}>{isPinned ? "Unpin" : "Pin"}</button>
                          <button onClick={() => exportEntry(e)} className="px-2 py-0.5 rounded-full border border-slate-700 text-slate-300">Export</button>
                          <button onClick={() => refineEntry(e)} disabled={isRefining} className="px-2 py-0.5 rounded-full bg-violet-500 text-slate-900 text-[11px]">{isRefining ? "Refining…" : "Refine with EMOTI"}</button>
                          <button onClick={() => createJournalFromImage("Image reflection (example)", e.mood)} className="px-2 py-0.5 rounded-full border border-slate-700 text-slate-300">Use image → draft</button>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          {e.updatedAt && <span>Updated {formatCreatedAt(e.updatedAt)}</span>}
                        </div>
                      </div>
                    </div>
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
