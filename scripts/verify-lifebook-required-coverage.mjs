import { __lifeBookTestUtils as utils } from "../worker/routes/saju-lifebook.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function text(value) {
  return String(value == null ? "" : value).trim();
}

function buildProfile() {
  return {
    name: "Coverage User",
    gender: "male",
    calendarType: "solar",
    year: 1991,
    month: 2,
    day: 20,
    hour: 7,
    minute: 30,
    timeKnown: true,
    birthplace: "Seoul",
    birthIso: "1991-02-20 07:30",
  };
}

function buildSignals() {
  return {
    dayMaster: "gap",
    yearStem: "sin",
    monthStem: "gyeong",
    hourStem: "byeong",
    yearBranch: "mi",
    monthBranch: "in",
    dayBranch: "ja",
    hourBranch: "jin",
    useful: "wood",
    support: "water",
    caution: "metal",
    dominantElement: "wood",
    weakestElement: "fire",
    powerLabel: "balanced",
    currentDaewun: "gyeongsin",
    nextDaewun: "sinyu",
    currentYearPillar: "byeongo",
    geokguk: "resource-centered structure",
    relationshipFocus: "steady partnership rhythm",
    spouseSignal: "relationship signals work through trust and timing.",
    wealthSignal: "wealth grows through repeatable systems and careful pacing.",
    careerSignal: "career flow favors expertise, planning, and visible output.",
    talentSignal: "talent becomes stronger when ideas are organized into practice.",
    timing: { current: "gyeongsin", next: "sinyu", year: 2026, yearPillar: "byeongo" },
    currentDaewun: "gyeongsin",
    nextDaewun: "sinyu",
    currentYear: 2026,
    currentYearPillar: "byeongo",
    daewunCycles: [
      { label: "gyeongsin", startAge: 32, endAge: 41 },
      { label: "sinyu", startAge: 42, endAge: 51 },
      { label: "imsa", startAge: 52, endAge: 61 },
    ],
    currentDaeunNode: { label: "gyeongsin", startAge: 32, endAge: 41 },
    nextDaeunNode: { label: "sinyu", startAge: 42, endAge: 51 },
    elementWeights: { wood: 25, fire: 20, earth: 20, metal: 20, water: 15 },
    tenGodCounts: { resource: 2, wealth: 1, officer: 1, output: 1 },
    tenGodByPillar: { year: "resource", month: "wealth", day: "self", hour: "output" },
    twelveGrowthStages: [
      { pillar: "year", stage: "crown" },
      { pillar: "month", stage: "growth" },
      { pillar: "day", stage: "birth" },
    ],
    specialStars: ["dohwa", "hwagae"],
    weakSignals: ["fire rhythm", "rest rhythm"],
    topTenGod: "resource",
  };
}

function categoryBody(chapter, categoryTitle, index) {
  const focus = Array.isArray(chapter?.engineFocus) ? chapter.engineFocus.map(text).filter(Boolean) : [];
  const focusLine = focus.length ? `Core calculation focus: ${focus.join(", ")}.` : "Core calculation focus: natal pillars, ten gods, elements, and timing.";
  const base = [
    `${categoryTitle} is interpreted from the user's natal pillars, day master, monthly branch, useful element, ten-god balance, and current timing.`,
    focusLine,
    "The reading separates evidence, interpretation, practical decision criteria, caution points, and a thirty-day action rhythm so the result stays precise and usable.",
    `For this section, action step ${index + 1} is to choose one measurable routine, review it weekly, and adjust relationships, work, money, and recovery without exaggerating good or difficult luck.`,
    "The tone remains professional and mystical while avoiding absolute claims, fatalistic wording, internal implementation details, and unsupported certainty.",
  ].join(" ");
  return utils.ensureCategoryLength(
    base,
    chapter.id,
    categoryTitle,
    index,
    utils.LIFEBOOK_MIN_CATEGORY_CHARS + 80,
  );
}

function buildValidChapter(chapter) {
  const categories = chapter.categories.map((categoryTitle, index) => {
    const finalText = categoryBody(chapter, categoryTitle, index);
    return {
      id: String(index + 1),
      title: categoryTitle,
      localSummary: finalText,
      finalText,
      order: index + 1,
    };
  });
  const finalText = [
    chapter.title,
    chapter.subtitle || "",
    ...(Array.isArray(chapter.engineFocus) ? chapter.engineFocus : []),
    ...categories.map((category) => `${category.title}\n${category.finalText}`),
  ].filter(Boolean).join("\n\n");
  return {
    id: chapter.id,
    roman: chapter.roman,
    title: chapter.title,
    subtitle: chapter.subtitle,
    chapterOpening: finalText.slice(0, 1200),
    categories,
    finalText,
    text: finalText,
    reviewedMarkdown: finalText,
    editedMarkdown: finalText,
    mergedMarkdown: finalText,
    source: "verify-lifebook-required-coverage",
  };
}

function run() {
  const blueprints = Array.isArray(utils.CHAPTER_BLUEPRINTS) ? utils.CHAPTER_BLUEPRINTS : [];
  assert(blueprints.length === 13, `[lifebook-required-coverage] expected 13 blueprints, got ${blueprints.length}`);
  assert(Number(utils.LIFEBOOK_A4_TOTAL_TARGET?.pages || 0) === 100, "[lifebook-required-coverage] expected 100 target pages");

  const categoryCount = blueprints.reduce((sum, chapter) => sum + (Array.isArray(chapter.categories) ? chapter.categories.length : 0), 0);
  assert(categoryCount >= 78, `[lifebook-required-coverage] expected at least 78 categories, got ${categoryCount}`);
  blueprints.forEach((chapter, index) => {
    const categories = Array.isArray(chapter.categories) ? chapter.categories : [];
    assert(categories.length > 0, `[lifebook-required-coverage] chapter ${index + 1} has no categories`);
  });

  const chapters = blueprints.map(buildValidChapter);
  const structure = utils.validateLifeBookStructure(chapters);
  assert(structure.ok, `[lifebook-required-coverage] valid sample structure failed: ${JSON.stringify(structure.blockingErrors || [])}`);

  const quality = utils.evaluateLifeBookQuality(chapters);
  const highWarnings = (Array.isArray(quality.warningItems) ? quality.warningItems : []).filter((item) => text(item?.severity) === "high");
  assert(highWarnings.length === 0, `[lifebook-required-coverage] valid sample has high warnings: ${JSON.stringify(highWarnings)}`);

  const reportRows = [];
  blueprints.forEach((blueprint, index) => {
    const chapter = chapters[index];
    const generatedCheck = utils.validateLifeBookGeneratedChapter(chapter, blueprint);
    assert(generatedCheck.ok, `[lifebook-required-coverage] chapter ${blueprint.id} generated check failed: ${JSON.stringify(generatedCheck.errors || [])}`);

    const removedCategory = {
      ...chapter,
      categories: chapter.categories.slice(0, -1),
    };
    const missingCheck = utils.validateLifeBookGeneratedChapter(removedCategory, blueprint);
    assert(
      !missingCheck.ok && Array.isArray(missingCheck.errors) && missingCheck.errors.includes("category_count_mismatch"),
      `[lifebook-required-coverage] chapter ${blueprint.id} missing category was not detected`,
    );

    const renamedCategory = {
      ...chapter,
      categories: chapter.categories.map((category, categoryIndex) => (
        categoryIndex === 0 ? { ...category, title: `${category.title} changed` } : category
      )),
    };
    const titleCheck = utils.validateLifeBookGeneratedChapter(renamedCategory, blueprint);
    assert(
      !titleCheck.ok && Array.isArray(titleCheck.errors) && titleCheck.errors.includes("category_1_title_mismatch"),
      `[lifebook-required-coverage] chapter ${blueprint.id} category title mismatch was not detected`,
    );

    reportRows.push({
      chapter: index + 1,
      id: blueprint.id,
      categories: blueprint.categories.length,
      engineFocus: Array.isArray(blueprint.engineFocus) ? blueprint.engineFocus.length : 0,
    });
  });

  const profile = buildProfile();
  const signals = buildSignals();
  const birthInput = {
    name: profile.name,
    gender: profile.gender,
    calendarType: profile.calendarType,
    birthDate: `${profile.year}-02-20`,
    birthTime: "07:30",
    birthHour: profile.hour,
    birthMinute: profile.minute,
    timezone: "Asia/Seoul",
    birthplace: profile.birthplace,
  };
  const localSajuJson = utils.buildLifeBookLocalSajuJson(birthInput, profile, signals, []);
  const localContract = utils.validateLifeBookJsonContract({ birthInput, localSajuJson });
  assert(localContract.ok, `[lifebook-required-coverage] local json contract failed: ${JSON.stringify(localContract.hardErrors || [])}`);
  const assemblyInput = utils.buildLifeBookAssemblyInput(birthInput, profile, signals, localSajuJson, {});
  assert(assemblyInput.engineContract?.version === "life-book-engine-contract-v2", "[lifebook-required-coverage] engine contract v2 missing");
  assert(assemblyInput.engineContract?.calculationPolicy?.hourPillarTimePolicy === "TRUE_SOLAR_TIME", "[lifebook-required-coverage] calculation policy missing");
  assert(assemblyInput.engineContract?.sourceTrace?.route === "worker.routes.saju-lifebook", "[lifebook-required-coverage] source trace missing");
  const engineContract = utils.validateLifeBookJsonContract({
    birthInput,
    localSajuJson,
    engineContract: assemblyInput.engineContract,
  });
  assert(engineContract.ok, `[lifebook-required-coverage] engine json contract failed: ${JSON.stringify(engineContract.hardErrors || [])}`);
  assemblyInput.engineContract.validation = engineContract;
  const canonicalSajuChart = utils.buildLifeBookCanonicalSajuChartFromContract(assemblyInput.engineContract, localSajuJson);
  const canonicalValidation = utils.validateLifeBookCanonicalSajuChart(canonicalSajuChart);
  assert(canonicalValidation.ok, `[lifebook-required-coverage] canonical json failed: ${JSON.stringify(canonicalValidation.missing || [])}`);
  assemblyInput.engineContract.canonicalSajuChart = { ...canonicalSajuChart, validation: canonicalValidation };
  const evidenceCoverage = utils.buildLifeBookChapterEvidenceCoverage(utils.buildLifeBookChapterPlans(), assemblyInput.engineContract);
  assert(evidenceCoverage.ok, `[lifebook-required-coverage] chapter evidence coverage failed: ${JSON.stringify(evidenceCoverage.lowCoverageChapters || [])}`);

  const html = utils.buildLifeBookDocument({
    profile,
    signals,
    chapters,
    generatedAt: new Date().toISOString(),
    finalManuscriptMarkdown: utils.buildLifeBookDeterministicFinalManuscript(profile, chapters),
  });
  assert(typeof html === "string" && html.includes("<!doctype html>"), "[lifebook-required-coverage] pdf html missing doctype");
  assert(html.includes("인생의 책"), "[lifebook-required-coverage] pdf html missing service title");

  console.log("[lifebook-required-coverage] PASS");
  console.log(`  - targetPages=${utils.LIFEBOOK_A4_TOTAL_TARGET.pages}, categoryCount=${categoryCount}, minChars=${utils.LIFEBOOK_MIN_TOTAL_CHARS}, blockingMinChars=${utils.LIFEBOOK_BLOCKING_MIN_TOTAL_CHARS}`);
  console.log(`  - jsonContract localScore=${localContract.qualityScore}, engineScore=${engineContract.qualityScore}`);
  console.log(`  - canonicalContract score=${canonicalValidation.qualityScore}, softWarnings=${canonicalValidation.softWarnings.length}`);
  console.log(`  - evidenceCoverage ratio=${evidenceCoverage.coverageRatio}, covered=${evidenceCoverage.totalCovered}/${evidenceCoverage.totalRequired}`);
  reportRows.forEach((row) => {
    console.log(`  - ch${String(row.chapter).padStart(2, "0")} ${row.id}: categories=${row.categories}, engineFocus=${row.engineFocus}`);
  });
}

try {
  run();
} catch (error) {
  console.error("[lifebook-required-coverage] FAIL:", error?.message || error);
  process.exitCode = 1;
}
