"use client";
import { useEffect } from "react";
import { legacyHomeTarget } from "@/lib/navigation/legacy-home-target.mjs";
import { SHELL_HOME_PATH } from "@/lib/navigation/shellHome";
// `/` is the brand home (2026-10-15). It stays put for plain visits and campaign links.
// Installed apps also start on the two-service home. Only legacy returns, question
// guides and app anchors this page lacks (`/#readings`) leave this page.
export default function LegacyHomeEntry() {
  useEffect(() => {
    const { search, hash } = window.location;
    const pageAnchor = hash.length > 1 && document.getElementById(hash.slice(1)) !== null;
    const appHash = pageAnchor ? "" : hash;
    const legacyTarget = legacyHomeTarget(search, appHash);
    const questionGuide = !legacyTarget && Boolean(new URLSearchParams(search).get("question"));
    const appTarget = appHash ? `${SHELL_HOME_PATH}${search}${appHash}` : "";
    const target = questionGuide ? `/yeongnyangi/${search}${hash}` : legacyTarget || appTarget;
    if (target) window.location.replace(target);
  }, []);
  return null;
}
