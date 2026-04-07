"use client";

import { useEffect } from "react";

const APP_VERSION = "2026-03-23-v2-cachefix1";
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

      // 버전 갱신 시 인증 상태는 반드시 보존 — 사용자가 로그아웃되지 않게 함
      const AUTH_KEYS_TO_PRESERVE = ["fortune_auth_token", "fortune_auth_user"];
      const preserved: Array<[string, string]> = [];
      for (const key of AUTH_KEYS_TO_PRESERVE) {
        try {
          const val = window.localStorage.getItem(key);
          if (val) preserved.push([key, val]);
        } catch {}
      }

      try {
        window.localStorage.clear();
      } catch {}

      // 인증 키 즉시 복원
      for (const [key, val] of preserved) {
        try { window.localStorage.setItem(key, val); } catch {}
      }

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
