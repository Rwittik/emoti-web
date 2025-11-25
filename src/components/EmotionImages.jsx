// src/components/EmotionImages.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

/* ---------- Demo fallback images
   NOTE: developer/system will transform local path into an accessible URL.
   Using the uploaded file as demo fallback per your request.
*/
const UPLOADED_DEMO = "/mnt/data/11ea7461-c987-40b2-ae8e-67cb151b5d65.png";

// Map moods to example images. Replace these URLs with your real hosted images.
const moodImageMap = {
  calm: UPLOADED_DEMO, // replace with calm image URL
  hopeful: UPLOADED_DEMO, // replace with hopeful image URL
  heavy: UPLOADED_DEMO, // replace with heavy image URL
  mixed: UPLOADED_DEMO, // replace with mixed image URL
  default: UPLOADED_DEMO,
};

/* ---------- sample fallback data (kept from your original) ---------- */
const SAMPLE_EMOTION_IMAGES = [
  {
    id: "calm-1",
    title: "Quiet evening calm",
    mood: "calm",
    tone: "Soft, peaceful, slightly reflective",
    description:
      "Soft blue and purple tones with gentle light – representing a calmer, slower evening after a heavy week.",
    tags: ["calm", "relief", "evening"],
    createdAt: "Sample · not yet personalised",
    sourceLabel: "sample reflection",
    imageUrl: moodImageMap.calm,
  },
  {
    id: "heavy-1",
    title: "Overthinking cloud",
    mood: "heavy",
    tone: "Dense, slightly chaotic, heavy in the chest",
    description:
      "Dark clouds with thin lines of light trying to break through, visualising looping thoughts and mental noise.",
    tags: ["overthinking", "anxiety", "foggy"],
    createdAt: "Sample · not yet personalised",
    sourceLabel: "sample reflection",
    imageUrl: moodImageMap.heavy,
  },
  {
    id: "hope-1",
    title: "Small hope in the corner",
    mood: "hopeful",
    tone: "Gentle but bright, like a small light in a dark room",
    description:
      "Deep navy background with one warm golden window, symbolising a tiny but real sense of hope.",
    tags: ["hope", "resilience", "tiny-win"],
    createdAt: "Sample · not yet personalised",
    sourceLabel: "sample reflection",
    imageUrl: moodImageMap.hopeful,
  },
  {
    id: "mixed-1",
    title: "Mixed day, mixed sky",
    mood: "mixed",
    tone: "Half bright, half cloudy – up and down",
    description:
      "Split sky: one side clear and blue, the other cloudy and muted, capturing a day that felt both okay and heavy.",
    tags: ["mixed", "up-and-down", "processing"],
    createdAt: "Sample · not yet personalised",
    sourceLabel: "sample reflection",
    imageUrl: moodImageMap.mixed,
  },
];

function moodColor(mood) {
  switch (mood) {
    case "calm":
      return "bg-sky-400";
    case "hopeful":
      return "bg-emerald-400";
    case "heavy":
      return "bg-rose-400";
    case "mixed":
    default:
      return "bg-amber-400";
  }
}

const FILTERS = [
  { id: "all", label: "All moods" },
  { id: "calm", label: "Calm" },
  { id: "hopeful", label: "Hopeful" },
  { id: "heavy", label: "Heavy" },
  { id: "mixed", label: "Mixed" },
];

function getMoodKey(uid) {
  return `emoti_mood_events_${uid}`;
}

/* ---------- utility: download image via canvas to ensure same-origin/export works ---------- */
async function downloadImageAsPng(url, filename = "emoti-reflection.png") {
  // attempt to fetch the image as blob (works for same-origin or permissive CORS)
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();

    // draw to canvas to ensure consistent PNG export (and apply optional watermarks later)
    const img = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    // optional watermark (light):
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = `${Math.max(12, Math.round(canvas.width / 60))}px sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText("EMOTI", canvas.width - 12, canvas.height - 22);

    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch (err) {
    // fallback: open image in new tab to let browser download
    window.open(url, "_blank", "noopener");
    return false;
  }
}

/* ---------- EmotionImages component (updated to use images) ---------- */
export default function EmotionImages({ onBack }) {
  const { user, isPremium } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [images, setImages] = useState(SAMPLE_EMOTION_IMAGES);
  const [loading, setLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  // favorites
  const favKey = user ? `emoti_favs_${user.uid}` : `emoti_favs_anon`;
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem(favKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(favKey, JSON.stringify(favorites));
    } catch {}
    // optional: sync to Firestore for logged-in users (non-blocking)
    if (user) {
      (async () => {
        try {
          const uRef = doc(db, "users", user.uid);
          await setDoc(uRef, { favoriteImages: favorites }, { merge: true });
        } catch (err) {
          console.error("Failed to sync favorites to cloud", err);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  // Load mood events -> build images (reuses your previous buildImagesFromEvents logic)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      if (!user) {
        setImages(SAMPLE_EMOTION_IMAGES);
        setLoading(false);
        return;
      }
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        let events = [];
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.moodEvents)) events = data.moodEvents;
        }
        // fallback to localStorage for mood events
        if (!events.length) {
          try {
            const raw = window.localStorage.getItem(getMoodKey(user.uid));
            const parsed = raw ? JSON.parse(raw) : [];
            events = Array.isArray(parsed) ? parsed : [];
          } catch (err) {
            console.error("EmotionImages: read localStorage failed", err);
          }
        }

        // build cards from events; each card gets imageUrl based on mood
        const built = buildImagesFromEvents(events).map((card) => ({
          ...card,
          imageUrl: moodImageMap[card.mood] || moodImageMap.default,
        }));

        if (!cancelled) {
          setImages(built.length > 0 ? built : SAMPLE_EMOTION_IMAGES);
        }
      } catch (err) {
        console.error("Failed to load emotion images:", err);
        if (!cancelled) setImages(SAMPLE_EMOTION_IMAGES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filterCounts = useMemo(() => {
    const counts = { all: images.length, calm: 0, hopeful: 0, heavy: 0, mixed: 0 };
    images.forEach((i) => {
      counts[i.mood] = (counts[i.mood] || 0) + 1;
    });
    return counts;
  }, [images]);

  const visibleImages = useMemo(() => {
    if (activeFilter === "all") return images;
    return images.filter((img) => img.mood === activeFilter);
  }, [activeFilter, images]);

  const openModal = (img) => {
    setActive(img);
    setOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeModal = () => {
    setOpen(false);
    setActive(null);
    document.body.style.overflow = "";
  };

  const toggleFav = (id) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDownload = async (img) => {
    if (!isPremium) {
      // optional UI: show modal upgrade prompt; for now alert
      alert("High-resolution downloads are a Premium feature. Upgrade to download full quality images.");
      return;
    }

    // use canvas download helper to produce PNG reliably
    await downloadImageAsPng(img.imageUrl || UPLOADED_DEMO, `${(img.title || "emoti-reflection").replace(/\s+/g, "-").toLowerCase()}.png`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* top */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">EMOTI · AI emotion images</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold">Visual reflections of your feelings</h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-xl">Visual summaries of how your recent chats felt — mood postcards generated from emotional tone, not your appearance.</p>
          </div>

          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="px-3 py-2 rounded-full border border-slate-700 text-xs text-slate-200 hover:border-amber-300 hover:text-amber-200">
                ← Back to dashboard
              </button>
            )}
            <div className="text-xs text-slate-400">Preview {images.length} reflections</div>
          </div>
        </div>

        {/* filters + legend */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Filter by emotional tone</h2>
              <span className="text-[11px] text-slate-500">Showing {visibleImages.length} image{visibleImages.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  aria-pressed={activeFilter === f.id}
                  className={`px-3 py-1.5 rounded-full text-xs border transition flex items-center gap-2 ${
                    activeFilter === f.id ? "bg-amber-400/90 text-slate-950 border-amber-300 shadow" : "bg-slate-950 text-slate-200 border-slate-700 hover:border-amber-300/60"
                  }`}
                >
                  <span className="text-[11px]">{f.label}</span>
                  <span className="text-[11px] text-slate-400 px-2 py-0.5 rounded-full bg-slate-800">{filterCounts[f.id] ?? (f.id === "all" ? images.length : 0)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* legend */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs">
            <p className="text-[11px] text-slate-400 mb-2">Colour legend (mood tone)</p>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-sky-400" />Calm / grounded</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400" />Hopeful / growing</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-400" />Heavy / overwhelmed</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400" />Mixed / up &amp; down</div>
            </div>
          </div>
        </div>

        {/* main grid */}
        <section className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
          <div className="space-y-4">
            {loading && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 text-center text-xs text-slate-400">Loading reflections…</div>
            )}

            {!loading && visibleImages.length === 0 && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 text-center text-xs text-slate-400">
                No images for this mood yet. Start chatting tonight and EMOTI will reflect back how you feel.
                <div className="mt-3"><button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })} className="px-4 py-2 rounded-full bg-amber-400 text-slate-900">Start chat</button></div>
              </div>
            )}

            {visibleImages.map((img, idx) => (
              <article key={img.id} className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 md:p-5 transform transition hover:-translate-y-1 hover:shadow-2xl">
                <div className="grid md:grid-cols-[220px,minmax(0,1fr)] gap-4">
                  {/* image preview */}
                  <div className="relative">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openModal(img)}
                      onKeyDown={(e) => { if (e.key === "Enter") openModal(img); }}
                      className="h-40 rounded-xl overflow-hidden border border-slate-700 shadow-[0_10px_40px_rgba(2,6,23,0.6)] transition-transform cursor-pointer hover:scale-[1.01] bg-cover bg-center"
                      style={{ backgroundImage: `url("${img.imageUrl || UPLOADED_DEMO}")` }}
                    >
                      <div className="h-full w-full flex items-end justify-start p-3 bg-gradient-to-t from-black/45 to-transparent">
                        <div className="rounded-md bg-black/35 px-2 py-1 text-xs text-slate-100">{img.title}</div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300">
                        <span className={`w-2 h-2 rounded-full ${moodColor(img.mood)}`} />
                        {img.mood.charAt(0).toUpperCase() + img.mood.slice(1)}
                      </span>

                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleFav(img.id)} className="px-2 py-1 rounded-full border border-slate-700 bg-slate-900/70 hover:bg-amber-400/10 transition">
                          <span className={`text-sm ${favorites.includes(img.id) ? "text-amber-300" : "text-slate-300"}`}>{favorites.includes(img.id) ? "★" : "☆"}</span>
                        </button>
                        <button onClick={() => openModal(img)} className="px-2 py-1 rounded-full border border-slate-700 bg-slate-900/70 hover:bg-sky-400/10 transition text-slate-300">Open</button>
                      </div>
                    </div>
                  </div>

                  {/* info */}
                  <div className="flex flex-col justify-between gap-2 text-xs md:text-[13px]">
                    <div>
                      <h3 className="text-sm md:text-base font-semibold mb-1">{img.title}</h3>
                      <p className="text-[11px] text-slate-400 mb-2">Tone: {img.tone}</p>
                      <p className="text-slate-300">{img.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(img.tags || []).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] text-slate-300">#{tag}</span>
                        ))}
                      </div>

                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-emerald-300/90">Auto-generated {img.sourceLabel || "from your recent chats"}</span>
                        <span className="text-[10px] text-slate-500">{img.createdAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* side panel */}
          <aside className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 text-xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">How EMOTI uses images</h3>
              <p className="text-slate-400">These visuals make your feelings easier to notice. Save, journal, or simply look at them to check in with yourself.</p>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold text-slate-300">Try this reflection:</h4>
              <ul className="space-y-1 text-slate-400 list-disc list-inside">
                <li>Which image feels closest to how today felt?</li>
                <li>If this picture could talk, what would it say about what you need right now?</li>
                <li>Is there a small action that matches the "hopeful" image?</li>
              </ul>
            </div>

            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400 mb-1">Coming soon</p>
              <p className="text-slate-300">We’ll add richer artwork generation from important chats and options to export packs of your reflections.</p>
            </div>
          </aside>
        </section>
      </div>

      {/* Modal */}
      {open && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="grid md:grid-cols-[1fr_360px] gap-4 p-6">
              <div className="flex flex-col gap-3">
                <div className="rounded-xl h-72 md:h-[420px] border border-slate-700 overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url("${active.imageUrl || UPLOADED_DEMO}")` }}>
                  {/* optional overlay text */}
                </div>

                <div>
                  <h3 className="text-lg font-semibold">{active.title}</h3>
                  <p className="text-sm text-slate-400 mb-2">Tone: {active.tone}</p>
                  <p className="text-slate-300">{active.description}</p>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => handleDownload(active)} className={`px-4 py-2 rounded-full ${isPremium ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-200 border border-slate-700"}`}>
                    {isPremium ? "Download PNG" : "Download (Premium)"}
                  </button>

                  <button onClick={() => toggleFav(active.id)} className="px-4 py-2 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                    {favorites.includes(active.id) ? "★ Favorited" : "☆ Save"}
                  </button>

                  <button onClick={() => { const note = prompt("Add a short journal note for this reflection:", `Reflection: ${active.title}`); if (note) { try { const k = "emoti_quick_journal"; const raw = localStorage.getItem(k); const arr = raw ? JSON.parse(raw) : []; arr.unshift({ ts: Date.now(), title: active.title, note }); localStorage.setItem(k, JSON.stringify(arr.slice(0, 200))); alert("Saved to quick journal (local)."); } catch (err) { console.error(err); } } }} className="px-4 py-2 rounded-full bg-sky-500 text-white">Use in Journal</button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${moodColor(active.mood)} text-slate-950 font-bold`}>🙂</div>
                    <div>
                      <div className="text-sm font-semibold">{active.mood.charAt(0).toUpperCase() + active.mood.slice(1)}</div>
                      <div className="text-[11px] text-slate-400">{active.createdAt}</div>
                    </div>
                  </div>
                  <button onClick={closeModal} className="px-3 py-1 rounded-full border border-slate-700 text-slate-200">Close</button>
                </div>

                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs">
                  <p className="text-slate-400 mb-2">Quick prompts</p>
                  <ul className="list-disc list-inside text-slate-300 text-[13px]">
                    <li>What part of this image feels like your chest or head?</li>
                    <li>One small action you can try right now: write it down.</li>
                    <li>Try a 60-second breathing break and come back.</li>
                  </ul>
                </div>

                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs">
                  <p className="text-slate-400 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">{(active.tags || []).map((t) => <span key={t} className="px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-[12px]">{t}</span>)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- helper: buildImagesFromEvents (copied/adapted) ---------- */
function mapEmotionToMood(emotion) {
  if (!emotion) return "mixed";
  const e = String(emotion).toLowerCase();
  if (["calm", "relaxed", "grounded", "peaceful", "relief"].includes(e)) return "calm";
  if (["hopeful", "optimistic", "motivated", "encouraged", "excited"].includes(e)) return "hopeful";
  if (["sad", "low", "down", "depressed", "stressed", "anxious", "overwhelmed", "lonely", "angry", "upset", "heavy"].includes(e)) return "heavy";
  if (["okay", "neutral", "mixed", "tired", "meh"].includes(e)) return "mixed";
  return "mixed";
}

function buildImagesFromEvents(events) {
  if (!events || events.length === 0) return [];
  const sorted = [...events].sort((a, b) => b.ts - a.ts);
  const byDay = new Map();
  for (const ev of sorted) {
    if (!ev.ts || !ev.emotion) continue;
    const d = new Date(ev.ts);
    const key = d.toISOString().slice(0, 10);
    const mood = mapEmotionToMood(ev.emotion);
    if (!byDay.has(key)) byDay.set(key, { date: d, counts: { calm: 0, hopeful: 0, heavy: 0, mixed: 0 } });
    byDay.get(key).counts[mood] += 1;
  }
  const dayEntries = Array.from(byDay.values()).sort((a,b)=>b.date-a.date).slice(0,6);
  const results = dayEntries.map((entry, idx) => {
    const { date, counts } = entry;
    let dominant = "mixed"; let best = -1;
    for (const m of ["calm","hopeful","heavy","mixed"]) { if (counts[m] > best) { best = counts[m]; dominant = m; } }
    const preset = getPresetForMood(dominant, idx);
    const createdAt = date.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const totalHeavyish = counts.heavy + counts.mixed;
    let sourceLabel = "after everyday check-ins";
    if (totalHeavyish >= 3) sourceLabel = "after intense / heavy chats";
    else if (counts.hopeful >= 2) sourceLabel = "after hopeful / growing chats";
    return { id:`auto-${date.toISOString()}`, title: preset.title, mood: dominant, tone: preset.tone, description: preset.description, tags: preset.tags, createdAt, sourceLabel };
  });
  return results;
}

function getPresetForMood(mood, index = 0) {
  switch (mood) {
    case "calm": return { title: index===0 ? "Quiet pocket of calm" : "Soft, grounded evening", tone: "Soft, peaceful, slightly reflective", description: "Gentle blue tones with soft light – like a slower, calmer moment after emotional noise.", tags: ["calm","grounded","slow-breath"] };
    case "hopeful": return { title: index===0 ? "Small window of hope" : "Quiet hopeful shift", tone: "Gentle but bright, like a small light in a dark room", description: "Deep navy background with a warm golden glow, symbolising tiny but real bits of hope showing up.", tags: ["hopeful","tiny-win","growing"] };
    case "heavy": return { title: index===0 ? "Heavy cloud day" : "Overthinking storm", tone: "Dense, slightly chaotic, heavy in the chest", description: "Dark clouds with thin streaks of light trying to break through – mirroring stress, worry, and emotional weight.", tags: ["heavy","anxious","tired"] };
    case "mixed":
    default: return { title: index===0 ? "Mixed sky, mixed day" : "Up & down waves", tone: "Half bright, half cloudy – up and down", description: "One side clear and bright, the other cloudy and muted, for days that felt both okay and heavy at the same time.", tags: ["mixed","up-and-down","processing"] };
  }
}
