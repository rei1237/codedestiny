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
import { useCallback, useRef, useState } from "react";
import { useCoinGate } from "@/app/hooks/useCoinGate";
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
  /** 저장본 재열람·공유 링크에 쓰는 서버 발급 id. 웨이브 A 응답에서 온다. */
  reportId: string;
  sections: Partial<Record<ServerSectionKey, ReportSectionPayload>>;
  systemConfidence: SystemConfidenceRow[];
  error: string | null;
  /** 웨이브 B 가 비어서 되돌아왔을 때만 true — 재시도로 채울 수 있다. */
  canRetryWaveB: boolean;
}

const INITIAL: ReportState = { phase: "locked", reportId: "", sections: {}, systemConfidence: [], error: null, canRetryWaveB: false };

function sessionKeyFor(field: DirectionField, question: string): string {
  let h = 5381;
  const src = `${field.seed}|${question}`;
  for (let i = 0; i < src.length; i += 1) h = ((h * 33) ^ src.charCodeAt(i)) >>> 0;
  return `cd-compass-report:${(h >>> 0).toString(36)}`;
}

function readCache(key: string): ReportState | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReportState;
    return parsed?.sections ? { ...parsed, error: null } : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, state: ReportState) {
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* 저장 실패는 무시 — 화면에는 이미 떠 있다 */
  }
}

async function postJson(path: string, body: unknown, timeoutMs: number): Promise<{ status: number; data: Record<string, unknown> }> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(path, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json", [AI_LOCALE_HEADER]: toAiLocale(detectLocale()) },
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

export function useCompassReport(input: CompassInput | null, field: DirectionField | null, question: string) {
  const copy = useDestinyCompassCopy();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [state, setState] = useState<ReportState>(INITIAL);
  const inFlight = useRef(false);
  const continuationRef = useRef<string>("");
  const payloadRef = useRef<{ field: unknown; evidencePack: unknown; idempotencyKey: string } | null>(null);

  /** 세션 캐시 복원 — 같은 탭에서 결과 화면을 오가도 다시 결제하지 않는다. */
  const restore = useCallback(() => {
    if (!field) return;
    const cached = readCache(sessionKeyFor(field, question));
    if (cached && Object.keys(cached.sections).length) setState(cached);
  }, [field, question]);

  const runWaveB = useCallback(async (base: ReportState) => {
    const payload = payloadRef.current;
    if (!payload || !continuationRef.current) return;
    setState({ ...base, phase: "waveB", canRetryWaveB: false });
    try {
      const { data } = await postJson(
        "/api/destiny-compass-ai/report/continue",
        { ...payload, continuationToken: continuationRef.current },
        WAVE_B_TIMEOUT_MS,
      );
      const sections = mergeSections(base.sections, data?.sections);
      const grew = Object.keys(sections).length > Object.keys(base.sections).length;
      const next: ReportState = {
        ...base,
        sections,
        phase: grew ? "done" : "waveB",
        // 이어받기는 무과금이라 실패해도 503 이 아니다. 비었으면 재시도 버튼만 켠다.
        canRetryWaveB: !grew,
        error: null,
      };
      setState(next);
      if (field) writeCache(sessionKeyFor(field, question), next);
    } catch {
      setState({ ...base, phase: "waveB", canRetryWaveB: true });
    }
  }, [field, question]);

  const unlock = useCallback(async () => {
    if (!input || !field || inFlight.current || isPaying) return;
    inFlight.current = true;
    setState((prev) => ({ ...prev, phase: "paying", error: null }));

    try {
      const gate = await ensurePaidAccess({
        featureKey: FEATURE_KEY,
        coinPrice: COIN_PRICE,
        amountKRW: AMOUNT_KRW,
        reason: copy.deepReportGateReason,
        requestId: makeGateRequestId(FEATURE_KEY),
      });

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

      const idempotencyKey = makeGateRequestId(FEATURE_KEY);
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
        transactionId: gate.transactionId,
        purchaseId: gate.transactionId,
        requestId: idempotencyKey,
      };
      payloadRef.current = { field: payload.field, evidencePack: payload.evidencePack, idempotencyKey };

      setState((prev) => ({ ...prev, phase: "waveA" }));
      const { status, data } = await postJson("/api/destiny-compass-ai/report", payload, WAVE_A_TIMEOUT_MS);

      if (status !== 200 || data?.ok !== true) {
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
        phase: "waveB",
        reportId: typeof data.reportId === "string" ? data.reportId : "",
        sections: mergeSections({}, data.sections),
        systemConfidence: Array.isArray(data.systemConfidence) ? (data.systemConfidence as SystemConfidenceRow[]) : [],
        error: null,
        canRetryWaveB: false,
      };
      continuationRef.current = String((data.continuation as { token?: string })?.token || "");
      setState(waveA);
      writeCache(sessionKeyFor(field, question), waveA);

      // 웨이브 A 는 이미 화면에 있다. B 는 그 위에서 이어 채운다.
      await runWaveB(waveA);
    } catch {
      setState((prev) => ({ ...prev, phase: "failed", error: copy.connectionLostMessage }));
    } finally {
      inFlight.current = false;
    }
  }, [input, field, question, isPaying, ensurePaidAccess, runWaveB, copy]);

  const retryWaveB = useCallback(() => {
    if (inFlight.current) return;
    void runWaveB({ ...state, phase: "waveB" });
  }, [runWaveB, state]);

  return { ...state, isPaying, unlock, retryWaveB, restore };
}
