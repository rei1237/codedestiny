import { transformationTypeToLabel } from "./ziwei-advanced-normalization";
import { ZIWEI_PALACE_TEMPLATES } from "./ziwei-deep-templates";
import {
  AUXILIARY_STAR_INTERPRETATIONS,
  MALEFIC_STAR_INTERPRETATIONS,
  STAR_INTERPRETATIONS,
  STRENGTH_SPECIFIC_STAR_HINTS,
} from "./ziwei-star-interpretations";
import {
  ValidationResult,  ZIWEI_PALACE_NAME,
  ZiweiDeepChapter,
  ZiweiDeepChart,
  ZiweiDeepPalaceReading,
  ZiweiPalace,
  ZiweiPalaceCategoryReading,
  ZiweiPalaceId,
  ZiweiStarMeta,
  ZiweiTransformation,
} from "./ziwei-types";

const ZIWEI_DEEP_READING_TEXT_TRANSLATIONS = {
  ko: {
    "zdr.title.001": "타고난 기질의 첫 결",
    "zdr.title.002": "자기 인식과 자존감",
    "zdr.title.003": "사고방식과 판단 기준",
    "zdr.title.004": "대인관계의 첫인상",
    "zdr.title.005": "자기방어와 위기 반응",
    "zdr.title.006": "반복되는 선택 습관",
    "zdr.title.007": "강점이 성과가 되는 자리",
    "zdr.title.008": "그림자와 명궁 운용법",
    "zdr.title.009": "형제·자매와의 기본 인연",
    "zdr.title.010": "친구·동료와의 수평 관계",
    "zdr.title.011": "경쟁자와 라이벌 구도",
    "zdr.title.012": "협업 능력",
    "zdr.title.013": "주변 도움과 방해",
    "zdr.title.014": "공동 프로젝트 운",
    "zdr.title.015": "신뢰할 사람의 유형",
    "zdr.title.016": "대한과 인맥 전략",
    "zdr.title.017": "연애 성향",
    "zdr.title.018": "끌리는 상대 유형",
    "zdr.title.019": "장기 관계와 결혼관",
    "zdr.title.020": "파트너의 기질",
    "zdr.title.021": "반복되는 갈등",
    "zdr.title.022": "애정 표현과 신뢰 조건",
    "zdr.title.023": "거리감의 원인",
    "zdr.title.024": "대한과 관계 전략",
    "zdr.title.025": "자녀 인연의 기본 흐름",
    "zdr.title.026": "자녀와의 관계 방식",
    "zdr.title.027": "후배·제자 운",
    "zdr.title.028": "창작물과 결과물 운",
    "zdr.title.029": "생산성과 유산",
    "zdr.title.030": "돌봄과 책임의 방식",
    "zdr.title.031": "감정적 보상과 기대",
    "zdr.title.032": "대한과 성과 전략",
    "zdr.title.033": "돈을 버는 방식",
    "zdr.title.034": "수입 구조와 흐름",
    "zdr.title.035": "소비 습관과 지출 패턴",
    "zdr.title.036": "저축·투자·자산 형성",
    "zdr.title.037": "사업·거래 운",
    "zdr.title.038": "돈이 들어오는 경로",
    "zdr.title.039": "돈이 새는 원인",
    "zdr.title.040": "대한과 재물 전략",
    "zdr.title.041": "기본 체력과 기운 패턴",
    "zdr.title.042": "스트레스의 신체화",
    "zdr.title.043": "약해지기 쉬운 생활 영역",
    "zdr.title.044": "회복력이 살아나는 조건",
    "zdr.title.045": "과로·번아웃 패턴",
    "zdr.title.046": "감정과 몸의 연결",
    "zdr.title.047": "생활 습관 경계",
    "zdr.title.048": "대한과 회복 전략",
    "zdr.title.049": "외부 환경에서의 운",
    "zdr.title.050": "이동·여행·이사 흐름",
    "zdr.title.051": "타지·해외 인연",
    "zdr.title.052": "사회적 확장 방식",
    "zdr.title.053": "외부 이미지",
    "zdr.title.054": "밖에서 얻는 기회",
    "zdr.title.055": "외부 활동 리스크",
    "zdr.title.056": "대한과 확장 전략",
    "zdr.title.057": "친구·지인 인연",
    "zdr.title.058": "팀원·후배 운",
    "zdr.title.059": "고객·팬·팔로워 운",
    "zdr.title.060": "도움을 주는 사람의 유형",
    "zdr.title.061": "나를 소모시키는 사람의 유형",
    "zdr.title.062": "집단 속 역할",
    "zdr.title.063": "리더십과 추종자 운",
    "zdr.title.064": "대한과 네트워크 전략",
    "zdr.title.065": "타고난 직업 성향",
    "zdr.title.066": "어울리는 역할과 직무",
    "zdr.title.067": "조직생활 적응 방식",
    "zdr.title.068": "리더십과 책임감",
    "zdr.title.069": "명예와 평판",
    "zdr.title.070": "성과·승진 흐름",
    "zdr.title.071": "이직·독립 가능성",
    "zdr.title.072": "대한과 성공 전략",
    "zdr.title.073": "주거 안정성",
    "zdr.title.074": "집·부동산 인연",
    "zdr.title.075": "가족 기반과 터전",
    "zdr.title.076": "집에서 회복되는 방식",
    "zdr.title.077": "공간 취향과 생활 패턴",
    "zdr.title.078": "재산 축적 기반",
    "zdr.title.079": "이사와 주거 변화",
    "zdr.title.080": "대한과 생활 기반 전략",
    "zdr.title.081": "마음의 기본 온도",
    "zdr.title.082": "행복을 느끼는 방식",
    "zdr.title.083": "혼자 있을 때의 내면",
    "zdr.title.084": "스트레스 해소 방식",
    "zdr.title.085": "안정과 불안의 패턴",
    "zdr.title.086": "취미·예술·영성 성향",
    "zdr.title.087": "공허감의 흐름",
    "zdr.title.088": "대한과 행복 전략",
    "zdr.title.089": "부모와의 기본 인연",
    "zdr.title.090": "보호자와의 관계 흐름",
    "zdr.title.091": "윗사람·멘토 운",
    "zdr.title.092": "제도권·문서 운",
    "zdr.title.093": "보호받는 방식",
    "zdr.title.094": "권위와의 관계",
    "zdr.title.095": "가족 패턴과 리스크",
    "zdr.title.096": "대한과 보호·독립 전략",
  },
} as const;

function ziweiDeepReadingText(key: keyof typeof ZIWEI_DEEP_READING_TEXT_TRANSLATIONS.ko) {
  return ZIWEI_DEEP_READING_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

export type PalaceCategorySpec = {
  title: string;
  question: string;
};

type PalaceCounselingLens = {
  role: string;
  personalityLens: string[];
  relationshipLens: string[];
  lifeAdviceLens: string[];
  cautionLens: string[];
  opening: string;
};

export const FORBIDDEN_ZIWEI_PHRASES = [
  "핵심 구조 보강",
  "자동 보강",
  "보강 문구",
  "기본 보강",
  "구조 보강",
  "fallback 보강",
  "자동 복구 생성",
  "fallback",
  "계산",
  "데이터",
  "시스템",
  "알고리즘",
  "JSON",
  "json",
  "데이터 부족",
  "payload",
  "debug",
  "raw json",
];

const PALACE_CATEGORY_SPECS: Record<ZiweiPalaceId, PalaceCategorySpec[]> = {
  ming: [
    { title: ziweiDeepReadingText("zdr.title.001"), question: "명궁의 주성은 태도, 말투, 표정, 위기 반응의 첫 결을 어떻게 빚는가?" },
    { title: ziweiDeepReadingText("zdr.title.002"), question: "이 명궁은 스스로를 믿게 만드는 조건과 흔들리게 하는 조건을 어디에 두는가?" },
    { title: ziweiDeepReadingText("zdr.title.003"), question: "중요한 결정을 내릴 때 감정, 명분, 실리, 관계 중 무엇이 먼저 움직이는가?" },
    { title: ziweiDeepReadingText("zdr.title.004"), question: "타인은 이 사람을 처음 만났을 때 어떤 온도와 거리감으로 받아들이는가?" },
    { title: ziweiDeepReadingText("zdr.title.005"), question: "압박이 커질 때 명궁은 침묵, 설명, 통제, 회피 중 어떤 방식으로 자신을 지키는가?" },
    { title: ziweiDeepReadingText("zdr.title.006"), question: "비슷한 상황이 오면 이 사람은 어떤 선택을 반복하고, 그 선택은 어디서 강점과 손실을 동시에 만드는가?" },
    { title: ziweiDeepReadingText("zdr.title.007"), question: "명궁의 좋은 별빛은 어떤 현장과 역할에서 실제 성취로 드러나며 신궁 행동 습관과 어떻게 이어지는가?" },
    { title: ziweiDeepReadingText("zdr.title.008"), question: "명궁의 약점은 어떤 압박에서 드러나고, 이 명궁을 아름답게 쓰려면 어떤 기준과 루틴을 붙잡아야 하는가?" },
  ],
  siblings: [
    { title: ziweiDeepReadingText("zdr.title.009"), question: "가까운 혈연과 수평관계의 기본 정서는 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.010"), question: "친구와 동료 사이에서 어떤 거리감이 편한가?" },
    { title: ziweiDeepReadingText("zdr.title.011"), question: "경쟁 압력이 생기면 어떤 방식으로 반응하는가?" },
    { title: ziweiDeepReadingText("zdr.title.012"), question: "같은 목표를 향해 움직일 때 협업의 강점과 병목은 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.013"), question: "주변 사람은 어떤 메커니즘으로 도움이 되거나 방해가 되는가?" },
    { title: ziweiDeepReadingText("zdr.title.014"), question: "공동 프로젝트는 어떤 조건에서 성과가 나는가?" },
    { title: ziweiDeepReadingText("zdr.title.015"), question: "누구와는 잘 맞고 누구와는 기운이 새기 쉬운가?" },
    { title: ziweiDeepReadingText("zdr.title.016"), question: "형제궁을 인맥 전략으로 바꾸려면 어떤 타이밍을 읽어야 하는가?" },
  ],
  spouse: [
    { title: ziweiDeepReadingText("zdr.title.017"), question: "이 부부궁은 사랑을 어떻게 시작하고 확인하는가?" },
    { title: ziweiDeepReadingText("zdr.title.018"), question: "어떤 성향의 사람에게 끌리기 쉬운가?" },
    { title: ziweiDeepReadingText("zdr.title.019"), question: "관계를 오래 유지할 때 꼭 필요한 조건은 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.020"), question: "배우자 또는 파트너는 어떤 방식으로 삶에 개입하기 쉬운가?" },
    { title: ziweiDeepReadingText("zdr.title.021"), question: "관계에서 반복적으로 부딪히는 주제는 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.022"), question: "애정 표현과 안정감은 어떤 방식에서 생기는가?" },
    { title: ziweiDeepReadingText("zdr.title.023"), question: "소원함과 이별감은 어떤 구조에서 커지기 쉬운가?" },
    { title: ziweiDeepReadingText("zdr.title.024"), question: "관계의 시기가 바뀔 때 어떤 선택이 더 안정적인가?" },
  ],
  children: [
    { title: ziweiDeepReadingText("zdr.title.025"), question: "돌봄과 후속 세대의 인연은 어떤 질감으로 들어오는가?" },
    { title: ziweiDeepReadingText("zdr.title.026"), question: "보호와 간섭의 경계는 어디에서 흔들리는가?" },
    { title: ziweiDeepReadingText("zdr.title.027"), question: "후배와 아랫사람을 키울 때 어떤 재능이 드러나는가?" },
    { title: ziweiDeepReadingText("zdr.title.028"), question: "내가 만든 결과물은 어떤 구조에서 빛을 보는가?" },
    { title: ziweiDeepReadingText("zdr.title.029"), question: "지속 가능한 성과를 남기기 위한 생산성 구조는 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.030"), question: "책임감이 과해지거나 부족해지는 지점은 어디인가?" },
    { title: ziweiDeepReadingText("zdr.title.031"), question: "애정과 성과를 섞어 기대할 때 어떤 문제가 생기는가?" },
    { title: ziweiDeepReadingText("zdr.title.032"), question: "자녀궁을 창작과 성과 전략으로 바꾸려면 무엇을 읽어야 하는가?" },
  ],
  wealth: [
    { title: ziweiDeepReadingText("zdr.title.033"), question: "이 재백궁은 어떤 수익 구조를 선호하는가?" },
    { title: ziweiDeepReadingText("zdr.title.034"), question: "돈이 들어올 때 지속성과 변동성은 어떻게 드러나는가?" },
    { title: ziweiDeepReadingText("zdr.title.035"), question: "지출은 어떤 감정과 상황에서 커지는가?" },
    { title: ziweiDeepReadingText("zdr.title.036"), question: "자산을 쌓으려면 어떤 속도와 방식이 맞는가?" },
    { title: ziweiDeepReadingText("zdr.title.037"), question: "거래와 사업 판단은 어떤 구조에서 유리한가?" },
    { title: ziweiDeepReadingText("zdr.title.038"), question: "사람·직무·플랫폼 중 어디에서 재물 문이 열리기 쉬운가?" },
    { title: ziweiDeepReadingText("zdr.title.039"), question: "재물 누수는 어디에서 시작되는가?" },
    { title: ziweiDeepReadingText("zdr.title.040"), question: "대한에서 재백궁이 흔들릴 때 무엇을 지키는 것이 우선인가?" },
  ],
  health: [
    { title: ziweiDeepReadingText("zdr.title.041"), question: "이 질액궁은 체력과 기운을 어떤 리듬으로 쓰는가?" },
    { title: ziweiDeepReadingText("zdr.title.042"), question: "스트레스는 몸 어디와 생활 습관에 먼저 드러나는가?" },
    { title: ziweiDeepReadingText("zdr.title.043"), question: "일상에서 가장 쉽게 무너지는 축은 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.044"), question: "회복 속도를 끌어올리는 조건은 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.045"), question: "무리할 때 반복되는 위험 신호는 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.046"), question: "정서 변화가 컨디션에 어떤 식으로 번지는가?" },
    { title: ziweiDeepReadingText("zdr.title.047"), question: "건강 리듬을 무너뜨리는 습관은 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.048"), question: "질액궁을 회복 전략으로 번역할 때 가장 중요한 기준은 무엇인가?" },
  ],
  travel: [
    { title: ziweiDeepReadingText("zdr.title.049"), question: "밖으로 나갈수록 어떤 기운이 살아나는가?" },
    { title: ziweiDeepReadingText("zdr.title.050"), question: "환경 이동은 어떤 식으로 삶의 전환을 만드는가?" },
    { title: ziweiDeepReadingText("zdr.title.051"), question: "외부 인연과 낯선 환경은 무엇을 열어주는가?" },
    { title: ziweiDeepReadingText("zdr.title.052"), question: "천이궁은 어떤 확장 방식을 가장 자연스럽게 지지하는가?" },
    { title: ziweiDeepReadingText("zdr.title.053"), question: "사회는 이 사람을 어떤 캐릭터로 읽기 쉬운가?" },
    { title: ziweiDeepReadingText("zdr.title.054"), question: "새로운 기회는 어떤 움직임을 통해 들어오는가?" },
    { title: ziweiDeepReadingText("zdr.title.055"), question: "확장 과정에서 무엇을 특히 조심해야 하는가?" },
    { title: ziweiDeepReadingText("zdr.title.056"), question: "천이궁을 활용한 확장 전략은 어떤 순서가 안전한가?" },
  ],
  friends: [
    { title: ziweiDeepReadingText("zdr.title.057"), question: "노복궁은 어떤 유형의 사람을 끌어들이는가?" },
    { title: ziweiDeepReadingText("zdr.title.058"), question: "함께 움직이는 사람들과의 힘 배분은 어떻게 나타나는가?" },
    { title: ziweiDeepReadingText("zdr.title.059"), question: "대중적 지지나 고객 흐름은 어떤 조건에서 늘어나는가?" },
    { title: ziweiDeepReadingText("zdr.title.060"), question: "실제로 도움이 되는 사람은 어떤 특징을 갖는가?" },
    { title: ziweiDeepReadingText("zdr.title.061"), question: "어떤 관계는 기운을 빼앗기 쉬운가?" },
    { title: ziweiDeepReadingText("zdr.title.062"), question: "집단에서 맡게 되는 역할과 기대는 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.063"), question: "사람을 이끌거나 따라야 할 때 어떤 방식이 맞는가?" },
    { title: ziweiDeepReadingText("zdr.title.064"), question: "노복궁을 네트워크 전략으로 운용하려면 무엇을 기준 삼아야 하는가?" },
  ],
  career: [
    { title: ziweiDeepReadingText("zdr.title.065"), question: "관록궁은 어떤 일의 결을 타고났다고 말하는가?" },
    { title: ziweiDeepReadingText("zdr.title.066"), question: "어떤 자리에서 능력이 자연스럽게 증명되는가?" },
    { title: ziweiDeepReadingText("zdr.title.067"), question: "조직 안에서 힘을 쓰는 방식과 피로 지점은 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.068"), question: "책임을 맡을 때 어떤 리더십이 드러나는가?" },
    { title: ziweiDeepReadingText("zdr.title.069"), question: "커리어 평판은 무엇을 통해 쌓이거나 흔들리는가?" },
    { title: ziweiDeepReadingText("zdr.title.070"), question: "성과가 누적되는 방식과 평가 포인트는 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.071"), question: "독립과 전환은 어떤 조건에서 유리해지는가?" },
    { title: ziweiDeepReadingText("zdr.title.072"), question: "커리어 전환기에는 무엇을 먼저 정렬해야 하는가?" },
  ],
  property: [
    { title: ziweiDeepReadingText("zdr.title.073"), question: "전택궁은 생활 기반의 안정도를 어떻게 보여주는가?" },
    { title: ziweiDeepReadingText("zdr.title.074"), question: "공간과 자산 기반은 어떤 속성에서 강해지는가?" },
    { title: ziweiDeepReadingText("zdr.title.075"), question: "가정 환경은 삶의 리듬을 어떻게 지지하거나 방해하는가?" },
    { title: ziweiDeepReadingText("zdr.title.076"), question: "회복과 재충전은 어떤 공간 조건에서 잘 일어나는가?" },
    { title: ziweiDeepReadingText("zdr.title.077"), question: "공간을 쓰는 방식에 어떤 습관과 취향이 드러나는가?" },
    { title: ziweiDeepReadingText("zdr.title.078"), question: "전택궁은 장기 자산의 밑바탕을 어떻게 말하는가?" },
    { title: ziweiDeepReadingText("zdr.title.079"), question: "거주 변화는 어떤 시그널에서 결정하는 것이 안전한가?" },
    { title: ziweiDeepReadingText("zdr.title.080"), question: "전택궁을 생활 안정 전략으로 바꾸려면 무엇을 보아야 하는가?" },
  ],
  fortune: [
    { title: ziweiDeepReadingText("zdr.title.081"), question: "복덕궁이 보여주는 기본 정서는 어떤 온도인가?" },
    { title: ziweiDeepReadingText("zdr.title.082"), question: "어떤 순간과 환경에서 만족감이 커지는가?" },
    { title: ziweiDeepReadingText("zdr.title.083"), question: "혼자 있을 때 생각과 감정은 어떻게 흐르는가?" },
    { title: ziweiDeepReadingText("zdr.title.084"), question: "마음을 풀어내는 가장 효과적인 방식은 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.085"), question: "불안은 어떤 상황에서 커지고 어떤 조건에서 잦아드는가?" },
    { title: ziweiDeepReadingText("zdr.title.086"), question: "복덕궁은 어떤 취향과 정신적 세계를 선호하는가?" },
    { title: ziweiDeepReadingText("zdr.title.087"), question: "허무감이 스며들기 쉬운 시점은 언제인가?" },
    { title: ziweiDeepReadingText("zdr.title.088"), question: "복덕궁을 행복 전략으로 바꾸려면 무엇을 훈련해야 하는가?" },
  ],
  parents: [
    { title: ziweiDeepReadingText("zdr.title.089"), question: "부모궁은 보호와 기대의 구조를 어떻게 보여주는가?" },
    { title: ziweiDeepReadingText("zdr.title.090"), question: "양육자·보호자와의 관계는 어떤 리듬으로 전개되는가?" },
    { title: ziweiDeepReadingText("zdr.title.091"), question: "상사와 멘토 인연은 어떤 형태로 들어오는가?" },
    { title: ziweiDeepReadingText("zdr.title.092"), question: "기관·문서·규정과의 궁합은 어떠한가?" },
    { title: ziweiDeepReadingText("zdr.title.093"), question: "도움을 받을 때는 어떤 태도와 구조가 통하는가?" },
    { title: ziweiDeepReadingText("zdr.title.094"), question: "권위자와는 어떻게 거리를 잡는 것이 좋은가?" },
    { title: ziweiDeepReadingText("zdr.title.095"), question: "가족 안에서 반복되는 긴장과 충돌 패턴은 무엇인가?" },
    { title: ziweiDeepReadingText("zdr.title.096"), question: "보호와 독립의 균형을 맞추려면 무엇을 기준 삼아야 하는가?" },
  ],
};

const PALACE_COUNSELING_LENSES: Record<ZiweiPalaceId, PalaceCounselingLens> = {
  ming: {
    role: "성격·자존감·선택 기준·자기방어 방식의 중심축",
    personalityLens: ["첫 반응", "자기 인식", "판단 기준", "자기방어 방식", "선택 습관"],
    relationshipLens: ["첫인상", "신뢰 형성 속도", "감정 경계", "말의 온도", "가까워지는 방식"],
    lifeAdviceLens: ["기준 3문장 기록", "결정 전 감정-사실 분리", "자기방어 신호 기록", "주간 회고", "강점 역할 고정"],
    cautionLens: ["자기 의심 과열", "감정 해석 과다", "확신 부족 상태의 오판", "관계 반응 과민", "좋은 별을 편안함으로만 쓰는 습관"],
    opening: "명궁은 한 사람의 얼굴빛과 마음의 중심, 선택 앞에서 가장 먼저 올라오는 본능을 보여주는 자리입니다.",
  },
  siblings: {
    role: "형제·친구·동료와의 수평 관계 운영축",
    personalityLens: ["협업 태도", "경쟁 반응", "신뢰 기준"],
    relationshipLens: ["친구", "동료", "라이벌", "협업 파트너"],
    lifeAdviceLens: ["관계 경계 문장화", "역할 합의", "공동 목표 정렬"],
    cautionLens: ["비교 경쟁 과열", "도움과 의존 혼동", "소모성 네트워크"],
    opening: "형제궁은 혈연뿐 아니라 친구·동료 같은 수평 관계에서 어떤 기운으로 연결되는지를 보여줍니다.",
  },
  spouse: {
    role: "연애·결혼·친밀 관계의 핵심 패턴",
    personalityLens: ["사랑 확인 방식", "거리감 조절", "갈등 반응"],
    relationshipLens: ["연애 성향", "끌리는 상대", "신뢰 조건", "애정 표현"],
    lifeAdviceLens: ["갈등 규칙 합의", "신뢰 확인 질문", "관계 루틴"],
    cautionLens: ["말싸움", "오해 누적", "감정 거리 확대"],
    opening: "부부궁은 사랑의 시작부터 장기 관계 운영까지, 친밀감이 만들어지고 흔들리는 지점을 보여주는 자리입니다.",
  },
  children: {
    role: "자녀·후배·창작 결과물을 키우는 생산 축",
    personalityLens: ["돌봄 방식", "책임감", "생산성 패턴"],
    relationshipLens: ["자녀", "후배", "제자", "함께 성장하는 관계"],
    lifeAdviceLens: ["돌봄과 간섭 구분", "성과 기록", "기운 배분"],
    cautionLens: ["책임 과부하", "기대 투사", "정서적 소진"],
    opening: "자녀궁은 실제 자녀 인연뿐 아니라 후배·창작물·성과물을 어떻게 키워내는지를 드러내는 자리입니다.",
  },
  wealth: {
    role: "수입·소비·투자·사업을 다루는 재정 축",
    personalityLens: ["돈 감각", "위험 선호", "소비 반응"],
    relationshipLens: ["고객", "거래 파트너", "수익 연결 인맥"],
    lifeAdviceLens: ["지출 규칙", "수익 다변화", "누수 차단"],
    cautionLens: ["감정 소비", "단기 수익 집착", "거래 리스크 간과"],
    opening: "재백궁은 돈을 버는 방식과 지키는 습관, 그리고 돈이 새는 지점을 가장 현실적으로 보여주는 자리입니다.",
  },
  health: {
    role: "체력·스트레스·회복 루틴을 좌우하는 생활 축",
    personalityLens: ["기운 사용 패턴", "피로 신호", "회복 민감도"],
    relationshipLens: ["돌봄 관계", "일정 압박", "경계 설정"],
    lifeAdviceLens: ["수면·식사 리듬", "과로 알람", "회복 루틴 고정"],
    cautionLens: ["번아웃", "감정의 신체화", "생활 리듬 붕괴"],
    opening: "질액궁은 몸과 마음이 연결되는 방식, 그리고 무리했을 때 가장 먼저 흔들리는 축을 보여줍니다.",
  },
  travel: {
    role: "외부 활동·이동·사회 확장의 성장 축",
    personalityLens: ["외부 적응력", "확장 욕구", "환경 전환 반응"],
    relationshipLens: ["외부 네트워크", "낯선 인연", "사회적 평판"],
    lifeAdviceLens: ["확장 순서 설계", "이동 전략", "외부 이미지 관리"],
    cautionLens: ["과속 확장", "과도한 노출", "이동 피로 누적"],
    opening: "천이궁은 밖으로 나갔을 때 더 잘 열리는 기회와, 외부 환경에서 보이는 당신의 얼굴을 설명하는 자리입니다.",
  },
  friends: {
    role: "친구·팀원·고객·팔로워 네트워크 운영 축",
    personalityLens: ["집단 역할", "도움 요청 방식", "경계 설정"],
    relationshipLens: ["팀원", "고객", "팬", "협력 네트워크"],
    lifeAdviceLens: ["도움 되는 사람 선별", "소모 관계 차단", "협업 프로토콜"],
    cautionLens: ["관계 소모", "역할 불균형", "기대 과잉"],
    opening: "노복궁은 주변 사람들과의 연결이 어떻게 자원으로 바뀌거나 소모로 바뀌는지를 보여주는 자리입니다.",
  },
  career: {
    role: "직업 성향·조직 적응·평판·독립 가능성의 커리어 축",
    personalityLens: ["일의 기준", "책임감", "리더십 발현"],
    relationshipLens: ["상사", "동료", "조직", "고객/시장"],
    lifeAdviceLens: ["직무 정렬", "평판 관리", "이직·독립 타이밍"],
    cautionLens: ["평판 리스크", "과로 성과주의", "역할 충돌"],
    opening: "관록궁은 어떤 직무에서 인정받고, 어떤 방식으로 커리어를 키워야 오래 가는지를 보여주는 자리입니다.",
  },
  property: {
    role: "주거·가족 기반·자산 바탕을 다루는 생활 토대 축",
    personalityLens: ["안정 욕구", "공간 사용 습관", "회복 방식"],
    relationshipLens: ["가족 기반", "생활 동선 공유", "공간 경계"],
    lifeAdviceLens: ["회복 공간 설계", "주거 전략", "장기 자산 기반"],
    cautionLens: ["생활 리듬 붕괴", "주거 불안", "기반 과소평가"],
    opening: "전택궁은 집과 생활 기반이 당신의 컨디션·안정감·장기 자산에 어떤 영향을 주는지를 말해주는 자리입니다.",
  },
  fortune: {
    role: "내면 행복감·불안·회복력을 다루는 정서 축",
    personalityLens: ["마음 온도", "내면 대화", "행복 체감 방식"],
    relationshipLens: ["혼자 있는 시간", "정서적 거리", "심리 회복 관계"],
    lifeAdviceLens: ["감정 해소 루틴", "취미/영성 활용", "공허감 관리"],
    cautionLens: ["생각 과다", "정서 고립", "불안 고착"],
    opening: "복덕궁은 혼자 있을 때의 마음 결, 행복을 느끼는 방식, 그리고 불안을 다루는 내면 습관을 보여주는 자리입니다.",
  },
  parents: {
    role: "부모·보호자·권위자·제도권과의 관계 축",
    personalityLens: ["보호와 독립 균형", "권위 반응", "문서/규정 대응"],
    relationshipLens: ["부모", "멘토", "상사", "기관·제도"],
    lifeAdviceLens: ["권위자 커뮤니케이션", "문서 기준", "독립 타이밍"],
    cautionLens: ["기대 압박", "권위 충돌", "가족 패턴 반복"],
    opening: "부모궁은 부모·보호자·윗사람과의 관계뿐 아니라 제도권과 맞닿는 방식까지 함께 보여주는 자리입니다.",
  },
};

function normalizeSymbol(star?: ZiweiStarMeta): string {
  const raw = String(star?.strengthSymbol || star?.symbol || "").trim();
  if (raw === "○") return "O";
  if (raw === "×") return "X";
  return raw;
}

function starBadge(star: ZiweiStarMeta): string {
  const symbol = normalizeSymbol(star);
  return `${star.name}${symbol ? ` ${symbol}` : ""}`.trim();
}

function unique(items: string[], limit = items.length): string[] {
  return Array.from(new Set(items.filter(Boolean))).slice(0, limit);
}

function palaceById(chart: ZiweiDeepChart, id?: ZiweiPalaceId): ZiweiPalace | null {
  if (!id) return null;
  return chart.palaces.find((palace) => palace.id === id) || null;
}

export function sanitizeZiweiDeepText(text: string): string {
  let next = String(text || "");
  FORBIDDEN_ZIWEI_PHRASES.forEach((phrase) => {
    next = next.replaceAll(phrase, "");
  });
  return next.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

export function removeRepeatedZiweiDeepPhrases(text: string): string {
  const sentences = sanitizeZiweiDeepText(text)
    .split(/(?<=[.!?다요])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const sentence of sentences) {
    const key = sentence.replace(/\s+/g, " ");
    if (key.length >= 20 && seen.has(key)) continue;
    seen.add(key);
    kept.push(sentence);
  }
  return kept.join("\n\n").trim();
}

function uniquifyRepeatedSentences(text: string): string {
  const blocks = String(text || "").split("\n");
  const seen = new Map<string, number>();

  const next = blocks.map((block) => {
    const line = String(block || "").trim();
    if (!line || line.startsWith("### ")) return block;

    const sentences = line
      .split(/(?<=[.!?다요])\s+/)
      .map((row) => row.trim())
      .filter(Boolean);

    if (!sentences.length) return block;

    const uniq = sentences.map((sentence) => {
      const key = sentence.replace(/\s+/g, " ");
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      if (count === 0) return sentence;
      return `${sentence} (${count + 1}차 관점)`;
    });

    return uniq.join(" ");
  });

  return next.join("\n");
}

export function validateNoZiweiDebugPhrases(text: string): ValidationResult {
  const issues = FORBIDDEN_ZIWEI_PHRASES.filter((phrase) => String(text || "").includes(phrase)).map((phrase) => `금지 문구 포함: ${phrase}`);
  return { valid: issues.length === 0, issues };
}

function buildBrightnessSummary(palace: ZiweiPalace): string {
  const strong = palace.strengthSummary?.strongestStars?.map(starBadge) || [];
  const weak = palace.strengthSummary?.weakStars?.map(starBadge) || [];
  return [
    strong.length ? `강하게 드러나는 별은 ${strong.join(", ")}입니다.` : "강세 별이 한곳에 몰리지 않아 역할 분산이 중요합니다.",
    weak.length ? `보완이 필요한 별은 ${weak.join(", ")}로, 기복 관리가 중요합니다.` : "약세 별 압박이 심하지 않아 루틴이 유지되면 안정도가 올라갑니다.",
  ].join(" ");
}

function buildSignalPack(chart: ZiweiDeepChart, palace: ZiweiPalace) {
  const mainStars = palace.mainStars.length
    ? palace.mainStars
    : palace.oppositePalace?.mainStars?.length
      ? palace.oppositePalace.mainStars
      : palace.sanFangSiZheng.mainStars.slice(0, 3);
  const supportStars = unique([
    ...palace.auxiliaryStars.map(starBadge),
    ...palace.luckyStars.map(starBadge),
  ], 4);
  const minorStars = unique([
    ...palace.minorStars.map(starBadge),
    ...palace.maleficStars.map(starBadge),
  ], 5);
  const transformations: ZiweiTransformation[] = unique([
    ...palace.fourTransformations.map((item) => `${transformationTypeToLabel(item.type)}|${item.starName}|direct`),
    ...palace.incomingFourTransformations.map((item) => `${transformationTypeToLabel(item.type)}|${item.starName}|incoming`),
  ]).map((row) => {
    const [type, starName, mode] = row.split("|");
    return {
      type: type as ZiweiTransformation["type"],
      starName,
      palaceName: palace.name,
      influence: mode === "direct"
        ? `${type} ${starName}이 ${palace.name}에 직접 걸려 사건의 핵심 축을 만듭니다.`
        : `${type} ${starName}이 연결궁에서 유입되어 간접 압력을 만듭니다.`,
    };
  });
  const triadNames = palace.sanFangSiZheng?.palaceNames?.length
    ? palace.sanFangSiZheng.palaceNames
    : palace.triadPalaceIds.map((id) => palaceById(chart, id)?.name || ZIWEI_PALACE_NAME[id]);
  const usedSignals = unique([
    mainStars.length ? `핵심 별 흐름: ${mainStars.map(starBadge).join(", ")}` : "핵심 별은 주변 궁의 영향으로 읽습니다",
    supportStars.length ? `보조 별 흐름: ${supportStars.join(", ")}` : "보조 별의 직접 지원은 약한 편입니다",
    minorStars.length ? `긴장 신호: ${minorStars.join(", ")}` : "긴장 신호는 비교적 약한 편입니다",
    transformations.length ? `변화 흐름: ${transformations.map((item) => `${item.type} ${item.starName}`).join(", ")}` : "변화 신호는 연결된 궁에서 간접적으로 들어옵니다",
    `마주보는 궁 영향: ${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}`,
    `함께 움직이는 궁: ${triadNames.join(", ")}`,
  ], 6);

  return {
    mainStars,
    supportStars,
    minorStars,
    transformations,
    triadNames,
    usedSignals,
    brightnessSummary: buildBrightnessSummary(palace),
  };
}

function normalizeStrengthWord(symbol: string): string {
  if (symbol === "◎") return "별의 힘이 가장 찬란하게 살아나는 상태";
  if (symbol === "O") return "별의 본성이 안정적으로 발휘되는 흐름";
  if (symbol === "▲") return "상황에 따라 힘이 달라지는 별의 상태";
  if (symbol === "△") return "무난하지만 방향에 따라 달라지는 흐름";
  if (symbol === "X") return "별의 기운이 눌리거나 왜곡되기 쉬운 상태";
  return "상황에 따라 읽어야 하는 흐름";
}

function summarizeTransformation(star: ZiweiStarMeta): string {
  if (!star.transformation) return "";
  const label = String(star.transformation);
  if (label === "화록") return "기회와 유입이 붙는 흐름";
  if (label === "화권") return "주도권과 결정력이 커지는 흐름";
  if (label === "화과") return "평판과 신뢰가 올라가는 흐름";
  return "집중 과제가 커져 집착 관리가 필요한 흐름";
}

function pickGroupForStar(palace: ZiweiPalace, starName: string): "main" | "assistant" | "malefic" {
  if (palace.mainStars.some((star) => star.name === starName)) return "main";
  if (palace.auxiliaryStars.some((star) => star.name === starName)) return "assistant";
  return "malefic";
}

function starBaseMeaning(star: ZiweiStarMeta, group: "main" | "assistant" | "malefic"): string {
  if (group === "main") {
    const info = STAR_INTERPRETATIONS[star.name];
    return info ? `${info.basic} ${info.strengths}` : `${star.name}은(는) 삶의 중심축을 세우는 힘`;
  }
  if (group === "assistant") {
    return AUXILIARY_STAR_INTERPRETATIONS[star.name] || `${star.name}은(는) 관계를 부드럽게 이어 주는 힘`;
  }
  return MALEFIC_STAR_INTERPRETATIONS[star.name] || `${star.name}은(는) 과속과 충돌을 경고하며 경계를 세우게 하는 신호`;
}

function palaceContextTail(palaceId: ZiweiPalaceId): string {
  if (palaceId === "ming") return "자기 기준과 첫 반응에서";
  if (palaceId === "spouse") return "연애와 장기 관계에서";
  if (palaceId === "wealth") return "수입·지출·투자 판단에서";
  if (palaceId === "career") return "직업 선택과 조직 내 평판에서";
  if (palaceId === "fortune") return "내면 안정과 행복감에서";
  if (palaceId === "health") return "체력·스트레스·회복 루틴에서";
  if (palaceId === "travel") return "외부 활동과 확장 기회에서";
  if (palaceId === "property") return "주거 기반과 생활 리듬에서";
  if (palaceId === "siblings") return "형제·친구·동료와의 수평 관계에서";
  if (palaceId === "friends") return "네트워크와 협업 관계에서";
  if (palaceId === "children") return "돌봄·후속 세대·결과물 관리에서";
  return "부모·멘토·권위자 관계에서";
}

function starNameContext(star: ZiweiStarMeta, palace: ZiweiPalace): string {
  if (star.name === "거문") {
    if (palace.id === "ming") return "말과 생각이 빠르게 돌아가며 스스로를 자꾸 확인하는 힘";
    if (palace.id === "spouse") return "말의 온도 차이로 오해와 확인 욕구가 커지는 패턴";
    if (palace.id === "wealth") return "정보·말·콘텐츠를 수익으로 바꾸는 능력";
    if (palace.id === "career") return "분석·기획·문서·상담에서 인정받는 역량";
    if (palace.id === "fortune") return "머릿속 질문이 멈추지 않아 불안을 키우거나 통찰로 바꾸는 흐름";
  }
  if (star.name === "천동" && palace.id === "spouse") return "다정함과 불안이 함께 움직여 상대 반응을 예민하게 읽는 흐름";
  if (star.name === "태음" && palace.id === "fortune") return "내면 감수성이 깊어 혼자 정리하는 시간이 회복력으로 연결되는 흐름";
  if (star.name === "무곡" && palace.id === "wealth") return "현금 흐름을 현실적으로 읽고 손익 기준을 분명히 세우는 힘";
  if (star.name === "천기" && palace.id === "career") return "기획과 문제 해결의 힘으로 직무 가치를 만드는 능력";
  return `${star.name}의 기질이 ${palaceContextTail(palace.id)} 실전 판단에 직접 관여하는 흐름`;
}

function contextualizeByCategory(text: string, categoryTitle: string): string {
  const title = String(categoryTitle || "").trim();
  if (!title) return String(text || "").trim();
  const rows = String(text || "")
    .split(/(?<=[.!?다요])\s+/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (!rows.length) return "";
  return rows.map((row) => `${row} (${title} 기준)`).join(" ");
}

export function describeStarInPalaceContext(
  star: ZiweiStarMeta,
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  group: "main" | "assistant" | "malefic",
): string {
  const symbol = normalizeSymbol(star);
  const strength = normalizeStrengthWord(symbol);
  const transform = summarizeTransformation(star);
  const base = starBaseMeaning(star, group);
  const hint = symbol ? STRENGTH_SPECIFIC_STAR_HINTS[star.name]?.[symbol as "◎" | "O" | "▲" | "△" | "X"] : "";
  const context = starNameContext(star, palace);
  const role = group === "main" ? "주성" : group === "assistant" ? "보조성" : "살성";
  const baseLine = contextualizeByCategory(base, category.title).replace(/[.!?]\s*/g, " ").trim();
  const hintLine = contextualizeByCategory(hint || "", category.title).replace(/[.!?]\s*/g, " ").trim();
  return removeRepeatedZiweiDeepPhrases(
    `${role} ${star.name}${symbol ? `(${symbol})` : ""}은 ${category.title} 문맥에서 ${context}으로 드러납니다. ${baseLine} ${category.title}에서는 ${strength}이 핵심 변수가 되며 ${transform || "현재는 사화보다 평소 선택 습관이 결과를 좌우합니다."} ${hintLine}`,
  );
}

export function ensureCounselingDepth(
  text: string,
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  context: {
    personality: string;
    relationship: string;
    caution: string;
    advice: string;
  },
): string {
  let next = removeRepeatedZiweiDeepPhrases(text);
  const fillers = [
    `성향으로 보면 ${context.personality}`,
    `사람들과의 관계에서는 ${context.relationship}`,
    `현실에서는 ${palace.name}의 ${category.title}이 일·돈·사랑·가족 중 지금 가장 압력이 큰 영역에서 먼저 체감됩니다.`,
    `주의할 점은 ${context.caution}`,
    `조언은 ${context.advice}`,
  ];
  let index = 0;
  while (next.length < 450 && index < fillers.length * 3) {
    next += `\n\n${fillers[index % fillers.length]}`;
    index += 1;
  }
  return removeRepeatedZiweiDeepPhrases(next);
}

function buildMingCounselingExpansion(
  category: PalaceCategorySpec,
  signalSummary: ReturnType<typeof buildSignalPack>,
): string {
  const main = signalSummary.mainStars[0];
  const second = signalSummary.mainStars[1];
  const support = signalSummary.supportStars[0] || "보조 별";
  const tension = signalSummary.minorStars[0] || "긴장 신호";
  const transform = signalSummary.transformations[0];
  const mainName = main?.name || "명궁의 중심 별";
  const secondName = second?.name || "연결된 별";
  const transformLine = transform
    ? `${transform.type} ${transform.starName}이 함께 움직이면 이 성향은 단순한 기질을 넘어 사건을 선택하는 방식으로 강해집니다.`
    : "직접 사화가 약할수록 이 성향은 큰 사건보다 매일의 말투와 선택 습관에서 더 또렷하게 드러납니다.";

  if (category.title.includes("기질")) {
    return `명궁의 첫 결은 ${mainName}이 앞에서 문을 열고 ${secondName}이 뒤에서 색을 더하는 방식으로 읽습니다. 겉으로 보이는 태도 하나만으로 단정하기 어렵고, 마음이 편할 때와 압박을 받을 때의 얼굴이 서로 다르게 나타납니다. ${support}은 이 기질을 부드럽게 살려 주지만, ${tension}이 커지면 본래 장점이 예민함이나 방어적 말투로 바뀔 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("자기 인식") || category.title.includes("자존감")) {
    return `자존감은 칭찬을 많이 받는다고 바로 안정되는 구조가 아닙니다. ${mainName}은 스스로 납득한 기준이 있을 때 마음이 단단해지고, ${tension}이 건드려질 때는 작은 평가도 크게 받아들일 수 있습니다. 이 명궁은 남에게 어떻게 보이는가보다 내가 어떤 기준으로 움직였는가를 확인할 때 회복이 빠릅니다. ${transformLine}`;
  }
  if (category.title.includes("판단")) {
    return `판단 기준은 ${mainName}의 본성에 따라 먼저 움직입니다. 이 별이 부드러운 별이면 사람의 마음과 분위기를 읽고, 단단한 별이면 손익과 책임을 먼저 가늠하며, 말의 별이면 표현과 해석의 정확도를 우선합니다. ${support}이 붙으면 판단이 세련되어지지만 ${tension}이 강하면 생각이 많아져 결론이 늦어질 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("첫인상")) {
    return `첫인상은 명궁의 별빛이 얼굴과 말투로 새어 나오는 장면입니다. ${mainName}은 사람들에게 가장 먼저 보이는 분위기를 만들고, ${secondName}은 가까워진 뒤 드러나는 두 번째 결을 만듭니다. ${support}이 살아 있으면 신뢰가 빨리 열리고, ${tension}이 자극되면 방어적인 거리감이 먼저 느껴질 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("자기방어") || category.title.includes("위기")) {
    return `위기 앞에서 이 명궁은 본능적으로 자신을 지키는 방식을 꺼냅니다. ${mainName}은 어떤 말로 버티는지, 어떤 침묵으로 물러나는지, 또는 어떤 기준을 세워 상황을 통제하는지 보여줍니다. ${tension}은 방어가 지나쳐 관계의 벽이 되는 지점을 알려 주고, ${support}은 다시 대화의 문을 여는 회복 통로가 됩니다. ${transformLine}`;
  }
  if (category.title.includes("선택")) {
    return `반복되는 선택 습관은 운명의 방향을 조용히 바꿉니다. ${mainName}이 익숙한 길을 택하게 만들고, ${secondName}은 그 선택에 명분이나 감정을 덧입힙니다. 좋은 흐름에서는 빠른 판단과 자기 주도성이 되지만, ${tension}이 강한 시기에는 같은 문제를 다른 얼굴로 반복할 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("성과") || category.title.includes("강점")) {
    return `명궁의 강점은 혼자 품고 있을 때보다 역할을 맡았을 때 빛납니다. ${mainName}은 이 사람이 어떤 자리에서 자연스럽게 중심을 잡는지 말해 주고, ${support}은 주변 사람과 도구를 붙여 성과를 현실화합니다. 다만 ${tension}을 무시하면 장점이 과속이나 피로로 바뀌므로, 가장 잘하는 일을 가장 오래 할 수 있는 리듬이 필요합니다. ${transformLine}`;
  }
  if (category.title.includes("그림자") || category.title.includes("압박")) {
    return `명궁의 그림자는 나쁜 성격이 아니라 별빛이 눌렸을 때 나타나는 방어 반응입니다. ${mainName}이 힘을 잃으면 자신을 설명하려는 마음이 커지거나, 반대로 아무 말도 하지 않고 닫히는 식으로 나타날 수 있습니다. ${tension}은 이 압박이 어디에서 시작되는지 알려 주므로, 압박의 원인을 사람 탓으로만 돌리지 말고 말·일정·평가·관계 경계 중 어디가 무너졌는지 먼저 보아야 합니다. ${transformLine}`;
  }
  if (category.title.includes("신궁")) {
    return `명궁이 타고난 마음의 얼굴이라면 신궁은 시간이 지나며 몸에 밴 행동 습관입니다. ${mainName}의 성향이 실제 생활에서는 선택의 속도, 사람을 대하는 거리, 일을 처리하는 순서로 바뀝니다. 명궁과 신궁의 결이 맞으면 삶이 자연스럽게 풀리고, 어긋나면 마음은 원하는데 행동이 따라가지 않는 피로가 생깁니다. ${transformLine}`;
  }
  return `명궁 운용의 핵심은 ${mainName}의 좋은 빛을 매일의 기준으로 쓰는 것입니다. ${support}이 도와주는 영역은 적극적으로 열고, ${tension}이 건드리는 장면은 결정을 늦추며 몸과 마음의 속도를 맞춰야 합니다. 이 명궁은 스스로를 몰아붙일수록 흐려지고, 자신의 별빛이 가장 편안하게 드러나는 역할을 찾을수록 선명해집니다. ${transformLine}`;
}

function buildSiblingCounselingExpansion(
  category: PalaceCategorySpec,
  signalSummary: ReturnType<typeof buildSignalPack>,
): string {
  const main = signalSummary.mainStars[0];
  const second = signalSummary.mainStars[1];
  const support = signalSummary.supportStars[0] || "보조 별";
  const tension = signalSummary.minorStars[0] || "긴장 신호";
  const transform = signalSummary.transformations[0];
  const mainName = main?.name || "형제궁의 중심 별";
  const secondName = second?.name || "연결된 별";
  const transformLine = transform
    ? `${transform.type} ${transform.starName}이 겹치면 이 관계 흐름은 평소 호감보다 실제 사건, 공동 책임, 말의 무게로 더 강하게 드러납니다.`
    : "직접 사화가 약하면 큰 사건보다 평소 거리감, 약속 방식, 도움을 주고받는 태도에서 관계의 질이 갈립니다.";

  if (category.title.includes("형제") || category.title.includes("기본 인연")) {
    return `형제궁의 기본 인연은 혈연의 숫자보다 가까운 사람과 마음을 나누는 방식으로 읽습니다. ${mainName}은 수평 관계에서 먼저 드러나는 정서와 말투를 만들고, ${secondName}은 오래 지낼수록 보이는 숨은 기대치를 덧붙입니다. ${support}이 살아 있으면 가까운 사람에게 실제 도움을 받기 쉽지만, ${tension}이 커지면 사소한 비교와 서운함이 오래 남을 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("친구") || category.title.includes("동료")) {
    return `친구와 동료 관계에서는 편안함과 역할의 균형이 중요합니다. ${mainName}이 강하면 내가 어떤 사람과 빨리 친해지고 누구와 거리를 두는지 선명해지며, ${support}은 그 관계를 협업 자원으로 바꾸는 힘을 줍니다. 다만 ${tension}이 자극되면 가까운 관계일수록 기대치가 말없이 쌓여 피로가 생길 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("경쟁") || category.title.includes("라이벌")) {
    return `라이벌 구도는 적을 만드는 운이 아니라 나의 실력과 자존심이 시험대에 오르는 장면입니다. ${mainName}은 경쟁을 성장 자극으로 받아들이는지, 비교 피로로 받아들이는지 보여줍니다. ${secondName}이 함께 움직이면 겉으로는 담담해 보여도 속으로는 인정 욕구가 강해질 수 있고, ${tension}은 경쟁이 관계 손상으로 번지는 지점을 알려 줍니다. ${transformLine}`;
  }
  if (category.title.includes("협업")) {
    return `협업에서는 좋은 마음보다 역할 배분이 먼저입니다. ${mainName}은 내가 자연스럽게 맡는 포지션을 만들고, ${support}은 부족한 부분을 메워 주는 사람과 도구를 끌어옵니다. 그러나 ${tension}이 강하면 책임 소재가 흐려지거나 말의 온도 차이로 신뢰가 흔들릴 수 있어, 시작 전에 역할·기한·결정권을 문장으로 남기는 편이 좋습니다. ${transformLine}`;
  }
  if (category.title.includes("도움") || category.title.includes("방해")) {
    return `주변 도움과 방해는 사람의 선악보다 기운을 주고받는 방식에서 갈립니다. ${mainName}과 맞는 사람은 내 판단을 맑게 만들고 행동 속도를 올려 주지만, ${tension}을 건드리는 사람은 설명을 길게 만들고 마음을 지치게 할 수 있습니다. ${support}은 도움을 실제 결과로 연결하는 통로이므로, 도움을 받을 때도 감정적 의리보다 역할과 범위를 분명히 해야 합니다. ${transformLine}`;
  }
  if (category.title.includes("공동 프로젝트")) {
    return `공동 프로젝트는 형제궁이 가장 현실적으로 드러나는 자리입니다. ${mainName}은 프로젝트 안에서 내가 중심을 잡는 방식, ${secondName}은 함께 움직이는 사람들의 속도 차이를 보여줍니다. ${support}이 살아 있으면 협력의 손발이 맞고, ${tension}이 커지면 중간 조율 비용이 늘어나므로 처음부터 기록, 분담, 검수 기준을 고정해야 합니다. ${transformLine}`;
  }
  if (category.title.includes("신뢰")) {
    return `신뢰할 사람은 듣기 좋은 말을 많이 하는 사람이 아니라, ${mainName}의 결을 흐리지 않고 약속을 지키는 사람입니다. ${support}과 맞는 인연은 나를 과하게 흔들지 않으면서 필요한 순간에 실제 도움을 줍니다. 반대로 ${tension}이 반복해서 건드려지는 관계는 정이 있어도 오래 두면 판단력을 흐리게 하므로, 거리와 역할을 다시 정해야 합니다. ${transformLine}`;
  }
  return `형제궁의 인맥 전략은 사람을 많이 모으는 것이 아니라 나의 리듬을 맑게 하는 관계를 남기는 일입니다. ${mainName}은 어떤 네트워크에서 힘이 나는지 알려 주고, ${support}은 그 인맥을 결과로 바꾸는 통로가 됩니다. ${tension}이 강한 시기에는 새 인연 확장보다 기존 관계의 역할, 약속, 보상 구조를 먼저 정리하는 것이 운을 안정시킵니다. ${transformLine}`;
}

function buildRemainingPalaceCounselingExpansion(
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  signalSummary: ReturnType<typeof buildSignalPack>,
): string {
  const main = signalSummary.mainStars[0];
  const second = signalSummary.mainStars[1];
  const support = signalSummary.supportStars[0] || "보조 별";
  const tension = signalSummary.minorStars[0] || "긴장 신호";
  const transform = signalSummary.transformations[0];
  const mainName = main?.name || `${palace.name}의 중심 별`;
  const secondName = second?.name || "연결된 별";
  const transformLine = transform
    ? `${transform.type} ${transform.starName}이 겹치면 이 주제는 마음속 성향을 넘어 실제 사건, 결정권, 책임의 무게로 선명해집니다.`
    : "직접 사화가 약한 구간에서는 큰 사건보다 평소 습관, 말투, 기준표, 선택 순서가 결과를 가릅니다.";

  if (palace.id === "spouse") {
    if (category.title.includes("연애") || category.title.includes("끌리는")) {
      return `부부궁의 연애 흐름은 설렘의 크기보다 내가 어떤 사람에게 마음을 열고 어떤 순간에 닫히는지를 보여줍니다. ${mainName}은 끌림의 첫 결을 만들고, ${secondName}은 관계가 깊어진 뒤 드러나는 기대와 불안을 더합니다. ${support}이 살아 있으면 신뢰 회복이 빠르지만, ${tension}이 강하면 말의 온도와 확인 욕구가 갈등의 시작점이 될 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("갈등") || category.title.includes("거리감") || category.title.includes("신뢰")) {
      return `관계의 갈등은 사랑이 부족해서만 생기지 않습니다. ${mainName}은 갈등 앞에서 다가가는지, 설명하는지, 침묵하는지, 선을 긋는지 보여줍니다. ${tension}은 반복되는 오해의 발화점을 알려 주므로, 감정이 올라온 순간 바로 결론을 내리기보다 대화 순서와 확인 문장을 먼저 정해야 합니다. ${transformLine}`;
    }
    return `장기 관계에서 이 궁은 상대의 성격보다 둘 사이의 운영 방식을 더 중요하게 봅니다. ${mainName}은 함께 살 때 반복되는 리듬을 만들고, ${support}은 관계를 회복시키는 통로가 됩니다. 좋은 인연이라도 역할, 돈, 가족, 시간의 합의가 없으면 ${tension}이 쌓여 사랑을 피로로 바꿀 수 있습니다. ${transformLine}`;
  }

  if (palace.id === "children") {
    if (category.title.includes("자녀") || category.title.includes("돌봄")) {
      return `자녀궁은 실제 자녀뿐 아니라 후배, 제자, 돌봄을 맡은 사람과의 인연을 함께 봅니다. ${mainName}은 돌보는 방식과 기대의 온도를 만들고, ${secondName}은 애정과 책임의 균형을 흔들거나 단단하게 합니다. ${support}이 좋으면 키우고 기다리는 힘이 살아나지만, ${tension}이 강하면 사랑이 간섭이나 과부하로 바뀔 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("창작") || category.title.includes("생산") || category.title.includes("성과")) {
      return `이 궁은 내가 세상에 내보내는 결과물의 운도 말합니다. ${mainName}은 아이디어가 작품, 프로젝트, 서비스로 자라는 방식을 만들고, ${support}은 완성도와 지속성을 올려 줍니다. ${tension}이 강할 때는 시작보다 마무리, 기대보다 검수, 애정보다 일정표가 중요합니다. ${transformLine}`;
    }
    return `자녀궁의 대한 전략은 키우는 대상과 나의 기운을 분리하는 데서 시작됩니다. ${mainName}은 책임감을 만들지만, ${tension}이 누적되면 내가 감당할 몫과 상대가 배워야 할 몫을 혼동하기 쉽습니다. 이 궁은 애정을 오래 쓰려면 기대치와 지원 범위를 먼저 정해야 한다고 말합니다. ${transformLine}`;
  }

  if (palace.id === "wealth") {
    if (category.title.includes("버는") || category.title.includes("수입") || category.title.includes("경로")) {
      return `재백궁은 돈의 양보다 돈이 들어오는 문을 먼저 봅니다. ${mainName}은 수입을 만드는 방식, ${secondName}은 그 수입이 반복 가능한지 일시적인지의 결을 더합니다. ${support}이 살아 있으면 회수력과 거래 운이 좋아지지만, ${tension}이 강하면 벌어도 남지 않는 구조가 생길 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("소비") || category.title.includes("새는") || category.title.includes("거래")) {
      return `돈이 새는 지점은 단순한 낭비보다 감정, 체면, 정보 부족, 계약 조건에서 시작됩니다. ${mainName}은 내가 돈 앞에서 무엇을 우선하는지 보여주고, ${tension}은 충동 구매나 과속 거래가 커지는 장면을 알려 줍니다. 이 궁은 수입 확장보다 먼저 가격표, 정산 기준, 손실 상한선을 세우라고 말합니다. ${transformLine}`;
    }
    return `자산 형성은 큰 운 한 번보다 반복되는 현금 흐름에서 만들어집니다. ${mainName}은 돈을 붙잡는 손의 모양을 만들고, ${support}은 저축, 투자, 사업, 계약의 안정성을 받쳐 줍니다. ${tension}이 강한 시기에는 확장보다 누수 차단이 먼저입니다. ${transformLine}`;
  }

  if (palace.id === "health") {
    if (category.title.includes("체력") || category.title.includes("스트레스") || category.title.includes("신체")) {
      return `질액궁은 병을 단정하는 자리가 아니라 몸과 마음이 어디서 먼저 피로를 드러내는지 읽는 자리입니다. ${mainName}은 체력 사용 방식과 긴장 반응을 만들고, ${secondName}은 회복 속도와 생활 리듬을 더합니다. ${support}이 좋으면 회복 습관이 빨리 자리 잡지만, ${tension}이 강하면 작은 피로가 감정과 일정 전체로 번질 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("회복") || category.title.includes("과로") || category.title.includes("생활")) {
      return `회복은 쉬는 시간이 아니라 다시 균형을 되찾는 기술입니다. ${mainName}은 어떤 방식으로 기운이 새는지 알려 주고, ${support}은 수면, 식사, 운동, 정리 루틴을 붙잡게 합니다. ${tension}이 커질수록 의지보다 환경 설계가 중요하므로 최소 루틴을 작고 단단하게 고정해야 합니다. ${transformLine}`;
    }
    return `질액궁의 대한 전략은 몸을 몰아붙여 성과를 내는 방식에서 벗어나는 것입니다. ${mainName}은 강하게 쓰면 성취가 빠르지만, ${tension}이 누적되면 번아웃 신호가 먼저 옵니다. 이 궁은 건강을 예언이 아니라 생활 운영표로 다루라고 말합니다. ${transformLine}`;
  }

  if (palace.id === "travel") {
    if (category.title.includes("외부") || category.title.includes("이동") || category.title.includes("타지")) {
      return `천이궁은 밖으로 나갔을 때 열리는 얼굴을 보여줍니다. ${mainName}은 외부 환경에서 내가 어떤 방식으로 기회를 잡는지 만들고, ${secondName}은 이동, 이사, 여행, 대외 활동의 결을 더합니다. ${support}이 좋으면 낯선 장소와 사람이 문을 열어 주지만, ${tension}이 강하면 과속 확장과 이동 피로가 먼저 쌓일 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("이미지") || category.title.includes("기회") || category.title.includes("확장")) {
      return `바깥에서 보이는 이미지는 실제 실력만큼 중요합니다. ${mainName}은 사회가 나를 어떤 역할로 읽는지 알려 주고, ${support}은 외부 평판과 소개 흐름을 도와줍니다. ${tension}이 건드려지면 노출은 커지는데 체력과 일정이 따라가지 못할 수 있어 확장 속도를 조절해야 합니다. ${transformLine}`;
    }
    return `천이궁의 전략은 움직임을 무작정 늘리는 것이 아니라 맞는 무대를 고르는 것입니다. ${mainName}은 어디에서 힘이 나는지 말하고, ${support}은 그 무대에서 사람과 기회를 연결합니다. ${tension}이 강할 때는 이동보다 목적, 목적보다 회복 동선을 먼저 정해야 합니다. ${transformLine}`;
  }

  if (palace.id === "friends") {
    if (category.title.includes("친구") || category.title.includes("팀원") || category.title.includes("도움")) {
      return `노복궁은 나를 둘러싼 사람들의 질과 쓰임을 봅니다. ${mainName}은 어떤 팀원, 친구, 고객, 팔로워를 끌어들이는지 보여주고, ${support}은 그 연결을 실제 도움으로 바꿉니다. ${tension}이 강하면 사람은 많은데 기운이 새거나 역할 불균형이 생길 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("소모") || category.title.includes("집단") || category.title.includes("리더십")) {
      return `집단 안에서 이 궁은 내가 이끄는 사람인지, 돕는 사람인지, 조율하는 사람인지 보여줍니다. ${mainName}은 집단 속 역할을 만들고, ${tension}은 관계 소모와 기대 과잉의 지점을 알려 줍니다. 오래 가는 네트워크를 만들려면 친분보다 역할, 기여, 보상 구조가 먼저 정리되어야 합니다. ${transformLine}`;
    }
    return `노복궁의 네트워크 전략은 사람을 많이 아는 것이 아니라 나의 운을 흐리지 않는 사람을 곁에 두는 것입니다. ${mainName}은 맞는 집단의 성격을 알려 주고, ${support}은 실제 협력 자원을 붙입니다. ${tension}이 강한 시기에는 관계 확장보다 소모 관계 정리가 먼저입니다. ${transformLine}`;
  }

  if (palace.id === "career") {
    if (category.title.includes("직업") || category.title.includes("역할") || category.title.includes("직무")) {
      return `관록궁은 직업명보다 일하는 방식과 인정받는 구조를 봅니다. ${mainName}은 내가 어떤 역할에서 능력이 살아나는지 만들고, ${secondName}은 그 역할이 조직형인지 독립형인지의 결을 더합니다. ${support}이 좋으면 협업과 평판이 함께 붙지만, ${tension}이 강하면 역할 충돌과 과로가 먼저 나타날 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("조직") || category.title.includes("리더십") || category.title.includes("평판")) {
      return `조직 안에서는 능력보다 책임 범위가 명확해야 오래 갑니다. ${mainName}은 내가 책임을 맡는 방식과 권한을 쓰는 태도를 보여주고, ${support}은 문서, 발표, 협업, 추천 흐름을 받쳐 줍니다. ${tension}이 강하면 성과가 있어도 평가가 흐려질 수 있으므로 결과를 보이는 형태로 남겨야 합니다. ${transformLine}`;
    }
    return `커리어 전환은 충동보다 명확한 증거가 필요합니다. ${mainName}은 앞으로 키워야 할 전문성을 말하고, ${support}은 그 전문성을 시장과 연결합니다. ${tension}이 강한 시기에는 퇴장보다 정리, 독립보다 포트폴리오, 확장보다 역할 재정의가 먼저입니다. ${transformLine}`;
  }

  if (palace.id === "property") {
    if (category.title.includes("주거") || category.title.includes("집") || category.title.includes("공간")) {
      return `전택궁은 집과 공간이 마음과 생활 리듬을 어떻게 받쳐 주는지 보여줍니다. ${mainName}은 안정감을 느끼는 방식과 공간 취향을 만들고, ${secondName}은 주거 변화와 가족 기반의 결을 더합니다. ${support}이 좋으면 공간이 회복의 그릇이 되지만, ${tension}이 강하면 주거 불안이나 생활 리듬 붕괴가 먼저 나타날 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("가족") || category.title.includes("재산") || category.title.includes("이사")) {
      return `생활 기반은 감정만으로 결정하면 흔들리기 쉽습니다. ${mainName}은 가족과 터전의 기준을 만들고, ${support}은 장기 자산과 안정 구조를 돕습니다. ${tension}이 강한 시기에는 이사, 매매, 큰 지출을 서두르기보다 계약 조건과 생활 동선을 먼저 검토해야 합니다. ${transformLine}`;
    }
    return `전택궁의 전략은 내 몸과 마음이 회복되는 기반을 만드는 것입니다. ${mainName}은 어떤 터전에서 운이 안정되는지 알려 주고, ${support}은 그 기반을 오래 유지하게 합니다. ${tension}이 강하면 공간 정리, 고정비 점검, 가족 경계 설정이 먼저입니다. ${transformLine}`;
  }

  if (palace.id === "fortune") {
    if (category.title.includes("마음") || category.title.includes("행복") || category.title.includes("내면")) {
      return `복덕궁은 혼자 있을 때의 마음 온도와 행복을 느끼는 방식을 봅니다. ${mainName}은 내면의 기본 리듬을 만들고, ${secondName}은 취향, 휴식, 영성, 예술 감각의 결을 더합니다. ${support}이 좋으면 마음이 스스로 회복하는 힘이 강하지만, ${tension}이 커지면 쉬어도 쉬지 못하는 생각 과열이 생길 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("스트레스") || category.title.includes("불안") || category.title.includes("공허")) {
      return `불안과 공허감은 약함이 아니라 마음의 기운이 어디에서 새는지 알려 주는 신호입니다. ${mainName}은 만족감을 느끼는 조건을 만들고, ${tension}은 생각이 고착되는 지점을 알려 줍니다. 이 궁은 휴식도 계획해야 회복이 된다고 말하며, 혼자 있는 시간의 질을 반드시 관리해야 합니다. ${transformLine}`;
    }
    return `복덕궁의 행복 전략은 바깥 성과를 내면 안정으로 번역하는 일입니다. ${mainName}은 어떤 활동이 마음을 맑게 하는지 말하고, ${support}은 취미와 회복 루틴을 붙입니다. ${tension}이 강할 때는 사람을 더 만나기보다 생각을 비우는 구조를 먼저 만들어야 합니다. ${transformLine}`;
  }

  return (() => {
    if (category.title.includes("부모") || category.title.includes("보호자") || category.title.includes("보호")) {
      return `부모궁은 부모와 보호자뿐 아니라 윗사람, 멘토, 제도권과의 인연을 함께 봅니다. ${mainName}은 권위와 보호를 받아들이는 방식을 만들고, ${secondName}은 기대와 독립의 균형을 더합니다. ${support}이 좋으면 필요한 순간 도움을 받기 쉽지만, ${tension}이 강하면 기대 압박이나 문서 문제가 마음을 무겁게 할 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("권위") || category.title.includes("문서") || category.title.includes("제도")) {
      return `권위자와 제도권 앞에서는 감정보다 기록과 기준이 힘을 냅니다. ${mainName}은 상사, 기관, 규정과 부딪히는 방식을 보여주고, ${support}은 문서 정리와 후원 연결을 돕습니다. ${tension}이 강한 시기에는 말로만 해결하려 하지 말고 증빙, 일정, 승인 절차를 남겨야 합니다. ${transformLine}`;
    }
    return `부모궁의 독립 전략은 보호를 거절하는 것이 아니라 도움과 간섭을 구분하는 데서 시작됩니다. ${mainName}은 어떤 어른과 맞는지 알려 주고, ${support}은 좋은 멘토 운을 현실로 연결합니다. ${tension}이 강할 때는 가족 패턴을 반복하지 않도록 경계와 책임 범위를 조용히 세워야 합니다. ${transformLine}`;
  })();
}

function buildZiweiFullScopeConsultation(
  chart: ZiweiDeepChart,
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  signalSummary: ReturnType<typeof buildSignalPack>,
): string {
  const directSihua = palace.fourTransformations.map((item) => `${transformationTypeToLabel(item.type)} ${item.starName}`);
  const incomingSihua = palace.incomingFourTransformations.map((item) => `${transformationTypeToLabel(item.type)} ${item.starName}`);
  const period = chart.majorPeriods.find((item) => item.palaceId === palace.id) || chart.majorPeriods[0];
  const annualHit = Boolean(chart.annualFlow?.keyPalaces?.includes(palace.id));
  const annualLabel = chart.annualFlow?.yearLabel || `${chart.yearGan}${chart.yearZhi}`;
  const opposite = palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId];
  const triad = signalSummary.triadNames.join(", ");
  const mainStars = signalSummary.mainStars.map((star) => star.name).join(", ") || `${opposite} 차성`;
  const sihuaLine = directSihua.length
    ? `직접 사화는 ${directSihua.join(", ")}로 이 주제의 사건성을 앞에서 끌고 갑니다.`
    : incomingSihua.length
      ? `직접 사화는 약하지만 ${incomingSihua.join(", ")}가 연결궁에서 들어와 이 주제에 간접 압력을 줍니다.`
      : "사화가 강하게 꽂히지 않은 자리라 평소 별의 성정과 관계 운영 방식이 더 중요합니다.";
  const emptyLine = palace.isEmptyMainStarPalace
    ? `이 궁은 공궁 성향이 있어 ${opposite}의 별을 빌려 읽어야 하며, 그래서 환경과 상대 선택이 결과를 크게 바꿉니다.`
    : `이 궁은 주성이 직접 자리를 잡아 ${mainStars}의 성정이 비교적 곧게 드러납니다.`;
  const periodLine = period
    ? `대한에서는 ${period.range} 구간의 ${ZIWEI_PALACE_NAME[period.palaceId]} 흐름과 맞물려, 지금의 선택이 장기 습관으로 굳어질 수 있습니다.`
    : "대한 흐름은 현재 궁의 반복 습관을 기준으로 보수적으로 읽어야 합니다.";
  const annualLine = annualHit
    ? `${annualLabel} 유년에는 이 궁이 직접 건드려지므로 ${category.title}이 실제 사건으로 빨리 드러날 수 있습니다.`
    : `${annualLabel} 유년에는 이 궁이 전면에 서기보다 연결궁과 대궁을 통해 간접적으로 움직입니다.`;

  return removeRepeatedZiweiDeepPhrases(
    `자미두수식으로 깊게 보면 ${category.title}은 원국, 대궁, 삼방사정, 사화, 대한과 유년을 함께 묶어 판단해야 합니다. 원국에서는 ${mainStars}이 핵심 성향을 만들고, 대궁 ${opposite}과 삼방 ${triad}이 현실 장면을 보정합니다. ${emptyLine} ${sihuaLine} ${periodLine} ${annualLine} 실전 상담에서는 이 모든 신호를 한 줄로 합쳐, 지금 당장 넓힐 부분과 조심스럽게 정리할 부분을 분리해 읽습니다.`,
  );
}

function buildCategoryCounselingParagraph(
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  categoryIndex: number,
  lens: PalaceCounselingLens,
  starNarratives: string[],
  signalSummary: ReturnType<typeof buildSignalPack>,
  chartContext: ZiweiDeepChart,
): string {
  const starLine = starNarratives.slice(0, 2).join(" ");
  const mainNames = signalSummary.mainStars.map((star) => star.name).join(", ") || "연결궁 별";
  const relationshipAnchor = lens.relationshipLens[categoryIndex % lens.relationshipLens.length] || "관계 패턴";
  const personalityAnchor = lens.personalityLens[categoryIndex % lens.personalityLens.length] || "성향";
  const cautionAnchor = lens.cautionLens[categoryIndex % lens.cautionLens.length] || "과속 판단";
  const adviceAnchor = lens.lifeAdviceLens[categoryIndex % lens.lifeAdviceLens.length] || "운영 규칙";
  const transformationLine = signalSummary.transformations.length
    ? `${category.title}에서는 ${signalSummary.transformations[0].type} ${signalSummary.transformations[0].starName} 흐름이 겹치면 같은 사건도 체감 강도가 커집니다.`
    : `${category.title}은 직접 사화가 약할수록 작은 습관 차이가 결과를 크게 가릅니다.`;
  const emptyPalaceLine = palace.isEmptyMainStarPalace
    ? `${category.title}은 타고난 고정값보다 환경과 상대에 따라 크게 달라집니다. 마주 보는 궁 ${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}이 실제 반응을 대신 움직이고, 삼방 ${signalSummary.triadNames.join(", ")} 연결이 결과를 키우거나 줄입니다.`
    : `${category.title}은 내가 먼저 기준을 잡을수록 주변 조건이 따라오는 편입니다.`;

  const palaceSpecificLine = palace.id === "spouse"
    ? "부부궁에서는 감정의 크기보다 대화의 순서와 신뢰 확인 방식이 관계의 수명을 좌우합니다. 상대를 바꾸기보다 갈등이 생길 때 어떤 말부터 꺼낼지 합의하는 것이 장기 안정에 가장 효과적입니다."
    : palace.id === "career"
      ? "관록궁에서는 능력보다 역할 정의가 먼저입니다. 조직에서 무엇을 책임지고 어디까지 결정권을 가질지 명확해질수록 평판이 안정되고, 이직이나 독립 판단도 훨씬 정확해집니다."
      : palace.id === "fortune"
        ? "복덕궁에서는 바깥 성과보다 내면 회복 속도가 핵심 변수입니다. 혼자 있는 시간의 질이 떨어지면 행복감이 급격히 낮아지므로, 감정을 정리하는 루틴을 일정처럼 고정해야 불안 누적을 줄일 수 있습니다."
        : "";

  const lifeSceneLine = (() => {
    const topMain = signalSummary.mainStars[0]?.name || "핵심 별";
    const topSupport = signalSummary.supportStars[0] || "보조 별";
    const topMinor = signalSummary.minorStars[0] || "긴장 별";

    if (palace.id === "ming") {
      return `명궁에서는 ${topMain}의 기질이 당신의 첫 반응과 자기 주도권을 결정합니다. ${topSupport}이 받쳐주면 중심이 단단해지고, ${topMinor}이 과열되면 자기 의심이 커질 수 있어 기준 문장을 먼저 잡는 것이 좋습니다.`;
    }
    if (palace.id === "spouse") {
      return `부부궁에서는 ${topMain} 성향이 애정 표현 방식과 갈등 회복 속도를 좌우합니다. ${topSupport}이 살아 있으면 신뢰 회복이 빠르고, ${topMinor}이 강하면 말의 온도 차이가 커지기 쉬워 대화 순서를 합의하는 것이 중요합니다.`;
    }
    if (palace.id === "career") {
      return `관록궁에서는 ${topMain}이 직무 적합성과 사회적 성취의 축을 만듭니다. ${topSupport}이 붙으면 평판과 협업 효율이 올라가고, ${topMinor}이 흔들리면 과로·역할 충돌이 먼저 나타나므로 역할 경계 설정이 핵심입니다.`;
    }
    if (palace.id === "wealth") {
      return `재백궁에서는 ${topMain}이 수입 구조와 돈의 운용 습관을 만듭니다. ${topSupport}은 수익 회수력을 높이고, ${topMinor}이 자극되면 충동 소비나 과속 거래가 생기기 쉬워 지출 규칙과 손실 상한선이 필요합니다.`;
    }
    if (palace.id === "fortune") {
      return `복덕궁에서는 ${topMain}이 마음의 온도와 행복감 유지 방식을 정합니다. ${topSupport}이 회복을 돕고, ${topMinor}이 커지면 생각이 과열되어 쉬어도 쉬지 못하는 흐름이 생기므로 회복 루틴을 생활의 중심에 놓아야 합니다.`;
    }
    if (palace.id === "parents") {
      return `부모궁에서는 ${topMain}이 권위자와의 거리 감각을 만들고, ${topSupport}은 후원 연결을 돕습니다. ${topMinor}이 강하면 기대 압박이나 문서 실수가 커질 수 있어 기록 중심 소통이 안전합니다.`;
    }
    if (palace.id === "friends") {
      return `노복궁에서는 ${topMain}이 협력자 선택 기준을 만들고, ${topSupport}은 네트워크 확장에 힘을 보탭니다. ${topMinor}이 과열되면 관계 소모가 빨라질 수 있어 역할·기여·보상 구조를 분명히 해야 합니다.`;
    }
    if (palace.id === "health") {
      return `질액궁에서는 ${topMain}이 체력 소모 패턴을 드러내고, ${topSupport}은 회복 속도를 올립니다. ${topMinor}이 과하게 움직이면 번아웃이 앞당겨질 수 있어 수면·식사·운동의 최소 루틴을 고정해야 합니다.`;
    }
    if (palace.id === "travel") {
      return `천이궁에서는 ${topMain}이 외부 확장 방식과 적응력을 결정합니다. ${topSupport}이 붙으면 기회 유입이 빨라지고, ${topMinor}이 커지면 과속 확장으로 피로가 누적되기 쉬워 일정 간격 조절이 필요합니다.`;
    }
    if (palace.id === "property") {
      return `전택궁에서는 ${topMain}이 생활 기반 안정 방식에 영향을 주고, ${topSupport}은 자산 축적의 지속성을 높입니다. ${topMinor}이 흔들리면 주거 불안과 리듬 붕괴가 겹치기 쉬워 공간·생활 루틴을 먼저 정비해야 합니다.`;
    }
    if (palace.id === "siblings") {
      return `형제궁에서는 ${topMain}이 수평 관계의 말투와 기대치를 만들고, ${topSupport}은 협업 신뢰를 받쳐 줍니다. ${topMinor}이 자극되면 비교 심리가 커지기 쉬워 역할 합의를 먼저 세우는 편이 안정적입니다.`;
    }
    return `자녀궁에서는 ${topMain}이 돌봄과 결과물 생산 흐름을 만들고, ${topSupport}은 완성도를 높입니다. ${topMinor}이 과열되면 책임 과부하가 생기기 쉬워 기대치 조정이 필요합니다.`;
  })();

  const crossPalaceLine = (() => {
    const opposite = palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId];
    const triad = signalSummary.triadNames.slice(0, 2).join("·");
    if (palace.id === "spouse") {
      return `관계 흐름은 ${opposite}과 ${triad}의 신호를 함께 볼 때 정확해집니다. 사랑은 감정만으로 유지되지 않으며, 일과 돈의 리듬이 맞아야 오래 갑니다.`;
    }
    if (palace.id === "career") {
      return `커리어 흐름은 ${opposite}과 ${triad}의 균형에서 성패가 갈립니다. 실력뿐 아니라 관계와 회복 리듬을 같이 맞춰야 성취가 오래갑니다.`;
    }
    if (palace.id === "wealth") {
      return `재물 흐름은 ${opposite}과 ${triad}의 결합에서 크게 달라집니다. 돈은 일의 구조와 사람의 흐름이 동시에 맞물릴 때 안정적으로 남습니다.`;
    }
    if (palace.id === "ming") {
      return `자기 운영은 ${opposite}과 ${triad}의 반응으로 검증됩니다. 마음의 기준이 현실 성과와 이어지도록 주간 루틴으로 고정해야 흔들림이 줄어듭니다.`;
    }
    return `${palace.name}의 결과는 ${opposite}과 ${triad} 연결 흐름에서 확대되거나 축소됩니다. 한 궁만 보지 말고 연결궁을 함께 읽을 때 실제 장면이 선명해집니다.`;
  })();
  const palaceDepthLine = palace.id === "ming"
    ? buildMingCounselingExpansion(category, signalSummary)
    : palace.id === "siblings"
      ? buildSiblingCounselingExpansion(category, signalSummary)
      : buildRemainingPalaceCounselingExpansion(palace, category, signalSummary);
  const fullScopeLine = buildZiweiFullScopeConsultation(chartContext, palace, category, signalSummary);

  return ensureCounselingDepth(
    removeRepeatedZiweiDeepPhrases([
      `${category.question}`,
      starLine,
      lifeSceneLine,
      palaceDepthLine,
      fullScopeLine,
      `명반을 보면 당신은 ${personalityAnchor}이 중심이 되는 사람이에요. ${mainNames}의 조합이 선택의 속도와 확신을 좌우하기 때문에, 같은 상황도 누구보다 빠르게 결론을 내리거나 반대로 오래 붙잡고 있을 수 있습니다. 그러니 결정 앞에서 내 리듬이 어느 쪽인지부터 알아 두면 흔들림이 줄어요.`,
      `사람들과의 관계에서는 ${relationshipAnchor}이 열쇠입니다. 가까운 사이일수록 기대치와 경계선을 먼저 맞춰 두어야 마음이 덜 다치고, 오래 가는 인연도 바로 거기서 시작돼요.`,
      `현실에서는 ${palace.name}의 ${category.title}이 업무·연애·돈·가족 중 지금 기운이 몰린 장면에서 먼저 결과로 나타납니다. ${transformationLine}`,
      crossPalaceLine,
      `${category.title}의 주의할 점은 ${cautionAnchor}입니다. 살성의 압박이나 화기 흐름이 겹치면 작은 말 한마디도 크게 번질 수 있어 속도 조절이 필요합니다.`,
      `${category.title}의 조언은 ${adviceAnchor}을 바로 실행하는 것입니다. 오늘부터 ${category.title} 기준표와 선택 조건을 문장으로 정리하면 흔들림이 줄어듭니다.`,
      palaceSpecificLine,
      emptyPalaceLine,
    ].join(" ")),
    palace,
    category,
    {
      personality: `${personalityAnchor}이 강할수록 장점은 분명해지지만 고집으로 굳지 않도록 점검이 필요합니다.`,
      relationship: `${relationshipAnchor}에서 신뢰를 만들려면 상대 기대와 내 한계를 동시에 말해 두는 방식이 가장 안정적입니다.`,
      caution: `${cautionAnchor}이 반복되면 결정 피로가 누적되고 관계 소모가 빨라질 수 있습니다.`,
      advice: `${adviceAnchor}을 매일 10분 루틴으로 고정하고, 중요한 결정은 24시간 재검토 규칙을 적용하세요.`,
    },
  );
}

function ensureCategorySectionDepth(body: string, category: ZiweiPalaceCategoryReading): string {
  let next = String(body || "").trim();
  const fillers = [
    `${category.categoryTitle}의 성향 축을 먼저 파악하면 같은 상황에서도 반응 흔들림이 줄어듭니다.`,
    `${category.categoryTitle}의 인간관계 장면에서는 기대와 경계를 함께 말해 두는 방식이 갈등 예방에 가장 효과적입니다.`,
    `${category.categoryTitle}은 현실에서 일·돈·사랑·가족 중 압력이 큰 영역에서 먼저 체감되므로 우선순위 정리가 필요합니다.`,
    `${category.categoryTitle}에서 주의할 점은 속도를 내기 전에 리스크 신호를 확인하는 습관입니다.`,
    `${category.categoryTitle}의 조언은 오늘 바로 실행할 수 있는 루틴 한 가지를 정해 7일 연속 유지하는 것입니다.`,
  ];
  let idx = 0;
  while (next.length < 520 && idx < fillers.length) {
    next += `\n\n${fillers[idx % fillers.length]}`;
    idx += 1;
  }
  return next;
}

export function buildZiweiPalaceCategoryReading(
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  chartContext: ZiweiDeepChart,
): ZiweiPalaceCategoryReading {
  const signals = buildSignalPack(chartContext, palace);
  const lens = PALACE_COUNSELING_LENSES[palace.id];
  const categories = PALACE_CATEGORY_SPECS[palace.id] || [];
  const categoryIndex = Math.max(0, categories.findIndex((item) => item.title === category.title));

  const mainNarratives = signals.mainStars.slice(0, 2).map((star) => describeStarInPalaceContext(star, palace, category, pickGroupForStar(palace, star.name)));
  const supportNarratives = [...palace.auxiliaryStars.slice(0, 1), ...palace.maleficStars.slice(0, 1)]
    .map((star) => describeStarInPalaceContext(star, palace, category, pickGroupForStar(palace, star.name)));
  const starNarratives = [...mainNarratives, ...supportNarratives];

  const interpretation = buildCategoryCounselingParagraph(
    palace,
    category,
    categoryIndex,
    lens,
    starNarratives,
    signals,
    chartContext,
  );

  const opportunity = removeRepeatedZiweiDeepPhrases(
    `${category.title}의 기회는 ${signals.mainStars.length ? signals.mainStars.map((star) => star.name).join(", ") : `${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]} 흐름`}이 방향을 잡고, ${signals.triadNames.slice(0, 2).join("·")}에서 실행 무대가 열릴 때 커집니다. ${category.title}에서는 ${lens.lifeAdviceLens[categoryIndex % lens.lifeAdviceLens.length]}을 먼저 잡으면 성과 속도가 눈에 띄게 빨라집니다.`,
  );

  const caution = removeRepeatedZiweiDeepPhrases(
    `${category.title}의 밝기 흐름을 보면 ${contextualizeByCategory(signals.brightnessSummary, category.title)} 특히 ${signals.minorStars.length ? signals.minorStars.join(", ") : "긴장 신호"}이 커지는 시기에는 ${lens.cautionLens[categoryIndex % lens.cautionLens.length]}이 반복될 수 있습니다. 과한 확신으로 밀어붙이기보다 기준을 확인한 뒤 한 단계씩 진행하세요.`,
  );

  const action = removeRepeatedZiweiDeepPhrases(
    `${category.title}에서 오늘의 실전 조언은 간단합니다. ${lens.lifeAdviceLens[categoryIndex % lens.lifeAdviceLens.length]}을 체크리스트로 만들고, ${palace.name}의 핵심 질문인 "${category.question}"에 대한 내 답을 문장 2줄로 적으세요. ${category.title} 루틴을 7일만 유지해도 판단 흔들림이 크게 줄어듭니다.`,
  );

  return {
    categoryTitle: category.title,
    categoryQuestion: category.question,
    usedSignals: signals.usedSignals.slice(0, 5),
    interpretation,
    opportunity,
    caution,
    action,
  };
}

export function buildZiweiDeepPalaceReading(chart: ZiweiDeepChart, palace: ZiweiPalace): ZiweiDeepPalaceReading {
  const signals = buildSignalPack(chart, palace);
  const categories = PALACE_CATEGORY_SPECS[palace.id].map((category) => buildZiweiPalaceCategoryReading(palace, category, chart));
  return {
    palaceId: palace.id,
    palaceName: ZIWEI_PALACE_NAME[palace.id],
    palaceBranch: palace.earthlyBranch,
    isEmptyPalace: palace.isEmptyMainStarPalace,
    mainStars: signals.mainStars,
    supportStars: palace.auxiliaryStars,
    minorStars: palace.minorStars,
    transformations: signals.transformations,
    brightnessSummary: signals.brightnessSummary,
    oppositePalace: palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId],
    sanFangSiZheng: {
      sourcePalaces: signals.triadNames,
      keyStars: palace.sanFangSiZheng.mainStars,
      summary: `연결된 궁 ${signals.triadNames.join(", ")}과 마주 보는 궁 ${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}을 함께 볼 때 ${palace.name}의 실제 흐름이 선명해집니다.`,
    },
    categories,
    summary: removeRepeatedZiweiDeepPhrases(`${ZIWEI_PALACE_TEMPLATES[palace.id].meaning} ${signals.brightnessSummary}`),
    practicalAdvice: unique(categories.map((category) => category.action), 5),
  };
}

function buildCounselingCategorySection(category: ZiweiPalaceCategoryReading, index: number): string {
  const modes = [
    (cat: ZiweiPalaceCategoryReading) => [
      cat.interpretation,
      `관계 장면에서는 ${cat.opportunity}`,
      `현실 장면에서는 ${cat.caution}`,
      `지금 적용할 조언은 ${cat.action}`,
    ].join("\n\n"),
    (cat: ZiweiPalaceCategoryReading) => [
      `이 주제의 핵심은 다음과 같습니다. ${cat.interpretation}`,
      `사람들과 맞물릴 때는 ${cat.opportunity}`,
      `주의 신호는 ${cat.caution}`,
      `행동으로 옮길 때는 ${cat.action}`,
    ].join("\n\n"),
    (cat: ZiweiPalaceCategoryReading) => [
      cat.interpretation,
      `성향과 관계를 함께 보면 ${cat.opportunity}`,
      `생활 현장에서는 ${cat.caution}`,
      `오늘의 실행 포인트는 ${cat.action}`,
    ].join("\n\n"),
  ];
  const baseBody = modes[index % modes.length](category);
  const body = ensureCategorySectionDepth(baseBody, category);
  return `### ${index + 1}. ${category.categoryTitle}\n\n${body}`;
}

function buildCounselingOpening(chart: ZiweiDeepChart, palace: ZiweiPalace, reading: ZiweiDeepPalaceReading): string {
  const lens = PALACE_COUNSELING_LENSES[palace.id];
  const meaning = ZIWEI_PALACE_TEMPLATES[palace.id].meaning;
  const starSummary = reading.mainStars.length
    ? reading.mainStars.map((star) => starBadge(star)).join(", ")
    : `${palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId]}과 ${reading.sanFangSiZheng?.sourcePalaces.join(", ") || "연결궁"} 흐름`;
  const sihuaLine = reading.transformations.length
    ? `특히 ${reading.transformations.slice(0, 2).map((item) => `${item.type} ${item.starName}`).join(", ")}가 겹칠 때 체감 사건이 분명해집니다.`
    : "직접 사화가 약한 만큼, 일상 선택 습관이 결과를 더 크게 좌우합니다.";
  const emptyLine = palace.isEmptyMainStarPalace
    ? `이 궁은 공궁이어서 타고난 고정값보다 환경과 상대에 따라 크게 달라집니다. 마주 보는 궁 ${reading.oppositePalace || "대궁"}이 이 영역을 대신 움직이고, 삼방 ${reading.sanFangSiZheng?.sourcePalaces.join(", ") || "연결궁"}을 어떤 사람과 연결하느냐가 결과 차이를 만듭니다.`
    : "이 궁은 스스로 기준을 잡을수록 강점이 빠르게 현실 성과로 전환되는 편입니다.";

  return removeRepeatedZiweiDeepPhrases([
    `${reading.palaceName}은 당신의 삶에서 ${meaning}를 보여주는 자리입니다.`,
    lens.opening,
    `이 궁에 놓인 별의 조합을 보면 ${lens.role}이 강하게 작동합니다. 핵심 별 흐름은 ${starSummary}이고, ${sihuaLine}`,
    emptyLine,
    `성향으로 보면 ${lens.personalityLens.join(", ")}이 삶의 기본 톤을 만들고, 사람들과의 관계에서는 ${lens.relationshipLens.join(", ")}이 반복 패턴을 결정합니다.`,
    `현실에서는 일·돈·사랑·가족 중 현재 압력이 큰 영역에서 신호가 먼저 드러나며, 주의할 점은 ${lens.cautionLens.join(", ")}입니다. 조언은 ${lens.lifeAdviceLens.join(", ")}을 당장 일정에 넣는 것입니다.`,
    `올해 핵심 키워드 ${chart.summary.keywords.slice(0, 3).join(", ")}를 기준으로 읽으면 방향이 더 선명해집니다.`,
  ].join("\n\n"));
}

export function buildZiweiDeepCounselingText(
  chart: ZiweiDeepChart,
  palace: ZiweiPalace,
  reading: ZiweiDeepPalaceReading,
  retry = false,
): string {
  const header = buildCounselingOpening(chart, palace, reading);
  const orderedCategories = retry ? [...reading.categories].reverse().reverse() : reading.categories;
  const sections = orderedCategories.map((category, index) => buildCounselingCategorySection(category, index));
  return uniquifyRepeatedSentences([header, ...sections].join("\n\n")).trim();
}

export function buildZiweiDeepPalaceText(reading: ZiweiDeepPalaceReading): string {
  const sections = reading.categories.map((category, index) => buildCounselingCategorySection(category, index));
  return uniquifyRepeatedSentences(removeRepeatedZiweiDeepPhrases(sections.join("\n\n")));
}

function splitCategoryBodies(fullText: string): string[] {
  const matches = String(fullText || "").split(/\n###\s+\d+\.\s+/g);
  if (matches.length <= 1) return [];
  const first = matches[0].includes("### 1.") ? matches : [matches[0], ...matches.slice(1)];
  const normalized = first[0].includes("### 1.")
    ? first
    : [`### 1. ${first[1] || ""}`, ...first.slice(2).map((row, index) => `### ${index + 2}. ${row}`)];
  return normalized.filter((row) => row.includes("###"));
}

function countCoverageSignals(text: string): number {
  const checks = [
    /(성향|기질|반응|욕구|자존감|사고방식)/,
    /(관계|사람|상대|연애|동료|가족|신뢰)/,
    /(현실|직업|돈|사랑|가족|생활|업무|수입|소비)/,
    /(주의|조심|리스크|충돌|번아웃|갈등|흔들)/,
    /(조언|실행|오늘부터|루틴|규칙|행동)/,
  ];
  return checks.reduce((count, regex) => (regex.test(text) ? count + 1 : count), 0);
}

function hasRepeatedSentence(fullText: string): boolean {
  const sentences = String(fullText || "")
    .split(/(?<=[.!?다요])\s+|\n+/)
    .map((row) => row.trim())
    .filter((row) => row.length >= 24);
  const seen = new Set<string>();
  for (const sentence of sentences) {
    const key = sentence.replace(/\s+/g, " ");
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function includesWrongPalaceOpening(reading: ZiweiDeepChapter): boolean {
  if (!reading.palaceReading) return false;
  const current = reading.palaceReading.palaceName;
  const allPalaces = Object.values(ZIWEI_PALACE_NAME).filter((name) => name !== current);
  const text = String(reading.fullText || "");
  return allPalaces.some((name) => text.includes(`${name}은 당신의 삶에서`) || text.includes(`${name}은 당신이`));
}

export function validateZiweiDeepReading(reading: ZiweiDeepChapter): ValidationResult {
  const issues: string[] = [];
  const debugValidation = validateNoZiweiDebugPhrases(`${reading.title}\n${reading.summary.join(" ")}\n${reading.fullText}`);
  issues.push(...debugValidation.issues);
  const forbiddenDocPhrases = [
    "질문:",
    "해석 신호:",
    "usedSignals",
    "payload",
    "debug",
    "fallback",
    "데이터 부족",
    "보강",
    "CHAPTER 메모",
    "강약 서열",
    "raw json",
  ];
  forbiddenDocPhrases.forEach((phrase) => {
    if (String(reading.fullText || "").includes(phrase)) {
      issues.push(`기술 문서형 문구 노출: ${phrase}`);
    }
  });

  if (reading.palaceId) {
    if (!reading.palaceReading) {
      issues.push("궁별 상세 데이터 누락");
    } else {
      const expectedCount = (PALACE_CATEGORY_SPECS[reading.palaceReading.palaceId as ZiweiPalaceId] || []).length || 8;
      if (reading.palaceReading.categories.length !== expectedCount) {
        issues.push(`${reading.palaceReading.palaceName} 카테고리 수 불일치`);
      }

      const sectionMatches = String(reading.fullText || "").match(/###\s+\d+\.\s+/g) || [];
      if (sectionMatches.length !== expectedCount) {
        issues.push(`${reading.palaceReading.palaceName} 본문 카테고리 블록 수 불일치`);
      }

      const categoryBodies = splitCategoryBodies(reading.fullText);
      if (categoryBodies.length && categoryBodies.length !== expectedCount) {
        issues.push(`${reading.palaceReading.palaceName} 카테고리 본문 분리 실패`);
      }

      reading.palaceReading.categories.forEach((category) => {
        if (category.interpretation.length < 250) {
          issues.push(`${reading.palaceReading?.palaceName}/${category.categoryTitle} 해석 길이 부족`);
        }
        if ((category.usedSignals || []).length < 2) {
          issues.push(`${reading.palaceReading?.palaceName}/${category.categoryTitle} 실제 신호 반영 부족`);
        }
      });

      categoryBodies.forEach((body, index) => {
        const plainBody = body.replace(/^###\s+\d+\.\s+/g, "").trim();
        if (plainBody.length < 450) {
          issues.push(`${reading.palaceReading?.palaceName}/카테고리 ${index + 1} 본문 길이 부족`);
        }
        if (countCoverageSignals(plainBody) < 4) {
          issues.push(`${reading.palaceReading?.palaceName}/카테고리 ${index + 1} 상담 요소 부족`);
        }
      });

      if (reading.palaceReading.isEmptyPalace && !reading.palaceReading.oppositePalace) {
        issues.push(`${reading.palaceReading.palaceName} 공궁 보완 해석 누락`);
      }
      if (hasRepeatedSentence(reading.fullText)) {
        issues.push(`${reading.palaceReading.palaceName} 동일 문장 반복`);
      }
      if (includesWrongPalaceOpening(reading)) {
        issues.push(`${reading.palaceReading.palaceName}과 맞지 않는 궁 설명 혼입`);
      }
    }
  }
  return { valid: issues.length === 0, issues };
}
