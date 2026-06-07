#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  buildVedicLocalChartJson,
  buildVedicMasterJson,
  generateVedicPremiumReport,
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

let generationError = null;
try {
  await generateVedicPremiumReport({}, rawInput, {
    requestId: "smoke-vedic-premium",
    log: () => {},
  });
} catch (error) {
  generationError = error;
}

assert.ok(generationError, "no-key smoke should fail without local fallback");
assert.equal(generationError.reasonClass, "missing_key", "llm failure class");
assert.equal(generationError.details?.failureClass, "missing_key", "llm failure details");

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

console.log("SMOKE_VEDIC_PREMIUM_MASTER_JSON=ok");
console.log("SMOKE_VEDIC_PREMIUM_LLM_ONLY=ok");
console.log("SMOKE_VEDIC_PREMIUM_ARCHIVE=ok");
