"use client";

import * as React from "react";
import { BottomTabs } from "./BottomTabs";
import { AppHeader } from "./AppHeader";

export function AppShell({
  title,
  headerLeft,
  headerRight,
  children,
}: {
  title: string;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-neutral-50">
      <AppHeader title={title} leftSlot={headerLeft} rightSlot={headerRight} />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-[calc(56px+env(safe-area-inset-bottom)+16px)]">
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
