import admin from "firebase-admin";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_JSON env var. Add it in Vercel + .env.local."
    );
  }

  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Download a fresh Firebase Admin SDK service account JSON file and store it as a single-line JSON string in your environment variables.",
      { cause: error }
    );
  }

  for (const field of ["project_id", "private_key", "client_email"]) {
    if (!parsed[field]) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_JSON is missing required field '${field}'.`
      );
    }
  }

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

export function getAdminAuth() {
  const app = getAdminApp();
  return admin.auth(app);
}

export const adminFieldValue = admin.firestore.FieldValue;
