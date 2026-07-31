/**
 * 결과 화면 ①~⑨ 정본 — 순서·제목·유무료 경계·서버 섹션 매핑을 한곳에 둔다.
 * 로더 라인·리포트 본문·잠금 CTA·(Phase 3)PDF 커버가 모두 여기를 참조한다.
 *
 * 서버(worker/lib/destiny-compass-report-contract.js)는 10섹션을 만든다.
 * 화면은 9칸이고, 체계별 4섹션(사주·자미·숙요·타로+베다)은 ③ '운명의 원인' 하나로 묶인다.
 */

/** 서버가 돌려주는 섹션 키. */
export type ServerSectionKey =
  | "opening"
  | "saju_reading"
  | "ziwei_reading"
  | "sukuyo_reading"
  | "tarot_vara_reading"
  | "cross_synthesis"
  | "timeline_reading"
  | "opportunity_reading"
  | "blocked_and_care"
  | "action_plan";

export type ReportSectionId =
  | "coordinate"
  | "flow"
  | "cause"
  | "change"
  | "opportunity"
  | "avoid"
  | "action"
  | "advice"
  | "compass";

export interface ReportSectionSpec {
  id: ReportSectionId;
  order: number;
  /** 화면 제목 */
  title: string;
  /** 제목 위 작은 라벨 */
  kicker: string;
  /** free = 결제 없이 보이는 칸(결정론 계산 또는 무료 문장화) */
  tier: "free" | "paid";
  /** 이 칸을 채우는 서버 섹션. 비어 있으면 순수 결정론 렌더. */
  serverKeys: ServerSectionKey[];
  /** 잠금 상태에서 보여줄 두 줄 티저 */
  teaser: string;
}

export const REPORT_SECTIONS: readonly ReportSectionSpec[] = [
  {
    id: "coordinate", order: 1, title: "오늘의 운명 좌표", kicker: "Where you are",
    tier: "free", serverKeys: ["opening"],
    teaser: "지금 서 있는 자리를 한 문장으로.",
  },
  {
    id: "flow", order: 2, title: "현재의 흐름", kicker: "The current",
    tier: "free", serverKeys: [],
    teaser: "여덟 방향의 기세가 지금 어떻게 기울어 있는지.",
  },
  {
    id: "cause", order: 3, title: "운명의 원인", kicker: "Why",
    tier: "paid",
    serverKeys: ["saju_reading", "ziwei_reading", "sukuyo_reading", "tarot_vara_reading"],
    teaser: "사주·자미두수·숙요·타로가 각각 무엇을 보고 이 결론에 닿았는지, 체계별로 따로 읽습니다.",
  },
  {
    id: "change", order: 4, title: "앞으로 다가오는 변화", kicker: "What changes",
    tier: "paid", serverKeys: ["timeline_reading"],
    teaser: "30일·90일·1년·3년, 구간마다 무엇이 달라지는지.",
  },
  {
    id: "opportunity", order: 5, title: "반드시 잡아야 하는 기회", kicker: "Catch this",
    tier: "paid", serverKeys: ["opportunity_reading"],
    teaser: "무엇을·언제쯤·어느 근거에서. 알아볼 수 있는 형태로.",
  },
  {
    id: "avoid", order: 6, title: "피해야 하는 선택", kicker: "Not now",
    tier: "paid", serverKeys: ["blocked_and_care"],
    teaser: "막힌 자리를 억지로 밀지 않으면서 회복시키는 법.",
  },
  {
    id: "action", order: 7, title: "행동 가이드", kicker: "Do this",
    tier: "paid", serverKeys: ["action_plan"],
    teaser: "오늘·이번 주·이번 달로 나눈 손에 잡히는 행동.",
  },
  {
    id: "advice", order: 8, title: "종합 조언", kicker: "All together",
    tier: "free", serverKeys: ["cross_synthesis"],
    teaser: "다섯 체계가 겹치는 지점과 엇갈리는 지점.",
  },
  {
    id: "compass", order: 9, title: "운명의 나침반", kicker: "Your bearing",
    tier: "free", serverKeys: [],
    teaser: "지금 여기, 그리고 가야 할 방향.",
  },
] as const;

export const PAID_SECTION_IDS: readonly ReportSectionId[] = REPORT_SECTIONS.filter((s) => s.tier === "paid").map((s) => s.id);

export function getReportSection(id: ReportSectionId): ReportSectionSpec {
  const found = REPORT_SECTIONS.find((s) => s.id === id);
  if (!found) throw new Error(`unknown report section: ${id}`);
  return found;
}

/**
 * 처리 화면의 진행 라인 — 실제 어댑터가 하는 일만 적는다.
 * 🔴 베다는 판차앙가 중 '바라(요일 지배성)'만 계산한다. 예전 문구 "다샤를 정렬하는 중"은
 *    엔진이 하지 않는 일이었다. 서양 점성술 줄은 어댑터가 없어 아예 없앴다.
 */
export const PROCESS_LINES: readonly { key: string; label: string }[] = [
  { key: "saju", label: "명식을 세우는 중" },
  { key: "ziwei", label: "12궁을 펼치는 중" },
  { key: "sukuyo", label: "본명숙을 잇는 중" },
  { key: "tarot", label: "오늘의 카드를 뽑는 중" },
  { key: "vedic", label: "바라(요일 지배성)를 세는 중" },
  { key: "blend", label: "방향을 종합하는 중" },
];
