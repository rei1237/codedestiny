/** @jest-environment node */

import { describe, expect, it } from "@jest/globals";
import {
  GUARDIAN_FORTUNE_SHARE_TTL_MS,
  createGuardianFortuneShareDraftToken,
  createGuardianFortuneShareId,
  createGuardianFortuneShareSnapshot,
  findPublicGuardianFortuneSnapshot,
  isValidGuardianFortuneShareId,
  projectGuardianFortuneShareResult,
  toPublicGuardianFortuneSnapshot,
  verifyGuardianFortuneShareDraftToken,
} from "../../worker/lib/guardian-fortune-share.js";
import { handleFortuneRoutes } from "../../worker/routes/fortune.js";

const ENV = {
  ENABLE_GUARDIAN_FORTUNE_SHARE: "true",
  GUARDIAN_FORTUNE_SHARE_SECRET: "stage10-test-secret",
};
const NOW = new Date("2026-08-02T03:00:00.000Z");
const result = {
  title: "오늘의 흐름을 읽어봤어요",
  openingLine: "오늘은 마음속 우선순위를 천천히 꺼내 보는 흐름이에요.",
  innerState: "겉으로는 차분해 보여도 속으로는 이미 다음 선택의 조건을 정리하고 있는 상태에 가깝습니다.",
  coreReading: "지금의 흐름은 서둘러 결론을 내리기보다, 반복되는 패턴에서 중요한 신호를 골라내는 쪽으로 움직입니다.",
  topicAdvice: "오늘은 작은 행동 하나를 정하고 그 행동이 나에게 어떤 반응을 남기는지 살펴보면 좋습니다.",
  cautionPattern: "상대의 반응을 확인하기 전에 혼자 결론을 크게 키우는 패턴은 잠시 내려놓아 주세요.",
  luckyAction: "메모장에 오늘 꼭 끝낼 일 세 가지를 적고, 첫 번째 일부터 10분만 시작해 보세요.",
  premiumCta: { ctaKey: "life_compass", label: "조작된 외부 링크", targetPath: "https://evil.example", reason: "오늘의 흐름을 더 깊게 살펴볼 수 있어요." },
  shareText: "오늘의 귀인 운세에서 내 흐름을 살펴봤어요.",
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
      if (records.some((item) => item.shareId === record.shareId || (record.sourceRequestId && item.sourceRequestId === record.sourceRequestId))) {
        const error = new Error("duplicate");
        error.code = 11000;
        throw error;
      }
      const saved = { ...record, toObject: undefined };
      records.push(saved);
      return saved;
    },
  };
}

describe("Guardian Fortune Stage 10 share contract", () => {
  it("keeps create and read routes unavailable until both flags are enabled", async () => {
    const createResponse = await handleFortuneRoutes(
      new Request("https://example.test/api/fortune/guardian/share", {
        method: "POST",
        body: JSON.stringify({ shareDraftToken: "not-read-when-disabled" }),
        headers: { "content-type": "application/json" },
      }),
      { ENABLE_GUARDIAN_FORTUNE_API: "true" },
    );
    expect(createResponse.status).toBe(404);

    const readResponse = await handleFortuneRoutes(
      new Request("https://example.test/api/fortune/guardian/share/gf_invalid"),
      { ENABLE_GUARDIAN_FORTUNE_API: "true" },
    );
    expect(readResponse.status).toBe(404);
  });

  it("creates an opaque signed draft token without raw birth input", async () => {
    const token = await createGuardianFortuneShareDraftToken({
      env: ENV,
      requestId: "guardian-request-share-1",
      mode: "yeoni",
      topic: "daily",
      locale: "ko-KR",
      result,
      now: NOW,
    });
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const verified = await verifyGuardianFortuneShareDraftToken(token, { env: ENV, now: NOW });
    expect(verified.ok).toBe(true);
    expect(JSON.stringify(verified)).not.toMatch(/birthDate|birthTime|concern|evil\.example/);
    expect(verified.payload.result.premiumCta.targetPath).toBe("/destiny-compass");
  });

  it("rejects expired and tampered tokens", async () => {
    const token = await createGuardianFortuneShareDraftToken({ env: ENV, requestId: "guardian-request-share-2", mode: "neo", topic: "love", result, now: NOW });
    await expect(verifyGuardianFortuneShareDraftToken(`${token}tampered`, { env: ENV, now: NOW })).resolves.toMatchObject({ ok: false });
    await expect(verifyGuardianFortuneShareDraftToken(token, { env: ENV, now: new Date(NOW.getTime() + 10 * 60 * 1000 + 1) })).resolves.toMatchObject({ ok: false, errorCode: "GUARDIAN_FORTUNE_SHARE_TOKEN_EXPIRED" });
  });

  it("uses a random share id with a stable public-safe format", () => {
    const first = createGuardianFortuneShareId();
    const second = createGuardianFortuneShareId();
    expect(first).not.toBe(second);
    expect(isValidGuardianFortuneShareId(first)).toBe(true);
    expect(first).not.toMatch(/2026|user|daily|yeoni/);
  });

  it("sanitizes text and remaps CTA paths through the topic allowlist", () => {
    const projected = projectGuardianFortuneShareResult({ ...result, title: "<script>alert(1)</script> 오늘" }, { topic: "love" });
    expect(projected.title).toBe("alert(1) 오늘");
    expect(projected.premiumCta.targetPath).toBe("/love-secret-ai");
    expect(toPublicGuardianFortuneSnapshot({ ...projected, shareId: "gf_123456789012345678901234", mode: "love", topic: "love", createdAt: NOW, expiresAt: new Date(NOW.getTime() + GUARDIAN_FORTUNE_SHARE_TTL_MS), locale: "ko-KR", sourceRequestId: "private" })).not.toHaveProperty("sourceRequestId");
  });

  it("creates one snapshot per request and hides internal fields from public reads", async () => {
    const model = createMemorySnapshotModel();
    const token = await createGuardianFortuneShareDraftToken({ env: ENV, requestId: "guardian-request-share-3", mode: "yeoni", topic: "daily", result, now: NOW });
    const verified = await verifyGuardianFortuneShareDraftToken(token, { env: ENV, now: NOW });
    const first = await createGuardianFortuneShareSnapshot({ draft: verified.payload, requestUrl: "https://code-destiny.com/api/fortune/guardian/share", env: ENV, now: NOW, model });
    const second = await createGuardianFortuneShareSnapshot({ draft: verified.payload, requestUrl: "https://code-destiny.com/api/fortune/guardian/share", env: ENV, now: NOW, model });
    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(model.records).toHaveLength(1);
    expect(first.shareUrl).toContain("/fortune/share/?shareId=gf_");
    expect(await findPublicGuardianFortuneSnapshot({ shareId: first.snapshot.shareId, now: NOW, model })).toMatchObject({ shareId: first.snapshot.shareId, topic: "daily" });
    expect(await findPublicGuardianFortuneSnapshot({ shareId: first.snapshot.shareId, now: new Date(NOW.getTime() + GUARDIAN_FORTUNE_SHARE_TTL_MS + 1), model })).toBeNull();
  });

  it("does not issue a token when the share flag or secret is absent", async () => {
    await expect(createGuardianFortuneShareDraftToken({ env: {}, requestId: "request", mode: "yeoni", topic: "daily", result, now: NOW })).resolves.toBeUndefined();
    await expect(createGuardianFortuneShareDraftToken({ env: { ENABLE_GUARDIAN_FORTUNE_SHARE: "true" }, requestId: "request", mode: "yeoni", topic: "daily", result, now: NOW })).resolves.toBeUndefined();
  });
});
