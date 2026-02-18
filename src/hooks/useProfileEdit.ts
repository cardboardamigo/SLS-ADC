"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useTheme } from "@/contexts/ThemeContext";
import { doc, setDoc } from "firebase/firestore";
import {
  ref,
  getDownloadURL,
  type UploadTask,
} from "firebase/storage";
import { getAuth } from "firebase/auth";
import { db, storage, storageAlt, storageAltBucket } from "@/lib/firebase";
import { withTimeout, compressImage, uploadWithProgress } from "@/lib/imageUtils";

// ── Upload state machine ────────────────────────────────────────────────────

export type UploadStatus = "idle" | "compressing" | "uploading" | "error";
const MAX_RETRIES = 2;

// ── Hook ────────────────────────────────────────────────────────────────────

export function useProfileEdit() {
  const { user, profile, loading, updateProfileData } = useAuthGuard();
  const { theme } = useTheme();
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const unmountedRef = useRef(false);
  const cancelledRef = useRef(false);
  const uploadTaskRef = useRef<UploadTask | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  // ── TEMPORARY DIAGNOSTICS (remove after upload is confirmed working) ──
  const [diagLog, setDiagLog] = useState<string[]>([]);

  // ── Populate form from profile ──────────────────────────────────────────

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setTitle(profile.title || "");
    }
  }, [profile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  // Revoke preview blob when it changes or unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetInputs = useCallback(() => {
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }, []);

  const cancelUpload = useCallback(() => {
    cancelledRef.current = true;
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      uploadTaskRef.current = null;
    }
    setUploadStatus("idle");
    setUploadProgress(0);
    setPreviewUrl(null);
    setSaveError(null);
    resetInputs();
  }, [resetInputs]);

  // ── Photo upload handler ────────────────────────────────────────────────

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      setSaveError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Image must be under 5MB");
      return;
    }

    // ── TEMPORARY DIAGNOSTICS (remove after upload is confirmed working) ──
    const diag = (msg: string) => setDiagLog((prev) => [...prev, msg]);
    setDiagLog([]);
    const bucketName = storage.app.options.storageBucket;
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken(true).catch(() => null);
    diag(`Bucket: ${bucketName || "\u26a0 EMPTY"}${storageAltBucket ? ` (fallback: ${storageAltBucket})` : ""}`);
    diag(`Auth: ${auth.currentUser?.uid || "\u26a0 NO USER"}`);
    diag(`Token: ${token ? "OK" : "\u26a0 NONE"}`);
    diag(`File: ${(file.size / 1024).toFixed(0)} KB ${file.type}`);

    if (!bucketName) {
      setSaveError("Storage is not configured. Please contact support.");
      diag("\u26a0 NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is empty");
      return;
    }
    if (!token) {
      setSaveError("Your session has expired. Please log out and log back in.");
      diag("\u26a0 No auth token \u2014 upload will be rejected");
      return;
    }
    // ── END TEMPORARY DIAGNOSTICS ──

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    cancelledRef.current = false;
    setSaveError(null);
    setUploadProgress(0);

    try {
      // ── Stage 1: Compress (10 s timeout) ──
      setUploadStatus("compressing");
      const compressed = await compressImage(file);
      diag(`Compressed: ${(compressed.size / 1024).toFixed(0)} KB`);
      if (cancelledRef.current || unmountedRef.current) return;

      // ── Stage 2: Upload to Firebase Storage ──
      setUploadStatus("uploading");
      const primaryPath = `profilePics/${user.uid}`;

      let lastErr: unknown;
      let useAlt = false;
      let successRef: ReturnType<typeof ref> | null = null;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (cancelledRef.current || unmountedRef.current) return;

        if (attempt > 0) {
          setUploadProgress(0);
          await new Promise((r) => setTimeout(r, 1500));
          if (cancelledRef.current || unmountedRef.current) return;
        }

        const storageInstance = (useAlt && storageAlt) ? storageAlt : storage;
        const storageRef = ref(storageInstance, primaryPath);

        let stalled = false;
        const bucketLabel = (useAlt && storageAlt) ? "alt bucket" : "primary bucket";
        diag(`Attempt ${attempt + 1}/${MAX_RETRIES + 1} (${bucketLabel})\u2026`);
        try {
          const { task, promise } = uploadWithProgress(
            storageRef,
            compressed,
            (pct) => {
              if (!cancelledRef.current && !unmountedRef.current) {
                setUploadProgress(pct);
              }
            },
            () => { stalled = true; },
            20_000,
          );
          uploadTaskRef.current = task;
          await promise;
          uploadTaskRef.current = null;
          lastErr = null;
          successRef = storageRef;
          diag(`Upload OK (attempt ${attempt + 1}, ${bucketLabel})`);
          break;
        } catch (err) {
          uploadTaskRef.current = null;
          lastErr = err;
          if (cancelledRef.current || unmountedRef.current) return;
          if (stalled) {
            lastErr = new Error("Upload stalled \u2014 no progress for 20s");
            if (!useAlt && storageAlt) {
              useAlt = true;
              diag("Switching to alternate bucket format for next attempt\u2026");
            }
          }
          diag(`Attempt ${attempt + 1} failed: ${stalled ? "stalled" : (err instanceof Error ? err.message : "unknown")}`);
        }
      }

      if (lastErr) throw lastErr;
      if (cancelledRef.current || unmountedRef.current) return;

      // ── Stage 3: Get download URL (15 s timeout) ──
      const downloadUrl = await withTimeout(
        getDownloadURL(successRef!),
        15_000,
        "Retrieving photo URL",
      );
      if (cancelledRef.current || unmountedRef.current) return;

      diag("Got URL \u2014 done!");

      setDoc(doc(db, "users", user.uid), { profilePicUrl: downloadUrl }, { merge: true })
        .catch((err) => console.error("Background photo URL sync failed:", err));

      updateProfileData({ profilePicUrl: downloadUrl });
      setPreviewUrl(null);
      setImgLoaded(false);
      setUploadStatus("idle");
      setUploadProgress(0);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      if (cancelledRef.current || unmountedRef.current) return;
      console.error("Failed to upload photo:", err);
      setPreviewUrl(null);

      let message: string;
      if (err instanceof Error && (err.message.includes("timed out") || err.message.includes("stalled"))) {
        message = "Upload failed \u2014 connection too slow or unstable. Please try again.";
      } else if (err instanceof Error && err.message.includes("Canvas not supported")) {
        message = "Your browser could not process the image. Try a different photo.";
      } else {
        message = "Failed to upload photo. Please try again.";
      }
      setUploadStatus("error");
      setUploadProgress(0);
      setSaveError(message);
    } finally {
      uploadTaskRef.current = null;
      resetInputs();
      if (!cancelledRef.current && !unmountedRef.current) {
        setUploadStatus((prev) => (prev === "compressing" || prev === "uploading" ? "idle" : prev));
      }
    }
  }

  // ── Form save handler ───────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaveError(null);

    const profileData = {
      uid: user.uid,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      title: title.trim(),
    };
    updateProfileData(profileData);
    setDoc(doc(db, "users", user.uid), profileData, { merge: true })
      .catch((err) => console.error("Background profile sync failed:", err));

    setSaving(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      router.push("/profile");
    }, 1500);
  }

  // ── Computed ────────────────────────────────────────────────────────────

  const isDark = theme === "dark";
  const isUploading = uploadStatus === "compressing" || uploadStatus === "uploading";
  const displayUrl = previewUrl || profile?.profilePicUrl;

  return {
    // Auth / loading
    loading,
    // Form fields
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    title,
    setTitle,
    // Save state
    saving,
    success,
    saveError,
    // Photo upload
    cameraInputRef,
    galleryInputRef,
    previewUrl,
    uploadStatus,
    uploadProgress,
    imgLoaded,
    setImgLoaded,
    isUploading,
    displayUrl,
    diagLog,
    setDiagLog,
    handlePhotoUpload,
    cancelUpload,
    // Form action
    handleSave,
    // Theme
    isDark,
    // Navigation
    router,
  };
}
