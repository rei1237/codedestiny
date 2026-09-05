// AdvancedZiweiSectionV2(/ziwei/chart, 심화 자미두수) 해석 문장 엔진.
//
// 화면 컴포넌트(.tsx)에서 뽑아낸 순수 모듈이다. 여기서 만드는 문장은 전부 **화면에 그대로 찍히는
// 고객 문장**이므로 아래 규칙을 지킨다(가드 scripts/verify-ziwei-chart-customer-copy.mjs 가 실행 검사로 잠근다):
//   - 2인칭 "당신", ~입니다/~합니다. "고객/사용자/내담자" 같은 3인칭 호칭을 쓰지 않는다.
//   - 운영자·개발 어휘 금지: 데이터·계산·정밀도·확인 제한·STEP·annualFlow·"궁세 "·차성 보정·상담 트랙.
//   - `라벨: 값` 덤프 금지 — 라벨은 문장 속에 녹이고, 없는 값은 의미 있는 문장으로 말한다
//     (무주성 → "중심 별이 앉지 않아 맞은편 궁의 별을 빌려 읽습니다").
//   - 궁 id(ming/career…)를 화면에 흘리지 않는다 — 이름은 palaceNameById() 로 바꾼다.
//
// 해석 문장은 한국어 고정이다(2026-09-05 사용자 결정). 화면 라벨만 advanced-ziwei-copy.ts 가 로케일별로 든다.
// PALACE_DEFINITION_MAP_DEFAULT / STAR_MEANING_MAP_DEFAULT 의 키·필드는 관리자 CMS(app/admin/cms/_lib/base-values.ts)가
// __cmsZiweiDeepDefaults 로 읽으므로 형태를 바꾸지 않는다. focus 값도 그대로 두고 describePalaceFocus() 가 문장으로 감싼다.

import { cmsRecord } from "@/lib/cms/build-text";
import type { ZiweiDeepChart, ZiweiPalace, ZiweiPalaceId, ZiweiStarMeta } from "../../../_lib/ziwei-types";
import { transformationTypeToLabel } from "../../../_lib/ziwei-advanced-normalization";
import type { AdvancedZiweiCopy } from "./advanced-ziwei-copy";

export type ZiweiConsultationTrackId =
  | "life"
  | "career"
  | "wealth"
  | "love"
  | "relationships"
  | "family"
  | "health"
  | "timing";

export interface ZiweiCounselingTrackConfig {
  key: ZiweiConsultationTrackId;
  title: string;
  shortTitle: string;
  purpose: string;
  primaryPalaces: ZiweiPalaceId[];
  secondaryPalaces: ZiweiPalaceId[];
  keyQuestions: string[];
  interpretationPriorities: string[];
  timingFocus: string;
  actionGuideType: string;
  cautionRules: string[];
}

export type ZiweiBrightnessBand = "묘" | "득" | "리" | "평" | "함";
export type ZiweiTrackPriority = "primary" | "secondary" | "supporting";

export const ZIWEI_TRACK_KEYS: ZiweiConsultationTrackId[] = ["life", "career", "wealth", "love", "relationships", "family", "health", "timing"];

export function buildCounselingTracks(copy: Pick<AdvancedZiweiCopy, "trackTitles" | "trackPurpose">): ZiweiCounselingTrackConfig[] {
  return [
    {
      key: "life",
      title: copy.trackTitles.life,
      shortTitle: "종합",
      purpose: copy.trackPurpose.life,
      primaryPalaces: ["ming", "fortune", "career"],
      secondaryPalaces: ["wealth", "travel", "spouse"],
      keyQuestions: ["내 명반에서 가장 선명한 성향은 무엇인가?", "반복되는 선택 패턴은 어디에서 시작되는가?", "삶의 균형을 잡으려면 어떤 축을 먼저 조절해야 하는가?"],
      interpretationPriorities: ["명궁·신궁의 기본 반응", "강한 궁과 돌봐야 할 궁의 균형", "맞은편 궁·삼방사정으로 보이는 반복 패턴"],
      timingFocus: "올해와 대한의 흐름이 잡히면 타고난 성향 가운데 어떤 면이 지금 더 강해지는지 함께 봅니다.",
      actionGuideType: "삶의 방향을 넓게 정리하고, 당장 고정할 생활 기준을 뽑습니다.",
      cautionRules: ["성격을 단정하지 않고 상황별 반응으로 설명합니다.", "모든 궁을 같은 비중으로 펼치기보다 핵심 축을 먼저 보여줍니다."],
    },
    {
      key: "career",
      title: copy.trackTitles.career,
      shortTitle: "직업",
      purpose: copy.trackPurpose.career,
      primaryPalaces: ["career", "ming", "wealth"],
      secondaryPalaces: ["travel", "fortune", "friends"],
      keyQuestions: ["어떤 방식으로 일할 때 성과가 나는가?", "조직과 독립 중 어떤 조건이 더 맞는가?", "소진을 줄이려면 어떤 업무 환경을 피해야 하는가?"],
      interpretationPriorities: ["관록궁에 앉은 별과 사화", "명궁과 관록궁의 연결", "재백궁과 천이궁이 보여주는 성과 전환 방식"],
      timingFocus: "대한과 올해의 흐름이 잡히면 커리어를 넓힐 구간과 보수적으로 지킬 구간을 나눠 봅니다.",
      actionGuideType: "역할 선택, 업무 리듬, 협업 기준을 실행 조언으로 정리합니다.",
      cautionRules: ["직업명을 단정하지 않고 적합한 역할과 환경을 설명합니다.", "성과 욕구와 회복 리듬을 함께 봅니다."],
    },
    {
      key: "wealth",
      title: copy.trackTitles.wealth,
      shortTitle: "재물",
      purpose: copy.trackPurpose.wealth,
      primaryPalaces: ["wealth", "career", "property"],
      secondaryPalaces: ["fortune", "ming", "friends"],
      keyQuestions: ["돈을 버는 방식은 어디에서 힘을 얻는가?", "재물의 누수는 어떤 선택 습관에서 생기는가?", "사업이나 투자 판단에서 조절할 기준은 무엇인가?"],
      interpretationPriorities: ["재백궁에 앉은 별과 보조성", "관록궁과 재백궁의 성과 연결", "전택궁이 보여주는 장기 기반"],
      timingFocus: "올해와 대한의 흐름이 잡히면 넓힐 때, 지킬 때, 정비할 때를 구분합니다.",
      actionGuideType: "수입 구조, 지출 기준, 위험 관리 문장으로 정리합니다.",
      cautionRules: ["투자 성공이나 손실을 확정하지 않습니다.", "재물운을 감정이 아니라 관리 구조로 설명합니다."],
    },
    {
      key: "love",
      title: copy.trackTitles.love,
      shortTitle: "연애",
      purpose: copy.trackPurpose.love,
      primaryPalaces: ["spouse", "ming", "fortune"],
      secondaryPalaces: ["friends", "children", "travel"],
      keyQuestions: ["관계에서 어떤 상대와 흐름이 맞는가?", "갈등은 어떤 감정 반응에서 커지는가?", "건강한 관계를 위해 어떤 표현을 연습해야 하는가?"],
      interpretationPriorities: ["부부궁에 앉은 별과 사화", "명궁이 관계에서 드러나는 방식", "복덕궁과 노복궁의 정서 안정"],
      timingFocus: "시기의 흐름이 잡히면 관계를 넓히기보다 조율이 필요한 구간을 따로 짚습니다.",
      actionGuideType: "관계 표현, 경계 설정, 갈등 회복 문장으로 정리합니다.",
      cautionRules: ["이혼·결별·결혼을 확정하지 않습니다.", "상대방을 규정하지 않고 관계에서 반복되는 반응을 설명합니다."],
    },
    {
      key: "relationships",
      title: copy.trackTitles.relationships,
      shortTitle: "관계",
      purpose: copy.trackPurpose.relationships,
      primaryPalaces: ["friends", "siblings", "travel"],
      secondaryPalaces: ["ming", "spouse", "career"],
      keyQuestions: ["어떤 사람과 협업이 잘 맞는가?", "관계에서 소모가 생기는 지점은 어디인가?", "경계를 세워야 할 신호는 무엇인가?"],
      interpretationPriorities: ["노복궁의 사람운", "형제궁의 수평 관계", "천이궁의 외부 인연과 명궁의 반응"],
      timingFocus: "시기의 흐름이 잡히면 새 인연을 넓힐 때와 관계를 정비할 때를 구분합니다.",
      actionGuideType: "협업 기준, 거절 문장, 신뢰 검증 기준을 제시합니다.",
      cautionRules: ["사람을 좋은 사람/나쁜 사람으로 나누지 않습니다.", "관계의 강점과 소모 지점을 함께 봅니다."],
    },
    {
      key: "family",
      title: copy.trackTitles.family,
      shortTitle: "가족",
      purpose: copy.trackPurpose.family,
      primaryPalaces: ["parents", "siblings", "children"],
      secondaryPalaces: ["property", "spouse", "fortune"],
      keyQuestions: ["가족 안에서 반복되는 역할은 무엇인가?", "정서적 거리와 책임감은 어떻게 균형을 잡아야 하는가?", "자녀·후배·결과물과의 관계에서 무엇을 조절해야 하는가?"],
      interpretationPriorities: ["부모궁의 윗사람·문서 인연", "형제궁의 수평 관계", "자녀궁의 생산성과 돌봄 방식"],
      timingFocus: "시기의 흐름이 잡히면 가족 책임이 커지는 구간과 독립이 필요한 구간을 구분합니다.",
      actionGuideType: "가족 대화, 책임 분담, 돌봄과 독립의 기준을 정리합니다.",
      cautionRules: ["가족 구성원을 단정하지 않습니다.", "책임감과 경계 설정을 함께 다룹니다."],
    },
    {
      key: "health",
      title: copy.trackTitles.health,
      shortTitle: "리듬",
      purpose: copy.trackPurpose.health,
      primaryPalaces: ["health", "fortune", "ming"],
      secondaryPalaces: ["travel", "career", "property"],
      keyQuestions: ["어떤 상황에서 에너지가 빨리 소모되는가?", "회복을 위해 먼저 고정할 루틴은 무엇인가?", "생활 리듬을 흔드는 반복 패턴은 어디에서 오는가?"],
      interpretationPriorities: ["질액궁의 생활 리듬", "복덕궁의 회복 방식", "명궁·신궁의 스트레스 반응"],
      timingFocus: "시기의 흐름이 잡히면 과로를 줄이고 회복을 우선할 구간을 짚습니다.",
      actionGuideType: "수면·일정·감정 반응을 점검하는 생활 조언으로 정리합니다.",
      cautionRules: ["의학적 진단처럼 말하지 않습니다.", "필요한 경우 전문가 상담을 권합니다."],
    },
    {
      key: "timing",
      title: copy.trackTitles.timing,
      shortTitle: "시기",
      purpose: copy.trackPurpose.timing,
      primaryPalaces: ["ming", "career", "wealth"],
      secondaryPalaces: ["fortune", "travel", "health"],
      keyQuestions: ["지금 타고난 성향 가운데 어떤 면이 더 강해지는가?", "넓히기 좋은 분야와 조심할 분야는 무엇인가?", "올해 흐름이 아직 잡히지 않았다면 대한만으로 무엇까지 말할 수 있는가?"],
      interpretationPriorities: ["올해 흐름이 비추는 핵심 궁", "대한(10년 단위)이 머무는 궁", "타고난 명반의 강한 궁과 돌봐야 할 궁"],
      timingFocus: "올해 흐름이 잡히지 않으면 특정 시기를 단정하지 않고, 타고난 명반 기준의 선택 우선순위만 제시합니다.",
      actionGuideType: "기회, 부담, 선택 기준, 주의 행동을 분리합니다.",
      cautionRules: ["현재 연도나 특정 사건을 임의로 예측하지 않습니다.", "생년월일시만으로 잡히지 않는 부분은 단정하지 않고 그렇다고 말합니다."],
    },
  ];
}

export interface ZiweiPalaceCounselingItem {
  palace: ZiweiPalace;
  energy: number;
  keywords: string[];
  starMechanics: string;
  brightness: string;
  assists: string;
  malefics: string;
  transformations: string[];
  isBorrowed: boolean;
  reality: string;
  strengths: string;
  cautions: string;
  advice: string;
  prescription: string;
  definition: string;
}

export interface ZiweiTrackPattern {
  title: string;
  interpretation: string;
  evidence: string[];
  palaceIds: ZiweiPalaceId[];
}

export interface ZiweiTrackFlowStage {
  stage: string;
  title: string;
  content: string;
  evidence: string[];
  actions: string[];
}

export interface ZiweiPalaceEvidence {
  mainStars: string[];
  auxiliaryStars: string[];
  transformations: string[];
  oppositePalace: string;
  relatedPalaces: string[];
  lines: string[];
}

export interface ZiweiTrackPalaceReading {
  palaceId: ZiweiPalaceId;
  palaceName: string;
  headline: string;
  customerMeaning: string;
  corePattern: string;
  strengths: string[];
  challenges: string[];
  realLifeManifestations: string[];
  crossPalaceInterpretation: string;
  selectedTrackRelevance: string;
  timingInterpretation: string;
  practicalAdvice: string[];
  evidence: ZiweiPalaceEvidence;
  dataLimitations: string[];
  priority: ZiweiTrackPriority;
}

export interface ZiweiTrackAnalysis {
  selectedTrack: ZiweiCounselingTrackConfig;
  executiveSummary: {
    headline: string;
    summary: string;
    keyPatterns: ZiweiTrackPattern[];
  };
  consultationFlow: ZiweiTrackFlowStage[];
  palaceReadings: ZiweiTrackPalaceReading[];
  timing: {
    available: boolean;
    currentTheme: string;
    opportunities: string[];
    cautions: string[];
    recommendedActions: string[];
    evidence: string[];
  };
  actionPlan: {
    start: string[];
    reduce: string[];
    maintain: string[];
    reflectionQuestions: string[];
  };
  dataWarnings: string[];
}

export interface ZiweiPalaceLinkInsight {
  left: ZiweiPalaceId;
  right: ZiweiPalaceId;
  title: string;
  lens: string;
  state: string;
  summary: string;
}

export const PALACE_DEFINITION_MAP_DEFAULT: Record<ZiweiPalaceId, { name: string; definition: string; focus: string }> = {
  ming: {
    name: "명궁",
    definition: "선천적 기질과 삶을 대하는 기본 반응을 보여주는 중심 궁",
    focus: "자기 인식, 위기 반응, 인생 중심 테마",
  },
  siblings: {
    name: "형제궁",
    definition: "가까운 사람과의 심리적 거리, 수평 관계의 협력 패턴을 보여주는 궁",
    focus: "친구/동료 관계, 비교심리, 신뢰와 동업",
  },
  spouse: {
    name: "부부궁",
    definition: "연애와 결혼에서 반복되는 관계 패턴을 드러내는 궁",
    focus: "상대 유형, 갈등 원인, 회복 방식, 좋은 관계 조건",
  },
  children: {
    name: "자녀궁",
    definition: "자녀뿐 아니라 창작물과 프로젝트 결과물의 생산성을 보여주는 궁",
    focus: "후배/부하/결과물 운, 생산력, 양육/리딩 방식",
  },
  wealth: {
    name: "재백궁",
    definition: "재물 흐름과 자산 운용 습관을 읽는 궁",
    focus: "돈을 버는 방식과 지키는 방식, 현금흐름, 계약 감각",
  },
  health: {
    name: "질액궁",
    definition: "건강 상태를 단정하기보다 에너지 소모와 회복 패턴을 보여주는 궁",
    focus: "체질적 경향, 생활 리듬, 과로 관리",
  },
  travel: {
    name: "천이궁",
    definition: "바깥 환경에서 기회가 열리는 방식과 적응력을 보여주는 궁",
    focus: "이직/이사/해외/대외 활동, 외부 이미지",
  },
  friends: {
    name: "노복궁",
    definition: "협력자, 팀원, 고객, 커뮤니티와의 연결 방식을 보여주는 궁",
    focus: "인맥 구조, 협업 운, 커뮤니티 확장",
  },
  career: {
    name: "관록궁",
    definition: "직업명보다 성공하는 일의 방식과 커리어 구조를 드러내는 궁",
    focus: "업무 스타일, 리더/참모 성향, 장기 성장 축",
  },
  property: {
    name: "전택궁",
    definition: "삶의 기반, 주거 안정, 쌓아 가는 힘을 보여주는 궁",
    focus: "공간 운, 자산 기반, 생활 터전 안정성",
  },
  fortune: {
    name: "복덕궁",
    definition: "내면 안정감과 행복감, 번아웃 회복력을 보여주는 궁",
    focus: "휴식 방식, 만족도, 정서적 회복",
  },
  parents: {
    name: "부모궁",
    definition: "부모뿐 아니라 윗사람, 제도, 문서 인연을 읽는 궁",
    focus: "상사/스승 운, 문서/계약, 보호와 독립",
  },
};

export const STAR_MEANING_MAP_DEFAULT: Record<string, { essence: string; strength: string; shadow: string }> = {
  자미: { essence: "중심성, 책임, 리더십", strength: "판을 정리하고 방향을 제시하는 힘", shadow: "통제욕, 고립감, 자존심 부담" },
  천기: { essence: "전략, 기획, 변통", strength: "상황을 읽고 최적 해법을 찾는 능력", shadow: "생각 과다, 결정 지연" },
  태양: { essence: "표현, 추진, 명료함", strength: "밖으로 빛을 내고 영향력을 확장하는 힘", shadow: "과열, 과책임" },
  무곡: { essence: "실행, 재정 감각, 결단", strength: "숫자와 결과를 붙잡는 능력", shadow: "융통성 저하, 완고함" },
  천동: { essence: "유연함, 공감, 생활 감수성", strength: "사람의 마음을 부드럽게 여는 힘", shadow: "결정 회피, 감정 흔들림" },
  염정: { essence: "원칙, 선명함, 진정성", strength: "가치를 지키며 판을 정화하는 힘", shadow: "극단적 판단, 관계 긴장" },
  천부: { essence: "안정, 저장, 운영력", strength: "기반을 만들고 지키는 능력", shadow: "보수성, 변화 지연" },
  태음: { essence: "내면성, 세심함, 축적", strength: "조용히 자산과 감각을 키우는 힘", shadow: "불안, 정서 과민" },
  탐랑: { essence: "매력, 확장, 욕구", strength: "사람과 기회를 끌어오는 힘", shadow: "과욕, 분산" },
  거문: { essence: "언어, 분석, 문제의식", strength: "불명확한 것을 드러내는 힘", shadow: "오해, 비판 과다" },
  천상: { essence: "균형, 조율, 외교", strength: "갈등을 중재하고 공정성을 세우는 힘", shadow: "우유부단, 과배려" },
  천량: { essence: "보호, 윤리, 회복", strength: "사람을 살리고 기준을 세우는 힘", shadow: "훈계성, 무거움" },
  칠살: { essence: "돌파, 결단, 개척", strength: "위험 구간을 뚫고 전진하는 힘", shadow: "과속, 충돌" },
  파군: { essence: "변혁, 리셋, 재구성", strength: "낡은 구조를 깨고 새 판을 짜는 힘", shadow: "파괴적 선택, 불안정" },
  좌보: { essence: "조력, 지원, 협력", strength: "약점을 보완하는 사람운", shadow: "의존성" },
  우필: { essence: "지원, 마감, 실행 보정", strength: "흐름을 완성해주는 힘", shadow: "타인 기대 과다" },
  문창: { essence: "문서, 학습, 구조화", strength: "지식과 기록으로 성과를 만드는 힘", shadow: "이론 과다" },
  문곡: { essence: "감성, 전달, 설득", strength: "말과 글로 공감을 여는 힘", shadow: "감정 기복" },
  경양: { essence: "절단, 직진, 압박", strength: "결정을 미루지 않게 만드는 힘", shadow: "관계 마찰" },
  타라: { essence: "저항, 지연, 버팀", strength: "쉽게 무너지지 않는 내구성", shadow: "고착, 답답함" },
  화성: { essence: "점화, 속도, 집중", strength: "순간 추진력을 극대화하는 힘", shadow: "감정 폭주" },
  영성: { essence: "강렬함, 직감, 반전", strength: "변화를 읽고 기민하게 전환하는 힘", shadow: "기복, 소진" },
  지공: { essence: "비움, 단절, 재정렬", strength: "불필요를 비워 새 질서를 만드는 힘", shadow: "허무감" },
  지겁: { essence: "변동, 긴장, 각성", strength: "안일함을 깨고 리스크 감각을 키우는 힘", shadow: "손실 체감" },
  천마: { essence: "이동, 확장, 전환", strength: "바깥에서 기회를 잡는 힘", shadow: "정착 어려움" },
};

/* 관리자 CMS(운세 콘텐츠 → 자미두수 심화 해설)에서 고친 값을 얹는다(폴백 우선). */
export const PALACE_DEFINITION_MAP = cmsRecord("ziwei-deep", "palace", PALACE_DEFINITION_MAP_DEFAULT);
export const STAR_MEANING_MAP = cmsRecord("ziwei-deep", "star", STAR_MEANING_MAP_DEFAULT);

/* 관리자 CMS 기본값 노출 — app/admin/cms/_lib/base-values.ts 가 AdvancedZiweiSectionV2 경유로 읽는다(재수출 유지). */
export const __cmsZiweiDeepDefaults = {
  palace: PALACE_DEFINITION_MAP_DEFAULT as Record<string, unknown>,
  star: STAR_MEANING_MAP_DEFAULT as Record<string, unknown>,
};

export const BRIGHTNESS_RULES: Record<ZiweiBrightnessBand, { symbol: string; score: number; tone: string; caution: string }> = {
  묘: { symbol: "◎", score: 30, tone: "장점이 선명하게 드러나 주도권을 잡기 좋습니다.", caution: "자신감이 과열되지 않게 리듬을 조절하세요." },
  득: { symbol: "O", score: 22, tone: "노력 대비 성과가 안정적으로 쌓이는 구간입니다.", caution: "익숙함에 머무르면 성장 속도가 둔해질 수 있습니다." },
  리: { symbol: "▲", score: 14, tone: "방향을 잘 잡으면 실전에서 힘을 발휘합니다.", caution: "상황 판단을 놓치면 에너지 분산이 커질 수 있습니다." },
  평: { symbol: "△", score: 6, tone: "관리 방식에 따라 결과 격차가 크게 납니다.", caution: "방치하면 평균 이하로 밀릴 수 있습니다." },
  함: { symbol: "X", score: -12, tone: "힘이 바로 드러나기보다 간접적으로 작동합니다.", caution: "왜곡, 지연, 과잉 반응을 세심히 관리해야 합니다." },
};

export const TRANSFORMATION_RULES: Record<"화록" | "화권" | "화과" | "화기", { score: number; tone: string; caution: string }> = {
  화록: { score: 8, tone: "인연과 기회, 자원이 유입되기 쉬운 흐름", caution: "들어오는 것만 믿고 관리가 느슨해지지 않게 조절해야 합니다" },
  화권: { score: 6, tone: "주도권과 책임이 커지는 흐름", caution: "독단과 과압박을 줄여야 성과가 길게 갑니다" },
  화과: { score: 6, tone: "평판과 인정, 문서 운이 살아나는 흐름", caution: "평판 관리에만 치우치면 실속이 비어질 수 있습니다" },
  화기: { score: -10, tone: "집착과 지연, 오해가 생기기 쉬운 흐름", caution: "피할 영역이 아니라 우선순위로 정비해야 하는 핵심 구간입니다" },
};

const BRIGHTNESS_ORDER: ZiweiBrightnessBand[] = ["묘", "득", "리", "평", "함"];
const BRIGHTNESS_PHRASE: Record<ZiweiBrightnessBand, string> = {
  묘: "가장 밝게(묘)",
  득: "안정적으로(득)",
  리: "상황을 타며(리)",
  평: "무난하게(평)",
  함: "눌린 채(함)",
};
const KOREAN_COUNT_WORD = ["없이", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];

/** 사화가 하나도 걸리지 않은 궁의 문장. 근거 목록에서는 이 문장을 빼고 보여준다. */
export const NO_TRANSFORMATION_LINE = "사화의 직접 자극 없이 차분히 흐르는 궁이라, 타고난 성향과 생활 리듬이 결과를 만듭니다.";

// 한글 조사 자동 선택(받침 유무). 별 이름은 받침이 섞여 있어(태양·무곡 / 자미·천기) 고정 조사를 쓰면 틀린다.
// 한글 음절이 아니면 받침 없는 형태를 쓴다. (app/saju/destiny-bias 의 josa() 와 같은 규칙 — 그 모듈은 콘텐츠 풀 전체를
// 끌고 오므로 여기서는 작은 사본을 둔다.)
function hasBatchim(word: string): boolean {
  const last = String(word || "").trim().slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function josa(word: string, type: "이가" | "은는" | "을를" | "와과"): string {
  const map: Record<typeof type, [string, string]> = { 이가: ["이", "가"], 은는: ["은", "는"], 을를: ["을", "를"], 와과: ["과", "와"] };
  const [withB, withoutB] = map[type];
  return `${word}${hasBatchim(word) ? withB : withoutB}`;
}

function countWord(count: number): string {
  return count >= 0 && count < KOREAN_COUNT_WORD.length ? KOREAN_COUNT_WORD[count] : `${count}개`;
}

export function palaceNameById(id: ZiweiPalaceId | string): string {
  return PALACE_DEFINITION_MAP[id as ZiweiPalaceId]?.name || String(id);
}

/** focus("자기 인식, 위기 반응, 인생 중심 테마")를 문장 조각 "자기 인식·위기 반응·인생 중심 테마"로 바꾼다. */
export function palaceFocusPhrase(id: ZiweiPalaceId): string {
  return String(PALACE_DEFINITION_MAP[id]?.focus || "").split(/\s*,\s*/).filter(Boolean).join("·");
}

export function describePalaceFocus(id: ZiweiPalaceId): string {
  const phrase = palaceFocusPhrase(id);
  return phrase ? `이 궁은 ${josa(phrase, "을를")} 봅니다.` : "이 궁은 삶의 한 영역을 비춥니다.";
}

export function normalizeStrengthBandFromStar(star: ZiweiStarMeta): ZiweiBrightnessBand | "" {
  const strength = String(star?.strength || "").trim();
  if (strength === "왕") return "묘";
  if (["묘", "득", "리", "평", "함"].includes(strength)) return strength as ZiweiBrightnessBand;

  const symbol = String(star?.strengthSymbol || star?.symbol || "").trim();
  if (symbol === "◎") return "묘";
  if (symbol === "O" || symbol === "○") return "득";
  if (symbol === "▲") return "리";
  if (symbol === "△") return "평";
  if (symbol === "X" || symbol === "×") return "함";
  return "";
}

/** 궁에 앉은 별들의 밝기 분포를 숫자 없이 한 문단으로 말한다("별 셋 가운데 둘이 가장 밝게(묘) 앉아…"). */
export function describeBrightnessMix(stars: ZiweiStarMeta[]): string {
  const bands = stars.map((star) => normalizeStrengthBandFromStar(star)).filter(Boolean) as ZiweiBrightnessBand[];
  if (!bands.length) return "별의 밝기가 따로 잡히지 않아, 궁의 관계 흐름과 생활 습관을 중심으로 읽습니다.";

  const counts = new Map<ZiweiBrightnessBand, number>();
  bands.forEach((band) => counts.set(band, (counts.get(band) || 0) + 1));
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1] || BRIGHTNESS_ORDER.indexOf(a[0]) - BRIGHTNESS_ORDER.indexOf(b[0]))[0][0];
  const dominantCount = counts.get(dominant) || 0;
  const total = bands.length;

  const lead = total === 1
    ? `이 궁에 앉은 별 하나는 ${BRIGHTNESS_PHRASE[dominant]} 자리 잡았습니다.`
    : dominantCount === total
      ? `이 궁에 앉은 별 ${countWord(total)} 모두 ${BRIGHTNESS_PHRASE[dominant]} 자리 잡았습니다.`
      : `이 궁에 앉은 별 ${countWord(total)} 가운데 ${josa(countWord(dominantCount), "이가")} ${BRIGHTNESS_PHRASE[dominant]} 자리 잡았습니다.`;
  const shadowBand = BRIGHTNESS_ORDER.slice().reverse().find((band) => band !== dominant && counts.has(band) && (band === "평" || band === "함"));
  const shadow = shadowBand ? ` 다만 ${BRIGHTNESS_PHRASE[shadowBand]} 앉은 별도 있어, ${BRIGHTNESS_RULES[shadowBand].caution}` : "";
  return `${lead} ${BRIGHTNESS_RULES[dominant].tone}${shadow}`;
}

export function buildStarMeaningLine(starNames: string[]): string {
  if (!starNames.length) return "이 궁에는 중심이 되는 주성이 앉지 않아, 맞은편 궁과 삼방사정의 별을 빌려 읽습니다. 그래서 주변 궁의 흐름을 함께 볼수록 정확해집니다.";
  return starNames
    .slice(0, 3)
    .map((name) => {
      const meaning = STAR_MEANING_MAP[name];
      if (!meaning) return `${name}의 고유한 결이 이 궁의 주제와 맞물려 현실의 선택을 이끕니다.`;
      return `${name}의 ${josa(meaning.essence, "이가")} ${meaning.strength}으로 이어집니다.`;
    })
    .join(" ");
}

export function buildEnergyScore(palace: ZiweiPalace): number {
  let score = 50;

  palace.mainStars.forEach((star) => {
    const band = normalizeStrengthBandFromStar(star);
    if (band) score += BRIGHTNESS_RULES[band].score;
  });

  score += palace.luckyStars.length * 5;
  score -= palace.maleficStars.length * 5;

  const allTransforms = [...(palace.fourTransformations || []), ...(palace.incomingFourTransformations || [])];
  allTransforms.forEach((ft) => {
    const label = transformationTypeToLabel(ft.type);
    score += TRANSFORMATION_RULES[label].score;
  });

  if (palace.isEmptyMainStarPalace || palace.isEmpty) score -= 8;

  return Math.max(0, Math.min(100, score));
}

/** 궁의 힘을 한 단어 라벨로(표·배지용). */
export function palaceForceLabel(score: number): string {
  if (score >= 78) return "힘이 왕성한 궁";
  if (score >= 62) return "안정적으로 흐르는 궁";
  if (score >= 46) return "조율이 필요한 궁";
  return "돌봄이 먼저인 궁";
}

/** 궁의 힘을 문장으로(해석 본문용). */
export function palaceForceSentence(score: number): string {
  if (score >= 78) return "지금 이 궁은 힘이 왕성하게 실려 명반을 앞에서 이끕니다.";
  if (score >= 62) return "이 궁은 힘이 안정적으로 실려 꾸준히 제 몫을 합니다.";
  if (score >= 46) return "이 궁은 힘이 오락가락해 상황에 따라 조율이 필요합니다.";
  return "이 궁은 힘이 눌려 있어 생활 습관으로 먼저 돌봐야 합니다.";
}

export function palaceGapLabel(gap: number): string {
  if (gap <= 12) return "작아 균형이 좋습니다";
  if (gap <= 26) return "중간이라 한쪽을 받쳐 줄 필요가 있습니다";
  return "커서 약한 쪽을 먼저 돌보는 것이 우선입니다";
}

export function pickKeywords(palace: ZiweiPalace): string[] {
  const byStars = palace.mainStars.slice(0, 2).map((s) => s.name);
  const byPalace = palace.keywords.slice(0, 3);
  return [...new Set([...byPalace, ...byStars])].slice(0, 5);
}

function buildPalaceSpecialAdvice(palace: ZiweiPalace, score: number): { reality: string; caution: string; action: string } {
  const coreStars = palace.mainStars.map((s) => s.name).slice(0, 2).join("·") || "맞은편 궁에서 빌려온 별";

  if (palace.id === "health") {
    return {
      reality: `질액궁에서는 ${coreStars}의 결이 몸의 리듬으로 번역됩니다. 특정 질환을 단정하기보다 스트레스가 쌓이는 방식, 수면의 깊이, 회복 루틴의 일관성이 실제 컨디션을 좌우합니다.`,
      caution: "피곤 신호를 참는 습관, 불규칙한 수면, 과로 후 몰아 쉬는 패턴이 누적되면 회복 탄력이 떨어질 수 있습니다.",
      action: "수면·식사·움직임의 시간을 고정하고, 주 3회 이상 짧은 회복 루틴을 먼저 확보하세요.",
    };
  }

  if (palace.id === "spouse") {
    return {
      reality: `부부궁에서는 ${coreStars}의 성향만큼 상대를 고르는 기준이 분명해집니다. 끌리는 유형, 관계의 거리감, 갈등 뒤 회복 속도에서 당신의 사랑 패턴이 드러납니다.`,
      caution: "감정이 커질수록 상대를 바꾸려는 압박이나 침묵으로 피하는 반응이 반복되면 관계 피로가 빠르게 올라갈 수 있습니다.",
      action: "갈등의 원인을 성격이 아니라 습관 단위로 나눠 대화하고, 회복 루틴(대화 시간·거리 조절·약속 확인)을 먼저 합의하세요.",
    };
  }

  if (palace.id === "wealth") {
    return {
      reality: `재백궁은 돈을 버는 속도와 지키는 구조를 함께 봐야 힘이 생깁니다. ${josa(coreStars, "은는")} 수익을 만드는 방식과 지출을 관리하는 방식의 균형을 요구합니다.`,
      caution: "들어오는 돈이 늘어도 통제 없는 고정비, 충동 지출, 계약 검토 누락이 겹치면 재무 체감이 약해질 수 있습니다.",
      action: "수입 경로는 넓히되 지출 규칙은 단순하게 고정하고, 큰 계약은 하루 묵힌 뒤 확정하는 편이 안정적입니다.",
    };
  }

  if (palace.id === "career") {
    return {
      reality: `관록궁의 핵심은 직업명보다 일하는 방식입니다. ${coreStars}의 성향은 당신이 성과를 내는 작업 리듬과 협업 구조를 결정합니다.`,
      caution: "역할 경계가 흐리거나 결정 권한이 불분명한 환경에 오래 머물면 실력에 비해 성과가 늦게 보일 수 있습니다.",
      action: "당신의 성공 방식(기획형·실행형·조율형)을 분명히 선언하고, 권한·책임·평가 기준이 맞는 자리로 정렬하세요.",
    };
  }

  if (palace.id === "friends") {
    return {
      reality: `노복궁은 협력자·팀원·거래처·팬·커뮤니티의 운으로 넓혀 읽는 것이 정확합니다. ${coreStars}의 결은 당신이 사람을 모으는 방식과 신뢰를 지키는 방식을 드러냅니다.`,
      caution: "관계 피로가 쌓인 상태에서 무리하게 사람을 늘리면 도움보다 소모가 커질 수 있습니다.",
      action: "도움받을 사람의 유형과 피해야 할 협력자의 패턴을 적어 두고, 협업의 경계(역할·보상·기한)를 선명하게 하세요.",
    };
  }

  if (palace.id === "children") {
    return {
      reality: `자녀궁은 실제 자녀뿐 아니라 창작물·프로젝트·후배 육성의 궁입니다. ${josa(coreStars, "은는")} 당신의 결과물이 세상에 나가는 방식과 완성도를 좌우합니다.`,
      caution: "완벽주의로 공개가 늦어지거나, 반대로 속도만 높아 품질 관리가 약해지는 양극단을 경계해야 합니다.",
      action: "작게라도 정기적으로 공개하는 주기를 만들고, 후배·팀원에게는 기준과 피드백 루프를 함께 제공하세요.",
    };
  }

  if (palace.id === "fortune") {
    return {
      reality: `복덕궁은 성취 뒤에 마음이 쉬는 방식까지 보여줍니다. ${josa(coreStars, "은는")} 당신의 행복감을 되살리는 장치와 번아웃에 대한 민감도를 알려줍니다.`,
      caution: "쉬어도 죄책감이 남는 패턴이 반복되면 내면의 에너지가 바닥나기 쉽습니다.",
      action: "성과와 무관한 휴식 루틴(산책, 취미, 기록)을 고정해 마음의 회복 근육을 먼저 키우세요.",
    };
  }

  const direction = score >= 70 ? "지금은 이 장점을 적극적으로 넓힐 때" : score <= 45 ? "지금은 속도를 늦추고 기초를 다시 정비할 때" : "지금은 균형을 맞추며 성과를 키울 때";
  return {
    reality: `${coreStars}의 결은 ${palaceFocusPhrase(palace.id)} 영역에서 현실의 반응으로 나타납니다.`,
    caution: "좋은 흐름도 관리가 느슨해지면 쉽게 흔들릴 수 있으니 리듬을 유지하는 것이 중요합니다.",
    action: `${direction}입니다. 작은 루틴을 먼저 고정한 뒤 큰 선택을 진행하면 안정감이 올라갑니다.`,
  };
}

export function uniqueList(values: string[]): string[] {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function starNamesWithSymbol(stars: ZiweiStarMeta[]): string[] {
  return stars.map((star) => `${star.name}${star.strengthSymbol || star.symbol || ""}`).filter(Boolean);
}

function oppositePalaceName(palace: ZiweiPalace): string {
  return palace.oppositePalace?.name || palaceNameById(palace.oppositePalaceId);
}

function triadPalaceNames(palace: ZiweiPalace): string[] {
  const names = palace.sanFangSiZheng?.palaceNames?.filter(Boolean);
  if (names && names.length) return names;
  return (palace.triadPalaceIds || []).map((id) => palaceNameById(id));
}

/** 명반이 보여주는 이유를 문장 목록으로(라벨: 값 형태가 아니라 각 줄이 완결된 문장). */
export function buildPalaceEvidenceLines(item: ZiweiPalaceCounselingItem): string[] {
  const palace = item.palace;
  const transformations = item.transformations.filter((line) => line !== NO_TRANSFORMATION_LINE);
  const mainStars = starNamesWithSymbol(palace.mainStars);
  const sideStars = starNamesWithSymbol([...palace.auxiliaryStars, ...palace.maleficStars]);
  const triad = triadPalaceNames(palace);
  return [
    `${palace.name}은 ${palace.earthlyBranch} 자리에 놓인 궁입니다.`,
    mainStars.length
      ? `중심 별로 ${josa(mainStars.join("·"), "이가")} 앉아 있습니다.`
      : "중심이 되는 주성은 앉지 않아, 맞은편 궁의 별을 빌려 읽습니다.",
    sideStars.length
      ? `곁에서는 ${josa(sideStars.join("·"), "이가")} 함께 작용합니다.`
      : "곁에서 힘을 보태거나 흔드는 별은 두드러지지 않습니다.",
    transformations.length
      ? transformations.join(" ")
      : "사화의 직접 자극 없이 차분히 흐르는 궁입니다.",
    `맞은편에는 ${josa(oppositePalaceName(palace), "이가")} 마주 보고, 삼방사정으로 ${josa(triad.join("·") || "이웃한 궁들", "이가")} 함께 얽힙니다.`,
    palaceForceSentence(item.energy),
  ];
}

export function buildPalaceEvidence(item: ZiweiPalaceCounselingItem): ZiweiPalaceEvidence {
  const palace = item.palace;
  const transformations = item.transformations.filter((line) => line !== NO_TRANSFORMATION_LINE);
  return {
    mainStars: starNamesWithSymbol(palace.mainStars),
    auxiliaryStars: [...palace.auxiliaryStars, ...palace.maleficStars].map((star) => star.name),
    transformations,
    oppositePalace: oppositePalaceName(palace),
    relatedPalaces: triadPalaceNames(palace),
    lines: buildPalaceEvidenceLines(item),
  };
}

function rowsForTrack(track: ZiweiCounselingTrackConfig, rows: ZiweiPalaceCounselingItem[]) {
  const byId = Object.fromEntries(rows.map((row) => [row.palace.id, row] as const));
  const primary = track.primaryPalaces.map((id) => byId[id]).filter(Boolean) as ZiweiPalaceCounselingItem[];
  const secondary = track.secondaryPalaces.map((id) => byId[id]).filter(Boolean) as ZiweiPalaceCounselingItem[];
  const ranked = uniqueList([...primary, ...secondary].map((row) => row.palace.id))
    .map((id) => byId[id as ZiweiPalaceId])
    .filter(Boolean)
    .sort((a, b) => b.energy - a.energy) as ZiweiPalaceCounselingItem[];
  return { byId, primary, secondary, ranked };
}

export function trackPalacePriority(track: ZiweiCounselingTrackConfig, palaceId: ZiweiPalaceId): ZiweiTrackPriority {
  if (track.primaryPalaces.includes(palaceId)) return "primary";
  if (track.secondaryPalaces.includes(palaceId)) return "secondary";
  return "supporting";
}

export function trackPriorityLabel(priority: ZiweiTrackPriority): string {
  if (priority === "primary") return "이 주제의 중심 궁";
  if (priority === "secondary") return "함께 볼 궁";
  return "배경으로 참고할 궁";
}

function buildTrackRelevance(track: ZiweiCounselingTrackConfig, item: ZiweiPalaceCounselingItem): string {
  const priority = trackPalacePriority(track, item.palace.id);
  if (priority === "primary") {
    return `${item.palace.name}은 ${track.title} 주제에서 중심이 되는 궁입니다. 이 궁에 앉은 별과 사화, 궁의 힘이 결론의 순서를 직접 정합니다.`;
  }
  if (priority === "secondary") {
    return `${item.palace.name}은 ${track.title} 주제를 보완하는 궁입니다. 중심 궁의 결론이 현실에서 어떻게 작동하는지 확인하는 보조 시선으로 봅니다.`;
  }
  return `${item.palace.name}은 이번 주제의 중심은 아니지만, 명반 전체의 균형을 확인할 때 참고하는 배경 궁입니다.`;
}

function buildTrackManifestation(track: ZiweiCounselingTrackConfig, item: ZiweiPalaceCounselingItem): string[] {
  const palaceFocus = palaceFocusPhrase(item.palace.id);
  const mainStars = item.palace.mainStars.map((star) => star.name).slice(0, 2).join("·") || "맞은편 궁에서 빌려온 별";
  const base = `${track.shortTitle} 주제에서는 ${item.palace.name}이 비추는 ${josa(palaceFocus, "이가")} ${mainStars}의 결을 통해 현실의 행동으로 드러납니다.`;
  const pressure = item.energy >= 62
    ? `잘 작동할 때는 ${palaceFocus}에서 결정이 빨라지고, 주변이 신뢰할 수 있는 기준을 만들기 쉽습니다.`
    : `흔들릴 때는 ${palaceFocus}에서 판단이 늦어지거나 같은 문제를 반복 점검하느라 에너지가 소모될 수 있습니다.`;
  const contextByTrack: Record<ZiweiConsultationTrackId, string> = {
    life: "삶의 큰 선택에서는 빠른 결론보다 당신이 반복해서 고르는 기준을 확인할수록 명반의 장점이 안정적으로 살아납니다.",
    career: "업무에서는 역할·권한·평가 기준이 명확할수록 장점이 선명해지고, 모호한 책임 구조에서는 피로가 빨리 쌓일 수 있습니다.",
    wealth: "돈 문제에서는 수입의 크기보다 관리 규칙, 계약 검토, 손실 한도를 먼저 정할 때 체감 안정감이 올라갑니다.",
    love: "관계에서는 감정의 크기보다 회복 방식과 경계 합의가 오래 가는 힘을 만들며, 침묵이나 압박이 반복될 때 소모가 커집니다.",
    relationships: "사람 사이에서는 친밀감보다 역할과 기대치를 먼저 맞출 때 신뢰가 쌓이고, 애매한 약속은 관계 피로로 번지기 쉽습니다.",
    family: "가족 안에서는 책임을 떠안는 속도와 정서적 거리를 함께 보아야 하며, 돌봄과 독립의 기준을 나누면 부담이 줄어듭니다.",
    health: "생활에서는 몸의 신호를 성과보다 먼저 확인할 때 리듬이 무너지지 않습니다. 이 해석은 의학적 진단이 아니라 생활 패턴 조언입니다.",
    timing: "시기 판단에서는 넓힐 일과 보수적으로 다룰 일을 분리해야 합니다. 아직 흐름이 잡히지 않은 영역은 타고난 명반의 선택 기준까지만 봅니다.",
  };
  return [base, pressure, contextByTrack[track.key]];
}

function buildTrackSpecificAdvice(track: ZiweiCounselingTrackConfig, item: ZiweiPalaceCounselingItem): string[] {
  const palaceName = item.palace.name;
  const focus = palaceFocusPhrase(item.palace.id);
  const adviceByTrack: Record<ZiweiConsultationTrackId, string[]> = {
    life: [
      `${palaceName}이 비추는 ${josa(focus, "을를")} 하루 선택 기준 하나로 적어 두면 반복 패턴을 더 빨리 알아차릴 수 있습니다.`,
      "큰 결정을 앞두면 강하게 끌리는 선택과 오래 버틸 수 있는 선택을 따로 비교하세요.",
    ],
    career: [
      `${palaceName}이 강하게 반응하는 업무 조건을 역할·권한·평가 기준으로 나눠 확인하세요.`,
      "새 제안을 받을 때는 직함보다 실제 책임 범위와 회복 가능한 일정인지 먼저 보세요.",
    ],
    wealth: [
      `${palaceName}의 흐름을 수입, 지출, 보유, 위험 한도 네 칸으로 나누어 관리하면 누수를 줄일 수 있습니다.`,
      "큰돈이 오가는 선택에서는 기대 수익보다 손실이 났을 때 멈출 기준을 먼저 정하세요.",
    ],
    love: [
      `${palaceName}에서 올라오는 감정은 바로 결론 내리기보다 원하는 거리감과 회복 방식을 말로 확인하는 편이 좋습니다.`,
      "관계 대화에서는 상대를 평가하기보다 당신에게 필요한 시간, 약속, 표현을 구체적으로 말하세요.",
    ],
    relationships: [
      `${palaceName}의 사람운은 호감보다 역할 합의가 먼저 잡힐 때 안정됩니다.`,
      "도움을 주기 전에는 당신이 맡을 범위와 멈출 기준을 한 문장으로 정해 두세요.",
    ],
    family: [
      `${palaceName}의 책임 흐름은 돌봄과 독립을 함께 세울 때 무겁게 굳지 않습니다.`,
      "가족 대화에서는 마음의 옳고 그름보다 누가, 언제, 어디까지 맡을지를 먼저 나누세요.",
    ],
    health: [
      `${palaceName}의 신호는 컨디션을 단정하기보다 수면, 식사, 이동, 감정 반응의 리듬으로 점검하세요.`,
      "불편함이 지속되거나 강해지면 생활 조언에 머물지 말고 전문가 상담을 함께 고려하세요.",
    ],
    timing: [
      `${palaceName}이 올해 흐름에서 강조될 때는 새로 벌릴 일과 정리할 일을 한 목록에 섞지 않는 편이 안전합니다.`,
      "지금 잡힌 흐름의 범위 안에서만 기회와 부담을 나누고, 특정 사건은 단정하지 마세요.",
    ],
  };
  return adviceByTrack[track.key];
}

function buildPalaceTimingInterpretation(chart: ZiweiDeepChart, track: ZiweiCounselingTrackConfig, item: ZiweiPalaceCounselingItem): string {
  const annual = chart.annualFlow;
  if (annual?.keyPalaces?.includes(item.palace.id)) {
    return `${annual.yearLabel}년 흐름에서 ${item.palace.name}이 핵심 궁으로 잡혀, ${track.shortTitle} 주제에서 이 궁의 선택 기준이 더 자주 시험될 수 있습니다.`;
  }
  if (track.key === "timing" && !annual) {
    return "올해 흐름은 생년월일시만으로는 단정하기 어려워 특정 연도의 사건을 말하지 않습니다. 타고난 명반의 강한 궁과 돌봐야 할 궁을 기준으로 선택의 순서만 제시합니다.";
  }
  return "올해 흐름에서 이 궁이 따로 강조되지는 않아, 타고난 명반을 기준으로 읽습니다.";
}

export function buildPalaceReading(chart: ZiweiDeepChart, track: ZiweiCounselingTrackConfig, item: ZiweiPalaceCounselingItem): ZiweiTrackPalaceReading {
  const priority = trackPalacePriority(track, item.palace.id);
  const evidence = buildPalaceEvidence(item);
  const limitations: string[] = [];
  if (item.isBorrowed) limitations.push("이 궁에는 중심 별이 앉지 않아 맞은편 궁의 별을 빌려 읽었습니다.");
  if (!item.palace.fourTransformations.length && !item.palace.incomingFourTransformations.length) limitations.push("이 궁에는 사화가 직접 걸리지 않아 차분히 흐르는 궁으로 읽었습니다.");
  if (!chart.annualFlow) limitations.push("올해 흐름은 대한(10년 단위) 기준으로 읽었고, 특정 시기의 사건은 단정하지 않았습니다.");

  const definition = PALACE_DEFINITION_MAP[item.palace.id]?.definition || item.definition;
  return {
    palaceId: item.palace.id,
    palaceName: item.palace.name,
    headline: `${item.palace.name}은 ${track.shortTitle} 주제에서 ${priority === "primary" ? "가장 먼저 볼 축" : priority === "secondary" ? "현실 적용을 보완하는 축" : "전체 균형을 확인하는 축"}입니다.`,
    customerMeaning: `${item.palace.name}은 ${definition}입니다. ${track.title} 주제에서는 ${josa(palaceFocusPhrase(item.palace.id), "이가")} 실제 선택 기준으로 어떻게 드러나는지 봅니다.`,
    corePattern: `${item.starMechanics} ${item.brightness}`,
    strengths: [item.strengths, item.assists],
    challenges: [item.cautions, item.malefics],
    realLifeManifestations: buildTrackManifestation(track, item),
    crossPalaceInterpretation: `맞은편의 ${oppositePalaceName(item.palace)}과 삼방사정의 ${josa(triadPalaceNames(item.palace).join("·") || "이웃한 궁들", "을를")} 함께 보면, 이 궁은 단독 결론보다 관계망 속에서 더 정확하게 읽힙니다.`,
    selectedTrackRelevance: buildTrackRelevance(track, item),
    timingInterpretation: buildPalaceTimingInterpretation(chart, track, item),
    practicalAdvice: [item.advice, ...buildTrackSpecificAdvice(track, item), item.prescription],
    evidence,
    dataLimitations: limitations,
    priority,
  };
}

const UNCERTAIN_LINE = "이 부분은 생년월일시만으로는 단정하기 어렵습니다.";

function describeMajorPeriods(chart: ZiweiDeepChart): string {
  const periods = chart.majorPeriods || [];
  if (!periods.length) return `대한(10년 단위)의 구간은 ${UNCERTAIN_LINE}`.replace("은 이 부분은", "은");
  const first = palaceNameById(periods[0].palaceId);
  const last = palaceNameById(periods[periods.length - 1].palaceId);
  return `대한(10년 단위)은 ${first}에서 시작해 ${last}까지 열두 궁을 차례로 지나며, 지금 나이 구간의 대한이 올해 흐름의 큰 배경이 됩니다.`;
}

export function buildTrackAnalysis(
  chart: ZiweiDeepChart,
  track: ZiweiCounselingTrackConfig,
  rows: ZiweiPalaceCounselingItem[],
  labels: Pick<AdvancedZiweiCopy, "chapterTitles">,
): ZiweiTrackAnalysis {
  const { primary, secondary, ranked } = rowsForTrack(track, rows);
  const strongest = ranked[0] || rows[0];
  const second = ranked[1] || strongest;
  const third = ranked[2] || second;
  const weakest = [...primary, ...secondary].sort((a, b) => a.energy - b.energy)[0] || [...rows].sort((a, b) => a.energy - b.energy)[0];
  const keyPalaces = uniqueList([...track.primaryPalaces, ...track.secondaryPalaces]).map((id) => rows.find((row) => row.palace.id === id)).filter(Boolean) as ZiweiPalaceCounselingItem[];
  const keyPatterns: ZiweiTrackPattern[] = [strongest, second, third].filter(Boolean).map((item, index) => ({
    title: index === 0 ? `${item.palace.name}이 여는 ${track.shortTitle}의 핵심 장점` : index === 1 ? `${item.palace.name}에서 확인되는 보완 조건` : `${item.palace.name}이 알려주는 반복 패턴`,
    interpretation: `${item.palace.name}은 ${palaceForceLabel(item.energy)}입니다. ${buildTrackRelevance(track, item)} ${item.reality}`,
    evidence: buildPalaceEvidenceLines(item),
    palaceIds: [item.palace.id],
  }));

  const palaceReadings = rows.map((item) => buildPalaceReading(chart, track, item));
  const trackPalaceNames = keyPalaces.map((item) => item.palace.name).join("·");
  const summary = `${track.title} 주제에서는 ${josa(trackPalaceNames || "명반 전체", "을를")} 우선 봅니다. 당신의 명반은 ${strongest?.palace.name || "강한 궁"}의 장점을 살리되, ${weakest?.palace.name || "돌봐야 할 궁"}의 피로 신호를 생활 규칙으로 조절할 때 안정적으로 읽힙니다.`;
  const annual = chart.annualFlow;
  const hasReadingGap = palaceReadings.length !== 12 || !keyPatterns.every((pattern) => pattern.evidence.length) || !keyPalaces.length;
  const qualityWarnings = hasReadingGap ? [UNCERTAIN_LINE] : [];
  const annualPalaceNames = annual ? annual.keyPalaces.map((id) => rows.find((row) => row.palace.id === id)?.palace.name || palaceNameById(id)).join("·") : "";
  const timingEvidence = annual
    ? [
        `${annual.yearLabel}년 흐름을 기준으로 읽었습니다.`,
        `올해는 ${josa(annualPalaceNames, "이가")} 특히 강조되는 궁입니다.`,
        ...annual.notes.slice(0, 3),
      ]
    : [];

  const timing = annual
    ? {
        available: true,
        currentTheme: `${annual.yearLabel}년에는 ${annualPalaceNames}의 흐름이 강조됩니다.`,
        opportunities: annual.keyPalaces.map((id) => rows.find((row) => row.palace.id === id)).filter(Boolean).slice(0, 3).map((item) => `${item!.palace.name}에서는 ${item!.strengths}`),
        cautions: annual.keyPalaces.map((id) => rows.find((row) => row.palace.id === id)).filter(Boolean).slice(0, 3).map((item) => `${item!.palace.name}에서는 ${item!.cautions}`),
        recommendedActions: annual.keyPalaces.map((id) => rows.find((row) => row.palace.id === id)).filter(Boolean).slice(0, 3).map((item) => item!.advice),
        evidence: timingEvidence,
      }
    : {
        available: false,
        currentTheme: "올해 흐름은 생년월일시만으로는 단정하기 어려워, 대한(10년 단위)과 타고난 명반을 기준으로 읽었습니다.",
        opportunities: ["타고난 명반에서 강한 궁을 먼저 활용하고, 돌봐야 할 궁은 생활 규칙으로 받쳐 주는 방식이 안전합니다."],
        cautions: ["현재 연도의 특정 사건이나 확정적인 결과는 말하지 않습니다."],
        recommendedActions: [track.timingFocus],
        evidence: ["올해 흐름은 대한(10년 단위) 기준으로 읽었습니다.", describeMajorPeriods(chart)],
      };
  const strongestTrackAdvice = strongest ? buildTrackSpecificAdvice(track, strongest) : [];
  const weakestTrackAdvice = weakest ? buildTrackSpecificAdvice(track, weakest) : [];
  const primaryPalaceNames = track.primaryPalaces.map((id) => rows.find((row) => row.palace.id === id)?.palace.name || palaceNameById(id)).join("·");

  const consultationFlow: ZiweiTrackFlowStage[] = [
    {
      stage: "1",
      title: labels.chapterTitles.conclusion,
      content: `${track.title} 주제의 결론은 ${strongest?.palace.name || "핵심 궁"}의 힘을 먼저 쓰고 ${weakest?.palace.name || "돌봐야 할 궁"}의 반복 피로를 줄이는 것입니다. ${summary}`,
      evidence: strongest ? buildPalaceEvidenceLines(strongest) : [],
      actions: [`${strongest?.palace.name || "강한 궁"}과 관련된 선택을 이번 주 우선순위로 올리세요.`, `${weakest?.palace.name || "돌봐야 할 궁"}의 과부하 신호를 하루 한 번 기록하세요.`],
    },
    {
      stage: "2",
      title: labels.chapterTitles.whyChart,
      content: `${track.interpretationPriorities.join(" → ")} 순서로 읽으면 이번 주제의 초점이 흐려지지 않습니다. 별과 궁의 이름은 이유를 설명하기 위해 남기고, 실제 판단은 행동 기준으로 옮겨 드립니다.`,
      evidence: keyPalaces.flatMap((item) => buildPalaceEvidenceLines(item)).slice(0, 8),
      actions: track.keyQuestions.slice(0, 2),
    },
    {
      stage: "3",
      title: labels.chapterTitles.realLife,
      content: `${strongest?.reality || "핵심 궁의 현실 반응을 확인합니다."} ${second?.reality || ""}`,
      evidence: [strongest?.palace.name, second?.palace.name].filter(Boolean) as string[],
      actions: [track.actionGuideType, ...strongestTrackAdvice.slice(0, 1), weakest?.advice || "돌봐야 할 궁의 루틴을 먼저 세우세요."],
    },
    {
      stage: "4",
      title: labels.chapterTitles.repeatedPattern,
      content: `${strongest?.palace.name || "강한 궁"}이 빠르게 앞서가고 ${weakest?.palace.name || "돌봐야 할 궁"}이 뒤에서 피로를 만드는 구도가 반복될 수 있습니다. 이 차이는 좋고 나쁨보다 속도 차이로 읽어야 합니다.`,
      evidence: [strongest ? `${strongest.palace.name}은 ${palaceForceLabel(strongest.energy)}` : "", weakest ? `${weakest.palace.name}은 ${palaceForceLabel(weakest.energy)}` : ""].filter(Boolean),
      actions: ["강한 궁은 넓힐 기준으로, 약한 궁은 점검표로 분리하세요."],
    },
    {
      stage: "5",
      title: labels.chapterTitles.currentTiming,
      content: timing.currentTheme,
      evidence: timing.evidence,
      actions: [...timing.opportunities.slice(0, 1), ...timing.cautions.slice(0, 1)],
    },
    {
      stage: "6",
      title: labels.chapterTitles.actionAdvice,
      content: `${track.actionGuideType} 이 조언은 명반의 중심 궁과 돌봐야 할 궁을 연결해 현실에서 바로 점검할 수 있게 정리했습니다.`,
      evidence: keyPalaces.slice(0, 3).map((item) => (item.keywords.length ? `${item.palace.name}에서는 ${item.keywords.join(", ")} 키워드가 반복됩니다.` : `${item.palace.name}의 키워드는 생년월일시만으로는 뚜렷하게 잡히지 않습니다.`)),
      actions: [strongest?.advice, ...strongestTrackAdvice.slice(0, 2), ...weakestTrackAdvice.slice(0, 1)].filter(Boolean) as string[],
    },
    {
      stage: "7",
      title: labels.chapterTitles.closing,
      content: `${track.title} 주제의 흐름은 당신을 규정하기보다, 강한 축을 어떻게 쓰고 약한 축을 어떻게 돌볼지 알려줍니다. 지금은 ${strongest?.palace.name || "강점"}을 믿되 ${weakest?.palace.name || "조절점"}을 방치하지 않는 태도가 중요합니다.`,
      evidence: track.keyQuestions,
      actions: track.keyQuestions.slice(0, 3),
    },
  ];

  return {
    selectedTrack: track,
    executiveSummary: {
      headline: `${track.shortTitle} 주제의 핵심은 ${strongest?.palace.name || "중심 궁"} 활용과 ${weakest?.palace.name || "돌봐야 할 궁"} 조율입니다.`,
      summary,
      keyPatterns,
    },
    consultationFlow,
    palaceReadings,
    timing,
    actionPlan: {
      start: [strongest?.advice || "강한 궁의 장점을 한 가지 행동으로 옮기세요.", ...strongestTrackAdvice.slice(0, 1), `${primaryPalaceNames} 관련 선택을 먼저 정리하세요.`],
      reduce: [weakest?.cautions || "피로가 누적되는 궁의 반복 반응을 줄이세요.", ...weakestTrackAdvice.slice(0, 1), ...track.cautionRules.slice(0, 1)],
      maintain: [strongest?.prescription || "강점을 유지할 작은 루틴을 고정하세요.", "명반이 말하는 이유와 실제 행동을 나눠서 점검하세요.", "앞으로 3개월 동안 같은 기준을 반복 점검하세요."],
      reflectionQuestions: track.keyQuestions.slice(0, 3),
    },
    dataWarnings: [
      ...qualityWarnings,
      ...(annual ? [] : ["올해 흐름은 대한(10년 단위) 기준으로 읽었고, 특정 시기의 사건은 단정하지 않았습니다."]),
      ...keyPalaces.filter((item) => item.isBorrowed).map((item) => `${item.palace.name}은 중심 별이 앉지 않아 맞은편 궁의 별을 빌려 읽었습니다.`),
    ],
  };
}

/** 12궁 각각의 기본 해석 행(컴포넌트의 useMemo 본문을 순수 함수로 뽑은 것). */
export function buildPalaceCounseling(chart: ZiweiDeepChart): ZiweiPalaceCounselingItem[] {
  return chart.palaces.map((palace) => {
    const energy = buildEnergyScore(palace);
    const keywords = pickKeywords(palace);
    const bandSummary = describeBrightnessMix(palace.allStars);

    const assistNames = palace.auxiliaryStars.map((s) => s.name);
    const maleficNames = palace.maleficStars.map((s) => s.name);
    const mainNames = palace.mainStars.map((s) => s.name);
    const transformPairs = [...(palace.fourTransformations || []), ...(palace.incomingFourTransformations || [])].map((ft) => ({
      label: transformationTypeToLabel(ft.type),
      starName: ft.starName,
    }));

    const assistLine = assistNames.length
      ? `${josa(assistNames.join("·"), "이가")} 이 궁의 약점을 보완하며 사람·문서·자원의 형태로 힘을 보탭니다.`
      : "곁에서 힘을 보태는 보조성은 두드러지지 않지만, 생활 습관을 세우면 궁의 기본 힘이 살아납니다.";

    const maleficLine = maleficNames.length
      ? `${josa(maleficNames.join("·"), "은는")} 사건성과 속도를 높입니다. 나쁜 신호로만 볼 필요는 없고, 위험을 관리해야 하는 가속 장치로 읽습니다.`
      : "급격한 충돌 신호는 약한 편이라, 꾸준함이 성패를 가릅니다.";

    const transformLine = transformPairs.length
      ? transformPairs.map(({ label, starName }) => `${label}이 걸린 ${josa(starName, "이가")} ${josa(TRANSFORMATION_RULES[label].tone, "을를")} 만듭니다.`)
      : [NO_TRANSFORMATION_LINE];

    const special = buildPalaceSpecialAdvice(palace, energy);
    const strongestStar = palace.strengthSummary.strongestStars[0]?.name || mainNames[0] || "";
    const weakestStar = palace.strengthSummary.weakStars[0]?.name || "";
    const borrowed = palace.isEmptyMainStarPalace || palace.isEmpty;
    const focus = palaceFocusPhrase(palace.id);
    const definition = PALACE_DEFINITION_MAP[palace.id]?.definition || "";
    const name = PALACE_DEFINITION_MAP[palace.id]?.name || palace.name;
    const stance = energy >= 70 ? "지금 밀어붙여도 좋은 궁" : energy <= 45 ? "속도를 늦추고 다시 정비할 궁" : "균형을 맞추며 조율할 궁";

    return {
      palace,
      energy,
      keywords,
      definition,
      starMechanics: buildStarMeaningLine(mainNames),
      brightness: bandSummary,
      assists: assistLine,
      malefics: maleficLine,
      transformations: transformLine,
      isBorrowed: borrowed,
      reality: special.reality,
      strengths: strongestStar
        ? `${strongestStar}의 장점이 살아날 때 ${focus}에서 안정적인 성과와 신뢰를 만듭니다.`
        : `빌려온 별의 장점이 살아날 때 ${focus}에서 안정적인 성과와 신뢰를 만듭니다.`,
      cautions: weakestStar
        ? `${weakestStar}이 눌린 쪽의 피로 신호를 방치하면 작은 오해가 쌓여 방향을 잃기 쉽습니다. ${special.caution}`
        : `약하게 앉은 별은 없지만, 피로 신호를 방치하면 작은 오해가 쌓여 방향을 잃기 쉽습니다. ${special.caution}`,
      advice: special.action,
      prescription: `${name}은 ${stance}입니다.`,
    };
  });
}

export function buildOverallCounselingSummary(rows: ZiweiPalaceCounselingItem[], strongTop3: ZiweiPalaceCounselingItem[], weakTop3: ZiweiPalaceCounselingItem[]): string[] {
  const strongest = strongTop3[0] || rows[0];
  const weakest = weakTop3[0] || rows[rows.length - 1];
  if (!strongest || !weakest) return [];
  const repeatedKeywords = rows
    .flatMap((row) => row.keywords)
    .slice(0, 8)
    .join(", ");

  return [
    `가장 선명하게 열린 궁은 ${strongest.palace.name}입니다. ${palaceForceSentence(strongest.energy)} 주성과 보조성의 배열이 상승 동력을 만듭니다.`,
    `가장 먼저 돌봐야 할 궁은 ${weakest.palace.name}입니다. 이 궁은 약점이 아니라 생활 설계를 바꾸면 크게 회복되는 핵심 지점입니다.`,
    `지금 당신의 명반에서 반복되는 키워드는 ${repeatedKeywords || "관계, 일, 회복"}입니다.`,
    "성공의 문은 왕성한 궁의 추진력을, 조율이 필요한 궁의 맞은편 궁·삼방사정과 연결할 때 안정적으로 열립니다.",
    "관계에서는 감정의 강도보다 경계와 역할을 먼저 합의할수록 운의 소모를 줄일 수 있습니다.",
    "지금 가장 먼저 정리할 일은 돌봐야 할 궁에 걸린 사화와 맞은편 궁의 신호를 생활 규칙 하나로 고정하는 것입니다.",
  ];
}

export function buildPalaceLinks(rows: ZiweiPalaceCounselingItem[], titles: string[]): ZiweiPalaceLinkInsight[] {
  const byId = Object.fromEntries(rows.map((row) => [row.palace.id, row] as const));
  const pairs: Array<{ left: ZiweiPalaceId; right: ZiweiPalaceId; title: string; lens: string }> = [
    { left: "ming", right: "career", title: titles[0], lens: "타고난 성향이 커리어의 성공 방식으로 연결되는 축" },
    { left: "ming", right: "spouse", title: titles[1], lens: "자기 기질이 관계 패턴으로 드러나는 축" },
    { left: "wealth", right: "career", title: titles[2], lens: "일의 성과가 수입 구조로 번역되는 축" },
    { left: "spouse", right: "fortune", title: titles[3], lens: "관계의 안정이 내면의 평온으로 이어지는 축" },
    { left: "property", right: "wealth", title: titles[4], lens: "기반 자산이 현금흐름의 안정으로 이어지는 축" },
    { left: "friends", right: "career", title: titles[5], lens: "협업 네트워크가 커리어를 넓히는 축" },
  ];

  return pairs
    .map((pair) => {
      const left = byId[pair.left];
      const right = byId[pair.right];
      if (!left || !right) return null;
      const gap = Math.abs(left.energy - right.energy);
      const state = gap <= 12 ? "균형형" : left.energy > right.energy ? `${left.palace.name} 주도형` : `${right.palace.name} 주도형`;
      return {
        ...pair,
        state,
        summary: `${pair.lens}입니다. 지금은 ${state} 흐름이고, 두 궁의 힘 차이는 ${palaceGapLabel(gap)}. 차이가 클수록 약한 쪽을 생활 습관으로 받쳐 줄 필요가 있습니다.`,
      };
    })
    .filter(Boolean) as ZiweiPalaceLinkInsight[];
}

export function buildSihuaInsights(chart: ZiweiDeepChart, rows: ZiweiPalaceCounselingItem[]): string[] {
  const byType = [
    { label: "화록", star: chart.sihua.hualu },
    { label: "화권", star: chart.sihua.huaquan },
    { label: "화과", star: chart.sihua.huake },
    { label: "화기", star: chart.sihua.huaji },
  ].filter((row) => Boolean(row.star)) as Array<{ label: "화록" | "화권" | "화과" | "화기"; star: string }>;

  return byType.map((row) => {
    const affected = rows
      .filter((item) => item.transformations.some((line) => line.includes(row.label)))
      .map((item) => item.palace.name)
      .slice(0, 3)
      .join("·");
    const rule = TRANSFORMATION_RULES[row.label];
    return `${row.label}이 걸린 ${josa(row.star, "은는")} ${josa(rule.tone, "을를")} 만듭니다. ${affected ? `지금은 ${affected}에서 특히 체감되기 쉽습니다.` : "어느 궁에서 드러날지는 유동적이니, 관계나 일정이 바뀔 때 반응을 살펴보세요."} ${rule.caution}.`;
  });
}

export function buildBorrowedStarInsights(rows: ZiweiPalaceCounselingItem[]): string[] {
  return rows
    .filter((item) => item.isBorrowed)
    .map((item) => `${item.palace.name}에는 중심 별이 앉지 않아 맞은편 궁의 별을 빌려 읽습니다. 타고난 힘이 없다는 뜻이 아니라, 환경·관계·시기를 맞출수록 장점이 살아나는 궁입니다. 초반보다 후반에 힘이 붙기 쉬우니 무리한 직진보다 조건을 먼저 맞추세요.`);
}
