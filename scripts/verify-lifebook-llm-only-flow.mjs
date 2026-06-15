import { __lifeBookTestUtils as utils, LIFE_BOOK_PDF_CONFIG } from "../worker/routes/saju-lifebook.js";

const labelPrefix = "lifebook-local-assembled";
const blockedHosts = [
  "generativelanguage.googleapis.com",
  "vertexai.googleapis.com",
  "api.openai.com",
];
const forbiddenPdfText = [
  "undefined",
  "null",
  "NaN",
  "[object Object]",
  "준비중",
  "생성 실패",
  "스켈레톤",
  "무조건",
  "반드시 성공",
  "반드시 이혼",
  "100%",
  "확정 수익",
  "수익 보장",
  "투자하면 오른다",
  "종목 추천",
  "투자 판단",
];

const expectedPhase6Titles = [
  "프롤로그 — 내 인생의 핵심 코드",
  "원국 해석 — 태어난 순간의 구조",
  "일간과 월지 — 내가 세상을 살아가는 기본 방식",
  "오행 균형 — 넘치는 기운과 부족한 기운",
  "십성 구조 — 성격, 재능, 욕망의 패턴",
  "용신·희신·기신 — 나를 살리는 방향과 피해야 할 방향",
  "격국과 삶의 큰 틀 — 인생이 풀리는 방식",
  "연애와 관계 — 사랑, 결혼, 친밀감의 패턴",
  "직업과 재물 — 돈이 들어오는 방식과 커리어 방향",
  "건강과 생활 리듬 — 몸과 마음의 관리법",
  "대운 분석 — 인생의 큰 계절 변화",
  "선택 연도와 가까운 미래 — 세운·월운 기반 실전 조언",
  "마스터플랜 — 앞으로의 선택과 실행 전략",
];

const expectedPhase6Sections = [
  "챕터 표지",
  "한 줄 핵심 메시지",
  "명리 구조 요약",
  "쉬운 현실 언어 해석",
  "강점 분석",
  "주의점 분석",
  "상담 확인 질문",
  "장 요약 박스",
  "다음 장으로 연결되는 문장",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[${labelPrefix}] ${message}`);
  }
}

function assertInterpretationBlockShape(block, label) {
  assert(typeof block?.id === "string" && block.id, `${label} block id missing`);
  assert(Array.isArray(block?.tags), `${label} block tags missing`);
  assert(Number.isFinite(Number(block?.weight)), `${label} block weight missing`);
  assert(typeof block?.title === "string" && block.title, `${label} block title missing`);
  assert(typeof block?.summary === "string" && block.summary, `${label} block summary missing`);
  assert(Array.isArray(block?.body), `${label} block body missing`);
  assert(Array.isArray(block?.advice), `${label} block advice missing`);
  assert(Array.isArray(block?.caution), `${label} block caution missing`);
  assert(Array.isArray(block?.checklist), `${label} block checklist missing`);
}

function getChapterMarkdown(finalMarkdown, title, nextTitle = "", index = 0) {
  const chapterPrefix = `## ${utils.CHAPTER_BLUEPRINTS[index]?.roman}. ${title}`;
  const nextPrefix = nextTitle ? `## ${utils.CHAPTER_BLUEPRINTS[index + 1]?.roman}. ${nextTitle}` : "";
  const start = finalMarkdown.indexOf(chapterPrefix);
  if (start < 0) return "";
  const end = nextPrefix ? finalMarkdown.indexOf(nextPrefix, start + chapterPrefix.length) : -1;
  return finalMarkdown.slice(start, end > start ? end : undefined);
}

function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function buildProfile() {
  return {
    name: "Local User",
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
    geokguk: "resource-centered structure",
    relationshipFocus: "steady partnership rhythm",
    spouseSignal: "relationship signals work through trust and timing.",
    wealthSignal: "wealth grows through repeatable systems and careful pacing.",
    careerSignal: "career flow favors expertise, planning, and visible output.",
    talentSignal: "talent becomes stronger when ideas are organized into practice.",
    timing: { current: "gyeongsin", next: "sinyu", year: 2026, yearPillar: "byeongo" },
    weakSignals: ["fire rhythm", "rest rhythm"],
    topTenGod: "resource",
  };
}

function buildBirthInput(profile = buildProfile()) {
  return {
    name: profile.name,
    gender: profile.gender,
    calendarType: profile.calendarType,
    birthDate: "1991-02-20",
    birthTime: "07:30",
    birthHour: 7,
    birthMinute: 30,
    timezone: "Asia/Seoul",
    birthplace: "Seoul",
  };
}

function buildLifeBookBody() {
  return { analysisSignals: buildSignals() };
}

function buildNormalizedLifeBookFixture({ sessionId = "", requestId = "" } = {}) {
  const profile = buildProfile();
  const birthInput = buildBirthInput(profile);
  const body = buildLifeBookBody();
  const precomputedCalculation = utils.calculateSajuLocally({ birthInput, profile, body, sessionId });
  return utils.normalizeLifeBookInput({
    birthInput,
    profile,
    signals: precomputedCalculation.signals,
    localSajuJson: precomputedCalculation.localSajuJson,
    body,
    sessionId,
    requestId,
  });
}

async function run() {
  assert(LIFE_BOOK_PDF_CONFIG.generationMode === "local-assembled", "generation mode must be local-assembled");
  assert(LIFE_BOOK_PDF_CONFIG.provider === "saju-assembler", "provider must be saju-assembler");
  const expectedTemplateVersion = LIFE_BOOK_PDF_CONFIG.templateVersion;
  assert(/^life-book-local-assembled-v\d+$/.test(expectedTemplateVersion), "template version mismatch");

  const originalFetch = globalThis.fetch;
  const seenUrls = [];
  globalThis.fetch = async (input) => {
    const url = String(input?.url || input || "");
    seenUrls.push(url);
    if (blockedHosts.some((host) => url.includes(host))) {
      throw new Error(`[${labelPrefix}] forbidden external LLM fetch: ${url}`);
    }
    throw new Error(`[${labelPrefix}] unexpected fetch during local assembly: ${url}`);
  };

  try {
    const envWithKeys = {
      GEMINI_API_KEY: "test-key",
      GOOGLE_API_KEY: "test-key",
      PREMIUM_GEMINI_MODEL: "gemini-2.5-flash",
      LIFE_BOOK_LLM_ENHANCEMENT_ENABLED: "true",
    };
    const runtime = utils.resolveLifeBookAssemblyRuntimeInfo(envWithKeys);
    assert(runtime.provider === "saju-assembler", "runtime provider must remain saju-assembler even when keys exist");
    assert(runtime.runtime === "local-assembled", "runtime must remain local-assembled even when keys exist");
    assert(runtime.externalCallsAllowed === false, "runtime external calls must be disabled");
    assert(utils.CHAPTER_BLUEPRINTS.length === 13, "phase6 must keep 13 fixed chapters");
    expectedPhase6Titles.forEach((title, index) => {
      const blueprint = utils.CHAPTER_BLUEPRINTS[index];
      assert(blueprint?.title === title, `phase6 chapter title mismatch: ${index + 1}`);
      assert(Array.isArray(blueprint?.categories) && blueprint.categories.length >= 7, `phase6 chapter categories missing: ${index + 1}`);
      blueprint.categories.forEach((section, sectionIndex) => {
        assert(typeof section === "string" && section.trim(), `phase6 section title missing in chapter ${index + 1}.${sectionIndex + 1}`);
      });
    });

    const assemblyFixture = buildNormalizedLifeBookFixture({
      sessionId: "verify-lifebook-local-assembled-session",
      requestId: "verify-lifebook-local-assembled",
    });
    const generated = await utils.assembleLifeBookChaptersLocally(envWithKeys, {
      profile: assemblyFixture.profile,
      signals: assemblyFixture.signals,
      assemblyInput: assemblyFixture.assemblyInput,
      requestId: "verify-lifebook-local-assembled",
    });

    assert(Array.isArray(generated.chapters) && generated.chapters.length === 13, "local assembly must return 13 chapters");
    assert(generated.generationMode === "local-assembled", "result generation mode must be local-assembled");
    assert(generated.provider === "saju-assembler", "result provider must be saju-assembler");
    assert(generated.localAssembly?.enabled === true, "result local assembly must be enabled");
    assert(generated.localAssembly?.externalGeneration === false, "result external generation must be disabled");
    assert(generated.localAssembly?.externalCallsAllowed === false, "result external calls must be disabled");
    assert(generated.localAssembly?.chapterCount === 13, "result local assembly chapter count mismatch");
    assert(generated.localAssembly?.expectedChapterCount === 13, "result expected chapter count mismatch");
    assert(generated.localAssembly?.templateVersion === LIFE_BOOK_PDF_CONFIG.templateVersion, "result template version mismatch");
    assert(seenUrls.length === 0, `local assembly must not call fetch, got ${seenUrls.join(", ")}`);

    const generatedText = [
      generated.finalManuscriptMarkdown,
      ...generated.chapters.flatMap((chapter) => [
        chapter.finalText,
        chapter.text,
        ...(Array.isArray(chapter.categories) ? chapter.categories.map((category) => category.finalText || category.text) : []),
      ]),
    ].join("\n");
    const leakedToken = forbiddenPdfText.find((token) => generatedText.includes(token));
    assert(!leakedToken, `forbidden PDF text leaked: ${leakedToken}`);

    const profile = buildProfile();
    const pipeline = await utils.generateLifeBookPdf(profile, {
      env: envWithKeys,
      birthInput: buildBirthInput(profile),
      body: buildLifeBookBody(),
      sessionId: "verify-lifebook-local-assembled-session",
      reportId: "verify-lifebook-local-assembled-report",
      requestId: "verify-lifebook-local-assembled-pipeline",
    });

    assert(Array.isArray(pipeline.completedChapters) && pipeline.completedChapters.length === 13, "pipeline must return 13 chapters");
    expectedPhase6Titles.forEach((title, index) => {
      assert(pipeline.completedChapters[index]?.title === title, `pipeline chapter title mismatch: ${index + 1}`);
    });
    assert(pipeline.generatedLifeBook?.generationMode === "local-assembled", "pipeline generation mode must be local-assembled");
    assert(pipeline.generatedLifeBook?.localAssembly?.enabled === true, "pipeline local assembly must be enabled");
    assert(pipeline.generatedLifeBook?.localAssembly?.externalGeneration === false, "pipeline external generation must be disabled");
    assert(pipeline.generatedLifeBook?.localAssembly?.chapterCount === 13, "pipeline local assembly chapter count mismatch");
    assert(typeof pipeline.html === "string" && pipeline.html.includes("<!doctype html>"), "pipeline must render html");
    assert(pipeline.pdf?.renderFormat === "pdf-archive", "pipeline pdf render format mismatch");
    assert(typeof pipeline.cacheKey === "string" && pipeline.cacheKey.includes(`life_book_pdf:${expectedTemplateVersion}:`), "pipeline cache key missing");
    assert(typeof pipeline.calculationResultHash === "string" && pipeline.calculationResultHash.length > 0, "pipeline calculation result hash missing");
    assert(pipeline.cacheHit === false, "first pipeline run must render before cache");
    const normalized = pipeline.lifeBookNormalizedData;
    assert(normalized?.profile?.birthDate === "1991-02-20", "normalized profile birthDate missing");
    assert(typeof normalized?.pillars?.year === "string", "normalized year pillar missing");
    assert(typeof normalized?.pillars?.month === "string", "normalized month pillar missing");
    assert(typeof normalized?.pillars?.day === "string", "normalized day pillar missing");
    assert(typeof normalized?.dayMaster?.stem === "string", "normalized day master missing");
    assert(["weak", "balanced", "strong", undefined].includes(normalized?.dayMaster?.strength), "normalized day master strength invalid");
    ["wood", "fire", "earth", "metal", "water"].forEach((element) => {
      assert(Number.isFinite(Number(normalized?.fiveElements?.[element])), `normalized element count missing: ${element}`);
    });
    assert(Array.isArray(normalized?.fiveElements?.strongest), "normalized strongest elements missing");
    assert(Array.isArray(normalized?.fiveElements?.weakest), "normalized weakest elements missing");
    assert(typeof normalized?.fiveElements?.balanceSummary === "string", "normalized balance summary missing");
    assert(normalized?.tenGods?.distribution && typeof normalized.tenGods.distribution === "object", "normalized ten gods distribution missing");
    assert(Array.isArray(normalized?.tenGods?.dominant), "normalized dominant ten gods missing");
    assert(Array.isArray(normalized?.tenGods?.weak), "normalized weak ten gods missing");
    assert(typeof normalized?.usefulGods?.summary === "string", "normalized useful gods summary missing");
    assert(Array.isArray(normalized?.structure?.notes), "normalized structure notes missing");
    assert(Array.isArray(normalized?.luckCycles?.monthlyLuck), "normalized monthly luck missing");
    assert(Array.isArray(normalized?.relationships?.clashes), "normalized clashes missing");
    assert(Array.isArray(normalized?.relationships?.combinations), "normalized combinations missing");
    assert(Array.isArray(normalized?.relationships?.punishments), "normalized punishments missing");
    assert(Array.isArray(normalized?.relationships?.harms), "normalized harms missing");
    assert(Array.isArray(normalized?.specialStars), "normalized special stars missing");
    assert(Array.isArray(normalized?.risks), "normalized risks missing");
    assert(Array.isArray(normalized?.opportunities), "normalized opportunities missing");
    const selectedBlocks = utils.selectLifeBookInterpretationBlocks(normalized, utils.CHAPTER_BLUEPRINTS[0], "verify");
    assert(selectedBlocks.length >= 4, "local interpretation blocks must be selected");
    selectedBlocks.forEach((block, index) => assertInterpretationBlockShape(block, `selected-${index}`));
    assert(selectedBlocks.some((block) => block.tags.includes("dayMaster")), "day master block missing");
    assert(selectedBlocks.some((block) => block.tags.includes("element")), "element block missing");
    assert(selectedBlocks.some((block) => block.tags.includes("tenGod")), "ten god block missing");
    assert(selectedBlocks.some((block) => block.tags.includes("usefulGod")), "useful god block missing");
    assertInterpretationBlockShape(Object.values(utils.LIFEBOOK_DAY_MASTER_BLOCKS)[0], "day-master-db");
    assert(Object.keys(utils.LIFEBOOK_DAY_MASTER_BLOCKS).length === 10, "day master block db must cover 10 stems");
    assert(Object.keys(utils.LIFEBOOK_ELEMENT_BLOCKS).length >= 15, "element block db must cover excess deficient balanced");
    assert(Object.keys(utils.LIFEBOOK_TEN_GOD_BLOCKS).length >= 20, "ten god block db must cover strong weak");
    assert(Object.keys(utils.LIFEBOOK_USEFUL_GOD_BLOCKS).length >= 15, "useful god block db must cover yongshin heeshin gishin");
    assert(Object.keys(utils.LIFEBOOK_DOMAIN_BLOCKS).length >= 7, "domain block db must cover core domains");
    const blockText = utils.buildLifeBookBlockInterpretationText(normalized, utils.CHAPTER_BLUEPRINTS[12], "verify");
    assert(typeof blockText === "string" && blockText.length > 300, "block interpretation text missing");
    const alternateBlockText = utils.buildLifeBookBlockInterpretationText(normalized, utils.CHAPTER_BLUEPRINTS[12], "verify-alt");
    assert(blockText !== alternateBlockText, "seeded block interpretation should vary by category seed");
    expectedPhase6Titles.forEach((title) => {
      assert(pipeline.finalManuscriptMarkdown.includes(title), `final manuscript missing phase6 title: ${title}`);
    });
    expectedPhase6Sections.forEach((section) => {
      assert(pipeline.finalManuscriptMarkdown.includes(section), `final manuscript missing phase6 section: ${section}`);
    });
    assert(pipeline.finalManuscriptMarkdown.includes("| 구성 | 역할 |"), "final manuscript must include structure table");
    expectedPhase6Titles.forEach((title, index) => {
      const chapterMarkdown = getChapterMarkdown(pipeline.finalManuscriptMarkdown, title, expectedPhase6Titles[index + 1], index);
      assert(chapterMarkdown.length >= 2000, `chapter minimum body length failed: ${index + 1}`);
      const missingCategory = (utils.CHAPTER_BLUEPRINTS[index]?.categories || []).find((categoryTitle) => !chapterMarkdown.includes(categoryTitle));
      assert(!missingCategory, `chapter category missing: ${index + 1}: ${missingCategory}`);
      assert(chapterMarkdown.includes("상담 확인 질문"), `chapter consultation questions missing: ${index + 1}`);
      assert(chapterMarkdown.includes("장 요약 박스"), `chapter summary box missing: ${index + 1}`);
    });
    assert(countMatches(pipeline.finalManuscriptMarkdown, /\| 구성 \| 역할 \|/g) >= 10, "final manuscript must include at least 10 table/card sections");
    assert(pipeline.finalManuscriptMarkdown.includes("월별 흐름 표"), "final manuscript missing monthly flow table");
    assert(pipeline.finalManuscriptMarkdown.includes("| 월 | 흐름 | 실전 조언 |"), "final manuscript missing monthly flow table header");
    assert(pipeline.finalManuscriptMarkdown.includes("인생 마스터플랜 표"), "final manuscript missing masterplan table");
    assert(pipeline.finalManuscriptMarkdown.includes("| 영역 | 해석 기준 | 확인할 내용 |"), "final manuscript missing masterplan table header");
    assert(pipeline.finalManuscriptMarkdown.includes("Code:Destiny"), "final manuscript missing service name");
    assert(pipeline.finalManuscriptMarkdown.includes("나의 사주 구조로 읽는 삶의 방향"), "final manuscript missing cover subtitle");
    assert(pipeline.finalManuscriptMarkdown.includes("생성일:"), "final manuscript missing generated date");
    assert(pipeline.finalManuscriptMarkdown.includes("오행 균형표"), "final manuscript missing five element table");
    assert(pipeline.finalManuscriptMarkdown.includes("| 오행 | 읽는 방향 | 관리 포인트 |"), "final manuscript missing five element table header");
    assert(pipeline.finalManuscriptMarkdown.includes("십성 분포표"), "final manuscript missing ten god table");
    assert(pipeline.finalManuscriptMarkdown.includes("| 십성 축 | 삶에서 드러나는 장면 | 상담 포인트 |"), "final manuscript missing ten god table header");
    assert(pipeline.finalManuscriptMarkdown.includes("대운 흐름표"), "final manuscript missing daewoon table");
    assert(pipeline.finalManuscriptMarkdown.includes("| 구간 | 의미 | 실행 방향 |"), "final manuscript missing daewoon table header");
    assert(pipeline.finalManuscriptMarkdown.includes("마지막 페이지 — 전체 요약과 재열람 안내"), "final manuscript missing closing page");
    assert(pipeline.finalManuscriptMarkdown.includes("30일 실천 루틴"), "final manuscript missing 30-day routine");
    assert(pipeline.finalManuscriptMarkdown.includes("재열람 안내"), "final manuscript missing revisit guide");
    assert(countMatches(pipeline.finalManuscriptMarkdown, /챕터 표지/g) >= 13, "final manuscript must include chapter cover sections");
    const finalLeakedToken = forbiddenPdfText.find((token) => pipeline.finalManuscriptMarkdown.includes(token));
    assert(!finalLeakedToken, `forbidden final manuscript text leaked: ${finalLeakedToken}`);
    assert(!/반드시\s*(성공|이혼|돈|수익)/.test(pipeline.finalManuscriptMarkdown), "risky absolute phrase leaked");
    assert(!/(투자하면\s*오른다|수익\s*보장|종목\s*추천)/.test(pipeline.finalManuscriptMarkdown), "investment advice phrase leaked");
    assert(pipeline.html.includes("lb-markdown-table"), "pipeline html must render markdown tables");
    assert(pipeline.html.includes("lb-final-section--front"), "pipeline html missing premium cover style");
    assert(pipeline.html.includes("lb-final-section--chapter"), "pipeline html missing chapter cover style");
    assert(!pipeline.html.includes("[object Object]"), "pipeline html leaked object text");

    const cachedPipeline = await utils.generateLifeBookPdf(profile, {
      env: envWithKeys,
      birthInput: buildBirthInput(profile),
      body: buildLifeBookBody(),
      sessionId: "verify-lifebook-local-assembled-session-refresh",
      reportId: "verify-lifebook-local-assembled-report-refresh",
      requestId: "verify-lifebook-local-assembled-pipeline-refresh",
    });

    assert(cachedPipeline.cacheHit === true, "second matching pipeline run must use cache");
    assert(cachedPipeline.fromCache === true, "second matching pipeline run must be marked fromCache");
    assert(cachedPipeline.cacheKey === pipeline.cacheKey, "cached pipeline cache key mismatch");
    assert(cachedPipeline.calculationResultHash === pipeline.calculationResultHash, "cached pipeline calculation hash mismatch");
    assert(Array.isArray(cachedPipeline.completedChapters) && cachedPipeline.completedChapters.length === 13, "cached pipeline must keep 13 chapters");
    const cachedLeakedToken = forbiddenPdfText.find((token) => cachedPipeline.finalManuscriptMarkdown.includes(token));
    assert(!cachedLeakedToken, `forbidden cached manuscript text leaked: ${cachedLeakedToken}`);
    assert(!cachedPipeline.html.includes("[object Object]"), "cached pipeline html leaked object text");
    assert(seenUrls.length === 0, `full local assembly pipeline must not call fetch, got ${seenUrls.join(", ")}`);
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log(`[${labelPrefix}] PASS`);
}

run().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
