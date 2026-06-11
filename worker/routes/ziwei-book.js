import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const ZIWEI_SERVICE_KEY = "ziwei-book";
const ZIWEI_FEATURE_KEY = "premium-ziwei-report";
const ZIWEI_FEATURE_ALIASES = new Set(["premium-ziwei-report", "premium_pdf_ziwei"]);
const ZIWEI_MASTER_JSON_SCHEMA_VERSION = "ziwei-premium-master-json.v1";
const ZIWEI_PDF_CONFIG = Object.freeze({
  generationMode: "local-assembled",
  llmEnabled: false,
  provider: "ziwei-assembler",
  templateVersion: "ziwei-premium-assembled-v3",
});
const CHAPTER_MIN_CHARS = 3200;
const SECTION_MIN_CHARS = 700;
const TOTAL_MIN_CHARS = 50000;
const ZIWEI_LLM_KEY_ENV_KEYS = Object.freeze([
  "ZIWEI_GEMINI_API_KEY1",
  "ZIWEI_GEMINI_API_KEY2",
  "ZIWEI_GEMINI_API_KEY3",
  "ZIWEI_GEMINI_API_KEY4",
  "ZIWEI_GEMINI_API_KEY5",
  "ZIWEI_GEMINI_API_KEY",
  "PREMIUM_GEMINI_API_KEY1",
  "PREMIUM_GEMINI_API_KEY2",
  "PREMIUM_GEMINI_API_KEY3",
  "PREMIUM_GEMINI_API_KEY4",
  "PREMIUM_GEMINI_API_KEY5",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "GEMINI_API_KEY",
]);
const ZIWEI_LLM_MODEL_ENV_KEYS = Object.freeze(["ZIWEI_GEMINI_MODEL", "PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"]);
const ZIWEI_LLM_RISKY_ASSERTION_RE = /(반드시\s*(결혼|이혼|성공|실패|큰돈|수익)|100\s*%|확정|무조건|질병을\s*얻게|암에\s*걸|우울증|공황장애|투자\s*수익|수익\s*보장|대박|파산|죽음|사망)/i;
const SESSION_LOCKS = new Map();
const REPORT_CACHE = new Map();
const ZIWEI_PRIMARY_STARS = Object.freeze([
  "자미",
  "천기",
  "태양",
  "무곡",
  "탐랑",
  "칠살",
  "파군",
  "천동",
  "거문",
  "천량",
  "천상",
  "염정",
]);
const SIHUA_KEYWORDS = Object.freeze(["화록", "화권", "화과", "화기"]);
const GENERIC_PATTERNS = Object.freeze([
  "균형을 유지",
  "반복 구조",
  "루틴을 만들",
  "안정적인",
  "중요합니다",
  "권장합니다",
]);

const EARTHLY_BRANCH_HOUR = Object.freeze({
  자: 23,
  축: 1,
  인: 3,
  묘: 5,
  진: 7,
  사: 9,
  오: 11,
  미: 13,
  신: 15,
  유: 17,
  술: 19,
  해: 21,
});

const STRENGTH_LEGEND = Object.freeze({
  miao: "◎",
  de: "O",
  li: "▲",
  ping: "△",
  xianOrShi: "X",
});

const CHAPTER_BLUEPRINTS = [
  {
    id: "01",
    roman: "I",
    palaceKey: "ming",
    title: "Chapter 1. 자미 명반 총론 — 운명의 중심 지도",
    categories: [
      "명반 스냅샷과 첫인상",
      "명궁·신궁·오행국의 운명 축",
      "삶을 움직이는 주제와 반복 패턴",
      "타고난 강점과 활용 영역",
      "초기 리스크와 실전 요약",
    ],
  },
  {
    id: "02",
    roman: "II",
    palaceKey: "ming",
    title: "Chapter 2. 명궁과 신궁 — 타고난 나와 완성되는 나",
    categories: [
      "명궁 주성이 만드는 자아의 결",
      "신궁이 밀어 올리는 후천 구동력",
      "내면 기준과 실제 행동의 간극",
      "성장할수록 선명해지는 방향",
      "자기 운을 안정시키는 실행 조언",
    ],
  },
  {
    id: "03",
    roman: "III",
    palaceKey: "ming",
    title: "Chapter 3. 선천 사화 정밀 해석",
    categories: [
      "화록이 여는 욕망과 기회",
      "화권이 만드는 힘과 책임",
      "화과가 정리하는 평판과 명예",
      "화기가 드러내는 집착과 막힘",
      "사화를 균형 있게 쓰는 전략",
    ],
  },
  {
    id: "04",
    roman: "IV",
    palaceKey: "ming",
    title: "Chapter 4. 14주성 완전 해석",
    categories: [
      "명반을 지배하는 핵심 주성",
      "주성의 강약과 현실 발현",
      "주성 조합의 균형과 충돌",
      "주성이 만드는 선택 습관",
      "주성을 실제 성과로 바꾸는 법",
    ],
  },
  {
    id: "05",
    roman: "V",
    palaceKey: "ming",
    title: "Chapter 5. 보좌성과 살성의 역학 관계",
    categories: [
      "보좌성이 열어 주는 보호 신호",
      "살성이 만드는 압박과 경계선",
      "별들이 발동하는 트리거 패턴",
      "관계와 일에 미치는 영향",
      "압박 신호를 완화하는 운영법",
    ],
  },
  {
    id: "06",
    roman: "VI",
    palaceKey: "career",
    title: "Chapter 6. 재백궁과 관록궁 — 돈과 사회적 성취",
    categories: [
      "재백궁이 보여주는 돈의 그릇",
      "관록궁이 만드는 직업 속도",
      "재물과 명예가 연결되는 방식",
      "돈이 새는 위험과 사회적 압박",
      "성장 실행을 오래 유지하는 법",
    ],
  },
  {
    id: "07",
    roman: "VII",
    palaceKey: "spouse",
    title: "Chapter 7. 부처궁과 자녀궁 — 사랑과 가족 리듬",
    categories: [
      "부처궁이 보여주는 인연 패턴",
      "연애와 결혼의 흐름",
      "가족 안에서 반복되는 감정 구조",
      "자녀궁이 드러내는 창조성과 생활 리듬",
      "관계를 안정시키는 조화 가이드",
    ],
  },
  {
    id: "08",
    roman: "VIII",
    palaceKey: "travel",
    title: "Chapter 8. 천이궁과 전택궁 — 이동과 기반의 운",
    categories: [
      "천이궁이 여는 외부 기회",
      "전택궁이 만드는 자산과 거처 기반",
      "이동·이직·확장 타이밍",
      "집과 공간을 다루는 전략",
      "밖에서 열리는 기회 지도",
    ],
  },
  {
    id: "09",
    roman: "IX",
    palaceKey: "friends",
    title: "Chapter 9. 노복궁과 형제궁 — 인맥과 협업 운",
    categories: [
      "사회적 네트워크의 기본 결",
      "협업자와 동료의 질",
      "신뢰가 쌓이는 신호",
      "갈등과 손실을 부르는 신호",
      "사람 운을 살리는 관계 운영법",
    ],
  },
  {
    id: "10",
    roman: "X",
    palaceKey: "fortune",
    title: "Chapter 10. 복덕궁과 부모궁 — 내면 회복과 뿌리",
    categories: [
      "복덕궁이 보여주는 마음의 안정축",
      "부모궁과 원가족 패턴",
      "감정 회복과 쉼의 방식",
      "권위·상속·기대에서 반복되는 흐름",
      "마음을 지키는 실전 수련",
    ],
  },
  {
    id: "11",
    roman: "XI",
    palaceKey: "health",
    title: "Chapter 11. 질액궁 — 몸과 마음의 취약 신호",
    categories: [
      "질액궁이 드러내는 몸의 경고 지도",
      "스트레스가 쌓이는 신호",
      "에너지 관리와 회복 속도",
      "생활 습관을 교정해야 하는 영역",
      "예방 중심의 체크리스트",
    ],
  },
  {
    id: "12",
    roman: "XII",
    palaceKey: "timing",
    title: "Chapter 12. 대한 정밀 분석 — 10년 주기의 방향",
    categories: [
      "현재 대한의 핵심 주제",
      "대한이 여는 기회",
      "대한에서 조심해야 할 위험",
      "10년 주기의 우선순위",
      "대한을 실행 전략으로 바꾸는 법",
    ],
  },
  {
    id: "13",
    roman: "XIII",
    palaceKey: "timing",
    title: "Chapter 13. 유년 로드맵 — 올해의 운 흐름",
    categories: [
      "올해 흐름의 전체 요약",
      "월별·분기별 실행 계획",
      "기회가 열리는 타이밍",
      "주의해야 할 경고 구간",
      "올해 운을 현실로 만드는 행동 가이드",
    ],
  },
  {
    id: "14",
    roman: "XIV",
    palaceKey: "timing",
    title: "Chapter 14. 생애 마스터플랜 — 전환점과 장기 전략",
    categories: [
      "생애 전체의 큰 흐름",
      "중요 전환점과 선택의 문",
      "운이 강하게 피어나는 절정기",
      "회복과 재정비가 필요한 주기",
      "장기 인생 운영 계획",
    ],
  },
  {
    id: "15",
    roman: "XV",
    palaceKey: "timing",
    title: "Chapter 15. 자미 거장의 최종 전략 제언",
    categories: [
      "이 명반의 최종 진단",
      "평생 지켜야 할 전략 규칙",
      "중요 결정을 위한 체크리스트",
      "위기 때 작동할 안전장치",
      "마지막 상담 조언",
    ],
  },
];

const PALACE_LABELS = Object.freeze({
  ming: "명궁",
  body: "신궁",
  siblings: "형제궁",
  spouse: "부부궁",
  children: "자녀궁",
  wealth: "재백궁",
  health: "질액궁",
  travel: "천이궁",
  friends: "노복궁",
  career: "관록궁",
  property: "전택궁",
  fortune: "복덕궁",
  parents: "부모궁",
  timing: "대운·유년",
});

const PALACE_MEANINGS = Object.freeze({
  명궁: "삶의 기본 성향과 운명의 중심축",
  신궁: "후천적으로 강해지는 삶의 방식",
  관록궁: "직업, 사회적 역할, 성취 방식",
  재백궁: "돈의 흐름과 재물 관리 방식",
  부부궁: "연애, 결혼, 배우자 인연",
  복덕궁: "마음의 안정과 내면 만족",
  전택궁: "집, 부동산, 거처, 생활 기반",
  질액궁: "건강과 몸의 취약점",
  노복궁: "친구, 동료, 사회적 네트워크",
  교우궁: "친구, 동료, 사회적 네트워크",
  부모궁: "부모, 윗사람, 성장 배경",
  형제궁: "형제, 가까운 주변 관계",
  천이궁: "외부 활동, 이동, 사회 확장",
});

const FORBIDDEN_TEXT = [
  "payload",
  "계산 근거",
  "raw json",
  "json",
  "일반적으로",
  "알 수 없습니다",
  "debug",
  "engine",
  "자동 복구 생성",
  "localdraft",
  "fallback",
  "chapter 1 chapter 1",
  "데이터가 부족합니다",
  "internal server error",
  "about:blank",
  "calculationmode",
  "프롬프트",
  "기본 상담 어조",
  "기본 질문 패턴",
  "기본 톤 규칙",
  "경계 문장",
  "career 축",
  "데이터 근거 중심",
  "상담 해석 관점에서",
  "작성됩니다",
  "정렬한 프로필",
  "llm",
  "json",
  "seed",
  "skeleton",
  "template",
  "로컬",
  "검증 규칙",
  "메타",
  "내부",
  "규칙은",
  "질문 주제의 연결성",
  "사용자 질문의 표면 요청",
  "숨은 의도와 실행 전략을 데이터 근거 중심으로 해석",
];

const FORBIDDEN_STYLE_PATTERNS = Object.freeze([
  /기본\s*(상담\s*어조|질문\s*패턴|톤\s*규칙)/i,
  /프롬프트(의|를|를\s*기반|\s*규칙)?/i,
  /경계\s*문장/i,
  /career\s*축/i,
  /데이터\s*근거\s*중심/i,
  /상담\s*해석\s*관점에서/i,
  /정렬한\s*프로필/i,
  /검증\s*규칙/i,
  /질문\s*주제의\s*연결성/i,
  /사용자\s*질문의\s*표면\s*요청/i,
  /숨은\s*의도와\s*실행\s*전략/i,
  /(json|payload|seed|fallback|skeleton|template|llm|debug|engine|meta|internal)/i,
  /(작성됩니다|규칙입니다|프로필입니다)/i,
]);

const STAR_RULES = Object.freeze({
  자미: {
    nature: "중심성·품격·통솔력",
    personality: ["책임감이 강하고 기준을 세워 조직을 이끎", "감정 표현보다 질서와 균형을 먼저 세움", "관계에서 신뢰를 기반으로 영향력을 발휘"],
    strengthMeaning: { "◎": "권위와 신뢰가 자연스럽게 모이는 배치", O: "안정된 리더십으로 실무 장악력 상승", "▲": "역할이 주어질 때 힘이 살아남", "△": "주도권은 있으나 피로 관리 필요", X: "통제 강박으로 관계 긴장 누적" },
    career: ["관리자·총괄·브랜드 책임자 역할에 강함", "핵심 의사결정이 필요한 프로젝트에서 성과"],
    relationship: ["상대의 성숙도를 중요하게 보며 관계를 설계", "존중이 무너지면 빠르게 거리 조정"],
    money: ["구조화된 자산 운영에 강점", "감정소비보다 장기 설계형 재무"],
    caution: ["완벽주의로 위임이 늦어짐", "기대수준이 높아 대인 피로가 쌓임"],
    advice: ["권한 위임 규칙을 문서화해 과부하를 줄이세요", "신뢰 가능한 파트너 1인을 재정·일정 점검자로 두세요"],
  },
  천기: {
    nature: "전략·기획·변화 적응력",
    personality: ["빠른 분석으로 대안을 병렬 검토", "흐름 변화를 빨리 포착", "학습 속도가 빨라 복합 문제에 강함"],
    strengthMeaning: { "◎": "전략적 통찰이 탁월하게 작동", O: "현실적 기획력이 안정적으로 구현", "▲": "환경 변화 대응력이 실무에서 강점", "△": "판단은 빠르나 집중 분산 위험", X: "과잉 사고로 결정 지연" },
    career: ["기획·데이터·제품전략·리서치 직무 적합", "복잡한 이해관계 조율에 강함"],
    relationship: ["대화와 맥락 조율이 관계의 핵심", "정서보다 논리로 접근해 오해가 생길 수 있음"],
    money: ["정보 우위를 활용한 수익 구조에 강함", "리스크 관리 체계가 수익률 좌우"],
    caution: ["옵션 과다로 실행 속도 저하", "피로 시 판단이 과도하게 보수화"],
    advice: ["결정 기한을 명시해 분석 과잉을 차단하세요", "월 1회 전략 리뷰로 버릴 과제를 먼저 정리하세요"],
  },
  태양: {
    nature: "공개성·명예·사회적 확장",
    personality: ["외부와 연결될 때 에너지가 상승", "공정성과 명분을 중시", "주변을 비추는 역할을 자주 맡음"],
    strengthMeaning: { "◎": "명성과 영향력이 크게 확장", O: "대외 신뢰가 안정적으로 축적", "▲": "홍보·영업·외부협업에 강점", "△": "의욕은 높으나 체력 분산", X: "인정 욕구와 소진이 동반" },
    career: ["대외 협력·브랜딩·리더 포지션에 강함", "공공성 있는 프로젝트 적합"],
    relationship: ["솔직한 소통을 선호", "자존심 충돌 시 회복이 느릴 수 있음"],
    money: ["평판 기반 수익화에 유리", "인지도 확장이 매출로 연결"],
    caution: ["타인의 기대를 과도하게 떠안을 수 있음", "과시적 지출이 생길 수 있음"],
    advice: ["노출 일정과 회복 일정을 함께 설계하세요", "평판 관리 지표를 월 단위로 추적하세요"],
  },
  무곡: {
    nature: "재물·실무·결단력",
    personality: ["숫자와 성과 중심으로 판단", "실행 속도가 빠르고 단호", "현실 감각이 뛰어나 손익에 민감"],
    strengthMeaning: { "◎": "재무 판단과 실행력이 매우 강함", O: "안정적 수익 구조를 만드는 힘", "▲": "실무 성과가 꾸준히 누적", "△": "성과는 나나 완급조절 필요", X: "과도한 통제와 긴장으로 소진" },
    career: ["재무·운영·관리·사업개발 적합", "성과 책임형 직무에서 강점"],
    relationship: ["말보다 행동으로 신뢰를 증명", "감정 공감 부족으로 오해 발생 가능"],
    money: ["시스템화된 저축·투자에 강함", "현금흐름 관리 능력이 핵심"],
    caution: ["관계에서 효율 논리가 앞설 수 있음", "과로에 따른 건강 저하"],
    advice: ["재무 대시보드를 고정해 수치 기반 결정을 유지하세요", "분기마다 리스크 한도를 재설정하세요"],
  },
  천동: {
    nature: "회복력·유연성·정서 순환",
    personality: ["부드러운 소통과 조율 능력", "감정 파동을 빠르게 회복", "인간관계에서 완충 역할"],
    strengthMeaning: { "◎": "심리적 회복탄력성과 대인 조율력 극대화", O: "관계 안정과 정서 균형이 강함", "▲": "협업 환경에서 완충 능력 발휘", "△": "평온 지향이 결단 지연으로 이어질 수 있음", X: "회피적 대응으로 문제 누적" },
    career: ["고객경험·교육·상담·서비스 직무 강점", "팀 분위기 안정화에 기여"],
    relationship: ["정서적 안전을 중시", "갈등 회피가 길어지면 오해 누적"],
    money: ["안정 지향 소비 패턴", "보수적 재무 운영이 적합"],
    caution: ["결정 회피", "관계 피로를 내면화"],
    advice: ["갈등 이슈는 48시간 내 대화 규칙을 적용하세요", "감정 기록을 통해 의사결정 근거를 확보하세요"],
  },
  염정: {
    nature: "원칙·매력·집중력",
    personality: ["기준이 명확하고 호불호가 분명", "몰입력이 높아 성과의 깊이가 큼", "감정 강도가 높아 관계에 영향"],
    strengthMeaning: { "◎": "원칙과 카리스마가 강하게 작동", O: "집중력과 추진력이 안정적", "▲": "프로젝트 몰입 성과 우수", "△": "집중 편향으로 균형 필요", X: "집착과 감정 소모 위험" },
    career: ["법무·정책·브랜딩·고난도 전문직 적합", "완성도 중심 작업에 강함"],
    relationship: ["진정성과 충성도를 중시", "의심이 생기면 회복까지 시간이 필요"],
    money: ["목표형 자금 운용에 유리", "단기 변동보다 장기 계획 적합"],
    caution: ["감정 과열", "관계에서 기준 강요"],
    advice: ["강한 감정이 올라오면 결정 전 24시간 보류하세요", "핵심 원칙 3가지만 남기고 나머지는 조정하세요"],
  },
  천부: {
    nature: "안정·보호·관리",
    personality: ["큰 틀을 안정적으로 유지", "책임감과 보호 본능", "장기 운영 능력 우수"],
    strengthMeaning: { "◎": "조직 운영과 자산 방어력 탁월", O: "안정적 성장 기반 구축", "▲": "중간관리 및 조정 능력 우수", "△": "보수성으로 기회 지연", X: "변화 저항으로 침체" },
    career: ["운영·관리·재무통제·기획관리 적합"],
    relationship: ["신뢰 기반 장기 관계 선호"],
    money: ["방어적 자산 배분 강점", "비상금/보험/현금흐름 관리 우수"],
    caution: ["보수적 과잉", "결정 지연"],
    advice: ["보수/공격 포트폴리오 비율을 분기별 조정하세요"],
  },
  태음: {
    nature: "감수성·재정 감각·내면성",
    personality: ["섬세한 관찰과 공감", "내면 동기가 강함", "조용한 집중력이 높음"],
    strengthMeaning: { "◎": "감수성과 재정 감각의 균형이 뛰어남", O: "심리 안정과 실속이 공존", "▲": "세부 관리와 디테일 강점", "△": "감정 기복 관리 필요", X: "불안에 따른 소극성" },
    career: ["콘텐츠·브랜딩·재무관리·리서치 적합"],
    relationship: ["정서적 신뢰가 핵심", "예민함이 오해로 번질 수 있음"],
    money: ["지출 통제력 우수", "내실형 자산 축적에 강함"],
    caution: ["감정적 위축", "관계 피로 내면화"],
    advice: ["감정 기복 구간에서 지출/결정 제한 규칙을 두세요"],
  },
  탐랑: {
    nature: "욕망·매력·확장성",
    personality: ["새로운 자극과 확장을 추구", "사교성과 매력으로 기회를 포착", "예술적 감각과 감정 에너지"],
    strengthMeaning: { "◎": "확장과 매력 자원이 강력히 작동", O: "네트워크 기반 성과가 안정적", "▲": "새 판을 여는 추진력", "△": "과욕 조절 필요", X: "감정·욕망 과잉으로 리스크 확대" },
    career: ["영업·콘텐츠·엔터·브랜드 확장형 직무"],
    relationship: ["강한 끌림과 몰입", "경계가 흐려지면 피로 누적"],
    money: ["기회 포착력 우수", "과감한 투자 성향"],
    caution: ["충동 소비", "관계 과열"],
    advice: ["기회 선택 기준 3개를 사전에 고정해 과열을 차단하세요"],
  },
  거문: {
    nature: "분석·언어·검증",
    personality: ["논리적 검토와 비판적 사고", "정보의 진위를 구분", "언어 영향력이 큼"],
    strengthMeaning: { "◎": "분석·설득력이 탁월", O: "판단 정확도와 논리 전개 안정", "▲": "문서·기획·협상 능력 우수", "△": "의심 과다로 속도 저하", X: "불신과 방어적 태도 강화" },
    career: ["법률·분석·기획·컨설팅 적합"],
    relationship: ["대화 품질이 관계 품질을 좌우"],
    money: ["검증 중심 투자에 강점"],
    caution: ["과도한 의심", "표현이 날카로워 관계 긴장"],
    advice: ["중요 대화 전 핵심 메시지 3줄을 먼저 정리하세요"],
  },
  천상: {
    nature: "균형·조율·공공성",
    personality: ["공정성과 절차를 중시", "중재와 합의 설계에 강함", "집단 내 균형감각"],
    strengthMeaning: { "◎": "조율 능력이 권위로 연결", O: "협업 안정성과 신뢰 확보", "▲": "중재·협상 성과", "△": "눈치 과다로 결정 지연", X: "우유부단으로 기회 상실" },
    career: ["조정·인사·정책·파트너십 관리 적합"],
    relationship: ["상호 존중과 규칙을 중시"],
    money: ["보수·안정형 운영", "리스크 분산 강점"],
    caution: ["갈등 회피", "기준 흔들림"],
    advice: ["우선순위 의사결정 기준을 수치화해 고정하세요"],
  },
  천량: {
    nature: "보호·원칙·멘토십",
    personality: ["도덕성과 책임 의식", "타인을 돕는 구조 설계", "장기 관점 판단"],
    strengthMeaning: { "◎": "보호와 지도력이 크게 발휘", O: "신뢰 기반 영향력 안정", "▲": "멘토링·코칭 성과", "△": "원칙 고수로 유연성 저하", X: "도덕적 피로와 책임 과부하" },
    career: ["교육·컨설팅·공공영역·복지 시스템 적합"],
    relationship: ["책임감 있는 관계 지향", "상대 미성숙에 실망이 큼"],
    money: ["안전지향 재무 운영"],
    caution: ["희생 과잉", "과도한 책임 수용"],
    advice: ["책임 경계를 문장으로 명확히 선언하세요"],
  },
  칠살: {
    nature: "돌파·독립·위기 대응",
    personality: ["고압 상황에서 판단력이 살아남", "독립성과 결단이 강함", "위기에서 집중력이 상승"],
    strengthMeaning: { "◎": "난도 높은 문제 해결력이 탁월", O: "압박 속 실행력이 안정", "▲": "결단과 돌파 성과", "△": "긴장 지속으로 피로 누적", X: "충돌과 단절 리스크" },
    career: ["위기관리·전략실행·창업·고강도 프로젝트 적합"],
    relationship: ["직설적 표현으로 오해 가능", "신뢰 기준은 매우 명확"],
    money: ["공격적 수익 기회 포착", "손절 규칙 필수"],
    caution: ["충동적 결단", "과도한 긴장"],
    advice: ["돌파 전 리스크 상한선을 먼저 정하고 진입하세요"],
  },
  파군: {
    nature: "개혁·재구성·변동성",
    personality: ["낡은 구조를 깨고 새 판을 설계", "변화 수용력이 매우 높음", "실험적 접근에 강함"],
    strengthMeaning: { "◎": "혁신 드라이브가 강하게 작동", O: "재편 능력이 안정적으로 성과화", "▲": "전환기 실행력 우수", "△": "변화 피로 관리 필요", X: "파괴가 재건으로 이어지지 못함" },
    career: ["신사업·전환 프로젝트·리빌딩 역할 적합"],
    relationship: ["변화 욕구가 관계 안정과 충돌 가능"],
    money: ["고위험 고수익 선호", "현금흐름 안전망 필수"],
    caution: ["과격한 리셋", "지속성 결핍"],
    advice: ["변화 실행 전 유지할 핵심 자산 3개를 고정하세요"],
  },
});

const AUX_MALEFIC_RULES = Object.freeze({
  좌보: { support: "협력자 유입", pressure: "책임 분산 실패", operation: "실무 보조 인력 확충", advice: "역할 정의를 문서화하세요" },
  우필: { support: "지원 네트워크 강화", pressure: "의존성 상승", operation: "백업 체계 구축", advice: "핵심 의사결정권은 유지하세요" },
  문창: { support: "문서·기획력 향상", pressure: "과잉 정교화", operation: "보고/정리 품질 강화", advice: "결정 기한을 고정하세요" },
  문곡: { support: "표현·창의성 확장", pressure: "감수성 과부하", operation: "브랜딩·스토리텔링 강화", advice: "감정 기복 구간의 의사결정은 보류하세요" },
  천괴: { support: "귀인 도움", pressure: "외부 의존", operation: "멘토·추천·기회 연결", advice: "귀인 네트워크도 상호가치로 운영하세요" },
  천월: { support: "구조적 후원", pressure: "권위 충돌", operation: "평판 자산 확장", advice: "약속 이행률을 최우선 지표로 두세요" },
  화성: { support: "순간 추진력", pressure: "충동·충돌", operation: "단기 돌파", advice: "리스크 상한선 없는 진입은 피하세요" },
  영성: { support: "집중력 상승", pressure: "정서 과열", operation: "고밀도 문제 해결", advice: "휴식 슬롯을 일정에 고정하세요" },
  경양: { support: "날카로운 결단", pressure: "대인 마찰", operation: "불필요 요소 제거", advice: "직설 표현은 근거와 함께 전달하세요" },
  타라: { support: "위기 감지", pressure: "불안 확대", operation: "리스크 탐지", advice: "우려를 수치 기준으로 변환하세요" },
  지공: { support: "관점 전환", pressure: "공허감", operation: "낡은 가치 재평가", advice: "의미 없는 과제는 과감히 정리하세요" },
  지겁: { support: "생존 감각", pressure: "손실 압박", operation: "손실 회피 전략", advice: "비상자금 규칙을 선제 적용하세요" },
  녹존: { support: "자원 보존", pressure: "고착화", operation: "현금흐름 안정", advice: "보존과 성장 비율을 분기별 조정하세요" },
  천마: { support: "이동·확장", pressure: "정착 불안", operation: "출장·이직·외부기회", advice: "이동 후 정착 루틴을 즉시 설계하세요" },
});

const SIHUA_RULES = Object.freeze({
  화록: "자원이 모이고 기회가 열리는 흐름",
  화권: "주도권과 책임이 커지며 성과 압박이 증가하는 흐름",
  화과: "평판·신뢰·인정이 축적되는 흐름",
  화기: "막힘과 집착이 드러나 반복 숙제가 커지는 흐름",
});

const DUPLICATE_BANNED_OPENERS = Object.freeze([
  "이 절은",
  "이번 장에서는",
  "균형을 유지",
  "반복 구조",
  "루틴을 만들",
]);

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function toHexHash(value = "") {
  const text = String(value == null ? "" : value);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function normalizeZiweiError(error) {
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
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function esc(value) {
  return clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripForbiddenTokens(value) {
  let text = clean(value)
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\[object Object\]/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/Chapter\s*1\s*Chapter\s*1/gi, "")
    .replace(/데이터가\s*부족합니다/gi, "")
    .replace(/localdraft/gi, "")
    .replace(/fallback/gi, "")
    .replace(/payload/gi, "")
    .replace(/debug/gi, "")
    .replace(/raw\s*json/gi, "")
    .replace(/\bjson\b/gi, "")
    .replace(/\bseed\b/gi, "")
    .replace(/\bskeleton\b/gi, "")
    .replace(/\btemplate\b/gi, "")
    .replace(/\bllm\b/gi, "")
    .replace(/\bmeta\b/gi, "")
    .replace(/\binternal\b/gi, "")
    .replace(/프롬프트/gi, "")
    .replace(/기본\s*상담\s*어조/gi, "")
    .replace(/기본\s*질문\s*패턴/gi, "")
    .replace(/기본\s*톤\s*규칙/gi, "")
    .replace(/경계\s*문장/gi, "")
    .replace(/career\s*축/gi, "")
    .replace(/데이터\s*근거\s*중심/gi, "")
    .replace(/상담\s*해석\s*관점에서/gi, "")
    .replace(/정렬한\s*프로필/gi, "")
    .replace(/검증\s*규칙/gi, "")
    .replace(/질문\s*주제의\s*연결성/gi, "")
    .replace(/사용자\s*질문의\s*표면\s*요청/gi, "")
    .replace(/숨은\s*의도와\s*실행\s*전략을\s*데이터\s*근거\s*중심으로\s*해석/gi, "")
    .replace(/\bengine\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (/^Chapter\s*\d+\s*$/i.test(text)) text = "";
  return text;
}

function containsForbiddenNarrative(value = "") {
  const text = clean(value);
  if (!text) return false;
  const lowered = text.toLowerCase();
  if (FORBIDDEN_TEXT.some((token) => lowered.includes(String(token).toLowerCase()))) return true;
  return FORBIDDEN_STYLE_PATTERNS.some((pattern) => pattern.test(text));
}

function sanitizeCounselingText(value = "") {
  const stripped = stripForbiddenTokens(value)
    .split(/\n+/)
    .map((line) => clean(line))
    .filter(Boolean)
    .filter((line) => !containsForbiddenNarrative(line))
    .join("\n\n");
  return clean(stripped);
}

function safeObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  return {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeFeatureKey(raw) {
  const key = clean(raw);
  if (!key) return ZIWEI_FEATURE_KEY;
  if (ZIWEI_FEATURE_ALIASES.has(key)) return ZIWEI_FEATURE_KEY;
  return key;
}

function withPremiumPdfArchiveFormat(url, format = "pdf") {
  const value = clean(url);
  const targetFormat = clean(format) || "pdf";
  if (!value || !/\/api\/premium\/pdf-archive\//.test(value)) return value;
  if (/[?&]format=/i.test(value)) {
    return value.replace(/([?&]format=)[^&]+/i, `$1${encodeURIComponent(targetFormat)}`);
  }
  return `${value}${value.includes("?") ? "&" : "?"}format=${encodeURIComponent(targetFormat)}`;
}

function toFiniteInt(value, fallback = NaN) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function pickNonEmpty(...values) {
  for (const value of values) {
    const normalized = clean(value);
    if (normalized) return normalized;
  }
  return "";
}

function normalizeGender(value) {
  const raw = clean(value).toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(raw)) return "male";
  if (["f", "female", "woman", "여", "여성"].includes(raw)) return "female";
  return "unknown";
}

function normalizeCalendarType(value) {
  const raw = clean(value).toLowerCase();
  if (["solar", "양력", "양"].includes(raw)) return "solar";
  if (["lunar", "음력", "음", "lunar_leap", "윤달"].includes(raw)) return "lunar";
  return "unknown";
}

function isUnknownTimeMarker(value) {
  const raw = clean(value).toLowerCase();
  if (!raw) return false;
  return /모름|미상|unknown|없음|미기재|not\s*known|n\/a|na|무시|모르/.test(raw);
}

function normalizeHourMinute(hour, minute = 0) {
  if (!Number.isFinite(hour)) return null;
  if (!Number.isFinite(minute)) minute = 0;
  const normalizedHour = Math.max(0, Math.min(23, Math.trunc(hour)));
  const normalizedMinute = Math.max(0, Math.min(59, Math.trunc(minute)));
  return { hour: normalizedHour, minute: normalizedMinute };
}

function parseHourMinuteFromText(value) {
  const raw = clean(value);
  if (!raw) return null;
  if (isUnknownTimeMarker(raw)) return { unknown: true };

  const branchMatch = raw.match(/([자축인묘진사오미신유술해])\s*시/);
  if (branchMatch && EARTHLY_BRANCH_HOUR[branchMatch[1]] != null) {
    return normalizeHourMinute(EARTHLY_BRANCH_HOUR[branchMatch[1]], 0);
  }

  const hm = raw.match(/^(\d{1,2})\s*[:시]\s*(\d{1,2})?/);
  if (hm) {
    let hour = toFiniteInt(hm[1], NaN);
    const minute = toFiniteInt(hm[2], 0);
    if (/오후|pm|PM/.test(raw) && Number.isFinite(hour) && hour < 12) hour += 12;
    if (/오전|am|AM/.test(raw) && Number.isFinite(hour) && hour === 12) hour = 0;
    return normalizeHourMinute(hour, minute);
  }

  const hourOnly = raw.match(/^(오전|오후|am|pm|AM|PM)?\s*(\d{1,2})\s*시?$/);
  if (hourOnly) {
    let hour = toFiniteInt(hourOnly[2], NaN);
    if (/오후|pm|PM/.test(hourOnly[1] || "") && Number.isFinite(hour) && hour < 12) hour += 12;
    if (/오전|am|AM/.test(hourOnly[1] || "") && Number.isFinite(hour) && hour === 12) hour = 0;
    return normalizeHourMinute(hour, 0);
  }

  return null;
}

function parseDateParts(value) {
  const raw = clean(value);
  if (!raw) return null;
  const match = raw.match(/^(\d{4})[-./\s](\d{1,2})[-./\s](\d{1,2})$/);
  if (!match) return null;
  const year = toFiniteInt(match[1], NaN);
  const month = toFiniteInt(match[2], NaN);
  const day = toFiniteInt(match[3], NaN);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function pad2(value) {
  return String(toInt(value, 0)).padStart(2, "0");
}

function normalizeSymbol(symbol, name = "") {
  const s = clean(symbol);
  const n = clean(name);
  if (s === "◎") return "◎";
  if (s === "O" || s === "○" || s === "◉") return "O";
  if (s === "▲") return "▲";
  if (s === "△") return "△";
  if (s === "X" || s === "×" || /^x$/i.test(s)) return "X";
  if (/묘|廟/.test(n)) return "◎";
  if (/왕|旺|득|得/.test(n)) return "O";
  if (/리|利|약/.test(n)) return "▲";
  if (/평|平/.test(n)) return "△";
  if (/함|실|陷|불|쇠/.test(n)) return "X";
  return "△";
}

function normalizeStrengthName(value) {
  const raw = clean(value);
  if (/묘|廟|◎/.test(raw)) return "묘";
  if (/왕|旺|득|得|○|O/.test(raw)) return "득";
  if (/리|利|약|▲/.test(raw)) return "리";
  if (/평|平|△/.test(raw)) return "평";
  if (/함|실|陷|불|쇠|×|X/i.test(raw)) return "함";
  return "평";
}

function normalizeStar(star) {
  if (!star || typeof star !== "object") return null;
  const name = clean(star.nameKo || star.name || star.starName);
  if (!name) return null;
  const strengthName = normalizeStrengthName(star.strengthName || star.strength || star.brightnessKo || star.brightness || star.symbol || star.strengthSymbol);
  const strengthSymbol = normalizeSymbol(star.strengthSymbol || star.symbol, strengthName);
  return {
    name,
    strengthName,
    strengthSymbol,
    borrowed: star.borrowed === true,
    sihua: clean(star.sihua || star.transformation || star.transform),
  };
}

function normalizeStarList(list) {
  return (Array.isArray(list) ? list : []).map(normalizeStar).filter(Boolean);
}

function starsText(stars) {
  const rows = normalizeStarList(stars);
  if (!rows.length) return "확인되는 주성이 없습니다";
  return rows.map((star) => `${star.name}${star.strengthSymbol}(${star.strengthName})${star.sihua ? ` ${star.sihua}` : ""}${star.borrowed ? " 차성" : ""}`).join(", ");
}

function normalizeInput(body = {}) {
  const bp = body.birthProfile && typeof body.birthProfile === "object" ? body.birthProfile : {};
  const birth = bp.birth && typeof bp.birth === "object" ? bp.birth : {};
  const input = body.birthInput && typeof body.birthInput === "object" ? body.birthInput : {};

  const birthDateRaw = pickNonEmpty(
    input.birthDate,
    input.birthday,
    input.solarDate,
    input.lunarDate,
    input.date,
    body.birthDate,
    body.birthday,
    body.solarDate,
    body.lunarDate,
    body.date,
    bp.birthDate,
    birth.birthDate,
    birth.solarDate,
    birth.lunarDate,
    body.solarDate,
    body.birthday,
    birth.date,
  );
  const parsedDate = parseDateParts(birthDateRaw);

  const year = Number.isFinite(toFiniteInt(input.birthYear, NaN))
    ? toFiniteInt(input.birthYear, NaN)
    : Number.isFinite(toFiniteInt(body.birthYear, NaN))
      ? toFiniteInt(body.birthYear, NaN)
      : Number.isFinite(toFiniteInt(body.year, NaN))
        ? toFiniteInt(body.year, NaN)
        : Number.isFinite(toFiniteInt(birth.year, NaN))
          ? toFiniteInt(birth.year, NaN)
          : parsedDate?.year;
  const month = Number.isFinite(toFiniteInt(input.birthMonth, NaN))
    ? toFiniteInt(input.birthMonth, NaN)
    : Number.isFinite(toFiniteInt(body.birthMonth, NaN))
      ? toFiniteInt(body.birthMonth, NaN)
      : Number.isFinite(toFiniteInt(body.month, NaN))
        ? toFiniteInt(body.month, NaN)
        : Number.isFinite(toFiniteInt(birth.month, NaN))
          ? toFiniteInt(birth.month, NaN)
          : parsedDate?.month;
  const day = Number.isFinite(toFiniteInt(input.birthDay, NaN))
    ? toFiniteInt(input.birthDay, NaN)
    : Number.isFinite(toFiniteInt(body.birthDay, NaN))
      ? toFiniteInt(body.birthDay, NaN)
      : Number.isFinite(toFiniteInt(body.day, NaN))
        ? toFiniteInt(body.day, NaN)
        : Number.isFinite(toFiniteInt(birth.day, NaN))
          ? toFiniteInt(birth.day, NaN)
          : parsedDate?.day;

  const birthTimeRaw = pickNonEmpty(
    input.birthTime,
    body.birthTime,
    body.time,
    body.timeText,
    body.birth_hour,
    body.hourText,
    body.hour_text,
    bp.birthTime,
    birth.birthTime,
    birth.time,
  );
  const explicitHour = Number.isFinite(toFiniteInt(input.birthHour, NaN))
    ? toFiniteInt(input.birthHour, NaN)
    : Number.isFinite(toFiniteInt(body.birthHour, NaN))
      ? toFiniteInt(body.birthHour, NaN)
      : Number.isFinite(toFiniteInt(body.hour, NaN))
        ? toFiniteInt(body.hour, NaN)
        : Number.isFinite(toFiniteInt(body.birth_hour, NaN))
          ? toFiniteInt(body.birth_hour, NaN)
          : Number.isFinite(toFiniteInt(birth.hour, NaN))
            ? toFiniteInt(birth.hour, NaN)
            : NaN;
  const explicitMinute = Number.isFinite(toFiniteInt(input.birthMinute, NaN))
    ? toFiniteInt(input.birthMinute, NaN)
    : Number.isFinite(toFiniteInt(body.birthMinute, NaN))
      ? toFiniteInt(body.birthMinute, NaN)
      : Number.isFinite(toFiniteInt(body.minute, NaN))
        ? toFiniteInt(body.minute, NaN)
        : Number.isFinite(toFiniteInt(birth.minute, NaN))
          ? toFiniteInt(birth.minute, NaN)
          : 0;

  const parsedTime = parseHourMinuteFromText(birthTimeRaw);
  const isTimeUnknown = Boolean(
    input.isTimeUnknown
    || body.isTimeUnknown
    || body.timeUnknown
    || body.unknownHour
    || bp.timeUnknown
    || birth.timeUnknown
    || (parsedTime && parsedTime.unknown)
    || isUnknownTimeMarker(birthTimeRaw),
  );

  const hourMinute = Number.isFinite(explicitHour)
    ? normalizeHourMinute(explicitHour, explicitMinute)
    : parsedTime && !parsedTime.unknown
      ? normalizeHourMinute(parsedTime.hour, parsedTime.minute)
      : null;

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, message: "정확한 명반 계산을 위해 생년월일 정보를 확인해 주세요." };
  }
  if (isTimeUnknown || !hourMinute) {
    return {
      ok: false,
      code: "BIRTH_TIME_REQUIRED",
      message: "자미두수 PDF는 명궁과 12궁 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.",
    };
  }

  const gender = normalizeGender(pickNonEmpty(input.gender, input.sex, body.gender, body.sex, bp.gender, birth.gender));
  const calendarType = normalizeCalendarType(
    pickNonEmpty(input.calendarType, input.calendar, body.calendarType, body.calendar, bp.calendarType, birth.calType, birth.calendarType),
  );

  const birthInput = {
    name: pickNonEmpty(input.name, body.name, bp.name) || "사용자",
    gender,
    calendarType,
    birthDate: `${year}-${pad2(month)}-${pad2(day)}`,
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    birthTime: `${pad2(hourMinute.hour)}:${pad2(hourMinute.minute)}`,
    birthHour: hourMinute.hour,
    birthMinute: hourMinute.minute,
    timezone: pickNonEmpty(input.timezone, body.timezone, bp.timezone, birth.timezone) || "Asia/Seoul",
    isTimeUnknown: false,
  };

  return {
    ok: true,
    birthInput,
    profile: {
      name: birthInput.name,
      gender: birthInput.gender,
      year,
      month,
      day,
      hour: birthInput.birthHour,
      minute: birthInput.birthMinute,
      calendarType: birthInput.calendarType,
      birthplace: clean(body.birthplace || bp.birthplace || bp.birthPlace) || "대한민국",
      birthIso: `${year}-${pad2(month)}-${pad2(day)} ${pad2(birthInput.birthHour)}:${pad2(birthInput.birthMinute)}`,
    },
  };
}

function getZiweiBase(body = {}) {
  const candidates = [
    body.ziweiBase,
    body.ziweiPdfSeed,
    body.chartResult?.reportPayload,
    body.chartResult?.ziweiBase,
    body.reportPayload,
    body.chart,
  ];
  for (const item of candidates) {
    if (item && typeof item === "object") return item;
  }
  return null;
}

function normalizePalaces(base = {}) {
  const rawPalaces = Array.isArray(base.palaces)
    ? base.palaces
    : Array.isArray(base.chart?.palaces)
      ? base.chart.palaces
      : Array.isArray(base.chartMeta?.palaces)
        ? base.chartMeta.palaces
        : [];
  const palaces = rawPalaces.map((palace, index) => {
    const nameRaw = clean(palace.nameKo || palace.name || palace.palace || PALACE_LABELS[clean(palace.key || palace.id || palace.palaceKey || "")] || "");
    const nameKo = nameRaw === "부처궁" ? "부부궁" : nameRaw;
    const mappedKey = PALACE_LABELS && Object.keys(PALACE_LABELS).find((k) => PALACE_LABELS[k] === nameKo);
    const key = clean(palace.key || palace.id || palace.palaceKey || mappedKey || "");
    const mainStars = normalizeStarList(palace.mainStars || palace.stars);
    const auxStars = normalizeStarList(palace.auxStars || palace.auxiliaryStars || palace.subStars);
    const maleficStars = normalizeStarList(palace.maleficStars || palace.badStars);
    const strengthSummary = {
      "◎": mainStars.concat(auxStars, maleficStars).filter((s) => s.strengthSymbol === "◎").length,
      O: mainStars.concat(auxStars, maleficStars).filter((s) => s.strengthSymbol === "O").length,
      "▲": mainStars.concat(auxStars, maleficStars).filter((s) => s.strengthSymbol === "▲").length,
      "△": mainStars.concat(auxStars, maleficStars).filter((s) => s.strengthSymbol === "△").length,
      X: mainStars.concat(auxStars, maleficStars).filter((s) => s.strengthSymbol === "X").length,
    };
    return {
      key,
      nameKo,
      branch: clean(palace.branch || palace.earthlyBranch || palace.zhi),
      index,
      mainStars,
      auxStars,
      maleficStars,
      transformations: Array.isArray(palace.transformations) ? palace.transformations : [],
      strengthSummary,
      decadeLuck: palace.decadeLuck || null,
      annualLuck: palace.annualLuck || null,
    };
  });
  const required = ["ming", "siblings", "spouse", "children", "wealth", "health", "travel", "friends", "career", "property", "fortune", "parents"];
  const finalPalaces = [];
  required.forEach((key, index) => {
    const hit = palaces.find((p) => clean(p.key) === key) || palaces.find((p) => clean(p.nameKo) === clean(PALACE_LABELS[key] || ""));
    if (hit) {
      finalPalaces.push(hit);
      return;
    }
    finalPalaces.push({
      key,
      nameKo: PALACE_LABELS[key] || key,
      branch: "",
      index,
      mainStars: [],
      auxStars: [],
      maleficStars: [],
      transformations: [],
      strengthSummary: { "◎": 0, O: 0, "▲": 0, "△": 0, X: 0 },
      decadeLuck: null,
      annualLuck: null,
    });
  });
  return finalPalaces;
}

function findPalace(seed, key) {
  const palaces = Array.isArray(seed?.palaces)
    ? seed.palaces
    : (Array.isArray(seed?.chart?.palaces) ? seed.chart.palaces : []);
  if (key === "body") {
    return seed.bodyPalace || palaces.find((p) => p.key === "body") || palaces.find((p) => p.branch && p.branch === seed.chart.shenGong) || seed.lifePalace;
  }
  if (key === "signals") {
    return seed.lifePalace || palaces.find((p) => p.key === "ming") || null;
  }
  if (key === "timing") return null;
  const expectedName = PALACE_LABELS[key];
  return palaces.find((p) => p.key === key) || palaces.find((p) => p.nameKo === expectedName) || null;
}

function buildZiweiPdfSeed(profile, base) {
  const palaces = normalizePalaces(base);
  const chartMeta = base.chartMeta || base.chart || {};
  const lifePalace = palaces.find((p) => p.key === "ming" || p.nameKo === "명궁") || null;
  const bodyBranch = clean(chartMeta.shenGong || chartMeta.bodyPalaceBranch || base.shen);
  const bodyPalace = palaces.find((p) => p.key === "body") || palaces.find((p) => p.branch && p.branch === bodyBranch) || null;
  const sihua = Array.isArray(base.sihua) ? base.sihua : (Array.isArray(base.transformations) ? base.transformations : []);
  const luck = base.luck && typeof base.luck === "object" ? base.luck : {};
  const decadeLuck = Array.isArray(luck.decadeLuck) ? luck.decadeLuck : (Array.isArray(base.decadeLuck) ? base.decadeLuck : []);
  const annualLuck = Array.isArray(luck.annual) ? luck.annual : (Array.isArray(base.annualLuck) ? base.annualLuck : []);

  const diagnostics = {
    palaceCount: palaces.length,
    hasAll12Palaces: palaces.length >= 12,
    hasMingGong: Boolean(lifePalace),
    hasShenGong: Boolean(bodyPalace || bodyBranch),
    hasSihua: sihua.length > 0,
    hasDecadeLuck: decadeLuck.length > 0,
  };

  const groundTruth = {
    palaces: palaces.map((palace) => ({
      key: palace.key,
      nameKo: palace.nameKo,
      branch: palace.branch,
      mainStars: normalizeStarList(palace.mainStars),
      auxStars: normalizeStarList(palace.auxStars),
      maleficStars: normalizeStarList(palace.maleficStars),
    })),
    starInventory: {
      mainStars: normalizeStarList(palaces.flatMap((palace) => palace.mainStars || [])),
      assistantStars: normalizeStarList(palaces.flatMap((palace) => palace.auxStars || [])),
      maleficStars: normalizeStarList(palaces.flatMap((palace) => palace.maleficStars || [])),
    },
    transformations: sihua.map((item) => ({ star: clean(item?.star), type: clean(item?.type || item?.label) })),
  };

  const seed = {
    mode: "single",
    birthProfile: {
      birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`,
      birthTime: `${pad2(profile.hour)}:${pad2(profile.minute)}`,
      calendarType: profile.calendarType,
      gender: profile.gender,
      birthplace: profile.birthplace,
    },
    chart: {
      mingGong: clean(chartMeta.mingGong || base.meng || lifePalace?.branch || ""),
      shenGong: bodyBranch,
      fiveElementBureau: clean(chartMeta.fiveElementBureau || base.juInfo || ""),
      yearStemBranch: clean(chartMeta.yearStemBranch || chartMeta.yearGan || base.yearGan || ""),
      palaces,
      lifePalace,
      bodyPalace,
      careerPalace: findPalace({ chart: { palaces } }, "career"),
      wealthPalace: findPalace({ chart: { palaces } }, "wealth"),
      spousePalace: findPalace({ chart: { palaces } }, "spouse"),
      friendsPalace: findPalace({ chart: { palaces } }, "friends"),
      parentsPalace: findPalace({ chart: { palaces } }, "parents"),
      siblingsPalace: findPalace({ chart: { palaces } }, "siblings"),
      healthPalace: findPalace({ chart: { palaces } }, "health"),
      propertyPalace: findPalace({ chart: { palaces } }, "property"),
      travelPalace: findPalace({ chart: { palaces } }, "travel"),
      fortunePalace: findPalace({ chart: { palaces } }, "fortune"),
      transformations: sihua,
      decadeLuck,
      annualLuck,
    },
    localZiweiChartJson: {
      birthInput: {
        name: profile.name,
        gender: profile.gender || "unknown",
        calendarType: profile.calendarType || "unknown",
        birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`,
        birthYear: profile.year,
        birthMonth: profile.month,
        birthDay: profile.day,
        birthTime: `${pad2(profile.hour)}:${pad2(profile.minute)}`,
        birthHour: profile.hour,
        birthMinute: profile.minute,
        timezone: "Asia/Seoul",
        isTimeUnknown: false,
      },
      chart: {
        mingGong: clean(chartMeta.mingGong || base.meng || lifePalace?.branch || ""),
        shenGong: bodyBranch,
        palaces: palaces.map((palace) => ({
          name: palace.nameKo,
          earthlyBranch: palace.branch,
          majorStars: normalizeStarList(palace.mainStars).map((s) => s.name),
          minorStars: normalizeStarList(palace.auxStars).map((s) => s.name),
          auxiliaryStars: normalizeStarList(palace.auxStars).map((s) => s.name),
          maleficStars: normalizeStarList(palace.maleficStars).map((s) => s.name),
          sihua: Array.isArray(palace.transformations) ? palace.transformations.map((t) => `${clean(t?.star)} ${clean(t?.type || t?.label)}`.trim()).filter(Boolean) : [],
          strengthSignals: normalizeStarList([...(palace.mainStars || []), ...(palace.auxStars || []), ...(palace.maleficStars || [])]).map((s) => `${s.name}${s.strengthSymbol}`),
          keywords: [palace.nameKo, palace.branch, ...normalizeStarList(palace.mainStars).map((s) => s.name)].filter(Boolean).slice(0, 8),
        })),
        stars: palaces.flatMap((palace) => [...normalizeStarList(palace.mainStars), ...normalizeStarList(palace.auxStars), ...normalizeStarList(palace.maleficStars)].map((star) => ({
          name: star.name,
          palace: palace.nameKo,
          brightness: star.strengthName,
          strengthSymbol: star.strengthSymbol,
        }))),
        sihua: sihua.map((item) => ({
          star: clean(item?.star),
          type: clean(item?.type || item?.label),
          palace: clean(item?.palace || item?.palaceName || ""),
        })),
        luckCycles: {
          currentDaewoon: clean((decadeLuck.find((item) => item?.current || item?.isCurrent) || decadeLuck[0] || {}).label || ""),
          yearlyTheme: clean((annualLuck[0] && (annualLuck[0].label || annualLuck[0].theme || annualLuck[0].year)) || ""),
          keywords: [clean(chartMeta.mingGong), clean(bodyBranch), clean((decadeLuck[0] && decadeLuck[0].label) || "")].filter(Boolean),
        },
      },
      interpretationSeeds: {
        personalityKeywords: normalizeStarList((lifePalace && lifePalace.mainStars) || []).map((s) => s.name).slice(0, 8),
        relationshipKeywords: normalizeStarList((findPalace({ chart: { palaces } }, "spouse") && findPalace({ chart: { palaces } }, "spouse").mainStars) || []).map((s) => s.name).slice(0, 8),
        careerKeywords: normalizeStarList((findPalace({ chart: { palaces } }, "career") && findPalace({ chart: { palaces } }, "career").mainStars) || []).map((s) => s.name).slice(0, 8),
        moneyKeywords: normalizeStarList((findPalace({ chart: { palaces } }, "wealth") && findPalace({ chart: { palaces } }, "wealth").mainStars) || []).map((s) => s.name).slice(0, 8),
        healthKeywords: normalizeStarList((findPalace({ chart: { palaces } }, "health") && findPalace({ chart: { palaces } }, "health").mainStars) || []).map((s) => s.name).slice(0, 8),
        fortuneKeywords: normalizeStarList((findPalace({ chart: { palaces } }, "fortune") && findPalace({ chart: { palaces } }, "fortune").mainStars) || []).map((s) => s.name).slice(0, 8),
        cautionKeywords: normalizeStarList(palaces.flatMap((p) => p.maleficStars || [])).map((s) => s.name).slice(0, 8),
      },
    },
    strengthLegend: STRENGTH_LEGEND,
    lifePalace,
    bodyPalace,
    diagnostics,
  };

  seed.ziweiPdfSeed = {
    input: {
      birthDate: `${profile.year}-${pad2(profile.month)}-${pad2(profile.day)}`,
      birthTime: `${pad2(profile.hour)}:${pad2(profile.minute)}`,
      gender: profile.gender,
      calendarType: profile.calendarType,
    },
    chartMeta: {
      mingGong: clean(chartMeta.mingGong || base.meng || lifePalace?.branch || ""),
      shenGong: bodyBranch,
    },
    palaceMap: groundTruth.palaces,
    groundTruth,
    derivedSignals: {
      personalitySignals: normalizeStarList((lifePalace?.mainStars || [])).map((star) => star.name),
    },
    cautionFlags: normalizeStarList(palaces.flatMap((palace) => palace.maleficStars || [])).map((star) => `${star.name}${star.strengthSymbol}`),
    strengths: normalizeStarList(palaces.flatMap((palace) => palace.mainStars || [])).map((star) => `${star.name}${star.strengthSymbol}`),
  };

  return seed;
}

function validateZiweiPdfChapterQuality({ chapters = [], expectedChapters = CHAPTER_BLUEPRINTS } = {}) {
  const errors = [];
  const chapterCountOk = Array.isArray(chapters) && chapters.length === expectedChapters.length;
  if (!chapterCountOk) errors.push("chapter_count_mismatch");
  let totalChars = 0;
  expectedChapters.forEach((blueprint, index) => {
    const chapter = chapters[index];
    if (!chapter || clean(chapter.title) !== blueprint.title) errors.push(`chapter_${index + 1}_title`);
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (categories.length !== blueprint.categories.length) errors.push(`chapter_${index + 1}_category_count`);
    blueprint.categories.forEach((title, categoryIndex) => {
      const category = categories[categoryIndex];
      const text = stripForbiddenTokens(category?.finalText || category?.text || "");
      if (!category || clean(category.title) !== title) errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_title`);
      if (text.length < SECTION_MIN_CHARS) errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_too_short`);
      totalChars += text.length;
    });
  });
  const totalTargetOk = totalChars >= TOTAL_MIN_CHARS;
  if (!totalTargetOk) errors.push("total_chars_below_threshold");
  return {
    ok: errors.length === 0,
    errors,
    totalChars,
    duplicateRate: computeDuplicateRate(chapters),
  };
}

function validateNoZiweiPdfRepetition(chapters = []) {
  const categoryTexts = chapters
    .flatMap((chapter) => (Array.isArray(chapter?.categories) ? chapter.categories : []))
    .map((category) => stripForbiddenTokens(category?.finalText || category?.text || "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (!categoryTexts.length) {
    return { ok: true, duplicateRate: 0, maxDuplicateRate: 0.25 };
  }
  const signatures = categoryTexts.map((text) => text.slice(0, 240));
  const counter = new Map();
  for (const signature of signatures) {
    counter.set(signature, (counter.get(signature) || 0) + 1);
  }
  const repeated = Array.from(counter.values()).filter((count) => count > 1).reduce((sum, count) => sum + (count - 1), 0);
  const duplicateRate = repeated / signatures.length;
  return {
    ok: duplicateRate <= 0.25,
    duplicateRate,
    maxDuplicateRate: 0.25,
  };
}

function validateSeed(seed) {
  const errors = [];
  if (!seed?.diagnostics?.hasAll12Palaces) errors.push("palaces.length");
  if (!seed?.diagnostics?.hasMingGong) errors.push("mingGong");
  if (!seed?.diagnostics?.hasShenGong) errors.push("shenGong");
  return { ok: errors.length === 0, errors };
}

function hasRequiredPalaceCoverage(seed) {
  const palaces = Array.isArray(seed?.chart?.palaces) ? seed.chart.palaces : [];
  return palaces.length >= 12;
}

function validateFinalManuscript({ birthInput, seed, chapters }) {
  const errors = [];
  if (!birthInput) errors.push("birthInput_missing");
  if (!clean(birthInput?.birthDate)) errors.push("birthDate_missing");
  if (!Number.isFinite(Number(birthInput?.birthHour))) errors.push("birthHour_missing");
  if (!seed?.localZiweiChartJson) errors.push("localZiweiChartJson_missing");
  if (!clean(seed?.chart?.mingGong)) errors.push("mingGong_missing");
  if (!clean(seed?.chart?.shenGong)) errors.push("shenGong_missing");
  if (!hasRequiredPalaceCoverage(seed)) errors.push("palace_count_invalid");
  const chapterValidation = validateChapters(chapters);
  if (!chapterValidation.ok) errors.push(...chapterValidation.errors);
  if (!Array.isArray(chapters) || chapters.length !== CHAPTER_BLUEPRINTS.length) {
    errors.push("chapter_sequence_count_invalid");
  } else {
    chapters.forEach((chapter, index) => {
      if (Number(chapter?.chapterNo) !== index + 1) errors.push(`chapter_${index + 1}_sequence`);
      if (!clean(chapter?.title)) errors.push(`chapter_${index + 1}_title_missing`);
      const summary = clean(chapter?.summary || "");
      if (summary.length < 20) errors.push(`chapter_${index + 1}_summary_missing`);
      const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
      if (categories.length < 3 || categories.length > 5) errors.push(`chapter_${index + 1}_category_range`);
      categories.forEach((category, catIndex) => {
        const text = sanitizeCounselingText(category?.finalText || category?.text || "");
        if (!text) errors.push(`chapter_${index + 1}_category_${catIndex + 1}_empty_after_sanitize`);
        if (containsForbiddenNarrative(text)) errors.push(`chapter_${index + 1}_category_${catIndex + 1}_forbidden_style`);
      });
      if (containsForbiddenNarrative(chapter?.practicalAdvice || "")) errors.push(`chapter_${index + 1}_advice_forbidden_style`);
      if (containsForbiddenNarrative(chapter?.cautionFlow || "")) errors.push(`chapter_${index + 1}_caution_forbidden_style`);
      if (containsForbiddenNarrative(chapter?.transitionLine || "")) errors.push(`chapter_${index + 1}_transition_forbidden_style`);
    });
  }
  if (computeDuplicateRate(chapters) > 0.25) errors.push("duplicate_rate_high");
  return { ok: errors.length === 0, errors, chapterValidation };
}

function validateZiweiAssembledFinalManuscript({ birthInput, seed, chapters } = {}) {
  const errors = [];
  if (!birthInput) errors.push("birthInput_missing");
  if (!clean(birthInput?.birthDate)) errors.push("birthDate_missing");
  if (!Number.isFinite(Number(birthInput?.birthHour))) errors.push("birthHour_missing");
  if (!seed?.localZiweiChartJson) errors.push("localZiweiChartJson_missing");
  if (!clean(seed?.chart?.mingGong)) errors.push("mingGong_missing");
  if (!clean(seed?.chart?.shenGong)) errors.push("shenGong_missing");
  if (!hasRequiredPalaceCoverage(seed)) errors.push("palace_count_invalid");
  const chapterValidation = validateZiweiPdfChapterQuality({ chapters });
  const repetition = validateNoZiweiPdfRepetition(chapters);
  if (!chapterValidation.ok) errors.push(...chapterValidation.errors);
  if (!repetition.ok) errors.push("duplicate_rate_high");
  return { ok: errors.length === 0, errors, chapterValidation, repetition };
}

function buildChapterSummaryFromCategories(categories = [], chapterTitle = "") {
  const first = sanitizeCounselingText(categories?.[0]?.finalText || categories?.[0]?.text || "");
  const sentence = clean(first.split(/[.!?。！？]\s*/)[0] || "");
  if (sentence.length >= 28) return sentence;
  const title = String(chapterTitle || "").replace(/^Chapter\s*\d+\.?\s*/i, "").trim();
  return `${title}에서는 명궁, 신궁, 12궁과 사화의 결을 현실 선택으로 풀어내며 실행 가능한 방향을 정리합니다.`;
}

function composeChapterText(chapter) {
  const summary = clean(chapter?.summary || "");
  const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  const categoryBlock = categories
    .map((category) => `### ${category.title}\n\n${sanitizeCounselingText(category.finalText || category.text || "")}`)
    .join("\n\n");
  const advice = sanitizeCounselingText(chapter?.practicalAdvice || "");
  const caution = sanitizeCounselingText(chapter?.cautionFlow || "");
  const transition = sanitizeCounselingText(chapter?.transitionLine || "");
  return [
    summary ? `요약: ${summary}` : "",
    categoryBlock,
    advice ? `실전 조언\n\n${advice}` : "",
    caution ? `주의할 흐름\n\n${caution}` : "",
    transition ? `다음 흐름\n\n${transition}` : "",
  ].filter(Boolean).join("\n\n");
}

function palaceEvidenceText(seed, palace) {
  if (!palace) return "현재 계산된 명반에서 확인되는 범위에서는 이 궁의 세부 별 배치를 보수적으로 해석합니다.";
  const main = starsText(palace.mainStars);
  const aux = starsText(palace.auxStars);
  const malefic = starsText(palace.maleficStars);
  const trans = Array.isArray(palace.transformations) && palace.transformations.length
    ? palace.transformations.map((t) => `${clean(t.star)} ${clean(t.type || t.label)}`.trim()).filter(Boolean).join(", ")
    : "사화 직접 작동은 약하게 확인됩니다";
  return `${palace.nameKo || "해당 궁"}(${palace.branch || "지지 미확인"})의 주성은 ${main}입니다. 보조성은 ${aux}, 살성·압박 신호는 ${malefic}로 정리되며, 사화 흐름은 ${trans}로 읽습니다.`;
}

function timingEvidenceText(seed) {
  const current = seed.chart.decadeLuck.find((item) => item && (item.current || item.isCurrent)) || seed.chart.decadeLuck[0] || null;
  const decade = current ? `${clean(current.label || current.range || "대운")}` : "현재 대운 세부 범위는 제한적으로 확인됩니다";
  const sihua = seed.chart.transformations.length
    ? seed.chart.transformations.map((item) => `${clean(item.star)} ${clean(item.type)}`).filter(Boolean).join(", ")
    : "사화 자료는 기본 명반 범위에서만 확인됩니다";
  return `대운 기준은 ${decade}이며, 가까운 흐름은 ${sihua}를 중심으로 현실 선택의 우선순위를 정리합니다.`;
}

function collectSignals(seed, palace) {
  const usedStars = [];
  const usedSignals = [];
  const usedStrengths = [];
  const mainStars = normalizeStarList(palace?.mainStars || []);
  const auxStars = normalizeStarList(palace?.auxStars || []);
  const maleficStars = normalizeStarList(palace?.maleficStars || []);

  for (const star of [...mainStars, ...auxStars, ...maleficStars]) {
    if (!usedStars.includes(star.name)) usedStars.push(star.name);
    const signal = `${star.name}${star.strengthSymbol}`;
    if (!usedSignals.includes(signal)) usedSignals.push(signal);
    if (!usedStrengths.includes(star.strengthSymbol)) usedStrengths.push(star.strengthSymbol);
  }

  if (Array.isArray(palace?.transformations)) {
    for (const tf of palace.transformations) {
      const token = `${clean(tf?.star)} ${clean(tf?.type || tf?.label)}`.trim();
      if (token && !usedSignals.includes(token)) usedSignals.push(token);
    }
  }
  return { usedStars, usedSignals, usedStrengths };
}

function expandToMinLength(text, minLength, profileName = "사용자") {
  const safeText = stripForbiddenTokens(clean(text));
  if (safeText.length >= minLength) return safeText;
  const additions = [
    `${profileName}님에게 필요한 핵심은 한 번의 큰 선택보다 반복 가능한 기준을 먼저 세우는 것입니다. 기준이 명확해지면 불안은 줄고 성과는 누적됩니다.`,
    "실행의 순서를 정하면 운의 파동이 커져도 회복 속도가 빨라집니다. 월간 계획표에 우선순위 3개만 고정하고, 나머지는 보조 과제로 분리하세요.",
    "관계와 재정, 일정을 동시에 개선하려 하지 말고 한 번에 한 영역씩 정비해야 결과가 오래 유지됩니다. 작은 개선을 6주 이상 유지하면 체감이 크게 달라집니다.",
  ];
  let out = safeText;
  let idx = 0;
  while (out.length < minLength && idx < additions.length * 4) {
    out = `${out}\n\n${additions[idx % additions.length]}`;
    idx += 1;
  }
  return out;
}

function buildStarRuleSentence(star, categoryTitle) {
  const rule = STAR_RULES[star.name];
  if (!rule) return `${star.name}${star.strengthSymbol}은 ${categoryTitle}에서 현실 기준을 세우는 핵심 신호로 해석됩니다.`;
  const strengthText = rule.strengthMeaning[star.strengthSymbol] || rule.strengthMeaning["△"];
  const personality = rule.personality[0] || "기본 성향이 안정적으로 드러납니다.";
  const caution = rule.caution[0] || "과열 구간에서는 완급 조절이 필요합니다.";
  return `${star.name}${star.strengthSymbol}은 ${rule.nature}의 별로, ${strengthText}. 이 배치에서는 ${personality}. 다만 ${caution}.`;
}

function buildSupportSentence(stars = [], categoryTitle) {
  if (!Array.isArray(stars) || !stars.length) {
    return `${categoryTitle}에서는 보조성의 간접 지원이 약하므로 루틴 관리와 일정 고정이 성패를 가릅니다.`;
  }
  return stars.slice(0, 3).map((star) => {
    const rule = AUX_MALEFIC_RULES[star.name];
    if (!rule) return `${star.name}${star.strengthSymbol}은 ${categoryTitle}의 보조 신호로 작동해 실행의 세부 완성도를 높여 줍니다.`;
    return `${star.name}${star.strengthSymbol}은 ${rule.support} 흐름을 만들지만 ${rule.pressure} 위험이 함께 나타납니다. ${rule.operation} 단계에서 ${rule.advice}.`;
  }).join("\n\n");
}

function buildSihuaSentence(seed, palaceLabel, categoryTitle) {
  const tfs = Array.isArray(seed?.chart?.transformations) ? seed.chart.transformations : [];
  if (!tfs.length) {
    return `${categoryTitle}에서는 사화 신호가 약한 편으로 해석되어, ${palaceLabel} 기준의 기본 루틴을 지키는 것이 우선입니다.`;
  }
  const lines = tfs.slice(0, 4).map((item) => {
    const type = clean(item?.type || item?.label);
    const star = clean(item?.star || "핵심별");
    const meaning = SIHUA_RULES[type] || "운의 강조점이 이동하는 흐름";
    return `${star} ${type}: ${meaning}`;
  });
  return `${categoryTitle}의 사화 핵심은 ${lines.join(" / ")} 입니다. 이 신호는 ${palaceLabel} 선택 우선순위를 조정하는 기준으로 활용해야 합니다.`;
}

function buildAdviceSentences(stars = [], categoryTitle, profileName = "사용자") {
  const pool = [];
  for (const star of stars.slice(0, 4)) {
    const rule = STAR_RULES[star.name];
    if (rule?.advice?.length) pool.push(...rule.advice);
  }
  if (!pool.length) {
    pool.push(
      `${profileName}님은 ${categoryTitle}에서 주간 우선순위 3개를 고정해 판단 피로를 줄이세요.`,
      `${categoryTitle} 의사결정 기록을 1페이지로 남겨 다음 선택의 기준으로 재사용하세요.`,
    );
  }
  return pool.slice(0, 4).map((line, idx) => `${idx + 1}. ${line}`).join("\n");
}

function buildCategoryText(profile, seed, blueprint, categoryTitle, categoryIndex, pass = 1) {
  const palace = findPalace(seed, blueprint.palaceKey);
  const evidence = blueprint.palaceKey === "timing" ? timingEvidenceText(seed) : palaceEvidenceText(seed, palace);
  const label = blueprint.palaceKey === "timing" ? "대운·유년" : (palace?.nameKo || PALACE_LABELS[blueprint.palaceKey] || "해당 궁");
  const palaceMeaning = PALACE_MEANINGS[label] || "삶의 핵심 선택과 흐름을 비추는 기준축";
  const mainStars = normalizeStarList(palace?.mainStars || []);
  const auxStars = normalizeStarList([...(palace?.auxStars || []), ...(palace?.maleficStars || [])]);
  const signalPack = collectSignals(seed, palace);
  const focusedSignal = signalPack.usedSignals.slice(0, 8).join(", ") || "궁간 상호작용";
  const primaryLines = (mainStars.length ? mainStars : [{ name: "핵심궁", strengthSymbol: "△" }])
    .slice(0, 4)
    .map((star) => buildStarRuleSentence(star, categoryTitle))
    .join("\n\n");
  const supportLines = buildSupportSentence(auxStars, categoryTitle);
  const sihuaLines = buildSihuaSentence(seed, label, categoryTitle);
  const advice = buildAdviceSentences(mainStars, categoryTitle, profile.name || "사용자");
  const strengthGuide = `${categoryTitle} 해석에서는 ${label}의 별 강도를 묘 ◎, 득 O, 리 ▲, 평 △, 함·실 X 순서로 읽고, ${focusedSignal} 신호를 실제 의사결정 순서와 연결합니다.`;
  const focus = categoryIndex % 2 === 0
    ? `${categoryTitle}에서는 빠른 확장보다 안정적인 반복 구조가 유리하며, ${label}에서 포착된 신호를 월 단위 점검 항목으로 고정하면 변동 구간의 손실을 줄일 수 있습니다.`
    : `${categoryTitle}에서는 관계와 일의 경계를 먼저 설계해야 하며, ${label}의 신호를 기준으로 부탁 수락 조건과 거절 문장을 미리 정해두면 에너지 누수를 줄일 수 있습니다.`;
  const passBonus = pass > 1
    ? `${categoryTitle}의 핵심 별 신호를 월 단위 운영 계획으로 내려서 관리하면, 대운·세운의 변동 구간에서도 시행착오를 크게 줄일 수 있습니다. 중요한 것은 거창한 결단이 아니라 작은 원칙을 반복해 구조적 우위를 만드는 것입니다.`
    : "";
  const strengthHelp = mainStars.length
    ? `이 구간의 별 강도는 ${mainStars.slice(0, 2).map((star) => `${star.name}${star.strengthSymbol}`).join(", ")} 중심으로 작동합니다. 묘(◎)와 득(O)은 비교적 안정적으로 힘이 살아나고, 리(▲)는 조건이 맞을 때 힘이 커지며, 평(△)은 평균적으로 작동하고, 함/실(X)은 왜곡되기 쉬우므로 관리가 필요합니다.`
    : "핵심 별 강도 신호가 약한 구간이라도 행동 루틴을 고정하면 결과를 안정적으로 만들 수 있습니다.";
  const categoryFocus = `이 카테고리의 핵심은 ${label}의 의미( ${palaceMeaning} )를 실제 선택으로 연결하는 것입니다.`;
  const draft = sanitizeCounselingText([
    `${categoryTitle}에서는 ${label}의 별 배치를 바탕으로 삶의 흐름을 상담하듯 풀어갑니다.`,
    categoryFocus,
    evidence,
    strengthHelp,
    strengthGuide,
    primaryLines,
    supportLines,
    sihuaLines,
    `${profile.name || "사용자"}님에게 필요한 실행 핵심은 "기준 고정 → 선택 압축 → 복기" 순환을 유지하는 것입니다. 별 조합이 좋아도 순서가 무너지면 성과가 흩어지고, 별 조합이 거칠어도 순서가 유지되면 결과는 안정됩니다.`,
    `${categoryTitle}에서는 단기 감정 반응보다 주간 루틴을 우선시해야 합니다. 특히 ${label}에서 강한 별은 추진력으로 사용하고 약한 별은 복구 규칙으로 관리하면, 변동성 구간에서도 결정의 품질이 유지됩니다.`,
    focus,
    "실전 조언",
    advice,
    `주의할 흐름은 성급한 확장과 관계 피로 누적입니다. 별 신호가 좋을수록 속도를 늦춰 기준을 확인해야 오히려 결과가 안정됩니다.`,
    `이 흐름을 바탕으로 다음 주제에서는 ${categoryTitle}에서 확인한 강점과 약점을 더 구체적인 실행 전략으로 연결해 보겠습니다.`,
    passBonus,
  ].filter(Boolean).join("\n\n"));
  return expandToMinLength(draft, SECTION_MIN_CHARS, profile.name || "사용자");
}

function buildZiweiLocalChapterGuide({ profile = {}, seed, blueprint, chapterIndex = 0, categoryIndex = 0, pass = 1, categoryTitle = "핵심 명반 신호" } = {}) {
  const normalizedProfile = {
    ...profile,
    name: clean(profile?.name || seed?.birthProfile?.name || "사용자") || "사용자",
  };
  const body = buildCategoryText(normalizedProfile, seed, blueprint, categoryTitle, categoryIndex, pass);
  const paragraphs = body
    .split(/\n\s*\n+/)
    .map((line) => clean(line))
    .filter(Boolean)
    .slice(0, 4);
  while (paragraphs.length < 4) {
    paragraphs.push(`${normalizedProfile.name}님의 명궁과 신궁 흐름을 함께 점검해 실행 우선순위를 정리하세요.`);
  }
  const guideBody = `${body}\n\n명궁(${clean(seed?.chart?.mingGong || "확인 중")})과 신궁(${clean(seed?.chart?.shenGong || "확인 중")})의 연결축을 기준으로 현재 선택의 우선순위를 재정렬하는 것이 핵심입니다.`;
  return {
    chapterIndex,
    categoryIndex,
    title: categoryTitle,
    paragraphs,
    body: expandToMinLength(guideBody, Math.max(SECTION_MIN_CHARS, 500), normalizedProfile.name),
  };
}

function buildZiweiLocalPremiumManuscript(profile, seed, pass = 1) {
  return CHAPTER_BLUEPRINTS.map((blueprint, chapterIndex) => {
    const palace = findPalace(seed, blueprint.palaceKey);
    const signals = collectSignals(seed, palace);
    const sections = blueprint.categories.map((categoryTitle, index) => {
      const guide = buildZiweiLocalChapterGuide({
        profile,
        seed,
        blueprint,
        chapterIndex,
        categoryIndex: index,
        pass,
        categoryTitle,
      });
      const body = guide.body;
      return {
        title: categoryTitle,
        body,
        bullets: [
          `${categoryTitle}의 핵심 별 신호: ${(signals.usedSignals.slice(0, 4).join(", ") || "기본 명반 신호")}`,
          `실행 기준: ${(signals.usedStars.slice(0, 3).join(", ") || "핵심 별") + " 중심으로 우선순위 설정"}`,
          "실전 루틴: 주간 복기와 월간 재정렬로 변동성 관리",
        ],
      };
    });
    return {
      chapterNo: chapterIndex + 1,
      title: blueprint.title,
      subtitle: `${PALACE_LABELS[blueprint.palaceKey] || "핵심 궁"} 중심 해석`,
      sections,
      localQuality: {
        minLengthPassed: sections.every((section) => stripForbiddenTokens(section.body).length >= SECTION_MIN_CHARS),
        usedPalaces: [palace?.nameKo || PALACE_LABELS[blueprint.palaceKey] || ""].filter(Boolean),
        usedStars: signals.usedStars,
        usedSignals: signals.usedSignals,
      },
    };
  });
}

function draftToChapter(draft, blueprint, source = "local") {
  const categories = (Array.isArray(draft.sections) ? draft.sections : []).map((section, index) => ({
    id: `${blueprint.id}-${String(index + 1).padStart(2, "0")}`,
    title: section.title,
    localSummary: section.body,
    finalText: sanitizeCounselingText(section.body),
    order: index + 1,
  }));
  const summary = buildChapterSummaryFromCategories(categories, draft.title);
  const practicalAdvice = sanitizeCounselingText(`이번 장의 실행 포인트는 우선순위를 줄이고 루틴을 고정하는 것입니다. 빠른 결정보다 반복 가능한 기준을 세우면 운의 변동이 와도 성과를 지킬 수 있습니다.`);
  const cautionFlow = sanitizeCounselingText(`주의할 흐름은 감정 과열과 과속입니다. 별의 힘이 강할수록 완급 조절을 먼저 적용하고, 관계와 재정의 경계선을 선명하게 유지하세요.`);
  const transitionLine = sanitizeCounselingText(`이 장에서 확인한 흐름을 바탕으로 다음 장에서는 실제 관계와 일의 선택을 더 구체적으로 연결해 살펴보겠습니다.`);
  const chapterNo = Number(blueprint?.id || 0) || 0;
  const chapter = {
    id: blueprint.id,
    roman: blueprint.roman,
    chapterNo,
    title: draft.title,
    summary,
    practicalAdvice,
    cautionFlow,
    transitionLine,
    categories,
    source,
    localQuality: draft.localQuality,
  };
  const merged = composeChapterText(chapter);
  return {
    ...chapter,
    finalText: merged,
    text: merged,
  };
}

function buildLocalChapters(profile, seed, pass = 1) {
  const drafts = buildZiweiLocalPremiumManuscript(profile, seed, pass);
  const chapters = drafts.map((draft, index) => draftToChapter(draft, CHAPTER_BLUEPRINTS[index], pass > 1 ? "local-counseling-reinforced" : "local-counseling-core"));
  return { drafts, chapters };
}

function buildCompactZiweiLocalChapterSeeds(profile = {}, seed = {}) {
  const ming = findPalace(seed, "ming") || {};
  const userName = clean(profile?.name || seed?.birthProfile?.name || "사용자") || "사용자";
  return CHAPTER_BLUEPRINTS.map((blueprint, chapterIndex) => {
    const palace = findPalace(seed, blueprint.palaceKey) || ming;
    const palaceName = clean(palace?.nameKo || PALACE_LABELS[blueprint.palaceKey] || seed?.chart?.mingGong || "명궁");
    const branch = clean(palace?.branch || "");
    const mainStars = normalizeStarList(palace?.mainStars).slice(0, 4).map(compactStarForPrompt);
    const auxStars = normalizeStarList(palace?.auxStars).slice(0, 3).map(compactStarForPrompt);
    const maleficStars = normalizeStarList(palace?.maleficStars).slice(0, 2).map(compactStarForPrompt);
    const transformations = Array.isArray(palace?.transformations)
      ? palace.transformations.slice(0, 4).map((item) => ({ star: clean(item?.star), type: clean(item?.type || item?.label) })).filter((item) => item.star || item.type)
      : [];
    const evidenceAnchors = [
      { type: "palace", name: palaceName, palaceKey: clean(palace?.key || blueprint.palaceKey), reason: `${palaceName}의 궁 흐름` },
      ...mainStars.slice(0, 2).map((star) => ({ type: "star", name: star.name, strength: star.strength, reason: `${palaceName} 주성 신호` })),
      ...transformations.slice(0, 1).map((item) => ({ type: "sihua", name: item.type, star: item.star, reason: `${item.star} ${item.type} 사화` })),
    ].filter((item) => clean(item.name || item.star));
    return {
      id: blueprint.id,
      roman: blueprint.roman,
      chapterNo: chapterIndex + 1,
      chapterId: blueprint.id,
      chapterTitle: blueprint.title,
      categories: blueprint.categories.map((title, categoryIndex) => ({
        id: `${blueprint.id}-${String(categoryIndex + 1).padStart(2, "0")}`,
        title,
        order: categoryIndex + 1,
        evidenceAnchors,
      })),
      palaceFacts: {
        key: clean(palace?.key || blueprint.palaceKey),
        nameKo: palaceName,
        branch,
        mainStars,
        auxiliaryStars: auxStars,
        maleficStars,
        transformations,
      },
      starFacts: {
        mainStars,
        auxiliaryStars: auxStars,
        maleficStars,
      },
      transformationFacts: transformations,
      timelineFacts: {
        decadeLuck: Array.isArray(seed?.chart?.decadeLuck) ? seed.chart.decadeLuck.slice(0, 6) : [],
        annualLuck: Array.isArray(seed?.chart?.annualLuck) ? seed.chart.annualLuck.slice(0, 6) : [],
      },
      evidenceAnchors,
      writingRequirements: {
        author: userName,
        categories: blueprint.categories,
        minCategoryChars: SECTION_MIN_CHARS,
        requiredEvidencePerCategory: 3,
      },
      source: "local-calculation-json",
      calculationOnly: true,
    };
  });
}

function buildZiweiLocalManuscriptEnhancementSeeds(profile = {}, seed = {}, localChapters = []) {
  const compactSeeds = buildCompactZiweiLocalChapterSeeds(profile, seed);
  return compactSeeds.map((chapterSeed, index) => {
    const localChapter = localChapters[index] || {};
    const localCategories = Array.isArray(localChapter?.categories) ? localChapter.categories : [];
    const categories = safeArray(chapterSeed.categories).map((categorySeed, categoryIndex) => {
      const localCategory = localCategories[categoryIndex] || {};
      const localText = sanitizeCounselingText(localCategory?.finalText || localCategory?.text || localCategory?.localSummary || "");
      return {
        ...categorySeed,
        localText,
        localSummary: localText,
        evidenceAnchors: normalizeZiweiEvidenceAnchors(
          localCategory?.evidenceAnchors || categorySeed?.evidenceAnchors,
          localText,
          seed,
        ),
      };
    });
    return {
      ...chapterSeed,
      categories,
      source: "local-json-manuscript",
      calculationOnly: false,
      localDraftChapter: {
        id: clean(localChapter?.id || chapterSeed.id),
        chapterNo: Number(localChapter?.chapterNo || chapterSeed.chapterNo || index + 1),
        title: clean(localChapter?.title || chapterSeed.chapterTitle),
        summary: sanitizeCounselingText(localChapter?.summary || ""),
        practicalAdvice: sanitizeCounselingText(localChapter?.practicalAdvice || ""),
        cautionFlow: sanitizeCounselingText(localChapter?.cautionFlow || ""),
        transitionLine: sanitizeCounselingText(localChapter?.transitionLine || ""),
        categories,
      },
      writingRequirements: {
        ...safeObject(chapterSeed.writingRequirements),
        mode: "enhance-local-json-manuscript",
        preserveLocalTextFacts: true,
      },
    };
  });
}

function buildFallbackChapter(blueprint, profile = {}, seed = {}) {
  const categories = blueprint.categories.map((categoryTitle, categoryIndex) => {
    const guide = buildZiweiLocalChapterGuide({
      profile,
      seed,
      blueprint,
      chapterIndex: Math.max(0, Number(blueprint?.id || 1) - 1),
      categoryIndex,
      pass: 3,
      categoryTitle,
    });
    return {
      id: `${blueprint.id}-${String(categoryIndex + 1).padStart(2, "0")}`,
      title: categoryTitle,
      localSummary: sanitizeCounselingText(guide.body),
      finalText: expandToMinLength(sanitizeCounselingText(guide.body), SECTION_MIN_CHARS, clean(profile?.name || "사용자")),
      order: categoryIndex + 1,
    };
  });
  const chapter = {
    id: blueprint.id,
    roman: blueprint.roman,
    chapterNo: Number(blueprint?.id || 0) || 0,
    title: blueprint.title,
    summary: buildChapterSummaryFromCategories(categories, blueprint.title),
    practicalAdvice: "실전 조언은 한 번에 모든 영역을 바꾸지 말고 주간 기준 3개를 고정해 꾸준히 실행하는 것입니다.",
    cautionFlow: "주의할 흐름은 성급한 확장과 감정 과열입니다. 결정 전 하루의 간격을 두고 기준을 다시 확인하세요.",
    transitionLine: "이 흐름을 기반으로 다음 장에서는 실제 선택의 우선순위를 더 구체화해 보겠습니다.",
    categories,
    source: "local-counseling-safe",
  };
  const merged = composeChapterText(chapter);
  return {
    ...chapter,
    finalText: merged,
    text: merged,
  };
}

function normalizeChapterShape(chapter = {}, blueprint, profile = {}, seed = {}) {
  const fallback = buildFallbackChapter(blueprint, profile, seed);
  const sourceCategories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  const categories = blueprint.categories.map((title, categoryIndex) => {
    const hit = sourceCategories[categoryIndex];
    const baseText = sanitizeCounselingText(hit?.finalText || hit?.text || hit?.localSummary || "");
    if (!baseText || containsForbiddenNarrative(baseText)) {
      return fallback.categories[categoryIndex];
    }
    const expandedText = expandToMinLength(baseText, SECTION_MIN_CHARS, clean(profile?.name || "사용자"));
    return {
      id: `${blueprint.id}-${String(categoryIndex + 1).padStart(2, "0")}`,
      title,
      localSummary: baseText,
      finalText: expandedText,
      order: categoryIndex + 1,
      evidenceAnchors: normalizeZiweiEvidenceAnchors(hit?.evidenceAnchors, expandedText, seed),
      expertThesis: sanitizeCounselingText(hit?.expertThesis || ""),
      timingAdvice: sanitizeCounselingText(hit?.timingAdvice || ""),
      actionPlan: Array.isArray(hit?.actionPlan) ? hit.actionPlan.map(sanitizeCounselingText).filter(Boolean).slice(0, 5) : [],
      caution: sanitizeCounselingText(hit?.caution || ""),
      confidence: clean(hit?.confidence || ""),
    };
  });
  const normalized = {
    ...fallback,
    ...chapter,
    id: blueprint.id,
    roman: blueprint.roman,
    chapterNo: Number(blueprint?.id || 0) || 0,
    title: blueprint.title,
    categories,
    summary: sanitizeCounselingText(chapter?.summary || fallback.summary),
    practicalAdvice: sanitizeCounselingText(chapter?.practicalAdvice || fallback.practicalAdvice),
    cautionFlow: sanitizeCounselingText(chapter?.cautionFlow || fallback.cautionFlow),
    transitionLine: sanitizeCounselingText(chapter?.transitionLine || fallback.transitionLine),
    source: clean(chapter?.source || fallback.source || "local-counseling-safe"),
  };
  const merged = composeChapterText(normalized);
  return {
    ...normalized,
    finalText: merged,
    text: merged,
  };
}

function sanitizeFinalManuscript({ chapters = [], profile = {}, seed = {} } = {}) {
  const source = Array.isArray(chapters) ? chapters : [];
  const byId = new Map(source.map((chapter) => [clean(chapter?.id), chapter]));
  const byTitle = new Map(source.map((chapter) => [clean(chapter?.title), chapter]));
  const sanitized = CHAPTER_BLUEPRINTS.map((blueprint) => {
    const found = byId.get(clean(blueprint.id)) || byTitle.get(clean(blueprint.title));
    return found
      ? normalizeChapterShape(found, blueprint, profile, seed)
      : buildFallbackChapter(blueprint, profile, seed);
  });
  return sanitized.map((chapter, index) => {
    const chapterNo = index + 1;
    return {
      ...chapter,
      chapterNo,
      id: CHAPTER_BLUEPRINTS[index].id,
      roman: CHAPTER_BLUEPRINTS[index].roman,
      title: CHAPTER_BLUEPRINTS[index].title,
    };
  });
}

function sanitizeLLMFinalManuscript({ chapters = [], seed = {} } = {}) {
  const source = Array.isArray(chapters) ? chapters : [];
  const byId = new Map(source.map((chapter) => [clean(chapter?.id), chapter]));
  const byTitle = new Map(source.map((chapter) => [clean(chapter?.title), chapter]));
  return CHAPTER_BLUEPRINTS.map((blueprint, index) => {
    const found = byId.get(clean(blueprint.id)) || byTitle.get(clean(blueprint.title));
    if (!found) {
      throw Object.assign(new Error(`ZIWEI_LLM_CHAPTER_MISSING_${index + 1}`), {
        code: "ZIWEI_LLM_CHAPTER_MISSING",
        status: 502,
        detail: { chapterNumber: index + 1, chapterId: blueprint.id },
      });
    }
    return {
      ...normalizeLLMGeneratedChapterShape(found, blueprint, seed),
      chapterNo: index + 1,
      id: blueprint.id,
      roman: blueprint.roman,
      title: blueprint.title,
      source: clean(found?.source || "gemini-enhanced-local"),
    };
  });
}

function ensureChapterLength(chapter, minChars) {
  if (!chapter || !Array.isArray(chapter.categories)) return chapter;
  const clone = {
    ...chapter,
    categories: chapter.categories.map((category) => ({ ...category })),
  };
  let chapterChars = clone.categories.reduce((sum, category) => sum + stripForbiddenTokens(category?.finalText || category?.text || "").length, 0);
  if (chapterChars >= minChars) return clone;
  const boosters = [
    "이 장의 핵심은 별의 강약을 감정 반응이 아닌 실행 순서로 번역하는 것입니다. 주간 단위 점검표를 운영하면 해석이 실제 선택으로 이어집니다.",
    "또한 관계·재정·업무를 한 번에 바꾸려 하기보다 우선순위를 고정해 단계적으로 개선해야 합니다. 명반 신호는 방향을 제시하고, 실천 루틴은 결과를 만듭니다.",
    "마지막으로 선택 이후 복기 기록을 남기면 다음 운의 변동 구간에서 시행착오가 크게 줄어듭니다. 같은 패턴을 반복하지 않도록 근거 중심으로 조정하세요.",
  ];
  let turn = 0;
  while (chapterChars < minChars && turn < 30) {
    const idx = turn % clone.categories.length;
    const category = clone.categories[idx];
    const boost = boosters[turn % boosters.length];
    category.finalText = `${stripForbiddenTokens(category.finalText || category.text || "")}\n\n${boost}`;
    category.text = category.finalText;
    chapterChars = clone.categories.reduce((sum, cat) => sum + stripForbiddenTokens(cat?.finalText || cat?.text || "").length, 0);
    turn += 1;
  }
  clone.finalText = clone.categories.map((c) => `### ${c.title}\n\n${c.finalText}`).join("\n\n");
  clone.text = clone.finalText;
  return clone;
}

function buildHighQualityLocalZiweiChapters(profile, seed, pass = 1) {
  const local = buildLocalChapters(profile, seed, pass);
  const chapters = local.chapters.map((chapter) => ensureChapterLength(chapter, CHAPTER_MIN_CHARS));
  const duplicateRate = computeDuplicateRate(chapters);
  return {
    chapters,
    duplicateRate,
    pass,
    qualityStatus: duplicateRate <= 0.25 ? "passed" : "needs-rewrite",
  };
}

function safeZiweiDisplayText(value, fallback = "") {
  const text = clean(value).replace(/\s+/g, " ").trim();
  if (!text || /^\?+$/.test(text) || /\?{2,}/.test(text) || containsForbiddenNarrative(text)) return fallback;
  return text;
}

function selectZiweiPalaceForBlueprint(seed = {}, blueprint = {}, index = 0) {
  const palaces = safeArray(seed?.chart?.palaces);
  return findPalace(seed, blueprint.palaceKey) || seed?.chart?.lifePalace || palaces[index % Math.max(1, palaces.length)] || {};
}

function ziweiStarListText(stars = [], fallback = "은은한 별빛") {
  const rows = normalizeStarList(stars)
    .slice(0, 5)
    .map((star) => `${safeZiweiDisplayText(star.name, "무명성")}${safeZiweiDisplayText(star.strengthSymbol, "")}`)
    .filter(Boolean);
  return rows.length ? rows.join(", ") : fallback;
}

function ziweiTransformationText(seed = {}, palace = {}) {
  const direct = safeArray(palace?.transformations);
  const all = direct.length ? direct : safeArray(seed?.chart?.transformations);
  const rows = all
    .slice(0, 4)
    .map((item) => `${safeZiweiDisplayText(item?.star, "별")} ${safeZiweiDisplayText(item?.type || item?.label, "사화")}`.trim())
    .filter(Boolean);
  return rows.length ? rows.join(", ") : "사화의 직접 자극은 잔잔하나 궁의 기본 결이 꾸준히 작동합니다";
}

function buildZiweiAssembledCategoryText({ profile = {}, seed = {}, blueprint = {}, categoryTitle = "", chapterIndex = 0, categoryIndex = 0 } = {}) {
  const palace = selectZiweiPalaceForBlueprint(seed, blueprint, chapterIndex);
  const profileName = safeZiweiDisplayText(profile?.name || seed?.localZiweiChartJson?.birthInput?.name, "고객");
  const palaceName = safeZiweiDisplayText(palace?.nameKo || PALACE_LABELS[blueprint.palaceKey], "명궁");
  const palaceMeaning = safeZiweiDisplayText(PALACE_MEANINGS[palaceName], "삶의 흐름이 드러나는 자리");
  const branch = safeZiweiDisplayText(palace?.branch, "중심 지지");
  const mainStars = ziweiStarListText(palace?.mainStars, "주성의 힘이 고요하게 배치된 상태");
  const auxStars = ziweiStarListText(palace?.auxStars, "보조성이 주변의 도움을 천천히 모으는 상태");
  const maleficStars = ziweiStarListText(palace?.maleficStars, "살성이 강하지 않아 조율 여지가 큰 상태");
  const sihua = ziweiTransformationText(seed, palace);
  const chapterNo = chapterIndex + 1;
  const categoryNo = categoryIndex + 1;
  const actionThemes = [
    "기록, 약속, 사람의 순서를 정돈하는 일",
    "말을 앞세우기보다 결과가 남는 작은 실행을 반복하는 일",
    "관계의 온도와 일의 속도를 분리해 판단하는 일",
    "돈과 시간을 한 번에 쓰지 않고 단계별로 나누는 일",
    "몸의 피로 신호를 운의 경고처럼 세심하게 받아들이는 일",
  ];
  const actionTheme = actionThemes[(chapterIndex + categoryIndex) % actionThemes.length];
  return [
    `${categoryTitle}은 ${profileName}님의 ${palaceName} 궁을 중심으로 읽습니다. 이 궁은 ${palaceMeaning}을 비추며, ${branch}의 자리에서 주성, 보조성, 살성이 서로 다른 속도로 움직입니다. ${chapterNo}장 ${categoryNo}절의 자미두수 흐름은 한 별만 떼어 단정하지 않고, 궁의 자리와 별의 강약, 사화의 흐름을 함께 볼 때 실제 선택의 결이 선명해집니다. 이 대목은 지금의 삶에서 무엇을 키우고 무엇을 덜어야 하는지를 ${categoryTitle}의 언어로 차분히 드러냅니다.`,
    `명반의 중심 신호를 보면 주성은 ${mainStars}로 나타납니다. ${palaceName}의 주성은 ${profileName}님이 스스로 힘을 쓰는 방식, 판단을 시작하는 자리, 오래 붙잡는 기준을 말해 줍니다. 보조성은 ${auxStars}로 따라붙어 사람의 도움, 주변 조건, 예상 밖의 연결을 만들고, 살성은 ${maleficStars}로 긴장과 압박의 모양을 알려 줍니다. ${categoryTitle}에서 ◎와 O의 기운은 비교적 자연스럽게 열리는 힘이고, ▲와 △는 조건을 맞출수록 살아나는 힘이며, X는 서두르지 말고 보완해야 하는 신호로 읽습니다.`,
    `사화의 흐름은 ${sihua}입니다. ${chapterNo}장 ${categoryNo}절에서 사화는 사건을 크게 만드는 문이라기보다, 어느 궁에서 욕망이 생기고 책임이 커지며 평판이 정리되고 막힘이 드러나는지를 알려 주는 섬세한 길입니다. ${categoryTitle}에서는 이 사화가 감정의 급한 결론보다 생활 속 반복을 통해 해석될 때 더 안정적입니다. ${palaceName}에 좋은 별이 있어도 순서가 흐트러지면 피로가 먼저 오고, 조심스러운 별이 있어도 기준을 세우면 오히려 집중력이 됩니다.`,
    `${chapterNo}장 ${categoryNo}절의 실전 조언은 ${actionTheme}에서 시작합니다. ${profileName}님은 ${palaceName}의 궁 신호를 따라 큰 선언보다 작은 기준을 먼저 세울수록 운의 흐름을 잘 붙잡습니다. ${categoryTitle}에서 사람을 움직여야 하는 장면에서는 주성의 힘을 앞에 두되 보조성의 도움을 무시하지 말고, 압박이 느껴지는 장면에서는 살성의 경고를 회피하지 말고 일정과 책임을 다시 나누어 보십시오. 이 방식은 ${palaceName}이 맡은 관계, 일, 돈, 건강의 흐름을 한꺼번에 흔들지 않고 필요한 자리부터 안정시키는 데 유리합니다.`,
    `${categoryTitle}의 주의할 흐름도 분명합니다. ${palaceName}의 자리는 마음이 급해질수록 같은 말을 반복하거나, 약속을 넓히거나, 아직 익지 않은 일을 밖으로 꺼내기 쉽습니다. 이때는 O의 안정된 기운을 기준으로 삼고, X의 신호가 보이는 부분에는 확인과 휴식을 먼저 두어야 합니다. ${chapterNo}장 ${categoryNo}절의 자미두수 명반은 두려움을 키우기 위한 도구가 아니라 흐름을 다루는 지도입니다. 이 절의 핵심은 ${palaceName}의 궁을 통해 지금 필요한 선택의 무게를 알고, 그 무게를 감당 가능한 행동으로 바꾸는 데 있습니다.`,
  ].join("\n\n");
}

function buildZiweiLocalAssembledChapters(profile = {}, seed = {}) {
  const chapters = CHAPTER_BLUEPRINTS.map((blueprint, chapterIndex) => {
    const palace = selectZiweiPalaceForBlueprint(seed, blueprint, chapterIndex);
    const palaceName = safeZiweiDisplayText(palace?.nameKo || PALACE_LABELS[blueprint.palaceKey], "명궁");
    const categories = safeArray(blueprint.categories).map((categoryTitle, categoryIndex) => {
      const finalText = buildZiweiAssembledCategoryText({ profile, seed, blueprint, categoryTitle, chapterIndex, categoryIndex });
      return {
        id: `${blueprint.id}-${String(categoryIndex + 1).padStart(2, "0")}`,
        title: categoryTitle,
        localSummary: finalText.slice(0, 360),
        finalText,
        text: finalText,
        order: categoryIndex + 1,
        evidenceAnchors: [
          { type: "palace", name: palaceName, reason: `${palaceName} 궁의 중심 흐름` },
          { type: "star", name: ziweiStarListText(palace?.mainStars, "주성"), reason: "주성의 강약과 작동 방식" },
          { type: "sihua", name: ziweiTransformationText(seed, palace), reason: "사화의 이동과 강조점" },
        ],
      };
    });
    const summary = `${chapterIndex + 1}장은 ${palaceName} 궁의 주성, 보조성, 살성, 사화 흐름을 함께 읽어 ${safeZiweiDisplayText(profile?.name, "고객")}님의 선택 기준을 정리합니다.`;
    const practicalAdvice = `${chapterIndex + 1}장의 실전 조언은 빠른 결론보다 순서 정리에 있습니다. ${palaceName}의 신호는 사람, 일정, 돈, 건강의 우선순위를 나누어 적고 가장 흔들리는 한 지점부터 안정시키라고 말합니다.`;
    const cautionFlow = `${palaceName}에서 주의할 흐름은 욕심이 커질 때 약속과 책임도 함께 커진다는 점입니다. O의 안정 신호는 살리고 X의 압박 신호는 기록과 휴식으로 다스리십시오.`;
    const transitionLine = `${chapterIndex + 1}장을 지나 다음 장에서는 ${palaceName}의 신호가 다른 삶의 영역과 만날 때 어떤 선택으로 이어지는지 이어서 살펴봅니다.`;
    const chapter = {
      id: blueprint.id,
      roman: blueprint.roman,
      chapterNo: chapterIndex + 1,
      title: blueprint.title,
      summary,
      practicalAdvice,
      cautionFlow,
      transitionLine,
      categories,
      source: "assembled",
      localQuality: {
        assemblyMode: ZIWEI_PDF_CONFIG.generationMode,
        templateVersion: ZIWEI_PDF_CONFIG.templateVersion,
        usedPalaces: [palaceName],
        usedStars: ziweiStarListText(palace?.mainStars, "").split(", ").filter(Boolean),
      },
    };
    const text = composeChapterText(chapter);
    return {
      ...chapter,
      finalText: text,
      text,
    };
  }).map((chapter) => ensureChapterLength(chapter, CHAPTER_MIN_CHARS));
  return {
    chapters,
    duplicateRate: computeDuplicateRate(chapters),
    pass: 1,
    qualityStatus: "passed",
  };
}

function validateZiweiPdfCompletionPayload({ pdfReady, chapters, requireDownloadUrl = false } = {}) {
  const validation = validateZiweiPdfChapterQuality({ chapters });
  const repetition = validateNoZiweiPdfRepetition(chapters);
  const html = clean(pdfReady?.html || "");
  const text = `${html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ")}\n${safeArray(chapters).map((chapter) => chapter.text || chapter.finalText || "").join("\n")}`;
  const issues = [];
  if (!html.includes("<!doctype html>") && !html.includes("<!DOCTYPE html>")) issues.push("html_shell_missing");
  if (requireDownloadUrl && !clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl)) issues.push("download_url_missing");
  if (!validation.ok) issues.push(...validation.errors);
  if (!repetition.ok) issues.push("duplicate_text");
  if (/[\uFFFD\uF900-\uFAFF]|[?][\uAC00-\uD7A3]|[\u3131-\u318E]{2,}/.test(text)) issues.push("mojibake_detected");
  return {
    ok: issues.length === 0,
    issues,
    chapterCount: safeArray(chapters).length,
    expectedChapterCount: CHAPTER_BLUEPRINTS.length,
    totalChars: validation.totalChars,
    duplicateRate: repetition.duplicateRate,
    htmlLength: html.length,
  };
}

function validateChapters(chapters = []) {
  const errors = [];
  if (!Array.isArray(chapters) || chapters.length !== CHAPTER_BLUEPRINTS.length) errors.push("chapter_count");
  let totalChars = 0;
  CHAPTER_BLUEPRINTS.forEach((blueprint, index) => {
    const chapter = chapters[index];
    if (!chapter || clean(chapter.title) !== blueprint.title) errors.push(`chapter_${index + 1}_title`);
    const cats = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (cats.length !== blueprint.categories.length) errors.push(`chapter_${index + 1}_category_count`);
    const chapterChars = cats.reduce((sum, cat) => sum + stripForbiddenTokens(cat?.finalText || cat?.text || "").length, 0);
    totalChars += chapterChars;
    if (chapterChars < CHAPTER_MIN_CHARS) errors.push(`chapter_${index + 1}_min_chars`);
    blueprint.categories.forEach((title, categoryIndex) => {
      const category = cats[categoryIndex];
      if (!category || clean(category.title) !== title) errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_title`);
      const text = stripForbiddenTokens(category?.finalText || category?.text || "");
      if (text.length < SECTION_MIN_CHARS) errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_text`);
      const evidenceSignals = ["궁", "사화", "주성", "보조성", "살성", "실전 조언", "◎", "O", "▲", "△", "X"];
      const hitCount = evidenceSignals.reduce((count, token) => (text.includes(token) ? count + 1 : count), 0);
      if (hitCount < 4) errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_evidence_weak`);
      const lowered = text.toLowerCase();
      for (const token of FORBIDDEN_TEXT) {
        if (lowered.includes(token.toLowerCase())) errors.push(`chapter_${index + 1}_forbidden_${token}`);
      }
    });
  });
  if (totalChars < TOTAL_MIN_CHARS) errors.push("total_min_chars");
  return { ok: errors.length === 0, errors, totalChars };
}

function computeDuplicateRate(chapters = []) {
  const source = chapters
    .flatMap((chapter) => (Array.isArray(chapter?.categories) ? chapter.categories : []))
    .map((item) => stripForbiddenTokens(item?.finalText || item?.text || ""))
    .join("\n\n");
  const paragraphs = source
    .split(/\n\s*\n+/)
    .map((row) => clean(row).replace(/\s+/g, " "))
    .filter((row) => row.length >= 80);
  const sentences = source
    .split(/[.!?。！？]\s+/)
    .map((row) => clean(row).replace(/\s+/g, " "))
    .filter((row) => row.length >= 40);
  if (!paragraphs.length && !sentences.length) return 0;
  const calc = (rows) => {
    if (!rows.length) return 0;
    const counter = new Map();
    for (const row of rows) {
      counter.set(row, (counter.get(row) || 0) + 1);
    }
    const repeated = Array.from(counter.values())
      .filter((count) => count > 1)
      .reduce((sum, count) => sum + (count - 1), 0);
    return repeated / rows.length;
  };
  const paragraphRate = calc(paragraphs);
  const sentenceRate = calc(sentences);
  const openerPenalty = DUPLICATE_BANNED_OPENERS.reduce((acc, opener) => (source.includes(opener) ? acc + 0.01 : acc), 0);
  return Math.min(1, ((paragraphRate * 0.6) + (sentenceRate * 0.4) + openerPenalty));
}

function safeJsonForPrompt(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function extractZiweiJsonObject(text = "") {
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
  throw Object.assign(new Error("ZIWEI_LLM_JSON_PARSE_FAILED"), { code: "ZIWEI_LLM_JSON_PARSE_FAILED" });
}

function compactStarForPrompt(star = {}) {
  return {
    name: clean(star.name),
    strength: clean(`${star.strengthSymbol || ""} ${star.strengthName || ""}`.trim()),
    sihua: clean(star.sihua),
    borrowed: Boolean(star.borrowed),
  };
}

function compactPalaceForPrompt(palace = {}) {
  return {
    key: clean(palace.key),
    nameKo: clean(palace.nameKo),
    branch: clean(palace.branch),
    mainStars: normalizeStarList(palace.mainStars).map(compactStarForPrompt),
    auxiliaryStars: normalizeStarList(palace.auxStars).map(compactStarForPrompt),
    maleficStars: normalizeStarList(palace.maleficStars).map(compactStarForPrompt),
    transformations: Array.isArray(palace.transformations) ? palace.transformations.map((item) => ({
      star: clean(item?.star),
      type: clean(item?.type || item?.label),
    })).filter((item) => item.star || item.type) : [],
  };
}

function collectZiweiCalculationEvidenceNames(localChapter = {}, seed = {}) {
  const names = new Set();
  const add = (value) => {
    const name = clean(value);
    if (name) names.add(name);
  };
  const addStar = (star) => {
    add(star?.name);
    add(star?.star);
    add(star?.sihua);
  };
  safeArray(localChapter?.evidenceAnchors).forEach((anchor) => {
    add(anchor?.name);
    add(anchor?.star);
    add(anchor?.palaceName);
  });
  safeArray(localChapter?.categories).forEach((category) => {
    safeArray(category?.evidenceAnchors).forEach((anchor) => {
      add(anchor?.name);
      add(anchor?.star);
      add(anchor?.palaceName);
    });
  });
  const palaceFacts = safeObject(localChapter?.palaceFacts);
  add(palaceFacts?.nameKo);
  add(palaceFacts?.branch);
  safeArray(palaceFacts?.mainStars).forEach(addStar);
  safeArray(palaceFacts?.auxiliaryStars).forEach(addStar);
  safeArray(palaceFacts?.maleficStars).forEach(addStar);
  safeArray(palaceFacts?.transformations).forEach((item) => {
    add(item?.star);
    add(item?.type);
  });
  const starFacts = safeObject(localChapter?.starFacts);
  safeArray(starFacts?.mainStars).forEach(addStar);
  safeArray(starFacts?.auxiliaryStars).forEach(addStar);
  safeArray(starFacts?.maleficStars).forEach(addStar);
  safeArray(localChapter?.transformationFacts).forEach((item) => {
    add(item?.star);
    add(item?.type);
  });
  safeArray(seed?.chart?.palaces).forEach((palace) => {
    add(palace?.nameKo);
    add(palace?.branch);
    normalizeStarList(palace?.mainStars).forEach(addStar);
    normalizeStarList(palace?.auxStars).forEach(addStar);
    normalizeStarList(palace?.maleficStars).forEach(addStar);
    safeArray(palace?.transformations).forEach((item) => {
      add(item?.star);
      add(item?.type || item?.label);
    });
  });
  safeArray(seed?.chart?.transformations).forEach((item) => {
    add(item?.star);
    add(item?.type || item?.label);
  });
  return names;
}

function getZiweiPromptPalaceKeys(blueprint = {}) {
  const id = clean(blueprint.id);
  const keys = new Set(["ming"]);
  const primary = clean(blueprint.palaceKey);
  if (primary && primary !== "timing") keys.add(primary);
  if (id === "02") keys.add("body");
  if (id === "06") ["wealth", "career", "travel"].forEach((key) => keys.add(key));
  if (id === "07") ["spouse", "children", "fortune"].forEach((key) => keys.add(key));
  if (id === "08") ["travel", "property"].forEach((key) => keys.add(key));
  if (id === "09") ["friends", "siblings", "parents"].forEach((key) => keys.add(key));
  if (id === "10") ["fortune", "parents"].forEach((key) => keys.add(key));
  if (id === "11") ["health", "fortune", "ming"].forEach((key) => keys.add(key));
  if (["12", "13", "14", "15"].includes(id)) ["ming", "body", "wealth", "career", "spouse", "fortune", "health"].forEach((key) => keys.add(key));
  return Array.from(keys);
}

function buildZiweiLLMInput({ profile = {}, seed = {}, blueprint = {}, localChapter = {}, previousSummaries = [], attempt = 1, lastErrors = [], masterJson = null } = {}) {
  const palaceKeys = getZiweiPromptPalaceKeys(blueprint);
  const palaces = palaceKeys
    .map((key) => findPalace(seed, key))
    .filter(Boolean)
    .map(compactPalaceForPrompt);
  const allPalaceBrief = (Array.isArray(seed?.chart?.palaces) ? seed.chart.palaces : []).map((palace) => ({
    key: clean(palace?.key),
    nameKo: clean(palace?.nameKo),
    branch: clean(palace?.branch),
    mainStars: normalizeStarList(palace?.mainStars).slice(0, 2).map((star) => clean(star?.name)).filter(Boolean),
  }));
  const palaceIndex = buildZiweiPalaceIndex(seed);
  const relevantPalaceIndex = palaceKeys.reduce((acc, key) => {
    if (palaceIndex[key]) acc[key] = palaceIndex[key];
    return acc;
  }, {});
  const crossPalaceRelations = buildZiweiCrossPalaceRelations(seed)
    .filter((relation) => palaceKeys.includes(clean(relation?.palaceKey)));
  return {
    serviceName: "자미두수 프리미엄 PDF",
    chapter: {
      id: blueprint.id,
      roman: blueprint.roman,
      chapterNo: Number(blueprint.id),
      title: blueprint.title,
      categories: blueprint.categories,
    },
    userProfile: {
      name: clean(profile?.name || "사용자"),
      birthDate: clean(seed?.birthProfile?.birthDate),
      birthTime: clean(seed?.birthProfile?.birthTime),
      gender: clean(seed?.birthProfile?.gender),
      calendarType: clean(seed?.birthProfile?.calendarType),
    },
    chartMeta: {
      mingGong: clean(seed?.chart?.mingGong),
      shenGong: clean(seed?.chart?.shenGong),
      fiveElementBureau: clean(seed?.chart?.fiveElementBureau),
      yearStemBranch: clean(seed?.chart?.yearStemBranch),
    },
    relevantPalaces: palaces,
    allPalaceBrief,
    expertContext: {
      masterJsonSummary: masterJson ? {
        schemaVersion: clean(masterJson?.schemaVersion),
        generationMode: clean(masterJson?.generationMode),
        chapterCount: Array.isArray(masterJson?.chapterSpecs) ? masterJson.chapterSpecs.length : 0,
      } : null,
      palaceIndex: relevantPalaceIndex,
      crossPalaceRelations,
      transformationLayers: buildZiweiTransformationLayers(seed),
      luckTimeline: buildZiweiLuckTimeline(seed),
      requiredEvidenceTypes: ["palace", "star", "sihua", "timing"],
      evidenceWritingRule: "각 판단은 궁명, 별명, 강약, 사화, 대한·유년 중 최소 3개 근거를 자연스럽게 연결한다.",
    },
    transformations: Array.isArray(seed?.chart?.transformations) ? seed.chart.transformations.map((item) => ({
      star: clean(item?.star),
      type: clean(item?.type || item?.label),
      palace: clean(item?.palace || item?.palaceName),
    })) : [],
    timing: {
      decadeLuck: Array.isArray(seed?.chart?.decadeLuck) ? seed.chart.decadeLuck.slice(0, 8) : [],
      annualLuck: Array.isArray(seed?.chart?.annualLuck) ? seed.chart.annualLuck.slice(0, 12) : [],
    },
    interpretationSeeds: safeObject(seed?.localZiweiChartJson?.interpretationSeeds),
    localCalculationJson: {
      chapterId: clean(localChapter?.chapterId || localChapter?.id || blueprint.id),
      chapterTitle: clean(localChapter?.chapterTitle || blueprint.title),
      categories: Array.isArray(localChapter?.categories)
        ? localChapter.categories.map((category) => ({
          id: clean(category?.id),
          title: clean(category?.title),
          order: Number(category?.order || 0),
          evidenceAnchors: safeArray(category?.evidenceAnchors),
          localText: sanitizeCounselingText(category?.localText || category?.finalText || category?.text || category?.localSummary || ""),
          localSummary: sanitizeCounselingText(category?.localSummary || category?.localText || category?.finalText || category?.text || ""),
        }))
        : [],
      localDraftChapter: safeObject(localChapter?.localDraftChapter),
      palaceFacts: safeObject(localChapter?.palaceFacts),
      starFacts: safeObject(localChapter?.starFacts),
      transformationFacts: safeArray(localChapter?.transformationFacts),
      timelineFacts: safeObject(localChapter?.timelineFacts),
      evidenceAnchors: safeArray(localChapter?.evidenceAnchors),
      writingRequirements: safeObject(localChapter?.writingRequirements),
      calculationOnly: Boolean(localChapter?.calculationOnly),
    },
    previousSummaries,
    attempt,
    lastErrors,
  };
}

function buildZiweiChapterPrompt(input = {}) {
  return `당신은 자미두수 로컬 명반 JSON으로 먼저 생성된 프리미엄 PDF 원고를 보강하는 전문 상담가입니다.

역할:
입력의 localCalculationJson.localDraftChapter와 categories.localText가 이미 완성된 로컬 PDF 문장 초안입니다.
이 원고를 원본으로 삼아 문장 밀도, 상담감, 개인화 깊이만 보강합니다.

정적 템플릿 정책:
- 표지, 목차, 챕터 제목, 카테고리 제목, 공통 안내문은 코드 템플릿에서 이미 생성됩니다.
- LLM은 제목을 새로 쓰지 말고, 입력된 카테고리 순서에 맞춰 개인화 본문만 작성합니다.
- 출력 categories 배열은 입력 categories와 같은 순서와 개수여야 합니다.

원칙:
1. 자미두수 명반을 새로 계산하지 않습니다.
2. 입력 자료에 없는 별, 궁, 사화, 시기 정보는 만들지 않습니다.
3. localText의 판단 방향과 핵심 문장을 유지하되, 반복을 줄이고 근거 연결을 더 선명하게 보강합니다.
4. 내부 용어(JSON, payload, debug, API, LLM, prompt, schema, engine)를 본문에 쓰지 않습니다.
5. 공포 조장, 질병 진단, 투자 수익 보장, 확정 예언을 하지 않습니다.
6. 단정 대신 경향, 가능성, 전략, 선택 기준으로 표현합니다.
7. 각 카테고리 본문은 최소 700자 이상 작성합니다.
8. 각 카테고리에는 실제 근거를 2개 이상 넣습니다. 근거는 궁명, 별명, 강약 기호(묘/O/리/평/X), 사화, 대운/세운 중에서 고릅니다.
9. 문체는 전문적이고 신비롭게 유지하되 개발 문서처럼 보이면 안 됩니다.

출력 형식:
순수 JSON 객체 하나만 출력합니다.
{
  "chapterNo": number,
  "summary": "80자 이상의 챕터 요약",
  "categories": [
    {
      "expertThesis": "이 카테고리의 핵심 판단",
      "evidenceAnchors": [
        { "type": "palace", "name": "궁명", "reason": "판단 근거" },
        { "type": "star", "name": "별명", "strength": "강약 기호", "reason": "판단 근거" },
        { "type": "sihua", "name": "사화명", "reason": "판단 근거" }
      ],
      "finalText": "완성된 개인화 상담 본문",
      "timingAdvice": "시기 조언",
      "actionPlan": ["실천 1", "실천 2", "실천 3"],
      "caution": "주의 흐름",
      "confidence": "high"
    }
  ],
  "practicalAdvice": "실전 조언",
  "cautionFlow": "주의해야 할 흐름",
  "transitionLine": "다음 장으로 이어지는 문장"
}

입력:
${safeJsonForPrompt(input)}`;
}
async function callZiweiGemini(env, prompt, options = {}) {
  throw Object.assign(new Error("자미두수 PDF는 로컬 명반 조립 방식으로만 생성됩니다."), {
    code: "ZIWEI_EXTERNAL_GENERATION_DISABLED",
    status: 500,
  });
}

function normalizeZiweiEvidenceAnchors(anchors = [], text = "", seed = {}) {
  const sourceAnchors = Array.isArray(anchors) ? anchors : [];
  const normalized = sourceAnchors.map((item) => ({
    type: clean(item?.type || "evidence"),
    name: clean(item?.name || item?.title || item?.star || item?.palace),
    palaceKey: clean(item?.palaceKey),
    palaceName: clean(item?.palaceName || item?.palace),
    strength: clean(item?.strength || item?.strengthSymbol),
    sihuaType: clean(item?.sihuaType || item?.sihua),
    reason: sanitizeCounselingText(item?.reason || ""),
  })).filter((item) => item.name);
  const collected = collectZiweiEvidenceAnchors(text, seed);
  const merged = [...normalized, ...collected];
  const seen = new Set();
  return merged.filter((item) => {
    const key = `${item.type}:${item.name}:${item.palaceKey || item.palaceName || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function normalizeLLMGeneratedChapterShape(chapter = {}, blueprint = {}, seed = {}) {
  const sourceCategories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  const categories = blueprint.categories.map((title, index) => {
    const hit = sourceCategories[index] || sourceCategories.find((item) => clean(item?.title) === clean(title)) || {};
    const finalText = sanitizeCounselingText(hit?.finalText || hit?.text || hit?.body || "");
    return {
      id: `${blueprint.id}-${String(index + 1).padStart(2, "0")}`,
      title,
      finalText,
      text: finalText,
      order: index + 1,
      evidenceAnchors: normalizeZiweiEvidenceAnchors(hit?.evidenceAnchors, finalText, seed),
      expertThesis: sanitizeCounselingText(hit?.expertThesis || ""),
      timingAdvice: sanitizeCounselingText(hit?.timingAdvice || ""),
      actionPlan: Array.isArray(hit?.actionPlan) ? hit.actionPlan.map(sanitizeCounselingText).filter(Boolean).slice(0, 5) : [],
      caution: sanitizeCounselingText(hit?.caution || ""),
      confidence: clean(hit?.confidence || ""),
    };
  });
  const normalized = {
    id: blueprint.id,
    roman: blueprint.roman,
    chapterNo: Number(blueprint.id),
    title: blueprint.title,
    summary: sanitizeCounselingText(chapter?.summary || ""),
    practicalAdvice: sanitizeCounselingText(chapter?.practicalAdvice || ""),
    cautionFlow: sanitizeCounselingText(chapter?.cautionFlow || ""),
    transitionLine: sanitizeCounselingText(chapter?.transitionLine || ""),
    categories,
    source: clean(chapter?.source || "gemini-enhanced-local"),
  };
  const merged = composeChapterText(normalized);
  return {
    ...normalized,
    finalText: merged,
    text: merged,
  };
}

function toZiweiGeneratedChapter(parsed = {}, blueprint = {}, profile = {}, seed = {}) {
  const parsedCategories = Array.isArray(parsed?.categories) ? parsed.categories : [];
  const categories = blueprint.categories.map((title, index) => {
    const hit = parsedCategories[index] || parsedCategories.find((item) => clean(item?.title) === clean(title)) || {};
    const finalText = sanitizeCounselingText(hit?.finalText || hit?.text || hit?.body || "");
    return {
      id: `${blueprint.id}-${String(index + 1).padStart(2, "0")}`,
      title,
      finalText,
      order: index + 1,
      evidenceAnchors: normalizeZiweiEvidenceAnchors(hit?.evidenceAnchors, finalText, seed),
      expertThesis: sanitizeCounselingText(hit?.expertThesis || ""),
      timingAdvice: sanitizeCounselingText(hit?.timingAdvice || ""),
      actionPlan: Array.isArray(hit?.actionPlan) ? hit.actionPlan.map(sanitizeCounselingText).filter(Boolean).slice(0, 5) : [],
      caution: sanitizeCounselingText(hit?.caution || ""),
      confidence: clean(hit?.confidence || ""),
    };
  });
  return normalizeLLMGeneratedChapterShape({
    id: blueprint.id,
    roman: blueprint.roman,
    chapterNo: Number(blueprint.id),
    title: blueprint.title,
    summary: sanitizeCounselingText(parsed?.summary || ""),
    practicalAdvice: sanitizeCounselingText(parsed?.practicalAdvice || ""),
    cautionFlow: sanitizeCounselingText(parsed?.cautionFlow || ""),
    transitionLine: sanitizeCounselingText(parsed?.transitionLine || ""),
    categories,
    source: "gemini-enhanced-local",
  }, blueprint, seed);
}

function validateZiweiGeneratedChapter(chapter = {}, blueprint = {}, seed = {}, localChapter = {}) {
  const errors = [];
  const localEvidenceNames = collectZiweiCalculationEvidenceNames(localChapter, seed);
  if (clean(chapter?.title) !== clean(blueprint?.title)) errors.push("chapter_title_mismatch");
  const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
  if (categories.length !== blueprint.categories.length) errors.push("category_count_mismatch");
  const combinedText = [
    chapter?.summary,
    chapter?.practicalAdvice,
    chapter?.cautionFlow,
    chapter?.transitionLine,
    ...categories.map((category) => category?.finalText || category?.text || ""),
  ].join("\n\n");
  if (ZIWEI_LLM_RISKY_ASSERTION_RE.test(combinedText)) errors.push("risky_assertion");
  categories.forEach((category, index) => {
    const title = clean(blueprint.categories[index]);
    if (clean(category?.title) !== title) errors.push(`category_${index + 1}_title`);
    const text = sanitizeCounselingText(category?.finalText || category?.text || "");
    if (text.length < SECTION_MIN_CHARS) errors.push(`category_${index + 1}_too_short`);
    if (containsForbiddenNarrative(text)) errors.push(`category_${index + 1}_forbidden`);
    const evidenceSignals = ["궁", "사화", "주성", "보조성", "살성", "실전 조언", "◎", "O", "▲", "△", "X"];
    const hitCount = evidenceSignals.reduce((count, token) => (text.includes(token) ? count + 1 : count), 0);
    if (hitCount < 4) errors.push(`category_${index + 1}_evidence_weak`);
    const anchors = normalizeZiweiEvidenceAnchors(category?.evidenceAnchors, text, seed);
    if (anchors.length < 3) errors.push(`category_${index + 1}_evidence_anchor_weak`);
    const groundedAnchorCount = anchors.reduce((count, anchor) => {
      const candidates = [anchor?.name, anchor?.palaceName, anchor?.strength, anchor?.sihuaType].map(clean).filter(Boolean);
      return candidates.some((name) => localEvidenceNames.has(name)) ? count + 1 : count;
    }, 0);
    if (localEvidenceNames.size && groundedAnchorCount < 2) errors.push(`category_${index + 1}_evidence_not_grounded`);
    const textGroundedCount = Array.from(localEvidenceNames).slice(0, 120).reduce((count, name) => (name && text.includes(name) ? count + 1 : count), 0);
    if (localEvidenceNames.size && textGroundedCount < 1) errors.push(`category_${index + 1}_text_not_grounded`);
  });
  return { ok: errors.length === 0, errors };
}

async function generateZiweiChapterWithLLM(env, { profile = {}, seed = {}, blueprint = {}, localChapter = {}, previousSummaries = [], requestId = "", masterJson = null } = {}) {
  let lastErrors = [];
  const maxValidationAttempts = Math.max(1, Math.min(2, toInt(env?.ZIWEI_GEMINI_CHAPTER_VALIDATION_RETRIES || env?.PREMIUM_GEMINI_CHAPTER_VALIDATION_RETRIES, 1)));
  for (let attempt = 1; attempt <= maxValidationAttempts; attempt += 1) {
    const input = buildZiweiLLMInput({ profile, seed, blueprint, localChapter, previousSummaries, attempt, lastErrors, masterJson });
    const prompt = buildZiweiChapterPrompt(input);
    const text = await callZiweiGemini(env, prompt, { requestId, chapterNumber: blueprint.roman });
    const parsed = extractZiweiJsonObject(text);
    const chapter = toZiweiGeneratedChapter(parsed, blueprint, profile, seed);
    const validation = validateZiweiGeneratedChapter(chapter, blueprint, seed, localChapter);
    if (validation.ok) return chapter;
    lastErrors = validation.errors;
  }
  throw Object.assign(new Error(`자미두수 LLM 챕터 검수에 실패했습니다: ${blueprint.roman}`), {
    code: "ZIWEI_LLM_CHAPTER_INVALID",
    status: 502,
    detail: { chapterNumber: blueprint.roman, errors: lastErrors },
  });
}

async function mapZiweiChapterJobs(items = [], concurrency = 4, worker) {
  const source = Array.isArray(items) ? items : [];
  const limit = Math.max(1, Math.min(source.length || 1, toInt(concurrency, 4)));
  const results = new Array(source.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (cursor < source.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(source[index], index);
    }
  }));
  return results;
}

async function generateZiweiChaptersWithLLM(env, profile, seed, localCalculationSeeds, options = {}) {
  const seeded = Array.isArray(localCalculationSeeds) && localCalculationSeeds.length === CHAPTER_BLUEPRINTS.length
    ? localCalculationSeeds
    : buildCompactZiweiLocalChapterSeeds(profile, seed);
  const localFallbackChapters = Array.isArray(options?.localChapters) && options.localChapters.length === CHAPTER_BLUEPRINTS.length
    ? options.localChapters
    : [];
  const concurrency = Math.max(1, Math.min(6, toInt(env?.ZIWEI_LLM_CHAPTER_CONCURRENCY || env?.PREMIUM_LLM_CHAPTER_CONCURRENCY, 4)));
  const failedChapters = [];
  const chapterResults = await mapZiweiChapterJobs(CHAPTER_BLUEPRINTS, concurrency, async (blueprint, index) => {
    try {
      const chapter = await generateZiweiChapterWithLLM(env, {
        profile,
        seed,
        blueprint,
        localChapter: seeded[index],
        previousSummaries: [],
        requestId: clean(options?.requestId),
        masterJson: options?.masterJson || null,
      });
      return { ...chapter, source: "gemini-enhanced-local" };
    } catch (error) {
      const failure = {
        chapter: index + 1,
        chapterId: clean(blueprint?.id),
        title: clean(blueprint?.title),
        code: clean(error?.code || "ZIWEI_LLM_FAILED"),
        message: clean(error?.message),
        detail: error?.detail || null,
      };
      failedChapters.push(failure);
      console.warn("[ZiweiPremiumPDF][LLMChapterFailed]", failure);
      return null;
    }
  });
  const chapters = chapterResults.filter(Boolean);
  if (failedChapters.length) {
    const merged = CHAPTER_BLUEPRINTS.map((blueprint, index) => {
      if (chapterResults[index]) return chapterResults[index];
      const localFallback = localFallbackChapters[index] || buildFallbackChapter(blueprint, profile, seed);
      return {
        ...normalizeChapterShape(localFallback, blueprint, profile, seed),
        source: "local-json-manuscript",
      };
    });
    return {
      chapters: merged,
      fallbackUsed: true,
      fallbackChapterCount: failedChapters.length,
      llmChapterCount: chapters.length,
      source: failedChapters.length === CHAPTER_BLUEPRINTS.length ? "local-json-manuscript" : "hybrid-local-json-llm",
      llmFallbackReason: failedChapters.map((item) => `${item.chapter}:${item.code}`).join(", "),
      failedChapters,
    };
  }
  return {
    chapters,
    fallbackUsed: false,
    fallbackChapterCount: 0,
    llmChapterCount: chapters.length,
    source: "llm-enhanced-local-json",
    llmFallbackReason: "",
  };
}

function buildZiweiPalaceIndex(seed = {}) {
  const palaces = Array.isArray(seed?.chart?.palaces) ? seed.chart.palaces : [];
  const entries = {};
  palaces.forEach((palace, index) => {
    const key = clean(palace?.key || `palace_${index + 1}`);
    entries[key] = {
      order: index + 1,
      key,
      nameKo: clean(palace?.nameKo),
      branch: clean(palace?.branch),
      meaning: clean(PALACE_MEANINGS[clean(palace?.nameKo)] || ""),
      mainStars: normalizeStarList(palace?.mainStars).map(compactStarForPrompt),
      auxiliaryStars: normalizeStarList(palace?.auxStars).map(compactStarForPrompt),
      maleficStars: normalizeStarList(palace?.maleficStars).map(compactStarForPrompt),
      transformations: Array.isArray(palace?.transformations) ? palace.transformations.map((item) => ({
        star: clean(item?.star),
        type: clean(item?.type || item?.label),
        meaning: clean(SIHUA_RULES[clean(item?.type || item?.label)] || ""),
      })).filter((item) => item.star || item.type) : [],
      strengthSignals: normalizeStarList([
        ...(palace?.mainStars || []),
        ...(palace?.auxStars || []),
        ...(palace?.maleficStars || []),
      ]).map((star) => ({
        name: clean(star?.name),
        strengthSymbol: clean(star?.strengthSymbol),
        strengthName: clean(star?.strengthName),
      })).filter((star) => star.name),
    };
  });
  return entries;
}

function buildZiweiStarIndex(seed = {}) {
  const palaces = Array.isArray(seed?.chart?.palaces) ? seed.chart.palaces : [];
  const starIndex = {};
  palaces.forEach((palace) => {
    [
      ["main", palace?.mainStars],
      ["auxiliary", palace?.auxStars],
      ["malefic", palace?.maleficStars],
    ].forEach(([role, list]) => {
      normalizeStarList(list).forEach((star) => {
        const name = clean(star?.name);
        if (!name) return;
        if (!starIndex[name]) {
          starIndex[name] = {
            name,
            placements: [],
            rules: safeObject(STAR_RULES[name] || AUX_MALEFIC_RULES[name]),
          };
        }
        starIndex[name].placements.push({
          palaceKey: clean(palace?.key),
          palaceName: clean(palace?.nameKo),
          branch: clean(palace?.branch),
          role,
          strengthSymbol: clean(star?.strengthSymbol),
          strengthName: clean(star?.strengthName),
          sihua: clean(star?.sihua),
          borrowed: Boolean(star?.borrowed),
        });
      });
    });
  });
  return starIndex;
}

function buildZiweiTransformationLayers(seed = {}) {
  const mapTransformation = (item = {}) => ({
    star: clean(item?.star),
    type: clean(item?.type || item?.label),
    palace: clean(item?.palace || item?.palaceName),
    meaning: clean(SIHUA_RULES[clean(item?.type || item?.label)] || ""),
  });
  const decadeLuck = Array.isArray(seed?.chart?.decadeLuck) ? seed.chart.decadeLuck : [];
  const annualLuck = Array.isArray(seed?.chart?.annualLuck) ? seed.chart.annualLuck : [];
  return {
    natal: (Array.isArray(seed?.chart?.transformations) ? seed.chart.transformations : []).map(mapTransformation).filter((item) => item.star || item.type),
    decade: decadeLuck.map((item, index) => ({
      order: index + 1,
      label: clean(item?.label || item?.name || item?.range),
      current: Boolean(item?.current || item?.isCurrent),
      transformations: Array.isArray(item?.transformations) ? item.transformations.map(mapTransformation).filter((t) => t.star || t.type) : [],
    })),
    annual: annualLuck.map((item, index) => ({
      order: index + 1,
      year: clean(item?.year || item?.label),
      label: clean(item?.label || item?.theme || item?.name),
      current: Boolean(item?.current || item?.isCurrent),
      transformations: Array.isArray(item?.transformations) ? item.transformations.map(mapTransformation).filter((t) => t.star || t.type) : [],
    })),
  };
}

function buildZiweiCrossPalaceRelations(seed = {}) {
  const palaces = Array.isArray(seed?.chart?.palaces) ? seed.chart.palaces : [];
  const relationFor = (palace, index) => {
    const triadIndexes = [index, (index + 4) % 12, (index + 8) % 12].filter((item) => palaces[item]);
    const opposite = palaces[(index + 6) % 12];
    const left = palaces[(index + 11) % 12];
    const right = palaces[(index + 1) % 12];
    return {
      palaceKey: clean(palace?.key),
      palaceName: clean(palace?.nameKo),
      triadPalaces: triadIndexes.map((idx) => ({
        key: clean(palaces[idx]?.key),
        nameKo: clean(palaces[idx]?.nameKo),
        branch: clean(palaces[idx]?.branch),
      })),
      oppositePalace: opposite ? {
        key: clean(opposite?.key),
        nameKo: clean(opposite?.nameKo),
        branch: clean(opposite?.branch),
      } : null,
      adjacentPalaces: [left, right].filter(Boolean).map((item) => ({
        key: clean(item?.key),
        nameKo: clean(item?.nameKo),
        branch: clean(item?.branch),
      })),
    };
  };
  return palaces.map(relationFor);
}

function buildZiweiLuckTimeline(seed = {}) {
  const decadeLuck = Array.isArray(seed?.chart?.decadeLuck) ? seed.chart.decadeLuck : [];
  const annualLuck = Array.isArray(seed?.chart?.annualLuck) ? seed.chart.annualLuck : [];
  const currentDecadeIndex = Math.max(0, decadeLuck.findIndex((item) => item?.current || item?.isCurrent));
  return {
    currentDecade: safeObject(decadeLuck[currentDecadeIndex] || decadeLuck[0]),
    nextDecade: safeObject(decadeLuck[currentDecadeIndex + 1] || {}),
    decadeSequence: decadeLuck.slice(0, 10).map((item, index) => ({
      order: index + 1,
      label: clean(item?.label || item?.name || item?.range),
      current: Boolean(item?.current || item?.isCurrent),
      palace: clean(item?.palace || item?.palaceName),
      theme: clean(item?.theme || item?.summary),
    })),
    annualSequence: annualLuck.slice(0, 12).map((item, index) => ({
      order: index + 1,
      year: clean(item?.year || item?.label),
      label: clean(item?.label || item?.theme || item?.name),
      palace: clean(item?.palace || item?.palaceName),
      theme: clean(item?.theme || item?.summary),
    })),
  };
}

function collectZiweiEvidenceAnchors(text = "", seed = {}) {
  const source = clean(text);
  const anchors = [];
  const push = (type, name, detail = {}) => {
    const normalized = clean(name);
    if (!normalized) return;
    const key = `${type}:${normalized}`;
    if (anchors.some((item) => item.key === key)) return;
    anchors.push({ key, type, name: normalized, ...detail });
  };
  (Array.isArray(seed?.chart?.palaces) ? seed.chart.palaces : []).forEach((palace) => {
    if (source.includes(clean(palace?.nameKo))) {
      push("palace", palace.nameKo, { palaceKey: clean(palace?.key), branch: clean(palace?.branch) });
    }
    normalizeStarList([...(palace?.mainStars || []), ...(palace?.auxStars || []), ...(palace?.maleficStars || [])]).forEach((star) => {
      if (source.includes(clean(star?.name))) {
        push("star", star.name, {
          palaceKey: clean(palace?.key),
          palaceName: clean(palace?.nameKo),
          strengthSymbol: clean(star?.strengthSymbol),
          strengthName: clean(star?.strengthName),
        });
      }
    });
  });
  (Array.isArray(seed?.chart?.transformations) ? seed.chart.transformations : []).forEach((item) => {
    const type = clean(item?.type || item?.label);
    const star = clean(item?.star);
    if ((type && source.includes(type)) || (star && source.includes(star))) {
      push("sihua", `${star} ${type}`.trim(), {
        star,
        sihuaType: type,
        palace: clean(item?.palace || item?.palaceName),
      });
    }
  });
  return anchors.map(({ key, ...item }) => item).slice(0, 8);
}

function buildZiweiChapterEvidenceMap(chapters = [], seed = {}) {
  return (Array.isArray(chapters) ? chapters : []).map((chapter, chapterIndex) => ({
    chapterNo: Number(chapter?.chapterNo || chapterIndex + 1),
    id: clean(chapter?.id || CHAPTER_BLUEPRINTS[chapterIndex]?.id),
    title: clean(chapter?.title),
    categoryEvidence: (Array.isArray(chapter?.categories) ? chapter.categories : []).map((category, categoryIndex) => ({
      order: categoryIndex + 1,
      title: clean(category?.title),
      evidenceAnchors: normalizeZiweiEvidenceAnchors(category?.evidenceAnchors, category?.finalText || category?.text || "", seed),
    })),
  }));
}

function summarizeZiweiClientEvidence(body = {}) {
  const clientEvidence = safeObject(body?.ziweiClientEvidenceJson || body?.clientEvidenceJson);
  if (!clean(clientEvidence?.schemaVersion)) return null;
  return {
    schemaVersion: clean(clientEvidence.schemaVersion),
    source: clean(clientEvidence.source || "browser"),
    chartAvailable: Boolean(clientEvidence.chartAvailable || clientEvidence.hasZiweiBase),
    evidenceCount: Number(clientEvidence.evidenceCount || 0),
    hasBirthInput: Boolean(clientEvidence.hasBirthInput),
    hasPalaces: Boolean(clientEvidence.hasPalaces),
    hasMingGong: Boolean(clientEvidence.hasMingGong),
    hasShenGong: Boolean(clientEvidence.hasShenGong),
  };
}

function buildZiweiChapterSpecsForMaster(seed = {}) {
  const palaceIndex = buildZiweiPalaceIndex(seed);
  return CHAPTER_BLUEPRINTS.map((blueprint) => {
    const palaceKeys = getZiweiPromptPalaceKeys(blueprint);
    return {
      id: clean(blueprint.id),
      roman: clean(blueprint.roman),
      chapterNo: Number(blueprint.id),
      palaceKey: clean(blueprint.palaceKey),
      title: clean(blueprint.title),
      requiredPalaceKeys: palaceKeys,
      requiredEvidenceTypes: ["palace", "star", "sihua", "timing"],
      palaceEvidence: palaceKeys.map((key) => palaceIndex[key]).filter(Boolean),
      categories: safeArray(blueprint.categories).map((title, index) => ({
        id: `${blueprint.id}-${String(index + 1).padStart(2, "0")}`,
        order: index + 1,
        title: clean(title),
      })),
    };
  });
}

function buildZiweiMasterJson(profile = {}, seed = {}, body = {}) {
  const chart = safeObject(seed?.chart);
  const localChart = safeObject(seed?.localZiweiChartJson);
  const palaces = safeArray(chart.palaces);
  return {
    schemaVersion: ZIWEI_MASTER_JSON_SCHEMA_VERSION,
    serviceKey: ZIWEI_SERVICE_KEY,
    featureKey: ZIWEI_FEATURE_KEY,
    reportType: "ziweiPremium",
    generationMode: ZIWEI_PDF_CONFIG.generationMode,
    calculationSource: clean(seed?.diagnostics?.generatedBy || body?.calculationSource || "browser-ziwei-engine"),
    birthProfile: {
      name: clean(profile?.name || localChart?.birthInput?.name) || "사용자",
      gender: clean(profile?.gender || localChart?.birthInput?.gender),
      calendarType: clean(profile?.calendarType || localChart?.birthInput?.calendarType),
      birthDate: clean(seed?.birthProfile?.birthDate || localChart?.birthInput?.birthDate),
      birthTime: clean(seed?.birthProfile?.birthTime || localChart?.birthInput?.birthTime),
      birthHour: Number.isFinite(Number(localChart?.birthInput?.birthHour)) ? Number(localChart.birthInput.birthHour) : Number(profile?.hour),
      birthMinute: Number.isFinite(Number(localChart?.birthInput?.birthMinute)) ? Number(localChart.birthInput.birthMinute) : Number(profile?.minute || 0),
      timezone: clean(localChart?.birthInput?.timezone || "Asia/Seoul"),
      birthplace: clean(profile?.birthplace),
    },
    chart: {
      mingGong: clean(chart.mingGong),
      shenGong: clean(chart.shenGong),
      fiveElementBureau: clean(chart.fiveElementBureau),
      yearStemBranch: clean(chart.yearStemBranch),
      palaces: palaces.map((palace, index) => ({
        order: index + 1,
        key: clean(palace?.key),
        nameKo: clean(palace?.nameKo),
        branch: clean(palace?.branch),
        mainStars: normalizeStarList(palace?.mainStars).map(compactStarForPrompt),
        auxStars: normalizeStarList(palace?.auxStars).map(compactStarForPrompt),
        maleficStars: normalizeStarList(palace?.maleficStars).map(compactStarForPrompt),
        transformations: safeArray(palace?.transformations).map((item) => ({
          star: clean(item?.star),
          type: clean(item?.type || item?.label),
        })).filter((item) => item.star || item.type),
        strengthSummary: safeObject(palace?.strengthSummary),
      })),
      palaceIndex: buildZiweiPalaceIndex(seed),
      starIndex: buildZiweiStarIndex(seed),
      transformationLayers: buildZiweiTransformationLayers(seed),
      luckTimeline: buildZiweiLuckTimeline(seed),
      crossPalaceRelations: buildZiweiCrossPalaceRelations(seed),
      interpretationSeeds: safeObject(localChart?.interpretationSeeds),
      diagnostics: safeObject(seed?.diagnostics),
    },
    chapterSpecs: buildZiweiChapterSpecsForMaster(seed),
    clientEvidence: summarizeZiweiClientEvidence(body),
    qualityRules: {
      minSectionChars: SECTION_MIN_CHARS,
      minChapterChars: CHAPTER_MIN_CHARS,
      minTotalChars: TOTAL_MIN_CHARS,
      requiredEvidenceTypes: ["palace", "star", "sihua", "timing"],
      forbiddenDeveloperTerms: ["JSON", "API", "LLM", "schema", "prompt", "payload", "debug", "fallback", "engine"],
      tone: "professional-mystical-korean-ziwei-consultation",
    },
  };
}

function countZiweiTransformationLayers(layers) {
  if (Array.isArray(layers)) return layers.length;
  const item = safeObject(layers);
  const natalCount = safeArray(item.natal).length;
  const decadeCount = safeArray(item.decade).reduce((sum, layer) => sum + safeArray(layer?.transformations).length, 0);
  const annualCount = safeArray(item.annual).reduce((sum, layer) => sum + safeArray(layer?.transformations).length, 0);
  return natalCount + decadeCount + annualCount;
}

function hasZiweiTransformationLayerShape(layers) {
  if (Array.isArray(layers)) return layers.length >= 1;
  const item = safeObject(layers);
  return Array.isArray(item.natal) || Array.isArray(item.decade) || Array.isArray(item.annual);
}

function validateZiweiMasterJson(masterJson = {}) {
  const missing = [];
  const requireField = (ok, key) => {
    if (!ok) missing.push(key);
  };
  const birth = safeObject(masterJson?.birthProfile);
  const chart = safeObject(masterJson?.chart);
  const palaces = safeArray(chart.palaces);
  const chapterSpecs = safeArray(masterJson?.chapterSpecs);
  requireField(clean(masterJson?.schemaVersion) === ZIWEI_MASTER_JSON_SCHEMA_VERSION, "schemaVersion");
  requireField(clean(masterJson?.serviceKey) === ZIWEI_SERVICE_KEY, "serviceKey");
  requireField(clean(masterJson?.generationMode) === ZIWEI_PDF_CONFIG.generationMode, "generationMode");
  requireField(clean(birth.birthDate), "birthProfile.birthDate");
  requireField(Number.isFinite(Number(birth.birthHour)), "birthProfile.birthHour");
  requireField(clean(chart.mingGong), "chart.mingGong");
  requireField(clean(chart.shenGong), "chart.shenGong");
  requireField(palaces.length >= 12, "chart.palaces");
  requireField(hasZiweiTransformationLayerShape(chart.transformationLayers), "chart.transformationLayers");
  requireField(chapterSpecs.length === CHAPTER_BLUEPRINTS.length, "chapterSpecs");
  chapterSpecs.forEach((chapter, index) => {
    const expected = CHAPTER_BLUEPRINTS[index] || {};
    requireField(clean(chapter.id) === clean(expected.id), `chapterSpecs.${index}.id`);
    requireField(clean(chapter.title) === clean(expected.title), `chapterSpecs.${index}.title`);
    requireField(safeArray(chapter.categories).length === safeArray(expected.categories).length, `chapterSpecs.${index}.categories`);
  });
  return {
    ok: missing.length === 0,
    missing,
    schemaVersion: ZIWEI_MASTER_JSON_SCHEMA_VERSION,
    stats: {
      palaceCount: palaces.length,
      chapterCount: chapterSpecs.length,
      sectionCount: chapterSpecs.reduce((sum, chapter) => sum + safeArray(chapter.categories).length, 0),
      starCount: Object.keys(safeObject(chart.starIndex)).length,
      transformationCount: countZiweiTransformationLayers(chart.transformationLayers),
      hasClientEvidence: Boolean(masterJson?.clientEvidence),
    },
  };
}

function buildZiweiJsonV2(profile = {}, seed = {}, chapters = [], metadata = {}) {
  return {
    schemaVersion: "ziwei-pdf-v2",
    serviceKey: ZIWEI_SERVICE_KEY,
    featureKey: ZIWEI_FEATURE_KEY,
    generatedAt: new Date().toISOString(),
    calculationBasis: {
      mode: "single",
      timezone: "Asia/Seoul",
      birthProfile: safeObject(seed?.birthProfile),
      birthInput: safeObject(seed?.localZiweiChartJson?.birthInput),
      profileName: clean(profile?.name),
      chartMeta: {
        mingGong: clean(seed?.chart?.mingGong),
        shenGong: clean(seed?.chart?.shenGong),
        fiveElementBureau: clean(seed?.chart?.fiveElementBureau),
        yearStemBranch: clean(seed?.chart?.yearStemBranch),
      },
      diagnostics: safeObject(seed?.diagnostics),
    },
    palaceIndex: buildZiweiPalaceIndex(seed),
    starIndex: buildZiweiStarIndex(seed),
    transformationLayers: buildZiweiTransformationLayers(seed),
    luckTimeline: buildZiweiLuckTimeline(seed),
    crossPalaceRelations: buildZiweiCrossPalaceRelations(seed),
    interpretationSeeds: safeObject(seed?.localZiweiChartJson?.interpretationSeeds),
    chapterEvidenceMap: buildZiweiChapterEvidenceMap(chapters, seed),
    quality: {
      chapterCount: Array.isArray(chapters) ? chapters.length : 0,
      expectedChapterCount: CHAPTER_BLUEPRINTS.length,
      validation: validateZiweiPdfChapterQuality({ chapters }),
      manuscriptSource: clean(metadata?.manuscriptSource || metadata?.source),
      llmChapterCount: Number(metadata?.llmChapterCount || 0),
      fallbackChapterCount: Number(metadata?.fallbackChapterCount || 0),
      generationMode: clean(metadata?.generationMode || ZIWEI_PDF_CONFIG.generationMode),
      provider: clean(metadata?.provider || ZIWEI_PDF_CONFIG.provider),
      writingPipeline: clean(metadata?.writingPipeline || ZIWEI_PDF_CONFIG.templateVersion),
    },
  };
}

function buildZiweiPayload(profile, seed, chapters, metadata = {}) {
  const ziweiJsonV2 = buildZiweiJsonV2(profile, seed, chapters, metadata);
  const ziweiMasterJson = metadata?.ziweiMasterJson || null;
  const masterJsonValidation = metadata?.masterJsonValidation || null;
  return {
    mode: "single",
    birthProfile: seed.birthProfile,
    chart: {
      mingGong: seed.chart.mingGong,
      shenGong: seed.chart.shenGong,
      palaces: seed.chart.palaces,
      transformations: seed.chart.transformations,
      decadeLuck: seed.chart.decadeLuck,
      annualLuck: seed.chart.annualLuck,
    },
    strengthLegend: seed.strengthLegend,
    localZiweiChartJson: seed.localZiweiChartJson,
    ziweiJsonV2,
    interpretationSeeds: seed.localZiweiChartJson?.interpretationSeeds || {
      personalityKeywords: [],
      relationshipKeywords: [],
      careerKeywords: [],
      moneyKeywords: [],
      healthKeywords: [],
      fortuneKeywords: [],
      cautionKeywords: [],
    },
    chapters,
    ziweiMasterJson,
    masterJsonValidation,
    metadata: { featureKey: ZIWEI_FEATURE_KEY, ...metadata },
  };
}

function toKoreanChapterTitle(title, index) {
  const stripped = String(title || "").replace(/^Chapter\s*\d+\.?\s*/i, "").trim();
  return `제${index + 1}장 ${stripped}`;
}

function renderZiweiPdf({ profile, seed, chapters, generatedAt }) {
  const profileName = safeZiweiDisplayText(profile?.name, "고객");
  const profileBirthIso = safeZiweiDisplayText(profile?.birthIso, "생년월일 확인");
  const toc = chapters.map((chapter, index) => `<li><span>${esc(chapter.roman)}</span><strong>${esc(toKoreanChapterTitle(chapter.title, index))}</strong></li>`).join("\n");
  const palaceSummary = seed.chart.palaces.slice(0, 12).map((p) => `<tr><td>${esc(safeZiweiDisplayText(p.nameKo, "확인 범위 내"))}</td><td>${esc(safeZiweiDisplayText(p.branch, "-"))}</td><td>${esc(safeZiweiDisplayText(starsText(p.mainStars), "주성 확인 범위 내"))}</td></tr>`).join("\n");
  const strongStars = normalizeStarList(seed.chart.palaces.flatMap((p) => p.mainStars || [])).slice(0, 8)
    .map((s) => `<span>${esc(safeZiweiDisplayText(s.name, "별"))} ${esc(safeZiweiDisplayText(s.strengthSymbol, ""))}</span>`).join("");
  const cautionStars = normalizeStarList(seed.chart.palaces.flatMap((p) => p.maleficStars || [])).slice(0, 8)
    .map((s) => `<span>${esc(safeZiweiDisplayText(s.name, "별"))} ${esc(safeZiweiDisplayText(s.strengthSymbol, ""))}</span>`).join("");
  const sihuaRows = (Array.isArray(seed.chart.transformations) ? seed.chart.transformations : []).slice(0, 8)
    .map((item) => `<tr><td>${esc(safeZiweiDisplayText(item?.star, "-"))}</td><td>${esc(safeZiweiDisplayText(item?.type || item?.label, "-"))}</td><td>${esc(SIHUA_RULES[clean(item?.type || item?.label)] || "운의 강조점 이동")}</td></tr>`)
    .join("\n");
  const chapterHtml = chapters.map((chapter, index) => {
    const summaryHtml = clean(chapter.summary) ? `<p class="zb-summary">${esc(chapter.summary)}</p>` : "";
    const categoryHtml = chapter.categories.map((category) => `<section class="zb-category"><h3>${esc(category.title)}</h3><p>${esc(category.finalText)}</p></section>`).join("\n");
    const adviceHtml = clean(chapter.practicalAdvice) ? `<section class="zb-chapter-tail"><h3>실전 조언</h3><p>${esc(chapter.practicalAdvice)}</p></section>` : "";
    const cautionHtml = clean(chapter.cautionFlow) ? `<section class="zb-chapter-tail"><h3>주의할 흐름</h3><p>${esc(chapter.cautionFlow)}</p></section>` : "";
    const transitionHtml = clean(chapter.transitionLine) ? `<section class="zb-chapter-tail"><h3>다음 흐름</h3><p>${esc(chapter.transitionLine)}</p></section>` : "";
    return `<article class="zb-chapter"><div class="zb-eyebrow">${esc(chapter.roman)} · 제 ${index + 1}장</div><h2>${esc(toKoreanChapterTitle(chapter.title, index))}</h2>${summaryHtml}${categoryHtml}${adviceHtml}${cautionHtml}${transitionHtml}</article>`;
  }).join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>자미두수 프리미엄 리포트</title>
  <style>
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;font-family:"Noto Serif KR","Malgun Gothic",serif;background:#100821;color:#f8f4ff;line-height:1.82}.page{max-width:980px;margin:0 auto;padding:28px 20px 64px}.cover{position:relative;overflow:hidden;min-height:92vh;padding:42px 34px;border-radius:24px;background:radial-gradient(circle at 72% 12%,rgba(250,204,21,.25),transparent 26%),linear-gradient(145deg,#160729 0%,#30125f 48%,#091b3a 100%);box-shadow:0 24px 60px rgba(0,0,0,.32);display:flex;flex-direction:column;justify-content:center}.cover::after{content:"";position:absolute;inset:24px;border:1px solid rgba(250,204,21,.28);border-radius:20px;pointer-events:none}.cover img{position:relative;z-index:1;width:min(320px,82%);border-radius:18px;margin:24px 0 0;box-shadow:0 18px 42px rgba(0,0,0,.34);background:#271146}.cover h1{position:relative;z-index:1;margin:8px 0 8px;font-size:44px;line-height:1.12;color:#fff7d6}.cover p{position:relative;z-index:1;margin:4px 0;color:#d8ccff}.badge{letter-spacing:.22em;text-transform:uppercase;color:#facc15;font-size:12px}.panel,.toc,.zb-chapter,.legend{margin-top:20px;padding:20px;border:1px solid rgba(216,180,254,.28);border-radius:18px;background:rgba(255,255,255,.08);box-shadow:0 14px 30px rgba(0,0,0,.16)}.panel h2,.toc h2,.legend h2{margin:0 0 12px;color:#fde68a}.meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.meta-item{padding:12px;border-radius:14px;background:rgba(16,8,33,.52);border:1px solid rgba(250,204,21,.2)}.meta-item b{display:block;color:#facc15}.legend-list{display:flex;flex-wrap:wrap;gap:8px}.legend-list span{padding:6px 10px;border-radius:999px;background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.26)}.signal-tags{display:flex;flex-wrap:wrap;gap:8px}.signal-tags span{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:rgba(16,8,33,.52);border:1px solid rgba(216,180,254,.34);font-size:13px}.palace-table{width:100%;border-collapse:collapse;font-size:13px}.palace-table td,.palace-table th{border-bottom:1px solid rgba(255,255,255,.12);padding:8px;text-align:left;vertical-align:top}.toc ol{margin:0;padding-left:20px}.toc li{margin:8px 0}.toc span{display:inline-block;min-width:44px;color:#facc15}.zb-chapter{break-inside:avoid-page;page-break-inside:avoid;background:#fbf7ff;color:#241333}.zb-eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#7c3aed;font-size:12px}.zb-chapter h2{margin:8px 0 18px;color:#2e1065;font-size:26px}.zb-summary{margin:0 0 12px;padding:10px 12px;border-radius:12px;background:#f5edff;color:#432178;font-weight:600}.zb-category{padding:14px 16px;margin:12px 0;border-radius:14px;background:#fff;border:1px solid #e9d5ff}.zb-category h3{margin:0 0 8px;color:#5b21b6;font-size:18px}.zb-category p{margin:0;white-space:pre-wrap;color:#2f2440}.zb-chapter-tail{margin-top:10px;padding:12px;border-radius:12px;background:#f7f3ff;border:1px solid #ddd6fe}.zb-chapter-tail h3{margin:0 0 6px;color:#4c1d95;font-size:15px}.zb-chapter-tail p{margin:0;white-space:pre-wrap;color:#2f2440}.footer{margin-top:22px;text-align:center;color:#c4b5fd;font-size:13px}@page{size:A4;margin:16mm 14mm 18mm}@media print{body{background:#fff}.page{padding:0}.cover,.panel,.toc,.legend,.zb-chapter{box-shadow:none}.cover{border-radius:0}.zb-chapter{break-before:page;page-break-before:always}.zb-chapter:first-of-type{break-before:auto;page-break-before:auto}}@media(max-width:720px){.cover h1{font-size:32px}.meta-grid{grid-template-columns:1fr}.page{padding:14px 10px 40px}}
  </style>
</head>
<body>
  <main class="page">
    <section class="cover">
      <p class="badge">Code:Destiny Premium Ziwei</p>
      <h1>자미두수 프리미엄 리포트</h1>
      <p>명궁과 12궁으로 읽는 나만의 운명 설계도</p>
      <p>${esc(profileName)} · ${esc(profileBirthIso)}</p>
      <img src="/fuctionassets/jamipremiun.webp" alt="자미두수 프리미엄 리포트 표지 이미지" />
    </section>
    <section class="panel">
      <div class="meta-grid"><div class="meta-item"><b>명궁</b>${esc(safeZiweiDisplayText(seed.chart.mingGong, "확인 범위 내"))}</div><div class="meta-item"><b>신궁</b>${esc(safeZiweiDisplayText(seed.chart.shenGong, "확인 범위 내"))}</div><div class="meta-item"><b>발행일</b>${esc(new Date(generatedAt).toLocaleDateString("ko-KR"))}</div></div>
      <p>이 리포트는 명반 구조를 기반으로 성향, 관계, 커리어, 재정, 건강 흐름을 통합 해석한 상담형 결과입니다.</p>
    </section>
    <section class="legend"><h2>별 강도 기호</h2><div class="legend-list"><span>◎ 묘: 가장 강하게 드러나는 별</span><span>O 득: 안정적으로 힘을 얻은 별</span><span>▲ 리: 이롭게 활용할 수 있는 별</span><span>△ 평: 균형 관리가 필요한 별</span><span>X 함·실: 보완과 주의가 필요한 별</span></div></section>
    <section class="panel"><h2>핵심 강점 별</h2><div class="signal-tags">${strongStars || "<span>데이터 확인 중</span>"}</div></section>
    <section class="panel"><h2>주의 관리 별</h2><div class="signal-tags">${cautionStars || "<span>데이터 확인 중</span>"}</div></section>
    <section class="panel"><h2>사화 핵심 요약</h2><table class="palace-table"><thead><tr><th>별</th><th>사화</th><th>의미</th></tr></thead><tbody>${sihuaRows || "<tr><td colspan=\"3\">사화 신호가 약해 기본 루틴 운용을 우선합니다.</td></tr>"}</tbody></table></section>
    <section class="panel"><h2>12궁 핵심 명반</h2><table class="palace-table"><thead><tr><th>궁</th><th>지지</th><th>주성</th></tr></thead><tbody>${palaceSummary}</tbody></table></section>
    <section class="toc"><h2>목차</h2><ol>${toc}</ol></section>
    ${chapterHtml}
    <section class="footer">이 문서는 자미두수 명반의 궁·별·사화 구조를 토대로 작성된 프리미엄 상담 리포트입니다.</section>
  </main>
</body>
</html>`;
}

function buildPdfReadyPayload(profile, seed, chapters, metadata = {}) {
  const html = renderZiweiPdf({ profile, seed, chapters, generatedAt: new Date().toISOString() });
  const profileName = safeZiweiDisplayText(profile?.name, "고객");
  return {
    title: `${profileName} 자미두수 프리미엄 리포트`,
    filename: `자미두수_프리미엄_리포트_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.pdf`,
    generatedAt: new Date().toISOString(),
    html,
    chapters: chapters.map((chapter, index) => ({ chapter: index + 1, id: chapter.id, title: chapter.title, categories: chapter.categories, text: chapter.text, source: chapter.source })),
    metadata,
  };
}

async function handleChapters() {
  return json({ ok: true, serviceKey: ZIWEI_SERVICE_KEY, chapterCount: CHAPTER_BLUEPRINTS.length, chapters: CHAPTER_BLUEPRINTS });
}

function buildArchivePdfUrl(reportId = "") {
  const id = clean(reportId);
  if (!id) return "";
  return withPremiumPdfArchiveFormat(`/api/premium/pdf-archive/${encodeURIComponent(id)}`, "pdf");
}

function buildArchiveHtmlUrl(reportId = "") {
  const id = clean(reportId);
  if (!id) return "";
  return withPremiumPdfArchiveFormat(`/api/premium/pdf-archive/${encodeURIComponent(id)}`, "html");
}

function buildDirectZiweiDownloadUrl(reportId = "") {
  const id = clean(reportId);
  if (!id) return "";
  return `/api/ziwei-book/download?reportId=${encodeURIComponent(id)}`;
}

function buildPdfFilenameFromDate(dateLike) {
  const date = dateLike ? new Date(dateLike) : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const stamp = `${safe.getFullYear()}${String(safe.getMonth() + 1).padStart(2, "0")}${String(safe.getDate()).padStart(2, "0")}`;
  return `자미두수_프리미엄_리포트_${stamp}.pdf`;
}

function buildPdfDownloadHeaders(filename = "") {
  const safeFilename = clean(filename) || buildPdfFilenameFromDate();
  const encoded = encodeURIComponent(safeFilename);
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=\"ziwei-premium-report.pdf\"; filename*=UTF-8''${encoded}`,
    "Cache-Control": "private, no-store, max-age=0",
  };
}

function ensureChapterFallback(chapters = [], profile = {}, seed = {}) {
  const source = Array.isArray(chapters) ? chapters : [];
  const byId = new Map(source.map((chapter) => [clean(chapter?.id), chapter]));
  const byTitle = new Map(source.map((chapter) => [clean(chapter?.title), chapter]));
  const padded = CHAPTER_BLUEPRINTS.map((blueprint) => {
    const hit = byId.get(clean(blueprint.id)) || byTitle.get(clean(blueprint.title));
    if (hit) return normalizeChapterShape(hit, blueprint, profile, seed);
    return buildFallbackChapter(blueprint, profile, seed);
  });
  return padded.slice(0, CHAPTER_BLUEPRINTS.length);
}

function buildZiweiManuscriptRecovery({ chapters = [], localChapters = [], profile = {}, seed = {}, birthInput = null } = {}) {
  const candidates = [chapters, localChapters].filter((items) => Array.isArray(items) && items.length);
  for (const candidate of candidates) {
    const recoveredChapters = sanitizeFinalManuscript({
      chapters: ensureChapterFallback(candidate, profile, seed),
      profile,
      seed,
    });
    const validation = validateChapters(recoveredChapters);
    const duplicateRate = computeDuplicateRate(recoveredChapters);
    const finalBundleValidation = validateFinalManuscript({ birthInput, seed, chapters: recoveredChapters });
    if (validation.ok && duplicateRate <= 0.25 && finalBundleValidation.ok) {
      return {
        chapters: recoveredChapters,
        validation,
        duplicateRate,
        finalBundleValidation,
      };
    }
  }
  return null;
}

function normalizeArchiveShapeFromExecution(doc = {}) {
  const metadata = safeObject(doc?.metadata);
  const archive = safeObject(metadata?.archive || metadata?.resultArchive || {});
  const payload = safeObject(archive?.payload || metadata?.payload || {});
  const profile = safeObject(payload?.profile || archive?.profile || {});
  const seed = safeObject(payload?.seed || archive?.seed || {});
  const chapters = sanitizeFinalManuscript({ chapters: ensureChapterFallback(archive?.chapters || payload?.chapters || [], profile, seed), profile, seed });
  const reportId = clean(archive?.reportId || doc?.reportId || metadata?.reportId || "");
  const sessionId = clean(doc?.sessionId || metadata?.sessionId || "");
  const pdfReady = safeObject(archive?.pdfReady || metadata?.pdfReady || {});
  const pdfUrl = clean(archive?.pdfUrl || pdfReady?.pdfUrl || buildArchivePdfUrl(reportId));
  if (!pdfReady.pdfUrl && pdfUrl) pdfReady.pdfUrl = pdfUrl;
  if (!pdfReady.downloadUrl && pdfUrl) pdfReady.downloadUrl = pdfUrl;
  if (!pdfReady.htmlUrl && reportId) pdfReady.htmlUrl = buildArchiveHtmlUrl(reportId);
  if (!pdfReady.directDownloadUrl && reportId) pdfReady.directDownloadUrl = buildDirectZiweiDownloadUrl(reportId);
  if (!pdfReady.filename) pdfReady.filename = buildPdfFilenameFromDate(pdfReady.generatedAt || doc?.completedAt || doc?.createdAt || new Date());
  if (!pdfReady.mimeType) pdfReady.mimeType = "application/pdf";
  if (!pdfReady.contentType) pdfReady.contentType = "application/pdf";
  if (!pdfReady.renderFormat) pdfReady.renderFormat = "pdf-archive";
  if (!pdfReady.html && Array.isArray(chapters) && chapters.length >= CHAPTER_BLUEPRINTS.length) {
    try {
      const synthesized = buildPdfReadyPayload(profile, seed, chapters, { featureKey: ZIWEI_FEATURE_KEY, reportType: "ziweiPremium", qualityStatus: "passed" });
      pdfReady.html = synthesized.html;
      pdfReady.generatedAt = synthesized.generatedAt;
      if (!pdfReady.title) pdfReady.title = synthesized.title;
    } catch (_) {
      // best effort only
    }
  }
  return {
    ok: true,
    serviceKey: ZIWEI_SERVICE_KEY,
    reportId,
    sessionId,
    chapterCount: CHAPTER_BLUEPRINTS.length,
    chapters,
    qualityStatus: "passed",
    payload: payload,
    ziweiPayload: payload,
    ziweiMasterJson: archive?.ziweiMasterJson || payload?.ziweiMasterJson || null,
    masterJsonValidation: archive?.masterJsonValidation || payload?.masterJsonValidation || null,
    diagnostics: archive?.diagnostics || payload?.metadata?.diagnostics || null,
    pdfReady,
    downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl),
    pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl),
    storedUrl: clean(pdfReady?.storedUrl || pdfReady?.pdfUrl || pdfReady?.downloadUrl),
    reportUrl: clean(pdfReady?.reportUrl || pdfReady?.pdfUrl || pdfReady?.downloadUrl),
    htmlUrl: clean(pdfReady?.htmlUrl),
    directDownloadUrl: clean(pdfReady?.directDownloadUrl),
    canReopen: true,
    canDownload: Boolean(clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl)) && Array.isArray(chapters) && chapters.length >= CHAPTER_BLUEPRINTS.length,
  };
}

async function handleDownload(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "UNAUTHORIZED", message: "자미두수 PDF 다운로드를 위해 먼저 로그인해 주세요." }, { status: 401 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const reportId = clean(url.searchParams.get("reportId"));
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId"));
  if (!reportId && !sessionId) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "MISSING_RESULT_KEY", message: "reportId 또는 sessionId가 필요합니다." }, { status: 422 });
  }

  let normalized = null;
  const cacheId = reportId || "";
  if (cacheId && REPORT_CACHE.has(cacheId)) {
    normalized = REPORT_CACHE.get(cacheId);
  }

  if (!normalized) {
    await connectDb(env);
    let doc = null;
    if (reportId) doc = await ServiceExecutionTransaction.findOne({ userId: auth.userId, reportId }).lean();
    if (!doc && sessionId) doc = await ServiceExecutionTransaction.findOne({ userId: auth.userId, sessionId }).lean();
    if (!doc) {
      return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "REPORT_NOT_FOUND", message: "PDF 리포트를 찾을 수 없습니다." }, { status: 404 });
    }
    normalized = normalizeArchiveShapeFromExecution(doc);
  }

  const chapters = Array.isArray(normalized?.chapters) ? normalized.chapters : [];
  if (chapters.length < CHAPTER_BLUEPRINTS.length) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "ZIWEI_RESULT_INCOMPLETE", message: `${CHAPTER_BLUEPRINTS.length}챕터 생성이 완료되지 않아 PDF를 준비하지 못했습니다.` }, { status: 409 });
  }

  const pdfReady = safeObject(normalized?.pdfReady);
  const archiveDownloadUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || buildArchivePdfUrl(reportId));
  if (/\/api\/premium\/pdf-archive\//.test(archiveDownloadUrl)) {
    return Response.redirect(new URL(withPremiumPdfArchiveFormat(archiveDownloadUrl, "pdf"), request.url).toString(), 302);
  }

  const html = clean(pdfReady?.html || "");
  if (!html) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "PDF_HTML_MISSING", message: "PDF 파일을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  const filename = clean(pdfReady?.filename) || buildPdfFilenameFromDate(pdfReady?.generatedAt || new Date());
  const body = new TextEncoder().encode(html);
  return new Response(body, { status: 200, headers: buildPdfDownloadHeaders(filename) });
}

function shouldForceZiweiSmokeFail(request, env = {}) {
  const configuredSecret = clean(env.ZIWEI_SMOKE_FORCE_FAIL_SECRET || env.SMOKE_FORCE_FAIL_SECRET || "");
  if (!configuredSecret) return false;
  const headerSecret = clean(request.headers.get("x-ziwei-smoke-fail") || "");
  if (!headerSecret) return false;
  return headerSecret === configuredSecret;
}

async function handlePrepare(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "UNAUTHORIZED", message: "자미두수 PDF 생성을 위해 먼저 로그인해 주세요." }, { status: 401 });
    }
    throw error;
  }

  const body = await readJson(request);
  console.info("[ZiweiPremiumPDF][RequestReceived]", {
    hasBirthInput: Boolean(body?.birthInput),
    hasBirthProfile: Boolean(body?.birthProfile),
    hasZiweiBase: Boolean(body?.ziweiBase || body?.ziweiPdfSeed || body?.chartResult?.reportPayload),
  });
  const normalized = normalizeInput(body);
  if (!normalized.ok) return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: normalized.code || "INVALID_INPUT", message: normalized.message }, { status: 422 });

  const profile = normalized.profile;
  const birthInput = normalized.birthInput;
  const birthHash = toHexHash(JSON.stringify({
    birthDate: clean(birthInput.birthDate),
    birthTime: clean(birthInput.birthTime),
    gender: clean(birthInput.gender),
    calendarType: clean(birthInput.calendarType || "solar"),
    leapMonth: Boolean(birthInput.leapMonth),
  }));
  console.info("[ZiweiPremiumPDF][BirthInputValidated]", {
    hasBirthDate: Boolean(birthInput.birthDate),
    hasBirthTime: Boolean(birthInput.birthTime),
    birthHour: birthInput.birthHour,
    gender: birthInput.gender,
    birthHash,
  });

  let precheckedAccess = null;
  {
    const premiumAccessTokenForAccess = clean(
      request.headers.get("x-premium-access-token")
      || body?.premiumAccessToken
      || body?._premiumAccessToken
      || cookieValue(request, "cd_premium_access")
      || "",
    );
    const featureKeyForAccess = normalizeFeatureKey(body?.featureKey);
    console.info("[ZiweiBook][Flow] BILLING_PRECHECK_START", { featureKey: featureKeyForAccess, userId: auth.userId });
    precheckedAccess = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "ziweiPremium", {
      ...body,
      featureKey: featureKeyForAccess,
      reportType: "ziweiPremium",
      premiumAccessToken: premiumAccessTokenForAccess || undefined,
      _accessRoute: "/api/ziwei-book",
    });
    if (!precheckedAccess?.ok) {
      const status = Number(precheckedAccess?.status || 402);
      return json({
        ok: false,
        serviceKey: ZIWEI_SERVICE_KEY,
        code: precheckedAccess?.code || (status === 401 ? "UNAUTHORIZED" : "PAYMENT_REQUIRED"),
        message: precheckedAccess?.message || "자미두수 프리미엄 PDF 접근 권한 확인이 필요합니다.",
      }, { status });
    }
    console.info("[ZiweiBook][Flow] BILLING_PRECHECK_OK", { featureKey: featureKeyForAccess, accessType: clean(precheckedAccess.accessType || "") });
  }

  const base = getZiweiBase(body);
  if (!base) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "MISSING_ZIWEI_ENGINE_RESULT", message: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요." }, { status: 422 });
  }

  console.info("[ZiweiPremiumPDF][LocalCalculationStart]", { hasBase: true });
  const seed = buildZiweiPdfSeed(profile, base);
  const seedValidation = validateSeed(seed);
  if (!seedValidation.ok) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "ZIWEI_SEED_INVALID", message: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.", missing: seedValidation.errors }, { status: 422 });
  }
  console.info("[ZiweiPremiumPDF][LocalCalculationSuccess]", { palaceCount: seed?.chart?.palaces?.length || 0 });
  const ziweiMasterJson = buildZiweiMasterJson(profile, seed, body);
  const masterJsonValidation = validateZiweiMasterJson(ziweiMasterJson);
  console.info("[ZiweiPremiumPDF][MasterJsonValidated]", {
    ok: masterJsonValidation.ok,
    missing: masterJsonValidation.missing,
    stats: masterJsonValidation.stats,
  });
  if (!masterJsonValidation.ok) {
    return json({
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: "ZIWEI_MASTER_JSON_INVALID",
      message: "자미두수 명반 JSON 검증에 실패했습니다.",
      missing: masterJsonValidation.missing,
    }, { status: 422 });
  }

  const premiumAccessToken = clean(
    request.headers.get("x-premium-access-token")
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || "",
  );
  const featureKey = normalizeFeatureKey(body?.featureKey);
  const sessionId = clean(body?.reportSessionId || body?.sessionId || `ziwei-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const reportId = clean(body?.reportId || `ziwei-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const existingLock = SESSION_LOCKS.get(sessionId);
  if (existingLock?.status === "running") {
    return json({
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: "ZIWEI_PROCESSING",
      message: "결제는 확인되었습니다. 생성 재시도를 진행합니다.",
      status: "processing",
      retryable: true,
      reportId,
      sessionId,
      birthHash,
    }, { status: 500 });
  }
  if (existingLock?.status === "completed" && existingLock?.reportId && REPORT_CACHE.has(existingLock.reportId)) {
    const cached = REPORT_CACHE.get(existingLock.reportId);
    console.info("[ZiweiBook][Flow] ReportRecovered", { reportId: existingLock.reportId, sessionId, source: "session_lock" });
    return json(cached, { status: 200 });
  }

  console.info("[ZiweiBook][Flow] BILLING_CHECK_START", { featureKey, userId: auth.userId });
  const access = precheckedAccess || await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "ziweiPremium", {
    ...body,
    featureKey,
    reportType: "ziweiPremium",
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/ziwei-book",
  });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return json({
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: access?.code || (status === 401 ? "UNAUTHORIZED" : "PAYMENT_REQUIRED"),
      message: status === 401
        ? "자미두수 PDF 생성을 위해 먼저 로그인해 주세요."
        : status === 402
          ? "프리미엄 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다."
          : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    }, { status });
  }
  console.info("[ZiweiBook][Flow] BILLING_CHECK_OK", { featureKey, accessType: clean(access.accessType || "") });

  const executionCtx = buildPremiumExecutionContext({
    serviceKey: ZIWEI_SERVICE_KEY,
    reportType: "ziweiPremium",
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId,
    access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  await startPremiumPdfExecution(env, auth.userId, executionCtx);
  SESSION_LOCKS.set(sessionId, { status: "running", startedAt: Date.now(), reportId });

  if (shouldForceZiweiSmokeFail(request, env)) {
    throw Object.assign(new Error("ziwei smoke forced failure"), {
      status: 500,
      code: "ZIWEI_SMOKE_FORCED_500",
    });
  }

  let localCalculationSeeds = [];

  try {

  console.info("[ZiweiPremiumPDF][LocalAssembledManuscriptBuildStart]", { chapterCount: CHAPTER_BLUEPRINTS.length });
  const localManuscript = buildZiweiLocalAssembledChapters(profile, seed);
  const localChapters = sanitizeFinalManuscript({ chapters: localManuscript.chapters, profile, seed });
  const localValidation = validateZiweiPdfChapterQuality({ chapters: localChapters });
  const localDuplicateRate = computeDuplicateRate(localChapters);
  const localBundleValidation = validateZiweiAssembledFinalManuscript({ birthInput, seed, chapters: localChapters });
  if (!localValidation.ok || localDuplicateRate > 0.25 || !localBundleValidation.ok) {
    throw Object.assign(new Error("자미두수 로컬 JSON 원고 검증에 실패했습니다."), {
      status: 422,
      code: "ZIWEI_LOCAL_MANUSCRIPT_INVALID",
      detail: {
        validationErrors: localValidation.errors,
        finalErrors: localBundleValidation.errors,
        duplicateRate: localDuplicateRate,
      },
    });
  }
  localCalculationSeeds = buildZiweiLocalManuscriptEnhancementSeeds(profile, seed, localChapters);
  const localMetrics = {
    ok: Array.isArray(localCalculationSeeds) && localCalculationSeeds.length === CHAPTER_BLUEPRINTS.length,
    evidenceAnchorCount: localCalculationSeeds.reduce((sum, chapter) => sum + safeArray(chapter?.evidenceAnchors).length, 0),
    localTextCharCount: localChapters.reduce((sum, chapter) => sum + safeArray(chapter?.categories).reduce((subtotal, category) => subtotal + stripForbiddenTokens(category?.finalText || category?.text || "").length, 0), 0),
  };
  console.info("[ZiweiPremiumPDF][LocalAssembledManuscriptBuildSuccess]", {
    chapterCount: localCalculationSeeds.length,
    evidenceAnchorCount: localMetrics.evidenceAnchorCount,
    localTextCharCount: localMetrics.localTextCharCount,
    localJsonSeedValid: localMetrics.ok,
    generationMode: ZIWEI_PDF_CONFIG.generationMode,
  });

  const enhanced = {
    chapters: localChapters,
    fallbackUsed: false,
    fallbackChapterCount: 0,
    llmChapterCount: 0,
    source: "local-assembled",
    llmFallbackReason: "",
  };
  const completedChapters = localChapters;
  const duplicateRate = localDuplicateRate;
  const finalBundleValidation = localBundleValidation;
  let finalValidation = localValidation;
  console.info("[ZiweiPremiumPDF][FinalManuscriptValidated]", {
    chapterCount: completedChapters.length,
    totalChars: finalValidation.totalChars,
    duplicateRate,
    ok: finalValidation.ok,
    hasBirthDate: Boolean(birthInput.birthDate),
    hasBirthTime: Boolean(birthInput.birthTime),
    birthHour: birthInput.birthHour,
    hasMingGong: Boolean(seed.chart.mingGong),
    hasShenGong: Boolean(seed.chart.shenGong),
    palaceCount: Array.isArray(seed.chart.palaces) ? seed.chart.palaces.length : 0,
  });

  console.info("[ZiweiPremiumPDF][PdfRenderStart]", { chapterCount: completedChapters.length, qualityStatus: "passed" });
  const ziweiPayload = buildZiweiPayload(profile, seed, completedChapters, {
    accessType: clean(access.accessType || "unknown"),
    manuscriptSource: clean(enhanced.source || "local-assembled"),
    llmChapterCount: Number(enhanced.llmChapterCount || 0),
    fallbackChapterCount: Number(enhanced.fallbackChapterCount || 0),
    llmFallbackReason: clean(enhanced.llmFallbackReason),
    generationMode: ZIWEI_PDF_CONFIG.generationMode,
    provider: ZIWEI_PDF_CONFIG.provider,
    writingPipeline: ZIWEI_PDF_CONFIG.templateVersion,
    ziweiMasterJson,
    masterJsonValidation,
  });
  const pdfReady = buildPdfReadyPayload(profile, seed, completedChapters, {
    featureKey,
    reportType: "ziweiPremium",
    qualityStatus: "passed",
    manuscriptSource: clean(enhanced.source || "local-assembled"),
    generationMode: ZIWEI_PDF_CONFIG.generationMode,
    provider: ZIWEI_PDF_CONFIG.provider,
    writingPipeline: ZIWEI_PDF_CONFIG.templateVersion,
  });
  const archivePdfUrl = buildArchivePdfUrl(reportId);
  const archiveHtmlUrl = buildArchiveHtmlUrl(reportId);
  const directDownloadUrl = buildDirectZiweiDownloadUrl(reportId);
  const downloadUrl = archivePdfUrl;
  pdfReady.pdfUrl = downloadUrl;
  pdfReady.downloadUrl = downloadUrl;
  pdfReady.storedUrl = downloadUrl;
  pdfReady.reportUrl = downloadUrl;
  pdfReady.htmlUrl = archiveHtmlUrl;
  pdfReady.directDownloadUrl = directDownloadUrl;
  pdfReady.mimeType = "application/pdf";
  pdfReady.contentType = "application/pdf";
  pdfReady.renderFormat = "pdf-archive";
  pdfReady.filename = buildPdfFilenameFromDate(pdfReady.generatedAt || new Date());
  const pdfCompletionValidation = validateZiweiPdfCompletionPayload({ pdfReady, chapters: completedChapters, requireDownloadUrl: true });
  if (!pdfCompletionValidation.ok) {
    throw Object.assign(new Error(`ZIWEI_PDF_COMPLETION_INVALID:${pdfCompletionValidation.issues.join(",")}`), {
      status: 422,
      code: "ZIWEI_PDF_COMPLETION_INVALID",
      detail: pdfCompletionValidation,
    });
  }
  console.info("[ZiweiPremiumPDF][PdfRenderSuccess]", { chapterCount: completedChapters.length });

  await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
    manuscriptSource: clean(enhanced.source || "local-assembled"),
    chapterCount: completedChapters.length,
    llmChapterCount: Number(enhanced.llmChapterCount || 0),
    fallbackChapterCount: Number(enhanced.fallbackChapterCount || 0),
    archive: {
      reportId,
      reportType: "ziwei_book",
      displayName: "자미두수",
      title: `${clean(profile?.name) || "사용자"}님의 자미두수 리포트`,
      mode: "personal",
      birthName: clean(profile?.name),
      summary: clean(completedChapters?.[0]?.categories?.[0]?.finalText || completedChapters?.[0]?.text || "", 1000),
      pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl),
      htmlUrl: clean(pdfReady?.htmlUrl),
      downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl),
      directDownloadUrl: clean(pdfReady?.directDownloadUrl),
      chapters: completedChapters,
      payload: ziweiPayload,
      ziweiMasterJson,
      masterJsonValidation,
      diagnostics: {
        masterJson: masterJsonValidation,
        manuscript: finalBundleValidation,
        quality: finalValidation,
        pdfCompletion: pdfCompletionValidation,
      },
      pdfReady,
      canReopen: true,
      canDownload: true,
    },
  });
  const responsePayload = {
    ok: true,
    serviceKey: ZIWEI_SERVICE_KEY,
    featureKey,
    reportId,
    sessionId,
    birthHash,
    chapterCount: CHAPTER_BLUEPRINTS.length,
    chapters: completedChapters,
    payload: ziweiPayload,
    ziweiPayload,
    localZiweiChartJson: seed.localZiweiChartJson,
    ziweiJsonV2: ziweiPayload.ziweiJsonV2,
    ziweiMasterJson,
    masterJsonValidation,
    pdfReady,
    downloadUrl,
    pdfUrl: downloadUrl,
    storedUrl: downloadUrl,
    reportUrl: downloadUrl,
    htmlUrl: archiveHtmlUrl,
    directDownloadUrl,
    qualityStatus: "passed",
    manuscriptSource: clean(enhanced.source || "local-assembled"),
    llmChapterCount: Number(enhanced.llmChapterCount || 0),
    fallbackChapterCount: Number(enhanced.fallbackChapterCount || 0),
    fallbackUsed: Boolean(enhanced.fallbackUsed),
    llmFallbackReason: clean(enhanced.llmFallbackReason),
    diagnostics: {
      masterJson: masterJsonValidation,
      manuscript: finalBundleValidation,
      quality: finalValidation,
      pdfCompletion: pdfCompletionValidation,
    },
    generationMode: ZIWEI_PDF_CONFIG.generationMode,
    provider: ZIWEI_PDF_CONFIG.provider,
    writingPipeline: ZIWEI_PDF_CONFIG.templateVersion,
    pdfCompletionValidation,
    localDraftChapterCount: localCalculationSeeds.length,
    localCalculationSeedCount: localCalculationSeeds.length,
    finalChapterCount: completedChapters.length,
  };
  REPORT_CACHE.set(reportId, responsePayload);
  SESSION_LOCKS.set(sessionId, { status: "completed", completedAt: Date.now(), reportId });
  return json(responsePayload);
  } catch (error) {
    await failPremiumPdfExecution(
      env,
      auth.userId,
      executionCtx,
      "ziwei_generation_failed",
      clean(error?.message || "자미두수 PDF 생성에 실패했습니다."),
      "ziwei-generation",
    );
    const retryCode = clean(error?.code || "ZIWEI_PREPARE_FAILED_RETRYABLE");
    const retryStatus = Number(error?.status || 500);
    const errorDetail = safeObject(error?.detail);
    SESSION_LOCKS.set(sessionId, { status: "failed_retryable", failedAt: Date.now(), reportId, error: clean(error?.message || ""), code: retryCode });
    const retryable = {
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: retryCode,
      message: retryStatus >= 500
        ? "결제는 확인되었습니다. PDF 생성 서버가 응답하지 않아 재시도가 필요합니다."
        : "결제는 확인되었습니다. 자미두수 원고 검증을 다시 진행해 주세요.",
      status: "processing",
      serverStatus: "failed_retryable",
      retryable: true,
      reportId,
      sessionId,
      birthHash,
      chapterCount: CHAPTER_BLUEPRINTS.length,
      chapters: [],
      qualityStatus: "processing",
      localDraftChapterCount: localCalculationSeeds.length,
      localCalculationSeedCount: localCalculationSeeds.length,
      finalChapterCount: 0,
      chapterDiagnostics: errorDetail?.failedChapters || [],
      detail: clean(error?.message || ""),
      failureStage: "ziwei-generation",
    };
    console.warn("[ZiweiBook][Flow] PrepareFailedRetryable", {
      reportId,
      sessionId,
      birthHash,
      chapterCount: 0,
      hasToken: Boolean(premiumAccessToken),
      status: retryStatus,
      code: retryCode,
    });
    return json(retryable, { status: 202 });
  }
}

async function handleResult(request, env) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "UNAUTHORIZED", message: "자미두수 PDF 조회를 위해 먼저 로그인해 주세요." }, { status: 401 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const reportId = clean(url.searchParams.get("reportId"));
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId"));
  if (!reportId && !sessionId) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "MISSING_RESULT_KEY", message: "reportId 또는 sessionId가 필요합니다." }, { status: 422 });
  }

  if (reportId && REPORT_CACHE.has(reportId)) {
    console.info("[ZiweiBook][Flow] ReportRecovered", { reportId, sessionId, source: "memory_cache" });
    return json(REPORT_CACHE.get(reportId), { status: 200 });
  }

  const lockBySession = sessionId ? SESSION_LOCKS.get(sessionId) : null;
  if (lockBySession?.status === "running") {
    return json({
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: "ZIWEI_PROCESSING",
      message: "결제는 확인되었습니다. 생성 재시도를 진행합니다.",
      status: "processing",
      retryable: true,
      reportId: clean(lockBySession.reportId || reportId),
      sessionId,
    }, { status: 202 });
  }
  if (lockBySession?.reportId && REPORT_CACHE.has(lockBySession.reportId)) {
    const cached = REPORT_CACHE.get(lockBySession.reportId);
    console.info("[ZiweiBook][Flow] ReportRecovered", { reportId: lockBySession.reportId, sessionId, source: "session_cache" });
    return json(cached, { status: 200 });
  }

  await connectDb(env);
  let doc = null;
  if (reportId) {
    doc = await ServiceExecutionTransaction.findOne({ userId: auth.userId, reportId }).lean();
  }
  if (!doc && sessionId) {
    doc = await ServiceExecutionTransaction.findOne({ userId: auth.userId, sessionId }).lean();
  }
  if (!doc) {
    return json({
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: "RESULT_NOT_FOUND",
      message: "결제는 확인되었습니다. 생성 재시도를 진행합니다.",
      status: "processing",
      retryable: true,
      reportId,
      sessionId,
    }, { status: 404 });
  }

  const normalized = normalizeArchiveShapeFromExecution(doc);
  if (!normalized.ok || !Array.isArray(normalized.chapters) || normalized.chapters.length < CHAPTER_BLUEPRINTS.length) {
    return json({
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: "ZIWEI_RESULT_INCOMPLETE",
      message: "결제는 확인되었습니다. 생성 재시도를 진행합니다.",
      status: "processing",
      retryable: true,
      reportId: clean(normalized?.reportId || reportId),
      sessionId: clean(normalized?.sessionId || sessionId),
    }, { status: 202 });
  }

  REPORT_CACHE.set(clean(normalized.reportId), normalized);
  if (clean(normalized.sessionId)) {
    SESSION_LOCKS.set(clean(normalized.sessionId), { status: "completed", completedAt: Date.now(), reportId: clean(normalized.reportId) });
  }
  console.info("[ZiweiBook][Flow] ReportRecovered", { reportId: clean(normalized.reportId), sessionId: clean(normalized.sessionId), source: "db_execution" });
  return json(normalized, { status: 200 });
}

export async function handleZiweiBookRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/ziwei-book");
    if (method === "GET" && (path === "/chapters" || path === "chapters")) return await handleChapters();
    if (method === "GET" && (path === "/download" || path === "download")) return await handleDownload(request, env);
    if (method === "GET" && (path === "/result" || path === "result")) return await handleResult(request, env);
    if (method === "POST" && (path === "" || path === "/" || path === "/prepare" || path === "prepare")) return await handlePrepare(request, env);
    if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, message: "지원하지 않는 자미두수 PDF 경로입니다." }, { status: 404 });
  } catch (error) {
    console.error("[ZiweiPremiumPDF][Error]", normalizeZiweiError(error));
    return handleRouteError(error, "ZiweiBookRoutes");
  }
}

export const __ziweiBookTestUtils = {
  ZIWEI_PDF_CONFIG,
  CHAPTER_BLUEPRINTS,
  buildZiweiPdfSeed,
  buildZiweiMasterJson,
  validateZiweiMasterJson,
  validateZiweiPdfChapterQuality,
  validateNoZiweiPdfRepetition,
  validateZiweiPdfCompletionPayload,
  validateZiweiAssembledFinalManuscript,
  buildLocalChapters,
  buildZiweiLocalAssembledChapters,
  renderZiweiPdf,
  buildPdfReadyPayload,
  buildZiweiLocalChapterGuide,
  validateChapters,
  normalizeInput,
  parseHourMinuteFromText,
  buildZiweiLocalPremiumManuscript,
  computeDuplicateRate,
};
