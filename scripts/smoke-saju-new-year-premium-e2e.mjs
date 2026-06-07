import assert from "node:assert/strict";
import { __sajuNewYearTestUtils as newYear } from "../worker/routes/saju-new-year.js";

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
const localChapters = newYear.repairSajuNewYearChapters({
  seed,
  chapters: newYear.buildLocalSkeleton(seed),
  expectedChapters: specs,
  errors: ["smoke"],
});
const localValidation = newYear.validateSajuNewYearPdfQuality({
  chapters: localChapters,
  expectedChapters: specs,
  minChapterLength: 4000,
  minSectionLength: 920,
});
assert.equal(localValidation.ok, true, `local quality validation ${JSON.stringify(localValidation)}`);

const llmChapter = newYear.normalizeNewYearGeneratedChapter({
  sections: specs[0].categories.map((title, index) => ({
    title,
    body: longBody(seed, title, index),
    sajuEvidence: ["세운 십성", "월운 점수", "퀀텀 판정"],
    actionGuide: ["실행 달에 제안하기", "주의 달에는 큰 결정을 늦추기"],
    monthlyStrategy: ["1분기 정비", "2분기 확장", "3분기 조율", "4분기 정리"],
    caution: ["결과를 단정하지 않기"],
  })),
  masterAdvice: "운을 기다리기보다 흐름에 맞게 움직이는 해입니다.",
}, specs[0], seed);
assert.equal(llmChapter.source, "worker-native-llm");
assert.equal(llmChapter.categories.length, specs[0].categories.length);
assert.ok(llmChapter.categories[0].finalText.length >= 920);

const archiveUrls = newYear.buildNewYearArchiveUrls("https://example.test", "new-year-smoke");
assert.ok(archiveUrls.pdfUrl.includes("format=pdf"));
assert.ok(archiveUrls.htmlUrl.includes("format=html"));

const pdfReady = newYear.buildPdfReadyPayload(seed, localChapters, {
  manuscriptSource: "worker-native-llm",
});
pdfReady.pdfUrl = archiveUrls.pdfUrl;
pdfReady.downloadUrl = archiveUrls.pdfUrl;
pdfReady.htmlUrl = archiveUrls.htmlUrl;
pdfReady.mimeType = "application/pdf";
pdfReady.contentType = "application/pdf";
assert.ok(String(pdfReady.html || "").includes("신년운세 프리미엄 리포트"));
assert.equal(pdfReady.mimeType, "application/pdf");
assert.ok(pdfReady.downloadUrl.includes("format=pdf"));
assert.ok(pdfReady.htmlUrl.includes("format=html"));

console.log("[smoke-saju-new-year-premium-e2e] ok");
