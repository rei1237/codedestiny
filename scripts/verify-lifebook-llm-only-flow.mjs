import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const labelPrefix = "lifebook-local-first";

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`[${labelPrefix}] missing ${label}: ${marker}`);
  }
}

function assertNotIncludes(source, marker, label) {
  if (source.includes(marker)) {
    throw new Error(`[${labelPrefix}] forbidden ${label}: ${marker}`);
  }
}

const staticSource = read("js/life-book.js");
const staticMirror = read("public/js/life-book.js");
const reactRoute = read("app/saju/lifebook/page.js");
const workerRoute = read("worker/routes/saju-lifebook.js");

assertIncludes(staticSource, "generationMode: 'worker-native-hybrid'", "static worker hybrid generation mode");
assertIncludes(staticSource, "calculationSource: 'worker-saju-engine'", "static worker calculation source");
assertIncludes(staticSource, "authoringMode: 'hybrid'", "static hybrid authoring mode");
assertIncludes(staticSource, "LIFE_BOOK_BACKGROUND_STATUS_WAIT", "static background status wait");
assertNotIncludes(staticSource, "authoringMode: 'llm-only'", "static llm-only authoring mode");
assertNotIncludes(staticSource, "LIFEBOOK_LLM_ONLY_AUTHORING_REQUIRED", "static llm-only rejection");

if (staticSource !== staticMirror) {
  throw new Error(`[${labelPrefix}] js/life-book.js and public/js/life-book.js differ`);
}

assertIncludes(reactRoute, 'generationMode: "worker-native-hybrid"', "react worker hybrid generation mode");
assertIncludes(reactRoute, 'calculationSource: "client-quantum-myeongri-v2+worker-saju-engine"', "react local plus worker calculation source");
assertIncludes(reactRoute, 'authoringMode: "hybrid"', "react hybrid authoring mode");
assertNotIncludes(reactRoute, 'authoringMode: "llm-only"', "react llm-only authoring mode");
assertNotIncludes(reactRoute, "LIFEBOOK_LLM_ONLY_AUTHORING_REQUIRED", "react llm-only rejection");

assertIncludes(workerRoute, 'const LIFEBOOK_AUTHORING_MODE = "hybrid"', "worker authoring mode constant");
assertIncludes(workerRoute, "isLifeBookLlmOnlyAuthoringMode", "worker llm-only isolation helper");
assertIncludes(workerRoute, 'return clean(value).toLowerCase() === "llm-only"', "worker llm-only exact guard");
assertIncludes(workerRoute, "local-template", "worker local template source");
assertIncludes(workerRoute, "fallbackUsed: true", "worker local fallback chapter seed");
assertIncludes(workerRoute, "deterministic-full-manuscript", "worker deterministic full manuscript");
assertIncludes(workerRoute, "deterministic-final-pdf-review", "worker deterministic final review");
assertIncludes(workerRoute, "LIFE_BOOK_BACKGROUND_GENERATION_STARTED", "worker background generation marker");
assertIncludes(workerRoute, "authoringMode: LIFEBOOK_AUTHORING_MODE", "worker response authoring mode");
assertNotIncludes(workerRoute, 'const LIFEBOOK_AUTHORING_MODE = "llm-only"', "worker llm-only authoring mode constant");

console.log(`[${labelPrefix}] PASS`);
