/** @jest-environment node */
import { jest } from "@jest/globals";
import { assertCodexChapterQuality, qualityCheckedCodexCache, generateCodexChapterResponse, buildCodexChapterMemory, buildCodexEditorialContract, buildCodexStagingChapter } from "../../worker/lib/master-love-codex-quality.js";
import { __masterLoveCodexTestUtils as utils } from "../../worker/routes/master-love-codex.js";

const fixture = chapter => ({
  body: "명식의 기질을 일상에서 확인하고 대화의 속도를 함께 조절해 보세요. ".repeat(Math.ceil(chapter.minChars / 35)),
  narration: "이번 장의 도입", evidence: [{ label: "일간", system: "사주", explanation: "기본 기질을 읽는 근거" }],
  insight: "구체적 일상 장면", keySentence: "핵심 요약", caution: "갈등이 커지는 조건",
  actions: ["대화할 시간을 합의해 보세요.", "기대한 행동을 구체적으로 말해 보세요."], bridge: "다음 장의 주제",
});

for (const mode of ["solo", "compat"]) {
  const def = utils.resolveMode(mode);
  test(`${mode} staging book keeps the complete result contract with explicit fixture labels`, () => {
    for (const chapter of def.chapters) {
      const parsed = buildCodexStagingChapter(chapter, def.dnaMetrics);
      expect(() => assertCodexChapterQuality(parsed, chapter, def.dnaMetrics)).not.toThrow();
      expect(parsed.body).toContain("실제 상담 해석이 아닙니다");
      expect(parsed.keySentence).toContain("스테이징 fixture");
    }
  });
  test.each(def.chapters)(`${mode} $id accepts its complete contract and rejects short content`, chapter => {
    const parsed = { ...fixture(chapter), typeName: "차분한 관계형", typeSummary: "관계를 조율하는 방식",
      metrics: def.dnaMetrics.map(({ key }) => ({ key, score: 50, basis: "제공된 명식의 기질에 따른 해석" })) };
    expect(() => assertCodexChapterQuality(parsed, chapter, def.dnaMetrics)).not.toThrow();
    expect(() => assertCodexChapterQuality({ ...parsed, body: "짧은 상담".repeat(50) }, chapter, def.dnaMetrics)).toThrow("LLM_OUTPUT_TOO_SHORT");
    expect(() => assertCodexChapterQuality({ ...parsed, actions: [] }, chapter, def.dnaMetrics)).toThrow("LLM_OUTPUT_INCOMPLETE");
    if (chapter.jsonMode) {
      expect(() => assertCodexChapterQuality({ ...parsed, metrics: [] }, chapter, def.dnaMetrics)).toThrow("LLM_DNA_INCOMPLETE");
      expect(() => assertCodexChapterQuality({ ...parsed, metrics: parsed.metrics.map(item => ({ ...item, score: 101 })) }, chapter, def.dnaMetrics)).toThrow("LLM_DNA_INCOMPLETE");
    }
  });
}

test("rejected cached response cannot make every purchased retry fail", async () => {
  const chapter = utils.resolveMode("solo").chapters[0];
  const invalid = { text: JSON.stringify({ body: "short" }) };
  const valid = { text: JSON.stringify(fixture(chapter)) };
  const store = { get: jest.fn().mockResolvedValueOnce(invalid).mockResolvedValueOnce(valid), set: jest.fn() };
  const cache = qualityCheckedCodexCache(store, value => assertCodexChapterQuality(JSON.parse(value.text), chapter));
  expect(await cache.get("key")).toBeNull();
  expect(await cache.get("key")).toEqual(valid);
  await cache.set("key", invalid, 100);
  expect(store.set).not.toHaveBeenCalled();
  await cache.set("key", valid, 100);
  expect(store.set).toHaveBeenCalledWith("key", valid, 100);
});

test("malformed partner date cannot silently become a solo purchase", () => {
  const birthInfo = { birthDate: "1990-01-02", gender: "female", birthTime: "12:00" };
  expect(utils.normalizeInput({ birthInfo, partnerInfo: { birthDate: "invalid" } }).ok).toBe(false);
  expect(utils.normalizeInput({ birthInfo }).mode).toBe("solo");
  expect(utils.normalizeInput({ birthInfo, partnerInfo: { birthDate: "1991-02-03" } }).mode).toBe("compat");
});

test.each(['{"body":', '{"body":"short"}'])("invalid response receives one bounded repair: %s", async text => {
  const chapter = utils.resolveMode("solo").chapters[0];
  const parsed = fixture(chapter);
  const call = jest.fn().mockResolvedValueOnce({ text }).mockResolvedValueOnce({ text: JSON.stringify(parsed) });
  expect((await generateCodexChapterResponse(call, "prompt", { chapter })).parsed).toEqual(parsed);
  expect(call).toHaveBeenCalledTimes(2);
  expect(call.mock.calls[1][0]).toContain("재작성");
});

test("quality repair stops at two attempts and never starts after the deadline", async () => {
  const chapter = utils.resolveMode("solo").chapters[0];
  const call = jest.fn().mockResolvedValue({ text: '{}' });
  await expect(generateCodexChapterResponse(call, "prompt", { chapter })).rejects.toThrow("LLM_OUTPUT_TOO_SHORT");
  expect(call).toHaveBeenCalledTimes(2);
  call.mockClear();
  await expect(generateCodexChapterResponse(call, "prompt", { chapter, deadlineAt: Date.now() - 1 })).rejects.toThrow("GENERATION_BUDGET_EXCEEDED");
  expect(call).not.toHaveBeenCalled();
});

test("chapter memory carries a conclusion instead of repeating a heading", () => {
  expect(buildCodexChapterMemory([
    { title: "첫 장", body: "## 제목\n\n본문의 결론", content: { keySentence: "실제로 전달한 핵심" } },
    { title: "구버전", body: "## 제목\n● 다른 제목\n\n기존 본문의 결론" },
  ])).toEqual(["첫 장: 실제로 전달한 핵심", "구버전: 기존 본문의 결론"]);
});

test("compatibility prompt preserves the calculated direction without modifying scores", () => {
  const compatibility = { cross: { convergence: [{ theme: "끌림의 세기", sajuBand: "low", ziweiBand: "low" }] } };
  const before = JSON.stringify(compatibility);
  expect(buildCodexEditorialContract({ minChars: 2600 }, compatibility)).toContain("끌림의 세기: 사주 낮음, 명반 낮음");
  expect(JSON.stringify(compatibility)).toBe(before);
});
