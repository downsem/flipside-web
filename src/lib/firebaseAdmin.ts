// src/lib/firebaseAdmin.ts
import admin from "firebase-admin";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_JSON env var. Add it in Vercel + .env.local."
    );
  }

  // Vercel env vars sometimes store JSON with escaped newlines
  const parsed = JSON.parse(raw);

  // Handle private_key newlines if they were escaped
  if (parsed.private_key && typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  return parsed;
}

export function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const serviceAccount = getServiceAccount();

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export function getAdminDb() {
  const app = getAdminApp();
  return admin.firestore(app);
}

export const adminFieldValue = admin.firestore.FieldValue;
