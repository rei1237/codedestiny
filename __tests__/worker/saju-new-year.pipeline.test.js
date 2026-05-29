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
      if (idx === 0) {
        return makeBody(`${category}: 상반기는 1월부터 6월까지 ${yearSignal} 흐름으로, ${dayMaster} 일간의 기준을 세우는 구간입니다. 1월, 2월, 3월, 4월, 5월, 6월의 이동을 한 번에 묶어 실행 우선순위를 정리합니다.`, 760, scopeKey);
      }
      if (idx === 1) {
        return makeBody(`${category}: 하반기는 7월부터 12월까지 ${yearSignal} 흐름을 수익화하고 구조화하는 구간입니다. 7월, 8월, 9월, 10월, 11월, 12월의 흐름을 실제 일정과 연결합니다.`, 760, scopeKey);
      }
      if (idx === 2) {
        return makeBody(`${category}: ${opportunitySignal || "고점 월"}에서는 ${annualPillar} 세운이 강하게 드러나며 제안, 계약, 런칭을 검토하기 좋습니다. 월별 점수보다 실행 타이밍을 더 정밀하게 맞춥니다.`, 760, scopeKey);
      }
      if (idx === 3) {
        return makeBody(`${category}: ${crisisSignal || "저점 월"}에서는 ${annualTenGod} 신호가 압박으로 바뀔 수 있어 지출과 감정 반응을 늦추는 것이 좋습니다. 1월부터 12월까지 모든 달을 점검표로 관리합니다.`, 760, scopeKey);
      }
      return makeBody(`${category}: ${monthlySignal} 흐름을 기준으로 월별 행동표를 만듭니다. 1월부터 12월까지 각 달의 선택 기준을 분리해서 기록합니다.`, 760, scopeKey);
    }

    if (chapterSpec.no === 10) {
      if (idx === 1) {
        return makeBody(`${category}: 첫 3개월은 ${yearSignal}를 바탕으로 기반을 고정하는 구간입니다. 3개월 전략은 일정, 관계, 지출을 먼저 정리하는 데 초점을 둡니다.`, 760, scopeKey);
      }
      if (idx === 2) {
        return makeBody(`${category}: 6개월 전략은 ${careerSignal}와 ${moneySignal} 신호를 연결해 실행 효율을 높이는 단계입니다. 6개월 동안 반복 가능한 수익 구조를 만들고 품질을 고도화합니다.`, 760, scopeKey);
      }
      if (idx === 3) {
        return makeBody(`${category}: 12개월 전략은 ${loveSignal}와 ${relationSignal} 신호까지 포함해 한 해 전체를 완성하는 구간입니다. 12개월 완성 전략은 연말에 남길 결과와 습관을 함께 설계합니다.`, 760, scopeKey);
      }
      if (idx === 4) {
        return makeBody(`${category}: 최종 조언과 선언문은 ${healthSignal}와 ${crisisSignal}를 의식한 현실적 선택을 강조합니다. 올해를 마무리하는 핵심 선언을 한 문장으로 정리합니다.`, 760, scopeKey);
      }
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
    expect(chapterSpecs[0].title).toContain("2026년 총운");
    expect(chapterSpecs[9].title).toContain("2026년 마스터플랜");
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
    expect(chapters[9].text).toContain("3개월");
    expect(chapters[9].text).toContain("6개월");
    expect(chapters[9].text).toContain("12개월");
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
    expect(normalizedChapter.sections).toHaveLength(5);
    expect(normalizedChapter.sections[0].title).toBe(chapterSpec.categories[0]);
  });
});
