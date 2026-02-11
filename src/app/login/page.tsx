"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyAuthError } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1e3a5f] via-[#1e3a5f] to-[#153050]">
      {/* Top section with branding */}
      <div className="flex-1 flex flex-col items-center justify-end pb-8 px-6">
        <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg mb-5 bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <Image
            src="/SLS-LOGO.png"
            alt="Salt Lake Specialty"
            width={96}
            height={96}
            className="rounded-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Census Tracker
        </h1>
        <p className="text-white/50 text-sm mt-1.5">
          Salt Lake Specialty Hospital
        </p>
      </div>

      {/* Bottom section with form */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 pt-6">
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-2xl shadow-black/20">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl mb-4 flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38b2ac] focus:border-transparent focus:bg-white transition"
                placeholder="your@email.com"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38b2ac] focus:border-transparent focus:bg-white transition"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#38b2ac] text-white py-3.5 rounded-xl font-semibold hover:bg-[#319795] active:scale-[0.98] disabled:opacity-50 transition-all shadow-md shadow-[#38b2ac]/25"
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

            <p className="text-center text-sm text-gray-500 mt-4">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-[#38b2ac] font-semibold hover:underline"
              >
                Register
              </Link>
            </p>
          </form>

          <p className="text-center text-white/30 text-xs mt-6 pb-8">
            Add to home screen for the best experience
          </p>
        </div>
      </div>
    </div>
  );
}
