import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  throw new Error(`[verify-karma-integrated-llm-engine] ${message}`);
};

const requiredFiles = [
  "worker/lib/pdf-v2/soul-origin/karma-chapter-loader.js",
  "worker/lib/pdf-v2/soul-origin/karma-data-orchestrator.js",
  "worker/lib/pdf-v2/soul-origin/karma-prompts.js",
  "worker/lib/pdf-v2/soul-origin/karma-validator.js",
  "worker/lib/pdf-v2/soul-origin/karma-html-renderer.js",
  "worker/lib/pdf-v2/soul-origin/karma-pdf-service.js",
  "worker/lib/pdf-v2/soul-origin/karma-integrated-llm-engine.js",
];

for (const file of requiredFiles) {
  if (!exists(file)) fail(`missing required module: ${file}`);
}

const route = read("worker/routes/soul-origin.js");
const entry = read("worker/lib/pdf-v2/soul-origin/create-soul-origin-premium-pdf-job.js");
const engine = read("worker/lib/pdf-v2/soul-origin/karma-integrated-llm-engine.js");
const frontend = read("js/soul-origin-book.js");
const indexHtml = read("index.html");

for (const marker of [
  "createKarmaIntegratedPdfJob",
  "karma-pdf-service",
]) {
  if (!entry.includes(marker)) fail(`entry point missing marker: ${marker}`);
}

for (const marker of [
  "KARMA_INTEGRATED_LLM_VERSION",
  "buildKarmaIntegratedChapterCacheKey",
  "service: \"karma-integrated\"",
  "chapterConfigVersion",
  "requiredSystemsHash",
  "birthDataHash",
  "sajuChartHash",
  "vedicChartHash",
  "astrologyChartHash",
  "extraFortuneDataHash",
  "questionHash",
]) {
  if (!engine.includes(marker)) fail(`engine missing cache/status marker: ${marker}`);
}

for (const marker of [
  "generationStatus: \"pending\"",
  "generationStatus: \"validating\"",
  "generationStatus: \"calculating\"",
  "generationStatus: \"generating\"",
  "generationStatus: \"failed\"",
  "failedChapterId",
  "onStatus",
  "calculationSeed",
]) {
  if (!route.includes(marker)) fail(`route missing progress marker: ${marker}`);
}

if (!frontend.includes("status === 'validating'") || !frontend.includes("status === 'calculating'") || !frontend.includes("status === 'rendering'")) {
  fail("frontend does not treat new generation statuses as running");
}

if (!/\/js\/soul-origin-book\.js\?v=(?!build-21dbed1102fe|build-88b856aea809)[^'"]+/.test(indexHtml)) {
  fail("index.html missing soul-origin cache-bust key");
}

const { loadExistingKarmaChapterConfig } = await import("../worker/lib/pdf-v2/soul-origin/karma-chapter-loader.js");
const { buildKarmaIntegratedData, selectKarmaDataForChapter } = await import("../worker/lib/pdf-v2/soul-origin/karma-data-orchestrator.js");
const { validateKarmaIntegratedChapterHtml, validateKarmaIntegratedPdfCompletionPayload } = await import("../worker/lib/pdf-v2/soul-origin/karma-validator.js");
const { assembleKarmaIntegratedFinalHtml } = await import("../worker/lib/pdf-v2/soul-origin/karma-html-renderer.js");

const chapterPlan = loadExistingKarmaChapterConfig({ logger: null });
if (chapterPlan.chapters.length !== 12) fail(`expected 12 chapters, got ${chapterPlan.chapters.length}`);
if (chapterPlan.chapters.some((chapter, index) => chapter.order !== index + 1)) fail("chapter order changed");
if (!chapterPlan.chapters.some((chapter) => chapter.requiredSystems.includes("vedic"))) fail("no chapter references vedic");
if (!chapterPlan.chapters.some((chapter) => chapter.requiredSystems.includes("astrology"))) fail("no chapter references astrology");
if (chapterPlan.chapters.every((chapter) => chapter.requiredSystems.length === 1 && chapter.requiredSystems[0] === "saju")) {
  fail("chapter systems collapsed to saju-only");
}

const integratedData = buildKarmaIntegratedData({
  input: {
    person: {
      displayName: "검증 사용자",
      birthSummary: {
        birthDate: "1990-01-01",
        birthTime: "09:30",
        birthPlace: "Seoul",
        calendarType: "solar",
      },
    },
    calculationDigest: "digest-test",
  },
  calculationSeed: {
    birthInput: {
      name: "검증 사용자",
      birthDate: "1990-01-01",
      birthTime: "09:30",
      birthPlace: "Seoul",
      timezone: "Asia/Seoul",
      latitude: 37.56,
      longitude: 126.97,
    },
    saju: {
      yearPillar: "경오",
      monthPillar: "무인",
      dayPillar: "갑자",
      hourPillar: "기사",
      tenGodCounts: { 정재: 2, 편인: 1 },
      elementWeights: { wood: 35, fire: 20, earth: 18, metal: 12, water: 15 },
      currentDaewun: "병술",
      currentYearPillar: "병오",
    },
    vedic: {
      lagna: "Aries",
      moonNakshatra: "Revati",
      dasha: { current: "Venus", next: "Sun" },
      rahu: "Pisces",
      ketu: "Virgo",
      planets: [{ name: "Moon", sign: "Pisces" }],
      houses: [{ house: 1, sign: "Aries" }],
    },
    astrology: {
      sun: "Capricorn",
      moon: "Pisces",
      ascendant: "Aries",
      planets: [{ name: "Sun", sign: "Capricorn", house: 10 }],
      houses: [{ house: 10, sign: "Capricorn" }],
      aspects: [{ planetA: "Sun", planetB: "Moon", type: "sextile" }],
    },
    sukyo: { natalStar: "각수", element: "목", nature: "성장" },
    ziwei: { chartMeta: { mingGong: "인", shenGong: "오" } },
    signals: { relation: "합충 신호" },
  },
});

for (const system of ["saju", "vedic", "astrology"]) {
  if (!integratedData.systemStatus[system]) fail(`integrated data missing ${system}`);
}

const mixedChapter = chapterPlan.chapters.find((chapter) => chapter.requiredSystems.includes("vedic") && chapter.requiredSystems.includes("astrology"));
const selected = selectKarmaDataForChapter(mixedChapter, integratedData);
if (!selected.vedic || !selected.astrology) fail("chapter data selection missed vedic or astrology");

const validChapterHtml = `<section class="karma-integrated-chapter" data-chapter-id="${mixedChapter.id}">
  <h2>${mixedChapter.title}</h2>
  <div class="chapter-meta"><p>참조 로직: 사주 명리학 · 베다 점성술 · 서양 점성술</p></div>
  <div class="chapter-summary"><p>사주 원국의 갑자 일주와 베다 라그나, 서양 점성술의 태양과 달, 숙요점 본명숙 흐름이 같은 반복 주제를 비춥니다. 관계와 선택의 습관은 단정된 운명이 아니라 조정할 수 있는 리듬으로 드러납니다. 이 장에서는 계산된 신호만 바탕으로 회복 방향을 정리합니다.</p></div>
  <div class="chapter-body">
    <p>사주 명리학에서는 갑자 일주와 현재 대운의 압력이 선택을 늦추는 패턴으로 드러납니다.</p>
    <p>베다 점성술에서는 Aries 라그나와 Revati 나크샤트라, Venus 다샤가 관계 안에서 오래 머문 감정을 비춥니다.</p>
    <p>서양 점성술에서는 Capricorn 태양과 Pisces 달, Aries 상승궁이 책임과 감수성 사이의 긴장을 보여 줍니다.</p>
    <p>숙요점에서는 각수의 성장 결이 오래된 인연 패턴을 다시 살피게 하며, 관계의 속도를 조절하라고 가리킵니다.</p>
    <p>이 반복은 업보의 벌이 아니라 익숙한 생존 방식이 삶의 중요한 장면에서 다시 떠오르는 결입니다.</p>
    <p>회복은 급한 결론을 늦추고, 관계와 일에서 같은 반응이 되풀이되는 순간을 기록하는 데서 열립니다.</p>
  </div>
  <div class="chapter-advice">
    <h3>업을 푸는 실천 처방</h3>
    <ul>
      <li>중요한 답변은 하루 뒤 다시 확인합니다.</li>
      <li>반복되는 감정 반응을 같은 문장으로 기록합니다.</li>
      <li>관계와 일의 책임 범위를 먼저 정합니다.</li>
    </ul>
  </div>
</section>`;

const chapterValidation = validateKarmaIntegratedChapterHtml(validChapterHtml, mixedChapter, selected);
if (!chapterValidation.ok) fail(`valid chapter html failed: ${chapterValidation.errors.join(",")}`);

const invalidValidation = validateKarmaIntegratedChapterHtml('{"chapter":"placeholder"}', mixedChapter, selected);
if (invalidValidation.ok) fail("json placeholder chapter passed validation");

const chapterRecords = chapterPlan.chapters.map((chapter) => ({
  id: chapter.id,
  order: chapter.order,
  title: chapter.title,
  category: chapter.category,
  requiredSystems: chapter.requiredSystems,
  html: validChapterHtml.replace(`data-chapter-id="${mixedChapter.id}"`, `data-chapter-id="${chapter.id}"`).replace(`<h2>${mixedChapter.title}</h2>`, `<h2>${chapter.title}</h2>`),
}));

const finalHtml = assembleKarmaIntegratedFinalHtml({
  integratedData,
  chapterPlan,
  chapterRecords,
  reportId: "karma-integrated-contract",
  generatedAt: "2026-06-26T00:00:00.000Z",
});
const completionValidation = validateKarmaIntegratedPdfCompletionPayload({
  pdfReady: {
    html: finalHtml,
    renderFormat: "pdf-archive",
    mimeType: "application/pdf",
    contentType: "application/pdf",
    llmAssemblyOnly: true,
    llmAssembly: { externalGeneration: true, fallbackUsed: false },
    pdfUrl: "/api/premium/pdf-archive/karma-integrated-contract?format=pdf",
    downloadUrl: "/api/premium/pdf-archive/karma-integrated-contract?format=pdf",
  },
  chapterPlan,
  chapters: chapterRecords,
  requireDownloadUrl: true,
});
if (!completionValidation.ok) fail(`final pdf payload failed: ${completionValidation.issues.join(",")}`);

console.log("[verify-karma-integrated-llm-engine] ok");
