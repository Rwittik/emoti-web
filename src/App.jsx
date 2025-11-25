// src/App.jsx
import CalmCompanion from "./components/CalmCompanion"; // ✅ NEW
import EmotionImages from "./components/EmotionImages"; //
import Journal from "./components/Journal"; //
import EmotionPlaylist from "./components/EmotionPlaylist"; // ✅ Emotion playlist
import MoodDashboard from "./components/MoodDashboard";
import PremiumChat from "./components/PremiumChat";
import React, { useRef, useState, useEffect } from "react";
import Chat from "./components/chat";
import PremiumButton from "./components/PremiumButton";
import { useAuth } from "./hooks/useAuth";
import PremiumHomepage from "./components/PremiumHomepage";
import SupportSection from "./components/SupportSection";
import SupportFab from "./components/SupportFab";

/**
 * EmotiAvatar
 * - Reusable small mascot/avatar for EMOTI
 * - Default calming gradient (violet → bluish)
 * - Accepts `size` prop (px) and optional `className`
 */
function EmotiAvatar({ size = 28, className = "" }) {
  const s = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      className={`rounded-full flex items-center justify-center shadow-sm ${className}`}
      style={{
        width: s,
        height: s,
        // fallback background for non-Tailwind environments (kept for extra safety)
        background:
          "linear-gradient(135deg, rgba(139,92,246,0.95) 0%, rgba(56,189,248,0.9) 100%)",
      }}
      aria-hidden="true"
    >
      {/* inner circle to create ring effect and place emoji */}
      <div
        style={{
          width: `calc(${s} - 6px)`,
          height: `calc(${s} - 6px)`,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.86))",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ fontSize: Math.max(10, Math.round(size / 2.6)) }}>
          🙂
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const chatRef = useRef(null);
  const { user, isPremium, logout, loginWithGoogle } = useAuth();

  // "dashboard" | "chat" | "mood" | "images" | "music" | "journal" | "calm"
  const [premiumView, setPremiumView] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  useEffect(() => {
    // show a small welcome toast when user logs in
    if (user) {
      setShowWelcomeToast(true);
      const t = setTimeout(() => setShowWelcomeToast(false), 3500);
      return () => clearTimeout(t);
    }
  }, [user]);

  const scrollToChat = () => {
    if (chatRef.current) {
      chatRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      // close mobile menu if open
      setMobileMenuOpen(false);
    }
  };

  // Small helper for initials if no photoURL
  const userInitial =
    user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase();

  const openPremiumChat = () => {
    if (user && isPremium) {
      setPremiumView("chat");
    }
  };

  const goToPremiumDashboard = () => {
    if (user && isPremium) {
      setPremiumView("dashboard");
    }
  };

  const openMoodDashboard = () => {
    if (user && isPremium) {
      setPremiumView("mood");
    }
  };

  const openEmotionImages = () => {
    if (user && isPremium) {
      setPremiumView("images");
    }
  };

  // ✅ open Emotion Playlist
  const openEmotionPlaylist = () => {
    if (user && isPremium) {
      setPremiumView("music");
    }
  };

  // ✅ open Emotional Journal
  const openJournal = () => {
    if (user && isPremium) {
      setPremiumView("journal");
    }
  };
  const openCalmCompanion = () => {
    if (user && isPremium) {
      setPremiumView("calm");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur border-b border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo + identity */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center" aria-hidden>
              {/* animated gradient ring (tailwind animation util via inline style for broader compatibility) */}
              <div className="absolute -inset-1 rounded-2xl blur-md opacity-60" style={{
                background: "linear-gradient(135deg, rgba(56,189,248,0.28), rgba(139,92,246,0.18))",
                animation: "pulse 6s infinite"
              }} />

              <div className="relative w-11 h-11 rounded-3xl bg-slate-950 border border-slate-700 flex items-center justify-center shadow-sm">
                {/* inner logo circle uses EmotiAvatar for consistent mascot */}
                <EmotiAvatar size={36} />
              </div>
            </div>

            <div className="flex flex-col leading-tight">
              <span className="font-semibold tracking-wide text-sm">EMOTI</span>
              <span className="text-[11px] text-sky-300">Your Emotional AI Companion</span>
            </div>
          </div>

          {/* Center links - responsive */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <button onClick={scrollToChat} className="hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/40 rounded">
              Chat
            </button>
            <a href="#how-it-works" className="hover:text-sky-300">How it works</a>
            <a href="#features" className="hover:text-sky-300">Features</a>
          </div>

          {/* Right side: auth + premium + avatar */}
          <div className="flex items-center gap-3">
            {/* mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded hover:bg-slate-900/60"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen((s) => !s)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* subtle welcome container (rounded) */}
            <div className="hidden sm:flex items-center bg-slate-900/60 border border-slate-800 rounded-full px-3 py-1 gap-3">
              <EmotiAvatar size={22} />
              <div className="flex flex-col leading-tight">
                <span className="text-xs text-slate-200">Hi{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}</span>
                <span className="text-[10px] text-slate-400">{user ? 'You have premium access' : 'Try Emoti — start chatting'}</span>
              </div>
            </div>

            {user && (
              <>
                {isPremium ? (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-400/10 text-amber-300 border border-amber-400/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Premium active
                  </span>
                ) : (
                  <span className="hidden sm:inline text-[11px] text-slate-400">Unlock deeper support</span>
                )}
              </>
            )}

            {/* profile avatar */}
            {user && (
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-9 h-9 rounded-full border-2 border-slate-800 object-cover shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-slate-800 flex items-center justify-center text-sm font-semibold">{userInitial}</div>
                )}
              </div>
            )}

            {user ? (
              <>
                {isPremium ? (
                  <button
                    onClick={openPremiumChat}
                    className="hidden sm:inline-flex text-xs md:text-sm px-3 py-1.5 rounded-full border border-amber-400/60 text-amber-300 hover:bg-amber-400/10"
                  >
                    Premium chat
                  </button>
                ) : (
                  <div className="hidden sm:block">
                    <PremiumButton />
                  </div>
                )}

                <button
                  onClick={logout}
                  className="text-xs md:text-sm border border-slate-700 px-3 py-1.5 rounded-full hover:border-sky-400 hover:text-sky-300"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="text-xs md:text-sm bg-sky-500 hover:bg-sky-400 text-white px-3 py-1.5 rounded-full"
              >
                Sign in
              </button>
            )}
          </div>
        </div>

        {/* mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950/95">
            <div className="px-4 py-3 flex flex-col gap-2">
              <button onClick={scrollToChat} className="text-left py-2 rounded hover:bg-slate-900/50">Chat</button>
              <a href="#how-it-works" className="py-2 rounded hover:bg-slate-900/50">How it works</a>
              <a href="#features" className="py-2 rounded hover:bg-slate-900/50">Features</a>
            </div>
          </div>
        )}
      </nav>

      {/* floating support button on all views */}
      <SupportFab />

      {/* small welcome toast for new login */}
      {showWelcomeToast && (
        <div className="fixed right-4 top-20 z-50">
          <div className="px-4 py-2 rounded-lg bg-slate-900/90 border border-slate-700 shadow-lg text-sm">
            Welcome back{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}! You have premium access.
          </div>
        </div>
      )}

      {/* PREMIUM CHAT PAGE (separate view for premium users) */}
      {user && isPremium && premiumView === "chat" ? (
        <>
          <main className="bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 min-h-[calc(100vh-56px)]">
            <section className="max-w-6xl mx-auto px-4 py-8 md:py-12">
              {/* mobile stack, desktop row */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
                    Premium chatroom
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/40 text-[11px] text-amber-200">
                      Priority space
                    </span>
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Your dedicated premium EMOTI space. You can later connect
                    this to a different API endpoint for more features (image
                    generation, deeper analysis, etc.).
                  </p>
                </div>
                <button
                  onClick={goToPremiumDashboard}
                  className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-700 hover:border-sky-400 hover:text-sky-300 self-start sm:self-auto"
                >
                  ← Back to dashboard
                </button>
              </div>

              <div className="mt-6 w-full">
                {/* Small strip above the chat */}
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-400 max-w-4xl mx-auto">
                  <div className="flex items-center gap-2">
                    <EmotiAvatar size={28} />
                    <span className="font-medium text-slate-200">EMOTI · Premium mode</span>
                  </div>
                  {user && (
                    <div className="flex items-center gap-1">
                      <span className="hidden sm:inline">You</span>
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="You"
                          className="w-6 h-6 rounded-full border border-slate-600 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-semibold">{userInitial}</div>
                      )}
                      <span className="max-w-[140px] truncate text-slate-200 text-[11px]">{user.displayName || user.email}</span>
                    </div>
                  )}
                </div>

                {/* Bigger premium chat card */}
                <PremiumChat />
              </div>

              <p className="mt-4 text-[11px] text-slate-500 max-w-xl">
                Later you can switch this to use a special endpoint like
                <code className="mx-1">/api/premium-chat</code> or add extra
                buttons (image generation, journaling, etc.).
              </p>
            </section>
          </main>

          {/* Support on this view */}
          <SupportSection />
        </>
      ) : user && isPremium && premiumView === "mood" ? (
        <>
          {/* Mood dashboard full page */}
          <MoodDashboard onBack={goToPremiumDashboard} />
          <SupportSection />
        </>
      ) : user && isPremium && premiumView === "images" ? (
        <>
          {/* AI Emotion Images full page */}
          <EmotionImages onBack={goToPremiumDashboard} />
          <SupportSection />
        </>
      ) : user && isPremium && premiumView === "journal" ? (
        <>
          {/* Emotional Journal full page */}
          <main className="bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 min-h-[calc(100vh-56px)]">
            <section className="max-w-6xl mx-auto px-4 py-8 md:py-12">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-semibold">Emotional journal</h1>
                  <p className="text-sm text-slate-400 mt-1">Capture small reflections from your day. Only you can see these entries.</p>
                </div>
                <button
                  onClick={goToPremiumDashboard}
                  className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-slate-700 hover:border-sky-400 hover:text-sky-300 self-start sm:self-auto"
                >
                  ← Back to dashboard
                </button>
              </div>

              {/* Journal component */}
              <Journal />
            </section>
          </main>

          <SupportSection />
        </>
      ) : user && isPremium && premiumView === "music" ? (
        <>
          {/* Emotion playlist full page */}
          <EmotionPlaylist onBack={goToPremiumDashboard} />
          <SupportSection />
        </>
      ) : user && isPremium && premiumView === "calm" ? (
        <>
          {/* ✅ NEW: Calm Companion full page */}
          <CalmCompanion onBack={goToPremiumDashboard} />
          <SupportSection />
        </>
      ) : (
        <>
          {/* PREMIUM HOMEPAGE (only for premium users) */}
          {user && isPremium && (
            <PremiumHomepage
              user={user}
              onOpenPremiumChat={openPremiumChat}
              onOpenMoodDashboard={openMoodDashboard}
              onOpenEmotionImages={openEmotionImages}
              onOpenEmotionPlaylist={openEmotionPlaylist}
              onOpenJournal={openJournal}
              onOpenCalmCompanion={openCalmCompanion} // ✅ NEW
            />
          )}

          {/* HERO SECTION (shown for everyone – free + premium) */}
          <section className="border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 relative overflow-hidden">
            {/* subtle gradient blobs */}
            <div className="pointer-events-none absolute inset-0 opacity-40">
              <div className="absolute -top-32 -left-16 h-64 w-64 bg-sky-500/20 blur-3xl rounded-full" />
              <div className="absolute -bottom-24 right-0 h-72 w-72 bg-fuchsia-500/15 blur-3xl rounded-full" />
            </div>

            <div className="max-w-6xl mx-auto px-4 py-10 md:py-16 grid lg:grid-cols-2 gap-10 items-center relative">
              {/* Left copy */}
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-sky-400/90 mb-3">Made for students & young adults in India</p>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight space-y-1">
                  <span>An anonymous</span>
                  <br />
                  <span className="text-sky-300">emotional companion</span>
                  <span> for long nights.</span>
                </h1>

                <p className="mt-4 text-sm md:text-base text-slate-300 max-w-xl">Talk about exam stress, breakups, career confusion, or just a bad day — in your own language. EMOTI listens without judging, reflects your feelings back, and suggests gentle next steps.</p>

                {/* Chips row */}
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-200">
                  <span className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/70">Hindi · Odia · Bengali · Tamil · Telugu · Marathi · English</span>
                  <span className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/70">Mood detection & journaling</span>
                  <span className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/70">Works at 2 AM, no login needed</span>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button onClick={scrollToChat} className="bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 rounded-full text-sm font-medium shadow-lg shadow-sky-500/30 focus:outline-none focus:ring-2 focus:ring-sky-400/30">Start chatting now</button>

                  {user && !isPremium && (
                    <div className="flex items-center gap-2">
                      <PremiumButton />
                      <span className="text-[11px] text-slate-400">Lifetime access · one small payment</span>
                    </div>
                  )}

                  {!user && (
                    <span className="text-xs text-slate-400">No login required to try · Free basic access</span>
                  )}
                </div>

                {/* “Built for nights when…” strip */}
                <div className="mt-7 text-[11px] md:text-xs text-slate-300 flex flex-wrap gap-2">
                  <span className="uppercase tracking-[0.2em] text-slate-500">Built for nights when…</span>
                  <span className="px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800">you can’t text anyone</span>
                  <span className="px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800">your brain won’t stop overthinking</span>
                  <span className="px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800">you just want someone to listen</span>
                </div>
              </div>

              {/* Right: phone mock / hero visual */}
              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  {/* Glow */}
                  <div className="absolute -inset-3 bg-gradient-to-tr from-sky-500/40 via-violet-500/30 to-fuchsia-500/30 blur-3xl opacity-60" />

                  {/* Phone body */}
                  <div className="relative w-60 md:w-64 h-[420px] rounded-[2rem] bg-slate-900 border border-slate-700/80 shadow-2xl shadow-sky-900/60 flex flex-col overflow-hidden">
                    {/* Notch */}
                    <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[10px] text-slate-400">
                      <span>2:04 AM</span>
                      <span className="flex gap-1 items-center">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                    </div>

                    {/* Chat header */}
                    <div className="px-4 py-2 border-y border-slate-700/70 bg-slate-950/90 flex items-center gap-2">
                      <EmotiAvatar size={28} />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">EMOTI</span>
                        <span className="text-[10px] text-slate-400">“Tell me everything, I’m listening.”</span>
                      </div>
                    </div>

                    {/* Messages preview */}
                    <div className="flex-1 px-3 py-3 space-y-2 text-[11px] overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900">
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-800/80 px-3 py-2">Hey EMOTI, I feel stuck and anxious about my future.</div>
                      </div>
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-sky-500/20 px-3 py-2 border border-sky-500/30 text-sky-50">That sounds really heavy. 💙 You’ve been holding a lot inside for a while, right?</div>
                      </div>
                      <div className="flex justify-end">
                        <div className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 border border-emerald-400/40 px-2 py-1 text-[10px] text-emerald-300">Mood tagged: <span className="font-semibold">Anxious · Overwhelmed</span></div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="px-2 py-1 rounded-full bg-slate-900/90 border border-slate-700">Write 3 fears down</span>
                        <span className="px-2 py-1 rounded-full bg-slate-900/90 border border-slate-700">Reframe 1 thought</span>
                        <span className="px-2 py-1 rounded-full bg-slate-900/90 border border-slate-700">2-minute breathing</span>
                      </div>
                    </div>

                    {/* Input bar */}
                    <div className="px-3 py-2 bg-slate-950/95 border-t border-slate-700/80 flex items-center gap-2">
                      <div className="flex-1 h-8 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] text-slate-500 flex items-center px-3">Tell EMOTI how you feel…</div>
                      <div className="h-8 w-8 rounded-full bg-sky-500 flex items-center justify-center text-[12px] text-white">➤</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section id="how-it-works" className="border-b border-slate-800 bg-slate-950">
            <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
              <h2 className="text-xl md:text-2xl font-semibold mb-6">How EMOTI works</h2>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-sky-400 text-xs font-semibold mb-1">1 · Share how you feel</div>
                  <p className="text-slate-300">Type exactly what’s on your mind — in any mix of English + local language. No need to sound “perfect”.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-sky-400 text-xs font-semibold mb-1">2 · EMOTI listens & reflects</div>
                  <p className="text-slate-300">The AI understands the emotion behind your words and responds with empathy, not lectures.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-sky-400 text-xs font-semibold mb-1">3 · Get gentle suggestions</div>
                  <p className="text-slate-300">Receive small, practical steps you can try — journaling prompts, reframing, or simple self-care ideas.</p>
                </div>
              </div>
            </div>
          </section>

          {/* FEATURES */}
          <section id="features" className="border-b border-slate-800 bg-slate-950">
            <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
              <h2 className="text-xl md:text-2xl font-semibold mb-6">Built for Indian students & young professionals</h2>
              <div className="grid md:grid-cols-3 gap-6 text-sm">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <h3 className="font-medium mb-2">Language flexibility</h3>
                  <p className="text-slate-300">Switch language and personality on the fly — talk like you do with close friends.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <h3 className="font-medium mb-2">Always on your side</h3>
                  <p className="text-slate-300">No judging, scolding, or shaming. EMOTI aims to validate your feelings and gently guide you.</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                  <h3 className="font-medium mb-2">Privacy first</h3>
                  <p className="text-slate-300">Conversations are processed by AI — you’ll clearly see a note that it’s not a human therapist and what data is stored.</p>
                </div>
              </div>

              {/* premium teaser row */}
              <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="text-sm">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/50 px-3 py-1 text-[11px] text-amber-300 mb-2"><EmotiAvatar size={20} /> <span>⭐ EMOTI Premium</span></div>
                  <p className="text-slate-200">Unlock deeper emotional analysis, mood tracking, and AI image reflections of your feelings — designed to make your journaling and healing more visual.</p>
                </div>
                {user && !isPremium && (
                  <div className="shrink-0">
                    <PremiumButton />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* CHAT SECTION (upgraded frame) */}
          <section ref={chatRef} id="chat" className="bg-gradient-to-b from-slate-950 to-slate-900">
            <div className="max-w-6xl mx-auto px-4 py-10 md:py-16 flex flex-col items-center gap-6">
              <h2 className="text-xl md:text-2xl font-semibold text-center">Try EMOTI now</h2>
              <p className="text-sm text-slate-300 text-center max-w-xl">This is an experimental AI companion. It may make mistakes. For urgent situations or thoughts of self-harm, please contact a trusted person or local helplines immediately.</p>

              {/* New chat frame */}
              <div className="w-full max-w-3xl">
                {/* top strip with small avatars */}
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <EmotiAvatar size={22} />
                    <span className="font-medium text-slate-200">EMOTI chatroom</span>
                    <span className="hidden sm:inline text-slate-500">Your messages may be used to improve the AI. Avoid sharing private details.</span>
                  </div>
                  {user && (
                    <div className="flex items-center gap-1">
                      <span className="hidden sm:inline">Talking as</span>
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="You" className="w-6 h-6 rounded-full border border-slate-600 object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-semibold">{userInitial}</div>
                      )} 
                      <span className="max-w-[120px] truncate text-slate-200 text-[11px]">{user.displayName || user.email}</span>
                    </div>
                  )}
                </div>

                {/* glassmorphism container for actual Chat */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-xl shadow-black/40 p-3 md:p-4">
                  <Chat emotiAvatar={<EmotiAvatar size={26} />} />
                </div>
              </div>

              {isPremium ? (
                // Premium-only strip under the basic chat box
                <div className="mt-6 w-full max-w-3xl grid sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="rounded-2xl border border-amber-400/40 bg-amber-400/5 px-3 py-3">
                    <div className="text-amber-300 font-semibold mb-1">Premium chatroom</div>
                    <p className="text-slate-300">Use the <span className="font-semibold">Premium chat</span> button in the top bar to enter your dedicated, priority space.</p>
                  </div>

                  <div className="rounded-2xl border border-amber-400/20 bg-slate-900/80 px-3 py-3">
                    <div className="text-amber-200 font-semibold mb-1">Mood dashboard</div>
                    <p className="text-slate-400">See this week&apos;s mood trend and patterns on your premium homepage.</p>
                  </div>

                  <div className="rounded-2xl border border-amber-400/20 bg-slate-900/80 px-3 py-3">
                    <div className="text-amber-200 font-semibold mb-1">AI emotion images</div>
                    <p className="text-slate-400">View soft, abstract images that reflect how your recent chats feel.</p>
                  </div>
                </div>
              ) : (
                // Normal users still see the basic disclaimer
                <p className="mt-3 text-[11px] text-slate-400 max-w-xl text-center">EMOTI does not provide medical, legal, or financial advice. It is not a substitute for professional mental health care.</p>
              )}
            </div>
          </section>

          {/* GLOBAL SUPPORT SECTION (visible on home view) */}
          <SupportSection />

          {/* FOOTER */}
          <footer className="border-t border-slate-800 bg-slate-950">
            <div className="max-w-6xl mx-auto px-4 py-4 text-[11px] text-slate-500 flex flex-col md:flex-row items-center justify-between gap-2">
              <span>© {new Date().getFullYear()} EMOTI · Made in India</span>
              <span>If you are in crisis or danger, contact local emergency services or mental health helplines immediately.</span>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
