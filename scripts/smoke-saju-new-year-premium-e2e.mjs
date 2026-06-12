import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { __sajuNewYearTestUtils as newYear } from "../worker/routes/saju-new-year.js";

const routeSource = readFileSync(new URL("../worker/routes/saju-new-year.js", import.meta.url), "utf8");
const handlePrepareSource = routeSource.slice(routeSource.indexOf("async function handlePrepare"));

const profile = {
  name: "테스트",
  gender: "F",
  calendarType: "solar",
  birth: {
    year: 1994,
    month: 8,
    day: 16,
    hour: 9,
    minute: 0,
    calendarType: "solar",
    timezone: "Asia/Seoul",
    birthPlace: "서울",
    latitude: 37.5665,
    longitude: 126.978,
    unknownTime: false,
  },
};

function longBody(seed, title, index) {
  const base = `${seed.targetYear}년 ${title}에서는 세운과 월운, 퀀텀 명리 보정을 함께 보아 실행의 강약을 정합니다. `;
  return Array.from({ length: 42 }, (_, i) => `${base}사주 근거 ${index + 1}-${i + 1}은 올해의 선택 기준과 월별 실천 전략으로 이어집니다.`).join(" ");
}

const seed = newYear.buildPdfSeed(profile, 2026, {
  quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" },
});
const masterJson = newYear.buildNewYearMasterJson(seed, {
  quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" },
});
const masterValidation = newYear.validateNewYearMasterJson(masterJson);
assert.equal(masterValidation.ok, true, `master json validation ${JSON.stringify(masterValidation)}`);
assert.equal(masterJson.schemaVersion, "saju-new-year-master-json.v1");
assert.equal(masterJson.monthlyFlow.length, 12);
assert.equal(masterJson.quantumMyeongri.monthlyQuantum.length, 12);

const specs = newYear.buildSajuNewYearChapterSpecs(2026);
assert.deepEqual(seed.chapters, []);
const expectedChapterTitles = [
  "2026년 총운과 세운의 문",
  "2026년 일과 커리어의 방향",
  "2026년 재물과 소비의 흐름",
  "2026년 인간관계와 귀인운",
  "2026년 연애와 가정운",
  "2026년 건강과 생활 리듬",
  "2026년 분기별 의사결정",
  "2026년 위험 신호와 반전 전략",
  "2026년 12개월 월별 운세",
  "2026년 최종 신년 로드맵",
];
const expectedChapterSections = [
  "핵심 요약 카드",
  "상담형 본문",
  "사주 근거 해석",
  "주의할 점",
  "실천 조언",
  "체크리스트",
  "마무리 문장",
];
assert.deepEqual(specs.map((spec) => spec.title), expectedChapterTitles);
assert.equal(specs.length, 10);
assert.ok(specs.every((spec) => spec.categories.length === expectedChapterSections.length));
assert.ok(specs.every((spec) => JSON.stringify(spec.categories) === JSON.stringify(expectedChapterSections)));
const paymentCheckIndex = handlePrepareSource.indexOf("const premiumAccessToken = clean");
const requireAccessIndex = handlePrepareSource.indexOf("await requirePremiumReportAccess", paymentCheckIndex);
const cacheNormalizeIndex = handlePrepareSource.indexOf("const cacheNormalized = normalizeYearlySajuInput");
const cacheLookupIndex = handlePrepareSource.indexOf("const cachedPdfExecution = await findNewYearReusableExecution");
const startExecutionIndex = handlePrepareSource.indexOf("await startPremiumPdfExecution");
const generatePdfIndex = handlePrepareSource.indexOf("const pipelineResult = generateYearlySajuPdf");
const completeExecutionIndex = handlePrepareSource.indexOf("await completePremiumPdfExecution");
const failExecutionIndex = handlePrepareSource.indexOf("await failPremiumPdfExecution");
assert.ok(paymentCheckIndex > -1, "premium access check exists");
assert.ok(requireAccessIndex > paymentCheckIndex, "premium report access resolver exists after test-mode branch");
assert.ok(cacheNormalizeIndex > paymentCheckIndex, "calculation cache normalization happens after payment access");
assert.ok(cacheLookupIndex > paymentCheckIndex, "calculation-result cache lookup happens after payment access");
assert.ok(startExecutionIndex > cacheLookupIndex, "premium execution starts after cache lookup");
assert.ok(generatePdfIndex > startExecutionIndex, "PDF generation starts after payment execution start");
assert.ok(completeExecutionIndex > generatePdfIndex, "premium execution completes after PDF generation");
assert.ok(failExecutionIndex > completeExecutionIndex, "failure settlement path remains in catch block");
assert.equal(handlePrepareSource.slice(0, paymentCheckIndex).includes("generateYearlySajuPdf("), false, "no PDF generation before payment access");
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.generationMode, "local-assembled");
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.provider, "saju-assembler");
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.templateVersion, "yearly-saju-local-assembled-v4");

const originalFetch = globalThis.fetch;
const forbiddenHosts = [
  "generativelanguage.googleapis.com",
  "vertexai.googleapis.com",
  "api.openai.com",
];
let externalGenerationFetchCount = 0;
const assertiveForbiddenRe = /반드시\s*성공한다|무조건\s*성공한다|100\s*%\s*돈\s*번다|무조건\s*이별한다|사고가\s*난다|송사|관재|의료\s*진단|투자\s*조언/i;
globalThis.fetch = async (input, init) => {
  const url = String(typeof input === "string" ? input : input?.url || "");
  if (forbiddenHosts.some((host) => url.includes(host))) {
    externalGenerationFetchCount += 1;
    throw new Error(`Forbidden external generation request during saju new year local generation: ${url}`);
  }
  if (typeof originalFetch === "function") return originalFetch(input, init);
  throw new Error(`Unexpected fetch during saju new year local generation: ${url}`);
};
try {
  const normalizedLocal = newYear.normalizeYearlySajuInput({
    profile,
    targetYear: 2026,
    body: { quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" } },
  });
  assert.equal(normalizedLocal.normalizedData.service, "yearly-saju");
  assert.equal(normalizedLocal.normalizedData.targetYear, 2026);
  assert.equal(typeof normalizedLocal.normalizedData.profile.birthDate, "string");
  assert.equal(typeof normalizedLocal.normalizedData.natal.pillars.year, "string");
  assert.equal(typeof normalizedLocal.normalizedData.natal.pillars.month, "string");
  assert.equal(typeof normalizedLocal.normalizedData.natal.pillars.day, "string");
  assert.equal(typeof normalizedLocal.normalizedData.natal.dayMaster.stem, "string");
  assert.equal(typeof normalizedLocal.normalizedData.natal.dayMaster.element, "string");
  assert.equal(typeof normalizedLocal.normalizedData.natal.fiveElements.wood, "number");
  assert.ok(Array.isArray(normalizedLocal.normalizedData.natal.fiveElements.strongest));
  assert.ok(Array.isArray(normalizedLocal.normalizedData.natal.tenGods.dominant));
  assert.ok(Array.isArray(normalizedLocal.normalizedData.annual.clashes));
  assert.ok(Array.isArray(normalizedLocal.normalizedData.annual.combinations));
  assert.ok(Array.isArray(normalizedLocal.normalizedData.monthly));
  assert.equal(normalizedLocal.normalizedData.monthly.length, 12);
  assert.ok(Array.isArray(normalizedLocal.monthlyFortuneSections));
  assert.equal(normalizedLocal.monthlyFortuneSections.length, 12);
  for (const monthlySection of normalizedLocal.monthlyFortuneSections) {
    assert.equal(typeof monthlySection.month, "number");
    for (const key of ["title", "summary", "opportunity", "caution", "relationship", "money", "career", "health", "action", "luckyRoutine"]) {
      assert.equal(typeof monthlySection[key], "string", `monthly ${monthlySection.month} ${key}`);
      assert.ok(monthlySection[key].length > 0, `monthly ${monthlySection.month} ${key} empty`);
      assert.equal(/\[object Object\]|\b(?:undefined|null|NaN)\b/i.test(monthlySection[key]), false, `monthly ${monthlySection.month} ${key} forbidden marker`);
      assert.equal(assertiveForbiddenRe.test(monthlySection[key]), false, `monthly ${monthlySection.month} ${key} assertive marker`);
    }
  }
  const partialMonthlySections = newYear.buildMonthlyFortuneSections({
    seed: {
      ...normalizedLocal.seed,
      saju: {
        ...normalizedLocal.seed.saju,
        monthlyLuck: normalizedLocal.seed.saju.monthlyLuck.slice(0, 6),
      },
    },
  });
  assert.equal(partialMonthlySections.length, 12);
  assert.deepEqual(partialMonthlySections.map((item) => item.month), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.ok(Array.isArray(normalizedLocal.normalizedData.yearlyThemes.actionPlan));
  assert.equal(/\[object Object\]|\b(?:undefined|null|NaN)\b/i.test(JSON.stringify(normalizedLocal.normalizedData)), false);
  assert.ok(Object.keys(newYear.ANNUAL_STEM_BLOCKS).length >= 10);
  assert.ok(Object.keys(newYear.ANNUAL_BRANCH_BLOCKS).length >= 12);
  assert.ok(Object.keys(newYear.ANNUAL_TEN_GOD_BLOCKS).length >= 10);
  assert.ok(Object.keys(newYear.YEARLY_CONTEXT_BLOCKS).length >= 10);
  assert.ok(Array.isArray(normalizedLocal.interpretationBlocks.all));
  assert.ok(normalizedLocal.interpretationBlocks.all.length >= 10);
  for (const block of normalizedLocal.interpretationBlocks.all) {
    assert.equal(typeof block.id, "string");
    assert.ok(Array.isArray(block.tags));
    assert.equal(typeof block.weight, "number");
    assert.equal(typeof block.title, "string");
    assert.equal(typeof block.summary, "string");
    assert.ok(Array.isArray(block.body));
    assert.ok(Array.isArray(block.advice));
    assert.ok(Array.isArray(block.caution));
    assert.ok(Array.isArray(block.checklist));
  }
  assert.equal(normalizedLocal.yearlyCalculation.year, 2026);
  assert.equal(newYear.composeMonthlyFortuneTable(normalizedLocal).length, 12);
  const cacheKeyA = newYear.buildYearlySajuPdfCacheKey(normalizedLocal);
  const cacheKeyB = newYear.buildYearlySajuPdfCacheKey(newYear.normalizeYearlySajuInput({
    profile,
    targetYear: 2026,
    body: { quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" } },
  }));
  const cacheKeyNextYear = newYear.buildYearlySajuPdfCacheKey(newYear.normalizeYearlySajuInput({
    profile,
    targetYear: 2027,
    body: { quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" } },
  }));
  assert.match(cacheKeyA, /^yearly-saju-cache:/);
  assert.equal(cacheKeyA, cacheKeyB);
  assert.notEqual(cacheKeyA, cacheKeyNextYear);
  const cacheCtx = newYear.buildYearlySajuPdfCacheExecutionContext({ executionKey: "session-key", idempotencyKey: "session-key", metadata: {} }, cacheKeyA);
  assert.equal(cacheCtx.executionKey, cacheKeyA);
  assert.equal(cacheCtx.idempotencyKey, cacheKeyA);
  assert.equal(cacheCtx.metadata.cacheKind, "yearly-saju-pdf");
  assert.equal(cacheCtx.metadata.templateVersion, "yearly-saju-local-assembled-v4");
  const pipelineResult = newYear.generateYearlySajuPdf(profile, 2026, {
    body: { quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" } },
    metadata: { reportType: "sajuNewYear", sessionId: "smoke-local-pipeline" },
  });
  assert.equal(pipelineResult.validation.ok, true, `pipeline validation ${JSON.stringify(pipelineResult.validation)}`);
  assert.equal(pipelineResult.localAssembly.enabled, true);
  assert.equal(pipelineResult.localAssembly.provider, "saju-assembler");
  assert.equal(pipelineResult.localAssembly.localAssemblyOnly, true);
  assert.equal(pipelineResult.localAssembly.externalCallsAllowed, false);
  assert.equal(pipelineResult.localAssembly.externalGeneration, false);
  assert.equal(pipelineResult.localAssembly.templateVersion, "yearly-saju-local-assembled-v4");
  assert.equal(pipelineResult.localAssembly.chapterCount, specs.length);
  assert.equal(pipelineResult.localAssembly.expectedChapterCount, specs.length);
  assert.equal(pipelineResult.manuscriptSource, "local-assembled");
  assert.equal(pipelineResult.chapters.length, specs.length);
  assert.ok(Array.isArray(pipelineResult.monthlyFortuneSections));
  assert.equal(pipelineResult.monthlyFortuneSections.length, 12);
  assert.equal(pipelineResult.pdfReady.metadata.writingPipeline, "yearly-saju-local-assembled-v4");
  assert.ok(Array.isArray(pipelineResult.pdfReady.metadata.interpretationBlockIds));
  assert.ok(pipelineResult.pdfReady.metadata.interpretationBlockIds.length >= 10);
  assert.equal(pipelineResult.normalizedData.service, "yearly-saju");
  const variantProfile = structuredClone(profile);
  variantProfile.name = "Variant User";
  variantProfile.gender = "M";
  variantProfile.birth = {
    ...variantProfile.birth,
    year: 1988,
    month: 11,
    day: 22,
    hour: 18,
    minute: 30,
  };
  const variantPipelineResult = newYear.generateYearlySajuPdf(variantProfile, 2027, {
    body: { quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" } },
    metadata: { reportType: "sajuNewYear", sessionId: "smoke-local-pipeline-variant" },
  });
  assert.notDeepEqual(pipelineResult.normalizedData.annual, variantPipelineResult.normalizedData.annual, "different local inputs produce distinct annual data");
  assert.notEqual(pipelineResult.chapters[0].text, variantPipelineResult.chapters[0].text, "different local inputs produce distinct chapter text");
  assert.ok(pipelineResult.chapters.some((chapter) => Array.isArray(chapter.interpretationBlockIds) && chapter.interpretationBlockIds.length > 0));
  assert.ok(pipelineResult.chapters.some((chapter) => (chapter.sections || []).some((section) => Array.isArray(section.checklist) && section.checklist.length >= 3)));
  for (const chapter of pipelineResult.chapters) {
    const chapterText = String(chapter.text || "");
    const sectionTitles = Array.isArray(chapter.sections) ? chapter.sections.map((section) => String(section.title || "")) : [];
    assert.equal(typeof chapter.title, "string", `chapter ${chapter.no} title`);
    assert.ok(chapter.title.length > 0, `chapter ${chapter.no} title empty`);
    for (const sectionName of expectedChapterSections) {
      assert.ok(sectionTitles.includes(sectionName), `chapter ${chapter.no} section ${sectionName}`);
    }
    assert.ok(chapterText.length >= 1800, `chapter ${chapter.no} length ${chapterText.length}`);
    assert.ok(chapter.sections.every((section) => Array.isArray(section.actionGuide) && section.actionGuide.length >= 3), `chapter ${chapter.no} action guide count`);
    assert.ok(chapter.sections.every((section) => Array.isArray(section.checklist) && section.checklist.length >= 3), `chapter ${chapter.no} checklist count`);
    assert.ok(chapter.sections.every((section) => Array.isArray(section.sajuEvidence) && section.sajuEvidence.length >= 3), `chapter ${chapter.no} evidence count`);
    assert.equal(assertiveForbiddenRe.test(chapterText), false, `chapter ${chapter.no} assertive marker`);
  }
  assert.ok(pipelineResult.chapters.every((chapter) => chapter.source === "local-assembled"));
  const localPdfReady = pipelineResult.pdfReady;
  assert.equal(/\b(?:undefined|null|NaN)\b|\[object Object\]|준비중|생성 실패|스켈레톤/i.test(String(localPdfReady.html || "")), false);
  assert.equal(assertiveForbiddenRe.test(String(localPdfReady.html || "")), false);
  assert.equal(String(localPdfReady.html || "").includes('"service":"yearly-saju"'), false);
  assert.ok(String(localPdfReady.html || "").includes("<div class=\"brand\">Code Destiny</div>"));
  assert.ok(String(localPdfReady.html || "").includes("<h1>2026년 신년운세</h1>"));
  assert.ok(String(localPdfReady.html || "").includes("사주 구조로 읽는 한 해의 흐름과 실천 로드맵"));
  assert.ok(String(localPdfReady.html || "").includes("핵심 요약 카드"));
  assert.ok(String(localPdfReady.html || "").includes("사주 근거 해석"));
  assert.ok(String(localPdfReady.html || "").includes("12개월 월별 운세"));
  assert.ok(String(localPdfReady.html || "").includes("연간 실행 로드맵"));
  assert.ok(String(localPdfReady.html || "").includes("마지막 조언"));
  const completionValidation = newYear.validateSajuNewYearPdfCompletionPayload({ pdfReady: localPdfReady, chapters: pipelineResult.chapters });
  assert.equal(completionValidation.ok, true, `completion validation ${JSON.stringify(completionValidation)}`);
  assert.equal(externalGenerationFetchCount, 0);
  const reusableCached = newYear.buildNewYearReusableExecutionResponse({
    status: "success",
    premiumStatus: "completed",
    reportId: "cached-report",
    sessionId: "cached-session",
    featureKey: "sajuNewYear",
    metadata: {
      cacheKey: cacheKeyA,
      archive: {
        reportId: "cached-report",
        targetYear: 2026,
        chapterCount: pipelineResult.chapters.length,
        chapters: pipelineResult.chapters,
        normalizedData: pipelineResult.normalizedData,
        monthlyFortuneSections: pipelineResult.monthlyFortuneSections,
        pdfReady: {
          ...localPdfReady,
          pdfUrl: "https://example.test/api/premium/pdf-archive/cached-report?format=pdf",
          downloadUrl: "https://example.test/api/premium/pdf-archive/cached-report?format=pdf",
          htmlUrl: "https://example.test/api/premium/pdf-archive/cached-report?format=html",
        },
      },
    },
  }, { cacheKey: cacheKeyA, targetYear: 2026 });
  assert.equal(reusableCached.status, 200);
  assert.equal(reusableCached.payload.data.cacheHit, true);
  assert.equal(reusableCached.payload.data.cacheKey, cacheKeyA);
  assert.equal(reusableCached.payload.data.fromCache, true);
  assert.equal(reusableCached.payload.data.canReopen, true);
  assert.equal(reusableCached.payload.data.canDownload, true);
  assert.equal(/\b(?:undefined|null|NaN)\b|\[object Object\]/i.test(String(reusableCached.payload.data.pdfReady.html || "")), false);
  const rejectedBadCache = newYear.buildNewYearReusableExecutionResponse({
    status: "success",
    premiumStatus: "completed",
    reportId: "bad-cache-report",
    metadata: {
      archive: {
        pdfReady: { downloadUrl: "https://example.test/bad.pdf", html: "undefined [object Object]" },
      },
    },
  }, {});
  assert.equal(rejectedBadCache, null);
} finally {
  globalThis.fetch = originalFetch;
}

const normalizedGeneratedChapters = specs.map((spec) => newYear.buildDeterministicChapterFromSpec(seed, spec, "smoke-local-assembled"));
const generatedValidation = newYear.validateSajuNewYearPdfQuality({
  chapters: normalizedGeneratedChapters,
  expectedChapters: specs,
  minChapterLength: 4000,
  minSectionLength: 920,
});
assert.equal(generatedValidation.ok, true, `generated quality validation ${JSON.stringify(generatedValidation)}`);

const generatedChapter = normalizedGeneratedChapters[0];
assert.equal(generatedChapter.source, "local-reinforced");
assert.equal(generatedChapter.sections.length, specs[0].categories.length);
assert.ok(generatedChapter.sections[0].body.length >= 920);

const archiveUrls = newYear.buildNewYearArchiveUrls("https://example.test", "new-year-smoke");
assert.ok(archiveUrls.pdfUrl.includes("format=pdf"));
assert.ok(archiveUrls.htmlUrl.includes("format=html"));

const pdfReady = newYear.buildPdfReadyPayload(seed, normalizedGeneratedChapters, {
  manuscriptSource: "local-assembled",
  localDraftChapterCount: 0,
  writingPipeline: "yearly-saju-local-assembled-v4",
});
pdfReady.pdfUrl = archiveUrls.pdfUrl;
pdfReady.downloadUrl = archiveUrls.pdfUrl;
pdfReady.htmlUrl = archiveUrls.htmlUrl;
pdfReady.mimeType = "application/pdf";
pdfReady.contentType = "application/pdf";
assert.ok(String(pdfReady.html || "").includes("신년운세"));
assert.equal(newYear.validateSajuNewYearPdfCompletionPayload({ pdfReady, chapters: newYear.buildSajuNewYearAssembledChapters(seed, normalizedGeneratedChapters), requireDownloadUrl: true }).ok, true);
assert.equal(pdfReady.mimeType, "application/pdf");
assert.ok(pdfReady.downloadUrl.includes("format=pdf"));
assert.ok(pdfReady.htmlUrl.includes("format=html"));

console.log("[smoke-saju-new-year-premium-e2e] ok");
