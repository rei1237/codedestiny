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
  // 🔴 예전에는 한국어 리터럴("십이운성 동물점", `row("연주"`)을 단언했다. 2026-08-25 에 라벨이
  //    _lib/copy.ts 로 옮겨가면서 그 단언은 **문구가 로케일화됐다는 이유만으로** 깨졌다 —
  //    리터럴 grep 가드의 전형적인 실패다. 지키려던 것은 문구가 아니라 **사주 네 기둥이 카드에
  //    다 들어가는가** 였으므로, 그 구조를 카피 키와 데이터 경로로 단언한다.
  assert.ok(src.includes("COPY.shareCardKicker"));
  for (const pillar of ["Year", "Month", "Day", "Hour"]) {
    assert.ok(src.includes(`COPY.shareCardPillar${pillar}`), `공유 카드에 ${pillar} 기둥 라벨이 없다`);
    assert.ok(src.includes(`pillars.${pillar.toLowerCase()}`), `공유 카드에 ${pillar} 기둥 값이 없다`);
  }
  assert.ok(src.includes("LOVE"));
  assert.ok(src.includes("CAREER"));
});
