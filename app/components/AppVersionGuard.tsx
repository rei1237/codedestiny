"use client";

import { useEffect } from "react";

const APP_VERSION = "dev";
const VERSION_KEY = "app_version";
const VERSION_RUN_KEY = "app_version_guard_ran";
const SW_PURGED_VERSION_KEY = "app_sw_purged_version";
const SW_CACHE_PREFIXES = ["kkul-mansaeryeok-", "fortune-tama-"];

function pickRuntimeVersion(payload: any): string {
  if (!payload || typeof payload !== "object") return APP_VERSION;
  const candidate = [payload.commitShort, payload.commit, payload.builtAt]
    .map((value) => String(value || "").trim())
    .find(Boolean);
  return candidate || APP_VERSION;
}

async function resolveRuntimeVersion(): Promise<string> {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return APP_VERSION;
    const data = await response.json();
    return pickRuntimeVersion(data);
  } catch {
    return APP_VERSION;
  }
}

async function purgeStaleServiceWorkers(version: string): Promise<void> {
  let alreadyPurged = "";
  try {
    alreadyPurged = window.localStorage.getItem(SW_PURGED_VERSION_KEY) || "";
  } catch {
    alreadyPurged = "";
  }

  if (alreadyPurged === version) return;

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    // ignore purge errors
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => SW_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)))
          .map((key) => caches.delete(key)),
      );
    }
  } catch {
    // ignore purge errors
  }

  try {
    window.localStorage.setItem(SW_PURGED_VERSION_KEY, version);
  } catch {
    // ignore storage errors
  }
}

export default function AppVersionGuard() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const runtimeVersion = await resolveRuntimeVersion();
      if (cancelled) return;

      // 같은 탭에서 반복 실행(중복 마운트 포함) 시 재실행 방지
      try {
        const ran = window.sessionStorage.getItem(VERSION_RUN_KEY);
        if (ran !== runtimeVersion) {
          window.sessionStorage.setItem(VERSION_RUN_KEY, runtimeVersion);
        }
      } catch {
        // ignore storage errors
      }

      let savedVersion = "";
      try {
        savedVersion = window.localStorage.getItem(VERSION_KEY) || "";
      } catch {
        savedVersion = "";
      }

      if (savedVersion !== runtimeVersion) {
        try {
          window.localStorage.setItem(VERSION_KEY, runtimeVersion);
        } catch {
          // ignore storage errors
        }
      }

      await purgeStaleServiceWorkers(runtimeVersion);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
