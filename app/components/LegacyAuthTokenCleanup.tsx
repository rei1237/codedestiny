"use client";

import { useEffect } from "react";

const LEGACY_AUTH_TOKEN_KEYS = ["fortune_auth_token", "cdToken"];

export default function LegacyAuthTokenCleanup() {
  useEffect(() => {
    try {
      LEGACY_AUTH_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch (e) {}

    try {
      LEGACY_AUTH_TOKEN_KEYS.forEach((key) => sessionStorage.removeItem(key));
    } catch (e) {}
  }, []);

  return null;
}
