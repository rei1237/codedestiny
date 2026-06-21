/**
 * @jest-environment node
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const esbuild = require("esbuild");

let psych;
let bundledPath;

beforeAll(() => {
  const sourcePath = path.join(process.cwd(), "app", "fortune", "prompt-hub", "psych-prompt-tools.ts");
  bundledPath = path.join(os.tmpdir(), `psych-prompt-tools-${Date.now()}.cjs`);
  esbuild.buildSync({
    entryPoints: [sourcePath],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: bundledPath,
  });
  psych = require(bundledPath);
});

afterAll(() => {
  if (bundledPath && fs.existsSync(bundledPath)) fs.unlinkSync(bundledPath);
});

function answersFor(testId, optionId) {
  const test = psych.PSYCH_PROMPT_TESTS.find((item) => item.id === testId);
  return Object.fromEntries(test.questions.map((question) => [question.id, optionId]));
}

describe("Psych prompt tools", () => {
  test("relationship test scores selected answers and returns dominant archetype", () => {
    const result = psych.scorePsychTest(
      "relationship",
      answersFor("relationship", "b"),
      "상대의 마음을 더 차분하게 보고 싶어요.",
    );

    expect(result.dominant.label).toBe("깊이 몰입형");
    expect(result.answerSummaries).toHaveLength(5);
    expect(result.scores.find((item) => item.label === "깊이 몰입형").score).toBe(5);
  });

  test("incomplete answers stop prompt generation", () => {
    expect(() => psych.scorePsychTest("career", { c1: "a" }, "")).toThrow("아직 답하지 않은 문항");
  });

  test("prompt includes calculated result and leaves no placeholders", () => {
    const result = psych.scorePsychTest("emotion", answersFor("emotion", "c"), "혼자 회복하는 시간이 너무 길어질 때가 있어요.");
    const prompt = psych.buildPsychPrompt(result);

    expect(prompt).toContain("혼자 재정렬형");
    expect(prompt).toContain("문항별 응답 기록");
    expect(prompt).toContain("혼자 회복하는 시간이 너무 길어질 때가 있어요.");
    expect(prompt).not.toContain("{{");
  });

  test("prompt keeps psychological test as non-diagnostic guidance", () => {
    const result = psych.scorePsychTest("decision", answersFor("decision", "a"), "");
    const prompt = psych.buildPsychPrompt(result);

    expect(prompt).toContain("의학적 진단");
    expect(prompt).toContain("전문가 검토");
  });

  test("free psych module does not connect to payment gates", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app", "fortune", "prompt-hub", "psych-prompt-tools.ts"), "utf8");
    expect(source).not.toMatch(/결제|코인|월정석|billing|paid|gate/i);
  });
});
