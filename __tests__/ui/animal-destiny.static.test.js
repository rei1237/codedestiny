const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

function extractObjectLiteral(source, constName) {
  const escapedName = constName.replace(/[$]/g, "\\$");
  const re = new RegExp(`const\\s+${escapedName}[^=]*=\\s*({[\\s\\S]*?});`);
  const match = source.match(re);
  assert.ok(match, `Cannot find object literal for ${constName}`);
  return Function(`"use strict"; return (${match[1]});`)();
}

test("twelve stage table has complete 10x12 deterministic matrix", () => {
  const src = read("app/saju/animal-destiny/lib/twelveStages.ts");
  const table = extractObjectLiteral(src, "TWELVE_STAGE_TABLE");
  const expectedStages = ["\uC7A5\uC0DD", "\uBAA9\uC695", "\uAD00\uB300", "\uAC74\uB85D", "\uC81C\uC655", "\uC1E0", "\uBCD1", "\uC0AC", "\uBB18", "\uC808", "\uD0DC", "\uC591"];

  const stems = Object.keys(table);
  assert.equal(stems.length, 10);

  let pairCount = 0;
  for (const stem of stems) {
    const row = table[stem];
    const branches = Object.keys(row);
    assert.equal(branches.length, 12, `Stem ${stem} must have 12 branches`);
    pairCount += branches.length;

    const stageSet = new Set(Object.values(row));
    assert.equal(stageSet.size, 12, `Stem ${stem} must cover 12 unique stages`);
    for (const stage of expectedStages) {
      assert.ok(stageSet.has(stage), `Stem ${stem} is missing stage ${stage}`);
    }
  }

  assert.equal(pairCount, 120);
});

test("stage-to-animal mapping covers all 12 stages with unique animals", () => {
  const src = read("app/saju/animal-destiny/lib/animalMapping.ts");
  const mapping = extractObjectLiteral(src, "STAGE_TO_ANIMAL");

  const stages = Object.keys(mapping);
  const animals = Object.values(mapping);
  assert.equal(stages.length, 12);
  assert.equal(new Set(animals).size, 12);
});

test("animal data order contains 12 unique ids", () => {
  const src = read("app/saju/animal-destiny/data/animalDestinyData.ts");
  const orderMatch = src.match(/const\s+ORDER[^=]*=\s*\[([\s\S]*?)\];/);
  assert.ok(orderMatch, "ORDER array must exist");

  const ids = [...orderMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, 12);
  assert.equal(new Set(ids).size, 12);

  for (const id of ids) {
    assert.ok(src.includes(`id: "${id}"`), `BASE data missing id: ${id}`);
  }
});

test("unlock pricing is registered as 100 coins in worker registry", () => {
  const src = read("worker/lib/paid-feature-registry.js");
  assert.ok(src.includes('"animal-destiny-unlock": { cost: 100'));
  assert.ok(src.includes('"unlock.animal_destiny": { featureKey: "animal-destiny-unlock", cost: 100'));
});

test("service exposure and hero image wiring are present", () => {
  const sections = read("app/_lib/serviceSections.js");
  assert.ok(sections.includes('href: "/saju/animal-test"'));

  const aliasRoute = read("app/saju/animal-test/page.tsx");
  assert.ok(aliasRoute.includes('/saju/animal-destiny'));

  const intro = read("app/saju/animal-destiny/components/AnimalDestinyIntro.tsx");
  const encodedAsset = "/fuctionassets/%EB%8F%99%EB%AC%BC%EC%A0%90%ED%85%8C%EC%8A%A4%ED%8A%B8.webp";
  assert.ok(intro.includes(encodedAsset));

  const imageFileName = decodeURIComponent("%EB%8F%99%EB%AC%BC%EC%A0%90%ED%85%8C%EC%8A%A4%ED%8A%B8.webp");
  const imagePath = path.join(process.cwd(), "public", "fuctionassets", imageFileName);
  assert.ok(fs.existsSync(imagePath), "Expected hero image file to exist in public assets");
});
