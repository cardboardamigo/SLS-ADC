import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  getDocs as firestoreGetDocs,
  getDoc as firestoreGetDoc,
  getDocsFromCache,
  getDocFromCache,
  type Firestore,
  type Query,
  type QuerySnapshot,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Use static access for env vars so Next.js can inline them at build time.
// Dynamic access (process.env[key]) does NOT work on the client side because
// Next.js replaces only static references via DefinePlugin.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missingKeys.length > 0) {
  console.error(
    `Missing Firebase config (${missingKeys.join(", ")}). ` +
      `Set the NEXT_PUBLIC_FIREBASE_* env vars — see .env.local.example.`,
  );
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Enable persistent local cache so writes resolve immediately against the
// local cache instead of hanging when the network connection is slow/stale.
// This is critical for mobile PWA usage where connections drop frequently.
let _db: Firestore;
try {
  _db = initializeFirestore(app, {
    localCache: persistentLocalCache({}),
  });
} catch {
  // Already initialized (e.g. hot module reload) — use existing instance
  _db = getFirestore(app);
}
export const db = _db;

export const storage = getStorage(app);

export function withTimeout<T>(promise: Promise<T>, ms: number = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Resilient getDocs: tries the local persistent cache first for instant
 * display, then syncs from the server in the background so the cache stays
 * fresh for next time.  This eliminates the ~15 s delay users see on slow or
 * flaky mobile connections — the cache resolves in milliseconds because
 * writes are applied locally before they reach the server.
 *
 * On the very first load (cache empty), we fall through to a normal server
 * fetch so the user still sees real data.
 */
export async function getDocsResilient<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData>(q: Query<AppModelType, DbModelType>): Promise<QuerySnapshot<AppModelType, DbModelType>> {
  // 1. Try local cache first — nearly instant when data exists.
  try {
    const cached = await getDocsFromCache(q);
    if (cached.size > 0) {
      // Return cached data immediately for fast display.
      // Fire a background server fetch to keep the cache fresh for next time.
      withTimeout(firestoreGetDocs(q)).catch(() => {});
      return cached;
    }
  } catch {
    // Cache unavailable — fall through to server
  }

  // 2. Cache empty or unavailable (first load, cleared data, etc.) — fetch
  //    from server with timeout.
  try {
    return await withTimeout(firestoreGetDocs(q));
  } catch {
    throw new Error("Unable to load data. Please check your connection and try again.");
  }
}

/**
 * Resilient getDoc: same cache-first strategy as getDocsResilient but for
 * single-document reads.  Returns cached data instantly when available and
 * refreshes the cache in the background.
 */
export async function getDocResilient<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData>(ref: DocumentReference<AppModelType, DbModelType>): Promise<DocumentSnapshot<AppModelType, DbModelType>> {
  // 1. Try local cache first.
  try {
    const cached = await getDocFromCache(ref);
    if (cached.exists()) {
      withTimeout(firestoreGetDoc(ref)).catch(() => {});
      return cached;
    }
  } catch {
    // Cache unavailable — fall through to server
  }

  // 2. Cache empty or unavailable — fetch from server with timeout.
  try {
    return await withTimeout(firestoreGetDoc(ref));
  } catch {
    throw new Error("Unable to load data. Please check your connection and try again.");
  }
}

export default app;
