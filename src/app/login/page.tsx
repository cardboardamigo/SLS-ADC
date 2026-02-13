"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyAuthError } from "@/contexts/AuthContext";

const USERS = [
  { initials: "WB", name: "West Brewer", email: "jbrewer@slspecialty.org", pin: "6775" },
  { initials: "TW", name: "Thad Webb", email: "twebb@slspecialty.org", pin: "9075" },
] as const;

type SelectedUser = (typeof USERS)[number] | null;

export default function LoginPage() {
  const [selectedUser, setSelectedUser] = useState<SelectedUser>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const { user, loading: authLoading, signIn, recoverWithGoogle } = useAuth();
  const router = useRouter();
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  // Auto-focus PIN input when user is selected
  useEffect(() => {
    if (selectedUser) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [selectedUser]);

  function handleSelectUser(u: (typeof USERS)[number]) {
    setError("");
    setPin("");
    setShowRecovery(false);
    setSelectedUser(u);
  }

  function handleBack() {
    setError("");
    setPin("");
    setShowRecovery(false);
    setSelectedUser(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setError("");

    if (pin.length !== 4) {
      setError("Please enter a 4-digit PIN.");
      return;
    }

    if (pin !== selectedUser.pin) {
      setError("Incorrect PIN. Please try again.");
      return;
    }

    setLoading(true);
    try {
      await signIn(selectedUser.email, pin);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
      if (err instanceof Error && err.message.includes("auth/account-password-mismatch")) {
        setShowRecovery(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(value);
  }

  async function handleGoogleRecovery() {
    if (!selectedUser) return;
    setError("");
    setLoading(true);
    try {
      await recoverWithGoogle(selectedUser.email, selectedUser.pin);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
      setShowRecovery(false);
    } finally {
      setLoading(false);
    }
  }

  /* ── Shared Styles ── */
  const glassCard = {
    borderRadius: "var(--bubble-radius)",
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(15,42,74,0.12)",
    boxShadow: "0 8px 32px rgba(15,42,74,0.08)",
  };

  const spinner = (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  const errorBanner = error ? (
    <div
      className="text-sm p-3.5 mb-5 flex items-start gap-2.5"
      style={{
        borderRadius: "var(--bubble-radius-input)",
        background: "rgba(220,38,38,0.08)",
        border: "1px solid rgba(220,38,38,0.3)",
        color: "#b91c1c",
      }}
    >
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{error}</span>
    </div>
  ) : null;

  return (
    <main
      className="min-h-[100svh] flex flex-col items-center justify-center px-5 py-10"
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(165deg, #c5ddf5 0%, #d4e6f9 40%, #ddeafa 70%, #e5eefb 100%)",
      }}
    >
      <div className="relative w-full max-w-[380px] flex flex-col items-center">

        {/* ── Select User View ── */}
        {!selectedUser && (
          <>
            <div className="flex flex-col items-center mb-10">
              <Image
                src="/CT_LOGO_.png"
                alt="Census Tracker"
                width={360}
                height={360}
                className="object-contain"
                priority
              />
            </div>

            <div className="w-full flex flex-col items-center gap-6">
              {errorBanner}

              <p
                className="text-sm font-medium tracking-wide"
                style={{ color: "rgba(15,42,74,0.5)" }}
              >
                Select your account
              </p>

              <div className="flex gap-8">
                {USERS.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => handleSelectUser(u)}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div
                      className="w-20 h-20 flex items-center justify-center text-white text-2xl font-bold active:scale-[0.95] transition-all"
                      style={{
                        borderRadius: "50%",
                        background: "var(--navy)",
                        fontFamily: "'Poppins', sans-serif",
                        boxShadow: "0 6px 24px rgba(15,42,74,0.35)",
                      }}
                    >
                      {u.initials}
                    </div>
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--navy)" }}
                    >
                      {u.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Enter PIN View ── */}
        {selectedUser && (
          <div className="w-full">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 transition mb-5"
              style={{ color: "rgba(15,42,74,0.5)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--navy)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(15,42,74,0.5)")}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>

            <div className="flex flex-col items-center mb-8 mt-4">
              <div
                className="w-20 h-20 flex items-center justify-center text-white text-2xl font-bold mb-4"
                style={{
                  borderRadius: "50%",
                  background: "var(--crimson)",
                  fontFamily: "'Poppins', sans-serif",
                  boxShadow: "0 6px 24px rgba(192,57,43,0.35)",
                }}
              >
                {selectedUser.initials}
              </div>
              <h2 className="text-2xl font-bold" style={{ color: "var(--navy)" }}>
                {selectedUser.name}
              </h2>
              <p className="text-sm mt-1" style={{ color: "rgba(15,42,74,0.5)" }}>
                Enter your PIN to continue
              </p>
            </div>

            <div className="px-5 py-7 sm:px-7" style={glassCard}>
              {errorBanner}

              {showRecovery && (
                <button
                  type="button"
                  onClick={handleGoogleRecovery}
                  disabled={loading}
                  className="h-14 w-full text-sm font-semibold active:scale-[0.98] disabled:opacity-50 transition-all mb-5 flex items-center justify-center gap-3"
                  style={{
                    borderRadius: "var(--bubble-radius-input)",
                    background: "rgba(255,255,255,0.9)",
                    border: "1.5px solid rgba(15,42,74,0.2)",
                    fontFamily: "'Poppins', sans-serif",
                    color: "var(--navy)",
                  }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {loading ? "Recovering..." : "Sign in with Google to recover"}
                </button>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="pin" className="block text-sm font-medium mb-2" style={{ color: "rgba(15,42,74,0.7)" }}>
                    4-Digit PIN
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <svg className="w-5 h-5" style={{ color: "rgba(15,42,74,0.4)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <input
                      ref={pinInputRef}
                      id="pin"
                      name="pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={pin}
                      onChange={handlePinChange}
                      maxLength={4}
                      required
                      className="h-14 w-full pl-14 pr-5 text-sm text-center tracking-[0.5em] placeholder-[rgba(15,42,74,0.35)] focus:outline-none transition-all"
                      style={{
                        borderRadius: "var(--bubble-radius-input)",
                        background: "rgba(255,255,255,0.7)",
                        border: "1.5px solid var(--navy)",
                        fontFamily: "'Poppins', sans-serif",
                        color: "var(--navy)",
                        fontSize: "1.25rem",
                        letterSpacing: "0.5em",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "var(--crimson)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(192,57,43,0.12)";
                        e.target.style.background = "rgba(255,255,255,0.9)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "var(--navy)";
                        e.target.style.boxShadow = "none";
                        e.target.style.background = "rgba(255,255,255,0.7)";
                      }}
                      placeholder="----"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || pin.length !== 4}
                  className="h-14 w-full text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-50 transition-all mt-2"
                  style={{
                    borderRadius: "var(--bubble-radius-input)",
                    background: "var(--crimson)",
                    fontFamily: "'Poppins', sans-serif",
                    boxShadow: "0 4px 20px rgba(192,57,43,0.35)",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      {spinner}
                      Signing in...
                    </span>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
