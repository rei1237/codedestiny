/** @jest-environment node */
// 2026-11-08 ziwei-deep 판 2 실호출: 15장 모두 **굵게** 별표가 화면·PDF에 그대로 보였고, 2장은 본문 첫 줄에 장 제목을 되풀이했다.
import { tidyZiweiDeepBody } from "../../worker/lib/ziwei-deep-delivery-v2.js";

const chapter = { id: "wealth", title: "제6장 · 돈을 어떻게 벌고 지켜야 할까요?" };

it("strips markdown bold markers but keeps the words", () => {
  expect(tidyZiweiDeepBody("1.  **'질문하는 대화'를 연습해 보세요.** 평소 대화에서", chapter))
    .toBe("1.  '질문하는 대화'를 연습해 보세요. 평소 대화에서");
  expect(tidyZiweiDeepBody("남은 ** 표식", chapter)).toBe("남은  표식");
});

it("drops a leading echo of the chapter title only", () => {
  const body = "제6장 · 돈을 어떻게 벌고 지켜야 할까요?\n\n● 돈을 어떻게 벌고 지켜야 할까요?\n본문입니다.";
  expect(tidyZiweiDeepBody(body, chapter)).toBe("● 돈을 어떻게 벌고 지켜야 할까요?\n본문입니다.");
  expect(tidyZiweiDeepBody("제14장 · 다른 제목\n본문", chapter)).toBe("본문");
});

it("leaves ordinary bodies untouched", () => {
  const body = "● 타고난 본성\n내담자님은 제6장에서 말한 것처럼 신중합니다.";
  expect(tidyZiweiDeepBody(body, chapter)).toBe(body);
  expect(tidyZiweiDeepBody("", chapter)).toBe("");
});
