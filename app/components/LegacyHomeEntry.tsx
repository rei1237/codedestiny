"use client";
import { useEffect } from "react";
import { IS_APP_BUILD } from "@/lib/app-build-target";
import { legacyHomeTarget } from "@/lib/navigation/legacy-home-target.mjs";
import { SHELL_HOME_PATH } from "@/lib/navigation/shellHome";
// `/` is the brand home (2026-10-15). It stays put for plain visits and campaign links.
// Legacy app returns, question guides, app anchors this page lacks (`/#readings`) and
// installs whose start_url was still `/` move on to the app home. The mobile app bundle
// has no brand home: any `/` inside it is the app home.
export default function LegacyHomeEntry() {
  useEffect(() => {
    const { search, hash } = window.location;
    const pageAnchor = hash.length > 1 && document.getElementById(hash.slice(1)) !== null;
    const appHash = pageAnchor ? "" : hash;
    const legacyTarget = legacyHomeTarget(search, appHash);
    const questionGuide = !legacyTarget && Boolean(new URLSearchParams(search).get("question"));
    const installedApp = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
    const appTarget = appHash || installedApp || IS_APP_BUILD ? `${SHELL_HOME_PATH}${search}${appHash}` : "";
    const target = questionGuide ? `/yeongnyangi/${search}${hash}` : legacyTarget || appTarget;
    if (target) window.location.replace(target);
  }, []);
  return null;
}
