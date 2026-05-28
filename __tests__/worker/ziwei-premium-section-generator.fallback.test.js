/**
 * @jest-environment node
 */

let buildCanonicalZiweiPdfChapters;
let mapZiweiBrightnessToStrengthSymbol;
let generateZiweiChapterFromSections;
let resolveZiweiCategoryData;
let buildZiweiCategorySeed;
let isLowQualityZiweiSection;
let normalizeZiweiSectionResult;
let validateLLMSectionContent;

beforeAll(async () => {
  const book = await import("../../worker/lib/ziwei-premium-book-structure.js");
  const section = await import("../../worker/lib/ziwei-premium-section-generator.js");
  buildCanonicalZiweiPdfChapters = book.buildCanonicalZiweiPdfChapters;
  mapZiweiBrightnessToStrengthSymbol = book.mapZiweiBrightnessToStrengthSymbol;
  resolveZiweiCategoryData = book.resolveZiweiCategoryData;
  buildZiweiCategorySeed = book.buildZiweiCategorySeed;
  generateZiweiChapterFromSections = section.generateZiweiChapterFromSections;
  isLowQualityZiweiSection = section.isLowQualityZiweiSection;
  normalizeZiweiSectionResult = section.normalizeZiweiSectionResult;
  validateLLMSectionContent = section.validateLLMSectionContent;
});

describe("ziwei premium section generator fallback", () => {
  test("strength symbol map should normalize known brightness labels", () => {
    expect(mapZiweiBrightnessToStrengthSymbol("묘")).toBe("◎");
    expect(mapZiweiBrightnessToStrengthSymbol("왕")).toBe("◎");
    expect(mapZiweiBrightnessToStrengthSymbol("득")).toBe("O");
    expect(mapZiweiBrightnessToStrengthSymbol("리")).toBe("▲");
    expect(mapZiweiBrightnessToStrengthSymbol("평")).toBe("△");
    expect(mapZiweiBrightnessToStrengthSymbol("함")).toBe("X");
    expect(mapZiweiBrightnessToStrengthSymbol("실")).toBe("X");
    expect(mapZiweiBrightnessToStrengthSymbol("알수없음")).toBe("△");
  });

  test("canonical chapter builder should always return 12 chapters with local seeds", () => {
    const chapters = buildCanonicalZiweiPdfChapters({
      service: "ziwei-premium",
      mode: "personal",
      user: { birthDate: "1992-06-15" },
      chart: {
        lifePalace: "명궁",
        palaces: [
          {
            key: "ming",
            name: "명궁",
            mainStars: [{ name: "자미", brightness: "묘", strengthSymbol: "◎" }],
          },
        ],
      },
      meta: { generatedAt: new Date().toISOString(), source: "local-ziwei-engine" },
    });

    expect(Array.isArray(chapters)).toBe(true);
    expect(chapters).toHaveLength(12);
    chapters.forEach((chapter) => {
      expect(Array.isArray(chapter.categories)).toBe(true);
      expect(chapter.categories.length).toBeGreaterThan(0);
      chapter.categories.forEach((category) => {
        expect(String(category.localSeedText || "").trim().length).toBeGreaterThan(20);
      });
    });
  });

  test("category resolver should bind actual palace data by category id", () => {
    const payload = {
      service: "ziwei-premium",
      mode: "personal",
      user: { birthDate: "1992-06-15" },
      chart: {
        lifePalaceKey: "life",
        bodyPalaceKey: "body",
        palaces: [
          { key: "life", name: "명궁", mainStars: [{ name: "자미", brightness: "묘", strengthSymbol: "◎" }], assistantStars: [{ name: "좌보", brightness: "득", strengthSymbol: "O" }], minorStars: [{ name: "문창", brightness: "평", strengthSymbol: "△" }], maleficStars: [{ name: "화기", brightness: "함", strengthSymbol: "X" }], palaceStrength: "strong" },
          { key: "body", name: "신궁", mainStars: [{ name: "천기", brightness: "왕", strengthSymbol: "◎" }], assistantStars: [], minorStars: [], maleficStars: [], palaceStrength: "medium" },
          { key: "siblings", name: "형제궁", mainStars: [{ name: "무곡", brightness: "득", strengthSymbol: "O" }], assistantStars: [], minorStars: [], maleficStars: [], palaceStrength: "medium" },
          { key: "spouse", name: "부부궁", mainStars: [{ name: "태양", brightness: "리", strengthSymbol: "▲" }], assistantStars: [], minorStars: [], maleficStars: [], palaceStrength: "medium" },
          { key: "children", name: "자녀궁", mainStars: [{ name: "천동", brightness: "평", strengthSymbol: "△" }], assistantStars: [], minorStars: [], maleficStars: [], palaceStrength: "medium" },
          { key: "wealth", name: "재백궁", mainStars: [{ name: "무곡", brightness: "왕", strengthSymbol: "◎" }], assistantStars: [], minorStars: [], maleficStars: [], palaceStrength: "strong" },
          { key: "health", name: "질액궁", mainStars: [{ name: "천량", brightness: "함", strengthSymbol: "X" }], assistantStars: [], minorStars: [], maleficStars: [], palaceStrength: "weak" },
          { key: "migration", name: "천이궁", mainStars: [{ name: "천마", brightness: "리", strengthSymbol: "▲" }], assistantStars: [], minorStars: [], maleficStars: [], palaceStrength: "medium" },
          { key: "friends", name: "교우궁", mainStars: [{ name: "천부", brightness: "평", strengthSymbol: "△" }], assistantStars: [], minorStars: [], maleficStars: [], palaceStrength: "medium" },
          { key: "career", name: "관록궁", mainStars: [{ name: "자미", brightness: "묘", strengthSymbol: "◎" }], assistantStars: [], minorStars: [], maleficStars: [], palaceStrength: "strong" },
          { key: "property", name: "전택궁", mainStars: [{ name: "천상", brightness: "득", strengthSymbol: "O" }], assistantStars: [], minorStars: [], maleficStars: [], palaceStrength: "medium" },
          { key: "fortune", name: "복덕궁", mainStars: [{ name: "천기", brightness: "평", strengthSymbol: "△" }], assistantStars: [], minorStars: [], maleficStars: [], palaceStrength: "medium" },
        ],
        fourTransformations: {
          hualu: { starName: "자미", palaceKey: "life", palaceName: "명궁", meaningSeed: "명예와 자기기반 강화" },
          huaquan: { starName: "무곡", palaceKey: "wealth", palaceName: "재백궁", meaningSeed: "재정 주도성" },
          huake: { starName: "천기", palaceKey: "career", palaceName: "관록궁", meaningSeed: "지식과 판단의 정교화" },
          huaji: { starName: "화기", palaceKey: "health", palaceName: "질액궁", meaningSeed: "과로와 소진 경계" },
        },
        strongestPalaces: ["life", "wealth", "career"],
        weakestPalaces: ["health"],
        summarySeeds: {},
      },
      meta: { generatedAt: new Date().toISOString(), source: "local-ziwei-engine" },
    };

    const wealth = resolveZiweiCategoryData({ id: "c06-01", title: "재백궁 주성 구조" }, payload);
    const spouse = resolveZiweiCategoryData({ id: "c04-01", title: "부부궁 주성 구조" }, payload);
    const ch12 = resolveZiweiCategoryData({ id: "c12-01", title: "종합 운명 로드맵" }, payload);

    expect(wealth.palaces.map((row) => row.name)).toContain("재백궁");
    expect(spouse.palaces.map((row) => row.name)).toContain("부부궁");
    expect(ch12.transformations.length).toBeGreaterThan(0);
    expect(buildZiweiCategorySeed({ id: "c06-01", title: "재백궁 주성 구조" }, payload)).toContain("무곡");
    expect(buildZiweiCategorySeed({ id: "c12-01", title: "종합 운명 로드맵" }, payload)).toContain("사화");
  });

  test("low quality section should normalize to expert fallback", () => {
    const input = {
      chapterId: "ch01",
      chapterTitle: "명궁 완전 해독",
      categoryId: "c01-01",
      categoryTitle: "명궁 주성 구조",
      resolved: {
        palaces: [
          {
            key: "life",
            name: "명궁",
            mainStars: [{ name: "자미", brightness: "묘", strengthSymbol: "◎" }],
            assistantStars: [{ name: "좌보", brightness: "득", strengthSymbol: "O" }],
            minorStars: [{ name: "문창", brightness: "평", strengthSymbol: "△" }],
            maleficStars: [{ name: "화기", brightness: "함", strengthSymbol: "X" }],
          },
        ],
      },
    };
    const lowQualityBody = "이 항목은 현재 확보된 명반 핵심값을 기준으로 성향, 반복 패턴, 선택 전략 중심으로 정리합니다.\n\n이 항목은 현재 확보된 명반 핵심값을 기준으로 성향, 반복 패턴, 선택 전략 중심으로 정리합니다.";

    expect(isLowQualityZiweiSection(lowQualityBody, input)).toBe(true);
    const normalized = normalizeZiweiSectionResult(input, lowQualityBody, {
      service: "ziwei-premium",
      mode: "personal",
      chart: { palaces: input.resolved.palaces },
    });

    expect(normalized.source).toBe("expert-local-fallback");
    expect(String(normalized.body || "")).toContain("명궁");
    expect(String(normalized.body || "")).not.toContain("자동 복구 생성");
    expect(String(normalized.body || "").length).toBeGreaterThanOrEqual(1200);
  });

  test("LLM failure should not break chapter generation and must use local fallback", async () => {
    const result = await generateZiweiChapterFromSections({ PREMIUM_ZIWEI_REQUIRE_LLM: "false" }, {
      requestId: "test-req-1",
      reportId: "test-report-1",
      chapter: {
        chapterId: "ch01",
        chapterNo: 1,
        title: "명궁 완전 해독",
        targetPalace: "명궁",
      },
      sections: [
        {
          sectionId: "ch01-sec01",
          title: "명궁 주성 구조",
          minChars: 1200,
        },
      ],
      userProfile: {
        name: "테스터",
        gender: "F",
        birthDate: "1992-06-15",
        birthTime: "12:30",
      },
      targetPalaceData: {
        name: "명궁",
        branch: "자",
        mainStars: [{ name: "자미", strength: "묘", symbol: "◎" }],
      },
      reportPayload: {
        chartMeta: { mingGong: "자", shenGong: "오" },
        palaces: [
          {
            key: "ming",
            nameKo: "명궁",
            branch: "자",
            mainStars: [{ nameKo: "자미", brightness: "묘", symbol: "◎" }],
          },
        ],
      },
      starNames: ["자미"],
    });

    expect(result.ok).toBe(true);
    expect(Array.isArray(result.generatedSections)).toBe(true);
    expect(result.generatedSections).toHaveLength(1);
    expect(result.generatedSections[0].source).toBe("expert-local-fallback");
    expect(String(result.generatedSections[0].content || "").length).toBeGreaterThanOrEqual(1200);
    expect(String(result.generatedSections[0].content || "")).not.toContain("자동 복구 생성");
  });

  test("validator should accept high-quality palace/star grounded text without forcing strength symbol", () => {
    const content = [
      "명궁에서는 자미와 좌보의 결이 강하게 맞물려 자기 기준을 먼저 세우는 경향이 반복됩니다. 이 조합은 의사결정의 초점을 바깥 평가보다 내부 기준에 두게 만들며, 상황이 급해질수록 스스로 통제권을 회수하려는 반응으로 나타납니다.",
      "관록궁의 자미 흐름은 직업 선택에서 속도보다 방향 정합성을 우선하게 만들고, 재백궁의 무곡 구조는 수입원을 분리해 관리할 때 안정이 커집니다. 즉 같은 노력이라도 체계가 없는 환경에서는 피로가 누적되고, 분리된 관리 체계에서는 성과가 오래 유지됩니다.",
      "질액궁의 천량 배치는 과로 누적 시 회복이 늦어질 수 있음을 시사하므로, 주간 리듬을 끊지 않는 루틴이 핵심입니다. 특히 수면, 집중, 회복을 분리해서 운영하지 않으면 감정 기복이 커지고 실행력이 흔들릴 가능성이 높습니다.",
      "천이궁의 천마 신호가 있어 외부 확장 운은 분명하지만, 교우궁 네트워크를 선별하지 않으면 성과가 분산될 수 있습니다. 외부 연결은 기회의 양보다 관계의 질이 중요하며, 협업 기준이 불명확하면 일정 지연과 책임 공백이 반복됩니다.",
      "연애와 친밀 관계에서는 부부궁의 정서 반응 패턴이 중요한데, 기대치를 설명하지 않은 채 상대의 자발적 이해를 기다리면 실망이 누적되기 쉽습니다. 감정 소통의 규칙을 미리 합의하고, 갈등 후 회복 루틴을 고정하면 관계 안정성이 크게 올라갑니다.",
      "재정 측면에서는 무곡 기반의 수익 구조가 강점이지만, 단기 성과에 집중해 지출 통제가 느슨해지면 성과 대비 순이익이 낮아질 수 있습니다. 고정비와 변동비를 주 단위로 분리하고, 프로젝트별 손익 기준을 유지하면 누수 구간을 빠르게 차단할 수 있습니다.",
      "대운과 사화 흐름이 개입되는 구간에서는 결정의 속도보다 순서가 더 중요합니다. 먼저 리스크가 큰 선택지를 정리하고, 다음으로 확장 선택을 배치하면 같은 역량으로도 결과 편차를 줄일 수 있습니다. 결론적으로 명궁-관록궁-재백궁의 연결을 우선 축으로 잡고, 관계와 건강 리스크를 주간 점검 항목으로 고정하는 전략이 실전적으로 유효합니다.",
      "추가로 실전 운영에서는 매주 동일한 리뷰 포맷을 사용해 선택-결과-감정 반응을 함께 기록해야 패턴이 선명하게 보입니다. 기록이 누적되면 명궁의 기준이 흔들리는 구간과 관록궁 성과가 올라오는 구간을 분리해서 볼 수 있어, 다음 행동을 정할 때 시행착오를 크게 줄일 수 있습니다.",
      "관계에서는 부부궁의 정서 신호가 강해질수록 즉각 반응보다 시간차 대응이 유리합니다. 충돌 직후에는 사실 정리와 감정 정리를 분리하고, 24시간 이내에 합의 가능한 행동 항목을 재확인하면 반복 갈등을 줄이면서 신뢰를 유지할 수 있습니다.",
      "재정 실행에서는 재백궁의 강점을 확장하되, 지출 기준선을 먼저 고정하는 방식이 안정적입니다. 고정비와 변동비를 분리해 관리하고, 프로젝트별 손익 기준을 유지하면 성과가 변동하더라도 순이익 방어가 가능해집니다.",
    ].join(" ");

    const validation = validateLLMSectionContent(content, {
      section: { title: "명궁 주성 구조", minChars: 1200 },
      targetPalaces: ["명궁", "관록궁", "재백궁"],
      starNames: ["자미", "좌보", "무곡", "천량", "천마"],
      resolved: {
        resolved: {
          palaces: [
            { key: "life", name: "명궁", mainStars: [{ name: "자미" }], assistantStars: [{ name: "좌보" }] },
            { key: "career", name: "관록궁", mainStars: [{ name: "자미" }] },
            { key: "wealth", name: "재백궁", mainStars: [{ name: "무곡" }] },
          ],
        },
      },
    });

    expect(validation.ok).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test("chapter generator should prefer provided minimal payload over rebuilt payload", async () => {
    const result = await generateZiweiChapterFromSections({ PREMIUM_ZIWEI_REQUIRE_LLM: "false" }, {
      requestId: "test-req-2",
      reportId: "test-report-2",
      chapter: {
        chapterId: "ch12",
        chapterNo: 12,
        title: "종합 운명 로드맵",
        targetPalace: "명궁",
      },
      sections: [
        { sectionId: "c12-01", title: "12궁 전체 핵심 요약", minChars: 1200 },
      ],
      minimalPayload: {
        service: "ziwei-premium",
        mode: "personal",
        user: { name: "테스터", birthDate: "1992-06-15", birthTime: "12:30", calendarType: "solar" },
        chart: {
          lifePalaceKey: "life",
          bodyPalaceKey: "body",
          palaces: [
            { key: "life", name: "명궁", mainStars: [{ name: "자미", brightness: "묘", strengthSymbol: "◎" }], assistantStars: [{ name: "좌보", brightness: "득", strengthSymbol: "O" }], minorStars: [], maleficStars: [] },
            { key: "wealth", name: "재백궁", mainStars: [{ name: "무곡", brightness: "왕", strengthSymbol: "◎" }], assistantStars: [], minorStars: [], maleficStars: [] },
          ],
          fourTransformations: {
            hualu: { starName: "자미", palaceKey: "life", palaceName: "명궁", meaningSeed: "명예와 자기기반 강화" },
          },
        },
        meta: { generatedAt: new Date().toISOString(), source: "local-ziwei-engine" },
      },
      userProfile: { name: "테스터", gender: "F", birthDate: "1992-06-15", birthTime: "12:30" },
      reportPayload: { chartMeta: { mingGong: "명궁" }, palaces: [] },
      starNames: ["자미", "좌보", "무곡"],
    });

    expect(result.ok).toBe(true);
    expect(result.generatedSections).toHaveLength(1);
    expect(String(result.generatedSections[0].content || "")).toContain("명궁");
    expect(String(result.generatedSections[0].content || "")).toContain("자미");
  });
});
