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
  "프롤로그 — 올해 내 운의 전체 분위기",
  "올해의 핵심 키워드 — 세운이 나에게 주는 메시지",
  "대운과 세운의 만남 — 큰 흐름 속 올해의 위치",
  "일과 커리어 — 성취, 역할, 방향 전환의 운",
  "재물과 소비 — 돈이 들어오고 나가는 구조",
  "연애와 인간관계 — 가까워질 사람과 멀어질 사람",
  "건강과 생활 리듬 — 무리하기 쉬운 지점과 회복법",
  "위험 신호와 기회 신호 — 조심할 시기와 잡아야 할 시기",
  "12개월 월별 운세 — 매달의 흐름과 실천 조언",
  "올해의 마스터플랜 — 1년을 잘 쓰는 실행 전략",
];
const expectedChapterSections = [
  "핵심 요약 카드",
  "상담형 본문",
  "계산 근거 기반 해석",
  "주의할 점",
  "실천 조언",
  "체크리스트",
  "챕터 마무리 문장",
];
assert.deepEqual(specs.map((spec) => spec.title), expectedChapterTitles);
assert.equal(specs.length, 10);
assert.ok(specs.every((spec) => spec.categories.length === expectedChapterSections.length));
assert.ok(specs.every((spec) => JSON.stringify(spec.categories) === JSON.stringify(expectedChapterSections)));
const paymentCheckIndex = handlePrepareSource.indexOf("const access = await requirePremiumReportAccess");
const cacheNormalizeIndex = handlePrepareSource.indexOf("const cacheNormalized = normalizeYearlySajuInput");
const cacheLookupIndex = handlePrepareSource.indexOf("const cachedPdfExecution = await findNewYearReusableExecution");
const startExecutionIndex = handlePrepareSource.indexOf("await startPremiumPdfExecution");
const generatePdfIndex = handlePrepareSource.indexOf("const pipelineResult = generateYearlySajuPdf");
const completeExecutionIndex = handlePrepareSource.indexOf("await completePremiumPdfExecution");
const failExecutionIndex = handlePrepareSource.indexOf("await failPremiumPdfExecution");
assert.ok(paymentCheckIndex > -1, "premium access check exists");
assert.ok(cacheNormalizeIndex > paymentCheckIndex, "calculation cache normalization happens after payment access");
assert.ok(cacheLookupIndex > paymentCheckIndex, "calculation-result cache lookup happens after payment access");
assert.ok(startExecutionIndex > cacheLookupIndex, "premium execution starts after cache lookup");
assert.ok(generatePdfIndex > startExecutionIndex, "PDF generation starts after payment execution start");
assert.ok(completeExecutionIndex > generatePdfIndex, "premium execution completes after PDF generation");
assert.ok(failExecutionIndex > completeExecutionIndex, "failure settlement path remains in catch block");
assert.equal(handlePrepareSource.slice(0, paymentCheckIndex).includes("generateYearlySajuPdf("), false, "no PDF generation before payment access");
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.generationMode, "local");
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.llmEnabled, false);
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.provider, "none");
assert.equal(newYear.YEARLY_SAJU_PDF_CONFIG.templateVersion, "yearly-saju-local-v2");
const localModeEnv = {
  YEARLY_SAJU_PDF_GENERATION_MODE: "local",
  YEARLY_SAJU_PDF_LLM_ENABLED: "false",
  YEARLY_SAJU_LLM_PROVIDER: "none",
  GEMINI_API_KEY: "present-in-env",
  PREMIUM_GEMINI_API_KEY1: "present-in-env",
  PREMIUM_SAJU_NEW_YEAR_GEMINI_API_KEY1: "present-in-env",
  OPENAI_API_KEY: "present-in-env",
  VERTEX_AI_API_KEY: "present-in-env",
  ANNUAL_FORTUNE_LLM_ENHANCEMENT_ENABLED: "true",
};
assert.equal(newYear.annualFortuneLlmEnabled({
  GEMINI_API_KEY: "present-in-env",
  PREMIUM_GEMINI_API_KEY1: "present-in-env",
  ANNUAL_FORTUNE_LLM_ENHANCEMENT_ENABLED: "true",
}), false);
assert.equal(newYear.annualFortuneLlmEnabled(localModeEnv), false);

const originalFetch = globalThis.fetch;
const forbiddenHosts = [
  "generativelanguage.googleapis.com",
  "vertexai.googleapis.com",
  "api.openai.com",
];
let externalLlmFetchCount = 0;
const assertiveForbiddenRe = /반드시\s*성공한다|무조건\s*성공한다|100\s*%\s*돈\s*번다|무조건\s*이별한다|사고가\s*난다|송사|관재|의료\s*진단|투자\s*조언/i;
globalThis.fetch = async (input, init) => {
  const url = String(typeof input === "string" ? input : input?.url || "");
  if (forbiddenHosts.some((host) => url.includes(host))) {
    externalLlmFetchCount += 1;
    throw new Error(`Forbidden LLM request during saju new year local generation: ${url}`);
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
  assert.equal(cacheCtx.metadata.templateVersion, "yearly-saju-local-v2");
  const pipelineResult = newYear.generateYearlySajuPdf(profile, 2026, {
    body: { quantumMyeongriJson: { schemaVersion: "smoke-client-evidence.v1" } },
    metadata: { reportType: "sajuNewYear", sessionId: "smoke-local-pipeline" },
  });
  assert.equal(pipelineResult.validation.ok, true, `pipeline validation ${JSON.stringify(pipelineResult.validation)}`);
  assert.equal(pipelineResult.hybridStats.llmEnabled, false);
  assert.equal(pipelineResult.hybridStats.llmAttempted, 0);
  assert.equal(pipelineResult.hybridStats.llmSucceeded, 0);
  assert.equal(pipelineResult.hybridStats.provider, "none");
  assert.equal(pipelineResult.chapters.length, specs.length);
  assert.ok(Array.isArray(pipelineResult.monthlyFortuneSections));
  assert.equal(pipelineResult.monthlyFortuneSections.length, 12);
  assert.equal(pipelineResult.pdfReady.metadata.writingPipeline, "yearly-saju-local-v2");
  assert.ok(Array.isArray(pipelineResult.pdfReady.metadata.interpretationBlockIds));
  assert.ok(pipelineResult.pdfReady.metadata.interpretationBlockIds.length >= 10);
  assert.equal(pipelineResult.normalizedData.service, "yearly-saju");
  assert.ok(pipelineResult.chapters.some((chapter) => Array.isArray(chapter.interpretationBlockIds) && chapter.interpretationBlockIds.length > 0));
  assert.ok(pipelineResult.chapters.some((chapter) => String(chapter.text || "").includes("실천 체크")));
  for (const chapter of pipelineResult.chapters) {
    const chapterText = String(chapter.text || "");
    const sectionTitles = Array.isArray(chapter.sections) ? chapter.sections.map((section) => String(section.title || "")) : [];
    assert.equal(typeof chapter.title, "string", `chapter ${chapter.no} title`);
    assert.ok(chapter.title.length > 0, `chapter ${chapter.no} title empty`);
    assert.ok(sectionTitles.some((title) => title.includes("핵심 요약")), `chapter ${chapter.no} summary section`);
    assert.ok(sectionTitles.some((title) => title.includes("상담형 본문")), `chapter ${chapter.no} body section`);
    assert.ok(sectionTitles.some((title) => title.includes("실천 조언")), `chapter ${chapter.no} advice section`);
    assert.ok(sectionTitles.some((title) => title.includes("체크리스트")), `chapter ${chapter.no} checklist section`);
    assert.ok(chapterText.length >= 1800, `chapter ${chapter.no} length ${chapterText.length}`);
    assert.ok((chapterText.match(/핵심 요약\s*\d\./g) || []).length >= 3, `chapter ${chapter.no} summary count`);
    assert.ok((chapterText.match(/실천 조언\s*\d\./g) || []).length >= 3, `chapter ${chapter.no} advice count`);
    assert.ok((chapterText.match(/체크리스트\s*\d\./g) || []).length >= 3, `chapter ${chapter.no} checklist count`);
    assert.equal(assertiveForbiddenRe.test(chapterText), false, `chapter ${chapter.no} assertive marker`);
  }
  assert.ok(pipelineResult.chapters.every((chapter) => chapter.source === "local-rule-completed"));
  await assert.rejects(
    () => newYear.generateNewYearChapterWithGemini({
      GEMINI_API_KEY: "present-in-env",
      PREMIUM_GEMINI_API_KEY1: "present-in-env",
      ANNUAL_FORTUNE_LLM_ENHANCEMENT_ENABLED: "true",
    }, {
      masterJson,
      seed,
      chapterSpec: specs[0],
      chapterPlan: seed.annualFortuneChapterPlans[0],
      requestId: "smoke-disabled-llm",
    }),
    /SAJU_NEW_YEAR_LLM_DISABLED/,
  );
  const localPdfReady = pipelineResult.pdfReady;
  assert.equal(/\b(?:undefined|null|NaN)\b|\[object Object\]|준비중|생성 실패|스켈레톤/i.test(String(localPdfReady.html || "")), false);
  assert.equal(assertiveForbiddenRe.test(String(localPdfReady.html || "")), false);
  assert.equal(String(localPdfReady.html || "").includes('"service":"yearly-saju"'), false);
  assert.ok((String(localPdfReady.html || "").match(/class="metric-card"/g) || []).length >= 10);
  assert.ok(String(localPdfReady.html || "").includes('class="monthly"'));
  assert.ok((String(localPdfReady.html || "").match(/class="monthly-fortune-card"/g) || []).length >= 12);
  assert.ok(String(localPdfReady.html || "").includes("12개월 월별 운세 카드"));
  assert.ok(String(localPdfReady.html || "").includes("<span class=\"badge\">Code</span>"));
  assert.ok(String(localPdfReady.html || "").includes("<h1>사주 신년운세</h1>"));
  assert.ok(String(localPdfReady.html || "").includes("나의 사주 구조로 읽는 1년의 흐름"));
  assert.ok(String(localPdfReady.html || "").includes("대상 연도"));
  assert.ok(String(localPdfReady.html || "").includes("생성일"));
  assert.ok(String(localPdfReady.html || "").includes("원국 요약표"));
  assert.ok(String(localPdfReady.html || "").includes("세운 요약표"));
  assert.ok(String(localPdfReady.html || "").includes("대운·세운 관계표"));
  assert.ok((String(localPdfReady.html || "").match(/class="chapter-cover page-break"/g) || []).length >= 10);
  assert.ok(String(localPdfReady.html || "").includes("마지막 정리"));
  assert.ok(String(localPdfReady.html || "").includes("12개월 실행 루틴"));
  assert.ok(String(localPdfReady.html || "").includes("재열람 안내"));
  assert.ok(String(localPdfReady.html || "").includes("핵심 키워드:"));
  assert.ok(String(localPdfReady.html || "").includes("이번 달 실천:"));
  assert.ok(String(localPdfReady.html || "").includes("일/커리어:"));
  assert.ok(String(localPdfReady.html || "").includes("돈/소비:"));
  assert.ok(String(localPdfReady.html || "").includes("건강/리듬:"));
  assert.ok(String(localPdfReady.html || "").includes("기회 시기 TOP 3"));
  assert.ok(String(localPdfReady.html || "").includes("주의 시기 TOP 3"));
  assert.ok(String(localPdfReady.html || "").includes('class="masterplan-table"'));
  assert.equal(externalLlmFetchCount, 0);
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

const llmChapters = specs.map((spec) => newYear.normalizeNewYearGeneratedChapter({
  sections: spec.categories.map((title, index) => ({
    title,
    body: longBody(seed, title, index),
    sajuEvidence: ["세운 십성", "월운 점수", "퀀텀 판정"],
    actionGuide: ["실행 달에 제안하기", "주의 달에는 큰 결정을 늦추기"],
    monthlyStrategy: ["1분기 정비", "2분기 확장", "3분기 조율", "4분기 정리"],
    caution: ["결과를 단정하지 않기"],
  })),
  masterAdvice: "운을 기다리기보다 흐름에 맞게 움직이는 해입니다.",
}, spec, seed));
const llmValidation = newYear.validateSajuNewYearPdfQuality({
  chapters: llmChapters,
  expectedChapters: specs,
  minChapterLength: 4000,
  minSectionLength: 920,
});
assert.equal(llmValidation.ok, true, `llm quality validation ${JSON.stringify(llmValidation)}`);

const llmChapter = llmChapters[0];
assert.equal(llmChapter.source, "worker-native-llm");
assert.equal(llmChapter.categories.length, specs[0].categories.length);
assert.ok(llmChapter.categories[0].finalText.length >= 920);

const archiveUrls = newYear.buildNewYearArchiveUrls("https://example.test", "new-year-smoke");
assert.ok(archiveUrls.pdfUrl.includes("format=pdf"));
assert.ok(archiveUrls.htmlUrl.includes("format=html"));

const pdfReady = newYear.buildPdfReadyPayload(seed, llmChapters, {
  manuscriptSource: "worker-native-llm",
  localDraftChapterCount: 0,
  writingPipeline: "local-calculation-json-llm-writing-only",
});
pdfReady.pdfUrl = archiveUrls.pdfUrl;
pdfReady.downloadUrl = archiveUrls.pdfUrl;
pdfReady.htmlUrl = archiveUrls.htmlUrl;
pdfReady.mimeType = "application/pdf";
pdfReady.contentType = "application/pdf";
assert.ok(String(pdfReady.html || "").includes("사주 신년운세"));
assert.equal(pdfReady.mimeType, "application/pdf");
assert.ok(pdfReady.downloadUrl.includes("format=pdf"));
assert.ok(pdfReady.htmlUrl.includes("format=html"));

console.log("[smoke-saju-new-year-premium-e2e] ok");
