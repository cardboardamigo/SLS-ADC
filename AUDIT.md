# Architectural Audit: SLS-ADC (Census Tracker)

**Date:** 2026-02-15
**Stack:** Next.js 16 (App Router) + Firebase Client SDK + Vercel + PWA

---

## 1. Data Flow Map

```
User (Mobile Browser)
  │
  ▼
Vercel CDN (serves Next.js 16 static bundle)
  │
  ▼
layout.tsx ── wraps everything in <AuthProvider> (client-side only)
  │
  ▼
page.tsx (root) ── checks useAuth(), redirects to /login or /dashboard
  │
  ▼
login/page.tsx
  ├─ Step 1: User selects from 2 HARDCODED users
  ├─ Step 2: Enters 4-digit PIN
  ├─ Step 3: CLIENT-SIDE PIN check
  ├─ Step 4: AuthContext.signIn() constructs password = "slspin_" + pin
  ├─ Step 5: Firebase signInWithEmailAndPassword()
  ├─ Step 6: If user-not-found → AUTO-CREATES account
  └─ Step 7: Fetches profile from Firestore users/{uid}
  │
  ▼
Protected Pages (dashboard, admissions, discharges, rta, etc.)
  ├─ Auth guard: useEffect + client-side redirect (NO middleware.ts)
  ├─ Reads: Firestore queries via client SDK (lib/census.ts)
  ├─ Writes: addDoc/updateDoc/deleteDoc via client SDK
  ├─ All wrapped in withTimeout() — 10s default
  └─ Real-time: onSnapshot for activity feed on dashboard
  │
  ▼
Firebase (Firestore + Auth + Storage)
  ├─ Collections: admissions, discharges, rtas, activity, censusConfig, users, bonusSubmissions
  ├─ Rules: "any authenticated user can read/write everything"
  └─ Storage: profilePics/{userId} (properly scoped)
```

### Blind Spots & Failure Points

| # | Location | Issue | Severity |
|---|----------|-------|----------|
| 1 | login/page.tsx:8-11 | PINs hardcoded in client bundle | CRITICAL |
| 2 | AuthContext.tsx:76 | Password formula in source ("slspin_" + pin) | CRITICAL |
| 3 | AuthContext.tsx:91 | Auto-creates accounts if user-not-found | HIGH |
| 4 | AuthContext.tsx:15-18 | User PII hardcoded (names, emails, phones) | HIGH |
| 5 | login/page.tsx:58 | Client-side PIN validation | HIGH |
| 6 | No middleware.ts | No server-side route protection | MODERATE |
| 7 | firebase.ts:12-17 | Silent failure on missing env vars | MODERATE |
| 8 | firestore.rules | No ownership scoping on data collections | MODERATE |
| 9 | census.ts (all writes) | withTimeout may reject locally-cached writes | LOW |
| 10 | sw.js | Service worker caches nothing | LOW |

---

## 2. Environment Variable Check

### Current Setup

`.env.local.example` defines 6 `NEXT_PUBLIC_*` variables for Firebase client config.

### What's correct
- All use `NEXT_PUBLIC_` prefix (required for client-side Firebase SDK)
- `.gitignore` properly excludes env files
- No secrets committed to repository

### What's wrong
1. **Silent failure mode** (firebase.ts): Every config value falls back to `|| ""`. Missing/wrong vars produce cryptic runtime errors.
2. **No build-time validation**: No check that required env vars exist before deploying.
3. **No `vercel.json`**: Env vars managed only via dashboard — no declarative config in repo.
4. **No `firebase.json`**: Rules files exist but cannot be deployed. Live rules may be out of sync.
5. **No server-side secrets**: Security depends entirely on Firestore rules (currently too permissive).

---

## 3. Consistency & Best Practices Review

### Issues Found

| # | Issue | Details |
|---|-------|---------|
| 1 | No firebase.json or .firebaserc | Rules files are orphaned |
| 2 | No API routes (app/api/*) | Entire app is client-side SPA |
| 3 | Dead route: /register | 14 lines that just redirect to /login |
| 4 | Massive code duplication | admissions, discharges, rta share ~85% identical structure |
| 5 | Debug panels in production | 4 form pages ship with debug UIs and [DEBUG] console.logs |
| 6 | census.ts duplicated logic | calculateMonthlyADC and getMonthSummary copy-paste same algorithm |
| 7 | @types/* in dependencies | Should be devDependencies |
| 8 | bonus/page.tsx sequential loading | Loads 6 months in for-loop instead of Promise.all |
| 9 | No testing | Zero test files, no testing framework |
| 10 | Service worker is a no-op | Defines CACHE_NAME but never caches anything |
| 11 | NotificationManager polling | setInterval at 60s; doesn't work when backgrounded |
| 12 | jsx: "react-jsx" in tsconfig | Next.js 16 App Router expects "preserve" |

---

## 4. Redo vs. Repair Verdict

### REPAIR. Do not redo.

The core architecture is valid for a 2-user internal tool. Problems are accretions from rapid prototyping, not fundamental flaws.

### Repair Priority List

| Priority | What | Why | Scope |
|----------|------|-----|-------|
| P0 | Remove hardcoded PINs/credentials from client code | Security | login/page.tsx, AuthContext.tsx |
| P1 | Add middleware.ts for server-side route protection | Client-side redirects are bypassable | New file |
| P1 | Add env var validation in firebase.ts | Silent failures cause "broken" feeling | firebase.ts |
| P2 | Add firebase.json + .firebaserc | Deploy rules from repo | New files |
| P2 | Remove all debug panels and [DEBUG] logging | Production cleanliness | 4 page files |
| P3 | Extract shared CRUD form component | ~900 lines duplicated | New component |
| P3 | Deduplicate census calculation logic | Same algorithm twice | census.ts |
| P3 | Fix bonus page sequential loading | Use Promise.all | bonus/page.tsx |
| P4 | Fix or remove service worker caching | Currently a no-op | sw.js |
| P4 | Delete dead /register route | Does nothing | register/page.tsx |
| P4 | Move @types/* to devDependencies | Housekeeping | package.json |

### Root Cause of "Broken" Feeling

Based on commit history (Fix stuck saves, Fix infinite loading, Fix Firebase errors, Fix tab loading issues):

1. Firebase initializes with empty/wrong env vars on Vercel → silent failure → writes hang → timeout
2. No server-side validation → app loads fine but Firestore operations fail silently
3. Persistent cache masks the problem — writes succeed locally but never sync
