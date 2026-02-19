"use client";

import { useState } from "react";
import Image from "next/image";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function InstallPrompt() {
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  async function handleInstall() {
    await promptInstall();
  }

  return (
    <div
      className="w-full"
      style={{
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.7)",
        boxShadow: "0 4px 24px rgba(15,42,74,0.12)",
        padding: "1.25rem",
        marginTop: "1.5rem",
      }}
    >
      <div className="flex items-center gap-3">
        <Image
          src="/CT_App_Icon.png"
          alt="Census Tracker App"
          width={52}
          height={52}
          className="rounded-xl flex-shrink-0"
          style={{ boxShadow: "0 2px 8px rgba(15,42,74,0.15)" }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold leading-tight"
            style={{ color: "var(--navy)" }}
          >
            Install Census Tracker
          </p>
          <p
            className="text-xs mt-0.5 leading-snug"
            style={{ color: "rgba(15,42,74,0.5)" }}
          >
            Add to your home screen for quick access
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 text-white text-sm font-semibold py-2.5 transition-all active:scale-[0.97]"
          style={{
            borderRadius: "50px",
            background: "linear-gradient(135deg, var(--navy) 0%, #2a5a8a 100%)",
            boxShadow: "0 4px 12px rgba(15,42,74,0.3)",
            fontFamily: "'Poppins', sans-serif",
            border: "none",
          }}
        >
          Install App
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-sm font-medium py-2.5 px-5 transition-all active:scale-[0.97]"
          style={{
            borderRadius: "50px",
            background: "rgba(15,42,74,0.06)",
            color: "rgba(15,42,74,0.45)",
            fontFamily: "'Poppins', sans-serif",
            border: "none",
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
