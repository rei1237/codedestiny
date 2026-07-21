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
  assert.ok(src.includes('"animal-destiny-unlock": { cost: 100'), "가격 정본에서 100코인이 사라졌다");
  // "unlock.animal_destiny" 별칭 키는 제거됐다 — 레포 전체에서 참조가 0건이고, 클라이언트는
  // featureKey("animal-destiny-unlock")를 직접 쓴다(js/core/saju/reportDashboard.js lockKey).
  // 대신 영구 해금으로 등록돼 있는지를 본다. 그게 이 기능의 실제 과금 계약이다.
  assert.ok(
    /EXTRA_UNLOCK_PAID_FEATURE_KEY_LIST[\s\S]*?"animal-destiny-unlock"[\s\S]*?\]\)/.test(src),
    "animal-destiny-unlock 이 영구 해금 목록에 없다",
  );
});

test("service exposure and hero image wiring are present", () => {
  const sections = read("app/_lib/serviceSections.js");
  // 정본 경로는 /saju/animal-destiny 이고 /saju/animal-test 는 alias 로 남았다.
  // 둘 중 하나로만 노출돼도 진입은 살아 있으므로 "노출되어 있는가"만 본다.
  assert.ok(
    sections.includes('href: "/saju/animal-destiny"') || sections.includes('href: "/saju/animal-test"'),
    "동물점이 서비스 목록에 노출되지 않는다",
  );
  assert.ok(sections.includes('"/saju/animal-test"'), "animal-test 별칭 경로가 목록에서 사라졌다");

  const aliasRoute = read("app/saju/animal-test/page.tsx");
  assert.ok(aliasRoute.includes('/saju/animal-destiny'));

  const intro = read("app/saju/animal-destiny/components/AnimalDestinyIntro.tsx");
  const encodedAsset = "/fuctionassets/%EB%8F%99%EB%AC%BC%EC%A0%90%ED%85%8C%EC%8A%A4%ED%8A%B8.webp";
  assert.ok(intro.includes(encodedAsset));

  const imageFileName = decodeURIComponent("%EB%8F%99%EB%AC%BC%EC%A0%90%ED%85%8C%EC%8A%A4%ED%8A%B8.webp");
  const imagePath = path.join(process.cwd(), "public", "fuctionassets", imageFileName);
  assert.ok(fs.existsSync(imagePath), "Expected hero image file to exist in public assets");
});
