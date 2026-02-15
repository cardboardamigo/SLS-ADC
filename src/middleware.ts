import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side route protection middleware.
 *
 * Firebase Auth persists its session on the client via IndexedDB, but the
 * Firebase JS SDK also stores a lightweight cookie that the browser sends
 * with every request.  We check for that cookie here so unauthenticated
 * users are redirected before any page JS even loads.
 *
 * Cookie name format used by Firebase Auth persistence (v9+ modular SDK):
 *   firebase:authUser:<apiKey>:<appName>
 */

const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths through without auth check
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Look for any Firebase auth session cookie.
  // The cookie name varies by project, so we match the prefix pattern.
  const hasFirebaseSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("firebase:authUser:"));

  if (!hasFirebaseSession) {
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
