"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
import { Download, Loader2, Moon, Sparkles, Stars, WalletCards } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure, runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "@/lib/llm-text";
import AiResultProse from "@/components/fortune/AiResultProse";
import AnalysisBasisPanel from "@/components/fortune/AnalysisBasisPanel";
import AnalysisBasisLoading from "@/components/fortune/AnalysisBasisLoading";
import { fetchAnalysisBasis, type AnalysisBasis } from "@/lib/fortune/analysis-basis";
import { readDevPreviewState } from "@/lib/dev-preview/core";
import { buildZiweiPreviewPayload } from "@/lib/dev-preview/fixtures/ziwei";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  holdPaidFeatureGateOpen,
  releasePaidFeatureGate,
  runBillingCoinGate,
  primePaymentEligibility,
} from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type Gender = "female" | "male" | "unknown" | "";
type FocusArea = "overall" | "love" | "money" | "career" | "health" | "relationship" | "personality" | "custom";
type Phase = "idle" | "checking" | "payment" | "reading" | "ready";

type BirthInfo = {
  name?: string;
  gender: string;
  birthDate: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  calendarType: CalendarType;
  isLeapMonth?: boolean;
};

type ZiweiPalace = {
  name: string;
  earthlyBranch?: string;
  mainStars?: string[];
  assistantStars?: string[];
  maleficStars?: string[];
  transformations?: string[];
  brightness?: Record<string, string>;
};

type ZiweiChart = {
  lifePalace?: string;
  bodyPalace?: string;
  palaces?: ZiweiPalace[];
  fourTransformations?: {
    huaLu?: string;
    huaQuan?: string;
    huaKe?: string;
    huaJi?: string;
  };
  majorLuck?: Array<{
    palaceName?: string;
    earthlyBranch?: string;
    range?: string;
    startAge?: number;
    endAge?: number;
    direction?: string;
  }>;
  bureau?: { number?: number; name?: string };
};

type RecentZiweiConsultation = {
  id: string;
  topic: string;
  name: string;
  lifePalace: string;
  chartSummary: string;
  updatedAt?: string;
};

type ConsultationMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type Consultation = {
  id: string;
  status?: string;
  accessType?: AccessType;
  birthInfo?: BirthInfo;
  topic?: string;
  userQuestion?: string;
  summaryCards?: {
    lifePalace?: string;
    bodyPalace?: string;
    keyStars?: string[];
    keywords?: string[];
  };
  ziweiChart?: ZiweiChart;
  analysisBasis?: AnalysisBasis | null;
  messages?: ConsultationMessage[];
};

type StructuredZiweiResult = {
  meta?: {
    dayun?: {
      current_palace?: string;
      age_range?: string;
      theme?: string;
    };
    scores?: Record<string, unknown>;
  };
  sections?: Record<string, { title?: string; body?: string }>;
};

type ApiResult = {
  ok?: boolean;
  reason?: string;
  message?: string;
  accessToken?: string;
  accessType?: AccessType;
  sessionId?: string;
  status?: string;
  consultation?: Consultation;
  paymentPayload?: Record<string, unknown>;
};

type FormState = {
  name: string;
  gender: Gender;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  isLeapMonth: boolean;
  focusArea: FocusArea;
  question: string;
};

const BRANCH_RE = /[子丑寅卯辰巳午未申酉戌亥]/;
const HUA_CLASS: Array<[string, string]> = [
  ["화록", "huaLu"], ["禄", "huaLu"], ["祿", "huaLu"], ["록", "huaLu"],
  ["화권", "huaQuan"], ["權", "huaQuan"], ["권", "huaQuan"],
  ["화과", "huaKe"], ["科", "huaKe"], ["과", "huaKe"],
  ["화기", "huaJi"], ["忌", "huaJi"], ["기", "huaJi"],
];
function huaClass(label: string): string {
  for (const [needle, cls] of HUA_CLASS) {
    if (label.includes(needle)) return cls;
  }
  return "";
}

const FEATURE_KEY = "ziwei-ai-consultation";
const FEATURE_REASON = "자미두수 전문가 상담";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 3000;
const ZIWEI_AI_MESSAGE_ENDPOINT = "/api/ziwei-ai/message";

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  PAYMENT_CANCELLED: "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.",
  INVALID_INPUT: "자미두수 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.",
  BIRTH_TIME_MISSING: "자미두수는 출생시간이 중요해요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.",
  CUSTOM_QUESTION_REQUIRED: "별궁에 묻고 싶은 질문을 조금 더 구체적으로 적어 주세요.",
  CALCULATION_FAILED: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "자미두수 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  LLM_ERROR: "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
  NETWORK_ERROR: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
  TEMPORARY_UNAVAILABLE: "지금 접속이 잠시 불안정해요. 이용권은 그대로 보존되니, 잠시 후 다시 시도해 주세요.",
};

const PREVIEW_PALACES = ["명궁", "부모궁", "복덕궁", "전택궁", "형제궁", "관록궁", "부부궁", "노복궁", "자녀궁", "천이궁", "재백궁", "질액궁"];

const ZWV_CSS = `
.zwvPreviewBoard{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;width:min(300px,80%);margin:0 auto 14px;opacity:.75}
.zwvPreviewBoard i{display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 4px;border:1px solid rgba(139,92,246,.3);border-radius:8px;background:rgba(20,16,44,.5);font-style:normal}
.zwvPreviewBoard i b{font-size:9.5px;font-weight:700;color:rgba(226,222,255,.75)}
.zwvPreviewBoard i span{font-size:10px;color:#c4b5fd}
.zwvPreviewBoard i.isLife{border-color:rgba(251,191,36,.6)}
.zwvPreviewBoard i.isLife b{color:#fbbf24}
.zwvRecentList{margin-top:16px;display:flex;flex-direction:column;gap:8px;width:100%;max-width:340px}
.zwvRecentList>strong{font-size:12px;color:#c4b5fd;letter-spacing:.05em}
.zwvRecentList button{display:flex;flex-direction:column;gap:2px;text-align:left;padding:9px 12px;border-radius:11px;border:1px solid rgba(139,92,246,.32);background:rgba(20,16,44,.55);color:#ece9ff;cursor:pointer;transition:border-color .2s}
.zwvRecentList button:hover{border-color:rgba(251,191,36,.6)}
.zwvRecentList button span{font-size:13px}
.zwvRecentList button small{font-size:10.5px;color:rgba(196,181,253,.7)}
.zwvTimeline{border:1px solid rgba(139,92,246,.3);border-radius:14px;padding:13px 14px;background:rgba(12,9,30,.6)}
.zwvTimelineHead{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.zwvTimelineHead span{font-size:12.5px;font-weight:800;color:#fbbf24;letter-spacing:.06em}
.zwvTimelineHead small{font-size:10.5px;color:rgba(226,222,255,.55)}
.zwvTimelineTrack{display:flex;gap:3px;overflow-x:auto;padding:14px 2px 4px}
.zwvSegment{position:relative;flex:1 0 64px;display:flex;flex-direction:column;gap:2px;align-items:center;padding:8px 4px;border-radius:9px;border:1px solid rgba(139,92,246,.3);background:rgba(30,24,64,.55);color:#ece9ff;cursor:pointer;transition:border-color .2s,transform .15s}
.zwvSegment strong{font-size:10.5px}
.zwvSegment span{font-size:11px;color:rgba(226,222,255,.8)}
.zwvSegment.isCurrent{border-color:#fbbf24;background:rgba(251,191,36,.12)}
.zwvSegment.isSelected{transform:translateY(-2px);border-width:2px}
.zwvSegment.hasJi span{color:#fda4af}
.zwvSegment i{position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-style:normal;font-size:10px;color:#fbbf24;text-shadow:0 0 8px rgba(251,191,36,.8)}
.zwvTimelineInfo{margin:10px 0 0;font-size:12px;line-height:1.6;color:rgba(236,233,255,.85)}
.zwvTimelineInfo strong{color:#fbbf24}
`;

// 대한(10년 주기) 타임라인 — 서버 계산 majorLuck을 나이순으로 그리고 현재 나이를 표시
function MajorLuckTimeline({ chart, birthDate }: { chart?: ZiweiChart; birthDate?: string }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const cycles = useMemo(() => (
    (chart?.majorLuck || [])
      .filter((cycle) => Number.isFinite(Number(cycle.startAge)))
      .sort((a, b) => Number(a.startAge) - Number(b.startAge))
      .slice(0, 10)
  ), [chart?.majorLuck]);
  if (!cycles.length) return null;

  const birthYear = Number(String(birthDate || "").slice(0, 4));
  const age = Number.isFinite(birthYear) && birthYear > 1900 ? new Date().getFullYear() - birthYear + 1 : null;
  const currentIndex = age != null
    ? cycles.findIndex((cycle) => Number(cycle.startAge) <= age && age <= Number(cycle.endAge))
    : -1;
  const palaceByName = new Map((chart?.palaces || []).map((palace) => [palace.name, palace]));
  const selected = selectedIndex != null ? cycles[selectedIndex] : (currentIndex >= 0 ? cycles[currentIndex] : null);
  const selectedPalace = selected ? palaceByName.get(selected.palaceName || "") : null;

  return (
    <section className="zwvTimeline" data-ziwei-pdf-section aria-label="대한 타임라인 — 구간을 누르면 해당 궁의 별이 보입니다">
      <div className="zwvTimelineHead">
        <span>대한(大限) 타임라인</span>
        <small>{chart?.bureau?.name ? `${chart.bureau.name} · 첫 대한 ${cycles[0]?.startAge}세` : "10년 주기 흐름"} · ▼ 지금</small>
      </div>
      <div className="zwvTimelineTrack" role="list">
        {cycles.map((cycle, index) => {
          const isCurrent = index === currentIndex;
          const isSelected = selectedIndex === index || (selectedIndex == null && isCurrent);
          const palace = palaceByName.get(cycle.palaceName || "");
          const hasJi = (palace?.transformations || []).some((item) => String(item).includes("화기"));
          return (
            <button
              type="button"
              role="listitem"
              key={`${cycle.palaceName}-${cycle.startAge}`}
              className={`zwvSegment${isSelected ? " isSelected" : ""}${isCurrent ? " isCurrent" : ""}${hasJi ? " hasJi" : ""}`}
              onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
              aria-label={`${cycle.range}세 ${cycle.palaceName} 대한${isCurrent ? ", 현재 진행 중" : ""}`}
            >
              {isCurrent ? <i aria-hidden="true">▼</i> : null}
              <strong>{cycle.range}</strong>
              <span>{cycle.palaceName}</span>
            </button>
          );
        })}
      </div>
      {selected ? (
        <p className="zwvTimelineInfo">
          <strong>{selected.range}세 · {selected.palaceName} 대한 ({selected.direction || "순행"})</strong>
          {" — "}
          {(selectedPalace?.mainStars || []).length ? `주성 ${(selectedPalace?.mainStars || []).join(", ")}` : "무주성 궁"}
          {(selectedPalace?.transformations || []).length ? ` · 사화 ${(selectedPalace?.transformations || []).join(", ")}` : ""}
          {currentIndex >= 0 && cycles[currentIndex] === selected ? " · 지금 이 대한을 지나는 중입니다" : ""}
        </p>
      ) : null}
    </section>
  );
}

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

// 근거 중심 섹션(structure_core·influence_factors·evidence_basis·domain_matrix·action_plan)은
// 이 목록에 없으면 렌더되지 않는다. 이 목록 이전에 생성된 상담에는 해당 키가 없으므로,
// 아래 필터(body 있는 키만 통과)가 그대로 폴백 역할을 한다.
const SECTION_ORDER = [
  "reading_guide",
  "personality_profile",
  "structure_core",
  "influence_factors",
  "evidence_basis",
  "essence",
  "flow",
  "triad_axis",
  "twelve_palaces",
  "career",
  "wealth",
  "relationship",
  "dayun_now",
  "timing_strategy",
  "caution",
  "domain_matrix",
  "core_answer",
  "action_plan",
  "prescription",
];
const SECTION_GLYPHS: Record<string, string> = {
  reading_guide: "序",
  personality_profile: "性",
  structure_core: "核",
  influence_factors: "影",
  evidence_basis: "據",
  essence: "命",
  flow: "化",
  triad_axis: "合",
  twelve_palaces: "宮",
  career: "官",
  wealth: "財",
  relationship: "緣",
  dayun_now: "運",
  timing_strategy: "時",
  caution: "忌",
  domain_matrix: "域",
  core_answer: "問",
  action_plan: "行",
  prescription: "策",
};
const SCORE_LABELS: Record<string, string> = {
  career: "직업·사업",
  wealth: "재물",
  relationship: "관계·인연",
  health: "건강·멘탈",
};
const LOADING_STAGES = [
  { glyph: "命", label: "자미두수 명반을 세우는 중", sub: "12궁 배치 계산" },
  { glyph: "旺", label: "성계 배치를 확정하는 중", sub: "주성·보성·살성 배치" },
  { glyph: "化", label: "사화의 흐름을 읽는 중", sub: "화록·화권·화과·화기" },
  { glyph: "運", label: "대운의 물길을 찾는 중", sub: "현재 대운 계산" },
  { glyph: "星", label: "별궁 상담을 완성하는 중", sub: "명반 서사 생성" },
];

const defaultForm: FormState = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  isLeapMonth: false,
  focusArea: "overall",
  question: "",
};

function toZiweiGender(value: string | undefined): Gender {
  if (value === "female" || value === "male" || value === "unknown") return value;
  return "";
}

const applyProfileSeedToZiweiForm = (form: FormState, profile: AiPrefillSeed): FormState => {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType && profile.birthTimeUnknown === undefined) {
    return form;
  }
  const profileGender = toZiweiGender(profile.gender);
  return {
    ...form,
    name: profile.name || form.name,
    gender: profileGender || form.gender,
    birthDate: profile.birthDate || form.birthDate,
    birthTimeUnknown: profile.birthTimeUnknown ?? form.birthTimeUnknown,
    birthTime:
      profile.birthTimeUnknown === true
        ? ""
        : profile.birthTime || form.birthTime,
    calendarType: profile.calendarType || form.calendarType,
  };
};

const buildInitialZiweiForm = (): FormState => applyProfileSeedToZiweiForm(defaultForm, readAiProfileSeed());

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `zwai-${crypto.randomUUID()}`;
  return `zwai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function postJson<T>(url: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ status: number; data: T }> {
  const response = await authFetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  }, { retryOn401: false });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data: data as T };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// 생성이 오래 걸릴 때(202) 결과 엔드포인트를 폴링해 수렴시킨다.
// 자미두수는 분량이 가장 커(본문 2만~3만자) 최악 ~8분(240s + grounding 재시도) — 65회로 커버, 1req/0.7~8s.
// 첫 폴은 빠르게(0.7s) 프로브해 조기 완료를 즉시 잡고, 이후 3~8s로 램프한다.
const RESULT_POLL_BACKOFF_MS = [700, 3000, 5000, 8000];
const RESULT_POLL_MAX_ATTEMPTS = 65;

async function pollZiweiResult(sessionId: string): Promise<ApiResult> {
  for (let attempt = 0; attempt < RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(RESULT_POLL_BACKOFF_MS[Math.min(attempt, RESULT_POLL_BACKOFF_MS.length - 1)]);
    let response: Response;
    try {
      response = await authFetch(`/api/ziwei-ai/result?id=${encodeURIComponent(sessionId)}`, { method: "GET" }, { retryOn401: false });
    } catch {
      continue;
    }
    if (response.status === 202) continue;
    if (response.status === 429) {
      throw new Error("요청이 잠시 몰렸습니다. 잠시 후 다시 시도해 주세요.");
    }
    const data = (await response.json().catch(() => ({}))) as ApiResult;
    // 일시적 DB/인증 장애(503·retryable)는 하드 종료하지 말고 계속 폴링해 자가 복구한다.
    if (isRetriableResultPollFailure(response.status, data)) continue;
    if (!response.ok) throw new Error(mapError(data, response.status));
    return data;
  }
  throw new Error("상담 생성이 평소보다 오래 걸리고 있습니다. 페이지를 닫지 말고 잠시 후 다시 시도해 주세요.");
}

function toText(value: unknown) {
  return toDisplayText(value);
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function buildConsultationPayload(form: FormState, requestId: string) {
  const topic = FOCUS_TOPIC[form.focusArea] || FOCUS_TOPIC.overall;
  return {
    serviceType: FEATURE_KEY,
    consultationType: "ziwei",
    userName: form.name.trim() || undefined,
    gender: form.gender,
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    isLeapMonth: form.calendarType === "lunar" ? form.isLeapMonth : false,
    focusArea: form.focusArea,
    question: form.question.trim(),
    locale: "ko",
    requestId,
    idempotencyKey: requestId,
    birthInfo: {
      name: form.name.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      birthTime: form.birthTimeUnknown ? "" : form.birthTime,
      birthTimeUnknown: form.birthTimeUnknown,
      calendarType: form.calendarType,
      isLeapMonth: form.calendarType === "lunar" ? form.isLeapMonth : false,
    },
    topic,
    userQuestion: form.question.trim(),
  };
}

function validateForm(form: FormState) {
  if (!form.birthDate || !form.gender || !form.calendarType) return ERROR_TEXT.INVALID_INPUT;
  if (!form.birthTimeUnknown && !form.birthTime) return ERROR_TEXT.BIRTH_TIME_MISSING;
  if (form.focusArea === "custom" && form.question.trim().length < 2) return ERROR_TEXT.CUSTOM_QUESTION_REQUIRED;
  return "";
}

function mapError(result: ApiResult, status = 0) {
  const reason = String(result?.reason || "").toUpperCase();
  if (reason && ERROR_TEXT[reason]) return ERROR_TEXT[reason];
  if (status === 401) return ERROR_TEXT.LOGIN_REQUIRED;
  if (status === 402) return ERROR_TEXT.PAYMENT_VERIFY_FAILED;
  return result?.message || ERROR_TEXT.SERVER_ERROR;
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
    record.transactionId
    || record.paymentId
    || record.purchaseId
    || payload.transactionId
    || payload.paymentId
    || payload.purchaseId
    || Object.keys(asRecord(payload.accessGrant)).length
    || Object.keys(asRecord(payload.consume)).length
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
    record.paymentId
    || transactionId
    || purchaseId
    || payload.paymentId
    || payment.paymentId
    || payment.impUid
    || payment.merchantUid
    || accessGrant.paymentId
    || ledgerId
    || fallbackRequestId
  );
  return {
    paymentId,
    transactionId,
    purchaseId,
    ledgerId,
    requestId: fallbackRequestId,
    billingEvidence: {
      ...payload,
      paymentId,
      transactionId,
      purchaseId,
      ledgerId,
      payment: { ...payment, paymentId, requestId: fallbackRequestId },
      accessGrant,
      consume,
    },
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
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

function parseStructuredZiweiResult(content: string): StructuredZiweiResult | null {
  const normalized = content.replace(/\r\n/g, "\n").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  if (!normalized.includes("{") || !normalized.includes("}")) return null;
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(normalized.slice(start, end + 1)) as StructuredZiweiResult;
    return parsed?.sections && typeof parsed.sections === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function splitAssistantSections(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const structured = parseStructuredZiweiResult(normalized);
  if (structured) {
    const sections = asRecord(structured.sections);
    return SECTION_ORDER
      .filter((key) => asRecord(sections[key]).body)
      .map((key) => {
        const section = asRecord(sections[key]);
        return {
          title: toText(section.title) || key,
          body: toText(section.body),
          glyph: SECTION_GLYPHS[key] || "星",
        };
      });
  }
  const fallbackTitles = [
    "명반의 핵심 결론",
    "명궁이 말하는 나의 기질",
    "지금 질문과 연결된 별",
    "12궁으로 보는 흐름",
    "조심해야 할 패턴",
    "오늘의 선택 조언",
    "별궁의 마지막 한마디",
  ];
  // 구조화 파싱에 실패한 원시(잘린) JSON은 중괄호째 노출하지 않고 읽을 수 있는 문장만 복원한다.
  const proseSource = looksLikeRawJson(normalized) ? extractReadableTextFromJsonLike(normalized) : normalized;
  if (!proseSource) return [];
  const chunks = proseSource.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const first = lines[0] || "";
    const headingMatch = first.match(/^(?:#{1,3}\s*)?(?:\d+[.)]\s*)?(.{2,42}?)(?:[:：])?$/);
    const hasHeading = Boolean(headingMatch && lines.length > 1 && first.length <= 44);
    return {
      title: hasHeading ? headingMatch?.[1]?.replace(/\*\*/g, "").trim() || fallbackTitles[index % fallbackTitles.length] : fallbackTitles[index % fallbackTitles.length],
      body: hasHeading ? lines.slice(1).join("\n") : chunk,
      glyph: "星",
    };
  });
}

function safePdfName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]/g, "_") || "별궁";
}

function formatTransformation(value: string | undefined) {
  return toText(value) || "-";
}

export default function ZiweiAiPage() {
  const [form, setForm] = useState<FormState>(buildInitialZiweiForm);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  // 서버가 계산한 명반 근거 — 대기 화면이 실제 값을 보여 주고, 결과 화면 맨 위에 다시 놓인다.
  const [basis, setBasis] = useState<AnalysisBasis | null>(null);
  const [recentList, setRecentList] = useState<RecentZiweiConsultation[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const idempotencyRef = useRef("");
  const busyRef = useRef(false);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const formTouchedRef = useRef(false);

  // 서버에서 프로필 카드가 뒤늦게 도착해도, 사용자가 입력을 시작하기 전이라면 폼에 반영
  useEffect(() => {
    if (!profileSeed) return;
    setForm((prev) => (formTouchedRef.current ? prev : applyProfileSeedToZiweiForm(prev, profileSeed)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  // 운명의 섬 12궁 허브에서 넘어온 궁별 프리셋(focusArea + 질문)을 1회 반영. 결제·생성 로직과 무관.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let preset: { focusArea?: string; question?: string } | null = null;
    try {
      const raw = sessionStorage.getItem("ziweiIslandPreset");
      if (raw) {
        preset = JSON.parse(raw);
        sessionStorage.removeItem("ziweiIslandPreset");
      }
    } catch {
      preset = null;
    }
    if (!preset) return;
    const validFocus = FOCUS_OPTIONS.some((o) => o.value === preset?.focusArea) ? (preset.focusArea as FocusArea) : null;
    const presetQuestion = typeof preset.question === "string" ? preset.question.slice(0, 400) : "";
    if (!validFocus && !presetQuestion) return;
    setForm((prev) =>
      formTouchedRef.current
        ? prev
        : { ...prev, focusArea: validFocus || prev.focusArea, question: presetQuestion || prev.question },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadFormFromProfileCard() {
    void reloadProfileSeed().then((seed) => {
      if (seed) setForm((prev) => applyProfileSeedToZiweiForm(prev, seed));
    });
  }

  function rememberConsultationUrl(id: string) {
    if (!id || typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("cid", id);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // URL 갱신 실패는 무시
    }
  }

  // 재열람: ?cid= 복원 + 지난 상담 목록
  useEffect(() => {
    let cancelled = false;
    const cid = new URLSearchParams(window.location.search).get("cid");
    (async () => {
      if (cid) {
        try {
          const response = await authFetch(`/api/ziwei-ai/result?id=${encodeURIComponent(cid)}`);
          const data = await response.json().catch(() => ({})) as ApiResult;
          if (!cancelled && data?.ok && data.consultation) {
            setConsultation(data.consultation);
            setPhase("ready");
          }
        } catch {
          // 재열람 실패는 조용히 무시
        }
      }
      try {
        const response = await authFetch("/api/ziwei-ai/result");
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        if (!cancelled && Array.isArray(data?.consultations)) setRecentList(data.consultations);
      } catch {
        // 목록 조회 실패는 무시
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRecentConsultation(id: string) {
    try {
      const response = await authFetch(`/api/ziwei-ai/result?id=${encodeURIComponent(id)}`);
      const data = await response.json().catch(() => ({})) as ApiResult;
      if (data?.ok && data.consultation) {
        setConsultation(data.consultation);
        setPhase("ready");
        rememberConsultationUrl(id);
        return;
      }
      setError("지난 상담을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } catch {
      setError(ERROR_TEXT.NETWORK_ERROR);
    }
  }

  const busy = phase === "checking" || phase === "payment" || phase === "reading";
  const summary = consultation?.summaryCards || {};
  const palaces = consultation?.ziweiChart?.palaces || [];
  const fourTransformations = consultation?.ziweiChart?.fourTransformations || {};
  const lifeBranch = (String(consultation?.ziweiChart?.lifePalace || summary.lifePalace || "").match(BRANCH_RE) || [])[0];
  const bodyBranch = (String(consultation?.ziweiChart?.bodyPalace || summary.bodyPalace || "").match(BRANCH_RE) || [])[0];
  const assistantMessages = useMemo(() => consultation?.messages?.filter((message) => message.role === "assistant") || [], [consultation?.messages]);
  const structuredResult = useMemo(() => {
    for (const message of assistantMessages) {
      const parsed = parseStructuredZiweiResult(message.content);
      if (parsed) return parsed;
    }
    return null;
  }, [assistantMessages]);
  const structuredScores = asRecord(structuredResult?.meta?.scores);
  const currentLoadingStage = phase === "payment" ? 1 : phase === "reading" ? 4 : 0;
  const assistantSections = useMemo(() => assistantMessages.flatMap((message, messageIndex) => (
    splitAssistantSections(message.content).map((section, sectionIndex) => ({
      ...section,
      key: `${message.createdAt || messageIndex}-${sectionIndex}`,
    }))
  )), [assistantMessages]);
  const isLoadingConsultation = !consultation && (phase === "checking" || phase === "payment" || phase === "reading");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    formTouchedRef.current = true;
    setForm((current) => ({ ...current, [key]: value }));
    if (!busyRef.current) {
      idempotencyRef.current = "";
      setConsultation(null);
      setBasis(null);
      setError("");
      setNotice("");
      setPhase("idle");
    }
  }

  async function generateConsultation(idempotencyKey: string, payload: ReturnType<typeof buildConsultationPayload>, extra: Record<string, unknown>) {
    setPhase("reading");
    // 다음 화면(생성 로딩)이 마운트되는 시점 — 게이트 오버레이 hold를 해제한다(확인 완료 프레임 최소 노출 후 닫힘).
    releasePaidFeatureGate(idempotencyKey);
    setNotice("명궁과 신궁의 흐름을 맞춰보는 중...");
    const { status, data } = await postJson<ApiResult>("/api/ziwei-ai/generate", {
      ...payload,
      ...extra,
      idempotencyKey,
    }, idempotencyKey);
    if (data.ok && data.consultation) {
      setConsultation(data.consultation);
      rememberConsultationUrl(data.consultation.id);
      setPhase("ready");
      setNotice("");
      return;
    }
    if (status === 202 && data.sessionId) {
      // 생성이 진행 중 — 결과 엔드포인트를 폴링해 완료까지 수렴시킨다(이전에는 여기서 멈춰 영구 대기였다).
      setNotice("12궁의 별자리를 펼치는 중...");
      const resolved = await pollZiweiResult(data.sessionId);
      if (resolved.ok && resolved.consultation) {
        setConsultation(resolved.consultation);
        rememberConsultationUrl(resolved.consultation.id);
        setPhase("ready");
        setNotice("");
        return;
      }
      throw new Error(mapError(resolved, 0));
    }
    throw new Error(mapError(data, status));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    const idempotencyKey = idempotencyRef.current || createIdempotencyKey();
    idempotencyRef.current = idempotencyKey;
    setError("");
    setNotice("별궁을 열기 위한 정보를 확인하고 있습니다");
    setPhase("checking");
    let gateStarted = false;

    const previewState = readDevPreviewState();
    if (previewState) {
      setPhase("reading");
      const preview = buildZiweiPreviewPayload(previewState);
      if (preview.ok) {
        setConsultation(preview.consultation as Consultation);
        rememberConsultationUrl(preview.consultation.id);
        setPhase("ready");
        setNotice("");
      } else {
        setError(ERROR_TEXT[preview.reason] || ERROR_TEXT.LLM_ERROR);
        setPhase("idle");
      }
      busyRef.current = false;
      return;
    }

    try {
      const validationMessage = validateForm(form);
      if (validationMessage) {
        throw new Error(validationMessage);
      }
      const payload = buildConsultationPayload(form, idempotencyKey);
      // 근거는 결제/생성과 무관한 순수 계산이라 기다리지 않고 병렬로 받는다.
      // 실패해도 fetchAnalysisBasis가 null을 돌려주므로 대기 화면이 기존 문구로 되돌아갈 뿐 흐름을 막지 않는다.
      void fetchAnalysisBasis("/api/ziwei-ai/basis", payload).then(setBasis);
      beginPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: "이용권 확인",
        reason: "자미두수 전문가 상담",
        paymentMode: "MEMBERSHIP_PASS",
      });
      // 이용권 판정(unlock-status)을 아래 prepare 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
      void primePaymentEligibility(buildBillingGateInput({}, idempotencyKey));
      gateStarted = true;
      // 확인 완료 후 다음 화면(생성 로딩)이 실제로 뜰 때까지 게이트 오버레이를 유지해 "확인 중 → 공백"을 막는다.
      // release는 generateConsultation의 setPhase("reading")에서 호출한다(안전장치 상한 8초).
      holdPaidFeatureGateOpen({ requestId: idempotencyKey, maxMs: 8000 });
      // 이용권 확인 앞단의 일시적 DB 장애(503 DB_DEGRADED 등)는 재시도로 흡수한다 — 하드 "이용권 확인 실패"로 굳지 않게.
      const { status, data } = await runAccessCheckWithTransientRetry(
        () => postJson<ApiResult>("/api/ziwei-ai/prepare", payload, idempotencyKey),
        { onRetry: () => setNotice("연결이 잠시 불안정해요. 이용권을 다시 확인하는 중입니다.") },
      );
      if (data.ok) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId: idempotencyKey,
          title: "이용권 확인 완료",
          reason: "자미두수 전문가 상담",
          paymentMode: "MEMBERSHIP_PASS",
          message: "이용권 확인이 끝났습니다. 별궁의 흐름을 읽고 있습니다.",
        });
        await generateConsultation(idempotencyKey, payload, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      if (data.reason === "LOGIN_REQUIRED" || status === 401) throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
      if (data.reason === "INVALID_INPUT") throw new Error(mapError(data, status));
      // 재시도를 소진하고도 일시적 장애가 지속되면, dead-end 대신 결제창(단건+월정석)을 연다(요구사항: 이용권 확인
      // 실패 시 무조건 결제창). runBillingCoinGate가 billing.js coin-gate로 pass를 재검사(W2 재시도 포함)해 보유자면
      // 무료 통과, 미커버/장애 지속이면 결제창을 연다. degrade면 paymentPayload가 없어도 buildBillingGateInput의
      // FEATURE_COST 기본값으로 게이트를 구성한다.
      const passGateDegraded = isRetriableResultPollFailure(status, data);
      if (!passGateDegraded && data.reason !== "PAYMENT_REQUIRED") throw new Error(mapError(data, status));

      setPhase("payment");
      setNotice("결제창을 확인해 주세요");
      const gate = await runBillingCoinGate(buildBillingGateInput(asRecord((data as { paymentPayload?: unknown }).paymentPayload), idempotencyKey));

      if (!isPaymentGranted(gate)) {
        const code = String(gate.error?.code || "").toUpperCase();
        if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(ERROR_TEXT.LOGIN_REQUIRED);
        if (code === "PAYMENT_CANCELLED") throw new Error(ERROR_TEXT.PAYMENT_CANCELLED);
        if (code === "PAYMENT_REQUIRED" || gate.status === 402) throw new Error(ERROR_TEXT.PAYMENT_VERIFY_FAILED);
        throw new Error(gate.error?.message || ERROR_TEXT.SERVER_ERROR);
      }

      await generateConsultation(idempotencyKey, payload, extractPayment(gate, idempotencyKey));
    } catch (caught) {
      const message = caught instanceof TypeError ? ERROR_TEXT.NETWORK_ERROR : caught instanceof Error ? caught.message : ERROR_TEXT.SERVER_ERROR;
      const paymentCancelled = message === ERROR_TEXT.PAYMENT_CANCELLED;
      // 일시적 접속 장애는 이용권 결함이 아니므로 "이용권 확인 실패"로 표기하지 않는다.
      const isTransient = message === ERROR_TEXT.TEMPORARY_UNAVAILABLE || message === ERROR_TEXT.NETWORK_ERROR;
      setError(message);
      if (gateStarted) {
        failPaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId: idempotencyKey,
          title: isTransient ? "잠시 후 다시 시도" : "이용권 확인 실패",
          reason: "자미두수 전문가 상담",
          paymentMode: "MEMBERSHIP_PASS",
          message,
          cancelled: paymentCancelled,
        });
      }
      setNotice("");
      setPhase("idle");
    } finally {
      busyRef.current = false;
    }
  }

  async function handlePdfDownload() {
    const element = resultRef.current;
    if (!element || pdfLoading) return;
    setPdfLoading(true);
    setError("");
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const userName = safePdfName(consultation?.birthInfo?.name || form.name || "자미두수");
      const date = new Date().toLocaleDateString("ko-KR").replace(/\./g, "").replace(/\s/g, "");
      await exportResultPdf({
        captureTargets: [".resultDocument [data-ziwei-pdf-section]"],
        fileName: `자미두수_AI_상담_${userName}_${date}.pdf`,
        backgroundColor: "#060712",
        cover: {
          title: `${userName}님의 자미두수 상담`,
          name: userName,
          date: new Date().toISOString().slice(0, 10),
        },
      });
    } catch {
      setError("PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <main className="ziweiAiShell" data-follow-up-endpoint={ZIWEI_AI_MESSAGE_ENDPOINT}>
      <section className="ziweiHero">
        <div className="heroConstellation" aria-hidden="true">
          <span className="heroOrbit heroOrbit--outer" />
          <span className="heroOrbit heroOrbit--middle" />
          <span className="heroOrbit heroOrbit--inner" />
          {Array.from({ length: 12 }).map((_, index) => <i key={index} style={{ "--angle": `${index * 30}deg` } as CSSProperties} />)}
          <b>命</b>
        </div>
        <div className="heroBackdropText" aria-hidden="true">紫微斗數</div>
        <div className="heroCopy">
          <p className="eyebrow"><Stars size={16} /> 紫微斗數 · 별궁 전문가 상담</p>
          <h2>자미두수 전문가 상담</h2>
          <p>명궁과 12궁의 별 흐름을 따라 지금 가장 궁금한 질문을 차분히 풀어드립니다.</p>
        </div>
        <div className="heroSeparator" aria-hidden="true" />
      </section>

      <section className="workspace">
        <form className="consultForm" onSubmit={handleSubmit}>
          <div className="formHeader flex-wrap">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Sparkles size={20} />
              <strong>별궁을 열기 위한 정보</strong>
            </div>
            <button
              type="button"
              onClick={loadFormFromProfileCard}
              className="shrink-0 rounded-lg border border-[#fbbf24]/35 bg-[#fbbf24]/10 px-3 py-2 text-xs font-bold text-[#fbbf24] transition hover:bg-[#fbbf24]/20"
              aria-label="프로필 카드에서 출생 정보 불러오기"
            >
              프로필 카드에서 불러오기
            </button>
          </div>

          <label>
            <span>이름 또는 닉네임</span>
            <input value={form.name} onChange={(event) => update("name", event.target.value)} maxLength={80} disabled={busy} />
          </label>

          <div className="fieldRow">
            <label>
              <span>성별</span>
              <select value={form.gender} onChange={(event) => update("gender", event.target.value as Gender)} disabled={busy}>
                <option value="">선택</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="unknown">비공개</option>
              </select>
            </label>
            <label>
              <span>생년월일</span>
              <input {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => update("birthDate", nextBirthDate))} disabled={busy} />
            </label>
          </div>

          <div className="fieldRow">
            <label>
              <span>출생시간</span>
              <input type="time" value={form.birthTime} onChange={(event) => update("birthTime", event.target.value)} disabled={busy || form.birthTimeUnknown} />
            </label>
            <label>
              <span>양력/음력</span>
              <select value={form.calendarType} onChange={(event) => update("calendarType", event.target.value as CalendarType)} disabled={busy}>
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>
          </div>

          <div className="toggles">
            <label className="check">
              <input type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => update("birthTimeUnknown", event.target.checked)} disabled={busy} />
              <span>출생시간 모름</span>
            </label>
            {form.calendarType === "lunar" && (
              <label className="check">
                <input type="checkbox" checked={form.isLeapMonth} onChange={(event) => update("isLeapMonth", event.target.checked)} disabled={busy} />
                <span>윤달</span>
              </label>
            )}
          </div>

          <label>
            <span>상담 주제</span>
            <select value={form.focusArea} onChange={(event) => update("focusArea", event.target.value as FocusArea)} disabled={busy}>
              {FOCUS_OPTIONS.map((topic) => <option key={topic.value} value={topic.value}>{topic.label}</option>)}
            </select>
          </label>

          <label>
            <span>별궁에 묻고 싶은 질문</span>
            <textarea
              value={form.question}
              onChange={(event) => update("question", event.target.value)}
              maxLength={1200}
              rows={5}
              disabled={busy}
              placeholder="지금 마음에 가장 크게 떠오르는 고민을 적어 주세요."
            />
          </label>

          <div className="flex items-center justify-end">
            <PriceBadge featureKey="ziwei-ai-consultation" prefix="상담 이용 가격 " />
          </div>
          <button className="primaryBtn" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : <WalletCards size={18} />}
            {busy ? "명반의 별을 읽는 중..." : "별궁 전문가 상담 받기"}
          </button>

          {notice && <p className="notice"><Moon size={16} />{notice}</p>}
          {error && <p className="error">{error}</p>}
        </form>

        <div className="resultPane">
          {isLoadingConsultation ? (
            <div className="loadingState">
              <div className="palaceSigil isSpinning" aria-hidden="true">
                {Array.from({ length: 12 }).map((_, index) => <span key={index} />)}
              </div>
              {/* 12궁 시길은 그대로 두고, 안쪽 문구만 실제 계산값으로 바꾼다.
                  근거가 아직 없거나 조회에 실패하면 기존 단계 문구로 되돌아간다. */}
              <AnalysisBasisLoading
                basis={basis}
                fallbackLabel={LOADING_STAGES[currentLoadingStage].label}
                fallbackDetail={LOADING_STAGES[currentLoadingStage].sub}
              />
            </div>
          ) : !consultation ? (
            <div className="emptyState">
              <div className="zwvPreviewBoard" aria-hidden="true">
                {PREVIEW_PALACES.map((name, index) => (
                  <i key={name} className={index === 0 ? "isLife" : ""}>
                    <b>{name}</b>
                    <span>{index === 0 ? "★" : index % 3 === 0 ? "✦" : "·"}</span>
                  </i>
                ))}
              </div>
              <strong>별궁을 펼칠 준비가 되어 있습니다</strong>
              <span>상담이 시작되면 이 자리에 당신의 12궁 명반과 주성이 놓입니다.</span>
              {recentList.length > 0 && (
                <div className="zwvRecentList" aria-label="지난 자미두수 상담 다시 보기">
                  <strong>지난 별궁 기록 다시 보기</strong>
                  {recentList.slice(0, 5).map((item) => (
                    <button key={item.id} type="button" onClick={() => void loadRecentConsultation(item.id)} disabled={busy}>
                      <span>{item.topic || "자미두수 전문가 상담"}{item.name ? ` · ${item.name}` : ""}</span>
                      <small>{item.chartSummary?.slice(0, 60) || item.lifePalace || ""}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="resultToolbar" data-ziwei-pdf-download="complete-result-v20260630">
                <div>
                  <span>완성 상담</span>
                  <strong>별궁 기록이 완성되었습니다</strong>
                </div>
                <button type="button" onClick={() => void handlePdfDownload()} disabled={pdfLoading}>
                  {pdfLoading ? <Loader2 className="spin" size={17} /> : <Download size={17} />}
                  {pdfLoading ? "저장 중" : "PDF 다운로드"}
                </button>
              </div>

              <div ref={resultRef} className="resultDocument" data-ziwei-complete-result="ziwei-ai-complete-result-v20260630">
                <section className="resultCover" data-ziwei-pdf-section>
                  <span>紫微斗數</span>
                  <h2>자미두수 별궁 상담</h2>
                  <p>{consultation.birthInfo?.name || form.name || "당신"} · {consultation.birthInfo?.birthDate || form.birthDate || "생년월일"} · {consultation.topic || FOCUS_TOPIC[form.focusArea]}</p>
                </section>

                <div className="summaryGrid" data-ziwei-pdf-section>
                  <div><span>명궁</span><strong>{summary.lifePalace || consultation.ziweiChart?.lifePalace || "-"}</strong></div>
                  <div><span>신궁</span><strong>{summary.bodyPalace || consultation.ziweiChart?.bodyPalace || "-"}</strong></div>
                  <div><span>핵심 별</span><strong>{(summary.keyStars || []).slice(0, 3).join(" · ") || "-"}</strong></div>
                  <div><span>상담 키워드</span><strong>{(summary.keywords || []).slice(0, 3).join(" · ") || consultation.topic}</strong></div>
                </div>

                <section className="basisPane" data-ziwei-pdf-section>
                  <AnalysisBasisPanel basis={consultation.analysisBasis || basis} />
                </section>

                {Object.keys(structuredScores).length > 0 && (
                  <div className="scoreGrid" data-ziwei-pdf-section>
                    {Object.entries(SCORE_LABELS).map(([key, label]) => {
                      const value = Math.max(0, Math.min(20, toNumber(structuredScores[key], 0)));
                      return (
                        <div key={key} className="scoreItem">
                          <span>{label}</span>
                          <strong>{value}/20</strong>
                          <em style={{ width: `${(value / 20) * 100}%` }} />
                        </div>
                      );
                    })}
                    <div className="overallScore">
                      <span>종합</span>
                      <strong>{Math.max(0, Math.min(100, toNumber(structuredScores.overall, 0)))}/100</strong>
                    </div>
                  </div>
                )}

                {structuredResult?.meta?.dayun && (
                  <section className="dayunBanner" data-ziwei-pdf-section>
                    <span>현재 대운</span>
                    <strong>{structuredResult.meta.dayun.current_palace || "-"} · {structuredResult.meta.dayun.age_range || "-"}</strong>
                    <p>{structuredResult.meta.dayun.theme || "지금의 흐름을 명반 기준으로 살핍니다."}</p>
                  </section>
                )}

                <MajorLuckTimeline chart={consultation.ziweiChart} birthDate={consultation.birthInfo?.birthDate} />

                <section className="chartDataPanel" data-ziwei-pdf-section data-ziwei-chart-data="basic-chart-v20260630">
                  <div className="chartDataHeader">
                    <span>기본 명반 데이터</span>
                    <strong>{consultation.birthInfo?.name || form.name || "당신"} · {consultation.birthInfo?.calendarType === "lunar" ? "음력" : "양력"} {consultation.birthInfo?.birthDate || form.birthDate || "-"}</strong>
                  </div>
                  <div className="chartDataGrid">
                    <div><span>출생시간</span><strong>{consultation.birthInfo?.birthTimeUnknown ? "출생시간 모름" : consultation.birthInfo?.birthTime || form.birthTime || "-"}</strong></div>
                    <div><span>성별</span><strong>{consultation.birthInfo?.gender || form.gender || "-"}</strong></div>
                    <div><span>명궁</span><strong>{summary.lifePalace || consultation.ziweiChart?.lifePalace || "-"}</strong></div>
                    <div><span>신궁</span><strong>{summary.bodyPalace || consultation.ziweiChart?.bodyPalace || "-"}</strong></div>
                    <div><span>화록</span><strong>{formatTransformation(fourTransformations.huaLu)}</strong></div>
                    <div><span>화권</span><strong>{formatTransformation(fourTransformations.huaQuan)}</strong></div>
                    <div><span>화과</span><strong>{formatTransformation(fourTransformations.huaKe)}</strong></div>
                    <div><span>화기</span><strong>{formatTransformation(fourTransformations.huaJi)}</strong></div>
                  </div>
                </section>

                <section className="palaceBoard" data-ziwei-pdf-section>
                  <div className="palaceBoardSky" aria-hidden="true" />
                  <div className="palaceGrid">
                    {palaces.slice(0, 12).map((palace) => {
                      const isLife = Boolean(palace.name?.includes("명궁")) || (Boolean(lifeBranch) && palace.earthlyBranch === lifeBranch);
                      const isBody = Boolean(bodyBranch) && palace.earthlyBranch === bodyBranch;
                      const mainStars = palace.mainStars || [];
                      const badges = palace.transformations || [];
                      const malefic = (palace.maleficStars || []).slice(0, 2);
                      return (
                        <article
                          key={`${palace.name}-${palace.earthlyBranch}`}
                          className={`palaceCard${isLife ? " isLife" : ""}${isBody ? " isBody" : ""}`}
                        >
                          {isLife && <em className="palaceTag" aria-label="명궁">命</em>}
                          {isBody && !isLife && <em className="palaceTag isBodyTag" aria-label="신궁">身</em>}
                          <div className="palaceHead">
                            <strong>{palace.name}</strong>
                            <span>{palace.earthlyBranch || ""}</span>
                          </div>
                          <div className="starRow">
                            {mainStars.length
                              ? mainStars.map((star, i) => <span key={i} className="star main">{toText(star)}</span>)
                              : <span className="star empty">주성 없음</span>}
                          </div>
                          {(badges.length > 0 || malefic.length > 0) && (
                            <div className="badgeRow">
                              {badges.map((label, i) => <span key={`h${i}`} className={`hua ${huaClass(label)}`}>{toText(label)}</span>)}
                              {malefic.map((star, i) => <span key={`m${i}`} className="star malefic">{toText(star)}</span>)}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>

                <div className="chatList">
                  {assistantSections.map((section) => (
                    <article className="chatCard" key={section.key} data-ziwei-pdf-section>
                      <div className="chatCardTitle">
                        <b>{section.glyph || "星"}</b>
                        <h3>{section.title}</h3>
                      </div>
                      <AiResultProse value={section.body} />
                    </article>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <style>{ZWV_CSS}</style>
      <style>{`
        /* 한자 폴백을 명시한 본문·제목 스택.
           --font-body 는 "…, system-ui, sans-serif" 로 끝나는데, 그 generic family 가 last-resort 로
           매칭돼 버려서 뒤에 한자 폰트를 더 붙여도 도달하지 못한다. 그래서 변수를 쓰지 않고 여기서 새로 쓴다.
           Pretendard(=CodeDestinyBody)와 세리프 청크(CodeDestinySerifKR)에는 한자 글리프가 없어
           명궁(命宮) 같은 병기가 OS 폰트로 넘어가야 보인다. */
        .ziweiAiShell{--zwv-han:"Apple SD Gothic Neo","Malgun Gothic","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK KR","Noto Sans KR";--zwv-body:"CodeDestinyHan","CodeDestinyBody","Pretendard",var(--zwv-han),system-ui,sans-serif;--zwv-serif:"CodeDestinySerifKR","CodeDestinyHan","Nanum Myeongjo","Noto Serif KR",var(--zwv-han),Georgia,serif;position:relative;min-height:100dvh;overflow:hidden;background:radial-gradient(ellipse at 22% 6%,rgba(116,82,170,.42),transparent 34%),radial-gradient(ellipse at 78% 18%,rgba(212,175,95,.20),transparent 28%),radial-gradient(ellipse at 52% 92%,rgba(83,121,177,.22),transparent 38%),linear-gradient(145deg,#050714 0%,#0d1027 42%,#161033 72%,#060712 100%);color:#f8fafc;padding:22px;font-family:var(--zwv-body)}
        .ziweiAiShell::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.72) 0 1px,transparent 1.4px),radial-gradient(circle,rgba(250,235,182,.58) 0 1px,transparent 1.2px);background-size:92px 92px,137px 137px;background-position:12px 18px,54px 36px;opacity:.22;pointer-events:none}
        .ziweiAiShell::after{content:"";position:absolute;inset:-15% -10%;background:linear-gradient(112deg,transparent 12%,rgba(183,180,232,.10) 36%,rgba(236,204,132,.13) 48%,rgba(130,111,190,.10) 62%,transparent 84%);filter:blur(18px);transform:rotate(-7deg);pointer-events:none}
        .ziweiHero,.workspace{position:relative;z-index:1}
        .ziweiHero{position:relative;min-height:315px;display:flex;align-items:flex-end;overflow:hidden;border:1px solid rgba(226,214,255,.24);border-radius:8px;background:radial-gradient(ellipse at 72% 34%,rgba(245,217,145,.16),transparent 33%),radial-gradient(ellipse at 84% 72%,rgba(143,167,255,.14),transparent 36%),linear-gradient(135deg,#05060d 0%,#111525 52%,#080a14 100%);box-shadow:0 28px 86px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.12)}
        .ziweiHero::before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,7,20,.97),rgba(8,9,26,.78) 47%,rgba(8,9,26,.38)),linear-gradient(0deg,rgba(5,7,20,.82),rgba(5,7,20,.18) 55%,rgba(5,7,20,.44));pointer-events:none}
        .ziweiHero::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 16%,rgba(245,217,145,.12) 36%,rgba(224,210,255,.08) 50%,transparent 76%);mix-blend-mode:screen;opacity:.72;pointer-events:none}
        .heroConstellation{position:absolute;right:clamp(18px,6vw,88px);top:50%;z-index:1;width:clamp(246px,40vw,430px);aspect-ratio:1;transform:translateY(-50%);opacity:.84;filter:drop-shadow(0 0 34px rgba(245,217,145,.16))}
        .heroOrbit{position:absolute;inset:0;border-radius:999px;border:1px solid rgba(245,217,145,.25);background:conic-gradient(from 18deg,rgba(245,217,145,.16),transparent 17%,rgba(143,167,255,.14) 36%,transparent 57%,rgba(245,217,145,.11) 77%,transparent)}
        .heroOrbit--middle{inset:16%;border-color:rgba(224,210,255,.18);transform:rotate(18deg)}
        .heroOrbit--inner{inset:32%;border-color:rgba(245,217,145,.18);transform:rotate(-12deg);background:radial-gradient(circle,rgba(245,217,145,.16),transparent 58%)}
        .heroConstellation i{position:absolute;left:50%;top:50%;width:7px;height:7px;border-radius:999px;background:#fff0b8;box-shadow:0 0 16px rgba(245,217,145,.82),0 0 34px rgba(143,167,255,.28);transform:translate(-50%,-50%) rotate(var(--angle)) translateY(clamp(-190px,-18vw,-108px))}
        .heroConstellation b{position:absolute;left:50%;top:50%;display:grid;place-items:center;width:72px;aspect-ratio:1;border:1px solid rgba(245,217,145,.36);border-radius:999px;background:linear-gradient(145deg,rgba(255,240,184,.22),rgba(224,210,255,.08));color:#fff0b8;font-family:var(--font-premium);font-size:34px;font-weight:900;transform:translate(-50%,-50%);box-shadow:0 0 34px rgba(245,217,145,.16),inset 0 1px 0 rgba(255,255,255,.18)}
        .heroBackdropText{position:absolute;right:4%;bottom:8%;z-index:1;color:rgba(235,229,255,.075);font-family:var(--font-premium);font-size:clamp(58px,13vw,172px);font-weight:900;line-height:.82;white-space:nowrap;text-shadow:0 0 38px rgba(216,180,254,.12)}
        .heroCopy{position:relative;z-index:2;max-width:760px;padding:42px 40px 54px}
        .eyebrow{display:inline-flex;align-items:center;gap:8px;margin:0 0 14px;color:#fde8a7;font-size:13px;font-weight:850}
        .heroCopy h2{margin:0;color:#fffaf0;font-family:var(--font-premium);font-size:clamp(40px,7vw,78px);line-height:1.03;letter-spacing:0;text-shadow:0 0 28px rgba(252,211,77,.18)}
        .heroCopy p:last-child{max-width:650px;margin:16px 0 0;color:#e6e0ff;font-size:17px;line-height:1.76;text-shadow:0 2px 18px rgba(3,5,14,.92)}
        .heroSeparator{position:absolute;left:0;right:0;bottom:0;height:54px;background:radial-gradient(ellipse at 30% 100%,rgba(244,214,148,.24),transparent 46%),linear-gradient(180deg,transparent,rgba(9,10,30,.84));pointer-events:none}
        .workspace{display:grid;grid-template-columns:minmax(320px,446px) minmax(0,1fr);gap:18px;max-width:1360px;margin:18px auto 0}
        .consultForm,.resultPane{border:1px solid rgba(224,210,255,.24);border-radius:8px;background:linear-gradient(180deg,rgba(24,23,58,.78),rgba(9,11,30,.88));box-shadow:0 20px 62px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.10);backdrop-filter:blur(22px) saturate(1.18);-webkit-backdrop-filter:blur(22px) saturate(1.18)}
        .consultForm{display:grid;gap:14px;align-self:start;padding:20px;position:sticky;top:16px}
        .formHeader{display:flex;align-items:center;gap:9px;color:#fff0b8;font-family:var(--font-display);font-size:18px}
        .consultForm label{display:grid;gap:7px;color:#ded8ff;font-size:13px;font-weight:820}
        .consultForm input,.consultForm select,.consultForm textarea{width:100%;min-height:46px;border:1px solid rgba(224,210,255,.26);border-radius:8px;background:rgba(5,8,24,.70);color:#fffaf0;padding:11px 12px;font:inherit;outline:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.06);transition:border-color .18s ease,box-shadow .18s ease,background .18s ease}
        .consultForm textarea{resize:vertical;min-height:132px;line-height:1.62}
        .consultForm input:hover,.consultForm select:hover,.consultForm textarea:hover{border-color:rgba(244,214,148,.42);background:rgba(9,12,32,.82)}
        .consultForm input:focus,.consultForm select:focus,.consultForm textarea:focus{border-color:#f5d991;box-shadow:0 0 0 3px rgba(245,217,145,.16),0 0 24px rgba(181,152,255,.14)}
        .consultForm textarea::placeholder{color:rgba(226,214,255,.54)}
        .fieldRow{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .toggles{display:flex;gap:10px;flex-wrap:wrap}
        .check{display:inline-flex;grid-template-columns:auto 1fr;align-items:center;gap:9px;border:1px solid rgba(224,210,255,.20);border-radius:8px;background:rgba(255,255,255,.055);padding:10px 11px}
        .check input{width:17px;min-width:17px;height:17px;min-height:17px;padding:0;accent-color:#f5d991}
        .primaryBtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border:0;border-radius:8px;background:linear-gradient(135deg,#fff0b8,#d9c7ff 47%,#8fa7ff);color:#0c1024;font-family:var(--font-display);font-weight:950;cursor:pointer;box-shadow:0 18px 36px rgba(105,88,198,.30),0 0 30px rgba(244,214,148,.16);transition:transform .18s ease,box-shadow .18s ease,filter .18s ease}
        .primaryBtn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 22px 44px rgba(105,88,198,.38),0 0 36px rgba(244,214,148,.22);filter:saturate(1.05)}
        .primaryBtn:disabled{cursor:not-allowed;opacity:.68}
        .notice,.error{display:flex;align-items:center;gap:7px;margin:0;border-radius:8px;padding:10px 11px;font-size:13px;line-height:1.5}
        .notice{border:1px solid rgba(245,217,145,.30);background:rgba(245,217,145,.10);color:#fff0b8}
        .error{border:1px solid rgba(248,113,113,.38);background:rgba(127,29,29,.30);color:#fecaca}
        .resultPane{min-height:640px;padding:18px}
        .emptyState,.loadingState{min-height:584px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:13px;text-align:center;color:#d7ceff}
        .emptyState strong,.loadingState strong{color:#fffaf0;font-family:var(--font-display);font-size:21px}
        .emptyState span,.loadingState span{max-width:360px;color:#beb8df;line-height:1.65}
        .loadingSteps{display:flex;gap:10px;margin-top:8px}
        .loadingSteps i{display:grid;place-items:center;width:28px;aspect-ratio:1;border:1px solid rgba(224,210,255,.16);border-radius:999px;color:rgba(224,210,255,.38);font-style:normal;font-family:var(--font-premium);font-size:13px;transition:all .24s ease}
        .loadingSteps i.isActive{border-color:rgba(245,217,145,.46);background:rgba(245,217,145,.12);color:#fff0b8;box-shadow:0 0 18px rgba(245,217,145,.18)}
        .palaceSigil{position:relative;width:168px;aspect-ratio:1;border:1px solid rgba(245,217,145,.30);border-radius:999px;background:radial-gradient(circle,rgba(245,217,145,.18),transparent 27%),radial-gradient(circle,rgba(143,167,255,.16),transparent 56%);box-shadow:0 0 42px rgba(168,147,255,.18),inset 0 0 28px rgba(245,217,145,.08)}
        .palaceSigil::before,.palaceSigil::after{content:"";position:absolute;inset:22px;border:1px solid rgba(224,210,255,.18);border-radius:999px}
        .palaceSigil::after{inset:52px;background:rgba(245,217,145,.18);box-shadow:0 0 18px rgba(245,217,145,.30)}
        .palaceSigil span{position:absolute;left:50%;top:50%;width:7px;height:7px;border-radius:999px;background:#fff0b8;box-shadow:0 0 16px rgba(245,217,145,.82);transform:rotate(calc(var(--i,0)*30deg)) translateY(-72px)}
        .palaceSigil span:nth-child(1){--i:0}.palaceSigil span:nth-child(2){--i:1}.palaceSigil span:nth-child(3){--i:2}.palaceSigil span:nth-child(4){--i:3}.palaceSigil span:nth-child(5){--i:4}.palaceSigil span:nth-child(6){--i:5}.palaceSigil span:nth-child(7){--i:6}.palaceSigil span:nth-child(8){--i:7}.palaceSigil span:nth-child(9){--i:8}.palaceSigil span:nth-child(10){--i:9}.palaceSigil span:nth-child(11){--i:10}.palaceSigil span:nth-child(12){--i:11}
        .palaceSigil.isSpinning{animation:ziweiSpin 9s linear infinite}
        .resultToolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;border:1px solid rgba(245,217,145,.24);border-radius:8px;background:linear-gradient(145deg,rgba(245,217,145,.12),rgba(143,167,255,.10));padding:12px}
        .resultToolbar span{display:block;color:#cfc7f8;font-size:12px;font-weight:820}
        .resultToolbar strong{display:block;margin-top:3px;color:#fffaf0;font-family:var(--font-display);font-size:16px;line-height:1.35}
        .resultToolbar button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;border:1px solid rgba(245,217,145,.42);border-radius:8px;background:rgba(245,217,145,.14);color:#fff0b8;padding:0 13px;font-family:var(--font-display);font-size:13px;font-weight:900;cursor:pointer;white-space:nowrap;box-shadow:0 12px 24px rgba(0,0,0,.18)}
        .resultToolbar button:disabled{cursor:not-allowed;opacity:.62}
        .resultDocument{display:grid;gap:14px;background:#060712;color:#f8fafc}
        .resultCover{display:grid;gap:8px;border:1px solid rgba(245,217,145,.24);border-radius:8px;background:radial-gradient(ellipse at 74% 18%,rgba(245,217,145,.16),transparent 38%),linear-gradient(145deg,rgba(14,16,43,.96),rgba(7,9,25,.98));padding:24px}
        .resultCover span{color:#fff0b8;font-family:var(--zwv-serif);font-size:19px;font-weight:700;letter-spacing:.22em}
        .resultCover h2{margin:0;color:#fffaf0;font-family:var(--zwv-serif);font-size:31px;font-weight:700;line-height:1.28;letter-spacing:.01em}
        .resultCover p{margin:0;color:#d9c7ff;line-height:1.65}
        .chartDataPanel{display:grid;gap:13px;border:1px solid rgba(245,217,145,.24);border-radius:8px;background:linear-gradient(145deg,rgba(245,217,145,.11),rgba(32,38,78,.78));padding:16px}
        .chartDataHeader{display:grid;gap:4px}
        .chartDataHeader span{color:#cfc7f8;font-size:12px;font-weight:820}
        .chartDataHeader strong{color:#fffaf0;font-family:var(--font-display);font-size:17px;line-height:1.42}
        .chartDataGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
        .chartDataGrid div{min-height:74px;border:1px solid rgba(224,210,255,.18);border-radius:8px;background:rgba(6,7,18,.46);padding:11px}
        .chartDataGrid span{display:block;color:#cfc7f8;font-size:12px;font-weight:820}
        .chartDataGrid strong{display:block;margin-top:7px;color:#fffaf0;font-size:14px;line-height:1.45;word-break:keep-all}
        .summaryGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
        /* 근거 패널/대기 화면은 색을 currentColor에서만 파생하므로, 여기서 글자색만 정해 주면 된다. */
        .basisPane{color:#e6dfff;margin-bottom:14px;--cd-basis-popover-bg:#161033}
        .loadingState{--cd-basis-popover-bg:#161033}
        .summaryGrid div{min-height:94px;border:1px solid rgba(245,217,145,.22);border-radius:8px;background:linear-gradient(145deg,rgba(245,217,145,.12),rgba(125,103,209,.12));padding:13px}
        .summaryGrid span{display:block;color:#cfc7f8;font-size:12px;font-weight:820}
        .summaryGrid strong{display:block;margin-top:9px;color:#fffaf0;font-size:16px;line-height:1.45;word-break:keep-all}
        .scoreGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-bottom:15px}
        .scoreItem,.overallScore{position:relative;overflow:hidden;min-height:78px;border:1px solid rgba(245,217,145,.22);border-radius:8px;background:rgba(255,255,255,.055);padding:11px}
        .scoreItem span,.overallScore span{display:block;color:#cfc7f8;font-size:12px;font-weight:820}
        .scoreItem strong,.overallScore strong{position:relative;z-index:1;display:block;margin-top:9px;color:#fff0b8;font-size:17px}
        .scoreItem em{position:absolute;left:0;bottom:0;height:3px;background:linear-gradient(90deg,#8fa7ff,#fff0b8);box-shadow:0 0 14px rgba(245,217,145,.25)}
        .overallScore{background:linear-gradient(145deg,rgba(245,217,145,.15),rgba(125,103,209,.16))}
        .dayunBanner{display:grid;gap:5px;margin-bottom:15px;border:1px solid rgba(143,167,255,.24);border-radius:8px;background:linear-gradient(145deg,rgba(72,84,168,.22),rgba(245,217,145,.08));padding:14px}
        .dayunBanner span{color:#cfc7f8;font-size:12px;font-weight:820}
        .dayunBanner strong{color:#fffaf0;font-size:16px}
        .dayunBanner p{margin:0;color:#d9c7ff;line-height:1.58}
        .palaceBoard{position:relative;overflow:hidden;margin-bottom:15px;border:1px solid rgba(226,214,255,.16);border-radius:16px;padding:14px;background:radial-gradient(ellipse at 26% 16%,rgba(99,102,241,.20),transparent 52%),radial-gradient(ellipse at 78% 84%,rgba(168,85,247,.17),transparent 55%),radial-gradient(ellipse at 50% 52%,rgba(56,189,248,.10),transparent 62%),linear-gradient(160deg,rgba(9,11,30,.72),rgba(4,5,15,.88))}
        .palaceBoardSky{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,rgba(255,255,255,.9) 0 1px,transparent 1.6px),radial-gradient(circle,rgba(250,235,182,.72) 0 1px,transparent 1.4px);background-size:76px 76px,119px 119px;background-position:11px 14px,47px 35px;opacity:.16;animation:ziweiTwinkle 5.5s ease-in-out infinite}
        .palaceGrid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
        .palaceCard{position:relative;display:flex;flex-direction:column;overflow:hidden;min-height:118px;border:1px solid rgba(224,210,255,.14);border-radius:12px;background:rgba(255,255,255,.03);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);padding:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease,background .2s ease}
        .palaceCard:hover{transform:translateY(-2px);border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 14px 28px -14px rgba(0,0,0,.65)}
        .palaceCard.isLife{border-color:rgba(252,211,77,.5);background:radial-gradient(ellipse at 50% -10%,rgba(252,211,77,.15),rgba(255,255,255,.03) 62%);box-shadow:0 0 24px -4px rgba(252,211,77,.5),inset 0 1px 0 rgba(255,255,255,.10)}
        .palaceCard.isBody{border-color:rgba(125,211,252,.44);background:radial-gradient(ellipse at 50% -10%,rgba(56,189,248,.12),rgba(255,255,255,.03) 62%);box-shadow:0 0 22px -6px rgba(56,189,248,.5),inset 0 1px 0 rgba(255,255,255,.08)}
        .palaceTag{position:absolute;top:9px;right:9px;display:grid;place-items:center;width:22px;height:22px;border-radius:999px;background:rgba(252,211,77,.16);border:1px solid rgba(252,211,77,.5);color:#ffe9a6;font-family:var(--font-premium);font-size:12px;font-weight:800;font-style:normal;box-shadow:0 0 12px rgba(252,211,77,.35)}
        .palaceTag.isBodyTag{background:rgba(56,189,248,.14);border-color:rgba(125,211,252,.5);color:#bae6fd;box-shadow:0 0 12px rgba(56,189,248,.3)}
        .palaceHead{display:flex;align-items:baseline;gap:7px;margin-bottom:9px}
        .palaceHead strong{color:#fffaf0;font-family:var(--font-display);font-size:15px;font-weight:800}
        .palaceCard.isLife .palaceHead strong{color:#ffe9a6;text-shadow:0 0 12px rgba(252,211,77,.42)}
        .palaceCard.isBody .palaceHead strong{color:#e0f2fe}
        .palaceHead span{color:#a9a2d6;font-size:12px;font-weight:700}
        .starRow{display:flex;flex-wrap:wrap;gap:5px 8px;margin-bottom:8px}
        .star{font-size:12.5px;line-height:1.3;letter-spacing:.2px}
        .star.main{color:#fde8a7;font-weight:700}
        .palaceCard.isLife .star.main{color:#fff2c4;text-shadow:0 0 8px rgba(252,211,77,.5);animation:ziweiGlow 3.4s ease-in-out infinite}
        .palaceCard.isBody .star.main{color:#dbeafe}
        .star.empty{color:#6f6a92;font-weight:600}
        .star.malefic{color:#fca5a5;font-weight:600}
        .badgeRow{display:flex;flex-wrap:wrap;gap:5px;margin-top:auto}
        .hua{display:inline-flex;align-items:center;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid transparent;color:#e6e0ff}
        .hua.huaLu{color:#bbf7d0;background:rgba(34,197,94,.13);border-color:rgba(74,222,128,.35)}
        .hua.huaQuan{color:#e9d5ff;background:rgba(168,85,247,.15);border-color:rgba(192,132,252,.4)}
        .hua.huaKe{color:#bae6fd;background:rgba(56,189,248,.14);border-color:rgba(125,211,252,.4)}
        .hua.huaJi{color:#fecaca;background:rgba(239,68,68,.16);border-color:rgba(248,113,113,.5);animation:ziweiHuaJi 2.4s ease-in-out infinite}
        @keyframes ziweiTwinkle{0%,100%{opacity:.09}50%{opacity:.22}}
        @keyframes ziweiGlow{0%,100%{text-shadow:0 0 6px rgba(252,211,77,.32)}50%{text-shadow:0 0 13px rgba(252,211,77,.7)}}
        @keyframes ziweiHuaJi{0%,100%{box-shadow:0 0 0 rgba(248,113,113,0)}50%{box-shadow:0 0 12px rgba(248,113,113,.55)}}
        @media(prefers-reduced-motion:reduce){.palaceBoardSky,.palaceCard.isLife .star.main,.hua.huaJi,.chatCard{animation:none!important}}
        .chatList{display:grid;gap:18px}
        /* 유리 질감 + 골드 헤어라인. 안쪽 실선 하나를 inset 그림자로 얹어 테두리를 두 겹으로 보이게 한다. */
        .chatCard{position:relative;display:grid;gap:13px;border:1px solid rgba(224,210,255,.20);border-radius:16px;background:linear-gradient(145deg,rgba(8,11,30,.86),rgba(28,26,64,.70));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);padding:24px 22px;color:#f8fafc;box-shadow:inset 0 1px 0 rgba(245,217,145,.14),0 14px 32px rgba(4,6,20,.34);animation:zwvSectionRise 420ms cubic-bezier(.22,1,.36,1) both}
        .chatCard:nth-child(2){animation-delay:60ms}
        .chatCard:nth-child(3){animation-delay:120ms}
        .chatCard:nth-child(4){animation-delay:180ms}
        .chatCard:nth-child(5){animation-delay:240ms}
        .chatCard:nth-child(n+6){animation-delay:300ms}
        @keyframes zwvSectionRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        .chatCardTitle{display:flex;align-items:center;gap:8px;color:#fff0b8}
        .chatCardTitle b{display:grid;place-items:center;width:32px;aspect-ratio:1;border-radius:999px;background:rgba(245,217,145,.10);color:#fff0b8;font-family:var(--font-premium);font-size:17px;font-weight:800}
        .chatCardTitle h3{margin:0;font-family:var(--zwv-serif);font-size:19px;font-weight:700;line-height:1.4;letter-spacing:.01em;color:#fff0b8}
        .chatCardTitle svg{color:#f5d991}
        .chatCard p{margin:0;white-space:pre-wrap;line-height:1.92;font-size:16px;letter-spacing:-.003em;color:#f3efff;word-break:keep-all}
        .chatCard p+p{margin-top:15px}
        /* 한자를 직접 렌더하는 자리들. 브랜드 서체(The Jamsil·Mulmaru)와 세리프 청크 모두 한자 글리프가 없어
           OS 한자 폰트로 넘어가야 命·紫微斗數 가 보인다. 이 규칙이 앞선 font-family 선언을 덮는다. */
        .eyebrow,.heroBackdropText,.heroConstellation b,.palaceTag,.chatCardTitle b,.loadingSteps i,.palaceSigil{font-family:var(--font-premium),var(--zwv-han),serif}
        .palaceHead strong,.summaryGrid strong,.chartDataHeader strong,.resultToolbar strong{font-family:var(--zwv-serif);font-weight:700}
        .summaryGrid strong{letter-spacing:.01em}
        .spin{animation:ziweiSpin 1s linear infinite}
        @keyframes ziweiSpin{to{transform:rotate(360deg)}}
        @media(max-width:980px){.workspace{grid-template-columns:1fr}.consultForm{position:static}.summaryGrid,.scoreGrid,.chartDataGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.palaceGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.resultPane{min-height:520px}.emptyState,.loadingState{min-height:430px}}
        @media(max-width:620px){.ziweiAiShell{padding:10px}.ziweiHero{min-height:248px}.heroCopy{padding:24px 20px 44px}.heroConstellation{right:-86px;top:48%;width:252px;opacity:.45}.heroConstellation i{transform:translate(-50%,-50%) rotate(var(--angle)) translateY(-112px)}.heroConstellation b{width:58px;font-size:27px}.heroBackdropText{right:-10%;bottom:14%;font-size:76px}.fieldRow,.summaryGrid,.chartDataGrid{grid-template-columns:1fr}.palaceGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.palaceBoard{padding:10px}.resultToolbar{align-items:stretch;flex-direction:column}.resultToolbar button{width:100%}.resultCover{padding:18px}.resultCover h2{font-size:24px}.resultPane{min-height:420px;padding:12px}.emptyState,.loadingState{min-height:340px}.palaceSigil{width:138px}.palaceSigil span{transform:rotate(calc(var(--i,0)*30deg)) translateY(-58px)}}
      `}</style>
    </main>
  );
}
