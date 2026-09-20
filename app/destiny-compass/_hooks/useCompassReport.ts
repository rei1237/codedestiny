"use client";
/**
 * 심층 리포트 호출 — 결제 게이트 → 웨이브 A(체계별 5) → 웨이브 B(종합 5).
 *
 * 스트리밍(SSE)도 202 폴링도 쓰지 않는다. 이 레포는 폴링을 커밋 9850c890 에서 폐기했고
 * (Workers 요청 간 I/O 격리로 결과가 고착), 워커는 요청 안에서 동기로 생성한다.
 * 체감 속도는 "웨이브 A 5섹션이 먼저 도착해 읽히는 것"으로 만든다 — B 는 그 뒤에서 채워진다.
 *
 * 결제는 공용 게이트(useCoinGate.ensurePaidAccess)만 쓴다.
 * 이용권 선검사 → 미커버 시 결제창(단건/월정석 동등) → PortOne 순서는 그 훅이 책임진다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocaleRequestScope, type LocaleRequestScope } from "@/app/hooks/useLocaleRequestScope";
import { authFetch } from "@/app/_lib/auth-client";
import { getAuthState } from "@/app/_lib/auth-store";
import { usePaidDeliveryScope } from "@/app/hooks/usePaidDeliveryScope";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import type { PaidResumeArgs, PaidResumeDescriptor, PaidResumeGrant } from "@/app/hooks/usePaidResume";
import { AI_LOCALE_HEADER, toAiLocale } from "@/lib/i18n/ai-locale";
import { detectLocale } from "@/lib/i18n/dictionary";
import type { CompassInput, DirectionField } from "../_engine/types";
import { collectDeepEvidence } from "../_engine/evidence/collectDeepEvidence";
import { makeGateRequestId, redirectToLoginOnAuthRequired } from "../_components/paidGate";
import type { EvidenceGround } from "../_components/EvidenceCard";
import type { ServerSectionKey } from "../_components/reportSections";
import { useDestinyCompassCopy } from "../_lib/copy";

const FEATURE_KEY = "destiny-compass-deep-report";
/** 워커 정본(paid-feature-registry.js)과 같은 값이어야 한다 — 불일치는 fail-closed 로 차단된다. */
const COIN_PRICE = 100;
const AMOUNT_KRW = 10000;

/** 웨이브 A 는 인증·결제 왕복이 앞에 붙는다. 서버 예산(58s/72s)보다 넉넉히. */
const WAVE_A_TIMEOUT_MS = 95000;
const WAVE_B_TIMEOUT_MS = 95000;

export interface ReportSectionPayload {
  key: ServerSectionKey;
  order: number;
  title: string;
  system: string | null;
  body: string;
  chars: number;
  status: "ok" | "degraded" | "failed";
  grounds: EvidenceGround[];
}

export interface SystemConfidenceRow {
  system: string;
  label: string;
  stars: number;
  dataQuality: number;
  weightPct: number;
}

export type ReportPhase = "locked" | "paying" | "waveA" | "waveB" | "done" | "failed";

interface ReportState {
  phase: ReportPhase;
  locale?: string;
  /** 저장본 재열람·공유 링크에 쓰는 서버 발급 id. 웨이브 A 응답에서 온다. */
  reportId: string;
  sections: Partial<Record<ServerSectionKey, ReportSectionPayload>>;
  systemConfidence: SystemConfidenceRow[];
  error: string | null;
  /** 웨이브 B 가 비어서 되돌아왔을 때만 true — 재시도로 채울 수 있다. */
  canRetryWaveB: boolean;
}

const INITIAL: ReportState = { phase: "locked", reportId: "", sections: {}, systemConfidence: [], error: null, canRetryWaveB: false };

function sessionKeyFor(field: DirectionField, question: string, locale: string): string {
  let h = 5381;
  const src = `${field.seed}|${question}`;
  for (let i = 0; i < src.length; i += 1) h = ((h * 33) ^ src.charCodeAt(i)) >>> 0;
  const user = getAuthState().user;
  return `cd-compass-report:${String(user?.id || user?.userId || user?._id || user?.uid || "guest")}:${(h >>> 0).toString(36)}:${locale}`;
}

function readCache(key: string): ReportState | null {
  try {
    // 과거 캐시의 언어를 추측하지 않는다. 기존 보관본 복원에서만 원문 그대로 읽는다.
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReportState;
    return parsed?.sections ? { ...parsed, error: null } : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, state: ReportState) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* 저장 실패는 무시 — 화면에는 이미 떠 있다 */
  }
}

async function postJson(path: string, body: unknown, timeoutMs: number, locale: string): Promise<{ status: number; data: Record<string, unknown> }> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await authFetch(path, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json", [AI_LOCALE_HEADER]: locale },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      /* 본문 없음 */
    }
    return { status: res.status, data };
  } finally {
    window.clearTimeout(timer);
  }
}

function mergeSections(
  current: Partial<Record<ServerSectionKey, ReportSectionPayload>>,
  incoming: unknown,
): Partial<Record<ServerSectionKey, ReportSectionPayload>> {
  const next = { ...current };
  for (const raw of Array.isArray(incoming) ? incoming : []) {
    const section = raw as ReportSectionPayload;
    if (section?.key && typeof section.body === "string" && section.body.trim()) next[section.key] = section;
  }
  return next;
}

/**
 * 결제 복귀 재개 배선. 서술자 생성기와 복귀 증빙을 CompassApp 이 내려 준다 —
 * 이 훅은 결과 단계에서만 마운트돼서 리다이렉트 복귀 시점에는 아직 없기 때문이다.
 */
export interface CompassReportResumeWiring {
  buildResume?: (args?: PaidResumeArgs) => PaidResumeDescriptor;
  grant?: PaidResumeGrant | null;
  onDelivery?: (completed: boolean) => void;
}

/** 인페이지 게이트의 transactionId 와 같은 자리에서 뽑는다(useCoinGate: consume.transactionId || consume._id). */
function resumeTransactionId(grant: PaidResumeGrant): string {
  const payload = (grant.payload || {}) as Record<string, unknown>;
  const consume = (payload.consume || {}) as Record<string, unknown>;
  return String(consume.transactionId || consume._id || grant.merchantUid || grant.requestId || "");
}

export function useCompassReport(
  input: CompassInput | null,
  field: DirectionField | null,
  question: string,
  resumeWiring?: CompassReportResumeWiring,
  savedReportId = "",
) {
  const copy = useDestinyCompassCopy();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [state, setState] = useState<ReportState>(INITIAL);
  const inFlight = useRef(false);
  const continuationRef = useRef<string>("");
  const payloadRef = useRef<Record<string, unknown> | null>(null);
  const reportIdRef = useRef("");
  const [accountEpoch, setAccountEpoch] = useState(0);
  const captureOwner = usePaidDeliveryScope(() => {
    inFlight.current = false; payloadRef.current = null; continuationRef.current = ""; reportIdRef.current = ""; resumedRef.current = false; setState(INITIAL); setAccountEpoch(value => value + 1);
  });
  const resumedRef = useRef(false);
  const captureLocaleScope = useLocaleRequestScope(() => {
    const locale = toAiLocale(detectLocale());
    const cached = field ? readCache(sessionKeyFor(field, question, locale)) : null;
    setState(cached || INITIAL);
  });

  /** 세션 캐시 복원 — 같은 탭에서 결과 화면을 오가도 다시 결제하지 않는다. */
  const restore = useCallback(() => {
    if (!field) return;
    const cached = readCache(sessionKeyFor(field, question, toAiLocale(detectLocale())));
    if (cached && Object.keys(cached.sections).length) setState(cached);
  }, [field, question]);

  const runWaveB = useCallback(async (base: ReportState, scope: LocaleRequestScope = captureLocaleScope()) => {
    const isCurrent = captureOwner();
    let current = base;
    reportIdRef.current = base.reportId || reportIdRef.current;
    for (let wave = 0; wave < 24; wave++) {
      if (!isCurrent() || !scope.isCurrent()) return;
      if (document.hidden || !navigator.onLine) return;
      setState({ ...current, phase: "waveB", canRetryWaveB: false });
      try {
        const { status, data } = await postJson(
          reportIdRef.current ? "/api/destiny-compass-ai/report/continue" : "/api/destiny-compass-ai/report",
          reportIdRef.current ? { reportId: reportIdRef.current } : payloadRef.current,
          WAVE_B_TIMEOUT_MS, base.locale || scope.locale,
        );
        if (!isCurrent() || !scope.isCurrent()) return;
        if (typeof data.resultId === "string" && data.resultId) reportIdRef.current = data.resultId;
        if (status === 404 && payloadRef.current) { reportIdRef.current = ""; continue; }
        if (status === 409 && data.reason === "GENERATION_IN_PROGRESS" || status >= 500 && data.retryable === true) {
          await new Promise(resolve => window.setTimeout(resolve, 4000)); continue;
        }
        if (!data.ok && data.refunded === true) {
          if (field) { try { const key = sessionKeyFor(field, question, base.locale || scope.locale); localStorage.removeItem(key); localStorage.removeItem(key + ":request"); } catch { /* confirmed refund only */ } }
          payloadRef.current = null; reportIdRef.current = "";
          setState({ ...INITIAL, phase: "failed", error: copy.reportFailedRefundedMessage });
          resumeWiring?.onDelivery?.(false); return;
        }
        if (!data.ok) throw Error(typeof data.message === "string" ? data.message : copy.reportFailedMessage);
        const complete = data.stage === "complete";
        current = { ...current, locale: typeof data.locale === "string" ? data.locale : current.locale, reportId: String(data.reportId || reportIdRef.current),
          sections: mergeSections(current.sections, data.sections),
          systemConfidence: Array.isArray(data.systemConfidence) ? data.systemConfidence as SystemConfidenceRow[] : current.systemConfidence,
          phase: complete ? "done" : "waveB", canRetryWaveB: !complete, error: null };
        reportIdRef.current = current.reportId;
        const url = new URL(window.location.href); url.searchParams.set("reportId", current.reportId); window.history.replaceState(null, "", url.toString());
        setState(current);
        if (field) writeCache(sessionKeyFor(field, question, base.locale || scope.locale), current);
        if (complete) { resumeWiring?.onDelivery?.(true); return; }
        if (data.retryable === false) break;
      } catch (error) {
        if (!isCurrent() || !scope.isCurrent()) return;
        current = { ...current, error: error instanceof Error ? error.message : copy.connectionLostMessage };
        break;
      }
    }
    if (!isCurrent() || !scope.isCurrent()) return;
    const retry: ReportState = { ...current, reportId: reportIdRef.current, phase: "waveB", canRetryWaveB: true };
    setState(retry);
    if (field) writeCache(sessionKeyFor(field, question, base.locale || scope.locale), retry);
    resumeWiring?.onDelivery?.(false);
  }, [captureOwner, field, question, captureLocaleScope, copy, resumeWiring]);

  /**
   * 게이트 없는 생성부 — 인페이지 결제 직후와 결제 복귀 재개가 같은 본문을 쓴다.
   * 🔴 여기서 다시 ensurePaidAccess 를 부르지 않는다(결제는 이미 끝났다).
   * 호출부가 inFlight 락을 잡고 들어온다.
   */
  const generate = useCallback(async (transactionId: string, originalRequestId: string) => {
    const isCurrent = captureOwner();
    if (!input || !field) return;
    const scope = captureLocaleScope();
    try {
      const idempotencyKey = originalRequestId;
      const payload = {
        idempotencyKey,
        question,
        emotion: input.emotion,
        field: {
          seed: field.seed,
          confidence: field.confidence,
          sources: field.sources,
          directions: field.directions.map((d) => ({ key: d.key, score: d.score, band: d.band })),
          primary: { key: field.primary.key, score: field.primary.score, band: field.primary.band },
          strongArea: { key: field.strongArea.key },
          blockedArea: { key: field.blockedArea.key },
          timeline: field.timeline,
        },
        evidencePack: collectDeepEvidence(input, field),
        transactionId,
        purchaseId: transactionId,
        requestId: idempotencyKey,
      };
      payloadRef.current = payload;
      try { localStorage.setItem(sessionKeyFor(field, question, scope.locale) + ":request", JSON.stringify(payload)); } catch { /* server result is the recovery source */ }

      setState((prev) => ({ ...prev, phase: "waveA" }));
      const { status, data } = await postJson("/api/destiny-compass-ai/report", payload, WAVE_A_TIMEOUT_MS, scope.locale);

      if (!isCurrent() || !scope.isCurrent()) return;
      if (![200, 202].includes(status) || data?.ok !== true) {
        if (typeof data.resultId === "string") reportIdRef.current = data.resultId;
        if (data.retryable === true) { await runWaveB({ ...INITIAL, locale: scope.locale, reportId: reportIdRef.current }, scope); return; }
        if (!scope.isCurrent()) return;
        const refunded = data?.refunded === true;
        setState((prev) => ({
          ...prev,
          phase: "failed",
          error: typeof data?.message === "string" && data.message
            ? data.message
            : refunded
              ? copy.reportFailedRefundedMessage
              : copy.reportFailedMessage,
        }));
        return;
      }

      const waveA: ReportState = {
        locale: scope.locale,
        phase: data.stage === "complete" ? "done" : "waveB",
        reportId: typeof data.reportId === "string" ? data.reportId : "",
        sections: mergeSections({}, data.sections),
        systemConfidence: Array.isArray(data.systemConfidence) ? (data.systemConfidence as SystemConfidenceRow[]) : [],
        error: null,
        canRetryWaveB: false,
      };
      reportIdRef.current = waveA.reportId;
      const url = new URL(window.location.href); url.searchParams.set("reportId", waveA.reportId); window.history.replaceState(null, "", url.toString());
      continuationRef.current = String((data.continuation as { token?: string })?.token || "");
      if (scope.isCurrent()) setState(waveA);
      writeCache(sessionKeyFor(field, question, scope.locale), { ...waveA, canRetryWaveB: true });

      // 웨이브 A 는 이미 화면에 있다. B 는 그 위에서 이어 채운다.
      if (data.stage === "complete") { resumeWiring?.onDelivery?.(true); return; }
      await runWaveB(waveA, scope);
    } catch {
      if (isCurrent() && scope.isCurrent()) {
        await runWaveB({ ...INITIAL, locale: scope.locale, reportId: reportIdRef.current }, scope);
      }
    }
  }, [captureOwner, input, field, question, runWaveB, copy, captureLocaleScope, resumeWiring]);

  const unlock = useCallback(async () => {
    if (!input || !field || inFlight.current || isPaying) return;
    // 전환 중 완료된 캐시도 명시적 재열람에서는 복원하고 결제를 다시 열지 않는다.
    const cached = readCache(sessionKeyFor(field, question, toAiLocale(detectLocale())));
    if (cached?.phase === "done") { setState(cached); return; }
    const locale = toAiLocale(detectLocale());
    try { payloadRef.current = JSON.parse(localStorage.getItem(sessionKeyFor(field, question, locale) + ":request") || "null"); } catch { /* server recovery remains available */ }
    if (cached?.reportId || payloadRef.current) {
      inFlight.current = true;
      const isCurrent = captureOwner();
      try { await runWaveB(cached || { ...INITIAL, locale }); } finally { if (isCurrent()) inFlight.current = false; }
      return;
    }
    inFlight.current = true;
    setState((prev) => ({ ...prev, phase: "paying", error: null }));

    const isCurrent = captureOwner();
    const originalRequestId = makeGateRequestId(FEATURE_KEY);
    try {
      const gate = await ensurePaidAccess({
        featureKey: FEATURE_KEY,
        coinPrice: COIN_PRICE,
        amountKRW: AMOUNT_KRW,
        reason: copy.deepReportGateReason,
        requestId: originalRequestId,
        resume: resumeWiring?.buildResume?.({ requestId: originalRequestId }),
      });

      if (!isCurrent()) return;
      if (!gate.ok) {
        if (redirectToLoginOnAuthRequired(gate.code)) {
          setState((prev) => ({ ...prev, phase: "locked", error: copy.loginRedirectMessage }));
          return;
        }
        setState((prev) => ({
          ...prev,
          phase: "locked",
          error: gate.code === "PAYMENT_CANCELLED" ? null : gate.message || copy.paymentIncompleteMessage,
        }));
        return;
      }

      await generate(gate.transactionId, originalRequestId);
    } finally {
      if (isCurrent()) inFlight.current = false;
    }
  }, [captureOwner, input, field, question, isPaying, ensurePaidAccess, generate, runWaveB, copy, resumeWiring]);

  /**
   * 결제 복귀 재개 — CompassApp 이 세션을 되살리고 증빙을 내려 주면 게이트를 건너뛰고 생성만 돈다.
   * 🔴 한 번만 돈다(resumedRef) — 리렌더마다 다시 돌면 같은 결제로 리포트를 여러 번 만든다.
   */
  const resumeGrant = resumeWiring?.grant || null;
  useEffect(() => {
    if (!resumeGrant || !input || !field || resumedRef.current || inFlight.current) return;
    resumedRef.current = true;
    inFlight.current = true;
    void generate(resumeTransactionId(resumeGrant), resumeGrant.requestId || resumeTransactionId(resumeGrant)).finally(() => {
      inFlight.current = false;
    });
  }, [resumeGrant, input, field, generate]);

  useEffect(() => {
    if (!field && !savedReportId) return;
    const isCurrent = captureOwner();
    const recover = async () => {
      if (inFlight.current || document.hidden || !navigator.onLine) return;
      inFlight.current = true;
      try {
        const locale = toAiLocale(detectLocale()), key = field ? sessionKeyFor(field, question, locale) : "";
        const cached = readCache(key);
        try { payloadRef.current = JSON.parse(localStorage.getItem(key + ":request") || "null"); } catch { /* storage may be unavailable */ }
        let reportId = savedReportId || cached?.reportId || reportIdRef.current;
        if (!reportId) {
          const response = await authFetch("/api/destiny-compass-ai/result?pending=1", { method: "GET" });
          const data = await response.json();
          if (!isCurrent()) return;
          reportId = data.reports?.find((row: { question?: string; status?: string }) => row.question === question && ["generating", "partial", "delivery_pending"].includes(String(row.status)))?.reportId || "";
        }
        if (reportId) {
          const response = await authFetch(`/api/destiny-compass-ai/result?id=${encodeURIComponent(reportId)}`, { method: "GET" });
          const data = await response.json();
          if (!isCurrent()) return;
          if (!data.ok) { setState({ ...INITIAL, reportId, phase: "failed", error: typeof data.message === "string" ? data.message : copy.reportFailedMessage, canRetryWaveB: true }); reportIdRef.current = reportId; return; }
          const restored: ReportState = { ...INITIAL, locale: typeof data.locale === "string" ? data.locale : locale, reportId, sections: mergeSections({}, data.sections), systemConfidence: data.systemConfidence || [], phase: data.stage === "complete" ? "done" : "waveB" };
          setState(restored); reportIdRef.current = reportId;
          if (data.stage !== "complete") await runWaveB(restored);
        } else if (payloadRef.current) await runWaveB({ ...INITIAL, locale });
      } catch { /* same paid recovery remains available */ }
      finally { if (isCurrent()) inFlight.current = false; }
    };
    void recover();
    window.addEventListener("online", recover); document.addEventListener("visibilitychange", recover);
    return () => { inFlight.current = false; window.removeEventListener("online", recover); document.removeEventListener("visibilitychange", recover); };
    // Resume the stored request on entry or account change, not each progress render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, question, accountEpoch, savedReportId]);

  const retryWaveB = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    void runWaveB({ ...state, phase: "waveB" }).finally(() => { inFlight.current = false; });
  }, [runWaveB, state]);

  return { ...state, isPaying, unlock, retryWaveB, restore };
}
