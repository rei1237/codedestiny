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
  // 라벨은 `label: "..."` 리터럴에서 i18n 번역 맵(`"section.core": "핵심 성향"`)으로 옮겨갔다.
  // 표기 형태가 아니라 "여덟 섹션이 모두 존재하는가"를 지킨다 — 형태를 박아두면 리팩터링
  // 한 번에 테스트가 죽고, 정작 섹션이 사라져도 아무도 모르게 된다.
  const requiredSectionKeys = [
    "section.core",
    "section.strengthWeakness",
    "section.loveRelations",
    "section.workMoney",
    "section.stress",
    "section.today",
    "section.compatible",
    "section.mission",
  ];
  // 섹션은 그 뒤로 늘었다(section.lifePattern·section.misunderstanding). 여덟 개는 최소 보장선이다.

  for (const key of requiredSectionKeys) {
    const match = src.match(new RegExp(`"${key.replace(".", "\\.")}"\\s*:\\s*"([^"]+)"`));
    assert.ok(match, `Missing section key: ${key}`);
    assert.ok(match[1].trim().length > 0, `Empty label for section key: ${key}`);
  }
});
