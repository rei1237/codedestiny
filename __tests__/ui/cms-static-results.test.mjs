import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { DAILY_PROSE_POOLS } from "../../lib/fortune/daily-prose.mjs";
import { dailyProseDefaults, applyDailyProse } from "../../lib/fortune/daily-cms.mjs";
import { applyStaticCopy, staticCopyRecord } from "../../lib/cms/static-copy.mjs";
import { loadTsModule } from "../../scripts/lib/load-ts-module.mjs";
import { createRequire } from "node:module";

test("extracted daily prose retains every language and index from the original generator", () => {
  // Baseline 248c78801: all 56 multilingual rows and their selection order.
  assert.equal(createHash("sha256").update(JSON.stringify(DAILY_PROSE_POOLS)).digest("hex"), "6524cfbc51e17028f1ed20936e8a203d76715b780466cdda5d7bbe8dd3013f8d");
});

test("a published daily sentence changes only its Korean result occurrences", () => {
  const base = DAILY_PROSE_POOLS.love[0];
  const original = {date:"2026-10-21", score:{love:8}, lucky:{number:3}, animals:{rat:{sections:{love:base}}}, zodiacs:{aries:{sections:{love:base, work:DAILY_PROSE_POOLS.work[0]}}}};
  const copy = structuredClone(original);
  const result = applyDailyProse(original, {love:{record:{0:{text:"서로의 이야기를 천천히 들어 보세요."}, unknown:{text:"ignored"}}}});
  assert.equal(result.animals.rat.sections.love.kr, "서로의 이야기를 천천히 들어 보세요.");
  assert.deepEqual(result.animals.rat.sections.love, {...base, kr:"서로의 이야기를 천천히 들어 보세요."});
  assert.deepEqual(result.zodiacs.aries.sections.work, original.zodiacs.aries.sections.work);
  assert.deepEqual(result.score, original.score);
  assert.deepEqual(result.lucky, original.lucky);
  assert.equal(result.date, original.date);
  assert.deepEqual(original, copy);
  assert.equal(Object.values(dailyProseDefaults()).reduce((n, table) => n+Object.keys(table).length, 0),56);
  assert.equal(applyDailyProse(original, {}),original);
});

test("nested story choices keep their structure and reject unknown paths and empty text", () => {
  const source = {arrival:"도착", choices:[{label:"선택",reply:"대답"}], count:2};
  const fields = staticCopyRecord(source);
  assert.deepEqual(Object.keys(fields), ["arrival", "choices/0/label", "choices/0/reply"]);
  const edited = applyStaticCopy(source, {"choices/0/reply":{text:"새 대답"}, arrival:{text:" "}, count:{text:"0"}, "__proto__/polluted":{text:"yes"}});
  assert.equal(edited.choices[0].reply,"새 대답");
  assert.equal(edited.choices.length,1);
  assert.equal(edited.count,2);
  assert.equal(edited.arrival,"도착");
  assert.equal({}.polluted,undefined);
});

test("server render and public JSON both consume the published daily prose", () => {
  assert.match(readFileSync("lib/fortune/daily-data.ts","utf8"), /applyDailyProse\(parsed, getCmsEntriesSnapshot\(\)\["daily-fortune"\]\)/);
  assert.match(readFileSync("scripts/fetch-published-cms.mjs","utf8"), /applyDailyProse\(original, data.entries\["daily-fortune"\]\)/);
});

test("the real hat result reads published prose without mutating its default story", () => {
  const require = createRequire(import.meta.url);
  const generated = require("../../app/_content/cms.generated.json");
  const previous = generated.entries;
  generated.entries = {
    "hat-reading": {"moon-library": {record: {temperament: {text:"차분하게 생각을 정리하는 편이야."}, "choices/0/reply": {text:"한 장씩 읽어 보렴."}}}},
    "fortune-sign": {aries:{record:{essence:{text:"한 가지 일을 먼저 시작해 보세요."},id:{text:"changed"},element:{text:"changed"},"bestWith/0":{text:"changed"}}}},
  };
  try {
    const {hatPersonality, hatPersonalityDefaults} = loadTsModule("lib/yeongnyangi/hat-personality.ts");
    assert.equal(hatPersonality["moon-library"].temperament,"차분하게 생각을 정리하는 편이야.");
    assert.equal(hatPersonality["moon-library"].choices[0].reply,"한 장씩 읽어 보렴.");
    assert.notEqual(hatPersonalityDefaults["moon-library"].temperament,hatPersonality["moon-library"].temperament);
    assert.deepEqual(hatPersonality["moon-library"].choices[1],hatPersonalityDefaults["moon-library"].choices[1]);
    const {getSignProfile, getSiblingProfiles, SIGN_PROFILE_DEFAULTS} = loadTsModule("lib/fortune/sign-profiles.ts");
    const original = SIGN_PROFILE_DEFAULTS.find((profile) => profile.id === "aries");
    assert.equal(getSignProfile("aries").essence,"한 가지 일을 먼저 시작해 보세요.");
    assert.equal(getSiblingProfiles("zodiac")[0].essence,"한 가지 일을 먼저 시작해 보세요.");
    for (const key of ["id","kind","element","bestWith","challengeWith","rangeLabel"]) assert.deepEqual(getSignProfile("aries")[key], original[key]);
  } finally {generated.entries = previous;}
});
