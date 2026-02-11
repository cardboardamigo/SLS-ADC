"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

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
      const msg = err instanceof Error ? err.message : "Failed to sign in";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1e3a5f] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/SLS-LOGO.png"
            alt="Salt Lake Specialty"
            width={80}
            height={80}
            className="mx-auto mb-4 rounded-xl"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <h1 className="text-2xl font-bold text-white">Census Tracker</h1>
          <p className="text-white/60 text-sm mt-1">Salt Lake Specialty Hospital</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38b2ac] focus:border-transparent transition"
              placeholder="your@email.com"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38b2ac] focus:border-transparent transition"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#38b2ac] text-white py-3 rounded-xl font-semibold hover:bg-[#319795] disabled:opacity-50 transition"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#38b2ac] font-medium">
              Register
            </Link>
          </p>
        </form>

        {/* Install prompt */}
        <div className="mt-6 text-center">
          <p className="text-white/50 text-xs">
            Add to home screen for the best experience
          </p>
        </div>
      </div>
    </div>
  );
}
