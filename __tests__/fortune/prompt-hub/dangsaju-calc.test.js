/**
 * @jest-environment node
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const esbuild = require("esbuild");

let dangsaju;
let bundledPath;

beforeAll(() => {
  const sourcePath = path.join(process.cwd(), "app", "fortune", "prompt-hub", "dangsaju-calc.ts");
  bundledPath = path.join(os.tmpdir(), `dangsaju-calc-${Date.now()}.cjs`);
  esbuild.buildSync({
    entryPoints: [sourcePath],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: bundledPath,
  });
  dangsaju = require(bundledPath);
});

afterAll(() => {
  if (bundledPath && fs.existsSync(bundledPath)) fs.unlinkSync(bundledPath);
});

describe("Dangsaju prompt hub calculation", () => {
  test("basic chart includes normalized birth and four stage stars", () => {
    const result = dangsaju.calculateDangsajuChart({
      modeLabel: "당사주 기본차트 해석",
      name: "달빛",
      gender: "female",
      birthDate: "1994-08-17",
      calendarType: "solar",
      birthTime: "09:20",
      timeUnknown: false,
      question: "앞으로 일과 재물 흐름에서 반복되는 패턴은 무엇일까?",
      baseDate: "2026-06-21",
    });

    expect(result.normalizedBirth.solarDate).toBe("1994-08-17");
    expect(result.normalizedBirth.lunarDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(result.normalizedBirth.pillars.year).toBeTruthy();
    expect(result.stages.early.starName).not.toBe("미산출");
    expect(result.stages.youth.starName).not.toBe("미산출");
    expect(result.stages.middle.starName).not.toBe("미산출");
    expect(result.stages.later.starName).not.toBe("미산출");
  });

  test("unknown birth time does not invent later stage star", () => {
    const result = dangsaju.calculateDangsajuChart({
      name: "시간미상",
      gender: "",
      birthDate: "1994-08-17",
      calendarType: "solar",
      birthTime: "",
      timeUnknown: true,
      question: "현재 선택 흐름을 알고 싶다.",
      baseDate: "2026-06-21",
    });
    const prompt = dangsaju.buildDangsajuPrompt(result);

    expect(result.stages.later.starName).toBe("미산출");
    expect(result.normalizedBirth.timeBranch).toBeUndefined();
    expect(prompt).toContain("출생시간 미상");
  });

  test("lunar leap input is normalized through the saju engine path", () => {
    const normalized = dangsaju.normalizeBirthWithSajuEngine({
      name: "윤달",
      gender: "male",
      birthDate: "2020-04-01",
      calendarType: "lunarLeap",
      birthTime: "10:00",
      timeUnknown: false,
    });

    expect(normalized.inputCalendarType).toBe("lunarLeap");
    expect(normalized.solarDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(normalized.yearBranch).toBeTruthy();
    expect(normalized.timeBranch).toBeTruthy();
  });

  test("compatibility prompt includes both people and calculated relation points", () => {
    const result = dangsaju.calculateDangsajuCompatibility({
      modeLabel: "당사주 궁합",
      personA: {
        name: "A",
        gender: "female",
        birthDate: "1994-08-17",
        calendarType: "solar",
        birthTime: "09:20",
        timeUnknown: false,
      },
      personB: {
        name: "B",
        gender: "male",
        birthDate: "1990-03-12",
        calendarType: "solar",
        birthTime: "21:10",
        timeUnknown: false,
      },
      relationshipType: "연애",
      question: "두 사람이 오래 안정될 수 있을까?",
      baseDate: "2026-06-21",
    });
    const prompt = dangsaju.buildDangsajuPrompt(result);

    expect(result.harmonyPoints.length).toBeGreaterThan(0);
    expect(result.conflictPoints.length).toBeGreaterThan(0);
    expect(prompt).toContain("[A 당사주 12성]");
    expect(prompt).toContain("[B 당사주 12성]");
    expect(prompt).toContain(result.compatibilitySummary);
  });

  test("free dangsaju modules do not connect to payment gates", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app", "fortune", "prompt-hub", "dangsaju-calc.ts"), "utf8");
    expect(source).not.toMatch(/결제|코인|월정석|billing|paid|gate/i);
  });
});
