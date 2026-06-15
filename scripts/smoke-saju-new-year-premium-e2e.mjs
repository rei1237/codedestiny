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
  "제 1장. 2026년 총운과 세운의 문",
  "제 2장. 2026년 커리어와 일의 방향",
  "제 3장. 2026년 재물운과 돈의 흐름",
  "제 4장. 2026년 인간관계와 귀인운",
  "제 5장. 2026년 연애·결혼·가족운",
  "제 6장. 2026년 건강과 심리 리듬",
  "제 7장. 2026년 분기별 의사결정",
  "제 8장. 2026년 위험 관리와 반전 전략",
  "제 9장. 2026년 12개월 실행/정비 월별 지도",
  "제 10장. 2026년 최종 신년 로드맵",
];
const expectedChapterSections = [
  [
    "세운 간지와 올해의 첫 신호",
    "원국과 세운의 조화·충돌",
    "오행 강약과 용신·희신 방향",
    "가장 크게 바뀌는 삶의 영역",
    "올해를 지키는 핵심 기준",
  ],
  [
    "올해 일의 기본 흐름",
    "직장·조직·평가운",
    "이직·전환·확장 가능성",
    "성과가 열리는 방식",
    "피해야 할 업무 패턴",
  ],
  [
    "돈이 들어오는 방식",
    "고정수익과 확장수익",
    "큰 지출과 손실 주의",
    "계약·투자·가격 결정",
    "재물운을 살리는 습관",
  ],
  [
    "올해 가까워지는 사람",
    "귀인이 들어오는 통로",
    "협업과 파트너십",
    "멀어질 관계와 갈등 신호",
    "관계를 넓히는 전략",
  ],
  [
    "연애운의 전체 흐름",
    "새로운 인연과 기존 관계",
    "결혼·약속·장기 관계",
    "가족과 가까운 사람의 책임",
    "감정 기복과 거리 조절",
  ],
  [
    "오행으로 보는 몸의 신호",
    "피로와 스트레스 누적 구간",
    "마음이 흔들리는 이유",
    "회복력을 높이는 생활 리듬",
    "건강·멘탈 관리 원칙",
  ],
  [
    "1분기 선택과 정리",
    "2분기 확장과 검증",
    "3분기 조율과 회수",
    "4분기 마무리와 재설계",
    "가장 중요한 결정 타이밍",
  ],
  [
    "가장 흔들리기 쉬운 문제",
    "합충형파해와 사건 신호",
    "반복하면 안 되는 실수",
    "위기가 기회로 바뀌는 조건",
    "위험을 낮추는 회복 플랜",
  ],
  [
    "상반기 월별 흐름",
    "하반기 월별 흐름",
    "주의해야 할 달",
    "기회를 잡기 좋은 달",
    "월별 실행·정비 흐름 실행표",
  ],
  [
    "올해의 최종 메시지",
    "먼저 정리해야 할 것",
    "반드시 밀어붙일 것",
    "내려놓아야 할 것",
    "1년 실행 루틴",
  ],
];
assert.deepEqual(specs.map((spec) => spec.title), expectedChapterTitles);
assert.equal(specs.length, 10);
assert.deepEqual(specs.map((spec) => spec.categories), expectedChapterSections);
const paymentCheckIndex = handlePrepareSource.indexOf("const premiumAccessToken = clean");
const requireAccessIndex = handlePrepareSource.indexOf("await requirePremiumReportAccess", paymentCheckIndex);
const cacheLookupIndex = handlePrepareSource.indexOf("const cachedPdfExecution = await findNewYearReusableExecution");
const startExecutionIndex = handlePrepareSource.indexOf("await startPremiumPdfExecution");
const generatePdfIndex = handlePrepareSource.indexOf("const pipelineResult = generateYearlySajuPdf");
const completeExecutionIndex = handlePrepareSource.indexOf("await completePremiumPdfExecution");
const failExecutionIndex = handlePrepareSource.indexOf("await failPremiumPdfExecution");
assert.ok(paymentCheckIndex > -1, "premium access check exists");
assert.ok(requireAccessIndex > paymentCheckIndex, "premium report access resolver exists after test-mode branch");
assert.ok(handlePrepareSource.includes("normalizeYearlySajuInput"), "calculation cache normalization exists");
assert.ok(cacheLookupIndex > paymentCheckIndex, "calculation-result cache lookup happens after payment access");
assert.ok(startExecutionIndex > cacheLookupIndex, "premium execution starts after cache lookup");
assert.ok(generatePdfIndex > startExecutionIndex, "PDF generation starts after payment execution start");
assert.ok(completeExecutionIndex > generatePdfIndex, "premium execution completes after PDF generation");
assert.ok(failExecutionIndex > completeExecutionIndex, "failure settlement path remains in catch block");
assert.equal(handlePrepareSource.slice(0, paymentCheckIndex).includes("generateYearlySajuPdf("), false, "no PDF generation before payment access");
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.generationMode, "high-quality-assembled");
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.provider, "saju-high-quality-consultation-engine");
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.templateVersion, "yearly-saju-high-quality-v5");

const originalFetch = globalThis.fetch;
const forbiddenHosts = [
  "generativelanguage.googleapis.com",
  "vertexai.googleapis.com",
  "api.openai.com",
];
let externalGenerationFetchCount = 0;
let pipelineResultForArchive = null;
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
  assert.equal(cacheCtx.metadata.templateVersion, "yearly-saju-high-quality-v5");
  const pipelineResult = newYear.generateYearlySajuPdf(profile, 2026, {
    body: { quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" } },
    metadata: { reportType: "sajuNewYear", sessionId: "smoke-local-pipeline" },
  });
  pipelineResultForArchive = pipelineResult;
  assert.equal(pipelineResult.validation.ok, true, `pipeline validation ${JSON.stringify(pipelineResult.validation)}`);
  assert.equal(pipelineResult.localAssembly.enabled, true);
  assert.equal(pipelineResult.localAssembly.provider, "saju-high-quality-consultation-engine");
  assert.equal(pipelineResult.localAssembly.localAssemblyOnly, false);
  assert.equal(pipelineResult.localAssembly.externalCallsAllowed, false);
  assert.equal(pipelineResult.localAssembly.externalGeneration, false);
  assert.equal(pipelineResult.localAssembly.templateVersion, "yearly-saju-high-quality-v5");
  assert.equal(pipelineResult.localAssembly.chapterCount, specs.length);
  assert.equal(pipelineResult.localAssembly.expectedChapterCount, specs.length);
  assert.equal(pipelineResult.manuscriptSource, "high-quality-consultation");
  assert.equal(pipelineResult.chapters.length, specs.length);
  assert.ok(Array.isArray(pipelineResult.monthlyFortuneSections));
  assert.equal(pipelineResult.monthlyFortuneSections.length, 12);
  assert.equal(pipelineResult.pdfReady.metadata.writingPipeline, "yearly-saju-high-quality-v5");
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
  for (const chapter of pipelineResult.chapters) {
    const chapterText = String(chapter.text || "");
    const sectionTitles = Array.isArray(chapter.sections) ? chapter.sections.map((section) => String(section.title || "")) : [];
    assert.equal(typeof chapter.title, "string", `chapter ${chapter.no} title`);
    assert.ok(chapter.title.length > 0, `chapter ${chapter.no} title empty`);
    for (const sectionName of expectedChapterSections[Number(chapter.no || 1) - 1] || []) {
      assert.ok(sectionTitles.includes(sectionName), `chapter ${chapter.no} section ${sectionName}`);
    }
    assert.ok(chapterText.length >= 1800, `chapter ${chapter.no} length ${chapterText.length}`);
    assert.ok(chapter.sections.every((section) => String(section.body || "").length >= 1800), `chapter ${chapter.no} section body length`);
    assert.equal(assertiveForbiddenRe.test(chapterText), false, `chapter ${chapter.no} assertive marker`);
  }
  assert.ok(pipelineResult.chapters.every((chapter) => chapter.source === "high-quality-consultation"));
  const localPdfReady = pipelineResult.pdfReady;
  assert.equal(/\b(?:undefined|null|NaN)\b|\[object Object\]|준비중|생성 실패|스켈레톤/i.test(String(localPdfReady.html || "")), false);
  assert.equal(assertiveForbiddenRe.test(String(localPdfReady.html || "")), false);
  assert.equal(String(localPdfReady.html || "").includes('"service":"yearly-saju"'), false);
  assert.ok(String(localPdfReady.html || "").includes("<div class=\"brand\">Code Destiny</div>"));
  assert.ok(String(localPdfReady.html || "").includes("<h1>2026년 신년운세</h1>"));
  assert.ok(String(localPdfReady.html || "").includes("사주 구조로 읽는 한 해의 흐름과 실천 로드맵"));
  assert.ok(String(localPdfReady.html || "").includes("세운 간지와 올해의 첫 신호"));
  assert.ok(String(localPdfReady.html || "").includes("원국과 세운의 조화·충돌"));
  assert.ok(String(localPdfReady.html || "").includes("12개월 실행/정비 월별 지도"));
  assert.ok(String(localPdfReady.html || "").includes("최종 신년 로드맵"));
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
const generatedChapter = normalizedGeneratedChapters[0];
assert.equal(generatedChapter.source, "local-reinforced");
assert.equal(generatedChapter.sections.length, specs[0].categories.length);
assert.ok(generatedChapter.sections[0].body.length >= 920);

const archiveUrls = newYear.buildNewYearArchiveUrls("https://example.test", "new-year-smoke");
assert.ok(archiveUrls.pdfUrl.includes("format=pdf"));
assert.ok(archiveUrls.htmlUrl.includes("format=html"));

const archiveChapters = pipelineResultForArchive?.chapters || [];
const pdfReady = newYear.buildPdfReadyPayload(seed, archiveChapters, {
  manuscriptSource: "high-quality-consultation",
  localDraftChapterCount: archiveChapters.length,
  writingPipeline: "yearly-saju-high-quality-v5",
});
pdfReady.pdfUrl = archiveUrls.pdfUrl;
pdfReady.downloadUrl = archiveUrls.pdfUrl;
pdfReady.htmlUrl = archiveUrls.htmlUrl;
pdfReady.mimeType = "application/pdf";
pdfReady.contentType = "application/pdf";
assert.ok(String(pdfReady.html || "").includes("신년운세"));
assert.equal(newYear.validateSajuNewYearPdfCompletionPayload({ pdfReady, chapters: archiveChapters, requireDownloadUrl: true }).ok, true);
assert.equal(pdfReady.mimeType, "application/pdf");
assert.ok(pdfReady.downloadUrl.includes("format=pdf"));
assert.ok(pdfReady.htmlUrl.includes("format=html"));

console.log("[smoke-saju-new-year-premium-e2e] ok");
