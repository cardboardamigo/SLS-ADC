"use client";

import { useState } from "react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function InstallPrompt() {
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  async function handleInstall() {
    await promptInstall();
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-[#1a365d] text-white rounded-xl p-4 shadow-xl z-50 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold text-sm">Install Census Tracker</p>
          <p className="text-white/70 text-xs mt-0.5">
            Add to your home screen for quick access
          </p>
        </div>
        <div className="flex gap-2 ml-3">
          <button
            onClick={() => setDismissed(true)}
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
