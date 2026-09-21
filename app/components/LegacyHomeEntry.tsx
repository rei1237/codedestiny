"use client";
import { useEffect } from "react";
import { legacyHomeTarget } from "@/lib/navigation/legacy-home-target.mjs";
export default function LegacyHomeEntry() {
  useEffect(() => {
    const target = legacyHomeTarget(window.location.search, window.location.hash);
    if (target) window.location.replace(target);
  }, []);
  return null;
}
