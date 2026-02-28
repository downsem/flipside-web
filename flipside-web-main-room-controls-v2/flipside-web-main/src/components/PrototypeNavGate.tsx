"use client";

import { usePathname } from "next/navigation";
import TutorialNav from "@/components/TutorialNav";

export default function PrototypeNavGate() {
  const pathname = usePathname();

  // Only show the People / Prototype nav inside People Mode
  if (!pathname?.startsWith("/prototype")) {
    return null;
  }

  return <TutorialNav />;
}
