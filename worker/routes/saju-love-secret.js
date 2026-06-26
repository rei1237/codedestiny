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
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import { generateLoveSecretPremiumPdfV2 } from "../lib/pdf-v2/love-secret/create-love-secret-premium-pdf-job.js";
import { LOVE_SECRET_LLM_VERSION, normalizeLoveSecretMode } from "../lib/pdf-v2/love-secret/love-secret-premium.types.js";
import { LOVE_SECRET_COMPATIBILITY_CHAPTERS, LOVE_SECRET_SOLO_CHAPTERS } from "../lib/pdf-v2/love-secret/love-secret-premium.chapter-plan.js";

const LOVE_SECRET_SERVICE_KEY = "saju-love-secret";
const LOVE_SECRET_FEATURE_KEY_BY_MODE = Object.freeze({
  solo: "premium_pdf_saju_love_secret",
  compatibility: "premium_pdf_saju_love_secret_compat",
});
const LOVE_SECRET_JOB_COLLECTION = "premium_report_jobs";

const LOVE_SECRET_JOB_POLL_AFTER_MS = 4000;
const LOVE_SECRET_LOCK_TTL_MS = 1000 * 60 * 20;
const LOVE_SECRET_GENERATION_LOCKS = new Map();
const LOVE_SECRET_PDF_CONFIG = Object.freeze({
  generationMode: "llm-only",
  provider: "gemini-workers-ai-llm-retry",
  templateVersion: LOVE_SECRET_LLM_VERSION,
  qualityMode: "premium",
});
const LOVE_SECRET_FORBIDDEN_RE = /\b(?:fallback|payload|json|schema|debug|internal\s*server\s*error|object|undefined|null|nan|calculationmode|recovered|about:blank|raw)\b|자동\s*복구\s*생성|chapter\s*1\s*chapter\s*1|데이터가\s*부족합니다|로컬\s*엔진|계산\s*시그니처|내부\s*데이터|엔진\s*결과|데이터\s*정규화|품질\s*검증|재생성/gi;
const LOVE_SECRET_MANUSCRIPT_SOURCE = Object.freeze({
  PREMIUM: "love-secret-premium-llm-only",
});
const LOVE_SECRET_PRODUCT_ID = "love_secret";

const LOVE_SECRET_PDF_CACHE = new Map();
const LOVE_SECRET_PDF_CACHE_MAX = 120;
const LOVE_SECRET_SOLO_CHAPTER_IDS = Object.freeze([
  ...LOVE_SECRET_SOLO_CHAPTERS.map((chapter) => chapter.id),
]);
const LOVE_SECRET_COMPATIBILITY_CHAPTER_IDS = Object.freeze([
  ...LOVE_SECRET_COMPATIBILITY_CHAPTERS.map((chapter) => chapter.id),
]);


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
    totalChapters: 10,
    minTotalChars: 36000,
    chapterMinDefault: 3000,
    chapterMinByIndex: loveSecretChapterMins(10, 3000),
    chapters: LOVE_SECRET_CANONICAL_COMPAT_CHAPTERS.slice(0, 10),
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
      "올해 세운이 연애 흐름에 주는 영향",
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
      "올해 인연운이 움직이는 달",
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

function normalizeMode(rawMode, options = {}) {
  return normalizeLoveSecretMode(rawMode, { allowDefault: options.allowDefault !== false });
}

function normalizeRequestMode(rawMode) {
  return normalizeLoveSecretMode(rawMode, { allowDefault: false });
}

function toConfigMode(mode) {
  return mode === "compatibility" ? "couple" : "solo";
}

function toFeatureKey(mode) {
  const normalized = normalizeMode(mode);
  return LOVE_SECRET_FEATURE_KEY_BY_MODE[normalized] || LOVE_SECRET_FEATURE_KEY_BY_MODE.solo;
}

function inferLoveSecretModeFromReportId(reportId) {
  const value = clean(reportId).toLowerCase();
  return value.includes("compat") || value.includes("couple") ? "compatibility" : "solo";
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

const LOVE_SECRET_PHASE6_SOLO_SECTIONS = Object.freeze({
  1: Object.freeze(["일간으로 보는 사랑의 기본 기질", "일지 배우자궁의 친밀감 본능", "월지가 만드는 현실 연애 조건", "오행 균형과 애정 에너지", "사랑에서 지켜야 할 핵심 기준"]),
  2: Object.freeze(["사랑을 시작하는 방식", "호감이 생길 때의 표현", "관계를 유지하는 기본 태도", "십성으로 보는 애정 욕구", "나를 편안하게 하는 관계 조건"]),
  3: Object.freeze(["내가 반복해서 끌리는 사람", "배우자성이 반응하는 매력", "도화와 신살이 만드는 끌림", "설렘과 불안을 구분하는 기준", "좋은 인연을 알아보는 현실 신호"]),
  4: Object.freeze(["가까워질수록 드러나는 모습", "친밀감을 느끼는 속도", "거리감이 생기는 순간", "조후로 보는 애정 온도", "편안한 스킨십과 생활 리듬"]),
  5: Object.freeze(["감정을 표현하는 말의 결", "침묵하거나 참는 이유", "서운함을 전하는 순서", "오해를 줄이는 질문", "관계를 여는 대화 루틴"]),
  6: Object.freeze(["갈등이 시작되는 반복 구조", "상처받을 때 보이는 반응", "이별 신호가 강해지는 순간", "재회를 바랄 때 구분할 조건", "같은 패턴을 끊는 회복 행동"]),
  7: Object.freeze(["나에게 맞는 배우자상", "결혼으로 안정되는 부분", "장기 관계에서 조율할 현실 조건", "생활 리듬과 책임감", "오래 가는 관계의 약속"]),
  8: Object.freeze(["좋은 인연이 들어오기 쉬운 대운", "올해 세운이 여는 연애 기회", "월운으로 보는 만남과 조율", "조심해야 할 관계 전환점", "타이밍을 현실 행동으로 쓰는 법"]),
  9: Object.freeze(["살려야 할 매력", "관리해야 할 약점", "피해야 할 상대 유형", "만나야 할 사람의 조건", "나에게 맞는 연애 선택 기준"]),
  10: Object.freeze(["내 연애의 핵심 한 문장", "오늘부터 줄일 반복 반응", "오늘부터 늘릴 관계 행동", "30일 연애 회복 루틴", "품격 있는 사랑의 최종 기준"]),
});

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

const LOVE_SECRET_PHASE7_COMPAT_SECTIONS = Object.freeze({
  1: Object.freeze(["두 사람의 관계 코드 한 줄", "일간과 일지의 첫 맞물림", "처음 느껴지는 분위기", "관계 강점과 약점", "궁합을 살리는 기본 태도"]),
  2: Object.freeze(["서로에게 반응하는 이유", "첫 끌림을 만든 오행 신호", "호감이 커지는 조건", "처음부터 조심할 기대", "설렘을 안정감으로 바꾸는 법"]),
  3: Object.freeze(["감정 속도의 차이", "정서적 안정감을 주는 부분", "불안이 커지는 지점", "서로의 마음을 안심시키는 말", "감정 궁합을 지키는 루틴"]),
  4: Object.freeze(["말이 잘 통하는 부분", "오해가 생기는 말의 결", "침묵이 생기는 이유", "서운함을 확인하는 순서", "대화를 회복하는 문장"]),
  5: Object.freeze(["갈등이 시작되는 원인", "싸울 때 각자 보이는 반응", "충돌이 커지는 금지 문장", "화해가 어려워지는 패턴", "갈등을 줄이는 현실 약속"]),
  6: Object.freeze(["다시 가까워지는 순서", "사과보다 중요한 다음 행동", "서로의 방어를 낮추는 말", "관계 개선을 위한 작은 약속", "회복력을 키우는 30일 행동"]),
  7: Object.freeze(["돈과 소비 감각의 차이", "생활 리듬의 궁합", "일과 사랑의 우선순위", "현실 문제가 사랑에 주는 영향", "일상 리듬을 맞추는 조율법"]),
  8: Object.freeze(["오래 갈 수 있는 관계 조건", "결혼 현실성의 강점", "책임과 역할 분담", "생활 속에서 드러날 차이", "장기 관계로 가기 위한 약속"]),
  9: Object.freeze(["올해 두 사람의 관계 운", "가까워지기 좋은 시기", "조심해야 할 전환점", "월운으로 보는 관계 운영", "타이밍을 살리는 공동 행동"]),
  10: Object.freeze(["두 사람의 최종 궁합 메시지", "반드시 살려야 할 강점", "반드시 피해야 할 습관", "30일 관계 개선 루틴", "앞으로의 선택 기준"]),
});

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

function firstLoveSecretText(...values) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function loveSecretCurrentTargetYear() {
  const year = new Date().getFullYear();
  return Number.isFinite(year) && year >= 2026 ? year : 2026;
}

function resolveLoveSecretTargetYear(value) {
  const currentYear = loveSecretCurrentTargetYear();
  const requestedYear = Number(value);
  if (Number.isFinite(requestedYear) && requestedYear >= currentYear && requestedYear <= currentYear + 3) return requestedYear;
  return currentYear;
}

function normalizeLoveSecretGenerationBody(body = {}, mode = "solo", base = {}) {
  const raw = body && typeof body === "object" ? body : {};
  const serviceContext = raw.serviceContext && typeof raw.serviceContext === "object" ? raw.serviceContext : {};
  const relationshipContext = raw.relationshipContext && typeof raw.relationshipContext === "object" ? raw.relationshipContext : {};
  const normalizedMode = normalizeMode(mode);
  const source = { ...serviceContext, ...relationshipContext, ...raw };
  const targetYear = resolveLoveSecretTargetYear(source.targetYear);
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
    chapterCount: 10,
    selfName,
    partnerName: isCompatibility ? partnerName : "",
    assemblyContract: "love-secret-master-json.v1",
    ...(raw.clientFlow && typeof raw.clientFlow === "object" ? raw.clientFlow : {}),
  };
  const marriageEnabled = source.wantsMarriageAnalysis !== false && source.includeMarriageAnalysis !== false;
  const reunionEnabled = source.wantsReunionAnalysis !== false && source.includeReunionAnalysis !== false;
  const contract = {
    mode: normalizedMode,
    targetYear,
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

  const isTimeUnknown = Boolean(src.unknownTime || src.isTimeUnknown || src.timeUnknown);
  let timeInfo = parseLoveSecretBirthTime(src.birthTime || src.time, src.birthHour ?? src.hour, src.birthMinute ?? src.minute);
  if (!timeInfo.ok && isTimeUnknown) {
    timeInfo = { ok: true, hour: 12, minute: 0, birthTime: "12:00" };
  }
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
      unknownTime: isTimeUnknown,
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
        unknownTime: Boolean(birthInput.unknownTime || birthInput.isTimeUnknown || birthInput.timeUnknown),
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
      unknownTime: Boolean(birthInput.unknownTime || birthInput.isTimeUnknown || birthInput.timeUnknown),
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




const LOVE_SECRET_ASSERTIVE_RE = /(무조건|반드시\s*결혼|반드시\s*헤어|반드시\s*재회|100\s*%|운명의\s*상대다|확정|필연적으로|절대\s*헤어지지|반드시\s*만난다|절대\s*안\s*맞는다)/i;
const LOVE_SECRET_EXPLICIT_INTIMACY_RE = /(성행위|섹스|삽입|성기|노골적|음란|애무|체위|오르가즘|자위)/i;
const LOVE_SECRET_PARTNER_BLAME_RE = /(집착이\s*심하다|바람기가\s*있다|배신할\s*사람|문제\s*있는\s*상대|위험한\s*사람|나쁜\s*상대|피해야\s*할\s*인간)/i;





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

function loveSecretUniqueCategoryList(value, limit = 12) {
  const list = Array.isArray(value) ? value : [];
  const result = [];
  const seen = new Set();
  for (const item of list) {
    const text = loveSecretSafeDisplayText(item);
    const key = text.replace(/\s+/g, "");
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
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

function buildLoveSecretMasterPersonJson(base = {}, targetYear = loveSecretCurrentTargetYear()) {
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

function buildLoveSecretMasterJson({ base = {}, mode = "solo", body = {}, targetYear = loveSecretCurrentTargetYear() } = {}) {
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
  const raw = body && typeof body === "object" ? body : {};
  const serviceContext = raw.serviceContext && typeof raw.serviceContext === "object" ? raw.serviceContext : {};
  const relationshipContext = raw.relationshipContext && typeof raw.relationshipContext === "object" ? raw.relationshipContext : {};
  const source = { ...serviceContext, ...relationshipContext, ...raw };
  const contextHash = loveSecretHashValue({
    targetYear: resolveLoveSecretTargetYear(source.targetYear),
    loveStatus: firstLoveSecretText(source.loveStatus, source.relationshipStatus, source.currentLoveStatus),
    currentConcern: firstLoveSecretText(source.currentConcern, source.concern, source.question),
    idealType: firstLoveSecretText(source.idealType, source.preferredPartner),
    pastLovePattern: firstLoveSecretText(source.pastLovePattern, source.relationshipPattern),
    desiredOutcome: firstLoveSecretText(source.desiredOutcome),
    relationshipType: firstLoveSecretText(source.relationshipType, source.status),
    wantsMarriageAnalysis: source.wantsMarriageAnalysis !== false && source.includeMarriageAnalysis !== false,
    wantsReunionAnalysis: source.wantsReunionAnalysis !== false && source.includeReunionAnalysis !== false,
  });
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
      contextHash,
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
    contextHash,
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
    if (/새로\s*계산|다시\s*계산|제가\s*계산|내가\s*계산|JSON|API|스키마|프롬프트/i.test(sentence)) return false;
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

















function loveSecretCategoryCovered(category, text) {
  const haystack = clean(text).replace(/\s+/g, "");
  const compactCategory = clean(category).replace(/\s+/g, "");
  if (compactCategory && haystack.includes(compactCategory)) return true;
  const tokens = clean(category).split(/[\s,·]+/).map((token) => token.replace(/[^\w가-힣]/g, "")).filter((token) => token.length >= 2);
  return tokens.some((token) => haystack.includes(token));
}

function safeModeChapterConfig(mode) {
  const key = toConfigMode(mode);
  const config = LOVE_SECRET_CANONICAL_MODE_CONFIG[key] || LOVE_SECRET_MODE_CONFIG[key] || LOVE_SECRET_CANONICAL_MODE_CONFIG.solo;
  if (key === "couple") {
    return {
      ...config,
      title: "사주 궁합 비책",
      totalChapters: 13,
      minTotalChars: 19500,
      chapterMinDefault: 3000,
      chapterMinByIndex: loveSecretChapterMins(13, 1500),
      chapters: LOVE_SECRET_COMPATIBILITY_CHAPTERS.map((chapter) => ({ title: chapter.title, subtitle: chapter.purpose })),
    };
  }
  if (key !== "solo") return config;
  return {
    ...config,
    title: "사주 연애 비책",
    totalChapters: 10,
    minTotalChars: 15000,
    chapterMinDefault: 1500,
    chapterMinByIndex: loveSecretChapterMins(10, 1500),
    chapters: LOVE_SECRET_SOLO_CHAPTERS.map((chapter) => ({ title: chapter.title, subtitle: chapter.purpose })),
  };
}

function getChapterSpecificSections(body, chapterNo, mode) {
  const input = Array.isArray(body?.chapterSpecificSections) ? body.chapterSpecificSections : [];
  const cleanedInput = input.map((v) => stripUnsafeText(v)).filter(Boolean);
  if (cleanedInput.length) return cleanedInput.slice(0, ["solo", "compatibility"].includes(normalizeMode(mode)) ? 12 : 5);
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
    return loveSecretTextVariant(`${contextLabel}:${label}:strong-tone`, [
      `${contextLabel}에서는 강하게 드러나는 기운을 짧게 단정하지 않고, 매력으로 살아나는 장면과 부담으로 번지는 장면을 함께 봅니다. 힘이 충분한 항목은 관계를 밀고 가는 추진력이 되지만, 상대의 속도를 듣지 않으면 압박처럼 느껴질 수 있으므로 표현의 양보다 온도 조절이 중요합니다.`,
      `${contextLabel}에서는 기운이 앞서 나갈 때의 장점과 무리하게 밀어붙일 때의 부담을 분리해야 합니다. 관계를 주도하는 힘은 분명한 매력이지만, 상대가 숨 쉴 여지를 함께 남겨야 사랑의 온도가 오래 유지됩니다.`,
      `${contextLabel}의 강한 흐름은 사랑을 선명하게 시작하게 하지만, 같은 힘이 확인 요구나 조급함으로 바뀌면 관계가 쉽게 피로해집니다. 그래서 이 대목은 표현의 크기보다 받아들일 수 있는 속도를 함께 읽어야 합니다.`,
      `${contextLabel}에서는 주도성이 매력으로 보이는 순간과 압박으로 느껴지는 순간을 나누어 봅니다. 힘 있는 명식일수록 다정함은 더 크게 말하는 것이 아니라 상대의 박자에 맞춰 조절하는 데서 살아납니다.`,
    ]);
  }
  if (isWeak) {
    return loveSecretTextVariant(`${contextLabel}:${label}:weak-tone`, [
      `${contextLabel}에서는 약하게 드러나는 기운을 결핍으로 낙인찍기보다 보완 가능한 습관으로 다룹니다. 부족한 항목은 상대에게 전부 맡기기보다, 말의 순서와 만남의 리듬, 감정 확인 방식을 작게 정해 반복할 때 안정적으로 채워집니다.`,
      `${contextLabel}에서 부족하게 보이는 기운은 사랑의 실패 조건이 아니라 관계를 천천히 안전하게 만드는 과제입니다. 먼저 기대를 낮추는 것이 아니라 필요한 안정 행동을 구체적으로 말하는 연습이 필요합니다.`,
      `${contextLabel}의 약한 흐름은 상대에게 기대고 싶은 마음으로 나타날 수 있습니다. 이때 중요한 것은 의존을 숨기는 일이 아니라, 부탁과 기준을 부드럽게 나누어 관계가 무겁게 흐르지 않게 하는 것입니다.`,
      `${contextLabel}에서는 모자란 기운을 상대에게 전부 채우라고 요구하지 않는 태도가 중요합니다. 작은 루틴, 짧은 확인, 반복 가능한 약속이 쌓일수록 관계의 안정감이 살아납니다.`,
    ]);
  }
  return loveSecretTextVariant(`${contextLabel}:${label}:balanced-tone`, [
    `${contextLabel}에서는 균형에 가까운 항목을 과장하지 않고, 상황에 따라 강해지는 반응과 조용히 물러나는 반응을 나누어 봅니다.`,
    `${contextLabel}에서는 한쪽으로 치우치지 않는 장점을 살리되, 애매하게 미루는 태도가 되지 않도록 선택 기준을 분명히 세웁니다.`,
    `${contextLabel}의 균형감은 관계를 부드럽게 만들지만, 중요한 순간에는 마음을 숨기지 않는 선명함도 필요합니다.`,
  ]);
}

function loveSecretRelationManagementLine(relationHint = "", mode = "solo", contextLabel = "관계") {
  const normalizedMode = normalizeMode(mode);
  const base = normalizedMode === "compatibility"
    ? loveSecretTextVariant(`${contextLabel}:compat-relation-base`, [
      "합, 충, 형, 파, 해, 삼합, 방합 같은 관계성은 좋은 궁합과 나쁜 궁합을 가르는 판정이 아니라 두 사람이 어떤 방식으로 가까워지고 예민해지는지를 드러내는 작동 원리입니다.",
      "궁합의 관계성은 맞다 틀리다의 결론보다 가까워지는 속도, 부딪히는 방식, 회복되는 순서를 알려 주는 지도에 가깝습니다.",
      "두 사람의 합충형파해는 운명적 판정이 아니라 서로의 반응을 번역하는 언어입니다. 강하게 끌리는 지점과 예민해지는 지점을 함께 봐야 조율이 가능합니다.",
    ])
    : loveSecretTextVariant(`${contextLabel}:solo-relation-base`, [
      "합, 충, 형, 파, 해, 삼합, 방합 같은 관계성은 운을 단정하는 표지가 아니라 마음이 움직이는 방식과 관리해야 할 반응을 알려 주는 참고점입니다.",
      "관계성 신호는 좋은 사람을 정해 주는 답안이 아니라 내가 어떤 상황에서 빠르게 끌리고 어디서 방어가 생기는지를 드러내는 단서입니다.",
      "사주의 관계 흐름은 인연의 이름표가 아니라 마음의 반응 속도와 선택 습관을 읽는 참고점으로 다루어야 합니다.",
    ]);
  const management = loveSecretTextVariant(`${contextLabel}:relation-management`, [
    "끌림이 강하면 속도를 조절하고, 긴장이 생기면 말의 순서와 거리감을 먼저 조정하는 방식으로 다루는 것이 좋습니다.",
    "관계가 흔들릴 때는 결론을 앞세우기보다 확인할 사실, 말해야 할 감정, 부탁할 행동을 나누어 보는 편이 안전합니다.",
    "좋은 흐름을 오래 쓰려면 강한 반응을 바로 행동으로 옮기기보다 상대가 받아들일 수 있는 온도로 낮추는 과정이 필요합니다.",
    "예민한 지점이 보일수록 단정 대신 관찰, 판단 대신 요청, 침묵 대신 짧은 확인 문장으로 관계를 살리는 편이 좋습니다.",
  ]);
  const intimacySafety = loveSecretTextVariant(`${contextLabel}:intimacy-safety`, [
    "정서적 거리감과 친밀감의 속도는 애정의 크기가 아니라 안심의 리듬으로 조율합니다.",
    "가까워지는 속도는 사랑의 증거가 아니라 서로의 경계와 편안함이 맞아 가는 과정으로 보아야 합니다.",
    "친밀감은 빠르게 확인할수록 좋은 항목이 아니라, 두 사람이 안전하다고 느끼는 거리에서 자연스럽게 깊어지는 흐름입니다.",
  ]);
  return [base, clean(relationHint), management, intimacySafety].filter(Boolean).join(" ");
}

function loveSecretThreePointGuidance(sectionTitle, sectionTone, contextLabel) {
  return loveSecretTextVariant(`${contextLabel}:${sectionTitle}:three-point`, [
    `${sectionTitle}에서는 빠른 결론보다 세 가지 확인이 필요합니다. 감정이 올라왔을 때 바로 판정하지 않는 것, 상대의 말보다 반복 행동을 보는 것, 내가 원하는 사랑의 형태를 ${sectionTone} 전하는 것입니다.`,
    `${sectionTitle}를 현실에서 다룰 때는 마음의 크기, 상대의 반복 행동, 내가 지킬 기준을 따로 보아야 합니다. 이 세 가지가 나뉘면 불필요한 확인 요구가 줄어듭니다.`,
    `${sectionTitle}의 실전 기준은 간단합니다. 지금 느끼는 감정이 사실인지, 상대의 행동이 반복되는지, 내가 원하는 방향을 ${sectionTone} 말했는지를 차례로 확인합니다.`,
    `${sectionTitle}에서는 설렘, 불안, 기대를 한 문장에 섞지 않는 것이 중요합니다. 감정은 인정하고, 사실은 확인하며, 요청은 작게 말할수록 관계가 안정됩니다.`,
  ]);
}

function loveSecretChapterSpecs(mode = "solo") {
  const normalizedMode = normalizeMode(mode);
  const config = safeModeChapterConfig(normalizedMode);
  const chapters = Array.isArray(config?.chapters) ? config.chapters : [];
  return chapters.map((chapter, index) => {
    const categories = getChapterSpecificSections({}, index + 1, normalizedMode);
    return {
      number: clean(chapter?.number || String(index + 1)),
      title: clean(chapter?.title || `love secret ${index + 1}`),
      subtitle: clean(chapter?.subtitle || ""),
      focus: clean(chapter?.focus || chapter?.title || ""),
      categories: categories.length ? categories : Array.from(LOVE_SECRET_REQUIRED_SECTIONS),
    };
  });
}

const LOVE_SECRET_TEXT_MOJIBAKE_RE = /[\uFFFD\uF900-\uFAFF]|[?][\uAC00-\uD7A3]|[\u3131-\u318E]{2,}/;
const LOVE_SECRET_TEXT_FORBIDDEN_RE = /\b(?:undefined|null|nan|json|schema|debug|prompt|raw|payload|object|template|internal\s*server\s*error|about:blank)\b|\[object Object\]/i;

function loveSecretSafeDisplayText(value, fallback = "") {
  const text = clean(value).replace(/\s+/g, " ").trim();
  if (!text || LOVE_SECRET_TEXT_MOJIBAKE_RE.test(text) || LOVE_SECRET_TEXT_FORBIDDEN_RE.test(text)) return fallback;
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

function buildLoveSecretConsultationContext(body = {}, mode = "solo", base = {}) {
  const normalized = normalizeLoveSecretGenerationBody(body, mode, base);
  return {
    loveStatus: loveSecretSafeDisplayText(normalized.loveStatus, normalizeMode(mode) === "compatibility" ? "관계의 흐름을 확인하는 상태" : "사랑의 흐름을 점검하는 상태"),
    currentConcern: loveSecretSafeDisplayText(normalized.currentConcern, "지금 가장 궁금한 사랑의 방향"),
    idealType: loveSecretSafeDisplayText(normalized.idealType, "마음이 편안해지는 상대"),
    pastLovePattern: loveSecretSafeDisplayText(normalized.pastLovePattern, "반복되는 관계 습관"),
    desiredOutcome: loveSecretSafeDisplayText(normalized.desiredOutcome, "관계를 더 분명하고 안정적으로 만드는 것"),
    relationshipType: loveSecretSafeDisplayText(normalized.relationshipType, normalizeMode(mode) === "compatibility" ? "서로의 관계 가능성을 확인하는 흐름" : "개인의 연애 흐름"),
    targetYear: resolveLoveSecretTargetYear(normalized.targetYear),
  };
}

function buildLoveSecretConsultationFacts(base = {}, mode = "solo", body = {}) {
  const normalizedMode = normalizeMode(mode);
  const context = buildLoveSecretConsultationContext(body, normalizedMode, base);
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
  const dominantTenGod = loveSecretSafeDisplayText(base?.tenGods?.dominantTenGod || base?.tenGods?.topTenGods?.[0]?.name, "관계 중심성");
  const partnerDominantTenGod = loveSecretSafeDisplayText(base?.partner?.tenGods?.dominantTenGod || base?.partner?.tenGods?.topTenGods?.[0]?.name, "상대 관계 중심성");
  const gender = normalizeLoveSecretGender(base?.user?.gender);
  const partnerGender = normalizeLoveSecretGender(base?.partner?.user?.gender);
  const spouseStar = gender === "M" ? "재성" : gender === "F" ? "관성" : "배우자성";
  const partnerSpouseStar = partnerGender === "M" ? "재성" : partnerGender === "F" ? "관성" : "상대 배우자성";
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
    dominantTenGod,
    partnerDominantTenGod,
    spouseStar,
    partnerSpouseStar,
    strengthLabel: loveSecretSafeDisplayText(base?.strength?.label, "균형형"),
    ...context,
  };
}

function loveSecretCategoryKind(category = "") {
  const text = clean(category);
  if (/한난조습|조후|친밀|속궁합|스킨십|밀착|정서적 온도|거리감|가까워질수록/.test(text)) return "intimacy";
  if (/대운|세운|월운|올해|시기|달|타이밍|전환점|흐름이 열리는/.test(text)) return "timing";
  if (/두 일간|일간 궁합|핵심 궁합|궁합 한 문장|궁합 처방|두 사람|서로|함께|각자/.test(text)) return "compatibility";
  if (/원하는 것|기대|역할|책임|표현력|공감/.test(text)) return "tenGod";
  if (/서운|불안|안심받|집착|질투|비교|버림|회피|방어|애착/.test(text)) return "anxiety";
  if (/일간|자아|기질|기본 성향/.test(text)) return "dayMaster";
  if (/일지|배우자궁|관계 본능|관계의 뿌리|생활 밀착/.test(text)) return "spousePalace";
  if (/월지|계절감|생활 리듬|일상|리듬/.test(text)) return "monthBranch";
  if (/오행|용신|희신|기운|균형|한난조습|조후|온도|습한|건조|차가운|뜨거운/.test(text)) return "element";
  if (/십성|비겁|식상|재성|관성|인성|역할|책임|표현력|공감/.test(text)) return "tenGod";
  if (/배우자성|배우자|결혼|장기|오래|가족|돈|소비|현실|생활 계획/.test(text)) return "longTerm";
  if (/끌림|호감|매력|도화|홍염|문창|역마|첫인상|분위기|설렘/.test(text)) return "attraction";
  if (/표현|소통|말|연락|대화|침묵|사과|화해 문장|확인 문장/.test(text)) return "communication";
  if (/불안|집착|질투|비교|버림|확인받|회피|방어|애착/.test(text)) return "anxiety";
  if (/갈등|싸울|상처|금지 문장|충돌|부딪/.test(text)) return "conflict";
  if (/이별|재회|미련|정리|회복|새로운 사랑/.test(text)) return "reunion";
  if (/두 사람|궁합|서로|함께|각자/.test(text)) return "compatibility";
  if (/계획|루틴|90일|30일|행동|마스터플랜|최종|원칙|기준/.test(text)) return "plan";
  return "general";
}

function loveSecretTimingEvidenceHints(category = "", facts = {}) {
  const title = clean(category);
  const selfDay = loveSecretSafeDisplayText(facts.selfDayMaster, "일간");
  const partnerDay = loveSecretSafeDisplayText(facts.partnerDayMaster, "");
  const month = loveSecretSafeDisplayText(facts.monthBranch, "월지");
  const partnerMonth = loveSecretSafeDisplayText(facts.partnerMonthBranch, "");
  const targetYear = loveSecretSafeDisplayText(facts.targetYear, "올해");
  const dominantElement = loveSecretSafeDisplayText(facts.dominantElement, "우세 기운");
  const usefulElements = loveSecretSafeDisplayText(facts.usefulElements, "보완 기운");
  const cautionElements = loveSecretSafeDisplayText(facts.cautionElements, "주의 기운");
  const spouseStar = loveSecretSafeDisplayText(facts.spouseStar, "배우자성");

  if (/조심|전환|주의/.test(title)) return ["전환점 경계 신호", `${cautionElements} 과열 조절`, `${month} 거리 조절`];
  if (/가까워|만남|열리는/.test(title)) return ["접근 리듬 확장", `${dominantElement} 설렘 확장`, `${month} 만남 박자`];
  if (/결정|선택|확정|유리한 때/.test(title)) return ["결정 문턱 신호", `${spouseStar} 약속 판단`, `${targetYear}년 선택 창`];
  if (/엇갈|각자|속도/.test(title)) return ["속도 차 조율", `${selfDay}${partnerDay ? `/${partnerDay}` : ""} 반응 차`, `${month}${partnerMonth ? `/${partnerMonth}` : ""} 생활 박자`];
  if (/함께|공동/.test(title)) return ["공동 루틴 운용", `${usefulElements} 합산 보완`, `${dominantElement} 협력 기운`];
  if (/두 사람/.test(title)) return ["연간 궁합 흐름", `${selfDay}${partnerDay ? `/${partnerDay}` : ""} 관계 합`, `${targetYear}년 관계 합`];
  if (/올해|연애운|관계 운/.test(title)) return ["연간 개인 관계 주제", `${selfDay} 선택 운`, `${targetYear}년 감정 운용`];
  if (/타이밍|시기/.test(title)) return ["타이밍 운용 기준", `${month} 실행 박자`, `${usefulElements} 행동 보완`];
  return ["시기 운영 기준", `${targetYear}년 흐름`, `${month} 현실 박자`];
}

function loveSecretCompatibilityEvidenceHints(category = "", facts = {}) {
  const title = clean(category);
  const selfDay = loveSecretSafeDisplayText(facts.selfDayMaster, "내 일간");
  const partnerDay = loveSecretSafeDisplayText(facts.partnerDayMaster, "상대 일간");
  const usefulElements = loveSecretSafeDisplayText(facts.usefulElements, "보완 기운");
  const dominantElement = loveSecretSafeDisplayText(facts.dominantElement, "내 기운");
  const partnerDominantElement = loveSecretSafeDisplayText(facts.partnerDominantElement, "상대 기운");

  if (/각자|엇갈|속도/.test(title)) return ["각자의 운 속도", `${selfDay}/${partnerDay} 반응 차`, "엇갈림 조율 기준"];
  if (/함께|공동/.test(title)) return ["공동 운용 방식", `${usefulElements} 공동 보완`, "함께 지킬 관계 루틴"];
  if (/두 사람|서로|궁합/.test(title)) return ["두 사람의 관계 합", `${dominantElement}/${partnerDominantElement} 기운 교차`, "상호 안심 기준"];
  return ["궁합 운영 기준", `${selfDay}/${partnerDay} 반응 합`, "관계 조율 신호"];
}

function loveSecretKoreanParticle(value, withFinal, withoutFinal) {
  const chars = Array.from(clean(value)).reverse();
  const last = chars.find((char) => {
    const code = char.charCodeAt(0);
    return code >= 0xAC00 && code <= 0xD7A3;
  });
  if (!last) return withFinal;
  return ((last.charCodeAt(0) - 0xAC00) % 28) > 0 ? withFinal : withoutFinal;
}

function loveSecretWithParticle(value, withFinal, withoutFinal) {
  const text = loveSecretSafeDisplayText(value, "");
  if (!text) return "";
  return `${text}${loveSecretKoreanParticle(text, withFinal, withoutFinal)}`;
}

function loveSecretPair(left, right) {
  const a = loveSecretSafeDisplayText(left, "");
  const b = loveSecretSafeDisplayText(right, "");
  if (!a && !b) return "";
  if (!a) return b;
  if (!b) return a;
  return `${loveSecretWithParticle(a, "과", "와")} ${b}`;
}

function loveSecretQuotedLabel(value, label) {
  const text = loveSecretSafeDisplayText(value, "");
  const suffix = loveSecretSafeDisplayText(label, "질문");
  if (!text) return suffix;
  if (suffix === "질문") return `"${text}"라는 ${suffix}`;
  return `"${text}"${loveSecretKoreanParticle(text, "이라는", "라는")} ${suffix}`;
}

function loveSecretCategorySubject(category) {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  return `${title}${loveSecretKoreanParticle(title, "은", "는")}`;
}

function loveSecretCategoryObject(category) {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  return `${title}${loveSecretKoreanParticle(title, "을", "를")}`;
}

function loveSecretTextVariantIndex(value = "", size = 1) {
  const text = clean(value);
  if (!Number.isFinite(size) || size <= 1 || !text) return 0;
  let hash = 0;
  for (const char of Array.from(text)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % size;
}

function loveSecretTextVariant(value = "", variants = []) {
  const list = loveSecretCleanList(variants, 20);
  if (!list.length) return "";
  return list[loveSecretTextVariantIndex(value, list.length)];
}

function loveSecretCategoryRole(category = "", mode = "solo") {
  if (normalizeMode(mode) !== "compatibility") return "self";
  const text = clean(category);
  if (/^상대|상대가|상대를|상대의/.test(text)) return "partner";
  if (/두 사람|서로|궁합|함께|각자|두 일간|맞물리는|채워주는|충돌하는|차이|공동/.test(text)) return "couple";
  return "self";
}

function buildLoveSecretScopedFacts(facts = {}, category = "", mode = "solo") {
  const role = loveSecretCategoryRole(category, mode);
  if (role === "partner") {
    return {
      ...facts,
      role,
      selfName: facts.partnerName,
      displayName: facts.partnerName,
      selfDayMaster: facts.partnerDayMaster,
      dayBranch: facts.partnerDayBranch,
      monthBranch: facts.partnerMonthBranch,
      dominantElement: facts.partnerDominantElement,
      deficientElement: facts.partnerDeficientElement,
      dominantTenGod: facts.partnerDominantTenGod,
      spouseStar: facts.partnerSpouseStar,
    };
  }
  return { ...facts, role };
}

function buildLoveSecretCategorySpecificProfile({ category, facts, kind, role }) {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  const subjectTitle = loveSecretCategorySubject(title);
  if (/도화/.test(title)) {
    return {
      evidence: [`${facts.dominantElement} 도화성 표현`, `${facts.dominantTenGod} 매력 발산`, `${facts.dayBranch} 첫 반응`],
      keyPoint: `${subjectTitle} 시선을 끄는 분위기와 실제 관계로 남는 매력을 구분합니다.`,
      interpretation: `${title}에서는 강한 호감이 생기는 순간보다 그 호감이 존중과 일관성으로 이어지는지를 봅니다.`,
      advice: "시선을 끄는 표현은 살리되, 상대의 책임 있는 행동을 확인한 뒤 속도를 올립니다.",
      caution: "주목받는 느낌을 운명감으로 착각하면 관계의 실제 안정성을 놓칠 수 있습니다.",
      checklist: ["호감이 행동으로 이어지는가", "관심과 책임을 구분했는가", "내 매력을 과하게 증명하려 하지 않았는가"],
    };
  }
  if (/홍염/.test(title)) {
    return {
      evidence: [`${facts.dominantElement} 감정 온도`, `${facts.deficientElement} 보완 욕구`, `${facts.dominantTenGod} 표현 결`],
      keyPoint: `${subjectTitle} 감정의 농도와 상대를 끌어당기는 표현의 온도를 봅니다.`,
      interpretation: `${title}에서는 설렘이 짙어질수록 상대를 이상화하는지, 실제 태도를 차분히 보는지 확인해야 합니다.`,
      advice: "강한 감정이 올라올 때는 표현을 늦추기보다 문장을 짧게 다듬어 전합니다.",
      caution: "강렬함만 믿고 관계의 경계와 생활 리듬을 건너뛰면 소모가 빨라질 수 있습니다.",
      checklist: ["감정 표현이 과장되지 않았는가", "상대의 실제 행동을 보았는가", "속도를 조절할 기준이 있는가"],
    };
  }
  if (/침묵/.test(title)) {
    return {
      evidence: [`${facts.dominantTenGod} 침묵 반응`, `${facts.deficientElement} 보완 언어`, `${facts.dayBranch} 안정 욕구`],
      keyPoint: `${subjectTitle} 휴식의 침묵과 거리두기의 침묵을 구분하는 항목입니다.`,
      interpretation: `${title}에서는 말이 없는 시간을 바로 애정 부족으로 해석하지 않고, 다시 연결될 약속이 있는지를 봅니다.`,
      advice: "답을 재촉하기보다 다시 이야기할 시간과 확인할 주제를 짧게 제안합니다.",
      caution: "침묵을 벌로 쓰거나 불안을 숨긴 채 상대를 시험하면 오해가 오래갑니다.",
      checklist: ["침묵의 이유를 물어볼 문장이 있는가", "답변 기한을 부드럽게 정했는가", "침묵을 단정으로 해석하지 않았는가"],
    };
  }
  if (/사과/.test(title)) {
    return {
      evidence: [`${facts.dominantTenGod} 책임 표현`, `${facts.dayBranch} 관계 회복성`, `${facts.deficientElement} 보완 언어`],
      keyPoint: `${subjectTitle} 자존심을 꺾는 일이 아니라 관계의 안전감을 회복하는 기술입니다.`,
      interpretation: `${title}에서는 변명보다 인정, 인정 뒤 행동 약속, 행동 뒤 반복 확인의 순서가 중요합니다.`,
      advice: "사과 문장은 사건 인정, 감정 공감, 다음 행동 약속을 한 문장씩 나누어 전합니다.",
      caution: "사과 뒤 바로 용서를 요구하면 상대는 다시 방어적으로 닫힐 수 있습니다.",
      checklist: ["사건을 정확히 인정했는가", "상대 감정을 먼저 다루었는가", "다음 행동이 구체적인가"],
    };
  }
  if (/질투|비교/.test(title)) {
    return {
      evidence: [`${facts.deficientElement} 결핍 자극`, `${facts.cautionElements} 과열 반응`, `${facts.dominantTenGod} 인정 욕구`],
      keyPoint: `${subjectTitle} 사랑의 부족보다 인정받고 싶은 마음이 흔들리는 순간을 살핍니다.`,
      interpretation: `${title}에서는 상대를 통제하려는 말보다 내가 어떤 장면에서 작아지는지를 먼저 확인해야 합니다.`,
      advice: "비교가 올라온 날에는 상대를 추궁하기 전 내가 원하는 안심 행동을 하나만 요청합니다.",
      caution: "질투를 시험으로 표현하면 상대의 진심보다 방어 반응만 커질 수 있습니다.",
      checklist: ["비교의 대상과 감정을 분리했는가", "요청 문장이 통제처럼 들리지 않는가", "확인 가능한 행동을 제안했는가"],
    };
  }
  if (/확인받/.test(title)) {
    return {
      evidence: [`${facts.deficientElement} 안심 결핍`, `${facts.dominantTenGod} 확인 욕구`, `${facts.dayBranch} 관계 경계`],
      keyPoint: `${subjectTitle} 사랑을 확인받고 싶은 마음이 요청인지 시험인지 구분하는 자리입니다.`,
      interpretation: `${title}에서는 상대의 진심을 묻기 전에 어떤 행동이 있어야 안심되는지 구체화해야 합니다.`,
      advice: "확인받고 싶은 마음은 추궁보다 요청 문장으로 바꾸고, 상대가 할 수 있는 행동 하나로 좁힙니다.",
      caution: "확인을 반복해서 요구하면 안심보다 상대의 피로가 먼저 커질 수 있습니다.",
      checklist: ["원하는 확인 행동이 구체적인가", "요청과 추궁을 구분했는가", "같은 질문을 반복하지 않았는가"],
    };
  }
  if (/버림|회피/.test(title)) {
    return {
      evidence: [`${facts.dayBranch} 애착 반응`, `${facts.deficientElement} 안정 결핍`, `${facts.dominantTenGod} 방어 방식`],
      keyPoint: `${subjectTitle} 가까워지고 싶은 마음과 다치기 싫어 물러나는 마음이 부딪히는 지점입니다.`,
      interpretation: `${title}에서는 상대의 반응보다 내가 먼저 끊어 내거나 과하게 매달리는 순간을 구분해야 합니다.`,
      advice: "불안한 날에는 결론을 내리지 않고 필요한 확인과 혼자 진정할 시간을 따로 정합니다.",
      caution: "먼저 차갑게 굴어 상처받지 않으려는 방식은 관계의 신뢰를 약하게 만듭니다.",
      checklist: ["도망가고 싶은 마음을 알아차렸는가", "확인 요청과 거리두기를 분리했는가", "하루 뒤 다시 볼 기준이 있는가"],
    };
  }
  if (/방어|스스로를 지키/.test(title)) {
    return {
      evidence: [`${facts.dayBranch} 자기보호 반응`, `${facts.cautionElements} 방어 과열`, `${facts.dominantTenGod} 관계 긴장`],
      keyPoint: `${subjectTitle} 상처를 피하려고 먼저 닫히는 방식이 관계에 어떤 신호를 주는지 봅니다.`,
      interpretation: `${title}에서는 나를 지키는 태도와 상대를 밀어내는 태도를 구분해야 관계가 덜 흔들립니다.`,
      advice: "방어가 올라올 때는 말하지 않을 권리와 반드시 말해야 할 감정을 따로 정합니다.",
      caution: "차갑게 버티는 방식이 오래되면 상대는 거절로 받아들일 수 있습니다.",
      checklist: ["방어가 시작되는 장면을 알고 있는가", "말하지 않을 것과 말할 것을 나누었는가", "상대에게 닫힘으로 전달되지 않았는가"],
    };
  }
  if (/불안을 낮추|건강한 애착|관계 연습/.test(title)) {
    return {
      evidence: [`${facts.deficientElement} 안정 보완`, `${facts.usefulElements} 회복 루틴`, `${facts.dayBranch} 애착 리듬`],
      keyPoint: `${subjectTitle} 감정을 억누르는 법이 아니라 안심을 반복해서 학습하는 방법입니다.`,
      interpretation: `${title}에서는 불안을 없애려 하기보다 불안이 와도 관계를 해치지 않는 루틴을 만들어야 합니다.`,
      advice: "불안한 날의 연락 규칙, 혼자 진정하는 시간, 다시 확인할 문장을 미리 정합니다.",
      caution: "루틴 없이 의지만으로 버티면 같은 장면에서 같은 반응이 반복됩니다.",
      checklist: ["불안한 날의 연락 규칙이 있는가", "혼자 진정하는 행동이 있는가", "다시 대화할 시간이 정해졌는가"],
    };
  }
  if (/돈|소비/.test(title)) {
    return {
      evidence: [`${facts.spouseStar} 현실 책임`, `${facts.monthBranch} 생활 리듬`, `${facts.dominantTenGod} 소비 태도`],
      keyPoint: `${subjectTitle} 애정의 크기가 아니라 생활을 함께 운영하는 감각을 확인합니다.`,
      interpretation: `${title}에서는 선물과 지출보다 돈을 말하는 태도, 부담을 나누는 기준, 미래 계획의 현실성을 봐야 합니다.`,
      advice: "비용, 선물, 데이트 방식의 기준을 감정이 상하기 전 부드럽게 합의합니다.",
      caution: "돈 이야기를 속물적이라고 피하면 장기 관계에서 더 큰 피로로 돌아올 수 있습니다.",
      checklist: ["데이트 비용 기준이 있는가", "선물 기대치를 말했는가", "경제적 부담이 한쪽에 몰리지 않는가"],
    };
  }
  if (/가족/.test(title)) {
    return {
      evidence: [`${facts.spouseStar} 가족 책임`, `${facts.dayBranch} 경계감`, `${facts.monthBranch} 생활권`],
      keyPoint: `${subjectTitle} 두 사람의 사랑이 가족과 생활권 안에서 흔들리지 않을 경계를 봅니다.`,
      interpretation: `${title}에서는 가족을 설득하는 힘보다 두 사람이 먼저 같은 편이 될 수 있는지를 확인해야 합니다.`,
      advice: "가족 문제는 누가 맞는지보다 어디까지 함께 감당할지 경계를 먼저 정합니다.",
      caution: "가족의 기준을 그대로 관계의 기준으로 가져오면 두 사람의 선택권이 약해집니다.",
      checklist: ["두 사람의 우선순위가 합의됐는가", "가족 개입의 한계를 정했는가", "상대의 부담을 현실적으로 들었는가"],
    };
  }
  if (/역할 분담|역할/.test(title)) {
    return {
      evidence: [`${facts.spouseStar} 역할 기대`, `${facts.dominantTenGod} 책임 방식`, `${facts.monthBranch} 생활 운영`],
      keyPoint: `${subjectTitle} 사랑의 감정보다 함께 살 때 역할을 어떻게 나눌지 보는 항목입니다.`,
      interpretation: `${title}에서는 누가 더 많이 하느냐보다 각자가 당연하게 여기는 책임의 기준을 맞춰야 합니다.`,
      advice: "집안일, 일정, 정서적 돌봄, 경제 책임을 말로 나누어 합의합니다.",
      caution: "역할 기대가 말없이 쌓이면 애정 문제가 아니라 불공정 문제로 번질 수 있습니다.",
      checklist: ["역할 기대를 말했는가", "정서적 돌봄도 책임에 포함했는가", "한쪽 희생으로 유지되지 않는가"],
    };
  }
  if (/결혼운이 열리기 쉬운/.test(title)) {
    return {
      evidence: [`${facts.targetYear}년 세운`, `${facts.spouseStar} 배우자성`, `${facts.usefulElements} 보완 기운`],
      keyPoint: `${subjectTitle} 결혼을 확정하는 시기가 아니라 장기 약속을 현실로 검토하기 쉬운 문이 열리는 때입니다.`,
      interpretation: `${title}에서는 만남의 숫자보다 책임 있는 대화, 생활 기준 공유, 관계를 공개적으로 다루는 태도가 함께 움직이는지를 봅니다.`,
      advice: "흐름이 열릴 때는 고백이나 결정보다 돈, 가족, 시간, 거주 리듬처럼 오래 갈 조건을 먼저 정리합니다.",
      caution: "운이 좋다는 말만 믿고 준비 없이 결혼 이야기를 밀어붙이면 현실 검증이 감정 압박으로 바뀔 수 있습니다.",
      checklist: ["장기 약속의 현실 조건을 말했는가", "관계 공개와 가족 경계를 확인했는가", "좋은 흐름을 실제 대화로 옮겼는가"],
    };
  }
  if (/결혼 이야기가 막히기 쉬운/.test(title)) {
    return {
      evidence: [`${facts.cautionElements} 과열 구간`, `${facts.dayBranch} 배우자궁 긴장`, `${facts.monthBranch} 현실 리듬`],
      keyPoint: `${subjectTitle} 사랑이 약해서가 아니라 책임, 속도, 가족 문제의 언어가 맞지 않아 멈추는 구간입니다.`,
      interpretation: `${title}에서는 상대의 확답 지연을 애정 부족으로 단정하지 않고 어떤 현실 조건이 말문을 막는지 살펴야 합니다.`,
      advice: "막히는 시기에는 결론 요구를 줄이고 부담되는 조건, 아직 준비되지 않은 부분, 조율 가능한 범위를 나누어 묻습니다.",
      caution: "결혼 이야기를 시험처럼 꺼내면 상대는 책임보다 압박을 먼저 느껴 관계가 더 굳을 수 있습니다.",
      checklist: ["막히는 조건을 구체적으로 들었는가", "결론보다 조율 범위를 물었는가", "기다릴 수 있는 기한을 정했는가"],
    };
  }
  if (/배우자와 갈등이 생기기 쉬운/.test(title)) {
    return {
      evidence: [`${facts.dayBranch} 배우자궁 반응`, `${facts.dominantTenGod} 갈등 방식`, `${facts.cautionElements} 긴장 기운`],
      keyPoint: `${subjectTitle} 갈등의 원인을 성격 문제가 아니라 가까워진 뒤 반복되는 생활 반응으로 살핍니다.`,
      interpretation: `${title}에서는 돈, 역할, 말투, 가족 경계 중 어느 지점에서 고객님의 기준과 상대의 기준이 충돌하는지 분리해야 합니다.`,
      advice: "갈등 가능성이 높은 주제는 감정이 상하기 전에 금지 문장과 합의 문장을 미리 정합니다.",
      caution: "배우자궁의 불편함을 상대 탓으로만 돌리면 내 반복 반응을 바꿀 기회를 놓칠 수 있습니다.",
      checklist: ["갈등 주제를 생활 영역별로 나눴는가", "금지 문장을 정했는가", "반복되는 내 반응을 알고 있는가"],
    };
  }
  if (/좋은 결혼으로 이어지기 위한/.test(title)) {
    return {
      evidence: [`${facts.spouseStar} 약속 기준`, `${facts.dayBranch} 안정감`, `${facts.usefulElements} 관계 보완`],
      keyPoint: `${subjectTitle} 좋은 배우자를 맞히는 항목이 아니라 함께 살아도 사랑을 보존하는 선택 기준입니다.`,
      interpretation: `${title}에서는 설렘, 책임, 생활 리듬, 갈등 회복력 중 무엇을 우선순위로 둘지 분명해야 합니다.`,
      advice: "선택 기준은 매력 세 가지보다 반드시 지켜야 할 생활 원칙 세 가지로 정리합니다.",
      caution: "모든 조건이 완벽한 사람을 찾으려 하면 실제로 오래 갈 수 있는 안정적 인연을 놓칠 수 있습니다.",
      checklist: ["양보할 수 없는 원칙이 있는가", "갈등 회복력을 확인했는가", "매력과 생활 안정성을 함께 보았는가"],
    };
  }
  if (/가치관|조건|배우자 조건|결혼 전/.test(title)) {
    return {
      evidence: [`${facts.spouseStar} 배우자 기준`, `${facts.dayBranch} 안정 조건`, `${facts.monthBranch} 현실 감각`],
      keyPoint: `${subjectTitle} 설렘보다 오래 맞춰야 할 가치와 생활 기준을 확인합니다.`,
      interpretation: `${title}에서는 다정함, 책임감, 돈, 가족, 일의 우선순위가 실제 선택 기준으로 이어지는지 봐야 합니다.`,
      advice: "좋아하는 마음과 반드시 맞아야 할 조건을 따로 적고 대화에서 하나씩 확인합니다.",
      caution: "조건을 감추고 감정만 앞세우면 결혼 이야기가 나올 때 갈등이 커질 수 있습니다.",
      checklist: ["필수 가치관이 정리됐는가", "상대의 현실 기준을 들었는가", "타협 가능한 것과 아닌 것을 나누었는가"],
    };
  }
  if (/대운/.test(title)) {
    return {
      evidence: [`대운의 큰 방향`, `${facts.monthBranch} 생활 리듬`, `${facts.usefulElements} 보완 기운`],
      keyPoint: `${subjectTitle} 몇 달의 감정이 아니라 몇 년 단위로 사랑의 방향이 바뀌는 흐름입니다.`,
      interpretation: `${title}에서는 만남 자체보다 관계를 받아들일 마음의 구조가 열리는지를 봅니다.`,
      advice: "대운이 열릴 때는 사람을 많이 만나는 것보다 관계 기준을 먼저 정비합니다.",
      caution: "큰 운이 좋다고 준비 없이 선택하면 같은 패턴을 더 크게 반복할 수 있습니다.",
      checklist: ["장기 기준이 정리됐는가", "반복 패턴을 바꿀 준비가 되었는가", "만남의 환경을 넓혔는가"],
    };
  }
  if (/월운|달/.test(title)) {
    return {
      evidence: [`월운의 세부 파동`, `${facts.deficientElement} 보완 시점`, `${facts.cautionElements} 주의 시점`],
      keyPoint: `${subjectTitle} 고백, 대화, 거리 조절을 어느 달에 더 부드럽게 할지 보는 항목입니다.`,
      interpretation: `${title}에서는 감정이 커지는 달과 관계를 정리하기 좋은 달을 나누어야 실행력이 생깁니다.`,
      advice: "좋은 달에는 만남을 늘리고 예민한 달에는 결론보다 확인과 조율을 우선합니다.",
      caution: "월운이 예민한 때 큰 결론을 밀어붙이면 작은 오해도 길어질 수 있습니다.",
      checklist: ["대화하기 좋은 달을 정했는가", "예민한 달의 금지 행동이 있는가", "실제 일정으로 옮겼는가"],
    };
  }
  if (/스킨십|속궁합|친밀감|온도|거리감|한난조습|조후/.test(title)) {
    return {
      evidence: [`${facts.dominantElement} 친밀 온도`, `${facts.deficientElement} 보완 온도`, `${facts.dayBranch} 경계 리듬`],
      keyPoint: `${subjectTitle} 몸과 마음이 안전하다고 느끼는 속도와 온도를 확인하는 항목입니다.`,
      interpretation: `${title}에서는 성적 단정이 아니라 가까워질 때 편안해지는지, 부담이 커지는지, 말로 경계를 조율할 수 있는지를 봅니다.`,
      advice: "친밀감은 눈치로 맞추기보다 편한 속도, 불편한 선, 원하는 표현을 부드럽게 전합니다.",
      caution: "속도의 차이를 사랑의 부족으로 단정하면 불필요한 방어와 서운함이 생깁니다.",
      checklist: ["편안한 속도를 말했는가", "상대의 경계를 확인했는가", "친밀감과 애정 확인을 혼동하지 않았는가"],
    };
  }
  if (/성적 단정이 아니라 조후 기반/.test(title)) {
    return {
      evidence: [`${facts.dominantElement} 조후 온도`, `${facts.deficientElement} 보완 리듬`, `${facts.dayBranch} 정서 경계`],
      keyPoint: `${subjectTitle} 좋고 나쁨을 판정하지 않고 가까워질 때 안전해지는 온도와 속도를 살핍니다.`,
      interpretation: `${title}에서는 속궁합을 노골적인 결론으로 말하지 않습니다. 조후의 온도, 말의 부드러움, 생활 리듬이 맞을 때 몸과 마음이 함께 편안해지는지를 봅니다.`,
      advice: "편안한 접촉, 불편한 경계, 가까워지는 속도를 서로가 알아들을 수 있는 언어로 나눕니다.",
      caution: "친밀감의 차이를 매력 부족이나 애정 부족으로 단정하면 관계의 안전감이 먼저 흔들릴 수 있습니다.",
      checklist: ["조후를 단정이 아니라 경향으로 읽었는가", "불편한 경계를 말했는가", "친밀감과 감정 확인을 분리했는가"],
    };
  }
  if (/마음이 식|멀어질 때/.test(title)) {
    return {
      evidence: [`${facts.dayBranch} 거리 반응`, `${facts.deficientElement} 정서 보완`, `${facts.dominantTenGod} 실망 처리`],
      keyPoint: `${subjectTitle} 애정이 사라지는 순간보다 마음을 접기 시작하는 작은 신호를 봅니다.`,
      interpretation: `${title}에서는 표현이 줄어드는 이유가 권태인지 상처인지, 혹은 혼자 정리하는 습관인지 구분해야 합니다.`,
      advice: "마음이 식는 신호가 보일 때 바로 결론을 내리지 말고 불편했던 장면을 한 번은 말로 확인합니다.",
      caution: "혼자 정리한 뒤 통보하면 상대는 회복 기회를 얻지 못해 상처가 깊어집니다.",
      checklist: ["식은 마음의 원인을 구분했는가", "한 번은 말로 확인했는가", "정리와 회피를 혼동하지 않았는가"],
    };
  }
  if (/미련/.test(title)) {
    return {
      evidence: [`${facts.dayBranch} 관계 기억`, `${facts.spouseStar} 인연 기대`, `${facts.deficientElement} 정서 결핍`],
      keyPoint: `${subjectTitle} 사랑이 남은 것인지 익숙한 상실감에 붙잡힌 것인지 구분합니다.`,
      interpretation: `${title}에서는 좋았던 기억보다 다시 만나면 달라질 조건이 실제로 있는지를 먼저 봐야 합니다.`,
      advice: "미련이 올라올 때는 좋았던 장면, 아팠던 장면, 반복될 문제를 각각 적습니다.",
      caution: "외로움을 인연의 신호로 착각하면 같은 이별을 다시 선택할 수 있습니다.",
      checklist: ["미련과 외로움을 구분했는가", "반복 문제를 적었는가", "달라질 조건이 구체적인가"],
    };
  }
  if (/이별이 발생하기 쉬운/.test(title)) {
    return {
      evidence: [`${facts.dayBranch} 거리 반응`, `${facts.cautionElements} 관계 긴장`, `${facts.dominantTenGod} 방어 방식`],
      keyPoint: `${subjectTitle} 한 번의 사건보다 서운함이 말해지지 못하고 쌓이는 구조를 봅니다.`,
      interpretation: `${title}에서는 연락 감소, 말투 변화, 회피, 시험 행동이 어떤 순서로 이어지는지 읽어야 합니다. 이별의 씨앗은 대개 큰 결론보다 작은 회피가 반복될 때 자랍니다.`,
      advice: "멀어지는 신호가 보일 때는 추궁보다 불편했던 장면, 원하는 행동, 다시 볼 시간을 짧게 제안합니다.",
      caution: "이별 신호를 운명처럼 단정하면 회복 가능한 대화까지 놓칠 수 있습니다.",
      checklist: ["초기 신호를 구체적으로 적었는가", "회피와 정리를 구분했는가", "한 번은 회복 대화를 제안했는가"],
    };
  }
  if (/반복되는 이별 패턴/.test(title)) {
    return {
      evidence: [`${facts.dayBranch} 반복 기억`, `${facts.deficientElement} 보완 과제`, `${facts.dominantTenGod} 관계 습관`],
      keyPoint: `${subjectTitle} 같은 사람을 붙잡는 문제가 아니라 같은 방식으로 사랑을 잃는 장면을 바꾸는 항목입니다.`,
      interpretation: `${title}에서는 과한 확인, 침묵, 밀어내기, 빠른 결론 중 어떤 행동이 이별을 반복시키는지 찾아야 합니다.`,
      advice: "다음 관계 전에는 시작 신호, 멈출 행동, 회복 문장, 떠나야 할 기준을 네 칸으로 정리합니다.",
      caution: "상대만 바꾸면 괜찮아질 거라고 믿으면 내 안의 반복 습관은 다음 관계에서도 다시 나타날 수 있습니다.",
      checklist: ["반복되는 내 첫 반응을 아는가", "멈출 행동이 정해졌는가", "다음 관계의 회복 문장이 있는가"],
    };
  }
  if (/재회 가능성을 높이는/.test(title)) {
    return {
      evidence: [`${facts.targetYear}년 회복 흐름`, `${facts.dayBranch} 관계 기억`, `${facts.spouseStar} 인연 기대`],
      keyPoint: `${subjectTitle} 연락 타이밍보다 다시 만나도 유지될 변화가 있는지를 봅니다.`,
      interpretation: `${title}에서는 사과, 바뀐 행동, 다시 반복하지 않을 약속이 함께 있어야 재회의 의미가 생깁니다.`,
      advice: "연락 전 바뀐 행동 하나와 상대에게 확인할 조건 하나를 먼저 정합니다.",
      caution: "감정만 앞세운 연락은 잠깐 이어져도 같은 갈등으로 돌아가기 쉽습니다.",
      checklist: ["바뀐 행동이 있는가", "확인할 조건을 정했는가", "상대의 선택권을 존중하는가"],
    };
  }
  if (/재회를 피해야|정리해야/.test(title)) {
    return {
      evidence: [`${facts.cautionElements} 반복 경고`, `${facts.dayBranch} 상처 기억`, `${facts.dominantTenGod} 관계 소모`],
      keyPoint: `${subjectTitle} 다시 만나지 않는 선택이 사랑을 부정하는 일이 아닌 경우를 봅니다.`,
      interpretation: `${title}에서는 반복 폭언, 무책임, 회피, 신뢰 훼손이 바뀌지 않았다면 재회보다 정리가 더 품격 있는 선택일 수 있습니다.`,
      advice: "붙잡고 싶은 마음과 실제로 안전한 관계인지를 분리해 판단합니다.",
      caution: "상처가 반복되는 관계를 운명으로 포장하면 회복해야 할 자존감이 더 약해집니다.",
      checklist: ["반복 상처가 멈췄는가", "상대의 책임 있는 변화가 있는가", "내가 안전한 선택을 하고 있는가"],
    };
  }
  if (/이별 후 회복|새로운 사랑/.test(title)) {
    return {
      evidence: [`${facts.usefulElements} 회복 기운`, `${facts.monthBranch} 생활 리듬`, `${facts.targetYear}년 전환 흐름`],
      keyPoint: `${subjectTitle} 빨리 잊는 법보다 다시 좋은 사랑을 받을 수 있는 상태를 만드는 과정입니다.`,
      interpretation: `${title}에서는 감정 정리, 생활 회복, 다음 관계의 기준을 순서대로 세워야 합니다.`,
      advice: "연락 차단, 생활 루틴 회복, 다음 관계 기준 정리를 단계별로 진행합니다.",
      caution: "빈자리를 바로 새 사람으로 채우면 같은 관계 패턴을 반복할 수 있습니다.",
      checklist: ["생활 리듬이 회복됐는가", "전 관계의 반복 패턴을 정리했는가", "다음 기준을 세웠는가"],
    };
  }
  if (/상대가 사랑에서 원하는 것/.test(title)) {
    return {
      evidence: [`${facts.selfDayMaster} 상대 일간`, `${facts.dominantTenGod} 상대 욕구`, `${facts.spouseStar} 상대 기대`],
      keyPoint: `${subjectTitle} 상대가 사랑 안에서 확인받고 싶어 하는 역할과 태도를 살핍니다.`,
      interpretation: `${title}에서는 고객님의 방식으로 사랑을 증명하기보다 상대가 안정감을 느끼는 표현을 찾아야 합니다.`,
      advice: "상대가 원하는 말, 행동, 약속의 형태를 질문으로 확인합니다.",
      caution: "상대의 욕구를 추측으로 단정하면 맞춰 주려 해도 어긋날 수 있습니다.",
      checklist: ["상대의 기대를 직접 확인했는가", "내 방식만 밀어붙이지 않았는가", "상대의 안정 기준을 알고 있는가"],
    };
  }
  if (/상대가 안심|상대의 마음을 여는 문장/.test(title)) {
    return {
      evidence: [`${facts.dominantTenGod} 상대 표현 방식`, `${facts.deficientElement} 상대 보완 언어`, `${facts.dayBranch} 상대 안정감`],
      keyPoint: `${subjectTitle} 상대가 방어를 풀고 마음을 열 수 있는 말의 순서를 봅니다.`,
      interpretation: `${title}에서는 감정 고백보다 상대가 부담 없이 대답할 수 있는 확인 문장이 먼저 필요합니다.`,
      advice: "상대에게는 결론을 묻기보다 편했던 점, 불편했던 점, 원하는 속도를 차례로 묻습니다.",
      caution: "상대를 열게 하려는 말이 압박처럼 들리면 오히려 거리가 생깁니다.",
      checklist: ["상대가 대답할 여지를 주었는가", "결론 요구를 줄였는가", "편안한 질문으로 시작했는가"],
    };
  }
  if (/상대가 멀어지는 순간/.test(title)) {
    return {
      evidence: [`${facts.dayBranch} 상대 거리 반응`, `${facts.cautionElements} 상대 부담 신호`, `${facts.dominantTenGod} 상대 방어`],
      keyPoint: `${subjectTitle} 상대가 마음이 식어서가 아니라 부담을 느껴 물러나는 순간을 구분합니다.`,
      interpretation: `${title}에서는 연락 감소, 답변 지연, 약속 회피가 어떤 압박 뒤에 나타나는지 살펴야 합니다.`,
      advice: "상대가 멀어질 때는 추격보다 부담을 낮추는 문장과 다시 만날 시간을 제안합니다.",
      caution: "불안해서 더 밀어붙이면 상대의 회피 반응이 더 빨라질 수 있습니다.",
      checklist: ["상대가 부담 느낀 장면이 있는가", "추격 대신 여지를 주었는가", "다시 볼 시간을 제안했는가"],
    };
  }
  if (/연애를 시작하는 방식/.test(title)) {
    return {
      evidence: [`${facts.selfDayMaster} 시작 속도`, `${facts.dominantTenGod} 접근 방식`, `${facts.dayBranch} 관계 문턱`],
      keyPoint: `${subjectTitle} 호감이 생겼을 때 먼저 움직이는지, 기다리며 확인하는지 보는 항목입니다.`,
      interpretation: `${title}에서는 시작의 빠르기보다 관계의 첫 약속을 어떤 온도로 만드는지가 더 중요합니다.`,
      advice: "처음 호감이 생기면 표현, 확인, 만남 제안을 한 번에 몰아넣지 말고 순서를 나눕니다.",
      caution: "시작이 빠를수록 상대의 일관성을 확인하는 시간을 반드시 남겨야 합니다.",
      checklist: ["첫 표현이 과하지 않았는가", "상대의 속도를 보았는가", "첫 약속이 반복 가능한가"],
    };
  }
  if (/관계가 깊어질수록/.test(title)) {
    return {
      evidence: [`${facts.dayBranch} 밀착 반응`, `${facts.monthBranch} 생활 적응`, `${facts.spouseStar} 신뢰 기대`],
      keyPoint: `${subjectTitle} 가까워진 뒤 더 편안해지는지, 더 예민해지는지를 구분합니다.`,
      interpretation: `${title}에서는 설렘 이후 드러나는 생활 습관과 감정 표현의 변화가 장기 안정성을 말해 줍니다.`,
      advice: "가까워질수록 줄어드는 배려와 늘어나는 요구를 따로 적어 관계의 균형을 봅니다.",
      caution: "익숙함을 편안함으로만 해석하면 관계 안의 피로 신호를 놓칠 수 있습니다.",
      checklist: ["가까워진 뒤 배려가 유지되는가", "요구가 일방적으로 늘지 않았는가", "편안함과 무심함을 구분했는가"],
    };
  }
  if (/권태기/.test(title)) {
    return {
      evidence: [`${facts.monthBranch} 반복 피로`, `${facts.deficientElement} 자극 결핍`, `${facts.dominantTenGod} 흥미 변화`],
      keyPoint: `${subjectTitle} 사랑이 사라진 것이 아니라 관계의 리듬이 단조로워진 순간을 봅니다.`,
      interpretation: `${title}에서는 새로움의 부족, 대화의 반복, 생활 피로 중 무엇이 애정을 흐리게 하는지 나눠야 합니다.`,
      advice: "권태가 느껴질 때는 큰 이벤트보다 작은 변화, 새로운 대화 주제, 각자의 시간을 먼저 조율합니다.",
      caution: "권태를 이별 신호로 단정하면 회복 가능한 관계도 쉽게 놓칠 수 있습니다.",
      checklist: ["권태의 원인을 구분했는가", "작은 변화를 시도했는가", "혼자 결론 내리지 않았는가"],
    };
  }
  if (/반복해서 만나는 상대 유형/.test(title)) {
    return {
      evidence: [`${facts.spouseStar} 반복 인연`, `${facts.dayBranch} 익숙한 끌림`, `${facts.dominantTenGod} 선택 습관`],
      keyPoint: `${subjectTitle} 운명처럼 느껴지는 유형이 실제로는 익숙한 패턴인지 확인합니다.`,
      interpretation: `${title}에서는 매번 비슷한 사람에게 끌리는 이유와 그 관계가 남기는 감정 비용을 함께 봐야 합니다.`,
      advice: "끌리는 조건 세 가지와 관계가 힘들어지는 조건 세 가지를 나란히 적습니다.",
      caution: "익숙한 불안을 설렘으로 착각하면 같은 관계가 반복될 수 있습니다.",
      checklist: ["반복되는 상대 특징을 적었는가", "설렘과 불안을 구분했는가", "새로운 선택 기준이 있는가"],
    };
  }
  if (/주도권/.test(title)) {
    return {
      evidence: [`${facts.dominantTenGod} 주도 방식`, `${facts.selfDayMaster} 자기 기준`, `${facts.dayBranch} 관계 균형`],
      keyPoint: `${subjectTitle} 관계를 이끄는 힘과 상대를 조종하려는 불안을 구분합니다.`,
      interpretation: `${title}에서는 먼저 제안하는 능력보다 상대의 선택권을 남겨 두는 태도가 관계의 품격을 만듭니다.`,
      advice: "제안은 분명하게 하되, 상대가 거절하거나 조율할 여지를 함께 줍니다.",
      caution: "관계를 내 방식대로만 움직이려 하면 상대의 자발성이 줄어듭니다.",
      checklist: ["상대의 선택권을 남겼는가", "주도와 통제를 구분했는가", "조율 가능한 제안을 했는가"],
    };
  }
  if (/자기주장|맞추는 정도/.test(title)) {
    return {
      evidence: [`${facts.selfDayMaster} 자기 기준`, `${facts.spouseStar} 관계 기대`, `${facts.deficientElement} 양보 지점`],
      keyPoint: `${subjectTitle} 맞춰 주는 사랑과 나를 잃는 사랑의 경계를 봅니다.`,
      interpretation: `${title}에서는 상대에게 맞추는 태도가 배려인지, 버림받지 않기 위한 과잉 적응인지 구분해야 합니다.`,
      advice: "양보할 수 있는 것과 양보하면 나를 잃는 것을 미리 나눕니다.",
      caution: "계속 맞추기만 하면 뒤늦게 억울함이 커져 관계가 흔들릴 수 있습니다.",
      checklist: ["양보 가능한 선을 정했는가", "내 기준을 말했는가", "맞춤과 희생을 구분했는가"],
    };
  }
  if (/연락 빈도|소통 리듬/.test(title)) {
    return {
      evidence: [`${facts.monthBranch} 생활 박자`, `${facts.dominantTenGod} 표현 욕구`, `${facts.deficientElement} 확인 욕구`],
      keyPoint: `${subjectTitle} 애정의 양보다 서로가 편안한 연락 박자를 맞추는 항목입니다.`,
      interpretation: `${title}에서는 답장 속도를 마음의 크기로 단정하지 않고 생활 리듬과 안심 방식의 차이를 함께 봐야 합니다.`,
      advice: "연락 빈도, 답장 여유, 바쁜 날의 신호를 미리 합의합니다.",
      caution: "연락을 애정 시험으로 만들면 사소한 지연도 갈등의 불씨가 됩니다.",
      checklist: ["바쁜 날의 연락 기준이 있는가", "답장 속도를 단정하지 않는가", "서로 편한 빈도를 합의했는가"],
    };
  }
  if (/말투|오해하기 쉬운 표현/.test(title)) {
    return {
      evidence: [`${facts.dominantTenGod} 표현 결`, `${facts.cautionElements} 말의 과열`, `${facts.dayBranch} 상처 기억`],
      keyPoint: `${subjectTitle} 마음과 달리 차갑거나 날카롭게 들리는 표현을 점검합니다.`,
      interpretation: `${title}에서는 내용보다 어조, 순서, 단어 선택이 상대의 방어를 먼저 건드릴 수 있습니다.`,
      advice: "불편한 말은 평가 대신 관찰, 감정, 부탁의 순서로 바꿉니다.",
      caution: "맞는 말을 해도 말투가 날카로우면 관계에는 공격으로 남을 수 있습니다.",
      checklist: ["평가어를 줄였는가", "감정을 먼저 설명했는가", "부탁 문장으로 끝냈는가"],
    };
  }
  if (/고백/.test(title)) {
    return {
      evidence: [`${facts.selfDayMaster} 표현 용기`, `${facts.dominantTenGod} 마음 전달`, `${facts.dayBranch} 관계 문턱`],
      keyPoint: `${subjectTitle} 감정을 터뜨리는 순간이 아니라 관계의 문을 품격 있게 여는 방식입니다.`,
      interpretation: `${title}에서는 확답을 압박하기보다 내 마음, 상대의 여지, 다음 만남을 부드럽게 연결해야 합니다.`,
      advice: "고백은 감정 고백, 상대 존중, 다음 제안의 세 문장으로 나누어 준비합니다.",
      caution: "확답을 바로 요구하면 좋은 마음도 부담으로 바뀔 수 있습니다.",
      checklist: ["내 마음을 짧게 말했는가", "상대의 속도를 존중했는가", "다음 만남 제안이 있는가"],
    };
  }
  if (/연애운을 살리는 소통 습관/.test(title)) {
    return {
      evidence: [`${facts.usefulElements} 보완 언어`, `${facts.dominantTenGod} 표현 습관`, `${facts.monthBranch} 반복 리듬`],
      keyPoint: `${subjectTitle} 한 번의 대화 기술보다 매일 쌓이는 언어의 기운을 봅니다.`,
      interpretation: `${title}에서는 고마움, 불편함, 바람을 작게 자주 말하는 습관이 관계 운을 살립니다.`,
      advice: "하루 한 번 고마움, 일주일 한 번 조율, 한 달 한 번 관계 점검의 리듬을 둡니다.",
      caution: "좋은 말이 사라지면 문제를 말할 때만 대화하는 관계가 됩니다.",
      checklist: ["고마움을 자주 말하는가", "불편함을 미루지 않는가", "관계 점검 시간이 있는가"],
    };
  }
  if (/90일/.test(title)) {
    return {
      evidence: [`${facts.targetYear}년 실행 흐름`, `${facts.usefulElements} 보완 루틴`, `${facts.monthBranch} 생활 박자`],
      keyPoint: `${subjectTitle} 마음가짐이 아니라 3개월 동안 반복할 관계 습관을 세우는 항목입니다.`,
      interpretation: `${title}에서는 첫 30일은 감정 정리, 다음 30일은 표현 조율, 마지막 30일은 선택 기준 확립으로 나눕니다.`,
      advice: "90일 계획은 만남 늘리기보다 기준 세우기, 대화 연습, 선택 정리의 순서로 둡니다.",
      caution: "계획을 크게 잡으면 지속되지 않으니 한 주에 하나의 행동만 바꾸는 편이 좋습니다.",
      checklist: ["30일 단위 목표가 있는가", "매주 반복할 행동이 있는가", "90일 후 판단 기준이 있는가"],
    };
  }
  if (/1년/.test(title)) {
    return {
      evidence: [`${facts.targetYear}년 세운`, `${facts.monthBranch} 생활 흐름`, `${facts.spouseStar} 장기 기대`],
      keyPoint: `${subjectTitle} 올해의 감정 변화보다 1년 동안 관계 기준이 어떻게 성숙할지를 봅니다.`,
      interpretation: `${title}에서는 만남, 관계 진전, 정리, 재도약의 계절을 나누어 무리한 결정을 줄여야 합니다.`,
      advice: "분기별로 만남 확장, 관계 점검, 깊은 대화, 선택 정리의 주제를 배치합니다.",
      caution: "한 번의 흐름으로 1년 전체를 단정하면 좋은 기회와 쉬어야 할 때를 놓칠 수 있습니다.",
      checklist: ["분기별 관계 주제가 있는가", "쉬어야 할 시기를 인정하는가", "1년 후 원하는 관계상이 분명한가"],
    };
  }
  if (/피해야 할 상대 유형/.test(title)) {
    return {
      evidence: [`${facts.cautionElements} 소모 신호`, `${facts.dayBranch} 상처 반복`, `${facts.dominantTenGod} 관계 약점`],
      keyPoint: `${subjectTitle} 싫어할 사람을 고르는 일이 아니라 나를 약하게 만드는 패턴을 피하는 항목입니다.`,
      interpretation: `${title}에서는 강한 끌림보다 반복적으로 불안, 통제, 무시를 만드는 유형을 먼저 걸러야 합니다.`,
      advice: "초반부터 불안하게 만드는 말, 책임 없는 행동, 경계 침범을 세 가지 경고 신호로 둡니다.",
      caution: "바뀔 가능성만 보고 관계를 시작하면 같은 상처가 반복될 수 있습니다.",
      checklist: ["경고 신호가 정리됐는가", "끌림 때문에 무시하지 않았는가", "경계를 넘는 행동을 보았는가"],
    };
  }
  if (/반드시 관리해야 할 약점/.test(title)) {
    return {
      evidence: [`${facts.cautionElements} 과열 지점`, `${facts.deficientElement} 결핍 지점`, `${facts.dominantTenGod} 반복 반응`],
      keyPoint: `${subjectTitle} 부족함을 꾸짖는 항목이 아니라 사랑이 흔들리는 순간의 관리법입니다.`,
      interpretation: `${title}에서는 과하게 확인하려는 마음, 빠른 결론, 침묵으로 방어하는 습관을 미리 다루어야 합니다.`,
      advice: "약점은 숨기지 말고 올라오는 신호, 멈추는 행동, 회복 문장으로 나눕니다.",
      caution: "약점을 성격 탓으로만 두면 관계가 바뀌어도 같은 장면이 반복됩니다.",
      checklist: ["약점의 시작 신호를 아는가", "멈출 행동이 정해졌는가", "회복 문장이 준비됐는가"],
    };
  }
  if (/상처가 깊어지는 금지 문장/.test(title)) {
    return {
      evidence: [`${facts.dominantTenGod} 갈등 언어`, `${facts.dayBranch} 상처 기억`, `${facts.cautionElements} 말의 과열`],
      keyPoint: `${subjectTitle} 싸움의 내용보다 관계에 오래 남는 문장을 피하는 항목입니다.`,
      interpretation: `${title}에서는 인격 단정, 비교, 과거 소환, 이별 협박이 가장 깊은 흔적을 남깁니다.`,
      advice: "화가 날 때도 상대의 성격이 아니라 지금의 행동과 내가 느낀 감정만 전합니다.",
      caution: "금지 문장은 사과해도 기억에 남아 다음 갈등의 불씨가 됩니다.",
      checklist: ["인격 단정을 피했는가", "과거를 한꺼번에 꺼내지 않았는가", "이별을 협박처럼 쓰지 않았는가"],
    };
  }
  if (/화해가 쉬워지는 타이밍|회복 의식/.test(title)) {
    return {
      evidence: [`${facts.monthBranch} 회복 박자`, `${facts.deficientElement} 진정 기운`, `${facts.dayBranch} 관계 회복성`],
      keyPoint: `${subjectTitle} 누가 먼저 숙이느냐보다 감정이 내려앉는 시간을 읽는 항목입니다.`,
      interpretation: `${title}에서는 바로 해결할 문제와 하루 뒤 말해야 할 문제를 나누어야 화해가 부드러워집니다.`,
      advice: "화해는 진정 시간, 인정 문장, 다음 행동 약속의 순서로 진행합니다.",
      caution: "감정이 끓는 중에 결론을 내리면 화해보다 재충돌이 쉬워집니다.",
      checklist: ["진정 시간을 가졌는가", "인정 문장이 있었는가", "다음 행동 약속이 있는가"],
    };
  }
  if (/90일 관계 회복/.test(title)) {
    return {
      evidence: [`${facts.targetYear}년 회복 흐름`, `${facts.usefulElements} 관계 보완`, `${facts.dayBranch} 신뢰 재건`],
      keyPoint: `${subjectTitle} 한 번의 사과가 아니라 신뢰를 다시 쌓는 기간표입니다.`,
      interpretation: `${title}에서는 첫 달은 말투 안정, 둘째 달은 약속 이행, 셋째 달은 갈등 재발 방지를 확인합니다.`,
      advice: "90일 동안 사과보다 반복 행동을 보여 주고, 같은 갈등이 줄었는지를 점검합니다.",
      caution: "빠른 용서만 바라면 회복 과정이 다시 부담으로 바뀝니다.",
      checklist: ["말투가 안정됐는가", "약속 이행이 반복됐는가", "같은 갈등이 줄었는가"],
    };
  }
  if (/품격 있게 이해/.test(title)) {
    return {
      evidence: [`${facts.selfDayMaster} 상대 기질`, `${facts.dayBranch} 상대 관계 본능`, `${facts.dominantTenGod} 상대 기대 방식`],
      keyPoint: `${subjectTitle} 상대를 맞춰 주는 일이 아니라 품격 있게 번역하는 태도입니다.`,
      interpretation: `${title}에서는 상대의 다름을 변명으로 받아들이지 않고, 이해할 부분과 지켜야 할 선을 함께 둡니다.`,
      advice: "상대의 방식 하나를 이해하되, 고객님이 지켜야 할 경계 하나도 같이 정합니다.",
      caution: "이해가 일방적 희생으로 바뀌면 관계의 균형이 무너집니다.",
      checklist: ["이해와 희생을 구분했는가", "내 경계를 함께 세웠는가", "상대의 책임도 확인했는가"],
    };
  }
  if (/최종 궁합 한 문장|최종 궁합 메시지/.test(title)) {
    return {
      evidence: [`${loveSecretPair(facts.selfDayMaster, facts.partnerDayMaster)} 일간`, `${loveSecretPair(facts.dayBranch, facts.partnerDayBranch)} 배우자궁`, `${facts.dominantElement}/${facts.partnerDominantElement} 오행 흐름`],
      keyPoint: `${subjectTitle} 두 사람을 좋다 나쁘다로 판정하지 않고 오래 유지될 조건과 흔들릴 조건을 한 문장으로 압축합니다.`,
      interpretation: `${title}에서는 끌림의 이유, 불편함의 원인, 지켜야 할 태도를 함께 보아야 궁합이 실제 조언이 됩니다.`,
      advice: "최종 문장은 상대를 바꾸라는 결론이 아니라 두 사람이 함께 지킬 관계 원칙으로 정리합니다.",
      caution: "궁합 한 문장을 운명 판정처럼 쓰면 조율 가능한 관계의 여지를 놓칠 수 있습니다.",
      checklist: ["끌림과 위험을 함께 담았는가", "실천 가능한 원칙으로 끝나는가", "단정 대신 조율 조건을 제시했는가"],
    };
  }
  if (/기질 차이가 매력/.test(title)) {
    return {
      evidence: [`${loveSecretPair(facts.selfDayMaster, facts.partnerDayMaster)} 기질 차이`, `${facts.dominantElement}/${facts.partnerDominantElement} 매력 온도`, `${facts.dominantTenGod} 반응 방식`],
      keyPoint: `${subjectTitle} 서로 다른 점이 불편함이 되기 전 신선한 자극과 보완감으로 느껴지는 자리입니다.`,
      interpretation: `${title}에서는 내가 부족하게 느낀 표현을 상대가 자연스럽게 보여 줄 때 끌림이 커집니다. 다만 매력은 생활 안에서 존중으로 이어져야 오래갑니다.`,
      advice: "상대의 다른 점을 칭찬하되 내 방식도 함께 설명해 두 사람이 같은 언어를 만들도록 합니다.",
      caution: "처음의 매력을 내 결핍을 채워 줄 의무로 바꾸면 상대는 쉽게 부담을 느낄 수 있습니다.",
      checklist: ["차이를 칭찬으로 표현했는가", "내 방식도 설명했는가", "매력을 의무로 만들지 않았는가"],
    };
  }
  if (/기질 차이가 상처/.test(title)) {
    return {
      evidence: [`${loveSecretPair(facts.selfDayMaster, facts.partnerDayMaster)} 충돌 방식`, `${facts.cautionElements} 긴장 기운`, `${loveSecretPair(facts.dayBranch, facts.partnerDayBranch)} 생활 반응`],
      keyPoint: `${subjectTitle} 서로 다른 기질이 무시, 방치, 통제로 해석될 때 상처가 깊어지는 지점입니다.`,
      interpretation: `${title}에서는 표현 속도, 답을 내리는 방식, 감정 회복 시간이 다를 때 누구의 잘못으로 단정하지 않고 번역해야 합니다.`,
      advice: "상처가 되는 차이는 금지 문장, 필요한 설명, 다시 확인할 시간을 정해 완충합니다.",
      caution: "다름을 성격 결함처럼 말하면 궁합의 약점이 아니라 관계의 방어벽이 됩니다.",
      checklist: ["상처가 되는 차이를 이름 붙였는가", "금지 문장을 정했는가", "회복 시간을 합의했는가"],
    };
  }
  if (/기본 궁합을 살리는 태도/.test(title)) {
    return {
      evidence: [`${loveSecretPair(facts.selfDayMaster, facts.partnerDayMaster)} 기본 결`, `${facts.usefulElements} 보완 방향`, `${facts.partnerDominantTenGod} 상대 기대`],
      keyPoint: `${subjectTitle} 궁합의 장점을 키우려면 맞는 부분보다 어긋날 때의 태도가 더 중요합니다.`,
      interpretation: `${title}에서는 칭찬, 확인, 거리 조절, 사과의 순서를 안정적으로 만들 때 기본 궁합이 살아납니다.`,
      advice: "두 사람이 잘 맞는 장면을 기록하고, 어긋나는 장면에는 같은 회복 문장을 반복합니다.",
      caution: "궁합이 좋다는 이유로 관리해야 할 차이를 방치하면 장점도 쉽게 소모됩니다.",
      checklist: ["잘 맞는 장면을 알고 있는가", "어긋날 때 회복 문장이 있는가", "상대의 기대를 확인했는가"],
    };
  }
  if (/배우자궁이 맞물리는 방식/.test(title)) {
    return {
      evidence: [`${loveSecretPair(facts.dayBranch, facts.partnerDayBranch)} 배우자궁`, `${facts.spouseStar}/${facts.partnerSpouseStar} 기대`, `${facts.monthBranch}/${facts.partnerMonthBranch} 생활권`],
      keyPoint: `${subjectTitle} 두 사람이 가까워진 뒤 편안해지는 부분과 예민해지는 생활 접점을 살핍니다.`,
      interpretation: `${title}에서는 데이트의 설렘보다 생활 밀착, 휴식 방식, 약속을 지키는 태도가 궁합의 뿌리로 드러납니다.`,
      advice: "가까워진 뒤 편해지는 행동과 예민해지는 행동을 서로 한 가지씩 전합니다.",
      caution: "배우자궁의 불편함을 무조건 나쁜 궁합으로 보면 조율 가능한 생활 차이까지 놓칠 수 있습니다.",
      checklist: ["생활 밀착의 편안함을 확인했는가", "예민해지는 행동을 말했는가", "휴식 방식의 차이를 존중했는가"],
    };
  }
  if (/두 사람의 일상 궁합 처방/.test(title)) {
    return {
      evidence: [`${facts.monthBranch}/${facts.partnerMonthBranch} 생활 박자`, `${facts.dominantElement}/${facts.partnerDominantElement} 감정 온도`, `${loveSecretPair(facts.dayBranch, facts.partnerDayBranch)} 일상 반응`],
      keyPoint: `${subjectTitle} 거창한 이벤트보다 매일 반복되는 연락, 식사, 휴식, 정리 방식에서 궁합을 살리는 처방입니다.`,
      interpretation: `${title}에서는 함께 있을 때 편해지는 루틴과 피곤해지는 루틴을 나누어야 합니다. 일상이 맞으면 사랑은 조용히 깊어지고, 일상이 계속 어긋나면 좋은 마음도 소모됩니다.`,
      advice: "일주일 단위로 연락 기준, 만남 빈도, 혼자 쉬는 시간, 갈등 후 회복 순서를 정합니다.",
      caution: "일상 궁합을 감정 문제로만 해석하면 실제로 조율할 수 있는 생활 습관을 놓칩니다.",
      checklist: ["연락 기준이 있는가", "혼자 쉬는 시간을 존중하는가", "갈등 후 회복 순서를 정했는가"],
    };
  }
  if (/상대/.test(title) && role === "partner") {
    return {
      evidence: [`${facts.selfDayMaster} 상대 일간`, `${facts.dayBranch} 상대 배우자궁`, `${facts.dominantTenGod} 상대 기대 방식`],
      keyPoint: `${subjectTitle} 고객님의 기준이 아니라 상대가 사랑을 받아들이는 방식을 따로 읽어야 합니다.`,
      interpretation: `${title}에서는 상대가 편안함을 느끼는 표현, 부담으로 받아들이는 속도, 관계에서 기대하는 역할을 분리합니다.`,
      advice: "상대에게 맞출 부분과 고객님이 지켜야 할 기준을 같은 비중으로 놓고 조율합니다.",
      caution: "상대를 이해한다는 이유로 고객님의 욕구를 지우면 관계의 균형이 무너질 수 있습니다.",
      checklist: ["상대의 안심 방식이 무엇인가", "내 기준과 상대 기준을 구분했는가", "맞춤과 희생을 혼동하지 않았는가"],
    };
  }
  return null;
}

function buildLoveSecretCategoryConsultationProfile({ category, facts: rawFacts, mode }) {
  const facts = buildLoveSecretScopedFacts(rawFacts, category, mode);
  const kind = loveSecretCategoryKind(category);
  const isCompat = normalizeMode(mode) === "compatibility";
  const role = facts.role || "self";
  const subject = isCompat && role === "couple" ? `${facts.selfName}님과 ${facts.partnerName}님` : `${facts.selfName}님`;
  const categorySubject = loveSecretCategorySubject(category);
  const common = {
    evidence: [
      `${loveSecretPair(facts.selfDayMaster, `${facts.dayBranch} 배우자궁`)}`,
      `${loveSecretWithParticle(`${facts.dominantElement} 우세 기운`, "과", "와")} ${facts.deficientElement} 보완 기운`,
      `${facts.dominantTenGod} 중심 십성`,
    ],
    keyPoint: loveSecretTextVariant(`${category}:common-key`, [
      `${categorySubject} ${subject}의 사랑이 실제 관계에서 어떤 선택으로 반복되는지를 드러내는 항목입니다.`,
      `상담의 초점은 ${category}${loveSecretKoreanParticle(category, "을", "를")} 통해 반복되는 감정 반응과 선택 기준을 분리하는 데 있습니다.`,
      `이 대목은 ${category}${loveSecretKoreanParticle(category, "으", "")}로 드러나는 관계의 신호를 실제 행동 기준으로 바꾸는 자리입니다.`,
      `${subject}에게 ${category}${loveSecretKoreanParticle(category, "은", "는")} 마음의 크기보다 반복되는 태도를 확인하게 하는 항목입니다.`,
      `명리적으로는 ${category}${loveSecretKoreanParticle(category, "이", "가")} 일간, 배우자궁, 오행 균형이 관계 장면으로 번역되는 지점입니다.`,
      `실제 상담에서는 ${category}${loveSecretKoreanParticle(category, "을", "를")} 통해 끌림과 부담이 동시에 생기는 자리를 구분합니다.`,
      `${categorySubject} 익숙한 선택이 좋은 인연을 부르는지 소모를 부르는지 가르는 기준입니다.`,
      `관계의 품격을 지키려면 ${category}${loveSecretKoreanParticle(category, "을", "를")} 감정 판단이 아니라 반복 행동으로 읽어야 합니다.`,
      `이 항목은 ${category}${loveSecretKoreanParticle(category, "을", "를")} 통해 지금 줄일 반응과 살릴 장점을 함께 찾습니다.`,
      `${subject}의 연애 흐름에서 ${category}${loveSecretKoreanParticle(category, "은", "는")} 마음을 확인하는 방식과 경계를 세우는 방식을 비춥니다.`,
      `사주의 결로 보면 ${category}${loveSecretKoreanParticle(category, "은", "는")} 관계가 편해지는 장면과 예민해지는 장면을 나누는 항목입니다.`,
      `고객님의 현실 관계에서는 ${category}${loveSecretKoreanParticle(category, "이", "가")} 작은 습관 하나를 바꾸는 출발점이 됩니다.`,
    ]),
    interpretation: loveSecretTextVariant(`${category}:common-interpretation`, [
      `${categorySubject} 단독으로 단정하지 않고 일간, 배우자궁, 오행 균형을 함께 보아야 정확합니다.`,
      `${category}${loveSecretKoreanParticle(category, "은", "는")} 감정의 크기보다 반복되는 선택을 함께 봐야 정확합니다.`,
      `이 흐름은 ${facts.selfDayMaster} 일간의 반응, ${facts.dayBranch} 배우자궁의 안정 조건, ${facts.dominantElement}/${facts.deficientElement} 오행 균형을 함께 놓고 읽어야 합니다.`,
      `${category}${loveSecretKoreanParticle(category, "을", "를")} 볼 때는 상대의 말보다 반복되는 행동과 고객님의 몸이 느끼는 편안함을 같이 확인해야 합니다.`,
      `명식은 한 가지 신호로 결론내리지 않고, ${facts.dominantTenGod} 십성의 기대와 ${facts.usefulElements} 보완 방향을 함께 묶어 읽을 때 선명해집니다.`,
      `${category}${loveSecretKoreanParticle(category, "은", "는")} 좋은 마음이 있어도 생활 장면에서 어떤 부담으로 바뀌는지 살펴야 합니다.`,
      `관계가 흔들릴 때 이 항목은 누구의 잘못보다 반응의 순서와 회복 가능성을 먼저 보게 합니다.`,
      `${category}${loveSecretKoreanParticle(category, "이", "가")} 드러내는 신호는 감정의 결론이 아니라 다음 대화에서 확인할 기준입니다.`,
    ]),
    advice: loveSecretTextVariant(`${category}:common-advice`, [
      `${category} 관점에서 줄일 반응 하나와 늘릴 행동 하나를 정해 반복합니다.`,
      `${category}${loveSecretKoreanParticle(category, "을", "를")} 기준으로 오늘 하지 않을 말 하나와 대신 할 행동 하나를 정합니다.`,
      `대화에서는 ${category}${loveSecretKoreanParticle(category, "을", "를")} 평가하지 말고 관찰한 행동, 느낀 감정, 원하는 요청으로 나누어 전합니다.`,
      `${category}${loveSecretKoreanParticle(category, "이", "가")} 흔들리는 날에는 결론을 미루고 확인 가능한 약속 하나만 제안합니다.`,
      `이번 주에는 ${category}${loveSecretKoreanParticle(category, "에", "에")} 맞는 작은 루틴을 하나 정해 반복해 보세요.`,
      `${category}${loveSecretKoreanParticle(category, "을", "를")} 살리려면 상대를 시험하기보다 필요한 안정 행동을 짧게 요청합니다.`,
      `관계가 급해질수록 ${category}${loveSecretKoreanParticle(category, "에서는", "에서는")} 속도를 늦추고 말의 온도를 낮추는 편이 좋습니다.`,
      `${category}${loveSecretKoreanParticle(category, "은", "는")} 한 번의 결심보다 반복되는 작은 행동으로 바꾸는 것이 오래갑니다.`,
    ]),
    caution: loveSecretTextVariant(`${category}:common-caution`, [
      "감정이 강한 날일수록 상대의 마음을 단정하지 않고 확인 가능한 행동부터 봅니다.",
      `${category}${loveSecretKoreanParticle(category, "에서", "에서")} 마음이 급해지면 사실보다 해석이 앞설 수 있습니다.`,
      `좋은 의도라도 ${category}${loveSecretKoreanParticle(category, "에서는", "에서는")} 상대에게 압박으로 전달될 수 있습니다.`,
      `${category}${loveSecretKoreanParticle(category, "을", "를")} 운명처럼 단정하면 조율 가능한 부분까지 닫힐 수 있습니다.`,
      `불안한 날에는 ${category}${loveSecretKoreanParticle(category, "을", "를")} 근거로 결론을 내리기보다 하루 뒤 다시 확인하는 편이 안전합니다.`,
      `${category}${loveSecretKoreanParticle(category, "이", "가")} 반복될수록 사랑의 증명보다 생활 속 신뢰를 먼저 보아야 합니다.`,
      `상대 반응을 시험하는 방식으로 ${category}${loveSecretKoreanParticle(category, "을", "를")} 다루면 관계의 방어가 커질 수 있습니다.`,
      `${category}${loveSecretKoreanParticle(category, "에서는", "에서는")} 내 기준을 지키되 관계를 닫아 버리는 표현은 피해야 합니다.`,
    ]),
    checklist: [
      `${category}에서 반복되는 내 반응을 한 문장으로 정리했는가`,
      "상대의 말보다 반복되는 행동을 함께 확인했는가",
      "오늘 실천할 작은 기준을 하나 정했는가",
    ],
  };
  const profiles = {
    dayMaster: {
      evidence: [`${facts.selfDayMaster} 일간`, `${facts.dominantTenGod} 중심 십성`, `강약 판정 ${facts.strengthLabel}`],
      keyPoint: `${facts.selfDayMaster} 일간은 사랑에서 자존감, 선택 속도, 먼저 다가가는 방식을 비춥니다.`,
      interpretation: `${subject}은 관계 안에서 나를 잃지 않는 감각이 중요합니다. 일간의 결이 선명할수록 상대에게 맞추기보다 어떤 사랑을 원하는지 먼저 정리해야 관계가 안정됩니다.`,
      advice: "호감이 생긴 뒤에도 내 기준과 생활 리듬을 지키는 문장을 먼저 준비합니다.",
      caution: "상대 반응에 맞춰 나를 바꾸는 시간이 길어지면 본래의 매력이 흐려질 수 있습니다.",
      checklist: ["나는 사랑에서 어떤 태도를 지키고 싶은가", "상대에게 맞추기 전 내 기준을 말했는가", "호감과 의존을 구분했는가"],
    },
    spousePalace: {
      evidence: [`${facts.dayBranch} 배우자궁`, `${facts.spouseStar} 흐름`, `${facts.selfDayMaster} 일간과 일지의 연결`],
      keyPoint: `${facts.dayBranch} 배우자궁은 가까워진 뒤 드러나는 안정감과 관계 본능을 비춥니다.`,
      interpretation: `${category}에서는 설렘보다 가까운 거리에서 편안함이 유지되는지를 봅니다. 배우자궁이 말하는 본능은 오래 만날수록 더 선명해지므로, 생활 속 반복 반응을 반드시 함께 확인해야 합니다.`,
      advice: "가까워진 뒤 불편해지는 지점과 편안해지는 지점을 분리해서 기록합니다.",
      caution: "처음의 강한 끌림만으로 장기 안정성을 판단하면 실제 생활의 결을 놓칠 수 있습니다.",
      checklist: ["가까워질수록 편안해지는가", "생활 리듬에서 반복되는 불편함은 무엇인가", "내가 원하는 안정감을 상대에게 설명했는가"],
    },
    monthBranch: {
      evidence: [`${facts.monthBranch} 월지`, `${facts.strengthLabel} 계절 흐름`, `${facts.dominantElement} 우세 기운`],
      keyPoint: `${facts.monthBranch} 월지는 연애가 일상과 만날 때의 계절감과 생활 리듬을 비춥니다.`,
      interpretation: `${category}는 사랑을 감정만이 아니라 시간 사용, 약속 방식, 생활 온도로 읽는 항목입니다. 월지의 결이 맞으면 관계가 무리 없이 반복되고, 맞지 않으면 사소한 일정과 생활 방식에서 피로가 쌓입니다.`,
      advice: "연락, 만남, 휴식의 주기를 현실적으로 맞추는 약속을 먼저 정합니다.",
      caution: "감정은 좋은데 생활 리듬이 계속 어긋나면 관계가 쉽게 소모될 수 있습니다.",
      checklist: ["만남 주기가 서로에게 무리 없는가", "생활 리듬 차이를 애정 부족으로 오해하지 않았는가", "반복 가능한 약속을 정했는가"],
    },
    element: {
      evidence: [`우세 오행 ${facts.dominantElement}`, `보완 오행 ${facts.deficientElement}`, `용신 흐름 ${facts.usefulElements}`],
      keyPoint: `오행 균형은 끌림의 온도와 관계를 안정시키는 보완점을 함께 비춥니다.`,
      interpretation: `${category}에서는 강한 기운이 매력으로 드러나는 방식과 부족한 기운이 불안으로 나타나는 순간을 나누어 봅니다. ${facts.usefulElements}의 결은 관계를 부드럽게 살리는 방향이고, ${facts.cautionElements}의 결은 과해질 때 조절이 필요합니다.`,
      advice: `관계가 흔들릴 때는 ${facts.usefulElements}의 생활 행동을 하나 정해 보완합니다.`,
      caution: `${facts.cautionElements} 기운이 과해지는 날에는 결론을 늦추고 몸의 속도를 먼저 낮춥니다.`,
      checklist: ["강한 기운이 매력으로 쓰였는가", "부족한 기운을 상대에게 요구로만 돌리지 않았는가", "보완 행동을 생활 루틴으로 정했는가"],
    },
    tenGod: {
      evidence: [`중심 십성 ${facts.dominantTenGod}`, `${facts.spouseStar} 배우자성`, `${facts.selfDayMaster} 일간의 표현 방식`],
      keyPoint: `${facts.dominantTenGod} 흐름은 사랑에서 원하는 역할, 표현 방식, 기대치를 비춥니다.`,
      interpretation: `${category}는 내가 사랑받는다고 느끼는 조건과 사랑을 줄 때 반복하는 태도를 읽는 항목입니다. 십성의 결을 알면 상대를 바꾸려 하기보다 내가 어떤 방식으로 관계를 운영하는지 더 정확히 보입니다.`,
      advice: "원하는 역할과 기대를 말없이 시험하지 말고 짧은 문장으로 확인합니다.",
      caution: "기대가 쌓인 뒤 한 번에 터뜨리면 상대는 평가받는다고 느낄 수 있습니다.",
      checklist: ["내가 원하는 연인의 역할을 말로 설명했는가", "상대에게 기대를 시험처럼 표현하지 않았는가", "표현 방식이 상대에게도 안전한가"],
    },
    longTerm: {
      evidence: [`${facts.spouseStar} 배우자성`, `${facts.dayBranch} 배우자궁`, `${facts.monthBranch} 생활 리듬`],
      keyPoint: `장기 관계는 감정의 크기보다 책임, 생활 리듬, 현실 조건의 합으로 판단해야 합니다.`,
      interpretation: `${category}에서는 결혼운을 단순한 시기가 아니라 함께 살아도 사랑이 남는 구조로 봅니다. ${facts.spouseStar}의 기대와 ${facts.dayBranch} 배우자궁의 안정 조건이 맞을수록 오래 가는 약속이 가벼워집니다.`,
      advice: "돈, 가족, 시간, 역할에 대한 기준을 관계 초기에 부드럽게 확인합니다.",
      caution: "결혼 가능성을 감정 확신만으로 밀어붙이면 현실 조건에서 피로가 커질 수 있습니다.",
      checklist: ["생활과 돈의 기준을 확인했는가", "가족과 일의 경계를 합의했는가", "오래 갈 관계의 책임을 한쪽에 몰지 않았는가"],
    },
    attraction: {
      evidence: [`${facts.dominantElement} 매력 기운`, `${facts.dominantTenGod} 표현 결`, `${facts.selfDayMaster} 일간의 첫 반응`],
      keyPoint: `끌림은 강한 자극만이 아니라 내 사주가 편안하게 반응하는 분위기에서 더 오래갑니다.`,
      interpretation: `${category}에서는 빠른 설렘과 천천히 깊어지는 안정적 끌림을 구분합니다. 강하게 끌리는 유형이 늘 좋은 인연은 아니므로, 반복 행동과 생활 태도를 함께 확인해야 합니다.`,
      advice: "설렘이 커질수록 상대의 일관성, 책임감, 대화 태도를 체크합니다.",
      caution: "위험한 끌림을 운명감으로 포장하면 같은 관계 패턴이 반복될 수 있습니다.",
      checklist: ["설렘과 안정감을 따로 확인했는가", "상대의 반복 행동을 보았는가", "내가 소모되는 끌림을 구분했는가"],
    },
    communication: {
      evidence: [`${facts.dominantTenGod} 표현 방식`, `${facts.selfDayMaster} 일간`, `${facts.deficientElement} 보완 기운`],
      keyPoint: `소통은 마음의 크기보다 말의 순서, 확인 방식, 침묵을 다루는 태도에서 갈립니다.`,
      interpretation: `${category}에서는 고백, 사과, 화해가 잘 통하는 문장 구조를 봅니다. 감정부터 밀어붙이면 오해가 커지고, 사실 확인 뒤 감정을 말하면 관계의 안전감이 살아납니다.`,
      advice: "사실 확인, 감정 표현, 원하는 행동 제안을 한 문장씩 나누어 전합니다.",
      caution: "침묵을 벌로 쓰거나 확인 요구를 공격처럼 표현하면 회복이 늦어집니다.",
      checklist: ["사실과 감정을 분리해 말했는가", "상대가 들을 수 있는 속도로 표현했는가", "화해 문장을 미리 준비했는가"],
    },
    anxiety: {
      evidence: [`${facts.deficientElement} 보완 기운`, `${facts.cautionElements} 과열 기운`, `${facts.dominantTenGod} 관계 욕구`],
      keyPoint: `불안과 집착은 사랑이 없어서가 아니라 안심을 확인하는 방식이 흔들릴 때 커집니다.`,
      interpretation: `${category}에서는 확인받고 싶은 욕구와 회피하고 싶은 방어를 나누어 봅니다. 부족한 기운이 자극되면 상대의 작은 반응도 크게 해석되므로, 결론보다 몸과 말의 속도를 먼저 낮추는 것이 중요합니다.`,
      advice: "불안이 올라온 날에는 확인 요구를 바로 보내지 말고 원하는 안정 행동을 짧게 적습니다.",
      caution: "질투와 비교심을 시험으로 표현하면 관계의 신뢰가 빠르게 약해질 수 있습니다.",
      checklist: ["불안의 원인이 사실인지 해석인지 구분했는가", "확인 요구를 요청 문장으로 바꾸었는가", "큰 결정을 하루 미루었는가"],
    },
    conflict: {
      evidence: [`${facts.dominantTenGod} 갈등 반응`, `${facts.dayBranch} 배우자궁`, `${facts.cautionElements} 주의 기운`],
      keyPoint: `갈등은 누가 옳은지보다 각자가 불안을 방어하는 방식에서 시작되는 경우가 많습니다.`,
      interpretation: `${category}에서는 싸움의 원인, 금지 문장, 화해 타이밍을 분리합니다. 같은 문제라도 말의 순서가 바뀌면 상처가 줄고, 감정이 가라앉은 뒤 합의하면 관계 회복 속도가 빨라집니다.`,
      advice: "갈등 당일에는 결론을 강요하지 말고 다시 이야기할 시간을 먼저 정합니다.",
      caution: "상대의 성격을 단정하는 문장은 사과보다 오래 남는 상처가 됩니다.",
      checklist: ["갈등의 시작점을 사건과 감정으로 분리했는가", "금지 문장을 피했는가", "화해 시간을 정했는가"],
    },
    reunion: {
      evidence: [`${facts.dayBranch} 관계 기억`, `${facts.spouseStar} 인연 기대`, `${facts.targetYear}년 흐름`],
      keyPoint: `재회는 미련의 크기가 아니라 다시 만나도 같은 문제가 반복되지 않을 조건으로 봐야 합니다.`,
      interpretation: `${category}에서는 붙잡아야 할 인연과 정리해야 할 인연을 구분합니다. 재회 가능성이 있어도 관계 운영 방식이 바뀌지 않으면 같은 이별이 반복될 수 있습니다.`,
      advice: "연락 전에 바뀐 행동, 확인할 조건, 멈출 기준을 먼저 정합니다.",
      caution: "외로움 때문에 재회를 선택하면 관계의 핵심 문제가 다시 흐려질 수 있습니다.",
      checklist: ["재회 후 달라질 행동이 구체적인가", "반복 이별 원인을 알고 있는가", "정리해야 할 신호를 정했는가"],
    },
    intimacy: {
      evidence: [`${facts.dominantElement} 온도`, `${facts.deficientElement} 보완 온도`, `${facts.dayBranch} 친밀감 리듬`],
      keyPoint: `친밀감은 성적 단정이 아니라 몸과 마음이 안전하다고 느끼는 속도와 온도의 문제입니다.`,
      interpretation: `${category}에서는 가까워지는 속도, 스킨십의 편안함, 정서적 밀착의 리듬을 봅니다. 조후의 균형이 맞을수록 친밀감은 자연스럽고, 과열되거나 차가워질 때는 말보다 생활 리듬 조율이 먼저 필요합니다.`,
      advice: "친밀감의 속도와 경계를 부드럽게 말하고 상대의 반응을 확인합니다.",
      caution: "친밀감의 차이를 애정 부족으로 단정하면 불필요한 방어가 생깁니다.",
      checklist: ["편안한 속도를 말했는가", "상대의 경계를 존중했는가", "친밀감과 애정 확인을 혼동하지 않았는가"],
    },
    timing: {
      evidence: loveSecretCleanList([
        ...loveSecretTimingEvidenceHints(category, facts),
        `${facts.targetYear}년 세운`,
        `${facts.monthBranch} 월지`,
        `${facts.usefulElements} 보완 기운`,
      ], 6),
      keyPoint: `시기는 운이 대신 결정해 주는 답이 아니라 선택을 현실로 옮기기 좋은 리듬입니다.`,
      interpretation: `${category}에서는 만남, 결정, 조율, 휴식의 때를 나누어 봅니다. 좋은 흐름이 열릴 때는 행동을 늘리고, 조심할 흐름에서는 관계의 속도를 늦추는 것이 좋습니다.`,
      advice: "좋은 달에는 만남과 대화를 늘리고, 예민한 달에는 결론보다 점검을 우선합니다.",
      caution: "시기 운을 핑계로 준비 없는 선택을 밀어붙이면 좋은 흐름도 소모됩니다.",
      checklist: ["올해 행동을 시작할 시기를 정했는가", "조심할 때의 대화 원칙이 있는가", "운의 흐름을 실제 행동 계획으로 바꾸었는가"],
    },
    compatibility: {
      evidence: loveSecretCleanList([
        ...loveSecretCompatibilityEvidenceHints(category, facts),
        `${loveSecretPair(facts.selfDayMaster, facts.partnerDayMaster)} 일간`,
        `${loveSecretPair(facts.dayBranch, facts.partnerDayBranch)} 배우자궁`,
        `${facts.dominantElement}/${facts.partnerDominantElement} 오행 흐름`,
      ], 6),
      keyPoint: `궁합은 좋고 나쁨의 판정이 아니라 서로의 속도와 기대를 조율하는 지도입니다.`,
      interpretation: `${category}에서는 두 사람이 끌리는 이유와 흔들리는 이유를 함께 봅니다. 서로의 다른 반응을 애정 부족으로 해석하지 않고 생활 리듬과 감정 언어로 번역할 때 관계가 안정됩니다.`,
      advice: "각자가 원하는 행동을 하나씩 말하고 이번 주에 지킬 작은 약속을 정합니다.",
      caution: "한 사람의 기준으로만 관계 방향을 정하면 상대는 쉽게 방어적으로 변합니다.",
      checklist: ["서로의 기대를 같은 문장으로 확인했는가", "생활 리듬 차이를 합의했는가", "갈등 후 회복 방식을 정했는가"],
    },
    plan: {
      evidence: ["상담 질문의 핵심 방향", "관계 목표의 현실화", `${facts.usefulElements} 보완 기운`],
      keyPoint: `마스터플랜은 예언이 아니라 반복 가능한 행동 기준으로 완성됩니다.`,
      interpretation: `${category}에서는 앞으로의 사랑을 바꾸기 위해 지금 당장 줄일 행동과 늘릴 행동을 정리합니다. 작은 루틴이 반복되면 관계 운은 감정의 파도보다 안정적인 방향으로 움직입니다.`,
      advice: "오늘, 7일, 30일 단위로 실천할 행동을 각각 하나씩 정합니다.",
      caution: "계획이 너무 크면 지속되지 않으니 가장 작은 행동부터 시작합니다.",
      checklist: ["오늘 할 행동이 하나로 좁혀졌는가", "반복할 루틴이 있는가", "멈춰야 할 관계 신호를 정했는가"],
    },
  };
  const specific = buildLoveSecretCategorySpecificProfile({ category, facts, kind, role }) || {};
  const selected = { ...(profiles[kind] || common), ...specific };
  return {
    kind,
    role,
    facts,
    evidence: selected.evidence || common.evidence,
    keyPoint: selected.keyPoint || common.keyPoint,
    interpretation: selected.interpretation || common.interpretation,
    advice: selected.advice || common.advice,
    caution: selected.caution || common.caution,
    checklist: selected.checklist || common.checklist,
  };
}

function loveSecretCategoryScopedSentence(category, sentence, fallback = "") {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  const text = loveSecretSafeDisplayText(sentence, fallback || `${title}의 흐름을 차분히 확인합니다.`);
  const sentences = text.split(/(?<=[.!?])\s+/u).map((item) => item.trim()).filter(Boolean);
  if (!sentences.length) return `${title}의 흐름을 차분히 확인합니다.`;
  return sentences.map((item, index) => {
    if (item.includes(title)) return item;
    if (index > 0) {
      return loveSecretTextVariant(`${title}:${item}:scoped-follow`, [
        `${loveSecretCategorySubject(title)} ${item}`,
        `${title}의 실제 관계 장면에서는 ${item}`,
        `${title} 관점에서 현실 장면을 보면 ${item}`,
        `이 판단은 ${title}에서도 이어지며, ${item}`,
        `특히 ${title}에서는 ${item}`,
        `이 부분은 ${title} 안에서 말보다 반복되는 행동으로 확인되며, ${item}`,
      ]);
    }
    return loveSecretTextVariant(`${title}:${item}:scoped-lead`, [
      `${title}에서는 ${item}`,
      `이 항목의 핵심은 ${title}에서 ${item}`,
      `여기서는 ${title}${loveSecretKoreanParticle(title, "이", "가")} 드러내는 ${item}`,
      `실제 상담에서는 ${title}의 장면에서 ${item}`,
      `실제 관계 장면으로 옮기면 ${title}${loveSecretKoreanParticle(title, "은", "는")} ${item}`,
      `명리 흐름으로 보면 ${title}에서 ${item}`,
      `고객님의 연애 흐름 안에서는 ${title}${loveSecretKoreanParticle(title, "이", "가")} ${item}`,
    ]);
  }).join(" ");
}

function loveSecretCategoryNoteSentence(category, label, sentence) {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  const scoped = loveSecretCategoryScopedSentence(title, sentence).split(/(?<=[.!?])\s+/u).filter(Boolean).join(" ");
  const subject = loveSecretCategorySubject(title);
  let core = scoped;
  [`${title}에서는 `, `${title}은 `, `${title}는 `, `${title}의 `, `${title} `, `${subject} `].forEach((lead) => {
    if (core.startsWith(lead)) core = core.slice(lead.length);
  });
  const openings = {
    "핵심 판단": ["핵심으로 보면", "상담의 중심은", "중요하게 볼 점은", "명리적으로는"],
    "실천 처방": ["실천은", "오늘의 처방은", "행동 기준은", "관계에서 쓸 문장은"],
    "마무리 기준": ["마무리는", "마지막 기준은", "정리하면", "결론의 방향은"],
    "주의 신호": ["주의할 신호는", "조심할 부분은", "놓치면 안 될 대목은", "예민하게 볼 지점은"],
    "명리 보완": ["보완 관점은", "명리 보완은", "운의 균형으로는", "관계의 보완점은"],
  };
  const opening = loveSecretTextVariant(`${title}:${label}`, openings[label] || ["상담 포인트는", "실제 기준은", "확인할 부분은"]);
  return `${title}의 ${opening} ${core}`;
}

function loveSecretPersonalizedList(category, values = []) {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  return loveSecretCleanList(values, 6).map((item) => {
    const text = loveSecretSafeDisplayText(item, "");
    if (!text) return "";
    if (text.includes(title)) return text;
    return `${title}: ${text}`;
  }).filter(Boolean);
}

function loveSecretCategoryOpeningLine(kind, category, facts, isCompat) {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  const subjectTitle = loveSecretCategorySubject(title);
  if (kind === "dayMaster") return `${subjectTitle} ${facts.selfDayMaster} 일간이 사랑 앞에서 지키려는 자존감과 선택의 속도를 비춥니다.`;
  if (kind === "spousePalace") return `${subjectTitle} ${facts.dayBranch} 배우자궁이 가까운 관계에서 어떻게 안심하고 경계하는지를 드러냅니다.`;
  if (kind === "monthBranch") return `${subjectTitle} ${facts.monthBranch} 월지가 만든 생활 리듬과 연애의 계절감을 읽는 자리입니다.`;
  if (kind === "element") return `${subjectTitle} ${facts.dominantElement}의 강한 온도와 ${facts.deficientElement}의 빈자리가 관계에서 어떻게 섞이는지 봅니다.`;
  if (kind === "tenGod") return `${subjectTitle} ${facts.dominantTenGod} 중심 십성이 사랑에서 맡으려는 역할과 기대를 비춥니다.`;
  if (kind === "longTerm") return `${subjectTitle} ${loveSecretPair(facts.spouseStar, `${facts.dayBranch} 배우자궁`)}을 통해 오래 갈 약속의 현실성을 살핍니다.`;
  if (kind === "attraction") return `${subjectTitle} 설렘이 운명감으로 번지는 지점과 오래 남는 끌림의 차이를 가릅니다.`;
  if (kind === "communication") return `${subjectTitle} 마음의 크기보다 말의 순서와 확인 방식이 관계를 어떻게 바꾸는지 비춥니다.`;
  if (kind === "anxiety") return `${subjectTitle} 안심받고 싶은 마음이 어떤 순간 집착이나 회피로 바뀌는지 살핍니다.`;
  if (kind === "conflict") return `${subjectTitle} 다툼의 표면보다 방어 반응이 반복되는 지점을 먼저 봐야 합니다.`;
  if (kind === "reunion") return `${subjectTitle} 미련이 아니라 다시 만나도 같은 상처를 반복하지 않을 조건을 묻습니다.`;
  if (kind === "intimacy") return `${subjectTitle} 조후의 온도와 거리감을 통해 몸과 마음이 편안해지는 속도를 봅니다.`;
  if (kind === "timing") return `${subjectTitle} ${facts.targetYear}년 흐름에서 선택을 현실로 옮기기 좋은 리듬을 짚습니다.`;
  if (kind === "compatibility") return `${subjectTitle} ${loveSecretPair(facts.selfDayMaster, facts.partnerDayMaster)}이 서로를 받아들이는 방식의 차이를 살핍니다.`;
  if (kind === "plan") return `${subjectTitle} 마음을 달래는 조언이 아니라 반복 가능한 관계 습관으로 정리해야 합니다.`;
  return isCompat
    ? `${subjectTitle} 두 사람의 관계에서 서로 다른 속도와 기대가 만나는 지점을 살핍니다.`
    : `${subjectTitle} 사랑에서 반복되는 선택과 감정의 결을 구체적으로 확인하는 자리입니다.`;
}

function loveSecretCategoryEvidenceLine(kind, category, facts, profile, isCompat) {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  const evidence = loveSecretCleanList(profile?.evidence, 4).join(", ");
  if (kind === "dayMaster") return `${title}의 명리 근거는 ${evidence}입니다. ${title}에서는 일간이 선명할수록 사랑에서도 먼저 잃지 말아야 할 기준이 분명해집니다.`;
  if (kind === "spousePalace") return `${title}에서는 ${evidence}라는 근거를 함께 놓고, 설렘 뒤에 남는 편안함과 생활 반응을 따져 봅니다.`;
  if (kind === "monthBranch") return `${title}의 핵심 근거는 ${evidence}입니다. ${title}에서는 월지가 맞을수록 만남의 빈도와 휴식의 박자가 무리 없이 이어집니다.`;
  if (kind === "element") return `${loveSecretCategorySubject(title)} ${evidence}라는 근거로 끌림의 열기와 관계를 식히거나 살리는 보완 기운을 나눕니다.`;
  if (kind === "tenGod") return `${title}에서는 ${evidence}가 사랑받는 방식, 표현 방식, 기대의 언어로 드러납니다.`;
  if (kind === "longTerm") return `${loveSecretCategorySubject(title)} ${evidence}라는 기준으로 감정 확신보다 생활의 책임이 지속될지를 봅니다.`;
  if (kind === "attraction") return `${title}의 사주 단서는 ${evidence}입니다. ${title}에서는 강한 자극과 오래 남는 안정감을 분리해야 인연의 질이 보입니다.`;
  if (kind === "communication") return `${title}에서는 ${evidence}가 말의 속도, 침묵의 의미, 사과가 통하는 문장으로 바뀝니다.`;
  if (kind === "anxiety") return `${loveSecretCategorySubject(title)} ${evidence}가 자극될 때 해석이 커지는 지점을 구분해야 정확합니다.`;
  if (kind === "conflict") return `${title}의 명리 근거는 ${evidence}입니다. ${title}에서는 충돌이 사건보다 각자의 방어 방식에서 길어지는 경우가 많습니다.`;
  if (kind === "reunion") return `${loveSecretCategorySubject(title)} ${evidence}라는 흐름을 바탕으로 다시 이어질 조건과 정리해야 할 신호를 나눕니다.`;
  if (kind === "intimacy") return `${loveSecretCategorySubject(title)} ${evidence}라는 조후 단서로 가까워지는 온도, 경계, 밀착의 리듬을 살핍니다.`;
  if (kind === "timing") return `${title}의 근거는 ${evidence}입니다. ${title}에서는 좋은 운이 준비된 행동과 만날 때 관계의 문을 엽니다.`;
  if (kind === "compatibility") return `${title}에서는 ${evidence}라는 근거를 겹쳐 보며 끌림, 피로, 회복의 방향을 함께 살핍니다.`;
  if (kind === "plan") return `${loveSecretCategorySubject(title)} ${evidence}라는 상담 단서를 지금 할 행동, 줄일 행동, 멈출 기준으로 바꾸는 단계입니다.`;
  return isCompat
    ? `${title}의 근거는 ${evidence}입니다. ${title}에서는 두 사람의 차이를 판정이 아니라 조율해야 할 리듬으로 봐야 합니다.`
    : `${title}의 근거는 ${evidence}입니다. ${title}에서는 감정의 크기보다 반복되는 선택을 함께 봐야 정확합니다.`;
}

function loveSecretCategoryPracticeLine(kind, category, facts, isCompat) {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  if (kind === "dayMaster") return `${title}의 실천은 호감이 커질수록 ${facts.selfDayMaster} 일간의 품위를 지키는 말 한 가지를 먼저 정하는 것입니다.`;
  if (kind === "spousePalace") return `${title}에서는 가까워진 뒤 편안해지는 행동과 불편해지는 행동을 따로 적어야 합니다.`;
  if (kind === "monthBranch") return `${title}의 처방은 연락, 만남, 휴식의 주기를 감정이 아니라 현실 리듬에 맞추는 것입니다.`;
  if (kind === "element") return `${loveSecretCategorySubject(title)} ${facts.usefulElements}을 살리는 생활 행동을 하나 정할 때 과열된 감정이 부드러워집니다.`;
  if (kind === "tenGod") return `${title}에서는 원하는 역할을 시험하지 말고 짧고 품격 있는 요청 문장으로 바꿔야 합니다.`;
  if (kind === "longTerm") return `${title}의 실전 기준은 돈, 가족, 시간, 역할 중 아직 말하지 않은 조건을 부드럽게 확인하는 것입니다.`;
  if (kind === "attraction") return `${title}에서는 설렘이 커질수록 상대의 일관성, 책임감, 생활 태도를 함께 봐야 합니다.`;
  if (kind === "communication") return `${title}의 처방은 사실 확인, 감정 표현, 원하는 행동 제안을 한 번에 섞지 않는 것입니다.`;
  if (kind === "anxiety") return `${title}에서는 불안이 올라온 날 바로 결론을 요구하지 말고 원하는 안심 행동을 짧게 요청해야 합니다.`;
  if (kind === "conflict") return `${title}의 회복법은 결론을 밀어붙이기 전에 다시 이야기할 시간을 정하는 것입니다.`;
  if (kind === "reunion") return `${title}에서는 연락 전 바뀐 행동, 확인할 조건, 멈출 기준을 먼저 써야 합니다.`;
  if (kind === "intimacy") return `${loveSecretCategorySubject(title)} 편안한 속도와 경계를 말할수록 친밀감이 애정 확인 싸움으로 번지지 않습니다.`;
  if (kind === "timing") return `${title}에서는 좋은 달에 만남과 대화를 늘리고 예민한 달에는 결정보다 점검을 우선합니다.`;
  if (kind === "compatibility") return `${title}의 실천은 서로 원하는 행동을 하나씩 말하고 이번 주에 지킬 작은 약속으로 좁히는 것입니다.`;
  if (kind === "plan") return `${loveSecretCategorySubject(title)} 오늘, 7일, 30일 단위로 행동을 하나씩만 정할 때 실제 운을 움직입니다.`;
  return isCompat
    ? loveSecretTextVariant(title, [
      `${title}에서는 서로가 원하는 답보다 먼저 확인할 순서와 멈출 기준을 맞출 때 관계가 안정됩니다.`,
      `${title}에서는 한쪽의 결론을 밀어붙이기보다 두 사람이 같은 장면을 어떻게 해석하는지 나누어야 합니다.`,
      `${title}에서는 기대의 차이를 옳고 그름으로 보지 않고 이번 주에 지킬 작은 합의로 옮겨야 합니다.`,
      `${title}에서는 감정의 속도를 맞추기보다 말할 때와 기다릴 때를 함께 정하는 일이 중요합니다.`,
    ])
    : loveSecretTextVariant(title, [
      `${title}에서는 판단을 흐리는 첫 반응을 알아차리고 신뢰를 키우는 행동으로 바꾸어 봅니다.`,
      `${title}에서는 마음이 급해지는 장면과 실제로 확인해야 할 장면을 분리해야 합니다.`,
      `${title}에서는 익숙한 방어를 잠시 멈추고 관계를 살리는 태도 하나를 꾸준히 선택합니다.`,
      `${title}에서는 감정의 결론보다 오늘 반복할 수 있는 말과 행동을 먼저 정합니다.`,
      `${title}에서는 상대의 마음을 단정하기 전에 내 기준과 요청을 품격 있게 정리합니다.`,
    ]);
}

function loveSecretCategoryActionGuideLine(kind, category, facts, isCompat) {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  if (kind === "communication") return `${title}의 실행 초점은 말하기 전 사실, 감정, 요청을 세 칸으로 나누는 것입니다.`;
  if (kind === "anxiety") return `${title}의 실행 초점은 확인 요구를 보내기 전 불안의 근거와 해석을 분리하는 것입니다.`;
  if (kind === "attraction") return `${title}의 실행 초점은 설렘을 키우기 전에 상대의 반복 행동을 확인하는 것입니다.`;
  if (kind === "longTerm") return `${title}의 실행 초점은 감정 확신을 생활 기준, 돈, 가족, 시간의 언어로 번역하는 것입니다.`;
  if (kind === "reunion") return `${title}의 실행 초점은 다시 연락하기 전 바뀐 행동과 멈출 기준을 먼저 쓰는 것입니다.`;
  if (kind === "intimacy") return `${title}의 실행 초점은 편안한 속도와 불편한 경계를 말로 조율하는 것입니다.`;
  if (kind === "timing") return `${title}의 실행 초점은 좋은 흐름에 할 행동과 예민한 흐름에 피할 행동을 나누는 것입니다.`;
  if (kind === "compatibility") return `${title}의 실행 초점은 두 사람이 같은 결론보다 같은 확인 절차를 갖는 것입니다.`;
  if (kind === "plan") return `${title}의 실행 초점은 오늘 할 일, 일주일 기준, 한 달 루틴을 작게 나누는 것입니다.`;
  if (kind === "spousePalace") return `${title}의 실행 초점은 가까워진 뒤 편안한 행동과 불편한 행동을 따로 관찰하는 것입니다.`;
  if (kind === "dayMaster") return `${title}의 실행 초점은 ${facts.selfDayMaster} 일간의 기준을 잃지 않는 표현을 준비하는 것입니다.`;
  return isCompat
    ? loveSecretTextVariant(title, [
      `${title}에서는 서로의 속도 차이를 말로 확인하고 이번 주에 지킬 합의로 옮깁니다.`,
      `${title}에서는 한쪽이 맞추는 방식보다 둘 다 지킬 수 있는 대화 절차를 정합니다.`,
      `${title}에서는 다름을 설득하려 하지 말고 불편해지는 순간의 신호를 함께 정합니다.`,
      `${title}에서는 관계를 밀어붙일 때와 기다릴 때를 같은 문장으로 확인합니다.`,
    ])
    : loveSecretTextVariant(title, [
      `${title}에서는 오늘 줄일 반응과 유지할 태도를 하나씩 정합니다.`,
      `${title}에서는 감정이 올라온 순간의 첫 행동을 바꾸는 데 초점을 둡니다.`,
      `${title}에서는 상대를 시험하는 말 대신 확인 가능한 요청을 짧게 준비합니다.`,
      `${title}에서는 마음을 크게 증명하기보다 작게 반복할 행동을 고릅니다.`,
      `${title}에서는 불안을 키우는 습관과 사랑을 살리는 습관을 나누어 실행합니다.`,
    ]);
}

function loveSecretSectionFrameLine({ sectionTitle, facts, chapterNo, sectionNo, isCompat }) {
  const title = loveSecretSafeDisplayText(sectionTitle, "이 카테고리");
  if (sectionNo === 1) {
    return loveSecretTextVariant(`${title}:${chapterNo}:first-frame`, [
      `${title}에서는 이 장의 핵심 목표를 실제 관계에서 확인할 수 있는 기준으로 세웁니다.`,
      `먼저 ${title}${loveSecretKoreanParticle(title, "을", "를")} 통해 이 장의 상담 방향을 잡습니다.`,
      `이 장은 ${title}${loveSecretKoreanParticle(title, "을", "를")} 출발점으로 삼아 관계의 핵심 장면을 살핍니다.`,
      `상담의 문은 ${title}${loveSecretKoreanParticle(title, "으", "")}로 열고, 실제 선택 기준으로 좁혀 갑니다.`,
    ]);
  }
  const soloFrames = [
    `${loveSecretCategorySubject(title)} 감정의 결론보다 반복되는 장면을 먼저 읽어야 정확합니다.`,
    `${title}에서는 마음의 크기보다 관계가 실제로 움직이는 방식을 봅니다.`,
    `${loveSecretCategorySubject(title)} 사주 구조가 사랑의 선택으로 번역되는 지점을 비춥니다.`,
    `${title}에서는 지금 필요한 태도와 멈춰야 할 반응을 나누어 봅니다.`,
    `${loveSecretCategorySubject(title)} 상대의 마음을 맞히기보다 고객님의 관계 기준을 선명하게 합니다.`,
    `${title}에서는 설렘 뒤에 반복될 수 있는 생활 장면을 먼저 확인합니다.`,
    `${loveSecretCategorySubject(title)} 고객님의 강점이 관계 안에서 어떻게 살아나는지 살핍니다.`,
    `${title}에서는 사랑을 서두르게 하는 마음과 지켜야 할 경계를 함께 봅니다.`,
    `${loveSecretCategorySubject(title)} 익숙한 선택이 좋은 인연을 부르는지 소모를 부르는지 나눕니다.`,
    `${title}에서는 감정의 파도보다 오래 남는 태도와 습관을 확인합니다.`,
  ];
  const compatFrames = [
    `${title}에서는 두 사람이 같은 장면을 서로 다르게 받아들이는 이유를 봅니다.`,
    `${loveSecretCategorySubject(title)} 한쪽의 잘잘못보다 관계의 박자가 어긋나는 지점을 살핍니다.`,
    `${title}에서는 끌림, 부담, 회복 가능성을 한 흐름 안에서 나눕니다.`,
    `${loveSecretCategorySubject(title)} 서로의 기대가 부딪히는 자리와 맞물리는 자리를 함께 비춥니다.`,
    `${title}에서는 관계를 밀어붙일 때와 기다릴 때를 구분해야 합니다.`,
    `${title}에서는 서로에게 맞춰야 할 부분과 그대로 존중할 부분을 구분합니다.`,
    `${loveSecretCategorySubject(title)} 두 사람의 속도 차이가 안정감으로 바뀌는 조건을 살핍니다.`,
    `${title}에서는 기대가 엇갈리는 장면을 작은 약속으로 되돌리는 방법을 봅니다.`,
    `${loveSecretCategorySubject(title)} 감정의 결론보다 회복 가능한 대화 순서를 확인합니다.`,
    `${title}에서는 함께 있을 때 편해지는 리듬과 부담되는 리듬을 나누어 봅니다.`,
    `${title}에서는 두 사람의 반응 차이를 관계의 운영 규칙으로 바꾸어 봅니다.`,
    `${loveSecretCategorySubject(title)} 서로가 안심하는 표현과 부담스러운 표현을 따로 구분합니다.`,
    `${title}에서는 같은 문제를 반복하지 않기 위한 확인 순서를 세웁니다.`,
    `${loveSecretCategorySubject(title)} 마음의 온도와 현실 조건이 만나는 지점을 살핍니다.`,
    `${title}에서는 상대를 설득하기보다 두 사람이 지킬 수 있는 방식을 찾습니다.`,
    `${loveSecretCategorySubject(title)} 관계가 편해지는 행동과 무거워지는 행동을 나누어 봅니다.`,
    `${title}에서는 감정의 속도보다 서로의 회복 방식을 먼저 확인합니다.`,
    `${loveSecretCategorySubject(title)} 좋은 마음이 실제 약속으로 이어지는지 점검합니다.`,
  ];
  const frames = isCompat ? compatFrames : soloFrames;
  const tone = loveSecretTextVariant(`${sectionNo}:${chapterNo}:${title}:frame-tone`, [
    "차분히",
    "섬세하게",
    "현실적으로",
    "단정 없이",
    "생활 장면으로",
    "대화 기준으로",
    "느린 호흡으로",
    "관계의 품격을 지키며",
    "실천 관점에서",
    "감정과 현실을 나누어",
  ]);
  const frame = loveSecretTextVariant(`${title}:${chapterNo}:${sectionNo}:${isCompat ? "compat" : "solo"}`, frames);
  return frame.replace(/(봅니다|살핍니다|나눕니다|비춥니다|구분해야 합니다|확인합니다)\.$/u, `${tone} $1.`);
}

function loveSecretSectionPatternLine({ kind, sectionTitle, facts, sectionNo, isCompat }) {
  const title = loveSecretSafeDisplayText(sectionTitle, "이 카테고리");
  if (!isCompat && sectionNo === 1) {
    return loveSecretTextVariant(`${title}:solo:first-pattern`, [
      `${loveSecretCategoryObject(title)} 고객님의 연애사에 대입하면 이상형의 단서와 반복 습관이 함께 드러납니다.`,
      `고객님의 지난 관계에 비추어 보면 ${title}${loveSecretKoreanParticle(title, "은", "는")} 끌림의 시작과 멈춤의 이유를 함께 비춥니다.`,
      `이 대목은 고객님이 사랑에서 자주 선택하는 사람과 오래 남는 장면을 분리해 보게 합니다.`,
    ]);
  }
  if (isCompat && sectionNo === 1) {
    return loveSecretTextVariant(`${title}:compat:first-pattern`, [
      `${loveSecretCategoryObject(title)} 두 사람에게 적용하면 ${facts.loveStatus}의 흐름 안에서 기대, 속도, 회복 방식을 함께 확인하게 됩니다.`,
      `두 분의 관계에 비추어 보면 ${title}${loveSecretKoreanParticle(title, "은", "는")} 끌림과 부담이 동시에 생기는 자리를 드러냅니다.`,
      `${title}${loveSecretKoreanParticle(title, "은", "는")} 두 사람이 같은 마음을 서로 다른 속도로 표현하는 순간을 확인하게 합니다.`,
    ]);
  }
  if (kind === "timing") return `${title}에서는 흐름이 열리는 때와 속도를 늦춰야 할 때를 구분해야 실행력이 생깁니다.`;
  if (kind === "communication") return `${title}에서는 말의 내용보다 순서, 온도, 여백이 관계의 반응을 바꿉니다.`;
  if (kind === "anxiety") return `${title}에서는 불안의 원인이 사실인지 해석인지 나누는 것이 먼저입니다.`;
  if (kind === "reunion") return `${title}에서는 다시 이어질 가능성과 정리해야 할 신호를 동시에 보아야 합니다.`;
  if (kind === "intimacy") return `${title}에서는 가까워지는 속도와 편안한 경계가 사랑의 안정감을 좌우합니다.`;
  if (kind === "longTerm") return `${title}에서는 감정의 확신이 생활 책임으로 이어지는지를 확인합니다.`;
  if (kind === "compatibility") return `${title}에서는 서로의 차이를 맞고 틀림이 아니라 번역해야 할 언어로 봅니다.`;
  return loveSecretTextVariant(title, isCompat ? [
    `${title}에서는 두 사람의 기질 차이가 대화, 거리감, 약속 방식에서 어떻게 드러나는지 봅니다.`,
    `${title}에서는 서로의 기대가 맞물리는 자리와 피로가 쌓이는 자리를 나누어 살핍니다.`,
    `${title}에서는 같은 상황을 다르게 받아들이는 이유를 실제 생활 장면으로 옮겨 확인합니다.`,
    `${title}에서는 끌림을 유지하는 행동과 관계를 소모시키는 습관을 함께 살핍니다.`,
    `${title}에서는 서로가 편해지는 장면과 방어적으로 변하는 장면을 따로 살핍니다.`,
    `${title}에서는 관계의 강점이 실제 약속 안에서 유지되는지를 확인합니다.`,
    `${title}에서는 두 사람이 같은 마음을 다른 방식으로 표현하는 지점을 살핍니다.`,
    `${title}에서는 다름을 줄이는 일보다 다름을 안전하게 다루는 방식을 봅니다.`,
    `${title}에서는 서로가 안심하는 방식과 불편해지는 방식을 따로 확인합니다.`,
    `${title}에서는 두 사람의 생활 리듬이 감정의 안정감에 미치는 영향을 봅니다.`,
    `${title}에서는 상대를 설득하기보다 함께 지킬 기준을 만드는 흐름으로 살핍니다.`,
    `${title}에서는 기대가 다를 때 관계를 지키는 언어가 무엇인지 살핍니다.`,
    `${title}에서는 같은 애정이 서로 다른 행동으로 표현되는 장면을 구분합니다.`,
  ] : [
    `${title}에서는 타고난 성향이 말투, 선택 속도, 관계 기준으로 드러나는 지점을 살핍니다.`,
    `${title}에서는 감정의 방향과 실제 태도가 만나는 부분을 차분히 확인합니다.`,
    `${title}에서는 사랑을 흔드는 습관과 관계를 살리는 습관을 따로 봅니다.`,
    `${title}에서는 고객님의 선택 패턴이 어떤 인연을 부르고 멀어지게 하는지 살핍니다.`,
    `${title}에서는 마음의 크기보다 반복된 행동의 결을 먼저 확인합니다.`,
    `${title}에서는 관계가 흔들리는 순간의 말투와 선택 순서를 함께 봅니다.`,
    `${title}에서는 끌림이 깊어질 때 생기는 기대와 거리감을 나누어 살핍니다.`,
    `${title}에서는 반복된 연애 장면을 통해 지금 바꿀 수 있는 기준을 찾습니다.`,
    `${title}에서는 편안해지는 사랑과 소모되는 사랑의 차이를 살핍니다.`,
    `${title}에서는 사주의 기질을 실제 만남의 리듬과 대화 방식으로 풀어냅니다.`,
    `${title}에서는 관계 안에서 강해지는 장점과 예민해지는 약점을 함께 봅니다.`,
    `${title}에서는 인연을 끌어당기는 태도와 멀어지게 하는 반응을 구분합니다.`,
  ]);
}

function loveSecretCautionLeadLine({ kind, sectionTitle, subject, chapterNo, sectionNo }) {
  const title = loveSecretSafeDisplayText(sectionTitle, "이 카테고리");
  const leads = [
    `${title}에서 먼저 경계할 부분은 ${subject}의 마음이 급해질 때 기준이 흐려지는 순간입니다.`,
    `${title}의 민감한 지점은 감정이 커질수록 확인보다 해석이 앞설 수 있다는 데 있습니다.`,
    `${title}에서는 좋은 의도라도 상대에게 압박으로 전달되는 장면을 조심해야 합니다.`,
    `${title}의 균형은 서두르지 않고 실제 행동을 확인할 때 살아납니다.`,
    `${title}에서는 마음을 보호하되 관계를 닫아 버리지 않는 태도가 필요합니다.`,
  ];
  if (kind === "timing") return `${title}에서 조심할 흐름은 좋은 시기를 핑계로 준비 없는 선택을 서두르는 것입니다.`;
  if (kind === "intimacy") return `${title}에서 섬세하게 볼 부분은 속도의 차이를 애정 부족으로 단정하지 않는 것입니다.`;
  if (kind === "conflict") return `${title}에서 가장 위험한 지점은 문제 해결보다 상처 주는 문장이 먼저 나오는 순간입니다.`;
  return leads[(chapterNo + sectionNo) % leads.length];
}

function loveSecretCategorySupportLine(kind, facts, category = "") {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  if (["element", "intimacy", "timing"].includes(kind)) {
    return `${title}에서는 ${facts.usefulElements}의 기운을 살리고 ${facts.cautionElements}의 과열을 낮추는 쪽으로 판단해야 합니다.`;
  }
  if (kind === "tenGod") {
    return `${title}에서는 ${facts.dominantTenGod}의 기대를 말없이 시험하지 않고 요청의 언어로 바꾸는 것이 중요합니다.`;
  }
  if (kind === "spousePalace" || kind === "longTerm") {
    return `${title}에서는 ${facts.dayBranch} 배우자궁과 ${facts.spouseStar}의 흐름을 설렘 이후의 안정 조건으로 확인해야 합니다.`;
  }
  if (kind === "compatibility") {
    return `${title}에서는 ${loveSecretPair(facts.selfDayMaster, facts.partnerDayMaster)}의 차이를 잘잘못보다 속도와 언어의 차이로 해석해야 합니다.`;
  }
  if (kind === "reunion") {
    return `${title}에서는 감정의 크기보다 다시 만났을 때 반복 문제를 다르게 다룰 준비가 되었는지를 봅니다.`;
  }
  if (kind === "communication") {
    return `${title}에서는 확인 질문과 감정 표현을 분리해야 같은 마음도 덜 날카롭게 전달됩니다.`;
  }
  if (kind === "conflict") {
    return `${title}에서는 사건 자체보다 반복되는 방어 반응을 보고 금지 문장과 회복 문장을 함께 정해야 합니다.`;
  }
  if (kind === "anxiety") {
    return `${title}에서는 결론 요구보다 안심받고 싶은 행동을 구체화할 때 관계가 덜 흔들립니다.`;
  }
  return loveSecretTextVariant(title, [
    `${loveSecretCategorySubject(title)} 말보다 반복된 태도와 선택의 방향을 함께 보아야 정확합니다.`,
    `${title}에서는 감정이 커지는 순간보다 그 뒤에 남는 행동의 일관성을 봐야 합니다.`,
    `${title}에서는 마음의 진심을 추측하기보다 확인 가능한 약속과 반응을 기준으로 삼습니다.`,
    `${title}에서는 끌림, 불안, 기대가 실제 관계 습관으로 어떻게 굳어지는지 살펴야 합니다.`,
    `${loveSecretCategorySubject(title)} 상담은 단정이 아니라 고객님이 바로 바꿀 수 있는 선택을 찾는 과정입니다.`,
    `${title}에서는 말의 확신보다 생활 속에서 반복되는 신뢰의 모양을 봐야 합니다.`,
    `${title}에서는 마음이 흔들릴 때 무엇을 확인하고 무엇을 기다릴지 나누어야 합니다.`,
    `${title}에서는 상대의 반응을 해석하기 전에 고객님의 기준을 먼저 정돈해야 합니다.`,
    `${title}에서는 좋은 감정이 오래 남을 수 있는 행동의 구조를 확인해야 합니다.`,
    `${loveSecretCategorySubject(title)} 실제 상담에서는 예측보다 조율 가능한 선택지를 찾는 일이 중요합니다.`,
    `${title}에서는 관계의 흐름을 감정 하나로 묶지 않고 말, 거리, 약속으로 나누어 봅니다.`,
    `${title}에서는 지금 당장 바꿀 수 있는 태도와 시간을 두고 볼 신호를 구분해야 합니다.`,
  ]);
}

function loveSecretCategoryClosingLine(kind, facts, category = "") {
  const title = loveSecretSafeDisplayText(category, "이 카테고리");
  const map = {
    dayMaster: `${title}의 마무리는 ${facts.selfDayMaster} 일간의 기준을 해치지 않는 표현 한 가지를 정하는 것입니다.`,
    spousePalace: `${title}에서는 가까워진 뒤 편안함이 유지되는 행동과 불편함이 커지는 행동을 각각 하나씩 기록해 보세요.`,
    monthBranch: `${title}의 결론은 연락, 만남, 휴식의 주기를 현실적으로 맞추는 작은 약속입니다.`,
    element: `${title}에서는 ${facts.usefulElements}을 살리는 생활 행동을 하나 정하면 감정의 과열이 줄어듭니다.`,
    tenGod: `${title}의 핵심은 ${facts.dominantTenGod}의 기대를 시험이 아니라 요청 문장으로 바꾸는 것입니다.`,
    longTerm: `${title}에서는 돈, 가족, 시간, 역할 중 아직 말하지 않은 현실 조건을 하나씩 확인해야 합니다.`,
    attraction: `${title}에서는 설렘이 커질수록 상대의 일관성과 책임 있는 행동을 함께 확인해야 합니다.`,
    communication: `${title}의 마무리는 사실 확인, 감정 표현, 원하는 행동 제안을 각각 한 문장으로 나누는 것입니다.`,
    anxiety: `${title}에서는 불안이 올라온 날 큰 결정을 미루고 원하는 안심 행동을 짧게 요청하는 편이 안전합니다.`,
    conflict: `${title}에서는 결론보다 다시 이야기할 시간을 정하는 것이 회복을 앞당깁니다.`,
    reunion: `${title}에서는 연락 전 재회 후 달라질 행동과 멈춰야 할 기준을 먼저 정해야 합니다.`,
    intimacy: `${loveSecretCategorySubject(title)} 속도를 맞추는 일이므로 편안한 경계와 원하는 리듬을 함께 말해야 합니다.`,
    timing: `${title}에서 ${facts.targetYear}년의 흐름은 행동을 대신해 주지 않으므로 좋은 시기에는 준비된 선택을 실행해야 합니다.`,
    compatibility: `${title}에서는 같은 결론보다 같은 확인 절차를 가질 때 관계가 오래 안정됩니다.`,
    plan: `${loveSecretCategorySubject(title)} 오늘, 7일, 30일 단위로 하나씩만 정하면 실제 관계 습관으로 바뀝니다.`,
  };
  return map[kind] || loveSecretTextVariant(title, [
    `${title}에서는 익숙한 반응을 잠시 멈추고 관계를 살리는 말을 먼저 선택해 보세요.`,
    `${title}의 결론은 크게 바꾸는 일이 아니라 오늘도 지킬 수 있는 작은 기준을 세우는 것입니다.`,
    `${title}에서는 상대를 바꾸려 하기 전 고객님의 말, 거리, 선택을 정돈하는 일이 먼저입니다.`,
    `${title}에서는 마음의 답을 서두르지 말고 실제 행동으로 확인되는 신호를 기다려 보세요.`,
    `${title}에서는 사랑을 증명하려 애쓰기보다 오래 남을 태도를 차분히 반복하는 편이 좋습니다.`,
    `${title}에서는 감정이 앞서는 날일수록 짧은 요청과 충분한 여지를 함께 남겨 보세요.`,
    `${title}의 마무리는 단정이 아니라 다음 대화에서 확인할 기준을 세우는 것입니다.`,
    `${title}에서는 관계를 지키는 행동과 나를 지키는 경계를 같은 무게로 두세요.`,
    `${title}에서는 오늘의 마음을 바로 결론으로 만들지 말고 반복되는 신호를 더 살펴보세요.`,
    `${title}에서는 좋은 인연을 붙잡는 힘보다 나를 잃지 않는 태도가 먼저입니다.`,
    `${title}에서는 상대를 더 붙잡는 말보다 관계를 편안하게 만드는 태도를 먼저 선택하세요.`,
    `${title}의 마지막 기준은 마음을 증명하는 일이 아니라 신뢰가 남는 행동을 반복하는 것입니다.`,
    `${title}에서는 지금 당장 확인할 신호와 시간을 두고 볼 흐름을 분리하세요.`,
    `${title}에서는 사랑의 방향을 크게 말하기보다 오늘 지킬 수 있는 약속을 선명하게 정하세요.`,
    `${title}에서는 감정의 확신보다 관계가 안전해지는 작은 절차를 남기는 것이 좋습니다.`,
    `${title}에서는 고객님의 기준을 잃지 않으면서도 상대가 숨 쉴 여지를 남기는 태도가 중요합니다.`,
    `${title}에서는 불안한 마음을 결론으로 바꾸지 말고 관계를 살리는 다음 행동으로 옮기세요.`,
    `${title}의 결론은 상대를 판단하는 말이 아니라 고객님이 지킬 품격 있는 선택이어야 합니다.`,
    `${title}에서는 반복된 습관 하나를 줄이고 안정감을 키우는 행동 하나를 남기세요.`,
    `${title}에서는 좋은 마음이 소모되지 않도록 말의 순서와 관계의 경계를 함께 정하세요.`,
  ]);
}



function loveSecretExplicitContextValues(body = {}) {
  const raw = body && typeof body === "object" ? body : {};
  const serviceContext = raw.serviceContext && typeof raw.serviceContext === "object" ? raw.serviceContext : {};
  const relationshipContext = raw.relationshipContext && typeof raw.relationshipContext === "object" ? raw.relationshipContext : {};
  const source = { ...serviceContext, ...relationshipContext, ...raw };
  return {
    currentConcern: firstLoveSecretText(source.currentConcern, source.concern, source.question),
    desiredOutcome: firstLoveSecretText(source.desiredOutcome),
    idealType: firstLoveSecretText(source.idealType, source.preferredPartner),
  };
}

function loveSecretContextTokens(value = "") {
  return Array.from(new Set(clean(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !/^(그리고|하지만|그래서|관계|사랑|연애|상대|나에게|알고|싶다|합니다)$/.test(token))))
    .slice(0, 8);
}

function validateLoveSecretCategoryCoverage(chapters = [], mode = "solo") {
  const list = Array.isArray(chapters) ? chapters : [];
  const specs = loveSecretChapterSpecs(mode);
  const missing = [];
  let expectedCategoryCount = 0;
  let coveredCategoryCount = 0;

  specs.forEach((spec, chapterIndex) => {
    const chapter = list[chapterIndex] || {};
    const sectionList = Array.isArray(chapter?.sections) ? chapter.sections : [];
    const chapterText = [
      clean(chapter?.title),
      clean(chapter?.subtitle),
      clean(chapter?.text),
      sectionList.map((section) => [
        clean(section?.title),
        clean(section?.categoryTitle),
        clean(section?.body || section?.text),
        loveSecretCleanList(section?.sajuEvidence, 8).join(" "),
        loveSecretCleanList(section?.keyPoints, 8).join(" "),
        loveSecretCleanList(section?.actionGuide, 8).join(" "),
        loveSecretCleanList(section?.checklist, 8).join(" "),
      ].filter(Boolean).join(" ")).join(" "),
    ].filter(Boolean).join(" ");
    for (const category of loveSecretCleanList(spec?.categories, 12)) {
      expectedCategoryCount += 1;
      const titleMatched = sectionList.some((section) => {
        const title = clean(section?.categoryTitle || section?.title);
        return title === category || title.includes(category) || category.includes(title);
      });
      const bodyMatched = loveSecretCategoryCovered(category, chapterText);
      if (titleMatched || bodyMatched) {
        coveredCategoryCount += 1;
      } else {
        missing.push({
          chapter: chapterIndex + 1,
          chapterTitle: clean(spec?.title),
          category,
        });
      }
    }
  });

  return {
    ok: missing.length === 0,
    missing,
    expectedCategoryCount,
    coveredCategoryCount,
  };
}

function loveSecretConsultingSentences(text = "") {
  return clean(text)
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 24);
}

function loveSecretNormalizeConsultingSentence(sentence = "") {
  return clean(sentence)
    .replace(/[“”‘'"0-9]/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

function loveSecretCountTextOccurrences(text = "", value = "") {
  const needle = clean(value);
  if (!needle) return 0;
  return clean(text).split(needle).length - 1;
}

function loveSecretNormalizeCategoryListText(value = "", category = "", body = {}) {
  let text = clean(value).replace(/\s+/g, " ").trim();
  const replacements = [
    [category, "{CAT}"],
    [body?.currentConcern, "{CONCERN}"],
    [body?.desiredOutcome, "{GOAL}"],
    [body?.idealType, "{IDEAL}"],
    [body?.pastLovePattern, "{PATTERN}"],
  ];
  for (const [source, target] of replacements) {
    const key = clean(source);
    if (key) text = text.split(key).join(target);
  }
  return text;
}

function loveSecretUniqueCategoryListCount(sections = [], field, body = {}) {
  const values = (Array.isArray(sections) ? sections : []).map((section) => {
    const list = loveSecretCleanList(section?.[field], 8).join(" / ");
    return loveSecretNormalizeCategoryListText(list, section?.categoryTitle || section?.title, body);
  }).filter(Boolean);
  return new Set(values).size;
}

function validateLoveSecretContextRepetition(chapters = [], body = {}) {
  const list = Array.isArray(chapters) ? chapters : [];
  const text = collectLoveSecretText(list);
  const chapterCount = Math.max(1, list.length);
  const limits = [
    { key: "currentConcern", value: body?.currentConcern || body?.concern || body?.question, max: chapterCount + 4 },
    { key: "desiredOutcome", value: body?.desiredOutcome, max: chapterCount * 2 + 4 },
    { key: "idealType", value: body?.idealType || body?.preferredPartner, max: chapterCount + 4 },
    { key: "pastLovePattern", value: body?.pastLovePattern || body?.relationshipPattern, max: chapterCount + 4 },
    { key: "judgementBasis", value: "판단의 기준", max: chapterCount + 4 },
    { key: "cautionStart", value: "조심할 점은", max: chapterCount + 4 },
  ];
  const overLimit = limits
    .map((item) => ({ key: item.key, count: loveSecretCountTextOccurrences(text, item.value), max: item.value ? item.max : 0 }))
    .filter((item) => item.max > 0 && item.count > item.max);
  return {
    ok: overLimit.length === 0,
    overLimit,
  };
}

function validateLoveSecretChapterVariety(chapters = [], body = {}) {
  const weakChapters = [];
  (Array.isArray(chapters) ? chapters : []).forEach((chapter, index) => {
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    if (!sections.length) return;
    const minUnique = sections.length >= 10 ? 5 : Math.min(3, sections.length);
    const uniqueEvidence = loveSecretUniqueCategoryListCount(sections, "sajuEvidence", body);
    const uniqueAction = loveSecretUniqueCategoryListCount(sections, "actionGuide", body);
    const uniqueCaution = loveSecretUniqueCategoryListCount(sections, "caution", body);
    if (uniqueEvidence < minUnique || uniqueAction < minUnique || uniqueCaution < minUnique) {
      weakChapters.push({
        chapter: index + 1,
        title: clean(chapter?.title),
        sections: sections.length,
        minUnique,
        uniqueEvidence,
        uniqueAction,
        uniqueCaution,
      });
    }
  });
  return {
    ok: weakChapters.length === 0,
    weakChapters,
  };
}

function validateLoveSecretTemplateResidue(chapters = []) {
  const list = Array.isArray(chapters) ? chapters : [];
  const text = collectLoveSecretText(list).replace(/\s+/g, " ");
  const exactRules = [
    { key: "old_pattern_fallback", phrase: "사주가 드러내는 성향을 실제 말, 행동, 선택의 기준으로 바꿔 살핍니다.", max: 0 },
    { key: "old_action_solo_fallback", phrase: "반복되는 반응 하나를 줄이고 신뢰를 만드는 행동 하나를 늘리는 것입니다.", max: 0 },
    { key: "old_action_compat_fallback", phrase: "서로의 속도 차이를 작은 약속으로 조율하는 것입니다.", max: 0 },
    { key: "old_support_fallback", phrase: "감정의 크기보다 반복되는 선택과 실제 행동을 기준으로 읽어야 더 정확합니다.", max: 0 },
    { key: "old_closing_fallback", phrase: "반복되는 반응을 하나 줄이고 관계를 살리는 행동 하나를 꾸준히 반복하세요.", max: 0 },
    { key: "old_note_core_label", phrase: "핵심 판단:", max: 0 },
    { key: "old_note_advice_label", phrase: "실천 처방:", max: 0 },
    { key: "old_note_saju_label", phrase: "명리 보완:", max: 0 },
  ];
  const categoryNames = Array.from(new Set(list.flatMap((chapter) => (Array.isArray(chapter?.sections) ? chapter.sections : [])
    .flatMap((section) => [clean(section?.categoryTitle), clean(section?.title)]))))
    .filter((name) => name.length >= 2)
    .sort((a, b) => b.length - a.length);
  const normalizeTemplateSentence = (sentence) => {
    let normalized = loveSecretNormalizeConsultingSentence(sentence);
    categoryNames.forEach((name) => {
      normalized = normalized.split(name).join("{CAT}");
    });
    return normalized;
  };
  const templateMarkers = [
    "타고난 성향이 말투",
    "감정의 방향과 실제 태도",
    "사랑을 흔드는 습관",
    "선택 패턴이 어떤 인연",
    "마음의 크기보다 반복된 행동",
    "관계가 흔들리는 순간의 말투",
    "끌림이 깊어질 때 생기는 기대",
    "반복된 연애 장면",
    "편안해지는 사랑과 소모되는 사랑",
    "사주의 기질을 실제 만남",
    "관계 안에서 강해지는 장점",
    "인연을 끌어당기는 태도",
    "기질 차이가 대화",
    "서로의 기대가 맞물리는 자리",
    "같은 상황을 다르게 받아들이는 이유",
    "끌림을 유지하는 행동",
    "서로가 편해지는 장면",
    "관계의 강점이 실제 약속",
    "같은 마음을 다른 방식",
    "다름을 안전하게 다루는 방식",
    "오늘 줄일 반응",
    "감정이 올라온 순간",
    "상대를 시험하는 말",
    "마음을 크게 증명하기보다",
    "불안을 키우는 습관",
    "속도 차이를 말로 확인",
    "둘 다 지킬 수 있는 대화 절차",
    "다름을 설득하려 하지 말고",
    "밀어붙일 때와 기다릴 때",
    "같은 장면을 서로 다르게",
    "관계의 박자가 어긋나는",
    "끌림, 부담, 회복 가능성",
    "기대가 부딪히는 자리",
    "서로에게 맞춰야 할 부분",
    "속도 차이가 안정감",
    "기대가 엇갈리는 장면",
    "회복 가능한 대화 순서",
    "편해지는 리듬과 부담되는 리듬",
    "반복된 태도와 선택의 방향",
    "확인 가능한 약속과 반응",
    "생활 속에서 반복되는 신뢰",
    "무엇을 확인하고 무엇을 기다릴지",
    "고객님의 기준을 먼저 정돈",
    "오래 남을 수 있는 행동의 구조",
    "조율 가능한 선택지를 찾는 일",
    "말, 거리, 약속으로 나누어",
    "바꿀 수 있는 태도와 시간을 두고 볼 신호",
    "익숙한 반응을 잠시 멈추고",
    "오늘도 지킬 수 있는 작은 기준",
    "짧은 요청과 충분한 여지",
    "다음 대화에서 확인할 기준",
    "나를 지키는 경계",
    "반복되는 신호를 더 살펴",
    "나를 잃지 않는 태도",
  ];
  const exactHits = exactRules
    .map((rule) => ({ ...rule, count: loveSecretCountTextOccurrences(text, rule.phrase) }))
    .filter((rule) => rule.count > rule.max);
  const counts = new Map();
  loveSecretConsultingSentences(text).forEach((sentence) => {
    const normalized = normalizeTemplateSentence(sentence);
    if (templateMarkers.some((marker) => normalized.includes(marker))) {
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  });
  const repeatedTemplates = Array.from(counts.entries())
    .filter(([, count]) => count > 12)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([sentence, count]) => ({ sentence, count, max: 12 }));
  return {
    ok: exactHits.length === 0 && repeatedTemplates.length === 0,
    exactHits,
    repeatedTemplates,
  };
}

function validateLoveSecretSentenceVariety(chapters = []) {
  const list = Array.isArray(chapters) ? chapters : [];
  const text = list.map((chapter) => {
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    if (sections.length) {
      return sections.map((section) => clean(section?.body || section?.text || "")).filter(Boolean).join("\n");
    }
    return clean(chapter?.text || "");
  }).filter(Boolean).join("\n");
  const categoryNames = Array.from(new Set(list
    .flatMap((chapter) => (Array.isArray(chapter?.sections) ? chapter.sections : [])
      .flatMap((section) => [clean(section?.categoryTitle), clean(section?.title)]))))
    .filter((name) => name.length >= 2)
    .sort((a, b) => b.length - a.length);
  const forbiddenPhrases = [
    "이번 상담의 중심 질문은",
    "현재 상태는",
    "이 항목의 사주 근거는",
    "주의점은 분명합니다",
    "오늘 바로 바꿀 수 있는 말, 행동, 거리 조절",
    "행동을 하나만 정합니다",
    "싶다\"이라는",
    "결는",
    "정화과",
    "경금과",
    "화과 수",
    "금를",
    "리듬를",
    "연결를",
    "온도은",
    "차이은",
    "신강 신강약",
  ];
  const phraseHits = forbiddenPhrases
    .map((phrase) => ({ phrase, count: text.split(phrase).length - 1 }))
    .filter((item) => item.count > 0);
  const counts = new Map();
  for (const sentence of loveSecretConsultingSentences(text)) {
    const normalized = loveSecretNormalizeConsultingSentence(sentence);
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  const openingCounts = new Map();
  for (const sentence of loveSecretConsultingSentences(text)) {
    let normalized = loveSecretNormalizeConsultingSentence(sentence);
    categoryNames.forEach((name) => {
      normalized = normalized.split(name).join("{CAT}");
    });
    const opening = normalized
      .replace(/^\{CAT\}(?:에서는|은|는|의|을|를|에서)?\s*/u, "{CAT} ")
      .slice(0, 42)
      .trim();
    if (opening.length >= 18) openingCounts.set(opening, (openingCounts.get(opening) || 0) + 1);
  }
  const repeatedSentences = Array.from(counts.entries())
    .filter(([sentence, count]) => count > 2 && sentence.length >= 24)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([sentence, count]) => ({ sentence, count }));
  const openingRepeatMax = Math.max(12, Math.ceil(Math.max(1, categoryNames.length) / 4));
  const repeatedOpenings = Array.from(openingCounts.entries())
    .filter(([opening, count]) => count > openingRepeatMax && opening.length >= 18)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([opening, count]) => ({ opening, count, max: openingRepeatMax }));
  return {
    ok: phraseHits.length === 0 && repeatedSentences.length === 0 && repeatedOpenings.length === 0,
    phraseHits,
    repeatedSentences,
    repeatedOpenings,
  };
}

function validateLoveSecretCustomerConsultingQuality({ chapters, mode, body } = {}) {
  const list = Array.isArray(chapters) ? chapters : [];
  const text = collectLoveSecretText(list).replace(/\s+/g, " ");
  const issues = [];
  const explicit = loveSecretExplicitContextValues(body);
  const specs = loveSecretChapterSpecs(mode);
  const expected = specs.length;
  const categoryCoverage = validateLoveSecretCategoryCoverage(list, mode);
  const sentenceVariety = validateLoveSecretSentenceVariety(list);
  const contextRepetition = validateLoveSecretContextRepetition(list, body);
  const chapterVariety = validateLoveSecretChapterVariety(list, body);
  const templateResidue = validateLoveSecretTemplateResidue(list);
  const lowSummaryChapters = [];
  const categoryCountIssues = [];
  const weakEvidenceSections = [];
  const weakActionSections = [];
  const weakChecklistSections = [];

  list.forEach((chapter, chapterIndex) => {
    if (loveSecretCleanList(chapter?.summaryCards, 6).length < 3) lowSummaryChapters.push(chapterIndex + 1);
    const expectedSectionCount = loveSecretCleanList(specs[chapterIndex]?.categories, 12).length || LOVE_SECRET_REQUIRED_SECTIONS.length;
    const actualSectionCount = Array.isArray(chapter?.sections) ? chapter.sections.length : 0;
    if (actualSectionCount < expectedSectionCount) categoryCountIssues.push({ chapter: chapterIndex + 1, expected: expectedSectionCount, actual: actualSectionCount });
    (Array.isArray(chapter?.sections) ? chapter.sections : []).forEach((section, sectionIndex) => {
      const sectionId = `${chapterIndex + 1}:${sectionIndex + 1}`;
      if (loveSecretCleanList(section?.sajuEvidence, 6).length < 2) weakEvidenceSections.push(sectionId);
      if (loveSecretCleanList(section?.actionGuide || section?.actionItems || section?.advice, 6).length < 2) weakActionSections.push(sectionId);
      if (loveSecretCleanList(section?.checklist, 6).length < 2) weakChecklistSections.push(sectionId);
    });
  });

  const concernTokens = loveSecretContextTokens(explicit.currentConcern);
  const desiredTokens = loveSecretContextTokens(explicit.desiredOutcome);
  const idealTokens = loveSecretContextTokens(explicit.idealType);
  if (list.length !== expected) issues.push("customer_quality_chapter_count_mismatch");
  if (categoryCountIssues.length) issues.push("category_section_count_incomplete");
  if (!categoryCoverage.ok) issues.push("category_coverage_missing");
  if (lowSummaryChapters.length) issues.push("summary_cards_incomplete");
  if (weakEvidenceSections.length) issues.push("saju_evidence_incomplete");
  if (weakActionSections.length) issues.push("action_guide_incomplete");
  if (weakChecklistSections.length) issues.push("checklist_incomplete");
  if (!contextRepetition.ok) issues.push("context_repetition_excessive");
  if (!templateResidue.ok) issues.push("template_residue_excessive");

  return {
    ok: issues.length === 0,
    issues,
    lowSummaryChapters,
    categoryCountIssues: categoryCountIssues.slice(0, 12),
    weakEvidenceSections: weakEvidenceSections.slice(0, 12),
    weakActionSections: weakActionSections.slice(0, 12),
    weakChecklistSections: weakChecklistSections.slice(0, 12),
    categoryCoverage: {
      expectedCategoryCount: categoryCoverage.expectedCategoryCount,
      coveredCategoryCount: categoryCoverage.coveredCategoryCount,
      missing: categoryCoverage.missing.slice(0, 12),
    },
    sentenceVariety,
    contextRepetition,
    chapterVariety: {
      weakChapters: chapterVariety.weakChapters.slice(0, 12),
    },
    templateResidue,
    reflectedContext: {
      hasConcern: Boolean(concernTokens.length),
      hasDesiredOutcome: Boolean(desiredTokens.length),
      hasIdealType: Boolean(idealTokens.length),
    },
  };
}

function buildLoveSecretSuccessPayload({ featureKey, mode, sessionId, reportId, chapterCount, manuscriptSource, chapters, pdfReady, pdfCompletionValidation, loveSecretMasterJson, masterJsonValidation, loveSecretFacts, loveSecretChapterPlans }) {
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
    qualityMode: LOVE_SECRET_PDF_CONFIG.qualityMode,
    fallbackUsed: false,
    featureKey,
    mode,
    reportId,
    sessionId: clean(sessionId || ""),
    chapterCount,
    manuscriptSource,
    pdfReady,
    pdfCompletionValidation: pdfCompletionValidation && typeof pdfCompletionValidation === "object" ? pdfCompletionValidation : undefined,
    loveSecretMasterJson: loveSecretMasterJson && typeof loveSecretMasterJson === "object" ? loveSecretMasterJson : undefined,
    masterJsonValidation: masterJsonValidation && typeof masterJsonValidation === "object" ? masterJsonValidation : undefined,
    loveSecretFacts: loveSecretFacts && typeof loveSecretFacts === "object" ? loveSecretFacts : undefined,
    loveSecretChapterPlans: summarizeLoveSecretChapterPlans(loveSecretChapterPlans),
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
  const chapters = Array.isArray(archive.chapters) && archive.chapters.length
    ? archive.chapters
    : (Array.isArray(metadata.chapters) && metadata.chapters.length ? metadata.chapters : (Array.isArray(payload.chapters) ? payload.chapters : []));
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
        chapterCount: Number(archive.chapterCount || metadata.chapterCount || payload.chapterCount || chapters.length || effectivePdfReady?.chapterCount || 0),
        manuscriptSource: clean(archive.manuscriptSource || metadata.manuscriptSource || fallback.manuscriptSource || LOVE_SECRET_MANUSCRIPT_SOURCE.PREMIUM),
        chapters,
        pdfReady: effectivePdfReady,
        loveSecretMasterJson: payload.loveSecretMasterJson,
        masterJsonValidation: payload.masterJsonValidation,
        loveSecretFacts: payload.loveSecretFacts,
        loveSecretChapterPlans: payload.loveSecretChapterPlans,
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
  const progress = (() => {
    if (status === "completed") return 100;
    if (status === "failed") return Math.max(0, Math.min(95, Number(job?.progress || 0) || 0));
    if (status === "validating") return 5;
    if (status === "rendering") return Math.max(85, Math.min(95, Number(job?.progress || 90) || 90));
    if (status === "generating") {
      const ratio = chapterCount > 0 ? completedChapters / chapterCount : 0;
      return Math.max(10, Math.min(80, Math.round(10 + ratio * 70)));
    }
    return 0;
  })();
  return {
    jobId: String(job?._id || ""),
    reportId: clean(job?.reportId),
    mode: normalizeMode(job?.mode),
    status,
    chapterCount,
    completedChapters,
    progress,
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
        status: "validating",
        stage: "validating",
        progress: 5,
        message: "입력값과 사주 신호를 확인하고 있습니다.",
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
          status: "generating",
          stage: "generating",
          progress: 10,
          message: "연애 비책 PDF 본문을 LLM 전용 파이프라인으로 생성하고 있습니다.",
          updatedAt: new Date(),
        },
      },
    );
    const llmPdfCacheKey = clean(job?.cacheKey) || buildLoveSecretPdfCacheKey(base, mode, job?.requestBody || {});
    const llmJobResult = await generateLoveSecretPremiumPdfFromRoute({
      request: { url: clean(job?.requestOrigin || "") || "https://code-destiny.com" },
      env,
      authz: {
        auth: { userId: String(job?.userId || "") },
        featureKey: clean(job?.featureKey) || toFeatureKey(mode),
        access: null,
      },
      body: job?.requestBody || {},
      base,
      mode,
      config,
      sessionId,
      executionCtx,
      onProgress: async ({ completedChapter }) => {
        const completed = Number(completedChapter?.order || 0);
        await coll.updateOne(
          { _id },
          {
            $set: {
              status: completed >= expectedChapterCount ? "rendering" : "generating",
              stage: completed >= expectedChapterCount ? "rendering" : "generating",
              progress: completed >= expectedChapterCount
                ? 90
                : Math.max(10, Math.min(80, Math.round(10 + (completed / Math.max(1, expectedChapterCount)) * 70))),
              message: completed >= expectedChapterCount
                ? "PDF 렌더링과 저장을 확인하고 있습니다."
                : `연애 비책 ${completed}/${expectedChapterCount} 챕터 생성 중입니다.`,
              completedChapters: Math.max(0, Math.min(expectedChapterCount, completed)),
              updatedAt: new Date(),
            },
          },
        );
      },
    });
    await coll.updateOne(
      { _id },
      {
        $set: {
          status: "completed",
          cacheKey: llmPdfCacheKey,
          cacheVersion: LOVE_SECRET_PDF_CONFIG.templateVersion,
          stage: "completed",
          progress: 100,
          message: "연애 비책 PDF가 준비되었습니다.",
          completedChapters: Number(llmJobResult?.chapterCount || expectedChapterCount),
          manuscriptSource: clean(llmJobResult?.manuscriptSource) || LOVE_SECRET_MANUSCRIPT_SOURCE.PREMIUM,
          result: llmJobResult,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
    setLoveSecretPdfMemoryCache(llmPdfCacheKey, { payload: llmJobResult });
    resolveLoveSecretLock(sessionId, "done", String(_id));
    return;

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

function loveSecretAccessErrorMessage(code, status, fallback = "") {
  if (code === "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING") {
    return "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (Number(status) === 402) {
    return "프리미엄 연애 비책 생성 권한이 필요합니다.";
  }
  if (Number(status) === 401) {
    return "로그인 후 연애 비책 PDF를 생성할 수 있습니다.";
  }
  return clean(fallback) || "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
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
  const premiumAccessToken = clean(body?.premiumAccessToken || request?.headers?.get?.("x-premium-access-token"));

  const access = await requirePremiumReportAccess(getLoveSecretFastDbEnv(env), auth.userId, "loveSecret", {
    ...body,
    mode,
    reportType: "loveSecret",
    featureKey,
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: body?._accessRoute || "/api/love-secret/generate-chapter",
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
      response: buildApiError(code, loveSecretAccessErrorMessage(code, status, message), status, {
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

async function handleAccess(request, env) {
  const url = new URL(request.url);
  const reportId = clean(url.searchParams.get("reportId"));
  if (!reportId) return buildApiError("MISSING_REPORT_ID", "reportId가 필요합니다.", 400);

  const mode = normalizeMode(url.searchParams.get("mode") || inferLoveSecretModeFromReportId(reportId));
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId") || `love-book:${reportId}`);
  const body = {
    reportId,
    sessionId,
    reportSessionId: sessionId,
    mode,
    reportType: "loveSecret",
    featureKey: toFeatureKey(mode),
    _accessRoute: "/api/love-secret/access",
  };
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const purchaseId = clean(authz.access?.matchedTransactionId || authz.access?.entitlementId);
  const accessGrant = {
    ok: true,
    accessType: clean(authz.access?.accessType || "premium_access"),
    accessMethod: clean(authz.access?.accessMethod || authz.access?.paymentMode || ""),
    featureKey: clean(authz.access?.featureKey || authz.featureKey),
    reportId,
    sessionId,
    purchaseId: purchaseId || undefined,
    evidenceId: purchaseId || undefined,
  };
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: LOVE_SECRET_SERVICE_KEY,
    reportType: "loveSecret",
    userId: authz?.auth?.userId,
    featureKey: authz.featureKey,
    sessionId,
    reportId,
    access: authz.access,
    body: { ...body, accessGrant },
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  const reusableExecution = await findLoveSecretReusableExecution(env, authz?.auth?.userId, executionCtx, {
    sessionId,
    reportId,
    mode,
    featureKey: authz.featureKey,
  });
  const reusableResponse = reusableExecution ? buildLoveSecretReusableExecutionResponse(reusableExecution, {
    sessionId,
    reportId,
    mode,
    featureKey: authz.featureKey,
  }) : null;
  if (reusableResponse?.status === 409) return json(reusableResponse.payload, { status: reusableResponse.status });

  const completed = reusableResponse?.status === 200 && reusableResponse?.payload;
  return json({
    ok: true,
    status: completed ? "completed" : "available",
    mode,
    reportId,
    sessionId,
    featureKey: authz.featureKey,
    accessGrant,
    ...(completed ? {
      result: reusableResponse.payload,
      pdfReady: reusableResponse.payload.pdfReady,
      pdfUrl: reusableResponse.payload.pdfUrl,
      htmlUrl: reusableResponse.payload.htmlUrl,
      downloadUrl: reusableResponse.payload.downloadUrl,
      canReopen: true,
      canDownload: true,
    } : {}),
  });
}

async function handleGenerateChapter(request, env) {
      return buildApiError("LOVE_SECRET_LLM_PDF_ONLY", "연애 비책 PDF는 /prepare 또는 /prepare-async에서 결제 확인 후 LLM 원고를 생성합니다.", 410);
}

async function generateLoveSecretPremiumPdfFromRoute({
  request,
  env,
  authz,
  body,
  base,
  mode,
  config,
  sessionId,
  executionCtx,
  onProgress = null,
} = {}) {
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || executionCtx?.reportId || `love-secret-${Date.now().toString(36)}`);
  return generateLoveSecretPremiumPdfV2({
    env,
    pdfDbEnv: getLoveSecretFastDbEnv(env),
    executionContext: executionCtx,
    requestUrl: request?.url || "",
    userId: authz?.auth?.userId,
    input: {
      base,
      body,
      mode,
      config,
    },
    paymentContext: {
      reportId,
      sessionId,
      featureKey: authz?.featureKey,
      mode,
      access: authz?.access,
    },
    onProgress,
  });
}

async function handlePrepare(request, env) {
  const body = await readJson(request);
  const mode = normalizeRequestMode(body?.mode || body?.reportMode);
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
  const config = safeModeChapterConfig(mode);
  const sessionId = clean(body?.sessionId || body?.reportSessionId) || "";
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
  console.info("[LoveBookPremiumPDF][LlmOnlyGenerationStart]", { mode, chapterCount: Number(config?.totalChapters || 0) });
  const llmResponsePayload = await generateLoveSecretPremiumPdfFromRoute({
    request,
    env,
    authz,
    body,
    base,
    mode,
    config,
    sessionId,
    executionCtx,
  });
  console.info("[LoveBookPremiumPDF][LlmOnlyGenerationCompleted]", {
    mode,
    chapterCount: Number(llmResponsePayload?.chapterCount || 0),
    manuscriptSource: clean(llmResponsePayload?.manuscriptSource),
  });
  return json(llmResponsePayload);

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
  const mode = normalizeRequestMode(body?.mode || body?.reportMode);
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
    return buildApiError("MISSING_PARTNER_SAJU", "궁합 모드에는 상대 생년월일과 출생 시각 정보가 필요합니다. 상대 정보를 확인해 주세요.", 400);
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
      status: { $in: ["pending", "validating", "generating", "rendering", "processing", "completed"] },
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
      status: { $in: ["pending", "validating", "generating", "rendering", "processing"] },
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
        serviceContext: body?.serviceContext && typeof body.serviceContext === "object" ? body.serviceContext : {},
        relationshipContext: body?.relationshipContext && typeof body.relationshipContext === "object" ? body.relationshipContext : {},
        clientFlow: body?.clientFlow && typeof body.clientFlow === "object" ? body.clientFlow : {},
        userLoveContext: body?.userLoveContext && typeof body.userLoveContext === "object" ? body.userLoveContext : {},
        targetYear: resolveLoveSecretTargetYear(body?.targetYear),
        loveStatus: clean(body?.loveStatus || body?.relationshipStatus || body?.currentLoveStatus),
        relationshipStatus: clean(body?.relationshipStatus || body?.loveStatus || body?.currentLoveStatus),
        currentLoveStatus: clean(body?.currentLoveStatus || body?.loveStatus || body?.relationshipStatus),
        currentConcern: clean(body?.currentConcern || body?.concern || body?.question),
        concern: clean(body?.concern || body?.currentConcern || body?.question),
        question: clean(body?.question || body?.currentConcern || body?.concern),
        idealType: clean(body?.idealType || body?.preferredPartner),
        preferredPartner: clean(body?.preferredPartner || body?.idealType),
        pastLovePattern: clean(body?.pastLovePattern || body?.relationshipPattern),
        relationshipPattern: clean(body?.relationshipPattern || body?.pastLovePattern),
        desiredOutcome: clean(body?.desiredOutcome),
        relationshipType: clean(body?.relationshipType),
        status: clean(body?.status),
        wantsMarriageAnalysis: body?.wantsMarriageAnalysis !== false && body?.includeMarriageAnalysis !== false,
        includeMarriageAnalysis: body?.wantsMarriageAnalysis !== false && body?.includeMarriageAnalysis !== false,
        wantsReunionAnalysis: body?.wantsReunionAnalysis !== false && body?.includeReunionAnalysis !== false,
        includeReunionAnalysis: body?.wantsReunionAnalysis !== false && body?.includeReunionAnalysis !== false,
        tone: clean(body?.tone || body?.writingStyle),
        writingStyle: clean(body?.writingStyle || body?.tone),
        productTier: clean(body?.productTier || body?.tier),
        tier: clean(body?.tier || body?.productTier),
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
          progress: 0,
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
    console.warn("[love-secret][async-job-db-direct-premium]", clean(error?.message || error) || error);

    try {
      const llmDirectResponse = await generateLoveSecretPremiumPdfFromRoute({
        request,
        env,
        authz,
        body,
        base,
        mode,
        config,
        sessionId,
        executionCtx,
      });
      resolveLoveSecretLock(sessionId, "done", "");
      setLoveSecretPdfMemoryCache(pdfCacheKey, { payload: llmDirectResponse });
      return json(llmDirectResponse);

    } catch (directError) {
      await failPremiumPdfExecution(
        env,
        authz?.auth?.userId,
        executionCtx,
        "love_secret_prepare_failed",
        clean(directError?.message || error?.message || "연애 비책 준비 실패"),
        "love-secret-prepare-direct-premium",
      );
      resolveLoveSecretLock(sessionId, "failed", "");
      throw directError;
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
  validateLoveSecretManuscript,
  buildLoveSecretMasterJson,
  normalizeSoloLoveSecretData,
  normalizeCompatibilityLoveSecretData,
  normalizeLoveSecretForPdf,
  buildLoveSecretPdfCacheDescriptor,
  buildLoveSecretPdfCacheKey,
  getLoveSecretPdfMemoryCache,
  setLoveSecretPdfMemoryCache,
  toPublicJobPayload,
  validateLoveSecretMasterJson,
  buildLoveSecretFacts,
  buildLoveSecretChapterPlans,
  summarizeLoveSecretChapterPlans,
  softenLoveSecretSensitiveText,
  SOLO_LOVE_CHAPTER_SPECS,
  SOLO_LOVE_CHAPTER_QUALITY_GUIDES,
  getSoloLoveChapterQualityGuide,
  COMPATIBILITY_LOVE_CHAPTER_SPECS,
  hasLoveSecretForbiddenText,
  generateLoveSecretPremiumPdfV2,
});

export async function handleSajuLoveSecretRoutes(request, env = {}, ctx = null) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/love-secret");

    if (method === "POST" && (path === "" || path === "/" || path === "/generate-chapter")) {
      return buildApiError("LOVE_SECRET_LLM_PDF_ONLY", "연애 비책 PDF는 /prepare 또는 /prepare-async에서 결제 확인 후 LLM 원고를 생성합니다.", 410);
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

    if (method === "GET" && path === "/access") {
      return await handleAccess(request, env);
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
