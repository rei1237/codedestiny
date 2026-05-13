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
  assert.ok(src.includes("네 기둥 십이운성 카드"));
  assert.ok(src.includes("오늘의 대표 동물 프로필"));
  assert.ok(src.includes("TAB_LABELS"));
  assert.ok(src.includes("buildDetailedInterpretation"));
  assert.ok(src.includes("사주 근거 요약"));
});

test("compatibility grid uses Korean animal display and stage evidence", () => {
  const src = read("app/saju/animal-destiny/components/AnimalCompatibilityGrid.tsx");
  assert.ok(src.includes("getAnimalDisplayData"));
  assert.ok(src.includes("partner.primaryStage"));
  assert.ok(src.includes("partner.stageEvidence"));
  assert.ok(src.includes("사주 근거:"));
});

test("share card is 9:16 hologram style and includes four pillar summary", () => {
  const src = read("app/saju/animal-destiny/components/AnimalShareCard.tsx");
  assert.ok(src.includes("aspect-[9/16]"));
  assert.ok(src.includes("십이운성 동물점"));
  assert.ok(src.includes("row(\"연주\""));
  assert.ok(src.includes("row(\"월주\""));
  assert.ok(src.includes("row(\"일주\""));
  assert.ok(src.includes("row(\"시주\""));
  assert.ok(src.includes("LOVE"));
  assert.ok(src.includes("CAREER"));
});
