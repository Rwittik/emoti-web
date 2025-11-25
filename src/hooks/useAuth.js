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

export function AuthProvider({ children }) {
  const authValue = useProvideAuth();
  return React.createElement(
    AuthContext.Provider,
    { value: authValue },
    children
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

function useProvideAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setLoadingAuth(false);
        return;
      }

      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          // First-time user → give premium instantly
          const baseProfile = {
            email: firebaseUser.email,
            createdAt: Date.now(),
            premium: true,
            activePremium: true,
          };

          await setDoc(userRef, baseProfile, { merge: true });
          setProfile(baseProfile);
        } else {
          const data = snap.data();

          // If user exists but not premium → upgrade automatically
          if (!data.activePremium) {
            await setDoc(
              userRef,
              { activePremium: true, premium: true },
              { merge: true }
            );
            data.activePremium = true;
          }

          setProfile(data);
        }
      } catch (err) {
        if (err.code === "unavailable") {
          console.warn(
            "[EMOTI] Firestore offline → using fallback minimal profile."
          );
          setProfile((prev) => prev || { email: firebaseUser.email, activePremium: true });
        } else {
          console.error("[EMOTI] Error loading profile:", err);
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
      if (err.code === "auth/popup-closed-by-user") {
        console.warn("[EMOTI] Google sign-in popup closed.");
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

  // PREMIUM LOGIC
  const firestorePremium = profile?.activePremium === true;

  const SPECIAL_PREMIUM_EMAILS = [
    "dashadhikary@gmail.com",
    "santmoumita100@gmail.com",
  ];

  const userEmail = user?.email ? user.email.toLowerCase() : null;
  const hasHardcodedPremium =
    !!userEmail && SPECIAL_PREMIUM_EMAILS.includes(userEmail);

  // FINAL premium flag (everyone logged in gets premium)
  const isPremium = true;

  return {
    user,
    profile,
    isPremium,
    loadingAuth,
    loginWithGoogle,
    logout,
  };
}
