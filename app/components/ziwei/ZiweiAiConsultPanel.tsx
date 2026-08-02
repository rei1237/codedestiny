"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  심화 자미두수 안 인라인 전문가 상담  —  UI 패널
 * ───────────────────────────────────────────────────────────────────────────
 *  심화 명반(무료) 화면 안에서 "따로" 동작하는 회당 결제 LLM 상담.
 *  - 결제: featureKey `ziwei-ai-consultation` (300코인=30,000원), 회당 결제(forceDeduct).
 *  - 백엔드: /api/ziwei-ai/{prepare,generate} (worker/routes/ziwei-ai.js) 재사용.
 *  - 출생 정보는 상위 심화 섹션(AdvancedZiweiSectionV2)의 폼에서 birth prop으로 주입.
 *
 *  ▶ 접근 키워드: `ziwei-ai-consultation`, `ZiweiAiConsultPanel`
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Stars } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure, runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import { PriceBadge } from "@/app/components/PriceBadge";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  runBillingCoinGate,
  primePaymentEligibility,
} from "@/app/_lib/billing-client";
import type { ZiweiDeepBirthInput } from "./ZiweiDeepPdfPanel";

const FEATURE_KEY = "ziwei-ai-consultation";
const FEATURE_REASON = "자미두수 전문가 상담";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 3000;

type FocusArea = "overall" | "personality" | "career" | "money" | "love" | "relationship" | "health" | "custom";

const FOCUS_OPTIONS: Array<{ value: FocusArea; label: string }> = [
  { value: "overall", label: "전체 명반 해석" },
  { value: "personality", label: "타고난 성향" },
  { value: "career", label: "직업/사업운" },
  { value: "money", label: "재물운" },
  { value: "love", label: "연애/결혼운" },
  { value: "relationship", label: "인간관계" },
  { value: "health", label: "건강/멘탈" },
  { value: "custom", label: "현재 고민 상담" },
];
const FOCUS_TOPIC: Record<FocusArea, string> = FOCUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {} as Record<FocusArea, string>);

type Phase = "idle" | "checking" | "payment" | "reading" | "ready";

type ConsultationMessage = { role: "user" | "assistant"; content: string };
type Consultation = {
  id: string;
  topic?: string;
  summaryCards?: { lifePalace?: string; bodyPalace?: string; keywords?: string[] };
  messages?: ConsultationMessage[];
};
type ApiResult = {
  ok?: boolean;
  reason?: string;
  message?: string;
  accessToken?: string;
  accessType?: string;
  consultation?: Consultation;
  paymentPayload?: Record<string, unknown>;
  sessionId?: string;
  status?: string;
};

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  PAYMENT_CANCELLED: "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.",
  INVALID_INPUT: "자미두수 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.",
  BIRTH_TIME_MISSING: "자미두수는 출생시간이 중요해요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.",
  CUSTOM_QUESTION_REQUIRED: "별궁에 묻고 싶은 질문을 조금 더 구체적으로 적어 주세요.",
  SERVER_ERROR: "자미두수 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  NETWORK_ERROR: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
  TEMPORARY_UNAVAILABLE: "지금 접속이 잠시 불안정해요. 이용권은 그대로 보존되니, 잠시 후 다시 시도해 주세요.",
};

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `zwai-${crypto.randomUUID()}`;
  return `zwai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
function toText(value: unknown) { return String(value || "").trim(); }
function toNumber(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function postJson<T>(url: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ status: number; data: T }> {
  const response = await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    credentials: "include",
    body: JSON.stringify(body),
  }, { retryOn401: false });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data: data as T };
}

const ZIWEI_RESULT_POLL_BACKOFF_MS = [700, 3000, 5000, 8000];
const ZIWEI_RESULT_POLL_MAX_ATTEMPTS = 65; // 최악 ~8분(초기 240s + repair 240s) 커버, 첫 폴은 0.7s 프로브

// 서버가 202(생성 중)를 주면 /result를 폴링해 완료 결과로 수렴한다. 동시 제출·연결 순단에도
// 저장된 유료 결과를 회수하고, 향후 서버 백그라운드(waitUntil) 전환과도 호환된다.
async function pollZiweiConsultResult(sessionId: string): Promise<Consultation> {
  for (let attempt = 0; attempt < ZIWEI_RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, ZIWEI_RESULT_POLL_BACKOFF_MS[Math.min(attempt, ZIWEI_RESULT_POLL_BACKOFF_MS.length - 1)]));
    let response: Response;
    try {
      response = await authFetch(`/api/ziwei-ai/result?id=${encodeURIComponent(sessionId)}`, { method: "GET" }, { retryOn401: false });
    } catch {
      continue;
    }
    if (response.status === 202) continue;
    if (response.status === 429) throw new Error("요청이 잠시 몰렸어요. 잠시 후 다시 시도해 주세요.");
    const data = (await response.json().catch(() => ({}))) as ApiResult;
    if (!response.ok || !data.consultation) throw new Error(toText(data.message) || ERROR_TEXT.SERVER_ERROR);
    return data.consultation;
  }
  throw new Error("상담 생성이 평소보다 오래 걸리고 있어요. 잠시 후 다시 열어 주세요.");
}

function runtimePayload(result: unknown) {
  const record = asRecord(result);
  const payload = asRecord(record.payload);
  const data = asRecord(record.data);
  return Object.keys(payload).length ? payload : (Object.keys(data).length ? data : record);
}
function isPaymentGranted(result: unknown) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const status = toText(record.status || payload.status || payload.paymentStatus).toLowerCase();
  const denied = new Set(["error", "failed", "failure", "payment_required", "cancelled", "canceled"]);
  if (record.ok === false || payload.ok === false || denied.has(status)) return false;
  if (["granted", "paid", "success", "succeeded", "confirmed", "complete", "completed", "approved"].includes(status)) return true;
  return Boolean(
    record.transactionId || record.paymentId || record.purchaseId
    || payload.transactionId || payload.paymentId || payload.purchaseId
    || Object.keys(asRecord(payload.accessGrant)).length
    || Object.keys(asRecord(payload.consume)).length,
  );
}
function extractPayment(result: unknown, fallbackRequestId: string) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const payment = asRecord(payload.payment);
  const accessGrant = asRecord(payload.accessGrant);
  const consume = asRecord(payload.consume);
  const transactionId = toText(record.transactionId || payload.transactionId || accessGrant.transactionId || consume.transactionId);
  const purchaseId = toText(record.purchaseId || payload.purchaseId || accessGrant.purchaseId || consume.purchaseId);
  const ledgerId = toText(record.ledgerId || payload.ledgerId || accessGrant.ledgerId || consume.ledgerId);
  const paymentId = toText(
    record.paymentId || transactionId || purchaseId || payload.paymentId
    || payment.paymentId || payment.impUid || payment.merchantUid || accessGrant.paymentId || ledgerId || fallbackRequestId,
  );
  return {
    paymentId, transactionId, purchaseId, ledgerId, requestId: fallbackRequestId,
    billingEvidence: { ...payload, paymentId, transactionId, purchaseId, ledgerId, payment: { ...payment, paymentId, requestId: fallbackRequestId }, accessGrant, consume },
    payment: { ...payment, paymentId, requestId: fallbackRequestId }, accessGrant, consume,
  };
}
function buildBillingGateInput(paymentPayload: Record<string, unknown>, idempotencyKey: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const cost = toNumber(runtimeGate.cost ?? runtimeGate.coinPrice ?? paymentPayload.cost ?? paymentPayload.coinPrice, FEATURE_COST);
  const amountKRW = toNumber(runtimeGate.amountKRW ?? runtimeGate.amountKrw ?? paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? paymentPayload.paymentAmount, FEATURE_AMOUNT_KRW);
  return {
    categoryKey: toText(runtimeGate.categoryKey ?? paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey ?? paymentPayload.subFeatureKey) || FEATURE_KEY,
    featureKey: toText(runtimeGate.featureKey ?? paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason ?? paymentPayload.reason) || FEATURE_REASON,
    productId: toText(runtimeGate.productId ?? paymentPayload.productId) || FEATURE_KEY,
    productType: toText(runtimeGate.productType ?? paymentPayload.productType) || FEATURE_KEY,
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || FEATURE_KEY,
    requestId: idempotencyKey,
    idempotencyKey,
    cost,
    coinPrice: cost,
    amountKRW,
    amountKrw: amountKRW,
    paymentAmount: amountKRW,
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, FEATURE_MEMBERSHIP_CREDIT_COST),
  };
}
function mapError(data: ApiResult, status = 0) {
  const reason = String(data?.reason || "").toUpperCase();
  if (reason && ERROR_TEXT[reason]) return ERROR_TEXT[reason];
  if (status === 401) return ERROR_TEXT.LOGIN_REQUIRED;
  if (status === 402) return ERROR_TEXT.PAYMENT_VERIFY_FAILED;
  return data?.message || ERROR_TEXT.SERVER_ERROR;
}

// LLM 결과는 구조화 JSON(sections) 또는 평문으로 온다. 둘 다 읽기 좋은 섹션으로 평탄화.
function parseStructuredSections(content: string): Array<{ title: string; body: string }> | null {
  const normalized = content.replace(/\r\n/g, "\n").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(normalized.slice(start, end + 1)) as { sections?: Record<string, { title?: string; body?: string }> };
    const sections = parsed?.sections;
    if (!sections || typeof sections !== "object") return null;
    const out = Object.values(sections)
      .map((section) => ({ title: toText(section?.title), body: toText(section?.body) }))
      .filter((section) => section.body);
    return out.length ? out : null;
  } catch {
    return null;
  }
}
function readableSections(content: string): Array<{ title: string; body: string }> {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  return parseStructuredSections(normalized) || [{ title: "", body: normalized }];
}
function splitParagraphs(body: string): string[] {
  const byBlank = body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  return body.split(/\n/).map((part) => part.trim()).filter(Boolean);
}

interface Props { birth: ZiweiDeepBirthInput; disabled?: boolean }

export default function ZiweiAiConsultPanel({ birth, disabled = false }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [focusArea, setFocusArea] = useState<FocusArea>("overall");
  const [question, setQuestion] = useState("");
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const busyRef = useRef(false);
  const idempotencyRef = useRef("");

  const busy = phase === "checking" || phase === "payment" || phase === "reading";

  const buildPayload = (idempotencyKey: string) => {
    const topic = FOCUS_TOPIC[focusArea];
    const trimmedQuestion = question.trim();
    return {
      serviceType: FEATURE_KEY,
      consultationType: "ziwei",
      userName: birth.name.trim() || undefined,
      gender: birth.gender,
      birthDate: birth.birthDate,
      birthTime: birth.birthTimeUnknown ? "" : birth.birthTime,
      birthTimeUnknown: birth.birthTimeUnknown,
      calendarType: birth.calendarType,
      isLeapMonth: birth.calendarType === "lunar" ? birth.isLeapMonth : false,
      focusArea,
      question: trimmedQuestion,
      locale: "ko",
      requestId: idempotencyKey,
      idempotencyKey,
      birthInfo: {
        name: birth.name.trim(),
        gender: birth.gender,
        birthDate: birth.birthDate,
        birthTime: birth.birthTimeUnknown ? "" : birth.birthTime,
        birthTimeUnknown: birth.birthTimeUnknown,
        calendarType: birth.calendarType,
        isLeapMonth: birth.calendarType === "lunar" ? birth.isLeapMonth : false,
      },
      topic,
      userQuestion: trimmedQuestion,
    };
  };

  const assistantSections = useMemo(() => {
    const messages = consultation?.messages || [];
    return messages
      .filter((message) => message.role === "assistant")
      .flatMap((message) => readableSections(message.content));
  }, [consultation]);

  async function generate(idempotencyKey: string, payload: Record<string, unknown>, extra: Record<string, unknown>) {
    setPhase("reading");
    const { status, data } = await postJson<ApiResult>("/api/ziwei-ai/generate", { ...payload, ...extra, idempotencyKey }, idempotencyKey);
    if (data.ok && data.consultation) {
      setConsultation(data.consultation);
      setPhase("ready");
      return;
    }
    // 생성이 진행 중(202: 동시 제출·재시도, 향후 서버 백그라운드 전환)이면 결과를 버리지 말고 /result 폴링으로 수렴한다.
    if (status === 202 && data.ok && data.sessionId) {
      const consultation = await pollZiweiConsultResult(data.sessionId);
      setConsultation(consultation);
      setPhase("ready");
      return;
    }
    throw new Error(mapError(data, status));
  }

  function validate(): string {
    if (!birth.birthDate || !birth.gender) return ERROR_TEXT.INVALID_INPUT;
    if (!birth.birthTimeUnknown && !birth.birthTime) return ERROR_TEXT.BIRTH_TIME_MISSING;
    if (focusArea === "custom" && question.trim().length < 2) return ERROR_TEXT.CUSTOM_QUESTION_REQUIRED;
    return "";
  }

  async function handleGenerate() {
    if (busyRef.current || disabled) return;
    const validationMessage = validate();
    if (validationMessage) { setError(validationMessage); return; }
    busyRef.current = true;
    const idempotencyKey = idempotencyRef.current || createIdempotencyKey();
    idempotencyRef.current = idempotencyKey;
    setError("");
    setConsultation(null);
    setPhase("checking");
    let gateStarted = false;
    try {
      const payload = buildPayload(idempotencyKey);
      beginPaidFeatureGateCheck({ featureKey: FEATURE_KEY, requestId: idempotencyKey, title: "이용권 확인", reason: FEATURE_REASON, paymentMode: "MEMBERSHIP_PASS" });
      // 이용권 판정(unlock-status)을 아래 prepare 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
      void primePaymentEligibility(buildBillingGateInput({}, idempotencyKey));
      gateStarted = true;
      // 이용권 확인 앞단의 일시적 DB 장애(503 DB_DEGRADED 등)는 재시도로 흡수한다 — 하드 "이용권 확인 실패"로 굳지 않게.
      const { status, data } = await runAccessCheckWithTransientRetry(
        () => postJson<ApiResult>("/api/ziwei-ai/prepare", payload, idempotencyKey),
        { onRetry: () => setError("") },
      );
      if (data.ok) {
        completePaidFeatureGateCheck({ featureKey: FEATURE_KEY, requestId: idempotencyKey, title: "이용권 확인 완료", reason: FEATURE_REASON, paymentMode: "MEMBERSHIP_PASS", message: "별궁의 흐름을 읽고 있습니다." });
        await generate(idempotencyKey, payload, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      if (data.reason === "LOGIN_REQUIRED" || status === 401) throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
      if (data.reason === "INVALID_INPUT") throw new Error(mapError(data, status));
      // 재시도를 소진하고도 일시적 장애가 지속되면 과금 없이 소프트 종료(이용권 결함으로 오인하지 않게).
      if (isRetriableResultPollFailure(status, data)) throw new Error(ERROR_TEXT.TEMPORARY_UNAVAILABLE);
      if (data.reason !== "PAYMENT_REQUIRED") throw new Error(mapError(data, status));

      setPhase("payment");
      const gate = await runBillingCoinGate(buildBillingGateInput(asRecord(data.paymentPayload), idempotencyKey));
      if (!isPaymentGranted(gate)) {
        const code = String((gate as { error?: { code?: string }; status?: number })?.error?.code || "").toUpperCase();
        if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
        if (code === "PAYMENT_CANCELLED") throw new Error(ERROR_TEXT.PAYMENT_CANCELLED);
        throw new Error(ERROR_TEXT.PAYMENT_VERIFY_FAILED);
      }
      await generate(idempotencyKey, payload, extractPayment(gate, idempotencyKey));
    } catch (caught) {
      const message = caught instanceof TypeError ? ERROR_TEXT.NETWORK_ERROR : caught instanceof Error ? caught.message : ERROR_TEXT.SERVER_ERROR;
      const isTransient = message === ERROR_TEXT.TEMPORARY_UNAVAILABLE || message === ERROR_TEXT.NETWORK_ERROR;
      setError(message);
      if (gateStarted) {
        failPaidFeatureGateCheck({ featureKey: FEATURE_KEY, requestId: idempotencyKey, title: isTransient ? "잠시 후 다시 시도" : "이용권 확인 실패", reason: FEATURE_REASON, paymentMode: "MEMBERSHIP_PASS", message, cancelled: message === ERROR_TEXT.PAYMENT_CANCELLED });
      }
      setPhase("idle");
      idempotencyRef.current = "";
    } finally { busyRef.current = false; }
  }

  const summaryKeywords = consultation?.summaryCards?.keywords || [];

  return (
    <section className="font-premium relative overflow-hidden rounded-[1.6rem] border border-violet-300/25 bg-gradient-to-br from-[#171033]/85 via-[#0c1230]/85 to-[#101a34]/85 p-5 text-slate-100 md:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_16%_14%,rgba(167,139,250,.16),transparent_44%),radial-gradient(circle_at_84%_82%,rgba(125,211,252,.13),transparent_46%)]" aria-hidden="true" />
      <div className="relative z-10">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-violet-100/80">ZIWEI 전문가 상담 · 회당 결제</p>
        <h3 className="font-display mt-2 text-xl font-black text-white md:text-2xl">🔮 별궁 전문가 상담</h3>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200/85">
          명반은 무료로 열람하고, 지금 가장 궁금한 질문은 <b className="text-violet-100">전문가 상담</b>으로 따로 풀어보세요. 명궁·신궁·12궁과 사화의 흐름을 질문에 맞춰 상담해 드립니다.
        </p>

        {phase !== "ready" && (
          <div className="mt-5 grid gap-4">
            <div className="flex flex-wrap gap-2">
              {FOCUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFocusArea(option.value)}
                  disabled={busy || disabled}
                  className={`rounded-full border px-3.5 py-2 text-xs font-bold transition disabled:opacity-60 ${
                    focusArea === option.value
                      ? "border-violet-200/60 bg-violet-200/20 text-violet-50"
                      : "border-white/12 bg-white/5 text-slate-200 hover:border-violet-200/40"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={busy || disabled}
              rows={3}
              placeholder="별궁에 묻고 싶은 질문을 적어 주세요. (선택 · ‘현재 고민 상담’은 필수)"
              className="w-full resize-none rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm leading-7 text-slate-100 placeholder:text-slate-400/70 focus:border-violet-200/50 focus:outline-none"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={busy || disabled}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-200 via-fuchsia-100 to-sky-200 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_14px_30px_-10px_rgba(167,139,250,.5)] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {phase === "checking" ? "이용권 확인 중..." : phase === "payment" ? "결제 진행 중..." : phase === "reading" ? "상담문 생성 중..." : "별궁 전문가 상담 받기 (30,000원)"}
              </button>
              <PriceBadge featureKey={FEATURE_KEY} fallbackCoins={FEATURE_COST} prefix="상담 이용 가격 " />
            </div>
            <p className="text-xs text-slate-300/70">회당 결제 · 이용권/월정석 보유 시 무차감 진행</p>
          </div>
        )}

        {phase === "reading" && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet-300/25 bg-violet-400/10 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-violet-200" />
            <span className="text-sm text-violet-100">명궁과 신궁의 흐름을 맞춰보는 중...</span>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
        )}

        {phase === "ready" && consultation && (
          <div className="mt-5 grid gap-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-200/25 bg-violet-200/10 px-4 py-3">
              <Stars className="h-4 w-4 text-violet-100" />
              <span className="text-sm font-bold text-white">{birth.name || "당신"}님의 별궁 상담</span>
              {summaryKeywords.slice(0, 4).map((keyword) => (
                <span key={keyword} className="rounded-full border border-violet-200/30 bg-white/5 px-2.5 py-1 text-xs text-violet-50">{keyword}</span>
              ))}
            </div>

            {assistantSections.map((section, sectionIndex) => (
              <article key={sectionIndex} className="rounded-2xl border border-white/10 bg-[#0b1020] p-6">
                {section.title && <h4 className="font-display text-lg font-black text-violet-100">{section.title}</h4>}
                <div className={section.title ? "mt-3 grid gap-3" : "grid gap-3"}>
                  {splitParagraphs(section.body).map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} className="whitespace-pre-wrap text-[15px] leading-8 text-slate-100/95">{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}

            <button
              type="button"
              onClick={() => { setPhase("idle"); setConsultation(null); idempotencyRef.current = ""; }}
              className="justify-self-start rounded-2xl border border-white/12 bg-white/8 px-4 py-2.5 text-sm font-semibold text-slate-100"
            >
              다른 질문으로 다시 상담하기
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
