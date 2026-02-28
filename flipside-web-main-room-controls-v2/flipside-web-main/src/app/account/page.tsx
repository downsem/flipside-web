"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, loginWithGoogle, logoutUser } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  return (
    <AppShell
      title="Profile"
      headerRight={
        <Link href="/feed" className="text-[var(--text-sm)] underline">
          Feed
        </Link>
      }
    >
      {!user && (
        <div className="text-center space-y-4">
          <p className="text-sm text-neutral-700">
            Sign in to create flips, vote, and reply.
          </p>
          <Button onClick={loginWithGoogle}>Sign in with Google</Button>
        </div>
      )}

      {user && (
        <div className="text-center space-y-4">
          <img
            src={user.photoURL}
            alt="pfp"
            className="w-20 h-20 rounded-full mx-auto shadow"
          />
          <p className="text-lg font-medium">{user.displayName}</p>
          <p className="text-sm text-slate-500">{user.email}</p>

          <Button variant="secondary" onClick={logoutUser}>
            Sign out
          </Button>
        </div>
      )}
    </AppShell>
  );
}
