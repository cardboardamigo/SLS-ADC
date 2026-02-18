"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Centralises the auth-redirect pattern used across protected pages.
 * Returns `{ user, profile, loading }` from AuthContext after wiring
 * the `if (!loading && !user) router.replace("/login")` guard.
 */
export function useAuthGuard() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.replace("/login");
    }
  }, [auth.user, auth.loading, router]);

  return auth;
}
