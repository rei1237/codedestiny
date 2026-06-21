const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");

let maya;
let promptGenerator;
let calendarBundlePath;
let promptBundlePath;

function bundleTs(entryPath, name) {
  const outfile = path.join(os.tmpdir(), `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}.cjs`);
  esbuild.buildSync({
    entryPoints: [entryPath],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile,
    alias: {
      "@/src": path.join(process.cwd(), "src"),
    },
  });
  return outfile;
}

test.before(() => {
  calendarBundlePath = bundleTs(path.join(process.cwd(), "src", "lib", "maya-calendar.ts"), "maya-calendar");
  promptBundlePath = bundleTs(path.join(process.cwd(), "src", "lib", "maya-prompt-generator.ts"), "maya-prompt-generator");
  maya = require(calendarBundlePath);
  promptGenerator = require(promptBundlePath);
});

test.after(() => {
  for (const file of [calendarBundlePath, promptBundlePath]) {
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
  }
});

test("2026-06-21 matches GMT 584283 reference values", () => {
  const result = maya.calculateMayaCalendar(2026, 6, 21);
  assert.equal(result.longCount.label, "13.0.13.12.10");
  assert.equal(result.tzolkin.label, "7 Ok");
  assert.equal(result.haab.label, "3 Sek");
  assert.equal(result.gregorian.weekdayKo, "일");
});

test("2012-12-21 matches GMT 584283 reference values", () => {
  const result = maya.calculateMayaCalendar(2012, 12, 21);
  assert.equal(result.longCount.label, "13.0.0.0.0");
  assert.equal(result.tzolkin.label, "4 Ajaw");
  assert.equal(result.haab.label, "3 K'ank'in");
});

test("month grid keeps 2026-06-21 on Sunday without day shift", () => {
  const selected = { year: 2026, month: 6, day: 21 };
  const today = { year: 2026, month: 6, day: 21 };
  const cells = maya.buildMayaMonthGrid(2026, 6, selected, today);
  const selectedCell = cells.find((cell) => cell.isSelected);
  assert.equal(selectedCell.calendar.gregorian.iso, "2026-06-21");
  assert.equal(selectedCell.calendar.gregorian.weekdayIndex, 0);
  assert.equal(selectedCell.calendar.tzolkin.label, "7 Ok");
});

test("leap day is accepted and invalid dates are blocked", () => {
  assert.equal(maya.calculateMayaCalendar(2024, 2, 29).gregorian.iso, "2024-02-29");
  assert.equal(maya.isValidGregorianDate(2023, 2, 29), false);
});

test("generated prompt keeps calculated Maya values unchanged", () => {
  const result = maya.calculateMayaCalendar(2026, 6, 21);
  const prompt = promptGenerator.generateMayaReadingPrompt({
    name: "테스트",
    birthDate: "1990-01-01",
    targetDate: "2026년 6월 21일",
    weekdayKo: "일",
    topic: "오늘의 운세",
    concern: "오늘의 방향을 알고 싶습니다.",
    longCount: result.longCount.label,
    tzolkinNumber: result.tzolkin.number,
    tzolkinSign: result.tzolkin.sign,
    tzolkinKo: result.tzolkin.ko,
    tzolkinKeywords: result.tzolkin.keywords,
    haabDay: result.haab.day,
    haabMonth: result.haab.month,
    haabKo: result.haab.ko,
    haabKeywords: result.haab.keywords,
  });

  assert.match(prompt, /Long Count: 13\.0\.13\.12\.10/);
  assert.match(prompt, /Tzolk'in: 7 Ok/);
  assert.match(prompt, /Haab: 3 Sek/);
  assert.doesNotMatch(prompt, /generateWithGemini|generateWithOpenAI|callLLM|streamText/);
});
