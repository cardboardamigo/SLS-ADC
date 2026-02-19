"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
  const [profilePics, setProfilePics] = useState<Record<string, string>>({});

  const redirectTo = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectTo);
    }
  }, [user, authLoading, router, redirectTo]);

  useEffect(() => {
    async function fetchProfilePics() {
      try {
        const emails = USERS.map((u) => u.email);
        const q = query(collection(db, "users"), where("email", "in", emails));
        const snap = await getDocs(q);
        const pics: Record<string, string> = {};
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.email && data.profilePicUrl) {
            pics[data.email] = data.profilePicUrl;
          }
        });
        setProfilePics(pics);
      } catch {
        // Profile pics are cosmetic — fail silently
      }
    }
    fetchProfilePics();
  }, []);

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

  const spinner = (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  const errorBanner = error ? (
    <div
      className="text-sm p-3.5 mb-6 flex items-start gap-2.5"
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
      <div className="relative w-full max-w-[380px] lg:max-w-[480px] flex flex-col items-center lg:bg-white/80 lg:backdrop-blur-xl lg:rounded-2xl lg:shadow-2xl lg:p-10">

        {/* ── Select User View ── */}
        {!selectedUser && (
          <>
            <div className="flex flex-col items-center mb-10">
              <Image
                src="/CT_LOGO_.png"
                alt="Census Tracker"
                width={280}
                height={280}
                className="object-contain"
                priority
              />
            </div>

            {/* User selection area */}
            <div className="w-full px-6 py-8 sm:px-8">
              {errorBanner}

              <div className="flex justify-center gap-10">
                {USERS.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => handleSelectUser(u)}
                    className="flex flex-col items-center gap-3 group"
                    style={{ background: "transparent", boxShadow: "none", borderRadius: "0", border: "none" }}
                  >
                    {profilePics[u.email] ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={profilePics[u.email]}
                        alt={u.name}
                        className="w-[100px] h-[100px] rounded-full object-cover transition-transform active:scale-[0.93]"
                        style={{
                          boxShadow: "0 8px 30px rgba(15,42,74,0.4)",
                        }}
                      />
                    ) : (
                      <div
                        className="w-[100px] h-[100px] flex items-center justify-center text-white text-3xl font-bold transition-transform active:scale-[0.93]"
                        style={{
                          borderRadius: "50%",
                          background: "var(--navy)",
                          fontFamily: "'Poppins', sans-serif",
                          boxShadow: "0 8px 30px rgba(15,42,74,0.4)",
                        }}
                      >
                        {u.initials}
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--navy)" }}
                      >
                        {u.name}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: "rgba(15,42,74,0.4)" }}
                      >
                        Clinical Liaison
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Enter PIN View ── */}
        {selectedUser && (
          <div className="w-full flex flex-col items-center">
            <button
              onClick={handleBack}
              className="fixed lg:absolute top-0 left-0 flex items-center gap-2 transition z-10"
              style={{
                color: "rgba(15,42,74,0.5)",
                background: "transparent",
                boxShadow: "none",
                borderRadius: "0",
                padding: "1rem 1.25rem",
                paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--navy)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(15,42,74,0.5)")}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>

            <div className="flex flex-col items-center" style={{ marginBottom: "2.5rem" }}>
              {profilePics[selectedUser.email] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profilePics[selectedUser.email]}
                  alt={selectedUser.name}
                  className="w-[100px] h-[100px] rounded-full object-cover"
                  style={{
                    marginBottom: "1rem",
                    boxShadow: "0 8px 30px rgba(192,57,43,0.4)",
                  }}
                />
              ) : (
                <div
                  className="w-[100px] h-[100px] flex items-center justify-center text-white text-3xl font-bold"
                  style={{
                    marginBottom: "1rem",
                    borderRadius: "50%",
                    background: "var(--crimson)",
                    fontFamily: "'Poppins', sans-serif",
                    boxShadow: "0 8px 30px rgba(192,57,43,0.4)",
                  }}
                >
                  {selectedUser.initials}
                </div>
              )}
              <h2 className="text-2xl font-bold" style={{ color: "var(--navy)" }}>
                {selectedUser.name}
              </h2>
              <p className="text-sm mt-1" style={{ color: "rgba(15,42,74,0.5)" }}>
                Enter your PIN to continue
              </p>
            </div>

            {errorBanner}

            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center" style={{ gap: "3rem" }}>
              <div className="w-full">
                <label htmlFor="pin" className="block text-sm font-medium mb-3 text-center" style={{ color: "rgba(15,42,74,0.7)" }}>
                  4-Digit PIN
                </label>
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
                  className="w-full placeholder-[rgba(15,42,74,0.35)] focus:outline-none transition-all pill-input"
                  style={{
                    background: "rgba(255,255,255,0.7)",
                    border: "1.5px solid var(--navy)",
                    fontFamily: "'Poppins', sans-serif",
                    color: "var(--navy)",
                    fontSize: "1.25rem",
                    letterSpacing: "0.5em",
                  }}
                  placeholder="----"
                />
              </div>

              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className="btn-hero h-14 w-full text-white text-sm font-semibold disabled:opacity-50"
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
        )}
      </div>
    </main>
  );
}
