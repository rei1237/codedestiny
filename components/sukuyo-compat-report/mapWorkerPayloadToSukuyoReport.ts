import type {
  SukuyoChapterId,
  SukuyoCompatibilityReportData,
  SukuyoRecordChapterData,
} from "../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";
import type {
  WorkerSukuyoCompatibilityAssembledPayload,
  WorkerSukuyoChapterResponse,
} from "../../types/sukuyo-compat-report/sukuyoCompatibilityWorkerContract.types";

const ORDER: readonly SukuyoChapterId[] = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII",
  "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI",
];

const TITLES: Record<SukuyoChapterId, string> = {
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
  const text = String(value || "").trim();
  if (!text || text === "about:blank" || text.startsWith("{") || text.startsWith("[")) return fallback;
  return text;
}

function toChapterId(input: number): SukuyoChapterId {
  const idx = Math.min(16, Math.max(1, Number(input || 1)));
  return ORDER[idx - 1];
}

function toRecordChapter(id: SukuyoChapterId, chapter: WorkerSukuyoChapterResponse | undefined): SukuyoRecordChapterData {
  const headline = safeText(chapter?.title || chapter?.chapterJson?.title, TITLES[id]);
  const sections = Array.isArray(chapter?.chapterJson?.sections) ? chapter.chapterJson.sections : [];
  const categories: Record<string, string> = {};

  if (sections.length) {
    sections.forEach((row, index) => {
      const key = `section${String(index + 1).padStart(2, "0")}`;
      categories[key] = safeText(row?.body || row?.title, "해당 챕터 해석 데이터를 준비 중입니다.");
    });
  } else {
    categories.section01 = safeText(chapter?.text, "해당 챕터 해석 데이터를 준비 중입니다.");
  }

  return {
    chapterId: id,
    headline,
    warnings: [],
    categories,
  };
}

function pickCategory(source: Record<string, string>, idx: number, fallback: string): string {
  return safeText(source[`section${String(idx).padStart(2, "0")}`], fallback);
}

function buildFixedChapter<
  TChapterId extends Exclude<SukuyoChapterId, "I" | "II">,
  TCategoryKey extends string,
>(
  id: TChapterId,
  chapter: WorkerSukuyoChapterResponse | undefined,
  categoryKeys: readonly TCategoryKey[],
): {
  chapterId: TChapterId;
  headline: string;
  warnings: string[];
  categories: Record<TCategoryKey, string>;
} {
  const base = toRecordChapter(id, chapter);
  const categories = {} as Record<TCategoryKey, string>;
  for (let i = 0; i < categoryKeys.length; i += 1) {
    const key = categoryKeys[i];
    categories[key] = pickCategory(base.categories, i + 1, "해당 챕터 해석 데이터를 준비 중입니다.");
  }
  return {
    chapterId: id,
    headline: base.headline,
    warnings: base.warnings,
    categories,
  };
}

export function mapWorkerPayloadToSukuyoReport(
  payload: WorkerSukuyoCompatibilityAssembledPayload,
): SukuyoCompatibilityReportData {
  const chaptersById = new Map<SukuyoChapterId, WorkerSukuyoChapterResponse>();
  const list = Array.isArray(payload?.chapters) ? payload.chapters : [];
  for (const chapter of list) {
    const id = toChapterId(Number(chapter?.chapterId || 0));
    chaptersById.set(id, chapter);
  }

  const ch01 = toRecordChapter("I", chaptersById.get("I"));
  const ch02 = toRecordChapter("II", chaptersById.get("II"));

  return {
    mode: "compatibility",
    chapterOrder: ORDER,
    personA: {
      input: {
        name: safeText(payload?.seed?.profileA?.name, "A"),
        gender: payload?.seed?.profileA?.gender === "M" ? "M" : (payload?.seed?.profileA?.gender === "F" ? "F" : ""),
        birthDate: safeText(payload?.seed?.profileA?.birthDate, "1900-01-01"),
        birthTime: safeText(payload?.seed?.profileA?.birthTime, "12:00"),
        calendarType: payload?.seed?.profileA?.calendarType === "lunar" ? "lunar" : "solar",
      },
      core: {
        mansionNameKo: "",
        mansionIndex: -1,
      },
    },
    personB: {
      input: {
        name: safeText(payload?.seed?.profileB?.name, "B"),
        gender: payload?.seed?.profileB?.gender === "M" ? "M" : (payload?.seed?.profileB?.gender === "F" ? "F" : ""),
        birthDate: safeText(payload?.seed?.profileB?.birthDate, "1900-01-01"),
        birthTime: safeText(payload?.seed?.profileB?.birthTime, "12:00"),
        calendarType: payload?.seed?.profileB?.calendarType === "lunar" ? "lunar" : "solar",
      },
      core: {
        mansionNameKo: "",
        mansionIndex: -1,
      },
    },
    raw: {
      relationType: safeText(payload?.seed?.raw?.relationType, "unknown"),
      relationRoleA: payload?.seed?.raw?.relationRoleA,
      relationRoleB: payload?.seed?.raw?.relationRoleB,
      distanceType: payload?.seed?.raw?.distanceType || "unknown",
      distanceForward: payload?.seed?.raw?.distanceForward,
      distanceReverse: payload?.seed?.raw?.distanceReverse,
      distanceShortest: payload?.seed?.raw?.distanceShortest,
      baseScore: payload?.seed?.raw?.baseScore,
      attractionScore: payload?.seed?.raw?.attractionScore,
      stabilityScore: payload?.seed?.raw?.stabilityScore,
      conflictScore: payload?.seed?.raw?.conflictScore,
      longTermScore: payload?.seed?.raw?.longTermScore,
    },
    chapters: {
      I: {
        chapterId: "I",
        headline: ch01.headline,
        warnings: [],
        categories: {
          profileA: ch01.categories.section01 || "A 기본 정보가 누락되어 요약을 제한적으로 제공합니다.",
          profileB: ch01.categories.section02 || "B 기본 정보가 누락되어 요약을 제한적으로 제공합니다.",
          relationTypeSummary: ch01.categories.section03 || "관계 유형 원시 데이터가 부족합니다.",
          distanceSummary: ch01.categories.section04 || "거리 관계 데이터가 부족합니다.",
          totalStrength: ch01.categories.section05 || "관계 강도 산출값이 부족합니다.",
          oneLineReview: ch01.categories.section06 || "한 줄 총평을 생성할 수 없어 기본 가이드를 제공합니다.",
        },
      },
      II: {
        chapterId: "II",
        headline: ch02.headline,
        warnings: [],
        categories: {
          personAEssence: ch02.categories.section01 || "A 성향 데이터가 누락되었습니다.",
          personBEssence: ch02.categories.section02 || "B 성향 데이터가 누락되었습니다.",
          temperamentGap: ch02.categories.section03 || "기질 차이 분석값이 누락되었습니다.",
          unfamiliarPoints: ch02.categories.section04 || "낯설게 느껴지는 지점 분석값이 누락되었습니다.",
          attractionPoints: ch02.categories.section05 || "매력 포인트 분석값이 누락되었습니다.",
        },
      },
      III: buildFixedChapter("III", chaptersById.get("III"), ["relationTypeCore", "roleDynamics", "emotionalPattern", "conflictTrigger", "operationStrategy"]),
      IV: buildFixedChapter("IV", chaptersById.get("IV"), ["distanceType", "attractionEffect", "stabilityEffect", "riskEffect", "distanceControl"]),
      V: buildFixedChapter("V", chaptersById.get("V"), ["firstImpression", "instinctivePull", "fateSignal", "misunderstandingRisk", "healthyApproach"]),
      VI: buildFixedChapter("VI", chaptersById.get("VI"), ["emotionalFlowA", "emotionalFlowB", "mismatchPoint", "recoveryDialogue", "stabilizationRule"]),
      VII: buildFixedChapter("VII", chaptersById.get("VII"), ["datingFlow", "contactStyle", "affectionLanguage", "jealousyBoundary", "longTermCondition"]),
      VIII: buildFixedChapter("VIII", chaptersById.get("VIII"), ["marriagePotential", "lifeStyleFit", "financeFit", "familyIssueFit", "preMarriageChecklist"]),
      IX: buildFixedChapter("IX", chaptersById.get("IX"), ["coreConflict", "escalationPattern", "trustBreakPoint", "deescalationDialogue", "repairProtocol"]),
      X: buildFixedChapter("X", chaptersById.get("X"), ["riskRelationFlag", "attractionVsDamage", "weakRole", "stopSignal", "safeDistanceRule"]),
      XI: buildFixedChapter("XI", chaptersById.get("XI"), ["longBondType", "growthCondition", "fatiguePattern", "sustainableRule", "maturityStrategy"]),
      XII: buildFixedChapter("XII", chaptersById.get("XII"), ["bodyChemistry", "emotionalIntimacy", "paceGap", "boundaryRule", "warmRoutine"]),
      XIII: buildFixedChapter("XIII", chaptersById.get("XIII"), ["breakupRisk", "lingeringSide", "reunionChance", "reunionCondition", "closureStrategy"]),
      XIV: buildFixedChapter("XIV", chaptersById.get("XIV"), ["strengthenWindow", "cautionWindow", "commitTiming", "conflictTiming", "timingPlaybook"]),
      XV: buildFixedChapter("XV", chaptersById.get("XV"), ["moneyReality", "workReality", "familyReality", "lifePatternReality", "livingRule"]),
      XVI: buildFixedChapter("XVI", chaptersById.get("XVI"), ["totalSummary", "biggestStrength", "biggestRisk", "finalStrategy", "finalKeyword"]),
    },
    integrity: {
      antiLoopHash: safeText(payload?.prepare?.reportSessionId, `sukuyo-compat-${Date.now()}`),
      fallbackUsed: false,
      missingFields: [],
      generatedAt: new Date().toISOString(),
    },
  };
}
