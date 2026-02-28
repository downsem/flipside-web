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
  const pathname = usePathname();

  const hide = pathname.startsWith("/share/") || pathname.startsWith("/post/");
  if (hide) return null;

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid h-14 max-w-2xl grid-cols-4 gap-2 px-3">
        {TABS.map((t) => {
          const active =
            pathname === t.href || (t.href !== "/" && pathname.startsWith(t.href));

          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex items-center justify-center",
                "min-h-[44px] rounded-[var(--radius-pill)]",
                "text-[var(--text-sm)] font-medium",
                // Requested: active = black, inactive = white
                active ? "bg-neutral-900 text-white" : "bg-white text-neutral-700",
                // Slightly emphasize center tab without changing the rule
                t.isCenter && "font-semibold"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
