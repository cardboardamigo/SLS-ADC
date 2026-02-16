import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  getDocs as firestoreGetDocs,
  getDocsFromCache,
  type Firestore,
  type Query,
  type QuerySnapshot,
  type DocumentData,
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
 * Resilient getDocs: tries the server first, falls back to local cache on
 * failure.  This prevents flaky mobile connections from blocking reads when
 * perfectly good cached data is available.
 */
export async function getDocsResilient<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData>(q: Query<AppModelType, DbModelType>): Promise<QuerySnapshot<AppModelType, DbModelType>> {
  try {
    return await withTimeout(firestoreGetDocs(q));
  } catch {
    // Network / timeout error — try the local persistent cache
    try {
      return await getDocsFromCache(q);
    } catch {
      // Cache miss (first load, cleared data, etc.) — throw a helpful error
      throw new Error("Unable to load data. Please check your connection and try again.");
    }
  }
}

export default app;
