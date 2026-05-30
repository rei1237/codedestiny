const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

function extractConstObject(source, constName) {
  const match = source.match(new RegExp(`const\\s+${constName}[^=]*=\\s*({[\\s\\S]*?});`));
  assert.ok(match, `${constName} object literal must exist`);
  return Function(`"use strict"; return (${match[1]});`)();
}

function extractConstArray(source, constName) {
  const match = source.match(new RegExp(`const\\s+${constName}[^=]*=\\s*(\\[[\\s\\S]*?\\]);`));
  assert.ok(match, `${constName} array literal must exist`);
  return Function(`"use strict"; return (${match[1]});`)();
}

test("ziwei deep reading category specs cover all 12 palaces with 8+ categories", () => {
  const src = read("app/_lib/ziwei-deep-reading.ts");
  const specs = extractConstObject(src, "PALACE_CATEGORY_SPECS");

  assert.equal(Object.keys(specs).length, 12);
  for (const [palaceId, categories] of Object.entries(specs)) {
    assert.ok(Array.isArray(categories), `${palaceId} categories must be an array`);
    assert.ok(categories.length >= 8, `${palaceId} must define at least 8 categories`);
    const titleSet = new Set(categories.map((category) => category.title));
    assert.equal(titleSet.size, categories.length, `${palaceId} categories must have unique titles`);
  }
});

test("ziwei deep reading keeps forbidden phrases only in validator and not in generator filler", () => {
  const utilSrc = read("app/_lib/ziwei-deep-reading.ts");
  const generatorSrc = read("app/_lib/generate-ziwei-deep-chapter.ts");
  const forbidden = extractConstArray(utilSrc, "FORBIDDEN_ZIWEI_PHRASES");

  assert.ok(forbidden.includes("핵심 구조 보강"));
  assert.ok(forbidden.includes("자동 복구 생성"));

  assert.ok(!generatorSrc.includes("기준을 글로 고정할수록"));
  assert.ok(!generatorSrc.includes("후천 운용력이 급상승합니다"));
  assert.ok(!generatorSrc.includes("확장 전략과 방어 전략을 항상 짝으로 설계하세요"));
  assert.ok(generatorSrc.includes("buildZiweiDeepPalaceReading(chart, palace)"));
  assert.ok(generatorSrc.includes("palaceReading,"));
});

test("ziwei deep chapter view renders palace categories, signals, and action cards", () => {
  const src = read("app/components/ziwei/ZiweiDeepChapterView.tsx");
  assert.ok(src.includes("palaceReading.categories.map"));
  assert.ok(src.includes("상세 해석"));
  assert.ok(src.includes("기회"));
  assert.ok(src.includes("주의점"));
  assert.ok(src.includes("현실 조언"));
  assert.ok(src.includes("궁별 실전 조언"));
});

test("ziwei types expose palaceReading structure and 노복궁 section label", () => {
  const src = read("app/_lib/ziwei-types.ts");
  assert.ok(src.includes("export interface ZiweiDeepPalaceReading"));
  assert.ok(src.includes("export interface ZiweiPalaceCategoryReading"));
  assert.ok(src.includes("palaceReading?: ZiweiDeepPalaceReading;"));
  assert.ok(src.includes('friends: "노복궁"'));
  assert.ok(src.includes('{ id: "friends", title: "노복궁", palaceId: "friends" }'));
});