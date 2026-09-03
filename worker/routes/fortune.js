import { connectDb, mongoose, withMongoRetry, mongoTransactionOptions } from "../lib/db.js";
import { invalidateAccessStateCacheForUser } from "../lib/access-state.js";
import { User, PointHistory, Payment, MonthlyCreditLedger, PaidExecutionRecord, RECENT_CONSUME_REQUEST_ID_CAP, GuardianFortuneSharedSnapshot } from "../lib/models.js";
import { findMoonstoneSpendEvidence } from "../lib/moonstone-spend-proof.js";
import { restoreMonthlyCreditLot } from "../lib/monthly-credit-store.js";
import { getUnlockedContentSnapshot } from "../lib/content-unlocks.js";
import { getOptionalUserFromRequest, isAuthDbInfraError, peekAccessTokenUserId, requireUserFromRequest, resolvePaidRouteAuth } from "../lib/auth.js";
import { cookieValue, createHttpError, getRoutePath, handleRouteError, isDbUnavailableError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { incrementRateLimit } from "../lib/rate-limit.js";
import { generateGuardianFortuneRequest, safeErrorMessage as guardianFortuneSafeErrorMessage } from "../lib/guardian-fortune-generate.js";
import { generateGuardianFortuneWithMockLLM } from "../lib/guardian-fortune-mock.js";
import {
  buildGuardianFortuneDisabledUsageStatus,
  buildGuardianFortuneGuestCookie,
  buildGuardianFortuneUsageStatus,
  createGuardianFortuneGuestId,
  createGuardianFortuneRequestId,
  createMongoGuardianFortuneStore,
  getGuardianFortuneDateKey,
  GUARDIAN_FORTUNE_ERROR_CODES,
  GUARDIAN_FORTUNE_PAID_FEATURE_KEY,
  hashGuardianFortuneGuestId,
  isGuardianFortuneApiEnabled,
  isValidGuardianFortuneGuestId,
  mergeGuardianFortuneAnonymousUsage,
} from "../lib/guardian-fortune-usage.js";
import { logPerUsePaymentProof, verifyPerUsePayment } from "../lib/nakshatra-paid-access.js";
import {
  createGuardianFortuneShareSnapshot,
  findPublicGuardianFortuneSnapshot,
  isGuardianFortuneShareEnabled,
  verifyGuardianFortuneShareDraftToken,
} from "../lib/guardian-fortune-share.js";
import {
  getForcePaidTestAccountEmails as getForcePaidTestAccountEmailsFromGuard,
  isAdminPigCoinBypassEnabled as isAdminPigCoinBypassEnabledFromGuard,
  resolvePigCoinConsumeAuth as resolvePigCoinConsumeAuthFromGuard,
  resolveServerCoinPricing as resolveServerCoinPricingFromGuard,
} from "../lib/fortune-access-guard.js";
import {
  COIN_GATE_PER_USE_REASON_COSTS,
  FEATURE_KEY_PRICE_TABLE,
  PIG_COIN_UNLOCK_PRODUCTS,
  UNLOCK_PRODUCT_BY_FEATURE_KEY,
  listServerPricedFeatureKeys,
  normalizePaidFeatureKey,
  resolveFeatureReasonCost,
} from "../lib/paid-feature-registry.js";
import {
  buildZiweiAIPrompt,
  buildZiweiAIPromptWithDomain,
  ZIWEI_AI_PROMPT_FEATURE_KEY,
  ZIWEI_AI_PROMPT_PRICE,
} from "../lib/ziwei-ai-prompt.js";
import {
  buildSukuyoAIPrompt,
  buildSukuyoAIPromptWithDomain,
  SUKUYO_AI_PROMPT_FEATURE_KEY,
  SUKUYO_AI_PROMPT_PRICE,
} from "../lib/sukuyo-ai-prompt.js";
import {
  buildSajuAIPrompt,
  buildSajuAIPromptWithDomain,
  SAJU_AI_PROMPT_FEATURE_KEY,
  SAJU_AI_PROMPT_PRICE,
  SAJU_AI_PROMPT_VERSION,
  SAJU_AI_SECTION_GROUPS,
  SAJU_AI_SECTION_MAX_OUTPUT_TOKENS,
  SAJU_AI_MIN_RESULT_CHARS,
  getSajuAICategoryRubric,
  validateSajuMyeongsikTenGodText,
} from "../lib/saju-ai-prompt.js";
import {
  buildAstrologyAIPrompt,
  buildAstrologyAIPromptWithDomain,
  ASTROLOGY_AI_PROMPT_FEATURE_KEY,
  ASTROLOGY_AI_PROMPT_PRICE,
} from "../lib/astrology-ai-prompt.js";
import {
  buildVedicAIPrompt,
  VEDIC_AI_PROMPT_FEATURE_KEY,
  VEDIC_AI_PROMPT_PRICE,
} from "../lib/vedic-ai-prompt.js";
import {
  createPrashnaSnapshot,
  generatePrashnaPromptResult,
  VEDIC_PRASHNA_PROMPT_AMOUNT_KRW,
  VEDIC_PRASHNA_PROMPT_FEATURE_KEY,
  VEDIC_PRASHNA_PROMPT_PRICE,
  VEDIC_PRASHNA_PROMPT_PRODUCT_CODE,
  VEDIC_PRASHNA_PROMPT_PRODUCT_NAME,
} from "../lib/vedic-prashna-prompt.js";
import {
  buildPremiumAccessCookie,
  createPremiumAccessToken,
  resolvePremiumAccessReportType,
} from "../lib/premium-access-token.js";
import { callGeminiText, createGeminiContextCache, deleteGeminiContextCache } from "../lib/gemini.js";
import { cmsPromptText, primePromptTemplateOverrides } from "../lib/cms-prompts.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { canUseByPass, isActiveStatus, isInactiveStatus, normalizeHoneyPassEntitlement, resolveMonthlySpendQuota, resolvePremiumQuota } from "../lib/profile-limits.js";
import { resolveCanonicalEntitlement } from "../lib/entitlement-policy.js";
import { calculateKrwAmountFromCoins, calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { autoRefundSinglePaymentDeliveryFailure } from "../lib/payment-refund.js";
import { EDGE_RESPONSE_DEADLINE_MS, clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";

const PIG_COIN_DEFAULT_UNLOCK_COST = 10;
const PIG_COIN_MAX_COST = 100000;
const SAJU_AI_PROMPT_DB_ERROR_SIGNATURES = [
  "temporarily unavailable",
  "database is temporarily unavailable",
  "connection",
  "connect",
  "server selection",
  "timed out",
  "timeout",
  "econnrefused",
  "enotfound",
  "econnreset",
  "mongo",
  "mongoose",
];

function logSajuAIPromptStage(stage, details = {}) {
  const payload = {
    stage,
    requestId: String(details.requestId || ""),
    executionId: String(details.executionId || ""),
    userId: String(details.userId || ""),
    featureId: SAJU_AI_PROMPT_FEATURE_KEY,
    accessMode: String(details.accessMode || "per_use"),
    productId: String(details.productId || ""),
    profileId: String(details.profileId || ""),
    accessMethod: String(details.accessMethod || ""),
    paymentMethod: String(details.paymentMethod || details.paymentMode || ""),
    amountCoins: Number(details.amountCoins || 0),
    amountKRW: Number(details.amountKRW || 0),
    monthlyRequiredAmount: Number(details.monthlyRequiredAmount || 0),
    monthlyBalanceBefore: Number(details.monthlyBalanceBefore || 0),
    monthlyBalanceAfter: Number(details.monthlyBalanceAfter || 0),
    paymentId: String(details.paymentId || ""),
    orderId: String(details.orderId || ""),
    idempotencyKey: String(details.idempotencyKey || ""),
    errorName: String(details.errorName || ""),
    errorMessage: String(details.errorMessage || ""),
    stack: String(details.stack || ""),
  };
  try {
    console.log("[worker-saju-ai-prompt]", JSON.stringify(payload));
  } catch (e) {
    console.log("[worker-saju-ai-prompt]", payload);
  }
}

async function sha256Hex(text) {
  const input = new TextEncoder().encode(String(text || ""));
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const SAJU_AI_PROMPT_ACCESS_MODE = "per_use";
// 생성이 요청 안에서 끝나고 그 대기는 엣지(100s) 안쪽으로 예산화되어 있으므로, 이보다 오래된
// generating 은 진행 중일 수가 없다 — 그 레코드를 쓴 요청은 이미 죽었다.
// 구 390s 는 아무도 생성하지 않는 6.5분 동안 재-POST 를 202로만 돌려보내 재시도를 통째로 막았다.
// 🔴 이 값은 FEATURE_AI_LLM_BUDGET_MS 예산화와 한 세트다. 예산화 없이 이것만 내리면 살아 있는
//    생성을 stale 로 오판해 이중 생성이 난다.
const SAJU_AI_PROMPT_STALE_GENERATING_MS = EDGE_RESPONSE_DEADLINE_MS + 20000;
const SAJU_AI_PROMPT_TITLE = "사주 전문가 상담 결과";
const SAJU_AI_PROMPT_AMOUNT_KRW = calculateKrwAmountFromCoins(SAJU_AI_PROMPT_PRICE);
/** 관리자 CMS 기본값 노출용(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSajuAiResultSystemPrompt() {
  return SAJU_AI_RESULT_SYSTEM_PROMPT;
}

const SAJU_AI_RESULT_SYSTEM_PROMPT = [
  "당신은 최고 수준의 명리학 상담가입니다.",
  "십성, 오행, 천간/지지 관계는 절대 직접 추측하거나 재계산하지 않습니다.",
  "제공된 내부 명식 사실 카드와 일간 기준 십성 확정표만 절대 기준으로 사용합니다.",
  // 🔴 예시로 특정 일간(辛)을 박아 두면 일간이 다른 사용자에게는 무관한 규칙이 들어가 혼선만 준다.
  // 사실 카드에 그 사용자의 일간 기준 십성 확정표가 이미 들어 있으므로 그것을 가리키게 한다.
  "내부 데이터와 다른 십성을 말하면 안 됩니다. 십성은 제공된 확정표에 적힌 그대로만 쓰고, 표에 없는 관계는 단정하지 않습니다.",
  "천간, 지지, 십성, 오행, 합충형해파, 지장간, 투간/투출, 대운/세운 정보가 제공되면 그 데이터만 근거로 상담합니다.",
  "상담은 짧은 운세 문장이 아니라 실제 유료 명리 상담처럼 깊이 있게 작성합니다.",
  "질문에 먼저 답하되 명식 전체의 중심 성향, 십성 구조, 오행 균형, 현재 고민과의 연결, 일·돈·관계·연애·건강 리듬, 조심할 패턴, 살리는 전략, 30일 실천 가이드를 챕터별로 풀어 줍니다.",
  "겁주거나 단정하지 말고 가능성과 경향성 중심으로 말합니다.",
  // 🔴 예전에는 "고정 글자수를 채우려 하지 말고"였다. 그 한 줄이 유료 상담을 짧게 만드는 주범이었다 —
  // 모델은 목표가 없으면 챕터당 300~500자에서 멈춘다. 반복 금지와 분량 요구는 양립한다.
  "요구된 분량은 반드시 채우되, 같은 말을 바꿔 쓰거나 문장을 늘려 채우지 않고 새 근거와 새 장면을 더해 채웁니다.",
  "중간에 끊기지 않도록 맡은 챕터의 마지막까지 완성하고, 끝맺음 문장은 따뜻하지만 가볍지 않게 닫습니다.",
  "근거가 강한 해석과 참고 수준의 해석을 문장 안에서 구분하고, 마무리 근처에서 이 상담이 삶을 비추는 참고용 도구라는 점을 자연스럽게 한 번 담으세요.",
  "개발 문서, 기능 설명, 프롬프트 설명처럼 쓰지 말고 명리학자가 직접 상담하듯 작성하세요.",
].join("\n");
// 🔴 "개발 문서처럼 쓰지 마라"를 강제하는 목록이지, 한국어 상담 문장을 걸러내는 목록이 아니다.
// 여기 걸리면 validation.incomplete 가 아니라서 repair pass 를 못 받고 곧장 전체 재생성(최대 60초)이 돈다.
// 빠진 둘: /분석\s*결과는/ 은 "분석 결과는 다음과 같습니다"처럼 지극히 자연스러운 상담 문장을 떨궜고,
// /feature/i 는 대소문자 무시 부분일치라 영문 단어가 스치기만 해도 멀쩡한 결과를 탈락시켰다.
// 개발 문서 티를 막는 본래 의도는 남은 다섯이 그대로 지킨다(특히 한국어 '기능'은 /이\s*기능은/ 이 담당).
const SAJU_AI_RESULT_FORBIDDEN_PATTERNS = [
  /프롬프트/,
  /내부\s*지시문/,
  /이\s*기능은/,
  /생성\s*결과/,
  /content\s*block/i,
];
const SAJU_AI_PROGRESS_STEPS = Object.freeze([
  { progress: 0, key: "payment", message: "결제/이용권 확인 중" },
  { progress: 15, key: "chart", message: "사주 명식 불러오는 중" },
  { progress: 30, key: "question", message: "질문 의도 분석 중" },
  { progress: 45, key: "structure", message: "명식 핵심 구조 해석 중" },
  { progress: 65, key: "llm", message: "전문가 상담문 생성 중" },
  { progress: 85, key: "organize", message: "상담 결과 정리 중" },
  { progress: 100, key: "completed", message: "결과 준비 완료" },
]);

function buildSajuAIProgress(progress, status = "generating", stepMessage = "") {
  const percent = Math.max(0, Math.min(100, Math.round(Number(progress || 0))));
  let step = SAJU_AI_PROGRESS_STEPS[0];
  for (const item of SAJU_AI_PROGRESS_STEPS) {
    if (percent >= item.progress) step = item;
  }
  return {
    status,
    progress: percent,
    stepKey: step.key,
    stepMessage: String(stepMessage || step.message).trim(),
    updatedAt: new Date().toISOString(),
  };
}

function mapSajuAIExecutionStatus(status) {
  const normalized = String(status || "").trim();
  if (normalized === "paid_pending_generation") return "pending";
  if (normalized === "generation_failed" || normalized === "refunded" || normalized === "cancelled") return "failed";
  if (normalized === "completed") return "completed";
  return "generating";
}

function buildSajuAIResultId(requestId, promptDigest) {
  const seed = String(promptDigest || requestId || Date.now()).replace(/[^A-Za-z0-9:_-]+/g, "-");
  return `saju-ai-consultation:${seed}`.slice(0, 160);
}

function resolveSajuAIResultRubric(builtPrompt = {}) {
  const domain = String(builtPrompt?.domain || builtPrompt?.factSnapshot?.domain || "life_direction").trim();
  return builtPrompt?.categoryRubric || getSajuAICategoryRubric(domain);
}

function formatSajuAIResultRubric(rubric) {
  const data = rubric && typeof rubric === "object" ? rubric : getSajuAICategoryRubric("life_direction");
  return [
    "[카테고리별 상담 품질 기준]",
    `- 카테고리: ${data.label || "인생"}`,
    `- 반드시 다룰 주제: ${(data.requiredSections || []).join(" / ")}`,
    `- 우선 연결할 명식 축: ${(data.tenGodFocus || []).join(" / ")}`,
    "- 위 항목을 목록처럼 나열만 하지 말고, 명식 사실 카드와 질문의 맥락 속에서 상담문으로 풀어주세요.",
    "- 질문과 가장 맞닿은 항목은 깊게, 보조 항목은 사용자가 자기 명식을 이해할 만큼 간결하게 다룹니다.",
  ].join("\n");
}

/** 그룹이 맡은 챕터를 "3. 십성 구조 해석" 형태로 — 번호와 제목은 렌더러가 보는 계약 그대로다. */
function formatSajuAIGroupChapterLines(group) {
  return (group?.chapters || []).map((chapter) => `${chapter.no}. ${chapter.title}`);
}

/** 이 그룹이 손대면 안 되는 챕터 — 병렬 그룹끼리 같은 내용을 두 번 쓰는 것을 막는다. */
function formatSajuAIOtherChapterTitles(group) {
  return SAJU_AI_SECTION_GROUPS
    .filter((item) => item.key !== group?.key)
    .flatMap((item) => item.chapters.map((chapter) => `${chapter.no}. ${chapter.title}`));
}

/**
 * 그룹 5개가 **문자까지 똑같이** 공유하는 불변 접두사.
 *
 * 🔴 group 을 인자로 받지 않는다. 그것이 5그룹 동일성의 근거이고, 동일성이 깨지면 컨텍스트
 *    캐시가 통째로 무효가 된다(접두사 불일치 → llm-client 가 조용히 정가로 보낸다).
 *    새 지시를 더할 때는 그룹에 따라 달라지는지 먼저 보고, 달라지면 접미사 쪽에 넣는다.
 *
 * 🔴 순서를 뒤집지 말 것 — 접두사가 선두에 한 덩어리로 모여 있어야 캐시에 넣을 수 있다.
 */
function buildSajuAISectionPromptPrefix(builtPrompt) {
  const internalPrompt = String(builtPrompt?.generatedPrompt || builtPrompt?.prompt || "").trim();
  const factCard = String(builtPrompt?.factCard || "").trim();
  const categoryRubric = resolveSajuAIResultRubric(builtPrompt);
  return [
    "아래 내부 프롬프트는 사용자에게 보여주지 않는 생성 지시문입니다.",
    "이 지시문을 바탕으로 최종 사주 상담 결과의 **일부분만** 한국어로 작성하세요.",
    // 🔴 사실 카드가 비면 아래 블록이 .filter(Boolean) 로 사라지는데, 이 지시문만 남으면
    // "존재하지 않는 표를 절대 기준으로 삼으라"가 되어 오히려 환각을 유도한다 — 카드와 생사를 같이한다.
    // 일간별 예시(辛/壬)를 박아 두던 줄은 제거했다. 확정표가 이미 그 사용자의 일간으로 계산돼 있다.
    factCard ? "내부 명식 사실 카드와 일간 기준 십성 확정표가 절대 기준입니다. 다른 십성으로 바꾸거나 재계산하지 마세요." : "",
    factCard ? "십성은 확정표에 적힌 그대로만 쓰고, 표에 없는 관계는 단정하지 마세요." : "",
    "분량을 채우려고 같은 문장을 반복하거나 말을 늘리지 말고, 아직 짚지 않은 근거와 현실의 장면, 판단 기준을 새로 더해 채우세요.",
    "사용자에게 '프롬프트', '기능', '분석 결과는', '내부 지시문' 같은 말은 쓰지 마세요.",
    Number(builtPrompt?.calibrationApplied) > 0
      ? "사용자가 보고한 시기 캘리브레이션 검증 결과는 별도 목차를 만들지 말고 맡은 챕터 산문에 자연스럽게 녹이세요."
      : "",
    formatSajuAIResultRubric(categoryRubric),
    factCard ? "내부 명식 사실 카드:" : "",
    factCard,
    "내부 프롬프트:",
    internalPrompt,
  ].filter(Boolean).join("\n\n").trim();
}

/**
 * 그룹마다 달라지는 가변 접미사.
 *
 * 맡은 챕터 지시가 마지막에 오므로 목차 우선순위도 함께 분명해진다.
 * 웨이브2의 보강 요청(repairLines)도 여기 들어가므로 캐시된 접두사를 그대로 재사용할 수 있다.
 */
function buildSajuAISectionPromptSuffix(group, options = {}) {
  const repairLines = Array.isArray(options?.repairLines) ? options.repairLines.filter(Boolean) : [];
  const chapterLines = formatSajuAIGroupChapterLines(group);
  const otherTitles = formatSajuAIOtherChapterTitles(group);
  // 닫는 챕터는 "마지막 그룹의 마지막 챕터"다. 번호를 박아 두면 챕터를 늘릴 때마다 조용히 어긋난다
  // (실제로 10챕터 → 12챕터로 늘리면서 이 자리가 한 번 어긋날 뻔했다).
  const closingChapterNo = SAJU_AI_SECTION_GROUPS.at(-1)?.chapters?.at(-1)?.no;
  const hasClosingChapter = (group?.chapters || []).some((chapter) => chapter.no === closingChapterNo);
  return [
    "내부 프롬프트 안에 다른 목차가 있어도 무시하고, 아래 챕터 구성만 따르세요.",
    ["[이번에 쓸 챕터] — 아래 제목을 번호까지 그대로 소제목으로 쓰고, 이 순서대로 씁니다.", ...chapterLines].join("\n"),
    otherTitles.length
      ? ["다음 챕터는 다른 곳에서 씁니다. 여기서는 쓰지도 말고 요약하지도 마세요.", ...otherTitles].join("\n")
      : "",
    `이번 부분만으로 공백 제외 ${group.minChars.toLocaleString("ko-KR")}자 이상 ${group.maxChars.toLocaleString("ko-KR")}자 이하로 쓰세요.`,
    group?.guide || "",
    hasClosingChapter
      ? "중간에 끊기는 느낌이 없도록 각 챕터를 닫고, 마지막 한마디는 상담자가 직접 건네는 말처럼 완결하세요."
      : "중간에 끊기는 느낌이 없도록 맡은 챕터를 모두 닫으세요. 여기서 상담 전체를 마무리하는 인사는 쓰지 마세요.",
    repairLines.length ? ["[보강 요청]", ...repairLines].join("\n") : "",
  ].filter(Boolean).join("\n\n").trim();
}

/**
 * 그룹 하나의 상담문 프롬프트 = 불변 접두사 + 가변 접미사.
 *
 * 🔴 목차 우선순위를 못박는 줄이 반드시 있어야 한다 — 내부 프롬프트에는 공유 모듈
 *    (worker/lib/fortune-question-prompt.js `[답변 형식]`)의 14항목 목차와 카테고리 루브릭이
 *    함께 들어 있어, 그냥 두면 모델이 서로 다른 목차 세 벌 사이에서 어느 것도 제대로 채우지
 *    못한다. 클라이언트 렌더러가 이해하는 것은 12챕터 하나뿐이다.
 *    공유 모듈은 다른 기능도 함께 쓰므로 건드리지 않고 여기서 우선순위만 선언한다.
 *
 * 🔴 컨텍스트 캐시를 쓸 때도 이 **전체 프롬프트**를 그대로 llm-client 에 넘긴다. 접두사 제거는
 *    전송 직전에만 일어난다 — 접두사를 여기서 빼면 응답 캐시 키(lib/llm-cache.ts)가 사용자를
 *    구분하지 못해 남의 유료 결과가 캐시 히트로 새어 나간다.
 */
function buildSajuAISectionPrompt(builtPrompt, group, options = {}) {
  return [
    buildSajuAISectionPromptPrefix(builtPrompt),
    buildSajuAISectionPromptSuffix(group, options),
  ].filter(Boolean).join("\n\n").trim();
}

function normalizeSajuAIResultText(text) {
  return String(text || "").replace(/\r\n/g, "\n").trim();
}

const SAJU_AI_REQUIRED_CHAPTER_PATTERNS = Object.freeze([
  /질문에\s*대한\s*핵심\s*답변/,
  /명식의?\s*중심\s*성향/,
  /십성\s*구조/,
  /오행\s*균형/,
  /현재\s*고민|고민과\s*명식/,
  /일\/돈\/관계\/연애\/건강|일\s*돈\s*관계\s*연애\s*건강/,
  /대운의?\s*전환점/,
  /올해의?\s*흐름/,
  /조심해야\s*할\s*패턴/,
  /살리는\s*전략/,
  /30일\s*실천/,
  /마지막\s*한마디/,
]);

// 그룹이 12챕터를 빠짐없이 정확히 한 번씩 덮는지 모듈 로드 시점에 확인한다.
// 챕터를 늘리고 그룹에 못 넣으면 그 챕터는 영영 생성되지 않는다 — 조용히 비는 대신 즉시 깨진다.
// (같은 취지의 선례: worker/lib/fusion-fortune-prompt.js 파일 끝의 그룹 커버리지 검사)
{
  const covered = SAJU_AI_SECTION_GROUPS.flatMap((group) => group.chapters);
  const numbers = covered.map((chapter) => chapter.no);
  const duplicated = numbers.filter((no, index) => numbers.indexOf(no) !== index);
  const uncovered = SAJU_AI_REQUIRED_CHAPTER_PATTERNS
    .map((pattern, index) => (covered.some((chapter) => pattern.test(chapter.title)) ? "" : `#${index + 1}`))
    .filter(Boolean);
  if (covered.length !== SAJU_AI_REQUIRED_CHAPTER_PATTERNS.length || duplicated.length || uncovered.length) {
    throw new Error(
      `SAJU_AI_SECTION_GROUPS mismatch — chapters: ${covered.length}/${SAJU_AI_REQUIRED_CHAPTER_PATTERNS.length}`
      + ` duplicated: ${duplicated.join(",")} uncovered: ${uncovered.join(",")}`,
    );
  }
}

/** 검증·분량 판정이 보는 길이. 공백을 빼야 줄바꿈으로 부풀린 결과가 통과하지 않는다. */
function countSajuAIVisibleChars(text) {
  return normalizeSajuAIResultText(text).replace(/\s+/g, "").length;
}

const SAJU_AI_INCOMPLETE_TAIL_PATTERNS = Object.freeze([
  /(?:그리고|또한|하지만|그러나|다만|그래서|그러므로|왜냐하면|예를 들어|즉|첫째|둘째|셋째)\s*$/,
  /(?:해야|하면|하며|하고|되며|이고|으로|에서|에게|부터|까지|처럼|때문에)\s*$/,
  /[-,:;·•]\s*$/,
  /\(\s*$/,
  /\[\s*$/,
]);

function countSajuAIRequiredChapters(text) {
  return SAJU_AI_REQUIRED_CHAPTER_PATTERNS.reduce((count, pattern) => (
    pattern.test(text) ? count + 1 : count
  ), 0);
}

function hasSajuAINaturalEnding(text) {
  const normalized = normalizeSajuAIResultText(text);
  if (!normalized) return false;
  const tail = normalized.slice(-220).trim();
  if (/마지막\s*한마디/.test(normalized)) return true;
  if (/(습니다|입니다|하세요|바랍니다|좋습니다|됩니다|합니다|열립니다|흐릅니다|드러납니다|가리킵니다|비춥니다)[.!?。？！…]?$/.test(tail)) return true;
  return /(당신의|이 명식은|오늘부터|마지막으로|끝으로).{10,}(습니다|입니다|하세요|바랍니다|좋습니다)[.!?。？！…]?$/.test(tail);
}

function detectSajuAIIncompleteResult(text) {
  const normalized = normalizeSajuAIResultText(text);
  if (!normalized) return { incomplete: true, reason: "상담문이 비어 있습니다." };
  const tail = normalized.slice(-180).trim();
  const tailLooksCut = SAJU_AI_INCOMPLETE_TAIL_PATTERNS.some((pattern) => pattern.test(tail));
  if (tailLooksCut) return { incomplete: true, reason: "상담문 마지막 문장이 중간에 끊겼습니다." };
  if (!hasSajuAINaturalEnding(normalized)) {
    return { incomplete: true, reason: "마지막 한마디 또는 자연스러운 마무리가 없습니다." };
  }
  return { incomplete: false, reason: "" };
}

function countSajuAICategoryMatches(text, rubric) {
  const data = rubric && typeof rubric === "object" ? rubric : getSajuAICategoryRubric("life_direction");
  const groups = Array.isArray(data.validationKeywords) ? data.validationKeywords : [];
  return groups.reduce((count, group) => {
    const keywords = Array.isArray(group) ? group : [];
    return keywords.some((keyword) => text.includes(String(keyword || "").trim())) ? count + 1 : count;
  }, 0);
}

/** 완결이 길이보다 우선한다 — 완결된 4,000자를 잘린 4,500자로 바꾸면 개악이다. */
function scoreSajuAISectionRow(row) {
  const complete = row?.text && !detectSajuAIIncompleteResult(row.text).incomplete;
  return (complete ? 1000000 : 0) + countSajuAIVisibleChars(row?.text);
}

function isSajuAISectionRowShort(row) {
  return !row?.ok
    || countSajuAIVisibleChars(row.text) < row.group.minChars
    || detectSajuAIIncompleteResult(row.text).incomplete;
}

/**
 * 10개 챕터를 그룹으로 나눠 병렬 생성하고 하나의 상담문으로 조립한다.
 *
 * 반환은 산문 한 덩어리다 — 저장·검증·렌더 경로가 기대하는 출력 계약을 바꾸지 않는다.
 * 분량 미달은 전체 재생성이 아니라 **모자란 그룹만** 다시 쓴다.
 *
 * 🔴 이 함수는 던지지 않는다. 던지면 호출부의 경량 보장(salvage)이 건너뛰어져,
 *    세 그룹이 멀쩡한데 한 그룹 때문에 결제한 사용자가 빈손이 된다.
 */
async function runSajuAISectionWaves(env, { builtPrompt, systemPrompt, cache, deadlineAt, requestId, promptVersion } = {}) {
  // 그룹 5개가 문자까지 같은 접두사를 각자 정가로 싣던 것을, Gemini 쪽에 한 벌만 올려 두고
  // 참조한다(명시적 컨텍스트 캐싱). null 이면 아무 일도 일어나지 않고 지금까지처럼 전체
  // 프롬프트가 나간다 — 웨이브1 직전에 채워지고, 웨이브가 끝나면 finally 에서 지운다.
  let contextCache = null;

  const runSectionGroup = async (group, { repairLines = [], attempt = 0, timeoutMs, maxOutputTokens }) => {
    try {
      const ai = await callGeminiText(env, buildSajuAISectionPrompt(builtPrompt, group, { repairLines }), {
        systemPrompt,
        taskType: "fortune",
        temperature: attempt > 0 ? 0.5 : 0.56,
        maxOutputTokens,
        timeoutMs,
        // 폴백 스텁이 20,000원 상품 결과로 전달되지 않도록 문턱을 건다. 전체가 아니라
        // 이 그룹 목표의 40% — CLAUDE.md 의 fallbackMinChars 관례를 그룹 단위로 적용한 것이다.
        fallbackMinChars: Math.round(group.minChars * 0.4),
        // 캐시 키를 그룹·시도별로 갈라야 네 그룹이 서로의 응답을 집어가지 않는다.
        cache: cache ? { ...cache, keyExtra: `${cache.keyExtra}-${group.key}-a${attempt}` } : undefined,
        // 🔴 프롬프트는 위에서 보듯 **전체**를 넘긴다. 접두사 제거는 llm-client 가 Gemini
        //    전송 직전에만 하고, 응답 캐시 키와 Workers AI 폴백은 전체 프롬프트를 그대로 본다.
        //    웨이브2의 보강 요청은 접미사에 들어가므로 같은 핸들이 그대로 유효하다.
        geminiCachedContent: contextCache || undefined,
      });
      return { group, ok: ai?.ok === true, text: normalizeSajuAIResultText(ai?.text), ai };
    } catch (groupError) {
      console.warn("[SajuMyeongsikAI] section group threw", {
        requestId,
        group: group.key,
        attempt: attempt + 1,
        message: String(groupError?.message || groupError || ""),
      });
      return { group, ok: false, text: "", ai: null };
    }
  };

  // ── 웨이브1 — 전 그룹 동시 생성 ───────────────────────────────────────
  // 벽시계는 그룹 시간의 합이 아니라 가장 느린 그룹 하나다. 이것이 예산을 늘리지 않고
  // 분량을 3배로 올릴 수 있는 유일한 이유다.
  const wave1TimeoutMs = featureAiCallTimeoutMs(deadlineAt, SAJU_AI_SECTION_TIMEOUT_MS);
  let sectionResults = [];
  if (!(wave1TimeoutMs > 0)) {
    console.warn("[SajuMyeongsikAI] llm budget exhausted before generation", { requestId });
  } else {
    try {
      console.info("[SajuMyeongsikAI] LLM request created", {
        requestId,
        promptVersion,
        groups: SAJU_AI_SECTION_GROUPS.length,
      });
      // 🔴 예산 확인 뒤에 만든다 — 어차피 안 부를 웨이브를 위해 왕복을 낭비하지 않는다.
      //    실측(2026-08-15): 암묵 캐싱은 이 병렬 구성에서 0/5 로 안 걸리고 명시적 캐싱은 99.0%.
      contextCache = await createGeminiContextCache(env, {
        prefix: buildSajuAISectionPromptPrefix(builtPrompt),
        systemPrompt,
      });
      sectionResults = await Promise.all(SAJU_AI_SECTION_GROUPS.map((group) => runSectionGroup(group, {
        attempt: 0,
        timeoutMs: wave1TimeoutMs,
        maxOutputTokens: SAJU_AI_SECTION_MAX_OUTPUT_TOKENS,
      })));

      // ── 웨이브2 — 모자란 그룹만 다시 쓴다(전체 재생성 금지) ──────────────
      const shortGroups = sectionResults.filter(isSajuAISectionRowShort);
      // 시작해 놓고 예산이 끊기면 그 호출은 통째로 버려진다(비스트리밍 abort 는 부분 텍스트가 0).
      const wave2TimeoutMs = deadlineAt - Date.now() >= SAJU_AI_SECTION_REPAIR_MIN_REMAINING_MS
        ? featureAiCallTimeoutMs(deadlineAt, SAJU_AI_SECTION_REPAIR_TIMEOUT_MS)
        : 0;
      if (shortGroups.length && wave2TimeoutMs > 0) {
        console.warn("[SajuMyeongsikAI] section groups short", {
          requestId,
          promptVersion,
          groups: shortGroups.map((row) => row.group.key).join(","),
        });
        const repaired = await Promise.all(shortGroups.map((row) => {
          const currentChars = countSajuAIVisibleChars(row.text);
          // 🔴 보강 지시는 형용사가 아니라 숫자로 준다. "더 길게"로는 분량이 늘지 않는다.
          const repairLines = row.ok && currentChars > 0
            ? [
              `현재 이 부분은 공백 제외 ${currentChars.toLocaleString("ko-KR")}자로 목표에 못 미칩니다.`,
              `${row.group.minChars.toLocaleString("ko-KR")}자 이상이 되도록 아직 쓰지 않은 근거와 장면, 판단 기준을 새로 더해 처음부터 다시 쓰세요.`,
            ]
            : [];
          return runSectionGroup(row.group, {
            repairLines,
            attempt: 1,
            timeoutMs: wave2TimeoutMs,
            maxOutputTokens: SAJU_AI_SECTION_REPAIR_MAX_OUTPUT_TOKENS,
          });
        }));
        for (const candidate of repaired) {
          const index = sectionResults.findIndex((row) => row.group.key === candidate.group.key);
          if (index < 0 || !candidate.ok || !candidate.text) continue;
          // 재시도가 더 짧거나 잘려 나오는 경우가 있다 — 나아졌을 때만 갈아끼운다.
          if (scoreSajuAISectionRow(candidate) > scoreSajuAISectionRow(sectionResults[index])) {
            sectionResults[index] = candidate;
          }
        }
      }
    } finally {
      // 저장이 시간당 과금이라 다 쓰면 지운다. 실패는 삼키고 TTL(300초)에 맡긴다 —
      // 여기서 던지면 이미 만들어 놓은 상담 결과를 통째로 잃는다.
      await deleteGeminiContextCache(env, contextCache);
    }
  }

  // ── 조립 ──────────────────────────────────────────────────────────────
  // 그룹 순서 = 챕터 순서다. 실패한 그룹은 빠지고, 그 결손은 챕터 수 검증이 잡는다.
  const assembledText = normalizeSajuAIResultText(
    sectionResults.filter((row) => row.text).map((row) => row.text).join("\n\n"),
  );
  const ai = sectionResults.find((row) => row.ok && row.ai)?.ai
    || sectionResults.find((row) => row.ai)?.ai
    || { ok: false, message: "전문가 상담 생성에 실패했습니다." };
  return { sectionResults, assembledText, ai };
}

export function validateSajuAIResultText(text, factSnapshot = null, options = {}) {
  const normalized = normalizeSajuAIResultText(text);
  const forbidden = SAJU_AI_RESULT_FORBIDDEN_PATTERNS.find((pattern) => pattern.test(normalized));
  if (forbidden) {
    return { ok: false, reason: "상담문 안에 기계적인 표현이 남아 있습니다." };
  }
  const incomplete = detectSajuAIIncompleteResult(normalized);
  if (incomplete.incomplete) {
    return { ok: false, reason: incomplete.reason, incomplete: true };
  }
  const chapterCount = countSajuAIRequiredChapters(normalized);
  if (chapterCount < 8) {
    return {
      ok: false,
      reason: "상담문 필수 챕터가 충분히 갖춰지지 않았습니다.",
      qualityIssues: { chapterCount },
    };
  }
  // 🔴 이 하한은 배달을 막는 문턱이 아니라 "웨이브2를 돌게 만드는 신호"다. 미달로 떨어져도
  // 호출부의 경량 보장(렌더 가능 텍스트 ≥400자 salvage)이 결과를 그대로 전달하므로 환불이 늘지
  // 않는다. salvage 를 지우면 이 줄이 곧바로 환불 문턱으로 돌변한다 — 함께 보고 옮길 것.
  const visibleChars = countSajuAIVisibleChars(normalized);
  if (visibleChars < SAJU_AI_MIN_RESULT_CHARS) {
    return {
      ok: false,
      reason: "상담 분량이 유료 기준에 못 미칩니다.",
      qualityIssues: { visibleChars, minChars: SAJU_AI_MIN_RESULT_CHARS },
    };
  }
  const rubric = options?.categoryRubric || getSajuAICategoryRubric(options?.domain || factSnapshot?.domain || "life_direction");
  const categoryMatches = countSajuAICategoryMatches(normalized, rubric);
  if (categoryMatches < 4) {
    return {
      ok: false,
      reason: "카테고리별 핵심 상담 항목이 부족합니다.",
      qualityIssues: { categoryMatches, category: rubric.label || rubric.domain },
    };
  }
  const tenGodValidation = validateSajuMyeongsikTenGodText(normalized, factSnapshot);
  if (!tenGodValidation.ok) {
    return {
      ok: false,
      reason: "내부 십성표와 충돌하는 표현이 있습니다.",
      tenGodMismatches: tenGodValidation.mismatches,
    };
  }
  return { ok: true, text: normalized, chapterCount, categoryMatches };
}

function buildSajuAIPromptPaymentRequiredError() {
  return buildSajuAIPromptError(
    "PAYMENT_REQUIRED",
    `결제 또는 이용권 확인 후 사주 전문가 상담 결과가 열립니다.`,
    402,
    {
      featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
      amountKRW: SAJU_AI_PROMPT_AMOUNT_KRW,
      chargedCoins: 0,
      allowedPaymentModes: ["direct", "monthly", "membership_pass"],
      pricing: {
        featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
        reason: "사주 전문가 상담 결과 생성",
        coinPrice: SAJU_AI_PROMPT_PRICE,
        cost: SAJU_AI_PROMPT_PRICE,
        amountKRW: SAJU_AI_PROMPT_AMOUNT_KRW,
        krwEquivalent: SAJU_AI_PROMPT_AMOUNT_KRW,
        displayUnit: "single_purchase",
      },
    },
  );
}

function buildSajuAILlmRetryableError(details = {}) {
  // 🔴 환불했으면 "결제는 확인되었고 … 다시 시도" 라고 답하지 않는다. 그 문구를 믿은 클라이언트가
  // 같은 증빙으로 재시도하면 서버는 환불된 차감을 증빙으로 인정하지 않아 402 를 답한다(결제창 재오픈).
  const refunded = details.refunded === true;
  return buildSajuAIPromptError(
    "LLM_GENERATION_RETRYABLE",
    refunded
      ? "상담문 생성에 거듭 실패해 결제를 자동 환불했어요. 다시 시도하시면 새로 결제됩니다."
      : "결제는 확인되었고 상담문 생성만 다시 맞추고 있습니다. 잠시 후 다시 시도해 주세요.",
    503,
    {
      featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
      amountKRW: SAJU_AI_PROMPT_AMOUNT_KRW,
      chargedCoins: Math.max(0, Number(details.chargedCoins || 0)),
      membershipCreditCost: Math.max(0, Number(details.membershipCreditCost || 0)),
      paymentMode: String(details.paymentMode || "").trim() || undefined,
      accessMethod: String(details.accessMethod || "").trim() || undefined,
      refundAttempted: details.refundAttempted === true,
      refundOk: details.refundOk === true,
      retryable: true,
      paymentRetainedForRetry: !refunded,
      requestId: String(details.requestId || "").trim() || undefined,
      jobId: String(details.jobId || "").trim() || undefined,
      executionId: String(details.jobId || details.executionId || "").trim() || undefined,
      resultId: String(details.resultId || "").trim() || undefined,
    },
  );
}

function readSajuAIPromptProfileId(body = {}, sajuResult = {}) {
  const accessGrant = body?.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const consume = body?.consume && typeof body.consume === "object" ? body.consume : {};
  const payment = body?.payment && typeof body.payment === "object" ? body.payment : {};
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  const profile = sajuResult?.profile && typeof sajuResult.profile === "object" ? sajuResult.profile : {};
  const snapshot = sajuResult?.snapshot && typeof sajuResult.snapshot === "object" ? sajuResult.snapshot : {};
  const analysisProfile = sajuResult?.analysisProfile && typeof sajuResult.analysisProfile === "object" ? sajuResult.analysisProfile : {};
  return String(
    body?.profileId
      || body?.selectedProfileId
      || accessGrant.profileId
      || consume.profileId
      || payment.profileId
      || paymentContext.profileId
      || profile.profileId
      || profile.id
      || snapshot.profileId
      || snapshot.id
      || analysisProfile.profileId
      || analysisProfile.id
      || "",
  ).trim().slice(0, 120);
}

function resolveSajuAIProfileIdForConsultation(body = {}, sajuResult = {}) {
  return readSajuAIPromptProfileId(body, sajuResult) || "default";
}

function normalizeSajuAIPromptAccessMethod(consumePayload = {}, body = {}) {
  const consume = consumePayload?.consume && typeof consumePayload.consume === "object" ? consumePayload.consume : {};
  const accessGrant = consumePayload?.accessGrant && typeof consumePayload.accessGrant === "object" ? consumePayload.accessGrant : {};
  const accessDecision = consumePayload?.accessDecision && typeof consumePayload.accessDecision === "object" ? consumePayload.accessDecision : {};
  const bodyAccessGrant = body?.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const bodyAccessDecision = body?.accessDecision && typeof body.accessDecision === "object" ? body.accessDecision : {};
  const accessType = String(
    consumePayload.accessType
      || consume.accessType
      || accessGrant.accessType
      || accessDecision.accessType
      || body.accessType
      || bodyAccessGrant.accessType
      || bodyAccessDecision.accessType
      || "",
  ).trim().toLowerCase();
  const accessMethod = String(
    consumePayload.accessMethod
      || consume.accessMethod
      || consume.paymentMethod
      || accessGrant.accessMethod
      || accessDecision.accessMethod
      || accessDecision.paymentMethod
      || body.accessMethod
      || bodyAccessGrant.accessMethod
      || bodyAccessDecision.accessMethod
      || bodyAccessDecision.paymentMethod
      || "",
  ).trim().toUpperCase();
  const paymentMode = String(
    consumePayload.paymentMode
      || consume.paymentMode
      || accessGrant.paymentMode
      || accessDecision.paymentMode
      || body.paymentMode
      || bodyAccessGrant.paymentMode
      || bodyAccessDecision.paymentMode
      || "",
  ).trim().toUpperCase();
  const passTier = String(
    consumePayload.subscriptionTier
      || consumePayload?.membershipPass?.passTier
      || consumePayload?.membershipPass?.tier
      || consumePayload?.user?.profileSubscription?.tier
      || accessDecision.passTier
      || bodyAccessDecision.passTier
      || "",
  ).trim().toLowerCase();

  if (accessType === "membership_pass" || accessMethod === "PASS" || paymentMode === "MEMBERSHIP_PASS") {
    return passTier === "family" ? "family" : "pass";
  }
  if (accessType === "membership_credit" || accessMethod === "MONTHLY" || paymentMode === "MOONLIGHT_STONE" || paymentMode === "MONTHLY_CREDIT") {
    return "monthly";
  }
  return "single";
}

function buildSajuAIPromptResultPayload({ builtPrompt, resultText, consumePayload, chargedCoins, balanceAfter, requestId, execution, promptDigest, model, provider, domain, resultId, question, profileId, saved = false }) {
  return {
    ok: true,
    status: "completed",
    progress: 100,
    stepMessage: "결과 준비 완료",
    resultText: normalizeSajuAIResultText(resultText),
    title: SAJU_AI_PROMPT_TITLE,
    consultationType: "saju_myeongsik_ai",
    promptVersion: builtPrompt.promptVersion || SAJU_AI_PROMPT_VERSION,
    question: String(question || "").trim(),
    summaryIntent: builtPrompt.summaryIntent || "",
    questionType: builtPrompt.questionType,
    domain: String(builtPrompt.domain || domain || "").trim() || undefined,
    profileId: String(profileId || "").trim() || undefined,
    factSnapshot: builtPrompt.factSnapshot || undefined,
    // 결과 화면 근거 패널이 쓰는 형태. 프롬프트가 인용한 확정값과 같은 원본에서 나온다.
    analysisBasis: builtPrompt.analysisBasis || undefined,
    tenGodSnapshot: builtPrompt.tenGodSnapshot || undefined,
    amountKRW: SAJU_AI_PROMPT_AMOUNT_KRW,
    chargedCoins,
    membershipCreditCost: Math.max(0, Number(consumePayload?.membershipCreditCost || consumePayload?.consume?.membershipCreditCost || 0)),
    accessType: String(consumePayload?.accessType || consumePayload?.consume?.accessType || consumePayload?.accessGrant?.accessType || "").trim() || undefined,
    accessMethod: String(consumePayload?.accessMethod || consumePayload?.consume?.accessMethod || consumePayload?.accessGrant?.accessMethod || "").trim() || undefined,
    paymentMode: String(consumePayload?.paymentMode || consumePayload?.consume?.paymentMode || consumePayload?.accessGrant?.paymentMode || "").trim() || undefined,
    requestId,
    promptDigest: String(promptDigest || "").trim() || undefined,
    jobId: execution?.executionId || undefined,
    executionId: execution?.executionId || undefined,
    resultId: String(resultId || execution?.resultId || "").trim() || undefined,
    accessMode: SAJU_AI_PROMPT_ACCESS_MODE,
    consume: consumePayload?.consume && typeof consumePayload.consume === "object" ? consumePayload.consume : undefined,
    featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
    featureId: SAJU_AI_PROMPT_FEATURE_KEY,
    balanceAfter,
    model: model || undefined,
    provider: provider || undefined,
    saved: saved === true,
    generatedAt: new Date().toISOString(),
  };
}

function readSajuAIPromptPaymentIdentity(consumePayload = {}, body = {}, requestId = "") {
  const consume = consumePayload?.consume && typeof consumePayload.consume === "object" ? consumePayload.consume : {};
  const accessGrant = consumePayload?.accessGrant && typeof consumePayload.accessGrant === "object" ? consumePayload.accessGrant : {};
  const accessDecision = consumePayload?.accessDecision && typeof consumePayload.accessDecision === "object" ? consumePayload.accessDecision : {};
  const payment = body?.payment && typeof body.payment === "object" ? body.payment : {};
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  const paymentId = uniqueStrings([
    consumePayload?.transactionId,
    consume?.transactionId,
    consumePayload?.ledgerId,
    consume?.ledgerId,
    accessDecision.transactionId,
    accessDecision.ledgerId,
    accessGrant.evidenceId,
    accessGrant.purchaseId,
    accessGrant.paymentId,
    paymentContext.transactionId,
    paymentContext.ledgerId,
    paymentContext.purchaseId,
    paymentContext.paymentId,
    payment._id,
    payment.id,
    payment.paymentId,
    body?.transactionId,
    body?.ledgerId,
    body?.purchaseId,
    body?.paymentId,
    body?.merchantUid,
    body?.impUid,
    requestId,
  ])[0] || String(requestId || "").trim();
  const orderId = uniqueStrings([
    body?.orderId,
    body?.merchantUid,
    body?.impUid,
    paymentContext.orderId,
    paymentContext.merchantUid,
    paymentContext.impUid,
    payment.orderId,
    payment.merchantUid,
    payment.impUid,
  ])[0] || "";
  return {
    paymentId: String(paymentId || "").trim().slice(0, 160),
    orderId: String(orderId || "").trim().slice(0, 160),
  };
}

function normalizeSajuAIStoredResult(record) {
  const stored = record?.result && typeof record.result === "object" ? record.result : {};
  const consultation = stored.consultation && typeof stored.consultation === "object" ? stored.consultation : {};
  if (!consultation.resultText) return null;
  return {
    ...consultation,
    ok: true,
    status: "completed",
    progress: 100,
    stepMessage: "결과 준비 완료",
    jobId: record.executionId,
    executionId: record.executionId,
    resultId: record.resultId || consultation.resultId,
    idempotent: true,
  };
}

function buildSajuAIStatusPayload(record) {
  const stored = record?.result && typeof record.result === "object" ? record.result : {};
  const rawProgress = stored.progress && typeof stored.progress === "object" ? stored.progress : {};
  const status = mapSajuAIExecutionStatus(record?.status);
  const fallbackProgress = status === "completed" ? 100 : status === "failed" ? Math.max(0, Math.min(95, Number(rawProgress.progress || 0) || 0)) : Number(rawProgress.progress || 0) || 0;
  const progress = buildSajuAIProgress(fallbackProgress, status, rawProgress.stepMessage || "");
  const error = record?.error && typeof record.error === "object" ? record.error : {};
  return {
    ok: true,
    jobId: record?.executionId || "",
    executionId: record?.executionId || "",
    requestId: record?.requestId || "",
    resultId: record?.resultId || "",
    status,
    progress: status === "completed" ? 100 : progress.progress,
    stepMessage: status === "completed" ? "결과 준비 완료" : progress.stepMessage,
    progressState: progress,
    retryable: status === "failed" && stored?.order?.paymentStatus === "PAID",
    errorCode: String(error.code || "").trim() || undefined,
    errorMessage: String(error.message || "").trim() || undefined,
    updatedAt: record?.updatedAt || rawProgress.updatedAt || "",
  };
}

async function updateSajuAIExecutionProgress(executionId, progress, stepMessage = "", status = "generating") {
  const id = String(executionId || "").trim();
  if (!id) return null;
  const nextProgress = buildSajuAIProgress(progress, status, stepMessage);
  await PaidExecutionRecord.updateOne(
    { executionId: id },
    {
      $set: {
        status: status === "pending" ? "paid_pending_generation" : status === "failed" ? "generation_failed" : status === "completed" ? "completed" : "generating",
        "result.progress": nextProgress,
      },
    },
  );
  return nextProgress;
}

async function findSajuAIExecutionForRead({ auth, jobId = "", resultId = "", requestId = "", profileId = "" } = {}) {
  const userId = String(auth?.userId || "").trim();
  const clauses = [];
  if (jobId) clauses.push({ executionId: String(jobId).trim() });
  if (resultId) clauses.push({ resultId: String(resultId).trim() });
  // 레코드 키는 readAIPromptRequestId 가 idempotencyKey 를 우선하는데(카드 경로는 requestId + ":a0"),
  // 클라이언트는 접미사 없는 requestId 로 폴링해 404 로 새는 조합이 있다. 쓰기 키를 바꾸면 재접속이
  // 다른 멱등키로 돌아 이중 차감 위험이 있으므로, 읽기에서만 접두 일치를 함께 본다.
  if (requestId) {
    const normalizedRequestId = String(requestId).trim();
    clauses.push({ requestId: normalizedRequestId });
    clauses.push({ requestId: { $regex: `^${normalizedRequestId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:` } });
  }
  if (!userId || !clauses.length) return null;
  return PaidExecutionRecord.findOne({
    userId,
    featureId: SAJU_AI_PROMPT_FEATURE_KEY,
    ...(profileId ? { profileId: String(profileId).trim() } : {}),
    $or: clauses,
  }).lean();
}

// 생성 시작 시점에 "generating" 실행 레코드를 기록한다 — 클라이언트 /status 폴링이 404(JOB_NOT_FOUND)
// 대신 202(진행 중)로 수렴하고, 백그라운드(waitUntil) 생성의 완료/실패도 레코드로 전달된다.
// 식별자(executionId·requestId·profileId)와 과금 필드는 완료 저장(saveSajuAIConsultationResultRecord)의
// $setOnInsert와 동일 정본을 쓴다 — 불일치 시 폴링이 레코드를 못 찾아 404가 재발한다.
async function beginSajuAIConsultationGeneratingRecord({ auth, body, profileId, requestId, resultId, consumePayload, paymentIdentity, chargedCoins, membershipCreditCost, env }) {
  const userId = String(auth?.userId || "").trim();
  const normalizedProfileId = String(profileId || "default").trim() || "default";
  const normalizedRequestId = String(requestId || "").trim();
  if (!userId || !normalizedRequestId) return null;
  const now = new Date();
  const accessMethod = normalizeSajuAIPromptAccessMethod(consumePayload, body);
  const executionId = buildSajuAIPromptExecutionId({ userId, profileId: normalizedProfileId, requestId: normalizedRequestId });
  const paymentId = String(paymentIdentity?.paymentId || "").trim();
  const orderId = String(paymentIdentity?.orderId || normalizedRequestId).trim();
  await withMongoRetry(env, () => PaidExecutionRecord.findOneAndUpdate(
    {
      userId,
      featureId: SAJU_AI_PROMPT_FEATURE_KEY,
      profileId: normalizedProfileId,
      requestId: normalizedRequestId,
    },
    {
      $setOnInsert: {
        executionId,
        requestId: normalizedRequestId,
        userId,
        featureId: SAJU_AI_PROMPT_FEATURE_KEY,
        profileId: normalizedProfileId,
        accessMode: SAJU_AI_PROMPT_ACCESS_MODE,
        accessMethod,
        amountCoins: accessMethod === "single" ? Math.max(0, Math.floor(Number(chargedCoins || 0))) : 0,
        amountKRW: accessMethod === "single" && Number(chargedCoins || 0) > 0 ? SAJU_AI_PROMPT_AMOUNT_KRW : 0,
        monthlyDeductedAmount: accessMethod === "monthly" ? Math.max(0, Math.floor(Number(membershipCreditCost || 0))) : 0,
        paymentId: paymentId && paymentId !== normalizedRequestId ? paymentId : "",
        orderId,
        consumedAt: now,
        idempotencyKey: executionId.slice(0, 180),
      },
      $set: {
        status: "generating",
        resultId: String(resultId || "").trim(),
        result: {
          progress: buildSajuAIProgress(10, "generating", "명식의 흐름을 읽고 있어요"),
          order: { paymentStatus: "PAID", accessMethod },
        },
      },
      $unset: { error: "", completedAt: "" },
    },
    { upsert: true },
  )).catch((error) => {
    console.warn("[fortune][saju-ai-prompt] begin generating record failed:", error?.message || error);
  });
  return executionId;
}

async function saveSajuAIConsultationResultRecord({ auth, body, profileId, requestId, resultId, resultPayload, builtPrompt, consumePayload, paymentIdentity, promptDigest, env }) {
  const userId = String(auth?.userId || "").trim();
  const normalizedProfileId = String(profileId || readSajuAIPromptProfileId(body, body?.sajuResult) || "default").trim() || "default";
  const normalizedRequestId = String(requestId || "").trim();
  if (!userId || !normalizedRequestId || !resultPayload?.resultText) return null;

  const now = new Date();
  const accessMethod = normalizeSajuAIPromptAccessMethod(consumePayload, body);
  const executionId = buildSajuAIPromptExecutionId({ userId, profileId: normalizedProfileId, requestId: normalizedRequestId });
  const paymentId = String(paymentIdentity?.paymentId || "").trim();
  const orderId = String(paymentIdentity?.orderId || normalizedRequestId).trim();
  const chargedCoins = Math.max(0, Number(resultPayload.chargedCoins || 0));
  const amountKRW = Math.max(0, Number(resultPayload.amountKRW || 0));
  const monthlyDeductedAmount = Math.max(0, Number(resultPayload.membershipCreditCost || 0));
  const progress = buildSajuAIProgress(100, "completed", "결과 준비 완료");
  const safeResultPayload = {
    ...resultPayload,
    saved: true,
    profileId: normalizedProfileId,
  };

  // LLM 생성이 이미 성공한 뒤 이 저장 한 번이 흔들리면 정상 생성된 상담문이 통째로 버려지고
  // runGeneration의 바깥 catch가 "LLM 생성 실패"로 오판해 환불 절차를 탄다 — withMongoRetry로 흡수한다.
  return withMongoRetry(env, () => PaidExecutionRecord.findOneAndUpdate(
    {
      userId,
      featureId: SAJU_AI_PROMPT_FEATURE_KEY,
      profileId: normalizedProfileId,
      requestId: normalizedRequestId,
    },
    {
      $setOnInsert: {
        executionId,
        requestId: normalizedRequestId,
        userId,
        featureId: SAJU_AI_PROMPT_FEATURE_KEY,
        profileId: normalizedProfileId,
        accessMode: SAJU_AI_PROMPT_ACCESS_MODE,
        accessMethod,
        amountCoins: accessMethod === "single" ? chargedCoins : 0,
        amountKRW: accessMethod === "single" ? amountKRW : 0,
        monthlyDeductedAmount: accessMethod === "monthly" ? monthlyDeductedAmount : 0,
        paymentId: paymentId && paymentId !== normalizedRequestId ? paymentId : "",
        orderId,
        consumedAt: now,
        idempotencyKey: executionId.slice(0, 180),
      },
      $set: {
        status: "completed",
        completedAt: now,
        resultId: String(resultId || "").trim(),
        result: {
          consultation: safeResultPayload,
          promptVersion: builtPrompt?.promptVersion || SAJU_AI_PROMPT_VERSION,
          consultationType: "saju_myeongsik_ai",
          factSnapshot: builtPrompt?.factSnapshot || null,
          tenGodSnapshot: builtPrompt?.tenGodSnapshot || null,
          promptDigest: String(promptDigest || "").trim(),
          progress,
          order: {
            paymentStatus: "PAID",
            accessMethod,
            amountCoins: chargedCoins,
            amountKRW,
            monthlyDeductedAmount,
          },
        },
        error: null,
      },
    },
    { upsert: true, new: true },
  ).lean());
}

function readSajuAIPromptMonthlyRefundContext(consumePayload = {}, body = {}) {
  const consume = consumePayload?.consume && typeof consumePayload.consume === "object" ? consumePayload.consume : {};
  const accessDecision = consumePayload?.accessDecision && typeof consumePayload.accessDecision === "object" ? consumePayload.accessDecision : {};
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  const accessMethod = normalizeSajuAIPromptAccessMethod(consumePayload, body);
  const membershipCreditCost = Math.max(0, Math.floor(Number(
    consumePayload?.membershipCreditCost
      || consumePayload?.requiredMonthlyCredits
      || consume?.membershipCreditCost
      || consume?.requiredMonthlyCredits
      || accessDecision?.membershipCreditCost
      || accessDecision?.requiredMonthlyCredits
      || paymentContext?.membershipCreditCost
      || 0,
  )));
  const ledgerId = String(
    consumePayload?.ledgerId
      || consumePayload?.monthlyCreditLedgerId
      || consume?.ledgerId
      || consume?.monthlyCreditLedgerId
      || accessDecision?.ledgerId
      || accessDecision?.monthlyCreditLedgerId
      || body?.ledgerId
      || body?.monthlyCreditLedgerId
      || paymentContext?.ledgerId
      || paymentContext?.monthlyCreditLedgerId
      || "",
  ).trim();
  const transactionId = String(
    consumePayload?.transactionId
      || consume?.transactionId
      || accessDecision?.transactionId
      || body?.transactionId
      || paymentContext?.transactionId
      || "",
  ).trim();
  const purchaseId = String(
    consumePayload?.purchaseId
      || consume?.purchaseId
      || accessDecision?.purchaseId
      || body?.purchaseId
      || paymentContext?.purchaseId
      || "",
  ).trim();

  return {
    accessMethod,
    membershipCreditCost,
    ledgerId,
    transactionId,
    purchaseId,
    isMonthly: accessMethod === "monthly" || membershipCreditCost > 0 || Boolean(ledgerId),
  };
}

async function refundSajuAIPromptMonthlyCredit({ auth, consumePayload, body, requestId, error }) {
  const ctx = readSajuAIPromptMonthlyRefundContext(consumePayload, body);
  if (!ctx.isMonthly || ctx.membershipCreditCost <= 0) {
    return { attempted: false, refundOk: false };
  }

  const userId = String(auth?.userId || "").trim();
  if (!userId) return { attempted: true, refundOk: false };

  // monthlyCreditRefundedForUnlockFailure 는 이름과 달리 "이 환불은 유니크 키를 놓는다"는 계약 마커다
  // (love-secret-ai.js 가 쓰는 관례). 이게 없으면 billing.js readIdempotentSpendResult 의 PointHistory
  // 갈래가 환불된 이력을 "이미 결제됨"으로 되돌려, 재구매가 E11000 복구(=키 해제)에 도달조차 못 한다.
  const marker = {
    "metadata.monthlyCreditRefundedForServiceExecution": true,
    "metadata.monthlyCreditRefundedForUnlockFailure": true,
    "metadata.monthlyCreditRefundedAt": new Date(),
    "metadata.serviceExecutionFailureMessage": String(error?.message || error || "").slice(0, 500),
    "metadata.serviceExecutionRequestId": String(requestId || "").slice(0, 120),
  };

  let shouldRestore = false;
  if (ctx.ledgerId && isObjectIdLike(ctx.ledgerId)) {
    const ledgerResult = await MonthlyCreditLedger.updateOne(
      {
        _id: ctx.ledgerId,
        userId,
        "metadata.monthlyCreditRefundedForServiceExecution": { $ne: true },
        "metadata.refundedForServiceExecution": { $ne: true },
      },
      {
        $set: {
          ...marker,
          "metadata.refundedForServiceExecution": true,
          // 원장 쪽 키 해제 계약 표식 — releaseRefundedSpendSourceId(billing.js)가 이 표식으로만
          // 환불 원장을 골라 sourceId 를 비운다. 없으면 같은 purchaseId 재구매가 영구 E11000 이다.
          "metadata.refundedForUnlockFailure": true,
          "metadata.refundedAt": new Date(),
        },
      },
    );
    shouldRestore = Number(ledgerResult?.modifiedCount || 0) > 0;
  }

  if (!shouldRestore && ctx.transactionId && isObjectIdLike(ctx.transactionId)) {
    const pointResult = await PointHistory.updateOne(
      {
        _id: ctx.transactionId,
        userId,
        "metadata.monthlyCreditRefundedForServiceExecution": { $ne: true },
      },
      { $set: marker },
    );
    shouldRestore = Number(pointResult?.modifiedCount || 0) > 0;
  }

  if (!shouldRestore) {
    return { attempted: true, refundOk: false };
  }

  // 복원분은 신규 30일 lot으로 재적립(lotId로 멱등). recentConsumeRequestIds도 정리.
  await restoreMonthlyCreditLot({
    userId,
    lotId: `fortune-refund:${String(ctx.transactionId || ctx.purchaseId || "")}`,
    amount: ctx.membershipCreditCost,
    pullRequestId: ctx.purchaseId || "",
  });

  if (ctx.transactionId && isObjectIdLike(ctx.transactionId)) {
    await PointHistory.updateOne(
      { _id: ctx.transactionId, userId },
      { $set: marker },
    ).catch(() => {});
  }

  return { attempted: true, refundOk: true };
}

function readSajuAIPromptPointRefundContext(consumePayload = {}, body = {}) {
  const consume = consumePayload?.consume && typeof consumePayload.consume === "object" ? consumePayload.consume : {};
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  const accessMethod = String(consumePayload?.accessMethod || consume?.accessMethod || consume?.paymentMethod || body?.accessMethod || paymentContext?.accessMethod || "").trim().toUpperCase();
  const paymentMode = String(consumePayload?.paymentMode || consume?.paymentMode || body?.paymentMode || paymentContext?.paymentMode || "").trim().toUpperCase();
  const chargedCoins = Math.max(0, Math.floor(Number(consumePayload?.chargedCoins || consume?.chargedCoins || 0)));
  const sourceTransactionId = String(consumePayload?.transactionId || consume?.transactionId || body?.transactionId || paymentContext?.transactionId || "").trim();
  const isPointSpend = paymentMode === "COIN" || accessMethod === "COIN" || String(consume?.transactionType || "").trim().toLowerCase() === "coin";
  // 카드(PortOne 단건) 결제. 이 경우 sourceTransactionId 는 PointHistory 가 아니라 Payment _id 다
  // (buildAIPromptVerifiedConsumePayload 의 transactionId 체인 참고) — 코인 환불로 보내면 반드시
  // 409 로 실패하므로 PortOne 취소 경로로 보내야 한다.
  const isCardSpend = !isPointSpend
    && (paymentMode === "DIRECT_KRW" || accessMethod === "CARD" || String(consume?.transactionType || "").trim().toLowerCase() === "single_purchase");
  return { isPointSpend, isCardSpend, chargedCoins, sourceTransactionId };
}

// 카드 단건 결제로 연 유료 생성이 실패했을 때의 자동 환불. 지급 실패 자동환불의 정본
// (payment-refund.js autoRefundSinglePaymentDeliveryFailure)을 그대로 쓴다 — PortOne 취소 +
// 콘텐츠 권한 회수 + Payment 상태 기록이 한 곳에 있다.
//
// 🔴 paymentId 를 그대로 넘기지 않고 반드시 사용자 스코프로 Payment 를 다시 찾는다.
// consumePayload.transactionId 체인에는 클라이언트가 보낸 body.payment._id 폴백이 섞일 수 있어,
// 재조회 없이 넘기면 남의 결제를 취소시킬 수 있다. 아래 조건으로 좁히면 조작해도 무해하다
// (못 찾으면 환불하지 않고 기존 실패 처리가 그대로 돈다).
function buildAIPromptCardRefundPaymentQuery({ userId, paymentId, featureKey }) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedId = String(paymentId || "").trim();
  if (!normalizedUserId || !isObjectIdLike(normalizedId)) return null;
  const featureKeys = uniqueStrings([featureKey, normalizeFeatureKey(featureKey)]);
  if (!featureKeys.length) return null;
  return {
    _id: normalizedId,
    userId: normalizedUserId,
    featureKey: featureKeys.length > 1 ? { $in: featureKeys } : featureKeys[0],
    status: { $in: ["paid", "success", "fulfilled"] },
  };
}

async function refundAIPromptCardPaymentOnFailure({ env, auth, paymentId, featureKey, reasonCode, reasonMessage }) {
  const query = buildAIPromptCardRefundPaymentQuery({ userId: auth?.userId, paymentId, featureKey });
  if (!query) return { refunded: false, reason: "PAYMENT_MISSING" };

  try {
    await connectDb(env);
    const payment = await Payment.findOne(query)
      .select("_id userId impUid merchantUid paymentAmount status orderState paymentType featureKey productId pricingSnapshot")
      .lean();
    if (!payment) return { refunded: false, reason: "PAYMENT_NOT_FOUND" };

    return await autoRefundSinglePaymentDeliveryFailure(env, payment, reasonCode, reasonMessage, "ai_prompt_generation");
  } catch (error) {
    console.error("[fortune][ai-prompt] card auto-refund failed:", error);
    return { refunded: false, refundFailed: true, reason: String(error?.message || error || "") };
  }
}

function buildSajuAIPromptExecutionId({ userId, profileId, requestId }) {
  return `saju-ai-question:${String(userId || "")}:${String(profileId || "")}:${String(requestId || "")}`.slice(0, 160);
}

function isSajuAIPromptStaleGeneratingExecution(execution, now = new Date()) {
  if (!execution || execution.status !== "generating") return false;
  const updatedAtMs = Date.parse(
    execution.updatedAt
      || execution.consumedAt
      || execution.createdAt
      || "",
  );
  if (!Number.isFinite(updatedAtMs) || updatedAtMs <= 0) return false;
  return now.getTime() - updatedAtMs > SAJU_AI_PROMPT_STALE_GENERATING_MS;
}

/**
 * 결제 1건에 생성 기회를 2번 준다(2-스트라이크).
 *
 * 🔴 실패 즉시 환불하면 안 된다 — 환불된 차감행은 결제 증빙 조회에서 제외되므로
 * (findAIPromptPaymentEvidence / findAIPromptMonthlyCreditEvidence), 클라이언트의 자동 재시도와
 * "추가 결제 없이 다시 생성"이 전부 402 로 떨어져 결제창이 다시 열린다. 그게 "결제했는데 생성 안 됨"의 정체다.
 * 1차 실패는 결제를 보존해 무료 재시도를 실제로 열어 주고, 그 재시도까지 실패하면 그때 환불한다.
 *
 * - 이미 환불한 실패 레코드는 스트라이크로 세지 않는다. requestId 는 질문+명식으로 결정적이라
 *   같은 질문을 재결제하면 같은 레코드를 만나는데, 세면 새 결제의 첫 실패가 즉시 환불돼 영원히 1스트라이크가 된다.
 * - stale(엣지 절단으로 끊긴 generating)은 스트라이크가 아니다. 그 사용자는 in-band 실패를 본 적이 없고,
 *   회수 안내(markSajuAIPromptStaleExecutionFailed)가 "결제 권한은 보존되어"라고 이미 약속했다.
 *   다만 캐시 건너뛰기는 stale 에도 필요하다(검증 실패 응답이 캐시에 남아 30일 고정되는 문제).
 */
function resolveSajuAIPromptFailureBilling(execution, now = new Date()) {
  const status = String(execution?.status || "").trim();
  const stale = isSajuAIPromptStaleGeneratingExecution(execution, now);
  const previouslyRefunded = String(execution?.error?.code || "").trim() === "GENERATION_FAILED_REFUNDED"
    || String(execution?.result?.order?.paymentStatus || "").trim().toUpperCase() === "REFUNDED";
  return {
    refundOnFailure: status === "generation_failed" && !previouslyRefunded,
    skipCacheRead: status === "generation_failed" || stale,
  };
}

async function markSajuAIPromptStaleExecutionFailed(execution, details = {}) {
  if (!execution?.executionId) return null;
  await PaidExecutionRecord.updateOne(
    { executionId: execution.executionId, status: "generating" },
    {
      $set: {
        status: "generation_failed",
        // code/message 는 buildSajuAIStatusPayload 가 그대로 사용자에게 내보낸다(errorCode/errorMessage).
        error: {
          name: "STALE_GENERATING_RECOVERY",
          code: "STALE_GENERATION_RECOVERED",
          message: "상담 생성이 중간에 끊겨 대기 상태를 정리했어요. 결제 권한은 보존되어 추가 결제 없이 다시 생성할 수 있어요.",
        },
        "result.progress": buildSajuAIProgress(0, "failed", "상담 생성이 중단되어 다시 생성이 필요해요."),
        updatedAt: new Date(),
      },
    },
  );
  logSajuAIPromptStage("STALE_GENERATING_EXECUTION_RECOVERED", {
    ...details,
    executionId: execution.executionId,
    executionStatus: "generation_failed",
  });
  return { ...execution, status: "generation_failed" };
}

// 생성은 동기라 요청이 끊기면(엣지 데드라인/탭 종료/isolate 회수) 레코드가 generating 으로 남고
// /status 는 영원히 202 를 답한다 — 결제는 됐는데 결과도 환불도 없이 폴링만 돌다 끝난다.
// 읽기 시점에 정리해 terminal 상태로 내보내면 클라이언트의 기존 failed 처리(결제 보존 재생성)가 인계한다.
async function reapStaleSajuAIExecution(execution, details = {}) {
  if (!isSajuAIPromptStaleGeneratingExecution(execution)) return execution;
  const recovered = await markSajuAIPromptStaleExecutionFailed(execution, details).catch(() => null);
  return recovered || { ...execution, status: "generation_failed" };
}

async function findSajuAIPromptDuplicateExecution({ auth, profileId, requestId, paymentId, orderId }) {
  const userId = String(auth?.userId || "").trim();
  const normalizedProfileId = String(profileId || "").trim();
  const normalizedRequestId = String(requestId || "").trim();
  const normalizedPaymentId = String(paymentId || "").trim();
  const normalizedOrderId = String(orderId || "").trim();
  const identityClauses = [];
  if (normalizedRequestId) identityClauses.push({ requestId: normalizedRequestId });
  if (normalizedPaymentId) identityClauses.push({ paymentId: normalizedPaymentId });
  if (normalizedOrderId) identityClauses.push({ orderId: normalizedOrderId });
  if (!userId || !normalizedProfileId || !identityClauses.length) return null;

  return PaidExecutionRecord.findOne({
    userId,
    featureId: SAJU_AI_PROMPT_FEATURE_KEY,
    profileId: normalizedProfileId,
    $or: identityClauses,
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();
}

let __swissWesternChartLoader = null;

async function loadSwissWesternChart() {
  if (!__swissWesternChartLoader) {
    __swissWesternChartLoader = import("../lib/swiss-ephemeris.js").then((mod) => mod.getSwissWesternChart);
  }
  return __swissWesternChartLoader;
}

const PIG_COIN_PACKAGES = {
  sample: { name: "Sample Pack", coins: 30, bonus: 0 },
  luckyMeal: { name: "Lucky Meal", coins: 100, bonus: 15 },
  goldBarn: { name: "Gold Barn", coins: 300, bonus: 60 },
  goldVault: { name: "Gold Vault", coins: 700, bonus: 180 },
  emperorReserve: { name: "Emperor Reserve", coins: 1500, bonus: 500 },
};

function isTruthyFlag(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isProductionRuntime(env) {
  const nodeEnv = String(env?.NODE_ENV || "").trim().toLowerCase();
  if (nodeEnv === "production") return true;

  const appEnv = String(env?.APP_ENV || env?.DEPLOY_ENV || env?.ENVIRONMENT || "").trim().toLowerCase();
  return appEnv === "prod" || appEnv === "production";
}

function buildJsonWithPremiumAccessCookie(body, init = {}, premiumAccessToken = "", env = {}) {
  const token = String(premiumAccessToken || "").trim();
  if (!token) return json(body, init);

  const headers = new Headers(init.headers || {});
  const secure = isProductionRuntime(env);
  headers.append("Set-Cookie", buildPremiumAccessCookie(token, secure));
  return json(body, { ...init, headers });
}

function isDynamicCostFallbackEnabled(env) {
  return !isProductionRuntime(env) && isTruthyFlag(env?.ALLOW_DYNAMIC_PIG_COIN_COST_FALLBACK);
}

function normalizeFeatureKey(rawKey) {
  return normalizePaidFeatureKey(rawKey);
}

function uniqueStrings(values) {
  return Array.from(new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  ));
}

function readAIPromptRequestId(body = {}, fallbackRequestId = "") {
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  return String(
    body?.idempotencyKey
      || paymentContext.idempotencyKey
      || body?.requestId
      || paymentContext.requestId
      || fallbackRequestId,
  ).trim().slice(0, 120) || String(fallbackRequestId || "").trim().slice(0, 120);
}

function collectAIPromptPaymentTokens(body = {}, requestId = "") {
  const accessGrant = body?.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const consume = body?.consume && typeof body.consume === "object" ? body.consume : {};
  const payment = body?.payment && typeof body.payment === "object" ? body.payment : {};
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  const accessDecision = body?.accessDecision && typeof body.accessDecision === "object" ? body.accessDecision : {};
  return uniqueStrings([
    requestId,
    body?.transactionId,
    body?.ledgerId,
    body?.purchaseId,
    body?.paymentId,
    body?.merchantUid,
    body?.impUid,
    body?.orderId,
    body?.idempotencyKey,
    body?.requestId,
    accessGrant.evidenceId,
    accessGrant.ledgerId,
    accessGrant.purchaseId,
    accessGrant.paymentId,
    accessGrant.merchantUid,
    accessGrant.requestId,
    accessDecision.evidenceId,
    accessDecision.ledgerId,
    accessDecision.transactionId,
    accessDecision.purchaseId,
    accessDecision.paymentId,
    accessDecision.merchantUid,
    accessDecision.requestId,
    consume.transactionId,
    consume.ledgerId,
    consume.purchaseId,
    consume.receiptId,
    consume.pointHistoryId,
    consume.paymentId,
    consume.merchantUid,
    consume.requestId,
    payment._id,
    payment.id,
    payment.transactionId,
    payment.ledgerId,
    payment.purchaseId,
    payment.paymentId,
    payment.merchantUid,
    payment.impUid,
    payment.requestId,
    paymentContext.transactionId,
    paymentContext.ledgerId,
    paymentContext.purchaseId,
    paymentContext.paymentId,
    paymentContext.merchantUid,
    paymentContext.requestId,
  ]);
}

function buildAIPromptPaymentTokenClauses(tokens) {
  const clauses = [];
  for (const token of tokens) {
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.orderId": token });
    clauses.push({ "metadata.transactionId": token });
    clauses.push({ "metadata.sourceTransactionId": token });
    clauses.push({ "metadata.paymentId": token });
    clauses.push({ impUid: token });
    clauses.push({ merchantUid: token });
    if (mongoose.Types.ObjectId.isValid(token)) {
      clauses.push({ _id: token });
      clauses.push({ paymentId: token });
    }
  }
  return clauses;
}

function isAIPromptPassAccessPayload(body = {}) {
  const accessGrant = body?.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const consume = body?.consume && typeof body.consume === "object" ? body.consume : {};
  const payment = body?.payment && typeof body.payment === "object" ? body.payment : {};
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  const accessDecision = body?.accessDecision && typeof body.accessDecision === "object" ? body.accessDecision : {};
  const accessType = String(
    accessGrant.accessType
      || consume.accessType
      || payment.accessType
      || consume.transactionType
      || paymentContext.accessType
      || accessDecision.accessType
      || accessDecision.transactionType
      || body?.accessType
      || "",
  ).trim().toLowerCase();
  const accessMethod = String(
    accessGrant.accessMethod
      || consume.accessMethod
      || consume.paymentMethod
      || payment.paymentMethod
      || paymentContext.paymentMethod
      || accessDecision.accessMethod
      || accessDecision.paymentMethod
      || accessDecision.accessType
      || paymentContext.accessMethod
      || "",
  ).trim().toUpperCase();
  const accessReason = String(
    accessGrant.reason
      || consume.reason
      || payment.reason
      || accessDecision.reason
      || body?.accessReason
      || body?.reason
      || "",
  ).trim().toLowerCase();
  const accessStatus = String(
    accessDecision.status
      || body?.status
      || "",
  ).trim().toLowerCase();
  const paymentMode = String(
    body?.paymentMode
      || accessGrant.paymentMode
      || consume.paymentMode
      || payment.paymentMode
      || paymentContext.paymentMode
      || accessDecision.paymentMode
      || "",
  ).trim().toLowerCase();

  // 🔴 family 이용권은 accessType "family" / accessMethod "FAMILY" 로 내려온다
  // (worker/payments/compat.js 의 legacyPassCheckEnvelope). 이 두 철자가 빠져 있으면 family 보유자는
  // 이용권 분기를 못 타고 PointHistory·직접결제·월정석까지 전부 미스해 402 가 난다.
  // 증빙 행도 membership_pass 와 같은 계약(delta 0, recordPassAccessIfNeeded)이라 금액 하한 면제도 동일하다.
  return body?.freeBySubscription === true
    || (
      accessDecision.accessGranted === true
      && (
        accessReason === "pass_applied"
        || accessReason === "pass_covered"
        || accessReason === "pass_free"
        || accessType === "membership_pass"
        || accessType === "subscription_pass"
        || accessType === "family"
        || paymentMode === "membership_pass"
        || accessMethod === "PASS"
        || accessMethod === "FAMILY"
      )
    )
    || accessType === "membership_pass"
    || accessType === "pass"
    || accessType === "membership"
    || accessType === "subscription_pass"
    || accessType === "family"
    || paymentMode === "membership_pass"
    || paymentMode === "membership"
    || accessStatus === "pass_applied"
    || accessStatus === "pass_free"
    || accessReason === "pass_applied"
    || accessReason === "pass_covered"
    || accessReason === "pass_free"
    || accessMethod === "PASS"
    || accessMethod === "FAMILY";
}

async function findAIPromptPaymentEvidence({ auth, featureKey, body, requestId, cost }) {
  const userId = String(auth?.userId || "").trim();
  const normalizedFeatureKey = normalizeFeatureKey(featureKey);
  const featureKeys = uniqueStrings([featureKey, normalizedFeatureKey]);
  const tokens = collectAIPromptPaymentTokens(body, requestId);
  const clauses = buildAIPromptPaymentTokenClauses(tokens);
  if (!userId || !featureKeys.length || !clauses.length) return null;

  const query = {
    userId,
    kind: "deduct",
    featureKey: featureKeys.length > 1 ? { $in: featureKeys } : featureKeys[0],
    // 월정석 환불은 kind:"refund" 행을 만들지 않고 원본 차감에 표식만 남기므로, 아래 refund 조회로는
    // 구조적으로 안 걸린다. 형제 findAIPromptMonthlyCreditEvidence 와 같은 목록으로 맞춰 배제한다.
    "metadata.refundedForUnlockFailure": { $ne: true },
    "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
    "metadata.monthlyCreditRefundedForLedgerFailure": { $ne: true },
    "metadata.monthlyCreditRefundedForServiceExecution": { $ne: true },
    $or: clauses,
  };
  const minCost = Math.floor(Number(cost || 0));
  if (minCost > 0 && !isAIPromptPassAccessPayload(body)) query.delta = { $lte: -minCost };

  const deducted = await PointHistory.findOne(query)
    .select("_id delta balanceAfter featureKey reason metadata")
    .sort({ createdAt: -1 })
    .lean();
  if (!deducted) return null;

  // 🔴 환불된 차감은 결제 증거가 아니다. 생성 실패 시 라우트가 자동 환불하는데(handlePigCoinRefund),
  // 그 차감 기록은 그대로 남으므로 이 검사가 없으면 "실패 → 환불받음 → 같은 requestId 로 무료 생성"이
  // 성립한다. 프론트가 결제 증거를 재사용하게 된 뒤로는 이 한 곳이 유일한 안전장치다.
  const refunded = await PointHistory.findOne({
    userId,
    kind: "refund",
    "metadata.refundForPointHistoryId": String(deducted._id),
  }).select("_id").lean();
  if (refunded) return null;

  return deducted;
}

function isAIPromptMonthlyCreditAccessPayload(body = {}) {
  const ctx = readAIPromptAccessContext(body);
  return ctx.accessType === "membership_credit"
    || ctx.accessMethod === "MONTHLY"
    || ctx.paymentMode === "MOONLIGHT_STONE"
    || ctx.paymentMode === "MONTHLY_CREDIT"
    || ctx.paymentMode === "MONTHLY";
}

// 월정석 증빙 정본은 worker/lib/moonstone-spend-proof.js 하나다(미정산 예약행 배제·구 원장 호환 포함).
// 가격 하한만 이 라우트가 계속 자기 책임으로 검사한다 — 정본은 "차감이 있었는가"만 판정한다.
async function findAIPromptMonthlyCreditEvidence({ env, auth, featureKey, body, requestId, cost }) {
  if (!isAIPromptMonthlyCreditAccessPayload(body) && !hasAIPromptMonthlyCreditEvidenceToken(body)) return null;
  const userId = String(auth?.userId || "").trim();
  const normalizedFeatureKey = normalizeFeatureKey(featureKey);
  const featureKeys = uniqueStrings([featureKey, normalizedFeatureKey]);
  const tokens = collectAIPromptPaymentTokens(body, requestId);
  if (!userId || !featureKeys.length || !tokens.length) return null;

  const evidence = await findMoonstoneSpendEvidence(env, { userId, featureKeys, tokens });
  if (!evidence) return null;

  // 🔴 단위 주의: 원장의 amount 는 월정석, 인자 cost 는 코인이다. 하한은 반드시 정본 변환기를 거친다
  // (하드코딩 환산은 틀리는 순간 정상 결제가 402 로 떨어진다). billing 이 원장에 쓰는 amount 도
  // 같은 calculateMembershipCreditCost 결과라 이 하한은 근사치가 아니라 정확히 일치한다.
  const minCredit = isAIPromptPassAccessPayload(body)
    ? 0
    : Math.floor(Number(calculateMembershipCreditCost(cost) || 0));
  if (minCredit > 0 ? !(evidence.amount >= minCredit) : !(evidence.amount > 0)) return null;

  // 호출부(buildAIPromptVerifiedConsumePayload)가 읽는 record 모양으로 맞춘다.
  return {
    _id: evidence.ledgerId,
    amount: evidence.amount,
    afterBalance: evidence.afterBalance,
    serviceKey: evidence.serviceKey,
    sourceId: evidence.sourceId,
  };
}

function readAIPromptAccessContext(body = {}) {
  const accessGrant = body?.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const consume = body?.consume && typeof body.consume === "object" ? body.consume : {};
  const payment = body?.payment && typeof body.payment === "object" ? body.payment : {};
  const paymentContext = body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {};
  const accessType = String(
    body?.accessType
      || accessGrant.accessType
      || consume.accessType
      || consume.transactionType
      || payment.accessType
      || paymentContext.accessType
      || "",
  ).trim().toLowerCase();
  const accessMethod = String(
    body?.accessMethod
      || accessGrant.accessMethod
      || consume.accessMethod
      || consume.paymentMethod
      || payment.accessMethod
      || payment.paymentMethod
      || paymentContext.accessMethod
      || "",
  ).trim().toUpperCase();
  const paymentMode = String(
    body?.paymentMode
      || body?.accessMode
      || accessGrant.paymentMode
      || consume.paymentMode
      || payment.paymentMode
      || paymentContext.paymentMode
      || "",
  ).trim().toUpperCase();

  return { accessGrant, consume, payment, paymentContext, accessType, accessMethod, paymentMode };
}

function hasAIPromptMonthlyCreditEvidenceToken(body = {}) {
  const ctx = readAIPromptAccessContext(body);
  return uniqueStrings([
    body?.ledgerId,
    body?.monthlyCreditLedgerId,
    ctx.accessGrant.ledgerId,
    ctx.accessGrant.monthlyCreditLedgerId,
    ctx.consume.ledgerId,
    ctx.consume.monthlyCreditLedgerId,
    ctx.payment.ledgerId,
    ctx.payment.monthlyCreditLedgerId,
    ctx.paymentContext.ledgerId,
    ctx.paymentContext.monthlyCreditLedgerId,
  ]).length > 0;
}

function isAIPromptDirectAccessPayload(body = {}) {
  const ctx = readAIPromptAccessContext(body);
  return ctx.accessType === "single_purchase"
    || ctx.accessType === "direct_krw"
    || ctx.accessMethod === "CARD"
    || ctx.accessMethod === "DIRECT_KRW"
    || ctx.paymentMode === "DIRECT_KRW"
    || ctx.paymentMode === "SINGLE_PURCHASE";
}

function hasAIPromptDirectPaymentEvidenceToken(body = {}) {
  const ctx = readAIPromptAccessContext(body);
  return uniqueStrings([
    body?.merchantUid,
    body?.merchant_uid,
    body?.impUid,
    body?.imp_uid,
    body?.paymentId,
    ctx.accessGrant.merchantUid,
    ctx.accessGrant.impUid,
    ctx.accessGrant.paymentId,
    ctx.payment.merchantUid,
    ctx.payment.impUid,
    ctx.payment.paymentId,
    ctx.payment._id,
    ctx.payment.id,
    ctx.paymentContext.merchantUid,
    ctx.paymentContext.impUid,
    ctx.paymentContext.paymentId,
  ]).length > 0;
}

function buildAIPromptPaymentClauses(tokens) {
  const clauses = [];
  for (const token of tokens) {
    clauses.push({ merchantUid: token });
    clauses.push({ impUid: token });
    clauses.push({ idempotencyKey: token });
    clauses.push({ requestId: token });
    if (mongoose.Types.ObjectId.isValid(token)) clauses.push({ _id: token });
  }
  return clauses;
}

async function findAIPromptDirectPaymentEvidence({ auth, featureKey, body, requestId, cost }) {
  const userId = String(auth?.userId || "").trim();
  const normalizedFeatureKey = normalizeFeatureKey(featureKey);
  const featureKeys = uniqueStrings([featureKey, normalizedFeatureKey]);
  const tokens = collectAIPromptPaymentTokens(body, requestId);
  const tokenClauses = buildAIPromptPaymentClauses(tokens);
  if (!userId || !featureKeys.length || !tokenClauses.length) return null;

  const query = {
    userId,
    paymentType: "digital_content",
    featureKey: featureKeys.length > 1 ? { $in: featureKeys } : featureKeys[0],
    status: { $in: ["paid", "success", "fulfilled"] },
    $and: [{ $or: tokenClauses }],
  };
  const minCost = Math.floor(Number(cost || 0));
  if (minCost > 0) {
    query.$and.push({
      $or: [
        { expectedChargedPoints: { $gte: minCost } },
        { coinPrice: { $gte: minCost } },
        { paymentAmount: { $gte: minCost * 100 } },
      ],
    });
  }

  return Payment.findOne(query)
    .select("_id impUid merchantUid idempotencyKey paymentAmount expectedChargedPoints chargedPoints featureKey coinPrice accessType requestId status orderState paymentType")
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();
}

async function findAIPromptPaidAccessEvidence({ auth, featureKey, body, requestId, cost, env }) {
  if (env) await connectDb(env);
  if (isAIPromptPassAccessPayload(body)) {
    const userId = String(auth?.userId || "").trim();
    if (!userId) return null;
    const passUser = await User.findById(userId)
      .select("points profileSubscription subscription membership pass entitlement plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
      .lean();
    const passEntitlement = normalizeHoneyPassEntitlement(passUser || {});
    // 🔴 이 경로는 코인게이트를 거치지 않는 자체 증빙 제출이라, canUseByPass(건당 상한)만 보면
    // 상담 포함횟수(family 10회·vvip 3회)와 월 누적 한도를 우회할 수 있다 — 두 검사를 여기서도
    // 나란히 돌린다(worker/lib/nakshatra-paid-access.js 의 같은 패턴 참고). 판정을 못 내리면
    // (만료일 없음 등) applies=false 로 열어 둔다 — 셀 수 없는 상태에서 막지 않는다.
    const canonicalEntitlement = resolveCanonicalEntitlement(passUser || {});
    const premiumQuota = resolvePremiumQuota(passUser?.profileSubscription || {}, canonicalEntitlement, cost);
    const monthlyQuota = resolveMonthlySpendQuota(passUser?.profileSubscription || {}, canonicalEntitlement, cost);
    // premiumQuota.eligible 인 건은 canUseByPass(건당 상한)를 통과 못해도 커버 대상이다 — VVIP는
    // 건당 상한(10,000원)이 상담 포함횟수 기준가(300코인=30,000원)보다 낮다. cycleKey를 못 구해도
    // (만료일 없음) 열어 둬야 하므로 applies가 아니라 eligible을 쓴다(profile-limits.js 참고).
    if ((canUseByPass(passEntitlement, cost) || premiumQuota.eligible) && !(premiumQuota.applies && premiumQuota.exhausted) && !(monthlyQuota.applies && monthlyQuota.exceeded)) {
      return {
        source: "pass_payload",
        record: {
          _id: requestId || `pass:${userId}:${String(featureKey || "").trim()}`,
          balanceAfter: Number(passUser?.points || 0),
          featureKey,
          metadata: {
            requestId,
            accessMethod: "PASS",
            paymentMode: "MEMBERSHIP_PASS",
            passTier: passEntitlement.tier || "",
          },
        },
      };
    }
  }

  const pointHistory = await findAIPromptPaymentEvidence({ auth, featureKey, body, requestId, cost });
  if (pointHistory) return { source: "point_history", record: pointHistory };

  if (isAIPromptDirectAccessPayload(body) || hasAIPromptDirectPaymentEvidenceToken(body)) {
    const payment = await findAIPromptDirectPaymentEvidence({ auth, featureKey, body, requestId, cost });
    if (payment) return { source: "payment", record: payment };
  }

  const monthlyCredit = await findAIPromptMonthlyCreditEvidence({ env, auth, featureKey, body, requestId, cost });
  if (monthlyCredit) return { source: "monthly_credit_ledger", record: monthlyCredit };

  return null;
}

function buildAIPromptVerifiedConsumePayload({ auth, featureKey, reason, requestId, cost, body, evidence, subscriptionUser }) {
  const ctx = readAIPromptAccessContext(body);
  const record = evidence?.record || {};
  const metadata = record?.metadata && typeof record.metadata === "object" ? record.metadata : {};
  const isPass = isAIPromptPassAccessPayload(body);
  const isDirect = evidence?.source === "payment" || isAIPromptDirectAccessPayload(body);
  const isMonthlyCredit = evidence?.source === "monthly_credit_ledger";
  const accessType = isPass
    ? (ctx.accessType || "membership_pass")
    : (ctx.accessType || (isDirect ? "single_purchase" : "membership_credit"));
  const accessMethod = ctx.accessMethod || (isPass ? "PASS" : (isDirect ? "CARD" : "MONTHLY"));
  const paymentMode = ctx.paymentMode || (isPass ? "MEMBERSHIP_PASS" : (isDirect ? "DIRECT_KRW" : "MOONLIGHT_STONE"));
  const chargedCoins = (isPass || isMonthlyCredit)
    ? 0
    : Math.max(0, Math.floor(Number(
      ctx.consume.chargedCoins
        || metadata.coinPrice
        || record.coinPrice
        || record.expectedChargedPoints
        || Math.abs(Number(record.delta || 0))
        || cost
        || 0,
    )));
  const membershipCreditCost = String(accessType || "").toLowerCase() === "membership_credit"
    ? Math.max(0, Math.floor(Number(ctx.consume.membershipCreditCost || metadata.membershipCreditCost || metadata.requiredMonthlyCredits || record.amount || 0)))
    : 0;
  const transactionId = String(
    metadata.pointHistoryId
      || record._id
      || ctx.consume.transactionId
      || ctx.accessGrant.evidenceId
      || ctx.accessGrant.purchaseId
      || ctx.payment._id
      || ctx.payment.id
      || ctx.payment.paymentId
      || ctx.payment.merchantUid
      || requestId
      || "",
  ).trim();
  const balanceAfterRaw = Number(isMonthlyCredit ? subscriptionUser?.points : (record.balanceAfter ?? subscriptionUser?.points));
  const balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : 0;
  const monthlyCreditsRaw = Number(ctx.consume.remainingMembershipCredit ?? ctx.consume.monthlyStoneBalance ?? metadata.remainingMembershipCredit ?? metadata.monthlyStoneBalance ?? record.afterBalance ?? subscriptionUser?.profileSubscription?.membershipCreditBalance);
  const monthlyCredits = Number.isFinite(monthlyCreditsRaw) ? Math.max(0, Math.floor(monthlyCreditsRaw)) : 0;
  const unlockedFeatures = normalizePersistentUnlockKeys(subscriptionUser?.unlockedFeatures);

  return {
    message: "Paid access already verified.",
    code: "ALREADY_VERIFIED_PAID_ACCESS",
    featureKey,
    reason,
    requiredCoins: cost,
    chargedCoins,
    membershipCreditCost,
    accessType,
    accessMethod,
    paymentMode,
    forceDeductApplied: false,
    transactionId,
    consume: {
      ok: true,
      transactionId,
      transactionType: accessType,
      accessType,
      accessMethod,
      paymentMethod: accessMethod,
      paymentMode,
      requestId,
      featureKey,
      coinPrice: cost,
      chargedCoins,
      membershipCreditCost,
      requiredMonthlyCredits: membershipCreditCost,
      remainingMembershipCredit: monthlyCredits,
      monthlyStoneBalance: monthlyCredits,
      monthlyCredits,
      idempotent: true,
    },
    user: userPayload(auth, balanceAfter, unlockedFeatures),
    unlockedFeatures,
    unlockMap: toUnlockMap(unlockedFeatures),
  };
}

function buildReasonPricingMap(pricingEntries) {
  const table = Object.create(null);

  for (let i = 0; i < pricingEntries.length; i += 1) {
    const item = pricingEntries[i] || null;
    const reason = String(item?.reason || "").trim();
    const cost = Number(item?.cost);
    if (!reason || !Number.isFinite(cost) || cost <= 0) continue;

    // Keep the first mapping for stable behavior when legacy keys share the same reason.
    if (!table[reason]) table[reason] = { ...item, reason, cost };
  }

  return Object.freeze(table);
}

const FEATURE_REASON_PRICING_MAP = buildReasonPricingMap(
  Object.entries(FEATURE_KEY_PRICE_TABLE).map(([mappedFeatureKey, spec]) => ({
    featureKey: mappedFeatureKey,
    reason: spec?.reason,
    cost: spec?.cost,
  })),
);

const UNLOCK_REASON_PRICING_MAP = buildReasonPricingMap(
  Object.values(UNLOCK_PRODUCT_BY_FEATURE_KEY).map((spec) => ({
    featureKey: spec?.featureKey,
    reason: spec?.reason,
    cost: spec?.cost,
  })),
);

function resolveServerCoinPricing({ env, productSpec, requestedCost, featureKey, reason }) {
  const requestedFeatureKeyRaw = String(featureKey || "").trim();

  if (productSpec) {
    return {
      ok: true,
      cost: Number(productSpec.cost),
      reason: String(productSpec.reason || reason || "Paid feature unlock"),
      featureKey: normalizeFeatureKey(productSpec.featureKey || featureKey),
      pricingSource: "product-id",
    };
  }

  const key = normalizeFeatureKey(featureKey);
  const reasonText = String(reason || "").trim();
  const requestCost = Number(requestedCost);

  if (key === "coin-gate-per-use") {
    const serverCost = Number(COIN_GATE_PER_USE_REASON_COSTS[reasonText]);
    if (Number.isFinite(serverCost) && serverCost > 0) {
      return {
        ok: true,
        cost: serverCost,
        reason: reasonText,
        featureKey: "coin-gate-per-use",
        pricingSource: "coin-gate-reason",
      };
    }

    const featureReasonPricing = FEATURE_REASON_PRICING_MAP[reasonText] || null;
    if (featureReasonPricing) {
      return {
        ok: true,
        cost: Number(featureReasonPricing.cost),
        reason: String(featureReasonPricing.reason || reasonText),
        featureKey: String(featureReasonPricing.featureKey || key),
        pricingSource: "feature-reason-fallback",
      };
    }

    const unlockReasonPricing = UNLOCK_REASON_PRICING_MAP[reasonText] || null;
    if (unlockReasonPricing) {
      return {
        ok: true,
        cost: Number(unlockReasonPricing.cost),
        reason: String(unlockReasonPricing.reason || reasonText),
        featureKey: String(unlockReasonPricing.featureKey || key),
        pricingSource: "unlock-reason-fallback",
      };
    }

    const inferredFeatureKey = inferFeatureKeyFromReason(reasonText, key);
    if (inferredFeatureKey && inferredFeatureKey !== key) {
      return resolveServerCoinPricing({
        env,
        productSpec,
        requestedCost,
        featureKey: inferredFeatureKey,
        reason: reasonText,
      });
    }

    if (isDynamicCostFallbackEnabled(env) && Number.isFinite(requestCost) && requestCost > 0) {
      return {
        ok: true,
        cost: requestCost,
        reason: reasonText || "Single payment per-use",
        featureKey: key,
        pricingSource: "dynamic-fallback",
      };
    }

    return {
      ok: false,
      status: 403,
      code: "SERVER_PRICE_REQUIRED",
      message: "coin-gate-per-use 기능의 서버 가격표가 누락되었습니다.",
    };
  }

  const featureReasonCost = resolveFeatureReasonCost(key, reasonText);
  if (Number.isFinite(featureReasonCost) && featureReasonCost > 0) {
    return {
      ok: true,
      cost: featureReasonCost,
      reason: reasonText,
      featureKey: requestedFeatureKeyRaw || key,
      pricingSource: "feature-reason",
    };
  }

  const featurePrice = FEATURE_KEY_PRICE_TABLE[key] || null;
  if (featurePrice) {
    return {
      ok: true,
      cost: Number(featurePrice.cost),
      reason: String(featurePrice.reason || reasonText || "Paid feature unlock"),
      featureKey: requestedFeatureKeyRaw || key,
      pricingSource: "feature-key",
    };
  }

  const unlockSpec = UNLOCK_PRODUCT_BY_FEATURE_KEY[key] || null;
  if (unlockSpec) {
    return {
      ok: true,
      cost: Number(unlockSpec.cost),
      reason: String(unlockSpec.reason || reasonText || "Paid feature unlock"),
      featureKey: requestedFeatureKeyRaw || key,
      pricingSource: "unlock-feature",
    };
  }

  if (reasonText) {
    const coinGateReasonCost = Number(COIN_GATE_PER_USE_REASON_COSTS[reasonText]);
    if (Number.isFinite(coinGateReasonCost) && coinGateReasonCost > 0) {
      return {
        ok: true,
        cost: coinGateReasonCost,
        reason: reasonText,
        featureKey: "coin-gate-per-use",
        pricingSource: "coin-gate-reason-fallback",
      };
    }

    const featureReasonPricing = FEATURE_REASON_PRICING_MAP[reasonText] || null;
    if (featureReasonPricing) {
      return {
        ok: true,
        cost: Number(featureReasonPricing.cost),
        reason: reasonText,
        featureKey: String(featureReasonPricing.featureKey || key),
        pricingSource: "feature-reason-fallback",
      };
    }

    const unlockReasonPricing = UNLOCK_REASON_PRICING_MAP[reasonText] || null;
    if (unlockReasonPricing) {
      return {
        ok: true,
        cost: Number(unlockReasonPricing.cost),
        reason: reasonText,
        featureKey: String(unlockReasonPricing.featureKey || key),
        pricingSource: "unlock-reason-fallback",
      };
    }

    const inferredFeatureKey = inferFeatureKeyFromReason(reasonText, key);
    if (inferredFeatureKey && inferredFeatureKey !== key) {
      return resolveServerCoinPricing({
        env,
        productSpec,
        requestedCost,
        featureKey: inferredFeatureKey,
        reason: reasonText,
      });
    }
  }

  if (isDynamicCostFallbackEnabled(env) && Number.isFinite(requestCost) && requestCost > 0) {
    return {
      ok: true,
      cost: requestCost,
      reason: reasonText || "Paid feature unlock",
      featureKey: requestedFeatureKeyRaw || key,
      pricingSource: "dynamic-fallback",
    };
  }

  return {
    ok: false,
    status: 400,
    code: "UNKNOWN_FEATURE_KEY",
    message: "결제 상품 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    availableFeatureKeys: listServerPricedFeatureKeys(),
  };
}

function inferFeatureKeyFromReason(reason, fallbackFeatureKey = "") {
  const reasonText = String(reason || "").trim();
  const fallbackKey = normalizeFeatureKey(fallbackFeatureKey);
  if (!reasonText) return fallbackKey;

  const actionToken = reasonText.split(/\s+/)[0] || "";
  const candidates = [actionToken, reasonText];

  for (let i = 0; i < candidates.length; i += 1) {
    const normalized = normalizeFeatureKey(candidates[i]);
    if (normalized && normalized !== "pig-coin-unlock" && normalized !== "coin-gate-per-use") {
      return normalized;
    }
  }

  return fallbackKey;
}

function resolveUnlockProductSpec(productId) {
  const id = String(productId || "").trim().toLowerCase();
  if (!id) return null;
  return PIG_COIN_UNLOCK_PRODUCTS[id] || null;
}

const PROFILE_SUB_PLANS = {
  standard: { name: "스탠다드", coins: 115, profileLimit: 3, durationDays: 30, lowWarnAt: 30 },
  premium: { name: "프리미엄", coins: 360, profileLimit: 7, durationDays: 30, lowWarnAt: 50 },
  vvip: { name: "VVIP", coins: 700, profileLimit: 15, durationDays: 30, lowWarnAt: 100 },
  family: { name: "Code Destiny Family", coins: 3000, profileLimit: 0, durationDays: 30, lowWarnAt: 300, freeLimit: 999999999 },
};

const VALID_SUB_TIERS = new Set(["standard", "premium", "vvip", "family"]);
const SUBSCRIPTION_TIER_RANK = Object.freeze({
  free: 0,
  standard: 1,
  premium: 2,
  vvip: 3,
  family: 4,
});

function getSubscriptionTierRank(tierRaw) {
  const tier = String(tierRaw || "free").trim().toLowerCase();
  return Number(SUBSCRIPTION_TIER_RANK[tier] || 0);
}

const SHARE_REWARD_AMOUNT = 10;
const SHARE_REWARD_DAILY_LIMIT = 3;
const PERSISTENT_UNLOCK_ALIAS_MAP = Object.freeze({
  "olympus-profile-fc": ["olympus-fc"],
  "olympus-fc": ["olympus-profile-fc"],
  "flower-fc": ["flower-destiny", "flower-astro", "flower-ziwei", "flower-sukuyo"],
  "flower-destiny": ["flower-fc"],
  "flower-astro": ["flower-fc"],
  "flower-ziwei": ["flower-fc"],
  "flower-sukuyo": ["flower-fc"],
  "premium-fpti-report": ["premium_fpti_report", "generateFptiDeepReport", "openFptiDeepReport"],
  premium_fpti_report: ["premium-fpti-report", "generateFptiDeepReport", "openFptiDeepReport"],
  generateFptiDeepReport: ["premium-fpti-report", "premium_fpti_report", "openFptiDeepReport"],
  openFptiDeepReport: ["premium-fpti-report", "premium_fpti_report", "generateFptiDeepReport"],
  allPaidSaju: [
    "rpgCharacter",
    "travelDestiny",
    "healthReport",
    "secretHouseEpisodes",
    "rpt_skillTreeCard",
    "rpt_energyCoordCard",
    "rpt_healthReportCard",
    "rpt_secretHouseEntryCard",
  ],
  rpgCharacter: ["rpt_skillTreeCard"],
  travelDestiny: ["rpt_energyCoordCard"],
  healthReport: ["rpt_healthReportCard"],
  secretHouseEpisodes: ["rpt_secretHouseEntryCard"],
});
const PERSISTENT_UNLOCK_KEY_SET = new Set([
  "flower-fc",
  "flower-destiny",
  "flower-astro",
  "flower-ziwei",
  "flower-sukuyo",
  "olympus-fc",
  "olympus-profile-fc",
  "section_daewun",
  "section_summary",
  "section_compat",
  "allPaidSaju",
  "rpgCharacter",
  "travelDestiny",
  "healthReport",
  "secretHouseEpisodes",
  "animal-destiny-unlock",
  "loveSimulation",
  "sukuyo-relationship-encyclopedia",
  "sukuyo-nature-deep-dive",
  "premiumDivinationPack",
  "rpt_specialCharmCard",
  "rpt_quantumCard",
  "rpt_healthReportCard",
  "rpt_skillTreeCard",
  "rpt_energyCoordCard",
  "rpt_villainCard",
  "rpt_secretHouseEntryCard",
  "fun.quantumLotto.ritualReport",
  "premium-ziwei",
  "premium-astrology",
  "premium-sukuyo",
  "premium-veda",
  "premium-naming",
  "premium-sibyl-dominator",
  "premium-fpti-report",
  "premium_fpti_report",
  "generateFptiDeepReport",
  "openFptiDeepReport",
]);

function isPersistentUnlockFeatureKey(rawKey) {
  const base = String(rawKey || "").trim();
  if (!base) return false;
  if (base === "pig-coin-unlock" || base === "coin-gate-per-use") return false;
  if (PERSISTENT_UNLOCK_KEY_SET.has(base)) return true;
  if (base.startsWith("section_")) return true;
  if (base.startsWith("flower-") || base.startsWith("olympus-")) return true;
  return false;
}

function resolvePersistentUnlockAliasKeys(rawKey) {
  const base = String(rawKey || "").trim();
  if (!base) return [];
  const map = Object.create(null);
  map[base] = true;
  const aliases = PERSISTENT_UNLOCK_ALIAS_MAP[base] || [];
  for (let i = 0; i < aliases.length; i += 1) {
    map[aliases[i]] = true;
  }
  return Object.keys(map);
}

function resolvePersistentUnlockKeys(rawKey) {
  if (!isPersistentUnlockFeatureKey(rawKey)) return [];
  const aliases = resolvePersistentUnlockAliasKeys(rawKey);
  const map = Object.create(null);
  for (let i = 0; i < aliases.length; i += 1) {
    if (isPersistentUnlockFeatureKey(aliases[i])) {
      map[aliases[i]] = true;
    }
  }
  return Object.keys(map);
}

function normalizePersistentUnlockKeys(values) {
  if (!Array.isArray(values)) return [];
  const map = Object.create(null);
  for (let i = 0; i < values.length; i += 1) {
    const aliases = resolvePersistentUnlockKeys(values[i]);
    for (let j = 0; j < aliases.length; j += 1) {
      map[aliases[j]] = true;
    }
  }
  return Object.keys(map);
}

function sanitizeProfileBindingId(value) {
  return String(value || "").trim().slice(0, 80).replace(/\s+/g, "_");
}

function toUnlockMap(unlockedFeatures) {
  const map = Object.create(null);
  const keys = normalizePersistentUnlockKeys(unlockedFeatures);
  for (let i = 0; i < keys.length; i += 1) {
    map[keys[i]] = true;
  }
  return map;
}

function normalizeStringArray(values, maxLength = 200) {
  if (!Array.isArray(values)) return [];
  const out = [];
  for (let i = 0; i < values.length; i += 1) {
    const value = String(values[i] || "").trim();
    if (!value) continue;
    out.push(value);
    if (out.length >= maxLength) break;
  }
  return out;
}

function isRepairableConsumeArrayShapeError(error) {
  const message = String(error?.message || "");
  if (!message) return false;
  const hasArrayOp = /\$push|\$addToSet|must be an array|non-array field/i.test(message);
  if (!hasArrayOp) return false;
  return /recentConsumeRequestIds|unlockedFeatures/i.test(message);
}

async function resolvePersistedUnlockFeatures(userId, currentUnlocks, profileId = "", env = {}) {
  const scopedProfileId = sanitizeProfileBindingId(profileId);
  if (userId && scopedProfileId) {
    // KRW 단건결제 해금은 PointHistory deduct 기록 없이 ContentEntitlement에만 남으므로 병합한다.
    // (일시적 Mongo 오류는 여기서 삼키지 않는다 — 호출부의 degraded 폴백이 처리하도록 그대로 전파한다.)
    /* 두 조회는 서로 의존하지 않는다(둘 다 userId·scopedProfileId 만 쓴다). 같은 admission 슬롯 안에서
       병렬로 내 왕복 1회와 슬롯 1개를 줄인다 — 이 경로는 페이지 진입마다 불리는 /api/fortune/balance 다. */
    const [scopedKeys, snapshot] = await withMongoRetry(env, () => Promise.all([
      PointHistory.distinct("featureKey", {
        userId,
        kind: "deduct",
        featureKey: { $in: Array.from(PERSISTENT_UNLOCK_KEY_SET) },
        $or: [
          { "metadata.profileId": scopedProfileId },
          { "metadata.selectedProfileId": scopedProfileId },
        ],
      }),
      getUnlockedContentSnapshot({ userId, profileId: scopedProfileId }),
    ]));
    const entitlementKeys = (snapshot.featureKeys || []).filter((key) => isPersistentUnlockFeatureKey(key));
    return normalizePersistentUnlockKeys([...scopedKeys, ...entitlementKeys]);
  }

  const fromUser = normalizePersistentUnlockKeys(currentUnlocks);
  if (fromUser.length || !userId) return fromUser;

  const historyKeys = await withMongoRetry(env, () => PointHistory.distinct("featureKey", {
    userId,
    kind: "deduct",
    featureKey: { $in: Array.from(PERSISTENT_UNLOCK_KEY_SET) },
  }));
  const inferred = normalizePersistentUnlockKeys(historyKeys);
  if (inferred.length) {
    await User.updateOne(
      { _id: userId },
      { $addToSet: { unlockedFeatures: { $each: inferred } } },
    ).catch(() => {});
  }
  return inferred;
}

async function resolvePigCoinConsumeAuth(request, env) {
  let auth = null;
  try {
    auth = await requireUserFromRequest(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      auth = null;
    } else {
      throw error;
    }
  }

  if (!auth) {
    throw createHttpError(401, "Authentication is required.", { code: "UNAUTHORIZED" });
  }

  return {
    auth,
    adminMode: Boolean(isAdminPigCoinBypassEnabled(env) && String(auth?.role || "").toLowerCase() === "admin"),
  };
}

function userPayload(auth, points, unlockedFeatures) {
  const payload = {
    id: auth?.userId ? String(auth.userId) : "",
  };
  if (points !== undefined && points !== null) payload.points = Number(points || 0);
  const normalizedUnlocks = normalizePersistentUnlockKeys(unlockedFeatures);
  if (normalizedUnlocks.length) payload.unlockedFeatures = normalizedUnlocks;
  return payload;
}

function normalizeSubscriptionTier(value) {
  const tier = String(value || "").trim().toLowerCase();
  return VALID_SUB_TIERS.has(tier) ? tier : null;
}

function getPlanPolicy(tier) {
  const plan = PROFILE_SUB_PLANS[tier] || null;
  if (!plan) {
    return {
      tier: "free",
      freeLimit: 0,
      profileLimit: 1,
      recommendedCoins: 0,
    };
  }

  return {
    tier,
    freeLimit: Number(plan.freeLimit ?? plan.lowWarnAt ?? 0),
    profileLimit: Number.isFinite(Number(plan.profileLimit)) ? Math.max(0, Math.floor(Number(plan.profileLimit))) : 1,
    recommendedCoins: Number(plan.coins || 0),
  };
}

function resolveEffectiveActiveTier(user) {
  const tier = normalizeSubscriptionTier(user?.profileSubscription?.tier);
  if (!tier) return null;

  const expAtRaw = user?.profileSubscription?.expiresAt;
  if (!expAtRaw) return null;

  const expAt = new Date(expAtRaw);
  if (!Number.isFinite(expAt.getTime())) return null;

  return expAt.getTime() > Date.now() ? tier : null;
}

async function handleCheck() {
  return json({
    message: "Fortune reading is currently free.",
    requiredPoints: 0,
    currentPoints: null,
    isFree: true,
  });
}

async function handleConsume(auth) {
  return json({
    message: "Fortune reading is currently free. No coins were deducted.",
    requiredPoints: 0,
    isFree: true,
    user: userPayload(auth),
  });
}

const BALANCE_ROUTE_USER_PROJECTION = {
  _id: 1,
  points: 1,
  unlockedFeatures: 1,
  destinyProfilesCurrentId: 1,
};

// AI 프롬프트 라우트가 인증 조회에 넘기는 확장 필드. handlePigCoinConsume 의 subscriptionUser 가
// 읽는 것과 정확히 같다 — 인증 왕복 하나에 얹어 오면 라우트당 users 재조회 1회가 사라진다.
// (정답 패턴: worker/routes/sukuyo.js 의 SUKUYO_YEARLY_USER_PROJECTION)
const AI_PROMPT_CONSUME_USER_PROJECTION = {
  profileSubscription: 1,
  unlockedFeatures: 1,
};

// 인증 조회에 BALANCE_ROUTE_USER_PROJECTION 을 주면 이 문서가 그때 함께 읽혀 온다 —
// 페이지 로드마다 불리는 엔드포인트라 users 2회가 1회로 줄어드는 효과가 크다.
// authUserDoc 이 붙지 않는 경로(리프레시 토큰 등)에서는 종전대로 직접 읽는다.
async function handleBalance(auth, env) {
  const user = auth.authUserDoc || await findUserByIdRaw(auth.userId, BALANCE_ROUTE_USER_PROJECTION);
  if (!user) {
    return json({
      ok: true,
      authenticated: true,
      balance: 0,
      walletCreated: false,
      message: "Payment value initialized with safe default.",
      user: userPayload(auth, 0, []),
      // 인증은 됐는데 사용자 문서를 못 읽은 상태다 — 빈 목록을 소유 판정 근거로 쓰면 안 된다.
      unlocksAuthority: "none",
      unlockedFeatures: [],
      unlockMap: {},
    });
  }

  // 일시적 Mongo 오류를 여기서 "미구매(빈 배열)"로 삼키면 정상 200 응답이 되어 클라이언트가
  // 이미 결제한 콘텐츠를 잠긴 것으로 오인한다. 에러는 그대로 던져 호출부의 degraded 폴백
  // (buildDbFallbackBalance)이 처리하게 한다.
  const unlockedFeatures = await resolvePersistedUnlockFeatures(auth.userId, user.unlockedFeatures, user.destinyProfilesCurrentId, env);
  const points = Number(user.points || 0);

  return json({
    ok: true,
    authenticated: true,
    balance: points,
    walletCreated: true,
    message: "Payment value loaded.",
    user: userPayload(auth, points, unlockedFeatures),
    unlockedFeatures,
    unlockMap: toUnlockMap(unlockedFeatures),
  });
}

function buildDbFallbackBalance(auth, error) {
  const points = Number.isFinite(Number(auth?.points)) ? Number(auth.points) : 0;
  return json({
    ok: true,
    authenticated: true,
    degraded: true,
    source: "auth_snapshot",
    balance: points,
    walletCreated: false,
    code: "DB_FALLBACK",
    message: "결제 서버가 일시적으로 불안정하여 보조 정보로 표시합니다.",
    // 원본 드라이버 메시지(debugMessage / errorDetails.message)는 싣지 않는다 — Atlas 타임아웃 문구에는
    // 샤드 호스트명·IP 가 들어 있고, 이 응답은 200 이라 클라이언트가 읽지도 않는 순수 유출이었다
    // (billing-client 는 !ok 일 때 payload.error.debugMessage 만 본다). 원문은 서버 로그에 남는다.
    errorDetails: {
      stage: "fortune-db-fallback-balance",
      name: error?.name || "Error",
      code: error?.code || "DB_FALLBACK",
    },
    user: userPayload(auth, points, []),
    /* 🔴 아래 빈 목록은 "아무것도 안 샀다"가 아니라 "지금은 모른다"이다. 이 봉투는 200 이라
       클라이언트가 그대로 소유 판정에 쓰면 이미 산 콘텐츠에 결제창을 다시 띄운다.
       이 표식을 보는 쪽은 빈 목록을 근거로 잠금을 그리지 않는다(js/core/access-store.js). */
    unlocksAuthority: "none",
    unlockedFeatures: [],
    unlockMap: {},
  });
}

function handleGuestBalance() {
  return json({
    ok: false,
    authenticated: false,
    code: "AUTH_REQUIRED",
    message: "로그인이 필요합니다.",
  }, { status: 401 });
}

async function handleChargeSimulate(request, env, auth) {
  return json({
    ok: false,
    message: "선불형 잔액 상품은 더 이상 판매하지 않습니다. 상품별 원화 단건 결제를 이용해 주세요.",
    code: "POINT_CHARGE_DISABLED",
  }, { status: 410 });

  if (String(env.PIG_COIN_PAYMENT_API_READY || "") !== "true") {
    return json({
      message: "Prepaid balance simulation is disabled because the payment API is not ready.",
      code: "PIG_COIN_CHARGE_DISABLED",
    }, { status: 503 });
  }

  const body = await readJson(request);
  const packageId = String(body?.packageId || "").trim();
  const pkg = PIG_COIN_PACKAGES[packageId];
  if (!pkg) return json({ message: "Unsupported charge package." }, { status: 400 });

  const delta = Number(pkg.coins || 0) + Number(pkg.bonus || 0);
  if (!Number.isFinite(delta) || delta <= 0) {
    return json({ message: "Invalid charge amount." }, { status: 400 });
  }

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    { $inc: { points: delta } },
    { returnDocument: "after", projection: { points: 1 } },
  ).lean();

  if (!updatedUser) return json({ message: "User not found." }, { status: 404 });

  await PointHistory.create({
    userId: auth.userId,
    kind: "charge",
    delta,
    balanceAfter: Number(updatedUser.points || 0),
    reason: "Prepaid balance simulation",
    featureKey: "pig-coin-charge",
    metadata: {
      source: "fortune.pig-coin.charge-simulate",
      packageId,
      packageName: pkg.name,
      baseCoins: Number(pkg.coins || 0),
      bonusCoins: Number(pkg.bonus || 0),
    },
  });

  return json({
    message: `${delta.toLocaleString("ko-KR")} coins charged.`,
    package: {
      id: packageId,
      name: pkg.name,
      coins: Number(pkg.coins || 0),
      bonus: Number(pkg.bonus || 0),
    },
    user: userPayload(auth, updatedUser.points),
  });
}

function isTransactionUnsupported(error) {
  return /Transaction numbers are only allowed|replica set|Transaction .* not supported/i
    .test(String(error?.message || ""));
}

async function handlePigCoinConsume(request, auth, options = {}) {
  const env = options?.env || {};
  const body = await readJson(request);
  const productId = String(body?.productId || options?.productId || "").trim().toLowerCase();
  const productSpec = productId ? resolveUnlockProductSpec(productId) : null;
  if (productId && !productSpec) {
    return json({
      message: "Unsupported unlock product.",
      code: "INVALID_PRODUCT",
      productId,
    }, { status: 400 });
  }

  const requestedFeatureKey = String(productSpec?.featureKey || body?.featureKey || "pig-coin-unlock").trim().slice(0, 60);
  let featureKey = normalizeFeatureKey(requestedFeatureKey).slice(0, 60);
  const requestReason = String(productSpec?.reason || body?.reason || "Paid feature unlock").trim().slice(0, 120);
  if (!featureKey || featureKey === "pig-coin-unlock") {
    featureKey = inferFeatureKeyFromReason(requestReason, featureKey).slice(0, 60);
  }
  const requestedCost = Number(productSpec ? productSpec.cost : body?.cost);
  const pricing = resolveServerCoinPricingFromGuard({
    env,
    productSpec,
    requestedCost,
    featureKey,
    reason: requestReason,
  });

  if (!pricing.ok) {
    if (pricing.code === "UNKNOWN_FEATURE_KEY") {
      try {
        console.error("[fortune][pricing][unknown-feature]", JSON.stringify({
          featureKey,
          requestedFeatureKey: requestedFeatureKey !== featureKey ? requestedFeatureKey : undefined,
          requestReason,
          productId: productId || null,
          route: "/api/fortune/pig-coin/consume",
        }));
      } catch (e) {
        console.error("[fortune][pricing][unknown-feature]", {
          featureKey,
          requestedFeatureKey: requestedFeatureKey !== featureKey ? requestedFeatureKey : undefined,
          requestReason,
          productId: productId || null,
        });
      }
    }

    const payload = {
      message: pricing.message || "서버 가격 검증에 실패했습니다.",
      code: pricing.code || "SERVER_PRICE_REQUIRED",
      productId: productId || null,
      featureKey,
      requestedFeatureKey: requestedFeatureKey !== featureKey ? requestedFeatureKey : undefined,
    };

    if (!isProductionRuntime(env) && pricing.code === "UNKNOWN_FEATURE_KEY") {
      payload.availableFeatureKeys = Array.isArray(pricing.availableFeatureKeys) ? pricing.availableFeatureKeys : [];
      payload.requestReason = requestReason;
    }

    return json({
      ...payload,
    }, { status: Number(pricing.status || 403) });
  }

  const pricingFeatureKey = normalizeFeatureKey(pricing.featureKey || featureKey).slice(0, 60);
  if (pricingFeatureKey) featureKey = pricingFeatureKey;

  const cost = Number.isFinite(Number(pricing.cost)) && Number(pricing.cost) > 0
    ? Math.floor(Number(pricing.cost))
    : PIG_COIN_DEFAULT_UNLOCK_COST;

  if (cost <= 0 || cost > PIG_COIN_MAX_COST) {
    return json({ message: "Invalid payment value amount.", code: "INVALID_REQUEST" }, { status: 400 });
  }

  const reason = String(pricing.reason || requestReason || "Paid feature unlock").trim().slice(0, 120);
  const reportTypeForPremiumAccess = resolvePremiumAccessReportType(featureKey, reason);
  const categoryKey = String(body?.categoryKey || "").trim().slice(0, 60);
  const subFeatureKey = String(body?.subFeatureKey || "").trim().slice(0, 60);
  const payloadHash = String(body?.payloadHash || "").trim().slice(0, 120);
  const requestId = String(
    body?.requestId
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key")
      || "",
  ).trim().slice(0, 120);
  const forceDeduct = body?.forceDeduct === true || String(body?.forceDeduct || "").trim().toLowerCase() === "true";
  const requireExistingPaidAccess = body?.requireExistingPaidAccess === true
    || String(body?.requireExistingPaidAccess || "").trim().toLowerCase() === "true";
  // AI 프롬프트 라우트 6곳은 인증 조회에 AI_PROMPT_CONSUME_USER_PROJECTION 을 넘겨 같은 문서를 이미
  // 읽어 왔다(내부 위임에도 같은 auth 객체가 그대로 전달된다) — 있으면 재조회하지 않는다.
  // 🔴 인증 문서에는 identity 필드(points 등)가 함께 들어 있으므로, 이 함수가 보던 두 필드만 추려
  // 넘긴다. 그대로 쓰면 balanceAfter 계산이 조용히 바뀐다(지금까지 points 는 미조회라 0이었다).
  const subscriptionUser = auth.authUserDoc
    ? {
      _id: auth.authUserDoc._id,
      profileSubscription: auth.authUserDoc.profileSubscription,
      unlockedFeatures: auth.authUserDoc.unlockedFeatures,
    }
    : await User.findById(auth.userId)
      .select("profileSubscription unlockedFeatures")
      .lean();
  if (!subscriptionUser) {
    return json({ message: "User not found.", code: "USER_NOT_FOUND" }, { status: 404 });
  }
  if (requireExistingPaidAccess) {
    const verifiedAccess = await findAIPromptPaidAccessEvidence({
      auth,
      featureKey,
      body,
      requestId,
      cost,
    });
    if (verifiedAccess) {
      return json(buildAIPromptVerifiedConsumePayload({
        auth,
        featureKey,
        reason,
        requestId,
        cost,
        body,
        evidence: verifiedAccess,
        subscriptionUser,
      }));
    }

    const krwEquivalent = cost * 100;
    return json({
      ok: false,
      message: "결제 확인 후 프롬프트를 생성할 수 있습니다.",
      code: "PAYMENT_REQUIRED",
      featureKey,
      reason,
      pricing: {
        featureKey,
        reason,
        coinPrice: cost,
        membershipCreditCost: 0,
        krwEquivalent,
        displayUnit: "content_value",
      },
    }, { status: 402 });
  }
  const activeTierForPass = resolveEffectiveActiveTier(subscriptionUser);
  const activePolicyForPass = getPlanPolicy(activeTierForPass);
  if (activeTierForPass && cost <= activePolicyForPass.freeLimit) {
    const unlockedFeatures = normalizePersistentUnlockKeys(subscriptionUser.unlockedFeatures);
    const premiumAccessToken = await createPremiumAccessToken(env, {
      userId: String(auth.userId || ""),
      reportType: reportTypeForPremiumAccess,
      featureKey,
      reason,
      transactionId: requestId || `membership:${activeTierForPass}:${Date.now().toString(36)}`,
      chargedCoins: 0,
      freeBySubscription: true,
    }) || "";

    return buildJsonWithPremiumAccessCookie({
      message: "이용권 무료 한도 조건으로 서비스를 열었습니다.",
      code: "SUBSCRIPTION_INCLUDED",
      productId: productId || null,
      requiredCoins: cost,
      chargedCoins: 0,
      membershipCreditCost: 0,
      accessType: "membership_pass",
      freeBySubscription: true,
      forceDeductApplied: false,
      subscriptionTier: activeTierForPass,
      freeLimit: activePolicyForPass.freeLimit,
      profileLimit: activePolicyForPass.profileLimit,
      recommendedCoins: activePolicyForPass.recommendedCoins,
      premiumAccessToken: premiumAccessToken || "",
      user: userPayload(auth, undefined, unlockedFeatures),
      unlockedFeatures,
      unlockMap: toUnlockMap(unlockedFeatures),
    }, {}, premiumAccessToken, env);
  }

  return json({
    ok: false,
    message: "기존 코인 결제는 더 이상 사용하지 않습니다. 이용권, 월정석 또는 단건 결제를 선택해 주세요.",
    code: "PAYMENT_REQUIRED",
    status: "payment_required",
    reason: "LEGACY_COIN_DISABLED",
    legacyCoinDisabled: true,
    blockedPaymentMode: "COIN",
    featureKey,
    reasonKey: reason,
    pricing: {
      featureKey,
      reason,
      coinPrice: cost,
      membershipCreditCost: Math.max(0, cost * 10),
      krwEquivalent: cost * 100,
      displayUnit: "content_value",
    },
    paymentOptions: ["MEMBERSHIP_PASS", "MOONLIGHT_STONE", "DIRECT_KRW"],
  }, { status: 402 });

  if (!forceDeduct) {
    const krwEquivalent = cost * 100;
    return json({
      ok: false,
      message: "이용권 혜택 또는 상품별 원화 단건 결제가 필요합니다.",
      code: "PAYMENT_REQUIRED",
      featureKey,
      reason,
      pricing: {
        featureKey,
        reason,
        coinPrice: cost,
        membershipCreditCost: 0,
        krwEquivalent,
        displayUnit: "content_value",
      },
    }, { status: 402 });
  }

  // 멱등성 키는 반드시 결정적이어야 한다. requestId가 없을 때 Date.now()로 폴백하면 동시 더블클릭이
  // 서로 다른 키를 얻어 recentConsumeRequestIds 가드를 통과, 이중 차감된다. 요청 내용으로만 파생해
  // 동일 요청은 항상 같은 키가 되도록 한다(payloadHash 없으면 feature/category/cost로 스코프).
  const coinRequestScope = String(
    payloadHash || `${categoryKey}:${subFeatureKey}:${cost}`,
  ).slice(0, 80);
  const coinRequestId = requestId || `coin:${featureKey}:${String(auth.userId || "")}:${coinRequestScope}`;
  const existingCoinSpend = await findAIPromptPaymentEvidence({
    auth,
    featureKey,
    body,
    requestId: coinRequestId,
    cost,
  });

  if (existingCoinSpend) {
    const unlockedFeatures = normalizePersistentUnlockKeys(subscriptionUser.unlockedFeatures);
    return json({
      message: "Already processed single payment.",
      code: "ALREADY_PROCESSED",
      featureKey,
      reason,
      requiredCoins: cost,
      chargedCoins: Math.max(0, Math.abs(Number(existingCoinSpend.delta || cost))),
      membershipCreditCost: 0,
      accessType: "coin",
      accessMethod: "COIN",
      paymentMode: "COIN",
      forceDeductApplied: true,
      transactionId: String(existingCoinSpend._id || ""),
      consume: {
        ok: true,
        transactionId: String(existingCoinSpend._id || ""),
        transactionType: "coin",
        accessType: "coin",
        accessMethod: "COIN",
        paymentMethod: "COIN",
        paymentMode: "COIN",
        requestId: coinRequestId,
        featureKey,
        coinPrice: cost,
        chargedCoins: Math.max(0, Math.abs(Number(existingCoinSpend.delta || cost))),
        membershipCreditCost: 0,
        idempotent: true,
      },
      user: userPayload(auth, Number(existingCoinSpend.balanceAfter || subscriptionUser.points || 0), unlockedFeatures),
      unlockedFeatures,
      unlockMap: toUnlockMap(unlockedFeatures),
    });
  }

  const deductFilter = {
    _id: auth.userId,
    points: { $gte: cost },
    ...(coinRequestId ? { recentConsumeRequestIds: { $ne: coinRequestId } } : {}),
  };
  const deductUpdate = {
    $inc: { points: -cost },
    // 중복 방지는 위 필터의 `$ne: coinRequestId` 가드가 담당한다($push는 스스로 못 막는다).
    ...(coinRequestId ? {
      $push: {
        recentConsumeRequestIds: { $each: [coinRequestId], $slice: -RECENT_CONSUME_REQUEST_ID_CAP },
      },
    } : {}),
  };
  const buildCoinHistoryDoc = (pointsAfter) => ({
    userId: auth.userId,
    kind: "deduct",
    delta: -cost,
    balanceAfter: Number(pointsAfter || 0),
    reason,
    featureKey,
    metadata: {
      source: "fortune.pig-coin.consume",
      accessType: "coin",
      accessMethod: "COIN",
      paymentMethod: "COIN",
      paymentMode: "COIN",
      requestId: coinRequestId,
      categoryKey,
      subFeatureKey,
      payloadHash,
      featureKey,
      coinPrice: cost,
      chargedCoins: cost,
      paidAt: new Date().toISOString(),
    },
  });

  // 원자적 차감(2483) 성공 후 PointHistory 기록 전에 isolate가 죽으면, 포인트만 빠지고 접근/감사로그가
  // 없으며 동일 requestId 재시도도 recentConsumeRequestIds 가드에 막혀 복구 불가하다. 차감+이력을 한
  // 트랜잭션으로 묶고, 트랜잭션 미지원 환경에서는 보상(saga)으로 차감을 되돌린다(월정석 경로와 동일 패턴).
  const compensateCoinDeduct = async () => {
    await User.findByIdAndUpdate(auth.userId, {
      $inc: { points: cost },
      ...(coinRequestId ? { $pull: { recentConsumeRequestIds: coinRequestId } } : {}),
    }).catch(() => {});
  };
  const runCoinSpendWithTransaction = async () => {
    const session = await mongoose.startSession();
    let outcome = null;
    try {
      await session.withTransaction(async () => {
        const user = await User.findOneAndUpdate(deductFilter, deductUpdate, {
          returnDocument: "after",
          projection: { points: 1, unlockedFeatures: 1 },
          session,
        }).lean();
        if (!user) { outcome = null; return; }
        const [history] = await PointHistory.create([buildCoinHistoryDoc(user.points)], { session });
        outcome = { updatedUser: user, history };
      }, mongoTransactionOptions());
      return outcome;
    } finally {
      await session.endSession();
    }
  };
  const runCoinSpendWithCompensation = async () => {
    const user = await User.findOneAndUpdate(deductFilter, deductUpdate, {
      returnDocument: "after",
      projection: { points: 1, unlockedFeatures: 1 },
    }).lean();
    if (!user) return null;
    const history = await PointHistory.create(buildCoinHistoryDoc(user.points)).catch(async (error) => {
      await compensateCoinDeduct();
      throw error;
    });
    return { updatedUser: user, history };
  };

  let coinSpend;
  try {
    coinSpend = await runCoinSpendWithTransaction();
  } catch (error) {
    if (!isTransactionUnsupported(error)) throw error;
    coinSpend = await runCoinSpendWithCompensation();
  }

  if (coinSpend?.updatedUser) {
    const updatedUser = coinSpend.updatedUser;
    const history = coinSpend.history;
    const unlockedFeatures = normalizePersistentUnlockKeys(updatedUser.unlockedFeatures);
    return json({
      message: `${cost.toLocaleString("ko-KR")} coins deducted.`,
      featureKey,
      reason,
      requiredCoins: cost,
      chargedCoins: cost,
      membershipCreditCost: 0,
      accessType: "coin",
      accessMethod: "COIN",
      paymentMode: "COIN",
      forceDeductApplied: true,
      transactionId: String(history?._id || ""),
      consume: {
        ok: true,
        transactionId: String(history?._id || ""),
        transactionType: "coin",
        accessType: "coin",
        accessMethod: "COIN",
        paymentMethod: "COIN",
        paymentMode: "COIN",
        requestId: coinRequestId,
        featureKey,
        coinPrice: cost,
        chargedCoins: cost,
        membershipCreditCost: 0,
        idempotent: false,
      },
      user: userPayload(auth, Number(updatedUser.points || 0), unlockedFeatures),
      unlockedFeatures,
      unlockMap: toUnlockMap(unlockedFeatures),
    });
  }

  const krwEquivalent = cost * 100;

  return json({
    ok: false,
    message: "이용권 혜택 또는 상품별 원화 단건 결제가 필요합니다.",
    code: "PAYMENT_REQUIRED",
    featureKey,
    reason,
    pricing: {
      featureKey,
      reason,
      coinPrice: cost,
      membershipCreditCost: 0,
      krwEquivalent,
      displayUnit: "content_value",
    },
  }, { status: 402 });
}

async function handlePigCoinUnlock(request, auth, options = {}) {
  const body = await readJson(request);
  const productId = String(body?.productId || "").trim().toLowerCase();
  if (!productId) {
    return json({ message: "productId is required.", code: "INVALID_PRODUCT" }, { status: 400 });
  }

  if (!resolveUnlockProductSpec(productId)) {
    return json({ message: "Unsupported unlock product.", code: "INVALID_PRODUCT", productId }, { status: 400 });
  }

  const delegatedBody = {
    productId,
    requestId: String(body?.requestId || "").trim().slice(0, 120),
  };
  const delegatedRequest = new Request(request.url, {
    method: "POST",
    headers: new Headers({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(delegatedBody),
  });

  return handlePigCoinConsume(delegatedRequest, auth, {
    ...options,
    productId,
    env: options?.env,
  });
}

function isObjectIdLike(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

function toValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoOrNull(value) {
  const date = toValidDate(value);
  return date ? date.toISOString() : null;
}

const FIND_USER_BY_ID_RAW_MAX_TIME_MS = 10000;

async function findUserByIdRaw(userId, projection = {}) {
  const normalizedId = String(userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(normalizedId)) return null;

  return User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(normalizedId) },
    { projection, maxTimeMS: FIND_USER_BY_ID_RAW_MAX_TIME_MS },
  );
}

// 환불 대상 차감행을 찾는 두 쿼리. 폴백은 "요청한 cost 가 원장의 delta 와 미세하게 어긋나도 같은 행을
// 찾아준다"가 원래 취지였는데, 그 취지를 넘어 delta·featureKey·기간 필터까지 전부 빠져 있었다.
// 그 틈으로 delta:0 감사행(프로필 카드 조작 등이 상시 생성)의 _id 만 알면 임의 금액을 발행할 수 있었다.
// 따라서 폴백에서 완화하는 것은 delta 의 '정확값'뿐이고, 나머지 필터는 1차와 동일하게 유지한다.
function buildPigCoinRefundDeductQueries({ userId, cost, featureKey, sourceTransactionId, recentWindow }) {
  const primary = {
    userId,
    kind: "deduct",
    delta: -cost,
    featureKey,
    createdAt: { $gte: recentWindow },
  };

  if (!isObjectIdLike(sourceTransactionId)) {
    return { primary, fallback: null };
  }

  primary._id = sourceTransactionId;
  return {
    primary,
    fallback: {
      userId,
      kind: "deduct",
      _id: sourceTransactionId,
      delta: { $lt: 0 },
      featureKey,
      createdAt: { $gte: recentWindow },
    },
  };
}

async function handlePigCoinRefund(request, auth) {
  const body = await readJson(request);
  const requestedCost = Number(body?.cost);
  const cost = Number.isFinite(requestedCost) && requestedCost > 0
    ? Math.floor(requestedCost)
    : PIG_COIN_DEFAULT_UNLOCK_COST;

  if (cost <= 0 || cost > PIG_COIN_MAX_COST) {
    return json({ message: "Invalid payment refund amount." }, { status: 400 });
  }

  const reason = String(body?.reason || "Premium generation failed auto-refund").trim().slice(0, 120);
  const featureKey = String(body?.featureKey || "pig-coin-unlock").trim().slice(0, 60);
  const sourceTransactionId = String(body?.sourceTransactionId || "").trim();
  const requestId = String(body?.requestId || "").trim().slice(0, 120);
  const now = new Date();
  const recentWindow = new Date(now.getTime() - 1000 * 60 * 60 * 48);

  if (requestId) {
    const alreadyByRequest = await PointHistory.findOne({
      userId: auth.userId,
      kind: "refund",
      "metadata.requestId": requestId,
    }).lean();

    if (alreadyByRequest) {
      const user = await User.findById(auth.userId).select("points").lean();
      return json({
        message: "Refund already processed.",
        code: "REFUND_ALREADY_PROCESSED",
        alreadyRefunded: true,
        refundTransactionId: String(alreadyByRequest._id || ""),
        user: userPayload(auth, Number(user?.points || 0)),
      });
    }
  }

  const { primary: deductQuery, fallback: deductFallbackQuery } = buildPigCoinRefundDeductQueries({
    userId: auth.userId,
    cost,
    featureKey,
    sourceTransactionId,
    recentWindow,
  });

  let deducted = await PointHistory.findOne(deductQuery)
    .sort({ createdAt: -1 })
    .lean();

  // 🔴 이 폴백의 목적은 "요청 금액이 원 차감액과 미세하게 어긋나도 같은 행을 찾아준다" 하나다.
  // 예전에는 필터를 통째로 비워 _id 만 봤는데, 그러면 delta:0 감사행(profile.js 가 프로필 카드
  // 조작마다, billing.js 가 FAMILY 이용권 접근마다 남긴다)까지 매칭돼 인증만으로 임의 금액을
  // 발행할 수 있었다. 완화는 금액 조건에만 적용하고 나머지는 1차 조회와 동일하게 유지한다.
  // (조건 조립은 buildPigCoinRefundDeductQueries 한 곳에 모아 단위 테스트로 고정한다.)
  if (!deducted && deductFallbackQuery) {
    deducted = await PointHistory.findOne(deductFallbackQuery).lean();
  }

  if (!deducted) {
    if (isObjectIdLike(sourceTransactionId)) {
      const refundedBySource = await PointHistory.findOne({
        userId: auth.userId,
        kind: "refund",
        "metadata.refundForPointHistoryId": sourceTransactionId,
      }).lean();

      if (refundedBySource) {
        const user = await User.findById(auth.userId).select("points").lean();
        return json({
          message: "Refund already processed.",
          code: "REFUND_ALREADY_PROCESSED",
          alreadyRefunded: true,
          sourceTransactionId,
          refundTransactionId: String(refundedBySource._id || ""),
          user: userPayload(auth, Number(user?.points || 0)),
        });
      }
    }

    return json({
      message: "No refundable deduction found.",
      code: "NO_REFUNDABLE_DEDUCTION",
    }, { status: 409 });
  }

  const alreadyRefunded = await PointHistory.findOne({
    userId: auth.userId,
    kind: "refund",
    "metadata.refundForPointHistoryId": String(deducted._id),
  }).lean();

  if (alreadyRefunded) {
    const user = await User.findById(auth.userId).select("points").lean();
    return json({
      message: "Refund already processed.",
      code: "REFUND_ALREADY_PROCESSED",
      alreadyRefunded: true,
      refundTransactionId: String(alreadyRefunded._id || ""),
      user: userPayload(auth, Number(user?.points || 0)),
    });
  }

  // 🔴 환불 금액의 정본은 클라이언트가 보낸 cost 가 아니라 실제 차감 행의 delta 다.
  // 1차 조회는 delta:-cost 로 묶여 있어 두 값이 같지만, 위 폴백은 금액 조건을 일부러 풀어 두므로
  // 거기서 cost 를 그대로 믿으면 소액 차감 1건으로 상한(PIG_COIN_MAX_COST)까지 발행할 수 있다.
  const refundAmount = Math.max(0, Math.floor(Math.abs(Number(deducted.delta || 0))));

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    { $inc: { points: refundAmount } },
    { returnDocument: "after", projection: { points: 1 } },
  ).lean();

  if (!updatedUser) {
    return json({ message: "User not found." }, { status: 404 });
  }

  const refundHistory = await PointHistory.create({
    userId: auth.userId,
    kind: "refund",
    delta: refundAmount,
    balanceAfter: Number(updatedUser.points || 0),
    reason,
    featureKey,
    metadata: {
      source: "fortune.pig-coin.refund",
      requestId,
      refundForPointHistoryId: String(deducted._id),
      sourceTransactionId: String(deducted._id),
    },
  });

  return json({
    message: `${refundAmount.toLocaleString("ko-KR")} coins refunded.`,
    refundedCoins: refundAmount,
    sourceTransactionId: String(deducted._id),
    refundTransactionId: String(refundHistory?._id || ""),
    user: userPayload(auth, updatedUser.points),
  });
}

// details 는 생성 실패 시 재시도 계약을 프론트에 알리는 자리다(paymentRetainedForRetry 등).
// 사주의 buildSajuAILlmRetryableError 가 이미 같은 형태라 계약이 통일된다.
function buildZiweiAIPromptError(code, message, status = 400, details = {}) {
  return json({ ok: false, code, message, ...details }, { status });
}

function mapZiweiConsumeFailure(response, payload) {
  const status = Number(response?.status || 500);
  const code = String(payload?.code || "").trim().toUpperCase();
  const message = String(payload?.message || "").trim();

  if (status === 401 || status === 403 || code === "AUTH_REQUIRED" || code === "UNAUTHORIZED") {
    return buildZiweiAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  if (status === 402 || code === "INSUFFICIENT_BALANCE" || code === "INSUFFICIENT_COINS" || code === "PAYMENT_REQUIRED") {
    return buildZiweiAIPromptError(
      "PAYMENT_REQUIRED",
      `단건 결제가 필요합니다. ${calculateKrwAmountFromCoins(ZIWEI_AI_PROMPT_PRICE).toLocaleString("ko-KR")}원 가치의 상품입니다.`,
      402,
    );
  }

  if (status === 409 || code === "IDEMPOTENCY_CONFLICT" || code === "REQUEST_IN_PROGRESS") {
    return buildZiweiAIPromptError(
      "REQUEST_IN_PROGRESS",
      "동일 요청이 처리 중입니다. 잠시 후 다시 시도해 주세요.",
      409,
    );
  }

  return buildZiweiAIPromptError(
    "PROMPT_GENERATION_FAILED",
    message || "결제 확인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    status >= 400 && status < 600 ? status : 500,
  );
}

function buildSajuAIPromptError(code, message, status = 400, extra = {}) {
  const details = extra && typeof extra === "object" ? extra : {};
  return json({ ok: false, code, message, ...details }, { status });
}

function isSajuAIPromptDbUnavailableError(error) {
  const haystack = `${String(error?.message || "")} ${String(error?.code || "")} ${String(error?.name || "")}`.toLowerCase();
  return SAJU_AI_PROMPT_DB_ERROR_SIGNATURES.some((needle) => haystack.includes(needle));
}

function buildSajuAIPromptPaidAccessRetryableError() {
  return buildSajuAIPromptError(
    "PAID_ACCESS_VERIFY_RETRYABLE",
    "결제는 확인되었고 생성 권한을 다시 맞추고 있습니다. 잠시 후 자동으로 다시 시도합니다.",
    503,
  );
}

function mapSajuConsumeFailure(response, payload) {
  const status = Number(response?.status || 500);
  const code = String(payload?.code || "").trim();
  const message = String(payload?.message || "").trim();
  const detailReason = String(payload?.errorDetails?.reason || payload?.reason || "").trim();

  if (status === 401 || status === 403 || code === "AUTH_REQUIRED" || code === "UNAUTHORIZED") {
    return buildSajuAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  if (status === 402 || code === "INSUFFICIENT_BALANCE" || code === "INSUFFICIENT_COINS" || code === "PAYMENT_REQUIRED") {
    return buildSajuAIPromptError(
      "PAYMENT_REQUIRED",
      "결제, 월정석 크레딧, 멤버십 이용권 중 사용 가능한 방식으로 확인한 뒤 사주 전문가 상담 결과가 열립니다.",
      402,
    );
  }

  if (status === 503 || code === "SERVICE_UNAVAILABLE" || detailReason === "DB_UNAVAILABLE") {
    return buildSajuAIPromptPaidAccessRetryableError();
  }

  return buildSajuAIPromptError(
    "PROMPT_GENERATION_FAILED",
    message || "결제 확인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    status >= 400 && status < 600 ? status : 500,
  );
}

function buildAstrologyAIPromptError(code, message, status = 400, details = {}) {
  return json({ ok: false, code, message, ...details }, { status });
}

function buildVedicAIPromptError(code, message, status = 400, details = {}) {
  return json({ ok: false, code, message, ...details }, { status });
}

function buildVedicPrashnaError(code, message, status = 400, extra = {}) {
  return json({ ok: false, code, message, ...extra }, { status });
}

function getPrashnaExecutionId(userId, orderId) {
  return `vedic-prashna:${String(userId || "").trim()}:${String(orderId || "").trim()}`.slice(0, 160);
}

function readPrashnaAccessMethod(payload = {}) {
  const text = String(
    payload?.accessMethod
      || payload?.paymentMethod
      || payload?.paymentMode
      || payload?.consume?.accessMethod
      || payload?.accessGrant?.accessMethod
      || "",
  ).trim().toLowerCase();
  if (text.includes("pass")) return "pass";
  if (text.includes("family")) return "family";
  if (text.includes("month") || text.includes("credit")) return "monthly";
  return "single";
}

function readPrashnaTransactionId(payload = {}, requestId = "") {
  return String(
    payload?.transactionId
      || payload?.consume?.transactionId
      || payload?.accessGrant?.evidenceId
      || payload?.accessGrant?.purchaseId
      || payload?.payment?._id
      || payload?.payment?.id
      || payload?.payment?.paymentId
      || payload?._paymentContext?.transactionId
      || requestId
      || "",
  ).trim().slice(0, 160);
}

function normalizePrashnaStoredResult(record) {
  const result = record?.result && typeof record.result === "object" ? record.result : {};
  return {
    ok: true,
    idempotent: true,
    order: result.order || {
      orderId: String(record?.orderId || ""),
      productCode: VEDIC_PRASHNA_PROMPT_PRODUCT_CODE,
      productName: VEDIC_PRASHNA_PROMPT_PRODUCT_NAME,
      amount: VEDIC_PRASHNA_PROMPT_AMOUNT_KRW,
      currency: "KRW",
      paymentType: "ONE_TIME",
      paymentStatus: "PAID",
      generationStatus: "GENERATED",
    },
    result: result.prashnaResult || result.result || null,
    promptText: String(result.promptText || result.prashnaResult?.promptText || ""),
    chart: result.chart || result.prashnaResult?.chart || null,
    snapshot: result.snapshot || result.prashnaResult?.snapshot || null,
  };
}

async function handleVedicPrashnaSnapshot(request, auth, env) {
  const body = await readJson(request);
  let snapshot = null;
  try {
    snapshot = await createPrashnaSnapshot({
      question: body?.question,
      latitude: body?.latitude,
      longitude: body?.longitude,
      orderId: body?.orderId,
    });
  } catch (error) {
    return buildVedicPrashnaError(
      String(error?.code || "SNAPSHOT_FAILED"),
      String(error?.message || "스냅샷 생성에 실패했습니다."),
      error?.code === "TIMEZONE_LOOKUP_FAILED" ? 422 : 400,
    );
  }

  const executionId = getPrashnaExecutionId(auth.userId, snapshot.orderId);
  const existing = await withMongoRetry(env, () => PaidExecutionRecord.findOne({
    userId: String(auth.userId),
    featureId: VEDIC_PRASHNA_PROMPT_FEATURE_KEY,
    orderId: snapshot.orderId,
  }).lean());
  if (existing?.status === "completed") {
    return json(normalizePrashnaStoredResult(existing));
  }

  await withMongoRetry(env, () => PaidExecutionRecord.findOneAndUpdate(
    { executionId },
    {
      $setOnInsert: {
        executionId,
        requestId: snapshot.orderId,
        userId: String(auth.userId),
        featureId: VEDIC_PRASHNA_PROMPT_FEATURE_KEY,
        profileId: "prashna",
        accessMode: "per_use",
        accessMethod: "single",
        amountCoins: VEDIC_PRASHNA_PROMPT_PRICE,
        amountKRW: VEDIC_PRASHNA_PROMPT_AMOUNT_KRW,
        orderId: snapshot.orderId,
        status: "paid_pending_generation",
        resultId: "",
        idempotencyKey: snapshot.orderId,
        result: {
          order: {
            orderId: snapshot.orderId,
            productCode: VEDIC_PRASHNA_PROMPT_PRODUCT_CODE,
            productName: VEDIC_PRASHNA_PROMPT_PRODUCT_NAME,
            amount: VEDIC_PRASHNA_PROMPT_AMOUNT_KRW,
            currency: "KRW",
            paymentType: "ONE_TIME",
            paymentStatus: "PENDING",
            generationStatus: "NOT_STARTED",
            createdAt: new Date().toISOString(),
            paidAt: null,
          },
          snapshot,
        },
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean());

  return json({
    ok: true,
    order: {
      orderId: snapshot.orderId,
      productCode: VEDIC_PRASHNA_PROMPT_PRODUCT_CODE,
      productName: VEDIC_PRASHNA_PROMPT_PRODUCT_NAME,
      amount: VEDIC_PRASHNA_PROMPT_AMOUNT_KRW,
      currency: "KRW",
      paymentType: "ONE_TIME",
      paymentStatus: "PENDING",
      generationStatus: "NOT_STARTED",
    },
    snapshot,
    confirmMessage: "아래 질문·시각·위치를 기준으로 프라슈나 차트가 생성됩니다.",
  });
}

async function handleVedicPrashnaGenerate(request, auth, env) {
  const body = await readJson(request);
  const bodySnapshot = body?.snapshot && typeof body.snapshot === "object" ? body.snapshot : {};
  const orderId = String(body?.orderId || bodySnapshot.orderId || "").trim();
  if (!orderId) {
    return buildVedicPrashnaError("ORDER_REQUIRED", "주문 스냅샷이 필요합니다.", 400);
  }

  const executionId = getPrashnaExecutionId(auth.userId, orderId);
  const existing = await withMongoRetry(env, () => PaidExecutionRecord.findOne({
    userId: String(auth.userId),
    featureId: VEDIC_PRASHNA_PROMPT_FEATURE_KEY,
    orderId,
  }).lean());
  if (!existing) {
    return buildVedicPrashnaError("SNAPSHOT_NOT_FOUND", "주문 스냅샷을 찾을 수 없습니다. 다시 생성해 주세요.", 404);
  }
  if (existing.status === "completed") {
    return json(normalizePrashnaStoredResult(existing));
  }
  if (existing.status === "generating") {
    return buildVedicPrashnaError(
      "REQUEST_IN_PROGRESS",
      "이미 처리 중인 주문입니다. 중복 결제 없이 기존 요청의 진행 상태를 확인합니다.",
      409,
      { orderId },
    );
  }

  const storedResult = existing.result && typeof existing.result === "object" ? existing.result : {};
  const snapshot = storedResult.snapshot && typeof storedResult.snapshot === "object" ? storedResult.snapshot : null;
  if (!snapshot || snapshot.orderId !== orderId) {
    return buildVedicPrashnaError("SNAPSHOT_INVALID", "주문 스냅샷이 올바르지 않습니다. 다시 생성해 주세요.", 409);
  }

  const requestId = readAIPromptRequestId(body, orderId);
  let consumePayload = null;
  let chargedCoins = 0;
  let sourceTransactionId = "";
  // 코인으로 실제 차감된 건에만 코인 환불을 시도한다. 카드(DIRECT_KRW)·이용권·월정석 결제는
  // PointHistory 차감행이 없어 코인 환불이 반드시 409로 실패하고, 그 실패가 "환불 시도했으나 실패"로
  // 기록돼 카드 환불 경로를 가린다. 사주 경로(readSajuAIPromptPointRefundContext)가 쓰던 가드와 동일.
  let isPointSpend = false;
  let isCardSpend = false;
  const skipPaymentConsume = existing.status === "generation_failed" && storedResult?.order?.paymentStatus === "PAID";

  if (!skipPaymentConsume) {
    const delegatedRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "idempotency-key": requestId,
      }),
      body: JSON.stringify({
        featureKey: VEDIC_PRASHNA_PROMPT_FEATURE_KEY,
        reason: VEDIC_PRASHNA_PROMPT_PRODUCT_NAME,
        requireExistingPaidAccess: true,
        requestId,
        categoryKey: "vedic",
        subFeatureKey: "prashna-prompt",
        payloadHash: snapshot.snapshotHash,
        accessGrant: body?.accessGrant,
        accessDecision: body?.accessDecision,
        consume: body?.consume,
        payment: body?.payment,
        _paymentContext: body?._paymentContext,
      }),
    });
    const consumeResponse = await handlePigCoinConsume(delegatedRequest, auth, { env });
    consumePayload = await consumeResponse.json().catch(() => ({}));
    if (!consumeResponse.ok) {
      return mapVedicPrashnaConsumeFailure(consumeResponse, consumePayload);
    }
    chargedCoins = Math.max(0, Number(consumePayload?.chargedCoins || consumePayload?.consume?.chargedCoins || 0));
    ({ isPointSpend, isCardSpend } = readSajuAIPromptPointRefundContext(consumePayload, body));
    const accessMethod = readPrashnaAccessMethod(consumePayload || body);
    if (accessMethod !== "single") {
      return buildVedicPrashnaError(
        "PAYMENT_REQUIRED",
        "프라슈나 프롬프트는 1회 5,000원 단건 결제 후 생성할 수 있습니다.",
        402,
      );
    }
    sourceTransactionId = readPrashnaTransactionId({
      ...consumePayload,
      consume: consumePayload,
      accessGrant: consumePayload?.accessGrant,
      payment: body?.payment,
      _paymentContext: body?._paymentContext,
    }, requestId);
    if (chargedCoins < VEDIC_PRASHNA_PROMPT_PRICE) {
      return buildVedicPrashnaError(
        "PAYMENT_REQUIRED",
        "결제가 완료되지 않았습니다. 이용 금액은 청구되지 않았으며 프라슈나 차트도 생성되지 않았습니다.",
        402,
      );
    }
  } else {
    chargedCoins = VEDIC_PRASHNA_PROMPT_PRICE;
    sourceTransactionId = String(existing.paymentId || existing.idempotencyKey || requestId || "").trim();
  }

  await withMongoRetry(env, () => PaidExecutionRecord.updateOne(
    { executionId, status: { $in: ["paid_pending_generation", "generation_failed"] } },
    {
      $set: {
        status: "generating",
        accessMethod: readPrashnaAccessMethod(consumePayload || body),
        amountCoins: VEDIC_PRASHNA_PROMPT_PRICE,
        amountKRW: VEDIC_PRASHNA_PROMPT_AMOUNT_KRW,
        paymentId: sourceTransactionId,
        consumedAt: new Date(),
        result: {
          ...storedResult,
          order: {
            ...(storedResult.order || {}),
            orderId,
            productCode: VEDIC_PRASHNA_PROMPT_PRODUCT_CODE,
            productName: VEDIC_PRASHNA_PROMPT_PRODUCT_NAME,
            amount: VEDIC_PRASHNA_PROMPT_AMOUNT_KRW,
            currency: "KRW",
            paymentType: "ONE_TIME",
            paymentStatus: "PAID",
            generationStatus: "CALCULATING",
            paidAt: new Date().toISOString(),
          },
          snapshot,
          billing: {
            requestId,
            sourceTransactionId,
            chargedCoins,
          },
        },
      },
    },
  ));

  try {
    const prashnaResult = await generatePrashnaPromptResult(env, snapshot, { requestUrl: request.url });
    const completedOrder = {
      orderId,
      productCode: VEDIC_PRASHNA_PROMPT_PRODUCT_CODE,
      productName: VEDIC_PRASHNA_PROMPT_PRODUCT_NAME,
      amount: VEDIC_PRASHNA_PROMPT_AMOUNT_KRW,
      currency: "KRW",
      paymentType: "ONE_TIME",
      paymentStatus: "PAID",
      generationStatus: "GENERATED",
      paidAt: new Date().toISOString(),
    };
    // 프라슈나 계산이 이미 성공한 뒤 이 저장 한 번이 흔들리면 결과가 통째로 버려지고 아래 catch가
    // "생성 실패"로 오판해 환불 절차를 탄다(사주 AI 상담과 동일 함정) — withMongoRetry로 흡수한다.
    await withMongoRetry(env, () => PaidExecutionRecord.updateOne(
      { executionId },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          resultId: prashnaResult.resultId,
          result: {
            order: completedOrder,
            snapshot,
            chart: prashnaResult.chart,
            promptText: prashnaResult.promptText,
            prashnaResult,
            billing: {
              requestId,
              sourceTransactionId,
              chargedCoins,
            },
          },
          error: null,
        },
      },
    ));
    return json({
      ok: true,
      order: completedOrder,
      result: prashnaResult,
      promptText: prashnaResult.promptText,
      chart: prashnaResult.chart,
      snapshot,
    });
  } catch (error) {
    let refundAttempted = false;
    let refundOk = false;
    if (isPointSpend && chargedCoins > 0 && sourceTransactionId) {
      refundAttempted = true;
      try {
        const refundRequest = new Request(request.url, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            cost: chargedCoins,
            featureKey: VEDIC_PRASHNA_PROMPT_FEATURE_KEY,
            sourceTransactionId,
            requestId: `refund:${requestId}`.slice(0, 120),
            reason: "Prashna prompt generation failed auto-refund",
          }),
        });
        const refundResponse = await handlePigCoinRefund(refundRequest, auth);
        refundOk = refundResponse.ok;
      } catch (refundError) {
        console.error("[fortune][vedic-prashna] refund failed:", refundError);
      }
    } else if (isCardSpend && sourceTransactionId) {
      // 카드 단건 결제는 PointHistory 차감행이 없어 코인 환불이 반드시 409 로 실패한다.
      // PortOne 취소 정본으로 보낸다(결제 후 무결과 방지). 실패하면 refundOk=false 라
      // 기존처럼 PAID 로 남아 재시도 경로가 살아 있다.
      refundAttempted = true;
      const cardRefund = await refundAIPromptCardPaymentOnFailure({
        env,
        auth,
        paymentId: sourceTransactionId,
        featureKey: VEDIC_PRASHNA_PROMPT_FEATURE_KEY,
        reasonCode: "ai_prompt_generation_failed",
        reasonMessage: "Prashna prompt generation failed auto-refund",
      });
      refundOk = cardRefund.refunded === true;
    }
    await withMongoRetry(env, () => PaidExecutionRecord.updateOne(
      { executionId },
      {
        $set: {
          status: refundOk ? "refunded" : "generation_failed",
          error: {
            code: String(error?.code || "PRASHNA_GENERATION_FAILED"),
            message: String(error?.message || error || "Prashna generation failed."),
            refundAttempted,
            refundOk,
          },
          result: {
            ...storedResult,
            order: {
              ...(storedResult.order || {}),
              orderId,
              productCode: VEDIC_PRASHNA_PROMPT_PRODUCT_CODE,
              productName: VEDIC_PRASHNA_PROMPT_PRODUCT_NAME,
              amount: VEDIC_PRASHNA_PROMPT_AMOUNT_KRW,
              currency: "KRW",
              paymentType: "ONE_TIME",
              paymentStatus: refundOk ? "REFUNDED" : "PAID",
              generationStatus: "FAILED",
            },
            snapshot,
            retryEligible: !refundOk,
          },
        },
      },
    )).catch((persistError) => {
      console.error("[fortune][vedic-prashna] failure record persist failed:", persistError);
    });
    console.error("[fortune][vedic-prashna] generation failed:", error);
    return buildVedicPrashnaError(
      "PRASHNA_GENERATION_FAILED",
      refundOk
        ? "결제는 확인되었지만 결과 생성에 실패했습니다. 결제 취소 또는 무료 재생성 절차를 진행합니다."
        : "차트 계산 중 오류가 발생했습니다. 추가 결제 없이 다시 시도합니다.",
      500,
      { orderId, refundAttempted, refundOk, retryEligible: !refundOk },
    );
  }
}

async function handleVedicPrashnaResult(request, auth, env) {
  const url = new URL(request.url);
  const orderId = String(url.searchParams.get("orderId") || "").trim();
  if (!orderId) {
    return buildVedicPrashnaError("ORDER_REQUIRED", "주문 ID가 필요합니다.", 400);
  }
  const record = await withMongoRetry(env, () => PaidExecutionRecord.findOne({
    userId: String(auth.userId),
    featureId: VEDIC_PRASHNA_PROMPT_FEATURE_KEY,
    orderId,
  }).lean());
  if (!record) {
    return buildVedicPrashnaError("RESULT_NOT_FOUND", "프라슈나 결과를 찾을 수 없습니다.", 404);
  }
  if (record.status !== "completed") {
    return buildVedicPrashnaError(
      "RESULT_NOT_READY",
      record.status === "generation_failed"
        ? "결제는 확인되었지만 결과 생성에 실패했습니다. 결제 취소 또는 무료 재생성 절차를 진행합니다."
        : "결제 상태를 확인하고 있습니다. 창을 닫지 말고 잠시 기다려 주세요.",
      202,
      { orderId, status: record.status },
    );
  }
  await withMongoRetry(env, () => PaidExecutionRecord.updateOne(
    { _id: record._id },
    { $set: { "result.prashnaResult.lastViewedAt": new Date().toISOString() } },
  ));
  return json(normalizePrashnaStoredResult(record));
}

function mapVedicPrashnaConsumeFailure(response, payload) {
  const status = Number(response?.status || 500);
  const code = String(payload?.code || "").trim();
  const message = String(payload?.message || "").trim();

  if (status === 401 || status === 403 || code === "AUTH_REQUIRED" || code === "UNAUTHORIZED") {
    return buildVedicPrashnaError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  if (status === 402 || code === "INSUFFICIENT_BALANCE" || code === "PAYMENT_REQUIRED") {
    return buildVedicPrashnaError(
      "PAYMENT_REQUIRED",
      "프라슈나 프롬프트는 1회 5,000원 단건 결제 후 생성할 수 있습니다.",
      402,
    );
  }

  return buildVedicPrashnaError(
    "PRASHNA_PAYMENT_VERIFY_FAILED",
    message || "결제 상태를 확인하고 있습니다. 창을 닫지 말고 잠시 기다려 주세요.",
    status >= 400 && status < 600 ? status : 500,
  );
}

function mapAstrologyConsumeFailure(response, payload) {
  const status = Number(response?.status || 500);
  const code = String(payload?.code || "").trim();
  const message = String(payload?.message || "").trim();

  if (status === 401 || status === 403 || code === "AUTH_REQUIRED" || code === "UNAUTHORIZED") {
    return buildAstrologyAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  if (status === 402 || code === "INSUFFICIENT_BALANCE") {
    return buildAstrologyAIPromptError(
      "PAYMENT_REQUIRED",
      `단건 결제가 필요합니다. ${calculateKrwAmountFromCoins(ASTROLOGY_AI_PROMPT_PRICE).toLocaleString("ko-KR")}원 가치의 상품입니다.`,
      402,
    );
  }

  return buildAstrologyAIPromptError(
    "PROMPT_GENERATION_FAILED",
    message || "결제 확인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    status >= 400 && status < 600 ? status : 500,
  );
}

function mapVedicConsumeFailure(response, payload) {
  const status = Number(response?.status || 500);
  const code = String(payload?.code || "").trim();
  const message = String(payload?.message || "").trim();

  if (status === 401 || status === 403 || code === "AUTH_REQUIRED" || code === "UNAUTHORIZED") {
    return buildVedicAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  if (status === 402 || code === "INSUFFICIENT_BALANCE") {
    return buildVedicAIPromptError(
      "PAYMENT_REQUIRED",
      `단건 결제가 필요합니다. ${calculateKrwAmountFromCoins(VEDIC_AI_PROMPT_PRICE).toLocaleString("ko-KR")}원 가치의 상품입니다.`,
      402,
    );
  }

  return buildVedicAIPromptError(
    "PROMPT_GENERATION_FAILED",
    message || "결제 확인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    status >= 400 && status < 600 ? status : 500,
  );
}

const ASTROLOGY_SWISS_SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const ASTROLOGY_SWISS_SIGN_EMOJI = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const ASTROLOGY_SWISS_PLANET_ORDER = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const ASTROLOGY_SWISS_PLANET_KO = Object.freeze({
  Sun: "태양",
  Moon: "달",
  Mercury: "수성",
  Venus: "금성",
  Mars: "화성",
  Jupiter: "목성",
  Saturn: "토성",
  Uranus: "천왕성",
  Neptune: "해왕성",
  Pluto: "명왕성",
});

const ASTROLOGY_SWISS_ASPECT_LABEL = Object.freeze({
  conjunction: "딱 맞는 각(합)",
  sextile: "도움 각(육합)",
  square: "긴장 각(직각)",
  trine: "편한 각(삼합)",
  opposition: "마주보는 각(충)",
});

function toAstrologyPromptSafeText(value) {
  return String(value == null ? "" : value).trim();
}

function parseAstrologyTimezoneOffset(rawTimezone) {
  if (Number.isFinite(Number(rawTimezone))) return Number(rawTimezone);
  const text = toAstrologyPromptSafeText(rawTimezone);
  if (!text) return NaN;
  const match = text.match(/([+-]?\d+(?:\.\d+)?)/);
  if (!match) return NaN;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function isAstrologyPromptFieldMissing(value) {
  const text = toAstrologyPromptSafeText(value);
  if (!text) return true;
  if (text === "-" || text === "행성") return true;
  if (text.includes("제공되지 않음")) return true;
  return false;
}

function hasValidAstrologyPlacements(astrologyResult) {
  const rows = Array.isArray(astrologyResult?.placements) ? astrologyResult.placements : [];
  return rows.some((row) => {
    const planet = toAstrologyPromptSafeText(row?.planet);
    const sign = toAstrologyPromptSafeText(row?.sign);
    return !isAstrologyPromptFieldMissing(planet) && !isAstrologyPromptFieldMissing(sign);
  });
}

function hasValidAstrologyAspects(astrologyResult) {
  const rows = Array.isArray(astrologyResult?.majorAspects) ? astrologyResult.majorAspects : [];
  return rows.some((row) => {
    const pair = toAstrologyPromptSafeText(row?.pair);
    return !isAstrologyPromptFieldMissing(pair);
  });
}

function normalizeAstrologyBirthForSwiss(astrologyResult) {
  const birth = astrologyResult?.birth && typeof astrologyResult.birth === "object" ? astrologyResult.birth : {};
  const year = Number(birth.year);
  const month = Number(birth.month);
  const day = Number(birth.day);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const hourRaw = Number(birth.hour);
  const minuteRaw = Number(birth.minute);
  const timezoneRaw = parseAstrologyTimezoneOffset(birth.timezone);
  const latRaw = Number(birth.latitude);
  const lonRaw = Number(birth.longitude);

  return {
    year,
    month,
    day,
    hour: Number.isFinite(hourRaw) ? hourRaw : 12,
    minute: Number.isFinite(minuteRaw) ? minuteRaw : 0,
    timezone: Number.isFinite(timezoneRaw) ? timezoneRaw : 9,
    lat: Number.isFinite(latRaw) ? latRaw : 37.5665,
    lon: Number.isFinite(lonRaw) ? lonRaw : 126.978,
  };
}

function formatAstrologyDegreeText(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  const normalized = ((numeric % 30) + 30) % 30;
  let degree = Math.floor(normalized);
  let minute = Math.round((normalized - degree) * 60);
  if (minute >= 60) {
    degree += 1;
    minute = 0;
  }
  if (degree >= 30) degree = 29;
  return `${String(degree)}° ${String(minute).padStart(2, "0")}'`;
}

function formatAstrologySignLabel(position) {
  if (!position || typeof position !== "object") return "";
  const signIdx = Number(position.sign);
  const signKo = Number.isInteger(signIdx) && signIdx >= 0 && signIdx < 12
    ? ASTROLOGY_SWISS_SIGN_KO[signIdx]
    : toAstrologyPromptSafeText(position.signKo);
  const signEmoji = Number.isInteger(signIdx) && signIdx >= 0 && signIdx < 12
    ? ASTROLOGY_SWISS_SIGN_EMOJI[signIdx]
    : toAstrologyPromptSafeText(position.signEmoji);
  const degree = formatAstrologyDegreeText(position.degree);
  if (!signKo) return "";
  return `${signKo}(${signEmoji || "?"}) ${degree}`;
}

function buildAstrologyPlacementsFromSwiss(swissChart) {
  const planets = swissChart?.planets && typeof swissChart.planets === "object" ? swissChart.planets : {};
  const rows = [];
  for (let i = 0; i < ASTROLOGY_SWISS_PLANET_ORDER.length; i += 1) {
    const key = ASTROLOGY_SWISS_PLANET_ORDER[i];
    const item = planets[key];
    if (!item || typeof item !== "object") continue;
    const sign = formatAstrologySignLabel(item);
    if (!sign) continue;
    const houseNumber = Number(item.house);
    const house = Number.isFinite(houseNumber) ? `${Math.trunc(houseNumber)}H` : "-";
    const degree = `${formatAstrologyDegreeText(item.degree)}${item.retrograde ? " Rx" : ""}`;
    rows.push({
      planet: ASTROLOGY_SWISS_PLANET_KO[key] || key,
      sign,
      house,
      degree,
    });
  }
  return rows;
}

function buildAstrologyMajorAspectsFromSwiss(swissChart) {
  const rows = Array.isArray(swissChart?.aspects) ? swissChart.aspects : [];
  return rows
    .filter((row) => ASTROLOGY_SWISS_PLANET_KO[row?.p1] && ASTROLOGY_SWISS_PLANET_KO[row?.p2])
    .map((row) => {
      const p1 = ASTROLOGY_SWISS_PLANET_KO[row.p1] || String(row.p1 || "").trim() || "행성";
      const p2 = ASTROLOGY_SWISS_PLANET_KO[row.p2] || String(row.p2 || "").trim() || "행성";
      const aspectLabel = ASTROLOGY_SWISS_ASPECT_LABEL[row?.type] || String(row?.type || "주요 각도").trim();
      const orbRaw = Number(row?.orb);
      const orbText = Number.isFinite(orbRaw) ? `${orbRaw.toFixed(2)}°` : "-";
      return {
        pair: `${p1} - ${p2} : ${aspectLabel} (orb ${orbText})`,
        aspect: aspectLabel,
        orb: orbText,
        _orbValue: Number.isFinite(orbRaw) ? orbRaw : 999,
      };
    })
    .sort((a, b) => a._orbValue - b._orbValue)
    .slice(0, 12)
    .map(({ _orbValue, ...rest }) => rest);
}

function buildAstrologyCoreSignsFromSwiss(swissChart) {
  const sun = formatAstrologySignLabel(swissChart?.planets?.Sun);
  const moon = formatAstrologySignLabel(swissChart?.planets?.Moon);
  const asc = formatAstrologySignLabel(swissChart?.ascendant);
  const mc = formatAstrologySignLabel(swissChart?.midheaven);

  let desc = "";
  const ascSign = Number(swissChart?.ascendant?.sign);
  const ascDegree = Number(swissChart?.ascendant?.degree);
  if (Number.isInteger(ascSign) && ascSign >= 0 && ascSign < 12) {
    const descSign = (ascSign + 6) % 12;
    desc = `${ASTROLOGY_SWISS_SIGN_KO[descSign]}(${ASTROLOGY_SWISS_SIGN_EMOJI[descSign]}) ${formatAstrologyDegreeText(ascDegree)}`;
  }

  return {
    sun,
    moon,
    asc,
    mc,
    desc,
  };
}

async function enrichAstrologyPromptResultWithSwiss(astrologyResult, env, requestUrl) {
  if (!astrologyResult || typeof astrologyResult !== "object") return astrologyResult;

  const needsPlacements = !hasValidAstrologyPlacements(astrologyResult);
  const needsAspects = !hasValidAstrologyAspects(astrologyResult);
  const coreSigns = astrologyResult.coreSigns && typeof astrologyResult.coreSigns === "object"
    ? astrologyResult.coreSigns
    : {};
  const needsCoreSigns = ["sun", "moon", "asc", "mc"].some((key) => isAstrologyPromptFieldMissing(coreSigns[key]));

  if (!needsPlacements && !needsAspects && !needsCoreSigns) {
    return astrologyResult;
  }

  const swissInput = normalizeAstrologyBirthForSwiss(astrologyResult);
  if (!swissInput) return astrologyResult;

  try {
    const getSwissWesternChart = await loadSwissWesternChart();
    const swissChart = await getSwissWesternChart(env, swissInput, { requestUrl });
    const enriched = { ...astrologyResult };

    if (needsPlacements) {
      const placementRows = buildAstrologyPlacementsFromSwiss(swissChart);
      if (placementRows.length > 0) enriched.placements = placementRows;
    }

    if (needsAspects) {
      const aspectRows = buildAstrologyMajorAspectsFromSwiss(swissChart);
      if (aspectRows.length > 0) enriched.majorAspects = aspectRows;
    }

    if (needsCoreSigns) {
      const swissCore = buildAstrologyCoreSignsFromSwiss(swissChart);
      enriched.coreSigns = {
        ...coreSigns,
        sun: isAstrologyPromptFieldMissing(coreSigns.sun) ? swissCore.sun : coreSigns.sun,
        moon: isAstrologyPromptFieldMissing(coreSigns.moon) ? swissCore.moon : coreSigns.moon,
        asc: isAstrologyPromptFieldMissing(coreSigns.asc) ? swissCore.asc : coreSigns.asc,
        mc: isAstrologyPromptFieldMissing(coreSigns.mc) ? swissCore.mc : coreSigns.mc,
        desc: isAstrologyPromptFieldMissing(coreSigns.desc) ? swissCore.desc : coreSigns.desc,
      };
    }

    return enriched;
  } catch (error) {
    console.warn("[fortune][astrology-ai-prompt] swiss enrichment skipped:", error?.message || error);
    return astrologyResult;
  }
}

async function handleAstrologyAIPrompt(request, auth, env) {
  // LLM 예산의 기산점. 인증·결제·Swiss 보강·프롬프트 구성에 쓴 시간만큼 생성 시간이 줄어든다.
  const startedAt = Date.now();
  const body = await readJson(request);
  const question = String(body?.question || "").trim();
  const domain = String(body?.domain || "").trim();
  const astrologyResult = await enrichAstrologyPromptResultWithSwiss(body?.astrologyResult, env, request.url);
  const compatibilityResult = body?.compatibilityResult;

  if (!question || question.length < 5 || question.length > 1000) {
    return buildAstrologyAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
  }

  if (!astrologyResult || typeof astrologyResult !== "object") {
    return buildAstrologyAIPromptError("MISSING_ASTROLOGY_RESULT", "기본 점성술 결과가 필요합니다.", 400);
  }

  // 분야별 템플릿 오버라이드는 동기 접근자 안쪽에서 읽히므로 빌드 전에 채워 둔다.
  // 실패해도 코드 기본 템플릿으로 그대로 진행한다(내부에서 삼킴).
  await primePromptTemplateOverrides(env);

  let builtPrompt = null;
  try {
    builtPrompt = domain
      ? buildAstrologyAIPromptWithDomain({
        question,
        astrologyResult,
        compatibilityResult,
        domain,
      })
      : buildAstrologyAIPrompt({
        question,
        astrologyResult,
        compatibilityResult,
      });
  } catch (error) {
    const code = String(error?.message || "").trim();
    if (code === "INVALID_QUESTION") {
      return buildAstrologyAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
    }
    if (code === "MISSING_ASTROLOGY_RESULT") {
      return buildAstrologyAIPromptError("MISSING_ASTROLOGY_RESULT", "기본 점성술 결과가 필요합니다.", 400);
    }
    if (code === "COMPATIBILITY_CONTEXT_REQUIRED") {
      return buildAstrologyAIPromptError(
        "COMPATIBILITY_CONTEXT_REQUIRED",
        "궁합 질문은 시나스트리 결과를 먼저 계산한 후 다시 시도해 주세요.",
        400,
      );
    }
    if (code === "UNKNOWN_ASTROLOGY_DOMAIN") {
      return buildAstrologyAIPromptError("INVALID_DOMAIN", "지원하지 않는 점성술 AI 주제(domain)입니다.", 400);
    }
    console.error("[fortune][astrology-ai-prompt] prompt build failed:", error);
    return buildAstrologyAIPromptError("PROMPT_GENERATION_FAILED", "프롬프트 생성 중 오류가 발생했습니다.", 500);
  }

  const digestBase = `${String(auth?.userId || "").trim()}:${ASTROLOGY_AI_PROMPT_FEATURE_KEY}:${builtPrompt.digestSource}`;
  const digestHex = (await sha256Hex(digestBase)) || String(Date.now());
  const payloadHash = ((await sha256Hex(builtPrompt.digestSource)) || digestHex).slice(0, 120);
  const fallbackRequestId = `${String(auth?.userId || "").trim()}:${ASTROLOGY_AI_PROMPT_FEATURE_KEY}:${digestHex}`.slice(0, 120);
  const requestId = readAIPromptRequestId(body, fallbackRequestId);

  let chargedCoins = 0;
  let sourceTransactionId = "";
  let isPointSpend = false;
  let isCardSpend = false;

  try {
    const delegatedRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "idempotency-key": requestId,
      }),
      body: JSON.stringify({
        featureKey: ASTROLOGY_AI_PROMPT_FEATURE_KEY,
        reason: "점성술 AI 질문 프롬프트 생성",
        requireExistingPaidAccess: true,
        requestId,
        categoryKey: "astrology",
        subFeatureKey: String(builtPrompt.domain || builtPrompt.questionType || "general").slice(0, 60),
        payloadHash,
        accessGrant: body?.accessGrant,
        accessDecision: body?.accessDecision,
        freeBySubscription: body?.freeBySubscription === true,
        consume: body?.consume,
        payment: body?.payment,
        _paymentContext: body?._paymentContext,
      }),
    });

    const consumeResponse = await handlePigCoinConsume(delegatedRequest, auth, { env });
    const consumePayload = await consumeResponse.json().catch(() => ({}));

    if (!consumeResponse.ok) {
      return mapAstrologyConsumeFailure(consumeResponse, consumePayload);
    }

    chargedCoins = Math.max(0, Number(consumePayload?.chargedCoins || 0));
    sourceTransactionId = String(consumePayload?.transactionId || "").trim();
    ({ isPointSpend, isCardSpend } = readSajuAIPromptPointRefundContext(consumePayload, body));
    const balanceAfterRaw = Number(consumePayload?.user?.points);
    const balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : undefined;

    // 결제 통과 후 서버가 직접 상담 답변을 생성한다(사주 상담과 동일 계약).
    // 실패 시 throw → 아래 catch가 자동 환불(결제 후 무결과 방지).
    const consultation = await runFeatureAiConsultation(env, {
      builtPrompt,
      deadlineAt: startedAt + FEATURE_AI_LLM_BUDGET_MS,
    });
    if (!consultation.ok) {
      const genError = new Error(consultation.error || "Astrology AI consultation generation failed.");
      genError.code = "LLM_GENERATION_RETRYABLE";
      throw genError;
    }

    return json({
      ok: true,
      resultText: consultation.text,
      // 결과를 본 사용자에게 생성 프롬프트도 추가 비용 없이 동봉한다.
      prompt: builtPrompt.prompt,
      generatedPrompt: builtPrompt.generatedPrompt || builtPrompt.prompt,
      title: builtPrompt.title || "점성술 심층 질문 프롬프트",
      summaryIntent: builtPrompt.summaryIntent || "",
      analysisAngles: Array.isArray(builtPrompt.analysisAngles) ? builtPrompt.analysisAngles : [],
      recommendedFollowUpQuestions: Array.isArray(builtPrompt.recommendedFollowUpQuestions)
        ? builtPrompt.recommendedFollowUpQuestions
        : [],
      caution: String(builtPrompt.caution || "").trim() || undefined,
      questionType: builtPrompt.questionType,
      chargedCoins,
      featureKey: ASTROLOGY_AI_PROMPT_FEATURE_KEY,
      balanceAfter,
      compatibilityUsed: Boolean(builtPrompt.compatibilityUsed),
      model: consultation.model,
      provider: consultation.provider,
    });
  } catch (error) {
    let refundAttempted = false;
    let refundOk = false;
    if (isPointSpend && chargedCoins > 0 && sourceTransactionId) {
      refundAttempted = true;
      try {
        const refundRequest = new Request(request.url, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            cost: chargedCoins,
            featureKey: ASTROLOGY_AI_PROMPT_FEATURE_KEY,
            sourceTransactionId,
            requestId: `refund:${requestId}`.slice(0, 120),
            reason: "Astrology AI consultation generation failed auto-refund",
          }),
        });
        const refundResponse = await handlePigCoinRefund(refundRequest, auth);
        refundOk = Boolean(refundResponse?.ok);
      } catch (refundError) {
        console.error("[fortune][astrology-ai-prompt] refund failed:", refundError);
      }
    } else if (isCardSpend && sourceTransactionId) {
      // 카드 단건 결제는 PointHistory 차감행이 없어 코인 환불이 반드시 409 로 실패한다.
      // PortOne 취소 정본으로 보낸다(결제 후 무결과 방지). 실패하면 refundOk=false 라
      // 기존처럼 PAID 로 남아 재시도 경로가 살아 있다.
      refundAttempted = true;
      const cardRefund = await refundAIPromptCardPaymentOnFailure({
        env,
        auth,
        paymentId: sourceTransactionId,
        featureKey: ASTROLOGY_AI_PROMPT_FEATURE_KEY,
        reasonCode: "ai_prompt_generation_failed",
        reasonMessage: "Astrology AI consultation generation failed auto-refund",
      });
      refundOk = cardRefund.refunded === true;
    }

    console.error("[fortune][astrology-ai-prompt] request failed:", error);
    // 일시 인프라(Mongo/네트워크) 오류만 503(자동재시도). LLM 생성 실패(이미 환불)는 500(수동재시도).
    if (error?.code !== "LLM_GENERATION_RETRYABLE" && isAIPromptTransientDbError(error)) {
      return buildAstrologyAIPromptError(
        "SERVICE_TEMPORARILY_UNAVAILABLE",
        "일시적인 오류로 처리가 지연되고 있어요. 잠시 후 자동으로 다시 시도합니다.",
        503,
      );
    }
    return buildAstrologyAIPromptError(
      "PROMPT_GENERATION_FAILED",
      buildAIPromptRetryMessage(refundOk),
      500,
      buildAIPromptRetryDetails({ refundAttempted, refundOk, requestId }),
    );
  }
}

async function handleVedicAIPrompt(request, auth, env) {
  // LLM 예산의 기산점. 인증·결제·프롬프트 구성에 쓴 시간만큼 생성 시간이 줄어든다.
  const startedAt = Date.now();
  const body = await readJson(request);
  const question = String(body?.question || "").trim();
  const vedicResult = body?.vedicResult;
  const compatibilityResult = body?.compatibilityResult;

  if (!question || question.length < 5 || question.length > 1000) {
    return buildVedicAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
  }

  if (!vedicResult || typeof vedicResult !== "object") {
    return buildVedicAIPromptError("MISSING_VEDIC_RESULT", "기본 베다 점성술 결과가 필요합니다.", 400);
  }

  // 분야별 템플릿 오버라이드는 동기 접근자 안쪽에서 읽히므로 빌드 전에 채워 둔다.
  // 실패해도 코드 기본 템플릿으로 그대로 진행한다(내부에서 삼킴).
  await primePromptTemplateOverrides(env);

  let builtPrompt = null;
  try {
    builtPrompt = buildVedicAIPrompt({
      question,
      vedicResult,
      compatibilityResult,
    });
  } catch (error) {
    const code = String(error?.message || "").trim();
    if (code === "INVALID_QUESTION") {
      return buildVedicAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
    }
    if (code === "MISSING_VEDIC_RESULT") {
      return buildVedicAIPromptError("MISSING_VEDIC_RESULT", "기본 베다 점성술 결과가 필요합니다.", 400);
    }
    if (code === "MISSING_COMPATIBILITY_RESULT") {
      return buildVedicAIPromptError(
        "MISSING_COMPATIBILITY_RESULT",
        "궁합 질문은 베다 궁합 계산 결과를 먼저 생성한 뒤 다시 시도해 주세요.",
        400,
      );
    }
    console.error("[fortune][vedic-ai-prompt] prompt build failed:", error);
    return buildVedicAIPromptError("PROMPT_GENERATION_FAILED", "프롬프트 생성 중 오류가 발생했습니다.", 500);
  }

  const digestBase = `${String(auth?.userId || "").trim()}:${VEDIC_AI_PROMPT_FEATURE_KEY}:${builtPrompt.digestSource}`;
  const digestHex = (await sha256Hex(digestBase)) || String(Date.now());
  const payloadHash = ((await sha256Hex(builtPrompt.digestSource)) || digestHex).slice(0, 120);
  const fallbackRequestId = `${String(auth?.userId || "").trim()}:${VEDIC_AI_PROMPT_FEATURE_KEY}:${digestHex}`.slice(0, 120);
  const requestId = readAIPromptRequestId(body, fallbackRequestId);

  let chargedCoins = 0;
  let sourceTransactionId = "";
  let isPointSpend = false;
  let isCardSpend = false;

  try {
    const delegatedRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "idempotency-key": requestId,
      }),
      body: JSON.stringify({
        featureKey: VEDIC_AI_PROMPT_FEATURE_KEY,
        reason: "베다 점성술 AI 질문 프롬프트 생성",
        requireExistingPaidAccess: true,
        requestId,
        categoryKey: "vedic",
        subFeatureKey: String(builtPrompt.questionType || "general").slice(0, 60),
        payloadHash,
        accessGrant: body?.accessGrant,
        accessDecision: body?.accessDecision,
        freeBySubscription: body?.freeBySubscription === true,
        consume: body?.consume,
        payment: body?.payment,
        _paymentContext: body?._paymentContext,
      }),
    });

    const consumeResponse = await handlePigCoinConsume(delegatedRequest, auth, { env });
    const consumePayload = await consumeResponse.json().catch(() => ({}));

    if (!consumeResponse.ok) {
      return mapVedicConsumeFailure(consumeResponse, consumePayload);
    }

    chargedCoins = Math.max(0, Number(consumePayload?.chargedCoins || 0));
    sourceTransactionId = String(consumePayload?.transactionId || "").trim();
    ({ isPointSpend, isCardSpend } = readSajuAIPromptPointRefundContext(consumePayload, body));
    const balanceAfterRaw = Number(consumePayload?.user?.points);
    const balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : undefined;

    // 결제 통과 후 서버가 직접 상담 답변을 생성한다(사주 상담과 동일 계약).
    // 실패 시 throw → 아래 catch가 자동 환불(결제 후 무결과 방지).
    const consultation = await runFeatureAiConsultation(env, {
      builtPrompt,
      deadlineAt: startedAt + FEATURE_AI_LLM_BUDGET_MS,
    });
    if (!consultation.ok) {
      const genError = new Error(consultation.error || "Vedic AI consultation generation failed.");
      genError.code = "LLM_GENERATION_RETRYABLE";
      throw genError;
    }

    return json({
      ok: true,
      resultText: consultation.text,
      // 결과를 본 사용자에게 생성 프롬프트도 추가 비용 없이 동봉한다.
      prompt: builtPrompt.prompt,
      generatedPrompt: builtPrompt.generatedPrompt || builtPrompt.prompt,
      title: builtPrompt.title || "베다 점성술 심층 질문 프롬프트",
      summaryIntent: builtPrompt.summaryIntent || "",
      analysisAngles: Array.isArray(builtPrompt.analysisAngles) ? builtPrompt.analysisAngles : [],
      recommendedFollowUpQuestions: Array.isArray(builtPrompt.recommendedFollowUpQuestions)
        ? builtPrompt.recommendedFollowUpQuestions
        : [],
      caution: String(builtPrompt.caution || "").trim() || undefined,
      questionType: builtPrompt.questionType,
      chargedCoins,
      featureKey: VEDIC_AI_PROMPT_FEATURE_KEY,
      balanceAfter,
      compatibilityUsed: Boolean(builtPrompt.compatibilityUsed),
      compatibilityHint: String(builtPrompt.compatibilityHint || ""),
      model: consultation.model,
      provider: consultation.provider,
    });
  } catch (error) {
    let refundAttempted = false;
    let refundOk = false;
    if (isPointSpend && chargedCoins > 0 && sourceTransactionId) {
      refundAttempted = true;
      try {
        const refundRequest = new Request(request.url, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            cost: chargedCoins,
            featureKey: VEDIC_AI_PROMPT_FEATURE_KEY,
            sourceTransactionId,
            requestId: `refund:${requestId}`.slice(0, 120),
            reason: "Vedic AI consultation generation failed auto-refund",
          }),
        });
        const refundResponse = await handlePigCoinRefund(refundRequest, auth);
        refundOk = Boolean(refundResponse?.ok);
      } catch (refundError) {
        console.error("[fortune][vedic-ai-prompt] refund failed:", refundError);
      }
    } else if (isCardSpend && sourceTransactionId) {
      // 카드 단건 결제는 PointHistory 차감행이 없어 코인 환불이 반드시 409 로 실패한다.
      // PortOne 취소 정본으로 보낸다(결제 후 무결과 방지). 실패하면 refundOk=false 라
      // 기존처럼 PAID 로 남아 재시도 경로가 살아 있다.
      refundAttempted = true;
      const cardRefund = await refundAIPromptCardPaymentOnFailure({
        env,
        auth,
        paymentId: sourceTransactionId,
        featureKey: VEDIC_AI_PROMPT_FEATURE_KEY,
        reasonCode: "ai_prompt_generation_failed",
        reasonMessage: "Vedic AI consultation generation failed auto-refund",
      });
      refundOk = cardRefund.refunded === true;
    }

    console.error("[fortune][vedic-ai-prompt] request failed:", error);
    // 일시 인프라(Mongo/네트워크) 오류만 503(자동재시도). LLM 생성 실패(이미 환불)는 500(수동재시도).
    if (error?.code !== "LLM_GENERATION_RETRYABLE" && isAIPromptTransientDbError(error)) {
      return buildVedicAIPromptError(
        "SERVICE_TEMPORARILY_UNAVAILABLE",
        "일시적인 오류로 처리가 지연되고 있어요. 잠시 후 자동으로 다시 시도합니다.",
        503,
      );
    }
    return buildVedicAIPromptError(
      "PROMPT_GENERATION_FAILED",
      buildAIPromptRetryMessage(refundOk),
      500,
      buildAIPromptRetryDetails({ refundAttempted, refundOk, requestId }),
    );
  }
}

async function handleSajuAIPrompt(request, auth, env, ctx = null) {
  // LLM 예산의 기산점. 인증·결제·명식 검증에 쓴 시간만큼 생성 시간이 줄어든다.
  const startedAt = Date.now();
  const body = await readJson(request);
  const question = String(body?.question || "").trim();
  const sajuResult = body?.sajuResult;
  const domain = String(body?.domain || "").trim();

  if (!question || question.length < 5 || question.length > 1000) {
    return buildSajuAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
  }

  if (!sajuResult || typeof sajuResult !== "object") {
    return buildSajuAIPromptError("MISSING_SAJU_RESULT", "기본 사주 분석 결과가 필요합니다.", 400);
  }

  // 분야별 템플릿 오버라이드는 동기 접근자 안쪽에서 읽히므로 빌드 전에 채워 둔다.
  // 실패해도 코드 기본 템플릿으로 그대로 진행한다(내부에서 삼킴).
  await primePromptTemplateOverrides(env);

  let builtPrompt = null;
  try {
    const calibration = body?.calibration;
    builtPrompt = domain
      ? buildSajuAIPromptWithDomain({ question, sajuResult, domain, calibration })
      : buildSajuAIPrompt({ question, sajuResult, calibration });
  } catch (error) {
    const code = String(error?.message || "").trim();
    if (code === "INVALID_QUESTION") {
      return buildSajuAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
    }
    if (code === "MISSING_SAJU_RESULT") {
      return buildSajuAIPromptError("MISSING_SAJU_RESULT", "기본 사주 분석 결과가 필요합니다.", 400);
    }
    if (code.startsWith("UNKNOWN_SAJU_DOMAIN:")) {
      return buildSajuAIPromptError("INVALID_DOMAIN", "지원하지 않는 사주 AI 주제(domain)입니다.", 400);
    }
    console.error("[fortune][saju-ai-prompt] prompt build failed:", error);
    return buildSajuAIPromptError("PROMPT_GENERATION_FAILED", "상담문 생성 준비 중 오류가 발생했습니다.", 500);
  }

  const profileId = resolveSajuAIProfileIdForConsultation(body, sajuResult);
  console.info("[SajuMyeongsikAI] fact snapshot built", {
    requestId: String(body?.requestId || "").slice(0, 120),
    profileId,
    promptVersion: builtPrompt.promptVersion || SAJU_AI_PROMPT_VERSION,
    dayStem: builtPrompt.factSnapshot?.dayMaster?.stem || "",
  });
  console.info("[SajuMyeongsikAI] category rubric selected", {
    requestId: String(body?.requestId || "").slice(0, 120),
    promptVersion: builtPrompt.promptVersion || SAJU_AI_PROMPT_VERSION,
    domain: builtPrompt.domain || "",
    category: builtPrompt.categoryRubric?.label || "",
  });
  const digestBase = `${String(auth?.userId || "").trim()}:${SAJU_AI_PROMPT_FEATURE_KEY}:${builtPrompt.digestSource}`;
  const digestHex = (await sha256Hex(digestBase)) || String(Date.now());
  const payloadHash = ((await sha256Hex(builtPrompt.digestSource)) || digestHex).slice(0, 120);
  const fallbackRequestId = `${String(auth?.userId || "").trim()}:${SAJU_AI_PROMPT_FEATURE_KEY}:${digestHex}`.slice(0, 120);
  const requestId = readAIPromptRequestId(body, fallbackRequestId);
  const promptDigest = ((await sha256Hex(builtPrompt.prompt || builtPrompt.generatedPrompt || builtPrompt.digestSource)) || payloadHash).slice(0, 64);
  const resultId = buildSajuAIResultId(requestId, promptDigest);

  let preflightAccess = null;
  try {
    // 선검사 read를 withMongoRetry로 감싸 일시적 Mongo 버스트를 흡수한다(handleZiweiAIPrompt와 동일 관례).
    preflightAccess = await withMongoRetry(env, () => findAIPromptPaidAccessEvidence({
      auth,
      featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
      body,
      requestId,
      cost: SAJU_AI_PROMPT_PRICE,
      env,
    }));
  } catch (error) {
    if (isSajuAIPromptDbUnavailableError(error)) {
      return buildSajuAIPromptPaidAccessRetryableError();
    }
    console.error("[fortune][saju-ai-prompt] paid access verification failed:", error);
    return buildSajuAIPromptError(
      "PAYMENT_VERIFY_FAILED",
      "결제 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      500,
    );
  }
  if (!preflightAccess) {
    return buildSajuAIPromptPaymentRequiredError();
  }

  let consumePayload = null;
  let chargedCoins = 0;
  let membershipCreditCost = 0;
  let balanceAfter = undefined;
  let paymentIdentity = { paymentId: "", orderId: "" };
  try {
    const delegatedRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "idempotency-key": requestId,
      }),
      body: JSON.stringify({
        featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
        reason: "사주 전문가 상담 결과 생성",
        requireExistingPaidAccess: true,
        requestId,
        categoryKey: "saju",
        subFeatureKey: String(builtPrompt.domain || builtPrompt.questionType || "general").slice(0, 60),
        payloadHash,
        transactionId: body?.transactionId,
        ledgerId: body?.ledgerId,
        purchaseId: body?.purchaseId,
        idempotencyKey: body?.idempotencyKey,
        accessType: body?.accessType,
        accessMethod: body?.accessMethod,
        paymentMode: body?.paymentMode,
        accessGrant: body?.accessGrant,
        accessDecision: body?.accessDecision,
        freeBySubscription: body?.freeBySubscription === true,
        consume: body?.consume,
        payment: body?.payment,
        _paymentContext: body?._paymentContext,
      }),
    });

    const consumeResponse = await handlePigCoinConsume(delegatedRequest, auth, { env });
    consumePayload = await consumeResponse.json().catch(() => ({}));
    if (!consumeResponse.ok) {
      return mapSajuConsumeFailure(consumeResponse, consumePayload);
    }
    chargedCoins = Math.max(0, Number(consumePayload?.chargedCoins || consumePayload?.consume?.chargedCoins || 0));
    membershipCreditCost = Math.max(0, Number(consumePayload?.membershipCreditCost || consumePayload?.consume?.membershipCreditCost || 0));
    const balanceAfterRaw = Number(consumePayload?.user?.points);
    balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : undefined;
    paymentIdentity = readSajuAIPromptPaymentIdentity(consumePayload, body, requestId);
  } catch (error) {
    console.error("[fortune][saju-ai-prompt] paid consume verification failed:", error);
    return buildSajuAIPromptError(
      "PAYMENT_VERIFY_FAILED",
      "결제 권한 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      500,
    );
  }

  // 같은 requestId 재-POST는 완료본 재열람(즉시 200) 또는 진행 중 재연결(202)로 흡수한다.
  // 위 소비 위임은 requestId 멱등이라 재차감이 없고, stale(생성 최악치 초과) 레코드만 아래 begin이 인계한다.
  const sajuExecutionId = buildSajuAIPromptExecutionId({ userId: String(auth?.userId || "").trim(), profileId, requestId });
  let existingExecution = null;
  try {
    existingExecution = await findSajuAIExecutionForRead({ auth, jobId: sajuExecutionId, resultId, requestId, profileId });
    if (existingExecution?.status === "completed") {
      const stored = normalizeSajuAIStoredResult(existingExecution);
      if (stored) return json(stored);
    }
    if (existingExecution?.status === "generating" && !isSajuAIPromptStaleGeneratingExecution(existingExecution)) {
      return json(buildSajuAIStatusPayload(existingExecution), { status: 202 });
    }
  } catch (error) {
    console.warn("[fortune][saju-ai-prompt] execution reconnect lookup failed:", error?.message || error);
  }
  // 생성 시작 표시 — 이 레코드가 있어야 클라이언트 /status 폴링이 404 대신 202로 수렴한다.
  await beginSajuAIConsultationGeneratingRecord({
    auth,
    body,
    profileId,
    requestId,
    resultId,
    consumePayload,
    paymentIdentity,
    chargedCoins,
    membershipCreditCost,
    env,
  });

  logSajuAIPromptStage("LLM_JOB_STARTED", {
    userId: auth.userId,
    requestId,
    paymentId: paymentIdentity.paymentId,
    orderId: paymentIdentity.orderId,
    accessMethod: normalizeSajuAIPromptAccessMethod(consumePayload, body),
    amountCoins: SAJU_AI_PROMPT_PRICE,
    amountKRW: SAJU_AI_PROMPT_AMOUNT_KRW,
  });

  // 결정적(생년월일 기반) 사주 해석 → LLM 응답 캐시 + in-flight dedup.
  // 차감(위)·저장(아래)은 그대로 실행되고 캐시 히트 시 Gemini 호출만 건너뛴다.
  // 이미 한 번 실패한 requestId 는 캐시를 읽지 않는다. 캐시는 품질 검증 이전 단계라 검증에서 떨어진
  // 응답도 저장되고, 무료 재생성이 같은 키로 그 응답을 다시 받아 30일 내내 같은 실패를 반복한다.
  // 쓰기는 그대로 둔다 — 성공한 재생성이 같은 키를 덮어써 스스로 낫는다.
  // 같은 판정에서 환불 스트라이크도 함께 결정한다(아래 catch). 캐시 건너뛰기보다 좁다 — 상세는 헬퍼 주석.
  const { refundOnFailure, skipCacheRead } = resolveSajuAIPromptFailureBilling(existingExecution);
  const sajuLlmCache = {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: builtPrompt.promptVersion || SAJU_AI_PROMPT_VERSION,
    skipRead: skipCacheRead || undefined,
  };

  // LLM 생성 전체(성공 저장·실패 환불·레코드 마킹 포함)를 클로저로 묶는다 — ctx가 있으면 즉시 202 후
  // 백그라운드(waitUntil)에서 완주하고, 없으면(테스트/로컬) 기존 동기 계약 그대로 이 Response를 반환한다.
  const sajuDeadlineAt = startedAt + FEATURE_AI_LLM_BUDGET_MS;
  const runGeneration = async () => {
  try {
    let finalAi = null;
    let finalText = "";
    let lastValidation = null;
    // validateSajuAIResultText는 실패 분기에서 text를 채우지 않으므로(성공 시에만 정규화된
    // 텍스트를 반환), 경량 보장 계약(품질 게이트 미통과라도 렌더 가능한 후보는 버리지 않음)의
    // salvage 판정은 lastValidation?.text가 아니라 이 후보 텍스트를 직접 추적해야 한다.
    let lastCandidateText = "";

    const promptVersion = builtPrompt.promptVersion || SAJU_AI_PROMPT_VERSION;
    const { sectionResults, assembledText, ai: sectionAi } = await runSajuAISectionWaves(env, {
      builtPrompt,
      systemPrompt: await cmsPromptText(env, "saju-ai-result", SAJU_AI_RESULT_SYSTEM_PROMPT),
      cache: sajuLlmCache,
      deadlineAt: sajuDeadlineAt,
      requestId,
      promptVersion,
    });
    const usableGroups = sectionResults.filter((row) => row.text);
    if (assembledText) lastCandidateText = assembledText;
    finalAi = sectionAi;

    lastValidation = assembledText
      ? validateSajuAIResultText(assembledText, builtPrompt.factSnapshot, {
        domain: builtPrompt.domain,
        categoryRubric: builtPrompt.categoryRubric,
      })
      : { ok: false, reason: finalAi?.message || finalAi?.error || "LLM 생성 실패" };

    if (!lastValidation.ok && lastValidation.tenGodMismatches?.length) {
      console.warn("[SajuMyeongsikAI] validation mismatch", {
        requestId,
        promptVersion,
        mismatchCount: lastValidation.tenGodMismatches.length,
      });
    }
    if (lastValidation.ok) {
      finalText = lastValidation.text;
      console.info("[SajuMyeongsikAI] quality validation passed", {
        requestId,
        promptVersion,
        chapterCount: lastValidation.chapterCount,
        categoryMatches: lastValidation.categoryMatches,
        visibleChars: countSajuAIVisibleChars(finalText),
        groups: usableGroups.length,
      });
    }

    // 경량 보장 계약: 십성 검증 등 품질 기준 미통과라도, LLM이 렌더 가능한 상담문을 냈다면
    // 버리지 않고 degrade로 전달한다(결제 후 무결과 방지). 진짜 빈 결과일 때만 재시도 신호.
    if (finalAi?.ok && !finalText && hasRenderableLlmText(lastCandidateText, { minChars: 400 })) {
      finalText = lastCandidateText;
    }

    if (!finalAi?.ok || !finalText) {
      console.error("[fortune][saju-ai-prompt] llm generation failed:", {
        requestId,
        promptDigest,
        error: finalAi?.error || "",
        message: finalAi?.message || "",
        validation: lastValidation?.reason || "",
      });
      const generationError = new Error(lastValidation?.reason || finalAi?.message || finalAi?.error || "Saju AI result generation failed.");
      generationError.code = "LLM_GENERATION_RETRYABLE";
      throw generationError;
    }

    const resultPayload = buildSajuAIPromptResultPayload({
      builtPrompt,
      resultText: finalText,
      consumePayload,
      chargedCoins,
      balanceAfter,
      requestId,
      domain,
      promptDigest,
      resultId,
      question,
      profileId,
      model: finalAi.model || undefined,
      provider: finalAi.provider || undefined,
    });
    const savedRecord = await saveSajuAIConsultationResultRecord({
      auth,
      body,
      profileId,
      requestId,
      resultId,
      resultPayload,
      builtPrompt,
      consumePayload,
      paymentIdentity,
      promptDigest,
      env,
    });
    resultPayload.saved = true;
    resultPayload.jobId = savedRecord?.executionId || resultPayload.jobId;
    resultPayload.executionId = savedRecord?.executionId || resultPayload.executionId;
    logSajuAIPromptStage("LLM_JOB_COMPLETED", {
      userId: auth.userId,
      requestId,
      paymentId: paymentIdentity.paymentId,
      orderId: paymentIdentity.orderId,
    });
    console.info("[SajuMyeongsikAI] result saved", {
      requestId,
      resultId,
      promptVersion: builtPrompt.promptVersion || SAJU_AI_PROMPT_VERSION,
      profileId,
    });
    return json(resultPayload);
  } catch (error) {
    // 2-스트라이크: 1차 실패는 결제를 그대로 두고 무료 재시도를 연다(resolveSajuAIPromptFailureBilling 주석).
    const monthlyRefund = refundOnFailure
      ? await refundSajuAIPromptMonthlyCredit({ auth, consumePayload, body, requestId, error }).catch((refundError) => {
        console.error("[fortune][saju-ai-prompt] monthly credit refund failed:", refundError);
        return { attempted: true, refundOk: false };
      })
      : { attempted: false, refundOk: false };
    const pointRefundContext = readSajuAIPromptPointRefundContext(consumePayload, body);
    let pointRefund = { attempted: false, refundOk: false };
    if (!refundOnFailure) {
      // 결제 보존 — 아래 두 갈래(코인 환불 / 카드 취소)를 건너뛴다.
    } else if (pointRefundContext.isPointSpend && pointRefundContext.chargedCoins > 0 && pointRefundContext.sourceTransactionId) {
      pointRefund = { attempted: true, refundOk: false };
      try {
        const refundRequest = new Request(request.url, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            cost: pointRefundContext.chargedCoins,
            featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
            sourceTransactionId: pointRefundContext.sourceTransactionId,
            requestId: `refund:${requestId}`.slice(0, 120),
            reason: "Saju AI prompt generation failed auto-refund",
          }),
        });
        const refundResponse = await handlePigCoinRefund(refundRequest, auth);
        pointRefund.refundOk = refundResponse.ok;
      } catch (refundError) {
        console.error("[fortune][saju-ai-prompt] point refund failed:", refundError);
      }
    } else if (pointRefundContext.isCardSpend && pointRefundContext.sourceTransactionId) {
      // 카드 단건 결제는 PointHistory 차감행이 없어 코인 환불이 반드시 409 로 실패한다.
      // PortOne 취소 정본으로 보낸다(결제 후 무결과 방지).
      const cardRefund = await refundAIPromptCardPaymentOnFailure({
        env,
        auth,
        paymentId: pointRefundContext.sourceTransactionId,
        featureKey: SAJU_AI_PROMPT_FEATURE_KEY,
        reasonCode: "ai_prompt_generation_failed",
        reasonMessage: "Saju AI prompt generation failed auto-refund",
      });
      pointRefund = { attempted: true, refundOk: cardRefund.refunded === true };
    }
    console.error("[fortune][saju-ai-prompt] request failed:", error);
    logSajuAIPromptStage("LLM_JOB_FAILED", {
      userId: auth.userId,
      requestId,
      paymentId: paymentIdentity.paymentId,
      orderId: paymentIdentity.orderId,
      errorName: error?.name || error?.code || "Error",
      errorMessage: error?.message || error,
    });
    // 🔴 환불을 "시도"한 것과 "성공"한 것을 구분한다. 시도만 하고 실패했다면 결제행은 그대로 유효하므로
    // 환불됐다고 답하면 거짓이고, 증빙을 버리게 만들면 살아 있는 결제가 미아가 된다 — 보존 계약으로 답한다.
    const refunded = refundOnFailure && Boolean(monthlyRefund.refundOk || pointRefund.refundOk);
    // 백그라운드(waitUntil) 실행에서도 실패가 클라이언트 /status 폴링에 전달되도록 레코드에 기록한다.
    await withMongoRetry(env, () => PaidExecutionRecord.updateOne(
      { executionId: sajuExecutionId },
      {
        $set: {
          status: "generation_failed",
          error: {
            // 이 코드는 /status 폴링으로 그대로 나가 클라이언트의 종결 처리를 가른다
            // (보존=추가 결제 없이 재생성 / 환불=일반 구매 흐름 복귀).
            code: refunded ? "GENERATION_FAILED_REFUNDED" : "LLM_GENERATION_RETRYABLE",
            message: String(error?.message || error || "generation failed").slice(0, 500),
          },
          // paymentStatus 는 buildSajuAIStatusPayload 의 retryable 판정 근거다(PAID 일 때만 true).
          ...(refunded ? { "result.order.paymentStatus": "REFUNDED" } : {}),
          "result.progress": buildSajuAIProgress(
            0,
            "failed",
            refunded
              ? "상담 생성에 거듭 실패해 결제를 자동 환불했어요. 다시 시도하면 새로 결제됩니다."
              : "상담 생성에 실패했어요. 결제 권한은 보존되니 다시 시도해 주세요.",
          ),
        },
      },
    )).catch(() => {});
    return buildSajuAILlmRetryableError({
      chargedCoins,
      membershipCreditCost,
      accessMethod: consumePayload?.accessMethod || consumePayload?.consume?.accessMethod,
      paymentMode: consumePayload?.paymentMode || consumePayload?.consume?.paymentMode,
      refundAttempted: Boolean(monthlyRefund.attempted || pointRefund.attempted),
      refundOk: refunded,
      refunded,
      requestId,
      resultId,
    });
  }
  };

  // 동기 생성: 요청 안에서 완결해 완료 결과를 바로 반환한다. waitUntil 백그라운드+/status 폴링은 공유 DB 연결을
  // 여러 요청이 재사용하게 만들어 Cloudflare Workers 요청 간 I/O 격리로 결과가 고착되던 문제가 있어 쓰지 않는다(네오와 동일).
  return await runGeneration();
}

async function handleSajuAIConsultationStatus(request, auth, path = "") {
  const url = new URL(request.url);
  const pathJobId = String(path || "").replace(/^\/saju-ai-consultation\/status\/?/, "").trim();
  const jobId = decodeURIComponent(String(url.searchParams.get("jobId") || pathJobId || "").trim());
  const requestId = String(url.searchParams.get("requestId") || "").trim();
  const profileId = String(url.searchParams.get("profileId") || url.searchParams.get("selectedProfileId") || "").trim();
  const found = await findSajuAIExecutionForRead({ auth, jobId, requestId, profileId });
  if (!found) {
    return buildSajuAIPromptError("JOB_NOT_FOUND", "상담 생성 상태를 찾을 수 없습니다.", 404);
  }
  const record = await reapStaleSajuAIExecution(found, { requestId, jobId, route: "status" });
  return json(buildSajuAIStatusPayload(record), { status: record.status === "completed" ? 200 : record.status === "generation_failed" ? 503 : 202 });
}

// 명식 근거만 계산해 돌려준다. 프롬프트 빌더를 그대로 태워, 상담문이 인용할 확정값과 같은 원본을 쓴다.
async function handleSajuAIConsultationBasis(request) {
  const body = await readJson(request);
  const sajuResult = body?.sajuResult;
  if (!sajuResult || typeof sajuResult !== "object") {
    return buildSajuAIPromptError("INVALID_INPUT", "명식 데이터가 필요합니다.", 400);
  }
  try {
    // 대기 화면의 실시간 근거 미리보기는 질문을 아직 입력하기 전에도 호출된다(question: '').
    // buildSajuAIPrompt 는 프롬프트용 질문 분류 때문에 5자 이상을 요구하므로, 여기서 반환하는
    // analysisBasis(질문과 무관하게 factSnapshot에서만 파생)에는 영향 없는 자리표시 질문으로 채운다.
    const question = String(body?.question || "").trim() || "명식 근거 확인";
    const built = buildSajuAIPrompt({ question, sajuResult });
    if (!built?.analysisBasis) return buildSajuAIPromptError("CALCULATION_FAILED", "명식 근거를 계산하지 못했습니다.", 503);
    return json(built.analysisBasis);
  } catch (error) {
    console.warn("[saju-ai] basis failed", String(error?.message || error).slice(0, 200));
    return buildSajuAIPromptError("CALCULATION_FAILED", "명식 근거를 계산하지 못했습니다.", 503);
  }
}

async function handleSajuAIConsultationResult(request, auth, path = "") {
  const url = new URL(request.url);
  const pathResultId = String(path || "").replace(/^\/saju-ai-consultation\/result\/?/, "").trim();
  const resultId = decodeURIComponent(String(url.searchParams.get("resultId") || pathResultId || "").trim());
  const jobId = String(url.searchParams.get("jobId") || "").trim();
  const requestId = String(url.searchParams.get("requestId") || "").trim();
  const profileId = String(url.searchParams.get("profileId") || url.searchParams.get("selectedProfileId") || "").trim();
  const found = await findSajuAIExecutionForRead({ auth, jobId, resultId, requestId, profileId });
  if (!found) {
    return buildSajuAIPromptError("RESULT_NOT_FOUND", "저장된 사주 전문가 상담 결과를 찾을 수 없습니다.", 404);
  }
  const record = await reapStaleSajuAIExecution(found, { requestId, jobId, resultId, route: "result" });
  if (record.status !== "completed") {
    return json(buildSajuAIStatusPayload(record), { status: record.status === "generation_failed" ? 503 : 202 });
  }
  const stored = normalizeSajuAIStoredResult(record);
  if (!stored) {
    return buildSajuAIPromptError("RESULT_NOT_FOUND", "저장된 사주 전문가 상담 결과가 비어 있습니다.", 404);
  }
  return json(stored);
}

// 일시적 인프라(Mongo 버스트/op-타임아웃/네트워크) 오류 판별 — 사주와 동일 시그니처 재사용.
// ⚠️ LLM 생성 실패(code: LLM_GENERATION_RETRYABLE)는 메시지에 "timeout"이 섞일 수 있으므로
//    호출부에서 반드시 code로 먼저 제외한 뒤에만 이 판별을 적용한다(자동재시도 이중차감 방지).
function isAIPromptTransientDbError(error) {
  return isSajuAIPromptDbUnavailableError(error);
}

// 생성 실패 시 "다시 시도하면 또 결제되는가"를 사용자에게 정확히 알린다.
// 환불했으면 재결제, 결제 권한이 남아 있으면 추가 결제 없이 재시도다.
function buildAIPromptRetryMessage(refundOk) {
  return refundOk
    ? "상담 생성에 실패해 결제를 환불했습니다. 다시 시도하시면 새로 결제됩니다."
    : "상담 생성 중 오류가 발생했습니다. 결제 권한은 보존되어 있으니 추가 결제 없이 다시 시도할 수 있습니다.";
}

/**
 * paymentRetainedForRetry 는 프론트가 결제 증거를 보관해 재결제 없이 재시도할지 판정하는 유일한 신호다.
 * 구버전 워커 응답에는 이 필드가 없으므로 프론트는 자동으로 보관하지 않는다(fail-closed).
 */
function buildAIPromptRetryDetails({ refundAttempted, refundOk, requestId }) {
  return {
    refundAttempted: Boolean(refundAttempted),
    refundOk: Boolean(refundOk),
    retryable: true,
    paymentRetainedForRetry: !refundOk,
    requestId: String(requestId || ""),
  };
}

// ── 기본 코스믹 상담(자미두수·베다·점성술·숙요점) 공용 LLM 생성 ──────────────
// 사주 상담(handleSajuAIPrompt)과 동일한 "질문 → 서버가 직접 답변 생성" 계약을,
// 사주 전용 십성/챕터 검증 없이 일반화한다. 각 기능의 builtPrompt.generatedPrompt는
// 이미 [답변 형식]까지 포함한 완결형 LLM 지시문(buildFortuneQuestionPromptPackage)이므로
// 가볍게 감싸 그대로 호출하고, 잘림은 이어쓰기 repair로 완결시킨다(중간 끊김 방지).
/** 관리자 CMS 기본값 노출용(worker/lib/cms-prompt-defaults.js). */
export function getDefaultFeatureAiResultSystemPrompt() {
  return FEATURE_AI_RESULT_SYSTEM_PROMPT;
}

const FEATURE_AI_RESULT_SYSTEM_PROMPT = [
  "당신은 해당 분야(자미두수·베다 점성술·서양 점성술·숙요점 등)의 최고 수준 상담가입니다.",
  "제공된 명반/차트/데이터만 근거로 상담하고, 없는 수치를 지어내거나 임의로 재계산하지 않습니다.",
  "짧은 운세 문장이 아니라 실제 유료 상담처럼 깊이 있게, 질문에 먼저 답한 뒤 근거와 흐름을 풀어 줍니다.",
  "겁주거나 단정하지 말고 가능성과 경향성 중심으로, 따뜻하지만 명확한 존댓말 조언체로 씁니다.",
  "각 항목을 끝까지 닫고 마지막 문장까지 자연스럽게 완결하며, 중간에 끊기지 않게 합니다.",
  "'프롬프트', '기능', '내부 지시문', '분석 데이터' 같은 메타 표현은 쓰지 말고, 전문가가 직접 상담하듯 작성하세요.",
].join("\n");

function buildFeatureAiResultPrompt(builtPrompt, options = {}) {
  const internalPrompt = String(builtPrompt?.generatedPrompt || builtPrompt?.prompt || "").trim();
  const repairReason = String(options?.repairReason || "").trim();
  return [
    "아래는 최종 상담 결과를 만들기 위한 생성 지시문입니다. 사용자에게는 보여주지 않습니다.",
    "이 지시문을 그대로 따라, 사용자에게 건네는 최종 상담문만 한국어로 작성하세요.",
    "지시문 안의 [답변 형식] 순서를 지키되, 첫 부분에서 타고난 성향 총론을 먼저 짚어 신뢰가 서게 시작하세요.",
    "각 항목을 끝까지 닫고, 마지막 문장까지 자연스럽게 완결하세요. 중간에 끊기면 안 됩니다.",
    repairReason ? `이전 생성문 보정 사유: ${repairReason}` : "",
    "생성 지시문:",
    internalPrompt,
  ].filter(Boolean).join("\n\n").trim();
}

// ── 동기 LLM 생성의 시간 예산 ────────────────────────────────────────────────
// 이 파일의 상담 라우트는 요청 안에서 생성을 끝내고 응답한다. 엣지는 100s(EDGE_RESPONSE_DEADLINE_MS)에
// 요청을 끊으므로, LLM 대기가 그보다 길면 라우트가 실패를 판정하기도 전에 잘려 나가 catch 의 자동
// 환불조차 실행되지 못한다(결제 후 무결과·무환불). 그래서 대기는 반드시 엣지보다 먼저 끝나야 한다.

/** 요청 시작 기준 LLM 총 예산. 남는 20s 는 결과 저장·실패 시 자동 환불 Mongo 왕복 몫이다. */
const FEATURE_AI_LLM_BUDGET_MS = 80000;
/**
 * Workers AI 폴백에는 timeoutMs 가 걸리지 않는다(lib/llm-client.ts callCloudflareWorkersAI 는
 * AbortSignal 없이 env.AI.run 을 호출한다). 폴백이 붙어도 예산 안에서 끝나도록 Gemini 대기치에서
 * 그 몫을 미리 뗀다.
 */
const FEATURE_AI_FALLBACK_RESERVE_MS = 12000;
/** 풀 생성 1회 대기 상한. gemini-2.5-flash ~200tok/s 기준 10,000토큰(=50s) + TTFT·속도변동 여유. */
const FEATURE_AI_PRIMARY_TIMEOUT_MS = 60000;
/** 이어쓰기 repair 상한. 꼬리만 채우므로 6,000토큰(=30s)이면 충분하다. */
const FEATURE_AI_REPAIR_TIMEOUT_MS = 32000;
/** 이보다 짧게밖에 못 기다리면 호출해도 잘려서 빈손이 된다(비스트리밍 abort 는 부분 텍스트가 0). */
const FEATURE_AI_MIN_CALL_MS = 15000;
/** 2회차 풀 생성은 1회차가 빠르게 하드 실패했을 때만 의미가 있다. */
const FEATURE_AI_RETRY_MIN_REMAINING_MS = 45000;
/** 폴백 수용 문턱 = 목표 분량(10,000토큰 ÷ 1.5 ≈ 6,600자)의 40%. CLAUDE.md 의 fallbackMinChars 관례. */
const FEATURE_AI_FALLBACK_MIN_CHARS = 2500;

// ── 사주 그룹 병렬 생성 예산 ───────────────────────────────────────────────
// 🔴 위 FEATURE_AI_* 는 형제 4종(자미두수·점성술·베다·숙요 AI 질문 상담)이 공유하는
//    runFeatureAiConsultation 의 값이다. 사주만 그룹 병렬로 가므로 아래를 따로 둔다 —
//    위 값들을 사주에 맞춰 바꾸면 형제 넷이 함께 끌려간다.
/** 웨이브1 그룹 1회 대기 상한. 9,600토큰(=48s) + 병렬이라 벽시계는 가장 느린 그룹 하나. */
const SAJU_AI_SECTION_TIMEOUT_MS = 48000;
/** 웨이브2 대기 상한. 48s + 30s = 78s 로 총예산 80s 안에 들어온다. */
const SAJU_AI_SECTION_REPAIR_TIMEOUT_MS = 30000;
/** 이만큼도 안 남았으면 웨이브2를 시작하지 않는다 — 시작해 놓고 잘리면 그 호출은 통째로 버려진다. */
const SAJU_AI_SECTION_REPAIR_MIN_REMAINING_MS = 28000;
/** 웨이브2는 30s 안에 끝나야 하므로 상한을 낮춘다(6,000토큰 ≈ 4,000자 ≥ 그룹 minChars 3,000자). */
const SAJU_AI_SECTION_REPAIR_MAX_OUTPUT_TOKENS = 6000;

/**
 * 남은 예산 안에서만 기다린다. 0을 돌려주면 호출부가 그 호출을 건너뛴다.
 * 🔴 clampSyncLlmTimeoutMs 는 0/음수를 받으면 상한 85s 로 되돌아가므로 반드시 그 앞에서 막는다.
 */
function featureAiCallTimeoutMs(deadlineAt, capMs, fallbackReserveMs = FEATURE_AI_FALLBACK_RESERVE_MS) {
  const budget = deadlineAt - Date.now() - fallbackReserveMs;
  if (budget < FEATURE_AI_MIN_CALL_MS) return 0;
  return clampSyncLlmTimeoutMs(Math.min(capMs, budget));
}

function buildFeatureAiCompletionRepairPrompt(partialText) {
  return [
    "아래 상담문은 중간에 끊겼거나 마지막까지 완성되지 않았습니다.",
    "기존 내용을 반복하지 말고, 끊긴 지점 이후부터 자연스럽게 이어서 남은 부분과 마무리를 완성하세요.",
    "'프롬프트', '기능' 같은 메타 표현은 쓰지 마세요.",
    "기존 상담문:",
    String(partialText || "").trim(),
    "이어쓰기 지시: 위 내용을 반복하지 말고 이어질 본문만 작성하고, 마지막은 따뜻하지만 가볍지 않게 닫으세요.",
  ].filter(Boolean).join("\n\n").trim();
}

// 반환: { ok, text, model, provider, truncated }. ok=false면 호출부(핸들러)가 throw해
// 기존 결제 환불 catch 경로로 넘겨 결제 후 무결과를 막는다.
async function runFeatureAiConsultation(env, {
  builtPrompt,
  systemPrompt = FEATURE_AI_RESULT_SYSTEM_PROMPT,
  // 200tok/s 기준 50s. 구 16000(=80s)은 엣지 안쪽 어떤 타임아웃으로도 채울 수 없는 상한이라,
  // 목표가 아니라 "느린 생성이 abort 를 지나쳐 달리게 두는 장치"로만 작동했다.
  baseTokens = 10000,
  // 요청 시작 기준 예산. 호출부가 인증·결제에 쓴 시간만큼 생성 시간이 줄어든다.
  deadlineAt = Date.now() + FEATURE_AI_LLM_BUDGET_MS,
} = {}) {
  let finalAi = null;
  let finalText = "";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    // 2회차 풀 시도는 예산이 실제로 남았을 때만. 1회차가 타임아웃으로 끝났다면 여기서 멈춘다 —
    // 같은 이유로 또 타임아웃 날 뿐이고, 그 사이 엣지가 환불 경로를 잘라 간다.
    if (attempt > 0 && deadlineAt - Date.now() < FEATURE_AI_RETRY_MIN_REMAINING_MS) break;
    // 예산 소진 → 호출을 건너뛰고 지금까지 확보한 텍스트로 degrade(throw 금지).
    const timeoutMs = featureAiCallTimeoutMs(deadlineAt, FEATURE_AI_PRIMARY_TIMEOUT_MS);
    if (!(timeoutMs > 0)) {
      console.warn("[feature-ai] llm budget exhausted before generation");
      break;
    }
    const prompt = buildFeatureAiResultPrompt(builtPrompt, {
      repairReason: attempt > 0 ? "이전 응답이 중간에 끊겼거나 비었습니다. 처음부터 끝까지 완결해 주세요." : "",
    });
    const ai = await callGeminiText(env, prompt, {
      systemPrompt: await cmsPromptText(env, "feature-ai-result", systemPrompt),
      taskType: "fortune",
      temperature: attempt > 0 ? 0.5 : 0.56,
      // 단일 질문 상담(약 9개 섹션) 기준 상한 — 잘리면 아래 이어쓰기 repair 가 덧붙인다.
      maxOutputTokens: baseTokens,
      timeoutMs,
      // 폴백은 켜 둔다(Gemini 장애 시 안전망). 단 목표 분량의 40%에 못 미치는 스텁이
      // 유료 결과로 전달되지 않도록 문턱을 건다 — 미달이면 호출이 실패로 돌아 환불 경로를 탄다.
      fallbackMinChars: FEATURE_AI_FALLBACK_MIN_CHARS,
    });
    const text = normalizeSajuAIResultText(ai?.text);
    if (!ai?.ok || !text) {
      // 이미 전달 가능한 텍스트를 쥐고 있으면 실패한 ai 로 덮지 않는다 —
      // 덮으면 아래 최종 게이트의 !finalAi?.ok 가 살아 있는 상담문을 통째로 버린다.
      if (!hasRenderableLlmText(finalText, { minChars: 200 })) finalAi = ai;
      continue;
    }
    finalAi = ai;
    finalText = text;
    // 잘림(MAX_TOKENS)이나 미완결이면 이어쓰기 repair로 완결(결과 말미가 끊기지 않도록).
    if (ai.truncated || detectSajuAIIncompleteResult(text).incomplete) {
      // repair 는 폴백을 끄므로(아래) 폴백 예약분을 떼지 않는다.
      const repairTimeoutMs = featureAiCallTimeoutMs(deadlineAt, FEATURE_AI_REPAIR_TIMEOUT_MS, 0);
      if (repairTimeoutMs > 0) {
        const repairAi = await callGeminiText(env, buildFeatureAiCompletionRepairPrompt(text), {
          systemPrompt,
          taskType: "fortune",
          temperature: 0.42,
          maxOutputTokens: ai.truncated ? 6000 : 4000,
          timeoutMs: repairTimeoutMs,
          // 이어쓰기는 꼬리만 채우므로 분량 문턱을 정할 수 없고, 예산이 가장 얇은 구간이라
          // 무제한 폴백을 감당할 수 없다. 실패해도 아래 조건이 원본 본문을 그대로 보존한다.
          fallbackToWorkersAI: false,
        });
        if (repairAi?.ok && String(repairAi.text || "").trim()) {
          finalText = normalizeSajuAIResultText(`${text}\n\n${repairAi.text}`);
          finalAi = { ...ai, repairProvider: repairAi.provider, repairModel: repairAi.model };
        }
      } else {
        console.warn("[feature-ai] llm budget exhausted before repair; delivering as-is");
      }
    }
    if (hasRenderableLlmText(finalText, { minChars: 400 })) break;
  }
  if (!finalAi?.ok || !hasRenderableLlmText(finalText, { minChars: 200 })) {
    return { ok: false, error: finalAi?.message || finalAi?.error || "전문가 상담 생성에 실패했습니다." };
  }
  return {
    ok: true,
    text: finalText,
    model: finalAi.model || undefined,
    provider: finalAi.provider || undefined,
    truncated: Boolean(finalAi.truncated),
  };
}

async function handleZiweiAIPrompt(request, auth, env) {
  // LLM 예산의 기산점. 인증·결제·프롬프트 구성에 쓴 시간만큼 생성 시간이 줄어든다.
  const startedAt = Date.now();
  const body = await readJson(request);
  const question = String(body?.question || "").trim();
  const domain = String(body?.domain || "").trim();
  const chartResult = body?.chartResult;

  if (!question || question.length < 5 || question.length > 1000) {
    return buildZiweiAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
  }

  if (!chartResult || typeof chartResult !== "object") {
    return buildZiweiAIPromptError("MISSING_CHART_RESULT", "기본 자미두수 명반 결과가 필요합니다.", 400);
  }

  const preflightRequestId = String(body?.requestId || "").trim().slice(0, 120);
  // 선검사 read를 withMongoRetry로 감싸 일시적 Mongo 버스트를 흡수하고,
  // 소진 시엔 하드 500이 아니라 재시도 가능한 503으로 표면화(프론트 자동재시도 대상).
  let preflightAccess = null;
  try {
    preflightAccess = await withMongoRetry(env, () => findAIPromptPaidAccessEvidence({
      auth,
      featureKey: ZIWEI_AI_PROMPT_FEATURE_KEY,
      body,
      requestId: preflightRequestId,
      cost: ZIWEI_AI_PROMPT_PRICE,
      env,
    }));
  } catch (error) {
    if (isAIPromptTransientDbError(error)) {
      return buildZiweiAIPromptError(
        "PAID_ACCESS_VERIFY_RETRYABLE",
        "결제·이용권을 확인하는 중 일시적인 지연이 있어요. 잠시 후 자동으로 다시 시도합니다.",
        503,
      );
    }
    throw error;
  }
  if (!preflightAccess) {
    return buildZiweiAIPromptError(
      "PAYMENT_REQUIRED",
      `단건 결제가 필요합니다. ${calculateKrwAmountFromCoins(ZIWEI_AI_PROMPT_PRICE).toLocaleString("ko-KR")}원 가치의 상품입니다.`,
      402,
    );
  }

  // 분야별 템플릿 오버라이드는 동기 접근자 안쪽에서 읽히므로 빌드 전에 채워 둔다.
  // 실패해도 코드 기본 템플릿으로 그대로 진행한다(내부에서 삼킴).
  await primePromptTemplateOverrides(env);

  let builtPrompt = null;
  try {
    builtPrompt = domain
      ? buildZiweiAIPromptWithDomain({ question, chartResult, domain })
      : buildZiweiAIPrompt({ question, chartResult });
  } catch (error) {
    const code = String(error?.message || "").trim();
    if (code === "INVALID_QUESTION") {
      return buildZiweiAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
    }
    if (code === "MISSING_CHART_RESULT") {
      return buildZiweiAIPromptError("MISSING_CHART_RESULT", "기본 자미두수 명반 결과가 필요합니다.", 400);
    }
    if (code === "UNKNOWN_ZIWEI_DOMAIN") {
      return buildZiweiAIPromptError("INVALID_DOMAIN", "지원하지 않는 자미두수 AI 주제(domain)입니다.", 400);
    }
    console.error("[fortune][ziwei-ai-prompt] prompt build failed:", error);
    return buildZiweiAIPromptError("PROMPT_GENERATION_FAILED", "프롬프트 생성 중 오류가 발생했습니다.", 500);
  }

  const generatedPrompt = String(builtPrompt?.generatedPrompt || builtPrompt?.prompt || "").trim();
  if (generatedPrompt.length < 120) {
    return buildZiweiAIPromptError("PROMPT_GENERATION_FAILED", "프롬프트 생성 결과가 비어 있습니다. 다시 시도해 주세요.", 500);
  }

  const digestBase = `${String(auth?.userId || "").trim()}:${ZIWEI_AI_PROMPT_FEATURE_KEY}:${builtPrompt.digestSource}`;
  const digestHex = (await sha256Hex(digestBase)) || String(Date.now());
  const payloadHash = ((await sha256Hex(builtPrompt.digestSource)) || digestHex).slice(0, 120);
  const fallbackRequestId = `${String(auth?.userId || "").trim()}:${ZIWEI_AI_PROMPT_FEATURE_KEY}:${digestHex}`.slice(0, 120);
  const requestId = readAIPromptRequestId(body, fallbackRequestId);

  let chargedCoins = 0;
  let sourceTransactionId = "";
  let isPointSpend = false;
  let isCardSpend = false;

  try {
    const delegatedRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "idempotency-key": requestId,
      }),
      body: JSON.stringify({
        featureKey: ZIWEI_AI_PROMPT_FEATURE_KEY,
        reason: "자미두수 AI 질문 프롬프트 생성",
        requireExistingPaidAccess: true,
        requestId,
        categoryKey: "ziweidoushu",
        subFeatureKey: String(builtPrompt.domain || builtPrompt.questionType || "general").slice(0, 60),
        payloadHash,
        accessGrant: body?.accessGrant,
        accessDecision: body?.accessDecision,
        freeBySubscription: body?.freeBySubscription === true,
        consume: body?.consume,
        payment: body?.payment,
        _paymentContext: body?._paymentContext,
      }),
    });

    const consumeResponse = await handlePigCoinConsume(delegatedRequest, auth, { env });
    const consumePayload = await consumeResponse.json().catch(() => ({}));

    if (!consumeResponse.ok) {
      return mapZiweiConsumeFailure(consumeResponse, consumePayload);
    }

    chargedCoins = Math.max(0, Number(consumePayload?.chargedCoins || 0));
    sourceTransactionId = String(consumePayload?.transactionId || "").trim();
    ({ isPointSpend, isCardSpend } = readSajuAIPromptPointRefundContext(consumePayload, body));
    const balanceAfterRaw = Number(consumePayload?.user?.points);
    const balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : undefined;

    // 결제 통과 후 서버가 직접 상담 답변을 생성한다(사주 상담과 동일 계약).
    // 실패 시 throw → 아래 catch가 자동 환불(결제 후 무결과 방지).
    const consultation = await runFeatureAiConsultation(env, {
      builtPrompt,
      deadlineAt: startedAt + FEATURE_AI_LLM_BUDGET_MS,
    });
    if (!consultation.ok) {
      const genError = new Error(consultation.error || "Ziwei AI consultation generation failed.");
      genError.code = "LLM_GENERATION_RETRYABLE";
      throw genError;
    }

    return json({
      ok: true,
      resultText: consultation.text,
      // 결과를 본 사용자에게 생성 프롬프트도 추가 비용 없이 동봉한다.
      prompt: generatedPrompt,
      generatedPrompt,
      title: builtPrompt.title || "자미두수 심층 질문 프롬프트",
      summaryIntent: builtPrompt.summaryIntent || "",
      analysisAngles: Array.isArray(builtPrompt.analysisAngles) ? builtPrompt.analysisAngles : [],
      recommendedFollowUpQuestions: Array.isArray(builtPrompt.recommendedFollowUpQuestions)
        ? builtPrompt.recommendedFollowUpQuestions
        : [],
      caution: String(builtPrompt.caution || "").trim() || undefined,
      questionType: builtPrompt.questionType,
      chargedCoins,
      featureKey: ZIWEI_AI_PROMPT_FEATURE_KEY,
      balanceAfter,
      model: consultation.model,
      provider: consultation.provider,
    });
  } catch (error) {
    let refundAttempted = false;
    let refundOk = false;
    if (isPointSpend && chargedCoins > 0 && sourceTransactionId) {
      refundAttempted = true;
      try {
        const refundRequest = new Request(request.url, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            cost: chargedCoins,
            featureKey: ZIWEI_AI_PROMPT_FEATURE_KEY,
            sourceTransactionId,
            requestId: `refund:${requestId}`.slice(0, 120),
            reason: "Ziwei AI consultation generation failed auto-refund",
          }),
        });
        const refundResponse = await handlePigCoinRefund(refundRequest, auth);
        refundOk = Boolean(refundResponse?.ok);
      } catch (refundError) {
        console.error("[fortune][ziwei-ai-prompt] refund failed:", refundError);
      }
    } else if (isCardSpend && sourceTransactionId) {
      // 카드 단건 결제는 PointHistory 차감행이 없어 코인 환불이 반드시 409 로 실패한다.
      // PortOne 취소 정본으로 보낸다(결제 후 무결과 방지). 실패하면 refundOk=false 라
      // 기존처럼 PAID 로 남아 재시도 경로가 살아 있다.
      refundAttempted = true;
      const cardRefund = await refundAIPromptCardPaymentOnFailure({
        env,
        auth,
        paymentId: sourceTransactionId,
        featureKey: ZIWEI_AI_PROMPT_FEATURE_KEY,
        reasonCode: "ai_prompt_generation_failed",
        reasonMessage: "Ziwei AI consultation generation failed auto-refund",
      });
      refundOk = cardRefund.refunded === true;
    }

    console.error("[fortune][ziwei-ai-prompt] request failed:", error);
    // 일시 인프라(Mongo/네트워크) 오류만 503(자동재시도). LLM 생성 실패(이미 환불)는 500(수동재시도).
    if (error?.code !== "LLM_GENERATION_RETRYABLE" && isAIPromptTransientDbError(error)) {
      return buildZiweiAIPromptError(
        "SERVICE_TEMPORARILY_UNAVAILABLE",
        "일시적인 오류로 처리가 지연되고 있어요. 잠시 후 자동으로 다시 시도합니다.",
        503,
      );
    }
    return buildZiweiAIPromptError(
      "PROMPT_GENERATION_FAILED",
      buildAIPromptRetryMessage(refundOk),
      500,
      buildAIPromptRetryDetails({ refundAttempted, refundOk, requestId }),
    );
  }
}

function buildSukuyoAIPromptError(code, message, status = 400, details = {}) {
  return json({ ok: false, code, message, ...details }, { status });
}

function mapSukuyoConsumeFailure(response, payload) {
  const status = Number(response?.status || 500);
  const code = String(payload?.code || "").trim();
  const message = String(payload?.message || "").trim();

  if (status === 401 || status === 403 || code === "AUTH_REQUIRED" || code === "UNAUTHORIZED") {
    return buildSukuyoAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  }

  if (status === 402 || code === "INSUFFICIENT_BALANCE") {
    return buildSukuyoAIPromptError(
      "PAYMENT_REQUIRED",
      `단건 결제가 필요합니다. ${calculateKrwAmountFromCoins(SUKUYO_AI_PROMPT_PRICE).toLocaleString("ko-KR")}원 가치의 상품입니다.`,
      402,
    );
  }

  return buildSukuyoAIPromptError(
    "PROMPT_GENERATION_FAILED",
    message || "결제 확인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    status >= 400 && status < 600 ? status : 500,
  );
}

async function handleSukuyoAIPrompt(request, auth, env) {
  // LLM 예산의 기산점. 인증·결제·프롬프트 구성에 쓴 시간만큼 생성 시간이 줄어든다.
  const startedAt = Date.now();
  const body = await readJson(request);
  const question = String(body?.question || "").trim();
  const domain = String(body?.domain || "").trim();
  const basicResult = body?.basicResult;
  const compatibilityResult = body?.compatibilityResult;

  if (!question || question.length < 5 || question.length > 1000) {
    return buildSukuyoAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
  }

  // 분야별 템플릿 오버라이드는 동기 접근자 안쪽에서 읽히므로 빌드 전에 채워 둔다.
  // 실패해도 코드 기본 템플릿으로 그대로 진행한다(내부에서 삼킴).
  await primePromptTemplateOverrides(env);

  let builtPrompt = null;
  try {
    builtPrompt = domain
      ? buildSukuyoAIPromptWithDomain({
        question,
        basicResult,
        compatibilityResult,
        domain,
      })
      : buildSukuyoAIPrompt({
        question,
        basicResult,
        compatibilityResult,
      });
  } catch (error) {
    const code = String(error?.message || "").trim();
    if (code === "INVALID_QUESTION") {
      return buildSukuyoAIPromptError("INVALID_QUESTION", "질문은 5자 이상 1000자 이하로 입력해 주세요.", 400);
    }
    if (code === "MISSING_BASIC_RESULT") {
      return buildSukuyoAIPromptError("MISSING_BASIC_RESULT", "기본 숙요점 결과가 필요합니다.", 400);
    }
    if (code === "MISSING_COMPATIBILITY_RESULT") {
      return buildSukuyoAIPromptError(
        "MISSING_COMPATIBILITY_RESULT",
        "궁합 질문은 숙요 궁합 계산 결과를 먼저 만든 뒤 다시 시도해 주세요.",
        400,
      );
    }
    if (code === "UNKNOWN_SUKUYO_DOMAIN") {
      return buildSukuyoAIPromptError("INVALID_DOMAIN", "지원하지 않는 숙요 도메인입니다.", 400);
    }
    console.error("[fortune][sukuyo-ai-prompt] prompt build failed:", error);
    return buildSukuyoAIPromptError("PROMPT_GENERATION_FAILED", "프롬프트 생성 중 오류가 발생했습니다.", 500);
  }

  const digestBase = `${String(auth?.userId || "").trim()}:${SUKUYO_AI_PROMPT_FEATURE_KEY}:${builtPrompt.digestSource}`;
  const digestHex = (await sha256Hex(digestBase)) || String(Date.now());
  const payloadHash = ((await sha256Hex(builtPrompt.digestSource)) || digestHex).slice(0, 120);
  const fallbackRequestId = `${String(auth?.userId || "").trim()}:${SUKUYO_AI_PROMPT_FEATURE_KEY}:${digestHex}`.slice(0, 120);
  const requestId = readAIPromptRequestId(body, fallbackRequestId);

  let chargedCoins = 0;
  let sourceTransactionId = "";
  let isPointSpend = false;
  let isCardSpend = false;

  try {
    if (SUKUYO_AI_PROMPT_PRICE <= 0) {
      // 기본 숙요점 질문 상담은 무료(price 0) — 서버가 직접 답변을 생성한다.
      const consultation = await runFeatureAiConsultation(env, {
        builtPrompt,
        deadlineAt: startedAt + FEATURE_AI_LLM_BUDGET_MS,
      });
      if (!consultation.ok) {
        return buildSukuyoAIPromptError(
          "LLM_GENERATION_RETRYABLE",
          "전문가 상담 생성이 지연되고 있어요. 잠시 후 다시 시도해 주세요.",
          503,
        );
      }
      return json({
        ok: true,
        resultText: consultation.text,
        // 결과를 본 사용자에게 생성 프롬프트도 추가 비용 없이 동봉한다.
        prompt: builtPrompt.prompt,
        generatedPrompt: builtPrompt.generatedPrompt || builtPrompt.prompt,
        title: builtPrompt.title || "월하의 숙요 동물 프롬프트",
        summaryIntent: builtPrompt.summaryIntent || "",
        analysisAngles: Array.isArray(builtPrompt.analysisAngles) ? builtPrompt.analysisAngles : [],
        recommendedFollowUpQuestions: Array.isArray(builtPrompt.recommendedFollowUpQuestions)
          ? builtPrompt.recommendedFollowUpQuestions
          : [],
        caution: String(builtPrompt.caution || "").trim() || undefined,
        questionType: builtPrompt.questionType,
        chargedCoins: 0,
        featureKey: SUKUYO_AI_PROMPT_FEATURE_KEY,
        accessType: "free",
        accessMethod: "FREE",
        compatibilityUsed: Boolean(builtPrompt.compatibilityUsed),
        compatibilityHint: String(builtPrompt.compatibilityHint || ""),
        model: consultation.model,
        provider: consultation.provider,
      });
    }

    const delegatedRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/json",
        "idempotency-key": requestId,
      }),
      body: JSON.stringify({
        featureKey: SUKUYO_AI_PROMPT_FEATURE_KEY,
        reason: "숙요점 AI 질문 프롬프트 생성",
        requireExistingPaidAccess: true,
        requestId,
        categoryKey: "sukuyo",
        subFeatureKey: String(builtPrompt.domain || builtPrompt.questionType || "general").slice(0, 60),
        payloadHash,
        accessGrant: body?.accessGrant,
        accessDecision: body?.accessDecision,
        freeBySubscription: body?.freeBySubscription === true,
        consume: body?.consume,
        payment: body?.payment,
        _paymentContext: body?._paymentContext,
      }),
    });

    const consumeResponse = await handlePigCoinConsume(delegatedRequest, auth, { env });
    const consumePayload = await consumeResponse.json().catch(() => ({}));

    if (!consumeResponse.ok) {
      return mapSukuyoConsumeFailure(consumeResponse, consumePayload);
    }

    chargedCoins = Math.max(0, Number(consumePayload?.chargedCoins || 0));
    sourceTransactionId = String(consumePayload?.transactionId || "").trim();
    ({ isPointSpend, isCardSpend } = readSajuAIPromptPointRefundContext(consumePayload, body));
    const balanceAfterRaw = Number(consumePayload?.user?.points);
    const balanceAfter = Number.isFinite(balanceAfterRaw) ? balanceAfterRaw : undefined;

    // 결제 통과 후 서버가 직접 상담 답변을 생성한다(사주 상담과 동일 계약).
    // 실패 시 throw → 아래 catch가 자동 환불(결제 후 무결과 방지).
    const consultation = await runFeatureAiConsultation(env, {
      builtPrompt,
      deadlineAt: startedAt + FEATURE_AI_LLM_BUDGET_MS,
    });
    if (!consultation.ok) {
      const genError = new Error(consultation.error || "Sukuyo AI consultation generation failed.");
      genError.code = "LLM_GENERATION_RETRYABLE";
      throw genError;
    }

    return json({
      ok: true,
      resultText: consultation.text,
      // 결과를 본 사용자에게 생성 프롬프트도 추가 비용 없이 동봉한다.
      prompt: builtPrompt.prompt,
      generatedPrompt: builtPrompt.generatedPrompt || builtPrompt.prompt,
      title: builtPrompt.title || "숙요점 심층 질문 프롬프트",
      summaryIntent: builtPrompt.summaryIntent || "",
      analysisAngles: Array.isArray(builtPrompt.analysisAngles) ? builtPrompt.analysisAngles : [],
      recommendedFollowUpQuestions: Array.isArray(builtPrompt.recommendedFollowUpQuestions)
        ? builtPrompt.recommendedFollowUpQuestions
        : [],
      caution: String(builtPrompt.caution || "").trim() || undefined,
      questionType: builtPrompt.questionType,
      chargedCoins,
      featureKey: SUKUYO_AI_PROMPT_FEATURE_KEY,
      balanceAfter,
      compatibilityUsed: Boolean(builtPrompt.compatibilityUsed),
      compatibilityHint: String(builtPrompt.compatibilityHint || ""),
      model: consultation.model,
      provider: consultation.provider,
    });
  } catch (error) {
    let refundAttempted = false;
    let refundOk = false;
    if (isPointSpend && chargedCoins > 0 && sourceTransactionId) {
      refundAttempted = true;
      try {
        const refundRequest = new Request(request.url, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            cost: chargedCoins,
            featureKey: SUKUYO_AI_PROMPT_FEATURE_KEY,
            sourceTransactionId,
            requestId: `refund:${requestId}`.slice(0, 120),
            reason: "Sukuyo AI consultation generation failed auto-refund",
          }),
        });
        const refundResponse = await handlePigCoinRefund(refundRequest, auth);
        refundOk = Boolean(refundResponse?.ok);
      } catch (refundError) {
        console.error("[fortune][sukuyo-ai-prompt] refund failed:", refundError);
      }
    } else if (isCardSpend && sourceTransactionId) {
      // 카드 단건 결제는 PointHistory 차감행이 없어 코인 환불이 반드시 409 로 실패한다.
      // PortOne 취소 정본으로 보낸다(결제 후 무결과 방지). 실패하면 refundOk=false 라
      // 기존처럼 PAID 로 남아 재시도 경로가 살아 있다.
      refundAttempted = true;
      const cardRefund = await refundAIPromptCardPaymentOnFailure({
        env,
        auth,
        paymentId: sourceTransactionId,
        featureKey: SUKUYO_AI_PROMPT_FEATURE_KEY,
        reasonCode: "ai_prompt_generation_failed",
        reasonMessage: "Sukuyo AI consultation generation failed auto-refund",
      });
      refundOk = cardRefund.refunded === true;
    }

    console.error("[fortune][sukuyo-ai-prompt] request failed:", error);
    // 일시 인프라(Mongo/네트워크) 오류만 503(자동재시도). LLM 생성 실패(이미 환불)는 500(수동재시도).
    if (error?.code !== "LLM_GENERATION_RETRYABLE" && isAIPromptTransientDbError(error)) {
      return buildSukuyoAIPromptError(
        "SERVICE_TEMPORARILY_UNAVAILABLE",
        "일시적인 오류로 처리가 지연되고 있어요. 잠시 후 자동으로 다시 시도합니다.",
        503,
      );
    }
    return buildSukuyoAIPromptError(
      "PROMPT_GENERATION_FAILED",
      buildAIPromptRetryMessage(refundOk),
      500,
      buildAIPromptRetryDetails({ refundAttempted, refundOk, requestId }),
    );
  }
}

/* 구독 상태는 페이지 로드마다 자동으로 조회된다. 유저별 몇 초 캐시로 그 버스트를 collapse 해
   Mongo 왕복을 없앤다 — 이 왕복이 실패할 때마다 degraded 응답이 나가기 때문이다.
   (billing.js 의 billingBalanceCache 와 같은 패턴: globalThis 공유, 정상 응답만 저장.) */
const SUBSCRIPTION_STATUS_CACHE_TTL_MS = 5000;
const SUBSCRIPTION_STATUS_CACHE_MAX_ENTRIES = 2500;
const subscriptionStatusCache = globalThis.__subscriptionStatusCache
  || (globalThis.__subscriptionStatusCache = { entries: new Map(), lastPruneAt: 0 });

function readSubscriptionStatusFromCache(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return null;
  const entry = subscriptionStatusCache.entries.get(uid);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    subscriptionStatusCache.entries.delete(uid);
    return null;
  }
  return entry.payload || null;
}

function writeSubscriptionStatusToCache(userId, payload) {
  const uid = String(userId || "").trim();
  if (!uid || !payload) return payload;
  const now = Date.now();
  if (subscriptionStatusCache.lastPruneAt + 2000 < now) {
    subscriptionStatusCache.lastPruneAt = now;
    for (const [key, entry] of subscriptionStatusCache.entries.entries()) {
      if (!entry || entry.expiresAt <= now) subscriptionStatusCache.entries.delete(key);
    }
  }
  if (subscriptionStatusCache.entries.size > SUBSCRIPTION_STATUS_CACHE_MAX_ENTRIES) {
    const earliestKey = subscriptionStatusCache.entries.keys().next().value;
    if (earliestKey) subscriptionStatusCache.entries.delete(earliestKey);
  }
  subscriptionStatusCache.entries.set(uid, {
    payload,
    expiresAt: now + Math.max(1000, Math.floor(SUBSCRIPTION_STATUS_CACHE_TTL_MS)),
  });
  return payload;
}

// 구독 상태 판정에 필요한 User 필드. 라우트가 인증 단계에서 이 projection 으로 문서를 한 번에
// 받아오면(authUserDoc) 아래 재조회를 건너뛸 수 있다 — 같은 문서를 두 번 읽던 왕복을 없앤다.
const SUBSCRIPTION_STATUS_USER_PROJECTION = {
  profileSubscription: 1,
  subscription: 1,
  membership: 1,
  pass: 1,
  entitlement: 1,
  plan: 1,
  planId: 1,
  productId: 1,
  subscriptionTier: 1,
  membershipTier: 1,
  passTier: 1,
  status: 1,
  subscriptionStatus: 1,
  membershipStatus: 1,
  isActive: 1,
  isSubscribed: 1,
  expiresAt: 1,
  has_started_paid_service: 1,
  first_service_access_date: 1,
};

async function handleSubscriptionStatus(request, env, auth) {
  // 인증 단계가 이미 같은 문서를 읽어 붙여줬으면 그걸 쓴다(Mongo 왕복 1회 절약).
  // 붙지 않는 경로(refresh/admin/dev 폴백)에서는 종전대로 직접 조회한다.
  // 일시적 풀 초기화에도 구독/이용권 상태를 정확히 반환하도록 그 조회는 재시도로 감싼다.
  // (자동갱신 write는 아래 낙관적 동시성 가드가 이중 차감을 막으므로 read만 재시도한다.)
  const user = auth?.authUserDoc
    || await withMongoRetry(env, () => findUserByIdRaw(auth.userId, SUBSCRIPTION_STATUS_USER_PROJECTION));

  if (!user) {
    const policy = getPlanPolicy(null);
    return json({
      ok: true,
      authenticated: true,
      subscription: {
        isSubscribed: false,
        plan: "free",
        expiresAt: null,
      },
      isSubscribed: false,
      plan: "free",
      tier: "free",
      source: "coin",
      isActive: false,
      expiresAt: null,
      profileLimit: 1,
      points: 0,
      lowBalanceWarning: false,
      autoRenewed: false,
      cancelAtPeriodEnd: false,
      cancelRequestedAt: null,
      hasStartedPaidService: false,
      firstServiceAccessDate: null,
      freeLimit: policy.freeLimit,
      recommendedCoins: policy.recommendedCoins,
    });
  }

  const sub = user.profileSubscription || {};
  const tier = sub.tier || "free";
  const source = String(sub.source || "coin").toLowerCase();
  const expAt = toValidDate(sub.expiresAt);
  const rawSubscriptionStatus = sub.status || sub.subscriptionStatus || sub.membershipStatus || sub.lastBillingStatus || "";
  const statusIndicatesActive = isActiveStatus(rawSubscriptionStatus)
    || sub.isActive === true
    || sub.isSubscribed === true
    || sub.active === true
    || sub.enabled === true
    || sub.valid === true
    || sub.registered === true;
  const statusIndicatesInactive = isInactiveStatus(rawSubscriptionStatus);
  const cancelAtPeriodEnd = Boolean(sub.cancelAtPeriodEnd);
  const cancelRequestedAt = toValidDate(sub.cancelRequestedAt);
  // 이용권은 자동갱신(auto-renewal)이 없다 — 만료되면 사용자가 직접 재결제한다.
  // 레거시 코인 잔액으로 갱신을 청구하던 분기는 제거했다. points 는 응답 형태 유지를 위해서만 남는다.
  const points = null;
  const now = new Date();
  const canonicalEntitlement = resolveCanonicalEntitlement(user || {});

  let effectiveTier = "free";
  let effectiveExpAt = expAt;
  let effectivePassTier = null;
  let effectiveSource = source;
  // 자동갱신 경로가 없으므로 항상 false 다. 응답 필드는 계약 유지를 위해 그대로 내보낸다.
  const autoRenewed = false;

  if (tier !== "free") {
    if (!statusIndicatesInactive && statusIndicatesActive) {
      effectiveTier = tier;
    } else if (effectiveExpAt && effectiveExpAt > now) {
      effectiveTier = tier;
    }
  }

  if (canonicalEntitlement.isActive && canonicalEntitlement.source === "profileSubscription") {
    effectiveTier = canonicalEntitlement.tier;
    effectivePassTier = canonicalEntitlement.passTier || canonicalEntitlement.tier;
    effectiveExpAt = toValidDate(canonicalEntitlement.expiresAt) || effectiveExpAt;
    effectiveSource = canonicalEntitlement.source || effectiveSource;
  }

  const isActive = effectiveTier !== "free";
  const profileLimit = isActive ? (PROFILE_SUB_PLANS[effectiveTier]?.profileLimit ?? 1) : 1;
  const lowBalanceWarning = false;
  const policy = getPlanPolicy(isActive ? effectiveTier : null);
  const passLimit = isActive
    ? Number(canonicalEntitlement.maxCoveredCoin || policy.freeLimit || 0)
    : Number(policy.freeLimit || 0);
  const membershipCreditBalance = Math.max(0, Math.floor(Number(sub.membershipCreditBalance || 0)));
  // 월 누적 한도 잔여. 클라이언트 스냅샷(js/core/pass-verdict.js)이 이 값으로 월 한도 소진자를
  // 진입 시점에 확정 거부한다. cycleKey 를 못 구하면(만료일 없음) applies=false 라 내려보내지
  // 않고, 클라이언트는 null 을 "모름" 으로 두어 서버 판정(coin-gate)에 맡긴다.
  const monthlyQuota = isActive ? resolveMonthlySpendQuota(sub, canonicalEntitlement, 0) : null;
  const monthlyPassLimit = monthlyQuota && monthlyQuota.applies ? monthlyQuota.limitCoin : null;
  const monthlySpendRemaining = monthlyQuota && monthlyQuota.applies ? monthlyQuota.remainingCoin : null;

  return json({
    ok: true,
    authenticated: true,
    subscription: {
      isSubscribed: Boolean(isActive),
      plan: effectiveTier,
      tier: effectiveTier,
      status: isActive ? (rawSubscriptionStatus || "active") : (rawSubscriptionStatus || "free"),
      expiresAt: toIsoOrNull(effectiveExpAt),
      passTier: isActive ? (effectivePassTier || effectiveTier) : null,
      freeLimit: passLimit,
      passLimit,
      maxCoveredCoin: passLimit,
      membershipCreditBalance,
    },
    isSubscribed: Boolean(isActive),
    plan: effectiveTier,
    tier: effectiveTier,
    passTier: isActive ? (effectivePassTier || effectiveTier) : null,
    source: effectiveTier === "free" ? "coin" : effectiveSource,
    status: isActive ? (rawSubscriptionStatus || "active") : (rawSubscriptionStatus || "free"),
    subscriptionStatus: rawSubscriptionStatus || null,
    isActive: Boolean(isActive),
    expiresAt: toIsoOrNull(effectiveExpAt),
    profileLimit,
    points,
    lowBalanceWarning: Boolean(lowBalanceWarning),
    autoRenewed: Boolean(autoRenewed),
    cancelAtPeriodEnd: Boolean(cancelAtPeriodEnd),
    cancelRequestedAt: toIsoOrNull(cancelRequestedAt),
    hasStartedPaidService: Boolean(user.has_started_paid_service),
    firstServiceAccessDate: toIsoOrNull(user.first_service_access_date),
    freeLimit: passLimit,
    passLimit,
    maxCoveredCoin: passLimit,
    membershipCreditBalance,
    monthlyPassLimit,
    monthlySpendRemaining,
    recommendedCoins: policy.recommendedCoins,
  });
}

function handleGuestSubscriptionStatus() {
  return json({
    ok: false,
    authenticated: false,
    code: "AUTH_REQUIRED",
    message: "로그인이 필요합니다.",
  }, { status: 401 });
}

function buildDbFallbackSubscriptionStatus(auth, error) {
  const points = Number.isFinite(Number(auth?.points)) ? Number(auth.points) : 0;
  const policy = getPlanPolicy(null);
  return json({
    ok: false,
    authenticated: true,
    degraded: true,
    source: "auth_snapshot",
    subscription: {
      isSubscribed: false,
      plan: "free",
      expiresAt: null,
    },
    isSubscribed: false,
    plan: "free",
    tier: "free",
    isActive: false,
    expiresAt: null,
    profileLimit: 1,
    points,
    lowBalanceWarning: false,
    autoRenewed: false,
    cancelAtPeriodEnd: false,
    cancelRequestedAt: null,
    hasStartedPaidService: false,
    firstServiceAccessDate: null,
    freeLimit: policy.freeLimit,
    recommendedCoins: policy.recommendedCoins,
    code: "DB_FALLBACK",
    message: "구독 서버가 일시적으로 불안정하여 보조 정보로 표시합니다.",
    // 원본 드라이버 메시지는 싣지 않는다 — Atlas 타임아웃 문구의 샤드 호스트명·IP 가 그대로 나간다.
    // 소비자 분기는 아래 degraded/code 로만 한다. 원문은 서버 로그에 남는다.
    errorDetails: {
      stage: "fortune-db-fallback-subscription-status",
      name: error?.name || "Error",
      code: error?.code || "DB_FALLBACK",
    },
    // 200 + degraded:true 로 내려보낸다. 이 응답은 "구독 없음"이 아니라 "지금은 확인 못 함"이며,
    // 소비자들은 degraded 를 보고 기존 값을 유지하도록 만들어져 있다(app/_lib/auth-store.ts 의
    // refreshProfileSubscriptionCache 주석이 이 계약을 명시한다).
    // 503 으로 내리면 클라이언트가 응답 본문을 읽기도 전에 !response.ok 에서 끊겨 그 처리에
    // 도달하지 못하고, 사용자에게 아무 이득 없이 콘솔 에러만 남는다. 이 호출은 전부
    // 페이지 로드 시 자동으로 나가는 백그라운드 동기화다.
  }, { status: 200 });
}

function handlePigCoinPrices() {
  const prices = Object.entries(PIG_COIN_PACKAGES).map(([packageId, pkg]) => ({
    packageId,
    name: String(pkg?.name || packageId),
    coins: Number(pkg?.coins || 0),
    bonus: Number(pkg?.bonus || 0),
    priceKRW: Number(pkg?.priceKRW || 0),
  }));

  return json({
    ok: true,
    prices,
  });
}

function handleProfileSubscriptionPlans() {
  const plans = [
    {
      planId: "free",
      tier: "free",
      label: "Free",
      coins: 0,
      profileLimit: 1,
      freeLimit: 0,
      durationDays: 0,
    },
    ...Object.entries(PROFILE_SUB_PLANS).map(([tier, plan]) => ({
      planId: `honey_${tier}`,
      tier,
      label: String(plan?.name || tier),
      coins: Number(plan?.coins || 0),
      profileLimit: Number.isFinite(Number(plan?.profileLimit)) ? Math.max(0, Math.floor(Number(plan?.profileLimit))) : 1,
      freeLimit: Number(plan?.freeLimit ?? plan?.lowWarnAt ?? 0),
      durationDays: Number(plan?.durationDays || 30),
    })),
  ];

  return json({
    ok: true,
    plans,
  });
}

async function handleStartService(request, auth) {
  const body = await readJson(request);
  const action = String(body?.action || "membership-content").trim().slice(0, 80);
  const contentTitle = String(body?.contentTitle || "Membership content").trim().slice(0, 120);
  const legalVersion = String(body?.legalVersion || "2026-04-11").trim().slice(0, 20);
  const now = new Date();

  const user = await User.findById(auth.userId)
    .select("profileSubscription has_started_paid_service first_service_access_date points")
    .lean();

  if (!user) return json({ message: "User not found." }, { status: 404 });

  const tier = String(user.profileSubscription?.tier || "free");
  if (tier === "free") {
    return json({ message: "Only subscribed users can access this service." }, { status: 403 });
  }

  const alreadyStarted = Boolean(user.has_started_paid_service);
  let startedAt = user.first_service_access_date ? new Date(user.first_service_access_date) : null;

  if (!alreadyStarted) {
    const updated = await User.findOneAndUpdate(
      { _id: auth.userId, has_started_paid_service: { $ne: true } },
      {
        $set: {
          has_started_paid_service: true,
          first_service_access_date: now,
        },
      },
      { returnDocument: "after", projection: { points: 1, first_service_access_date: 1 } },
    ).lean();

    if (updated?.first_service_access_date) {
      startedAt = new Date(updated.first_service_access_date);
    }
  }

  await PointHistory.create({
    userId: auth.userId,
    kind: "adjust",
    delta: 0,
    balanceAfter: Number(user.points || 0),
    reason: "Membership content access acknowledged",
    featureKey: "profile-subscription-service-start",
    metadata: {
      action,
      contentTitle,
      legalVersion,
      acknowledgedAt: now.toISOString(),
    },
  }).catch(() => {});

  return json({
    ok: true,
    started: true,
    alreadyStarted,
    hasStartedPaidService: true,
    firstServiceAccessDate: startedAt ? startedAt.toISOString() : now.toISOString(),
  });
}

async function handleShareReward(request, auth) {
  return json({
    ok: false,
    message: "기존 코인 공유 보상은 더 이상 사용하지 않습니다. 이용권, 월정석 또는 단건 결제를 이용해 주세요.",
    code: "POINT_REWARD_DISABLED",
    legacyCoinDisabled: true,
  }, { status: 410 });

  const body = await readJson(request);
  const contentId = String(body?.contentId || "default")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 40) || "default";

  const now = new Date();
  const kstMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0) - 9 * 3600 * 1000,
  );

  const todayCount = await PointHistory.countDocuments({
    userId: auth.userId,
    kind: "share_reward",
    createdAt: { $gte: kstMidnight },
  });

  if (todayCount >= SHARE_REWARD_DAILY_LIMIT) {
    return json({
      message: "Daily share reward limit reached.",
      code: "DAILY_LIMIT_EXCEEDED",
      usedToday: todayCount,
      limitPerDay: SHARE_REWARD_DAILY_LIMIT,
    }, { status: 429 });
  }

  // Per-content/day idempotency key. Unique index on PointHistory.dedupeKey makes the
  // duplicate-grant check atomic (create-first), closing the previous count-then-$inc TOCTOU
  // where concurrent requests for the same contentId could both pass the check and double-credit.
  const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
  const kstDateKey = `${kstNow.getUTCFullYear()}${String(kstNow.getUTCMonth() + 1).padStart(2, "0")}${String(kstNow.getUTCDate()).padStart(2, "0")}`;
  const dedupeKey = `share_reward:${auth.userId}:${contentId}:${kstDateKey}`;

  let rewardHistory;
  try {
    rewardHistory = await PointHistory.create({
      userId: auth.userId,
      kind: "share_reward",
      delta: SHARE_REWARD_AMOUNT,
      balanceAfter: 0, // backfilled after the atomic increment below
      reason: `Share reward for ${contentId}`,
      featureKey: "share-reward",
      dedupeKey,
      metadata: {
        source: "fortune.pig-coin.share-reward",
        contentId,
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return json({
        message: "This content was already rewarded today.",
        code: "CONTENT_ALREADY_REWARDED",
        usedToday: todayCount,
        limitPerDay: SHARE_REWARD_DAILY_LIMIT,
      }, { status: 409 });
    }
    throw err;
  }

  const updatedUser = await User.findByIdAndUpdate(
    auth.userId,
    { $inc: { points: SHARE_REWARD_AMOUNT } },
    { returnDocument: "after", projection: { points: 1 } },
  ).lean();

  if (!updatedUser) {
    // Roll back the lock so a missing/removed account isn't permanently blocked.
    await PointHistory.deleteOne({ _id: rewardHistory._id }).catch(() => {});
    return json({ message: "User not found." }, { status: 404 });
  }

  await PointHistory.updateOne(
    { _id: rewardHistory._id },
    { $set: { balanceAfter: Number(updatedUser.points || 0) } },
  ).catch(() => {});

  return json({
    message: `${SHARE_REWARD_AMOUNT} coins awarded for sharing.`,
    reward: SHARE_REWARD_AMOUNT,
    usedToday: todayCount + 1,
    limitPerDay: SHARE_REWARD_DAILY_LIMIT,
    user: userPayload(auth, updatedUser.points),
  });
}

async function handleSubscribe(request, auth) {
  return json({
    ok: false,
    message: "이전 달빛 이용권 신청 방식은 종료되었습니다. 1~12개월 달빛 이용권은 원화 단건 결제로 이용해 주세요.",
    code: "COIN_SUBSCRIPTION_DISABLED",
  }, { status: 410 });
}

async function handleSubscriptionCancel(request, auth) {
  const body = await readJson(request);
  const resume = body?.resume === true || String(body?.resume || "").toLowerCase() === "true";
  const now = new Date();

  const existingUser = await User.findById(auth.userId)
    .select("profileSubscription")
    .lean();

  if (!existingUser) return json({ message: "User not found." }, { status: 404 });

  const sub = existingUser.profileSubscription || {};
  const tier = String(sub.tier || "free");
  const expiresAt = sub.expiresAt ? new Date(sub.expiresAt) : null;
  const isActive = tier !== "free" && !!expiresAt && expiresAt > now;

  if (!isActive) {
    return json({ message: "No active subscription available to cancel." }, { status: 400 });
  }

  await User.updateOne(
    { _id: auth.userId },
    {
      $set: {
        "profileSubscription.cancelAtPeriodEnd": !resume,
        "profileSubscription.cancelRequestedAt": resume ? null : now,
      },
    },
  );

  const plan = PROFILE_SUB_PLANS[tier];

  return json({
    message: resume
      ? "Subscription cancellation has been reverted. Auto-renewal is active again."
      : "Subscription cancellation is scheduled. Benefits stay active until expiry.",
    subscription: {
      tier,
      isActive: true,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      profileLimit: plan?.profileLimit ?? 1,
      cancelAtPeriodEnd: !resume,
      cancelRequestedAt: resume ? null : now.toISOString(),
    },
  });
}

const GUARDIAN_FORTUNE_RATE_LIMIT_MAX = 12;
const GUARDIAN_FORTUNE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const GUARDIAN_FORTUNE_SHARE_RATE_LIMIT_MAX = 20;

const GUARDIAN_FORTUNE_CHAT_SSE_HEADERS = Object.freeze({
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Accel-Buffering": "no",
});

export function formatGuardianFortuneChatSseEvent(event, payload) {
  return `event: ${String(event || "message")}\ndata: ${JSON.stringify(payload || {})}\n\n`;
}

function writeGuardianFortuneChatSse(writer, event, payload) {
  return writer.write(new TextEncoder().encode(formatGuardianFortuneChatSseEvent(event, payload)));
}

/**
 * guardian 실패가 어느 단계에서 났는지 헤더 한 줄로 가른다.
 *
 * 공용 withCorsHeaders(worker/index.js)는 503·504 에만, 그것도 값이 없을 때 "route" 로만 채운다.
 * 그래서 예전에는 상담 실패가 전부 stage=route 로 보여 DB·LLM·결제 어디서 샜는지 구분이 안 됐다.
 * 여기서 코드별로 먼저 채워 두면 공용 로직이 덮어쓰지 않고(has 검사) 502·500 에도 남는다.
 * 프롬프트·개인정보·키는 싣지 않는다 — 단계 이름만 나간다.
 */
function guardianFortuneErrorStage(errorCode) {
  switch (String(errorCode || "")) {
    case GUARDIAN_FORTUNE_ERROR_CODES.SERVICE_TEMPORARILY_UNAVAILABLE:
      return "db";
    case GUARDIAN_FORTUNE_ERROR_CODES.USAGE_COMMIT_FAILED:
      return "db-commit";
    case GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_CHECK_DEGRADED:
      return "payment-verify";
    case GUARDIAN_FORTUNE_ERROR_CODES.PAYMENT_REQUIRED:
      return "payment-required";
    case GUARDIAN_FORTUNE_ERROR_CODES.CONTEXT_FAILED:
      return "context";
    case GUARDIAN_FORTUNE_ERROR_CODES.GENERATION_FAILED:
    case GUARDIAN_FORTUNE_ERROR_CODES.RESULT_INVALID:
      return "llm";
    case GUARDIAN_FORTUNE_ERROR_CODES.GUEST_LIMIT_EXCEEDED:
    case GUARDIAN_FORTUNE_ERROR_CODES.DAILY_LIMIT_EXCEEDED:
    case GUARDIAN_FORTUNE_ERROR_CODES.REQUEST_IN_PROGRESS:
      return "quota";
    case GUARDIAN_FORTUNE_ERROR_CODES.INVALID_INPUT:
      return "input";
    default:
      return "route";
  }
}

function guardianFortuneRouteResponse(result, { cookie = "" } = {}) {
  const { status = 200, ...payload } = result || {};
  const headers = {};
  if (cookie) headers["Set-Cookie"] = cookie;
  if (status >= 400) {
    const stage = guardianFortuneErrorStage(payload?.error);
    headers["X-CD-Error-Stage"] = stage;
    headers["Server-Timing"] = `cd-error;desc="${stage}"`;
  }
  return json(payload, { status, ...(Object.keys(headers).length ? { headers } : {}) });
}

function guardianFortuneGuestIdFromRequest(request) {
  const headerValue = String(request.headers.get("x-guardian-fortune-guest-id") || "").trim();
  if (isValidGuardianFortuneGuestId(headerValue)) return { value: headerValue, issued: false };
  const cookieValueFromRequest = cookieValue(request, "guardian_fortune_guest_id");
  if (isValidGuardianFortuneGuestId(cookieValueFromRequest)) return { value: cookieValueFromRequest, issued: false };
  return { value: createGuardianFortuneGuestId(), issued: true };
}

async function resolveGuardianFortuneOptionalAuth(request, env) {
  try {
    return await getOptionalUserFromRequest(request, env, {
      allowDbFallback: true,
      surfaceDbInfraError: true,
    });
  } catch (error) {
    if (isAuthDbInfraError(error)) {
      throw createHttpError(503, "인증 상태를 잠시 확인할 수 없어요.", {
        error: "GUARDIAN_FORTUNE_AUTH_STATUS_UNAVAILABLE",
      });
    }
    throw error;
  }
}

async function resolveGuardianFortuneIdentity(request, env, auth) {
  if (auth?.userId) {
    return {
      userId: String(auth.userId),
      guestIdHash: "",
      cookie: "",
      isLoggedIn: true,
    };
  }
  const guest = guardianFortuneGuestIdFromRequest(request);
  let guestIdHash;
  try {
    guestIdHash = await hashGuardianFortuneGuestId(guest.value, { env });
  } catch (error) {
    throw createHttpError(503, "비로그인 상담을 준비하는 중 문제가 생겼어요.", {
      error: error?.message === "GUARDIAN_FORTUNE_GUEST_SECRET_MISSING"
        ? "GUARDIAN_FORTUNE_GUEST_ID_UNAVAILABLE"
        : "GUARDIAN_FORTUNE_GUEST_ID_INVALID",
    });
  }
  const secure = new URL(request.url).protocol === "https:";
  return {
    userId: "",
    guestIdHash,
    cookie: guest.issued ? buildGuardianFortuneGuestCookie(guest.value, { secure }) : "",
    isLoggedIn: false,
  };
}

async function enforceGuardianFortuneRateLimit({ request, env, identity }) {
  if (String(env.GUARDIAN_FORTUNE_RATE_LIMIT_ENABLED || "").toLowerCase() !== "true") return null;
  const subject = identity.isLoggedIn ? `user:${identity.userId}` : `guest:${identity.guestIdHash}`;
  const subjectHash = await sha256Hex(`guardian-fortune:${subject}`);
  const result = await incrementRateLimit({
    subjectHash,
    endpoint: "guardian_fortune_generate",
    windowMs: GUARDIAN_FORTUNE_RATE_LIMIT_WINDOW_MS,
    env,
  });
  if (result.count <= GUARDIAN_FORTUNE_RATE_LIMIT_MAX) return null;
  return {
    ok: false,
    status: 429,
    error: "GUARDIAN_FORTUNE_RATE_LIMITED",
    message: "요청이 잠시 많아요. 잠시 후 다시 시도해 주세요.",
    retryAfterSeconds: Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
}

async function enforceGuardianFortuneShareRateLimit({ env, identity }) {
  if (String(env.GUARDIAN_FORTUNE_RATE_LIMIT_ENABLED || "").toLowerCase() !== "true") return null;
  const subject = identity.isLoggedIn ? `user:${identity.userId}` : `guest:${identity.guestIdHash}`;
  const subjectHash = await sha256Hex(`guardian-fortune:${subject}`);
  const result = await incrementRateLimit({
    subjectHash,
    endpoint: "guardian_fortune_share_create",
    windowMs: GUARDIAN_FORTUNE_RATE_LIMIT_WINDOW_MS,
    env,
  });
  if (result.count <= GUARDIAN_FORTUNE_SHARE_RATE_LIMIT_MAX) return null;
  return {
    ok: false,
    status: 429,
    error: "GUARDIAN_FORTUNE_SHARE_RATE_LIMITED",
    message: "공유 요청이 잠시 많아요. 잠시 후 다시 시도해 주세요.",
    retryAfterSeconds: Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
}

async function handleGuardianFortuneUsageRoute(request, env, trace) {
  if (!isGuardianFortuneApiEnabled(env)) {
    return guardianFortuneRouteResponse({ ok: true, ...buildGuardianFortuneDisabledUsageStatus() });
  }

  const auth = await resolveGuardianFortuneOptionalAuth(request, env);
  trace.authVerified = Boolean(auth);
  const identity = await resolveGuardianFortuneIdentity(request, env, auth);
  const store = createMongoGuardianFortuneStore({ env });
  const status = await withMongoRetry(env, async () => {
    trace.dbConnected = true;
    return buildGuardianFortuneUsageStatus({
      userId: identity.userId,
      guestIdHash: identity.guestIdHash,
      dateKey: getGuardianFortuneDateKey(new Date()),
      store,
    });
  });
  return guardianFortuneRouteResponse({ ok: true, ...status }, { cookie: identity.cookie });
}

async function handleGuardianFortuneAnonymousMergeRoute(request, env, trace) {
  const auth = await requireUserFromRequest(request, env, { allowDbFallback: true });
  trace.authVerified = true;
  const guest = guardianFortuneGuestIdFromRequest(request);
  const guestIdHash = await hashGuardianFortuneGuestId(guest.value, { env });
  const result = await mergeGuardianFortuneAnonymousUsage({ userId: String(auth.userId), guestIdHash, env });
  return guardianFortuneRouteResponse({ ok: true, ...result });
}

/**
 * 무료 횟수를 소진한 로그인 사용자의 회당 결제 증빙 확인.
 *
 * 🔴 proven === null 은 "결제 안 함"이 아니라 "DB 장애로 확인 못 함"이다. 이걸 402 로
 * 내리면 이미 결제한 사용자가 결과를 못 받고 돈만 나간다 — degraded 로 올려 503 을 만든다.
 */
function buildGuardianFortunePaidAccessResolver(env, coinPrice) {
  return async ({ userId, requestId }) => {
    if (!userId) return { ok: false };
    const proof = await verifyPerUsePayment(env, {
      userId,
      featureKey: GUARDIAN_FORTUNE_PAID_FEATURE_KEY,
      coinPrice,
      requestId,
    });
    logPerUsePaymentProof(GUARDIAN_FORTUNE_PAID_FEATURE_KEY, proof);
    if (proof?.proven === true) return { ok: true };
    if (proof?.proven === null) return { ok: false, degraded: true };
    return { ok: false };
  };
}

async function handleGuardianFortuneGenerateRoute(request, env, ctx, trace) {
  if (!isGuardianFortuneApiEnabled(env)) {
    return guardianFortuneRouteResponse({
      ok: false,
      status: 403,
      error: GUARDIAN_FORTUNE_ERROR_CODES.FEATURE_DISABLED,
      message: "오늘의 귀인 운세는 준비 중이에요.",
      usage: buildGuardianFortuneDisabledUsageStatus(),
    });
  }

  const body = await readJson(request);
  const auth = await resolveGuardianFortuneOptionalAuth(request, env);
  trace.authVerified = Boolean(auth);
  const identity = await resolveGuardianFortuneIdentity(request, env, auth);
  const requestId = String(
    body?.requestId
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key")
      || createGuardianFortuneRequestId(),
  ).trim().slice(0, 120);
  let result;
  try {
    // 형제 라우트 /guardian/usage 와 같은 형태로 연결까지만 재시도한다. 맨 connectDb 는 콜드
    // 아이솔레이트의 서버선택 타임아웃 한 번에 그대로 죽어 영문 503 이 됐다.
    // 🔴 generateGuardianFortuneRequest 는 이 래퍼 밖에 둔다 — 안의 verifyPerUsePayment 가
    //    이미 withMongoRetry 를 쓰고(중첩 금지), 감싸면 LLM 생성까지 재시도 대상이 된다.
    await withMongoRetry(env, async () => { trace.dbConnected = true; });
    // 🔴 rate limit 은 이 try **안**이어야 한다 — incrementRateLimit 이 Mongo 를 쓰므로 밖에 두면
    //    DB 장애가 아래 한국어 503 계약(SERVICE_TEMPORARILY_UNAVAILABLE + retryable)을 건너뛰고
    //    공용 handleRouteError 의 영문 503 으로 샌다. 연결은 바로 위 withMongoRetry 가 이미
    //    세웠으므로 여기서 다시 감싸지 않는다(중첩 재시도 금지).
    const rateLimitResponse = await enforceGuardianFortuneRateLimit({ request, env, identity });
    if (rateLimitResponse) return guardianFortuneRouteResponse(rateLimitResponse, { cookie: identity.cookie });
    const store = createMongoGuardianFortuneStore({ env });
    result = await generateGuardianFortuneRequest({
      input: body,
      userId: identity.userId,
      guestIdHash: identity.guestIdHash,
      requestId,
      dateKey: getGuardianFortuneDateKey(new Date()),
      store,
      resolvePaidAccess: buildGuardianFortunePaidAccessResolver(
        env,
        Number(FEATURE_KEY_PRICE_TABLE[GUARDIAN_FORTUNE_PAID_FEATURE_KEY]?.cost || 0),
      ),
      contextOptions: { env, requestUrl: request.url, ctx },
      // Scenario switches are test-only. Production clients cannot select a failure mode.
      scenario: String(env.NODE_ENV || "").toLowerCase() === "test" ? String(body?.mockScenario || "normal") : "normal",
    });
  } catch (error) {
    // 일시적 DB 장애는 이 기능의 계약 안에서 재시도 가능한 한국어 503 으로 내보낸다.
    // 그대로 두면 공용 handleRouteError 가 코드도 retryable 도 없는 영문 503 을 낸다.
    if (!isDbUnavailableError(error)) throw error;
    return guardianFortuneRouteResponse({
      ok: false,
      status: 503,
      error: GUARDIAN_FORTUNE_ERROR_CODES.SERVICE_TEMPORARILY_UNAVAILABLE,
      message: guardianFortuneSafeErrorMessage(GUARDIAN_FORTUNE_ERROR_CODES.SERVICE_TEMPORARILY_UNAVAILABLE),
      requestId,
      retryable: true,
    }, { cookie: identity.cookie });
  }
  if (result?.ok === true && identity.userId) invalidateAccessStateCacheForUser(identity.userId);
  return guardianFortuneRouteResponse(result, { cookie: identity.cookie });
}

async function handleGuardianFortuneChatRoute(request, env, ctx, trace) {
  if (!isGuardianFortuneApiEnabled(env)) {
    return guardianFortuneRouteResponse({
      ok: false,
      status: 403,
      error: GUARDIAN_FORTUNE_ERROR_CODES.FEATURE_DISABLED,
      message: "오늘의 귀인 운세는 준비 중이에요.",
      usage: buildGuardianFortuneDisabledUsageStatus(),
    });
  }

  const body = await readJson(request);
  const auth = await resolveGuardianFortuneOptionalAuth(request, env);
  trace.authVerified = Boolean(auth);
  const identity = await resolveGuardianFortuneIdentity(request, env, auth);
  const requestId = String(
    body?.requestId
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key")
      || createGuardianFortuneRequestId(),
  ).trim().slice(0, 120);
  const rateLimitResponse = await enforceGuardianFortuneRateLimit({ request, env, identity });
  if (rateLimitResponse) return guardianFortuneRouteResponse(rateLimitResponse, { cookie: identity.cookie });

  await connectDb(env);
  trace.dbConnected = true;
  const transformer = new TransformStream();
  const writer = transformer.writable.getWriter();
  const run = (async () => {
    try {
      await writeGuardianFortuneChatSse(writer, "status", { status: "started" });
      // The public chat route intentionally uses the verified context/mock path.
      // It never enables a live provider and does not persist a transcript.
      const result = await generateGuardianFortuneRequest({
        input: { ...body, mode: "yeoni" },
        userId: identity.userId,
        guestIdHash: identity.guestIdHash,
        requestId,
        dateKey: getGuardianFortuneDateKey(new Date()),
        store: createMongoGuardianFortuneStore({ env }),
        generator: generateGuardianFortuneWithMockLLM,
        abortSignal: request.signal,
        onDelivery: (delivery) => writeGuardianFortuneChatSse(writer, "result", delivery),
        contextOptions: { env, requestUrl: request.url, ctx, disableShare: true },
        scenario: String(env.NODE_ENV || "").toLowerCase() === "test" ? String(body?.mockScenario || "normal") : "normal",
      });
      if (!result.ok) {
        await writeGuardianFortuneChatSse(writer, "error", {
          error: result.error || GUARDIAN_FORTUNE_ERROR_CODES.SERVER_ERROR,
          message: result.message || "상담을 준비하지 못했어요.",
          requestId: result.requestId || requestId,
          usage: result.usage || null,
        });
        return;
      }
      await writeGuardianFortuneChatSse(writer, "complete", {
        requestId: result.requestId,
        usage: result.usage,
        shareDraftToken: result.shareDraftToken || "",
      });
      if (identity.userId) invalidateAccessStateCacheForUser(identity.userId);
    } catch {
      await writeGuardianFortuneChatSse(writer, "error", {
        error: GUARDIAN_FORTUNE_ERROR_CODES.SERVER_ERROR,
        message: "상담을 준비하지 못했어요.",
        requestId,
      }).catch(() => {});
    } finally {
      await writer.close().catch(() => {});
    }
  })();
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(run);
  else void run;
  return new Response(transformer.readable, {
    headers: identity.cookie ? { ...GUARDIAN_FORTUNE_CHAT_SSE_HEADERS, "Set-Cookie": identity.cookie } : GUARDIAN_FORTUNE_CHAT_SSE_HEADERS,
  });
}

async function handleGuardianFortuneShareCreateRoute(request, env, trace) {
  if (!isGuardianFortuneApiEnabled(env) || !isGuardianFortuneShareEnabled(env)) {
    return guardianFortuneRouteResponse({
      ok: false,
      status: 404,
      error: "GUARDIAN_FORTUNE_SHARE_DISABLED",
      message: "공유 기능을 찾을 수 없습니다.",
    });
  }

  const body = await readJson(request);
  const tokenResult = await verifyGuardianFortuneShareDraftToken(body?.shareDraftToken, { env });
  if (!tokenResult.ok) {
    return guardianFortuneRouteResponse({
      ok: false,
      status: 400,
      error: tokenResult.errorCode,
      message: "공유 준비가 만료되었어요. 결과를 다시 생성해 주세요.",
    });
  }

  const auth = await resolveGuardianFortuneOptionalAuth(request, env);
  trace.authVerified = Boolean(auth);
  const identity = await resolveGuardianFortuneIdentity(request, env, auth);
  const rateLimitResponse = await enforceGuardianFortuneShareRateLimit({ env, identity });
  if (rateLimitResponse) return guardianFortuneRouteResponse(rateLimitResponse, { cookie: identity.cookie });

  await connectDb(env);
  trace.dbConnected = true;
  const created = await createGuardianFortuneShareSnapshot({
    draft: tokenResult.payload,
    requestUrl: request.url,
    env,
    model: GuardianFortuneSharedSnapshot,
  });
  return guardianFortuneRouteResponse({
    ok: true,
    status: 201,
    shareId: created.snapshot.shareId,
    shareUrl: created.shareUrl,
    shareText: created.snapshot.shareText,
    title: created.snapshot.title,
    reused: created.reused,
  }, { cookie: identity.cookie });
}

async function handleGuardianFortuneShareReadRoute(request, env, trace, shareId) {
  if (!isGuardianFortuneApiEnabled(env) || !isGuardianFortuneShareEnabled(env)) return notFound();
  const snapshotId = String(shareId || "").trim();
  if (!snapshotId) return notFound();
  await connectDb(env);
  trace.dbConnected = true;
  const snapshot = await findPublicGuardianFortuneSnapshot({ shareId: snapshotId, model: GuardianFortuneSharedSnapshot });
  if (!snapshot) return notFound();
  return json(snapshot, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}

export async function handleFortuneRoutes(request, env, ctx = null) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/fortune");
  const trace = {
    route: "fortune",
    requestPath: new URL(request.url).pathname,
    method,
    authPresent: Boolean(request.headers.get("Authorization") || request.headers.get("Cookie")),
    authVerified: false,
    dbConnected: false,
    mongoQueryFailed: false,
    paymentProviderFailed: false,
  };

  try {
    if (method === "GET" && path === "/check") return await handleCheck();

    if (method === "GET" && path === "/guardian/usage") {
      return await handleGuardianFortuneUsageRoute(request, env, trace);
    }

    if (method === "POST" && path === "/guardian/merge-anonymous") {
      return await handleGuardianFortuneAnonymousMergeRoute(request, env, trace);
    }

    if (method === "POST" && path === "/guardian/generate") {
      return await handleGuardianFortuneGenerateRoute(request, env, ctx, trace);
    }

    if (method === "POST" && path === "/guardian/chat") {
      return await handleGuardianFortuneChatRoute(request, env, ctx, trace);
    }

    if (method === "POST" && path === "/guardian/share") {
      return await handleGuardianFortuneShareCreateRoute(request, env, trace);
    }

    if (method === "GET" && path.startsWith("/guardian/share/")) {
      return await handleGuardianFortuneShareReadRoute(request, env, trace, path.slice("/guardian/share/".length));
    }

    if (method === "GET" && path === "/pig-coin/prices") return handlePigCoinPrices();
    if (method === "GET" && path === "/pig-coin/profile-subscription/plans") return handleProfileSubscriptionPlans();

    if (method === "GET" && (path === "/pig-coin/balance" || path === "/pig-coin/profile-subscription/status" || path === "/pig-coin/subscription/status" || path === "/pig-coin/profile-subscription/me")) {
      const isBalanceRoute = path === "/pig-coin/balance";

      // 이 엔드포인트는 페이지 로드마다 자동으로 불린다. 유저별 몇 초 캐시로 버스트를 collapse 해
      // Mongo 왕복 자체를 없앤다(캐시 키는 로컬 JWT 검증만으로 만들어 Mongo 0회).
      const statusCacheUserId = isBalanceRoute
        ? ""
        : await peekAccessTokenUserId(request, env).catch(() => "");
      if (statusCacheUserId) {
        const cachedStatus = readSubscriptionStatusFromCache(statusCacheUserId);
        if (cachedStatus) return json(cachedStatus);
      }

      let auth;
      try {
        auth = await getOptionalUserFromRequest(request, env, {
          allowDbFallback: true,
          // 두 경로 모두 인증 조회에서 필요한 필드를 함께 받아 뒤의 재조회를 없앤다.
          // balance 는 예전에 일부러 null 을 줘서 users 를 두 번 읽었다.
          userProjection: isBalanceRoute ? BALANCE_ROUTE_USER_PROJECTION : SUBSCRIPTION_STATUS_USER_PROJECTION,
        });
      } catch (error) {
        if (isAuthDbInfraError(error)) {
          return isBalanceRoute ? buildDbFallbackBalance(null, error) : buildDbFallbackSubscriptionStatus(null, error);
        }
        throw error;
      }
      if (!auth) {
        return isBalanceRoute ? handleGuestBalance() : handleGuestSubscriptionStatus();
      }

      trace.authVerified = true;
      try {
        if (isBalanceRoute) return await handleBalance(auth, env);
        const statusResponse = await handleSubscriptionStatus(request, env, auth);
        // 정상 응답만 캐시한다. degraded 는 "확인 실패"라 캐시하면 복구 후에도 재생된다.
        if (statusCacheUserId && statusResponse?.status === 200) {
          try {
            const payload = await statusResponse.clone().json();
            if (payload && payload.degraded !== true) writeSubscriptionStatusToCache(statusCacheUserId, payload);
          } catch (_cacheErr) {}
        }
        return statusResponse;
      } catch (error) {
        if (isBalanceRoute) return buildDbFallbackBalance(auth, error);
        return buildDbFallbackSubscriptionStatus(auth, error);
      }
    }

    if (method === "POST" && path === "/pig-coin/unlock") {
      const authCtx = await resolvePigCoinConsumeAuthFromGuard(request, env);
      trace.authVerified = true;
      await connectDb(env);
      trace.dbConnected = true;
      return await handlePigCoinUnlock(request, authCtx.auth, { env });
    }

    if (method === "POST" && path === "/pig-coin/consume") {
      const authCtx = await resolvePigCoinConsumeAuthFromGuard(request, env);
      trace.authVerified = true;
      await connectDb(env);
      trace.dbConnected = true;
      return await handlePigCoinConsume(request, authCtx.auth, { env });
    }

    if (method === "POST" && path === "/ziwei/ai-prompt") {
      const auth = await resolvePaidRouteAuth(request, env, { userProjection: AI_PROMPT_CONSUME_USER_PROJECTION });
      if (!auth) {
        return buildZiweiAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      return await handleZiweiAIPrompt(request, auth, env);
    }

    if (method === "POST" && path === "/sukuyo/ai-prompt") {
      const auth = await resolvePaidRouteAuth(request, env, { userProjection: AI_PROMPT_CONSUME_USER_PROJECTION });
      if (!auth) {
        return buildSukuyoAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      return await handleSukuyoAIPrompt(request, auth, env);
    }

    // 계산 근거만 즉시 돌려준다 — LLM 미호출, DB 접근 없음, 과금 없음.
    // 신원 확인은 로컬 JWT 검증만 써서 Mongo를 한 번도 건드리지 않는다(생성 앞단에서 병렬로 불린다).
    if (method === "POST" && path === "/saju-ai-consultation/basis") {
      const userId = await peekAccessTokenUserId(request, env);
      if (!userId) return buildSajuAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      trace.authVerified = true;
      return await handleSajuAIConsultationBasis(request);
    }

    if (method === "POST" && (path === "/saju/ai-prompt" || path === "/saju/question-prompt" || path === "/saju-ai-consultation/create")) {
      const auth = await resolvePaidRouteAuth(request, env, { userProjection: AI_PROMPT_CONSUME_USER_PROJECTION });
      if (!auth) {
        return buildSajuAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      return await handleSajuAIPrompt(request, auth, env, ctx);
    }

    if (method === "GET" && (path === "/saju-ai-consultation/status" || path.startsWith("/saju-ai-consultation/status/"))) {
      const auth = await resolvePaidRouteAuth(request, env);
      if (!auth) {
        return buildSajuAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      return await handleSajuAIConsultationStatus(request, auth, path);
    }

    if (method === "GET" && (path === "/saju-ai-consultation/result" || path.startsWith("/saju-ai-consultation/result/"))) {
      const auth = await resolvePaidRouteAuth(request, env);
      if (!auth) {
        return buildSajuAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      return await handleSajuAIConsultationResult(request, auth, path);
    }

    if (method === "POST" && path === "/astrology/ai-prompt") {
      const auth = await resolvePaidRouteAuth(request, env, { userProjection: AI_PROMPT_CONSUME_USER_PROJECTION });
      if (!auth) {
        return buildAstrologyAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      return await handleAstrologyAIPrompt(request, auth, env);
    }

    if (method === "POST" && path === "/vedic/ai-prompt") {
      const auth = await resolvePaidRouteAuth(request, env, { userProjection: AI_PROMPT_CONSUME_USER_PROJECTION });
      if (!auth) {
        return buildVedicAIPromptError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      return await handleVedicAIPrompt(request, auth, env);
    }

    if (method === "POST" && path === "/vedic/prashna/snapshot") {
      const auth = await resolvePaidRouteAuth(request, env);
      if (!auth) {
        return buildVedicPrashnaError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      return await handleVedicPrashnaSnapshot(request, auth, env);
    }

    if (method === "POST" && path === "/vedic/prashna/generate") {
      const auth = await resolvePaidRouteAuth(request, env, { userProjection: AI_PROMPT_CONSUME_USER_PROJECTION });
      if (!auth) {
        return buildVedicPrashnaError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      return await handleVedicPrashnaGenerate(request, auth, env);
    }

    if (method === "GET" && path === "/vedic/prashna/result") {
      const auth = await resolvePaidRouteAuth(request, env);
      if (!auth) {
        return buildVedicPrashnaError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
      }
      trace.authVerified = true;
      return await handleVedicPrashnaResult(request, auth, env);
    }

    // 🔴 폐지된 410 톰스톤 3종(charge-simulate·share-reward·subscribe)을 여기 인증 앞으로 당기지 말 것.
    // users 읽기 1회를 아낄 수 있어 보이지만, 비로그인 호출에 401 대신 410 이 나가 라우트의 폐지 여부를
    // 미인증자에게 알려 준다. __tests__/worker/api-status-normalization.test.js 가 401 을 강제한다.
    const auth = await requireUserFromRequest(request, env);
    trace.authVerified = true;

    await connectDb(env);
    trace.dbConnected = true;

    if (method === "POST" && path === "/pig-coin/refund") return await handlePigCoinRefund(request, auth);
    if (method === "POST" && path === "/consume") return await handleConsume(auth);
    if (method === "POST" && path === "/pig-coin/charge-simulate") return await handleChargeSimulate(request, env, auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/start-service") return await handleStartService(request, auth);
    if (method === "POST" && path === "/pig-coin/share-reward") return await handleShareReward(request, auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/subscribe") return await handleSubscribe(request, auth);
    if (method === "POST" && path === "/pig-coin/profile-subscription/cancel") return await handleSubscriptionCancel(request, auth);

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    try {
      console.error("[worker-fortune-route-error]", JSON.stringify({
        ...trace,
        name: error?.name || "Error",
        code: error?.code || "FORTUNE_ROUTE_ERROR",
        message: String(error?.message || "Unknown error"),
      }));
    } catch (e) {
      console.error("[worker-fortune-route-error]", error);
    }
    trace.mongoQueryFailed = /mongo|mongoose|cast to objectid|findbyid|findone|query/i.test(String(error?.message || ""));
    return handleRouteError(error, { request, env, trace });
  }
}

export const __fortuneAccessTestUtils = {
  resolveServerCoinPricing: resolveServerCoinPricingFromGuard,
  getForcePaidTestAccountEmails: getForcePaidTestAccountEmailsFromGuard,
  resolvePigCoinConsumeAuth: resolvePigCoinConsumeAuthFromGuard,
  isAdminPigCoinBypassEnabled: isAdminPigCoinBypassEnabledFromGuard,
  handleSubscriptionStatus,
  handlePigCoinRefund,
  buildPigCoinRefundDeductQueries,
  buildAIPromptCardRefundPaymentQuery,
  readAIPromptRefundContext: readSajuAIPromptPointRefundContext,
  isSajuAIPromptStaleGeneratingExecution,
  resolveSajuAIPromptFailureBilling,
  mapSajuAIExecutionStatus,
  buildSajuAIStatusPayload,
  readAIPromptRequestId,
};

// 그룹 병렬 생성은 결제 경로 한가운데에 있어 mock 없이는 손댈 수 없다.
// scripts/verify-saju-ai-section-plan.mjs 가 이 seam 으로 가짜 응답을 물려 웨이브 동작을 검증한다.
export const __sajuAiSectionTestUtils = {
  runSajuAISectionWaves,
  buildSajuAISectionPrompt,
  buildSajuAISectionPromptPrefix,
  isSajuAISectionRowShort,
  scoreSajuAISectionRow,
  countSajuAIVisibleChars,
  SAJU_AI_SECTION_TIMEOUT_MS,
  SAJU_AI_SECTION_REPAIR_TIMEOUT_MS,
  SAJU_AI_SECTION_REPAIR_MIN_REMAINING_MS,
  SAJU_AI_SECTION_REPAIR_MAX_OUTPUT_TOKENS,
};
