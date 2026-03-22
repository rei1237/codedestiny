"use client";

import { useEffect } from "react";

const APP_VERSION = "2026-03-23-v1";
const VERSION_KEY = "app_version";

export default function AppVersionGuard() {
  useEffect(() => {
    let cancelled = false;

    async function runVersionGuard() {
      let savedVersion = "";
      try {
        savedVersion = window.localStorage.getItem(VERSION_KEY) || "";
      } catch {
        savedVersion = "";
      }

      if (savedVersion === APP_VERSION) return;

      try {
        window.localStorage.clear();
      } catch {}

      try {
        window.sessionStorage.clear();
      } catch {}

      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            regs.map((reg) => {
              try {
                return reg.unregister();
              } catch {
                return Promise.resolve(false);
              }
            }),
          );
        }
      } catch {}

      try {
        window.localStorage.setItem(VERSION_KEY, APP_VERSION);
      } catch {}

      if (cancelled) return;

      try {
        (window.location as Location & { reload: (forcedReload?: boolean) => void }).reload(true);
      } catch {
        window.location.reload();
      }
    }

    runVersionGuard();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
