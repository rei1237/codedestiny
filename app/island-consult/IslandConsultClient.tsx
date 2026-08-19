"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure, runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  holdPaidFeatureGateOpen,
  releasePaidFeatureGate,
  runBillingCoinGate,
  primePaymentEligibility,
} from "@/app/_lib/billing-client";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { useContentUnlock } from "@/app/_lib/use-content-unlock";
import { hasLedgerUnlock } from "@/app/_lib/optimistic-unlock-ledger";
import PagedResultViewer, { usePagedViewerMode, type ResultViewerPage } from "@/components/fortune/PagedResultViewer";
import AiResultProse from "@/components/fortune/AiResultProse";

// ── 상품 상수(레지스트리 ziwei-island-palace-consult와 일치) ──
const FEATURE_KEY = "ziwei-island-palace-consult";
const FEATURE_REASON = "운명의 섬 12궁 심층 상담";
const FEATURE_COST = 200;
const FEATURE_AMOUNT_KRW = 20000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 2000;
const PREPARE = "/api/ziwei-island-ai/prepare";
const GENERATE = "/api/ziwei-island-ai/generate";
const RESULT = "/api/ziwei-island-ai/result";

// ── ₩5,000 12궁 전체 심층 리포트(영구 해금) — 위 ₩20,000 상담과는 별개 상품 ──
// 상담이 "한 궁을 지금 고민에 맞춰 AI가 새로 쓰는 것"이라면, 리포트는 "열두 궁 전체를
// 명반에서 정밀 판독한 고정 콘텐츠"다. 그래서 회당 결제가 아니라 1회 해금이다.
const REPORT_FEATURE_KEY = "ziwei-island-deep-report";
const REPORT_REASON = "운명의 섬 12궁 심층 리포트";
const REPORT_COIN_PRICE = 50;
const REPORT_AMOUNT_KRW = 5000;
const REPORT_ENDPOINT = "/api/ziwei-island-report";

type ReportSection = { key: string; title: string; body: string };
type ReportPalace = { title: string; focus: string; tier: number; tierLabel: string; sections: ReportSection[] };
type IslandReport = { version: string; signature: string; biome?: { label?: string } | null; season?: string; palaces: Record<string, ReportPalace> };

type Gender = "female" | "male" | "unknown" | "";
type CalendarType = "solar" | "lunar";
type Phase = "hub" | "form" | "checking" | "payment" | "reading" | "ready";
type SeedLike = { name?: string; gender?: string; birthDate?: string; birthTime?: string; birthTimeUnknown?: boolean; calendarType?: string; isLeapMonth?: boolean };
function calLabel(f: { calendarType: CalendarType; isLeapMonth: boolean }) { return f.calendarType === "lunar" ? (f.isLeapMonth ? "윤달" : "음력") : "양력"; }

interface Palace {
  name: string; title: string; icon: string; theme: string; artIndex: number;
}
const PALACES: Palace[] = [
  { name: "명궁", title: "운명의 성", icon: "🏰", theme: "본질·성향·삶의 방향", artIndex: 0 },
  { name: "재백궁", title: "황금 광산", icon: "⛏️", theme: "재물·수입·돈의 흐름", artIndex: 1 },
  { name: "관록궁", title: "전략실", icon: "📐", theme: "직업·성취·진로 전환", artIndex: 2 },
  { name: "부부궁", title: "연인의 정원", icon: "💗", theme: "배우자·연애·인연", artIndex: 3 },
  { name: "천이궁", title: "항구", icon: "⛵", theme: "이동·변화·해외", artIndex: 4 },
  { name: "복덕궁", title: "신비한 도서관", icon: "📚", theme: "내면·정신·취향", artIndex: 5 },
  { name: "질액궁", title: "치유의 성소", icon: "💧", theme: "건강·체질·컨디션", artIndex: 6 },
  { name: "부모궁", title: "고대 신전", icon: "⛩️", theme: "부모·윗사람·뿌리", artIndex: 7 },
  { name: "형제궁", title: "형제의 숲", icon: "🌲", theme: "형제·동년배·협력", artIndex: 8 },
  { name: "노복궁", title: "동료의 광장", icon: "🤝", theme: "동료·인맥·아랫사람", artIndex: 9 },
  { name: "자녀궁", title: "빛의 놀이터", icon: "🎈", theme: "자녀·창작·돌봄", artIndex: 10 },
  { name: "전택궁", title: "고향의 집", icon: "🏡", theme: "거처·부동산·터전", artIndex: 11 },
];

const ISLAND_ASSET_ROOT = "/images/destiny-island";
const CONSULT_HERO = `${ISLAND_ASSET_ROOT}/consult-hero.webp`;
const CONSULT_READING = `${ISLAND_ASSET_ROOT}/consult-reading.webp`;
const CONSULT_REPORT_COVER = `${ISLAND_ASSET_ROOT}/consult-report-cover.webp`;
const PALACE_BADGES = `${ISLAND_ASSET_ROOT}/palace-badges.webp`;
  const YEON_AV = "/images/fortune-tea-house/flower-pig-single-a.webp";
  const NEO_AV = "https://assets.code-destiny.com/cdn-cgi/image/width=240,quality=80,format=auto/DestinyWar/" + encodeURIComponent("전략실 네오 메인-Photoroom.webp");
const PALACE_BADGE_POSITIONS = [
  "0% 0%", "33.333% 0%", "66.667% 0%", "100% 0%",
  "0% 50%", "33.333% 50%", "66.667% 50%", "100% 50%",
  "0% 100%", "33.333% 100%", "66.667% 100%", "100% 100%",
];

function PalaceBadge({ palace, size = "card" }: { palace: Palace; size?: "card" | "small" | "result" }) {
  return (
    <span
      className={`ic-palace-art ic-palace-art--${size}`}
      style={{ backgroundImage: `url(${PALACE_BADGES})`, backgroundPosition: PALACE_BADGE_POSITIONS[palace.artIndex] }}
      aria-hidden="true"
    />
  );
}

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  PAYMENT_CANCELLED: "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.",
  INVALID_INPUT: "상담에 필요한 정보가 부족해요. 생년월일·성별·출생시간을 다시 확인해 주세요.",
  CALCULATION_FAILED: "명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  LLM_ERROR: "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
};

type ApiResult = {
  ok?: boolean; reason?: string; message?: string; accessToken?: string; accessType?: string;
  sessionId?: string; status?: string; paymentPayload?: unknown;
  consultation?: {
    id: string; palaceKey: string; palaceTitle: string; sectionKeys: string[];
    result?: { meta?: Record<string, unknown>; sections?: Record<string, { title?: string; body?: string }> } | null;
    topic?: string; userQuestion?: string;
  };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function toText(v: unknown) { return typeof v === "string" ? v : v == null ? "" : String(v); }
function toNumber(v: unknown, fb = 0) { const n = Number(v); return Number.isFinite(n) ? n : fb; }
function asRecord(v: unknown): Record<string, unknown> { return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}; }
function runtimePayload(result: unknown) {
  const record = asRecord(result); const payload = asRecord(record.payload); const data = asRecord(record.data);
  return Object.keys(payload).length ? payload : (Object.keys(data).length ? data : record);
}
function mapError(result: ApiResult | null, status = 0) {
  const reason = String(result?.reason || "").toUpperCase();
  if (reason && ERROR_TEXT[reason]) return ERROR_TEXT[reason];
  if (status === 401) return ERROR_TEXT.LOGIN_REQUIRED;
  if (status === 402) return ERROR_TEXT.PAYMENT_VERIFY_FAILED;
  return result?.message || ERROR_TEXT.SERVER_ERROR;
}
// ── 결제 게이트 헬퍼(ZiweiAiClient에서 verbatim, 상수만 이 상품으로) ──
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
    cost, coinPrice: cost, amountKRW, amountKrw: amountKRW, paymentAmount: amountKRW,
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, FEATURE_MEMBERSHIP_CREDIT_COST),
  };
}
function isPaymentGranted(result: unknown) {
  const record = asRecord(result); const payload = runtimePayload(result);
  const status = toText(record.status || payload.status || payload.paymentStatus).toLowerCase();
  const denied = new Set(["error", "failed", "failure", "payment_required", "cancelled", "canceled"]);
  if (record.ok === false || payload.ok === false || denied.has(status)) return false;
  if (["granted", "paid", "success", "succeeded", "confirmed", "complete", "completed", "approved"].includes(status)) return true;
  return Boolean(record.transactionId || record.paymentId || record.purchaseId || payload.transactionId || payload.paymentId || payload.purchaseId || Object.keys(asRecord(payload.accessGrant)).length || Object.keys(asRecord(payload.consume)).length);
}
function extractPayment(result: unknown, fallbackRequestId: string) {
  const record = asRecord(result); const payload = runtimePayload(result);
  const payment = asRecord(payload.payment); const accessGrant = asRecord(payload.accessGrant); const consume = asRecord(payload.consume);
  const transactionId = toText(record.transactionId || payload.transactionId || accessGrant.transactionId || consume.transactionId);
  const purchaseId = toText(record.purchaseId || payload.purchaseId || accessGrant.purchaseId || consume.purchaseId);
  const ledgerId = toText(record.ledgerId || payload.ledgerId || accessGrant.ledgerId || consume.ledgerId);
  const paymentId = toText(record.paymentId || transactionId || purchaseId || payload.paymentId || payment.paymentId || payment.impUid || payment.merchantUid || accessGrant.paymentId || ledgerId || fallbackRequestId);
  return {
    paymentId, transactionId, purchaseId, ledgerId, requestId: fallbackRequestId,
    billingEvidence: { ...payload, paymentId, transactionId, purchaseId, ledgerId, payment: { ...payment, paymentId, requestId: fallbackRequestId }, accessGrant, consume },
    payment: { ...payment, paymentId, requestId: fallbackRequestId }, accessGrant, consume,
  };
}

function createRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `zwisl-${crypto.randomUUID()}`;
  return `zwisl-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
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

export default function IslandConsultClient() {
  const [phase, setPhase] = useState<Phase>("hub");
  const [palace, setPalace] = useState<Palace | null>(null);
  const [form, setForm] = useState({ name: "", gender: "" as Gender, birthDate: "", birthTime: "", birthTimeUnknown: false, calendarType: "solar" as CalendarType, isLeapMonth: false, question: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResult["consultation"] | null>(null);
  const [birthEditing, setBirthEditing] = useState(false);
  const busyRef = useRef(false);
  const formTouchedRef = useRef(false);
  const seedAppliedRef = useRef(false);

  const { seed: profileSeed, seedVersion } = useAiProfileSeed();

  // ── ₩5,000 심층 리포트 상태 ──
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const { unlocked, status: unlockStatus, refetch: refetchUnlocks, markOptimisticallyUnlocked } = useContentUnlock([REPORT_FEATURE_KEY]);
  // 원장을 먼저 읽어 첫 페인트에서 잠금 화면이 번쩍이지 않게 한다(LoveSimulationClient 선례).
  const [ledgerUnlocked, setLedgerUnlocked] = useState(false);
  const [report, setReport] = useState<IslandReport | null>(null);
  const [reportError, setReportError] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportViewAll, setReportViewAll] = usePagedViewerMode("islandReportViewerModeV1");
  const reportFetchedRef = useRef(false);
  const reportRef = useRef<HTMLElement | null>(null);
  const wantsReportViewRef = useRef(false);

  useEffect(() => { if (hasLedgerUnlock(REPORT_FEATURE_KEY)) setLedgerUnlocked(true); }, []);

  const reportUnlocked = ledgerUnlocked || unlocked[REPORT_FEATURE_KEY] === true;
  // 🔴 "확인 실패"를 "미구매"로 취급하지 않는다 — 서버 판정이 끝났을 때만 잠금으로 본다.
  const reportConfirmedLocked = unlockStatus === "ready" && !reportUnlocked;

  // 생년 정보 완성도 — 리포트 자동조회 이펙트가 참조하므로 이펙트보다 위에서 계산한다.
  const validBirth = /^\d{4}-\d{2}-\d{2}$/.test(form.birthDate);
  const birthComplete = validBirth && !!form.gender && (form.birthTimeUnknown || /^\d{2}:\d{2}$/.test(form.birthTime));
  const showBirthConfirm = birthComplete && !birthEditing;

  // 사용자가 생년 정보를 직접 만지면 시드 자동반영 중단(빈 값만 채우는 원칙)
  function patchForm(patch: Partial<typeof form>) { formTouchedRef.current = true; setForm((f) => ({ ...f, ...patch })); }

  // 프로필 카드/섬 핸드오프 시드를 폼에 채움. 개별 필드 독립 적용(부분 등록 대응), 사용자 편집값 미덮어씀.
  function applySeedToForm(seed: SeedLike | null, force = false) {
    if (!seed) return;
    if (!force && formTouchedRef.current) return;
    setForm((f) => ({
      ...f,
      name: seed.name || f.name,
      gender: (seed.gender === "male" || seed.gender === "female" || seed.gender === "unknown") ? seed.gender as Gender : f.gender,
      birthDate: seed.birthDate || f.birthDate,
      birthTimeUnknown: seed.birthTimeUnknown ?? f.birthTimeUnknown,
      birthTime: seed.birthTimeUnknown ? "" : (seed.birthTime || f.birthTime),
      calendarType: (seed.calendarType === "lunar" ? "lunar" : "solar"),
      isLeapMonth: seed.calendarType === "lunar" ? (seed.isLeapMonth ?? f.isLeapMonth) : false,
    }));
  }

  // 마운트: 섬에서 넘어온 명반 시드(우선) + ?palace= 진입
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("cdIslandConsultSeed");
      if (raw) {
        sessionStorage.removeItem("cdIslandConsultSeed");
        const handoff = JSON.parse(raw) as SeedLike;
        if (handoff && handoff.birthDate) { applySeedToForm(handoff, true); seedAppliedRef.current = true; }
      }
      const params = new URLSearchParams(window.location.search);
      const q = params.get("palace") || "";
      const found = PALACES.find((p) => p.name === q);
      if (found) { setPalace(found); setPhase("form"); }
      if (params.get("view") === "report") wantsReportViewRef.current = true;
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 프로필 카드 시드가 늦게 도착해도 사용자 입력 전이면 반영(핸드오프가 이미 있으면 스킵)
  useEffect(() => {
    if (seedAppliedRef.current || !profileSeed) return;
    if (profileSeed.birthDate) seedAppliedRef.current = true;
    applySeedToForm(profileSeed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion, profileSeed]);

  // 해금된 사용자의 리포트 본문을 가져온다. 미해금이면 서버가 402를 주므로 잠금 상태를 그대로 둔다.
  async function loadReport() {
    if (reportLoading) return;
    setReportLoading(true);
    setReportError("");
    try {
      const { status, data } = await postJson<{ ok?: boolean; report?: IslandReport; reason?: string }>(REPORT_ENDPOINT, {
        birthDate: form.birthDate,
        birthTime: form.birthTimeUnknown ? "" : form.birthTime,
        birthTimeUnknown: form.birthTimeUnknown,
        gender: form.gender,
        calendarType: form.calendarType,
        isLeapMonth: form.calendarType === "lunar" ? form.isLeapMonth : false,
      }, `${REPORT_FEATURE_KEY}:${Date.now()}`);
      if (data.ok && data.report) { setReport(data.report); reportFetchedRef.current = true; return; }
      if (status === 402 || data.reason === "PAYMENT_REQUIRED") return;           // 잠금 유지
      if (status === 401 || data.reason === "LOGIN_REQUIRED") { setReportError(ERROR_TEXT.LOGIN_REQUIRED); return; }
      if (status === 503 || data.reason === "DB_DEGRADED") { setReportError("연결이 잠시 불안정해요. 잠시 후 다시 시도해 주세요."); return; }
      setReportError("리포트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } catch {
      setReportError("리포트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setReportLoading(false);
    }
  }

  // 해금 상태 + 생년 정보가 갖춰지면 한 번만 자동으로 본문을 채운다.
  useEffect(() => {
    if (!reportUnlocked || !birthComplete || report || reportFetchedRef.current || reportLoading) return;
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportUnlocked, birthComplete, report]);

  // ?view=report 로 들어오면 리포트 섹션으로 데려간다(폼 자동 진입 뒤 한 박자 늦게).
  useEffect(() => {
    if (!wantsReportViewRef.current || phase !== "form" || !reportRef.current) return;
    wantsReportViewRef.current = false;
    reportRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase, palace]);

  async function unlockReport() {
    if (isPaying || reportLoading) return;
    setReportError("");
    const r = await ensurePaidAccess({
      featureKey: REPORT_FEATURE_KEY,
      coinPrice: REPORT_COIN_PRICE,
      cost: REPORT_COIN_PRICE,
      amountKRW: REPORT_AMOUNT_KRW,
      reason: REPORT_REASON,
      requestId: `${REPORT_FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    });
    if (!r.ok) {
      if (r.code === "AUTH_REQUIRED" || r.code === "LOGIN_REQUIRED") { setReportError(ERROR_TEXT.LOGIN_REQUIRED); return; }
      if (r.code !== "PAYMENT_CANCELLED") setReportError(r.message || "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    // 서버 스냅샷이 반영되기 전까지 낙관적으로 열어 둔다(원장에도 기록되어 새로고침·다른 탭에서 유지).
    markOptimisticallyUnlocked(REPORT_FEATURE_KEY);
    setLedgerUnlocked(true);
    reportFetchedRef.current = false;
    await loadReport();
    void refetchUnlocks({ force: true });
  }

  function pickPalace(p: Palace) { setPalace(p); setError(""); setPhase("form"); }

  async function pollResult(sessionId: string): Promise<ApiResult> {
    const backoff = [700, 3000, 5000, 8000];
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await sleep(backoff[Math.min(attempt, backoff.length - 1)]);
      let response: Response;
      try { response = await authFetch(`${RESULT}?id=${encodeURIComponent(sessionId)}`, { method: "GET" }, { retryOn401: false }); }
      catch { continue; }
      if (response.status === 202) continue;
      const data = (await response.json().catch(() => ({}))) as ApiResult;
      if (isRetriableResultPollFailure(response.status, data)) continue;
      if (!response.ok) throw new Error(mapError(data, response.status));
      return data;
    }
    throw new Error("상담 생성이 평소보다 오래 걸리고 있어요. 페이지를 닫지 말고 잠시 후 다시 시도해 주세요.");
  }

  async function generate(idempotencyKey: string, payload: Record<string, unknown>, extra: Record<string, unknown>) {
    setPhase("reading");
    releasePaidFeatureGate(idempotencyKey);
    setNotice(`${palace?.name}의 별을 읽고 있어요…`);
    const { status, data } = await postJson<ApiResult>(GENERATE, { ...payload, ...extra, idempotencyKey }, idempotencyKey);
    if (data.ok && data.consultation) { setResult(data.consultation); setPhase("ready"); setNotice(""); return; }
    if (status === 202 && data.sessionId) {
      const resolved = await pollResult(data.sessionId);
      if (resolved.ok && resolved.consultation) { setResult(resolved.consultation); setPhase("ready"); setNotice(""); return; }
      throw new Error(mapError(resolved, 0));
    }
    throw new Error(mapError(data, status));
  }

  async function startConsult(e: FormEvent) {
    e.preventDefault();
    if (busyRef.current || !palace) return;
    setError("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) { setError("생년월일을 확인해 주세요."); return; }
    if (!form.gender) { setError("성별을 선택해 주세요."); return; }
    if (!form.birthTimeUnknown && !/^\d{2}:\d{2}$/.test(form.birthTime)) { setError("출생시간을 입력하거나 ‘모름’을 선택해 주세요."); return; }
    busyRef.current = true;
    const idempotencyKey = createRequestId();
    const birthInfo = {
      name: form.name.trim(), gender: form.gender, birthDate: form.birthDate,
      birthTime: form.birthTimeUnknown ? "" : form.birthTime, birthTimeUnknown: form.birthTimeUnknown,
      calendarType: form.calendarType, isLeapMonth: form.calendarType === "lunar" ? form.isLeapMonth : false,
    };
    const payload: Record<string, unknown> = {
      palaceKey: palace.name, serviceType: FEATURE_KEY, ...birthInfo, birthInfo,
      userQuestion: form.question.trim(), question: form.question.trim(), locale: "ko", requestId: idempotencyKey, idempotencyKey,
    };
    let gateStarted = false;
    try {
      setPhase("checking");
      setNotice("이용권을 확인하는 중이에요…");
      beginPaidFeatureGateCheck({ featureKey: FEATURE_KEY, requestId: idempotencyKey, title: "이용권 확인", reason: FEATURE_REASON, paymentMode: "MEMBERSHIP_PASS" });
      // 이용권 판정(unlock-status)을 아래 prepare 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
      void primePaymentEligibility(buildBillingGateInput({}, idempotencyKey));
      gateStarted = true;
      holdPaidFeatureGateOpen({ requestId: idempotencyKey, maxMs: 8000 });
      const { status, data } = await runAccessCheckWithTransientRetry(
        () => postJson<ApiResult>(PREPARE, payload, idempotencyKey),
        { onRetry: () => setNotice("연결이 잠시 불안정해요. 이용권을 다시 확인하는 중이에요.") },
      );
      if (data.ok) {
        completePaidFeatureGateCheck({ featureKey: FEATURE_KEY, requestId: idempotencyKey, title: "이용권 확인 완료", reason: FEATURE_REASON, paymentMode: "MEMBERSHIP_PASS", message: "확인이 끝났어요. 궁의 별을 읽어 드릴게요." });
        await generate(idempotencyKey, payload, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      if (data.reason === "LOGIN_REQUIRED" || status === 401) throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
      if (data.reason === "INVALID_INPUT") throw new Error(mapError(data, status));
      const degraded = isRetriableResultPollFailure(status, data);
      if (!degraded && data.reason !== "PAYMENT_REQUIRED") throw new Error(mapError(data, status));
      setPhase("payment");
      setNotice("결제창을 확인해 주세요");
      const gate = await runBillingCoinGate(buildBillingGateInput(asRecord((data as { paymentPayload?: unknown }).paymentPayload), idempotencyKey));
      if (!isPaymentGranted(gate)) {
        const code = String((gate as { error?: { code?: string } }).error?.code || "").toUpperCase();
        if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
        if (code === "PAYMENT_CANCELLED") throw new Error(ERROR_TEXT.PAYMENT_CANCELLED);
        throw new Error((gate as { error?: { message?: string } }).error?.message || ERROR_TEXT.PAYMENT_VERIFY_FAILED);
      }
      await generate(idempotencyKey, payload, extractPayment(gate, idempotencyKey));
    } catch (err) {
      if (gateStarted) releasePaidFeatureGate(idempotencyKey);
      setError(err instanceof Error ? err.message : ERROR_TEXT.SERVER_ERROR);
      setNotice("");
      setPhase("form");
    } finally {
      busyRef.current = false;
    }
  }

  function reportPages(current: Palace): ResultViewerPage[] {
    if (!report) return [];
    // 용어와 명반 골격을 먼저 알려 주는 안내 장(__intro)이 있으면 맨 앞에 둔다.
    const intro = report.palaces?.__intro;
    const introPage: ResultViewerPage[] = intro
      ? [{
        id: "__intro",
        label: intro.title,
        content: (
          <div className="ic-rpt-page">
            <h3 className="ic-rpt-page__title"><span className="ic-rpt-page__mark" aria-hidden="true">✦</span> {intro.title}</h3>
            <p className="ic-rpt-page__meta">{intro.focus}</p>
            {intro.sections.map((sec) => (
              <section key={sec.key} className="ic-rpt-sec">
                <h4>{sec.title}</h4>
                <AiResultProse value={sec.body} />
              </section>
            ))}
          </div>
        ),
      }]
      : [];
    // 고른 궁을 맨 앞에 둔다 — 사용자가 그 궁을 보러 들어왔기 때문.
    const order = [current.name, ...PALACES.map((p) => p.name).filter((n) => n !== current.name)];
    return introPage.concat(order.flatMap((name) => {
      const entry = report.palaces?.[name];
      if (!entry) return [];
      const meta = PALACES.find((p) => p.name === name);
      return [{
        id: name,
        label: `${name} · ${entry.title}`,
        content: (
          <div className="ic-rpt-page">
            <h3 className="ic-rpt-page__title">{meta ? <PalaceBadge palace={meta} size="small" /> : <span className="ic-rpt-page__mark" aria-hidden="true">✦</span>} {name} · {entry.title}</h3>
            <p className="ic-rpt-page__meta">{entry.tierLabel} · {entry.focus}</p>
            {entry.sections.map((sec) => (
              <section key={sec.key} className="ic-rpt-sec">
                <h4>{sec.title}</h4>
                <AiResultProse value={sec.body} />
              </section>
            ))}
          </div>
        ),
      }];
    }));
  }

  function renderReportSection(current: Palace) {
    if (reportUnlocked && report) {
      return (
        <section className="ic-report ic-report--open" ref={reportRef} aria-label="12궁 전체 심층 리포트">
          <div className="ic-report__visual"><Image src={CONSULT_REPORT_COVER} alt="운명의 섬 별자리 리포트 표지" width={720} height={960} loading="lazy" /></div>
          <div className="ic-report__head">
            <span className="ic-report__tag">열람 중</span>
            <h2 className="ic-report__title">12궁 전체 심층 리포트</h2>
            <p className="ic-report__lead">{report.biome?.label ? `${report.biome.label} · ` : ""}열두 궁을 명반에서 정밀 판독한 결과예요.</p>
          </div>
          <PagedResultViewer
            pages={reportPages(current)}
            deckLabel="12궁 전체 심층 리포트"
            viewAll={reportViewAll}
            onViewAllChange={setReportViewAll}
          />
        </section>
      );
    }

    return (
      <section className="ic-report" ref={reportRef} aria-label="12궁 전체 심층 리포트 안내">
        <div className="ic-report__visual"><Image src={CONSULT_REPORT_COVER} alt="운명의 섬 별자리 리포트 표지" width={720} height={960} loading="lazy" /></div>
        <div className="ic-report__head">
          <span className="ic-report__tag">1회 해금</span>
          <h2 className="ic-report__title">12궁 전체 심층 리포트</h2>
          <p className="ic-report__lead">명궁부터 전택궁까지 <strong>열두 자리를 한 번에</strong> 정밀 판독합니다.</p>
        </div>
        <ul className="ic-report__list">
          <li>궁마다 3~4개 섹션 — 본질 · 강점 · 그림자 · 올해의 과제처럼 자리마다 다른 축</li>
          <li>주성과 밝기, 사화, 살성, 이웃 궁의 공명, 대운 구간을 종합한 판독</li>
          <li>한 번 열면 계속 볼 수 있어요 — 다시 결제하지 않습니다</li>
        </ul>
        {reportError && <p className="ic-err" role="alert">{reportError}</p>}
        {!birthComplete && <p className="ic-report__hint">아래에서 생년 정보를 먼저 확인해 주세요.</p>}
        <button
          type="button"
          className="ic-primary"
          onClick={unlockReport}
          disabled={isPaying || reportLoading || !birthComplete || (!reportConfirmedLocked && unlockStatus === "loading")}
        >
          {reportLoading ? "리포트를 여는 중…" : isPaying ? "결제 확인 중…" : "🗺️ 심층 리포트 열기 · 5,000원"}
        </button>
        <p className="ic-note">이용권이 있으면 결제 없이 바로 열려요.</p>
      </section>
    );
  }

  return (
    <div className="ic-root">
      <style>{CSS}</style>
      <div className="ic-topbar"><a className="ic-topbar__back" href="/destiny-island" aria-label="운명의 섬 지도로 돌아가기">← 운명의 섬</a></div>
      <header className="ic-head">
        <div className="ic-hero-art" aria-hidden="true">
          <Image src={CONSULT_HERO} alt="" fill priority sizes="(max-width: 720px) 100vw, 1040px" />
        </div>
        <div className="ic-head__content">
          <p className="ic-eyebrow">紫微斗數 · 운명의 섬</p>
          <h1 className="ic-title">12궁 심층 상담</h1>
          <p className="ic-sub">궁의 문을 열면, 연이와 네오가 그 자리의 별과 사화·대운을 지금 고민에 맞춰 깊이 읽어드려요.</p>
          <div className="ic-guides" aria-label="상담 안내자"><span><span className="ic-guide__avatar"><Image src={YEON_AV} alt="" width={30} height={30} unoptimized /></span><b>연이</b> 마음의 결을 살펴요</span><span><span className="ic-guide__avatar ic-guide__avatar--neo"><Image src={NEO_AV} alt="" width={30} height={30} unoptimized /></span><b>네오</b> 다음 수를 짚어요</span></div>
        </div>
      </header>

      {phase === "hub" && (
        <ul className="ic-grid" aria-label="12궁 선택">
          {PALACES.map((p) => (
            <li key={p.name}>
              <button type="button" className="ic-card" onClick={() => pickPalace(p)} aria-label={`${p.name} ${p.title} 상담 선택`}>
                <PalaceBadge palace={p} />
                <span className="ic-card__name">{p.name}</span>
                <span className="ic-card__title">{p.title}</span>
                <span className="ic-card__theme">{p.theme}</span>
                <span className="ic-card__cta" aria-hidden="true">상담 →</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {phase === "form" && palace && (
        <div className="ic-stack">
          <div className="ic-picked"><PalaceBadge palace={palace} size="small" /> <strong>{palace.name}</strong> · {palace.title} <button type="button" className="ic-change" onClick={() => { setPhase("hub"); setPalace(null); }}>다른 궁</button></div>

          {renderReportSection(palace)}

          <form className="ic-form" onSubmit={startConsult}>
          <div className="ic-lead">
            <span className="ic-lead__tag">전문가 상담</span>
            <p className="ic-lead__desc"><strong>{palace.name} 하나</strong>를 지금 고민에 맞춰 연이·네오가 새로 읽어 드려요.</p>
          </div>
          {showBirthConfirm ? (
            <div className="ic-confirm">
              <div className="ic-confirm__head">
                <span className="ic-confirm__badge">✓ 내 프로필 명반</span>
                <button type="button" className="ic-change" onClick={() => setBirthEditing(true)}>정보 변경</button>
              </div>
              <dl className="ic-confirm__dl">
                <div><dt>생년월일</dt><dd>{calLabel(form)} {form.birthDate.replace(/-/g, ".")}</dd></div>
                <div><dt>태어난 시각</dt><dd>{form.birthTimeUnknown ? "모름 (정오 기준)" : (form.birthTime || "—")}</dd></div>
                <div><dt>성별</dt><dd>{form.gender === "male" ? "남성" : form.gender === "female" ? "여성" : "—"}</dd></div>
              </dl>
              <p className="ic-confirm__note">프로필 카드에서 자동으로 불러왔어요. 이대로 상담을 시작할 수 있어요.</p>
            </div>
          ) : (
            <>
              <label className="ic-field"><span>생년월일</span><input {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => patchForm({ birthDate: nextBirthDate }))} required /></label>
              <label className="ic-field"><span>태어난 시간</span><input type="time" value={form.birthTime} disabled={form.birthTimeUnknown} onChange={(e) => patchForm({ birthTime: e.target.value })} /></label>
              <label className="ic-check"><input type="checkbox" checked={form.birthTimeUnknown} onChange={(e) => patchForm({ birthTimeUnknown: e.target.checked })} /> 태어난 시간을 몰라요 (정오 기준)</label>
              <div className="ic-segrow">
                <div className="ic-seg" role="group" aria-label="성별">
                  <button type="button" className={form.gender === "female" ? "on" : ""} onClick={() => patchForm({ gender: "female" })}>여성</button>
                  <button type="button" className={form.gender === "male" ? "on" : ""} onClick={() => patchForm({ gender: "male" })}>남성</button>
                </div>
                <div className="ic-seg" role="group" aria-label="달력">
                  <button type="button" className={form.calendarType === "solar" ? "on" : ""} onClick={() => patchForm({ calendarType: "solar" })}>양력</button>
                  <button type="button" className={form.calendarType === "lunar" ? "on" : ""} onClick={() => patchForm({ calendarType: "lunar" })}>음력</button>
                </div>
              </div>
              {form.calendarType === "lunar" && (
                <label className="ic-check"><input type="checkbox" checked={form.isLeapMonth} onChange={(e) => patchForm({ isLeapMonth: e.target.checked })} /> 윤달이에요</label>
              )}
              {birthComplete && <button type="button" className="ic-change ic-change--done" onClick={() => setBirthEditing(false)}>✓ 이 정보로 확인</button>}
            </>
          )}
          <label className="ic-field"><span>이 궁에 묻고 싶은 것 (선택)</span><textarea value={form.question} maxLength={400} rows={2} placeholder={`${palace.name}과 관련해 지금 가장 궁금한 점을 적어주세요`} onChange={(e) => setForm({ ...form, question: e.target.value })} /></label>
          {error && <p className="ic-err" role="alert">{error}</p>}
          <button type="submit" className="ic-primary" disabled={isPaying}>🔮 {palace.name} 심층 상담 시작 · 20,000원</button>
          <p className="ic-note">이용권·월정석이 있으면 자동으로 먼저 적용돼요. 생성에 실패하면 자동 환불됩니다.</p>
          </form>
        </div>
      )}

      {(phase === "checking" || phase === "payment" || phase === "reading") && (
        <div className="ic-loading">
          <div className="ic-loading__art"><Image src={CONSULT_READING} alt="별자리 지도를 읽는 중" width={720} height={720} loading="lazy" /></div>
          <div className="ic-orb" aria-hidden="true" />
          <p>{notice || "준비하고 있어요…"}</p>
        </div>
      )}

      {phase === "ready" && result && (
        <article className="ic-result">
          <div className="ic-result__hero"><Image src={CONSULT_READING} alt="운명의 섬 별자리 지도와 관측 도구" width={720} height={720} loading="lazy" /></div>
          <div className="ic-result__heading"><PalaceBadge palace={PALACES.find((p) => p.name === result.palaceKey) || PALACES[0]} size="result" /><div><p className="ic-result__eyebrow">당신의 궁이 보내온 편지</p><h2 className="ic-result__title">{result.palaceKey} · {result.palaceTitle}</h2></div></div>
          {result.result?.meta?.daeun ? <p className="ic-result__meta">{toText(result.result.meta.daeun)}</p> : null}
          {(result.sectionKeys || []).map((key) => {
            const sec = result.result?.sections?.[key];
            if (!sec || !sec.body) return null;
            return (
              <section key={key} className="ic-sec">
                <h3>{sec.title || key}</h3>
                {String(sec.body).split(/\n{2,}|\n/).filter(Boolean).map((para, i) => <p key={i}>{para}</p>)}
              </section>
            );
          })}
          <div className="ic-result__foot">
            <button type="button" className="ic-back-btn" onClick={() => { setResult(null); setPhase("hub"); setPalace(null); }}>다른 궁도 상담하기</button>
            <a className="ic-back" href="/destiny-island">← 운명의 섬으로</a>
          </div>
        </article>
      )}

      {phase !== "ready" && (
        <footer className="ic-foot"><a className="ic-back" href="/destiny-island">← 운명의 섬으로 돌아가기</a></footer>
      )}
    </div>
  );
}

const CSS = `
/* dvh: 100vh 는 주소창/시스템 바 높이를 빼지 않아 앱(edge-to-edge)에서 화면보다 커진다.
   하단 패딩은 전역 네비(.cd-mnav)까지 감안한다 — --cd-mnav-offset 은 safe-area 를 이미
   포함하고 네비가 없는 뷰포트에서는 0 이라 데스크톱 여백은 종전과 같다. */
.ic-root{min-height:100dvh;padding:calc(24px + env(safe-area-inset-top)) 16px calc(32px + var(--cd-mnav-offset, env(safe-area-inset-bottom)));color:#241f47;
  font-family:'CodeDestinyBody','Pretendard','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif;
  background:radial-gradient(130% 100% at 50% 0%,#cbd0f5 0%,#b9b3ea 42%,#a99fdd 100%)}
.ic-head{max-width:760px;margin:0 auto 20px;text-align:center}
.ic-avatars{display:flex;justify-content:center;margin-bottom:12px}
.ic-av{width:72px;height:72px;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,.75);box-shadow:0 8px 26px rgba(60,40,110,.28);background:#efeaff}
.ic-av--yeon{margin-right:-14px;z-index:2}
.ic-av--neo{border-color:rgba(232,213,163,.9)}
.ic-av :global(img){width:100%;height:100%;object-fit:cover;object-position:50% 18%}
.ic-eyebrow{font-size:.82rem;letter-spacing:.14em;font-weight:700;color:#6a4fb0}
.ic-title{font-family:'CodeDestinyDisplay','Mulmaru','Nanum Myeongjo',serif;font-size:clamp(1.8rem,6vw,2.5rem);font-weight:800;margin:4px 0 8px;color:#2a1f5e;text-shadow:0 2px 14px rgba(255,255,255,.5)}
.ic-sub{max-width:44ch;margin:0 auto;font-size:.96rem;line-height:1.75;color:#3d356e;word-break:keep-all}
.ic-grid{max-width:920px;margin:0 auto;list-style:none;padding:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.ic-card{display:flex;flex-direction:column;align-items:center;gap:3px;width:100%;min-height:150px;padding:18px 12px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.7);cursor:pointer;text-align:center;
  background:linear-gradient(180deg,rgba(255,255,255,.82),rgba(255,255,255,.62));-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  box-shadow:0 10px 26px rgba(70,48,130,.16),inset 0 1px 0 rgba(255,255,255,.9);transition:transform .18s cubic-bezier(.16,1,.3,1),box-shadow .2s,border-color .2s}
.ic-card:hover,.ic-card:focus-visible{transform:translateY(-4px);border-color:#b79cf0;outline:none;box-shadow:0 18px 40px rgba(70,48,130,.26),0 0 0 3px rgba(183,156,240,.35)}
.ic-card__icon{font-size:2rem;filter:drop-shadow(0 3px 6px rgba(90,60,150,.28))}
.ic-card__name{font-family:'CodeDestinyDisplay','Mulmaru',serif;font-weight:800;font-size:1.06rem;color:#2a1f5e;margin-top:6px}
.ic-card__title{font-size:.82rem;color:#6a4fb0;font-weight:700}
.ic-card__theme{font-size:.78rem;color:#5c5488;line-height:1.5;margin-top:2px}
.ic-card__cta{margin-top:auto;font-size:.8rem;font-weight:800;color:#8a5fd0}
.ic-form{max-width:440px;margin:0 auto;background:rgba(255,255,255,.72);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,.7);border-radius:22px;padding:20px;box-shadow:0 16px 40px rgba(70,48,130,.2)}
.ic-picked{font-weight:700;color:#2a1f5e;margin-bottom:14px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
/* ── 3단 스택: 궁 헤더 → ₩5,000 12궁 리포트 → ₩20,000 상담 폼 ── */
.ic-stack{max-width:680px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.ic-stack .ic-picked{max-width:440px;width:100%;margin:0 auto}
.ic-stack .ic-form{width:100%}
/* 두 유료 상품이 나란히 서므로, 각 카드가 자기 범위를 먼저 말한다(넓게 vs 깊게). */
.ic-lead{margin-bottom:14px}
.ic-lead__tag{display:inline-block;font-size:.72rem;font-weight:800;letter-spacing:.06em;color:#6a4fb0;
  background:rgba(138,95,208,.14);border-radius:999px;padding:4px 11px}
.ic-lead__desc{margin:7px 0 0;font-size:.88rem;line-height:1.7;color:#5c5488;word-break:keep-all}
.ic-lead__desc strong{color:#2a1f5e}
.ic-report{max-width:440px;width:100%;margin:0 auto;background:rgba(255,255,255,.72);
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,.7);border-radius:22px;padding:20px;box-shadow:0 16px 40px rgba(70,48,130,.2)}
.ic-report--open{max-width:680px}
.ic-report__head{margin-bottom:12px}
.ic-report__tag{display:inline-block;font-size:.72rem;font-weight:800;letter-spacing:.06em;color:#6a4fb0;
  background:rgba(138,95,208,.14);border-radius:999px;padding:4px 11px}
.ic-report__title{font-family:'CodeDestinyDisplay','Mulmaru',serif;font-size:1.22rem;color:#2a1f5e;margin:8px 0 4px}
.ic-report__lead{font-size:.9rem;line-height:1.7;color:#5c5488;word-break:keep-all;margin:0}
.ic-report__lead strong{color:#2a1f5e}
.ic-report__list{list-style:none;padding:0;margin:14px 0;display:flex;flex-direction:column;gap:8px}
.ic-report__list li{position:relative;padding-left:15px;font-size:.88rem;line-height:1.7;color:#332b5e;word-break:keep-all}
.ic-report__list li::before{content:"";position:absolute;left:0;top:.66em;width:5px;height:5px;border-radius:50%;background:#8a5fd0}
.ic-report__hint{font-size:.82rem;color:#6a4fb0;margin:0 0 10px;line-height:1.6}
.ic-primary:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
/* 해금 본문 — PagedResultViewer는 currentColor 기반이라 부모 색만 정해주면 된다. */
.ic-report--open{color:#332b5e}
.ic-rpt-page__title{font-family:'CodeDestinyDisplay','Mulmaru',serif;font-size:1.12rem;color:#2a1f5e;margin:0 0 3px}
.ic-rpt-page__meta{font-size:.82rem;color:#6a4fb0;margin:0 0 14px}
.ic-rpt-sec{margin-bottom:16px}
.ic-rpt-sec h4{font-family:'CodeDestinyDisplay','Mulmaru',serif;font-size:1rem;color:#7a4fc0;margin:0 0 5px}
.ic-rpt-sec p{font-size:.94rem;line-height:1.85;color:#332b5e;word-break:keep-all}
.ic-change{margin-left:auto;font-size:.78rem;color:#6a4fb0;background:none;border:1px solid rgba(106,79,176,.35);border-radius:999px;padding:5px 12px;cursor:pointer;min-height:36px}
.ic-field{display:block;margin-bottom:12px}
.ic-field>span{display:block;font-size:.82rem;font-weight:700;color:#5c5488;margin-bottom:5px}
.ic-field input,.ic-field textarea{width:100%;min-height:46px;padding:10px 12px;border-radius:12px;border:1px solid rgba(106,79,176,.28);background:#fff;color:#241f47;font:inherit;resize:vertical}
.ic-field input:focus,.ic-field textarea:focus{outline:2px solid #b79cf0;outline-offset:1px}
.ic-check{display:flex;align-items:center;gap:8px;font-size:.86rem;color:#5c5488;min-height:40px;margin-bottom:8px}
.ic-check input{width:18px;height:18px;accent-color:#8a5fd0}
.ic-segrow{display:flex;gap:10px;margin-bottom:12px}
.ic-seg{flex:1;display:flex;gap:6px}
.ic-seg button{flex:1;min-height:44px;border-radius:12px;border:1px solid rgba(106,79,176,.28);background:#fff;color:#5c5488;font-weight:700;cursor:pointer}
.ic-seg button.on{background:rgba(138,95,208,.16);color:#2a1f5e;border-color:#b79cf0}
.ic-err{color:#c2410c;font-size:.86rem;margin:4px 0 8px}
.ic-primary{width:100%;min-height:54px;border:0;border-radius:999px;font-weight:800;font-size:1.02rem;cursor:pointer;color:#241a05;
  background:linear-gradient(135deg,#f2d78d,#d4b96a);box-shadow:0 10px 26px rgba(180,150,80,.4)}
.ic-primary:active{transform:scale(.98)}
.ic-note{font-size:.78rem;color:#6a4fb0;text-align:center;margin-top:10px;line-height:1.6}
.ic-loading{max-width:440px;margin:40px auto;text-align:center;color:#3d356e}
.ic-orb{width:60px;height:60px;margin:0 auto 16px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#fff,#c9b8f5 40%,#8a5fd0 70%,transparent 78%);box-shadow:0 0 40px rgba(138,95,208,.55);animation:icorb 2.2s ease-in-out infinite}
@keyframes icorb{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.12);opacity:1}}
.ic-result{max-width:680px;margin:0 auto;background:rgba(255,255,255,.8);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.75);border-radius:22px;padding:22px;box-shadow:0 16px 44px rgba(70,48,130,.22)}
.ic-result__title{font-family:'CodeDestinyDisplay','Mulmaru',serif;font-size:1.4rem;color:#2a1f5e;margin-bottom:4px}
.ic-result__meta{color:#6a4fb0;font-size:.86rem;margin-bottom:14px}
.ic-sec{margin-bottom:18px}
.ic-sec h3{font-family:'CodeDestinyDisplay','Mulmaru',serif;font-size:1.08rem;color:#7a4fc0;margin-bottom:6px}
.ic-sec p{font-size:.96rem;line-height:1.85;color:#332b5e;margin-bottom:8px;word-break:keep-all}
.ic-result__foot{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px}
.ic-back-btn{min-height:46px;padding:9px 18px;border-radius:999px;border:1px solid #b79cf0;background:rgba(138,95,208,.12);color:#6a4fb0;font-weight:800;cursor:pointer}
.ic-foot{max-width:760px;margin:22px auto 0;text-align:center}
.ic-back{display:inline-block;color:#6a4fb0;font-weight:700;text-decoration:none;padding:9px 18px;border-radius:999px;border:1px solid rgba(106,79,176,.35);min-height:44px;line-height:26px}
.ic-back:hover{background:rgba(255,255,255,.5)}
.ic-topbar{position:sticky;top:calc(8px + env(safe-area-inset-top));z-index:6;max-width:920px;margin:0 auto 12px;display:flex}
.ic-topbar__back{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:9px 18px;border-radius:999px;font-weight:800;font-size:.9rem;text-decoration:none;color:#3d2f7a;
  background:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.85);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 6px 20px rgba(70,48,130,.18);transition:transform .16s cubic-bezier(.16,1,.3,1),background .2s}
.ic-topbar__back:hover{background:rgba(255,255,255,.92);transform:translateY(-1px)}
.ic-confirm{border:1px solid rgba(138,95,208,.28);border-radius:16px;padding:15px 16px;margin-bottom:14px;
  background:linear-gradient(180deg,rgba(255,255,255,.8),rgba(244,240,255,.62));box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}
.ic-confirm__head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.ic-confirm__badge{font-size:.76rem;font-weight:800;color:#6a4fb0;background:rgba(138,95,208,.14);border-radius:999px;padding:5px 12px}
.ic-confirm__dl{display:grid;gap:9px;margin:0}
.ic-confirm__dl>div{display:flex;justify-content:space-between;gap:14px;font-size:.92rem;align-items:baseline}
.ic-confirm__dl dt{color:#6a5c9a;font-weight:700;flex:none}
.ic-confirm__dl dd{color:#2a1f5e;font-weight:800;margin:0;text-align:right}
.ic-confirm__note{font-size:.78rem;color:#6a4fb0;margin-top:12px;line-height:1.6}
.ic-change--done{margin:2px 0 12px;width:100%;min-height:44px}
/* ── 별자리 동화책 리디자인 ── */
.ic-root{color:#f6f0ff;background:radial-gradient(120% 70% at 50% -10%,#5b4f91 0%,#2d265e 46%,#14112f 100%);}
.ic-topbar__back{color:#f8edc9;background:rgba(25,19,56,.78);border-color:rgba(232,213,163,.38);box-shadow:0 8px 24px rgba(5,3,18,.32)}
.ic-topbar__back:hover{background:rgba(46,35,86,.92)}
.ic-head{position:relative;isolation:isolate;max-width:1040px;min-height:350px;margin:0 auto 24px;overflow:hidden;text-align:left;border:1px solid rgba(232,213,163,.35);border-radius:30px;background:#211a47;box-shadow:0 24px 70px rgba(5,3,18,.38),0 1px 0 rgba(255,255,255,.12) inset}
.ic-head::after{content:"";position:absolute;inset:0;z-index:0;background:linear-gradient(90deg,rgba(20,15,46,.98) 0%,rgba(20,15,46,.88) 34%,rgba(20,15,46,.18) 68%,rgba(20,15,46,.05) 100%);pointer-events:none}
.ic-hero-art{position:absolute;inset:0;z-index:-1}
.ic-hero-art img{object-fit:cover;object-position:center;opacity:.96}
.ic-head__content{position:relative;z-index:1;width:min(54%,480px);padding:64px 34px 54px 48px}
.ic-eyebrow{color:#f2d994;font-size:.76rem;letter-spacing:.13em}
.ic-title{color:#fff7e1;font-size:clamp(2rem,5vw,3.15rem);line-height:1.18;text-shadow:0 4px 20px rgba(0,0,0,.35)}
.ic-sub{color:#e0d4fa;max-width:38ch;font-size:1rem;line-height:1.8}
.ic-guides{display:flex;gap:7px;flex-wrap:wrap;margin-top:22px}
.ic-guides span{padding:6px 10px;border-radius:999px;border:1px solid rgba(232,213,163,.27);background:rgba(232,213,163,.08);color:#d9cdf1;font-size:.76rem}
.ic-guides .ic-guide__avatar{display:inline-flex;width:30px;height:30px;padding:0;margin:-3px 5px -3px -5px;overflow:hidden;vertical-align:middle;border:1px solid rgba(244,190,209,.48);border-radius:50%;background:rgba(255,255,255,.08)}
.ic-guides .ic-guide__avatar img{width:100%;height:100%;object-fit:cover;object-position:50% 18%}.ic-guides .ic-guide__avatar--neo{border-color:rgba(232,213,163,.52)}
.ic-guides b{color:#f8d9e4;margin-right:4px}.ic-guides span+span b{color:#f3dd9e}
.ic-grid{max-width:1040px;gap:14px}
.ic-card{min-height:190px;padding:18px 12px 15px;border-color:rgba(232,213,163,.24);background:linear-gradient(160deg,rgba(45,35,88,.94),rgba(26,20,56,.96));box-shadow:0 14px 32px rgba(5,3,18,.28),0 1px 0 rgba(255,255,255,.08) inset}
.ic-card:hover,.ic-card:focus-visible{border-color:rgba(232,213,163,.75);box-shadow:0 20px 44px rgba(5,3,18,.42),0 0 0 3px rgba(232,213,163,.16);transform:translateY(-5px)}
.ic-palace-art{display:inline-block;flex:none;width:94px;height:70px;background-repeat:no-repeat;background-size:400% 300%;border-radius:18px;filter:drop-shadow(0 7px 8px rgba(4,2,16,.38))}
.ic-palace-art--small{width:30px;height:23px;border-radius:7px;vertical-align:-6px}
.ic-palace-art--result{width:58px;height:44px;border-radius:12px}
.ic-card__name{color:#fff7e1;font-size:1.08rem;margin-top:8px}
.ic-card__title{color:#f1d99a}.ic-card__theme{color:#c9bae9}.ic-card__cta{color:#f2d994}
.ic-picked{color:#fff4d9}.ic-picked .ic-palace-art--small{margin-right:2px}
.ic-change{color:#e6d59b;border-color:rgba(232,213,163,.4);background:rgba(232,213,163,.06)}
.ic-form,.ic-report,.ic-result{color:#f3edff;background:linear-gradient(165deg,rgba(42,32,82,.96),rgba(24,18,51,.98));border-color:rgba(232,213,163,.3);box-shadow:0 20px 54px rgba(5,3,18,.34),0 1px 0 rgba(255,255,255,.08) inset}
.ic-lead__tag,.ic-report__tag,.ic-confirm__badge{color:#f2d994;background:rgba(232,213,163,.1)}
.ic-lead__desc,.ic-report__lead,.ic-report__list li,.ic-report__hint,.ic-note,.ic-confirm__note{color:#cbbde8}.ic-lead__desc strong,.ic-report__lead strong{color:#fff4d9}
.ic-field>span,.ic-check,.ic-confirm__dl dt{color:#c8b9e6}
.ic-field input,.ic-field textarea{border-color:rgba(210,196,255,.28);background:rgba(11,8,28,.58);color:#f6f0ff}
.ic-field input:focus,.ic-field textarea:focus{outline-color:#f2d994}
.ic-seg button{border-color:rgba(210,196,255,.26);background:rgba(11,8,28,.42);color:#c8b9e6}.ic-seg button.on{background:rgba(167,139,250,.24);border-color:#bca5ff;color:#fff4d9}
.ic-confirm{border-color:rgba(232,213,163,.25);background:rgba(255,255,255,.045);box-shadow:inset 0 1px 0 rgba(255,255,255,.07)}
.ic-confirm__dl dd{color:#fff4d9}.ic-primary{box-shadow:0 12px 30px rgba(180,150,80,.28),0 1px 0 rgba(255,255,255,.45) inset}
.ic-report__visual{height:132px;margin:-5px -5px 16px;overflow:hidden;border-radius:16px;border:1px solid rgba(232,213,163,.24);background:#171131}
.ic-report__visual img{width:100%;height:100%;object-fit:cover;object-position:center 42%;opacity:.9}
.ic-report__title{color:#fff4d9}.ic-report__list li{color:#d9cdef}.ic-report__list li::before{background:#f2d994}
.ic-report--open{color:#efe7ff}.ic-rpt-page__title{display:flex;align-items:center;gap:7px;color:#fff4d9}.ic-rpt-page__mark{color:#f2d994}.ic-rpt-page__meta{color:#cbbde8}.ic-rpt-sec h4{color:#f2d994}.ic-rpt-sec p{color:#e0d5f5}
.ic-loading{color:#e4d8f5}.ic-loading__art{width:min(224px,54vw);aspect-ratio:1;margin:0 auto -22px;overflow:hidden;border-radius:50%;border:1px solid rgba(232,213,163,.4);box-shadow:0 18px 48px rgba(5,3,18,.4),0 0 42px rgba(167,139,250,.2)}
.ic-loading__art img{width:100%;height:100%;object-fit:cover}.ic-orb{position:relative;z-index:1;width:52px;height:52px;margin:0 auto 13px}
.ic-result{max-width:760px;padding:18px}.ic-result__hero{height:190px;margin:-2px -2px 18px;overflow:hidden;border-radius:18px;border:1px solid rgba(232,213,163,.28);background:#171131}.ic-result__hero img{width:100%;height:100%;object-fit:cover;object-position:center 48%;opacity:.9}.ic-result__heading{display:flex;align-items:center;gap:12px;margin:0 4px 5px}.ic-result__eyebrow{margin:0 0 2px;color:#f2d994;font-size:.76rem;font-weight:800;letter-spacing:.08em}.ic-result__title{color:#fff4d9;margin:0}.ic-result__meta{color:#cbbde8}.ic-sec{padding:14px 0 2px;border-top:1px dashed rgba(210,196,255,.2)}.ic-sec h3{color:#f2d994}.ic-sec p{color:#e1d6f6}
.ic-back-btn,.ic-back{color:#f2d994;border-color:rgba(232,213,163,.4);background:rgba(232,213,163,.08)}
.ic-foot{color:#cbbde8}
@media (max-width:720px){.ic-head{min-height:510px;border-radius:24px}.ic-head::after{background:linear-gradient(180deg,rgba(20,15,46,.9) 0%,rgba(20,15,46,.74) 34%,rgba(20,15,46,.08) 75%,rgba(20,15,46,.4) 100%)}.ic-hero-art img{object-position:62% center}.ic-head__content{width:100%;padding:38px 22px 26px}.ic-sub{max-width:32ch}.ic-guides{margin-top:16px}.ic-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ic-card{min-height:176px;padding:14px 8px 12px}.ic-palace-art{width:82px;height:62px}.ic-result__hero{height:148px}.ic-report__visual{height:112px}}
@media (prefers-reduced-motion:reduce){.ic-card,.ic-primary,.ic-topbar__back{transition:none}.ic-orb{animation:none}}
`;
