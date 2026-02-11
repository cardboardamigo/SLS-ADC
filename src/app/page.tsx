"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  // Safety timeout: if auth takes too long, redirect to login
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth state check timed out, redirecting to login");
        router.replace("/login");
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
      <div className="text-center text-white">
        <div className="animate-pulse">
          <h1 className="text-2xl font-bold mb-2">Census Tracker</h1>
          <p className="text-white/70">Salt Lake Specialty Hospital</p>
        </div>
      </div>
    </div>
  );
}
