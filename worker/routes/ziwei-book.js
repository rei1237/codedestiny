import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { verifyPremiumAccessToken } from "../lib/premium-access-token.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import {
  generateZiweiPremiumReport,
  validateZiweiPdfCompletionPayload as validateZiweiLlmPdfCompletionPayload,
  ZIWEI_PDF_CONFIG as ZIWEI_LLM_PDF_CONFIG,
  ZIWEI_PREMIUM_CHAPTERS_V3,
} from "../lib/ziwei-premium-pdf-v3.js";
import { callGeminiText } from "../lib/gemini.js";

const ZIWEI_SERVICE_KEY = "ziwei-book";
const ZIWEI_FEATURE_KEY = "premium-ziwei-report";
const ZIWEI_FEATURE_ALIASES = new Set(["premium-ziwei-report", "premium_pdf_ziwei"]);
const ZIWEI_AI_CONSULTATION_SERVICE_TYPE = "ziwei_ai_consultation";
const ZIWEI_AI_CONSULTATION_ROUTE = "/api/ziwei-book/ai-consultation";
const ZIWEI_AI_CONSULTATION_MARKER = "[Ziwei AI Consultation]";
const ZIWEI_AI_CONSULTATION_CATEGORIES = Object.freeze({
  general: "종합 자미두수 리딩",
  core: "성격과 운명 구조",
  career: "직업/커리어",
  money: "재물/사업",
  love: "연애/결혼",
  relationship: "인간관계",
  family: "가족/부모",
  health: "건강/멘탈",
  business: "이직/창업",
  yearly: "올해의 운세",
  luck: "대한/유년 흐름",
  turning_point: "인생 전환점",
  choice: "지금의 선택",
  palace_deep: "궁별 심화 해석",
});
const ZIWEI_MASTER_JSON_SCHEMA_VERSION = "ziwei-premium-master-json.v1";
const ZIWEI_PDF_CONFIG = ZIWEI_LLM_PDF_CONFIG;
const CHAPTER_MIN_CHARS = 3200;
const SECTION_MIN_CHARS = 700;
const TOTAL_MIN_CHARS = 50000;
const SESSION_LOCKS = new Map();
const REPORT_CACHE = new Map();
const ZIWEI_PROGRESS_POLL_MS = 4000;
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

const CHAPTER_BLUEPRINTS = ZIWEI_PREMIUM_CHAPTERS_V3.map((chapter) => ({
  id: chapter.id,
  roman: String(chapter.order).padStart(2, "0"),
  palaceKey: "ming",
  title: chapter.title,
  categories: chapter.sections,
}));

const ZIWEI_CATEGORY_CONTEXTS = Object.freeze({
  "01": [
    { palaceKeys: ["ming"], focus: "명반의 첫인상과 중심 성향" },
    { palaceKeys: ["ming", "body"], focus: "명궁과 신궁의 선천·후천 축" },
    { palaceKeys: ["ming", "fortune", "career"], focus: "삶을 반복해서 움직이는 주제" },
    { palaceKeys: ["ming", "career", "wealth"], focus: "타고난 강점과 현실 활용 영역" },
    { palaceKeys: ["ming", "health", "friends"], focus: "초기 리스크와 관계·컨디션 관리" },
  ],
  "02": [
    { palaceKeys: ["ming"], focus: "명궁 주성의 자아 결" },
    { palaceKeys: ["body"], focus: "신궁이 밀어 올리는 후천 구동력" },
    { palaceKeys: ["ming", "body"], focus: "내면 기준과 실제 행동의 간극" },
    { palaceKeys: ["body", "career", "fortune"], focus: "성장하며 선명해지는 방향" },
    { palaceKeys: ["ming", "body", "health"], focus: "자기 운을 안정시키는 루틴" },
  ],
  "03": [
    { palaceKeys: ["wealth", "fortune"], focus: "화록이 여는 욕망과 기회", timingMode: "sihua" },
    { palaceKeys: ["career", "ming"], focus: "화권이 만드는 힘과 책임", timingMode: "sihua" },
    { palaceKeys: ["career", "friends"], focus: "화과가 정리하는 평판과 명예", timingMode: "sihua" },
    { palaceKeys: ["health", "fortune"], focus: "화기가 드러내는 집착과 막힘", timingMode: "sihua" },
    { palaceKeys: ["ming", "wealth", "career", "health"], focus: "사화를 균형 있게 쓰는 전략", timingMode: "sihua" },
  ],
  "04": [
    { palaceKeys: ["ming"], focus: "명반을 지배하는 핵심 주성" },
    { palaceKeys: ["ming", "career"], focus: "주성의 강약과 현실 발현" },
    { palaceKeys: ["ming", "spouse", "friends"], focus: "주성 조합의 균형과 충돌" },
    { palaceKeys: ["ming", "fortune"], focus: "주성이 만드는 선택 습관" },
    { palaceKeys: ["career", "wealth", "ming"], focus: "주성을 실제 성과로 바꾸는 법" },
  ],
  "05": [
    { palaceKeys: ["ming", "friends"], focus: "보좌성이 열어 주는 보호 신호" },
    { palaceKeys: ["health", "career"], focus: "살성이 만드는 압박과 경계선" },
    { palaceKeys: ["ming", "career", "spouse"], focus: "별들이 발동하는 트리거 패턴" },
    { palaceKeys: ["spouse", "friends", "career"], focus: "관계와 일에 미치는 영향" },
    { palaceKeys: ["health", "fortune", "ming"], focus: "압박 신호를 완화하는 운영법" },
  ],
  "06": [
    { palaceKeys: ["wealth"], focus: "재백궁이 보여주는 돈의 그릇" },
    { palaceKeys: ["career"], focus: "관록궁이 만드는 직업 속도" },
    { palaceKeys: ["wealth", "career"], focus: "재물과 명예가 연결되는 방식" },
    { palaceKeys: ["wealth", "career", "health"], focus: "돈이 새는 위험과 사회적 압박" },
    { palaceKeys: ["career", "wealth", "fortune"], focus: "성장 실행을 오래 유지하는 법" },
  ],
  "07": [
    { palaceKeys: ["spouse"], focus: "부부궁이 보여주는 인연 패턴" },
    { palaceKeys: ["spouse", "ming"], focus: "연애와 결혼의 흐름" },
    { palaceKeys: ["spouse", "children", "fortune"], focus: "가족 안에서 반복되는 감정 구조" },
    { palaceKeys: ["children"], focus: "자녀궁이 드러내는 창조성과 생활 리듬" },
    { palaceKeys: ["spouse", "children", "health"], focus: "관계를 안정시키는 조화 가이드" },
  ],
  "08": [
    { palaceKeys: ["travel"], focus: "천이궁이 여는 외부 기회" },
    { palaceKeys: ["property"], focus: "전택궁이 만드는 자산과 거처 기반" },
    { palaceKeys: ["travel", "career"], focus: "이동·이직·확장 타이밍" },
    { palaceKeys: ["property", "wealth"], focus: "집과 공간을 다루는 전략" },
    { palaceKeys: ["travel", "property", "friends"], focus: "밖에서 열리는 기회 지도" },
  ],
  "09": [
    { palaceKeys: ["friends"], focus: "사회적 네트워크의 기본 결" },
    { palaceKeys: ["friends", "career"], focus: "협업자와 동료의 질" },
    { palaceKeys: ["friends", "siblings"], focus: "신뢰가 쌓이는 신호" },
    { palaceKeys: ["friends", "siblings", "wealth"], focus: "갈등과 손실을 부르는 신호" },
    { palaceKeys: ["friends", "siblings", "fortune"], focus: "사람 운을 살리는 관계 운영법" },
  ],
  "10": [
    { palaceKeys: ["fortune"], focus: "복덕궁이 보여주는 마음의 안정축" },
    { palaceKeys: ["parents"], focus: "부모궁과 원가족 패턴" },
    { palaceKeys: ["fortune", "health"], focus: "감정 회복과 쉼의 방식" },
    { palaceKeys: ["parents", "property", "wealth"], focus: "권위·상속·기대에서 반복되는 흐름" },
    { palaceKeys: ["fortune", "parents", "health"], focus: "마음을 지키는 실전 수련" },
  ],
  "11": [
    { palaceKeys: ["health"], focus: "질액궁이 드러내는 몸의 경고 지도" },
    { palaceKeys: ["health", "fortune"], focus: "스트레스가 쌓이는 신호" },
    { palaceKeys: ["health", "ming"], focus: "기운 관리와 회복 속도" },
    { palaceKeys: ["health", "property"], focus: "생활 습관을 교정해야 하는 영역" },
    { palaceKeys: ["health", "fortune", "ming"], focus: "예방 중심의 체크리스트" },
  ],
  "12": [
    { palaceKeys: ["ming", "career"], focus: "현재 대한의 핵심 주제", timingMode: "decade" },
    { palaceKeys: ["career", "wealth"], focus: "대한이 여는 기회", timingMode: "decade" },
    { palaceKeys: ["health", "fortune"], focus: "대한에서 조심해야 할 위험", timingMode: "decade" },
    { palaceKeys: ["ming", "wealth", "career"], focus: "10년 주기의 우선순위", timingMode: "decade" },
    { palaceKeys: ["career", "wealth", "health"], focus: "대한을 실행 전략으로 바꾸는 법", timingMode: "decade" },
  ],
  "13": [
    { palaceKeys: ["ming", "fortune"], focus: "올해 흐름의 전체 요약", timingMode: "annual" },
    { palaceKeys: ["career", "wealth"], focus: "월별·분기별 실행 계획", timingMode: "annual" },
    { palaceKeys: ["career", "friends"], focus: "기회가 열리는 타이밍", timingMode: "annual" },
    { palaceKeys: ["health", "spouse"], focus: "주의해야 할 경고 구간", timingMode: "annual" },
    { palaceKeys: ["ming", "career", "health"], focus: "올해 운을 현실로 만드는 행동 가이드", timingMode: "annual" },
  ],
  "14": [
    { palaceKeys: ["ming", "fortune"], focus: "생애 전체의 큰 흐름", timingMode: "lifetime" },
    { palaceKeys: ["career", "spouse", "property"], focus: "중요 전환점과 선택의 문", timingMode: "lifetime" },
    { palaceKeys: ["career", "wealth", "friends"], focus: "운이 강하게 피어나는 절정기", timingMode: "lifetime" },
    { palaceKeys: ["health", "fortune", "parents"], focus: "회복과 재정비가 필요한 주기", timingMode: "lifetime" },
    { palaceKeys: ["ming", "career", "wealth", "health"], focus: "장기 인생 운영 계획", timingMode: "lifetime" },
  ],
  "15": [
    { palaceKeys: ["ming", "body", "fortune"], focus: "이 명반의 최종 진단", timingMode: "final" },
    { palaceKeys: ["ming", "health", "career"], focus: "평생 지켜야 할 전략 규칙", timingMode: "final" },
    { palaceKeys: ["career", "wealth", "spouse"], focus: "중요 결정을 위한 체크리스트", timingMode: "final" },
    { palaceKeys: ["health", "fortune", "friends"], focus: "위기 때 작동할 안전장치", timingMode: "final" },
    { palaceKeys: ["ming", "career", "wealth", "spouse", "health"], focus: "마지막 상담 조언", timingMode: "final" },
  ],
});

const ZIWEI_CATEGORY_COUNSELING_GUIDES = Object.freeze({
  "명반 스냅샷과 첫인상": { intent: "명반 전체의 첫 기운", reading: "명궁의 첫 인상은 삶이 어떤 방식으로 열리고 닫히는지를 보여 주며, 초반 상담에서는 성향보다 반복되는 선택의 모양을 먼저 보아야 합니다.", practice: "최근 3개월 동안 가장 자주 반복된 결정, 관계 반응, 피로 신호를 한 줄씩 적어 명반의 첫 흐름과 대조하십시오.", caution: "첫인상을 단정으로 굳히면 이후 궁의 세부 신호를 놓치기 쉬우므로 강점과 부담을 같은 무게로 보아야 합니다.", review: "첫 상담 후에는 실제 생활에서 가장 빨리 반응한 궁이 어디였는지 확인하십시오." },
  "명궁·신궁·오행국의 운명 축": { intent: "선천 기질과 후천 구동력의 축", reading: "명궁은 타고난 방향을, 신궁은 시간이 흐르며 강해지는 삶의 방식을 보여 주므로 두 축의 간격이 운의 체감 차이를 만듭니다.", practice: "타고난 익숙함과 나이가 들수록 반복되는 선택을 분리해 적고, 서로 충돌하는 지점을 먼저 조정하십시오.", caution: "명궁만 믿으면 변화가 늦고 신궁만 밀면 체력이 먼저 소모되므로 두 궁의 속도를 맞추어야 합니다.", review: "한 달 뒤 선천 기준과 후천 행동이 같은 방향으로 움직였는지 점검하십시오." },
  "삶을 움직이는 주제와 반복 패턴": { intent: "반복되는 삶의 주제", reading: "반복 패턴은 약점이 아니라 운이 같은 질문을 여러 모습으로 묻는 자리이며, 같은 궁이 계속 반응하면 인생의 핵심 숙제가 됩니다.", practice: "반복되는 사람, 돈, 일, 건강 문제를 궁별로 나누어 같은 원인이 있는지 확인하십시오.", caution: "겉으로 다른 사건을 모두 별개의 문제로 보면 운의 핵심 고리를 놓칠 수 있습니다.", review: "다음 선택 전에 같은 패턴이 세 번째 반복되는지 기록으로 확인하십시오." },
  "타고난 강점과 활용 영역": { intent: "강점이 현실 성과로 바뀌는 자리", reading: "강한 별은 재능 자체보다 어디에 오래 힘을 쓸 수 있는지를 말해 주며, 활용 궁이 맞을 때 성과가 빠르게 드러납니다.", practice: "가장 자연스럽게 몰입되는 일과 실제 보상이 생기는 영역을 분리해 강점의 쓰임새를 정하십시오.", caution: "강점이 익숙하다는 이유로 과도하게 쓰면 주변 궁의 피로 신호가 먼저 올라옵니다.", review: "강점 사용 뒤 결과와 피로가 동시에 줄었는지 확인하십시오." },
  "초기 리스크와 실전 요약": { intent: "초기 위험과 우선순위", reading: "초기 리스크는 운이 막혔다는 뜻이 아니라 아직 순서가 잡히지 않은 궁이 먼저 흔들린다는 신호입니다.", practice: "가장 빨리 손실이 생기는 영역 하나를 정하고, 그 영역의 약속과 지출을 먼저 줄이십시오.", caution: "초기 경고를 무시하면 좋은 별의 도움도 뒷수습에 쓰이기 쉽습니다.", review: "7일 뒤 줄인 행동이 실제 안정감으로 돌아왔는지 확인하십시오." },
  "명궁 주성이 만드는 자아의 결": { intent: "자아의 기본 결", reading: "명궁 주성은 자신을 지키는 방식과 세상에 반응하는 첫 자세를 보여 주며, 상담의 출발점이 됩니다.", practice: "결정 직전에 가장 먼저 올라오는 감정과 논리를 기록해 명궁 주성의 작동 방식을 확인하십시오.", caution: "자아의 결을 성격으로만 보면 운의 선택 기준을 놓치게 됩니다.", review: "중요 결정마다 같은 반응이 반복되는지 확인하십시오." },
  "신궁이 밀어 올리는 후천 구동력": { intent: "후천적으로 강해지는 삶의 방식", reading: "신궁은 시간이 흐를수록 몸에 붙는 행동 방식이며, 중년 이후 운의 체감 방향을 크게 바꿉니다.", practice: "최근 1년 동안 새로 생긴 책임과 습관을 적고 신궁의 방향과 맞는지 보십시오.", caution: "신궁의 요구를 무시하면 해야 할 일은 늘지만 삶의 중심감은 약해집니다.", review: "새 책임이 나를 소모시키는지 완성시키는지 월 단위로 보십시오." },
  "내면 기준과 실제 행동의 간극": { intent: "마음과 행동의 불일치", reading: "명궁과 신궁의 간극은 생각은 알지만 몸이 따라가지 않는 지점, 또는 행동은 빠른데 마음이 납득하지 못하는 지점으로 드러납니다.", practice: "내가 옳다고 믿는 기준과 실제로 반복한 행동을 나란히 적어 간극을 줄이십시오.", caution: "간극을 의지 부족으로만 보면 운이 요구하는 속도 차이를 읽지 못합니다.", review: "2주 뒤 생각과 행동이 같은 방향으로 줄었는지 확인하십시오." },
  "성장할수록 선명해지는 방향": { intent: "후반으로 갈수록 강해지는 길", reading: "성장 방향은 젊은 시절의 재능보다 반복된 책임 속에서 남는 선택으로 나타납니다.", practice: "최근 오래 유지된 일과 자연스럽게 멀어진 일을 구분해 다음 1년의 방향을 정하십시오.", caution: "과거의 익숙한 성공을 붙잡으면 신궁이 여는 다음 문이 늦어집니다.", review: "분기마다 남는 책임이 내가 원하는 삶과 가까운지 보십시오." },
  "자기 운을 안정시키는 실행 조언": { intent: "운을 안정시키는 생활 기준", reading: "자기 운의 안정은 큰 결심보다 반복 가능한 기준을 세울 때 시작되며 명궁과 신궁의 균형이 핵심입니다.", practice: "수면, 약속, 지출, 결정 시간을 같은 기준으로 고정해 운의 흔들림을 줄이십시오.", caution: "기준 없이 좋은 기회만 따라가면 강한 별도 흩어지기 쉽습니다.", review: "30일 뒤 지킨 기준과 무너진 기준을 나누어 다시 정하십시오." },
  "화록이 여는 욕망과 기회": { intent: "화록의 기회와 끌림", reading: "화록은 욕망이 열리는 자리이며, 무엇이 쉽게 좋아지고 무엇을 더 갖고 싶어지는지 알려 줍니다.", practice: "돈, 사람, 일 중 끌림이 커지는 영역을 정하고 작은 수익이나 호감의 흐름을 확인하십시오.", caution: "화록은 달콤하지만 욕심이 커지면 경계가 흐려질 수 있습니다.", review: "기회가 실제 이익으로 남았는지, 단순한 기대였는지 구분하십시오." },
  "화권이 만드는 힘과 책임": { intent: "화권의 힘과 책임", reading: "화권은 힘이 실리는 자리이며 권한, 책임, 압박이 함께 커지는 지점을 보여 줍니다.", practice: "내가 주도권을 잡아야 할 일 하나와 내려놓아야 할 책임 하나를 분리하십시오.", caution: "화권을 밀어붙임으로 쓰면 관계가 경직되고 체력 소모가 커집니다.", review: "권한이 늘어난 뒤 책임 조건도 명확해졌는지 확인하십시오." },
  "화과가 정리하는 평판과 명예": { intent: "화과의 평판과 정리", reading: "화과는 이름, 신뢰, 정리가 이루어지는 자리이며 과거의 노력이 밖에서 인정받는 흐름입니다.", practice: "보여 줄 결과물과 정리할 기록을 정해 평판이 남을 수 있게 만드십시오.", caution: "겉모양만 다듬고 실질을 비우면 화과의 빛이 오래가지 않습니다.", review: "칭찬보다 신뢰가 반복되는지 확인하십시오." },
  "화기가 드러내는 집착과 막힘": { intent: "화기의 집착과 막힘", reading: "화기는 막힘과 집착이 드러나는 자리이며, 피하고 싶은 문제일수록 정확히 봐야 하는 지점입니다.", practice: "가장 미루고 있는 문제를 하나 정해 원인, 손실, 회복 순서로 나누십시오.", caution: "화기를 두려워해 덮으면 같은 문제가 다른 궁에서 다시 나타납니다.", review: "막힌 문제를 해결했는지보다 반복을 줄였는지 확인하십시오." },
  "사화를 균형 있게 쓰는 전략": { intent: "사화의 균형 운영", reading: "사화는 기회, 힘, 평판, 막힘이 동시에 움직이는 체계이므로 하나만 보고 판단하면 균형이 깨집니다.", practice: "화록은 키우고, 화권은 책임을 정하고, 화과는 정리하고, 화기는 줄이는 순서로 운영하십시오.", caution: "좋은 사화만 붙잡고 화기의 경고를 무시하면 결과가 흔들립니다.", review: "월말마다 네 사화 중 어느 흐름이 가장 강했는지 점검하십시오." },
  "명반을 지배하는 핵심 주성": { intent: "핵심 주성의 지배력", reading: "핵심 주성은 명반 전체의 목소리이며, 삶에서 반복적으로 선택하게 되는 방식의 중심입니다.", practice: "주성이 강하게 드러나는 일과 관계를 찾아 장기 전략의 기준으로 삼으십시오.", caution: "주성 하나만 절대화하면 다른 궁의 보완 신호를 놓칩니다.", review: "가장 큰 결정이 핵심 주성의 장점과 맞았는지 확인하십시오." },
  "주성의 강약과 현실 발현": { intent: "주성 강약의 현실화", reading: "주성의 강약은 재능의 크기보다 발현 조건을 말하며, 강한 별은 빠르게 열리고 약한 별은 환경을 맞춰야 살아납니다.", practice: "강한 별은 바로 실행하고 약한 별은 시간, 사람, 자원을 보완해 움직이십시오.", caution: "약한 별을 실패로 해석하면 회복 가능한 기회를 놓칩니다.", review: "별의 강약에 맞게 속도를 달리했는지 확인하십시오." },
  "주성 조합의 균형과 충돌": { intent: "주성 조합의 균형", reading: "주성 조합은 서로 돕거나 밀어내며, 충돌은 나쁜 것이 아니라 선택 기준이 둘 이상이라는 뜻입니다.", practice: "두 별이 요구하는 방향을 따로 적고 동시에 만족시키려 하지 말고 순서를 정하십시오.", caution: "조합의 충돌을 성급히 하나로 합치면 장점까지 약해집니다.", review: "갈등 상황에서 어떤 별의 방식이 먼저 나왔는지 보십시오." },
  "주성이 만드는 선택 습관": { intent: "주성이 만드는 선택 습관", reading: "선택 습관은 주성이 몸에 익은 방식이며, 같은 결과를 반복하게 만드는 깊은 흐름입니다.", practice: "결정 전 미루는지, 밀어붙이는지, 설득하는지, 끊어내는지 자신의 반복 방식을 기록하십시오.", caution: "익숙한 선택이 항상 유리한 선택은 아닙니다.", review: "반복 습관이 이익을 만들었는지 피로를 만들었는지 점검하십시오." },
  "주성을 실제 성과로 바꾸는 법": { intent: "주성을 성과로 전환하는 법", reading: "주성은 방향이고 성과는 운영이므로 별의 장점을 일정, 사람, 돈의 구조로 옮겨야 합니다.", practice: "주성의 장점 하나를 결과물, 수익, 관계 안정 중 하나로 연결하십시오.", caution: "재능만 믿고 구조를 만들지 않으면 운의 빛이 흩어집니다.", review: "성과가 감탄이 아니라 반복 가능한 결과로 남았는지 확인하십시오." },
  "보좌성이 열어 주는 보호 신호": { intent: "보좌성의 도움과 보호", reading: "보좌성은 혼자 해결하지 않아도 되는 도움의 문이며, 사람과 환경이 길을 열어 주는 신호입니다.", practice: "도움을 요청할 사람, 맡길 일, 함께할 기준을 구체적으로 정하십시오.", caution: "도움이 온다고 책임까지 남에게 넘기면 보좌성의 복이 약해집니다.", review: "도움을 받은 뒤 관계의 균형이 유지됐는지 확인하십시오." },
  "살성이 만드는 압박과 경계선": { intent: "살성의 압박과 경계", reading: "살성은 겁을 주는 별이 아니라 경계선을 세우라는 신호이며, 약한 구조를 드러냅니다.", practice: "압박이 생기는 사람, 돈, 일정의 한계를 숫자와 약속으로 정하십시오.", caution: "살성의 경고를 무시하면 작은 균열이 큰 손실로 번질 수 있습니다.", review: "경계선을 세운 뒤 압박이 줄었는지 확인하십시오." },
  "별들이 발동하는 트리거 패턴": { intent: "별이 작동하는 계기", reading: "별은 늘 같은 세기로 움직이지 않고 특정 사람, 시기, 책임이 닿을 때 강하게 발동합니다.", practice: "운이 흔들린 날의 사람, 장소, 돈, 컨디션을 기록해 트리거를 찾으십시오.", caution: "트리거를 모르고 반복하면 같은 별의 압박을 계속 맞게 됩니다.", review: "다음 발동 전에 피해야 할 조건과 써야 할 조건을 분리하십시오." },
  "관계와 일에 미치는 영향": { intent: "관계와 일의 상호 영향", reading: "보좌성과 살성은 관계와 일 사이에서 서로 영향을 주며, 한쪽의 과부하가 다른 쪽으로 번지기 쉽습니다.", practice: "관계 부탁과 업무 책임을 분리해 수락 기준을 정하십시오.", caution: "좋은 관계라는 이유로 일의 경계를 흐리면 손실이 커집니다.", review: "관계가 일을 돕는지, 일이 관계를 소모시키는지 확인하십시오." },
  "압박 신호를 완화하는 운영법": { intent: "압박 완화 운영", reading: "압박 신호는 없애는 것이 아니라 다루는 것이며, 휴식과 책임 분리가 가장 현실적인 해법입니다.", practice: "압박이 올라오는 시간대에는 결정 수를 줄이고 회복 루틴을 먼저 배치하십시오.", caution: "버티는 것만으로는 살성의 압력이 풀리지 않습니다.", review: "완화 후 같은 문제가 다시 올라오는 간격이 길어졌는지 보십시오." },
  "재백궁이 보여주는 돈의 그릇": { intent: "돈을 담는 그릇", reading: "재백궁은 돈을 버는 재주뿐 아니라 돈을 담고 흘리는 습관을 보여 줍니다.", practice: "고정 수입, 변동 수입, 새는 지출을 따로 적어 돈의 그릇을 정비하십시오.", caution: "수입이 늘어도 그릇이 약하면 남는 돈은 적어집니다.", review: "한 달 뒤 돈이 어디서 들어오고 어디서 새는지 확인하십시오." },
  "관록궁이 만드는 직업 속도": { intent: "직업과 성취의 속도", reading: "관록궁은 일이 커지는 속도와 사회적 역할의 무게를 보여 주며, 무리한 속도는 성취를 흔듭니다.", practice: "일의 확장 속도와 감당 가능한 책임 범위를 숫자로 정하십시오.", caution: "성과 욕심이 앞서면 평판보다 피로가 먼저 쌓입니다.", review: "업무 속도가 몸과 관계를 해치지 않는지 점검하십시오." },
  "재물과 명예가 연결되는 방식": { intent: "돈과 명예의 연결", reading: "재백궁과 관록궁이 연결되면 돈은 단순 수입이 아니라 사회적 역할과 평판을 통해 움직입니다.", practice: "돈이 되는 일과 이름이 남는 일을 구분하고 둘이 만나는 지점을 키우십시오.", caution: "명예만 좇으면 수익이 약하고 돈만 좇으면 평판이 약해질 수 있습니다.", review: "성과가 수입과 신뢰를 함께 만들었는지 확인하십시오." },
  "돈이 새는 위험과 사회적 압박": { intent: "재정 손실과 사회 압박", reading: "돈이 새는 위험은 소비만이 아니라 체면, 책임, 무리한 확장으로도 나타납니다.", practice: "체면 때문에 쓰는 돈과 실제 필요한 투자를 분리하십시오.", caution: "사회적 압박에 밀려 계약이나 지출을 서두르면 손실이 커집니다.", review: "큰 지출 전 책임 조건과 회수 가능성을 다시 보십시오." },
  "성장 실행을 오래 유지하는 법": { intent: "성장 지속 전략", reading: "성장은 한 번의 기회보다 오래 유지되는 실행 구조에서 완성됩니다.", practice: "수익, 평판, 체력을 동시에 지키는 주간 운영표를 만드십시오.", caution: "성장 구간일수록 쉬는 기준이 없으면 기회가 부담으로 변합니다.", review: "성장 뒤 남는 것이 수익, 실력, 신뢰 중 무엇인지 확인하십시오." },
  "부부궁이 보여주는 인연 패턴": { intent: "인연의 기본 패턴", reading: "부부궁은 끌리는 사람의 모양과 관계에서 반복되는 기대를 보여 줍니다.", practice: "좋아하는 사람과 오래 맞는 사람의 조건을 분리해 적으십시오.", caution: "끌림만 보고 관계를 시작하면 반복되는 감정 구조가 다시 나타납니다.", review: "관계가 안정감을 주는지 긴장을 반복시키는지 확인하십시오." },
  "연애와 결혼의 흐름": { intent: "연애와 결혼의 흐름", reading: "연애는 감정의 속도이고 결혼은 생활의 구조이므로 두 흐름을 따로 보아야 합니다.", practice: "감정, 생활 습관, 돈, 가족 경계선을 대화 주제로 분리하십시오.", caution: "감정이 좋다는 이유로 생활 조건을 미루면 뒤늦게 부담이 커집니다.", review: "관계가 깊어질수록 대화가 쉬워지는지 어려워지는지 보십시오." },
  "가족 안에서 반복되는 감정 구조": { intent: "가족 감정의 반복 구조", reading: "가족 안의 반복 감정은 부부궁과 자녀궁, 복덕궁이 함께 움직일 때 뚜렷해집니다.", practice: "가족 대화에서 자주 반복되는 말과 침묵의 패턴을 기록하십시오.", caution: "가족이라는 이유로 경계선을 세우지 않으면 감정 부채가 쌓입니다.", review: "같은 말다툼이 줄었는지, 회복 시간이 짧아졌는지 보십시오." },
  "자녀궁이 드러내는 창조성과 생활 리듬": { intent: "창조성과 생활 리듬", reading: "자녀궁은 자녀만이 아니라 창조성, 돌봄, 생활 리듬의 흐름을 보여 줍니다.", practice: "돌봄과 창작, 즐거움이 살아나는 시간을 일정에 넣으십시오.", caution: "생활 리듬이 무너지면 창조성도 감정 소모로 바뀝니다.", review: "즐거움이 의무로 변하지 않았는지 확인하십시오." },
  "관계를 안정시키는 조화 가이드": { intent: "관계 안정의 조화", reading: "관계 안정은 마음이 맞는 것보다 각자의 리듬을 존중하는 구조에서 생깁니다.", practice: "함께할 시간과 혼자 회복할 시간을 분리해 약속하십시오.", caution: "조화를 위해 지나치게 참으면 나중에 더 큰 불균형이 생깁니다.", review: "상대와 나의 리듬이 모두 유지되는지 확인하십시오." },
  "천이궁이 여는 외부 기회": { intent: "외부에서 열리는 기회", reading: "천이궁은 밖으로 나갈 때 열리는 운이며, 이동과 만남, 환경 변화가 기회를 만듭니다.", practice: "새 장소, 새 사람, 새 제안 중 실제로 열리는 문을 하나 선택해 움직이십시오.", caution: "밖의 기회가 좋아 보여도 기반이 약하면 오래 버티기 어렵습니다.", review: "외부 활동이 내 기반을 넓혔는지 소모시켰는지 보십시오." },
  "전택궁이 만드는 자산과 거처 기반": { intent: "거처와 자산 기반", reading: "전택궁은 집, 공간, 부동산, 생활 기반을 보여 주며 안정감의 뿌리입니다.", practice: "사는 공간과 자산 구조를 정리해 오래 지킬 기반을 만드십시오.", caution: "공간과 자산을 감정으로만 결정하면 부담이 오래 갑니다.", review: "거처가 회복을 주는지 책임만 늘리는지 확인하십시오." },
  "이동·이직·확장 타이밍": { intent: "이동과 확장의 시점", reading: "이동과 이직은 천이궁의 기회와 관록궁의 책임이 동시에 맞을 때 유리합니다.", practice: "움직일 이유, 얻을 것, 잃을 것을 세 항목으로 나누어 판단하십시오.", caution: "답답함만으로 움직이면 같은 문제가 다른 장소에서 반복됩니다.", review: "이동 후 30일 안에 기회와 부담이 어떻게 변했는지 보십시오." },
  "집과 공간을 다루는 전략": { intent: "공간 운영 전략", reading: "공간은 운을 담는 그릇이며, 전택궁이 안정되면 다른 궁의 흔들림도 줄어듭니다.", practice: "잠, 일, 회복 공간을 분리해 생활의 중심을 다시 잡으십시오.", caution: "공간이 어수선하면 판단도 흩어지고 지출도 늘어납니다.", review: "공간 정리 후 컨디션과 지출이 안정됐는지 확인하십시오." },
  "밖에서 열리는 기회 지도": { intent: "외부 기회의 지도", reading: "밖에서 열리는 기회는 천이궁, 전택궁, 노복궁이 함께 반응할 때 현실화됩니다.", practice: "외부 만남을 기록하고 실제 이익이나 연결로 이어진 경로를 찾으십시오.", caution: "인연이 많아지는 시기에는 선택 기준이 없으면 기운이 흩어집니다.", review: "밖에서 얻은 기회가 내 기반으로 돌아왔는지 확인하십시오." },
  "사회적 네트워크의 기본 결": { intent: "사회적 네트워크의 결", reading: "노복궁은 주변 사람의 질과 사회적 연결의 온도를 보여 줍니다.", practice: "도움이 되는 인연, 소모되는 인연, 중립 인연을 나누어 관계 시간을 조정하십시오.", caution: "많은 사람보다 맞는 사람이 중요합니다.", review: "만남 뒤 기운이 살아나는지 줄어드는지 확인하십시오." },
  "협업자와 동료의 질": { intent: "협업자의 질", reading: "협업운은 능력보다 책임과 신뢰의 균형에서 갈립니다.", practice: "함께 일할 사람의 실력, 약속, 돈 문제를 미리 확인하십시오.", caution: "호감만으로 협업하면 책임의 무게가 뒤늦게 드러납니다.", review: "협업 뒤 일이 가벼워졌는지 복잡해졌는지 보십시오." },
  "신뢰가 쌓이는 신호": { intent: "신뢰가 쌓이는 신호", reading: "신뢰는 말보다 반복된 약속 이행에서 쌓이며 노복궁과 형제궁의 안정이 중요합니다.", practice: "작은 약속을 정확히 지키는 사람과 장기 관계를 키우십시오.", caution: "초반 친밀감이 강해도 책임이 약하면 신뢰로 이어지지 않습니다.", review: "세 번 이상 같은 방식으로 믿음을 준 인연인지 보십시오." },
  "갈등과 손실을 부르는 신호": { intent: "관계 손실 신호", reading: "갈등 신호는 돈, 말, 역할 경계가 흐려질 때 가장 먼저 드러납니다.", practice: "돈이 오가는 관계와 감정이 얽힌 부탁은 문장으로 조건을 남기십시오.", caution: "관계 때문에 손실을 감추면 더 큰 갈등으로 돌아옵니다.", review: "손실이 반복되는 인연은 거리 조정이 필요합니다." },
  "사람 운을 살리는 관계 운영법": { intent: "사람 운 운영법", reading: "사람 운은 인연을 늘리는 것보다 맞는 인연을 오래 살리는 운영에서 좋아집니다.", practice: "도움 주기, 도움 받기, 거리 두기의 기준을 정하십시오.", caution: "모든 관계를 좋게 유지하려 하면 핵심 인연까지 약해집니다.", review: "관계 정리 뒤 남은 인연의 질이 좋아졌는지 보십시오." },
  "복덕궁이 보여주는 마음의 안정축": { intent: "마음의 안정축", reading: "복덕궁은 마음이 어디서 쉬고 어디서 흔들리는지를 보여 주는 깊은 자리입니다.", practice: "혼자 있을 때 회복되는 방식과 불안해지는 방식을 구분하십시오.", caution: "마음의 안정 없이 성과만 키우면 운의 기쁨이 약해집니다.", review: "쉬고 난 뒤 실제로 판단이 맑아졌는지 확인하십시오." },
  "부모궁과 원가족 패턴": { intent: "원가족과 권위의 패턴", reading: "부모궁은 부모만이 아니라 권위, 기대, 보호와 부담의 기억을 보여 줍니다.", practice: "가족에게서 받은 기준과 지금도 나를 묶는 기준을 분리하십시오.", caution: "원가족의 기대를 내 운명으로 착각하면 선택이 좁아집니다.", review: "내 선택인지 오래된 기대인지 확인하십시오." },
  "감정 회복과 쉼의 방식": { intent: "감정 회복 방식", reading: "회복 방식은 복덕궁과 질액궁이 함께 말하며 마음과 몸이 동시에 쉬어야 안정됩니다.", practice: "감정이 가라앉는 행동과 몸이 회복되는 행동을 따로 정하십시오.", caution: "쉼을 미루면 작은 감정도 크게 흔들립니다.", review: "휴식 뒤 같은 문제를 덜 예민하게 보는지 확인하십시오." },
  "권위·상속·기대에서 반복되는 흐름": { intent: "권위와 기대의 반복", reading: "권위와 상속, 기대의 문제는 부모궁과 전택궁, 재백궁이 얽힐 때 현실 문제가 됩니다.", practice: "가족, 돈, 자산과 관련된 말은 감정과 조건을 분리해 정리하십시오.", caution: "좋은 뜻이라는 이유로 조건을 흐리면 오래 부담이 남습니다.", review: "기대가 나의 책임으로 굳어졌는지 확인하십시오." },
  "마음을 지키는 실전 수련": { intent: "마음을 지키는 수련", reading: "마음을 지키는 수련은 거창한 수행보다 반복되는 감정 소모를 줄이는 기술입니다.", practice: "하루에 한 번 감정이 흔들린 장면을 기록하고 원인을 궁별로 분리하십시오.", caution: "참는 것과 지키는 것은 다릅니다.", review: "감정 회복 시간이 짧아졌는지 확인하십시오." },
  "질액궁이 드러내는 몸의 경고 지도": { intent: "몸의 경고 지도", reading: "질액궁은 병을 단정하는 자리가 아니라 몸이 먼저 보내는 경고의 방향을 보여 줍니다.", practice: "피로, 수면, 소화, 긴장 신호를 기록해 반복되는 경고를 찾으십시오.", caution: "몸의 신호를 운의 약점으로만 보지 말고 생활 조정의 기준으로 삼아야 합니다.", review: "경고가 올라오는 시간과 상황이 줄었는지 확인하십시오." },
  "스트레스가 쌓이는 신호": { intent: "스트레스 누적 신호", reading: "스트레스는 마음보다 몸에 먼저 쌓일 때가 많으며 질액궁과 복덕궁이 함께 반응합니다.", practice: "스트레스가 올라오는 사람, 시간, 일을 따로 적고 회피가 아니라 조정으로 다루십시오.", caution: "익숙한 긴장을 정상으로 여기면 회복 시점을 놓칩니다.", review: "긴장이 줄어드는 조건과 늘어나는 조건을 비교하십시오." },
  "기운 관리와 회복 속도": { intent: "기운과 회복 속도", reading: "기운 관리는 운을 쓰는 속도를 조절하는 일이며 회복 속도가 곧 지속력입니다.", practice: "집중 시간과 회복 시간을 같은 중요도로 일정에 넣으십시오.", caution: "기회가 좋아도 회복 속도를 넘기면 결과가 흔들립니다.", review: "일한 시간보다 회복 후 남는 힘을 기준으로 보십시오." },
  "생활 습관을 교정해야 하는 영역": { intent: "교정해야 할 생활 습관", reading: "생활 습관은 질액궁의 신호가 현실에서 드러나는 통로입니다.", practice: "수면, 식사, 움직임, 공간 중 가장 무너진 하나부터 고치십시오.", caution: "한꺼번에 모두 고치려 하면 다시 원래 패턴으로 돌아갑니다.", review: "가장 작은 습관 하나가 2주 이상 유지됐는지 확인하십시오." },
  "예방 중심의 체크리스트": { intent: "예방 중심 점검", reading: "예방은 불안을 키우는 일이 아니라 약한 궁을 먼저 살피는 지혜입니다.", practice: "피로, 감정, 지출, 관계 신호를 주간 체크리스트로 관리하십시오.", caution: "문제가 터진 뒤 해결하려 하면 비용과 기운이 커집니다.", review: "경고가 작을 때 조정했는지 확인하십시오." },
  "현재 대한의 핵심 주제": { intent: "현재 10년 운의 핵심 주제", reading: "대한은 10년 동안 반복적으로 밀어 올리는 큰 질문이며, 지금 삶의 방향을 바꾸는 장기 흐름입니다.", practice: "현재 10년 동안 커진 책임과 줄어든 관심사를 비교해 핵심 주제를 정하십시오.", caution: "대한의 큰 흐름을 무시하면 매년의 기회도 산만하게 흩어집니다.", review: "올해 선택이 10년 방향과 맞는지 확인하십시오." },
  "대한이 여는 기회": { intent: "대한이 여는 장기 기회", reading: "대한의 기회는 갑작스러운 행운보다 오래 키울 수 있는 역할과 자원으로 열립니다.", practice: "10년 안에 키울 일, 돈, 관계 기반을 하나씩 정하십시오.", caution: "단기 이익만 좇으면 대한이 주는 큰 문을 작게 씁니다.", review: "기회가 장기 기반으로 남는지 확인하십시오." },
  "대한에서 조심해야 할 위험": { intent: "대한의 장기 위험", reading: "대한의 위험은 오래 반복될수록 커지는 습관과 책임 과잉에서 드러납니다.", practice: "10년 동안 쌓이면 손실이 될 행동 하나를 지금 줄이십시오.", caution: "작은 무리가 오래 지속되면 가장 큰 위험이 됩니다.", review: "위험 신호가 반복되는 궁을 분기마다 확인하십시오." },
  "10년 주기의 우선순위": { intent: "10년 주기의 우선순위", reading: "10년 주기는 모든 것을 동시에 이루라는 뜻이 아니라 먼저 키울 축을 정하라는 흐름입니다.", practice: "돈, 일, 관계, 건강 중 10년 동안 중심이 될 축을 하나 정하십시오.", caution: "우선순위가 없으면 좋은 운도 분산됩니다.", review: "이번 선택이 장기 우선순위를 돕는지 확인하십시오." },
  "대한을 실행 전략으로 바꾸는 법": { intent: "대한의 실행 전략화", reading: "대한은 큰 흐름이고 실행 전략은 그 흐름을 월간 행동으로 낮추는 일입니다.", practice: "10년 목표를 1년 계획, 3개월 실행, 1주 행동으로 나누십시오.", caution: "큰 운을 큰 결심으로만 두면 현실 변화가 늦습니다.", review: "이번 달 행동이 10년 방향과 연결됐는지 보십시오." },
  "올해 흐름의 전체 요약": { intent: "올해 운의 전체 흐름", reading: "유년은 올해의 반응 속도와 사건의 표면을 보여 주며 대한 위에서 움직입니다.", practice: "올해 가장 빨리 반응하는 궁을 찾아 분기별 계획의 기준으로 삼으십시오.", caution: "올해 운만 보고 장기 흐름을 잊으면 판단이 짧아집니다.", review: "분기마다 올해 흐름이 어느 궁에서 강해졌는지 확인하십시오." },
  "월별·분기별 실행 계획": { intent: "월별·분기별 실행", reading: "올해 운은 월별로 세밀하게 나누어야 실제 선택의 타이밍이 보입니다.", practice: "분기별 핵심 과제 하나와 월별 조정 기준 하나를 정하십시오.", caution: "계획을 촘촘히 세우되 회복 시간을 빼면 운이 버거워집니다.", review: "월말마다 계획보다 실제 반응이 강했던 영역을 보십시오." },
  "기회가 열리는 타이밍": { intent: "기회가 열리는 시점", reading: "기회 타이밍은 궁의 열림과 사람의 반응, 준비된 결과물이 만날 때 드러납니다.", practice: "제안, 만남, 성과가 동시에 움직이는 시기를 기록하십시오.", caution: "준비 없이 타이밍만 기다리면 기회가 지나갑니다.", review: "기회가 왔을 때 바로 보여 줄 결과물이 있었는지 보십시오." },
  "주의해야 할 경고 구간": { intent: "올해의 경고 구간", reading: "경고 구간은 멈추라는 뜻보다 속도를 낮추고 손실을 줄이라는 신호입니다.", practice: "컨디션, 관계 갈등, 지출이 동시에 늘어나는 시기를 조심하십시오.", caution: "경고를 무시하고 밀면 회복 비용이 커집니다.", review: "경고 구간 뒤 손실보다 배운 기준이 남았는지 확인하십시오." },
  "올해 운을 현실로 만드는 행동 가이드": { intent: "올해 운의 현실화", reading: "올해 운은 행동으로 옮길 때만 현실의 변화가 되며 작은 실행이 가장 중요합니다.", practice: "올해 반드시 완성할 결과물 하나와 줄일 습관 하나를 정하십시오.", caution: "운이 좋다는 말만 믿고 행동을 미루면 흐름이 약해집니다.", review: "올해 말에 남길 결과가 지금 쌓이고 있는지 확인하십시오." },
  "생애 전체의 큰 흐름": { intent: "생애 전체의 큰 흐름", reading: "생애 흐름은 여러 대한이 이어 만든 큰 길이며, 반복되는 전환점이 삶의 주제를 선명하게 합니다.", practice: "지금까지 크게 바뀐 시기를 적고 공통된 궁의 반응을 찾으십시오.", caution: "한 시기의 실패나 성공만으로 전체 생애를 단정하면 안 됩니다.", review: "현재 선택이 생애 큰 흐름에서 어느 위치인지 보십시오." },
  "중요 전환점과 선택의 문": { intent: "전환점과 선택의 문", reading: "전환점은 운이 방향을 묻는 자리이며, 일, 관계, 거처가 함께 움직일 때 강하게 나타납니다.", practice: "전환점에서는 바꿀 것과 지킬 것을 먼저 나누십시오.", caution: "모든 것을 동시에 바꾸면 중심을 잃기 쉽습니다.", review: "전환 후에도 유지해야 할 기반이 남아 있는지 확인하십시오." },
  "운이 강하게 피어나는 절정기": { intent: "운의 절정기", reading: "절정기는 힘이 가장 크게 드러나는 시기이지만 책임과 시선도 함께 커집니다.", practice: "성과를 밖으로 보여 주되 감당할 수 있는 범위에서 확장하십시오.", caution: "절정기일수록 무리한 약속이 운을 깎을 수 있습니다.", review: "성과가 평판, 수익, 건강을 모두 해치지 않았는지 보십시오." },
  "회복과 재정비가 필요한 주기": { intent: "회복과 재정비의 주기", reading: "회복 주기는 뒤처짐이 아니라 다음 흐름을 담기 위한 정비의 시간입니다.", practice: "줄일 일, 회복할 몸, 정리할 관계를 하나씩 정하십시오.", caution: "쉬어야 할 때 확장하면 다음 운의 문턱에서 힘이 부족해집니다.", review: "재정비 후 판단이 가벼워졌는지 확인하십시오." },
  "장기 인생 운영 계획": { intent: "장기 인생 운영", reading: "장기 운영은 운의 파도를 예측하는 것보다 중심 기준을 오래 유지하는 힘입니다.", practice: "10년 기준, 1년 기준, 월간 기준을 한 장에 정리하십시오.", caution: "장기 계획이 너무 빡빡하면 운의 변화를 받아들이기 어렵습니다.", review: "계획이 삶을 좁히는지 넓히는지 주기적으로 보십시오." },
  "이 명반의 최종 진단": { intent: "명반 최종 진단", reading: "최종 진단은 좋은 별과 어려운 별을 합쳐 실제로 어떤 삶의 운영법이 맞는지 정리하는 자리입니다.", practice: "가장 강한 궁, 가장 약한 궁, 가장 자주 반응하는 궁을 세 축으로 정리하십시오.", caution: "최종 진단을 한 문장 운명론으로 줄이면 세부 궁의 지혜가 사라집니다.", review: "핵심 진단이 실제 선택 기준으로 쓰였는지 확인하십시오." },
  "평생 지켜야 할 전략 규칙": { intent: "평생 전략 규칙", reading: "평생 규칙은 운이 흔들릴 때 돌아올 기준이며, 명궁과 질액궁, 관록궁의 균형에서 세워야 합니다.", practice: "무리하지 않을 기준, 돈을 지킬 기준, 관계를 지킬 기준을 각각 하나씩 정하십시오.", caution: "규칙이 없으면 좋은 운에서는 과속하고 나쁜 운에서는 흔들립니다.", review: "위기 때도 지킬 수 있는 단순한 규칙인지 확인하십시오." },
  "중요 결정을 위한 체크리스트": { intent: "중요 결정 체크리스트", reading: "중요 결정은 관록궁, 재백궁, 부부궁이 함께 반응하므로 성과와 비용, 관계 영향을 동시에 보아야 합니다.", practice: "결정 전 이익, 책임, 관계, 건강, 회복 가능성을 다섯 항목으로 체크하십시오.", caution: "하나의 장점만 보고 결정하면 다른 궁의 비용이 뒤늦게 올라옵니다.", review: "결정 후 30일 안에 예상 비용이 맞았는지 확인하십시오." },
  "위기 때 작동할 안전장치": { intent: "위기 안전장치", reading: "안전장치는 운을 피하는 장치가 아니라 흔들릴 때 손실을 줄이는 구조입니다.", practice: "돈, 사람, 몸, 일정의 비상 기준을 미리 정해 두십시오.", caution: "위기 때 즉흥적으로 판단하면 약한 궁이 먼저 무너집니다.", review: "안전장치가 실제로 작동 가능한지 작은 상황에서 시험하십시오." },
  "마지막 상담 조언": { intent: "마지막 종합 조언", reading: "마지막 조언은 명반 전체를 삶의 언어로 되돌리는 자리이며, 강점은 쓰고 약점은 돌보는 균형이 핵심입니다.", practice: "앞으로 30일 동안 가장 중요한 한 가지 행동과 반드시 줄일 한 가지 행동을 정하십시오.", caution: "좋은 말보다 지킬 수 있는 기준이 삶을 바꿉니다.", review: "30일 뒤 명반의 조언이 실제 선택에 남았는지 확인하십시오." },
});

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
  timing: "대한·유년",
});

const PALACE_MEANINGS = Object.freeze({
  명궁: "삶의 기본 성향과 운명의 중심축",
  신궁: "후천적으로 강해지는 삶의 방식",
  관록궁: "직업, 사회적 역할, 성취 방식",
  재백궁: "돈의 흐름과 재물 관리 방식",
  부부궁: "연애, 결혼, 배우자 인연",
  자녀궁: "자녀, 창조성, 돌봄과 생활 리듬",
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
  /(json|payload|seed|fallback|skeleton|template|debug|engine|meta|internal)/i,
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
    personality: ["외부와 연결될 때 기운이 살아남", "공정성과 명분을 중시", "주변을 비추는 역할을 자주 맡음"],
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
    personality: ["새로운 자극과 확장을 추구", "사교성과 매력으로 기회를 포착", "예술적 감각과 감정 기운"],
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

function getKoreanFinalConsonantIndex(value = "") {
  const text = clean(value).replace(/[^\uAC00-\uD7A3]/g, "");
  if (!text) return 0;
  const code = text.charCodeAt(text.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return 0;
  return code % 28;
}

function koreanParticleRo(value = "") {
  const jong = getKoreanFinalConsonantIndex(value);
  return jong && jong !== 8 ? "으로" : "로";
}

function koreanParticleEunNeun(value = "") {
  return getKoreanFinalConsonantIndex(value) ? "은" : "는";
}

function koreanParticleEulReul(value = "") {
  return getKoreanFinalConsonantIndex(value) ? "을" : "를";
}

function koreanParticleIga(value = "") {
  return getKoreanFinalConsonantIndex(value) ? "이" : "가";
}

function koreanParticleWaGwa(value = "") {
  return getKoreanFinalConsonantIndex(value) ? "과" : "와";
}

function ensureKoreanSentence(value = "") {
  const text = clean(value);
  if (!text) return "";
  return /[.!?。！？]$/.test(text) ? text : `${text}.`;
}

function stripZiweiSentenceEnding(value = "") {
  return clean(value).replace(/[.!?。！？]+$/g, "");
}

function naturalizeZiweiPredicate(value = "", fallback = "상담의 중심 단서로 살아납니다") {
  const text = stripZiweiSentenceEnding(value);
  if (!text) return ensureKoreanSentence(fallback);
  if (/(습니다|합니다|됩니다|입니다|냅니다|납니다|큽니다|높습니다|좋습니다|살아납니다|이어집니다|드러납니다|십시오|세요)$/.test(text)) {
    return ensureKoreanSentence(text);
  }
  const replacements = [
    [/직무 적합$/, "직무에 잘 맞습니다"],
    [/역할 적합$/, "역할에 잘 맞습니다"],
    [/역할에 강함$/, "역할에서 힘을 냅니다"],
    [/관계의 핵심$/, "관계의 핵심이 됩니다"],
    [/관계 품질을 좌우$/, "관계의 품질을 좌우합니다"],
    [/대안을 병렬 검토$/, "여러 대안을 함께 비교합니다"],
    [/관계를 설계$/, "관계를 신중하게 설계합니다"],
    [/신뢰를 증명$/, "신뢰를 증명합니다"],
    [/구조에 강함$/, "구조를 다루는 힘이 강합니다"],
    [/운영에 강함$/, "운영에서 힘을 냅니다"],
    [/운영이 적합$/, "운영에 잘 맞습니다"],
    [/관리 우수$/, "관리가 돋보입니다"],
    [/극대화$/, "크게 살아납니다"],
    [/강력히 작동$/, "강하게 살아납니다"],
    [/강하게 작동$/, "선명하게 살아납니다"],
    [/작동$/, "살아납니다"],
    [/적합$/, "잘 맞습니다"],
    [/우수$/, "돋보입니다"],
    [/강점$/, "힘을 냅니다"],
    [/상승$/, "오릅니다"],
    [/구축$/, "다져집니다"],
    [/성과화$/, "성과로 굳어집니다"],
    [/성과$/, "성과로 이어집니다"],
    [/확장$/, "넓어집니다"],
    [/연결$/, "이어집니다"],
    [/누적$/, "쌓입니다"],
    [/강화$/, "강해집니다"],
    [/확보$/, "확보됩니다"],
    [/정리$/, "정리됩니다"],
    [/구현$/, "현실에서 구현됩니다"],
    [/발휘$/, "드러납니다"],
    [/필수$/, "반드시 먼저 세워야 합니다"],
    [/좌우$/, "결과를 좌우합니다"],
    [/배치$/, "배치를 품고 있습니다"],
    [/공존$/, "함께 살아납니다"],
    [/균형$/, "균형을 이룹니다"],
    [/안정$/, "안정됩니다"],
    [/가능$/, "가능합니다"],
    [/강함$/, "강합니다"],
    [/높음$/, "높습니다"],
    [/큼$/, "큽니다"],
    [/중시$/, "중시합니다"],
    [/선호$/, "선호합니다"],
    [/이끎$/, "이끕니다"],
    [/증명$/, "증명합니다"],
    [/기여$/, "기여합니다"],
    [/필요$/, "필요합니다"],
    [/유리$/, "유리합니다"],
    [/민감$/, "민감하게 반응합니다"],
  ];
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(text)) return ensureKoreanSentence(text.replace(pattern, replacement));
  }
  if (/[가-힣]$/.test(text)) return ensureKoreanSentence(`${text}합니다`);
  return ensureKoreanSentence(fallback);
}

function softenZiweiCounselingText(value = "", variant = 0) {
  const text = stripZiweiSentenceEnding(value)
    .replace(/확인하십시오/g, variant % 2 ? "대조해 보십시오" : "확인해 보십시오")
    .replace(/기록하십시오/g, "기록해 두면 흐름이 선명해집니다")
    .replace(/정하십시오/g, "정해 두는 편이 좋습니다")
    .replace(/분리하십시오/g, "분리해 두십시오")
    .replace(/낮추십시오/g, "낮춰 보십시오")
    .replace(/맞추십시오/g, "맞추어 보십시오")
    .replace(/하십시오/g, variant % 2 ? "해 두는 편이 좋습니다" : "해 보십시오")
    .replace(/하세요/g, variant % 2 ? "해 두면 좋습니다" : "해 보세요");
  return ensureKoreanSentence(text);
}

function buildZiweiProfileContextText(profile = {}, seed = {}, categoryIndex = 0, chapterIndex = 0, categoryTitle = "") {
  if (categoryIndex !== 0) return "";
  const birthProfile = seed?.birthProfile || {};
  const gender = clean(profile?.gender || birthProfile?.gender);
  const calendarType = clean(profile?.calendarType || birthProfile?.calendarType);
  const genderText = gender === "female" ? "여성 명반" : gender === "male" ? "남성 명반" : "";
  const calendarText = calendarType === "solar" ? "양력 출생 기준" : calendarType === "lunar" ? "음력 출생 기준" : "";
  const rows = [
    safeZiweiDisplayText(seed?.chart?.fiveElementBureau, ""),
    safeZiweiDisplayText(seed?.chart?.yearStemBranch, ""),
    genderText,
    calendarText,
    safeZiweiDisplayText(profile?.birthplace || birthProfile?.birthplace, ""),
  ].filter(Boolean);
  if (!rows.length) return "";
  const baseText = rows.join(", ");
  const variants = [
    `${categoryTitle || "이 장"}을 열 때는 ${baseText}${koreanParticleEulReul(baseText)} 명반의 바탕으로 놓습니다.`,
    `${baseText}${koreanParticleEunNeun(baseText)} ${categoryTitle || "이 장"}의 첫 판단을 받치는 숨은 배경입니다.`,
    `${categoryTitle || "이 장"}에서는 ${baseText}${koreanParticleIga(baseText)} 운의 체감 온도를 정합니다.`,
    `${baseText}${koreanParticleRo(baseText)} 명반의 바닥을 짚고 ${categoryTitle || "이 장"}의 기운을 읽습니다.`,
    `${categoryTitle || "이 장"}의 상담은 ${baseText}${koreanParticleWaGwa(baseText)} 함께 열어야 깊어집니다.`,
  ];
  return variants[Math.abs(Number(chapterIndex) || 0) % variants.length];
}

function buildZiweiReviewLabels(chapterIndex = 0, categoryIndex = 0) {
  const variants = [
    ["먼저", "이어서", "끝으로"],
    ["첫 관문은", "두 번째 관문은", "마지막 관문은"],
    ["초점 하나는", "다음 초점은", "마무리 초점은"],
    ["현실 점검은", "관계 점검은", "운의 점검은"],
    ["가장 먼저", "그다음", "마지막으로"],
  ];
  return variants[(chapterIndex + categoryIndex) % variants.length];
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
  return removeAdjacentZiweiRepeatedSentences(normalizeZiweiParticleArtifacts(stripped));
}

function removeAdjacentZiweiRepeatedSentences(value = "") {
  let output = clean(value);
  for (let i = 0; i < 3; i += 1) {
    output = output.replace(/([^.!?\n]{8,}[.!?])\s+\1/g, "$1");
  }
  return output;
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
    body.ziweiChart,
    body.ziweiData,
    body.localZiweiChartJson,
    body.chartResult?.reportPayload,
    body.chartResult?.ziweiBase,
    body.chartResult?.chart,
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
    : Array.isArray(base.houses)
      ? base.houses
      : Array.isArray(base.twelvePalaces)
        ? base.twelvePalaces
        : Array.isArray(base.palaceStarData)
          ? base.palaceStarData
    : Array.isArray(base.chart?.palaces)
      ? base.chart.palaces
      : Array.isArray(base.chart?.houses)
        ? base.chart.houses
        : Array.isArray(base.chart?.twelvePalaces)
          ? base.chart.twelvePalaces
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
      transformations: Array.isArray(palace.transformations)
        ? palace.transformations
        : Array.isArray(palace.sihua)
          ? palace.sihua
          : Array.isArray(palace.fourTransformations)
            ? palace.fourTransformations
            : [],
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
  const chartMeta = { ...(base.chart || {}), ...(base.chartMeta || {}), ...(base.meta || {}) };
  const lifePalace = palaces.find((p) => p.key === "ming" || p.nameKo === "명궁") || palaces[0] || null;
  const rawBodyPalace = base.bodyPalace && typeof base.bodyPalace === "object" ? base.bodyPalace : null;
  let bodyBranch = clean(
    chartMeta.shenGong
    || chartMeta.bodyPalaceBranch
    || chartMeta.bodyPalace
    || chartMeta.shen
    || base.shenGong
    || base.bodyPalaceBranch
    || base.shen
    || rawBodyPalace?.branch
    || rawBodyPalace?.earthlyBranch
    || ""
  );
  const bodyPalace = palaces.find((p) => p.key === "body") || palaces.find((p) => p.branch && p.branch === bodyBranch) || rawBodyPalace || lifePalace || null;
  if (!bodyBranch) bodyBranch = clean(bodyPalace?.branch || bodyPalace?.earthlyBranch || lifePalace?.branch || "");
  const mingGongValue = clean(
    chartMeta.mingGong
    || chartMeta.lifePalace
    || chartMeta.lifePalaceBranch
    || base.mingGong
    || base.lifePalace
    || base.lifePalaceBranch
    || base.meng
    || lifePalace?.branch
    || lifePalace?.nameKo
    || ""
  );
  const shenGongValue = clean(bodyBranch || bodyPalace?.branch || bodyPalace?.nameKo || mingGongValue);
  const palaceTransformations = palaces.flatMap((palace) => Array.isArray(palace.transformations) ? palace.transformations : []);
  const sihua = Array.isArray(base.sihua)
    ? base.sihua
    : Array.isArray(base.siHua)
      ? base.siHua
      : Array.isArray(base.fourTransformations)
        ? base.fourTransformations
        : Array.isArray(base.transformations)
          ? base.transformations
          : Array.isArray(chartMeta.sihua)
            ? chartMeta.sihua
            : Array.isArray(chartMeta.fourTransformations)
              ? chartMeta.fourTransformations
              : palaceTransformations;
  const luck = base.luck && typeof base.luck === "object" ? base.luck : {};
  const decadeLuck = Array.isArray(luck.decadeLuck) ? luck.decadeLuck : (Array.isArray(base.decadeLuck) ? base.decadeLuck : []);
  const annualLuck = Array.isArray(luck.annual) ? luck.annual : (Array.isArray(base.annualLuck) ? base.annualLuck : []);

  const diagnostics = {
    palaceCount: palaces.length,
    hasAll12Palaces: palaces.length >= 12,
    hasMingGong: Boolean(mingGongValue),
    hasShenGong: Boolean(shenGongValue),
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
      mingGong: mingGongValue,
      shenGong: shenGongValue,
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
        mingGong: mingGongValue,
        shenGong: shenGongValue,
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
    return { ok: true, duplicateRate: 0, sentenceDuplicateRate: 0, criticalPhraseRate: 0, maxCriticalPhraseCount: 0, maxDuplicateRate: 0.18 };
  }
  const signatures = categoryTexts.map((text) => text.slice(0, 240));
  const counter = new Map();
  for (const signature of signatures) {
    counter.set(signature, (counter.get(signature) || 0) + 1);
  }
  const repeated = Array.from(counter.values()).filter((count) => count > 1).reduce((sum, count) => sum + (count - 1), 0);
  const duplicateRate = repeated / signatures.length;
  const sentenceCounter = new Map();
  let sentenceTotal = 0;
  for (const text of categoryTexts) {
    const sentences = text
      .replace(/([.!?])\s+/g, "$1\n")
      .split(/\n+/)
      .map((row) => row.replace(/\s+/g, " ").trim())
      .filter((row) => row.length >= 18 && !/^(핵심 근거|상담 해석|실행 전략|주의 흐름|다음 점검)$/.test(row));
    for (const sentence of sentences) {
      sentenceTotal += 1;
      sentenceCounter.set(sentence, (sentenceCounter.get(sentence) || 0) + 1);
    }
  }
  const repeatedSentences = Array.from(sentenceCounter.values())
    .filter((count) => count > 2)
    .reduce((sum, count) => sum + (count - 2), 0);
  const sentenceDuplicateRate = repeatedSentences / Math.max(sentenceTotal, 1);
  const allText = categoryTexts.join(" ");
  const criticalPhrases = [
    "권위와 신뢰가 자연스럽게 모이는 배치를 품고",
    "현실적 기획력이 안정적으로 현실에서 구현",
    "먼저 멈추고 다시 고르십시오",
    "기준 하나를 오래 지키는 힘으로 쓰십시오",
    "욕망을 기회로 바꾸는 순서가 중요합니다",
    "마음이 움직인 이유와 실제 선택의 결과를 분리",
    "기록에서 반복된 사람, 돈, 몸, 시간의 신호를 가릅니다",
  ];
  const criticalPhraseCounts = criticalPhrases.map((phrase) => ({
    phrase,
    count: (allText.match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length,
  }));
  const maxCriticalPhraseCount = criticalPhraseCounts.reduce((max, item) => Math.max(max, item.count), 0);
  const criticalPhraseRate = maxCriticalPhraseCount / Math.max(categoryTexts.length, 1);
  return {
    ok: duplicateRate <= 0.18 && sentenceDuplicateRate <= 0.18 && maxCriticalPhraseCount <= 12,
    duplicateRate,
    sentenceDuplicateRate,
    criticalPhraseRate,
    maxCriticalPhraseCount,
    criticalPhraseCounts: criticalPhraseCounts.filter((item) => item.count > 0),
    maxDuplicateRate: 0.18,
  };
}

function validateSeed(seed) {
  const errors = [];
  if (!seed?.diagnostics?.hasAll12Palaces) errors.push("palaces.length");
  if (!seed?.diagnostics?.hasMingGong) errors.push("mingGong");
  if (!seed?.diagnostics?.hasShenGong) errors.push("shenGong");
  return { ok: errors.length === 0, errors };
}

function normalizeZiweiAICategory(value) {
  const key = clean(value || "general").toLowerCase().replace(/[^a-z0-9_ -]/g, "").replace(/[\s-]+/g, "_");
  return ZIWEI_AI_CONSULTATION_CATEGORIES[key] ? key : "general";
}

function normalizeZiweiAIQuestion(body = {}) {
  const question = clean(body.question || body.consultationQuestion || body.prompt || body.userQuestion || "");
  if (question.length < 5) {
    return { ok: false, code: "ZIWEI_AI_QUESTION_REQUIRED", message: "자미두수 AI 상담으로 묻고 싶은 질문을 5자 이상 입력해 주세요." };
  }
  if (question.length > 1000) {
    return { ok: false, code: "ZIWEI_AI_QUESTION_TOO_LONG", message: "질문은 1000자 이내로 입력해 주세요." };
  }
  return { ok: true, question };
}

function isZiweiAIConsultationDryRun(env = {}, body = {}) {
  if (isZiweiAIProductionRuntime(env)) return false;
  const values = [
    body?.dryRun,
    body?.dry_run,
    body?.mock,
    env?.ZIWEI_AI_CONSULTATION_DRY_RUN,
    env?.ZIWEI_AI_DRY_RUN,
    env?.LLM_DRY_RUN,
  ];
  return values.some((value) => /^(1|true|yes|on|mock|dry_run)$/i.test(clean(value)));
}

function isZiweiAIProductionRuntime(env = {}) {
  const values = [
    clean(env?.NODE_ENV),
    clean(env?.APP_ENV),
    clean(env?.ENV),
    clean(env?.ENVIRONMENT),
    clean(env?.ENVIRONMENT_NAME),
    clean(env?.STAGE),
    clean(env?.DEPLOY_ENV),
    clean(env?.CF_PAGES),
    clean(env?.CF_PAGES_BRANCH),
  ];
  return values.some((value) => {
    const normalized = value.trim().toLowerCase();
    return normalized === "production" || normalized === "prod" || normalized === "live" || normalized === "release" || normalized === "main";
  });
}

function hasZiweiAIProviderEnv(env = {}) {
  return Boolean(
    clean(env?.GEMINIF_API_KEY)
    || clean(env?.GEMINIF_API_KEY1)
    || clean(env?.GEMINI_API_KEY)
    || clean(env?.GOOGLE_GEMINI_API_KEY)
    || env?.AI?.run,
  );
}

function buildZiweiAIError(code, message, status = 400, extra = {}) {
  return json({
    ok: false,
    serviceKey: ZIWEI_SERVICE_KEY,
    serviceType: ZIWEI_AI_CONSULTATION_SERVICE_TYPE,
    code,
    message,
    ...extra,
  }, { status });
}

function logZiweiAIConsultation(stage, details = {}) {
  const payload = {
    hasEnvAI: Boolean(details.hasEnvAI),
    providerName: clean(details.providerName || ""),
    isMock: Boolean(details.isMock),
    dryRun: Boolean(details.dryRun),
    category: clean(details.category || ""),
    questionLength: Number(details.questionLength || 0),
    hasBirthTime: Boolean(details.hasBirthTime),
    calendarType: clean(details.calendarType || ""),
    chartCalculated: Boolean(details.chartCalculated),
    hasLifePalace: Boolean(details.hasLifePalace),
    hasBodyPalace: Boolean(details.hasBodyPalace),
    hasPalaceData: Boolean(details.hasPalaceData),
    hasTransformations: Boolean(details.hasTransformations),
    hasDecadeLuck: Boolean(details.hasDecadeLuck),
    hasAnnualLuck: Boolean(details.hasAnnualLuck),
    llmLatencyMs: Number(details.llmLatencyMs || 0),
    errorCode: clean(details.errorCode || ""),
    dryRunSource: clean(details.dryRunSource || ""),
    isMockSuppressedInProduction: details.isMockSuppressedInProduction === true,
    authSource: clean(details.authSource || ""),
    tokenVerified: details.tokenVerified === true,
  };
  try {
    console.info(`${ZIWEI_AI_CONSULTATION_MARKER} ${stage}`, payload);
  } catch (_) {
    console.info(`${ZIWEI_AI_CONSULTATION_MARKER} ${stage}`);
  }
}

function safeZiweiAIJson(value, maxLength = 16000) {
  let text = "";
  try {
    text = JSON.stringify(value || {}, null, 2);
  } catch (_) {
    text = "{}";
  }
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n...TRUNCATED`;
}

function summarizeZiweiAIStar(star) {
  if (!star) return null;
  if (typeof star === "string") return { name: clean(star) };
  const item = safeObject(star);
  const result = {
    name: clean(item.nameKo || item.name || item.star || item.starName),
    strengthName: clean(item.strengthName || item.strength || item.brightnessKo || item.brightness),
    strengthSymbol: clean(item.strengthSymbol || item.symbol),
    sihua: clean(item.sihua || item.transformation || item.transform || item.type || item.label),
    borrowed: item.borrowed === true,
  };
  return result.name ? result : null;
}

function summarizeZiweiAIStars(value) {
  return safeArray(value).map(summarizeZiweiAIStar).filter(Boolean).slice(0, 20);
}

function summarizeZiweiAIPalace(palace = {}) {
  const p = safeObject(palace);
  const mainStars = summarizeZiweiAIStars(p.mainStars || p.majorStars || p.stars);
  const supportingStars = summarizeZiweiAIStars(p.auxStars || p.supportingStars || p.auxiliaryStars || p.minorStars || p.subStars);
  const challengingStars = summarizeZiweiAIStars(p.maleficStars || p.challengingStars || p.badStars);
  return {
    key: clean(p.key || p.id || p.palaceKey),
    palaceName: clean(p.nameKo || p.name || p.palace || p.palaceName),
    branch: clean(p.branch || p.earthlyBranch || p.zhi),
    mainStars,
    supportingStars,
    challengingStars,
    transformations: safeArray(p.transformations || p.sihua || p.fourTransformations).map((item) => safeObject(item)).slice(0, 12),
    decadeLuck: p.decadeLuck || null,
    annualLuck: p.annualLuck || null,
    isEmpty: mainStars.length === 0 && supportingStars.length === 0 && challengingStars.length === 0,
  };
}

function buildZiweiAITopicPalaceKeys(category) {
  const map = {
    career: ["career", "ming", "travel", "wealth"],
    business: ["career", "wealth", "travel", "property"],
    money: ["wealth", "career", "property", "fortune"],
    love: ["spouse", "ming", "fortune", "children"],
    health: ["health", "fortune", "ming"],
    relationship: ["friends", "siblings", "travel"],
    family: ["parents", "siblings", "property"],
    yearly: ["ming", "fortune", "career", "travel"],
    luck: ["ming", "fortune", "career", "travel"],
    turning_point: ["ming", "body", "career", "travel"],
    choice: ["ming", "body", "career", "fortune"],
    palace_deep: ["ming", "career", "wealth", "spouse", "fortune"],
    core: ["ming", "body", "fortune", "career"],
  };
  return map[category] || ["ming", "body", "career", "wealth", "spouse", "fortune"];
}

function findZiweiAIPalaceByKey(palaces = [], key = "", chart = {}) {
  if (key === "body") {
    const bodyBranch = clean(chart.shenGong || chart.bodyPalace?.branch || "");
    return palaces.find((p) => clean(p.key) === "body")
      || palaces.find((p) => bodyBranch && clean(p.branch) === bodyBranch)
      || safeObject(chart.bodyPalace);
  }
  const expectedName = PALACE_LABELS[key];
  return palaces.find((p) => clean(p.key) === key)
    || palaces.find((p) => expectedName && clean(p.nameKo || p.name) === expectedName)
    || null;
}

function buildZiweiAIChartSummary(seed = {}, birthInput = {}, category = "general") {
  const chart = safeObject(seed.chart);
  const palaces = safeArray(chart.palaces);
  const lifePalace = safeObject(chart.lifePalace || findZiweiAIPalaceByKey(palaces, "ming", chart));
  const bodyPalace = safeObject(chart.bodyPalace || findZiweiAIPalaceByKey(palaces, "body", chart));
  const topicPalaces = buildZiweiAITopicPalaceKeys(category)
    .map((key) => findZiweiAIPalaceByKey(palaces, key, chart))
    .filter(Boolean)
    .map(summarizeZiweiAIPalace)
    .filter((item, index, rows) => item.palaceName && rows.findIndex((row) => row.palaceName === item.palaceName) === index);
  return {
    hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
    calendarType: clean(birthInput.calendarType || seed.birthProfile?.calendarType),
    lifePalace: clean(lifePalace.nameKo || lifePalace.name || chart.mingGong),
    lifePalaceBranch: clean(lifePalace.branch || lifePalace.earthlyBranch || chart.mingGong),
    bodyPalace: clean(bodyPalace.nameKo || bodyPalace.name || chart.shenGong),
    bodyPalaceBranch: clean(bodyPalace.branch || bodyPalace.earthlyBranch || chart.shenGong),
    fiveElementClass: clean(chart.fiveElementBureau),
    yearStemBranch: clean(chart.yearStemBranch),
    palaceCount: palaces.length,
    hasPalaceData: palaces.length >= 12,
    hasTransformations: safeArray(chart.transformations).length > 0,
    hasDecadeLuck: safeArray(chart.decadeLuck).length > 0,
    hasAnnualLuck: safeArray(chart.annualLuck).length > 0,
    topicPalaces,
    palaces: palaces.map(summarizeZiweiAIPalace).filter((item) => item.palaceName).slice(0, 12),
    transformations: safeArray(chart.transformations).slice(0, 24),
    decadeLuck: safeArray(chart.decadeLuck).slice(0, 12),
    annualLuck: safeArray(chart.annualLuck).slice(0, 12),
  };
}

function buildZiweiAIConsultationSystemPrompt() {
  return [
    "너는 자미두수 명반 해석을 깊이 이해한 상담가다.",
    "사용자의 명궁, 신궁, 12궁, 주성, 보성, 살성, 사화, 대한, 유년 데이터를 바탕으로 답한다.",
    "명반 데이터는 반드시 제공된 계산 결과만 사용하고 임의로 지어내지 않는다.",
    "출생시간이 부족하거나 불확실하면 명반 정확도 제한을 명확히 설명한다.",
    "사용자의 질문에 직접 답하되, 공포를 조장하거나 운명론적으로 단정하지 않는다.",
    "결과는 한국어로 작성한다.",
    "자미두수 용어는 사용하되 일반 사용자도 이해할 수 있게 풀어쓴다.",
    "사용자가 실제로 선택하고 행동할 수 있는 전략을 제안한다.",
  ].join("\n");
}

function buildZiweiAIConsultationPrompt({ birthInput, category, categoryLabel, question, seed, chartSummary }) {
  const profile = safeObject(seed.birthProfile);
  return [
    "아래 자미두수 명반 계산 결과만 근거로 AI 상담 결과를 작성하라.",
    "명궁, 신궁, 12궁, 주성, 보성, 살성, 사화, 대한, 유년은 제공된 데이터 밖에서 추정하거나 창작하지 말라.",
    "없는 데이터는 없다고 말하고, 구체 월/날짜를 지어내지 말라.",
    "화기는 불행 확정이 아니라 관리해야 할 핵심 과제로 설명하라.",
    "건강, 법률, 재정 문제를 자미두수만으로 확정 진단하지 말라.",
    "",
    "[사용자 정보]",
    `이름 또는 닉네임: ${clean(birthInput.name || "사용자")}`,
    `성별: ${clean(birthInput.gender || profile.gender || "unknown")}`,
    `생년월일: ${clean(birthInput.birthDate || profile.birthDate || "")}`,
    `출생시간: ${chartSummary.hasBirthTime ? clean(birthInput.birthTime || profile.birthTime || "") : "출생시간 없음 또는 불확실"}`,
    `달력: ${clean(birthInput.calendarType || profile.calendarType || "unknown")}`,
    `상담 주제: ${categoryLabel} (${category})`,
    `질문: ${question}`,
    "",
    "[검증된 명반 요약]",
    safeZiweiAIJson(chartSummary, 24000),
    "",
    "[브라우저 자미두수 엔진 원본 요약]",
    safeZiweiAIJson(seed.localZiweiChartJson || {}, 22000),
    "",
    "아래 JSON 구조로만 응답하라. JSON 외 설명 문장을 붙이지 말라.",
    "{",
    '  "summary": "상담 요약",',
    '  "chartCore": { "lifePalace": "명궁", "bodyPalace": "신궁", "fiveElementClass": "오행국", "coreInterpretation": "명반 핵심" },',
    '  "topicPalaces": [{ "palaceName": "궁 이름", "reason": "이 궁을 보는 이유", "interpretation": "궁별 해석" }],',
    '  "starPatterns": { "majorStars": ["주성"], "supportingStars": ["보성/길성"], "challengingStars": ["살성/흉성"], "interpretation": "별 배치 해석" },',
    '  "transformations": { "lu": "화록", "quan": "화권", "ke": "화과", "ji": "화기", "interpretation": "사화 작용" },',
    '  "luckFlow": { "decadeLuck": "현재 대한", "annualLuck": "현재 유년", "interpretation": "대한과 유년 흐름" },',
    '  "timing": { "opportunities": ["기회 흐름"], "cautions": ["주의 흐름"], "note": "시기 조언 제한" },',
    '  "actionGuide": ["현실적인 행동 전략"],',
    '  "closingMessage": "명반의 별이 건네는 한 문장",',
    '  "followUpQuestions": ["후속 질문 추천"],',
    '  "rawText": ""',
    "}",
  ].join("\n");
}

function extractZiweiAIJsonText(value = "") {
  const text = clean(value);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function toZiweiAIStringList(value, max = 6) {
  if (Array.isArray(value)) return value.map((item) => clean(typeof item === "string" ? item : JSON.stringify(item))).filter(Boolean).slice(0, max);
  const text = clean(value);
  return text ? [text] : [];
}

function extractZiweiAISection(rawText = "", title = "") {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:\\d+\\.?\\s*)?${escaped}\\s*(?:[—:-]|\\n)([\\s\\S]*?)(?=\\n\\s*(?:\\d+\\.?\\s*)?[가-힣\\s]+\\s*(?:[—:-]|\\n)|$)`, "i");
  return clean(rawText.match(pattern)?.[1] || "");
}

function normalizeZiweiAIConsultationResult(rawText = "", chartSummary = {}) {
  const resultText = clean(rawText);
  let parsed = {};
  try {
    parsed = safeObject(JSON.parse(extractZiweiAIJsonText(resultText)));
  } catch (_) {
    parsed = {};
  }
  const chartCore = safeObject(parsed.chartCore);
  const starPatterns = safeObject(parsed.starPatterns);
  const transformations = safeObject(parsed.transformations);
  const luckFlow = safeObject(parsed.luckFlow);
  const timing = safeObject(parsed.timing);
  const fallbackSummary = extractZiweiAISection(resultText, "상담 요약") || resultText.slice(0, 420);
  const fallbackCore = extractZiweiAISection(resultText, "명반 핵심");
  const fallbackTopic = extractZiweiAISection(resultText, "질문과 연결된 궁");
  const fallbackStars = extractZiweiAISection(resultText, "별의 배치");
  const fallbackSihua = extractZiweiAISection(resultText, "사화의 작용");
  const fallbackLuck = extractZiweiAISection(resultText, "대한과 유년 흐름");
  const fallbackAction = extractZiweiAISection(resultText, "현실적인 행동 전략");
  const fallbackClosing = extractZiweiAISection(resultText, "마지막 조언");
  return {
    summary: clean(parsed.summary || fallbackSummary),
    chartCore: {
      lifePalace: clean(chartCore.lifePalace || chartSummary.lifePalace || ""),
      bodyPalace: clean(chartCore.bodyPalace || chartSummary.bodyPalace || ""),
      fiveElementClass: clean(chartCore.fiveElementClass || chartSummary.fiveElementClass || ""),
      coreInterpretation: clean(chartCore.coreInterpretation || fallbackCore),
    },
    topicPalaces: safeArray(parsed.topicPalaces).length
      ? safeArray(parsed.topicPalaces).map((item) => ({
        palaceName: clean(item?.palaceName || item?.name),
        reason: clean(item?.reason),
        interpretation: clean(item?.interpretation || item?.text),
      })).filter((item) => item.palaceName || item.interpretation).slice(0, 8)
      : safeArray(chartSummary.topicPalaces).slice(0, 4).map((item) => ({
        palaceName: clean(item.palaceName),
        reason: "선택한 상담 주제와 연결되는 궁입니다.",
        interpretation: fallbackTopic || "제공된 명반 데이터 범위에서 이 궁의 별 배치를 중심으로 상담을 이어갑니다.",
      })),
    starPatterns: {
      majorStars: toZiweiAIStringList(starPatterns.majorStars, 12),
      supportingStars: toZiweiAIStringList(starPatterns.supportingStars, 12),
      challengingStars: toZiweiAIStringList(starPatterns.challengingStars, 12),
      interpretation: clean(starPatterns.interpretation || fallbackStars),
    },
    transformations: {
      lu: clean(transformations.lu),
      quan: clean(transformations.quan),
      ke: clean(transformations.ke),
      ji: clean(transformations.ji),
      interpretation: clean(transformations.interpretation || fallbackSihua),
    },
    luckFlow: {
      decadeLuck: clean(luckFlow.decadeLuck),
      annualLuck: clean(luckFlow.annualLuck),
      interpretation: clean(luckFlow.interpretation || fallbackLuck),
    },
    timing: {
      opportunities: toZiweiAIStringList(timing.opportunities, 6),
      cautions: toZiweiAIStringList(timing.cautions, 6),
      note: clean(timing.note || extractZiweiAISection(resultText, "기회와 주의할 시기")),
    },
    actionGuide: toZiweiAIStringList(parsed.actionGuide || fallbackAction, 8),
    closingMessage: clean(parsed.closingMessage || fallbackClosing),
    followUpQuestions: toZiweiAIStringList(parsed.followUpQuestions, 6),
    rawText: resultText,
  };
}

async function handleZiweiAIConsultation(request, env) {
  const startedAt = Date.now();
  const hasEnvAI = hasZiweiAIProviderEnv(env);
  let body = {};
  let category = "general";
  let question = "";
  let chartSummary = {};
  let serverStage = "request";
  try {
    serverStage = "parse_request";
    body = await readJson(request);
    category = normalizeZiweiAICategory(body?.category);
    const questionResult = normalizeZiweiAIQuestion(body);
    const isProduction = isZiweiAIProductionRuntime(env);
    const dryRunSource = isProduction ? "production-forced-false" : "request";
    question = questionResult.question || "";
    const dryRun = isProduction ? false : isZiweiAIConsultationDryRun(env, body);
    logZiweiAIConsultation("request received", {
      hasEnvAI,
      providerName: hasEnvAI ? "gemini-primary-workers-ai-fallback" : "",
      dryRun,
      dryRunSource,
      category,
      questionLength: question.length,
    });
    if (dryRun) {
      return buildZiweiAIError("DRY_RUN_BLOCKED", "자미두수 AI 상담은 mock 또는 dry run 성공 처리로 생성할 수 없습니다.", 409, {
        retryable: false,
        dryRun: true,
        isMock: false,
        dryRunSource,
      });
    }
    if (!questionResult.ok) {
      return buildZiweiAIError(questionResult.code, questionResult.message, 422, { retryable: false });
    }
    serverStage = "auth";
    const authCheck = await resolveZiweiAIConsultationAuth(request, env, body);
    if (!authCheck.ok) {
      return buildZiweiAIError(authCheck.code, authCheck.message, authCheck.status, {
        retryable: false,
        authSource: authCheck.authSource || "",
        tokenVerified: false,
      });
    }
    const auth = authCheck.auth;
    serverStage = "normalize_birth";
    const normalized = normalizeInput(body);
    if (!normalized.ok) {
      const message = normalized.code === "BIRTH_TIME_REQUIRED"
        ? "자미두수 AI 상담은 명궁과 12궁 계산을 위해 정확한 출생시간이 필요합니다. 출생시간을 입력한 뒤 다시 시도해 주세요."
        : normalized.message;
      return buildZiweiAIError(normalized.code || "INVALID_INPUT", message, 422, { retryable: false });
    }
    logZiweiAIConsultation("birth profile normalized", {
      hasEnvAI,
      providerName: "gemini-primary-workers-ai-fallback",
      category,
      questionLength: question.length,
      hasBirthTime: Number.isFinite(Number(normalized.birthInput.birthHour)),
      calendarType: normalized.birthInput.calendarType,
    });
    serverStage = "payment";
    const premiumAccessToken = getZiweiAccessToken(request, body);
    const featureKey = normalizeFeatureKey(body?.featureKey);
    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "ziweiPremium", {
      ...body,
      featureKey,
      reportType: "ziweiPremium",
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: ZIWEI_AI_CONSULTATION_ROUTE,
    });
    if (!access?.ok) {
      return buildZiweiAIError(clean(access?.code || "PAYMENT_REQUIRED"), clean(access?.message || "자미두수 AI 상담 결제 또는 이용권 확인이 필요합니다."), Number(access?.status || 402), {
        retryable: false,
        billing: {
          reportType: "ziweiPremium",
          featureKey,
          accessVerified: false,
          reason: clean(access?.reason || ""),
          missing: safeArray(access?.missing),
        },
      });
    }
    logZiweiAIConsultation("payment verified", {
      hasEnvAI,
      providerName: "gemini-primary-workers-ai-fallback",
      category,
      questionLength: question.length,
      hasBirthTime: Number.isFinite(Number(normalized.birthInput.birthHour)),
      calendarType: normalized.birthInput.calendarType,
      authSource: authCheck.authSource,
      tokenVerified: authCheck.tokenVerified === true,
    });
    serverStage = "chart_input";
    const base = getZiweiBase(body);
    if (!base) {
      return buildZiweiAIError("MISSING_ZIWEI_ENGINE_RESULT", "자미두수 명반 계산 결과가 전달되지 않았습니다. 입력값을 확인한 뒤 다시 시도해 주세요.", 422, { retryable: false });
    }
    serverStage = "chart_seed";
    const seed = buildZiweiPdfSeed(normalized.profile, base);
    const seedValidation = validateSeed(seed);
    if (!seedValidation.ok) {
      return buildZiweiAIError("INVALID_ZIWEI_CHART", "자미두수 명반의 명궁, 신궁, 12궁 데이터가 충분하지 않습니다. 출생 정보를 확인한 뒤 다시 시도해 주세요.", 422, {
        retryable: false,
        details: seedValidation.errors,
      });
    }
    serverStage = "chart_summary";
    chartSummary = buildZiweiAIChartSummary(seed, normalized.birthInput, category);
    const chartLog = {
      hasEnvAI,
      providerName: "gemini-primary-workers-ai-fallback",
      category,
      questionLength: question.length,
      hasBirthTime: chartSummary.hasBirthTime,
      calendarType: chartSummary.calendarType,
      chartCalculated: true,
      hasLifePalace: Boolean(chartSummary.lifePalace || chartSummary.lifePalaceBranch),
      hasBodyPalace: Boolean(chartSummary.bodyPalace || chartSummary.bodyPalaceBranch),
      hasPalaceData: chartSummary.hasPalaceData,
      hasTransformations: chartSummary.hasTransformations,
      hasDecadeLuck: chartSummary.hasDecadeLuck,
      hasAnnualLuck: chartSummary.hasAnnualLuck,
    };
    logZiweiAIConsultation("chart calculated", chartLog);
    logZiweiAIConsultation("palaces extracted", chartLog);
    logZiweiAIConsultation("transformations extracted", chartLog);
    logZiweiAIConsultation("luck flow calculated", chartLog);
    const categoryLabel = ZIWEI_AI_CONSULTATION_CATEGORIES[category] || ZIWEI_AI_CONSULTATION_CATEGORIES.general;
    serverStage = "prompt";
    const prompt = buildZiweiAIConsultationPrompt({
      birthInput: normalized.birthInput,
      category,
      categoryLabel,
      question,
      seed,
      chartSummary,
    });
    logZiweiAIConsultation("prompt built", chartLog);
    if (!hasEnvAI) {
      logZiweiAIConsultation("LLM provider error", {
        ...chartLog,
        errorCode: "LLM_PROVIDER_MISSING",
        dryRunSource,
        isMockSuppressedInProduction: false,
      });
      return buildZiweiAIError("LLM_PROVIDER_MISSING", "자미두수 AI 상담을 생성할 LLM provider 설정이 없습니다.", 503, {
        retryable: true,
        paymentRetainedForRetry: true,
        isMock: false,
        dryRun: false,
        dryRunSource,
        isMockSuppressedInProduction: false,
      });
    }
    const llmStartedAt = Date.now();
    serverStage = "llm";
    logZiweiAIConsultation("LLM provider start", chartLog);
    const ai = await callGeminiText(env, prompt, {
      systemPrompt: buildZiweiAIConsultationSystemPrompt(),
      taskType: "fortune",
      temperature: 0.68,
      maxOutputTokens: 4096,
      timeoutMs: Number(env?.ZIWEI_AI_CONSULTATION_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 55000),
    });
    const llmLatencyMs = Date.now() - llmStartedAt;
    const provider = clean(ai?.provider || "gemini-primary-workers-ai-fallback");
    const model = clean(ai?.model || "");
    const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
    const isMockSuppressedInProduction = isProduction && isMock;
    const effectiveIsMock = isProduction ? false : isMock;
    const aiText = clean(ai?.text || "");
    if (!ai?.ok || effectiveIsMock || aiText.length < 240) {
      const errorCode = effectiveIsMock ? "MOCK_PROVIDER_BLOCKED" : clean(ai?.error || "LLM_GENERATION_FAILED");
      logZiweiAIConsultation("LLM provider error", {
        ...chartLog,
        providerName: provider,
        isMock,
        isMockSuppressedInProduction,
        dryRunSource,
        llmLatencyMs,
        errorCode,
      });
      return buildZiweiAIError(errorCode, clean(ai?.message || "자미두수 AI 상담 생성이 일시적으로 실패했습니다. 결제 확인 상태는 유지되니 잠시 뒤 다시 시도해 주세요."), 503, {
        retryable: true,
        paymentRetainedForRetry: true,
        provider,
        model,
        isMock,
        isMockSuppressedInProduction,
        dryRunSource,
        dryRun: false,
      });
    }
    serverStage = "normalize_result";
    const result = normalizeZiweiAIConsultationResult(aiText, chartSummary);
    logZiweiAIConsultation("LLM provider success", { ...chartLog, providerName: provider, isMock: false, llmLatencyMs });
    const consultationId = clean(body?.consultationId || body?.reportId || body?.reportSessionId || `ziwei-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    const responsePayload = {
      ok: true,
      serviceKey: ZIWEI_SERVICE_KEY,
      serviceType: ZIWEI_AI_CONSULTATION_SERVICE_TYPE,
      consultationId,
      featureKey,
      provider,
      model,
      isMock: false,
      dryRun: false,
      dryRunSource,
      isMockSuppressedInProduction: false,
      category,
      categoryLabel,
      chartSummary,
      result,
      billing: {
        reportType: "ziweiPremium",
        featureKey,
        accessVerified: true,
        accessType: clean(access.accessType || ""),
        chargedCoins: Number(access.chargedCoins || 590),
        matchedTransactionId: clean(access.matchedTransactionId || ""),
        paymentRetainedForRetry: false,
      },
      elapsedMs: Date.now() - startedAt,
    };
    logZiweiAIConsultation("response returned", { ...chartLog, providerName: provider, dryRunSource, llmLatencyMs });
    serverStage = "response";
    return json(responsePayload, { status: 200 });
  } catch (error) {
    const status = Number(error?.status || 503);
    const responseStatus = status >= 400 && status < 600 ? status : 503;
    const errorCode = clean(error?.code || "ZIWEI_AI_CONSULTATION_FAILED");
    const safeErrorMessage = clean(error?.message || "자미두수 AI 상담 생성이 일시적으로 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
    logZiweiAIConsultation("LLM provider error", {
      hasEnvAI,
      providerName: "gemini-primary-workers-ai-fallback",
      category,
      questionLength: question.length,
      hasBirthTime: Boolean(chartSummary.hasBirthTime),
      calendarType: chartSummary.calendarType,
      chartCalculated: Boolean(chartSummary.hasPalaceData),
      hasLifePalace: Boolean(chartSummary.lifePalace),
      hasBodyPalace: Boolean(chartSummary.bodyPalace),
      hasPalaceData: Boolean(chartSummary.hasPalaceData),
      hasTransformations: Boolean(chartSummary.hasTransformations),
      hasDecadeLuck: Boolean(chartSummary.hasDecadeLuck),
      hasAnnualLuck: Boolean(chartSummary.hasAnnualLuck),
      errorCode,
      dryRunSource,
      isMockSuppressedInProduction: false,
    });
    console.error(`${ZIWEI_AI_CONSULTATION_MARKER} unhandled error`, {
      stage: serverStage,
      code: errorCode,
      name: clean(error?.name || ""),
      message: safeErrorMessage,
      status: responseStatus,
    });
    return buildZiweiAIError(errorCode, safeErrorMessage, responseStatus, {
      stage: serverStage,
      retryable: responseStatus >= 500,
      paymentRetainedForRetry: responseStatus >= 500,
      isMock: false,
      dryRun: false,
      dryRunSource,
      isMockSuppressedInProduction: false,
      debugSafe: {
        stage: serverStage,
        errorCode,
        hasEnvAI,
        category,
        questionLength: question.length,
        hasBirthTime: Boolean(chartSummary.hasBirthTime),
        hasPalaceData: Boolean(chartSummary.hasPalaceData),
      },
    });
  }
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
      const expectedCategoryCount = Math.max(1, safeArray(CHAPTER_BLUEPRINTS[index]?.categories).length || 6);
      if (categories.length !== expectedCategoryCount) errors.push(`chapter_${index + 1}_category_range`);
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

function collectZiweiConsultationEvidence(seed = {}) {
  const tokens = new Set();
  const add = (value) => {
    const text = clean(value).replace(/\s+/g, "");
    if (text) tokens.add(text);
  };
  add(seed?.chart?.mingGong);
  add(seed?.chart?.shenGong);
  add(seed?.chart?.fiveElementBureau);
  add(seed?.chart?.yearStemBranch);
  for (const palace of safeArray(seed?.chart?.palaces)) {
    add(palace?.nameKo || palace?.name);
    add(palace?.branch);
    for (const star of safeArray(palace?.mainStars)) add(star?.name || star?.nameKo);
    for (const star of safeArray(palace?.auxStars)) add(star?.name || star?.nameKo);
    for (const star of safeArray(palace?.maleficStars)) add(star?.name || star?.nameKo);
  }
  for (const item of safeArray(seed?.chart?.transformations)) {
    add(item?.star);
    add(item?.type || item?.label);
  }
  return Array.from(tokens).slice(0, 180);
}

function scoreZiweiConsultationQuality({ birthInput, seed, chapters = [], duplicateRate = null } = {}) {
  const safeChapters = safeArray(chapters);
  const rawCategoryTexts = safeChapters.flatMap((chapter) => safeArray(chapter?.categories).map((category) => String(category?.finalText || category?.text || "")));
  const categoryTexts = rawCategoryTexts.map((text) => sanitizeCounselingText(text));
  const chapterText = safeChapters.map((chapter) => [
    chapter?.title,
    chapter?.summary,
    ...safeArray(chapter?.categories).flatMap((category) => [category?.title, category?.finalText || category?.text]),
    chapter?.practicalAdvice,
    chapter?.cautionFlow,
    chapter?.transitionLine,
  ].map((value) => sanitizeCounselingText(value || "")).join("\n")).join("\n\n");
  const compactText = chapterText.replace(/\s+/g, "");
  const evidenceTokens = collectZiweiConsultationEvidence(seed);
  const evidenceHits = evidenceTokens.filter((token) => compactText.includes(token));
  const chapterEvidenceOk = safeChapters.filter((chapter) => {
    const text = [
      chapter?.summary,
      ...safeArray(chapter?.categories).map((category) => category?.finalText || category?.text),
      chapter?.practicalAdvice,
      chapter?.cautionFlow,
    ].map((value) => sanitizeCounselingText(value || "")).join("\n").replace(/\s+/g, "");
    return evidenceTokens.filter((token) => text.includes(token)).length >= 2;
  }).length;
  const actionTokens = ["정리", "선택", "확인", "조정", "관리", "기록", "준비", "나누", "집중", "피하", "점검", "우선", "계획", "실행", "상담", "멈추"];
  const actionHits = actionTokens.filter((token) => chapterText.includes(token)).length;
  const adviceCount = safeChapters.filter((chapter) => clean(chapter?.practicalAdvice).length >= 40).length;
  const cautionCount = safeChapters.filter((chapter) => clean(chapter?.cautionFlow).length >= 30).length;
  const summaryCount = safeChapters.filter((chapter) => clean(chapter?.summary).length >= 20).length;
  const requiredDetailLabels = ["핵심 근거", "상담 해석", "실행 전략", "주의 흐름", "다음 점검"];
  const detailedCategoryCount = rawCategoryTexts.filter((text) => requiredDetailLabels.every((label) => text.includes(label))).length;
  const averageCategoryLength = categoryTexts.length
    ? Math.round(categoryTexts.reduce((sum, text) => sum + text.length, 0) / categoryTexts.length)
    : 0;
  const repetitionRate = Number.isFinite(Number(duplicateRate)) ? Number(duplicateRate) : computeDuplicateRate(safeChapters);
  const repetition = validateNoZiweiPdfRepetition(safeChapters);
  const effectiveRepetitionRate = Math.max(
    repetitionRate,
    Number(repetition.duplicateRate || 0),
    Number(repetition.sentenceDuplicateRate || 0),
    Number(repetition.criticalPhraseRate || 0)
  );
  const structureScore = Math.min(100, Math.round(((safeChapters.length / CHAPTER_BLUEPRINTS.length) * 45) + ((summaryCount / CHAPTER_BLUEPRINTS.length) * 15) + ((adviceCount / CHAPTER_BLUEPRINTS.length) * 20) + ((cautionCount / CHAPTER_BLUEPRINTS.length) * 20)));
  const specificityScore = Math.min(100, Math.round((averageCategoryLength / Math.max(SECTION_MIN_CHARS, 1)) * 100));
  const evidenceScore = Math.min(100, Math.round(((evidenceHits.length / Math.max(evidenceTokens.length, 1)) * 55) + ((chapterEvidenceOk / Math.max(safeChapters.length, 1)) * 45)));
  const actionabilityScore = Math.min(100, Math.round(((actionHits / actionTokens.length) * 45) + ((adviceCount / CHAPTER_BLUEPRINTS.length) * 55)));
  const safetyScore = Math.max(0, Math.round(100 - (effectiveRepetitionRate * 260)));
  const detailScore = categoryTexts.length ? Math.round((detailedCategoryCount / categoryTexts.length) * 100) : 0;
  const score = Math.round((structureScore * 0.16) + (specificityScore * 0.18) + (evidenceScore * 0.2) + (actionabilityScore * 0.18) + (safetyScore * 0.13) + (detailScore * 0.15));
  const issues = [];
  if (safeChapters.length !== CHAPTER_BLUEPRINTS.length) issues.push("chapter_count_incomplete");
  if (structureScore < 92) issues.push("structure_weak");
  if (specificityScore < 80) issues.push("section_depth_weak");
  if (evidenceScore < 45) issues.push("evidence_coverage_weak");
  if (actionabilityScore < 65) issues.push("actionability_weak");
  if (safetyScore < 65 || !repetition.ok) issues.push("repetition_risk");
  if (detailScore < 90) issues.push("category_detail_blocks_weak");
  if (!clean(birthInput?.birthDate)) issues.push("birth_context_missing");
  return {
    ok: score >= 78 && !issues.includes("chapter_count_incomplete") && !issues.includes("section_depth_weak") && !issues.includes("actionability_weak") && !issues.includes("category_detail_blocks_weak") && !issues.includes("repetition_risk"),
    score,
    status: score >= 88 ? "excellent" : score >= 78 ? "passed" : "needs_review",
    structureScore,
    specificityScore,
    evidenceScore,
    actionabilityScore,
    safetyScore,
    detailScore,
    evidenceHitCount: evidenceHits.length,
    evidenceTokenCount: evidenceTokens.length,
    chapterEvidenceOk,
    detailedCategoryCount,
    categoryCount: categoryTexts.length,
    chapterCount: safeChapters.length,
    expectedChapterCount: CHAPTER_BLUEPRINTS.length,
    averageCategoryLength,
    adviceCount,
    cautionCount,
    duplicateRate: effectiveRepetitionRate,
    rawDuplicateRate: repetitionRate,
    sentenceDuplicateRate: repetition.sentenceDuplicateRate,
    maxCriticalPhraseCount: repetition.maxCriticalPhraseCount,
    issues,
  };
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
    advice,
    caution,
    transition,
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
  const decade = current ? `${clean(current.label || current.range || "대한")}` : "현재 대한 세부 범위는 제한적으로 확인됩니다";
  const sihua = seed.chart.transformations.length
    ? seed.chart.transformations.map((item) => `${clean(item.star)} ${clean(item.type)}`).filter(Boolean).join(", ")
    : "사화 자료는 기본 명반 범위에서만 확인됩니다";
  return `대한 기준은 ${decade}이며, 가까운 흐름은 ${sihua}를 중심으로 현실 선택의 우선순위를 정리합니다.`;
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

function safeZiweiDisplayText(value, fallback = "") {
  const text = clean(value).replace(/\s+/g, " ").trim();
  if (!text || /^\?+$/.test(text) || /\?{2,}/.test(text) || containsForbiddenNarrative(text)) return fallback;
  return text;
}

function uniqueZiweiTexts(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = safeZiweiDisplayText(value, "");
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function getZiweiCategoryContextConfig(blueprint = {}, categoryIndex = 0) {
  const chapterConfig = ZIWEI_CATEGORY_CONTEXTS[clean(blueprint?.id)] || [];
  const hit = chapterConfig[categoryIndex];
  if (hit) return hit;
  if (blueprint?.palaceKey && blueprint.palaceKey !== "timing") {
    return { palaceKeys: [blueprint.palaceKey], focus: safeArray(blueprint.categories)[categoryIndex] || blueprint.title || "핵심 주제" };
  }
  return { palaceKeys: ["ming", "career", "fortune"], focus: safeArray(blueprint.categories)[categoryIndex] || blueprint.title || "운의 흐름", timingMode: "final" };
}

function getZiweiCategoryCounselingGuide(categoryTitle = "", context = {}) {
  const title = clean(categoryTitle);
  const guide = ZIWEI_CATEGORY_COUNSELING_GUIDES[title] || {};
  const intent = clean(guide.intent || context?.focus || title || "핵심 주제");
  return {
    intent,
    reading: sanitizeCounselingText(guide.reading || `${intent}은 ${context?.palaceNamesText || "해당 궁"}의 별 배치를 통해 지금 가장 먼저 정리해야 할 선택 기준을 보여 줍니다.`),
    practice: sanitizeCounselingText(guide.practice || `${intent}에서는 바로 줄일 일 하나와 유지할 기준 하나를 정해 현실의 변화를 작게 시작하십시오.`),
    caution: sanitizeCounselingText(guide.caution || `${intent}의 주의점은 좋은 신호를 과신하거나 약한 신호를 두려워해 선택의 순서를 잃는 데 있습니다.`),
    review: sanitizeCounselingText(guide.review || `${intent}은 일정 시간이 지난 뒤 결과, 피로도, 관계 반응을 다시 확인할 때 실제 상담 지도로 살아납니다.`),
  };
}

function getZiweiCategoryDomain(categoryTitle = "", intent = "") {
  const text = `${categoryTitle} ${intent}`;
  if (/재백|재물|돈|수입|지출|자산|투자/.test(text)) return "money";
  if (/관록|직업|일|성과|성장|사회|명예|평판|협업|동료/.test(text)) return "career";
  if (/부부|부처|연애|결혼|인연|가족|자녀|관계|사람|네트워크|노복|형제/.test(text)) return "relationship";
  if (/질액|건강|몸|스트레스|회복|쉼|생활 습관|기운|에너지/.test(text)) return "health";
  if (/전택|집|공간|거처|부동산|이동|천이/.test(text)) return "foundation";
  if (/대한|유년|월별|분기|생애|전환점|장기|최종/.test(text)) return "timing";
  return "self";
}

function ziweiParticle(value = "", type = "eunNeun") {
  const text = clean(value);
  if (!text) return "";
  const marked = /[◎O▲△X]$/.test(text) || /[,/]/.test(text);
  if (marked) {
    return {
      eunNeun: "는",
      iga: "가",
      eulReul: "를",
      waGwa: "와",
      ro: "로",
    }[type] || "";
  }
  if (type === "eunNeun") return koreanParticleEunNeun(text);
  if (type === "iga") return koreanParticleIga(text);
  if (type === "eulReul") return koreanParticleEulReul(text);
  if (type === "waGwa") return koreanParticleWaGwa(text);
  if (type === "ro") return koreanParticleRo(text);
  return "";
}

function ziweiWithParticle(value = "", type = "eunNeun") {
  const text = clean(value);
  return text ? `${text}${ziweiParticle(text, type)}` : "";
}

function ziweiNominalizePhrase(value = "") {
  return stripZiweiSentenceEnding(clean(value))
    .replace(/에 유리합니다$/g, "에 유리한 흐름")
    .replace(/필요합니다$/g, "필요한 흐름")
    .replace(/강해집니다$/g, "강해지는 흐름")
    .replace(/커집니다$/g, "커지는 흐름")
    .replace(/살아납니다$/g, "살아나는 흐름")
    .replace(/힘을 냅니다$/g, "힘을 내는 흐름")
    .replace(/드러납니다$/g, "드러나는 흐름")
    .replace(/나타납니다$/g, "나타나는 흐름")
    .replace(/구현됩니다$/g, "구현되는 흐름")
    .replace(/작동합니다$/g, "작동하는 흐름")
    .replace(/이어집니다$/g, "이어지는 흐름")
    .replace(/입니다$/g, "인 흐름")
    .replace(/합니다$/g, "하는 흐름")
    .replace(/습니다$/g, "는 흐름");
}

function ziweiAdverbialPhrase(value = "") {
  const text = clean(value);
  if (!text) return "";
  if (/(으로|로)$/.test(text)) return text;
  return `${text}${koreanParticleRo(text)}`;
}

function buildZiweiStrengthSentence(strength = "", { starName = "주성", starLabel = "", domain = "self", palaceText = "명궁", title = "이 주제", intentText = "이 주제", variant = 0 } = {}) {
  const text = clean(strength);
  const symbol = clean(starLabel).slice(-1);
  const pick = (rows) => rows[Math.abs(Number(variant) || 0) % rows.length];
  if (/권위와 신뢰/.test(text)) {
    const rows = {
      self: [
        `${title}에서는 ${starName}의 중심성이 기준을 세우는 힘으로 드러납니다.`,
        `${palaceText}의 ${starLabel}는 자존감과 책임의 무게를 함께 조율합니다.`,
        `${intentText}에서는 ${starName}의 중심을 앞세우되 사람과 일의 경계를 한 번 더 나누어야 합니다.`,
      ],
      career: [
        `${title}에서는 직책보다 책임 범위를 선명히 할 때 ${starName}의 힘이 살아납니다.`,
        `${palaceText}의 ${starLabel}는 평판을 키우되 검증 가능한 결과를 요구합니다.`,
        `${intentText}에서는 리더십을 과시하기보다 위임과 확인 체계를 세우는 편이 좋습니다.`,
      ],
      money: [
        `${title}에서는 큰돈의 그릇보다 보존 구조와 결정 권한을 먼저 보아야 합니다.`,
        `${palaceText}의 ${starLabel}는 재물 판단에서 체면 지출과 장기 자산을 가르는 별빛입니다.`,
        `${intentText}에서는 수익을 키우기 전에 손실 한도와 관리 원칙을 정해야 합니다.`,
      ],
      relationship: [
        `${title}에서는 존중과 주도권의 온도가 인연의 안정성을 좌우합니다.`,
        `${palaceText}의 ${starLabel}는 상대를 이끄는 힘과 기다리는 힘의 균형을 묻습니다.`,
        `${intentText}에서는 좋은 마음보다 말의 순서와 약속의 무게가 더 중요합니다.`,
      ],
      health: [
        `${title}에서는 버티는 힘이 강한 만큼 긴장 누적을 먼저 관리해야 합니다.`,
        `${palaceText}의 ${starLabel}는 몸이 감당하는 책임과 회복 리듬을 함께 보여 줍니다.`,
        `${intentText}에서는 의지보다 수면, 호흡, 일정의 여백이 운의 그릇을 지킵니다.`,
      ],
      foundation: [
        `${title}에서는 넓힐 기반보다 오래 유지할 공간과 비용을 먼저 따져야 합니다.`,
        `${palaceText}의 ${starLabel}는 이동의 기회와 정착의 책임을 동시에 비춥니다.`,
        `${intentText}에서는 거처, 동선, 관리 부담을 한 묶음으로 보아야 합니다.`,
      ],
      timing: [
        `${title}에서는 기세가 강할수록 확정할 일과 기다릴 일을 분리해야 합니다.`,
        `${palaceText}의 ${starLabel}는 좋은 때가 왔을 때 먼저 열 문과 늦출 문을 가릅니다.`,
        `${intentText}에서는 속도보다 책임을 감당할 준비가 운의 성패를 나눕니다.`,
      ],
    };
    return pick(rows[domain] || rows.self);
  }
  if (/현실적 기획력|전략적 통찰|환경 변화 대응/.test(text)) {
    const rows = {
      self: [
        `${title}에서는 생각의 속도를 일정한 실행 순서로 낮출 때 ${starName}의 장점이 살아납니다.`,
        `${palaceText}의 ${starLabel}는 여러 가능성 중 지금 선택할 한 갈래를 고르게 합니다.`,
        `${intentText}에서는 분석보다 마감선과 검토 주기를 먼저 정해야 합니다.`,
      ],
      career: [
        `${title}에서는 기획력보다 결정권자와 실행자의 역할 구분이 중요합니다.`,
        `${palaceText}의 ${starLabel}는 복잡한 이해관계를 순서표로 바꾸는 힘입니다.`,
        `${intentText}에서는 아이디어를 늘리기보다 끝낼 기준을 먼저 세워야 합니다.`,
      ],
      money: [
        `${title}에서는 정보 우위를 수익으로 바꾸되, 검증 전 확장을 피해야 합니다.`,
        `${palaceText}의 ${starLabel}는 숫자를 읽는 힘과 타이밍을 기다리는 힘을 함께 요구합니다.`,
        `${intentText}에서는 선택지를 줄인 뒤 작게 시험하는 방식이 안전합니다.`,
      ],
      relationship: [
        `${title}에서는 말의 논리보다 상대가 이해한 순서를 다시 확인해야 합니다.`,
        `${palaceText}의 ${starLabel}는 대화의 맥락을 잡지만 감정의 속도도 함께 배려해야 합니다.`,
        `${intentText}에서는 설명보다 확인, 조언보다 경청이 관계를 살립니다.`,
      ],
      health: [
        `${title}에서는 머리가 빠르게 움직일수록 몸의 신호를 늦게 알아차릴 수 있습니다.`,
        `${palaceText}의 ${starLabel}는 긴장 원인을 분석하되 회복 시간을 먼저 확보하라고 말합니다.`,
        `${intentText}에서는 피로를 해석하기 전에 수면과 휴식 루틴을 고정해야 합니다.`,
      ],
      foundation: [
        `${title}에서는 이동과 정착을 동시에 계산하되, 생활 동선부터 단순하게 해야 합니다.`,
        `${palaceText}의 ${starLabel}는 기반을 바꾸는 아이디어와 유지 비용을 함께 보여 줍니다.`,
        `${intentText}에서는 바꿀 공간과 지킬 공간을 분리하는 판단이 필요합니다.`,
      ],
      timing: [
        `${title}에서는 때를 읽는 눈보다 실행 가능한 시점을 고르는 힘이 중요합니다.`,
        `${palaceText}의 ${starLabel}는 흐름을 빠르게 감지하지만 확정은 한 박자 늦추라고 말합니다.`,
        `${intentText}에서는 기회가 보여도 검증 순서를 건너뛰지 않는 편이 좋습니다.`,
      ],
    };
    return pick(rows[domain] || rows.self);
  }
  const natural = stripZiweiSentenceEnding(naturalizeZiweiPredicate(text, "조건에 따라 힘이 달라집니다"));
  const rows = [
    `${title}에서는 ${starName}의 ${symbol || "신호"}가 ${natural} 쪽으로 드러납니다.`,
    `${palaceText}의 ${starLabel || starName}는 ${intentText}에서 ${natural} 흐름을 만듭니다.`,
    `${ziweiWithParticle(intentText, "eulReul")} 판단할 때 이 별은 ${natural} 방향으로 힘을 냅니다.`,
  ];
  return pick(rows);
}

function normalizeZiweiParticleArtifacts(value = "") {
  return clean(value)
    .replace(/(합니다|습니다|납니다|집니다)으로/g, "는 흐름으로")
    .replace(/유리하는 흐름/g, "유리한 흐름")
    .replace(/필요하는 흐름/g, "필요한 흐름")
    .replace(/([가-힣]+궁)가/g, (_match, palace) => `${palace}${koreanParticleIga(palace)}`)
    .replace(/흐름를/g, "흐름을")
    .replace(/축를/g, "축을")
    .replace(/모임로/g, "모임으로")
    .replace(/열림로/g, "열림으로")
    .replace(/나타남로/g, "나타남으로")
    .replace(/만듦와/g, "만듦과")
    .replace(/가이드은/g, "가이드는")
    .replace(/체크리스트은/g, "체크리스트는")
    .replace(/체크리스트을/g, "체크리스트를")
    .replace(/지도을/g, "지도를")
    .replace(/주기을/g, "주기를")
    .replace(/절정기이/g, "절정기가")
    .replace(/([가-힣]+화)이/g, "$1가")
    .replace(/([◎O▲△X])은/g, "$1는");
}

function buildZiweiPalaceSpecificStarText(rule = {}, starLabel = "", domain = "self", context = {}, categoryTitle = "", variant = 0) {
  const starName = clean(starLabel).replace(/[◎O▲△X]+$/g, "");
  const palaceText = clean(context?.palaceNamesText || "명궁");
  const intentText = clean(context?.focus || categoryTitle || "이 주제");
  const title = clean(categoryTitle || intentText || "이 주제");
  const rows = {
    self: [
      `${ziweiWithParticle(starLabel)} ${palaceText}에서 자아의 중심, 첫 판단의 품격, 스스로 세우는 기준을 밝힙니다.`,
      `${starName}의 결은 ${intentText}에서 말보다 태도와 책임감으로 먼저 드러납니다.`,
      `${palaceText}의 ${ziweiWithParticle(starLabel)} 타고난 자존과 선택의 무게를 함께 보여 줍니다.`,
    ],
    career: [
      `${title}에서 ${ziweiWithParticle(starLabel)} 관록의 자리에서는 직책, 책임 범위, 사람 앞에 세울 결과물로 작동합니다.`,
      `${starName}의 사회적 힘은 ${intentText}에서 권한을 넓히기보다 맡을 책임을 정확히 고르는 데 있습니다.`,
      `${palaceText}의 ${ziweiWithParticle(starLabel)} 평판과 성취가 커질수록 위임과 검증을 함께 요구합니다.`,
    ],
    money: [
      `${title}에서 ${ziweiWithParticle(starLabel)} 재백의 흐름에서는 큰돈의 그릇, 보존 자금, 장기 운용의 중심축으로 읽습니다.`,
      `${starName}의 재물 감각은 ${intentText}에서 수입보다 지킬 구조를 먼저 묻습니다.`,
      `${palaceText}의 ${ziweiWithParticle(starLabel)} 돈을 벌 기세와 돈을 오래 남길 절제를 함께 시험합니다.`,
    ],
    relationship: [
      `${title}에서 ${ziweiWithParticle(starLabel)} 관계의 궁에서는 존중받고 싶은 마음, 주도권의 온도, 오래 맞출 수 있는 거리감으로 나타납니다.`,
      `${starName}의 인연 운은 ${intentText}에서 상대를 이끄는 힘과 상대를 기다리는 힘의 균형을 묻습니다.`,
      `${palaceText}의 ${ziweiWithParticle(starLabel)} 좋은 마음만으로는 부족하고 말의 순서와 약속의 무게를 함께 봅니다.`,
    ],
    health: [
      `${title}에서 ${ziweiWithParticle(starLabel)} 질액의 자리에서는 몸이 감당하는 책임, 긴장 누적, 회복 리듬의 중심을 드러냅니다.`,
      `${starName}의 기운은 ${intentText}에서 의지보다 체력 배분과 휴식의 질로 판별됩니다.`,
      `${palaceText}의 ${ziweiWithParticle(starLabel)} 강한 버팀 뒤에 쌓이는 피로와 마음의 압력을 같이 보게 합니다.`,
    ],
    foundation: [
      `${title}에서 ${ziweiWithParticle(starLabel)} 전택과 천이의 흐름에서는 안에서 지킬 기반과 밖으로 넓힐 무대를 동시에 비춥니다.`,
      `${starName}의 힘은 ${intentText}에서 거처, 동선, 자산 기반을 오래 버틸 구조로 바꾸는 데 쓰입니다.`,
      `${palaceText}의 ${ziweiWithParticle(starLabel)} 이동의 기회와 정착의 책임을 함께 세우라고 말합니다.`,
    ],
    timing: [
      `${title}에서 ${ziweiWithParticle(starLabel)} 운한의 자리에서는 때가 왔을 때 무엇을 먼저 열고 무엇을 늦출지 가르는 표지가 됩니다.`,
      `${starName}의 시간성은 ${intentText}에서 지금 확정할 일과 다음 운으로 넘길 일을 분리하게 합니다.`,
      `${palaceText}의 ${ziweiWithParticle(starLabel)} 좋은 운의 속도보다 준비된 선택의 순서를 더 중요하게 봅니다.`,
    ],
  };
  const selected = rows[domain] || rows.self;
  const strength = rule?.strengthMeaning?.[clean(starLabel).slice(-1)] || "";
  const base = selected[Math.abs(Number(variant) || 0) % selected.length];
  if (!strength) return base;
  return `${base} ${buildZiweiStrengthSentence(strength, { starName, starLabel, domain, palaceText, title, intentText, variant })}`;
}

function buildZiweiSihuaPhenomenonText(sihuaText = "", domain = "self", categoryTitle = "", variant = 0) {
  const text = clean(sihuaText);
  const title = clean(categoryTitle || "이 주제");
  const has = (token) => text.includes(token);
  const rows = [];
  if (has("화록")) {
    rows.push({
      money: `화록은 돈이 들어오는 문처럼 보이지만, ${title}에서는 먼저 욕망의 방향과 실제 남는 몫을 갈라야 합니다.`,
      career: `화록은 제안과 기회가 붙는 신호이므로, ${title}에서는 보여 줄 성과와 받을 책임을 함께 정해야 합니다.`,
      relationship: `화록은 마음이 끌리는 문을 열지만, ${title}에서는 호감과 약속의 무게를 분리해 보아야 합니다.`,
      health: `화록은 하고 싶은 일이 늘어나는 신호라서, ${title}에서는 체력보다 욕심이 앞서는 순간을 줄여야 합니다.`,
      foundation: `화록은 공간과 이동의 가능성을 넓히지만, ${title}에서는 넓히기 전에 유지 비용을 먼저 셉니다.`,
      timing: `화록은 운이 들어오는 입구이며, ${title}에서는 열린 문을 모두 잡지 말고 오래 남을 문만 고릅니다.`,
      self: [
        `화록은 마음이 향하는 곳을 밝히며, ${title}에서는 끌림을 바로 실행하지 말고 오래 남을 선택으로 걸러야 합니다.`,
        `화록은 쉽게 좋아지는 문을 열지만, ${title}에서는 원하는 것과 감당할 수 있는 것을 분리해야 합니다.`,
        `화록은 기회가 붙는 신호이므로, ${title}에서는 먼저 받을 복과 책임질 몫을 나누어 보아야 합니다.`,
      ][Math.abs(Number(variant) || 0) % 3],
    });
  }
  if (has("화권")) {
    rows.push({
      money: `화권은 돈을 장악하려는 힘이므로, ${title}에서는 수익보다 통제 가능한 구조를 먼저 세웁니다.`,
      career: `화권은 권한과 압력이 함께 오는 별빛이라, ${title}에서는 직책보다 책임의 한계를 먼저 그어야 합니다.`,
      relationship: `화권은 관계 안의 주도권을 키우므로, ${title}에서는 이기려는 말보다 조율하는 말이 필요합니다.`,
      health: `화권은 버티려는 의지를 키우지만, ${title}에서는 무리한 책임감이 몸을 압박하지 않게 해야 합니다.`,
      foundation: `화권은 공간과 기반을 장악하려는 힘이어서, ${title}에서는 소유와 관리 책임을 따로 계산해야 합니다.`,
      timing: `화권은 운의 압력이 세지는 때이므로, ${title}에서는 밀어붙일 일과 멈출 일을 명확히 나눕니다.`,
      self: `화권은 장악력과 부담을 함께 키우며, ${title}에서는 힘을 쓰기 전에 책임의 크기를 재야 합니다.`,
    });
  }
  if (has("화과")) {
    rows.push({
      money: `화과는 돈의 명분과 기록을 정리하므로, ${title}에서는 숫자와 증빙이 신뢰를 만듭니다.`,
      career: `화과는 평판과 문서의 별빛이라, ${title}에서는 말보다 기록된 성과가 운을 살립니다.`,
      relationship: `화과는 관계를 품위 있게 정리하므로, ${title}에서는 감정보다 말의 형식과 약속의 명료함이 중요합니다.`,
      health: `화과는 생활 기록과 점검의 힘이니, ${title}에서는 몸의 신호를 꾸준히 남겨야 합니다.`,
      foundation: `화과는 공간과 자산의 명분을 정돈하므로, ${title}에서는 계약, 문서, 보관 기준을 살핍니다.`,
      timing: `화과는 운의 결과를 이름과 기록으로 남기는 힘이니, ${title}에서는 성과를 정리해 다음 운의 발판으로 삼습니다.`,
      self: `화과는 흩어진 일을 정리해 평판으로 남기며, ${title}에서는 품위 있는 마무리가 운을 보호합니다.`,
    });
  }
  if (has("화기")) {
    rows.push({
      money: `화기는 새는 돈과 집착의 자리이므로, ${title}에서는 손실 한도와 감정 지출을 먼저 막아야 합니다.`,
      career: `화기는 막힌 책임과 억울한 평가를 드러내니, ${title}에서는 과로와 역할 혼선을 줄이는 일이 급합니다.`,
      relationship: `화기는 서운함과 오해가 뭉치는 자리라, ${title}에서는 침묵보다 짧고 정확한 확인이 필요합니다.`,
      health: `화기는 몸이 보내는 막힘의 신호이므로, ${title}에서는 통증, 수면, 긴장 누적을 가볍게 넘기지 말아야 합니다.`,
      foundation: `화기는 기반의 틈을 드러내므로, ${title}에서는 수리, 정리, 비용 누수를 먼저 살핍니다.`,
      timing: `화기는 운이 막히는 지점을 알려 주며, ${title}에서는 실패가 아니라 보류와 정비의 신호로 봅니다.`,
      self: `화기는 마음이 붙잡힌 곳을 드러내며, ${title}에서는 고집을 줄이고 막힌 선택을 비워야 합니다.`,
    });
  }
  if (!rows.length) return `${title}에서는 사화가 강하게 튀기보다 궁의 기본 결을 따라 천천히 움직입니다.`;
  return rows
    .slice(0, 2)
    .map((row, index) => row[domain] || row.self || Object.values(row)[0])
    .filter(Boolean)
    .join(" ");
}

function buildZiweiPalaceRelationText(context = {}, categoryTitle = "", variant = 0) {
  const names = safeArray(context?.palaceNames).map(clean).filter(Boolean);
  const has = (name) => names.includes(name);
  const title = categoryTitle || context.focus || "이 주제";
  if (has("명궁") && has("신궁")) return `${title}에서는 명궁을 타고난 출발점, 신궁을 시간이 지나며 굳어지는 삶의 방식으로 보아 두 궁의 간격이 실제 운의 체감 차이를 만든다고 읽습니다.`;
  if (has("재백궁") && has("관록궁")) return `${categoryTitle || context.focus || "이 주제"}에서는 재백궁과 관록궁이 돈과 직업의 삼방사정처럼 맞물리니, 수익은 성과에서 오고 성과는 책임의 크기로 시험됩니다.`;
  if ((has("부부궁") || has("자녀궁")) && has("복덕궁")) return `${title}의 인연은 부부궁·자녀궁의 반응을 복덕궁의 마음 그릇과 함께 보아야 오래 버틸 관계의 온도가 드러납니다.`;
  if (has("질액궁") && has("복덕궁")) return `${title}에서는 질액궁을 몸의 경고, 복덕궁을 마음의 회복처로 두어 원인과 회복의 흐름을 서로 비추어 봅니다.`;
  if (has("천이궁") && has("전택궁")) return `${title}에서는 천이궁을 밖으로 나가는 문, 전택궁을 돌아와 쉴 기반으로 보아 이동 운과 정착 운을 함께 읽어야 합니다.`;
  if (has("노복궁") && has("형제궁")) return `${title}에서는 노복궁과 형제궁이 사람 운의 안팎을 보여 주며, 협업의 기회와 신뢰의 비용을 함께 드러냅니다.`;
  const relationWords = ["삼방사정의 보조선", "대궁의 반대 압력", "궁위 간 응답", "운한의 교차점"];
  return `${title}에서는 ${names.slice(0, 3).join("·") || "명궁"}을 ${relationWords[Math.abs(Number(variant) || 0) % relationWords.length]}으로 묶어 한 궁의 장점이 다른 궁의 부담으로 번지지 않는지 봅니다.`;
}

function buildZiweiFourteenStarsDigestText(context = {}, categoryTitle = "", variant = 0) {
  const active = uniqueZiweiTexts(normalizeStarList(context?.mainStars).map((star) => `${star.name}${star.strengthSymbol || ""}`));
  const allStars = ["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];
  const activeNames = new Set(active.map((item) => item.replace(/[◎O▲△X]+$/g, "")));
  const quiet = allStars.filter((name) => !activeNames.has(name));
  const groups = [
    `활성 주성은 ${active.length ? active.join(", ") : "직접 드러난 주성이 약한 편"}입니다.`,
    `${categoryTitle}의 보조 판단에서는 ${quiet.slice(0, 4).join("·")}의 빈자리가 성향의 과잉과 결핍을 가르는 기준이 됩니다.`,
    `${categoryTitle}에서 나머지 주성은 ${quiet.slice(4, 10).join("·")}처럼 직접 사건보다 비교 기준으로 작동합니다.`,
    `따라서 ${categoryTitle}은 강한 별만 칭찬하지 말고, 드러나지 않은 별이 만들지 못하는 균형까지 함께 보아야 합니다.`,
  ];
  return groups.slice(variant % 2, (variant % 2) + 3).join(" ");
}

function buildZiweiReviewCloseText({ profileName = "고객", chapterNo = 1, categoryNo = 1, categoryTitle = "", context = {}, guide = {}, resultCheckText = "", reviewLabelA = "먼저", reviewLabelB = "이어서", reviewLabelC = "끝으로", reviewLead = "", variant = 0 } = {}) {
  const title = clean(categoryTitle || guide.intent || "이 주제");
  const intent = clean(guide.intent || title);
  const primary = clean(context.primaryStar || "중심 별");
  const caution = clean(context.cautionStar || "긴장 신호");
  const domain = context.domain || getZiweiCategoryDomain(title, intent);
  const domainCloseRows = {
    money: [
      `${profileName}님은 ${title}에서 숫자가 남긴 흔적을 보고 다음 지출과 투자 판단을 줄이면 됩니다.`,
      `${profileName}님은 ${title}에서 수입보다 남는 몫과 새는 구멍을 먼저 확인하면 됩니다.`,
      `${profileName}님은 ${title}에서 큰 결정보다 보존 자금과 손실 한도를 기준으로 삼으십시오.`,
    ],
    career: [
      `${profileName}님은 ${title}에서 결과물, 평판, 책임 범위를 한 줄씩 나누어 다음 업무의 무게를 정하면 됩니다.`,
      `${profileName}님은 ${title}에서 맡을 역할과 넘길 역할을 분리해 성취의 부담을 낮추십시오.`,
      `${profileName}님은 ${title}에서 보여 줄 성과보다 검증 가능한 결과를 먼저 남기면 됩니다.`,
    ],
    relationship: [
      `${profileName}님은 ${title}에서 마음의 온도보다 약속 이행과 회복 시간을 기준으로 관계를 다시 보십시오.`,
      `${profileName}님은 ${title}에서 끌림의 강도보다 서로 지킬 수 있는 말의 무게를 확인하십시오.`,
      `${profileName}님은 ${title}에서 가까워질 속도와 거리를 둘 기준을 함께 정하면 됩니다.`,
    ],
    health: [
      `${profileName}님은 ${title}에서 몸의 피로, 수면, 긴장 신호를 먼저 낮춰 운의 그릇을 안정시키면 됩니다.`,
      `${profileName}님은 ${title}에서 버티는 힘보다 회복되는 속도를 기준으로 일정을 조정하십시오.`,
      `${profileName}님은 ${title}에서 몸이 보내는 작은 신호를 먼저 다루면 큰 흔들림을 줄일 수 있습니다.`,
    ],
    foundation: [
      `${profileName}님은 ${title}에서 공간, 이동, 관리 비용을 함께 보며 오래 머물 기반을 고르면 됩니다.`,
      `${profileName}님은 ${title}에서 옮길 자리와 지킬 자리를 나누어 생활의 뿌리를 안정시키십시오.`,
      `${profileName}님은 ${title}에서 넓히는 선택보다 유지 가능한 동선과 비용을 먼저 보십시오.`,
    ],
    timing: [
      `${profileName}님은 ${title}에서 대한의 방향과 유년의 반응이 겹치는 지점만 다음 행동으로 남기면 됩니다.`,
      `${profileName}님은 ${title}에서 지금 열 문과 다음 운에 넘길 문을 분리하십시오.`,
      `${profileName}님은 ${title}에서 좋은 때의 기세보다 준비가 끝난 선택을 우선하면 됩니다.`,
    ],
    self: [
      `${profileName}님은 ${title}에서 마음이 움직인 까닭과 실제 결과를 나누어 다음 기준을 세우면 됩니다.`,
      `${profileName}님은 ${title}에서 감정의 이유, 행동의 결과, 남은 책임을 따로 적어 보십시오.`,
      `${profileName}님은 ${title}에서 처음의 끌림보다 끝에 남은 변화가 무엇인지 기준으로 삼으십시오.`,
    ],
  };
  const domainCloseChoices = domainCloseRows[domain] || [`${profileName}님은 ${title}의 판단을 다음 선택의 기준으로 남기면 됩니다.`];
  const domainClose = domainCloseChoices[Math.abs(Number(variant) || 0) % domainCloseChoices.length];
  const recurringSignalText = [
    `${title}에서 되풀이된 사람, 돈, 몸, 시간의 신호를 서로 다른 칸에 적습니다.`,
    `${title}의 메모에서 다시 나타난 관계, 비용, 피로, 일정의 흔적을 가릅니다.`,
    `${title}에서는 같은 문제가 어떤 사람과 시간대에 반복되는지 먼저 분리합니다.`,
  ][Math.abs(Number(variant) || 0) % 3];
  const openedDoorText = [
    `${primary}가 열어 준 문이 ${title}에서 실제 결과로 남았는지 확인합니다.`,
    `${title}에서 ${primary}의 도움을 받은 선택이 생활의 변화로 이어졌는지 봅니다.`,
    `${primary}의 밝은 단서가 ${title} 안에서 말뿐 아니라 행동으로 남았는지 점검합니다.`,
  ][Math.abs(Number(variant) || 0) % 3];
  const delayText = [
    `${caution}가 만든 지연은 실패가 아니라 ${title}의 순서를 다시 맞추라는 신호로 남깁니다.`,
    `${title}에서 ${caution}가 늦춘 일은 보류와 재정비의 목록으로 따로 둡니다.`,
    `${caution}의 제동은 ${title}에서 아직 무리하지 말아야 할 경계로 읽습니다.`,
  ][Math.abs(Number(variant) || 0) % 3];
  const closes = [
    `${reviewLead} ${reviewLabelA}, ${intent}에서 실제로 줄어든 부담을 봅니다. ${reviewLabelB}, ${primary}가 만든 결과를 확인하며 ${resultCheckText} ${reviewLabelC}, ${title} 안에서 ${caution}가 반복된 장면을 다음 선택의 경계로 남깁니다. ${domainClose}`,
    `${reviewLead} ${reviewLabelA}, ${title}에서는 좋아진 일보다 덜 흔들린 지점을 먼저 확인합니다. ${reviewLabelB}, ${resultCheckText} ${reviewLabelC}, ${title}에서는 ${primary}의 강점과 ${caution}의 경고가 같은 장면에서 부딪혔는지 봅니다. ${chapterNo}장 ${categoryNo}절의 결론은 ${domainClose}`,
    `${reviewLead} ${reviewLabelA}, ${recurringSignalText} ${reviewLabelB}, ${resultCheckText} ${reviewLabelC}, ${title}에서 남은 압박은 ${caution}의 이름으로 따로 적어 둡니다. ${domainClose}`,
    `${reviewLead} ${reviewLabelA}, ${intent}이 실제 생활에서 가벼워졌는지 봅니다. ${reviewLabelB}, ${openedDoorText} ${reviewLabelC}, ${delayText} ${domainClose}`,
  ];
  return closes[Math.abs(Number(variant) || 0) % closes.length];
}

function buildZiweiChapterVoiceText(blueprint = {}, context = {}, categoryTitle = "", variant = 0) {
  const id = clean(blueprint?.id);
  const title = clean(categoryTitle || context.focus || "이 주제");
  const palaceText = clean(context.palaceNamesText || "명궁");
  const rows = {
    "01": [
      `총론에서는 한 사건을 맞히기보다 ${palaceText}가 명반 전체에서 어떤 중심축을 맡는지 먼저 세웁니다.`,
      `${title}은 앞으로 이어질 모든 장의 첫 기준이므로 강점보다 반복되는 선택의 모양을 먼저 봅니다.`,
    ],
    "02": [
      `명궁은 타고난 나이고 신궁은 시간이 지나며 완성되는 나이므로, 이 장에서는 두 축의 간격을 상담의 중심으로 둡니다.`,
      `${title}에서는 선천 기질과 후천 습관이 서로 돕는지, 아니면 서로 피로를 만드는지 구분합니다.`,
    ],
    "03": [
      `사화 장에서는 좋은 별과 나쁜 별을 나누기보다 욕망, 권한, 평판, 막힘이 사건으로 변하는 순서를 봅니다.`,
      `${title}의 핵심은 화록·화권·화과·화기가 어느 궁에서 먼저 사건을 일으키는지 읽는 데 있습니다.`,
    ],
    "04": [
      `14주성 장에서는 강하게 뜬 별만 보지 않고, 드러나지 않은 주성이 만들지 못하는 균형까지 함께 봅니다.`,
      `${title}에서는 활성 주성, 보조 판단 주성, 빈자리로 작동하는 주성을 나누어 해석합니다.`,
    ],
    "06": [
      `재백과 관록의 장에서는 돈이 들어오는 방식보다 돈이 남는 구조와 성과가 책임으로 바뀌는 순간을 봅니다.`,
      `${title}은 수익, 직책, 평판이 같은 속도로 자라지 않을 때 무엇을 먼저 조정할지 알려 줍니다.`,
    ],
    "07": [
      `관계 장에서는 인연의 좋고 나쁨보다 마음의 온도, 약속의 무게, 회복 가능한 거리감을 봅니다.`,
      `${title}은 사랑과 가족 안에서 반복되는 기대와 서운함의 원인을 분리하는 자리입니다.`,
    ],
    "11": [
      `질액 장에서는 병명을 단정하지 않고 몸이 먼저 보내는 피로, 긴장, 생활 리듬의 경고를 읽습니다.`,
      `${title}은 운의 강약보다 몸이 감당할 수 있는 그릇을 먼저 세우는 장입니다.`,
    ],
    "12": [
      `대한 장에서는 10년 운을 큰 결심으로 두지 않고, 오래 짊어질 책임과 내려놓을 책임으로 나눕니다.`,
      `${title}은 한 번의 선택보다 10년 동안 반복될 생활 구조를 점검합니다.`,
    ],
    "13": [
      `유년 장에서는 올해의 월별 반응을 보아 열 문, 닫을 문, 보류할 문을 나눕니다.`,
      `${title}은 한 해의 운을 사건 예측보다 월별 실행 순서로 낮추는 자리입니다.`,
    ],
    "14": [
      `생애 장에서는 절정기와 회복기를 한 줄로 단정하지 않고, 삶 전체에서 반복되는 전환의 리듬을 봅니다.`,
      `${title}은 전성기보다 전환점을 어떻게 통과할지 알려 주는 장기 지도입니다.`,
    ],
    "15": [
      `최종장에서는 모든 해석을 다시 늘어놓지 않고, 실제로 지킬 수 있는 우선순위와 안전장치만 남깁니다.`,
      `${title}은 명반 전체에서 지금 가장 먼저 지켜야 할 운의 규칙을 압축하는 자리입니다.`,
    ],
  };
  const selected = rows[id] || [
    `${title}에서는 ${palaceText}의 별빛을 생활 속 선택으로 낮추어 읽습니다.`,
    `${title}은 좋은 신호와 부담 신호가 현실에서 만나는 지점을 확인하는 장입니다.`,
  ];
  return selected[Math.abs(Number(variant) || 0) % selected.length];
}

function selectZiweiRuleLine(rule = {}, domain = "self") {
  if (domain === "money") return safeArray(rule.money)[0] || safeArray(rule.career)[0] || safeArray(rule.personality)[0] || "";
  if (domain === "career") return safeArray(rule.career)[0] || safeArray(rule.personality)[0] || "";
  if (domain === "relationship") return safeArray(rule.relationship)[0] || safeArray(rule.personality)[0] || "";
  if (domain === "health") return safeArray(rule.caution)[0] || safeArray(rule.personality)[0] || "";
  if (domain === "foundation") return safeArray(rule.money)[0] || safeArray(rule.career)[0] || safeArray(rule.personality)[0] || "";
  if (domain === "timing") return safeArray(rule.advice)[0] || safeArray(rule.career)[0] || safeArray(rule.personality)[0] || "";
  return safeArray(rule.personality)[0] || safeArray(rule.advice)[0] || "";
}

function selectZiweiDomainAdvice(rule = {}, domain = "self", starName = "", categoryTitle = "", intent = "") {
  const relation = safeArray(rule.relationship)[0] || safeArray(rule.personality)[0] || `${starName}의 성향을 관계 안에서 천천히 드러냅니다`;
  const career = safeArray(rule.career)[0] || safeArray(rule.personality)[0] || `${starName}의 힘을 결과물로 연결합니다`;
  const money = safeArray(rule.money)[0] || safeArray(rule.advice)[0] || `${starName}의 판단을 돈의 흐름에 맞춥니다`;
  const caution = safeArray(rule.caution)[0] || safeArray(rule.personality)[1] || "무리한 속도";
  const intentText = intent || categoryTitle || "이 주제";
  const relationSentence = stripZiweiSentenceEnding(naturalizeZiweiPredicate(relation, `${starName}의 관계 감각이 드러납니다`));
  const careerSentence = stripZiweiSentenceEnding(naturalizeZiweiPredicate(career, `${starName}의 사회적 힘이 드러납니다`));
  const moneySentence = stripZiweiSentenceEnding(naturalizeZiweiPredicate(money, `${starName}의 재물 감각이 드러납니다`));
  const cautionText = stripZiweiSentenceEnding(naturalizeZiweiPredicate(caution, "무리한 속도가 부담으로 돌아옵니다"));
  const relationPhrase = ziweiNominalizePhrase(relationSentence);
  const careerPhrase = ziweiNominalizePhrase(careerSentence);
  const moneyPhrase = ziweiNominalizePhrase(moneySentence);
  const cautionPhrase = ziweiNominalizePhrase(cautionText);
  if (domain === "relationship") {
    return `${intentText}에서는 ${relationPhrase}을 살피며, 마음을 증명하려 애쓰기보다 말의 순서, 거리, 회복 시간을 먼저 맞추십시오.`;
  }
  if (domain === "health") {
    return `${intentText}에서는 ${cautionPhrase}이 몸의 신호로 번지기 쉬우니 수면, 긴장, 회복 시간을 먼저 안정시키십시오.`;
  }
  if (domain === "foundation") {
    return `${intentText}에서는 ${moneyPhrase}을 보되, 소유보다 거처, 동선, 생활 기반이 오래 버티는지를 먼저 보십시오.`;
  }
  if (domain === "career") {
    return `${intentText}에서는 ${careerPhrase}을 맡을 책임과 보여 줄 결과물로 분명히 나누십시오.`;
  }
  if (domain === "money") {
    return `${intentText}에서는 ${moneyPhrase}을 수입, 지출, 보존 자금의 순서로 세우십시오.`;
  }
  if (domain === "timing") {
    return `${intentText}에서는 좋은 기운이 온 때보다 준비된 행동이 맞물리는 순간을 잡으십시오.`;
  }
  const adviceText = stripZiweiSentenceEnding(naturalizeZiweiPredicate(safeArray(rule.advice)[0] || relation, `${starName}의 힘이 현실에서 드러납니다`));
  const advicePhrase = adviceText
    .replace(/해 보세요$/g, "하는")
    .replace(/하세요$/g, "하는")
    .replace(/십시오$/g, "하는")
    .replace(/세요$/g, "는")
    .replace(/합니다$/g, "하는")
    .replace(/입니다$/g, "인");
  const selfVariants = [
    `${intentText}에서는 ${advicePhrase} 흐름을 오늘의 선택 기준 하나로 낮추십시오.`,
    `${starName}의 기운은 ${intentText}에서 ${advicePhrase} 방향으로 나타나니, 맡을 일과 내려놓을 일을 먼저 나누십시오.`,
    `${intentText}에서는 ${advicePhrase} 단서를 오래 끌고 갈 생활 원칙으로 바꾸는 것이 좋습니다.`,
    `${categoryTitle}에서 ${ziweiWithParticle(starName, "eulReul")} 쓸 때는 ${advicePhrase} 힘을 말보다 일정, 책임, 관계의 경계로 확인하십시오.`,
    `${intentText}의 실제 처방은 ${advicePhrase} 기운을 작게 반복 가능한 행동으로 고정하는 데 있습니다.`,
  ];
  return selfVariants[Math.abs(categoryTitle.length + intentText.length + starName.length) % selfVariants.length];
}

function buildZiweiDomainSupportText(rule = {}, domain = "self", categoryTitle = "", starLabel = "", isPressure = false, variant = 0) {
  const support = safeZiweiDisplayText(rule.support, "보조성의 도움");
  const pressure = safeZiweiDisplayText(rule.pressure, "숨은 부담");
  const variants = {
    money: isPressure
      ? [
          `${ziweiWithParticle(starLabel)} ${pressure}${koreanParticleEulReul(pressure)} 드러냅니다. ${categoryTitle}에서는 손실 한도와 보존 자금을 먼저 나눕니다.`,
          `${pressure}${koreanParticleIga(pressure)} 올라올 때 ${categoryTitle}의 돈 흐름은 새는 구멍부터 막아야 합니다.`,
        ]
      : [
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel)} ${support}${koreanParticleEulReul(support)} 열어 줍니다. 이 도움은 현금흐름과 보존 자산으로 묶습니다.`,
          `${support}${koreanParticleEunNeun(support)} ${categoryTitle}의 자금 운용을 받쳐 주니 지출보다 남길 몫을 먼저 정합니다.`,
        ],
    career: isPressure
      ? [
          `${ziweiWithParticle(starLabel)} ${pressure}${koreanParticleEulReul(pressure)} 드러냅니다. ${categoryTitle}에서는 책임 범위를 말로 확정해야 합니다.`,
          `${pressure}${koreanParticleIga(pressure)} 커지면 ${categoryTitle}의 성과도 흔들리니 역할, 일정, 결과물을 분리합니다.`,
        ]
      : [
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel)} ${support}${koreanParticleEulReul(support)} 열어 줍니다. 이 도움은 협업과 평판을 결과물로 묶습니다.`,
          `${support}${koreanParticleEunNeun(support)} ${categoryTitle}의 사회적 길을 넓히니 보여 줄 성과를 먼저 정합니다.`,
        ],
    relationship: isPressure
      ? [
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel)} 말의 각도와 감정 거리를 예민하게 만듭니다. ${categoryTitle}에서는 먼저 경계와 회복 시간을 합의해야 합니다.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel, "iga")} 눌리면 서운함이 쌓입니다. 대화의 순서와 침묵의 시간을 따로 보십시오.`,
        ]
      : [
          `${ziweiWithParticle(starLabel)} 관계의 완충과 신뢰 회복을 돕습니다. ${categoryTitle}에서는 좋은 마음을 약속보다 태도로 증명해야 합니다.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel, "iga")} 돕는 힘은 사람 사이의 온도를 부드럽게 조율합니다.`,
        ],
    health: isPressure
      ? [
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel)} 긴장과 피로의 경고를 드러냅니다. ${categoryTitle}에서는 통증보다 먼저 수면과 감정 소모를 낮춥니다.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel, "iga")} 눌리면 몸이 먼저 말합니다. 일정의 빈칸과 회복 시간을 확보하십시오.`,
        ]
      : [
          `${ziweiWithParticle(starLabel)} 회복 루틴을 받쳐 줍니다. ${categoryTitle}에서는 몸의 리듬을 작게 안정시키는 일이 우선입니다.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel, "iga")} 돕는 힘은 마음을 가라앉히고 생활 리듬을 다시 세웁니다.`,
        ],
    foundation: isPressure
      ? [
          `${ziweiWithParticle(starLabel)} 정착 불안과 공간 압박을 드러냅니다. ${categoryTitle}에서는 옮길 것과 지킬 것을 나누십시오.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel, "iga")} 눌리면 기반이 흔들립니다. 동선, 거처, 보관할 자원을 다시 정리합니다.`,
        ]
      : [
          `${ziweiWithParticle(starLabel)} 생활 기반을 안정시키는 도움입니다. ${categoryTitle}에서는 공간과 루틴을 먼저 다듬습니다.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel, "iga")} 돕는 힘은 거처와 이동의 리듬을 부드럽게 맞춥니다.`,
        ],
    timing: isPressure
      ? [
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel)} 서두른 선택의 대가를 알려 줍니다. 때가 오기 전 확정하지 않는 지혜가 필요합니다.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel, "iga")} 눌리면 타이밍이 어긋나므로 보류할 것과 밀어붙일 것을 나누십시오.`,
        ]
      : [
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel)} 운의 문을 열어 주는 보조 신호이므로 준비된 행동을 때에 맞춰 꺼내야 합니다.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel, "iga")} 돕는 힘은 좋은 기운을 현실 선택으로 이어 줍니다.`,
        ],
    self: isPressure
      ? [
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel)} 성급한 반응을 드러냅니다. 감정과 판단을 분리하십시오.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel, "iga")} 눌리면 기준이 흔들립니다. ${categoryTitle}에서는 ${starLabel}가 흔드는 근거를 다시 확인한 뒤 결정하십시오.`,
          `${categoryTitle}에서는 ${starLabel}의 압박이 올라올 때 말보다 기록으로 판단을 식히는 편이 좋습니다.`,
          `${categoryTitle}의 긴장 신호는 속도를 낮추라는 뜻입니다. 당장 확정하지 말고 작은 선택부터 정리하십시오.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel)} 강하게 작동하면 고집과 책임감이 섞일 수 있으니 역할을 나누십시오.`,
        ]
      : [
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel)} 선택의 안정감을 돕습니다. ${categoryTitle}에서는 ${starLabel}가 돕는 기준을 오늘의 첫 선택에만 적용해 보십시오.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel, "iga")} 돕는 힘은 마음의 방향을 다시 정돈합니다.`,
          `${categoryTitle}에서는 ${starLabel}의 보조가 흐트러진 판단을 한 줄의 원칙으로 모아 줍니다.`,
          `${categoryTitle}에서 ${ziweiWithParticle(starLabel)} 밝게 작동하면 복잡한 마음도 순서를 되찾습니다.`,
          `${categoryTitle}의 보조 신호는 큰 결심보다 꾸준히 지킬 태도를 세우게 합니다.`,
        ],
  };
  const rows = variants[domain] || variants.self;
  return rows[Math.abs(Number(variant) || 0) % rows.length];
}

function buildZiweiStarCounselingText(stars = [], categoryTitle = "", intent = "", context = {}) {
  const domain = getZiweiCategoryDomain(categoryTitle, intent);
  const lines = normalizeStarList(stars).slice(0, 3).map((star, index) => {
    const rule = STAR_RULES[star.name];
    const starLabel = `${star.name}${star.strengthSymbol || ""}`;
    if (!rule) return `${ziweiWithParticle(starLabel)} ${intent || categoryTitle}에서 현실 판단의 방향을 잡는 핵심 신호입니다.`;
    const strength = rule.strengthMeaning?.[star.strengthSymbol] || rule.strengthMeaning?.["△"] || "조건에 따라 힘이 달라지는 배치";
    const domainLine = selectZiweiRuleLine(rule, domain);
    const advice = selectZiweiDomainAdvice(rule, domain, star.name, categoryTitle, intent);
    const domainSentence = stripZiweiSentenceEnding(naturalizeZiweiPredicate(domainLine, `${intent || categoryTitle}의 판단을 구체화합니다`));
    const palaceSpecific = buildZiweiPalaceSpecificStarText(rule, starLabel, domain, context, categoryTitle, categoryTitle.length + intent.length + index);
    const natureLead = [
      `${ziweiWithParticle(starLabel)} ${rule.nature}의 결을 품고`,
      `${rule.nature}의 기운이 ${starLabel}에서 열리며`,
      `${ziweiWithParticle(starLabel)} ${rule.nature}${koreanParticleEulReul(rule.nature)} 움직여`,
      `${rule.nature}${koreanParticleIga(rule.nature)} ${ziweiWithParticle(starLabel, "ro")} 모여`,
      `${ziweiWithParticle(starLabel)} ${rule.nature}의 작용을 밝혀`,
    ][(categoryTitle.length + intent.length + index) % 5];
    const strengthSentence = buildZiweiStrengthSentence(strength, {
      starName: star.name,
      starLabel,
      domain,
      palaceText: clean(context?.palaceNamesText || "명궁"),
      title: categoryTitle,
      intentText: intent || categoryTitle,
      variant: categoryTitle.length + intent.length + index + 1,
    });
    const starRoleSentence = [
      `${categoryTitle}에서 ${natureLead} 이 절의 판단축을 세웁니다.`,
      `${categoryTitle}에서는 ${natureLead} 별의 쓰임을 현실 문제로 끌어옵니다.`,
      `${categoryTitle} 안에서 ${natureLead} 선택의 방향을 밝힙니다.`,
      `${categoryTitle}에서는 ${natureLead} 상담의 첫 실마리를 엽니다.`,
      `${categoryTitle}에서 ${natureLead} 처방의 무게중심을 정합니다.`,
    ][(categoryTitle.length + intent.length + index) % 5];
    return [
      palaceSpecific,
      starRoleSentence,
      strengthSentence,
      `${categoryTitle}에서는 ${domainSentence}.`,
      softenZiweiCounselingText(advice, categoryTitle.length + starLabel.length),
    ].filter(Boolean).join(" ");
  });
  return lines.length ? lines.join(" ") : `${intent || categoryTitle}에서는 주성의 직접 신호가 약하므로 궁의 자리와 운 흐름을 보수적으로 함께 보아야 합니다.`;
}

function buildZiweiSupportPressureCounselingText(auxStars = [], maleficStars = [], categoryTitle = "", intent = "") {
  const domain = getZiweiCategoryDomain(categoryTitle, intent);
  const support = normalizeStarList(auxStars).slice(0, 2).map((star) => {
    const rule = AUX_MALEFIC_RULES[star.name];
    const starLabel = `${star.name}${star.strengthSymbol || ""}`;
    if (!rule) return `${ziweiWithParticle(starLabel)} ${categoryTitle}의 보조 완성도를 높입니다.`;
    return buildZiweiDomainSupportText(rule, domain, categoryTitle, starLabel, false, categoryTitle.length + starLabel.length);
  });
  const pressure = normalizeStarList(maleficStars).slice(0, 2).map((star) => {
    const rule = AUX_MALEFIC_RULES[star.name];
    const starLabel = `${star.name}${star.strengthSymbol || ""}`;
    if (!rule) return `${ziweiWithParticle(starLabel)} ${categoryTitle}에서 서두름과 피로를 점검하라는 압박 신호입니다.`;
    return buildZiweiDomainSupportText(rule, domain, categoryTitle, starLabel, true, categoryTitle.length + starLabel.length + 1);
  });
  return [...support, ...pressure].join(" ");
}

function buildZiweiCategoryBoundaryText(categoryTitle = "", context = {}, guide = {}) {
  const domain = getZiweiCategoryDomain(categoryTitle, guide.intent);
  const palaceText = safeZiweiDisplayText(context?.palaceNamesText, "해당 궁");
  const title = safeZiweiDisplayText(categoryTitle || guide.intent, "이 주제");
  const intent = safeZiweiDisplayText(guide.intent || context?.focus || title, title);
  const variant = Math.abs(`${title}${palaceText}${intent}`.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0));
  const rules = {
    money: [
      `${title}에서는 ${palaceText}의 재물 반응을 수입, 지출, 보존 자금, 투자 판단으로 나누어 감정 지출과 분리합니다.`,
      `${palaceText}의 재물 신호는 ${title} 안에서 들어오는 돈, 머무는 돈, 새는 돈을 따로 보라고 말합니다.`,
      `${ziweiWithParticle(intent, "eulReul")} 현실에 붙이려면 숫자로 확인할 항목과 감정으로 흔들리는 항목을 분리합니다.`,
    ],
    career: [
      `${title}에서는 ${palaceText}가 요구하는 책임, 거절할 일, 보여 줄 결과물을 분리해 성과의 순서를 세웁니다.`,
      `${palaceText}의 직업 신호는 ${title}에서 명예가 붙는 일과 소모만 남는 일을 구분하라고 합니다.`,
      `${ziweiWithParticle(intent, "eulReul")} 키울 때는 오늘 끝낼 책임과 이번 달까지 숙성할 책임을 나눕니다.`,
    ],
    relationship: [
      `${title}에서는 ${palaceText}가 끌어오는 인연을 가까워질 사람, 거리를 둘 사람, 말로 확인할 약속으로 구분합니다.`,
      `${palaceText}의 인연 신호는 ${title}에서 정으로 감당할 일과 약속으로 확인할 일을 나누게 합니다.`,
      `${ziweiWithParticle(intent, "eulReul")} 살피려면 먼저 마음의 온도, 실제 행동, 반복된 약속을 따로 적습니다.`,
    ],
    health: [
      `${title}에서는 ${palaceText}가 드러내는 수면, 피로, 감정 긴장, 회복 시간을 따로 기록해 몸의 경고를 먼저 낮춥니다.`,
      `${palaceText}의 건강 신호는 ${title}에서 몸이 먼저 멈추라는 지점과 마음이 과열되는 지점을 가릅니다.`,
      `${ziweiWithParticle(intent, "eulReul")} 다룰 때는 증상 하나보다 피로가 올라오는 시간대와 회복 속도를 봅니다.`,
    ],
    foundation: [
      `${title}에서는 ${palaceText}가 흔드는 공간, 이동, 자산, 정착 루틴을 분리해 오래 지킬 기반을 정합니다.`,
      `${palaceText}의 기반 신호는 ${title}에서 떠나야 할 자리와 다시 뿌리내릴 자리를 함께 보여 줍니다.`,
      `${ziweiWithParticle(intent, "eulReul")} 안정시키려면 집, 일상 동선, 보유 자산의 부담을 각각 점검합니다.`,
    ],
    timing: [
      `${title}에서는 ${palaceText}가 여는 시간표를 이번 달 실행, 분기 점검, 장기 보류 결정으로 나누어 운의 속도를 맞춥니다.`,
      `${palaceText}의 시간 신호는 ${title}에서 지금 열 문과 기다려야 할 문을 다르게 표시합니다.`,
      `${ziweiWithParticle(intent, "eulReul")} 읽을 때는 빠른 성과보다 운이 허락하는 순서와 멈춤의 기한을 정합니다.`,
    ],
    self: [
      `${title}에서는 ${palaceText}가 건드리는 태도와 반응을 구분하고, 끝까지 가져갈 기준을 하나만 남깁니다.`,
      `${palaceText}의 자기 신호는 ${title}에서 타고난 성향과 지금 바꾸어야 할 습관을 갈라 보여 줍니다.`,
      `${ziweiWithParticle(intent, "eulReul")} 붙들려면 먼저 말투, 선택 속도, 포기하지 말아야 할 원칙을 정합니다.`,
    ],
  };
  const rows = rules[domain] || rules.self;
  return rows[variant % rows.length];
}

function buildZiweiCategoryResultCheckText(categoryTitle = "", context = {}, guide = {}) {
  const domain = getZiweiCategoryDomain(categoryTitle, guide.intent);
  if (domain === "money") return `${categoryTitle}에서는 현금흐름, 불필요 지출, 남은 자산을 숫자로 대조합니다.`;
  if (domain === "career") return `${categoryTitle}에서는 결과물, 평판, 책임 범위가 선명해졌는지 업무 기록으로 봅니다.`;
  if (domain === "relationship") return `${categoryTitle}에서는 관계의 온도, 약속 이행, 감정 회복 시간을 함께 살핍니다.`;
  if (domain === "health") return `${categoryTitle}에서는 피로도, 수면, 긴장 신호가 줄었는지 몸의 기록으로 봅니다.`;
  if (domain === "foundation") return `${categoryTitle}에서는 공간과 이동, 자산 기반이 삶을 안정시키는 쪽으로 움직였는지 살핍니다.`;
  if (domain === "timing") return `${categoryTitle}에서는 월별 실행과 분기 결과가 대한·유년의 큰 물길과 어긋나지 않는지 대조합니다.`;
  const palaceText = context?.palaceNamesText || "명궁";
  const variants = [
    `${guide.intent || categoryTitle}에서는 ${palaceText}에서 세운 기준이 실제 선택의 순서로 이어졌는지 봅니다.`,
    `${categoryTitle}에서는 마음의 결심보다 반복된 행동, 줄어든 피로, 남은 책임을 함께 확인합니다.`,
    `${guide.intent || categoryTitle}에서는 처음 세운 기준이 사람, 돈, 시간 앞에서 흔들리지 않았는지 대조합니다.`,
    `${categoryTitle}에서는 ${palaceText}의 길한 신호가 생활의 안정감으로 남았는지 살핍니다.`,
  ];
  return variants[Math.abs(categoryTitle.length + clean(guide.intent).length + palaceText.length) % variants.length];
}

function selectZiweiPalaceForBlueprint(seed = {}, blueprint = {}, index = 0) {
  const palaces = safeArray(seed?.chart?.palaces);
  if (blueprint?.palaceKey === "timing") {
    return seed?.chart?.lifePalace || findPalace(seed, "ming") || palaces[0] || {};
  }
  if (blueprint?.palaceKey && blueprint.palaceKey !== "timing") {
    const matched = findPalace(seed, blueprint.palaceKey);
    if (matched && Object.keys(matched).length) return matched;
  }
  if (palaces.length) return palaces[index % palaces.length];
  return seed?.chart?.lifePalace || {};
}

function selectZiweiPalacesForCategory(seed = {}, blueprint = {}, categoryIndex = 0, chapterIndex = 0) {
  const config = getZiweiCategoryContextConfig(blueprint, categoryIndex);
  const selected = [];
  const seen = new Set();
  for (const key of safeArray(config.palaceKeys)) {
    const palace = findPalace(seed, key);
    const marker = clean(palace?.key || palace?.nameKo || key);
    if (!palace || !marker || seen.has(marker)) continue;
    seen.add(marker);
    selected.push(palace);
  }
  if (selected.length) return selected;
  const fallback = selectZiweiPalaceForBlueprint(seed, blueprint, chapterIndex);
  return fallback && Object.keys(fallback).length ? [fallback] : [];
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

function ziweiMultiPalaceTransformationText(seed = {}, palaces = []) {
  const rows = safeArray(palaces)
    .flatMap((palace) => safeArray(palace?.transformations).map((item) => {
      const palaceName = safeZiweiDisplayText(palace?.nameKo || palace?.name, "해당 궁");
      const star = safeZiweiDisplayText(item?.star, "별");
      const type = safeZiweiDisplayText(item?.type || item?.label, "사화");
      return `${palaceName} ${star} ${type}`;
    }))
    .filter(Boolean);
  if (rows.length) return uniqueZiweiTexts(rows).slice(0, 4).join(", ");
  return ziweiTransformationText(seed, safeArray(palaces)[0] || {});
}

function ziweiPalaceBriefText(palace = {}) {
  const palaceName = safeZiweiDisplayText(palace?.nameKo || palace?.name, "해당 궁");
  const branch = safeZiweiDisplayText(palace?.branch, "지지 미확인");
  const mainStars = ziweiStarListText(palace?.mainStars, "주성 미상");
  const auxStars = ziweiStarListText(palace?.auxStars, "보조성 미상");
  const maleficStars = ziweiStarListText(palace?.maleficStars, "압박 신호 약함");
  return `${palaceName}(${branch}) 주성 ${mainStars}, 보좌 ${auxStars}, 압박 ${maleficStars}`;
}

function ziweiLuckRowText(row = {}, fallback = "확인된 운 구간", variant = 0) {
  const label = safeZiweiDisplayText(row?.label || row?.range || row?.period || row?.ageRange || row?.year, fallback);
  const palace = safeZiweiDisplayText(row?.palace || row?.palaceName || row?.nameKo, "");
  const theme = safeZiweiDisplayText(row?.theme || row?.summary || row?.memo || row?.description, "");
  const palacePhrases = [
    `${palace}에서 운의 문이 열림`,
    `${ziweiWithParticle(palace, "iga")} 선택의 무대를 이룸`,
    `${palace} 쪽으로 기운이 모임`,
    `${palace}에서 현실 반응이 먼저 나타남`,
    `${ziweiWithParticle(palace, "iga")} 올해의 체감 지점을 만듦`,
  ];
  return [label, palace ? palacePhrases[Math.abs(Number(variant) || 0) % palacePhrases.length] : "", theme].filter(Boolean).join(" · ");
}

function buildZiweiAnnualRoadmapText(seed = {}, categoryIndex = 0, domain = "self", categoryTitle = "") {
  const annualLuck = safeArray(seed?.chart?.annualLuck);
  const annual = annualLuck.find((item) => item?.current || item?.isCurrent) || annualLuck[0] || {};
  const year = safeZiweiDisplayText(annual?.year || annual?.label, "올해");
  const title = safeZiweiDisplayText(categoryTitle, "이 주제");
  const monthlyThemeMap = {
    money: [
      "1월은 고정비와 새는 돈을 먼저 적는 달",
      "2월은 수입 경로와 부수입 가능성을 시험하는 달",
      "3월은 작은 이익을 실제 잔고로 남기는 달",
      "4월은 충동 지출과 투자 욕심을 낮추는 달",
      "5월은 귀인 제안도 계약 조건부터 보는 달",
      "6월은 건강 비용과 감정 소비를 따로 묶는 달",
      "7월은 하반기 저축률과 현금 방어선을 다시 세우는 달",
      "8월은 사람 때문에 나가는 돈의 경계를 세우는 달",
      "9월은 성과를 매출과 평판으로 연결하는 달",
      "10월은 누적 지출과 책임 비용을 정리하는 달",
      "11월은 남길 자산과 정리할 약속을 가르는 달",
      "12월은 손익, 세금, 회복 비용을 함께 마무리하는 달",
    ],
    career: [
      "1월은 맡을 역할과 버릴 업무를 정하는 달",
      "2월은 협업자의 반응과 보고 체계를 시험하는 달",
      "3월은 첫 결과물을 밖으로 보여 주는 달",
      "4월은 일정 과부하와 책임 범위를 조절하는 달",
      "5월은 제안과 이동 기회를 선별하는 달",
      "6월은 체력 저하가 성과를 갉아먹지 않게 쉬는 달",
      "7월은 하반기 목표와 평가 기준을 다시 세우는 달",
      "8월은 사람과 일의 경계선을 분명히 하는 달",
      "9월은 평판을 굳히고 대표 결과물을 남기는 달",
      "10월은 누적된 책임과 미룬 일을 정리하는 달",
      "11월은 장기 커리어 방향과 남길 인맥을 고르는 달",
      "12월은 성과, 평판, 피로도를 함께 결산하는 달",
    ],
    relationship: [
      "1월은 마음의 기준과 반복되는 기대를 정리하는 달",
      "2월은 상대의 반응과 약속의 온도를 시험하는 달",
      "3월은 첫 갈등 뒤 회복 방식을 확인하는 달",
      "4월은 서운함과 말의 속도를 조절하는 달",
      "5월은 새 인연과 기존 관계의 거리를 선별하는 달",
      "6월은 가족과 가까운 사람에게 쓰는 감정 기운을 낮추는 달",
      "7월은 하반기 관계 원칙을 다시 세우는 달",
      "8월은 사람 사이 경계와 부탁의 한계를 분명히 하는 달",
      "9월은 마음을 행동으로 보여 주는 달",
      "10월은 오래 쌓인 감정 부채를 정리하는 달",
      "11월은 남길 인연과 놓아야 할 기대를 고르는 달",
      "12월은 사랑, 가족, 회복 시간을 함께 마무리하는 달",
    ],
    health: [
      "1월은 수면과 피로의 기본 기록을 시작하는 달",
      "2월은 몸의 반응과 감정 긴장 패턴을 시험하는 달",
      "3월은 첫 회복 루틴의 효과를 확인하는 달",
      "4월은 과로와 소화되지 않은 감정을 낮추는 달",
      "5월은 외부 일정과 이동 피로를 선별하는 달",
      "6월은 몸의 피로와 마음의 소모를 크게 낮추는 달",
      "7월은 하반기 건강 기준을 다시 세우는 달",
      "8월은 사람 때문에 무너지는 리듬을 분명히 막는 달",
      "9월은 회복된 체력을 필요한 곳에만 쓰는 달",
      "10월은 누적 피로와 미룬 검진을 정리하는 달",
      "11월은 장기 생활 습관과 남길 루틴을 고르는 달",
      "12월은 몸의 손익과 마음의 회복을 함께 마무리하는 달",
    ],
    foundation: [
      "1월은 공간과 물건의 기준을 정리하는 달",
      "2월은 동선과 가족의 생활 반응을 시험하는 달",
      "3월은 작은 정리의 효과를 확인하는 달",
      "4월은 거처 비용과 이동 속도를 조절하는 달",
      "5월은 이사, 확장, 외부 제안을 선별하는 달",
      "6월은 공간 피로와 정착 불안을 낮추는 달",
      "7월은 하반기 기반 운용 기준을 다시 세우는 달",
      "8월은 사람과 공간의 경계선을 분명히 하는 달",
      "9월은 집과 일터의 결과물을 밖으로 보여 주는 달",
      "10월은 누적된 관리 책임을 정리하는 달",
      "11월은 장기 거처와 남길 자산을 고르는 달",
      "12월은 공간, 돈, 회복의 균형을 마무리하는 달",
    ],
    timing: [
      "1월은 운의 씨앗과 보류할 일을 가르는 달",
      "2월은 사람의 반응으로 때를 시험하는 달",
      "3월은 첫 결과를 보고 방향을 다듬는 달",
      "4월은 속도와 비용을 낮추어 때를 맞추는 달",
      "5월은 열리는 문과 지나가는 문을 선별하는 달",
      "6월은 무리한 확장보다 회복을 택하는 달",
      "7월은 하반기 운의 기준을 다시 세우는 달",
      "8월은 관계와 돈의 경계로 운의 누수를 막는 달",
      "9월은 결과물을 드러내 운을 현실화하는 달",
      "10월은 누적 책임을 정리해 다음 운을 비우는 달",
      "11월은 장기 방향과 남길 인연을 고르는 달",
      "12월은 한 해의 손익과 회복을 마무리하는 달",
    ],
    self: [
      "1월은 마음의 기준을 정리하고 불필요한 약속을 줄이는 달",
      "2월은 관계 반응과 협업 조건을 시험하는 달",
      "3월은 첫 실행 결과를 확인하고 방향을 다듬는 달",
      "4월은 속도와 부담을 조절하는 달",
      "5월은 외부 기회와 제안을 선별하는 달",
      "6월은 몸의 피로와 감정 소모를 낮추는 달",
      "7월은 하반기 성과 기준을 다시 세우는 달",
      "8월은 사람과 약속의 경계선을 분명히 하는 달",
      "9월은 결과물을 밖으로 보여 주는 달",
      "10월은 누적된 책임을 정리하는 달",
      "11월은 장기 방향과 남길 인연을 고르는 달",
      "12월은 한 해의 손익과 회복을 마무리하는 달",
    ],
  };
  const quarterThemeMap = {
    money: ["1분기는 돈의 구멍을 막는 시기", "2분기는 수입과 지출 속도를 맞추는 시기", "3분기는 이익을 실제 잔고로 남기는 시기", "4분기는 손익과 책임 비용을 결산하는 시기"],
    career: ["1분기는 역할을 정하는 시기", "2분기는 실행 속도와 평가를 맞추는 시기", "3분기는 성과를 외부에 보이는 시기", "4분기는 책임과 평판을 결산하는 시기"],
    relationship: ["1분기는 마음의 기준을 세우는 시기", "2분기는 말과 약속의 온도를 맞추는 시기", "3분기는 관계의 경계를 현실화하는 시기", "4분기는 남길 인연을 고르는 시기"],
    health: ["1분기는 몸의 기본 신호를 기록하는 시기", "2분기는 과로와 감정 소모를 낮추는 시기", "3분기는 회복 루틴을 굳히는 시기", "4분기는 피로 부채를 결산하는 시기"],
    foundation: ["1분기는 공간 기준을 세우는 시기", "2분기는 이동과 정착 비용을 맞추는 시기", "3분기는 생활 기반을 안정시키는 시기", "4분기는 거처와 자산을 정리하는 시기"],
    timing: ["1분기는 씨앗과 보류를 가르는 시기", "2분기는 운의 속도를 시험하는 시기", "3분기는 열린 문을 현실화하는 시기", "4분기는 다음 운을 위해 비우는 시기"],
    self: ["1분기는 기준을 세우는 시기", "2분기는 실행 속도를 조정하는 시기", "3분기는 기회를 현실 성과로 바꾸는 시기", "4분기는 남길 것과 정리할 것을 구분하는 시기"],
  };
  const monthlyThemes = monthlyThemeMap[domain] || monthlyThemeMap.self;
  const quarterThemes = quarterThemeMap[domain] || quarterThemeMap.self;
  const rotatedMonths = monthlyThemes
    .map((_, index) => monthlyThemes[(index + (categoryIndex * 2)) % monthlyThemes.length]);
  const monthGroups = [
    `1~3월은 ${rotatedMonths.slice(0, 3).join(", ")}로 문이 열립니다.`,
    `4~6월은 ${rotatedMonths.slice(3, 6).join(", ")}로 속도를 조절합니다.`,
    `7~9월은 ${rotatedMonths.slice(6, 9).join(", ")}로 현실 반응을 살핍니다.`,
    `10~12월은 ${rotatedMonths.slice(9, 12).join(", ")}로 한 해를 거둡니다.`,
  ].join(" ");
  const quarterText = quarterThemes.join(", ");
  const closeBase = {
    money: "월말에는 잔고, 지출 이유, 남은 자산을 함께 봅니다.",
    career: "월말에는 결과물, 평판, 피로도를 함께 봅니다.",
    relationship: "월말에는 마음의 온도, 약속 이행, 회복 시간을 함께 봅니다.",
    health: "월말에는 수면, 긴장, 회복 속도를 함께 봅니다.",
    foundation: "월말에는 공간의 안정감, 이동 피로, 관리 비용을 함께 봅니다.",
    timing: "월말에는 열린 문, 막힌 문, 보류할 일을 함께 봅니다.",
    self: "월말에는 실행 결과와 피로도를 함께 봅니다.",
  }[domain] || "월말에는 실행 결과와 피로도를 함께 봅니다.";
  const close = `${title}에서는 ${closeBase.replace(/^월말에는\s*/, "월말마다 ")}`;
  return `${year} 유년에서 ${title}의 월별 흐름은 네 갈래로 나누어 봅니다. ${monthGroups} ${title}의 분기 점검은 ${quarterText}를 기준으로 삼습니다. ${close}`;
}

function buildZiweiTimingSignalText(seed = {}, timingMode = "", categoryIndex = 0, chapterIndex = 0, domain = "self", categoryTitle = "") {
  const decadeLuck = safeArray(seed?.chart?.decadeLuck);
  const annualLuck = safeArray(seed?.chart?.annualLuck);
  const currentDecade = decadeLuck.find((item) => item?.current || item?.isCurrent) || decadeLuck[0] || {};
  const currentAnnual = annualLuck.find((item) => item?.current || item?.isCurrent) || annualLuck[0] || {};
  const variant = chapterIndex + categoryIndex;
  const title = safeZiweiDisplayText(categoryTitle, "이 주제");
  const domainFocus = {
    money: "돈의 흐름과 책임의 순서",
    career: "일의 속도와 평판의 방향",
    relationship: "관계의 거리와 약속의 깊이",
    health: "몸의 회복력과 생활 리듬",
    foundation: "거처와 기반의 안정성",
    timing: "열어야 할 문과 기다려야 할 문",
    self: "결정의 중심과 실행의 호흡",
  }[domain] || "결정의 중심과 실행의 호흡";
  const domainObject = `${domainFocus}${koreanParticleEulReul(domainFocus)}`;
  const decadeText = ziweiLuckRowText(currentDecade, "현재 대한", variant);
  const annualText = ziweiLuckRowText(currentAnnual, "올해 유년", variant + 1);
  const decadeSequence = decadeLuck.slice(0, 4).map((row, index) => ziweiLuckRowText(row, "대한", variant + index)).filter(Boolean).join(" → ");
  const annualSequence = annualLuck.slice(0, 4).map((row, index) => ziweiLuckRowText(row, "유년", variant + index)).filter(Boolean).join(" → ");
  if (timingMode === "decade") return [
    `${title}에서 대한의 큰 물길은 ${decadeText}에서 시작됩니다. 이 10년 운은 ${domainObject} 장기 선택의 우선순위로 드러냅니다.`,
    `지금의 대한은 ${decadeText}로 읽습니다. ${title}에서는 오래 짊어질 책임과 내려놓을 책임을 ${domainFocus} 기준으로 가릅니다.`,
  ][variant % 2];
  if (timingMode === "annual") return `올해 유년의 초점은 ${annualText}입니다. ${buildZiweiAnnualRoadmapText(seed, categoryIndex, domain, categoryTitle)}`;
  if (timingMode === "lifetime") return `${title}의 생애 흐름은 ${decadeSequence || decadeText} 순서로 이어집니다. 절정기와 회복기는 한 번의 사건보다 반복되는 ${domainFocus}의 리듬으로 판단합니다.`;
  if (timingMode === "final") {
    const decadeMarker = `대한 ${decadeText}`;
    const annualMarker = `유년 ${annualText}`;
    return `${title}의 최종 판단은 ${decadeMarker}의 장기 흐름과 ${annualMarker}의 올해 반응을 함께 놓고 봅니다. ${title}에서는 장기 운과 올해 운이 만나는 지점에서 ${domainFocus}의 실제 우선순위가 정해집니다.`;
  }
  if (timingMode === "sihua") return `${title}의 사화 기준은 ${ziweiTransformationText(seed, {})}입니다. 화록·화권·화과·화기의 흐름을 ${domainFocus} 안에서 기회, 책임, 평판, 막힘으로 나누어 봅니다.`;
  const timingRows = [
    `${title}의 운 배경은 ${decadeText}입니다. 큰 운이 ${title}의 ${domainFocus} 중 어느 지점을 먼저 누르는지 살핍니다.`,
    `${title}에서 가까운 유년 반응은 ${annualText}입니다. 올해의 반응은 ${title}의 실행 속도와 조정 시점을 ${domainFocus} 쪽으로 좁혀 줍니다.`,
    `${title}의 대한 저류는 ${decadeText}의 흐름으로 이어집니다. 무리해서 여는 문보다 ${domainObject} 오래 지킬 문을 먼저 고릅니다.`,
    `${title}의 올해 체감 신호는 ${annualText}입니다. 작은 사건의 반복이 ${title} 안에서 ${domainFocus}의 실제 방향을 알려 줍니다.`,
    `${title}의 운 배경은 ${decadeText}와 ${annualText} 사이에서 잡습니다. ${title}에서는 장기 압력과 올해 반응을 분리해야 ${domainFocus}의 순서가 흐려지지 않습니다.`,
  ];
  return timingRows[variant % timingRows.length];
}

function resolveZiweiCategoryContext({ seed = {}, blueprint = {}, categoryTitle = "", chapterIndex = 0, categoryIndex = 0 } = {}) {
  const config = getZiweiCategoryContextConfig(blueprint, categoryIndex);
  const palaces = selectZiweiPalacesForCategory(seed, blueprint, categoryIndex, chapterIndex);
  const primaryPalace = palaces[0] || {};
  const palaceNames = uniqueZiweiTexts(palaces.map((palace) => palace?.nameKo || palace?.name || PALACE_LABELS[palace?.key]));
  const palaceKeys = uniqueZiweiTexts(palaces.map((palace) => palace?.key)).filter(Boolean);
  const mainStars = normalizeStarList(palaces.flatMap((palace) => palace?.mainStars || []));
  const auxStars = normalizeStarList(palaces.flatMap((palace) => palace?.auxStars || []));
  const maleficStars = normalizeStarList(palaces.flatMap((palace) => palace?.maleficStars || []));
  const primaryStar = mainStars[0] ? `${mainStars[0].name}${mainStars[0].strengthSymbol || ""}` : "중심 주성";
  const supportStar = auxStars[0] ? `${auxStars[0].name}${auxStars[0].strengthSymbol || ""}` : "보조성";
  const cautionStar = maleficStars[0] ? `${maleficStars[0].name}${maleficStars[0].strengthSymbol || ""}` : "긴장 신호";
  const focus = safeZiweiDisplayText(config.focus || categoryTitle, categoryTitle || "핵심 주제");
  const domain = getZiweiCategoryDomain(categoryTitle, focus);
  const palaceNamesText = palaceNames.length ? palaceNames.join("·") : safeZiweiDisplayText(primaryPalace?.nameKo || PALACE_LABELS[blueprint.palaceKey], "명궁");
  const palaceOverview = palaces.length ? palaces.map(ziweiPalaceBriefText).join(" / ") : `${palaceNamesText}의 세부 별 배치를 보수적으로 해석합니다`;
  const sihuaText = ziweiMultiPalaceTransformationText(seed, palaces);
  const timingText = buildZiweiTimingSignalText(seed, config.timingMode || "", categoryIndex, chapterIndex, domain, categoryTitle);
  const evidenceAnchors = [
    ...palaces.slice(0, 3).map((palace) => ({
      type: "palace",
      key: clean(palace?.key),
      name: safeZiweiDisplayText(palace?.nameKo || palace?.name, "해당 궁"),
      reason: `${focus}에서 확인하는 ${safeZiweiDisplayText(palace?.nameKo || palace?.name, "해당 궁")} 근거`,
    })),
    mainStars[0] ? { type: "star", name: primaryStar, reason: `${focus}의 중심 주성` } : null,
    { type: config.timingMode ? "timing" : "sihua", name: config.timingMode || sihuaText, reason: `${focus}의 운 흐름 보조 근거` },
  ].filter(Boolean);
  return {
    config,
    domain,
    focus,
    palaces,
    palaceKeys,
    palaceNames,
    palaceNamesText,
    primaryPalace,
    primaryStar,
    supportStar,
    cautionStar,
    mainStars,
    auxStars,
    maleficStars,
    mainStarsText: ziweiStarListText(mainStars, "주성의 힘이 고요하게 배치된 상태"),
    auxStarsText: ziweiStarListText(auxStars, "보조성이 주변의 도움을 천천히 모으는 상태"),
    maleficStarsText: ziweiStarListText(maleficStars, "살성이 강하지 않아 조율 여지가 큰 상태"),
    palaceOverview,
    sihuaText,
    timingText,
    evidenceAnchors,
  };
}

function buildZiweiAssembledCategoryText({ profile = {}, seed = {}, blueprint = {}, categoryTitle = "", chapterIndex = 0, categoryIndex = 0 } = {}) {
  const context = resolveZiweiCategoryContext({ seed, blueprint, categoryTitle, chapterIndex, categoryIndex });
  const profileName = safeZiweiDisplayText(profile?.name || seed?.localZiweiChartJson?.birthInput?.name, "고객");
  const chapterNo = chapterIndex + 1;
  const categoryNo = categoryIndex + 1;
  const guide = getZiweiCategoryCounselingGuide(categoryTitle, context);
  const reviewWindow = categoryIndex % 3 === 0 ? "7일" : categoryIndex % 3 === 1 ? "14일" : "30일";
  const starInsight = buildZiweiStarCounselingText(context.mainStars, categoryTitle, guide.intent, context);
  const supportPressureInsight = buildZiweiSupportPressureCounselingText(context.auxStars, context.maleficStars, categoryTitle, guide.intent);
  const boundaryText = buildZiweiCategoryBoundaryText(categoryTitle, context, guide);
  const resultCheckText = buildZiweiCategoryResultCheckText(categoryTitle, context, guide);
  const sihuaPhenomenonText = buildZiweiSihuaPhenomenonText(context.sihuaText, context.domain, categoryTitle, chapterIndex + categoryIndex);
  const palaceRelationText = buildZiweiPalaceRelationText(context, categoryTitle, chapterIndex + categoryIndex);
  const chapterVoiceText = buildZiweiChapterVoiceText(blueprint, context, categoryTitle, chapterIndex + categoryIndex);
  const fourteenStarsDigestText = blueprint.id === "04" ? buildZiweiFourteenStarsDigestText(context, categoryTitle, chapterIndex + categoryIndex) : "";
  const topicText = `${categoryTitle}${koreanParticleEunNeun(categoryTitle)}`;
  const intentText = `${guide.intent}${koreanParticleEulReul(guide.intent)}`;
  const profileContextText = buildZiweiProfileContextText(profile, seed, categoryIndex, chapterIndex, categoryTitle);
  const softenedReading = softenZiweiCounselingText(guide.reading, chapterIndex + categoryIndex);
  const softenedPractice = softenZiweiCounselingText(guide.practice, chapterIndex + categoryIndex + 1);
  const softenedCaution = softenZiweiCounselingText(guide.caution, chapterIndex + categoryIndex + 2);
  const [reviewLabelA, reviewLabelB, reviewLabelC] = buildZiweiReviewLabels(chapterIndex, categoryIndex);
  const domain = context.domain || getZiweiCategoryDomain(categoryTitle, guide.intent);
  const basisLead = [
    `${topicText} ${profileName}님의 ${context.palaceNamesText}${koreanParticleEulReul(context.palaceNamesText)} 먼저 세우고 봅니다.`,
    `${topicText} ${context.palaceNamesText}에 걸린 별빛으로 ${profileName}님의 선택 방향을 읽습니다.`,
    `${topicText} ${profileName}님 명반에서 ${context.palaceNamesText}${koreanParticleIga(context.palaceNamesText)} 어떻게 반응하는지 살피는 절입니다.`,
    `${topicText} ${context.palaceNamesText}의 기운이 생활 속에서 어디로 흐르는지 짚습니다.`,
    `${topicText} ${profileName}님에게 반복되는 선택의 결을 ${context.palaceNamesText}에서 꺼내 봅니다.`,
  ][(chapterIndex + categoryIndex) % 5];
  const intentBridge = [
    `이 절에서는 ${intentText} 중심에 두고 궁위, 주성, 보좌성, 살성의 압력을 함께 맞춥니다.`,
    `${guide.intent}${koreanParticleEunNeun(guide.intent)} 별의 강약과 운의 속도가 함께 맞을 때 비로소 정확해집니다.`,
    `상담의 초점은 ${intentText} 기준으로 길한 신호와 부담 신호를 분리하는 데 있습니다.`,
    `${guide.intent}${koreanParticleEunNeun(guide.intent)} 좋은 별 하나보다 궁과 운이 서로 응답하는 방식에서 더 선명해집니다.`,
    `여기서는 ${intentText} 실제 선택으로 옮길 수 있게 성요 근거를 좁혀 봅니다.`,
  ][(chapterIndex + (categoryIndex * 2)) % 5];
  const starLead = [
    `${categoryTitle}에서 ${ziweiWithParticle(context.primaryStar)} ${profileName}님의 첫 반응과 선택의 온도를 밝힙니다.`,
    `${ziweiWithParticle(context.primaryStar)} ${categoryTitle} 안에서 가장 먼저 깨어나는 중심 별입니다.`,
    `${categoryTitle}의 깊은 판단은 ${context.primaryStar}에서 출발해 주변 별의 도움과 압박으로 완성됩니다.`,
    `${profileName}님이 ${categoryTitle}${koreanParticleEulReul(categoryTitle)} 현실에서 다룰 때 ${ziweiWithParticle(context.primaryStar, "iga")} 방향타가 됩니다.`,
    `${categoryTitle}의 핵심 별은 ${context.primaryStar}이며, 이 별이 선택의 속도와 무게를 정합니다.`,
  ][(chapterIndex + categoryIndex) % 5];
  const strengthGuide = [
    `${categoryTitle}에서 ◎와 O는 이미 열린 문이고, ▲와 △는 조건을 갖춰야 살아나는 문이며, X는 회복과 절제를 요구하는 문입니다.`,
    `${categoryTitle}에서는 밝은 별을 바로 쓰되, 약한 별은 서두르지 말고 보완 순서를 세워야 합니다.`,
    `${categoryTitle}의 강한 신호는 밀고 나갈 곳을 알려 주고, 약한 신호는 멈춤과 조율의 자리를 알려 줍니다.`,
    `${categoryTitle}에서 별의 강약은 좋고 나쁨이 아니라 속도와 책임의 차이로 읽어야 합니다.`,
    `${categoryTitle}의 좋은 별은 성과의 문을 열고, 눌린 별은 같은 실수를 줄이라는 예언처럼 작용합니다.`,
  ][(chapterIndex + (categoryIndex * 3)) % 5];
  const cautionClose = [
    `${context.cautionStar}의 압박은 ${categoryTitle} 안에서 작게 쪼개고, ${context.palaceNamesText}의 길한 신호도 속도를 낮춰 검증합니다.`,
    `${categoryTitle}에서는 ${ziweiWithParticle(context.cautionStar)} 서두를수록 커지니, ${context.palaceNamesText}에서 먼저 확인 가능한 일부터 다룹니다.`,
    `${categoryTitle}에서 ${context.palaceNamesText}의 좋은 별이 보여도 ${context.cautionStar}의 경고가 반복되면 속도보다 순서를 먼저 바로잡습니다.`,
    `${categoryTitle}에서 ${ziweiWithParticle(context.cautionStar, "iga")} 건드리는 장면은 작게 나누어 보고, ${context.palaceNamesText}의 도움은 검증된 만큼만 씁니다.`,
    `${categoryTitle}에서는 ${context.palaceNamesText}의 길한 단서가 커질수록 ${context.cautionStar}의 압박도 함께 살펴 선택의 과열을 막습니다.`,
  ][(chapterIndex + categoryIndex) % 5];
  const actionReviewLine = [
    `${categoryTitle}은 ${reviewWindow}마다 결과를 다시 보고, 남은 변화와 사라진 부담을 따로 나누어 적습니다.`,
    `${categoryTitle}에서는 ${reviewWindow} 단위로 성과와 피로를 분리해 보고, 다음 행동 하나만 남깁니다.`,
    `${categoryTitle}은 ${reviewWindow} 뒤에 실제로 가벼워진 지점과 아직 무거운 지점을 따로 표시합니다.`,
    `${categoryTitle}에서는 ${reviewWindow}마다 선택의 결과, 사람의 반응, 몸의 피로를 한 줄씩 남깁니다.`,
    `${categoryTitle}은 ${reviewWindow} 간격으로 계획을 줄이고 남은 압박의 원인을 다시 짚습니다.`,
  ][(chapterIndex + categoryIndex) % 5];
  const reviewLead = [
    `${categoryTitle}은 ${reviewWindow} 뒤에 세 갈래로 다시 봅니다.`,
    `${categoryTitle}은 ${reviewWindow}이 지나면 운의 반응을 세 지점에서 확인합니다.`,
    `${categoryTitle}의 ${reviewWindow} 후 점검은 작게, 그러나 정확하게 진행합니다.`,
    `${categoryTitle}의 ${reviewWindow} 단위 복기는 이 절의 처방을 현실에 붙이는 의식입니다.`,
    `${categoryTitle}은 ${reviewWindow} 뒤에 기록보다 먼저 실제 변화의 촉감을 봅니다.`,
  ][(chapterIndex + categoryIndex) % 5];
  const evidenceLine = [
    `${chapterNo}장 ${categoryNo}절에서 먼저 볼 명반의 표지는 ${context.palaceOverview}입니다.`,
    `이 절의 실제 근거는 ${context.palaceOverview}에서 잡습니다.`,
    `${profileName}님 명반에서 이 카테고리를 여는 성요 배열은 ${context.palaceOverview}입니다.`,
    `상담의 현장은 ${context.palaceOverview}로 좁혀집니다.`,
    `이 절의 판단은 ${context.palaceOverview}라는 배치에서 출발합니다.`,
  ][(chapterIndex + categoryIndex) % 5];
  const sihuaLine = [
    `${categoryTitle}의 사화는 ${context.sihuaText}의 흐름으로 이어지며, 길한 문과 막히는 문을 함께 드러냅니다.`,
    `${context.sihuaText}이라는 배열은 ${categoryTitle} 안에서 기회와 부담의 순서를 알려 줍니다.`,
    `${categoryTitle}에서 사화의 흔적은 ${context.sihuaText}에 모여 있어, 받을 복과 감당할 책임을 나누어 보게 합니다.`,
    `${categoryTitle}에서는 ${context.sihuaText}의 배열이 사건의 속도를 조절하는 단서가 됩니다.`,
    `${categoryTitle}의 미세한 운 방향은 ${context.sihuaText}에서 읽히며, 같은 별이라도 어느 궁에서 움직이는지가 중요합니다.`,
  ][(chapterIndex + (categoryIndex * 2)) % 5];
  const cautionOpening = [
    `${categoryTitle}에서 가장 조심할 순간은 ${ziweiWithParticle(context.maleficStarsText, "iga")} 보내는 불편한 신호를 지나칠 때입니다.`,
    `${ziweiWithParticle(context.mainStarsText)} 장점이지만, ${categoryTitle}에서는 그 장점이 과해지는 순간을 경계해야 합니다.`,
    `${categoryTitle}의 그늘은 ${context.maleficStarsText}에서 먼저 올라오며, 이 신호는 두려움보다 조율의 요청에 가깝습니다.`,
    `${categoryTitle}에서는 ${context.palaceNamesText}의 별들이 좋아도 ${ziweiWithParticle(context.maleficStarsText, "iga")} 반복되면 선택의 순서를 다시 잡아야 합니다.`,
    `${categoryTitle}에서는 ${ziweiWithParticle(context.mainStarsText)} 밀어붙이는 힘과 ${ziweiWithParticle(context.maleficStarsText, "iga")} 만드는 제동을 함께 봅니다.`,
  ][(chapterIndex + categoryIndex) % 5];
  const meaningText = context.palaceNames
    .map((name, index) => {
      const meaning = safeZiweiDisplayText(PALACE_MEANINGS[name], "삶의 한 축");
      const variants = [
        `${categoryTitle}에서 ${name}${koreanParticleEunNeun(name)} ${meaning}${koreanParticleEulReul(meaning)} 비춥니다.`,
        `${categoryTitle}의 ${name}${koreanParticleEunNeun(name)} ${meaning}${koreanParticleIga(meaning)} 드러나는 자리입니다.`,
        `${categoryTitle}에서는 ${name}의 ${meaning}${koreanParticleIga(meaning)} 먼저 움직입니다.`,
        `${ziweiWithParticle(categoryTitle, "eulReul")} 볼 때 ${name}${koreanParticleEunNeun(name)} ${meaning}${koreanParticleEulReul(meaning)} 관장합니다.`,
        `${categoryTitle}에서 ${name}의 문은 ${meaning}${koreanParticleRo(meaning)} 열립니다.`,
      ];
      return variants[(chapterIndex + categoryIndex + index) % variants.length];
    })
    .join(" ");
  return [
    `핵심 근거\n${basisLead} ${meaningText} ${palaceRelationText} ${profileContextText} ${evidenceLine} ${sihuaLine} ${sihuaPhenomenonText} ${context.timingText} ${intentBridge} ${chapterVoiceText}`,
    `상담 해석\n${starLead} ${starInsight} ${supportPressureInsight} ${softenedReading} ${strengthGuide} ${fourteenStarsDigestText}`,
    `실행 전략\n1. ${softenedPractice}\n2. ${boundaryText}\n3. ${actionReviewLine}\n4. ${resultCheckText}`,
    `주의 흐름\n${cautionOpening} ${softenedCaution} ${cautionClose}`,
    `다음 점검\n${buildZiweiReviewCloseText({ profileName, chapterNo, categoryNo, categoryTitle, context, guide, resultCheckText, reviewLabelA, reviewLabelB, reviewLabelC, reviewLead, variant: chapterIndex + categoryIndex })}`,
  ].join("\n\n");
}

function buildZiweiConsultationDepthText({ context = {}, categoryTitle = "", chapterIndex = 0, categoryIndex = 0 } = {}) {
  const title = safeZiweiDisplayText(categoryTitle, "이 주제");
  const focus = safeZiweiDisplayText(context.focus, title);
  const palaceText = safeZiweiDisplayText(context.palaceNamesText, "명궁");
  const primaryStar = safeZiweiDisplayText(context.primaryStar, "중심 주성");
  const supportStar = safeZiweiDisplayText(context.supportStar, "보조성");
  const cautionStar = safeZiweiDisplayText(context.cautionStar, "긴장 신호");
  const sihuaText = safeZiweiDisplayText(context.sihuaText, "사화 흐름");
  const domainFocus = {
    money: "돈의 흐름과 책임의 순서",
    career: "일의 속도와 평판의 방향",
    relationship: "관계의 거리와 약속의 깊이",
    health: "몸의 회복력과 생활 리듬",
    foundation: "거처와 기반의 안정성",
    timing: "열어야 할 문과 기다려야 할 문",
    self: "결정의 중심과 실행의 호흡",
  }[context.domain] || "결정의 중심과 실행의 호흡";
  const domainObject = `${domainFocus}${koreanParticleEulReul(domainFocus)}`;
  const variants = [
    `${title} 상담에서는 ${palaceText}의 궁위가 먼저 여는 ${focus}${koreanParticleEulReul(focus)} 기준으로 ${primaryStar}${koreanParticleEunNeun(primaryStar)} 결단의 방식, ${supportStar}${koreanParticleEunNeun(supportStar)} 보조의 통로를 나누어 읽습니다. ${sihuaText}${koreanParticleEunNeun(sihuaText)} 결과가 빨리 드러나는 지점과 늦게 숙성되는 지점을 갈라 주므로, ${domainObject} 한 번에 밀어붙이기보다 운이 허락하는 순서대로 배치해야 합니다.`,
    `${title}의 핵심은 ${palaceText}에서 드러난 별의 강약을 단순한 장단점으로 보지 않는 데 있습니다. ${primaryStar}${koreanParticleEunNeun(primaryStar)} 앞에서 길을 열고 ${cautionStar}${koreanParticleEunNeun(cautionStar)} 무리한 속도를 경고하므로, ${sihuaText}의 흐름을 따라 ${domainFocus}를 안정권과 조정권으로 나누어야 합니다.`,
    `${title}에서는 ${palaceText}의 응답을 보아 마음이 먼저 움직이는 자리와 현실이 따라오는 자리를 구분합니다. ${primaryStar}${koreanParticleEunNeun(primaryStar)} 선택의 주도권을 만들고 ${supportStar}${koreanParticleEunNeun(supportStar)} 주변 조건을 붙들어 주지만, ${sihuaText}이 흔들리면 ${domainFocus}의 우선순위가 쉽게 뒤바뀔 수 있습니다.`,
    `${ziweiWithParticle(title, "eulReul")} 깊게 보면 ${palaceText}의 별들은 사건보다 반복되는 태도를 먼저 보여 줍니다. ${primaryStar}${koreanParticleEunNeun(primaryStar)} 크게 방향을 세우고 ${cautionStar}${koreanParticleEunNeun(cautionStar)} 피로와 과속을 알려 주므로, ${domainFocus}는 강하게 밀 시기와 조용히 다듬을 시기를 분리해야 합니다.`,
    `${title}의 상담 판단은 ${palaceText}, ${primaryStar}, ${sihuaText}을 함께 놓을 때 선명해집니다. 별은 욕망의 모양을, 궁은 삶의 무대를, 사화는 결과가 움직이는 통로를 말하므로 ${domainObject} 한 문장으로 단정하지 말고 실행·관계·회복의 차례로 풀어야 합니다.`,
  ];
  return variants[(chapterIndex * 5 + categoryIndex) % variants.length];
}

function ensureZiweiConsultationSectionDepthText(text = "", options = {}) {
  const output = String(text || "");
  const match = output.match(/(상담 해석\s*\n)([\s\S]*?)(\n\s*실행 전략\s*\n)/);
  if (!match) return output;
  const body = clean(match[2]);
  if (body.length >= 260) return output;
  const addition = buildZiweiConsultationDepthText(options);
  return output.replace(match[0], `${match[1]}${body} ${addition}\n\n${match[3]}`);
}

function dedupeZiweiRepeatedSentences(text = "") {
  return String(text || "").split(/\n\n+/).map((block) => {
    if (/^\s*실행 전략/.test(block)) return block;
    const seen = new Set();
    return block
      .split(/(?<=[.!?。！？])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => {
        const key = sentence.replace(/\s+/g, " ");
        if (!/[가-힣]/.test(key) || key.length < 18) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join(" ");
  }).join("\n\n");
}

function normalizeZiweiRepeatedStarMentions(text = "") {
  return String(text || "").replace(/([가-힣]{1,4}[◎O▲△X])(?:,\s*\1)+/g, "$1");
}

function ensureZiweiExpertSignalText(text = "", { context = {}, blueprint = {}, categoryTitle = "", chapterIndex = 0, categoryIndex = 0 } = {}) {
  let output = normalizeZiweiParticleArtifacts(text);
  const relationPattern = /삼방사정|대궁|궁위 간 응답|운한의 교차점|한 궁의 장점|명궁은 타고난 출발점|명궁을 타고난 출발점|재백궁과 관록궁|부부궁·자녀궁|질액궁은 몸의 경고|질액궁을 몸의 경고|천이궁은 밖으로 나가는 문|천이궁을 밖으로 나가는 문|노복궁과 형제궁/;
  const sihuaPattern = /화록은|화권은|화과는|화기는|사화 기준은|사화가 강하게 튀기보다/;
  const fourteenPattern = /14주성|활성 주성|보조 판단|빈자리/;
  const insertAfterBasis = (addition) => {
    const line = clean(addition);
    if (!line || output.includes(line)) return;
    if (/핵심 근거\s*/.test(output)) {
      output = output.replace(/핵심 근거\s*/, `핵심 근거\n${line} `);
    } else {
      output = `핵심 근거\n${line}\n\n${output}`;
    }
  };
  if (!relationPattern.test(output)) {
    insertAfterBasis(buildZiweiPalaceRelationText(context, categoryTitle, chapterIndex + categoryIndex));
  }
  if (!sihuaPattern.test(output)) {
    insertAfterBasis(buildZiweiSihuaPhenomenonText(context.sihuaText, context.domain, categoryTitle, chapterIndex + categoryIndex));
  }
  if (blueprint.id === "04" && !fourteenPattern.test(output)) {
    output = output.replace(/상담 해석\s*/, `상담 해석\n${buildZiweiFourteenStarsDigestText(context, categoryTitle, chapterIndex + categoryIndex)} `);
  }
  output = ensureZiweiConsultationSectionDepthText(output, { context, categoryTitle, chapterIndex, categoryIndex });
  output = dedupeZiweiRepeatedSentences(output);
  output = normalizeZiweiRepeatedStarMentions(output);
  return normalizeZiweiParticleArtifacts(output);
}

function ensureZiweiTimingContextText(text = "", timingMode = "", seed = {}, categoryIndex = 0) {
  let output = sanitizeCounselingText(text);
  const mode = clean(timingMode);
  const required = mode === "decade"
    ? ["대한", "10년"]
    : mode === "annual"
      ? ["유년", "올해"]
      : mode === "lifetime"
        ? ["생애"]
        : mode === "final"
          ? ["대한", "유년"]
          : mode === "sihua"
            ? ["사화"]
            : [];
  const missing = required.filter((token) => !output.includes(token));
  if (missing.length) {
    output += `\n\n운 흐름 보강\n${buildZiweiTimingSignalText(seed, mode, categoryIndex)}`;
  }
  return output;
}

function ensureZiweiCategoryDetailBlocks(text = "", categoryTitle = "핵심 주제") {
  let output = sanitizeCounselingText(text);
  const fallbacks = [
    ["핵심 근거", `${categoryTitle}의 기준은 해당 궁의 자리, 주성의 강약, 보조성과 살성의 균형, 사화의 이동을 함께 보는 데 있습니다.`],
    ["상담 해석", `${categoryTitle}에서는 한 가지 사건을 단정하기보다 지금 반복되는 선택 습관과 관계의 흐름을 차분히 읽어야 합니다.`],
    ["실행 전략", `${categoryTitle}에서는 이번 주에 바로 줄일 약속 하나, 유지할 루틴 하나, 기록할 판단 하나를 정해 움직이는 것이 좋습니다.`],
    ["주의 흐름", `${categoryTitle}의 주의점은 좋은 신호를 과신해 속도를 높이거나, 약한 신호를 두려워해 필요한 선택까지 미루는 데 있습니다.`],
    ["다음 점검", `${categoryTitle}에서는 일정 시간이 지난 뒤 결과, 피로도, 관계 반응을 다시 확인할 때 실제 상담 지도가 살아납니다.`],
  ];
  const labels = fallbacks.map(([label]) => label);
  for (let index = 0; index < fallbacks.length; index += 1) {
    const [label, body] = fallbacks[index];
    if (output.includes(label)) continue;
    const block = `\n\n${label}\n${body}\n\n`;
    const nextLabel = labels.slice(index + 1).find((item) => output.includes(item));
    if (nextLabel) {
      output = output.replace(nextLabel, `${block}${nextLabel}`);
    } else {
      output += block;
    }
  }
  return output;
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
  if (/(합니다|습니다|납니다|집니다)으로|유리하는 흐름|필요하는 흐름/.test(text)) issues.push("korean_sentence_artifact");
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
      if (/(합니다|습니다|납니다|집니다)으로|유리하는 흐름|필요하는 흐름/.test(text)) errors.push(`chapter_${index + 1}_category_${categoryIndex + 1}_sentence_artifact`);
      const evidenceSignals = ["궁", "사화", "주성", "보조성", "살성", "실천 기준", "◎", "O", "▲", "△", "X"];
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

function isZiweiStructuralDuplicateRow(row = "") {
  const text = clean(row).replace(/\s+/g, " ");
  if (!text) return true;
  if (["핵심 근거", "상담 해석", "실행 전략", "주의 흐름", "다음 점검"].includes(text)) return true;
  const structuralPatterns = [
    "주성, 보조성, 살성이 서로 다른 속도로 움직입니다",
    "한 별만 떼어 단정하는 방식이 아니라",
    "좋은 별을 과신하는 것이 아니라",
    "강한 별은 추진력으로 쓰고 약한 별은 복구 규칙으로 관리",
    "큰 결단보다 작은 기준을 반복해 운의 흐름",
    "확인, 휴식, 책임 분리의 순서",
    "좋은 별이 있어도 순서가 흐트러지면",
    "운을 겁주는 것이 아니라 선택의 무게",
    "한꺼번에 바꾸려 하지 말고 가장 흔들리는 한 지점",
  ];
  return structuralPatterns.some((pattern) => text.includes(pattern));
}

function computeDuplicateRate(chapters = []) {
  const source = chapters
    .flatMap((chapter) => (Array.isArray(chapter?.categories) ? chapter.categories : []))
    .map((item) => stripForbiddenTokens(item?.finalText || item?.text || ""))
    .join("\n\n");
  const paragraphs = source
    .split(/\n\s*\n+/)
    .map((row) => clean(row).replace(/\s+/g, " "))
    .filter((row) => row.length >= 80 && !isZiweiStructuralDuplicateRow(row));
  const sentences = source
    .split(/[.!?。！？]\s+/)
    .map((row) => clean(row).replace(/\s+/g, " "))
    .filter((row) => row.length >= 40 && !isZiweiStructuralDuplicateRow(row));
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
      forbiddenDeveloperTerms: ["JSON", "API", "schema", "payload", "debug", "engine"],
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
      consultationQuality: metadata?.consultationQuality && typeof metadata.consultationQuality === "object"
        ? metadata.consultationQuality
        : scoreZiweiConsultationQuality({ birthInput: seed?.localZiweiChartJson?.birthInput, seed, chapters }),
      manuscriptSource: clean(metadata?.manuscriptSource || metadata?.source),
      externalCallsAllowed: metadata?.externalCallsAllowed === true,
      fallbackAllowed: metadata?.fallbackAllowed === true,
      fallbackUsed: metadata?.fallbackUsed === true,
      generationMode: clean(metadata?.generationMode || ZIWEI_PDF_CONFIG.generationMode),
      provider: clean(metadata?.provider || ZIWEI_PDF_CONFIG.provider),
      writingPipeline: clean(metadata?.writingPipeline || ZIWEI_PDF_CONFIG.templateVersion),
      qualityTier: clean(metadata?.qualityTier || metadata?.llmAssembly?.qualityTier || "premium-llm-authored"),
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

function renderZiweiCategoryBody(text = "", categoryTitle = "핵심 주제") {
  const raw = ensureZiweiCategoryDetailBlocks(text, categoryTitle).replace(/\r\n/g, "\n").trim();
  const detailLabels = ["핵심 근거", "상담 해석", "실행 전략", "주의 흐름", "다음 점검"];
  const findLabelBoundary = (label, start = 0) => {
    let index = raw.indexOf(label, start);
    while (index >= 0) {
      const prev = raw[index - 1] || "";
      const next = raw[index + label.length] || "";
      if ((!prev || /\s/.test(prev)) && (!next || /\s/.test(next))) return index;
      index = raw.indexOf(label, index + label.length);
    }
    return -1;
  };
  let labelMatches = [];
  let cursor = 0;
  for (const label of detailLabels) {
    const index = findLabelBoundary(label, cursor);
    if (index < 0) break;
    labelMatches.push({ label, index, bodyStart: index + label.length });
    cursor = index + label.length;
  }
  if (labelMatches.length < detailLabels.length) {
    labelMatches = detailLabels
      .map((label) => {
        const index = findLabelBoundary(label, 0);
        return { label, index, bodyStart: index + label.length };
      })
      .filter((entry) => entry.index >= 0);
  }
  if (labelMatches.length < detailLabels.length) return `<p>${esc(raw)}</p>`;
  const sortedMatches = [...labelMatches].sort((a, b) => a.index - b.index);
  const sectionBodies = new Map();
  sortedMatches.forEach((entry, index) => {
    const next = sortedMatches[index + 1]?.index ?? raw.length;
    if (!sectionBodies.has(entry.label)) sectionBodies.set(entry.label, raw.slice(entry.bodyStart, next).trim());
  });
  return detailLabels.map((label) => {
    const body = sectionBodies.get(label) || "";
    const entry = { label };
    if (entry.label === "실행 전략") {
      const items = body
        .replace(/\s+/g, " ")
        .split(/\s+(?=\d+\.\s)/)
        .map((item) => item.replace(/^\d+\.\s*/, "").trim())
        .filter(Boolean);
      const list = items.length
        ? `<ol>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>`
        : `<p>${esc(body)}</p>`;
      return `<section class="zb-category-section zb-category-section--action"><h4>${esc(entry.label)}</h4>${list}</section>`;
    }
    const paragraphs = body
      .split(/(?<=[.!?。！？])\s+/)
      .reduce((groups, sentence) => {
        const last = groups[groups.length - 1] || "";
        if (!last || (last.length + sentence.length) > 420) groups.push(sentence);
        else groups[groups.length - 1] = `${last} ${sentence}`;
        return groups;
      }, [])
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    return `<section class="zb-category-section"><h4>${esc(entry.label)}</h4>${paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}</section>`;
  }).join("\n");
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
  const mainStarList = normalizeStarList(seed.chart.palaces.flatMap((p) => p.mainStars || []));
  const activeMajorStarNames = new Set(mainStarList.map((star) => clean(star.name)).filter(Boolean));
  const transformations = safeArray(seed.chart.transformations);
  const transformedStarNames = new Set(transformations.map((item) => clean(item?.star)).filter(Boolean));
  const allMajorStars = ["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];
  const majorStarMeanings = {
    자미: "큰 방향을 세우고 중심을 잡는 황제성입니다.",
    천기: "판을 읽고 흐름을 바꾸는 지략의 별입니다.",
    태양: "드러남, 명예, 보호하려는 책임을 말합니다.",
    무곡: "재정 감각과 실행력, 결산 능력을 봅니다.",
    천동: "회복, 감성, 생활의 편안함을 살핍니다.",
    염정: "욕망, 매력, 규칙과 유혹의 긴장을 드러냅니다.",
    천부: "축적, 관리, 보관하는 힘을 뜻합니다.",
    태음: "내면, 감수성, 재산과 안정 욕구를 봅니다.",
    탐랑: "확장, 사교성, 재능의 분산과 욕심을 읽습니다.",
    거문: "말, 의심, 논쟁과 설득의 힘을 뜻합니다.",
    천상: "중재, 품위, 관계의 균형을 잡는 별입니다.",
    천량: "보호, 원칙, 어른의 기운과 회복력을 봅니다.",
    칠살: "돌파, 결단, 위험을 감수하는 변화를 뜻합니다.",
    파군: "낡은 틀을 깨고 새 구조를 여는 별입니다.",
  };
  const starMatrixRows = allMajorStars.map((star) => {
    const status = activeMajorStarNames.has(star) ? "활성 주성" : transformedStarNames.has(star) ? "보조 판단" : "빈자리";
    const statusClass = status === "활성 주성" ? "zb-star-status--active" : status === "보조 판단" ? "zb-star-status--support" : "zb-star-status--empty";
    const note = status === "활성 주성"
      ? `${majorStarMeanings[star]} 이번 명반에서는 직접 행동과 판단의 전면에 섭니다.`
      : status === "보조 판단"
        ? `${majorStarMeanings[star]} 사화나 보조 흐름에서 사건의 방향을 보정합니다.`
        : `${majorStarMeanings[star]} 이번 요약에서는 ${star}의 빈자리로 읽어 과한 단정을 피하고 주변 궁의 응답으로 보완합니다.`;
    return `<tr><td>${esc(star)}</td><td><span class="zb-star-status ${statusClass}">${esc(status)}</span></td><td>${esc(note)}</td></tr>`;
  }).join("\n");
  const currentDecade = safeArray(seed.chart.decadeLuck).find((item) => item?.current || item?.isCurrent) || safeArray(seed.chart.decadeLuck)[0] || {};
  const currentAnnual = safeArray(seed.chart.annualLuck).find((item) => item?.current || item?.isCurrent) || safeArray(seed.chart.annualLuck)[0] || {};
  const mingGongText = safeZiweiDisplayText(seed.chart.mingGong, "확인 범위 내");
  const shenGongText = safeZiweiDisplayText(seed.chart.shenGong, "확인 범위 내");
  const mingGongPhrase = mingGongText === "확인 범위 내" ? mingGongText : `${mingGongText}궁`;
  const shenGongPhrase = shenGongText === "확인 범위 내" ? shenGongText : `${shenGongText}궁`;
  const strongStarText = mainStarList.slice(0, 3).map((star) => `${safeZiweiDisplayText(star.name, "주성")}${safeZiweiDisplayText(star.strengthSymbol, "")}`).join(" · ") || "주성 확인 범위 내";
  const transformationText = transformations.slice(0, 4).map((item) => `${safeZiweiDisplayText(item?.star, "별")} ${safeZiweiDisplayText(item?.type || item?.label, "사화")}`).join(" · ") || "사화 흐름은 기본 루틴을 우선합니다";
  const coreTakeawayRows = [
    `명궁은 ${mingGongPhrase}에 놓여 타고난 판단의 출발점을 만들고, 신궁은 ${shenGongPhrase}에서 실제 삶에 반복되는 행동의 방향을 드러냅니다.`,
    `핵심 주성은 ${strongStarText}입니다. 이 별들은 장점만이 아니라 고객이 힘을 쓰는 방식과 피로가 쌓이는 지점을 함께 보여 줍니다.`,
    `사화 흐름은 ${transformationText}로 잡습니다. 화록은 열리는 길, 화권은 책임, 화과는 평판, 화기는 막힘과 집착의 자리를 드러냅니다.`,
    `현재 운한은 ${ziweiLuckRowText(currentDecade, "현재 대한", 0)}과 ${ziweiLuckRowText(currentAnnual, "올해 유년", 1)}의 교차로 읽습니다. 장기 운과 올해 반응을 분리해야 실행 순서가 정확해집니다.`,
    `아래 15장 상담은 같은 문장을 반복하는 요약이 아니라, 각 궁과 카테고리마다 별·궁위·사화·운한을 별도로 풀어낸 실전 판단입니다.`,
  ].map((item) => `<li>${esc(item)}</li>`).join("\n");
  const chapterHtml = chapters.map((chapter, index) => {
    const summaryHtml = clean(chapter.summary) ? `<p class="zb-summary">${esc(chapter.summary)}</p>` : "";
    const categoryHtml = chapter.categories.map((category) => `<section class="zb-category"><h3>${esc(category.title)}</h3><div class="zb-category-body">${renderZiweiCategoryBody(category.finalText, category.title)}</div></section>`).join("\n");
    const adviceHtml = "";
    const cautionHtml = "";
    const transitionHtml = "";
    return `<article class="zb-chapter"><div class="zb-eyebrow">${esc(chapter.roman)} · 제 ${index + 1}장</div><h2>${esc(toKoreanChapterTitle(chapter.title, index))}</h2>${summaryHtml}${categoryHtml}${adviceHtml}${cautionHtml}${transitionHtml}</article>`;
  }).join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>자미두수 프리미엄 리포트</title>
  <style>
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;font-family:"Noto Serif KR","Malgun Gothic",serif;background:#100821;color:#f8f4ff;line-height:1.82;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{max-width:980px;margin:0 auto;padding:28px 20px 64px}.cover{position:relative;overflow:hidden;min-height:92vh;padding:42px 34px;border-radius:24px;background:radial-gradient(circle at 72% 12%,rgba(250,204,21,.25),transparent 26%),linear-gradient(145deg,#160729 0%,#30125f 48%,#091b3a 100%);box-shadow:0 24px 60px rgba(0,0,0,.32);display:flex;flex-direction:column;justify-content:center}.cover::after{content:"";position:absolute;inset:24px;border:1px solid rgba(250,204,21,.28);border-radius:20px;pointer-events:none}.cover img{position:relative;z-index:1;width:min(320px,82%);border-radius:18px;margin:24px 0 0;box-shadow:0 18px 42px rgba(0,0,0,.34);background:#271146}.cover h1{position:relative;z-index:1;margin:8px 0 8px;font-size:44px;line-height:1.12;color:#fff7d6}.cover p{position:relative;z-index:1;margin:4px 0;color:#d8ccff}.badge{letter-spacing:.22em;text-transform:uppercase;color:#facc15;font-size:12px}.panel,.toc,.zb-chapter,.legend{margin-top:20px;padding:20px;border:1px solid rgba(216,180,254,.28);border-radius:18px;background:rgba(255,255,255,.08);box-shadow:0 14px 30px rgba(0,0,0,.16)}.panel h2,.toc h2,.legend h2{margin:0 0 12px;color:#fde68a}.meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.meta-item{padding:12px;border-radius:14px;background:rgba(16,8,33,.52);border:1px solid rgba(250,204,21,.2)}.meta-item b{display:block;color:#facc15}.legend-list{display:flex;flex-wrap:wrap;gap:8px}.legend-list span{padding:6px 10px;border-radius:999px;background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.26)}.signal-tags{display:flex;flex-wrap:wrap;gap:8px}.signal-tags span{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:rgba(16,8,33,.52);border:1px solid rgba(216,180,254,.34);font-size:13px}.palace-table{width:100%;border-collapse:collapse;font-size:13px}.palace-table td,.palace-table th{border-bottom:1px solid rgba(255,255,255,.12);padding:8px;text-align:left;vertical-align:top}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.toc ol{margin:0;padding-left:20px}.toc li{margin:8px 0}.toc span{display:inline-block;min-width:44px;color:#facc15}.zb-chapter{break-inside:auto;page-break-inside:auto;background:#fbf7ff;color:#241333;orphans:3;widows:3}.zb-eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#7c3aed;font-size:12px}.zb-chapter h2{margin:8px 0 18px;color:#2e1065;font-size:26px}.zb-summary{margin:0 0 12px;padding:10px 12px;border-radius:12px;background:#f5edff;color:#432178;font-weight:600}.zb-category{padding:14px 16px;margin:12px 0;border-radius:14px;background:#fff;border:1px solid #e9d5ff;break-inside:avoid;page-break-inside:avoid}.zb-category h3{margin:0 0 8px;color:#5b21b6;font-size:18px}.zb-category p{margin:0;color:#2f2440}.zb-chapter-tail{margin-top:10px;padding:12px;border-radius:12px;background:#f7f3ff;border:1px solid #ddd6fe;break-inside:avoid;page-break-inside:avoid}.zb-chapter-tail h3{margin:0 0 6px;color:#4c1d95;font-size:15px}.zb-chapter-tail p{margin:0;white-space:pre-wrap;color:#2f2440}.footer{margin-top:22px;text-align:center;color:#c4b5fd;font-size:13px}@page{size:A4;margin:16mm 14mm 18mm}@media print{body{background:#fff}.page{padding:0}.cover,.panel,.toc,.legend,.zb-chapter{box-shadow:none}.cover{border-radius:0}.zb-chapter{break-before:page;page-break-before:always}.zb-chapter:first-of-type{break-before:auto;page-break-before:auto}}@media(max-width:720px){.cover h1{font-size:32px}.meta-grid{grid-template-columns:1fr}.page{padding:14px 10px 40px}}
    .zb-category-body{display:grid;gap:10px}.zb-category-section{padding:10px 12px;border-radius:12px;background:#faf5ff;border:1px solid #ede9fe;break-inside:avoid;page-break-inside:avoid;orphans:3;widows:3}.zb-category-section h4{margin:0 0 6px;color:#6d28d9;font-size:14px;letter-spacing:.02em}.zb-category-section p,.zb-category-body>p{margin:0;color:#2f2440}.zb-category-section p+p{margin-top:8px}.zb-category-section ol{margin:0;padding-left:21px;color:#2f2440}.zb-category-section li{margin:5px 0;padding-left:2px;break-inside:avoid;page-break-inside:avoid}.zb-category-section--action{background:#fffdf4;border-color:#fde68a}.zb-executive-summary ol{margin:0;padding-left:22px}.zb-executive-summary li{margin:8px 0}.zb-star-status{display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;font-size:12px;font-weight:700}.zb-star-status--active{background:#fef3c7;color:#78350f}.zb-star-status--support{background:#ede9fe;color:#4c1d95}.zb-star-status--empty{background:#f1f5f9;color:#334155}
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
    <section class="panel zb-executive-summary"><h2>핵심 결론 5개</h2><ol>${coreTakeawayRows}</ol></section>
    <section class="legend"><h2>별 강도 기호</h2><div class="legend-list"><span>◎ 묘: 가장 강하게 드러나는 별</span><span>O 득: 안정적으로 힘을 얻은 별</span><span>▲ 리: 이롭게 활용할 수 있는 별</span><span>△ 평: 균형 관리가 필요한 별</span><span>X 함·실: 보완과 주의가 필요한 별</span></div></section>
    <section class="panel"><h2>핵심 강점 별</h2><div class="signal-tags">${strongStars || "<span>데이터 확인 중</span>"}</div></section>
    <section class="panel"><h2>주의 관리 별</h2><div class="signal-tags">${cautionStars || "<span>데이터 확인 중</span>"}</div></section>
    <section class="panel"><h2>사화 핵심 요약</h2><table class="palace-table"><thead><tr><th>별</th><th>사화</th><th>의미</th></tr></thead><tbody>${sihuaRows || "<tr><td colspan=\"3\">사화 신호가 약해 기본 루틴 운용을 우선합니다.</td></tr>"}</tbody></table></section>
    <section class="panel"><h2>14주성 매트릭스</h2><p>활성 주성은 직접 드러난 힘, 보조 판단은 사화와 주변 궁의 응답, 빈자리는 과한 단정을 피해야 할 자리로 읽습니다.</p><table class="palace-table zb-star-matrix"><thead><tr><th>주성</th><th>판정</th><th>상담 의미</th></tr></thead><tbody>${starMatrixRows}</tbody></table></section>
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
    "X-CD-PDF-Renderer": "native-text-v1",
  };
}

function stripZiweiPdfHtmlText(html) {
  const source = String(html || "");
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|h[1-6]|li|tr|table|main|header|footer)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => {
      const codePoint = parseInt(hex, 16);
      try { return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : " "; } catch (_) { return " "; }
    })
    .replace(/&#(\d+);/g, (_match, raw) => {
      const codePoint = parseInt(raw, 10);
      try { return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : " "; } catch (_) { return " "; }
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'");
}

function ziweiPdfPlainText(value) {
  return stripZiweiPdfHtmlText(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ziweiPdfUnits(value) {
  return Array.from(String(value || "")).reduce((sum, char) => {
    const codePoint = char.codePointAt(0) || 0;
    if (/\s/.test(char)) return sum + 0.35;
    if (codePoint <= 0x007f) return sum + 0.58;
    if (codePoint <= 0x024f) return sum + 0.72;
    return sum + 1;
  }, 0);
}

function wrapZiweiPdfText(value, maxUnits = 58) {
  const plain = ziweiPdfPlainText(value);
  if (!plain) return [];
  const lines = [];
  const paragraphs = plain.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  for (const paragraph of paragraphs) {
    let line = "";
    let lineUnits = 0;
    const tokens = paragraph.split(/(\s+)/).filter(Boolean);
    for (const token of tokens) {
      const tokenUnits = ziweiPdfUnits(token);
      if (line && lineUnits + tokenUnits > maxUnits) {
        lines.push(line.trim());
        line = "";
        lineUnits = 0;
      }
      if (tokenUnits > maxUnits) {
        for (const char of Array.from(token)) {
          const charUnits = ziweiPdfUnits(char);
          if (line && lineUnits + charUnits > maxUnits) {
            lines.push(line.trim());
            line = "";
            lineUnits = 0;
          }
          line += char;
          lineUnits += charUnits;
        }
      } else {
        line += token;
        lineUnits += tokenUnits;
      }
    }
    if (line.trim()) lines.push(line.trim());
    lines.push("");
  }
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines;
}

function ziweiPdfHex(value) {
  let hex = "";
  for (const char of Array.from(String(value || ""))) {
    let codePoint = char.codePointAt(0) || 0x20;
    if (codePoint > 0xffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) codePoint = 0x25a1;
    if (codePoint < 0x20 && codePoint !== 0x09) codePoint = 0x20;
    hex += codePoint.toString(16).toUpperCase().padStart(4, "0");
  }
  return hex || "0020";
}

function ziweiPdfLineOp(text, x, y, size, color = "0.12 0.09 0.18") {
  return `${color} rg BT /F1 ${Number(size).toFixed(2)} Tf 1 0 0 1 ${Number(x).toFixed(2)} ${Number(y).toFixed(2)} Tm <${ziweiPdfHex(text)}> Tj ET\n`;
}

function buildZiweiNativePdfBytes(html, filename = "") {
  const encoder = new TextEncoder();
  const width = 595.28;
  const height = 841.89;
  const marginX = 52;
  const title = ziweiPdfPlainText(String(filename || "").replace(/\.pdf$/i, "")) || "자미두수 프리미엄 리포트";
  const lines = wrapZiweiPdfText(html, 58);
  const pages = [];

  function basePage() {
    let ops = "";
    ops += "0.985 0.978 1 rg 0 0 595.28 841.89 re f\n";
    ops += "0.155 0.09 0.29 rg 0 801.89 595.28 40 re f\n";
    ops += ziweiPdfLineOp("ZIWEI DESTINY BOOK", marginX, 818, 9, "0.88 0.82 1");
    ops += ziweiPdfLineOp(title, marginX, 785, 13, "0.20 0.11 0.34");
    ops += "0.82 0.78 0.90 RG 0.8 w 52 769 m 543 769 l S\n";
    return ops;
  }

  function finishPage(ops, pageNo) {
    let next = ops;
    next += "0.82 0.78 0.90 RG 0.6 w 52 42 m 543 42 l S\n";
    next += ziweiPdfLineOp(`${pageNo}`, 526, 24, 8, "0.46 0.40 0.55");
    return next;
  }

  let ops = basePage();
  let y = 742;
  const sourceLines = lines.length ? lines : [title];
  for (const line of sourceLines) {
    if (!line) {
      y -= 7;
      continue;
    }
    if (y < 72) {
      pages.push(ops);
      ops = basePage();
      y = 742;
    }
    ops += ziweiPdfLineOp(line, marginX, y, 9.8, "0.13 0.10 0.18");
    y -= 15.2;
  }
  pages.push(ops);

  const finalizedPages = pages.map((pageOps, index) => finishPage(pageOps, index + 1));
  const objects = [null];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  objects.push("<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HYGoThic-Medium /CIDSystemInfo << /Registry (Adobe) /Ordering (Korea1) /Supplement 2 >> >>");
  objects.push("<< /Type /Font /Subtype /Type0 /BaseFont /HYGoThic-Medium /Encoding /UniKS-UCS2-H /DescendantFonts [3 0 R] >>");
  const pageIds = [];
  for (const pageOps of finalizedPages) {
    const contentId = objects.length;
    objects.push(`<< /Length ${encoder.encode(pageOps).length} >>\nstream\n${pageOps}endstream`);
    const pageId = objects.length;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.7\n%\u00E2\u00E3\u00CF\u00D3\n";
  const offsets = [];
  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = encoder.encode(pdf).length;
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return encoder.encode(pdf);
}

function normalizeArchiveShapeFromExecution(doc = {}) {
  const metadata = safeObject(doc?.metadata);
  const archive = safeObject(metadata?.archive || metadata?.resultArchive || {});
  const payload = safeObject(archive?.payload || metadata?.payload || {});
  const profile = safeObject(payload?.profile || archive?.profile || {});
  const seed = safeObject(payload?.seed || archive?.seed || {});
  const chapters = safeArray(archive?.chapters || payload?.chapters || []);
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
    pdfReady.html = clean(archive?.html || payload?.html || "");
  }
  const completionValidation = validateZiweiLlmPdfCompletionPayload({ pdfReady, chapters, requireDownloadUrl: true });
  const canDownload = completionValidation.ok
    && Boolean(clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl))
    && Array.isArray(chapters)
    && chapters.length >= CHAPTER_BLUEPRINTS.length;
  const ziweiPdfProgress = normalizeZiweiProgress(metadata?.ziweiPdfProgress, {
    status: canDownload ? "completed" : "generating",
    completedChapters: canDownload ? CHAPTER_BLUEPRINTS.length : chapters.length,
    reportId,
    sessionId,
  });
  return {
    ok: true,
    serviceKey: ZIWEI_SERVICE_KEY,
    reportId,
    sessionId,
    totalChapters: ziweiPdfProgress.totalChapters,
    completedChapters: ziweiPdfProgress.completedChapters,
    currentChapterNumber: ziweiPdfProgress.currentChapterNumber,
    currentChapterTitle: ziweiPdfProgress.currentChapterTitle,
    currentCategory: ziweiPdfProgress.currentCategory,
    currentStepMessage: ziweiPdfProgress.currentStepMessage,
    ziweiPdfProgress,
    chapterCount: CHAPTER_BLUEPRINTS.length,
    chapters,
    qualityStatus: completionValidation.ok ? "passed" : "validation_failed",
    payload: payload,
    ziweiPayload: payload,
    ziweiMasterJson: archive?.ziweiMasterJson || payload?.ziweiMasterJson || null,
    masterJsonValidation: archive?.masterJsonValidation || payload?.masterJsonValidation || null,
    diagnostics: {
      ...(safeObject(archive?.diagnostics || payload?.metadata?.diagnostics || null)),
      pdfCompletion: completionValidation,
    },
    pdfReady,
    downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl),
    pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl),
    storedUrl: clean(pdfReady?.storedUrl || pdfReady?.pdfUrl || pdfReady?.downloadUrl),
    reportUrl: clean(pdfReady?.reportUrl || pdfReady?.pdfUrl || pdfReady?.downloadUrl),
    htmlUrl: clean(pdfReady?.htmlUrl),
    directDownloadUrl: clean(pdfReady?.directDownloadUrl),
    canReopen: true,
    canDownload,
  };
}

function clampZiweiChapterCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(CHAPTER_BLUEPRINTS.length, Math.trunc(n)));
}

function normalizeZiweiProgressStatus(value, fallback = "generating") {
  const status = clean(value || fallback).toLowerCase();
  if (status === "processing" || status === "queued" || status === "running") return "generating";
  if (["generating", "rendering", "uploading", "completed", "failed"].includes(status)) return status;
  return fallback;
}

function getZiweiProgressMessage(progress = {}) {
  const status = normalizeZiweiProgressStatus(progress.status);
  const completed = clampZiweiChapterCount(progress.completedChapters);
  const current = Math.max(1, Math.min(CHAPTER_BLUEPRINTS.length, Number(progress.currentChapterNumber) || completed + 1));
  if (status === "rendering") return "PDF 원고를 조판하고 있습니다.";
  if (status === "uploading") return "PDF를 저장하고 있습니다.";
  if (status === "completed") return "PDF 저장이 완료되었습니다.";
  if (status === "failed") return "자미두수 상담문 생성이 중단되었습니다.";
  if (current === 6) return "재백궁과 관록궁 흐름을 분석하고 있습니다.";
  if (completed <= 0) return "자미두수 명반을 정리하고 있습니다.";
  return `${current}챕터 상담문을 생성하고 있습니다.`;
}

function normalizeZiweiProgress(progress = {}, fallback = {}) {
  const source = safeObject(progress);
  const fallbackSource = safeObject(fallback);
  const completedChapters = clampZiweiChapterCount(
    source.completedChapters
    ?? source.chapterCount
    ?? fallbackSource.completedChapters
    ?? fallbackSource.chapterCount
    ?? 0,
  );
  const status = normalizeZiweiProgressStatus(source.status || fallbackSource.status, "generating");
  const currentChapterNumber = Math.max(1, Math.min(
    CHAPTER_BLUEPRINTS.length,
    Number(source.currentChapterNumber || fallbackSource.currentChapterNumber || (completedChapters >= CHAPTER_BLUEPRINTS.length ? CHAPTER_BLUEPRINTS.length : completedChapters + 1)) || 1,
  ));
  const blueprint = CHAPTER_BLUEPRINTS[currentChapterNumber - 1] || CHAPTER_BLUEPRINTS[0] || {};
  const currentCategory = clean(
    source.currentCategory
    || fallbackSource.currentCategory
    || safeArray(blueprint.categories)[0]
    || "",
  );
  const next = {
    totalChapters: CHAPTER_BLUEPRINTS.length,
    completedChapters,
    currentChapterNumber,
    currentChapterTitle: clean(source.currentChapterTitle || fallbackSource.currentChapterTitle || blueprint.title || ""),
    currentCategory,
    currentStepMessage: clean(source.currentStepMessage || fallbackSource.currentStepMessage || ""),
    status,
    errorMessage: clean(source.errorMessage || fallbackSource.errorMessage || ""),
    startedAt: clean(source.startedAt || fallbackSource.startedAt || new Date().toISOString()),
    updatedAt: clean(source.updatedAt || fallbackSource.updatedAt || new Date().toISOString()),
  };
  if (!next.currentStepMessage) next.currentStepMessage = getZiweiProgressMessage(next);
  return next;
}

function buildZiweiProgressResponse(progress = {}, extras = {}) {
  const normalized = normalizeZiweiProgress(progress, extras);
  const failed = normalized.status === "failed";
  return {
    ok: normalized.status === "completed",
    accepted: normalized.status !== "completed",
    serviceKey: ZIWEI_SERVICE_KEY,
    code: failed ? clean(extras.code || "ZIWEI_PREMIUM_GENERATION_FAILED") : "ZIWEI_PROCESSING",
    status: normalized.status,
    serverStatus: normalized.status,
    retryable: normalized.status !== "completed",
    retryAfterMs: Number(extras.retryAfterMs || ZIWEI_PROGRESS_POLL_MS),
    pollAfterMs: Number(extras.pollAfterMs || ZIWEI_PROGRESS_POLL_MS),
    reportId: clean(extras.reportId || normalized.reportId || ""),
    sessionId: clean(extras.sessionId || normalized.sessionId || ""),
    birthHash: clean(extras.birthHash || ""),
    qualityStatus: failed ? "failed" : "processing",
    errorMessage: clean(normalized.errorMessage || extras.errorMessage || ""),
    message: clean(normalized.currentStepMessage || extras.message || ""),
    totalChapters: normalized.totalChapters,
    completedChapters: normalized.completedChapters,
    currentChapterNumber: normalized.currentChapterNumber,
    currentChapterTitle: normalized.currentChapterTitle,
    currentCategory: normalized.currentCategory,
    currentStepMessage: normalized.currentStepMessage,
    llmDraftChapterCount: clampZiweiChapterCount(extras.llmDraftChapterCount ?? normalized.completedChapters),
    chapterCount: normalized.totalChapters,
    ziweiPdfProgress: normalized,
  };
}

function initialZiweiProgress(extra = {}) {
  return normalizeZiweiProgress({
    status: "generating",
    completedChapters: 0,
    currentChapterNumber: 1,
    currentChapterTitle: CHAPTER_BLUEPRINTS[0]?.title || "",
    currentCategory: safeArray(CHAPTER_BLUEPRINTS[0]?.categories)[0] || "",
    currentStepMessage: "자미두수 명반을 정리하고 있습니다.",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...safeObject(extra),
  });
}

function getZiweiProgressFromDoc(doc = {}, fallback = {}) {
  return normalizeZiweiProgress(safeObject(doc?.metadata)?.ziweiPdfProgress, {
    ...safeObject(fallback),
    completedChapters: safeArray(safeObject(doc?.metadata)?.ziweiDraftChapters).length || fallback.completedChapters || 0,
  });
}

function getZiweiDraftChaptersFromDoc(doc = {}) {
  const metadata = safeObject(doc?.metadata);
  return safeArray(metadata?.ziweiDraftChapters).filter((chapter) => chapter && typeof chapter === "object");
}

function getZiweiAccessToken(request, body = {}) {
  return clean(
    request.headers.get("x-premium-access-token")
    || request.headers.get("x-ziwei-job-token")
    || request.headers.get("x-job-token")
    || body?.jobToken
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || body?.accessToken
    || cookieValue(request, "cd_premium_access")
    || "",
  );
}

function buildZiweiAIAuthFromPremiumToken(tokenPayload = {}) {
  const userId = clean(tokenPayload.userId || tokenPayload.sub);
  if (!userId) return null;
  return {
    userId,
    email: clean(tokenPayload.email),
    role: clean(tokenPayload.role) || "user",
    name: clean(tokenPayload.name),
    image: "",
    birthDate: "",
    birthTime: "",
    gender: "OTHER",
    points: 0,
    joinedAt: null,
  };
}

async function resolveZiweiAIConsultationAuth(request, env, body = {}) {
  try {
    const auth = await requireAuth(request, env);
    return { ok: true, auth, authSource: "login", tokenVerified: false };
  } catch (error) {
    if (Number(error?.status) !== 401) throw error;
  }

  const premiumAccessToken = getZiweiAccessToken(request, body);
  if (!premiumAccessToken) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "자미두수 AI 상담을 위해 먼저 로그인해 주세요.",
    };
  }

  const verified = await verifyPremiumAccessToken(premiumAccessToken, env, { reportType: "ziweiPremium" });
  if (!verified?.ok) {
    const expired = clean(verified?.code) === "PREMIUM_ACCESS_TOKEN_EXPIRED";
    return {
      ok: false,
      status: 402,
      code: expired ? "ZIWEI_AI_SESSION_TOKEN_EXPIRED" : "ZIWEI_AI_SESSION_TOKEN_INVALID",
      message: expired
        ? "결제된 자미두수 AI 상담 세션이 만료되었습니다. 결제 후 다시 이어가 주세요."
        : "결제된 자미두수 AI 상담 세션을 확인하지 못했습니다. 결제 후 다시 이어가 주세요.",
    };
  }

  const auth = buildZiweiAIAuthFromPremiumToken(verified.payload);
  if (!auth) {
    return {
      ok: false,
      status: 402,
      code: "ZIWEI_AI_SESSION_TOKEN_INVALID",
      message: "결제된 자미두수 AI 상담 세션을 확인하지 못했습니다. 결제 후 다시 이어가 주세요.",
    };
  }

  return {
    ok: true,
    auth,
    authSource: "premiumAccessToken",
    tokenVerified: true,
    tokenPayload: verified.payload || {},
  };
}

function invalidZiweiAuthorizationResponse(status = 403, details = {}) {
  return json({
    ok: false,
    serviceKey: ZIWEI_SERVICE_KEY,
    code: "invalid_authorization",
    status: "failed",
    serverStatus: "failed",
    retryable: false,
    reportId: clean(details.reportId || ""),
    sessionId: clean(details.sessionId || ""),
    errorMessage: "생성 권한이 확인되지 않아 요청을 중단했습니다.",
    message: "생성 권한이 확인되지 않아 요청을 중단했습니다.",
  }, { status: status === 401 ? 401 : 403 });
}

async function findZiweiExecution(env, userId, keys = {}) {
  const clauses = [];
  const reportId = clean(keys.reportId || "");
  const sessionId = clean(keys.sessionId || "");
  const executionKey = clean(keys.executionKey || "");
  if (executionKey) clauses.push({ executionKey });
  if (reportId) clauses.push({ reportId });
  if (sessionId) clauses.push({ sessionId });
  if (!clauses.length) return null;
  await connectDb(env);
  return ServiceExecutionTransaction.findOne({
    userId,
    reportType: "ziweiPremium",
    $or: clauses,
  }).sort({ updatedAt: -1, createdAt: -1 }).lean();
}

async function findCompletedZiweiReport(env, userId, keys = {}) {
  const doc = await findZiweiExecution(env, userId, keys);
  if (!doc || clean(doc.status) !== "success" || clean(doc.premiumStatus) !== "completed") return null;
  const normalized = normalizeArchiveShapeFromExecution(doc);
  if (!normalized.canDownload || safeArray(normalized.chapters).length < CHAPTER_BLUEPRINTS.length) return null;
  if (clean(normalized.reportId)) REPORT_CACHE.set(clean(normalized.reportId), normalized);
  return normalized;
}

async function persistZiweiPdfProgress(env, userId, options = {}) {
  const executionCtx = safeObject(options.executionCtx);
  const reportId = clean(options.reportId || executionCtx.reportId || "");
  const sessionId = clean(options.sessionId || executionCtx.sessionId || "");
  const draftChapters = safeArray(options.draftChapters);
  const progress = normalizeZiweiProgress(options.progress, {
    completedChapters: draftChapters.length,
    reportId,
    sessionId,
  });
  progress.updatedAt = new Date().toISOString();
  const lockStatus = progress.status === "failed"
    ? "failed_retryable"
    : progress.status === "completed"
      ? "completed"
      : "running";
  if (sessionId) {
    SESSION_LOCKS.set(sessionId, {
      status: lockStatus,
      reportId,
      progress,
      failedAt: progress.status === "failed" ? Date.now() : undefined,
      updatedAt: Date.now(),
      code: progress.status === "failed" ? clean(options.code || "ZIWEI_PREMIUM_GENERATION_FAILED") : undefined,
      error: clean(progress.errorMessage || ""),
    });
  }

  const clauses = [];
  if (clean(executionCtx.executionKey)) clauses.push({ executionKey: clean(executionCtx.executionKey) });
  if (reportId) clauses.push({ reportId });
  if (sessionId) clauses.push({ sessionId });
  if (!clauses.length) return null;
  const now = new Date();
  const update = {
    $set: {
      reportType: "ziweiPremium",
      reportId: reportId || undefined,
      sessionId: sessionId || undefined,
      status: "pending",
      premiumStatus: "generating",
      heartbeatAt: now,
      lastClientHeartbeatAt: now,
      "metadata.ziweiPdfProgress": progress,
    },
  };
  if (draftChapters.length || options.draftChapters) {
    update.$set["metadata.ziweiDraftChapters"] = draftChapters;
  }
  if (progress.status === "failed") {
    update.$set.generationFailedAt = now;
    update.$set.reasonCode = clean(options.code || "ziwei_generation_failed");
    update.$set.reasonMessage = clean(progress.errorMessage || "자미두수 상담문 생성이 중단되었습니다.");
  }
  if (clean(executionCtx.executionKey)) {
    update.$setOnInsert = {
      userId,
      executionKey: clean(executionCtx.executionKey),
      featureKey: clean(executionCtx.featureKey || ZIWEI_FEATURE_KEY),
      idempotencyKey: clean(executionCtx.idempotencyKey || executionCtx.executionKey),
      timeoutAt: new Date(now.getTime() + (Number(executionCtx.timeoutSeconds || 1800) * 1000)),
      nextRetryAt: now,
      retryCount: 0,
      maxRetries: Math.max(1, Number(executionCtx.maxRetries || 6)),
      generationStartedAt: now,
      retentionUntil: new Date(now.getTime() + (14 * 86400000)),
    };
  }
  await connectDb(env);
  return ServiceExecutionTransaction.findOneAndUpdate(
    { userId, $or: clauses },
    update,
    { new: true, upsert: Boolean(clean(executionCtx.executionKey)), setDefaultsOnInsert: true },
  ).lean();
}

async function markZiweiZeroProgressIfStale(env, userId, doc = {}, keys = {}) {
  const draftChapters = getZiweiDraftChaptersFromDoc(doc);
  const progress = getZiweiProgressFromDoc(doc, {
    status: "generating",
    completedChapters: draftChapters.length,
    reportId: keys.reportId || doc.reportId,
    sessionId: keys.sessionId || doc.sessionId,
  });
  if (progress.status === "failed" || progress.completedChapters > 0) return progress;
  if (!["generating", "rendering", "uploading"].includes(progress.status)) return progress;
  const timeoutMs = Math.max(30000, Number(env?.ZIWEI_ZERO_PROGRESS_TIMEOUT || env?.ZIWEI_ZERO_PROGRESS_TIMEOUT_MS || 180000));
  const startedAt = Date.parse(progress.startedAt || doc.generationStartedAt || doc.createdAt || "");
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < timeoutMs) return progress;
  const failedProgress = normalizeZiweiProgress(progress, {
    status: "failed",
    errorMessage: "ZIWEI_ZERO_PROGRESS_TIMEOUT",
  });
  failedProgress.status = "failed";
  failedProgress.errorMessage = "ZIWEI_ZERO_PROGRESS_TIMEOUT";
  failedProgress.currentStepMessage = "자미두수 상담문 생성이 중단되었습니다.";
  await persistZiweiPdfProgress(env, userId, {
    reportId: keys.reportId || doc.reportId,
    sessionId: keys.sessionId || doc.sessionId,
    progress: failedProgress,
    draftChapters,
    code: "ZIWEI_ZERO_PROGRESS_TIMEOUT",
  });
  return failedProgress;
}

function getValidatedZiweiReportCache(reportId = "") {
  const id = clean(reportId);
  if (!id || !REPORT_CACHE.has(id)) return null;
  const cached = safeObject(REPORT_CACHE.get(id));
  const validation = validateZiweiLlmPdfCompletionPayload({
    pdfReady: safeObject(cached.pdfReady),
    chapters: safeArray(cached.chapters),
    requireDownloadUrl: true,
  });
  if (!validation.ok) {
    REPORT_CACHE.delete(id);
    return { ok: false, issues: validation.issues || [] };
  }
  return { ok: true, payload: cached };
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
  const cachedForDownload = getValidatedZiweiReportCache(cacheId);
  if (cachedForDownload?.ok) {
    normalized = cachedForDownload.payload;
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
  const downloadValidation = validateZiweiLlmPdfCompletionPayload({ pdfReady, chapters, requireDownloadUrl: true });
  if (!downloadValidation.ok) {
    return json({
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: "ZIWEI_PDF_COMPLETION_INVALID",
      message: "자미두수 PDF 원고 검증이 완료되지 않았습니다. 다시 생성해 주세요.",
      issues: downloadValidation.issues,
    }, { status: 409 });
  }
  const archiveDownloadUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || buildArchivePdfUrl(reportId));
  if (/\/api\/premium\/pdf-archive\//.test(archiveDownloadUrl)) {
    return Response.redirect(new URL(withPremiumPdfArchiveFormat(archiveDownloadUrl, "pdf"), request.url).toString(), 302);
  }

  const html = clean(pdfReady?.html || "");
  if (!html) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "PDF_HTML_MISSING", message: "PDF 파일을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }

  const filename = clean(pdfReady?.filename) || buildPdfFilenameFromDate(pdfReady?.generatedAt || new Date());
  const body = buildZiweiNativePdfBytes(html, filename);
  return new Response(body, { status: 200, headers: buildPdfDownloadHeaders(filename) });
}

function shouldForceZiweiSmokeFail(request, env = {}) {
  const configuredSecret = clean(env.ZIWEI_SMOKE_FORCE_FAIL_SECRET || env.SMOKE_FORCE_FAIL_SECRET || "");
  if (!configuredSecret) return false;
  const headerSecret = clean(request.headers.get("x-ziwei-smoke-fail") || "");
  if (!headerSecret) return false;
  return headerSecret === configuredSecret;
}

async function handlePrepareSync(request, env) {
  console.info("[ZiweiBook][Flow] ZIWEI_PDF_PREPARE_STARTED");
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
  console.info("[ZiweiBook][Flow] ZIWEI_PDF_REQUEST_RECEIVED", {
    hasBirthInput: Boolean(body?.birthInput),
    hasBirthProfile: Boolean(body?.birthProfile),
    hasZiweiBase: Boolean(body?.ziweiBase || body?.ziweiPdfSeed || body?.chartResult?.reportPayload),
  });
  let precheckedAccess = null;
  const earlyReportId = clean(body?.reportId || "");
  const earlySessionId = clean(body?.reportSessionId || body?.sessionId || "");
  if (earlyReportId || earlySessionId) {
    const earlyFeatureKey = normalizeFeatureKey(body?.featureKey);
    precheckedAccess = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "ziweiPremium", {
      ...body,
      featureKey: earlyFeatureKey,
      reportType: "ziweiPremium",
      premiumAccessToken: getZiweiAccessToken(request, body) || undefined,
      _accessRoute: "/api/ziwei-book",
    });
    if (!precheckedAccess?.ok) {
      return invalidZiweiAuthorizationResponse(Number(precheckedAccess?.status || 403), {
        reportId: earlyReportId,
        sessionId: earlySessionId,
      });
    }
    const completedReport = await findCompletedZiweiReport(env, auth.userId, { reportId: earlyReportId, sessionId: earlySessionId });
    if (completedReport) {
      console.info("[ZiweiBook][Flow] ZIWEI_EXISTING_PDF_RETURNED", { reportId: earlyReportId, sessionId: earlySessionId, source: "prepare_fast_path" });
      return json(completedReport, { status: 200 });
    }
  }
  const normalized = normalizeInput(body);
  if (!normalized.ok) return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: normalized.code || "INVALID_INPUT", message: normalized.message }, { status: 422 });
  console.info("[ZiweiBook][Flow] ZIWEI_PDF_PREPARE_COMPLETED", {
    hasProfile: true,
    hasBirthDate: Boolean(normalized.birthInput?.birthDate),
    hasBirthTime: Number.isFinite(Number(normalized.birthInput?.birthHour)),
    hasGender: Boolean(clean(normalized.birthInput?.gender)),
  });

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

  {
    const premiumAccessTokenForAccess = getZiweiAccessToken(request, body);
    const featureKeyForAccess = normalizeFeatureKey(body?.featureKey);
    console.info("[ZiweiBook][Flow] BILLING_PRECHECK_START", { featureKey: featureKeyForAccess, userId: auth.userId });
    precheckedAccess = precheckedAccess || await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "ziweiPremium", {
      ...body,
      featureKey: featureKeyForAccess,
      reportType: "ziweiPremium",
      premiumAccessToken: premiumAccessTokenForAccess || undefined,
      _accessRoute: "/api/ziwei-book",
    });
    if (!precheckedAccess?.ok) {
      const status = Number(precheckedAccess?.status || 402);
      return invalidZiweiAuthorizationResponse(status, {
        reportId: clean(body?.reportId || ""),
        sessionId: clean(body?.reportSessionId || body?.sessionId || ""),
      });
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
  console.info("[ZiweiBook][Flow] ZIWEI_INPUT_NORMALIZED", {
    palaceCount: seed?.chart?.palaces?.length || 0,
    hasMingGong: Boolean(clean(seed?.chart?.mingGong)),
    hasShenGong: Boolean(clean(seed?.chart?.shenGong)),
    hasFourTransformations: Boolean(safeArray(seed?.chart?.transformations).length),
  });
  if (!seedValidation.ok) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "ZIWEI_SEED_INVALID", message: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.", missing: seedValidation.errors }, { status: 422 });
  }
  console.info("[ZiweiPremiumPDF][LocalCalculationSuccess]", { palaceCount: seed?.chart?.palaces?.length || 0 });
  const ziweiMasterJson = buildZiweiMasterJson(profile, seed, body);
  const requestedChapterSpecs = safeArray(body?.chapterSpecs || body?.ziweiMasterJson?.chapterSpecs || ziweiMasterJson.chapterSpecs);
  const masterJsonValidation = validateZiweiMasterJson(ziweiMasterJson);
  console.info("[ZiweiBook][Flow] ZIWEI_CHAPTER_PLAN_LOADED", {
    chapterCount: CHAPTER_BLUEPRINTS.length,
    expectedChapterCount: 15,
    ok: CHAPTER_BLUEPRINTS.length === 15,
  });
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

  const premiumAccessToken = getZiweiAccessToken(request, body);
  const featureKey = normalizeFeatureKey(body?.featureKey);
  const sessionId = clean(body?.reportSessionId || body?.sessionId || `ziwei-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const reportId = clean(body?.reportId || `ziwei-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const completedReport = await findCompletedZiweiReport(env, auth.userId, { reportId, sessionId });
  if (completedReport) {
    console.info("[ZiweiBook][Flow] ZIWEI_EXISTING_PDF_RETURNED", { reportId, sessionId });
    return json(completedReport, { status: 200 });
  }
  const existingLock = SESSION_LOCKS.get(sessionId);
  if (clean(existingLock?.status) === "running") {
    return json(buildZiweiProgressResponse(existingLock?.progress || initialZiweiProgress({ reportId, sessionId, birthHash }), {
      reportId,
      sessionId,
      birthHash,
      llmDraftChapterCount: existingLock?.progress?.completedChapters || 0,
    }), { status: 202 });
  }
  if (existingLock?.status === "completed" && existingLock?.reportId) {
    const cachedCompleted = getValidatedZiweiReportCache(existingLock.reportId);
    if (!cachedCompleted?.ok) {
      SESSION_LOCKS.delete(sessionId);
    } else {
      const cached = cachedCompleted.payload;
      console.info("[ZiweiBook][Flow] ReportRecovered", { reportId: existingLock.reportId, sessionId, source: "session_lock" });
      return json(cached, { status: 200 });
    }
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
    return invalidZiweiAuthorizationResponse(status, { reportId, sessionId });
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
  const startedProgress = initialZiweiProgress({ reportId, sessionId, birthHash });
  await persistZiweiPdfProgress(env, auth.userId, {
    executionCtx,
    reportId,
    sessionId,
    progress: startedProgress,
    draftChapters: [],
  });
  console.info("[ZiweiBook][Flow] ZIWEI_PROGRESS_STARTED", { reportId, sessionId, completedChapters: 0 });

  if (shouldForceZiweiSmokeFail(request, env)) {
    throw Object.assign(new Error("ziwei smoke forced failure"), {
      status: 500,
      code: "ZIWEI_SMOKE_FORCED_500",
    });
  }

  let draftChapters = [];
  let lastProgress = startedProgress;
  const storeProgress = async (progress, code = "") => {
    lastProgress = normalizeZiweiProgress(progress, {
      completedChapters: draftChapters.length,
      reportId,
      sessionId,
    });
    await persistZiweiPdfProgress(env, auth.userId, {
      executionCtx,
      reportId,
      sessionId,
      progress: lastProgress,
      draftChapters,
      code,
    });
    return lastProgress;
  };
  const upsertDraftChapter = (chapter, chapterSpec = {}) => {
    if (!chapter || typeof chapter !== "object") return null;
    const id = clean(chapter.id || chapter.chapterId || chapterSpec.id);
    const order = Number(chapter.order || chapter.chapterNo || chapterSpec.order || 0);
    const next = { ...chapter, id: id || chapter.id, order: order || chapter.order };
    const index = draftChapters.findIndex((item) => clean(item?.id || item?.chapterId) === clean(next.id || next.chapterId));
    if (index >= 0) draftChapters[index] = next;
    else draftChapters.push(next);
    draftChapters = draftChapters
      .filter((item) => item && typeof item === "object")
      .sort((a, b) => Number(a.order || a.chapterNo || 0) - Number(b.order || b.chapterNo || 0));
    return next;
  };

  try {
    {
      const existingExecution = await findZiweiExecution(env, auth.userId, {
        executionKey: executionCtx.executionKey,
        reportId,
        sessionId,
      });
      draftChapters = getZiweiDraftChaptersFromDoc(existingExecution);
      if (draftChapters.length > 0) {
        await storeProgress({
          status: "generating",
          completedChapters: draftChapters.length,
          currentChapterNumber: Math.min(CHAPTER_BLUEPRINTS.length, draftChapters.length + 1),
          currentChapterTitle: CHAPTER_BLUEPRINTS[Math.min(CHAPTER_BLUEPRINTS.length - 1, draftChapters.length)]?.title || "",
          currentCategory: safeArray(CHAPTER_BLUEPRINTS[Math.min(CHAPTER_BLUEPRINTS.length - 1, draftChapters.length)]?.categories)[0] || "",
          currentStepMessage: getZiweiProgressMessage({ status: "generating", completedChapters: draftChapters.length, currentChapterNumber: Math.min(CHAPTER_BLUEPRINTS.length, draftChapters.length + 1) }),
        });
      }
      console.info("[ZiweiPremiumPDF][LlmManuscriptBuildStart]", { chapterCount: CHAPTER_BLUEPRINTS.length });
      console.info("[ZiweiBook][Flow] ZIWEI_WORKERS_AI_GENERATION_STARTED", { reportId, sessionId, chapterCount: CHAPTER_BLUEPRINTS.length });
      const llmResult = await generateZiweiPremiumReport(env, {
        profile,
        seed,
        birthInput,
        reportId,
        sessionId,
        birthHash,
        featureKey,
        chapterSpecs: requestedChapterSpecs,
        ziweiMasterJson,
        masterJsonValidation,
        existingChapters: draftChapters,
        callbacks: {
          onChapterStart: async ({ chapterSpec, completedChapters, currentCategory }) => {
            const order = Number(chapterSpec?.order || completedChapters + 1 || 1);
            await storeProgress({
              status: "generating",
              completedChapters: clampZiweiChapterCount(completedChapters),
              currentChapterNumber: order,
              currentChapterTitle: clean(chapterSpec?.title || CHAPTER_BLUEPRINTS[order - 1]?.title || ""),
              currentCategory: clean(currentCategory || safeArray(chapterSpec?.sections || chapterSpec?.categories)[0] || ""),
              currentStepMessage: order === 6 ? "재백궁과 관록궁 흐름을 분석하고 있습니다." : `${order}챕터 상담문을 생성하고 있습니다.`,
            });
          },
          onChapterComplete: async ({ chapter, chapterSpec, completedChapters }) => {
            upsertDraftChapter(chapter, chapterSpec);
            const completed = Math.max(clampZiweiChapterCount(completedChapters), draftChapters.length);
            const nextNumber = Math.min(CHAPTER_BLUEPRINTS.length, completed + 1);
            await storeProgress({
              status: completed >= CHAPTER_BLUEPRINTS.length ? "rendering" : "generating",
              completedChapters: completed,
              currentChapterNumber: nextNumber,
              currentChapterTitle: CHAPTER_BLUEPRINTS[nextNumber - 1]?.title || "",
              currentCategory: safeArray(CHAPTER_BLUEPRINTS[nextNumber - 1]?.categories)[0] || "",
              currentStepMessage: completed >= CHAPTER_BLUEPRINTS.length ? "PDF 원고를 조판하고 있습니다." : getZiweiProgressMessage({ status: "generating", completedChapters: completed, currentChapterNumber: nextNumber }),
            });
            console.info("[ZiweiBook][Flow] ZIWEI_CHAPTER_PROGRESS_SAVED", {
              reportId,
              sessionId,
              completedChapters: completed,
              currentChapterNumber: nextNumber,
            });
          },
        },
      });
      const completedChapters = safeArray(llmResult?.chapters);
      draftChapters = completedChapters;
      await storeProgress({
        status: "rendering",
        completedChapters: completedChapters.length,
        currentChapterNumber: CHAPTER_BLUEPRINTS.length,
        currentChapterTitle: CHAPTER_BLUEPRINTS[CHAPTER_BLUEPRINTS.length - 1]?.title || "",
        currentCategory: "",
        currentStepMessage: "PDF 원고를 조판하고 있습니다.",
      });
      console.info("[ZiweiBook][Flow] ZIWEI_WORKERS_AI_GENERATION_COMPLETED", {
        reportId,
        sessionId,
        chapterCount: completedChapters.length,
        provider: clean(llmResult?.provider || ""),
      });
      const llmAssembly = safeObject(llmResult?.llmAssembly || llmResult?.pdfReady?.llmAssembly);
      const externalCallsAllowed = llmAssembly.externalCallsAllowed !== false && llmResult?.externalCallsAllowed !== false;
      const isMock = llmAssembly.isMock === true || llmResult?.isMock === true || clean(llmResult?.provider || llmAssembly.provider) === "mock";
      const tokensUsed = Number(llmResult?.tokensUsed || llmAssembly.tokensUsed || 0);
      const cost = Number(llmResult?.cost || llmAssembly.cost || 0);
      const llmDraftChapterCount = completedChapters.length;
      const finalValidation = llmResult?.chapterQuality || { ok: true, issues: [], totalChars: clean(llmResult?.html || "").length };
      const finalBundleValidation = { ok: true, errors: [], mode: ZIWEI_PDF_CONFIG.generationMode };
      const consultationQuality = {
        ok: true,
        status: "passed",
        score: 100,
        issues: [],
        source: ZIWEI_PDF_CONFIG.generationMode,
      };
      const ziweiPayload = buildZiweiPayload(profile, seed, completedChapters, {
        accessType: clean(access.accessType || "unknown"),
        manuscriptSource: ZIWEI_PDF_CONFIG.generationMode,
        llmAssemblyOnly: true,
        externalCallsAllowed,
        externalGeneration: true,
        fallbackAllowed: false,
        fallbackUsed: false,
        localFallbackUsed: false,
        llmAssembly,
        tokensUsed,
        cost,
        isMock,
        consultationQuality,
        generationMode: ZIWEI_PDF_CONFIG.generationMode,
        provider: clean(llmResult?.provider || llmAssembly.provider || ZIWEI_PDF_CONFIG.provider),
        writingPipeline: ZIWEI_PDF_CONFIG.templateVersion,
        qualityTier: "premium-llm-authored",
        ziweiMasterJson,
        masterJsonValidation,
      });
      const pdfReady = safeObject(llmResult?.pdfReady);
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
      pdfReady.externalCallsAllowed = externalCallsAllowed;
      pdfReady.tokensUsed = tokensUsed;
      pdfReady.cost = cost;
      pdfReady.isMock = isMock;
      pdfReady.quality = {
        status: "passed",
        consultationQuality,
        llmAssembly,
      };
      const pdfCompletionValidation = validateZiweiLlmPdfCompletionPayload({ pdfReady, chapters: completedChapters, requireDownloadUrl: true });
      pdfReady.quality.pdfCompletion = pdfCompletionValidation;
      if (!pdfCompletionValidation.ok) {
        throw Object.assign(new Error(`ZIWEI_PDF_COMPLETION_INVALID:${pdfCompletionValidation.issues.join(",")}`), {
          status: 422,
          code: "ZIWEI_PDF_COMPLETION_INVALID",
          detail: pdfCompletionValidation,
        });
      }
      console.info("[ZiweiPremiumPDF][LlmPdfRenderSuccess]", {
        chapterCount: completedChapters.length,
        provider: clean(llmResult?.provider || llmAssembly.provider || ""),
      });
      console.info("[ZiweiBook][Flow] ZIWEI_ALL_CHAPTERS_COMPLETED", { reportId, sessionId, chapterCount: completedChapters.length });
      console.info("[ZiweiBook][Flow] ZIWEI_HTML_ASSEMBLED", { reportId, sessionId, hasHtml: Boolean(clean(pdfReady?.html)) });
      console.info("[ZiweiBook][Flow] ZIWEI_PDF_RENDER_COMPLETED", { reportId, sessionId, downloadUrl: Boolean(clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl)) });
      await storeProgress({
        status: "uploading",
        completedChapters: completedChapters.length,
        currentChapterNumber: CHAPTER_BLUEPRINTS.length,
        currentChapterTitle: CHAPTER_BLUEPRINTS[CHAPTER_BLUEPRINTS.length - 1]?.title || "",
        currentCategory: "",
        currentStepMessage: "PDF를 저장하고 있습니다.",
      });
      const completedProgress = normalizeZiweiProgress({
        status: "completed",
        completedChapters: completedChapters.length,
        currentChapterNumber: CHAPTER_BLUEPRINTS.length,
        currentChapterTitle: CHAPTER_BLUEPRINTS[CHAPTER_BLUEPRINTS.length - 1]?.title || "",
        currentCategory: "",
        currentStepMessage: "PDF 저장이 완료되었습니다.",
      });

      await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
        ziweiPdfProgress: completedProgress,
        ziweiDraftChapters: completedChapters,
        manuscriptSource: ZIWEI_PDF_CONFIG.generationMode,
        chapterCount: completedChapters.length,
        llmAssemblyOnly: true,
        externalCallsAllowed,
        externalGeneration: true,
        fallbackAllowed: false,
        fallbackUsed: false,
        localFallbackUsed: false,
        llmAssembly,
        tokensUsed,
        cost,
        isMock,
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
          tokensUsed,
          cost,
          isMock,
          ziweiMasterJson,
          masterJsonValidation,
          diagnostics: {
            masterJson: masterJsonValidation,
            manuscript: finalBundleValidation,
            quality: finalValidation,
            consultationQuality,
            pdfCompletion: pdfCompletionValidation,
            llmAssembly,
          },
          pdfReady,
          ziweiPdfProgress: completedProgress,
          canReopen: true,
          canDownload: true,
        },
      });
      console.info("[ZiweiBook][Flow] ZIWEI_PDF_UPLOAD_COMPLETED", { reportId, sessionId, downloadUrl: Boolean(clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl)) });
      const responsePayload = {
        ok: true,
        status: "completed",
        serverStatus: "completed",
        serviceKey: ZIWEI_SERVICE_KEY,
        featureKey,
        reportId,
        sessionId,
        birthHash,
        totalChapters: completedProgress.totalChapters,
        completedChapters: completedProgress.completedChapters,
        currentChapterNumber: completedProgress.currentChapterNumber,
        currentChapterTitle: completedProgress.currentChapterTitle,
        currentCategory: completedProgress.currentCategory,
        currentStepMessage: completedProgress.currentStepMessage,
        ziweiPdfProgress: completedProgress,
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
        manuscriptSource: ZIWEI_PDF_CONFIG.generationMode,
        llmAssemblyOnly: true,
        externalCallsAllowed,
        externalGeneration: true,
        fallbackAllowed: false,
        fallbackUsed: false,
        localFallbackUsed: false,
        llmAssembly,
        tokensUsed,
        cost,
        isMock,
        diagnostics: {
          masterJson: masterJsonValidation,
          manuscript: finalBundleValidation,
          quality: finalValidation,
          consultationQuality,
          pdfCompletion: pdfCompletionValidation,
          llmAssembly,
        },
        generationMode: ZIWEI_PDF_CONFIG.generationMode,
        provider: clean(llmResult?.provider || llmAssembly.provider || ZIWEI_PDF_CONFIG.provider),
        writingPipeline: ZIWEI_PDF_CONFIG.templateVersion,
        pdfCompletionValidation,
        llmDraftChapterCount,
        llmChapterCount: llmDraftChapterCount,
        finalChapterCount: completedChapters.length,
      };
      REPORT_CACHE.set(reportId, responsePayload);
      SESSION_LOCKS.set(sessionId, { status: "completed", completedAt: Date.now(), reportId, progress: completedProgress });
      console.info("[ZiweiBook][Flow] ZIWEI_PDF_COMPLETED", { reportId, sessionId, chapterCount: completedChapters.length });
      return json(responsePayload);
    }

  } catch (error) {
    const retryCode = clean(error?.code || "ZIWEI_PREPARE_FAILED_RETRYABLE");
    const retryStatus = Number(error?.status || 500);
    const errorDetail = safeObject(error?.detail);
    const failedChapter = safeArray(errorDetail?.failedChapters || error?.failedChapters)[0] || {};
    const failedOrder = Number(failedChapter.chapterNo || failedChapter.order || lastProgress.currentChapterNumber || draftChapters.length + 1 || 1);
    const failedProgress = normalizeZiweiProgress({
      status: "failed",
      completedChapters: draftChapters.length,
      currentChapterNumber: Math.max(1, Math.min(CHAPTER_BLUEPRINTS.length, failedOrder)),
      currentChapterTitle: clean(failedChapter.title || CHAPTER_BLUEPRINTS[Math.max(0, Math.min(CHAPTER_BLUEPRINTS.length - 1, failedOrder - 1))]?.title || lastProgress.currentChapterTitle || ""),
      currentCategory: clean(failedChapter.category || lastProgress.currentCategory || ""),
      currentStepMessage: "자미두수 상담문 생성이 중단되었습니다.",
      errorMessage: clean(error?.message || "자미두수 PDF 생성에 실패했습니다."),
    });
    await persistZiweiPdfProgress(env, auth.userId, {
      executionCtx,
      reportId,
      sessionId,
      progress: failedProgress,
      draftChapters,
      code: retryCode,
    });
    const retryable = buildZiweiProgressResponse(failedProgress, {
      code: retryCode,
      errorMessage: failedProgress.errorMessage,
      reportId,
      sessionId,
      birthHash,
      llmDraftChapterCount: draftChapters.length,
    });
    retryable.chapterDiagnostics = errorDetail?.failedChapters || [];
    retryable.detail = clean(error?.message || "");
    retryable.failureStage = "ziwei-generation";
    console.warn("[ZiweiBook][Flow] PrepareFailedRetryable", {
      reportId,
      sessionId,
      birthHash,
      chapterCount: draftChapters.length,
      hasToken: Boolean(premiumAccessToken),
      status: retryStatus,
      code: retryCode,
      message: clean(error?.message || ""),
      detail: errorDetail,
      failedChapters: errorDetail?.failedChapters || error?.failedChapters || [],
    });
    return json(retryable, { status: retryStatus >= 500 ? 503 : 422 });
  }
}

async function handlePrepare(request, env, ctx) {
  if (!ctx || typeof ctx.waitUntil !== "function" || request.headers.get("x-ziwei-sync") === "1") {
    return await handlePrepareSync(request, env);
  }

  const bodyText = await request.clone().text().catch(() => "");
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch (_) {
    return await handlePrepareSync(new Request(request, { body: bodyText }), env);
  }

  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "UNAUTHORIZED", message: "자미두수 PDF 생성을 위해 먼저 로그인해 주세요." }, { status: 401 });
    }
    throw error;
  }

  let precheckedAccess = null;
  const earlyReportId = clean(body?.reportId || "");
  const earlySessionId = clean(body?.reportSessionId || body?.sessionId || "");
  if (earlyReportId || earlySessionId) {
    const earlyFeatureKey = normalizeFeatureKey(body?.featureKey);
    precheckedAccess = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "ziweiPremium", {
      ...body,
      featureKey: earlyFeatureKey,
      reportType: "ziweiPremium",
      premiumAccessToken: getZiweiAccessToken(request, body) || undefined,
      _accessRoute: "/api/ziwei-book",
    });
    if (!precheckedAccess?.ok) {
      return invalidZiweiAuthorizationResponse(Number(precheckedAccess?.status || 403), {
        reportId: earlyReportId,
        sessionId: earlySessionId,
      });
    }
    const completedReport = await findCompletedZiweiReport(env, auth.userId, { reportId: earlyReportId, sessionId: earlySessionId });
    if (completedReport) {
      console.info("[ZiweiBook][Flow] ZIWEI_EXISTING_PDF_RETURNED", { reportId: earlyReportId, sessionId: earlySessionId, source: "prepare_async_fast_path" });
      return json(completedReport, { status: 200 });
    }
  }

  const normalized = normalizeInput(body);
  if (!normalized.ok) return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: normalized.code || "INVALID_INPUT", message: normalized.message }, { status: 422 });

  const base = getZiweiBase(body);
  if (!base) {
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, code: "MISSING_ZIWEI_ENGINE_RESULT", message: "자미두수 명반 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요." }, { status: 422 });
  }

  const premiumAccessToken = getZiweiAccessToken(request, body);
  const featureKey = normalizeFeatureKey(body?.featureKey);
  const access = precheckedAccess || await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "ziweiPremium", {
    ...body,
    featureKey,
    reportType: "ziweiPremium",
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/ziwei-book",
  });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return invalidZiweiAuthorizationResponse(status, {
      reportId: clean(body?.reportId || ""),
      sessionId: clean(body?.reportSessionId || body?.sessionId || ""),
    });
  }

  const birthInput = normalized.birthInput;
  const birthHash = toHexHash(JSON.stringify({
    birthDate: clean(birthInput.birthDate),
    birthTime: clean(birthInput.birthTime),
    gender: clean(birthInput.gender),
    calendarType: clean(birthInput.calendarType || "solar"),
    leapMonth: Boolean(birthInput.leapMonth),
  }));
  const sessionId = clean(body?.reportSessionId || body?.sessionId || `ziwei-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const reportId = clean(body?.reportId || `ziwei-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  const completedReport = await findCompletedZiweiReport(env, auth.userId, { reportId, sessionId });
  if (completedReport) {
    console.info("[ZiweiBook][Flow] ZIWEI_EXISTING_PDF_RETURNED", { reportId, sessionId, source: "prepare_async" });
    return json(completedReport, { status: 200 });
  }
  const existingLock = SESSION_LOCKS.get(sessionId);
  if (existingLock?.status === "completed" && existingLock?.reportId) {
    const cachedCompleted = getValidatedZiweiReportCache(existingLock.reportId);
    if (cachedCompleted?.ok) {
      return json(cachedCompleted.payload, { status: 200 });
    }
  }
  if (["queued", "running"].includes(clean(existingLock?.status))) {
    return json(buildZiweiProgressResponse(existingLock?.progress || initialZiweiProgress({ reportId, sessionId, birthHash }), {
      reportId: clean(existingLock?.reportId || reportId),
      sessionId,
      birthHash,
      llmDraftChapterCount: existingLock?.progress?.completedChapters || 0,
    }), { status: 202 });
  }

  const queuedProgress = initialZiweiProgress({ reportId, sessionId, birthHash });
  SESSION_LOCKS.set(sessionId, { status: "queued", startedAt: Date.now(), reportId, progress: queuedProgress });

  const backgroundRequest = new Request(request, { body: bodyText });
  ctx.waitUntil(
    handlePrepareSync(backgroundRequest, env)
      .then(async (response) => {
        try { await response?.text?.(); } catch (_) {}
      })
      .catch((error) => {
        const failedProgress = normalizeZiweiProgress(queuedProgress, {
          status: "failed",
          errorMessage: clean(error?.message || error),
        });
        failedProgress.status = "failed";
        failedProgress.currentStepMessage = "자미두수 상담문 생성이 중단되었습니다.";
        failedProgress.errorMessage = clean(error?.message || error);
        SESSION_LOCKS.set(sessionId, {
          status: "failed_retryable",
          failedAt: Date.now(),
          reportId,
          progress: failedProgress,
          error: clean(error?.message || error),
          code: clean(error?.code || "ZIWEI_PREPARE_BACKGROUND_FAILED"),
        });
        console.error("[ZiweiBook][Flow] BackgroundPrepareFailed", {
          reportId,
          sessionId,
          birthHash,
          code: clean(error?.code || ""),
          message: clean(error?.message || error).slice(0, 200),
        });
      }),
  );

  return json(buildZiweiProgressResponse(queuedProgress, {
    reportId,
    sessionId,
    birthHash,
    llmDraftChapterCount: 0,
  }), { status: 202 });
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

  const cachedByReportId = getValidatedZiweiReportCache(reportId);
  if (cachedByReportId?.ok) {
    console.info("[ZiweiBook][Flow] ReportRecovered", { reportId, sessionId, source: "memory_cache" });
    return json(cachedByReportId.payload, { status: 200 });
  }

  const lockBySession = sessionId ? SESSION_LOCKS.get(sessionId) : null;
  if (["queued", "running"].includes(clean(lockBySession?.status))) {
    return json(buildZiweiProgressResponse(lockBySession?.progress || initialZiweiProgress({
      reportId: clean(lockBySession?.reportId || reportId),
      sessionId,
    }), {
      reportId: clean(lockBySession?.reportId || reportId),
      sessionId,
      llmDraftChapterCount: lockBySession?.progress?.completedChapters || 0,
    }), { status: 202 });
  }
  if (clean(lockBySession?.status) === "failed_retryable") {
    return json(buildZiweiProgressResponse(lockBySession?.progress || {
      status: "failed",
      completedChapters: 0,
      currentStepMessage: "자미두수 상담문 생성이 중단되었습니다.",
      errorMessage: clean(lockBySession?.error || "자미두수 PDF 생성에 실패했습니다."),
    }, {
      code: clean(lockBySession?.code || "ZIWEI_PREMIUM_GENERATION_FAILED"),
      reportId: clean(lockBySession?.reportId || reportId),
      sessionId,
      errorMessage: clean(lockBySession?.error || ""),
    }), { status: 503 });
  }
  if (lockBySession?.reportId) {
    const cachedBySession = getValidatedZiweiReportCache(lockBySession.reportId);
    if (cachedBySession?.ok) {
      const cached = cachedBySession.payload;
      console.info("[ZiweiBook][Flow] ReportRecovered", { reportId: lockBySession.reportId, sessionId, source: "session_cache" });
      return json(cached, { status: 200 });
    }
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
    return json(buildZiweiProgressResponse(initialZiweiProgress({
      reportId,
      sessionId,
      currentStepMessage: "자미두수 명반을 정리하고 있습니다.",
    }), {
      code: "RESULT_NOT_FOUND",
      reportId,
      sessionId,
    }), { status: 404 });
  }

  const normalized = normalizeArchiveShapeFromExecution(doc);
  if (!normalized.ok || !Array.isArray(normalized.chapters) || normalized.chapters.length < CHAPTER_BLUEPRINTS.length) {
    const progress = await markZiweiZeroProgressIfStale(env, auth.userId, doc, {
      reportId: clean(normalized?.reportId || reportId),
      sessionId: clean(normalized?.sessionId || sessionId),
    });
    return json(buildZiweiProgressResponse(progress, {
      code: progress.status === "failed" ? clean(progress.errorMessage || "ZIWEI_PREMIUM_GENERATION_FAILED") : "ZIWEI_RESULT_INCOMPLETE",
      reportId: clean(normalized?.reportId || reportId),
      sessionId: clean(normalized?.sessionId || sessionId),
      errorMessage: progress.status === "failed" ? progress.errorMessage : "",
      llmDraftChapterCount: progress.completedChapters,
    }), { status: progress.status === "failed" ? 503 : 202 });
  }

  const resultValidation = validateZiweiLlmPdfCompletionPayload({
    pdfReady: safeObject(normalized.pdfReady),
    chapters: normalized.chapters,
    requireDownloadUrl: true,
  });
  if (!resultValidation.ok) {
    return json({
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: "ZIWEI_RESULT_VALIDATION_FAILED",
      message: "자미두수 PDF 원고 검증을 다시 진행해 주세요.",
      status: "failed",
      serverStatus: "failed",
      retryable: true,
      reportId: clean(normalized?.reportId || reportId),
      sessionId: clean(normalized?.sessionId || sessionId),
      issues: resultValidation.issues,
    }, { status: 409 });
  }

  REPORT_CACHE.set(clean(normalized.reportId), normalized);
  if (clean(normalized.sessionId)) {
    SESSION_LOCKS.set(clean(normalized.sessionId), {
      status: "completed",
      completedAt: Date.now(),
      reportId: clean(normalized.reportId),
      progress: normalized.ziweiPdfProgress,
    });
  }
  console.info("[ZiweiBook][Flow] ReportRecovered", { reportId: clean(normalized.reportId), sessionId: clean(normalized.sessionId), source: "db_execution" });
  return json(normalized, { status: 200 });
}

export async function handleZiweiBookRoutes(request, env = {}, ctx = null) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/ziwei-book");
    if (method === "GET" && (path === "/chapters" || path === "chapters")) return await handleChapters();
    if (method === "GET" && (path === "/download" || path === "download")) return await handleDownload(request, env);
    if (method === "GET" && (path === "/result" || path === "result")) return await handleResult(request, env);
    if (method === "POST" && (path === "/ai-consultation" || path === "ai-consultation" || path === "/ai-reading" || path === "ai-reading" || path === "/consultation" || path === "consultation")) {
      return await handleZiweiAIConsultation(request, env);
    }
    if (method === "POST" && (path === "" || path === "/" || path === "/prepare" || path === "prepare")) return await handlePrepare(request, env, ctx);
    if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, message: "지원하지 않는 자미두수 PDF 경로입니다." }, { status: 404 });
  } catch (error) {
    console.error("[ZiweiPremiumPDF][Error]", normalizeZiweiError(error));
    const status = Number(error?.status || 500);
    const responseStatus = status >= 400 && status < 600 ? status : 500;
    const failedPath = (() => {
      try {
        return getRoutePath(request, "/api/ziwei-book");
      } catch (_) {
        return "";
      }
    })();
    const isAiRoute = /ai-consultation|ai-reading|consultation/.test(clean(failedPath));
    return json({
      ok: false,
      serviceKey: ZIWEI_SERVICE_KEY,
      code: clean(error?.code || (responseStatus >= 500 ? "ZIWEI_ROUTE_FAILED" : "ZIWEI_REQUEST_FAILED")),
      message: responseStatus >= 500
        ? (isAiRoute ? "자미두수 AI 상담 서버가 응답하지 않았습니다. 잠시 후 다시 시도해 주세요." : "자미두수 PDF 생성 서버가 응답하지 않았습니다. 잠시 후 다시 시도해 주세요.")
        : clean(error?.message || (isAiRoute ? "자미두수 AI 상담 요청을 처리하지 못했습니다." : "자미두수 PDF 요청을 처리하지 못했습니다.")),
      status: "failed_retryable",
      retryable: responseStatus >= 500,
    }, { status: responseStatus });
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
  renderZiweiPdf,
  buildPdfReadyPayload,
  buildZiweiNativePdfBytes,
  scoreZiweiConsultationQuality,
  validateChapters,
  normalizeInput,
  parseHourMinuteFromText,
  computeDuplicateRate,
};
