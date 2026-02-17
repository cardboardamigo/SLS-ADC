import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side route protection proxy (formerly middleware).
 *
 * Firebase Auth v9+ stores sessions in IndexedDB — it does NOT set cookies.
 * To bridge this gap, the AuthContext sets a lightweight "__session" cookie
 * when the user signs in and clears it on sign-out.  The proxy checks
 * for that cookie so unauthenticated users are redirected before any page
 * JS loads.
 *
 * This is a first-layer guard.  Client-side useAuth() still runs as a
 * second check once the app hydrates.
 */

const SESSION_COOKIE = "__session";

const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE);

  if (!session?.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - _next/static, _next/image, _next/data (Next.js internals)
     * - api routes (handled separately)
     * - favicon.ico, sw.js, manifest.json
     * - public image files
     */
    "/((?!_next|api|favicon\\.ico|sw\\.js|manifest\\.json|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)",
  ],
};
