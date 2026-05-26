const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

test("twelve growth stage seeds define all 12 stages", () => {
  const src = read("app/saju/animal-destiny/lib/twelveGrowthAnimalResults.ts");
  const requiredKeys = [
    "jangsaeng",
    "mogyok",
    "gwandae",
    "geonrok",
    "jewang",
    "soe",
    "byeong",
    "sa",
    "myo",
    "jeol",
    "tae",
    "yang",
  ];

  for (const key of requiredKeys) {
    assert.ok(src.includes(`${key}: {`), `Missing stage seed: ${key}`);
  }
});

test("tab labels include required eight sections", () => {
  const src = read("app/saju/animal-destiny/lib/twelveGrowthAnimalResults.ts");
  const requiredLabels = [
    "핵심 성향",
    "강점과 약점",
    "연애와 인간관계",
    "일과 재물 감각",
    "스트레스 패턴",
    "오늘의 실전 조언",
    "나와 잘 맞는 동물 에너지",
    "성장 미션",
  ];

  for (const label of requiredLabels) {
    assert.ok(src.includes(`label: \"${label}\"`), `Missing tab label: ${label}`);
  }
});
