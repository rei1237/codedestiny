import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";

const ZIWEI_SERVICE_KEY = "ziwei-book";
const ZIWEI_FEATURE_KEY = "premium_pdf_ziwei";
const ZIWEI_FEATURE_ALIASES = new Set(["premium-ziwei-report", "premium_pdf_ziwei"]);
const CHAPTER_MIN_CHARS = 3500;
const SECTION_MIN_CHARS = 500;
const TOTAL_MIN_CHARS = 45000;

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
    title: "Chapter 1. 명반 전체 요약 — 이 사람의 운명 구조",
    palaceKeys: ["ming", "body", "wealth", "career", "travel", "spouse", "fortune"],
    categories: [
      "명궁과 신궁으로 보는 인생의 기본 방향",
      "가장 강하게 작동하는 별",
      "가장 조심해야 할 약점 축",
      "사화가 만드는 인생의 흐름",
      "대궁과 삼방사정으로 본 전체 균형",
      "이 명반의 핵심 한 줄 조언",
    ],
  },
  {
    id: "02",
    roman: "II",
    title: "Chapter 2. 명궁 — 타고난 성격과 삶의 태도",
    palaceKeys: ["ming", "body"],
    categories: [
      "기본 성향",
      "장점이 살아나는 방식",
      "감정과 판단의 습관",
      "약점이 드러나는 순간",
      "사람들에게 보이는 인상",
      "인생 운영 조언",
    ],
  },
  {
    id: "03",
    roman: "III",
    title: "Chapter 3. 형제궁·노복궁 — 가까운 사람과 인맥의 운",
    palaceKeys: ["siblings", "friends"],
    categories: [
      "형제·동료·가까운 지인과의 관계",
      "친구와 조력자의 성향",
      "귀인운과 인맥 확장 방식",
      "피해야 할 인간관계 패턴",
      "팀워크와 협업운",
      "관계를 현실적 기회로 바꾸는 법",
    ],
  },
  {
    id: "04",
    roman: "IV",
    title: "Chapter 4. 부부궁 — 연애와 결혼의 구조",
    palaceKeys: ["spouse", "career", "ming"],
    categories: [
      "끌리는 상대의 유형",
      "연애에서 반복되는 흐름",
      "결혼운의 강점",
      "갈등이 생기는 원인",
      "관계를 오래 유지하는 방식",
      "배우자와 함께 성장하는 법",
    ],
  },
  {
    id: "05",
    roman: "V",
    title: "Chapter 5. 자녀궁 — 창작물, 후배, 결과물의 운",
    palaceKeys: ["children", "friends", "career"],
    categories: [
      "자녀운과 후배운",
      "내가 세상에 남기는 결과물",
      "창작과 생산성",
      "책임감과 통제욕의 균형",
      "후대에 이어지는 영향력",
      "결과물을 키우는 현실 전략",
    ],
  },
  {
    id: "06",
    roman: "VI",
    title: "Chapter 6. 재백궁 — 돈과 수익 구조",
    palaceKeys: ["wealth", "career", "travel", "property"],
    categories: [
      "돈이 들어오는 방식",
      "재물운의 강점",
      "돈이 막히는 패턴",
      "잘 맞는 수익 모델",
      "계약·문서·가격 책정 주의점",
      "재물운을 키우는 습관",
    ],
  },
  {
    id: "07",
    roman: "VII",
    title: "Chapter 7. 관록궁 — 직업, 성공, 사회적 역할",
    palaceKeys: ["career", "wealth", "travel", "ming"],
    categories: [
      "직업 적성",
      "성공하는 방식",
      "조직과 독립의 적합도",
      "커리어에서 강한 무기",
      "직업상 주의할 점",
      "장기 커리어 전략",
    ],
  },
  {
    id: "08",
    roman: "VIII",
    title: "Chapter 8. 천이궁 — 외부 활동, 이동, 세상과의 접점",
    palaceKeys: ["travel", "ming", "career", "friends"],
    categories: [
      "밖에서 드러나는 모습",
      "이동·확장·외부 기회",
      "대중과 만날 때의 강점",
      "말과 행동에서 생기는 오해",
      "외부 활동에서 성공하는 법",
      "세상과 부딪힐 때의 조언",
    ],
  },
  {
    id: "09",
    roman: "IX",
    title: "Chapter 9. 전택궁 — 집, 기반, 자산, 안정성",
    palaceKeys: ["property", "wealth", "fortune"],
    categories: [
      "집과 공간의 운",
      "부동산과 축적 자산",
      "안정감을 얻는 방식",
      "가족 기반과 독립성",
      "장기 프로젝트와 저장되는 가치",
      "삶의 기반을 튼튼하게 만드는 법",
    ],
  },
  {
    id: "10",
    roman: "X",
    title: "Chapter 10. 질액궁·복덕궁 — 건강, 마음, 회복력",
    palaceKeys: ["health", "fortune", "parents", "ming"],
    categories: [
      "몸의 약점과 관리 포인트",
      "스트레스가 쌓이는 방식",
      "마음의 회복력",
      "번아웃이 오는 패턴",
      "휴식과 루틴의 중요성",
      "건강운을 지키는 현실 조언",
    ],
  },
  {
    id: "11",
    roman: "XI",
    title: "Chapter 11. 부모궁 — 부모, 윗사람, 권위자와의 관계",
    palaceKeys: ["parents", "health", "ming"],
    categories: [
      "부모와의 인연 구조",
      "윗사람과의 관계",
      "도움과 부담이 함께 오는 영역",
      "독립심이 만들어지는 과정",
      "권위자와 부딪힐 때의 패턴",
      "상처를 힘으로 바꾸는 법",
    ],
  },
  {
    id: "12",
    roman: "XII",
    title: "Chapter 12. 대운·세운 — 시기별 인생 흐름",
    palaceKeys: ["timing", "ming", "wealth", "career", "spouse"],
    categories: [
      "대운의 큰 흐름",
      "현재 시기의 핵심 과제",
      "가까운 미래의 기회",
      "주의해야 할 시기",
      "직업·돈·관계의 변화 포인트",
      "앞으로의 운을 준비하는 법",
    ],
  },
  {
    id: "13",
    roman: "XIII",
    title: "Chapter 13. 최종 운명 전략 — 이 명반을 가장 잘 쓰는 법",
    palaceKeys: ["ming", "body", "wealth", "career", "travel", "spouse", "fortune"],
    categories: [
      "이 명반의 가장 큰 무기",
      "반드시 관리해야 할 약점",
      "돈과 일의 성공 전략",
      "관계와 사랑의 전략",
      "멘탈과 건강의 전략",
      "1년·3년·10년 실행 방향",
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

const FORBIDDEN_TEXT = [
  "payload",
  "raw json",
  "json",
  "debug",
  "api",
  "llm",
  "prompt",
  "schema",
  "engine",
  "자동 복구 생성",
  "localdraft",
  "fallback",
  "chapter 1 chapter 1",
  "데이터가 부족합니다",
  "internal server error",
  "about:blank",
  "calculationmode",
  "로컬 엔진",
  "계산 시그니처",
  "내부 데이터",
  "엔진 결과",
  "데이터 정규화",
  "품질 검증",
  "재생성",
  "삼방사정 연결궁은",
  "대궁은",
  "사화는",
  "작동합니다",
  "해석 원칙은",
  "전체 키워드는",
];

const ZIWEI_STAR_INTERPRETATION = Object.freeze({
  자미: Object.freeze({
    core: "중심을 잡고 전체를 정리하는 힘",
    strength: "강해지면 책임과 판단이 선명해지고, 사람과 상황을 묶어 세우는 능력이 커진다.",
    caution: "약해지면 기준이 지나치게 높아져 스스로를 몰아붙이기 쉽다.",
    advice: "중심을 지키되 모든 짐을 혼자 떠안지 말고, 위임과 조율을 함께 써야 한다.",
    sentences: Object.freeze({
      base: "자미는 전체를 묶어 방향을 세우는 별로 읽힌다.",
      strong: "기운이 살아나면 책임감과 결단력이 곧 신뢰로 이어진다.",
      weak: "기운이 약해질 때는 중심을 잡으려다 오히려 긴장만 쌓일 수 있다.",
      money: "돈에서는 기준을 세우고 질서를 만들수록 안정이 붙는다.",
      career: "일에서는 리더십, 관리, 조율, 최종 판단이 강점이 된다.",
      relation: "관계에서는 사람을 포용하되 선을 분명히 긋는 태도가 필요하다.",
      health: "몸과 마음은 책임을 오래 끌어안지 않도록 쉬는 규칙이 중요하다.",
      advice: "크게 움직이기보다 중심을 지키는 작은 습관을 반복해야 힘이 오래 간다.",
    }),
  }),
  천기: Object.freeze({
    core: "분석하고 설계하고 흐름을 읽는 힘",
    strength: "강하면 빠르게 맥락을 읽고 전략을 세우는 능력이 살아난다.",
    caution: "약하면 생각이 많아져 실행이 늦어질 수 있다.",
    advice: "생각을 한 번 더 정리하기보다 바로 작게 실행해 보며 감을 다듬어야 한다.",
    sentences: Object.freeze({
      base: "천기는 흐름을 읽고 길을 찾는 별이다.",
      strong: "머리가 맑을 때는 빠른 판단과 구조화가 큰 장점이 된다.",
      weak: "기운이 흔들리면 작은 변수에도 마음이 복잡해질 수 있다.",
      money: "돈에서는 설계와 비교, 정보 정리가 곧 수익의 기반이 된다.",
      career: "일에서는 기획, 분석, 조율, 설명이 잘 맞는다.",
      relation: "관계에서는 말의 속도보다 이해의 정확도가 더 중요하다.",
      health: "몸과 마음은 과도한 생각이 쌓이지 않게 쉬는 시간이 필요하다.",
      advice: "복잡해질수록 한 문장으로 정리하는 습관이 운을 돕는다.",
    }),
  }),
  태양: Object.freeze({
    core: "드러남, 따뜻함, 기여, 시야의 확장",
    strength: "강하면 사람을 밝히고 앞에서 방향을 보여 주는 힘이 크다.",
    caution: "약하면 너무 많은 배려로 자기 에너지를 소진하기 쉽다.",
    advice: "밝힘과 소모를 구분하고, 도움도 지속 가능한 방식으로 써야 한다.",
    sentences: Object.freeze({
      base: "태양은 존재를 드러내며 주변을 밝히는 성향으로 읽힌다.",
      strong: "기운이 붙으면 선명한 표현과 자신감이 사람을 끌어당긴다.",
      weak: "기운이 약할 때는 너무 많은 책임감이 숨은 피로를 만든다.",
      money: "돈에서는 신뢰와 공개성, 정직한 전달이 유리하게 작동한다.",
      career: "일에서는 공개적 역할, 안내, 교육, 대표성이 맞다.",
      relation: "관계에서는 따뜻함이 장점이지만 상대의 부담까지 떠안지 않도록 해야 한다.",
      health: "몸과 마음은 에너지를 넓게 쓰는 만큼 회복 시간을 챙겨야 한다.",
      advice: "밝게 빛나되 오래 빛날 수 있는 페이스를 유지하는 것이 중요하다.",
    }),
  }),
  무곡: Object.freeze({
    core: "현실 감각, 수치, 관리, 돈의 구조",
    strength: "강하면 돈과 실무를 단단하게 붙잡는 힘이 생긴다.",
    caution: "약하면 계산이 거칠어져 손익을 놓치기 쉽다.",
    advice: "숫자와 약속을 선명하게 다루고, 감정과 계산을 분리해야 한다.",
    sentences: Object.freeze({
      base: "무곡은 현실을 숫자와 결과로 정리하는 별이다.",
      strong: "기운이 좋을 때는 절약, 집행, 정산 능력이 강해진다.",
      weak: "기운이 약할 때는 고집이나 비용 과다가 문제로 드러난다.",
      money: "돈에서는 수익 구조와 고정비 관리가 핵심이 된다.",
      career: "일에서는 관리, 회계, 실무, 거래처럼 손에 잡히는 업무가 맞다.",
      relation: "관계에서는 약속과 책임을 분명히 할수록 안정이 생긴다.",
      health: "몸과 마음은 긴장과 절제만으로 버티지 않게 균형이 필요하다.",
      advice: "좋은 자원은 아끼는 것이 아니라 정확히 쓰는 데서 힘이 산다.",
    }),
  }),
  천동: Object.freeze({
    core: "부드러운 유연함, 회복, 정서적 순환",
    strength: "강하면 사람을 편안하게 하고 분위기를 살리는 힘이 커진다.",
    caution: "약하면 미루기와 흐름에 맡김이 길어질 수 있다.",
    advice: "편안함을 지키되 해야 할 일은 작은 단위로 끝내는 습관이 필요하다.",
    sentences: Object.freeze({
      base: "천동은 부드럽게 흘러가며 회복하는 성향으로 읽힌다.",
      strong: "기운이 살아나면 사람을 편하게 하고 관계의 온도를 낮춘다.",
      weak: "기운이 흔들리면 지나친 안일함이 일정과 결정을 늦출 수 있다.",
      money: "돈에서는 서두르기보다 편안한 구조를 만들수록 오래 간다.",
      career: "일에서는 상담, 서비스, 조정, 돌봄이 잘 맞는다.",
      relation: "관계에서는 상대를 다그치기보다 함께 쉬는 감각이 중요하다.",
      health: "몸과 마음은 편안한 리듬이 깨지지 않도록 생활 패턴을 지켜야 한다.",
      advice: "느슨함이 장점이 되려면 최소한의 기준이 함께 있어야 한다.",
    }),
  }),
  염정: Object.freeze({
    core: "기준, 매력, 긴장감, 선명한 감정",
    strength: "강하면 존재감과 집중력이 선명해진다.",
    caution: "약하면 감정이 과열되거나 관계에 날이 서기 쉽다.",
    advice: "매력을 성급한 판단으로 쓰지 말고, 선명한 기준과 절제와 함께 써야 한다.",
    sentences: Object.freeze({
      base: "염정은 분위기를 바꾸는 선명한 힘으로 읽힌다.",
      strong: "기운이 붙으면 사람의 시선을 모으고 결정을 밀어붙이는 힘이 커진다.",
      weak: "기운이 약할 때는 예민함이 먼저 올라와 관계가 날카로워질 수 있다.",
      money: "돈에서는 기준과 속도를 함께 잡아야 손실을 줄인다.",
      career: "일에서는 기획, 예술, 브랜드, 협상처럼 존재감이 드러나는 역할이 맞다.",
      relation: "관계에서는 강한 감정이 오갈수록 말의 온도가 중요하다.",
      health: "몸과 마음은 긴장과 흥분이 쌓이지 않게 중간중간 식혀야 한다.",
      advice: "강한 느낌을 오래 쓰려면 차분한 구조가 반드시 필요하다.",
    }),
  }),
  천부: Object.freeze({
    core: "저장, 보호, 품격, 안정의 토대",
    strength: "강하면 사람과 자원을 안정적으로 묶어 두는 힘이 생긴다.",
    caution: "약하면 가진 것을 아끼다 보니 흐름이 굳어질 수 있다.",
    advice: "안정은 숨기는 데서 오기보다 잘 구조화하는 데서 길게 이어진다.",
    sentences: Object.freeze({
      base: "천부는 큰 그릇처럼 자원과 시간을 안정적으로 담는 별이다.",
      strong: "기운이 좋을 때는 믿음과 품격이 자산으로 이어진다.",
      weak: "기운이 약할 때는 안정만 고집해 변화를 놓칠 수 있다.",
      money: "돈에서는 저장과 분산, 장기 보유가 잘 맞는다.",
      career: "일에서는 관리, 운영, 보관, 신뢰 기반의 역할이 좋다.",
      relation: "관계에서는 오래 보는 태도와 책임감이 강점이 된다.",
      health: "몸과 마음은 과하게 움켜쥐지 않고 순환을 확보해야 한다.",
      advice: "지켜야 할 것은 지키되 흐름이 멈추지 않도록 열어 두어야 한다.",
    }),
  }),
  태음: Object.freeze({
    core: "축적, 감수성, 내면의 깊이, 조용한 회복",
    strength: "강하면 섬세함과 축적 능력이 삶을 부드럽게 만든다.",
    caution: "약하면 예민함과 망설임이 길어질 수 있다.",
    advice: "조용한 강점을 현실에서 쓰려면 감정과 재정을 분리해 정리해야 한다.",
    sentences: Object.freeze({
      base: "태음은 조용히 쌓이고 오래 남는 힘으로 읽힌다.",
      strong: "기운이 좋으면 섬세한 감각이 품격과 안정으로 이어진다.",
      weak: "기운이 흔들리면 걱정이 많아져 결정을 미루기 쉽다.",
      money: "돈에서는 꾸준한 적립과 정리가 잘 맞는다.",
      career: "일에서는 기록, 디자인, 기획 보조, 자산 관리에 힘이 실린다.",
      relation: "관계에서는 조용히 챙기되 마음속 부담을 오래 끌지 않는 것이 중요하다.",
      health: "몸과 마음은 수면과 리듬이 흐트러지지 않게 챙겨야 한다.",
      advice: "작은 안정이 오래 가도록 생활 구조를 부드럽게 유지해야 한다.",
    }),
  }),
  탐랑: Object.freeze({
    core: "확장, 호기심, 매력, 즐거움을 찾아가는 힘",
    strength: "강하면 사람을 끌어당기고 기회를 넓히는 재능이 살아난다.",
    caution: "약하면 자극을 좇다 방향이 흔들릴 수 있다.",
    advice: "즐거움은 동력이지만, 기준 없이 쓰면 분산이 커지므로 선을 세워야 한다.",
    sentences: Object.freeze({
      base: "탐랑은 관심과 매력을 바탕으로 확장하는 별이다.",
      strong: "기운이 살아나면 사람과 기회를 동시에 끌어오는 힘이 커진다.",
      weak: "기운이 약할 때는 한 번에 많은 것을 건드려 지치기 쉽다.",
      money: "돈에서는 매력, 홍보, 소개, 유입이 중요해진다.",
      career: "일에서는 영업, 콘텐츠, 기획, 대외 활동에 잘 맞는다.",
      relation: "관계에서는 즐거움을 주지만 경계가 흐려지지 않게 관리해야 한다.",
      health: "몸과 마음은 자극이 과해지면 금세 피로가 쌓일 수 있다.",
      advice: "넓게 손대기보다 가장 잘되는 한두 가지를 깊게 쓰는 편이 유리하다.",
    }),
  }),
  거문: Object.freeze({
    core: "말, 설명, 분석, 숨은 사실을 밝히는 힘",
    strength: "강하면 설득과 검토 능력이 선명해진다.",
    caution: "약하면 의심과 말의 꼬임이 생길 수 있다.",
    advice: "말을 길게 하기보다 핵심을 정확히 놓는 연습이 필요하다.",
    sentences: Object.freeze({
      base: "거문은 말과 분석을 통해 흐름을 드러내는 별이다.",
      strong: "기운이 좋으면 질문과 답변, 검토와 설득이 강점이 된다.",
      weak: "기운이 약할 때는 생각이 겹치며 말이 길어질 수 있다.",
      money: "돈에서는 설명, 계약, 조건 정리가 중요하다.",
      career: "일에서는 상담, 법률, 문서, 커뮤니케이션이 맞다.",
      relation: "관계에서는 사실 확인보다 상대의 감정을 함께 살피는 것이 중요하다.",
      health: "몸과 마음은 걱정이 많아질수록 쉼을 더 의식해야 한다.",
      advice: "한 번 더 묻고 한 번 더 정리하면 오해가 크게 줄어든다.",
    }),
  }),
  천상: Object.freeze({
    core: "균형, 품위, 중재, 관계의 완충",
    strength: "강하면 사람 사이의 긴장을 부드럽게 풀어 주는 힘이 생긴다.",
    caution: "약하면 눈치만 보다가 결정이 늦어질 수 있다.",
    advice: "품위를 유지하되 선택은 분명하게, 해야 할 말은 적시에 해야 한다.",
    sentences: Object.freeze({
      base: "천상은 균형과 중재를 통해 관계를 다듬는 별이다.",
      strong: "기운이 좋으면 사람을 편안하게 하고 신뢰를 얻는다.",
      weak: "기운이 흔들리면 지나친 조율로 자기 결정을 미루게 된다.",
      money: "돈에서는 조건 조정과 신뢰 관리가 핵심이 된다.",
      career: "일에서는 협상, 조정, 관리, 대외 대응이 잘 맞는다.",
      relation: "관계에서는 예의와 균형감이 장점이지만 원칙도 함께 있어야 한다.",
      health: "몸과 마음은 편안함을 유지하는 생활 리듬이 중요하다.",
      advice: "분위기를 맞추는 것과 의사를 분명히 하는 것을 같이 가져가야 한다.",
    }),
  }),
  천량: Object.freeze({
    core: "보호, 기준, 어른다운 판단, 오래 보는 시선",
    strength: "강하면 사람을 지켜 주고 기준을 세우는 힘이 커진다.",
    caution: "약하면 잔소리나 과잉 통제로 보일 수 있다.",
    advice: "보호는 지시보다 신뢰에서 오래 간다.",
    sentences: Object.freeze({
      base: "천량은 사람과 상황을 보호하고 기준을 세우는 별이다.",
      strong: "기운이 좋으면 공정함과 안정감이 주변에 신뢰를 만든다.",
      weak: "기운이 약할 때는 판단이 지나치게 엄격해질 수 있다.",
      money: "돈에서는 무리한 확장보다 안전장치가 중요하다.",
      career: "일에서는 관리, 감독, 조언, 책임 있는 역할이 잘 맞는다.",
      relation: "관계에서는 기준을 세우되 상대를 보호하는 말투가 필요하다.",
      health: "몸과 마음은 과한 책임을 줄이고 회복 루틴을 챙겨야 한다.",
      advice: "정리와 보호를 동시에 할 수 있을 때 천량의 힘이 살아난다.",
    }),
  }),
  칠살: Object.freeze({
    core: "결단, 돌파, 속도, 승부의 기운",
    strength: "강하면 어려운 상황에서 먼저 앞으로 나아가는 힘이 생긴다.",
    caution: "약하면 급함이 실수로 이어질 수 있다.",
    advice: "돌파는 필요하지만, 방향 없는 속도는 손실을 키우므로 기준이 필요하다.",
    sentences: Object.freeze({
      base: "칠살은 단단한 결단과 빠른 실행으로 읽힌다.",
      strong: "기운이 붙으면 위기에서 버티고 치고 나가는 힘이 커진다.",
      weak: "기운이 약할 때는 성급함 때문에 관계와 자원에 손상이 생길 수 있다.",
      money: "돈에서는 과감함이 유리해도 위험 관리가 먼저다.",
      career: "일에서는 책임, 전환, 위기 대응, 빠른 판단이 맞다.",
      relation: "관계에서는 직선적 태도를 부드럽게 조율해야 한다.",
      health: "몸과 마음은 긴장 상태가 길어지지 않게 풀어 줄 필요가 있다.",
      advice: "강한 속도는 한 번 더 점검할 때 가장 안전하게 살아난다.",
    }),
  }),
  파군: Object.freeze({
    core: "해체, 전환, 새 판 짜기, 변화를 밀어내는 힘",
    strength: "강하면 낡은 구조를 바꾸고 새로운 길을 여는 힘이 크다.",
    caution: "약하면 끊고 바꾸는 과정에서 혼란이 커질 수 있다.",
    advice: "새로운 판을 짤 때는 과감함과 함께 복구 계획이 있어야 한다.",
    sentences: Object.freeze({
      base: "파군은 기존 질서를 흔들고 새 구조를 만드는 별이다.",
      strong: "기운이 좋으면 변화를 두려워하지 않고 길을 바꿀 수 있다.",
      weak: "기운이 약할 때는 급한 전환이 불안정한 결과를 남길 수 있다.",
      money: "돈에서는 한 번에 크게 바꾸기보다 단계적 전환이 낫다.",
      career: "일에서는 재편, 혁신, 구조 개편, 새 시장 개척에 강점이 있다.",
      relation: "관계에서는 끊고 다시 잇는 선택보다 먼저 대화를 시도하는 편이 낫다.",
      health: "몸과 마음은 변화가 잦을수록 생활 리듬을 고정해야 한다.",
      advice: "흔드는 힘이 클수록 다시 세우는 기준을 선명하게 해야 한다.",
    }),
  }),
});

const CHAPTER_TOPIC_KEYWORDS = Object.freeze({
  "Chapter 1. 명반 전체 요약 — 이 사람의 운명 구조": ["명궁", "신궁", "사화", "대궁", "삼방사정", "핵심", "조언"],
  "Chapter 2. 명궁 — 타고난 성격과 삶의 태도": ["성향", "장점", "감정", "판단", "인상", "조언"],
  "Chapter 3. 형제궁·노복궁 — 가까운 사람과 인맥의 운": ["형제", "동료", "친구", "조력자", "인맥", "협업"],
  "Chapter 4. 부부궁 — 연애와 결혼의 구조": ["연애", "결혼", "배우자", "관계", "갈등", "유지"],
  "Chapter 5. 자녀궁 — 창작물, 후배, 결과물의 운": ["자녀", "후배", "창작", "결과물", "책임", "영향력"],
  "Chapter 6. 재백궁 — 돈과 수익 구조": ["돈", "수익", "가격", "계약", "신뢰", "재물"],
  "Chapter 7. 관록궁 — 직업, 성공, 사회적 역할": ["직업", "일", "커리어", "성공", "사회적 역할", "실행"],
  "Chapter 8. 천이궁 — 외부 활동, 이동, 세상과의 접점": ["외부 활동", "이동", "대중", "말", "기회", "오해"],
  "Chapter 9. 전택궁 — 집, 기반, 자산, 안정성": ["집", "기반", "자산", "안정", "저장", "가치"],
  "Chapter 10. 질액궁·복덕궁 — 건강, 마음, 회복력": ["건강", "체력", "마음", "스트레스", "회복", "루틴"],
  "Chapter 11. 부모궁 — 부모, 윗사람, 권위자와의 관계": ["부모", "윗사람", "권위자", "독립", "책임", "부담"],
  "Chapter 12. 대운·세운 — 시기별 인생 흐름": ["대운", "세운", "현재", "가까운 미래", "기회", "주의"],
  "Chapter 13. 최종 운명 전략 — 이 명반을 가장 잘 쓰는 법": ["전략", "돈", "일", "관계", "건강", "실행"],
});

function clean(value) {
  return String(value == null ? "" : value).trim();
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
    .replace(/\bengine\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (/^Chapter\s*\d+\s*$/i.test(text)) text = "";
  return text;
}

function normalizeFeatureKey(raw) {
  const key = clean(raw);
  if (!key) return ZIWEI_FEATURE_KEY;
  if (ZIWEI_FEATURE_ALIASES.has(key)) return ZIWEI_FEATURE_KEY;
  return key;
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
    const key = clean(palace.key || palace.id || palace.palaceKey || "");
    const nameKo = clean(palace.nameKo || palace.name || palace.palace || PALACE_LABELS[key] || "");
    return {
      key,
      nameKo,
      branch: clean(palace.branch || palace.earthlyBranch || palace.zhi),
      index,
      mainStars: normalizeStarList(palace.mainStars || palace.stars),
      auxStars: normalizeStarList(palace.auxStars || palace.auxiliaryStars || palace.subStars),
      maleficStars: normalizeStarList(palace.maleficStars || palace.badStars),
      transformations: Array.isArray(palace.transformations) ? palace.transformations : [],
      decadeLuck: palace.decadeLuck || null,
      annualLuck: palace.annualLuck || null,
    };
  });
  return palaces;
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

function uniqueByName(stars = []) {
  const seen = new Set();
  const list = [];
  for (const star of stars) {
    if (!star || !star.name) continue;
    if (seen.has(star.name)) continue;
    seen.add(star.name);
    list.push(star);
  }
  return list;
}

function scoreStrengthSymbol(symbol) {
  if (symbol === "◎") return 5;
  if (symbol === "O") return 4;
  if (symbol === "▲") return 3;
  if (symbol === "△") return 2;
  return 1;
}

function pickStrongestStar(stars = []) {
  return uniqueByName(stars).sort((left, right) => scoreStrengthSymbol(right.strengthSymbol) - scoreStrengthSymbol(left.strengthSymbol))[0] || null;
}

function pickWeakestStar(stars = []) {
  return uniqueByName(stars).sort((left, right) => scoreStrengthSymbol(left.strengthSymbol) - scoreStrengthSymbol(right.strengthSymbol))[0] || null;
}

function findPalacesByKeys(seed, keys = []) {
  const palaces = Array.isArray(seed?.chart?.palaces) ? seed.chart.palaces : [];
  const lookup = new Map();
  for (const palace of palaces) {
    if (palace && palace.key && !lookup.has(palace.key)) lookup.set(palace.key, palace);
  }
  const list = [];
  for (const key of keys) {
    const palace = lookup.get(key) || findPalace(seed, key);
    if (palace && !list.includes(palace)) list.push(palace);
  }
  return list;
}

function collectStarPoolFromPalaces(palaces = []) {
  return uniqueByName(
    palaces.flatMap((palace) => [
      ...(Array.isArray(palace?.mainStars) ? palace.mainStars : []),
      ...(Array.isArray(palace?.auxStars) ? palace.auxStars : []),
      ...(Array.isArray(palace?.maleficStars) ? palace.maleficStars : []),
    ]),
  );
}

function starInterpretationLine(star, topic = "", lane = "base") {
  const info = ZIWEI_STAR_INTERPRETATION[clean(star?.name)] || null;
  const tone = info?.sentences?.[lane] || info?.sentences?.base || "";
  const strength = `${clean(star?.name)}${clean(star?.strengthSymbol || "")}`;
  const strengthName = clean(star?.strengthName || "");
  if (!info) {
    return `${strength}은 ${topic || "해당 영역"}에서 현실 감각과 선택의 기준을 만들어 주는 신호로 볼 수 있습니다.`;
  }
  return `${strength}(${strengthName})은 ${topic || "이 영역"}에서 ${info.core}로 작동하며, ${tone || info.strength} ${info.advice}`;
}

function summarizePalaceBundle(seed, palaceList) {
  const palaces = palaceList.filter(Boolean);
  const names = palaces.map((palace) => palace.nameKo || PALACE_LABELS[palace.key] || palace.key).filter(Boolean);
  const mainStars = collectStarPoolFromPalaces(palaces);
  const strongest = pickStrongestStar(mainStars);
  const weakest = pickWeakestStar(mainStars);
  const transformationText = Array.isArray(seed?.chart?.transformations) && seed.chart.transformations.length
    ? seed.chart.transformations.map((item) => `${clean(item.star)} ${clean(item.type)}`.trim()).filter(Boolean).join(", ")
    : "사화 흐름은 직접 신호보다 생활 선택에서 간접적으로 드러납니다";
  const triadHint = palaces.length > 1
    ? `${names.slice(0, 3).join(", ")}의 연결을 함께 보면 한 궁만 볼 때보다 판단이 훨씬 선명해집니다.`
    : `${names[0] || "해당 궁"}의 단독 신호보다 주변 궁과의 연결을 함께 봐야 합니다.`;
  return {
    names,
    mainStars,
    strongest,
    weakest,
    transformationText,
    triadHint,
  };
}

function chapterPaletteLine(blueprint, bundle) {
  const names = bundle.names.length ? bundle.names.join("·") : "해당 궁";
  const strongest = bundle.strongest ? `${bundle.strongest.name}${bundle.strongest.strengthSymbol}` : "핵심 별";
  const weakest = bundle.weakest ? `${bundle.weakest.name}${bundle.weakest.strengthSymbol}` : "보완 축";
  const keywords = CHAPTER_TOPIC_KEYWORDS[blueprint.title] || [];
  return `${blueprint.title}는 ${names}의 흐름을 함께 엮어 읽는 장입니다. 핵심 키워드는 ${keywords.slice(0, 4).join(", ")}이며, 이 장에서는 ${strongest}의 장점과 ${weakest}의 관리 과제를 함께 다룹니다.`;
}

function buildParagraphVariants(blueprint, categoryTitle, bundle, chapterIndex, categoryIndex, pass) {
  const stars = bundle.mainStars;
  const leadStar = bundle.strongest || stars[0] || null;
  const supportStar = stars.find((star) => star !== leadStar) || bundle.weakest || null;
  const topicKeywords = CHAPTER_TOPIC_KEYWORDS[blueprint.title] || [];
  const topic = topicKeywords.slice(0, 4).join(", ") || categoryTitle;
  const variant = (chapterIndex + categoryIndex + pass) % 4;
  const strengthSentence = leadStar ? starInterpretationLine(leadStar, categoryTitle, variant % 2 === 0 ? "strong" : "base") : `${categoryTitle}는 이 명반에서 선택의 질이 운을 좌우하는 주제입니다.`;
  const cautionSentence = supportStar ? starInterpretationLine(supportStar, categoryTitle, variant % 2 === 0 ? "weak" : "advice") : `${categoryTitle}는 기준이 흐려질수록 선택이 늦어지므로, 판단과 실행을 분리해 두는 편이 좋습니다.`;
  const openingSet = [
    `${categoryTitle}는 ${topic}의 흐름을 실제 생활로 옮겨 읽는 자리입니다.`,
    `이 장의 ${categoryTitle}는 단순한 설명이 아니라, ${topic}이 삶에서 어떻게 반복되는지를 보는 해석입니다.`,
    `${categoryTitle}에서는 겉으로 보이는 사건보다, 그 사건이 왜 반복되는지를 먼저 읽는 것이 중요합니다.`,
    `이 항목은 ${categoryTitle}이 어떤 선택과 태도로 살아나는지 정리하는 안내입니다.`,
  ];
  const developmentSet = [
    `${bundle.triadHint} ${bundle.transformationText}를 함께 보면, 강점은 어떤 방식으로 밀리고 약점은 어떤 순간에 드러나는지 더 분명해집니다.`,
    `특히 ${leadStar ? leadStar.name : "핵심 별"}의 움직임은 ${categoryTitle}에서 가장 먼저 반응하고, 다른 별들은 그 흐름을 돕거나 조절하는 역할을 합니다.`,
    `이 명반은 ${bundle.names.slice(0, 3).join(", ") || "주요 궁"}의 연결이 살아 있을 때 판단이 안정되고, 외부 조건이 흔들려도 방향을 잃지 않는 구조를 보여 줍니다.`,
    `${bundle.transformationText}은 단순한 덧붙임이 아니라, 같은 사건을 다른 방식으로 해석하게 만드는 결입니다.`,
  ];
  const successSet = [
    `${categoryTitle}가 잘 풀릴 때는 ${leadStar ? leadStar.name : "강점"}의 힘이 실생활의 결과로 연결되어, 사람들은 이 영역에서 당신을 믿고 맡기려는 경향을 보입니다.`,
    `좋은 흐름에서는 이 주제가 곧 안정감과 신뢰, 그리고 반복 가능한 실적으로 이어집니다.`,
    `장점이 살아날 때는 ${categoryTitle}가 단순한 기질이 아니라, 관계와 선택을 바꾸는 실제 능력이 됩니다.`,
    `잘 맞는 환경에서는 ${categoryTitle}가 부담이 아니라 자산이 되며, 주변 사람도 그 안정감을 알아봅니다.`,
  ];
  const cautionSet = [
    `${cautionSentence} 그래서 이 영역은 무리해서 밀기보다, 기준을 좁혀서 다루는 편이 더 좋습니다.`,
    `흔들릴 때는 같은 힘이 집착이나 과속으로 바뀔 수 있으니, 속도보다 구조를 먼저 점검해야 합니다.`,
    `이 주제가 꼬일 때는 감정, 말, 약속, 돈, 책임이 한꺼번에 얽히기 쉬우므로 경계선을 명확히 두는 것이 중요합니다.`,
    `운이 약하게 느껴지는 시기에는 이 영역을 없애려 하지 말고, 작게 나누어 다루면서 회복의 여지를 남겨 두어야 합니다.`,
  ];
  return [
    `${openingSet[variant]}

${chapterPaletteLine(blueprint, bundle)}

${strengthSentence}`,
    `${developmentSet[variant]}

${starInterpretationLine(leadStar, categoryTitle, "money")}

${starInterpretationLine(leadStar, categoryTitle, "career")}`,
    `${successSet[variant]}

${starInterpretationLine(leadStar, categoryTitle, "relation")}

${starInterpretationLine(leadStar, categoryTitle, "health")}`,
    `${cautionSet[variant]}

${starInterpretationLine(supportStar || leadStar, categoryTitle, "advice")}

${bundle.names.length > 1 ? `여러 궁의 흐름이 함께 움직이므로 ${bundle.names.join("·")} 사이의 연결을 함께 보는 것이 좋습니다.` : `이 장의 핵심은 단일 신호보다 반복 패턴을 어떻게 정리하느냐에 있습니다.`}`,
  ];
}

function buildZiweiLocalChapterGuide({ seed, blueprint, chapterIndex, categoryIndex, pass = 1, categoryTitle }) {
  const palaceList = findPalacesByKeys(seed, blueprint.palaceKeys);
  const bundle = summarizePalaceBundle(seed, palaceList);
  const paragraphs = buildParagraphVariants(blueprint, categoryTitle, bundle, chapterIndex, categoryIndex, pass);
  const text = paragraphs.map((paragraph) => stripForbiddenTokens(paragraph)).join("\n\n");
  return {
    title: categoryTitle,
    body: text,
    paragraphs,
    bundle,
  };
}

function validateZiweiPdfChapterQuality({ chapters = [], expectedChapters = CHAPTER_BLUEPRINTS } = {}) {
  const base = validateChapters(chapters);
  const chapterCountOk = Array.isArray(chapters) && chapters.length === expectedChapters.length;
  const totalChars = Number(base.totalChars || 0);
  return {
    ok: Boolean(base.ok && chapterCountOk),
    errors: [...(base.errors || []), ...(chapterCountOk ? [] : ["chapter_count_mismatch"])],
    totalChars,
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
  if (computeDuplicateRate(chapters) > 0.45) errors.push("duplicate_rate_high");
  if (!chapterValidation.repetition?.ok) errors.push("repetition_detected");
  return { ok: errors.length === 0, errors, chapterValidation };
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
  const mainStars = normalizeStarList(palace?.mainStars || []);
  const auxStars = normalizeStarList(palace?.auxStars || []);
  const maleficStars = normalizeStarList(palace?.maleficStars || []);

  for (const star of [...mainStars, ...auxStars, ...maleficStars]) {
    if (!usedStars.includes(star.name)) usedStars.push(star.name);
    const signal = `${star.name}${star.strengthSymbol}`;
    if (!usedSignals.includes(signal)) usedSignals.push(signal);
  }

  if (Array.isArray(palace?.transformations)) {
    for (const tf of palace.transformations) {
      const token = `${clean(tf?.star)} ${clean(tf?.type || tf?.label)}`.trim();
      if (token && !usedSignals.includes(token)) usedSignals.push(token);
    }
  }
  return { usedStars, usedSignals };
}

function buildCategoryText(profile, seed, blueprint, categoryTitle, categoryIndex, pass = 1) {
  const guide = buildZiweiLocalChapterGuide({
    seed,
    blueprint,
    chapterIndex: CHAPTER_BLUEPRINTS.findIndex((item) => item.id === blueprint.id),
    categoryIndex,
    pass,
    categoryTitle,
  });
  return guide.body;
}

function buildZiweiLocalPremiumManuscript(profile, seed, pass = 1) {
  return CHAPTER_BLUEPRINTS.map((blueprint, chapterIndex) => {
    const categories = blueprint.categories.map((categoryTitle, categoryIndex) => {
      const guide = buildZiweiLocalChapterGuide({ seed, blueprint, chapterIndex, categoryIndex, pass, categoryTitle });
      return {
        title: categoryTitle,
        body: guide.body,
        paragraphs: guide.paragraphs,
        bundle: guide.bundle,
      };
    });
    const chapterBody = categories.map((section) => `### ${section.title}\n\n${section.body}`).join("\n\n");
    const palaceList = findPalacesByKeys(seed, blueprint.palaceKeys);
    const bundle = summarizePalaceBundle(seed, palaceList);
    return {
      chapterNo: chapterIndex + 1,
      title: blueprint.title,
      subtitle: `${bundle.names.join("·") || "핵심 궁"} 중심 해석`,
      sections: categories,
      localQuality: {
        minLengthPassed: categories.every((section) => stripForbiddenTokens(section.body).length >= SECTION_MIN_CHARS),
        usedPalaces: bundle.names,
        usedStars: bundle.mainStars.map((star) => star.name),
        usedSignals: bundle.mainStars.map((star) => `${star.name}${star.strengthSymbol}`),
      },
      body: chapterBody,
    };
  });
}

function draftToChapter(draft, blueprint, source = "local") {
  const categories = (Array.isArray(draft.sections) ? draft.sections : []).map((section, index) => ({
    id: `${blueprint.id}-${String(index + 1).padStart(2, "0")}`,
    title: section.title,
    localSummary: section.body,
    finalText: section.body,
    paragraphs: Array.isArray(section.paragraphs) ? section.paragraphs : [section.body],
    order: index + 1,
  }));
  return {
    id: blueprint.id,
    roman: blueprint.roman,
    title: draft.title,
    categories,
    finalText: categories.map((c) => `### ${c.title}\n\n${c.finalText}`).join("\n\n"),
    text: categories.map((c) => `### ${c.title}\n\n${c.finalText}`).join("\n\n"),
    source,
    localQuality: draft.localQuality,
  };
}

function buildLocalChapters(profile, seed, pass = 1) {
  const drafts = buildZiweiLocalPremiumManuscript(profile, seed, pass);
  const chapters = drafts.map((draft, index) => draftToChapter(draft, CHAPTER_BLUEPRINTS[index], "local-only"));
  return { drafts, chapters };
}

function validateNoZiweiPdfRepetition(chapters = []) {
  const sections = chapters
    .flatMap((chapter) => (Array.isArray(chapter?.categories) ? chapter.categories : []))
    .map((item) => stripForbiddenTokens(item?.finalText || item?.text || ""))
    .map((text) => clean(text).replace(/\s+/g, " "))
    .filter((text) => text.length >= 120);

  const exactTextCounts = new Map();
  const openingCounts = new Map();
  const sentenceCounts = new Map();

  for (const section of sections) {
    exactTextCounts.set(section, (exactTextCounts.get(section) || 0) + 1);
    const opening = section.slice(0, 120);
    openingCounts.set(opening, (openingCounts.get(opening) || 0) + 1);

    const sentences = section
      .split(/[.!?。]\s*/)
      .map((row) => clean(row).replace(/\s+/g, " "))
      .filter((row) => row.length >= 80);
    const uniqueSentences = new Set(sentences);

    for (const sentence of uniqueSentences) {
      sentenceCounts.set(sentence, (sentenceCounts.get(sentence) || 0) + 1);
    }
  }

  const repeatedSection = Array.from(exactTextCounts.values()).some((count) => count >= 2);
  const repeatedOpening = Array.from(openingCounts.values()).some((count) => count >= 3);
  const repeatedSentence = Array.from(sentenceCounts.values()).some((count) => count >= 4);
  const repeatedChunk = sections.some((section) => {
    const normalized = section.slice(0, 180);
    return normalized.length >= 120 && sections.filter((other) => other.includes(normalized)).length >= 2;
  });
  return {
    ok: !(repeatedSection || repeatedSentence || repeatedOpening || repeatedChunk),
    repeatedSection,
    repeatedSentence,
    repeatedOpening,
    repeatedChunk,
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
      const lowered = text.toLowerCase();
      for (const token of FORBIDDEN_TEXT) {
        if (lowered.includes(token.toLowerCase())) errors.push(`chapter_${index + 1}_forbidden_${token}`);
      }
    });
  });
  if (totalChars < TOTAL_MIN_CHARS) errors.push("total_min_chars");
  const repetition = validateNoZiweiPdfRepetition(chapters);
  if (!repetition.ok) errors.push("repetition_detected");
  return { ok: errors.length === 0, errors, totalChars, repetition };
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
  if (!paragraphs.length) return 0;
  const counter = new Map();
  for (const paragraph of paragraphs) {
    counter.set(paragraph, (counter.get(paragraph) || 0) + 1);
  }
  const repeated = Array.from(counter.values())
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + (count - 1), 0);
  return repeated / paragraphs.length;
}

async function enhanceChaptersLocally(_env, _profile, _seed, localChapters) {
  return {
    chapters: (Array.isArray(localChapters) ? localChapters : []).map((chapter) => ({ ...chapter, source: "local-only" })),
    fallbackUsed: false,
  };
}

function buildZiweiPayload(profile, seed, chapters, metadata = {}) {
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
    metadata: { featureKey: ZIWEI_FEATURE_KEY, ...metadata },
  };
}

function toKoreanChapterTitle(title, index) {
  const stripped = String(title || "").replace(/^Chapter\s*\d+\.?\s*/i, "").trim();
  return `제${index + 1}장 ${stripped}`;
}

function renderZiweiPdf({ profile, seed, chapters, generatedAt, fallbackUsed }) {
  const toc = chapters.map((chapter, index) => `<li><span>${esc(chapter.roman)}</span><strong>${esc(toKoreanChapterTitle(chapter.title, index))}</strong></li>`).join("\n");
  const palaceSummary = seed.chart.palaces.slice(0, 12).map((p) => `<tr><td>${esc(p.nameKo)}</td><td>${esc(p.branch)}</td><td>${esc(starsText(p.mainStars))}</td></tr>`).join("\n");
  const chapterHtml = chapters.map((chapter, index) => {
    const categoryHtml = chapter.categories.map((category) => `<section class="zb-category"><h3>${esc(category.title)}</h3><p>${esc(category.finalText)}</p></section>`).join("\n");
    return `<article class="zb-chapter"><div class="zb-eyebrow">${esc(chapter.roman)} · 제 ${index + 1}장</div><h2>${esc(toKoreanChapterTitle(chapter.title, index))}</h2>${categoryHtml}</article>`;
  }).join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>자미두수 프리미엄 명반서</title>
  <style>
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;font-family:"Noto Serif KR","Malgun Gothic",serif;background:#100821;color:#f8f4ff;line-height:1.82}.page{max-width:980px;margin:0 auto;padding:28px 20px 64px}.cover{position:relative;overflow:hidden;min-height:92vh;padding:42px 34px;border-radius:24px;background:radial-gradient(circle at 72% 12%,rgba(250,204,21,.25),transparent 26%),linear-gradient(145deg,#160729 0%,#30125f 48%,#091b3a 100%);box-shadow:0 24px 60px rgba(0,0,0,.32);display:flex;flex-direction:column;justify-content:center}.cover::after{content:"";position:absolute;inset:24px;border:1px solid rgba(250,204,21,.28);border-radius:20px;pointer-events:none}.cover img{position:relative;z-index:1;width:min(320px,82%);border-radius:18px;margin:24px 0 0;box-shadow:0 18px 42px rgba(0,0,0,.34);background:#271146}.cover h1{position:relative;z-index:1;margin:8px 0 8px;font-size:44px;line-height:1.12;color:#fff7d6}.cover p{position:relative;z-index:1;margin:4px 0;color:#d8ccff}.badge{letter-spacing:.22em;text-transform:uppercase;color:#facc15;font-size:12px}.panel,.toc,.zb-chapter,.legend{margin-top:20px;padding:20px;border:1px solid rgba(216,180,254,.28);border-radius:18px;background:rgba(255,255,255,.08);box-shadow:0 14px 30px rgba(0,0,0,.16)}.panel h2,.toc h2,.legend h2{margin:0 0 12px;color:#fde68a}.meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.meta-item{padding:12px;border-radius:14px;background:rgba(16,8,33,.52);border:1px solid rgba(250,204,21,.2)}.meta-item b{display:block;color:#facc15}.legend-list{display:flex;flex-wrap:wrap;gap:8px}.legend-list span{padding:6px 10px;border-radius:999px;background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.26)}.palace-table{width:100%;border-collapse:collapse;font-size:13px}.palace-table td,.palace-table th{border-bottom:1px solid rgba(255,255,255,.12);padding:8px;text-align:left;vertical-align:top}.toc ol{margin:0;padding-left:20px}.toc li{margin:8px 0}.toc span{display:inline-block;min-width:44px;color:#facc15}.zb-chapter{break-inside:avoid-page;page-break-inside:avoid;background:#fbf7ff;color:#241333}.zb-eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#7c3aed;font-size:12px}.zb-chapter h2{margin:8px 0 18px;color:#2e1065;font-size:26px}.zb-category{padding:14px 16px;margin:12px 0;border-radius:14px;background:#fff;border:1px solid #e9d5ff}.zb-category h3{margin:0 0 8px;color:#5b21b6;font-size:18px}.zb-category p{margin:0;white-space:pre-wrap;color:#2f2440}.notice{color:#d8ccff;font-size:13px}.footer{margin-top:22px;text-align:center;color:#c4b5fd;font-size:13px}@page{size:A4;margin:16mm 14mm 18mm}@media print{body{background:#fff}.page{padding:0}.cover,.panel,.toc,.legend,.zb-chapter{box-shadow:none}.cover{border-radius:0}.zb-chapter{break-before:page;page-break-before:always}.zb-chapter:first-of-type{break-before:auto;page-break-before:auto}}@media(max-width:720px){.cover h1{font-size:32px}.meta-grid{grid-template-columns:1fr}.page{padding:14px 10px 40px}}
  </style>
</head>
<body>
  <main class="page">
    <section class="cover">
      <p class="badge">Code:Destiny Premium Ziwei</p>
      <h1>자미두수 프리미엄 명반서</h1>
      <p>명궁과 12궁으로 읽는 나만의 운명 해설서</p>
      <p>${esc(profile.name)} · ${esc(profile.birthIso)}</p>
      <img src="/fuctionassets/jamipremiun.webp" alt="자미두수 프리미엄 리포트 표지 이미지" />
    </section>
    <section class="panel">
      <div class="meta-grid"><div class="meta-item"><b>명궁</b>${esc(seed.chart.mingGong || "확인 범위 내")}</div><div class="meta-item"><b>신궁</b>${esc(seed.chart.shenGong || "확인 범위 내")}</div><div class="meta-item"><b>발행일</b>${esc(new Date(generatedAt).toLocaleDateString("ko-KR"))}</div></div>
      <p class="notice">${fallbackUsed ? "일부 구간은 기본 명반 해석을 바탕으로 채워졌습니다." : "계산된 명반을 바탕으로 상담문을 정리했습니다."}</p>
    </section>
    <section class="legend"><h2>별 강도 기호</h2><div class="legend-list"><span>◎ 묘: 가장 강하게 드러나는 별</span><span>O 득: 안정적으로 힘을 얻은 별</span><span>▲ 리: 이롭게 활용할 수 있는 별</span><span>△ 평: 균형 관리가 필요한 별</span><span>X 함·실: 보완과 주의가 필요한 별</span></div></section>
    <section class="panel"><h2>12궁 핵심 명반</h2><table class="palace-table"><thead><tr><th>궁</th><th>지지</th><th>주성</th></tr></thead><tbody>${palaceSummary}</tbody></table></section>
    <section class="toc"><h2>목차</h2><ol>${toc}</ol></section>
    ${chapterHtml}
    <section class="footer">이 문서는 로컬 자미두수 명반 계산 결과와 프리미엄 상담문 보강을 바탕으로 작성되었습니다.</section>
  </main>
</body>
</html>`;
}

function buildPdfReadyPayload(profile, seed, chapters, metadata = {}) {
  const html = renderZiweiPdf({ profile, seed, chapters, generatedAt: new Date().toISOString(), fallbackUsed: Boolean(metadata.fallbackUsed) });
  return {
    title: `${stripForbiddenTokens(profile.name)} 자미두수 프리미엄 명반서`,
    filename: `ziwei-premium-${String(profile.name || "user").replace(/\s+/g, "-").toLowerCase()}.html`,
    generatedAt: new Date().toISOString(),
    html,
    chapters: chapters.map((chapter, index) => ({ chapter: index + 1, id: chapter.id, title: chapter.title, categories: chapter.categories, text: chapter.text, source: chapter.source })),
    metadata,
  };
}

async function handleChapters() {
  return json({ ok: true, serviceKey: ZIWEI_SERVICE_KEY, chapterCount: CHAPTER_BLUEPRINTS.length, chapters: CHAPTER_BLUEPRINTS });
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
  console.info("[ZiweiPremiumPDF][BirthInputValidated]", {
    hasBirthDate: Boolean(birthInput.birthDate),
    hasBirthTime: Boolean(birthInput.birthTime),
    birthHour: birthInput.birthHour,
    gender: birthInput.gender,
  });

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

  const premiumAccessToken = clean(
    request.headers.get("x-premium-access-token")
    || body?.premiumAccessToken
    || body?._premiumAccessToken
    || cookieValue(request, "cd_premium_access")
    || "",
  );
  const featureKey = normalizeFeatureKey(body?.featureKey);

  console.info("[ZiweiBook][Flow] BILLING_CHECK_START", { featureKey, userId: auth.userId });
  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "ziweiPremium", {
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
    sessionId: clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId),
    reportId: clean(body?.reportId || body?.accessGrant?.reportId),
    access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  await startPremiumPdfExecution(env, auth.userId, executionCtx);

  try {

  console.info("[ZiweiPremiumPDF][LocalDraftBuildStart]", { chapterCount: CHAPTER_BLUEPRINTS.length });
  const firstPass = buildLocalChapters(profile, seed, 1);
  const firstValidation = validateChapters(firstPass.chapters);
  const localBundle = firstValidation.ok ? firstPass : buildLocalChapters(profile, seed, 2);
  let localChapters = localBundle.chapters;
  const localValidation = validateChapters(localChapters);
  if (!localValidation.ok) {
    localChapters = buildLocalChapters(profile, seed, 3).chapters;
  }
  const localMetrics = validateChapters(localChapters);
  for (let idx = 0; idx < localChapters.length; idx += 1) {
    const chapter = localChapters[idx];
    const chapterChars = (Array.isArray(chapter.categories) ? chapter.categories : []).reduce(
      (sum, cat) => sum + stripForbiddenTokens(cat?.finalText || cat?.text || "").length,
      0,
    );
    console.info("[ZiweiPremiumPDF][LocalDraftChapterDone]", { chapter: idx + 1, chapterChars });
  }
  console.info("[ZiweiPremiumPDF][LocalDraftBuildSuccess]", {
    chapterCount: localChapters.length,
    totalChars: localMetrics.totalChars,
    localDraftValid: localMetrics.ok,
  });

  const completedChapters = localChapters.map((chapter) => ({ ...chapter, source: "local-only" }));
  const finalValidation = validateChapters(completedChapters);
  const finalBundleValidation = validateFinalManuscript({ birthInput, seed, chapters: completedChapters });
  const duplicateRate = computeDuplicateRate(completedChapters);
  if (!finalBundleValidation.ok || duplicateRate > 0.4) {
    throw new Error("자미두수 PDF 상담문 원고가 충분히 정리되지 않았습니다.");
  }
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

  console.info("[ZiweiPremiumPDF][PdfRenderStart]", { chapterCount: completedChapters.length, fallbackUsed: false });
  const ziweiPayload = buildZiweiPayload(profile, seed, completedChapters, { accessType: clean(access.accessType || "unknown") });
  const pdfReady = buildPdfReadyPayload(profile, seed, completedChapters, { featureKey, reportType: "ziweiPremium", fallbackUsed: false });
  console.info("[ZiweiPremiumPDF][PdfRenderSuccess]", { chapterCount: completedChapters.length });

  const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `ziwei-premium-${Date.now().toString(36)}`);
  await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
    manuscriptSource: "local-only",
    chapterCount: completedChapters.length,
    archive: {
      reportId,
      reportType: "ziwei_book",
      displayName: "자미두수",
      title: `${clean(profile?.name) || "사용자"}님의 자미두수 리포트`,
      mode: "personal",
      birthName: clean(profile?.name),
      summary: clean(completedChapters?.[0]?.sections?.[0]?.body || "", 1000),
      pdfUrl: clean(pdfReady?.pdfUrl),
      chapters: completedChapters,
      payload: ziweiPayload,
      pdfReady,
      canReopen: true,
      canDownload: Boolean(clean(pdfReady?.pdfUrl)),
    },
  });

  return json({
    ok: true,
    serviceKey: ZIWEI_SERVICE_KEY,
    featureKey,
    reportId,
    sessionId: executionCtx.sessionId || clean(body?.sessionId || body?.reportSessionId || ""),
    chapterCount: CHAPTER_BLUEPRINTS.length,
    chapters: completedChapters,
    payload: ziweiPayload,
    ziweiPayload,
    localZiweiChartJson: seed.localZiweiChartJson,
    pdfReady,
    fallbackUsed,
    localDraftChapterCount: localChapters.length,
    finalChapterCount: completedChapters.length,
  });
  } catch (error) {
    await failPremiumPdfExecution(
      env,
      auth.userId,
      executionCtx,
      "ziwei_generation_failed",
      clean(error?.message || "자미두수 PDF 생성에 실패했습니다."),
      "ziwei-generation",
    );
    throw error;
  }
}

export async function handleZiweiBookRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/ziwei-book");
    if (method === "GET" && (path === "/chapters" || path === "chapters")) return await handleChapters();
    if (method === "POST" && (path === "" || path === "/" || path === "/prepare" || path === "prepare")) return await handlePrepare(request, env);
    if (!["GET", "POST"].includes(method)) return methodNotAllowed(["GET", "POST"]);
    return json({ ok: false, serviceKey: ZIWEI_SERVICE_KEY, message: "지원하지 않는 자미두수 PDF 경로입니다." }, { status: 404 });
  } catch (error) {
    console.error("[ZiweiPremiumPDF][Error]", normalizeZiweiError(error));
    return handleRouteError(error, "ZiweiBookRoutes");
  }
}

export const __ziweiBookTestUtils = {
  CHAPTER_BLUEPRINTS,
  buildZiweiPdfSeed,
  buildZiweiLocalChapterGuide,
  validateZiweiPdfChapterQuality,
  buildLocalChapters,
  validateChapters,
  normalizeInput,
  parseHourMinuteFromText,
  buildZiweiLocalPremiumManuscript,
  computeDuplicateRate,
  validateNoZiweiPdfRepetition,
};