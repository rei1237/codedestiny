"use client";

import { CalendarDays, Download, Loader2, Moon, Share2, Sparkles, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from "react";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "@/lib/llm-text";
import AiResultProse from "@/components/fortune/AiResultProse";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "unknown" | "";
type FocusAreaType = "overall" | "love" | "money" | "career" | "health" | "relationship" | "study" | "custom";
type FlowStatus = "idle" | "preparing" | "payment" | "reading" | "ready" | "error";

type ConsultationForm = {
  userName: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  calendarType: CalendarType;
  targetYear: string;
  focusArea: FocusAreaType;
  question: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type SajuProfile = {
  birthInfo?: {
    name?: string;
    gender?: string;
    birthDate?: string;
    birthTime?: string;
    calendarType?: string;
  };
  pillars?: Array<{ label: string; value: string }>;
  dayMaster?: string;
  strength?: string;
  dominantElement?: string;
  balancingElement?: string;
  targetYear?: {
    year?: number | null;
    pillar?: string;
    tenGod?: string;
    relationToDayBranch?: string;
  };
  gyeokguk?: string;
  yongshin?: {
    core?: string;
    heesin?: string;
    gisin?: string;
    reading?: string;
  };
  johu?: {
    urgentElement?: string;
    reading?: string;
  };
  daewoonSewoon?: string;
  monthlyHighlights?: {
    opportunity?: string[];
    caution?: string[];
  };
};

type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload?: Record<string, unknown> }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

type MonthlyFlowRow = {
  month: number;
  pillar: string;
  element: string;
  tenGod: string;
  domain: string;
  relationToDayBranch: string;
  timing: string;
};

type TargetYearInfo = {
  year: number | null;
  pillar: string;
  stem: string;
  branch: string;
  stemElement: string;
  tenGod: string;
};

type RecentSession = {
  sessionId: string;
  year: number | null;
  pillar: string;
  name: string;
  updatedAt?: string;
};

type ConsultationResult = {
  ok: boolean;
  sessionId?: string;
  accessType?: AccessType;
  status?: string;
  messages?: ChatMessage[];
  sajuProfile?: SajuProfile | null;
  monthlyFlow?: MonthlyFlowRow[];
  targetYear?: TargetYearInfo | null;
  reason?: string;
  message?: string;
};

const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_REQUIRED_MESSAGE = "신년운세 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const PAYMENT_CANCELLED_MESSAGE = "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 같은 요청 권한으로 다시 이어집니다.";
const REQUIRED_INPUT_MESSAGE = "신년운세 상담에 필요한 정보가 부족해요. 생년월일, 성별, 달력 기준을 다시 확인해 주세요.";
const TARGET_YEAR_REQUIRED_MESSAGE = "상담할 연도를 선택해 주세요.";
const CUSTOM_QUESTION_REQUIRED_MESSAGE = "직접 질문을 선택했다면 궁금한 내용을 짧게 적어 주세요.";
const FEATURE_KEY = "new-year-ai-consultation";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 3000;
const FEATURE_REASON = "신년운세 AI 상담";
const FOCUS_AREA_OPTIONS: Array<{ value: FocusAreaType; label: string; prompt: string; glyph: string }> = [
  { value: "overall", label: "종합운", glyph: "年", prompt: "올해 제 명식에서 가장 먼저 붙잡아야 할 흐름과, 무리하지 않아야 할 시기를 함께 짚어주세요." },
  { value: "love", label: "연애/재회", glyph: "緣", prompt: "올해 인연이 열리는 결, 다시 다가오는 마음, 관계에서 서두르지 말아야 할 때를 깊게 봐주세요." },
  { value: "money", label: "재물/수입", glyph: "財", prompt: "올해 돈이 모이는 방식과 새는 자리, 수입을 키우기 좋은 달과 조심할 달을 짚어주세요." },
  { value: "career", label: "직업/이직", glyph: "官", prompt: "올해 일의 방향, 이직과 전환의 타이밍, 제 명식에 맞는 선택 기준을 봐주세요." },
  { value: "health", label: "건강/멘탈", glyph: "身", prompt: "올해 몸과 마음의 기운이 흔들리기 쉬운 시기와 회복을 도울 생활 리듬을 살펴주세요." },
  { value: "relationship", label: "가족/관계", glyph: "和", prompt: "올해 가족과 가까운 사람들 사이에서 풀리는 흐름과 조심해야 할 말의 결을 봐주세요." },
  { value: "study", label: "학업/성장", glyph: "文", prompt: "올해 공부, 자격, 성장운에서 힘을 써야 할 방향과 집중이 잘 열리는 시기를 봐주세요." },
  { value: "custom", label: "직접 질문", glyph: "問", prompt: "새해에 가장 깊게 들여다보고 싶은 흐름을 그대로 적어 주세요." },
];

function getFocusOption(value: FocusAreaType) {
  return FOCUS_AREA_OPTIONS.find((option) => option.value === value) || FOCUS_AREA_OPTIONS[0];
}

const defaultForm = (): ConsultationForm => ({
  userName: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  calendarType: "solar",
  targetYear: String(new Date().getFullYear() + 1),
  focusArea: "overall",
  question: "",
});

function applyProfileSeedToForm(form: ConsultationForm, profile: AiPrefillSeed): ConsultationForm {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType && profile.birthTimeUnknown === undefined) {
    return form;
  }
  return {
    ...form,
    userName: profile.name || form.userName,
    gender: (profile.gender as ConsultationForm["gender"]) || form.gender,
    birthDate: profile.birthDate || form.birthDate,
    birthTime: profile.birthTimeUnknown ? "" : (profile.birthTime || form.birthTime),
    calendarType: profile.calendarType || form.calendarType,
  };
}

function buildInitialForm(): ConsultationForm {
  return applyProfileSeedToForm(defaultForm(), readAiProfileSeed());
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `nyai-${crypto.randomUUID()}`;
  return `nyai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function buildConsultationPayload(form: ConsultationForm) {
  const focusOption = getFocusOption(form.focusArea);
  return {
    serviceType: FEATURE_KEY,
    consultationType: "newYearFortune",
    userName: form.userName.trim(),
    gender: form.gender,
    birthDate: form.birthDate,
    birthTime: form.birthTime,
    calendarType: form.calendarType,
    targetYear: Number(form.targetYear),
    focusArea: form.focusArea,
    question: form.question.trim() || focusOption.prompt,
    locale: "ko",
  };
}

function validateConsultationForm(form: ConsultationForm) {
  if (!form.birthDate || !form.gender || !form.calendarType) return REQUIRED_INPUT_MESSAGE;
  const year = Number(form.targetYear);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return TARGET_YEAR_REQUIRED_MESSAGE;
  if (form.focusArea === "custom" && form.question.trim().length < 2) return CUSTOM_QUESTION_REQUIRED_MESSAGE;
  return "";
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ response: Response; payload: T }> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    credentials: "include",
    body: JSON.stringify(idempotencyKey ? { ...body, idempotencyKey } : body),
  });
  const payload = await response.json().catch(() => ({})) as T;
  return { response, payload };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// 생성이 오래 걸릴 때(202/generating) 결과 엔드포인트를 폴링해 수렴시킨다.
// CF rate-limit(10초당 100회) 대비 최대 1req/3~8s, 상한 40회(≈5분, 서버 신선도 창 480s 이내).
const RESULT_POLL_BACKOFF_MS = [3000, 5000, 8000];
const RESULT_POLL_MAX_ATTEMPTS = 40;

async function pollNewYearResult(sessionId: string): Promise<ConsultationResult> {
  for (let attempt = 0; attempt < RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(RESULT_POLL_BACKOFF_MS[Math.min(attempt, RESULT_POLL_BACKOFF_MS.length - 1)]);
    let response: Response;
    try {
      response = await fetch(`/api/new-year-ai/result?sessionId=${encodeURIComponent(sessionId)}`, { credentials: "include" });
    } catch {
      continue;
    }
    if (response.status === 202) continue;
    if (response.status === 429) throw new Error(SERVER_ERROR_MESSAGE);
    const payload = (await response.json().catch(() => ({}))) as ConsultationResult;
    if (!response.ok) throw new Error(payload.message || LLM_ERROR_MESSAGE);
    return payload;
  }
  throw new Error("상담 생성이 평소보다 오래 걸리고 있습니다. 페이지를 닫지 말고 잠시 후 다시 시도해 주세요.");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return toDisplayText(value);
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function splitAssistantSections(content: string) {
  let normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  // 구조화 파싱에 실패한 원시(잘린) JSON은 중괄호째 노출하지 않고 읽을 수 있는 문장만 복원한다.
  if (looksLikeRawJson(normalized)) {
    normalized = extractReadableTextFromJsonLike(normalized);
    if (!normalized) return [];
  }
  const chunks = normalized.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const first = lines[0] || "";
    const headingMatch = first.match(/^(?:#{1,3}\s*)?(?:\d+[.)]\s*)?(.{2,42}?)(?:[:：])?$/);
    const hasHeading = Boolean(headingMatch && lines.length > 1 && first.length <= 44);
    return {
      title: hasHeading ? headingMatch?.[1]?.replace(/\*\*/g, "").trim() || `새해 상담 편지 ${index + 1}` : `새해 상담 편지 ${index + 1}`,
      body: hasHeading ? lines.slice(1).join("\n") : chunk,
    };
  });
}

function AssistantMessageContent({ content }: { content: string }) {
  const sections = splitAssistantSections(content);
  if (!sections.length) {
    return <AiResultProse value={content} />;
  }
  return (
    <div className="nyai-section-list">
      {sections.map((section, index) => (
        <section className="nyai-result-section" data-pdf-section={index + 1} key={`${section.title}-${index}`}>
          <h3>{section.title}</h3>
          <AiResultProse value={section.body} />
        </section>
      ))}
    </div>
  );
}

function SajuProfilePanel({ profile }: { profile: SajuProfile | null }) {
  if (!profile) return null;
  const pillars = Array.isArray(profile.pillars) ? profile.pillars.filter((item) => item.value) : [];
  const birth = profile.birthInfo || {};
  const highlights = profile.monthlyHighlights || {};
  return (
    <section className="nyai-saju-profile" data-pdf-section="saju-profile">
      <div className="nyai-saju-head">
        <strong>기본 사주 명식</strong>
        <span>{profile.targetYear?.year ? `${profile.targetYear.year}년 세운 ${profile.targetYear.pillar || ""}` : "세운 요약"}</span>
      </div>
      <div className="nyai-saju-birth">
        {[birth.name, birth.birthDate, birth.birthTime, birth.calendarType === "lunar" ? "음력" : "양력", birth.gender].filter(Boolean).join(" · ")}
      </div>
      <div className="nyai-pillar-grid">
        {pillars.map((pillar) => (
          <div className="nyai-pillar" key={pillar.label}>
            <span>{pillar.label}</span>
            <strong>{pillar.value}</strong>
          </div>
        ))}
      </div>
      <div className="nyai-saju-facts">
        <span>일간 {profile.dayMaster || "미산출"}</span>
        <span>{profile.strength || "신강·신약 미산출"}</span>
        <span>용신 {profile.yongshin?.core || "미산출"}</span>
        <span>조후 {profile.johu?.urgentElement || "미산출"}</span>
      </div>
      <div className="nyai-saju-reading">
        {profile.gyeokguk && <p>{profile.gyeokguk}</p>}
        {profile.yongshin?.reading && <p>{profile.yongshin.reading}</p>}
        {profile.johu?.reading && <p>{profile.johu.reading}</p>}
        {profile.daewoonSewoon && <p>{profile.daewoonSewoon}</p>}
        {(highlights.opportunity?.length || highlights.caution?.length) ? (
          <p>
            {highlights.opportunity?.length ? `기회 월운: ${highlights.opportunity.join(", ")}. ` : ""}
            {highlights.caution?.length ? `주의 월운: ${highlights.caution.join(", ")}.` : ""}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function buildBillingGateInput(paymentPayload: Record<string, unknown>, idempotencyKey: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  return {
    categoryKey: toText(runtimeGate.categoryKey || paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey || paymentPayload.subFeatureKey) || FEATURE_KEY,
    featureKey: toText(runtimeGate.featureKey || paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason || paymentPayload.reason) || FEATURE_REASON,
    productId: toText(runtimeGate.productId || paymentPayload.productId) || "new-year-ai",
    productType: toText(runtimeGate.productType || paymentPayload.productType) || "new-year-ai",
    serviceType: toText(runtimeGate.serviceType || paymentPayload.serviceType) || FEATURE_KEY,
    forceDeduct: true,
    deferUsage: true,
    usagePolicy: "apply_after_success",
    requestId: idempotencyKey,
    idempotencyKey,
    cost: toNumber(runtimeGate.cost ?? paymentPayload.coinPrice, FEATURE_COST),
    coinPrice: toNumber(runtimeGate.coinPrice ?? paymentPayload.coinPrice, FEATURE_COST),
    amountKRW: toNumber(runtimeGate.amountKRW ?? paymentPayload.amountKRW, FEATURE_AMOUNT_KRW),
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, FEATURE_MEMBERSHIP_CREDIT_COST),
  };
}

const KO_STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const KO_BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const HANJA_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const HANJA_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const BRANCH_ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

// 연도 간지(입춘 무시, 연 단위 근사 — 시즌 배지/테마용. 명리 계산은 서버가 담당)
function yearGanzi(year: number) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  const stemIndex = (year - 4) % 10;
  const branchIndex = (year - 4) % 12;
  return {
    ko: `${KO_STEMS[stemIndex]}${KO_BRANCHES[branchIndex]}`,
    hanja: `${HANJA_STEMS[stemIndex]}${HANJA_BRANCHES[branchIndex]}`,
    animal: BRANCH_ANIMALS[branchIndex],
    elementIndex: Math.floor(stemIndex / 2), // 0목 1화 2토 3금 4수
  };
}

// 세운 천간 오행 → 시즌 테마 컬러 (목/화/토/금/수)
const ELEMENT_THEMES = [
  { name: "목", accent: "#4ade80", soft: "rgba(74, 222, 128, 0.16)", deep: "#14532d" },
  { name: "화", accent: "#fb7185", soft: "rgba(251, 113, 133, 0.16)", deep: "#7f1d1d" },
  { name: "토", accent: "#fbbf24", soft: "rgba(251, 191, 36, 0.16)", deep: "#78350f" },
  { name: "금", accent: "#e2e8f0", soft: "rgba(226, 232, 240, 0.14)", deep: "#334155" },
  { name: "수", accent: "#818cf8", soft: "rgba(129, 140, 248, 0.18)", deep: "#312e81" },
];

function buildSeasonCountdown(targetYear: number) {
  if (!Number.isInteger(targetYear)) return "";
  const now = new Date();
  const janFirst = new Date(targetYear, 0, 1);
  if (now < janFirst) {
    const days = Math.ceil((janFirst.getTime() - now.getTime()) / 86400000);
    return `${targetYear}년 새해까지 D-${days}`;
  }
  if (now.getFullYear() === targetYear) {
    const yearEnd = new Date(targetYear + 1, 0, 1);
    const percent = Math.min(99, Math.max(1, Math.round(((now.getTime() - janFirst.getTime()) / (yearEnd.getTime() - janFirst.getTime())) * 100)));
    return `${targetYear}년의 ${percent}%를 지나는 중`;
  }
  return `${targetYear}년의 흐름을 되짚어 봅니다`;
}

const TIMING_LABELS: Record<string, string> = { 기회: "기회", 주의: "주의", 정비: "정비" };

function quarterSummaries(rows: MonthlyFlowRow[]) {
  return [0, 1, 2, 3].map((quarter) => {
    const months = rows.filter((row) => Math.floor((row.month - 1) / 3) === quarter);
    const count = (timing: string) => months.filter((row) => row.timing === timing).length;
    const opportunity = months.filter((row) => row.timing === "기회").map((row) => `${row.month}월`);
    return {
      quarter: quarter + 1,
      range: `${quarter * 3 + 1}~${quarter * 3 + 3}월`,
      opportunity: count("기회"),
      caution: count("주의"),
      maintain: count("정비"),
      highlight: opportunity.length ? `${opportunity.join("·")} 기회` : count("주의") ? "속도 조절 구간" : "정비 흐름",
    };
  });
}

function MonthlyFlowCalendar({ rows }: { rows: MonthlyFlowRow[] }) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  if (rows.length !== 12) return null;
  const selected = selectedMonth ? rows.find((row) => row.month === selectedMonth) : null;
  return (
    <section className="nyai-month-calendar" data-pdf-section="monthly-calendar" aria-label="월별 운세 캘린더 — 달을 누르면 해설이 열립니다">
      <div className="nyai-month-head">
        <strong>12개월 운세 캘린더</strong>
        <span>달을 누르면 그 달의 간지와 흐름이 열립니다</span>
      </div>
      <div className="nyai-quarter-row">
        {quarterSummaries(rows).map((item) => (
          <div className="nyai-quarter-card" key={item.quarter}>
            <span>{item.quarter}분기 · {item.range}</span>
            <strong>{item.highlight}</strong>
            <small>기회 {item.opportunity} · 주의 {item.caution} · 정비 {item.maintain}</small>
          </div>
        ))}
      </div>
      <div className="nyai-month-grid" role="list">
        {rows.map((row) => (
          <button
            type="button"
            role="listitem"
            key={row.month}
            className={`nyai-month-cell nyai-month-cell--${row.timing === "기회" ? "opportunity" : row.timing === "주의" ? "caution" : "maintain"}${selectedMonth === row.month ? " is-selected" : ""}`}
            onClick={() => setSelectedMonth(selectedMonth === row.month ? null : row.month)}
            aria-label={`${row.month}월 ${row.pillar} ${row.timing}`}
          >
            <strong>{row.month}월</strong>
            <span>{row.pillar}</span>
            <small>{TIMING_LABELS[row.timing] || row.timing}</small>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="nyai-month-detail">
          <strong>{selected.month}월 · {selected.pillar} ({selected.element})</strong>
          <p>
            십신 {selected.tenGod || "미산출"} — {selected.domain || "생활 리듬 조정"}.
            {" "}{selected.relationToDayBranch}
          </p>
        </div>
      ) : (
        <p className="nyai-month-hint">색은 계산된 판정입니다 — 밝은 칸은 기회, 붉은 칸은 주의, 회색 칸은 정비의 달.</p>
      )}
    </section>
  );
}

// SNS 공유 카드 (1080×1350) — 캔버스 직접 드로잉, 외부 요청 없음
async function drawShareCard(options: {
  year: number;
  ganziHanja: string;
  ganziKo: string;
  name: string;
  rows: MonthlyFlowRow[];
  theme: { accent: string; deep: string };
}) {
  const { year, ganziHanja, ganziKo, name, rows, theme } = options;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("share canvas unavailable");

  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#180a08");
  gradient.addColorStop(0.55, theme.deep);
  gradient.addColorStop(1, "#0b0605");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1350);

  context.strokeStyle = theme.accent;
  context.lineWidth = 6;
  context.strokeRect(48, 48, 1080 - 96, 1350 - 96);

  context.textAlign = "center";
  context.fillStyle = "rgba(255, 240, 220, 0.85)";
  context.font = "600 44px 'Noto Sans KR', sans-serif";
  context.fillText("신년운세 AI 상담", 540, 200);

  context.fillStyle = theme.accent;
  context.font = "800 220px 'Noto Serif KR', serif";
  context.fillText(ganziHanja, 540, 560);

  context.fillStyle = "#fff6ea";
  context.font = "800 88px 'Noto Sans KR', sans-serif";
  context.fillText(`${year} ${ganziKo}년`, 540, 700);

  if (name) {
    context.fillStyle = "rgba(255, 240, 220, 0.92)";
    context.font = "600 52px 'Noto Sans KR', sans-serif";
    context.fillText(`${name}님의 새해 흐름`, 540, 800);
  }

  const opportunity = rows.filter((row) => row.timing === "기회").map((row) => `${row.month}월`).slice(0, 4);
  const caution = rows.filter((row) => row.timing === "주의").map((row) => `${row.month}월`).slice(0, 4);
  context.font = "600 46px 'Noto Sans KR', sans-serif";
  context.fillStyle = theme.accent;
  context.fillText(opportunity.length ? `기회의 달 · ${opportunity.join(" ")}` : "기회의 달을 함께 찾아드립니다", 540, 950);
  context.fillStyle = "rgba(251, 146, 133, 0.95)";
  context.fillText(caution.length ? `쉬어갈 달 · ${caution.join(" ")}` : "무리하지 않는 리듬이 열쇠", 540, 1030);

  context.fillStyle = "rgba(255, 240, 220, 0.6)";
  context.font = "500 38px 'Noto Sans KR', sans-serif";
  context.fillText("code-destiny.com", 540, 1230);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("share blob failed"))), "image/png");
  });
}

const NYAI_SEASON_CSS = `
.nyai-ganzi-chip {
  display: inline-block;
  margin-top: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-style: normal;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--nyai-accent, #fbbf24);
  background: var(--nyai-accent-soft, rgba(251, 191, 36, 0.16));
  border: 1px solid var(--nyai-accent, #fbbf24);
}

.nyai-countdown {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--nyai-accent, #fbbf24);
}

.nyai-year-field > span {
  display: block;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 6px;
}

.nyai-year-chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.nyai-year-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 8px;
  border-radius: 12px;
  border: 1px solid rgba(255, 226, 191, 0.25);
  background: rgba(46, 19, 15, 0.55);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.nyai-year-chip small {
  font-size: 11px;
  opacity: 0.7;
}

.nyai-year-chip.is-active {
  border-color: var(--nyai-accent, #fbbf24);
  background: var(--nyai-accent-soft, rgba(251, 191, 36, 0.16));
}

.nyai-year-field input {
  margin-top: 8px;
  width: 100%;
}

.nyai-result-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.nyai-month-calendar {
  border: 1px solid rgba(255, 226, 191, 0.22);
  border-radius: 16px;
  padding: 14px;
  background: rgba(31, 12, 9, 0.65);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.nyai-month-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}

.nyai-month-head strong {
  font-size: 14px;
  color: var(--nyai-accent, #fbbf24);
}

.nyai-month-head span {
  font-size: 11px;
  opacity: 0.65;
}

.nyai-quarter-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.nyai-quarter-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 226, 191, 0.06);
  border: 1px solid rgba(255, 226, 191, 0.14);
}

.nyai-quarter-card span { font-size: 10px; opacity: 0.65; }
.nyai-quarter-card strong { font-size: 12px; color: var(--nyai-accent, #fbbf24); }
.nyai-quarter-card small { font-size: 10px; opacity: 0.7; }

.nyai-month-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.nyai-month-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  padding: 10px 9px;
  border-radius: 12px;
  border: 1px solid rgba(255, 226, 191, 0.18);
  background: rgba(255, 226, 191, 0.05);
  color: inherit;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.2s ease;
}

.nyai-month-cell strong { font-size: 13px; }
.nyai-month-cell span { font-size: 12px; opacity: 0.85; }
.nyai-month-cell small { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; }

.nyai-month-cell--opportunity {
  border-color: var(--nyai-accent, #fbbf24);
  background: var(--nyai-accent-soft, rgba(251, 191, 36, 0.16));
}
.nyai-month-cell--opportunity small { color: var(--nyai-accent, #fbbf24); }

.nyai-month-cell--caution {
  border-color: rgba(248, 113, 113, 0.55);
  background: rgba(248, 113, 113, 0.12);
}
.nyai-month-cell--caution small { color: #fca5a5; }

.nyai-month-cell--maintain small { opacity: 0.6; }

.nyai-month-cell.is-selected {
  transform: translateY(-2px);
  border-width: 2px;
}

.nyai-month-detail {
  border-radius: 12px;
  border: 1px dashed rgba(255, 226, 191, 0.3);
  padding: 10px 12px;
}

.nyai-month-detail strong {
  font-size: 13px;
  color: var(--nyai-accent, #fbbf24);
}

.nyai-month-detail p {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.65;
  opacity: 0.9;
}

.nyai-month-hint {
  margin: 0;
  font-size: 11px;
  opacity: 0.6;
}

.nyai-recent-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.nyai-recent-list > strong {
  font-size: 12px;
  color: var(--nyai-accent, #fbbf24);
}

.nyai-recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 226, 191, 0.2);
  background: rgba(46, 19, 15, 0.5);
  color: inherit;
  cursor: pointer;
  font-size: 13px;
  transition: border-color 0.2s ease;
}

.nyai-recent-item:hover {
  border-color: var(--nyai-accent, #fbbf24);
}

.nyai-recent-item small { opacity: 0.6; }

@media (max-width: 720px) {
  .nyai-quarter-row { grid-template-columns: repeat(2, 1fr); }
  .nyai-month-grid { grid-template-columns: repeat(3, 1fr); }
  .nyai-year-chips { grid-template-columns: 1fr 1fr; }
}
`;

export default function NewYearAiConsultationPage() {
  const [form, setForm] = useState<ConsultationForm>(() => buildInitialForm());
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [accessType, setAccessType] = useState<AccessType | "">("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sajuProfile, setSajuProfile] = useState<SajuProfile | null>(null);
  const [monthlyFlow, setMonthlyFlow] = useState<MonthlyFlowRow[]>([]);
  const [targetYearInfo, setTargetYearInfo] = useState<TargetYearInfo | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [showCustomYear, setShowCustomYear] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const startLockRef = useRef(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const resultRef = useRef<HTMLDivElement | null>(null);
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const formTouchedRef = useRef(false);

  // 서버에서 프로필 카드가 뒤늦게 도착해도, 사용자가 입력을 시작하기 전이라면 폼에 반영
  useEffect(() => {
    if (!profileSeed) return;
    setForm((prev) => (formTouchedRef.current ? prev : applyProfileSeedToForm(prev, profileSeed)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  function loadFormFromProfileCard() {
    void reloadProfileSeed().then((seed) => {
      if (seed) setForm((prev) => applyProfileSeedToForm(prev, seed));
    });
  }

  const applyResult = useCallback((result: ConsultationResult) => {
    setAccessType(result.accessType || "");
    setMessages(Array.isArray(result.messages) ? result.messages : []);
    setSajuProfile(result.sajuProfile || null);
    setMonthlyFlow(Array.isArray(result.monthlyFlow) ? result.monthlyFlow : []);
    setTargetYearInfo(result.targetYear || null);
    setNotice("");
    setError("");
    setStatus("ready");
    if (result.sessionId && typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("sid", result.sessionId);
        window.history.replaceState(null, "", url.toString());
      } catch {
        // URL 갱신 실패는 무시
      }
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/new-year-ai/result?sessionId=${encodeURIComponent(sessionId)}`, { credentials: "include" });
      const result = await response.json().catch(() => ({})) as ConsultationResult;
      if (result.ok && Array.isArray(result.messages) && result.messages.length) {
        applyResult({ ...result, sessionId });
        return true;
      }
    } catch {
      // 재열람 실패는 조용히 무시 — 새 상담은 그대로 시작 가능
    }
    return false;
  }, [applyResult]);

  // 재열람: ?sid= 복원 + 지난 상담 목록
  useEffect(() => {
    let cancelled = false;
    const sid = new URLSearchParams(window.location.search).get("sid");
    if (sid) void loadSession(sid);
    (async () => {
      try {
        const response = await fetch("/api/new-year-ai/result", { credentials: "include" });
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        if (!cancelled && Array.isArray(data?.sessions)) setRecentSessions(data.sessions);
      } catch {
        // 목록 조회 실패는 무시
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusText = useMemo(() => {
    if (status === "preparing") return "상담을 준비하고 있습니다";
    if (status === "payment") return "결제창을 확인해 주세요";
    if (status === "reading") return "새해의 기운을 읽는 중...";
    if (status === "ready") return "새해의 답장이 도착했습니다";
    return "새해 상담소가 조용히 열려 있습니다";
  }, [status]);

  const isBusy = status === "preparing" || status === "payment" || status === "reading";
  const selectedFocusOption = useMemo(
    () => getFocusOption(form.focusArea),
    [form.focusArea],
  );
  const assistantMessages = useMemo(() => messages.filter((message) => message.role === "assistant"), [messages]);

  const resetAttempt = useCallback(() => {
    if (isBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    setAccessType("");
    setMessages([]);
    setSajuProfile(null);
    setMonthlyFlow([]);
    setTargetYearInfo(null);
    setError("");
    setNotice("");
    setStatus("idle");
  }, [isBusy]);

  const updateField = (field: keyof ConsultationForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    formTouchedRef.current = true;
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    resetAttempt();
  };

  const selectFocusArea = useCallback((value: FocusAreaType) => {
    formTouchedRef.current = true;
    setForm((prev) => ({
      ...prev,
      focusArea: value,
      question: !prev.question.trim() || FOCUS_AREA_OPTIONS.some((option) => option.prompt === prev.question)
        ? FOCUS_AREA_OPTIONS.find((option) => option.value === value)?.prompt || ""
        : prev.question,
    }));
    resetAttempt();
  }, [resetAttempt]);

  const startConsultation = useCallback(async (
    payload: ReturnType<typeof buildConsultationPayload>,
    idempotencyKey: string,
    access: { accessToken?: string; billingGate?: Record<string, unknown> },
  ) => {
    setStatus("reading");
    const { payload: result } = await postJson<ConsultationResult>("/api/new-year-ai/start", {
      ...payload,
      ...access,
    }, idempotencyKey);

    if (result.ok && Array.isArray(result.messages) && result.messages.length) {
      applyResult(result);
      return;
    }
    if (result.ok && result.status === "generating" && result.sessionId) {
      // 생성이 진행 중 — 결과 엔드포인트를 폴링해 완료까지 수렴시킨다(이전에는 여기서 멈춰 영구 대기였다).
      setNotice(result.message || "올해의 흐름을 읽고 있습니다");
      setStatus("reading");
      const resolved = await pollNewYearResult(result.sessionId);
      if (resolved.ok && Array.isArray(resolved.messages) && resolved.messages.length) {
        applyResult(resolved);
        return;
      }
      throw new Error(resolved.message || LLM_ERROR_MESSAGE);
    }
    if (result.reason === "PAYMENT_VERIFY_FAILED") throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
    if (result.reason === "LLM_ERROR") throw new Error(LLM_ERROR_MESSAGE);
    throw new Error(result.message || SERVER_ERROR_MESSAGE);
  }, [applyResult]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (startLockRef.current || isBusy) return;
    const validationMessage = validateConsultationForm(form);
    if (validationMessage) {
      setNotice("");
      setError(validationMessage);
      setStatus("error");
      return;
    }
    startLockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current;
    const payload = {
      ...buildConsultationPayload(form),
      requestId: idempotencyKey,
    };
    let paymentAttempted = false;
    setError("");
    setNotice("");
    setStatus("preparing");
    beginPaidFeatureGateCheck({
      featureKey: FEATURE_KEY,
      requestId: idempotencyKey,
      title: "이용권 확인",
      reason: "신년운세 AI 상담",
      paymentMode: "MEMBERSHIP_PASS",
    });

    try {
      const { payload: access } = await postJson<EnsureAccessResult>("/api/new-year-ai/ensure-access", payload, idempotencyKey);
      if (access.ok) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId: idempotencyKey,
          title: "이용권 확인 완료",
          reason: "신년운세 AI 상담",
          paymentMode: "MEMBERSHIP_PASS",
          message: "이용권 확인이 끝났습니다. 새해의 흐름을 읽고 있습니다.",
        });
        await startConsultation(payload, idempotencyKey, { accessToken: access.accessToken });
        return;
      }
      const denied = access as Exclude<EnsureAccessResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") {
        throw new Error(LOGIN_REQUIRED_MESSAGE);
      }
      if (denied.reason === "PAYMENT_REQUIRED") {
        paymentAttempted = true;
        setNotice(PAYMENT_REQUIRED_MESSAGE);
        setStatus("payment");
        const paymentPayload = "paymentPayload" in denied ? denied.paymentPayload : {};
        const billingInput = buildBillingGateInput(asRecord(paymentPayload), idempotencyKey);
        const gate = await runBillingCoinGate(billingInput);
        if (!gate.ok || !gate.data) {
          const code = String(gate.error?.code || "").toUpperCase();
          if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
          if (code === "PAYMENT_CANCELLED") throw new Error(PAYMENT_CANCELLED_MESSAGE);
          throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
        }
        await startConsultation(payload, idempotencyKey, { billingGate: gate.data as Record<string, unknown> });
        return;
      }
      throw new Error("message" in denied ? denied.message || SERVER_ERROR_MESSAGE : SERVER_ERROR_MESSAGE);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : SERVER_ERROR_MESSAGE;
      const paymentCancelled = message === PAYMENT_CANCELLED_MESSAGE;
      setError(
        message === LOGIN_REQUIRED_MESSAGE
          || message === PAYMENT_VERIFY_FAILED_MESSAGE
          || message === PAYMENT_CANCELLED_MESSAGE
          || message === LLM_ERROR_MESSAGE
          ? message
          : paymentAttempted
            ? PAYMENT_VERIFY_FAILED_MESSAGE
          : message.includes("payment")
            ? PAYMENT_VERIFY_FAILED_MESSAGE
            : message || SERVER_ERROR_MESSAGE,
      );
      setStatus("error");
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: "이용권 확인 실패",
        reason: "신년운세 AI 상담",
        paymentMode: "MEMBERSHIP_PASS",
        message,
        cancelled: paymentCancelled,
      });
    } finally {
      startLockRef.current = false;
    }
  };

  const handleDownloadPdf = useCallback(async () => {
    if (!resultRef.current || !assistantMessages.length || isDownloading) return;
    setIsDownloading(true);
    setNotice("");
    setError("");
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const safeName = (form.userName.trim() || "new-year").replace(/[\\/:*?"<>|]/g, "_");
      await exportResultPdf({
        captureTargets: [".nyai-messages [data-pdf-section]"],
        fileName: `신년운세_AI상담_${safeName}_${form.targetYear}.pdf`,
        backgroundColor: "#2e130f",
        cover: {
          title: `${form.userName || "당신"}님의 ${form.targetYear}년 신년운세`,
          name: form.userName,
          date: new Date().toISOString().slice(0, 10),
        },
      });
    } catch {
      setError("PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDownloading(false);
    }
  }, [assistantMessages.length, form.targetYear, form.userName, isDownloading]);

  // 시즌 아이덴티티: 상담 연도의 간지·오행 테마
  const seasonYear = Number(targetYearInfo?.year || form.targetYear);
  const ganzi = useMemo(() => yearGanzi(seasonYear), [seasonYear]);
  const seasonTheme = ELEMENT_THEMES[ganzi?.elementIndex ?? 2] || ELEMENT_THEMES[2];
  const seasonCountdown = useMemo(() => buildSeasonCountdown(seasonYear), [seasonYear]);
  const themeVars = {
    "--nyai-accent": seasonTheme.accent,
    "--nyai-accent-soft": seasonTheme.soft,
    "--nyai-accent-deep": seasonTheme.deep,
  } as CSSProperties;
  const currentYear = new Date().getFullYear();

  const selectTargetYear = useCallback((year: number) => {
    formTouchedRef.current = true;
    setForm((prev) => ({ ...prev, targetYear: String(year) }));
    resetAttempt();
  }, [resetAttempt]);

  const handleShareCard = useCallback(async () => {
    if (!assistantMessages.length || isSharing || !ganzi) return;
    setIsSharing(true);
    setError("");
    try {
      const blob = await drawShareCard({
        year: seasonYear,
        ganziHanja: ganzi.hanja,
        ganziKo: ganzi.ko,
        name: form.userName.trim(),
        rows: monthlyFlow,
        theme: seasonTheme,
      });
      const fileName = `신년운세_${seasonYear}_${ganzi.ko}.png`;
      const file = new File([blob], fileName, { type: "image/png" });
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${seasonYear} ${ganzi.ko}년 신년운세`,
          text: `${seasonYear} ${ganzi.ko}년, 나의 새해 흐름을 확인했어요.`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (caught) {
      if ((caught as Error)?.name !== "AbortError") {
        setError("공유 카드를 만드는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setIsSharing(false);
    }
  }, [assistantMessages.length, form.userName, ganzi, isSharing, monthlyFlow, seasonTheme, seasonYear]);

  return (
    <main className="nyai-page" style={themeVars} data-season-element={seasonTheme.name}>
      <section className="nyai-panel nyai-intro" aria-label="신년운세 AI 상담">
        <div className="nyai-orbit" aria-hidden="true" />
        <div className="nyai-consult-card" aria-label="상담 준비 요약">
          <div className="nyai-consult-year">
            <span>상담 연도</span>
            <strong>{form.targetYear || "미정"}</strong>
            {ganzi ? (
              <em className="nyai-ganzi-chip" aria-label={`${seasonYear}년 간지 ${ganzi.ko}년`}>
                {ganzi.hanja} · {ganzi.ko}년 ({ganzi.animal}띠)
              </em>
            ) : null}
          </div>
          <div className="nyai-consult-rows">
            <span><b>집중 흐름</b>{selectedFocusOption.label}</span>
            <span><b>이름</b>{form.userName.trim() || "아직 비어 있습니다"}</span>
            <span><b>생년월일</b>{form.birthDate || "아직 비어 있습니다"}</span>
            <span><b>상태</b>{statusText}</span>
          </div>
        </div>
        <div className="nyai-intro-copy">
          <div className="nyai-kicker"><Moon size={16} /> 신년운세 AI 상담</div>
          <h1>신년운세 AI 상담</h1>
          <p>새해의 기운이 당신에게 건네는 첫 번째 조언을 명식과 세운의 흐름으로 차분히 살펴드립니다.</p>
          <div className="nyai-hero-badges" aria-label="상담 구성">
            <span>사주 원국</span>
            <span>세운 분석</span>
            <span>월별 흐름</span>
            <span>행동 전략</span>
          </div>
          <div className="nyai-status" data-status={status}>
            {isBusy && <Loader2 size={16} className="nyai-spin" />}
            {!isBusy && <Sparkles size={16} />}
            <span>{statusText}</span>
          </div>
          {seasonCountdown && <p className="nyai-countdown">{seasonCountdown}</p>}
          {accessType && <p className="nyai-access">이용 방식: {accessType}</p>}
        </div>
      </section>

      <section className="nyai-workspace">
        <form className="nyai-form nyai-panel" onSubmit={handleSubmit}>
          <div className="nyai-form-title">
            <CalendarDays size={18} />
            <h2>새해 상담에 필요한 정보를 알려주세요</h2>
            <button
              type="button"
              className="nyai-profile-load"
              onClick={loadFormFromProfileCard}
              aria-label="프로필 카드에서 출생 정보 불러오기"
            >
              프로필 카드에서 불러오기
            </button>
          </div>
          <div className="nyai-grid">
            <label>
              이름 또는 닉네임
              <input value={form.userName} onChange={updateField("userName")} placeholder="예: 하린" maxLength={80} />
            </label>
            <label>
              성별
              <select value={form.gender} onChange={updateField("gender")} required>
                <option value="">선택</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="unknown">비공개</option>
              </select>
            </label>
            <label>
              생년월일
              <input type="date" value={form.birthDate} onChange={updateField("birthDate")} required />
            </label>
            <label>
              출생시간
              <input type="time" value={form.birthTime} onChange={updateField("birthTime")} />
            </label>
            <label>
              양력/음력
              <select value={form.calendarType} onChange={updateField("calendarType")} required>
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>
            <div className="nyai-year-field">
              <span>상담 연도</span>
              <div className="nyai-year-chips" role="radiogroup" aria-label="상담 연도 선택">
                {[currentYear, currentYear + 1].map((year) => {
                  const chipGanzi = yearGanzi(year);
                  const isActive = Number(form.targetYear) === year && !showCustomYear;
                  return (
                    <button
                      type="button"
                      key={year}
                      className={`nyai-year-chip${isActive ? " is-active" : ""}`}
                      role="radio"
                      aria-checked={isActive}
                      disabled={isBusy}
                      onClick={() => {
                        setShowCustomYear(false);
                        selectTargetYear(year);
                      }}
                    >
                      <strong>{year === currentYear ? "올해" : "내년"} {year}</strong>
                      {chipGanzi ? <small>{chipGanzi.ko}년 · {chipGanzi.animal}띠</small> : null}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={`nyai-year-chip${showCustomYear ? " is-active" : ""}`}
                  role="radio"
                  aria-checked={showCustomYear}
                  disabled={isBusy}
                  onClick={() => setShowCustomYear(true)}
                >
                  <strong>다른 연도</strong>
                  <small>직접 입력</small>
                </button>
              </div>
              {showCustomYear && (
                <input
                  type="number"
                  value={form.targetYear}
                  min="1900"
                  max="2100"
                  onChange={updateField("targetYear")}
                  aria-label="상담 연도 직접 입력"
                  required
                />
              )}
            </div>
          </div>
          <div className="nyai-focus-panel">
            <div className="nyai-focus-head">
              <strong>더 깊게 보고 싶은 흐름</strong>
              <span>{selectedFocusOption.label}</span>
            </div>
            <div className="nyai-category-grid" role="radiogroup" aria-label="집중 상담 분야">
              {FOCUS_AREA_OPTIONS.map((option) => (
                <button
                  type="button"
                  className={`nyai-category-chip${form.focusArea === option.value ? " is-active" : ""}`}
                  key={option.value}
                  onClick={() => selectFocusArea(option.value)}
                  role="radio"
                  aria-checked={form.focusArea === option.value}
                  disabled={isBusy}
                >
                  <span>{option.glyph}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className="nyai-topic">
            명리학자에게 맡길 질문
            <textarea
              value={form.question}
              onChange={updateField("question")}
              placeholder={selectedFocusOption.prompt}
              minLength={form.focusArea === "custom" ? 2 : undefined}
              maxLength={1000}
              required={form.focusArea === "custom"}
            />
          </label>
          {notice && <p className="nyai-notice">{notice}</p>}
          {error && <p className="nyai-error">{error}</p>}
          <div className="flex items-center justify-end">
            <PriceBadge featureKey="new-year-ai-consultation" fallbackCoins={300} prefix="상담 이용 가격 " />
          </div>
          <button className="nyai-primary" type="submit" disabled={isBusy}>
            {isBusy ? <Loader2 size={18} className="nyai-spin" /> : <WalletCards size={18} />}
            <span>{isBusy ? statusText : "신년운세 AI 상담 받기"}</span>
          </button>
        </form>

        <section className="nyai-chat nyai-panel" aria-live="polite">
          <div className="nyai-chat-head">
            <div className="nyai-chat-title">
              <Sparkles size={18} />
              <h2>새해의 첫 번째 답장</h2>
            </div>
            {assistantMessages.length > 0 && (
              <div className="nyai-result-actions">
                <button className="nyai-pdf-button" type="button" onClick={() => void handleShareCard()} disabled={isSharing} aria-label="공유 카드 이미지 만들기">
                  {isSharing ? <Loader2 size={16} className="nyai-spin" /> : <Share2 size={16} />}
                  <span>{isSharing ? "카드 생성 중" : "공유 카드"}</span>
                </button>
                <button className="nyai-pdf-button" type="button" onClick={handleDownloadPdf} disabled={isDownloading}>
                  {isDownloading ? <Loader2 size={16} className="nyai-spin" /> : <Download size={16} />}
                  <span>{isDownloading ? "저장 중" : "PDF 저장"}</span>
                </button>
              </div>
            )}
          </div>
          <div className="nyai-messages" ref={resultRef}>
            {assistantMessages.length === 0 ? (
              <div className="nyai-empty">
                <p>아직 새해의 첫 문장이 열리지 않았습니다.</p>
                <span>생년월일과 궁금한 흐름을 남기면, 원국과 세운이 맞물리는 지점부터 차분히 짚어드립니다.</span>
                {recentSessions.length > 0 && (
                  <div className="nyai-recent-list" aria-label="지난 신년운세 다시 보기">
                    <strong>지난 상담 다시 보기</strong>
                    {recentSessions.map((session) => (
                      <button
                        type="button"
                        key={session.sessionId}
                        className="nyai-recent-item"
                        onClick={() => void loadSession(session.sessionId)}
                      >
                        <span>{session.year ? `${session.year}년` : "신년운세"}{session.pillar ? ` ${session.pillar}` : ""}</span>
                        <small>{session.name || "무기명"}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : assistantMessages.map((message, index) => (
              <div className="nyai-result-bundle" key={`${message.role}-${index}`}>
                {index === 0 && <SajuProfilePanel profile={sajuProfile} />}
                {index === 0 && <MonthlyFlowCalendar rows={monthlyFlow} />}
                <article className="nyai-message nyai-message--assistant">
                  <span>새해 상담 편지</span>
                  <AssistantMessageContent content={message.content} />
                </article>
              </div>
            ))}
          </div>
        </section>
      </section>

      <style>{NYAI_SEASON_CSS}</style>
      <style>{`
        .nyai-page {
          min-height: 100vh;
          padding: clamp(18px, 3vw, 42px);
          color: #fff7e3;
          background:
            radial-gradient(circle at 12% 12%, rgba(255, 217, 118, .28), transparent 26%),
            radial-gradient(circle at 88% 10%, rgba(134, 28, 47, .46), transparent 34%),
            radial-gradient(circle at 76% 84%, rgba(98, 32, 88, .32), transparent 32%),
            linear-gradient(140deg, #21090c 0%, #71151f 36%, #331022 68%, #130d09 100%);
          font-family: CodeDestinyBody, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .nyai-page::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .24;
          background:
            linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,.05) 1px, transparent 1px),
            radial-gradient(circle at 30% 20%, rgba(255, 229, 160, .32) 0 1px, transparent 2px);
          background-size: 42px 42px, 42px 42px, 96px 96px;
          mix-blend-mode: soft-light;
        }

        .nyai-panel {
          border: 1px solid rgba(246, 203, 115, .28);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(255, 248, 226, .14), rgba(67, 17, 22, .74)),
            repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 1px, transparent 1px 12px),
            rgba(29, 18, 16, .86);
          box-shadow: 0 24px 70px rgba(28, 5, 8, .38), inset 0 1px 0 rgba(255, 244, 205, .12);
          backdrop-filter: blur(16px);
        }

        .nyai-intro {
          display: grid;
          grid-template-columns: minmax(210px, 340px) minmax(0, 1fr);
          gap: clamp(18px, 4vw, 46px);
          align-items: center;
          max-width: 1180px;
          margin: 0 auto clamp(18px, 3vw, 30px);
          padding: clamp(16px, 3vw, 30px);
          position: relative;
          overflow: hidden;
        }

        .nyai-intro::before,
        .nyai-intro::after {
          content: "";
          position: absolute;
          pointer-events: none;
        }

        .nyai-intro::before {
          inset: 12px;
          border: 1px solid rgba(246, 203, 115, .18);
          border-radius: 8px;
        }

        .nyai-intro::after {
          width: 190px;
          height: 190px;
          right: -46px;
          top: -54px;
          border-radius: 50%;
          background:
            radial-gradient(circle, rgba(255, 218, 122, .4) 0 2px, transparent 3px),
            conic-gradient(from 20deg, transparent 0 18deg, rgba(255, 214, 119, .2) 18deg 24deg, transparent 24deg 48deg);
          background-size: 24px 24px, 100% 100%;
          opacity: .7;
        }

        .nyai-orbit {
          position: absolute;
          width: 118px;
          height: 118px;
          right: 32px;
          bottom: 28px;
          border: 1px solid rgba(255, 218, 122, .28);
          border-radius: 50%;
          box-shadow: inset 0 0 0 12px rgba(255, 218, 122, .04);
          animation: nyaiSpin 16s linear infinite;
          pointer-events: none;
        }

        .nyai-orbit::before,
        .nyai-orbit::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          background: #ffd976;
        }

        .nyai-orbit::before {
          width: 7px;
          height: 7px;
          left: 12px;
          top: 14px;
        }

        .nyai-orbit::after {
          width: 4px;
          height: 4px;
          right: 20px;
          bottom: 18px;
        }

        .nyai-consult-card {
          position: relative;
          z-index: 1;
          display: grid;
          align-content: space-between;
          gap: 18px;
          min-height: 300px;
          overflow: hidden;
          padding: 18px;
          border: 1px solid rgba(255, 222, 144, .34);
          border-radius: 8px;
          background:
            radial-gradient(circle at 18% 10%, rgba(255, 223, 133, .22), transparent 34%),
            linear-gradient(155deg, rgba(62, 18, 15, .72), rgba(17, 12, 11, .82));
        }

        .nyai-consult-card::before {
          content: "";
          position: absolute;
          inset: 12px;
          border: 1px solid rgba(255, 229, 160, .18);
          border-radius: 8px;
          pointer-events: none;
        }

        .nyai-consult-year span {
          display: block;
          color: rgba(255, 237, 192, .72);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .nyai-consult-year strong {
          display: block;
          margin-top: 8px;
          color: #fff0bf;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: clamp(44px, 6vw, 72px);
          line-height: 1;
          letter-spacing: 0;
        }

        .nyai-consult-rows {
          display: grid;
          gap: 8px;
        }

        .nyai-consult-rows span {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 34px;
          padding: 8px 10px;
          border: 1px solid rgba(255, 224, 154, .2);
          border-radius: 8px;
          background: rgba(255, 248, 226, .08);
          color: #fff3cb;
          font-size: 13px;
          font-weight: 800;
        }

        .nyai-consult-rows b {
          color: rgba(255, 237, 192, .72);
          font-size: 12px;
        }

        .nyai-intro-copy h1 {
          max-width: 780px;
          margin: 14px 0 12px;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: clamp(36px, 5.2vw, 72px);
          line-height: 1.08;
          letter-spacing: 0;
          color: #fff0bf;
          text-shadow: 0 12px 34px rgba(48, 6, 10, .42);
        }

        .nyai-intro-copy p {
          max-width: 680px;
          margin: 0;
          color: rgba(255, 247, 227, .82);
          font-size: 16px;
          line-height: 1.7;
        }

        .nyai-hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }

        .nyai-hero-badges span {
          min-height: 28px;
          padding: 6px 10px;
          border: 1px solid rgba(255, 224, 154, .26);
          border-radius: 8px;
          background: rgba(255, 248, 226, .08);
          color: #ffedc0;
          font-size: 12px;
          font-weight: 800;
        }

        .nyai-kicker,
        .nyai-status,
        .nyai-form-title,
        .nyai-chat-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .nyai-kicker {
          color: #ffe09a;
          font-weight: 700;
        }

        .nyai-status {
          margin-top: 18px;
          min-height: 34px;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255, 235, 174, .13);
          color: #ffe7a8;
          font-size: 14px;
          border: 1px solid rgba(255, 218, 122, .18);
        }

        .nyai-access {
          margin-top: 8px !important;
          font-size: 13px !important;
          color: rgba(178, 238, 222, .82) !important;
        }

        .nyai-workspace {
          display: grid;
          grid-template-columns: minmax(300px, 440px) minmax(0, 1fr);
          gap: clamp(16px, 3vw, 28px);
          max-width: 1180px;
          margin: 0 auto;
        }

        .nyai-form,
        .nyai-chat {
          padding: clamp(16px, 2.6vw, 24px);
        }

        .nyai-form-title,
        .nyai-chat-head {
          margin-bottom: 16px;
          color: #ffe09a;
        }

        .nyai-chat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .nyai-form-title h2,
        .nyai-chat-head h2 {
          margin: 0;
          font-size: 18px;
          letter-spacing: 0;
        }

        .nyai-form-title {
          display: flex;
        }

        .nyai-form-title h2 {
          min-width: 0;
          flex: 1;
        }

        .nyai-profile-load {
          flex-shrink: 0;
          min-height: 30px;
          padding: 5px 10px;
          border: 1px solid var(--nyai-accent-soft, rgba(255, 224, 154, .3));
          border-radius: 8px;
          background: var(--nyai-accent-soft, rgba(255, 248, 226, .1));
          color: var(--nyai-accent, #ffe09a);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .nyai-pdf-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-width: 108px;
          min-height: 36px;
          padding: 0 11px;
          border: 1px solid rgba(255, 224, 154, .34);
          border-radius: 8px;
          background: rgba(255, 248, 226, .11);
          color: #fff3cb;
          font: inherit;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
        }

        .nyai-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .nyai-form label {
          display: grid;
          gap: 7px;
          color: rgba(255, 247, 227, .78);
          font-size: 13px;
          font-weight: 700;
        }

        .nyai-form input,
        .nyai-form select,
        .nyai-form textarea {
          width: 100%;
          border: 1px solid rgba(246, 203, 115, .28);
          border-radius: 8px;
          background: rgba(255, 250, 235, .1);
          color: #fff8e6;
          font: inherit;
          outline: none;
        }

        .nyai-form input:focus,
        .nyai-form select:focus,
        .nyai-form textarea:focus {
          border-color: rgba(255, 218, 122, .72);
          box-shadow: 0 0 0 3px rgba(255, 218, 122, .12);
        }

        .nyai-form input,
        .nyai-form select {
          min-height: 44px;
          padding: 0 12px;
        }

        .nyai-form select option {
          color: #141922;
        }

        .nyai-focus-panel {
          display: grid;
          gap: 10px;
          margin-top: 12px;
          padding: 12px;
          border: 1px solid rgba(253, 230, 138, .22);
          border-radius: 8px;
          background: rgba(12, 10, 9, .28);
        }

        .nyai-focus-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #ffedc0;
          font-size: 13px;
        }

        .nyai-focus-head span {
          color: #fcd34d;
          font-weight: 900;
        }

        .nyai-category-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .nyai-category-chip {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 36px;
          padding: 0 11px;
          border: 1px solid rgba(253, 230, 138, .28);
          border-radius: 8px;
          background: rgba(255, 255, 255, .08);
          color: #fef3c7;
          font: inherit;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
        }

        .nyai-category-chip span {
          display: inline-grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: radial-gradient(circle at 32% 24%, #fff7d6, #fbbf24 55%, #92400e);
          color: #40100d;
          font-size: 12px;
          font-weight: 900;
        }

        .nyai-category-chip.is-active {
          border-color: rgba(253, 230, 138, .72);
          background: rgba(245, 158, 11, .2);
          color: #fff7ed;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, .1);
        }

        .nyai-topic {
          margin-top: 12px;
        }

        .nyai-form textarea {
          min-height: 132px;
          padding: 12px;
          resize: vertical;
          line-height: 1.6;
        }

        .nyai-notice,
        .nyai-error {
          margin: 14px 0 0;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.55;
        }

        .nyai-notice {
          color: #ffe7a8;
          background: rgba(245, 213, 141, .12);
          border: 1px solid rgba(245, 213, 141, .16);
        }

        .nyai-error {
          color: #ffd8d8;
          background: rgba(117, 24, 54, .32);
          border: 1px solid rgba(255, 168, 168, .18);
        }

        .nyai-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          border: 0;
          border-radius: 8px;
          color: #2a100f;
          background: linear-gradient(135deg, #ffe8a8, #d89a38 48%, #ffd976);
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(74, 17, 13, .26);
        }

        .nyai-primary {
          width: 100%;
          margin-top: 16px;
        }

        .nyai-primary:disabled,
        .nyai-category-chip:disabled,
        .nyai-pdf-button:disabled {
          cursor: not-allowed;
          opacity: .62;
        }

        .nyai-chat {
          min-height: 560px;
          display: flex;
          flex-direction: column;
        }

        .nyai-messages {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          overflow: auto;
          padding-right: 4px;
        }

        .nyai-empty {
          display: grid;
          place-content: center;
          min-height: 330px;
          text-align: center;
          color: rgba(255, 247, 227, .72);
        }

        .nyai-empty p {
          margin: 0 0 8px;
          color: #ffe09a;
          font-size: 18px;
          font-weight: 800;
        }

        .nyai-empty span {
          font-size: 14px;
        }

        .nyai-message {
          max-width: 100%;
          padding: 14px 15px;
          border-radius: 8px;
          white-space: pre-wrap;
          line-height: 1.72;
        }

        .nyai-result-bundle {
          display: grid;
          gap: 12px;
        }

        .nyai-saju-profile {
          padding: 15px;
          border: 1px solid rgba(178, 238, 222, .24);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(178, 238, 222, .11), rgba(255, 250, 235, .045)),
            rgba(25, 42, 37, .36);
          color: #fff8e6;
          line-height: 1.62;
        }

        .nyai-saju-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
          color: #d9fff2;
        }

        .nyai-saju-head strong {
          font-size: 15px;
        }

        .nyai-saju-head span,
        .nyai-saju-birth {
          color: rgba(255, 248, 230, .78);
          font-size: 12px;
        }

        .nyai-saju-birth {
          margin-bottom: 10px;
        }

        .nyai-pillar-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 10px;
        }

        .nyai-pillar {
          display: grid;
          gap: 4px;
          min-height: 58px;
          place-items: center;
          border: 1px solid rgba(255, 224, 154, .2);
          border-radius: 8px;
          background: rgba(255, 248, 226, .08);
        }

        .nyai-pillar span,
        .nyai-saju-facts span {
          color: rgba(255, 248, 230, .7);
          font-size: 12px;
        }

        .nyai-pillar strong {
          color: #ffe09a;
          font-size: 18px;
        }

        .nyai-saju-facts {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 10px;
        }

        .nyai-saju-facts span {
          padding: 5px 8px;
          border-radius: 8px;
          background: rgba(255, 248, 226, .08);
        }

        .nyai-saju-reading {
          display: grid;
          gap: 7px;
        }

        .nyai-saju-reading p {
          margin: 0;
          color: rgba(255, 248, 230, .9);
          font-size: 13px;
        }

        .nyai-message span {
          display: block;
          margin-bottom: 7px;
          color: #ffe09a;
          font-size: 12px;
          font-weight: 800;
        }

        .nyai-message p {
          margin: 0;
          color: #fff8e6;
        }

        .nyai-message--assistant {
          align-self: flex-start;
          background: rgba(255, 248, 226, .09);
          border: 1px solid rgba(245, 213, 141, .22);
        }

        .nyai-message--user {
          align-self: flex-end;
          background: rgba(58, 31, 48, .42);
          border: 1px solid rgba(255, 224, 154, .16);
        }

        .nyai-section-list {
          display: grid;
          gap: 10px;
        }

        .nyai-result-section {
          padding: 15px;
          border: 1px solid rgba(255, 224, 154, .22);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(255, 250, 235, .1), rgba(255, 250, 235, .045)),
            rgba(46, 19, 15, .34);
        }

        .nyai-result-section h3 {
          margin: 0 0 8px;
          color: #ffe09a;
          font-size: 15px;
          line-height: 1.35;
          letter-spacing: 0;
        }

        .nyai-result-section p {
          margin: 0;
          line-height: 1.8;
          word-break: keep-all;
          white-space: pre-line;
        }

        .nyai-result-section p + p {
          margin-top: 10px;
        }

        .nyai-spin {
          animation: nyaiSpin 1s linear infinite;
        }

        @keyframes nyaiSpin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 860px) {
          .nyai-page {
            padding: 12px;
          }

          .nyai-intro,
          .nyai-workspace {
            grid-template-columns: 1fr;
          }

          .nyai-consult-card {
            min-height: auto;
          }

          .nyai-grid {
            grid-template-columns: 1fr;
          }

          .nyai-chat {
            min-height: 460px;
          }

          .nyai-pillar-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .nyai-saju-head {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
