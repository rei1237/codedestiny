import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import { KarmaDestinyAiConsultation, MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, User } from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { resolveFeatureAccessPolicy } from "../lib/entitlement-policy.js";
import { callGeminiText } from "../lib/gemini.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { runWithConcurrency } from "../lib/concurrency.js";

// 결정적(생년월일+질문 기반) 생성 → 캐시 + in-flight dedup으로 재시도/새로고침 중복 과금 방지.
// 초기 생성이 최대 3회(생성→교정→확장) 순차 호출이라 각 단계에 개별 키로 캐시를 건다.
function buildKarmaLlmCache(env, stageKey) {
  return {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: `karma-destiny-ai-v1-${stageKey}`,
  };
}
import {
  LENS_FIELD_PRIORITY,
  LENS_IDS,
  LENS_ROLES,
  buildKarmaDestinyIntegratedResult,
  computeLensContribution,
} from "../lib/karma-destiny-ai-calculations.js";
import { handleBillingRoutes, BILLING_SNAPSHOT_USER_PROJECTION } from "./billing.js";

const SERVICE_KEY = "karma-destiny-ai";
const FEATURE_KEY = "karma-destiny-ai-consultation";
const ACCESS_TOKEN_TYPE = "karma-destiny-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const ORDER_NAME = "운명의 업 전문가 상담";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "생년월일, 출생시간, 출생지 정보를 다시 확인해 주세요.";
const PLACE_ERROR_MESSAGE = "출생지 정보를 확인하지 못했습니다. 도시와 국가를 다시 입력해 주세요.";
const CALCULATION_ERROR_MESSAGE = "운명의 업 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.";
const CUSTOM_QUESTION_REQUIRED_MESSAGE = "직접 질문을 선택했다면 지금 가장 궁금한 내용을 짧게 적어 주세요.";

const GEMINI_ENV_KEYS = [
  "GEMINIF_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
];

const FOCUS_AREA_LABELS = Object.freeze({
  overall: "전체 운명의 업",
  love: "사랑과 이별의 업",
  money: "돈과 일에서 반복되는 문제",
  career: "재능과 사명의 방향",
  relationship: "관계에서 반복되는 상처",
  family: "가족과 인연의 업",
  lifePattern: "반복되는 인생 패턴",
  spirituality: "고독감과 내면의 숙제",
  custom: "현재 고민 상담",
});

const VALID_TOPICS = new Set([
  "전체 운명의 업",
  "반복되는 인생 패턴",
  "관계에서 반복되는 상처",
  "돈과 일에서 반복되는 문제",
  "가족과 인연의 업",
  "사랑과 이별의 업",
  "고독감과 내면의 숙제",
  "재능과 사명의 방향",
  "지금 인생의 전환점",
  "앞으로 풀어야 할 삶의 과제",
  "올해의 업과 기회",
  "현재 고민 상담",
]);

// 리포트 구조 판(version). 1 = 구 16장(3체계), 2 = 15장 다섯 렌즈.
// 진행 중 문서를 판이 다른 정의로 이어붙이면 챕터 id 가 충돌해 결제 후 무결과가 되므로,
// 생성 재개 가능 여부 판정(isResumableExisting)의 기준이기도 하다.
const REPORT_SCHEMA_VERSION = 2;

const INITIAL_CONSULTATION_MIN_LENGTH = 30000;
const INITIAL_CONSULTATION_MAX_LENGTH = 0;
const INITIAL_CONSULTATION_SECTION_MIN_LENGTH = 1500;
// 장 단위 병렬 생성으로 바뀌면서 한 호출이 쓰는 분량은 1장(2,100~2,400자)뿐이다.
// llm-budget 기준 (2400+1500)×1.5 ≈ 5,850 토큰이므로 7,000이면 충분하고, 구 20,000처럼
// MAX_TOKENS 잘림 → extractJsonPayload 실패 → 수선 재호출로 가는 경로가 사실상 사라진다.
const CHAPTER_MAX_OUTPUT_TOKENS = 7000;
// 통짜(비배치) 경로 — repair/expand 재작성용으로만 남는다.
const INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS = 20000;
const PREMIUM_BATCH_SIZE = 4;
// 배치 안에서 장을 몇 개까지 동시에 굽는가. master-love-codex 가 이 워커에서 4가 안전함을
// 이미 증명했다.
const PREMIUM_CHAPTER_CONCURRENCY = 4;
// 배치 1회 = 생성(120s) + JSON 수선/보강 재호출 가능성까지의 최악 시간을 덮어야 한다.
// 락이 파이프라인보다 짧으면 병렬 폴링 POST가 같은 배치를 중복 기동한다(찻집 390s 락과 같은 원리).
const PREMIUM_BATCH_LOCK_TTL_MS = 390_000;
const PREMIUM_REINFORCEMENT_MAX_ATTEMPTS = 2;
const PREMIUM_CHAPTER_TARGET_LENGTH = "2,100~2,400자";
const INITIAL_SECTION_SYMBOLS = ["業", "源", "流", "課", "緣", "情", "財", "職", "體", "才", "轉", "策", "總", "句", "箋"];

// 프롬프트에 싣는 계산 근거 총량. 구조가 바뀌어도 총량은 기존(14,000자)을 유지한다 —
// 이미 운영에서 검증된 안전대이기 때문이다. 달라지는 것은 **배분 방식**이다.
const LENS_DIGEST_TOTAL_CHARS = 14000;
// 주도 렌즈에 몰아준다. 배경 렌즈는 한 줄 요약 수준만 남아 그 렌즈로는 말할 수 없게 된다 —
// 이것이 "같은 결론을 표현만 바꿔 반복"을 막는 유일한 실효 장치다.
const LENS_WEIGHT = Object.freeze({ lead: 3.2, support: 1.4, background: 0.35 });

// 영역별 에너지 강도를 산출하는 장. 그 영역을 실제로 분석한 장이 자기 근거 안에서 판정한다.
// (기여도·근거와 달리 이것은 해석 판단이라 서버가 결정론적으로 낼 수 없다.)
const ENERGY_DOMAIN_LABELS = Object.freeze({
  relationship: "관계",
  love: "사랑",
  money: "돈",
  career: "직업",
  health: "건강",
});

/**
 * 15장 정의 — 사용자 12구조 + 종합 결론 + 핵심 문장 + 최종 편지.
 *
 * leadLens   그 장의 시작과 끝을 맡는 렌즈. "cross"는 다섯 렌즈를 엮는 장, "none"은
 *            특정 렌즈에 매이지 않는 장(핵심 문장·편지).
 * notCovered 다른 장이 다루므로 여기서 쓰지 말 것. 오염이 심한 쌍에만 손으로 박는다
 *            (5↔6 인간관계/사랑, 7↔8 돈/직업, 2↔4 근원/과제, 3↔11 현재흐름/전환점,
 *             12↔13 전략/결론). 나머지는 buildCoveredHint 가 자동 생성한다.
 * evidenceKeys "왜 이런 결론인가" 펼치기에 서버가 직접 인용할 계산값 경로.
 * relay      렌즈가 서로를 이어받는 순서. 같은 결론을 반복하는 대신 확장하게 만든다.
 */
const PREMIUM_CHAPTERS = Object.freeze([
  {
    id: "chapter-01", order: 1, symbol: "業", title: "운명의 핵심 주제",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "cross", supportLens: ["saju", "ziwei", "western", "vedic", "sukuyo"],
    required: [
      "이번 삶 전체를 관통하는 운명의 주제를 한 문장으로 먼저 제시",
      "그 한 문장이 왜 성립하는지를 서로 다른 관점이 어떻게 같은 곳을 가리키는지로 설명",
      "이 주제가 일상에서 반복적으로 나타나는 장면",
    ],
    notCovered: "운명이 형성된 원인의 상세(2장 담당), 지금이 어느 시기인지(3장 담당), 구체적 행동 목록(12장 담당)",
    evidenceKeys: ["synthesis.convergence", "saju.dayMaster", "ziwei.lifePalace", "vedic.nakshatra", "sukuyo.archetypeTitle"],
    relay: "다섯 관점이 각각 어디를 가리키는지 한 번씩만 짚고, 그것들이 겹치는 한 점을 이번 삶의 주제로 세운다. 같은 말을 다섯 번 하지 않는다.",
  },
  {
    id: "chapter-02", order: 2, symbol: "源", title: "운명의 근원",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "saju", supportLens: ["ziwei", "vedic"],
    required: [
      "타고난 기질과 결정 구조가 어떻게 만들어졌는지(일간·오행 균형·강약 근거)",
      "그 기질이 만들어 내는 반복 선택의 모양",
      "이 구조가 삶의 어느 무대에서 펼쳐지도록 짜였는지",
      "이 생이 시작될 때 이미 정해진 성장 방향",
    ],
    notCovered: "이번 생에서 풀어야 할 과제의 내용(4장 담당), 현재 시기 판정(3장 담당)",
    evidenceKeys: ["saju.dayMaster", "saju.pillars", "saju.fiveElements", "saju.strength", "saju.seasonalBalance", "ziwei.lifePalace", "vedic.lagna", "vedic.nakshatra"],
    relay: "사주가 기질과 결정 구조의 뿌리를 세우면, 자미두수가 그 구조가 놓인 무대를 지정하고, 베다가 이 생이 애초에 어디로 향하도록 짜였는지로 닫는다.",
  },
  {
    id: "chapter-03", order: 3, symbol: "流", title: "현재 삶의 흐름",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "ziwei", supportLens: ["saju", "vedic"],
    required: [
      "성장기·전환기·정체기·확장기·수확기 중 지금이 어디인지 하나로 판정하고 그 근거를 계산값으로 제시",
      "그 시기가 언제 시작해 언제까지 이어지는지(계산된 구간 안에서만)",
      "이 시기에 힘이 실리는 영역과 힘이 빠지는 영역",
      "이 시기를 잘못 쓰면 남는 것과 잘 쓰면 남는 것",
    ],
    notCovered: "앞으로의 전환점 연도 나열(11장 담당), 직업 선택의 방향(8장 담당), 실행 행동 목록(12장 담당)",
    evidenceKeys: ["ziwei.majorLuckActive", "ziwei.yearlyLuck", "saju.majorLuckActive", "saju.yearlyLuck", "vedic.dashaCurrent"],
    relay: "자미두수가 지금이 인생의 어느 구간인지 무대를 지정하면, 사주가 그 구간에 실제로 어떤 기운이 도는지 현실 감각으로 받고, 베다가 그 구간이 영혼의 성장에서 무엇을 요구하는지로 닫는다.",
  },
  {
    id: "chapter-04", order: 4, symbol: "課", title: "업의 핵심 과제",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "vedic", supportLens: ["saju", "western"],
    required: [
      "이번 생에서 반복되는 패턴의 정체",
      "배워야 하는 것과 놓아야 하는 집착",
      "익숙해서 자꾸 돌아가는 자리와, 낯설어서 피하는 성장 방향",
      "이 과제가 현실에서 어떤 신호로 나타나는지",
    ],
    notCovered: "기질이 만들어진 경위(2장 담당), 관계에서의 구체적 패턴(5장 담당), 마음의 회복 루틴(9장 담당)",
    evidenceKeys: ["vedic.rahuKetu", "vedic.nakshatra", "vedic.dashaCurrent", "saju.unfavorableGod", "saju.natalInteractions", "western.corePlanets"],
    relay: "베다가 이번 생의 과제를 영혼의 언어로 지정하면, 사주가 그 과제가 현실에서 어떤 선택으로 나타나는지 받고, 서양 점성술이 그 선택을 붙드는 무의식의 이유로 닫는다.",
  },
  {
    id: "chapter-05", order: 5, symbol: "緣", title: "인간관계의 업",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "sukuyo", supportLens: ["ziwei", "western"],
    energyDomain: "relationship",
    required: [
      "가족·친구·직장·사회에서 각각 반복되는 관계 패턴",
      "어떤 유형의 사람 앞에서 내가 어떤 자리에 서게 되는지",
      "관계에서 소모되는 지점과 채워지는 지점",
      "건강한 거리 조절의 기준",
    ],
    notCovered: "연애와 이별의 반복(6장 담당 — 여기서는 연인 관계를 다루지 않는다), 원가족이 만든 기질(2장 담당), 협업으로 일하는 방식(8장 담당)",
    evidenceKeys: ["sukuyo.relationAxis", "sukuyo.shadows", "sukuyo.archetypeTitle", "ziwei.keyPalaces", "western.houseCusps"],
    relay: "숙요가 사람과 사람 사이에서 내가 서는 자리를 지정하면, 자미두수가 그 자리가 어느 관계 영역에서 특히 강하게 작동하는지 받고, 서양 점성술이 그때 올라오는 감정의 이유로 닫는다.",
  },
  {
    id: "chapter-06", order: 6, symbol: "情", title: "사랑의 업",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "western", supportLens: ["sukuyo", "ziwei"],
    energyDomain: "love",
    required: [
      "왜 비슷한 유형의 사람에게 끌리는지",
      "왜 이별이 비슷한 방식으로 반복되는지",
      "끌림이 시작되는 순간 무의식이 무엇을 찾고 있는지",
      "이 반복을 끊는 기준",
    ],
    notCovered: "연인이 아닌 관계 전반(5장 담당), 결혼 시기 예측, 가족 관계",
    evidenceKeys: ["western.corePlanets", "western.moon", "western.tightAspects", "sukuyo.relationAxis", "ziwei.keyPalaces"],
    relay: "서양 점성술이 끌림의 무의식적 이유를 밝히면, 숙요가 그래서 실제로 어떤 사람과 어떤 자리로 만나게 되는지 받고, 자미두수가 그 인연이 삶의 어느 국면에서 강해지는지로 닫는다.",
  },
  {
    id: "chapter-07", order: 7, symbol: "財", title: "돈의 업",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "saju", supportLens: ["ziwei", "western"],
    energyDomain: "money",
    required: [
      "돈과 맺고 있는 관계 자체(불안·통제·자유 중 무엇에 묶여 있는지)",
      "돈이 새는 패턴과 모이는 방식",
      "돈을 잘 버는 환경의 조건",
      "투자 성향과 소비 습관에서 반복되는 결정",
    ],
    notCovered: "어떤 일을 해야 하는지·어떻게 일할 때 운이 열리는지(8장 담당 — 여기서는 직업을 다루지 않는다)",
    evidenceKeys: ["saju.tenGods", "saju.usefulGod", "saju.strength", "ziwei.keyPalaces", "ziwei.transformationPlacement", "western.houseCusps"],
    relay: "사주가 돈을 다루는 기질과 손실 구조를 현실 감각으로 짚으면, 자미두수가 재물이 어느 영역을 통해 들어오고 나가는지 받고, 서양 점성술이 지출 직전에 올라오는 감정으로 닫는다.",
  },
  {
    id: "chapter-08", order: 8, symbol: "職", title: "직업의 업",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "ziwei", supportLens: ["saju", "vedic"],
    energyDomain: "career",
    required: [
      "어떤 방식으로 일할 때 운이 열리는지(직업명 추천이 아니라 일하는 방식)",
      "혼자 할 때와 함께 할 때의 차이",
      "성과가 나는 구조와 소모되는 구조",
      "장기적으로 쌓아야 할 전문성의 방향",
    ],
    notCovered: "수입과 재물의 흐름(7장 담당), 아직 모르는 강점의 발견(10장 담당)",
    evidenceKeys: ["ziwei.keyPalaces", "ziwei.sanFangSiZheng", "ziwei.transformationPlacement", "saju.tenGodsByPillar", "vedic.houseLords"],
    relay: "자미두수가 사회에서 맡게 되는 역할과 무대를 지정하면, 사주가 그 무대에서 실제로 잘 도는 일하는 방식을 받고, 베다가 그 일이 이번 생의 소명과 어떻게 이어지는지로 닫는다.",
  },
  {
    id: "chapter-09", order: 9, symbol: "體", title: "건강 에너지",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "saju", supportLens: ["ziwei", "western"],
    energyDomain: "health",
    required: [
      "에너지가 소모되는 방식과 회복되는 방식",
      "스트레스가 몸의 어느 방향으로 먼저 나타나는지",
      "잘 맞는 생활 리듬과 무너지는 리듬",
      "무리하고 있다는 것을 알아차리는 신호",
    ],
    notCovered: "질병 예측이나 진단, 마음의 과제 자체(4장 담당)",
    evidenceKeys: ["saju.fiveElements", "saju.seasonalBalance", "saju.strength", "ziwei.keyPalaces", "western.corePlanets"],
    relay: "사주가 기운의 치우침에서 소모와 회복의 축을 짚으면, 자미두수가 그 부담이 삶의 어느 국면에서 커지는지 받고, 서양 점성술이 몸보다 먼저 지치는 감정의 자리로 닫는다.",
  },
  {
    id: "chapter-10", order: 10, symbol: "才", title: "숨겨진 재능",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "western", supportLens: ["ziwei", "saju"],
    required: [
      "사용자 스스로도 강점으로 세지 않는 능력",
      "그 능력이 지금 어디에 묻혀 있는지",
      "그것이 밖으로 드러날 때의 모양",
      "그 재능을 쓰기 시작하는 첫 조건",
    ],
    notCovered: "일하는 방식(8장 담당), 이미 자각하고 있는 강점의 반복",
    evidenceKeys: ["western.mc", "western.chartRuler", "western.elementBalance", "western.modalityBalance", "ziwei.transformationPlacement", "saju.tenGods"],
    relay: "서양 점성술이 아직 이름 붙이지 못한 성향을 재능으로 번역하면, 자미두수가 그것이 어느 영역에서 빛나는지 받고, 사주가 그것을 현실 능력으로 바꾸는 조건으로 닫는다.",
  },
  {
    id: "chapter-11", order: 11, symbol: "轉", title: "운명의 전환점",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "ziwei", supportLens: ["saju", "vedic"],
    required: [
      "삶에서 중요한 변화가 일어나는 방식(갑자기인지 서서히인지)",
      "계산된 구간을 근거로 한 다음 전환 시기",
      "기회가 왔다는 것을 알아보는 신호",
      "갈림길에서의 선택 기준",
    ],
    notCovered: "지금이 어느 시기인지의 판정(3장 담당 — 여기서는 앞으로 올 변화만 다룬다), 실행 행동 목록(12장 담당)",
    evidenceKeys: ["ziwei.majorLuckTimeline", "saju.majorLuckTimeline", "vedic.dashaNext", "synthesis.convergence"],
    relay: "자미두수가 무대가 바뀌는 지점을 표시하면, 사주가 그 지점에서 실제로 무엇이 달라지는지 받고, 베다가 그 변화가 요구하는 내려놓음으로 닫는다.",
  },
  {
    id: "chapter-12", order: 12, symbol: "策", title: "앞으로의 성장 전략",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "cross", supportLens: ["saju", "ziwei", "western", "vedic", "sukuyo"],
    required: [
      "지금 바로 실행할 수 있는 구체적 행동 5~10개(각각 왜 그 행동인지 근거 한 줄 포함)",
      "당장 멈춰야 할 것과 시작해야 할 것의 구분",
      "관계·일·돈·마음 각 영역에서 하나씩",
      "이 전략이 실패하는 가장 흔한 방식",
    ],
    notCovered: "다섯 관점의 통합 결론 자체(13장 담당), 기억할 문장(14장 담당)",
    evidenceKeys: ["synthesis.convergence", "synthesis.divergence", "saju.usefulGod", "ziwei.majorLuckActive", "vedic.dashaCurrent"],
    relay: "앞 장들에서 이미 밝혀진 것만 재료로 쓴다. 새 해석을 꺼내지 말고, 밝혀진 것을 실행 가능한 행동으로 옮기는 데만 집중한다.",
  },
  {
    id: "chapter-13", order: 13, symbol: "總", title: "다섯 관점의 종합 결론",
    minLength: 1800, targetLength: PREMIUM_CHAPTER_TARGET_LENGTH,
    leadLens: "cross", supportLens: ["saju", "ziwei", "western", "vedic", "sukuyo"],
    required: [
      "각 관점이 무엇을 말했는지 한 줄씩(반복이 아니라 요약)",
      "다섯이 공통으로 가리키는 하나의 결론",
      "서로 어긋나는 지점과 그 어긋남이 뜻하는 것",
      "이 결론을 받아들일 때 삶에서 달라지는 것",
    ],
    notCovered: "새로운 해석의 도입, 행동 목록의 재나열(12장 담당)",
    evidenceKeys: ["synthesis.convergence", "synthesis.divergence", "synthesis.patternSummaries", "synthesis.lensAvailability"],
    relay: "각 관점이 앞서 맡았던 역할을 한 문장씩만 회수하고, 그것들이 겹치는 한 점을 결론으로 세운다. 어긋나는 지점도 숨기지 않고 그것이 무엇을 뜻하는지 밝힌다.",
  },
  {
    id: "chapter-14", order: 14, symbol: "句", title: "운명을 바꾸는 핵심 문장",
    minLength: 800, targetLength: "900~1,200자",
    leadLens: "none", supportLens: [],
    required: [
      "이 상담의 맥락에서만 나올 수 있는 문장 10개",
      "각 문장은 한 줄로 완결되고 바로 기억할 수 있어야 함",
      "흔한 자기계발 문구 금지",
    ],
    notCovered: "설명이나 해석의 반복",
    evidenceKeys: [],
    relay: "앞 장들의 결론을 문장으로 압축한다. 새 근거를 꺼내지 않는다.",
  },
  {
    id: "chapter-15", order: 15, symbol: "箋", title: "최종 편지",
    minLength: 1500, targetLength: "1,700~2,000자",
    leadLens: "none", supportLens: [],
    required: [
      "상담가가 사용자에게 직접 건네는 따뜻한 편지",
      "현실적인 결심 하나",
      "여운이 남는 마지막 문장",
    ],
    notCovered: "앞 장 내용의 요약 나열, 추가 질문 유도",
    evidenceKeys: [],
    relay: "설명을 멈추고 사람의 목소리로 말한다.",
  },
]);

const FINAL_LETTER_CHAPTER_ID = PREMIUM_CHAPTERS[PREMIUM_CHAPTERS.length - 1].id;
const KEY_SENTENCES_CHAPTER_ID = "chapter-14";
const SYNTHESIS_CHAPTER_ID = "chapter-13";

/**
 * 렌즈별 "리포트 내 비중" 원점수 — lensContribution 의 usageWeight 축.
 * 장 정의만으로 결정되므로 사용자 입력과 무관하게 재현된다(LLM 관여 0).
 */
const LENS_USAGE_WEIGHTS = Object.freeze(PREMIUM_CHAPTERS.reduce((acc, definition) => {
  if (definition.leadLens === "cross") {
    for (const id of definition.supportLens) acc[id] = (acc[id] || 0) + 0.6;
  } else if (definition.leadLens && definition.leadLens !== "none") {
    acc[definition.leadLens] = (acc[definition.leadLens] || 0) + 2;
    for (const id of definition.supportLens) acc[id] = (acc[id] || 0) + 1;
  }
  return acc;
}, {}));

// 진행 화면의 별자리 6노드와 1:1로 대응한다(사주 → 자미두수 → 숙요 → 서양 → 베다 → 종합).
// 클라이언트는 generationProgress.stageIndex 로 어느 노드를 밝힐지 정한다.
const GENERATION_STAGES = Object.freeze([
  "사주의 기둥을 세우는 중",
  "자미두수 12궁을 펼치는 중",
  "숙요 27수의 인연을 잇는 중",
  "별자리의 심리를 읽는 중",
  "베다의 업을 헤아리는 중",
  "다섯 관점을 하나로 모으는 중",
]);

// 상담 본문에 새어 나오면 안 되는 것은 (1) 내부 작업 용어와 (2) AI 자기지칭 두 종류뿐이다.
// 구 패턴의 `시스템`·`기능`·단독 `\bAI\b`·`출력`·`결과는`은 "면역 시스템"·"소화 기능"·
// "신장 기능" 같은 정상 한국어를 오탐했다(new-year-ai.js:108-114 의 사후 분석과 동일한 사고).
// 이 라우트에서는 오탐의 대가가 더 크다 — promptLeakDetected → quality.ok=false →
// reinforcePremiumReport 2회 실패 → handleGenerateBatch throw → 결제 후 무결과 503.
// 게다가 cleanForbiddenResult 가 배달 본문을 "면역 상담 흐름"으로 훼손한다.
// 「건강 에너지」장(chapter-09)이 신설되면서 오탐은 가능성이 아니라 확정이 됐다.
const FORBIDDEN_RESULT_PATTERN = /\bPDF\b|챕터|\bchapter\b|\bprogress\b|\bjob\b|프롬프트|시스템\s*(?:메시지|지시)|rawProviderDebug|providerReason|maxOutputTokens|(?:AI|인공지능)\s*(?:가|이|는|은|를|을|로|로서|에\s*의해)?\s*(?:생성|작성|제작|답변|응답|만들)|(?:저는|제가|나는)\s*(?:AI|인공지능|언어\s*모델)|서버 계산 데이터/i;

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function readProcessEnv(key) {
  if (typeof process === "undefined") return "";
  return clean(process.env?.[key], 2000);
}

function getProviderDiagnostics(env = {}) {
  const hasGeminiKey = GEMINI_ENV_KEYS.some((key) => clean(env?.[key], 2000) || readProcessEnv(key));
  const hasEnvAI = typeof env?.AI?.run === "function";
  return {
    hasEnvAI,
    willUseRealLLM: hasGeminiKey || hasEnvAI,
    providerReason: hasGeminiKey ? "gemini_api_key_available" : hasEnvAI ? "workers_ai_binding_available" : "no_real_llm_provider_detected",
  };
}

function isDevelopmentEnv(env = {}) {
  const mode = clean(env?.NODE_ENV || env?.ENVIRONMENT || readProcessEnv("NODE_ENV"), 40).toLowerCase();
  return mode && mode !== "production";
}

function maskBirthDate(value) {
  const text = clean(value, 10);
  const match = text.match(/^(\d{4})-/);
  return match ? `${match[1]}-**-**` : "";
}

function safeLogPayload({ route = "", requestId = "", body = {}, normalized = null, validation = "", access = "", env = {}, error = null } = {}) {
  const input = normalized?.input || {};
  const birthInfo = input.birthInfo || body.birthInfo || {};
  const question = clean(input.question ?? body.question ?? input.userQuestion ?? body.userQuestion, 2000);
  return {
    route,
    requestId: clean(requestId || body.requestId || body.idempotencyKey, 180),
    serviceType: clean(input.serviceType || body.serviceType || FEATURE_KEY, 80),
    focusArea: clean(input.focusArea || body.focusArea || "overall", 40),
    validation,
    access,
    birthDate: maskBirthDate(input.birthInfo?.birthDate || birthInfo.birthDate || body.birthDate),
    questionLength: question.length,
    ...getProviderDiagnostics(env),
    ...(error ? {
      errorMessage: clean(error?.message || error, 500),
      ...(isDevelopmentEnv(env) ? { stack: clean(error?.stack, 2000) } : {}),
    } : {}),
  };
}

function logKarmaAi(marker, details = {}, level = "info") {
  const payload = { marker: `[Karma AI ${marker}]`, ...details };
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "info";
  console[method](payload.marker, JSON.stringify(payload));
}

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniq(values = []) {
  return [...new Set(values.map((value) => clean(value, 180)).filter(Boolean))];
}

function objectIdLike(value) {
  const text = clean(value);
  return Boolean(text && mongoose.Types.ObjectId.isValid(text));
}

function sha256(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function readIdempotencyKey(request, body = {}) {
  return clean(
    body?.idempotencyKey
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key"),
    180,
  );
}

function randomToken(length = 10) {
  const bytes = new Uint8Array(Math.max(8, Math.ceil(length * 0.75)));
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, length);
}

function normalizeGender(value) {
  const text = clean(value, 20).toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(text)) return "male";
  if (["f", "female", "woman", "여", "여성"].includes(text)) return "female";
  if (["other", "unknown", "none", "기타", "비공개"].includes(text)) return "unknown";
  return text || "";
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTimeKey(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clean(value, 5));
}

function parseFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeBirthPlace(value = {}, fallback = {}) {
  const place = asObject(value);
  const fallbackPlace = asObject(fallback.birthPlace);
  const textPlace = typeof value === "string"
    ? clean(value, 160)
    : typeof fallback.birthPlace === "string"
      ? clean(fallback.birthPlace, 160)
      : "";
  const [textCity = "", ...textCountryParts] = textPlace.split(",").map((part) => clean(part, 100)).filter(Boolean);
  const textCountry = textCountryParts.join(", ");
  const city = clean(place.city || place.name || place.birthCity || fallbackPlace.city || fallbackPlace.name || fallback.city || textCity, 100);
  const country = clean(place.country || place.countryCode || place.birthCountry || fallbackPlace.country || fallbackPlace.countryCode || fallback.country || textCountry, 100);
  const timezone = clean(place.timezone || place.tz || place.timezoneName || fallbackPlace.timezone || fallbackPlace.tz || fallback.timezone || fallback.tz, 80);
  const latitude = parseFiniteNumber(place.latitude ?? place.lat ?? fallback.latitude ?? fallback.lat);
  const longitude = parseFiniteNumber(place.longitude ?? place.lng ?? place.lon ?? fallback.longitude ?? fallback.lng ?? fallback.lon);
  return { city, country, latitude, longitude, timezone };
}

function normalizeFocusArea(value) {
  const raw = clean(value, 40);
  if (FOCUS_AREA_LABELS[raw]) return raw;
  const lower = raw.toLowerCase();
  if (FOCUS_AREA_LABELS[lower]) return lower;
  return "overall";
}

function normalizeConsultationInput(body = {}) {
  const birthInfo = asObject(body.birthInfo);
  const name = clean(body.userName ?? body.name ?? body.nickname ?? birthInfo.name, 80);
  const gender = normalizeGender(body.gender ?? birthInfo.gender);
  const birthDate = clean(body.birthDate ?? birthInfo.birthDate, 10);
  const birthTimeUnknown = body.birthTimeUnknown === true || birthInfo.birthTimeUnknown === true;
  const birthTime = birthTimeUnknown ? "" : clean(body.birthTime ?? birthInfo.birthTime, 5);
  const calendarType = clean(body.calendarType ?? birthInfo.calendarType, 20).toLowerCase();
  const birthPlace = normalizeBirthPlace(body.birthPlace || birthInfo.birthPlace || {}, body);
  const focusArea = normalizeFocusArea(body.focusArea);
  const topic = clean(body.topic ?? body.consultationTopic ?? FOCUS_AREA_LABELS[focusArea], 100);
  const question = clean(body.question ?? body.userQuestion, 1600);

  if (!gender) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!isValidDateKey(birthDate)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!birthTimeUnknown && !isValidTimeKey(birthTime)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (calendarType !== "solar" && calendarType !== "lunar") return { ok: false, message: INVALID_INPUT_MESSAGE };
  if ((birthPlace.latitude !== null && (birthPlace.latitude < -90 || birthPlace.latitude > 90))
    || (birthPlace.longitude !== null && (birthPlace.longitude < -180 || birthPlace.longitude > 180))) {
    return { ok: false, message: PLACE_ERROR_MESSAGE };
  }
  if (!VALID_TOPICS.has(topic)) return { ok: false, message: "상담 주제를 다시 선택해 주세요." };
  if (focusArea === "custom" && question.length < 2) return { ok: false, message: CUSTOM_QUESTION_REQUIRED_MESSAGE };

  const normalized = {
    serviceType: clean(body.serviceType || "karma-ai-consultation", 80),
    consultationType: clean(body.consultationType || "destinyKarma", 80),
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime,
      birthTimeUnknown,
      calendarType,
      birthPlace,
    },
    focusArea,
    topic,
    question,
    userQuestion: question,
    locale: clean(body.locale || "ko", 10),
  };

  return {
    ok: true,
    input: normalized,
    inputHash: sha256(stableJson(normalized)),
  };
}

function invalidInput(message, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message: clean(message) || INVALID_INPUT_MESSAGE }, { status });
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: LOGIN_REQUIRED_MESSAGE }, { status: 401 });
}

function serverError(message = SERVER_ERROR_MESSAGE, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}

function paymentVerifyFailed() {
  return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: PAYMENT_VERIFY_FAILED_MESSAGE }, { status: 402 });
}

function getPricing() {
  const resolved = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = resolved?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || 50000);
  if (!resolved?.ok || !pricing || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("karma-destiny-ai price not found");
    error.code = "PRICE_NOT_FOUND";
    throw error;
  }
  return {
    pricing,
    coinPrice,
    amountKRW,
    membershipCreditCost: calculateMembershipCreditCost(coinPrice),
  };
}

async function createAccessToken(env, payload) {
  return signJwt(
    {
      typ: ACCESS_TOKEN_TYPE,
      serviceKey: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      ...payload,
    },
    getAccessTokenSecret(env),
    {
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    },
  );
}

async function verifyAccessToken(env, token) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), {
    issuer: getJwtIssuer(env),
    audience: getJwtAudience(env),
  });
  if (payload?.typ !== ACCESS_TOKEN_TYPE || payload?.serviceKey !== SERVICE_KEY || payload?.featureKey !== FEATURE_KEY) {
    const error = new Error("invalid access token");
    error.code = "INVALID_ACCESS_TOKEN";
    throw error;
  }
  return payload;
}

function isAdmin(auth = {}) {
  return clean(auth.role).toLowerCase() === "admin";
}

async function loadBillingUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return null;
  return User.findById(userId)
    .select("email name phoneNumber points role profileSubscription subscription membership pass entitlement paidFeatures unlockedFeatures")
    .lean();
}

function normalizeAccessType(value) {
  const raw = clean(value).toLowerCase();
  if (["membership_credit", "monthly_credit", "monthly", "subscription"].includes(raw)) return "monthly_credit";
  if (["membership_pass", "family_pass", "pass"].includes(raw)) return "pass";
  if (["admin"].includes(raw)) return "admin";
  return "paid";
}

function isMonthlyCreditAccess(accessType) {
  return ["membership_credit", "monthly_credit", "monthly", "subscription"].includes(clean(accessType).toLowerCase());
}

function readBillingContext(body = {}) {
  const billing = asObject(body.billingGate || body.billingEvidence || body.billing || body.paymentEvidence);
  const consume = asObject(body.billingConsume || body.consume || billing.consume);
  const accessGrant = asObject(body.billingAccessGrant || body.accessGrant || billing.accessGrant);
  const pricing = asObject(body.pricing || billing.pricing);
  return { billing, consume, accessGrant, pricing };
}

function collectBillingTokens(body = {}, idempotencyKey = "") {
  const ctx = readBillingContext(body);
  return uniq([
    idempotencyKey,
    body.billingRequestId,
    body.paymentId,
    body.transactionId,
    body.purchaseId,
    body.requestId,
    ctx.billing.executionId,
    ctx.billing.transactionId,
    ctx.billing.purchaseId,
    ctx.billing.paymentId,
    ctx.billing.requestId,
    ctx.consume.executionId,
    ctx.consume.transactionId,
    ctx.consume.purchaseId,
    ctx.consume.requestId,
    ctx.consume.receiptId,
    ctx.consume.pointHistoryId,
    ctx.consume.ledgerId,
    ctx.consume.monthlyCreditLedgerId,
    ctx.accessGrant.executionId,
    ctx.accessGrant.evidenceId,
    ctx.accessGrant.purchaseId,
    ctx.accessGrant.paymentId,
    ctx.accessGrant.requestId,
  ]);
}

function readBillingAccessSignal(body = {}) {
  const ctx = readBillingContext(body);
  return [
    body.accessType,
    body.accessMethod,
    body.paymentMode,
    ctx.billing.accessType,
    ctx.billing.accessMethod,
    ctx.billing.paymentMode,
    ctx.billing.paymentMethod,
    ctx.consume.accessType,
    ctx.consume.accessMethod,
    ctx.consume.paymentMethod,
    ctx.consume.paymentMode,
    ctx.consume.transactionType,
    ctx.accessGrant.accessType,
    ctx.accessGrant.accessMethod,
    ctx.accessGrant.paymentMethod,
  ].map((value) => clean(value).toLowerCase()).filter(Boolean).join("|");
}

function billingTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ "metadata.requestId": token });
    clauses.push({ "metadata.purchaseId": token });
    clauses.push({ "metadata.idempotencyKey": token });
    clauses.push({ "metadata.orderId": token });
    clauses.push({ "metadata.transactionId": token });
    clauses.push({ "metadata.pointHistoryId": token });
    clauses.push({ sourceId: token });
    if (objectIdLike(token)) clauses.push({ _id: token }, { paymentId: token });
  });
  return clauses;
}

function paymentTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ requestId: token }, { idempotencyKey: token }, { merchantUid: token }, { impUid: token });
    clauses.push({ "metadata.requestId": token }, { "metadata.purchaseId": token }, { "metadata.idempotencyKey": token });
  });
  return clauses;
}

function deferredTokenClauses(tokens = []) {
  const clauses = [];
  tokens.forEach((token) => {
    clauses.push({ requestId: token }, { idempotencyKey: token }, { executionId: token }, { paymentId: token }, { orderId: token });
    clauses.push({ "result.deferredUsage.requestId": token }, { "result.deferredUsage.paymentId": token });
    if (objectIdLike(token)) clauses.push({ _id: token });
  });
  return clauses;
}

function normalizeDeferredAccessType(value) {
  const raw = clean(value).toLowerCase();
  if (["monthly", "membership_credit", "monthly_credit"].includes(raw)) return "monthly_credit";
  if (["pass", "family", "membership_pass", "family_pass"].includes(raw)) return "pass";
  return "paid";
}

async function findBillingGateEvidence({ userId, idempotencyKey, body = {} }) {
  const tokens = collectBillingTokens(body, idempotencyKey);
  const signal = readBillingAccessSignal(body);
  const ctx = readBillingContext(body);
  const featureKey = clean(ctx.pricing.featureKey || ctx.billing.featureKey || ctx.consume.featureKey || ctx.accessGrant.featureKey);
  if (featureKey && featureKey !== FEATURE_KEY) return null;

  const pointClauses = billingTokenClauses(tokens);
  if (pointClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const point = await PointHistory.findOne({
      userId,
      featureKey: FEATURE_KEY,
      kind: "deduct",
      "metadata.coinRefundedForUnlockFailure": { $ne: true },
      "metadata.monthlyCreditRefundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: pointClauses,
    }).sort({ createdAt: -1 }).lean();
    if (point) {
      return {
        ok: true,
        accessType: normalizeAccessType(point?.metadata?.accessType || point?.metadata?.paymentMethod || signal),
        paymentId: clean(point._id, 160),
        billingRequestId: clean(point?.metadata?.requestId || idempotencyKey, 180),
        usageAlreadyApplied: true,
      };
    }
  }

  const monthlyClauses = billingTokenClauses(tokens);
  if (monthlyClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const ledger = await MonthlyCreditLedger.findOne({
      userId,
      type: "MONTHLY_CREDIT_SPEND",
      "metadata.featureKey": FEATURE_KEY,
      "metadata.refundedForUnlockFailure": { $ne: true },
      "metadata.refundedForServiceExecution": { $ne: true },
      $or: monthlyClauses,
    }).sort({ createdAt: -1 }).lean();
    if (ledger) {
      return {
        ok: true,
        accessType: "monthly_credit",
        paymentId: clean(ledger._id, 160),
        billingRequestId: clean(ledger?.metadata?.requestId || idempotencyKey, 180),
        usageAlreadyApplied: true,
      };
    }
  }

  const deferredClauses = deferredTokenClauses(tokens);
  if (deferredClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const record = await PaidExecutionRecord.findOne({
      userId: clean(userId),
      featureId: FEATURE_KEY,
      status: { $in: ["paid_pending_generation", "generating", "completed"] },
      $or: deferredClauses,
    }).sort({ updatedAt: -1, createdAt: -1 }).lean();
    if (record) {
      return {
        ok: true,
        accessType: normalizeDeferredAccessType(record.accessMethod || signal),
        paymentId: clean(record._id, 160),
        billingRequestId: clean(record.requestId || idempotencyKey, 180),
        deferredUsage: record.status !== "completed",
        usageAlreadyApplied: record.status === "completed",
      };
    }
  }

  const paymentClauses = paymentTokenClauses(tokens);
  if (paymentClauses.length && mongoose.Types.ObjectId.isValid(String(userId || ""))) {
    const payment = await Payment.findOne({
      userId,
      featureKey: FEATURE_KEY,
      status: { $in: ["paid", "success", "fulfilled"] },
      $or: paymentClauses,
    }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
    if (payment) {
      return {
        ok: true,
        accessType: "paid",
        paymentId: clean(payment.merchantUid || payment.impUid || tokens[0], 160),
        billingRequestId: clean(payment.requestId || payment.idempotencyKey || idempotencyKey, 180),
        usageAlreadyApplied: true,
      };
    }
  }

  return null;
}

async function resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash, body = {} }) {
  if (isAdmin(auth) || clean(user?.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "", usageAlreadyApplied: true };
  }

  const existing = await KarmaDestinyAiConsultation.findOne({
    userId: clean(auth.userId),
    idempotencyKey,
    inputHash,
    status: "completed",
  }).select("id accessType paymentId billingRequestId").lean();
  if (existing) {
    return {
      ok: true,
      accessType: clean(existing.accessType) || "paid",
      paymentId: clean(existing.paymentId, 160),
      billingRequestId: clean(existing.billingRequestId, 180),
      usageAlreadyApplied: true,
    };
  }

  const billing = await findBillingGateEvidence({ userId: auth.userId, idempotencyKey, body });
  if (billing?.ok) return {
    ...billing,
    usageAlreadyApplied: billing.usageAlreadyApplied === true,
  };

  const featureAccess = resolveFeatureAccessPolicy({ user: user || {}, pricing, coinCost: pricing.coinPrice });
  if (featureAccess.allowed) {
    return { ok: true, accessType: featureAccess.accessType || "pass", paymentId: "", usageAlreadyApplied: false };
  }

  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function buildBillingGatePayload(pricing, idempotencyKey) {
  return {
    billingMode: "coin-gate",
    featureKey: FEATURE_KEY,
    serviceKey: SERVICE_KEY,
    serviceId: SERVICE_KEY,
    serviceType: "karma-ai-consultation",
    consultationType: "destinyKarma",
    categoryKey: "premium-consultation",
    subFeatureKey: FEATURE_KEY,
    contentId: FEATURE_KEY,
    orderName: ORDER_NAME,
    reason: ORDER_NAME,
    requestId: idempotencyKey,
    idempotencyKey,
    coinPrice: pricing.coinPrice,
    cost: pricing.coinPrice,
    membershipCreditCost: pricing.membershipCreditCost,
    totalAmount: pricing.amountKRW,
    paymentAmount: pricing.amountKRW,
    amountKRW: pricing.amountKRW,
    currency: "CURRENCY_KRW",
    runtimeGate: {
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      featureKey: FEATURE_KEY,
      reason: ORDER_NAME,
      productId: SERVICE_KEY,
      productType: SERVICE_KEY,
      serviceType: "karma-ai-consultation",
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      membershipCreditCost: pricing.membershipCreditCost,
    },
  };
}

// 렌즈 헌법 — 각 렌즈의 "담당" 뒤에 반드시 **"이 렌즈로 말하지 않는 것"** 을 붙인다.
// 담당만 쓰면 LLM 은 모든 렌즈로 모든 것을 말한다. 금지가 있어야 분업이 성립한다.
// (다만 이 텍스트는 보조 장치다. 실효 장치는 buildLensDigest 의 데이터 차등 공급이다.)
const LENS_CONSTITUTION = [
  "이 상담은 하나의 운명을 다섯 개의 렌즈로 보는 구조입니다. 다섯 개의 운세를 각각 보는 것이 아닙니다.",
  "",
  "사주명리 — 현실, 기질, 오행, 행동과 결정의 구조를 맡습니다.",
  "  사주로 심리의 무의식적 뿌리를 말하지 않습니다. 그것은 서양 점성술의 몫입니다.",
  "  사주로 사람과의 인연 유형을 말하지 않습니다. 그것은 숙요의 몫입니다.",
  "",
  "자미두수 — 인생의 큰 흐름, 사회적 역할, 명궁과 12궁의 영역 배치를 맡습니다.",
  "  자미두수로 감정의 이유를 설명하지 않습니다. 어느 영역에서 벌어지는지만 지정합니다.",
  "  자미두수로 영혼의 과제를 말하지 않습니다. 그것은 베다의 몫입니다.",
  "",
  "서양 점성술 — 심리, 감정, 무의식, 대인관계의 내면을 맡습니다.",
  "  서양 점성술로 시기와 연도를 말하지 않습니다. 시기는 자미두수와 베다의 몫입니다.",
  "  서양 점성술로 현실 처방을 내리지 않습니다. 처방은 사주의 몫입니다.",
  "",
  "베다 점성술 — 영혼, 업, 다르마, 성장의 방향을 맡습니다.",
  "  베다로 성격을 설명하지 않습니다. 이번 생이 요구하는 방향만 말합니다.",
  "  베다로 구체적 행동 지침을 내리지 않습니다.",
  "",
  "숙요 27수 — 인연, 관계, 인간관계 패턴을 맡습니다.",
  "  숙요로 개인의 기질을 설명하지 않습니다. 사람과 사람 사이에서만 말합니다.",
  "  숙요로 재물이나 직업을 말하지 않습니다.",
  "",
  "다섯 렌즈가 같은 결론에 이르더라도, 각 렌즈는 그 결론의 서로 다른 면만 말합니다.",
  "앞 렌즈가 이미 말한 것을 다음 렌즈가 다른 표현으로 되풀이하면 그 문장은 실패입니다.",
  "다음 렌즈는 앞 렌즈가 답할 수 없었던 질문에만 답합니다.",
  "계산 근거로 주어지지 않은 값은 어떤 경우에도 추정하거나 지어내지 않습니다. 없으면 없는 대로 다른 관점으로 답합니다.",
].join("\n");

/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return buildSystemPrompt();
}

/* 관리자 프롬프트 랩 전용. 결제·LLM 없이 프로덕션과 똑같은 프롬프트를 조립한다
   (lib/admin/prompt-lab-registry.mjs 참고). 다섯 렌즈 통합 계산이 들어가므로 env 가 필요하다. */
export async function buildAdminLabPrompt(body = {}, options = {}) {
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    throw new Error(normalized.message || "카르마 데스티니 프롬프트에 필요한 입력이 부족합니다.");
  }

  const integratedResult = await buildKarmaDestinyIntegratedResult(
    options.env || {},
    normalized.input.birthInfo,
    { lensUsageWeights: LENS_USAGE_WEIGHTS },
  );

  return {
    systemPrompt: buildSystemPrompt("initial"),
    prompt: buildFirstPrompt(normalized.input, integratedResult),
  };
}

function buildSystemPrompt(mode = "initial") {
  const shared = [
    "당신은 오래 상담해 온 운명의 업 상담가입니다.",
    LENS_CONSTITUTION,
    "다섯 렌즈의 이름을 설명표처럼 나열하지 말고, 필요한 근거가 상담 문장 안에서 자연스럽게 드러나게 합니다.",
    "",
    "언어와 문체:",
    "한국어 격식체로 씁니다.",
    "운세 전문가가 직접 사용자를 마주 보고 말하듯 전문적이고 신비로우며 감정적으로 자연스럽게 씁니다.",
    "각 단락은 서로 다른 은유와 이미지를 사용합니다.",
    "분량을 채우기 위해 같은 표현, 같은 조언, 같은 상징을 반복하지 않고, 부족한 분량은 계산 근거에서 새 관점과 구체적 처방을 꺼내 채웁니다.",
    "‘업’은 벌이나 저주가 아니라 반복되는 선택, 감정 습관, 관계 패턴, 성장 과제로 해석합니다.",
    "불안감이나 죄책감을 자극하지 않고, 운명 확정 표현을 사실처럼 단정하지 않습니다.",
    "PDF, 챕터, chapter, job, progress, 프롬프트, 시스템 메시지 같은 작업 표현을 노출하지 않습니다.",
    "자신을 AI나 언어 모델로 지칭하지 않고, 상담문이 생성된 결과라는 사실도 언급하지 않습니다.",
    "문단 사이는 빈 줄로 구분하고, 핵심 문구만 **굵게** 표시합니다. 그 외 마크다운(제목 #, 코드블록, 표)은 쓰지 않습니다.",
  ];

  if (mode === "follow_up") {
    return [
      ...shared,
      "",
      "추가 질문 응답 방식:",
      `처음 상담의 ${PREMIUM_CHAPTERS.length}개 장 제목을 반복하지 않습니다.`,
      "첫 문장부터 사용자의 새 질문에 직접 답합니다.",
      "이전 상담에서 이미 말한 내용을 길게 되풀이하지 말고, 새 질문에 필요한 흐름만 다시 짚습니다.",
      "다섯 렌즈의 근거는 필요한 만큼만 섞어 2~4개의 완성된 산문 단락으로 답합니다.",
      "단순 위로가 아니라 지금 사용자가 취할 수 있는 말, 태도, 선택을 구체적으로 비춥니다.",
      "불릿 포인트와 번호 나열을 사용하지 않습니다.",
      "전체 분량은 900~1,600자로 맞춥니다.",
      "마지막 문장은 사용자가 지금 해볼 수 있는 한 가지 행동으로 따뜻하게 닫습니다.",
    ].join("\n");
  }

  return [
    ...shared,
    "",
    "초기 상담 구조:",
    `최종 상담은 ${PREMIUM_CHAPTERS.length}개 장으로 완성합니다. 한 번에 전부 쓰지 않고 요청받은 한 장만 깊게 씁니다.`,
    `각 장은 목표 ${PREMIUM_CHAPTER_TARGET_LENGTH}의 완성된 산문이며, 각 장 마지막에는 “이번 장의 핵심” 3줄을 둡니다.`,
    "장마다 감정적 해석과 현실적 전략을 함께 담되, 그 장에 지정된 주도 렌즈의 언어로 시작하고 닫습니다.",
    "질병, 사망, 사고, 파산, 이혼, 투자 손실 같은 일을 확정 예언하지 않습니다.",
    "법률·의료·투자 판단을 대신하지 않습니다.",
    "내부 작업 표현, 결제 표현, 모델명, 토큰, 원시 응답, 디버그 사유를 노출하지 않습니다.",
    "흔한 위로나 자기계발식 문장을 반복하지 말고, 사용자의 입력과 계산 근거에 맞는 구체적 장면과 선택 기준을 씁니다.",
    "",
    "초기 상담 금지 사항:",
    "‘당신은 반드시’, ‘전생에 실제로’, ‘무조건’처럼 확정하거나 겁주는 표현을 금지합니다.",
    "동일한 내용을 다른 장에서 반복하지 않습니다.",
    "‘~할 수 있습니다’, ‘~일 것입니다’의 반복적 어미를 피합니다.",
    "마지막에 추가 질문을 유도하지 않습니다.",
    `최종 합산 분량은 실제 사용자가 읽는 plain text 기준 ${INITIAL_CONSULTATION_MIN_LENGTH.toLocaleString("ko-KR")}자 이상이어야 합니다.`,
  ].join("\n");
}

// 프롬프트에 실을 계산 근거 JSON 의 상한. 16장 배치가 4회 반복해 같은 blob 을 다시 보내므로
// 여기서 새는 양이 그대로 4배가 된다.
const INTEGRATED_RESULT_PROMPT_MAX_CHARS = 14000;

function longestArrayHolder(node, best = { holder: null, key: "", size: 0 }) {
  if (!node || typeof node !== "object") return best;
  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value) && value.length > 3) {
      const size = JSON.stringify(value).length;
      if (size > best.size) best = { holder: node, key, size };
    }
    if (value && typeof value === "object") best = longestArrayHolder(value, best);
  }
  return best;
}

/**
 * 계산 근거를 프롬프트용 JSON 문자열로 만든다.
 *
 * 🔴 직렬화된 문자열을 slice 하면 안 된다 — 문법이 깨진 JSON 이 모델에 가서 근거를 통째로 잃는다.
 * 예산을 넘으면 가장 긴 배열부터 절반씩 줄여 **항상 유효한 JSON** 을 유지한다.
 * (dasha 타임라인·aspects 목록이 대체로 가장 길고, 상담 본문이 전부를 인용하지도 않는다.)
 */
function serializeIntegratedResultForPrompt(integratedResult, maxChars = INTEGRATED_RESULT_PROMPT_MAX_CHARS) {
  const source = integratedResult || {};
  let json = JSON.stringify(source);
  if (!maxChars || json.length <= maxChars) return json;

  const shrunk = JSON.parse(json);
  let trimmed = 0;
  for (let i = 0; i < 24; i += 1) {
    const { holder, key } = longestArrayHolder(shrunk);
    if (!holder) break;
    holder[key] = holder[key].slice(0, Math.max(3, Math.floor(holder[key].length / 2)));
    trimmed += 1;
    json = JSON.stringify(shrunk);
    if (json.length <= maxChars) break;
  }
  console.info("[KarmaDestinyAI] integratedResult trimmed for prompt", {
    trimmedArrays: trimmed,
    chars: json.length,
    maxChars,
  });
  return json;
}

function buildFirstPrompt(input, integratedResult) {
  const birth = input.birthInfo || {};
  const place = birth.birthPlace || {};
  return [
    "[상담 정보]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `출생지: ${[place.city, place.country].filter(Boolean).join(", ")}`,
    `상담 주제: ${input.topic}`,
    `상담 초점: ${input.focusArea}`,
    `현재 가장 궁금한 질문: ${input.question || "선택한 상담 주제를 중심으로 봅니다."}`,
    "",
    "[상담 근거]",
    JSON.stringify(integratedResult),
    "",
    `위 계산 데이터를 바탕으로 ${PREMIUM_CHAPTERS.length}개 장을 순서대로 작성하고, 전체 상담문은 실제 사용자가 읽는 plain text 기준 ${INITIAL_CONSULTATION_MIN_LENGTH.toLocaleString("ko-KR")}자 이상으로 완성하세요.`,
    "각 장 제목은 지정된 순서와 한글 제목을 그대로 사용하되, 본문은 산문으로 이어 쓰세요.",
    "사용자의 선택 주제와 질문은 전체 서사의 중심 감정으로 녹이고, 별도 문답 형식으로 나누지 마세요.",
    "각 파트에는 다섯 렌즈의 근거가 설명표처럼 분리되지 않고 자연스럽게 스며들어야 합니다.",
  ].join("\n");
}

function buildFollowUpPrompt(consultation, question) {
  const birth = consultation.birthInfo || {};
  const history = safeArray(consultation.messages)
    .slice(-8)
    .map((message) => `${message.role === "assistant" ? "상담가" : "사용자"}: ${clean(message.content, 1400)}`)
    .join("\n\n");
  return [
    "[상담 정보]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `처음 상담 주제: ${consultation.topic}`,
    `처음 상담 질문: ${consultation.userQuestion || "선택한 상담 주제를 중심으로 봅니다."}`,
    "",
    "[상담 근거]",
    // 후속 질문 프롬프트만 상한이 없어 이력과 함께 무제한으로 실렸다. 배치 경로와 같은 상한을 쓴다.
    serializeIntegratedResultForPrompt(consultation.integratedResult),
    "",
    "[이전 대화]",
    history,
    "",
    "[새 질문]",
    question,
    "",
    `${PREMIUM_CHAPTERS.length}개 장을 반복하지 말고, 첫 문장부터 새 질문에 직접 답하세요.`,
    "이전 상담 흐름을 이어받되 필요한 부분만 짚고, 업을 죄나 벌이 아닌 반복 패턴과 성장 과제로 풀어주세요.",
  ].join("\n");
}

function cleanForbiddenResult(text) {
  return clean(text)
    .replace(/\bPDF\b/gi, "상담")
    .replace(/챕터/g, "상담 항목")
    .replace(/\bchapter\b/gi, "상담 항목")
    .replace(/\bprogress\b/gi, "흐름")
    .replace(/\bjob\b/gi, "상담")
    // "시스템 메시지"는 "프롬프트" 치환보다 먼저 걷어낸다(둘 다 걸리는 문구가 있다).
    .replace(/시스템\s*(?:메시지|지시)/g, "상담 안내")
    .replace(/프롬프트/g, "상담 문장")
    // 자기지칭을 먼저 없애야 아래 "AI+생성" 치환이 남은 문장을 어색하게 만들지 않는다.
    .replace(/(?:저는|제가|나는)\s*(?:AI|인공지능|언어\s*모델)/gi, "저는 상담자")
    .replace(/(?:AI|인공지능)\s*(?:가|이|는|은|를|을|로|로서|에\s*의해)?\s*(생성|작성|제작|답변|응답|만들)/gi, "상담자가 $1")
    .replace(/서버 계산 데이터/g, "상담 근거");
}

function normalizePlainText(text) {
  return clean(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function countMeaningfulChars(text) {
  return normalizePlainText(text).length;
}

function countUserVisibleChars(text) {
  return normalizePlainText(text).length;
}

function formatChapterHeading(chapter) {
  const order = Number(chapter?.order || 0);
  const title = clean(chapter?.title, 120);
  return `${order}장. ${title}`;
}

function formatChapterContent(chapter) {
  const keyTakeaways = safeArray(chapter?.keyTakeaways).map((item) => clean(item, 220)).filter(Boolean).slice(0, 3);
  return [
    `## ${formatChapterHeading(chapter)}`,
    "",
    clean(chapter?.content, 14000),
    "",
    "이번 장의 핵심",
    ...keyTakeaways.map((item) => `- ${item}`),
  ].filter(Boolean).join("\n");
}

function formatChaptersAsConsultationText(chapters = []) {
  return safeArray(chapters)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map(formatChapterContent)
    .join("\n\n");
}

function parseKarmaConsultationSections(text) {
  const normalized = clean(text).replace(/\r\n/g, "\n");
  if (!normalized) return [];
  const headingPattern = /(?:^|\n)(?:#{1,3}\s*)?(\d{1,2})장\.\s*([^\n]+)/g;
  const matches = [...normalized.matchAll(headingPattern)];
  return matches.map((match, index) => {
    const start = (match.index || 0) + match[0].length;
    const end = matches[index + 1]?.index ?? normalized.length;
    const order = Number(match[1]);
    const definition = PREMIUM_CHAPTERS[order - 1] || {};
    return {
      symbol: clean(definition.symbol || match[1], 3),
      id: clean(definition.id || `chapter-${String(order).padStart(2, "0")}`, 40),
      order,
      title: `${order}장. ${clean(match[2]).replace(/\*\*/g, "")}`,
      body: normalized.slice(start, end).trim(),
    };
  }).filter((section) => section.order && section.body);
}

function detectRepeatedParagraphs(text) {
  const counts = new Map();
  const paragraphs = clean(text)
    .split(/\n{2,}/)
    .map((paragraph) => normalizePlainText(paragraph).replace(/[.,!?。？！\s]/g, ""))
    .filter((paragraph) => paragraph.length >= 80);
  for (const paragraph of paragraphs) counts.set(paragraph, (counts.get(paragraph) || 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([paragraph, count]) => ({ sample: paragraph.slice(0, 80), count }))
    .slice(0, 8);
}

function detectGenericAdviceWarnings(text) {
  const normalized = normalizePlainText(text);
  const genericPhrases = [
    "자신을 사랑하세요",
    "긍정적으로 생각하세요",
    "마음을 열어보세요",
    "너무 걱정하지 마세요",
    "천천히 나아가세요",
    "스스로를 믿으세요",
  ];
  return genericPhrases
    .map((phrase) => ({ phrase, count: (normalized.match(new RegExp(phrase, "g")) || []).length }))
    .filter((item) => item.count >= 3);
}

// 렌즈별 전용 용어. 그 장의 주도/보조가 아닌 렌즈의 용어가 쏟아지면 분업이 무너진 것이다.
const LENS_TERMS = Object.freeze({
  saju: /일간|십성|용신|기신|희신|대운|세운|오행|비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인|조후/g,
  ziwei: /명궁|신궁|부부궁|재백궁|관록궁|천이궁|복덕궁|질액궁|노복궁|전택궁|화록|화권|화과|화기|삼방사정|자미|칠살|파군|탐랑/g,
  western: /상승궁|어센던트|하우스|어스펙트|스퀘어|트라인|오포지션|카이런|노스노드|사우스노드|미드헤븐|스텔리움/g,
  vedic: /라그나|나크샤트라|다샤|마하다샤|안타르|라후|케투|다르마|아트마카라카|나밤샤|파다/g,
  sukuyo: /27수|이십칠수|본명숙|업태|영친|우쇠|안괴|성위|청룡|현무|백호|주작/g,
});

/**
 * 렌즈 침범 탐지 — ⚠️ **경고 전용**.
 *
 * quality.ok 를 false 로 만들면 안 된다. "명궁"처럼 문맥상 겹칠 수 있는 어휘가 있어 오탐이
 * 확실히 존재하고, 오탐이 하드 실패가 되면 handleGenerateBatch 의 throw 를 타고
 * 결제 후 무결과 503 이 된다. 보강 대상 선정 입력과 로깅에만 쓴다.
 */
function detectLensRoleViolation(chapters, threshold = 3) {
  return safeArray(chapters).flatMap((chapter) => {
    const definition = PREMIUM_CHAPTERS.find((item) => item.id === chapter?.id);
    if (!definition || definition.leadLens === "none" || definition.leadLens === "cross") return [];
    const allowed = new Set([definition.leadLens, ...safeArray(definition.supportLens)]);
    const content = clean(chapter?.content);
    return LENS_IDS
      .filter((id) => !allowed.has(id))
      .map((id) => ({ chapterId: chapter.id, lens: id, count: (content.match(LENS_TERMS[id]) || []).length }))
      .filter((row) => row.count >= threshold);
  }).slice(0, 12);
}

function bigramSet(text) {
  const normalized = normalizePlainText(text).replace(/[^가-힣a-zA-Z0-9]/g, "");
  const grams = new Set();
  for (let i = 0; i + 2 <= normalized.length; i += 1) grams.add(normalized.slice(i, i + 2));
  return grams;
}

/**
 * 교차장 결론 중복 탐지 — ⚠️ **경고 전용**(위와 같은 이유).
 *
 * detectRepeatedParagraphs 는 완전 일치만 잡아 "표현만 바꾼 반복"을 놓친다.
 * summary + keyTakeaways 를 2-gram 자카드로 비교해 결론 자체가 겹치는 쌍을 찾는다.
 */
function detectCrossChapterConclusionOverlap(chapters, threshold = 0.45) {
  const rows = safeArray(chapters)
    .map((chapter) => ({
      id: chapter?.id,
      grams: bigramSet([clean(chapter?.summary), ...safeArray(chapter?.keyTakeaways)].join(" ")),
    }))
    .filter((row) => row.id && row.grams.size >= 20);
  const overlaps = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      let shared = 0;
      for (const gram of rows[i].grams) if (rows[j].grams.has(gram)) shared += 1;
      const union = rows[i].grams.size + rows[j].grams.size - shared;
      const similarity = union > 0 ? shared / union : 0;
      if (similarity >= threshold) {
        overlaps.push({ a: rows[i].id, b: rows[j].id, similarity: Number(similarity.toFixed(3)) });
      }
    }
  }
  return overlaps.sort((a, b) => b.similarity - a.similarity).slice(0, 8);
}

function getByPath(source, path) {
  return clean(path).split(".").reduce((acc, key) => (acc === null || acc === undefined ? acc : acc[key]), source);
}

function formatEvidenceValue(value, maxLength = 240) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return clean(value, maxLength);
  return clean(JSON.stringify(value), maxLength);
}

/**
 * "왜 이런 결론이 나왔나요?" 펼치기에 들어갈 근거.
 *
 * 🔴 LLM 이 인용한 값을 받지 않고 **서버가 integratedResult 에서 직접 뽑는다.**
 * 근거 펼치기는 사용자가 신뢰성을 검증하는 자리라, 여기에 환각값이 들어가면 신뢰 붕괴가
 * 가장 큰 지점이다. 서버는 계산값을 100% 정확히 갖고 있으므로 경로 조회로 충분하고,
 * 반환 JSON 을 키우지 않아 파싱 실패 위험도 늘지 않는다.
 * 값이 없으면 만들지 않고 뺀다.
 */
function buildChapterEvidence(integratedResult, definition) {
  const lenses = asObject(integratedResult?.lenses);
  return safeArray(definition?.evidenceKeys).map((path) => {
    const [lensId, ...rest] = clean(path).split(".");
    const tail = rest.join(".");
    const value = lensId === "synthesis"
      ? getByPath(asObject(integratedResult?.synthesis), tail)
      : getByPath(asObject(lenses[lensId]?.data), tail);
    if (value === null || value === undefined) return null;
    if (Array.isArray(value) && !value.length) return null;
    const formatted = formatEvidenceValue(value);
    if (!formatted) return null;
    return {
      lens: lensId,
      lensLabel: lensId === "synthesis" ? "관점 교차" : (LENS_ROLES[lensId]?.label || lensId),
      path,
      value: formatted,
      confidence: lensId === "synthesis" ? "full" : clean(lenses[lensId]?.confidence) || "full",
      provisional: safeArray(lenses[lensId]?.provisionalFields).some((field) => tail === field || tail.startsWith(`${field}.`)),
    };
  }).filter(Boolean).slice(0, 8);
}

function normalizeEnergyScore(rawChapter, definition) {
  if (!definition?.energyDomain) return null;
  const value = Number(rawChapter?.energyScore?.value ?? rawChapter?.energyScore);
  if (!Number.isFinite(value)) return null;
  return {
    domain: definition.energyDomain,
    label: ENERGY_DOMAIN_LABELS[definition.energyDomain] || definition.energyDomain,
    value: Math.max(0, Math.min(100, Math.round(value))),
    basis: cleanForbiddenResult(clean(rawChapter?.energyScore?.basis, 200)),
  };
}

function normalizeChapter(rawChapter, definition, integratedResult = null) {
  const content = cleanForbiddenResult(clean(rawChapter?.content || rawChapter?.body, 14000));
  const rawTakeaways = safeArray(rawChapter?.keyTakeaways || rawChapter?.takeaways || rawChapter?.coreLines)
    .map((item) => cleanForbiddenResult(clean(item, 220)))
    .filter(Boolean);
  const summary = cleanForbiddenResult(clean(rawChapter?.summary, 1200));
  const keyTakeaways = rawTakeaways.length >= 3
    ? rawTakeaways.slice(0, 3)
    : [
      ...rawTakeaways,
      ...clean(summary).split(/\n+/).map((line) => line.replace(/^[-•\d.)\s]+/, "").trim()).filter(Boolean),
    ].slice(0, 3);
  while (keyTakeaways.length < 3 && content) {
    keyTakeaways.push(`${definition.title}의 흐름은 반복되는 감정과 현실 선택을 함께 비춥니다.`);
  }
  const highlightQuotes = safeArray(rawChapter?.highlightQuotes || rawChapter?.quotes)
    .map((item) => cleanForbiddenResult(clean(item, 180)))
    .filter(Boolean)
    .slice(0, 3);
  const normalized = {
    id: definition.id,
    order: definition.order,
    title: definition.title,
    content,
    summary,
    keyTakeaways: keyTakeaways.slice(0, 3),
    highlightQuotes,
  };
  return {
    ...normalized,
    symbol: clean(definition.symbol, 4),
    leadLens: clean(definition.leadLens, 20),
    supportLens: safeArray(definition.supportLens).map((item) => clean(item, 20)).filter(Boolean),
    evidence: integratedResult ? buildChapterEvidence(integratedResult, definition) : null,
    energyScore: normalizeEnergyScore(rawChapter, definition),
    charCount: countUserVisibleChars(formatChapterContent(normalized)),
  };
}

function validatePremiumReportQuality(chapters, options = {}) {
  const minLength = Number(options.minLength || INITIAL_CONSULTATION_MIN_LENGTH);
  const chapterMinCount = Number(options.chapterMinCount || PREMIUM_CHAPTERS.length);
  const ordered = safeArray(chapters).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const reportText = formatChaptersAsConsultationText(ordered);
  const totalChars = countUserVisibleChars(reportText);
  const missingChapters = PREMIUM_CHAPTERS
    .filter((definition) => !ordered.some((chapter) => chapter.id === definition.id && clean(chapter.content).length > 0))
    .map((definition) => definition.id);
  const shortChapters = ordered
    .filter((chapter) => countUserVisibleChars(formatChapterContent(chapter)) < Number(PREMIUM_CHAPTERS[Number(chapter.order || 1) - 1]?.minLength || INITIAL_CONSULTATION_SECTION_MIN_LENGTH))
    .map((chapter) => chapter.id);
  const summaryWarnings = ordered
    .filter((chapter) => safeArray(chapter.keyTakeaways).filter(Boolean).length < 3)
    .map((chapter) => chapter.id);
  const repeatedPhraseWarnings = detectRepeatedParagraphs(reportText);
  const genericAdviceWarnings = detectGenericAdviceWarnings(reportText);
  // ⚠️ 아래 두 경고는 ok 계산에 넣지 않는다. 오탐이 하드 실패가 되면 결제 후 무결과가 된다.
  const lensRoleWarnings = detectLensRoleViolation(ordered);
  const conclusionOverlapWarnings = detectCrossChapterConclusionOverlap(ordered);
  const promptLeakDetected = FORBIDDEN_RESULT_PATTERN.test(reportText);
  const ok = totalChars >= minLength
    && ordered.length >= chapterMinCount
    && missingChapters.length === 0
    && shortChapters.length === 0
    && summaryWarnings.length === 0
    && repeatedPhraseWarnings.length === 0
    && genericAdviceWarnings.length === 0
    && !promptLeakDetected;
  return {
    passed: ok,
    ok,
    totalCharCount: totalChars,
    totalChars,
    minLength,
    chapterCount: ordered.length,
    chapterMinCount,
    missingChapters,
    shortChapters,
    summaryWarnings,
    repeatedPhraseWarnings,
    genericAdviceWarnings,
    lensRoleWarnings,
    conclusionOverlapWarnings,
    promptLeakDetected,
    hasForbiddenText: promptLeakDetected,
    tooShort: totalChars < minLength,
    tooLong: false,
  };
}

function validateInitialConsultationQuality(text, options = {}) {
  const sections = parseKarmaConsultationSections(cleanForbiddenResult(text));
  const chapters = sections.map((section) => normalizeChapter({
    content: section.body,
    summary: "",
    keyTakeaways: [],
  }, PREMIUM_CHAPTERS[section.order - 1] || {
    id: section.id,
    order: section.order,
    title: clean(section.title.replace(/^\d+장\.\s*/, ""), 120),
    minLength: INITIAL_CONSULTATION_SECTION_MIN_LENGTH,
  }));
  return validatePremiumReportQuality(chapters, options);
}

async function repairForbiddenConsultationText(env, text, systemPrompt, options = {}) {
  if (!FORBIDDEN_RESULT_PATTERN.test(text)) return clean(text);
  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 시스템성 표현과 작업 용어를 모두 제거하고, 자연스러운 운명의 업 상담문으로만 다시 써주세요.",
    "16개 장 제목과 전체 분량은 유지하고, 상담가가 직접 말하는 문장만 남겨주세요.",
    "",
    text,
  ].join("\n"), {
    systemPrompt,
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
    timeoutMs: options.timeoutMs,
    cache: buildKarmaLlmCache(env, "repair"),
  });
  const repaired = clean(repair?.text);
  return cleanForbiddenResult(repair?.ok && repaired.length >= 160 ? repaired : text);
}

async function ensureInitialConsultationQuality(env, text, prompt, systemPrompt, options = {}) {
  const minLength = Number(options.minLength || INITIAL_CONSULTATION_MIN_LENGTH);
  const maxLength = Number(options.maxLength || INITIAL_CONSULTATION_MAX_LENGTH);
  const maxOutputTokens = Number(options.maxOutputTokens || INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS);
  // PREMIUM_GEMINI_TIMEOUT_MS(운영 45s)를 || 체인에 넣으면 큰 기본값이 죽는다(45s 단락 함정).
  const timeoutMs = Number(env?.KARMA_DESTINY_AI_TIMEOUT_MS) || 120000;
  let current = await repairForbiddenConsultationText(env, text, systemPrompt, { maxOutputTokens, timeoutMs });
  let quality = validateInitialConsultationQuality(current, { minLength, maxLength });
  if (quality.ok) return current;

  const expanded = await callGeminiText(env, [
    "다음 운명의 업 상담문을 같은 계산 근거 안에서 더 깊고 균형 잡힌 완성 원고로 다시 써주세요.",
    `전체 분량은 실제 사용자가 읽는 plain text 기준 ${minLength}자 이상이어야 합니다.`,
    "16개 장과 지정된 제목 순서는 반드시 유지합니다.",
    "각 장은 새로운 관점과 실제 상담의 밀도를 가져야 하며, 같은 문장을 늘리거나 비슷한 조언을 반복하지 않습니다.",
    "명리학자, 점성술사, 베다 점성술사의 근거는 장마다 자연스럽게 연결됩니다.",
    "PDF, 챕터, 프롬프트, 시스템, AI, 기능, 결과, 출력, 데이터 같은 작업 표현은 쓰지 않습니다.",
    "",
    "[원래 요청]",
    prompt,
    "",
    "[현재 상담문]",
    current,
  ].join("\n"), {
    systemPrompt,
    taskType: "fortune",
    temperature: 0.64,
    maxOutputTokens,
    timeoutMs,
    cache: buildKarmaLlmCache(env, "expand"),
  });
  const expandedText = clean(expanded?.text);
  if (expanded?.ok && expandedText) {
    current = await repairForbiddenConsultationText(env, expandedText, systemPrompt, { maxOutputTokens, timeoutMs });
    quality = validateInitialConsultationQuality(current, { minLength, maxLength });
  }
  if (!quality.ok) {
    // 경량 보장 계약: 품질 기준 미달이라도 렌더 가능한 상담문이 있으면 버리지 않고 degrade로 전달한다.
    // 너무 길어 실패한 경우(tooLong)는 그대로 전달, 그 외엔 최소 분량을 넘는 경우만 degrade.
    if (quality.tooLong || hasRenderableLlmText(current, { minChars: 400 })) {
      return current;
    }
    const error = new Error("Karma destiny consultation did not meet quality length or section requirements.");
    error.code = quality.tooShort ? "LLM_RESULT_TOO_SHORT" : quality.tooLong ? "LLM_RESULT_TOO_LONG" : "LLM_RESULT_QUALITY_FAILED";
    error.quality = quality;
    throw error;
  }
  return current;
}

function buildKarmaDestinyAiMockConsultation() {
  const paragraphSeeds = [
    "당신 안에는 오래 눌러 두었던 직감과 현실을 끝까지 확인하려는 힘이 함께 머무릅니다. 마음은 먼저 기척을 알아차리고, 몸은 그 기척이 실제 삶에서 어떤 선택으로 이어질지 천천히 따져 봅니다. 그래서 중요한 국면마다 서두르는 듯 보여도 속으로는 이미 여러 번 길을 가늠하고 있습니다.",
    "반복되는 매듭은 약함의 흔적이 아니라 아직 다르게 써 보지 못한 능력의 그림자에 가깝습니다. 같은 사람, 같은 말투, 같은 기다림 앞에서 마음이 흔들릴 때마다 운명은 당신에게 더 단단한 기준을 세우라고 속삭입니다. 그 기준은 차가운 선이 아니라 스스로를 함부로 넘기지 않는 온기입니다.",
    "지금의 시기는 닫힌 문 앞에서 멈춘 계절이 아니라, 안쪽에서 잠금이 풀리는 소리를 듣는 때에 가깝습니다. 밖으로 드러난 변화가 작아 보여도 내면에서는 무엇을 더 붙들고 무엇을 내려놓을지 이미 정리가 시작되었습니다. 이 흐름을 믿을수록 선택은 한결 조용하고 정확해집니다.",
    "관계에서는 상대의 마음을 읽으려는 섬세함이 강하게 떠오르지만, 그 섬세함이 오래 지속되면 자신의 욕구를 뒤로 미루는 습관이 됩니다. 이제는 먼저 맞추는 사람이 아니라 함께 맞춰 갈 수 있는지를 보는 사람이 되어야 합니다. 사랑도 인연도 당신의 생기를 줄이지 않을 때 더 깊어집니다.",
    "재능과 물질의 자리에서는 한 번에 크게 빛나는 운보다 꾸준히 쌓아 올린 감각이 더 강하게 열립니다. 당신은 흩어진 경험을 하나로 묶을 때 돈의 길도 함께 보이는 사람입니다. 지금 필요한 것은 더 많은 일을 떠안는 것이 아니라, 이미 가진 능력에 이름을 붙이고 값을 정하는 일입니다.",
    "이 생의 과제는 모든 것을 혼자 감당하는 품을 내려놓고, 필요한 순간에 도움과 협력을 받아들이는 데 있습니다. 운명은 당신에게 강함만을 요구하지 않습니다. 오히려 부드럽게 기대고도 무너지지 않는 법, 마음을 열고도 자신을 잃지 않는 법을 배우도록 이끌고 있습니다.",
    "오늘은 오래 미뤄 둔 작은 결정을 하나만 실제 행동으로 옮겨 보세요. 누군가에게 답장을 보내거나, 정리하지 못한 문장을 적거나, 마음속에서만 재던 제안을 조용히 꺼내는 것으로 충분합니다. 운명은 거창한 선언보다 정확한 한 걸음에 더 빠르게 반응합니다.",
  ];
  // 핵심 문장 장(order 14)만 구조상 짧다. 인덱스를 정의에서 끌어와 장 수가 바뀌어도 어긋나지 않게 한다.
  const shortChapterIndex = PREMIUM_CHAPTERS.findIndex((definition) => definition.id === KEY_SENTENCES_CHAPTER_ID);
  const chapters = PREMIUM_CHAPTERS.map((definition, sectionIndex) => {
    const paragraphs = Array.from({ length: sectionIndex === shortChapterIndex ? 6 : 9 }, (_, paragraphIndex) => {
      const first = paragraphSeeds[(sectionIndex + paragraphIndex) % paragraphSeeds.length];
      const second = paragraphSeeds[(sectionIndex + paragraphIndex + 2) % paragraphSeeds.length];
      return `${definition.title}의 ${paragraphIndex + 1}번째 흐름에서, ${first} ${second}`;
    });
    const content = [
      ...paragraphs,
      "이번 장의 핵심",
      `- ${definition.title}은 지금 반복되는 선택의 모양을 더 선명하게 드러냅니다.`,
      "- 감정의 원인을 운명 탓으로 돌리지 않고, 현실에서 바꿀 수 있는 기준으로 옮기는 일이 중요합니다.",
      "- 오늘의 작은 실천이 오래된 매듭을 느슨하게 만드는 첫 방향이 됩니다.",
    ].join("\n\n");
    return {
      ...definition,
      content,
      summary: `${definition.title}에서 가장 중요한 흐름은 반복을 알아차리고 다른 선택을 세우는 일입니다.`,
      keyTakeaways: [
        `${definition.title}은 오래 반복된 감정의 결을 비춥니다.`,
        "현실에서 바꿀 수 있는 기준을 한 가지 정해야 합니다.",
        "작은 행동이 다음 운의 문을 여는 시작점입니다.",
      ],
      highlightQuotes: ["운명은 거창한 선언보다 정확한 한 걸음에 더 빠르게 반응합니다."],
    };
  });
  return formatChaptersAsConsultationText(chapters);
}

async function generateConsultationText(env, prompt, options = {}) {
  const providerDiagnostics = getProviderDiagnostics(env);
  const mode = options.mode === "follow_up" ? "follow_up" : "initial";
  const systemPrompt = buildSystemPrompt(mode);
  logKarmaAi("LLM Provider Selected", {
    ...(options.logContext || {}),
    ...providerDiagnostics,
  });
  const ai = await callGeminiText(env, prompt, {
    systemPrompt,
    taskType: "fortune",
    temperature: options.temperature || (mode === "follow_up" ? 0.68 : 0.74),
    maxOutputTokens: options.maxOutputTokens || (mode === "initial" ? INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS : 7600),
    // 45s 단락 함정 회피(위 ensureInitialConsultationQuality 주석 참고). 배치당 2만 토큰 ≈ 100s.
    timeoutMs: Number(env?.KARMA_DESTINY_AI_TIMEOUT_MS) || 120000,
    // 초기 장문도 폴백을 허용하되 목표의 40% 미만이면 실패로 돌린다(재시도·환불 경로 유지).
    ...(mode === "initial" ? { fallbackMinChars: Math.round(INITIAL_CONSULTATION_MIN_LENGTH * 0.4) } : {}),
    cache: buildKarmaLlmCache(env, mode),
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  let text = clean(ai?.text);
  if (!ai?.ok || isMock) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    error.providerDiagnostics = providerDiagnostics;
    throw error;
  }
  if (mode === "initial") {
    text = await ensureInitialConsultationQuality(env, text, prompt, systemPrompt, {
      minLength: options.minLength || INITIAL_CONSULTATION_MIN_LENGTH,
      maxLength: options.maxLength || INITIAL_CONSULTATION_MAX_LENGTH,
      maxOutputTokens: options.maxOutputTokens || INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
    });
    return { text, provider, model: clean(ai?.model) };
  }
  if (text.length < (options.minLength || 220)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed."));
    error.code = "LLM_GENERATION_FAILED";
    error.providerDiagnostics = providerDiagnostics;
    throw error;
  }
  if (!FORBIDDEN_RESULT_PATTERN.test(text)) return { text, provider, model: clean(ai?.model) };

  const repair = await callGeminiText(env, [
    "다음 상담 답변에서 시스템성 표현과 작업 용어를 모두 제거하고, 자연스러운 운명의 업 상담문으로만 다시 써주세요.",
    "",
    text,
  ].join("\n"), {
    systemPrompt,
    taskType: "fortune",
    temperature: 0.58,
    maxOutputTokens: options.maxOutputTokens || 7600,
    cache: buildKarmaLlmCache(env, "follow-up-repair"),
  });
  const repaired = clean(repair?.text);
  return {
    text: cleanForbiddenResult(repair?.ok && repaired.length >= 160 ? repaired : text),
    provider: clean(repair?.provider || provider),
    model: clean(repair?.model || ai?.model),
  };
}

function buildGenerationProgress(doc = {}, overrides = {}) {
  const chapters = safeArray(overrides.chapters || doc.chapters);
  const completedChapters = chapters.length;
  const totalChapters = PREMIUM_CHAPTERS.length;
  const nextDefinition = PREMIUM_CHAPTERS[Math.min(completedChapters, totalChapters - 1)] || PREMIUM_CHAPTERS[totalChapters - 1];
  const basePercent = Math.min(96, Math.round((completedChapters / totalChapters) * 96));
  const stageIndex = Math.min(GENERATION_STAGES.length - 1, Math.floor((completedChapters / totalChapters) * GENERATION_STAGES.length));
  const status = clean(overrides.status || doc.status || "generating");
  return {
    totalChapters,
    completedChapters,
    currentChapterId: completedChapters < totalChapters ? nextDefinition.id : "",
    currentChapterTitle: completedChapters < totalChapters ? nextDefinition.title : "최종 품질을 확인하는 중",
    activeBatchIndex: Number(overrides.activeBatchIndex ?? doc.generationProgress?.activeBatchIndex ?? Math.floor(completedChapters / PREMIUM_BATCH_SIZE)),
    totalBatches: Math.ceil(totalChapters / PREMIUM_BATCH_SIZE),
    percent: status === "completed" ? 100 : Number(overrides.percent ?? basePercent),
    // 진행 화면의 별자리 6노드가 이 인덱스로 어느 노드를 밝힐지 정한다(GENERATION_STAGES 와 1:1).
    // percent 만으로 역산하면 노드 라벨과 실제 계산이 어긋날 수 있어 서버가 직접 실어 준다.
    stageIndex: status === "completed" ? GENERATION_STAGES.length - 1 : stageIndex,
    totalStages: GENERATION_STAGES.length,
    stageLabel: clean(overrides.stageLabel || GENERATION_STAGES[stageIndex] || GENERATION_STAGES[0], 80),
    lockedAt: overrides.lockedAt ?? doc.generationProgress?.lockedAt ?? null,
    lockToken: clean(overrides.lockToken ?? doc.generationProgress?.lockToken, 80),
    updatedAt: new Date().toISOString(),
  };
}

function buildPublicUserInput(doc = {}) {
  const birth = doc.birthInfo || {};
  const place = birth.birthPlace || {};
  return {
    name: clean(birth.name, 80),
    gender: clean(birth.gender, 20),
    birthDate: clean(birth.birthDate, 10),
    birthTime: birth.birthTimeUnknown ? "모름" : clean(birth.birthTime, 5),
    birthTimeUnknown: birth.birthTimeUnknown === true,
    calendarType: clean(birth.calendarType, 10),
    birthPlace: {
      city: clean(place.city, 100),
      country: clean(place.country, 100),
      timezone: clean(place.timezone, 80),
    },
    topic: clean(doc.topic, 100),
    question: clean(doc.userQuestion, 1600),
  };
}

function buildResultLookup(identifier, auth) {
  const value = clean(identifier, 180);
  return {
    userId: clean(auth.userId),
    $or: [
      { id: value },
      { reportId: value },
      { attemptId: value },
      { idempotencyKey: value },
    ],
  };
}

function extractJsonPayload(text) {
  const raw = clean(text);
  const unfenced = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = unfenced.indexOf("{");
  const last = unfenced.lastIndexOf("}");
  if (first < 0 || last <= first) {
    const error = new Error("LLM batch response was not valid JSON.");
    error.code = "LLM_JSON_PARSE_FAILED";
    throw error;
  }
  return JSON.parse(unfenced.slice(first, last + 1));
}

/**
 * 그 장에서 실제로 주도를 맡을 렌즈를 정한다.
 *
 * 출생지 정보가 없으면 서양·베다가 통째로 계산 불가가 된다. 그때 지정된 주도 렌즈를 그대로
 * 밀면 그 장은 "주도 렌즈 없음" 상태로 쓰이고, 데이터가 비었으니 LLM 이 지어내기 쉬워진다.
 * 계산된 보조 렌즈로 주도를 승계시켜 장의 성격을 유지한다.
 */
function resolveEffectiveLead(definition, lenses = {}) {
  const available = (id) => clean(lenses?.[id]?.confidence) && lenses[id].confidence !== "none";
  const lead = definition?.leadLens;
  if (lead === "cross" || lead === "none") return { leadLens: lead, supportLens: safeArray(definition?.supportLens), demoted: false };
  if (available(lead)) return { leadLens: lead, supportLens: safeArray(definition?.supportLens), demoted: false };
  const promoted = safeArray(definition?.supportLens).find(available);
  if (!promoted) return { leadLens: "cross", supportLens: LENS_IDS.filter(available), demoted: true };
  return {
    leadLens: promoted,
    supportLens: [...safeArray(definition?.supportLens).filter((id) => id !== promoted), lead].filter(Boolean),
    demoted: true,
  };
}

/**
 * 이 장의 렌즈 구성에 따라 렌즈별 문자 예산을 배분한다.
 * 주도 렌즈에 몰아주고 배경 렌즈는 한 줄 요약 수준만 남긴다.
 * 계산되지 않은 렌즈에는 예산을 주지 않는다 — 그 몫은 살아 있는 렌즈로 돌아간다.
 */
function lensBudget(resolved, lenses = {}) {
  const support = new Set(safeArray(resolved?.supportLens));
  const isCross = resolved?.leadLens === "cross" || resolved?.leadLens === "none";
  const weights = LENS_IDS.map((id) => {
    if (clean(lenses?.[id]?.confidence) === "none" || !lenses?.[id]) return 0;
    if (isCross) return LENS_WEIGHT.support;
    if (id === resolved?.leadLens) return LENS_WEIGHT.lead;
    if (support.has(id)) return LENS_WEIGHT.support;
    return LENS_WEIGHT.background;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  return Object.fromEntries(LENS_IDS.map((id, index) => [
    id,
    Math.floor(LENS_DIGEST_TOTAL_CHARS * (weights[index] / total)),
  ]));
}

/**
 * 렌즈 블록을 예산 안에서 직렬화한다.
 *
 * 🔴 문자열을 자르지 않는다. 우선순위 순으로 넣다가 예산을 넘는 필드는 **통째로 버리고**
 * notCalculated 에 기록한다. 구현 전에는 JSON.stringify 결과를 14,000자에서 잘랐는데,
 * 그러면 (1) 키 삽입 순서상 뒤쪽 렌즈가 통째로 사라지고 (2) 잘린 JSON 은 문법이 깨진
 * 문자열이라 LLM 이 어떻게 읽을지 보장이 없었다.
 */
function packLens(block, budgetChars) {
  if (!block || block.confidence === "none") {
    return { confidence: "none", data: null, notCalculated: ["all"] };
  }
  const priority = LENS_FIELD_PRIORITY[block.id] || Object.keys(asObject(block.data));
  const data = {};
  const dropped = [];
  let used = 0;
  for (const key of priority) {
    const value = block.data?.[key];
    if (value === undefined || value === null) continue;
    const size = JSON.stringify(value).length;
    if (used + size > budgetChars) {
      dropped.push(key);
      continue;
    }
    data[key] = value;
    used += size;
  }
  return {
    confidence: block.confidence,
    provisionalFields: safeArray(block.provisionalFields),
    notCalculated: uniq([...safeArray(block.omittedFields), ...dropped]),
    data,
  };
}

/**
 * 계산 근거 블록 — 렌즈 분업을 강제하는 실효 장치.
 *
 * 주도 렌즈만 두껍게 주고 나머지는 한 줄 요약만 준다. 데이터가 없으면 그 렌즈의 언어로
 * 말할 수 없으므로, "같은 결론을 표현만 바꿔 반복"이 구조적으로 불가능해진다.
 * 프롬프트 문장으로 반복을 금지하는 것은 보조 장치일 뿐이다.
 */
function buildLensDigest(integratedResult, definition) {
  const lenses = asObject(integratedResult?.lenses);
  const resolved = resolveEffectiveLead(definition, lenses);
  const budget = lensBudget(resolved, lenses);
  const support = new Set(safeArray(resolved.supportLens));
  const isCross = resolved.leadLens === "cross" || resolved.leadLens === "none";
  const lines = [];

  LENS_IDS.forEach((id, index) => {
    const block = lenses[id];
    const role = isCross ? "보조"
      : id === resolved.leadLens ? "주도"
        : support.has(id) ? "보조" : "배경";
    const label = block?.label || LENS_ROLES[id]?.label || id;
    const roleText = block?.role || LENS_ROLES[id]?.role || "";
    const packed = packLens(block, budget[id]);

    lines.push(`── 렌즈 ${index + 1} · ${label} — ${roleText} ── [${role} / 신뢰도 ${packed.confidence}]`);
    if (packed.confidence === "none") {
      lines.push("※ 이 관점은 계산되지 않았습니다. 이 관점의 용어와 논리를 쓰지 마세요.");
      return;
    }
    if (packed.provisionalFields.length) {
      lines.push(`※ 다음 항목은 값이 있으나 단정하면 안 됩니다(가능성으로만 서술): ${packed.provisionalFields.join(", ")}`);
    }
    lines.push(JSON.stringify(packed.data));
    if (packed.notCalculated.length) {
      // 🔴 없는 것을 명시해야 LLM 이 그 항목을 지어내지 않는다.
      lines.push(`※ 계산되지 않은 항목: ${packed.notCalculated.join(", ")} — 이 항목의 내용을 추정하거나 서술하지 마세요.`);
    }
    lines.push("");
  });

  const synthesis = asObject(integratedResult?.synthesis);
  if (safeArray(synthesis.convergence).length || safeArray(synthesis.divergence).length) {
    lines.push("── 관점 교차 결과(계산 대조만, 해석 아님) ──");
    lines.push(JSON.stringify({ convergence: synthesis.convergence, divergence: synthesis.divergence }));
  }
  return lines.join("\n");
}

/** 다른 장이 다루는 주제를 자동으로 나열해 중복 서술을 막는다. */
function buildCoveredHint(definition) {
  return PREMIUM_CHAPTERS
    .filter((other) => other.id !== definition.id)
    .map((other) => `${other.order}장 ${other.title}`)
    .join(" / ");
}

/** 받침 유무에 따라 주격 조사를 고른다("사주명리가" / "서양 점성술이"). */
function subjectParticle(word) {
  const last = clean(word).slice(-1);
  const code = last.charCodeAt(0);
  if (!(code >= 0xac00 && code <= 0xd7a3)) return "가";
  return (code - 0xac00) % 28 === 0 ? "가" : "이";
}

function describeLensRelay(definition, lenses = {}) {
  const resolved = resolveEffectiveLead(definition, lenses);
  const available = (id) => clean(lenses?.[id]?.confidence) && lenses[id].confidence !== "none";
  if (resolved.leadLens === "none") return "특정 관점에 매이지 않고 사람의 목소리로 씁니다.";
  if (resolved.leadLens === "cross") {
    return [
      "계산된 관점들을 엮되, 각 관점은 자기 몫만 한 번씩 말합니다.",
      resolved.demoted ? "지정된 주도 관점이 계산되지 않아 남은 관점들로만 씁니다." : "",
    ].filter(Boolean).join("\n");
  }
  const leadLabel = LENS_ROLES[resolved.leadLens]?.label || resolved.leadLens;
  const supportLabels = safeArray(resolved.supportLens).filter(available).map((id) => LENS_ROLES[id]?.label || id);
  const bannedLabels = LENS_IDS
    .filter((id) => id !== resolved.leadLens && !safeArray(resolved.supportLens).includes(id))
    .map((id) => LENS_ROLES[id]?.label || id);
  return [
    `주도 렌즈: ${leadLabel} — 이 장의 시작과 끝은 ${leadLabel}의 언어로 씁니다.`,
    resolved.demoted ? `(원래 주도로 지정된 관점은 계산되지 않아 ${leadLabel}${subjectParticle(leadLabel)} 그 자리를 대신합니다.)` : "",
    supportLabels.length ? `보조 렌즈: ${supportLabels.join(", ")}` : "",
    bannedLabels.length ? `사용 금지 렌즈: ${bannedLabels.join(", ")} — 이 장에서는 이 관점의 용어와 논리를 쓰지 않습니다.` : "",
  ].filter(Boolean).join("\n");
}

function buildChapterPrompt(consultation, definition, context = {}) {
  const birth = consultation.birthInfo || {};
  const place = birth.birthPlace || {};
  const previousSummaries = safeArray(context.previousSummaries).slice(-8);
  const avoidPhrases = safeArray(context.avoidPhrases).slice(0, 16);
  const siblingTitles = safeArray(context.siblingDefinitions)
    .filter((sibling) => sibling.id !== definition.id)
    .map((sibling) => `${sibling.order}장 ${sibling.title}(주도: ${LENS_ROLES[sibling.leadLens]?.label || sibling.leadLens})`);
  const energyLabel = ENERGY_DOMAIN_LABELS[definition.energyDomain];
  const lensesForChapter = asObject(consultation.integratedResult?.lenses);
  const resolvedLead = resolveEffectiveLead(definition, lensesForChapter);

  return [
    "[사용자 입력]",
    `이름 또는 닉네임: ${birth.name || "이름 미입력"}`,
    `성별: ${birth.gender}`,
    `생년월일: ${birth.birthDate}`,
    `출생시간: ${birth.birthTimeUnknown ? "모름" : birth.birthTime}`,
    `달력: ${birth.calendarType === "lunar" ? "음력" : "양력"}`,
    `출생지: ${[place.city, place.country, place.timezone].filter(Boolean).join(", ")}`,
    `상담 주제: ${consultation.topic}`,
    `현재 질문: ${consultation.userQuestion || "선택한 상담 주제를 중심으로 봅니다."}`,
    "",
    // 장별 프롬프트는 serializeIntegratedResultForPrompt(#224) 대신 buildLensDigest 를 쓴다.
    // 둘 다 "프롬프트에 실을 근거를 예산 안으로 줄인다"는 같은 문제를 풀지만, 여기서는
    // 총량 축소만으로는 부족하고 **렌즈별 차등 배분**이 필요하다 — 그게 이 기능의 핵심이다.
    // (후속 질문 경로는 장 개념이 없어 #224 의 직렬화기를 그대로 쓴다.)
    "[계산 근거 · 다섯 렌즈]",
    buildLensDigest(consultation.integratedResult, definition),
    "",
    "[이 장의 렌즈 구성]",
    describeLensRelay(definition, lensesForChapter),
    // 릴레이 문장은 원래 주도 렌즈를 전제로 쓰여 있다. 승계가 일어났다면 그 문장을 그대로
    // 주면 "베다가 지정하면…" 처럼 없는 관점을 쓰라고 지시하는 꼴이 되므로 뺀다.
    (definition.relay && !resolvedLead.demoted) ? `릴레이: ${definition.relay}` : "",
    "",
    "[앞 장에서 이어받을 흐름]",
    previousSummaries.length ? previousSummaries.join("\n") : "아직 앞 장이 없습니다. 전체 상담의 기둥을 세우듯 시작합니다.",
    "",
    "[다른 장이 담당하므로 여기서 쓰지 않을 것]",
    definition.notCovered ? `특히: ${definition.notCovered}` : "",
    `전체 목차: ${buildCoveredHint(definition)}`,
    siblingTitles.length ? `같은 묶음에서 함께 쓰이는 장: ${siblingTitles.join(" / ")}` : "",
    "",
    "[반복하지 않을 표현]",
    avoidPhrases.length ? avoidPhrases.join(", ") : "흔한 위로, 뻔한 자기계발 문장, 같은 은유의 반복",
    "",
    "[이번에 작성할 장]",
    JSON.stringify({
      id: definition.id,
      order: definition.order,
      title: definition.title,
      targetLength: definition.targetLength || PREMIUM_CHAPTER_TARGET_LENGTH,
      required: definition.required,
    }),
    "",
    `이 한 장만 깊게 작성하세요. content는 산문 중심으로 목표 ${definition.targetLength || PREMIUM_CHAPTER_TARGET_LENGTH}를 채우고, 마지막 흐름을 summary와 keyTakeaways 3개로 정리하세요.`,
    "계산 근거에 없는 값은 절대 추정하거나 지어내지 마세요. 근거가 없으면 그 항목을 다루지 말고 있는 근거로 깊이를 만드세요.",
    "사용자가 실제로 취할 수 있는 행동 전략을 장 안에 자연스럽게 넣으세요.",
    energyLabel
      ? `이 장은 '${energyLabel}' 영역을 담당합니다. 이 장에서 실제로 짚은 계산 근거만으로 그 영역의 에너지 강도를 0~100 사이 정수로 판정하고, 그렇게 본 이유 한 문장을 energyScore에 담으세요. 근거 없이 숫자를 만들지 마세요.`
      : "",
    "반환은 아래 형태의 JSON 객체 하나만 허용합니다.",
    energyLabel
      ? '{"id":"chapter-05","title":"...","content":"...","summary":"...","keyTakeaways":["...","...","..."],"highlightQuotes":["..."],"energyScore":{"value":72,"basis":"..."},"carryForward":"...","avoidPhrases":["..."]}'
      : '{"id":"chapter-01","title":"...","content":"...","summary":"...","keyTakeaways":["...","...","..."],"highlightQuotes":["..."],"carryForward":"...","avoidPhrases":["..."]}',
  ].filter((line) => line !== "").join("\n");
}

async function callRealGeminiText(env, prompt, options = {}) {
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: options.systemPrompt || buildSystemPrompt("initial"),
    taskType: "fortune",
    temperature: options.temperature ?? 0.72,
    maxOutputTokens: options.maxOutputTokens || INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
    // 45s 단락 함정 회피. 장 하나가 2,400자면 여유 있게 75s 안에 끝난다.
    timeoutMs: Number(env?.KARMA_DESTINY_AI_TIMEOUT_MS) || 120000,
    // 유료 라우트라 Workers AI 폴백에는 최소 분량 문턱을 반드시 함께 건다.
    // 문턱 미달이면 호출이 실패로 돌아 아래 실패 처리가 그대로 돈다.
    fallbackMinChars: Math.round(Number(options.chapterMinLength || INITIAL_CONSULTATION_SECTION_MIN_LENGTH) * 0.4),
    cache: buildKarmaLlmCache(env, clean(options.cacheStage) || "chapter-batch"),
  });
  const provider = clean(ai?.provider || ai?.model || "gemini");
  const isMock = /mock/i.test(provider) || ai?.isMock === true;
  if (!ai?.ok || isMock || !clean(ai?.text)) {
    const error = new Error(clean(ai?.message || ai?.error || "LLM generation failed.", 500));
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_GENERATION_FAILED";
    error.providerDiagnostics = getProviderDiagnostics(env);
    throw error;
  }
  return { text: clean(ai.text), provider, model: clean(ai?.model) };
}

/**
 * 한 장을 생성한다. **절대 throw 하지 않는다** — 실패를 값으로 돌려 한 장의 실패가
 * 같은 배치의 나머지 장을 죽이지 않게 한다(new-year-ai.js 의 섹션 생성 철학).
 */
async function generateOneChapter(env, consultation, definition, context = {}) {
  try {
    const generated = await callRealGeminiText(env, buildChapterPrompt(consultation, definition, context), {
      temperature: context.retry ? 0.66 : 0.72,
      maxOutputTokens: CHAPTER_MAX_OUTPUT_TOKENS,
      systemPrompt: buildSystemPrompt("initial"),
      // 장별 캐시 키 — 재시도 시 이미 성공한 장은 캐시에서 즉시 돌아온다.
      cacheStage: `chapter-${definition.id}`,
      chapterMinLength: definition.minLength,
    });
    let payload;
    try {
      payload = extractJsonPayload(generated.text);
    } catch {
      // 장당 7,000토큰이면 MAX_TOKENS 잘림이 사실상 없어 이 경로는 드물다.
      // 그래도 남겨 두는 이유는 모델이 코드펜스·설명문을 덧붙이는 경우가 있기 때문이다.
      const repaired = await callRealGeminiText(env, [
        "아래 답변을 내용 손실 없이 지정된 JSON 객체 형식으로만 다시 정리하세요.",
        "새 내용을 쓰지 말고, 이미 쓴 상담문을 content, summary, keyTakeaways, highlightQuotes로만 옮기세요.",
        "",
        generated.text,
      ].join("\n"), {
        temperature: 0.35,
        maxOutputTokens: CHAPTER_MAX_OUTPUT_TOKENS,
        systemPrompt: "당신은 텍스트를 지정된 JSON 구조로 정리하는 편집자입니다. JSON 객체 하나만 반환합니다.",
        cacheStage: `chapter-repair-${definition.id}`,
      });
      payload = extractJsonPayload(repaired.text);
      generated.provider = repaired.provider || generated.provider;
      generated.model = repaired.model || generated.model;
    }
    const raw = safeArray(payload?.chapters).find((item) => clean(item?.id) === definition.id) || payload;
    if (!clean(raw?.content)) {
      return { ok: false, definition, reason: "EMPTY_CHAPTER_CONTENT" };
    }
    return {
      ok: true,
      definition,
      chapter: normalizeChapter(raw, definition, consultation.integratedResult),
      carryForward: clean(raw?.carryForward || raw?.summary, 800),
      avoidPhrases: uniq(safeArray(raw?.avoidPhrases).map((item) => clean(item, 120))).slice(0, 6),
      provider: generated.provider,
      model: generated.model,
    };
  } catch (error) {
    return { ok: false, definition, reason: clean(error?.code || error?.message, 120) };
  }
}

/**
 * 배치 안의 장들을 동시에 굽는다.
 *
 * 배치 경계·락·클라이언트 폴링 계약은 그대로다(PREMIUM_BATCH_SIZE, 락 TTL 불변) —
 * 달라지는 것은 배치 **내부**가 1회 호출에서 장별 병렬 호출로 바뀌었다는 점뿐이다.
 * 이 전환이 필요한 이유는 성능이 아니라 렌즈 분업이다: 4장을 한 프롬프트로 쓰면 그 4장의
 * 렌즈 합집합을 줘야 해서 "이 장은 자미두수로만" 이 성립하지 않는다.
 */
async function generateChapterBatch(env, consultation, batchIndex, logContext = {}) {
  const definitions = PREMIUM_CHAPTERS.slice(batchIndex * PREMIUM_BATCH_SIZE, (batchIndex + 1) * PREMIUM_BATCH_SIZE);
  const context = {
    previousSummaries: safeArray(consultation.chapterSummaries)
      .map((item) => clean(item?.summary || item?.carryForward || item, 500))
      .filter(Boolean)
      .slice(-8),
    avoidPhrases: uniq(safeArray(consultation.generationProgress?.avoidPhrases).map((item) => clean(item, 120))),
    siblingDefinitions: definitions,
  };

  let rows = await runWithConcurrency(definitions, PREMIUM_CHAPTER_CONCURRENCY,
    (definition) => generateOneChapter(env, consultation, definition, context));

  // 웨이브 2 — 실패한 장만 다시 시도한다. 성공한 장을 다시 굽지 않는다.
  const failed = rows.filter((row) => !row.ok);
  if (failed.length) {
    logKarmaAi("LLM Chapter Retry", { ...logContext, batchIndex, retrying: failed.map((row) => `${row.definition.id}:${row.reason}`) }, "warn");
    const retried = await runWithConcurrency(failed.map((row) => row.definition), PREMIUM_CHAPTER_CONCURRENCY,
      (definition) => generateOneChapter(env, consultation, definition, { ...context, retry: true }));
    const byId = new Map(retried.map((row) => [row.definition.id, row]));
    rows = rows.map((row) => (row.ok ? row : (byId.get(row.definition.id)?.ok ? byId.get(row.definition.id) : row)));
  }

  const stillFailed = rows.filter((row) => !row.ok);
  if (stillFailed.length) {
    const error = new Error(`Missing generated chapter ${stillFailed.map((row) => row.definition.id).join(", ")}`);
    error.code = "LLM_BATCH_CHAPTER_MISSING";
    error.failedChapters = stillFailed.map((row) => ({ id: row.definition.id, reason: row.reason }));
    throw error;
  }

  const chapters = rows.map((row) => row.chapter);
  const provider = clean(rows.find((row) => row.provider)?.provider);
  const model = clean(rows.find((row) => row.model)?.model);
  logKarmaAi("LLM Batch Generated", { ...logContext, batchIndex, chapterIds: chapters.map((chapter) => chapter.id), provider, model });
  return {
    chapters,
    chapterSummary: {
      batchIndex,
      summary: clean(chapters.map((chapter) => chapter.summary).filter(Boolean).join(" "), 800),
      carryForward: clean(rows.map((row) => row.carryForward).filter(Boolean).join(" "), 800),
      avoidPhrases: uniq(rows.flatMap((row) => safeArray(row.avoidPhrases))).slice(0, 12),
    },
    avoidPhrases: uniq(rows.flatMap((row) => safeArray(row.avoidPhrases))).slice(0, 12),
    provider,
    model,
  };
}

function pickReinforcementTargets(chapters, quality) {
  const byId = new Map(safeArray(chapters).map((chapter) => [chapter.id, chapter]));
  const explicit = uniq([
    ...safeArray(quality.shortChapters),
    ...safeArray(quality.missingChapters),
    // 경고 전용 신호는 실패를 만들지 않지만, 보강할 장을 고를 때는 우선순위가 된다.
    ...safeArray(quality.lensRoleWarnings).map((row) => row.chapterId),
    ...safeArray(quality.conclusionOverlapWarnings).map((row) => row.b),
  ]).map((id) => PREMIUM_CHAPTERS.find((definition) => definition.id === id)).filter(Boolean);
  if (explicit.length) return explicit.slice(0, PREMIUM_BATCH_SIZE);
  return [...PREMIUM_CHAPTERS]
    .sort((a, b) => countUserVisibleChars(formatChapterContent(byId.get(a.id) || {})) - countUserVisibleChars(formatChapterContent(byId.get(b.id) || {})))
    .slice(0, PREMIUM_BATCH_SIZE);
}

async function reinforcePremiumReport(env, consultation, chapters, quality, attempt, logContext = {}) {
  const targets = pickReinforcementTargets(chapters, quality);
  const chapterMap = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const prompt = [
    "현재 운명의 업 상담 결과가 목표 분량보다 부족하다. 기존 내용을 반복하지 말고, 구체적 사례, 시기별 흐름, 관계 패턴, 현실 행동 전략, 주의할 선택, 회복 루틴을 추가하여 부족한 분량을 보강하라.",
    "",
    "[사용자 입력]",
    JSON.stringify(buildPublicUserInput(consultation)),
    "",
    "[보강해야 할 장]",
    JSON.stringify(targets.map((definition) => ({
      id: definition.id,
      order: definition.order,
      title: definition.title,
      required: definition.required,
      currentCharCount: countUserVisibleChars(formatChapterContent(chapterMap.get(definition.id) || {})),
    }))),
    "",
    "[현재 품질 점검]",
    JSON.stringify({
      totalCharCount: quality.totalCharCount,
      minLength: quality.minLength,
      shortChapters: quality.shortChapters,
      repeatedPhraseWarnings: quality.repeatedPhraseWarnings,
      genericAdviceWarnings: quality.genericAdviceWarnings,
      lensRoleWarnings: quality.lensRoleWarnings,
      conclusionOverlapWarnings: quality.conclusionOverlapWarnings,
    }),
    "",
    "lensRoleWarnings 에 표시된 장은 그 장이 맡지 않은 관점의 용어를 쓰고 있습니다. 해당 관점의 용어를 걷어내고 그 장의 주도 관점으로 다시 쓰세요.",
    "conclusionOverlapWarnings 에 표시된 두 장은 결론이 겹칩니다. 뒤쪽 장을 그 장만의 각도로 다시 쓰세요.",
    "각 supplement content는 기존 장에 이어 붙일 수 있는 새 산문이어야 합니다. 이미 쓴 문단을 다시 쓰지 말고, 더 구체적인 사례와 선택 기준을 추가하세요.",
    "반환은 JSON 객체 하나만 허용합니다.",
    '{"supplements":[{"id":"chapter-01","content":"...","summary":"...","keyTakeaways":["...","...","..."],"highlightQuotes":["..."]}],"avoidPhrases":["..."]}',
  ].join("\n");
  const generated = await callRealGeminiText(env, prompt, {
    temperature: 0.66,
    maxOutputTokens: INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS,
    systemPrompt: buildSystemPrompt("initial"),
  });
  const payload = extractJsonPayload(generated.text);
  const supplements = safeArray(payload?.supplements);
  const merged = chapters.map((chapter) => {
    const supplement = supplements.find((item) => clean(item?.id) === chapter.id);
    if (!supplement) return chapter;
    const definition = PREMIUM_CHAPTERS[chapter.order - 1] || chapter;
    const content = [chapter.content, cleanForbiddenResult(clean(supplement.content, 8000))].filter(Boolean).join("\n\n");
    const keyTakeaways = safeArray(supplement.keyTakeaways).length
      ? safeArray(supplement.keyTakeaways).map((item) => cleanForbiddenResult(clean(item, 220))).filter(Boolean).slice(0, 3)
      : chapter.keyTakeaways;
    const mergedChapter = {
      ...chapter,
      content,
      summary: cleanForbiddenResult(clean(supplement.summary || chapter.summary, 1200)),
      keyTakeaways: keyTakeaways.length >= 3 ? keyTakeaways : chapter.keyTakeaways,
      highlightQuotes: uniq([...safeArray(chapter.highlightQuotes), ...safeArray(supplement.highlightQuotes)].map((item) => cleanForbiddenResult(clean(item, 180)))).slice(0, 3),
    };
    return {
      ...mergedChapter,
      charCount: countUserVisibleChars(formatChapterContent({ ...mergedChapter, title: definition.title })),
    };
  });
  logKarmaAi("LLM Reinforcement Generated", { ...logContext, attempt, targetIds: targets.map((target) => target.id), provider: generated.provider, model: generated.model });
  return {
    chapters: merged,
    avoidPhrases: uniq(safeArray(payload?.avoidPhrases).map((item) => clean(item, 120))).slice(0, 12),
    provider: generated.provider,
    model: generated.model,
  };
}

async function applyUsageAfterSuccessfulGeneration({ request, env, auth, consultation, pricing }) {
  const billingState = asObject(consultation.billingState);
  if (billingState.deferredUsage) {
    await callDeferredUsageRoute({
      request,
      env,
      auth,
      path: "apply",
      idempotencyKey: consultation.idempotencyKey,
      sessionId: consultation.id,
    });
  } else if (!billingState.usageAlreadyApplied && consultation.accessType === "pass") {
    await applyUsageOnce({ userId: auth.userId, sessionId: consultation.id, accessType: consultation.accessType, pricing });
  } else if (!billingState.usageAlreadyApplied && isMonthlyCreditAccess(consultation.accessType)) {
    const gateError = new Error("monthly credit must be confirmed by common billing gate");
    gateError.code = "MONTHLY_CREDIT_GATE_REQUIRED";
    throw gateError;
  } else {
    await KarmaDestinyAiConsultation.updateOne(
      { id: consultation.id, usageAppliedAt: null },
      { $set: { usageAppliedAt: new Date() } },
    );
  }
}

async function cancelDeferredUsageIfNeeded({ request, env, auth, consultation, error }) {
  const billingState = asObject(consultation?.billingState);
  if (!billingState.deferredUsage || consultation?.usageAppliedAt) return;
  await callDeferredUsageRoute({
    request,
    env,
    auth,
    path: "cancel",
    idempotencyKey: consultation.idempotencyKey,
    sessionId: consultation.id,
    code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
    message: clean(error?.message || error, 500),
  });
}

function buildSummaryCards(integratedResult = {}) {
  const synthesis = asObject(integratedResult.synthesis);
  // 개편 전 synthesis 는 karmicThemes/currentLifeTask 가 전부 하드코딩 문자열이라 모든
  // 사용자에게 같은 카드가 나갔다. 지금은 렌즈별 실제 요약과 교차 결과에서만 뽑는다.
  const patterns = safeArray(synthesis.patternSummaries).map((row) => clean(row?.summary)).filter(Boolean);
  const convergence = safeArray(synthesis.convergence).map((row) => clean(row?.label)).filter(Boolean);
  const keywordCandidates = uniq([...convergence, ...patterns]
    .map((item) => clean(String(item).replace(/[.!?。]/g, "").split(/[·ㆍ,，:：/]/)[0], 28))
    .filter(Boolean));
  const keywords = uniq([...keywordCandidates, "반복 선택", "관계의 매듭", "재능의 숙제"]).slice(0, 3);
  return {
    keywords,
    repeatingPattern: clean(patterns[0], 180) || "익숙한 감정 반응이 관계와 일의 선택에서 되풀이되는 흐름",
    currentTask: clean(convergence[0], 180) || clean(patterns[1], 180) || "같은 장면에서 한 번 더 느린 선택을 연습하는 일",
  };
}

async function applyUsageOnce({ userId, sessionId, accessType, pricing }) {
  const existing = await KarmaDestinyAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;

  await KarmaDestinyAiConsultation.updateOne(
    { id: sessionId, usageAppliedAt: null },
    { $set: { usageAppliedAt: new Date() } },
  );
  return true;
}

function publicSession(doc) {
  const chapters = safeArray(doc.chapters).map((chapter) => ({
    id: clean(chapter.id, 40),
    order: Number(chapter.order || 0),
    title: clean(chapter.title, 120),
    content: clean(chapter.content, 14000),
    summary: clean(chapter.summary, 1200),
    keyTakeaways: safeArray(chapter.keyTakeaways).map((item) => clean(item, 220)).filter(Boolean).slice(0, 3),
    highlightQuotes: safeArray(chapter.highlightQuotes).map((item) => clean(item, 180)).filter(Boolean).slice(0, 3),
    charCount: Number(chapter.charCount || countUserVisibleChars(formatChapterContent(chapter))),
    // schemaVersion 1 문서에는 없다. 프론트는 값이 없으면 해당 UI 를 렌더하지 않는다.
    symbol: clean(chapter.symbol, 4),
    leadLens: clean(chapter.leadLens, 20),
    supportLens: safeArray(chapter.supportLens).map((item) => clean(item, 20)).filter(Boolean),
    evidence: safeArray(chapter.evidence).length ? chapter.evidence : null,
    energyScore: chapter.energyScore || null,
  })).sort((a, b) => a.order - b.order);
  const assistantMessages = safeArray(doc.messages).filter((message) => message.role === "assistant");
  const generatedAt = doc.generatedAt || assistantMessages[assistantMessages.length - 1]?.createdAt || null;
  return {
    ok: true,
    sessionId: clean(doc.id),
    reportId: clean(doc.reportId || doc.id),
    attemptId: clean(doc.attemptId || doc.idempotencyKey),
    accessType: clean(doc.accessType),
    status: clean(doc.status),
    generatedAt,
    totalCharCount: Number(doc.totalCharCount || (chapters.length ? countUserVisibleChars(formatChaptersAsConsultationText(chapters)) : 0)),
    userInput: buildPublicUserInput(doc),
    integratedResult: doc.integratedResult || null,
    summaryCards: doc.summaryCards || null,
    // 1 = 구 16장(3체계), 2 = 15장 다섯 렌즈. 프론트는 이 값으로 레이더·근거 패널 렌더를 가른다.
    schemaVersion: Number(doc.schemaVersion || 1),
    lensContribution: doc.lensContribution || doc.integratedResult?.lensContribution || null,
    lensAvailability: doc.lensAvailability || doc.integratedResult?.lensAvailability || null,
    chapters,
    finalLetter: clean(doc.finalLetter, 14000),
    qualityCheck: doc.qualityCheck ? {
      passed: doc.qualityCheck.passed === true || doc.qualityCheck.ok === true,
      totalCharCount: Number(doc.qualityCheck.totalCharCount || doc.qualityCheck.totalChars || 0),
      chapterCount: Number(doc.qualityCheck.chapterCount || 0),
      repeatedPhraseWarnings: safeArray(doc.qualityCheck.repeatedPhraseWarnings).slice(0, 8),
      promptLeakDetected: doc.qualityCheck.promptLeakDetected === true,
    } : null,
    generationProgress: doc.generationProgress || buildGenerationProgress(doc),
    messages: safeArray(doc.messages).map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
  };
}

async function handleEnsureAccess(request, env) {
  const route = "/api/karma-destiny-ai/ensure-access";
  logKarmaAi("LLM Prepare Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logKarmaAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logKarmaAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  const pricing = getPricing();
  logKarmaAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  if (isAdmin(auth)) {
    logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "admin", env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: "admin",
        idempotencyKey,
        inputHash: normalized.inputHash,
        usageAlreadyApplied: true,
      }),
      accessType: "admin",
    });
  }

  await connectDb(env);
  // 풀 초기화(MongoPoolClearedError) 순간에도 접근 판정 read가 1회 실패로 죽지 않도록 재시도.
  const user = await withMongoRetry(env, () => loadBillingUser(auth.userId));
  if (!user) return loginRequired();

  const access = await withMongoRetry(env, () => resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body }));
  if (access.ok) {
    logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: access.accessType,
        idempotencyKey,
        inputHash: normalized.inputHash,
        paymentId: access.paymentId || "",
        billingRequestId: access.billingRequestId || "",
        usageAlreadyApplied: access.usageAlreadyApplied === true,
        deferredUsage: access.deferredUsage === true,
      }),
      accessType: access.accessType,
    });
  }

  logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "payment_required", env }));
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: "운명의 업 전문가 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
    paymentPayload: buildBillingGatePayload(pricing, idempotencyKey),
  }, { status: 402 });
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  const token = clean(body?.accessToken || request.headers.get("x-karma-destiny-ai-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: "상담 접근 정보가 현재 입력값과 일치하지 않습니다." };
    }
    return {
      ok: true,
      accessType: clean(payload.accessType),
      paymentId: clean(payload.paymentId, 160),
      billingRequestId: clean(payload.billingRequestId, 180),
      usageAlreadyApplied: payload.usageAlreadyApplied === true,
      deferredUsage: payload.deferredUsage === true,
    };
  }

  const billing = await withMongoRetry(env, () => findBillingGateEvidence({ userId: auth.userId, idempotencyKey, body }));
  if (billing?.ok) return {
    ...billing,
    usageAlreadyApplied: billing.usageAlreadyApplied === true,
  };

  return {
    ok: false,
    reason: "PAYMENT_REQUIRED",
    message: "상담 생성 전 결제 확인이 필요합니다.",
    code: "START_ACCESS_CONFIRMATION_REQUIRED",
  };
}

function cloneBillingHeaders(request) {
  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  headers.delete("content-length");
  return headers;
}

async function callDeferredUsageRoute({ request, env, auth, path, idempotencyKey, sessionId, code = "", message = "" }) {
  const url = new URL(request.url);
  url.pathname = `/api/billing/coin-gate/deferred/${path}`;
  url.search = "";
  const response = await handleBillingRoutes(new Request(url.toString(), {
    method: "POST",
    headers: cloneBillingHeaders(request),
    body: JSON.stringify({
      featureKey: FEATURE_KEY,
      serviceType: "karma-ai-consultation",
      consultationType: "destinyKarma",
      reason: ORDER_NAME,
      requestId: idempotencyKey,
      idempotencyKey,
      sessionId,
      resultId: sessionId,
      code,
      message,
    }),
  }), env, { preverifiedAuth: auth });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    const error = new Error(clean(payload?.message || payload?.error?.message || `Deferred usage ${path} failed.`, 500));
    error.code = clean(payload?.error?.code || `DEFERRED_USAGE_${path.toUpperCase()}_FAILED`, 80);
    throw error;
  }
  return payload?.data || payload;
}

async function handleStart(request, env) {
  const route = "/api/karma-destiny-ai/start";
  logKarmaAi("LLM Generate Start", safeLogPayload({ route, env }));
  const body = await readJson(request);
  const idempotencyKey = readIdempotencyKey(request, body);
  logKarmaAi("LLM Payload Received", safeLogPayload({ route, requestId: idempotencyKey, body, env }));
  const normalized = normalizeConsultationInput(body);
  if (!normalized.ok) {
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, validation: "failed", env, error: new Error(normalized.message) }), "warn");
    return invalidInput(normalized.message);
  }
  logKarmaAi("LLM Payload Validated", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, validation: "ok", env }));
  if (idempotencyKey.length < 12) return invalidInput("요청 키가 누락되었습니다. 화면을 새로고침한 뒤 다시 시도해 주세요.");

  // billing 프로젝션으로 한 번에 읽어 두면, 실패 시 아래 cancelDeferredUsageIfNeeded 의 내부 coin-gate
  // 위임이 users 를 다시 읽지 않고 이 인증 결과를 그대로 재사용한다(preverifiedAuth).
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true, userProjection: BILLING_SNAPSHOT_USER_PROJECTION });
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  logKarmaAi("LLM Access Check Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: "checking", env }));
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return paymentVerifyFailed();
  }
  logKarmaAi("LLM Access Check Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
  logKarmaAi("LLM Payment Guard Passed", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));

  const existing = await withMongoRetry(env, () => KarmaDestinyAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean());
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicSession(existing));

  const sessionId = existing?.id || `kdai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}_${randomToken(8)}`;
  const now = new Date();
  // 🔴 판이 다른 진행중 문서를 이어붙이면 안 된다. 구 16장 문서에 15장 정의를 적용하면
  // chapter-09 같은 id 가 서로 다른 장을 가리켜 LLM_BATCH_CHAPTER_MISSING → 결제 후 무결과가
  // 된다. 과금은 아직 deferredUsage 상태라 처음부터 다시 생성해도 사용자 손해가 없다.
  const resumable = existing?.status === "generating"
    && Number(existing?.schemaVersion || 1) === REPORT_SCHEMA_VERSION;
  const resumedChapters = resumable ? safeArray(existing.chapters) : [];
  if (existing?.status === "generating" && !resumable) {
    logKarmaAi("Report Schema Changed", { requestId: idempotencyKey, sessionId: clean(existing.id), from: Number(existing?.schemaVersion || 1), to: REPORT_SCHEMA_VERSION }, "warn");
  }
  const seed = {
    id: sessionId,
    reportId: clean(existing?.reportId || sessionId, 120),
    attemptId: idempotencyKey,
    userId: clean(auth.userId),
    birthInfo: normalized.input.birthInfo,
    topic: normalized.input.topic,
    userQuestion: normalized.input.userQuestion,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    billingRequestId: clean(access.billingRequestId || idempotencyKey, 180),
    billingState: {
      deferredUsage: access.deferredUsage === true,
      usageAlreadyApplied: access.usageAlreadyApplied === true,
      paymentId: clean(access.paymentId, 160),
      billingRequestId: clean(access.billingRequestId || idempotencyKey, 180),
      preparedAt: now.toISOString(),
    },
    messages: resumable ? safeArray(existing.messages) : [],
    chapters: resumedChapters,
    chapterSummaries: resumable ? safeArray(existing.chapterSummaries) : [],
    finalLetter: resumable ? clean(existing.finalLetter, 14000) : "",
    generatedAt: null,
    totalCharCount: resumable ? Number(existing.totalCharCount || 0) : 0,
    qualityCheck: null,
    schemaVersion: REPORT_SCHEMA_VERSION,
    generationProgress: buildGenerationProgress(existing || {}, {
      chapters: resumedChapters,
      stageLabel: GENERATION_STAGES[0],
      activeBatchIndex: Math.floor(resumedChapters.length / PREMIUM_BATCH_SIZE),
      lockToken: "",
      lockedAt: null,
    }),
    idempotencyKey,
    inputHash: normalized.inputHash,
    status: "generating",
    generationError: null,
  };

  try {
    if (existing) {
      await KarmaDestinyAiConsultation.updateOne(
        { id: existing.id },
        { $set: { ...seed, updatedAt: now } },
      );
    } else {
      try {
        await KarmaDestinyAiConsultation.create(seed);
      } catch (error) {
        if (error?.code === 11000) {
          const duplicate = await KarmaDestinyAiConsultation.findOne({ userId: clean(auth.userId), idempotencyKey }).lean();
          if (duplicate?.status === "completed") return json(publicSession(duplicate));
          return json(publicSession(duplicate || seed), { status: 202 });
        }
        throw error;
      }
    }

    logKarmaAi("LLM Fortune Data Start", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    const integratedResult = (resumable && existing?.integratedResult)
      || await buildKarmaDestinyIntegratedResult(env, normalized.input.birthInfo, { lensUsageWeights: LENS_USAGE_WEIGHTS });
    // 다섯 렌즈가 모두 계산되지 않았을 때만 실패다. 구 검사는 사주·서양·베다 세 개만 봐서
    // 좌표 미상으로 자미·숙요만 살아남은 정상 케이스를 실패로 오판했다.
    const usableLens = LENS_IDS.some((id) => clean(integratedResult?.lenses?.[id]?.confidence) !== "none");
    if (!usableLens) {
      const calculationError = new Error(CALCULATION_ERROR_MESSAGE);
      calculationError.code = "CALCULATION_ERROR";
      throw calculationError;
    }
    logKarmaAi("LLM Fortune Data Success", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env }));
    const summaryCards = (resumable && existing?.summaryCards) || buildSummaryCards(integratedResult);
    const lensContribution = integratedResult?.lensContribution
      || computeLensContribution(asObject(integratedResult?.lenses), LENS_USAGE_WEIGHTS);
    const prepared = await KarmaDestinyAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "generating",
          integratedResult,
          summaryCards,
          schemaVersion: REPORT_SCHEMA_VERSION,
          lensContribution,
          lensAvailability: integratedResult?.lensAvailability || null,
          generationProgress: buildGenerationProgress({ ...seed, integratedResult, summaryCards }),
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    return json(publicSession(prepared), { status: 202 });
  } catch (error) {
    await KarmaDestinyAiConsultation.updateOne(
      { id: sessionId },
      {
        $set: {
          status: "generation_failed",
          generationError: {
            code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
            message: clean(error?.message || error, 500),
            at: new Date().toISOString(),
          },
        },
      },
    ).catch(() => {});
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }), "error");
    if (access.deferredUsage) {
      await cancelDeferredUsageIfNeeded({
        request,
        env,
        auth,
        consultation: { ...seed, usageAppliedAt: null },
        error,
      }).catch((restoreError) => {
        logKarmaAi("LLM Refund Or Restore", safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error: restoreError }), "warn");
      });
    }
    logKarmaAi("LLM Refund Or Restore", {
      ...safeLogPayload({ route, requestId: idempotencyKey, body, normalized, access: access.accessType, env, error }),
      restoreMode: access.deferredUsage ? "deferred_usage_cancelled_or_pending" : "same_request_id_retry_preserves_billing_evidence",
    }, "warn");
    if (clean(error?.code) === "CALCULATION_ERROR") {
      return json({ ok: false, reason: "CALCULATION_ERROR", message: CALCULATION_ERROR_MESSAGE }, { status: 422 });
    }
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

async function handleGenerateBatch(request, env) {
  const route = "/api/karma-destiny-ai/generate-batch";
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.reportId || body?.attemptId || body?.idempotencyKey, 180);
  if (!sessionId) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);

  // billing 프로젝션으로 한 번에 읽어 두면, 아래 applyUsageAfterSuccessfulGeneration/
  // cancelDeferredUsageIfNeeded 의 내부 coin-gate 위임이 users 를 다시 읽지 않는다(preverifiedAuth).
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true, userProjection: BILLING_SNAPSHOT_USER_PROJECTION });
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  let consultation = await KarmaDestinyAiConsultation.findOne(buildResultLookup(sessionId, auth)).lean();
  if (!consultation) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);
  if (consultation.status === "completed") return json(publicSession(consultation));
  if (consultation.status === "generation_failed") {
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE, sessionId: consultation.id, status: consultation.status }, { status: 409 });
  }
  if (!consultation.integratedResult) {
    return json({ ok: false, reason: "CALCULATION_ERROR", message: CALCULATION_ERROR_MESSAGE }, { status: 422 });
  }
  // handleStart 가 이미 판이 다른 문서를 재개 대상에서 제외하지만, 배포 전환 틈새에 잡힌
  // 폴링이 구 문서를 그대로 밀고 들어오는 경로가 남는다. 여기서 한 번 더 막는다 —
  // 막지 않으면 챕터 id 가 서로 다른 장을 가리켜 결제 후 무결과가 된다.
  if (Number(consultation.schemaVersion || 1) !== REPORT_SCHEMA_VERSION) {
    logKarmaAi("Report Schema Changed", { sessionId: clean(consultation.id), from: Number(consultation.schemaVersion || 1), to: REPORT_SCHEMA_VERSION }, "warn");
    return json({
      ok: false,
      reason: "REPORT_SCHEMA_CHANGED",
      message: "리포트 구성이 갱신되었습니다. 같은 세션으로 다시 시작하면 처음부터 새로 작성됩니다.",
      sessionId: consultation.id,
    }, { status: 409 });
  }

  const lock = asObject(consultation.generationProgress);
  const lockAgeMs = lock.lockedAt ? Date.now() - new Date(lock.lockedAt).getTime() : Number.POSITIVE_INFINITY;
  if (clean(lock.lockToken) && lockAgeMs >= 0 && lockAgeMs < PREMIUM_BATCH_LOCK_TTL_MS) {
    return json(publicSession(consultation), { status: 202 });
  }

  const lockToken = randomToken(12);
  const currentChapters = safeArray(consultation.chapters);
  const batchIndex = Math.min(Math.floor(currentChapters.length / PREMIUM_BATCH_SIZE), Math.ceil(PREMIUM_CHAPTERS.length / PREMIUM_BATCH_SIZE) - 1);
  await KarmaDestinyAiConsultation.updateOne(
    { id: consultation.id, userId: clean(auth.userId), status: "generating" },
    {
      $set: {
        generationProgress: buildGenerationProgress(consultation, {
          chapters: currentChapters,
          activeBatchIndex: batchIndex,
          lockToken,
          lockedAt: new Date(),
          stageLabel: GENERATION_STAGES[Math.min(batchIndex + 1, GENERATION_STAGES.length - 1)],
        }),
      },
    },
  );
  consultation = await KarmaDestinyAiConsultation.findOne({ id: consultation.id, userId: clean(auth.userId) }).lean();

  const logContext = safeLogPayload({
    route,
    requestId: consultation.idempotencyKey,
    body,
    normalized: {
      input: {
        serviceType: "karma-ai-consultation",
        focusArea: "batch_generation",
        question: consultation.userQuestion,
        birthInfo: consultation.birthInfo,
      },
    },
    access: consultation.accessType,
    env,
  });

  try {
    let chapters = safeArray(consultation.chapters).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    if (chapters.length < PREMIUM_CHAPTERS.length) {
      const generated = await generateChapterBatch(env, consultation, batchIndex, logContext);
      const generatedIds = new Set(generated.chapters.map((chapter) => chapter.id));
      chapters = [
        ...chapters.filter((chapter) => !generatedIds.has(chapter.id)),
        ...generated.chapters,
      ].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
      const chapterSummaries = [
        ...safeArray(consultation.chapterSummaries).filter((item) => Number(item?.batchIndex) !== batchIndex),
        generated.chapterSummary,
      ].sort((a, b) => Number(a?.batchIndex || 0) - Number(b?.batchIndex || 0));
      const avoidPhrases = uniq([
        ...safeArray(consultation.generationProgress?.avoidPhrases),
        ...generated.avoidPhrases,
        ...safeArray(generated.chapterSummary?.avoidPhrases),
      ]).slice(0, 24);

      consultation = await KarmaDestinyAiConsultation.findOneAndUpdate(
        { id: consultation.id, userId: clean(auth.userId) },
        {
          $set: {
            chapters,
            chapterSummaries,
            totalCharCount: countUserVisibleChars(formatChaptersAsConsultationText(chapters)),
            generationProgress: {
              ...buildGenerationProgress(consultation, {
                chapters,
                activeBatchIndex: Math.floor(chapters.length / PREMIUM_BATCH_SIZE),
                lockToken: "",
                lockedAt: null,
                stageLabel: chapters.length >= PREMIUM_CHAPTERS.length ? "최종 품질을 확인하는 중" : GENERATION_STAGES[Math.min(batchIndex + 1, GENERATION_STAGES.length - 1)],
              }),
              avoidPhrases,
            },
            llmMeta: { provider: generated.provider, model: generated.model, updatedAt: new Date().toISOString() },
          },
        },
        { new: true },
      ).lean();
    }

    chapters = safeArray(consultation.chapters).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    if (chapters.length < PREMIUM_CHAPTERS.length) {
      return json(publicSession(consultation), { status: 202 });
    }

    let quality = validatePremiumReportQuality(chapters);
    let provider = clean(consultation.llmMeta?.provider);
    let model = clean(consultation.llmMeta?.model);
    for (let attempt = 1; attempt <= PREMIUM_REINFORCEMENT_MAX_ATTEMPTS && !quality.ok; attempt += 1) {
      const reinforced = await reinforcePremiumReport(env, consultation, chapters, quality, attempt, logContext);
      chapters = reinforced.chapters;
      provider = reinforced.provider || provider;
      model = reinforced.model || model;
      quality = validatePremiumReportQuality(chapters);
    }

    if (!quality.ok) {
      const error = new Error("Karma destiny consultation did not meet premium quality requirements.");
      error.code = quality.tooShort ? "LLM_RESULT_TOO_SHORT" : "LLM_RESULT_QUALITY_FAILED";
      error.quality = quality;
      throw error;
    }

    await applyUsageAfterSuccessfulGeneration({ request, env, auth, consultation, pricing });
    const completedAt = new Date();
    const assistantContent = formatChaptersAsConsultationText(chapters);
    const finalLetter = clean(chapters.find((chapter) => chapter.id === FINAL_LETTER_CHAPTER_ID)?.content, 14000);
    const completed = await KarmaDestinyAiConsultation.findOneAndUpdate(
      { id: consultation.id, userId: clean(auth.userId) },
      {
        $set: {
          status: "completed",
          chapters,
          finalLetter,
          generatedAt: completedAt,
          totalCharCount: quality.totalCharCount,
          qualityCheck: quality,
          generationProgress: buildGenerationProgress({ ...consultation, status: "completed" }, { chapters, status: "completed", percent: 100, lockToken: "", lockedAt: null, stageLabel: "최종 편지를 봉인했습니다" }),
          messages: [
            { role: "user", content: `${consultation.topic}${consultation.userQuestion ? `\n${consultation.userQuestion}` : ""}`, createdAt: consultation.createdAt || completedAt },
            { role: "assistant", content: assistantContent, createdAt: completedAt },
          ],
          usageAppliedAt: completedAt,
          llmMeta: { provider, model, completedAt: completedAt.toISOString(), deferredUsageApplied: asObject(consultation.billingState).deferredUsage === true },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    logKarmaAi("LLM Generate Success", { ...logContext, provider, model, totalCharCount: quality.totalCharCount, chapterCount: chapters.length });
    return json(publicSession(completed));
  } catch (error) {
    await KarmaDestinyAiConsultation.updateOne(
      { id: consultation.id, userId: clean(auth.userId) },
      {
        $set: {
          status: "generation_failed",
          qualityCheck: error?.quality || null,
          generationProgress: {
            ...buildGenerationProgress(consultation, { chapters: safeArray(consultation.chapters), lockToken: "", lockedAt: null }),
            lockToken: "",
            lockedAt: null,
          },
          generationError: {
            code: clean(error?.code || "LLM_GENERATION_FAILED", 80),
            message: clean(error?.message || error, 500),
            at: new Date().toISOString(),
          },
        },
      },
    ).catch(() => {});
    await cancelDeferredUsageIfNeeded({ request, env, auth, consultation, error }).catch((restoreError) => {
      logKarmaAi("LLM Refund Or Restore", safeLogPayload({ route, requestId: consultation.idempotencyKey, body, access: consultation.accessType, env, error: restoreError }), "warn");
    });
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: consultation.idempotencyKey, body, access: consultation.accessType, env, error }), "error");
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE, sessionId: consultation.id, status: "generation_failed" }, { status: 503 });
  }
}

async function handleResult(request, env, path) {
  const url = new URL(request.url);
  const pathId = path.startsWith("/result/") ? decodeURIComponent(path.slice("/result/".length)) : "";
  const identifier = clean(pathId || url.searchParams.get("sessionId") || url.searchParams.get("reportId") || url.searchParams.get("attemptId") || url.searchParams.get("idempotencyKey"), 180);
  if (!identifier) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);

  // 폴링은 이미 인가된 세션의 결과 조회다. 인증 판정에서 일시적 DB 장애가 나면 하드 503으로 끊지 말고
  // 재시도 가능하다는 신호를 실어 보내 클라가 폴링을 이어가게 한다(nakshatra/neo와 동일한 완충).
  let auth = null;
  try {
    auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  } catch (error) {
    return json({
      ok: false,
      retryable: true,
      reason: "DB_DEGRADED",
      message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await KarmaDestinyAiConsultation.findOne(buildResultLookup(identifier, auth)).lean();
  if (!consultation) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);
  const statusCode = consultation.status === "generating" ? 202 : consultation.status === "generation_failed" ? 409 : 200;
  return json(publicSession(consultation), { status: statusCode });
}

async function handleMessage(request, env) {
  const route = "/api/karma-destiny-ai/message";
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.consultationId, 120);
  const message = clean(body?.message || body?.question, 1200);
  if (!sessionId) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);
  if (message.length < 2) return invalidInput("추가 질문을 입력해 주세요.");

  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await KarmaDestinyAiConsultation.findOne({
    id: sessionId,
    userId: clean(auth.userId),
    status: "completed",
  }).lean();
  if (!consultation) return invalidInput("상담 세션을 찾을 수 없습니다.", 404);

  try {
    const logContext = safeLogPayload({
      route,
      requestId: sessionId,
      body: { ...body, question: message },
      normalized: {
        input: {
          serviceType: "karma-ai-consultation",
          focusArea: "follow_up",
          question: message,
          birthInfo: consultation.birthInfo,
        },
      },
      access: consultation.accessType,
      env,
    });
    const generated = await generateConsultationText(env, buildFollowUpPrompt(consultation, message), {
      mode: "follow_up",
      minLength: 180,
      maxOutputTokens: 4600,
      logContext,
    });
    const userMessage = { role: "user", content: message, createdAt: new Date() };
    const assistantMessage = { role: "assistant", content: generated.text, createdAt: new Date() };
    const updated = await KarmaDestinyAiConsultation.findOneAndUpdate(
      { id: sessionId, userId: clean(auth.userId) },
      {
        $push: { messages: { $each: [userMessage, assistantMessage] } },
        $set: {
          llmMeta: { provider: generated.provider, model: generated.model, updatedAt: new Date().toISOString() },
        },
      },
      { new: true },
    ).lean();
    logKarmaAi("LLM Generate Success", { ...logContext, provider: generated.provider, model: generated.model });
    return json(publicSession(updated));
  } catch (error) {
    logKarmaAi("LLM Error", safeLogPayload({ route, requestId: sessionId, body, access: "follow_up", env, error }), "error");
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

export async function handleKarmaDestinyAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/karma-destiny-ai");

  try {
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env);
    if (method === "POST" && path === "/generate-batch") return await handleGenerateBatch(request, env);
    if (method === "GET" && (path === "/result" || path.startsWith("/result/"))) return await handleResult(request, env, path);
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[karma-destiny-ai]", clean(error?.code || error?.message || error, 500));
    logKarmaAi("LLM Error", safeLogPayload({ route: "/api/karma-destiny-ai", env, error }), "error");
    // 풀 초기화 버스트/인증 조회 중 일시 DB 장애는 재시도 신호와 함께 503으로 — 하드 500 방지(전 AI 라우트 정본).
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) {
      return json({
        ok: false,
        retryable: true,
        reason: "DB_DEGRADED",
        message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }
    return serverError();
  }
}

export const __karmaDestinyAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeConsultationInput,
  resolveStartAccess,
  buildFirstPrompt,
  buildSystemPrompt,
  cleanForbiddenResult,
  parseKarmaConsultationSections,
  validateInitialConsultationQuality,
  validatePremiumReportQuality,
  formatChaptersAsConsultationText,
  PREMIUM_CHAPTERS,
  LENS_USAGE_WEIGHTS,
  REPORT_SCHEMA_VERSION,
  FINAL_LETTER_CHAPTER_ID,
  KEY_SENTENCES_CHAPTER_ID,
  SYNTHESIS_CHAPTER_ID,
  ENERGY_DOMAIN_LABELS,
  buildLensDigest,
  buildChapterPrompt,
  buildChapterEvidence,
  detectLensRoleViolation,
  detectCrossChapterConclusionOverlap,
  buildKarmaDestinyAiMockConsultation,
};
