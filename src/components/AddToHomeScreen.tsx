"use client";

import { useState } from "react";
import type { Platform } from "@/hooks/useInstallPrompt";

interface Props {
  platform: Platform;
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<boolean>;
  isDark: boolean;
}

export default function AddToHomeScreen({
  platform,
  isInstallable,
  isInstalled,
  promptInstall,
  isDark,
}: Props) {
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) return null;

  async function handleClick() {
    if (isInstallable) {
      await promptInstall();
    } else {
      setShowModal(true);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="w-full relative flex items-center justify-center py-3.5 transition-colors active:scale-[0.99] min-h-[48px]"
        style={{ background: "transparent", boxShadow: "none", borderRadius: "0" }}
      >
        <div
          className="absolute left-0 w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: isDark ? "rgba(99,179,237,0.15)" : "rgba(26,54,93,0.08)",
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={isDark ? "#90cdf4" : "#1a365d"} className="w-[18px] h-[18px]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0-3-3m3 3 3-3m-8.25 6a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
          </svg>
        </div>
        <span className="text-sm font-medium text-center" style={{ color: "var(--text)" }}>
          Add to Home Screen
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="var(--text-muted)" className="w-4 h-4 absolute right-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Instructions Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: "var(--overlay)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md mx-4 mb-4 sm:mb-0"
            style={{
              background: "var(--card)",
              borderRadius: "16px",
              boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
              padding: "1.5rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-base font-semibold"
                style={{ color: "var(--text)" }}
              >
                Add to Home Screen
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  boxShadow: "none",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="var(--text-muted)" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {platform === "ios" ? (
              <div className="space-y-4">
                <Step
                  number={1}
                  isDark={isDark}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
                    </svg>
                  }
                  text={
                    <>Tap the <strong>Share</strong> button in the Safari toolbar</>
                  }
                />
                <Step
                  number={2}
                  isDark={isDark}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  }
                  text={
                    <>Scroll down and tap <strong>Add to Home Screen</strong></>
                  }
                />
                <Step
                  number={3}
                  isDark={isDark}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  }
                  text={
                    <>Tap <strong>Add</strong> in the top right corner</>
                  }
                />
              </div>
            ) : (
              <div className="space-y-4">
                <Step
                  number={1}
                  isDark={isDark}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                    </svg>
                  }
                  text={
                    <>Tap the <strong>menu</strong> button (three dots) in your browser</>
                  }
                />
                <Step
                  number={2}
                  isDark={isDark}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0-3-3m3 3 3-3m-8.25 6a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                    </svg>
                  }
                  text={
                    <>Select <strong>Install app</strong> or <strong>Add to Home Screen</strong></>
                  }
                />
                <Step
                  number={3}
                  isDark={isDark}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  }
                  text={
                    <>Tap <strong>Install</strong> to confirm</>
                  }
                />
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-5 text-white text-sm font-semibold py-3 transition-all active:scale-[0.97]"
              style={{
                borderRadius: "50px",
                background: isDark
                  ? "linear-gradient(135deg, #63b3ed 0%, #4299e1 100%)"
                  : "linear-gradient(135deg, #1a365d 0%, #2a5a8a 100%)",
                boxShadow: isDark
                  ? "0 4px 12px rgba(99,179,237,0.3)"
                  : "0 4px 12px rgba(15,42,74,0.3)",
                border: "none",
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({
  number,
  isDark,
  icon,
  text,
}: {
  number: number;
  isDark: boolean;
  icon: React.ReactNode;
  text: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          background: isDark ? "rgba(99,179,237,0.15)" : "rgba(26,54,93,0.08)",
          color: isDark ? "#90cdf4" : "#1a365d",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          Step {number}
        </p>
        <p className="text-sm" style={{ color: "var(--text)" }}>
          {text}
        </p>
      </div>
    </div>
  );
}
