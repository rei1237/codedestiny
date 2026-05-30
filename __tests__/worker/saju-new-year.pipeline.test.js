/**
 * @jest-environment node
 */

let route;

beforeAll(async () => {
  route = await import("../../worker/routes/saju-new-year.js");
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

function makeBody(text, minimumLength = 700, scopeKey = "0-0") {
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
      const start = idx * 2;
      const months = seed.luckCycles.monthlyFortunes.slice(start, start + 2);
      const monthNames = months.map((m) => `${m.month}월`).join("와 ");
      return makeBody(`${category}: ${monthNames} 구간은 ${yearSignal} 흐름으로 분석합니다. 1월부터 12월까지 모든 달의 점수와 조언을 실행 일정과 연결합니다.`, 760, scopeKey);
    }

    if (chapterSpec.no === 10) {
      if (idx === 1) return makeBody(`${category}: 1분기(1~3월)는 ${yearSignal}를 바탕으로 기반을 고정하는 구간입니다. 1분기 전략은 일정, 관계, 지출을 먼저 정리하는 데 초점을 둡니다.`, 760, scopeKey);
      if (idx === 2) return makeBody(`${category}: 2분기(4~6월) 전략은 ${careerSignal}와 ${moneySignal} 신호를 연결해 실행 효율을 높이는 단계입니다. 2분기 동안 반복 가능한 수익 구조를 만듭니다.`, 760, scopeKey);
      if (idx === 3) return makeBody(`${category}: 3분기(7~9월) 전략은 ${loveSignal}와 ${relationSignal} 신호까지 포함해 성과를 가시화하는 구간입니다. 3분기 완성을 위해 목표를 점검합니다.`, 760, scopeKey);
      if (idx === 4) return makeBody(`${category}: 4분기(10~12월) 전략은 ${healthSignal}와 ${crisisSignal}를 의식한 현실적 마무리를 강조합니다. 4분기에 올해를 완성하는 핵심 선언을 정리합니다.`, 760, scopeKey);
    }

    const base = [
      `${chapterSpec.no}장 ${category}는 ${year}년 ${dayMaster} 일간 기준으로 ${annualPillar} 세운과 ${annualTenGod} 관계를 읽는 항목입니다.`,
      `핵심 신호는 ${yearSignal || careerSignal || moneySignal || relationSignal || healthSignal}.`,
      `실행 관점에서는 ${seed.structure.geokguk || "격국 정보"}, ${seed.structure.usefulGodKeywords.join(" / ") || "용신 키워드"}, ${seed.twelveGrowthStages[0].stage} 등의 계산 신호를 현실 행동으로 바꾸는 것이 중요합니다.`,
    ].join(" ");
    return makeBody(base, 720, scopeKey);
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

describe("saju new year LLM-only pipeline", () => {
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
    expect(chapterSpecs[0].title).toContain("Chapter I");
    expect(chapterSpecs[9].title).toContain("Chapter X");
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

  test("프롬프트는 로컬 원고 보강이 아니라 새 챕터 작성 지침을 담는다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    const seed = utils.buildPdfSeed(normalized.profile, normalized.targetYear, makePayload());
    const prompt = utils.buildSajuNewYearChapterPrompt(seed, seed.chapterSpecs[0], []);

    expect(prompt).toContain("JSON seed");
    expect(prompt).toContain("챕터 구조");
    expect(prompt).toContain("각 세부 카테고리 본문은 최소 600자 이상");
    expect(prompt).not.toMatch(/localSummary|manuscript|rewrite/i);
  });

  test("LLM 결과 챕터는 섹션 기반 품질 검증을 통과한다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    const seed = utils.buildPdfSeed(normalized.profile, normalized.targetYear, makePayload());
    const chapterSpecs = utils.buildSajuNewYearChapterSpecs(seed.input.targetYear);
    const chapters = chapterSpecs.map((spec) => makeChapterDraft(seed, spec));

    const quality = utils.validateSajuNewYearPdfLLMInterpretationQuality({
      chapters,
      expectedChapters: chapterSpecs,
      minChapterLength: 3000,
      minSectionLength: 600,
      seed,
    });

    expect(quality.ok).toBe(true);
    expect(quality.errors).toHaveLength(0);
    expect(chapters).toHaveLength(10);
    expect(chapters[7].text).toContain("1월");
    expect(chapters[7].text).toContain("12월");
    expect(chapters[9].text).toContain("1분기");
    expect(chapters[9].text).toContain("2분기");
  });

  test("정규화된 챕터는 섹션 제목과 본문을 보존한다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    const seed = utils.buildPdfSeed(normalized.profile, normalized.targetYear, makePayload());
    const chapterSpec = utils.buildSajuNewYearChapterSpecs(seed.input.targetYear)[0];
    const parsed = {
      sections: chapterSpec.categories.map((title, idx) => ({
        title,
        body: makeBody(`${chapterSpec.title} ${title} ${idx}번 섹션은 ${seed.input.targetYear}년 흐름을 읽는 상담문입니다.`, 650),
      })),
    };

    const normalizedChapter = utils.normalizeGeneratedChapter(chapterSpec, parsed);
    expect(normalizedChapter).not.toBeNull();
    expect(normalizedChapter.sections).toHaveLength(6);
    expect(normalizedChapter.sections[0].title).toBe(chapterSpec.categories[0]);
  });

  test("품질 미달 챕터는 deterministic 보강으로 최소 기준을 충족해야 한다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    const seed = utils.buildPdfSeed(normalized.profile, normalized.targetYear, makePayload());
    const chapterSpecs = utils.buildSajuNewYearChapterSpecs(seed.input.targetYear);
    const chapters = chapterSpecs.map((spec) => makeChapterDraft(seed, spec));
    const weakSpec = chapterSpecs[0];
    const weakChapter = {
      no: weakSpec.no,
      title: weakSpec.title,
      sections: weakSpec.categories.map((title) => ({
        title,
        body: "짧은 일반론 문장입니다. 올해는 좋은 일이 생길 수 있습니다.",
      })),
      text: "짧은 일반론 문장",
      source: "llm",
    };

    const repaired = utils.reinforceChapterFromSpec({
      seed,
      chapterSpec: weakSpec,
      chapter: weakChapter,
      reason: "test_quality_repair",
    });
    chapters[0] = repaired.chapter;

    expect(repaired.reinforced).toBe(true);
    const quality = utils.validateSajuNewYearPdfLLMInterpretationQuality({
      chapters,
      expectedChapters: chapterSpecs,
      minChapterLength: 3000,
      minSectionLength: 600,
      seed,
    });
    expect(quality.ok).toBe(true);
  });

  test("LLM 챕터가 비어도 deterministic 챕터를 즉시 구성할 수 있어야 한다", () => {
    const utils = route.__sajuNewYearTestUtils;
    const normalized = utils.normalizeInput(makePayload({ selectedYear: 2026 }));
    const seed = utils.buildPdfSeed(normalized.profile, normalized.targetYear, makePayload());
    const chapterSpec = utils.buildSajuNewYearChapterSpecs(seed.input.targetYear)[3];
    const chapter = utils.buildDeterministicChapterFromSpec(seed, chapterSpec, "forced_fallback");

    expect(chapter.sections).toHaveLength(chapterSpec.categories.length);
    expect(chapter.source).toBe("llm-reinforced");
    expect(chapter.sections.every((section) => typeof section.body === "string" && section.body.length >= 600)).toBe(true);
  });
});
