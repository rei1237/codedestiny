"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  심화 자미두수 PDF  (ZIWEI_DEEP_PDF)  —  UI 패널
 * ───────────────────────────────────────────────────────────────────────────
 *  회당 결제 LLM 15챕터 심층 리포트 생성 → 화면 렌더 → PDF 다운로드.
 *  - 결제: featureKey `ziwei-deep-pdf` (300코인=30,000원), 회당 결제.
 *  - 백엔드: /api/ziwei-deep-report/{prepare,generate} (worker/routes/ziwei-deep-report.js)
 *  - PDF: html2canvas로 브라우저 렌더(한글 폰트) 캡처 → jsPDF 이미지 페이지.
 *
 *  ▶ 접근 키워드: `ZIWEI_DEEP_PDF`, `ziwei-deep-pdf`, `ZiweiDeepPdfPanel`
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useRef, useState } from "react";
import { Download, Loader2, Sparkles } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";

const FEATURE_KEY = "ziwei-deep-pdf";
const FEATURE_REASON = "심화 자미두수 PDF";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;

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
interface DeepReport { label: string; chapters: ReportChapter[]; totalChars: number; generatedAt: string }

type Phase = "idle" | "checking" | "payment" | "generating" | "ready";

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "리포트를 생성하려면 로그인이 필요합니다.",
  PAYMENT_REQUIRED: "회당 결제가 필요한 리포트입니다.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 끝났다면 잠시 후 다시 시도해 주세요.",
  PAYMENT_CANCELLED: "결제가 취소되었습니다.",
  INVALID_INPUT: "생년월일과 출생시간 정보를 확인해 주세요.",
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
  }, { retryOn401: true });
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
    forceDeduct: false,
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
  report?: DeepReport;
};

interface Props { birth: ZiweiDeepBirthInput; disabled?: boolean }

export default function ZiweiDeepPdfPanel({ birth, disabled = false }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [report, setReport] = useState<DeepReport | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const busyRef = useRef(false);
  const idempotencyRef = useRef("");
  const reportRef = useRef<HTMLDivElement | null>(null);

  const busy = phase === "checking" || phase === "payment" || phase === "generating";

  const payload = useMemo(() => ({
    serviceType: FEATURE_KEY,
    locale: "ko",
    birthInfo: {
      name: birth.name,
      gender: birth.gender,
      birthDate: birth.birthDate,
      birthTime: birth.birthTimeUnknown ? "" : birth.birthTime,
      birthTimeUnknown: birth.birthTimeUnknown,
      calendarType: birth.calendarType,
      isLeapMonth: birth.calendarType === "lunar" ? birth.isLeapMonth : false,
    },
  }), [birth]);

  function cycleSteps() {
    let i = 0;
    const timer = setInterval(() => { i = (i + 1) % LOADING_STEPS.length; setStepIndex(i); }, 3800);
    return () => clearInterval(timer);
  }

  async function generate(idempotencyKey: string, extra: Record<string, unknown>) {
    setPhase("generating");
    const stop = cycleSteps();
    try {
      const { status, data } = await postJson<ApiResult>("/api/ziwei-deep-report/generate", { ...payload, ...extra, idempotencyKey }, idempotencyKey);
      if (data.ok && data.report) { setReport(data.report); setPhase("ready"); return; }
      throw new Error(mapError(data, status));
    } finally { stop(); }
  }

  function mapError(data: ApiResult, status = 0) {
    const reason = String(data?.reason || "").toUpperCase();
    if (reason && ERROR_TEXT[reason]) return ERROR_TEXT[reason];
    if (status === 401) return ERROR_TEXT.LOGIN_REQUIRED;
    if (status === 402) return ERROR_TEXT.PAYMENT_VERIFY_FAILED;
    return data?.message || ERROR_TEXT.SERVER_ERROR;
  }

  async function handleGenerate() {
    if (busyRef.current || disabled) return;
    if (!birth.birthDate || (!birth.birthTime && !birth.birthTimeUnknown)) { setError(ERROR_TEXT.INVALID_INPUT); return; }
    busyRef.current = true;
    const idempotencyKey = idempotencyRef.current || createIdempotencyKey();
    idempotencyRef.current = idempotencyKey;
    setError("");
    setReport(null);
    setPhase("checking");
    let gateStarted = false;
    try {
      beginPaidFeatureGateCheck({ featureKey: FEATURE_KEY, requestId: idempotencyKey, title: "결제 확인", reason: FEATURE_REASON, paymentMode: "DIRECT" });
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
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const JsPDF = (jsPdfModule as { default?: unknown; jsPDF?: unknown }).default || (jsPdfModule as { jsPDF?: unknown }).jsPDF;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdf = new (JsPDF as any)("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const sections = Array.from(element.querySelectorAll<HTMLElement>("[data-ziwei-pdf-section]"));
      let hasPage = false;
      for (const section of sections) {
        const canvas = await html2canvas(section, { backgroundColor: "#0b1020", scale: Math.min(2, window.devicePixelRatio || 2), useCORS: true });
        const imageData = canvas.toDataURL("image/png");
        const imageHeight = (canvas.height * pageWidth) / canvas.width;
        let remainingHeight = imageHeight;
        let position = 0;
        if (hasPage) pdf.addPage();
        hasPage = true;
        pdf.addImage(imageData, "PNG", 0, position, pageWidth, imageHeight);
        remainingHeight -= pageHeight;
        while (remainingHeight > 0) {
          position = remainingHeight - imageHeight;
          pdf.addPage();
          pdf.addImage(imageData, "PNG", 0, position, pageWidth, imageHeight);
          remainingHeight -= pageHeight;
        }
      }
      const date = new Date().toLocaleDateString("ko-KR").replace(/\./g, "").replace(/\s/g, "");
      pdf.save(`심화자미두수_${safePdfName(birth.name)}_${date}.pdf`);
    } catch {
      setError("PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setPdfLoading(false); }
  }

  return (
    <section className="font-premium relative overflow-hidden rounded-[1.6rem] border border-amber-200/25 bg-gradient-to-br from-[#140f2e]/85 via-[#0c1230]/85 to-[#101a34]/85 p-5 text-slate-100 md:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_18%_12%,rgba(250,204,21,.14),transparent_42%),radial-gradient(circle_at_82%_80%,rgba(125,211,252,.14),transparent_46%)]" aria-hidden="true" />
      <div className="relative z-10">
        <p className="text-[11px] font-semibold tracking-[0.3em] text-amber-100/80">ZIWEI DEEP PDF · 회당 결제</p>
        <h3 className="font-display mt-2 text-xl font-black text-white md:text-2xl">✨ 심화 자미두수 15챕터 PDF 리포트</h3>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-200/85">
          명궁부터 복덕궁까지 12궁 전체와 사화·삼방사정·대한 흐름을 <b className="text-amber-100">15개 챕터·3~4만자</b>로 깊게 풀어 PDF로 저장합니다. AI가 명반을 근거로 인생 전체를 상담합니다.
        </p>

        {phase !== "ready" && (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={busy || disabled}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-200 via-amber-100 to-sky-200 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_14px_30px_-10px_rgba(250,204,21,.5)] transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {phase === "checking" ? "결제 확인 중..." : phase === "payment" ? "결제 진행 중..." : phase === "generating" ? "리포트 생성 중..." : "심화 PDF 리포트 생성 (30,000원)"}
            </button>
            <span className="text-xs text-slate-300/70">회당 결제 · 15챕터 · 3~4만자</span>
          </div>
        )}

        {phase === "generating" && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-sky-300/25 bg-sky-400/10 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-sky-200" />
            <span className="text-sm text-sky-100">{LOADING_STEPS[stepIndex]}</span>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
        )}

        {phase === "ready" && report && (
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/25 bg-amber-200/10 px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-amber-100/80">완성 · {report.chapters.length}챕터 · 약 {report.totalChars.toLocaleString("ko-KR")}자</p>
                <p className="text-sm font-bold text-white">심화 자미두수 리포트가 완성되었습니다</p>
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

            <div ref={reportRef} className="mt-4 grid gap-4">
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
