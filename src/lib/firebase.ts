import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  type Firestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// --- Env var validation ---
const requiredEnvVars = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables:\n` +
      missing.map((v) => `  - ${v}`).join("\n") +
      `\nEnsure these are set in your .env.local file. See .env.local.example for reference.`,
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

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

export function withTimeout<T>(promise: Promise<T>, ms: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export default app;
