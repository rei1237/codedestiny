/**
 * @jest-environment node
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const esbuild = require("esbuild");

let kusei;
let bundledPath;

beforeAll(() => {
  const sourcePath = path.join(process.cwd(), "app", "fortune", "prompt-hub", "kusei-calc.ts");
  bundledPath = path.join(os.tmpdir(), `kusei-calc-${Date.now()}.cjs`);
  esbuild.buildSync({
    entryPoints: [sourcePath],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: bundledPath,
  });
  kusei = require(bundledPath);
});

afterAll(() => {
  if (bundledPath && fs.existsSync(bundledPath)) fs.unlinkSync(bundledPath);
});

const baseInput = {
  gender: "female",
  calendarType: "solar",
  birthTimeKnown: true,
  birthHour: 12,
  birthMinute: 0,
  timezone: "Asia/Seoul",
  focusTopic: "전체",
  userQuestion: "지금 흐름에서 줄일 것과 늘릴 것은 무엇일까?",
  currentDateTime: "2026-06-21T00:00:00+09:00",
};

describe("Kusei prompt hub calculation", () => {
  test("1980-01-01 solar birth uses the previous kigaku year before lichun", () => {
    const result = kusei.buildKuseiPromptPayload({ ...baseInput, birthDate: "1980-01-01" });

    expect(result.calculation.effectiveYear).toBe(1979);
    expect(result.calculation.honmeiNumber).toBe(3);
    expect(result.calculation.honmeiStar.koreanName).toBe("삼벽목성");
  });

  test("1980-02-05 solar birth at noon is resolved by actual lichun time", () => {
    const result = kusei.buildKuseiPromptPayload({ ...baseInput, birthDate: "1980-02-05" });
    const lichunMs = Date.parse(result.calculation.lichunAt.replace(" ", "T") + "+09:00");
    const birthMs = Date.parse("1980-02-05T12:00:00+09:00");

    expect(birthMs).toBeGreaterThan(lichunMs);
    expect(result.calculation.effectiveYear).toBe(1980);
  });

  test("1991-02-20 solar birth is after lichun", () => {
    const result = kusei.buildKuseiPromptPayload({ ...baseInput, birthDate: "1991-02-20" });

    expect(result.calculation.effectiveYear).toBe(1991);
    expect(result.calculation.honmeiStar.koreanName).toBe("구자화성");
  });

  test("solar-term boundary day warns when birth time is unknown", () => {
    const terms = kusei.getSolarTermsForYear(1991, "Asia/Seoul");
    const birthDate = terms.lichun.isoLocal.slice(0, 10);
    const result = kusei.buildKuseiPromptPayload({
      ...baseInput,
      birthDate,
      birthTimeKnown: false,
      birthHour: undefined,
      birthMinute: undefined,
    });

    expect(result.calculation.warnings.join(" ")).toContain("입춘 경계일");
    expect(result.calculation.dayStar).toBe("미산출");
    expect(result.calculation.hourStar).toBe("미산출");
  });

  test("solar-term boundary day uses time when provided", () => {
    const terms = kusei.getSolarTermsForYear(1991, "Asia/Seoul");
    const birthDate = terms.lichun.isoLocal.slice(0, 10);
    const result = kusei.buildKuseiPromptPayload({
      ...baseInput,
      birthDate,
      birthTimeKnown: true,
      birthHour: 23,
      birthMinute: 30,
    });

    expect(result.calculation.warnings.join(" ")).toContain("실제 절기 시각 기준");
    expect(result.calculation.effectiveYear).toBe(1991);
  });

  test("lunar input converts to solar and reflects leap-month flag", () => {
    const result = kusei.buildKuseiPromptPayload({
      ...baseInput,
      birthDate: "2020-04-01",
      calendarType: "lunar",
      isLeapMonth: true,
    });

    expect(result.calculation.solarBirthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.calculation.honmeiStar.koreanName).toBeTruthy();
    expect(result.prompt).toContain("음력 윤달");
  });

  test("prompt contains calculated stars, no placeholders, and uncalculated day/hour stars as missing", () => {
    const result = kusei.buildKuseiPromptPayload({ ...baseInput, birthDate: "1991-02-20" });

    expect(result.prompt).toContain(result.calculation.honmeiStar.koreanName);
    expect(result.prompt).toContain(result.calculation.getsumeiStar.koreanName);
    expect(result.prompt).not.toContain("{{");
    expect(result.prompt).toContain("일명성:\n미산출");
    expect(result.prompt).toContain("시명성:\n미산출");
  });

  test("free kusei modules do not connect to payment gates", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app", "fortune", "prompt-hub", "kusei-calc.ts"), "utf8");
    expect(source).not.toMatch(/결제|코인|월정석|billing|paid|gate/i);
  });
});
