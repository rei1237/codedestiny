"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePaymentProcessing } from "./PaymentProcessingContext";
import { installPdfExportFetchGuard } from "../_lib/pdf-export-guard";

const APP_VERSION = "dev";
const VERSION_KEY = "app_version";
// 무한 reload 방지: sessionStorage에 이미 reload한 버전을 기록
const RELOAD_GUARD_KEY = "app_version_reload_guard";
const SW_PURGED_VERSION_KEY = "app_sw_purged_version";
const DEFER_GUARD_KEY = "app_version_defer_guard";
const VERSION_CHECK_INTERVAL_MS = 45_000;

type RuntimeWindow = Window & Record<string, unknown>;

type PendingUpdateState = {
  version: string;
  reason: string;
};

function pickRuntimeVersion(payload: unknown): string {
  if (!payload || typeof payload !== "object") return APP_VERSION;
  const value = payload as Record<string, unknown>;
  const candidate = [value.commitShort, value.commit, value.builtAt]
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

function getWindowBooleanFlag(flagName: string): boolean {
  try {
    return Boolean((window as unknown as RuntimeWindow)[flagName]);
  } catch {
    return false;
  }
}

function getBlockingReason(isPaymentProcessing: boolean): string {
  if (isPaymentProcessing || getWindowBooleanFlag("__CD_PAYMENT_PROCESSING__")) {
    return "결제 처리 중";
  }

  if (getWindowBooleanFlag("__CD_PDF_EXPORT_IN_PROGRESS__")) {
    return "PDF 생성/다운로드 중";
  }

  if (getWindowBooleanFlag("__CD_VERSION_GUARD_BLOCK__")) {
    return "중요 입력 작업 진행 중";
  }

  if (document?.body?.dataset?.cdVersionGuardBusy === "1") {
    return "핵심 작업 진행 중";
  }

  const active = document.activeElement as
    | (HTMLElement & { value?: string })
    | null;

  if (active) {
    const tagName = String(active.tagName || "").toLowerCase();
    const isEditable = active.isContentEditable
      || tagName === "input"
      || tagName === "textarea"
      || tagName === "select";

    if (isEditable) {
      const value = String(active.value || "").trim();
      const text = String(active.textContent || "").trim();
      if (value || text) {
        return "입력 중";
      }
    }
  }

  return "";
}

export default function AppVersionGuard() {
  const { isPaymentLoading } = usePaymentProcessing();
  const paymentLoadingRef = useRef(isPaymentLoading);
  const checkInFlightRef = useRef(false);
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdateState | null>(null);

  useEffect(() => {
    installPdfExportFetchGuard();
  }, []);

  useEffect(() => {
    paymentLoadingRef.current = isPaymentLoading;
  }, [isPaymentLoading]);

  const applyUpdate = useCallback(async (version: string) => {
    await nukeAllCaches();

    try {
      window.localStorage.setItem(VERSION_KEY, version);
      window.localStorage.setItem(SW_PURGED_VERSION_KEY, version);
    } catch {
      // ignore
    }

    try {
      window.sessionStorage.setItem(RELOAD_GUARD_KEY, version);
      window.sessionStorage.removeItem(DEFER_GUARD_KEY);
    } catch {
      // ignore
    }

    // 모바일 환경 등에서 캐시 고착을 방지하기 위해 쿼리 파라미터를 추가하여 강제 새로고침
    const url = new URL(window.location.href);
    url.searchParams.set("v", version);
    window.location.replace(url.toString());
  }, []);

  const runVersionCheck = useCallback(async () => {
    const serverVersion = await resolveRuntimeVersion();
    if (!serverVersion || serverVersion === APP_VERSION) return;

    let savedVersion = "";
    try {
      savedVersion = window.localStorage.getItem(VERSION_KEY) || "";
    } catch {
      savedVersion = "";
    }

    const versionChanged = savedVersion !== serverVersion;
    if (!versionChanged) {
      await purgeIfNeeded(serverVersion);
      setPendingUpdate(null);
      return;
    }

    let reloadedVersion = "";
    try {
      reloadedVersion = window.sessionStorage.getItem(RELOAD_GUARD_KEY) || "";
    } catch {
      reloadedVersion = "";
    }

    if (reloadedVersion === serverVersion) {
      try {
        window.localStorage.setItem(VERSION_KEY, serverVersion);
      } catch {
        // ignore
      }
      await purgeIfNeeded(serverVersion);
      setPendingUpdate(null);
      return;
    }

    let deferredVersion = "";
    try {
      deferredVersion = window.sessionStorage.getItem(DEFER_GUARD_KEY) || "";
    } catch {
      deferredVersion = "";
    }

    const blockingReason = getBlockingReason(paymentLoadingRef.current);
    if (blockingReason || deferredVersion === serverVersion) {
      if (deferredVersion === serverVersion) {
        setPendingUpdate(null);
      } else {
        setPendingUpdate({
          version: serverVersion,
          reason: blockingReason,
        });
      }
      return;
    }

    setPendingUpdate(null);
    await applyUpdate(serverVersion);
  }, [applyUpdate]);

  useEffect(() => {
    let cancelled = false;

    const runSafe = async () => {
      if (cancelled || checkInFlightRef.current) return;

      checkInFlightRef.current = true;
      try {
        await runVersionCheck();
      } finally {
        checkInFlightRef.current = false;
      }
    };

    void runSafe();

    const timer = window.setInterval(() => {
      void runSafe();
    }, VERSION_CHECK_INTERVAL_MS);

    const onWake = () => {
      if (document.visibilityState === "visible") {
        void runSafe();
      }
    };

    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("cd:critical-operation-state", onWake as EventListener);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("cd:critical-operation-state", onWake as EventListener);
    };
  }, [runVersionCheck]);

  if (!pendingUpdate) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[2147483647] px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-xl border border-amber-300/45 bg-amber-50 px-4 py-3 text-amber-950 shadow-[0_10px_30px_rgba(0,0,0,0.15)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">새 버전이 배포되었습니다.</p>
          <p className="text-xs text-amber-900/90">
            현재 {pendingUpdate.reason} 상태여서 자동 새로고침을 보류했습니다.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-amber-900/15 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            onClick={() => {
              try {
                window.sessionStorage.setItem(DEFER_GUARD_KEY, pendingUpdate.version);
              } catch {
                // ignore
              }
              setPendingUpdate(null);
            }}
          >
            나중에
          </button>
          <button
            type="button"
            className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
            onClick={() => {
              void applyUpdate(pendingUpdate.version);
            }}
          >
            지금 새로고침
          </button>
        </div>
      </div>
    </div>
  );
}
