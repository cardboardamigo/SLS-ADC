"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import Image from "next/image";

export default function ProfilePage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setTitle(profile.title || "");
    }
  }, [user, loading, router, profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    // DEBUG: Check Firebase auth state
    console.log("[DEBUG Profile] auth.currentUser:", auth.currentUser ? `EXISTS (uid: ${auth.currentUser.uid})` : "NULL");
    console.log("[DEBUG Profile] useAuth user:", user ? `EXISTS (uid: ${user.uid})` : "NULL");

    try {
      const profileData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        title: title.trim(),
      };
      console.log("[DEBUG Profile] Saving profile for uid:", user.uid, "with data:", JSON.stringify(profileData));
      await setDoc(doc(db, "users", user.uid), profileData, { merge: true });
      console.log("[DEBUG Profile] setDoc succeeded");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      await refreshProfile();
    } catch (err: unknown) {
      const error = err as Error;
      console.error("[DEBUG Profile] SAVE FAILED — error name:", error?.name);
      console.error("[DEBUG Profile] SAVE FAILED — error message:", error?.message);
      console.error("[DEBUG Profile] SAVE FAILED — error code:", (error as { code?: string })?.code);
      console.error("[DEBUG Profile] SAVE FAILED — full error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `profilePics/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await setDoc(doc(db, "users", user.uid), { profilePicUrl: url }, { merge: true });
      await refreshProfile();
    } catch (err) {
      console.error("Failed to upload photo:", err);
    } finally {
      setUploading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  /* ── Shared Styles (matching login page) ── */
  const glassCard: React.CSSProperties = {
    borderRadius: "var(--bubble-radius)",
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(15,42,74,0.12)",
    boxShadow: "0 8px 32px rgba(15,42,74,0.08)",
  };

  const inputStyle: React.CSSProperties = {
    borderRadius: "var(--bubble-radius-input)",
    background: "rgba(255,255,255,0.7)",
    border: "1.5px solid rgba(15,42,74,0.2)",
    fontFamily: "'Poppins', sans-serif",
    color: "var(--navy)",
  };

  function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "var(--crimson)";
    e.target.style.boxShadow = "0 0 0 3px rgba(192,57,43,0.12)";
    e.target.style.background = "rgba(255,255,255,0.9)";
  }

  function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "rgba(15,42,74,0.2)";
    e.target.style.boxShadow = "none";
    e.target.style.background = "rgba(255,255,255,0.7)";
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "linear-gradient(165deg, #c5ddf5 0%, #d4e6f9 40%, #ddeafa 70%, #e5eefb 100%)",
        }}
      >
        <div className="w-10 h-10 border-4 border-[#c0392b] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-28 pt-20"
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(165deg, #c5ddf5 0%, #d4e6f9 40%, #ddeafa 70%, #e5eefb 100%)",
      }}
    >
      <Header />

      <div className="max-w-[380px] mx-auto px-5 py-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/CT_LOGO_.png"
            alt="Census Tracker"
            width={180}
            height={180}
            className="object-contain"
            priority
          />
        </div>

        {/* Success Message */}
        {success && (
          <div
            className="text-sm p-3.5 mb-6 text-center font-medium"
            style={{
              borderRadius: "var(--bubble-radius-input)",
              background: "rgba(56,161,105,0.1)",
              border: "1px solid rgba(56,161,105,0.3)",
              color: "#276749",
            }}
          >
            Profile updated successfully
          </div>
        )}

        {/* Profile Picture Card */}
        <div className="p-8 mb-6 text-center" style={glassCard}>
          <div className="relative inline-block">
            {profile?.profilePicUrl ? (
              <Image
                src={profile.profilePicUrl}
                alt="Profile"
                width={120}
                height={120}
                className="w-[120px] h-[120px] rounded-full object-cover mx-auto"
                style={{ border: "4px solid rgba(15,42,74,0.1)" }}
              />
            ) : (
              <div
                className="w-[120px] h-[120px] rounded-full flex items-center justify-center mx-auto text-white text-4xl font-bold"
                style={{
                  background: "var(--navy)",
                  fontFamily: "'Poppins', sans-serif",
                  boxShadow: "0 6px 24px rgba(15,42,74,0.35)",
                }}
              >
                {name ? name[0].toUpperCase() : "?"}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-1 right-1 w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-white active:scale-95 transition-transform"
              style={{
                background: "var(--crimson)",
                boxShadow: "0 4px 12px rgba(192,57,43,0.35)",
              }}
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              )}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <p className="text-sm mt-4" style={{ color: "rgba(15,42,74,0.5)" }}>
            Tap camera icon to change photo
          </p>
        </div>

        {/* Profile Form Card */}
        <form onSubmit={handleSave} className="px-5 py-7 sm:px-7 mb-6" style={glassCard}>
          <h2
            className="text-lg font-semibold mb-6"
            style={{ color: "var(--navy)" }}
          >
            Profile Information
          </h2>

          <div className="space-y-5">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "rgba(15,42,74,0.7)" }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 w-full px-5 text-sm focus:outline-none transition-all"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "rgba(15,42,74,0.7)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-14 w-full px-5 text-sm focus:outline-none transition-all placeholder-[rgba(15,42,74,0.35)]"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "rgba(15,42,74,0.7)" }}
              >
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="h-14 w-full px-5 text-sm focus:outline-none transition-all placeholder-[rgba(15,42,74,0.35)]"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "rgba(15,42,74,0.7)" }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Clinical Liaison"
                className="h-14 w-full px-5 text-sm focus:outline-none transition-all placeholder-[rgba(15,42,74,0.35)]"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="h-14 w-full text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-50 transition-all mt-6"
            style={{
              borderRadius: "var(--bubble-radius-input)",
              background: "var(--crimson)",
              fontFamily: "'Poppins', sans-serif",
              boxShadow: "0 4px 20px rgba(192,57,43,0.35)",
            }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Install App */}
        {isInstallable && (
          <button
            onClick={promptInstall}
            className="h-14 w-full text-white text-sm font-semibold mb-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
            style={{
              borderRadius: "var(--bubble-radius-input)",
              background: "var(--navy)",
              fontFamily: "'Poppins', sans-serif",
              boxShadow: "0 4px 20px rgba(15,42,74,0.35)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Install App
          </button>
        )}
        {isInstalled && (
          <div
            className="h-14 w-full flex items-center justify-center text-sm font-medium mb-4"
            style={{
              borderRadius: "var(--bubble-radius-input)",
              background: "rgba(56,161,105,0.1)",
              border: "1px solid rgba(56,161,105,0.3)",
              color: "#276749",
            }}
          >
            App is installed
          </div>
        )}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="h-14 w-full text-sm font-semibold active:scale-[0.98] transition-all"
          style={{
            borderRadius: "var(--bubble-radius-input)",
            background: "rgba(255,255,255,0.65)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1.5px solid rgba(220,38,38,0.3)",
            color: "#dc2626",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Sign Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
