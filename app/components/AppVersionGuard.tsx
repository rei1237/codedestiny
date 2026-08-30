"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePaymentProcessing } from "./PaymentProcessingContext";
import {
  getActivePaidAttemptSession,
  isPaidAttemptInProgress,
  logPaidAttemptEvent,
  restorePaidAttemptFromUrlOrStorage,
} from "../_lib/paid-attempt-session";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

const APP_VERSION = process.env.NEXT_PUBLIC_GIT_SHA
  || process.env.NEXT_PUBLIC_BUILD_TIME
  || process.env.NEXT_PUBLIC_APP_VERSION
  || "dev";
const VERSION_KEY = "app_version";
// 무한 reload 방지: sessionStorage에 이미 reload한 버전을 기록
const RELOAD_GUARD_KEY = "app_version_reload_guard";
const SW_PURGED_VERSION_KEY = "app_sw_purged_version";
const SW_RETIRE_ONCE_KEY = "app_sw_retire_once";
const SW_RETIRE_VERSION = process.env.NEXT_PUBLIC_BUILD_TIME
  || process.env.NEXT_PUBLIC_GIT_SHA
  || process.env.NEXT_PUBLIC_APP_VERSION
  || "dev";
const DEFER_GUARD_KEY = "app_version_defer_guard";
// 60초 → 5분(2026-08-10). focus/visibility/online 재발사가 탭 복귀·재접속마다 이미 재검사를
// 트리거하므로, 이 interval은 "탭을 계속 열어 둔 채 방치"할 때만 쓰인다. 짧을 이유가 없다.
const VERSION_CHECK_INTERVAL_MS = 300_000;

type RuntimeWindow = Window & Record<string, unknown>;

type PendingUpdateState = {
  version: string;
  reason: string;
};

type BlockingReasonKey = "paymentProcessing" | "paidAttempt" | "importantInput" | "criticalTask" | "typing";

type AppVersionCopy = {
  updateTitle: string;
  updateBody: (reason: string) => string;
  /** 자동 새로고침을 막는 구체적 사유가 없을 때(=평범한 배포 갱신)의 안내문. */
  updateBodyIdle: string;
  later: string;
  reloadNow: string;
  reasons: Record<BlockingReasonKey, string>;
};

const APP_VERSION_COPY: Record<LoadingLocale, AppVersionCopy> = {
  ko: {
    updateTitle: "새 버전이 배포되었습니다.",
    updateBody: (reason) => `현재 ${reason} 상태여서 자동 새로고침을 보류했습니다.`,
    updateBodyIdle: "준비되면 새로고침해 주세요. 지금 화면은 그대로 유지됩니다.",
    later: "나중에",
    reloadNow: "지금 새로고침",
    reasons: {
      paymentProcessing: "결제 처리 중",
      paidAttempt: "유료 결과 생성 흐름 복구/진행 중",
      importantInput: "중요 입력 작업 진행 중",
      criticalTask: "핵심 작업 진행 중",
      typing: "입력 중",
    },
  },
  en: {
    updateTitle: "A new version has been deployed.",
    updateBody: (reason) => `Auto refresh is paused because ${reason}.`,
    updateBodyIdle: "Refresh whenever you're ready. This screen will stay as-is until then.",
    later: "Later",
    reloadNow: "Refresh now",
    reasons: {
      paymentProcessing: "payment is processing",
      paidAttempt: "paid result recovery or generation is in progress",
      importantInput: "important input is in progress",
      criticalTask: "a critical task is in progress",
      typing: "you are typing",
    },
  },
  ja: {
    updateTitle: "新しいバージョンが配信されました。",
    updateBody: (reason) => `現在${reason}のため、自動更新を保留しています。`,
    updateBodyIdle: "準備ができたら更新してください。それまでこの画面のままです。",
    later: "あとで",
    reloadNow: "今すぐ更新",
    reasons: {
      paymentProcessing: "決済処理中",
      paidAttempt: "有料結果の復旧または生成中",
      importantInput: "重要な入力作業中",
      criticalTask: "重要な処理中",
      typing: "入力中",
    },
  },
  "zh-CN": {
    updateTitle: "新版本已发布。",
    updateBody: (reason) => `当前正在${reason}，已暂停自动刷新。`,
    updateBodyIdle: "准备好后请刷新。此前页面将保持不变。",
    later: "稍后",
    reloadNow: "立即刷新",
    reasons: {
      paymentProcessing: "处理支付",
      paidAttempt: "恢复或生成付费结果",
      importantInput: "进行重要输入",
      criticalTask: "执行关键任务",
      typing: "输入内容",
    },
  },
  "zh-TW": {
    updateTitle: "新版本已發布。",
    updateBody: (reason) => `目前正在${reason}，已暫停自動重新整理。`,
    updateBodyIdle: "準備好後請重新整理。此前畫面將維持不變。",
    later: "稍後",
    reloadNow: "立即重新整理",
    reasons: {
      paymentProcessing: "處理付款",
      paidAttempt: "恢復或生成付費結果",
      importantInput: "進行重要輸入",
      criticalTask: "執行關鍵任務",
      typing: "輸入內容",
    },
  },
  vi: {
    updateTitle: "Phiên bản mới đã được phát hành.",
    updateBody: (reason) => `Tự làm mới đang tạm dừng vì ${reason}.`,
    updateBodyIdle: "Hãy làm mới khi bạn đã sẵn sàng. Màn hình này sẽ giữ nguyên cho đến lúc đó.",
    later: "Để sau",
    reloadNow: "Làm mới ngay",
    reasons: {
      paymentProcessing: "đang xử lý thanh toán",
      paidAttempt: "đang khôi phục hoặc tạo kết quả trả phí",
      importantInput: "bạn đang nhập thông tin quan trọng",
      criticalTask: "tác vụ quan trọng đang chạy",
      typing: "bạn đang nhập",
    },
  },
  hi: {
    updateTitle: "नया संस्करण जारी हो गया है.",
    updateBody: (reason) => `${reason} के कारण ऑटो रिफ्रेश रोका गया है.`,
    updateBodyIdle: "जब आप तैयार हों तब रिफ्रेश करें. तब तक यह स्क्रीन ऐसी ही रहेगी.",
    later: "बाद में",
    reloadNow: "अभी रिफ्रेश करें",
    reasons: {
      paymentProcessing: "भुगतान संसाधित हो रहा है",
      paidAttempt: "पेड परिणाम रिकवरी या निर्माण चल रहा है",
      importantInput: "महत्वपूर्ण इनपुट चल रहा है",
      criticalTask: "महत्वपूर्ण कार्य चल रहा है",
      typing: "आप टाइप कर रहे हैं",
    },
  },
  es: {
    updateTitle: "Se ha publicado una nueva versión.",
    updateBody: (reason) => `La actualización automática está pausada porque ${reason}.`,
    updateBodyIdle: "Actualiza cuando estés listo. Esta pantalla se mantendrá igual hasta entonces.",
    later: "Más tarde",
    reloadNow: "Actualizar ahora",
    reasons: {
      paymentProcessing: "el pago se está procesando",
      paidAttempt: "se está recuperando o generando un resultado de pago",
      importantInput: "hay una entrada importante en curso",
      criticalTask: "hay una tarea crítica en curso",
      typing: "estás escribiendo",
    },
  },
  fr: {
    updateTitle: "Une nouvelle version a été déployée.",
    updateBody: (reason) => `L'actualisation automatique est suspendue car ${reason}.`,
    updateBodyIdle: "Actualisez quand vous serez prêt. Cet écran restera tel quel jusque-là.",
    later: "Plus tard",
    reloadNow: "Actualiser",
    reasons: {
      paymentProcessing: "le paiement est en cours",
      paidAttempt: "la récupération ou la génération du résultat payant est en cours",
      importantInput: "une saisie importante est en cours",
      criticalTask: "une tâche critique est en cours",
      typing: "vous êtes en train d'écrire",
    },
  },
  de: {
    updateTitle: "Eine neue Version wurde bereitgestellt.",
    updateBody: (reason) => `Die automatische Aktualisierung pausiert, weil ${reason}.`,
    updateBodyIdle: "Aktualisiere, sobald du bereit bist. Dieser Bildschirm bleibt bis dahin unverändert.",
    later: "Später",
    reloadNow: "Jetzt aktualisieren",
    reasons: {
      paymentProcessing: "eine Zahlung verarbeitet wird",
      paidAttempt: "ein bezahltes Ergebnis wiederhergestellt oder erstellt wird",
      importantInput: "eine wichtige Eingabe läuft",
      criticalTask: "eine kritische Aufgabe läuft",
      typing: "du gerade tippst",
    },
  },
  nl: {
    updateTitle: "Er is een nieuwe versie uitgerold.",
    updateBody: (reason) => `Automatisch vernieuwen is gepauzeerd omdat ${reason}.`,
    updateBodyIdle: "Vernieuw zodra je er klaar voor bent. Dit scherm blijft tot dan ongewijzigd.",
    later: "Later",
    reloadNow: "Nu vernieuwen",
    reasons: {
      paymentProcessing: "de betaling wordt verwerkt",
      paidAttempt: "een betaald resultaat wordt hersteld of gemaakt",
      importantInput: "er belangrijke invoer bezig is",
      criticalTask: "er een kritieke taak bezig is",
      typing: "je aan het typen bent",
    },
  },
  ms: {
    updateTitle: "Versi baharu telah dikeluarkan.",
    updateBody: (reason) => `Muat semula automatik dijeda kerana ${reason}.`,
    updateBodyIdle: "Muat semula apabila anda sudah bersedia. Skrin ini akan kekal sehingga itu.",
    later: "Kemudian",
    reloadNow: "Muat semula sekarang",
    reasons: {
      paymentProcessing: "bayaran sedang diproses",
      paidAttempt: "keputusan berbayar sedang dipulihkan atau dijana",
      importantInput: "input penting sedang berjalan",
      criticalTask: "tugasan penting sedang berjalan",
      typing: "anda sedang menaip",
    },
  },
};

const KOREAN_BLOCKING_REASON_TO_KEY: Record<string, BlockingReasonKey> = {
  "결제 처리 중": "paymentProcessing",
  "유료 결과 생성 흐름 복구/진행 중": "paidAttempt",
  "중요 입력 작업 진행 중": "importantInput",
  "핵심 작업 진행 중": "criticalTask",
  "입력 중": "typing",
};

function resolveAppVersionCopy(locale: LoadingLocale) {
  return APP_VERSION_COPY[locale] || APP_VERSION_COPY.ko;
}

function resolveBlockingReasonText(reason: string, copy: AppVersionCopy, locale: LoadingLocale) {
  const key = KOREAN_BLOCKING_REASON_TO_KEY[String(reason || "").trim()];
  if (key && locale !== "ko") return copy.reasons[key];
  return reason || copy.reasons.criticalTask;
}

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
  } catch (e) {
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
  } catch (e) {
    // ignore
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch (e) {
    // ignore
  }
}

/** 이미 purge한 버전이면 skip */
async function purgeIfNeeded(version: string): Promise<void> {
  let alreadyPurged = "";
  try {
    alreadyPurged = window.localStorage.getItem(SW_PURGED_VERSION_KEY) || "";
  } catch (e) {
    alreadyPurged = "";
  }
  if (alreadyPurged === version) return;

  await nukeAllCaches();

  try {
    window.localStorage.setItem(SW_PURGED_VERSION_KEY, version);
  } catch (e) {
    // ignore
  }
}

async function retireLegacyServiceWorkersOnce(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const already = window.localStorage.getItem(SW_RETIRE_ONCE_KEY) || "";
    if (already === SW_RETIRE_VERSION) return;
  } catch (e) {
    // ignore
  }

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
    }
  } catch (e) {
    // ignore
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => {
            const normalized = String(key || "").toLowerCase();
            return normalized.includes("legacy")
              || normalized.includes("code-destiny")
              || normalized.includes("kkul")
              || normalized.includes("workbox")
              || normalized.includes("next")
              || normalized.includes("tadagochi");
          })
          .map((key) => caches.delete(key)),
      );
    }
  } catch (e) {
    // ignore
  }

  try {
    window.localStorage.setItem(SW_RETIRE_ONCE_KEY, SW_RETIRE_VERSION);
  } catch (e) {
    // ignore
  }
}

function getWindowBooleanFlag(flagName: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean((window as unknown as RuntimeWindow)[flagName]);
  } catch (e) {
    return false;
  }
}

function getBlockingReason(isPaymentProcessing: boolean): string {
  if (typeof document === "undefined") {
    return "";
  }
  const copy = resolveAppVersionCopy(getCurrentLoadingLocale());

  if (isPaymentProcessing || getWindowBooleanFlag("__CD_PAYMENT_PROCESSING__")) {
    return copy.reasons.paymentProcessing;
  }

  if (isPaidAttemptInProgress()) {
    return copy.reasons.paidAttempt;
  }

  if (getWindowBooleanFlag("__CD_VERSION_GUARD_BLOCK__")) {
    return copy.reasons.importantInput;
  }

  if (document?.body?.dataset?.cdVersionGuardBusy === "1") {
    return copy.reasons.criticalTask;
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
        return copy.reasons.typing;
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
    void retireLegacyServiceWorkersOnce();
    const restored = restorePaidAttemptFromUrlOrStorage();
    if (restored) {
      logPaidAttemptEvent("PaidAttempt.ProcessingMounted", {
        attemptId: restored.attemptId,
        featureKey: restored.featureKey,
        paymentStatus: restored.paymentStatus,
        generationStatus: restored.generationStatus,
        reason: "app_version_guard_boot",
      });
    }
  }, []);

  useEffect(() => {
    paymentLoadingRef.current = isPaymentLoading;
  }, [isPaymentLoading]);

  const applyUpdate = useCallback(async (version: string) => {
    await nukeAllCaches();

    try {
      window.localStorage.setItem(VERSION_KEY, version);
      window.localStorage.setItem(SW_PURGED_VERSION_KEY, version);
    } catch (e) {
      // ignore
    }

    try {
      window.sessionStorage.setItem(RELOAD_GUARD_KEY, version);
      window.sessionStorage.removeItem(DEFER_GUARD_KEY);
    } catch (e) {
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
    } catch (e) {
      savedVersion = "";
    }

    // 저장값이 없다 = 이 브라우저/앱이 이 사이트를 처음 본다. 방금 받아온 문서를 같은 URL 로
    // 다시 로드해도 달라질 것이 없으므로, 이걸 "버전 변경"으로 흘려보내면 첫 방문·재설치·배포
    // 직후 사용자가 전원 강제 리로드를 한 번씩 겪는다(=화면 이중 로딩). 버전만 기록하고 넘긴다.
    // 셸(js/share.js)과 같은 storage 키를 공유하므로 양쪽 판정이 같아야 한다.
    if (!savedVersion) {
      try {
        window.localStorage.setItem(VERSION_KEY, serverVersion);
      } catch (e) {
        // ignore
      }
      await purgeIfNeeded(serverVersion);
      setPendingUpdate(null);
      return;
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
    } catch (e) {
      reloadedVersion = "";
    }

    if (reloadedVersion === serverVersion) {
      try {
        window.localStorage.setItem(VERSION_KEY, serverVersion);
      } catch (e) {
        // ignore
      }
      await purgeIfNeeded(serverVersion);
      setPendingUpdate(null);
      return;
    }

    let deferredVersion = "";
    try {
      deferredVersion = window.sessionStorage.getItem(DEFER_GUARD_KEY) || "";
    } catch (e) {
      deferredVersion = "";
    }

    const blockingReason = getBlockingReason(paymentLoadingRef.current);
    if (blockingReason || deferredVersion === serverVersion) {
      if (deferredVersion === serverVersion) {
        setPendingUpdate(null);
      } else {
        const activeAttempt = getActivePaidAttemptSession();
        if (activeAttempt && isPaidAttemptInProgress()) {
          logPaidAttemptEvent("PaidAttempt.ReloadPrevented", {
            attemptId: activeAttempt.attemptId,
            featureKey: activeAttempt.featureKey,
            paymentStatus: activeAttempt.paymentStatus,
            generationStatus: activeAttempt.generationStatus,
            reason: blockingReason,
          });
        }
        setPendingUpdate({
          version: serverVersion,
          reason: blockingReason,
        });
      }
      return;
    }

    // 🔴 자동 location.replace 는 하지 않는다(2026-08-01 폐지). 배포마다 저장된 버전과 다른
    // 모든 재방문자가 매번 자동 리로드를 1회씩 겪었고(60초 interval + focus/visibility/online 이
    // 계속 재검사), 정작 '/'·'/index.html'은 no-store 라 다음 문서 이동에서 어차피 최신을 받는다.
    // 셸(js/share.js)과 동일하게 배너로 맡긴다 — 캐시 정리만 이 버전당 한 번 수행한다.
    await purgeIfNeeded(serverVersion);
    setPendingUpdate({ version: serverVersion, reason: "" });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const runSafe = async () => {
      if (cancelled || checkInFlightRef.current) return;
      if (document.visibilityState !== "visible") return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;

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
    window.addEventListener("online", onWake);
    window.addEventListener("cd:critical-operation-state", onWake as EventListener);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      window.removeEventListener("cd:critical-operation-state", onWake as EventListener);
    };
  }, [runVersionCheck]);

  if (!pendingUpdate) return null;
  const locale = getCurrentLoadingLocale();
  const copy = resolveAppVersionCopy(locale);
  // reason이 없으면(=자동 새로고침을 막을 구체적 사유 없이 그냥 새 배포가 있는 평범한 경우)
  // "핵심 작업 진행 중" 폴백으로 흘려보내지 않고 일반 안내문을 쓴다.
  const pendingReason = pendingUpdate.reason
    ? resolveBlockingReasonText(pendingUpdate.reason, copy, locale)
    : "";

  return (
    <div className="fixed inset-x-0 bottom-0 z-[2147483647] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-xl border border-amber-300/45 bg-amber-50 px-4 py-3 text-amber-950 shadow-[0_10px_30px_rgba(0,0,0,0.15)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{copy.updateTitle}</p>
          <p className="text-xs text-amber-900/90">
            {pendingReason ? copy.updateBody(pendingReason) : copy.updateBodyIdle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-amber-900/15 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
            onClick={() => {
              try {
                window.sessionStorage.setItem(DEFER_GUARD_KEY, pendingUpdate.version);
              } catch (e) {
                // ignore
              }
              setPendingUpdate(null);
            }}
          >
            {copy.later}
          </button>
          <button
            type="button"
            className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
            onClick={() => {
              void applyUpdate(pendingUpdate.version);
            }}
          >
            {copy.reloadNow}
          </button>
        </div>
      </div>
    </div>
  );
}
