"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyAuthError } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if credential management + biometric is available
    if (
      typeof window !== "undefined" &&
      window.PublicKeyCredential &&
      navigator.credentials
    ) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().then(
        (available) => {
          // Also check if we have a saved credential flag
          const hasSavedLogin = localStorage.getItem("sls-biometric-enabled");
          setBiometricAvailable(available && hasSavedLogin === "true");
        }
      );
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (resetMode) {
      setLoading(true);
      try {
        await resetPassword(email);
        setResetSent(true);
      } catch (err: unknown) {
        setError(friendlyAuthError(err));
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // Offer to save credentials for biometric login
      if (window.PublicKeyCredential) {
        localStorage.setItem("sls-biometric-enabled", "true");
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleBiometricSignIn() {
    setError("");
    setLoading(true);
    try {
      // Use Credential Management API to retrieve stored credentials
      const credential = await navigator.credentials.get({
        password: true,
        mediation: "required",
      } as CredentialRequestOptions);

      if (credential && "password" in credential) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pwCred = credential as any;
        await signIn(pwCred.id as string, pwCred.password as string);
        router.push("/dashboard");
      } else {
        setError("No saved credentials found. Please sign in with your email and password.");
        setBiometricAvailable(false);
        localStorage.removeItem("sls-biometric-enabled");
      }
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  // Password reset view
  if (resetMode) {
    return (
      <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Poppins', sans-serif", background: "linear-gradient(160deg, #f0f4f8 0%, #ffffff 40%, #fdf0ef 100%)" }}>
        {/* Decorative bubbles */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(15,42,74,0.04) 0%, transparent 70%)" }} />
          <div className="absolute top-1/3 -left-16 w-56 h-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(192,57,43,0.03) 0%, transparent 70%)" }} />
          <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(15,42,74,0.03) 0%, transparent 70%)" }} />
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {/* Back button */}
            <button
              onClick={() => {
                setResetMode(false);
                setResetSent(false);
                setError("");
              }}
              className="flex items-center gap-2 transition mb-8 -ml-1"
              style={{ color: "rgba(15,42,74,0.5)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#0f2a4a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(15,42,74,0.5)")}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span className="text-sm font-medium">Back to Sign In</span>
            </button>

            <div
              className="p-8 shadow-lg border border-gray-100/60"
              style={{ borderRadius: "var(--bubble-radius)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)" }}
            >
              <div
                className="w-12 h-12 flex items-center justify-center mb-5"
                style={{ borderRadius: "16px", background: "rgba(15,42,74,0.08)" }}
              >
                <svg className="w-6 h-6" style={{ color: "#0f2a4a" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>

              <h2 className="text-xl font-bold mb-1" style={{ color: "#0f2a4a" }}>Reset Password</h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "#94a3b8" }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {resetSent ? (
                <div className="p-4" style={{ borderRadius: "var(--bubble-radius-input)", background: "#ecfdf5", border: "1px solid #d1fae5" }}>
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#10b981" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "#065f46" }}>Email Sent!</p>
                      <p className="text-sm mt-1 leading-relaxed" style={{ color: "rgba(6,95,70,0.7)" }}>
                        Check your inbox for a password reset link.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div
                      className="text-sm p-3 mb-5 flex items-start gap-2.5"
                      style={{ borderRadius: "var(--bubble-radius-input)", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
                    >
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="mb-5">
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#64748b" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-5 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none transition-all"
                      style={{
                        borderRadius: "var(--bubble-radius-input)",
                        background: "#f8fafc",
                        border: "1.5px solid #e2e8f0",
                        fontFamily: "'Poppins', sans-serif",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "rgba(15,42,74,0.3)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(15,42,74,0.08)";
                        e.target.style.background = "#ffffff";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e2e8f0";
                        e.target.style.boxShadow = "none";
                        e.target.style.background = "#f8fafc";
                      }}
                      placeholder="your@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full text-white py-3.5 font-semibold active:scale-[0.98] disabled:opacity-50 transition-all"
                    style={{
                      borderRadius: "var(--bubble-radius-input)",
                      background: "var(--crimson)",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "var(--crimson-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--crimson)"; }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main login view
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Poppins', sans-serif", background: "linear-gradient(160deg, #f0f4f8 0%, #ffffff 40%, #fdf0ef 100%)" }}>
      {/* Decorative background bubbles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(15,42,74,0.05) 0%, transparent 70%)" }} />
        <div className="absolute top-1/4 -left-20 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(192,57,43,0.035) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-0 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(15,42,74,0.04) 0%, transparent 70%)" }} />
        <div className="absolute bottom-10 left-1/4 w-32 h-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(192,57,43,0.025) 0%, transparent 70%)" }} />
        {/* Subtle watermark logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.02]">
          <Image
            src="/SLS-LOGO.png"
            alt=""
            width={500}
            height={500}
            className="object-contain"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-10">
        {/* Logo & branding */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-24 h-24 overflow-hidden mb-5 flex items-center justify-center p-2 shadow-md"
            style={{ borderRadius: "28px", background: "rgba(255,255,255,0.9)", border: "1.5px solid rgba(15,42,74,0.08)", backdropFilter: "blur(10px)" }}
          >
            <Image
              src="/SLS-LOGO.png"
              alt="Salt Lake Specialty"
              width={88}
              height={88}
              className="object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0f2a4a" }}>
            Census Tracker
          </h1>
          <p className="text-sm mt-1.5 font-light" style={{ color: "#94a3b8" }}>
            Salt Lake Specialty Hospital
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-[400px]">
          <div
            className="p-8 shadow-lg border border-gray-100/60"
            style={{ borderRadius: "var(--bubble-radius)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)" }}
          >
            {error && (
              <div
                className="text-sm p-3.5 mb-5 flex items-start gap-2.5"
                style={{ borderRadius: "var(--bubble-radius-input)", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
              >
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: "#0f2a4a" }}>
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5" style={{ color: "#cbd5e1" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none transition-all"
                    style={{
                      borderRadius: "var(--bubble-radius-input)",
                      background: "#f8fafc",
                      border: "1.5px solid #e2e8f0",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(15,42,74,0.3)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(15,42,74,0.08)";
                      e.target.style.background = "#ffffff";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.boxShadow = "none";
                      e.target.style.background = "#f8fafc";
                    }}
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2" style={{ color: "#0f2a4a" }}>
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5" style={{ color: "#cbd5e1" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-12 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none transition-all"
                    style={{
                      borderRadius: "var(--bubble-radius-input)",
                      background: "#f8fafc",
                      border: "1.5px solid #e2e8f0",
                      fontFamily: "'Poppins', sans-serif",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(15,42,74,0.3)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(15,42,74,0.08)";
                      e.target.style.background = "#ffffff";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.boxShadow = "none";
                      e.target.style.background = "#f8fafc";
                    }}
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors"
                    style={{ color: "#cbd5e1" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#cbd5e1")}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="flex justify-end mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(true);
                    setError("");
                  }}
                  className="text-sm font-medium transition-colors"
                  style={{ color: "rgba(15,42,74,0.45)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#0f2a4a")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(15,42,74,0.45)")}
                >
                  Forgot password?
                </button>
              </div>

              {/* Log In button — Crimson Red */}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3.5 font-semibold active:scale-[0.98] disabled:opacity-50 transition-all shadow-md"
                style={{
                  borderRadius: "var(--bubble-radius-input)",
                  background: "var(--crimson)",
                  fontFamily: "'Poppins', sans-serif",
                  boxShadow: "0 4px 14px rgba(192,57,43,0.25)",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = "var(--crimson-hover)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(192,57,43,0.35)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--crimson)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(192,57,43,0.25)";
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Log In"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#cbd5e1" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
            </div>

            {/* Google sign-in */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 font-medium active:scale-[0.98] disabled:opacity-50 transition-all"
              style={{
                borderRadius: "var(--bubble-radius-input)",
                background: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                color: "#475569",
                fontFamily: "'Poppins', sans-serif",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
            >
              {googleLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span style={{ color: "#94a3b8" }}>Connecting...</span>
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            {/* Biometric sign-in */}
            {biometricAvailable && (
              <button
                onClick={handleBiometricSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 font-medium active:scale-[0.98] disabled:opacity-50 transition-all mt-3"
                style={{
                  borderRadius: "var(--bubble-radius-input)",
                  background: "#f8fafc",
                  border: "1.5px solid #e2e8f0",
                  color: "#475569",
                  fontFamily: "'Poppins', sans-serif",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
              >
                <svg className="w-5 h-5" style={{ color: "#0f2a4a" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.26 8.303M12 10.5a3 3 0 11-6 0 3 3 0 016 0zm-1.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
                Sign in with Biometrics / PIN
              </button>
            )}
          </div>

          {/* Register link */}
          <p className="text-center text-sm mt-7" style={{ color: "#94a3b8" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold transition-colors"
              style={{ color: "#0f2a4a" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--crimson)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#0f2a4a")}
            >
              Register
            </Link>
          </p>

          <p className="text-center text-xs mt-3" style={{ color: "#cbd5e1" }}>
            Add to home screen for the best experience
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative text-center pb-6 pt-4 px-6">
        <div className="h-px mx-auto max-w-[200px] mb-4" style={{ background: "linear-gradient(to right, transparent, #e2e8f0, transparent)" }} />
        <p className="text-xs font-medium" style={{ color: "#94a3b8" }}>
          slspecialty.org
        </p>
        <p className="text-xs mt-1" style={{ color: "#cbd5e1" }}>
          4252 Birkhill Blvd, Murray, UT 84107
        </p>
      </footer>
    </div>
  );
}
