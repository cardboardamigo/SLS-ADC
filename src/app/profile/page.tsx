"use client";

import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useTheme } from "@/contexts/ThemeContext";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function ProfilePage() {
  const { user, profile, loading, signOut } = useAuthGuard();
  const { theme, toggleTheme } = useTheme();
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--profile-gradient)" }}
      >
        <div className="w-10 h-10 border-4 border-[var(--crimson)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <div
      className="min-h-screen pb-24 content-below-header"
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: "var(--profile-gradient)",
      }}
    >
      <Header />

      <div className="form-wrapper py-8">
        {/* ── Profile Card ── */}
        <div
          className="rounded-xl p-8 mb-12 flex flex-col items-center"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          {/* Avatar */}
          <div className="relative mb-4">
            {profile?.profilePicUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profile.profilePicUrl}
                alt="Profile"
                width={100}
                height={100}
                className="w-[100px] h-[100px] rounded-full object-cover block mx-auto"
                style={{ border: `3px solid ${isDark ? "var(--border)" : "rgba(15,42,74,0.15)"}`, boxShadow: "var(--avatar-shadow)" }}
              />
            ) : (
              <div
                className="w-[100px] h-[100px] rounded-full flex items-center justify-center text-white text-4xl font-bold"
                style={{
                  background: isDark ? "#2a4a7f" : "#1a365d",
                  boxShadow: "var(--avatar-shadow)",
                }}
              >
                {profile?.name ? profile.name[0].toUpperCase() : "?"}
              </div>
            )}
          </div>

          {/* Name & Email */}
          <h2
            className="text-xl font-bold mb-0.5"
            style={{ color: "var(--text)" }}
          >
            {profile?.name || "User"}
          </h2>
          <p
            className="text-sm mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            {profile?.email || ""}
          </p>
          {profile?.title && (
            <span
              className="text-xs px-3 py-1 rounded-full mt-1"
              style={{
                background: isDark ? "rgba(99,179,237,0.15)" : "rgba(26,54,93,0.08)",
                color: isDark ? "#90cdf4" : "#1a365d",
                fontWeight: 500,
              }}
            >
              {profile.title}
            </span>
          )}
          {profile?.phone && (
            <p
              className="text-xs mt-2"
              style={{ color: "var(--text-muted)" }}
            >
              {profile.phone}
            </p>
          )}
        </div>

        {/* ── Settings List ── */}
        <div
          className="rounded-xl overflow-hidden mb-12"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <h3
            className="text-xs font-semibold uppercase tracking-wider px-5 pt-4 pb-2"
            style={{ color: "var(--text-muted)" }}
          >
            Account
          </h3>

          {/* Edit Profile */}
          <button
            onClick={() => router.push("/profile/edit")}
            className="w-full flex items-center gap-4 px-5 py-3.5 transition-colors active:scale-[0.99]"
            style={{ background: "transparent" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: isDark ? "rgba(99,179,237,0.15)" : "rgba(26,54,93,0.08)",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={isDark ? "#90cdf4" : "#1a365d"} className="w-[18px] h-[18px]">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </div>
            <span className="text-sm font-medium flex-1 text-center" style={{ color: "var(--text)" }}>
              Edit Profile
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="var(--text-muted)" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <div className="mx-5" style={{ borderBottom: "1px solid var(--border)" }} />

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-4 px-5 py-3.5 transition-colors active:scale-[0.99]"
            style={{ background: "transparent" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: isDark ? "rgba(251,191,36,0.15)" : "rgba(107,70,193,0.08)",
              }}
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#fbbf24" className="w-[18px] h-[18px]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#6b46c1" className="w-[18px] h-[18px]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium flex-1 text-center" style={{ color: "var(--text)" }}>
              Dark Mode
            </span>
            {/* Toggle Switch */}
            <div
              className="relative w-12 h-7 rounded-full transition-colors"
              style={{
                background: isDark ? "#63b3ed" : "#cbd5e0",
              }}
            >
              <div
                className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform"
                style={{
                  transform: isDark ? "translateX(22px)" : "translateX(2px)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </div>
          </button>
        </div>

        {/* ── App Section ── */}
        <div
          className="rounded-xl overflow-hidden mb-12"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <h3
            className="text-xs font-semibold uppercase tracking-wider px-5 pt-4 pb-2"
            style={{ color: "var(--text-muted)" }}
          >
            App
          </h3>

          {/* Install App */}
          {isInstallable && (
            <>
              <button
                onClick={promptInstall}
                className="w-full flex items-center gap-4 px-5 py-3.5 transition-colors active:scale-[0.99]"
                style={{ background: "transparent" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: isDark ? "rgba(104,211,145,0.15)" : "rgba(56,161,105,0.08)",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={isDark ? "#68d391" : "#38a169"} className="w-[18px] h-[18px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <span className="text-sm font-medium flex-1 text-center" style={{ color: "var(--text)" }}>
                  Install App
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="var(--text-muted)" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
              <div className="mx-5" style={{ borderBottom: "1px solid var(--border)" }} />
            </>
          )}

          {isInstalled && (
            <>
              <div className="flex items-center gap-4 px-5 py-3.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: isDark ? "rgba(104,211,145,0.15)" : "rgba(56,161,105,0.08)",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={isDark ? "#68d391" : "#38a169"} className="w-[18px] h-[18px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: "var(--success)" }}>
                  App Installed
                </span>
              </div>
              <div className="mx-5" style={{ borderBottom: "1px solid var(--border)" }} />
            </>
          )}

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-5 py-3.5 transition-colors active:scale-[0.99]"
            style={{ background: "transparent" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: isDark ? "rgba(252,129,129,0.15)" : "rgba(229,62,62,0.08)",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={isDark ? "#fc8181" : "#e53e3e"} className="w-[18px] h-[18px]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
            </div>
            <span className="text-sm font-medium flex-1 text-center" style={{ color: "var(--danger)" }}>
              Sign Out
            </span>
          </button>
        </div>

        {/* Version info */}
        <p
          className="text-center text-xs mt-4"
          style={{ color: "var(--text-muted)", opacity: 0.6 }}
        >
          Census Tracker v1.0
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
