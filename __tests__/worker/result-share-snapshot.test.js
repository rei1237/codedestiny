/** @jest-environment node */

/**
 * 정적 셸 결과 공유 스냅샷의 방어선.
 *
 * 이 엔드포인트는 레포에서 유일하게 **서명 없이 클라이언트 본문을 받는 공개 쓰기 경로**다.
 * 그래서 여기서 지키는 것은 "동작한다"가 아니라 "거부한다"에 가깝다 — 유료 feature, PII,
 * 과대 본문, 무제한 반복이 각각 어디서 멈추는지를 고정한다.
 */
import { describe, expect, it } from "@jest/globals";
import {
  RESULT_SHARE_MAX_SECTIONS,
  RESULT_SHARE_RATE_LIMIT_MAX,
  RESULT_SHARE_TEXT_LIMITS,
  RESULT_SHARE_TTL_MS,
  createResultShareSnapshot,
  findPublicResultSnapshot,
  isValidResultShareId,
  projectResultShareInput,
  resultShareRateLimitSubject,
  resultShareRateLimitVerdict,
} from "../../worker/lib/result-share-snapshot.js";
import { handleFortuneRoutes } from "../../worker/routes/fortune.js";

const NOW = new Date("2026-09-13T03:00:00.000Z");
const input = {
  feature: "tarot-basic",
  title: "오늘의 카드는 '별'이에요",
  summary: "지금은 조급하게 결론을 내기보다 방향을 다시 확인할 때예요.",
  sections: [
    { heading: "뽑은 카드", body: "별 · 정방향" },
    { heading: "지금의 흐름", body: "멈춰 있는 것처럼 보여도 준비가 쌓이는 구간입니다." },
  ],
};

function createMemorySnapshotModel() {
  const records = [];
  return {
    records,
    findOne(query) {
      return {
        lean: async () => records.find((record) => Object.entries(query).every(([key, value]) => record[key] === value)) || null,
      };
    },
    async create(record) {
      if (records.some((item) => item.shareId === record.shareId || (record.contentHash && item.contentHash === record.contentHash))) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
      records.push({ ...record });
      return records[records.length - 1];
    },
  };
}

describe("result share snapshot contract", () => {
  it("rejects features outside the free whitelist", () => {
    expect(projectResultShareInput({ ...input, feature: "tarot-premium" })).toBeNull();
    expect(projectResultShareInput({ ...input, feature: "saju-ai-prompt" })).toBeNull();
    expect(projectResultShareInput({ ...input, feature: "" })).toBeNull();
    expect(projectResultShareInput({ ...input, feature: "saju-basic" })).not.toBeNull();
  });

  it("refuses to store personal identifiers", () => {
    expect(projectResultShareInput({ ...input, summary: "연락처는 010-1234-5678 이에요." })).toBeNull();
    expect(projectResultShareInput({
      ...input,
      sections: [{ heading: "메모", body: "friend@example.com 으로 알려주세요." }],
    })).toBeNull();
  });

  it("keeps only whitelisted fields within their length limits", () => {
    const projected = projectResultShareInput({
      ...input,
      title: "가".repeat(RESULT_SHARE_TEXT_LIMITS.title + 40),
      paidBody: "유료 흐름 리딩 본문",
      sections: Array.from({ length: RESULT_SHARE_MAX_SECTIONS + 3 }, (_, index) => ({
        heading: `섹션 ${index}`,
        body: "나".repeat(RESULT_SHARE_TEXT_LIMITS.body + 50),
      })),
    });
    expect(projected.title).toHaveLength(RESULT_SHARE_TEXT_LIMITS.title);
    expect(projected.paidBody).toBeUndefined();
    expect(projected.sections).toHaveLength(RESULT_SHARE_MAX_SECTIONS);
    expect(projected.sections[0].body).toHaveLength(RESULT_SHARE_TEXT_LIMITS.body);
    expect(projected.locale).toBe("ko-KR");
  });

  it("gives the same result one share link and a 90 day expiry", async () => {
    const model = createMemorySnapshotModel();
    const first = await createResultShareSnapshot({ input, requestUrl: "https://code-destiny.com/api/fortune/share", now: NOW, model });
    const second = await createResultShareSnapshot({ input, requestUrl: "https://code-destiny.com/api/fortune/share", now: NOW, model });

    expect(isValidResultShareId(first.snapshot.shareId)).toBe(true);
    expect(first.shareUrl).toBe(`https://code-destiny.com/share/?shareId=${first.snapshot.shareId}`);
    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.snapshot.shareId).toBe(first.snapshot.shareId);
    expect(model.records).toHaveLength(1);
    expect(new Date(model.records[0].expiresAt).getTime() - NOW.getTime()).toBe(RESULT_SHARE_TTL_MS);
  });

  it("hides snapshots that are expired, deleted, or addressed by a malformed id", async () => {
    const model = createMemorySnapshotModel();
    const created = await createResultShareSnapshot({ input, requestUrl: "https://code-destiny.com/api/fortune/share", now: NOW, model });
    const later = new Date(NOW.getTime() + RESULT_SHARE_TTL_MS + 1000);

    await expect(findPublicResultSnapshot({ shareId: created.snapshot.shareId, now: NOW, model })).resolves.toMatchObject({ feature: "tarot-basic" });
    await expect(findPublicResultSnapshot({ shareId: created.snapshot.shareId, now: later, model })).resolves.toBeNull();
    await expect(findPublicResultSnapshot({ shareId: "../../etc", now: NOW, model })).resolves.toBeNull();
    await expect(findPublicResultSnapshot({ shareId: "sr_short", now: NOW, model })).resolves.toBeNull();
  });

  it("refuses invalid bodies instead of storing a trimmed version", async () => {
    const model = createMemorySnapshotModel();
    await expect(createResultShareSnapshot({ input: { ...input, feature: "tarot-premium" }, requestUrl: "https://code-destiny.com/api/fortune/share", now: NOW, model }))
      .rejects.toThrow("RESULT_SHARE_RESULT_INVALID");
    expect(model.records).toHaveLength(0);
  });

  it("counts every request against one bucket even when the origin is unreadable", () => {
    const withIp = new Request("https://code-destiny.com/api/fortune/share", { method: "POST", headers: { "CF-Connecting-IP": "203.0.113.9" } });
    expect(resultShareRateLimitSubject(withIp)).toBe("ip:203.0.113.9");
    expect(resultShareRateLimitSubject(new Request("https://code-destiny.com/api/fortune/share", { method: "POST" }))).toBe("ip:unknown");

    const now = Date.now();
    expect(resultShareRateLimitVerdict({ count: RESULT_SHARE_RATE_LIMIT_MAX, resetAt: now + 60000, now })).toBeNull();
    const blocked = resultShareRateLimitVerdict({ count: RESULT_SHARE_RATE_LIMIT_MAX + 1, resetAt: now + 60000, now });
    expect(blocked).toMatchObject({ ok: false, status: 429, error: "RESULT_SHARE_RATE_LIMITED" });
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("keeps both routes unavailable until ENABLE_RESULT_SHARE is on", async () => {
    const createResponse = await handleFortuneRoutes(
      new Request("https://code-destiny.com/api/fortune/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
      {},
    );
    expect(createResponse.status).toBe(404);
    await expect(createResponse.json()).resolves.toMatchObject({ ok: false, error: "RESULT_SHARE_DISABLED" });

    const readResponse = await handleFortuneRoutes(
      new Request("https://code-destiny.com/api/fortune/share/sr_abcdefghijklmnopqrstuvwx", { method: "GET" }),
      {},
    );
    expect(readResponse.status).toBe(404);
  });
});
