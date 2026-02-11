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

  if (resetMode) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#e8f4f8] via-[#f0f7fa] to-white">
        <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {/* Back button */}
            <button
              onClick={() => {
                setResetMode(false);
                setResetSent(false);
                setError("");
              }}
              className="flex items-center gap-2 text-[#1e3a5f]/60 hover:text-[#1e3a5f] transition mb-8 -ml-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span className="text-sm font-medium">Back to Sign In</span>
            </button>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/10 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-[#1e3a5f] mb-1">Reset Password</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {resetSent ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-emerald-700 font-semibold text-sm">Email Sent!</p>
                      <p className="text-emerald-600/70 text-sm mt-1 leading-relaxed">
                        Check your inbox for a password reset link.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-5 flex items-start gap-2.5">
                      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/30 focus:bg-white transition-all"
                      placeholder="your@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1e3a5f] text-white py-3 rounded-xl font-semibold hover:bg-[#2c5282] active:scale-[0.98] disabled:opacity-50 transition-all"
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#e8f4f8] via-[#f0f7fa] to-white">
      {/* Main content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-10">
        {/* Logo & branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-2xl overflow-hidden mb-5 bg-white shadow-sm border border-gray-100 flex items-center justify-center p-2">
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
          <h1 className="text-2xl font-bold text-[#1e3a5f] tracking-tight">
            Census Tracker
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Salt Lake Specialty Hospital
          </p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-5 flex items-start gap-2.5">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/30 focus:bg-white transition-all"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/30 focus:bg-white transition-all"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-300 hover:text-gray-500 transition-colors"
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
              <div className="flex justify-end mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(true);
                    setError("");
                  }}
                  className="text-[#1e3a5f]/50 text-sm font-medium hover:text-[#1e3a5f] transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1e3a5f] text-white py-3 rounded-xl font-semibold hover:bg-[#2c5282] active:scale-[0.98] disabled:opacity-50 transition-all"
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
                  "Sign In"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-gray-300 text-xs font-medium uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Google sign-in */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-gray-50 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {googleLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-gray-400">Connecting...</span>
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
                className="w-full flex items-center justify-center gap-3 bg-gray-50 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50 transition-all mt-3"
              >
                <svg className="w-5 h-5 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.26 8.303M12 10.5a3 3 0 11-6 0 3 3 0 016 0zm-1.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
                Sign in with Biometrics / PIN
              </button>
            )}
          </div>

          {/* Register link */}
          <p className="text-center text-gray-400 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-[#1e3a5f] font-semibold hover:text-[#2c5282] transition-colors"
            >
              Register
            </Link>
          </p>

          <p className="text-center text-gray-300 text-xs mt-3 pb-8">
            Add to home screen for the best experience
          </p>
        </div>
      </div>
    </div>
  );
}
