import { readFileSync } from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

function assert(condition, message, detail) {
  if (!condition) {
    throw new Error(detail ? `${message}: ${detail}` : message);
  }
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(root, request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

function compileTs(module, filename) {
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      skipLibCheck: true,
      baseUrl: root,
      paths: { "@/*": ["./*"] },
    },
  }).outputText;
  module._compile(output, filename);
}

require.extensions[".ts"] = compileTs;
require.extensions[".tsx"] = compileTs;

const service = require(path.join(root, "lib/famous-saju/celebrity-saju-service.ts"));
const detailPage = readFileSync(path.join(root, "app/insights/famous-saju/[slug]/page.tsx"), "utf8");
const serviceSource = readFileSync(path.join(root, "lib/famous-saju/celebrity-saju-service.ts"), "utf8");

const unknownBirthTime = service.publishedCelebritySajuSeeds.find((item) => item.birthDate && !item.isBirthTimeKnown);
const knownBirthTime = service.publishedCelebritySajuSeeds.find((item) => item.birthDate && item.isBirthTimeKnown);

assert(unknownBirthTime, "A celebrity seed with unknown birth time is required");
assert(knownBirthTime, "A celebrity seed with known birth time is required");

const unknownReading = service.buildCelebrityReading(unknownBirthTime);
const knownReading = service.buildCelebrityReading(knownBirthTime);

function fiveElementTotal(magazine) {
  return ["wood", "fire", "earth", "metal", "water"].reduce((sum, key) => sum + Number(magazine.fiveElements[key] || 0), 0);
}

assert(unknownReading.magazine.threePillarBasis === true, "Unknown birth time must use the three-pillar basis", unknownBirthTime.slug);
assert(unknownReading.magazine.profile.birthTimeKnown === false, "Unknown birth time must set birthTimeKnown=false", unknownBirthTime.slug);
assert(unknownReading.magazine.profile.birthTimeLabel === "시 미상", "Unknown birth time label must be preserved", unknownReading.magazine.profile.birthTimeLabel);
assert(unknownReading.magazine.pillars.hour === null, "Unknown birth time must leave the hour pillar null", unknownBirthTime.slug);
assert(unknownReading.saju?.pillars?.hour == null, "Engine result must not include an hour pillar for unknown birth time", unknownBirthTime.slug);
assert(JSON.stringify(unknownReading.magazine).includes("3주 기준"), "Unknown birth time result must mention the three-pillar basis");
assert(JSON.stringify(unknownReading.magazine).includes("시 미상"), "Unknown birth time result must mention the unknown birth time");
assert(fiveElementTotal(unknownReading.magazine) === 6, "Unknown birth time element total must match three pillars", String(fiveElementTotal(unknownReading.magazine)));

assert(knownReading.magazine.threePillarBasis === false, "Known birth time must use the four-pillar basis", knownBirthTime.slug);
assert(knownReading.magazine.profile.birthTimeKnown === true, "Known birth time must set birthTimeKnown=true", knownBirthTime.slug);
assert(knownReading.magazine.pillars.hour !== null, "Known birth time must include the hour pillar", knownBirthTime.slug);
assert(fiveElementTotal(knownReading.magazine) === 8, "Known birth time element total must match four pillars", String(fiveElementTotal(knownReading.magazine)));

assert(unknownReading.magazine.pillars.year.ganji === unknownReading.saju.pillars.year.ganji, "Year pillar must match the engine result");
assert(unknownReading.magazine.pillars.month.ganji === unknownReading.saju.pillars.month.ganji, "Month pillar must match the engine result");
assert(unknownReading.magazine.pillars.day.ganji === unknownReading.saju.pillars.day.ganji, "Day pillar must match the engine result");

[
  "CelebritySajuHero",
  "CelebritySajuNotice",
  "CelebritySajuPillarTable",
  "CelebritySajuQuickSummaryCards",
  "FiveElementBarChart",
  "TenGodHighlightCards",
  "SinsalBadgeGrid",
  "MagazineSection",
  "CelebrityActivityInsightCard",
  "CelebritySajuFAQ",
  "CelebritySajuCTA",
  "RelatedCelebritySajuList",
].forEach((name) => {
  assert(detailPage.includes(`function ${name}`), `${name} component must exist on the detail page`);
});

assert(serviceSource.includes("CELEBRITY_SAJU_DIRECT_READING_CONTRACT"), "Famous saju direct reading contract is required");
// 계약 5개 절을 전부 못 박는다. 예전에는 첫 절 하나만 봤는데, 나머지 넷(생시 미상 3주 · 계산값
// 밖 임의 보충 금지 · 건강/사고/범죄/연애/가족 추측 금지 · 단정형 예언 금지)은 실존 인물을
// 다루는 이 화면의 안전 제약이라 지워져도 아무도 실패하지 않았다(2026-09-02 변이 실측).
[
  "유명인 사주 본문은 계산 엔진이 산출한 년주·월주·일주·시주, 오행, 십성, 신살, 12운성 값을 바탕으로 직접 구성한다.",
  "본문은 공개 생년월일과 로컬 사주 계산 결과 밖의 값을 임의로 채우지 않는다.",
  "생시 미상은 반드시 3주 기준으로 쓰고 시주를 추정하지 않는다.",
  "공개 생년월일과 로컬 계산값 밖의 건강, 사고, 범죄, 연애, 가족 문제는 추측하지 않는다.",
  "단정형 예언 대신 명리학적으로 읽을 수 있는 결, 흐름, 주의 신호로 부드럽게 쓴다.",
].forEach((clause) => {
  assert(serviceSource.includes(clause), `Direct reading contract clause is required: ${clause.slice(0, 20)}…`);
});
const mechanicalCopyRe = /이\s*기능은|이\s*결과는|분석\s*결과는|\uFFFD/;
assert(!mechanicalCopyRe.test(`${detailPage}\n${serviceSource}`), "Mechanical copy or replacement characters must not be exposed");

console.log("[verify-famous-saju-magazine] PASS", {
  unknownBirthTime: unknownBirthTime.slug,
  knownBirthTime: knownBirthTime.slug,
  unknownElementTotal: fiveElementTotal(unknownReading.magazine),
  knownElementTotal: fiveElementTotal(knownReading.magazine),
});
