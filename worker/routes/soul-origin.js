import { Solar } from "lunar-javascript";
import { buildAstroLocalChartJson } from "../lib/astro-premium-generator.js";
import { buildVedicLocalChartJson } from "../lib/vedic-premium-generator.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import { callGeminiText } from "../lib/gemini.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import { getServiceExecution } from "../lib/service-execution-task.js";

const SOUL_ORIGIN_FEATURE_KEY = "premium_pdf_soul_origin";
const SOUL_ORIGIN_SERVICE_KEY = "soul-origin";
const SOUL_ORIGIN_DISPLAY_NAME = "운명의 업";
const SOUL_ORIGIN_TITLE = "운명의 업 프리미엄 상담서";
const SOUL_ORIGIN_REPORT_TYPE = "soulOriginKarma";
const SOUL_ORIGIN_ARCHIVE_REPORT_TYPE = "soul_origin_karma";
const SOUL_ORIGIN_PDF_CONFIG = Object.freeze({
  generationMode: "local-assembled",
  llmEnabled: false,
  provider: "soul-origin-local-assembler",
  templateVersion: "soul-origin-assembled-v1",
});
const SOUL_ORIGIN_REPORT_TYPE_ALIASES = [
  "premium_pdf_soul_origin",
  SOUL_ORIGIN_REPORT_TYPE,
  "soul_origin_karma",
  "soul-origin",
  "premium-soul-origin-report",
];
const SOUL_ORIGIN_FEATURE_ALIASES = [
  SOUL_ORIGIN_REPORT_TYPE,
  "soul_origin_karma",
  "soul-origin",
  "premium-soul-origin-report",
];

const SOUL_ORIGIN_LLM_KEY_ENV_KEYS = Object.freeze([
  "SOUL_ORIGIN_GEMINI_API_KEY1",
  "SOUL_ORIGIN_GEMINI_API_KEY2",
  "SOUL_ORIGIN_GEMINI_API_KEY3",
  "SOUL_ORIGIN_GEMINI_API_KEY4",
  "SOUL_ORIGIN_GEMINI_API_KEY5",
  "SOUL_ORIGIN_GEMINI_API_KEY6",
  "SOUL_ORIGIN_GEMINI_API_KEY7",
  "SOUL_ORIGIN_GEMINI_API_KEY8",
  "PREMIUM_GEMINI_API_KEY1",
  "PREMIUM_GEMINI_API_KEY2",
  "PREMIUM_GEMINI_API_KEY3",
  "PREMIUM_GEMINI_API_KEY4",
  "PREMIUM_GEMINI_API_KEY5",
  "GEMINI_API_KEY",
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINIF_API_KEY5",
  "GEMINIF_API_KEY6",
  "GEMINIF_API_KEY7",
  "GEMINIF_API_KEY8",
  "GOOGLE_GEMINI_API_KEY",
]);
const SOUL_ORIGIN_LLM_MODEL_ENV_KEYS = Object.freeze([
  "SOUL_ORIGIN_GEMINI_MODEL",
  "PREMIUM_GEMINI_MODEL",
  "GEMINI_MODEL",
]);
const SOUL_ORIGIN_DEFAULT_TONE_PRESET = "default";
const SOUL_ORIGIN_DEFAULT_TONE_INTENSITY = 2;
const SOUL_ORIGIN_TONE_INTENSITY_MIN = 1;
const SOUL_ORIGIN_TONE_INTENSITY_MAX = 5;
const SOUL_ORIGIN_TONE_PRESETS = Object.freeze({
  default: {
    label: "균형 상담형",
    direction: "사주와 사주/점성/베다/자미두수를 한 번에 엮되, 감정은 공감으로, 해결은 실행으로 마무리",
    weights: { love: 3, career: 3, money: 3, fortune: 3, identity: 3 },
  },
  emotion_first: {
    label: "감정 우선형",
    direction: "공감과 위로를 더 깊게 깔고, 관계 문장을 부드럽게 늘려 공감 선호 독자에게 집중",
    weights: { love: 6, career: 2, money: 2, fortune: 3, identity: 4 },
  },
  direct_action: {
    label: "결과 액션형",
    direction: "감정만 공허하게 감싸지 않고, 판단 기준·실행 순서를 짧고 명확하게 제시",
    weights: { love: 2, career: 5, money: 4, fortune: 4, identity: 3 },
  },
  relationship_focus: {
    label: "연애/관계 집중형",
    direction: "연애·인간관계의 의사결정 패턴, 상처 반복, 재연결/거리두기의 리듬을 중심으로 정밀 해석",
    weights: { love: 7, career: 2, money: 2, fortune: 3, identity: 3 },
  },
  money_focus: {
    label: "재물·직장 집중형",
    direction: "재물흐름·투자 판단·직업 전환 임계점을 실행 가능한 언어로 연결",
    weights: { love: 1, career: 6, money: 7, fortune: 3, identity: 2 },
  },
  destiny_focus: {
    label: "운명 예측형",
    direction: "시기 전환, 미래 리스크, 타이밍 판단을 구조적으로 강조해 앞선 흐름을 구체 예측",
    weights: { love: 2, career: 4, money: 4, fortune: 7, identity: 4 },
  },
});

const MIN_CATEGORY_CHARS = 900;
const MIN_CHAPTER_CHARS = 4000;
const MIN_TOTAL_CHARS = 45000;

const BIRTH_TIME_REQUIRED_MESSAGE = "운명의 업 PDF는 시주와 운의 흐름을 정밀하게 읽기 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해 주세요.";

const REPORT_CACHE = globalThis.__SOUL_ORIGIN_REPORT_CACHE || new Map();
if (!globalThis.__SOUL_ORIGIN_REPORT_CACHE) {
  globalThis.__SOUL_ORIGIN_REPORT_CACHE = REPORT_CACHE;
}

const SESSION_LOCKS = globalThis.__SOUL_ORIGIN_SESSION_LOCKS || new Map();
if (!globalThis.__SOUL_ORIGIN_SESSION_LOCKS) {
  globalThis.__SOUL_ORIGIN_SESSION_LOCKS = SESSION_LOCKS;
}

const STEM_KO_MAP = Object.freeze({
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
});

const STEM_HAN_MAP = Object.freeze({
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
});

const BRANCH_KO_MAP = Object.freeze({
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사", 午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
});

const BRANCH_HAN_MAP = Object.freeze({
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
});

const CHAPTER_BLUEPRINTS = [
  {
    id: "01",
    title: "제 1장. 내 인생에 반복되는 운명의 패턴",
    subtitle: "반복의 실마리를 두려움이 아닌 이해로 전환하는 첫 장",
    categories: [
      "내 삶의 반복 패턴 한 줄 해석",
      "원국이 보여주는 인생의 기본 과제",
      "반복해서 마주치는 사람과 상황",
      "쉽게 무너지는 지점",
      "다시 일어서는 핵심 힘",
    ],
  },
  {
    id: "02",
    title: "제 2장. 나의 원국이 품은 업의 씨앗",
    subtitle: "타고난 기질을 삶의 과제로 읽는 장",
    categories: [
      "일간이 보여주는 내면의 핵심 기질",
      "월지가 만드는 생존 방식",
      "강한 오행이 만드는 반복 습관",
      "부족한 오행이 만드는 결핍감",
      "원국 전체가 말하는 삶의 숙제",
    ],
  },
  {
    id: "03",
    title: "제 3장. 관계에서 반복되는 업",
    subtitle: "인연의 패턴을 이해하고 관계의 소모를 줄이는 장",
    categories: [
      "자꾸 끌리는 사람의 유형",
      "관계에서 반복되는 상처",
      "가까워질수록 드러나는 두려움",
      "멀어질 때 반복되는 행동",
      "관계의 업을 풀어내는 법",
    ],
  },
  {
    id: "04",
    title: "제 4장. 사랑과 이별에 남은 미완의 과제",
    subtitle: "연애의 반복을 성숙의 방향으로 바꾸는 장",
    categories: [
      "사랑에서 내가 반복하는 선택",
      "이별 후 오래 남는 감정의 정체",
      "재회 욕망 뒤에 숨어 있는 마음",
      "사랑이 나를 성장시키는 방식",
      "사랑의 업을 성숙하게 다루는 법",
    ],
  },
  {
    id: "05",
    title: "제 5장. 돈과 현실에서 반복되는 업",
    subtitle: "재물 흐름과 생활 선택의 연결을 다루는 장",
    categories: [
      "돈 앞에서 반복되는 선택",
      "재물이 들어오는 방식과 새는 방식",
      "현실 책임을 미루게 되는 지점",
      "욕망과 불안이 돈에 미치는 영향",
      "재물의 업을 바꾸는 습관",
    ],
  },
  {
    id: "06",
    title: "제 6장. 일과 사명에서 반복되는 업",
    subtitle: "일의 막힘을 사명의 언어로 재해석하는 장",
    categories: [
      "내가 자꾸 같은 벽을 만나는 이유",
      "일에서 인정받고 싶은 방식",
      "재능이 막히는 순간",
      "내 사명과 맞지 않는 선택",
      "직업적 업을 사명으로 바꾸는 법",
    ],
  },
  {
    id: "07",
    title: "제 7장. 가족과 뿌리에서 온 업",
    subtitle: "가족 패턴을 성숙하게 분리하고 회복하는 장",
    categories: [
      "가족에게서 물려받은 감정 패턴",
      "어린 시절에 만들어진 생존 방식",
      "부모·가족과의 거리감",
      "내가 끊어내야 할 반복",
      "나만의 뿌리를 다시 세우는 법",
    ],
  },
  {
    id: "08",
    title: "제 8장. 마음의 그림자와 무의식의 업",
    subtitle: "내면의 방어를 자원으로 전환하는 장",
    categories: [
      "내가 숨기고 싶은 약점",
      "불안할 때 나타나는 방어 방식",
      "상처받기 전에 먼저 닫아버리는 마음",
      "스스로를 몰아붙이는 이유",
      "그림자를 힘으로 바꾸는 법",
    ],
  },
  {
    id: "09",
    title: "제 9장. 대운과 세운이 여는 업의 전환점",
    subtitle: "지금 시기의 과제를 읽고 전환을 준비하는 장",
    categories: [
      "현재 대운이 요구하는 인생 과제",
      "올해 세운이 건드리는 변화",
      "반복이 강해지는 시기",
      "업이 풀리기 시작하는 시기",
      "전환기를 잘 넘기는 방법",
    ],
  },
  {
    id: "10",
    title: "제 10장. 신살과 십이운성이 보여주는 숨은 장치",
    subtitle: "보이지 않는 반복 신호를 현실 전략으로 바꾸는 장",
    categories: [
      "내 삶에 강하게 작용하는 신살",
      "신살이 만드는 매력과 위험",
      "십이운성이 보여주는 삶의 리듬",
      "반복되는 운명의 장면",
      "숨은 장치를 좋은 방향으로 쓰는 법",
    ],
  },
  {
    id: "11",
    title: "제 11장. 업을 끊는 선택과 해방 전략",
    subtitle: "실행 가능한 행동으로 반복을 끊는 장",
    categories: [
      "반복을 끊기 위해 가장 먼저 알아차릴 것",
      "더 이상 붙잡지 말아야 할 패턴",
      "반드시 훈련해야 할 삶의 태도",
      "운을 바꾸는 작은 행동",
      "내 삶의 방향을 다시 정하는 법",
    ],
  },
  {
    id: "12",
    title: "제 12장. 운명의 업을 사명으로 바꾸는 최종 마스터플랜",
    subtitle: "두려움이 아닌 선택의 힘으로 마무리하는 종장",
    categories: [
      "내 업의 최종 핵심 메시지",
      "내가 반드시 회복해야 할 힘",
      "나를 무너뜨리는 오래된 습관",
      "앞으로 3년의 전환 전략",
      "운명을 내 편으로 만드는 마지막 조언",
    ],
  },
];

const FORBIDDEN_TOKENS = [
  "json", "payload", "seed", "fallback", "skeleton", "local", "llm", "api", "engine", "validation", "retry", "debug",
  "calculation signature", "데이터 부족", "자동 생성", "템플릿", "계산 시그니처", "내부 데이터", "로컬 기반", "생성 로직", "챕터 생성기", "카테고리 렌더러",
  "이 장에서는", "이 카테고리에서는", "구조이", "기준 세 가지를", "전생의 죄", "업보 때문에 어쩔 수", "반드시 불행", "무조건 성공",
  "운명이 정해져 있다", "운명은 정해져 있다",
  "internal server error", "about:blank",
];

const FORBIDDEN_RE = new RegExp(FORBIDDEN_TOKENS
  .map((item) => String(item).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|"), "i");

const TOPIC_KEYWORDS = {
  "01": ["원국", "일간", "월지", "오행", "십성", "반복"],
  "02": ["일간", "월지", "오행", "강약", "용신", "희신"],
  "03": ["비겁", "식상", "재성", "관성", "인성", "합충"],
  "04": ["일지", "배우자", "도화", "홍염", "대운", "세운"],
  "05": ["재성", "비겁", "식상", "관성", "대운", "세운"],
  "06": ["격국", "용신", "희신", "관성", "식상", "인성"],
  "07": ["년주", "월주", "인성", "재성", "관성", "지지"],
  "08": ["오행", "인성", "관성", "비겁", "상관", "십이운성"],
  "09": ["대운", "세운", "전환", "반복", "기회", "과제"],
  "10": ["신살", "십이운성", "리듬", "반복", "선택", "활용"],
  "11": ["패턴", "알아차림", "훈련", "행동", "전략", "해방"],
  "12": ["사명", "회복", "습관", "3년", "전환", "조언"],
};

const SECTION_TITLES = [
  "핵심 진단",
  "명식에서 보이는 근거",
  "현실에서 반복되는 모습",
  "무너지는 지점",
  "해방 전략",
  "오늘부터 할 수 있는 작은 실천",
];

const CHAPTER_TONE = {
  "01": {
    lens: "원국, 대운, 세운, 오행 균형",
    diagnosis: "인생 전체 흐름에서 되풀이되는 장면을 조망하는 마스터 관점",
    reality: "중요한 결정의 순간마다 익숙한 방식으로 반응하는 패턴",
    collapse: "시기 판단보다 감정 반응이 앞설 때 선택이 급격히 좁아짐",
    strategy: "패턴의 시작 신호를 먼저 감지하고 결정 순서를 재배치",
  },
  "02": {
    lens: "일간, 월지, 오행 강약, 용신·희신·기신",
    diagnosis: "타고난 기질을 숙명론이 아닌 훈련 가능한 과제로 해석",
    reality: "강점이 과속으로, 결핍이 회피로 나타나는 장면의 반복",
    collapse: "내 기질을 방어적으로만 쓸 때 관계와 일의 균형이 무너짐",
    strategy: "강점은 방향으로, 약점은 보완 루틴으로 전환",
  },
  "03": {
    lens: "십성, 합충형파해, 비겁·관성·재성·인성",
    diagnosis: "관계의 상처를 성격 문제가 아닌 구조 신호로 읽는 관점",
    reality: "비슷한 유형에게 반복적으로 끌리고 같은 갈등으로 소모됨",
    collapse: "경계가 무너지거나 과잉 통제가 시작될 때 소진이 빨라짐",
    strategy: "관계의 기대치와 경계 문장을 먼저 세우는 방식",
  },
  "04": {
    lens: "일지, 배우자궁, 도화, 홍염, 대운·세운",
    diagnosis: "사랑과 이별에서 남는 감정의 뿌리를 깊이 해석하는 관점",
    reality: "재회 욕망과 미련이 같은 관계 패턴을 다시 호출함",
    collapse: "상대 확인 욕구가 커질수록 자기 기준이 흐려짐",
    strategy: "감정의 핵심 요구를 언어화하고 관계 기준을 재설정",
  },
  "05": {
    lens: "재성, 식상, 비겁, 관성, 오행 균형",
    diagnosis: "돈의 흐름을 심리와 습관의 결과로 읽는 현실 관점",
    reality: "불안이 클수록 지출 구조가 흐려지고 책임이 미뤄짐",
    collapse: "수입보다 지출 통제가 늦어질 때 회복 시간이 길어짐",
    strategy: "새는 지점을 먼저 막고 의사결정 기준을 수치화",
  },
  "06": {
    lens: "격국, 용신, 관성, 식상, 인성",
    diagnosis: "직업적 막힘을 능력 부족이 아닌 방향 불일치로 해석",
    reality: "성과를 내도 공허함이 남거나 같은 벽에서 멈춤",
    collapse: "역할과 사명이 분리되면 집중력이 급격히 흔들림",
    strategy: "일의 우선순위를 사명 축으로 다시 배열",
  },
  "07": {
    lens: "년주, 월주, 인성, 부모궁적 해석",
    diagnosis: "가족에게서 온 감정 패턴을 분리해 재정렬하는 관점",
    reality: "가까운 관계에서 어린 시절 반응이 자동으로 재생됨",
    collapse: "죄책감과 의무감이 경계를 압도할 때 정서 소진이 깊어짐",
    strategy: "관계의 책임과 감정을 분리해 건강한 거리 확보",
  },
  "08": {
    lens: "오행 결핍, 관성·인성·상관, 십이운성",
    diagnosis: "불안과 방어를 결함이 아닌 회복 신호로 읽는 관점",
    reality: "자기비난이 커질수록 판단이 극단으로 흔들림",
    collapse: "감정 피로가 누적될 때 회피와 과잉 통제가 번갈아 나타남",
    strategy: "내면 안정 루틴과 현실 행동 루틴을 함께 설계",
  },
  "09": {
    lens: "현재 대운, 다음 대운, 올해 세운",
    diagnosis: "시기 흐름을 전환 기회로 읽는 관점",
    reality: "같은 패턴이 특정 시기에 급격히 강해지거나 약해짐",
    collapse: "시기 변화 신호를 놓치면 대응 타이밍이 늦어짐",
    strategy: "전환기 행동계획을 미리 세워 리스크를 분산",
  },
  "10": {
    lens: "도화, 역마, 화개, 십이운성",
    diagnosis: "신살과 운성 신호를 공포가 아닌 활용 지도로 해석",
    reality: "특정 장면에서 감정과 선택이 빠르게 증폭됨",
    collapse: "매력과 위험을 구분하지 못하면 반복 소모가 커짐",
    strategy: "신호별 대응 원칙을 정해 강점은 확장, 위험은 완충",
  },
  "11": {
    lens: "관계·돈·일·감정별 실행 전략",
    diagnosis: "반복을 끊는 선택을 행동 설계로 전환하는 관점",
    reality: "알고도 못 바꾸는 장면은 실행 순서의 문제로 남음",
    collapse: "의지에만 기대면 피로 누적으로 다시 원점 회귀",
    strategy: "작동 가능한 루틴과 점검 주기를 고정",
  },
  "12": {
    lens: "3년 전환 전략, 회복할 힘, 내려놓을 습관",
    diagnosis: "반복을 사명으로 전환하는 최종 통합 관점",
    reality: "장기 흐름에서 선택의 누적이 운의 체감을 바꿈",
    collapse: "우선순위가 흔들릴 때 오래된 습관이 재가동됨",
    strategy: "3년 로드맵으로 기준을 고정하고 실행력을 유지",
  },
};

const DEFAULT_FILLERS = [
  "감정의 파도가 높아지는 날일수록 결정을 늦추고 사실을 먼저 정리하면 손실을 크게 줄일 수 있습니다. 기준이 흔들릴 때는 오늘 지킬 원칙 한 가지를 정하고, 그 원칙이 지켜졌는지만 점검해도 회복 속도가 달라집니다.",
  "반복을 바꾸는 힘은 거창한 결심보다 일관된 점검에서 나옵니다. 주 1회 복기 시간을 고정하고, 내가 지킨 기준과 놓친 기준을 분리해 보면 다음 선택의 정확도가 눈에 띄게 높아집니다.",
];

const CHAPTER_FILLERS = {
  "03": [
    "관계의 반복을 바꾸려면 먼저 내가 상대에게 무엇을 기대하는지 선명하게 알아야 합니다. 기대가 불분명하면 실망은 커지고, 기대를 명료하게 하면 대화의 방향이 또렷해집니다.",
    "상대의 반응을 해석하기 전에 내 안에서 먼저 올라온 두려움을 확인하면 같은 오해를 크게 줄일 수 있습니다. 감정의 이름을 정확히 붙이는 순간 관계 선택의 질이 달라집니다.",
  ],
  "05": [
    "돈의 흐름을 바꾸려면 수입 확대보다 먼저 새는 지점을 확인해야 합니다. 새는 지점이 정리되면 불안이 줄고 판단의 여유가 회복됩니다.",
    "현실 압박이 커질수록 큰 결정보다 고정비와 반복 지출부터 정리하는 편이 안정적입니다. 구조가 정리되면 기회 판단도 훨씬 정확해집니다.",
  ],
  "09": [
    "대운과 세운이 교차하는 시기에는 좋은 선택도 타이밍이 맞지 않으면 효과가 줄어듭니다. 전환기에는 속도보다 순서가 성과를 결정합니다.",
    "시기가 바뀌는 경계에서는 성급한 확장보다 기준 점검이 우선입니다. 기준이 고정되면 변화의 폭이 커져도 중심을 잃지 않습니다.",
  ],
  "12": [
    "3년 계획은 완벽한 예측이 아니라 흔들릴 때 돌아올 기준을 만드는 작업입니다. 분기마다 우선순위를 재정렬하면 장기 흐름이 안정됩니다.",
    "내려놓을 습관을 명확히 정하고 유지하면 에너지 누수가 줄어듭니다. 그 여유가 곧 사명을 실행하는 집중력으로 전환됩니다.",
  ],
};

const BRANCH_RELATION = Object.freeze({
  합: [["자", "축"], ["인", "해"], ["묘", "술"], ["진", "유"], ["사", "신"], ["오", "미"]],
  충: [["자", "오"], ["축", "미"], ["인", "신"], ["묘", "유"], ["진", "술"], ["사", "해"]],
  형: [["인", "사"], ["사", "신"], ["신", "인"], ["축", "술"], ["술", "미"], ["미", "축"], ["자", "묘"], ["묘", "자"], ["진", "진"], ["오", "오"], ["유", "유"], ["해", "해"]],
  파: [["자", "유"], ["묘", "오"], ["진", "축"], ["미", "술"], ["인", "해"], ["사", "신"]],
  해: [["자", "미"], ["축", "오"], ["인", "사"], ["묘", "진"], ["신", "해"], ["유", "술"]],
});

const PALACE_LABELS = ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "교우궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
const STAR_POOL = ["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];
const ZHI_LIST = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function hasSoulOriginBrokenText(value) {
  const body = clean(value);
  return /[\uFFFD\uF900-\uFAFF]/.test(body)
    || /(?:\?[\uAC00-\uD7AF]|[\uAC00-\uD7AF]\?){2,}/.test(body)
    || /(?:\u00C3.|\u00C2.|\u00E2[\u0080-\u02FF]{1,3}|[\u00EC\u00ED\u00EA\u00EB][\u0080-\u02FF]{1,3}){2,}/.test(body)
    || /[\u3131-\u318E]{2,}/.test(body);
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round(value) {
  return Math.round(safeNumber(value, 0));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, safeNumber(value, 0)));
}

function toInt(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toIso(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function normalizeStemLabel(value) {
  const raw = clean(value);
  return STEM_KO_MAP[raw] || raw;
}

function normalizeBranchLabel(value) {
  const raw = clean(value);
  return BRANCH_KO_MAP[raw] || raw;
}

function formatGanjiWithHanja(stem = "", branch = "") {
  const koStem = normalizeStemLabel(stem);
  const koBranch = normalizeBranchLabel(branch);
  const hanStem = STEM_HAN_MAP[koStem] || clean(stem);
  const hanBranch = BRANCH_HAN_MAP[koBranch] || clean(branch);
  if (!koStem || !koBranch) return `${koStem}${koBranch}`.trim();
  if (!hanStem || !hanBranch) return `${koStem}${koBranch}`;
  return `${koStem}${koBranch}(${hanStem}${hanBranch})`;
}

function normalizeError(error) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function logFlow(stage, payload = {}) {
  const safe = {
    stage: clean(stage || "Unknown"),
    requestId: clean(payload.requestId || ""),
    sessionId: clean(payload.sessionId || ""),
    reportId: clean(payload.reportId || ""),
    errorCode: clean(payload.errorCode || ""),
  };
  const tag = `[SoulOrigin][${safe.stage}]`;
  if (safe.errorCode) {
    console.error(tag, safe);
    return;
  }
  console.info(tag, safe);
}

function stripForbiddenTokens(text = "") {
  let result = String(text || "");
  FORBIDDEN_TOKENS.forEach((token) => {
    if (!token) return;
    const re = new RegExp(String(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    result = result.replace(re, "");
  });
  return result
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/구조이/g, "구조가")
    .trim();
}

function hasForbiddenText(text = "") {
  return FORBIDDEN_RE.test(String(text || ""));
}

function normalizeBirthInput(raw = {}) {
  const src = raw && typeof raw === "object" ? raw : {};

  const birthDateRaw = clean(src.birthDate || src.date || src.birthday || "");
  const dateMatch = birthDateRaw.match(/(\d{4})[-./\s년](\d{1,2})[-./\s월](\d{1,2})/);
  const year = dateMatch ? toInt(dateMatch[1], NaN) : toInt(src.year ?? src.birthYear, NaN);
  const month = dateMatch ? toInt(dateMatch[2], NaN) : toInt(src.month ?? src.birthMonth, NaN);
  const day = dateMatch ? toInt(dateMatch[3], NaN) : toInt(src.day ?? src.birthDay, NaN);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, code: "BIRTH_DATE_REQUIRED", message: "운명의 업 리포트 생성을 위해 생년월일 정보가 필요합니다." };
  }

  const birthTimeRaw = clean(src.birthTime || src.time || "");
  let hour = toInt(src.birthHour ?? src.hour, NaN);
  let minute = toInt(src.birthMinute ?? src.minute, 0);
  const timeMatch = birthTimeRaw.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
  if (timeMatch) {
    hour = toInt(timeMatch[1], NaN);
    minute = toInt(timeMatch[2], 0);
  }

  if (!Number.isFinite(hour)) {
    return { ok: false, code: "BIRTH_TIME_REQUIRED", message: BIRTH_TIME_REQUIRED_MESSAGE };
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { ok: false, code: "BIRTH_INPUT_INVALID", message: "생년월일시 형식을 확인해 주세요." };
  }

  const birthDate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const birthTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const latitude = safeNumber(src.latitude, 37.5665);
  const longitude = safeNumber(src.longitude ?? src.lng, 126.978);
  const calendarRaw = clean(src.calendarType || src.calendar || src.calType || "solar").toLowerCase();
  const calendarType = calendarRaw.includes("lunar")
    ? (calendarRaw.includes("leap") || calendarRaw.includes("윤") ? "lunar_leap" : "lunar")
    : "solar";

  return {
    ok: true,
    input: {
      name: clean(src.name || "사용자") || "사용자",
      gender: clean(src.gender || src.sex || "unknown") || "unknown",
      birthDate,
      birthTime,
      birthPlace: clean(src.birthPlace || src.place || "대한민국") || "대한민국",
      calendarType,
      timezone: clean(src.timezone || "Asia/Seoul") || "Asia/Seoul",
      timezoneOffset: safeNumber(src.timezoneOffset, 9),
      latitude,
      longitude,
      year,
      month,
      day,
      hour,
      minute,
    },
  };
}

function branchKoToHan(value = "") {
  return BRANCH_HAN_MAP[clean(value)] || clean(value);
}

function detectBranchRelations(branches = []) {
  const list = Array.isArray(branches) ? branches.filter(Boolean) : [];
  const hits = [];
  const used = new Set();

  Object.keys(BRANCH_RELATION).forEach((type) => {
    const pairs = BRANCH_RELATION[type] || [];
    pairs.forEach(([a, b]) => {
      const hasA = list.includes(a);
      const hasB = list.includes(b);
      if (!hasA || !hasB) return;
      const key = `${type}:${a}-${b}`;
      if (used.has(key)) return;
      used.add(key);
      hits.push(`${a}${b}${type}`);
    });
  });

  return hits;
}

function buildTwelveGrowthStages(pillars = {}) {
  const stageByBranch = {
    자: "태", 축: "양", 인: "장생", 묘: "목욕", 진: "관대", 사: "건록", 오: "제왕", 미: "쇠", 신: "병", 유: "사", 술: "묘", 해: "절",
  };

  const ordered = ["year", "month", "day", "hour"];
  return ordered.map((key) => {
    const branch = clean(pillars?.[key]?.branch);
    return {
      pillar: key,
      branch,
      stage: stageByBranch[branch] || "평",
    };
  });
}

function calcSpecialStarsFromPillars(pillars = {}) {
  const dayBranch = clean(pillars?.day?.branch);
  const monthBranch = clean(pillars?.month?.branch);
  const hourBranch = clean(pillars?.hour?.branch);
  const branches = [dayBranch, monthBranch, hourBranch].filter(Boolean).map((v) => branchKoToHan(v));
  const dayHan = branchKoToHan(dayBranch);

  const taoByDay = {
    子: ["酉"], 午: ["卯"], 卯: ["子"], 酉: ["午"],
    寅: ["卯"], 戌: ["卯"], 亥: ["子"], 未: ["子"], 申: ["酉"], 辰: ["酉"], 巳: ["午"], 丑: ["午"],
  };
  const yeokmaByDay = {
    寅: ["申"], 午: ["申"], 戌: ["申"], 申: ["寅"], 子: ["寅"], 辰: ["寅"],
    亥: ["巳"], 卯: ["巳"], 未: ["巳"], 巳: ["亥"], 酉: ["亥"], 丑: ["亥"],
  };
  const hwaByDay = {
    寅: ["戌"], 午: ["戌"], 戌: ["戌"], 亥: ["未"], 卯: ["未"], 未: ["未"],
    申: ["辰"], 子: ["辰"], 辰: ["辰"], 巳: ["丑"], 酉: ["丑"], 丑: ["丑"],
  };

  const stars = [];
  if ((taoByDay[dayHan] || []).some((v) => branches.includes(v))) stars.push("도화");
  if ((yeokmaByDay[dayHan] || []).some((v) => branches.includes(v))) stars.push("역마");
  if ((hwaByDay[dayHan] || []).some((v) => branches.includes(v))) stars.push("화개");
  return stars;
}

function getPillar(profile, key) {
  const p = profile?.pillars?.[key] || {};
  const stem = normalizeStemLabel(p.stemKo || p.stem || "");
  const branch = normalizeBranchLabel(p.branchKo || p.branch || "");
  return {
    stem,
    branch,
    ganji: `${stem}${branch}`.trim(),
  };
}

function calculateSajuLocal(birthInput) {
  const profile = buildSajuProfile({
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
      year: birthInput.year,
      month: birthInput.month,
      day: birthInput.day,
      hour: birthInput.hour,
      minute: birthInput.minute,
      calendarType: birthInput.calendarType || "solar",
      timezone: birthInput.timezone || "Asia/Seoul",
      birthPlace: birthInput.birthPlace || "대한민국",
      latitude: birthInput.latitude,
      longitude: birthInput.longitude,
      unknownTime: false,
    },
  });

  const yearPillar = getPillar(profile, "year");
  const monthPillar = getPillar(profile, "month");
  const dayPillar = getPillar(profile, "day");
  const hourPillar = getPillar(profile, "hour");

  const five = profile?.fiveElements?.percentages || {};
  const tenGodCounts = profile?.tenGods?.counts && typeof profile.tenGods.counts === "object"
    ? profile.tenGods.counts
    : {};

  const usefulGods = profile?.usefulGods || {};
  const useful = clean(usefulGods.yong || "");
  const support = Array.isArray(usefulGods.hee) ? usefulGods.hee.map((v) => clean(v)).filter(Boolean) : [];
  const caution = Array.isArray(usefulGods.gi) ? usefulGods.gi.map((v) => clean(v)).filter(Boolean) : [];

  const elementWeights = {
    wood: round(safeNumber(five.wood, 0)),
    fire: round(safeNumber(five.fire, 0)),
    earth: round(safeNumber(five.earth, 0)),
    metal: round(safeNumber(five.metal, 0)),
    water: round(safeNumber(five.water, 0)),
  };

  const sortedElements = Object.entries(elementWeights).sort((a, b) => Number(b[1]) - Number(a[1]));
  const dominantElement = clean(sortedElements[0]?.[0] || "earth");
  const deficientElement = clean(sortedElements[sortedElements.length - 1]?.[0] || "water");

  const topTenGod = Object.keys(tenGodCounts)
    .sort((a, b) => safeNumber(tenGodCounts[b], 0) - safeNumber(tenGodCounts[a], 0))
    .slice(0, 3);

  const daewoonRaw = Array.isArray(profile?.daewoon) ? profile.daewoon.slice(0, 10) : [];
  const daewoonCycles = daewoonRaw
    .map((item, idx) => ({
      order: idx + 1,
      label: clean(item?.ganji || item?.label || ""),
      startAge: safeNumber(item?.startAge, 0),
    }))
    .filter((item) => item.label);

  const age = new Date().getFullYear() - birthInput.year + 1;
  let currentDaewun = "";
  let nextDaewun = "";
  for (let i = 0; i < daewoonCycles.length; i += 1) {
    const node = daewoonCycles[i];
    const next = daewoonCycles[i + 1] || null;
    const start = safeNumber(node.startAge, 0);
    const end = next ? safeNumber(next.startAge, 120) - 1 : 120;
    if (age >= start && age <= end) {
      currentDaewun = node.label;
      nextDaewun = next?.label || "";
      break;
    }
  }

  if (!currentDaewun && daewoonCycles.length) {
    currentDaewun = daewoonCycles[0].label;
    nextDaewun = daewoonCycles[1]?.label || "";
  }

  const nowSolar = Solar.fromDate(new Date());
  const nowEight = nowSolar.getLunar().getEightChar();
  const currentYearPillar = `${normalizeStemLabel(nowEight.getYearGan())}${normalizeBranchLabel(nowEight.getYearZhi())}`.trim();

  const pillars = {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
  };

  const pillarBranches = [yearPillar.branch, monthPillar.branch, dayPillar.branch, hourPillar.branch].filter(Boolean);
  const branchRelations = detectBranchRelations(pillarBranches);
  const specialStars = calcSpecialStarsFromPillars(pillars);
  const twelveGrowthStages = buildTwelveGrowthStages(pillars);

  return {
    dayMaster: dayPillar.stem,
    monthBranch: monthPillar.branch,
    yearPillar: yearPillar.ganji,
    monthPillar: monthPillar.ganji,
    dayPillar: dayPillar.ganji,
    hourPillar: hourPillar.ganji,
    pillars,
    elementWeights,
    dominantElement,
    deficientElement,
    tenGodCounts,
    topTenGod,
    yongshin: useful,
    heesin: support,
    gisin: caution,
    strength: clean(usefulGods.strength || "중화") || "중화",
    daewoonCycles,
    currentDaewun,
    nextDaewun,
    currentYear: new Date().getFullYear(),
    currentYearPillar,
    specialStars,
    twelveGrowthStages,
    branchRelations,
  };
}

function calculateZiweiLocal(birthInput) {
  const solar = Solar.fromYmdHms(birthInput.year, birthInput.month, birthInput.day, birthInput.hour, birthInput.minute, 0);
  const lunar = solar.getLunar();

  const lMonth = Math.abs(Number(lunar.getMonth()));
  const hIdx = (birthInput.hour === 23 || birthInput.hour === 0) ? 0 : Math.floor((birthInput.hour + 1) / 2);
  const baseIdx = (2 + lMonth - 1) % 12;
  const mingIdx = (baseIdx - hIdx + 12) % 12;
  const shenIdx = (baseIdx + hIdx) % 12;

  const palaces = Array.from({ length: 12 }).map((_, i) => {
    const branchIndex = (mingIdx - i + 12) % 12;
    const palaceName = PALACE_LABELS[i];
    const starA = STAR_POOL[(birthInput.day + i) % STAR_POOL.length];
    const starB = STAR_POOL[(birthInput.month + i + 5) % STAR_POOL.length];
    return {
      index: i,
      palace: palaceName,
      branch: ZHI_LIST[branchIndex],
      mainStars: [starA, starB],
    };
  });

  return {
    chartMeta: {
      mingGong: ZHI_LIST[mingIdx],
      shenGong: ZHI_LIST[shenIdx],
      yearGan: clean(lunar.getYearGan() || ""),
      yearZhi: clean(lunar.getYearZhi() || ""),
    },
    palaces,
  };
}

function calculateAstrologyLocal(birthInput) {
  const local = buildAstroLocalChartJson({
    birthDate: birthInput.birthDate,
    birthTime: birthInput.birthTime,
    birthYear: birthInput.year,
    birthMonth: birthInput.month,
    birthDay: birthInput.day,
    birthHour: birthInput.hour,
    birthMinute: birthInput.minute,
    timezone: birthInput.timezone,
    latitude: birthInput.latitude,
    longitude: birthInput.longitude,
    gender: birthInput.gender,
    name: birthInput.name,
  }, {}, null);

  const chart = local?.chart || {};
  return {
    sun: clean(chart?.sunSign || ""),
    moon: clean(chart?.moonSign || ""),
    ascendant: clean(chart?.ascendantSign || ""),
    majorPlanets: Array.isArray(chart?.planets) ? chart.planets.slice(0, 10) : [],
    houses: Array.isArray(chart?.houses) ? chart.houses : [],
  };
}

function calculateVedicLocal(birthInput) {
  const local = buildVedicLocalChartJson({
    birthDate: birthInput.birthDate,
    birthTime: birthInput.birthTime,
    birthYear: birthInput.year,
    birthMonth: birthInput.month,
    birthDay: birthInput.day,
    birthHour: birthInput.hour,
    birthMinute: birthInput.minute,
    timezone: birthInput.timezone,
    latitude: birthInput.latitude,
    longitude: birthInput.longitude,
    gender: birthInput.gender,
    name: birthInput.name,
  });

  const chart = local?.chart || {};
  return {
    lagna: clean(chart?.lagnaSign || chart?.ascendantSign || ""),
    moonNakshatra: clean(chart?.moonNakshatra || ""),
    dasha: {
      current: clean(chart?.dashas?.currentMahaDasha || ""),
      next: clean(chart?.dashas?.nextMahaDasha || ""),
    },
    rahu: clean(chart?.rahuSign || ""),
    ketu: clean(chart?.ketuSign || ""),
    planets: Array.isArray(chart?.planets) ? chart.planets.slice(0, 9) : [],
    houses: Array.isArray(chart?.houses) ? chart.houses : [],
  };
}

function calculateSukyoLocal(birthInput) {
  const solar = Solar.fromYmdHms(birthInput.year, birthInput.month, birthInput.day, birthInput.hour, birthInput.minute, 0);
  const lunar = solar.getLunar();
  const lunarMonth = Number(lunar.getMonth());
  const lunarDay = Number(lunar.getDay());
  const basic = buildSukuyoFromLunar(Math.abs(lunarMonth), lunarDay, {
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  });

  return {
    natalStar: clean(basic?.nameKo || basic?.name || ""),
    element: clean(basic?.elementKo || ""),
    nature: clean(basic?.natureKo || ""),
  };
}

function deriveCrossSignals(localSeed) {
  const saju = localSeed?.saju || {};
  const tenGod = Array.isArray(saju.topTenGod) && saju.topTenGod.length ? saju.topTenGod.join(", ") : "핵심 십성";
  const stars = Array.isArray(saju.specialStars) && saju.specialStars.length ? saju.specialStars.join(", ") : "주요 신살";
  const growth = Array.isArray(saju.twelveGrowthStages) && saju.twelveGrowthStages.length
    ? saju.twelveGrowthStages.slice(0, 3).map((item) => `${item.pillar} ${item.stage}`).join(", ")
    : "십이운성 흐름";
  const relation = Array.isArray(saju.branchRelations) && saju.branchRelations.length
    ? saju.branchRelations.slice(0, 4).join(", ")
    : "합충형파해 신호";

  return {
    dayMaster: clean(saju.dayMaster || ""),
    monthBranch: clean(saju.monthBranch || ""),
    pillars: [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.hourPillar].filter(Boolean),
    tenGod,
    stars,
    growth,
    relation,
    yongshin: clean(saju.yongshin || ""),
    heesin: Array.isArray(saju.heesin) ? saju.heesin.join(", ") : "",
    gisin: Array.isArray(saju.gisin) ? saju.gisin.join(", ") : "",
    daewun: clean(saju.currentDaewun || ""),
    nextDaewun: clean(saju.nextDaewun || ""),
    sewoon: clean(saju.currentYearPillar || ""),
    dominantElement: clean(saju.dominantElement || ""),
    deficientElement: clean(saju.deficientElement || ""),
    mingGong: clean(localSeed?.ziwei?.chartMeta?.mingGong || ""),
    shenGong: clean(localSeed?.ziwei?.chartMeta?.shenGong || ""),
    astro: [clean(localSeed?.astrology?.sun), clean(localSeed?.astrology?.moon), clean(localSeed?.astrology?.ascendant)].filter(Boolean).join(" · "),
    vedic: [clean(localSeed?.vedic?.lagna), clean(localSeed?.vedic?.moonNakshatra), clean(localSeed?.vedic?.dasha?.current)].filter(Boolean).join(" · "),
    sukyo: clean(localSeed?.sukyo?.natalStar || ""),
  };
}

async function buildSoulOriginLocalSeed(_env, birthInput) {
  const engineErrors = [];
  const seed = {
    birthInput,
    saju: null,
    ziwei: null,
    astrology: null,
    vedic: null,
    sukyo: null,
    generatedAt: new Date().toISOString(),
  };

  try {
    seed.saju = calculateSajuLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "saju", error: normalizeError(error) });
  }

  try {
    seed.ziwei = calculateZiweiLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "ziwei", error: normalizeError(error) });
  }

  try {
    seed.astrology = calculateAstrologyLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "astrology", error: normalizeError(error) });
  }

  try {
    seed.vedic = calculateVedicLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "vedic", error: normalizeError(error) });
  }

  try {
    seed.sukyo = calculateSukyoLocal(birthInput);
  } catch (error) {
    engineErrors.push({ engine: "sukyo", error: normalizeError(error) });
  }

  if (engineErrors.length) {
    console.error("[SoulOrigin][LocalSeedFailed]", { engineErrors });
    const err = new Error("운명의 업 리포트 생성에 필요한 출생 정보 계산을 완료하지 못했습니다. 프로필 정보를 확인해 주세요.");
    err.code = "SOUL_ORIGIN_LOCAL_ENGINE_FAILED";
    err.status = 422;
    throw err;
  }

  seed.signals = deriveCrossSignals(seed);
  return seed;
}

function sentenceShuffle(list = [], seed = 0) {
  const arr = Array.isArray(list) ? list.slice() : [];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = (seed + i * 17) % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function ensureCategoryLength(text, chapterId, minLength = MIN_CATEGORY_CHARS + 80) {
  let result = stripForbiddenTokens(text);
  const fillers = CHAPTER_FILLERS[String(chapterId || "")] || DEFAULT_FILLERS;
  let idx = 0;
  while (result.length < minLength) {
    result = `${result}\n\n${fillers[idx % fillers.length]}`;
    idx += 1;
  }
  return stripForbiddenTokens(result);
}

function buildTopicAnchor(chapterId, categoryTitle = "") {
  const keywords = TOPIC_KEYWORDS[String(chapterId || "")] || [];
  const picks = keywords.slice(0, 4);
  if (!picks.length) return clean(categoryTitle || "");
  return `${clean(categoryTitle || "")} · ${picks.join(" · ")}`;
}

function joinParagraphs(lines = []) {
  return (Array.isArray(lines) ? lines : [])
    .map((line) => stripForbiddenTokens(line))
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
}

function buildCategoryText(localSeed, chapter, categoryTitle, categoryIndex) {
  const profileName = clean(localSeed?.birthInput?.name || "의뢰인");
  const signals = localSeed?.signals || {};
  const chapterNo = Number(chapter?.id || 0);
  const chapterId = String(chapter?.id || "");
  const tone = CHAPTER_TONE[chapterId] || {
    lens: "원국과 운의 흐름",
    diagnosis: "반복을 이해하는 통합 관점",
    reality: "현실 장면에서 되풀이되는 반응",
    collapse: "감정 피로가 누적될 때 판단이 좁아지는 흐름",
    strategy: "행동 순서를 재설계하는 접근",
  };
  const topicAnchor = buildTopicAnchor(chapterId, categoryTitle);

  const corePillars = Array.isArray(signals.pillars) && signals.pillars.length
    ? signals.pillars.map((ganji) => {
      const stem = clean(ganji).slice(0, 1);
      const branch = clean(ganji).slice(1, 2);
      return formatGanjiWithHanja(stem, branch);
    }).filter(Boolean).join(" · ")
    : "사주 원국";

  const openers = sentenceShuffle([
    `${profileName}님 명식의 핵심은 ${tone.diagnosis}입니다. ${topicAnchor} 주제는 반복의 표면을 설명하는 수준을 넘어, 왜 같은 장면이 다시 열리는지를 삶의 시간축에서 확인하게 합니다.`,
    `반복되는 일은 사람을 지치게 만들지만, 명식에서 반복은 벌이 아니라 아직 다른 방식으로 다루지 못한 과제에 가깝습니다. ${topicAnchor}을 ${tone.lens} 관점으로 읽으면, 소모를 줄이고 회복을 앞당길 실마리가 드러납니다.`,
    `${profileName}님이 겪는 반복에는 분명한 결이 있습니다. ${corePillars} 흐름과 ${clean(signals.tenGod || "십성")}의 작동을 함께 보면, 문제의 원인이 의지 부족이 아니라 오래된 반응 경로에 있다는 점이 선명해집니다.`,
  ], chapterNo + categoryIndex);

  const evidence = joinParagraphs([
    `${SECTION_TITLES[1]}는 ${tone.lens} 축으로 정리됩니다. 핵심 키워드는 ${topicAnchor}이며, 특히 일간 ${clean(signals.dayMaster || "중심 일간")}, 월지 ${clean(signals.monthBranch || "중심 월지")}, 대운 ${clean(signals.daewun || "현재 대운")}, 세운 ${clean(signals.sewoon || "현재 세운")}의 결합이 이번 주제의 방향을 결정합니다.`,
    `오행에서는 ${clean(signals.dominantElement || "강한 기운")}의 과밀과 ${clean(signals.deficientElement || "보완 기운")}의 공백이 동시에 보입니다. 여기에 ${clean(signals.yongshin || "용신")}, ${clean(signals.heesin || "희신")}, ${clean(signals.gisin || "기신")} 흐름을 겹쳐 보면 어떤 환경에서 힘이 붙고 어떤 장면에서 소모가 커지는지 판단 기준이 분명해집니다.`,
    `${clean(signals.relation || "합충형파해 배치")}와 ${clean(signals.stars || "신살 신호")}, ${clean(signals.growth || "십이운성 흐름")}은 감정 반응의 타이밍을 보여 줍니다. 같은 사건이라도 시기와 관계 구도에 따라 체감 난도가 달라지는 이유가 이 지점에서 설명됩니다.`,
  ]);

  const body = [
    `${SECTION_TITLES[0]}\n${openers[0]}\n\n${openers[1]}`,
    `${SECTION_TITLES[1]}\n${evidence}`,
    `${SECTION_TITLES[2]}\n${tone.reality}이 ${categoryTitle} 장면에서 자주 관찰됩니다. 표면적으로는 우연처럼 보이지만, 실제로는 비슷한 관계 구조와 결정 습관이 결합되면서 같은 결과가 재현되는 경우가 많습니다. ${profileName}님은 특히 ${clean(signals.astro || "태양·달·상승궁 흐름")}과 ${clean(signals.vedic || "라그나·다샤 흐름")}이 겹치는 시기에 체감 변동이 커질 가능성이 높습니다.`,
    `${SECTION_TITLES[3]}\n${tone.collapse} 핵심 원인은 문제를 늦게 인식하는 것이 아니라, 이미 익숙한 반응을 안전하다고 착각하는 순간에 있습니다. 이 구간에서 판단 피로가 누적되면 관계, 돈, 일 중 한 축이 먼저 흔들리고 나머지 축까지 연쇄적으로 압박을 받기 쉽습니다.`,
    `${SECTION_TITLES[4]}\n${tone.strategy} 먼저 선택 기준을 문장으로 고정하고, 다음으로 실행 순서를 고정해야 합니다. 이번 주제에서는 ${TOPIC_KEYWORDS[chapterId]?.slice(0, 3).join(" · ")} 축을 우선 기준으로 삼아 의사결정 순서를 재배치하는 것이 유효합니다. 이때 상대 반응보다 내 기준 유지율을 먼저 점검하면 반복의 강도를 안정적으로 낮출 수 있습니다.`,
    `${SECTION_TITLES[5]}\n오늘부터 2주 동안 ${categoryTitle} 관련 장면에서 행동 전에 90초 멈춤을 적용해 보세요. 멈춤 동안 지금의 선택이 장기 기준과 일치하는지만 확인하고 진행하면, 감정 파동이 큰 날에도 결과 편차가 줄어듭니다. 주말에는 한 번만 복기해서 유지할 행동과 멈출 행동을 각각 하나씩 고르면 다음 주 전개가 더 선명해집니다.`,
  ];

  return ensureCategoryLength(stripForbiddenTokens(body.join("\n\n")), chapterId);
}

function safeJsonForPrompt(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function extractSoulOriginJsonObject(text = "") {
  const raw = clean(text)
    .replace(/^\s*```(?:json|javascript|js)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(raw);
  } catch (_) {}

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (_) {}
  }

  throw Object.assign(new Error("SOUL_ORIGIN_LLM_JSON_PARSE_FAILED"), { code: "SOUL_ORIGIN_LLM_JSON_PARSE_FAILED" });
}

function normalizeTonePreset(value) {
  const raw = clean(value || "").toLowerCase().replace(/[\s]/g, "_");
  if (!raw || !SOUL_ORIGIN_TONE_PRESETS[raw]) {
    return SOUL_ORIGIN_DEFAULT_TONE_PRESET;
  }
  return raw;
}

function normalizeToneIntensity(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return SOUL_ORIGIN_DEFAULT_TONE_INTENSITY;
  }
  const parsed = Math.round(raw);
  if (parsed < SOUL_ORIGIN_TONE_INTENSITY_MIN || parsed > SOUL_ORIGIN_TONE_INTENSITY_MAX) {
    return SOUL_ORIGIN_DEFAULT_TONE_INTENSITY;
  }
  return parsed;
}

function normalizeToneWeight(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const clamped = Math.max(0, Math.min(10, Math.round(parsed)));
  return Number.isFinite(clamped) ? clamped : fallback;
}

function buildSoulOriginToneProfile(rawTone = {}) {
  const preset = normalizeTonePreset(rawTone?.tonePreset || SOUL_ORIGIN_DEFAULT_TONE_PRESET);
  const intensity = normalizeToneIntensity(rawTone?.toneIntensity);
  const presetConfig = SOUL_ORIGIN_TONE_PRESETS[preset] || SOUL_ORIGIN_TONE_PRESETS.default;
  const customWeight = rawTone?.toneWeights && typeof rawTone.toneWeights === "object" ? rawTone.toneWeights : {};
  const mergedWeights = {
    love: normalizeToneWeight(customWeight?.love, Number(presetConfig.weights?.love || 3)),
    career: normalizeToneWeight(customWeight?.career, Number(presetConfig.weights?.career || 3)),
    money: normalizeToneWeight(customWeight?.money, Number(presetConfig.weights?.money || 3)),
    fortune: normalizeToneWeight(customWeight?.fortune, Number(presetConfig.weights?.fortune || 3)),
    identity: normalizeToneWeight(customWeight?.identity, Number(presetConfig.weights?.identity || 3)),
  };
  return {
    preset,
    presetLabel: presetConfig.label,
    intensity,
    direction: presetConfig.direction,
    weights: mergedWeights,
  };
}

function formatWeightSummary(weights = {}) {
  const normalized = {
    love: Number(weights?.love || 0),
    career: Number(weights?.career || 0),
    money: Number(weights?.money || 0),
    fortune: Number(weights?.fortune || 0),
    identity: Number(weights?.identity || 0),
  };
  return Object.keys(normalized).map((key) => `${key}=${normalized[key]}`).join(", ");
}

function buildSoulOriginTonePrompt(toneProfile = {}) {
  return [
    `현재 상담 톤 프리셋: ${toneProfile?.presetLabel || SOUL_ORIGIN_TONE_PRESETS.default.label}.`,
    `상담 강도: ${toneProfile?.intensity || SOUL_ORIGIN_DEFAULT_TONE_INTENSITY}(1~5).`,
    `가중치 프리셋 적용: ${formatWeightSummary(toneProfile?.weights || {})}.`,
    `방향성: ${toneProfile?.direction || SOUL_ORIGIN_TONE_PRESETS.default.direction}.`,
    "실행형 문장(권고/주의/회피) 비중을 톤 강도에 맞춰 늘리고, 같은 표현 반복은 줄인다.",
  ].join("\n");
}

function buildSoulOriginPromptSeed(localSeed = {}) {
  const signals = localSeed?.signals || {};
  const saju = localSeed?.saju || {};
  const ziwei = localSeed?.ziwei || {};
  const astro = localSeed?.astro || {};
  const vedic = localSeed?.vedic || {};
  const sukyo = localSeed?.sukyo || {};

  return {
    profile: {
      name: clean(localSeed?.birthInput?.name || "\uC758\uB7EC\uC778"),
      birthDate: clean(localSeed?.birthInput?.birthDate),
      birthTime: clean(localSeed?.birthInput?.birthTime),
      timezone: clean(localSeed?.birthInput?.timezone || "Asia/Seoul"),
      birthPlace: clean(localSeed?.birthInput?.birthPlace || "Korea"),
    },
    saju: {
      dayMaster: clean(saju?.core?.dayMaster),
      tenGod: clean(saju?.core?.tenGod),
      yongshin: clean(saju?.core?.yongshin),
      heesin: clean(saju?.core?.heesin),
      gisin: clean(saju?.core?.gisin),
      pillars: clean(saju?.pillars || ""),
      yinYang: clean(saju?.balance?.yinYang || ""),
      dominantElement: clean(signals.dominantElement || ""),
      deficientElement: clean(signals.deficientElement || ""),
    },
    ziwei: {
      mingGong: clean(ziwei?.chartMeta?.mingGong || ""),
      shenGong: clean(ziwei?.chartMeta?.shenGong || ""),
      stars: clean(ziwei?.chartText || ""),
    },
    astrology: {
      sun: clean(astro?.sun || ""),
      moon: clean(astro?.moon || ""),
      ascendant: clean(astro?.ascendant || ""),
      majorTransit: clean(signals.astro || ""),
    },
    vedic: {
      lagna: clean(vedic?.lagna || ""),
      nakshatra: clean(vedic?.moonNakshatra || ""),
      dasha: clean(vedic?.dasha?.current || ""),
      flow: clean(signals.vedic || ""),
    },
    sukyo: {
      natalStar: clean(sukyo?.natalStar || ""),
      pattern: clean(sukyo?.pattern || ""),
      karmicTheme: clean(sukyo?.karmicTheme || ""),
    },
    signalAnchors: {
      keywords: Object.keys(TOPIC_KEYWORDS || {}).flatMap((chapterId) => TOPIC_KEYWORDS[chapterId] || []),
      requiredChapters: CHAPTER_BLUEPRINTS.map((chapter) => `${chapter.id}:${chapter.title}`),
      calculationOnly: true,
    },
  };
}

function buildSoulOriginChapterPrompt({ chapter, blueprint = {}, localSeed = {}, toneProfile = {}, localChapter = null }) {
  const chapterId = String(chapter?.id || blueprint?.id || "").padStart(2, "0");
  const categoryNames = Array.isArray(blueprint?.categories) ? blueprint.categories : [];
  const safeCategories = categoryNames.map((title) => clean(title)).filter(Boolean);
  const sectionShape = safeCategories.map(() => ({
    body: `...`,
  }));
  const seed = buildSoulOriginPromptSeed(localSeed);
  const localDraft = localChapter && typeof localChapter === "object"
    ? {
      id: clean(localChapter.id || chapterId),
      title: clean(localChapter.title || blueprint?.title || ""),
      sections: (Array.isArray(localChapter.sections) ? localChapter.sections : []).map((section) => ({
        title: clean(section?.title || ""),
        body: stripForbiddenTokens(section?.body || ""),
      })),
    }
    : null;
  return [
    "운명의 업 프리미엄 상담서 챕터 본문을 작성한다.",
    "네가 해야 할 일:",
    "- 출력은 순수 JSON 한 개만 반환. 설명 텍스트, 코드블록, ``` 절대 금지.",
    "- 표지, 목차, 챕터 번호, 챕터 제목, 부제, 섹션 제목, 공통 고지 문구는 정적 템플릿에서 이미 제공한다.",
    "- 새 제목을 만들거나 기존 제목을 바꾸지 말고, 아래 섹션 순서에 맞는 본문만 작성한다.",
    "- 계산 결과를 상담 맥락으로 재해석해 1장의 해석을 작성.",
    "- 사주/자미두수/점성/베다/숙요점 데이터 간 인과 고리를 실제 인간 상황(연애·직장·재물·관계)으로 연결.",
    "- 이 장은 반드시 사용자 성향-과거-시기 구조로 1인칭 상담문장으로 끝나야 함.",
    "- 각 섹션 본문에는 다음 소제목 문자열을 모두 1회 이상 반드시 포함: " + SECTION_TITLES.map((heading) => `"${heading}"`).join(", "),
    "- 섹션은 총 5개, 각 본문은 최소 900자 이상, 중복 표현 금지(특히 고정 패턴 반복 금지).",
    "- 섹션 본문은 제공된 섹션 순서를 그대로 따른다: " + safeCategories.map((title, index) => `${index + 1}. ${title}`).join(" / "),
    "- 출력 스키마:",
    safeJsonForPrompt({
      id: chapterId,
      sections: sectionShape,
    }),
    "",
    "tone settings:",
    buildSoulOriginTonePrompt(toneProfile),
    "",
    ...(localDraft ? [
      "local calculation draft to enhance:",
      safeJsonForPrompt(localDraft),
      "",
      "Enhance the local calculation draft. Keep every section title and the calculated meaning. Improve only the reading depth, flow, and professional mystical expression.",
      "",
    ] : []),
    "seed snapshot:",
    safeJsonForPrompt(seed),
  ].join("\n");
}

async function callSoulOriginGemini(env, prompt, options = {}) {
  const result = await callGeminiText(env, prompt, {
    keyEnvKeys: SOUL_ORIGIN_LLM_KEY_ENV_KEYS,
    modelEnvKeys: SOUL_ORIGIN_LLM_MODEL_ENV_KEYS,
    temperature: Number(env?.SOUL_ORIGIN_GEMINI_TEMPERATURE || env?.PREMIUM_GEMINI_TEMPERATURE || 0.35),
    topP: Number(env?.SOUL_ORIGIN_GEMINI_TOP_P || env?.PREMIUM_GEMINI_TOP_P || 0.9),
    maxOutputTokens: Number(env?.SOUL_ORIGIN_GEMINI_MAX_OUTPUT_TOKENS || env?.PREMIUM_GEMINI_MAX_OUTPUT_TOKENS || 24576),
    timeoutMs: Number(env?.SOUL_ORIGIN_GEMINI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 65000),
    totalTimeoutMs: Number(env?.SOUL_ORIGIN_GEMINI_TOTAL_TIMEOUT_MS || env?.PREMIUM_GEMINI_TOTAL_TIMEOUT_MS || 0),
    maxAttemptsPerPair: Number(env?.SOUL_ORIGIN_GEMINI_RETRIES || env?.PREMIUM_GEMINI_RETRIES || 2),
    metadata: options?.metadata || {},
  });
  if (!result?.ok || !clean(result?.text)) {
    throw Object.assign(new Error(clean(result?.message || "운명의 업 챕터 LLM 호출 실패.")), {
      code: clean(result?.error || "SOUL_ORIGIN_LLM_GENERATION_FAILED"),
      status: Number(result?.status || 502),
      details: { ...(result?.status ? { status: result.status } : {}) },
    });
  }
  return clean(result.text);
}

function normalizeSoulOriginLlmChapter(parsed = {}, blueprint = {}) {
  const chapterId = String(blueprint?.id || clean(parsed?.id || ""));
  const expected = CHAPTER_BLUEPRINTS.find((item) => clean(item.id) === String(chapterId)) || blueprint || {};
  const expectedTitles = Array.isArray(expected?.categories) ? expected.categories : [];
  const parsedSections = Array.isArray(parsed?.sections) ? parsed.sections : [];

  const sections = expectedTitles.map((title, index) => {
    const srcSection = parsedSections[index] || {};
    const sectionBody = stripForbiddenTokens(clean(srcSection?.body || ""));
    return {
      id: `${String(chapterId || "").padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
      title: clean(title || ""),
      body: sectionBody,
    };
  });

  const chapterText = sections.map((section) => `${section.title}\n\n${section.body}`).join("\n\n");

  return {
    id: String(expected.id || chapterId).padStart(2, "0"),
    title: clean(expected.title || ""),
    subtitle: clean(expected.subtitle || ""),
    sections,
    text: chapterText,
    source: "llm-only",
  };
}

function buildSoulOriginLocalChapterFallback(localChapter = {}, error = null) {
  const sections = (Array.isArray(localChapter.sections) ? localChapter.sections : []).map((section) => ({
    id: clean(section?.id || ""),
    title: clean(section?.title || ""),
    body: stripForbiddenTokens(section?.body || ""),
  }));
  return {
    id: clean(localChapter.id || ""),
    title: clean(localChapter.title || ""),
    subtitle: clean(localChapter.subtitle || ""),
    sections,
    text: sections.map((section) => `${section.title}\n\n${section.body}`).join("\n\n"),
    source: "local-calculation",
    localAuthoringSource: "local-calculation",
    llmEnhancementUsed: false,
    llmEnhancementStatus: "fallback",
    llmEnhancementErrorCode: clean(error?.code || error?.message || ""),
  };
}

function buildSoulOriginLocalChapters(localSeed, { requestId = "" } = {}) {
  logFlow("LocalAuthoringStart", {
    requestId,
    chapterCount: CHAPTER_BLUEPRINTS.length,
    stage: "local-authoring",
  });

  const chapters = CHAPTER_BLUEPRINTS.map((blueprint, chapterIndex) => {
    const chapterId = String(blueprint?.id || "").padStart(2, "0");
    const categories = Array.isArray(blueprint?.categories) ? blueprint.categories : [];
    const sections = categories.map((title, sectionIndex) => {
      const body = buildCategoryText(localSeed, blueprint, title, sectionIndex);
      return {
        id: `${chapterId}-${String(sectionIndex + 1).padStart(2, "0")}`,
        title: clean(title || ""),
        body,
      };
    });
    const chapter = {
      id: chapterId,
      title: clean(blueprint?.title || ""),
      subtitle: clean(blueprint?.subtitle || ""),
      sections,
      text: sections.map((section) => `${section.title}\n\n${section.body}`).join("\n\n"),
      source: "local-calculation",
      localAuthoringSource: "local-calculation",
      llmEnhancementUsed: false,
    };
    const validation = validateSoulOriginGeneratedChapter(chapter, blueprint);
    if (!validation.ok) {
      const err = new Error(`Soul origin local chapter ${chapterId} validation failed.`);
      err.code = "SOUL_ORIGIN_LOCAL_CHAPTER_VALIDATION_FAILED";
      err.status = 500;
      err.details = validation;
      err.chapter = chapterId;
      err.stage = "local-authoring";
      logFlow("LocalAuthoringChapterValidationFailed", {
        requestId,
        chapterId,
        chapterIndex: chapterIndex + 1,
        errorCode: err.code,
        errorCount: Number(Array.isArray(validation?.errors) ? validation.errors.length : 0),
        stage: "local-authoring",
      });
      throw err;
    }
    return chapter;
  });

  const finalValidation = validateFinalManuscript(chapters);
  if (!finalValidation.ok) {
    const err = new Error("Soul origin local manuscript validation failed.");
    err.code = "SOUL_ORIGIN_LOCAL_MANUSCRIPT_VALIDATION_FAILED";
    err.status = 500;
    err.details = finalValidation;
    err.stage = "local-authoring";
    logFlow("LocalAuthoringValidationFailed", {
      requestId,
      errorCode: err.code,
      errorCount: Number(Array.isArray(finalValidation?.errors) ? finalValidation.errors.length : 0),
      stage: "local-authoring",
    });
    throw err;
  }

  logFlow("LocalAuthoringSuccess", {
    requestId,
    chapterCount: Number(chapters.length || 0),
    stage: "local-authoring",
  });
  return chapters;
}

function validateSoulOriginGeneratedChapter(chapter = {}, blueprint = {}) {
  const expected = CHAPTER_BLUEPRINTS.find((item) => String(item.id) === String(blueprint?.id || chapter?.id || "")) || blueprint || {};
  const expectedTitles = Array.isArray(expected.categories) ? expected.categories : [];
  const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];

  if (clean(chapter?.id) !== clean(expected.id)) {
    return { ok: false, errors: [`chapter_${clean(chapter?.id || "")}_title`] };
  }
  if (clean(chapter?.title || "") !== clean(expected.title || "")) {
    return { ok: false, errors: ["chapter_title_mismatch"] };
  }
  if (sections.length !== expectedTitles.length) {
    return { ok: false, errors: ["chapter_section_count"] };
  }
  if (clean(chapter?.subtitle || "") !== clean(expected.subtitle || "")) {
    return { ok: false, errors: ["chapter_subtitle_mismatch"] };
  }

  const errors = [];
  let chapterChars = 0;
  sections.forEach((section, index) => {
    const expectedTitle = clean(expectedTitles[index] || "");
    const title = clean(section?.title || "");
    const body = stripForbiddenTokens(section?.body || "");
    if (expectedTitle && title !== expectedTitle) {
      errors.push(`chapter_${expected.id}_section_${index + 1}_title`);
    }
    if (body.length < MIN_CATEGORY_CHARS) {
      errors.push(`chapter_${expected.id}_section_${index + 1}_short`);
    }
    if (hasForbiddenText(body)) {
      errors.push(`chapter_${expected.id}_section_${index + 1}_forbidden`);
    }
    SECTION_TITLES.forEach((heading) => {
      if (!body.includes(heading)) {
        errors.push(`chapter_${expected.id}_section_${index + 1}_heading_missing`);
      }
    });
    chapterChars += body.length;
  });

  if (chapterChars < MIN_CHAPTER_CHARS) {
    errors.push(`chapter_${expected.id}_total_short`);
  }

  return {
    ok: errors.length === 0,
    errors,
    totalChars: sections.reduce((sum, section) => sum + stripForbiddenTokens(section?.body || "").length, 0),
  };
}

async function generateSoulOriginChaptersByLLM(env, { localSeed, toneProfile = {}, requestId = "", localChapters = [] }) {
  const chapters = [];
  for (let index = 0; index < CHAPTER_BLUEPRINTS.length; index += 1) {
    const blueprint = CHAPTER_BLUEPRINTS[index];
    const chapterId = String(blueprint?.id || "").padStart(2, "0");
    const localChapter = Array.isArray(localChapters) ? localChapters[index] : null;
    logFlow("LLMChapterStart", {
      requestId,
      chapterId,
      chapterIndex: index + 1,
      totalChapters: CHAPTER_BLUEPRINTS.length,
      stage: "llm-generation",
      enhancementMode: localChapter ? "local-draft" : "llm-only",
    });

    const prompt = buildSoulOriginChapterPrompt({
      chapter: blueprint,
      blueprint,
      localSeed,
      toneProfile,
      localChapter,
    });

    let text;
    try {
      text = await callSoulOriginGemini(env, prompt, {
        metadata: { requestId, chapterNumber: chapterId, stage: "soul-origin-l1" },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error("운명의 업 챕터 LLM 호출에 실패했습니다.");
      err.code = clean(err.code || "SOUL_ORIGIN_LLM_GENERATION_FAILED");
      err.status = Number(err.status || 502);
      err.chapter = chapterId;
      err.stage = "llm-generation";
      err.step = "call";
      logFlow("LLMChapterFailed", {
        requestId,
        chapterId,
        chapterIndex: index + 1,
        errorCode: clean(err.code),
        stage: "llm-generation",
      });
      if (localChapter) {
        logFlow("LLMChapterLocalFallback", {
          requestId,
          chapterId,
          chapterIndex: index + 1,
          errorCode: clean(err.code),
          stage: "llm-generation",
        });
        chapters.push(buildSoulOriginLocalChapterFallback(localChapter, err));
        continue;
      }
      throw err;
    }

    const parsed = extractSoulOriginJsonObject(text);
    const chapter = normalizeSoulOriginLlmChapter(parsed, blueprint);
    const validation = validateSoulOriginGeneratedChapter(chapter, blueprint);
    if (!validation.ok) {
      const err = new Error(`챕터 ${blueprint?.id} LLM 생성 검증 실패.`);
      err.code = "SOUL_ORIGIN_LLM_CHAPTER_VALIDATION_FAILED";
      err.status = 502;
      err.details = validation;
      err.chapter = blueprint?.id;
      err.stage = "llm-generation";
      logFlow("LLMChapterValidationFailed", {
        requestId,
        chapterId,
        chapterIndex: index + 1,
        errorCode: "SOUL_ORIGIN_LLM_CHAPTER_VALIDATION_FAILED",
        errorCount: Number(Array.isArray(validation?.errors) ? validation.errors.length : 0),
        stage: "llm-generation",
      });
      if (localChapter) {
        logFlow("LLMChapterLocalFallback", {
          requestId,
          chapterId,
          chapterIndex: index + 1,
          errorCode: "SOUL_ORIGIN_LLM_CHAPTER_VALIDATION_FAILED",
          stage: "llm-generation",
        });
        chapters.push(buildSoulOriginLocalChapterFallback(localChapter, err));
        continue;
      }
      throw err;
    }
    chapter.source = localChapter ? "local-calculation+llm-enhanced" : "llm-only";
    chapter.localAuthoringSource = localChapter ? "local-calculation" : "";
    chapter.llmEnhancementUsed = Boolean(localChapter);
    chapter.llmEnhancementStatus = localChapter ? "enhanced" : "generated";
    logFlow("LLMChapterSuccess", {
      requestId,
      chapterId,
      chapterIndex: index + 1,
      sectionCount: Number(Array.isArray(chapter?.sections) ? chapter.sections.length : 0),
      totalChars: Number((chapter?.text || "").length || 0),
      stage: "llm-generation",
    });
    chapters.push(chapter);
  }
  const finalValidation = validateFinalManuscript(chapters);
  if (!finalValidation.ok) {
    if (Array.isArray(localChapters) && localChapters.length === CHAPTER_BLUEPRINTS.length) {
      const localValidation = validateFinalManuscript(localChapters);
      if (localValidation.ok) {
        logFlow("LLMManuscriptLocalFallback", {
          requestId,
          errorCode: "SOUL_ORIGIN_LLM_MANUSCRIPT_VALIDATION_FAILED",
          errorCount: Number(Array.isArray(finalValidation?.errors) ? finalValidation.errors.length : 0),
          stage: "llm-generation",
        });
        return localChapters.map((chapter) => buildSoulOriginLocalChapterFallback(chapter, {
          code: "SOUL_ORIGIN_LLM_MANUSCRIPT_VALIDATION_FAILED",
        }));
      }
    }
    const err = new Error("운명의 업 전체 챕터 검증 실패.");
    err.code = "SOUL_ORIGIN_LLM_MANUSCRIPT_VALIDATION_FAILED";
    err.status = 502;
    err.details = finalValidation;
    err.stage = "llm-generation";
    logFlow("LLMManuscriptValidationFailed", {
      requestId,
      errorCode: "SOUL_ORIGIN_LLM_MANUSCRIPT_VALIDATION_FAILED",
      errorCount: Number(Array.isArray(finalValidation?.errors) ? finalValidation.errors.length : 0),
      stage: "llm-generation",
    });
    throw err;
  }
  logFlow("LLMGenerationComplete", {
    requestId,
    chapterCount: Number(chapters.length || 0),
    stage: "llm-generation",
  });
  return chapters;
}

function buildSoulOriginSummaryPrompt({ localSeed = {}, chapters = [], toneProfile = {} }) {
  const seed = buildSoulOriginPromptSeed(localSeed);
  const outline = (Array.isArray(chapters) ? chapters : []).map((chapter) => ({
    id: clean(chapter?.id),
    title: clean(chapter?.title),
    subtitle: clean(chapter?.subtitle),
    sectionTitles: Array.isArray(chapter?.sections) ? chapter.sections.map((section) => clean(section?.title)).filter(Boolean) : [],
  }));
  return [
    "운명의 업 PDF 전체 요약을 작성한다.",
    "출력은 순수 JSON 한 개만 반환한다. 코드블록, 설명 텍스트, markdown은 금지한다.",
    "로컬 계산값은 원고 작성을 위한 근거로만 사용하고, 최종 요약 문장은 반드시 새로 작성한다.",
    "요약은 180~420자 사이의 전문적이고 신비로운 한국어 상담문으로 작성한다.",
    "요약 안에 JSON, API, LLM, local, fallback, seed, engine, debug 같은 내부 용어를 쓰지 않는다.",
    "출력 스키마:",
    safeJsonForPrompt({ summary: "..." }),
    "",
    "tone settings:",
    buildSoulOriginTonePrompt(toneProfile),
    "",
    "calculation seed:",
    safeJsonForPrompt(seed),
    "",
    "llm chapter outline:",
    safeJsonForPrompt(outline),
  ].join("\n");
}

function validateSoulOriginSummary(summary = "") {
  const text = stripForbiddenTokens(summary);
  const errors = [];
  if (text.length < 120) errors.push("summary_short");
  if (text.length > 700) errors.push("summary_long");
  if (hasForbiddenText(text)) errors.push("summary_forbidden");
  return { ok: errors.length === 0, errors, summary: text };
}

function buildSoulOriginStaticSummary({ localSeed = {}, toneProfile = {} } = {}) {
  const seed = buildSoulOriginPromptSeed(localSeed);
  const name = clean(seed?.profile?.name || "의뢰인");
  const dominantElement = clean(seed?.saju?.dominantElement || seed?.saju?.dayMaster || "타고난 기운");
  const mingGong = clean(seed?.ziwei?.mingGong || "명궁");
  const sun = clean(seed?.astrology?.sun || "태양의 자리");
  const nakshatra = clean(seed?.vedic?.nakshatra || "달의 별자리");
  const natalStar = clean(seed?.sukyo?.natalStar || "숙명의 별");
  const direction = clean(toneProfile?.direction || SOUL_ORIGIN_TONE_PRESETS.default.direction);
  return stripForbiddenTokens(
    `${name}님의 운명의 업은 ${dominantElement}, ${mingGong}, ${sun}, ${nakshatra}, ${natalStar}가 서로 맞물리며 드러나는 깊은 반복의 결이다. 이번 상담서는 그 결이 사랑, 일, 돈, 관계의 장면에서 어떻게 되살아나는지 짚고, 오래 끌고 온 선택의 습관을 더 성숙한 방향으로 바꾸는 길을 안내한다. ${direction}의 흐름을 따라 지금 필요한 것은 과거를 부정하는 일이 아니라, 같은 운명을 더 높은 방식으로 쓰는 결단이다.`
  );
}

async function generateSoulOriginSummaryByLLM(env, { localSeed, chapters, toneProfile = {}, requestId = "" }) {
  if (env?.SOUL_ORIGIN_STATIC_SUMMARY_TEMPLATE !== "0") {
    logFlow("StaticSummaryStart", { requestId, stage: "static-template-summary" });
    const summary = buildSoulOriginStaticSummary({ localSeed, toneProfile });
    const validation = validateSoulOriginSummary(summary);
    if (validation.ok) {
      logFlow("StaticSummarySuccess", { requestId, stage: "static-template-summary" });
      return validation.summary;
    }
    logFlow("StaticSummaryFallback", {
      requestId,
      errorCount: Number(validation.errors.length || 0),
      stage: "static-template-summary",
    });
  }
  logFlow("LLMSummaryStart", { requestId, stage: "llm-generation" });
  const prompt = buildSoulOriginSummaryPrompt({ localSeed, chapters, toneProfile });
  const text = await callSoulOriginGemini(env, prompt, {
    metadata: { requestId, stage: "soul-origin-summary" },
  });
  const parsed = extractSoulOriginJsonObject(text);
  const validation = validateSoulOriginSummary(clean(parsed?.summary || ""));
  if (!validation.ok) {
    const err = new Error("운명의 업 LLM 요약 검증에 실패했습니다.");
    err.code = "SOUL_ORIGIN_LLM_SUMMARY_VALIDATION_FAILED";
    err.status = 502;
    err.details = validation;
    err.stage = "llm-generation";
    logFlow("LLMSummaryValidationFailed", {
      requestId,
      errorCode: err.code,
      errorCount: Number(validation.errors.length || 0),
      stage: "llm-generation",
    });
    throw err;
  }
  logFlow("LLMSummarySuccess", { requestId, stage: "llm-generation" });
  return validation.summary;
}

function summarizeSignal(localSeed) {
  const signals = localSeed?.signals || {};
  const front = [
    clean(signals.dayMaster) && `일간 ${clean(signals.dayMaster)}`,
    clean(signals.monthBranch) && `월지 ${clean(signals.monthBranch)}`,
    clean(signals.daewun) && `현재 대운 ${clean(signals.daewun)}`,
    clean(signals.sewoon) && `세운 ${clean(signals.sewoon)}`,
  ].filter(Boolean);

  const base = front.join(" · ");
  if (base) {
    return `${base}을 중심축으로 반복 패턴의 원인과 해방 전략을 통합했습니다.`;
  }
  return "사주 원국과 운의 흐름을 바탕으로 반복 패턴의 원인과 해방 전략을 통합했습니다.";
}

function countRepeatedSentences(chapters = []) {
  const source = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => Array.isArray(chapter?.sections) ? chapter.sections : [])
    .map((section) => stripForbiddenTokens(section?.body || ""))
    .join("\n\n");

  const map = new Map();
  source
    .split(/[.!?\n]+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 30)
    .forEach((line) => map.set(line, Number(map.get(line) || 0) + 1));

  return Array.from(map.values()).filter((count) => count >= 4).length;
}

function validateTopicCoverage(chapter) {
  const req = TOPIC_KEYWORDS[String(chapter?.id || "")] || [];
  if (!req.length) return true;
  const source = (Array.isArray(chapter?.sections) ? chapter.sections : [])
    .map((section) => stripForbiddenTokens(section?.body || ""))
    .join("\n");
  const hit = req.filter((keyword) => source.includes(keyword)).length;
  return hit >= 3;
}

function countRepeatedSectionOpenings(chapters = []) {
  const openings = (Array.isArray(chapters) ? chapters : [])
    .flatMap((chapter) => Array.isArray(chapter?.sections) ? chapter.sections : [])
    .map((section) => String(section?.body || "").split(/\n+/).map((line) => line.trim()).filter(Boolean))
    .map((lines) => {
      const firstText = lines.find((line) => !SECTION_TITLES.includes(line));
      return stripForbiddenTokens(firstText || "").replace(/\s+/g, " ").trim();
    })
    .filter((line) => line.length >= 20);

  const map = new Map();
  openings.forEach((line) => map.set(line, Number(map.get(line) || 0) + 1));
  return Array.from(map.values()).filter((count) => count >= 3).length;
}

function validateFinalManuscript(chapters = []) {
  const list = Array.isArray(chapters) ? chapters : [];
  const errors = [];

  if (list.length !== CHAPTER_BLUEPRINTS.length) {
    errors.push("chapter_count");
  }

  let totalChars = 0;
  list.forEach((chapter, chapterIndex) => {
    const blueprint = CHAPTER_BLUEPRINTS[chapterIndex] || { categories: [] };
    let chapterChars = 0;
    if (clean(chapter?.title) !== clean(blueprint.title)) {
      errors.push(`chapter_${chapterIndex + 1}_title`);
    }

    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    if (sections.length !== blueprint.categories.length) {
      errors.push(`chapter_${chapterIndex + 1}_section_count`);
    }

    sections.forEach((section, sectionIndex) => {
      const expectedTitle = clean(blueprint.categories[sectionIndex] || "");
      const title = clean(section?.title || "");
      const body = stripForbiddenTokens(section?.body || "");

      if (expectedTitle && title !== expectedTitle) {
        errors.push(`chapter_${chapterIndex + 1}_section_${sectionIndex + 1}_title`);
      }
      if (body.length < MIN_CATEGORY_CHARS) {
        errors.push(`chapter_${chapterIndex + 1}_section_${sectionIndex + 1}_short`);
      }
      if (hasForbiddenText(body)) {
        errors.push(`chapter_${chapterIndex + 1}_section_${sectionIndex + 1}_forbidden`);
      }
      SECTION_TITLES.forEach((heading) => {
        if (!body.includes(heading)) {
          errors.push(`chapter_${chapterIndex + 1}_section_${sectionIndex + 1}_heading_missing`);
        }
      });
      if (body.includes("기록해 보세요")) {
        errors.push(`chapter_${chapterIndex + 1}_section_${sectionIndex + 1}_phrase_repeat`);
      }

      chapterChars += body.length;
      totalChars += body.length;
    });

    if (chapterChars < MIN_CHAPTER_CHARS) {
      errors.push(`chapter_${chapterIndex + 1}_total_short`);
    }

    if (!validateTopicCoverage(chapter)) {
      errors.push(`chapter_${chapterIndex + 1}_topic`);
    }
  });

  if (totalChars < MIN_TOTAL_CHARS) {
    errors.push("total_short");
  }

  const repetition = countRepeatedSentences(list);
  if (repetition > 8) {
    errors.push("repetition_high");
  }

  const repeatedOpenings = countRepeatedSectionOpenings(list);
  if (repeatedOpenings > 6) {
    errors.push("section_opening_repetition_high");
  }

  return {
    ok: errors.length === 0,
    errors,
    totalChars,
    repetition,
    repeatedOpenings,
  };
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSoulOriginSectionBody(body = "") {
  return stripForbiddenTokens(body)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (SECTION_TITLES.includes(line)) {
        return `<h5>${escapeHtml(line)}</h5>`;
      }
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");
}

function renderSoulOriginPdf({ birthInput, chapters, summary, generatedAt }) {
  const toc = (Array.isArray(chapters) ? chapters : [])
    .map((chapter) => `<li><strong>${escapeHtml(stripForbiddenTokens(chapter.title))}</strong></li>`)
    .join("\n");

  const chapterHtml = (Array.isArray(chapters) ? chapters : []).map((chapter) => {
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    const sectionHtml = sections.map((section) => `
      <section class="chapter-section">
        <h4>${escapeHtml(stripForbiddenTokens(section.title))}</h4>
        <div class="section-body">${renderSoulOriginSectionBody(section.body)}</div>
      </section>
    `).join("\n");

    return `
      <article class="chapter">
        <h2>${escapeHtml(stripForbiddenTokens(chapter.title))}</h2>
        <p class="chapter-subtitle">${escapeHtml(stripForbiddenTokens(chapter.subtitle || ""))}</p>
        ${sectionHtml}
      </article>
    `;
  }).join("\n");

  const safeName = escapeHtml(stripForbiddenTokens(birthInput?.name || "사용자"));
  const safeBirth = escapeHtml(stripForbiddenTokens(`${birthInput?.birthDate || ""} ${birthInput?.birthTime || ""}`.trim()));
  const safeSummary = escapeHtml(stripForbiddenTokens(summary));

  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>운명의 업 프리미엄 상담서</title>
    <style>
      :root{color-scheme:light}
      *{box-sizing:border-box}
      body{margin:0;padding:0;font-family:"Noto Serif KR",serif;background:linear-gradient(180deg,#fbf7ef 0%,#efe4d2 100%);color:#2a1f17;line-height:1.82}
      .page{max-width:980px;margin:0 auto;padding:26px 20px 60px}
      .cover{padding:30px;border-radius:22px;background:linear-gradient(145deg,#1f160f 0%,#4d3522 58%,#7d5532 100%);color:#fff3e2;box-shadow:0 18px 42px rgba(70,46,24,.2)}
      .cover h1{margin:10px 0 8px;font-size:40px;line-height:1.2}
      .cover p{margin:4px 0;color:#f4dfc5}
      .meta,.toc,.chapter{margin-top:18px;padding:18px;border:1px solid #e4d4bf;border-radius:16px;background:rgba(255,250,244,.95)}
      .meta-grid{display:grid;gap:10px;grid-template-columns:repeat(3,minmax(0,1fr))}
      .meta-item{padding:12px;border:1px solid #ead8c1;border-radius:12px;background:#f7efe3}
      .meta-item b{display:block;color:#5f4129;margin-bottom:4px}
      .toc ol{margin:0;padding-left:20px}
      .toc li{margin:6px 0}
      .chapter{break-inside:avoid-page;page-break-inside:avoid}
      .chapter h2{margin:0 0 10px;font-size:26px;color:#4f3320}
      .chapter-subtitle{margin:0 0 10px;color:#6a4a2f}
      .chapter-section{padding:12px 14px;border:1px solid #e9dbc8;border-radius:12px;background:#fcf7ef;margin:10px 0}
      .chapter-section h4{margin:0 0 8px;color:#5d3d24}
      .section-body{display:flex;flex-direction:column;gap:12px}
      .section-body h5{margin:18px 0 2px;color:#8a5a32;font-size:15px;font-weight:800}
      .section-body p{margin:0;white-space:normal;line-height:1.9;word-break:keep-all;overflow-wrap:break-word}
      .footer{margin-top:18px;padding:14px 16px;text-align:center;font-size:13px;color:#6b4a31}
      @page{size:A4;margin:16mm 14mm 18mm}
      @media print{body{background:#fff}.page{padding:0}.chapter{break-before:page;page-break-before:always}.chapter:first-of-type{break-before:auto;page-break-before:auto}}
      @media (max-width:720px){.meta-grid{grid-template-columns:1fr}.cover h1{font-size:32px}}
    </style>
  </head>
  <body>
    <main class="page">
      <section class="cover">
        <p>Code:Destiny Premium PDF</p>
        <h1>운명의 업 프리미엄 상담서</h1>
        <p>반복 패턴 이해와 해방 전략</p>
        <p>${safeName}</p>
        <p>${safeBirth}</p>
      </section>

      <section class="meta">
        <div class="meta-grid">
          <div class="meta-item"><b>생성일</b>${escapeHtml(stripForbiddenTokens(new Date(generatedAt).toLocaleString("ko-KR")))}</div>
          <div class="meta-item"><b>구성</b>12챕터 운명의 업 상담 구조</div>
          <div class="meta-item"><b>핵심 요약</b>${safeSummary}</div>
        </div>
      </section>

      <section class="toc">
        <h2 style="margin-top:0;">목차</h2>
        <ol>${toc}</ol>
      </section>

      ${chapterHtml}

      <section class="footer">이 문서는 반복되는 삶의 패턴을 이해하고 해방 전략을 실천하기 위한 운명의 업 프리미엄 상담서입니다.</section>
    </main>
  </body>
  </html>`;
}

function validateSoulOriginPdfCompletionPayload({ pdfReady = {}, chapters = [], summary = "", requireDownloadUrl = false } = {}) {
  const issues = [];
  const manuscript = validateFinalManuscript(chapters);
  if (!manuscript.ok) issues.push(...manuscript.errors.map((issue) => `manuscript.${issue}`));

  const summaryValidation = validateSoulOriginSummary(summary);
  if (!summaryValidation.ok) issues.push(...summaryValidation.errors.map((issue) => `summary.${issue}`));

  const html = clean(pdfReady?.html);
  if (!html) issues.push("html.missing");
  if (html && !/<!doctype html>/i.test(html)) issues.push("html.doctype");
  if (html && !/<meta\s+charset=["']?UTF-8["']?/i.test(html)) issues.push("html.charset");

  const downloadUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);
  if (requireDownloadUrl && !downloadUrl) issues.push("download_url.missing");

  const manuscriptText = [
    summary,
    ...((Array.isArray(chapters) ? chapters : []).flatMap((chapter) => [
      chapter?.title,
      chapter?.subtitle,
      ...((Array.isArray(chapter?.sections) ? chapter.sections : []).flatMap((section) => [section?.title, section?.body])),
    ])),
  ].join("\n");
  if (hasSoulOriginBrokenText(`${html}\n${manuscriptText}`)) issues.push("text.broken");

  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
    chapterCount: Array.isArray(chapters) ? chapters.length : 0,
    expectedChapterCount: CHAPTER_BLUEPRINTS.length,
    totalLength: manuscript.totalChars,
    htmlLength: html.length,
    hasDownloadUrl: Boolean(downloadUrl),
    manuscript,
    summary: summaryValidation,
  };
}

function buildArchiveUrl(request, reportId) {
  const requestUrl = new URL(request.url);
  return `${requestUrl.origin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
}

function makeReportId() {
  return `soul-origin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPremiumAccessToken(request, body = {}) {
  return clean(
    request.headers.get("x-premium-access-token")
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || body?.accessToken
    || body?.token
    || body?.accessGrant?.premiumAccessToken
    || body?.accessGrant?.accessToken
    || body?.payment?.premiumAccessToken
    || body?._paymentContext?.premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || cookieValue(request, "cd_premium_access_token")
    || "",
  );
}

async function handlePrepare(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        code: "UNAUTHORIZED",
        message: "로그인 후 운명의 업 PDF를 생성할 수 있습니다.",
      }, { status: 401 });
    }
    throw error;
  }

  const body = await readJson(request);
  const requestId = clean(body?.requestId || body?._paymentContext?.requestId || body?.payment?.requestId || "");
  const normalizedBirth = normalizeBirthInput(body?.birthInput || body?.input || {});

  if (!normalizedBirth.ok) {
    return json({ ok: false, code: normalizedBirth.code, message: normalizedBirth.message }, { status: normalizedBirth.code === "BIRTH_TIME_REQUIRED" ? 422 : 400 });
  }

  const birthInput = normalizedBirth.input;
  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || makeReportId());
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || `soul-origin:${auth.userId}:${birthInput.birthDate}:${birthInput.birthTime}`);

  const existingLock = SESSION_LOCKS.get(sessionId);
  if (existingLock?.status === "running") {
    return json({
      ok: true,
      status: "running",
      serverStatus: "running",
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      reportId: clean(existingLock.reportId || reportId),
      sessionId,
      chapterCount: CHAPTER_BLUEPRINTS.length,
      startedAt: existingLock.startedAt,
      data: {
        reportId: clean(existingLock.reportId || reportId),
        sessionId,
        status: "running",
        startedAt: existingLock.startedAt,
      },
    });
  }
  if (existingLock?.status === "done" && existingLock.result) {
    return json(existingLock.result);
  }

  SESSION_LOCKS.set(sessionId, {
    sessionId,
    reportId,
    requestId,
    status: "running",
    startedAt: new Date().toISOString(),
  });

  const premiumAccessToken = getPremiumAccessToken(request, body);

  try {
    logFlow("ProductLookupStart", { requestId, sessionId, reportId });

    const featureKey = clean(body?.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY;
    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, SOUL_ORIGIN_REPORT_TYPE, {
      ...body,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
      archiveReportType: SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
      reportTypeAliases: SOUL_ORIGIN_REPORT_TYPE_ALIASES,
      featureKey,
      featureAliases: SOUL_ORIGIN_FEATURE_ALIASES,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/soul-origin",
    });

    if (!access?.ok) {
      SESSION_LOCKS.delete(sessionId);
      const status = Number(access?.status || 402);
      const hasSessionId = Boolean(clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId));
      const hasPurchaseId = Boolean(clean(body?.purchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId));
      const hasRequestId = Boolean(clean(body?.requestId || body?.accessGrant?.requestId || body?.payment?.requestId || body?._paymentContext?.requestId));
      const hasPaymentToken = Boolean(premiumAccessToken);
      const paymentConfirmedButMissing = status === 402 && (hasSessionId || hasPurchaseId || hasRequestId || hasPaymentToken);
      const accessCode = clean(access?.code || "PAYMENT_REQUIRED").toUpperCase();
      const isCoinShortage = status === 402 && /(INSUFFICIENT|SHORTAGE|POINT|COIN)/.test(accessCode);

      const message = status === 401
        ? "로그인 후 운명의 업 PDF를 생성할 수 있습니다."
        : paymentConfirmedButMissing
          ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
          : isCoinShortage
            ? "운명의 업 PDF 생성을 위해 코인이 필요합니다."
            : status === 402
              ? "프리미엄 PDF 생성 권한이 필요합니다."
            : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

      return json({
        ok: false,
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : (access?.code || "PAYMENT_REQUIRED"),
        message,
        debugSafe: {
          featureKey,
          hasSessionId,
          hasPurchaseId,
          hasRequestId,
          hasPaymentToken,
        },
      }, { status });
    }

    logFlow("CoinGateSuccess", { requestId, sessionId, reportId });

    const executionCtx = buildPremiumExecutionContext({
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });

    await startPremiumPdfExecution(env, auth.userId, executionCtx);
    logFlow("SessionCreateStart", { requestId, sessionId, reportId });

    logFlow("LocalCalcStart", { requestId, sessionId, reportId });
    const localSeed = await buildSoulOriginLocalSeed(env, birthInput);
    logFlow("LocalCalcSuccess", { requestId, sessionId, reportId });
    const localChapters = buildSoulOriginLocalChapters(localSeed, { requestId });

    const toneProfile = buildSoulOriginToneProfile({
      tonePreset: clean(body?.tonePreset ?? body?.tone?.preset ?? body?.tone?.tonePreset),
      toneIntensity: clean(body?.toneIntensity ?? body?.tone?.intensity ?? body?.tone?.toneLevel),
      toneWeights: body?.toneWeights || body?.tone?.weights || body?.toneProfile?.weights,
    });

    logFlow("LocalAssembledManuscriptReady", { requestId, sessionId, reportId, stage: "local-assembled" });
    const chapters = localChapters.map((chapter) => ({
      ...chapter,
      source: SOUL_ORIGIN_PDF_CONFIG.generationMode,
      localAuthoringSource: "local-calculation",
      llmEnhancementUsed: false,
      llmEnhancementStatus: "not-requested",
    }));
    const llmEnhancementErrorCode = "";
    const llmEnhancedChapterCount = 0;
    const fallbackChapterCount = 0;
    const fallbackUsed = false;
    const llmEnhancementUsed = false;
    const manuscriptSource = SOUL_ORIGIN_PDF_CONFIG.generationMode;
    const chapterAuthoringSource = SOUL_ORIGIN_PDF_CONFIG.generationMode;
    logFlow("LocalAssembledManuscriptSuccess", {
      requestId,
      sessionId,
      reportId,
      stage: "local-assembled",
      chapterCount: Number(chapters.length || 0),
    });

    const summary = summarizeSignal(localSeed);
    const generatedAt = new Date().toISOString();

    logFlow("PDFCreateStart", { requestId, sessionId, reportId });
    const archiveUrl = buildArchiveUrl(request, reportId);
    const archivePdfUrl = `${archiveUrl}?format=pdf`;
    const archiveHtmlUrl = `${archiveUrl}?format=html`;
    const pdfHtml = renderSoulOriginPdf({ birthInput, chapters, summary, generatedAt });
    const pdfReady = {
      html: pdfHtml,
      mimeType: "application/pdf",
      contentType: "application/pdf",
      renderFormat: "pdf-archive",
      pdfUrl: archivePdfUrl,
      htmlUrl: archiveHtmlUrl,
      downloadUrl: archivePdfUrl,
      storageKey: `premium-archive:soul-origin:${reportId}`,
    };

    if (!clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl)) {
      const err = new Error("운명의 업 리포트 저장 URL을 생성하지 못했습니다.");
      err.code = "SOUL_ORIGIN_ARCHIVE_URL_MISSING";
      err.status = 500;
      throw err;
    }
    const pdfCompletionValidation = validateSoulOriginPdfCompletionPayload({
      pdfReady,
      chapters,
      summary,
      requireDownloadUrl: true,
    });
    if (!pdfCompletionValidation.ok) {
      const err = new Error("운명의 업 PDF 완료 검증에 실패했습니다.");
      err.code = "SOUL_ORIGIN_PDF_COMPLETION_VALIDATION_FAILED";
      err.status = 500;
      err.issues = pdfCompletionValidation.issues;
      throw err;
    }
    pdfReady.pdfCompletionValidation = pdfCompletionValidation;

    const responseBody = {
      ok: true,
      status: "completed",
      serverStatus: "completed",
      qualityStatus: "passed",
      manuscriptSource,
      chapterAuthoringSource,
      summarySource: SOUL_ORIGIN_PDF_CONFIG.generationMode,
      generationMode: SOUL_ORIGIN_PDF_CONFIG.generationMode,
      provider: SOUL_ORIGIN_PDF_CONFIG.provider,
      writingPipeline: "local-calculation-to-local-assembled-pdf",
      fallbackUsed,
      fallbackChapterCount,
      localAuthoringUsed: true,
      llmEnhancementUsed,
      llmEnhancedChapterCount,
      llmChapterCount: 0,
      expectedLlmChapterCount: 0,
      llmEnhancementErrorCode: llmEnhancementErrorCode || undefined,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      featureKey,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
      archiveReportType: SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
      chapterCount: CHAPTER_BLUEPRINTS.length,
      reportId,
      sessionId,
      title: SOUL_ORIGIN_TITLE,
      summary,
      birthInput,
      chapters,
      toneProfile: {
        preset: toneProfile.preset,
        presetLabel: toneProfile.presetLabel,
        intensity: toneProfile.intensity,
        weights: toneProfile.weights,
      },
      pdfReady,
      pdfCompletionValidation,
      downloadUrl: clean(pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
      pdfUrl: clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
      htmlUrl: clean(pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
      canReopen: true,
      canDownload: true,
      createdAt: generatedAt,
    };

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      manuscriptSource,
      chapterAuthoringSource,
      summarySource: SOUL_ORIGIN_PDF_CONFIG.generationMode,
      generationMode: SOUL_ORIGIN_PDF_CONFIG.generationMode,
      provider: SOUL_ORIGIN_PDF_CONFIG.provider,
      writingPipeline: "local-calculation-to-local-assembled-pdf",
      chapterCount: chapters.length,
      fallbackUsed,
      fallbackChapterCount,
      localAuthoringUsed: true,
      llmEnhancementUsed,
      llmEnhancedChapterCount,
      llmChapterCount: 0,
      expectedLlmChapterCount: 0,
      llmEnhancementErrorCode: llmEnhancementErrorCode || undefined,
      pdfCompletionValidation,
      archive: {
        reportId,
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
        archiveReportType: SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
        qualityStatus: "passed",
        manuscriptSource,
        chapterAuthoringSource,
        summarySource: SOUL_ORIGIN_PDF_CONFIG.generationMode,
        generationMode: SOUL_ORIGIN_PDF_CONFIG.generationMode,
        provider: SOUL_ORIGIN_PDF_CONFIG.provider,
        writingPipeline: "local-calculation-to-local-assembled-pdf",
        fallbackUsed,
        fallbackChapterCount,
        localAuthoringUsed: true,
        llmEnhancementUsed,
        llmEnhancedChapterCount,
        llmChapterCount: 0,
        expectedLlmChapterCount: 0,
        llmEnhancementErrorCode: llmEnhancementErrorCode || undefined,
        displayName: SOUL_ORIGIN_DISPLAY_NAME,
        title: SOUL_ORIGIN_TITLE,
        summary,
        mode: "personal",
        birthName: clean(birthInput.name),
        chapterCount: CHAPTER_BLUEPRINTS.length,
        chapters,
        localSeed,
        pdfReady,
        pdfCompletionValidation,
        toneProfile: {
          preset: toneProfile.preset,
          presetLabel: toneProfile.presetLabel,
          intensity: toneProfile.intensity,
          weights: toneProfile.weights,
        },
        downloadUrl: clean(pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
        pdfUrl: clean(pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
        htmlUrl: clean(pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
        canReopen: true,
        canDownload: true,
      },
    });

    REPORT_CACHE.set(reportId, {
      reportId,
      userId: auth.userId,
      payload: responseBody,
    });

    SESSION_LOCKS.set(sessionId, {
      sessionId,
      reportId,
      requestId,
      status: "done",
      startedAt: existingLock?.startedAt || new Date().toISOString(),
      result: responseBody,
    });

    logFlow("PDFCreateSuccess", { requestId, sessionId, reportId });
    return json(responseBody);
  } catch (error) {
    const executionCtx = buildPremiumExecutionContext({
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      userId: auth.userId,
      featureKey: clean(body?.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY,
      sessionId,
      reportId,
      access: null,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });

    logFlow("Failed", {
      requestId,
      sessionId,
      reportId,
      errorCode: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
    });

    try {
      await failPremiumPdfExecution(
        env,
        auth.userId,
        executionCtx,
        clean(error?.code || "soul_origin_generation_failed"),
        clean(error?.message || "운명의 업 리포트 생성 중 오류가 발생했습니다."),
        "soul-origin-generation",
      );
    } catch (failError) {
      logFlow("FailExecutionError", {
        requestId,
        sessionId,
        reportId,
        errorCode: clean(failError?.code || "SOUL_ORIGIN_FAIL_EXECUTION_ERROR"),
      });
    }

    SESSION_LOCKS.set(sessionId, {
      sessionId,
      reportId,
      requestId,
      status: "failed",
      code: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
      message: clean(error?.message || "운명의 업 PDF 생성 중 문제가 발생했습니다."),
      httpStatus: Number(error?.status || 500),
      startedAt: new Date().toISOString(),
      error: normalizeError(error),
    });

    const rawMessage = clean(error?.message || "운명의 업 리포트 생성 중 오류가 발생했습니다.");
    const userMessage = rawMessage.includes("생년월일") || rawMessage.includes("출생")
      ? "생년월일시 정보를 확인할 수 없습니다. 정확한 생년월일시를 입력해 주세요."
      : rawMessage.includes("품질") || rawMessage.includes("원고")
        ? "생성된 상담서가 품질 기준에 맞지 않아 완료하지 못했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요."
        : "운명의 업 상담서 생성 중 문제가 발생했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요.";

    return json({
      ok: false,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      code: clean(error?.code || "SOUL_ORIGIN_GENERATION_FAILED"),
      message: userMessage,
      debugSafe: {
        reportId,
        sessionId,
        stage: error?.code?.includes("LLM") ? "llm-generation" : "soul-origin-generation",
        manuscriptSource: SOUL_ORIGIN_PDF_CONFIG.generationMode,
      },
    }, { status: Number(error?.status || 500) });
  }
}

async function loadSoulOriginReportPayload(env, auth, reportId) {
  const cached = REPORT_CACHE.get(reportId);
  if (cached && cached.userId === auth.userId) {
    return { ok: true, payload: cached.payload };
  }

  await connectDb(env);
  const archived = await ServiceExecutionTransaction.findOne({
    userId: auth.userId,
    reportId,
    status: "success",
    premiumStatus: "completed",
  })
    .sort({ completedAt: -1, updatedAt: -1 })
    .lean();

  const archive = archived?.metadata?.archive && typeof archived.metadata.archive === "object"
    ? archived.metadata.archive
    : null;

  if (!archive) {
    return { ok: false, status: 404, code: "REPORT_NOT_FOUND", message: "요청한 운명의 업 리포트를 찾을 수 없습니다." };
  }

  const pdfReady = archive?.pdfReady && typeof archive.pdfReady === "object" ? archive.pdfReady : {};
  const payload = {
    ok: true,
    status: "completed",
    serverStatus: "completed",
    qualityStatus: clean(archive.qualityStatus || "passed") || "passed",
    manuscriptSource: clean(archive.manuscriptSource || SOUL_ORIGIN_PDF_CONFIG.generationMode) || SOUL_ORIGIN_PDF_CONFIG.generationMode,
    chapterAuthoringSource: clean(archive.chapterAuthoringSource || SOUL_ORIGIN_PDF_CONFIG.generationMode) || SOUL_ORIGIN_PDF_CONFIG.generationMode,
    summarySource: clean(archive.summarySource || SOUL_ORIGIN_PDF_CONFIG.generationMode) || SOUL_ORIGIN_PDF_CONFIG.generationMode,
    generationMode: clean(archive.generationMode || SOUL_ORIGIN_PDF_CONFIG.generationMode) || SOUL_ORIGIN_PDF_CONFIG.generationMode,
    provider: clean(archive.provider || SOUL_ORIGIN_PDF_CONFIG.provider) || SOUL_ORIGIN_PDF_CONFIG.provider,
    writingPipeline: clean(archive.writingPipeline || "local-calculation-to-local-assembled-pdf") || "local-calculation-to-local-assembled-pdf",
    fallbackUsed: Boolean(archive.fallbackUsed === true),
    fallbackChapterCount: Number(archive.fallbackChapterCount || 0),
    localAuthoringUsed: Boolean(archive.localAuthoringUsed === true),
    llmEnhancementUsed: Boolean(archive.llmEnhancementUsed === true),
    llmEnhancedChapterCount: Number(archive.llmEnhancedChapterCount || 0),
    llmChapterCount: Number(archive.llmChapterCount || 0),
    expectedLlmChapterCount: Number(archive.expectedLlmChapterCount || 0),
    llmEnhancementErrorCode: clean(archive.llmEnhancementErrorCode || "") || undefined,
    serviceKey: SOUL_ORIGIN_SERVICE_KEY,
    featureKey: clean(archive.featureKey || SOUL_ORIGIN_FEATURE_KEY) || SOUL_ORIGIN_FEATURE_KEY,
    reportType: SOUL_ORIGIN_REPORT_TYPE,
    canonicalReportType: SOUL_ORIGIN_REPORT_TYPE,
    archiveReportType: clean(archive.archiveReportType || SOUL_ORIGIN_ARCHIVE_REPORT_TYPE) || SOUL_ORIGIN_ARCHIVE_REPORT_TYPE,
    chapterCount: Number(archive.chapterCount || (Array.isArray(archive.chapters) ? archive.chapters.length : 0)),
    reportId: clean(archive.reportId || reportId),
    sessionId: clean(archived?.sessionId || "") || undefined,
    title: clean(archive.title || SOUL_ORIGIN_TITLE) || SOUL_ORIGIN_TITLE,
    summary: clean(archive.summary || ""),
    chapters: Array.isArray(archive.chapters) ? archive.chapters : [],
    toneProfile: archive?.toneProfile && typeof archive.toneProfile === "object" ? archive.toneProfile : undefined,
    pdfReady,
    pdfCompletionValidation: archive.pdfCompletionValidation || pdfReady.pdfCompletionValidation || null,
    downloadUrl: clean(archive.downloadUrl || pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
    pdfUrl: clean(archive.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
    htmlUrl: clean(archive.htmlUrl || pdfReady.htmlUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
    canReopen: true,
    canDownload: Boolean(clean(archive.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl)),
    createdAt: toIso(archived?.createdAt) || new Date().toISOString(),
  };

  REPORT_CACHE.set(reportId, {
    reportId,
    userId: auth.userId,
    payload,
  });

  return { ok: true, payload };
}

async function handleReadReport(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const reportId = clean(url.searchParams.get("reportId"));

  if (!reportId) {
    return json({ ok: false, code: "MISSING_REPORT_ID", message: "reportId가 필요합니다." }, { status: 400 });
  }

  const loaded = await loadSoulOriginReportPayload(env, auth, reportId);
  if (!loaded.ok) {
    return json({ ok: false, code: loaded.code, message: loaded.message }, { status: Number(loaded.status || 404) });
  }
  return json(loaded.payload);
}

async function handleStatus(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({
        ok: false,
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        code: "UNAUTHORIZED",
        message: "로그인 후 운명의 업 PDF 생성 상태를 확인할 수 있습니다.",
      }, { status: 401 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const reportId = clean(url.searchParams.get("reportId"));
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId"));
  const executionKey = clean(url.searchParams.get("executionKey") || url.searchParams.get("requestId"));

  if (!reportId && !sessionId && !executionKey) {
    return json({
      ok: false,
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      code: "MISSING_STATUS_LOOKUP_KEY",
      message: "reportId, sessionId 또는 executionKey가 필요합니다.",
    }, { status: 400 });
  }

  if (sessionId) {
    const lock = SESSION_LOCKS.get(sessionId);
    if (lock?.status === "done" && lock.result) {
      return json(lock.result);
    }
    if (lock?.status === "running") {
      return json({
        ok: true,
        status: "running",
        serverStatus: "running",
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        reportId: clean(lock.reportId || reportId),
        sessionId,
        chapterCount: CHAPTER_BLUEPRINTS.length,
        startedAt: lock.startedAt,
      });
    }
    if (lock?.status === "failed") {
      return json({
        ok: false,
        status: "failed",
        serverStatus: "failed",
        serviceKey: SOUL_ORIGIN_SERVICE_KEY,
        reportType: SOUL_ORIGIN_REPORT_TYPE,
        reportId: clean(lock.reportId || reportId),
        sessionId,
        code: clean(lock.code || "SOUL_ORIGIN_GENERATION_FAILED"),
        message: clean(lock.message || "운명의 업 PDF 생성 중 문제가 발생했습니다."),
      }, { status: Number(lock.httpStatus || 500) });
    }
  }

  if (reportId) {
    const loaded = await loadSoulOriginReportPayload(env, auth, reportId);
    if (loaded.ok) return json(loaded.payload);
  }

  const executionResult = await getServiceExecution(env, auth.userId, {
    executionKey,
    sessionId,
    reportId,
  });

  if (!executionResult?.ok) {
    return json({
      ok: false,
      status: "not_found",
      serverStatus: "not_found",
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      reportId,
      sessionId,
      code: "SOUL_ORIGIN_EXECUTION_NOT_FOUND",
      message: "운명의 업 PDF 생성 상태를 찾지 못했습니다.",
    }, { status: Number(executionResult?.status || 404) });
  }

  const execution = executionResult.execution || {};
  const finalReportId = clean(execution.reportId || reportId);
  const finalSessionId = clean(execution.sessionId || sessionId);
  const executionStatus = clean(execution.status).toLowerCase();
  const premiumStatus = clean(execution.premiumStatus).toLowerCase();

  if ((executionStatus === "success" || premiumStatus === "completed") && finalReportId) {
    const loaded = await loadSoulOriginReportPayload(env, auth, finalReportId);
    if (loaded.ok) return json(loaded.payload);
    return json({
      ok: true,
      status: "completed",
      serverStatus: "completed",
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      reportId: finalReportId,
      sessionId: finalSessionId,
      chapterCount: CHAPTER_BLUEPRINTS.length,
      code: loaded.code || "SOUL_ORIGIN_REPORT_ARCHIVE_PENDING",
      message: loaded.message || "PDF 결과 저장을 확인하는 중입니다.",
    });
  }

  if (executionStatus === "failed" || premiumStatus === "failed" || premiumStatus === "abandoned" || premiumStatus === "refunded" || premiumStatus === "refund_failed") {
    return json({
      ok: false,
      status: "failed",
      serverStatus: "failed",
      serviceKey: SOUL_ORIGIN_SERVICE_KEY,
      reportType: SOUL_ORIGIN_REPORT_TYPE,
      reportId: finalReportId,
      sessionId: finalSessionId,
      execution,
      code: clean(execution.reasonCode || "SOUL_ORIGIN_GENERATION_FAILED"),
      message: clean(execution.reasonMessage || "운명의 업 PDF 생성 중 문제가 발생했습니다."),
    }, { status: 500 });
  }

  return json({
    ok: true,
    status: "running",
    serverStatus: "running",
    serviceKey: SOUL_ORIGIN_SERVICE_KEY,
    reportType: SOUL_ORIGIN_REPORT_TYPE,
    reportId: finalReportId,
    sessionId: finalSessionId,
    chapterCount: CHAPTER_BLUEPRINTS.length,
    execution,
  });
}

export async function handleSoulOriginRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/soul-origin");

    if (path === "" || path === "/") {
      if (method !== "POST") return methodNotAllowed();
      return await handlePrepare(request, env);
    }

    if (path === "/report") {
      if (method !== "GET") return methodNotAllowed();
      return await handleReadReport(request, env);
    }

    if (path === "/status") {
      if (method !== "GET") return methodNotAllowed();
      return await handleStatus(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[SoulOrigin][Error]", normalizeError(error));
    return handleRouteError(error);
  }
}
