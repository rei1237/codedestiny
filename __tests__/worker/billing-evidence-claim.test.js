/**
 * @jest-environment node
 */
// 결제 증빙 1건 = 유료 요청 1건(2026-10-16). 저장소는 jest 설정이 메모리 대역으로 바꾼다.
import {
  EVIDENCE_ALREADY_USED,
  EVIDENCE_ALREADY_USED_MESSAGE,
  billingEvidenceClaimId,
  claimBillingEvidence,
  claimRequestBillingEvidence,
  evidenceClaimErrorBody,
  releaseBillingEvidenceClaim,
  releaseRequestBillingEvidence,
} from "../../worker/lib/billing-evidence-claim.js";
import { __billingEvidenceClaims } from "../../worker/lib/billing-evidence-claim-store.js";

const env = {};
const claim = (requestId, evidenceIds = ["pay-1"], userId = "u1") => claimBillingEvidence(env, { userId, requestId, evidenceIds, featureKey: "f" });

test("처음 쓰는 증빙은 이번 요청에 묶인다", async () => {
  await expect(claim("req-1")).resolves.toEqual({ ok: true, claimed: 1, replayed: 0 });
  expect(__billingEvidenceClaims().get(billingEvidenceClaimId("pay-1"))).toMatchObject({ userId: "u1", requestId: "req-1" });
});

test("같은 요청의 재시도는 그대로 통과한다", async () => {
  await claim("req-1");
  await expect(claim("req-1")).resolves.toEqual({ ok: true, claimed: 0, replayed: 1 });
});

test("다른 요청이나 다른 계정이 같은 증빙을 내밀면 409 다", async () => {
  await claim("req-1");
  await expect(claim("req-2")).resolves.toMatchObject({ ok: false, status: 409, code: EVIDENCE_ALREADY_USED });
  await expect(claim("req-1", ["pay-1"], "u2")).resolves.toMatchObject({ ok: false, status: 409 });
});

test("여러 ID 중 하나라도 이미 쓰였으면 409 이고, 이번에 잡은 것은 되돌린다", async () => {
  await claim("req-1", ["merchant-1"]);
  await expect(claim("req-2", ["pay-9", "merchant-1"])).resolves.toMatchObject({ status: 409 });
  expect(__billingEvidenceClaims().has(billingEvidenceClaimId("pay-9"))).toBe(false);
});

test("최종 실패로 풀면 새 요청이 다시 쓸 수 있다. 남의 claim 은 풀지 않는다", async () => {
  await claim("req-1");
  await expect(releaseBillingEvidenceClaim(env, { userId: "u1", requestId: "req-2", evidenceIds: ["pay-1"] })).resolves.toEqual({ released: 0 });
  await expect(releaseBillingEvidenceClaim(env, { userId: "u1", requestId: "req-1", evidenceIds: ["pay-1"] })).resolves.toEqual({ released: 1 });
  await expect(claim("req-2")).resolves.toMatchObject({ ok: true, claimed: 1 });
});

test("증빙이나 requestId 가 없으면 402 다", async () => {
  await expect(claim("req-1", [])).resolves.toMatchObject({ status: 402, code: "NO_EVIDENCE" });
  await expect(claim("", ["pay-1"])).resolves.toMatchObject({ status: 402, code: "NO_REQUEST_ID" });
});

describe("라우트용 래퍼", () => {
  const wrap = (requestId, evidenceIds = ["pay-1"]) => claimRequestBillingEvidence(env, { userId: "u1", requestId, evidenceIds, featureKey: "f" });

  test("증빙 ID 가 없으면(이용권·관리자) 건너뛴다", async () => {
    await expect(wrap("req-1", [])).resolves.toEqual({ ok: true, skipped: true });
    await expect(wrap("req-1", ["", null])).resolves.toEqual({ ok: true, skipped: true });
    await expect(releaseRequestBillingEvidence(env, { userId: "u1", requestId: "req-1", evidenceIds: [] })).resolves.toEqual({ released: 0 });
  });

  test("저장소 장애는 503 결과로 돌린다 — 던지지 않는다", async () => {
    class BrokenStore extends Map {
      has() {
        throw new Error("db down");
      }
      get() {
        throw new Error("db down");
      }
    }
    globalThis.__cdBillingEvidenceClaims = new BrokenStore();
    try {
      await expect(wrap("req-1")).resolves.toMatchObject({ ok: false, status: 503, code: "PAYMENT_VERIFY_UNAVAILABLE" });
      // 해제도 던지지 않는다 — 실패 경로 뒤의 자동 환불을 막으면 안 된다.
      await expect(releaseRequestBillingEvidence(env, { userId: "u1", requestId: "req-1", evidenceIds: ["pay-1"] })).resolves.toEqual({ released: 0 });
    } finally {
      globalThis.__cdBillingEvidenceClaims = new Map();
    }
  });

  test("409 본문은 code·reason·error 를 모두 싣는다", async () => {
    await wrap("req-1");
    const result = await wrap("req-2");
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(evidenceClaimErrorBody(result)).toEqual({
      ok: false,
      reason: EVIDENCE_ALREADY_USED,
      code: EVIDENCE_ALREADY_USED,
      message: EVIDENCE_ALREADY_USED_MESSAGE,
      error: { code: EVIDENCE_ALREADY_USED, message: EVIDENCE_ALREADY_USED_MESSAGE },
    });
  });
});
