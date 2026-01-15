"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, loginWithGoogle, logoutUser } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center py-16 px-4">
      <Link href="/feed" className="mb-6 text-sm underline">
        ← Back to feed
      </Link>

      <h1 className="text-2xl font-semibold mb-6">Account</h1>

      {!user && (
        <>
          <p className="text-sm mb-4 text-center max-w-xs">
            Sign in to create flips, vote, and reply.
          </p>
          <button
            onClick={loginWithGoogle}
            className="bg-slate-900 text-white px-6 py-2 rounded-2xl text-sm"
          >
            Sign in with Google
          </button>
        </>
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

          <button
            onClick={logoutUser}
            className="mt-6 bg-slate-700 text-white px-6 py-2 rounded-2xl text-sm"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
