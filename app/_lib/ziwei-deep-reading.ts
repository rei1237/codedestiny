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
  ZiweiEvidenceChip,
  ZiweiPalace,
  ZiweiPalaceCategoryReading,
  ZiweiPalaceId,
  ZiweiStarMeta,
  ZiweiTransformation,
} from "./ziwei-types";

const ZIWEI_DEEP_READING_TEXT_TRANSLATIONS = {
  ko: {
    "zdr.title.001": "처음 반응할 때 나는 어떤 사람인가",
    "zdr.title.002": "나는 언제 스스로를 믿게 되나",
    "zdr.title.003": "결정할 때 내 안에서 먼저 움직이는 것",
    "zdr.title.004": "처음 만난 사람이 느끼는 나",
    "zdr.title.005": "압박이 올 때 나를 지키는 방식",
    "zdr.title.006": "내가 계속 반복하는 선택",
    "zdr.title.007": "내 강점이 성과로 바뀌는 자리",
    "zdr.title.008": "내가 나를 가장 아깝게 쓰는 순간",
    "zdr.title.009": "가까운 사이에서 내가 잡는 거리",
    "zdr.title.010": "친구·동료 사이에서 편한 내 위치",
    "zdr.title.011": "경쟁이 붙으면 나는 어떻게 되나",
    "zdr.title.012": "함께 일할 때 내가 잘하는 것",
    "zdr.title.013": "주변이 나를 밀어주는 조건",
    "zdr.title.014": "같이 하는 일이 잘 풀리는 순간",
    "zdr.title.015": "나와 오래 가는 사람의 유형",
    "zdr.title.016": "지금 인맥을 어떻게 써야 하나",
    "zdr.title.017": "나는 어떻게 사랑을 시작하고 확인하나",
    "zdr.title.018": "내가 자꾸 끌리는 사람",
    "zdr.title.019": "관계를 오래 끌고 가려면 필요한 것",
    "zdr.title.020": "내 곁의 사람은 어떻게 들어오나",
    "zdr.title.021": "우리가 늘 같은 데서 부딪히는 이유",
    "zdr.title.022": "나는 무엇을 받아야 사랑받는다고 느끼나",
    "zdr.title.023": "마음이 멀어지기 시작하는 지점",
    "zdr.title.024": "지금 관계에서 먼저 정해야 할 것",
    "zdr.title.025": "돌봄이 내게 들어오는 방식",
    "zdr.title.026": "아끼는 사이에서 내가 넘는 선",
    "zdr.title.027": "아랫사람을 키울 때 나오는 재능",
    "zdr.title.028": "내가 만든 것이 빛을 보는 조건",
    "zdr.title.029": "오래 남는 성과를 만드는 방식",
    "zdr.title.030": "내가 책임을 지나치게 지는 순간",
    "zdr.title.031": "애정과 성과를 섞을 때 생기는 일",
    "zdr.title.032": "지금 성과를 어디에 걸어야 하나",
    "zdr.title.033": "내가 돈을 버는 방식",
    "zdr.title.034": "내 수입이 흔들리는 지점",
    "zdr.title.035": "내가 지갑을 여는 순간",
    "zdr.title.036": "나에게 맞는 자산 쌓기 속도",
    "zdr.title.037": "거래에서 내가 유리해지는 조건",
    "zdr.title.038": "돈이 나에게 오는 길",
    "zdr.title.039": "내 돈이 새는 곳",
    "zdr.title.040": "지금 돈에서 지켜야 할 것",
    "zdr.title.041": "내 체력이 도는 리듬",
    "zdr.title.042": "스트레스가 몸에 먼저 나타나는 곳",
    "zdr.title.043": "일상에서 가장 먼저 무너지는 축",
    "zdr.title.044": "내가 빨리 회복되는 조건",
    "zdr.title.045": "무리할 때 내가 보내는 신호",
    "zdr.title.046": "마음이 컨디션을 흔드는 방식",
    "zdr.title.047": "내 리듬을 무너뜨리는 습관",
    "zdr.title.048": "지금 몸에서 먼저 챙길 것",
    "zdr.title.049": "밖에 나갈 때 살아나는 내 기운",
    "zdr.title.050": "환경을 바꿀 때 생기는 전환",
    "zdr.title.051": "낯선 곳에서 열리는 인연",
    "zdr.title.052": "내가 자연스럽게 넓혀 가는 방식",
    "zdr.title.053": "밖에서 사람들이 읽는 내 캐릭터",
    "zdr.title.054": "기회가 나에게 들어오는 동선",
    "zdr.title.055": "넓힐 때 내가 놓치기 쉬운 것",
    "zdr.title.056": "지금 어디까지 넓혀도 되나",
    "zdr.title.057": "내 곁에 모이는 사람들",
    "zdr.title.058": "함께 움직일 때의 힘 배분",
    "zdr.title.059": "나를 지지하는 사람이 늘어나는 조건",
    "zdr.title.060": "실제로 도움이 되는 사람의 특징",
    "zdr.title.061": "나를 소모시키는 관계",
    "zdr.title.062": "무리 안에서 내가 맡게 되는 역할",
    "zdr.title.063": "이끌 때와 따를 때의 내 방식",
    "zdr.title.064": "지금 사람을 어떻게 정리해야 하나",
    "zdr.title.065": "내가 타고난 일의 결",
    "zdr.title.066": "내 능력이 저절로 증명되는 자리",
    "zdr.title.067": "조직 안에서 내가 힘을 쓰는 법",
    "zdr.title.068": "책임을 맡을 때 나오는 모습",
    "zdr.title.069": "내 평판이 쌓이고 흔들리는 지점",
    "zdr.title.070": "내 성과가 쌓이는 방식",
    "zdr.title.071": "옮기거나 독립해도 되는 조건",
    "zdr.title.072": "지금 커리어에서 먼저 맞출 것",
    "zdr.title.073": "내 생활 기반이 버티는 힘",
    "zdr.title.074": "공간과 자산이 나에게 붙는 방식",
    "zdr.title.075": "가정 환경이 내 리듬을 흔드는 법",
    "zdr.title.076": "내가 진짜로 쉬어지는 공간",
    "zdr.title.077": "공간을 쓰는 데서 드러나는 나",
    "zdr.title.078": "오래 남는 자산의 밑바탕",
    "zdr.title.079": "옮겨도 된다는 신호",
    "zdr.title.080": "지금 생활 기반에서 잡을 것",
    "zdr.title.081": "내 마음의 기본 온도",
    "zdr.title.082": "내가 만족을 느끼는 순간",
    "zdr.title.083": "혼자 있을 때 내 안에서 도는 것",
    "zdr.title.084": "나에게 실제로 통하는 해소법",
    "zdr.title.085": "불안이 커지고 잦아드는 조건",
    "zdr.title.086": "내 마음이 기대는 취향",
    "zdr.title.087": "허무가 스며드는 시점",
    "zdr.title.088": "지금 마음에서 훈련할 것",
    "zdr.title.089": "보호와 기대가 나에게 걸리는 방식",
    "zdr.title.090": "보호자와의 관계가 흐르는 리듬",
    "zdr.title.091": "윗사람과 멘토가 들어오는 형태",
    "zdr.title.092": "기관·문서와 나의 궁합",
    "zdr.title.093": "도움을 받을 때 통하는 태도",
    "zdr.title.094": "권위 앞에서 내가 잡는 거리",
    "zdr.title.095": "가족 안에서 반복되는 긴장",
    "zdr.title.096": "지금 어디까지 기대도 되나",
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
    personalityLens: ["첫 반응", "자기 인식", "판단 기준", "자기방어 방식", "선택 습관", "확신의 속도", "자기 기대치", "회복 리듬"],
    relationshipLens: ["첫인상", "신뢰 형성 속도", "감정 경계", "말의 온도", "가까워지는 방식", "거절하는 방식", "기대 표현", "갈등 후 복구"],
    lifeAdviceLens: ["기준 3문장 기록", "결정 전 감정-사실 분리", "자기방어 신호 기록", "주간 회고", "강점 역할 고정", "결정 24시간 유예", "칭찬 기록", "혼자 있는 시간 확보"],
    cautionLens: ["자기 의심 과열", "감정 해석 과다", "확신 없는 상태의 오판", "관계 반응 과민", "편한 방식만 반복", "과속 결정", "혼자 떠안기", "완벽주의 지연"],
    opening: "명궁은 한 사람의 얼굴빛과 마음의 중심, 선택 앞에서 가장 먼저 올라오는 본능을 보여주는 자리입니다.",
  },
  siblings: {
    role: "형제·친구·동료와의 수평 관계 운영축",
    personalityLens: ["협업 태도", "경쟁 반응", "신뢰 기준", "역할 감각", "거리 조절", "비교 민감도", "양보 습관", "주도권 감각"],
    relationshipLens: ["친구", "동료", "라이벌", "협업 파트너", "오랜 지인", "느슨한 지인", "선의의 경쟁자", "기대가 큰 사이"],
    lifeAdviceLens: ["관계 경계 문장화", "역할 합의", "공동 목표 정렬", "기여도 기록", "연락 주기 고정", "손절 기준 명문화", "감정과 사안 분리", "성과 배분 사전 합의"],
    cautionLens: ["비교 경쟁 과열", "도움과 의존 혼동", "소모성 네트워크", "역할 중복", "말 옮김", "무리한 보증", "감정 부채 누적", "일방적 배려"],
    opening: "형제궁은 혈연뿐 아니라 친구·동료 같은 수평 관계에서 어떤 기운으로 연결되는지를 보여줍니다.",
  },
  spouse: {
    role: "연애·결혼·친밀 관계의 핵심 패턴",
    personalityLens: ["애정 표현 방식", "신뢰 확인 습관", "거리 조절", "갈등 반응", "기대 수준", "질투 민감도", "약속 감각", "회복 속도"],
    relationshipLens: ["연애 초반 속도", "일상 공유 방식", "갈등 대화 순서", "장기 안정 조건", "가족 편입 감각", "경제 공유", "서운함 표현", "재확인 요구"],
    lifeAdviceLens: ["대화 순서 합의", "서운함 24시간 안에 말하기", "기대치 문장화", "돈 규칙 합의", "주간 데이트 고정", "사과 방식 정하기", "혼자 시간 존중", "앞으로의 일정 공유"],
    cautionLens: ["확인 욕구 과열", "침묵으로 버티기", "과잉 배려 뒤 폭발", "상대를 바꾸려는 시도", "비교", "감정 미루기", "경계 없는 헌신", "말 없는 서운함 누적"],
    opening: "부부궁은 사랑의 시작부터 장기 관계 운영까지, 친밀감이 만들어지고 흔들리는 지점을 보여주는 자리입니다.",
  },
  children: {
    role: "자녀·후배·창작 결과물을 키우는 생산 축",
    personalityLens: ["돌봄 태도", "기대 표현", "책임 감각", "완성 욕구", "인내심", "통제 성향", "칭찬 방식", "결과 집착"],
    relationshipLens: ["자녀", "후배", "제자", "팀 막내", "돌봐야 할 사람", "가르치는 상대", "내가 만든 결과물", "협력자"],
    lifeAdviceLens: ["기대치 낮춰 말하기", "역할과 감정 분리", "완성 기준 사전 합의", "중간 점검 고정", "칭찬 먼저", "결과물 공개 주기", "책임 범위 문서화", "쉬는 날 확보"],
    cautionLens: ["과보호", "기대 투사", "책임 과부하", "성과 조급증", "감정 보상 요구", "간섭", "완벽주의", "방임과 통제의 진폭"],
    opening: "자녀궁은 실제 자녀 인연뿐 아니라 후배·창작물·성과물을 어떻게 키워내는지를 드러내는 자리입니다.",
  },
  wealth: {
    role: "수입·소비·투자·사업을 다루는 재정 축",
    personalityLens: ["수익 감각", "지출 습관", "위험 감수", "숫자 감각", "저축 태도", "기회 반응", "손실 회피", "가격 기준"],
    relationshipLens: ["거래 상대", "동업자", "고객", "가족 지출", "투자 조언자", "빌려주고 빌리는 사이", "돈 얘기를 나누는 사람", "지출 동행"],
    lifeAdviceLens: ["지출 상한 설정", "손실 한도 명문화", "수입 통로 두 개 유지", "월 결산 고정", "충동 구매 24시간 유예", "고정비 점검", "계약서 확인", "비상금 분리"],
    cautionLens: ["충동 소비", "과속 투자", "감정 지출", "보증과 대여", "수입 과대 추정", "가격 비교 과잉", "명분 지출", "현금 흐름 방치"],
    opening: "재백궁은 돈을 버는 방식과 지키는 습관, 그리고 돈이 새는 지점을 가장 현실적으로 보여주는 자리입니다.",
  },
  health: {
    role: "체력·스트레스·회복 루틴을 좌우하는 생활 축",
    personalityLens: ["체력 배분", "긴장도", "수면 습관", "회복 속도", "통증 민감도", "식사 리듬", "운동 지속력", "휴식 죄책감"],
    relationshipLens: ["같이 사는 사람", "직장 동료", "돌봐야 할 가족", "운동 파트너", "의료진", "생활 리듬을 나누는 사람", "감정 소모 상대", "함께 쉬는 사람"],
    lifeAdviceLens: ["수면 시각 고정", "식사 시간 고정", "주 3회 가벼운 운동", "일정 사이 여백", "통증 기록", "카페인 상한", "정기 검진 예약", "회복일 미리 확보"],
    cautionLens: ["번아웃", "수면 부족", "통증 무시", "폭식과 결식", "무리한 일정", "약 의존", "감정 억누르기", "회복 미루기"],
    opening: "질액궁은 몸과 마음이 연결되는 방식, 그리고 무리했을 때 가장 먼저 흔들리는 축을 보여줍니다.",
  },
  travel: {
    role: "외부 활동·이동·사회 확장의 성장 축",
    personalityLens: ["적응력", "이동 욕구", "낯선 환경 반응", "확장 속도", "첫인상 관리", "위험 감각", "호기심", "정착 욕구"],
    relationshipLens: ["타지에서 만난 인연", "외부 협력자", "여행 동행", "새 이웃", "먼 곳의 파트너", "온라인 인연", "이동 중 만나는 사람", "현지 조력자"],
    lifeAdviceLens: ["이동 전 점검표", "일정 사이 여백", "현지 규칙 확인", "짐 최소화", "복귀 후 회복일", "낯선 제안 24시간 유예", "연락망 이중화", "확장 상한 설정"],
    cautionLens: ["과속 확장", "일정 과밀", "낯선 제안 과신", "이동 피로", "안전 방심", "돌아온 뒤의 공백", "잦은 변경", "현지 갈등"],
    opening: "천이궁은 밖으로 나갔을 때 더 잘 열리는 기회와, 외부 환경에서 보이는 당신의 얼굴을 설명하는 자리입니다.",
  },
  friends: {
    role: "친구·팀원·고객·팔로워 네트워크 운영 축",
    personalityLens: ["사교 태도", "무리 안 역할", "신뢰 기준", "거리 조절", "리더십 성향", "부탁하는 방식", "베푸는 방식", "손절 감각"],
    relationshipLens: ["팀원", "후배", "고객", "오랜 친구", "느슨한 지인", "협력사", "커뮤니티", "내가 이끄는 사람"],
    lifeAdviceLens: ["기여와 보상 명시", "연락 주기 정리", "부탁 총량 관리", "손절 기준 문장화", "감사 표현 즉시", "역할 공개", "모임 수 상한", "정기 점검"],
    cautionLens: ["관계 소모", "일방적 베풂", "묻어가는 사람 방치", "평판 의존", "사람 수 집착", "뒷말", "역할 과잉", "거절 못 함"],
    opening: "노복궁은 주변 사람들과의 연결이 어떻게 자원으로 바뀌거나 소모로 바뀌는지를 보여주는 자리입니다.",
  },
  career: {
    role: "직업 성향·조직 적응·평판·독립 가능성의 커리어 축",
    personalityLens: ["일하는 결", "책임 감각", "속도", "완성 기준", "협업 태도", "야망 크기", "인정 욕구", "위임 능력"],
    relationshipLens: ["상사", "동료", "후배", "거래처", "면접관", "같은 업계 사람", "멘토", "경쟁자"],
    lifeAdviceLens: ["역할 정의 문서화", "성과 기록 주간화", "결정권 범위 확인", "이직 조건 세 개 고정", "피드백 정기 요청", "업무 상한 설정", "포트폴리오 갱신", "인수인계 준비"],
    cautionLens: ["과로", "역할 충돌", "인정 갈망", "성급한 이직", "위임 실패", "평판 손상", "번아웃 뒤 이탈", "완벽주의 지연"],
    opening: "관록궁은 어떤 직무에서 인정받고, 어떤 방식으로 커리어를 키워야 오래 가는지를 보여주는 자리입니다.",
  },
  property: {
    role: "주거·가족 기반·자산 바탕을 다루는 생활 토대 축",
    personalityLens: ["정착 욕구", "공간 취향", "정리 습관", "생활 리듬", "안정 기준", "소유 감각", "가족과의 거리", "회복 방식"],
    relationshipLens: ["가족", "함께 사는 사람", "이웃", "집주인과 중개인", "친척", "생활 리듬을 나누는 사람", "찾아오는 손님", "관리 담당자"],
    lifeAdviceLens: ["고정비 점검", "계약 조건 확인", "정리 주기 고정", "휴식 공간 분리", "이사 조건 세 개 고정", "가족 규칙 합의", "수리 이력 기록", "비상 예산 확보"],
    cautionLens: ["무리한 대출", "잦은 이사", "공간 방치", "가족 갈등 누적", "정리 미루기", "충동 계약", "생활 리듬 붕괴", "혼자 감당"],
    opening: "전택궁은 집과 생활 기반이 당신의 컨디션·안정감·장기 자산에 어떤 영향을 주는지를 말해주는 자리입니다.",
  },
  fortune: {
    role: "내면 행복감·불안·회복력을 다루는 정서 축",
    personalityLens: ["감정 기복", "몰입 성향", "만족 기준", "불안 민감도", "취향의 깊이", "혼자 있는 힘", "낙관 정도", "의미 추구"],
    relationshipLens: ["속을 아는 사람", "취미 동료", "상담자", "가족", "느슨한 친구", "온라인 모임", "멘토", "혼자만의 시간"],
    lifeAdviceLens: ["감정 기록 10분", "취미 시간 고정", "비교 차단", "수면 시각 고정", "산책 루틴", "생각 멈추는 신호 정하기", "감사 세 줄", "상담 예약"],
    cautionLens: ["생각 과열", "비교", "공허감 누적", "감정 억압", "과몰입 뒤 소진", "수면 붕괴", "완벽주의", "고립"],
    opening: "복덕궁은 혼자 있을 때의 마음 결, 행복을 느끼는 방식, 그리고 불안을 다루는 내면 습관을 보여주는 자리입니다.",
  },
  parents: {
    role: "부모·보호자·권위자·제도권과의 관계 축",
    personalityLens: ["권위 반응", "기대 수용", "독립 욕구", "죄책감 민감도", "규칙 감각", "도움 요청 태도", "설명 습관", "경계 설정"],
    relationshipLens: ["부모", "보호자", "상사", "멘토", "기관 담당자", "친척 어른", "선생", "후원자"],
    lifeAdviceLens: ["기록 중심 소통", "지원 범위 합의", "연락 주기 고정", "문서 이중 확인", "감정과 사안 분리", "도움 요청 문장화", "경계 선언", "정기 안부"],
    cautionLens: ["기대 압박", "죄책감 반응", "과잉 순응", "문서 실수", "가족 패턴 반복", "일방적 희생", "설명 과잉", "단절 충동"],
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
    .split(/(?<=[.!?])\s+|\n+/)
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
        ? `${type} ${withJosa(starName, "이")} ${palace.name}에 직접 걸려 사건의 핵심 축을 만듭니다.`
        : `${type} ${withJosa(starName, "이")} 연결궁에서 유입되어 간접 압력을 만듭니다.`,
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

/**
 * 🔴 해석 방법론 문구 금지 목록 — 화면에 나가면 "교재"가 된다.
 * validateZiweiDeepReading 과 scripts/verify-ziwei-deep-counseling-quality.cjs 가 이 배열 하나를 함께 쓴다.
 * 손으로 관리하는 대상 목록이 아니라 "생성 결과 전체를 훑는" 규칙이므로 비우면 가드가 통째로 무력해진다.
 */
export const BANNED_ZIWEI_TONE_PHRASES = [
  "문맥에서",
  "드러납니다",
  "핵심 변수",
  " 기준)",
  "해석할 수 있습니다",
  "라고 봅니다",
  "를 의미합니다",
  "자미두수에서는",
  "자미두수식으로",
  "읽어보세요",
  "살펴보세요",
  "확인해보세요",
  "종합하면",
  "이러한 흐름",
  "이러한 특성",
  "이런 점에서",
  "차 관점)",
] as const;

export function countBannedZiweiTonePhrases(text: string): number {
  const value = String(text || "");
  return BANNED_ZIWEI_TONE_PHRASES.filter((phrase) => value.includes(phrase)).length;
}

/**
 * 궁 × 절(8) 장면 도입부. "언제 그런가"를 먼저 세워 결과 문장이 사용자 장면으로 시작하게 한다.
 * 🔴 명반 계산과 무관하다 — 이미 배치가 끝난 별에 붙는 서술일 뿐이다.
 */
const PALACE_SCENE_OPENERS: Record<ZiweiPalaceId, string[]> = {
  ming: [
    "처음 보는 자리에 들어설 때,",
    "누가 내 판단을 흔들 때,",
    "결정을 앞두고 마음이 급해질 때,",
    "상대가 나를 처음 겪는 자리에서,",
    "예상 못 한 압박이 들어올 때,",
    "전에도 겪어 본 상황이 다시 올 때,",
    "잘하는 일을 맡게 됐을 때,",
    "혼자 하루를 정리하는 시간에,",
  ],
  siblings: [
    "오래 본 사이에서 마음이 어긋날 때,",
    "친구와 동료 사이의 거리를 정할 때,",
    "같은 자리를 두고 누군가와 겹칠 때,",
    "여럿이 한 목표를 나눠 맡을 때,",
    "주변이 도와줄지 말지 갈리는 순간,",
    "같이 벌인 일이 고비에 걸릴 때,",
    "이 사람을 믿어도 되나 싶을 때,",
    "인맥을 정리해야 하는 시점에,",
  ],
  spouse: [
    "마음이 가는 사람이 생겼을 때,",
    "여러 사람 중 한 명에게 눈이 갈 때,",
    "관계가 익숙해지기 시작할 때,",
    "상대가 내 생활에 들어오기 시작할 때,",
    "같은 문제로 또 부딪힐 때,",
    "사랑받는다고 느끼고 싶을 때,",
    "말수가 줄고 거리가 생길 때,",
    "관계의 다음 단계를 정해야 할 때,",
  ],
  children: [
    "누군가를 돌봐야 하는 자리에 설 때,",
    "아끼는 사람이 내 뜻과 다르게 갈 때,",
    "아랫사람을 가르치게 됐을 때,",
    "내가 만든 것을 내놓아야 할 때,",
    "결과를 오래 남겨야 하는 일에서,",
    "책임이 한꺼번에 몰릴 때,",
    "애정과 성과가 한 사람에게 걸릴 때,",
    "다음에 무엇을 만들지 고를 때,",
  ],
  wealth: [
    "돈을 벌 방법을 고를 때,",
    "수입이 들쭉날쭉해질 때,",
    "사고 싶은 것이 생겼을 때,",
    "모을지 굴릴지 정해야 할 때,",
    "거래 조건을 놓고 마주 앉을 때,",
    "새로운 수입 통로가 보일 때,",
    "돈이 어디로 샜는지 따져 볼 때,",
    "지출을 줄여야 하는 시기에,",
  ],
  health: [
    "하루 체력을 배분해야 할 때,",
    "스트레스가 쌓이기 시작할 때,",
    "일정이 빡빡해질 때,",
    "지친 몸을 되돌려야 할 때,",
    "무리인 줄 알면서 밀어붙일 때,",
    "기분이 가라앉는 날,",
    "생활 리듬이 흐트러질 때,",
    "몸이 먼저 신호를 보낼 때,",
  ],
  travel: [
    "익숙한 자리를 벗어날 때,",
    "거처나 환경을 바꿀 때,",
    "낯선 사람들 사이에 놓일 때,",
    "활동 범위를 넓힐 기회가 올 때,",
    "밖에서 나를 소개해야 할 때,",
    "예상 못 한 제안이 들어올 때,",
    "일을 벌인 뒤 뒷감당이 밀릴 때,",
    "다음 확장 속도를 정할 때,",
  ],
  friends: [
    "새로운 무리에 섞일 때,",
    "일을 나눠 맡아야 할 때,",
    "나를 지켜보는 사람이 늘어날 때,",
    "누구에게 부탁할지 고를 때,",
    "만나고 나면 유독 지치는 상대가 있을 때,",
    "모임에서 자리가 정해질 때,",
    "끌고 갈지 따라갈지 갈리는 순간,",
    "관계를 정리해야 하는 시점에,",
  ],
  career: [
    "일의 방향을 고를 때,",
    "능력을 증명해야 하는 자리에서,",
    "조직의 규칙과 내 방식이 부딪힐 때,",
    "책임자로 이름이 올라갈 때,",
    "평가가 오가는 자리에서,",
    "성과를 쌓아 올려야 하는 구간에,",
    "옮길지 남을지 고민이 될 때,",
    "다음 단계를 준비할 때,",
  ],
  property: [
    "생활이 흔들리기 시작할 때,",
    "머물 곳을 정해야 할 때,",
    "가족과 생활 리듬이 부딪힐 때,",
    "하루를 끝내고 집에 들어설 때,",
    "내 공간을 꾸리게 됐을 때,",
    "오래 갈 자산을 고를 때,",
    "옮길지 머물지 갈리는 순간,",
    "생활 기반을 다시 짜야 할 때,",
  ],
  fortune: [
    "아무 일 없는 평범한 날,",
    "오랜만에 마음이 놓일 때,",
    "혼자 있는 시간이 길어질 때,",
    "마음이 답답해서 풀고 싶을 때,",
    "이유 없이 불안이 올라올 때,",
    "좋아하는 것에 마음을 둘 때,",
    "다 이뤘는데 허전해질 때,",
    "마음을 다시 세워야 할 때,",
  ],
  parents: [
    "부모의 기대가 느껴질 때,",
    "보호자와 의견이 갈릴 때,",
    "윗사람이 나를 챙기려 할 때,",
    "서류와 절차를 마주할 때,",
    "도움을 받아야 하는 상황에서,",
    "권위 앞에 서야 할 때,",
    "가족 안에서 같은 갈등이 되풀이될 때,",
    "기대와 독립 사이를 정해야 할 때,",
  ],
};

/** 별 하나가 실제 행동으로 나타나는 모습. 사전 정의(starBaseMeaning)는 근거 노트로만 쓴다. */
type ZiweiStarVoice = { behavior: string; driver: string; gift: string; trap: string };

const STAR_VOICES: Record<string, ZiweiStarVoice> = {
  자미: { behavior: "판을 먼저 넓게 보고 방향부터 정합니다", driver: "방향이 정해지지 않은 채로 움직이는 것을 견디기 어렵기 때문입니다", gift: "방향이 흐릿한 자리에서 사람들이 당신 말을 기준으로 삼습니다", trap: "혼자 다 짊어지고 조언을 늦게 구합니다" },
  천기: { behavior: "머릿속으로 경우의 수를 몇 개 돌려 본 뒤 움직입니다", driver: "예상하지 못한 변수에 부딪히는 것이 가장 불편하기 때문입니다", gift: "복잡한 상황을 몇 수 앞까지 정리해 냅니다", trap: "생각이 길어져 실행이 늦어집니다" },
  태양: { behavior: "먼저 나서서 상황을 밝히고 사람들을 끌고 갑니다", driver: "누군가 곤란해지는 것을 두고 보지 못하기 때문입니다", gift: "당신이 있으면 자리의 공기가 밝아지고 일이 굴러갑니다", trap: "남을 챙기다 정작 자기 몫을 놓칩니다" },
  무곡: { behavior: "감정보다 숫자와 조건을 먼저 확인합니다", driver: "말보다 실제로 남는 것이 더 믿을 만하다고 느끼기 때문입니다", gift: "손익을 정확히 갈라 손해 볼 일을 미리 막습니다", trap: "말이 딱딱해져 상대가 벽을 느낍니다" },
  천동: { behavior: "이기려 들기보다 분위기를 부드럽게 만드는 쪽을 택합니다", driver: "상대를 이기는 것보다 관계가 깨지지 않는 쪽이 더 중요하기 때문입니다", gift: "곁에 있는 사람이 마음을 놓게 만듭니다", trap: "싫은 것도 괜찮다고 넘기다 한꺼번에 지칩니다" },
  염정: { behavior: "겉은 담담해 보여도 속으로는 이미 판단을 굳혀 둡니다", driver: "속을 다 보이면 휘둘린다고 느끼기 때문입니다", gift: "원칙을 세우면 끝까지 밀고 나갑니다", trap: "속을 감추다 오해를 키웁니다" },
  천부: { behavior: "무리하지 않고 지킬 수 있는 선부터 그어 둡니다", driver: "잃는 것이 얻는 것보다 훨씬 아프게 느껴지기 때문입니다", gift: "위기에도 기본을 지켜 흔들림이 적습니다", trap: "안전한 선택만 반복해 기회를 흘려보냅니다" },
  태음: { behavior: "겉으로 내색하지 않고 속으로 오래 정리합니다", driver: "정리되지 않은 마음을 남에게 보이는 것이 부담스럽기 때문입니다", gift: "상대가 말하지 않은 감정까지 읽어 냅니다", trap: "혼자 삭이다 관계가 조용히 멀어집니다" },
  탐랑: { behavior: "일단 사람과 상황 속으로 들어가 감각으로 읽습니다", driver: "머리로 재는 것보다 직접 부딪혀 봐야 감이 오기 때문입니다", gift: "낯선 자리에서도 금세 사람을 얻습니다", trap: "재미가 떨어지면 마무리를 미룹니다" },
  거문: { behavior: "납득이 될 때까지 말로 확인하고 파고듭니다", driver: "찜찜한 채로 넘어가면 나중에 더 크게 걸린다는 것을 알기 때문입니다", gift: "남들이 못 보고 지나친 허점을 짚어 냅니다", trap: "확인이 길어져 상대가 추궁으로 받아들입니다" },
  천상: { behavior: "중간에서 조율하며 모두가 납득할 선을 찾습니다", driver: "누구 한쪽이 크게 상하는 결말을 못 견디기 때문입니다", gift: "갈라진 사이를 조용히 붙여 놓습니다", trap: "양쪽을 맞추다 자기 입장이 사라집니다" },
  천량: { behavior: "한발 물러서서 전체를 보고 원칙대로 정리합니다", driver: "그때그때 기분으로 정하면 결국 뒷감당이 온다고 보기 때문입니다", gift: "급한 상황에서도 원칙을 놓지 않습니다", trap: "훈수처럼 들려 거리감을 만듭니다" },
  칠살: { behavior: "망설이지 않고 끊어 낸 뒤 다음으로 넘어갑니다", driver: "애매하게 끌고 가는 상태가 가장 소모적이라고 느끼기 때문입니다", gift: "아무도 못 끊는 결정을 대신 끊어 냅니다", trap: "끊고 나서 남은 관계를 수습하지 않습니다" },
  파군: { behavior: "익숙한 틀을 깨고 새로 시작하는 쪽을 고릅니다", driver: "고쳐 쓰는 것보다 다시 짜는 편이 빠르다고 느끼기 때문입니다", gift: "판을 새로 짜서 막힌 흐름을 뚫습니다", trap: "잘 돌아가던 것까지 갈아엎습니다" },
  문창: { behavior: "근거와 자료를 만들어 두고 움직입니다", driver: "말로만 오간 약속은 언젠가 어긋난다고 보기 때문입니다", gift: "기록과 근거가 남아 나중에 당신을 지켜 줍니다", trap: "형식을 갖추느라 타이밍을 놓칩니다" },
  문곡: { behavior: "표현과 말솜씨로 분위기를 먼저 열어 둡니다", driver: "마음이 열려야 일도 풀린다는 것을 경험으로 알기 때문입니다", gift: "말 한마디로 굳은 자리를 풀어 냅니다", trap: "표현이 앞서 실속이 뒤따르지 못합니다" },
  좌보: { behavior: "누군가를 돕는 자리에서 자기 몫을 만들어 갑니다", driver: "혼자 앞서는 것보다 함께 가는 쪽이 편하기 때문입니다", gift: "옆에 있는 것만으로 일이 굴러가게 만듭니다", trap: "돕다가 자기 일정을 뒤로 밀어냅니다" },
  우필: { behavior: "옆에서 챙기며 끊어진 사이를 다시 이어 붙입니다", driver: "관계가 어긋난 채로 남는 것을 두고 보지 못하기 때문입니다", gift: "끊어질 뻔한 인연을 다시 이어 놓습니다", trap: "중재하다 양쪽 감정을 다 받아 냅니다" },
  녹존: { behavior: "안전하게 쌓아 두는 쪽을 먼저 챙깁니다", driver: "손에 쥔 것이 있어야 마음이 놓이기 때문입니다", gift: "위기에도 마지막 여유분을 남겨 둡니다", trap: "지키느라 넓힐 시기를 놓칩니다" },
  천괴: { behavior: "결정적인 순간에 도와줄 사람을 자연스럽게 만납니다", driver: "평소에 사람을 함부로 대하지 않아 온 덕입니다", gift: "필요한 순간에 도와줄 사람이 나타납니다", trap: "도움을 기다리다 스스로 움직일 시기를 늦춥니다" },
  천월: { behavior: "드러나지 않는 도움을 받으며 조용히 길을 넓힙니다", driver: "요란하게 내세우는 방식이 체질에 맞지 않기 때문입니다", gift: "티 나지 않는 지원이 꾸준히 들어옵니다", trap: "도움을 받고도 말하지 않아 관계가 얕아집니다" },
  천마: { behavior: "가만히 있지 못하고 움직여서 답을 찾습니다", driver: "멈춰 있으면 오히려 불안해지기 때문입니다", gift: "움직인 만큼 기회가 빨리 들어옵니다", trap: "벌여 놓은 일이 많아 뒷정리가 밀립니다" },
  경양: { behavior: "날을 세워 밀어붙이다 가까운 사람을 긁습니다", driver: "속도가 늦어지는 것을 참기 어렵기 때문입니다", gift: "미룰 수 없는 일을 단번에 끝냅니다", trap: "말이 날카로워져 가까운 사람이 먼저 다칩니다" },
  타라: { behavior: "결정을 미루다 시기를 놓치기 쉽습니다", driver: "잘못 고를까 봐 마지막까지 저울질하기 때문입니다", gift: "성급한 결정을 한 번 걸러 냅니다", trap: "재다가 기회가 지나갑니다" },
  화성: { behavior: "순간적으로 확 타올랐다가 금세 식습니다", driver: "감정이 올라오는 속도가 판단보다 빠르기 때문입니다", gift: "필요할 때 폭발적으로 속도를 냅니다", trap: "충동적으로 질러 놓고 수습에 시달립니다" },
  영성: { behavior: "속으로 오래 끓이다 한 번에 터뜨립니다", driver: "그때그때 말하지 못하고 쌓아 두기 때문입니다", gift: "오래 버티며 끝을 봅니다", trap: "참다가 한 번에 터져 관계를 상하게 합니다" },
  지공: { behavior: "생각이 붕 떠서 현실 감각이 흐려집니다", driver: "눈앞의 조건보다 머릿속 그림이 더 선명해지기 때문입니다", gift: "남들이 못 보는 그림을 먼저 그립니다", trap: "현실 조건을 빼놓고 계획을 세웁니다" },
  지겁: { behavior: "쌓아 둔 것을 한 번에 놓아 버리기 쉽습니다", driver: "지키는 일에 금방 지치기 때문입니다", gift: "미련 없이 놓아 새 판을 만듭니다", trap: "쌓아 둔 것을 한순간에 흘려보냅니다" },
};

const FALLBACK_STAR_VOICE: ZiweiStarVoice = {
  behavior: "평소의 결대로 반응하며 그 자리의 온도를 정합니다",
  driver: "오래 익은 습관이 먼저 움직이기 때문입니다",
  gift: "이 결이 살아 있을 때는 판단이 크게 흔들리지 않습니다",
  trap: "같은 방식만 반복하면 감각이 무뎌집니다",
};

function starVoice(star?: ZiweiStarMeta): ZiweiStarVoice {
  if (!star) return FALLBACK_STAR_VOICE;
  return STAR_VOICES[star.name] || FALLBACK_STAR_VOICE;
}

type ZiweiJosaKind = "을" | "이" | "은" | "으로" | "과";

/** 마지막 한글 음절의 받침 코드(0=받침 없음). 한글로 끝나지 않으면 -1. */
function finalConsonantOf(word: string): number {
  const trimmed = String(word || "").trim().replace(/[^가-힣]+$/, "");
  if (!trimmed) return -1;
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return -1;
  return (code - 0xac00) % 28;
}

/**
 * 조사 자동 선택. 절마다 앞 단어가 바뀌므로 "속도을" 같은 비문을 코드 단계에서 막는다.
 * 🔴 명반 계산과 무관한 표기 보정이다.
 */
function withJosa(word: string, kind: ZiweiJosaKind): string {
  const jong = finalConsonantOf(word);
  const hasFinal = jong > 0;
  if (kind === "으로") return `${word}${!hasFinal || jong === 8 ? "로" : "으로"}`;
  if (kind === "을") return `${word}${hasFinal ? "을" : "를"}`;
  if (kind === "이") return `${word}${hasFinal ? "이" : "가"}`;
  if (kind === "은") return `${word}${hasFinal ? "은" : "는"}`;
  return `${word}${hasFinal ? "과" : "와"}`;
}

/** 성향이 삶의 어느 표면에 얹히는지 — 궁마다 한 줄. {anchor} 자리에 절별 렌즈가 들어간다. */
const PALACE_IMPACT_LINES: Record<ZiweiPalaceId, string> = {
  ming: "이 결이 {anchor:으로} 굳어져 있어서, 급할수록 같은 방식으로 돌아옵니다.",
  siblings: "이 결이 {anchor}에 걸려 있어서, 가까운 사이일수록 더 선명해집니다.",
  spouse: "이 결이 {anchor}에 그대로 얹혀서, 상대가 바뀌어도 관계에서 같은 장면이 반복됩니다.",
  children: "이 결이 {anchor}에 얹혀서, 아끼는 마음이 클수록 부담도 같이 커집니다.",
  wealth: "이 결이 {anchor}에 붙어 있어서, 액수가 커질수록 차이가 눈에 띄게 벌어집니다.",
  health: "이 결이 {anchor}에 먼저 나타나서, 몸이 마음보다 빨리 신호를 보냅니다.",
  travel: "이 결이 {anchor:으로} 읽혀서, 밖에서 만나는 사람마다 비슷한 인상을 받습니다.",
  friends: "이 결이 {anchor:으로} 자리 잡아서, 무리가 바뀌어도 맡는 역할은 비슷해집니다.",
  career: "이 결이 {anchor:으로} 읽히기 때문에, 조직 안에서 역할이 커질수록 평판이 갈립니다.",
  property: "이 결이 {anchor}에 스며 있어서, 사는 공간이 바뀌어도 리듬은 비슷하게 돌아옵니다.",
  fortune: "이 결이 {anchor:과} 붙어 있어서, 겉이 멀쩡한 날에도 내면은 다르게 흐릅니다.",
  parents: "이 결이 {anchor}에 묶여 있어서, 나이를 먹어도 그 앞에서는 반응이 어려집니다.",
};

/** 궁별 두 번째 실행 문장. {anchor} 자리에 절별 실행 렌즈가 들어간다. */
const PALACE_ACTION_LINES: Record<ZiweiPalaceId, string> = {
  ming: "이번 주에 {anchor:을} 한 번만 점검해도 판단이 훨씬 덜 흔들립니다.",
  siblings: "{anchor}에 대해 한 사람에게만이라도 먼저 말해 두면 오해가 줄어듭니다.",
  spouse: "{anchor:을} 상대와 한 문장으로 맞춰 두면 같은 다툼이 줄어듭니다.",
  children: "{anchor:을} 기대 대신 기준으로 바꿔 말해 보세요.",
  wealth: "{anchor:을} 숫자로 적어 두면 새는 곳이 바로 보입니다.",
  health: "{anchor:을} 일주일만 같은 시각으로 고정해 보세요.",
  travel: "{anchor:을} 미리 정해 두면 밖에서 흔들릴 일이 줄어듭니다.",
  friends: "{anchor:을} 정해 두면 사람 때문에 지치는 일이 줄어듭니다.",
  career: "{anchor:을} 문서로 남겨 두면 평가 자리에서 유리해집니다.",
  property: "{anchor:을} 이번 달 안에 한 번 정리해 두세요.",
  fortune: "{anchor:을} 하루 10분만 지켜도 마음의 바닥이 달라집니다.",
  parents: "{anchor:을} 감정 대신 기록으로 남겨 두세요.",
};

function fillAnchor(template: string, anchor: string): string {
  return template.replace(
    /\{anchor(?::(을|이|은|으로|과))?\}/g,
    (_match, kind) => (kind ? withJosa(anchor, kind as ZiweiJosaKind) : anchor),
  );
}

/**
 * 별 하나의 근거 노트 — 사전 정의·밝기·사화를 묶는다.
 * 🔴 카드 앞면이 아니라 "왜 이렇게 읽었나"(더 읽기) 영역에만 들어간다.
 */
export function describeStarInPalaceContext(
  star: ZiweiStarMeta,
  palace: ZiweiPalace,
  group: "main" | "assistant" | "malefic",
): string {
  const symbol = normalizeSymbol(star);
  const base = starBaseMeaning(star, group).replace(/[.\s]+$/, "");
  const hint = symbol ? STRENGTH_SPECIFIC_STAR_HINTS[star.name]?.[symbol as "◎" | "O" | "▲" | "△" | "X"] : "";
  const transform = summarizeTransformation(star);
  const context = starNameContext(star, palace);
  const parts = [
    `${starBadge(star)} — ${base}.`,
    `${palace.name}에서는 ${withJosa(context, "으로")} 이어집니다.`,
    symbol ? `밝기 ${symbol}은 ${normalizeStrengthWord(symbol)}입니다.` : "",
    transform ? `여기에 ${withJosa(transform, "이")} 겹칩니다.` : "",
    hint ? String(hint) : "",
  ].filter(Boolean);
  return sanitizeZiweiDeepText(parts.join(" "));
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
    ? `${transform.type} ${withJosa(transform.starName, "이")} 함께 움직이면 이 성향은 단순한 기질을 넘어 사건을 선택하는 방식으로 강해집니다.`
    : "직접 사화가 약할수록 이 성향은 큰 사건보다 매일의 말투와 선택 습관에서 더 또렷하게 드러납니다.";

  if (category.title.includes("기질")) {
    return `명궁의 첫 결은 ${withJosa(mainName, "이")} 앞에서 문을 열고 ${withJosa(secondName, "이")} 뒤에서 색을 더하는 방식으로 읽습니다. 겉으로 보이는 태도 하나만으로 단정하기 어렵고, 마음이 편할 때와 압박을 받을 때의 얼굴이 서로 다르게 나타납니다. ${withJosa(support, "은")} 이 기질을 부드럽게 살려 주지만, ${withJosa(tension, "이")} 커지면 본래 장점이 예민함이나 방어적 말투로 바뀔 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("자기 인식") || category.title.includes("자존감")) {
    return `자존감은 칭찬을 많이 받는다고 바로 안정되는 구조가 아닙니다. ${withJosa(mainName, "은")} 스스로 납득한 기준이 있을 때 마음이 단단해지고, ${withJosa(tension, "이")} 건드려질 때는 작은 평가도 크게 받아들일 수 있습니다. 이 명궁은 남에게 어떻게 보이는가보다 내가 어떤 기준으로 움직였는가를 확인할 때 회복이 빠릅니다. ${transformLine}`;
  }
  if (category.title.includes("판단")) {
    return `판단 기준은 ${mainName}의 본성에 따라 먼저 움직입니다. 이 별이 부드러운 별이면 사람의 마음과 분위기를 읽고, 단단한 별이면 손익과 책임을 먼저 가늠하며, 말의 별이면 표현과 해석의 정확도를 우선합니다. ${withJosa(support, "이")} 붙으면 판단이 세련되어지지만 ${withJosa(tension, "이")} 강하면 생각이 많아져 결론이 늦어질 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("첫인상")) {
    return `첫인상은 명궁의 별빛이 얼굴과 말투로 새어 나오는 장면입니다. ${withJosa(mainName, "은")} 사람들에게 가장 먼저 보이는 분위기를 만들고, ${withJosa(secondName, "은")} 가까워진 뒤 드러나는 두 번째 결을 만듭니다. ${withJosa(support, "이")} 살아 있으면 신뢰가 빨리 열리고, ${withJosa(tension, "이")} 자극되면 방어적인 거리감이 먼저 느껴질 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("자기방어") || category.title.includes("위기")) {
    return `위기 앞에서 이 명궁은 본능적으로 자신을 지키는 방식을 꺼냅니다. ${withJosa(mainName, "은")} 어떤 말로 버티는지, 어떤 침묵으로 물러나는지, 또는 어떤 기준을 세워 상황을 통제하는지 보여줍니다. ${withJosa(tension, "은")} 방어가 지나쳐 관계의 벽이 되는 지점을 알려 주고, ${withJosa(support, "은")} 다시 대화의 문을 여는 회복 통로가 됩니다. ${transformLine}`;
  }
  if (category.title.includes("선택")) {
    return `반복되는 선택 습관은 운명의 방향을 조용히 바꿉니다. ${withJosa(mainName, "이")} 익숙한 길을 택하게 만들고, ${withJosa(secondName, "은")} 그 선택에 명분이나 감정을 덧입힙니다. 좋은 흐름에서는 빠른 판단과 자기 주도성이 되지만, ${withJosa(tension, "이")} 강한 시기에는 같은 문제를 다른 얼굴로 반복할 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("성과") || category.title.includes("강점")) {
    return `명궁의 강점은 혼자 품고 있을 때보다 역할을 맡았을 때 빛납니다. ${withJosa(mainName, "은")} 이 사람이 어떤 자리에서 자연스럽게 중심을 잡는지 말해 주고, ${withJosa(support, "은")} 주변 사람과 도구를 붙여 성과를 현실화합니다. 다만 ${withJosa(tension, "을")} 무시하면 장점이 과속이나 피로로 바뀌므로, 가장 잘하는 일을 가장 오래 할 수 있는 리듬이 필요합니다. ${transformLine}`;
  }
  if (category.title.includes("그림자") || category.title.includes("압박")) {
    return `명궁의 그림자는 나쁜 성격이 아니라 별빛이 눌렸을 때 나타나는 방어 반응입니다. ${withJosa(mainName, "이")} 힘을 잃으면 자신을 설명하려는 마음이 커지거나, 반대로 아무 말도 하지 않고 닫히는 식으로 나타날 수 있습니다. ${withJosa(tension, "은")} 이 압박이 어디에서 시작되는지 알려 주므로, 압박의 원인을 사람 탓으로만 돌리지 말고 말·일정·평가·관계 경계 중 어디가 무너졌는지 먼저 보아야 합니다. ${transformLine}`;
  }
  if (category.title.includes("신궁")) {
    return `명궁이 타고난 마음의 얼굴이라면 신궁은 시간이 지나며 몸에 밴 행동 습관입니다. ${mainName}의 성향이 실제 생활에서는 선택의 속도, 사람을 대하는 거리, 일을 처리하는 순서로 바뀝니다. 명궁과 신궁의 결이 맞으면 삶이 자연스럽게 풀리고, 어긋나면 마음은 원하는데 행동이 따라가지 않는 피로가 생깁니다. ${transformLine}`;
  }
  return `명궁 운용의 핵심은 ${mainName}의 좋은 빛을 매일의 기준으로 쓰는 것입니다. ${withJosa(support, "이")} 도와주는 영역은 적극적으로 열고, ${withJosa(tension, "이")} 건드리는 장면은 결정을 늦추며 몸과 마음의 속도를 맞춰야 합니다. 이 명궁은 스스로를 몰아붙일수록 흐려지고, 자신의 별빛이 가장 편안하게 드러나는 역할을 찾을수록 선명해집니다. ${transformLine}`;
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
    ? `${transform.type} ${withJosa(transform.starName, "이")} 겹치면 이 관계 흐름은 평소 호감보다 실제 사건, 공동 책임, 말의 무게로 더 강하게 드러납니다.`
    : "직접 사화가 약하면 큰 사건보다 평소 거리감, 약속 방식, 도움을 주고받는 태도에서 관계의 질이 갈립니다.";

  if (category.title.includes("형제") || category.title.includes("기본 인연")) {
    return `형제궁의 기본 인연은 혈연의 숫자보다 가까운 사람과 마음을 나누는 방식으로 읽습니다. ${withJosa(mainName, "은")} 수평 관계에서 먼저 드러나는 정서와 말투를 만들고, ${withJosa(secondName, "은")} 오래 지낼수록 보이는 숨은 기대치를 덧붙입니다. ${withJosa(support, "이")} 살아 있으면 가까운 사람에게 실제 도움을 받기 쉽지만, ${withJosa(tension, "이")} 커지면 사소한 비교와 서운함이 오래 남을 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("친구") || category.title.includes("동료")) {
    return `친구와 동료 관계에서는 편안함과 역할의 균형이 중요합니다. ${withJosa(mainName, "이")} 강하면 내가 어떤 사람과 빨리 친해지고 누구와 거리를 두는지 선명해지며, ${withJosa(support, "은")} 그 관계를 협업 자원으로 바꾸는 힘을 줍니다. 다만 ${withJosa(tension, "이")} 자극되면 가까운 관계일수록 기대치가 말없이 쌓여 피로가 생길 수 있습니다. ${transformLine}`;
  }
  if (category.title.includes("경쟁") || category.title.includes("라이벌")) {
    return `라이벌 구도는 적을 만드는 운이 아니라 나의 실력과 자존심이 시험대에 오르는 장면입니다. ${withJosa(mainName, "은")} 경쟁을 성장 자극으로 받아들이는지, 비교 피로로 받아들이는지 보여줍니다. ${withJosa(secondName, "이")} 함께 움직이면 겉으로는 담담해 보여도 속으로는 인정 욕구가 강해질 수 있고, ${withJosa(tension, "은")} 경쟁이 관계 손상으로 번지는 지점을 알려 줍니다. ${transformLine}`;
  }
  if (category.title.includes("협업")) {
    return `협업에서는 좋은 마음보다 역할 배분이 먼저입니다. ${withJosa(mainName, "은")} 내가 자연스럽게 맡는 포지션을 만들고, ${withJosa(support, "은")} 부족한 부분을 메워 주는 사람과 도구를 끌어옵니다. 그러나 ${withJosa(tension, "이")} 강하면 책임 소재가 흐려지거나 말의 온도 차이로 신뢰가 흔들릴 수 있어, 시작 전에 역할·기한·결정권을 문장으로 남기는 편이 좋습니다. ${transformLine}`;
  }
  if (category.title.includes("도움") || category.title.includes("방해")) {
    return `주변 도움과 방해는 사람의 선악보다 기운을 주고받는 방식에서 갈립니다. ${withJosa(mainName, "과")} 맞는 사람은 내 판단을 맑게 만들고 행동 속도를 올려 주지만, ${withJosa(tension, "을")} 건드리는 사람은 설명을 길게 만들고 마음을 지치게 할 수 있습니다. ${withJosa(support, "은")} 도움을 실제 결과로 연결하는 통로이므로, 도움을 받을 때도 감정적 의리보다 역할과 범위를 분명히 해야 합니다. ${transformLine}`;
  }
  if (category.title.includes("공동 프로젝트")) {
    return `공동 프로젝트는 형제궁이 가장 현실적으로 드러나는 자리입니다. ${withJosa(mainName, "은")} 프로젝트 안에서 내가 중심을 잡는 방식, ${withJosa(secondName, "은")} 함께 움직이는 사람들의 속도 차이를 보여줍니다. ${withJosa(support, "이")} 살아 있으면 협력의 손발이 맞고, ${withJosa(tension, "이")} 커지면 중간 조율 비용이 늘어나므로 처음부터 기록, 분담, 검수 기준을 고정해야 합니다. ${transformLine}`;
  }
  if (category.title.includes("신뢰")) {
    return `신뢰할 사람은 듣기 좋은 말을 많이 하는 사람이 아니라, ${mainName}의 결을 흐리지 않고 약속을 지키는 사람입니다. ${withJosa(support, "과")} 맞는 인연은 나를 과하게 흔들지 않으면서 필요한 순간에 실제 도움을 줍니다. 반대로 ${withJosa(tension, "이")} 반복해서 건드려지는 관계는 정이 있어도 오래 두면 판단력을 흐리게 하므로, 거리와 역할을 다시 정해야 합니다. ${transformLine}`;
  }
  return `형제궁의 인맥 전략은 사람을 많이 모으는 것이 아니라 나의 리듬을 맑게 하는 관계를 남기는 일입니다. ${withJosa(mainName, "은")} 어떤 네트워크에서 힘이 나는지 알려 주고, ${withJosa(support, "은")} 그 인맥을 결과로 바꾸는 통로가 됩니다. ${withJosa(tension, "이")} 강한 시기에는 새 인연 확장보다 기존 관계의 역할, 약속, 보상 구조를 먼저 정리하는 것이 운을 안정시킵니다. ${transformLine}`;
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
    ? `${transform.type} ${withJosa(transform.starName, "이")} 겹치면 이 주제는 마음속 성향을 넘어 실제 사건, 결정권, 책임의 무게로 선명해집니다.`
    : "직접 사화가 약한 구간에서는 큰 사건보다 평소 습관, 말투, 기준표, 선택 순서가 결과를 가릅니다.";

  if (palace.id === "spouse") {
    if (category.title.includes("연애") || category.title.includes("끌리는")) {
      return `부부궁의 연애 흐름은 설렘의 크기보다 내가 어떤 사람에게 마음을 열고 어떤 순간에 닫히는지를 보여줍니다. ${withJosa(mainName, "은")} 끌림의 첫 결을 만들고, ${withJosa(secondName, "은")} 관계가 깊어진 뒤 드러나는 기대와 불안을 더합니다. ${withJosa(support, "이")} 살아 있으면 신뢰 회복이 빠르지만, ${withJosa(tension, "이")} 강하면 말의 온도와 확인 욕구가 갈등의 시작점이 될 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("갈등") || category.title.includes("거리감") || category.title.includes("신뢰")) {
      return `관계의 갈등은 사랑이 부족해서만 생기지 않습니다. ${withJosa(mainName, "은")} 갈등 앞에서 다가가는지, 설명하는지, 침묵하는지, 선을 긋는지 보여줍니다. ${withJosa(tension, "은")} 반복되는 오해의 발화점을 알려 주므로, 감정이 올라온 순간 바로 결론을 내리기보다 대화 순서와 확인 문장을 먼저 정해야 합니다. ${transformLine}`;
    }
    return `장기 관계에서 이 궁은 상대의 성격보다 둘 사이의 운영 방식을 더 중요하게 봅니다. ${withJosa(mainName, "은")} 함께 살 때 반복되는 리듬을 만들고, ${withJosa(support, "은")} 관계를 회복시키는 통로가 됩니다. 좋은 인연이라도 역할, 돈, 가족, 시간의 합의가 없으면 ${withJosa(tension, "이")} 쌓여 사랑을 피로로 바꿀 수 있습니다. ${transformLine}`;
  }

  if (palace.id === "children") {
    if (category.title.includes("자녀") || category.title.includes("돌봄")) {
      return `자녀궁은 실제 자녀뿐 아니라 후배, 제자, 돌봄을 맡은 사람과의 인연을 함께 봅니다. ${withJosa(mainName, "은")} 돌보는 방식과 기대의 온도를 만들고, ${withJosa(secondName, "은")} 애정과 책임의 균형을 흔들거나 단단하게 합니다. ${withJosa(support, "이")} 좋으면 키우고 기다리는 힘이 살아나지만, ${withJosa(tension, "이")} 강하면 사랑이 간섭이나 과부하로 바뀔 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("창작") || category.title.includes("생산") || category.title.includes("성과")) {
      return `이 궁은 내가 세상에 내보내는 결과물의 운도 말합니다. ${withJosa(mainName, "은")} 아이디어가 작품, 프로젝트, 서비스로 자라는 방식을 만들고, ${withJosa(support, "은")} 완성도와 지속성을 올려 줍니다. ${withJosa(tension, "이")} 강할 때는 시작보다 마무리, 기대보다 검수, 애정보다 일정표가 중요합니다. ${transformLine}`;
    }
    return `자녀궁의 대한 전략은 키우는 대상과 나의 기운을 분리하는 데서 시작됩니다. ${withJosa(mainName, "은")} 책임감을 만들지만, ${withJosa(tension, "이")} 누적되면 내가 감당할 몫과 상대가 배워야 할 몫을 혼동하기 쉽습니다. 이 궁은 애정을 오래 쓰려면 기대치와 지원 범위를 먼저 정해야 한다고 말합니다. ${transformLine}`;
  }

  if (palace.id === "wealth") {
    if (category.title.includes("버는") || category.title.includes("수입") || category.title.includes("경로")) {
      return `재백궁은 돈의 양보다 돈이 들어오는 문을 먼저 봅니다. ${withJosa(mainName, "은")} 수입을 만드는 방식, ${withJosa(secondName, "은")} 그 수입이 반복 가능한지 일시적인지의 결을 더합니다. ${withJosa(support, "이")} 살아 있으면 회수력과 거래 운이 좋아지지만, ${withJosa(tension, "이")} 강하면 벌어도 남지 않는 구조가 생길 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("소비") || category.title.includes("새는") || category.title.includes("거래")) {
      return `돈이 새는 지점은 단순한 낭비보다 감정, 체면, 정보 부족, 계약 조건에서 시작됩니다. ${withJosa(mainName, "은")} 내가 돈 앞에서 무엇을 우선하는지 보여주고, ${withJosa(tension, "은")} 충동 구매나 과속 거래가 커지는 장면을 알려 줍니다. 이 궁은 수입 확장보다 먼저 가격표, 정산 기준, 손실 상한선을 세우라고 말합니다. ${transformLine}`;
    }
    return `자산 형성은 큰 운 한 번보다 반복되는 현금 흐름에서 만들어집니다. ${withJosa(mainName, "은")} 돈을 붙잡는 손의 모양을 만들고, ${withJosa(support, "은")} 저축, 투자, 사업, 계약의 안정성을 받쳐 줍니다. ${withJosa(tension, "이")} 강한 시기에는 확장보다 누수 차단이 먼저입니다. ${transformLine}`;
  }

  if (palace.id === "health") {
    if (category.title.includes("체력") || category.title.includes("스트레스") || category.title.includes("신체")) {
      return `질액궁은 병을 단정하는 자리가 아니라 몸과 마음이 어디서 먼저 피로를 드러내는지 읽는 자리입니다. ${withJosa(mainName, "은")} 체력 사용 방식과 긴장 반응을 만들고, ${withJosa(secondName, "은")} 회복 속도와 생활 리듬을 더합니다. ${withJosa(support, "이")} 좋으면 회복 습관이 빨리 자리 잡지만, ${withJosa(tension, "이")} 강하면 작은 피로가 감정과 일정 전체로 번질 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("회복") || category.title.includes("과로") || category.title.includes("생활")) {
      return `회복은 쉬는 시간이 아니라 다시 균형을 되찾는 기술입니다. ${withJosa(mainName, "은")} 어떤 방식으로 기운이 새는지 알려 주고, ${withJosa(support, "은")} 수면, 식사, 운동, 정리 루틴을 붙잡게 합니다. ${withJosa(tension, "이")} 커질수록 의지보다 환경 설계가 중요하므로 최소 루틴을 작고 단단하게 고정해야 합니다. ${transformLine}`;
    }
    return `질액궁의 대한 전략은 몸을 몰아붙여 성과를 내는 방식에서 벗어나는 것입니다. ${withJosa(mainName, "은")} 강하게 쓰면 성취가 빠르지만, ${withJosa(tension, "이")} 누적되면 번아웃 신호가 먼저 옵니다. 이 궁은 건강을 예언이 아니라 생활 운영표로 다루라고 말합니다. ${transformLine}`;
  }

  if (palace.id === "travel") {
    if (category.title.includes("외부") || category.title.includes("이동") || category.title.includes("타지")) {
      return `천이궁은 밖으로 나갔을 때 열리는 얼굴을 보여줍니다. ${withJosa(mainName, "은")} 외부 환경에서 내가 어떤 방식으로 기회를 잡는지 만들고, ${withJosa(secondName, "은")} 이동, 이사, 여행, 대외 활동의 결을 더합니다. ${withJosa(support, "이")} 좋으면 낯선 장소와 사람이 문을 열어 주지만, ${withJosa(tension, "이")} 강하면 과속 확장과 이동 피로가 먼저 쌓일 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("이미지") || category.title.includes("기회") || category.title.includes("확장")) {
      return `바깥에서 보이는 이미지는 실제 실력만큼 중요합니다. ${withJosa(mainName, "은")} 사회가 나를 어떤 역할로 읽는지 알려 주고, ${withJosa(support, "은")} 외부 평판과 소개 흐름을 도와줍니다. ${withJosa(tension, "이")} 건드려지면 노출은 커지는데 체력과 일정이 따라가지 못할 수 있어 확장 속도를 조절해야 합니다. ${transformLine}`;
    }
    return `천이궁의 전략은 움직임을 무작정 늘리는 것이 아니라 맞는 무대를 고르는 것입니다. ${withJosa(mainName, "은")} 어디에서 힘이 나는지 말하고, ${withJosa(support, "은")} 그 무대에서 사람과 기회를 연결합니다. ${withJosa(tension, "이")} 강할 때는 이동보다 목적, 목적보다 회복 동선을 먼저 정해야 합니다. ${transformLine}`;
  }

  if (palace.id === "friends") {
    if (category.title.includes("친구") || category.title.includes("팀원") || category.title.includes("도움")) {
      return `노복궁은 나를 둘러싼 사람들의 질과 쓰임을 봅니다. ${withJosa(mainName, "은")} 어떤 팀원, 친구, 고객, 팔로워를 끌어들이는지 보여주고, ${withJosa(support, "은")} 그 연결을 실제 도움으로 바꿉니다. ${withJosa(tension, "이")} 강하면 사람은 많은데 기운이 새거나 역할 불균형이 생길 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("소모") || category.title.includes("집단") || category.title.includes("리더십")) {
      return `집단 안에서 이 궁은 내가 이끄는 사람인지, 돕는 사람인지, 조율하는 사람인지 보여줍니다. ${withJosa(mainName, "은")} 집단 속 역할을 만들고, ${withJosa(tension, "은")} 관계 소모와 기대 과잉의 지점을 알려 줍니다. 오래 가는 네트워크를 만들려면 친분보다 역할, 기여, 보상 구조가 먼저 정리되어야 합니다. ${transformLine}`;
    }
    return `노복궁의 네트워크 전략은 사람을 많이 아는 것이 아니라 나의 운을 흐리지 않는 사람을 곁에 두는 것입니다. ${withJosa(mainName, "은")} 맞는 집단의 성격을 알려 주고, ${withJosa(support, "은")} 실제 협력 자원을 붙입니다. ${withJosa(tension, "이")} 강한 시기에는 관계 확장보다 소모 관계 정리가 먼저입니다. ${transformLine}`;
  }

  if (palace.id === "career") {
    if (category.title.includes("직업") || category.title.includes("역할") || category.title.includes("직무")) {
      return `관록궁은 직업명보다 일하는 방식과 인정받는 구조를 봅니다. ${withJosa(mainName, "은")} 내가 어떤 역할에서 능력이 살아나는지 만들고, ${withJosa(secondName, "은")} 그 역할이 조직형인지 독립형인지의 결을 더합니다. ${withJosa(support, "이")} 좋으면 협업과 평판이 함께 붙지만, ${withJosa(tension, "이")} 강하면 역할 충돌과 과로가 먼저 나타날 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("조직") || category.title.includes("리더십") || category.title.includes("평판")) {
      return `조직 안에서는 능력보다 책임 범위가 명확해야 오래 갑니다. ${withJosa(mainName, "은")} 내가 책임을 맡는 방식과 권한을 쓰는 태도를 보여주고, ${withJosa(support, "은")} 문서, 발표, 협업, 추천 흐름을 받쳐 줍니다. ${withJosa(tension, "이")} 강하면 성과가 있어도 평가가 흐려질 수 있으므로 결과를 보이는 형태로 남겨야 합니다. ${transformLine}`;
    }
    return `커리어 전환은 충동보다 명확한 증거가 필요합니다. ${withJosa(mainName, "은")} 앞으로 키워야 할 전문성을 말하고, ${withJosa(support, "은")} 그 전문성을 시장과 연결합니다. ${withJosa(tension, "이")} 강한 시기에는 퇴장보다 정리, 독립보다 포트폴리오, 확장보다 역할 재정의가 먼저입니다. ${transformLine}`;
  }

  if (palace.id === "property") {
    if (category.title.includes("주거") || category.title.includes("집") || category.title.includes("공간")) {
      return `전택궁은 집과 공간이 마음과 생활 리듬을 어떻게 받쳐 주는지 보여줍니다. ${withJosa(mainName, "은")} 안정감을 느끼는 방식과 공간 취향을 만들고, ${withJosa(secondName, "은")} 주거 변화와 가족 기반의 결을 더합니다. ${withJosa(support, "이")} 좋으면 공간이 회복의 그릇이 되지만, ${withJosa(tension, "이")} 강하면 주거 불안이나 생활 리듬 붕괴가 먼저 나타날 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("가족") || category.title.includes("재산") || category.title.includes("이사")) {
      return `생활 기반은 감정만으로 결정하면 흔들리기 쉽습니다. ${withJosa(mainName, "은")} 가족과 터전의 기준을 만들고, ${withJosa(support, "은")} 장기 자산과 안정 구조를 돕습니다. ${withJosa(tension, "이")} 강한 시기에는 이사, 매매, 큰 지출을 서두르기보다 계약 조건과 생활 동선을 먼저 검토해야 합니다. ${transformLine}`;
    }
    return `전택궁의 전략은 내 몸과 마음이 회복되는 기반을 만드는 것입니다. ${withJosa(mainName, "은")} 어떤 터전에서 운이 안정되는지 알려 주고, ${withJosa(support, "은")} 그 기반을 오래 유지하게 합니다. ${withJosa(tension, "이")} 강하면 공간 정리, 고정비 점검, 가족 경계 설정이 먼저입니다. ${transformLine}`;
  }

  if (palace.id === "fortune") {
    if (category.title.includes("마음") || category.title.includes("행복") || category.title.includes("내면")) {
      return `복덕궁은 혼자 있을 때의 마음 온도와 행복을 느끼는 방식을 봅니다. ${withJosa(mainName, "은")} 내면의 기본 리듬을 만들고, ${withJosa(secondName, "은")} 취향, 휴식, 영성, 예술 감각의 결을 더합니다. ${withJosa(support, "이")} 좋으면 마음이 스스로 회복하는 힘이 강하지만, ${withJosa(tension, "이")} 커지면 쉬어도 쉬지 못하는 생각 과열이 생길 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("스트레스") || category.title.includes("불안") || category.title.includes("공허")) {
      return `불안과 공허감은 약함이 아니라 마음의 기운이 어디에서 새는지 알려 주는 신호입니다. ${withJosa(mainName, "은")} 만족감을 느끼는 조건을 만들고, ${withJosa(tension, "은")} 생각이 고착되는 지점을 알려 줍니다. 이 궁은 휴식도 계획해야 회복이 된다고 말하며, 혼자 있는 시간의 질을 반드시 관리해야 합니다. ${transformLine}`;
    }
    return `복덕궁의 행복 전략은 바깥 성과를 내면 안정으로 번역하는 일입니다. ${withJosa(mainName, "은")} 어떤 활동이 마음을 맑게 하는지 말하고, ${withJosa(support, "은")} 취미와 회복 루틴을 붙입니다. ${withJosa(tension, "이")} 강할 때는 사람을 더 만나기보다 생각을 비우는 구조를 먼저 만들어야 합니다. ${transformLine}`;
  }

  return (() => {
    if (category.title.includes("부모") || category.title.includes("보호자") || category.title.includes("보호")) {
      return `부모궁은 부모와 보호자뿐 아니라 윗사람, 멘토, 제도권과의 인연을 함께 봅니다. ${withJosa(mainName, "은")} 권위와 보호를 받아들이는 방식을 만들고, ${withJosa(secondName, "은")} 기대와 독립의 균형을 더합니다. ${withJosa(support, "이")} 좋으면 필요한 순간 도움을 받기 쉽지만, ${withJosa(tension, "이")} 강하면 기대 압박이나 문서 문제가 마음을 무겁게 할 수 있습니다. ${transformLine}`;
    }
    if (category.title.includes("권위") || category.title.includes("문서") || category.title.includes("제도")) {
      return `권위자와 제도권 앞에서는 감정보다 기록과 기준이 힘을 냅니다. ${withJosa(mainName, "은")} 상사, 기관, 규정과 부딪히는 방식을 보여주고, ${withJosa(support, "은")} 문서 정리와 후원 연결을 돕습니다. ${withJosa(tension, "이")} 강한 시기에는 말로만 해결하려 하지 말고 증빙, 일정, 승인 절차를 남겨야 합니다. ${transformLine}`;
    }
    return `부모궁의 독립 전략은 보호를 거절하는 것이 아니라 도움과 간섭을 구분하는 데서 시작됩니다. ${withJosa(mainName, "은")} 어떤 어른과 맞는지 알려 주고, ${withJosa(support, "은")} 좋은 멘토 운을 현실로 연결합니다. ${withJosa(tension, "이")} 강할 때는 가족 패턴을 반복하지 않도록 경계와 책임 범위를 조용히 세워야 합니다. ${transformLine}`;
  })();
}

function buildZiweiFullScopeConsultation(
  chart: ZiweiDeepChart,
  palace: ZiweiPalace,
  signalSummary: ReturnType<typeof buildSignalPack>,
): string[] {
  const directSihua = palace.fourTransformations.map((item) => `${transformationTypeToLabel(item.type)} ${item.starName}`);
  const incomingSihua = palace.incomingFourTransformations.map((item) => `${transformationTypeToLabel(item.type)} ${item.starName}`);
  const period = chart.majorPeriods.find((item) => item.palaceId === palace.id) || chart.majorPeriods[0];
  const annualHit = Boolean(chart.annualFlow?.keyPalaces?.includes(palace.id));
  const annualLabel = chart.annualFlow?.yearLabel || `${chart.yearGan}${chart.yearZhi}`;
  const opposite = palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId];
  const triad = signalSummary.triadNames.join(", ");
  const mainStars = signalSummary.mainStars.map((star) => star.name).join(", ") || `${opposite} 차성`;

  return [
    palace.isEmptyMainStarPalace
      ? `이 자리는 주성이 비어 있어 환경과 상대에 따라 진폭이 커집니다. 마주 보는 궁 ${opposite}의 별을 빌려 읽습니다.`
      : `주성이 직접 자리를 잡아 ${mainStars}의 성정이 비교적 곧게 나옵니다.`,
    directSihua.length
      ? `직접 사화 ${withJosa(directSihua.join(", "), "이")} 이 주제의 사건성을 앞에서 끌고 갑니다.`
      : incomingSihua.length
        ? `직접 사화는 약하지만 ${withJosa(incomingSihua.join(", "), "이")} 연결된 궁에서 들어와 간접 압력을 만듭니다.`
        : "사화가 강하게 꽂히지 않아 평소 선택 습관이 결과를 더 크게 가릅니다.",
    `대궁 ${withJosa(opposite, "과")} 삼방 ${withJosa(triad, "이")} 현실 장면을 보정합니다.`,
    period
      ? `대한 ${period.range} 구간의 ${ZIWEI_PALACE_NAME[period.palaceId]} 흐름과 맞물려, 지금의 선택이 장기 습관으로 굳어질 수 있습니다.`
      : "대한 흐름은 현재 궁의 반복 습관을 기준으로 보수적으로 읽습니다.",
    annualHit
      ? `${annualLabel} 유년에는 이 궁이 직접 건드려져 실제 사건으로 빨리 나타날 수 있습니다.`
      : `${annualLabel} 유년에는 이 궁이 전면에 서기보다 연결된 궁과 대궁을 통해 간접적으로 움직입니다.`,
  ].map((row) => sanitizeZiweiDeepText(row)).filter(Boolean);
}


/** 절마다 다른 결로 도입 문장을 열어 같은 별이 연속으로 잡혀도 문장이 겹치지 않게 한다. */
const DRIVER_CONNECTORS = [
  "",
  "겉으로는 달라 보여도 ",
  "매번 다르게 보이지만 ",
  "상황이 바뀌어도 ",
  "스스로도 알아채기 전에 ",
  "굳이 따져 보면 ",
  "결국은 ",
  "여러 번 겪어 보면 ",
];

/**
 * 별 하나가 여러 절에 다시 등장해도 같은 문장이 반복되지 않도록 8종으로 돌린다.
 * 별 풀 길이(2~3)와 절 수(8)가 어긋나 생기던 통짜 중복을 여기서 끊는다.
 */
const GIFT_FRAMES: Array<(badge: string, gift: string) => string> = [
  (badge, gift) => `${badge} 덕분에 ${gift}.`,
  (badge, gift) => `${badge}의 결이 편할 때 ${gift}.`,
  (badge, gift) => `${badge} 쪽으로 힘이 실리면 ${gift}.`,
  (badge, gift) => `${badge}에 기대는 자리에서는 ${gift}.`,
  (badge, gift) => `${badge} 신호가 살아 있는 동안 ${gift}.`,
  (badge, gift) => `${badge}의 장점이 그대로 나오면 ${gift}.`,
  (badge, gift) => `${badge} 자리가 열릴 때 ${gift}.`,
  (badge, gift) => `${badge} 쪽이 받쳐 주는 국면에서는 ${gift}.`,
];

/**
 * 같은 별이 8절 안에서 여러 번 대표로 뽑히므로, 두 번째 바퀴부터는 '왜'를 별이 아니라 그 절의 축으로 설명한다.
 * 별 풀이 2개뿐인 궁(주성 1 + 보조성 1)에서 같은 문장이 네 번 나오던 것을 여기서 끊는다.
 */
const DRIVER_ALT_LINES: Array<(anchor: string) => string> = [
  (anchor) => `${withJosa(anchor, "이")} 먼저 움직이기 때문입니다.`,
  (anchor) => `${withJosa(anchor, "을")} 지키는 쪽이 마음이 편하기 때문입니다.`,
  (anchor) => `${withJosa(anchor, "이")} 흔들리는 상태를 오래 못 견디기 때문입니다.`,
  (anchor) => `${withJosa(anchor, "을")} 기준으로 삼는 습관이 굳어 있기 때문입니다.`,
  (anchor) => `${withJosa(anchor, "이")} 맞아떨어질 때만 확신이 서기 때문입니다.`,
  (anchor) => `${withJosa(anchor, "을")} 놓치면 나머지가 어긋난다고 느끼기 때문입니다.`,
  (anchor) => `${withJosa(anchor, "이")} 정리돼야 다음 판단이 보이기 때문입니다.`,
  (anchor) => `${withJosa(anchor, "을")} 먼저 확인해야 몸이 움직이기 때문입니다.`,
];

/** 주성이 빈 궁의 보완 설명. 한 문장을 8절에 그대로 붙이면 카드마다 같은 말이 보인다. */
const EMPTY_PALACE_FRAMES: Array<(opposite: string, anchor: string) => string> = [
  (opposite, anchor) => `이 자리에는 중심을 잡아 줄 주성이 없어 마주 보는 궁 ${opposite}의 결이 ${withJosa(anchor, "을")} 대신 밀어 줍니다.`,
  (opposite, anchor) => `주성이 비어 있는 만큼 ${withJosa(anchor, "은")} 상대와 환경에 따라 진폭이 크게 벌어집니다.`,
  (opposite, anchor) => `${opposite} 쪽 상황이 좋을 때와 나쁠 때 ${withJosa(anchor, "이")} 전혀 다르게 보입니다.`,
  (opposite, anchor) => `고정된 기질보다 그때의 조건이 ${withJosa(anchor, "을")} 결정합니다. 기준을 밖에 두지 말고 적어 두는 편이 안전합니다.`,
  (opposite, anchor) => `빈 자리라 ${opposite}에서 넘어오는 흐름이 ${withJosa(anchor, "을")} 그대로 물들입니다.`,
  (opposite, anchor) => `${withJosa(anchor, "은")} 타고난 세기보다 누구와 어떤 판에 있느냐로 갈립니다.`,
  (opposite, anchor) => `주성이 없는 자리는 유연한 대신 흔들립니다. ${opposite}의 신호를 함께 봐야 ${withJosa(anchor, "이")} 읽힙니다.`,
  (opposite, anchor) => `${withJosa(anchor, "을")} 스스로 정하지 않으면 ${opposite} 쪽 사정이 대신 정해 버립니다.`,
];

const TRAP_FRAMES: Array<(badge: string, trap: string) => string> = [
  (badge, trap) => `${badge} 쪽이 세게 걸리면 ${trap}.`,
  (badge, trap) => `${badge}의 압이 올라가는 시기에는 ${trap}.`,
  (badge, trap) => `${badge} 신호가 흔들릴 때 ${trap}.`,
  (badge, trap) => `${badge}까지 겹치는 국면에서는 ${trap}.`,
  (badge, trap) => `${badge} 쪽을 그대로 두면 ${trap}.`,
  (badge, trap) => `${badge}이 자극받는 자리에서는 ${trap}.`,
  (badge, trap) => `${badge}의 결이 거칠어지면 ${trap}.`,
  (badge, trap) => `${badge} 흐름이 반복해서 건드려질 때 ${trap}.`,
];

export type ZiweiCategoryBlocks = {
  headline: string;
  scene: string;
  interpretation: string;
  strengths: string[];
  cautions: string[];
  actions: string[];
  basisChips: ZiweiEvidenceChip[];
  evidenceNotes: string[];
};

/**
 * 카드 한 장을 구성한다 — 순서는 "당신에게 어떻게 나타나는가 → 왜 그런가 → 어떻게 쓸까".
 * 🔴 명반 계산 결과(signalSummary·palace)는 읽기만 한다. 별 배치·밝기·사화를 바꾸지 않는다.
 */
function buildCategoryBlocks(
  palace: ZiweiPalace,
  category: PalaceCategorySpec,
  categoryIndex: number,
  lens: PalaceCounselingLens,
  starNarratives: string[],
  signalSummary: ReturnType<typeof buildSignalPack>,
  chartContext: ZiweiDeepChart,
): ZiweiCategoryBlocks {
  const oppositeName = palace.oppositePalace?.name || ZIWEI_PALACE_NAME[palace.oppositePalaceId];
  const scenes = PALACE_SCENE_OPENERS[palace.id];
  const scene = scenes[categoryIndex % scenes.length];

  const dedupeStars = (list: ZiweiStarMeta[]): ZiweiStarMeta[] => {
    const seen = new Set<string>();
    return list.filter((star) => star && star.name && !seen.has(star.name) && seen.add(star.name));
  };

  const voicePool = [...signalSummary.mainStars, ...palace.auxiliaryStars];
  const leadStar = voicePool.length ? voicePool[categoryIndex % voicePool.length] : undefined;
  const secondStar = voicePool.length > 1 ? voicePool[(categoryIndex + 1) % voicePool.length] : undefined;
  // 같은 별이 몇 바퀴째 대표로 뽑혔는지. 두 번째 바퀴부터는 설명을 별 대신 절의 축으로 돌린다.
  const voiceRound = voicePool.length ? Math.floor(categoryIndex / voicePool.length) : 0;
  const tensionPool = [...(palace.minorStars || []), ...(palace.maleficStars || [])];

  // 장점·함정은 궁 안의 별 전체를 돌린다 — 풀이 좁으면 같은 클로즈가 네 번씩 나온다(2026-09-06 실측).
  // 🔴 밝기는 계산된 값을 그대로 쓰고 순서만 나눈다 — 함(X)인 별을 "잘 쓰이고 있는 힘"으로 세우면
  //    칩에 찍힌 밝기와 본문이 어긋나 보인다. 함은 강점 풀 뒤로, 함정 풀 앞으로 보낸다.
  const isFallenStar = (star: ZiweiStarMeta): boolean => normalizeSymbol(star) === "X";
  const allPalaceStars = dedupeStars([...signalSummary.mainStars, ...palace.auxiliaryStars, ...tensionPool]);
  const brightStars = allPalaceStars.filter((star) => !isFallenStar(star));
  const giftPool = brightStars.length ? brightStars : allPalaceStars;
  const trapPool = dedupeStars([...allPalaceStars.filter(isFallenStar), ...tensionPool, ...allPalaceStars]);
  const giftStar = giftPool.length ? giftPool[categoryIndex % giftPool.length] : undefined;
  const trapStar = trapPool.length ? trapPool[categoryIndex % trapPool.length] : undefined;

  const lead = starVoice(leadStar);
  const second = starVoice(secondStar);
  const gift = starVoice(giftStar);
  const tension = starVoice(trapStar);

  const personalityAnchor = lens.personalityLens[categoryIndex % lens.personalityLens.length] || "성향";
  const relationshipAnchor = lens.relationshipLens[categoryIndex % lens.relationshipLens.length] || "관계 패턴";
  const cautionAnchor = lens.cautionLens[categoryIndex % lens.cautionLens.length] || "과속 판단";
  const adviceAnchor = lens.lifeAdviceLens[categoryIndex % lens.lifeAdviceLens.length] || "운영 규칙";
  const adviceAnchorLate = lens.lifeAdviceLens[(categoryIndex + 3) % lens.lifeAdviceLens.length] || adviceAnchor;

  const headline = `${scene} 당신은 ${lead.behavior}.`;

  const interpretation = [
    voiceRound === 0
      ? `${DRIVER_CONNECTORS[categoryIndex % DRIVER_CONNECTORS.length]}${lead.driver}.`
      : DRIVER_ALT_LINES[categoryIndex % DRIVER_ALT_LINES.length](personalityAnchor),
    fillAnchor(PALACE_IMPACT_LINES[palace.id], personalityAnchor),
    secondStar && secondStar.name !== leadStar?.name && voiceRound === 0
      ? `${withJosa(relationshipAnchor, "을")} 다룰 때는 ${starBadge(secondStar)}의 결이 겹쳐서 ${second.behavior}.`
      : `${withJosa(relationshipAnchor, "을")} 다룰 때 이 차이가 가장 크게 벌어집니다.`,
    palace.isEmptyMainStarPalace
      ? EMPTY_PALACE_FRAMES[categoryIndex % EMPTY_PALACE_FRAMES.length](oppositeName, personalityAnchor)
      : "",
  ].filter(Boolean).join(" ");

  const strengths = [
    giftStar
      ? GIFT_FRAMES[categoryIndex % GIFT_FRAMES.length](starBadge(giftStar), gift.gift)
      : `${oppositeName}에서 빌려 오는 결이 ${withJosa(personalityAnchor, "을")} 받쳐 줄 때 ${gift.gift}.`,
    [
      `${withJosa(adviceAnchor, "이")} 갖춰진 자리에서는 이 힘이 성과로 바로 이어집니다.`,
      `${signalSummary.triadNames.slice(0, 2).join("·")} 쪽 일이 열릴 때 ${withJosa(adviceAnchor, "이")} 특히 잘 먹힙니다.`,
      `${withJosa(relationshipAnchor, "이")} 맞는 사람과 붙으면 결과가 눈에 띄게 달라집니다.`,
    ][categoryIndex % 3],
  ];

  const cautions = [
    trapStar
      ? TRAP_FRAMES[categoryIndex % TRAP_FRAMES.length](starBadge(trapStar), tension.trap)
      : `${withJosa(cautionAnchor, "이")} 몰리는 시기에는 ${lead.trap}.`,
    [
      `${withJosa(cautionAnchor, "이")} 반복되면 회복에 드는 시간이 길어집니다.`,
      `${withJosa(cautionAnchor, "이")} 겹치는 시기에는 결정을 하루만 미뤄도 손실이 줄어듭니다.`,
      `${withJosa(cautionAnchor, "을")} 자각하지 못하면 같은 자리에서 또 걸립니다.`,
    ][categoryIndex % 3],
  ];

  const actions = [
    [
      `가장 먼저 할 것은 ${adviceAnchor}입니다.`,
      `이번 주에 손댈 것은 ${adviceAnchor} 하나면 충분합니다.`,
      `${adviceAnchor}부터 시작하면 나머지는 따라옵니다.`,
    ][categoryIndex % 3],
    fillAnchor(PALACE_ACTION_LINES[palace.id], adviceAnchorLate),
  ];

  // 칩은 이 절이 실제로 인용한 별만 세운다 — 궁의 별을 전부 나열하면 8절이 같은 칩을 달고 새 정보가 없어진다.
  const chipGroupOf = (star: ZiweiStarMeta): string => {
    if (signalSummary.mainStars.some((row) => row.name === star.name)) return "주성";
    if (palace.auxiliaryStars.some((row) => row.name === star.name)) return "보조성";
    return "긴장";
  };
  const chipStars = dedupeStars([leadStar, giftStar, trapStar, secondStar].filter(Boolean) as ZiweiStarMeta[]).slice(0, 3);
  const transformationChips = signalSummary.transformations.length
    ? [signalSummary.transformations[categoryIndex % signalSummary.transformations.length]]
    : [];

  const basisChips: ZiweiEvidenceChip[] = [
    { label: "궁", value: `${palace.name} · ${palace.earthlyBranch}` },
    ...chipStars.map((star) => ({ label: chipGroupOf(star), value: starBadge(star) })),
    ...transformationChips.map((item) => ({
      label: "사화",
      value: `${item.type} ${item.starName}`,
    })),
    { label: "마주 보는 궁", value: oppositeName },
  ];

  const transformationNote = signalSummary.transformations.length
    ? `${signalSummary.transformations[0].type} ${signalSummary.transformations[0].starName} 흐름이 겹치면 같은 사건도 체감 강도가 커집니다.`
    : "직접 사화가 약할수록 작은 습관 차이가 결과를 크게 가릅니다.";

  const palaceSpecificNote = palace.id === "spouse"
    ? "부부궁은 감정의 크기보다 대화의 순서와 신뢰 확인 방식이 관계의 수명을 좌우합니다. 상대를 바꾸기보다 갈등이 생길 때 어떤 말부터 꺼낼지 합의해 두는 편이 오래갑니다."
    : palace.id === "career"
      ? "관록궁은 능력보다 역할 정의가 먼저입니다. 조직에서 무엇을 책임지고 어디까지 결정할지 분명해질수록 평판이 안정되고 이직이나 독립 판단도 정확해집니다."
      : palace.id === "fortune"
        ? "복덕궁은 바깥 성과보다 내면 회복 속도가 크게 작용합니다. 혼자 있는 시간의 질이 떨어지면 행복감이 빠르게 낮아지므로 감정을 정리하는 루틴을 일정처럼 고정하는 편이 안전합니다."
        : "";

  const lifeSceneNote = (() => {
    const topMain = signalSummary.mainStars[0]?.name || "핵심 별";
    const topSupport = signalSummary.supportStars[0] || "보조 별";
    const topMinor = signalSummary.minorStars[0] || "긴장 별";

    if (palace.id === "ming") {
      return `명궁은 ${topMain}의 기질이 첫 반응과 자기 주도권을 정합니다. ${withJosa(topSupport, "이")} 받쳐 주면 중심이 단단해지고, ${withJosa(topMinor, "이")} 과열되면 자기 의심이 커집니다.`;
    }
    if (palace.id === "spouse") {
      return `부부궁은 ${topMain} 성향이 애정 표현 방식과 갈등 회복 속도를 좌우합니다. ${withJosa(topSupport, "이")} 살아 있으면 신뢰 회복이 빠르고, ${withJosa(topMinor, "이")} 강하면 말의 온도 차이가 커집니다.`;
    }
    if (palace.id === "career") {
      return `관록궁은 ${withJosa(topMain, "이")} 직무 적합성과 사회적 성취의 축을 만듭니다. ${withJosa(topSupport, "이")} 붙으면 평판과 협업 효율이 올라가고, ${withJosa(topMinor, "이")} 흔들리면 과로와 역할 충돌이 먼저 옵니다.`;
    }
    if (palace.id === "wealth") {
      return `재백궁은 ${withJosa(topMain, "이")} 수입 구조와 돈의 운용 습관을 만듭니다. ${withJosa(topSupport, "은")} 회수력을 높이고, ${withJosa(topMinor, "이")} 자극되면 충동 소비나 과속 거래가 생기기 쉽습니다.`;
    }
    if (palace.id === "fortune") {
      return `복덕궁은 ${withJosa(topMain, "이")} 마음의 온도와 행복감 유지 방식을 정합니다. ${withJosa(topSupport, "이")} 회복을 돕고, ${withJosa(topMinor, "이")} 커지면 쉬어도 쉬지 못하는 흐름이 생깁니다.`;
    }
    if (palace.id === "parents") {
      return `부모궁은 ${withJosa(topMain, "이")} 권위자와의 거리 감각을 만들고 ${withJosa(topSupport, "은")} 후원 연결을 돕습니다. ${withJosa(topMinor, "이")} 강하면 기대 압박이나 문서 실수가 커집니다.`;
    }
    if (palace.id === "friends") {
      return `노복궁은 ${withJosa(topMain, "이")} 협력자 선택 기준을 만들고 ${withJosa(topSupport, "은")} 네트워크 확장에 힘을 보탭니다. ${withJosa(topMinor, "이")} 과열되면 관계 소모가 빨라집니다.`;
    }
    if (palace.id === "health") {
      return `질액궁은 ${withJosa(topMain, "이")} 체력 소모 패턴을 만들고 ${withJosa(topSupport, "은")} 회복 속도를 올립니다. ${withJosa(topMinor, "이")} 과하게 움직이면 번아웃이 앞당겨집니다.`;
    }
    if (palace.id === "travel") {
      return `천이궁은 ${withJosa(topMain, "이")} 외부 확장 방식과 적응력을 정합니다. ${withJosa(topSupport, "이")} 붙으면 기회 유입이 빨라지고, ${withJosa(topMinor, "이")} 커지면 과속 확장으로 피로가 쌓입니다.`;
    }
    if (palace.id === "property") {
      return `전택궁은 ${withJosa(topMain, "이")} 생활 기반 안정 방식에 영향을 주고 ${withJosa(topSupport, "은")} 자산 축적의 지속성을 높입니다. ${withJosa(topMinor, "이")} 흔들리면 주거 불안과 리듬 붕괴가 겹칩니다.`;
    }
    if (palace.id === "siblings") {
      return `형제궁은 ${withJosa(topMain, "이")} 수평 관계의 말투와 기대치를 만들고 ${withJosa(topSupport, "은")} 협업 신뢰를 받쳐 줍니다. ${withJosa(topMinor, "이")} 자극되면 비교 심리가 커집니다.`;
    }
    return `자녀궁은 ${withJosa(topMain, "이")} 돌봄과 결과물 생산 흐름을 만들고 ${withJosa(topSupport, "은")} 완성도를 높입니다. ${withJosa(topMinor, "이")} 과열되면 책임 과부하가 옵니다.`;
  })();

  const crossPalaceNote = (() => {
    const triad = signalSummary.triadNames.slice(0, 2).join("·");
    if (palace.id === "spouse") {
      return `관계 흐름은 ${oppositeName}과 ${triad}의 신호를 함께 볼 때 정확해집니다. 사랑은 감정만으로 유지되지 않고 일과 돈의 리듬이 맞아야 오래갑니다.`;
    }
    if (palace.id === "career") {
      return `커리어 흐름은 ${oppositeName}과 ${triad}의 균형에서 성패가 갈립니다. 실력뿐 아니라 관계와 회복 리듬을 같이 맞춰야 성취가 오래갑니다.`;
    }
    if (palace.id === "wealth") {
      return `재물 흐름은 ${oppositeName}과 ${triad}의 결합에서 크게 달라집니다. 돈은 일의 구조와 사람의 흐름이 동시에 맞물릴 때 남습니다.`;
    }
    if (palace.id === "ming") {
      return `자기 운영은 ${oppositeName}과 ${triad}의 반응으로 검증됩니다. 마음의 기준이 현실 성과와 이어지도록 주간 루틴으로 고정하면 흔들림이 줄어듭니다.`;
    }
    return `${palace.name}의 결과는 ${oppositeName}과 ${triad} 연결에서 커지거나 줄어듭니다. 한 궁만 보지 말고 연결된 궁을 함께 볼 때 실제 장면이 선명해집니다.`;
  })();

  const palaceDepthNote = palace.id === "ming"
    ? buildMingCounselingExpansion(category, signalSummary)
    : palace.id === "siblings"
      ? buildSiblingCounselingExpansion(category, signalSummary)
      : buildRemainingPalaceCounselingExpansion(palace, category, signalSummary);

  // 궁 단위로 고정된 근거는 절마다 하나씩 돌려 보여 준다 — 같은 문장이 8번 반복되지 않게 한다.
  const palaceNotePool = [
    lifeSceneNote,
    crossPalaceNote,
    ...buildZiweiFullScopeConsultation(chartContext, palace, signalSummary),
    transformationNote,
    signalSummary.brightnessSummary,
    palaceSpecificNote,
  ].filter(Boolean);

  // 🔴 궁 고정 문장을 8절 전부에 붙이면 카드마다 같은 근거가 보인다(2026-09-06 실측: 동일 문장 8회).
  //    별 서술 + 궁 서술을 한 풀로 합치고 서로 다른 오프셋 3개로 뽑아 회전시킨다.
  const notePool = unique([...starNarratives, ...palaceNotePool, palaceDepthNote].filter(Boolean), 24);
  const evidenceNotes = unique(
    [
      notePool[categoryIndex % Math.max(1, notePool.length)] || "",
      notePool[(categoryIndex + 3) % Math.max(1, notePool.length)] || "",
      notePool[(categoryIndex + 5) % Math.max(1, notePool.length)] || "",
    ].filter(Boolean),
    3,
  );

  return {
    headline: sanitizeZiweiDeepText(headline),
    scene,
    interpretation: sanitizeZiweiDeepText(interpretation),
    strengths: strengths.map((row) => sanitizeZiweiDeepText(row)),
    cautions: cautions.map((row) => sanitizeZiweiDeepText(row)),
    actions: actions.map((row) => sanitizeZiweiDeepText(row)),
    basisChips,
    evidenceNotes: evidenceNotes.map((row) => sanitizeZiweiDeepText(row)),
  };
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

  const mainNarratives = signals.mainStars
    .slice(0, 2)
    .map((star) => describeStarInPalaceContext(star, palace, pickGroupForStar(palace, star.name)));
  const supportNarratives = [...palace.auxiliaryStars.slice(0, 1), ...palace.maleficStars.slice(0, 1)]
    .map((star) => describeStarInPalaceContext(star, palace, pickGroupForStar(palace, star.name)));
  const starNarratives = unique([...mainNarratives, ...supportNarratives], 4);

  const blocks = buildCategoryBlocks(
    palace,
    category,
    categoryIndex,
    lens,
    starNarratives,
    signals,
    chartContext,
  );

  return {
    categoryTitle: category.title,
    categoryQuestion: category.question,
    usedSignals: signals.usedSignals.slice(0, 5),
    headline: blocks.headline,
    scene: blocks.scene,
    interpretation: blocks.interpretation,
    strengths: blocks.strengths,
    cautions: blocks.cautions,
    actions: blocks.actions,
    basisChips: blocks.basisChips,
    evidenceNotes: blocks.evidenceNotes,
    // 🔴 해석 메타데이터 — 코드 안에만 남기고 화면에는 절대 렌더링하지 않는다(사용자 지시 2026-09-06).
    meta: {
      categoryTitle: category.title,
      categoryQuestion: category.question,
      lens: lens.role,
    },
    // 아래 3개는 기존 소비자(generate-ziwei-deep-chapter.ts)를 위한 호환 필드다.
    opportunity: blocks.strengths.join(" "),
    caution: blocks.cautions.join(" "),
    action: blocks.actions.join(" "),
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
  const strengths = category.strengths?.length ? category.strengths : [category.opportunity];
  const cautions = category.cautions?.length ? category.cautions : [category.caution];
  const actions = category.actions?.length ? category.actions : [category.action];
  const chips = (category.basisChips || []).map((chip) => `${chip.label} ${chip.value}`);
  const evidence = category.evidenceNotes || [];

  const body = [
    category.headline || "",
    category.interpretation,
    "**✦ 잘 쓰이고 있는 힘**",
    strengths.map((row) => `- ${row}`).join("\n"),
    "**⚠ 과열되면 나오는 모습**",
    cautions.map((row) => `- ${row}`).join("\n"),
    "**💡 이렇게 쓰세요**",
    actions.map((row) => `- ${row}`).join("\n"),
    "**왜 이렇게 읽었나**",
    chips.length ? `- 명반 근거: ${chips.join(" · ")}` : "",
    evidence.map((row) => `- ${row}`).join("\n"),
  ].filter(Boolean).join("\n\n");

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

/** 재생성 시 완전히 같은 줄을 걷어 낸다. 소제목·블록 라벨·짧은 줄은 건드리지 않는다. */
function dedupeDocumentLines(text: string): string {
  const seen = new Set<string>();
  return String(text || "")
    .split("\n")
    .filter((line) => {
      const key = line.trim().replace(/^- /, "");
      if (key.length < 24 || key.startsWith("###") || key.startsWith("**")) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
}

export function buildZiweiDeepCounselingText(
  chart: ZiweiDeepChart,
  palace: ZiweiPalace,
  reading: ZiweiDeepPalaceReading,
  retry = false,
): string {
  const header = buildCounselingOpening(chart, palace, reading);
  const sections = reading.categories.map((category, index) => buildCounselingCategorySection(category, index));
  const document = [header, ...sections].join("\n\n");
  return (retry ? dedupeDocumentLines(document) : document).trim();
}


export type ZiweiDeepCategorySection = { title: string; body: string };

/**
 * `### N. 제목` 으로 나뉜 궁별 장문을 절 단위로 쪼갠다.
 * 🔴 결과 화면 아코디언(AdvancedZiweiSectionV2)과 아래 validateZiweiDeepReading 이 이 함수 하나만 쓴다 —
 *    화면이 정규식을 따로 들고 있으면 절 수가 어긋나도 아무도 못 잡는다.
 * 개관·마스터플랜 장문에는 `### N.` 이 없어 빈 배열이 나온다(화면은 그때 통짜 산문으로 렌더한다).
 */
export function splitZiweiDeepCategories(fullText: string): ZiweiDeepCategorySection[] {
  const blocks = String(fullText || "").split(/\n###\s+\d+\.\s+/g);
  if (blocks.length <= 1) return [];
  return blocks.slice(1).map((block) => {
    const lineBreak = block.indexOf("\n");
    return {
      title: (lineBreak === -1 ? block : block.slice(0, lineBreak)).trim(),
      body: (lineBreak === -1 ? "" : block.slice(lineBreak + 1)).trim(),
    };
  });
}


function hasRepeatedSentence(fullText: string): boolean {
  const sentences = String(fullText || "")
    .split("\n")
    .map((row) => row.trim())
    .filter((row) => row && !row.startsWith("- ") && !row.startsWith("**") && !row.startsWith("###"))
    .flatMap((row) => row.split(/(?<=[.!?])\s+/))
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

      const categorySections = splitZiweiDeepCategories(reading.fullText);
      if (categorySections.length && categorySections.length !== expectedCount) {
        issues.push(`${reading.palaceReading.palaceName} 카테고리 본문 분리 실패`);
      }

      const cardFront = (category: ZiweiPalaceCategoryReading): string => [
        category.headline || "",
        category.interpretation || "",
        ...(category.strengths || []),
        ...(category.cautions || []),
        ...(category.actions || []),
      ].filter(Boolean).join(" ").trim();

      const seenFrontSentences = new Set<string>();
      reading.palaceReading.categories.forEach((category) => {
        const label = `${reading.palaceReading?.palaceName}/${category.categoryTitle}`;
        const front = cardFront(category);
        if (!(category.headline || "").includes("당신")) {
          issues.push(`${label} 한 줄 핵심이 2인칭이 아님`);
        }
        if ((category.strengths || []).length < 2) issues.push(`${label} 강점 항목 부족`);
        if ((category.cautions || []).length < 2) issues.push(`${label} 주의 항목 부족`);
        if ((category.actions || []).length < 2) issues.push(`${label} 활용 항목 부족`);
        if ((category.basisChips || []).length < 3) issues.push(`${label} 근거칩 부족`);
        if ((category.evidenceNotes || []).length < 2) issues.push(`${label} 근거 노트 부족`);
        if (front.length < 180) issues.push(`${label} 카드 앞면 정보 부족`);
        if (front.length > 700) issues.push(`${label} 카드 앞면 과다 서술`);
        if (category.categoryQuestion && front.includes(category.categoryQuestion)) {
          issues.push(`${label} 내부 질문 문장 노출`);
        }
        if (countBannedZiweiTonePhrases(front) > 0) {
          issues.push(`${label} 해석 방법론 문구 노출`);
        }
        if ((category.usedSignals || []).length < 2) {
          issues.push(`${label} 실제 신호 반영 부족`);
        }
        front
          .split(/(?<=[.!?])\s+/)
          .map((row) => row.trim().replace(/\s+/g, " "))
          .filter((row) => row.length >= 24)
          .forEach((row) => {
            if (seenFrontSentences.has(row)) issues.push(`${label} 카드 앞면 문장 반복`);
            seenFrontSentences.add(row);
          });
      });

      categorySections.forEach((section, index) => {
        const label = `${reading.palaceReading?.palaceName}/카테고리 ${index + 1}`;
        const requiredBlocks = ["**✦ ", "**⚠ ", "**💡 ", "**왜 이렇게 읽었나**"];
        if (requiredBlocks.some((block) => !section.body.includes(block))) {
          issues.push(`${label} 카드 블록 누락`);
        }
        if (section.title && section.body.split(section.title).length - 1 > 3) {
          issues.push(`${label} 소제목 반복 노출`);
        }
        if (countBannedZiweiTonePhrases(section.body) > 0) {
          issues.push(`${label} 해석 방법론 문구 노출`);
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
