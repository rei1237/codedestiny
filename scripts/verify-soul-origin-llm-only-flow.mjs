import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  throw new Error(`[verify-soul-origin-llm-only-flow] ${message}`);
};

const route = read("worker/routes/soul-origin.js");
const frontend = read("js/soul-origin-book.js");
const generator = read("worker/lib/pdf-v2/soul-origin/generate-soul-origin-premium-report.js");
const validator = read("worker/lib/pdf-v2/soul-origin/soul-origin-premium.validator.js");
const normalizer = read("worker/lib/pdf-v2/soul-origin/soul-origin-premium.normalizer.js");
const promptPack = read("worker/lib/pdf-v2/soul-origin/soul-origin-premium.prompt-pack.js");

const requiredFiles = [
  "worker/lib/pdf-v2/soul-origin/soul-origin-premium.types.js",
  "worker/lib/pdf-v2/soul-origin/soul-origin-premium.normalizer.js",
  "worker/lib/pdf-v2/soul-origin/soul-origin-premium.chapter-plan.js",
  "worker/lib/pdf-v2/soul-origin/soul-origin-premium.prompt-pack.js",
  "worker/lib/pdf-v2/soul-origin/llm-client.js",
  "worker/lib/pdf-v2/soul-origin/soul-origin-premium.validator.js",
  "worker/lib/pdf-v2/soul-origin/soul-origin-premium-html-builder.js",
  "worker/lib/pdf-v2/soul-origin/generate-soul-origin-premium-report.js",
  "worker/lib/pdf-v2/soul-origin/create-soul-origin-premium-pdf-job.js",
];

for (const file of requiredFiles) {
  if (!exists(file)) fail(`missing required module: ${file}`);
}

const removedFiles = [
  "worker/pdf-v2/soul-origin-local-pdf.js",
  "scripts/verify-soul-origin-pdf-service-flow.mjs",
];
for (const file of removedFiles) {
  if (exists(file)) fail(`legacy local file still exists: ${file}`);
}

const routeForbidden = [
  "buildSoulOriginLocalChapters",
  "enhanceSoulOriginLocalMasterChapters",
  "summarizeSignal",
  "buildSoulOriginSymbolicProfile",
  "buildSoulOriginQualityReport",
  "buildSoulOriginToneProfile",
  "SOUL_ORIGIN_LOCAL_",
  "SOUL_ORIGIN_MASTER_AUTHORING_ENGINE",
  "localAuthoringUsed",
  "local-master-authored",
  "local-calculation-to-local-master-authored-pdf",
  "soul-origin-local-master-engine",
  "LocalMaster",
  "LocalCalc",
];
for (const term of routeForbidden) {
  if (route.includes(term)) fail(`route contains legacy local authoring term: ${term}`);
}

const frontendForbidden = [
  "localAuthoringUsed",
  "local-master-authored",
  "SOUL_ORIGIN_LOCAL_CHAPTER_VALIDATION_FAILED",
  "SOUL_ORIGIN_LOCAL_MANUSCRIPT_VALIDATION_FAILED",
  "LOCAL-ASSEMBLY",
  "LOCAL_ASSEMBLY",
];
for (const term of frontendForbidden) {
  if (frontend.includes(term)) fail(`frontend contains legacy local readiness/error term: ${term}`);
}

const routeRequired = [
  "normalizeSoulOriginCalculationInput",
  "createSoulOriginPremiumPdfJob",
  "LLMReportStart",
  "llmAssemblyOnly: true",
  "llmAssembly",
  "SOUL_ORIGIN_LLM_WRITING_PIPELINE",
];
for (const term of routeRequired) {
  if (!route.includes(term)) fail(`route missing LLM-only marker: ${term}`);
}

const frontendRequired = [
  "manuscriptSource === 'llm-authored'",
  "llmAssemblyOnly",
  "externalGeneration",
  "LLM_NOT_CONFIGURED",
  "INVALID_LLM_RESPONSE",
  "QUALITY_VALIDATION_FAILED",
];
for (const term of frontendRequired) {
  if (!frontend.includes(term)) fail(`frontend missing LLM readiness/error marker: ${term}`);
}

const cacheRequired = [
  "soul-origin-llm:",
  "serviceType",
  "calculationDigest",
  "promptVersion",
  "schemaVersion",
  "locale",
  "chapterId",
  "modelName",
];
for (const term of cacheRequired) {
  if (!generator.includes(term)) fail(`generator missing cache-key component: ${term}`);
}

const validationRequired = [
  "parseSoulOriginLlmJson",
  "validateSoulOriginPdfResult",
  "chapters.length !== soulOriginChapterPlanV1.chapters.length",
  "required_order",
  "evidencePoints",
  "evidence.system_variety",
  "placeholderPattern",
  "fearPattern",
  "hasRepeatedSentence",
  "llmAssembly.externalGeneration",
  "html.signal_table",
  "html.element_graph",
  "html.chapter_evidence",
];
for (const term of validationRequired) {
  if (!validator.includes(term)) fail(`validator missing quality guard: ${term}`);
}

if (normalizer.includes("rawInput") || normalizer.includes("rawUser") || normalizer.includes("body =")) {
  fail("normalizer appears to accept raw user payload");
}
const strictJsonInstruction = "\uCD9C\uB825\uC740 \uBC18\uB4DC\uC2DC \uC21C\uC218 JSON \uD558\uB098\uB9CC \uBC18\uD658\uD55C\uB2E4";
const chapterSectionOrderInstruction = "\uCCAB 4\uAC1C \uC139\uC158 \uC81C\uBAA9\uC740 requiredSections \uC21C\uC11C";

if (!promptPack.includes(strictJsonInstruction)) {
  fail("prompt pack missing strict JSON instruction");
}
if (!promptPack.includes("evidencePoints") || !promptPack.includes(chapterSectionOrderInstruction)) {
  fail("prompt pack missing chapter accuracy contract");
}
const htmlBuilder = read("worker/lib/pdf-v2/soul-origin/soul-origin-premium-html-builder.js");
for (const marker of ['data-visual="signal-table"', 'data-visual="element-graph"', 'data-visual="chapter-evidence"', "signal-table", "bar-track"]) {
  if (!htmlBuilder.includes(marker)) fail(`html builder missing visual marker: ${marker}`);
}
if (generator.includes("writeReportCache(env, cacheKey") && !generator.includes("validation.ok")) {
  fail("generator cache write is not guarded by validation flow");
}

const { soulOriginChapterPlanV1 } = await import("../worker/lib/pdf-v2/soul-origin/soul-origin-premium.chapter-plan.js");
const { validateSoulOriginPdfResult } = await import("../worker/lib/pdf-v2/soul-origin/soul-origin-premium.validator.js");
const { renderSoulOriginPdfFromLlmResult } = await import("../worker/lib/pdf-v2/soul-origin/soul-origin-premium-html-builder.js");

function buildContractText(seed = 0) {
  const phase = ["origin", "relationship", "work", "timing", "recovery"][seed % 5];
  const action = ["observe", "rebalance", "pause", "choose", "integrate"][seed % 5];
  const symbol = ["wood", "fire", "earth", "metal", "water"][seed % 5];
  return [
    `The reading follows calculation signal ${seed} in the ${phase} field with enough detail to prove that the chapter has a real body.`,
    `The guidance for ${symbol} at marker ${seed} stays calm, specific, and grounded in the confirmed signals while preserving the reader's choice.`,
    `The paragraph asks the reader to ${action} the repeated rhythm and change one response at a time during cycle ${seed + 3}.`,
    `The tone remains warm and mystical around marker ${phase}-${symbol}-${seed} without turning the interpretation into a fixed prediction.`,
  ].join(" ");
}
const contractResult = {
  reportTitle: "Destiny Karma Premium Reading",
  openingSummary: Array.from({ length: 8 }, (_, index) => buildContractText(index)).join(" "),
  chapters: soulOriginChapterPlanV1.chapters.map((chapter) => ({
    chapterNumber: chapter.chapterNumber,
    title: chapter.title,
    subtitle: `${chapter.purpose} ${buildContractText(chapter.chapterNumber)}`,
    summary: Array.from({ length: 3 }, (_, index) => buildContractText(chapter.chapterNumber * 10 + index)).join(" "),
    evidencePoints: [
      { system: "saju", signal: "wood day master and seasonal branch", reading: buildContractText(chapter.chapterNumber * 20 + 1) },
      { system: "timing", signal: "current luck cycle and yearly pressure", reading: buildContractText(chapter.chapterNumber * 20 + 2) },
      { system: "vedic", signal: "lagna and lunar mansion rhythm", reading: buildContractText(chapter.chapterNumber * 20 + 3) },
    ],
    sections: chapter.requiredSections.map((title, index) => ({
      title,
      body: Array.from({ length: 3 }, (_, offset) => `${title}: ${buildContractText(chapter.chapterNumber * 100 + index * 10 + offset)}`).join(" "),
    })),
    practicalAdvice: [
      "Write one decision standard before responding.",
      "Delay repeated reactions until the emotion settles.",
      "Make important choices after checking the same pattern twice.",
    ],
    cautionPoints: [
      "Do not turn a temporary emotion into a final conclusion.",
      "Do not confuse familiar anxiety with a fixed destiny.",
    ],
  })),
  finalMessage: Array.from({ length: 6 }, (_, index) => buildContractText(700 + index)).join(" "),
  disclaimer: Array.from({ length: 4 }, (_, index) => buildContractText(800 + index)).join(" "),
};
const contractValidation = validateSoulOriginPdfResult(contractResult);
if (!contractValidation.ok) {
  fail(`contract sample failed validation: ${contractValidation.issues.join(",")}`);
}
const contractHtml = renderSoulOriginPdfFromLlmResult({
  input: {
    person: {
      displayName: "Contract User",
      birthSummary: { birthDate: "1990-01-01", birthTime: "09:30", birthplace: "Seoul" },
    },
    calculation: {
      saju: {
        dayMaster: "wood",
        monthBranch: "tiger",
        currentDaewun: "earth-dragon",
        currentYearPillar: "fire-horse",
        elementWeights: { wood: 40, fire: 25, earth: 15, metal: 10, water: 10 },
      },
      ziwei: { mingGong: "tiger", shenGong: "horse" },
      astrology: { sun: "Capricorn", moon: "Pisces", ascendant: "Aries" },
      vedic: { lagna: "Aries", moonNakshatra: "Revati", currentDasha: "Venus" },
      sukuyo: { natalStar: "Kaku", element: "wood", nature: "growth" },
    },
  },
  result: contractValidation.result,
  reportId: "soul-origin-contract",
  generatedAt: "2026-06-20T00:00:00.000Z",
});
for (const marker of ['data-visual="signal-table"', 'data-visual="element-graph"', 'data-visual="chapter-evidence"', 'data-chapter-number="12"']) {
  if (!contractHtml.includes(marker)) fail(`contract html missing marker: ${marker}`);
}

console.log("[verify-soul-origin-llm-only-flow] ok");
