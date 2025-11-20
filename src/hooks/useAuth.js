// src/hooks/useAuth.js
import { useEffect, useState, createContext, useContext } from "react";
import { auth, googleProvider, db } from "../firebase";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Create context
const AuthContext = createContext();

// Provider wrapper
export function AuthProvider({ children }) {
  const authValue = useProvideAuth();
  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
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
        // Load Firestore user profile
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          // First-time user → create document
          await setDoc(
            userRef,
            {
              email: firebaseUser.email,
              createdAt: Date.now(),
              premium: false,
              activePremium: false,
            },
            { merge: true }
          );
          setProfile({
            email: firebaseUser.email,
            premium: false,
            activePremium: false,
          });
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

  // Premium logic — very simple
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
