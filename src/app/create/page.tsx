"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import { auth, db, serverTs, ensureUserProfile, loginAnonymously } from "@/app/firebase";
import { collection, doc, setDoc } from "firebase/firestore";

export default function Page() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const examples = [
    "Cities should ban cars downtown",
    "Remote work is making people less productive",
    "The Olympics should remove national teams",
  ];

  async function handleSubmit() {
    if (!text.trim()) return;

    setLoading(true);

    let user = auth.currentUser;
    if (!user) {
      await loginAnonymously();
      user = auth.currentUser;
    }

    if (!user) return;

    await ensureUserProfile(user);

    const postRef = doc(collection(db, "posts"));

    await setDoc(postRef, {
      text,
      authorId: user.uid,
      createdAt: serverTs(),
      votes: 0,
    });

    router.push(`/post/${postRef.id}`);
  }

  function handleExampleClick(example: string) {
    setText(example);
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto px-4 pt-6 space-y-4">
        {/* Headline */}
        <h1 className="text-2xl font-semibold">
          See your idea from 5 different perspectives.
        </h1>

        {/* Subtext */}
        <p className="text-sm text-gray-500">
          Paste a thought or post and instantly see how it changes across five lenses.
        </p>

        {/* Input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a thought, opinion, or post..."
          className="w-full h-32 p-3 border rounded-lg text-sm"
        />

        {/* CTA */}
        <Button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="w-full"
        >
          {loading ? "Flipping..." : "Flip it"}
        </Button>

        {/* Examples */}
        <div className="space-y-2">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => handleExampleClick(ex)}
              className="text-left w-full text-sm text-gray-600 border rounded-lg px-3 py-2 hover:bg-gray-50"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Learn more */}
        <details className="text-sm text-gray-500 pt-2">
          <summary className="cursor-pointer">Learn more</summary>
          <p className="mt-2">
            FlipSide rewrites your idea across five perspectives to help you see
            different sides of an issue.
          </p>
        </details>
      </div>
    </AppShell>
  );
}