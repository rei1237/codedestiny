"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { handleSessionInvalidated } from "@/app/_lib/auth-store";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
import {
  buildRecommendationBundle,
  STYLE_PRESETS,
  type DraftNameCandidate,
  type NamingRecommendationInput,
  type NamingSajuHints,
} from "./namingRecommendations";
import { stashNamingRetryPayload } from "./retryHandoff";

const FEATURE_KEY = "premium-naming-prompt";
const AMOUNT_KRW = 30000;
const COIN_PRICE = 300;
const MEMBERSHIP_CREDIT_COST = 3000;
const REASON = "사주 맞춤 작명 전문가 상담 생성";

type GenderValue = "" | "M" | "F" | "OTHER";
type CalendarValue = "solar" | "lunar";
type Phase = "idle" | "checking" | "payment" | "verifying" | "generating" | "error";

type FormState = {
  gender: GenderValue;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarValue;
  isLeapMonth: boolean;
  birthPlace: string;
  timezone: string;
  familyName: string;
  nameLength: number;
  desiredType: string;
  currentName: string;
  desiredSyllablesText: string;
  requiredSyllablesText: string;
  blockedSyllablesText: string;
  desiredNamesText: string;
  preferenceTone: string;
  useHanja: boolean;
  generationNameRule: string;
  siblingHarmony: string;
  avoidFamilyNames: string;
  memo: string;
};

const INITIAL_FORM: FormState = {
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  isLeapMonth: false,
  birthPlace: "대한민국",
  timezone: "Asia/Seoul",
  familyName: "",
  nameLength: 2,
  desiredType: "",
  currentName: "",
  desiredSyllablesText: "",
  requiredSyllablesText: "",
  blockedSyllablesText: "",
  desiredNamesText: "",
  preferenceTone: "",
  useHanja: true,
  generationNameRule: "",
  siblingHarmony: "",
  avoidFamilyNames: "",
  memo: "",
};

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "로그인 후 이용할 수 있습니다.",
  INPUT_MISSING: "성별, 생년월일, 양력/음력, 성씨를 먼저 입력해 주세요.",
  HANJA_LENGTH_MISMATCH: "입력한 한자 후보의 글자 수가 한글 이름 음절 수와 맞지 않습니다.",
  PAYMENT_CANCELLED: "결제가 취소되었습니다. 필요할 때 다시 시도할 수 있습니다.",
  PAYMENT_FAILED: "결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  PAYMENT_NOT_FOUND: "결제 기록을 확인하지 못했습니다. 차감된 금액이 있다면 그대로 남아 있으니 잠시 후 다시 시도해 주세요.",
  NAMING_ACCESS_REQUIRED: "이용권·월정석·결제 중 하나를 확인한 뒤에 생성할 수 있습니다.",
  PAYMENT_ID_REQUIRED: "단건 결제 확인이 끝나지 않았습니다. 잠시 후 다시 시도해 주세요.",
  INPUT_HASH_MISMATCH: "입력값이 바뀌었습니다. 입력을 확인한 뒤 다시 시작해 주세요.",
  ACCESS_PRODUCT_MISMATCH: "작명 프롬프트 결제 권한이 아닙니다. 다시 시도해 주세요.",
  CHECKOUT_FAILED: "결제 준비 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  GENERATE_FAILED: "작명 결과 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  LLM_ERROR: "작명 결과 생성에 실패했습니다. 결제는 유지되며 같은 입력으로 다시 시도할 수 있습니다.",
  POLL_TIMEOUT: "결과 생성이 예상보다 오래 걸리고 있습니다. 잠시 후 결과 페이지를 다시 확인해 주세요.",
  NETWORK_ERROR: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
};

function errorMessage(code: string): string {
  return ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

// 🔴 /generate 는 요청 안에서 LLM 생성을 끝내는 동기 라우트다(worker/routes/naming-prompt.js —
// waitUntil 백그라운드 폴링은 Workers 요청 간 I/O 격리로 결과가 고착돼 의도적으로 배제됐다).
// 서버 예산은 엣지 한계 100초 / LLM 85초인데 authFetch 는 자체 AbortController 로 22초에 끊는다
// (AUTH_FETCH_TIMEOUT_MS). 8,000~14,000자 목표라 생성은 항상 22초를 넘고, 결과는 서버에서
// 정상 저장되는데 클라만 먼저 포기해 "확인 실패 / 네트워크 연결을 확인한 뒤…" 가 떴다.
// authFetch 는 호출부가 signal 을 주면 자기 타임아웃을 걸지 않으므로, 여기서 엣지 한계보다
// 넉넉한 상한을 직접 준다.
const GENERATE_TIMEOUT_MS = 115000;

async function postJson<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = 0,
) {
  const controller = timeoutMs > 0 && typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : 0;
  try {
    const response = await authFetch(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        ...(controller ? { signal: controller.signal } : {}),
      },
      { retryOn401: false },
    );
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data: data as T };
  } catch {
    throw new Error("NETWORK_ERROR");
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

// 확정 미인증(401/403)이면 유령 로그인(클라 로그인·서버 만료) 상태다 — 공용 핸들러로 세션·쿠키를
// 정리하고 /login으로 유도한다. runBillingCoinGate를 직접 쓰는 이 화면은 useCoinGate의 자동 처리를
// 타지 않으므로 명시적으로 배선한다(전 유료 화면 공통 계약).
function assertAuthorized(status: number): void {
  if (status === 401 || status === 403) {
    handleSessionInvalidated({ redirect: true });
    throw new Error("LOGIN_REQUIRED");
  }
}

// runBillingCoinGate가 반환하는 값(BillingResult<BillingCoinGateData>)에서 실제 결제 증빙을 뽑아낸다.
// worker/routes/billing.js coin-gate 응답에는 TS 타입이 문서화하지 않은 accessGrant/consume/payment/
// paymentId 필드가 함께 실려 오며, worker/routes/naming-prompt.js의 unwrapAccessContext()가 바로 이
// 필드들을 body 최상위 또는 paymentContext 중첩 구조에서 찾는다(app/vedic-ai/VedicAiClient.tsx의
// extractPayment()와 동일한 패턴).
function runtimePayload(result: unknown): Record<string, unknown> {
  const record = asRecord(result);
  const data = asRecord(record.data);
  return Object.keys(data).length ? data : record;
}

function isPaymentGranted(result: unknown): boolean {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  if (record.ok === false || payload.ok === false) return false;
  return Boolean(
    payload.paymentId
    || payload.transactionId
    || payload.purchaseId
    || Object.keys(asRecord(payload.accessGrant)).length
    || Object.keys(asRecord(payload.consume)).length,
  );
}

// paymentId 에는 실제 단건 결제 식별자(merchantUid/impUid)만 담는다.
// transactionId·purchaseId 를 여기에 섞으면 안 된다 — worker/routes/billing.js의
// successWithPremiumAccess()는 이용권·월정석·코인 성공 응답에도 최상위 transactionId
// (= PointHistory _id 또는 entitlement evidenceId)를 무조건 싣는데, 이걸 paymentId로 보내면
// 워커 verifyNamingAccess()가 단건 분기로 들어가 Payment 문서를 못 찾고 404로 죽는다
// (월정석은 이미 차감된 뒤라 돈만 나간다). 증빙은 accessGrant/consume 쪽으로 그대로 전달되고,
// 워커의 readContextEvidenceId()가 거기서 transactionId·ledgerId를 읽어 간다.
function extractNamingAccess(result: unknown) {
  const payload = runtimePayload(result);
  const payment = asRecord(payload.payment);
  const accessGrant = asRecord(payload.accessGrant);
  const consume = asRecord(payload.consume);
  const paymentId = String(
    payload.paymentId || payment.paymentId || payment.merchantUid || payment.impUid || "",
  ).trim();
  // 접근 방식을 최상위로도 넘긴다 — 워커 readContextAccessType/Method가 body를 1순위로 읽어
  // normalizeExecutionAccessMethod가 "single"로 오폴백하지 않게 한다.
  const accessType = String(
    consume.accessType || accessGrant.accessType || payload.accessType || "",
  ).trim();
  const accessMethod = String(
    consume.accessMethod || consume.paymentMethod
    || accessGrant.accessMethod || accessGrant.paymentMethod || "",
  ).trim();
  return { paymentId, accessType, accessMethod, accessGrant, consume, payment, raw: payload };
}

function parseListText(value: string): string[] {
  return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);
}

function parseDesiredNamesText(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      return {
        hangul: parts[0] || "",
        hanjaCandidates: parts[1] ? parts[1].split(",").map((item) => item.trim()).filter(Boolean) : [],
        note: parts[2] || "",
      };
    })
    .filter((item) => item.hangul);
}

function toRawInput(form: FormState): Record<string, unknown> {
  return {
    gender: form.gender,
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    isLeapMonth: form.isLeapMonth,
    birthPlace: form.birthPlace,
    timezone: form.timezone,
    familyName: form.familyName,
    nameLength: form.nameLength,
    desiredType: form.desiredType,
    currentName: form.currentName,
    desiredSyllables: parseListText(form.desiredSyllablesText),
    requiredSyllables: parseListText(form.requiredSyllablesText),
    blockedSyllables: parseListText(form.blockedSyllablesText),
    desiredNames: parseDesiredNamesText(form.desiredNamesText),
    preferredStyle: form.preferenceTone,
    preferredImage: parseListText(form.preferenceTone),
    useHanja: form.useHanja,
    generationNameRule: form.generationNameRule,
    siblingHarmony: form.siblingHarmony,
    avoidFamilyNames: form.avoidFamilyNames,
    memo: form.memo,
  };
}

function validateRequired(form: FormState): string[] {
  const missing: string[] = [];
  if (!form.gender) missing.push("성별");
  if (!form.birthDate) missing.push("생년월일");
  if (!form.calendarType) missing.push("양력/음력");
  if (!form.familyName.trim()) missing.push("성씨");
  return missing;
}

function makeRequestId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── 네오 정본(달빛 다크) 스코프 클래스 — DESIGN.md 팔레트/Glow-Not-Shadow 준수 ──
const FIELD = "w-full rounded-2xl border border-[#c4b5fd]/20 bg-[#090718]/70 px-4 py-3 text-sm text-[#f4eeff] outline-none transition placeholder:text-[#a294cf] focus:border-[#c4b5fd]/60 focus:shadow-[0_0_0_3px_rgba(196,181,253,0.14)] disabled:opacity-50";
const LABEL = "flex flex-col gap-1.5 text-sm font-semibold text-[#e6ddfa]";
const PANEL = "rounded-[28px] border border-[#c4b5fd]/20 bg-[#13102a]/70";
const VIOLET_GLOW = "shadow-[0_0_0_1px_rgba(167,139,250,0.14),0_0_28px_-10px_rgba(147,51,234,0.4)]";

// 세부 취향 선택 칩 — 자유 입력을 대체하지 않고 위에 얹는다. 고르면 해당 입력칸에 쉼표로 붙고,
// 다시 누르면 빠진다. 분위기 옵션은 초안 추천이 쓰는 STYLE_PRESETS 라벨·무드를 그대로 재사용해
// 사용자가 고른 문구가 초안 랭킹(rankStylePresets)에도 실제로 반영되게 한다.
const NAME_TYPE_OPTIONS = [
  "현대적이고 부드러운",
  "고전적이고 단정한",
  "중성적인",
  "부르기 쉬운",
  "흔하지 않은",
  "국제적으로 통하는",
];
const TONE_OPTIONS = Array.from(
  new Set(STYLE_PRESETS.flatMap((preset) => [preset.label, ...preset.moods])),
);
const GENERATION_RULE_OPTIONS = ["돌림자 없음", "가운데 글자 돌림자", "끝 글자 돌림자"];
const SIBLING_OPTIONS = ["형제자매 없음", "첫 글자 통일", "분위기만 맞추기"];
const AVOID_OPTIONS = ["가족 이름과 같은 발음 제외", "받침 없는 이름 선호", "된소리·거센소리 제외"];
const PURPOSE_OPTIONS = ["출생신고용", "개명용", "태명 대체용"];

function ChipGroup({
  options,
  selected,
  onToggle,
  disabled,
  label,
}: {
  options: string[];
  selected: string;
  onToggle: (token: string) => void;
  disabled: boolean;
  label: string;
}) {
  const chosen = new Set(selected.split(",").map((item) => item.trim()).filter(Boolean));
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((option) => {
        const active = chosen.has(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(option)}
            disabled={disabled}
            className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
              active
                ? "border-[#e8d5a3]/70 bg-[#e8d5a3]/20 text-[#f7efdc]"
                : "border-[#e8d5a3]/25 bg-[#e8d5a3]/[0.06] text-[#f2e9d3] hover:border-[#e8d5a3]/55"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

const GENERATING_STEPS = [
  "입력값과 사주 기준을 확인하는 중",
  "이용권·결제를 확인하는 중",
  "사주 명식을 세우고 용신을 검증하는 중",
  "소리와 한자를 골라 작명첩을 엮는 중",
];

const PHASE_PROGRESS: Record<Phase, number> = {
  idle: 0,
  checking: 18,
  payment: 38,
  verifying: 58,
  generating: 92,
  error: 0,
};

export default function NamingAiClient() {
  const { seed, reload } = useAiProfileSeed();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [recommendation, setRecommendation] = useState<{ candidates: DraftNameCandidate[]; moods: string[]; status: string } | null>(null);
  const [sajuHints, setSajuHints] = useState<NamingSajuHints | null>(null);

  const retryRef = useRef<{
    input: Record<string, unknown>;
    inputHash: string;
    access: ReturnType<typeof extractNamingAccess>;
  } | null>(null);

  const updateForm = useCallback((patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  // 프로필 카드 자동채움 — 비어 있는 필드만 채운다.
  useEffect(() => {
    if (!seed) return;
    setForm((prev) => ({
      ...prev,
      gender: prev.gender || (seed.gender === "male" ? "M" : seed.gender === "female" ? "F" : prev.gender),
      birthDate: prev.birthDate || seed.birthDate || prev.birthDate,
      birthTime: prev.birthTime || seed.birthTime || prev.birthTime,
      birthTimeUnknown: prev.birthDate ? prev.birthTimeUnknown : Boolean(seed.birthTimeUnknown ?? prev.birthTimeUnknown),
      calendarType: prev.birthDate ? prev.calendarType : (seed.calendarType || prev.calendarType),
      birthPlace: prev.birthPlace !== INITIAL_FORM.birthPlace ? prev.birthPlace : (seed.region || seed.city || prev.birthPlace),
      timezone: prev.timezone !== INITIAL_FORM.timezone ? prev.timezone : (seed.timezone || prev.timezone),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  // 무료 초안 추천 — 성씨 입력 시 디바운스로 갱신(결제와 무관, 참고용).
  useEffect(() => {
    if (!form.familyName.trim()) {
      setRecommendation(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const recInput: NamingRecommendationInput = {
        familyName: form.familyName.trim(),
        nameLength: form.nameLength,
        desiredType: form.desiredType,
        preferenceTone: form.preferenceTone,
        currentName: form.currentName,
        desiredSyllables: parseListText(form.desiredSyllablesText),
        requiredSyllables: parseListText(form.requiredSyllablesText),
        blockedSyllables: parseListText(form.blockedSyllablesText),
        desiredNames: parseDesiredNamesText(form.desiredNamesText),
        birthDate: form.birthDate,
        gender: form.gender,
      };
      if (cancelled) return;
      // 사주 힌트는 별도 useEffect가 비동기로 채운다(무거운 만세력 모듈을 dynamic import 하기 때문).
      // 아직 안 왔으면 null로 먼저 그리고, 도착하면 이 effect가 다시 돌아 오행 축이 반영된다.
      setRecommendation(buildRecommendationBundle(recInput, sajuHints));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sajuHints, form.familyName, form.nameLength, form.desiredType, form.preferenceTone, form.currentName, form.desiredSyllablesText, form.requiredSyllablesText, form.blockedSyllablesText, form.desiredNamesText, form.birthDate, form.gender]);

  // 무료 초안용 용신 계산 — 생년월일이 채워진 뒤에만 만세력 모듈을 dynamic import 한다.
  // 유료 프롬프트(worker/routes/naming-prompt.js)와 같은 모듈을 쓰므로 무료 초안과 결과의 오행 축이 같다.
  // 결과는 화면 표시 전용이며 서버로 보내지 않는다 — 서버는 자체 계산으로 접근권·프롬프트를 만든다.
  useEffect(() => {
    const [year, month, day] = form.birthDate.split("-").map((part) => Number(part));
    if (!year || !month || !day) {
      setSajuHints(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [{ buildSajuProfile }, { resolveNamingYongshin }] = await Promise.all([
            import("@/worker/lib/destiny-bias-engine.js"),
            import("@/worker/lib/saju-yongshin-policy.js"),
          ]);
          if (cancelled) return;
          const [hour, minute] = form.birthTimeUnknown || !form.birthTime
            ? [12, 0]
            : form.birthTime.split(":").map((part) => Number(part) || 0);
          const profile = buildSajuProfile({
            name: form.familyName || "사용자",
            gender: form.gender,
            timezone: form.timezone,
            birthPlace: form.birthPlace,
            hourPillarTimePolicy: "LOCAL_MEAN_TIME",
            dayChangePolicy: "MIDNIGHT",
            birth: {
              year,
              month,
              day,
              hour,
              minute,
              calendarType: form.isLeapMonth ? "lunar_leap" : form.calendarType,
              timezone: form.timezone,
              birthPlace: form.birthPlace,
              unknownTime: form.birthTimeUnknown,
            },
          });
          if (cancelled) return;
          setSajuHints(resolveNamingYongshin(profile) as NamingSajuHints);
        } catch {
          // 만세력 계산이 실패해도 초안은 계속 나와야 한다 — 오행 축 없이 성별·분위기 기준으로 폴백.
          if (!cancelled) setSajuHints(null);
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.birthDate, form.birthTime, form.birthTimeUnknown, form.calendarType, form.isLeapMonth, form.gender, form.timezone, form.birthPlace, form.familyName]);

  const missing = useMemo(() => validateRequired(form), [form]);
  // 복성(남궁·황보)은 2음절이라 통과한다. 3음절 이상이면 이름 전체를 성씨 칸에 적은 것으로 본다.
  const familyNameLooksLikeFullName = useMemo(
    () => (form.familyName.match(/[가-힣]/g) || []).length >= 3,
    [form.familyName],
  );
  const stepDone = [
    Boolean(form.gender && form.birthDate && form.calendarType),
    Boolean(form.familyName.trim()),
    Boolean(form.desiredType || form.preferenceTone || form.generationNameRule || form.siblingHarmony || form.avoidFamilyNames || form.memo),
  ];

  function applyCandidate(candidate: DraftNameCandidate) {
    setForm((prev) => ({
      ...prev,
      desiredNamesText: prev.desiredNamesText
        ? `${prev.desiredNamesText}\n${candidate.name}`
        : candidate.name,
    }));
  }

  // 쉼표로 이어진 자유 입력칸에 선택 칩을 넣고 뺀다. maxLength를 넘으면 추가하지 않는다.
  type TokenField = "desiredType" | "preferenceTone" | "generationNameRule" | "siblingHarmony" | "avoidFamilyNames" | "memo";
  function toggleToken(field: TokenField, token: string, maxLength: number) {
    setForm((prev) => {
      const tokens = String(prev[field] || "").split(",").map((item) => item.trim()).filter(Boolean);
      const index = tokens.indexOf(token);
      const next = index >= 0 ? tokens.filter((_, i) => i !== index) : tokens.concat(token);
      const value = next.join(", ");
      if (index < 0 && value.length > maxLength) return prev;
      return { ...prev, [field]: value };
    });
  }

  function applyMood(mood: string) {
    setForm((prev) => ({
      ...prev,
      preferenceTone: prev.preferenceTone
        ? (prev.preferenceTone.includes(mood) ? prev.preferenceTone : `${prev.preferenceTone}, ${mood}`)
        : mood,
    }));
  }

  async function runVerifyAndGenerate(args: {
    input: Record<string, unknown>;
    inputHash: string;
    access: ReturnType<typeof extractNamingAccess>;
  }) {
    const { input, inputHash, access } = args;
    setPhase("generating");
    // /generate가 이용권/결제 접근권을 직접 검증하므로 별도 verify-payment 선검사는 두지 않는다
    // (이용권 중복 검사 제거 — 서버 검사 1회). 생성은 그 요청 안에서 동기로 끝나고 201로 결과가 온다.
    // 네트워크가 끊겨도 서버 쪽 생성은 대개 완주해 실행 레코드가 남는다 — 같은 입력·같은 증거로 한 번
    // 더 부르면 beginNamingGeneration이 그 레코드를 그대로 돌려주므로(추가 차감 없음) 1회 재시도한다.
    const generateOnce = () => postJson<{
      ok: boolean;
      code?: string;
      reason?: string;
      message?: string;
      executionId?: string;
      result?: { id: string };
    }>("/api/naming-prompt/generate", {
      paymentId: access.paymentId,
      accessType: access.accessType,
      accessMethod: access.accessMethod,
      inputHash,
      input,
      paymentContext: access.raw,
      accessGrant: access.accessGrant,
      consume: access.consume,
      payment: access.payment,
    }, GENERATE_TIMEOUT_MS);

    let genRes;
    try {
      genRes = await generateOnce();
    } catch (caught) {
      if ((caught instanceof Error ? caught.message : "") !== "NETWORK_ERROR") throw caught;
      genRes = await generateOnce();
    }

    assertAuthorized(genRes.status);
    if (genRes.status === 402) throw new Error("PAYMENT_FAILED");
    if (genRes.status === 503 || genRes.data?.reason === "LLM_ERROR") {
      throw new Error("LLM_ERROR");
    }
    const executionId = genRes.data?.result?.id || genRes.data?.executionId;
    if (!genRes.data?.ok || !executionId) {
      throw new Error(String(genRes.data?.code || "GENERATE_FAILED"));
    }
    // 백그라운드 생성이 실패하면 실패 표면이 결과 페이지로 넘어간다 — 결과 페이지가 추가 차감 없이
    // 재생성(= /generate 재호출)할 수 있도록 재시도 페이로드를 executionId 키로 넘긴다.
    stashNamingRetryPayload(executionId, { input, inputHash, access });
    retryRef.current = null;
    window.location.assign(`/naming-ai/result?executionId=${encodeURIComponent(executionId)}`);
  }

  async function handleRetry() {
    if (busy) return;
    const pending = retryRef.current;
    if (!pending) {
      await handleSubmit();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await runVerifyAndGenerate(pending);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      setError(errorMessage(code));
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (busy) return;
    if (missing.length) {
      setError(`${missing.join(", ")}을(를) 먼저 입력해 주세요.`);
      setStep(missing.includes("성씨") && !missing.includes("성별") && !missing.includes("생년월일") ? 1 : 0);
      return;
    }
    setBusy(true);
    setError("");
    let gateStarted = false;
    const requestId = makeRequestId("naming-prompt");

    try {
      setPhase("checking");
      const input = toRawInput(form);

      // sajuEvidence는 보내지 않는다 — 서버(handleCheckout/handleGenerate)가
      // 자체 계산 폴백(buildFallbackSajuContext)으로 사주를 직접 산출한다.
      const checkoutRes = await postJson<{
        ok: boolean;
        code?: string;
        inputHash: string;
        checkoutPayload?: Record<string, unknown>;
      }>("/api/naming-prompt/checkout", { input });
      assertAuthorized(checkoutRes.status);
      if (!checkoutRes.data?.ok) throw new Error(String(checkoutRes.data?.code || "CHECKOUT_FAILED"));

      const { inputHash, checkoutPayload } = checkoutRes.data;

      setPhase("payment");
      beginPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId,
        title: "이용권 확인",
        reason: REASON,
        paymentMode: "MEMBERSHIP_PASS",
      });
      gateStarted = true;

      const gate = await runBillingCoinGate({
        featureKey: FEATURE_KEY,
        subFeatureKey: FEATURE_KEY,
        productId: "naming-prompt",
        serviceType: "naming_prompt",
        reason: REASON,
        requestId,
        idempotencyKey: requestId,
        cost: COIN_PRICE,
        coinPrice: COIN_PRICE,
        amountKRW: AMOUNT_KRW,
        membershipCreditCost: MEMBERSHIP_CREDIT_COST,
        reportId: inputHash,
        contentKey: inputHash,
        sessionId: String(checkoutPayload?.sessionId || requestId),
      });

      if (!isPaymentGranted(gate)) {
        const code = String(gate.error?.code || "").toUpperCase();
        const cancelled = code === "PAYMENT_CANCELLED";
        throw new Error(cancelled ? "PAYMENT_CANCELLED" : "PAYMENT_FAILED");
      }
      completePaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId,
        title: "이용권 확인 완료",
        reason: REASON,
        paymentMode: "MEMBERSHIP_PASS",
      });

      const access = extractNamingAccess(gate);
      retryRef.current = { input, inputHash, access };
      await runVerifyAndGenerate({ input, inputHash, access });
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      setError(errorMessage(code));
      setPhase("error");
      if (gateStarted) {
        failPaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId,
          reason: REASON,
          paymentMode: "MEMBERSHIP_PASS",
          message: errorMessage(code),
          cancelled: code === "PAYMENT_CANCELLED",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  const showGeneratingCard = busy && (phase === "verifying" || phase === "generating");

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0818] px-4 py-9 text-[#f4eeff] [font-family:var(--font-body)] sm:py-12">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(178deg,#0a0818_0%,#13102a_46%,#090718_100%)]" aria-hidden="true" />
      <div
        className="pointer-events-none fixed inset-0 opacity-70 [background:radial-gradient(620px_380px_at_14%_-6%,rgba(167,139,250,0.17),transparent_70%),radial-gradient(520px_340px_at_88%_4%,rgba(232,213,163,0.1),transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-7">
        {/* 히어로 */}
        <header className={`${PANEL} relative overflow-hidden p-7 sm:p-10`}>
          <span
            className="pointer-events-none absolute -right-3 -top-9 select-none text-[8.5rem] font-black leading-none text-[#c4b5fd]/[0.07] [font-family:var(--font-display)] sm:text-[11rem]"
            aria-hidden="true"
          >
            名
          </span>
          <span className="inline-flex w-max items-center gap-2 rounded-full border border-[#c4b5fd]/30 bg-[#c4b5fd]/10 px-3.5 py-1.5 text-xs font-bold text-[#dcd2fb]">
            사주 맞춤 프리미엄 전문가 작명
          </span>
          <h1 className="mt-4 text-3xl font-black leading-tight text-[#f4eeff] [font-family:var(--font-display)] [text-wrap:balance] sm:text-5xl">
            훈민정음 작명소
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#c8aaff]/85 sm:text-base">
            사주에서 검증한 용신·희신을 바탕으로 소리와 한자의 뜻을 엮어 전문가가 직접 이름을 짓고,
            그 작명첩을 만든 프롬프트 원문까지 함께 드립니다. 입력과 초안 추천은 무료입니다.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[#e6ddfa]">
            {["용신·희신 검증", "소리오행 흐름", "원형이정 수리 4격", "결과 PDF 소장"].map((pill) => (
              <li key={pill} className="rounded-full border border-[#c4b5fd]/20 bg-[#0a0818]/50 px-3 py-1.5">{pill}</li>
            ))}
          </ul>
          <div className="mt-4">
            <PriceBadge featureKey={FEATURE_KEY} />
          </div>
        </header>

        {showGeneratingCard ? (
          <NamingGeneratingCard phase={phase} />
        ) : (
          <form
            className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="flex flex-col gap-5">
              {/* 준비 단계 칩 — 실제 순서가 있는 흐름이라 번호를 쓴다 */}
              <nav aria-label="작명 준비 단계" className="flex flex-wrap gap-2">
                {["출생 정보", "성씨와 이름 조건", "세부 취향 (선택)"].map((label, index) => {
                  const active = step === index;
                  const done = stepDone[index] && !active;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setStep(index)}
                      aria-current={active ? "step" : undefined}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${
                        active
                          ? "border-[#c4b5fd]/60 bg-[#c4b5fd]/15 text-[#f4eeff]"
                          : done
                            ? "border-[#e8d5a3]/35 bg-[#e8d5a3]/[0.07] text-[#f2e9d3]"
                            : "border-[#c4b5fd]/15 bg-[#13102a]/50 text-[#c8aaff]/75 hover:border-[#c4b5fd]/40"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-black ${
                          done ? "bg-[#e8d5a3] text-[#0a0818]" : active ? "bg-[#c4b5fd] text-[#0a0818]" : "bg-[#c4b5fd]/20 text-[#dcd2fb]"
                        }`}
                        aria-hidden="true"
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </nav>

              {step === 0 && (
                <section className={`${PANEL} p-6 sm:p-7`}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
                    <h2 className="text-lg font-black text-[#f4eeff] [font-family:var(--font-display)]">출생 정보</h2>
                    <button
                      type="button"
                      onClick={() => void reload()}
                      className="rounded-full border border-[#c4b5fd]/30 bg-[#c4b5fd]/10 px-3.5 py-1.5 text-xs font-bold text-[#dcd2fb] transition hover:border-[#c4b5fd]/60 hover:bg-[#c4b5fd]/20"
                      aria-label="프로필 카드에서 출생 정보 불러오기"
                    >
                      프로필 카드에서 불러오기
                    </button>
                  </div>
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <label className={LABEL}>
                      성별
                      <select
                        value={form.gender}
                        onChange={(event) => updateForm({ gender: event.target.value as GenderValue })}
                        disabled={busy}
                        className={FIELD}
                      >
                        <option value="">선택</option>
                        <option value="F">여성</option>
                        <option value="M">남성</option>
                        <option value="OTHER">기타/미지정</option>
                      </select>
                    </label>
                    <label className={LABEL}>
                      생년월일
                      <input
                        type="date"
                        value={form.birthDate}
                        onChange={(event) => updateForm({ birthDate: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                    <label className={LABEL}>
                      출생시간
                      <input
                        type="time"
                        value={form.birthTime}
                        onChange={(event) => updateForm({ birthTime: event.target.value })}
                        disabled={busy || form.birthTimeUnknown}
                        className={FIELD}
                      />
                    </label>
                    <label className={LABEL}>
                      달력 기준
                      <select
                        value={form.calendarType}
                        onChange={(event) => updateForm({ calendarType: event.target.value as CalendarValue })}
                        disabled={busy}
                        className={FIELD}
                      >
                        <option value="solar">양력</option>
                        <option value="lunar">음력</option>
                      </select>
                    </label>
                    <label className={LABEL}>
                      출생지
                      <input
                        type="text"
                        value={form.birthPlace}
                        maxLength={80}
                        onChange={(event) => updateForm({ birthPlace: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                    <label className={LABEL}>
                      기준 시간대
                      <input
                        type="text"
                        value={form.timezone}
                        maxLength={80}
                        onChange={(event) => updateForm({ timezone: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-5 text-sm text-[#e6ddfa]">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.birthTimeUnknown}
                        onChange={(event) => updateForm({ birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : form.birthTime })}
                        disabled={busy}
                        className="h-4 w-4 accent-[#c4b5fd]"
                      />
                      출생시간 모름
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.isLeapMonth}
                        onChange={(event) => updateForm({ isLeapMonth: event.target.checked })}
                        disabled={busy}
                        className="h-4 w-4 accent-[#c4b5fd]"
                      />
                      윤달
                    </label>
                  </div>
                  <div className="mt-5 flex justify-end">
                    <StepMoveButton onClick={() => setStep(1)} label="다음 · 성씨와 이름 조건" />
                  </div>
                </section>
              )}

              {step === 1 && (
                <section className={`${PANEL} p-6 sm:p-7`}>
                  <h2 className="text-lg font-black text-[#f4eeff] [font-family:var(--font-display)]">성씨와 이름 조건</h2>
                  <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                    <label className={LABEL}>
                      성씨
                      <input
                        type="text"
                        value={form.familyName}
                        maxLength={10}
                        placeholder="예: 김"
                        onChange={(event) => updateForm({ familyName: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                      <span className="text-xs font-normal text-[#c8aaff]/70">
                        성(姓)만 적어 주세요. 쓰고 싶은 이름은 아래 &ldquo;후보 이름&rdquo;이나 &ldquo;반드시 넣고 싶은 글자&rdquo;에 적습니다.
                      </span>
                      {familyNameLooksLikeFullName && (
                        <span className="text-xs font-semibold text-[#e8d5a3]">
                          세 글자 이상이라 성씨가 아니라 이름 전체로 보입니다. 이대로 두면 추천 후보 앞에 그대로 붙습니다.
                        </span>
                      )}
                    </label>
                    <label className={LABEL}>
                      이름 글자 수
                      <select
                        value={form.nameLength}
                        onChange={(event) => updateForm({ nameLength: Number(event.target.value) })}
                        disabled={busy}
                        className={FIELD}
                      >
                        <option value={2}>두 글자</option>
                        <option value={1}>한 글자</option>
                        <option value={3}>세 글자</option>
                        <option value={4}>네 글자</option>
                      </select>
                    </label>
                    <label className={LABEL}>
                      현재 생각 중인 한글 이름
                      <input
                        type="text"
                        value={form.currentName}
                        maxLength={40}
                        placeholder="예: 서윤"
                        onChange={(event) => updateForm({ currentName: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                    <label className={LABEL}>
                      한자 이름 사용
                      <select
                        value={form.useHanja ? "true" : "false"}
                        onChange={(event) => updateForm({ useHanja: event.target.value === "true" })}
                        disabled={busy}
                        className={FIELD}
                      >
                        <option value="true">사용</option>
                        <option value="false">한글 이름 중심</option>
                      </select>
                    </label>
                  </div>
                  <label className={`${LABEL} mt-3.5`}>
                    후보 이름 (한 줄에 하나, &ldquo;한글 | 한자후보1,한자후보2 | 메모&rdquo; 형식)
                    <textarea
                      value={form.desiredNamesText}
                      rows={4}
                      placeholder={"서윤 | | 부드럽고 지적인 느낌\n하린 | 荷潾,河璘 | 맑고 밝은 이미지"}
                      onChange={(event) => updateForm({ desiredNamesText: event.target.value })}
                      disabled={busy}
                      className={FIELD}
                    />
                  </label>
                  <div className="mt-3.5 grid gap-3.5 sm:grid-cols-3">
                    <label className={LABEL}>
                      사용하고 싶은 음절
                      <input
                        type="text"
                        value={form.desiredSyllablesText}
                        maxLength={120}
                        placeholder="예: 서, 윤, 하"
                        onChange={(event) => updateForm({ desiredSyllablesText: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                    <label className={LABEL}>
                      반드시 넣고 싶은 글자
                      <input
                        type="text"
                        value={form.requiredSyllablesText}
                        maxLength={120}
                        placeholder="예: 윤"
                        onChange={(event) => updateForm({ requiredSyllablesText: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                    <label className={LABEL}>
                      피하고 싶은 글자
                      <input
                        type="text"
                        value={form.blockedSyllablesText}
                        maxLength={120}
                        placeholder="예: 민, 지"
                        onChange={(event) => updateForm({ blockedSyllablesText: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                  </div>

                  {recommendation && (
                    <div className="mt-5 rounded-3xl border border-[#c4b5fd]/15 bg-[#0a0818]/50 p-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-base font-black text-[#f4eeff] [font-family:var(--font-display)]">무료 초안 추천</h3>
                        <span className="text-xs font-semibold text-[#e8d5a3]">참고용 · 결제와 무관</span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#c8aaff]/75">{recommendation.status}</p>
                      <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
                        {recommendation.candidates.length ? recommendation.candidates.map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => applyCandidate(item)}
                            className="rounded-2xl border border-[#c4b5fd]/20 bg-[#13102a]/70 p-3.5 text-left transition hover:border-[#c4b5fd]/55 hover:shadow-[0_0_20px_-8px_rgba(147,51,234,0.4)]"
                          >
                            <span className="block text-sm font-black text-[#f4eeff]">{item.fullName}</span>
                            <span className="mt-0.5 block text-xs text-[#c8aaff]/75">{item.note}</span>
                          </button>
                        )) : (
                          <p className="rounded-2xl border border-dashed border-[#c4b5fd]/25 p-3.5 text-xs text-[#c8aaff]/70 sm:col-span-2">
                            입력한 조건으로는 초안 후보를 아직 만들 수 없습니다.
                          </p>
                        )}
                      </div>
                      {recommendation.moods.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {recommendation.moods.map((mood) => (
                            <button
                              key={mood}
                              type="button"
                              onClick={() => applyMood(mood)}
                              className="rounded-full border border-[#e8d5a3]/25 bg-[#e8d5a3]/[0.06] px-3 py-1.5 text-xs font-semibold text-[#f2e9d3] transition hover:border-[#e8d5a3]/55"
                            >
                              {mood}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex justify-between gap-3">
                    <StepMoveButton onClick={() => setStep(0)} label="이전" subtle />
                    <StepMoveButton onClick={() => setStep(2)} label="다음 · 세부 취향" />
                  </div>
                </section>
              )}

              {step === 2 && (
                <section className={`${PANEL} p-6 sm:p-7`}>
                  <h2 className="text-lg font-black text-[#f4eeff] [font-family:var(--font-display)]">세부 취향 (선택)</h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#c8aaff]/75">
                    비워 두어도 작명은 진행됩니다. 아래 항목을 눌러 고르거나 직접 적어 주시면 작명가가 그대로 반영합니다.
                  </p>
                  <div className="mt-4 grid gap-3.5">
                    <label className={LABEL}>
                      원하는 이름 유형
                      <input
                        type="text"
                        value={form.desiredType}
                        maxLength={120}
                        placeholder="예: 현대적이고 부드러운 이름"
                        onChange={(event) => updateForm({ desiredType: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                      <ChipGroup
                        options={NAME_TYPE_OPTIONS}
                        selected={form.desiredType}
                        onToggle={(token) => toggleToken("desiredType", token, 120)}
                        disabled={busy}
                        label="원하는 이름 유형 선택"
                      />
                    </label>
                    <label className={LABEL}>
                      이름 분위기/이미지
                      <input
                        type="text"
                        value={form.preferenceTone}
                        maxLength={240}
                        placeholder="예: 현대적, 맑은, 차분한, 우아한, 별빛 같은"
                        onChange={(event) => updateForm({ preferenceTone: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                      <ChipGroup
                        options={TONE_OPTIONS}
                        selected={form.preferenceTone}
                        onToggle={(token) => toggleToken("preferenceTone", token, 240)}
                        disabled={busy}
                        label="이름 분위기 선택"
                      />
                    </label>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <label className={LABEL}>
                        돌림자 여부
                        <input
                          type="text"
                          value={form.generationNameRule}
                          maxLength={200}
                          placeholder="예: 가운데 글자에 준 사용"
                          onChange={(event) => updateForm({ generationNameRule: event.target.value })}
                          disabled={busy}
                          className={FIELD}
                        />
                        <ChipGroup
                          options={GENERATION_RULE_OPTIONS}
                          selected={form.generationNameRule}
                          onToggle={(token) => toggleToken("generationNameRule", token, 200)}
                          disabled={busy}
                          label="돌림자 규칙 선택"
                        />
                      </label>
                      <label className={LABEL}>
                        형제자매 이름과의 조화
                        <input
                          type="text"
                          value={form.siblingHarmony}
                          maxLength={200}
                          placeholder="예: 형 이름 민준과 어울리게"
                          onChange={(event) => updateForm({ siblingHarmony: event.target.value })}
                          disabled={busy}
                          className={FIELD}
                        />
                        <ChipGroup
                          options={SIBLING_OPTIONS}
                          selected={form.siblingHarmony}
                          onToggle={(token) => toggleToken("siblingHarmony", token, 200)}
                          disabled={busy}
                          label="형제자매 조화 선택"
                        />
                      </label>
                    </div>
                    <label className={LABEL}>
                      피해야 할 가족 이름 또는 비슷한 발음
                      <input
                        type="text"
                        value={form.avoidFamilyNames}
                        maxLength={240}
                        placeholder="예: 할머니 성함과 같은 발음 제외"
                        onChange={(event) => updateForm({ avoidFamilyNames: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                      <ChipGroup
                        options={AVOID_OPTIONS}
                        selected={form.avoidFamilyNames}
                        onToggle={(token) => toggleToken("avoidFamilyNames", token, 240)}
                        disabled={busy}
                        label="피할 조건 선택"
                      />
                    </label>
                    <label className={LABEL}>
                      기타 요청
                      <ChipGroup
                        options={PURPOSE_OPTIONS}
                        selected={form.memo}
                        onToggle={(token) => toggleToken("memo", token, 1500)}
                        disabled={busy}
                        label="작명 목적 선택"
                      />
                      <textarea
                        value={form.memo}
                        rows={3}
                        placeholder="이름을 실제 출생신고에 사용할 예정인지, 개명용인지, 특별히 바라는 분위기를 적어주세요."
                        onChange={(event) => updateForm({ memo: event.target.value })}
                        disabled={busy}
                        className={FIELD}
                      />
                    </label>
                  </div>
                  <div className="mt-5 flex justify-start">
                    <StepMoveButton onClick={() => setStep(1)} label="이전" subtle />
                  </div>
                </section>
              )}
            </div>

            <aside className={`${PANEL} flex h-max flex-col gap-4 p-6 sm:p-7 lg:sticky lg:top-6`}>
              <div>
                <h2 className="text-lg font-black text-[#f4eeff] [font-family:var(--font-display)]">프리미엄 작명 시작하기</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-[#c8aaff]/85">
                  필수 입력값 확인 후 30,000원 단건 결제, 이용권, 월정석 중 가능한 방식으로 진행합니다.
                  이미 이용권이나 월정석으로 이용 가능하면 결제창 없이 바로 생성됩니다.
                </p>
              </div>

              <dl className="grid gap-1.5 rounded-3xl border border-[#c4b5fd]/15 bg-[#0a0818]/50 p-4 text-sm">
                <SummaryRow label="출생 정보" value={form.birthDate ? `${form.birthDate} · ${form.calendarType === "lunar" ? "음력" : "양력"}${form.birthTimeUnknown ? " · 시간 미상" : form.birthTime ? ` · ${form.birthTime}` : ""}` : "미입력"} done={stepDone[0]} />
                <SummaryRow label="성씨 · 글자 수" value={form.familyName.trim() ? `${form.familyName.trim()} · ${form.nameLength}자` : "미입력"} done={stepDone[1]} />
                <SummaryRow label="세부 취향" value={stepDone[2] ? "입력됨" : "선택 입력"} done={stepDone[2]} optional />
              </dl>

              {busy && (
                <p className="rounded-2xl border border-[#c4b5fd]/25 bg-[#c4b5fd]/[0.07] px-4 py-3 text-sm font-semibold text-[#e6ddfa]" aria-live="polite">
                  {phase === "checking" ? "입력값과 사주 기준을 확인하고 있습니다…" : "이용권·결제를 확인하고 있습니다…"}
                </p>
              )}

              {error && (
                <p role="alert" className="rounded-2xl border border-rose-300/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-100">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || missing.length > 0}
                className={`min-h-12 rounded-full bg-[linear-gradient(135deg,#c4b5fd,#e8d5a3)] px-5 text-sm font-black text-[#0a0818] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 ${VIOLET_GLOW}`}
              >
                {busy
                  ? "진행 중입니다…"
                  : missing.length
                    ? `먼저 ${missing[0]}을(를) 입력해주세요`
                    : "30,000원 결제/이용권 확인 후 작명 시작"}
              </button>

              {phase === "error" && !busy && (
                <button
                  type="button"
                  onClick={() => void handleRetry()}
                  className="min-h-11 rounded-full border border-[#c4b5fd]/35 bg-[#c4b5fd]/10 px-5 text-sm font-bold text-[#e6ddfa] transition hover:bg-[#c4b5fd]/20"
                >
                  다시 시도
                </button>
              )}

              <p className="text-xs leading-relaxed text-[#c8aaff]/65">
                결제 후 생성에 실패해도 같은 입력으로는 추가 결제 없이 다시 시도됩니다.
              </p>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}

function StepMoveButton({ onClick, label, subtle = false }: { onClick: () => void; label: string; subtle?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold transition ${
        subtle
          ? "border border-[#c4b5fd]/20 bg-transparent text-[#c8aaff]/85 hover:border-[#c4b5fd]/45 hover:text-[#f4eeff]"
          : "border border-[#c4b5fd]/40 bg-[#c4b5fd]/12 text-[#f4eeff] hover:bg-[#c4b5fd]/22"
      }`}
    >
      {label}
    </button>
  );
}

function SummaryRow({ label, value, done, optional = false }: { label: string; value: string; done: boolean; optional?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-[#c8aaff]/70">
        <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-[#e8d5a3]" : optional ? "bg-[#c4b5fd]/25" : "bg-[#c4b5fd]/45"}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className="truncate text-right text-sm font-semibold text-[#e6ddfa]">{value}</dd>
    </div>
  );
}

function NamingGeneratingCard({ phase }: { phase: Phase }) {
  const [tick, setTick] = useState(0);
  const [progress, setProgress] = useState(PHASE_PROGRESS.checking);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 2200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const target = PHASE_PROGRESS[phase] || 90;
    const timer = window.setInterval(() => {
      setProgress((value) => (value < target ? Math.min(target, value + 2) : value));
    }, 700);
    return () => window.clearInterval(timer);
  }, [phase]);

  const activeStep = phase === "verifying" ? 1 : 2 + (tick % 2);

  return (
    <section className={`${PANEL} p-7 sm:p-10`} aria-live="polite">
      <h2 className="text-xl font-black text-[#f4eeff] [font-family:var(--font-display)] sm:text-2xl">
        {GENERATING_STEPS[Math.min(activeStep, GENERATING_STEPS.length - 1)]}…
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-7 text-[#c8aaff]/80">
        작명가가 사주를 검증하고 이름을 짓는 데 1~2분이 걸립니다. 완성되면 작명첩 화면으로 바로 이동합니다.
      </p>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#c4b5fd]/12" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#a78bfa,#c4b5fd,#e8d5a3)] transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="mt-6 grid gap-2 text-sm">
        {GENERATING_STEPS.map((stepLabel, index) => {
          const stepState = index < activeStep ? "done" : index === activeStep ? "active" : "todo";
          return (
            <li
              key={stepLabel}
              className={`flex items-center gap-2.5 transition-colors duration-200 ${
                stepState === "active" ? "text-[#e8d5a3]" : stepState === "done" ? "text-[#c8aaff]/80" : "text-[#c8aaff]/40"
              }`}
            >
              <span
                className={`grid h-[18px] w-[18px] place-items-center rounded-full text-[10px] font-black ${
                  stepState === "done" ? "bg-[#c4b5fd]/70 text-[#0a0818]" : stepState === "active" ? "bg-[#e8d5a3] text-[#0a0818]" : "bg-[#c4b5fd]/15 text-[#c8aaff]/60"
                }`}
                aria-hidden="true"
              >
                {stepState === "done" ? "✓" : index + 1}
              </span>
              {stepLabel}
            </li>
          );
        })}
      </ol>
      <div className="mt-7 grid gap-3 sm:grid-cols-3" aria-hidden="true">
        <div className="h-24 animate-pulse rounded-3xl bg-[#c4b5fd]/[0.08] motion-reduce:animate-none" />
        <div className="h-24 animate-pulse rounded-3xl bg-[#c4b5fd]/[0.06] motion-reduce:animate-none" />
        <div className="h-24 animate-pulse rounded-3xl bg-[#e8d5a3]/[0.06] motion-reduce:animate-none" />
      </div>
    </section>
  );
}
