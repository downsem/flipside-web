/**
 * Seed demo users + posts into Firestore (Flipside)
 *
 * Usage:
 *  1) Create a Firebase service account key JSON and download it.
 *  2) export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/key.json"
 *  3) node scripts/seed-demo.mjs
 *
 * Notes:
 *  - This creates user docs in /users/{uid}
 *  - Creates post docs in /posts/{postId}
 *  - (Optional) triggers your /api/flip endpoint to generate rewrites
 */

import admin from "firebase-admin";

// ---- CONFIG ----
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// If your /api/flip needs auth later, we can adjust. For now it’s open in your rules.
const TRIGGER_REWRITES = true;
const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://flipside-web.vercel.app";

// How many demo posts
const NUM_POSTS = 100;

// Mix controls
const EXTREME_RATIO = 0.7; // 70% extreme, 30% moderate
const LEFT_RATIO = 0.5;    // 50/50 left/right

// Fake users
const NUM_USERS = 20;

// ---- INIT ----
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: PROJECT_ID,
  });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ---- HELPERS ----
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeUid(i) {
  // stable-ish fake uid-like ids
  return `demo_${String(i).padStart(3, "0")}_${Math.random().toString(16).slice(2, 10)}`;
}

// Avoid hateful/violent content; keep it “hot takes” but safe.
const TOPICS = [
  "housing costs", "immigration", "healthcare", "climate policy",
  "student loans", "policing", "gun policy", "tax policy",
  "AI & jobs", "free speech online", "education", "election trust",
  "foreign aid", "trade & tariffs", "union power", "tech regulation",
];

const LEFT_FRAMES_EXTREME = [
  "This is corporate capture. Stop pretending the system works when it’s bought.",
  "If we can fund billion-dollar bailouts, we can fund basics like housing and healthcare.",
  "The cost-of-living crisis isn’t accidental. It’s policy choices.",
  "Regulation isn’t the problem — monopolies are.",
  "We’re treating people like line items instead of humans.",
];

const LEFT_FRAMES_MODERATE = [
  "We can balance growth with fairness, but we need smarter guardrails.",
  "Let’s focus on practical reforms that reduce costs and improve outcomes.",
  "We should invest in evidence-based programs and measure results.",
  "We need accountability and transparency, not just slogans.",
  "There’s room for compromise if we start with shared goals.",
];

const RIGHT_FRAMES_EXTREME = [
  "This is government overreach, plain and simple. Stop expanding bureaucracy.",
  "The system rewards rule-breakers and punishes people who play by the rules.",
  "We’re losing trust because leaders refuse to enforce basic standards.",
  "Stop exporting jobs and importing chaos. Put the country first.",
  "This is cultural and institutional rot — and people are done with it.",
];

const RIGHT_FRAMES_MODERATE = [
  "We can fix this with consistent enforcement and clear rules.",
  "Let’s reduce waste, protect safety, and keep policies workable.",
  "We need reforms that strengthen trust without overcorrecting.",
  "There’s a responsible middle path here if we prioritize stability.",
  "We can preserve freedoms while still improving outcomes.",
];

function buildPostText({ side, intensity }) {
  const topic = pick(TOPICS);
  const frame =
    side === "left"
      ? intensity === "extreme"
        ? pick(LEFT_FRAMES_EXTREME)
        : pick(LEFT_FRAMES_MODERATE)
      : intensity === "extreme"
        ? pick(RIGHT_FRAMES_EXTREME)
        : pick(RIGHT_FRAMES_MODERATE);

  // Keep them “social-post length”
  const hook = pick([
    "Hot take:",
    "I’m tired of this:",
    "Can we be honest?",
    "Nobody wants to say it, but:",
    "Here’s the thing:",
  ]);

  const action = pick([
    "What would you change first?",
    "Convince me I’m wrong.",
    "If you disagree, say why.",
    "We need a serious plan, not vibes.",
    "This shouldn’t be controversial.",
  ]);

  return `${hook} On ${topic} — ${frame} ${action}`;
}

// ---- MAIN ----
async function main() {
  console.log("Seeding demo users + posts...");

  // 1) Create fake users
  const firstNames = ["Avery","Jordan","Taylor","Riley","Casey","Morgan","Quinn","Cameron","Reese","Drew","Parker","Rowan","Hayden","Skyler","Emerson","Blake","Finley","Kai","Micah","Sage"];
  const lastNames = ["Stone","Brooks","Carter","Nguyen","Patel","Reed","Johnson","Martinez","Kim","Wright","Bennett","Diaz","Santos","Price","Foster","Cole","Rivera","Hughes","Gray","Ward"];

  const users = Array.from({ length: NUM_USERS }).map((_, i) => {
    const uid = makeUid(i + 1);
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@demo.flipside`;
    // simple deterministic avatar
    const photoURL = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
    return { uid, displayName: name, email, photoURL };
  });

  const userWrites = users.map((u) =>
    db.doc(`users/${u.uid}`).set(
      {
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        photoURL: u.photoURL,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isDemo: true,
      },
      { merge: true }
    )
  );

  await Promise.all(userWrites);
  console.log(`✅ Wrote ${users.length} demo users`);

  // 2) Create demo posts
  const posts = [];
  for (let i = 0; i < NUM_POSTS; i++) {
    const side = Math.random() < LEFT_RATIO ? "left" : "right";
    const intensity = Math.random() < EXTREME_RATIO ? "extreme" : "moderate";
    const author = pick(users);

    posts.push({
      side,
      intensity,
      authorId: author.uid,
      text: buildPostText({ side, intensity }),
    });
  }

  // shuffle to mix feed
  const mixed = shuffle(posts);

  // write posts
  const postRefs = [];
  for (const p of mixed) {
    const ref = db.collection("posts").doc();
    postRefs.push(ref);

    await ref.set({
      id: ref.id,
      authorId: p.authorId,
      text: p.text,
      createdAt: FieldValue.serverTimestamp(),
      votes: 0,
      replyCount: 0,
      sourceType: "original",
      sourcePlatform: null,
      sourceUrl: null,
      // optional metadata for debugging
      demoMeta: { side: p.side, intensity: p.intensity },
      isDemo: true,
    });
  }

  console.log(`✅ Wrote ${postRefs.length} demo posts`);

  // 3) Optionally trigger rewrite generation
  if (TRIGGER_REWRITES) {
    console.log("Triggering rewrite generation via /api/flip ...");
    for (const ref of postRefs) {
      // fetch post text to send
      const snap = await ref.get();
      const data = snap.data();
      if (!data?.text) continue;

      try {
        const res = await fetch(`${SITE_ORIGIN}/api/flip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: ref.id, text: data.text }),
        });

        if (!res.ok) {
          const t = await res.text();
          console.warn(`⚠️ /api/flip failed for ${ref.id}: ${res.status} ${t}`);
        }
      } catch (e) {
        console.warn(`⚠️ /api/flip error for ${ref.id}:`, e?.message || e);
      }
    }
    console.log("✅ Done triggering rewrites");
  }

  console.log("All done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
