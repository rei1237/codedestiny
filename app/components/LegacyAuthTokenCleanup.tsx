"use client";

import { useEffect } from "react";
import { isMobileAppRuntime } from "@/app/_lib/auth-client";

const LEGACY_AUTH_TOKEN_KEYS = ["fortune_auth_token", "cdToken"];

export default function LegacyAuthTokenCleanup() {
  useEffect(() => {
    // fortune_auth_token doubles as the mobile-app runtime's live Bearer token
    // (see auth-client.ts persistMobileAppAccessToken) — clearing it there would
    // silently drop a freshly-issued session right after native OAuth completes.
    if (isMobileAppRuntime()) return;

    try {
      LEGACY_AUTH_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch (e) {}

    try {
      LEGACY_AUTH_TOKEN_KEYS.forEach((key) => sessionStorage.removeItem(key));
    } catch (e) {}
  }, []);

  return null;
}
