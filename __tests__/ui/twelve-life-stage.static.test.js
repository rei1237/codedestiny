const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), "utf8");
}

function parseTable() {
  const src = read("app/saju/animal-destiny/lib/calculateTwelveLifeStage.ts");
  const m = src.match(/TWELVE_LIFE_STAGE_TABLE[^=]*=\s*({[\s\S]*?});/);
  assert.ok(m, "TWELVE_LIFE_STAGE_TABLE not found");
  return Function(`"use strict"; return (${m[1]});`)();
}

function getTwelveLifeStage(dayStem, targetBranch) {
  const table = parseTable();
  const result = table?.[dayStem]?.[targetBranch];
  if (!result) throw new Error(`[TwelveLifeStage] Invalid mapping: dayStem=${dayStem}, targetBranch=${targetBranch}`);
  return result;
}

test("official twelve life stage mappings are correct", () => {
  assert.equal(getTwelveLifeStage("辛", "酉"), "건록");
  assert.equal(getTwelveLifeStage("甲", "亥"), "장생");
  assert.equal(getTwelveLifeStage("癸", "午"), "절");
  assert.equal(getTwelveLifeStage("丁", "巳"), "제왕");
  assert.equal(getTwelveLifeStage("壬", "子"), "제왕");
});

test("day pillar stage for 신유일주 is always 건록", () => {
  const dayStem = "辛";
  const dayBranch = "酉";
  const dayStage = getTwelveLifeStage(dayStem, dayBranch);
  assert.equal(dayStage, "건록");
});
