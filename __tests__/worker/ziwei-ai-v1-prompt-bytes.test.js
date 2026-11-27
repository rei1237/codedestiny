/** @jest-environment node */
// 2026-11-08 판 2 도입 뒤에도 판 1(값 없는 진행 중 상담)이 받는 프롬프트 바이트는 그대로여야 한다. 모킹 없이 실제 빌더를 해시한다.
import { __ziweiAiTestUtils as utils } from "../../worker/routes/ziwei-ai.js";
const QUESTION = "올해 이직을 해도 될까요?";
const fixtureChart = { palaces: [{ name: "명궁", mainStars: ["자미"], earthlyBranch: "자", brightness: { 자미: "묘" } }, { name: "부부궁", mainStars: ["태양"], earthlyBranch: "오" }], bodyPalace: "부부궁", fourTransformations: {}, yearlyLuck: { year: 2026 } };
const input = { birthInfo: { name: "검사", gender: "female", birthDate: "1993-07-21", birthTime: "09:00", calendarType: "solar" }, topic: "전체 명반 해석", focusArea: "overall", userQuestion: QUESTION };

it("V1 prompt bytes stay identical for in-flight sessions", async () => {
  const { createHash } = await import("node:crypto");
  const sha = text => createHash("sha256").update(String(text)).digest("hex");
  const hashes = Object.fromEntries(utils.SECTION_GROUP_SPECS.map(group => [group.id, sha(utils.buildSectionGroupPrompt(input, fixtureChart, group))]));
  expect({ ...hashes, meta: sha(utils.buildMetaPrompt(input, fixtureChart)), first: sha(utils.buildFirstPrompt(input, fixtureChart)), system: sha(utils.buildSystemPrompt()) }).toEqual({
    foundation: "b8cedfac12cc52c579fa82ed75f12ae72d0191840d2cfa9f6e92b7cff4b56ab0", essence: "86e449b461df1e19cc9d23e4dd05e0789e36815ab9dd12a69c7c1f1a259cbcf8",
    flow: "c11868c96633f9f592aeb3809ac8be49b08ebd131a87f382536385cd2bd244b8", achievement: "e1e791fc10706d55502f619747f3509cc7892cf01812a01b03631dfb082748de",
    relation: "7c4d618c41e988fea31e94365d236db063ee59de2bb7254f45c325486f365278", closing: "e23dd58c38826f5fa9cd40269d12b91d62498b3fbd7a1898b84dd43113ce941a",
    meta: "67577aeec413a75b56b5055b66e348e0cd3005e8c778cd2ba4d6e24e00f6cbba", first: "819dc8de559b7235314696cd9c8d3e5f86b28181eb1d4b150ec5a71e00c12e61",
    system: "c70722fd3ef7ef3cba887a48880eef255b989c12c408cc234cbd7a39f6bc0427",
  });
});

// 액땜(R8): 블록은 처방(prescription) 묶음에만 한 번 붙고, 비우면 판 1·판 2 모두 바이트가 그대로다.
it("remedy block lands once in the prescription group only, empty keeps bytes", () => {
  const block = "[액땜 방법 — 서버 계산. 이 목록 밖의 액땜 방법은 쓰지 않는다]\n- 검사 줄";
  let placed = 0;
  for (const [specs, plan] of [[utils.SECTION_GROUP_SPECS, null], [utils.ZIWEI_V2_GROUP_SPECS, utils.ZIWEI_V2_PLAN]]) {
    for (const group of specs) {
      const off = utils.buildSectionGroupPrompt(input, fixtureChart, group, plan);
      expect(utils.buildSectionGroupPrompt(input, fixtureChart, group, plan, { remedyFacts: "" })).toBe(off);
      const on = utils.buildSectionGroupPrompt(input, fixtureChart, group, plan, { remedyFacts: block });
      if (!group.sections.includes("prescription")) { expect(on).toBe(off); continue; }
      placed += 1;
      expect(on.split(block).length - 1).toBe(1);
      expect(on.length - off.length).toBe(block.length + 1);
    }
  }
  expect(placed).toBe(2);
});

it("remedy cases and block fail closed, stay Korean-only and within 500 chars", async () => {
  const { calculateZiweiAiChart } = await import("../../worker/lib/ziwei-ai-chart.js");
  const birthInfo = { name: "검사", gender: "female", birthDate: "1990-01-01", birthTime: "12:00", birthTimeUnknown: false, calendarType: "solar", isLeapMonth: false };
  const chart = calculateZiweiAiChart({ birthInfo, topic: "전체 명반 해석", focusArea: "overall", userQuestion: QUESTION }, { year: 2026 });
  const cases = utils.ziweiRemedyCases(chart, "ko");
  expect(cases).toMatchObject({ version: "remedy-v1", valid: true, locale: "ko" });
  expect(cases.cases.length).toBeGreaterThan(0);
  const block = utils.ziweiRemedyBlock(cases);
  expect(block.startsWith("[액땜 방법")).toBe(true);
  expect(block).toContain("액땜 방법은 블록 목록에서 고르고, 풍속은 소개로만 쓴다.");
  expect(block.length).toBeLessThanOrEqual(utils.ZIWEI_REMEDY_MAX_CHARS);
  expect(utils.ziweiRemedyCases(chart, "ja")).toBeNull();
  expect(utils.ziweiRemedyCases(null, "ko")).toBeNull();
  for (const bad of [null, undefined, "x", { ...cases, valid: false }, { ...cases, locale: "ja" }]) expect(utils.ziweiRemedyBlock(bad)).toBe("");
  const build = (remedy) => ["본문", remedy].filter(Boolean).join("\n");
  expect(utils.ziweiPromptWithinRemedyBudget("s", build, block)).toBe(build(block));
  expect(utils.ziweiPromptWithinRemedyBudget("s".repeat(utils.ZIWEI_REMEDY_PROMPT_BUDGET), build, block)).toBe(build(""));
  expect(utils.ziweiPromptWithinRemedyBudget("s".repeat(utils.ZIWEI_REMEDY_PROMPT_BUDGET), build, "")).toBe(build(""));
});
