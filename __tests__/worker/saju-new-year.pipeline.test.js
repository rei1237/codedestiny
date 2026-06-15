/**
 * @jest-environment node
 */

let route;
let constants;

beforeAll(async () => {
  route = await import("../../worker/routes/saju-new-year.js");
  constants = await import("../../worker/lib/saju-new-year-constants.js");
});

function makePayload(overrides = {}) {
  return {
    name: "홍길동",
    gender: "남성",
    birthDate: "1991-02-20",
    birthTime: "07:30",
    calendarType: "solar",
    selectedYear: 2026,
    profile: {
      name: "홍길동",
      gender: "male",
      birth: {
        year: 1991,
        month: 2,
        day: 20,
        hour: 7,
        minute: 30,
      },
    },
    sajuBase: {
      pillars: {
        year: { gan: "辛", zhi: "未" },
        month: { gan: "庚", zhi: "寅" },
        day: { gan: "甲", zhi: "子" },
        hour: { gan: "乙", zhi: "巳" },
      },
      core: {
        dayMaster: "甲",
      },
      elementBalance: {
        counts: {
          wood: 3,
          fire: 2,
          earth: 2,
          metal: 1,
          water: 2,
        },
      },
      timing: {
        daeun: [
          {
            label: "경신 대운",
            stem: "庚",
            branch: "申",
            startAge: 31,
            endAge: 40,
            tenGod: "편관",
            keyword: "속도 조절",
          },
        ],
      },
      specialStars: {
        tao: 64,
        yeokma: 28,
        hwa: 35,
        gwimun: true,
      },
      jodu: {
        type: "건록격",
      },
      johu: {
        type: "건록격",
        name: "건록",
        patterns: ["자기 기준 강화", "실행 우선"],
      },
      relations: {
        combinations: [
          { message: "년지 未와 세운 丑이 합을 이루어 협력의 문이 열립니다." },
        ],
        clashes: [
          { message: "일지 子와 세운 午가 충을 이루어 일정 조정이 필요합니다." },
        ],
        harms: [
          { message: "월지 寅과 세운 巳 사이에 해가 있어 관계의 미세한 오해를 관리해야 합니다." },
        ],
        breaks: [
          { message: "시지 巳와 세운 申이 파를 이루어 계획 변경과 약속 관리가 중요합니다." },
        ],
        punishments: [],
        branchRelations: [
          { type: "합", message: "년지 未와 세운 丑이 합을 이루어 협력의 문이 열립니다." },
          { type: "충", message: "일지 子와 세운 午가 충을 이루어 이동 압력이 커집니다." },
        ],
      },
      analysis: {
        season: "봄",
      },
    },
    ...overrides,
  };
}

function makeBody(text, minimumLength = 920, scopeKey = "0-0") {
  const sentence = String(text).trim();
  let body = `${sentence} [${scopeKey}]`;
  let step = 1;
  while (body.length < minimumLength) {
    body += ` ${sentence} [${scopeKey}:${step}] 현재누적${body.length}자 원국대운세운월운 교차근거를 실행기준으로 세분화합니다`;
    step += 1;
  }
  return body;
}

function makeSectionBodies(seed, chapterSpec) {
  const year = seed.input.targetYear;
  const dayMaster = seed.natalChart.dayMaster;
  const annualPillar = seed.luckCycles.targetYearSewoon.pillar;
  const annualTenGod = seed.luckCycles.targetYearSewoon.tenGodToDayMaster;
  const yearSignal = seed.derivedSignals.yearlyThemeSignals.join(" / ");
  const careerSignal = seed.derivedSignals.careerSignals.join(" / ");
  const moneySignal = seed.derivedSignals.moneySignals.join(" / ");
  const loveSignal = seed.derivedSignals.loveRelationshipSignals.join(" / ");
  const relationSignal = seed.derivedSignals.humanRelationSignals.join(" / ");
  const healthSignal = seed.derivedSignals.healthMindSignals.join(" / ");
  const crisisSignal = seed.derivedSignals.crisisSignals.join(" / ");
  const opportunitySignal = seed.derivedSignals.opportunitySignals.join(" / ");
  const monthlySignal = seed.derivedSignals.monthlyStrategySignals.join(" / ");

  return chapterSpec.categories.map((category, idx) => {
    const scopeKey = `${chapterSpec.no}-${idx + 1}`;
    if (chapterSpec.no === 8) {
      if (idx === 0) return makeBody(`${category}: 1월부터 6월까지의 흐름을 ${yearSignal} 기준으로 읽고 상반기 실행 타이밍을 정리합니다.`, 920, scopeKey);
      if (idx === 1) return makeBody(`${category}: 7월부터 12월까지의 흐름을 ${monthlySignal}과 연결해 하반기 성과 및 정리 포인트를 제안합니다.`, 920, scopeKey);
      if (idx === 2) return makeBody(`${category}: 점수가 낮은 달을 골라 ${crisisSignal}와 함께 조심 포인트를 설명합니다.`, 920, scopeKey);
      if (idx === 3) return makeBody(`${category}: 점수가 높은 달을 골라 ${opportunitySignal}과 함께 기회 활용법을 제안합니다.`, 920, scopeKey);
      return makeBody(`${category}: 1월부터 12월까지 월별 점수를 실제 일정 운영 기준으로 바꾸는 방법을 설명합니다.`, 920, scopeKey);
    }

    if (chapterSpec.no === 10) {
      if (idx === 0) return makeBody(`${category}: 올해 전체를 관통하는 메시지는 ${yearSignal}이며, ${annualTenGod} 기운을 실제 선택 기준으로 바꾸는 데 초점을 둡니다.`, 920, scopeKey);
      if (idx === 1) return makeBody(`${category}: ${careerSignal}와 ${moneySignal}를 기준으로 지금 가장 먼저 덜어내야 할 문제를 정리합니다.`, 920, scopeKey);
      if (idx === 2) return makeBody(`${category}: ${opportunitySignal}과 ${careerSignal}을 연결해 올해 반드시 밀어붙여야 할 핵심 과제를 제안합니다.`, 920, scopeKey);
      if (idx === 3) return makeBody(`${category}: ${crisisSignal}와 ${healthSignal}을 함께 고려해 올해 과감히 내려놓아야 할 습관과 관계를 정리합니다.`, 920, scopeKey);
      if (idx === 4) return makeBody(`${category}: ${monthlySignal}을 활용해 1년 전체를 운영하는 실전 전략을 조언합니다.`, 920, scopeKey);
    }

    const base = [
      `${chapterSpec.no}장 ${category}는 ${year}년 ${dayMaster} 일간 기준으로 ${annualPillar} 세운과 ${annualTenGod} 관계를 읽는 항목입니다.`,
      `핵심 신호는 ${yearSignal || careerSignal || moneySignal || relationSignal || healthSignal}.`,
      `실행 관점에서는 ${seed.structure.geokguk || "격국 정보"}, ${seed.structure.usefulGodKeywords.join(" / ") || "용신 키워드"}, ${seed.twelveGrowthStages[0].stage} 등의 계산 신호를 현실 행동으로 바꾸는 것이 중요합니다.`,
    ].join(" ");
    return makeBody(base, 920, scopeKey);
  });
}

function makeChapterDraft(seed, chapterSpec) {
  const bodies = makeSectionBodies(seed, chapterSpec);
  const sections = chapterSpec.categories.map((title, idx) => ({
    title,
    body: bodies[idx],
  }));
  return {
    no: chapterSpec.no,
    title: chapterSpec.title,
    sections,
    text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
  };
}

describe("saju new year high-quality assembled pipeline", () => {
  test("입력 정규화는 selectedYear와 birthTime을 표준화한다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ birthTime: "오전 7시 15분", selectedYear: 2027 }));
    expect(normalized.ok).toBe(true);
    expect(normalized.targetYear).toBe(2027);
    expect(normalized.birthInput.birthDate).toBe("1991-02-20");
    expect(normalized.birthInput.birthHour).toBe(7);
    expect(normalized.birthInput.birthMinute).toBe(15);
    expect(normalized.birthInput.isTimeUnknown).toBe(false);
  });

  test("seed는 계산 JSON만 포함하고 챕터 스펙은 targetYear에 맞게 동적으로 생성된다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    expect(normalized.ok).toBe(true);

    const seed = utils.buildPdfSeed(normalized.profile, normalized.targetYear, makePayload());
    const chapterSpecs = utils.buildSajuNewYearChapterSpecs(seed.input.targetYear);

    expect(seed.input.targetYear).toBe(2026);
    expect(seed.natalChart.dayMaster).toBe("辛");
    expect(Array.isArray(seed.fiveElements.strongest)).toBe(true);
    expect(seed.fiveElements.strongest.length).toBeGreaterThan(0);
    expect(seed.luckCycles.monthlyFortunes).toHaveLength(12);
    expect(seed.chapterSpecs).toHaveLength(10);
    expect(chapterSpecs[0].title).toContain("제 1장");
    expect(chapterSpecs[9].title).toContain("제 10장");
  });

  test("핵심 seed JSON이 비면 SAJU_NEW_YEAR_SEED_INVALID 검증에 걸려야 한다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    const seed = utils.buildPdfSeed(normalized.profile, normalized.targetYear, makePayload());

    seed.natalChart.dayMaster = "";
    seed.luckCycles.monthlyFortunes = [];

    const validation = utils.validateSajuNewYearSeed(seed);
    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain("natalChart.dayMaster");
    expect(validation.errors).toContain("luckCycles.monthlyFortunes");
  });

  test("high-quality 챕터 조립은 최종 품질 검증을 통과한다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    const yearly = utils.normalizeYearlySajuInput({
      profile: normalized.profile,
      targetYear: normalized.targetYear,
      body: makePayload(),
    });
    const chapterResult = utils.composeYearlySajuChapters(yearly);

    expect(chapterResult.validation.ok).toBe(true);
    expect(chapterResult.validation.errors).toHaveLength(0);
    expect(chapterResult.chapters).toHaveLength(10);
    expect(chapterResult.manuscriptSource).toBe("high-quality-consultation");
    expect(chapterResult.validation.stats.sentenceDiversity.maxSectionSimilarity).toBeLessThanOrEqual(0.68);
  });

  test("PDF 생성 결과는 10챕터와 완료 검증 payload를 만든다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    const generated = utils.generateYearlySajuPdf(normalized.profile, normalized.targetYear, {
      body: makePayload(),
      metadata: { reportType: "sajuNewYear", sessionId: "jest-high-quality" },
    });

    expect(generated.validation.ok).toBe(true);
    expect(generated.chapters).toHaveLength(10);
    expect(generated.manuscriptSource).toBe("high-quality-consultation");
    expect(generated.pdfCompletionValidation.ok).toBe(true);
    expect(generated.pdfReady.metadata.qualityStatus).toBe("passed");
    expect(generated.pdfReady.html).toContain("최종 신년 로드맵");
  });

  test("deterministic 챕터 샘플은 현재 챕터 구조를 채운다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    const seed = utils.buildPdfSeed(normalized.profile, normalized.targetYear, makePayload());
    const chapterSpec = utils.buildSajuNewYearChapterSpecs(seed.input.targetYear)[3];
    const chapter = utils.buildDeterministicChapterFromSpec(seed, chapterSpec, "forced_fallback");

    expect(chapter.sections).toHaveLength(chapterSpec.categories.length);
    expect(chapter.source).toBe("local-reinforced");
    expect(chapter.sections.every((section) => typeof section.body === "string" && section.body.length >= 700)).toBe(true);
  });

  test("분리된 상수 모듈과 /chapters 응답은 동일한 챕터 스펙을 유지해야 한다", async () => {
    const request = new Request("https://example.test/api/saju-new-year/chapters", { method: "GET" });
    const response = await route.handleSajuNewYearRoutes(request, {});
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.serviceKey).toBe(constants.SERVICE_KEY);
    expect(body.chapterCount).toBe(constants.NEW_YEAR_CHAPTERS.length);
    expect(body.chapters).toEqual(route.__sajuNewYearTestUtils.buildSajuNewYearChapterSpecs(body.targetYear));
  });
});
