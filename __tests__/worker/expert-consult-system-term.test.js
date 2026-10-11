/** @jest-environment node */

// R6·R7·R8 실호출(2026-10-10): 넓은 /시스템/g 치환이 "면역 시스템"·"보상 시스템" 같은 정상 문장을 깨뜨렸다.
it("strips only system-instruction leaks and keeps ordinary 시스템 prose", async () => {
  const { __ziweiAiTestUtils: ziwei } = await import("../../worker/routes/ziwei-ai.js");
  const { __astrologyAiTestUtils: astrology } = await import("../../worker/routes/astrology-ai.js");
  const { __vedicAiTestUtils: vedic } = await import("../../worker/routes/vedic-ai.js");
  const text = "면역 시스템을 돌보세요. 시스템 지시에 따라 작성했습니다.";
  for (const out of [ziwei.cleanForbiddenResult(text), astrology.sanitizeConsultationText(text), vedic.sanitizeAssistantText(text)]) {
    expect(out).toContain("면역 시스템을 돌보세요.");
    expect(out).not.toMatch(/시스템\s*지시/);
  }
});
