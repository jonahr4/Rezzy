import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type ConfirmationResult,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Prevent duplicate initialization in dev (hot reload)
// Guard against missing env vars at build time
const hasConfig = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const app = hasConfig
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : (getApps().length ? getApp() : initializeApp({ apiKey: 'build-placeholder', authDomain: '', projectId: '' }));
export const auth = hasConfig ? getAuth(app) : getAuth(app);

// ── Providers ────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

// ── Auth Actions ──────────────────────────────────────
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signInWithApple() {
  const result = await signInWithPopup(auth, appleProvider);
  return result.user;
}

export async function signInWithEmail(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithEmail(email: string, password: string, name?: string) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    const { updateProfile } = await import('firebase/auth');
    await updateProfile(result.user, { displayName: name });
  }
  return result.user;
}

// ── Phone Auth (2-step) ──────────────────────────────
let recaptchaVerifier: RecaptchaVerifier | null = null;

export function setupRecaptcha(buttonId: string) {
  if (recaptchaVerifier) recaptchaVerifier.clear();
  recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: 'invisible',
  });
  return recaptchaVerifier;
}

export async function sendPhoneCode(phone: string, buttonId: string): Promise<ConfirmationResult> {
  const verifier = setupRecaptcha(buttonId);
  return signInWithPhoneNumber(auth, phone, verifier);
}

export async function confirmPhoneCode(
  confirmationResult: ConfirmationResult,
  code: string
) {
  const result = await confirmationResult.confirm(code);
  return result.user;
}

// ── Sign Out ─────────────────────────────────────────
export async function signOut() {
  await firebaseSignOut(auth);
  window.location.href = '/';
}

export function getIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve(await user.getIdToken());
      } else {
        resolve(null);
      }
    });
  });
}

export type { User, ConfirmationResult };
