"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile } from "@/lib/types";

function friendlyAuthError(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong. Please try again.";
  const msg = err.message;
  if (msg.includes("auth/operation-not-allowed"))
    return "Email/password sign-in is not enabled. Please contact the administrator to enable it in the Firebase console.";
  if (msg.includes("auth/user-not-found") || msg.includes("auth/wrong-password") || msg.includes("auth/invalid-credential"))
    return "Invalid email or password. Please try again.";
  if (msg.includes("auth/email-already-in-use"))
    return "An account with this email already exists. Try signing in instead.";
  if (msg.includes("auth/weak-password"))
    return "Password is too weak. Please use at least 6 characters.";
  if (msg.includes("auth/invalid-email"))
    return "Please enter a valid email address.";
  if (msg.includes("auth/too-many-requests"))
    return "Too many failed attempts. Please wait a moment and try again.";
  if (msg.includes("auth/network-request-failed"))
    return "Network error. Please check your internet connection.";
  if (msg.includes("auth/popup-blocked"))
    return "Popup was blocked by your browser. Trying redirect sign-in instead...";
  if (msg.includes("auth/popup-closed-by-user"))
    return "Sign-in popup was closed. Please try again.";
  if (msg.includes("auth/cancelled-popup-request"))
    return "Sign-in was cancelled. Please try again.";
  return "Something went wrong. Please try again.";
}

export { friendlyAuthError };

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
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
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      setProfile(snap.data() as UserProfile);
    }
  }

  useEffect(() => {
    // Handle Google redirect result (from signInWithRedirect fallback)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const docRef = doc(db, "users", result.user.uid);
          const snap = await getDoc(docRef);
          if (!snap.exists()) {
            const newProfile: UserProfile = {
              uid: result.user.uid,
              email: result.user.email || "",
              name: result.user.displayName || "",
              phone: result.user.phoneNumber || "",
              title: "",
              profilePicUrl: result.user.photoURL || "",
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          } else {
            setProfile(snap.data() as UserProfile);
          }
        }
      })
      .catch((err) => {
        console.error("Redirect sign-in error:", err);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await fetchProfile(firebaseUser.uid);
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    console.log("Attempting email/password sign-in for:", email);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log("Sign-in successful, fetching profile...");
    try {
      await fetchProfile(cred.user.uid);
      console.log("Profile loaded successfully");
    } catch (err) {
      // Profile fetch failure should not block sign-in — the user IS authenticated.
      // The profile will be loaded by onAuthStateChanged listener.
      console.warn("Profile fetch after sign-in failed (non-fatal):", err);
    }
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    console.log("Starting Google sign-in...");

    // Detect standalone PWA mode — popups never work here, go straight to redirect
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window.navigator as any).standalone === true);

    if (isStandalone) {
      console.log("Standalone PWA detected, using redirect sign-in...");
      await signInWithRedirect(auth, provider);
      return; // Page will redirect; profile handled by getRedirectResult on return
    }

    try {
      console.log("Attempting sign-in with popup...");
      const cred = await signInWithPopup(auth, provider);
      console.log("Popup sign-in successful, user:", cred.user.email);
      const docRef = doc(db, "users", cred.user.uid);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        console.log("Creating new user profile...");
        const newProfile: UserProfile = {
          uid: cred.user.uid,
          email: cred.user.email || "",
          name: cred.user.displayName || "",
          phone: cred.user.phoneNumber || "",
          title: "",
          profilePicUrl: cred.user.photoURL || "",
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
        console.log("User profile created successfully");
      } else {
        console.log("User profile already exists, loading...");
        setProfile(snap.data() as UserProfile);
      }
    } catch (err: unknown) {
      // If popup fails for any reason, fall back to redirect
      const msg = err instanceof Error ? err.message : "";
      console.error("Google sign-in popup error:", msg);
      if (
        msg.includes("auth/popup-blocked") ||
        msg.includes("auth/popup-closed-by-user") ||
        msg.includes("auth/cancelled-popup-request") ||
        msg.includes("auth/internal-error") ||
        msg.includes("auth/network-request-failed")
      ) {
        console.log("Popup failed, falling back to redirect...");
        await signInWithRedirect(auth, provider);
        return; // Page will redirect; profile handled by getRedirectResult on return
      }
      throw err;
    }
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function signUp(email: string, password: string, name: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email,
      name,
      phone: "",
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
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signInWithGoogle, resetPassword, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
