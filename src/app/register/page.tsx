"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyAuthError } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
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

  const inputStyle = {
    borderRadius: "var(--bubble-radius-input)",
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    fontFamily: "'Poppins', sans-serif",
  };

  function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "rgba(15,42,74,0.3)";
    e.target.style.boxShadow = "0 0 0 3px rgba(15,42,74,0.08)";
    e.target.style.background = "#ffffff";
  }

  function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "#e2e8f0";
    e.target.style.boxShadow = "none";
    e.target.style.background = "#f8fafc";
  }

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

      {/* Top section with branding */}
      <div className="relative flex-shrink-0 flex flex-col items-center justify-end pt-12 pb-5 px-6">
        <div
          className="w-20 h-20 overflow-hidden mb-4 flex items-center justify-center p-1.5 shadow-md"
          style={{ borderRadius: "24px", background: "rgba(255,255,255,0.9)", border: "1.5px solid rgba(15,42,74,0.08)", backdropFilter: "blur(10px)" }}
        >
          <Image
            src="/SLS-LOGO.png"
            alt="Salt Lake Specialty"
            width={72}
            height={72}
            className="object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0f2a4a" }}>
          Create Account
        </h1>
        <p className="text-sm mt-1.5 font-light" style={{ color: "#94a3b8" }}>Census Tracker</p>
      </div>

      {/* Bottom section with form */}
      <div className="relative flex-1 flex flex-col items-center justify-start px-6 pt-2">
        <div className="w-full max-w-[400px]">
          <form
            onSubmit={handleSubmit}
            className="p-7 shadow-lg border border-gray-100/60"
            style={{ borderRadius: "var(--bubble-radius)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)" }}
          >
            {error && (
              <div
                className="text-sm p-3.5 mb-4 flex items-start gap-2.5"
                style={{ borderRadius: "var(--bubble-radius-input)", background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
              >
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="mb-3.5">
              <label className="block text-sm font-medium mb-2" style={{ color: "#0f2a4a" }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-5 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none transition-all"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Your full name"
              />
            </div>

            <div className="mb-3.5">
              <label className="block text-sm font-medium mb-2" style={{ color: "#0f2a4a" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none transition-all"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="your@email.com"
              />
            </div>

            <div className="mb-3.5">
              <label className="block text-sm font-medium mb-2" style={{ color: "#0f2a4a" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none transition-all"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="At least 6 characters"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: "#0f2a4a" }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-5 py-3.5 text-gray-900 placeholder-gray-300 focus:outline-none transition-all"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Confirm password"
              />
            </div>

            {/* Create Account button — Crimson Red */}
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
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>

            <p className="text-center text-sm mt-5" style={{ color: "#94a3b8" }}>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold transition-colors"
                style={{ color: "#0f2a4a" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--crimson)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#0f2a4a")}
              >
                Sign In
              </Link>
            </p>
          </form>

          <div className="h-4" />
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
