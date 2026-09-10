/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import {
  __relationshipBoundaryTestTestUtils,
  handleRelationshipBoundaryTestRoutes,
} from "../../worker/routes/relationship-boundary-test.js";

describe("relationship boundary test", () => {
  it("parses the structured provider text and preserves at least 15000 body characters", async () => {
    const boundary = __relationshipBoundaryTestTestUtils.scoreBoundary({ myChart: {} });
    const sections = Array.from({ length: 5 }, (_, i) => ({ title: `장면 ${i + 1}`, body: (`장면 ${i + 1}의 서로 다른 해석과 대화 예시입니다.\n\n`).repeat(130) }));
    let options;
    const result = await __relationshipBoundaryTestTestUtils.generate({}, boundary, "female", {}, async (_env, _prompt, opts) => {
      options = opts;
      return { ok: true, text: JSON.stringify({ summary: "계산 근거 요약", sections, character: { title: "선택의 장면" }, finalMessage: "서로의 기준을 확인하세요." }) };
    });
    expect(options.baseTokens).toBe(24000);
    expect(options.capTokens).toBe(32000);
    expect(result.sections.reduce((sum, section) => sum + section.body.length, 0)).toBeGreaterThanOrEqual(15000);
    expect(result.sections[0].body).toContain("\n\n");
  });

  it("does not replace an incomplete paid reading with a short canned result", async () => {
    const boundary = __relationshipBoundaryTestTestUtils.scoreBoundary({ myChart: {} });
    for (const response of [{ ok: false }, { ok: true, text: "{}" }, { ok: true, text: JSON.stringify({ summary: "짧은 요약", sections: Array.from({ length: 5 }, () => ({ title: "장면", body: "짧은 본문" })) }) }]) {
      await expect(__relationshipBoundaryTestTestUtils.generate({}, boundary, "female", {}, async () => response)).rejects.toThrow("READING_INCOMPLETE");
    }
  });
  it("rejects a target without the required gender before any payment or provider path", async () => {
    const response = await handleRelationshipBoundaryTestRoutes(
      new Request("https://example.test/api/relationship-boundary-test/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": "rbt-test-request-0001" },
        body: JSON.stringify({ targetInfo: { birthDate: "1990-01-01", birthTime: "12:00", calendarType: "solar" } }),
      }),
      {},
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ ok: false, reason: "INVALID_INPUT" });
  });

  it("keeps a deterministic score inside the documented grade range", () => {
    const result = __relationshipBoundaryTestTestUtils.scoreBoundary({
      myChart: { shinsal: { 도화: { score: 1 }, 홍염: { score: 1 } }, natalInteractions: { branchClashes: [{}], branchHarms: [], branchPunishments: [] }, reference: { dominantTenGod: "식신" } },
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(["low", "medium", "high"]).toContain(result.grade);
    expect(result.scoreFactors.length).toBeGreaterThan(0);
  });

  it("maps each score band to a distinct webtoon direction before the LLM writes copy", () => {
    expect(__relationshipBoundaryTestTestUtils.storyDirectionFor(30).key).toBe("steady");
    expect(__relationshipBoundaryTestTestUtils.storyDirectionFor(31).key).toBe("balanced");
    expect(__relationshipBoundaryTestTestUtils.storyDirectionFor(56).key).toBe("responsive");
    expect(__relationshipBoundaryTestTestUtils.storyDirectionFor(80).key).toBe("porous");
  });

  it("gives the LLM the fixed score direction and target gender, not a fixed character name", () => {
    const boundary = __relationshipBoundaryTestTestUtils.scoreBoundary({ myChart: {} });
    const value = __relationshipBoundaryTestTestUtils.prompt({ myChart: {} }, boundary, "female");
    expect(value).toContain("[대상자 성별] 여성");
    expect(value).toContain("[점수대 연출]");
    expect(value).toContain("고정된 별명이나 유명 인물 이름을 반복하지 마세요");
    expect(value).toContain("만원 유료 리포트에 맞게");
    expect(value).toContain("관계를 지키는 힘");
    expect(value).toContain("에필로그: 현실적인 선택");
  });

  it("exposes the fixed 10,000 won common payment payload", () => {
    expect(__relationshipBoundaryTestTestUtils.paymentPayload("rbt-test-request-0002")).toMatchObject({
      featureKey: "relationship-boundary-test", amountKRW: 10000,
      allowedPaymentModes: ["MEMBERSHIP_PASS", "MOONLIGHT_STONE", "DIRECT_KRW"],
    });
  });
});
