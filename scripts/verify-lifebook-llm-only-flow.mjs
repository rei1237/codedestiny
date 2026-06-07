import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`[lifebook-llm-only] missing ${label}: ${marker}`);
  }
}

function assertNotIncludes(source, marker, label) {
  if (source.includes(marker)) {
    throw new Error(`[lifebook-llm-only] forbidden ${label}: ${marker}`);
  }
}

const staticSource = read("js/life-book.js");
const staticMirror = read("public/js/life-book.js");
const reactRoute = read("app/saju/lifebook/page.js");
const workerRoute = read("worker/routes/saju-lifebook.js");

assertIncludes(staticSource, "generationMode: 'worker-native-llm'", "static worker generation mode");
assertIncludes(staticSource, "calculationSource: 'worker-saju-engine'", "static worker calculation source");
assertIncludes(staticSource, "authoringMode: 'llm-only'", "static llm-only authoring mode");
assertIncludes(staticSource, "LIFEBOOK_LLM_ONLY_AUTHORING_REQUIRED", "static fallback rejection");
assertNotIncludes(staticSource, "localOnly: true", "static local-only flag");
assertNotIncludes(staticSource, "ManuscriptSourceNormalized", "static manuscript normalization to local");

if (staticSource !== staticMirror) {
  throw new Error("[lifebook-llm-only] js/life-book.js and public/js/life-book.js differ");
}

assertIncludes(reactRoute, 'generationMode: "worker-native-llm"', "react worker generation mode");
assertIncludes(reactRoute, 'calculationSource: "worker-saju-engine"', "react worker calculation source");
assertIncludes(reactRoute, 'authoringMode: "llm-only"', "react llm-only authoring mode");
assertIncludes(reactRoute, "LIFEBOOK_LLM_ONLY_AUTHORING_REQUIRED", "react fallback rejection");

assertIncludes(workerRoute, 'const LIFEBOOK_AUTHORING_MODE = "llm-only"', "worker authoring mode constant");
assertIncludes(workerRoute, "stateKey: LIFEBOOK_LLM_WRITING_STATE", "worker llm writing state");
assertIncludes(workerRoute, "LIFEBOOK_GEMINI_SECTION_INVALID", "worker section fallback rejection");
assertIncludes(workerRoute, "LIFEBOOK_GEMINI_CHAPTER_MERGE_INVALID", "worker chapter merge fallback rejection");
assertIncludes(workerRoute, "LIFEBOOK_GEMINI_CHAPTER_REVIEW_INVALID", "worker chapter review fallback rejection");
assertIncludes(workerRoute, "LIFEBOOK_GEMINI_FULL_MANUSCRIPT_INVALID", "worker final manuscript fallback rejection");
assertIncludes(workerRoute, "LIFEBOOK_GEMINI_FINAL_REVIEW_INVALID", "worker final review fallback rejection");
assertIncludes(workerRoute, "fallbackUsed: false", "worker success fallback flag");
assertIncludes(workerRoute, "llmUsed: true", "worker success llm flag");
assertIncludes(workerRoute, "authoringMode: LIFEBOOK_AUTHORING_MODE", "worker response authoring mode");
assertNotIncludes(workerRoute, 'deterministicReinforcedCount > 0 ? "gemini-section+deterministic-reinforcement"', "worker deterministic manuscript source");

console.log("[lifebook-llm-only] PASS");
