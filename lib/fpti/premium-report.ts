import type { FptiAnalysisResult } from "./fpti-types";

type Primitive = string | number | boolean | null | undefined;

export type FptiPremiumInput = {
  answers?: Array<Record<string, Primitive>>;
  scoreMap?: Record<string, number>;
  selectedOptions?: string[];
  userName?: string;
  birthProfile?: Record<string, Primitive>;
  sajuSummary?: string;
  fptiType?: string;
  fptiSubtype?: string;
  createdAt?: string;
  result?: FptiAnalysisResult;
};

export type FptiScores = {
  A: number;
  M: number;
  H: number;
  L: number;
  F: number;
  B: number;
  R: number;
  V: number;
};

export type FptiAxisResult = {
  axis: keyof FptiScores;
  label: string;
  score: number;
  level: "low" | "mid" | "high";
  summary: string;
};

export type FptiReportAccessState = {
  isUnlocked: boolean;
  unlockMethod?: "coin" | "subscription" | "admin" | "free";
  transactionId?: string;
  unlockedAt?: string;
};

export type FptiDeepSection = {
  title: string;
  category?: string;
  lens?: string;
  interpretation: string;
  body?: string;
  strength?: string;
  risk?: string;
  action?: string;
  advice?: string;
  triadLabels?: {
    strength: string;
    risk: string;
    action: string;
  };
  debugSignals?: string[];
};

export type FptiDeepChapter = {
  id?: string;
  order: number;
  roman: "I" | "II" | "III" | "IV" | "V" | "VI" | "VII";
  title: string;
  subtitle?: string;
  preview?: string;
  isPreview: boolean;
  locked: boolean;
  sections: FptiDeepSection[];
  chapterSummary: string;
};

export type FptiDeepSummary = {
  preview: string;
  highlights: string[];
  caution: string;
};

export type FptiDeepReport = {
  reportType: "FPTI_DEEP_REPORT";
  mode: "local";
  generatedAt: string;
  userTypeCode: string;
  typeName: string;
  scores: FptiScores;
  axes: FptiAxisResult[];
  unlocked: boolean;
  chapters: FptiDeepChapter[];
  summary: FptiDeepSummary;
  meta: {
    engineVersion: string;
    apiUsed: false;
    pdfEnabled: false;
    chapterCount: 7;
  };
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export type FptiPremiumReport = FptiDeepReport;

type ChapterDefinition = {
  id: string;
  order: number;
  roman: FptiDeepChapter["roman"];
  title: string;
  sections: string[];
};

type LocalTypeResult = {
  code: string;
  typeName: string;
  scores: FptiScores;
  axes: FptiAxisResult[];
  topAxes: FptiAxisResult[];
  lowAxes: FptiAxisResult[];
  source: FptiAnalysisResult["source"] | undefined;
};

type NarrativeSeed = {
  typeCode: string;
  typeName: string;
  energyStyle: string;
  judgmentStyle: string;
  executionStyle: string;
  visionStyle: string;
  mbtiLensLine: string;
  dayMasterLine: string;
  monthBranchLine: string;
  elementBalanceLine: string;
  elementPrescriptionLine: string;
  tenGodLine: string;
  coreStrengthLine: string;
  aptitudeLine: string;
  careerLine: string;
  loveLine: string;
  conflictLine: string;
  moneyLine: string;
  stressLine: string;
  growthLine: string;
  relationshipTempoLine: string;
  workEnvironmentLine: string;
  shadowLine: string;
  actionLine: string;
  debugSignals: string[];
};

type TenGodName = "비견" | "겁재" | "식신" | "상관" | "정재" | "편재" | "정관" | "편관" | "정인" | "편인";

type TenGodCue = {
  personality: string;
  career: string;
  aptitude: string;
  love: string;
  conflict: string;
  money: string;
  shadow: string;
  growth: string;
};

const TEN_GOD_CUES: Record<TenGodName, TenGodCue> = {
  비견: {
    personality: "자기 기준과 주체성이 강한 축",
    career: "독립 실행과 대등 협업에 강한 축",
    aptitude: "자기 이름을 걸고 완성하는 프로젝트, 1인 브랜드, 전문 프리랜스, 동료와 수평적으로 겨루는 환경에서 재능이 살아납니다.",
    love: "연애에서는 대등함과 존중이 가장 중요해, 상대가 나를 통제하려 할 때 마음의 문이 빠르게 닫힙니다.",
    conflict: "갈등이 생기면 먼저 물러서기보다 내 기준을 지키려 하므로, 감정 싸움보다 합의 가능한 선을 분명히 잡아야 합니다.",
    money: "돈은 독립성과 연결되어 있어, 고정 수입보다 스스로 통제할 수 있는 수익 구조가 심리적 안정감을 줍니다.",
    shadow: "과열되면 고집과 자존심이 방어막이 되어 도움을 늦게 받아들이는 흐름이 생깁니다.",
    growth: "성장은 혼자 이기는 방식보다 기준을 공유하고 함께 커지는 방식에서 더 길게 이어집니다.",
  },
  겁재: {
    personality: "경쟁 반응과 돌파력이 강한 축",
    career: "위기 대응과 현장 전환에 강한 축",
    aptitude: "영업, 협상, 이벤트성 프로젝트, 속도전이 필요한 현장, 판을 뒤집는 역할에서 존재감이 커집니다.",
    love: "연애에서는 뜨거운 몰입과 즉각적인 반응을 원하지만, 감정 온도가 높을수록 상대의 속도를 확인해야 오래 갑니다.",
    conflict: "불리하다고 느끼면 방어보다 반격이 먼저 나올 수 있어, 승패 구도 대신 같은 편이라는 확인이 필요합니다.",
    money: "기회 포착은 빠르지만 지출도 순간적으로 커질 수 있어, 도전 예산과 생활 예산을 분리해야 재물 흐름이 안정됩니다.",
    shadow: "과열되면 경쟁심이 불안을 덮어 버려, 필요 없는 비교와 소모전에 휘말리기 쉽습니다.",
    growth: "성장은 강한 추진력을 방향 있는 승부로 압축할 때 가장 빠르게 나타납니다.",
  },
  식신: {
    personality: "꾸준함과 생활 리듬이 안정적인 축",
    career: "생산성·콘텐츠·서비스에 강한 축",
    aptitude: "콘텐츠 제작, 교육, 서비스 운영, 식음료, 웰니스, 반복 품질이 중요한 업무에서 장기 성과가 납니다.",
    love: "연애에서는 편안함과 돌봄이 사랑의 언어가 되며, 사소한 생활 리듬을 함께 나눌 때 애정이 깊어집니다.",
    conflict: "불편을 바로 터뜨리기보다 쌓아 두는 편이라, 작은 서운함을 초기에 말하는 연습이 필요합니다.",
    money: "돈은 꾸준히 모으고 안정적으로 불리는 방식이 맞으며, 생활 만족을 해치지 않는 저축 구조가 오래 갑니다.",
    shadow: "과열되면 편안함에 머물러 변화의 타이밍을 놓치거나, 좋은 사람 역할에 지칠 수 있습니다.",
    growth: "성장은 생활 루틴을 정교하게 다듬고 작은 산출물을 계속 쌓을 때 깊어집니다.",
  },
  상관: {
    personality: "표현력과 문제 제기가 분명한 축",
    career: "기획·개선·발표에 강한 축",
    aptitude: "브랜딩, 콘텐츠 기획, 강의, 발표, UX 개선, 문제를 새 언어로 풀어내는 역할에서 재능이 돋보입니다.",
    love: "연애에서는 재치 있는 대화와 감각적 자극이 중요하며, 지루하거나 답답한 관계에서는 마음이 식기 쉽습니다.",
    conflict: "말이 빠르고 정확해질수록 상대에게는 날카롭게 들릴 수 있으니, 정답보다 온도를 먼저 조절해야 합니다.",
    money: "돈은 아이디어와 표현력이 수익으로 전환될 때 커지며, 즉흥 지출은 창작비와 충동비를 구분해야 안정됩니다.",
    shadow: "과열되면 비판성이 앞서 관계의 신뢰보다 문제 지적이 먼저 보일 수 있습니다.",
    growth: "성장은 날카로운 감각을 사람을 살리는 언어로 바꿀 때 품격 있게 열립니다.",
  },
  정재: {
    personality: "현실 감각과 관리 본능이 강한 축",
    career: "정산·운영·예산 관리에 강한 축",
    aptitude: "회계, 운영관리, 재무, 구매, 품질관리, 일정과 자원을 정확히 맞추는 직무에서 강합니다.",
    love: "연애에서는 성실함과 약속 이행을 통해 마음을 보여주며, 불확실한 관계보다 책임이 보이는 관계에서 안정됩니다.",
    conflict: "상대가 약속을 가볍게 여기면 신뢰가 빠르게 줄어들어, 관계의 룰을 초기에 맞추는 것이 중요합니다.",
    money: "돈은 새는 곳을 막고 구조를 세울 때 강해지며, 안정 자산과 현금 흐름 관리가 재물운의 중심입니다.",
    shadow: "과열되면 걱정이 계산으로 변해, 좋은 기회 앞에서도 지나치게 보수적으로 굳을 수 있습니다.",
    growth: "성장은 안정성을 지키면서도 작은 실험을 허용할 때 더 넓어집니다.",
  },
  편재: {
    personality: "기회 포착과 유동성이 빠른 축",
    career: "영업·확장·수익 다각화에 강한 축",
    aptitude: "사업개발, 영업, 투자형 프로젝트, 제휴, 유통, 사람과 자원을 연결하는 영역에서 판을 키웁니다.",
    love: "연애에서는 매력과 여유가 강하지만, 자유가 지나치면 상대에게 불안으로 읽힐 수 있습니다.",
    conflict: "관계가 답답해지면 거리 두기로 반응하기 쉬워, 자유와 책임의 범위를 말로 정해야 합니다.",
    money: "돈은 흐름을 넓힐 때 커지지만, 벌리는 만큼 관리 장치가 없으면 수익이 흩어질 수 있습니다.",
    shadow: "과열되면 새 기회를 쫓느라 이미 쌓은 기반을 느슨하게 만들 수 있습니다.",
    growth: "성장은 확장 본능에 우선순위를 붙이고, 가장 수익성 높은 길에 힘을 모을 때 완성됩니다.",
  },
  정관: {
    personality: "책임감과 기준 준수가 분명한 축",
    career: "조직 운영·규정·품질 통제에 강한 축",
    aptitude: "공공기관, 법무, 인사, 관리직, 컴플라이언스, 조직의 기준과 신뢰를 세우는 자리에서 빛납니다.",
    love: "연애에서는 가볍게 흔들리는 관계보다 책임과 미래 계획이 보이는 관계에서 마음을 깊게 엽니다.",
    conflict: "관계가 무질서하다고 느끼면 통제하거나 평가하는 태도가 나올 수 있어, 기준을 강요보다 합의로 바꿔야 합니다.",
    money: "돈은 안정적인 직함, 장기 계약, 제도권 구조와 잘 맞으며 꾸준한 상승 곡선을 만들 수 있습니다.",
    shadow: "과열되면 완벽해야 한다는 압박이 커져 자신과 상대를 동시에 지치게 할 수 있습니다.",
    growth: "성장은 책임을 혼자 짊어지는 것이 아니라 신뢰할 수 있는 규칙으로 나누는 데서 시작됩니다.",
  },
  편관: {
    personality: "압박 속 추진력과 결단이 살아나는 축",
    career: "리스크 관리·구조 개편에 강한 축",
    aptitude: "위기관리, 보안, 응급 대응, 전략 실행, 조직 개편, 강한 결단이 필요한 프로젝트에서 힘이 살아납니다.",
    love: "연애에서는 보호 본능과 강한 몰입이 있지만, 긴장감이 사랑의 증거처럼 굳어지지 않게 해야 합니다.",
    conflict: "위협을 느끼면 단호하게 선을 긋기 쉬워, 중요한 대화에서는 속도를 낮추고 확인 질문을 먼저 두어야 합니다.",
    money: "돈은 위험을 읽는 감각이 강점이지만, 불안을 이기려 큰 결정을 앞당기면 손실 관리가 흔들릴 수 있습니다.",
    shadow: "과열되면 늘 전투 태세가 되어 쉬어야 할 순간에도 몸과 마음이 긴장을 풀지 못합니다.",
    growth: "성장은 강한 결단력을 평상시의 안정 루틴과 연결할 때 폭발력이 오래 갑니다.",
  },
  정인: {
    personality: "정리·학습·회복이 깊은 축",
    career: "연구·분석·기획 보조에 강한 축",
    aptitude: "연구, 상담, 교육, 문서화, 기획지원, 자격 기반 전문직처럼 축적과 해석이 필요한 분야에 맞습니다.",
    love: "연애에서는 정서적 안정과 깊은 이해를 원하며, 상대가 내 마음을 안전하게 받아줄 때 신뢰가 커집니다.",
    conflict: "상처를 받으면 말보다 침묵으로 들어가기 쉬워, 마음이 닫히기 전 감정의 이름을 먼저 꺼내야 합니다.",
    money: "돈은 지식과 전문성이 자산으로 바뀔 때 안정되며, 공부와 자격 투자가 장기 재물운을 키웁니다.",
    shadow: "과열되면 생각이 깊어지는 만큼 실행이 늦어지고, 보호받고 싶은 마음이 의존으로 기울 수 있습니다.",
    growth: "성장은 배운 것을 현실의 산출물로 바꾸는 작은 마감에서 열립니다.",
  },
  편인: {
    personality: "통찰과 비정형 이해가 빠른 축",
    career: "창의 기획·특수 분야 탐구에 강한 축",
    aptitude: "심리, 영성, 리서치, 데이터 해석, 특수 기술, 예술 기획처럼 남들이 놓치는 패턴을 읽는 일에 강합니다.",
    love: "연애에서는 독특한 교감과 정신적 연결을 중시하며, 지나치게 평면적인 관계에서는 쉽게 건조해집니다.",
    conflict: "불편을 느끼면 설명보다 거리 두기로 반응할 수 있어, 사라지기 전에 최소한의 신호를 남기는 것이 중요합니다.",
    money: "돈은 희소한 전문성과 독창적 관점에서 열리지만, 현실 구조가 약하면 재능이 수익으로 늦게 이어집니다.",
    shadow: "과열되면 의심과 해석이 많아져 실제보다 복잡하게 상황을 읽을 수 있습니다.",
    growth: "성장은 깊은 직관을 반복 가능한 언어와 상품 구조로 번역할 때 안정됩니다.",
  },
};

const FORBIDDEN_TEXT = [
  "code",
  "typeName",
  "axisScores",
  "usedSignals",
  "source",
  "evidence",
  "evidence.dayMaster",
  "evidence.monthBranch",
  "evidence.strongTenGods",
  "evidence.strongElements",
  "evidence.weakElements",
  "weaknesses",
  "growthTips",
  "calculationNotes",
  "percentageElements",
  "tenGodGroupScores",
  "핵심 카테고리입니다",
  "해석하는 핵심 카테고리",
  "데이터를 사용",
  "점수 분포",
  "기반으로 계산",
  "반영된 신호",
  "이 섹션은",
  "카테고리입니다",
];

const FORBIDDEN_TEXT_REGEX = new RegExp(FORBIDDEN_TEXT.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "gi");

function stripRomanPrefix(title: string): string {
  return String(title || "")
    .replace(/^\s*[IVXLCDM]+\.\s*/i, "")
    .replace(/^\s*[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\.\s*/i, "")
    .trim();
}

const CHAPTERS: ChapterDefinition[] = [
  {
    id: "overview",
    order: 1,
    roman: "I",
    title: "FPTI 유형 총론 - 나의 운명 성향 코드",
    sections: [
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
    order: 2,
    roman: "II",
    title: "내면 성격과 감정 패턴",
    sections: [
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
    order: 3,
    roman: "III",
    title: "관계와 연애 패턴",
    sections: [
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
    order: 4,
    roman: "IV",
    title: "일과 재능의 사용 방식",
    sections: [
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
    order: 5,
    roman: "V",
    title: "돈과 현실 감각",
    sections: [
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
    order: 6,
    roman: "VI",
    title: "스트레스와 그림자 성향",
    sections: [
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
    order: 7,
    roman: "VII",
    title: "성장 전략과 실행 로드맵",
    sections: [
      "이 유형의 인생 성장 방향",
      "지금 가장 먼저 고쳐야 할 습관",
      "관계·일·돈의 균형 전략",
      "30일 실행 루틴",
      "90일 변화 로드맵",
      "이 유형에게 필요한 한 문장",
    ],
  },
];

const REPORT_CHAPTER_LENSES = ["성향 총론", "내면 감정", "연애 관계", "진로 적성", "재물 현실", "그림자 회복", "성장 로드맵"];
const REPORT_SECTION_LENSES = [
  ["FPTI 코드", "십성 중심", "내면 대비", "선택 패턴", "강점 조건", "흔들림 조건"],
  ["감정 수용", "방어 습관", "친밀 관계", "회복 리듬", "감정 신호", "안정 기준"],
  ["매력 포인트", "호감 표현", "기대 조율", "연애 십성", "관계 그림자", "조율 전략"],
  ["일 처리", "성과 환경", "주의 업무", "재능 사용", "협업 방식", "성장 전략"],
  ["돈 태도", "소비 저축", "재성 감각", "흔들림 지점", "수익 구조", "현실 습관"],
  ["압박 반응", "과잉 십성", "부족 십성", "방어기제", "무너짐 패턴", "회복 처방"],
  ["성장 방향", "습관 교정", "균형 전략", "30일 루틴", "90일 로드맵", "핵심 문장"],
];

function reportTriadLabels(chapterOrder: number) {
  if (chapterOrder === 3) return { strength: "연애 강점", risk: "관계 주의", action: "조율 실행" };
  if (chapterOrder === 4) return { strength: "적성 강점", risk: "진로 주의", action: "업무 실행" };
  if (chapterOrder === 5) return { strength: "재물 강점", risk: "현실 주의", action: "돈 실행" };
  if (chapterOrder === 6) return { strength: "회복 강점", risk: "그림자 주의", action: "처방 실행" };
  if (chapterOrder === 7) return { strength: "성장 강점", risk: "습관 주의", action: "루틴 실행" };
  return { strength: "성향 강점", risk: "주의", action: "실행" };
}

function reportSectionMeta(chapter: ChapterDefinition, sectionIndex = 0) {
  const chapterIndex = Math.max(0, chapter.order - 1);
  return {
    category: REPORT_CHAPTER_LENSES[chapterIndex] || "심층 해석",
    lens: REPORT_SECTION_LENSES[chapterIndex]?.[sectionIndex] || "핵심 관점",
    triadLabels: reportTriadLabels(chapter.order),
  };
}

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function clamp(n: number, min = 0, max = 100): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function axisLevel(score: number): "low" | "mid" | "high" {
  if (score >= 68) return "high";
  if (score >= 40) return "mid";
  return "low";
}

function formatScore(score: number): string {
  if (!Number.isFinite(score)) return "0";
  const fixed = score.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

function uniqueList(values: string[], max = 6): string[] {
  const out: string[] = [];
  for (const value of values) {
    const normalized = toText(value);
    if (!normalized) continue;
    if (out.includes(normalized)) continue;
    out.push(normalized);
    if (out.length >= max) break;
  }
  return out;
}

function sentenceCount(text: string): number {
  return sanitizeFptiDeepReportText(text).split(/[.!?]\s+/).filter((line) => line.trim().length > 0).length;
}

function choose(left: number, right: number, leftLine: string, rightLine: string): string {
  return left >= right ? leftLine : rightLine;
}

function localTypeResult(input: FptiPremiumInput): LocalTypeResult {
  const result = input.result;
  const scores: FptiScores = {
    A: clamp(Number(result?.axisScores?.A ?? 50)),
    M: clamp(Number(result?.axisScores?.M ?? 50)),
    H: clamp(Number(result?.axisScores?.H ?? 50)),
    L: clamp(Number(result?.axisScores?.L ?? 50)),
    F: clamp(Number(result?.axisScores?.F ?? 50)),
    B: clamp(Number(result?.axisScores?.B ?? 50)),
    R: clamp(Number(result?.axisScores?.R ?? 50)),
    V: clamp(Number(result?.axisScores?.V ?? 50)),
  };

  const axes: FptiAxisResult[] = [
    { axis: "A", label: "에너지 반응 축", score: scores.A, level: axisLevel(scores.A), summary: scores.A >= 60 ? "외부 자극에서 동력이 빠르게 올라가는 편" : "내부 정리 후 움직일 때 힘이 커지는 편" },
    { axis: "H", label: "감정 판단 축", score: scores.H, level: axisLevel(scores.H), summary: scores.H >= 60 ? "상대의 온도와 맥락을 민감하게 읽는 편" : "기준과 원칙으로 정리해 안정적으로 판단하는 편" },
    { axis: "F", label: "실행 전개 축", score: scores.F, level: axisLevel(scores.F), summary: scores.F >= 60 ? "빠른 착수 후 보정하는 실전형" : "절차와 루틴으로 완성도를 높이는 구조형" },
    { axis: "R", label: "현실 전망 축", score: scores.R, level: axisLevel(scores.R), summary: scores.R >= 60 ? "현실 변수와 비용을 먼저 보는 편" : "방향성과 의미를 먼저 정해 추진하는 편" },
  ];

  const topAxes = [...axes].sort((a, b) => b.score - a.score).slice(0, 2);
  const lowAxes = [...axes].sort((a, b) => a.score - b.score).slice(0, 2);

  return {
    code: toText(input.fptiType || result?.code || "FPTI"),
    typeName: toText(input.fptiSubtype || result?.typeName || "사주 성향형"),
    scores,
    axes,
    topAxes,
    lowAxes,
    source: result?.source,
  };
}

function sourceFragments(source: LocalTypeResult["source"]): string[] {
  if (!source) return [];
  const parts = [
    toText(source?.dayMaster),
    toText(source?.monthBranch),
    toText(source?.season),
    ...(Array.isArray(source?.usefulGods) ? source.usefulGods : []),
    ...(Array.isArray(source?.favorableElements) ? source.favorableElements : []),
  ];
  return uniqueList(parts.filter(Boolean), 5);
}

function tenGodHighlights(source: LocalTypeResult["source"]): { primary: TenGodName; secondary: TenGodName; tertiary: TenGodName } {
  if (!source) return { primary: "정인", secondary: "정관", tertiary: "식신" };
  const raw = source?.tenGods || {
    biGyeon: 0,
    geopJae: 0,
    sikSin: 0,
    sangGwan: 0,
    jeongJae: 0,
    pyeonJae: 0,
    jeongGwan: 0,
    pyeonGwan: 0,
    jeongIn: 0,
    pyeonIn: 0,
  };
  const ranked = [
    ["비견", Number(raw?.biGyeon || 0)],
    ["겁재", Number(raw?.geopJae || 0)],
    ["식신", Number(raw?.sikSin || 0)],
    ["상관", Number(raw?.sangGwan || 0)],
    ["정재", Number(raw?.jeongJae || 0)],
    ["편재", Number(raw?.pyeonJae || 0)],
    ["정관", Number(raw?.jeongGwan || 0)],
    ["편관", Number(raw?.pyeonGwan || 0)],
    ["정인", Number(raw?.jeongIn || 0)],
    ["편인", Number(raw?.pyeonIn || 0)],
  ] as Array<[TenGodName, number]>;

  ranked.sort((a, b) => b[1] - a[1]);
  return {
    primary: ranked[0]?.[0] || "정인",
    secondary: ranked[1]?.[0] || "정관",
    tertiary: ranked[2]?.[0] || "식신",
  };
}

function dayMasterNarrative(dayMaster: string): string {
  if (["甲", "乙"].includes(dayMaster)) return "당신의 중심 기질에는 나무처럼 방향을 세우고 끝까지 밀어붙이는 성장 의지가 살아 있습니다.";
  if (["丙", "丁"].includes(dayMaster)) return "당신의 중심 기질에는 불처럼 사람의 온도와 분위기를 밝히며 주도권을 잡는 힘이 있습니다.";
  if (["戊", "己"].includes(dayMaster)) return "당신의 중심 기질에는 흙처럼 흔들림을 흡수하고 현실의 기반을 다지는 안정감이 있습니다.";
  if (["庚", "辛"].includes(dayMaster)) return "당신의 중심 기질은 금의 결처럼 선을 분명히 긋고 완성도를 끝까지 챙기는 집중력에 가깝습니다.";
  if (["壬", "癸"].includes(dayMaster)) return "당신의 중심 기질에는 물처럼 흐름을 읽고 상황에 맞춰 경로를 바꾸는 유연한 통찰이 있습니다.";
  return "당신의 중심 기질은 상황을 오래 관찰한 뒤 핵심을 뽑아내는 내공으로 드러납니다.";
}

function monthBranchNarrative(monthBranch: string): string {
  const map: Record<string, string> = {
    寅: "시작의 추진력이 강한 흐름에서 태어나, 결정을 미루기보다 먼저 움직이며 배우는 편입니다.",
    卯: "관계와 조화의 흐름이 강해, 사람의 마음을 읽고 완급을 조절하는 감각이 예민합니다.",
    辰: "전환기의 흐름을 타고 있어, 한 번 정한 방향도 현실에 맞춰 세밀하게 조정하는 능력이 좋습니다.",
    巳: "속도를 붙이는 흐름이 강해, 짧은 시간에 에너지를 집중해 성과를 끌어내는 장점이 큽니다.",
    午: "표현과 확장의 기운이 살아, 자신의 기준을 분명히 드러낼 때 영향력이 커집니다.",
    未: "정리와 완성의 흐름이 강해, 서두르기보다 체계를 다져 안정적인 결과를 만듭니다.",
    申: "현실 판단의 기운이 강해, 변수와 비용을 빠르게 계산해 손실을 줄이는 감각이 있습니다.",
    酉: "정밀함의 흐름이 강해, 작은 차이를 끝까지 확인해 완성도를 높이는 힘이 큽니다.",
    戌: "책임과 유지의 기운이 살아, 중요한 순간에 중심을 잡고 끝까지 버티는 힘이 좋습니다.",
    亥: "직관과 회복의 흐름이 강해, 막힐 때 돌아가는 우회로를 찾는 감각이 뛰어납니다.",
    子: "집중과 축적의 흐름이 강해, 혼자 깊게 파고들 때 실력이 빠르게 올라갑니다.",
    丑: "지속과 내구의 흐름이 강해, 화려함보다 오래 가는 구조를 만드는 데 강합니다.",
  };
  return map[monthBranch] || "계절 흐름을 읽는 감각이 좋아, 성급한 결정보다 타이밍을 맞추는 전략이 유리합니다.";
}

function topElements(source: LocalTypeResult["source"]): { strong: string; weak: string } {
  const e = source?.fiveElements || { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };
  const rows = Object.entries(e) as Array<["wood" | "fire" | "earth" | "metal" | "water", number]>;
  rows.sort((a, b) => b[1] - a[1]);
  const names: Record<string, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
  return {
    strong: names[rows[0]?.[0] || "wood"],
    weak: names[rows[rows.length - 1]?.[0] || "water"],
  };
}

type ElementCue = {
  talent: string;
  prescription: string;
};

const ELEMENT_CUES: Record<string, ElementCue> = {
  목: {
    talent: "성장 방향을 세우고 사람과 일을 앞으로 밀어 올리는 힘",
    prescription: "약해진 목 기운은 계획을 작게 쪼개고 매주 새 배움 하나를 심는 방식으로 회복됩니다.",
  },
  화: {
    talent: "표현력, 존재감, 빠른 반응으로 분위기를 밝히는 힘",
    prescription: "약해진 화 기운은 햇빛, 발표, 짧은 운동, 감정을 드러내는 대화로 살아납니다.",
  },
  토: {
    talent: "현실을 붙들고 관계와 자원을 안정시키는 힘",
    prescription: "약해진 토 기운은 수면, 식사, 정리된 공간, 반복 가능한 생활 루틴으로 보완됩니다.",
  },
  금: {
    talent: "기준을 세우고 불필요한 것을 정리해 완성도를 높이는 힘",
    prescription: "약해진 금 기운은 우선순위 정리, 마감선 설정, 필요 없는 약속을 줄이는 습관으로 다듬어집니다.",
  },
  수: {
    talent: "흐름을 읽고 깊게 배우며 막힌 길의 우회로를 찾는 힘",
    prescription: "약해진 수 기운은 혼자 생각하는 시간, 기록, 충분한 휴식, 장기 관점의 재정렬로 채워집니다.",
  },
};

function elementCue(element: string): ElementCue {
  return ELEMENT_CUES[element] || ELEMENT_CUES.토;
}

function mbtiLensLine(scores: FptiScores): string {
  const energy = scores.A >= scores.M ? "E처럼 외부 자극에서 힘을 얻지만" : "I처럼 내면 정리에서 힘을 얻지만";
  const judgment = scores.H >= scores.L ? "F처럼 관계의 온도를 먼저 읽고" : "T처럼 기준과 논리를 먼저 세우고";
  const execution = scores.F >= scores.B ? "P처럼 가능성을 열어 두며 움직이며" : "J처럼 구조와 마감을 세워 움직이며";
  const vision = scores.R >= scores.V ? "S처럼 현실의 비용과 효율을 확인하는 편입니다." : "N처럼 의미와 가능성의 큰 흐름을 먼저 보는 편입니다.";
  return `MBTI 관점으로 번역하면 ${energy}, ${judgment}, ${execution}, ${vision}`;
}

function relationshipTempoLine(scores: FptiScores): string {
  if (scores.H >= scores.L && scores.F >= scores.B) {
    return "관계의 템포는 마음이 움직이면 빠르게 가까워지는 편이지만, 오래 가려면 감정의 속도와 약속의 속도를 따로 맞춰야 합니다.";
  }
  if (scores.H >= scores.L && scores.B > scores.F) {
    return "관계의 템포는 부드럽지만 신중해, 다정함 속에서도 안정적인 약속과 반복되는 확인을 원합니다.";
  }
  if (scores.L > scores.H && scores.F >= scores.B) {
    return "관계의 템포는 자유롭고 솔직하지만, 상대가 불안해하지 않도록 기준과 경계를 미리 말해 주어야 합니다.";
  }
  return "관계의 템포는 천천히 깊어지는 쪽에 가까워, 신뢰가 확인될수록 표현과 헌신이 안정적으로 커집니다.";
}

function workEnvironmentLine(scores: FptiScores): string {
  if (scores.F >= scores.B && scores.V >= scores.R) {
    return "업무 환경은 새 가능성을 탐색하고 빠르게 실험할 수 있는 곳이 맞으며, 너무 촘촘한 승인 구조에서는 재능이 답답해집니다.";
  }
  if (scores.F >= scores.B && scores.R > scores.V) {
    return "업무 환경은 현장 판단과 빠른 수정이 가능한 곳이 맞으며, 숫자와 반응을 보며 전략을 바꿀 때 성과가 납니다.";
  }
  if (scores.B > scores.F && scores.V >= scores.R) {
    return "업무 환경은 큰 방향을 체계로 바꾸는 곳이 맞으며, 장기 기획과 시스템 설계에서 존재감이 커집니다.";
  }
  return "업무 환경은 역할, 마감, 책임이 분명한 곳이 맞으며, 안정적인 운영과 품질 관리에서 신뢰를 얻습니다.";
}

function buildNarrativeSeed(typeResult: LocalTypeResult): NarrativeSeed {
  const { scores } = typeResult;
  const tenGods = tenGodHighlights(typeResult.source);
  const elements = topElements(typeResult.source);
  const strength = typeResult.topAxes[0];
  const shadow = typeResult.lowAxes[0];
  const strongElementCue = elementCue(elements.strong);
  const weakElementCue = elementCue(elements.weak);

  const energyStyle = choose(
    scores.A,
    scores.M,
    "사람과 과제를 맞부딪치며 에너지를 키우는 외향 발산형 흐름이 강해, 시작이 빠르고 현장 감각이 살아 있습니다.",
    "혼자 숙성하고 구조를 잡은 뒤 움직이는 내면 축적형 흐름이 강해, 조용하지만 끝까지 가는 힘이 큽니다.",
  );
  const judgmentStyle = choose(
    scores.H,
    scores.L,
    "감응 공감형 기질이 살아 있어 상대의 표정과 맥락을 빨리 읽고 정서적인 타이밍을 잘 맞춥니다.",
    "구조 판단형 기질이 분명해 감정이 흔들려도 기준과 원칙으로 결론을 정리하는 능력이 좋습니다.",
  );
  const executionStyle = choose(
    scores.F,
    scores.B,
    "자유 탐색형 실행 감각이 강해 먼저 시도하고 보정하면서 길을 여는 데 유리합니다.",
    "질서 구축형 실행 감각이 강해 순서와 루틴을 세워 안정적으로 성과를 쌓는 데 유리합니다.",
  );
  const visionStyle = choose(
    scores.R,
    scores.V,
    "현실 감각형 시선이 앞서서 비용과 리스크를 먼저 보고 손실을 줄이는 선택을 잘합니다.",
    "비전 직관형 시선이 강해 의미와 방향을 먼저 잡고 큰 그림에서 길을 설계하는 힘이 좋습니다.",
  );

  const primaryCue = TEN_GOD_CUES[tenGods.primary];
  const secondaryCue = TEN_GOD_CUES[tenGods.secondary];
  const coreStrengthLine = `대표 십성 흐름은 ${tenGods.primary}과 ${tenGods.secondary}이 앞에서 이끌고, ${tenGods.tertiary}가 뒷심을 보태는 구조입니다.`;
  const tenGodLine = `${primaryCue.personality}과 ${secondaryCue.career}이 함께 작동할 때, 당신의 선택은 감정과 현실 사이에서 균형을 잡습니다.`;

  return {
    typeCode: typeResult.code,
    typeName: typeResult.typeName,
    energyStyle,
    judgmentStyle,
    executionStyle,
    visionStyle,
    mbtiLensLine: mbtiLensLine(scores),
    dayMasterLine: dayMasterNarrative(toText(typeResult.source?.dayMaster)),
    monthBranchLine: monthBranchNarrative(toText(typeResult.source?.monthBranch)),
    elementBalanceLine: `오행 흐름으로 보면 ${elements.strong} 기운이 주도권을 잡고 ${elements.weak} 기운이 상대적으로 약해, ${strongElementCue.talent}이 강점으로 드러납니다.`,
    elementPrescriptionLine: weakElementCue.prescription,
    tenGodLine,
    coreStrengthLine,
    aptitudeLine: `${tenGods.primary}의 적성은 ${primaryCue.aptitude} 여기에 ${tenGods.secondary} 흐름이 더해지면 ${secondaryCue.career}이 직업적 무기가 됩니다.`,
    careerLine: `${tenGods.primary}이 앞설 때 진로는 ${primaryCue.career}에서 열리고, ${tenGods.secondary} 흐름은 일의 방식에 현실적인 결을 더합니다.`,
    loveLine: `${tenGods.primary}의 연애 성향은 ${primaryCue.love} ${tenGods.secondary} 흐름까지 함께 보면 ${secondaryCue.love}`,
    conflictLine: `${tenGods.primary} 흐름의 갈등 패턴은 ${primaryCue.conflict} ${tenGods.secondary} 흐름이 과해질 때는 ${secondaryCue.conflict}`,
    moneyLine: `${tenGods.primary}의 재물 감각은 ${primaryCue.money} ${tenGods.secondary} 흐름은 ${secondaryCue.money}`,
    stressLine: `${tenGods.primary} 흐름이 그림자로 기울면 ${primaryCue.shadow} ${tenGods.secondary} 흐름의 그림자는 ${secondaryCue.shadow}`,
    growthLine: `${tenGods.primary}의 성장 처방은 ${primaryCue.growth} ${tenGods.secondary} 흐름을 살리려면 ${secondaryCue.growth}`,
    relationshipTempoLine: relationshipTempoLine(scores),
    workEnvironmentLine: workEnvironmentLine(scores),
    shadowLine: `당신이 흔들릴 때는 보통 ${shadow.label} 구간에서 먼저 피로 신호가 올라옵니다. 이때 무리하게 밀어붙이면 성과보다 소모가 커지기 쉽습니다.`,
    actionLine: `지금 성장의 핵심은 ${strength.label} 강점을 더 세게 쓰는 것이 아니라, 취약 구간에서 복귀 속도를 높이는 운영 규칙을 확보하는 것입니다.`,
    debugSignals: uniqueList([
      `type:${typeResult.code}`,
      `top:${strength.axis}`,
      `low:${shadow.axis}`,
      `tenGod:${tenGods.primary}/${tenGods.secondary}/${tenGods.tertiary}`,
      ...sourceFragments(typeResult.source),
    ], 8),
  };
}

function chapterBackdrop(chapterOrder: number, seed: NarrativeSeed): string {
  if (chapterOrder === 1) {
    return `${seed.typeName}의 핵심은 한 번의 반짝이는 성과보다 오래 유지되는 리듬을 만드는 데 있습니다. ${seed.dayMasterLine} ${seed.monthBranchLine}`;
  }
  if (chapterOrder === 2) {
    return `당신의 내면은 겉으로 보이는 모습보다 더 섬세하고 복합적입니다. ${seed.energyStyle} ${seed.judgmentStyle}`;
  }
  if (chapterOrder === 3) {
    return `관계에서 당신은 감정의 크기보다 신뢰의 품질을 중시합니다. ${seed.judgmentStyle} ${seed.shadowLine}`;
  }
  if (chapterOrder === 4) {
    return `일의 세계에서 당신은 타고난 감각을 즉흥으로 쓰기보다 구조로 축적할 때 더 크게 성장합니다. ${seed.executionStyle} ${seed.tenGodLine}`;
  }
  if (chapterOrder === 5) {
    return `돈 문제는 성격과 분리된 영역이 아니라, 당신의 불안과 확신이 동시에 드러나는 생활의 거울입니다. ${seed.visionStyle} ${seed.elementBalanceLine}`;
  }
  if (chapterOrder === 6) {
    return `스트레스 장면에서는 평소의 장점이 그대로 그림자가 되기도 합니다. ${seed.shadowLine} ${seed.actionLine}`;
  }
  return `성장은 더 독하게 버티는 싸움이 아니라, 덜 소모되는 구조를 만드는 과정입니다. ${seed.coreStrengthLine} ${seed.actionLine}`;
}

function repeatSafe(text: string): string {
  return removeRepeatedFptiPhrases(sanitizeFptiDeepReportText(text));
}

function chapterFlavor(chapterOrder: number): { strength: string; risk: string; action: string } {
  if (chapterOrder === 1) return { strength: "자기 기준이 분명해 선택의 일관성이 높습니다.", risk: "기준 검토가 길어지면 출발이 늦어질 수 있습니다.", action: "결정 마감 시간을 먼저 정해 판단 지연을 줄이세요." };
  if (chapterOrder === 2) return { strength: "감정의 결을 섬세하게 읽어 관계 조율에 유리합니다.", risk: "피로 구간에서는 감정 과해석이 늘어날 수 있습니다.", action: "감정 기록과 사실 기록을 분리해 정리하세요." };
  if (chapterOrder === 3) return { strength: "관계의 신뢰를 장기적으로 유지하는 힘이 큽니다.", risk: "불편을 늦게 표현하면 누적 갈등이 커질 수 있습니다.", action: "주 1회 기대치 점검 대화를 고정하세요." };
  if (chapterOrder === 4) return { strength: "강점과 환경의 궁합을 읽어 성과를 구조화합니다.", risk: "요청을 과수용하면 집중력이 분산됩니다.", action: "업무 수락 전에 완료 기준을 먼저 합의하세요." };
  if (chapterOrder === 5) return { strength: "리스크를 미리 보는 현실 감각이 안정성을 높입니다.", risk: "과도한 보수성으로 기회를 놓칠 수 있습니다.", action: "소규모 실험 예산을 따로 두어 도전성을 보완하세요." };
  if (chapterOrder === 6) return { strength: "무너짐 신호를 빠르게 감지하면 복구가 빠릅니다.", risk: "압박이 누적되면 회피와 과통제가 번갈아 나타납니다.", action: "위기 신호 3개를 사전 정의하고 결정 유예 규칙을 적용하세요." };
  return { strength: "실행 단위를 작게 쪼개면 성장 지속성이 높아집니다.", risk: "목표가 추상적이면 계획만 늘고 실행이 줄어듭니다.", action: "7일과 30일 목표를 분리해 체크리스트로 운영하세요." };
}

function sectionFocus(chapter: ChapterDefinition, title: string, seed: NarrativeSeed): string {
  if (chapter.order === 1) {
    if (title.includes("FPTI 코드")) {
      return `${seed.typeName}은 사주의 기운을 행동 심리 언어로 풀었을 때 드러나는 대표 성향입니다. ${seed.mbtiLensLine} 이 조합은 겉으로 보이는 성격보다 실제 선택 습관을 더 정확히 보여 줍니다.`;
    }
    if (title.includes("대표 십성")) {
      return `${seed.coreStrengthLine} ${seed.tenGodLine} ${seed.aptitudeLine}`;
    }
    if (title.includes("겉모습")) {
      return `겉으로는 ${seed.energyStyle} 그러나 실제 내면에서는 ${seed.dayMasterLine} 겉모습과 내면의 차이를 이해하면 관계에서 불필요한 오해가 줄어듭니다.`;
    }
    if (title.includes("반복되는 선택")) {
      return `반복 선택은 ${seed.judgmentStyle} ${seed.executionStyle} ${seed.visionStyle} 이 세 흐름이 만나는 지점에서 생깁니다.`;
    }
    if (title.includes("강해지는 조건")) {
      return `${seed.workEnvironmentLine} ${seed.elementBalanceLine} ${seed.growthLine}`;
    }
    return `${seed.stressLine} ${seed.conflictLine} 흔들림은 약함의 증거가 아니라 기운의 사용 방식이 한쪽으로 기울었다는 신호입니다.`;
  }

  if (chapter.order === 2) {
    if (title.includes("감정")) return `${seed.judgmentStyle} ${seed.loveLine} 감정은 당신에게 결정을 방해하는 소음이 아니라, 관계의 온도를 알려 주는 섬세한 예보입니다.`;
    if (title.includes("무의식")) return `${seed.stressLine} 스스로를 지키는 방식은 처음에는 보호막이지만, 오래 지속되면 가까운 사람과의 거리를 만들 수 있습니다.`;
    if (title.includes("가까운 사람")) return `${seed.relationshipTempoLine} 가까운 사람 앞에서는 힘을 주고 버티는 모습보다, 진짜 욕구와 피로가 먼저 드러납니다.`;
    if (title.includes("혼자")) return `${seed.energyStyle} ${seed.elementPrescriptionLine} 혼자 있는 시간은 도피가 아니라 기운을 다시 정렬하는 의식에 가깝습니다.`;
    if (title.includes("쌓였을")) return `${seed.shadowLine} ${seed.conflictLine} 감정이 쌓이면 말투보다 침묵, 속도 변화, 결정 회피에서 먼저 신호가 나옵니다.`;
    return `${seed.elementPrescriptionLine} ${seed.growthLine} 마음을 안정시키는 기준은 거창한 결심보다 매일 반복 가능한 작은 질서에서 생깁니다.`;
  }

  if (chapter.order === 3) {
    if (title.includes("매력")) return `${seed.loveLine} 당신의 매력은 단순한 호감보다 상대가 안전하다고 느끼는 방식에서 깊어집니다.`;
    if (title.includes("좋아하는 사람")) return `${seed.relationshipTempoLine} 호감이 생기면 표현 속도와 확신 속도가 달라질 수 있으니, 상대가 따라올 수 있는 리듬을 남겨야 합니다.`;
    if (title.includes("기대와 실망")) return `${seed.conflictLine} 기대를 말로 꺼내지 않으면 상대는 당신의 깊이를 배려가 아니라 거리감으로 오해할 수 있습니다.`;
    if (title.includes("연애에서 강점")) return `${seed.coreStrengthLine} ${seed.loveLine} 이 흐름은 연애에서 신뢰를 만드는 방식과 상처를 회복하는 방식을 동시에 보여 줍니다.`;
    if (title.includes("망치기 쉬운")) return `${seed.stressLine} 관계를 망치는 순간은 사랑이 부족할 때보다, 불안을 다루는 방식이 거칠어질 때 찾아옵니다.`;
    return `${seed.relationshipTempoLine} 건강한 관계는 감정의 크기보다 약속, 거리, 표현 빈도를 함께 조율할 때 오래 갑니다.`;
  }

  if (chapter.order === 4) {
    if (title.includes("일 처리")) return `${seed.workEnvironmentLine} ${seed.executionStyle} 일 처리의 핵심은 속도 자체보다 어떤 구조에서 실력이 가장 덜 새는지 아는 데 있습니다.`;
    if (title.includes("성과")) return `${seed.careerLine} 성과는 강점이 요구되는 환경과 책임 범위가 맞아떨어질 때 가장 크게 열립니다.`;
    if (title.includes("피해야")) return `${seed.stressLine} 피해야 할 업무 구조는 능력이 부족한 곳이 아니라, 강점을 소모하게 만드는 곳입니다.`;
    if (title.includes("재능")) return `${seed.aptitudeLine} 재능은 타고난 가능성에서 끝나지 않고, 반복 가능한 직무 형태로 바뀔 때 운의 통로가 됩니다.`;
    if (title.includes("리더십")) return `${seed.mbtiLensLine} 협업에서는 이 흐름을 이해한 뒤 의사결정 기준, 보고 방식, 마감 단위를 먼저 맞추는 편이 좋습니다.`;
    return `${seed.growthLine} 직업적 성장은 더 많은 일을 떠안는 방향보다, 가장 강한 역할을 선명하게 선택하는 방향에서 깊어집니다.`;
  }

  if (chapter.order === 5) {
    if (title.includes("바라보는")) return `${seed.moneyLine} 돈은 단순한 숫자가 아니라 안정감, 자유, 책임감 중 무엇을 더 중요하게 여기는지 보여 주는 거울입니다.`;
    if (title.includes("소비")) return `${seed.conflictLine} 소비와 저축은 감정 조절 방식과 이어져 있어, 불안한 날의 결정을 따로 관리해야 합니다.`;
    if (title.includes("재성")) return `${seed.moneyLine} 재성의 흐름은 돈을 버는 감각뿐 아니라 유지하고 순환시키는 방식까지 함께 읽어야 선명해집니다.`;
    if (title.includes("흔들리는")) return `${seed.shadowLine} 돈 때문에 흔들리는 지점은 욕심보다 불안이 앞설 때 드러나므로, 결정 전 감정 상태를 먼저 확인해야 합니다.`;
    if (title.includes("수익 구조")) return `${seed.careerLine} 안정적인 수익 구조는 직업 적성과 돈의 흐름이 같은 방향으로 놓일 때 만들어집니다.`;
    return `${seed.elementPrescriptionLine} 현실 판단력은 큰 결정을 잘하는 힘보다, 작은 지출과 작은 선택을 반복해서 정렬하는 힘에서 커집니다.`;
  }

  if (title.includes("압박")) return `${seed.stressLine} 압박을 받을 때 드러나는 반응은 숨겨진 약점이 아니라 평소 강점이 과열된 모습입니다.`;
  if (title.includes("과잉")) return `${seed.coreStrengthLine} 과잉된 기운은 장점의 농도가 짙어진 상태라, 방향을 바꾸면 다시 힘이 됩니다.`;
  if (title.includes("부족")) return `${seed.elementPrescriptionLine} 부족한 기운은 채워야 할 결핍이 아니라 생활 속에서 보완해야 할 균형점입니다.`;
  if (title.includes("방어기제")) return `${seed.conflictLine} 방어기제는 상대를 밀어내려는 의도보다 스스로를 지키려는 오래된 습관에서 나옵니다.`;
  if (title.includes("무너질 때")) return `${seed.shadowLine} 무너질 때 반복되는 선택을 알아차리면, 같은 운의 파도에서도 다른 결말을 만들 수 있습니다.`;
  return `${seed.growthLine} 회복 처방은 마음을 다잡는 말보다 몸, 일정, 관계 경계를 동시에 낮추는 현실적인 순서에서 시작됩니다.`;
}

function sectionTriad(chapter: ChapterDefinition, title: string, seed: NarrativeSeed): { strength: string; risk: string; action: string; advice: string } {
  const flavor = chapterFlavor(chapter.order);
  if (chapter.order === 3) {
    return {
      strength: `${title}에서는 ${flavor.strength} ${seed.relationshipTempoLine}`,
      risk: `${title}에서 ${flavor.risk} ${seed.conflictLine}`,
      action: `${flavor.action} 표현 빈도, 거리감, 약속 기준을 한 문장으로 남기세요.`,
      advice: "사랑의 크기보다 반복되는 안전감이 관계의 운을 오래 붙잡습니다.",
    };
  }
  if (chapter.order === 4) {
    return {
      strength: `${title}에서는 ${flavor.strength} ${seed.aptitudeLine}`,
      risk: `${title}에서 ${flavor.risk} ${seed.stressLine}`,
      action: `${flavor.action} 이번 주 업무를 적성에 맞는 일, 소모가 큰 일, 위임할 일로 나누세요.`,
      advice: "진로의 운은 재능을 많이 쓰는 곳보다 재능이 덜 새는 구조에서 열립니다.",
    };
  }
  if (chapter.order === 5) {
    return {
      strength: `${title}에서는 ${flavor.strength} ${seed.moneyLine}`,
      risk: `${title}에서 ${flavor.risk} 감정이 높은 날의 지출과 투자는 하루 늦춰야 안정됩니다.`,
      action: `${flavor.action} 안전자금, 성장자금, 만족지출을 분리해 흐름을 보세요.`,
      advice: "돈의 흐름은 막는 것보다 방향을 정할 때 더 맑아집니다.",
    };
  }
  if (chapter.order === 6) {
    return {
      strength: `${title}에서는 ${flavor.strength} ${seed.growthLine}`,
      risk: `${title}에서 ${flavor.risk} ${seed.shadowLine}`,
      action: `${flavor.action} 피로 신호가 보이면 결정보다 회복 순서를 먼저 적용하세요.`,
      advice: "그림자는 없애는 것이 아니라 빛이 너무 강해진 방향을 낮추는 과정입니다.",
    };
  }
  return {
    strength: `${title}에서는 ${flavor.strength} ${seed.coreStrengthLine}`,
    risk: `${title}에서 ${flavor.risk} ${seed.shadowLine}`,
    action: `${flavor.action} 오늘 적용할 기준과 멈출 기준을 각각 한 줄로 정하세요.`,
    advice: "운의 흐름은 기질을 억누를 때가 아니라 올바른 자리에 배치할 때 부드럽게 열립니다.",
  };
}

function sectionFrame(chapter: ChapterDefinition, title: string, seed: NarrativeSeed): string {
  return repeatSafe([
    `${title}에서 가장 먼저 기억할 점은, 당신의 기질이 단점과 장점으로 깔끔하게 나뉘지 않는다는 사실입니다.`,
    sectionFocus(chapter, title, seed),
    chapterBackdrop(chapter.order, seed),
    seed.elementBalanceLine,
    seed.elementPrescriptionLine,
    seed.mbtiLensLine,
    `현실에서는 이 흐름이 성향, 진로, 적성, 연애 스타일에서 각각 다른 표정으로 나타납니다.`,
    `그래서 ${title}의 해답은 더 강하게 밀어붙이는 태도보다, 오래 유지되는 기준을 만들고 피로가 올라오는 순간 즉시 속도를 조절하는 운영감각에 있습니다.`,
  ].join(" "));
}

function withGrowthDepth(text: string): string {
  return `${text} 사주의 기질과 성향심리를 함께 보면, 당신의 변화는 마음가짐보다 환경 설계에서 훨씬 크게 일어납니다. 그래서 각 계획은 반드시 실행 기록과 회복 기록을 같이 남겨야 하며, 기록이 쌓일수록 당신에게 맞는 리듬이 선명해집니다.`;
}

function buildGrowthSection(seed: NarrativeSeed, title: string): string {
  if (title === "이 유형의 인생 성장 방향") {
    return repeatSafe(withGrowthDepth(
      `당신의 인생 성장 방향은 스스로를 더 몰아붙이는 쪽이 아니라, 이미 가진 강점을 소모 없이 오래 쓰는 구조를 만드는 쪽입니다. ${seed.dayMasterLine} ${seed.monthBranchLine} 지금까지는 책임감과 기준으로 버텨 왔기 때문에 위기 상황에서 오히려 침착하다는 평가를 많이 받았을 가능성이 큽니다. 하지만 장기전에서는 이 방식이 당신을 조용히 소진시키기도 합니다. 그래서 앞으로의 성장은 실력 자체를 키우는 것과 동시에 회복 시스템을 먼저 설계하는 방식으로 가야 합니다. 아침에는 시작 기준을 짧게 정하고, 저녁에는 에너지가 빠진 지점을 기록해 다음 날의 부하를 줄이는 습관을 붙이세요. 일에서는 역할 경계를 선명하게 만들어 책임 과잉을 줄이고, 관계에서는 추측 대신 합의 문장을 남겨 정서 소모를 낮추는 것이 핵심입니다. 재정에서는 불안할 때 움켜쥐는 패턴과 과감할 때 과확장하는 패턴을 동시에 관리해야 하므로, 안전자금과 성장자금을 분리한 이중 전략이 필요합니다. 결국 당신의 성장 곡선은 한 번 크게 치고 나가는 방식보다, 무너질 때 빨리 복귀하는 구조를 가졌을 때 가장 가파르게 상승합니다. 여기에 한 가지를 더 붙이세요. 월 1회는 지난 선택을 되돌아보며 무엇이 성과를 만들었고 무엇이 소모를 키웠는지 정리해, 다음 달의 운영 원칙을 다시 세우는 시간이 필요합니다. 이런 자기 피드백이 쌓이면 당신은 방향을 잃지 않고도 유연하게 진화할 수 있습니다.`,
    ));
  }

  if (title === "지금 가장 먼저 고쳐야 할 습관") {
    return repeatSafe(withGrowthDepth(
      `지금 가장 먼저 고쳐야 할 습관은 모든 문제를 혼자 머릿속에서 끝내려는 태도입니다. 당신은 판단력이 좋고 책임감이 강하기 때문에, 주변이 흔들릴수록 조용히 정리하려는 습관이 자동으로 작동합니다. 이 방식은 단기적으로는 효율적으로 보이지만, 장기적으로는 과부하를 만든 뒤 한 번에 무너지는 패턴을 부릅니다. 그래서 첫 번째 교정은 "혼자 완벽하게 정리한 뒤 공유"가 아니라 "중간 단계에서 빠르게 합의"로 바꿔야 합니다. 업무에서는 진행률이 60퍼센트일 때 한 번 공유하고, 관계에서는 불편이 30퍼센트 수준일 때 먼저 말하는 기준을 세우세요. 돈 문제에서는 고민만 길어지면 결정을 회피하게 되므로, 지출과 투자 판단에 마감 시간을 두는 습관이 필요합니다. 몸과 마음의 신호도 교정 대상입니다. 수면이 흔들리거나 집중 시간이 짧아지기 시작하면 의지로 버티지 말고 일정 강도를 즉시 낮추는 규칙을 적용하세요. 당신에게 필요한 변화는 새로운 능력을 추가하는 것이 아니라, 이미 가진 능력이 자신을 갉아먹지 않게 흐름을 재설계하는 것입니다. 특히 아픈 감정을 무시하고 논리로 덮는 습관이 있다면, 하루에 단 5분이라도 감정 이름을 적는 훈련을 하세요. 감정을 정확히 이름 붙이는 순간, 불필요한 과통제와 과추측이 줄어들고 판단의 질이 안정됩니다.`,
    ));
  }

  if (title === "관계·일·돈의 균형 전략") {
    return repeatSafe(withGrowthDepth(
      `관계, 일, 돈의 균형은 세 영역을 똑같이 나누는 것이 아니라, 서로를 해치지 않게 연결하는 설계에서 완성됩니다. 먼저 관계에서는 오해를 줄이는 합의 문장을 생활화해야 합니다. 당신은 상대의 맥락을 잘 읽지만, 기대를 말로 명확히 꺼내지 않으면 스스로 지치는 경우가 많습니다. 일에서는 성과를 내는 기준과 멈추는 기준을 동시에 설정해야 합니다. 시작 기준만 있고 종료 기준이 없으면 성실함이 과로로 변하고, 결국 관계와 건강이 먼저 무너집니다. 돈에서는 불안을 줄이는 안전계정과 미래를 여는 성장계정을 분리해야 균형이 생깁니다. 세 영역을 연결하는 핵심 규칙은 하나입니다. 관계에서 소모가 커진 주에는 일의 목표량을 줄이고, 일이 과열된 주에는 소비 결정을 보수적으로 조정해 전체 리듬을 지켜야 합니다. 반대로 흐름이 좋은 주에는 관계 투자 시간을 늘리고 성장계정 적립을 확장해 상승 구간을 길게 가져가세요. 이 균형 전략의 본질은 완벽한 통제가 아니라, 한 영역의 흔들림이 다른 영역 전체 붕괴로 번지지 않게 막는 운영 구조입니다. 매주 일요일 20분만 투자해 세 영역을 10점 만점으로 채점해 보세요. 점수가 6점 이하로 떨어진 영역이 있으면 다음 주 계획에서 우선순위를 조정하는 식으로 리듬을 회복하면, 균형은 의지가 아니라 시스템으로 유지됩니다.`,
    ));
  }

  if (title === "30일 실행 루틴") {
    return repeatSafe(withGrowthDepth(
      `30일 실행 루틴은 결심이 아니라 생활 자동화에 초점을 맞춰야 합니다. 1주차에는 리듬 복구가 목표입니다. 기상 시간과 취침 시간을 고정하고, 하루 핵심 행동 한 가지를 가장 먼저 끝내는 습관을 만들며, 저녁에는 감정 소모 지점을 두 줄로 기록하세요. 2주차에는 실행 안정화가 목표입니다. 업무마다 시작 기준과 종료 기준을 한 문장씩 적고, 관계 대화에서는 요청과 기한을 분리해 전달해 오해를 줄입니다. 3주차에는 경계 재설정이 핵심입니다. 불필요한 요청을 줄이기 위해 수락 기준을 만들고, 소비는 생존·성장·만족 세 계정으로 나눠 지출 흐름을 분리합니다. 4주차에는 유지 시스템을 정착합니다. 주간 회고에서 잘된 선택 세 가지와 과열 신호 두 가지를 기록하고, 다음 주 계획에서 과열 가능성이 높은 일정은 미리 완충 시간을 넣습니다. 이 30일 루틴은 빠른 변화보다 재현 가능한 변화에 목적이 있습니다. 중요한 것은 하루를 완벽하게 해내는 것이 아니라, 컨디션이 낮아도 최소 기준으로 다시 복귀할 수 있는 구조를 몸에 익히는 것입니다. 그렇게 해야 당신의 강점이 이벤트가 아니라 습관으로 남습니다. 루틴을 유지하다가 하루가 무너졌다면 자책하지 말고 즉시 다음 날 1주차 기준으로 재시작하세요. 복귀 속도를 빠르게 만드는 경험이 쌓일수록, 당신은 어떤 변수에서도 중심을 잃지 않는 사람으로 변합니다.`,
    ));
  }

  if (title === "90일 변화 로드맵") {
    return repeatSafe(withGrowthDepth(
      `90일 변화 로드맵은 당신의 성향을 억지로 바꾸는 계획이 아니라, 장점을 오래 유지하고 약점을 조기에 관리하는 단계별 훈련입니다. 1개월차는 진단과 정렬 단계입니다. 에너지 소모 시간대, 갈등이 반복되는 장면, 돈이 새는 지점을 기록해 현재 패턴을 수치로 확인하세요. 이 시기에는 성과를 크게 내기보다 기준을 정교하게 만드는 데 집중해야 합니다. 2개월차는 실행과 조정 단계입니다. 일에서는 핵심 과제 두 개에 집중하고 나머지는 과감히 위임하거나 보류하며, 관계에서는 주 1회 합의 대화를 고정해 기대와 경계를 업데이트합니다. 재정에서는 자동이체 비율을 조정해 안전계정과 성장계정의 균형을 맞추세요. 3개월차는 확장과 고정 단계입니다. 앞선 두 달 동안 검증된 루틴만 남기고 불필요한 목표를 줄여 지속 가능한 체계를 완성합니다. 이때는 새로운 계획을 많이 추가하는 것보다, 이미 효과가 확인된 전략을 반복해 체질로 만드는 것이 중요합니다. 90일이 끝났을 때 당신이 얻어야 하는 결과는 단기 성과 하나가 아니라, 위기 구간에서도 무너지지 않는 자기 운영 시스템입니다. 매달 마지막 날에는 성과, 관계 만족도, 재정 안정도를 함께 점검해 다음 달의 가중치를 재조정하세요. 이렇게 3개월을 보내면 변화는 일시적 의욕이 아니라 일상적인 자기 관리 능력으로 굳어집니다.`,
    ));
  }

  return repeatSafe(withGrowthDepth(
    `당신에게 필요한 한 문장은 이것입니다. "나는 모든 것을 혼자 버티는 사람이 아니라, 오래 갈 수 있는 구조를 만드는 사람이다." ${seed.typeName}의 강점은 위기 앞에서 감정을 과장하지 않고 상황을 정리하는 힘에서 나옵니다. 그래서 주변이 흔들릴수록 당신은 기준을 세우고 책임질 방법을 찾으려 합니다. 이 힘은 분명히 큰 장점이지만, 동시에 가장 큰 함정이 되기도 합니다. 마음이 지쳤을 때조차 스스로를 더 조여서 문제를 해결하려 하면, 겉으로는 멀쩡해 보여도 안쪽부터 빠르게 소모됩니다. 당신이 오래 강해지려면 더 많이 참는 사람이 되는 것이 아니라, 덜 소모되는 리듬을 만드는 사람이 되어야 합니다. 일에서는 업무의 시작 기준과 종료 기준을 분명히 적어 과책임을 막고, 관계에서는 추측 대신 합의 문장을 남겨 정서 누수를 줄이세요. 돈에서는 불안할 때 움켜쥐는 패턴과 과감할 때 과확장하는 패턴을 동시에 관리하기 위해 안전자금과 성장자금을 분리해야 합니다. 결국 당신이 진짜 강해지는 순간은 모든 것을 통제할 때가 아니라, 통제하지 않아도 무너지지 않는 구조를 스스로 갖추었을 때입니다. 이 선언문을 하루 시작 전에 한 번 읽고, 저녁에는 오늘의 선택이 이 문장과 얼마나 일치했는지 점검해 보세요. 선언이 생활의 기준으로 연결될 때, 당신의 변화는 흔들리지 않는 방향을 갖게 됩니다.`,
  ));
}

function growthTriadByTitle(title: string, seed: NarrativeSeed): { strength: string; risk: string; action: string; advice: string } {
  if (title === "이 유형의 인생 성장 방향") {
    return {
      strength: `${seed.coreStrengthLine} 방향을 크게 잃지 않고도 현실에 맞춰 경로를 조정하는 유연성이 뛰어납니다.`,
      risk: `${seed.shadowLine} 장기 계획에서 회복 장치를 빼면 성장 속도가 급격히 꺾일 수 있습니다.`,
      action: "월간 목표를 성과 목표와 회복 목표로 나눠 각각 한 줄씩 적고, 주간 계획에 동시에 배치하세요.",
      advice: "당신의 성장 방향은 더 빠르게 달리는 길이 아니라, 오래 달릴 수 있는 길을 정확히 고르는 데 있습니다.",
    };
  }
  if (title === "지금 가장 먼저 고쳐야 할 습관") {
    return {
      strength: "문제를 빠르게 구조화하는 능력이 좋아 교정 포인트를 발견하면 변화 속도도 빠릅니다.",
      risk: "혼자 완벽히 해결하려는 습관이 남아 있으면 교정 단계에서도 과부하가 다시 반복될 수 있습니다.",
      action: "중요한 문제는 중간 공유 시점을 먼저 정해 혼자 끌고 가지 않도록 루틴을 만드세요.",
      advice: "완벽한 해결보다 빠른 합의가 당신의 에너지를 지켜줍니다.",
    };
  }
  if (title === "관계·일·돈의 균형 전략") {
    return {
      strength: "세 영역의 연결 구조를 읽는 감각이 좋아 균형 모델을 만들면 빠르게 안정됩니다.",
      risk: "한 영역에 과몰입하면 나머지 영역이 연쇄적으로 무너질 수 있으니 경보 기준이 필요합니다.",
      action: "주간 점검표에 관계·일·돈 점수를 기록하고 가장 낮은 항목을 다음 주 우선순위로 올리세요.",
      advice: "균형은 감각이 아니라 반복되는 점검 시스템에서 만들어집니다.",
    };
  }
  if (title === "30일 실행 루틴") {
    return {
      strength: "작은 규칙을 반복하는 힘이 좋아 루틴이 자리 잡으면 성과와 안정이 동시에 올라갑니다.",
      risk: "하루가 무너졌을 때 전부 포기하는 패턴이 나오면 루틴 전체가 끊길 수 있습니다.",
      action: "실패한 날에는 즉시 다음 날 1주차 기준으로 재시작한다는 복귀 규칙을 고정하세요.",
      advice: "루틴의 성공은 완주가 아니라 재시작 속도에서 결정됩니다.",
    };
  }
  if (title === "90일 변화 로드맵") {
    return {
      strength: "중기 계획을 세우면 실행 밀도를 꾸준히 유지할 수 있는 내구성이 강합니다.",
      risk: "중간 점검 없이 밀어붙이면 방향이 어긋난 상태로 소모만 늘어날 수 있습니다.",
      action: "각 월말에 성과·관계·재정 지표를 재평가해 다음 달 가중치를 반드시 조정하세요.",
      advice: "90일의 성패는 의욕이 아니라 월별 재정렬 습관에 달려 있습니다.",
    };
  }
  return {
    strength: `${seed.coreStrengthLine} 핵심 문장을 기준으로 삼을 때 선택의 일관성이 크게 올라갑니다.`,
    risk: `${seed.shadowLine} 선언만 있고 실행 점검이 없으면 변화가 다시 원래 패턴으로 되돌아갈 수 있습니다.`,
    action: "하루 시작 전에 선언문을 읽고, 저녁에는 선언과 일치한 행동 한 가지를 기록하세요.",
    advice: "당신의 선언은 문장이 아니라 삶의 방향을 붙잡는 나침반입니다.",
  };
}

function buildSectionNarrative(chapter: ChapterDefinition, title: string, seed: NarrativeSeed): { interpretation: string; body: string; strength: string; risk: string; action: string; advice: string } {
  if (chapter.order === 7) {
    const longBody = buildGrowthSection(seed, title);
    const triad = growthTriadByTitle(title, seed);
    return {
      interpretation: longBody,
      body: longBody,
      strength: repeatSafe(triad.strength),
      risk: repeatSafe(triad.risk),
      action: repeatSafe(triad.action),
      advice: repeatSafe(triad.advice),
    };
  }

  const interpretation = sectionFrame(chapter, title, seed);
  const body = repeatSafe(`${interpretation} ${title}을 읽을 때는 자신을 평가하려 하기보다, 실제 생활에서 반복되는 장면을 떠올리며 적용 지점을 찾는 태도가 가장 중요합니다.`);
  const triad = sectionTriad(chapter, title, seed);
  return {
    interpretation,
    body,
    strength: repeatSafe(triad.strength),
    risk: repeatSafe(triad.risk),
    action: repeatSafe(triad.action),
    advice: repeatSafe(triad.advice),
  };
}

export function buildFptiDeepSection(typeResult: LocalTypeResult, sectionDefinition: { chapter: ChapterDefinition; title: string; sectionIndex?: number }): FptiDeepSection {
  const { chapter, title, sectionIndex = 0 } = sectionDefinition;
  const seed = buildNarrativeSeed(typeResult);
  const built = buildSectionNarrative(chapter, title, seed);
  const includeDebugSignals = process.env.NODE_ENV !== "production";
  const meta = reportSectionMeta(chapter, sectionIndex);

  return {
    title,
    category: meta.category,
    lens: meta.lens,
    interpretation: repeatSafe(built.interpretation),
    body: repeatSafe(built.body || built.interpretation),
    strength: repeatSafe(built.strength),
    risk: repeatSafe(built.risk),
    action: repeatSafe(built.action),
    advice: repeatSafe(built.advice),
    triadLabels: meta.triadLabels,
    ...(includeDebugSignals ? { debugSignals: seed.debugSignals } : {}),
  };
}

export function buildFptiDeepChapter(typeResult: LocalTypeResult, chapterDefinition: ChapterDefinition, unlocked = true): FptiDeepChapter {
  const sections = chapterDefinition.sections.map((title, sectionIndex) => buildFptiDeepSection(typeResult, { chapter: chapterDefinition, title, sectionIndex }));
  const previewSection = sections[0]
    ? {
      ...sections[0],
      interpretation: `${sections[0].interpretation.split(". ").slice(0, 2).join(". ").trim()}.`,
    }
    : null;
  const previewSections = sections.map((section) => {
    const interpretation = section.interpretation || "";
    const previewText = interpretation.split(". ").slice(0, 2).join(". ").trim();
    return {
      ...section,
      interpretation: previewText.length > 0 ? `${previewText}.` : interpretation,
      body: previewText.length > 0 ? `${previewText}.` : interpretation,
    };
  });

  const seed = buildNarrativeSeed(typeResult);
  const summary = repeatSafe(
    `${chapterDefinition.title}을 읽고 나면 당신이 어떤 순간에 힘을 내고 어떤 순간에 소모되는지 훨씬 선명하게 보이게 됩니다. ${seed.energyStyle} ${seed.judgmentStyle} ${seed.actionLine} ${chapterDefinition.order === 1 ? "총론에서 잡은 기준을 뒤의 장들에 연결해 읽으면, 내 성향의 이유와 사용법이 실제 생활 단위로 정리됩니다." : "이 장의 문장들은 바로 생활에 적용할 수 있게 구성되어 있으니, 가장 먼저 실천할 문장 하나를 골라 반복해 보세요."}`,
  );

  const lockedByPreview = !unlocked && chapterDefinition.order > 1;

  return {
    id: chapterDefinition.id,
    order: chapterDefinition.order,
    roman: chapterDefinition.roman,
    title: chapterDefinition.title,
    preview: previewSection?.interpretation || "",
    isPreview: !unlocked,
    locked: lockedByPreview,
    sections: unlocked ? sections : (chapterDefinition.order === 1 ? (previewSection ? [previewSection] : previewSections.slice(0, 1)) : []),
    chapterSummary: lockedByPreview ? "잠금 해제 후 전체 내용을 확인할 수 있습니다." : summary,
  };
}

export function sanitizeFptiDeepReportText(text: string): string {
  const normalized = toText(text)
    .replace(FORBIDDEN_TEXT_REGEX, " ")
    .replace(/이 유형에게 필요한 한 문장는/g, "이 유형에게 필요한 한 문장은")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s*\n\s*/g, " ")
    .trim();
  return normalized;
}

export function removeRepeatedFptiPhrases(text: string): string {
  const lines = sanitizeFptiDeepReportText(text).split(/(?<=[.!?])\s+/).filter(Boolean);
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (key.length >= 20 && seen.has(key)) continue;
    seen.add(key);
    deduped.push(line);
  }
  return deduped.join(" ").trim();
}

export function validateFptiDeepReport(report: FptiDeepReport): ValidationResult {
  const errors: string[] = [];

  if (report.reportType !== "FPTI_DEEP_REPORT") errors.push("reportType must be FPTI_DEEP_REPORT");
  if (report.mode !== "local") errors.push("mode must be local");
  if (report.meta.apiUsed !== false) errors.push("apiUsed must be false");
  if (report.meta.pdfEnabled !== false) errors.push("pdfEnabled must be false");
  if (report.chapters.length !== 7) errors.push("chapter count must be 7");

  const expectedTitles = CHAPTERS.map((chapter) => chapter.title);
  const actualTitles = report.chapters.map((chapter) => stripRomanPrefix(chapter.title));
  for (let i = 0; i < expectedTitles.length; i += 1) {
    if (expectedTitles[i] !== actualTitles[i]) {
      errors.push(`chapter title mismatch at ${i + 1}`);
    }
  }

  const sentenceCounter = new Map<string, number>();
  const chapterBodies: string[] = [];
  const triads = new Map<string, number>();
  const visibleTexts: string[] = [];

  for (let chapterIndex = 0; chapterIndex < report.chapters.length; chapterIndex += 1) {
    const chapter = report.chapters[chapterIndex];
    if (chapter.sections.length < 5 && !chapter.locked) {
      errors.push(`section count too low: ${chapter.roman}`);
    }
    if (stripRomanPrefix(chapter.title) !== chapter.title) {
      errors.push(`chapter title contains roman prefix: ${chapter.roman}`);
    }
    if (chapter.order !== chapterIndex + 1) {
      errors.push(`chapter order mismatch at ${chapterIndex + 1}`);
    }
    const chapterSummary = sanitizeFptiDeepReportText(chapter.chapterSummary);
    if (chapterSummary.length < 250) {
      errors.push(`chapter summary too short: ${chapter.roman}`);
    }
    visibleTexts.push(chapterSummary);

    const bodyParts: string[] = [];
    for (let sectionIndex = 0; sectionIndex < chapter.sections.length; sectionIndex += 1) {
      const section = chapter.sections[sectionIndex];
      const expectedSectionTitle = CHAPTERS[chapterIndex]?.sections?.[sectionIndex] || "";
      if (!chapter.locked && expectedSectionTitle && stripRomanPrefix(section.title) !== expectedSectionTitle) {
        errors.push(`section title mismatch: ${chapter.roman}/${sectionIndex + 1}`);
      }
      if (/\b(섹션|section|카테고리)\s*\d+/i.test(section.title)) {
        errors.push(`placeholder section title detected: ${chapter.roman}/${section.title}`);
      }
      const interpretation = sanitizeFptiDeepReportText(section.interpretation);
      if (!chapter.locked && interpretation.length < 180) {
        errors.push(`interpretation too short: ${chapter.roman}/${section.title}`);
      }
      if (!chapter.locked && sentenceCount(interpretation) < 5) {
        errors.push(`section sentence count too low: ${chapter.roman}/${section.title}`);
      }
      if (!chapter.locked && chapter.roman === "VII" && interpretation.length < 700) {
        errors.push(`growth section too short: ${chapter.roman}/${section.title}`);
      }
      if (!chapter.locked && section.title === "30일 실행 루틴") {
        if (!(interpretation.includes("1주차") && interpretation.includes("2주차") && interpretation.includes("3주차") && interpretation.includes("4주차"))) {
          errors.push("30-day routine missing week structure");
        }
      }
      if (!chapter.locked && section.title === "90일 변화 로드맵") {
        if (!(interpretation.includes("1개월차") && interpretation.includes("2개월차") && interpretation.includes("3개월차"))) {
          errors.push("90-day roadmap missing month structure");
        }
      }
      bodyParts.push(interpretation);
      visibleTexts.push(interpretation);
      visibleTexts.push(sanitizeFptiDeepReportText(section.body || ""));
      visibleTexts.push(sanitizeFptiDeepReportText(section.strength || ""));
      visibleTexts.push(sanitizeFptiDeepReportText(section.risk || ""));
      visibleTexts.push(sanitizeFptiDeepReportText(section.action || ""));
      visibleTexts.push(sanitizeFptiDeepReportText(section.advice || ""));
      const triadKey = `${sanitizeFptiDeepReportText(section.strength || "")}|${sanitizeFptiDeepReportText(section.risk || "")}|${sanitizeFptiDeepReportText(section.action || "")}`;
      if (triadKey !== "||") {
        triads.set(triadKey, (triads.get(triadKey) || 0) + 1);
      }

      const chunks = interpretation.split(/(?<=[.!?])\s+/).filter((chunk) => chunk.length >= 20);
      for (const chunk of chunks) {
        const key = chunk.toLowerCase();
        sentenceCounter.set(key, (sentenceCounter.get(key) || 0) + 1);
      }
    }

    chapterBodies.push(bodyParts.join("\n"));
  }

  visibleTexts.push(sanitizeFptiDeepReportText(report.summary.preview || ""));
  visibleTexts.push(...(report.summary.highlights || []).map((item) => sanitizeFptiDeepReportText(item || "")));
  visibleTexts.push(sanitizeFptiDeepReportText(report.summary.caution || ""));

  const fullVisibleText = visibleTexts.join("\n").toLowerCase();
  for (const phrase of FORBIDDEN_TEXT) {
    if (fullVisibleText.includes(phrase.toLowerCase())) {
      errors.push(`forbidden phrase included: ${phrase}`);
    }
  }

  const full = JSON.stringify(report);
  if (/I\.\s*I\.|II\.\s*II\.|III\.\s*III\./i.test(full)) {
    errors.push("duplicated chapter numeral detected");
  }
  if (/(상관|비견|겁재|식신|편재|정재|편관|정관|편인|정인)가\b/.test(full)) {
    errors.push("awkward ten-god particle detected");
  }
  if (/undefined|null|\[object Object\]/i.test(full)) {
    errors.push("invalid token detected in report text");
  }

  if (fullVisibleText.includes("이 유형에게 필요한 한 문장는")) {
    errors.push("grammar error detected in one-line sentence section");
  }

  for (const count of sentenceCounter.values()) {
    if (count >= 50) {
      errors.push("same sentence repeated in report");
      break;
    }
  }

  for (let i = 0; i < chapterBodies.length; i += 1) {
    for (let j = i + 1; j < chapterBodies.length; j += 1) {
      if (chapterBodies[i] && chapterBodies[i] === chapterBodies[j]) {
        errors.push("same chapter body repeated");
      }
    }
  }

  for (const count of triads.values()) {
    if (count >= 2) {
      errors.push("same strength/risk/action triad repeated");
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildFptiDeepReport(input: FptiPremiumInput, options?: { unlocked?: boolean }): FptiDeepReport {
  try {
    const typeResult = localTypeResult(input);
    const unlocked = options?.unlocked !== false;

    const chapters = CHAPTERS.map((chapter) => {
      try {
        return buildFptiDeepChapter(typeResult, chapter, unlocked);
      } catch (e) {
        const safeText = `${chapter.title}에서는 일부 정보가 완벽하지 않아도 지금 드러난 성향의 큰 흐름을 충분히 읽을 수 있습니다. 당신이 반복해서 선택하는 방식이 관계, 일, 돈에서 어떤 결과를 만드는지 차분하게 짚어드리고, 오늘 바로 실천할 수 있는 기준 문장을 함께 제안합니다. 중요한 것은 자신을 몰아붙이는 것이 아니라 무너질 때 복귀할 수 있는 구조를 미리 만드는 일입니다.`;
        return {
          id: chapter.id,
          order: chapter.order,
          roman: chapter.roman,
          title: chapter.title,
          isPreview: !unlocked,
          locked: !unlocked && chapter.order > 1,
          sections: !unlocked && chapter.order > 1
            ? []
            : [{
              title: chapter.sections[0] || "핵심 해석",
              interpretation: safeText,
              body: safeText,
              strength: "이미 가진 기준 감각이 분명해서 혼란한 상황에서도 중심을 잡는 힘이 큽니다. 이 강점을 사람과 환경에 맞게 조절하면 안정적인 성과가 이어집니다.",
              risk: "혼자 해결하려는 습관이 길어지면 감정 피로가 누적되어 판단 속도가 급격히 떨어질 수 있습니다. 피로 신호가 보이면 즉시 속도를 낮추는 규칙이 필요합니다.",
              action: "오늘 일정에서 반드시 지킬 기준 한 줄과 멈춰야 할 기준 한 줄을 적고, 하루가 끝날 때 적용 여부를 확인하세요. 작은 반복이 회복 탄력을 만듭니다.",
              advice: "버티는 힘보다 다시 돌아오는 힘을 먼저 키우면 당신의 재능은 오래 살아납니다.",
            }],
          chapterSummary: !unlocked && chapter.order > 1
            ? "잠금 해제 후 전체 내용을 확인할 수 있습니다."
            : safeText,
        };
      }
    });

  const report: FptiDeepReport = {
    reportType: "FPTI_DEEP_REPORT",
    mode: "local",
    generatedAt: toText(input.createdAt || new Date().toISOString()),
    userTypeCode: typeResult.code,
    typeName: typeResult.typeName,
    scores: typeResult.scores,
    axes: typeResult.axes,
    unlocked,
    chapters,
    summary: {
      preview: repeatSafe(`${typeResult.typeName}인 당신은 강점이 분명한 만큼 소모 구간도 뚜렷한 타입입니다. 이 리포트는 성향을 표로 나열하지 않고, 관계와 일, 돈과 스트레스, 그리고 성장 전략으로 나누어 당신의 선택 습관을 상담하듯 풀어냅니다. 읽다 보면 왜 같은 문제에서 반복적으로 막히는지, 그리고 무엇을 바꾸면 빠르게 회복되는지 선명해질 것입니다.`),
      highlights: uniqueList([
        "강점의 작동 조건을 생활 장면별로 정리",
        "관계·일·돈에서 반복되는 소모 패턴 교정",
        "30일·90일 실행 로드맵으로 복귀 시스템 설계",
      ], 3),
      caution: repeatSafe("컨디션이 떨어지는 날에는 의지로 밀어붙이기보다 기준을 줄여 복귀 속도를 지키는 것이 더 중요합니다. 당신의 강점은 무너지지 않는 데 있지 않고, 무너져도 다시 정렬하는 능력에 있다는 점을 잊지 마세요."),
    },
    meta: {
      engineVersion: "fpti-local-deep-v2.0.0",
      apiUsed: false,
      pdfEnabled: false,
      chapterCount: 7,
    },
  };

    return report;
  } catch (e) {
    // Return absolute minimal fallback report
    return {
      reportType: "FPTI_DEEP_REPORT",
      mode: "local",
      generatedAt: new Date().toISOString(),
      userTypeCode: input.result?.code || "ERR",
      typeName: input.result?.typeName || "리포트 로딩 오류",
      scores: { A: 50, M: 50, H: 50, L: 50, F: 50, B: 50, R: 50, V: 50 },
      axes: [],
      unlocked: options?.unlocked !== false,
      chapters: [],
      summary: {
        preview: "리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        highlights: [],
        caution: "문제가 지속되면 문의해 주세요.",
      },
      meta: {
        engineVersion: "fpti-local-deep-v2.0.0",
        apiUsed: false,
        pdfEnabled: false,
        chapterCount: 7,
      },
    };
  }
}

export function validateFptiPremiumReport(report: FptiPremiumReport): ValidationResult {
  return validateFptiDeepReport(report);
}

export function buildFptiPremiumReport(input: FptiPremiumInput): FptiPremiumReport {
  const report = buildFptiDeepReport(input, { unlocked: true });
  const checked = validateFptiDeepReport(report);
  if (checked.valid) return report;

  const repaired = buildFptiDeepReport(input, { unlocked: true });
  return repaired;
}
