"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyAuthError } from "@/contexts/AuthContext";

type ViewState =
  | "welcome"
  | "login-choice"
  | "login-email"
  | "register-choice"
  | "register-email"
  | "reset-password";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function LoginPage() {
  const [view, setView] = useState<ViewState>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstall, setShowIOSInstall] = useState(false);
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const showInstallOption = !isStandalone && (deferredPrompt !== null || isIOS);

  function navigateTo(next: ViewState) {
    setError("");
    setResetSent(false);
    setView(next);
  }

  function handleBack() {
    setError("");
    setResetSent(false);
    if (view === "login-choice" || view === "register-choice") {
      setView("welcome");
    } else if (view === "login-email") {
      setView("login-choice");
    } else if (view === "register-email") {
      setView("register-choice");
    } else if (view === "reset-password") {
      setView("login-email");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, name);
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

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleInstall() {
    if (deferredPrompt) {
      // Chromium browsers: trigger native install dialog with one touch
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      // iOS and other browsers: show manual instructions
      setShowIOSInstall(!showIOSInstall);
    }
  }

  /* ── Shared Styles ── */
  const glassCard = {
    borderRadius: "var(--bubble-radius)",
    background: "rgba(255,255,255,0.07)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.12)",
  };

  const inputBase: React.CSSProperties = {
    borderRadius: "var(--bubble-radius-input)",
    background: "rgba(255,255,255,0.08)",
    border: "1.5px solid rgba(255,255,255,0.15)",
    fontFamily: "'Poppins', sans-serif",
    color: "#ffffff",
  };

  function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "rgba(255,255,255,0.35)";
    e.target.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.08)";
    e.target.style.background = "rgba(255,255,255,0.12)";
  }

  function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "rgba(255,255,255,0.15)";
    e.target.style.boxShadow = "none";
    e.target.style.background = "rgba(255,255,255,0.08)";
  }

  const spinner = (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  const googleIcon = (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );

  const backButton = (
    <button
      onClick={handleBack}
      className="flex items-center gap-2 transition mb-5"
      style={{ color: "rgba(255,255,255,0.5)" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
      <span className="text-sm font-medium">Back</span>
    </button>
  );

  const errorBanner = error ? (
    <div
      className="text-sm p-3.5 mb-5 flex items-start gap-2.5"
      style={{
        borderRadius: "var(--bubble-radius-input)",
        background: "rgba(220,38,38,0.15)",
        border: "1px solid rgba(220,38,38,0.3)",
        color: "#fca5a5",
      }}
    >
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{error}</span>
    </div>
  ) : null;

  const googleButton = (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={googleLoading}
      className="flex h-12 w-full items-center justify-center gap-3 text-sm font-semibold active:scale-[0.98] disabled:opacity-50 transition-all"
      style={{
        borderRadius: "var(--bubble-radius-input)",
        background: "rgba(255,255,255,0.95)",
        color: "#1f2937",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {googleLoading ? (
        <span className="flex items-center justify-center gap-2 text-gray-400">
          {spinner}
          Connecting...
        </span>
      ) : (
        <>
          {googleIcon}
          Continue with Google
        </>
      )}
    </button>
  );

  const divider = (
    <div className="flex items-center gap-3 my-5">
      <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.1)" }} />
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>
        or
      </span>
      <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.1)" }} />
    </div>
  );

  return (
    <main
      className="min-h-[100svh] flex flex-col items-center justify-center px-5 py-10"
      style={{
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(165deg, #0a1f38 0%, #0f2a4a 40%, #162d4a 70%, #1a3352 100%)",
      }}
    >
      {/* Decorative glow orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            top: "-10%",
            right: "-15%",
            background: "radial-gradient(circle, rgba(192,57,43,0.08) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            bottom: "-5%",
            left: "-10%",
            background: "radial-gradient(circle, rgba(30,58,95,0.25) 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-[380px] flex flex-col items-center">

        {/* ── Welcome View ── */}
        {view === "welcome" && (
          <>
            <div className="flex flex-col items-center mb-10">
              <Image
                src="/CT_LOGO_.png"
                alt="Census Tracker"
                width={120}
                height={120}
                className="object-contain"
                priority
              />
            </div>

            <div className="w-full flex flex-col items-center gap-5">
              <button
                onClick={() => navigateTo("login-choice")}
                className="h-12 w-1/2 text-white text-sm font-semibold active:scale-[0.98] transition-all"
                style={{
                  borderRadius: "var(--bubble-radius-input)",
                  background: "var(--crimson)",
                  fontFamily: "'Poppins', sans-serif",
                  boxShadow: "0 4px 20px rgba(192,57,43,0.35)",
                }}
              >
                Log In
              </button>
              <button
                onClick={() => navigateTo("register-choice")}
                className="h-12 w-1/2 text-sm font-semibold active:scale-[0.98] transition-all"
                style={{
                  borderRadius: "var(--bubble-radius-input)",
                  background: "rgba(255,255,255,0.08)",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.85)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Create Account
              </button>
            </div>

            {/* Install App Button — one-touch install */}
            {!isStandalone && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-2 mt-8 px-5 py-2.5 active:scale-[0.98] transition-all"
                style={{
                  borderRadius: "var(--bubble-radius-input)",
                  background: "rgba(255,255,255,0.08)",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span className="text-xs font-semibold">Install App</span>
              </button>
            )}

            {showIOSInstall && (
              <div
                className="mt-4 p-4 text-xs leading-relaxed w-full"
                style={{
                  ...glassCard,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <p className="font-semibold mb-2" style={{ color: "rgba(255,255,255,0.8)" }}>
                  To install on your device:
                </p>
                {isIOS ? (
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Tap the <strong>Share</strong> button <span style={{ fontSize: "16px" }}>&#x2B06;&#xFE0F;</span> at the bottom of Safari</li>
                    <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
                    <li>Tap <strong>&quot;Add&quot;</strong> in the top right</li>
                  </ol>
                ) : (
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Tap the <strong>menu</strong> (three dots) in your browser</li>
                    <li>Select <strong>&quot;Add to Home Screen&quot;</strong> or <strong>&quot;Install App&quot;</strong></li>
                    <li>Tap <strong>&quot;Install&quot;</strong> to confirm</li>
                  </ol>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Login Choice View ── */}
        {view === "login-choice" && (
          <div className="w-full">
            {backButton}
            <div className="flex flex-col items-center mb-6">
              <Image
                src="/CT_LOGO_.png"
                alt="Census Tracker"
                width={60}
                height={60}
                className="object-contain mb-3"
              />
              <h2 className="text-xl font-bold" style={{ color: "#ffffff" }}>
                Sign In
              </h2>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                Choose how you&apos;d like to sign in
              </p>
            </div>

            <div className="p-7" style={glassCard}>
              {errorBanner}
              {googleButton}
              {divider}
              <button
                type="button"
                onClick={() => navigateTo("login-email")}
                className="flex h-12 w-full items-center justify-center gap-3 text-sm font-semibold active:scale-[0.98] transition-all"
                style={{
                  borderRadius: "var(--bubble-radius-input)",
                  background: "rgba(255,255,255,0.08)",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.8)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <svg className="w-5 h-5" style={{ color: "rgba(255,255,255,0.5)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Continue with Email
              </button>
            </div>
          </div>
        )}

        {/* ── Login Email View ── */}
        {view === "login-email" && (
          <div className="w-full">
            {backButton}
            <div className="flex flex-col items-center mb-6">
              <h2 className="text-xl font-bold" style={{ color: "#ffffff" }}>
                Sign In with Email
              </h2>
            </div>

            <div className="p-7" style={glassCard}>
              {errorBanner}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5" style={{ color: "rgba(255,255,255,0.3)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    </div>
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 w-full pl-12 pr-4 text-sm placeholder-white/30 focus:outline-none transition-all"
                      style={inputBase}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="login-password" className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => navigateTo("reset-password")}
                      className="text-xs font-semibold transition-colors"
                      style={{ color: "var(--crimson-light)" }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5" style={{ color: "rgba(255,255,255,0.3)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    </div>
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 w-full pl-12 pr-12 text-sm placeholder-white/30 focus:outline-none transition-all"
                      style={inputBase}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
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

                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-50 transition-all mt-2"
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

        {/* ── Register Choice View ── */}
        {view === "register-choice" && (
          <div className="w-full">
            {backButton}
            <div className="flex flex-col items-center mb-6">
              <Image
                src="/CT_LOGO_.png"
                alt="Census Tracker"
                width={60}
                height={60}
                className="object-contain mb-3"
              />
              <h2 className="text-xl font-bold" style={{ color: "#ffffff" }}>
                Create Account
              </h2>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                Choose how you&apos;d like to register
              </p>
            </div>

            <div className="p-7" style={glassCard}>
              {errorBanner}
              {googleButton}
              {divider}
              <button
                type="button"
                onClick={() => navigateTo("register-email")}
                className="flex h-12 w-full items-center justify-center gap-3 text-sm font-semibold active:scale-[0.98] transition-all"
                style={{
                  borderRadius: "var(--bubble-radius-input)",
                  background: "rgba(255,255,255,0.08)",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.8)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                <svg className="w-5 h-5" style={{ color: "rgba(255,255,255,0.5)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Continue with Email
              </button>
            </div>
          </div>
        )}

        {/* ── Register Email View ── */}
        {view === "register-email" && (
          <div className="w-full">
            {backButton}
            <div className="flex flex-col items-center mb-6">
              <h2 className="text-xl font-bold" style={{ color: "#ffffff" }}>
                Create Account
              </h2>
            </div>

            <div className="p-7" style={glassCard}>
              {errorBanner}
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full h-12 px-5 text-sm placeholder-white/30 focus:outline-none transition-all"
                    style={inputBase}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-12 px-5 text-sm placeholder-white/30 focus:outline-none transition-all"
                    style={inputBase}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-12 px-5 text-sm placeholder-white/30 focus:outline-none transition-all"
                    style={inputBase}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full h-12 px-5 text-sm placeholder-white/30 focus:outline-none transition-all"
                    style={inputBase}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Confirm password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-white text-sm font-semibold active:scale-[0.98] disabled:opacity-50 transition-all mt-2"
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
                      Creating account...
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Reset Password View ── */}
        {view === "reset-password" && (
          <div className="w-full">
            {backButton}
            <div className="p-7" style={glassCard}>
              <div
                className="w-12 h-12 flex items-center justify-center mb-5"
                style={{ borderRadius: "16px", background: "rgba(255,255,255,0.1)" }}
              >
                <svg className="w-6 h-6" style={{ color: "rgba(255,255,255,0.8)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>

              <h2 className="text-xl font-bold mb-1" style={{ color: "#ffffff" }}>
                Reset Password
              </h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {resetSent ? (
                <div
                  className="p-4"
                  style={{
                    borderRadius: "var(--bubble-radius-input)",
                    background: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.3)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#34d399" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "#34d399" }}>Email Sent!</p>
                      <p className="text-sm mt-1 leading-relaxed" style={{ color: "rgba(52,211,153,0.7)" }}>
                        Check your inbox for a password reset link.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetPassword}>
                  {errorBanner}

                  <div className="mb-5">
                    <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-5 py-3.5 text-sm placeholder-white/30 focus:outline-none transition-all"
                      style={inputBase}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
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
                      boxShadow: "0 4px 20px rgba(192,57,43,0.35)",
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        {spinner}
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
        )}
      </div>
    </main>
  );
}
