/**
 * 운명의 업 리포트 정규화 어댑터.
 *
 * 구 16장(3체계, schemaVersion 1)과 신 15장(다섯 렌즈, schemaVersion 2)이 DB 에 함께 남는다.
 * 렌더 트리 곳곳에 `if (chapter.leadLens)` 를 흩뿌리는 대신, 모든 신규 필드 접근을 이 한
 * 곳에 통과시킨다. 화면은 정규화된 결과만 보므로 어느 판이 오든 깨지지 않는다.
 */

export type KarmaChapter = {
  id: string;
  order: number;
  title: string;
  content: string;
  summary?: string;
  keyTakeaways?: string[];
  highlightQuotes?: string[];
  charCount?: number;
  /* schemaVersion 2 전용 — 구 문서에는 없다. */
  symbol?: string;
  leadLens?: string;
  supportLens?: string[];
  evidence?: EvidenceItem[] | null;
  energyScore?: EnergyScore | null;
};

export type EvidenceItem = {
  lens: string;
  lensLabel: string;
  path: string;
  value: string;
  confidence?: string;
  provisional?: boolean;
};

export type EnergyScore = {
  domain: string;
  label: string;
  value: number;
  basis?: string;
};

export type LensContributionEntry = {
  label: string;
  role?: string;
  score: number;
  basis?: { coverage?: number; usageWeight?: number; density?: number; confidence?: string };
  formula?: string;
};

export type KarmaResult = {
  ok: boolean;
  sessionId?: string;
  reportId?: string;
  attemptId?: string;
  status?: "generating" | "completed" | "generation_failed" | string;
  generatedAt?: string;
  totalCharCount?: number;
  schemaVersion?: number;
  lensContribution?: Record<string, LensContributionEntry> | null;
  lensAvailability?: Record<string, { label?: string; confidence?: string }> | null;
  userInput?: {
    name?: string;
    gender?: string;
    birthDate?: string;
    birthTime?: string;
    calendarType?: string;
    birthPlace?: { city?: string; country?: string; timezone?: string };
    topic?: string;
    question?: string;
  };
  summaryCards?: { keywords?: string[]; repeatingPattern?: string; currentTask?: string } | null;
  integratedResult?: Record<string, unknown> | null;
  chapters?: KarmaChapter[];
  finalLetter?: string;
  qualityCheck?: { passed?: boolean; totalCharCount?: number; chapterCount?: number; promptLeakDetected?: boolean } | null;
  generationProgress?: {
    totalChapters?: number;
    completedChapters?: number;
    currentChapterTitle?: string;
    percent?: number;
    stageLabel?: string;
    stageIndex?: number;
    totalStages?: number;
  };
  message?: string;
  reason?: string;
};

export const LENS_ORDER = ["saju", "ziwei", "sukuyo", "western", "vedic"] as const;
export type LensKey = (typeof LENS_ORDER)[number];

export const LENS_LABELS: Record<string, string> = {
  saju: "사주명리",
  ziwei: "자미두수",
  sukuyo: "숙요 27수",
  western: "서양 점성술",
  vedic: "베다 점성술",
  synthesis: "관점 교차",
};

/** 구 3체계 리포트가 실제로 계산했던 축. 5축에 0 두 개를 채우지 않기 위한 목록이다. */
const LEGACY_LENS_ORDER: LensKey[] = ["saju", "western", "vedic"];

const SYNTHESIS_CHAPTER_ID = "chapter-13";
const KEY_SENTENCES_CHAPTER_ID = "chapter-14";
const FINAL_LETTER_CHAPTER_ID = "chapter-15";

export type ChapterRole = "synthesis" | "keyLines" | "letter" | "category";

export type RadarModel =
  | { kind: "five"; axes: Array<{ key: string; label: string; score: number; entry: LensContributionEntry }> }
  | { kind: "three"; axes: Array<{ key: string; label: string; score: number; entry: LensContributionEntry }> }
  | { kind: "none" };

export type TimelineNode = { id: string; label: string; detail: string; source: string };

export type NormalizedReport = {
  schema: "v1" | "v2";
  chapters: KarmaChapter[];
  /** 최상단 운명의 핵심 문장. */
  heroSentence: string;
  /** 3단 AI 종합 결론 — v1 은 null(섹션 자체를 렌더하지 않는다). */
  synthesis: KarmaChapter | null;
  /** 5단 카테고리 카드. */
  categories: KarmaChapter[];
  /** 7단 오늘 기억해야 할 문장 풀. */
  keyLines: string[];
  /** 6단 하단 클로징 편지. */
  letter: KarmaChapter | null;
  /** 6단 행동 전략 체크리스트. */
  actionItems: string[];
  energyScores: EnergyScore[];
  radar: RadarModel;
  timeline: TimelineNode[];
};

function text(value: unknown, max = 0): string {
  const raw = String(value ?? "").trim();
  return max > 0 ? raw.slice(0, max) : raw;
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function chapterRole(chapter: KarmaChapter, schema: "v1" | "v2"): ChapterRole {
  if (schema === "v1") {
    // 구 16장에는 종합 결론·핵심 문장 장이 없다. 마지막 장만 편지로 인정한다.
    return chapter.order === 16 || chapter.title.includes("최종 편지") ? "letter" : "category";
  }
  if (chapter.id === SYNTHESIS_CHAPTER_ID) return "synthesis";
  if (chapter.id === KEY_SENTENCES_CHAPTER_ID) return "keyLines";
  if (chapter.id === FINAL_LETTER_CHAPTER_ID) return "letter";
  return "category";
}

/** 핵심 문장 장의 본문에서 기억할 문장 10개를 뽑는다. 번호·불릿·따옴표 어느 형태든 받는다. */
function extractKeyLines(chapter: KarmaChapter | null): string[] {
  if (!chapter) return [];
  const quotes = list<string>(chapter.highlightQuotes).map((item) => text(item)).filter(Boolean);
  const fromBody = text(chapter.content)
    .split(/\n+/)
    .map((line) => text(line).replace(/^[\s\-•*]*(?:\d{1,2}[.)]\s*)?/, "").replace(/^["“”'']|["“”'']$/g, ""))
    .filter((line) => line.length >= 8 && line.length <= 140)
    // 설명 문단이 섞여 들어오지 않도록 한 문장 길이의 줄만 남긴다.
    .filter((line) => (line.match(/[.!?。]/g) || []).length <= 1);
  const merged: string[] = [];
  for (const line of [...quotes, ...fromBody]) {
    if (!merged.includes(line)) merged.push(line);
    if (merged.length >= 12) break;
  }
  return merged;
}

/**
 * 오늘의 문장은 **날짜 기반 결정론**으로 고른다.
 * 난수를 쓰면 같은 리포트를 다시 열 때마다 문장이 바뀌어, 재열람하는 사용자에게는
 * 리포트가 흔들리는 것처럼 보인다.
 */
export function pickTodayLine(lines: string[], now: Date = new Date()): string {
  if (!lines.length) return "";
  return lines[now.getDate() % lines.length];
}

function normalizeRadar(result: KarmaResult, schema: "v1" | "v2"): RadarModel {
  const contribution = result.lensContribution || null;
  const toAxis = (key: string) => {
    const entry = contribution?.[key];
    if (!entry) return null;
    const score = Number(entry.score);
    if (!Number.isFinite(score)) return null;
    return { key, label: text(entry.label) || LENS_LABELS[key] || key, score, entry };
  };

  if (contribution) {
    const axes = LENS_ORDER.map(toAxis).filter((axis): axis is NonNullable<typeof axis> => Boolean(axis));
    if (axes.length >= 3) return { kind: "five", axes };
  }

  // 구 리포트 폴백 — 실제로 계산했던 세 축만 삼각형으로 그린다.
  // 5축에 0 을 두 개 채우면 "측정 안 함"과 "기여 0"이 같아 보여 거짓말이 된다.
  if (schema === "v1" && result.integratedResult) {
    const legacyKeys: Record<LensKey, string> = {
      saju: "saju", western: "westernAstrology", vedic: "vedicAstrology", ziwei: "", sukuyo: "",
    };
    const axes = LEGACY_LENS_ORDER.map((key) => {
      const raw = (result.integratedResult as Record<string, unknown>)[legacyKeys[key]];
      if (!raw || typeof raw !== "object") return null;
      const limited = (raw as { calculationLimited?: boolean }).calculationLimited === true;
      const score = limited ? 55 : 100;
      return {
        key,
        label: LENS_LABELS[key],
        score,
        entry: {
          label: LENS_LABELS[key],
          score,
          basis: { confidence: limited ? "provisional" : "full" },
          formula: "이 리포트는 세 관점 기준으로 작성되어 계산 가용성만 표시합니다.",
        } as LensContributionEntry,
      };
    }).filter((axis): axis is NonNullable<typeof axis> => Boolean(axis));
    if (axes.length >= 3) return { kind: "three", axes };
  }

  return { kind: "none" };
}

/** 운명 지도 — 3장(현재 흐름)·11장(전환점)의 시기 근거에서 만든다. 근거가 없으면 빈 배열이다. */
function buildTimeline(chapters: KarmaChapter[]): TimelineNode[] {
  const sourceIds = ["chapter-03", "chapter-11"];
  const nodes: TimelineNode[] = [];
  for (const chapter of chapters) {
    if (!sourceIds.includes(chapter.id)) continue;
    for (const item of list<EvidenceItem>(chapter.evidence)) {
      const value = text(item.value);
      if (!value) continue;
      nodes.push({
        id: `${chapter.id}:${item.path}`,
        label: text(item.lensLabel) || LENS_LABELS[item.lens] || item.lens,
        detail: value.length > 120 ? `${value.slice(0, 120)}…` : value,
        source: `${chapter.order}장 ${chapter.title}`,
      });
    }
  }
  return nodes.slice(0, 6);
}

export function normalizeReport(result: KarmaResult | null): NormalizedReport | null {
  if (!result) return null;
  const chapters = [...list<KarmaChapter>(result.chapters)].sort((a, b) => Number(a.order) - Number(b.order));
  // schemaVersion 이 없던 시절 문서도 있으므로 leadLens 유무로 한 번 더 확인한다.
  const schema: "v1" | "v2" = Number(result.schemaVersion) >= 2 || chapters.some((chapter) => text(chapter.leadLens))
    ? "v2"
    : "v1";

  const byRole = (role: ChapterRole) => chapters.filter((chapter) => chapterRole(chapter, schema) === role);
  const synthesis = byRole("synthesis")[0] || null;
  const keyLinesChapter = byRole("keyLines")[0] || null;
  const letter = byRole("letter")[byRole("letter").length - 1] || null;
  const categories = byRole("category");

  const keyLines = keyLinesChapter
    ? extractKeyLines(keyLinesChapter)
    // v1 에는 핵심 문장 장이 없다. 전 장의 인용구 풀로 대체한다.
    : chapters.flatMap((chapter) => list<string>(chapter.highlightQuotes)).map((item) => text(item)).filter(Boolean).slice(0, 12);

  const heroSentence = keyLines[0]
    || text(result.summaryCards?.repeatingPattern)
    || text(chapters[0]?.highlightQuotes?.[0])
    || "다섯 관점이 함께 가리키는 하나의 흐름을 읽었습니다.";

  const actionItems: string[] = [];
  for (const chapter of categories) {
    for (const item of list<string>(chapter.keyTakeaways)) {
      const value = text(item);
      if (value && !actionItems.includes(value)) actionItems.push(value);
      if (actionItems.length >= 12) break;
    }
    if (actionItems.length >= 12) break;
  }

  const energyScores = chapters
    .map((chapter) => chapter.energyScore)
    .filter((score): score is EnergyScore => Boolean(score && Number.isFinite(Number(score.value))));

  return {
    schema,
    chapters,
    heroSentence,
    synthesis,
    categories,
    keyLines,
    letter,
    actionItems,
    energyScores,
    radar: normalizeRadar(result, schema),
    timeline: buildTimeline(chapters),
  };
}

export function buildChapterText(chapter: KarmaChapter): string {
  const takeaways = list<string>(chapter.keyTakeaways).filter(Boolean).slice(0, 3);
  return [
    `${chapter.order}장. ${chapter.title}`,
    "",
    chapter.content,
    "",
    "이번 장의 핵심",
    ...takeaways.map((item) => `- ${item}`),
  ].filter(Boolean).join("\n");
}
