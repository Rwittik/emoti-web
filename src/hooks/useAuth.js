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
  return React.createElement(AuthContext.Provider, { value: authValue }, children);
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

      if (firebaseUser) {
        // Firestore user profile reference
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          // First-time user → create document
          const baseProfile = {
            email: firebaseUser.email,
            createdAt: Date.now(),
            premium: false,
            activePremium: false,
          };

          await setDoc(userRef, baseProfile, { merge: true });
          setProfile(baseProfile);
        } else {
          setProfile(snap.data());
        }
      } else {
        setProfile(null);
      }

      setLoadingAuth(false);
    });

    return () => unsub();
  }, []);

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  // Simple premium flag
  const isPremium = profile?.activePremium === true;

  return {
    user,
    profile,
    isPremium,
    loadingAuth,
    loginWithGoogle,
    logout,
  };
}
