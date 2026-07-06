/** lib/llm-text.js — LLM 표시 텍스트 유틸 단위 테스트. */
import { toDisplayText, endsWithSentence, looksLikeRawJson, extractReadableTextFromJsonLike } from "../../lib/llm-text.js";

describe("toDisplayText", () => {
  test("문자열/숫자는 그대로, null/undefined는 빈 문자열", () => {
    expect(toDisplayText("그대로")).toBe("그대로");
    expect(toDisplayText(3)).toBe("3");
    expect(toDisplayText(null)).toBe("");
    expect(toDisplayText(undefined)).toBe("");
  });

  test("객체는 잘 알려진 텍스트 키를 꺼내고 title과 결합한다", () => {
    expect(toDisplayText({ title: "제목", description: "본문이다." })).toBe("제목 — 본문이다.");
    expect(toDisplayText({ text: "본문만" })).toBe("본문만");
  });

  test("배열은 줄바꿈으로 합치고 중첩 객체도 평탄화한다", () => {
    expect(toDisplayText(["하나.", { text: "둘." }])).toBe("하나.\n둘.");
  });

  test("알 수 없는 키만 있는 객체는 값들을 합친다 (깊이 3 제한)", () => {
    expect(toDisplayText({ point: "직관", why: "빠르다" })).toBe("직관\n빠르다");
    const deep = { a: { b: { c: { d: "너무 깊다" } } } };
    expect(toDisplayText(deep)).not.toContain("[object Object]");
  });

  test("저장 단계에서 오염된 [object Object] 토큰을 제거한다", () => {
    expect(toDisplayText("[object Object]")).toBe("");
    expect(toDisplayText("앞 [object Object] 뒤")).toBe("앞 뒤");
  });
});

describe("endsWithSentence", () => {
  test.each(["행동한다.", "해보세요!", "괜찮아요", "그럴까?", "말했다.”"])("완결 문장: %s", (text) => {
    expect(endsWithSentence(text)).toBe(true);
  });
  test.each(["그래서 그", '{"a": "잘린', "이제 곧"])("잘린 문장: %s", (text) => {
    expect(endsWithSentence(text)).toBe(false);
  });
});

describe("looksLikeRawJson", () => {
  test("JSON/잘린 JSON/코드펜스는 true, 일반 프로즈는 false", () => {
    expect(looksLikeRawJson('{"sections": {')).toBe(true);
    expect(looksLikeRawJson("```json\n{}")).toBe(true);
    expect(looksLikeRawJson("올해는 흐름이 바뀐다.")).toBe(false);
  });
});

describe("extractReadableTextFromJsonLike", () => {
  test("잘린 JSON에서 한국어 문장 값만 복원한다", () => {
    const truncated = '{"title": "올해의 흐름", "body": "상반기에는 재물의 문이 열리고 하반기에는 관계가 중요해진다.", "keyword": "재물", "sections": [{"text": "지금은 무리하지 말고 기반을 다지는 시기';
    const salvaged = extractReadableTextFromJsonLike(truncated);
    expect(salvaged).toContain("상반기에는 재물의 문이 열리고");
    expect(salvaged).toContain("기반을 다지는 시기");
    expect(salvaged).not.toContain("{");
    expect(salvaged).not.toContain("sections");
  });
  test("복원할 문장이 없으면 빈 문자열", () => {
    expect(extractReadableTextFromJsonLike('{"a": 1, "b": "ok"}')).toBe("");
  });
});
