import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function normalizeEnv(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^[\s"'`]+|[\s"'`,]+$/g, "");
}

const firebaseConfig: FirebaseOptions = {
  apiKey: normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: normalizeEnv(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: normalizeEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (v) => typeof v === "string" && v.trim().length > 0,
);

const app = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseApp = app;
export const firebaseAuth = app ? getAuth(app) : null;
export const firebaseDb = app ? getFirestore(app) : null;

export const googleMapsApiKey = normalizeEnv(
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
);
export const isGoogleMapsConfigured = googleMapsApiKey.trim().length > 0;
