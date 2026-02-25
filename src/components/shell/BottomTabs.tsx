"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/feed", label: "Feed" },
  { href: "/", label: "Create", isCenter: true },
  { href: "/prototype", label: "People" },
  { href: "/account", label: "Profile" },
];

export function BottomTabs() {
  const pathname = usePathname() || "/";

  const hide = pathname.startsWith("/share/") || pathname.startsWith("/post/");
  if (hide) return null;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid h-14 max-w-2xl grid-cols-4 px-2">
        {TABS.map((t) => {
          const active =
            pathname === t.href ||
            (t.href !== "/" && pathname.startsWith(t.href));

          // The center "Create" tab was styled as primary unconditionally,
          // which made it look selected on every page.
          const base =
            "flex items-center justify-center text-[var(--text-sm)] transition";

          // Make active state unmistakable across tabs.
          // - Center tab keeps a "composer" look, but is NOT highlighted when inactive.
          // - Non-center tabs get a soft pill when active.
          const cls = t.isCenter
            ? cn(
                base,
                "mx-2 rounded-[var(--radius-pill)]",
                active
                  ? "bg-neutral-900 text-white font-semibold"
                  : "bg-white text-neutral-700 border border-neutral-200"
              )
            : cn(
                base,
                "mx-1 rounded-[var(--radius-pill)]",
                active
                  ? "bg-neutral-100 text-neutral-900 font-semibold"
                  : "text-neutral-600"
              );
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cls}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
