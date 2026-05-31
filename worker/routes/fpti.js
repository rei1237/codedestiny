import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";

const CHAPTER_MIN = 1400;
const SECTION_MIN = 350;
const CHAPTER_SUMMARY_MIN = 180;
const FPTI_REPORT_TYPE = "fptiPremium";
const FPTI_FEATURE_KEY = "premium-fpti-report";
const FPTI_DEEP_SCHEMA_VERSION = "fpti-deep-v3.0.0";
const PLACEHOLDER_TITLE_PATTERN = /\b(섹션|section|카테고리|category|챕터|chapter)\s*\d+\b/i;
const CHAPTERS = [
  {
    id: "overview",
    title: "FPTI 유형 총론 - 나의 운명 성향 코드",
    categories: [
      "FPTI 코드가 말해주는 기본 기질",
      "대표 십성이 만드는 성격의 중심축",
      "겉모습과 실제 내면의 차이",
      "반복되는 선택 패턴",
      "이 유형이 강해지는 조건",
      "이 유형이 흔들리는 조건",
    ],
  },
  {
    id: "inner",
    title: "내면 성격과 감정 패턴",
    categories: [
      "감정을 받아들이는 기본 방식",
      "무의식적으로 자신을 지키는 방식",
      "가까운 사람 앞에서 드러나는 진짜 모습",
      "혼자 있을 때 회복되는 리듬",
      "감정이 쌓였을 때 나타나는 신호",
      "마음을 안정시키는 현실적 기준",
    ],
  },
  {
    id: "relationship",
    title: "관계와 연애 패턴",
    categories: [
      "사람을 끌어당기는 매력 포인트",
      "좋아하는 사람 앞에서 나타나는 행동",
      "관계에서 반복되는 기대와 실망",
      "연애에서 강점이 되는 십성",
      "관계를 망치기 쉬운 그림자",
      "건강한 관계를 위한 조율 전략",
    ],
  },
  {
    id: "career",
    title: "일과 재능의 사용 방식",
    categories: [
      "타고난 일 처리 방식",
      "성과가 잘 나는 환경",
      "피해야 하는 업무 구조",
      "십성으로 보는 재능 사용법",
      "리더십과 협업 방식",
      "직업적 성장 전략",
    ],
  },
  {
    id: "wealth",
    title: "돈과 현실 감각",
    categories: [
      "돈을 바라보는 기본 태도",
      "소비와 저축의 무의식 패턴",
      "재성 구조로 보는 현실 감각",
      "돈 때문에 흔들리는 지점",
      "안정적인 수익 구조를 만드는 방식",
      "현실 판단력을 높이는 습관",
    ],
  },
  {
    id: "stress",
    title: "스트레스와 그림자 성향",
    categories: [
      "압박을 받을 때 나타나는 반응",
      "과잉 십성이 만드는 문제",
      "부족한 십성이 만드는 불안",
      "인간관계에서 드러나는 방어기제",
      "무너질 때 반복하는 선택",
      "회복을 위한 현실적 처방",
    ],
  },
  {
    id: "growth",
    title: "성장 전략과 실행 로드맵",
    categories: [
      "이 유형의 인생 성장 방향",
      "지금 가장 먼저 고쳐야 할 습관",
      "관계·일·돈의 균형 전략",
      "30일 실행 루틴",
      "90일 변화 로드맵",
      "이 유형에게 필요한 한 문장",
    ],
  },
];

function clean(value) {
  return String(value || "").trim();
}

function stripRomanPrefix(value) {
  return String(value || "")
    .replace(/^\s*[IVXLCDM]+\.\s*/gi, "")
    .replace(/^\s*[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\.\s*/g, "")
    .trim();
}

function isPlaceholderTitle(value) {
  return PLACEHOLDER_TITLE_PATTERN.test(clean(value));
}

function toIso(value) {
  const d = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function buildReportSignature(input) {
  const axis = input?.axisScores || {};
  const ev = input?.evidence || {};
  const base = [
    clean(input?.code),
    clean(input?.typeName),
    Number(axis.A || 0),
    Number(axis.M || 0),
    Number(axis.H || 0),
    Number(axis.L || 0),
    Number(axis.F || 0),
    Number(axis.B || 0),
    Number(axis.R || 0),
    Number(axis.V || 0),
    clean(ev.dayMaster),
    clean(ev.monthBranch),
  ].join("|").toLowerCase();

  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `fpti-${hash.toString(16).padStart(8, "0")}`;
}

function takeTenGods(input) {
  const list = clampList(input?.evidence?.strongTenGods, 4);
  return {
    primary: list[0] || "정인",
    secondary: list[1] || "정관",
    tertiary: list[2] || "식신",
  };
}

function takeElements(input) {
  return {
    strong: clampList(input?.evidence?.strongElements, 2).join(" · ") || "목 · 화",
    weak: clampList(input?.evidence?.weakElements, 2).join(" · ") || "금 · 수",
  };
}

const BASE_USE_SIGNALS = Object.freeze([
  "code",
  "typeName",
  "axisScores",
  "evidence.dayMaster",
  "evidence.monthBranch",
  "evidence.strongTenGods",
  "evidence.strongElements",
  "evidence.weakElements",
]);

const CHAPTER_STYLES = Object.freeze({
  overview: "성향 지도처럼 명확하고 압축적인 문체",
  inner: "심리 상담처럼 따뜻하지만 구체적인 문체",
  relationship: "연애 상담처럼 현실적인 대화와 행동 중심 문체",
  career: "커리어 컨설팅처럼 성과 구조 중심 문체",
  wealth: "재무 습관 코칭처럼 현실적이고 숫자 감각 있는 문체",
  stress: "위기 진단과 회복 매뉴얼 중심의 실용 문체",
  growth: "실행 로드맵 중심의 단계형 문체",
});

const CHAPTER_POLICY_MAP = Object.freeze({
  overview: Object.freeze({
    "FPTI 코드가 말해주는 기본 기질": {
      diagnosisFocus: "코드 전체의 기질 중심축과 생활 리듬을 확정한다.",
      useSignals: [...BASE_USE_SIGNALS, "strengths", "weaknesses"],
      readingRules: "상위 축 2개는 기본 성향, 하위 축은 흔들림 구간으로 읽고 대표 십성 1~3개가 어떤 순서로 반응하는지 연결한다.",
      mustInclude: "코드·타입명, 상위/하위 축, 대표 십성, 강한/약한 오행, 강점과 그림자 조건을 명시한다.",
      avoid: "타입 소개만 반복하는 문장, 의미 없는 추상어 나열.",
      actionGuide: "하루 판단 기준 1개와 중단 기준 1개를 문장으로 고정해 선택 편차를 줄인다.",
    },
    "대표 십성이 만드는 성격의 중심축": {
      diagnosisFocus: "대표 십성이 성격 중심축을 어떻게 만들고 왜 반복 반응이 생기는지 밝힌다.",
      useSignals: [...BASE_USE_SIGNALS, "strengths", "growthTips"],
      readingRules: "강한 십성은 주도 반응, 보조 십성은 의사결정 후속 반응으로 분리해서 해석한다.",
      mustInclude: "대표 십성 1~3개의 역할 분담과 강점/위험 전환 조건을 포함한다.",
      avoid: "십성 이름만 열거하고 역할 차이를 설명하지 않는 문장.",
      actionGuide: "주도 십성은 유지 규칙, 보조 십성은 과열 방지 규칙으로 각각 관리한다.",
    },
    "겉모습과 실제 내면의 차이": {
      diagnosisFocus: "외부 인상과 내면 반응 간 간극이 생기는 장면을 진단한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "loveTips"],
      readingRules: "에너지축/판단축의 편차가 클수록 겉-속 불일치가 커진다는 가정으로 읽는다.",
      mustInclude: "겉모습 강점, 내면 부담, 갈등 트리거, 조율 포인트를 모두 제시한다.",
      avoid: "성격이 복합적이라는 말만 반복하는 설명.",
      actionGuide: "중요 대화 전에 의도 1줄·경계 1줄을 먼저 정리해 표현 왜곡을 줄인다.",
    },
    "반복되는 선택 패턴": {
      diagnosisFocus: "좋은 선택과 나쁜 선택이 반복되는 패턴의 공통 조건을 찾는다.",
      useSignals: [...BASE_USE_SIGNALS, "strengths", "weaknesses", "growthTips"],
      readingRules: "상위 축은 선택 가속, 하위 축은 후반 품질 저하 요인으로 읽는다.",
      mustInclude: "반복 패턴의 시작 신호·중간 오류·마무리 실패 지점을 포함한다.",
      avoid: "의지가 부족하다는 식의 단순 원인화.",
      actionGuide: "선택 전 체크리스트 3항목(목표·리스크·종료조건)을 고정한다.",
    },
    "이 유형이 강해지는 조건": {
      diagnosisFocus: "성과가 자연스럽게 나는 환경 조건을 구조화한다.",
      useSignals: [...BASE_USE_SIGNALS, "careerTips", "strengths"],
      readingRules: "강한 오행과 상위 축이 동시에 살아나는 상황을 강화 조건으로 본다.",
      mustInclude: "강화 환경, 협업 방식, 에너지 관리 조건을 명확히 적는다.",
      avoid: "무조건 열심히 하면 된다는 식의 권유.",
      actionGuide: "강화 조건 3개를 주간 캘린더에 고정 배치해 재현성을 높인다.",
    },
    "이 유형이 흔들리는 조건": {
      diagnosisFocus: "무너짐의 전조와 손실 확대 조건을 조기에 식별한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "growthTips"],
      readingRules: "약한 오행과 하위 축이 겹치는 시점을 핵심 리스크 구간으로 판단한다.",
      mustInclude: "전조 신호, 잘못된 대응, 손실 차단 규칙을 포함한다.",
      avoid: "불안하면 쉬라는 단선적 처방.",
      actionGuide: "흔들림 신호 2개 이상 발생 시 의사결정 24시간 유예 규칙을 적용한다.",
    },
  }),
  inner: Object.freeze({
    "감정을 받아들이는 기본 방식": {
      diagnosisFocus: "감정 인지-처리-복귀의 기본 순서를 진단한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "growthTips"],
      readingRules: "판단축과 실행축의 차이를 감정 처리 속도 차이로 읽는다.",
      mustInclude: "감정 반응 속도, 누적 방식, 안정화 순서를 명시한다.",
      avoid: "마음을 다스리면 된다는 일반론.",
      actionGuide: "감정 기록을 사실/해석/행동 3줄로 분리해 매일 1회 수행한다.",
    },
    "무의식적으로 자신을 지키는 방식": {
      diagnosisFocus: "방어기제가 발동되는 무의식 패턴을 파악한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "loveTips"],
      readingRules: "약한 오행과 하위 축이 겹치는 상황에서 회피/과통제 패턴을 구분한다.",
      mustInclude: "방어기제 유형, 촉발 상황, 관계 영향, 완충 전략을 담는다.",
      avoid: "성격 탓으로 단정하는 문장.",
      actionGuide: "반응 전에 멈춤 문장 1개를 준비해 자동 방어를 늦춘다.",
    },
    "가까운 사람 앞에서 드러나는 진짜 모습": {
      diagnosisFocus: "친밀한 관계에서 나타나는 본심과 감정 언어를 해석한다.",
      useSignals: [...BASE_USE_SIGNALS, "loveTips", "strengths"],
      readingRules: "대표 십성의 관계 반응을 공감 방식과 경계 방식으로 나눠 읽는다.",
      mustInclude: "신뢰 장면의 강점, 충돌 장면의 취약점, 대화 조정 기준을 포함한다.",
      avoid: "가까운 사람이라서 그렇다는 식의 회피.",
      actionGuide: "관계 대화에서 요청/감정/기한 3요소를 매번 분리해 전달한다.",
    },
    "혼자 있을 때 회복되는 리듬": {
      diagnosisFocus: "혼자 있을 때 에너지가 회복되는 리듬 조건을 찾는다.",
      useSignals: [...BASE_USE_SIGNALS, "growthTips"],
      readingRules: "에너지축과 전망축 조합을 회복 속도와 재집중 품질로 읽는다.",
      mustInclude: "회복 시간대, 회복 방법, 회복 실패 트리거를 적는다.",
      avoid: "쉬면 회복된다는 단순 설명.",
      actionGuide: "주 3회 40분 회복 블록을 고정해 일정 충돌을 차단한다.",
    },
    "감정이 쌓였을 때 나타나는 신호": {
      diagnosisFocus: "감정 누적의 조기 경보 신호를 구체적으로 식별한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses"],
      readingRules: "하위 축 점수와 약한 오행을 누적 신호의 민감도 지표로 읽는다.",
      mustInclude: "신체/행동/대화 신호 3종과 임계점 대응을 포함한다.",
      avoid: "감정이 많아진다는 모호한 표현.",
      actionGuide: "신호 3개 중 2개가 뜨면 일정 강도를 30% 낮춘다.",
    },
    "마음을 안정시키는 현실적 기준": {
      diagnosisFocus: "정서 안정에 실제로 효과 있는 현실 기준을 고정한다.",
      useSignals: [...BASE_USE_SIGNALS, "growthTips", "careerTips"],
      readingRules: "대표 십성과 상위 축을 이용해 안정 기준의 우선순위를 설정한다.",
      mustInclude: "하루 기준, 주간 기준, 관계 기준을 각각 포함한다.",
      avoid: "긍정적으로 생각하라는 선언형 문장.",
      actionGuide: "아침 기준 1개·저녁 점검 1개를 루틴으로 자동화한다.",
    },
  }),
  relationship: Object.freeze({
    "사람을 끌어당기는 매력 포인트": {
      diagnosisFocus: "매력이 실제 관계 유입으로 이어지는 포인트를 정의한다.",
      useSignals: [...BASE_USE_SIGNALS, "loveTips", "strengths"],
      readingRules: "상위 축은 매력 발산 강도, 대표 십성은 매력의 결을 결정한다고 본다.",
      mustInclude: "첫인상 장점, 지속 매력 조건, 과열 리스크를 담는다.",
      avoid: "인기가 많다 같은 결과만 제시하는 문장.",
      actionGuide: "매력 포인트 1개를 대화 행동으로 번역해 주 3회 반복한다.",
    },
    "좋아하는 사람 앞에서 나타나는 행동": {
      diagnosisFocus: "호감 상황에서의 행동 패턴과 오해 포인트를 파악한다.",
      useSignals: [...BASE_USE_SIGNALS, "loveTips", "weaknesses"],
      readingRules: "판단축과 실행축의 차이를 표현 속도와 표현 방식 차이로 해석한다.",
      mustInclude: "호감 표현 방식, 실수 패턴, 수정 가능한 대화 습관을 포함한다.",
      avoid: "진심이면 통한다는 식의 낙관론.",
      actionGuide: "호감 표현은 관찰-감정-요청 순서 3문장으로 통일한다.",
    },
    "관계에서 반복되는 기대와 실망": {
      diagnosisFocus: "기대-실망 루프의 반복 구조를 정확히 분해한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "loveTips"],
      readingRules: "약한 오행과 하위 축이 활성화되는 구간을 실망 루프 구간으로 지정한다.",
      mustInclude: "기대 설정 오류, 확인 부족, 감정 과해석 구간을 설명한다.",
      avoid: "상대가 문제라는 단정형 문장.",
      actionGuide: "기대는 요청 문장으로, 실망은 확인 질문으로 전환한다.",
    },
    "연애에서 강점이 되는 십성": {
      diagnosisFocus: "연애 장면에서 강점으로 작동하는 십성의 사용법을 제시한다.",
      useSignals: [...BASE_USE_SIGNALS, "loveTips", "strengths"],
      readingRules: "대표 십성 1~3개를 신뢰 형성/갈등 조율/관계 유지 기능으로 배치한다.",
      mustInclude: "십성별 강점 발휘 장면과 과사용 리스크를 함께 제시한다.",
      avoid: "십성이 좋다/나쁘다 식의 이분법.",
      actionGuide: "강점 십성은 유지 규칙, 과열 십성은 감속 규칙으로 분리한다.",
    },
    "관계를 망치기 쉬운 그림자": {
      diagnosisFocus: "연애/관계를 무너뜨리는 그림자 패턴을 조기 차단한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "loveTips"],
      readingRules: "하위 축과 약한 오행의 동시 저하를 그림자 활성 신호로 본다.",
      mustInclude: "질투/회피/통제 등 그림자 행동과 차단 규칙을 포함한다.",
      avoid: "원래 그런 성격이라는 체념형 설명.",
      actionGuide: "갈등 시 바로 결론 내리지 않고 24시간 합의 규칙을 적용한다.",
    },
    "건강한 관계를 위한 조율 전략": {
      diagnosisFocus: "관계를 지속시키는 조율 프로토콜을 설계한다.",
      useSignals: [...BASE_USE_SIGNALS, "loveTips", "growthTips"],
      readingRules: "상위 축은 관계 추진, 하위 축은 관계 유지 리스크로 나눠 조율한다.",
      mustInclude: "경계 설정, 합의 빈도, 복구 절차를 포함한다.",
      avoid: "배려만 강조하고 기준을 빼는 문장.",
      actionGuide: "주 1회 관계 점검 대화를 고정해 오해를 누적시키지 않는다.",
    },
  }),
  career: Object.freeze({
    "타고난 일 처리 방식": {
      diagnosisFocus: "착수-진행-완료의 고유 작업 리듬을 진단한다.",
      useSignals: [...BASE_USE_SIGNALS, "careerTips", "strengths"],
      readingRules: "실행축은 착수 속도, 판단축은 완성도 관리 능력으로 읽는다.",
      mustInclude: "작업 시작 방식, 병목 구간, 완료 방식 차이를 포함한다.",
      avoid: "열심히 하는 스타일 같은 포괄 표현.",
      actionGuide: "모든 업무를 착수 기준/완료 기준 2줄로 고정한다.",
    },
    "성과가 잘 나는 환경": {
      diagnosisFocus: "성과가 재현되는 환경 요인을 명시한다.",
      useSignals: [...BASE_USE_SIGNALS, "careerTips", "strengths"],
      readingRules: "강한 오행과 상위 축이 동시 충족되는 환경을 핵심 환경으로 본다.",
      mustInclude: "협업 구조, 보고 방식, 집중 시간대 조건을 제시한다.",
      avoid: "어디서든 잘한다는 무차별 결론.",
      actionGuide: "성과 환경 조건 3개를 현재 업무에 바로 매핑한다.",
    },
    "피해야 하는 업무 구조": {
      diagnosisFocus: "생산성을 떨어뜨리는 업무 구조를 명확히 차단한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "careerTips"],
      readingRules: "하위 축과 약한 오행이 겹치는 구조를 회피 구조로 지정한다.",
      mustInclude: "과부하 구조, 의사결정 지연 구조, 재작업 구조를 포함한다.",
      avoid: "상황이 나쁘면 힘들다 같은 상식 문장.",
      actionGuide: "금지 업무 구조 리스트를 만들어 요청 수락 전에 체크한다.",
    },
    "십성으로 보는 재능 사용법": {
      diagnosisFocus: "대표 십성을 직무 역량으로 변환하는 방법을 제시한다.",
      useSignals: [...BASE_USE_SIGNALS, "careerTips", "strengths"],
      readingRules: "대표 십성 1~3개를 기획/실행/관리 역할로 분할 배치한다.",
      mustInclude: "십성별 강점 직무, 과사용 리스크, 보완 역할을 포함한다.",
      avoid: "특정 직업 단정 추천.",
      actionGuide: "현재 역할에서 십성 강점이 발휘되는 업무 비중을 늘린다.",
    },
    "리더십과 협업 방식": {
      diagnosisFocus: "리더십 발휘 방식과 협업 마찰 포인트를 구조화한다.",
      useSignals: [...BASE_USE_SIGNALS, "careerTips", "loveTips"],
      readingRules: "상위 축은 추진 방식, 하위 축은 마찰 지점으로 해석한다.",
      mustInclude: "의사결정 방식, 피드백 방식, 위임 방식의 장단점을 포함한다.",
      avoid: "리더형/팔로워형 이분법.",
      actionGuide: "협업 시 요청-책임-기한 3요소를 문장으로 확정한다.",
    },
    "직업적 성장 전략": {
      diagnosisFocus: "단기 성과와 장기 성장의 균형 전략을 설계한다.",
      useSignals: [...BASE_USE_SIGNALS, "careerTips", "growthTips"],
      readingRules: "전망축과 실행축을 이용해 3개월/12개월 성장 구조를 나눈다.",
      mustInclude: "역량 축적, 역할 확장, 리스크 관리 3단계 계획을 넣는다.",
      avoid: "꾸준히 하면 는다 같은 공허한 조언.",
      actionGuide: "월 단위 성장 지표 2개와 분기 리뷰를 고정한다.",
    },
  }),
  wealth: Object.freeze({
    "돈을 바라보는 기본 태도": {
      diagnosisFocus: "돈 의사결정의 기본 태도와 심리적 반응을 해석한다.",
      useSignals: [...BASE_USE_SIGNALS, "strengths", "weaknesses"],
      readingRules: "재성 관련 십성과 판단축 점수를 함께 읽어 재무 태도를 판단한다.",
      mustInclude: "돈에 대한 안정/불안 반응과 의사결정 습관을 포함한다.",
      avoid: "돈복이 있다/없다식 단정.",
      actionGuide: "지출 전 10분 검토 규칙으로 충동 결정을 줄인다.",
    },
    "소비와 저축의 무의식 패턴": {
      diagnosisFocus: "반복되는 소비/저축 무의식 패턴을 분리 진단한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "growthTips"],
      readingRules: "약한 오행과 하위 축 점수 저하를 비계획 소비 신호로 본다.",
      mustInclude: "보상 소비 트리거, 저축 유지 조건, 실패 시 복귀법을 넣는다.",
      avoid: "절약만 강조하는 일방 처방.",
      actionGuide: "소비를 생존/성장/만족 3계정으로 분리해 월간 추적한다.",
    },
    "재성 구조로 보는 현실 감각": {
      diagnosisFocus: "재성 구조가 현실 판단력에 미치는 영향을 해석한다.",
      useSignals: [...BASE_USE_SIGNALS, "careerTips", "strengths"],
      readingRules: "대표 십성과 재성 성향을 수익 안정성/확장성 지표로 읽는다.",
      mustInclude: "현실 판단 강점, 판단 오류 구간, 보완 루틴을 포함한다.",
      avoid: "운이 좋아서 번다 식의 운빨 설명.",
      actionGuide: "월별 고정비/변동비 비율 목표를 수치로 고정한다.",
    },
    "돈 때문에 흔들리는 지점": {
      diagnosisFocus: "재정 스트레스 상황에서 흔들리는 의사결정 포인트를 찾는다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses"],
      readingRules: "하위 축과 약한 오행이 겹치는 시점을 손실 위험 구간으로 본다.",
      mustInclude: "흔들림 전조, 반복 실수, 손실 차단 규칙을 포함한다.",
      avoid: "멘탈 관리만 하면 된다는 모호한 조언.",
      actionGuide: "큰 지출/투자는 24시간 유예 후 재검토한다.",
    },
    "안정적인 수익 구조를 만드는 방식": {
      diagnosisFocus: "수익을 안정적으로 누적시키는 구조를 설계한다.",
      useSignals: [...BASE_USE_SIGNALS, "careerTips", "growthTips"],
      readingRules: "상위 축은 수익 확장, 하위 축은 유지 리스크로 분리 해석한다.",
      mustInclude: "단기 현금흐름, 중기 수익원, 장기 자산화 전략을 제시한다.",
      avoid: "한 방 전략이나 고수익 환상.",
      actionGuide: "수익원을 핵심/보조/실험 3포트로 나누어 운영한다.",
    },
    "현실 판단력을 높이는 습관": {
      diagnosisFocus: "재무 판단 정확도를 높이는 습관을 구체화한다.",
      useSignals: [...BASE_USE_SIGNALS, "growthTips", "careerTips"],
      readingRules: "판단축과 전망축을 결합해 의사결정 정확도 개선 루틴을 설정한다.",
      mustInclude: "검토 기준, 기록 방식, 월간 점검 지표를 포함한다.",
      avoid: "감각적으로 하라는 비구조 조언.",
      actionGuide: "주간 재무 리뷰 20분을 고정하고 실수 패턴을 업데이트한다.",
    },
  }),
  stress: Object.freeze({
    "압박을 받을 때 나타나는 반응": {
      diagnosisFocus: "압박 상황에서의 즉각 반응과 후속 반응을 분리 진단한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses"],
      readingRules: "하위 축 반응을 기준으로 과속형/지연형 압박 반응을 구분한다.",
      mustInclude: "압박 신호, 반응 순서, 손실 확대 조건을 포함한다.",
      avoid: "스트레스에 약하다는 낙인형 문장.",
      actionGuide: "압박 상황에서 즉시 결정 대신 3분 점검 루틴을 먼저 실행한다.",
    },
    "과잉 십성이 만드는 문제": {
      diagnosisFocus: "과잉 활성 십성이 만드는 과부하 문제를 규명한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "strengths"],
      readingRules: "대표 십성이 과열될 때 강점이 리스크로 전환되는 순간을 찾는다.",
      mustInclude: "과열 징후, 관계 손상, 업무 손실 패턴을 포함한다.",
      avoid: "강점은 무조건 좋다는 해석.",
      actionGuide: "과열 십성별 감속 기준을 문장으로 지정한다.",
    },
    "부족한 십성이 만드는 불안": {
      diagnosisFocus: "부족 십성으로 인한 공백과 불안 패턴을 보완한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "growthTips"],
      readingRules: "부족 십성 영역을 타인 의존/결정 지연/회피 반응과 연결해 읽는다.",
      mustInclude: "부족 영역, 보완 행동, 외부 지원 활용법을 포함한다.",
      avoid: "원래 부족하니 어쩔 수 없다는 체념.",
      actionGuide: "부족 십성 기능을 대체할 체크리스트를 루틴화한다.",
    },
    "인간관계에서 드러나는 방어기제": {
      diagnosisFocus: "관계 갈등에서 자동으로 나오는 방어기제를 조기 차단한다.",
      useSignals: [...BASE_USE_SIGNALS, "loveTips", "weaknesses"],
      readingRules: "하위 축 저하 시 방어기제가 강화된다는 가정으로 대화 패턴을 읽는다.",
      mustInclude: "방어 문장 패턴, 오해 발생 지점, 복구 절차를 포함한다.",
      avoid: "관계는 원래 어렵다는 포기형 문장.",
      actionGuide: "갈등 대화 전 사실/해석 구분 문장을 먼저 작성한다.",
    },
    "무너질 때 반복하는 선택": {
      diagnosisFocus: "붕괴 시 반복되는 잘못된 선택 루프를 끊는다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "growthTips"],
      readingRules: "약한 오행과 하위 축 동시 저하를 붕괴 루프 시작점으로 본다.",
      mustInclude: "붕괴 루프 단계, 최악 시나리오, 차단 행동을 넣는다.",
      avoid: "멘탈만 강하면 해결된다는 단순화.",
      actionGuide: "붕괴 루프 첫 단계에서 즉시 실행할 복귀 행동 1개를 고정한다.",
    },
    "회복을 위한 현실적 처방": {
      diagnosisFocus: "회복을 일상 운영 규칙으로 전환한다.",
      useSignals: [...BASE_USE_SIGNALS, "growthTips", "careerTips"],
      readingRules: "에너지축과 실행축 회복 속도를 기반으로 처방 강도를 설정한다.",
      mustInclude: "즉시 처방, 7일 처방, 30일 유지 처방을 포함한다.",
      avoid: "휴식만 강조하는 비실행 조언.",
      actionGuide: "회복 체크리스트를 주간 스케줄에 고정해 자동 실행한다.",
    },
  }),
  growth: Object.freeze({
    "이 유형의 인생 성장 방향": {
      diagnosisFocus: "장기 성장의 북극성 방향을 구체화한다.",
      useSignals: [...BASE_USE_SIGNALS, "growthTips", "careerTips"],
      readingRules: "전망축과 대표 십성을 중심으로 성장 방향을 도출한다.",
      mustInclude: "1년 방향, 핵심 역량, 피해야 할 방향을 제시한다.",
      avoid: "성장하면 좋아진다는 선언형 문장.",
      actionGuide: "분기별 성장 목표 1개를 수치 지표와 함께 설정한다.",
    },
    "지금 가장 먼저 고쳐야 할 습관": {
      diagnosisFocus: "즉시 개선 효과가 큰 핵심 습관을 1순위로 지정한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "growthTips"],
      readingRules: "하위 축과 반복 약점을 연결해 우선 수정 습관을 결정한다.",
      mustInclude: "현재 습관 문제, 대체 습관, 유지 장치를 포함한다.",
      avoid: "여러 습관을 한 번에 바꾸라는 과부하 처방.",
      actionGuide: "첫 14일은 습관 1개만 추적해 성공률을 올린다.",
    },
    "관계·일·돈의 균형 전략": {
      diagnosisFocus: "세 영역의 균형 충돌을 조정하는 운영 규칙을 만든다.",
      useSignals: [...BASE_USE_SIGNALS, "loveTips", "careerTips", "growthTips"],
      readingRules: "상위 축 강점이 한 영역에 과집중되지 않도록 분산 규칙을 둔다.",
      mustInclude: "관계/일/돈 각각의 최소 유지 기준을 포함한다.",
      avoid: "세 영역 모두 완벽히 하라는 비현실 조언.",
      actionGuide: "주간 시간 배분을 관계 30/일 50/돈 20 기준으로 점검한다.",
    },
    "30일 실행 루틴": {
      diagnosisFocus: "30일 동안 유지 가능한 실행 루틴을 단계별로 설계한다.",
      useSignals: [...BASE_USE_SIGNALS, "growthTips", "weaknesses"],
      readingRules: "1주차 안정화, 2주차 실행 고정, 3주차 조정, 4주차 정착 구조로 해석한다.",
      mustInclude: "주차별 목표, 점검 지표, 실패 시 복귀 규칙을 포함한다.",
      avoid: "루틴만 만들면 된다는 형식적 문장.",
      actionGuide: "30일 루틴은 하루 핵심 행동 1개와 저녁 체크 1개로 고정한다.",
    },
    "90일 변화 로드맵": {
      diagnosisFocus: "90일 변화 과정을 준비-확장-정착 단계로 설계한다.",
      useSignals: [...BASE_USE_SIGNALS, "growthTips", "careerTips", "loveTips"],
      readingRules: "월별 테마를 관계/성과/재정 균형으로 나누어 진행한다.",
      mustInclude: "1~30일, 31~60일, 61~90일 목표와 측정항목을 포함한다.",
      avoid: "장기 계획은 유연해야 한다는 이유로 기준을 생략하는 문장.",
      actionGuide: "매 30일마다 성과·피로·지속성 3지표를 리뷰한다.",
    },
    "이 유형에게 필요한 한 문장": {
      diagnosisFocus: "위기 시 방향을 되돌리는 핵심 문장을 확정한다.",
      useSignals: [...BASE_USE_SIGNALS, "weaknesses", "growthTips"],
      readingRules: "상위 축 강점은 유지하고 하위 축 리스크를 제어하는 문장으로 압축한다.",
      mustInclude: "행동 중심의 한 문장, 적용 장면, 반복 규칙을 포함한다.",
      avoid: "의미만 좋고 행동이 없는 문장.",
      actionGuide: "핵심 문장을 아침 시작 루틴과 저녁 점검 루틴에 모두 배치한다.",
    },
  }),
});

function chapterTone(chapterId) {
  if (chapterId === "overview") return "성향 지도";
  if (chapterId === "inner") return "감정 운영";
  if (chapterId === "relationship") return "관계 조율";
  if (chapterId === "career") return "일의 구조";
  if (chapterId === "wealth") return "현실 재정";
  if (chapterId === "stress") return "위기 복원";
  return "성장 실행";
}

function axisPair(input) {
  const axisScores = input?.axisScores || {};
  return Object.entries({
    A: Number(axisScores.A || 0),
    M: Number(axisScores.M || 0),
    H: Number(axisScores.H || 0),
    L: Number(axisScores.L || 0),
    F: Number(axisScores.F || 0),
    B: Number(axisScores.B || 0),
    R: Number(axisScores.R || 0),
    V: Number(axisScores.V || 0),
  })
    .sort((a, b) => b[1] - a[1]);
}

function tier(score) {
  if (score >= 70) return "상";
  if (score >= 45) return "중";
  return "하";
}

function selectPolicy(chapterId, categoryTitle) {
  const chapterPolicy = CHAPTER_POLICY_MAP[chapterId] || {};
  const policy = chapterPolicy[categoryTitle];
  if (policy) return policy;
  return {
    diagnosisFocus: `${categoryTitle}에서 실제로 반복되는 선택 패턴을 진단한다.`,
    useSignals: BASE_USE_SIGNALS,
    readingRules: "상위 축은 강점, 하위 축은 리스크 구간으로 읽는다.",
    mustInclude: "강점과 위험 신호를 모두 제시한다.",
    avoid: "추상적인 설명 반복.",
    actionGuide: "하루 행동 기준 1개를 고정한다.",
  };
}

function buildMustIncludeLine(policy) {
  return `이 카테고리 필수 반영 항목은 ${policy.mustInclude} 입니다.`;
}

function buildAvoidLine(policy) {
  return `이 카테고리에서는 ${policy.avoid} 표현을 피해야 해석의 정확도가 올라갑니다.`;
}

function chapterDetailFrame(chapter, categoryTitle, policy, input, ten, elements) {
  const axis = input?.axisScores || {};
  const topAxis = axisPair(input)[0] || ["A", 50];
  const lowAxis = axisPair(input).slice(-1)[0] || ["V", 50];
  const style = CHAPTER_STYLES[chapter.id] || "실행 중심 문체";
  const signalText = (Array.isArray(policy.useSignals) ? policy.useSignals : BASE_USE_SIGNALS).join(", ");

  if (chapter.id === "overview") {
    return {
      diagnosis: `${chapter.title}의 ${categoryTitle}은 ${policy.diagnosisFocus} 코드 ${input.code}(${input.typeName})는 상위 축 ${topAxis[0]} ${topAxis[1]}(${tier(topAxis[1])})이 기질을 끌고, 하위 축 ${lowAxis[0]} ${lowAxis[1]}(${tier(lowAxis[1])})이 흔들림을 만든다는 점이 핵심입니다.`,
      trigger: `${policy.readingRules} 대표 십성 ${ten.primary}/${ten.secondary}/${ten.tertiary}와 오행 ${elements.strong} 강세, ${elements.weak} 약세를 동시에 보면 강화 조건과 이탈 조건이 분명해집니다.`,
      execution: `${policy.actionGuide} ${buildMustIncludeLine(policy)} ${buildAvoidLine(policy)} 이 항목은 ${style}로 작성하며 사용 신호는 ${signalText} 입니다.`,
    };
  }

  if (chapter.id === "inner") {
    return {
      diagnosis: `${chapter.title}의 ${categoryTitle}은 ${policy.diagnosisFocus} ${input.typeName}의 감정 패턴은 상위 축 ${topAxis[0]}의 회복 탄력과 하위 축 ${lowAxis[0]}의 과민 반응이 교차하는 구조로 나타납니다.`,
      trigger: `${policy.readingRules} 일간 ${input.evidence.dayMaster}·월지 ${input.evidence.monthBranch}, 대표 십성 ${ten.primary}/${ten.secondary}/${ten.tertiary}, 오행 ${elements.strong}/${elements.weak}를 연결해 감정 누적 신호를 읽어야 합니다.`,
      execution: `${policy.actionGuide} ${buildMustIncludeLine(policy)} ${buildAvoidLine(policy)} 이 항목은 ${style}로 정리하며 사용 신호는 ${signalText} 입니다.`,
    };
  }

  if (chapter.id === "relationship") {
    return {
      diagnosis: `${chapter.title}의 ${categoryTitle}은 ${policy.diagnosisFocus} ${input.code} 유형은 호감 신호는 빠르지만 기대 조율이 늦어질 때 실망 루프가 반복되기 쉬우므로, 관계 언어를 행동 문장으로 바꿔야 합니다.`,
      trigger: `${policy.readingRules} 대표 십성 ${ten.primary}/${ten.secondary}/${ten.tertiary}는 끌림, 경계, 조율 역할을 나눠서 읽고 오행 ${elements.strong}/${elements.weak}는 갈등 시 반응 강도를 보여 줍니다.`,
      execution: `${policy.actionGuide} ${buildMustIncludeLine(policy)} ${buildAvoidLine(policy)} 이 항목은 ${style}로 작성하며 사용 신호는 ${signalText} 입니다.`,
    };
  }

  if (chapter.id === "career") {
    return {
      diagnosis: `${chapter.title}의 ${categoryTitle}은 ${policy.diagnosisFocus} ${input.typeName}는 상위 축 ${topAxis[0]}와 ${axisPair(input)[1]?.[0] || "H"}가 성과 엔진이고, 하위 축 ${lowAxis[0]}는 병목 포인트로 작용합니다.`,
      trigger: `${policy.readingRules} 대표 십성 ${ten.primary}/${ten.secondary}/${ten.tertiary}를 기획-실행-관리 기능으로 배치하고 오행 ${elements.strong}/${elements.weak}로 업무 부하 허용치를 계산합니다.`,
      execution: `${policy.actionGuide} ${buildMustIncludeLine(policy)} ${buildAvoidLine(policy)} 이 항목은 ${style}로 정리하며 사용 신호는 ${signalText} 입니다.`,
    };
  }

  if (chapter.id === "wealth") {
    return {
      diagnosis: `${chapter.title}의 ${categoryTitle}은 ${policy.diagnosisFocus} ${input.code} 유형은 돈 판단에서 상위 축 가속이 강점이지만 하위 축 약화 시 충동/회피가 함께 올라오므로 수치 규칙이 필요합니다.`,
      trigger: `${policy.readingRules} 대표 십성 ${ten.primary}/${ten.secondary}/${ten.tertiary}는 수익화 성향을, 오행 ${elements.strong}/${elements.weak}는 소비 리스크 시점을 보여 줍니다.`,
      execution: `${policy.actionGuide} ${buildMustIncludeLine(policy)} ${buildAvoidLine(policy)} 이 항목은 ${style}로 작성하며 사용 신호는 ${signalText} 입니다.`,
    };
  }

  if (chapter.id === "stress") {
    return {
      diagnosis: `${chapter.title}의 ${categoryTitle}은 ${policy.diagnosisFocus} ${input.typeName}는 압박 시 버티기와 과통제가 번갈아 나타날 수 있어, 전조를 수치화한 회복 프로토콜이 필요합니다.`,
      trigger: `${policy.readingRules} 대표 십성 ${ten.primary}/${ten.secondary}/${ten.tertiary}와 오행 ${elements.strong}/${elements.weak}를 함께 보면 무너짐 루프의 시작점을 조기에 찾을 수 있습니다.`,
      execution: `${policy.actionGuide} ${buildMustIncludeLine(policy)} ${buildAvoidLine(policy)} 이 항목은 ${style}로 정리하며 사용 신호는 ${signalText} 입니다.`,
    };
  }

  return {
    diagnosis: `${chapter.title}의 ${categoryTitle}은 ${policy.diagnosisFocus} ${input.code}(${input.typeName})의 장기 성장은 상위 축 유지와 하위 축 보완을 분리 설계할 때 가장 빠르게 안정됩니다.`,
    trigger: `${policy.readingRules} 대표 십성 ${ten.primary}/${ten.secondary}/${ten.tertiary}, 오행 ${elements.strong}/${elements.weak}, 주요 축 점수 ${topAxis[0]} ${topAxis[1]} / ${lowAxis[0]} ${lowAxis[1]}를 성장 로드맵의 기준으로 씁니다.`,
    execution: `${policy.actionGuide} ${buildMustIncludeLine(policy)} ${buildAvoidLine(policy)} 이 항목은 ${style}로 작성하며 사용 신호는 ${signalText} 입니다.`,
  };
}

function buildCategoryBody(input, chapter, categoryTitle, index) {
  const policy = selectPolicy(chapter.id, categoryTitle);
  const ten = takeTenGods(input);
  const elements = takeElements(input);
  const axisScores = input?.axisScores || {};
  const axisA = Number(axisScores.A || 50);
  const axisM = Number(axisScores.M || 50);
  const axisH = Number(axisScores.H || 50);
  const axisL = Number(axisScores.L || 50);
  const axisF = Number(axisScores.F || 50);
  const axisB = Number(axisScores.B || 50);
  const axisR = Number(axisScores.R || 50);
  const axisV = Number(axisScores.V || 50);
  const mood = chapterTone(chapter.id);
  const frame = chapterDetailFrame(chapter, categoryTitle, policy, input, ten, elements);

  const strengthsJoined = clampList(input?.strengths, 3).join(" · ") || "기준 설정, 실행 일관성, 복구 탄력";
  const weaknessesJoined = clampList(input?.weaknesses, 3).join(" · ") || "과속 결정, 감정 과해석, 피로 누적";
  const growthJoined = clampList(input?.growthTips, 3).join(" · ") || "기준 문장 고정, 주간 리뷰, 복귀 루틴";
  const loveJoined = clampList(input?.loveTips, 2).join(" · ") || "요청과 감정 분리, 합의 빈도 유지";
  const careerJoined = clampList(input?.careerTips, 2).join(" · ") || "착수 기준 명확화, 완료 기준 고정";

  const lines = [
    `${chapter.title}의 ${categoryTitle}는 ${input.typeName}(${input.code})를 ${mood} 관점에서 해석하는 핵심 카테고리입니다.`,
    `사용 신호는 ${policy.useSignals.join(", ")}이며, 일간 ${input.evidence.dayMaster}·월지 ${input.evidence.monthBranch}·대표 십성 ${ten.primary}/${ten.secondary}/${ten.tertiary}·오행 ${elements.strong}/${elements.weak}를 함께 봅니다.`,
    `주요 축 점수는 A ${axisA}, M ${axisM}, H ${axisH}, L ${axisL}, F ${axisF}, B ${axisB}, R ${axisR}, V ${axisV}입니다. 상위 축은 강점 방향, 하위 축은 위험 구간으로 읽어 실제 장면에 연결합니다.`,
    `강점 해석은 ${strengthsJoined} 중심으로, 위험/그림자 해석은 ${weaknessesJoined} 중심으로 구성합니다.`,
    `관계 조언은 ${loveJoined}, 일/성과 조언은 ${careerJoined}, 성장 보강은 ${growthJoined}을 근거로 실행 문장으로 변환합니다.`,
    frame.diagnosis,
    frame.trigger,
    frame.execution,
  ];

  const strength = `${categoryTitle}의 강점 포인트는 ${ten.primary}·${ten.secondary} 십성이 상위 축과 결합될 때 ${strengthsJoined}이 실제 성과로 연결된다는 점입니다.`;
  const risk = `${categoryTitle}의 위험 포인트는 ${ten.tertiary} 또는 하위 축 약화 구간에서 ${weaknessesJoined} 패턴이 반복되며 판단 품질이 떨어지는 것입니다.`;
  const action = `${index + 1}단계 실행: ${policy.actionGuide}`;

  return {
    id: `${chapter.id}-cat-${index + 1}`,
    title: categoryTitle,
    body: lines.join(" "),
    strength,
    risk,
    action,
    advice: action,
  };
}

function toDeepChapters(input) {
  return CHAPTERS.map((chapter, index) => {
    const categories = Array.isArray(chapter.categories) ? chapter.categories : [];
    const sections = categories.map((categoryTitle, categoryIndex) => buildCategoryBody(input, chapter, categoryTitle, categoryIndex));
    return {
      id: clean(chapter.id || `chapter-${index + 1}`),
      order: index + 1,
      title: chapter.title,
      subtitle: "사주 십성 기반 심층 해석",
      preview: clean(sections[0]?.body || "").split(/(?<=[.!?])\s+/).slice(0, 2).join(" "),
      chapterSummary: `${chapter.title}은 ${input.typeName}(${input.code})의 핵심 패턴을 카테고리 6개로 분해해 보여주는 챕터입니다. 대표 십성 ${takeTenGods(input).primary}/${takeTenGods(input).secondary}/${takeTenGods(input).tertiary}, 오행 ${takeElements(input).strong}/${takeElements(input).weak}, 주요 축 점수 A ${Number(input?.axisScores?.A || 50)}·H ${Number(input?.axisScores?.H || 50)}·F ${Number(input?.axisScores?.F || 50)}·R ${Number(input?.axisScores?.R || 50)}를 함께 읽어 강점이 실제로 발휘되는 조건과 흔들림이 시작되는 조건을 분리합니다. 이 챕터는 추상 설명을 피하고, 각 카테고리마다 진단 핵심-해석 규칙-반드시 포함할 근거-실행 기준을 고정하여 중복 문장을 줄이고 실제 행동으로 이어지도록 설계했습니다.`,
      sections,
      categories: sections,
    };
  });
}

function toDeepPayload(local, reportSignature, persisted = {}, input = {}) {
  const chapters = toDeepChapters(input);
  return {
    reportType: "FPTI_DEEP_REPORT",
    productKey: FPTI_FEATURE_KEY,
    reportSignature,
    reportId: clean(persisted.reportId || `fpti-deep-${reportSignature}`),
    sessionId: clean(persisted.sessionId || reportSignature),
    title: clean(local?.title || "FPTI 프리미엄 심층 리포트"),
    summary: clean(local?.summary || ""),
    source: clean(local?.source || "local") || "local",
    generatedAt: toIso(local?.generatedAt),
    chapters,
    meta: {
      schemaVersion: FPTI_DEEP_SCHEMA_VERSION,
      chapterCount: CHAPTERS.length,
    },
  };
}

function reportNeedsUpgrade(archive) {
  const version = clean(archive?.meta?.schemaVersion);
  return version !== FPTI_DEEP_SCHEMA_VERSION;
}

function isArchivedReportUsable(archive) {
  if (!archive || typeof archive !== "object") {
    return { ok: false, reason: "archive_missing" };
  }

  if (reportNeedsUpgrade(archive)) {
    return { ok: false, reason: "schema_version_mismatch" };
  }

  const chapters = Array.isArray(archive.chapters) ? archive.chapters : [];
  if (chapters.length !== CHAPTERS.length) {
    return { ok: false, reason: "chapter_count_mismatch" };
  }

  for (let i = 0; i < CHAPTERS.length; i += 1) {
    const expectedChapter = CHAPTERS[i];
    const chapter = chapters[i] && typeof chapters[i] === "object" ? chapters[i] : null;
    const chapterTitle = stripRomanPrefix(chapter?.title);
    if (chapterTitle !== expectedChapter.title || isPlaceholderTitle(chapterTitle)) {
      return { ok: false, reason: `chapter_title_mismatch_${i + 1}` };
    }

    const sectionList = Array.isArray(chapter?.sections)
      ? chapter.sections
      : (Array.isArray(chapter?.categories) ? chapter.categories : []);
    if (sectionList.length < expectedChapter.categories.length) {
      return { ok: false, reason: `section_count_mismatch_${i + 1}` };
    }

    for (let j = 0; j < expectedChapter.categories.length; j += 1) {
      const section = sectionList[j] && typeof sectionList[j] === "object" ? sectionList[j] : null;
      const sectionTitle = stripRomanPrefix(section?.title);
      if (sectionTitle !== expectedChapter.categories[j] || isPlaceholderTitle(sectionTitle)) {
        return { ok: false, reason: `section_title_mismatch_${i + 1}_${j + 1}` };
      }
      const body = clean(section?.body || section?.interpretation);
      if (body.length < SECTION_MIN) {
        return { ok: false, reason: `section_body_too_short_${i + 1}_${j + 1}` };
      }
    }

    const chapterSummary = clean(chapter?.chapterSummary);
    if (chapterSummary.length < CHAPTER_SUMMARY_MIN) {
      return { ok: false, reason: `chapter_summary_too_short_${i + 1}` };
    }
  }

  return { ok: true, reason: "ok" };
}

async function createAndArchiveDeepReport(env, userId, reportSignature, input, access = {}) {
  const local = buildLocalReport(input);
  const report = toDeepPayload(local, reportSignature, {}, input);
  await writeArchivedReport(env, userId, reportSignature, report, access || {});
  return report;
}

async function readArchivedReport(env, userId, reportSignature) {
  await connectDb(env);
  const executionKey = `fpti-deep:${reportSignature}`;
  const doc = await ServiceExecutionTransaction.findOne({
    userId,
    executionKey,
    reportType: FPTI_REPORT_TYPE,
    status: "success",
    premiumStatus: "completed",
  })
    .sort({ completedAt: -1, updatedAt: -1 })
    .lean();

  const archive = doc?.metadata?.archive && typeof doc.metadata.archive === "object"
    ? doc.metadata.archive
    : null;
  if (!archive) return null;

  return {
    ...archive,
    reportSignature,
    reportId: clean(archive.reportId || doc?.reportId || `fpti-deep-${reportSignature}`),
    sessionId: clean(archive.sessionId || doc?.sessionId || reportSignature),
    generatedAt: toIso(archive.generatedAt || doc?.createdAt || Date.now()),
  };
}

async function writeArchivedReport(env, userId, reportSignature, payload, access = {}) {
  await connectDb(env);
  const executionKey = `fpti-deep:${reportSignature}`;
  const reportId = clean(payload?.reportId || `fpti-deep-${reportSignature}`);
  const sessionId = clean(payload?.sessionId || reportSignature);
  const now = new Date();
  const update = {
    $set: {
      reportType: FPTI_REPORT_TYPE,
      reportId,
      sessionId,
      featureKey: FPTI_FEATURE_KEY,
      cost: 200,
      sourceTransactionId: clean(access?.matchedTransactionId || access?.entitlementId || ""),
      status: "success",
      premiumStatus: "completed",
      reasonCode: "",
      reasonMessage: "",
      completedAt: now,
      generationCompletedAt: now,
      timeoutAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 180),
      nextRetryAt: now,
      metadata: {
        source: "fpti.deep-report",
        archive: payload,
      },
    },
    $setOnInsert: {
      executionKey,
      coinAmount: 200,
      maxRetries: 1,
      retryCount: 0,
      idempotencyKey: executionKey,
      retentionUntil: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 180),
    },
  };

  await ServiceExecutionTransaction.findOneAndUpdate(
    { userId, executionKey },
    update,
    { upsert: true, returnDocument: "after" },
  ).lean();
}

function clampList(value, limit = 8) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => clean(item)).filter(Boolean).slice(0, limit);
}

function pickText(input, fallback = "-") {
  const value = clean(input);
  return value || fallback;
}

function normalizeInput(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  const result = src.result && typeof src.result === "object" ? src.result : src;
  const axis = result?.axis && typeof result.axis === "object" ? result.axis : {};
  const axisMeanings = result?.axisMeanings && typeof result.axisMeanings === "object" ? result.axisMeanings : {};
  const axisScores = result?.axisScores && typeof result.axisScores === "object" ? result.axisScores : {};

  return {
    code: pickText(result.code),
    typeName: pickText(result.typeName, "FPTI 타입"),
    oneLiner: pickText(result.oneLiner),
    summary: pickText(result.summary),
    axis: {
      energy: pickText(axis.energy),
      judgment: pickText(axis.judgment),
      execution: pickText(axis.execution),
      vision: pickText(axis.vision),
    },
    axisMeanings: {
      energy: pickText(axisMeanings.energy),
      judgment: pickText(axisMeanings.judgment),
      execution: pickText(axisMeanings.execution),
      vision: pickText(axisMeanings.vision),
    },
    axisScores: {
      A: Number(axisScores.A || 0),
      M: Number(axisScores.M || 0),
      H: Number(axisScores.H || 0),
      L: Number(axisScores.L || 0),
      F: Number(axisScores.F || 0),
      B: Number(axisScores.B || 0),
      R: Number(axisScores.R || 0),
      V: Number(axisScores.V || 0),
    },
    elementSummary: pickText(result.elementSummary),
    behaviorSummary: pickText(result.behaviorSummary),
    relationshipSummary: pickText(result.relationshipSummary),
    strategySummary: pickText(result.strategySummary),
    loveSummary: pickText(result.loveSummary),
    careerMoneySummary: pickText(result.careerMoneySummary),
    strengths: clampList(result.strengths, 5),
    weaknesses: clampList(result.weaknesses, 5),
    growthTips: clampList(result.growthTips, 8),
    careerTips: clampList(result.careerTips, 6),
    loveTips: clampList(result.loveTips, 6),
    evidence: {
      dayMaster: pickText(result?.evidence?.dayMaster),
      monthBranch: pickText(result?.evidence?.monthBranch),
      strongElements: clampList(result?.evidence?.strongElements, 3),
      weakElements: clampList(result?.evidence?.weakElements, 3),
      strongTenGods: clampList(result?.evidence?.strongTenGods, 3),
    },
  };
}

function trigrams(text) {
  const normalized = clean(text).replace(/\s+/g, " ");
  const set = new Set();
  if (!normalized) return set;
  if (normalized.length < 3) {
    set.add(normalized);
    return set;
  }
  for (let i = 0; i < normalized.length - 2; i += 1) {
    set.add(normalized.slice(i, i + 3));
  }
  return set;
}

function similarity(a, b) {
  const ga = trigrams(a);
  const gb = trigrams(b);
  if (!ga.size || !gb.size) return 0;
  let inter = 0;
  for (const t of ga) if (gb.has(t)) inter += 1;
  const union = ga.size + gb.size - inter;
  return union ? inter / union : 0;
}

function dedupeParagraphs(paragraphs) {
  const out = [];
  for (const p of paragraphs.map((v) => clean(v)).filter(Boolean)) {
    if (out.some((x) => similarity(x, p) >= 0.8)) continue;
    out.push(p);
  }
  return out;
}

function axisLine(label, score, high, mid, low) {
  if (score >= 70) return `${label}: ${high}`;
  if (score >= 45) return `${label}: ${mid}`;
  return `${label}: ${low}`;
}

function baseParagraphs(input) {
  const s = {
    energy: Number(input.axisScores.A || 50),
    judgment: Number(input.axisScores.H || 50),
    execution: Number(input.axisScores.F || 50),
    vision: Number(input.axisScores.R || 50),
  };

  return [
    `${input.typeName}(${input.code})은 삶의 여러 장면에서 같은 선택 리듬을 반복하는 성향입니다. ${axisLine("에너지 흐름", s.energy, "외부 상호작용에서 동력이 살아나는 편입니다.", "외부 확장과 내부 정리를 균형 있게 운용합니다.", "내면 정리 시간에서 안정성과 집중력이 강화됩니다.")} ${axisLine("판단 성향", s.judgment, "정서와 분위기를 빠르게 읽어 반응합니다.", "공감과 구조를 함께 점검해 결정을 정리합니다.", "원칙과 기준 중심으로 흔들림을 줄입니다.")} ${axisLine("실행 스타일", s.execution, "빠른 착수 후 정교화에 강점이 있습니다.", "탐색과 구조화를 번갈아 운영합니다.", "절차 설계와 반복 최적화로 완성도를 높입니다.")} ${axisLine("전망 방식", s.vision, "현실 지표와 생활 구조를 중시합니다.", "현실성과 의미를 동시에 고려합니다.", "장기 방향을 먼저 확정하고 구체화합니다.")}`,
    `이 리포트는 성향을 설명하는 데서 멈추지 않고, 관계와 일상에서 바로 적용할 수 있는 실전 기준을 함께 제시합니다. 읽을 때는 자신을 평가하기보다 나에게 맞는 리듬을 찾는 관점으로 접근하는 것이 중요합니다.`,
    `핵심은 더 강한 의지를 만드는 것이 아니라 흔들릴 때도 유지되는 작은 기준을 확보하는 일입니다. 같은 성향도 운영 방식에 따라 결과가 완전히 달라질 수 있으므로, 챕터별 실천 포인트를 생활에 맞게 선택해 적용하세요.`,
  ];
}

function chapterIntro(chapterId, input) {
  if (chapterId === "overview") return `${input.summary} 총론에서는 당신이 반복해서 강해지는 조건과 흔들리는 조건을 함께 해석합니다.`;
  if (chapterId === "inner") return `${input.behaviorSummary} 내면 장면에서 감정 반응, 회복 방식, 안정 리듬의 차이를 단계적으로 설명합니다.`;
  if (chapterId === "relationship") return `${input.relationshipSummary} 관계와 연애에서 끌림 기준, 갈등 반복, 거리 조절 전략을 운영 관점으로 제시합니다.`;
  if (chapterId === "career") return `${input.careerMoneySummary} 일과 재능에서 성과가 나는 환경, 협업 방식, 실행 단위 설계를 다룹니다.`;
  if (chapterId === "wealth") return `${input.careerMoneySummary} 돈과 현실 감각에서 소비, 저축, 투자, 리스크 관리의 균형 원칙을 구조화합니다.`;
  if (chapterId === "stress") return `${input.weaknesses.join(" ")} 스트레스 전조 신호와 그림자 패턴을 조기 식별해 손실을 줄이는 기준을 제시합니다.`;
  return `${input.growthTips.join(" ")} 7일 및 30일 실행 로드맵을 통해 강점 활용과 약점 보완 루틴을 고정합니다.`;
}

function chapterSpecificParagraphs(chapterId, input) {
  const axis = `현재 축 점수는 에너지 ${Number(input.axisScores.A || 50)}, 판단 ${Number(input.axisScores.H || 50)}, 실행 ${Number(input.axisScores.F || 50)}, 전망 ${Number(input.axisScores.R || 50)}입니다.`;
  if (chapterId === "overview") {
    return [
      `${axis} 총론에서는 강점 자체보다 강점이 안정적으로 발휘되는 조건을 먼저 정의해야 합니다.`,
      "당신의 선택 품질은 큰 결심보다 작고 반복 가능한 운영 기준에서 빠르게 안정됩니다. 오늘의 기준 문장과 주간 점검 문장을 분리해 기록하면 체감 변화가 빨라집니다.",
      "핵심은 완벽한 정보가 아니라 실행 가능한 정보의 기준입니다. 결정을 미루는 조건과 확정하는 조건을 사전에 분리하면 흔들림이 크게 줄어듭니다.",
    ];
  }
  if (chapterId === "inner") {
    return [
      `${axis} 내면 챕터에서는 감정을 통제하려 하기보다 반응 이후 순서를 고정하는 접근이 유효합니다.`,
      "감정이 큰 날에는 사실 확인-감정 명명-다음 행동 1개 순서를 지키면 과잉 반응을 줄일 수 있습니다. 감정의 존재를 문제로 보지 말고 상태 신호로 다루는 것이 중요합니다.",
      "회복은 이벤트가 아니라 일정입니다. 짧은 정리 루틴을 평일에 고정할수록 집중력 복귀 속도가 빨라집니다.",
    ];
  }
  if (chapterId === "relationship") {
    return [
      `${axis} 관계 챕터에서는 표현 강도보다 표현 빈도의 일관성이 만족도를 더 크게 좌우합니다.`,
      "반복 갈등의 주요 원인은 기대치 비대칭입니다. 추측 대신 합의 문장을 남기는 습관이 오해를 줄이고 신뢰를 지킵니다.",
      "배려와 책임의 경계를 분리하면 관계 피로가 낮아집니다. 도움을 주더라도 결과 책임은 분리해야 장기 친밀감이 유지됩니다.",
    ];
  }
  if (chapterId === "career") {
    return [
      `${axis} 커리어 챕터에서는 착수 기준과 마감 기준을 분리할 때 산출물 품질이 안정됩니다.`,
      "협업 후 정리 시간 블록을 고정하지 않으면 실행 밀도가 급격히 떨어질 수 있습니다. 회의 직후 20~30분 정리 루틴을 기본값으로 두세요.",
      "성과는 재능 자체보다 절차의 재현성에서 커집니다. 문제 정의-우선순위-실행-리뷰 순서를 고정하면 흔들리는 날에도 품질이 유지됩니다.",
    ];
  }
  if (chapterId === "wealth") {
    return [
      `${axis} 재정 챕터에서는 감정 상태와 숫자 판단을 동시에 점검하는 구조가 리스크를 낮춥니다.`,
      "지출을 생활 유지, 성장 투자, 실험 비용으로 분리하면 통제감과 유연성을 함께 확보할 수 있습니다. 중요한 지출은 하루 유예 후 재확인하는 방식이 안전합니다.",
      "기록의 목적은 처벌이 아니라 관찰입니다. 월간 점검에서 감정 소비 패턴을 함께 보면 재정 안정성이 높아집니다.",
    ];
  }
  if (chapterId === "stress") {
    return [
      `${axis} 스트레스 챕터에서는 위기 신호를 조기에 식별하는 규칙이 핵심입니다.`,
      "수면 붕괴, 반응 과열, 결정 지연 같은 신호를 미리 정해 두고 두 개 이상 겹치면 중요 결정을 하루 유예하세요.",
      "회복은 의지 경쟁이 아니라 마찰 관리입니다. 무너진 뒤 복구보다 무너지기 전 속도 조절이 손실을 훨씬 줄입니다.",
    ];
  }
  return [
    `${axis} 성장 챕터에서는 7일 착수 루틴과 30일 유지 구조를 분리 설계하는 접근이 효과적입니다.`,
    "변화의 핵심은 더 많이 하는 것이 아니라 덜 흔들리는 시스템을 만드는 데 있습니다. 하루 핵심 행동 1개와 주간 점검 1회를 고정하세요.",
    "실패한 날의 목표는 분석이 아니라 복귀입니다. 복귀 속도가 빨라질수록 장기 성과가 안정됩니다.",
  ];
}

function expandChapter(chapter, input) {
  const support = chapterSpecificParagraphs(chapter.id, input);
  let paragraphs = dedupeParagraphs(chapter.content.split(/\n\n+/).concat(support));
  let cursor = 0;

  while (paragraphs.join("\n\n").length < CHAPTER_MIN && cursor < 8) {
    paragraphs = dedupeParagraphs([
      ...paragraphs,
      `${chapter.title} 실행 보강 ${cursor + 1}: ${input.typeName}(${input.code})에게는 기록-점검-실행의 순서를 고정하는 방식이 재발 방지에 유효합니다.`,
    ]);
    cursor += 1;
  }

  return {
    ...chapter,
    content: paragraphs.join("\n\n"),
  };
}

function buildLocalReport(input) {
  const title = `${input.typeName} 프리미엄 심층 리포트`;
  const summary = `${input.code} 유형의 관계, 일, 돈, 스트레스, 성장 전략을 실전 중심의 심층 상담문으로 정리했습니다.`;
  const shared = baseParagraphs(input);

  const sections = CHAPTERS.map((chapter) => {
    const seed = [
      chapterIntro(chapter.id, input),
      ...shared,
      `실행 가이드: ${input.growthTips.join(" ") || "기록-점검-실행 루틴을 유지하세요."}`,
      `관계 가이드: ${input.loveTips.join(" ") || "표현 빈도와 거리 합의를 유지하세요."}`,
      `커리어 가이드: ${input.careerTips.join(" ") || "우선순위와 완료 기준을 먼저 정의하세요."}`,
      `보완 가이드: ${input.weaknesses.join(" ") || "피로 구간에서 결정 유예 규칙을 적용하세요."}`,
    ];

    return expandChapter(
      {
        id: chapter.id,
        title: chapter.title,
        content: dedupeParagraphs(seed).join("\n\n"),
      },
      input,
    );
  });

  return {
    title,
    summary,
    sections,
    generatedAt: new Date().toISOString(),
    source: "local",
  };
}

async function handleDeepReport(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeInput(body);
  const reportSignature = clean(body?.reportSignature || body?.sessionId || body?.reportId || buildReportSignature(input));
  if (!reportSignature) {
    return json({ ok: false, code: "MISSING_REPORT_SIGNATURE", message: "reportSignature가 필요합니다." }, { status: 400 });
  }

  const access = await requirePremiumReportAccess(env, auth.userId, "fptiPremium", {
    reportId: reportSignature,
    sessionId: reportSignature,
  });
  if (!access?.ok) {
    return json(
      {
        ok: false,
        message: access?.message || "FPTI 프리미엄 리포트 결제가 필요합니다.",
        code: access?.code || "PAYMENT_REQUIRED",
      },
      { status: Number(access?.status || 402) },
    );
  }

  if (!input.code) {
    return json({ ok: false, message: "FPTI 코드가 누락되었습니다." }, { status: 400 });
  }

  const archived = await readArchivedReport(env, auth.userId, reportSignature);
  if (archived?.chapters?.length) {
    const archivedQuality = isArchivedReportUsable(archived);
    if (archivedQuality.ok) {
      return json({
        ok: true,
        data: {
          source: archived.source || "archive",
          report: archived,
        },
      });
    }

    const regenerated = await createAndArchiveDeepReport(env, auth.userId, reportSignature, input, access || {});
    return json({
      ok: true,
      data: {
        source: "regenerated",
        reason: archivedQuality.reason,
        report: regenerated,
      },
    });
  }

  const report = await createAndArchiveDeepReport(env, auth.userId, reportSignature, input, access || {});

  return json({
    ok: true,
    data: {
      source: report.source,
      report,
    },
  });
}

async function handleReadDeepReport(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const reportSignature = clean(url.searchParams.get("reportSignature") || url.searchParams.get("sessionId") || url.searchParams.get("reportId"));
  if (!reportSignature) {
    return json({ ok: false, code: "MISSING_REPORT_SIGNATURE", message: "reportSignature가 필요합니다." }, { status: 400 });
  }

  const access = await requirePremiumReportAccess(env, auth.userId, "fptiPremium", {
    reportId: reportSignature,
    sessionId: reportSignature,
  });
  if (!access?.ok) {
    return json(
      {
        ok: false,
        message: access?.message || "FPTI 프리미엄 리포트 결제가 필요합니다.",
        code: access?.code || "PAYMENT_REQUIRED",
      },
      { status: Number(access?.status || 402) },
    );
  }

  const archived = await readArchivedReport(env, auth.userId, reportSignature);
  if (!archived) {
    return json({ ok: false, code: "REPORT_NOT_FOUND", message: "저장된 리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  const archivedQuality = isArchivedReportUsable(archived);
  if (!archivedQuality.ok) {
    return json({ ok: false, code: "REPORT_NEEDS_REFRESH", message: "리포트 갱신이 필요합니다. POST /api/fpti/deep-report로 재생성해 주세요." }, { status: 409 });
  }

  return json({
    ok: true,
    data: {
      source: archived.source || "archive",
      report: archived,
    },
  });
}

export async function handleFptiRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/fpti");

    if (method === "POST" && path === "/deep-report") {
      return handleDeepReport(request, env);
    }

    if (method === "GET" && path === "/deep-report") {
      return handleReadDeepReport(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, { request, env, trace: { route: "fpti", method: request?.method || "" } });
  }
}
