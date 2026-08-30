"use client";

// 리포트 생성 · 재열람 배관.
//
// 서버는 엣지 데드라인(100초) 때문에 한 요청에 웨이브 하나만 돌린다. 그래서 18장이 다 찰
// 때까지 **클라이언트가 /generate 를 반복 호출**한다. 정본은 인생의 책의 runBatches
// (src/features/master-love-codex/MasterLoveCodexPage.tsx) 이고 그 규율을 그대로 따른다.
//
// 🔴 여기에 재시도 계층을 새로 만들지 않는다(코딩 원칙 6). postPaidBody 가 이미 일시 503·
//    네트워크 블립을 백오프로 5회까지 재시도한다. 그 위에 또 백오프 루프를 얹으면 시도 횟수가
//    곱해지고, 정작 확정 실패는 그만큼 늦게 보인다. 이 훅의 while 은 **재시도가 아니라 웨이브
//    진행**이다 — 200/202 를 받아 진도가 나갔을 때만 다음 바퀴를 돈다.
//
// 🔴 결제 성공과 생성 성공을 한 트랜잭션으로 보지 않는다(요구 31). 결제 직후 reportId 를
//    localStorage 에 먼저 적고 URL 에 심는다. 그 뒤에 무슨 일이 생겨도 재방문으로 이어서
//    만들 수 있고, 재개 경로는 결제를 다시 부르지 않는다.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale as ViewerLocale } from "@/app/human-design/_copy";

import { authFetch } from "@/app/_lib/auth-client";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { postPaidBody } from "@/app/nakshatra/nakshatra-fetch";

import { say } from "./copy";
import type {
  ReportDocument,
  ReportLocale,
  ReportPhase,
  ReportPlanEntry,
} from "./types";

const FEATURE_KEY = "human-design-report";
const COIN_PRICE = 100;
const AMOUNT_KRW = 10000;

/** 🔴 sessionStorage 가 아니다 — 세션이 끝났다고 결제한 문서를 잃으면 안 된다(요구 31). */
const REPORT_ID_STORAGE_KEY = "cd_hd_report_id_v1";
const REQUEST_ID_STORAGE_PREFIX = "cd_hd_report_req_v1";

/**
 * 서버가 **환불까지 마치고 문서를 닫은** 사유들. 이 경우 재시도는 영영 성공하지 않는다
 * (문서가 generation_failed 라 락 클레임 자체가 안 잡힌다). 재구매로 보내야 한다.
 */
const REFUNDED_REASONS = new Set([
  "GENERATION_STALLED",
  "REPORT_UNDELIVERABLE",
  "GENERATION_ALREADY_FAILED",
  "GENERATION_FAILED",
]);

/** 서버 상한(10웨이브)보다 넉넉히 두되, 진행이 멈추면 웨이브 수와 무관하게 끊는다. */
const MAX_WAVES = 24;
/** 진행 없는 성공 응답이 이만큼 이어지면 무한루프다. 서버는 1장 이상 커밋하거나 실패를 준다. */
const MAX_NO_PROGRESS = 3;
/** 락 대기(409) 로만 시간을 보낼 수 있는 총량. */
const LOCK_WAIT_BUDGET_MS = 90000;

// 🔴 /generate 한 번은 서버 웨이브 예산(HD_REPORT_WAVE_BUDGET_MS = 75초)만큼 응답을 붙들도록
//    설계돼 있는데 authFetch 의 기본 상한은 22초다. 그래서 **정상 웨이브가 매번 abort** 됐고,
//    끊긴 요청도 서버 쪽에서는 waveCount 를 이미 올린 채 계속 돌아 결국 상한(10)에 걸려
//    환불 + generation_failed 로 닫혔다 — 결제하고도 리포트가 안 나오던 실제 경로다.
//    그래서 이 호출에만 자기 상한을 준다. 🔴 엣지 응답 데드라인(100초)보다 **길어야** 한다 —
//    Cloudflare 가 100초까지는 응답을 흘려보내므로 그보다 짧게 끊으면 도착 직전의 정상
//    응답을 우리가 먼저 버린다. 값 정합은 verify:human-design-report 가 숫자로 대조한다.
const WAVE_REQUEST_TIMEOUT_MS = 105000;
/** 그 상한을 한 번은 온전히 쓰게 하는 총예산. 기본값(30초)이면 웨이브를 끝까지 못 기다린다. */
const WAVE_REQUEST_BUDGET_MS = 110000;
/** 🔴 시도 횟수는 늘리지 않는다 — 95초짜리 시도를 5회 돌리면 사용자를 8분 붙든다. */
const WAVE_REQUEST_MAX_ATTEMPTS = 2;

function readStorage(key: string): string {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* 프라이빗 모드 등에서 막히는 것은 치명적이지 않다 — URL 이 두 번째 복구 수단이다. */
  }
}

function dropStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* 지우지 못해도 서버가 새 문서를 만들 때 스스로 정리된다. */
  }
}

/**
 * 🔴 결제 requestId 는 **새로고침을 견뎌야 한다.** useRef 에만 두면 결제창이 뜬 사이의
 *    새로고침이 곧 새 requestId 이고, 그것은 이중 결제다. 출생 차트·언어가 같으면 같은 키를
 *    쓰도록 저장소에 고정한다(서버의 PaidExecutionRecord unique 가 2차 방어선이다).
 */
function stableRequestId(inputHash: string, locale: ReportLocale): string {
  const key = `${REQUEST_ID_STORAGE_PREFIX}:${inputHash}:${locale}`;
  const existing = readStorage(key);
  if (existing) return existing;
  const created = `${FEATURE_KEY}:${inputHash.slice(0, 16)}:${locale}:${Date.now().toString(36)}`;
  writeStorage(key, created);
  return created;
}

type Options = {
  inputHash: string;
  locale: ReportLocale;
  birth: Record<string, unknown> | null;
  /** 화면 문구의 언어. 본문 언어(report.locale)와 다를 수 있다. */
  uiLocale: ViewerLocale;
};

export type ReportGeneration = {
  phase: ReportPhase;
  doc: ReportDocument | null;
  planEntries: ReportPlanEntry[];
  completedKeys: Set<string>;
  error: string;
  elapsedMs: number;
  busy: boolean;
  purchase: () => void;
  resume: () => void;
};

export function useReportGeneration({ inputHash, locale, birth, uiLocale }: Options): ReportGeneration {
  const { ensurePaidAccess, isPaying } = useCoinGate();

  const [phase, setPhase] = useState<ReportPhase>("loading");
  const [doc, setDoc] = useState<ReportDocument | null>(null);
  const [planEntries, setPlanEntries] = useState<ReportPlanEntry[]>([]);
  const [error, setError] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);

  const [busy, setBusy] = useState(false);

  const reportIdRef = useRef("");
  const runningRef = useRef(false);
  const startedAtRef = useRef(0);

  const fail = useCallback((message: string) => {
    setError(message);
    setPhase("error");
  }, []);

  /**
   * 🔴 환불로 닫힌 리포트는 **다시 살 수 있어야 한다.** 그러려면 저장해 둔 두 키를 반드시
   *    놓아야 한다 — 죽은 reportId 를 들고 있으면 재방문이 그 문서를 계속 열려 하고, 같은
   *    requestId 를 재사용하면 PaidExecutionRecord 의 {userId,featureId,profileId,requestId}
   *    unique 가 새 결제를 막는다. (월정석 환불이 구매 키를 안 놓아 재구매가 막힌 전례가 있다.)
   */
  const releaseAfterRefund = useCallback(() => {
    dropStorage(REPORT_ID_STORAGE_KEY);
    if (inputHash) dropStorage(`${REQUEST_ID_STORAGE_PREFIX}:${inputHash}:${locale}`);
    reportIdRef.current = "";
    setDoc(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("reportId");
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* URL 정리는 편의일 뿐, 저장소를 비운 것으로 재구매는 이미 열렸다. */
    }
  }, [inputHash, locale]);


  /** 실측 경과 시간. 🔴 가짜 퍼센트를 만들지 않는다 — 남은 시간을 모르면 모른다고 둔다. */
  useEffect(() => {
    if (phase !== "generating") return undefined;
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const applyDoc = useCallback((next: ReportDocument) => {
    setDoc(next);
    reportIdRef.current = next.reportId || reportIdRef.current;
    if (next.reportId) writeStorage(REPORT_ID_STORAGE_KEY, next.reportId);
  }, []);

  /**
   * 웨이브 루프. 완료될 때까지 /generate 를 반복한다.
   * 🔴 결제를 다시 부르지 않는다 — 문서 자체가 증빙이고, 재검증을 넣으면 생성 도중에 결제한
   *    사용자가 자기 리포트에서 막힌다.
   */
  const runWaves = useCallback(async (reportId: string) => {
    setPhase("generating");
    setError("");
    if (!startedAtRef.current) startedAtRef.current = Date.now();

    let waves = 0;
    let noProgress = 0;
    let written = 0;
    let lockWaitStartedAt = 0;

    for (;;) {
      if (waves >= MAX_WAVES) throw new Error(say("budgetExceeded", uiLocale));

      const { status, data, transient } = await postPaidBody(
        "/api/human-design-report/generate",
        { reportId },
        {
          timeoutMs: WAVE_REQUEST_TIMEOUT_MS,
          budgetMs: WAVE_REQUEST_BUDGET_MS,
          maxAttempts: WAVE_REQUEST_MAX_ATTEMPTS,
        },
      );

      if (!data?.ok) {
        // 409 는 실패가 아니라 "다른 탭이 이미 웨이브를 돌리는 중" 이다. 짧게 양보하고
        // 같은 루프를 계속한다 — 새 재시도 계층이 아니라 이 루프의 대기 상태다.
        if (status === 409 && data?.reason === "GENERATION_IN_PROGRESS") {
          if (!lockWaitStartedAt) lockWaitStartedAt = Date.now();
          if (Date.now() - lockWaitStartedAt > LOCK_WAIT_BUDGET_MS) throw new Error(say("budgetExceeded", uiLocale));
          await new Promise((resolve) => { window.setTimeout(resolve, 4000); });
          continue;
        }
        // 🔴 서버가 이미 닫고 환불한 경우. 이어서 만들기가 성공할 길이 없으므로 저장 키를
        //    놓고 재구매 화면으로 되돌린다 — 환불받은 사용자가 다시 살 수 있어야 한다.
        if (REFUNDED_REASONS.has(String(data?.reason || ""))) {
          releaseAfterRefund();
          setError(say("stalled", uiLocale));
          setPhase("locked");
          return;
        }
        // postPaidBody 가 이미 백오프를 다 쓰고 일시 장애로 끝난 경우. 여기서 또 돌리지 않고
        // 사용자에게 [이어서 만들기] 를 준다 — 결제는 이미 문서에 묶여 있어 유실이 아니다.
        if (transient) throw new Error(say("networkError", uiLocale));
        throw new Error(typeof data?.message === "string" && data.message ? data.message : say("serverError", uiLocale));
      }

      waves += 1;
      lockWaitStartedAt = 0;
      const next = data as unknown as ReportDocument;
      applyDoc(next);

      const completed = next.progress?.completed ?? next.sections?.length ?? 0;
      if (completed > written) { written = completed; noProgress = 0; } else { noProgress += 1; }
      if (noProgress >= MAX_NO_PROGRESS) throw new Error(say("budgetExceeded", uiLocale));

      if (next.status === "completed") {
        setPhase("reading");
        return;
      }
    }
  }, [applyDoc, releaseAfterRefund, uiLocale]);

  const guarded = useCallback(async (work: () => Promise<void>) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setBusy(true);
    try {
      await work();
    } catch (caught) {
      fail(caught instanceof Error && caught.message ? caught.message : say("serverError", uiLocale));
    } finally {
      runningRef.current = false;
      setBusy(false);
    }
  }, [fail, uiLocale]);

  /** 저장된 리포트를 연다. 없으면 잠금 화면으로 떨어진다 — 여기서는 결제를 부르지 않는다. */
  const load = useCallback(async (reportId: string) => {
    const query = reportId
      ? `reportId=${encodeURIComponent(reportId)}`
      : `inputHash=${encodeURIComponent(inputHash)}&locale=${encodeURIComponent(locale)}`;
    let response: Response;
    try {
      response = await authFetch(`/api/human-design-report/result?${query}`, { method: "GET" });
    } catch {
      fail(say("networkError", uiLocale));
      return;
    }
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (response.status === 404 || data?.reason === "REPORT_NOT_FOUND") {
      setPhase("locked");
      return;
    }
    if (response.status === 401) {
      // 🔴 오류 화면이 아니라 **잠금 화면**으로 보낸다. 처음 온 비로그인 방문자가 "무엇을
      //    사는 것인지" 를 보지도 못하고 오류를 맞는 것은 게이트가 아니라 벽이다.
      //    로그인은 [리포트 만들기] 를 누를 때 ensurePaidAccess 가 연다.
      setPhase("locked");
      return;
    }
    if (!data?.ok) {
      // 좀비 승격(환불 완료)과 확정 실패는 다시 살 수 있는 상태다 — 저장 키를 놓고 되돌린다.
      if (REFUNDED_REASONS.has(String(data?.reason || ""))) {
        releaseAfterRefund();
        setError(say("stalled", uiLocale));
        setPhase("locked");
        return;
      }
      fail(say("serverError", uiLocale));
      return;
    }

    const next = data as unknown as ReportDocument;
    applyDoc(next);
    if (next.status === "generating") {
      // 🔴 결제 없이 생성만 재개한다. 새로고침이 이중 결제가 되지 않는 지점이 여기다.
      await runWaves(next.reportId);
      return;
    }
    setPhase("reading");
  }, [applyDoc, fail, inputHash, locale, releaseAfterRefund, runWaves, uiLocale]);

  /** 최초 진입 — URL 의 reportId, 없으면 이 차트로 산 리포트가 있는지 본다. */
  useEffect(() => {
    if (!inputHash) return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("reportId") || "";
    const stored = fromUrl || "";
    reportIdRef.current = stored;
    void guarded(() => load(stored));
    // inputHash 가 정해진 뒤 한 번만 돈다. 이후 전이는 purchase/resume 이 만든다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputHash]);

  const purchase = useCallback(() => {
    if (!birth || !inputHash) return;
    void guarded(async () => {
      const requestId = stableRequestId(inputHash, locale);
      const gate = await ensurePaidAccess({
        featureKey: FEATURE_KEY,
        coinPrice: COIN_PRICE,
        amountKRW: AMOUNT_KRW,
        reason: say("lockedHeading", uiLocale),
        requestId,
      });
      if (!gate.ok) {
        if (gate.code === "PAYMENT_CANCELLED") return;
        if (gate.code === "LOGIN_REQUIRED" || gate.code === "AUTH_REQUIRED") {
          fail(say("loginRequired", uiLocale));
          return;
        }
        fail(gate.message || say("paymentFailed", uiLocale));
        return;
      }

      const { data } = await postPaidBody("/api/human-design-report/start", { birth, locale, requestId });
      if (!data?.ok) {
        fail(typeof data?.message === "string" && data.message ? data.message : say("serverError", uiLocale));
        return;
      }

      const reportId = String(data.reportId || "");
      // 🔴 무엇보다 먼저 적는다. 이 줄 뒤로는 무슨 일이 생겨도 재방문으로 복구된다.
      if (reportId) {
        writeStorage(REPORT_ID_STORAGE_KEY, reportId);
        reportIdRef.current = reportId;
        const url = new URL(window.location.href);
        url.searchParams.set("reportId", reportId);
        window.history.replaceState(null, "", url.toString());
      }
      if (Array.isArray(data.plan)) setPlanEntries(data.plan as ReportPlanEntry[]);

      if (data.reused === true) {
        applyDoc(data as unknown as ReportDocument);
        // 🔴 재열람이 곧 완성본은 아니다. /start 는 앞 세션이 중간에 끊긴 generating 문서도
        //    reused 로 돌려준다. 그때 reading 으로 보내면 빈 리포트를 그리고 사용자는
        //    결제하고도 아무것도 못 본다 — 남은 웨이브를 이어서 돌려야 한다.
        if (data.status === "generating") {
          await runWaves(reportId);
          return;
        }
        setPhase("reading");
        return;
      }
      await runWaves(reportId);
    });
  }, [applyDoc, birth, ensurePaidAccess, fail, guarded, inputHash, locale, runWaves, uiLocale]);

  const resume = useCallback(() => {
    const reportId = reportIdRef.current || readStorage(REPORT_ID_STORAGE_KEY);
    if (!reportId) return;
    void guarded(() => runWaves(reportId));
  }, [guarded, runWaves]);

  const completedKeys = new Set((doc?.sections || []).map((section) => section.key));

  return {
    phase,
    doc,
    planEntries,
    completedKeys,
    error,
    elapsedMs,
    busy: isPaying || busy,
    purchase,
    resume,
  };
}
