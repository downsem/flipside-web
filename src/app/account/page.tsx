"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, loginWithGoogle, logoutUser } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  async function handleGoogleSignIn() {
    if (authBusy) return;

    setAuthBusy(true);
    setAuthError(null);

    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error("Google sign-in failed:", error);

      const code = String(error?.code || "");
      if (code === "auth/popup-closed-by-user") {
        setAuthError("Sign-in was closed before it finished. Please try again.");
      } else if (code === "auth/cancelled-popup-request") {
        setAuthError("Another sign-in attempt was already open. Please try again.");
      } else if (code === "auth/popup-blocked") {
        setAuthError("Your browser blocked the sign-in window. Allow pop-ups and try again.");
      } else {
        setAuthError("Could not sign in with Google. Please try again.");
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    if (authBusy) return;

    setAuthBusy(true);
    setAuthError(null);

    try {
      await logoutUser();
    } catch (error) {
      console.error("Sign-out failed:", error);
      setAuthError("Could not sign out. Please try again.");
    } finally {
      setAuthBusy(false);
    }
  }

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
          <Button onClick={handleGoogleSignIn} loading={authBusy}>
            Sign in with Google
          </Button>
          {authError && (
            <p role="alert" className="text-sm text-red-600">
              {authError}
            </p>
          )}
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

          <Button variant="secondary" onClick={handleSignOut} loading={authBusy}>
            Sign out
          </Button>
          {authError && (
            <p role="alert" className="text-sm text-red-600">
              {authError}
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}
