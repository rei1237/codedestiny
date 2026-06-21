/**
 * @jest-environment node
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const esbuild = require("esbuild");

let lite;
let bundledPath;

beforeAll(() => {
  const sourcePath = path.join(process.cwd(), "app", "fortune", "prompt-hub", "lite-prompt-tools.ts");
  bundledPath = path.join(os.tmpdir(), `lite-prompt-tools-${Date.now()}.cjs`);
  esbuild.buildSync({
    entryPoints: [sourcePath],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: bundledPath,
  });
  lite = require(bundledPath);
});

afterAll(() => {
  if (bundledPath && fs.existsSync(bundledPath)) fs.unlinkSync(bundledPath);
});

const baseInput = {
  name: "달빛",
  gender: "여자",
  birthDate: "1994-08-17",
  calendarType: "solar",
  birthTime: "09:20",
  timeUnknown: false,
  question: "앞으로 일과 관계에서 내가 조심해야 할 흐름은 무엇일까?",
  birthPlace: "서울",
  timezone: "Asia/Seoul",
  knownChartFacts: "",
  tone: "차분하고 현실적인 상담",
};

describe("Lite fortune prompt tools", () => {
  test("lite saju prompt includes local saju pillars", () => {
    const result = lite.buildLiteFortunePrompt({ ...baseInput, mode: "saju" });

    expect(result.prompt).toContain("사주 원국");
    expect(result.prompt).toContain("연주");
    expect(result.summaryCards.some((item) => item.label === "연주")).toBe(true);
  });

  test("lite sukuyo prompt calculates the natal mansion from lunar month and day", () => {
    const result = lite.buildLiteFortunePrompt({ ...baseInput, mode: "sukuyo" });

    expect(result.prompt).toContain("본명숙");
    expect(result.summaryCards.some((item) => item.label === "본명숙")).toBe(true);
  });

  test("lite astrology prompt keeps unavailable moon and rising signs as calculation-needed", () => {
    const result = lite.buildLiteFortunePrompt({ ...baseInput, mode: "astrology" });

    expect(result.prompt).toContain("태양궁");
    expect(result.prompt).toContain("달궁: 계산 필요");
    expect(result.prompt).toContain("상승궁: 계산 필요");
  });

  test("lite vedic prompt does not invent lagna, nakshatra, or dasha", () => {
    const result = lite.buildLiteFortunePrompt({
      ...baseInput,
      mode: "vedic",
      knownChartFacts: "금성이 강하다는 말을 들었습니다.",
    });

    expect(result.prompt).toContain("라그나: 계산 필요");
    expect(result.prompt).toContain("나크샤트라: 계산 필요");
    expect(result.prompt).toContain("다샤: 계산 필요");
    expect(result.prompt).toContain("금성이 강하다는 말을 들었습니다.");
  });

  test("free lite modules do not connect to payment gates", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app", "fortune", "prompt-hub", "lite-prompt-tools.ts"), "utf8");
    expect(source).not.toMatch(/결제|코인|월정석|billing|paid|gate/i);
  });
});
