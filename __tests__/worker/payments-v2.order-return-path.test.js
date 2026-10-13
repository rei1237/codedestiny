/**
 * @jest-environment node
 *
 * 주문 스냅샷의 returnPath — 클라이언트 입력이 형식·길이 제한 없이 pricingSnapshot 에 저장되던 것을
 * 사이트 내부 상대경로로 접는다(routes/payments.js sanitizeReturnPath 와 같은 규칙).
 */
import { normalizeOrderReturnPath } from "../../worker/payments/orders.js";

describe("normalizeOrderReturnPath", () => {
  test("사이트 내부 상대경로는 그대로 두고, 비어 있으면 비워 둔다", () => {
    expect(normalizeOrderReturnPath("/saju/result?tab=1#top")).toBe("/saju/result?tab=1#top");
    expect(normalizeOrderReturnPath("")).toBe("");
    expect(normalizeOrderReturnPath(undefined)).toBe("");
  });

  test("절대 URL 은 경로만 남기고, 외부로 나가는 형태는 '/' 로 접는다", () => {
    expect(normalizeOrderReturnPath("https://code-destiny.com/points?x=1")).toBe("/points?x=1");
    expect(normalizeOrderReturnPath("//evil.example/x")).toBe("/");
    expect(normalizeOrderReturnPath("/\\evil.example")).toBe("/");
    expect(normalizeOrderReturnPath("javascript:alert(1)")).toBe("/");
    expect(normalizeOrderReturnPath("relative/path")).toBe("/");
    expect(normalizeOrderReturnPath("/a\u0000b")).toBe("/");
    expect(normalizeOrderReturnPath({ toString: () => "//x" })).toBe("/");
  });

  test("700자를 넘는 값은 잘라 저장한다", () => {
    const out = normalizeOrderReturnPath(`/${"a".repeat(2000)}`);
    expect(out.startsWith("/aaa")).toBe(true);
    expect(out.length).toBe(700);
  });
});
