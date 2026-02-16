"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, withTimeout } from "@/lib/firebase";
import Image from "next/image";

export default function ProfilePage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Please select an image file");
      return;
    }

    setUploading(true);
    setSaveError(null);
    try {
      const storageRef = ref(storage, `profilePics/${user.uid}`);
      await withTimeout(uploadBytes(storageRef, file), 30000);
      const url = await withTimeout(getDownloadURL(storageRef));
      await withTimeout(setDoc(doc(db, "users", user.uid), { profilePicUrl: url }, { merge: true }));
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to upload photo:", err);
      const message = err instanceof Error && err.message.includes("timed out")
        ? "Photo upload timed out. Please check your connection."
        : "Failed to upload photo. Please try again.";
      setSaveError(message);
    } finally {
      setUploading(false);
      // Reset file inputs so the same file can be re-selected and
      // camera captures are properly released
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    try {
      const profileData = {
        uid: user.uid,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        title: title.trim(),
      };
      await withTimeout(setDoc(doc(db, "users", user.uid), profileData, { merge: true }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      refreshProfile().catch((err) => console.warn("Profile refresh failed:", err));
    } catch (err: unknown) {
      console.error("Failed to save profile:", err);
      const message = err instanceof Error && err.message.includes("timed out")
        ? "Save timed out. Please check your connection and try again."
        : "Failed to save profile. Please try again.";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  /* ── MD3 Outlined Input Styles ── */
  const md3Input: React.CSSProperties = {
    borderRadius: "12px",
    background: "rgba(255,255,255,0.9)",
    border: "1.5px solid rgba(15,42,74,0.2)",
    fontFamily: "'Poppins', sans-serif",
    color: "var(--navy)",
    fontSize: "14px",
  };

  function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "var(--navy)";
    e.target.style.boxShadow = "0 0 0 1px var(--navy)";
    e.target.style.background = "#fff";
  }

  function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "rgba(15,42,74,0.2)";
    e.target.style.boxShadow = "none";
    e.target.style.background = "rgba(255,255,255,0.9)";
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
      className="min-h-screen pb-24 content-below-header"
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(165deg, #c5ddf5 0%, #d4e6f9 40%, #ddeafa 70%, #e5eefb 100%)",
      }}
    >
      <Header />

      <div className="max-w-[420px] mx-auto px-5 py-5">
        {/* Status Messages */}
        {success && (
          <div
            className="text-sm p-3 mb-4 text-center font-medium rounded-xl"
            style={{
              background: "rgba(56,161,105,0.1)",
              border: "1px solid rgba(56,161,105,0.3)",
              color: "#276749",
            }}
          >
            Profile updated successfully
          </div>
        )}
        {saveError && (
          <div
            className="text-sm p-3 mb-4 text-center font-medium rounded-xl"
            style={{
              background: "rgba(220,38,38,0.1)",
              border: "1px solid rgba(220,38,38,0.3)",
              color: "#dc2626",
            }}
          >
            {saveError}
          </div>
        )}

        {/* Profile Avatar & Info */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative">
            {profile?.profilePicUrl ? (
              <Image
                src={profile.profilePicUrl}
                alt="Profile"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover"
                style={{ border: "3px solid rgba(15,42,74,0.15)" }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                style={{
                  background: "var(--navy)",
                  boxShadow: "0 4px 16px rgba(15,42,74,0.3)",
                }}
              >
                {name ? name[0].toUpperCase() : "?"}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Display user name and email below avatar */}
          {profile?.name && (
            <p className="text-base font-semibold mt-3" style={{ color: "var(--navy)" }}>
              {profile.name}
            </p>
          )}
          {profile?.email && (
            <p className="text-xs mt-0.5" style={{ color: "rgba(15,42,74,0.5)" }}>
              {profile.email}
            </p>
          )}

          {/* Camera & Gallery Buttons */}
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full transition-all active:scale-95"
              style={{
                background: "var(--navy)",
                color: "white",
                boxShadow: "0 2px 8px rgba(15,42,74,0.25)",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              Camera
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-full transition-all active:scale-95"
              style={{
                background: "var(--crimson)",
                color: "white",
                boxShadow: "0 2px 8px rgba(192,57,43,0.25)",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              Gallery
            </button>
          </div>

          {/* Hidden file inputs - Camera with capture, Gallery without */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {/* Profile Form - MD3 Outlined Style */}
        <form
          onSubmit={handleSave}
          className="p-5 mb-4 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(15,42,74,0.08)",
            boxShadow: "0 4px 16px rgba(15,42,74,0.06)",
          }}
        >
          <h2
            className="text-sm font-semibold mb-4 tracking-wide uppercase"
            style={{ color: "rgba(15,42,74,0.5)" }}
          >
            Profile Information
          </h2>

          <div className="space-y-3">
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "rgba(15,42,74,0.6)" }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="h-11 w-full px-4 text-sm focus:outline-none transition-all placeholder-[rgba(15,42,74,0.3)]"
                style={md3Input}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "rgba(15,42,74,0.6)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-11 w-full px-4 text-sm focus:outline-none transition-all placeholder-[rgba(15,42,74,0.3)]"
                style={md3Input}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "rgba(15,42,74,0.6)" }}
              >
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="h-11 w-full px-4 text-sm focus:outline-none transition-all placeholder-[rgba(15,42,74,0.3)]"
                style={md3Input}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: "rgba(15,42,74,0.6)" }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Clinical Liaison"
                className="h-11 w-full px-4 text-sm focus:outline-none transition-all placeholder-[rgba(15,42,74,0.3)]"
                style={md3Input}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="h-11 w-full text-white text-sm font-semibold rounded-xl active:scale-[0.98] disabled:opacity-50 transition-all mt-4"
            style={{
              background: "var(--crimson)",
              fontFamily: "'Poppins', sans-serif",
              boxShadow: "0 2px 12px rgba(192,57,43,0.3)",
            }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Install App */}
        {isInstallable && (
          <button
            onClick={promptInstall}
            className="h-11 w-full text-white text-sm font-semibold mb-3 flex items-center justify-center gap-2 rounded-xl active:scale-[0.98] transition-all"
            style={{
              background: "var(--navy)",
              fontFamily: "'Poppins', sans-serif",
              boxShadow: "0 2px 12px rgba(15,42,74,0.3)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Install App
          </button>
        )}
        {isInstalled && (
          <div
            className="h-11 w-full flex items-center justify-center text-sm font-medium mb-3 rounded-xl"
            style={{
              background: "rgba(56,161,105,0.1)",
              border: "1px solid rgba(56,161,105,0.3)",
              color: "#276749",
            }}
          >
            App is installed
          </div>
        )}

        {/* Sign Out - Prominent */}
        <button
          onClick={handleSignOut}
          className="h-11 w-full text-sm font-semibold rounded-xl active:scale-[0.98] transition-all"
          style={{
            background: "rgba(220,38,38,0.08)",
            border: "1.5px solid rgba(220,38,38,0.25)",
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
