// src/components/Journal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";

const MOOD_OPTIONS = [
  { id: "low", label: "Heavy", emoji: "😢" },
  { id: "okay", label: "Mixed", emoji: "😐" },
  { id: "high", label: "Light", emoji: "😌" },
  { id: "grateful", label: "Grateful", emoji: "🙏" },
];

function basicSentiment(text) {
  const t = text.toLowerCase();
  const negativeWords = ["sad", "anxious", "overwhelmed", "lonely", "tired", "angry", "guilty"];
  const positiveWords = ["grateful", "happy", "hopeful", "excited", "calm", "peaceful"];

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

  // ---------------------------
  // Load entries from Firestore
  // ---------------------------
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "journalEntries"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [user]);

  // ---------------------------
  // Add / Update entry
  // ---------------------------
  const handleSave = async () => {
    if (!user || !text.trim()) return;
    setSaving(true);

    try {
      const sentiment = basicSentiment(text);

      if (editingId) {
        // update existing entry
        const ref = doc(db, "users", user.uid, "journalEntries", editingId);
        await updateDoc(ref, {
          text: text.trim(),
          mood: moodTag,
          sentiment,
          updatedAt: serverTimestamp(),
        });
      } else {
        // add new entry
        await addDoc(collection(db, "users", user.uid, "journalEntries"), {
          text: text.trim(),
          mood: moodTag,
          sentiment,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setText("");
      setMoodTag("okay");
      setEditingId(null);
    } catch (err) {
      console.error("Failed to save journal entry:", err);
      alert("Could not save your entry. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------
  // Edit / Delete handlers
  // ---------------------------
  const startEdit = (entry) => {
    setEditingId(entry.id);
    setText(entry.text || "");
    setMoodTag(entry.mood || "okay");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setText("");
    setMoodTag("okay");
  };

  const handleDelete = async (id) => {
    if (!user) return;
    const confirm = window.confirm("Delete this journal entry?");
    if (!confirm) return;

    try {
      const ref = doc(db, "users", user.uid, "journalEntries", id);
      await deleteDoc(ref);
      if (editingId === id) {
        cancelEdit();
      }
    } catch (err) {
      console.error("Failed to delete entry:", err);
      alert("Could not delete this entry. Please try again.");
    }
  };

  // ---------------------------
  // Filtered entries (search + mood)
  // ---------------------------
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries.filter((e) => {
      const matchesMood = filterMood === "all" || e.mood === filterMood || e.sentiment === filterMood;
      const matchesSearch =
        !q ||
        (e.text && e.text.toLowerCase().includes(q));
      return matchesMood && matchesSearch;
    });
  }, [entries, searchQuery, filterMood]);

  // ---------------------------
  // AI Summary via /api/chat
  // ---------------------------
  const generateSummary = async () => {
    if (!entries.length || summarizing) return;

    setSummarizing(true);
    setSummary("");

    try {
      const latest = entries.slice(0, 25); // last 25 entries
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
      console.error("Failed to summarize journal:", err);
      setSummary(
        "I had trouble summarising your journal just now. Please try again in a bit."
      );
    } finally {
      setSummarizing(false);
    }
  };

  if (!user) {
    return (
      <p className="text-sm text-slate-400">
        Sign in to keep a private emotional journal connected to your chats.
      </p>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto mt-6 space-y-6">
      {/* HEADER BAR */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-4 md:px-6 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-lg shadow-black/40">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80 mb-1">
            EMOTI · Emotional journal
          </p>
          <h2 className="text-lg md:text-xl font-semibold">
            A quiet place to empty your heart
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mt-1">
            Capture small reflections from your day. EMOTI softly tags the mood
            and can summarise patterns over time. Entries stay private to you.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-700 px-3 py-3 text-[11px] text-slate-300 flex flex-col gap-1 min-w-[180px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Entries</span>
            <span className="font-semibold text-sky-300">{entries.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Latest mood</span>
            <span className="flex items-center gap-1">
              {entries[0]?.mood === "low" && "😢"}
              {entries[0]?.mood === "okay" && "😐"}
              {entries[0]?.mood === "high" && "😌"}
              {entries[0]?.mood === "grateful" && "🙏"}
              <span className="capitalize">
                {entries[0]?.mood || entries[0]?.sentiment || "—"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* MAIN GRID – left: editor + summary, right: list */}
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* LEFT COLUMN */}
        <div className="space-y-4 lg:col-span-1">
          {/* Mood + editor card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 md:p-5 shadow-xl shadow-black/40">
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {editingId ? "Edit entry" : "New reflection"}
                </h3>
                <span className="text-[11px] text-slate-500">
                  Auto sentiment:{" "}
                  <span className="capitalize">
                    {basicSentiment(text || "")}
                  </span>
                </span>
              </div>

              {/* Mood chips */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                {MOOD_OPTIONS.map((m) => {
                  const active = moodTag === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMoodTag(m.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${
                        active
                          ? "border-amber-300 bg-amber-400/10 text-amber-100"
                          : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500"
                      } transition text-[11px]`}
                    >
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              className="w-full rounded-2xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400 min-h-[120px]"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What felt heavy or light today? You can write in any language mix..."
            />

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Private to you · entries are tied to your account.</span>
              </div>

              <div className="flex items-center gap-2 self-end">
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-3 py-1.5 rounded-full border border-slate-700 text-[11px] text-slate-300 hover:border-slate-500"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !text.trim()}
                  className="px-4 py-1.5 rounded-full bg-sky-500 text-slate-950 text-[11px] font-semibold hover:bg-sky-400 disabled:opacity-60"
                >
                  {saving
                    ? "Saving…"
                    : editingId
                    ? "Save changes"
                    : "Save entry"}
                </button>
              </div>
            </div>
          </div>

          {/* AI summary card */}
          <div className="rounded-3xl border border-violet-400/40 bg-slate-950/90 p-4 md:p-5 shadow-lg shadow-violet-500/25">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-violet-300/80">
                  AI reflection
                </p>
                <h3 className="text-sm font-semibold">
                  Soft summary of your journal
                </h3>
              </div>
              <button
                type="button"
                onClick={generateSummary}
                disabled={!entries.length || summarizing}
                className="px-3 py-1.5 rounded-full bg-violet-500/90 text-slate-950 text-[11px] font-semibold hover:bg-violet-400 disabled:opacity-60"
              >
                {summarizing ? "Summarising…" : "Summarise last entries"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              EMOTI reads a slice of your recent entries and reflects back the
              main feelings and a tiny suggestion.
            </p>
            <div className="text-xs text-slate-200 bg-slate-950/80 border border-slate-800 rounded-2xl px-3 py-3 min-h-[72px] whitespace-pre-wrap">
              {summary
                ? summary
                : "No summary yet. Save a few entries and tap “Summarise last entries”. 💙"}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN – list + search/filter */}
        <div className="lg:col-span-2 space-y-3">
          {/* Search & filter bar */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-[11px]">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-slate-500">Search entries</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-full bg-slate-900 border border-slate-700 px-3 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                placeholder="keywords, emotions, people, etc."
              />
            </div>
            <div className="flex flex-wrap gap-1 md:gap-2 mt-1 md:mt-0">
              <button
                type="button"
                onClick={() => setFilterMood("all")}
                className={`px-3 py-1 rounded-full border ${
                  filterMood === "all"
                    ? "border-sky-400 bg-sky-500/10 text-sky-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                }`}
              >
                All
              </button>
              {MOOD_OPTIONS.map((m) => {
                const active = filterMood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFilterMood(m.id)}
                    className={`px-3 py-1 rounded-full border inline-flex items-center gap-1 ${
                      active
                        ? "border-amber-300 bg-amber-400/10 text-amber-100"
                        : "border-slate-700 bg-slate-900 text-slate-300"
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Entries list */}
          <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 md:p-5 max-h-[520px] overflow-y-auto shadow-xl shadow-black/40">
            {filteredEntries.length === 0 ? (
              <p className="text-xs text-slate-500">
                No entries yet with this filter. Try changing the mood filter or
                writing your first reflection.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((e) => {
                  const created =
                    e.createdAt?.toDate?.().toLocaleString([], {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) || "";

                  const moodEmoji =
                    e.mood === "low"
                      ? "😢"
                      : e.mood === "high"
                      ? "😌"
                      : e.mood === "grateful"
                      ? "🙏"
                      : "😐";

                  return (
                    <div
                      key={e.id}
                      className="group border border-slate-800 rounded-2xl px-3 py-3 bg-slate-900/80 hover:border-sky-400/60 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-700">
                            <span>{moodEmoji}</span>
                            <span className="capitalize">
                              {e.mood || e.sentiment || "okay"}
                            </span>
                          </span>
                          {created && <span>{created}</span>}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition text-[11px]">
                          <button
                            type="button"
                            onClick={() => startEdit(e)}
                            className="px-2 py-0.5 rounded-full border border-slate-600 hover:border-sky-400 text-slate-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id)}
                            className="px-2 py-0.5 rounded-full border border-rose-500/60 text-rose-300 hover:bg-rose-500/10"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-slate-200 whitespace-pre-wrap">
                        {e.text}
                      </p>
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
