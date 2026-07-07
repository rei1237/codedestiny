/** lib/llm-text.js — LLM 표시 텍스트 유틸 단위 테스트. */
import {
  toDisplayText,
  endsWithSentence,
  looksLikeRawJson,
  extractReadableTextFromJsonLike,
  splitIntoParagraphs,
} from "../../lib/llm-text.js";

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

describe("splitIntoParagraphs", () => {
  test("개행 없는 장문을 2~4문장 문단으로 나누고 내용을 보존한다", () => {
    const sentence = "너는 돈을 버는 방식과 쓰는 방식이 어긋나 있어서 재물 운용에 반복적인 실책을 만들고 있다.";
    const longProse = Array.from({ length: 10 }, (_, i) => `${i + 1}번째. ${sentence}`).join(" ");
    const paragraphs = splitIntoParagraphs(longProse);
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);
    for (const para of paragraphs) {
      const sentenceCount = (para.match(/\./g) || []).length;
      expect(sentenceCount).toBeGreaterThanOrEqual(2);
      expect(sentenceCount).toBeLessThanOrEqual(8); // "n번째." + 본문 → 문단당 최대 4문장 쌍
    }
    expect(paragraphs.join(" ")).toBe(longProse);
  });

  test("기존 개행은 하드 문단 경계로 유지한다", () => {
    expect(splitIntoParagraphs("첫 문단이다.\n\n둘째 문단이다.")).toEqual(["첫 문단이다.", "둘째 문단이다."]);
  });

  test("짧은 텍스트(2문장 이하)는 그대로 1개 문단", () => {
    expect(splitIntoParagraphs("짧다. 그래도 하나다.")).toEqual(["짧다. 그래도 하나다."]);
  });

  test("소수점/공백 없는 인용부호에서는 분리하지 않는다", () => {
    const text = `확률은 3.5할이다. ${"긴 문장을 채우기 위한 말이다. ".repeat(8)}“버텨라.”라고 말했다.`;
    const paragraphs = splitIntoParagraphs(text);
    expect(paragraphs.some((para) => para.includes("3.5할이다."))).toBe(true);
    expect(paragraphs.some((para) => para.includes("“버텨라.”라고 말했다."))).toBe(true);
    expect(paragraphs.join(" ")).not.toContain("3. 5");
  });

  test("null/객체 입력 방어", () => {
    expect(splitIntoParagraphs(null)).toEqual([]);
    expect(splitIntoParagraphs("")).toEqual([]);
    expect(splitIntoParagraphs({ text: "본문이다." })).toEqual(["본문이다."]);
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
