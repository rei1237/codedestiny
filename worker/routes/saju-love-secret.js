import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { LOVE_SECRET_MODE_CONFIG } from "../lib/saju-premium-chapters.js";
import { buildLoveSecretReference } from "../lib/love-secret-reference.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { connectDb, mongoose } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const LOVE_SECRET_SERVICE_KEY = "saju-love-secret";
const LOVE_SECRET_FEATURE_KEY_BY_MODE = Object.freeze({
  solo: "premium_pdf_saju_love_secret",
  compatibility: "premium_pdf_saju_love_secret_compat",
});
const LOVE_SECRET_JOB_COLLECTION = "premium_report_jobs";

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

function isPremiumReportPaymentBypassEnabled(env) {
  return isTruthyFlag(env?.BYPASS_PREMIUM_REPORT_PAYMENT) || isTruthyFlag(env?.ALLOW_TEST_PREMIUM_REPORT_PAYMENT);
}

function isPremiumReportTestMode(env) {
  return !isProductionRuntime(env) || isPremiumReportPaymentBypassEnabled(env);
}
const LOVE_SECRET_JOB_POLL_AFTER_MS = 4000;
const LOVE_SECRET_LOCK_TTL_MS = 1000 * 60 * 20;
const LOVE_SECRET_GENERATION_LOCKS = new Map();
const LOVE_SECRET_PDF_CONFIG = Object.freeze({
  generationMode: "local-assembled",
  llmEnabled: false,
  provider: "saju-assembler",
  templateVersion: "love-secret-local-assembled-v3",
});
const LOVE_SECRET_FORBIDDEN_RE = /\b(?:fallback|payload|json|schema|debug|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank|raw)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다|로컬\s*엔진|계산\s*시그니처|내부\s*데이터|엔진\s*결과|데이터\s*정규화|품질\s*검증|재생성/gi;
const LOVE_SECRET_MANUSCRIPT_SOURCE = Object.freeze({
  LOCAL: "local-assembled",
  LLM: "external-llm-disabled",
  HYBRID: "local-assembled",
});
const LOVE_SECRET_PRODUCT_ID = "love_secret";
const LOVE_SECRET_PROMPT_VERSION = "love-secret-local-assembler-v3";
const LOVE_SECRET_ENGINE_VERSION = "worker-saju-engine.v1";
const LOVE_SECRET_LLM_ENHANCEMENT_CACHE = new Map();
const LOVE_SECRET_LLM_ENHANCEMENT_CACHE_MAX = 240;
const LOVE_SECRET_PDF_CACHE = new Map();
const LOVE_SECRET_PDF_CACHE_MAX = 120;
const LOVE_SECRET_SOLO_CHAPTER_IDS = Object.freeze([
  "love_overview",
  "attraction_pattern",
  "relationship_pattern",
  "love_expression",
  "love_risk_pattern",
  "ideal_partner_gap",
  "breakup_risk",
  "intimacy_pattern",
  "love_luck_cycles",
  "love_master_plan",
]);
const LOVE_SECRET_COMPATIBILITY_CHAPTER_IDS = Object.freeze([
  "couple_code",
  "first_attraction",
  "emotional_match",
  "communication_match",
  "conflict_match",
  "reconciliation_match",
  "reality_match",
  "long_term_relation",
  "current_year_flow",
  "couple_master_plan",
]);
const LOVE_SECRET_SOLO_LLM_ENHANCED_CHAPTERS = LOVE_SECRET_SOLO_CHAPTER_IDS;
const LOVE_SECRET_COUPLE_LLM_ENHANCED_CHAPTERS = LOVE_SECRET_COMPATIBILITY_CHAPTER_IDS;
const LOVE_SECRET_SENSITIVE_EXPRESSION_REPLACEMENTS = Object.freeze([
  Object.freeze([/반드시\s*결혼한다/g, "장기 관계로 이어질 가능성을 차분히 살펴볼 수 있다"]),
  Object.freeze([/무조건\s*헤어진다/g, "관계가 흔들리기 쉬운 지점이 있어 조율이 필요하다"]),
  Object.freeze([/100\s*%\s*운명의\s*상대/g, "인연의 반응이 강하게 느껴질 수 있는 상대"]),
  Object.freeze([/운명의\s*상대다/g, "인연의 반응이 강하게 느껴질 수 있다"]),
  Object.freeze([/반드시\s*재회한다/g, "다시 가까워질 가능성은 대화와 상황 정리에 달려 있다"]),
  Object.freeze([/절대\s*안\s*맞는다/g, "서로의 속도와 기대치가 다를 수 있다"]),
  Object.freeze([/집착이\s*심하다/g, "감정적으로 몰입되는 속도가 빨라질 수 있다"]),
  Object.freeze([/바람기가\s*있다/g, "새로운 자극에 예민하게 반응할 수 있다"]),
  Object.freeze([/배신할\s*사람/g, "신뢰 확인과 경계 조율이 필요한 사람"]),
  Object.freeze([/반드시\s*헤어진다/g, "관계가 흔들리기 쉬운 지점이 있으므로 조율이 필요하다"]),
  Object.freeze([/이\s*사람과는\s*절대\s*안\s*된다/g, "서로의 속도와 기대치가 다를 수 있다"]),
  Object.freeze([/절대\s*안\s*맞는다/g, "서로의 속도와 기대치가 다를 수 있다"]),
  Object.freeze([/결혼하면\s*불행하다/g, "장기 관계로 갈수록 현실적인 역할 분담과 감정 소통이 중요하다"]),
  Object.freeze([/상대는\s*바람기가\s*있다/g, "새로운 자극에 쉽게 반응할 수 있어 관계의 안정감을 의식적으로 관리하는 것이 좋다"]),
  Object.freeze([/당신은\s*사랑받기\s*어렵다/g, "사랑을 받을 때 안심의 조건을 더 분명히 확인할 필요가 있다"]),
  Object.freeze([/평생\s*혼자일\s*수\s*있다/g, "인연의 속도가 느리게 열릴 수 있으므로 관계의 기준을 차분히 세우는 것이 좋다"]),
  Object.freeze([/집착이\s*심하다/g, "감정적으로 몰입도가 높아질 때 상대의 반응에 예민해질 수 있다"]),
  Object.freeze([/이혼한다/g, "관계의 현실 조율이 필요해질 수 있다"]),
  Object.freeze([/파국이다/g, "관계가 크게 흔들릴 수 있는 지점이 있다"]),
  Object.freeze([/배신당한다/g, "신뢰 확인과 경계 조율이 중요해질 수 있다"]),
]);
const LOVE_SECRET_FAST_DB_ENV_OVERRIDES = Object.freeze({
  // Keep async job bootstrapping well below Cloudflare's edge timeout window.
  MONGO_WORKER_CONNECT_GUARD_MS: "9000",
  MONGO_SERVER_SELECTION_TIMEOUT_MS: "6500",
  MONGO_CONNECT_TIMEOUT_MS: "6500",
  MONGO_SOCKET_TIMEOUT_MS: "12000",
  MONGO_WORKER_CONNECT_RETRIES: "0",
  MONGO_IP_FAMILY: "4",
});

const LOVE_SECRET_CANONICAL_FORBIDDEN_RE = /\b(?:fallback|payload|json|schema|debug|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank|raw|todo|fixme|placeholder)\b|자동\s*복구\s*생성|로컬\s*디버그|계산\s*시그니처|데이터\s*부족|검증\s*스키마/gi;

function loveSecretChapterMins(total, min) {
  return Object.freeze(Object.fromEntries(Array.from({ length: total }, (_, idx) => [idx + 1, min])));
}

const LOVE_SECRET_CANONICAL_SOLO_CHAPTERS = Object.freeze([
  { title: "나의 사랑 원형", subtitle: "일간·일지·월지로 읽는 연애의 기본 구조" },
  { title: "나를 끌어당기는 사람", subtitle: "배우자성, 오행 보완, 첫 끌림의 조건" },
  { title: "반복되는 연애 패턴", subtitle: "가까워질수록 드러나는 습관과 거리감" },
  { title: "마음 표현과 소통", subtitle: "말투, 침묵, 오해를 다루는 관계 언어" },
  { title: "불안과 안정감", subtitle: "애착의 흔들림을 관계의 힘으로 바꾸는 법" },
  { title: "결혼 인연과 배우자상", subtitle: "오래 갈 사람의 기질과 현실 조건" },
  { title: "이별과 회복", subtitle: "미련, 재회, 정리의 흐름을 사주로 읽기" },
  { title: "친밀감과 조후", subtitle: "몸과 마음의 온도, 속궁합의 우아한 해석" },
  { title: "연애운과 만남의 시기", subtitle: "대운·세운 흐름에서 열리는 관계의 창" },
  { title: "최종 연애 비책", subtitle: "나에게 맞는 사랑의 선택과 실천 루틴" },
]);

const LOVE_SECRET_CANONICAL_COMPAT_CHAPTERS = Object.freeze([
  { title: "두 사람의 사랑 구조 총론", subtitle: "궁합의 핵심 결을 한눈에 정리" },
  { title: "나의 연애 성향 요약", subtitle: "관계를 읽는 나의 기본 렌즈" },
  { title: "상대의 연애 성향 요약", subtitle: "상대를 이해하는 핵심 포인트" },
  { title: "일간 궁합과 기본 기질", subtitle: "두 사람 기질의 상호작용" },
  { title: "일지 궁합과 관계의 뿌리", subtitle: "생활 밀착 영역의 궁합 진단" },
  { title: "배우자성으로 보는 사랑의 기대치", subtitle: "서로가 관계에서 바라는 기준" },
  { title: "오행 균형으로 보는 감정 궁합", subtitle: "감정 온도와 안정감의 균형" },
  { title: "조후로 보는 속궁합과 친밀감", subtitle: "정서적 밀착과 몸의 편안함" },
  { title: "대화와 표현 궁합", subtitle: "말의 결이 맞는 지점과 엇갈림" },
  { title: "갈등과 화해 패턴", subtitle: "충돌의 구조와 회복의 방식" },
  { title: "이별과 재회 가능성", subtitle: "관계 지속의 조건과 한계" },
  { title: "결혼과 장기 관계 궁합", subtitle: "현실 생활로 이어질 가능성" },
  { title: "현실 문제와 관계 유지 전략", subtitle: "돈·일·가족·생활의 실제 조율" },
  { title: "두 사람의 운 흐름과 타이밍", subtitle: "대운·세운으로 보는 전환점" },
  { title: "두 사람을 위한 최종 사랑 전략", subtitle: "관계를 이어가거나 정리할 기준" },
]);

const LOVE_SECRET_CANONICAL_MODE_CONFIG = Object.freeze({
  solo: Object.freeze({
    mode: "solo",
    title: "사주 연애 비책",
    totalChapters: 10,
    minTotalChars: 36000,
    chapterMinDefault: 3000,
    chapterMinByIndex: loveSecretChapterMins(10, 3000),
    chapters: LOVE_SECRET_CANONICAL_SOLO_CHAPTERS,
  }),
  couple: Object.freeze({
    mode: "couple",
    title: "사주 궁합 비책",
    totalChapters: 15,
    minTotalChars: 54000,
    chapterMinDefault: 3500,
    chapterMinByIndex: loveSecretChapterMins(15, 3400),
    chapters: LOVE_SECRET_CANONICAL_COMPAT_CHAPTERS,
  }),
});

const SOLO_LOVE_CHAPTER_SPECS = Object.freeze([
  Object.freeze({
    number: "I",
    title: "나의 사랑 원형",
    categories: Object.freeze([
      "일간으로 보는 사랑에서의 자아",
      "일지 배우자궁이 말하는 관계 본능",
      "월지가 만드는 연애의 계절감",
      "오행 분포로 보는 애정 에너지",
      "십성 구조로 보는 사랑의 역할",
      "배우자성이 드러나는 방식",
      "내가 사랑에서 중요하게 여기는 가치",
      "나도 모르게 반복하는 관계 선택",
      "상대에게 비치는 나의 첫인상과 분위기",
      "나의 사랑 원형을 한 문장으로 정리",
    ]),
  }),
  Object.freeze({
    number: "II",
    title: "끌림의 공식",
    categories: Object.freeze([
      "내가 강하게 끌리는 사람의 오행",
      "내가 반응하는 십성 유형",
      "도화, 홍염, 문창, 역마 등 매력 코드",
      "외모보다 먼저 반응하는 분위기와 태도",
      "설렘이 빠르게 생기는 조건",
      "천천히 깊어지는 안정적 끌림의 조건",
      "위험하지만 강하게 끌리는 유형",
      "내 사주가 가진 연애 매력 포인트",
      "상대가 나에게 끌리는 지점",
      "좋은 끌림과 소모적인 끌림을 구분하는 기준",
    ]),
  }),
  Object.freeze({
    number: "III",
    title: "연애 패턴 분석",
    categories: Object.freeze([
      "연애를 시작하는 방식",
      "호감이 생겼을 때의 행동 패턴",
      "관계가 깊어질수록 드러나는 모습",
      "권태기가 올 때의 반응",
      "비겁, 식상, 재성, 관성, 인성으로 보는 연애 습관",
      "반복해서 만나는 상대 유형",
      "연애에서 주도권을 잡는 방식",
      "상대에게 맞추는 정도와 자기주장",
      "현재 대운이 연애 패턴에 주는 영향",
      "2026년 세운이 연애 흐름에 주는 영향",
    ]),
  }),
  Object.freeze({
    number: "IV",
    title: "표현과 소통",
    categories: Object.freeze([
      "감정을 표현하는 기본 방식",
      "식상으로 보는 말과 표현력",
      "인성으로 보는 이해와 공감 방식",
      "관성으로 보는 책임감과 약속 태도",
      "재성으로 보는 현실적 배려",
      "연락 빈도와 소통 리듬",
      "갈등 상황에서의 말투",
      "상대가 오해하기 쉬운 표현",
      "고백, 사과, 화해에 유리한 방식",
      "연애운을 살리는 소통 습관",
    ]),
  }),
  Object.freeze({
    number: "V",
    title: "연애에서의 불안과 집착",
    categories: Object.freeze([
      "불안이 올라오는 사주적 조건",
      "관계에서 집착이 생기는 패턴",
      "질투와 비교심이 생기는 지점",
      "버림받을까 봐 두려워지는 순간",
      "상대에게 확인받고 싶은 욕구",
      "회피와 밀어내기가 나타나는 조건",
      "비겁, 인성, 관성, 재성의 불안 구조",
      "내가 스스로를 지키기 위해 하는 방어",
      "불안을 낮추는 현실적 루틴",
      "건강한 애착을 만들기 위한 관계 연습",
    ]),
  }),
  Object.freeze({
    number: "VI",
    title: "결혼운과 배우자운",
    categories: Object.freeze([
      "배우자성의 위치와 강약",
      "배우자궁의 안정성",
      "내가 원하는 결혼의 형태",
      "결혼 후 역할 분담 성향",
      "현실적으로 잘 맞는 배우자 조건",
      "결혼운이 열리기 쉬운 대운과 세운",
      "결혼 이야기가 막히기 쉬운 시기",
      "결혼 전 반드시 확인해야 할 가치관",
      "배우자와 갈등이 생기기 쉬운 지점",
      "좋은 결혼으로 이어지기 위한 선택 기준",
    ]),
  }),
  Object.freeze({
    number: "VII",
    title: "이별과 재회 패턴",
    categories: Object.freeze([
      "이별이 발생하기 쉬운 관계 구조",
      "내가 마음이 식는 방식",
      "상대가 멀어질 때 내가 보이는 반응",
      "미련이 오래 남는 사주적 이유",
      "재회를 바라는 마음과 실제 인연의 구분",
      "재회 가능성을 높이는 조건",
      "재회를 피해야 하는 조건",
      "반복되는 이별 패턴을 끊는 방법",
      "이별 후 회복에 필요한 시간과 방식",
      "새로운 사랑으로 넘어가기 위한 정리법",
    ]),
  }),
  Object.freeze({
    number: "VIII",
    title: "조후로 보는 친밀감과 속궁합",
    categories: Object.freeze([
      "한난조습으로 보는 나의 친밀감 온도",
      "차가운 기운과 뜨거운 기운이 애정 표현에 주는 영향",
      "건조한 기운과 습한 기운이 정서적 밀착에 주는 영향",
      "내가 편안하게 느끼는 스킨십 리듬",
      "관계가 과열되기 쉬운 조건",
      "관계가 차갑게 식기 쉬운 조건",
      "정서적 안정감을 느끼는 분위기",
      "친밀감에서 필요한 배려와 속도",
      "속궁합을 높이는 생활 리듬과 소통",
      "성적 단정이 아니라 조후 기반 친밀감 경향임을 명시",
    ]),
  }),
  Object.freeze({
    number: "IX",
    title: "좋은 인연을 만나는 시기와 조건",
    categories: Object.freeze([
      "좋은 인연이 들어오기 쉬운 대운",
      "연애운이 강해지는 세운",
      "2026년에 인연운이 움직이는 달",
      "용신과 희신이 살아나는 만남 조건",
      "나에게 맞는 만남 장소와 환경",
      "소개, 모임, 앱, 직장, 취미 중 유리한 경로",
      "피해야 할 만남의 조건",
      "인연을 놓치기 쉬운 나의 습관",
      "좋은 사람을 알아보는 기준",
      "인연운을 현실에서 활성화하는 행동 계획",
    ]),
  }),
  Object.freeze({
    number: "X",
    title: "나를 위한 연애 마스터플랜",
    categories: Object.freeze([
      "내 연애의 핵심 한 문장",
      "반드시 살려야 할 매력",
      "반드시 관리해야 할 약점",
      "이상적인 상대의 구체적 조건",
      "피해야 할 상대 유형",
      "앞으로 90일 연애 행동 계획",
      "앞으로 1년 연애 행동 계획",
      "관계가 시작됐을 때 지켜야 할 원칙",
      "이별과 재회를 대하는 기준",
      "나에게 주는 최종 연애 조언",
    ]),
  }),
]);

const SOLO_LOVE_CHAPTER_QUALITY_GUIDES = Object.freeze({
  I: Object.freeze({
    readerQuestion: "나는 사랑에서 어떤 사람으로 보이고, 무엇 때문에 사랑받을 수 있을까?",
    emotionalHook: "자기 이해와 매력 확신",
    mustAnswer: Object.freeze(["내 사랑의 원형", "상대에게 비치는 첫 분위기", "반복되는 선택의 이유", "사랑에서 지켜야 할 가치"]),
    premiumPromise: "독자가 스스로를 더 다정하고 품격 있게 바라보게 만드는 첫 장으로 씁니다.",
  }),
  II: Object.freeze({
    readerQuestion: "나는 왜 특정한 사람에게 흔들리고, 누가 나에게 진짜 좋은 끌림일까?",
    emotionalHook: "설렘의 이유와 위험한 끌림의 구분",
    mustAnswer: Object.freeze(["끌리는 오행과 십성", "상대가 나에게 끌리는 지점", "소모적인 끌림의 신호", "건강한 설렘의 기준"]),
    premiumPromise: "설렘을 부정하지 않으면서도 독자가 자기 편의 선택 기준을 갖게 합니다.",
  }),
  III: Object.freeze({
    readerQuestion: "왜 나는 연애에서 비슷한 장면을 반복할까?",
    emotionalHook: "반복 패턴을 자책이 아니라 이해로 바꾸는 안도감",
    mustAnswer: Object.freeze(["시작 방식", "깊어질 때의 반응", "권태와 거리감", "반복해서 만나는 상대 유형"]),
    premiumPromise: "독자가 관계의 반복을 운명처럼 단정하지 않고, 바꿀 수 있는 습관으로 정리하게 합니다.",
  }),
  IV: Object.freeze({
    readerQuestion: "내 말과 표현은 사랑을 키울까, 오해를 만들까?",
    emotionalHook: "말의 온도와 사랑받는 표현 방식",
    mustAnswer: Object.freeze(["감정 표현 방식", "연락과 대화 리듬", "오해받기 쉬운 말투", "화해에 유리한 표현"]),
    premiumPromise: "독자가 바로 쓸 수 있는 부드러운 문장과 관계 회복 대화법을 줍니다.",
  }),
  V: Object.freeze({
    readerQuestion: "나는 왜 사랑할수록 불안해지고 확인받고 싶어질까?",
    emotionalHook: "불안을 숨기지 않고 안정감으로 돌리는 위로",
    mustAnswer: Object.freeze(["불안이 올라오는 조건", "집착과 회피 패턴", "확인 욕구", "건강한 애착 루틴"]),
    premiumPromise: "독자가 불안을 부끄러운 약점이 아니라 사랑을 안전하게 배우는 신호로 해석하게 합니다.",
  }),
  VI: Object.freeze({
    readerQuestion: "나는 어떤 사람과 오래 가고, 결혼을 현실로 만들 수 있을까?",
    emotionalHook: "사랑이 생활로 이어지는 현실적 안정감",
    mustAnswer: Object.freeze(["배우자성의 강약", "장기 관계 조건", "역할 분담 성향", "결혼 전 확인할 가치관"]),
    premiumPromise: "독자가 결혼을 단정하지 않고 오래 갈 관계의 품격 있는 기준을 세우게 합니다.",
  }),
  VII: Object.freeze({
    readerQuestion: "이별과 재회 앞에서 나는 무엇을 붙잡고 무엇을 놓아야 할까?",
    emotionalHook: "미련을 선택 기준으로 정리하는 단단함",
    mustAnswer: Object.freeze(["이별 신호", "미련이 남는 이유", "재회를 생각할 조건", "새 사랑으로 넘어가는 정리법"]),
    premiumPromise: "재회를 부추기지 않고 독자의 자존과 회복을 우선하는 문장으로 씁니다.",
  }),
  VIII: Object.freeze({
    readerQuestion: "나는 어떤 친밀감의 속도와 온도에서 가장 편안할까?",
    emotionalHook: "몸과 마음의 편안함을 함께 살피는 섬세함",
    mustAnswer: Object.freeze(["조후 기반 친밀감 온도", "정서적 밀착 속도", "편안한 스킨십 리듬", "건강한 거리감"]),
    premiumPromise: "독자가 노골적인 표현 없이 조후를 바탕으로 친밀감과 속궁합의 정서적 결을 이해하게 합니다.",
  }),
  IX: Object.freeze({
    readerQuestion: "좋은 인연은 언제, 어디서, 어떤 조건으로 들어올까?",
    emotionalHook: "기다림을 현실 행동으로 바꾸는 기대감",
    mustAnswer: Object.freeze(["좋은 인연의 시기", "유리한 만남 경로", "피해야 할 조건", "인연운 활성화 행동"]),
    premiumPromise: "독자가 운의 타이밍을 막연한 예언이 아니라 실행 가능한 만남 전략으로 바꾸게 합니다.",
  }),
  X: Object.freeze({
    readerQuestion: "앞으로 나는 어떤 사랑을 선택해야 더 예뻐질까?",
    emotionalHook: "90일 실천과 1년 방향을 정리하는 마지막 확신",
    mustAnswer: Object.freeze(["핵심 매력", "관리할 약점", "이상적인 상대 조건", "90일 행동 계획", "최종 선택 기준"]),
    premiumPromise: "독자가 PDF를 덮은 뒤 바로 실행할 수 있는 연애 마스터플랜으로 마무리합니다.",
  }),
});

function getSoloLoveChapterQualityGuide(chapterSpec = {}) {
  const chapterNumber = clean(chapterSpec?.number || "");
  const guide = SOLO_LOVE_CHAPTER_QUALITY_GUIDES[chapterNumber] || {};
  return {
    chapterNumber,
    chapterTitle: clean(chapterSpec?.title || ""),
    readerQuestion: clean(guide.readerQuestion || "이 장에서 독자의 사랑 선택 기준을 분명하게 정리합니다."),
    emotionalHook: clean(guide.emotionalHook || "자기 이해와 현실적 실천"),
    mustAnswer: Array.isArray(guide.mustAnswer) ? guide.mustAnswer.map((item) => clean(item)).filter(Boolean) : [],
    premiumPromise: clean(guide.premiumPromise || "사주 근거를 바탕으로 감정과 현실 행동을 함께 제시합니다."),
  };
}

const COMPATIBILITY_LOVE_CHAPTER_SPECS = Object.freeze([
  Object.freeze({
    number: "I",
    title: "두 사람의 사랑 구조 총론",
    categories: Object.freeze(["첫눈에 느껴지는 관계의 결", "일간·일지·월지 핵심 궁합", "끌림과 안정감의 균형", "관계를 흔드는 반복 신호", "두 사람의 최종 궁합 한 문장"]),
  }),
  Object.freeze({
    number: "II",
    title: "나의 연애 성향 요약",
    categories: Object.freeze(["내가 사랑에서 원하는 것", "내가 안심하는 표현 방식", "서운함이 올라오는 순간", "관계에서 지키고 싶은 품위", "내가 먼저 바꿀 수 있는 태도"]),
  }),
  Object.freeze({
    number: "III",
    title: "상대의 연애 성향 요약",
    categories: Object.freeze(["상대가 사랑에서 원하는 것", "상대가 안심하는 표현 방식", "상대가 멀어지는 순간", "상대의 마음을 여는 문장", "상대를 품격 있게 이해하는 법"]),
  }),
  Object.freeze({
    number: "IV",
    title: "일간 궁합과 기본 기질",
    categories: Object.freeze(["두 일간이 서로를 바라보는 방식", "처음 호감이 생기는 이유", "기질 차이가 매력으로 보이는 지점", "기질 차이가 상처가 되는 지점", "기본 궁합을 살리는 태도"]),
  }),
  Object.freeze({
    number: "V",
    title: "일지 궁합과 관계의 뿌리",
    categories: Object.freeze(["배우자궁이 맞물리는 방식", "생활 밀착에서 편안한 부분", "가까워질수록 예민해지는 부분", "오래 갈 수 있는 관계 습관", "두 사람의 일상 궁합 처방"]),
  }),
  Object.freeze({
    number: "VI",
    title: "배우자성으로 보는 사랑의 기대치",
    categories: Object.freeze(["내가 기대하는 연인의 역할", "상대가 기대하는 연인의 역할", "기대가 설렘으로 바뀌는 순간", "기대가 부담으로 바뀌는 순간", "서로를 지치게 하지 않는 약속"]),
  }),
  Object.freeze({
    number: "VII",
    title: "오행 균형으로 보는 감정 궁합",
    categories: Object.freeze(["부족한 기운을 채워주는 지점", "과잉 기운이 충돌하는 지점", "감정 온도가 맞는 순간", "안정감을 잃기 쉬운 상황", "오행 균형을 살리는 데이트와 대화"]),
  }),
  Object.freeze({
    number: "VIII",
    title: "조후로 보는 속궁합과 친밀감",
    categories: Object.freeze(["정서적 온도와 거리감", "친밀감의 속도 차이", "편안함을 느끼는 스킨십 태도", "부담스럽게 느껴질 수 있는 방식", "건강한 친밀감을 지키는 규칙"]),
  }),
  Object.freeze({
    number: "IX",
    title: "대화와 표현 궁합",
    categories: Object.freeze(["말이 잘 통하는 지점", "침묵이 오해가 되는 순간", "서운함을 안전하게 말하는 순서", "상대가 듣고 싶어 하는 확인 문장", "관계를 살리는 대화 루틴"]),
  }),
  Object.freeze({
    number: "X",
    title: "갈등과 화해 패턴",
    categories: Object.freeze(["갈등이 시작되는 원인", "싸울 때 각자 보이는 반응", "상처가 깊어지는 금지 문장", "화해가 쉬워지는 타이밍", "다시 가까워지는 회복 의식"]),
  }),
  Object.freeze({
    number: "XI",
    title: "이별과 재회 가능성",
    categories: Object.freeze(["멀어지는 초기 신호", "이별 위험이 커지는 관계 습관", "재회를 생각할 수 있는 조건", "붙잡기보다 정리해야 할 조건", "관계를 살리는 마지막 선택 기준"]),
  }),
  Object.freeze({
    number: "XII",
    title: "결혼과 장기 관계 궁합",
    categories: Object.freeze(["장기 관계로 이어질 수 있는 힘", "결혼 현실성의 강점", "가족·일·돈에서 조율할 지점", "약속이 무거워지는 시기", "함께 살아도 사랑이 남는 방식"]),
  }),
  Object.freeze({
    number: "XIII",
    title: "현실 문제와 관계 유지 전략",
    categories: Object.freeze(["돈과 소비 감각의 차이", "일과 목표가 관계에 미치는 영향", "가족과 주변 시선의 변수", "생활 계획을 맞추는 순서", "현실 문제를 사랑의 편으로 돌리는 법"]),
  }),
  Object.freeze({
    number: "XIV",
    title: "두 사람의 운 흐름과 타이밍",
    categories: Object.freeze(["좋은 흐름이 열리는 시기", "조심해야 할 전환점", "관계 결정에 유리한 때", "각자의 운이 엇갈릴 때의 운영", "함께 운을 살리는 공동 행동"]),
  }),
  Object.freeze({
    number: "XV",
    title: "두 사람을 위한 최종 사랑 전략",
    categories: Object.freeze(["두 사람의 최종 궁합 메시지", "반드시 지켜야 할 태도", "반드시 피해야 할 습관", "90일 관계 회복 루틴", "관계를 이어가거나 정리할 품격 있는 기준"]),
  }),
]);

const LOVE_SECRET_CANONICAL_SECTIONS = Object.freeze({
  solo: Object.freeze({
    1: ["사랑의 기본 기질", "일지에 숨어 있는 친밀감", "월지가 만드는 현실 조건", "강점과 약점", "연애의 핵심 처방"],
    2: ["끌림의 첫 신호", "배우자성의 방향", "오행 보완의 매력", "피해야 할 착각", "좋은 인연을 알아보는 법"],
    3: ["반복되는 시작", "가까워질 때의 반응", "상처받는 지점", "거리 조절법", "패턴을 바꾸는 실천"],
    4: ["말의 온도", "침묵의 의미", "서운함을 전하는 법", "오해를 줄이는 질문", "관계를 여는 대화법"],
    5: ["불안의 뿌리", "안정감을 느끼는 조건", "집착처럼 보이는 행동", "믿음을 회복하는 순서", "평온한 사랑의 루틴"],
    6: ["오래 갈 배우자상", "결혼에서 강해지는 부분", "현실에서 조율할 부분", "늦은 인연과 빠른 인연", "장기 관계의 조건"],
    7: ["이별의 반복 신호", "미련이 남는 이유", "재회 가능성의 조건", "정리해야 할 마음", "회복을 앞당기는 태도"],
    8: ["조후로 보는 친밀감", "정서적 체온", "속궁합의 리듬", "편안한 거리감", "건강한 스킨십의 태도"],
    9: ["연애운이 열리는 때", "만남이 들어오는 방식", "주의해야 할 시기", "좋은 사람을 고르는 기준", "운을 살리는 행동"],
    10: ["최종 사랑 메시지", "버려야 할 습관", "지켜야 할 태도", "나에게 맞는 선택", "오늘부터의 실천 비책"],
  }),
  compatibility: Object.freeze({
    1: ["관계의 기본 결", "두 일간의 만남", "두 일지의 생활감", "강한 끌림의 이유", "조율해야 할 약점"],
    2: ["내가 원하는 사랑", "내 방어 방식", "내가 서운해지는 지점", "내가 오래 머무는 조건", "내가 바꿀 수 있는 태도"],
    3: ["상대가 원하는 사랑", "상대의 방어 방식", "상대가 서운해지는 지점", "상대를 안심시키는 말", "상대를 이해하는 실천"],
    4: ["두 일간의 시선", "처음 호감의 이유", "기질 차이의 매력", "기질 차이의 상처", "기본 궁합을 살리는 태도"],
    5: ["배우자궁의 맞물림", "생활 밀착의 편안함", "가까워질수록 예민한 지점", "오래 갈 수 있는 습관", "일상 궁합 처방"],
    6: ["내가 기대하는 역할", "상대가 기대하는 역할", "기대가 설렘이 되는 순간", "기대가 부담이 되는 순간", "서로를 지치게 하지 않는 약속"],
    7: ["오행 보완의 매력", "오행 과잉의 충돌", "감정 온도가 맞는 순간", "안정감을 잃기 쉬운 상황", "균형을 살리는 데이트와 대화"],
    8: ["조후로 보는 친밀감", "정서적 온도 차이", "속궁합의 리듬", "편안한 거리와 접촉", "건강한 친밀감의 규칙"],
    9: ["말이 통하는 부분", "말이 엇갈리는 부분", "침묵과 서운함", "감정 확인의 순서", "대화를 회복하는 문장"],
    10: ["갈등이 생기는 원인", "충돌할 때의 반응", "상처가 깊어지는 말", "화해가 쉬워지는 조건", "회복력을 키우는 약속"],
    11: ["멀어지는 신호", "이별 위험 구간", "재회가 가능한 조건", "반복하면 안 되는 행동", "관계를 살리는 선택"],
    12: ["장기 관계의 힘", "결혼 현실성의 강점", "가족·일·돈의 조율", "약속이 무거워지는 시기", "함께 살아도 사랑이 남는 방식"],
    13: ["돈과 소비 감각", "일과 목표의 영향", "가족과 주변 시선", "생활 계획의 순서", "현실 문제를 사랑의 편으로 돌리는 법"],
    14: ["좋은 흐름이 열리는 때", "조심해야 할 전환점", "관계 결정에 유리한 때", "운이 엇갈릴 때의 운영", "운을 살리는 공동 행동"],
    15: ["최종 궁합 메시지", "서로에게 필요한 태도", "반드시 피할 습관", "90일 관계 회복 루틴", "품격 있는 선택 기준"],
  }),
});

const LOVE_SECRET_CANONICAL_TOPIC_KEYWORDS = Object.freeze({
  solo: Object.freeze({
    1: ["사랑", "기질", "일간", "일지", "월지", "관계"],
    2: ["끌림", "배우자성", "오행", "매력", "인연", "조건"],
    3: ["패턴", "거리", "상처", "습관", "반복", "조절"],
    4: ["소통", "말", "침묵", "오해", "대화", "표현"],
    5: ["불안", "안정감", "믿음", "애착", "회복", "루틴"],
    6: ["결혼", "배우자", "현실", "책임", "장기", "조건"],
    7: ["이별", "재회", "미련", "정리", "회복", "신호"],
    8: ["조후", "친밀감", "속궁합", "온도", "리듬", "거리"],
    9: ["연애운", "만남", "시기", "대운", "세운", "선택"],
    10: ["비책", "습관", "태도", "선택", "실천", "사랑"],
  }),
  compatibility: Object.freeze({
    1: ["궁합", "일간", "일지", "관계", "끌림", "조율"],
    2: ["사랑", "방어", "서운함", "조건", "태도", "관계"],
    3: ["상대", "사랑", "방어", "이해", "안심", "실천"],
    4: ["일간", "기질", "호감", "매력", "상처", "태도"],
    5: ["일지", "배우자궁", "생활", "습관", "일상", "궁합"],
    6: ["배우자성", "기대", "역할", "설렘", "부담", "약속"],
    7: ["오행", "보완", "과잉", "감정", "균형", "안정감"],
    8: ["조후", "친밀감", "속궁합", "온도", "리듬", "거리"],
    9: ["소통", "말", "침묵", "감정", "대화", "회복"],
    10: ["갈등", "충돌", "상처", "화해", "회복력", "약속"],
    11: ["이별", "재회", "위험", "신호", "선택", "관계"],
    12: ["결혼", "장기", "가족", "일", "돈", "약속"],
    13: ["현실", "돈", "일", "가족", "생활", "조율"],
    14: ["연애운", "전환점", "대운", "세운", "성장", "행동"],
    15: ["궁합", "비책", "태도", "습관", "루틴", "관계"],
  }),
});

const DEFAULT_CATEGORY_BY_MODE = {
  solo: {
    1: ["내가 사랑을 시작하는 방식", "마음이 열리는 순간", "사랑 앞에서 강해지는 부분", "사랑 앞에서 약해지는 부분", "내 연애의 핵심 한 줄"],
    2: ["내가 본능적으로 끌리는 사람", "나를 강하게 끌어당기는 분위기", "처음엔 매력적이지만 오래 가면 힘든 사람", "안정감을 주는 사람의 조건", "피해야 할 연애 패턴"],
    3: ["반복되는 연애 흐름", "관계 초반의 나", "관계가 깊어진 뒤의 나", "상처받을 때 반복되는 반응", "같은 실수를 끊는 방법"],
    4: ["애정을 표현하는 방식", "서운함을 말하는 방식", "침묵하거나 참는 이유", "말 때문에 생기는 오해", "관계를 살리는 대화법"],
    5: ["사랑받고 있는지 확인하고 싶어지는 순간", "불안이 커지는 관계 조건", "집착처럼 보일 수 있는 행동", "마음이 식어 보이는 이유", "안정적인 사랑을 만드는 법"],
    6: ["나에게 맞는 배우자상", "결혼으로 안정되는 부분", "결혼 후 조심해야 할 문제", "늦게 안정되는 인연인지 빠르게 이어지는 인연인지", "장기 관계를 위한 조건"],
    7: ["관계가 멀어지는 이유", "이별 후 마음이 오래 남는 이유", "재회를 원할 때 반복되는 실수", "다시 이어질 수 있는 조건", "재회보다 먼저 회복해야 할 것"],
    8: ["내 명식의 온도와 친밀감 방식", "마음이 가까워질 때 몸과 감정이 반응하는 방식", "따뜻함이 필요한 사람인지, 거리가 필요한 사람인지", "속궁합에서 중요하게 느끼는 안정감", "건강한 친밀감을 유지하는 법"],
    9: ["인연운이 열리는 흐름", "대운에서 사랑이 들어오는 방식", "세운에서 조심해야 할 관계", "좋은 사람을 알아보는 기준", "사랑운을 살리는 현실 전략"],
    10: ["내 연애의 최종 핵심 메시지", "반드시 버려야 할 연애 습관", "반드시 키워야 할 사랑의 태도", "나에게 맞는 사람을 선택하는 법", "앞으로의 사랑을 위한 실전 조언"],
  },
  compatibility: {
    1: ["두 사람의 전체 궁합 한 줄 해석", "처음 끌리는 이유", "함께 있을 때 만들어지는 분위기", "관계의 가장 큰 장점", "가장 조심해야 할 약점"],
    2: ["내가 사랑을 시작하는 방식", "내가 관계에서 원하는 것", "불안할 때 보이는 반응", "내가 오래 사랑하기 위해 필요한 조건", "궁합에서 내 성향이 작동하는 핵심"],
    3: ["상대가 사랑을 시작하는 방식", "상대가 관계에서 원하는 것", "상대가 멀어질 때 보이는 신호", "상대를 이해하기 위한 핵심 포인트", "관계에서 상대 성향이 드러나는 장면"],
    4: ["두 일간이 만났을 때의 분위기", "서로에게 자극이 되는 부분", "서로를 어렵게 느끼는 부분", "기질 차이를 조화시키는 법", "일간 궁합의 실전 적용"],
    5: ["두 사람의 일지가 만드는 관계 분위기", "편안함을 느끼는 부분", "반복되는 감정 충돌", "가까워질수록 드러나는 문제", "관계의 뿌리를 안정시키는 방법"],
    6: ["내가 원하는 사랑의 조건", "상대가 원하는 사랑의 조건", "서로의 기대가 맞는 부분", "서로의 기대가 어긋나는 부분", "기대 차이를 줄이는 방법"],
    7: ["두 사람의 오행이 만나 만드는 분위기", "부족한 기운을 채워주는 부분", "과한 기운이 부딪히는 부분", "감정이 뜨거워지는 순간", "감정 균형을 맞추는 방법"],
    8: ["두 사람의 명식 온도 차이", "서로에게 따뜻함을 주는 방식", "긴장과 이완이 생기는 지점", "몸과 마음의 친밀감이 맞는 부분", "속궁합을 건강하게 유지하는 법"],
    9: ["말이 잘 통하는 부분", "말이 엇갈리는 부분", "서운함을 표현하는 방식", "침묵이 생기는 이유", "관계를 살리는 대화법"],
    10: ["가장 자주 부딪히는 문제", "서로를 오해하는 지점", "감정이 폭발하는 순간", "화해가 어려워지는 이유", "갈등을 줄이는 현실적인 방법"],
    11: ["이 관계가 멀어지는 이유", "이별 후에도 마음이 남는 이유", "다시 이어질 수 있는 조건", "재회 후 반복될 수 있는 문제", "재회를 원할 때 가장 중요한 태도"],
    12: ["오래 만날수록 안정되는 부분", "결혼 후 드러날 수 있는 차이", "생활 리듬의 궁합", "책임과 역할 분담의 문제", "장기 관계로 가기 위한 조건"],
    13: ["돈과 현실 감각의 차이", "일과 사랑의 우선순위", "가족과 주변 사람의 영향", "생활 습관에서 생기는 문제", "현실 문제를 함께 해결하는 법"],
    14: ["지금 두 사람의 관계 운", "가까워지기 좋은 시기", "조심해야 할 시기", "관계가 바뀌는 전환점", "타이밍을 잘 쓰는 방법"],
    15: ["이 관계의 최종 핵심 메시지", "관계를 망치는 행동", "관계를 살리는 행동", "서로에게 꼭 필요한 태도", "앞으로의 선택을 위한 조언"],
  },
};

const LOVE_SECRET_TOPIC_KEYWORDS = Object.freeze({
  solo: {
    1: ["사랑", "기준", "마음", "일지", "관계", "태도"],
    2: ["이상형", "끌림", "배우자성", "매력", "조건", "오래 가는 사람"],
    3: ["시작", "가까워짐", "자존심", "오해", "거리감", "안정"],
    4: ["말", "표현", "침묵", "감정", "오해", "대화"],
    5: ["불안", "집착", "안정감", "안정", "사랑받", "확인"],
    6: ["결혼", "배우자", "생활", "책임", "현실", "오래"],
    7: ["이별", "미련", "재회", "신뢰", "회복", "조건"],
    8: ["조후", "친밀감", "속궁합", "온도", "밀착", "편안"],
    9: ["대운", "세운", "만남", "시기", "인연", "흐름"],
    10: ["전략", "마스터플랜", "조언", "기준", "사랑", "패턴"],
  },
  compatibility: {
    1: ["원국", "일간", "일지", "관계", "기본", "요약"],
    2: ["나의", "사랑", "표현", "방어", "기준", "관계"],
    3: ["상대", "사랑", "표현", "방어", "기준", "관계"],
    4: ["끌림", "배우자성", "오행", "매력", "접점", "조건"],
    5: ["감정", "표현", "침묵", "오해", "대화", "조율"],
    6: ["갈등", "충돌", "자존심", "완충", "복구", "실행"],
    7: ["생활", "리듬", "역할", "균형", "현실", "조율"],
    8: ["결혼", "배우자", "책임", "생활", "안정", "장기"],
    9: ["돈", "일", "현실", "목표", "협업", "전략"],
    10: ["이별", "재회", "신뢰", "회복", "조건", "정리"],
    11: ["대운", "세운", "시기", "변화", "기회", "흐름"],
    12: ["전략", "패턴", "루틴", "유지", "결혼", "조언"],
    13: ["돈", "일", "가족", "생활", "현실", "조율"],
    14: ["대운", "세운", "타이밍", "전환점", "시기", "흐름"],
    15: ["전략", "결론", "기준", "조언", "최종", "선택"],
  },
});

const SAJU_LOVE_TEN_GOD_INTERPRETATION = Object.freeze({
  "비견": { loveCore: "대등함과 자존심이 강한 관계", attraction: "서로의 실력과 세계를 인정하는 사람에게 끌림", strength: "관계에서 중심을 잃지 않고 버팀", caution: "상처받으면 먼저 닫히는 경향", communication: "사실 중심 대화를 선호", marriage: "동반자형 결혼 구조에 강함", breakup: "존중이 무너지면 빠르게 거리 둠", advice: "평가보다 공감 문장을 먼저 배치" },
  "겁재": { loveCore: "강한 에너지와 승부욕", attraction: "강렬하고 주도적인 상대에게 반응", strength: "관계를 추진하는 실행력", caution: "비교심과 경쟁심이 갈등을 키움", communication: "직설적 표현이 많아짐", marriage: "역할 합의가 분명하면 안정", breakup: "감정 과열 시 급격히 흔들림", advice: "승패 프레임 대신 공동 목표 설정" },
  "식신": { loveCore: "돌봄과 생활 감각", attraction: "편안함과 신뢰를 주는 상대", strength: "꾸준한 애정 표현", caution: "말하지 않고 참고 쌓는 패턴", communication: "따뜻하지만 완곡한 화법", marriage: "일상 루틴 중심의 안정성", breakup: "지루함이 누적되면 서서히 이탈", advice: "작은 욕구를 초기에 언어화" },
  "상관": { loveCore: "표현력과 감정 배출", attraction: "대화가 잘 통하는 상대", strength: "관계를 움직이는 언어 능력", caution: "날 선 표현이 상처를 남김", communication: "빠르고 직관적인 피드백", marriage: "소통 규칙이 있으면 강점 극대화", breakup: "말의 온도가 깨지면 단절 가속", advice: "핵심 주장 전에 감정 확인 한 문장" },
  "편재": { loveCore: "현실 추진력과 매력", attraction: "활동적이고 감각적인 상대", strength: "관계를 활기 있게 운영", caution: "관심 분산으로 신뢰 흔들림", communication: "속도감 있는 제안형 대화", marriage: "재정/생활 계획이 성패 좌우", breakup: "현실 책임이 비대칭이면 약화", advice: "흥분 구간에서 약속 범위 축소" },
  "정재": { loveCore: "책임과 지속성", attraction: "성실하고 안정적인 상대", strength: "관계를 오래 지키는 인내", caution: "과한 통제로 답답함 유발", communication: "체계적이지만 경직되기 쉬움", marriage: "가정 운영력에 강점", breakup: "감정 무시에 의한 건조화", advice: "원칙 전달 시 선택지를 함께 제시" },
  "편관": { loveCore: "긴장감과 결단", attraction: "카리스마와 방향성을 가진 상대", strength: "위기 상황 수습 능력", caution: "압박형 태도가 친밀감 저해", communication: "짧고 단단한 표현", marriage: "규칙이 명확할수록 안정", breakup: "통제 저항이 커지면 충돌", advice: "요구보다 요청 문장 비율 확대" },
  "정관": { loveCore: "신뢰와 규범", attraction: "품위 있고 예측 가능한 상대", strength: "관계 질서를 유지", caution: "경직된 기대가 실망을 키움", communication: "정중하나 감정표현 약함", marriage: "제도권 파트너십과 궁합 우수", breakup: "실수에 대한 유연성 부족", advice: "규칙 앞에 감정 수용 문장 추가" },
  "편인": { loveCore: "직관과 내면 탐구", attraction: "깊이 있는 대화가 가능한 상대", strength: "관계의 본질을 보는 통찰", caution: "의심과 거리두기 반복", communication: "간접적이고 암시적 표현", marriage: "정서적 안전지대가 필요", breakup: "오해를 혼자 키우는 경향", advice: "추측 대신 확인 질문 습관화" },
  "정인": { loveCore: "보호와 정서 안정", attraction: "배려와 신뢰를 주는 상대", strength: "위로와 회복의 힘", caution: "의존과 과보호의 위험", communication: "부드럽지만 우회적", marriage: "서로 돌보는 가정에 강점", breakup: "서운함을 쌓아 폭발", advice: "요구를 미루지 말고 즉시 전달" },
});

const SAJU_LOVE_PILLAR_INTERPRETATION = Object.freeze({
  dayStem: { theme: "사랑에서의 기본 태도와 자기 본질" },
  dayBranch: { theme: "배우자궁, 관계 안정감, 가까운 사람을 대하는 방식" },
  monthBranch: { theme: "현실 욕구, 사회적 조건, 연애가 실제 삶과 연결되는 방식" },
  hourPillar: { theme: "미래의 사랑, 표현 방식, 결혼 후 깊어지는 욕구" },
});

function clean(value) {
  return String(value || "").trim();
}

function normalizeLoveBookError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return {
        message: String(error),
      };
    }
  }

  return {
    message: String(error),
  };
}

function hasLoveSecretForbiddenText(value) {
  const text = String(value || "");
  return new RegExp(LOVE_SECRET_CANONICAL_FORBIDDEN_RE.source, "i").test(text);
}

function stripLoveSecretForbiddenText(value) {
  return String(value || "").replace(LOVE_SECRET_CANONICAL_FORBIDDEN_RE, " ").replace(/\s{2,}/g, " ").trim();
}

function estimateLoveSecretRepetitionScore(chapters = []) {
  const sentenceCount = new Map();
  let total = 0;
  for (const chapter of chapters) {
    const text = clean(chapter?.text || "");
    if (!text) continue;
    const sentences = text
      .split(/[.!?\n]+/)
      .map((s) => stripLoveSecretForbiddenText(s).toLowerCase())
      .filter((s) => s.length >= 24);
    for (const sentence of sentences) {
      total += 1;
      sentenceCount.set(sentence, Number(sentenceCount.get(sentence) || 0) + 1);
    }
  }
  if (!total) return 0;
  let repeated = 0;
  for (const value of sentenceCount.values()) {
    if (value > 2) repeated += (value - 2);
  }
  return Number((repeated / total).toFixed(4));
}

function collectLoveSecretText(chapters = []) {
  return (Array.isArray(chapters) ? chapters : [])
    .map((chapter) => {
      const sectionText = Array.isArray(chapter?.sections)
        ? chapter.sections.map((section) => [
          clean(section?.body || section?.text || ""),
          loveSecretCleanList(section?.keyPoints, 12).join("\n"),
          loveSecretCleanList(section?.actionGuide, 12).join("\n"),
          loveSecretCleanList(section?.checklist, 12).join("\n"),
          loveSecretCleanList(section?.caution, 12).join("\n"),
          Array.isArray(section?.tableRows) ? section.tableRows.flat().map((item) => clean(item)).filter(Boolean).join("\n") : "",
        ].filter(Boolean).join("\n")).join("\n")
        : "";
      return [
        clean(chapter?.title),
        clean(chapter?.subtitle),
        clean(chapter?.text),
        loveSecretCleanList(chapter?.summaryCards, 12).join("\n"),
        loveSecretCleanList(chapter?.actionItems, 12).join("\n"),
        loveSecretCleanList(chapter?.checklist, 12).join("\n"),
        sectionText,
      ].filter(Boolean).join("\n");
    })
    .join("\n");
}

function collectNormalizedSentences(text) {
  return String(text || "")
    .split(/[.!?\n]+/)
    .map((row) => row.replace(/\s+/g, " ").trim())
    .filter((row) => row.length >= 22);
}

function countRepeatedLongFragments(text, ngramLength = 30, threshold = 3) {
  const grams = new Map();
  for (const sentence of collectNormalizedSentences(text)) {
    const normalized = sentence.replace(/\s+/g, " ").trim();
    if (normalized.length < ngramLength) continue;
    grams.set(normalized, Number(grams.get(normalized) || 0) + 1);
  }
  let repeated = 0;
  for (const value of grams.values()) {
    if (value >= threshold) repeated += 1;
  }
  return repeated;
}

function countRepeatedSectionOpenings(chapters = []) {
  const openingCount = new Map();
  for (const chapter of Array.isArray(chapters) ? chapters : []) {
    for (const section of Array.isArray(chapter?.sections) ? chapter.sections : []) {
      const sentence = collectNormalizedSentences(clean(section?.body || section?.text || ""))[0] || "";
      if (!sentence) continue;
      openingCount.set(sentence, Number(openingCount.get(sentence) || 0) + 1);
    }
  }
  let repeated = 0;
  for (const value of openingCount.values()) {
    if (value >= 3) repeated += 1;
  }
  return repeated;
}

function countPhraseOveruse(text, phrase, allowed = 3) {
  if (!phrase) return 0;
  const list = String(text || "").match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
  const count = Array.isArray(list) ? list.length : 0;
  return count > allowed ? count - allowed : 0;
}

function validateLoveSecretTopicCoverage(mode, chapters = []) {
  const normalizedMode = normalizeMode(mode);
  const keywordMap = normalizedMode === "solo"
    ? LOVE_SECRET_PHASE6_SOLO_TOPIC_KEYWORDS
    : normalizedMode === "compatibility"
      ? LOVE_SECRET_PHASE7_COMPAT_TOPIC_KEYWORDS
    : (LOVE_SECRET_CANONICAL_TOPIC_KEYWORDS[normalizedMode] || LOVE_SECRET_CANONICAL_TOPIC_KEYWORDS.solo);
  const issues = [];
  for (const chapter of Array.isArray(chapters) ? chapters : []) {
    const chapterNo = Number(chapter?.chapter || 0);
    const text = `${clean(chapter?.title)} ${clean(chapter?.subtitle)} ${clean(chapter?.text)}`;
    const keywords = keywordMap[chapterNo] || [];
    const hits = keywords.filter((keyword) => text.includes(keyword));
    if (keywords.length > 0 && hits.length < 3) {
      issues.push(chapterNo);
    }
  }
  return issues;
}

function chapterCharLength(chapter) {
  const title = clean(chapter?.title);
  const subtitle = clean(chapter?.subtitle);
  const body = clean(chapter?.text);
  return `${title}\n${subtitle}\n${body}`.replace(/\s+/g, "").length;
}

const LOVE_SECRET_PHASE8_MIN_CHAPTER_CHARS = 1800;
const LOVE_SECRET_PHASE8_MIN_LIST_ITEMS = 3;
const LOVE_SECRET_PHASE8_MIN_CARD_SECTIONS = 8;

function countLoveSecretChapterListItems(chapter, keys = []) {
  const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
  const chapterItems = keys.flatMap((key) => loveSecretCleanList(chapter?.[key], 20));
  const sectionItems = sections.flatMap((section) => keys.flatMap((key) => loveSecretCleanList(section?.[key], 20)));
  return Array.from(new Set([...chapterItems, ...sectionItems])).length;
}

function countLoveSecretCardSections(chapters = []) {
  return (Array.isArray(chapters) ? chapters : []).reduce((total, chapter) => {
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    return total + sections.filter((section) => {
      const cardItemCount =
        loveSecretCleanList(section?.keyPoints, 8).length
        + loveSecretCleanList(section?.actionGuide, 8).length
        + loveSecretCleanList(section?.checklist, 8).length
        + loveSecretCleanList(section?.caution, 8).length;
      return cardItemCount >= LOVE_SECRET_PHASE8_MIN_LIST_ITEMS;
    }).length;
  }, 0);
}

function countLoveSecretTableSections(chapters = [], tableType = "") {
  return (Array.isArray(chapters) ? chapters : []).reduce((total, chapter) => {
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    return total + sections.filter((section) => {
      const typeMatches = !tableType || clean(section?.tableType) === tableType || clean(section?.table?.type) === tableType;
      const rows = Array.isArray(section?.tableRows) ? section.tableRows : Array.isArray(section?.table?.rows) ? section.table.rows : [];
      return typeMatches && rows.length > 0;
    }).length;
  }, 0);
}

function countDuplicateLoveSecretSectionBlocks(chapters = []) {
  const map = new Map();
  for (const chapter of Array.isArray(chapters) ? chapters : []) {
    for (const section of Array.isArray(chapter?.sections) ? chapter.sections : []) {
      const key = clean(section?.body || section?.text || "").replace(/\s+/g, " ").slice(0, 180);
      if (!key) continue;
      map.set(key, Number(map.get(key) || 0) + 1);
    }
  }
  return Array.from(map.values()).filter((count) => count > 1).length;
}

function validateLoveSecretManuscript({ mode, chapters, config, minChapterChars = 2000 } = {}) {
  const list = Array.isArray(chapters) ? chapters : [];
  const expected = Number(config?.totalChapters || 0);
  const effectiveMinChapterChars = Math.max(LOVE_SECRET_PHASE8_MIN_CHAPTER_CHARS, Number(minChapterChars || 0));
  const chapterCountOk = expected > 0 ? list.length === expected : list.length > 0;
  const chapterLengths = list.map((chapter) => chapterCharLength(chapter));
  const totalChars = chapterLengths.reduce((acc, value) => acc + value, 0);
  const minTotal = Number(config?.minTotalChars || (mode === "compatibility" ? 33000 : 25000));
  const tooShortChapterIndexes = chapterLengths
    .map((count, idx) => ({ count, idx }))
    .filter((row) => row.count < effectiveMinChapterChars)
    .map((row) => row.idx + 1);

  let forbiddenTermsCount = 0;
  const shortSections = [];
  const lowSectionCount = [];
  const lowSummaryChapters = [];
  const lowAdviceChapters = [];
  const lowChecklistChapters = [];
  for (const chapter of list) {
    const chapterNo = Number(chapter?.chapter || 0);
    const sectionList = Array.isArray(chapter?.sections) ? chapter.sections : [];
    if (sectionList.length < 5) {
      lowSectionCount.push(chapterNo);
    }
    if (countLoveSecretChapterListItems(chapter, ["summaryCards", "keyPoints"]) < LOVE_SECRET_PHASE8_MIN_LIST_ITEMS) {
      lowSummaryChapters.push(chapterNo);
    }
    if (countLoveSecretChapterListItems(chapter, ["actionItems", "actionGuide", "advice"]) < LOVE_SECRET_PHASE8_MIN_LIST_ITEMS) {
      lowAdviceChapters.push(chapterNo);
    }
    if (countLoveSecretChapterListItems(chapter, ["checklist"]) < LOVE_SECRET_PHASE8_MIN_LIST_ITEMS) {
      lowChecklistChapters.push(chapterNo);
    }
    for (const section of sectionList) {
      const sectionLen = String(clean(section?.body || section?.text || "")).replace(/\s+/g, "").length;
      if (sectionLen < 700) {
        shortSections.push({ chapter: chapterNo, section: clean(section?.title) || "(무제)", len: sectionLen });
      }
    }
    const sample = `${clean(chapter?.title)}\n${clean(chapter?.subtitle)}\n${clean(chapter?.text)}`;
    const matches = sample.match(LOVE_SECRET_CANONICAL_FORBIDDEN_RE);
    forbiddenTermsCount += Array.isArray(matches) ? matches.length : 0;
  }

  const cardSectionCount = countLoveSecretCardSections(list);
  const monthlyTableCount = countLoveSecretTableSections(list, "monthly-love-flow");
  const routineTableCount = countLoveSecretTableSections(list, "thirty-day-routine");
  const repetitionScore = estimateLoveSecretRepetitionScore(list);
  const combined = collectLoveSecretText(list);
  const riskyAssertiveCount = (combined.match(new RegExp(LOVE_SECRET_ASSERTIVE_RE.source, "gi")) || []).length;
  const explicitIntimacyCount = (combined.match(new RegExp(LOVE_SECRET_EXPLICIT_INTIMACY_RE.source, "gi")) || []).length;
  const partnerBlameCount = (combined.match(new RegExp(LOVE_SECRET_PARTNER_BLAME_RE.source, "gi")) || []).length;
  const sentenceMap = new Map();
  for (const sentence of collectNormalizedSentences(combined)) {
    sentenceMap.set(sentence, Number(sentenceMap.get(sentence) || 0) + 1);
  }
  const duplicateSentenceCount = Array.from(sentenceMap.values()).filter((count) => count >= 2).length;
  const repeatedLongFragments = countRepeatedLongFragments(combined, 30, 3);
  const repeatedSectionOpenings = countRepeatedSectionOpenings(list);
  const duplicateSectionBlockCount = countDuplicateLoveSecretSectionBlocks(list);
  const mechanicalOveruse =
    countPhraseOveruse(combined, "이 명식은 사랑에서")
    + countPhraseOveruse(combined, "관계에서 균형이 필요")
    + countPhraseOveruse(combined, "주의가 필요")
    + countPhraseOveruse(combined, "현실 조언은");
  const topicCoverageIssues = validateLoveSecretTopicCoverage(mode, list);

  const ok = chapterCountOk
    && tooShortChapterIndexes.length === 0
    && lowSectionCount.length === 0
    && lowSummaryChapters.length === 0
    && lowAdviceChapters.length === 0
    && lowChecklistChapters.length === 0
    && cardSectionCount >= LOVE_SECRET_PHASE8_MIN_CARD_SECTIONS
    && monthlyTableCount >= 1
    && routineTableCount >= 1
    && shortSections.length === 0
    && totalChars >= minTotal
    && forbiddenTermsCount === 0
    && repetitionScore <= 0.46
    && duplicateSentenceCount <= (normalizeMode(mode) === "compatibility" ? 900 : 650)
    && repeatedLongFragments <= 16
    && repeatedSectionOpenings <= 2
    && duplicateSectionBlockCount === 0
    && mechanicalOveruse <= 8
    && topicCoverageIssues.length === 0
    && riskyAssertiveCount === 0
    && explicitIntimacyCount === 0
    && partnerBlameCount === 0;

  return {
    ok,
    expected,
    actual: list.length,
    totalChars,
    minTotal,
    effectiveMinChapterChars,
    tooShortChapterIndexes,
    lowSectionCount,
    lowSummaryChapters,
    lowAdviceChapters,
    lowChecklistChapters,
    cardSectionCount,
    monthlyTableCount,
    routineTableCount,
    shortSections,
    forbiddenTermsCount,
    repetitionScore,
    duplicateSentenceCount,
    repeatedLongFragments,
    repeatedSectionOpenings,
    duplicateSectionBlockCount,
    mechanicalOveruse,
    topicCoverageIssues,
    riskyAssertiveCount,
    explicitIntimacyCount,
    partnerBlameCount,
  };
}

function acquireLoveSecretLock(sessionId, jobId = "") {
  const key = clean(sessionId);
  if (!key) return { ok: true, key: "" };

  const now = Date.now();
  const existing = LOVE_SECRET_GENERATION_LOCKS.get(key);
  if (existing && existing.status === "running" && now - Number(existing.startedAtTs || now) <= LOVE_SECRET_LOCK_TTL_MS) {
    return {
      ok: false,
      key,
      existing,
    };
  }

  const lock = {
    sessionId: key,
    status: "running",
    startedAt: new Date().toISOString(),
    startedAtTs: now,
    jobId: clean(jobId),
  };
  LOVE_SECRET_GENERATION_LOCKS.set(key, lock);
  return { ok: true, key, lock };
}

function resolveLoveSecretLock(sessionId, status, jobId = "") {
  const key = clean(sessionId);
  if (!key) return;
  const lock = LOVE_SECRET_GENERATION_LOCKS.get(key) || {
    sessionId: key,
    startedAt: new Date().toISOString(),
    startedAtTs: Date.now(),
  };
  LOVE_SECRET_GENERATION_LOCKS.set(key, {
    ...lock,
    status: clean(status) || "failed",
    jobId: clean(jobId) || clean(lock.jobId),
    updatedAt: new Date().toISOString(),
  });
}

function getLoveSecretFastDbEnv(env = {}) {
  return {
    ...env,
    ...LOVE_SECRET_FAST_DB_ENV_OVERRIDES,
  };
}

function normalizeMode(rawMode) {
  const mode = clean(rawMode).toLowerCase();
  if (mode === "compatibility" || mode === "compat" || mode === "couple") return "compatibility";
  return "solo";
}

function toConfigMode(mode) {
  return mode === "compatibility" ? "couple" : "solo";
}

function toFeatureKey(mode) {
  const normalized = normalizeMode(mode);
  return LOVE_SECRET_FEATURE_KEY_BY_MODE[normalized] || LOVE_SECRET_FEATURE_KEY_BY_MODE.solo;
}

const LOVE_SECRET_PHASE6_SOLO_CHAPTERS = Object.freeze([
  Object.freeze({ title: "프롤로그 — 내 사랑의 기본 코드", subtitle: "일간·일지·오행으로 읽는 사랑의 출발점" }),
  Object.freeze({ title: "연애 성향 — 나는 어떤 방식으로 사랑하는가", subtitle: "사랑을 시작하고 유지하는 나의 기본 방식" }),
  Object.freeze({ title: "끌림의 패턴 — 내가 반복해서 끌리는 사람", subtitle: "배우자성·신살·오행이 만드는 매력의 방향" }),
  Object.freeze({ title: "친밀감과 거리감 — 가까워질수록 드러나는 모습", subtitle: "일지와 조후로 보는 관계의 실제 온도" }),
  Object.freeze({ title: "대화와 표현 방식 — 마음을 전하고 오해를 푸는 법", subtitle: "십성과 오행으로 읽는 말의 결" }),
  Object.freeze({ title: "갈등과 이별 패턴 — 사랑을 어렵게 만드는 반복 구조", subtitle: "관계가 흔들릴 때 반복되는 반응" }),
  Object.freeze({ title: "결혼과 장기 관계 — 오래 가는 관계의 조건", subtitle: "생활 리듬과 책임감으로 보는 지속 가능성" }),
  Object.freeze({ title: "연애운의 흐름 — 대운·세운·월운으로 보는 타이밍", subtitle: "만남과 조율이 열리는 시기" }),
  Object.freeze({ title: "나에게 맞는 연애 전략 — 피해야 할 사람과 만나야 할 사람", subtitle: "내 명식에 맞는 선택 기준" }),
  Object.freeze({ title: "30일 연애 회복 루틴 — 사랑을 바꾸는 실천 계획", subtitle: "작은 행동으로 관계 운을 바꾸는 30일" }),
]);

const LOVE_SECRET_PHASE6_SOLO_SECTION_TITLES = Object.freeze(["핵심 요약 카드", "상담형 본문", "계산 근거 기반 해석", "주의할 점", "실천 조언", "체크리스트", "챕터 마무리 문장"]);

const LOVE_SECRET_PHASE6_SOLO_SECTIONS = Object.freeze(Object.fromEntries(
  Array.from({ length: 10 }, (_, idx) => [idx + 1, LOVE_SECRET_PHASE6_SOLO_SECTION_TITLES]),
));

const LOVE_SECRET_PHASE6_SOLO_TOPIC_KEYWORDS = Object.freeze({
  1: Object.freeze(["프롤로그", "기본 코드", "일간", "일지", "오행", "사랑"]),
  2: Object.freeze(["연애 성향", "사랑하는가", "십성", "표현", "관계", "방식"]),
  3: Object.freeze(["끌림", "패턴", "배우자성", "도화", "홍염", "사람"]),
  4: Object.freeze(["친밀감", "거리감", "가까워질수록", "일지", "조후", "온도"]),
  5: Object.freeze(["대화", "표현", "오해", "마음", "십성", "말"]),
  6: Object.freeze(["갈등", "이별", "반복", "주의", "관계", "회복"]),
  7: Object.freeze(["결혼", "장기 관계", "오래", "생활", "책임", "조건"]),
  8: Object.freeze(["연애운", "대운", "세운", "월운", "타이밍", "흐름"]),
  9: Object.freeze(["연애 전략", "피해야 할 사람", "만나야 할 사람", "선택", "기준", "전략"]),
  10: Object.freeze(["30일", "회복 루틴", "실천", "계획", "체크리스트", "사랑"]),
});

const LOVE_SECRET_PHASE7_COMPAT_CHAPTERS = Object.freeze([
  Object.freeze({ title: "프롤로그 — 두 사람의 관계 코드", subtitle: "두 명식이 만났을 때 먼저 드러나는 관계의 기본 결" }),
  Object.freeze({ title: "첫 끌림과 분위기 — 왜 서로에게 반응하는가", subtitle: "일간·오행·배우자성으로 보는 첫 반응의 이유" }),
  Object.freeze({ title: "감정 궁합 — 정서적 안정감과 불안 요소", subtitle: "감정 속도와 안정감을 결정하는 관계의 온도" }),
  Object.freeze({ title: "대화 궁합 — 말이 통하는 방식과 오해 지점", subtitle: "표현 방식과 받아들이는 방식의 차이" }),
  Object.freeze({ title: "갈등 궁합 — 싸움이 시작되는 패턴", subtitle: "관계가 흔들릴 때 반복되기 쉬운 반응" }),
  Object.freeze({ title: "화해 궁합 — 다시 가까워지는 방법", subtitle: "오해 뒤에 두 사람이 회복되는 순서" }),
  Object.freeze({ title: "현실 궁합 — 돈, 생활, 일상 리듬", subtitle: "생활 감각과 현실 운영 방식의 조율점" }),
  Object.freeze({ title: "장기 관계 가능성 — 오래 가기 위한 조건", subtitle: "결혼과 장기 관계에서 지켜야 할 핵심 조건" }),
  Object.freeze({ title: "올해의 관계 흐름 — 세운·월운 기반 관계 조언", subtitle: "올해 두 사람이 조심하고 활용해야 할 시기" }),
  Object.freeze({ title: "두 사람의 마스터플랜 — 관계를 지키는 실천 전략", subtitle: "강점은 키우고 충돌은 낮추는 30일 관계 계획" }),
]);

const LOVE_SECRET_PHASE7_COMPAT_SECTION_TITLES = Object.freeze([
  "두 사람의 핵심 성향 비교표",
  "관계 강점 TOP 5",
  "충돌 지점 TOP 5",
  "화해 키워드",
  "장기 관계 유지 조건",
  "올해 조심할 시기",
  "30일 관계 개선 루틴",
]);

const LOVE_SECRET_PHASE7_COMPAT_SECTIONS = Object.freeze(Object.fromEntries(
  Array.from({ length: 10 }, (_, idx) => [idx + 1, LOVE_SECRET_PHASE7_COMPAT_SECTION_TITLES]),
));

const LOVE_SECRET_PHASE7_COMPAT_TOPIC_KEYWORDS = Object.freeze({
  1: Object.freeze(["프롤로그", "관계 코드", "핵심 성향", "비교표", "두 사람", "궁합"]),
  2: Object.freeze(["첫 끌림", "분위기", "반응", "일간", "오행", "배우자성"]),
  3: Object.freeze(["감정 궁합", "정서적 안정감", "불안 요소", "감정 속도", "관계 강점", "충돌"]),
  4: Object.freeze(["대화 궁합", "말", "오해", "표현", "화해 키워드", "소통"]),
  5: Object.freeze(["갈등 궁합", "싸움", "패턴", "충돌 지점", "주의", "회복"]),
  6: Object.freeze(["화해 궁합", "다시 가까워지는 방법", "화해 키워드", "조율", "관계 개선", "실천"]),
  7: Object.freeze(["현실 궁합", "돈", "생활", "일상 리듬", "장기 관계", "조건"]),
  8: Object.freeze(["장기 관계 가능성", "오래", "유지 조건", "결혼", "생활", "책임"]),
  9: Object.freeze(["올해의 관계 흐름", "세운", "월운", "조심할 시기", "관계 조언", "타이밍"]),
  10: Object.freeze(["마스터플랜", "관계", "실천 전략", "30일", "개선 루틴", "보완점"]),
});

function loveSecretArchiveDisplayName(mode) {
  return normalizeMode(mode) === "compatibility" ? "궁합 비책 PDF" : "사주 연애 비책";
}

function loveSecretArchiveTitle(base, mode) {
  const selfName = clean(base?.user?.name || "사용자");
  if (normalizeMode(mode) !== "compatibility") return `${selfName}님의 연애 비책`;
  const partnerName = clean(base?.partner?.user?.name || "상대");
  return `${selfName} × ${partnerName} 궁합 비책`;
}

function getLoveSecretChapterMeta(config, chapterNo) {
  return (Array.isArray(config?.chapters) ? config.chapters : [])[chapterNo - 1] || {};
}

async function generateLoveSecretChapter(env, base, mode, config, chapterNo) {
  const chapterMeta = getLoveSecretChapterMeta(config, chapterNo);
  const title = stripUnsafeText(chapterMeta.title || `연애 비책 ${chapterNo}장`);
  const subtitle = stripUnsafeText(chapterMeta.subtitle || "");
  const sectionTitles = getChapterSpecificSections({}, chapterNo, mode);
  const local = buildLocalChapter(base, title, subtitle, sectionTitles, mode, chapterNo);
  return {
    fallbackUsed: false,
    chapter: {
      chapter: chapterNo,
      title,
      subtitle,
      text: stripUnsafeText(local.finalText) || local.finalText,
      sections: Array.isArray(local.sections) ? local.sections : [],
    },
  };
}

function firstLoveSecretText(...values) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function normalizeLoveSecretGenerationBody(body = {}, mode = "solo", base = {}) {
  const raw = body && typeof body === "object" ? body : {};
  const serviceContext = raw.serviceContext && typeof raw.serviceContext === "object" ? raw.serviceContext : {};
  const relationshipContext = raw.relationshipContext && typeof raw.relationshipContext === "object" ? raw.relationshipContext : {};
  const normalizedMode = normalizeMode(mode);
  const source = { ...serviceContext, ...relationshipContext, ...raw };
  const targetYear = Number(source.targetYear || 2026);
  const selfName = firstLoveSecretText(base?.user?.name, raw?.birthInput?.name, raw?.profile?.name, "의뢰인");
  const partnerName = firstLoveSecretText(base?.partner?.user?.name, raw?.partnerBirthInput?.name, relationshipContext?.partnerName, "상대방");
  const isCompatibility = normalizedMode === "compatibility";
  const loveStatus = firstLoveSecretText(
    source.loveStatus,
    source.relationshipStatus,
    source.currentLoveStatus,
    isCompatibility
      ? "상대와의 관계 흐름, 궁합, 감정의 온도와 지속 가능성을 함께 보고 싶은 상태"
      : "현재 연애 흐름, 인연의 시기, 관계 선택을 함께 보고 싶은 상태",
  );
  const currentConcern = firstLoveSecretText(
    source.currentConcern,
    source.concern,
    source.question,
    isCompatibility
      ? `${selfName} / ${partnerName} - 두 사람의 궁합, 감정 흐름, 관계 지속 가능성, 소통 방식을 알고 싶다`
      : `${selfName} - 나에게 맞는 사랑의 방향과 현실적인 관계 전략을 알고 싶다`,
  );
  const idealType = firstLoveSecretText(
    source.idealType,
    source.preferredPartner,
    isCompatibility ? partnerName : "사주 원국과 오행 균형에 맞는 자연스러운 인연",
  );
  const pastLovePattern = firstLoveSecretText(
    source.pastLovePattern,
    source.relationshipPattern,
    "반복되는 끌림, 거리감, 타이밍을 점검하고 싶은 패턴",
  );
  const desiredOutcome = firstLoveSecretText(
    source.desiredOutcome,
    isCompatibility
      ? "서로에게 맞는 소통과 관계 지속 전략을 알고 싶다"
      : "나에게 맞는 사랑의 방향과 현실적인 관계 전략을 알고 싶다",
  );
  const clientFlow = {
    schemaVersion: "love-secret-client-flow.v1",
    source: "worker-love-secret-normalizer",
    mode: normalizedMode,
    chapterCount: normalizedMode === "compatibility" ? 15 : 10,
    selfName,
    partnerName: isCompatibility ? partnerName : "",
    llmContract: "love-secret-master-json.v1",
    ...(raw.clientFlow && typeof raw.clientFlow === "object" ? raw.clientFlow : {}),
  };
  const marriageEnabled = source.wantsMarriageAnalysis !== false && source.includeMarriageAnalysis !== false;
  const reunionEnabled = source.wantsReunionAnalysis !== false && source.includeReunionAnalysis !== false;
  const contract = {
    mode: normalizedMode,
    targetYear: Number.isFinite(targetYear) ? targetYear : 2026,
    loveStatus,
    relationshipStatus: loveStatus,
    currentLoveStatus: loveStatus,
    currentConcern,
    concern: currentConcern,
    question: currentConcern,
    idealType,
    preferredPartner: idealType,
    pastLovePattern,
    relationshipPattern: pastLovePattern,
    wantsMarriageAnalysis: marriageEnabled,
    includeMarriageAnalysis: marriageEnabled,
    wantsReunionAnalysis: reunionEnabled,
    includeReunionAnalysis: reunionEnabled,
    relationshipType: firstLoveSecretText(source.relationshipType, source.status, isCompatibility ? "compatibility" : "solo"),
    status: firstLoveSecretText(source.status, source.relationshipType, isCompatibility ? "relationship_or_interest" : "single_or_reviewing_love_flow"),
    desiredOutcome,
    tone: firstLoveSecretText(source.tone, source.writingStyle, "professional-mystical"),
    writingStyle: firstLoveSecretText(source.writingStyle, source.tone, "professional-mystical"),
    productTier: firstLoveSecretText(source.productTier, source.tier, "premium"),
    tier: firstLoveSecretText(source.tier, source.productTier, "premium"),
    clientFlow,
  };
  const normalized = { ...raw, ...contract };
  delete normalized.serviceContext;
  delete normalized.relationshipContext;
  normalized.serviceContext = { ...contract, ...serviceContext };
  normalized.relationshipContext = { ...contract, ...relationshipContext };
  return normalized;
}

async function buildLoveSecretChapters(env, { base, mode, config, body = {}, requestId = "", onProgress = null } = {}) {
  const normalizedBody = normalizeLoveSecretGenerationBody(body, mode, base);
  const normalizedMode = normalizeMode(mode);
  const targetYear = Number(normalizedBody?.targetYear || 2026);
  const loveSecretMasterJson = buildLoveSecretMasterJson({
    base,
    mode: normalizedMode,
    body: normalizedBody,
    targetYear: Number.isFinite(targetYear) ? targetYear : 2026,
  });
  const masterJsonValidation = validateLoveSecretMasterJson(loveSecretMasterJson);
  if (!masterJsonValidation.ok) {
    throw new Error(`LOVE_SECRET_MASTER_JSON_INVALID:${masterJsonValidation.errors.join(",")}`);
  }
  const loveSecretFacts = buildLoveSecretFacts(loveSecretMasterJson);
  const totalChapters = Number(config?.totalChapters || 0);
  if (!Number.isFinite(totalChapters) || totalChapters <= 0) {
    return {
      chapters: [],
      fallbackUsed: false,
      totalChapters: 0,
      manuscriptSource: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
      loveSecretMasterJson,
      masterJsonValidation,
      loveSecretFacts,
      loveSecretChapterPlans: [],
      llmEnhancement: {
        enabled: false,
        localAssemblyOnly: true,
        externalCallsAllowed: false,
        attempted: 0,
        enhancedChapterIds: [],
        fallbackChapterIds: [],
        cacheHits: [],
        promptVersion: LOVE_SECRET_PROMPT_VERSION,
        engineVersion: LOVE_SECRET_ENGINE_VERSION,
      },
    };
  }

  const chapters = new Array(totalChapters);
  let completed = 0;

  console.info("[LoveBook][Flow] SKELETON_READY", { mode, chapterCount: totalChapters });
  for (let current = 0; current < totalChapters; current += 1) {
    const chapterNo = current + 1;
    console.info("[LoveBook][Chapter] START", { index: chapterNo });
    let generated = null;
    try {
      generated = await generateLoveSecretChapter(env, base, mode, config, chapterNo);
    } catch (error) {
      console.error("[LoveBook][ChapterError]", {
        chapterIndex: chapterNo,
        message: clean(error?.message || error) || "unknown_error",
      });
      throw Object.assign(new Error(`LOVE_SECRET_LOCAL_CHAPTER_FAILED:${chapterNo}`), {
        cause: error,
        code: "LOVE_SECRET_LOCAL_CHAPTER_FAILED",
        status: 422,
      });
    }

    chapters[current] = generated?.chapter || null;
    completed += 1;

    if (typeof onProgress === "function") {
      await onProgress({ completed, chapterNo, totalChapters });
    }

    console.info("[LoveBook][Chapter] LOCAL_DONE", {
      index: chapterNo,
      fallbackUsed: Boolean(generated?.fallbackUsed),
    });
  }

  if (chapters.some((chapter) => !chapter)) {
    throw new Error(`[LoveBook] Chapter count mismatch: expected ${totalChapters}, got ${chapters.filter(Boolean).length}`);
  }
  const loveSecretChapterPlans = buildLoveSecretChapterPlans({
    mode: normalizedMode,
    config,
    chapters,
    loveSecretFacts,
  });
  const llmEnhancement = {
    chapters: chapters.map((chapter) => markLoveSecretLocalChapter(chapter)),
    enabled: false,
    localAssemblyOnly: true,
    externalCallsAllowed: false,
    attempted: 0,
    enhancedChapterIds: [],
    fallbackChapterIds: [],
    cacheHits: [],
    promptVersion: LOVE_SECRET_PROMPT_VERSION,
    engineVersion: LOVE_SECRET_ENGINE_VERSION,
  };
  let finalChapters = llmEnhancement.chapters;
  let normalizedToLocal = false;
  const preparedLocal = prepareLoveSecretFinalChapters({
    candidateChapters: finalChapters,
    localChapters: chapters,
    mode: normalizedMode,
    config,
    base,
  });
  if (preparedLocal.validation.ok) {
    finalChapters = preparedLocal.chapters;
    normalizedToLocal = Boolean(preparedLocal.recovered);
  }
  console.info("[LoveBook][Flow] ALL_CHAPTERS_DONE", {
    expected: totalChapters,
    actual: finalChapters.length,
    localAssemblyOnly: true,
    normalizedToLocal,
  });
  return {
    chapters: finalChapters,
    fallbackUsed: false,
    totalChapters: finalChapters.length,
    manuscriptSource: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
    loveSecretMasterJson,
    masterJsonValidation,
    loveSecretFacts,
    loveSecretChapterPlans,
    llmEnhancement,
  };
}

function stripUnsafeText(value) {
  return clean(value)
    .replace(/\b(undefined|null|nan)\b/gi, "")
    .replace(/\b(payload|json|schema|prompt|api|gemini|localdraft|fallback|debug|raw|about:blank|internal\s*server\s*error|calculationmode|recovered)\b/gi, "")
    .replace(/chapter\s*1\s*chapter\s*1/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/데이터가\s*부족합니다/gi, "")
    .replace(/로컬\s*엔진|계산\s*시그니처|내부\s*데이터|엔진\s*결과|데이터\s*정규화|품질\s*검증|재생성/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parsePillarToken(value) {
  const raw = clean(value);
  const m = raw.match(/^([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸])([자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])$/);
  if (!m) return null;
  return { gan: m[1], zhi: m[2], raw };
}

function pickPillarFromBase(base, key) {
  const node = base?.pillars?.[key];
  const gan = clean(node?.gan);
  const zhi = clean(node?.zhi);
  if (!gan || !zhi) return null;
  return { gan, zhi, raw: `${gan}${zhi}` };
}

function parsePillarsFromSajuData(sajuData) {
  const text = clean(sajuData);
  if (!text) return {};
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const out = {};

  const patterns = [
    { key: "year", regex: /년주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
    { key: "month", regex: /월주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
    { key: "day", regex: /일주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
    { key: "hour", regex: /시주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
  ];

  for (const line of lines) {
    for (const p of patterns) {
      if (out[p.key]) continue;
      const m = line.match(p.regex);
      if (m) out[p.key] = parsePillarToken(m[1]);
    }
  }
  return out;
}

function parseBirthDate(raw) {
  const text = clean(raw);
  if (!text) return "";
  const m = text.match(/(\d{4})[-./\s년]+(\d{1,2})[-./\s월]+(\d{1,2})/);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return "";
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseBirthDateFromSajuData(sajuData) {
  const text = clean(sajuData);
  if (!text) return "";
  const m = text.match(/생년월일[^:：]*[:：]\s*([^\n]+)/);
  return parseBirthDate(m ? m[1] : text);
}

function englishElementToKorean(value) {
  const token = clean(value).toLowerCase();
  if (token === "wood") return "목";
  if (token === "fire") return "화";
  if (token === "earth") return "토";
  if (token === "metal") return "금";
  if (token === "water") return "수";
  return clean(value);
}

function normalizeLoveSecretGender(value) {
  const token = clean(value).toUpperCase();
  if (token === "M" || token === "MALE" || token === "남" || token === "남성") return "M";
  if (token === "F" || token === "FEMALE" || token === "여" || token === "여성") return "F";
  return "OTHER";
}

function parseLoveSecretBirthTime(rawTime, rawHour, rawMinute) {
  const numericHour = Number(rawHour);
  const numericMinute = Number(rawMinute);
  if (Number.isFinite(numericHour)) {
    const hour = Math.max(0, Math.min(23, Math.floor(numericHour)));
    const minute = Number.isFinite(numericMinute) ? Math.max(0, Math.min(59, Math.floor(numericMinute))) : 0;
    return {
      ok: true,
      hour,
      minute,
      birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
  }

  const text = clean(rawTime);
  if (!text) return { ok: false, reason: "missing" };
  const hhmm = text.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
  if (!hhmm) return { ok: false, reason: "invalid" };
  const hour = Number(hhmm[1]);
  const minute = Number(hhmm[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { ok: false, reason: "invalid" };
  }
  return {
    ok: true,
    hour,
    minute,
    birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function normalizeLoveSecretBirthInput(raw = {}, fallbackName = "사용자") {
  const src = raw && typeof raw === "object" ? raw : {};
  const birthDate = parseBirthDate(src.birthDate || src.date || src.solarDate || src.birth || "");
  if (!birthDate) {
    return { ok: false, code: "BIRTH_DATE_REQUIRED", message: "연애 비책 PDF 생성을 위해 생년월일 정보가 필요합니다." };
  }

  const timeInfo = parseLoveSecretBirthTime(src.birthTime || src.time, src.birthHour ?? src.hour, src.birthMinute ?? src.minute);
  if (!timeInfo.ok) {
    return { ok: false, code: "BIRTH_TIME_REQUIRED", message: "연애 비책 PDF는 출생 시간이 필요합니다. 태어난 시간을 입력해 주세요." };
  }

  const [yearText, monthText, dayText] = birthDate.split("-");
  const latitude = Number(src.latitude);
  const longitude = Number(src.longitude ?? src.lng);
  return {
    ok: true,
    input: {
      name: clean(src.name || fallbackName) || fallbackName,
      gender: normalizeLoveSecretGender(src.gender),
      birthDate,
      birthTime: timeInfo.birthTime,
      year: Number(yearText),
      month: Number(monthText),
      day: Number(dayText),
      hour: timeInfo.hour,
      minute: timeInfo.minute,
      calendarType: clean(src.calendarType || src.calType || "solar") || "solar",
      timezone: clean(src.timezone || "Asia/Seoul") || "Asia/Seoul",
      latitude: Number.isFinite(latitude) ? latitude : 37.5665,
      longitude: Number.isFinite(longitude) ? longitude : 126.978,
    },
  };
}

function toLoveSecretPillar(node = {}) {
  const gan = clean(node?.stemKo || node?.stem || node?.gan || "");
  const zhi = clean(node?.branch || node?.branchKo || node?.zhi || "");
  return { gan, zhi, raw: gan && zhi ? `${gan}${zhi}` : "" };
}

function buildLoveSecretBaseFromBirthInput(birthInput) {
  let engine = null;
  try {
    const normalizedCalendarType = birthInput.calendarType === "lunar_leap"
      ? "lunar_leap"
      : (birthInput.calendarType === "lunar" ? "lunar" : "solar");
    engine = buildSajuProfile({
      name: birthInput.name,
      gender: birthInput.gender,
      timezone: birthInput.timezone || "Asia/Seoul",
      location: {
        name: birthInput.birthPlace || "대한민국",
        latitude: birthInput.latitude,
        longitude: birthInput.longitude,
        timezone: birthInput.timezone || "Asia/Seoul",
      },
      hourPillarTimePolicy: "TRUE_SOLAR_TIME",
      dayChangePolicy: "MIDNIGHT",
      birth: {
        calendarType: normalizedCalendarType,
        year: birthInput.year,
        month: birthInput.month,
        day: birthInput.day,
        hour: birthInput.hour,
        minute: birthInput.minute,
        timezone: birthInput.timezone || "Asia/Seoul",
        birthPlace: birthInput.birthPlace || "대한민국",
        latitude: birthInput.latitude,
        longitude: birthInput.longitude,
        unknownTime: false,
      },
    });
  } catch (error) {
    const nextError = new Error(clean(error?.message || error) || "LOVE_SECRET_LOCAL_ENGINE_FAILED");
    nextError.code = "LOVE_SECRET_LOCAL_ENGINE_FAILED";
    throw nextError;
  }

  if (!engine?.pillars?.day?.stemKo && !engine?.pillars?.day?.stem) {
    const nextError = new Error("LOVE_SECRET_LOCAL_ENGINE_FAILED");
    nextError.code = "LOVE_SECRET_LOCAL_ENGINE_FAILED";
    throw nextError;
  }

  const counts = normalizeElementCounts(engine?.fiveElements?.percentages || {});
  const balance = deriveElementBalanceFromCounts(counts);
  const tenGodCounts = engine?.tenGods?.counts && typeof engine.tenGods.counts === "object"
    ? engine.tenGods.counts
    : {};
  const tenGodEntries = Object.keys(tenGodCounts)
    .map((name) => ({ name, count: Number(tenGodCounts[name] || 0) || 0 }))
    .sort((a, b) => b.count - a.count);

  const useful = englishElementToKorean(engine?.usefulGods?.yong);
  const support = englishElementToKorean(Array.isArray(engine?.usefulGods?.hee) ? engine.usefulGods.hee[0] : engine?.usefulGods?.hee);
  const caution = englishElementToKorean(Array.isArray(engine?.usefulGods?.gi) ? engine.usefulGods.gi[0] : engine?.usefulGods?.gi);

  return {
    user: {
      name: clean(birthInput.name) || "사용자",
      gender: clean(birthInput.gender),
      birthDate: clean(birthInput.birthDate),
      birthTime: clean(birthInput.birthTime),
      calendarType: clean(birthInput.calendarType || "solar") || "solar",
    },
    pillars: {
      year: toLoveSecretPillar(engine?.pillars?.year),
      month: toLoveSecretPillar(engine?.pillars?.month),
      day: toLoveSecretPillar(engine?.pillars?.day),
      hour: toLoveSecretPillar(engine?.pillars?.hour),
    },
    core: {
      dayMaster: clean(engine?.dayMaster?.stemKo || engine?.dayMaster?.stem || engine?.pillars?.day?.stemKo || engine?.pillars?.day?.stem),
      dayBranch: clean(engine?.pillars?.day?.branch || ""),
      monthBranch: clean(engine?.pillars?.month?.branch || ""),
      season: clean(engine?.season || ""),
    },
    elementBalance: {
      counts,
      dominant: balance.dominant,
      deficient: balance.deficient,
      balanceScore: balance.balanceScore,
    },
    tenGods: {
      counts: tenGodCounts,
      dominantTenGod: clean(tenGodEntries[0]?.name || ""),
      topTenGods: tenGodEntries.slice(0, 3).map((row) => ({ name: row.name, count: row.count })),
    },
    strength: {
      label: clean(engine?.usefulGods?.strength || ""),
      isStrong: clean(engine?.usefulGods?.strength) === "신강",
      reason: clean(engine?.usefulGods?.summary || ""),
    },
    yongshin: {
      usefulElements: [useful, support].filter(Boolean),
      cautionElements: [caution].filter(Boolean),
    },
    specialStars: engine?.specialStars && typeof engine.specialStars === "object" ? engine.specialStars : undefined,
    engineResult: safeLoveSecretClone(engine),
    timing: {
      daeun: Array.isArray(engine?.daeun) ? engine.daeun : [],
    },
  };
}

function parsePartnerSnapshot(partnerData) {
  const text = clean(partnerData);
  if (!text) return null;
  const pillars = parsePillarsFromSajuData(text);
  const day = pillars.day || null;
  const month = pillars.month || null;
  return {
    raw: text,
    birthDate: parseBirthDateFromSajuData(text),
    pillars,
    core: {
      dayMaster: clean(day?.gan),
      dayBranch: clean(day?.zhi),
      monthBranch: clean(month?.zhi),
    },
  };
}

function normalizeElementCounts(input) {
  const safe = input && typeof input === "object" ? input : {};
  return {
    wood: Number(safe.wood || 0) || 0,
    fire: Number(safe.fire || 0) || 0,
    earth: Number(safe.earth || 0) || 0,
    metal: Number(safe.metal || 0) || 0,
    water: Number(safe.water || 0) || 0,
  };
}

function deriveElementBalanceFromCounts(counts) {
  const total = Math.max(1, Number(counts.wood) + Number(counts.fire) + Number(counts.earth) + Number(counts.metal) + Number(counts.water));
  const entries = Object.keys(counts).map((key) => ({ key, value: Number(counts[key] || 0), pct: Math.round((Number(counts[key] || 0) / total) * 100) }));
  entries.sort((a, b) => b.pct - a.pct);
  const dominant = entries[0]?.key || "earth";
  const deficient = entries[entries.length - 1]?.key || "earth";
  const gap = Math.abs(Number(entries[0]?.pct || 0) - Number(entries[entries.length - 1]?.pct || 0));
  return { dominant, deficient, balanceScore: Math.max(35, Math.min(97, 100 - Math.round(gap * 1.6))) };
}

function normalizeSajuBase(body = {}) {
  const bodyProfile = body?.profile && typeof body.profile === "object" ? body.profile : {};
  const mode = normalizeMode(body?.mode || body?.reportMode);
  const selfBirthInput = normalizeLoveSecretBirthInput(body?.birthInput || bodyProfile || body, clean(bodyProfile?.name || "사용자") || "사용자");
  const partnerBirthInput = normalizeLoveSecretBirthInput(body?.partnerBirthInput || {}, "상대");

  if (selfBirthInput.ok) {
    const primaryBase = buildLoveSecretBaseFromBirthInput(selfBirthInput.input);
    let partner = null;
    if (mode === "compatibility") {
      if (partnerBirthInput.ok) {
        const partnerBase = buildLoveSecretBaseFromBirthInput(partnerBirthInput.input);
        partner = {
          raw: "",
          user: partnerBase?.user || {},
          birthDate: clean(partnerBase?.user?.birthDate),
          birthTime: clean(partnerBase?.user?.birthTime),
          pillars: partnerBase?.pillars || {},
          core: {
            dayMaster: clean(partnerBase?.core?.dayMaster),
            dayBranch: clean(partnerBase?.core?.dayBranch),
            monthBranch: clean(partnerBase?.core?.monthBranch),
          },
          elementBalance: partnerBase?.elementBalance || {},
          tenGods: partnerBase?.tenGods || {},
          strength: partnerBase?.strength || {},
          johu: partnerBase?.johu,
          yongshin: partnerBase?.yongshin,
          specialStars: partnerBase?.specialStars,
          timing: partnerBase?.timing,
          loveSecretReference: buildLoveSecretReference(partnerBase),
        };
      } else {
        partner = parsePartnerSnapshot(body?.partnerData);
      }
    }

    const normalizedBase = {
      ...primaryBase,
      partner,
    };
    return {
      ...normalizedBase,
      loveSecretReference: buildLoveSecretReference(normalizedBase),
    };
  }

  const base = body?.sajuBase && typeof body.sajuBase === "object" ? body.sajuBase : {};
  const profile = bodyProfile;
  const sajuData = clean(body?.sajuData);

  const parsed = parsePillarsFromSajuData(sajuData);
  const year = pickPillarFromBase(base, "year") || parsed.year || null;
  const month = pickPillarFromBase(base, "month") || parsed.month || null;
  const day = pickPillarFromBase(base, "day") || parsed.day || null;
  const hour = pickPillarFromBase(base, "hour") || parsed.hour || null;

  const dayMaster = clean(base?.core?.dayMaster) || clean(day?.gan);
  const dayBranch = clean(base?.core?.dayBranch) || clean(day?.zhi);
  const monthBranch = clean(base?.core?.monthBranch) || clean(month?.zhi);

  const counts = normalizeElementCounts(base?.elementBalance?.counts || body?.elementCounts || {});
  const balance = deriveElementBalanceFromCounts(counts);

  const tenGodCounts = (base?.tenGods?.counts && typeof base.tenGods.counts === "object") ? base.tenGods.counts : {};
  const tenGodEntries = Object.keys(tenGodCounts).map((name) => ({ name, count: Number(tenGodCounts[name] || 0) || 0 }));
  tenGodEntries.sort((a, b) => b.count - a.count);

  const birthDate = parseBirthDate(base?.user?.birthDate)
    || parseBirthDate(profile?.birthDate)
    || parseBirthDateFromSajuData(sajuData);

  const normalizedBase = {
    user: {
      name: clean(base?.user?.name) || clean(profile?.name) || "사용자",
      gender: clean(base?.user?.gender) || clean(profile?.gender) || "",
      birthDate,
      birthTime: clean(base?.user?.birthTime) || clean(profile?.birthTime) || "",
      calendarType: clean(base?.user?.calendarType) || "solar",
    },
    pillars: {
      year,
      month,
      day,
      hour,
    },
    core: {
      dayMaster,
      dayBranch,
      monthBranch,
      season: clean(base?.core?.season) || "",
    },
    elementBalance: {
      counts,
      dominant: clean(base?.elementBalance?.dominant) || balance.dominant,
      deficient: clean(base?.elementBalance?.deficient) || balance.deficient,
      balanceScore: Number(base?.elementBalance?.balanceScore) || balance.balanceScore,
    },
    tenGods: {
      counts: tenGodCounts,
      dominantTenGod: clean(base?.tenGods?.dominantTenGod) || clean(tenGodEntries[0]?.name) || "",
      topTenGods: (base?.tenGods?.topTenGods && Array.isArray(base.tenGods.topTenGods))
        ? base.tenGods.topTenGods
        : tenGodEntries.slice(0, 3).map((row) => ({ name: row.name, count: row.count })),
    },
    strength: {
      isStrong: typeof base?.strength?.isStrong === "boolean" ? base.strength.isStrong : undefined,
      label: clean(base?.strength?.label),
      reason: clean(base?.strength?.reason),
    },
    johu: base?.johu && typeof base.johu === "object" ? base.johu : undefined,
    yongshin: base?.yongshin && typeof base.yongshin === "object" ? base.yongshin : undefined,
    specialStars: base?.specialStars && typeof base.specialStars === "object" ? base.specialStars : undefined,
    timing: base?.timing && typeof base.timing === "object" ? base.timing : undefined,
    partner: parsePartnerSnapshot(body?.partnerData),
  };

  return {
    ...normalizedBase,
    loveSecretReference: buildLoveSecretReference(normalizedBase),
  };
}

function validateMinimumSaju(base) {
  const hasYear = Boolean(clean(base?.pillars?.year?.gan) && clean(base?.pillars?.year?.zhi));
  const hasMonth = Boolean(clean(base?.pillars?.month?.gan) && clean(base?.pillars?.month?.zhi));
  const hasDay = Boolean(clean(base?.pillars?.day?.gan) && clean(base?.pillars?.day?.zhi));
  const hasDayMaster = Boolean(clean(base?.core?.dayMaster));
  const hasDayBranch = Boolean(clean(base?.core?.dayBranch));
  const hasBirthDate = Boolean(clean(base?.user?.birthDate));
  const missing = [];
  if (!hasYear) missing.push("yearPillar");
  if (!hasMonth) missing.push("monthPillar");
  if (!hasDay) missing.push("dayPillar");
  if (!hasDayMaster) missing.push("dayMaster");
  if (!hasDayBranch) missing.push("dayBranch");
  if (!hasBirthDate) missing.push("birthDate");
  return { ok: missing.length === 0, missing };
}

function validatePartnerMinimumSaju(base, mode) {
  if (normalizeMode(mode) !== "compatibility") {
    return { ok: true, missing: [] };
  }
  const partner = base?.partner && typeof base.partner === "object" ? base.partner : null;
  const missing = [];
  if (!clean(partner?.birthDate)) missing.push("partnerBirthDate");
  if (!clean(partner?.core?.dayMaster)) missing.push("partnerDayMaster");
  if (!clean(partner?.core?.dayBranch)) missing.push("partnerDayBranch");
  return { ok: missing.length === 0, missing };
}

const LOVE_SECRET_LLM_KEY_ENV_KEYS = Object.freeze([
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINIF_API_KEY5",
  "GEMINIF_API_KEY6",
  "GEMINIF_API_KEY7",
  "GEMINIF_API_KEY8",
]);
const LOVE_SECRET_LLM_MODEL_ENV_KEYS = Object.freeze(["LOVE_SECRET_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"]);
const LOVE_SECRET_LLM_DEVELOPER_RE = /\b(?:json|schema|prompt|api|gemini|payload|debug|fallback|null|undefined|nan)\b|개발|스키마|프롬프트|제미나이|내부\s*데이터|엔진\s*결과|데이터\s*정규화/gi;
const LOVE_SECRET_ASSERTIVE_RE = /(무조건|반드시\s*결혼|반드시\s*헤어|반드시\s*재회|100\s*%|운명의\s*상대다|확정|필연적으로|절대\s*헤어지지|반드시\s*만난다|절대\s*안\s*맞는다)/i;
const LOVE_SECRET_EXPLICIT_INTIMACY_RE = /(성행위|섹스|삽입|성기|노골적|음란|애무|체위|오르가즘|자위)/i;
const LOVE_SECRET_PARTNER_BLAME_RE = /(집착이\s*심하다|바람기가\s*있다|배신할\s*사람|문제\s*있는\s*상대|위험한\s*사람|나쁜\s*상대|피해야\s*할\s*인간)/i;

async function callLoveSecretDisabledLlmProvider() {
  return {
    ok: false,
    error: "LOVE_SECRET_LLM_DISABLED",
    message: "LOVE_SECRET_LLM_DISABLED",
    provider: LOVE_SECRET_PDF_CONFIG.provider,
  };
}

function pickLoveSecretGeminiModels(env = {}) {
  const models = [
    env?.LOVE_SECRET_GEMINI_MODEL,
    env?.PREMIUM_GEMINI_MODEL,
    env?.GEMINI_MODEL,
    "gemini-2.5-flash",
  ].map((model) => clean(model)).filter(Boolean);
  return Array.from(new Set(models));
}

function compactLoveSecretObject(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => compactLoveSecretObject(item))
      .filter((item) => item !== undefined && item !== "");
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      const normalized = compactLoveSecretObject(item);
      if (normalized === undefined || normalized === "") continue;
      if (Array.isArray(normalized) && normalized.length === 0) continue;
      if (normalized && typeof normalized === "object" && !Array.isArray(normalized) && Object.keys(normalized).length === 0) continue;
      out[key] = normalized;
    }
    return out;
  }
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return clean(value) || undefined;
  return value;
}

function safeLoveSecretClone(value) {
  if (!value || typeof value !== "object") return {};
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

function loveSecretCleanList(value, limit = 12) {
  const list = Array.isArray(value) ? value : [];
  return list.map((item) => stripUnsafeText(item)).filter(Boolean).slice(0, limit);
}

function loveSecretAgeAtYear(birthDate, targetYear) {
  const date = parseBirthDate(birthDate);
  const year = Number(targetYear);
  if (!date || !Number.isFinite(year)) return undefined;
  const birthYear = Number(date.slice(0, 4));
  if (!Number.isFinite(birthYear)) return undefined;
  return Math.max(0, year - birthYear);
}

function loveSecretPillarRaw(pillar) {
  const raw = clean(pillar?.raw);
  if (raw) return raw;
  const gan = clean(pillar?.gan || pillar?.stemKo || pillar?.stem);
  const zhi = clean(pillar?.zhi || pillar?.branchKo || pillar?.branch);
  return gan && zhi ? `${gan}${zhi}` : "";
}

const LOVE_SECRET_STEM_TRAITS = Object.freeze({
  "갑": { element: "wood", yinYang: "yang" },
  "을": { element: "wood", yinYang: "yin" },
  "병": { element: "fire", yinYang: "yang" },
  "정": { element: "fire", yinYang: "yin" },
  "무": { element: "earth", yinYang: "yang" },
  "기": { element: "earth", yinYang: "yin" },
  "경": { element: "metal", yinYang: "yang" },
  "신": { element: "metal", yinYang: "yin" },
  "임": { element: "water", yinYang: "yang" },
  "계": { element: "water", yinYang: "yin" },
 甲: { element: "wood", yinYang: "yang" },
 乙: { element: "wood", yinYang: "yin" },
 丙: { element: "fire", yinYang: "yang" },
 丁: { element: "fire", yinYang: "yin" },
 戊: { element: "earth", yinYang: "yang" },
 己: { element: "earth", yinYang: "yin" },
 庚: { element: "metal", yinYang: "yang" },
 辛: { element: "metal", yinYang: "yin" },
 壬: { element: "water", yinYang: "yang" },
 癸: { element: "water", yinYang: "yin" },
});

const LOVE_SECRET_BRANCH_ELEMENTS = Object.freeze({
  "자": "water",
  "축": "earth",
  "인": "wood",
  "묘": "wood",
  "진": "earth",
  "사": "fire",
  "오": "fire",
  "미": "earth",
  "신": "metal",
  "유": "metal",
  "술": "earth",
  "해": "water",
  子: "water",
  丑: "earth",
  寅: "wood",
  卯: "wood",
  辰: "earth",
  巳: "fire",
  午: "fire",
  未: "earth",
  申: "metal",
  酉: "metal",
  戌: "earth",
  亥: "water",
});

function loveSecretScalar(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return stripUnsafeText(value);
  return "";
}

function loveSecretStringList(...values) {
  return values.flatMap((value) => {
    if (Array.isArray(value)) return value.map(loveSecretScalar);
    return [loveSecretScalar(value)];
  }).filter(Boolean);
}

function normalizeLoveSecretDistribution(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(source)
    .map(([key, amount]) => [loveSecretScalar(key), Number(amount || 0) || 0])
    .filter(([key]) => Boolean(key)));
}

function loveSecretRankedKeys(distribution = {}, order = "desc") {
  const entries = Object.entries(distribution)
    .filter(([, value]) => Number.isFinite(Number(value)))
    .sort((a, b) => order === "asc" ? Number(a[1]) - Number(b[1]) : Number(b[1]) - Number(a[1]));
  return entries.filter(([, value]) => Number(value) > 0).slice(0, 3).map(([key]) => key);
}

function loveSecretStrengthCode(strength = {}) {
  const label = loveSecretScalar(strength?.label);
  if (strength?.isStrong === true || /strong|신강|강/.test(label)) return "strong";
  if (strength?.isStrong === false || /weak|신약|약/.test(label)) return "weak";
  if (/balanced|중화|균형/.test(label)) return "balanced";
  return undefined;
}

function loveSecretStemTraits(stem) {
  const text = loveSecretScalar(stem);
  return LOVE_SECRET_STEM_TRAITS[text] || LOVE_SECRET_STEM_TRAITS[text.slice(0, 1)] || {};
}

function loveSecretBranchElement(branch) {
  const text = loveSecretScalar(branch);
  return LOVE_SECRET_BRANCH_ELEMENTS[text] || LOVE_SECRET_BRANCH_ELEMENTS[text.slice(0, 1)] || undefined;
}

function loveSecretBalanceSummary(counts, strongest = [], weakest = []) {
  if (!strongest.length && !weakest.length) return "";
  const strongText = strongest.length ? `강한 오행 ${strongest.join(", ")}` : "";
  const weakText = weakest.length ? `보완 오행 ${weakest.join(", ")}` : "";
  return [strongText, weakText].filter(Boolean).join(" / ");
}

function normalizeLoveSecretSpecialStars(stars = {}) {
  const source = stars && typeof stars === "object" && !Array.isArray(stars) ? stars : {};
  return Object.entries(source).map(([key, value]) => {
    const item = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const strength = Number(item.strength ?? item.score ?? item.value);
    return compactLoveSecretObject({
      name: loveSecretScalar(item.name || item.label || key),
      meaning: loveSecretScalar(item.meaning || item.summary || (typeof value === "string" ? value : "")),
      loveMeaning: loveSecretScalar(item.loveMeaning || item.love || item.relationshipMeaning),
      strength: Number.isFinite(strength) ? strength : undefined,
    });
  }).filter((star) => loveSecretScalar(star?.name));
}

function loveBlock(id, tags, weight, title, summary, body, advice, caution, checklist) {
  return Object.freeze({
    id,
    tags: Object.freeze(tags),
    weight,
    title,
    summary,
    body: Object.freeze(body),
    advice: Object.freeze(advice),
    caution: Object.freeze(caution),
    checklist: Object.freeze(checklist),
  });
}

const LOVE_DAY_MASTER_BLOCKS = Object.freeze({
  "갑": loveBlock("day-master-gap", ["dayMaster:갑", "element:wood", "yang"], 100, "갑목 일간의 연애 방식", "방향성과 명분이 사랑의 신뢰를 만든다.", ["갑목 일간은 연애에서도 서로가 어디로 향하는지 확인하려는 힘이 강하다.", "마음이 움직이면 상대의 성장 가능성과 함께 만들어 갈 미래를 먼저 본다.", "불분명한 관계보다 약속의 방향이 보이는 관계에서 안정감을 느낀다."], ["관계의 미래를 말하기 전에 지금 반복되는 작은 약속을 먼저 확인한다."], ["내 기준이 강할수록 상대는 압박을 느낄 수 있으니 설득보다 공유의 방식으로 말한다."], ["관계 방향 한 문장으로 정리하기", "상대의 속도 확인하기", "현재의 편안함 먼저 점검하기"]),
  "을": loveBlock("day-master-eul", ["dayMaster:을", "element:wood", "yin"], 100, "을목 일간의 연애 방식", "섬세한 관찰과 부드러운 적응이 사랑의 문을 연다.", ["을목 일간은 상대의 기분과 관계의 공기를 예민하게 읽는다.", "천천히 스며드는 방식에 강하며 무리한 고백보다 자연스러운 가까움을 선호한다.", "관계가 안정되면 상대의 삶을 세심하게 돌보는 힘이 살아난다."], ["내가 맞춰 주는 만큼 원하는 것도 부드럽게 말한다."], ["배려가 침묵으로 굳어지면 서운함이 늦게 터질 수 있다."], ["오늘 느낀 서운함 적기", "상대에게 바라는 작은 행동 말하기", "혼자 참은 일을 확인하기"]),
  "병": loveBlock("day-master-byeong", ["dayMaster:병", "element:fire", "yang"], 100, "병화 일간의 연애 방식", "따뜻한 표현과 확신이 관계의 온도를 높인다.", ["병화 일간은 사랑이 시작되면 마음을 비교적 밝고 직접적으로 드러낸다.", "상대가 웃고 반응할 때 애정이 더 커지며 관계 안의 활기를 중요하게 여긴다.", "숨기는 관계나 애매한 태도에는 마음의 온도가 빠르게 식을 수 있다."], ["좋은 감정뿐 아니라 불편한 감정도 같은 온도로 말한다."], ["표현의 속도가 빠르면 상대에게 결론을 재촉하는 느낌을 줄 수 있다."], ["상대 반응 기다리기", "확신 요구 줄이기", "칭찬과 질문 균형 맞추기"]),
  "정": loveBlock("day-master-jeong", ["dayMaster:정", "element:fire", "yin"], 100, "정화 일간의 연애 방식", "작은 온기와 지속적인 확인이 사랑을 깊게 만든다.", ["정화 일간은 큰 사건보다 반복되는 다정함 속에서 마음을 연다.", "상대가 나를 세심하게 기억하고 챙겨 줄 때 깊은 안정감을 느낀다.", "관계의 불빛이 약해졌다고 느끼면 조용히 불안이 쌓일 수 있다."], ["확인을 기다리기보다 필요한 온기를 구체적으로 요청한다."], ["상대의 무심함을 곧바로 애정 부족으로 단정하지 않는다."], ["원하는 연락 리듬 말하기", "작은 고마움 표현하기", "불안한 날 결론 미루기"]),
  "무": loveBlock("day-master-mu", ["dayMaster:무", "element:earth", "yang"], 100, "무토 일간의 연애 방식", "넓은 품과 책임감이 관계의 기반을 세운다.", ["무토 일간은 관계를 쉽게 시작하기보다 오래 감당할 수 있는지를 본다.", "한번 마음을 정하면 흔들림 없이 지키려는 힘이 크다.", "상대에게 든든한 버팀목이 되지만 감정 표현은 늦어질 수 있다."], ["책임으로 사랑을 증명하기 전에 감정을 먼저 말한다."], ["침묵이 안정감이 아니라 거리감으로 읽힐 수 있다."], ["오늘의 감정 한 문장 말하기", "상대의 부담 확인하기", "도움과 통제 구분하기"]),
  "기": loveBlock("day-master-gi", ["dayMaster:기", "element:earth", "yin"], 100, "기토 일간의 연애 방식", "현실 감각과 돌봄이 사랑을 생활 속에 뿌리내리게 한다.", ["기토 일간은 상대의 생활 리듬과 실제 태도를 세밀하게 본다.", "관계가 편안해질수록 작은 돌봄과 실질적인 배려로 애정을 표현한다.", "다만 걱정이 많아지면 관계를 지나치게 관리하려 할 수 있다."], ["걱정을 조언으로 바꾸기 전에 상대의 마음을 먼저 묻는다."], ["상대를 고치려는 태도는 애정보다 간섭으로 느껴질 수 있다."], ["걱정과 사실 구분하기", "도움 요청 여부 묻기", "생활 규칙 함께 정하기"]),
  "경": loveBlock("day-master-gyeong", ["dayMaster:경", "element:metal", "yang"], 100, "경금 일간의 연애 방식", "분명한 태도와 결단력이 사랑의 신뢰를 만든다.", ["경금 일간은 애매한 관계보다 선명한 태도를 편안하게 느낀다.", "상대가 책임 있는 말과 행동을 보일 때 빠르게 신뢰한다.", "갈등이 생기면 핵심을 바로 짚지만 말의 날이 강해질 수 있다."], ["정답을 말하기 전에 상대의 감정부터 확인한다."], ["단호함이 반복되면 상대는 평가받는다고 느낄 수 있다."], ["비판 전 감정 확인하기", "결론보다 과정 말하기", "사과를 짧게 끝내지 않기"]),
  "신": loveBlock("day-master-sin", ["dayMaster:신", "element:metal", "yin"], 100, "신금 일간의 연애 방식", "섬세한 기준과 품격 있는 거리감이 사랑의 결을 만든다.", ["신금 일간은 관계에서도 말투, 약속, 취향의 미세한 결을 중요하게 본다.", "쉽게 마음을 열지 않지만 신뢰가 쌓이면 깊고 정교하게 애정을 표현한다.", "상대의 무례함이나 무심함에는 마음을 조용히 닫을 수 있다."], ["상대가 알아차리길 기다리지 말고 기준을 부드럽게 설명한다."], ["완벽한 태도를 기대하면 관계의 숨 쉴 공간이 줄어든다."], ["불편한 기준 말하기", "상대 장점 먼저 보기", "침묵으로 벌주지 않기"]),
  "임": loveBlock("day-master-im", ["dayMaster:임", "element:water", "yang"], 100, "임수 일간의 연애 방식", "넓은 이해와 자유로운 흐름이 사랑을 깊게 만든다.", ["임수 일간은 상대의 복잡한 마음도 비교적 넓게 받아들이려 한다.", "지적 대화와 삶의 가능성을 함께 나눌 때 매력을 크게 느낀다.", "구속이 강해지면 감정은 있어도 거리를 확보하려는 본능이 살아난다."], ["자유가 필요할 때 사라지지 말고 이유와 시간을 함께 말한다."], ["모든 것을 이해해 주는 태도 뒤에 내 욕구를 숨기지 않는다."], ["혼자만의 시간 합의하기", "내 욕구 직접 말하기", "관계의 경계 정하기"]),
  "계": loveBlock("day-master-gye", ["dayMaster:계", "element:water", "yin"], 100, "계수 일간의 연애 방식", "깊은 감수성과 조용한 신뢰가 사랑을 오래 적신다.", ["계수 일간은 상대의 말보다 분위기와 미묘한 변화를 먼저 감지한다.", "천천히 마음을 열지만 한 번 신뢰하면 깊은 정서적 연결을 원한다.", "불안이 커지면 확인을 직접 요구하기보다 혼자 해석할 수 있다."], ["상대의 마음을 추측하기보다 확인 질문을 짧게 던진다."], ["상상 속 결론이 실제 관계보다 커지지 않게 해야 한다."], ["확인 질문 하나 하기", "불안한 해석 기록하기", "감정이 가라앉은 뒤 대화하기"]),
});

const LOVE_FIVE_ELEMENT_BLOCKS = Object.freeze({
  "wood:strong": loveBlock("five-wood-strong", ["fiveElement:wood", "state:strong"], 80, "목 기운이 강한 연애 패턴", "관계의 성장과 방향을 중시한다.", ["목 기운이 강하면 사랑에서도 서로의 미래와 성장을 먼저 본다.", "좋은 관계는 함께 나아가는 느낌을 주어야 오래 지속된다."], ["상대의 현재 모습도 충분히 인정한다."], ["성장을 요구하는 말이 평가처럼 들릴 수 있다."], ["미래 이야기 전 현재 칭찬하기", "상대의 속도 확인하기"]),
  "wood:weak": loveBlock("five-wood-weak", ["fiveElement:wood", "state:weak"], 75, "목 기운이 부족한 연애 패턴", "관계 방향을 세우는 연습이 필요하다.", ["목 기운이 약하면 관계가 어디로 가는지 말하기 전까지 흐름에 끌려갈 수 있다.", "자기 기준을 세우면 애정의 불안이 줄어든다."], ["원하는 관계 형태를 짧게 정리한다."], ["상대의 방향에만 맞추면 뒤늦은 공허함이 생긴다."], ["관계 목표 쓰기", "거절 문장 연습하기"]),
  "fire:strong": loveBlock("five-fire-strong", ["fiveElement:fire", "state:strong"], 80, "화 기운이 강한 연애 패턴", "표현과 설렘이 관계를 빠르게 달군다.", ["화 기운이 강하면 애정 표현이 빠르고 분명해진다.", "상대의 반응이 약하면 관심이 식었다고 느끼기 쉽다."], ["뜨거운 감정 뒤에 안정적인 리듬을 붙인다."], ["감정 속도가 빠르면 상대가 압박을 느낄 수 있다."], ["답장 속도 요구 줄이기", "하루 뒤 다시 확인하기"]),
  "fire:weak": loveBlock("five-fire-weak", ["fiveElement:fire", "state:weak"], 75, "화 기운이 부족한 연애 패턴", "표현을 의식적으로 밝혀야 한다.", ["화 기운이 약하면 마음이 있어도 겉으로는 담담해 보일 수 있다.", "상대는 애정 부족이 아니라 표현 방식의 차이를 이해해야 한다."], ["고마움과 호감을 말로 남긴다."], ["표현을 미루면 관계가 차갑게 느껴질 수 있다."], ["칭찬 한 문장 보내기", "좋았던 순간 말하기"]),
  "earth:strong": loveBlock("five-earth-strong", ["fiveElement:earth", "state:strong"], 80, "토 기운이 강한 연애 패턴", "책임과 안정감이 관계의 중심이 된다.", ["토 기운이 강하면 관계를 쉽게 흔들지 않고 지키려 한다.", "다만 익숙한 방식만 고집하면 사랑의 생동감이 줄어든다."], ["안정감 속에도 새로운 경험을 섞는다."], ["책임감이 통제로 바뀌지 않게 한다."], ["새 데이트 제안하기", "상대 선택권 남기기"]),
  "earth:weak": loveBlock("five-earth-weak", ["fiveElement:earth", "state:weak"], 75, "토 기운이 부족한 연애 패턴", "관계를 담을 생활 기반이 필요하다.", ["토 기운이 약하면 감정은 있어도 지속 루틴을 만들기 어려울 수 있다.", "약속과 생활 리듬이 정리되면 관계 안정감이 크게 오른다."], ["만남, 연락, 돈의 기준을 현실적으로 정한다."], ["감정만 믿고 구조를 만들지 않으면 피로가 쌓인다."], ["연락 리듬 합의하기", "데이트 예산 정하기"]),
  "metal:strong": loveBlock("five-metal-strong", ["fiveElement:metal", "state:strong"], 80, "금 기운이 강한 연애 패턴", "기준과 신뢰가 사랑의 문을 연다.", ["금 기운이 강하면 관계에서도 예의, 약속, 책임을 중요하게 본다.", "상대가 기준을 흐리면 마음이 빠르게 닫힐 수 있다."], ["기준을 말할 때 이유와 감정을 함께 전한다."], ["차가운 판단처럼 들리지 않게 온도를 조절한다."], ["비판 전 장점 말하기", "규칙 함께 정하기"]),
  "metal:weak": loveBlock("five-metal-weak", ["fiveElement:metal", "state:weak"], 75, "금 기운이 부족한 연애 패턴", "경계와 선택 기준을 세워야 한다.", ["금 기운이 약하면 관계의 선을 늦게 긋고 상대에게 휘말릴 수 있다.", "분명한 기준이 생기면 사랑도 더 품격 있게 유지된다."], ["싫은 것과 가능한 것을 구분해 말한다."], ["모호한 허용은 반복 갈등을 만든다."], ["불가한 행동 목록 만들기", "거절 연습하기"]),
  "water:strong": loveBlock("five-water-strong", ["fiveElement:water", "state:strong"], 80, "수 기운이 강한 연애 패턴", "깊은 이해와 감정의 흐름이 관계를 이끈다.", ["수 기운이 강하면 상대의 사정과 복잡한 감정을 넓게 이해한다.", "그러나 감정의 깊이가 커질수록 말하지 않은 기대도 늘어날 수 있다."], ["이해한 만큼 나의 바람도 말한다."], ["혼자 해석하고 혼자 멀어지는 흐름을 경계한다."], ["확인 질문하기", "혼자 결론 내리지 않기"]),
  "water:weak": loveBlock("five-water-weak", ["fiveElement:water", "state:weak"], 75, "수 기운이 부족한 연애 패턴", "감정 회복과 휴식의 물길이 필요하다.", ["수 기운이 약하면 관계의 피로를 풀 시간이 부족해질 수 있다.", "감정을 쉬게 하는 시간이 있어야 애정도 오래 유지된다."], ["갈등 뒤 바로 결론을 내지 말고 회복 시간을 둔다."], ["휴식 없는 관계는 쉽게 건조해진다."], ["혼자 쉬는 시간 정하기", "감정 일지 쓰기"]),
  balanced: loveBlock("five-balanced", ["fiveElement:balanced", "state:balanced"], 70, "오행 균형형 연애 패턴", "감정, 현실, 표현의 균형을 비교적 잘 잡는다.", ["오행이 균형에 가까우면 관계 상황에 따라 유연하게 반응할 수 있다.", "다만 모든 것을 적당히 맞추려다 핵심 욕구를 흐릴 수 있다."], ["균형을 유지하되 가장 중요한 욕구 하나는 분명히 말한다."], ["무난함이 진심의 부재로 보이지 않게 한다."], ["핵심 욕구 고르기", "좋은 점 구체적으로 말하기"]),
});

const LOVE_TEN_GOD_BLOCKS = Object.freeze({
  "비견": loveBlock("ten-bigeon", ["tenGod:비견"], 80, "비견의 사랑 욕구", "동등함과 존중을 사랑의 핵심으로 삼는다.", ["비견이 강하면 연애에서도 나를 잃지 않는 관계를 원한다.", "상대와 나란히 서는 감각이 있을 때 애정이 안정된다."], ["상대와 경쟁하지 말고 같은 편이라는 신호를 자주 준다."], ["자존심 대결이 길어지면 회복이 늦어진다."], ["내 주장 전 상대 입장 요약하기", "공동 목표 만들기"]),
  "겁재": loveBlock("ten-geopjae", ["tenGod:겁재"], 78, "겁재의 사랑 욕구", "강한 끌림과 긴장 속에서 사랑을 확인한다.", ["겁재는 관계에 활력을 주지만 비교와 소유욕도 함께 올라올 수 있다.", "서로의 자유를 인정할 때 매력이 오래 간다."], ["확인 욕구를 공격이 아닌 요청으로 바꾼다."], ["질투를 시험으로 표현하지 않는다."], ["불안할 때 요청 문장 쓰기", "상대의 자유 인정하기"]),
  "식신": loveBlock("ten-siksin", ["tenGod:식신"], 78, "식신의 사랑 욕구", "편안함과 생활의 즐거움을 통해 사랑을 키운다.", ["식신은 함께 먹고 쉬고 웃는 시간에서 애정을 확인한다.", "관계가 편안할수록 꾸준한 정이 깊어진다."], ["좋은 루틴을 반복하되 감정 대화도 빼놓지 않는다."], ["편안함이 무심함으로 굳어지지 않게 한다."], ["함께하는 루틴 만들기", "감정 대화 시간 정하기"]),
  "상관": loveBlock("ten-sanggwan", ["tenGod:상관"], 78, "상관의 사랑 욕구", "솔직한 표현과 특별한 반응을 원한다.", ["상관은 사랑 안에서 말과 표현의 생동감을 중요하게 여긴다.", "상대가 나를 흥미롭게 받아 줄 때 마음이 크게 열린다."], ["직설 뒤에는 따뜻한 의도를 함께 전한다."], ["말의 날카로움이 매력을 상처로 바꿀 수 있다."], ["비판 대신 요청하기", "칭찬 먼저 말하기"]),
  "편재": loveBlock("ten-pyeonjae", ["tenGod:편재"], 78, "편재의 사랑 욕구", "설렘, 선택, 현실 감각이 함께 움직인다.", ["편재는 관계를 활기 있게 만들고 기회를 빠르게 포착한다.", "다만 분산이 커지면 한 사람에게 주는 안정감이 약해질 수 있다."], ["관계의 우선순위를 행동으로 보여 준다."], ["매력 확인이 반복되면 신뢰가 흔들린다."], ["약속 지키기", "관계 우선순위 정하기"]),
  "정재": loveBlock("ten-jeongjae", ["tenGod:정재"], 78, "정재의 사랑 욕구", "성실함과 실제 책임을 통해 사랑을 확인한다.", ["정재는 말보다 행동, 감정보다 지속성을 중요하게 본다.", "관계의 생활 기반이 잡히면 깊은 신뢰를 만든다."], ["책임감과 다정함을 함께 표현한다."], ["계산적 태도로 보이지 않게 마음을 말한다."], ["실제 약속 정리하기", "고마움 표현하기"]),
  "편관": loveBlock("ten-pyeongwan", ["tenGod:편관"], 78, "편관의 사랑 욕구", "강한 확신과 보호 본능이 사랑을 움직인다.", ["편관은 관계에서 위기 대응력과 결단을 보여 준다.", "상대에게 든든함을 주지만 긴장감도 함께 만들 수 있다."], ["보호와 통제를 구분한다."], ["상대를 지키려는 태도가 압박으로 느껴질 수 있다."], ["상대 선택권 묻기", "명령형 말 줄이기"]),
  "정관": loveBlock("ten-jeonggwan", ["tenGod:정관"], 78, "정관의 사랑 욕구", "신뢰, 예의, 공식성이 관계를 안정시킨다.", ["정관은 관계의 질서와 약속을 중요하게 여긴다.", "상대가 성실하고 예측 가능할 때 깊이 안심한다."], ["규칙을 세울 때 감정의 여지를 함께 둔다."], ["기준이 엄격하면 상대가 평가받는다고 느낄 수 있다."], ["규칙 합의하기", "감정 수용 문장 넣기"]),
  "편인": loveBlock("ten-pyeonin", ["tenGod:편인"], 78, "편인의 사랑 욕구", "깊은 이해와 독립적인 공간을 동시에 원한다.", ["편인은 쉽게 드러나지 않는 마음의 층을 중요하게 여긴다.", "혼자만의 시간이 보장될 때 오히려 관계에 더 깊게 돌아온다."], ["거리 두기가 거절로 보이지 않게 설명한다."], ["침묵이 길어지면 상대는 불안을 느낄 수 있다."], ["혼자만의 시간 알리기", "감정 닫힘 설명하기"]),
  "정인": loveBlock("ten-jeongin", ["tenGod:정인"], 78, "정인의 사랑 욕구", "정서적 보호와 따뜻한 수용을 원한다.", ["정인은 사랑 안에서 안전하게 기대고 돌볼 수 있는 감각을 중시한다.", "상대의 따뜻한 말과 반복되는 배려에 마음이 깊어진다."], ["받고 싶은 돌봄을 구체적으로 말한다."], ["기대가 의존으로 커지지 않게 한다."], ["원하는 위로 말하기", "스스로 회복 루틴 만들기"]),
});

const LOVE_RELATIONSHIP_BLOCKS = Object.freeze([
  loveBlock("spouse-star-core", ["relationship:spouseStar"], 76, "배우자성의 관계 욕구", "관계에서 기대하는 역할과 안정 조건을 보여 준다.", ["배우자성은 사랑에서 내가 무엇을 약속으로 느끼는지 알려 준다.", "강하게 드러날수록 관계의 이름, 책임, 태도에 민감해진다."], ["역할을 강요하기보다 서로의 기대를 문장으로 확인한다."], ["기대가 말없이 쌓이면 실망도 커진다."], ["관계에서 원하는 역할 쓰기", "상대 기대 묻기"]),
  loveBlock("day-branch-intimacy", ["relationship:dayBranch"], 74, "일지 기반 친밀감 패턴", "가까워진 뒤 드러나는 생활 감각과 신뢰 조건이다.", ["일지는 연애 초반보다 가까워진 뒤의 실제 반응을 보여 준다.", "생활 리듬, 거리감, 예민한 지점이 이 자리에서 선명해진다."], ["가까워진 뒤 필요한 규칙을 초반부터 부드럽게 공유한다."], ["설렘만 보고 일상의 맞물림을 생략하지 않는다."], ["생활 습관 확인하기", "거리감 합의하기"]),
]);

const LOVE_SPECIAL_STAR_BLOCKS = Object.freeze({
  dohwa: loveBlock("star-dohwa", ["specialStar:dohwa", "도화"], 74, "도화의 연애 신호", "끌림과 시선을 모으는 힘이 관계의 시작을 빠르게 만든다.", ["도화가 드러나면 첫인상과 분위기에서 호감이 생기기 쉽다.", "매력은 강점이지만 관계의 깊이는 별도의 신뢰로 만들어야 한다."], ["호감을 받은 뒤 관계의 기준을 천천히 확인한다."], ["시선의 많음이 진심의 깊이를 보장하지 않는다."], ["호감과 신뢰 구분하기", "속도 조절하기"]),
  hongyeom: loveBlock("star-hongyeom", ["specialStar:hongyeom", "홍염"], 74, "홍염의 연애 신호", "개인적 매혹과 감정의 온도가 강하게 살아난다.", ["홍염은 특정한 사람에게 깊은 인상을 남기는 힘이다.", "관계가 시작되면 감정의 온도가 빠르게 올라갈 수 있다."], ["강한 끌림일수록 생활의 안정성을 함께 본다."], ["감정의 열기가 판단을 앞서지 않게 한다."], ["끌림 후 하루 쉬기", "현실 조건 확인하기"]),
  hwagae: loveBlock("star-hwagae", ["specialStar:hwagae", "화개"], 72, "화개의 연애 신호", "혼자만의 세계와 깊은 취향이 사랑의 문이 된다.", ["화개는 쉽게 드러나지 않는 내면의 깊이를 만든다.", "상대가 그 세계를 존중할 때 마음이 열린다."], ["혼자 있고 싶은 시간을 관계의 일부로 설명한다."], ["닫힌 태도가 거절로 오해받지 않게 한다."], ["개인 시간 알리기", "취향 공유하기"]),
  yeokma: loveBlock("star-yeokma", ["specialStar:yeokma", "역마"], 72, "역마의 연애 신호", "이동, 변화, 새로운 경험이 관계를 깨운다.", ["역마는 사랑에서 움직임과 변화를 필요로 한다.", "같은 패턴이 반복되면 마음이 답답해질 수 있다."], ["관계 안에 작은 여행과 새 경험을 넣는다."], ["새로움만 좇으면 안정의 뿌리가 약해진다."], ["새 데이트 계획하기", "반복 루틴도 지키기"]),
});

const LOVE_STYLE_BLOCKS = Object.freeze({
  communication: loveBlock("style-communication", ["style:communication"], 70, "대화 방식", "사랑은 말의 양보다 확인의 정확도에서 안정된다.", ["좋은 대화는 상대를 이기기보다 서로의 감정 위치를 확인하는 과정이다.", "말투, 속도, 질문 방식이 관계의 체감 온도를 바꾼다."], ["판단보다 확인 질문을 먼저 둔다."], ["정답을 빨리 내리려 하면 마음의 문이 닫힌다."], ["감정 요약하기", "확인 질문하기", "결론 미루기"]),
  conflict: loveBlock("style-conflict", ["style:conflict"], 70, "갈등 방식", "갈등은 사랑의 끝이 아니라 조율 방식의 시험이다.", ["반복 갈등은 대개 감정 자체보다 처리 순서가 어긋날 때 커진다.", "각자의 방어 방식을 알면 같은 문제도 덜 아프게 다룰 수 있다."], ["갈등 주제와 감정 주제를 분리한다."], ["한 번의 싸움으로 관계 전체를 판정하지 않는다."], ["주제 하나만 다루기", "휴식 시간 합의하기"]),
  reconciliation: loveBlock("style-reconciliation", ["style:reconciliation"], 70, "화해 방식", "화해는 사과보다 다음 행동의 안정성에서 완성된다.", ["진짜 화해는 누가 맞았는지보다 다음에 어떻게 달라질지에서 시작된다.", "작은 약속이 반복될 때 신뢰가 다시 자란다."], ["사과 뒤에 구체적인 다음 행동을 붙인다."], ["말뿐인 화해는 같은 상처를 반복시킨다."], ["다음 행동 정하기", "확인 날짜 잡기"]),
  intimacy: loveBlock("style-intimacy", ["style:intimacy"], 70, "스킨십과 친밀감 표현", "친밀감은 속도와 동의가 맞을 때 깊어진다.", ["친밀감은 강도보다 서로 편안한 속도를 맞추는 일이 중요하다.", "몸과 마음의 거리가 함께 안전해야 애정이 깊어진다."], ["상대의 편안함을 확인하며 가까워진다."], ["분위기만 믿고 경계를 생략하지 않는다."], ["편안한 속도 묻기", "싫은 신호 존중하기"]),
  longTerm: loveBlock("style-long-term", ["style:longTerm"], 70, "장기 관계 유지 조건", "오래 가는 관계는 감정과 생활의 계약을 함께 돌본다.", ["장기 관계는 설렘만으로 유지되지 않고 생활의 규칙이 필요하다.", "돈, 시간, 가족, 일의 경계를 함께 정할수록 안정된다."], ["생활 합의를 작게 시작해 반복한다."], ["감정이 좋다는 이유로 현실 문제를 미루지 않는다."], ["돈 기준 정하기", "시간 배분 정하기", "가족 경계 말하기"]),
  breakup: loveBlock("style-breakup-pattern", ["style:breakup"], 70, "이별을 부르는 반복 패턴", "말하지 않은 기대와 누적된 거리감이 관계를 약하게 만든다.", ["이별의 신호는 큰 사건보다 반복되는 회피와 단정에서 먼저 온다.", "상대가 변하지 않는다고 느끼기 전 내 요청이 분명했는지 돌아봐야 한다."], ["서운함을 축적하지 말고 작을 때 말한다."], ["침묵, 시험, 단정은 관계 회복력을 낮춘다."], ["서운함 24시간 안에 말하기", "시험 행동 멈추기"]),
  routine30: loveBlock("routine-30-days", ["routine:30days"], 68, "30일 연애 루틴", "작은 반복이 사랑의 운을 현실로 끌어온다.", ["30일 동안 관계의 언어와 생활 리듬을 정리하면 애정의 방향이 선명해진다.", "매일 큰 행동보다 작은 확인과 꾸준한 태도가 중요하다."], ["하루 한 번 감정 확인, 주 1회 관계 대화, 월말 선택 기준 점검을 반복한다."], ["루틴을 숙제처럼 만들면 사랑의 생동감이 줄어든다."], ["매일 고마움 하나 말하기", "주 1회 감정 대화", "30일 뒤 관계 기준 점검"]),
});

const LOVE_INTERPRETATION_BLOCK_DB = Object.freeze({
  dayMaster: LOVE_DAY_MASTER_BLOCKS,
  fiveElements: LOVE_FIVE_ELEMENT_BLOCKS,
  tenGods: LOVE_TEN_GOD_BLOCKS,
  relationship: LOVE_RELATIONSHIP_BLOCKS,
  specialStars: LOVE_SPECIAL_STAR_BLOCKS,
  style: LOVE_STYLE_BLOCKS,
});

function loveSecretDayMasterBlockKey(stem = "") {
  const text = loveSecretScalar(stem);
  return text.slice(0, 1);
}

function selectFiveElementBlocks(fiveElements = {}) {
  const blocks = [];
  const strongest = Array.isArray(fiveElements.strongest) ? fiveElements.strongest : [];
  const weakest = Array.isArray(fiveElements.weakest) ? fiveElements.weakest : [];
  strongest.forEach((key) => {
    const block = LOVE_FIVE_ELEMENT_BLOCKS[`${key}:strong`];
    if (block) blocks.push(block);
  });
  weakest.forEach((key) => {
    const block = LOVE_FIVE_ELEMENT_BLOCKS[`${key}:weak`];
    if (block) blocks.push(block);
  });
  if (blocks.length === 0 || Math.abs(Number(fiveElements[strongest[0]] || 0) - Number(fiveElements[weakest[0]] || 0)) <= 1) {
    blocks.push(LOVE_FIVE_ELEMENT_BLOCKS.balanced);
  }
  return blocks;
}

function selectSpecialStarBlocks(stars = []) {
  const text = JSON.stringify(stars || []).toLowerCase();
  return [
    /dohwa|도화/.test(text) ? LOVE_SPECIAL_STAR_BLOCKS.dohwa : null,
    /hongyeom|홍염/.test(text) ? LOVE_SPECIAL_STAR_BLOCKS.hongyeom : null,
    /hwagae|화개/.test(text) ? LOVE_SPECIAL_STAR_BLOCKS.hwagae : null,
    /yeokma|역마/.test(text) ? LOVE_SPECIAL_STAR_BLOCKS.yeokma : null,
  ].filter(Boolean);
}

function selectLoveInterpretationBlocks(normalized = {}) {
  const blocks = [];
  const dayBlock = LOVE_DAY_MASTER_BLOCKS[loveSecretDayMasterBlockKey(normalized?.dayMaster?.stem)];
  if (dayBlock) blocks.push(dayBlock);
  blocks.push(...selectFiveElementBlocks(normalized?.fiveElements));
  const dominantTenGods = Array.isArray(normalized?.tenGods?.dominant) ? normalized.tenGods.dominant : [];
  dominantTenGods.forEach((key) => {
    if (LOVE_TEN_GOD_BLOCKS[key]) blocks.push(LOVE_TEN_GOD_BLOCKS[key]);
  });
  blocks.push(...LOVE_RELATIONSHIP_BLOCKS);
  blocks.push(...selectSpecialStarBlocks(normalized?.specialStars));
  blocks.push(
    LOVE_STYLE_BLOCKS.communication,
    LOVE_STYLE_BLOCKS.conflict,
    LOVE_STYLE_BLOCKS.reconciliation,
    LOVE_STYLE_BLOCKS.intimacy,
    LOVE_STYLE_BLOCKS.longTerm,
    LOVE_STYLE_BLOCKS.breakup,
    LOVE_STYLE_BLOCKS.routine30,
  );
  const seen = new Set();
  return blocks.filter((block) => {
    if (!block?.id || seen.has(block.id)) return false;
    seen.add(block.id);
    return true;
  }).sort((a, b) => Number(b.weight || 0) - Number(a.weight || 0));
}

function normalizeSoloLoveSecretData(person = {}) {
  const profile = person?.user && typeof person.user === "object" ? person.user : {};
  const pillars = person?.pillars && typeof person.pillars === "object" ? person.pillars : {};
  const core = person?.core && typeof person.core === "object" ? person.core : {};
  const ref = person?.loveSecretReference && typeof person.loveSecretReference === "object" ? person.loveSecretReference : {};
  const counts = normalizeElementCounts(person?.elementBalance?.counts || person?.fiveElements?.counts || {});
  const elementEntries = Object.entries(counts).sort((a, b) => Number(b[1]) - Number(a[1]));
  const strongest = elementEntries.filter(([, value]) => Number(value) > 0 && Number(value) === Number(elementEntries[0]?.[1] || 0)).map(([key]) => key);
  const weakestValue = elementEntries.length ? Number(elementEntries[elementEntries.length - 1][1] || 0) : 0;
  const weakest = elementEntries.filter(([, value]) => Number(value) === weakestValue).map(([key]) => key);
  const tenGodDistribution = normalizeLoveSecretDistribution(person?.tenGods?.counts || {});
  const dayMasterStem = loveSecretScalar(core?.dayMaster);
  const stemTraits = loveSecretStemTraits(dayMasterStem);
  const dayBranch = loveSecretScalar(core?.dayBranch);
  const usefulElements = Array.isArray(person?.yongshin?.usefulElements) ? person.yongshin.usefulElements.map(loveSecretScalar).filter(Boolean) : [];
  const cautionElements = Array.isArray(person?.yongshin?.cautionElements) ? person.yongshin.cautionElements.map(loveSecretScalar).filter(Boolean) : [];

  return {
    mode: "solo",
    profile: {
      name: loveSecretScalar(profile?.name),
      gender: loveSecretScalar(profile?.gender),
      birthDate: loveSecretScalar(profile?.birthDate),
      birthTime: loveSecretScalar(profile?.birthTime),
      calendarType: loveSecretScalar(profile?.calendarType),
    },
    pillars: {
      year: loveSecretPillarRaw(pillars?.year),
      month: loveSecretPillarRaw(pillars?.month),
      day: loveSecretPillarRaw(pillars?.day),
      hour: loveSecretPillarRaw(pillars?.hour),
    },
    dayMaster: {
      stem: dayMasterStem,
      element: loveSecretScalar(stemTraits.element),
      yinYang: loveSecretScalar(stemTraits.yinYang),
      strength: loveSecretStrengthCode(person?.strength),
    },
    dayBranch: dayBranch ? {
      branch: dayBranch,
      element: loveSecretBranchElement(dayBranch),
      relationshipHint: loveSecretScalar(branchRelationType(dayBranch, dayBranch)),
    } : undefined,
    fiveElements: {
      ...counts,
      strongest,
      weakest,
      balanceSummary: loveSecretScalar(person?.elementBalance?.summary) || loveSecretBalanceSummary(counts, strongest, weakest),
    },
    tenGods: {
      distribution: tenGodDistribution,
      dominant: loveSecretRankedKeys(tenGodDistribution, "desc"),
      weak: loveSecretRankedKeys(tenGodDistribution, "asc"),
    },
    lovePattern: {
      attractionStyle: loveSecretStringList(ref?.identity?.summary, ref?.identity?.instinct, ref?.idealPartner?.personality),
      intimacyStyle: loveSecretStringList(ref?.identity?.unconscious, ref?.compatibility?.emotionalMood),
      communicationStyle: loveSecretStringList(ref?.strengthTip, ref?.gaeun?.affirmation),
      conflictPattern: loveSecretStringList(ref?.compatibility?.tensionPoint, ...(Array.isArray(ref?.risks) ? ref.risks.map((risk) => risk?.title) : [])),
      emotionalNeeds: loveSecretStringList(ref?.idealPartner?.element, ref?.idealPartner?.personality, ref?.yongshinElementLabel),
      cautionPoints: loveSecretStringList(...(Array.isArray(ref?.risks) ? ref.risks.map((risk) => risk?.solution || risk?.title) : [])),
    },
    usefulGods: {
      yongshin: loveSecretScalar(person?.yongshin?.yongshin || usefulElements[0]),
      heeshin: Array.isArray(person?.yongshin?.heeshin) ? person.yongshin.heeshin.map(loveSecretScalar).filter(Boolean) : usefulElements.slice(1),
      gishin: Array.isArray(person?.yongshin?.gishin) ? person.yongshin.gishin.map(loveSecretScalar).filter(Boolean) : cautionElements,
      loveDirectionSummary: loveSecretScalar(ref?.yongshinElementLabel || ref?.strengthTip || person?.strength?.reason),
    },
    timing: {
      currentDaewoon: Array.isArray(person?.timing?.daeun) ? person.timing.daeun[0] : person?.timing?.currentDaewoon,
      annualLuck: person?.timing?.annualLuck || person?.timing?.annualLuck2026,
      monthlyLuck: Array.isArray(person?.timing?.monthlyLuck) ? person.timing.monthlyLuck : person?.timing?.monthlyLuck2026,
    },
    specialStars: normalizeLoveSecretSpecialStars(person?.specialStars),
    opportunities: loveSecretStringList(ref?.strengthTip, ref?.gaeun?.livingColor, ref?.gaeun?.perfume, ref?.gaeun?.affirmation),
    risks: loveSecretStringList(...(Array.isArray(ref?.risks) ? ref.risks.map((risk) => risk?.title || risk?.solution) : [])),
  };
}

function normalizeLoveSecretScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score : undefined;
}

function normalizeCompatibilityLoveSecretData({ self = {}, partner = {}, compatibility = {} } = {}) {
  const me = normalizeSoloLoveSecretData(self);
  const mate = normalizeSoloLoveSecretData(partner);
  const compat = compatibility && typeof compatibility === "object" ? compatibility : {};
  const compatRef = self?.loveSecretReference?.compatibility && typeof self.loveSecretReference.compatibility === "object" ? self.loveSecretReference.compatibility : {};
  const elementRelation = loveSecretStringList(
    compat?.fiveElementComplement?.summary,
    compat?.fiveElementComplement?.personAFillsB ? "내 강한 오행이 상대의 보완 지점을 채운다" : "",
    compat?.fiveElementComplement?.personBFillsA ? "상대의 강한 오행이 나의 보완 지점을 채운다" : "",
    Array.isArray(compat?.fiveElementComplement?.sharedStrongElements) ? `공유 오행: ${compat.fiveElementComplement.sharedStrongElements.join(", ")}` : "",
  );
  const dayMasterRelation = loveSecretStringList(
    compat?.dayMasterRelation?.personA && compat?.dayMasterRelation?.personB
      ? `${compat.dayMasterRelation.personA} / ${compat.dayMasterRelation.personB}`
      : "",
  );
  const dayBranchRelation = loveSecretStringList(compat?.spousePalaceRelation?.relationType, compat?.monthBranchLifeRhythm?.relationType);
  const tenGodRelation = loveSecretStringList(
    me.tenGods.dominant.length ? `나의 중심 십성: ${me.tenGods.dominant.join(", ")}` : "",
    mate.tenGods.dominant.length ? `상대의 중심 십성: ${mate.tenGods.dominant.join(", ")}` : "",
  );
  const usefulGodRelation = loveSecretStringList(
    me.usefulGods.yongshin ? `나의 보완 기운: ${me.usefulGods.yongshin}` : "",
    mate.usefulGods.yongshin ? `상대의 보완 기운: ${mate.usefulGods.yongshin}` : "",
  );

  return {
    mode: "compatibility",
    me,
    partner: mate,
    compatibility: {
      totalScore: normalizeLoveSecretScore(compat?.totalScore || compat?.score),
      emotionalScore: normalizeLoveSecretScore(compat?.emotionalScore),
      communicationScore: normalizeLoveSecretScore(compat?.communicationScore),
      attractionScore: normalizeLoveSecretScore(compat?.attractionScore),
      stabilityScore: normalizeLoveSecretScore(compat?.stabilityScore),
      conflictScore: normalizeLoveSecretScore(compat?.conflictScore),
      elementRelation,
      dayMasterRelation,
      dayBranchRelation,
      tenGodRelation,
      usefulGodRelation,
      strengths: loveSecretStringList(compatRef?.emotionalMood, compat?.fiveElementComplement?.summary, compat?.johuIntimacy?.comfortableRhythm),
      conflictPoints: loveSecretStringList(compatRef?.tensionPoint, compat?.spousePalaceRelation?.relationType, compat?.monthBranchLifeRhythm?.relationType),
      reconciliationKeys: loveSecretStringList(compatRef?.strategyLine, ...(Array.isArray(compat?.johuIntimacy?.practiceGuide) ? compat.johuIntimacy.practiceGuide : [])),
      longTermKeys: loveSecretStringList(compatRef?.strategyLine, compat?.johuIntimacy?.comfortableRhythm),
    },
    timing: {
      relationshipFlow: loveSecretStringList(compat?.monthBranchLifeRhythm?.relationType, compatRef?.strategyLine).join(" / "),
      currentYearAdvice: loveSecretStringList(compatRef?.strategyLine),
      monthlyAdvice: Array.isArray(self?.loveSecretReference?.monthlyWindows?.best) ? self.loveSecretReference.monthlyWindows.best : undefined,
    },
  };
}

function normalizeLoveSecretForPdf(masterJson = {}) {
  const mode = normalizeMode(masterJson?.mode);
  if (mode === "compatibility") {
    const normalized = normalizeCompatibilityLoveSecretData({
      self: masterJson?.self,
      partner: masterJson?.partner,
      compatibility: masterJson?.compatibility,
    });
    return {
      ...normalized,
      interpretationBlocks: compactLoveSecretObject({
        me: selectLoveInterpretationBlocks(normalized.me),
        partner: selectLoveInterpretationBlocks(normalized.partner),
      }),
    };
  }
  const normalized = normalizeSoloLoveSecretData(masterJson?.self);
  return {
    ...normalized,
    interpretationBlocks: selectLoveInterpretationBlocks(normalized),
  };
}

function buildLoveSecretMasterPersonJson(base = {}, targetYear = 2026) {
  const src = base && typeof base === "object" ? base : {};
  const reference = src?.loveSecretReference && typeof src.loveSecretReference === "object"
    ? src.loveSecretReference
    : buildLoveSecretReference(src);
  const birthDate = clean(src?.user?.birthDate || src?.birthDate);
  const birthTime = clean(src?.user?.birthTime || src?.birthTime);
  const counts = src?.elementBalance?.counts && typeof src.elementBalance.counts === "object" ? src.elementBalance.counts : {};
  const pillars = src?.pillars && typeof src.pillars === "object" ? src.pillars : {};

  return compactLoveSecretObject({
    user: {
      name: clean(src?.user?.name || "의뢰인"),
      gender: clean(src?.user?.gender),
      birthDate,
      birthTime,
      calendarType: clean(src?.user?.calendarType || "solar") || "solar",
      currentAge: loveSecretAgeAtYear(birthDate, targetYear),
      isAdult: typeof loveSecretAgeAtYear(birthDate, targetYear) === "number"
        ? loveSecretAgeAtYear(birthDate, targetYear) >= 19
        : undefined,
    },
    pillars: {
      year: pillars.year,
      month: pillars.month,
      day: pillars.day,
      hour: pillars.hour,
    },
    eightCharacters: ["year", "month", "day", "hour"].map((key) => loveSecretPillarRaw(pillars?.[key])).filter(Boolean).join(" "),
    core: {
      dayMaster: clean(src?.core?.dayMaster),
      dayBranch: clean(src?.core?.dayBranch),
      monthBranch: clean(src?.core?.monthBranch),
      season: clean(src?.core?.season),
    },
    elementBalance: {
      counts,
      dominant: clean(src?.elementBalance?.dominant),
      deficient: clean(src?.elementBalance?.deficient),
      balanceScore: src?.elementBalance?.balanceScore,
    },
    fiveElements: {
      counts,
      excessive: clean(src?.elementBalance?.dominant),
      deficient: clean(src?.elementBalance?.deficient),
    },
    tenGods: src?.tenGods,
    strength: src?.strength,
    johu: src?.johu,
    yongshin: src?.yongshin,
    specialStars: src?.specialStars,
    timing: src?.timing,
    loveSecretReference: reference,
  });
}

function buildLoveSecretConsultationEvidence(masterJson = {}) {
  const mode = normalizeMode(masterJson?.mode);
  const self = masterJson?.self || {};
  const partner = masterJson?.partner || {};
  const ref = self?.loveSecretReference || {};
  const evidence = [
    `원국 8글자: ${clean(self?.eightCharacters)}`,
    `일간과 일지: ${clean(self?.core?.dayMaster)} / ${clean(self?.core?.dayBranch)}`,
    `오행 중심: 강한 기운 ${clean(self?.elementBalance?.dominant)}, 보완 기운 ${clean(self?.elementBalance?.deficient)}`,
    `용신 흐름: ${(Array.isArray(self?.yongshin?.usefulElements) ? self.yongshin.usefulElements : []).join(", ")}`,
    `연애 정체성: ${clean(ref?.identity?.summary || ref?.identity?.title || ref?.dayMasterLabel)}`,
    `이상적 인연상: ${clean(ref?.idealPartner?.personality || ref?.idealPartner?.element || ref?.yongshinElementLabel)}`,
  ].filter((line) => clean(line).replace(/undefined|null/g, "").length > 8);

  if (mode === "compatibility") {
    evidence.push(
      `상대 원국 8글자: ${clean(partner?.eightCharacters)}`,
      `상대 일간과 일지: ${clean(partner?.core?.dayMaster)} / ${clean(partner?.core?.dayBranch)}`,
      `배우자궁 관계: ${clean(masterJson?.compatibility?.spousePalaceRelation?.relationType)}`,
      `생활 리듬 관계: ${clean(masterJson?.compatibility?.monthBranchLifeRhythm?.relationType)}`,
    );
  }

  return compactLoveSecretObject({
    sajuEvidence: evidence,
    interpretationOrder: ["사주 근거", "연애 심리", "상대가 느끼는 분위기", "현실 행동", "품격 있는 주의점"],
    writingVoice: "최고의 연애 상담가가 조용히 핵심을 짚어 주는 전문적이고 신비로운 존댓말 상담체",
    safety: ["결과 단정 금지", "불안 조장 금지", "상대 조종 표현 금지", "노골적 성적 표현 금지"],
  });
}

function buildLoveSecretMasterJson({ base = {}, mode = "solo", body = {}, targetYear = 2026 } = {}) {
  const normalizedMode = normalizeMode(mode);
  const self = buildLoveSecretMasterPersonJson(base, targetYear);
  const partner = normalizedMode === "compatibility"
    ? buildLoveSecretMasterPersonJson(base?.partner || {}, targetYear)
    : undefined;
  const clientEvidence = body?.quantumMyeongriJson || body?.clientEngineEvidence || body?.clientMyeongriJson || null;
  const compatibility = normalizedMode === "compatibility"
    ? compactLoveSecretObject({
        dayMasterRelation: {
          personA: clean(self?.core?.dayMaster),
          personB: clean(partner?.core?.dayMaster),
        },
        spousePalaceRelation: {
          personA: clean(self?.core?.dayBranch),
          personB: clean(partner?.core?.dayBranch),
          relationType: branchRelationType(self?.core?.dayBranch, partner?.core?.dayBranch),
        },
        monthBranchLifeRhythm: {
          personA: clean(self?.core?.monthBranch),
          personB: clean(partner?.core?.monthBranch),
          relationType: branchRelationType(self?.core?.monthBranch, partner?.core?.monthBranch),
        },
        fiveElementComplement: elementComplement(self, partner),
        johuIntimacy: buildJohuIntimacyData(self, partner),
        reference: self?.loveSecretReference?.compatibility,
      })
    : undefined;
  const masterJson = compactLoveSecretObject({
    schemaVersion: "love-secret-master-json.v1",
    calculationSource: "worker-saju-engine",
    generationMode: LOVE_SECRET_PDF_CONFIG.generationMode,
    mode: normalizedMode,
    analysis: { targetYear },
    self,
    partner,
    compatibility,
    clientEngineEvidence: clientEvidence && typeof clientEvidence === "object"
      ? {
          usagePolicy: "supplemental_only_worker_engine_is_source_of_truth",
          snapshot: safeLoveSecretClone(clientEvidence),
        }
      : undefined,
    qualityRules: {
      mustUseOnlyProvidedEvidence: true,
      mustKeepCounselingTone: true,
      mustAvoidDeterministicClaims: true,
      mustAvoidManipulativeAdvice: true,
    },
  });
  const normalizedLoveSecret = normalizeLoveSecretForPdf(masterJson);

  return {
    ...masterJson,
    normalizedLoveSecret,
    consultationEvidence: buildLoveSecretConsultationEvidence(masterJson),
  };
}

function loveSecretPublicMode(mode) {
  return normalizeMode(mode) === "compatibility" ? "couple" : "solo";
}

function stableLoveSecretStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableLoveSecretStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableLoveSecretStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function loveSecretHashValue(value) {
  const text = stableLoveSecretStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildLoveSecretPdfCacheDescriptor(base = {}, mode = "solo", body = {}) {
  const normalizedMode = normalizeMode(mode);
  const profile = {
    user: safeLoveSecretClone(base?.user || {}),
    pillars: safeLoveSecretClone(base?.pillars || {}),
  };
  const calculationResultHash = loveSecretHashValue({
    pillars: base?.pillars,
    core: base?.core,
    elementBalance: base?.elementBalance,
    tenGods: base?.tenGods,
    strength: base?.strength,
    yongshin: base?.yongshin,
    specialStars: base?.specialStars,
    timing: base?.timing,
    loveSecretReference: base?.loveSecretReference,
    normalizedLoveSecret: base?.normalizedLoveSecret,
    clientEngineEvidence: body?.clientEngineEvidence,
    quantumMyeongriJson: body?.quantumMyeongriJson,
  });
  if (normalizedMode !== "compatibility") {
    return {
      service: "love-secret",
      mode: "solo",
      version: LOVE_SECRET_PDF_CONFIG.templateVersion,
      profile,
      calculationResultHash,
    };
  }
  const partnerProfile = {
    user: safeLoveSecretClone(base?.partner?.user || {}),
    pillars: safeLoveSecretClone(base?.partner?.pillars || {}),
  };
  const partnerCalculationResultHash = loveSecretHashValue({
    pillars: base?.partner?.pillars,
    core: base?.partner?.core,
    elementBalance: base?.partner?.elementBalance,
    tenGods: base?.partner?.tenGods,
    strength: base?.partner?.strength,
    yongshin: base?.partner?.yongshin,
    specialStars: base?.partner?.specialStars,
    timing: base?.partner?.timing,
    loveSecretReference: base?.partner?.loveSecretReference,
    normalizedLoveSecret: base?.partner?.normalizedLoveSecret,
  });
  const compatibilityResultHash = loveSecretHashValue({
    compatibility: base?.compatibility,
    loveSecretReferenceCompatibility: base?.loveSecretReference?.compatibility,
    normalizedLoveSecret: base?.normalizedLoveSecret?.compatibility,
  });
  return {
    service: "love-secret",
    mode: "compatibility",
    version: LOVE_SECRET_PDF_CONFIG.templateVersion,
    myProfile: profile,
    partnerProfile,
    myCalculationResultHash: calculationResultHash,
    partnerCalculationResultHash,
    compatibilityResultHash,
  };
}

function buildLoveSecretPdfCacheKey(base = {}, mode = "solo", body = {}) {
  return `love-secret:${loveSecretHashValue(buildLoveSecretPdfCacheDescriptor(base, mode, body))}`;
}

function getLoveSecretPdfMemoryCache(cacheKey) {
  const key = clean(cacheKey);
  if (!key) return null;
  const cached = LOVE_SECRET_PDF_CACHE.get(key);
  if (!cached) return null;
  LOVE_SECRET_PDF_CACHE.delete(key);
  LOVE_SECRET_PDF_CACHE.set(key, cached);
  return cached;
}

function setLoveSecretPdfMemoryCache(cacheKey, payload) {
  const key = clean(cacheKey);
  if (!key || !payload || typeof payload !== "object") return;
  LOVE_SECRET_PDF_CACHE.set(key, {
    ...payload,
    cacheKey: key,
    cachedAt: new Date().toISOString(),
  });
  while (LOVE_SECRET_PDF_CACHE.size > LOVE_SECRET_PDF_CACHE_MAX) {
    const oldest = LOVE_SECRET_PDF_CACHE.keys().next().value;
    if (!oldest) break;
    LOVE_SECRET_PDF_CACHE.delete(oldest);
  }
}

function loveSecretListFromValues(...values) {
  return values.map((value) => stripUnsafeText(value)).filter(Boolean);
}

function buildLoveSecretPeachBlossomIndicators(person = {}) {
  const stars = person?.specialStars && typeof person.specialStars === "object" ? person.specialStars : {};
  return loveSecretListFromValues(
    stars.dohwa ? `도화: ${stableLoveSecretStringify(stars.dohwa)}` : "",
    stars.hongyeom ? `홍염: ${stableLoveSecretStringify(stars.hongyeom)}` : "",
    stars.moonchang ? `문창: ${stableLoveSecretStringify(stars.moonchang)}` : "",
    stars.cheoneul ? `천을: ${stableLoveSecretStringify(stars.cheoneul)}` : "",
    stars.yeokma ? `역마: ${stableLoveSecretStringify(stars.yeokma)}` : "",
  ).slice(0, 8);
}

function buildLoveSecretFacts(masterJson = {}) {
  const mode = normalizeMode(masterJson?.mode);
  const self = masterJson?.self && typeof masterJson.self === "object" ? masterJson.self : {};
  const partner = mode === "compatibility" && masterJson?.partner && typeof masterJson.partner === "object" ? masterJson.partner : {};
  const ref = self?.loveSecretReference && typeof self.loveSecretReference === "object" ? self.loveSecretReference : {};
  const compatRef = ref?.compatibility && typeof ref.compatibility === "object" ? ref.compatibility : {};
  const compatibility = masterJson?.compatibility && typeof masterJson.compatibility === "object" ? masterJson.compatibility : {};
  const strengthLabel = clean(self?.strength?.label) || (self?.strength?.isStrong === true ? "신강" : self?.strength?.isStrong === false ? "신약" : "");
  const partnerStrengthLabel = clean(partner?.strength?.label) || (partner?.strength?.isStrong === true ? "신강" : partner?.strength?.isStrong === false ? "신약" : "");

  return compactLoveSecretObject({
    productId: LOVE_SECRET_PRODUCT_ID,
    mode: loveSecretPublicMode(mode),
    birthInfo: safeLoveSecretClone(self?.user),
    partnerBirthInfo: mode === "compatibility" ? safeLoveSecretClone(partner?.user) : undefined,
    fourPillars: safeLoveSecretClone(self?.pillars),
    partnerFourPillars: mode === "compatibility" ? safeLoveSecretClone(partner?.pillars) : undefined,
    dayMaster: clean(self?.core?.dayMaster),
    partnerDayMaster: mode === "compatibility" ? clean(partner?.core?.dayMaster) : undefined,
    dayMasterStrength: strengthLabel,
    partnerDayMasterStrength: mode === "compatibility" ? partnerStrengthLabel : undefined,
    fiveElementBalance: safeLoveSecretClone(self?.elementBalance || self?.fiveElements),
    partnerFiveElementBalance: mode === "compatibility" ? safeLoveSecretClone(partner?.elementBalance || partner?.fiveElements) : undefined,
    tenGods: safeLoveSecretClone(self?.tenGods),
    partnerTenGods: mode === "compatibility" ? safeLoveSecretClone(partner?.tenGods) : undefined,
    relationshipStars: safeLoveSecretClone(self?.specialStars),
    spouseStar: compactLoveSecretObject({
      label: clean(self?.tenGods?.spouseStar || resolveSpouseStarLabel(self?.user?.gender)),
      dayBranch: clean(self?.core?.dayBranch),
    }),
    peachBlossomIndicators: buildLoveSecretPeachBlossomIndicators(self),
    attractionPattern: loveSecretListFromValues(ref?.identity?.summary, ref?.identity?.instinct, ref?.idealPartner?.personality, compatRef?.feminineAppealFocus),
    loveExpressionStyle: loveSecretListFromValues(ref?.identity?.unconscious, ref?.strengthTip, ref?.gaeun?.affirmation),
    emotionalNeeds: loveSecretListFromValues(ref?.idealPartner?.element, ref?.idealPartner?.personality, ref?.yongshinElementLabel),
    attachmentRiskPatterns: loveSecretCleanList(Array.isArray(ref?.risks) ? ref.risks.map((risk) => `${risk?.title || ""} ${risk?.solution || ""}`) : [], 6),
    conflictPatterns: loveSecretListFromValues(compatRef?.tensionPoint, compatibility?.spousePalaceRelation?.relationType, compatibility?.monthBranchLifeRhythm?.relationType),
    idealPartnerPattern: loveSecretListFromValues(ref?.idealPartner?.personality, ref?.idealPartner?.element, ref?.marriageAgeLabel),
    datingStrategy: loveSecretListFromValues(ref?.strengthTip, ref?.gaeun?.livingColor, ref?.gaeun?.perfume, ref?.gaeun?.affirmation),
    marriagePattern: loveSecretListFromValues(ref?.marriageAgeLabel, ref?.strengthTip, compatibility?.spousePalaceRelation?.relationType),
    breakupRiskPatterns: loveSecretCleanList(Array.isArray(ref?.risks) ? ref.risks.map((risk) => `${risk?.title || ""}: ${risk?.solution || ""}`) : [], 6),
    reconciliationPatterns: loveSecretListFromValues(compatRef?.strategyLine, "감정이 커진 날에는 결론보다 말의 온도와 회복 순서를 먼저 조율한다"),
    majorLuckLoveCycles: Array.isArray(self?.timing?.daeun) ? self.timing.daeun.slice(0, 4).map((row) => clean(row?.ganji || row?.label || row?.name)).filter(Boolean) : [],
    annualLoveFlow: Array.isArray(ref?.monthlyWindows?.best) ? ref.monthlyWindows.best.slice(0, 4).map((row) => `${row.month} ${row.score}점`) : [],
    coupleCompatibility: mode === "compatibility" ? safeLoveSecretClone(compatibility) : undefined,
    coupleStrengths: mode === "compatibility" ? loveSecretListFromValues(compatRef?.emotionalMood, compatibility?.fiveElementComplement?.summary, compatibility?.johuIntimacy?.summary) : undefined,
    coupleRisks: mode === "compatibility" ? loveSecretListFromValues(compatRef?.tensionPoint, compatibility?.spousePalaceRelation?.relationType, compatibility?.monthBranchLifeRhythm?.relationType) : undefined,
    coupleAdvice: mode === "compatibility" ? loveSecretListFromValues(compatRef?.strategyLine, "본인과 상대의 감정 속도를 분리해서 읽고 같은 결론을 강요하지 않는다") : undefined,
  });
}

function loveSecretChapterIdsForMode(mode) {
  return normalizeMode(mode) === "compatibility" ? LOVE_SECRET_COMPATIBILITY_CHAPTER_IDS : LOVE_SECRET_SOLO_CHAPTER_IDS;
}

function loveSecretEnhancedChapterSet(mode) {
  return new Set(normalizeMode(mode) === "compatibility" ? LOVE_SECRET_COUPLE_LLM_ENHANCED_CHAPTERS : LOVE_SECRET_SOLO_LLM_ENHANCED_CHAPTERS);
}

function isLoveSecretEnhancedChapter(mode, chapterId) {
  return loveSecretEnhancedChapterSet(mode).has(clean(chapterId));
}

function buildLoveSecretLockedFacts(facts = {}, chapterId = "", mode = "solo") {
  const compatibility = facts?.coupleCompatibility && typeof facts.coupleCompatibility === "object" ? facts.coupleCompatibility : {};
  const elementBalance = facts?.fiveElementBalance && typeof facts.fiveElementBalance === "object" ? facts.fiveElementBalance : {};
  const partnerElementBalance = facts?.partnerFiveElementBalance && typeof facts.partnerFiveElementBalance === "object" ? facts.partnerFiveElementBalance : {};
  const baseFacts = loveSecretListFromValues(
    facts.dayMaster ? `본인 일간: ${facts.dayMaster}` : "",
    facts.dayMasterStrength ? `본인 일간 강약: ${facts.dayMasterStrength}` : "",
    elementBalance.dominant ? `본인 우세 오행: ${elementBalance.dominant}` : "",
    elementBalance.deficient ? `본인 보완 오행: ${elementBalance.deficient}` : "",
    facts.spouseStar?.label ? `배우자성: ${facts.spouseStar.label}` : "",
    Array.isArray(facts.peachBlossomIndicators) && facts.peachBlossomIndicators.length ? `연애 신살: ${facts.peachBlossomIndicators.join(", ")}` : "",
  );
  if (normalizeMode(mode) === "compatibility") {
    baseFacts.push(...loveSecretListFromValues(
      facts.partnerDayMaster ? `상대 일간: ${facts.partnerDayMaster}` : "",
      facts.partnerDayMasterStrength ? `상대 일간 강약: ${facts.partnerDayMasterStrength}` : "",
      partnerElementBalance.dominant ? `상대 우세 오행: ${partnerElementBalance.dominant}` : "",
      partnerElementBalance.deficient ? `상대 보완 오행: ${partnerElementBalance.deficient}` : "",
      compatibility?.spousePalaceRelation?.relationType ? `배우자궁 관계: ${compatibility.spousePalaceRelation.relationType}` : "",
      compatibility?.monthBranchLifeRhythm?.relationType ? `생활 리듬 관계: ${compatibility.monthBranchLifeRhythm.relationType}` : "",
    ));
  }
  const chapterFacts = {
    attraction_pattern: facts.attractionPattern,
    love_risk_pattern: facts.attachmentRiskPatterns,
    ideal_partner_gap: facts.idealPartnerPattern,
    breakup_risk: facts.breakupRiskPatterns,
    love_luck_cycles: facts.majorLuckLoveCycles,
    love_master_plan: facts.datingStrategy,
    couple_code: loveSecretListFromValues(facts.coupleStrengths, facts.coupleRisks),
    first_attraction: facts.coupleStrengths,
    emotional_match: loveSecretListFromValues(facts.coupleStrengths, facts.coupleRisks),
    communication_match: facts.communicationStyle,
    conflict_match: facts.coupleRisks,
    reconciliation_match: facts.coupleAdvice,
    reality_match: facts.marriagePattern,
    long_term_relation: facts.marriagePattern,
    current_year_flow: facts.majorLuckLoveCycles,
    attraction_reason: facts.coupleStrengths,
    emotional_tempo_gap: facts.coupleRisks,
    conflict_pattern: facts.conflictPatterns,
    long_term_potential: facts.marriagePattern,
    couple_luck_cycles: facts.majorLuckLoveCycles,
    couple_master_plan: facts.coupleAdvice,
  }[chapterId];
  return Array.from(new Set([...baseFacts, ...loveSecretCleanList(chapterFacts, 6)])).slice(0, 12);
}

function buildLoveSecretChapterPurpose(chapterId, title, mode) {
  const prefix = normalizeMode(mode) === "compatibility" ? "두 사람의 관계에서" : "독자의 연애 흐름에서";
  const purposeById = {
    love_overview: "연애 기질의 전체 인상을 확정 계산값에 맞춰 정리한다",
    attraction_pattern: "끌림과 반복 인연의 원인을 현실적 선택 기준으로 풀어낸다",
    love_risk_pattern: "흔들림과 불안을 낙인 없이 조율 가능한 신호로 설명한다",
    ideal_partner_gap: "이상형과 실제로 안정적인 인연의 차이를 분리한다",
    breakup_risk: "이별을 부르는 패턴을 단정하지 않고 회피 전략으로 전환한다",
    love_luck_cycles: "대운과 세운 흐름을 새로운 계산 없이 상담문으로 풀어낸다",
    love_master_plan: "앞으로의 관계 선택을 실행 가능한 마스터플랜으로 정리한다",
    couple_code: "두 사람의 관계 코드를 확정 궁합 근거에 맞춰 정리한다",
    first_attraction: "첫 끌림과 분위기를 각자의 명식과 관계 역학으로 설명한다",
    emotional_match: "감정 궁합을 정서적 안정감과 불안 요소로 나누어 풀어낸다",
    communication_match: "두 사람이 말이 통하는 방식과 오해 지점을 정리한다",
    conflict_match: "싸움이 시작되는 패턴을 현실적 조율 포인트로 전환한다",
    reconciliation_match: "다시 가까워지는 화해 순서와 키워드를 제시한다",
    reality_match: "돈과 생활, 일상 리듬에서 필요한 현실 조율을 정리한다",
    long_term_relation: "장기 관계 가능성을 단정이 아닌 조건과 습관으로 정리한다",
    current_year_flow: "올해의 세운과 월운 흐름을 관계 조언으로 풀어낸다",
    couple_overview: "두 사람의 관계 전체 인상을 확정 궁합 근거에 맞춰 정리한다",
    attraction_reason: "두 사람이 끌리는 이유를 각자의 명식과 관계 역학으로 설명한다",
    emotional_tempo_gap: "감정 속도 차이를 잘잘못이 아니라 조율 포인트로 풀어낸다",
    conflict_pattern: "갈등이 생기는 지점을 현실적 화해 전략으로 전환한다",
    long_term_potential: "장기 관계 가능성을 단정이 아닌 조건과 습관으로 정리한다",
    couple_luck_cycles: "두 사람의 운 흐름을 관계 타이밍 조언으로 풀어낸다",
    couple_master_plan: "두 사람에게 필요한 말과 행동을 관계 마스터플랜으로 정리한다",
  };
  return purposeById[chapterId] || `${prefix} ${title}의 핵심 판단을 상담문으로 정리한다`;
}

function buildLoveSecretChapterPlans({ mode, config, chapters, loveSecretFacts }) {
  const ids = loveSecretChapterIdsForMode(mode);
  return (Array.isArray(chapters) ? chapters : []).map((chapter, index) => {
    const chapterMeta = getLoveSecretChapterMeta(config, index + 1);
    const chapterId = ids[index] || `chapter_${index + 1}`;
    const title = stripUnsafeText(chapter?.title || chapterMeta?.title || `연애 비책 ${index + 1}장`);
    const sectionTitles = (Array.isArray(chapter?.sections) ? chapter.sections : []).map((section) => clean(section?.title)).filter(Boolean);
    return compactLoveSecretObject({
      chapterId,
      chapterTitle: title,
      mode: loveSecretPublicMode(mode),
      purpose: buildLoveSecretChapterPurpose(chapterId, title, mode),
      lockedFacts: buildLoveSecretLockedFacts(loveSecretFacts, chapterId, mode),
      interpretationPoints: Array.from(new Set([
        stripUnsafeText(chapter?.subtitle || chapterMeta?.subtitle),
        ...sectionTitles,
      ].filter(Boolean))).slice(0, 14),
      warnings: [
        "계산 결과를 바꾸지 않는다",
        "궁합 점수나 판정을 새로 만들지 않는다",
        "이별, 집착, 불륜, 결혼 실패를 단정하지 않는다",
        "상대방을 악마화하거나 낙인찍지 않는다",
      ],
      recommendedTone: "전문적이고 신비로운 프리미엄 연애 상담문",
      localDraft: clean(chapter?.text || (Array.isArray(chapter?.sections) ? chapter.sections.map((section) => `${section.title}\n${section.body}`).join("\n\n") : "")),
    });
  });
}

function summarizeLoveSecretChapterPlans(plans = []) {
  return Array.isArray(plans)
    ? plans.map(({ localDraft, ...plan }) => ({ ...plan, localDraftLength: clean(localDraft).length }))
    : undefined;
}

function hasLoveSecretElementCounts(counts = {}) {
  const safe = counts && typeof counts === "object" ? counts : {};
  return Object.keys(safe).some((key) => Number(safe[key] || 0) > 0);
}

function validateLoveSecretMasterJson(masterJson = {}) {
  const errors = [];
  const mode = normalizeMode(masterJson?.mode);
  const self = masterJson?.self || {};
  const partner = masterJson?.partner || {};
  const requireField = (condition, code) => {
    if (!condition) errors.push(code);
  };

  requireField(clean(masterJson?.schemaVersion) === "love-secret-master-json.v1", "schema_version_invalid");
  requireField(clean(masterJson?.calculationSource) === "worker-saju-engine", "calculation_source_invalid");
  requireField(clean(self?.user?.birthDate), "self_birth_date_missing");
  requireField(clean(self?.user?.birthTime), "self_birth_time_missing");
  ["year", "month", "day", "hour"].forEach((key) => {
    requireField(Boolean(loveSecretPillarRaw(self?.pillars?.[key])), `self_${key}_pillar_missing`);
  });
  requireField(clean(self?.core?.dayMaster), "self_day_master_missing");
  requireField(clean(self?.core?.dayBranch), "self_day_branch_missing");
  requireField(hasLoveSecretElementCounts(self?.elementBalance?.counts), "self_element_counts_missing");
  requireField(Array.isArray(self?.yongshin?.usefulElements) && self.yongshin.usefulElements.length > 0, "self_yongshin_missing");
  requireField(Boolean(self?.loveSecretReference?.dayMasterLabel), "self_love_reference_missing");
  requireField((masterJson?.consultationEvidence?.sajuEvidence || []).length >= 5, "consultation_evidence_too_thin");

  if (mode === "compatibility") {
    requireField(clean(partner?.user?.birthDate), "partner_birth_date_missing");
    requireField(clean(partner?.core?.dayMaster), "partner_day_master_missing");
    requireField(clean(partner?.core?.dayBranch), "partner_day_branch_missing");
    requireField(Boolean(loveSecretPillarRaw(partner?.pillars?.day)), "partner_day_pillar_missing");
    requireField(Boolean(masterJson?.compatibility?.spousePalaceRelation?.relationType), "compatibility_spouse_palace_missing");
  }

  return { ok: errors.length === 0, errors };
}

function buildSoloLoveLLMInput({ userProfile = {}, sajuEngineResult = {}, serviceContext = {}, targetYear = 2026 } = {}) {
  const profile = userProfile && typeof userProfile === "object" ? userProfile : {};
  const base = sajuEngineResult && typeof sajuEngineResult === "object" ? sajuEngineResult : {};
  const engine = safeLoveSecretClone(base.engineResult || base.rawEngineResult || {});
  const birthDate = clean(profile.birthDate || base?.user?.birthDate || serviceContext?.birthInput?.birthDate);
  const age = loveSecretAgeAtYear(birthDate, targetYear);
  const pillars = base?.pillars && typeof base.pillars === "object" ? base.pillars : engine?.pillars || {};
  const eightCharacters = ["year", "month", "day", "hour"].map((key) => loveSecretPillarRaw(pillars?.[key])).filter(Boolean).join(" ");
  const currentDaeun = base?.timing?.currentDaeun || engine?.currentDaeun || (Array.isArray(base?.timing?.daeun) ? base.timing.daeun[0] : undefined);
  const nextDaeun = base?.timing?.nextDaeun || engine?.nextDaeun || (Array.isArray(base?.timing?.daeun) ? base.timing.daeun[1] : undefined);

  return compactLoveSecretObject({
    mode: "solo",
    user: {
      displayName: clean(profile.name || base?.user?.name || serviceContext?.profile?.name || "의뢰인"),
      gender: clean(profile.gender || base?.user?.gender || serviceContext?.profile?.gender),
      birthDate,
      birthTime: clean(profile.birthTime || base?.user?.birthTime || serviceContext?.birthInput?.birthTime),
      calendarType: clean(profile.calendarType || base?.user?.calendarType || serviceContext?.birthInput?.calendarType),
      isLeapMonth: Boolean(profile.isLeapMonth || serviceContext?.birthInput?.isLeapMonth || serviceContext?.birthInput?.calendarType === "lunar_leap"),
      birthPlace: clean(profile.birthPlace || serviceContext?.birthInput?.birthPlace),
      timezone: clean(profile.timezone || serviceContext?.birthInput?.timezone || "Asia/Seoul"),
      location: compactLoveSecretObject({
        latitude: profile.latitude ?? serviceContext?.birthInput?.latitude,
        longitude: profile.longitude ?? serviceContext?.birthInput?.longitude,
      }),
      timeCorrection: compactLoveSecretObject({
        policy: clean(engine?.timeCorrection?.policy || "TRUE_SOLAR_TIME"),
        timezone: clean(profile.timezone || serviceContext?.birthInput?.timezone || "Asia/Seoul"),
      }),
      currentAge: age,
      isAdult: typeof age === "number" ? age >= 19 : undefined,
    },
    analysis: {
      targetYear,
    },
    sajuOriginalChart: {
      pillars: {
        year: pillars?.year,
        month: pillars?.month,
        day: pillars?.day,
        hour: pillars?.hour,
      },
      dayMaster: clean(base?.core?.dayMaster || engine?.dayMaster?.stemKo || engine?.dayMaster?.stem),
      dayBranch: clean(base?.core?.dayBranch || pillars?.day?.zhi || pillars?.day?.branch),
      monthBranch: clean(base?.core?.monthBranch || pillars?.month?.zhi || pillars?.month?.branch),
      eightCharacters,
      hiddenStems: engine?.hiddenStems || engine?.jijanggan || base?.hiddenStems,
      voidBranches: engine?.gongmang || engine?.voidBranches || base?.gongmang,
    },
    fiveElements: {
      counts: base?.elementBalance?.counts || engine?.fiveElements?.counts || engine?.fiveElements?.percentages,
      excessive: base?.elementBalance?.dominant || engine?.fiveElements?.excessive || engine?.dominantElement,
      deficient: base?.elementBalance?.deficient || engine?.fiveElements?.deficient || engine?.deficientElement,
      seasonalStrength: clean(engine?.seasonalStrength || engine?.season || base?.core?.season),
      balanceSummary: clean(engine?.fiveElements?.summary || base?.elementBalance?.summary),
      balanceScore: base?.elementBalance?.balanceScore,
    },
    johu: {
      coldHot: engine?.johu?.coldHot || engine?.johu?.temperature || base?.johu?.temperature,
      dryWet: engine?.johu?.dryWet || engine?.johu?.moisture || base?.johu?.moisture,
      temperatureScore: engine?.johu?.temperatureScore || base?.johu?.temperatureScore,
      moistureScore: engine?.johu?.moistureScore || base?.johu?.moistureScore,
      summary: clean(engine?.johu?.summary || base?.johu?.summary || base?.johu?.type),
      favorableEnvironment: engine?.johu?.favorableEnvironment || base?.johu?.favorableEnvironment,
      unfavorableEnvironment: engine?.johu?.unfavorableEnvironment || base?.johu?.unfavorableEnvironment,
    },
    tenGods: {
      distribution: base?.tenGods?.counts || engine?.tenGods?.counts,
      byStemBranch: engine?.tenGods?.byPillar || engine?.tenGods?.byStemBranch || base?.tenGods?.byStemBranch,
      spouseStar: clean(engine?.tenGods?.spouseStar || base?.tenGods?.spouseStar || resolveSpouseStarLabel(base?.user?.gender)),
      wealthStar: engine?.tenGods?.wealth || engine?.tenGods?.jaesung,
      officerStar: engine?.tenGods?.officer || engine?.tenGods?.gwanseong,
      outputStar: engine?.tenGods?.output || engine?.tenGods?.siksang,
      resourceStar: engine?.tenGods?.resource || engine?.tenGods?.inseong,
      peerStar: engine?.tenGods?.peer || engine?.tenGods?.bigeop,
      lovePatternSummary: clean(engine?.tenGods?.lovePatternSummary || base?.tenGods?.lovePatternSummary),
    },
    structure: {
      strength: base?.strength,
      deukryeong: engine?.structure?.deukryeong || engine?.deukryeong,
      deukji: engine?.structure?.deukji || engine?.deukji,
      deukse: engine?.structure?.deukse || engine?.deukse,
      geokguk: engine?.geokguk || engine?.structure?.geokguk || base?.geokguk,
      yongshin: base?.yongshin?.usefulElements || engine?.usefulGods?.yong,
      heeshin: engine?.usefulGods?.hee || base?.yongshin?.supportElements,
      gishin: base?.yongshin?.cautionElements || engine?.usefulGods?.gi,
      yongshinReason: clean(engine?.usefulGods?.summary || base?.strength?.reason),
    },
    relations: {
      stemCombinations: engine?.relations?.stemCombinations || engine?.cheonganHap,
      stemClashes: engine?.relations?.stemClashes || engine?.cheonganChung,
      branchCombinations: engine?.relations?.branchCombinations || engine?.jijiHap,
      trines: engine?.relations?.trines || engine?.samhap,
      sixCombinations: engine?.relations?.sixCombinations || engine?.yukhab,
      clashes: engine?.relations?.clashes || engine?.chung,
      punishments: engine?.relations?.punishments || engine?.hyeong,
      harms: engine?.relations?.harms || engine?.hae,
      breaks: engine?.relations?.breaks || engine?.pa,
      wonjin: engine?.relations?.wonjin || engine?.wonjin,
      gwimun: engine?.relations?.gwimun || engine?.gwimun,
    },
    specialStars: {
      peachBlossom: engine?.specialStars?.dohwa || base?.specialStars?.dohwa,
      hongyeom: engine?.specialStars?.hongyeom || base?.specialStars?.hongyeom,
      cheoneul: engine?.specialStars?.cheoneul || base?.specialStars?.cheoneul,
      moonchang: engine?.specialStars?.moonchang || base?.specialStars?.moonchang,
      yeokma: engine?.specialStars?.yeokma || base?.specialStars?.yeokma,
      hwagae: engine?.specialStars?.hwagae || base?.specialStars?.hwagae,
      all: engine?.specialStars || base?.specialStars,
    },
    twelveStages: engine?.twelveGrowthStages || engine?.twelveStages || base?.twelveStages,
    luckFlow: {
      currentDaeun,
      nextDaeun,
      annualLuck2026: engine?.annualLuck2026 || engine?.annualLuck?.["2026"] || base?.annualLuck2026,
      monthlyLuck2026: engine?.monthlyLuck2026 || base?.monthlyLuck2026,
    },
    serviceInput: {
      loveStatus: clean(serviceContext?.loveStatus || serviceContext?.relationshipStatus || serviceContext?.currentLoveStatus),
      currentConcern: clean(serviceContext?.currentConcern || serviceContext?.concern || serviceContext?.question),
      idealType: clean(serviceContext?.idealType || serviceContext?.preferredPartner),
      pastLovePattern: clean(serviceContext?.pastLovePattern || serviceContext?.relationshipPattern),
      wantsMarriageAnalysis: Boolean(serviceContext?.wantsMarriageAnalysis || serviceContext?.includeMarriageAnalysis),
      wantsReunionAnalysis: Boolean(serviceContext?.wantsReunionAnalysis || serviceContext?.includeReunionAnalysis),
      tone: clean(serviceContext?.tone || serviceContext?.writingStyle || "professional-mystical"),
      productTier: clean(serviceContext?.productTier || serviceContext?.tier || "premium"),
    },
  });
}

function normalizeCompatibilityPerson(profile = {}, sajuResult = {}, targetYear = 2026) {
  const normalized = buildSoloLoveLLMInput({
    userProfile: profile,
    sajuEngineResult: sajuResult,
    serviceContext: {},
    targetYear,
  });
  return {
    user: normalized.user,
    sajuOriginalChart: normalized.sajuOriginalChart,
    fiveElements: normalized.fiveElements,
    johu: normalized.johu,
    tenGods: normalized.tenGods,
    structure: normalized.structure,
    relations: normalized.relations,
    specialStars: normalized.specialStars,
    twelveStages: normalized.twelveStages,
    luckFlow: normalized.luckFlow,
    loveSecretReference: safeLoveSecretClone(sajuResult?.loveSecretReference),
  };
}

function branchRelationType(a, b) {
  const first = clean(a);
  const second = clean(b);
  if (!first || !second) return "";
  const pair = `${first}${second}`;
  const rev = `${second}${first}`;
  const has = (list) => list.includes(pair) || list.includes(rev);
  if (has(["자축", "인해", "묘술", "진유", "사신", "오미"])) return "육합";
  if (has(["자오", "축미", "인신", "묘유", "진술", "사해"])) return "충";
  if (has(["인사", "사신", "신인", "축술", "술미", "미축", "자묘", "묘자", "진진", "오오", "유유", "해해"])) return "형";
  if (has(["자미", "축오", "인사", "묘진", "신해", "유술"])) return "해";
  if (has(["자유", "축진", "인해", "묘오", "사신", "미술"])) return "파";
  return "중립";
}

function numericScore(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function johuScore(source = {}, key) {
  const johu = source?.johu && typeof source.johu === "object" ? source.johu : {};
  return numericScore(johu?.[key]);
}

function compareJohuScore(a, b, key) {
  const left = johuScore(a, key);
  const right = johuScore(b, key);
  if (typeof left !== "number" || typeof right !== "number") return undefined;
  return {
    personA: left,
    personB: right,
    gap: Math.abs(left - right),
    direction: left === right ? "balanced" : (left > right ? "personA_higher" : "personB_higher"),
  };
}

function sharedKeys(a = {}, b = {}) {
  const left = a && typeof a === "object" ? a : {};
  const right = b && typeof b === "object" ? b : {};
  return Object.keys(left).filter((key) => Boolean(right[key]));
}

function elementComplement(personA = {}, personB = {}) {
  const aCounts = personA?.fiveElements?.counts || {};
  const bCounts = personB?.fiveElements?.counts || {};
  return compactLoveSecretObject({
    personADominant: personA?.fiveElements?.excessive,
    personBdominant: personB?.fiveElements?.excessive,
    personADeficient: personA?.fiveElements?.deficient,
    personBDeficient: personB?.fiveElements?.deficient,
    personAFillsB: clean(personA?.fiveElements?.excessive) && clean(personB?.fiveElements?.deficient) && clean(personA.fiveElements.excessive) === clean(personB.fiveElements.deficient),
    personBFillsA: clean(personB?.fiveElements?.excessive) && clean(personA?.fiveElements?.deficient) && clean(personB.fiveElements.excessive) === clean(personA.fiveElements.deficient),
    sharedStrongElements: sharedKeys(aCounts, bCounts).filter((key) => Number(aCounts[key] || 0) > 0 && Number(bCounts[key] || 0) > 0),
  });
}

function buildJohuIntimacyData(personA, personB) {
  const temperature = compareJohuScore(personA, personB, "temperatureScore");
  const moisture = compareJohuScore(personA, personB, "moistureScore");
  const aAdult = personA?.user?.isAdult === true;
  const bAdult = personB?.user?.isAdult === true;
  const allowed = aAdult && bAdult;
  const tempGap = Number(temperature?.gap || 0);
  const moistureGap = Number(moisture?.gap || 0);

  return compactLoveSecretObject({
    allowed,
    replacementWhenNotAllowed: allowed ? undefined : "비성적 친밀감과 정서적 거리감 분석으로만 다룹니다.",
    safetyRules: [
      "노골적 성적 표현 금지",
      "신체 부위, 성행위, 성 기능 진단 금지",
      "조후 기반 친밀감 리듬과 정서적 안정감 중심",
    ],
    personA: {
      coldHot: personA?.johu?.coldHot,
      dryWet: personA?.johu?.dryWet,
      temperatureScore: johuScore(personA, "temperatureScore"),
      moistureScore: johuScore(personA, "moistureScore"),
      summary: personA?.johu?.summary,
    },
    personB: {
      coldHot: personB?.johu?.coldHot,
      dryWet: personB?.johu?.dryWet,
      temperatureScore: johuScore(personB, "temperatureScore"),
      moistureScore: johuScore(personB, "moistureScore"),
      summary: personB?.johu?.summary,
    },
    temperatureCompatibility: temperature,
    moistureCompatibility: moisture,
    overheatingRisk: typeof temperature?.gap === "number" ? tempGap >= 35 : undefined,
    overcoolingRisk: clean(personA?.johu?.coldHot).includes("차") && clean(personB?.johu?.coldHot).includes("차"),
    drynessRisk: clean(personA?.johu?.dryWet).includes("건") && clean(personB?.johu?.dryWet).includes("건"),
    overMoistureDependencyRisk: clean(personA?.johu?.dryWet).includes("습") && clean(personB?.johu?.dryWet).includes("습"),
    intimacySpeedDifference: typeof temperature?.gap === "number" || typeof moisture?.gap === "number"
      ? (tempGap + moistureGap >= 60 ? "속도 차이가 크게 체감될 수 있음" : "대화로 맞출 수 있는 속도 차이")
      : undefined,
    comfortableRhythm: allowed ? "온도와 습도 차이를 말의 속도, 만남 빈도, 휴식 리듬으로 조율합니다." : "비성적 친밀감, 정서적 안정감, 대화 거리 조절을 중심으로 봅니다.",
    practiceGuide: [
      "친밀감의 속도를 한 사람이 일방적으로 정하지 않습니다.",
      "과열되는 날에는 결론보다 휴식을 먼저 둡니다.",
      "건조하거나 차가운 흐름은 짧고 부드러운 확인 대화로 보완합니다.",
    ],
  });
}

function buildCompatibilityLoveLLMInput({
  personAProfile = {},
  personBProfile = {},
  personASajuResult = {},
  personBSajuResult = {},
  relationshipContext = {},
  targetYear = 2026,
} = {}) {
  const personA = normalizeCompatibilityPerson(personAProfile, personASajuResult, targetYear);
  const personB = normalizeCompatibilityPerson(personBProfile, personBSajuResult, targetYear);
  const aChart = personA.sajuOriginalChart || {};
  const bChart = personB.sajuOriginalChart || {};

  return compactLoveSecretObject({
    mode: "compatibility",
    analysis: { targetYear },
    personA,
    personB,
    comparison: {
      romanticNarrative: compactLoveSecretObject({
        appealFocus: personASajuResult?.loveSecretReference?.compatibility?.feminineAppealFocus,
        emotionalMood: personASajuResult?.loveSecretReference?.compatibility?.emotionalMood,
        tensionPoint: personASajuResult?.loveSecretReference?.compatibility?.tensionPoint,
        strategyLine: personASajuResult?.loveSecretReference?.compatibility?.strategyLine,
      }),
      dayMasterRelation: {
        personA: aChart.dayMaster,
        personB: bChart.dayMaster,
      },
      spousePalaceRelation: {
        personA: aChart.dayBranch,
        personB: bChart.dayBranch,
        relationType: branchRelationType(aChart.dayBranch, bChart.dayBranch),
      },
      monthBranchLifeRhythm: {
        personA: aChart.monthBranch,
        personB: bChart.monthBranch,
        relationType: branchRelationType(aChart.monthBranch, bChart.monthBranch),
      },
      fiveElementComplement: elementComplement(personA, personB),
      tenGodRelation: {
        personA: personA.tenGods,
        personB: personB.tenGods,
      },
      usefulGodComplement: {
        personA: personA.structure,
        personB: personB.structure,
      },
      relations: {
        dayBranch: branchRelationType(aChart.dayBranch, bChart.dayBranch),
        monthBranch: branchRelationType(aChart.monthBranch, bChart.monthBranch),
        personAOriginal: personA.relations,
        personBOriginal: personB.relations,
      },
      specialStarOverlap: {
        sharedKeys: sharedKeys(personA?.specialStars?.all, personB?.specialStars?.all),
        personA: personA.specialStars,
        personB: personB.specialStars,
      },
      luckTiming: {
        personA: personA.luckFlow,
        personB: personB.luckFlow,
        targetYear,
      },
      johuIntimacy: buildJohuIntimacyData(personA, personB),
    },
    relationshipContext: {
      relationshipType: clean(relationshipContext?.relationshipType || relationshipContext?.status),
      currentConcern: clean(relationshipContext?.currentConcern || relationshipContext?.concern || relationshipContext?.question),
      desiredOutcome: clean(relationshipContext?.desiredOutcome),
      tone: clean(relationshipContext?.tone || "professional-mystical"),
      productTier: clean(relationshipContext?.productTier || "premium"),
    },
    writingDirection: {
      readerMood: "여성 독자가 감정적으로 몰입할 수 있도록 섬세하고 우아한 연애 상담체로 작성합니다.",
      mustInclude: ["사주 근거", "상대가 나에게 끌리는 지점", "내가 사랑받는 방식", "관계를 지키는 현실적 행동"],
      avoid: ["불안 조장", "상대를 조종하는 표현", "결혼·이별·재회 단정", "노골적 성적 표현"],
    },
  });
}

function parseLoveGeminiJson(text, schemaName) {
  const raw = clean(text).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const candidates = [
    raw,
    raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1),
  ].filter((candidate) => clean(candidate).length > 1);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }
  throw new Error(`LOVE_SECRET_LLM_JSON_PARSE_FAILED:${schemaName}`);
}

async function generateLoveGeminiJson(env, { systemPrompt, userPrompt, requestId, schemaName }) {
  throw Object.assign(new Error("LOVE_SECRET_LLM_DISABLED"), {
    code: "LOVE_SECRET_LLM_DISABLED",
    status: 409,
    detail: {
      requestId: clean(requestId),
      schemaName: clean(schemaName),
      generationMode: LOVE_SECRET_PDF_CONFIG.generationMode,
      provider: LOVE_SECRET_PDF_CONFIG.provider,
    },
  });
}

function isLoveSecretLlmEnhancementEnabled(env = {}) {
  return Boolean(LOVE_SECRET_PDF_CONFIG.llmEnabled);
}

function softenLoveSecretSensitiveText(value) {
  let text = stripUnsafeText(value);
  for (const [pattern, replacement] of LOVE_SECRET_SENSITIVE_EXPRESSION_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text
    .replace(/100\s*%/g, "매우 높은 편")
    .replace(/무조건/g, "그만큼")
    .replace(/확정적으로/g, "상당히 뚜렷하게")
    .replace(/필연적으로/g, "그 흐름에서는")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripLoveSecretHallucinatedCalculations(value, plan = {}) {
  const locked = clean((plan?.lockedFacts || []).join(" "));
  const sentences = clean(value).split(/(?<=[.!?。]|다\.|요\.)\s+/).map((line) => line.trim()).filter(Boolean);
  const filtered = sentences.filter((sentence) => {
    if (/새로\s*계산|다시\s*계산|제가\s*계산|내가\s*계산|LLM|Gemini|JSON|API|스키마|프롬프트/i.test(sentence)) return false;
    if (/궁합\s*점수|궁합\s*등급|점\s*입니다|점으로\s*보입니다/.test(sentence) && !/궁합\s*점수|궁합\s*판정|점/.test(locked)) return false;
    return true;
  });
  return filtered.join(" ").trim() || clean(value);
}

function extractLoveSecretFactKeywords(lockedFacts = []) {
  const skip = new Set(["본인", "상대", "일간", "강약", "우세", "보완", "오행", "배우자성", "연애", "신살", "관계", "생활", "리듬"]);
  const keywords = [];
  for (const fact of Array.isArray(lockedFacts) ? lockedFacts : []) {
    const text = clean(fact);
    const valueSide = clean(text.split(":").slice(1).join(":")) || text;
    const tokens = valueSide.match(/[가-힣A-Za-z甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥0-9]{2,}/g) || [];
    for (const token of tokens) {
      if (!skip.has(token) && !keywords.includes(token)) keywords.push(token);
      if (keywords.length >= 10) return keywords;
    }
  }
  return keywords;
}

function validateLoveSecretEnhancedText(rawText, plan = {}) {
  const safeText = softenLoveSecretSensitiveText(stripLoveSecretHallucinatedCalculations(rawText, plan));
  if (safeText.length < 700) {
    return { ok: false, reason: "enhanced_text_too_short", text: "", partialText: safeText.length >= 180 ? safeText : "" };
  }
  const keywords = extractLoveSecretFactKeywords(plan?.lockedFacts);
  const hitCount = keywords.filter((keyword) => safeText.includes(keyword)).length;
  if (keywords.length >= 3 && hitCount < 2) {
    return { ok: false, reason: "locked_facts_underused", text: "", partialText: safeText };
  }
  if (/(무조건|반드시\s*결혼|100\s*%|필연적으로|반드시\s*재회|절대\s*헤어지지|반드시\s*만난다)/i.test(safeText) || LOVE_SECRET_EXPLICIT_INTIMACY_RE.test(safeText)) {
    return { ok: false, reason: "risky_expression_remaining", text: "", partialText: softenLoveSecretSensitiveText(safeText) };
  }
  return { ok: true, reason: "", text: safeText, partialText: "" };
}

function buildLoveSecretEnhancementCacheKey({ loveSecretFacts, plan }) {
  return [
    LOVE_SECRET_PRODUCT_ID,
    clean(plan?.mode),
    loveSecretHashValue(loveSecretFacts?.birthInfo || {}),
    clean(plan?.mode) === "couple" ? loveSecretHashValue(loveSecretFacts?.partnerBirthInfo || {}) : "solo",
    LOVE_SECRET_ENGINE_VERSION,
    LOVE_SECRET_PROMPT_VERSION,
    clean(plan?.chapterId),
  ].join(":");
}

function getLoveSecretEnhancementCache(key) {
  if (!key || !LOVE_SECRET_LLM_ENHANCEMENT_CACHE.has(key)) return null;
  const cached = LOVE_SECRET_LLM_ENHANCEMENT_CACHE.get(key);
  LOVE_SECRET_LLM_ENHANCEMENT_CACHE.delete(key);
  LOVE_SECRET_LLM_ENHANCEMENT_CACHE.set(key, cached);
  return cached;
}

function setLoveSecretEnhancementCache(key, value) {
  if (!key || !value) return;
  LOVE_SECRET_LLM_ENHANCEMENT_CACHE.set(key, {
    enhancedText: clean(value.enhancedText),
    promptVersion: LOVE_SECRET_PROMPT_VERSION,
    cachedAt: new Date().toISOString(),
  });
  while (LOVE_SECRET_LLM_ENHANCEMENT_CACHE.size > LOVE_SECRET_LLM_ENHANCEMENT_CACHE_MAX) {
    const firstKey = LOVE_SECRET_LLM_ENHANCEMENT_CACHE.keys().next().value;
    LOVE_SECRET_LLM_ENHANCEMENT_CACHE.delete(firstKey);
  }
}

function buildLoveSecretEnhancementPrompt(plan = {}) {
  const systemPrompt = [
    "너는 사주 계산자가 아니다.",
    "너는 궁합 점수를 새로 만드는 사람이 아니다.",
    "아래 제공되는 연애 비책 계산 결과는 이미 확정된 값이다.",
    "일간, 일간 강약, 오행 분포, 십성, 배우자성, 연애 신살, 대운, 세운, 궁합 판정을 절대 변경하지 마라.",
    "새로운 사주 계산이나 궁합 계산을 하지 마라.",
    "제공되지 않은 정보를 단정하지 마라.",
    "lockedFacts는 반드시 반영해라.",
    "로컬 계산 결과와 모순되는 문장을 쓰지 마라.",
    "독자의 불안감을 과도하게 자극하지 마라.",
    "절대 결혼하면 안 된다, 반드시 헤어진다, 평생 외롭다, 상대가 바람을 피운다 같은 단정적이고 공포를 조장하는 표현을 피하라.",
    "이별, 집착, 불륜, 결혼 실패 같은 민감한 주제는 부드럽고 현실적인 조언으로 표현하라.",
    "연애 상담문처럼 자연스럽고 깊이 있게 작성하라.",
    "반복 문장을 줄이고, 챕터마다 다른 관점으로 설명하라.",
    "한국어로 작성하라.",
    "최종 PDF 독자가 돈을 내고 읽는 프리미엄 연애 리포트처럼 느껴지게 작성하라.",
  ].join("\n");
  const userPrompt = [
    "아래는 이미 계산 완료된 연애 비책 챕터 데이터다.",
    "너는 이 내용을 바탕으로 연애 상담문을 작성한다.",
    "계산 결과를 바꾸거나 새로 해석하지 말고, 주어진 사실과 해석 포인트를 자연스럽고 깊이 있는 문장으로 확장하라.",
    "",
    "[리포트 모드]",
    `mode: ${clean(plan?.mode)}`,
    "",
    "[챕터 정보]",
    `chapterTitle: ${clean(plan?.chapterTitle)}`,
    `purpose: ${clean(plan?.purpose)}`,
    `recommendedTone: ${clean(plan?.recommendedTone)}`,
    "",
    "[반드시 반영할 확정 사실]",
    JSON.stringify(plan?.lockedFacts || [], null, 2),
    "",
    "[해석 포인트]",
    JSON.stringify(plan?.interpretationPoints || [], null, 2),
    "",
    "[주의할 표현]",
    JSON.stringify(plan?.warnings || [], null, 2),
    "",
    "[로컬 초안]",
    clean(plan?.localDraft).slice(0, 9000),
    "",
    "[출력 조건]",
    "- 한국어",
    "- 프리미엄 연애 상담문 스타일",
    "- 독자에게 직접 말하는 문체",
    "- 불필요한 반복 금지",
    "- 계산 결과 변경 금지",
    "- lockedFacts 누락 금지",
    "- 과장, 공포 마케팅 금지",
    "- 상대방을 악마화하거나 단정하지 말 것",
    "- 1개 챕터 본문으로 바로 PDF에 넣을 수 있게 작성",
  ].join("\n");
  return { systemPrompt, userPrompt };
}

async function generateLoveSecretEnhancedText(env, { plan, loveSecretFacts, requestId }) {
  const cacheKey = buildLoveSecretEnhancementCacheKey({ loveSecretFacts, plan });
  return {
    ok: false,
    enhancedText: "",
    cacheKey,
    cacheHit: false,
    fallbackReason: "LOVE_SECRET_EXTERNAL_LLM_DISABLED",
  };
}

function mergeLoveSecretEnhancedPartial(localDraft, partialText) {
  const partial = softenLoveSecretSensitiveText(partialText);
  const local = softenLoveSecretSensitiveText(localDraft);
  if (!partial) return local;
  if (!local) return partial;
  return `${partial}\n\n${local}`.trim();
}

function applyLoveSecretEnhancedTextToChapter(chapter = {}, enhancedText = "", source = LOVE_SECRET_MANUSCRIPT_SOURCE.HYBRID) {
  const sections = (Array.isArray(chapter?.sections) ? chapter.sections : []).map((section) => ({ ...section }));
  if (!sections.length) {
    sections.push({ title: "프리미엄 상담문", body: "" });
  }
  sections[0].body = softenLoveSecretSensitiveText(enhancedText || sections[0].body || "");
  const text = sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n");
  return {
    ...chapter,
    sections,
    text,
    source,
    llmEnhanced: source === LOVE_SECRET_MANUSCRIPT_SOURCE.HYBRID,
    promptVersion: source === LOVE_SECRET_MANUSCRIPT_SOURCE.HYBRID ? LOVE_SECRET_PROMPT_VERSION : undefined,
  };
}

function markLoveSecretLocalChapter(chapter = {}) {
  return {
    ...chapter,
    sections: (Array.isArray(chapter?.sections) ? chapter.sections : []).map((section) => ({ ...section })),
    source: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
    llmEnhanced: false,
    promptVersion: undefined,
  };
}

async function enhanceLoveSecretLocalChapters(env, { chapters, mode, plans, loveSecretFacts, requestId = "" } = {}) {
  const enabled = isLoveSecretLlmEnhancementEnabled(env);
  const enhancedChapters = [];
  const enhancedChapterIds = [];
  const fallbackChapterIds = [];
  const cacheHits = [];
  let attempted = 0;

  for (let index = 0; index < (Array.isArray(chapters) ? chapters.length : 0); index += 1) {
    const chapter = chapters[index];
    const plan = plans?.[index] || {};
    const chapterId = clean(plan?.chapterId);
    if (!enabled || !isLoveSecretEnhancedChapter(mode, chapterId)) {
      enhancedChapters.push(markLoveSecretLocalChapter(chapter));
      continue;
    }
    attempted += 1;
    try {
      const result = await generateLoveSecretEnhancedText(env, {
        plan,
        loveSecretFacts,
        requestId: `${requestId || "love-secret-hybrid"}:${chapterId}`,
      });
      if (result.ok && result.enhancedText) {
        enhancedChapters.push(applyLoveSecretEnhancedTextToChapter(chapter, result.enhancedText, LOVE_SECRET_MANUSCRIPT_SOURCE.HYBRID));
        enhancedChapterIds.push(chapterId);
        if (result.cacheHit) cacheHits.push(chapterId);
        continue;
      }
      if (result.enhancedText) {
        const firstLocalBody = clean(chapter?.sections?.[0]?.body || plan?.localDraft || chapter?.text);
        enhancedChapters.push(applyLoveSecretEnhancedTextToChapter(chapter, mergeLoveSecretEnhancedPartial(firstLocalBody, result.enhancedText), LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL));
      } else {
        enhancedChapters.push(markLoveSecretLocalChapter(chapter));
      }
      fallbackChapterIds.push(`${chapterId}:${clean(result.fallbackReason || "fallback")}`);
    } catch (error) {
      enhancedChapters.push(markLoveSecretLocalChapter(chapter));
      fallbackChapterIds.push(`${chapterId}:${clean(error?.code || error?.message || "exception")}`);
    }
  }

  return {
    chapters: enhancedChapters,
    enabled,
    attempted,
    enhancedChapterIds,
    fallbackChapterIds,
    cacheHits,
    promptVersion: LOVE_SECRET_PROMPT_VERSION,
    engineVersion: LOVE_SECRET_ENGINE_VERSION,
  };
}

function normalizeLoveGeneratedChapter(parsed = {}, chapterSpec = {}) {
  const sourceSections = Array.isArray(parsed?.sections) ? parsed.sections : [];
  const fixedSectionTitles = Array.isArray(chapterSpec?.categories) ? chapterSpec.categories : [];
  const sectionTitles = fixedSectionTitles.length
    ? fixedSectionTitles
    : sourceSections.map((section, index) => clean(section?.heading || section?.title || `연애 항목 ${index + 1}`));
  const sections = sectionTitles.map((title, index) => {
    const source = sourceSections[index] || {};
    return {
      heading: clean(title),
      title: clean(title),
      body: stripUnsafeText(source.body || source.text || ""),
      sajuEvidence: loveSecretCleanList(source.sajuEvidence, 8),
      keyPoints: loveSecretCleanList(source.keyPoints, 8),
      actionGuide: loveSecretCleanList(source.actionGuide, 8),
      caution: loveSecretCleanList(source.caution, 8),
    };
  });
  return {
    mode: normalizeMode(parsed?.mode || chapterSpec?.mode || "solo"),
    chapterNumber: clean(chapterSpec?.number || parsed?.chapterNumber),
    chapterTitle: clean(chapterSpec?.title || parsed?.chapterTitle),
    title: clean(chapterSpec?.title || parsed?.chapterTitle),
    subtitle: clean(chapterSpec?.subtitle || parsed?.chapterSubtitle || ""),
    chapterSummary: stripUnsafeText(parsed?.chapterSummary || parsed?.summary || ""),
    sections,
    text: sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n"),
    masterAdvice: stripUnsafeText(parsed?.masterAdvice || ""),
    source: LOVE_SECRET_MANUSCRIPT_SOURCE.LLM,
  };
}
function normalizeCompatibilityLoveGeneratedChapter(parsed, chapterSpec) {
  const base = normalizeLoveGeneratedChapter(parsed, chapterSpec);
  const rawSections = Array.isArray(parsed?.sections) ? parsed.sections : [];
  return {
    ...base,
    mode: "compatibility",
    sections: base.sections.map((section, index) => ({
      ...section,
      personAView: clean(rawSections[index]?.personAView),
      personBView: clean(rawSections[index]?.personBView),
      relationshipDynamic: clean(rawSections[index]?.relationshipDynamic),
      compatibilityStrategy: clean(rawSections[index]?.compatibilityStrategy),
    })),
  };
}

function loveSecretCategoryCovered(category, text) {
  const haystack = clean(text).replace(/\s+/g, "");
  const compactCategory = clean(category).replace(/\s+/g, "");
  if (compactCategory && haystack.includes(compactCategory)) return true;
  const tokens = clean(category).split(/[\s,·]+/).map((token) => token.replace(/[^\w가-힣]/g, "")).filter((token) => token.length >= 2);
  return tokens.some((token) => haystack.includes(token));
}

function validateLoveChapter({ chapter, chapterSpec, mode }) {
  const errors = [];
  const warnings = [];
  const normalizedMode = normalizeMode(mode);
  const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
  const allText = `${clean(chapter?.chapterSummary)}\n${sections.map((section) => `${clean(section?.heading)}\n${clean(section?.body)}\n${clean(section?.personAView)}\n${clean(section?.personBView)}\n${clean(section?.relationshipDynamic)}\n${clean(section?.compatibilityStrategy)}\n${loveSecretCleanList(section?.sajuEvidence).join(" ")}\n${loveSecretCleanList(section?.keyPoints).join(" ")}\n${loveSecretCleanList(section?.actionGuide).join(" ")}\n${loveSecretCleanList(section?.caution).join(" ")}`).join("\n")}\n${clean(chapter?.masterAdvice)}`;

  if (normalizeMode(chapter?.mode) !== normalizedMode) errors.push("mode_mismatch");
  if (clean(chapter?.chapterNumber) !== clean(chapterSpec?.number)) errors.push("chapter_number_mismatch");
  if (clean(chapter?.chapterTitle) !== clean(chapterSpec?.title)) errors.push("chapter_title_mismatch");
  if (clean(chapter?.chapterSummary).length < 30) errors.push("chapter_summary_missing");
  if (!sections.length) errors.push("sections_missing");
  if (sections.length < Math.min(5, Number(chapterSpec?.categories?.length || 0) || 5)) errors.push("sections_too_few");

  sections.forEach((section, index) => {
    if (!clean(section?.heading)) errors.push(`section_${index + 1}_heading_missing`);
    if (clean(section?.body).length < 120) errors.push(`section_${index + 1}_body_too_short`);
    if (!loveSecretCleanList(section?.sajuEvidence).length) errors.push(`section_${index + 1}_saju_evidence_missing`);
    if (!loveSecretCleanList(section?.keyPoints).length) errors.push(`section_${index + 1}_key_points_missing`);
    if (!loveSecretCleanList(section?.actionGuide).length) errors.push(`section_${index + 1}_action_guide_missing`);
    if (!loveSecretCleanList(section?.caution).length) errors.push(`section_${index + 1}_caution_missing`);
  });

  if (clean(chapter?.masterAdvice).length < 40) errors.push("master_advice_missing");
  const categories = Array.isArray(chapterSpec?.categories) ? chapterSpec.categories : [];
  const covered = categories.filter((category) => loveSecretCategoryCovered(category, allText));
  if (categories.length && covered.length < Math.min(5, categories.length)) errors.push("category_coverage_low");
  if (categories.length && covered.length < categories.length) warnings.push(`category_coverage_partial:${covered.length}/${categories.length}`);
  if (LOVE_SECRET_ASSERTIVE_RE.test(allText)) warnings.push("risky_assertive_expression");
  if (new RegExp(LOVE_SECRET_LLM_DEVELOPER_RE.source, "i").test(allText)) errors.push("developer_terms_exposed");
  if (["VIII", "XI"].includes(clean(chapterSpec?.number)) && LOVE_SECRET_EXPLICIT_INTIMACY_RE.test(allText)) errors.push("explicit_intimacy_expression");

  return { ok: errors.length === 0, errors, warnings };
}

function validateCompatibilityLoveChapter({ chapter, chapterSpec }) {
  const validation = validateLoveChapter({ chapter, chapterSpec, mode: "compatibility" });
  const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
  const hasAView = sections.some((section) => clean(section?.personAView).length >= 20);
  const hasBView = sections.some((section) => clean(section?.personBView).length >= 20);
  const hasDynamic = sections.some((section) => clean(section?.relationshipDynamic).length >= 20);
  const hasStrategy = sections.some((section) => clean(section?.compatibilityStrategy).length >= 20);
  if (!hasAView) validation.errors.push("person_a_view_missing");
  if (!hasBView) validation.errors.push("person_b_view_missing");
  if (!hasDynamic) validation.errors.push("relationship_dynamic_missing");
  if (!hasStrategy) validation.errors.push("compatibility_strategy_missing");
  if (sections.length && !sections.every((section) => loveSecretCleanList(section?.sajuEvidence).length > 0)) {
    validation.errors.push("compatibility_saju_evidence_missing");
  }
  validation.ok = validation.errors.length === 0;
  return validation;
}

function buildSoloLoveChapterPrompt({ input, chapterSpec, previousSummaries = [], validationFeedback = "" }) {
  const chapterQualityGuide = getSoloLoveChapterQualityGuide(chapterSpec);
  const systemPrompt = [
    "당신은 사주 원국을 바탕으로 연애 비책 PDF의 개인화 본문만 쓰는 전문 상담가입니다.",
    "챕터 제목, 섹션 제목, 표지, 목차, 공통 안내문은 코드 템플릿으로 이미 준비되어 있으므로 생성하지 마세요.",
    "제공된 사주 계산값과 연애 상담 근거만 사용하고, 없는 값은 만들지 마세요.",
    "확정적 예언, 불안 조장, 노골적 성적 표현, 의료적 진단처럼 들리는 표현은 금지합니다.",
    "본문에는 JSON, prompt, schema, API, Gemini, LLM, 엔진 같은 개발 용어를 절대 쓰지 마세요.",
    "출력은 순수 JSON 객체 하나만 허용합니다. 코드블록과 설명문은 쓰지 마세요.",
  ].join("\n");
  const userPrompt = JSON.stringify({
    task: "연애 비책 PDF 솔로 모드 개인화 본문 생성",
    requiredOutputShape: {
      mode: "solo",
      chapterNumber: chapterSpec.number,
      chapterSummary: "string",
      sections: [
        {
          body: "string",
          sajuEvidence: ["string"],
          keyPoints: ["string"],
          actionGuide: ["string"],
          caution: ["string"],
        },
      ],
      masterAdvice: "string",
    },
    staticTemplatePolicy: {
      chapterTitleIsFixed: chapterSpec.title,
      sectionTitlesAreFixedInThisOrder: chapterSpec.categories,
      doNotGenerate: ["표지", "목차", "챕터 제목", "섹션 제목", "공통 안내문", "다운로드 안내"],
    },
    sectionRules: {
      categories: chapterSpec.categories,
      oneSectionPerCategory: true,
      minimumBodyLengthPerSection: 650,
      eachSectionMustInclude: ["사주 근거", "연애 패턴 해석", "현실 적용", "주의점", "실천 조언"],
      tone: "전문적이고 신비로운 연애 상담체",
    },
    chapterQualityGuide,
    previousSummaries,
    validationFeedback: clean(validationFeedback),
    input,
  });
  return { systemPrompt, userPrompt };
}
async function generateSoloLoveChapter({ env, input, chapterSpec, previousSummaries = [], requestId, validationFeedback = "" }) {
  const { systemPrompt, userPrompt } = buildSoloLoveChapterPrompt({ input, chapterSpec, previousSummaries, validationFeedback });
  const parsed = await generateLoveGeminiJson(env, {
    systemPrompt,
    userPrompt,
    requestId,
    schemaName: `SoloLoveChapter${chapterSpec.number}`,
  });
  return normalizeLoveGeneratedChapter(parsed, chapterSpec);
}

function buildCompatibilityLoveChapterPrompt({ input, chapterSpec, previousSummaries = [], validationFeedback = "" }) {
  const isJohuIntimacyChapter = clean(chapterSpec?.number) === "VIII";
  const systemPrompt = [
    "당신은 두 사람의 사주 궁합을 바탕으로 연애 비책 PDF의 개인화 본문만 쓰는 전문 상담가입니다.",
    "챕터 제목, 섹션 제목, 표지, 목차, 공통 안내문은 코드 템플릿으로 이미 준비되어 있으므로 생성하지 마세요.",
    "제공된 두 사람의 계산값과 궁합 근거만 사용하고, 없는 값은 만들지 마세요.",
    "궁합을 성공/실패로 단정하지 말고 관계 역학, 조율 전략, 주의점으로 표현하세요.",
    "노골적 성적 표현, 불안 조장, 의료적 진단처럼 들리는 표현은 금지합니다.",
    "본문에는 JSON, prompt, schema, API, Gemini, LLM, 엔진 같은 개발 용어를 절대 쓰지 마세요.",
    "출력은 순수 JSON 객체 하나만 허용합니다. 코드블록과 설명문은 쓰지 마세요.",
  ].join("\n");
  const userPrompt = JSON.stringify({
    task: "연애 비책 PDF 궁합 모드 개인화 본문 생성",
    requiredOutputShape: {
      mode: "compatibility",
      chapterNumber: chapterSpec.number,
      chapterSummary: "string",
      sections: [
        {
          body: "string",
          personAView: "string",
          personBView: "string",
          relationshipDynamic: "string",
          compatibilityStrategy: "string",
          sajuEvidence: ["string"],
          keyPoints: ["string"],
          actionGuide: ["string"],
          caution: ["string"],
        },
      ],
      masterAdvice: "string",
    },
    staticTemplatePolicy: {
      chapterTitleIsFixed: chapterSpec.title,
      sectionTitlesAreFixedInThisOrder: chapterSpec.categories,
      doNotGenerate: ["표지", "목차", "챕터 제목", "섹션 제목", "공통 안내문", "다운로드 안내"],
    },
    sectionRules: {
      categories: chapterSpec.categories,
      oneSectionPerCategory: true,
      minimumBodyLengthPerSection: 700,
      eachSectionMustInclude: ["두 사람의 사주 근거", "관계 역학", "현실 조율", "주의점", "실천 전략"],
      tone: "전문적이고 신비로운 궁합 상담체",
      chapterScope: isJohuIntimacyChapter
        ? "친밀감은 조후와 정서 온도 중심으로만 표현하고 노골적 성적 묘사는 피합니다."
        : "관계의 선택과 조율 전략 중심으로 작성합니다.",
    },
    previousSummaries,
    validationFeedback: clean(validationFeedback),
    input,
  });
  return { systemPrompt, userPrompt };
}
async function generateCompatibilityLoveChapter({ env, input, chapterSpec, previousSummaries = [], requestId, validationFeedback = "" }) {
  const { systemPrompt, userPrompt } = buildCompatibilityLoveChapterPrompt({ input, chapterSpec, previousSummaries, validationFeedback });
  const parsed = await generateLoveGeminiJson(env, {
    systemPrompt,
    userPrompt,
    requestId,
    schemaName: `CompatibilityLoveChapter${chapterSpec.number}`,
  });
  return normalizeCompatibilityLoveGeneratedChapter(parsed, chapterSpec);
}

async function generateLoveChapter({ env, mode, input, chapterSpec, previousSummaries = [], requestId, validationFeedback = "" }) {
  if (normalizeMode(mode) === "compatibility") {
    return generateCompatibilityLoveChapter({ env, input, chapterSpec, previousSummaries, requestId, validationFeedback });
  }
  return generateSoloLoveChapter({ env, input, chapterSpec, previousSummaries, requestId, validationFeedback });
}

async function generateCompatibilityLoveChapters({ env, input, requestId, onProgress = null }) {
  const previousSummaries = [];
  const chapters = [];
  for (let index = 0; index < COMPATIBILITY_LOVE_CHAPTER_SPECS.length; index += 1) {
    const chapterSpec = COMPATIBILITY_LOVE_CHAPTER_SPECS[index];
    let lastValidation = null;
    let accepted = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const chapter = await generateCompatibilityLoveChapter({
          env,
          input,
          chapterSpec,
          previousSummaries,
          requestId: `${requestId || "love-secret-compatibility"}:${chapterSpec.number}:a${attempt}`,
          validationFeedback: lastValidation ? `previous validation errors: ${lastValidation.errors.join(", ")} / warnings: ${lastValidation.warnings.join(", ")}` : "",
        });
        const validation = validateCompatibilityLoveChapter({ chapter, chapterSpec });
        if (validation.ok) {
          accepted = chapter;
          break;
        }
        lastValidation = validation;
      } catch (error) {
        lastValidation = {
          ok: false,
          errors: [clean(error?.code || error?.message || "compatibility_chapter_generation_failed")],
          warnings: [],
        };
      }
    }
    if (!accepted) {
      throw new Error(`LOVE_SECRET_COMPATIBILITY_CHAPTER_INVALID:${chapterSpec.number}:${(lastValidation?.errors || []).join(",")}`);
    }
    chapters.push(convertLoveGeneratedChapterToPdfChapter(accepted, chapterSpec, index));
    previousSummaries.push(`${chapterSpec.number}. ${accepted.chapterTitle}: ${accepted.chapterSummary}`);
    if (typeof onProgress === "function") {
      await onProgress({ completed: chapters.length, chapterNo: index + 1, totalChapters: COMPATIBILITY_LOVE_CHAPTER_SPECS.length });
    }
  }
  return chapters;
}

function convertLoveGeneratedChapterToPdfChapter(chapter, chapterSpec, chapterIndex) {
  const sections = (Array.isArray(chapter?.sections) ? chapter.sections : []).map((section) => ({
    title: stripUnsafeText(section?.heading || "연애 항목"),
    body: stripUnsafeText(section?.body || ""),
    personAView: stripUnsafeText(section?.personAView || ""),
    personBView: stripUnsafeText(section?.personBView || ""),
    relationshipDynamic: stripUnsafeText(section?.relationshipDynamic || ""),
    compatibilityStrategy: stripUnsafeText(section?.compatibilityStrategy || ""),
    sajuEvidence: loveSecretCleanList(section?.sajuEvidence, 8),
    keyPoints: loveSecretCleanList(section?.keyPoints, 8),
    actionGuide: loveSecretCleanList(section?.actionGuide, 8),
    caution: loveSecretCleanList(section?.caution, 8),
  }));
  const masterAdvice = stripUnsafeText(chapter?.masterAdvice || "");
  if (masterAdvice) {
    sections.push({
      title: "마스터 조언",
      body: masterAdvice,
      personAView: "",
      personBView: "",
      relationshipDynamic: "",
      compatibilityStrategy: "",
      sajuEvidence: [],
      keyPoints: [],
      actionGuide: [],
      caution: [],
    });
  }
  return {
    chapter: chapterIndex + 1,
    chapterNumber: clean(chapterSpec?.number),
    title: stripUnsafeText(chapterSpec?.title || chapter?.chapterTitle || `연애 비책 ${chapterIndex + 1}장`),
    subtitle: stripUnsafeText(chapter?.chapterSummary || ""),
    sections,
    text: sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n"),
    source: LOVE_SECRET_MANUSCRIPT_SOURCE.LLM,
  };
}

async function generateSoloLoveChapters({ env, input, requestId, onProgress = null }) {
  const previousSummaries = [];
  const chapters = [];
  for (let index = 0; index < SOLO_LOVE_CHAPTER_SPECS.length; index += 1) {
    const chapterSpec = SOLO_LOVE_CHAPTER_SPECS[index];
    let lastValidation = null;
    let accepted = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const chapter = await generateSoloLoveChapter({
          env,
          input,
          chapterSpec,
          previousSummaries,
          requestId: `${requestId || "love-secret"}:${chapterSpec.number}:a${attempt}`,
          validationFeedback: lastValidation ? `이전 결과 오류: ${lastValidation.errors.join(", ")} / 경고: ${lastValidation.warnings.join(", ")}` : "",
        });
        const validation = validateLoveChapter({ chapter, chapterSpec, mode: "solo" });
        if (validation.ok) {
          accepted = chapter;
          break;
        }
        lastValidation = validation;
      } catch (error) {
        lastValidation = {
          ok: false,
          errors: [clean(error?.code || error?.message || "chapter_generation_failed")],
          warnings: [],
        };
      }
    }
    if (!accepted) {
      throw new Error(`LOVE_SECRET_CHAPTER_INVALID:${chapterSpec.number}:${(lastValidation?.errors || []).join(",")}`);
    }
    chapters.push(convertLoveGeneratedChapterToPdfChapter(accepted, chapterSpec, index));
    previousSummaries.push(`${chapterSpec.number}. ${accepted.chapterTitle}: ${accepted.chapterSummary}`);
    if (typeof onProgress === "function") {
      await onProgress({ completed: chapters.length, chapterNo: index + 1, totalChapters: SOLO_LOVE_CHAPTER_SPECS.length });
    }
  }
  return chapters;
}

function safeModeChapterConfig(mode) {
  const key = toConfigMode(mode);
  const config = LOVE_SECRET_CANONICAL_MODE_CONFIG[key] || LOVE_SECRET_MODE_CONFIG[key] || LOVE_SECRET_CANONICAL_MODE_CONFIG.solo;
  if (key === "couple") {
    return {
      ...config,
      title: "사주 궁합 비책",
      totalChapters: 10,
      minTotalChars: 36000,
      chapterMinDefault: 3000,
      chapterMinByIndex: loveSecretChapterMins(10, 3000),
      chapters: LOVE_SECRET_PHASE7_COMPAT_CHAPTERS,
    };
  }
  if (key !== "solo") return config;
  return {
    ...config,
    title: "사주 연애 비책",
    totalChapters: 10,
    chapters: LOVE_SECRET_PHASE6_SOLO_CHAPTERS,
  };
}

function getChapterSpecificSections(body, chapterNo, mode) {
  const input = Array.isArray(body?.chapterSpecificSections) ? body.chapterSpecificSections : [];
  const cleanedInput = input.map((v) => stripUnsafeText(v)).filter(Boolean);
  if (cleanedInput.length) return cleanedInput.slice(0, ["solo", "compatibility"].includes(normalizeMode(mode)) ? 7 : 5);
  const canonicalMode = normalizeMode(mode);
  if (canonicalMode === "solo") {
    const sections = LOVE_SECRET_PHASE6_SOLO_SECTIONS[chapterNo] || LOVE_SECRET_PHASE6_SOLO_SECTIONS[1];
    return Array.from(sections);
  }
  if (canonicalMode === "compatibility") {
    const sections = LOVE_SECRET_PHASE7_COMPAT_SECTIONS[chapterNo] || LOVE_SECRET_PHASE7_COMPAT_SECTIONS[1];
    return Array.from(sections);
  }
  const canonical = LOVE_SECRET_CANONICAL_SECTIONS[canonicalMode] || LOVE_SECRET_CANONICAL_SECTIONS.solo;
  const canonicalSections = canonical[chapterNo] || canonical[1];
  if (Array.isArray(canonicalSections) && canonicalSections.length) return canonicalSections.slice(0, 5);
  const defaults = DEFAULT_CATEGORY_BY_MODE[mode] || DEFAULT_CATEGORY_BY_MODE.solo;
  return (defaults[chapterNo] || defaults[1] || ["핵심 성향", "관계 패턴", "주의점", "실전 전략", "행동 가이드"]).slice(0, 5);
}

function resolveSpouseStarLabel(gender) {
  const g = normalizeLoveSecretGender(gender);
  if (g === "M") return "재성(정재·편재)";
  if (g === "F") return "관성(정관·편관)";
  return "배우자성";
}

function buildDaeunHint(base) {
  const cycles = Array.isArray(base?.timing?.daeun) ? base.timing.daeun : [];
  const picks = cycles.slice(0, 2).map((row) => clean(row?.ganji || row?.label || row?.name));
  const lines = picks.filter(Boolean);
  if (!lines.length) return "";
  return `대운 흐름은 ${lines.join(", ")} 구간이 먼저 작동하며, 관계의 진전은 속도보다 방향을 맞출 때 안정됩니다.`;
}

function loveSecretSeedNumber(seed) {
  const text = String(seed || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function loveSecretSeededParagraphOrder(paragraphs = [], seed = "") {
  const source = (Array.isArray(paragraphs) ? paragraphs : []).map((line) => stripUnsafeText(line)).filter(Boolean);
  if (source.length <= 3) return source;
  const first = source[0];
  const last = source[source.length - 1];
  const middle = source.slice(1, -1);
  const seedNumber = loveSecretSeedNumber(seed);
  const ordered = middle
    .map((line, index) => ({ line, score: loveSecretSeedNumber(`${seedNumber}:${index}:${line.slice(0, 24)}`) }))
    .sort((a, b) => a.score - b.score)
    .map((item) => item.line);
  return [first, ...ordered, last];
}

function loveSecretDeduplicateParagraphs(paragraphs = []) {
  const seen = new Set();
  return (Array.isArray(paragraphs) ? paragraphs : []).filter((line) => {
    const key = clean(line).replace(/\s+/g, " ").slice(0, 120);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function loveSecretStrengthTone(base, contextLabel = "이 장") {
  const label = clean(base?.strength?.label);
  const isStrong = base?.strength?.isStrong === true || /강|왕|strong/i.test(label);
  const isWeak = base?.strength?.isStrong === false || /약|쇠|weak/i.test(label);
  if (isStrong) {
    return `${contextLabel}에서는 강하게 드러나는 기운을 짧게 단정하지 않고, 매력으로 살아나는 장면과 부담으로 번지는 장면을 함께 봅니다. 힘이 충분한 항목은 관계를 밀고 가는 추진력이 되지만, 상대의 속도를 듣지 않으면 압박처럼 느껴질 수 있으므로 표현의 양보다 온도 조절이 중요합니다.`;
  }
  if (isWeak) {
    return `${contextLabel}에서는 약하게 드러나는 기운을 결핍으로 낙인찍기보다 보완 가능한 습관으로 다룹니다. 부족한 항목은 상대에게 전부 맡기기보다, 말의 순서와 만남의 리듬, 감정 확인 방식을 작게 정해 반복할 때 안정적으로 채워집니다.`;
  }
  return `${contextLabel}에서는 균형에 가까운 항목을 과장하지 않고, 상황에 따라 강해지는 반응과 조용히 물러나는 반응을 나누어 봅니다.`;
}

function loveSecretRelationManagementLine(relationHint = "", mode = "solo") {
  const normalizedMode = normalizeMode(mode);
  const base = normalizedMode === "compatibility"
    ? "합, 충, 형, 파, 해, 삼합, 방합 같은 관계성은 좋은 궁합과 나쁜 궁합을 가르는 판정이 아니라 두 사람이 어떤 방식으로 가까워지고 예민해지는지를 보여 주는 작동 원리입니다."
    : "합, 충, 형, 파, 해, 삼합, 방합 같은 관계성은 운을 단정하는 표지가 아니라 마음이 움직이는 방식과 관리해야 할 반응을 알려 주는 참고점입니다.";
  const management = "끌림이 강하면 속도를 조절하고, 긴장이 생기면 말의 순서와 거리감을 먼저 조정하는 방식으로 다루는 것이 좋습니다.";
  return [base, clean(relationHint), management].filter(Boolean).join(" ");
}

function sanitizeLoveSecretLocalText(value) {
  return softenLoveSecretSensitiveText(value)
    .replace(LOVE_SECRET_EXPLICIT_INTIMACY_RE, "친밀감의 속도")
    .replace(LOVE_SECRET_PARTNER_BLAME_RE, "조율이 필요한 반응")
    .replace(/\b확정\b/g, "가능성")
    .replace(/\b필연적으로\b/g, "그 흐름에서는")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildDayBranchRelationHint(dayBranch, partnerDayBranch) {
  const a = clean(dayBranch);
  const b = clean(partnerDayBranch);
  if (!a || !b) return "";
  const pair = `${a}${b}`;
  const rev = `${b}${a}`;
  const has = (list = []) => list.includes(pair) || list.includes(rev);
  const yukhab = ["자축", "인해", "묘술", "진유", "사신", "오미"];
  const chong = ["자오", "축미", "인신", "묘유", "진술", "사해"];
  const hyeong = ["인사", "사신", "신인", "축술", "술미", "미축", "자묘", "묘자", "진진", "오오", "유유", "해해"];
  if (has(yukhab)) return `두 사람 일지(${a}-${b})는 합의 결이 있어 마음이 맞물릴 때 친밀감이 빠르게 깊어지는 구조입니다.`;
  if (has(chong)) return `두 사람 일지(${a}-${b})는 충의 긴장이 있어 감정이 빠르게 오르내릴 수 있으므로 말의 순서를 먼저 합의해야 합니다.`;
  if (has(hyeong)) return `두 사람 일지(${a}-${b})는 형의 자극이 있어 사소한 생활 습관 차이도 크게 체감되기 쉬운 구조입니다.`;
  return `두 사람 일지(${a}-${b})는 극단 충돌보다 생활 리듬 조율에서 궁합의 성패가 갈리는 유형입니다.`;
}

const LOVE_SECRET_STEM_SHORT = Object.freeze({
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
  갑: "갑", 을: "을", 병: "병", 정: "정", 무: "무", 기: "기", 경: "경", 신: "신", 임: "임", 계: "계",
});

const LOVE_SECRET_BRANCH_SHORT = Object.freeze({
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
  자: "자", 축: "축", 인: "인", 묘: "묘", 진: "진", 사: "사", 오: "오", 미: "미", 신: "신", 유: "유", 술: "술", 해: "해",
});

const LOVE_SECRET_ELEMENT_LABEL = Object.freeze({
  wood: "목", fire: "화", earth: "토", metal: "금", water: "수",
  木: "목", 火: "화", 土: "토", 金: "금", 水: "수",
  목: "목", 화: "화", 토: "토", 금: "금", 수: "수",
});

function loveSecretStemLabel(value) {
  const raw = clean(value);
  return LOVE_SECRET_STEM_SHORT[raw] || raw || "미상";
}

function loveSecretBranchLabel(value) {
  const raw = clean(value);
  return LOVE_SECRET_BRANCH_SHORT[raw] || raw || "미상";
}

function loveSecretElementLabel(value) {
  const raw = clean(value);
  return LOVE_SECRET_ELEMENT_LABEL[raw] || raw || "중화";
}

function loveSecretPillarLabel(pillar) {
  const gan = clean(pillar?.gan || pillar?.stemKo || pillar?.stem);
  const zhi = clean(pillar?.zhi || pillar?.branchKo || pillar?.branch);
  const ko = `${loveSecretStemLabel(gan)}${loveSecretBranchLabel(zhi)}`.replace(/미상/g, "");
  const raw = gan && zhi ? `${gan}${zhi}` : clean(pillar?.raw);
  if (ko && raw && ko !== raw) return `${ko}(${raw})`;
  return ko || raw || "미상";
}

function loveSecretUserLabel(base) {
  return clean(base?.user?.name) || "의뢰인";
}

function loveSecretProfileContext(base) {
  const useful = Array.isArray(base?.yongshin?.usefulElements)
    ? base.yongshin.usefulElements.map(loveSecretElementLabel).filter(Boolean).slice(0, 3).join(", ")
    : "";
  const daeun = Array.isArray(base?.timing?.daeun)
    ? base.timing.daeun.slice(0, 2).map((row) => clean(row?.ganji || row?.label || row?.name)).filter(Boolean).join(", ")
    : "";
  return {
    name: loveSecretUserLabel(base),
    yearPillar: loveSecretPillarLabel(base?.pillars?.year),
    monthPillar: loveSecretPillarLabel(base?.pillars?.month),
    dayPillar: loveSecretPillarLabel(base?.pillars?.day),
    hourPillar: loveSecretPillarLabel(base?.pillars?.hour),
    dayMaster: clean(base?.core?.dayMaster) || loveSecretStemLabel(base?.pillars?.day?.gan),
    dayBranch: clean(base?.core?.dayBranch) || loveSecretBranchLabel(base?.pillars?.day?.zhi),
    monthBranch: clean(base?.core?.monthBranch) || loveSecretBranchLabel(base?.pillars?.month?.zhi),
    dominantElement: loveSecretElementLabel(base?.elementBalance?.dominant),
    deficientElement: loveSecretElementLabel(base?.elementBalance?.deficient),
    tenGod: clean(base?.tenGods?.dominantTenGod) || "관계 중심성",
    strength: clean(base?.strength?.label) || (base?.strength?.isStrong === true ? "강한 편" : base?.strength?.isStrong === false ? "부드러운 편" : "중화"),
    johu: clean(base?.johu?.summary || base?.johu?.type || base?.johu?.temperature || base?.johu?.label) || "과열과 냉각의 균형을 섬세하게 맞추는 구조",
    useful,
    daeun,
    hasHour: Boolean(clean(base?.pillars?.hour?.gan) && clean(base?.pillars?.hour?.zhi)),
  };
}

function loveSecretRelationLine(self, partner, contextLabel = "관계") {
  if (!partner) {
    return `${contextLabel}에서는 ${self.name}님의 ${self.monthPillar} 현실 감각과 ${self.dayPillar}의 사적인 정서가 만날 때 안정됩니다. ${contextLabel}의 판단은 빠른 결론보다 마음이 편안해지는 속도, 말이 부드럽게 오가는 빈도, 생활 리듬이 맞는지를 함께 보아야 합니다.`;
  }
  const partnerCtx = loveSecretProfileContext(partner);
  return `${contextLabel}에서는 ${self.name}님의 ${self.dayPillar}와 상대의 ${partnerCtx.dayPillar}가 만나는 결을 먼저 봅니다. ${contextLabel}의 핵심은 감정의 속도와 생활의 기준을 맞추는 일이며, 서로의 월주인 ${self.monthPillar}와 ${partnerCtx.monthPillar}가 현실 조건을 어떻게 받아들이는지가 오래 가는 힘을 결정합니다.`;
}

function buildProfessionalLoveSecretSectionText(base, chapterTitle, sectionTitle, mode, chapterNo, sectionIndex = 0) {
  const normalizedMode = normalizeMode(mode);
  const self = loveSecretProfileContext(base);
  const partner = normalizedMode === "compatibility" && base?.partner ? loveSecretProfileContext(base.partner) : null;
  const contextLabel = `${chapterNo}장 ${sectionTitle}`;
  const relationLine = loveSecretRelationLine(self, base?.partner, contextLabel);
  const dayBranchRelationHint = buildDayBranchRelationHint(self.dayBranch, partner?.dayBranch);
  const partnerLine = partner
    ? `${contextLabel}에서 상대는 ${partner.dayMaster} 일간과 ${partner.dayBranch} 일지를 중심으로 애정을 표현합니다. ${contextLabel}의 실제 장면에서는 ${partner.monthPillar}의 현실 감각이 더해져 말보다 태도와 반복되는 행동에서 진심이 드러나는 편입니다.`
    : `${contextLabel}에서 ${self.name}님에게 좋은 인연은 부족한 ${self.deficientElement} 기운을 부드럽게 보완하고, 과한 ${self.dominantElement} 기운을 경쟁이 아니라 안정감으로 바꾸어 주는 사람입니다.`;
  const hourLine = self.hasHour
    ? `${contextLabel}에서는 시주가 함께 반영되어 미래의 친밀감, 약속을 다루는 방식, 늦게 드러나는 욕구까지 함께 읽을 수 있습니다.`
    : `${contextLabel}에서는 시주가 비어 있는 만큼 일주와 월주의 신호를 중심으로 보수적으로 해석하며, 미래의 친밀감은 실제 관계의 반복 행동으로 다시 확인하는 것이 좋습니다.`;
  const intimacyLine = chapterTitle.includes("친밀") || sectionTitle.includes("속궁합") || sectionTitle.includes("친밀")
    ? `${contextLabel}의 친밀감의 속도는 단정적인 좋고 나쁨이 아니라 조후의 온도와 감정 리듬의 문제입니다. ${contextLabel}에서 ${self.johu}이므로, 마음이 열리는 속도와 스킨십 속도를 억지로 맞추지 말고 서로의 정서적 거리감을 존중하는 순서가 중요합니다.`
    : `${contextLabel}의 친밀감은 처음의 설렘보다 반복되는 안심에서 깊어집니다. ${contextLabel}에서는 작은 약속을 지키는 방식, 서운함을 말한 뒤 회복되는 속도, 상대의 생활을 존중하는 태도가 관계의 실제 체력을 만듭니다.`;
  const sectionTone = ["부드럽게", "차분하게", "정직하게", "품격 있게", "현실적으로"][sectionIndex % 5];
  const phase9Seed = `${normalizeMode(mode)}:${chapterNo}:${sectionIndex}:${chapterTitle}:${sectionTitle}:${self.dayMaster}:${partner?.dayMaster || ""}`;
  const strengthTone = loveSecretStrengthTone(base, contextLabel);
  const relationManagement = loveSecretRelationManagementLine(dayBranchRelationHint, mode);

  const paragraphs = [
    `${chapterNo}장 ${chapterTitle}의 ${sectionTitle}은 사랑을 운명처럼 포장하기보다, 사주가 보여 주는 관계의 습관을 현실에서 읽어 내는 대목입니다. ${self.name}님의 핵심은 일간 ${self.dayMaster}, 일지 ${self.dayBranch}, 월지 ${self.monthBranch}에 놓여 있으며, 특히 월주 ${self.monthPillar}는 연애가 실제 생활과 만날 때 어떤 태도가 강해지는지를 보여 줍니다. ${relationLine}`,
    `이 구조에서 강점은 ${self.strength}의 기세가 관계를 끌고 가는 힘으로 작동한다는 점입니다. ${self.dominantElement} 기운은 끌림을 만들지만, 부족한 ${self.deficientElement} 기운이 채워지지 않으면 서운함이 쌓이기 쉽습니다. ${partnerLine} 그래서 ${sectionTitle}에서는 감정을 증명하려는 태도보다 서로가 안심하는 조건을 먼저 정리해야 합니다.`,
    `${contextLabel}에서 ${self.tenGod}의 기운은 애정 표현의 방식과 기대치를 결정합니다. ${contextLabel}의 사랑을 받을 때는 분명한 말과 꾸준한 행동을 원하고, 사랑을 줄 때는 상대가 흔들리지 않도록 생활 속 기준을 세우려는 면이 강해집니다. ${hourLine} ${contextLabel}을 이해하면 좋은 사람을 만나도 같은 오해가 줄고, 관계의 불필요한 긴장이 빠르게 가라앉습니다.`,
    `${intimacyLine} 특히 ${sectionTitle}에서는 빠른 결론보다 세 가지 확인이 필요합니다. 첫째, 감정이 올라왔을 때 바로 판정하지 않는 것. 둘째, 상대의 말보다 반복 행동을 보는 것. 셋째, 내가 원하는 사랑의 형태를 ${sectionTone} 전하는 것입니다. 이 세 가지가 지켜질 때 관계는 운의 흔들림 속에서도 쉽게 무너지지 않습니다.`,
    strengthTone,
    relationManagement,
    `${self.useful ? `${contextLabel}의 보완 기운은 ${self.useful} 쪽에서 살아납니다. ` : ""}${self.daeun ? `${contextLabel}의 가까운 운 흐름은 ${self.daeun} 구간을 함께 보며 조절하면 좋습니다. ` : ""}${sectionTitle}의 실천 비책은 단순합니다. 마음이 급해질수록 확인을 요구하기보다 오늘 지킬 수 있는 작은 약속을 만들고, 상대가 반응할 시간을 주며, 나의 기준을 품격 있게 말하는 것입니다. ${contextLabel}이 지켜질 때 ${self.name}님의 사랑은 흔들리는 감정이 아니라 선택 가능한 인연으로 선명해집니다.`,
  ];

  const ordered = loveSecretDeduplicateParagraphs(loveSecretSeededParagraphOrder(paragraphs, phase9Seed));
  return sanitizeLoveSecretLocalText(ordered.join("\n\n"));
}

function buildProfessionalLoveSecretReinforcementText(base, mode, chapterNo, sectionTitle, pass = 1) {
  const self = loveSecretProfileContext(base);
  const partner = normalizeMode(mode) === "compatibility" && base?.partner ? loveSecretProfileContext(base.partner) : null;
  const partnerText = partner
    ? ` 상대의 ${partner.dayPillar}는 ${self.name}님의 ${self.dayPillar}와 다른 방식으로 안정감을 확인하므로, 같은 말을 들어도 받아들이는 속도가 다를 수 있습니다.`
    : ` 좋은 인연은 ${self.name}님의 부족한 ${self.deficientElement} 기운을 자극이 아니라 편안함으로 채워 주는 쪽에 가깝습니다.`;
  return sanitizeLoveSecretLocalText(`${sectionTitle} 보강 ${pass}단계에서는 결과를 단정하지 말고 관계의 순서를 다시 세워야 합니다. ${self.name}님의 ${self.monthPillar}는 현실 감각을 요구하고, ${self.dayPillar}는 가까운 사람에게 더 섬세한 안심을 원합니다.${partnerText} 그러므로 이 장의 조언은 상대를 바꾸는 것이 아니라, 감정이 올라오는 순간에 말의 온도와 행동의 반복을 조율하는 데 있습니다.`);
}

function localCategoryDraft(base, chapterTitle, sectionTitle, mode, chapterNo) {
  const sectionIndex = Number(arguments[5] || 0);
  const dm = clean(base?.core?.dayMaster) || "미상";
  const db = clean(base?.core?.dayBranch) || "미상";
  const mb = clean(base?.core?.monthBranch) || "미상";
  const dominantEl = clean(base?.elementBalance?.dominant) || "earth";
  const deficientEl = clean(base?.elementBalance?.deficient) || "water";
  const tenGod = clean(base?.tenGods?.dominantTenGod) || "비견";
  const strengthLabel = clean(base?.strength?.label) || (base?.strength?.isStrong === true ? "신강" : base?.strength?.isStrong === false ? "신약" : "중화");
  const hasHour = Boolean(clean(base?.pillars?.hour?.gan) && clean(base?.pillars?.hour?.zhi));
  const spouseStarLabel = resolveSpouseStarLabel(base?.user?.gender);
  const johuHint = clean(base?.johu?.summary || base?.johu?.type || base?.johu?.temperature || base?.johu?.label);
  const daeunHint = buildDaeunHint(base);
  const hourNote = hasHour
    ? "시주 정보가 있어 친밀감 세부 반응까지 비교적 선명하게 판단했습니다."
    : "출생 시간이 없는 경우에는 시주 영역의 세부 판단을 보수적으로 해석하며, 일주와 월지를 중심으로 연애 성향을 판단합니다.";
  const ref = base?.loveSecretReference && typeof base.loveSecretReference === "object" ? base.loveSecretReference : null;
  const partner = base?.partner && typeof base.partner === "object" ? base.partner : null;
  const partnerDm = clean(partner?.core?.dayMaster);
  const partnerDb = clean(partner?.core?.dayBranch);
  const dayBranchRelationHint = buildDayBranchRelationHint(db, partnerDb);
  const identity = ref?.identity || null;
  const primaryRisk = Array.isArray(ref?.risks) && ref.risks.length ? ref.risks[0] : null;
  const compatRef = normalizeMode(mode) === "compatibility" && ref?.compatibility ? ref.compatibility : null;
  const bestMonths = Array.isArray(ref?.monthlyWindows?.best) ? ref.monthlyWindows.best.slice(0, 2).map((row) => `${row.month} ${row.score}점`).join(", ") : "";
  const cautionMonths = Array.isArray(ref?.monthlyWindows?.caution) ? ref.monthlyWindows.caution.slice(0, 2).map((row) => `${row.month} ${row.score}점`).join(", ") : "";

  const profileLines = [];
  if (identity) {
    profileLines.push(`${identity.title} 성향 기준으로 보면 ${identity.instinct}`);
    profileLines.push(`무의식의 핵심은 ${identity.unconscious}`);
  }
  if (chapterNo <= 3 && ref?.idealPartner) {
    profileLines.push(`보완 인연은 용신 오행 ${ref.yongshinElementLabel} 계열로, ${ref.idealPartner.personality} 흐름과 잘 맞습니다.`);
  }
  if (chapterNo >= 4 && primaryRisk) {
    profileLines.push(`현재 가장 먼저 관리해야 할 리스크는 ${primaryRisk.title}이며, ${primaryRisk.solution}`);
  }
  if (chapterNo >= 7 && ref?.marriageAgeLabel) {
    profileLines.push(`장기 안정성은 ${ref.marriageAgeLabel} 구간에서 더 선명해지고, ${ref.strengthTip}`);
  }
  if (chapterNo >= 9 && bestMonths) {
    profileLines.push(`실행 타이밍은 상위 구간 ${bestMonths}에 집중하고, 주의 구간 ${cautionMonths || "저점 달"}에는 결론보다 조율을 우선해야 합니다.`);
  }
  if (compatRef) {
    profileLines.push(`${compatRef.emotionalMood}으로 읽히며, ${compatRef.feminineAppealFocus}`);
    profileLines.push(`주의할 지점은 ${compatRef.tensionPoint} ${compatRef.strategyLine}`);
  }
  if (chapterNo === 10 && ref?.gaeun) {
    profileLines.push(`개운 루틴은 ${ref.gaeun.livingColor}, ${ref.gaeun.perfume}, 확언 "${ref.gaeun.affirmation}"을 함께 쓰는 방식이 가장 안정적입니다.`);
  }

  const openingSet = [
    `${chapterTitle}에서 다루는 ${sectionTitle}는 사랑의 방향을 결정하는 핵심 축입니다.`,
    `${sectionTitle}를 읽을 때는 감정의 크기보다 관계가 실제로 굴러가는 구조를 함께 보아야 합니다.`,
    `${chapterTitle}의 ${sectionTitle}는 막연한 운세가 아니라 연애를 운영하는 기준을 정리하는 장치입니다.`,
    `${sectionTitle}의 초점은 상대를 바꾸는 방법이 아니라 내가 사랑을 다루는 방식을 정교하게 만드는 데 있습니다.`,
    `${chapterTitle}에서 특히 ${sectionTitle}는 관계의 체온과 속도를 조율하는 실무 지침에 가깝습니다.`,
    `${sectionTitle}를 통해 지금의 관계 습관을 점검하면 오래 가는 사랑의 방향을 더 분명하게 잡을 수 있습니다.`,
  ];
  const opening = openingSet[sectionIndex % openingSet.length];
  const tenGodPack = SAJU_LOVE_TEN_GOD_INTERPRETATION[tenGod] || SAJU_LOVE_TEN_GOD_INTERPRETATION["비견"];
  const pillarNotes = [
    `${SAJU_LOVE_PILLAR_INTERPRETATION.dayStem.theme} 관점에서 일간 ${dm}은 ${tenGodPack.loveCore}로 나타나며, 감정을 다룰 때 ${tenGodPack.communication} 성향이 함께 드러납니다.`,
    `${SAJU_LOVE_PILLAR_INTERPRETATION.dayBranch.theme} 관점에서 일지 ${db}는 가까워질수록 자존심과 신뢰의 경계선을 더 분명히 세우는 경향이 있습니다.`,
    `${SAJU_LOVE_PILLAR_INTERPRETATION.monthBranch.theme} 관점에서 월지 ${mb}는 사랑을 현실 계획과 연결하려는 성향을 강화하고, 우세 오행 ${dominantEl}과 결핍 오행 ${deficientEl}의 간격이 감정 피로도를 좌우합니다.`,
  ];
  if (mode === "compatibility" && partnerDm && partnerDb) {
    pillarNotes.push(`궁합 관점에서는 상대 일간 ${partnerDm}, 상대 일지 ${partnerDb}와의 상호작용을 함께 보며, 두 사람의 감정 속도와 생활 리듬 차이를 조율해야 관계 안정성이 높아집니다.`);
  }

  const paragraph1 = `${opening}\n\n${chapterNo}장의 ${sectionTitle}에서 중요한 것은 한 번의 강한 감정이 아니라 반복되는 선택의 방향입니다. 이 항목은 마음이 움직이는 순간, 표현이 오해로 번지는 순간, 그리고 관계를 다시 안정으로 돌리는 순간을 분리해 설명합니다. 따라서 관계가 좋을 때는 무엇을 유지해야 하는지, 흔들릴 때는 무엇을 먼저 멈춰야 하는지를 동시에 제시합니다.`;
  const paragraph2 = `${pillarNotes.join(" ")} ${chapterNo}장 ${sectionTitle} 구간에서는 ${strengthLabel} 흐름에 따라 ${tenGodPack.attraction} 경향이 자주 나타나며, ${tenGodPack.caution}이 겹칠 때 갈등이 커지기 쉽습니다. ${spouseStarLabel} 관점에서는 기대 수준을 선명하게 말할수록 관계 오해가 줄어듭니다. ${johuHint ? `조후의 결은 ${johuHint}로 읽히며, 친밀감은 감정 속도와 몸의 편안함을 같이 맞출 때 안정됩니다.` : "조후 균형은 관계의 온도 조절과 직결되므로 과열·과냉 구간에서 표현 강도를 조절해야 합니다."} ${hourNote}`;
  const paragraph3 = `${sectionTitle}가 건강하게 작동하면 ${tenGodPack.strength}이 선명해지고, 관계의 중심이 흔들려도 다시 균형을 회복하는 속도가 빨라집니다. ${tenGodPack.marriage}으로 이어지는 장점이 살아나면 사랑은 감정 소비가 아니라 성장의 협업으로 바뀝니다. ${mode === "compatibility" ? dayBranchRelationHint : "일지의 생활 감각을 지키면 가까워질수록 생기는 오해를 미리 줄일 수 있습니다."} ${daeunHint} ${profileLines.join(" ")}`;
  const paragraph4 = `${sectionTitle}에서 신뢰가 어긋날 때는 ${tenGodPack.breakup} 패턴이 먼저 나타날 수 있으므로, 감정이 커진 날일수록 결론을 서두르기보다 대화 순서와 말의 온도를 먼저 조정해야 합니다. ${tenGodPack.advice}를 실전 규칙으로 삼고, ${chapterNo}장에서 바로 실행할 한 문장을 정해 반복하면 관계의 회복력이 확실히 올라갑니다.`;

  const text = [paragraph1, paragraph2, paragraph3, paragraph4].join("\n\n");

  return stripUnsafeText(text);
}

function buildLoveSecretChapterQualityAssets(base, mode, chapterNo, chapterTitle) {
  const normalizedMode = normalizeMode(mode);
  const self = loveSecretProfileContext(base);
  const partner = normalizedMode === "compatibility" && base?.partner ? loveSecretProfileContext(base.partner) : null;
  const relationLabel = partner ? `${self.name}와 ${partner.name}` : `${self.name}의 사랑`;
  const dayMasterLine = partner
    ? `${self.dayMaster} 일간과 ${partner.dayMaster} 일간이 만나는 방식에서 관계의 첫 반응과 속도 차이가 드러납니다.`
    : `${self.dayMaster} 일간과 ${self.dayBranch} 일지는 마음이 열리는 방식과 가까워진 뒤의 태도를 함께 보여 줍니다.`;
  const balanceLine = partner
    ? `두 사람의 오행 균형은 강점과 충돌을 동시에 만들기 때문에 감정 판단보다 생활 리듬 조율이 중요합니다.`
    : `${self.dominantElement} 기운은 매력을 선명하게 만들고, ${self.deficientElement} 기운은 관계에서 의식적으로 보완해야 할 결입니다.`;
  const timingLine = chapterNo >= 8
    ? "대운과 세운은 새로운 점수를 만들지 않고 기존 계산값의 흐름을 연애 타이밍 조언으로만 해석합니다."
    : "이 장의 판단은 원국과 관계 계산값을 바탕으로 하며, 감정의 단정 대신 반복되는 선택의 방향을 봅니다.";
  const summaryCards = [
    dayMasterLine,
    balanceLine,
    timingLine,
  ];
  const actionItems = normalizedMode === "compatibility"
    ? [
        "같은 사건을 두고 각자가 느낀 감정과 원하는 행동을 한 문장씩 분리해 말합니다.",
        "서로의 빠른 반응과 느린 반응을 잘잘못으로 보지 않고 필요한 시간을 먼저 합의합니다.",
        "갈등이 생긴 날에는 결론보다 다음 대화 시간을 정해 관계의 안전감을 먼저 회복합니다.",
        "정서적 거리감과 스킨십 속도는 상대의 애정 크기가 아니라 안심의 리듬으로 조율합니다.",
      ]
    : [
        "끌리는 감정이 커질수록 상대의 말보다 반복되는 행동을 먼저 확인합니다.",
        "내가 원하는 관계의 속도와 형태를 짧은 문장으로 정리해 표현합니다.",
        "불안한 날에는 고백, 이별, 확인 요구처럼 큰 결정을 하루 미루고 감정의 온도를 낮춥니다.",
        "친밀감의 속도는 상대의 반응을 보며 천천히 맞추고 정서적 거리감을 먼저 존중합니다.",
      ];
  const checklist = normalizedMode === "compatibility"
    ? [
        "오늘의 대화에서 서로가 가장 예민하게 반응한 지점을 확인했는가",
        "상대의 생활 리듬을 바꾸려 하기 전에 내 기대치를 먼저 설명했는가",
        "이번 주 안에 다시 가까워질 수 있는 작은 약속을 하나 정했는가",
      ]
    : [
        "내가 반복해서 끌리는 사람의 공통점을 세 가지 이상 적었는가",
        "상대에게 기대하는 애정 표현을 구체적인 행동으로 말할 수 있는가",
        "관계가 흔들릴 때 내가 먼저 멈춰야 할 반응을 알고 있는가",
      ];
  const caution = normalizedMode === "compatibility"
    ? [
        "궁합은 승패가 아니라 조율 가능한 결을 읽는 도구로 다루어야 합니다.",
        "점수가 없는 항목을 임의로 단정하지 않고 강점, 충돌, 보완점 중심으로 해석합니다.",
        "상대의 다른 속도를 애정 부족으로 곧장 해석하면 갈등이 커질 수 있습니다.",
      ]
    : [
        "강한 끌림만으로 장기 안정성을 판단하지 않습니다.",
        "부족한 기운을 상대에게 전부 채우라고 요구하면 관계가 무거워질 수 있습니다.",
        "불안을 예언처럼 믿기보다 몸과 말의 속도를 낮추는 신호로 봅니다.",
      ];
  const sajuEvidence = [
    `${relationLabel}의 기준 일간: ${self.dayMaster || "확인 필요"}`,
    partner ? `상대 기준 일간: ${partner.dayMaster || "확인 필요"}` : `일지 친밀감 기준: ${self.dayBranch || "확인 필요"}`,
    `${chapterTitle} 판단 기준: 원국, 오행, 십성, 대운·세운의 로컬 계산값`,
  ];
  return { summaryCards, actionItems, checklist, caution, sajuEvidence };
}

function buildLoveSecretMonthlyTableRows(base, mode) {
  const ref = base?.loveSecretReference && typeof base.loveSecretReference === "object" ? base.loveSecretReference : {};
  const best = new Map((Array.isArray(ref?.monthlyWindows?.best) ? ref.monthlyWindows.best : []).map((row) => [clean(row?.month), clean(row?.score)]));
  const caution = new Map((Array.isArray(ref?.monthlyWindows?.caution) ? ref.monthlyWindows.caution : []).map((row) => [clean(row?.month), clean(row?.score)]));
  const normalizedMode = normalizeMode(mode);
  return Array.from({ length: 12 }, (_, idx) => {
    const month = `${idx + 1}월`;
    const bestScore = best.get(month);
    const cautionScore = caution.get(month);
    const flow = bestScore ? "관계 확장" : cautionScore ? "속도 조절" : idx % 3 === 0 ? "대화 정리" : idx % 3 === 1 ? "감정 안정" : "현실 조율";
    const advice = normalizedMode === "compatibility"
      ? bestScore
        ? "함께 결정할 일을 작게 시작합니다."
        : cautionScore
          ? "결론보다 감정 확인을 먼저 둡니다."
          : "생활 리듬과 대화 시간을 맞춥니다."
      : bestScore
        ? "만남과 표현의 기회를 넓힙니다."
        : cautionScore
          ? "확인 요구와 성급한 결정을 줄입니다."
          : "내 기준과 상대의 반복 행동을 함께 봅니다.";
    return [month, flow, advice];
  });
}

function buildLoveSecretThirtyDayRoutineRows(mode) {
  const normalizedMode = normalizeMode(mode);
  const soloRows = [
    ["1~5일", "감정 기록", "끌림, 불안, 기대를 하루 한 문장으로 적습니다."],
    ["6~10일", "표현 정리", "상대에게 바라는 애정 표현을 행동 단위로 바꿉니다."],
    ["11~15일", "관계 기준", "피해야 할 사람과 만나야 할 사람의 기준을 나눕니다."],
    ["16~20일", "대화 연습", "확인 요구 대신 질문형 문장을 사용합니다."],
    ["21~25일", "생활 리듬", "연락, 만남, 혼자 있는 시간의 균형을 점검합니다."],
    ["26~30일", "선택 정리", "관계를 이어 갈 조건과 멈춰야 할 신호를 정리합니다."],
  ];
  const coupleRows = [
    ["1~5일", "관계 온도 확인", "서로 편안했던 순간과 불편했던 순간을 하나씩 나눕니다."],
    ["6~10일", "대화 규칙", "싸움이 커지기 전 멈춤 문장과 재대화 시간을 정합니다."],
    ["11~15일", "생활 조율", "돈, 시간, 연락, 휴식 리듬의 기대치를 비교합니다."],
    ["16~20일", "화해 훈련", "사과, 설명, 재발 방지 약속을 분리해 말합니다."],
    ["21~25일", "강점 강화", "서로에게 안정감을 준 행동을 의식적으로 반복합니다."],
    ["26~30일", "장기 조건", "오래 가기 위해 지켜야 할 관계 원칙 세 가지를 합의합니다."],
  ];
  return normalizedMode === "compatibility" ? coupleRows : soloRows;
}

function buildLocalChapter(base, chapterTitle, chapterSubtitle, sectionTitles, mode, chapterNo) {
  const quality = buildLoveSecretChapterQualityAssets(base, mode, chapterNo, chapterTitle);
  const normalizedMode = normalizeMode(mode);
  const sections = sectionTitles.map((sectionTitle, idx) => {
    const title = stripUnsafeText(sectionTitle) || `세부 항목 ${idx + 1}`;
    const section = {
      id: `${String(idx + 1).padStart(2, "0")}`,
      title,
      body: sanitizeLoveSecretLocalText(buildProfessionalLoveSecretSectionText(base, chapterTitle, title, mode, chapterNo, idx)),
      sajuEvidence: quality.sajuEvidence.map(sanitizeLoveSecretLocalText),
      keyPoints: quality.summaryCards.map(sanitizeLoveSecretLocalText),
      actionGuide: quality.actionItems.map(sanitizeLoveSecretLocalText),
      caution: quality.caution.map(sanitizeLoveSecretLocalText),
      checklist: quality.checklist.map(sanitizeLoveSecretLocalText),
    };
    if ((normalizedMode === "solo" && chapterNo === 8 && idx === 0) || (normalizedMode === "compatibility" && chapterNo === 9 && idx === 0)) {
      section.tableType = "monthly-love-flow";
      section.tableTitle = "월별 연애운 표";
      section.tableHeaders = ["월", "관계 흐름", "실천 조언"];
      section.tableRows = buildLoveSecretMonthlyTableRows(base, mode);
    }
    if (chapterNo === 10 && idx === 0) {
      section.tableType = "thirty-day-routine";
      section.tableTitle = normalizedMode === "compatibility" ? "30일 관계 개선 루틴 표" : "30일 연애 회복 루틴 표";
      section.tableHeaders = ["기간", "주제", "실천법"];
      section.tableRows = buildLoveSecretThirtyDayRoutineRows(mode);
    }
    if (normalizedMode === "compatibility") {
      section.personAView = `${quality.sajuEvidence[0]}을 기준으로 본인의 감정 속도와 표현 방식을 먼저 확인합니다.`;
      section.personBView = `${quality.sajuEvidence[1]}을 기준으로 상대의 안정감과 반응 방식을 함께 봅니다.`;
      section.relationshipDynamic = quality.summaryCards[1];
      section.compatibilityStrategy = quality.actionItems[0];
    }
    return section;
  });
  for (let i = 0; i < sections.length; i += 1) {
    let body = clean(sections[i]?.body);
    let pass = 1;
    while (body.replace(/\s+/g, "").length < 760 && pass <= 3) {
      const addon = buildLoveSecretReinforcementText(base, mode, chapterNo, clean(sections[i]?.title || `세부 항목 ${i + 1}`), pass);
      body = sanitizeLoveSecretLocalText(`${body}\n\n${addon}`);
      pass += 1;
    }
    sections[i].body = body;
  }
  const text = sanitizeLoveSecretLocalText(sections.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n"));
  return {
    chapterTitle,
    chapterSubtitle,
    summaryCards: quality.summaryCards.map(sanitizeLoveSecretLocalText),
    actionItems: quality.actionItems.map(sanitizeLoveSecretLocalText),
    checklist: quality.checklist.map(sanitizeLoveSecretLocalText),
    sections,
    localDraft: text,
    finalText: text,
    fallbackUsed: false,
  };
}

function buildLoveSecretReinforcementText(base, mode, chapterNo, sectionTitle, pass = 1) {
  return buildProfessionalLoveSecretReinforcementText(base, mode, chapterNo, sectionTitle, pass);
  const ref = base?.loveSecretReference && typeof base.loveSecretReference === "object" ? base.loveSecretReference : {};
  const mood = clean(ref?.identity?.title || base?.core?.dayMaster || "관계 핵심");
  const useful = Array.isArray(base?.yongshin?.usefulElements) ? base.yongshin.usefulElements.filter(Boolean).join(" · ") : "";
  const partnerDayMaster = clean(base?.partner?.core?.dayMaster || "");
  const relationLine = mode === "compatibility" && partnerDayMaster
    ? `상대 일간 ${partnerDayMaster}과 맞물리는 순간의 감정 반응을 함께 확인해야 관계의 손실을 줄일 수 있습니다.`
    : "내 감정이 빨라지는 장면을 먼저 알아차리는 것만으로도 관계의 소모를 줄일 수 있습니다.";
  return stripUnsafeText(
    `${sectionTitle} 보강 ${pass}단계에서는 ${mood} 흐름이 실제 대화와 생활 리듬에 어떻게 반영되는지 다시 점검해야 합니다. ${relationLine} ${useful ? `보완 포인트는 ${useful} 기운을 생활 루틴에 반영하는 것입니다.` : "보완 포인트는 감정과 요구를 분리해 말하는 습관을 만드는 것입니다."}`,
  );
}

function reinforceLoveSecretChapters(chapters = [], mode, config, base) {
  const list = (Array.isArray(chapters) ? chapters : []).map((chapter) => ({
    ...chapter,
    sections: (Array.isArray(chapter?.sections) ? chapter.sections : []).map((section) => ({ ...section })),
  }));
  const minTotal = Number(config?.minTotalChars || 0);
  const minByIndex = config?.chapterMinByIndex && typeof config.chapterMinByIndex === "object"
    ? config.chapterMinByIndex
    : {};

  list.forEach((chapter, chapterIndex) => {
    const chapterNo = Number(chapter?.chapter || chapterIndex + 1);
    const targetMin = Number(minByIndex[chapterNo] || config?.chapterMinDefault || 2600);
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];

    sections.forEach((section, sectionIndex) => {
      const body = clean(section?.body || section?.text || "");
      if (body.replace(/\s+/g, "").length < 520) {
        const addon = buildLoveSecretReinforcementText(base, mode, chapterNo, clean(section?.title || `세부 항목 ${sectionIndex + 1}`), 1);
        section.body = sanitizeLoveSecretLocalText(`${body}\n\n${addon}`);
      }
    });

    while (chapterCharLength(chapter) < targetMin && sections.length) {
      const targetSection = sections[(chapterNo - 1) % sections.length];
      const addon = buildLoveSecretReinforcementText(base, mode, chapterNo, clean(targetSection?.title || "핵심 항목"), 2);
      targetSection.body = sanitizeLoveSecretLocalText(`${clean(targetSection.body)}\n\n${addon}`);
      chapter.text = sanitizeLoveSecretLocalText(sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n"));
    }
  });

  let totalChars = list.reduce((sum, chapter) => sum + chapterCharLength(chapter), 0);
  let cursor = 0;
  while (totalChars < minTotal && list.length) {
    const chapter = list[cursor % list.length];
    const chapterNo = Number(chapter?.chapter || (cursor % list.length) + 1);
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    if (!sections.length) break;
    const targetSection = sections[cursor % sections.length];
    const addon = buildLoveSecretReinforcementText(base, mode, chapterNo, clean(targetSection?.title || "핵심 항목"), 3 + Math.floor(cursor / Math.max(1, list.length)));
    targetSection.body = sanitizeLoveSecretLocalText(`${clean(targetSection.body)}\n\n${addon}`);
    chapter.text = sanitizeLoveSecretLocalText(sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n"));
    totalChars = list.reduce((sum, item) => sum + chapterCharLength(item), 0);
    cursor += 1;
    if (cursor > 200) break;
  }

  return list;
}

function prepareLoveSecretFinalChapters({ candidateChapters = [], localChapters = [], mode, config, base } = {}) {
  const minChapterChars = Number(config?.chapterMinDefault || 2000);
  const firstPass = reinforceLoveSecretChapters(
    (Array.isArray(candidateChapters) ? candidateChapters : []).map((chapter) => ({ ...chapter })),
    mode,
    config,
    base,
  );
  const firstValidation = validateLoveSecretManuscript({
    mode,
    chapters: firstPass,
    config,
    minChapterChars,
  });
  if (firstValidation.ok) {
    return { chapters: firstPass, validation: firstValidation, recovered: false };
  }

  const localPass = reinforceLoveSecretChapters(
    (Array.isArray(localChapters) ? localChapters : []).map((chapter) => ({
      ...chapter,
      source: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
      llmEnhanced: false,
      promptVersion: undefined,
    })),
    mode,
    config,
    base,
  );
  const localValidation = validateLoveSecretManuscript({
    mode,
    chapters: localPass,
    config,
    minChapterChars,
  });
  if (localValidation.ok) {
    return {
      chapters: localPass,
      validation: localValidation,
      recovered: true,
      recoveryReason: "local_manuscript_recovery",
      previousValidation: firstValidation,
    };
  }

  return {
    chapters: firstPass,
    validation: firstValidation,
    recovered: false,
    localValidation,
  };
}

function escapeLoveSecretHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const LOVE_SECRET_ASSEMBLED_SOLO_SPECS = Object.freeze([
  Object.freeze({ title: "사랑의 기본 구조", subtitle: "일간, 일지, 오행으로 읽는 나의 연애 출발점", focus: "사랑을 시작하고 유지하는 기본 리듬" }),
  Object.freeze({ title: "연애 성향과 끌림", subtitle: "내가 끌리는 사람과 나를 끌어당기는 매력", focus: "호감이 생기는 조건과 매력의 표현" }),
  Object.freeze({ title: "반복되는 관계 패턴", subtitle: "가까워질수록 되풀이되는 기대와 거리감", focus: "반복되는 선택과 감정 반응의 구조" }),
  Object.freeze({ title: "표현과 소통 방식", subtitle: "말, 침묵, 속도 차이가 만드는 오해와 연결", focus: "마음을 전하는 방식과 대화의 온도" }),
  Object.freeze({ title: "불안과 거리 조절", subtitle: "사랑받고 싶은 마음이 흔들릴 때의 회복법", focus: "불안, 집착, 확인 욕구를 다루는 방법" }),
  Object.freeze({ title: "결혼과 장기 관계", subtitle: "생활 리듬과 책임감으로 보는 오래 가는 사랑", focus: "장기 관계와 현실 조건의 조율" }),
  Object.freeze({ title: "이별과 회복 패턴", subtitle: "끝난 관계에서 되찾는 마음의 질서", focus: "정리, 회복, 재회 가능성을 바라보는 기준" }),
  Object.freeze({ title: "친밀감과 생활 리듬", subtitle: "가까운 관계에서 필요한 속도와 경계", focus: "친밀감, 생활 습관, 정서적 안전감" }),
  Object.freeze({ title: "연애운의 시기", subtitle: "올해의 흐름 속에서 만남과 선택을 준비하는 법", focus: "만남이 열리는 시기와 조심할 시기" }),
  Object.freeze({ title: "최종 연애 비책", subtitle: "나에게 맞는 사랑의 선택과 30일 실천 루틴", focus: "앞으로의 관계를 바꾸는 실천 전략" }),
]);

const LOVE_SECRET_ASSEMBLED_COMPAT_SPECS = Object.freeze([
  Object.freeze({ title: "두 사람의 관계 코드", subtitle: "각자의 사주가 만났을 때 생기는 기본 결", focus: "관계의 첫 인상과 기본 호흡" }),
  Object.freeze({ title: "첫 끌림과 호감 조건", subtitle: "서로에게 끌리는 지점과 조심할 기대", focus: "끌림의 이유와 호감의 유지 조건" }),
  Object.freeze({ title: "감정 궁합", subtitle: "정서적 안정감과 반응 속도의 차이", focus: "감정을 주고받는 방식" }),
  Object.freeze({ title: "대화와 표현 궁합", subtitle: "말의 결, 침묵의 의미, 오해의 방향", focus: "소통 방식과 표현의 균형" }),
  Object.freeze({ title: "갈등 패턴", subtitle: "부딪히는 순간 드러나는 각자의 방어 방식", focus: "갈등이 생기는 구조와 완화법" }),
  Object.freeze({ title: "화해와 회복력", subtitle: "다시 가까워지는 데 필요한 조건", focus: "화해의 순서와 회복의 언어" }),
  Object.freeze({ title: "현실 조건 궁합", subtitle: "생활, 책임, 돈, 시간의 조율", focus: "현실을 함께 다루는 힘" }),
  Object.freeze({ title: "장기 관계 가능성", subtitle: "오래 가는 관계로 이어질 때 필요한 약속", focus: "결혼과 장기 관계의 안정 조건" }),
  Object.freeze({ title: "올해의 관계 흐름", subtitle: "올해 두 사람에게 강해지는 기회와 주의점", focus: "시기별 관계 운영 전략" }),
  Object.freeze({ title: "최종 궁합 비책", subtitle: "두 사람이 함께 지킬 30일 관계 루틴", focus: "관계를 살리는 실천 전략" }),
]);

const LOVE_SECRET_ASSEMBLED_SECTIONS = Object.freeze([
  "핵심 요약 카드",
  "상담형 본문",
  "사주 근거 해석",
  "관계에서 주의할 점",
  "실천 조언",
  "체크리스트",
  "마무리 문장",
]);

const LOVE_SECRET_ASSEMBLED_MOJIBAKE_RE = /[\uFFFD\uF900-\uFAFF]|[?][\uAC00-\uD7A3]|[\u3131-\u318E]{2,}|[怨沅諛藥鶯耶渦訝雅野蹂濡]/;
const LOVE_SECRET_ASSEMBLED_FORBIDDEN_RE = /\b(?:undefined|null|nan|fallback|llm|json|schema|debug|prompt|raw|payload|object)\b|\[object Object\]|자동\s*복구\s*생성|데이터\s*부족|로컬\s*엔진|템플릿|internal\s*server\s*error|about:blank/i;

function loveSecretSafeDisplayText(value, fallback = "") {
  const text = clean(value).replace(/\s+/g, " ").trim();
  if (!text || LOVE_SECRET_ASSEMBLED_MOJIBAKE_RE.test(text) || LOVE_SECRET_ASSEMBLED_FORBIDDEN_RE.test(text)) return fallback;
  return text;
}

function loveSecretElementKorean(value, fallback = "중화") {
  const key = clean(value).toLowerCase();
  return ({
    wood: "목",
    fire: "화",
    earth: "토",
    metal: "금",
    water: "수",
    목: "목",
    화: "화",
    토: "토",
    금: "금",
    수: "수",
  })[key] || fallback;
}

function loveSecretDayMasterKorean(value) {
  const key = clean(value).slice(0, 1);
  return ({
    甲: "갑목",
    乙: "을목",
    丙: "병화",
    丁: "정화",
    戊: "무토",
    己: "기토",
    庚: "경금",
    辛: "신금",
    壬: "임수",
    癸: "계수",
  })[key] || loveSecretSafeDisplayText(value, "일간");
}

function loveSecretBranchKorean(value, fallback = "배우자궁") {
  const key = clean(value).slice(0, 1);
  return ({
    子: "자수",
    丑: "축토",
    寅: "인목",
    卯: "묘목",
    辰: "진토",
    巳: "사화",
    午: "오화",
    未: "미토",
    申: "신금",
    酉: "유금",
    戌: "술토",
    亥: "해수",
  })[key] || loveSecretSafeDisplayText(value, fallback);
}

function buildLoveSecretAssembledFacts(base = {}, mode = "solo") {
  const normalizedMode = normalizeMode(mode);
  const selfName = loveSecretSafeDisplayText(base?.user?.name, "고객");
  const partnerName = loveSecretSafeDisplayText(base?.partner?.user?.name, "상대");
  const selfCore = base?.core || {};
  const partnerCore = base?.partner?.core || {};
  const selfDayMaster = loveSecretDayMasterKorean(selfCore.dayMaster || base?.pillars?.day?.gan || base?.pillars?.day?.stem);
  const partnerDayMaster = loveSecretDayMasterKorean(partnerCore.dayMaster || base?.partner?.pillars?.day?.gan || base?.partner?.pillars?.day?.stem);
  const dayBranch = loveSecretBranchKorean(selfCore.dayBranch || base?.pillars?.day?.zhi || base?.pillars?.day?.branch);
  const partnerDayBranch = loveSecretBranchKorean(partnerCore.dayBranch || base?.partner?.pillars?.day?.zhi || base?.partner?.pillars?.day?.branch, "상대 배우자궁");
  const monthBranch = loveSecretBranchKorean(selfCore.monthBranch || base?.pillars?.month?.zhi || base?.pillars?.month?.branch, "월지");
  const partnerMonthBranch = loveSecretBranchKorean(partnerCore.monthBranch || base?.partner?.pillars?.month?.zhi || base?.partner?.pillars?.month?.branch, "상대 월지");
  const dominantElement = loveSecretElementKorean(base?.elementBalance?.dominant, "중화");
  const deficientElement = loveSecretElementKorean(base?.elementBalance?.deficient, "보완");
  const partnerDominantElement = loveSecretElementKorean(base?.partner?.elementBalance?.dominant, "중화");
  const partnerDeficientElement = loveSecretElementKorean(base?.partner?.elementBalance?.deficient, "보완");
  const usefulElements = loveSecretCleanList(base?.yongshin?.usefulElements, 3).map((item) => loveSecretElementKorean(item, loveSecretSafeDisplayText(item))).filter(Boolean);
  const cautionElements = loveSecretCleanList(base?.yongshin?.cautionElements, 3).map((item) => loveSecretElementKorean(item, loveSecretSafeDisplayText(item))).filter(Boolean);
  const gender = normalizeLoveSecretGender(base?.user?.gender);
  const spouseStar = gender === "M" ? "재성" : gender === "F" ? "관성" : "배우자성";
  const displayName = normalizedMode === "compatibility" ? `${selfName} × ${partnerName}` : selfName;
  return {
    mode: normalizedMode,
    selfName,
    partnerName,
    displayName,
    selfDayMaster,
    partnerDayMaster,
    dayBranch,
    partnerDayBranch,
    monthBranch,
    partnerMonthBranch,
    dominantElement,
    deficientElement,
    partnerDominantElement,
    partnerDeficientElement,
    usefulElements: usefulElements.length ? usefulElements.join(", ") : "안정",
    cautionElements: cautionElements.length ? cautionElements.join(", ") : "과열",
    spouseStar,
    strengthLabel: loveSecretSafeDisplayText(base?.strength?.label, "균형형"),
    targetYear: new Date().getFullYear(),
  };
}

function buildLoveSecretAssembledSectionBody({ mode, spec, sectionTitle, facts, chapterNo, sectionNo }) {
  const isCompat = normalizeMode(mode) === "compatibility";
  const subject = isCompat ? `${facts.selfName}님과 ${facts.partnerName}님` : `${facts.selfName}님`;
  const basis = isCompat
    ? `${facts.selfDayMaster}과 ${facts.partnerDayMaster}, ${facts.dayBranch}과 ${facts.partnerDayBranch}의 호흡`
    : `${facts.selfDayMaster}, ${facts.dayBranch}, ${facts.monthBranch}의 흐름`;
  const balance = isCompat
    ? `${facts.dominantElement} 기운과 ${facts.partnerDominantElement} 기운이 만나는 방식`
    : `${facts.dominantElement} 기운이 강하고 ${facts.deficientElement} 기운을 보완해야 하는 구조`;
  const action = isCompat
    ? "서로의 속도를 맞추는 약속을 작게 정하고, 감정이 올라올 때는 결론보다 확인 질문을 먼저 두는 편이 좋습니다."
    : "관계의 속도를 서두르기보다 마음이 편안해지는 기준을 분명히 세우고, 표현과 확인의 균형을 맞추는 편이 좋습니다.";
  const caution = isCompat
    ? "한쪽이 모든 관계의 방향을 정하려 하면 균형이 흔들릴 수 있으니, 생활 리듬과 감정 언어를 함께 조율해야 합니다."
    : "사랑받고 싶은 마음이 강해질수록 상대의 반응을 단정하지 말고, 내 감정의 근거와 실제 상황을 나누어 보아야 합니다.";

  const paragraphA = `${sectionTitle}에서는 ${spec.focus}을 중심으로 봅니다. ${subject}의 관계 흐름은 ${basis}에서 출발하며, 겉으로 드러나는 끌림보다 반복해서 편안함을 만드는 방식이 더 중요하게 작용합니다.`;
  const paragraphB = `사주 근거로는 ${balance}을 함께 살핍니다. 이 조합은 감정이 빠르게 움직이는 순간에도 관계의 현실 조건을 확인하게 만들며, 좋은 인연일수록 말보다 일정한 태도와 생활 속 신뢰로 깊어지는 경향이 있습니다.`;
  const paragraphC = `${chapterNo}장의 ${sectionNo}번째 관점에서는 ${caution} 특히 ${facts.usefulElements}의 기운은 관계를 부드럽게 살리는 보완점이 되고, ${facts.cautionElements}의 기운은 과해질 때 오해나 거리감으로 나타날 수 있습니다.`;
  const paragraphD = `${action} 오늘 바로 적용할 기준은 단순합니다. 마음이 흔들릴 때 먼저 사실을 확인하고, 그다음 감정을 말하며, 마지막에 원하는 행동을 짧게 제안하면 사랑의 흐름이 한결 안정됩니다.`;
  return [paragraphA, paragraphB, paragraphC, paragraphD].join("\n\n");
}

function buildLoveSecretAssembledChapter(spec, index, mode, base) {
  const facts = buildLoveSecretAssembledFacts(base, mode);
  const chapterNo = index + 1;
  const sections = LOVE_SECRET_ASSEMBLED_SECTIONS.map((title, sectionIndex) => {
    const body = buildLoveSecretAssembledSectionBody({
      mode,
      spec,
      sectionTitle: title,
      facts,
      chapterNo,
      sectionNo: sectionIndex + 1,
    });
    return {
      title,
      body,
      text: body,
      sajuEvidence: [
        `${facts.selfDayMaster} 일간의 관계 반응`,
        `${facts.dayBranch} 배우자궁의 안정 조건`,
        `${facts.dominantElement}과 ${facts.deficientElement}의 균형`,
      ],
      keyPoints: [
        `${spec.focus}을 관계 판단의 중심에 둡니다.`,
        "감정의 속도보다 반복되는 태도를 우선 확인합니다.",
        "끌림과 현실 조건을 함께 보아야 관계가 오래갑니다.",
      ],
      actionGuide: [
        "중요한 대화는 결론보다 확인 질문으로 시작합니다.",
        "관계의 속도, 연락 빈도, 생활 경계를 구체적으로 정합니다.",
        "불안이 커질 때는 상대 평가보다 내 필요를 먼저 말합니다.",
      ],
      checklist: [
        "오늘 내 감정을 한 문장으로 정리했는가",
        "상대에게 요구하기 전에 사실을 확인했는가",
        "반복되는 불편함을 생활 규칙으로 바꾸었는가",
      ],
      caution: [
        "단정적인 결론으로 상대의 마음을 재단하지 않습니다.",
        "불안한 날에는 큰 결정을 미루고 대화의 온도를 낮춥니다.",
        "관계의 책임을 한 사람에게만 몰아두지 않습니다.",
      ],
    };
  });
  if (chapterNo === 9) {
    sections[2].tableType = "monthly-love-flow";
    sections[2].tableTitle = "시기별 연애 흐름";
    sections[2].tableHeaders = ["기간", "관계 흐름", "실천 비책"];
    sections[2].tableRows = [
      ["1-2개월", "마음의 기준을 다시 세우는 시기", "연락과 만남의 리듬을 무리 없이 조정합니다."],
      ["3-4개월", "끌림과 현실 조건이 함께 드러나는 시기", "관계에서 반복되는 불편함을 구체적인 약속으로 바꿉니다."],
      ["5-6개월", "선택의 방향이 분명해지는 시기", "속도를 높이기보다 서로의 생활을 존중하는 방식을 확인합니다."],
    ];
  }
  if (chapterNo === 10) {
    sections[4].tableType = "thirty-day-routine";
    sections[4].tableTitle = "30일 연애 실천 루틴";
    sections[4].tableHeaders = ["기간", "주제", "실천법"];
    sections[4].tableRows = [
      ["1주차", "감정 정리", "내가 원하는 관계의 기준을 세 문장으로 적습니다."],
      ["2주차", "표현 조율", "고마움, 불편함, 바람을 각각 짧게 말하는 연습을 합니다."],
      ["3주차", "관계 점검", "반복되는 오해의 순간을 찾아 생활 규칙으로 바꿉니다."],
      ["4주차", "선택 정리", "관계를 이어갈 조건과 멈춰야 할 신호를 차분히 구분합니다."],
    ];
  }
  const text = sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n");
  return {
    chapter: chapterNo,
    chapterNumber: String(chapterNo).padStart(2, "0"),
    title: spec.title,
    subtitle: spec.subtitle,
    summaryCards: [
      `${facts.displayName}의 ${spec.focus}은 사주 구조의 균형을 통해 더 선명하게 드러납니다.`,
      `${facts.spouseStar}과 배우자궁의 흐름은 관계의 속도보다 신뢰의 반복을 중시합니다.`,
      "좋은 선택은 강한 확신보다 편안한 확인, 일관된 태도, 현실적인 약속에서 시작됩니다.",
    ],
    sections,
    text,
    source: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
    llmEnhanced: false,
    promptVersion: undefined,
  };
}

function buildLoveSecretAssembledChapters(chapters = [], base = {}, mode = "solo") {
  const normalizedMode = normalizeMode(mode);
  const specs = normalizedMode === "compatibility" ? LOVE_SECRET_ASSEMBLED_COMPAT_SPECS : LOVE_SECRET_ASSEMBLED_SOLO_SPECS;
  return specs.map((spec, index) => {
    const assembled = buildLoveSecretAssembledChapter(spec, index, normalizedMode, base);
    const previous = Array.isArray(chapters) ? chapters[index] || {} : {};
    return {
      ...previous,
      ...assembled,
      metadata: {
        ...(previous?.metadata && typeof previous.metadata === "object" ? previous.metadata : {}),
        assemblyMode: LOVE_SECRET_PDF_CONFIG.generationMode,
        templateVersion: LOVE_SECRET_PDF_CONFIG.templateVersion,
      },
    };
  });
}

function renderLoveSecretAssembledHtml(chapters = [], meta = {}) {
  const mode = normalizeMode(meta?.mode);
  const coverTitle = mode === "compatibility" ? "궁합 비책" : "연애 비책";
  const modeLabel = mode === "compatibility" ? "두 사람 궁합 리포트" : "개인 연애 리포트";
  const coverName = loveSecretSafeDisplayText(meta?.name, "고객");
  const generatedAt = clean(meta?.generatedAt || new Date().toISOString()).slice(0, 10);
  const chapterList = Array.isArray(chapters) ? chapters : [];
  const tocHtml = chapterList.map((chapter) => `<li><span>${escapeLoveSecretHtml(chapter?.chapterNumber || "")}</span><strong>${escapeLoveSecretHtml(chapter?.title || "")}</strong><em>${escapeLoveSecretHtml(chapter?.subtitle || "")}</em></li>`).join("");
  const listBlock = (label, values) => {
    const items = loveSecretCleanList(values, 6).filter((item) => !LOVE_SECRET_ASSEMBLED_MOJIBAKE_RE.test(item));
    if (!items.length) return "";
    return `<div class="note"><strong>${escapeLoveSecretHtml(label)}</strong><ul>${items.map((item) => `<li>${escapeLoveSecretHtml(item)}</li>`).join("")}</ul></div>`;
  };
  const tableBlock = (section) => {
    const rows = Array.isArray(section?.tableRows) ? section.tableRows : [];
    if (!rows.length) return "";
    const headers = Array.isArray(section?.tableHeaders) && section.tableHeaders.length ? section.tableHeaders : ["구분", "흐름", "실천"];
    return `<div class="table-card"><strong>${escapeLoveSecretHtml(section?.tableTitle || "관계 흐름표")}</strong><table><thead><tr>${headers.map((header) => `<th>${escapeLoveSecretHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeLoveSecretHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  };
  const overviewCards = chapterList.slice(0, 6).map((chapter) => {
    const summary = loveSecretCleanList(chapter?.summaryCards, 1)[0] || chapter?.subtitle || "";
    return `<div><strong>${escapeLoveSecretHtml(chapter?.title || "")}</strong><p>${escapeLoveSecretHtml(summary)}</p></div>`;
  }).join("");
  const chapterHtml = chapterList.map((chapter, index) => {
    const summary = loveSecretCleanList(chapter?.summaryCards, 3);
    const sections = (Array.isArray(chapter?.sections) ? chapter.sections : []).map((section) => {
      const paragraphs = clean(section?.body || section?.text).split(/\n{2,}/).filter(Boolean).map((line) => `<p>${escapeLoveSecretHtml(line)}</p>`).join("");
      const notes = [
        listBlock("사주 근거", section?.sajuEvidence),
        listBlock("핵심 포인트", section?.keyPoints),
        listBlock("실천 가이드", section?.actionGuide),
        listBlock("체크리스트", section?.checklist),
        listBlock("주의할 점", section?.caution),
      ].filter(Boolean).join("");
      return `<section class="body-card"><h3>${escapeLoveSecretHtml(section?.title || "")}</h3>${paragraphs}${tableBlock(section)}${notes ? `<div class="notes">${notes}</div>` : ""}</section>`;
    }).join("");
    return `<article class="chapter" style="page-break-before:${index > 0 ? "always" : "auto"}"><header><span class="chapter-no">CHAPTER ${escapeLoveSecretHtml(chapter?.chapterNumber || "")}</span><h2>${escapeLoveSecretHtml(chapter?.title || "")}</h2><p>${escapeLoveSecretHtml(chapter?.subtitle || "")}</p></header><div class="chapter-summary">${summary.map((item) => `<div><strong>요약</strong><p>${escapeLoveSecretHtml(item)}</p></div>`).join("")}</div>${sections}</article>`;
  }).join("");
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${escapeLoveSecretHtml(`${coverName}님의 ${coverTitle}`)}</title><style>@page{size:A4;margin:14mm;}*{box-sizing:border-box;}body{font-family:"Noto Serif KR","Malgun Gothic",serif;margin:0;color:#2a1724;background:#fff9fc;}header.cover{min-height:760px;padding:72px 56px;text-align:center;background:linear-gradient(145deg,#1c0714,#64123b 58%,#1d0714);color:#fff;page-break-after:always;}header.cover .brand{font-size:20px;font-weight:700;}header.cover .service{margin-top:64px;font-size:13px;letter-spacing:.24em;color:#f8d9e8;}header.cover h1{margin:14px 0;font-size:50px;letter-spacing:0;}header.cover .subtitle{font-size:18px;line-height:1.8;color:#ffeaf3;}header.cover .mode{display:inline-block;margin-top:28px;border:1px solid rgba(255,255,255,.42);border-radius:999px;padding:8px 18px;font-size:13px;background:rgba(255,255,255,.1);}header.cover .person{margin-top:54px;font-size:21px;}header.cover .generated{font-size:13px;color:#f6d9e5;margin-top:8px;}nav.toc{page-break-after:always;padding:54px 48px;background:#fff;}nav.toc h2,.overview h2{margin:0 0 22px;color:#64123b;font-size:28px;}nav.toc ol{list-style:none;margin:0;padding:0;}nav.toc li{display:grid;grid-template-columns:48px 1fr;gap:12px;border-bottom:1px solid #efd0dc;padding:12px 0;font-size:14px;}nav.toc span{color:#be185d;font-weight:700;}nav.toc em{grid-column:2;color:#8b6275;font-style:normal;font-size:12px;line-height:1.5;}.overview{page-break-after:always;background:#fff;padding:46px 48px;}.overview-grid,.chapter-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0 22px;}.overview-grid div,.chapter-summary div{border:1px solid #f1c9db;background:#fff7fb;border-radius:6px;padding:12px;}.overview-grid strong,.chapter-summary strong{display:block;color:#8b1d52;font-size:12px;margin-bottom:6px;}.overview-grid p,.chapter-summary p{font-size:12px;line-height:1.6;margin:0;}main{padding:42px 48px;background:#fff;}article.chapter{padding:0 0 24px;}article.chapter header{border-bottom:1px solid #efc2d7;margin:28px 0 20px;padding-bottom:16px;}article.chapter h2{margin:8px 0;color:#64123b;font-size:25px;}article.chapter header p{margin:0;color:#7b4d65;font-size:14px;}article.chapter h3{margin:0 0 10px;color:#8b1d52;font-size:17px;}article.chapter p{line-height:1.88;margin:0 0 13px;font-size:14px;}.chapter-no{color:#be185d;font-size:12px;letter-spacing:.16em;}.body-card{border:1px solid #f1c9db;background:#fffdfd;border-radius:8px;padding:16px 18px;margin:16px 0 20px;page-break-inside:avoid;}.notes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 4px;page-break-inside:avoid;}.note,.table-card{border:1px solid #f1c9db;background:#fff7fb;padding:11px 12px;border-radius:6px;}.note strong,.table-card strong{display:block;margin-bottom:6px;color:#7a1748;font-size:12px;}.note ul{margin:0;padding-left:16px;}.note li{font-size:12px;line-height:1.6;margin:0 0 4px;}table{width:100%;border-collapse:collapse;background:#fff;}th,td{border:1px solid #e8c5d4;padding:7px 8px;text-align:left;font-size:11px;line-height:1.45;}th{background:#fde8f1;color:#7a1748;}.final-page{page-break-before:always;padding:54px 48px;background:#fff;}.final-page h2{margin:0 0 16px;color:#64123b;font-size:28px;}.final-page p{line-height:1.85;font-size:14px;}</style></head><body><header class="cover"><div class="brand">Code Destiny</div><div class="service">PREMIUM LOVE READING</div><h1>${escapeLoveSecretHtml(coverTitle)}</h1><div class="subtitle">사주 구조로 읽는 사랑의 흐름과 실천 전략</div><div class="mode">${escapeLoveSecretHtml(modeLabel)}</div><div class="person">${escapeLoveSecretHtml(coverName)}</div><div class="generated">생성일 ${escapeLoveSecretHtml(generatedAt)}</div></header><nav class="toc"><h2>목차</h2><ol>${tocHtml}</ol></nav><section class="overview"><h2>전체 요약</h2><div class="overview-grid">${overviewCards}</div></section><main>${chapterHtml}</main><section class="final-page"><h2>마지막 조언</h2><p>좋은 사랑은 강한 예언이 아니라 반복 가능한 선택에서 깊어집니다. 이 비책은 사주 계산값을 바탕으로 마음의 속도, 관계의 경계, 현실의 약속을 함께 정리한 상담 원고입니다. 오늘의 작은 조율이 앞으로의 관계를 더 맑고 단단하게 만들어 줍니다.</p></section></body></html>`;
}

function validateLoveSecretPdfCompletionPayload({ pdfReady, chapters, mode } = {}) {
  const expected = normalizeMode(mode) === "compatibility" ? LOVE_SECRET_ASSEMBLED_COMPAT_SPECS.length : LOVE_SECRET_ASSEMBLED_SOLO_SPECS.length;
  const list = Array.isArray(chapters) ? chapters : [];
  const html = clean(pdfReady?.html || "");
  const downloadUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || "");
  const text = `${html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ")}\n${collectLoveSecretText(list)}`;
  const issues = [];
  if (!html.includes("<!DOCTYPE html>")) issues.push("html_shell_missing");
  if (!downloadUrl) issues.push("download_url_missing");
  if (list.length !== expected) issues.push("chapter_count_mismatch");
  if (list.some((chapter) => !Array.isArray(chapter?.sections) || chapter.sections.length < 7)) issues.push("section_count_incomplete");
  if (collectLoveSecretText(list).replace(/\s+/g, "").length < (expected >= 10 ? 30000 : 24000)) issues.push("manuscript_too_short");
  if (LOVE_SECRET_ASSEMBLED_MOJIBAKE_RE.test(text)) issues.push("mojibake_detected");
  if (LOVE_SECRET_ASSEMBLED_FORBIDDEN_RE.test(text)) issues.push("forbidden_terms_detected");
  return {
    ok: issues.length === 0,
    issues,
    chapterCount: list.length,
    expectedChapterCount: expected,
    htmlLength: html.length,
    textLength: collectLoveSecretText(list).replace(/\s+/g, "").length,
  };
}

function renderLoveSecretHtml(chapters = [], meta = {}) {
  const coverTitle = normalizeMode(meta?.mode) === "compatibility" ? "사주 궁합 비책" : "사주 연애 비책";
  const coverName = clean(meta?.name || "사용자");
  const coverBirth = [clean(meta?.birthDate), clean(meta?.birthTime)].filter(Boolean).join(" ");
  const chapterHtml = (Array.isArray(chapters) ? chapters : []).map((chapter, index) => {
    const sections = (Array.isArray(chapter?.sections) ? chapter.sections : []).map((section) => {
      const paragraphs = String(section?.body || section?.text || "")
        .split(/\n{2,}/)
        .map((line) => clean(line))
        .filter(Boolean)
        .map((line) => `<p>${escapeLoveSecretHtml(line)}</p>`)
        .join("");
      return `<section><h3>${escapeLoveSecretHtml(section?.title || "핵심 항목")}</h3>${paragraphs}</section>`;
    }).join("");
    return `<article class="chapter" style="page-break-before:${index > 0 ? "always" : "auto"}"><header><span class="chapter-no">제${index + 1}장</span><h2>${escapeLoveSecretHtml(chapter?.title || "")}</h2><p>${escapeLoveSecretHtml(chapter?.subtitle || "")}</p></header>${sections}</article>`;
  }).join("");

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${escapeLoveSecretHtml(`${coverName}님의 ${coverTitle}`)}</title><style>body{font-family:"Noto Serif KR",serif;margin:0;color:#2d1b26;background:#fff;}main{padding:40px 48px;}header.cover{padding:72px 48px;text-align:center;background:linear-gradient(135deg,#200415,#5b1234 55%,#240616);color:#fff;page-break-after:always;}header.cover h1{margin:0 0 12px;font-size:2.5rem;}header.cover p{margin:6px 0;}article.chapter{padding:40px 0;}article.chapter header{border-bottom:1px solid #f3d0df;margin-bottom:24px;padding-bottom:16px;}article.chapter h2{margin:8px 0 6px;color:#6b0f3d;}article.chapter h3{margin:20px 0 8px;color:#8d1b54;font-size:1.02rem;}article.chapter p{line-height:1.85;margin:0 0 12px;}span.chapter-no{color:#be185d;font-size:.82rem;letter-spacing:.16em;}@page{size:A4;margin:14mm;}</style></head><body><header class="cover"><p>CODE DESTINY PREMIUM</p><h1>${escapeLoveSecretHtml(coverTitle)}</h1><p>${escapeLoveSecretHtml(coverName)}</p><p>${escapeLoveSecretHtml(coverBirth)}</p></header><main>${chapterHtml}</main></body></html>`;
}

function renderLoveSecretHtmlClean(chapters = [], meta = {}) {
  const mode = normalizeMode(meta?.mode);
  const coverTitle = "연애 비책";
  const modeLabel = mode === "compatibility" ? "궁합 모드" : "솔로 모드";
  const rawCoverName = clean(meta?.name || "");
  const coverName = rawCoverName && !/[?�]/.test(rawCoverName) ? rawCoverName : "의뢰인";
  const coverBirth = [clean(meta?.birthDate), clean(meta?.birthTime)].filter(Boolean).join(" ");
  const generatedAt = clean(meta?.generatedAt || new Date().toISOString()).slice(0, 10);
  const eightCharacters = clean(meta?.eightCharacters || "");
  const chapterList = Array.isArray(chapters) ? chapters : [];
  const tocHtml = (Array.isArray(chapters) ? chapters : []).map((chapter, index) => {
    const chapterNo = clean(chapter?.chapterNumber) || String(index + 1).padStart(2, "0");
    return `<li><span>${escapeLoveSecretHtml(chapterNo)}</span><strong>${escapeLoveSecretHtml(chapter?.title || "")}</strong><em>${escapeLoveSecretHtml(chapter?.subtitle || "")}</em></li>`;
  }).join("");
  const listBlock = (label, values) => {
    const items = loveSecretCleanList(values, 8);
    if (!items.length) return "";
    return `<div class="note"><strong>${escapeLoveSecretHtml(label)}</strong><ul>${items.map((item) => `<li>${escapeLoveSecretHtml(item)}</li>`).join("")}</ul></div>`;
  };
  const tableBlock = (section) => {
    const rows = Array.isArray(section?.tableRows) ? section.tableRows : Array.isArray(section?.table?.rows) ? section.table.rows : [];
    if (!rows.length) return "";
    const headers = Array.isArray(section?.tableHeaders) ? section.tableHeaders : Array.isArray(section?.table?.headers) ? section.table.headers : [];
    const headHtml = headers.length
      ? `<thead><tr>${headers.map((header) => `<th>${escapeLoveSecretHtml(header)}</th>`).join("")}</tr></thead>`
      : "";
    const bodyHtml = `<tbody>${rows.map((row) => {
      const cells = Array.isArray(row) ? row : [row?.month || row?.period || row?.label, row?.flow || row?.topic, row?.advice || row?.action].filter(Boolean);
      return `<tr>${cells.map((cell) => `<td>${escapeLoveSecretHtml(cell)}</td>`).join("")}</tr>`;
    }).join("")}</tbody>`;
    return `<div class="table-card"><strong>${escapeLoveSecretHtml(section?.tableTitle || section?.table?.title || "연애 흐름 표")}</strong><table>${headHtml}${bodyHtml}</table></div>`;
  };
  const premiumTable = (title, headers, rows) => {
    const safeRows = Array.isArray(rows) ? rows.filter((row) => Array.isArray(row) && row.some((cell) => clean(cell))) : [];
    if (!safeRows.length) return "";
    return `<section class="premium-table"><h2>${escapeLoveSecretHtml(title)}</h2><table><thead><tr>${headers.map((header) => `<th>${escapeLoveSecretHtml(header)}</th>`).join("")}</tr></thead><tbody>${safeRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeLoveSecretHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`;
  };
  const collectTable = (type) => {
    for (const chapter of chapterList) {
      for (const section of Array.isArray(chapter?.sections) ? chapter.sections : []) {
        if (section?.tableType === type && Array.isArray(section?.tableRows) && section.tableRows.length) {
          return {
            title: clean(section?.tableTitle),
            headers: Array.isArray(section?.tableHeaders) ? section.tableHeaders : [],
            rows: section.tableRows,
          };
        }
      }
    }
    return { title: "", headers: [], rows: [] };
  };
  const firstChapter = chapterList[0] || {};
  const firstSection = Array.isArray(firstChapter?.sections) ? firstChapter.sections[0] || {} : {};
  const relationshipSummaryRows = loveSecretCleanList(firstChapter?.summaryCards?.length ? firstChapter.summaryCards : firstSection?.keyPoints, 3)
    .map((item, index) => [`${index + 1}`, item]);
  const expressionRows = [
    ["강하게 드러나는 결", loveSecretCleanList(firstSection?.keyPoints, 3)[0] || "관계에서 먼저 살아나는 매력과 반응을 확인합니다."],
    ["보완할 결", loveSecretCleanList(firstSection?.actionGuide, 3)[0] || "부족한 기운은 작은 실천과 대화 리듬으로 채웁니다."],
    ["주의할 결", loveSecretCleanList(firstSection?.caution, 3)[0] || "감정이 커질수록 결론보다 조율 순서를 먼저 둡니다."],
  ];
  const tenGodRows = loveSecretCleanList(firstSection?.actionGuide, 3).map((item, index) => [`관계 욕구 ${index + 1}`, item]);
  const compatibilityRows = mode === "compatibility"
    ? [
        ["A", "핵심 성향", clean(firstSection?.personAView) || "본인의 표현 방식과 감정 속도를 확인합니다."],
        ["B", "핵심 성향", clean(firstSection?.personBView) || "상대의 안정감과 반응 방식을 함께 봅니다."],
        ["관계", "조율 지점", clean(firstSection?.relationshipDynamic) || "두 사람의 속도 차이를 생활 리듬으로 맞춥니다."],
      ]
    : [];
  const monthlyTable = collectTable("monthly-love-flow");
  const routineTable = collectTable("thirty-day-routine");
  const overviewHtml = [
    premiumTable("연애 성향 요약표", ["번호", "핵심 요약"], relationshipSummaryRows),
    premiumTable("오행 기반 애정 표현표", ["구분", "해석"], expressionRows),
    premiumTable("십성 기반 관계 욕구표", ["구분", "실천 방향"], tenGodRows),
    mode === "compatibility" ? premiumTable("두 사람 비교표", ["대상", "항목", "해석"], compatibilityRows) : "",
    premiumTable(monthlyTable.title || "월별 연애운 표", monthlyTable.headers.length ? monthlyTable.headers : ["월", "관계 흐름", "실천 조언"], monthlyTable.rows),
    premiumTable(routineTable.title || "30일 연애 루틴표", routineTable.headers.length ? routineTable.headers : ["기간", "주제", "실천법"], routineTable.rows),
  ].filter(Boolean).join("");
  const chapterHtml = chapterList.map((chapter, index) => {
    const sections = (Array.isArray(chapter?.sections) ? chapter.sections : []).map((section) => {
      const paragraphs = String(section?.body || section?.text || "")
        .split(/\n{2,}/)
        .map((line) => clean(line))
        .filter(Boolean)
        .map((line) => `<p>${escapeLoveSecretHtml(line)}</p>`)
        .join("");
      const notes = [
        section?.personAView ? listBlock("A 관점", [section.personAView]) : "",
        section?.personBView ? listBlock("B 관점", [section.personBView]) : "",
        section?.relationshipDynamic ? listBlock("관계 역학", [section.relationshipDynamic]) : "",
        section?.compatibilityStrategy ? listBlock("궁합 전략", [section.compatibilityStrategy]) : "",
        listBlock("사주 근거", section?.sajuEvidence),
        listBlock("핵심 포인트", section?.keyPoints),
        listBlock("실천 가이드", section?.actionGuide),
        listBlock("체크리스트", section?.checklist),
        listBlock("주의점", section?.caution),
      ].filter(Boolean).join("");
      const table = tableBlock(section);
      return `<section class="body-card"><h3>${escapeLoveSecretHtml(section?.title || "연애 항목")}</h3>${paragraphs}${table}${notes ? `<div class="notes">${notes}</div>` : ""}</section>`;
    }).join("");
    const summary = loveSecretCleanList(chapter?.summaryCards, 3);
    const quote = summary[0] || chapter?.subtitle || "사랑은 단정이 아니라 반복되는 선택의 결에서 선명해집니다.";
    const chapterNo = clean(chapter?.chapterNumber) || String(index + 1).padStart(2, "0");
    const chapterCover = `<section class="chapter-cover"><div class="moon-mark">Code</div><span>CHAPTER ${escapeLoveSecretHtml(chapterNo)}</span><h2>${escapeLoveSecretHtml(chapter?.title || "")}</h2><blockquote>${escapeLoveSecretHtml(quote)}</blockquote></section>`;
    const summaryCards = summary.length ? `<div class="chapter-summary">${summary.map((item) => `<div><strong>핵심 요약</strong><p>${escapeLoveSecretHtml(item)}</p></div>`).join("")}</div>` : "";
    return `<article class="chapter" style="page-break-before:${index > 0 ? "always" : "auto"}">${chapterCover}<header><span class="chapter-no">${escapeLoveSecretHtml(chapterNo)}</span><h2>${escapeLoveSecretHtml(chapter?.title || "")}</h2><p>${escapeLoveSecretHtml(chapter?.subtitle || "")}</p></header>${summaryCards}${sections}</article>`;
  }).join("");
  const finalSummary = loveSecretCleanList(chapterList.flatMap((chapter) => chapter?.summaryCards || []), 5);
  const finalRoutineRows = routineTable.rows && routineTable.rows.length ? routineTable.rows : [];
  const finalPage = `<section class="final-page"><h2>전체 요약</h2><div class="final-grid">${finalSummary.map((item) => `<div><strong>요약</strong><p>${escapeLoveSecretHtml(item)}</p></div>`).join("")}</div>${premiumTable("30일 실천 루틴", routineTable.headers.length ? routineTable.headers : ["기간", "주제", "실천법"], finalRoutineRows)}<div class="revisit"><strong>재열람 안내</strong><p>결제 완료 후 생성된 연애 비책 PDF는 보관된 다운로드 링크와 재열람 화면에서 다시 확인할 수 있습니다. 저장된 원고는 같은 사주 계산값을 기준으로 하며, 다시 열람해도 외부 LLM 호출 없이 제공됩니다.</p></div></section>`;

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${escapeLoveSecretHtml(`${coverName}님의 ${coverTitle}`)}</title><style>@page{size:A4;margin:14mm;}*{box-sizing:border-box;}body{font-family:"Noto Serif KR","Malgun Gothic",serif;margin:0;color:#2a1724;background:#fff9fc;}main{padding:42px 48px;background:#fff;}header.cover{min-height:760px;box-sizing:border-box;padding:70px 56px;text-align:center;background:radial-gradient(circle at 50% 12%,rgba(255,239,196,.34),transparent 18%),linear-gradient(145deg,#1c0714,#5e1539 58%,#1c0714);color:#fff;page-break-after:always;}header.cover .brand{font-size:20px;letter-spacing:.04em;font-weight:700;}header.cover .service{margin-top:68px;font-size:13px;letter-spacing:.28em;color:#f8d9e8;}header.cover h1{margin:14px 0 14px;font-size:50px;font-weight:700;letter-spacing:0;}header.cover .subtitle{font-size:18px;line-height:1.8;color:#ffeaf3;}header.cover .mode{display:inline-block;margin-top:28px;border:1px solid rgba(255,255,255,.42);border-radius:999px;padding:8px 18px;font-size:13px;background:rgba(255,255,255,.1);}header.cover .person{margin-top:54px;font-size:21px;}header.cover .birth,header.cover .generated,header.cover .eight{font-size:13px;color:#f6d9e5;margin-top:8px;}nav.toc{page-break-after:always;padding:54px 48px;background:#fff;}nav.toc h2,.premium-table h2,.final-page h2{margin:0 0 22px;color:#64123b;font-size:28px;}nav.toc ol{list-style:none;margin:0;padding:0;}nav.toc li{display:grid;grid-template-columns:44px 1fr;gap:12px;border-bottom:1px solid #efd0dc;padding:12px 0;font-size:14px;}nav.toc span{color:#be185d;font-weight:700;}nav.toc em{grid-column:2;color:#8b6275;font-style:normal;font-size:12px;line-height:1.5;}.overview{page-break-after:always;background:#fff;padding:42px 48px;}.premium-table{page-break-inside:avoid;margin:0 0 24px;}.premium-table h2{font-size:20px;margin-bottom:10px;}article.chapter{padding:0 0 24px;}article.chapter header{border-bottom:1px solid #efc2d7;margin:28px 0 20px;padding-bottom:16px;}article.chapter h2{margin:8px 0;color:#64123b;font-size:25px;}article.chapter header p{margin:0;color:#7b4d65;font-size:14px;}.chapter-cover{min-height:420px;page-break-after:always;padding:86px 54px;background:linear-gradient(145deg,#fff7fb,#f9e7ef);border:1px solid #f0cbda;text-align:center;}.chapter-cover .moon-mark{margin:0 auto 48px;width:76px;height:76px;border-radius:50%;border:1px solid #c894a8;display:flex;align-items:center;justify-content:center;color:#64123b;background:#fff;}.chapter-cover span{font-size:12px;letter-spacing:.24em;color:#be185d;}.chapter-cover h2{font-size:31px;margin:18px 0 22px;color:#64123b;}.chapter-cover blockquote{margin:0 auto;max-width:520px;color:#765064;font-size:16px;line-height:1.8;}.chapter-summary,.final-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0 22px;}.chapter-summary div,.final-grid div{border:1px solid #f1c9db;background:#fff7fb;border-radius:6px;padding:12px;}.chapter-summary strong,.final-grid strong{display:block;color:#8b1d52;font-size:12px;margin-bottom:6px;}.chapter-summary p,.final-grid p{font-size:12px;line-height:1.6;margin:0;}article.chapter h3{margin:0 0 10px;color:#8b1d52;font-size:17px;}article.chapter p{line-height:1.88;margin:0 0 13px;font-size:14px;}span.chapter-no{color:#be185d;font-size:12px;letter-spacing:.16em;}.body-card{border:1px solid #f1c9db;background:#fffdfd;border-radius:8px;padding:16px 18px;margin:16px 0 20px;page-break-inside:avoid;}.notes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 4px;page-break-inside:avoid;}.note,.table-card{border:1px solid #f1c9db;background:#fff7fb;padding:11px 12px;border-radius:6px;}.note strong,.table-card strong{display:block;margin-bottom:6px;color:#7a1748;font-size:12px;}.note ul{margin:0;padding-left:16px;}.note li{font-size:12px;line-height:1.6;margin:0 0 4px;}.table-card{margin:16px 0;page-break-inside:avoid;}table{width:100%;border-collapse:collapse;background:#fff;}th,td{border:1px solid #e8c5d4;padding:7px 8px;text-align:left;font-size:11px;line-height:1.45;}th{background:#fde8f1;color:#7a1748;}.final-page{page-break-before:always;padding:54px 48px;background:#fff;}.revisit{margin-top:20px;border:1px solid #e8c5d4;background:#fff7fb;border-radius:8px;padding:16px;}.revisit strong{color:#64123b;}.revisit p{font-size:13px;line-height:1.8;margin:8px 0 0;}</style></head><body><header class="cover"><div class="brand">Code</div><div class="service">PREMIUM LOVE READING</div><h1>${escapeLoveSecretHtml(coverTitle)}</h1><div class="subtitle">나의 사주 구조로 읽는 사랑의 패턴</div><div class="mode">${escapeLoveSecretHtml(modeLabel)}</div><div class="person">${escapeLoveSecretHtml(coverName)}</div><div class="birth">${escapeLoveSecretHtml(coverBirth || "익명 프로필")}</div><div class="generated">생성일 ${escapeLoveSecretHtml(generatedAt)}</div>${eightCharacters ? `<div class="eight">${escapeLoveSecretHtml(eightCharacters)}</div>` : ""}</header><nav class="toc"><h2>목차</h2><ol>${tocHtml}</ol></nav><section class="overview">${overviewHtml}</section><main>${chapterHtml}</main>${finalPage}</body></html>`;
}

function buildLoveSecretArchiveUrl(requestOrOrigin, reportId) {
  const origin = typeof requestOrOrigin === "string"
    ? clean(requestOrOrigin).replace(/\/+$/, "")
    : new URL(requestOrOrigin.url).origin;
  if (!origin) return "";
  return `${origin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
}

function buildLoveSecretArchiveHtmlUrl(requestOrOrigin, reportId) {
  const archiveUrl = buildLoveSecretArchiveUrl(requestOrOrigin, reportId);
  return archiveUrl ? `${archiveUrl}?format=html` : "";
}

function buildLoveSecretArchivePdfUrl(requestOrOrigin, reportId) {
  const archiveUrl = buildLoveSecretArchiveUrl(requestOrOrigin, reportId);
  return archiveUrl ? `${archiveUrl}?format=pdf` : "";
}

function buildLoveSecretPdfReady(requestOrOrigin, reportId, chapters, base, mode) {
  const archiveUrl = buildLoveSecretArchiveUrl(requestOrOrigin, reportId);
  const archiveHtmlUrl = buildLoveSecretArchiveHtmlUrl(requestOrOrigin, reportId);
  const archivePdfUrl = buildLoveSecretArchivePdfUrl(requestOrOrigin, reportId);
  const normalizedMode = normalizeMode(mode);
  const selfName = clean(base?.user?.name || "사용자");
  const partnerName = clean(base?.partner?.user?.name || "상대");
  const displayName = normalizedMode === "compatibility" ? `${selfName} × ${partnerName}` : selfName;
  const title = "연애 비책";
  const generatedAt = new Date().toISOString();
  const chapterCount = Array.isArray(chapters) ? chapters.length : 0;
  const sectionCount = Array.isArray(chapters)
    ? chapters.reduce((total, chapter) => total + (Array.isArray(chapter?.sections) ? chapter.sections.length : 0), 0)
    : 0;
  const documentUrl = archivePdfUrl || archiveUrl;
  const selfEightCharacters = ["year", "month", "day", "hour"].map((key) => loveSecretPillarRaw(base?.pillars?.[key])).filter(Boolean).join(" ");
  const partnerEightCharacters = ["year", "month", "day", "hour"].map((key) => loveSecretPillarRaw(base?.partner?.pillars?.[key])).filter(Boolean).join(" ");
  const targetYear = 2026;
  return {
    reportId: clean(reportId),
    mode: normalizedMode,
    title,
    displayName,
    chapterCount,
    sectionCount,
    generatedAt,
    html: renderLoveSecretHtmlClean(chapters, {
      mode: normalizedMode,
      name: displayName,
      birthDate: clean(base?.user?.birthDate || ""),
      birthTime: clean(base?.user?.birthTime || ""),
      generatedAt,
      eightCharacters: normalizedMode === "compatibility"
        ? [`A 사주 8글자 ${selfEightCharacters}`, `B 사주 8글자 ${partnerEightCharacters}`, `궁합 분석 기준 연도 ${targetYear}`].filter(Boolean).join(" / ")
        : selfEightCharacters,
    }),
    pdfUrl: documentUrl,
    htmlUrl: archiveHtmlUrl || archiveUrl,
    downloadUrl: documentUrl,
    documentUrl,
    archiveUrl,
    storageKey: `premium-archive:love-secret:${reportId}`,
    mimeType: "application/pdf",
    contentType: "application/pdf",
    renderFormat: "pdf-archive",
  };
}

function buildLoveSecretPdfReadyAssembled(requestOrOrigin, reportId, chapters, base, mode) {
  const archiveUrl = buildLoveSecretArchiveUrl(requestOrOrigin, reportId);
  const archiveHtmlUrl = buildLoveSecretArchiveHtmlUrl(requestOrOrigin, reportId);
  const archivePdfUrl = buildLoveSecretArchivePdfUrl(requestOrOrigin, reportId);
  const normalizedMode = normalizeMode(mode);
  const assembledChapters = buildLoveSecretAssembledChapters(chapters, base, normalizedMode);
  const selfName = loveSecretSafeDisplayText(base?.user?.name, "고객");
  const partnerName = loveSecretSafeDisplayText(base?.partner?.user?.name, "상대");
  const displayName = normalizedMode === "compatibility" ? `${selfName} × ${partnerName}` : selfName;
  const title = normalizedMode === "compatibility" ? "궁합 비책" : "연애 비책";
  const generatedAt = new Date().toISOString();
  const documentUrl = archivePdfUrl || archiveUrl;
  return {
    reportId: clean(reportId),
    mode: normalizedMode,
    title,
    displayName,
    chapterCount: assembledChapters.length,
    sectionCount: assembledChapters.reduce((total, chapter) => total + (Array.isArray(chapter?.sections) ? chapter.sections.length : 0), 0),
    generatedAt,
    html: renderLoveSecretAssembledHtml(assembledChapters, {
      mode: normalizedMode,
      name: displayName,
      generatedAt,
    }),
    pdfUrl: documentUrl,
    htmlUrl: archiveHtmlUrl || archiveUrl,
    downloadUrl: documentUrl,
    documentUrl,
    archiveUrl,
    storageKey: `premium-archive:love-secret:${reportId}`,
    mimeType: "application/pdf",
    contentType: "application/pdf",
    renderFormat: "pdf-archive",
  };
}

function buildLoveSecretSuccessPayload({ featureKey, mode, sessionId, reportId, chapterCount, fallbackUsed, manuscriptSource, chapters, pdfReady, pdfCompletionValidation, loveSecretMasterJson, masterJsonValidation, loveSecretFacts, loveSecretChapterPlans, llmEnhancement }) {
  const storedUrl = clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl);
  if (!storedUrl) {
    const error = new Error("LOVE_SECRET_REPORT_URL_MISSING");
    error.code = "LOVE_SECRET_REPORT_URL_MISSING";
    throw error;
  }

  return {
    ok: true,
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    featureKey,
    mode,
    reportId,
    sessionId: clean(sessionId || ""),
    chapterCount,
    fallbackUsed: Boolean(fallbackUsed),
    manuscriptSource,
    pdfReady,
    pdfCompletionValidation: pdfCompletionValidation && typeof pdfCompletionValidation === "object" ? pdfCompletionValidation : undefined,
    loveSecretMasterJson: loveSecretMasterJson && typeof loveSecretMasterJson === "object" ? loveSecretMasterJson : undefined,
    masterJsonValidation: masterJsonValidation && typeof masterJsonValidation === "object" ? masterJsonValidation : undefined,
    loveSecretFacts: loveSecretFacts && typeof loveSecretFacts === "object" ? loveSecretFacts : undefined,
    loveSecretChapterPlans: summarizeLoveSecretChapterPlans(loveSecretChapterPlans),
    llmEnhancement: llmEnhancement && typeof llmEnhancement === "object" ? llmEnhancement : undefined,
    pdfUrl: storedUrl,
    htmlUrl: clean(pdfReady?.htmlUrl || storedUrl),
    downloadUrl: clean(pdfReady?.downloadUrl || storedUrl),
    canReopen: true,
    canDownload: true,
    chapters,
  };
}

function cloneLoveSecretCachedPayload(payload = {}, overrides = {}) {
  const cloned = safeLoveSecretClone(payload);
  return {
    ...cloned,
    ...overrides,
    ok: true,
    status: "completed",
    serverStatus: "completed",
    fromCache: true,
    cacheHit: true,
    duplicate: true,
  };
}

async function findLoveSecretCachedJob(env, userId, cacheKey) {
  const key = clean(cacheKey);
  if (!key) return null;
  const memory = getLoveSecretPdfMemoryCache(key);
  if (memory?.payload) {
    return {
      source: "memory",
      payload: cloneLoveSecretCachedPayload(memory.payload, {
        cacheKey: key,
        cachedAt: memory.cachedAt,
      }),
    };
  }
  try {
    const coll = await getLoveSecretJobsCollection(env);
    const cachedJob = await coll.findOne({
      service: LOVE_SECRET_SERVICE_KEY,
      userId: String(userId || ""),
      cacheKey: key,
      status: "completed",
      result: { $type: "object" },
    }, { sort: { completedAt: -1, updatedAt: -1, createdAt: -1 } });
    if (cachedJob?.result) {
      setLoveSecretPdfMemoryCache(key, { payload: cachedJob.result });
      return {
        source: "db",
        job: cachedJob,
        payload: cloneLoveSecretCachedPayload(cachedJob.result, {
          cacheKey: key,
          cachedAt: cachedJob.completedAt || cachedJob.updatedAt || cachedJob.createdAt || null,
        }),
      };
    }
  } catch (error) {
    if (!isLikelyDbUnavailableError(error)) {
      console.warn("[love-secret][pdf-cache-lookup-failed]", clean(error?.message || error));
    }
  }
  return null;
}

async function findLoveSecretReusableExecution(env, userId, executionCtx = {}, fallback = {}) {
  try {
    await connectDb(getLoveSecretFastDbEnv(env));
    const filters = [];
    const executionKey = clean(executionCtx.executionKey);
    const sessionId = clean(executionCtx.sessionId || fallback.sessionId);
    const reportId = clean(executionCtx.reportId || fallback.reportId);
    const paymentSessionId = clean(executionCtx.paymentSessionId);
    if (executionKey) filters.push({ executionKey });
    if (sessionId) filters.push({ sessionId });
    if (reportId) filters.push({ reportId });
    if (paymentSessionId) filters.push({ paymentSessionId });
    if (!filters.length) return null;
    return await ServiceExecutionTransaction.findOne({
      userId,
      reportType: "loveSecret",
      $or: filters,
    }).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();
  } catch (error) {
    console.warn("[love-secret][reusable-execution-lookup-failed]", clean(error?.message || error));
    return null;
  }
}

function buildLoveSecretReusableExecutionResponse(doc = {}, fallback = {}) {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : {};
  const payload = archive?.payload && typeof archive.payload === "object" ? archive.payload : {};
  const pdfReady = archive.pdfReady || metadata.pdfReady || payload.pdfReady || null;
  const storedUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || archive.downloadUrl || archive.pdfUrl || payload.downloadUrl || payload.pdfUrl);
  const effectivePdfReady = pdfReady || (storedUrl ? {
    reportId: clean(doc.reportId || archive.reportId || metadata.reportId || fallback.reportId),
    pdfUrl: storedUrl,
    downloadUrl: storedUrl,
    htmlUrl: clean(archive.htmlUrl || payload.htmlUrl),
  } : null);
  const mode = normalizeMode(archive.mode || payload.mode || fallback.mode);
  const reportId = clean(doc.reportId || archive.reportId || metadata.reportId || fallback.reportId);
  const sessionId = clean(doc.sessionId || metadata.sessionId || fallback.sessionId);
  const isCompleted = clean(doc.status) === "success" && clean(doc.premiumStatus) === "completed";
  const isFailed = clean(doc.status) === "failed" || clean(doc.premiumStatus) === "failed";

  if (isCompleted && storedUrl) {
    return {
      status: 200,
      payload: buildLoveSecretSuccessPayload({
        featureKey: clean(doc.featureKey || metadata.featureKey || fallback.featureKey),
        mode,
        sessionId,
        reportId,
        chapterCount: Number(archive.chapterCount || payload.chapterCount || (Array.isArray(archive.chapters) ? archive.chapters.length : 0)),
        fallbackUsed: Boolean(archive.fallbackUsed || payload.fallbackUsed),
        manuscriptSource: clean(archive.manuscriptSource || metadata.manuscriptSource || fallback.manuscriptSource || LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL),
        chapters: Array.isArray(archive.chapters) ? archive.chapters : [],
        pdfReady: effectivePdfReady,
        loveSecretMasterJson: payload.loveSecretMasterJson,
        masterJsonValidation: payload.masterJsonValidation,
        loveSecretFacts: payload.loveSecretFacts,
        loveSecretChapterPlans: payload.loveSecretChapterPlans,
        llmEnhancement: payload.llmEnhancement,
      }),
    };
  }

  if (isFailed) {
    return {
      status: 409,
      payload: {
        ok: false,
        serviceKey: LOVE_SECRET_SERVICE_KEY,
        code: "LOVE_SECRET_PREVIOUS_GENERATION_FAILED",
        message: "이전 연애비책 PDF 생성이 실패했습니다. 새 생성 요청으로 다시 시도해 주세요.",
        debugSafe: { reportId, sessionId, previousStatus: clean(doc.status), previousPremiumStatus: clean(doc.premiumStatus) },
      },
    };
  }

  if (clean(doc.status) === "pending" || clean(doc.premiumStatus) === "generating") {
    return {
      status: 202,
      payload: {
        ok: true,
        accepted: true,
        duplicate: true,
        serviceKey: LOVE_SECRET_SERVICE_KEY,
        mode,
        reportId,
        sessionId,
        status: "running",
        pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
      },
    };
  }

  return null;
}

async function acquireLoveSecretExecutionLease(env, userId, executionCtx = {}) {
  const executionKey = clean(executionCtx.executionKey);
  if (!executionKey) return { ok: true };
  try {
    await connectDb(getLoveSecretFastDbEnv(env));
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + Math.max(LOVE_SECRET_LOCK_TTL_MS, Number(executionCtx.timeoutSeconds || 1800) * 1000));
    const token = `${executionKey}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    const doc = await ServiceExecutionTransaction.findOneAndUpdate(
      {
        userId,
        executionKey,
        status: "pending",
        $or: [
          { "lock.until": { $lte: now } },
          { "lock.until": null },
          { "lock.until": { $exists: false } },
          { "lock.token": "" },
        ],
      },
      {
        $set: {
          "lock.token": token,
          "lock.until": leaseUntil,
          "lock.acquiredAt": now,
          heartbeatAt: now,
        },
      },
      { returnDocument: "after" },
    ).lean();
    return { ok: Boolean(doc), doc, token };
  } catch (error) {
    console.warn("[love-secret][execution-lease-acquire-failed]", clean(error?.message || error));
    return { ok: false, error };
  }
}

function toObjectIdOrNull(value) {
  const raw = clean(value);
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

async function getLoveSecretJobsCollection(env) {
  await connectDb(getLoveSecretFastDbEnv(env));
  return mongoose.connection.collection(LOVE_SECRET_JOB_COLLECTION);
}

function toPublicJobPayload(job = {}) {
  const status = clean(job?.status) || "pending";
  const chapterCount = Number(job?.chapterCount || 0);
  const completedChapters = Number(job?.completedChapters || 0);
  return {
    jobId: String(job?._id || ""),
    reportId: clean(job?.reportId),
    mode: normalizeMode(job?.mode),
    status,
    chapterCount,
    completedChapters,
    progress: chapterCount > 0 ? Math.max(0, Math.min(100, Math.round((completedChapters / chapterCount) * 100))) : 0,
    message: clean(job?.message),
    errorMessage: clean(job?.errorMessage),
    resultReady: status === "completed",
    failed: status === "failed",
    updatedAt: job?.updatedAt || null,
    createdAt: job?.createdAt || null,
  };
}

async function runLoveSecretJob(env, jobId) {
  const coll = await getLoveSecretJobsCollection(env);
  const _id = toObjectIdOrNull(jobId);
  if (!_id) return;

  const job = await coll.findOne({ _id });
  if (!job) return;

   const sessionId = clean(job?.requestBody?.sessionId || job?.requestBody?.reportSessionId);
  const execRaw = job?.execution && typeof job.execution === "object" ? job.execution : {};
  const executionCtx = {
    executionKey: clean(execRaw.executionKey, 120),
    sessionId: clean(execRaw.sessionId || sessionId, 180),
    reportId: clean(execRaw.reportId || job?.reportId, 120),
    metadata: execRaw.metadata && typeof execRaw.metadata === "object" ? execRaw.metadata : null,
  };

  await coll.updateOne(
    { _id },
    {
      $set: {
        status: "processing",
        stage: "local_calculation",
        message: "연애 사주 신호를 계산하고 있습니다.",
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  try {
    const mode = normalizeMode(job?.mode || "solo");
    console.info("[LoveBookPremiumPDF][RequestReceived]", {
      mode,
      hasSessionId: Boolean(sessionId),
      hasReportId: Boolean(clean(job?.reportId)),
    });
    console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });

    const base = normalizeSajuBase(job?.requestBody || {});
    const safeBirthLog = {
      mode,
      hasSelfBirthDate: Boolean(clean(base?.user?.birthDate)),
      hasSelfBirthTime: Boolean(clean(base?.user?.birthTime)),
      hasPartnerBirthDate: /생년월일\s*:\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(clean(job?.requestBody?.partnerData)),
      hasPartnerBirthTime: /출생\s*시각\s*:\s*/.test(clean(job?.requestBody?.partnerData)),
    };
    console.info("[LoveBookPremiumPDF][BirthInputValidated]", safeBirthLog);

    const partnerValid = validatePartnerMinimumSaju(base, mode);
    if (!partnerValid.ok) {
      throw new Error(`MISSING_PARTNER_SAJU:${partnerValid.missing.join(",")}`);
    }

    const config = safeModeChapterConfig(mode);
    const expectedChapterCount = Number(config.totalChapters || 0);

    console.info("[LoveBookPremiumPDF][LocalCalculationStart]", { mode });
    console.info("[LoveBookPremiumPDF][LocalCalculationSuccess]", {
      selfDayMasterResolved: Boolean(clean(base?.core?.dayMaster)),
      romanceStarsResolved: Boolean(base?.specialStars && typeof base.specialStars === "object"),
    });

    await coll.updateOne(
      { _id },
      {
        $set: {
          stage: "local_draft_building",
          message: ["solo", "compatibility"].includes(normalizeMode(mode)) ? "연애 비책 원고를 순차 생성하고 있습니다." : "모드별 로컬 원고를 생성하고 있습니다.",
          updatedAt: new Date(),
        },
      },
    );

    console.info("[LoveBookPremiumPDF][LocalDraftBuildStart]", { chapterCount: expectedChapterCount, mode });
    const {
      chapters: localChapters,
      totalChapters,
      manuscriptSource: generatedSource,
      loveSecretMasterJson,
      masterJsonValidation,
      loveSecretFacts,
      loveSecretChapterPlans,
      llmEnhancement,
    } = await buildLoveSecretChapters(env, {
      base,
      mode,
      config,
      body: job?.requestBody || {},
      requestId: clean(job?.requestBody?.requestId || job?.reportId || String(_id)),
      onProgress: async ({ completed, chapterNo, totalChapters: progressTotal }) => {
        console.info("[LoveBookPremiumPDF][LocalDraftChapterDone]", {
          chapter: chapterNo,
          completed,
        });
        await coll.updateOne(
          { _id },
          {
            $set: {
              status: "processing",
              stage: completed >= progressTotal ? "manuscript_quality_validation" : "local_draft_building",
              message: completed >= progressTotal
                ? "원고 품질을 검증하고 있습니다."
                : `연애 비책 ${completed}/${progressTotal} 챕터 생성 중...`,
              completedChapters: Math.max(0, Math.min(progressTotal, completed)),
              updatedAt: new Date(),
            },
          },
        );
      },
    });

    console.info("[LoveBookPremiumPDF][LocalDraftBuildSuccess]", { chapterCount: localChapters.length });

    const localValidation = validateLoveSecretManuscript({
      mode,
      chapters: localChapters,
      config,
      minChapterChars: Number(config?.chapterMinDefault || 2000),
    });
    if (!localValidation.ok) {
      throw new Error(`LOCAL_DRAFT_INVALID: expected=${localValidation.expected}, actual=${localValidation.actual}, totalChars=${localValidation.totalChars}`);
    }
    console.info("[LoveBookPremiumPDF][LocalQualityValidated]", {
      chapterCount: localValidation.actual,
      totalLength: localValidation.totalChars,
      forbiddenTermsCount: localValidation.forbiddenTermsCount,
      repetitionScore: localValidation.repetitionScore,
    });

    await coll.updateOne(
      { _id },
      {
        $set: {
          stage: "local_finalize",
          message: "로컬 상담문 최종 점검을 진행하고 있습니다.",
          localValidation,
          localManuscript: {
            mode,
            chapterCount: localChapters.length,
            chapters: localChapters,
            source: clean(generatedSource) || LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
          },
          updatedAt: new Date(),
        },
      },
    );

    let fallbackUsed = false;
    let manuscriptSource = clean(generatedSource) || LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
    const preparedFinal = prepareLoveSecretFinalChapters({
      candidateChapters: localChapters.map((chapter) => ({ ...chapter, source: manuscriptSource })),
      localChapters,
      mode,
      config,
      base,
    });
    let finalChapters = preparedFinal.chapters;
    const validatedFinal = preparedFinal.validation;
    if (!validatedFinal.ok) {
      console.error("[LoveBookPremiumPDF][FinalValidationFailed]", {
        finalValidation: validatedFinal,
        localValidation: preparedFinal.localValidation || null,
      });
      throw new Error("FINAL_MANUSCRIPT_INVALID");
    }
    if (preparedFinal.recovered) {
      manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
      console.info("[LoveBookPremiumPDF][FinalLocalAssemblyNormalized]", {
        mode,
        reason: preparedFinal.recoveryReason,
        previousIssues: preparedFinal.previousValidation?.topicCoverageIssues || preparedFinal.previousValidation?.tooShortChapterIndexes || [],
      });
    }
    console.info("[LoveBookPremiumPDF][FinalManuscriptValidated]", {
      mode,
      chapterCount: validatedFinal.actual,
      totalLength: validatedFinal.totalChars,
      forbiddenTermsCount: validatedFinal.forbiddenTermsCount,
      repetitionScore: validatedFinal.repetitionScore,
      manuscriptSource,
    });

    console.info("[LoveBookPremiumPDF][PdfRenderStart]", { chapterCount: finalChapters.length, fallbackUsed, manuscriptSource });

    const reportId = clean(job?.reportId || executionCtx.reportId || `love-secret-${Date.now().toString(36)}`);
    finalChapters = buildLoveSecretAssembledChapters(finalChapters, base, mode);
    manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
    const pdfReady = buildLoveSecretPdfReadyAssembled(clean(job?.requestOrigin || ""), reportId, finalChapters, base, mode);
    const pdfCompletionValidation = validateLoveSecretPdfCompletionPayload({ pdfReady, chapters: finalChapters, mode });
    if (!pdfCompletionValidation.ok) {
      throw Object.assign(new Error("연애 비책 PDF 완료 검증을 통과하지 못했습니다. 원고를 보강한 뒤 다시 생성해 주세요."), {
        code: "LOVE_SECRET_PDF_COMPLETION_INVALID",
        status: 422,
      });
    }
    const pdfCacheKey = clean(job?.cacheKey) || buildLoveSecretPdfCacheKey(base, mode, job?.requestBody || {});
    const successResult = buildLoveSecretSuccessPayload({
      featureKey: clean(job?.featureKey) || toFeatureKey(mode),
      mode,
      sessionId,
      reportId,
      chapterCount: totalChapters,
      fallbackUsed,
      manuscriptSource,
      chapters: finalChapters,
      pdfReady,
      pdfCompletionValidation,
      loveSecretMasterJson,
      masterJsonValidation,
      loveSecretFacts,
      loveSecretChapterPlans,
      llmEnhancement,
    });

    await coll.updateOne(
      { _id },
      {
        $set: {
          status: "completed",
          cacheKey: pdfCacheKey,
          cacheVersion: LOVE_SECRET_PDF_CONFIG.templateVersion,
          stage: "completed",
          message: "연애 비책 PDF가 준비되었습니다.",
          completedChapters: totalChapters,
          fallbackUsed,
          manuscriptSource,
          result: successResult,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
    setLoveSecretPdfMemoryCache(pdfCacheKey, { payload: successResult });
    console.info("[LoveBookPremiumPDF][PdfRenderSuccess]", { chapterCount: totalChapters, fallbackUsed, manuscriptSource });
    await completePremiumPdfExecution(
      env,
      String(job?.userId || ""),
      executionCtx,
      reportId,
      {
        manuscriptSource,
        chapterCount: totalChapters,
        archive: {
          reportId,
          reportType: "love_book",
          displayName: loveSecretArchiveDisplayName(mode),
          title: loveSecretArchiveTitle(base, mode),
          mode,
          birthName: clean(base?.user?.name),
          summary: clean(finalChapters?.[0]?.sections?.[0]?.body || "", 1000),
          pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
          htmlUrl: clean(pdfReady?.htmlUrl),
          downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl),
          chapters: finalChapters,
          payload: { mode, chapterCount: totalChapters, pdfReady, pdfCompletionValidation, loveSecretMasterJson, masterJsonValidation, loveSecretFacts, loveSecretChapterPlans: summarizeLoveSecretChapterPlans(loveSecretChapterPlans), llmEnhancement },
          pdfReady,
          canReopen: true,
          canDownload: true,
        },
      },
    );
    resolveLoveSecretLock(sessionId, "done", String(_id));
  } catch (error) {
    console.error("[LoveBookPremiumPDF][Error]", normalizeLoveBookError(error));
    await coll.updateOne(
      { _id },
      {
        $set: {
          status: "failed",
          stage: "failed",
          message: "연애 비책 생성이 중단되었습니다.",
          errorMessage: clean(error?.message || "알 수 없는 오류"),
          failedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
    await failPremiumPdfExecution(
      env,
      String(job?.userId || ""),
      executionCtx,
      "love_secret_generation_failed",
      clean(error?.message || "연애 비책 생성 실패"),
      "love-secret-generation",
    );
    resolveLoveSecretLock(sessionId, "failed", String(_id));
  }
}

function buildApiError(code, message, status = 400, debugSafe = null) {
  return json({
    ok: false,
    code,
    message,
    ...(debugSafe && typeof debugSafe === "object" ? { debugSafe } : {}),
  }, { status });
}

function isLikelyDbUnavailableError(error) {
  const msg = clean(error?.message || error).toLowerCase();
  return msg.includes("database is temporarily unavailable")
    || msg.includes("db is temporarily unavailable")
    || msg.includes("mongodb")
    || msg.includes("server selection")
    || msg.includes("connect")
    || msg.includes("timeout")
    || msg.includes("econn")
    || msg.includes("topology");
}

async function authorizeLoveSecret(request, env, body, mode) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return { ok: false, response: buildApiError("UNAUTHORIZED", "로그인 후 연애 비책 PDF를 생성할 수 있습니다.", 401) };
    }
    throw error;
  }

  const featureKey = toFeatureKey(mode);
  const reportId = clean(body?.reportId);
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.chapterSessionId);
  const purchaseId = clean(body?.purchaseId || body?.reportPurchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId || body?._paymentContext?.purchaseId);

  if (isPremiumReportTestMode(env)) {
    return {
      ok: true,
      auth,
      featureKey,
      access: {
        ok: true,
        status: 200,
        accessType: "test_bypass",
        accessMethod: "TEST_NO_PAYMENT",
        featureKey,
        reportType: "loveSecret",
        mode,
        userId: auth.userId,
        bypass: true,
      },
    };
  }

  const access = await requirePremiumReportAccess(getLoveSecretFastDbEnv(env), auth.userId, "loveSecret", {
    ...body,
    mode,
    reportType: "loveSecret",
    featureKey,
    _accessRoute: "/api/love-secret/generate-chapter",
  });

  if (!access?.ok) {
    const status = Number(access?.status || 402);
    const hasBinding = Boolean(reportId || sessionId || purchaseId);
    const isPaymentBindingMiss = status === 402 && hasBinding;
    const code = isPaymentBindingMiss
      ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING"
      : (access?.code || "UNAUTHORIZED");
    const message = isPaymentBindingMiss
      ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
      : status === 402
        ? "프리미엄 연애 비책 생성 권한이 필요합니다."
        : status === 401
          ? "로그인 후 연애 비책 PDF를 생성할 수 있습니다."
          : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return {
      ok: false,
      response: buildApiError(code, message, status, {
        featureKey,
        mode,
        hasSessionId: Boolean(sessionId),
        hasPurchaseId: Boolean(purchaseId),
        hasReportId: Boolean(reportId),
      }),
    };
  }

  return { ok: true, auth, featureKey, access };
}

async function handleGenerateChapter(request, env) {
  const body = await readJson(request);
  const mode = normalizeMode(body?.mode || body?.reportMode);
  console.info("[LoveBookPremiumPDF][RequestReceived]", { mode, endpoint: "generate-chapter" });
  console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const chapterNo = Number(body?.chapter || 1);
  const config = safeModeChapterConfig(mode);
  const totalChapters = Number(config.totalChapters || 0);
  if (!Number.isFinite(chapterNo) || chapterNo < 1 || chapterNo > totalChapters) {
    return buildApiError("INVALID_CHAPTER", "요청한 챕터 번호가 유효하지 않습니다.", 400);
  }

  const base = normalizeSajuBase(body);
  console.info("[LoveBookPremiumPDF][BirthInputValidated]", {
    mode,
    hasSelfBirthDate: Boolean(clean(base?.user?.birthDate)),
    hasSelfBirthTime: Boolean(clean(base?.user?.birthTime)),
  });
  const valid = validateMinimumSaju(base);
  if (!valid.ok) {
    return buildApiError("MISSING_SAJU_DATA", "사주 분석 결과가 충분하지 않습니다. 사주 분석 화면에서 다시 계산해 주세요.", 400);
  }
  const partnerValid = validatePartnerMinimumSaju(base, mode);
  if (!partnerValid.ok) {
    return buildApiError("MISSING_PARTNER_SAJU", "궁합 모드는 상대 생년월일과 핵심 명식 정보가 필요합니다. 상대 정보를 확인해 주세요.", 400);
  }

  const chapterMeta = (Array.isArray(config.chapters) ? config.chapters : [])[chapterNo - 1] || {};
  const title = stripUnsafeText(body?.chapterTitle || chapterMeta.title || `연애 비책 ${chapterNo}장`);
  const subtitle = stripUnsafeText(body?.chapterSubtitle || chapterMeta.subtitle || "") || "";
  const sectionTitles = getChapterSpecificSections(body, chapterNo, mode);

  console.info("[LoveBookPremiumPDF][LocalDraftBuildStart]", { chapterCount: 1 });
  const local = buildLocalChapter(base, title, subtitle, sectionTitles, mode, chapterNo);
  const finalText = stripUnsafeText(local.finalText) || local.finalText;
  console.info("[LoveBookPremiumPDF][LocalDraftChapterDone]", { chapter: chapterNo, chapterChars: finalText.length });
  console.info("[LoveBookPremiumPDF][FinalManuscriptValidated]", {
    chapterCount: 1,
    manuscriptSource: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
  });

  return json({
    ok: true,
    featureKey: authz.featureKey,
    mode,
    sessionId: clean(body?.sessionId || body?.reportSessionId || body?.chapterSessionId) || "",
    chapter: chapterNo,
    chapterCount: totalChapters,
    chapterMeta: { title, subtitle },
    fallbackUsed: false,
    manuscriptSource: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
    text: finalText,
    sections: Array.isArray(local.sections) ? local.sections : [],
  });
}

async function handlePrepare(request, env) {
  const body = await readJson(request);
  const mode = normalizeMode(body?.mode || body?.reportMode);
  console.info("[LoveBookPremiumPDF][RequestReceived]", { mode, endpoint: "prepare" });
  console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const base = normalizeSajuBase(body);
  console.info("[LoveBookPremiumPDF][BirthInputValidated]", {
    mode,
    hasSelfBirthDate: Boolean(clean(base?.user?.birthDate)),
    hasSelfBirthTime: Boolean(clean(base?.user?.birthTime)),
  });
  const valid = validateMinimumSaju(base);
  if (!valid.ok) {
    return buildApiError("MISSING_SAJU_DATA", "사주 분석 결과가 충분하지 않습니다. 사주 분석 화면에서 다시 계산해 주세요.", 400);
  }
  const partnerValid = validatePartnerMinimumSaju(base, mode);
  if (!partnerValid.ok) {
    return buildApiError("MISSING_PARTNER_SAJU", "궁합 모드는 상대 생년월일과 핵심 명식 정보가 필요합니다. 상대 정보를 확인해 주세요.", 400);
  }
  return buildApiError(
    "ASYNC_GENERATION_REQUIRED",
    "연애 비책 PDF는 안정적인 품질 검증을 위해 비동기 생성으로 진행됩니다. 잠시 후 진행 상태를 확인해 주세요.",
    409,
    { mode, asyncEndpoint: "/api/love-secret/prepare-async" },
  );

  const config = safeModeChapterConfig(mode);
  const sessionId = clean(body?.sessionId || body?.reportSessionId) || "";
  if (mode === "solo") {
    return buildApiError("ASYNC_GENERATION_REQUIRED", "연애 비책 PDF는 순차 생성으로 준비됩니다. 잠시 후 진행 상태를 확인해 주세요.", 409);
  }
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: LOVE_SECRET_SERVICE_KEY,
    reportType: "loveSecret",
    userId: authz?.auth?.userId,
    featureKey: authz.featureKey,
    sessionId,
    reportId: clean(body?.reportId),
    access: authz.access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  const reusableExecution = await findLoveSecretReusableExecution(env, authz?.auth?.userId, executionCtx, {
    sessionId,
    reportId: clean(body?.reportId),
    mode,
    featureKey: authz.featureKey,
  });
  const reusableResponse = reusableExecution ? buildLoveSecretReusableExecutionResponse(reusableExecution, {
    sessionId,
    reportId: clean(body?.reportId),
    mode,
    featureKey: authz.featureKey,
  }) : null;
  if (reusableResponse) return json(reusableResponse.payload, { status: reusableResponse.status });

  await startPremiumPdfExecution(env, authz?.auth?.userId, executionCtx);
  const executionLease = await acquireLoveSecretExecutionLease(env, authz?.auth?.userId, executionCtx);
  if (!executionLease.ok && !executionLease.error) {
    return json({
      ok: true,
      accepted: true,
      duplicate: true,
      serviceKey: LOVE_SECRET_SERVICE_KEY,
      mode,
      reportId: clean(body?.reportId),
      sessionId,
      status: "running",
      pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
    }, { status: 202 });
  }

  try {
  console.info("[LoveBookPremiumPDF][LocalCalculationStart]", { mode });
  console.info("[LoveBookPremiumPDF][LocalCalculationSuccess]", {
    selfDayMasterResolved: Boolean(clean(base?.core?.dayMaster)),
    romanceStarsResolved: Boolean(base?.specialStars && typeof base.specialStars === "object"),
  });
  console.info("[LoveBookPremiumPDF][LocalDraftBuildStart]", { chapterCount: Number(config?.totalChapters || 0), mode });

  const {
    chapters: localChapters,
    totalChapters,
    manuscriptSource: generatedSource,
    loveSecretMasterJson,
    masterJsonValidation,
    loveSecretFacts,
    loveSecretChapterPlans,
    llmEnhancement,
  } = await buildLoveSecretChapters(env, {
    base,
    mode,
    config,
    body,
    requestId: clean(body?.requestId || body?.reportId || sessionId),
  });

  const localValidation = validateLoveSecretManuscript({
    mode,
    chapters: localChapters,
    config,
    minChapterChars: Number(config?.chapterMinDefault || 2000),
  });
  if (!localValidation.ok) {
    throw Object.assign(new Error("로컬 원고 생성이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."), {
      code: "LOCAL_DRAFT_INVALID",
      status: 422,
    });
  }
  console.info("[LoveBookPremiumPDF][LocalDraftBuildSuccess]", { chapterCount: localChapters.length, totalLength: localValidation.totalChars });
  console.info("[LoveBookPremiumPDF][LocalQualityValidated]", {
    chapterCount: localValidation.actual,
    totalLength: localValidation.totalChars,
    forbiddenTermsCount: localValidation.forbiddenTermsCount,
    repetitionScore: localValidation.repetitionScore,
  });

  let fallbackUsed = false;
  let manuscriptSource = clean(generatedSource) || LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
  const preparedFinal = prepareLoveSecretFinalChapters({
    candidateChapters: localChapters.map((chapter) => ({ ...chapter, source: manuscriptSource })),
    localChapters,
    mode,
    config,
    base,
  });
  let finalChapters = preparedFinal.chapters;
  const finalValidation = preparedFinal.validation;
  if (!finalValidation.ok) {
    console.error("[LoveBookPremiumPDF][FinalValidationFailed]", {
      finalValidation,
      localValidation: preparedFinal.localValidation || null,
    });
    throw Object.assign(new Error("로컬 상담문 품질 검증을 통과하지 못했습니다. 잠시 후 다시 시도해 주세요."), {
      code: "FINAL_MANUSCRIPT_INVALID",
      status: 422,
    });
  }
  if (preparedFinal.recovered) {
    manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
    console.info("[LoveBookPremiumPDF][FinalLocalAssemblyNormalized]", {
      mode,
      reason: preparedFinal.recoveryReason,
    });
  }
  console.info("[LoveBookPremiumPDF][FinalManuscriptValidated]", {
    chapterCount: finalChapters.length,
    manuscriptSource,
  });
  console.info("[LoveBookPremiumPDF][PdfRenderStart]", { chapterCount: finalChapters.length, fallbackUsed, manuscriptSource });
  console.info("[LoveBookPremiumPDF][PdfRenderSuccess]", { chapterCount: finalChapters.length, fallbackUsed, manuscriptSource });

  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `love-secret-${Date.now().toString(36)}`);
  finalChapters = buildLoveSecretAssembledChapters(finalChapters, base, mode);
  manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
  const pdfReady = buildLoveSecretPdfReadyAssembled(request, reportId, finalChapters, base, mode);
  const pdfCompletionValidation = validateLoveSecretPdfCompletionPayload({ pdfReady, chapters: finalChapters, mode });
  if (!pdfCompletionValidation.ok) {
    throw Object.assign(new Error("연애 비책 PDF 완료 검증을 통과하지 못했습니다. 원고를 보강한 뒤 다시 생성해 주세요."), {
      code: "LOVE_SECRET_PDF_COMPLETION_INVALID",
      status: 422,
    });
  }
  const responsePayload = buildLoveSecretSuccessPayload({
    featureKey: authz.featureKey,
    mode,
    sessionId,
    reportId,
    chapterCount: totalChapters,
    fallbackUsed,
    manuscriptSource,
    chapters: finalChapters,
    pdfReady,
    pdfCompletionValidation,
    loveSecretMasterJson,
    masterJsonValidation,
    loveSecretFacts,
    loveSecretChapterPlans,
    llmEnhancement,
  });
  await completePremiumPdfExecution(env, authz?.auth?.userId, executionCtx, reportId, {
    manuscriptSource,
    chapterCount: totalChapters,
    archive: {
      reportId,
      reportType: "love_book",
      displayName: loveSecretArchiveDisplayName(mode),
      title: loveSecretArchiveTitle(base, mode),
      mode,
      birthName: clean(base?.user?.name),
      summary: clean(finalChapters?.[0]?.sections?.[0]?.body || "", 1000),
      pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
      htmlUrl: clean(pdfReady?.htmlUrl),
      downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl),
      chapters: finalChapters,
      payload: { mode, chapterCount: totalChapters, pdfReady, pdfCompletionValidation, loveSecretMasterJson, masterJsonValidation, loveSecretFacts, loveSecretChapterPlans: summarizeLoveSecretChapterPlans(loveSecretChapterPlans), llmEnhancement },
      pdfReady,
      canReopen: true,
      canDownload: true,
    },
  });

  return json(responsePayload);
  } catch (error) {
    await failPremiumPdfExecution(
      env,
      authz?.auth?.userId,
      executionCtx,
      "love_secret_prepare_failed",
      clean(error?.message || "연애 비책 생성 실패"),
      "love-secret-prepare-sync",
    );
    throw error;
  }
}

async function handlePrepareAsync(request, env, ctx) {
  const body = await readJson(request);
  const mode = normalizeMode(body?.mode || body?.reportMode);
  console.info("[LoveBookPremiumPDF][RequestReceived]", { mode, endpoint: "prepare-async" });
  console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const base = normalizeSajuBase(body);
  console.info("[LoveBookPremiumPDF][BirthInputValidated]", {
    mode,
    hasSelfBirthDate: Boolean(clean(base?.user?.birthDate)),
    hasSelfBirthTime: Boolean(clean(base?.user?.birthTime)),
  });
  const valid = validateMinimumSaju(base);
  if (!valid.ok) {
    return buildApiError("MISSING_SAJU_DATA", "사주 분석 결과가 충분하지 않습니다. 사주 분석 화면에서 다시 계산해 주세요.", 400);
  }
  const partnerValid = validatePartnerMinimumSaju(base, mode);
  if (!partnerValid.ok) {
    return buildApiError("MISSING_PARTNER_SAJU", "궁합 모드는 상대 생년월일과 핵심 명식 정보가 필요합니다. 상대 정보를 확인해 주세요.", 400);
  }

  const config = safeModeChapterConfig(mode);
  const sessionId = clean(body?.sessionId || body?.reportSessionId || `love-book:${clean(body?.reportId)}`);
  const pdfCacheKey = buildLoveSecretPdfCacheKey(base, mode, body);
  const cachedPdf = await findLoveSecretCachedJob(env, authz?.auth?.userId, pdfCacheKey);
  if (cachedPdf?.payload) {
    resolveLoveSecretLock(sessionId, "done", clean(cachedPdf?.job?._id || ""));
    return json({
      ...cachedPdf.payload,
      sessionId,
      cacheSource: cachedPdf.source,
    }, { status: 200 });
  }
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: LOVE_SECRET_SERVICE_KEY,
    reportType: "loveSecret",
    userId: authz?.auth?.userId,
    featureKey: authz.featureKey,
    sessionId,
    reportId: clean(body?.reportId),
    access: authz.access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  const reusableExecution = await findLoveSecretReusableExecution(env, authz?.auth?.userId, executionCtx, {
    sessionId,
    reportId: clean(body?.reportId),
    mode,
    featureKey: authz.featureKey,
  });
  const reusableResponse = reusableExecution ? buildLoveSecretReusableExecutionResponse(reusableExecution, {
    sessionId,
    reportId: clean(body?.reportId),
    mode,
    featureKey: authz.featureKey,
  }) : null;
  if (reusableResponse) return json(reusableResponse.payload, { status: reusableResponse.status });

  let preflightJobsCollection = null;
  try {
    preflightJobsCollection = await getLoveSecretJobsCollection(env);
    const existingJob = await preflightJobsCollection.findOne({
      service: LOVE_SECRET_SERVICE_KEY,
      userId: String(authz?.auth?.userId || ""),
      "requestBody.sessionId": sessionId,
      status: { $in: ["pending", "processing", "completed"] },
    }, { sort: { updatedAt: -1, createdAt: -1 } });
    if (existingJob && clean(existingJob.status) === "completed" && existingJob.result) {
      resolveLoveSecretLock(sessionId, "done", String(existingJob?._id || ""));
      return json({
        ...existingJob.result,
        fromCache: true,
        duplicate: true,
      }, { status: 200 });
    }
    if (existingJob) {
      resolveLoveSecretLock(sessionId, "running", String(existingJob?._id || ""));
      return json({
        ok: true,
        accepted: true,
        duplicate: true,
        sessionId,
        jobId: String(existingJob?._id || ""),
        status: clean(existingJob?.status) || "pending",
        pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
      }, { status: 202 });
    }
  } catch (error) {
    if (!isLikelyDbUnavailableError(error)) throw error;
  }

  await startPremiumPdfExecution(env, authz?.auth?.userId, executionCtx);
  const executionLease = await acquireLoveSecretExecutionLease(env, authz?.auth?.userId, executionCtx);
  if (!executionLease.ok && !executionLease.error) {
    return json({
      ok: true,
      accepted: true,
      duplicate: true,
      serviceKey: LOVE_SECRET_SERVICE_KEY,
      mode,
      reportId: clean(body?.reportId),
      sessionId,
      status: "running",
      pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
    }, { status: 202 });
  }
  const lockState = acquireLoveSecretLock(sessionId);
  if (!lockState.ok) resolveLoveSecretLock(sessionId, "running", clean(lockState?.existing?.jobId));

  const totalChapters = Number(config.totalChapters || 0);
  try {
    const coll = preflightJobsCollection || await getLoveSecretJobsCollection(env);
    const now = new Date();

    const runningJob = await coll.findOne({
      service: LOVE_SECRET_SERVICE_KEY,
      userId: String(authz?.auth?.userId || ""),
      "requestBody.sessionId": sessionId,
      status: { $in: ["pending", "processing"] },
    });
    if (runningJob) {
      resolveLoveSecretLock(sessionId, "running", String(runningJob?._id || ""));
      return json({
        ok: true,
        accepted: true,
        duplicate: true,
        sessionId,
        jobId: String(runningJob?._id || ""),
        status: clean(runningJob?.status) || "pending",
        pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
      }, { status: 202 });
    }

    const insertDoc = {
      service: LOVE_SECRET_SERVICE_KEY,
      featureKey: authz.featureKey,
      userId: String(authz?.auth?.userId || ""),
      cacheKey: pdfCacheKey,
      cacheVersion: LOVE_SECRET_PDF_CONFIG.templateVersion,
      reportId: clean(body?.reportId),
      mode,
      status: "pending",
      stage: "pending",
      message: "연애 비책 생성 요청을 접수했습니다.",
      chapterCount: totalChapters,
      completedChapters: 0,
      requestBody: {
        reportId: clean(body?.reportId),
        sessionId,
        reportSessionId: sessionId,
        mode,
        reportMode: mode,
        birthInput: body?.birthInput && typeof body.birthInput === "object" ? body.birthInput : {},
        partnerBirthInput: body?.partnerBirthInput && typeof body.partnerBirthInput === "object" ? body.partnerBirthInput : {},
        profile: body?.profile && typeof body.profile === "object" ? body.profile : {},
        partnerData: body?.partnerData || "",
        quantumMyeongriJson: body?.quantumMyeongriJson && typeof body.quantumMyeongriJson === "object" ? body.quantumMyeongriJson : {},
        clientEngineEvidence: body?.clientEngineEvidence && typeof body.clientEngineEvidence === "object" ? body.clientEngineEvidence : {},
      },
      requestOrigin: new URL(request.url).origin,
      execution: {
        executionKey: executionCtx.executionKey,
        sessionId: executionCtx.sessionId,
        reportId: executionCtx.reportId,
        metadata: executionCtx.metadata,
      },
      result: null,
      errorMessage: "",
      createdAt: now,
      updatedAt: now,
    };

    const inserted = await coll.insertOne(insertDoc);
    const jobId = String(inserted?.insertedId || "");
    resolveLoveSecretLock(sessionId, "running", jobId);

    await coll.updateOne(
      { _id: inserted.insertedId },
      {
        $set: {
          status: "pending",
          stage: "queued",
          message: "백그라운드 생성 대기열에 등록되었습니다.",
          updatedAt: new Date(),
        },
      },
    );

    const runTask = runLoveSecretJob(env, jobId).catch((error) => {
      console.error("[love-secret][async-job-failed]", error?.message || error);
    });

    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(runTask);
    } else {
      Promise.resolve(runTask).catch(() => {});
    }

    return json({
      ok: true,
      accepted: true,
      sessionId,
      jobId,
      status: "pending",
      pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
    }, { status: 202 });
  } catch (error) {
    if (!isLikelyDbUnavailableError(error)) {
      await failPremiumPdfExecution(
        env,
        authz?.auth?.userId,
        executionCtx,
        "love_secret_prepare_failed",
        clean(error?.message || "연애 비책 준비 실패"),
        "love-secret-prepare",
      );
      resolveLoveSecretLock(sessionId, "failed", "");
      throw error;
    }
    console.warn("[love-secret][async-job-db-fallback]", clean(error?.message || error) || error);

    try {
    const {
      chapters,
      fallbackUsed,
      totalChapters: directChapterCount,
      manuscriptSource: directManuscriptSource,
      loveSecretMasterJson,
      masterJsonValidation,
      loveSecretFacts,
      loveSecretChapterPlans,
      llmEnhancement,
    } = await buildLoveSecretChapters(env, {
      base,
      mode,
      config,
      body,
      requestId: clean(body?.requestId || body?.reportId || sessionId),
    });
    let manuscriptSource = clean(directManuscriptSource) || LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;

    let finalChapters = reinforceLoveSecretChapters(
      chapters.map((chapter) => ({ ...chapter, source: manuscriptSource })),
      mode,
      config,
      base,
    );
    const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `love-secret-${Date.now().toString(36)}`);
    finalChapters = buildLoveSecretAssembledChapters(finalChapters, base, mode);
    manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
    const pdfReady = buildLoveSecretPdfReadyAssembled(request, reportId, finalChapters, base, mode);
    const pdfCompletionValidation = validateLoveSecretPdfCompletionPayload({ pdfReady, chapters: finalChapters, mode });
    if (!pdfCompletionValidation.ok) {
      throw Object.assign(new Error("연애 비책 PDF 완료 검증을 통과하지 못했습니다. 원고를 보강한 뒤 다시 생성해 주세요."), {
        code: "LOVE_SECRET_PDF_COMPLETION_INVALID",
        status: 422,
      });
    }
    const pdfCacheKey = buildLoveSecretPdfCacheKey(base, mode, body);
    const directResponse = buildLoveSecretSuccessPayload({
      featureKey: authz.featureKey,
      mode,
      sessionId,
      reportId,
      chapterCount: directChapterCount,
      fallbackUsed,
      manuscriptSource,
      chapters: finalChapters,
      pdfReady,
      pdfCompletionValidation,
      loveSecretMasterJson,
      masterJsonValidation,
      loveSecretFacts,
      loveSecretChapterPlans,
      llmEnhancement,
    });

    resolveLoveSecretLock(sessionId, "done", "");
    setLoveSecretPdfMemoryCache(pdfCacheKey, { payload: directResponse });

    await completePremiumPdfExecution(
      env,
      authz?.auth?.userId,
      executionCtx,
      reportId,
      {
        manuscriptSource,
        chapterCount: directChapterCount,
        archive: {
          reportId,
          reportType: "love_book",
          displayName: loveSecretArchiveDisplayName(mode),
          title: loveSecretArchiveTitle(base, mode),
          mode,
          birthName: clean(base?.user?.name),
          summary: clean(finalChapters?.[0]?.sections?.[0]?.body || "", 1000),
          pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
          htmlUrl: clean(pdfReady?.htmlUrl),
          downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl),
          chapters: finalChapters,
          payload: { mode, chapterCount: directChapterCount, pdfReady, pdfCompletionValidation, loveSecretMasterJson, masterJsonValidation, loveSecretFacts, loveSecretChapterPlans: summarizeLoveSecretChapterPlans(loveSecretChapterPlans), llmEnhancement },
          pdfReady,
          canReopen: true,
          canDownload: true,
        },
      },
    );

    return json({
      ...directResponse,
      accepted: false,
      direct: true,
      message: "대기열 저장소 문제로 직접 생성 모드로 전환되었습니다.",
    }, { status: 200 });
    } catch (fallbackError) {
      await failPremiumPdfExecution(
        env,
        authz?.auth?.userId,
        executionCtx,
        "love_secret_prepare_failed",
        clean(fallbackError?.message || error?.message || "연애 비책 준비 실패"),
        "love-secret-prepare-fallback",
      );
      resolveLoveSecretLock(sessionId, "failed", "");
      throw fallbackError;
    }
  }
}

async function handleJobStatus(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id") || url.searchParams.get("jobId"));
  const _id = toObjectIdOrNull(id);
  if (!_id) return buildApiError("INVALID_JOB_ID", "작업 ID가 유효하지 않습니다.", 400);

  const coll = await getLoveSecretJobsCollection(env);
  const job = await coll.findOne({ _id, service: LOVE_SECRET_SERVICE_KEY, userId: String(auth.userId || "") });
  if (!job) return buildApiError("JOB_NOT_FOUND", "작업 정보를 찾을 수 없습니다.", 404);

  const payload = toPublicJobPayload(job);
  if (payload.status === "completed") {
    payload.result = job?.result && typeof job.result === "object" ? job.result : null;
  }

  return json({ ok: true, ...payload });
}

async function handleJobResult(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id") || url.searchParams.get("jobId"));
  const _id = toObjectIdOrNull(id);
  if (!_id) return buildApiError("INVALID_JOB_ID", "작업 ID가 유효하지 않습니다.", 400);

  const coll = await getLoveSecretJobsCollection(env);
  const job = await coll.findOne({ _id, service: LOVE_SECRET_SERVICE_KEY, userId: String(auth.userId || "") });
  if (!job) return buildApiError("JOB_NOT_FOUND", "작업 정보를 찾을 수 없습니다.", 404);
  if (clean(job?.status) !== "completed") {
    return buildApiError("JOB_NOT_READY", "아직 작업이 완료되지 않았습니다.", 409);
  }

  return json({
    ok: true,
    jobId: String(job?._id || ""),
    status: "completed",
    result: job?.result && typeof job.result === "object" ? job.result : null,
  });
}

export const __loveSecretTestUtils = Object.freeze({
  normalizeSajuBase,
  LOVE_SECRET_PDF_CONFIG,
  LOVE_INTERPRETATION_BLOCK_DB,
  LOVE_SECRET_PHASE6_SOLO_CHAPTERS,
  LOVE_SECRET_PHASE6_SOLO_SECTIONS,
  LOVE_SECRET_PHASE7_COMPAT_CHAPTERS,
  LOVE_SECRET_PHASE7_COMPAT_SECTIONS,
  safeModeChapterConfig,
  buildLoveSecretChapters,
  reinforceLoveSecretChapters,
  validateLoveSecretManuscript,
  buildSoloLoveLLMInput,
  buildCompatibilityLoveLLMInput,
  buildLoveSecretMasterJson,
  normalizeSoloLoveSecretData,
  normalizeCompatibilityLoveSecretData,
  normalizeLoveSecretForPdf,
  buildLoveSecretPdfCacheDescriptor,
  buildLoveSecretPdfCacheKey,
  getLoveSecretPdfMemoryCache,
  setLoveSecretPdfMemoryCache,
  validateLoveSecretMasterJson,
  buildLoveSecretFacts,
  buildLoveSecretChapterPlans,
  summarizeLoveSecretChapterPlans,
  validateLoveSecretEnhancedText,
  softenLoveSecretSensitiveText,
  isLoveSecretLlmEnhancementEnabled,
  enhanceLoveSecretLocalChapters,
  LOVE_SECRET_PROMPT_VERSION,
  LOVE_SECRET_SOLO_LLM_ENHANCED_CHAPTERS,
  LOVE_SECRET_COUPLE_LLM_ENHANCED_CHAPTERS,
  generateSoloLoveChapter,
  generateSoloLoveChapters,
  generateCompatibilityLoveChapter,
  generateCompatibilityLoveChapters,
  generateLoveChapter,
  validateLoveChapter,
  validateCompatibilityLoveChapter,
  normalizeLoveGeneratedChapter,
  normalizeCompatibilityLoveGeneratedChapter,
  convertLoveGeneratedChapterToPdfChapter,
  SOLO_LOVE_CHAPTER_SPECS,
  SOLO_LOVE_CHAPTER_QUALITY_GUIDES,
  getSoloLoveChapterQualityGuide,
  COMPATIBILITY_LOVE_CHAPTER_SPECS,
  renderLoveSecretHtmlClean,
  buildLoveSecretAssembledChapters,
  validateLoveSecretPdfCompletionPayload,
  buildLoveSecretPdfReady: buildLoveSecretPdfReadyAssembled,
  hasLoveSecretForbiddenText,
});

export async function handleSajuLoveSecretRoutes(request, env = {}, ctx = null) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/love-secret");

    if (method === "POST" && (path === "" || path === "/" || path === "/generate-chapter")) {
      return await handleGenerateChapter(request, env);
    }

    if (method === "POST" && path === "/prepare") {
      return await handlePrepare(request, env);
    }

    if (method === "POST" && path === "/prepare-async") {
      return await handlePrepareAsync(request, env, ctx);
    }

    if (method === "GET" && path === "/status") {
      return await handleJobStatus(request, env);
    }

    if (method === "GET" && path === "/result") {
      return await handleJobResult(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "saju-love-secret",
        method: request?.method || "",
        requestPath: (() => {
          try { return new URL(request.url).pathname; } catch (_) { return ""; }
        })(),
      },
    });
  }
}
