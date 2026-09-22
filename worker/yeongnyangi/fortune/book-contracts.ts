import type { DomainContext, DomainId, FishId } from "./shared/contracts";
export const BOOK_VERSION = "destiny-book-v2";
export type Theme =
  | "self"
  | "wealth"
  | "love"
  | "career"
  | "relations"
  | "timing"
  | "cross"
  | "action";
export interface ChapterSpec {
  version?: string;
  key?: string;
  tier?: import('./shared/contracts').PackageId;
  factSelectors?: Partial<Record<DomainId, string[]>>;
  excludes?: string[];
  minimumChars?: number;
  targetChars?: [number, number];
  requiredSections?: string[];
  outputTokens?: number;
  systems?:DomainId[];
  factIds?:string[];
  focus?:string;
  periodScope?:string;
  id: string;
  title: string;
  part: string;
  theme: Theme;
  ordinal: number;
}
export interface ChapterBody {
  questionAnswers?: { questionId: string; answer: string; reason: string; timing: string; action: string }[];
  blocks?: { title: string; paragraphs: string[] }[];
  summary: string;
  analysis: string[];
  example: string;
  advice: string;
  highlights: string[];
  sources: string[];
  persona: string;
  topics: string[];
}
export interface Signal {
  theme: Theme;
  domain: DomainId;
  direction: "support" | "tension";
  source: string;
  label: string;
}
export interface MasterAnalysis {
  consultation?: import('./consultation').Consultation;
  readingMode?: string;
  topicId?:string;
  question?:string;
  asOf?:string;
  contexts: Partial<Record<DomainId, DomainContext>>;
  signals: Signal[];
  themes: {
    theme: Theme;
    agreement: number;
    confidence: "limited" | "mixed" | "supported";
    sources: string[];
  }[];
}
const base = [
  "영냥이의 첫인상",
  "당신의 핵심 성향",
  "가장 강한 운",
  "가장 조심해야 할 운",
  "지금 가장 중요한 조언",
  "타고난 강점",
  "약점과 반복되는 실수",
  "연애 스타일",
  "재물 스타일",
  "직업과 적성",
  "인간관계",
  "가까운 미래 흐름",
  "영냥이의 현실적인 조언",
  "인생 전체 구조",
  "어린 시절의 흐름",
  "20대의 흐름",
  "30대의 흐름",
  "40대의 흐름",
  "중년 이후",
  "돈을 버는 방식",
  "돈을 잃기 쉬운 패턴",
  "연애에서 만나는 사람의 유형",
  "결혼과 동반자",
  "커리어 전환 시기",
  "귀인과 관계의 경계",
  "강하게 움직일 시기",
  "기다릴 시기",
  "향후 중요 연도",
  "실행 전략",
  "영냥이 최종 정리",
];
const parts: [string, Theme, string[]][] = [
  [
    "당신이라는 사람",
    "self",
    [
      "영냥이가 처음 본 당신",
      "타고난 본질",
      "겉으로 보이는 모습",
      "아무도 모르는 내면",
      "욕망",
      "두려움",
      "재능",
      "약점",
      "반복되는 인생 패턴",
      "행복해지는 조건",
    ],
  ],
  [
    "돈",
    "wealth",
    [
      "재물 그릇",
      "돈을 버는 방식",
      "돈을 잃는 방식",
      "직장에서의 수입",
      "사업과 자원",
      "투자 성향",
      "집과 자산을 대하는 태도",
      "큰돈이 움직이는 시기",
      "재정적 주의 시기",
      "평생 재물 전략",
    ],
  ],
  [
    "사랑",
    "love",
    [
      "연애 성향",
      "사랑에 빠지는 과정",
      "끌리는 사람",
      "거리를 둘 관계",
      "관계의 변화와 경계",
      "장기 연애",
      "결혼",
      "배우자와의 생활",
      "인연을 살피는 시기",
      "사랑에서 반복되는 문제",
    ],
  ],
  [
    "직업과 성공",
    "career",
    [
      "천직의 단서",
      "조직 생활",
      "창업",
      "리더십",
      "사회적 주목",
      "전문성을 쌓는 방식",
      "돈과 명예",
      "성공을 막는 패턴",
      "역량을 펼칠 시기",
      "커리어 전략",
    ],
  ],
  [
    "인간관계",
    "relations",
    [
      "친구",
      "가족",
      "직장 인간관계",
      "귀인",
      "관계의 경계",
      "경쟁자",
      "사람들이 나를 보는 방식",
    ],
  ],
  [
    "시간",
    "timing",
    [
      "과거의 흐름",
      "현재의 흐름",
      "가까운 미래",
      "1년 흐름",
      "3년 흐름",
      "5년 흐름",
      "10년 흐름",
      "인생의 주요 전환점",
    ],
  ],
  [
    "다중 점술 교차분석",
    "cross",
    [
      "사주가 말하는 나",
      "자미두수가 말하는 나",
      "숙요가 말하는 나",
      "베다점이 말하는 나",
      "네 체계의 공통점",
      "서로 다른 해석",
      "근거가 겹치는 신호",
      "운명의 공통 패턴",
    ],
  ],
  [
    "영냥이의 결론",
    "action",
    [
      "살펴볼 기회",
      "피해야 할 선택",
      "변화를 만드는 행동",
      "지금 당장 할 일",
      "앞으로 1년 체크리스트",
      "인생 키워드",
      "최종 운명 요약",
    ],
  ],
];
function theme(title: string): Theme {
  return /돈|재물/.test(title)
    ? "wealth"
    : /연애|결혼/.test(title)
      ? "love"
      : /직업|커리어/.test(title)
        ? "career"
        : /관계|귀인/.test(title)
          ? "relations"
          : /시기|흐름|대의|이후|연도/.test(title)
            ? "timing"
            : /조언|전략|정리/.test(title)
              ? "action"
              : "self";
}
export function chapterManifest(tier: FishId): ChapterSpec[] {
  const rows =
    tier === "tuna"
      ? parts.flatMap(([part, theme, titles]) =>
          titles.map((title) => ({ part, theme, title })),
        )
      : base
          .slice(0, { mackerel: 5, salmon: 13, flounder: 30 }[tier])
          .map((title) => ({ title, part: "나의 운세", theme: theme(title) }));
  return rows.map((r, i) => ({
    ...r,
    id: `${tier}-${String(i + 1).padStart(2, "0")}`,
    ordinal: i,
  }));
}
