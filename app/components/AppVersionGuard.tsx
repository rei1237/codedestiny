"use client";

import { useEffect } from "react";

const APP_VERSION = "dev";
const VERSION_KEY = "app_version";
// 무한 reload 방지: sessionStorage에 이미 reload한 버전을 기록
const RELOAD_GUARD_KEY = "app_version_reload_guard";
const SW_PURGED_VERSION_KEY = "app_sw_purged_version";

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

/** 모든 SW 등록 해제 + 모든 Cache Storage 삭제 */
async function nukeAllCaches(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch {
    // ignore
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // ignore
  }
}

/** 이미 purge한 버전이면 skip */
async function purgeIfNeeded(version: string): Promise<void> {
  let alreadyPurged = "";
  try {
    alreadyPurged = window.localStorage.getItem(SW_PURGED_VERSION_KEY) || "";
  } catch {
    alreadyPurged = "";
  }
  if (alreadyPurged === version) return;

  await nukeAllCaches();

  try {
    window.localStorage.setItem(SW_PURGED_VERSION_KEY, version);
  } catch {
    // ignore
  }
}

export default function AppVersionGuard() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // version.json을 no-store로 fetch해 서버 최신 버전 확인
      const serverVersion = await resolveRuntimeVersion();
      if (cancelled) return;

      // dev 버전 또는 fetch 실패 시 아무 작업도 하지 않음
      if (!serverVersion || serverVersion === APP_VERSION) return;

      let savedVersion = "";
      try {
        savedVersion = window.localStorage.getItem(VERSION_KEY) || "";
      } catch {
        savedVersion = "";
      }

      const versionChanged = savedVersion !== serverVersion;

      if (versionChanged) {
        // ── 무한 reload 방지 guard ──
        // sessionStorage는 탭 닫힘 시 초기화 → 새 탭/재시작 시 다시 동작
        let reloadedVersion = "";
        try {
          reloadedVersion = window.sessionStorage.getItem(RELOAD_GUARD_KEY) || "";
        } catch {
          reloadedVersion = "";
        }

        if (reloadedVersion === serverVersion) {
          // 이미 이 버전으로 reload 했음 → 무한 루프 방지, 버전만 저장
          try {
            window.localStorage.setItem(VERSION_KEY, serverVersion);
          } catch {
            // ignore
          }
          await purgeIfNeeded(serverVersion);
          return;
        }

        // 1. 모든 SW 해제 + Cache Storage 삭제
        await nukeAllCaches();

        // 2. localStorage 버전 업데이트
        try {
          window.localStorage.setItem(VERSION_KEY, serverVersion);
          window.localStorage.setItem(SW_PURGED_VERSION_KEY, serverVersion);
        } catch {
          // ignore
        }

        // 3. reload guard 기록 (sessionStorage — 탭당 1회)
        try {
          window.sessionStorage.setItem(RELOAD_GUARD_KEY, serverVersion);
        } catch {
          // ignore
        }

        if (cancelled) return;

        // 4. 강제 새로고침 (최신 index.html 강제 fetch)
        window.location.reload();
        return;
      }

      // 버전이 같아도 SW/캐시가 남아있을 수 있으므로 purge 체크
      await purgeIfNeeded(serverVersion);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
