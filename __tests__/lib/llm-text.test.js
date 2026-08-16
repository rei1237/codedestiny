/** lib/llm-text.js — LLM 표시 텍스트 유틸 단위 테스트. */
import {
  toDisplayText,
  endsWithSentence,
  looksLikeRawJson,
  extractReadableTextFromJsonLike,
  splitIntoParagraphs,
  trimToSentenceBoundary,
  dedupeTextList,
  salvageTruncatedJsonObject,
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

  test("내용이 공백뿐인 빈 괄호를 앞 가로공백까지 함께 제거한다", () => {
    expect(toDisplayText("명궁(　)을 통해")).toBe("명궁을 통해"); // 전각공백 U+3000
    expect(toDisplayText("삼방사정(　　　)의 흐름")).toBe("삼방사정의 흐름");
    expect(toDisplayText("대운( )과 세운()을")).toBe("대운과 세운을"); // 반각공백/무공백
    expect(toDisplayText("명궁 (　) 을")).toBe("명궁 을"); // 괄호 앞 공백 제거, 뒤 공백 유지
    expect(toDisplayText("재백궁（　）으로")).toBe("재백궁으로"); // 전각 괄호
  });

  test("내용이 있는 괄호·수식·이모티콘은 보존한다", () => {
    expect(toDisplayText("자미(紫微)가 놓인")).toBe("자미(紫微)가 놓인");
    expect(toDisplayText("1순위(1)와 (중요) 항목")).toBe("1순위(1)와 (중요) 항목");
    expect(toDisplayText("웃음 :) 표정")).toBe("웃음 :) 표정");
    expect(toDisplayText("계산 (a+b) 결과")).toBe("계산 (a+b) 결과");
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

describe("trimToSentenceBoundary", () => {
  test("상한 이하면 원문 그대로", () => {
    expect(trimToSentenceBoundary("짧은 문장이다.", 100)).toBe("짧은 문장이다.");
    expect(trimToSentenceBoundary("상한이 0이면 무시한다.", 0)).toBe("상한이 0이면 무시한다.");
  });

  test("상한을 넘으면 마지막 완결 문장까지만 남기고 끊긴 문장을 버린다", () => {
    const text = "첫 문장이다. 둘째 문장이다. 셋째 문장은 상한을 넘겨서 여기서 잘린다.";
    const trimmed = trimToSentenceBoundary(text, 30);
    expect(trimmed).toBe("첫 문장이다. 둘째 문장이다.");
    expect(endsWithSentence(trimmed)).toBe(true);
    expect(trimmed.length).toBeLessThanOrEqual(30);
  });

  test("전각 종결부호(ja/zh)도 문장 경계로 인정한다", () => {
    const trimmed = trimToSentenceBoundary("最初の文です。次の文です。三番目はここで切れます。", 14);
    expect(trimmed).toBe("最初の文です。次の文です。");
  });

  test("소수점을 문장 끝으로 오인해 거기서 자르지 않는다", () => {
    // 상한이 "3.5" 한복판에 떨어져도 그 마침표를 완결 문장으로 취급하면 안 된다.
    // 완결 문장이 없으므로 말줄임표 경로로 떨어지는 것이 정답이다.
    const trimmed = trimToSentenceBoundary("작년 대비 3.5배 성장한 흐름이다.", 9);
    expect(trimmed.endsWith("…")).toBe(true);
    expect(trimmed).not.toBe("작년 대비 3.");
  });

  test("상한보다 긴 단일 문장은 절 경계까지 자르고 말줄임표를 붙인다", () => {
    const trimmed = trimToSentenceBoundary("돈이 새는 자리를 먼저 막고, 그다음에 버는 통로를 넓혀야 흐름이 돌아온다", 20);
    expect(trimmed).toBe("돈이 새는 자리를 먼저 막고,…");
    expect(trimmed.length).toBeLessThanOrEqual(20);
  });

  test("절 경계도 없으면 말줄임표만 붙인다 — 결과가 비지 않는다", () => {
    const trimmed = trimToSentenceBoundary("가".repeat(50), 10);
    expect(trimmed).toBe(`${"가".repeat(9)}…`);
    expect(trimmed.length).toBe(10);
  });

  test("null/undefined 에 throw 하지 않는다", () => {
    expect(trimToSentenceBoundary(null, 10)).toBe("");
    expect(trimToSentenceBoundary(undefined, 10)).toBe("");
  });
});

describe("dedupeTextList", () => {
  test("완전히 같은 항목은 앞의 것만 남긴다", () => {
    expect(dedupeTextList(["작전 A", "작전 B", "작전 A"])).toEqual(["작전 A", "작전 B"]);
  });

  test("공백·구두점만 다른 항목도 같은 것으로 본다", () => {
    expect(dedupeTextList(["오늘은 쉬어라.", "오늘은  쉬어라"])).toEqual(["오늘은 쉬어라."]);
  });

  test("의미가 다른 반복은 남긴다", () => {
    expect(dedupeTextList(["돈을 아껴라", "돈을 벌어라"])).toHaveLength(2);
  });

  test("구두점뿐인 항목을 조용히 버리지 않는다", () => {
    expect(dedupeTextList(["…", "!!"])).toEqual(["…", "!!"]);
  });

  test("배열이 아니면 빈 배열", () => {
    expect(dedupeTextList(null)).toEqual([]);
  });
});

describe("salvageTruncatedJsonObject", () => {
  test("문자열 한복판에서 잘린 JSON 을 완결 값 경계까지 복구한다", () => {
    const truncated = '{"title":"제목이다","body":"본문이다","tail":"여기서 잘린';
    expect(salvageTruncatedJsonObject(truncated)).toEqual({ title: "제목이다", body: "본문이다" });
  });

  test("열린 배열/객체를 닫아 복구한다", () => {
    const truncated = '{"items":[{"a":"1"},{"a":"2"}';
    expect(salvageTruncatedJsonObject(truncated)).toEqual({ items: [{ a: "1" }, { a: "2" }] });
  });

  test("코드펜스를 벗기고 온전한 JSON 도 그대로 돌려준다", () => {
    expect(salvageTruncatedJsonObject('```json\n{"a":"b"}\n```')).toEqual({ a: "b" });
  });

  test("객체가 아예 없으면 null", () => {
    expect(salvageTruncatedJsonObject("설명만 있고 JSON 이 없다")).toBeNull();
    expect(salvageTruncatedJsonObject("")).toBeNull();
  });
});
