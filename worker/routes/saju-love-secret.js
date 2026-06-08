import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { LOVE_SECRET_MODE_CONFIG } from "../lib/saju-premium-chapters.js";
import { buildLoveSecretReference } from "../lib/love-secret-reference.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { connectDb, mongoose } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import { callGeminiText } from "../lib/gemini.js";
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
const LOVE_SECRET_JOB_POLL_AFTER_MS = 4000;
const LOVE_SECRET_LOCK_TTL_MS = 1000 * 60 * 20;
const LOVE_SECRET_GENERATION_LOCKS = new Map();
const LOVE_SECRET_FORBIDDEN_RE = /\b(?:fallback|payload|json|schema|debug|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank|raw)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다|로컬\s*엔진|계산\s*시그니처|내부\s*데이터|엔진\s*결과|데이터\s*정규화|품질\s*검증|재생성/gi;
const LOVE_SECRET_MANUSCRIPT_SOURCE = Object.freeze({
  LOCAL: "local-only",
  LLM: "gemini",
  HYBRID: "hybrid-gemini",
});
const LOVE_SECRET_PRODUCT_ID = "love_secret";
const LOVE_SECRET_PROMPT_VERSION = "love-secret-hybrid-v1";
const LOVE_SECRET_ENGINE_VERSION = "worker-saju-engine.v1";
const LOVE_SECRET_LLM_ENHANCEMENT_CACHE = new Map();
const LOVE_SECRET_LLM_ENHANCEMENT_CACHE_MAX = 240;
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
  "couple_overview",
  "self_love_style",
  "partner_love_style",
  "attraction_reason",
  "spouse_palace_root",
  "relationship_expectation",
  "emotional_tempo_gap",
  "intimacy_tempo",
  "communication_match",
  "conflict_pattern",
  "breakup_reunion_pattern",
  "long_term_potential",
  "reality_strategy",
  "couple_luck_cycles",
  "couple_master_plan",
]);
const LOVE_SECRET_SOLO_LLM_ENHANCED_CHAPTERS = LOVE_SECRET_SOLO_CHAPTER_IDS;
const LOVE_SECRET_COUPLE_LLM_ENHANCED_CHAPTERS = LOVE_SECRET_COMPATIBILITY_CHAPTER_IDS;
const LOVE_SECRET_SENSITIVE_EXPRESSION_REPLACEMENTS = Object.freeze([
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
        ? chapter.sections.map((section) => clean(section?.body || section?.text || "")).join("\n")
        : "";
      return `${clean(chapter?.title)}\n${clean(chapter?.subtitle)}\n${clean(chapter?.text)}\n${sectionText}`;
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
  const keywordMap = LOVE_SECRET_CANONICAL_TOPIC_KEYWORDS[normalizedMode] || LOVE_SECRET_CANONICAL_TOPIC_KEYWORDS.solo;
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

function validateLoveSecretManuscript({ mode, chapters, config, minChapterChars = 2000 } = {}) {
  const list = Array.isArray(chapters) ? chapters : [];
  const expected = Number(config?.totalChapters || 0);
  const chapterCountOk = expected > 0 ? list.length === expected : list.length > 0;
  const chapterLengths = list.map((chapter) => chapterCharLength(chapter));
  const totalChars = chapterLengths.reduce((acc, value) => acc + value, 0);
  const minTotal = Number(config?.minTotalChars || (mode === "compatibility" ? 33000 : 25000));
  const tooShortChapterIndexes = chapterLengths
    .map((count, idx) => ({ count, idx }))
    .filter((row) => row.count < minChapterChars)
    .map((row) => row.idx + 1);

  let forbiddenTermsCount = 0;
  const shortSections = [];
  const lowSectionCount = [];
  for (const chapter of list) {
    const sectionList = Array.isArray(chapter?.sections) ? chapter.sections : [];
    if (sectionList.length < 5) {
      lowSectionCount.push(Number(chapter?.chapter || 0));
    }
    for (const section of sectionList) {
      const sectionLen = String(clean(section?.body || section?.text || "")).replace(/\s+/g, "").length;
      if (sectionLen < 700) {
        shortSections.push({ chapter: Number(chapter?.chapter || 0), section: clean(section?.title) || "(무제)", len: sectionLen });
      }
    }
    const sample = `${clean(chapter?.title)}\n${clean(chapter?.subtitle)}\n${clean(chapter?.text)}`;
    const matches = sample.match(LOVE_SECRET_CANONICAL_FORBIDDEN_RE);
    forbiddenTermsCount += Array.isArray(matches) ? matches.length : 0;
  }

  const repetitionScore = estimateLoveSecretRepetitionScore(list);
  const combined = collectLoveSecretText(list);
  const sentenceMap = new Map();
  for (const sentence of collectNormalizedSentences(combined)) {
    sentenceMap.set(sentence, Number(sentenceMap.get(sentence) || 0) + 1);
  }
  const duplicateSentenceCount = Array.from(sentenceMap.values()).filter((count) => count >= 2).length;
  const repeatedLongFragments = countRepeatedLongFragments(combined, 30, 3);
  const repeatedSectionOpenings = countRepeatedSectionOpenings(list);
  const mechanicalOveruse =
    countPhraseOveruse(combined, "이 명식은 사랑에서")
    + countPhraseOveruse(combined, "관계에서 균형이 필요")
    + countPhraseOveruse(combined, "주의가 필요")
    + countPhraseOveruse(combined, "현실 조언은");
  const topicCoverageIssues = validateLoveSecretTopicCoverage(mode, list);

  const ok = chapterCountOk
    && tooShortChapterIndexes.length === 0
    && lowSectionCount.length === 0
    && shortSections.length === 0
    && totalChars >= minTotal
    && forbiddenTermsCount === 0
    && repetitionScore <= 0.46
    && duplicateSentenceCount <= (normalizeMode(mode) === "compatibility" ? 900 : 650)
    && repeatedLongFragments <= 16
    && repeatedSectionOpenings <= 2
    && mechanicalOveruse <= 8
    && topicCoverageIssues.length === 0;

  return {
    ok,
    expected,
    actual: list.length,
    totalChars,
    minTotal,
    tooShortChapterIndexes,
    lowSectionCount,
    shortSections,
    forbiddenTermsCount,
    repetitionScore,
    duplicateSentenceCount,
    repeatedLongFragments,
    repeatedSectionOpenings,
    mechanicalOveruse,
    topicCoverageIssues,
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
        enabled: isLoveSecretLlmEnhancementEnabled(env),
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
  let fallbackUsed = false;
  let completed = 0;

  console.info("[LoveBook][Flow] SKELETON_READY", { mode, chapterCount: totalChapters });
  for (let current = 0; current < totalChapters; current += 1) {
    const chapterNo = current + 1;
    console.info("[LoveBook][Chapter] START", { index: chapterNo });
    let generated = null;
    try {
      generated = await generateLoveSecretChapter(env, base, mode, config, chapterNo);
    } catch (error) {
      const chapterMeta = getLoveSecretChapterMeta(config, chapterNo);
      const title = stripUnsafeText(chapterMeta.title || `연애 비책 ${chapterNo}장`);
      const subtitle = stripUnsafeText(chapterMeta.subtitle || "");
      const sectionTitles = getChapterSpecificSections({}, chapterNo, mode);
      const local = buildLocalChapter(base, title, subtitle, sectionTitles, mode, chapterNo);
      generated = {
        fallbackUsed: true,
        chapter: {
          chapter: chapterNo,
          title,
          subtitle,
          text: stripUnsafeText(local.finalText) || local.finalText,
          sections: Array.isArray(local.sections) ? local.sections : [],
        },
      };
      console.error("[LoveBook][ChapterError]", {
        chapterIndex: chapterNo,
        chapterTitle: title,
        message: clean(error?.message || error) || "unknown_error",
      });
    }

    if (generated?.fallbackUsed) fallbackUsed = true;
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
  const llmEnhancement = await enhanceLoveSecretLocalChapters(env, {
    chapters,
    mode: normalizedMode,
    plans: loveSecretChapterPlans,
    loveSecretFacts,
    requestId: clean(requestId || normalizedBody?.requestId || `love-secret-hybrid:${Date.now().toString(36)}`),
  });
  let finalChapters = llmEnhancement.chapters;
  let llmFallbackUsed = llmEnhancement.enabled && llmEnhancement.attempted > llmEnhancement.enhancedChapterIds.length;
  let recoveredToLocal = false;
  const preparedHybrid = prepareLoveSecretFinalChapters({
    candidateChapters: finalChapters,
    localChapters: chapters,
    mode: normalizedMode,
    config,
    base,
  });
  if (preparedHybrid.validation.ok) {
    finalChapters = preparedHybrid.chapters;
    if (preparedHybrid.recovered) {
      recoveredToLocal = true;
      llmFallbackUsed = true;
      llmEnhancement.fallbackChapterIds = Array.from(new Set([
        ...(Array.isArray(llmEnhancement.fallbackChapterIds) ? llmEnhancement.fallbackChapterIds : []),
        "final-validation:local-recovery",
      ]));
      llmEnhancement.enhancedChapterIds = [];
    }
  }
  console.info("[LoveBook][Flow] ALL_CHAPTERS_DONE", {
    expected: totalChapters,
    actual: finalChapters.length,
    llmEnhanced: llmEnhancement.enhancedChapterIds.length,
    llmFallback: llmEnhancement.fallbackChapterIds.length,
    recoveredToLocal,
  });
  return {
    chapters: finalChapters,
    fallbackUsed: fallbackUsed || llmFallbackUsed,
    totalChapters: finalChapters.length,
    manuscriptSource: !recoveredToLocal && llmEnhancement.enhancedChapterIds.length > 0 ? LOVE_SECRET_MANUSCRIPT_SOURCE.HYBRID : LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
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
const LOVE_SECRET_ASSERTIVE_RE = /(무조건|반드시\s*결혼|100\s*%|확정|필연적으로|반드시\s*재회|절대\s*헤어지지|반드시\s*만난다)/i;
const LOVE_SECRET_EXPLICIT_INTIMACY_RE = /(성행위|섹스|삽입|성기|노골적|음란|애무|체위|오르가즘|자위)/i;

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
    generationMode: "worker-native-llm",
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

  return {
    ...masterJson,
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
  const prompt = `${systemPrompt}\n\n${userPrompt}`;
  const result = await callGeminiText(env, prompt, {
    keyEnvKeys: LOVE_SECRET_LLM_KEY_ENV_KEYS,
    modelEnvKeys: LOVE_SECRET_LLM_MODEL_ENV_KEYS,
    models: pickLoveSecretGeminiModels(env),
    temperature: Number(env?.LOVE_SECRET_GEMINI_TEMPERATURE || 0.35),
    topP: Number(env?.LOVE_SECRET_GEMINI_TOP_P || 0.9),
    maxOutputTokens: Number(env?.LOVE_SECRET_GEMINI_MAX_OUTPUT_TOKENS || 24576),
    timeoutMs: Number(env?.LOVE_SECRET_GEMINI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 65000),
    totalTimeoutMs: Number(env?.LOVE_SECRET_GEMINI_TOTAL_TIMEOUT_MS || 0),
    maxAttemptsPerPair: Number(env?.LOVE_SECRET_GEMINI_RETRIES || env?.PREMIUM_GEMINI_RETRIES || 2),
    useSdk: false,
    disableVertexFallback: true,
    metadata: { requestId, schemaName },
  });
  if (!result?.ok) {
    throw Object.assign(new Error(clean(result?.message || "연애 비책 원고 생성에 실패했습니다.")), {
      code: clean(result?.error || "LOVE_SECRET_LLM_GENERATION_FAILED"),
      status: Number(result?.status || 0) || null,
    });
  }
  return parseLoveGeminiJson(result.text, schemaName);
}

function isLoveSecretLlmEnhancementEnabled(env = {}) {
  const raw = clean(env?.LOVE_SECRET_LLM_ENHANCEMENT_ENABLED ?? "true").toLowerCase();
  return !["0", "false", "off", "no", "disabled"].includes(raw);
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
  const cached = getLoveSecretEnhancementCache(cacheKey);
  if (cached?.enhancedText) {
    return { ok: true, enhancedText: cached.enhancedText, cacheKey, cacheHit: true, fallbackReason: "" };
  }
  const { systemPrompt, userPrompt } = buildLoveSecretEnhancementPrompt(plan);
  const result = await callGeminiText(env, `${systemPrompt}\n\n${userPrompt}`, {
    keyEnvKeys: LOVE_SECRET_LLM_KEY_ENV_KEYS,
    modelEnvKeys: LOVE_SECRET_LLM_MODEL_ENV_KEYS,
    models: pickLoveSecretGeminiModels(env),
    temperature: Number(env?.LOVE_SECRET_LLM_ENHANCEMENT_TEMPERATURE || 0.32),
    topP: Number(env?.LOVE_SECRET_LLM_ENHANCEMENT_TOP_P || 0.88),
    maxOutputTokens: Number(env?.LOVE_SECRET_LLM_ENHANCEMENT_MAX_OUTPUT_TOKENS || 2200),
    timeoutMs: Number(env?.LOVE_SECRET_LLM_ENHANCEMENT_TIMEOUT_MS || 30000),
    totalTimeoutMs: Number(env?.LOVE_SECRET_LLM_ENHANCEMENT_TOTAL_TIMEOUT_MS || 0),
    maxAttemptsPerPair: Math.max(1, Math.min(1, Number(env?.LOVE_SECRET_LLM_ENHANCEMENT_RETRIES || 1))),
    useSdk: false,
    disableVertexFallback: true,
    metadata: { requestId, schemaName: `LoveSecretEnhancement:${clean(plan?.chapterId)}`, promptVersion: LOVE_SECRET_PROMPT_VERSION },
  });
  if (!result?.ok) {
    return { ok: false, enhancedText: "", cacheKey, cacheHit: false, fallbackReason: clean(result?.error || result?.message || "llm_failed") };
  }
  const validation = validateLoveSecretEnhancedText(result.text, plan);
  if (validation.ok) {
    setLoveSecretEnhancementCache(cacheKey, { enhancedText: validation.text });
    return { ok: true, enhancedText: validation.text, cacheKey, cacheHit: false, fallbackReason: "" };
  }
  return {
    ok: false,
    enhancedText: validation.partialText,
    cacheKey,
    cacheHit: false,
    fallbackReason: validation.reason,
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
  return LOVE_SECRET_CANONICAL_MODE_CONFIG[key] || LOVE_SECRET_MODE_CONFIG[key] || LOVE_SECRET_CANONICAL_MODE_CONFIG.solo;
}

function getChapterSpecificSections(body, chapterNo, mode) {
  const input = Array.isArray(body?.chapterSpecificSections) ? body.chapterSpecificSections : [];
  const cleanedInput = input.map((v) => stripUnsafeText(v)).filter(Boolean);
  if (cleanedInput.length) return cleanedInput.slice(0, 5);
  const canonicalMode = normalizeMode(mode);
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
  const partnerLine = partner
    ? `${contextLabel}에서 상대는 ${partner.dayMaster} 일간과 ${partner.dayBranch} 일지를 중심으로 애정을 표현합니다. ${contextLabel}의 실제 장면에서는 ${partner.monthPillar}의 현실 감각이 더해져 말보다 태도와 반복되는 행동에서 진심이 드러나는 편입니다.`
    : `${contextLabel}에서 ${self.name}님에게 좋은 인연은 부족한 ${self.deficientElement} 기운을 부드럽게 보완하고, 과한 ${self.dominantElement} 기운을 경쟁이 아니라 안정감으로 바꾸어 주는 사람입니다.`;
  const hourLine = self.hasHour
    ? `${contextLabel}에서는 시주가 함께 반영되어 미래의 친밀감, 약속을 다루는 방식, 늦게 드러나는 욕구까지 함께 읽을 수 있습니다.`
    : `${contextLabel}에서는 시주가 비어 있는 만큼 일주와 월주의 신호를 중심으로 보수적으로 해석하며, 미래의 친밀감은 실제 관계의 반복 행동으로 다시 확인하는 것이 좋습니다.`;
  const intimacyLine = chapterTitle.includes("친밀") || sectionTitle.includes("속궁합") || sectionTitle.includes("친밀")
    ? `${contextLabel}의 속궁합은 단정적인 좋고 나쁨이 아니라 조후의 온도와 감정 리듬의 문제입니다. ${contextLabel}에서 ${self.johu}이므로, 마음이 열리는 속도와 몸이 편안해지는 속도를 억지로 맞추지 말고 서로의 체온을 존중하는 순서가 중요합니다.`
    : `${contextLabel}의 친밀감은 처음의 설렘보다 반복되는 안심에서 깊어집니다. ${contextLabel}에서는 작은 약속을 지키는 방식, 서운함을 말한 뒤 회복되는 속도, 상대의 생활을 존중하는 태도가 관계의 실제 체력을 만듭니다.`;
  const sectionTone = ["부드럽게", "차분하게", "정직하게", "품격 있게", "현실적으로"][sectionIndex % 5];

  const paragraphs = [
    `${chapterNo}장 ${chapterTitle}의 ${sectionTitle}은 사랑을 운명처럼 포장하기보다, 사주가 보여 주는 관계의 습관을 현실에서 읽어 내는 대목입니다. ${self.name}님의 핵심은 일간 ${self.dayMaster}, 일지 ${self.dayBranch}, 월지 ${self.monthBranch}에 놓여 있으며, 특히 월주 ${self.monthPillar}는 연애가 실제 생활과 만날 때 어떤 태도가 강해지는지를 보여 줍니다. ${relationLine}`,
    `이 구조에서 강점은 ${self.strength}의 기세가 관계를 끌고 가는 힘으로 작동한다는 점입니다. ${self.dominantElement} 기운은 끌림을 만들지만, 부족한 ${self.deficientElement} 기운이 채워지지 않으면 서운함이 쌓이기 쉽습니다. ${partnerLine} 그래서 ${sectionTitle}에서는 감정을 증명하려는 태도보다 서로가 안심하는 조건을 먼저 정리해야 합니다.`,
    `${contextLabel}에서 ${self.tenGod}의 기운은 애정 표현의 방식과 기대치를 결정합니다. ${contextLabel}의 사랑을 받을 때는 분명한 말과 꾸준한 행동을 원하고, 사랑을 줄 때는 상대가 흔들리지 않도록 생활 속 기준을 세우려는 면이 강해집니다. ${hourLine} ${contextLabel}을 이해하면 좋은 사람을 만나도 같은 오해가 줄고, 관계의 불필요한 긴장이 빠르게 가라앉습니다.`,
    `${intimacyLine} 특히 ${sectionTitle}에서는 빠른 결론보다 세 가지 확인이 필요합니다. 첫째, 감정이 올라왔을 때 바로 판정하지 않는 것. 둘째, 상대의 말보다 반복 행동을 보는 것. 셋째, 내가 원하는 사랑의 형태를 ${sectionTone} 전하는 것입니다. 이 세 가지가 지켜질 때 관계는 운의 흔들림 속에서도 쉽게 무너지지 않습니다.`,
    `${self.useful ? `${contextLabel}의 보완 기운은 ${self.useful} 쪽에서 살아납니다. ` : ""}${self.daeun ? `${contextLabel}의 가까운 운 흐름은 ${self.daeun} 구간을 함께 보며 조절하면 좋습니다. ` : ""}${sectionTitle}의 실천 비책은 단순합니다. 마음이 급해질수록 확인을 요구하기보다 오늘 지킬 수 있는 작은 약속을 만들고, 상대가 반응할 시간을 주며, 나의 기준을 품격 있게 말하는 것입니다. ${contextLabel}이 지켜질 때 ${self.name}님의 사랑은 흔들리는 감정이 아니라 선택 가능한 인연으로 선명해집니다.`,
  ];

  return stripUnsafeText(paragraphs.join("\n\n"));
}

function buildProfessionalLoveSecretReinforcementText(base, mode, chapterNo, sectionTitle, pass = 1) {
  const self = loveSecretProfileContext(base);
  const partner = normalizeMode(mode) === "compatibility" && base?.partner ? loveSecretProfileContext(base.partner) : null;
  const partnerText = partner
    ? ` 상대의 ${partner.dayPillar}는 ${self.name}님의 ${self.dayPillar}와 다른 방식으로 안정감을 확인하므로, 같은 말을 들어도 받아들이는 속도가 다를 수 있습니다.`
    : ` 좋은 인연은 ${self.name}님의 부족한 ${self.deficientElement} 기운을 자극이 아니라 편안함으로 채워 주는 쪽에 가깝습니다.`;
  return stripUnsafeText(`${sectionTitle} 보강 ${pass}단계에서는 결과를 단정하지 말고 관계의 순서를 다시 세워야 합니다. ${self.name}님의 ${self.monthPillar}는 현실 감각을 요구하고, ${self.dayPillar}는 가까운 사람에게 더 섬세한 안심을 원합니다.${partnerText} 그러므로 이 장의 조언은 상대를 바꾸는 것이 아니라, 감정이 올라오는 순간에 말의 온도와 행동의 반복을 조율하는 데 있습니다.`);
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

function buildLocalChapter(base, chapterTitle, chapterSubtitle, sectionTitles, mode, chapterNo) {
  const sections = sectionTitles.map((sectionTitle, idx) => ({
    id: `${String(idx + 1).padStart(2, "0")}`,
    title: stripUnsafeText(sectionTitle) || `세부 항목 ${idx + 1}`,
    body: buildProfessionalLoveSecretSectionText(base, chapterTitle, sectionTitle, mode, chapterNo, idx),
  }));
  for (let i = 0; i < sections.length; i += 1) {
    let body = clean(sections[i]?.body);
    let pass = 1;
    while (body.replace(/\s+/g, "").length < 760 && pass <= 3) {
      const addon = buildLoveSecretReinforcementText(base, mode, chapterNo, clean(sections[i]?.title || `세부 항목 ${i + 1}`), pass);
      body = stripUnsafeText(`${body}\n\n${addon}`);
      pass += 1;
    }
    sections[i].body = body;
  }
  const text = sections.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n");
  return {
    chapterTitle,
    chapterSubtitle,
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
        section.body = stripUnsafeText(`${body}\n\n${addon}`);
      }
    });

    while (chapterCharLength(chapter) < targetMin && sections.length) {
      const targetSection = sections[(chapterNo - 1) % sections.length];
      const addon = buildLoveSecretReinforcementText(base, mode, chapterNo, clean(targetSection?.title || "핵심 항목"), 2);
      targetSection.body = stripUnsafeText(`${clean(targetSection.body)}\n\n${addon}`);
      chapter.text = sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n");
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
    targetSection.body = stripUnsafeText(`${clean(targetSection.body)}\n\n${addon}`);
    chapter.text = sections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n");
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
  const coverTitle = mode === "compatibility" ? "궁합 비책 PDF" : "연애 비책 PDF";
  const rawCoverName = clean(meta?.name || "");
  const coverName = rawCoverName && !/[?�]/.test(rawCoverName) ? rawCoverName : "의뢰인";
  const coverBirth = [clean(meta?.birthDate), clean(meta?.birthTime)].filter(Boolean).join(" ");
  const generatedAt = clean(meta?.generatedAt || new Date().toISOString()).slice(0, 10);
  const eightCharacters = clean(meta?.eightCharacters || "");
  const tocHtml = (Array.isArray(chapters) ? chapters : []).map((chapter, index) => {
    const chapterNo = clean(chapter?.chapterNumber) || String(index + 1).padStart(2, "0");
    return `<li><span>${escapeLoveSecretHtml(chapterNo)}</span><strong>${escapeLoveSecretHtml(chapter?.title || "")}</strong></li>`;
  }).join("");
  const listBlock = (label, values) => {
    const items = loveSecretCleanList(values, 8);
    if (!items.length) return "";
    return `<div class="note"><strong>${escapeLoveSecretHtml(label)}</strong><ul>${items.map((item) => `<li>${escapeLoveSecretHtml(item)}</li>`).join("")}</ul></div>`;
  };
  const chapterHtml = (Array.isArray(chapters) ? chapters : []).map((chapter, index) => {
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
        listBlock("주의점", section?.caution),
      ].filter(Boolean).join("");
      return `<section><h3>${escapeLoveSecretHtml(section?.title || "연애 항목")}</h3>${paragraphs}${notes ? `<div class="notes">${notes}</div>` : ""}</section>`;
    }).join("");
    return `<article class="chapter" style="page-break-before:${index > 0 ? "always" : "auto"}"><header><span class="chapter-no">${escapeLoveSecretHtml(clean(chapter?.chapterNumber) || String(index + 1).padStart(2, "0"))}</span><h2>${escapeLoveSecretHtml(chapter?.title || "")}</h2><p>${escapeLoveSecretHtml(chapter?.subtitle || "")}</p></header>${sections}</article>`;
  }).join("");

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${escapeLoveSecretHtml(`${coverName}님의 ${coverTitle}`)}</title><style>@page{size:A4;margin:14mm;}body{font-family:"Noto Serif KR","Malgun Gothic",serif;margin:0;color:#25151f;background:#fff7fb;}main{padding:42px 48px;background:#fff;}header.cover{min-height:760px;box-sizing:border-box;padding:82px 56px;text-align:center;background:linear-gradient(135deg,#2a0618,#7a1748 58%,#3a071f);color:#fff;page-break-after:always;}header.cover .brand{font-size:12px;letter-spacing:.24em;opacity:.82;}header.cover h1{margin:96px 0 18px;font-size:42px;font-weight:700;letter-spacing:0;}header.cover .subtitle{font-size:17px;line-height:1.8;opacity:.9;}header.cover .person{margin-top:58px;font-size:20px;}header.cover .birth,header.cover .generated,header.cover .eight{font-size:13px;opacity:.8;margin-top:8px;}nav.toc{page-break-after:always;padding:54px 48px;background:#fff;}nav.toc h2{margin:0 0 22px;color:#6b123e;font-size:28px;}nav.toc ol{list-style:none;margin:0;padding:0;}nav.toc li{display:flex;gap:16px;border-bottom:1px solid #f1c9db;padding:12px 0;font-size:15px;}nav.toc span{width:42px;color:#be185d;font-weight:700;}article.chapter{padding:30px 0 20px;}article.chapter header{border-bottom:1px solid #efc2d7;margin-bottom:24px;padding-bottom:16px;}article.chapter h2{margin:8px 0 8px;color:#6b123e;font-size:26px;}article.chapter header p{margin:0;color:#7b4d65;font-size:14px;}article.chapter h3{margin:24px 0 10px;color:#8b1d52;font-size:17px;}article.chapter p{line-height:1.88;margin:0 0 13px;font-size:14px;}span.chapter-no{color:#be185d;font-size:12px;letter-spacing:.16em;}.notes{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 18px;page-break-inside:avoid;}.note{border:1px solid #f1c9db;background:#fff7fb;padding:11px 12px;border-radius:6px;}.note strong{display:block;margin-bottom:6px;color:#7a1748;font-size:12px;}.note ul{margin:0;padding-left:16px;}.note li{font-size:12px;line-height:1.6;margin:0 0 4px;}</style></head><body><header class="cover"><div class="brand">CODE DESTINY PREMIUM</div><h1>${escapeLoveSecretHtml(coverTitle)}</h1><div class="subtitle">사주 원국과 관계의 흐름으로 읽는<br>전문 연애 상담 리포트</div><div class="person">${escapeLoveSecretHtml(coverName)}</div><div class="birth">${escapeLoveSecretHtml(coverBirth)}</div><div class="generated">생성 기준일 ${escapeLoveSecretHtml(generatedAt)}</div>${eightCharacters ? `<div class="eight">사주 8글자 ${escapeLoveSecretHtml(eightCharacters)}</div>` : ""}</header><nav class="toc"><h2>목차</h2><ol>${tocHtml}</ol></nav><main>${chapterHtml}</main></body></html>`;
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
  const title = normalizedMode === "compatibility" ? "사주 궁합 비책" : "사주 연애 비책";
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

function buildLoveSecretSuccessPayload({ featureKey, mode, sessionId, reportId, chapterCount, fallbackUsed, manuscriptSource, chapters, pdfReady, loveSecretMasterJson, masterJsonValidation, loveSecretFacts, loveSecretChapterPlans, llmEnhancement }) {
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
          stage: ["solo", "compatibility"].includes(normalizeMode(mode)) ? "llm_draft_building" : "local_draft_building",
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
              stage: completed >= progressTotal ? "manuscript_quality_validation" : (["solo", "compatibility"].includes(normalizeMode(mode)) ? "llm_draft_building" : "local_draft_building"),
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
      fallbackUsed = true;
      manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
      console.warn("[LoveBookPremiumPDF][FinalLocalRecoveryUsed]", {
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
    const pdfReady = buildLoveSecretPdfReady(clean(job?.requestOrigin || ""), reportId, finalChapters, base, mode);
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
          payload: { mode, chapterCount: totalChapters, pdfReady, loveSecretMasterJson, masterJsonValidation, loveSecretFacts, loveSecretChapterPlans: summarizeLoveSecretChapterPlans(loveSecretChapterPlans), llmEnhancement },
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
    fallbackUsed = true;
    manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
    console.warn("[LoveBookPremiumPDF][FinalLocalRecoveryUsed]", {
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
  const pdfReady = buildLoveSecretPdfReady(request, reportId, finalChapters, base, mode);
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
      payload: { mode, chapterCount: totalChapters, pdfReady, loveSecretMasterJson, masterJsonValidation, loveSecretFacts, loveSecretChapterPlans: summarizeLoveSecretChapterPlans(loveSecretChapterPlans), llmEnhancement },
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
    const manuscriptSource = clean(directManuscriptSource) || LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;

    const finalChapters = reinforceLoveSecretChapters(
      chapters.map((chapter) => ({ ...chapter, source: manuscriptSource })),
      mode,
      config,
      base,
    );
    const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `love-secret-${Date.now().toString(36)}`);
    const pdfReady = buildLoveSecretPdfReady(request, reportId, finalChapters, base, mode);
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
      loveSecretMasterJson,
      masterJsonValidation,
      loveSecretFacts,
      loveSecretChapterPlans,
      llmEnhancement,
    });

    resolveLoveSecretLock(sessionId, "done", "");

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
          payload: { mode, chapterCount: directChapterCount, pdfReady, loveSecretMasterJson, masterJsonValidation, loveSecretFacts, loveSecretChapterPlans: summarizeLoveSecretChapterPlans(loveSecretChapterPlans), llmEnhancement },
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
  safeModeChapterConfig,
  buildLoveSecretChapters,
  reinforceLoveSecretChapters,
  validateLoveSecretManuscript,
  buildSoloLoveLLMInput,
  buildCompatibilityLoveLLMInput,
  buildLoveSecretMasterJson,
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
  buildLoveSecretPdfReady,
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
