const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

test("analysis narrative module includes stage-based evidence builders", () => {
  const src = read("app/saju/animal-destiny/lib/analysisNarrative.ts");
  assert.ok(src.includes("buildAnimalNarrativeInsights"));
  assert.ok(src.includes("buildCompatibilityStageEvidence"));
  assert.ok(src.includes("일지"));
  assert.ok(src.includes("월지"));
  assert.ok(src.includes("년지"));
});

test("result screen wires dynamic insights into all major panels", () => {
  const src = read("app/saju/animal-destiny/components/AnimalResultScreen.tsx");
  assert.ok(src.includes("buildAnimalNarrativeInsights"));
  assert.ok(src.includes("사주 근거 요약"));
  assert.ok(src.includes("insight={insights.statsLine}"));
  assert.ok(src.includes("insight={insights.personalityLine}"));
  assert.ok(src.includes("insight={insights.loveLine}"));
  assert.ok(src.includes("insight={insights.careerLine}"));
  assert.ok(src.includes("insight={insights.luckLine}"));
});

test("compatibility grid uses Korean animal display and stage evidence", () => {
  const src = read("app/saju/animal-destiny/components/AnimalCompatibilityGrid.tsx");
  assert.ok(src.includes("getAnimalDisplayData"));
  assert.ok(src.includes("partner.primaryStage"));
  assert.ok(src.includes("partner.stageEvidence"));
  assert.ok(src.includes("사주 근거:"));
});
