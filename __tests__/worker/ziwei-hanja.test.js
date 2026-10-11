import { annotateZiweiHanja, applyZiweiHanjaToStructuredText } from "../../worker/lib/ziwei-hanja.js";

describe("applyZiweiHanjaToStructuredText", () => {
  it("turns HTML line breaks in section bodies into paragraphs", () => {
    const text = JSON.stringify({ sections: { career: { title: "일<br>흐름", body: "**연애**<br><br>현재 흐름: 차분합니다.<br/>다음 줄입니다." } } });
    const { sections } = JSON.parse(applyZiweiHanjaToStructuredText(text));
    expect(sections.career.body).toBe("**연애**\n\n현재 흐름: 차분합니다.\n다음 줄입니다.");
    expect(sections.career.title).toBe("일 흐름");
  });
});

describe("annotateZiweiHanja", () => {
  // R6 2026-10-10: "환경에 대한(大限)", "문창이 함지(咸池)에 있" — 일상어와 강약 표기를 성요 용어로 잘못 병기했다.
  it("leaves ordinary words that spell like ziwei terms", () => {
    const text = "직업 환경에 대한 고민입니다. 계획을 세운 뒤 유년 시절을 돌아보고 영성적인 시간을 가지세요.";
    expect(annotateZiweiHanja(text)).toBe(text);
  });

  it("annotates the first real term after a skipped homograph", () => {
    expect(annotateZiweiHanja("환경에 대한 고민은 현재 대한의 흐름과 이어집니다."))
      .toBe("환경에 대한 고민은 현재 대한(大限)의 흐름과 이어집니다.");
  });

  it("marks a star sitting in 함지 as the weak position, not the 咸池 star", () => {
    const seen = new Set();
    expect(annotateZiweiHanja("문창이 함지에 있어 표현이 막힙니다.", seen)).toContain("함지(陷地)에 있어");
    expect(annotateZiweiHanja("부부궁의 함지는 매력을 뜻합니다.", seen)).toContain("함지(咸池)는");
  });
});
