"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth, friendlyAuthError } from "@/contexts/AuthContext";
import { USERS } from "@/lib/config";

type SelectedUser = (typeof USERS)[number] | null;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [selectedUser, setSelectedUser] = useState<SelectedUser>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pinInputRef = useRef<HTMLInputElement>(null);

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo);
    }
  }, [user, authLoading, router, redirectTo]);

  useEffect(() => {
    if (selectedUser) {
      setTimeout(() => pinInputRef.current?.focus(), 100);
    }
  }, [selectedUser]);

  function handleSelectUser(u: (typeof USERS)[number]) {
    setError("");
    setPin("");
    setSelectedUser(u);
  }

  function handleBack() {
    setError("");
    setPin("");
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

    setLoading(true);
    try {
      await signIn(selectedUser.email, pin);
      router.replace(redirectTo);
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(value);
  }

  /* ── Shared Styles ── */
  const glassCard = {
    borderRadius: "var(--card-radius)",
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
      className="text-sm p-3.5 mb-12 flex items-start gap-2.5"
      style={{
        borderRadius: "50px",
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
            <div className="flex flex-col items-center mb-12">
              <Image
                src="/CT_LOGO_.png"
                alt="Census Tracker"
                width={360}
                height={360}
                className="object-contain"
                priority
              />
            </div>

            <div className="w-full flex flex-col items-center gap-12">
              {errorBanner}

              <p
                className="text-sm font-medium tracking-wide text-center"
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
              className="flex items-center gap-2 transition mb-12"
              style={{ color: "rgba(15,42,74,0.5)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--navy)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(15,42,74,0.5)")}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>

            <div className="flex flex-col items-center mb-12 mt-4">
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
              <form onSubmit={handleSubmit} className="space-y-12">
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
                        borderRadius: "50px",
                        background: "rgba(255,255,255,0.7)",
                        border: "1.5px solid var(--navy)",
                        fontFamily: "'Poppins', sans-serif",
                        color: "var(--navy)",
                        fontSize: "1.25rem",
                        letterSpacing: "0.5em",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)",
                        maxWidth: "100%",
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
                  className="btn-hero h-14 w-full mx-auto block text-white text-sm font-semibold disabled:opacity-50"
                  style={{
                    fontFamily: "'Poppins', sans-serif",
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
