/**
 * @jest-environment node
 *
 * 사주 AI 상담이 "결제는 됐는데 결과가 안 나오는" 상태로 굳지 않게 하는 계약을 고정한다.
 *
 * 생성은 동기라 요청이 끊기면(엣지 데드라인/탭 종료/isolate 회수) 레코드가 generating 으로 남는다.
 * 그러면 /status 가 영원히 202 를 답해 클라이언트는 3분 폴링 후 타임아웃하고, 결과도 환불도 없다.
 * 읽기 시점의 stale 판정과 그 뒤 상태 매핑이 이 회수 경로의 전부다.
 *
 * requestId 우선순위도 함께 고정한다 — 클라이언트 폴링 키가 이 순서를 그대로 따라야 한다.
 * 이 함수는 6개 AI 상담 핸들러가 공유하는 쓰기 키라 바뀌면 재접속이 다른 멱등키로 돌아 이중 차감이 된다.
 */

let isSajuAIPromptStaleGeneratingExecution;
let mapSajuAIExecutionStatus;
let buildSajuAIStatusPayload;
let readAIPromptRequestId;

// worker/routes/fortune.js 의 SAJU_AI_PROMPT_STALE_GENERATING_MS = EDGE_RESPONSE_DEADLINE_MS(100s) + 20s
const STALE_MS = 120000;

beforeAll(async () => {
  const mod = await import("../../worker/routes/fortune.js");
  ({
    isSajuAIPromptStaleGeneratingExecution,
    mapSajuAIExecutionStatus,
    buildSajuAIStatusPayload,
    readAIPromptRequestId,
  } = mod.__fortuneAccessTestUtils);
});

describe("끊긴 생성 레코드 판정", () => {
  const now = new Date("2026-08-13T00:10:00.000Z");
  const at = (msAgo) => new Date(now.getTime() - msAgo).toISOString();

  test("엣지 데드라인을 넘겨 갱신이 멈춘 generating 은 stale 이다", () => {
    expect(isSajuAIPromptStaleGeneratingExecution({ status: "generating", updatedAt: at(STALE_MS + 1000) }, now)).toBe(true);
  });

  test("아직 생성 중일 수 있는 레코드는 건드리지 않는다", () => {
    expect(isSajuAIPromptStaleGeneratingExecution({ status: "generating", updatedAt: at(STALE_MS - 1000) }, now)).toBe(false);
  });

  test("generating 이 아닌 레코드는 대상이 아니다", () => {
    expect(isSajuAIPromptStaleGeneratingExecution({ status: "completed", updatedAt: at(STALE_MS + 60000) }, now)).toBe(false);
    expect(isSajuAIPromptStaleGeneratingExecution({ status: "generation_failed", updatedAt: at(STALE_MS + 60000) }, now)).toBe(false);
  });

  test("타임스탬프가 없으면 회수하지 않는다(오탐으로 진행 중인 생성을 죽이지 않는다)", () => {
    expect(isSajuAIPromptStaleGeneratingExecution({ status: "generating" }, now)).toBe(false);
    expect(isSajuAIPromptStaleGeneratingExecution(null, now)).toBe(false);
  });
});

describe("회수된 레코드가 클라이언트에 전달되는 모양", () => {
  test("generation_failed 는 failed 로 매핑된다", () => {
    expect(mapSajuAIExecutionStatus("generation_failed")).toBe("failed");
  });

  test("결제가 남아 있으면 retryable 로, 사유 코드·문구를 그대로 내보낸다", () => {
    const payload = buildSajuAIStatusPayload({
      executionId: "exec-1",
      requestId: "saju-ai-prompt:abc",
      status: "generation_failed",
      error: { code: "STALE_GENERATION_RECOVERED", message: "상담 생성이 중간에 끊겨 대기 상태를 정리했어요." },
      result: { order: { paymentStatus: "PAID" } },
    });

    expect(payload.status).toBe("failed");
    // 이 세 필드가 클라이언트의 "추가 결제 없이 다시 생성" 인계 조건이다.
    expect(payload.retryable).toBe(true);
    expect(payload.errorCode).toBe("STALE_GENERATION_RECOVERED");
    expect(payload.errorMessage).toContain("끊겨");
  });
});

describe("requestId 우선순위(폴링 키 정본)", () => {
  test("idempotencyKey 가 requestId 를 이긴다", () => {
    expect(readAIPromptRequestId({ requestId: "saju-ai-prompt:abc", idempotencyKey: "saju-ai-prompt:abc:a0" }))
      .toBe("saju-ai-prompt:abc:a0");
  });

  test("_paymentContext.idempotencyKey 도 requestId 보다 앞선다", () => {
    expect(readAIPromptRequestId({ requestId: "saju-ai-prompt:abc", _paymentContext: { idempotencyKey: "saju-ai-prompt:abc:c1" } }))
      .toBe("saju-ai-prompt:abc:c1");
  });

  test("멱등키가 없으면 requestId 를 쓴다", () => {
    expect(readAIPromptRequestId({ requestId: "saju-ai-prompt:abc" })).toBe("saju-ai-prompt:abc");
  });
});
