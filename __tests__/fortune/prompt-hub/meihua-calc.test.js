/**
 * @jest-environment node
 *
 * 실행 예시:
 * npx jest __tests__/fortune/prompt-hub/meihua-calc.test.js --testEnvironment node
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const esbuild = require("esbuild");

let meihua;
let bundledPath;

beforeAll(() => {
  const sourcePath = path.join(process.cwd(), "app", "fortune", "prompt-hub", "meihua-calc.ts");
  bundledPath = path.join(os.tmpdir(), `meihua-calc-${Date.now()}.cjs`);
  esbuild.buildSync({
    entryPoints: [sourcePath],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: bundledPath,
  });
  meihua = require(bundledPath);
});

afterAll(() => {
  if (bundledPath && fs.existsSync(bundledPath)) fs.unlinkSync(bundledPath);
});

describe("Meihua prompt hub calculation", () => {
  test("mod helpers normalize zero remainders", () => {
    expect(meihua.mod8(8)).toBe(8);
    expect(meihua.mod8(9)).toBe(1);
    expect(meihua.mod8(16)).toBe(8);
    expect(meihua.mod6(6)).toBe(6);
    expect(meihua.mod6(7)).toBe(1);
    expect(meihua.mod6(12)).toBe(6);
  });

  test("gua conversion follows the requested eight-gua map", () => {
    expect(meihua.getGuaByNumber(1).short).toBe("건");
    expect(meihua.getGuaByNumber(8).short).toBe("곤");
  });

  test("changed hexagram flips the moving line in the correct trigram", () => {
    const gun = meihua.getGuaByNumber(1);
    const changedFirst = meihua.calculateChangedHexagram(gun, gun, 1);
    const changedFourth = meihua.calculateChangedHexagram(gun, gun, 4);
    expect(changedFirst.lowerGua.short).toBe("손");
    expect(changedFirst.upperGua.short).toBe("건");
    expect(changedFourth.lowerGua.short).toBe("건");
    expect(changedFourth.upperGua.short).toBe("손");
  });

  test("mutual hexagram and body-use rules follow moving-line position", () => {
    const gun = meihua.getGuaByNumber(1);
    const mutual = meihua.calculateMutualHexagram(gun, gun);
    expect(mutual.lowerGua.short).toBe("건");
    expect(mutual.upperGua.short).toBe("건");

    const upper = meihua.getGuaByNumber(3);
    const lower = meihua.getGuaByNumber(6);
    expect(meihua.calculateBodyUse(upper, lower, 3)).toMatchObject({ bodyGua: upper, useGua: lower });
    expect(meihua.calculateBodyUse(upper, lower, 4)).toMatchObject({ bodyGua: lower, useGua: upper });
  });

  test("generated prompt includes calculated meihua values", () => {
    const result = meihua.calculateBasicMeihua({
      modeLabel: "매화역수 기본 해석",
      name: "테스트",
      gender: "",
      birthDate: "1994-08-17",
      birthTime: "09:20",
      calendarType: "양력",
      question: "지금 시작하려는 일이 나에게 맞는 흐름일까?",
      year: 1994,
      month: 8,
      day: 17,
      hour24: 14,
      minute: 30,
      baseDateTime: "2026-06-21 14:30",
    });
    const prompt = meihua.buildMeihuaPrompt(result);
    expect(prompt).toContain("[매화역수 계산 요약]");
    expect(prompt).toContain(result.mainHexagramName);
    expect(prompt).toContain(result.mutualHexagramName);
    expect(prompt).toContain(result.changedHexagramName);
    expect(prompt).toContain(result.bodyUseRelation);
  });

  test("free meihua UI segment does not connect to payment gates", () => {
    const pageSource = fs.readFileSync(path.join(process.cwd(), "app", "fortune", "prompt-hub", "page.tsx"), "utf8");
    const start = pageSource.indexOf("무료 매화역수 프롬프트 도구");
    const end = pageSource.indexOf("달빛 프롬프트 허브", start);
    const meihuaSegment = pageSource.slice(start, end);
    expect(meihuaSegment).not.toMatch(/결제|코인|월정석|billing|paid|gate/i);
  });
});
