import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTsModule } from "../../scripts/lib/load-ts-module.mjs";

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const catalog = loadTsModule("lib/psychotest-catalog.ts");
const data = loadTsModule("src/features/psychotest/data/testData.ts");

test("all recovered quizzes have a same-origin route and matching questions", () => {
  assert.equal(data.ALL_TESTS.length, 22);
  assert.deepEqual(new Set(catalog.PSYCHOTESTS.map(test => test.id)), new Set(data.ALL_TESTS.map(test => test.id)));
  for (const entry of data.ALL_TESTS) {
    assert.equal(catalog.buildPsychotestExternalUrl(entry.id), `/psychotest/${entry.id}/`);
    assert.ok(data[`${entry.id.toUpperCase()}_QUESTIONS`].length > 0);
    assert.ok(data[`${entry.id.toUpperCase()}_RESULTS`]);
  }
});

test("free entry cannot invoke paid access and owns immersive navigation", () => {
  const link = read("app/psychotest/_components/PaidPsychotestLink.tsx");
  assert.doesNotMatch(link, /useCoinGate|ensurePaidAccess|usePaidResume/);
  const chrome = read("app/components/AppChrome.tsx");
  assert.match(chrome, /const IMMERSIVE_FORTUNE_ROUTES = \[\s*"\/psychotest"/);
  const player = read("src/features/psychotest/TestPlayer.tsx");
  assert.doesNotMatch(player, /fetch\(|ensurePaidAccess|replit\.app/);
  assert.match(player, /PSYCHO_QUESTIONS\.length/);
});
