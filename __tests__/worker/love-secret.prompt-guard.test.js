/**
 * @jest-environment node
 */

let loveUtils;
let chapterConfig;

beforeAll(async () => {
  const premium = await import("../../worker/routes/premium.js");
  const chapters = await import("../../worker/lib/saju-premium-chapters.js");
  loveUtils = premium.__loveSecretTestUtils;
  chapterConfig = chapters;
});

function makePersonA() {
  return {
    profile: { name: "테스트A", gender: "female" },
    fourPillars: {
      year: { ganji: "壬申", stem: "壬", branch: "申" },
      month: { ganji: "丁巳", stem: "丁", branch: "巳" },
      day: { ganji: "辛酉", stem: "辛", branch: "酉", hiddenStems: ["辛"] },
      hour: { ganji: "甲午", stem: "甲", branch: "午" },
    },
    dayMaster: { stem: "辛", element: "metal", strength: "신강" },
    fiveElements: { wood: 22.2, fire: 11.1, earth: 22.2, metal: 33.3, water: 11.1, dominant: "metal", weakest: "fire" },
    tenGods: {
      distribution: { 비견: 3, 겁재: 1, 식신: 2, 상관: 1, 편재: 1, 정재: 2, 편관: 1, 정관: 2, 편인: 0, 정인: 1 },
      loveRelatedGods: { spouseStar: "관성", expressionStar: "식신", authorityStar: "정관" },
    },
    attractionStars: { dohwa: ["도화살"], hongyeom: ["홍염살"], hwagae: ["화개살"], yeokma: ["역마살"] },
    loveProfile: { spousePalace: { branch: "酉", hiddenStems: ["辛"] } },
    usefulGods: { yongsin: { element: "fire" }, huisin: { element: "wood" }, gisin: { element: "metal" } },
    luck: { currentDaewoon: { ganji: "乙卯" }, nextDaewoon: { ganji: "甲寅" }, annualLuck: { year: 2026 }, monthlyLuck: [] },
    johu: { birthSeason: "summer", monthBranch: "巳" },
  };
}

describe("Love secret prompt and repetition guard", () => {
  test("프롬프트는 chapter contract, 카테고리, 이전 챕터 금지 문장을 모두 포함한다", () => {
    const body = {
      name: "테스트A",
      gender: "female",
      year: 1992,
      month: 6,
      day: 15,
      hour: 12,
      minute: 30,
      engineData: makePersonA(),
    };
    const canonical = loveUtils.buildCanonicalSajuLoveReport(
      body,
      body,
      chapterConfig.LOVE_SECRET_MODE_CONFIG.solo,
    );
    const headings = [
      "### 연애 자아 진단",
      "### 반복 패턴 해석",
      "### 실전 전략",
      "### 핵심 요약 5줄",
    ];
    const previousSentence = "이 문장은 이전 챕터에서 이미 사용된 핵심 문장으로 이번 챕터에 다시 나오면 안 됩니다.";
    const prompt = loveUtils.buildLoveSecretPrompt(
      chapterConfig.LOVE_SECRET_MODE_CONFIG.solo,
      { title: chapterConfig.LOVE_SECRET_MODE_CONFIG.solo.chapters[0].title },
      1,
      canonical,
      3200,
      [previousSentence],
      { chapterContract: { requiredHeadings: headings } },
    );

    expect(prompt).toContain("chapterContract.requiredHeadings");
    expect(prompt).toContain(previousSentence);
    expect(prompt).toContain("이전 챕터 재사용 금지 문장");
    expect(prompt).toContain(String(canonical.chapterPlanning.chapter1.dataDrivenSections[0] || ""));
    headings.forEach((heading) => expect(prompt).toContain(heading));
  });

  test("validator는 반복 문장과 모드 불일치를 차단한다", () => {
    const repeatedSentence = "나는 감정이 깊어질수록 상대를 세밀하게 관찰하고 관계의 균형을 스스로 통제하려는 경향이 강합니다.";
    const repeatedText = [
      "### 연애 자아 진단",
      repeatedSentence,
      repeatedSentence,
      repeatedSentence,
      "### 실전 전략",
      repeatedSentence,
    ].join("\n\n");

    const compatWithoutPartner = [
      "### 두 사람의 원국 요약",
      "A의 감정 리듬은 빠르게 반응하지만 정리에도 시간이 필요합니다. 현재 본문은 한 사람의 감정 패턴만 길게 설명하고 있으며 관계 상대의 반응 구조는 전혀 다루지 않습니다. 이 상태에서는 궁합 모드 상담문으로 볼 수 없습니다.",
      "### 소통 패턴",
      "A의 의사 표현 습관만 반복적으로 설명하고 있어 상호작용 구조가 빠져 있습니다. 따라서 compatibility 검증을 통과하면 안 됩니다.",
    ].join("\n\n");

    const validCompat = [
      "### 두 사람의 원국 요약",
      "A의 감정 리듬은 빠르게 반응하며 주도권을 먼저 잡으려는 편입니다. B의 감정 리듬은 받아들이는 속도가 조금 더 느리지만 안정 장치가 분명합니다. 그래서 처음엔 A가 관계를 끌고 가고, B가 뒤에서 속도를 조절하는 패턴이 생깁니다.",
      "### 소통 패턴",
      "A의 표현은 직선적이고 B의 표현은 우회적이라 같은 사건도 다르게 받아들입니다. 상대가 침묵할 때 A는 거리감으로 느끼고, B는 정리 시간으로 쓰기 쉽습니다. 이 차이를 미리 합의하면 갈등이 줄어듭니다.",
      "### 최종 조언",
      "A는 요구를 짧고 분명하게 말하고, B는 답을 늦출 때 이유를 먼저 설명해야 합니다. 두 사람 모두 감정이 올라온 직후보다 반나절 뒤 대화를 재개할 때 상호작용이 더 안정됩니다.",
    ].join("\n\n");

    expect(loveUtils.validateSajuLoveBookSectionText(repeatedText, "solo")).toBe(false);
    expect(loveUtils.validateSajuLoveBookSectionText(compatWithoutPartner, "compatibility")).toBe(false);
    expect(loveUtils.validateSajuLoveBookSectionText(validCompat, "compatibility")).toBe(true);
  });
});