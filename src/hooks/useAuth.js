// src/hooks/useAuth.js
import React, {
  useEffect,
  useState,
  createContext,
  useContext,
} from "react";
import { auth, googleProvider, db } from "../firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Create context
const AuthContext = createContext(null);

// Provider wrapper (NO JSX here – uses React.createElement)
export function AuthProvider({ children }) {
  const authValue = useProvideAuth();
  return React.createElement(
    AuthContext.Provider,
    { value: authValue },
    children
  );
}

// Hook to use Auth anywhere
export function useAuth() {
  return useContext(AuthContext);
}

function useProvideAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // Firestore user data
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        // logged out state
        setProfile(null);
        setLoadingAuth(false);
        return;
      }

      try {
        // Firestore user profile reference
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          // First-time user → create document
          const baseProfile = {
            email: firebaseUser.email,
            createdAt: Date.now(),
            premium: false,
            activePremium: false, // Razorpay / manual upgrade will flip this to true
          };

          await setDoc(userRef, baseProfile, { merge: true });
          setProfile(baseProfile);
        } else {
          setProfile(snap.data());
        }
      } catch (err) {
        // This is where "client is offline" usually lands
        if (err.code === "unavailable") {
          console.warn(
            "[EMOTI] Firestore looks offline while loading user profile. Using minimal profile."
          );
          // Fallback: keep a minimal profile so UI doesn't break
          setProfile((prev) => prev || { email: firebaseUser.email });
        } else {
          console.error("[EMOTI] Error loading user profile:", err);
        }
      } finally {
        setLoadingAuth(false);
      }
    });

    return () => unsub();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // Common: popup closed by user, blocked by browser, etc.
      if (err.code === "auth/popup-closed-by-user") {
        console.warn("[EMOTI] Google sign-in popup was closed by the user.");
      } else {
        console.error("[EMOTI] Google sign-in failed:", err);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("[EMOTI] Logout failed:", err);
    }
  };

  // -----------------------------
  // PREMIUM LOGIC
  // -----------------------------

  // 1) Real premium flag from Firestore
  const firestorePremium = profile?.activePremium === true;

  // 2) Hardcoded special emails that always have premium (for you, test accounts, etc.)
  const SPECIAL_PREMIUM_EMAILS = [
    "dashadhikary@gmail.com",
    "santmoumita100@gmail.com",
    // add more here:
    // "secondmail@gmail.com",
    // "testaccount@example.com",
  ];

  // normalize email to lowercase before checking
  const userEmail = user?.email ? user.email.toLowerCase() : null;
  const hasHardcodedPremium =
    !!userEmail && SPECIAL_PREMIUM_EMAILS.includes(userEmail);

  // 3) Final premium flag used by the app
  const isPremium = firestorePremium || hasHardcodedPremium;

  return {
    user,
    profile,
    isPremium,
    loadingAuth,
    loginWithGoogle,
    logout,
  };
}
