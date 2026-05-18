const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

function parseGanjiArray(src) {
  const m = src.match(/export const GANJI_60 = (\[[\s\S]*?\]) as const;/);
  assert.ok(m, "GANJI_60 array not found");
  return Function(`"use strict"; return (${m[1]});`)();
}

function parseAnimalMap(src) {
  const m = src.match(/export const GANJI_ANIMAL_MAP:[^=]*= (\{[\s\S]*?\n\});/);
  assert.ok(m, "GANJI_ANIMAL_MAP not found");
  return Function(`"use strict"; return (${m[1]});`)();
}

function getGanjiSpritePosition(ganji, list, map) {
  const index = list.indexOf(ganji);
  const columns = 10;
  return {
    index,
    row: Math.floor(index / columns),
    col: index % columns,
    animal: map[ganji],
  };
}

test("ganji guardian util keeps index-based mapping logic", () => {
  const src = read("app/_lib/fortune/ganjiGuardianSprite.ts");
  assert.ok(src.includes("const index = GANJI_60.indexOf(ganji);"));
  assert.ok(src.includes("row: Math.floor(index / columns)"));
  assert.ok(src.includes("col: index % columns"));
});

test("getGanjiSpritePosition mapping for 갑자, 병신, 계해", () => {
  const src = read("app/_lib/fortune/ganjiGuardianSprite.ts");
  const list = parseGanjiArray(src);
  const map = parseAnimalMap(src);

  assert.deepEqual(getGanjiSpritePosition("갑자", list, map), {
    index: 0,
    row: 0,
    col: 0,
    animal: "쥐",
  });

  assert.deepEqual(getGanjiSpritePosition("병신", list, map), {
    index: 32,
    row: 3,
    col: 2,
    animal: "원숭이",
  });

  assert.deepEqual(getGanjiSpritePosition("계해", list, map), {
    index: 59,
    row: 5,
    col: 9,
    animal: "돼지",
  });
});
