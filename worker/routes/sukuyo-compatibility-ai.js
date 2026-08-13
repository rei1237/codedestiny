import { Lunar, Solar } from "lunar-javascript";
import { requireAuth, isAuthDbInfraError, peekAccessTokenUserId } from "../lib/auth.js";
import { connectDb, isTransientMongoError, withMongoRetry } from "../lib/db.js";
import { clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { MonthlyCreditLedger, PaidExecutionRecord, Payment, PointHistory, SukuyoCompatibilityAiConsultation, User } from "../lib/models.js";
import { restoreMonthlyCreditLot } from "../lib/monthly-credit-store.js";
import { buildSukuyoAiCompatibility, buildSukuyoFromLunar, describeSukuyoDirectionalRelation } from "../lib/sukuyo-ai-calculation.js";
import { callGeminiText } from "../lib/gemini.js";
import { cmsPromptText } from "../lib/cms-prompts.js";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { extractReadableTextFromJsonLike } from "../../lib/llm-text.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { canStripForbiddenText } from "../lib/llm-leak-guard.js";
import { basisGroup, basisItem, basisStage, buildAnalysisBasisPayload } from "../lib/analysis-basis-contract.js";
import { RELATIONSHIP_ANALYSIS_DOMAINS, buildDomainAnalysisRuleLines, buildEvidenceRuleLines } from "../lib/fortune-reasoning-contract.js";

const FEATURE_KEY = "sukuyo-compatibility-ai";
const TITLE = "숙요점 전문가 상담";
const COMPATIBILITY_TITLE = "숙요점 궁합 전문가 상담";
const AMOUNT_KRW = 30000;
const COIN_PRICE = 300;
const TOKEN_TTL_MS = 20 * 60 * 1000;
const startLocks = new Map();

const CONSULTATION_TYPES = new Set(["personal", "compatibility"]);
const RELATIONSHIP_TYPES = new Set(["개인 상담", "연인", "썸", "부부", "재회", "짝사랑", "비즈니스 파트너", "친구", "가족"]);
const TOPICS = new Set([
  "전체 궁합",
  "연애 궁합",
  "결혼 가능성",
  "재회 가능성",
  "갈등 원인",
  "속궁합/정서적 친밀감",
  "장기 관계 가능성",
  "상대의 마음",
  "관계 유지 전략",
]);
const FORBIDDEN_RESULT_PATTERNS = [/PDF/gi, /챕터/g, /chapter/gi, /progress/gi, /job/gi, /프롬프트/g, /시스템/g];
const SUKUYO_STABLE_GROUP_HANJA = new Set(["角", "亢", "氐", "房", "心", "尾", "箕"]);
const SUKUYO_RISK_GROUP_HANJA = new Set(["奎", "婁", "胃", "昴", "畢", "觜", "參"]);
const SUKUYO_FIVE_ELEMENTS = new Set(["목", "화", "토", "금", "수"]);
const SUKUYO_ELEMENT_CREATE = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const SUKUYO_ELEMENT_CONTROL = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };
// 읽는 순서 = 이 배열의 순서다(sections 객체의 키 삽입 순서가 곧 화면의 장 순서).
// 키는 저장된 과거 상담·프론트 SECTION_ICONS·PDF 렌더가 물고 있으므로 기존 14개 키를 바꾸지 않는다.
const SUKUYO_SECTION_SPECS = [
  { key: "overview", title: "☯ 總論 — 종합 궁합 총평", minChars: 1300, guide: "종합 스코어 한 문장 요약 뒤 운명인연도, 기질조화도, 감정공명도, 성장시너지, 장기안정도를 각각 원국 요소와 연결해 풀이. 좋은 점만 쓰지 말고 이 관계가 실제로 취약한 지점도 같은 무게로 밝힌다" },
  { key: "twoStars", title: "☽ 兩星 — 두 별의 본질", minChars: 1400, guide: "각 본명숙이 그 사람의 타고난 성향·감정 처리 방식·인간관계 태도·사고방식·사랑하는 방식을 어떻게 만드는지 다섯 갈래로 나눠 서술하고, 오행·음양·수호신이 실제 생활 장면에서 드러나는 모습을 각각 붙인다" },
  { key: "evidence_basis", title: "◆ 根據 — 해석 근거와 영향 요인", minChars: 1000, guide: "먼저 근거 4~6개를 '판단 한 줄' + '괄호 안에 그 판단이 나온 계산 확정값' 형태로 제시하고, 이어서 '힘을 실어 주는 요소'와 '주의가 필요한 요소'를 각각 2~3개씩 무엇이 / 왜 / 어떤 영향을 주는지 순서로 정리한다" },
  { key: "attraction", title: "✦ 引力 — 끌림의 구조", minChars: 1300, guide: "두 사람이 서로에게 끌리는 이유를 외모·인상, 감정, 가치관, 대화, 에너지, 카르마 여섯 요소로 나눠 각각 어느 쪽이 더 강하게 작동하는지 밝힌다. 처음 만났을 때의 구체적 시나리오 1개와 지금 관계에서 끌림을 재확인하는 시나리오 1개를 포함한다" },
  { key: "emotionalDirection", title: "⇄ 情向 — 감정의 방향성", minChars: 1200, guide: "누가 감정을 더 많이 표현하는지, 누가 기다리는지, 누가 주도권을 잡는지, 누가 더 쉽게 상처받는지, 누가 관계를 더 오래 붙잡는지를 다섯 항목으로 나눠 두 사람 중 한쪽을 이름으로 반드시 지목하고 그 판단의 계산 근거를 붙인다. 애매하게 '서로 비슷하다'로 얼버무리지 않는다" },
  { key: "communication", title: "🗣 疏通 — 대화법과 관계 유지 전략", minChars: 1400, guide: "대화법, 갈등 해결, 감정 표현, 거리 조절, 신뢰 형성 다섯 축으로 나눠 각 축마다 두 사람 각자에게 효과적인 방식을 대조하고 실제 대사 예시를 붙인다. 마지막에 오늘부터 해볼 수 있는 행동 5가지를 번호로 정리하되, 언제 무엇을 하는지가 드러나게 쓴다" },
  { key: "energyFlow", title: "⟳ 流轉 — 관계 에너지의 단계", minChars: 1400, guide: "처음 만났을 때 / 가까워질 때 / 연애가 안정될 때 / 권태기 / 갈등이 터질 때 / 화해할 때 / 장기 관계 일곱 단계를 각각 서술하고, 그 단계에서 두 사람의 에너지가 어떻게 움직이는지와 그 단계 특유의 신호를 밝힌다. 끝에 지금 이 계절 기준으로 앞으로 3~6개월 사이 주의할 시기와 좋은 시기를 덧붙인다" },
  { key: "conflict", title: "〜 波紋 — 갈등의 파문과 위기", minChars: 1400, guide: "가장 자주 반복될 갈등 3가지를 각각 '어떤 상황에서 터지는가 → 근본 원인 → 그때 두 사람 각자의 심리 → 실제 해결법과 대사 예시' 네 단계 고정 순서로 제시하고, 이어서 권태기·장거리·가치관 충돌 중 이 조합이 가장 취약한 위기 국면 1개와 단계별 행동 지침을 붙인다" },
  { key: "caution", title: "⚠ 禁忌 — 반드시 조심해야 할 패턴", minChars: 1100, guide: "이 조합에서 반복될 가능성이 높은 오해와 갈등 패턴 4가지를 숙요점 근거와 함께 밝히고, 각각에 예방 방법과 대안 행동을 붙인다" },
  { key: "karma", title: "☸ 宿業 — 카르마 분석", minChars: 1400, guide: "숙요점 관점에서 이 두 사람이 왜 만났는지, 이번 생에서 서로를 통해 배우는 것이 무엇인지, 이 관계의 목적이 무엇인지, 인연 자체의 의미가 무엇인지를 네 갈래로 나눠 해석한다. 관계 유형(명·업태·영친·우쇠·안괴·성위)과 순행·역행 거리를 반드시 논거로 인용하고, 전생 서사를 사실처럼 단정하지 말고 상징으로 읽는다" },
  { key: "mutualGrowth", title: "🌙 相長 — 서로를 성장시키는 방식", minChars: 1100, guide: "이 관계가 각자의 성격과 삶에 가져오는 긍정적 변화를 두 방향(A가 B에게 / B가 A에게)으로 나눠 서술하고, 그 성장이 실제로 일어나려면 무엇이 필요한지 조건까지 밝힌다. 끝에 두 사람만의 강점을 살릴 활동 2~3가지를 덧붙인다" },
  { key: "radiantMoment", title: "✨ 光時 — 가장 빛나는 순간", minChars: 1000, guide: "두 사람의 관계가 가장 자연스럽고 행복하게 흘러가는 상황을 구체적인 장면 3개로 묘사한다. 계절·장소·대화·행동이 보이게 쓰고, 왜 그 상황에서 두 사람의 숙이 잘 맞는지 근거를 붙인다" },
  { key: "domains", title: "💞 領域 — 관계 영역별 궁합", minChars: 1500, guide: "결혼 → 동거 → 사업·비즈니스 → 친구 → 직장 동료 다섯 영역을 모두 다루고, 각 영역을 현재 흐름 → 해석 근거 → 추천 행동 세 조각으로 풀이. 영역마다 서로 다른 계산 확정값을 근거로 들고, 적합도가 낮은 영역은 낮다고 분명히 말한다" },
  { key: "outlook", title: "🔭 展望 — 시간에 따른 변화", minChars: 1200, guide: "만난 직후 / 1년 후 / 3년 후 / 5년 이후 네 구간으로 나눠 관계가 어떻게 변하는지 서술하고, 각 구간마다 성장했을 때와 갈등이 누적됐을 때 두 갈래 시나리오를 함께 제시" },
  { key: "closingLetter", title: "💌 一言 — 달빛이 전하는 한마디", minChars: 700, guide: "앞의 모든 해석을 종합해 두 사람에게 건네는 짧은 편지 한 편을 감성적인 문체로 쓴다. 번호 목록·체크리스트를 쓰지 않고 이어지는 문장으로만 쓰며, 마지막 문장은 반드시 두 사람의 이름을 모두 불러 마무리한다" },
];
const SUKUYO_SECTION_SPEC_MAP = new Map(SUKUYO_SECTION_SPECS.map((spec) => [spec.key, spec]));
const SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS = SUKUYO_SECTION_SPECS.reduce((total, section) => total + section.minChars, 0);
const SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS = 26000;

/**
 * 섹션 그룹 = LLM 호출 1회. 다섯 그룹을 한 요청 안에서 병렬로 부르고 하나의 JSON 으로 병합한다.
 *
 * 왜 병렬인가: 이 라우트는 동기 생성이라 LLM 대기가 85초(clampSyncLlmTimeoutMs)로 잘리는데,
 * 목표 분량 18,400자를 단일 호출로 뽑으려면 그 두세 배가 든다. 시간 예산이 토큰 예산보다 먼저
 * 바닥나 매번 잘리거나 Workers AI 폴백으로 넘어가고, degrade 경로가 그 짧은 결과를
 * ₩30,000 정상 결제로 배달한다. 그룹당 3,400~3,900자면 40초 안에 완주한다.
 * 전체 벽시계는 가장 느린 그룹 기준이라 예산 안에 들어온다.
 *
 * 정본 패턴: ziwei-ai.js generateInitialConsultation / life-book-ai.js SECTION_CONCURRENCY.
 */
const SUKUYO_SECTION_GROUPS = [
  { id: "essence", keys: ["overview", "twoStars", "evidence_basis"] },
  { id: "attraction", keys: ["attraction", "emotionalDirection", "communication"] },
  { id: "flow", keys: ["energyFlow", "conflict", "caution"] },
  { id: "karma", keys: ["karma", "mutualGrowth", "radiantMoment"] },
  { id: "outlook", keys: ["domains", "outlook", "closingLetter"] },
];
// 그룹 1회가 엣지 100초 컷 안쪽에서 끝나야 한다. clamp 를 통과시키되(60s < 85s 상한),
// 나중에 이 값을 올릴 때 자동으로 깎이도록 감싸 둔다.
const SUKUYO_SECTION_TIMEOUT_MS = clampSyncLlmTimeoutMs(60000);
// 한 장의 본문 상한. 토큰 예산(capTokens)은 그룹 합계 + 완충을 담을 수 있어야 한다(worker/lib/llm-budget.js).
const SUKUYO_SECTION_BODY_MAX_CHARS = 6000;
const SUKUYO_SECTION_BASE_TOKENS = 8000;
const SUKUYO_SECTION_CAP_TOKENS = 12000;

const MESSAGES = {
  login: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  paymentRequired: "숙요점 궁합 전문가 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  paymentVerifyFailed: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  invalidInput: "상담에 필요한 정보가 부족해요. 생년월일과 상담 질문을 다시 확인해 주세요.",
  calculationFailed: "숙요점 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  serverFailed: "상담 준비 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  llmFailed: "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동 복구됩니다.",
  networkFailed: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
};

/** 관리자 CMS 기본값 노출용(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return SYSTEM_PROMPT;
}

export function getDefaultCompatibilityJsonSystemPrompt() {
  return COMPATIBILITY_JSON_SYSTEM_PROMPT;
}

/* 관리자 프롬프트 랩 전용(lib/admin/prompt-lab-registry.mjs 참고).
   사용자 프롬프트는 계산된 본명숙·관계 거리 결과를 입력으로 받으므로 생년 정보만으로는 조립되지 않는다.
   상담용/구조화 출력용 두 벌이 따로 있어 variants 로 고르게 한다. */
export function buildAdminLabPrompt(body = {}, options = {}) {
  const variants = [
    { key: "consult", label: "상담용" },
    { key: "json", label: "구조화 출력용(JSON)" },
  ];
  const variant = variants.find((item) => item.key === options.variant) || variants[0];

  return {
    systemPrompt: variant.key === "json" ? COMPATIBILITY_JSON_SYSTEM_PROMPT : SYSTEM_PROMPT,
    prompt: "",
    partial: true,
    partialReason: "사용자 프롬프트는 계산된 본명숙과 두 사람의 관계 거리를 입력으로 받습니다. 시스템 프롬프트만 표시합니다.",
    variantKey: variant.key,
    variants,
  };
}

const SYSTEM_PROMPT = [
  "당신은 숙요점 27숙과 관계 상담에 능한 전문 상담가입니다.",
  "",
  "사용자의 생년월일을 바탕으로 본명숙을 해석하고, 궁합 상담인 경우 상대방의 숙과 관계 거리도 함께 분석합니다.",
  "",
  "반드시 지켜야 할 원칙:",
  "1. 실제 상담사가 말하듯 전문적이고 따뜻하게 답변합니다.",
  "2. 숙요점의 27숙, 관계 유형, 거리 개념을 정확하게 반영합니다.",
  "3. 명, 업태, 영친, 우쇠, 안괴, 성위 관계를 단순한 길흉으로만 말하지 말고 관계 심리로 풀어냅니다.",
  "4. 불안감을 자극하거나 결론을 과장하지 않습니다.",
  "5. 상대방의 마음을 확정적으로 단정하지 않습니다.",
  "6. 운세를 절대적 예언처럼 말하지 않습니다.",
  "7. 사용자가 실제로 오늘 할 수 있는 행동 처방을 제시합니다.",
  "8. 같은 문장을 반복하지 않습니다.",
  "9. AI, 프롬프트, 시스템, PDF, 챕터 같은 표현을 결과에 노출하지 않습니다.",
  "10. 사용자의 현재 질문을 가장 깊게 다룹니다.",
  "11. 마지막 질문 유도 문구 없이, 지금 필요한 관계 처방으로 마무리합니다.",
].join("\n");

const COMPATIBILITY_JSON_SYSTEM_PROMPT = [
  "당신은 20년 경력의 숙요점(宿曜占) 전문 역술가이자, 관계 상담에 능한 카운슬러입니다.",
  "인도에서 기원하여 당나라를 거쳐 한국에 전해진 27숙 체계로 두 사람의 궁합을 정밀하게 독해합니다.",
  "서버가 제공한 본명숙, 숙 그룹, 음양, 오행, 수호신, 관계 거리, 양방향 관계 유형, 점수는 확정값입니다.",
  "확정값을 바꾸거나 새로 계산하지 말고, 주어진 JSON 뼈대의 meta 값은 그대로 유지합니다.",
  "결과는 한국어 JSON 객체 하나만 반환합니다.",
  "요청받은 항목의 지정된 최소 글자수를 넘기되, 분량을 늘리려고 같은 내용을 다시 쓰지 않습니다. 채울 것이 없으면 늘리지 말고 밀도를 높입니다.",
  "각 문단은 150자 이상으로 쓰고, 문단마다 새로운 관점을 엽니다. 이미 한 말을 바꿔 쓰는 방식으로 분량을 채우지 않습니다.",
  "장점만 나열하지 않습니다. 모든 해석에 장점 / 단점 / 주의점 / 가능성이 함께 드러나야 하며, 취약한 지점은 취약하다고 분명히 말합니다.",
  "다른 장에서 이미 쓴 비유·첫 문장 구조·소제목을 재사용하지 않습니다. 이 장에서만 볼 수 있는 관점 하나를 반드시 제시합니다.",
  "🔴 이 조합에만 해당하는 글을 씁니다. 두 사람의 본명숙·관계 유형·거리를 다른 값으로 바꿔도 그대로 성립하는 문장은 쓰지 않습니다.",
  "일반적인 연애 상담으로 대체 가능한 조언(대화를 많이 하세요, 서로 존중하세요 같은 문장)을 금지합니다. 조언에는 언제·어떤 상황에서·무엇을 하라는지가 들어갑니다.",
  "마크다운 코드블록, JSON 밖 설명 문구, 후속 질문 유도 문구를 절대 넣지 않습니다.",
  "sections.*.body에 사용할 수 있는 마크업은 **굵게**, 번호 목록(1. ), 하이픈 목록(- ), 인용(> ) 네 가지뿐입니다. 표, 제목 기호(#), 코드블록, 링크, HTML 태그는 절대 쓰지 않습니다. 문단 사이는 반드시 빈 줄로 구분합니다.",
  "모든 body에는 구체적 상황 묘사, 실제 대화체 예시, 체크리스트 또는 번호 행동 지침, 시기별 전망 중 최소 2가지 이상을 포함합니다.",
  "각 body는 그 섹션 주제와 직접 관련된 계산 근거(관계 유형의 정의, 방향별 거리, 오행 상생·상극, 숙 그룹, 음양 조합 중 해당되는 것)를 최소 1회 명시적으로 인용해 논거로 삼습니다. 근거 없는 단정 문장을 쓰지 않습니다.",
  "'두 분은 특별한 인연입니다', '운명이 두 사람을 이끌었습니다'처럼 계산 근거 없이 치켜세우는 보일러플레이트 문장을 금지합니다. 감탄과 위로는 반드시 27숙 상성 근거 뒤에만 붙입니다.",
  "전체 서사는 '운명적 끌림'과 '현실적 조율' 두 축으로 짭니다. 끌림을 말할 때는 관계 유형·거리·상생의 근거를, 조율을 말할 때는 상극·그룹 차이·음양 조합의 과제를 짝지어 말합니다.",
  "숙 이름은 첫 언급 시 한글과 한자를 병기합니다.",
  "같은 비유와 같은 첫 문장 구조를 반복하지 않으며, '돌봄과 치유', '변화와 개혁' 같은 추상 표현으로 분량을 채우지 않습니다.",
  "상대방의 마음, 재회, 이별, 결혼을 확정하지 않고 건강한 선택과 경계를 존중합니다.",
  "의학적, 법적, 재정적 조언처럼 들리지 않게 하고 '~할 가능성이 높습니다', '~하는 경향이 있습니다'처럼 확률적 어조를 씁니다.",
  "AI, 프롬프트, 시스템, PDF, 리포트 렌더링 같은 표현은 결과에 노출하지 않습니다.",
].join("\n");

function clean(value, max = 0) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return max > 0 ? text.slice(0, max) : text;
}

function cleanRichText(value, max = 0) {
  const text = String(value == null ? "" : value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  return max > 0 ? text.slice(0, max) : text;
}

function normalizeId(value) {
  return clean(value, 180).replace(/[^a-zA-Z0-9._:-]/g, "-");
}

function isDevEnv(env = {}) {
  return ["development", "dev", "local", "test"].includes(clean(env.NODE_ENV || env.ENVIRONMENT || env.APP_ENV).toLowerCase());
}

function maskBirthDate(value) {
  const text = clean(value, 10);
  return text ? `${text.slice(0, 4)}-**-**` : "";
}

function maskName(value) {
  const text = clean(value, 80);
  if (!text) return "";
  if (text.length <= 1) return "*";
  return `${text.slice(0, 1)}${"*".repeat(Math.min(3, text.length - 1))}`;
}

function maskedPerson(person = {}) {
  return {
    name: maskName(person.name),
    gender: clean(person.gender, 20),
    birthDate: maskBirthDate(person.birthDate),
    calendarType: clean(person.calendarType, 20),
  };
}

function logSukyoAi(marker, details = {}, error = null, env = {}) {
  const payload = {
    route: clean(details.route || "/api/sukuyo-compatibility-ai", 120),
    requestId: clean(details.requestId, 180),
    consultationType: clean(details.consultationType || "compatibility", 40),
    validation: details.validation,
    providerReason: clean(details.providerReason, 120),
    accessGranted: typeof details.accessGranted === "boolean" ? details.accessGranted : undefined,
    accessType: clean(details.accessType, 40),
    personA: details.personA ? maskedPerson(details.personA) : undefined,
    personB: details.personB ? maskedPerson(details.personB) : undefined,
    errorMessage: error ? clean(error?.message || error, 500) : clean(details.errorMessage, 500),
  };
  if (error && isDevEnv(env)) payload.stack = clean(error?.stack, 2000);
  const writer = error ? console.error : console.info;
  writer(marker, payload);
}

function normalizeGender(value) {
  const token = clean(value).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(token)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(token)) return "female";
  if (["other", "기타", "비공개", "unknown"].includes(token)) return "unknown";
  return token ? clean(value, 40) : "";
}

function normalizeCalendarType(value) {
  const token = clean(value).toLowerCase();
  if (token.includes("lunar") || token.includes("음력")) return "lunar";
  return "solar";
}

function parseBirthDate(value) {
  const raw = clean(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || year > 2100) return null;
  return { year, month, day, raw };
}

function normalizeBirthTime(value) {
  const raw = clean(value);
  if (!raw) return "";
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(raw) ? raw : "";
}

function normalizePerson(value = {}, fallbackName) {
  const source = value && typeof value === "object" ? value : {};
  const rawCalendarType = clean(source.calendarType);
  const birthDate = parseBirthDate(source.birthDate);
  return {
    name: clean(source.name || source.nickname || fallbackName, 80),
    gender: normalizeGender(source.gender),
    birthDate: birthDate?.raw || "",
    birthParts: birthDate,
    birthTime: normalizeBirthTime(source.birthTime),
    calendarType: normalizeCalendarType(rawCalendarType),
    hasCalendarType: Boolean(rawCalendarType),
    isLeapMonth: source.isLeapMonth === true || clean(source.calendarType).toLowerCase().includes("leap") || clean(source.calendarType).includes("윤달"),
  };
}

function normalizeConsultationType(value) {
  const token = clean(value).toLowerCase();
  return CONSULTATION_TYPES.has(token) ? token : "compatibility";
}

function normalizeInput(body = {}) {
  const consultationType = normalizeConsultationType(body.consultationType || body.type);
  const flatPersonA = {
    name: body.userName || body.name || body.nickname,
    gender: body.gender,
    birthDate: body.birthDate,
    birthTime: body.birthTime,
    calendarType: body.calendarType,
    isLeapMonth: body.isLeapMonth,
  };
  const flatPersonB = {
    name: body.partnerName,
    gender: body.partnerGender,
    birthDate: body.partnerBirthDate,
    birthTime: body.partnerBirthTime,
    calendarType: body.partnerCalendarType,
    isLeapMonth: body.partnerIsLeapMonth,
  };
  const personA = normalizePerson(body.personA || body.self || body.user || flatPersonA, "나");
  const personB = normalizePerson(body.personB || body.partner || flatPersonB, "상대");
  const relationshipType = consultationType === "personal"
    ? "개인 상담"
    : clean(body.relationshipType || body.relationType || body.category, 80);
  const topic = clean(body.topic || body.consultationTopic || body.questionTopic || "숙요점 상담", 80);
  const question = clean(body.question || body.message || body.consultationQuestion || "", 1200);
  const errors = [];
  if (!CONSULTATION_TYPES.has(consultationType)) errors.push("consultationType");
  if (!personA.birthParts) errors.push("personA.birthDate");
  if (!personA.gender) errors.push("personA.gender");
  if (!personA.hasCalendarType) errors.push("personA.calendarType");
  if (consultationType === "compatibility") {
    if (!personB.birthParts) errors.push("personB.birthDate");
    if (!personB.gender) errors.push("personB.gender");
    if (!personB.hasCalendarType) errors.push("personB.calendarType");
  }
  if (!RELATIONSHIP_TYPES.has(relationshipType)) errors.push("relationshipType");
  if (!TOPICS.has(topic)) errors.push("topic");
  if (question.length < 2) errors.push("question");
  return { ok: errors.length === 0, errors, consultationType, personA, personB, relationshipType, topic, question };
}

function lunarForPerson(person) {
  const { year, month, day } = person.birthParts || {};
  if (!year || !month || !day) throw Object.assign(new Error("INVALID_BIRTH_DATE"), { code: "INVALID_INPUT" });
  if (person.calendarType === "lunar") {
    const lunarMonth = person.isLeapMonth ? -Math.abs(month) : Math.abs(month);
    Lunar.fromYmd(year, lunarMonth, day);
    return { lunarYear: year, lunarMonth: month, lunarDay: day, isLeapMonth: person.isLeapMonth, source: "user-lunar-input" };
  }
  const [hour, minute] = person.birthTime ? person.birthTime.split(":").map(Number) : [12, 0];
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const lunarMonth = Number(lunar.getMonth());
  return {
    lunarYear: Number(lunar.getYear()),
    lunarMonth: Math.abs(lunarMonth),
    lunarDay: Number(lunar.getDay()),
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  };
}

function calculatePersonSukuyo(person, label) {
  try {
    const lunar = lunarForPerson(person);
    const sukuyo = buildSukuyoFromLunar(lunar.lunarMonth, lunar.lunarDay, {
      isLeapMonth: lunar.isLeapMonth,
      source: lunar.source,
    });
    if (!sukuyo) throw new Error("SUKUYO_EMPTY");
    return { ...sukuyo, lunarYear: lunar.lunarYear };
  } catch (error) {
    console.warn("[sukuyo-compatibility-ai] calculation failed", {
      label,
      birthDate: person.birthDate,
      calendarType: person.calendarType,
      isLeapMonth: person.isLeapMonth,
      error: clean(error?.message || error),
    });
    throw Object.assign(new Error(MESSAGES.calculationFailed), { code: "CALCULATION_FAILED", status: 422 });
  }
}

function normalizeDistance(compatibility = {}) {
  const label = clean(compatibility.distanceLabel || compatibility.distanceMetrics?.distanceLabel);
  const tier = clean(compatibility.distanceMetrics?.tier).toLowerCase();
  if (tier === "near" || label.includes("근")) return "near";
  if (tier === "middle" || label.includes("중")) return "middle";
  if (tier === "far" || label.includes("원")) return "far";
  return "";
}

function shukuName(sukuyo = {}) {
  const name = clean(sukuyo.nameKo || sukuyo.name || "");
  return name ? `${name}숙` : "";
}

function sukuyoHanjaName(sukuyo = {}) {
  const han = clean(sukuyo.nameHan || sukuyo.hanja || "");
  return han ? `${han}宿` : "";
}

function normalizeSukuyoFiveElement(value) {
  const element = clean(value);
  if (SUKUYO_FIVE_ELEMENTS.has(element)) return element;
  if (element === "일") return "화";
  if (element === "월") return "수";
  return "토";
}

function sukuyoGroup(sukuyo = {}) {
  const han = clean(sukuyo.nameHan || sukuyo.hanja || "");
  if (SUKUYO_STABLE_GROUP_HANJA.has(han)) return "안숙";
  if (SUKUYO_RISK_GROUP_HANJA.has(han)) return "위험숙";
  return "성숙";
}

function sukuyoGuardian(sukuyo = {}) {
  const direction = clean(sukuyo.direction);
  if (direction.includes("동")) return "청룡";
  if (direction.includes("남")) return "주작";
  if (direction.includes("서")) return "백호";
  if (direction.includes("북")) return "현무";
  const index = Number(sukuyo.index);
  if (Number.isFinite(index)) {
    if (index <= 6) return "청룡";
    if (index <= 13) return "현무";
    if (index <= 20) return "백호";
    return "주작";
  }
  return "청룡";
}

function sukuyoYinYang(sukuyo = {}) {
  const index = Number(sukuyo.index);
  return Number.isFinite(index) && index % 2 === 0 ? "양" : "음";
}

function sukuyoKeyword(sukuyo = {}) {
  const words = []
    .concat(Array.isArray(sukuyo.keywords) ? sukuyo.keywords : [])
    .concat(Array.isArray(sukuyo.strengths) ? sukuyo.strengths : [])
    .map((item) => clean(item, 20))
    .filter(Boolean);
  return words.slice(0, 3).join("·") || "직관·조율·성장";
}

function sukuyoDegreeStrength(sukuyo = {}) {
  const index = Number(sukuyo.index);
  if (!Number.isFinite(index)) return 12;
  return 8 + ((Math.abs(index) * 7 + 3) % 12);
}

function currentKstSeason(date = new Date()) {
  const month = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "numeric" }).format(date));
  if ([3, 4, 5].includes(month)) return "봄";
  if ([6, 7, 8].includes(month)) return "여름";
  if ([9, 10, 11].includes(month)) return "가을";
  return "겨울";
}

function seasonElement(season) {
  if (season === "봄") return "목";
  if (season === "여름") return "화";
  if (season === "가을") return "금";
  if (season === "겨울") return "수";
  return "토";
}

function seasonalStrength(element, season) {
  const ruling = seasonElement(season);
  if (element === ruling) return "왕";
  if (SUKUYO_ELEMENT_CREATE[element] === ruling || SUKUYO_ELEMENT_CREATE[ruling] === element) return "상";
  return "평";
}

// 방향별 관계는 정본 링 매핑(sukuyo-ai-calculation.js)에서만 파생한다.
// (옛 12항 근사표 + min(,11) 클램프는 한쪽 방향을 늘 "비(非)"로 고정하고 정본과 어긋나던 버그였음)
function buildCompatibilityRelationMeta(compatibility = {}) {
  const forwardDistance = Number(compatibility.forwardDistance);
  const reverseDistance = Number(compatibility.reverseDistance);
  const shortestDistance = Number(compatibility.shortestDistance ?? compatibility.distanceMetrics?.shortestDistance);
  const directional = describeSukuyoDirectionalRelation(
    Number.isFinite(forwardDistance) ? forwardDistance : 0,
    Number.isFinite(reverseDistance) ? reverseDistance : 0,
  ) || {
    aRoleLabel: "확인된 자리",
    aRoleMeaning: "확인된 방향의 결",
    bRoleLabel: "확인된 자리",
    bRoleMeaning: "확인된 방향의 결",
    forwardDistance: 0,
    reverseDistance: 0,
    directionalDistanceGuide: "두 사람의 거리 계산이 열리는 대로 다가감과 회복의 간격을 함께 살핍니다.",
  };
  const distance = Number.isFinite(shortestDistance)
    ? Math.min(Math.max(0, Math.floor(shortestDistance)), 13)
    : Math.min(directional.forwardDistance, directional.reverseDistance);
  const traditional = clean(compatibility.relationType || "");
  const intensity = distance <= 3 || ["안괴", "업태"].includes(traditional)
    ? "강렬"
    : distance >= 9
      ? "잔잔"
      : "보통";
  return {
    type_a_to_b: directional.aRoleLabel,
    type_b_to_a: directional.bRoleLabel,
    distance,
    intensity,
    directional_meaning: {
      a_to_b: directional.aRoleMeaning,
      b_to_a: directional.bRoleMeaning,
    },
    directional_distance_guide: directional.directionalDistanceGuide,
    traditional_relation: traditional,
    traditional_relation_hanja: clean(compatibility.relationTypeHan || ""),
  };
}

function elementRelation(aElement, bElement) {
  if (aElement === bElement) return "동류";
  if (SUKUYO_ELEMENT_CREATE[aElement] === bElement || SUKUYO_ELEMENT_CREATE[bElement] === aElement) return "상생";
  if (SUKUYO_ELEMENT_CONTROL[aElement] === bElement || SUKUYO_ELEMENT_CONTROL[bElement] === aElement) return "상극";
  return "보완";
}

function clampSukuyoAreaScore(value) {
  return Math.max(12, Math.min(18, Math.round(Number(value) || 15)));
}

function normalizeSukuyoScoreTotal(scores) {
  const keys = ["destiny", "harmony", "emotion", "growth", "stability"];
  const normalized = {};
  keys.forEach((key) => {
    normalized[key] = clampSukuyoAreaScore(scores[key]);
  });
  let total = keys.reduce((sum, key) => sum + normalized[key], 0);
  while (total > 80) {
    const key = keys.find((name) => normalized[name] > 14);
    if (!key) break;
    normalized[key] -= 1;
    total -= 1;
  }
  while (total < 70) {
    const key = keys.find((name) => normalized[name] < 16);
    if (!key) break;
    normalized[key] += 1;
    total += 1;
  }
  normalized.total = total;
  return normalized;
}

function buildSukuyoScoreMeta(personA, personB, relation, compatibility = {}) {
  const harmonyType = elementRelation(personA.element, personB.element);
  const distance = Number(relation.distance) || 0;
  const chemistryScore = Number(compatibility.chemistryScore || 75);
  const stabilityScore = Number(compatibility.stabilityScore || 74);
  const relationBoost = relation.intensity === "강렬" ? 1 : relation.intensity === "잔잔" ? -1 : 0;
  return normalizeSukuyoScoreTotal({
    destiny: 15 + relationBoost + (distance === 0 ? 2 : distance <= 4 ? 1 : 0),
    harmony: 15 + (harmonyType === "상생" ? 2 : harmonyType === "동류" ? 1 : harmonyType === "상극" ? -2 : 0),
    emotion: 15 + (personA.yin_yang !== personB.yin_yang ? 1 : 0) + (personA.guardian === personB.guardian ? 1 : 0) - (distance >= 9 ? 1 : 0),
    growth: 15 + (["안괴", "업태"].includes(relation.traditional_relation) ? 2 : 0) + (chemistryScore >= 82 ? 1 : 0),
    stability: 15 + (stabilityScore >= 82 ? 2 : stabilityScore <= 66 ? -2 : 0) - (relation.intensity === "강렬" ? 1 : 0),
  });
}

/**
 * 화면의 별점 8축. score 는 0~100 이고, 프론트가 Math.max(1, Math.round(score/20)) 로 별 1~5개를 만든다.
 *
 * polarity: "inverse" 는 "높을수록 나쁨"이다(갈등 위험도 하나뿐). 총점 평균에서는 반전해 넣고,
 * 화면에서는 caution 톤과 "낮을수록 좋아요" 캡션을 반드시 함께 보여준다 —
 * 그러지 않으면 별 다섯 개가 좋은 뜻으로 읽힌다.
 */
const SUKUYO_AXIS_SPECS = [
  { key: "emotionBond", label: "감정 궁합", polarity: "positive" },
  { key: "trust", label: "신뢰", polarity: "positive" },
  { key: "dialogue", label: "대화", polarity: "positive" },
  { key: "longevity", label: "장기 지속성", polarity: "positive" },
  { key: "marriage", label: "결혼 적합도", polarity: "positive" },
  { key: "conflictRisk", label: "갈등 위험도", polarity: "inverse" },
  { key: "growth", label: "상호 성장", polarity: "positive" },
  { key: "karmaBond", label: "카르마 연결", polarity: "positive" },
];

function clampAxisScore(value) {
  return Math.max(10, Math.min(98, Math.round(Number(value) || 50)));
}

/**
 * 8축 점수는 전부 이미 확정된 계산값에서만 유도한다(LLM 이 만들지 않는다).
 *
 * 기존 5축(buildSukuyoScoreMeta)의 총점은 70~80 으로 강제 클램프돼 있어 어떤 조합이든 사실상
 * 같은 점수가 나왔다. 별점으로 보여 주려면 실제 편차가 필요하므로 여기서는 클램프를 두지 않고
 * 축마다 자기 근거로 흩어지게 둔다. 총점만 45~97 로 자른다.
 */
function buildSukuyoRelationAxes(personA, personB, relation, compatibility = {}) {
  const harmonyType = elementRelation(personA.element, personB.element);
  const distance = Number(relation.distance) || 0;
  const traditional = clean(relation.traditional_relation || "");
  const chemistry = Number(compatibility.chemistryScore) || 74;
  const stability = Number(compatibility.stabilityScore) || 72;
  const friction = Number(compatibility.conflictScore) || 40;
  const intensity = clean(relation.intensity || "");

  const yinYangComplement = personA.yin_yang !== personB.yin_yang;
  const sameGuardian = Boolean(personA.guardian) && personA.guardian === personB.guardian;
  const bothStable = SUKUYO_STABLE_GROUP_HANJA.has(personA.sukuyo_hanja) && SUKUYO_STABLE_GROUP_HANJA.has(personB.sukuyo_hanja);
  const anyRisk = SUKUYO_RISK_GROUP_HANJA.has(personA.sukuyo_hanja) || SUKUYO_RISK_GROUP_HANJA.has(personB.sukuyo_hanja);
  const sameGroup = Boolean(personA.group) && personA.group === personB.group;
  const karmicType = ["안괴", "업태"].includes(traditional);
  const friendlyType = ["영친", "명"].includes(traditional);

  const harmonyBonus = harmonyType === "상생" ? 10 : harmonyType === "동류" ? 5 : harmonyType === "상극" ? -12 : 0;
  const nearBonus = distance === 0 ? 10 : distance <= 4 ? 6 : distance >= 9 ? -6 : 0;

  const raw = {
    emotionBond: chemistry + (yinYangComplement ? 6 : -2) + (sameGuardian ? 5 : 0) + nearBonus * 0.6,
    trust: stability + harmonyBonus + (bothStable ? 8 : 0) + (anyRisk ? -6 : 0) + (friendlyType ? 5 : 0),
    dialogue: 62 + harmonyBonus + (sameGroup ? 8 : 0) + (yinYangComplement ? 4 : 0) + (distance >= 9 ? -5 : 3),
    longevity: stability + (friendlyType ? 8 : 0) + (intensity === "잔잔" ? 5 : intensity === "강렬" ? -6 : 0) + (harmonyType === "상극" ? -8 : 0),
    marriage: (stability * 0.55) + (chemistry * 0.25) + 18 + (friendlyType ? 7 : 0) + (karmicType ? -5 : 0) + harmonyBonus * 0.5,
    conflictRisk: friction + (harmonyType === "상극" ? 14 : 0) + (karmicType ? 10 : 0) + (anyRisk ? 6 : 0) + (intensity === "강렬" ? 8 : intensity === "잔잔" ? -8 : 0) - (bothStable ? 8 : 0),
    growth: 58 + (karmicType ? 16 : 0) + (harmonyType === "상극" ? 9 : 0) + (chemistry >= 82 ? 6 : 0) + (sameGroup ? -5 : 4),
    karmaBond: 52 + (traditional === "명" ? 20 : 0) + (karmicType ? 18 : 0) + nearBonus + (intensity === "강렬" ? 8 : 0),
  };

  const axes = {};
  SUKUYO_AXIS_SPECS.forEach((spec) => {
    axes[spec.key] = { score: clampAxisScore(raw[spec.key]), label: spec.label, polarity: spec.polarity };
  });
  const effective = SUKUYO_AXIS_SPECS.map((spec) => (spec.polarity === "inverse" ? 100 - axes[spec.key].score : axes[spec.key].score));
  const total = Math.max(45, Math.min(97, Math.round(effective.reduce((sum, value) => sum + value, 0) / effective.length)));
  return { axes, total };
}

function buildSukuyoPromptPersonMeta(person = {}, sukuyo = {}) {
  const element = normalizeSukuyoFiveElement(sukuyo.element);
  return {
    name: clean(person.name || "나", 80),
    sukuyo: shukuName(sukuyo),
    sukuyo_hanja: sukuyoHanjaName(sukuyo),
    group: sukuyoGroup(sukuyo),
    element,
    yin_yang: sukuyoYinYang(sukuyo),
    guardian: sukuyoGuardian(sukuyo),
    keyword: sukuyoKeyword(sukuyo),
  };
}

// 서버가 계산한 두 본명숙과 방위 관계를 화면과 프롬프트가 함께 쓰는 근거 형태로 옮긴다.
function buildSukuyoAnalysisBasis(input, calculation) {
  const personA = buildSukuyoPromptPersonMeta(input.personA, calculation.personASukuyo);
  const personB = buildSukuyoPromptPersonMeta(input.personB, calculation.personBSukuyo);
  const relation = buildCompatibilityRelationMeta(calculation.compatibility);
  const compat = calculation.compatibility || {};
  const aElement = normalizeSukuyoFiveElement(calculation.personASukuyo?.element);
  const bElement = normalizeSukuyoFiveElement(calculation.personBSukuyo?.element);
  const harmony = elementRelation(aElement, bElement);

  const personItems = (person) => [
    basisItem("본명숙", `${person.sukuyo}${person.sukuyo_hanja ? `(${person.sukuyo_hanja})` : ""}`, { term: "본명숙" }),
    basisItem("오행·음양", `${person.element} · ${person.yin_yang}`, { term: "오행" }),
    person.guardian ? basisItem("수호신", person.guardian, { term: "수호신" }) : null,
    person.keyword ? basisItem("결", person.keyword) : null,
  ];

  return buildAnalysisBasisPayload({
    featureKey: FEATURE_KEY,
    groups: [
      basisGroup("personA", `${personA.name}의 별`, personItems(personA), { hint: "태어난 날 달이 머문 자리가 그 사람의 기본 결이 됩니다." }),
      basisGroup("personB", `${personB.name}의 별`, personItems(personB), { hint: "두 사람의 숙을 나란히 놓고 거리와 방향을 봅니다." }),
      basisGroup("relation", "두 별 사이의 방위", [
        relation.traditional_relation ? basisItem("방위 관계", `${relation.traditional_relation}${relation.traditional_relation_hanja ? `(${relation.traditional_relation_hanja})` : ""}`, { term: "방위 관계" }) : null,
        basisItem(`${personA.name} → ${personB.name}`, `${relation.type_a_to_b} · 순행 ${compat.forwardDistance ?? "-"}칸`),
        basisItem(`${personB.name} → ${personA.name}`, `${relation.type_b_to_a} · 역행 ${compat.reverseDistance ?? "-"}칸`),
        basisItem("가까움", `최단 ${compat.shortestDistance ?? "-"}칸 · 결의 세기 ${relation.intensity}`),
        basisItem("오행 관계", harmony, { tone: harmony === "상극" ? "caution" : "positive" }),
      ], { hint: "두 숙 사이의 거리로 관계 이름과 각자의 자리가 정해집니다. 방향에 따라 자리가 다를 수 있습니다." }),
      basisGroup("scores", "계산된 지표", [
        Number.isFinite(Number(compat.chemistryScore)) ? basisItem("끌림", `${compat.chemistryScore}점`, { tone: "positive" }) : null,
        Number.isFinite(Number(compat.stabilityScore)) ? basisItem("안정", `${compat.stabilityScore}점`, { tone: "positive" }) : null,
        Number.isFinite(Number(compat.conflictScore)) ? basisItem("마찰", `${compat.conflictScore}점`, { tone: "caution" }) : null,
      ], { hint: "거리와 관계 유형에서 곧바로 계산된 값입니다. 높고 낮음보다 어디에 힘이 쏠렸는지를 봅니다." }),
    ],
    stages: [
      basisStage("personA", "첫 번째 별을 찾는 중", "태어난 날의 달자리", ["personA"]),
      basisStage("personB", "두 번째 별을 찾는 중", "상대의 본명숙", ["personB"]),
      basisStage("relation", "두 별의 거리를 재는 중", "순행·역행 방위 관계", ["relation"]),
      basisStage("scores", "관계의 결을 재는 중", "끌림·안정·마찰", ["scores"]),
    ],
  });
}

function buildSukuyoCompatibilityJsonSchema(input, calculation) {
  const personA = buildSukuyoPromptPersonMeta(input.personA, calculation.personASukuyo);
  const personB = buildSukuyoPromptPersonMeta(input.personB, calculation.personBSukuyo);
  const relation = buildCompatibilityRelationMeta(calculation.compatibility);
  const scores = buildSukuyoScoreMeta(personA, personB, relation, calculation.compatibility);
  // 기존 5축(scores)은 그대로 둔다 — 과거 저장 결과와 레이더·게이지가 그 키에 물려 있다.
  // 별점 8축(axes)은 그 옆에 새로 붙인다.
  const { axes, total: axesTotal } = buildSukuyoRelationAxes(personA, personB, relation, calculation.compatibility);
  return {
    meta: {
      person_a: personA,
      person_b: personB,
      relation: {
        type_a_to_b: relation.type_a_to_b,
        type_b_to_a: relation.type_b_to_a,
        distance: relation.distance,
        intensity: relation.intensity,
      },
      scores,
      axes,
      axesTotal,
    },
    sections: Object.fromEntries(SUKUYO_SECTION_SPECS.map((section) => [section.key, {
      title: section.title,
      minChars: section.minChars,
      guide: section.guide,
      body: `최소 ${section.minChars.toLocaleString("ko-KR")}자 상담문`,
    }])),
  };
}

function omitKeys(source, keys) {
  if (!source || typeof source !== "object") return source;
  const drop = new Set(keys);
  return Object.fromEntries(Object.entries(source).filter(([key]) => !drop.has(key)));
}

function buildSukuyoCompatibilityPromptContext(input, calculation) {
  const season = currentKstSeason();
  const personAElement = normalizeSukuyoFiveElement(calculation.personASukuyo?.element);
  const personBElement = normalizeSukuyoFiveElement(calculation.personBSukuyo?.element);
  const relationMeta = buildCompatibilityRelationMeta(calculation.compatibility);
  return {
    user_input: {
      relationshipType: input.relationshipType,
      topic: input.topic,
      question: input.question,
    },
    calculation: {
      personA: {
        ...buildSukuyoPromptPersonMeta(input.personA, calculation.personASukuyo),
        index: calculation.personASukuyo?.index,
        lunarMonth: calculation.personASukuyo?.lunarMonth,
        lunarDay: calculation.personASukuyo?.lunarDay,
        degree_strength: sukuyoDegreeStrength(calculation.personASukuyo),
        seasonal_strength: seasonalStrength(personAElement, season),
        keywords: calculation.personASukuyo?.keywords,
        strengths: calculation.personASukuyo?.strengths,
        shadows: calculation.personASukuyo?.shadows,
      },
      personB: {
        ...buildSukuyoPromptPersonMeta(input.personB, calculation.personBSukuyo),
        index: calculation.personBSukuyo?.index,
        lunarMonth: calculation.personBSukuyo?.lunarMonth,
        lunarDay: calculation.personBSukuyo?.lunarDay,
        degree_strength: sukuyoDegreeStrength(calculation.personBSukuyo),
        seasonal_strength: seasonalStrength(personBElement, season),
        keywords: calculation.personBSukuyo?.keywords,
        strengths: calculation.personBSukuyo?.strengths,
        shadows: calculation.personBSukuyo?.shadows,
      },
      // relationLogic 은 relation 을 통째로 다시 적고 있었다(역할·의미·거리 안내가 전부 중복).
      // 장별로 20번 보내는 프롬프트라 중복이 그대로 20배가 된다 — 고유한 해석 지침 한 줄만 남긴다.
      relation: {
        ...relationMeta,
        guide: "관계 유형과 두 사람의 방향별 자리(역할)는 두 본명숙 사이의 순행/역행 거리로 확정된 값이다. 이 정의를 논거로 인용하되, 정의에 없는 의미를 지어내지 않는다. 순행 방향과 역행 방향의 자리가 다르면 방향별로 다르게 해석한다.",
      },
      // distanceMetrics 는 바로 위 forwardDistance·reverseDistance·shortestDistance·distanceLabel 의 사본이다.
      traditionalCompatibility: omitKeys(calculation.compatibility, ["distanceMetrics"]),
      elementHarmony: {
        personAElement,
        personBElement,
        relation: elementRelation(personAElement, personBElement),
      },
      timing: {
        currentSeason: season,
        nextThreeToSixMonths: "현재 계절을 기준으로 앞으로 3~6개월의 주의 시기와 좋은 시기를 서술",
      },
    },
  };
}

function calculateSukuyo(input) {
  const personASukuyo = calculatePersonSukuyo(input.personA, "personA");
  if (input.consultationType === "personal") {
    return {
      personASukuyo,
      personBSukuyo: null,
      compatibility: null,
      sukuyoResult: {
        personAShuku: shukuName(personASukuyo),
        personBShuku: "개인 상담",
        relationType: "본명숙",
        distance: "",
        distanceLabel: "",
        direction: "",
        forwardDistance: null,
        reverseDistance: null,
      },
    };
  }
  const personBSukuyo = calculatePersonSukuyo(input.personB, "personB");
  const compatibility = buildSukuyoAiCompatibility(personASukuyo, personBSukuyo);
  const relationType = clean(compatibility.relationType || "명");
  return {
    personASukuyo,
    personBSukuyo,
    compatibility,
    sukuyoResult: {
      personAShuku: shukuName(personASukuyo),
      personBShuku: shukuName(personBSukuyo),
      relationType,
      distance: normalizeDistance(compatibility),
      distanceLabel: clean(compatibility.distanceLabel || compatibility.distanceMetrics?.distanceLabel),
      direction: [compatibility.directionFromAToB, compatibility.directionFromBToA].map(clean).filter(Boolean).join(" / "),
      forwardDistance: Number.isFinite(Number(compatibility.forwardDistance)) ? Number(compatibility.forwardDistance) : null,
      reverseDistance: Number.isFinite(Number(compatibility.reverseDistance)) ? Number(compatibility.reverseDistance) : null,
    },
  };
}

function textToBytes(text) {
  return new TextEncoder().encode(text);
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToText(value) {
  const padded = String(value || "").replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (String(value || "").length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function sha256Text(text) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", textToBytes(text))));
}

function tokenSecret(env = {}) {
  return clean(env.SUKUYO_COMPAT_AI_ACCESS_SECRET || env.JWT_ACCESS_SECRET || env.AUTH_SECRET || "dev-sukuyo-compat-ai-secret");
}

async function signTokenPayload(env, payload) {
  const body = bytesToBase64Url(textToBytes(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", textToBytes(tokenSecret(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, textToBytes(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

async function verifyToken(env, token) {
  try {
    const [body, signature] = clean(token).split(".");
    if (!body || !signature) return null;
    const parsed = JSON.parse(base64UrlToText(body));
    const expected = await signTokenPayload(env, parsed);
    if (expected !== `${body}.${signature}`) return null;
    if (Number(parsed.exp || 0) < Date.now()) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

async function inputHash(input) {
  return sha256Text(JSON.stringify({
    consultationType: input.consultationType,
    personA: input.personA,
    personB: input.consultationType === "compatibility" ? input.personB : null,
    relationshipType: input.relationshipType,
    topic: input.topic,
    question: input.question,
  }));
}

function mapAccessType(decision = {}, user = {}) {
  if (clean(user.role).toLowerCase() === "admin") return "admin";
  const source = clean(decision.accessSource).toLowerCase();
  const reason = clean(decision.reason).toLowerCase();
  const license = clean(decision.licenseType).toLowerCase();
  if (source.includes("monthly") || license.includes("monthly") || reason.includes("monthly")) return "subscription";
  if (source.includes("paid") || license.includes("single") || reason.includes("already_purchased")) return "paid";
  return "pass";
}

function buildPaymentPayload(idempotencyKey) {
  return {
    provider: "PORTONE_V2",
    featureKey: FEATURE_KEY,
    title: COMPATIBILITY_TITLE,
    reason: COMPATIBILITY_TITLE,
    orderName: COMPATIBILITY_TITLE,
    amountKRW: AMOUNT_KRW,
    coinPrice: COIN_PRICE,
    currency: "KRW",
    allowedPaymentModes: ["pass", "monthly", "direct"],
    membershipCreditCost: COIN_PRICE * 10,
    requestId: idempotencyKey,
    idempotencyKey,
    checkoutEndpoint: "/api/billing/checkout",
    confirmEndpoint: "/api/billing/confirm",
    runtimeGate: {
      title: COMPATIBILITY_TITLE,
      reason: COMPATIBILITY_TITLE,
      featureKey: FEATURE_KEY,
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      serviceKey: FEATURE_KEY,
      cost: COIN_PRICE,
      coinPrice: COIN_PRICE,
      amountKRW: AMOUNT_KRW,
      amountKrw: AMOUNT_KRW,
      allowedPaymentModes: ["pass", "monthly", "direct"],
      membershipCreditCost: COIN_PRICE * 10,
      requestId: idempotencyKey,
      idempotencyKey,
    },
  };
}

async function resolveUser(auth, env) {
  // 풀 초기화(MongoPoolClearedError) 순간에도 접근 판정 read가 1회 실패로 죽지 않도록 재시도
  // (withMongoRetry가 내부에서 connectDb 호출).
  return withMongoRetry(env, () => User.findById(auth.userId).select("role").lean());
}

function paymentIdFromBody(body = {}) {
  const billingGate = body.billingGate && typeof body.billingGate === "object" ? body.billingGate : {};
  const payment = body.payment && typeof body.payment === "object" ? body.payment : {};
  const accessGrant = body.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : billingGate.accessGrant && typeof billingGate.accessGrant === "object" ? billingGate.accessGrant : {};
  const consume = body.consume && typeof body.consume === "object" ? body.consume : billingGate.consume && typeof billingGate.consume === "object" ? billingGate.consume : {};
  return clean(
    body.paymentId
      || body.transactionId
      || body.purchaseId
      || body.ledgerId
      || body.impUid
      || body.merchantUid
      || billingGate.paymentId
      || billingGate.transactionId
      || billingGate.purchaseId
      || billingGate.ledgerId
      || payment.paymentId
      || payment.impUid
      || payment.merchantUid
      || accessGrant.paymentId
      || accessGrant.purchaseId
      || accessGrant.transactionId
      || accessGrant.ledgerId
      || accessGrant.evidenceId
      || consume.paymentId
      || consume.purchaseId
      || consume.transactionId
      || consume.ledgerId,
    160,
  );
}

async function hasPaidPayment(env, auth, paymentId) {
  if (!paymentId) return false;
  await connectDb(env);
  const payment = await withMongoRetry(env, () => Payment.exists({
    userId: auth.userId,
    $or: [
      { impUid: paymentId },
      { merchantUid: paymentId },
      { requestId: paymentId },
      { idempotencyKey: paymentId },
    ],
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    status: { $in: ["paid", "success", "fulfilled"] },
  }));
  return Boolean(payment);
}

function collectBillingEvidenceIds(body = {}) {
  const ids = new Set();
  const add = (value) => {
    const id = clean(value, 180);
    if (id) ids.add(id);
  };
  const billingGate = body.billingGate && typeof body.billingGate === "object" ? body.billingGate : {};
  const payment = body.payment && typeof body.payment === "object" ? body.payment : {};
  const accessGrant = body.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : billingGate.accessGrant && typeof billingGate.accessGrant === "object" ? billingGate.accessGrant : {};
  const consume = body.consume && typeof body.consume === "object" ? body.consume : billingGate.consume && typeof billingGate.consume === "object" ? billingGate.consume : {};
  const sources = [
    body.paymentId,
    body.transactionId,
    body.purchaseId,
    body.ledgerId,
    body.requestId,
    body.idempotencyKey,
    body.orderId,
    billingGate.paymentId,
    billingGate.transactionId,
    billingGate.purchaseId,
    billingGate.ledgerId,
    billingGate.requestId,
    billingGate.idempotencyKey,
    payment.paymentId,
    payment.impUid,
    payment.merchantUid,
    payment.transactionId,
    payment.purchaseId,
    payment.requestId,
    accessGrant.paymentId,
    accessGrant.purchaseId,
    accessGrant.transactionId,
    accessGrant.ledgerId,
    accessGrant.evidenceId,
    accessGrant.requestId,
    consume.paymentId,
    consume.purchaseId,
    consume.transactionId,
    consume.ledgerId,
    consume.evidenceId,
    consume.requestId,
  ];
  sources.forEach(add);
  return [...ids];
}

function isObjectIdLike(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || ""));
}

function buildPointHistoryEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
      { "metadata.transactionId": id },
      { "metadata.ledgerId": id },
      { "metadata.evidenceId": id },
      { impUid: id },
      { merchantUid: id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id }, { paymentId: id });
  });
  return or;
}

function buildMonthlyLedgerEvidenceQuery(ids) {
  const or = [];
  ids.forEach((id) => {
    or.push(
      { sourceId: id },
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.idempotencyKey": id },
      { "metadata.orderId": id },
      { "metadata.pointHistoryId": id },
      { "metadata.transactionId": id },
      { "metadata.ledgerId": id },
      { "metadata.evidenceId": id },
    );
    if (isObjectIdLike(id)) or.push({ _id: id });
  });
  return or;
}

async function resolveBillingUsageEvidence(env, auth, body = {}) {
  const ids = collectBillingEvidenceIds(body);
  if (!ids.length) return null;
  await connectDb(env);
  const pointOr = buildPointHistoryEvidenceQuery(ids);
  const pointHistory = pointOr.length
    ? await PointHistory.findOne({
      userId: auth.userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      $and: [
        { $or: pointOr },
        {
          $or: [
            { "metadata.accessType": { $in: ["membership_credit", "membership_pass", "family", "coin", "single_purchase"] } },
            { "metadata.transactionType": { $in: ["membership_credit", "membership_pass", "family_pass", "coin", "single_purchase"] } },
            { "metadata.accessMethod": { $in: ["MONTHLY", "PASS", "FAMILY", "COIN", "DIRECT_KRW"] } },
            { "metadata.paymentMethod": { $in: ["MONTHLY", "PASS", "FAMILY", "COIN", "DIRECT_KRW"] } },
          ],
        },
      ],
    }).select("_id metadata").lean()
    : null;
  if (pointHistory) {
    const accessType = clean(pointHistory?.metadata?.accessType).toLowerCase();
    return {
      ok: true,
      accessType: accessType === "membership_credit" ? "subscription" : accessType === "membership_pass" || accessType === "family" ? "pass" : "paid",
      paymentId: String(pointHistory._id || paymentIdFromBody(body) || ""),
    };
  }
  const ledgerOr = buildMonthlyLedgerEvidenceQuery(ids);
  const ledger = ledgerOr.length
    ? await MonthlyCreditLedger.findOne({
      userId: auth.userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: FEATURE_KEY,
      $or: ledgerOr,
    }).select("_id metadata").lean()
    : null;
  if (ledger) {
    return { ok: true, accessType: "subscription", paymentId: String(ledger._id || paymentIdFromBody(body) || "") };
  }
  return null;
}

// 계산 근거만 즉시 돌려준다 — LLM 미호출, DB 접근 없음, 과금 없음.
// 신원 확인은 로컬 JWT 검증만 써서 Mongo를 한 번도 건드리지 않는다.
async function handleBasis(request, env) {
  const userId = await peekAccessTokenUserId(request, env);
  if (!userId) return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });

  const normalized = normalizeInput(await readJson(request));
  if (!normalized.ok) return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput, errors: normalized.errors }, { status: 422 });
  // 개인 상담은 상대 축이 없어 궁합 근거를 만들 수 없다.
  if (normalized.consultationType === "personal") return json({ ok: false, reason: "NOT_APPLICABLE" }, { status: 404 });

  try {
    return json(buildSukuyoAnalysisBasis(normalized, calculateSukuyo(normalized)));
  } catch (error) {
    logSukyoAi("[Sukyo AI Basis Error]", { route: "/api/sukuyo-compatibility-ai/basis", errorMessage: clean(error?.message || error, 300) }, error, env);
    return json({ ok: false, reason: "CALCULATION_FAILED" }, { status: 503 });
  }
}

async function handleEnsureAccess(request, env) {
  const body = await readJson(request);
  const idempotencyKey = normalizeId(body.idempotencyKey || request.headers.get("idempotency-key") || `sukuyo-ai-${Date.now().toString(36)}`);
  logSukyoAi("[Sukyo AI LLM Prepare Start]", {
    route: "/api/sukuyo-compatibility-ai/prepare",
    requestId: idempotencyKey,
    consultationType: normalizeConsultationType(body.consultationType || body.type),
  });
  let auth = null;
  try {
    auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  } catch (error) {
    // 일시적 DB 장애는 로그아웃 유발 401이 아니라 재시도 가능한 503으로 흘려보낸다.
    if (isTransientMongoError(error)) throw error;
    return json({ ok: false, reason: "LOGIN_REQUIRED" }, { status: 401 });
  }
  const normalized = normalizeInput(body);
  logSukyoAi("[Sukyo AI LLM Payload Validated]", {
    route: "/api/sukuyo-compatibility-ai/prepare",
    requestId: idempotencyKey,
    consultationType: normalized.consultationType,
    validation: { ok: normalized.ok, errors: normalized.errors },
    personA: normalized.personA,
    personB: normalized.consultationType === "compatibility" ? normalized.personB : null,
  });
  if (!normalized.ok) return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput, errors: normalized.errors }, { status: 422 });
  logSukyoAi("[Sukyo AI LLM Access Check Start]", {
    route: "/api/sukuyo-compatibility-ai/prepare",
    requestId: idempotencyKey,
    consultationType: normalized.consultationType,
  });
  const user = await resolveUser(auth, env);
  const accessHash = await inputHash(normalized);
  if (clean(user?.role).toLowerCase() === "admin") {
    logSukyoAi("[Sukyo AI LLM Access Check Success]", {
      route: "/api/sukuyo-compatibility-ai/prepare",
      requestId: idempotencyKey,
      consultationType: normalized.consultationType,
      accessGranted: true,
      accessType: "admin",
    });
    return json({
      ok: true,
      accessToken: await signTokenPayload(env, { userId: String(auth.userId), accessType: "admin", inputHash: accessHash, idempotencyKey, exp: Date.now() + TOKEN_TTL_MS }),
      accessType: "admin",
    });
  }
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE, userDoc: auth.authUserDoc });
  if (decision.allowed) {
    const accessType = mapAccessType(decision, user || {});
    logSukyoAi("[Sukyo AI LLM Access Check Success]", {
      route: "/api/sukuyo-compatibility-ai/prepare",
      requestId: idempotencyKey,
      consultationType: normalized.consultationType,
      accessGranted: true,
      accessType,
    });
    return json({
      ok: true,
      accessToken: await signTokenPayload(env, { userId: String(auth.userId), accessType, inputHash: accessHash, idempotencyKey, exp: Date.now() + TOKEN_TTL_MS }),
      accessType,
    });
  }
  logSukyoAi("[Sukyo AI LLM Access Check Success]", {
    route: "/api/sukuyo-compatibility-ai/prepare",
    requestId: idempotencyKey,
    consultationType: normalized.consultationType,
    accessGranted: false,
  });
  return json({ ok: false, reason: "PAYMENT_REQUIRED", paymentPayload: buildPaymentPayload(idempotencyKey) }, { status: 402 });
}

async function resolveStartAccess(request, env, auth, body, normalized, accessHash) {
  const token = clean(body.accessToken || body.access_token);
  const tokenPayload = token ? await verifyToken(env, token) : null;
  if (
    tokenPayload
    && tokenPayload.userId === String(auth.userId)
    && tokenPayload.inputHash === accessHash
    && (!tokenPayload.idempotencyKey || tokenPayload.idempotencyKey === normalizeId(body.idempotencyKey || request.headers.get("idempotency-key")))
  ) {
    return { ok: true, accessType: tokenPayload.accessType || "pass", paymentId: "" };
  }
  const user = await resolveUser(auth, env);
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE, userDoc: auth.authUserDoc });
  if (decision.allowed) return { ok: true, accessType: mapAccessType(decision, user || {}), paymentId: paymentIdFromBody(body) };
  const billingEvidence = await withMongoRetry(env, () => resolveBillingUsageEvidence(env, auth, body));
  if (billingEvidence?.ok) return billingEvidence;
  const paidPaymentId = paymentIdFromBody(body);
  if (await hasPaidPayment(env, auth, paidPaymentId)) return { ok: true, accessType: "paid", paymentId: paidPaymentId };
  return { ok: false };
}

/**
 * 그룹 하나(장 3개)를 쓰게 하는 프롬프트. LLM 호출 1회의 단위다.
 *
 * 그룹별로 호출이 갈리면 서로가 뭘 썼는지 모른 채 같은 비유를 반복할 위험이 커진다.
 * 그래서 (1) 다른 그룹이 맡은 주제를 알려 주고 건드리지 말라고 못 박고,
 * (2) 시스템 프롬프트에 반복 금지 규칙을 따로 넣었다.
 */
function buildSectionGroupPrompt(input, calculation, group) {
  const specs = group.keys.map((key) => {
    const spec = SUKUYO_SECTION_SPEC_MAP.get(key);
    if (!spec) throw new Error(`알 수 없는 숙요 섹션: ${key}`);
    return spec;
  });
  const groupKeySet = new Set(group.keys);
  const otherTitles = SUKUYO_SECTION_SPECS
    .filter((section) => !groupKeySet.has(section.key))
    .map((section) => section.title.replace(/^\S+\s+/, ""))
    .join(" / ");
  const includesDomains = groupKeySet.has("domains");
  const shape = `{${group.keys.map((key) => `"${key}":{"body":"..."}`).join(",")}}`;
  return [
    `아래 숙요점 계산값만 근거로, 두 사람의 궁합 상담문 가운데 아래 ${specs.length}개 장을 작성하십시오.`,
    "본명숙 산출, 관계 거리, 양방향 관계 유형, 기질 속성, 점수는 이미 확정된 값입니다. 다시 계산하거나 바꾸지 마십시오.",
    "",
    "[이번에 쓸 장]",
    ...specs.map((spec) => [
      `● ${spec.title}  (키: ${spec.key})`,
      `   요구 사항: ${spec.guide}`,
      `   분량: 공백 포함 최소 ${spec.minChars.toLocaleString("ko-KR")}자, 상한 ${Math.round(spec.minChars * 1.5).toLocaleString("ko-KR")}자. 늘리는 것보다 밀도를 높이는 쪽이 낫습니다.`,
    ].join("\n")),
    "",
    "각 장 본문은 3~6개 소단락으로 나누고, 마크업은 **굵게**, 번호 목록(1. ), 하이픈 목록(- ), 인용(> ) 네 가지만 사용합니다.",
    "🔴 각 장은 그 주제와 직접 관련된 계산 근거를 **서로 다른 것으로 최소 2개** 인용해 논거로 삼습니다(관계 유형 정의, 순행·역행 거리, 오행 상생·상극, 숙 그룹, 음양 조합, 끌림·안정·마찰 수치 중에서). 근거 없는 찬사 문장은 쓰지 않습니다.",
    "🔴 각 장에서 두 사람의 이름을 실제로 부르며, 이 조합에서만 나올 수 있는 구체적인 장면을 최소 1개 씁니다. 다른 커플에게 그대로 옮겨도 말이 되는 문장은 지우고 다시 쓰십시오.",
    "🔴 이 요청 안의 장들끼리도 같은 비유·같은 첫 문장 구조·같은 사례를 재사용하지 않습니다. 장마다 다른 각도로 접근합니다.",
    "서사는 '운명적 끌림'(관계 유형·거리·상생 근거)과 '현실적 조율'(상극·그룹 차이·음양 과제)의 두 축을 오가며 짭니다.",
    "각 장에 구체적 상황 묘사, 실제 대화체 예시, 번호 행동 지침, 시기별 전망 중 최소 2가지 이상을 넣습니다. 추상어로 분량을 채우지 마십시오.",
    "",
    "[다른 장이 맡은 주제 — 여기서 다루지 않습니다]",
    otherTitles,
    "",
    `아래 형식의 JSON 객체 하나만 반환하십시오: ${shape}`,
    "JSON 외 다른 텍스트를 절대 포함하지 마세요.",
    "",
    // 들여쓰기 없이 보낸다 — 그룹마다 반복되는 블록이라 공백이 그대로 5배가 된다.
    "[숙요점 계산 context]",
    JSON.stringify(buildSukuyoCompatibilityPromptContext(input, calculation)),
    "",
    // 아래 확정값은 그대로 사용자 화면의 근거 패널로도 나간다. 본문이 그 표를 벗어나지 않게 못 박는다.
    ...buildEvidenceRuleLines(buildSukuyoAnalysisBasis(input, calculation)),
    // 궁합은 두 사람의 관계만 다루므로, 개인 운세용 6분야가 아니라 관계가 실제로 작동하는 무대로 나눈다.
    // 영역별 궁합 장이 든 그룹에만 붙인다(나머지 그룹에 붙이면 프롬프트만 불어난다).
    ...(includesDomains ? ["", ...buildDomainAnalysisRuleLines(RELATIONSHIP_ANALYSIS_DOMAINS)] : []),
  ].join("\n");
}

/**
 * 마지막 웨이브에서 한 번 더 부르는 종합 콜.
 * 별점 8축은 서버가 이미 확정했으므로 LLM 은 "왜 그 점수인지" 한 줄만 쓴다.
 */
function buildSummaryPrompt(input, calculation) {
  const schema = buildSukuyoCompatibilityJsonSchema(input, calculation);
  const axisLines = SUKUYO_AXIS_SPECS
    .map((spec) => `- ${spec.key} (${spec.label}): ${schema.meta.axes[spec.key].score}점${spec.polarity === "inverse" ? " ※ 높을수록 위험이 크다는 뜻" : ""}`)
    .join("\n");
  return [
    "아래 숙요점 계산값과 이미 확정된 점수를 근거로, 궁합 상담의 요약부를 작성하십시오.",
    "점수는 서버가 계산한 확정값입니다. 점수를 바꾸거나 새로 매기지 마십시오.",
    "",
    "반환할 JSON 형식:",
    '{"headline": "…", "insight": "…", "scoreNotes": {"emotionBond": "…", "trust": "…", "dialogue": "…", "longevity": "…", "marriage": "…", "conflictRisk": "…", "growth": "…", "karmaBond": "…"}}',
    "",
    "- headline: 이 관계를 한 문장으로 요약합니다. 40~70자. 좋은 말만 쓰지 말고 이 관계의 핵심 긴장까지 담습니다. 예시 형식 — '강한 인연이지만 감정 표현 방식의 차이가 반복되는 관계입니다.'",
    "- insight: 이 관계의 본질을 한 문단으로 설명합니다. 300~450자. 관계 유형과 거리, 오행 관계를 근거로 인용하고, 장점과 취약점을 함께 말합니다.",
    "- scoreNotes: 여덟 축 각각에 대해 '왜 이 점수가 나왔는지'를 60~90자 한 줄로 씁니다. 계산 근거(관계 유형·거리·오행·음양·숙 그룹)를 반드시 하나 이상 인용하고, 점수를 그대로 반복해 읽지 마십시오.",
    "  conflictRisk 는 점수가 높을수록 갈등 위험이 크다는 뜻이므로, 높으면 위험 요인을 낮으면 안정 요인을 설명합니다.",
    "",
    "JSON 외 다른 텍스트를 절대 포함하지 마세요.",
    "",
    "[확정된 별점 8축]",
    axisLines,
    "",
    "[숙요점 계산 context]",
    JSON.stringify(buildSukuyoCompatibilityPromptContext(input, calculation)),
    "",
    ...buildEvidenceRuleLines(buildSukuyoAnalysisBasis(input, calculation)),
  ].join("\n");
}

function buildFirstPrompt(input, calculation) {
  const personal = input.consultationType === "personal";
  return [
    "아래 계산 데이터만 근거로 숙요점 AI 첫 상담 답변을 작성하세요.",
    "없는 사실을 지어내지 말고, 계산된 27숙과 관계 유형을 중심으로 말하세요.",
    "",
    "[사용자 입력]",
    `- 상담 유형: ${personal ? "개인 상담" : "궁합 상담"}`,
    `- 사용자: ${input.personA.name || "나"} · 성별 ${input.personA.gender || "미입력"} · ${input.personA.birthDate} · ${input.personA.calendarType === "lunar" ? "음력" : "양력"} · 출생시간 ${input.personA.birthTime || "미입력"}`,
    personal ? "" : `- 상대방: ${input.personB.name || "상대"} · 성별 ${input.personB.gender || "미입력"} · ${input.personB.birthDate} · ${input.personB.calendarType === "lunar" ? "음력" : "양력"} · 출생시간 ${input.personB.birthTime || "미입력"}`,
    `- 관계 유형: ${input.relationshipType}`,
    `- 상담 주제: ${input.topic}`,
    `- 사용자의 현재 질문: ${input.question}`,
    "",
    "[숙요점 계산 결과]",
    JSON.stringify({
      personA: {
        shuku: calculation.sukuyoResult.personAShuku,
        index: calculation.personASukuyo.index,
        keywords: calculation.personASukuyo.keywords,
        strengths: calculation.personASukuyo.strengths,
        shadows: calculation.personASukuyo.shadows,
      },
      personB: personal ? null : {
        shuku: calculation.sukuyoResult.personBShuku,
        index: calculation.personBSukuyo.index,
        keywords: calculation.personBSukuyo.keywords,
        strengths: calculation.personBSukuyo.strengths,
        shadows: calculation.personBSukuyo.shadows,
      },
      relation: calculation.sukuyoResult,
      compatibility: calculation.compatibility,
    }),
    "",
    "첫 답변은 Markdown으로 작성하되 다음 흐름을 자연스럽게 모두 포함하세요.",
    "오늘의 달빛 결론, 나의 본명숙, 숙요점 기질, 현재 질문의 흐름, 지금 가장 강하게 작용하는 감정 패턴, 가까운 시기의 변화 가능성, 조심해야 할 관계 습관, 오늘의 행동 처방, 마지막 한 줄 조언.",
    personal ? "" : "궁합 상담이므로 상대방의 본명숙, 관계의 별자리, 관계 거리 또는 관계 유형, 두 사람의 관계 흐름도 반드시 포함하세요.",
  ].filter(Boolean).join("\n");
}

function sanitizeConsultationText(text) {
  let result = clean(text, 60000);
  // 🔴 삭제는 ko 에서만. FORBIDDEN_RESULT_PATTERNS 의 /chapter/gi·/progress/gi·/job/gi·/PDF/gi 가
  // 비-ko 에서는 영어 상담문의 정상 단어를 본문에서 잘라낸다.
  if (canStripForbiddenText()) {
    for (const pattern of FORBIDDEN_RESULT_PATTERNS) result = result.replace(pattern, "");
  }
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function parseJsonObjectFromText(text) {
  const normalized = String(text || "").replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(normalized.slice(start, end + 1));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

/**
 * 장 하나의 응답에서 본문을 뽑는다. 순수 함수라 가드(verify:llm-generation-resilience)가 직접 돌린다.
 *
 * 🔴 경량 보장 계약: 던지지 않는다. 읽을 수 있는 텍스트가 남아 있는 한 버리지 않고,
 * 정말 아무것도 없을 때만 "" 을 돌려준다 — 호출부가 그때만 실패로 판정해 환급 경로를 돌린다.
 * 여기서 예외를 던지면 결제는 됐는데 결과가 사라진다.
 */
function extractSectionBody(text) {
  const raw = String(text == null ? "" : text).trim();
  if (!raw) return "";
  const parsed = parseJsonObjectFromText(raw);
  const fromJson = cleanRichText(parsed?.body);
  if (fromJson.length >= 240) return fromJson.slice(0, SUKUYO_SECTION_BODY_MAX_CHARS);
  // JSON 이 아니거나 잘렸으면 원문에서 읽을 수 있는 문장을 살린다.
  if (!hasRenderableLlmText(raw, { minChars: 400 })) return fromJson;
  const recovered = looksLikeJsonish(raw) ? (extractReadableTextFromJsonLike(raw) || raw) : raw;
  return cleanRichText(recovered).slice(0, SUKUYO_SECTION_BODY_MAX_CHARS);
}

function looksLikeJsonish(text) {
  const head = String(text || "").trimStart().slice(0, 2);
  return head.startsWith("{") || head.startsWith("[");
}

// 장별 결정론 캐시. 프롬프트 구조가 v1(단일 대형 JSON)과 완전히 달라졌으므로 keyExtra 를 v2 로 올린다 —
// 안 올리면 7일 TTL 캐시가 옛 구조 JSON 을 그대로 돌려준다.
function sukuyoSectionCache(env, keyExtra) {
  return {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 7 * 24 * 60 * 60,
    keyExtra: `sukuyo-compat-ai-v2-${keyExtra}`,
  };
}

/** 그룹 하나(장 3개)를 생성한다. 실패하면 빈 객체를 돌려주고 나머지 그룹을 죽이지 않는다. */
async function generateSectionGroup(env, input, calculation, group, systemPrompt) {
  const groupMinChars = group.keys.reduce((sum, key) => sum + SUKUYO_SECTION_SPEC_MAP.get(key).minChars, 0);
  try {
    const ai = await callGeminiJsonWithRetry(env, buildSectionGroupPrompt(input, calculation, group), {
      systemPrompt,
      taskType: "fortune",
      temperature: 0.74,
      baseTokens: SUKUYO_SECTION_BASE_TOKENS,
      capTokens: SUKUYO_SECTION_CAP_TOKENS,
      responseMimeType: "application/json",
      timeoutMs: SUKUYO_SECTION_TIMEOUT_MS,
      // 🔴 유료 라우트에서 폴백을 켰으면 fallbackMinChars 는 필수다(관례: 최소 분량 × 0.4).
      // 없으면 Workers AI 폴백이 8% 분량을 정상 결제로 통과시킨다.
      fallbackMinChars: Math.round(groupMinChars * 0.4),
      cache: sukuyoSectionCache(env, group.id),
    });
    const provider = clean(ai?.provider || "");
    const model = clean(ai?.model || "");
    if (!ai?.ok || /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true) return { sections: {}, provider: "", model: "" };
    const raw = sanitizeConsultationText(ai?.text || "");
    const parsed = parseJsonObjectFromText(raw) || {};
    const sections = {};
    group.keys.forEach((key) => {
      const spec = SUKUYO_SECTION_SPEC_MAP.get(key);
      const body = extractSectionBody(parsed[key]?.body ? JSON.stringify({ body: parsed[key].body }) : "");
      if (body.length >= 240) sections[key] = { title: spec.title, body };
    });
    // 구조화 파싱이 통째로 실패했는데 읽을 만한 원문이 남아 있으면 첫 장에라도 실어 보낸다.
    // 경량 보장 계약 — 결제된 생성물을 빈손으로 돌려보내지 않는다.
    if (!Object.keys(sections).length) {
      const recovered = extractSectionBody(raw);
      if (recovered.length >= 240) {
        const spec = SUKUYO_SECTION_SPEC_MAP.get(group.keys[0]);
        sections[group.keys[0]] = { title: spec.title, body: recovered };
      }
    }
    return { sections, provider, model };
  } catch (error) {
    logSukyoAi("[Sukyo AI Section Group Failed]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      requestId: input.idempotencyKey,
      sectionGroup: group.id,
      errorMessage: clean(error?.message || error, 300),
    });
    return { sections: {}, provider: "", model: "" };
  }
}

/** 요약부(한 줄 요약·핵심 인사이트·축별 근거). 실패해도 상담 자체는 성립하므로 null 을 허용한다. */
async function generateSummary(env, input, calculation, systemPrompt) {
  try {
    const ai = await callGeminiJsonWithRetry(env, buildSummaryPrompt(input, calculation), {
      systemPrompt,
      taskType: "fortune",
      temperature: 0.7,
      baseTokens: 4000,
      capTokens: 5200,
      responseMimeType: "application/json",
      timeoutMs: SUKUYO_SECTION_TIMEOUT_MS,
      fallbackMinChars: 400,
      cache: sukuyoSectionCache(env, "summary"),
    });
    if (!ai?.ok) return null;
    const parsed = parseJsonObjectFromText(sanitizeConsultationText(ai?.text || ""));
    if (!parsed) return null;
    const scoreNotes = {};
    SUKUYO_AXIS_SPECS.forEach((spec) => {
      const note = clean(parsed?.scoreNotes?.[spec.key], 200);
      if (note) scoreNotes[spec.key] = note;
    });
    const headline = clean(parsed.headline, 160);
    const insight = cleanRichText(parsed.insight, 1200);
    if (!headline && !insight && !Object.keys(scoreNotes).length) return null;
    return { headline, insight, scoreNotes };
  } catch (error) {
    logSukyoAi("[Sukyo AI Summary Failed]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      requestId: input.idempotencyKey,
      errorMessage: clean(error?.message || error, 300),
    });
    return null;
  }
}

/**
 * 궁합 상담 전체를 한 요청 안에서 만든다 — 다섯 섹션 그룹 + 요약을 병렬로 부르고 하나로 병합한다.
 * 벽시계는 가장 느린 그룹 기준(약 40초)이라 엣지 100초 컷 안쪽에서 끝난다.
 */
async function createCompatibilityAnswer(env, input, calculation) {
  const systemPrompt = await cmsPromptText(env, "sukuyo-compatibility-json", COMPATIBILITY_JSON_SYSTEM_PROMPT);
  const settled = await Promise.allSettled([
    ...SUKUYO_SECTION_GROUPS.map((group) => generateSectionGroup(env, input, calculation, group, systemPrompt)),
    generateSummary(env, input, calculation, systemPrompt),
  ]);

  const merged = {};
  let provider = "";
  let model = "";
  settled.slice(0, SUKUYO_SECTION_GROUPS.length).forEach((entry) => {
    if (entry.status !== "fulfilled") return;
    Object.assign(merged, entry.value.sections);
    provider = entry.value.provider || provider;
    model = entry.value.model || model;
  });
  const summaryEntry = settled[settled.length - 1];
  const summary = summaryEntry.status === "fulfilled" ? summaryEntry.value : null;

  // 읽는 순서를 SUKUYO_SECTION_SPECS 순서로 고정한다(생성 순서가 아니라 목차 순서로 보여야 한다).
  const sections = Object.fromEntries(
    SUKUYO_SECTION_SPECS.filter((spec) => merged[spec.key]).map((spec) => [spec.key, merged[spec.key]]),
  );
  const totalChars = Object.values(sections).reduce((sum, section) => sum + clean(section.body).length, 0);
  logSukyoAi("[Sukyo AI Generate Done]", {
    route: "/api/sukuyo-compatibility-ai/generate",
    requestId: input.idempotencyKey,
    sections: Object.keys(sections).length,
    expected: SUKUYO_SECTION_SPECS.length,
    totalChars,
  });

  // 전부 실패했을 때만 실패로 돌린다 — 그래야 선차감 복원 경로가 돈다.
  // 일부만 왔으면 짧아도 전달한다(경량 보장 계약).
  if (totalChars < 600) {
    throw Object.assign(new Error(MESSAGES.llmFailed), { code: "LLM_FAILED", status: 503 });
  }

  const result = {
    meta: buildSukuyoCompatibilityJsonSchema(input, calculation).meta,
    ...(summary?.headline ? { headline: summary.headline } : {}),
    ...(summary?.insight ? { insight: summary.insight } : {}),
    ...(summary && Object.keys(summary.scoreNotes).length ? { scoreNotes: summary.scoreNotes } : {}),
    sections,
  };
  return { content: JSON.stringify(result, null, 2), provider, model };
}

/** 개인 상담(단일 텍스트)은 예전 그대로 한 번에 만든다 — 분량이 4천 토큰대라 배치가 필요 없다. */
async function createPersonalAnswer(env, input, calculation) {
  const ai = await callGeminiText(env, buildFirstPrompt(input, calculation), {
    systemPrompt: await cmsPromptText(env, "sukuyo-compatibility", SYSTEM_PROMPT),
    taskType: "fortune",
    temperature: 0.74,
    timeoutMs: clampSyncLlmTimeoutMs(Number(env.SUKUYO_COMPAT_AI_TIMEOUT_MS) || 55000),
    maxOutputTokens: 4096,
    cache: sukuyoSectionCache(env, "personal"),
  });
  const provider = clean(ai?.provider || "");
  const model = clean(ai?.model || "");
  const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
  const content = sanitizeConsultationText(ai?.text || "");
  if (!ai?.ok || isMock || content.length < 240) {
    const llmError = Object.assign(new Error(MESSAGES.llmFailed), { code: "LLM_FAILED", status: 503 });
    logSukyoAi("[Sukyo AI LLM Error]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      requestId: input.idempotencyKey,
      consultationType: input.consultationType,
      providerReason: isMock ? "mock_provider_blocked" : provider || model || "llm_failed",
      errorMessage: clean(ai?.error || ai?.message || "LLM_FAILED"),
    }, llmError, env);
    throw llmError;
  }
  return { content, provider, model };
}

// 저장된 상담 문서에서 근거를 다시 계산한다. 궁합 상담(두 사람)만 대상이며,
// 옛 문서에 생년월일이 빠져 있는 등의 이유로 계산이 안 되면 근거 없이 넘어간다(결과 조회 자체는 막지 않는다).
function safeSukuyoAnalysisBasis(raw) {
  try {
    if (!raw?.personA?.birthDate || !raw?.personB?.birthDate) return null;
    // 저장된 사람 정보에는 birthParts가 없으므로 normalizeInput을 다시 태워 계산 가능한 형태로 되돌린다.
    const input = normalizeInput({
      consultationType: "compatibility",
      personA: raw.personA,
      personB: raw.personB,
      relationshipType: raw.relationshipType,
      topic: raw.topic,
    });
    if (!input.ok) return null;
    return buildSukuyoAnalysisBasis(input, calculateSukuyo(input));
  } catch {
    return null;
  }
}

function serializeConsultation(doc) {
  const raw = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(raw._id || raw.id || ""),
    personA: raw.personA,
    personB: raw.personB,
    sukuyoResult: raw.sukuyoResult,
    // 두 사람의 생년월일은 예전부터 저장돼 있으므로 근거를 다시 계산해 붙인다
    // (이 변경 이전에 만들어진 상담도 근거 패널을 그대로 얻는다). 순수 계산이라 실패는 조용히 넘긴다.
    analysisBasis: safeSukuyoAnalysisBasis(raw),
    relationshipType: raw.relationshipType,
    topic: raw.topic,
    accessType: raw.accessType,
    consultationType: raw.relationshipType === "개인 상담" ? "personal" : "compatibility",
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function executionAccessMethod(accessType) {
  if (accessType === "paid") return "single";
  if (accessType === "subscription") return "monthly";
  return "pass";
}

// 선차감(코인/월정석)된 접근에서 생성이 실패하면 차감을 되돌린다.
// vedic-ai.js의 restorePrepaidAccessOnFailure와 동일한 멱등 환급 규약을 따른다.
async function restorePrepaidAccessOnFailure(env, auth, access, error) {
  const accessType = clean(access?.accessType).toLowerCase();
  // 이용권/월정석 커버(pass/family/license)·관리자·토큰 접근은 차감이 없으므로 환급 대상 아님.
  if (!["paid", "subscription"].includes(accessType)) return false;
  const evidenceId = clean(access?.paymentId, 160);
  if (!isObjectIdLike(evidenceId)) return false; // PG 직접결제(merchantUid 문자열)는 재시도로 자가복구되므로 제외.

  const userId = String(auth?.userId || "");
  const now = new Date();
  const failureMessage = clean(error?.message || error || "sukuyo compatibility generation failed", 500);

  try {
    if (accessType === "subscription") {
      const ledger = await MonthlyCreditLedger.findOne({
        _id: evidenceId,
        userId,
        type: "MONTHLY_CREDIT_SPEND",
        serviceKey: FEATURE_KEY,
        "metadata.refundedForServiceExecution": { $ne: true },
      }).lean();
      if (!ledger) return false;
      const refundCredit = Math.max(0, Math.floor(Number(ledger.amount || 0)));
      const marked = await MonthlyCreditLedger.updateOne(
        { _id: ledger._id, userId, "metadata.refundedForServiceExecution": { $ne: true } },
        { $set: { "metadata.refundedForServiceExecution": true, "metadata.serviceExecutionRefundedAt": now, "metadata.serviceExecutionFailureMessage": failureMessage } },
      );
      if (!marked.modifiedCount) return false;
      if (refundCredit > 0) {
        // 복원분은 신규 30일 lot으로 재적립(lotId=원장 id로 멱등).
        await restoreMonthlyCreditLot({
          userId,
          lotId: `sukuyo-refund:${String(ledger._id)}`,
          amount: refundCredit,
        }).catch(() => {});
      }
      return true;
    }

    // accessType === "paid" → 코인 PointHistory 차감 역계산.
    const history = await PointHistory.findOne({
      _id: evidenceId,
      userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      "metadata.refundedForServiceExecution": { $ne: true },
    }).lean();
    if (!history) return false;
    const refundCoins = Math.max(0, Math.floor(Math.abs(Number(history.delta || history?.metadata?.chargedCoins || COIN_PRICE || 0))));
    const marked = await PointHistory.updateOne(
      { _id: history._id, userId, "metadata.refundedForServiceExecution": { $ne: true } },
      { $set: { "metadata.refundedForServiceExecution": true, "metadata.serviceExecutionRefundedAt": now, "metadata.serviceExecutionFailureMessage": failureMessage } },
    );
    if (!marked.modifiedCount) return false;
    if (refundCoins > 0) {
      const updated = await User.findByIdAndUpdate(userId, { $inc: { points: refundCoins } }, { new: true, projection: { points: 1 } }).lean();
      await PointHistory.create({
        userId,
        kind: "refund",
        delta: refundCoins,
        balanceAfter: Math.max(0, Math.floor(Number(updated?.points || 0))),
        reason: `${COMPATIBILITY_TITLE} 생성 실패 환급`,
        featureKey: FEATURE_KEY,
        metadata: {
          refundedForServiceExecution: true,
          originalPointHistoryId: String(history._id || ""),
          failureMessage,
        },
      }).catch(() => {});
    }
    return true;
  } catch (restoreError) {
    logSukyoAi("[Sukyo AI LLM Refund Failed]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      accessType,
      evidenceId,
      errorMessage: clean(restoreError?.message || restoreError, 300),
    }, restoreError, env);
    return false;
  }
}

async function recordSuccessfulUsage(auth, idempotencyKey, access, consultation, now) {
  const accessMethod = executionAccessMethod(access.accessType);
  await PaidExecutionRecord.findOneAndUpdate(
    {
      userId: String(auth.userId || ""),
      featureId: FEATURE_KEY,
      profileId: "default",
      requestId: idempotencyKey,
    },
    {
      $setOnInsert: {
        executionId: `${FEATURE_KEY}:${auth.userId}:${idempotencyKey}`.slice(0, 160),
        requestId: idempotencyKey,
        userId: String(auth.userId || ""),
        featureId: FEATURE_KEY,
        profileId: "default",
        accessMode: "per_use",
        accessMethod,
        amountCoins: accessMethod === "single" ? COIN_PRICE : 0,
        amountKRW: accessMethod === "single" ? AMOUNT_KRW : 0,
        monthlyDeductedAmount: accessMethod === "monthly" ? COIN_PRICE : 0,
        paymentId: access.paymentId || "",
        orderId: access.paymentId || idempotencyKey,
        consumedAt: now,
        idempotencyKey: `${FEATURE_KEY}:${auth.userId}:${idempotencyKey}`.slice(0, 180),
      },
      $set: {
        status: "completed",
        completedAt: now,
        resultId: String(consultation._id || ""),
        result: {
          consultationId: String(consultation._id || ""),
          featureKey: FEATURE_KEY,
          accessType: access.accessType,
        },
      },
    },
    { upsert: true },
  );
}

async function handleStart(request, env) {
  let auth = null;
  try {
    auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  } catch (error) {
    // 일시적 DB 장애는 로그아웃 유발 401이 아니라 재시도 가능한 503으로 흘려보낸다.
    if (isTransientMongoError(error)) throw error;
    return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
  }
  const body = await readJson(request);
  const normalized = normalizeInput(body);
  const idempotencyKey = normalizeId(body.idempotencyKey || request.headers.get("idempotency-key") || `sukuyo-ai-${Date.now().toString(36)}`);
  logSukyoAi("[Sukyo AI LLM Generate Start]", {
    route: "/api/sukuyo-compatibility-ai/generate",
    requestId: idempotencyKey,
    consultationType: normalized.consultationType,
  });
  logSukyoAi("[Sukyo AI LLM Payload Validated]", {
    route: "/api/sukuyo-compatibility-ai/generate",
    requestId: idempotencyKey,
    consultationType: normalized.consultationType,
    validation: { ok: normalized.ok, errors: normalized.errors },
    personA: normalized.personA,
    personB: normalized.consultationType === "compatibility" ? normalized.personB : null,
  });
  if (!normalized.ok) return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput, errors: normalized.errors }, { status: 422 });
  const lockKey = `${auth.userId}:${idempotencyKey}`;
  if (startLocks.has(lockKey)) return startLocks.get(lockKey);

  const pending = (async () => {
    await connectDb(env);
    const existing = await SukuyoCompatibilityAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
    if (existing) return json({ ok: true, consultation: serializeConsultation(existing), reused: true });
    const accessHash = await inputHash(normalized);
    logSukyoAi("[Sukyo AI LLM Access Check Start]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      requestId: idempotencyKey,
      consultationType: normalized.consultationType,
    });
    const access = await resolveStartAccess(request, env, auth, body, normalized, accessHash);
    if (!access.ok) {
      logSukyoAi("[Sukyo AI LLM Access Check Success]", {
        route: "/api/sukuyo-compatibility-ai/generate",
        requestId: idempotencyKey,
        consultationType: normalized.consultationType,
        accessGranted: false,
      });
      return json({ ok: false, reason: "PAYMENT_REQUIRED", paymentPayload: buildPaymentPayload(idempotencyKey), message: MESSAGES.paymentRequired }, { status: 402 });
    }
    logSukyoAi("[Sukyo AI LLM Access Check Success]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      requestId: idempotencyKey,
      consultationType: normalized.consultationType,
      accessGranted: true,
      accessType: access.accessType,
    });
    let calculation;
    let firstAnswer;
    try {
      calculation = calculateSukuyo(normalized);
      firstAnswer = normalized.consultationType === "compatibility"
        // 궁합은 웨이브 1만 만들고 응답한다. 나머지 4웨이브는 /continue 가 이어 받는다 —
        // 20장을 한 요청에 몰면 엣지 100초 컷에 걸려 결제만 되고 결과가 사라진다.
        ? await createCompatibilityAnswer(env, { ...normalized, idempotencyKey }, calculation)
        : await createPersonalAnswer(env, { ...normalized, idempotencyKey }, calculation);
    } catch (genError) {
      // 선차감된 코인/월정석이 있으면 되돌린 뒤 에러를 전파한다.
      const restored = await restorePrepaidAccessOnFailure(env, auth, access, genError).catch(() => false);
      logSukyoAi("[Sukyo AI LLM Refund Or Restore]", {
        route: "/api/sukuyo-compatibility-ai/generate",
        requestId: idempotencyKey,
        consultationType: normalized.consultationType,
        restored,
      }, restored ? null : genError, env);
      throw genError;
    }
    const now = new Date();
    const storedPersonB = normalized.consultationType === "personal" ? {
      name: "",
      gender: "unknown",
      birthDate: normalized.personA.birthDate,
      birthTime: "",
      calendarType: normalized.personA.calendarType,
      isLeapMonth: normalized.personA.isLeapMonth,
      shuku: "개인 상담",
      shukuIndex: null,
    } : {
      name: normalized.personB.name,
      gender: normalized.personB.gender,
      birthDate: normalized.personB.birthDate,
      birthTime: normalized.personB.birthTime,
      calendarType: normalized.personB.calendarType,
      isLeapMonth: normalized.personB.isLeapMonth,
      shuku: calculation.sukuyoResult.personBShuku,
      shukuIndex: calculation.personBSukuyo.index,
    };
    try {
      const created = await SukuyoCompatibilityAiConsultation.create({
        userId: auth.userId,
        idempotencyKey,
        personA: {
          name: normalized.personA.name,
          gender: normalized.personA.gender,
          birthDate: normalized.personA.birthDate,
          birthTime: normalized.personA.birthTime,
          calendarType: normalized.personA.calendarType,
          isLeapMonth: normalized.personA.isLeapMonth,
          shuku: calculation.sukuyoResult.personAShuku,
          shukuIndex: calculation.personASukuyo.index,
        },
        personB: storedPersonB,
        sukuyoResult: calculation.sukuyoResult,
        relationshipType: normalized.relationshipType,
        topic: normalized.topic,
        accessType: access.accessType,
        paymentId: access.paymentId || paymentIdFromBody(body),
        messages: [
          { role: "user", content: normalized.question, createdAt: now },
          { role: "assistant", content: firstAnswer.content, createdAt: now },
        ],
        provider: firstAnswer.provider,
        model: firstAnswer.model,
      });
      await recordSuccessfulUsage(auth, idempotencyKey, access, created, now);
      return json({ ok: true, consultation: serializeConsultation(created) });
    } catch (error) {
      if (Number(error?.code) === 11000) {
        const duplicate = await SukuyoCompatibilityAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
        if (duplicate) return json({ ok: true, consultation: serializeConsultation(duplicate), reused: true });
      }
      throw error;
    }
  })().catch((error) => {
    const status = Number(error?.status || 500);
    const code = clean(error?.code || "SERVER_ERROR");
    const message = code === "LLM_FAILED"
      ? MESSAGES.llmFailed
      : code === "CALCULATION_FAILED"
        ? MESSAGES.calculationFailed
        : MESSAGES.serverFailed;
    logSukyoAi("[Sukyo AI LLM Error]", {
      route: "/api/sukuyo-compatibility-ai/generate",
      requestId: idempotencyKey,
      consultationType: normalized.consultationType,
      errorMessage: clean(error?.message || ""),
    }, error, env);
    return json({ ok: false, reason: code, message }, { status: status >= 400 && status < 600 ? status : 500 });
  }).finally(() => {
    startLocks.delete(lockKey);
  });
  startLocks.set(lockKey, pending);
  return pending;
}

function buildFollowupPrompt(consultation, userMessage) {
  return [
    "아래 기존 숙요점 궁합 상담 맥락을 이어서 답변하세요.",
    "계산된 27숙과 관계 유형을 바꾸지 마세요.",
    "상대방의 마음을 확정하지 말고, 건강한 관계 선택을 돕는 상담으로 답하세요.",
    "",
    "[숙요점 계산 요약]",
    JSON.stringify({
      personA: consultation.personA,
      personB: consultation.personB,
      sukuyoResult: consultation.sukuyoResult,
      relationshipType: consultation.relationshipType,
      topic: consultation.topic,
    }),
    "",
    "[최근 상담 흐름]",
    (consultation.messages || []).slice(-6).map((item) => `${item.role}: ${clean(item.content, 1800)}`).join("\n\n"),
    "",
    `[사용자 추가 질문]\n${userMessage}`,
  ].join("\n");
}

async function handleMessage(request, env) {
  let auth = null;
  try {
    auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  } catch (error) {
    // 일시적 DB 장애는 로그아웃 유발 401이 아니라 재시도 가능한 503으로 흘려보낸다.
    if (isTransientMongoError(error)) throw error;
    return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
  }
  const body = await readJson(request);
  const sessionId = clean(body.sessionId || body.consultationId || body.id);
  const content = clean(body.message || body.content || body.question, 1600);
  if (!/^[0-9a-f]{24}$/i.test(sessionId) || content.length < 2) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 422 });
  }
  await connectDb(env);
  const consultation = await SukuyoCompatibilityAiConsultation.findOne({ _id: sessionId, userId: auth.userId });
  if (!consultation) return json({ ok: false, reason: "NOT_FOUND", message: "상담 내역을 찾지 못했습니다." }, { status: 404 });
  const ai = await callGeminiText(env, buildFollowupPrompt(consultation, content), {
    systemPrompt: await cmsPromptText(env, "sukuyo-compatibility", SYSTEM_PROMPT),
    taskType: "fortune",
    temperature: 0.72,
    maxOutputTokens: 2600,
    // PREMIUM_GEMINI_TIMEOUT_MS(운영 45초)를 || 체인에서 뺀다 — 초기 상담 경로(위)와 동일한 45초 단락 함정 방지.
    timeoutMs: Number(env.SUKUYO_COMPAT_AI_TIMEOUT_MS) || 55000,
  });
  const provider = clean(ai?.provider || "");
  const model = clean(ai?.model || "");
  const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
  const answer = sanitizeConsultationText(ai?.text || "");
  if (!ai?.ok || isMock || answer.length < 80) {
    logSukyoAi("[Sukyo AI LLM Error]", {
      route: "/api/sukuyo-compatibility-ai/message",
      requestId: sessionId,
      consultationType: consultation.relationshipType === "개인 상담" ? "personal" : "compatibility",
      providerReason: isMock ? "mock_provider_blocked" : provider || model || "llm_failed",
      errorMessage: clean(ai?.error || ai?.message || "LLM_FAILED"),
    }, null, env);
    return json({ ok: false, reason: "LLM_FAILED", message: MESSAGES.llmFailed }, { status: 503 });
  }
  const now = new Date();
  consultation.messages.push({ role: "user", content, createdAt: now });
  consultation.messages.push({ role: "assistant", content: answer, createdAt: now });
  consultation.provider = provider || consultation.provider;
  consultation.model = model || consultation.model;
  await consultation.save();
  return json({ ok: true, consultation: serializeConsultation(consultation), message: { role: "assistant", content: answer, createdAt: now } });
}

async function handleResult(request, env) {
  let auth = null;
  try {
    auth = await requireAuth(request, env, { userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION });
  } catch (error) {
    // 일시적 DB 장애는 로그아웃 유발 401이 아니라 재시도 가능한 503으로 흘려보낸다.
    if (isTransientMongoError(error)) throw error;
    return json({ ok: false, reason: "LOGIN_REQUIRED", message: MESSAGES.login }, { status: 401 });
  }
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("id") || url.searchParams.get("sessionId"), 60);

  await connectDb(env);
  if (!sessionId) {
    const rows = await SukuyoCompatibilityAiConsultation.find({ userId: auth.userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("personA.name personA.shuku personB.name personB.shuku sukuyoResult.relationType relationshipType createdAt updatedAt")
      .lean();
    return json({
      ok: true,
      consultations: rows.map((row) => ({
        id: String(row._id),
        personAName: clean(row.personA?.name, 80) || "나",
        personAShuku: clean(row.personA?.shuku, 20),
        personBName: clean(row.personB?.name, 80) || "상대",
        personBShuku: clean(row.personB?.shuku, 20),
        relationType: clean(row.sukuyoResult?.relationType, 20),
        relationshipType: clean(row.relationshipType, 40),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
    });
  }

  if (!/^[0-9a-f]{24}$/i.test(sessionId)) {
    return json({ ok: false, reason: "INVALID_INPUT", message: MESSAGES.invalidInput }, { status: 422 });
  }
  const consultation = await SukuyoCompatibilityAiConsultation.findOne({ _id: sessionId, userId: auth.userId }).lean();
  if (!consultation) return json({ ok: false, reason: "NOT_FOUND", message: "상담 내역을 찾지 못했습니다." }, { status: 404 });
  return json({ ok: true, consultation: serializeConsultation(consultation) });
}

export async function handleSukuyoCompatibilityAiRoutes(request, env = {}) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/sukuyo-compatibility-ai");
  if (method === "GET" && path === "/result") {
    try {
      return await handleResult(request, env);
    } catch (error) {
      logSukyoAi("[Sukyo AI LLM Error]", { route: "/api/sukuyo-compatibility-ai/result", errorMessage: clean(error?.message || error, 500) }, error, env);
      // 폴링은 이미 인가된 세션의 결과 조회다. 일시적 DB/인증 장애를 하드 500으로 내리면 폴링이 종료돼
      // 로그아웃/실패로 굳으므로, 재시도 가능한 503으로 흘려보내 클라가 자가복구하게 한다(전 AI 라우트 정본).
      if (isTransientMongoError(error) || isAuthDbInfraError(error)) {
        return json({ ok: false, retryable: true, reason: "DB_DEGRADED", message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
      }
      return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.serverFailed }, { status: 500 });
    }
  }
  if (method !== "POST") return methodNotAllowed();
  try {
    if (path === "/basis") return await handleBasis(request, env);
    if (path === "/ensure-access" || path === "/prepare") return await handleEnsureAccess(request, env);
    if (path === "/start" || path === "/generate") return await handleStart(request, env);
    if (path === "/message") return await handleMessage(request, env);
    return notFound();
  } catch (error) {
    logSukyoAi("[Sukyo AI LLM Error]", {
      route: `/api/sukuyo-compatibility-ai${path}`,
      requestId: request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key"),
      errorMessage: clean(error?.message || error, 500),
    }, error, env);
    // 풀 초기화 버스트/인증 조회 중 일시 DB 장애는 재시도 신호와 함께 503으로 — 하드 500 방지(전 AI 라우트 정본).
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) {
      return json({
        ok: false,
        retryable: true,
        reason: "DB_DEGRADED",
        message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }
    return json({ ok: false, reason: "SERVER_ERROR", message: MESSAGES.serverFailed }, { status: 500 });
  }
}

// 검증 하네스(verify-analysis-basis-contract)가 순수 계산 경로만 따로 돌려 보기 위한 노출.
export const __sukuyoCompatibilityAiTestUtils = {
  FEATURE_KEY,
  normalizeInput,
  calculateSukuyo,
  buildSukuyoAnalysisBasis,
  buildFirstPrompt,
  buildSectionGroupPrompt,
  buildSummaryPrompt,
  buildSukuyoRelationAxes,
  extractSectionBody,
  SUKUYO_SECTION_SPECS,
  SUKUYO_AXIS_SPECS,
  SUKUYO_SECTION_GROUPS,
  SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS,
  SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS,
};
