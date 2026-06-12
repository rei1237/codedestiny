#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  VEDIC_ASTROLOGY_ASSEMBLY_VERSION,
  VEDIC_PDF_CONFIG,
  buildVedicAstrologyFacts,
  buildVedicLocalChartJson,
  buildVedicMasterJson,
  generateVedicPremiumReport,
  validateVedicPdfCompletionPayload,
  validateVedicMasterJson,
} from "../worker/lib/vedic-premium-generator.js";

function buildBirthInput() {
  return {
    name: "Vedic Premium QA",
    gender: "female",
    birthDate: "1991-02-20",
    birthYear: 1991,
    birthMonth: 2,
    birthDay: 20,
    birthTime: "07:00",
    birthHour: 7,
    birthMinute: 0,
    timezone: "Asia/Seoul",
    birthPlace: "Seoul",
    latitude: 37.5665,
    longitude: 126.978,
    isTimeUnknown: false,
  };
}

function buildVedicChartSource() {
  return {
    source: "smoke-vedic-chart",
    ayanamsaName: "Lahiri",
    ayanamsa: 24.18,
    ascendantSidereal: 352.4,
    planets: {
      Sun: 306.4,
      Moon: 41.7,
      Mercury: 289.2,
      Venus: 272.8,
      Mars: 58.9,
      Jupiter: 130.6,
      Saturn: 276.3,
      Rahu: 285.1,
      Ketu: 105.1,
    },
    retrograde: {
      Mercury: false,
      Venus: false,
      Mars: false,
      Jupiter: true,
      Saturn: false,
      Rahu: true,
      Ketu: true,
    },
  };
}

function withArchiveFormat(url, format) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/[?&]format=/i.test(value)) return value.replace(/([?&]format=)[^&]+/i, `$1${encodeURIComponent(format)}`);
  return `${value}${value.includes("?") ? "&" : "?"}format=${encodeURIComponent(format)}`;
}

const birthInput = buildBirthInput();
const chart = buildVedicChartSource();
const rawInput = {
  ...birthInput,
  sessionId: "smoke-vedic-premium",
  reportId: "smoke_vedic_premium_report",
  birthInput,
  vedicBase: {
    birthInput,
    chart,
  },
  chart,
  vedicClientEvidenceJson: {
    schemaVersion: "vedic-premium-client-evidence.v1",
    source: "smoke",
    chartAvailable: true,
    evidenceCount: 14,
    hasBirthInput: true,
    hasPlanets: true,
    hasAscendant: true,
  },
};

const localVedicChartJson = buildVedicLocalChartJson(rawInput, { strictPremium: true });
assert.equal(localVedicChartJson.calculationMode, "full", "local calculation mode");
assert.equal(localVedicChartJson.chart.planets.length, 9, "planet count");
assert.equal(localVedicChartJson.chart.houses.length, 12, "house count");

const vedicMasterJson = buildVedicMasterJson(localVedicChartJson, rawInput);
const masterValidation = validateVedicMasterJson(vedicMasterJson);
assert.equal(vedicMasterJson.schemaVersion, "vedic-premium-master-json.v1", "master schema");
assert.equal(masterValidation.ok, true, `master validation: ${masterValidation.missing.join(",")}`);

const facts = buildVedicAstrologyFacts(localVedicChartJson, rawInput);
assert.equal(facts.productId, "vedic_astrology", "facts product");
assert.equal(facts.mode, "personal", "facts mode");
assert.equal(facts.calculationBasis.zodiacType, "sidereal", "zodiac basis");
assert.equal(facts.calculationBasis.ayanamsa, "Lahiri", "ayanamsa basis");
assert.equal(facts.calculationBasis.houseSystem, "whole-sign", "house basis");
assert.equal(facts.calculationBasis.dashaSystem, "vimshottari", "dasha basis");

assert.equal(VEDIC_ASTROLOGY_ASSEMBLY_VERSION, VEDIC_PDF_CONFIG.templateVersion, "assembly version");
assert.equal(VEDIC_PDF_CONFIG.templateVersion, "vedic-premium-local-assembled-v2", "local assembled template version");

const generated = await generateVedicPremiumReport({}, rawInput, {
  requestId: "smoke-vedic-premium",
  log: () => {},
});

assert.equal(generated.diagnostics.manuscript.ok, true, "local manuscript validation");
assert.equal(generated.manuscriptSource, VEDIC_PDF_CONFIG.generationMode, "local assembled source");
assert.equal(generated.localAssembly.enabled, true, "local assembly enabled");
assert.equal(generated.localAssembly.externalGeneration, false, "external generation blocked");
assert.equal(generated.localAssembly.externalCallsAllowed, false, "external calls blocked");
assert.equal(generated.localAssembly.chapterCount, 12, "local assembly chapter count");
assert.equal(generated.localAssembly.expectedChapterCount, 12, "local assembly expected chapter count");
assert.equal(generated.localAssembly.templateVersion, VEDIC_PDF_CONFIG.templateVersion, "local assembly template version");
assert.equal(generated.pdfReady.localAssembly.externalGeneration, false, "pdfReady external generation blocked");
assert.equal(generated.pdfReady.localAssembly.externalCallsAllowed, false, "pdfReady external calls blocked");
assert.equal(generated.diagnostics.localAssembly.externalGeneration, false, "diagnostics external generation blocked");
assert.equal(generated.diagnostics.localAssembly.externalCallsAllowed, false, "diagnostics external calls blocked");
assert.equal(generated.chapterDrafts.length, 12, "chapter draft count");
assert.equal(generated.chapterDrafts.every((chapter) => chapter.sections.every((section) => String(section.body || "").trim().length > 0)), true, "no empty sections");
assert.ok(String(generated.pdfReady?.html || "").includes("베다점 프리미엄 PDF"), "pdf html rendered");
assert.equal(generated.pdfCompletionValidation.ok, true, "pdf completion validation");

const archiveUrl = "https://example.test/api/premium/pdf-archive/smoke_vedic_premium_report";
const pdfReady = {
  filename: "vedic-premium-smoke.pdf",
  pdfUrl: withArchiveFormat(archiveUrl, "pdf"),
  downloadUrl: withArchiveFormat(archiveUrl, "pdf"),
  htmlUrl: withArchiveFormat(archiveUrl, "html"),
  mimeType: "application/pdf",
  contentType: "application/pdf",
  renderFormat: "pdf-archive",
};

assert.ok(pdfReady.pdfUrl.includes("format=pdf"), "pdf archive format");
assert.ok(pdfReady.downloadUrl.includes("format=pdf"), "download archive format");
assert.ok(pdfReady.htmlUrl.includes("format=html"), "html archive format");
assert.equal(pdfReady.mimeType, "application/pdf", "mime type");
assert.equal(pdfReady.contentType, "application/pdf", "content type");
assert.equal(pdfReady.renderFormat, "pdf-archive", "render format");
assert.ok(/\.pdf$/i.test(pdfReady.filename), "pdf filename");
assert.equal(validateVedicPdfCompletionPayload({
  pdfReady: { ...generated.pdfReady, ...pdfReady },
  chapters: generated.chapterDrafts,
  payload: generated.localVedicChartJson,
  requireDownloadUrl: true,
}).ok, true, "archive pdf completion validation");

const variantRawInput = {
  ...rawInput,
  birthDate: "1993-07-14",
  birthYear: 1993,
  birthMonth: 7,
  birthDay: 14,
  birthInput: {
    ...rawInput.birthInput,
    birthDate: "1993-07-14",
    birthYear: 1993,
    birthMonth: 7,
    birthDay: 14,
  },
  chart: {
    ...chart,
    ascendantSidereal: 118.2,
    planets: {
      ...chart.planets,
      Moon: 203.4,
      Sun: 112.8,
      Jupiter: 266.1,
    },
  },
  vedicBase: {
    ...rawInput.vedicBase,
    chart: {
      ...chart,
      ascendantSidereal: 118.2,
      planets: {
        ...chart.planets,
        Moon: 203.4,
        Sun: 112.8,
        Jupiter: 266.1,
      },
    },
  },
};
const variant = await generateVedicPremiumReport({}, variantRawInput, {
  requestId: "smoke-vedic-premium-variant",
  log: () => {},
});
assert.notEqual(
  [
    generated.localVedicChartJson?.chart?.lagnaSign,
    generated.localVedicChartJson?.chart?.moonSign,
    generated.chapterDrafts?.[0]?.sections?.[0]?.body,
  ].join("|"),
  [
    variant.localVedicChartJson?.chart?.lagnaSign,
    variant.localVedicChartJson?.chart?.moonSign,
    variant.chapterDrafts?.[0]?.sections?.[0]?.body,
  ].join("|"),
  "local assembly changes by input",
);

console.log("SMOKE_VEDIC_PREMIUM_MASTER_JSON=ok");
console.log("SMOKE_VEDIC_PREMIUM_LOCAL_ASSEMBLED=ok");
console.log("SMOKE_VEDIC_PREMIUM_ARCHIVE=ok");
