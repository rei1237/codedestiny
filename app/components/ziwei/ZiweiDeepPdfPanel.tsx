"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  심화 자미두수 심층 리포트  (ZIWEI_DEEP_PDF)  —  통합 UI 패널
 * ───────────────────────────────────────────────────────────────────────────
 *  회당 결제 LLM 15챕터 심층 리포트 생성 → 화면 렌더 → PDF 다운로드 → 재열람.
 *  - 결제: featureKey `ziwei-deep-pdf` (300코인=30,000원), 회당 결제.
 *  - 백엔드: /api/ziwei-deep-report/{prepare,generate,result} (worker/routes/ziwei-deep-report.js)
 *  - PDF: html2canvas로 브라우저 렌더(한글 폰트) 캡처 → jsPDF 이미지 페이지.
 *
 *  🔮 통합(2026-08-13): 같은 화면에 따로 있던 "별궁 전문가 상담"(ziwei-ai-consultation,
 *     30,000원)을 여기로 흡수했다. 관심분야·자유질문을 받아 15챕터 전체에 주입하므로
 *     사용자는 30,000원 한 번으로 질문 맞춤 심층 리포트를 받는다.
 *     독립 페이지 /ziwei-ai 는 그대로 살아 있다(별도 상품).
 *
 *  ▶ 접근 키워드: `ZIWEI_DEEP_PDF`, `ziwei-deep-pdf`, `ZiweiDeepPdfPanel`
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useRef, useState } from "react";
import { Download, History, Loader2, Sparkles } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { PriceBadge } from "@/app/components/PriceBadge";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  runBillingCoinGate,
  primePaymentEligibility,
} from "@/app/_lib/billing-client";

const FEATURE_KEY = "ziwei-deep-pdf";
const FEATURE_REASON = "심화 자미두수 심층 리포트";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;

/** 통합 이전 "별궁 전문가 상담"이 받던 관심분야. 15챕터 프롬프트에 그대로 넘어간다. */
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

export interface ZiweiDeepBirthInput {
  name: string;
  gender: "male" | "female";
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:MM (또는 "")
  birthTimeUnknown: boolean;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
}

interface ReportChapter { id: string; title: string; body: string; chars: number; ok?: boolean }
interface DeepReport { label: string; chapters: ReportChapter[]; totalChars: number; generatedAt: string; restored?: boolean }
interface BatchResult { startIndex: number; nextIndex: number; totalChapters: number; done: boolean; chapters: ReportChapter[] }
interface ReportMeta { label: string; generatedAt: string; minTotalChars: number; chapterCount: number }
interface StoredReportSummary { id: string; name: string; topic: string; question: string; status: string; createdAt: string }

type Phase = "idle" | "checking" | "payment" | "generating" | "ready";

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "리포트를 생성하려면 로그인이 필요합니다.",
  PAYMENT_REQUIRED: "회당 결제가 필요한 리포트입니다.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 끝났다면 잠시 후 다시 시도해 주세요.",
  PAYMENT_CANCELLED: "결제가 취소되었습니다.",
  INVALID_INPUT: "생년월일과 출생시간 정보를 확인해 주세요.",
  CUSTOM_QUESTION_REQUIRED: "묻고 싶은 질문을 조금 더 구체적으로 적어 주세요.",
  GENERATION_FAILED: "리포트를 완성하지 못했습니다. 결제는 되돌렸으니 잠시 후 다시 시도해 주세요.",
  DB_DEGRADED: "지금 접속이 잠시 불안정합니다. 잠시 후 다시 시도해 주세요.",
  SERVER_ERROR: "리포트를 준비하는 중 문제가 발생했습니다.",
  NETWORK_ERROR: "연결이 불안정합니다. 잠시 후 다시 시도해 주세요.",
};

const LOADING_STEPS = [
  "명반을 세우는 중...",
  "명궁·신궁의 축을 읽는 중...",
  "12궁 전체를 챕터별로 해석하는 중...",
  "사화·삼방사정 호응을 엮는 중...",
  "대한·유년 마스터플랜을 정리하는 중...",
];

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `zwdp-${crypto.randomUUID()}`;
  return `zwdp-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
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
    categoryKey: toText(runtimeGate.categoryKey ?? paymentPayload.categoryKey) || "premium-report",
    subFeatureKey: toText(runtimeGate.subFeatureKey ?? paymentPayload.subFeatureKey) || FEATURE_KEY,
    featureKey: toText(runtimeGate.featureKey ?? paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason ?? paymentPayload.reason) || FEATURE_REASON,
    productId: toText(runtimeGate.productId ?? paymentPayload.productId) || FEATURE_KEY,
    productType: toText(runtimeGate.productType ?? paymentPayload.productType) || FEATURE_KEY,
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || FEATURE_KEY,
    // 🔴 ziwei-deep-pdf 는 회당 결제(per_use)다 — false 면 공용 게이트의 결제창 오픈 분기가
    //    전부 막혀 이용권 미보유 사용자가 결제창을 못 보고 PAYMENT_VERIFY_FAILED 만 받는다.
    //    이용권이 커버하면 게이트가 스스로 forceDeduct 를 낮춰 차감하지 않는다.
    requestId: idempotencyKey,
    idempotencyKey,
    cost,
    coinPrice: cost,
    amountKRW,
    amountKrw: amountKRW,
    paymentAmount: amountKRW,
  };
}

function safePdfName(value: string) {
  return String(value || "자미두수").replace(/[^\p{L}\p{N}_-]+/gu, "").slice(0, 24) || "자미두수";
}

type ApiResult = {
  ok?: boolean; reason?: string; message?: string;
  accessToken?: string; accessType?: string;
  paymentPayload?: Record<string, unknown>;
  batch?: BatchResult;
  reportMeta?: ReportMeta;
  // 저장본 재열람/멱등 재요청 응답(서버의 publicStoredReport).
  restored?: boolean;
  reportId?: string;
  chapters?: ReportChapter[];
  nextIndex?: number;
  totalChapters?: number;
  done?: boolean;
  reports?: StoredReportSummary[];
};

const TOTAL_CHAPTERS = 15;
const MAX_BATCHES = 20; // 터미널 가드: 15챕터 / 최소 1챕터 배치 → 무한루프 방지

interface Props { birth: ZiweiDeepBirthInput; disabled?: boolean }

export default function ZiweiDeepPdfPanel({ birth, disabled = false }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [report, setReport] = useState<DeepReport | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [genProgress, setGenProgress] = useState({ done: 0, total: TOTAL_CHAPTERS });
  const [focusArea, setFocusArea] = useState<FocusArea>("overall");
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<StoredReportSummary[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const busyRef = useRef(false);
  const idempotencyRef = useRef("");
  const reportRef = useRef<HTMLDivElement | null>(null);

  const busy = phase === "checking" || phase === "payment" || phase === "generating";
  const topic = FOCUS_OPTIONS.find((option) => option.value === focusArea)?.label || "";

  const payload = useMemo(() => ({
    serviceType: FEATURE_KEY,
    locale: "ko",
    focusArea,
    topic,
    question: question.trim(),
    birthInfo: {
      name: birth.name,
      gender: birth.gender,
      birthDate: birth.birthDate,
      birthTime: birth.birthTimeUnknown ? "" : birth.birthTime,
      birthTimeUnknown: birth.birthTimeUnknown,
      calendarType: birth.calendarType,
      isLeapMonth: birth.calendarType === "lunar" ? birth.isLeapMonth : false,
    },
  }), [birth, focusArea, topic, question]);

  function cycleSteps() {
    let i = 0;
    const timer = setInterval(() => { i = (i + 1) % LOADING_STEPS.length; setStepIndex(i); }, 3800);
    return () => clearInterval(timer);
  }

  async function generate(idempotencyKey: string, extra: Record<string, unknown>) {
    setPhase("generating");
    setGenProgress({ done: 0, total: TOTAL_CHAPTERS });
    const stop = cycleSteps();
    try {
      // 15챕터를 배치(startIndex 0→4→8→12)로 나눠 순차 호출한다. 각 요청은 1 웨이브로 짧게
      // 끝나 타임아웃 위험이 없고, 챕터는 결정론이라 각 배치가 독립·재개 가능하다.
      const accumulated: ReportChapter[] = [];
      let meta: ReportMeta | null = null;
      let restored = false;
      let accessExtra: Record<string, unknown> = { ...extra };
      let startIndex = 0;
      for (let guard = 0; guard < MAX_BATCHES; guard += 1) {
        const { status, data } = await postJson<ApiResult>(
          "/api/ziwei-deep-report/generate",
          { ...payload, ...accessExtra, idempotencyKey, startIndex },
          idempotencyKey,
        );
        if (!data.ok) throw new Error(mapError(data, status));
        // 두 번째 배치부터는 재사용 토큰으로 접근(추가 DB·결제 조회 없음).
        if (data.accessToken) accessExtra = { accessToken: data.accessToken, accessType: data.accessType };
        if (!meta && data.reportMeta) meta = data.reportMeta;

        // 같은 요청 키의 저장본이 있으면 서버가 재생성 없이 그대로 돌려준다(재과금 없음).
        // 미완성 저장본이면 nextIndex 부터 이어 만든다.
        if (data.restored) {
          restored = true;
          accumulated.push(...(data.chapters || []));
          setGenProgress({ done: accumulated.length, total: data.totalChapters || TOTAL_CHAPTERS });
          if (data.done) break;
          startIndex = typeof data.nextIndex === "number" ? data.nextIndex : accumulated.length;
          continue;
        }

        if (!data.batch) throw new Error(mapError(data, status));
        accumulated.push(...data.batch.chapters);
        setGenProgress({ done: Math.min(data.batch.nextIndex, data.batch.totalChapters), total: data.batch.totalChapters });
        if (data.batch.done) break;
        startIndex = data.batch.nextIndex;
      }
      if (!accumulated.length) throw new Error(ERROR_TEXT.SERVER_ERROR);
      applyReport(accumulated, meta, restored);
    } finally { stop(); }
  }

  function applyReport(chapters: ReportChapter[], meta: ReportMeta | null, restored = false) {
    setReport({
      label: meta?.label || FEATURE_REASON,
      generatedAt: meta?.generatedAt || new Date().toISOString(),
      totalChars: chapters.reduce((sum, ch) => sum + (ch.chars || 0), 0),
      chapters,
      restored,
    });
    setPhase("ready");
  }

  function mapError(data: ApiResult, status = 0) {
    const reason = String(data?.reason || "").toUpperCase();
    if (reason && ERROR_TEXT[reason]) return ERROR_TEXT[reason];
    if (status === 401) return ERROR_TEXT.LOGIN_REQUIRED;
    if (status === 402) return ERROR_TEXT.PAYMENT_VERIFY_FAILED;
    return data?.message || ERROR_TEXT.SERVER_ERROR;
  }

  /** 내 리포트 목록 — 눌렀을 때만 조회한다(마운트 시 자동 조회 없음). */
  async function loadHistory() {
    if (historyLoading) return;
    setHistoryLoading(true);
    setError("");
    try {
      const response = await authFetch("/api/ziwei-deep-report/result", { method: "GET" }, { retryOn401: false });
      const data = (await response.json().catch(() => ({}))) as ApiResult;
      if (!response.ok || !data.ok) throw new Error(mapError(data, response.status));
      setHistory(data.reports || []);
    } catch (caught) {
      setError(caught instanceof TypeError ? ERROR_TEXT.NETWORK_ERROR : caught instanceof Error ? caught.message : ERROR_TEXT.SERVER_ERROR);
    } finally { setHistoryLoading(false); }
  }

  /** 저장본 재열람 — 결제 없이 저장된 리포트를 그대로 다시 연다. */
  async function openStoredReport(reportId: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setError("");
    setPhase("generating");
    try {
      const response = await authFetch(`/api/ziwei-deep-report/result?id=${encodeURIComponent(reportId)}`, { method: "GET" }, { retryOn401: false });
      const data = (await response.json().catch(() => ({}))) as ApiResult;
      if (!response.ok || !data.ok || !data.chapters?.length) throw new Error(mapError(data, response.status));
      applyReport(data.chapters, data.reportMeta || null, true);
    } catch (caught) {
      setError(caught instanceof TypeError ? ERROR_TEXT.NETWORK_ERROR : caught instanceof Error ? caught.message : ERROR_TEXT.SERVER_ERROR);
      setPhase("idle");
    } finally { busyRef.current = false; }
  }

  function validate(): string {
    if (!birth.birthDate || (!birth.birthTime && !birth.birthTimeUnknown)) return ERROR_TEXT.INVALID_INPUT;
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
    setReport(null);
    setPhase("checking");
    let gateStarted = false;
    try {
      beginPaidFeatureGateCheck({ featureKey: FEATURE_KEY, requestId: idempotencyKey, title: "결제 확인", reason: FEATURE_REASON, paymentMode: "DIRECT" });
      // 이용권 판정(unlock-status)을 아래 prepare 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
      void primePaymentEligibility(buildBillingGateInput({}, idempotencyKey));
      gateStarted = true;
      const { status, data } = await postJson<ApiResult>("/api/ziwei-deep-report/prepare", { ...payload, idempotencyKey }, idempotencyKey);
      if (data.ok) {
        completePaidFeatureGateCheck({ featureKey: FEATURE_KEY, requestId: idempotencyKey, title: "확인 완료", reason: FEATURE_REASON, paymentMode: "DIRECT", message: "리포트를 생성합니다." });
        await generate(idempotencyKey, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      if (data.reason === "LOGIN_REQUIRED" || status === 401) throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
      if (data.reason === "INVALID_INPUT") throw new Error(mapError(data, status));
      if (data.reason !== "PAYMENT_REQUIRED") throw new Error(mapError(data, status));

      setPhase("payment");
      const gate = await runBillingCoinGate(buildBillingGateInput(asRecord(data.paymentPayload), idempotencyKey));
      if (!isPaymentGranted(gate)) {
        const code = String((gate as { error?: { code?: string } })?.error?.code || "").toUpperCase();
        if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
        if (code === "PAYMENT_CANCELLED") throw new Error(ERROR_TEXT.PAYMENT_CANCELLED);
        throw new Error(ERROR_TEXT.PAYMENT_VERIFY_FAILED);
      }
      await generate(idempotencyKey, extractPayment(gate, idempotencyKey));
    } catch (caught) {
      const message = caught instanceof TypeError ? ERROR_TEXT.NETWORK_ERROR : caught instanceof Error ? caught.message : ERROR_TEXT.SERVER_ERROR;
      setError(message);
      if (gateStarted) {
        failPaidFeatureGateCheck({ featureKey: FEATURE_KEY, requestId: idempotencyKey, title: "확인 실패", reason: FEATURE_REASON, paymentMode: "DIRECT", message, cancelled: message === ERROR_TEXT.PAYMENT_CANCELLED });
      }
      setPhase("idle");
      idempotencyRef.current = "";
    } finally { busyRef.current = false; }
  }

  async function handlePdfDownload() {
    const element = reportRef.current;
    if (!element || pdfLoading) return;
    setPdfLoading(true);
    setError("");
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const date = new Date().toLocaleDateString("ko-KR").replace(/\./g, "").replace(/\s/g, "");
      await exportResultPdf({
        captureTargets: ["#ziwei-deep-pdf-report [data-ziwei-pdf-section]"],
        fileName: `심화자미두수_${safePdfName(birth.name)}_${date}.pdf`,
        backgroundColor: "#0b1020",
        cover: {
          title: `${safePdfName(birth.name)}님의 심화 자미두수 리포트`,
          date: new Date().toISOString().slice(0, 10),
        },
      });
    } catch {
      setError("PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setPdfLoading(false); }
  }

  return (
    <section className="font-premium relative overflow-hidden rounded-[1.6rem] border border-amber-200/25 bg-gradient-to-br from-[#140f2e]/85 via-[#0c1230]/85 to-[#101a34]/85 p-5 text-slate-100 md:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_18%_12%,rgba(250,204,21,.14),transparent_42%),radial-gradient(circle_at_82%_80%,rgba(125,211,252,.14),transparent_46%)]" aria-hidden="true" />
      <div className="relative z-10">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-amber-100/80">ZIWEI 전문가 상담 · 회당 결제</p>
        <h3 className="font-display mt-2 text-xl font-black text-white md:text-2xl">✨ 심화 자미두수 전문가 상담 리포트</h3>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200/85">
          지금 가장 궁금한 질문을 남기면, 명궁부터 복덕궁까지 12궁 전체와 사화·삼방사정·대한 흐름을 <b className="text-amber-100">15개 챕터·3~4만자</b>로 풀어 그 질문에 답합니다. 화면에서 바로 읽고 PDF로도 저장할 수 있습니다.
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
                      ? "border-amber-200/60 bg-amber-200/20 text-amber-50"
                      : "border-white/12 bg-white/5 text-slate-200 hover:border-amber-200/40"
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
              placeholder="묻고 싶은 질문을 적어 주세요. (선택 · ‘현재 고민 상담’은 필수)"
              className="w-full resize-none rounded-2xl border border-white/12 bg-black/25 px-4 py-3 text-sm leading-7 text-slate-100 placeholder:text-slate-400/70 focus:border-amber-200/50 focus:outline-none"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={busy || disabled}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-200 via-amber-100 to-sky-200 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_14px_30px_-10px_rgba(250,204,21,.5)] transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {phase === "checking" ? "결제 확인 중..." : phase === "payment" ? "결제 진행 중..." : phase === "generating" ? "리포트 생성 중..." : "심화 전문가 상담 받기 (30,000원)"}
              </button>
              <PriceBadge featureKey={FEATURE_KEY} prefix="상담 이용 가격 " />
            </div>
            <p className="text-xs text-slate-300/70">회당 결제 · 15챕터 · 3~4만자 · 이용권/월정석 보유 시 무차감 진행</p>

            <div className="border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={historyLoading || busy}
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-amber-200/40 disabled:opacity-60"
              >
                {historyLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <History className="h-3.5 w-3.5" />}
                {historyLoading ? "불러오는 중..." : "지난 리포트 다시 보기"}
              </button>
              {history && !history.length && (
                <p className="mt-2 text-xs text-slate-300/70">아직 저장된 리포트가 없습니다.</p>
              )}
              {history && history.length > 0 && (
                <ul className="mt-3 grid gap-2">
                  {history.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void openStoredReport(item.id)}
                        disabled={busy}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-amber-200/35 disabled:opacity-60"
                      >
                        <span className="block text-sm font-bold text-slate-100">
                          {item.name || "내"} 리포트 · {item.topic || "전체 명반 해석"}
                          {item.status === "partial" ? " (생성 중단)" : ""}
                        </span>
                        {item.question && <span className="mt-0.5 block truncate text-xs text-slate-300/75">{item.question}</span>}
                        <span className="mt-0.5 block text-xs text-slate-400/70">{new Date(item.createdAt).toLocaleDateString("ko-KR")}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {phase === "generating" && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-sky-300/25 bg-sky-400/10 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-sky-200" />
            <span className="text-sm text-sky-100">
              {LOADING_STEPS[stepIndex]}
              {genProgress.done > 0 ? ` (${genProgress.done}/${genProgress.total}챕터)` : ""}
            </span>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
        )}

        {phase === "ready" && report && (
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/25 bg-amber-200/10 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-amber-100/80">
                  {report.restored ? "저장된 리포트" : "완성"} · {report.chapters.length}챕터 · 약 {report.totalChars.toLocaleString("ko-KR")}자
                </p>
                <p className="text-sm font-bold text-white">
                  {report.restored ? "저장된 리포트를 다시 열었습니다" : "심화 자미두수 리포트가 완성되었습니다"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handlePdfDownload()}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200/45 bg-amber-200/15 px-4 py-2.5 text-sm font-black text-amber-50 transition disabled:opacity-60"
              >
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {pdfLoading ? "저장 중..." : "PDF 다운로드"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setPhase("idle"); setReport(null); setHistory(null); idempotencyRef.current = ""; }}
              className="mt-3 rounded-xl border border-white/12 bg-white/8 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-amber-200/35"
            >
              다른 질문으로 다시 상담하기
            </button>

            <div ref={reportRef} id="ziwei-deep-pdf-report" className="mt-4 grid gap-4">
              <section data-ziwei-pdf-section className="rounded-2xl border border-amber-200/20 bg-[#0b1020] p-6">
                <p className="text-xs font-semibold tracking-[0.3em] text-amber-100/70">紫微斗數 · 심화 리포트</p>
                <h4 className="font-display mt-2 text-2xl font-black text-white">{birth.name || "당신"}님의 심화 자미두수 15챕터</h4>
                <p className="mt-1 text-sm text-slate-300">{birth.calendarType === "lunar" ? "음력" : "양력"} {birth.birthDate} · {birth.birthTimeUnknown ? "출생시간 모름" : birth.birthTime} · {birth.gender === "male" ? "남성" : "여성"}</p>
              </section>
              {report.chapters.map((ch) => (
                <article key={ch.id} data-ziwei-pdf-section className="rounded-2xl border border-white/10 bg-[#0b1020] p-6">
                  <h4 className="font-display text-lg font-black text-amber-100">{ch.title}</h4>
                  <p className="mt-3 whitespace-pre-wrap text-[15px] leading-8 text-slate-100/95">{ch.body}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
