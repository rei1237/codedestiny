/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import {
  __relationshipBoundaryTestTestUtils,
  handleRelationshipBoundaryTestRoutes,
} from "../../worker/routes/relationship-boundary-test.js";

const SECTION_MARKER = "[이번에 쓸 장면]";
const isSectionPrompt = (text) => String(text).includes(SECTION_MARKER);
const longProse = (label) => (`${label}의 서로 다른 해석과 대화 예시입니다.\n\n`).repeat(130);
const FRAME_JSON = JSON.stringify({ character: { title: "선택의 장면", caption: "한 문장 소개" }, summary: "계산 근거 요약", finalMessage: "서로의 기준을 확인하세요." });

/** 장면 프롬프트에는 산문을, 프레임 프롬프트에는 JSON 을 돌려주는 기본 제공자 목. */
function recordingProvider({ sectionBody = longProse, frameText = FRAME_JSON } = {}) {
  const calls = [];
  const call = async (_env, promptText, opts) => {
    calls.push({ prompt: promptText, opts });
    if (!isSectionPrompt(promptText)) return { ok: true, text: frameText };
    const index = calls.filter((entry) => isSectionPrompt(entry.prompt)).length - 1;
    const body = sectionBody(`장면 ${index + 1}`, promptText, calls.length);
    return body === null ? { ok: false } : { ok: true, text: body };
  };
  return { calls, call };
}

describe("relationship boundary test", () => {
  it("fans one call out per chapter plus a frame call, all inside the edge budget", async () => {
    const boundary = __relationshipBoundaryTestTestUtils.scoreBoundary({ myChart: {} });
    const provider = recordingProvider();
    const result = await __relationshipBoundaryTestTestUtils.generate({}, boundary, "female", {}, provider.call);

    // 🔴 24,000토큰 단일 호출이 엣지 100초를 넘겨 결과가 안 나오던 것이 이 기능의 장애 원인이었다.
    expect(provider.calls).toHaveLength(6);
    const sectionCalls = provider.calls.filter((entry) => isSectionPrompt(entry.prompt));
    expect(sectionCalls).toHaveLength(5);
    for (const entry of provider.calls) {
      expect(entry.opts.attempts).toBe(1);
      expect(entry.opts.timeoutMs).toBeGreaterThan(0);
      expect(entry.opts.timeoutMs).toBeLessThanOrEqual(85000);
      expect(entry.opts.capTokens).toBeLessThanOrEqual(8000);
    }
    // 장면은 JSON 이 아니라 산문으로 받는다 — 잘려도 남은 문장을 살릴 수 있다.
    for (const entry of sectionCalls) expect(entry.opts.responseMimeType).toBe("");

    expect(result.sections).toHaveLength(5);
    expect(result.sections.map((section) => section.title)).toEqual(__relationshipBoundaryTestTestUtils.SECTION_TITLES);
    expect(result.sections.reduce((sum, section) => sum + section.body.length, 0)).toBeGreaterThanOrEqual(15000);
    expect(result.sections[0].body).toContain("\n\n");
    expect(result.summary).toBe("계산 근거 요약");
    expect(result.character.title).toBe("선택의 장면");
  });

  it("gives every parallel call the same score, gender and chart anchors", async () => {
    const boundary = __relationshipBoundaryTestTestUtils.scoreBoundary({ myChart: {} });
    const provider = recordingProvider();
    await __relationshipBoundaryTestTestUtils.generate({}, boundary, "female", {}, provider.call);

    // 앵커가 갈리면 여섯 호출이 서로 다른 사람의 이야기를 쓰게 된다.
    for (const anchor of [`[확정 점수] ${boundary.score}/100`, "[대상자 성별] 여성", "[점수대 연출]", "[확정 근거]", "[명식]"]) {
      for (const entry of provider.calls) expect(entry.prompt).toContain(anchor);
    }
  });

  it("repairs only the chapters that came back short", async () => {
    const boundary = __relationshipBoundaryTestTestUtils.scoreBoundary({ myChart: {} });
    const provider = recordingProvider({
      // 첫 웨이브에서 3장만 짧게 오고, 재호출에서는 충분히 길게 온다.
      sectionBody: (label, promptText, callIndex) => (callIndex <= 6 && promptText.includes(`${SECTION_MARKER} 3장`) ? "짧은 본문" : longProse(label)),
    });
    const result = await __relationshipBoundaryTestTestUtils.generate({}, boundary, "female", {}, provider.call);

    const repairPrompts = provider.calls.slice(6).map((entry) => entry.prompt);
    expect(repairPrompts).toHaveLength(1);
    expect(repairPrompts[0]).toContain(`${SECTION_MARKER} 3장`);
    expect(result.sections[2].body.length).toBeGreaterThanOrEqual(__relationshipBoundaryTestTestUtils.RBT_SECTION_MIN_CHARS);
  });

  it("skips generation entirely once the request has burned its LLM budget", async () => {
    const boundary = __relationshipBoundaryTestTestUtils.scoreBoundary({ myChart: {} });
    const provider = recordingProvider();
    const spentAt = Date.now() - __relationshipBoundaryTestTestUtils.RBT_LLM_BUDGET_MS;
    // 예산이 없는데 호출하면 엣지에 잘려 빈손이 된다. 그 전에 멈춰야 실패 처리·환불이 실행된다.
    await expect(__relationshipBoundaryTestTestUtils.generate({}, boundary, "female", {}, provider.call, spentAt)).rejects.toThrow("READING_INCOMPLETE");
    expect(provider.calls).toHaveLength(0);
  });

  it("accepts the staging LLM fixture but never stores a mock as a production reading", async () => {
    const boundary = __relationshipBoundaryTestTestUtils.scoreBoundary({ myChart: {} });
    // 스테이징은 실호출을 막아 둔 환경이라 provider 가 staging-mock 을 돌려준다.
    const asMock = async (_env, promptText) => ({ ok: true, provider: "staging-mock", isMock: true, text: isSectionPrompt(promptText) ? longProse("장면") : FRAME_JSON });
    const stagingEnv = { APP_ENV: "staging", STAGING_LLM_MOCK_ENABLED: "true", WORKERS_AI_ENABLED: "false" };
    const staged = await __relationshipBoundaryTestTestUtils.generate({}, boundary, "female", stagingEnv, asMock);
    expect(staged.sections).toHaveLength(5);

    await expect(__relationshipBoundaryTestTestUtils.generate({}, boundary, "female", { APP_ENV: "production" }, asMock)).rejects.toThrow("READING_INCOMPLETE");
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
