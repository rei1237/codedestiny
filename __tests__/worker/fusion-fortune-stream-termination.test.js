/**
 * @jest-environment node
 */
/**
 * 초융합 SSE 스트림의 **종료 계약**.
 *
 * 🔴 2026-09-03 프로덕션 사고: 결제를 마친 사용자의 화면이 "2 / 2 묶음 보완 완료"에서 영원히
 * 돌았다. 원인은 스트림에 종료 주체가 없었던 것이다 — 데드라인 타이머는 abortController.abort()
 * 만 했고, abort 는 SSE 를 한 줄도 쓰지 않는다. 실제 종료는 생성기 안의 await 경계에서만
 * 일어나므로, 그 경계 밖(그룹 병렬 대기·Mongo 저장)에서 걸리면 run 이 영원히 pending 이고
 * finally 가 안 돌아 심박(ping)만 15초마다 계속 나갔다. 클라이언트의 무음 감시는 ping 으로
 * 리셋되므로 이 상태를 원리적으로 못 잡는다.
 *
 * 여기서 고정하는 것: 생성이 영원히 안 끝나도 서버가 유예 뒤에 **직접** 종료 이벤트를 쓰고
 * 스트림을 닫는다. 그리고 결제 키(requestId)로 보관본을 되찾는 회수 경로가 살아 있다.
 */
import { jest } from "@jest/globals";

const ENV = { ENABLE_FUSION_FORTUNE_API: "true", ENABLE_FUSION_FORTUNE_UI: "true", ENABLE_FUSION_FORTUNE_MOCK_FLOW: "true" };

let handleFusionFortuneRoutes;
let fusionConstants;
let generateImpl = async () => ({ ok: true });
let consultationByRequestId = null;

beforeAll(async () => {
  // 🔴 fusion-fortune.js 는 **부분** 모킹이다 — 갈아끼우는 것은 생성 함수와 Mongo 스토어뿐이고,
  //    플래그·에러 코드·데드라인 상수는 진짜를 쓴다. 상수를 스텁하면 이 테스트가 프로덕션과
  //    다른 시계를 재게 되어 "유예 안에 닫힌다"는 판정이 아무것도 증명하지 못한다.
  //    같은 이유로 db·auth 도 부분 모킹이다 — 라우터 그래프의 다른 모듈이 이 두 모듈에서
  //    가져오는 export 를 통째 스텁이 지우면 스위트 전체가 "export 가 없다"로 죽는다.
  const actualFusion = await import("../../worker/lib/fusion-fortune.js");
  const actualDb = await import("../../worker/lib/db.js");
  const actualAuth = await import("../../worker/lib/auth.js");
  fusionConstants = actualFusion;
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({ ...actualDb, connectDb: async () => {} })),
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      ...actualAuth,
      requireUserFromRequest: async () => ({ userId: "user-1" }),
      getOptionalUserFromRequest: async () => ({ userId: "user-1" }),
    })),
    jest.unstable_mockModule("../../worker/lib/fusion-fortune-consultation.js", () => ({
      saveFusionFortuneConsultation: async () => "saved-id",
      getFusionFortuneConsultation: async () => null,
      getFusionFortuneConsultationByRequestId: async () => consultationByRequestId,
      listFusionFortuneConsultations: async () => [],
    })),
    jest.unstable_mockModule("../../worker/lib/fusion-fortune.js", () => ({
      ...actualFusion,
      createMongoFusionFortuneStore: () => ({}),
      generateFusionFortuneRequest: (args) => generateImpl(args),
    })),
  ]);
  ({ handleFusionFortuneRoutes } = await import("../../worker/routes/fusion-fortune.js"));
});

afterEach(() => {
  jest.useRealTimers();
  consultationByRequestId = null;
});

function streamRequest(requestId) {
  return new Request("https://example.test/api/fusion-fortune/generate/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, birthDate: "1995-04-18", birthTime: "08:30" }),
  });
}

/** 스트림을 끝까지 읽는다. 닫히지 않으면 이 promise 가 영원히 안 풀린다 — 그것이 이 테스트의 판정이다. */
async function drain(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    text += decoder.decode(chunk.value, { stream: true });
  }
  return text;
}

describe("Fusion Fortune SSE stream termination", () => {
  it("🔴 closes the stream with a terminating error event when generation never finishes", async () => {
    jest.useFakeTimers();
    // 영원히 안 끝나는 생성기. abort 신호를 받아도 스스로는 아무것도 하지 않는다 —
    // 프로덕션에서 실제로 걸린 자리(그룹 병렬 대기·Mongo 저장)와 같은 모양이다.
    generateImpl = () => new Promise(() => {});

    const response = await handleFusionFortuneRoutes(streamRequest("stuck-request"), ENV, null);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");

    const pump = drain(response);
    // 데드라인 120초 + 유예 5초를 넘긴다.
    await jest.advanceTimersByTimeAsync(fusionConstants.FUSION_GENERATION_DEADLINE_MS + 6000);
    const text = await pump;

    expect(text).toContain("event: error");
    expect(text).toContain(fusionConstants.FUSION_FORTUNE_ERROR_CODES.STREAM_TIMEOUT);
    // 🔴 결제 키가 반드시 실려야 한다 — 이게 없으면 30,000원짜리 요청을 화면에서 되찾을 수 없다.
    expect(text).toContain("stuck-request");
    expect(text).toContain('"retryable":true');
  });

  it("stops the heartbeat once the stream is closed", async () => {
    jest.useFakeTimers();
    generateImpl = () => new Promise(() => {});

    const response = await handleFusionFortuneRoutes(streamRequest("stuck-heartbeat"), ENV, null);
    const pump = drain(response);
    await jest.advanceTimersByTimeAsync(fusionConstants.FUSION_GENERATION_DEADLINE_MS + 6000);
    const text = await pump;

    // 닫히기 전까지는 심박이 살아 있었고(무음 감시가 오작동하지 않는다),
    expect((text.match(/event: ping/g) || []).length).toBeGreaterThan(0);
    // 닫힌 뒤로는 타이머가 끊겨 새 이벤트가 더 생기지 않는다.
    await jest.advanceTimersByTimeAsync(120000);
    expect(await drain(response).catch(() => "")).toBe("");
  });

  it("does not double-close when generation finishes normally", async () => {
    generateImpl = async ({ onDelivery }) => {
      await onDelivery({ requestId: "done-request", result: { title: "결과" }, generationSource: "mock", qualityTier: "full" });
      return { ok: true, requestId: "done-request", result: { title: "결과" }, fusionStatus: { canGenerate: false } };
    };
    const response = await handleFusionFortuneRoutes(streamRequest("done-request"), ENV, null);
    const text = await drain(response);
    expect(text).toContain("event: result");
    expect(text).toContain("event: complete");
    expect(text).not.toContain("event: error");
  });

  it("🔴 recovers a stored result by payment requestId so a broken stream is not a lost 30,000 KRW", async () => {
    consultationByRequestId = { id: "saved-id", title: "결과", result: { title: "결과" }, qualityTier: "degraded", qualityNotice: "짧아요", inputSummary: { topic: "삶의 전반적인 흐름" } };
    const response = await handleFusionFortuneRoutes(
      new Request("https://example.test/api/fusion-fortune/result?requestId=stuck-request"),
      ENV,
      null,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, consultation: { id: "saved-id", qualityTier: "degraded" } });
  });

  it("returns 404 — never a stale other result — when the payment key has no stored result", async () => {
    consultationByRequestId = null;
    const response = await handleFusionFortuneRoutes(
      new Request("https://example.test/api/fusion-fortune/result?requestId=never-generated"),
      ENV,
      null,
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: "FUSION_FORTUNE_RESULT_NOT_FOUND" });
  });
});
