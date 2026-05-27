describe("Premium PDF v2 chapter plans", () => {
  let getPremiumPdfV2ChapterPlan;

  beforeAll(async () => {
    ({ getPremiumPdfV2ChapterPlan } = await import("../../worker/lib/pdf-v2/chapter-plans.js"));
  });

  test("인생의 책/연애 비책은 canonical 챕터 수와 글자수 기준을 따른다", () => {
    const life = getPremiumPdfV2ChapterPlan("lifeBook");
    const love = getPremiumPdfV2ChapterPlan("loveSecret", "solo");

    expect(life).toHaveLength(12);
    expect(life[0].title).toContain("Ch.1 사주 원국 총론");
    expect(life[0].minChars).toBe(6000);
    expect(life[0].maxChars).toBe(6600);

    expect(love).toHaveLength(8);
    expect(love[0].title).toContain("본연의 연애 자아");
    expect(love[0].minChars).toBe(5000);
  });

  test("자미두수 requiredFields는 branch/mainStars/minorStars/strengthSymbol/명궁/신궁/사화를 포함", () => {
    const plan = getPremiumPdfV2ChapterPlan("ziweiPremium");
    const ch1 = plan[0];

    expect(ch1.requiredFields).toEqual(expect.arrayContaining([
      "chart.mingGong",
      "chart.shenGong",
      "palaces[].branch",
      "palaces[].mainStars",
      "palaces[].minorStars",
      "palaces[].mainStars[].strengthSymbol",
      "fourTransformations",
    ]));
  });

  test("숙요점 requiredFields는 27숙(본명숙) 기반 키를 포함", () => {
    const plan = getPremiumPdfV2ChapterPlan("sookyoPremium");
    expect(plan).toHaveLength(12);
    expect(plan[0].requiredFields).toEqual(expect.arrayContaining(["宿曜.birthMansion", "宿曜.coreNature"]));
    expect(plan[0].title).toContain("본명숙 원형 해독");
  });

  test("베다점 requiredFields는 라그나/행성/하우스/다샤를 포함", () => {
    const plan = getPremiumPdfV2ChapterPlan("vedicPremium");
    const ch1 = plan[0];

    expect(ch1.requiredFields).toEqual(expect.arrayContaining([
      "chart.lagna",
      "chart.planets",
      "chart.houses",
      "dasha.timeline",
    ]));
  });

  test("점성술 requiredFields는 태양/달/상승궁/행성/하우스/애스펙트를 포함", () => {
    const plan = getPremiumPdfV2ChapterPlan("westernAstrologyPremium");
    const ch1 = plan[0];

    expect(plan).toHaveLength(13);
    expect(ch1.title).toContain("출생차트 총론");

    expect(ch1.requiredFields).toEqual(expect.arrayContaining([
      "natalChart.sunSign",
      "natalChart.moonSign",
      "natalChart.ascendant",
      "natalChart.planets",
      "natalChart.houses",
      "natalChart.aspects",
      "profile.birthDate",
    ]));
  });

  test("점성술 compatibility 모드는 10챕터를 사용해야 한다", () => {
    const plan = getPremiumPdfV2ChapterPlan("westernAstrologyPremium", "compatibility");
    const ch1 = plan[0];

    expect(plan).toHaveLength(10);
    expect(ch1.title).toContain("두 사람의 우주적 첫인상");
    expect(ch1.requiredFields).toEqual(expect.arrayContaining([
      "relationshipData.synastry",
      "relationshipData.composite",
    ]));
  });

  test("연애 비책 requiredFields는 배우자궁/도화/홍염/화개/십성을 포함", () => {
    const plan = getPremiumPdfV2ChapterPlan("loveSecret", "solo");
    const ch1 = plan[0];
    const ch2 = plan[1];

    expect(ch1.requiredFields).toEqual(expect.arrayContaining(["chart.spousePalace", "chart.tenGods"]));
    expect(ch2.requiredFields).toEqual(expect.arrayContaining(["chart.peachBlossom", "chart.hongyeom", "chart.hwagae"]));
  });

  test("각 서비스 챕터 카테고리 제목은 리포트 내에서 중복되지 않는다", () => {
    const targets = [
      getPremiumPdfV2ChapterPlan("lifeBook"),
      getPremiumPdfV2ChapterPlan("loveSecret", "solo"),
      getPremiumPdfV2ChapterPlan("loveSecret", "compatibility"),
      getPremiumPdfV2ChapterPlan("sajuNewYear"),
      getPremiumPdfV2ChapterPlan("westernAstrologyPremium", "personal"),
      getPremiumPdfV2ChapterPlan("sookyoPremium", "personal"),
      getPremiumPdfV2ChapterPlan("vedicPremium", "personal"),
    ];

    targets.forEach((plan) => {
      const titles = [];
      plan.forEach((chapter) => {
        expect(Array.isArray(chapter.categories)).toBe(true);
        chapter.categories.forEach((category) => {
          const title = String(category?.title || "").trim();
          expect(title.length).toBeGreaterThanOrEqual(4);
          titles.push(title);
        });
      });

      const lower = titles.map((item) => item.toLowerCase());
      expect(new Set(lower).size).toBe(lower.length);
    });
  });
});
