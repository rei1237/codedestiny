/** @jest-environment node */
import { jest } from "@jest/globals";
import { hasRepeatedReportPassage } from "../../worker/lib/paid-report-quality.js";
import { assertCodexChapterQuality, codexChapterFloor, dedupeCodexBody, qualityCheckedCodexCache, generateCodexChapterResponse, buildCodexChapterMemory, buildCodexEditorialContract, buildCodexStagingChapter, parseChapterJson } from "../../worker/lib/master-love-codex-quality.js";
import { __masterLoveCodexTestUtils as utils } from "../../worker/routes/master-love-codex.js";

const fixture = chapter => ({
  body: "명식의 기질을 일상에서 확인하고 대화의 속도를 함께 조절해 보세요. ".repeat(Math.ceil(chapter.minChars / 35)),
  narration: "이번 장의 도입", evidence: [{ label: "일간", system: "사주", explanation: "기본 기질을 읽는 근거" }],
  insight: "구체적 일상 장면", keySentence: "핵심 요약", caution: "갈등이 커지는 조건",
  actions: ["대화할 시간을 합의해 보세요.", "기대한 행동을 구체적으로 말해 보세요."], bridge: "다음 장의 주제",
});

test("codex rejects unsupported calendar inputs before normalizing them", () => {
  const birthInfo = { birthDate: "1990-05-12", birthTime: "09:30", gender: "female", calendarType: "solar" };
  expect(utils.normalizeInput({ birthInfo }).ok).toBe(true);
  for (const change of [{ calendarType: "julian" }, { birthDate: "1990-05-12junk" }, { isLeapMonth: true }]) {
    expect(utils.normalizeInput({ birthInfo: { ...birthInfo, ...change } }).ok).toBe(false);
    expect(utils.normalizeInput({ birthInfo, partnerInfo: { ...birthInfo, ...change } }).ok).toBe(false);
  }
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

test("a measured-length chapter (76% of minChars) is delivered, not failed at 0/20", () => {
  const chapter = utils.resolveMode("solo").chapters[0];
  const body = "가".repeat(Math.ceil(chapter.minChars * 0.76));
  expect(codexChapterFloor(chapter)).toBe(Math.ceil(chapter.minChars * 0.7));
  expect(() => assertCodexChapterQuality({ ...fixture(chapter), body }, chapter)).not.toThrow();
  expect(() => assertCodexChapterQuality({ ...fixture(chapter), body: "가".repeat(codexChapterFloor(chapter) - 1) }, chapter)).toThrow("LLM_OUTPUT_TOO_SHORT");
});

test("sentences an earlier chapter already delivered are cut from the new chapter", () => {
  const shared = "두 사람은 서로의 속도를 확인하는 대화를 통해 관계의 온도를 맞춰 갑니다.";
  const fresh = "이번 장에서는 새로운 생활 장면을 바탕으로 선택 가능한 대응을 구체적으로 살펴봅니다.";
  const deduped = dedupeCodexBody(`## 소제목\n${shared} ${fresh}\n\n${fresh}`, [`앞 장 원고입니다. ${shared}`]);
  expect(deduped).toBe(`## 소제목\n${fresh}`);
  expect(hasRepeatedReportPassage(`앞 장 원고입니다. ${shared}\n${deduped}`)).toBe(false);
});

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

test.each(["solo", "compat"])("%s structured chapters recover provider wrappers and raw control characters", async mode => {
  const chapter = utils.resolveMode(mode).chapters[0];
  const parsed = { ...fixture(chapter), body: `${fixture(chapter).body}\n두 번째 문단\t행동 기준` };
  const json = JSON.stringify(parsed);
  const wrapped = `완성 원고입니다.\n\`\`\`json\n${json}\n\`\`\`\n이상입니다.`;
  const wrappedWithBraces = `응답 메타 {초안 아님}\n\`\`\`json\n${json}\n\`\`\`\n후기 {완료}`;
  const rawControls = json.replace("\\n", "\n").replace("\\t", "\t");

  expect(parseChapterJson(wrapped)).toEqual(parsed);
  expect(parseChapterJson(wrappedWithBraces)).toEqual(parsed);
  expect(parseChapterJson(rawControls)).toEqual(parsed);
  const call = jest.fn().mockResolvedValue({ text: rawControls });
  expect((await generateCodexChapterResponse(call, "prompt", { chapter })).parsed).toEqual(parsed);
  expect(call).toHaveBeenCalledTimes(1);
});

test("truncated JSON is not repaired into a completed chapter", () => {
  expect(() => parseChapterJson('{"body":"완성되지 않은 원고"')).toThrow("LLM_JSON_INVALID");
});

test("truncated provider responses remain retryable failures", async () => {
  const chapter = utils.resolveMode("solo").chapters[0];
  const call = jest.fn().mockResolvedValue({ text: JSON.stringify(fixture(chapter)), truncated: true });
  await expect(generateCodexChapterResponse(call, "prompt", { chapter })).rejects.toThrow("LLM_OUTPUT_TRUNCATED");
  expect(call).toHaveBeenCalledTimes(2);
});

test("chapter cache accepts repairable JSON but still rejects incomplete content", async () => {
  const chapter = utils.resolveMode("solo").chapters[0];
  const complete = { ...fixture(chapter), body: `${fixture(chapter).body}\n이어지는 문단` };
  const repairable = { text: JSON.stringify(complete).replace("\\n", "\n") };
  const incomplete = { text: JSON.stringify({ ...complete, actions: [] }) };
  const store = { get: jest.fn().mockResolvedValueOnce(repairable).mockResolvedValueOnce(incomplete), set: jest.fn() };
  const cache = qualityCheckedCodexCache(store, value => assertCodexChapterQuality(parseChapterJson(value.text), chapter));

  expect(await cache.get("repairable")).toEqual(repairable);
  expect(await cache.get("incomplete")).toBeNull();
  await cache.set("incomplete", incomplete, 100);
  expect(store.set).not.toHaveBeenCalled();
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

test("paid delivery can limit structured generation to one provider call", async () => {
  const chapter = utils.resolveMode("solo").chapters[0];
  const call = jest.fn().mockResolvedValue({ text: '{}' });
  await expect(generateCodexChapterResponse(call, "prompt", { chapter, maxAttempts: 1 })).rejects.toThrow("LLM_OUTPUT_TOO_SHORT");
  expect(call).toHaveBeenCalledTimes(1);
});

test("provider outage preserves its cause instead of consuming manuscript repairs", async () => {
  const chapter = utils.resolveMode("solo").chapters[0];
  const call = jest.fn().mockResolvedValue({ ok: false, status: 429, error: "llm_failed", message: "overloaded" });
  await expect(generateCodexChapterResponse(call, "prompt", { chapter })).rejects.toMatchObject({ code: "LLM_PROVIDER_UNAVAILABLE", status: 429, retryable: true });
  expect(call).toHaveBeenCalledTimes(1);
});

test.each([["LLM_OUTPUT_TRUNCATED", 11000], ["LLM_EVIDENCE_INVALID", 8000], ["LLM_JSON_INVALID", 8000]])("persisted %s corrects the next wave using %i tokens", async (previousError, tokens) => {
  const chapter = utils.resolveMode("solo").chapters[0];
  const call = jest.fn().mockResolvedValue({ text: JSON.stringify(fixture(chapter)) });
  await generateCodexChapterResponse(call, "prompt", { chapter, previousError, maxAttempts: 1 });
  expect(call).toHaveBeenCalledTimes(1);
  expect(call.mock.calls[0][0]).toContain(previousError);
  expect(call.mock.calls[0][1]).toMatchObject({ attempts: 1, maxProviderAttempts: 1, baseTokens: tokens });
});
