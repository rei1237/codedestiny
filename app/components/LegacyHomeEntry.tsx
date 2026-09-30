"use client";
import { useEffect } from "react";
import { legacyHomeTarget } from "@/lib/navigation/legacy-home-target.mjs";
export default function LegacyHomeEntry({ defaultTarget = "" }: { defaultTarget?: string }) {
  useEffect(() => {
    const legacyTarget = legacyHomeTarget(window.location.search, window.location.hash);
    const questionGuide = !legacyTarget && Boolean(new URLSearchParams(window.location.search).get("question"));
    let target = questionGuide ? `/yeongnyangi/${window.location.search}${window.location.hash}` : legacyTarget || "";
    if (!target && defaultTarget) {
      const url = new URL(defaultTarget, window.location.origin);
      if (!url.search) url.search = window.location.search;
      if (!url.hash) url.hash = window.location.hash;
      target = `${url.pathname}${url.search}${url.hash}`;
    }
    if (target) window.location.replace(target);
  }, [defaultTarget]);
  return null;
}
