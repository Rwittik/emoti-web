// src/components/EmotionImages.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

/* ---------- fallback sample data & helpers (kept from your original) ----------
   NOTE: sample now includes one real image file you uploaded (local path).
   The dev environment will transform '/mnt/data/...' to a proper URL in your tooling.
*/
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
    // example image file you uploaded (local path in environment)
    imageUrl: "/mnt/data/11ea7461-c987-40b2-ae8e-67cb151b5d65.png",
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

// Filters
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

/* ---------- Gradient generator & other helpers (kept for fallback visuals) ---------- */
function gradientForCard(id, mood) {
  const seed = id?.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) || 0;
  const palettes = {
    calm: ["#0f1724", "#0ea5e9", "#6366f1"],
    hopeful: ["#020617", "#22c55e", "#f59e0b"],
    heavy: ["#0b0f14", "#ef4444", "#374151"],
    mixed: ["#020617", "#f59e0b", "#0ea5e9"],
  };
  const colors = palettes[mood] || palettes.mixed;
  const angle = seed % 360;
  return {
    backgroundImage: `
      radial-gradient(circle at 10% 0%, ${colors[1]}33, transparent 55%),
      radial-gradient(circle at 90% 100%, ${colors[2]}33, transparent 55%),
      linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]}55, ${colors[2]})
    `,
    transform: `rotate(${(seed % 7) - 3}deg) scale(1.03)`,
    transformOrigin: "center",
    backgroundSize: "140% 140%",
    backgroundPosition: "center",
  };
}

/* ---------- COMPONENT ---------- */
/**
 * Props:
 * - onBack (optional) - navigate back
 * - onUseInJournal (optional) - function(img) called when user selects "Use in Journal"
 *
 * If onUseInJournal is provided, it will be called with the image object and your parent can
 * open Journal.jsx and insert the image (recommended).
 */
export default function EmotionImages({ onBack, onUseInJournal }) {
  const { user, isPremium } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [images, setImages] = useState(SAMPLE_EMOTION_IMAGES);
  const [loading, setLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  // custom image form (URL or file)
  const [imgUrlInput, setImgUrlInput] = useState("");
  const [imgFileName, setImgFileName] = useState("");

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
    } catch (e) {}
    // optionally sync to Firestore (merge)
    async function sync() {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { favoriteImages: favorites }, { merge: true });
      } catch (err) {
        console.error("Failed to sync favorites to cloud", err);
      }
    }
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  // load mood events -> images (existing logic)
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
        let customImages = [];
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.moodEvents)) events = data.moodEvents;
          if (Array.isArray(data.customEmotionImages))
            customImages = data.customEmotionImages;
        }

        // fallback to localStorage events if none
        if (!events.length) {
          try {
            const raw = window.localStorage.getItem(getMoodKey(user.uid));
            const parsed = raw ? JSON.parse(raw) : [];
            events = Array.isArray(parsed) ? parsed : [];
          } catch (err) {
            console.error("EmotionImages: read localStorage failed", err);
          }
        }

        // build auto images from events (keeps your original grouping)
        const built = buildImagesFromEvents(events);

        // combine custom images (user uploads / links) with built
        const combined = [
          ...(customImages || []),
          ...(built.length > 0 ? built : []),
        ];

        if (!cancelled) {
          setImages(combined.length ? combined : SAMPLE_EMOTION_IMAGES);
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

  // filter counts
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

  // open modal
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

  // toggle favorite
  const toggleFav = (id) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // --- Add custom image: by URL or local file ---
  // Add using a direct URL string (user-pasted) — basic validation
  const addCustomImageFromUrl = async () => {
    const url = imgUrlInput.trim();
    if (!url) {
      alert("Paste an image URL first.");
      return;
    }

    // create new image object
    const newImg = {
      id: `custom-${Date.now()}`,
      title: `Custom image`,
      mood: activeFilter === "all" ? "mixed" : activeFilter,
      tone: "User supplied image",
      description: "Uploaded by user via URL",
      tags: ["custom"],
      createdAt: new Date().toLocaleString(),
      sourceLabel: "user-supplied",
      imageUrl: url,
    };

    // add to UI & persist locally + optional cloud
    setImages((prev) => [newImg, ...prev]);
    setImgUrlInput("");
    await persistCustomImageIfUser(newImg);
  };

  // Add from local file input
  const addCustomImageFromFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    setImgFileName(file.name || "file");
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const newImg = {
        id: `custom-${Date.now()}`,
        title: file.name || "Custom image",
        mood: activeFilter === "all" ? "mixed" : activeFilter,
        tone: "User uploaded",
        description: "Uploaded by user",
        tags: ["custom"],
        createdAt: new Date().toLocaleString(),
        sourceLabel: "user-upload",
        imageUrl: dataUrl, // local preview + saved in Firestore if user
      };
      setImages((prev) => [newImg, ...prev]);
      await persistCustomImageIfUser(newImg);
    };
    reader.readAsDataURL(file);
  };

  // Persist custom images to Firestore under users/<uid>.customEmotionImages (merge)
  const persistCustomImageIfUser = async (imgObj) => {
    if (!user) {
      // If not logged in, keep image in localStorage so it survives page reloads for the same device
      try {
        const localKey = `emoti_custom_images_${favKey}`;
        const raw = localStorage.getItem(localKey);
        const arr = raw ? JSON.parse(raw) : [];
        arr.unshift(imgObj);
        localStorage.setItem(localKey, JSON.stringify(arr.slice(0, 200)));
      } catch (e) {
        console.error("Failed to save custom image locally", e);
      }
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      // read existing, merge new at front
      const snap = await getDoc(userRef);
      let existing = [];
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.customEmotionImages)) existing = data.customEmotionImages;
      }
      const updated = [imgObj, ...existing].slice(0, 200);
      await setDoc(userRef, { customEmotionImages: updated }, { merge: true });
    } catch (err) {
      console.error("Failed to persist custom image to Firestore", err);
    }
  };

  // Download (if you still want): simple approach for dataURL or remote URL
  const downloadImage = (img) => {
    if (!img?.imageUrl) {
      alert("No direct image available to download.");
      return;
    }
    // If it's a data: URL we can force-download, else open in new tab
    if (img.imageUrl.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = img.imageUrl;
      a.download = `${(img.title || "reflection").replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      // open remote in new tab (user can save)
      window.open(img.imageUrl, "_blank", "noopener");
    }
  };

  // Use in Journal: if parent passed onUseInJournal, call it; otherwise fallback to local quick-journal behavior
  const useInJournal = (img) => {
    if (typeof onUseInJournal === "function") {
      onUseInJournal(img);
      closeModal();
      return;
    }

    // fallback: simple prompt -> local quick journal (keeps prior behavior)
    const note = prompt("Add a short journal note for this reflection:", `Reflection: ${img.title}\n\nWhy this card?`);
    if (note) {
      try {
        const k = "emoti_quick_journal";
        const raw = localStorage.getItem(k);
        const arr = raw ? JSON.parse(raw) : [];
        arr.unshift({ ts: Date.now(), title: img.title, note, imageUrl: img.imageUrl });
        localStorage.setItem(k, JSON.stringify(arr.slice(0, 200)));
        alert("Saved to quick journal (local).");
        closeModal();
      } catch (err) {
        console.error("Failed to save quick journal", err);
      }
    }
  };

  // ESC to close modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">EMOTI · AI emotion images</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold">Visual reflections of your feelings</h1>
            <p className="mt-1 text-xs md:text-sm text-slate-400 max-w-xl">
              Visual summaries of how your recent chats felt — mood postcards generated from emotional tone, not your appearance.
            </p>
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

        {/* Add custom image area (URL or file) */}
        <div className="mb-6 rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col md:flex-row gap-3 items-start">
          <div className="flex-1">
            <p className="text-sm font-semibold mb-2">Add an image (link or upload)</p>
            <div className="flex gap-2 items-center">
              <input
                value={imgUrlInput}
                onChange={(e) => setImgUrlInput(e.target.value)}
                placeholder="Paste an image URL (https://...)"
                className="flex-1 rounded-full px-3 py-2 bg-slate-900/70 border border-slate-700 text-sm placeholder:text-slate-500"
              />
              <button onClick={addCustomImageFromUrl} className="px-4 py-2 rounded-full bg-emerald-400 text-slate-900">Add</button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">You can paste an image link (from your cloud or image host) or upload from your device below.</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <label className="cursor-pointer px-4 py-2 rounded-full border border-slate-700 bg-slate-900/70 text-sm">
              Upload image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) addCustomImageFromFile(f);
                  e.target.value = null;
                }}
                className="hidden"
              />
            </label>
            <div className="text-[11px] text-slate-400">{imgFileName}</div>
          </div>
        </div>

        {/* Filters + legend */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {/* Filters */}
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

          {/* Legend (clickable) */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs">
            <p className="text-[11px] text-slate-400 mb-2">Colour legend (mood tone)</p>
            <div className="space-y-2 text-[11px] text-slate-300">
              {["calm", "hopeful", "heavy", "mixed"].map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveFilter(m)}
                  className="w-full text-left flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-900/70 transition"
                >
                  <span className={`w-3 h-3 rounded-full ${moodColor(m)}`} />
                  <span className="flex-1">{m === "calm" ? "Calm / grounded" : m === "hopeful" ? "Hopeful / growing" : m === "heavy" ? "Heavy / overwhelmed" : "Mixed / up & down"}</span>
                  <span className="text-slate-500 text-[11px]">{filterCounts[m] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main grid */}
        <section className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
          {/* Image cards */}
          <div className="space-y-4">
            {loading && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 text-center text-xs text-slate-400">
                Loading reflections…
              </div>
            )}

            {!loading && visibleImages.length === 0 && (
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 text-center text-xs text-slate-400">
                No images for this mood yet. Start chatting tonight and EMOTI will reflect back how you feel.
                <div className="mt-3">
                  <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })} className="px-4 py-2 rounded-full bg-amber-400 text-slate-900">Start chat</button>
                </div>
              </div>
            )}

            {visibleImages.map((img, idx) => (
              <article
                key={img.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 md:p-5 transform transition hover:-translate-y-1 hover:shadow-2xl"
                style={{ animation: `fadeIn 300ms ease ${idx * 60}ms both` }}
              >
                <div className="grid md:grid-cols-[220px,minmax(0,1fr)] gap-4">
                  {/* preview */}
                  <div className="relative">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openModal(img)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") openModal(img);
                      }}
                      className="h-40 rounded-xl overflow-hidden border border-slate-700 shadow-[0_10px_40px_rgba(2,6,23,0.6)] transition-transform hover:scale-[1.01] cursor-pointer bg-cover bg-center"
                      style={
                        img.imageUrl
                          ? { backgroundImage: `url(${img.imageUrl})` }
                          : gradientForCard(img.id, img.mood)
                      }
                    >
                      {/* if imageUrl exists, we still include an <img> for easier download/copy behavior */}
                      {img.imageUrl ? (
                        <img
                          src={img.imageUrl}
                          alt={img.title}
                          className="w-full h-full object-cover"
                          style={{ display: "block" }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[11px] text-slate-100/80">
                          AI mood reflection
                        </div>
                      )}
                    </div>

                    {/* mood pill + favorite */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300">
                        <span className={`w-2 h-2 rounded-full ${moodColor(img.mood)}`} />
                        {img.mood.charAt(0).toUpperCase() + img.mood.slice(1)} / {img.sourceLabel || "auto"}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          aria-label="Favorite"
                          onClick={() => toggleFav(img.id)}
                          className="px-2 py-1 rounded-full border border-slate-700 bg-slate-900/70 hover:bg-amber-400/10 transition"
                        >
                          <span className={`text-sm ${favorites.includes(img.id) ? "text-amber-300" : "text-slate-300"}`}>
                            {favorites.includes(img.id) ? "★" : "☆"}
                          </span>
                        </button>
                        <button aria-label="Open" onClick={() => openModal(img)} className="px-2 py-1 rounded-full border border-slate-700 bg-slate-900/70 hover:bg-sky-400/10 transition text-slate-300">
                          Open
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* text info */}
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
                        <span className="text-[10px] text-emerald-300/90">Auto-generated {img.sourceLabel ? ` ${img.sourceLabel}` : "from your recent chats"}</span>
                        <span className="text-[10px] text-slate-500">{img.createdAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Side panel */}
          <aside className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 text-xs space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">How EMOTI uses images</h3>
              <p className="text-slate-400">These visuals are meant to make your feelings easier to notice. You can save, journal with, or simply look at them to check in with yourself.</p>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold text-slate-300">Try this reflection:</h4>
              <ul className="space-y-1 text-slate-400 list-disc list-inside">
                <li>Which image feels closest to how today felt?</li>
                <li>If this picture could talk, what would it say about what you need right now?</li>
                <li>Is there one small action that matches the "hopeful" image?</li>
              </ul>
            </div>

            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4">
              <p className="text-[11px] text-slate-400 mb-1">Coming soon</p>
              <p className="text-slate-300">In the future, EMOTI can create richer artwork from especially intense or important chats, so you'll slowly build a visual diary of your emotional journey.</p>
            </div>
          </aside>
        </section>
      </div>

      {/* Modal viewer */}
      {open && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
            <div className="grid md:grid-cols-[1fr_360px] gap-4 p-6">
              <div className="flex flex-col gap-3">
                <div className="rounded-xl h-72 md:h-[420px] border border-slate-700 overflow-hidden bg-cover bg-center" style={active.imageUrl ? { backgroundImage: `url(${active.imageUrl})` } : gradientForCard(active.id, active.mood)}>
                  {active.imageUrl ? <img src={active.imageUrl} alt={active.title} className="w-full h-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-[12px] text-slate-100/80">AI mood reflection — {active.title}</div>}
                </div>

                <div>
                  <h3 className="text-lg font-semibold">{active.title}</h3>
                  <p className="text-sm text-slate-400 mb-2">Tone: {active.tone}</p>
                  <p className="text-slate-300">{active.description}</p>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => downloadImage(active)} className={`px-4 py-2 rounded-full ${isPremium ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-200 border border-slate-700"} hover:scale-[1.02] transition`} aria-label="Download reflection">
                    {isPremium ? "Download" : "Download (Open / Premium)"}
                  </button>

                  <button onClick={() => toggleFav(active.id)} className="px-4 py-2 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                    {favorites.includes(active.id) ? "★ Favorited" : "☆ Save"}
                  </button>

                  <button onClick={() => useInJournal(active)} className="px-4 py-2 rounded-full bg-sky-500 text-white">Use in Journal</button>
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
                  <div className="flex flex-wrap gap-2">
                    {(active.tags || []).map((t) => (
                      <span key={t} className="px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-[12px]">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs">
                  <p className="text-slate-400 mb-2">Share</p>
                  <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard?.writeText(window.location.href); alert("Link copied. Compose a message to share your reflection."); }} className="px-3 py-1 rounded-full border border-slate-700">Copy link</button>
                    <button onClick={() => alert("Share flow not implemented yet — integrate social share here")} className="px-3 py-1 rounded-full border border-slate-700">Share</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) }}`}</style>
    </div>
  );
}

/* ---------- helpers reused from your original file ---------- */
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
  const dayEntries = Array.from(byDay.values()).sort((a, b) => b.date - a.date).slice(0, 6);
  const results = dayEntries.map((entry, idx) => {
    const { date, counts } = entry;
    let dominant = "mixed";
    let best = -1;
    for (const m of ["calm", "hopeful", "heavy", "mixed"]) {
      if (counts[m] > best) {
        best = counts[m];
        dominant = m;
      }
    }
    const preset = getPresetForMood(dominant, idx);
    const createdAt = date.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const totalHeavyish = counts.heavy + counts.mixed;
    let sourceLabel = "after everyday check-ins";
    if (totalHeavyish >= 3) sourceLabel = "after intense / heavy chats";
    else if (counts.hopeful >= 2) sourceLabel = "after hopeful / growing chats";
    return { id: `auto-${date.toISOString()}`, title: preset.title, mood: dominant, tone: preset.tone, description: preset.description, tags: preset.tags, createdAt, sourceLabel };
  });
  return results;
}

function getPresetForMood(mood, index = 0) {
  switch (mood) {
    case "calm":
      return { title: index === 0 ? "Quiet pocket of calm" : "Soft, grounded evening", tone: "Soft, peaceful, slightly reflective", description: "Gentle blue tones with soft light – like a slower, calmer moment after emotional noise.", tags: ["calm", "grounded", "slow-breath"] };
    case "hopeful":
      return { title: index === 0 ? "Small window of hope" : "Quiet hopeful shift", tone: "Gentle but bright, like a small light in a dark room", description: "Deep navy background with a warm golden glow, symbolising tiny but real bits of hope showing up.", tags: ["hopeful", "tiny-win", "growing"] };
    case "heavy":
      return { title: index === 0 ? "Heavy cloud day" : "Overthinking storm", tone: "Dense, slightly chaotic, heavy in the chest", description: "Dark clouds with thin streaks of light trying to break through – mirroring stress, worry, and emotional weight.", tags: ["heavy", "anxious", "tired"] };
    case "mixed":
    default:
      return { title: index === 0 ? "Mixed sky, mixed day" : "Up & down waves", tone: "Half bright, half cloudy – up and down", description: "One side clear and bright, the other cloudy and muted, for days that felt both okay and heavy at the same time.", tags: ["mixed", "up-and-down", "processing"] };
  }
}
