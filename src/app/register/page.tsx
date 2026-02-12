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

        {/* ── Logo & Branding ── */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-20 h-20 flex items-center justify-center mb-4 shadow-lg"
            style={{
              borderRadius: "var(--bubble-radius-sm)",
              background: "rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            <Image
              src="/SLS-LOGO.png"
              alt="Salt Lake Specialty"
              width={60}
              height={60}
              className="object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight text-center"
            style={{ color: "#ffffff" }}
          >
            Create Account
          </h1>
          <p
            className="text-sm mt-1 font-light tracking-wide"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Census Tracker
          </p>
        </div>

        {/* ── Glass Card ── */}
        <div className="w-full p-7" style={glassCard}>
          {error && (
            <div
              className="text-sm p-3.5 mb-4 flex items-start gap-2.5"
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
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
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
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "rgba(255,255,255,0.45)" }}>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold transition-colors"
              style={{ color: "var(--crimson-light)" }}
            >
              Sign In
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>
            slspecialty.org
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.15)" }}>
            4252 Birkhill Blvd, Murray, UT 84107
          </p>
        </div>
      </div>
    </main>
  );
}
