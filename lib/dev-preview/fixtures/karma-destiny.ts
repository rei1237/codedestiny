import type { DevPreviewState } from "@/lib/dev-preview/core";

/**
 * 운명의 업 dev 프리뷰 픽스처.
 *
 * 리포트에는 두 판이 공존한다 — 구 16장(3체계, schemaVersion 1)과 신 15장(다섯 렌즈,
 * schemaVersion 2). 결과 화면이 **양쪽 모두** 정상 렌더되어야 하므로 두 픽스처를 모두 둔다.
 * v1 은 회귀 확인용이라 지우지 말 것.
 */

/** schemaVersion 2 — 워커 PREMIUM_CHAPTERS 정의를 그대로 옮긴다(제목이 어긋나면 프리뷰가 거짓말이 된다). */
const V2_CHAPTERS = [
  { symbol: "業", title: "운명의 핵심 주제", leadLens: "cross", supportLens: ["saju", "ziwei", "western", "vedic", "sukuyo"] },
  { symbol: "源", title: "운명의 근원", leadLens: "saju", supportLens: ["ziwei", "vedic"] },
  { symbol: "流", title: "현재 삶의 흐름", leadLens: "ziwei", supportLens: ["saju", "vedic"] },
  { symbol: "課", title: "업의 핵심 과제", leadLens: "vedic", supportLens: ["saju", "western"] },
  { symbol: "緣", title: "인간관계의 업", leadLens: "sukuyo", supportLens: ["ziwei", "western"], energyDomain: "relationship", energyLabel: "관계", energyValue: 68 },
  { symbol: "情", title: "사랑의 업", leadLens: "western", supportLens: ["sukuyo", "ziwei"], energyDomain: "love", energyLabel: "사랑", energyValue: 74 },
  { symbol: "財", title: "돈의 업", leadLens: "saju", supportLens: ["ziwei", "western"], energyDomain: "money", energyLabel: "돈", energyValue: 52 },
  { symbol: "職", title: "직업의 업", leadLens: "ziwei", supportLens: ["saju", "vedic"], energyDomain: "career", energyLabel: "직업", energyValue: 81 },
  { symbol: "體", title: "건강 에너지", leadLens: "saju", supportLens: ["ziwei", "western"], energyDomain: "health", energyLabel: "건강", energyValue: 46 },
  { symbol: "才", title: "숨겨진 재능", leadLens: "western", supportLens: ["ziwei", "saju"] },
  { symbol: "轉", title: "운명의 전환점", leadLens: "ziwei", supportLens: ["saju", "vedic"] },
  { symbol: "策", title: "앞으로의 성장 전략", leadLens: "cross", supportLens: ["saju", "ziwei", "western", "vedic", "sukuyo"] },
  { symbol: "總", title: "다섯 관점의 종합 결론", leadLens: "cross", supportLens: ["saju", "ziwei", "western", "vedic", "sukuyo"] },
  { symbol: "句", title: "운명을 바꾸는 핵심 문장", leadLens: "none", supportLens: [] },
  { symbol: "箋", title: "최종 편지", leadLens: "none", supportLens: [] },
] as const;

/** schemaVersion 1 — 구 16장. 호환 경로 회귀 확인 전용이므로 제목을 바꾸지 말 것. */
const V1_CHAPTER_TITLES = [
  "인연의 시작점", "반복되는 관계 패턴", "이번 생의 과제", "가족과의 업",
  "일과 재물의 흐름", "건강과 몸의 신호", "감정의 뿌리", "관계에서 반복되는 상처",
  "재회와 이별의 패턴", "돈과 관련된 업", "직업적 소명", "사람을 대하는 태도",
  "위기의 순간들", "회복의 실마리", "지금 풀어야 할 매듭", "최종 편지",
];

function buildChapterContent(title: string): string {
  return (`${title}에 대해 살펴보면, 이번 생에서 반복적으로 마주하는 패턴이 뚜렷하게 드러납니다. 과거의 경험이 지금의 선택에 어떤 영향을 주고 있는지, 그리고 이 흐름을 어떻게 풀어나가야 할지 구체적으로 짚어드립니다. `).repeat(6);
}

const EVIDENCE_BY_LENS: Record<string, { path: string; value: string }> = {
  saju: { path: "saju.dayMaster", value: "己" },
  ziwei: { path: "ziwei.lifePalace", value: '{"name":"명궁","branch":"해","mainStars":["천동"]}' },
  western: { path: "western.moon", value: '{"name":"Moon","sign":"물고기자리"}' },
  vedic: { path: "vedic.nakshatra", value: "Rohini" },
  sukuyo: { path: "sukuyo.archetypeTitle", value: "직관의 심" },
};

const LENS_LABELS: Record<string, string> = {
  saju: "사주명리", ziwei: "자미두수", western: "서양 점성술", vedic: "베다 점성술", sukuyo: "숙요 27수",
};

function buildV2Chapters() {
  return V2_CHAPTERS.map((definition, index) => {
    const lenses = definition.leadLens === "cross" || definition.leadLens === "none"
      ? ["saju", "ziwei", "sukuyo"]
      : [definition.leadLens, ...definition.supportLens];
    return {
      id: `chapter-${String(index + 1).padStart(2, "0")}`,
      order: index + 1,
      title: definition.title,
      symbol: definition.symbol,
      leadLens: definition.leadLens,
      supportLens: [...definition.supportLens],
      content: definition.title === "운명을 바꾸는 핵심 문장"
        ? [
          "반복은 벌이 아니라 아직 바꾸지 않은 선택입니다.",
          "먼저 주는 마음은 약점이 아니라 기준이 없을 때만 상처가 됩니다.",
          "익숙한 자리로 돌아가고 싶을 때가 방향이 바뀌는 순간입니다.",
          "설명하지 않아도 남는 사람이 인연입니다.",
          "돈은 불안을 덮을 때 가장 빨리 새어 나갑니다.",
        ].join("\n")
        : buildChapterContent(definition.title),
      summary: `${definition.title}의 핵심 요약입니다.`,
      keyTakeaways: [
        "반복 패턴을 인식하는 것이 첫걸음입니다.",
        "작은 선택이 흐름을 바꿉니다.",
        `${definition.title}에서는 한 가지 기준만 정하면 됩니다.`,
      ],
      highlightQuotes: [`${definition.title}은 지금 다시 마주할 시기입니다.`],
      charCount: 2200,
      evidence: lenses
        .map((lens) => EVIDENCE_BY_LENS[lens])
        .filter(Boolean)
        .map((item, itemIndex) => ({
          lens: lenses[itemIndex],
          lensLabel: LENS_LABELS[lenses[itemIndex]] || lenses[itemIndex],
          path: item.path,
          value: item.value,
          confidence: "full",
          provisional: false,
        })),
      energyScore: "energyDomain" in definition && definition.energyDomain
        ? {
          domain: definition.energyDomain,
          label: definition.energyLabel,
          value: definition.energyValue,
          basis: `${definition.title}에서 짚은 계산 근거를 기준으로 본 강도입니다.`,
        }
        : null,
    };
  });
}

function buildV1Chapters() {
  return V1_CHAPTER_TITLES.map((title, index) => ({
    id: `chapter-${String(index + 1).padStart(2, "0")}`,
    order: index + 1,
    title,
    content: buildChapterContent(title),
    summary: `${title}의 핵심 요약입니다.`,
    keyTakeaways: ["반복 패턴을 인식하는 것이 첫걸음입니다.", "작은 선택이 흐름을 바꿉니다."],
    highlightQuotes: [`${title}은 지금 다시 마주할 시기입니다.`],
    charCount: 500,
  }));
}

const LENS_CONTRIBUTION = {
  saju: { label: "사주명리", role: "현실·기질·오행·행동과 결정의 구조", score: 92, basis: { coverage: 1, usageWeight: 0.93, density: 0.86, confidence: "full" }, formula: "0.45×계산 가용성 + 0.35×리포트 내 비중 + 0.20×데이터 충실도" },
  ziwei: { label: "자미두수", role: "인생의 큰 흐름·사회적 역할·명궁과 12궁", score: 95, basis: { coverage: 1, usageWeight: 1, density: 0.9, confidence: "full" }, formula: "0.45×계산 가용성 + 0.35×리포트 내 비중 + 0.20×데이터 충실도" },
  western: { label: "서양 점성술", role: "심리·감정·무의식·대인관계", score: 79, basis: { coverage: 1, usageWeight: 0.71, density: 0.72, confidence: "full" }, formula: "0.45×계산 가용성 + 0.35×리포트 내 비중 + 0.20×데이터 충실도" },
  vedic: { label: "베다 점성술", role: "영혼·업·다르마·성장 방향", score: 71, basis: { coverage: 1, usageWeight: 0.57, density: 0.7, confidence: "full" }, formula: "0.45×계산 가용성 + 0.35×리포트 내 비중 + 0.20×데이터 충실도" },
  sukuyo: { label: "숙요 27수", role: "인연·관계·인간관계 패턴", score: 66, basis: { coverage: 1, usageWeight: 0.35, density: 1, confidence: "full" }, formula: "0.45×계산 가용성 + 0.35×리포트 내 비중 + 0.20×데이터 충실도" },
};

const USER_INPUT = {
  name: "민준",
  gender: "male",
  birthDate: "1989-04-12",
  birthTime: "08:30",
  calendarType: "solar",
  topic: "반복되는 관계 패턴",
  question: "왜 자꾸 비슷한 사람을 만나게 될까요?",
};

const SUMMARY_CARDS = {
  keywords: ["업의 매듭", "관계의 반복", "현실 전략"],
  repeatingPattern: "신뢰를 먼저 주고 상처받는 패턴이 반복됩니다.",
  currentTask: "이번 생에서는 스스로를 먼저 지키는 법을 배우는 것이 과제입니다.",
};

export function buildKarmaDestinyPreviewPayload(state: DevPreviewState) {
  if (state === "failed") {
    return {
      ok: true,
      status: "generation_failed",
      sessionId: "dev-preview-karma",
      schemaVersion: 2,
      chapters: [],
      generationProgress: { totalChapters: 15, completedChapters: 0, percent: 0, stageIndex: 0, totalStages: 6, stageLabel: "생성 실패" },
    };
  }

  // 장 단위 병렬 생성으로 바뀌면서 한 장이 실패해도 나머지는 남는 부분 성공 경로가 생겼다.
  // truncated 는 그 상태(일부 장만 완성된 채 생성 중)를 재현한다.
  if (state === "truncated") {
    return {
      ok: true,
      status: "generating",
      sessionId: "dev-preview-karma",
      schemaVersion: 2,
      userInput: USER_INPUT,
      chapters: buildV2Chapters().slice(0, 8),
      generationProgress: {
        totalChapters: 15,
        completedChapters: 8,
        percent: 51,
        stageIndex: 3,
        totalStages: 6,
        stageLabel: "별자리의 심리를 읽는 중",
        currentChapterTitle: "건강 에너지",
      },
    };
  }

  // 구 16장 리포트가 여전히 정상 렌더되는지 확인하는 경로.
  if (state === "legacy") {
    return {
      ok: true,
      status: "completed",
      sessionId: "dev-preview-karma-v1",
      reportId: "dev-preview-karma-v1",
      generatedAt: "2026-07-08T09:00:00.000Z",
      totalCharCount: 8000,
      schemaVersion: 1,
      userInput: USER_INPUT,
      summaryCards: SUMMARY_CARDS,
      integratedResult: { saju: { patternSummary: "己 일간, 토 기운" }, westernAstrology: { patternSummary: "태양 양자리" }, vedicAstrology: { calculationLimited: true } },
      chapters: buildV1Chapters(),
      finalLetter: "지금까지의 흐름을 이해했다면, 이제는 반복을 끊어낼 준비가 된 것입니다.",
      qualityCheck: { passed: true, totalCharCount: 8000, chapterCount: 16, promptLeakDetected: false },
      generationProgress: { totalChapters: 16, completedChapters: 16, percent: 100, stageLabel: "완료" },
    };
  }

  return {
    ok: true,
    status: "completed",
    sessionId: "dev-preview-karma",
    reportId: "dev-preview-karma",
    generatedAt: "2026-07-08T09:00:00.000Z",
    totalCharCount: 31200,
    schemaVersion: 2,
    lensContribution: LENS_CONTRIBUTION,
    lensAvailability: {
      saju: { label: "사주명리", confidence: "full" },
      ziwei: { label: "자미두수", confidence: "full" },
      western: { label: "서양 점성술", confidence: "full" },
      vedic: { label: "베다 점성술", confidence: "full" },
      sukuyo: { label: "숙요 27수", confidence: "full" },
    },
    userInput: USER_INPUT,
    summaryCards: SUMMARY_CARDS,
    chapters: buildV2Chapters(),
    finalLetter: "지금까지의 흐름을 이해했다면, 이제는 반복을 끊어낼 준비가 된 것입니다.",
    qualityCheck: { passed: true, totalCharCount: 31200, chapterCount: 15, promptLeakDetected: false },
    generationProgress: { totalChapters: 15, completedChapters: 15, percent: 100, stageIndex: 5, totalStages: 6, stageLabel: "완료" },
  };
}
