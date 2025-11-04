import { getApps, cert, initializeApp, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;

export function getAdminApp(): App | null {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin credentials not available - returning null');
    return null;
  }

  // Skip Firebase Admin initialization during build
  if (process.env.NODE_ENV === 'production' && !projectId) {
    console.warn('Skipping Firebase Admin initialization during build');
    return null;
  }

  // Normalize private key for both multiline and \n-escaped formats
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }
  // Remove accidental surrounding quotes
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }

  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  return adminApp;
}

export const adminAuth = () => {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
};

export const adminDb = () => {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
};



