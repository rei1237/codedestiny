/**
 * @jest-environment node
 *
 * premium-fpti-report 는 출생 기반 영구 해금 키다. 출생 판정에 쓰는 프로필은 클라이언트가 보낸
 * **실제 저장 프로필 id** 여야 하고, reportSignature 를 프로필 id 로 쓰면 안 된다.
 * 결제 증빙 바인딩(metadata.profileId = reportSignature)은 profileKey 로 예전 그대로 남는다.
 */

const requireAuth = jest.fn(async () => ({ userId: "64b000000000000000000f01" }));
const requirePremiumReportAccess = jest.fn(async () => ({ ok: false, status: 402, code: "PAYMENT_REQUIRED" }));
let handleFptiRoutes;

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({ requireAuth }));
  jest.unstable_mockModule("../../worker/lib/access-control.js", () => ({ requirePremiumReportAccess }));
  ({ handleFptiRoutes } = await import("../../worker/routes/fpti.js"));
});

beforeEach(() => {
  requirePremiumReportAccess.mockClear();
});

function readRequest(query) {
  return new Request(`https://example.com/api/fpti/deep-report?${query}`, { method: "GET" });
}

test("저장 프로필 id 를 출생 판정용 currentProfileId 로 넘기고, 시그니처는 바인딩 힌트로만 쓴다", async () => {
  const response = await handleFptiRoutes(readRequest("reportSignature=sig-abc&profileId=profile-123"), {});

  expect(response.status).toBe(402);
  const access = requirePremiumReportAccess.mock.calls[0][3];
  expect(access).toEqual({
    reportId: "sig-abc",
    sessionId: "sig-abc",
    profileKey: "sig-abc",
    currentProfileId: "profile-123",
  });
  expect(access.profileId).toBeUndefined();
  expect(access.selectedProfileId).toBeUndefined();
});

test("저장 프로필 id 가 없으면 시그니처를 프로필 id 로 대신 쓰지 않는다 (출생 키는 잠금)", async () => {
  await handleFptiRoutes(readRequest("reportSignature=sig-abc"), {});

  const access = requirePremiumReportAccess.mock.calls[0][3];
  expect(access.currentProfileId).toBeUndefined();
  expect(access.profileId).toBeUndefined();
});

test("POST 도 body.profileId 를 저장 프로필로 넘긴다", async () => {
  const request = new Request("https://example.com/api/fpti/deep-report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reportSignature: "sig-post", profileId: "profile-456" }),
  });

  await handleFptiRoutes(request, {});

  expect(requirePremiumReportAccess.mock.calls[0][3]).toMatchObject({
    profileKey: "sig-post",
    currentProfileId: "profile-456",
  });
});
