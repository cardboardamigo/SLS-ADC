"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, withTimeout } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";

const APP_USERS: Record<string, { name: string; email: string; phone: string }> = {
  "jbrewer@slspecialty.org": { name: "West Brewer", email: "jbrewer@slspecialty.org", phone: "801-643-6775" },
  "twebb@slspecialty.org": { name: "Thad Webb", email: "twebb@slspecialty.org", phone: "801-680-9075" },
};

function friendlyAuthError(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong. Please try again.";
  const msg = err.message;
  if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password"))
    return "Incorrect PIN. Please try again.";
  if (msg.includes("auth/too-many-requests"))
    return "Too many failed attempts. Please wait a moment and try again.";
  if (msg.includes("auth/network-request-failed"))
    return "Network error. Please check your internet connection.";
  return "Something went wrong. Please try again.";
}

export { friendlyAuthError };

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pin: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(uid: string) {
    const docRef = doc(db, "users", uid);
    const snap = await withTimeout(getDoc(docRef));
    if (snap.exists()) {
      setProfile(snap.data() as UserProfile);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        try {
          await fetchProfile(firebaseUser.uid);
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      } else {
        setProfile(null);
      }
    });
    return unsubscribe;
  }, []);

  async function signIn(email: string, pin: string) {
    const password = "slspin_" + pin;

    // Try to sign in
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      try { await fetchProfile(cred.user.uid); } catch {}
      return;
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "";
      if (!code.includes("auth/user-not-found") && !code.includes("auth/invalid-credential")) {
        throw err;
      }
    }

    // Account doesn't exist yet — create it
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const userData = APP_USERS[email];
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email,
      name: userData?.name || "",
      phone: userData?.phone || "",
      title: "",
      profilePicUrl: "",
    };
    await setDoc(doc(db, "users", cred.user.uid), newProfile);
    setProfile(newProfile);
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.uid);
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
