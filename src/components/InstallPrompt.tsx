"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-[#1e3a5f] text-white rounded-2xl p-4 shadow-xl z-50 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold text-sm">Install Census Tracker</p>
          <p className="text-white/70 text-xs mt-0.5">
            Add to your home screen for quick access
          </p>
        </div>
        <div className="flex gap-2 ml-3">
          <button
            onClick={() => setShowPrompt(false)}
            className="text-white/50 text-sm px-3 py-1.5"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="bg-[#38b2ac] text-white text-sm px-4 py-1.5 rounded-xl font-medium"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
