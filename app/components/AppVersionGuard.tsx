"use client";

import { useEffect } from "react";

const APP_VERSION = "2026-03-23-v2-cachefix1";
const VERSION_KEY = "app_version";
const VERSION_RUN_KEY = "app_version_guard_ran";

export default function AppVersionGuard() {
  useEffect(() => {
    // 인증/세션 안정성 우선: 더 이상 강제 전체 clear/reload를 수행하지 않습니다.
    let savedVersion = "";
    try {
      savedVersion = window.localStorage.getItem(VERSION_KEY) || "";
    } catch {
      // localStorage 접근이 불가한 브라우저에서는 guard 동작을 건너뜁니다.
      return;
    }

    if (savedVersion === APP_VERSION) return;

    // 같은 탭에서 반복 실행(중복 마운트 포함) 시 재실행 방지
    try {
      const ran = window.sessionStorage.getItem(VERSION_RUN_KEY);
      if (ran === APP_VERSION) return;
      window.sessionStorage.setItem(VERSION_RUN_KEY, APP_VERSION);
    } catch {}

    try {
      window.localStorage.setItem(VERSION_KEY, APP_VERSION);
    } catch {}
  }, []);

  return null;
}
