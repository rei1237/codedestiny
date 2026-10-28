"use client";

// 별빛 운영본부 UI 와 종전 관리자 UI 사이의 롤백 스위치.
//
// 두 갈래로 끈다 — 어느 쪽이든 "classic" 이면 셸은 예전 평면 메뉴로, /admin 은 /admin/content 로 돌아간다.
//   1) 서버 플래그 ops_hq_settings.uiEnabled=false  → 모든 관리자에게(GET /api/admin/hq/ui-mode)
//   2) 이 브라우저의 localStorage cd_admin_ui=classic → 나 혼자만(관리 화면의 전환 버튼)
// 서버 조회가 실패하면 "hq" 로 둔다 — 새 API 가 아직 배포되지 않은 워커에서도 기존 메뉴는 전부 열린다.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { adminFetch } from "../_lib/admin-api";

export type AdminUiMode = "hq" | "classic";

const LOCAL_OVERRIDE_KEY = "cd_admin_ui";
const SERVER_CACHE_KEY = "cd_admin_ui_server";

function readLocalOverride(): boolean {
  try { return window.localStorage.getItem(LOCAL_OVERRIDE_KEY) === "classic"; } catch { return false; }
}

function readServerCache(): boolean | null {
  try {
    const raw = window.sessionStorage.getItem(SERVER_CACHE_KEY);
    return raw === "0" ? false : raw === "1" ? true : null;
  } catch { return null; }
}

function writeServerCache(enabled: boolean) {
  try { window.sessionStorage.setItem(SERVER_CACHE_KEY, enabled ? "1" : "0"); } catch { /* 시크릿 모드 */ }
}

interface AdminUiModeValue {
  mode: AdminUiMode;
  /** 서버가 끈 상태인가. 이때는 이 브라우저에서 다시 켤 수 없다. */
  serverDisabled: boolean;
  localClassic: boolean;
  setLocalClassic: (classic: boolean) => void;
}

const AdminUiModeContext = createContext<AdminUiModeValue>({
  mode: "hq",
  serverDisabled: false,
  localClassic: false,
  setLocalClassic: () => {},
});

export function useAdminUiMode(): AdminUiModeValue {
  return useContext(AdminUiModeContext);
}

/** 인증 게이트를 통과한 뒤에만 서버 플래그를 묻는다(토큰 없이 부르면 401 → 로그인 리다이렉트가 겹친다). */
export function AdminUiModeProvider({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [localClassic, setLocalClassicState] = useState(false);
  const [serverEnabled, setServerEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    setLocalClassicState(readLocalOverride());
    setServerEnabled(readServerCache());
  }, []);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    adminFetch<{ uiEnabled?: boolean }>("/api/admin/hq/ui-mode", { signal: controller.signal, retry: false })
      .then((data) => {
        const enabled = data?.uiEnabled !== false;
        writeServerCache(enabled);
        setServerEnabled(enabled);
      })
      .catch(() => { /* 미배포·장애 — 마지막 캐시값 또는 기본(hq) 유지 */ });
    return () => controller.abort();
  }, [active]);

  const setLocalClassic = useCallback((classic: boolean) => {
    try {
      if (classic) window.localStorage.setItem(LOCAL_OVERRIDE_KEY, "classic");
      else window.localStorage.removeItem(LOCAL_OVERRIDE_KEY);
    } catch { /* 저장 불가여도 이번 화면에는 반영한다 */ }
    setLocalClassicState(classic);
  }, []);

  const value = useMemo<AdminUiModeValue>(() => {
    const serverDisabled = serverEnabled === false;
    return {
      mode: serverDisabled || localClassic ? "classic" : "hq",
      serverDisabled,
      localClassic,
      setLocalClassic,
    };
  }, [serverEnabled, localClassic, setLocalClassic]);

  return <AdminUiModeContext.Provider value={value}>{children}</AdminUiModeContext.Provider>;
}
