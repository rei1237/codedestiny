/**
 * 결과 화면 ①~⑨ 정본 — 순서·제목·유무료 경계·서버 섹션 매핑을 한곳에 둔다.
 * 로더 라인·리포트 본문·잠금 CTA·(Phase 3)PDF 커버가 모두 여기를 참조한다.
 *
 * 서버(worker/lib/destiny-compass-report-contract.js)는 10섹션을 만든다.
 * 화면은 9칸이고, 체계별 4섹션(사주·자미·숙요·타로+베다)은 ③ '운명의 원인' 하나로 묶인다.
 *
 * title/teaser 는 DestinyCompassCopy(copy.ts)에서 로케일별로 온다 — 여기는 순서·kicker(영문 고정)·
 * 유무료 경계·서버 섹션 매핑만 소유한다.
 */
import type { DestinyCompassCopy } from "../_lib/copy";

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

interface ReportSectionMeta {
  id: ReportSectionId;
  order: number;
  kicker: string;
  tier: "free" | "paid";
  serverKeys: ServerSectionKey[];
}

const SECTION_META: readonly ReportSectionMeta[] = [
  { id: "coordinate", order: 1, kicker: "Where you are", tier: "free", serverKeys: ["opening"] },
  { id: "flow", order: 2, kicker: "The current", tier: "free", serverKeys: [] },
  {
    id: "cause", order: 3, kicker: "Why", tier: "paid",
    serverKeys: ["saju_reading", "ziwei_reading", "sukuyo_reading", "tarot_vara_reading"],
  },
  { id: "change", order: 4, kicker: "What changes", tier: "paid", serverKeys: ["timeline_reading"] },
  { id: "opportunity", order: 5, kicker: "Catch this", tier: "paid", serverKeys: ["opportunity_reading"] },
  { id: "avoid", order: 6, kicker: "Not now", tier: "paid", serverKeys: ["blocked_and_care"] },
  { id: "action", order: 7, kicker: "Do this", tier: "paid", serverKeys: ["action_plan"] },
  { id: "advice", order: 8, kicker: "All together", tier: "free", serverKeys: ["cross_synthesis"] },
  { id: "compass", order: 9, kicker: "Your bearing", tier: "free", serverKeys: [] },
] as const;

export const PAID_SECTION_IDS: readonly ReportSectionId[] = SECTION_META.filter((s) => s.tier === "paid").map((s) => s.id);

export function getReportSection(id: ReportSectionId, copy: DestinyCompassCopy): ReportSectionSpec {
  const meta = SECTION_META.find((s) => s.id === id);
  if (!meta) throw new Error(`unknown report section: ${id}`);
  return { ...meta, title: copy.sectionTitle[id], teaser: copy.sectionTeaser[id] };
}

/**
 * 처리 화면의 진행 라인 — 실제 어댑터가 하는 일만 적는다.
 * 🔴 베다는 판차앙가 중 '바라(요일 지배성)'만 계산한다. 예전 문구 "다샤를 정렬하는 중"은
 *    엔진이 하지 않는 일이었다. 서양 점성술 줄은 어댑터가 없어 아예 없앴다.
 */
const PROCESS_LINE_KEYS = ["saju", "ziwei", "sukuyo", "tarot", "vedic", "blend"] as const;

export function processLines(copy: DestinyCompassCopy): readonly { key: string; label: string }[] {
  return PROCESS_LINE_KEYS.map((key) => ({ key, label: copy.processLineLabel[key] }));
}
