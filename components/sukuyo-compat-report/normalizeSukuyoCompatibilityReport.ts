import type {
  SukuyoChapterId,
  SukuyoCompatibilityChapterMap,
  SukuyoCompatibilityReportData,
} from "../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";

const CHAPTER_ORDER: readonly SukuyoChapterId[] = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII",
  "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI",
];

const CHAPTER_TITLES: Record<SukuyoChapterId, string> = {
  I: "I. 두 사람의 숙요 궁합 총론",
  II: "II. 27숙 개별 성향 분석",
  III: "III. 숙요 관계 유형 분석",
  IV: "IV. 거리 관계 분석",
  V: "V. 첫 끌림과 운명적 인연감",
  VI: "VI. 감정 궁합",
  VII: "VII. 연애 궁합",
  VIII: "VIII. 결혼 궁합",
  IX: "IX. 갈등 구조 분석",
  X: "X. 안괴·위험 관계 집중 분석",
  XI: "XI. 영친·업태·우쇠 관계 집중 분석",
  XII: "XII. 속궁합과 친밀감",
  XIII: "XIII. 재회·이별·미련 분석",
  XIV: "XIV. 관계의 시기와 흐름",
  XV: "XV. 현실 궁합",
  XVI: "XVI. 최종 궁합 리포트",
};

function safeText(value: unknown, fallback: string): string {
  const v = String(value || "").trim();
  if (!v || v === "about:blank" || v.startsWith("{") || v.startsWith("[")) return fallback;
  return v;
}

function dedupeOrder(order: readonly SukuyoChapterId[] | undefined): SukuyoChapterId[] {
  const source = Array.isArray(order) && order.length ? order : CHAPTER_ORDER;
  const seen = new Set<string>();
  const out: SukuyoChapterId[] = [];
  for (const id of source) {
    if (!CHAPTER_ORDER.includes(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of CHAPTER_ORDER) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function normalizeWarnings(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of input) {
    const text = String(value || "").trim();
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function normalizeRecordChapter<
  TChapterId extends Exclude<SukuyoChapterId, "I" | "II">,
  TCategoryKey extends string,
>(
  id: TChapterId,
  chapter: { headline?: unknown; warnings?: unknown; categories?: Record<string, unknown> } | undefined,
  fallbackUsed: { value: boolean },
  categoryKeys: readonly TCategoryKey[],
): {
  chapterId: TChapterId;
  headline: string;
  warnings: string[];
  categories: Record<TCategoryKey, string>;
} {
  const fallbackTitle = CHAPTER_TITLES[id];
  const headline = safeText(chapter?.headline, fallbackTitle);
  if (headline === fallbackTitle && (!chapter?.headline || String(chapter.headline).trim() !== fallbackTitle)) {
    fallbackUsed.value = true;
  }
  const source = chapter?.categories && typeof chapter.categories === "object" ? chapter.categories : {};
  const categories = {} as Record<TCategoryKey, string>;
  for (const key of categoryKeys) {
    categories[key] = safeText(source[key], "해당 챕터 해석 데이터를 준비 중입니다.");
  }
  const warnings = normalizeWarnings(chapter?.warnings);

  return {
    chapterId: id,
    headline,
    categories,
    warnings,
  };
}

export function normalizeSukuyoCompatibilityReport(
  report: SukuyoCompatibilityReportData,
): SukuyoCompatibilityReportData {
  const fallbackUsed = { value: false };

  const chapterOrder = dedupeOrder(report.chapterOrder);

  const chapterI = {
    chapterId: "I" as const,
    headline: safeText(report.chapters?.I?.headline, CHAPTER_TITLES.I),
    warnings: normalizeWarnings(report.chapters?.I?.warnings),
    categories: {
      profileA: safeText(report.chapters?.I?.categories?.profileA, "A 기본 정보가 누락되어 요약을 제한적으로 제공합니다."),
      profileB: safeText(report.chapters?.I?.categories?.profileB, "B 기본 정보가 누락되어 요약을 제한적으로 제공합니다."),
      relationTypeSummary: safeText(report.chapters?.I?.categories?.relationTypeSummary, "관계 유형 원시 데이터가 부족합니다."),
      distanceSummary: safeText(report.chapters?.I?.categories?.distanceSummary, "거리 관계 데이터가 부족합니다."),
      totalStrength: safeText(report.chapters?.I?.categories?.totalStrength, "관계 강도 산출값이 부족합니다."),
      oneLineReview: safeText(report.chapters?.I?.categories?.oneLineReview, "한 줄 총평을 생성할 수 없어 기본 가이드를 제공합니다."),
    },
  };

  const chapterII = {
    chapterId: "II" as const,
    headline: safeText(report.chapters?.II?.headline, CHAPTER_TITLES.II),
    warnings: normalizeWarnings(report.chapters?.II?.warnings),
    categories: {
      personAEssence: safeText(report.chapters?.II?.categories?.personAEssence, "A 성향 데이터가 누락되었습니다."),
      personBEssence: safeText(report.chapters?.II?.categories?.personBEssence, "B 성향 데이터가 누락되었습니다."),
      temperamentGap: safeText(report.chapters?.II?.categories?.temperamentGap, "기질 차이 분석값이 누락되었습니다."),
      unfamiliarPoints: safeText(report.chapters?.II?.categories?.unfamiliarPoints, "낯설게 느껴지는 지점 분석값이 누락되었습니다."),
      attractionPoints: safeText(report.chapters?.II?.categories?.attractionPoints, "매력 포인트 분석값이 누락되었습니다."),
    },
  };

  const chapters: SukuyoCompatibilityChapterMap = {
    I: chapterI,
    II: chapterII,
    III: normalizeRecordChapter("III", report.chapters?.III, fallbackUsed, ["relationTypeCore", "roleDynamics", "emotionalPattern", "conflictTrigger", "operationStrategy"]),
    IV: normalizeRecordChapter("IV", report.chapters?.IV, fallbackUsed, ["distanceType", "attractionEffect", "stabilityEffect", "riskEffect", "distanceControl"]),
    V: normalizeRecordChapter("V", report.chapters?.V, fallbackUsed, ["firstImpression", "instinctivePull", "fateSignal", "misunderstandingRisk", "healthyApproach"]),
    VI: normalizeRecordChapter("VI", report.chapters?.VI, fallbackUsed, ["emotionalFlowA", "emotionalFlowB", "mismatchPoint", "recoveryDialogue", "stabilizationRule"]),
    VII: normalizeRecordChapter("VII", report.chapters?.VII, fallbackUsed, ["datingFlow", "contactStyle", "affectionLanguage", "jealousyBoundary", "longTermCondition"]),
    VIII: normalizeRecordChapter("VIII", report.chapters?.VIII, fallbackUsed, ["marriagePotential", "lifeStyleFit", "financeFit", "familyIssueFit", "preMarriageChecklist"]),
    IX: normalizeRecordChapter("IX", report.chapters?.IX, fallbackUsed, ["coreConflict", "escalationPattern", "trustBreakPoint", "deescalationDialogue", "repairProtocol"]),
    X: normalizeRecordChapter("X", report.chapters?.X, fallbackUsed, ["riskRelationFlag", "attractionVsDamage", "weakRole", "stopSignal", "safeDistanceRule"]),
    XI: normalizeRecordChapter("XI", report.chapters?.XI, fallbackUsed, ["longBondType", "growthCondition", "fatiguePattern", "sustainableRule", "maturityStrategy"]),
    XII: normalizeRecordChapter("XII", report.chapters?.XII, fallbackUsed, ["bodyChemistry", "emotionalIntimacy", "paceGap", "boundaryRule", "warmRoutine"]),
    XIII: normalizeRecordChapter("XIII", report.chapters?.XIII, fallbackUsed, ["breakupRisk", "lingeringSide", "reunionChance", "reunionCondition", "closureStrategy"]),
    XIV: normalizeRecordChapter("XIV", report.chapters?.XIV, fallbackUsed, ["strengthenWindow", "cautionWindow", "commitTiming", "conflictTiming", "timingPlaybook"]),
    XV: normalizeRecordChapter("XV", report.chapters?.XV, fallbackUsed, ["moneyReality", "workReality", "familyReality", "lifePatternReality", "livingRule"]),
    XVI: normalizeRecordChapter("XVI", report.chapters?.XVI, fallbackUsed, ["totalSummary", "biggestStrength", "biggestRisk", "finalStrategy", "finalKeyword"]),
  };

  const missingFields = Array.isArray(report.integrity?.missingFields)
    ? Array.from(new Set(report.integrity.missingFields.map((v) => String(v || "").trim()).filter(Boolean)))
    : [];

  if (missingFields.length) fallbackUsed.value = true;

  return {
    ...report,
    mode: "compatibility",
    chapterOrder,
    chapters,
    integrity: {
      antiLoopHash: safeText(report.integrity?.antiLoopHash, `sukuyo-compat-${Date.now()}`),
      fallbackUsed: Boolean(report.integrity?.fallbackUsed) || fallbackUsed.value,
      missingFields,
      generatedAt: safeText(report.integrity?.generatedAt, new Date().toISOString()),
    },
  };
}
