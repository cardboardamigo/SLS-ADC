"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
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
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        title: title.trim(),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      await refreshProfile();
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `profilePics/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", user.uid), { profilePicUrl: url });
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-[#38b2ac] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-20">
      <Header />

      <div className="max-w-2xl mx-auto px-5 py-5">
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-5 text-center text-base font-medium">
            Profile updated successfully
          </div>
        )}

        {/* Profile Picture */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-5 text-center">
          <div className="relative inline-block">
            {profile?.profilePicUrl ? (
              <Image
                src={profile.profilePicUrl}
                alt="Profile"
                width={128}
                height={128}
                className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-gray-100"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-[#1e3a5f] flex items-center justify-center mx-auto text-white text-4xl font-bold">
                {name ? name[0].toUpperCase() : "?"}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-1 right-1 bg-[#38b2ac] text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
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
          <p className="text-sm text-gray-400 mt-3">Tap camera icon to change photo</p>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">Profile Information</h2>

          <div className="mb-5">
            <label className="block text-base font-medium text-gray-600 mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38b2ac] transition text-base"
            />
          </div>

          <div className="mb-5">
            <label className="block text-base font-medium text-gray-600 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38b2ac] transition text-base"
            />
          </div>

          <div className="mb-5">
            <label className="block text-base font-medium text-gray-600 mb-2">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38b2ac] transition text-base"
            />
          </div>

          <div className="mb-6">
            <label className="block text-base font-medium text-gray-600 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Clinical Liaison"
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38b2ac] transition text-base"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#38b2ac] text-white py-4 rounded-xl text-lg font-semibold hover:bg-[#319795] disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {/* Install App */}
        {isInstallable && (
          <button
            onClick={promptInstall}
            className="w-full bg-[#1e3a5f] text-white py-4 rounded-xl text-lg font-semibold hover:bg-[#16314f] transition mb-3 flex items-center justify-center gap-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Install App
          </button>
        )}
        {isInstalled && (
          <div className="w-full bg-green-50 text-green-700 py-4 rounded-xl text-base font-medium border border-green-200 text-center mb-3">
            App is installed
          </div>
        )}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="w-full bg-white text-red-500 py-4 rounded-xl text-lg font-semibold border border-red-200 hover:bg-red-50 transition"
        >
          Sign Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
