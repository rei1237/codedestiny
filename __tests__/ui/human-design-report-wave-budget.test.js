/**
 * 🔴 결제 후 리포트가 안 나오던 사고의 시간 예산 회귀 테스트.
 *
 * `/api/human-design-report/generate` 한 번은 서버 웨이브 예산(HD_REPORT_WAVE_BUDGET_MS = 75초)
 * 만큼 응답을 붙들도록 설계돼 있는데, 클라이언트 쪽 상한은 두 겹 다 그보다 짧았다.
 *   1) authFetch 의 기본 요청 상한 22초 — 호출부가 signal 을 주지 않으면 무조건 걸린다.
 *   2) postPaidBody 의 기본 총예산 30초 — runAccessCheckWithTransientRetry 가 **race** 로 건다.
 * 그래서 정상 웨이브가 매번 잘렸고, 잘린 요청도 서버에서는 waveCount 를 이미 올린 채 계속 돌아
 * 결국 상한에 걸려 환불 + generation_failed 로 닫혔다.
 *
 * 이 파일은 그중 (2)를 **실제 공용 유틸을 돌려서** 고정한다. (1)의 배선(signal·clearTimeout)과
 * 상수 정합(엣지 데드라인 100초와의 대소)은 `npm run verify:human-design-report` 가 숫자로 대조한다.
 *
 * 🔴 시도 promise 를 즉시 resolve 하지 않는다 — 지연 0이면 예산 race 자체가 성립하지 않아
 *    옛 값(30초)으로도 통과하는 오탐이 된다. mock timer 로 실제 경과를 만든다.
 *
 * 🔴 이 파일이 __tests__/ui/ 에 있는 이유: jest 에는 TS 프리셋이 없어 app/**\/*.ts 를 못 읽는다.
 *    node --test 는 런타임 타입 스트리핑으로 읽고, test:node 는 PR CI 의 fast 잡이라 항상 돈다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const pollingModule = import(
  require("node:url").pathToFileURL(path.join(root, "app/_lib/consultationResultPolling.ts")).href
);

/** 소스에 박힌 숫자를 그대로 읽어 온다 — 테스트에 값을 복사해 두면 한쪽만 바뀌어도 초록불이 된다. */
function constantOf(relativePath, name) {
  const match = new RegExp(`${name}\\s*=\\s*(\\d+)`).exec(read(relativePath));
  assert.ok(match, `${relativePath} 에서 ${name} 를 찾지 못했다`);
  return Number(match[1]);
}

const HOOK = "app/human-design/report/_lib/useReportGeneration.ts";
const FETCH = "app/nakshatra/nakshatra-fetch.ts";

const SERVER_WAVE_BUDGET_MS = constantOf("worker/lib/human-design-report-contract.js", "HD_REPORT_WAVE_BUDGET_MS");
const AUTH_FETCH_TIMEOUT_MS = constantOf("app/_lib/auth-client.ts", "AUTH_FETCH_TIMEOUT_MS");
const DEFAULT_PAID_BODY_BUDGET_MS = constantOf(FETCH, "PAID_BODY_BUDGET_MS");
const WAVE_REQUEST_TIMEOUT_MS = constantOf(HOOK, "WAVE_REQUEST_TIMEOUT_MS");
const WAVE_REQUEST_BUDGET_MS = constantOf(HOOK, "WAVE_REQUEST_BUDGET_MS");

/** 서버가 웨이브 예산을 끝까지 쓴 정상 응답. 사고의 재현 조건은 "느린 실패"가 아니라 "정상"이다. */
const NORMAL_WAVE_MS = SERVER_WAVE_BUDGET_MS;

function okAttempt(afterMs) {
  return () => new Promise((resolve) => {
    setTimeout(() => resolve({
      status: 200,
      response: { status: 200, ok: true },
      data: { ok: true, status: "generating" },
    }), afterMs);
  });
}

test("전제: 정상 웨이브는 authFetch 기본 상한과 postPaidBody 기본 예산을 모두 넘긴다", () => {
  assert.ok(
    NORMAL_WAVE_MS > AUTH_FETCH_TIMEOUT_MS,
    `서버 웨이브 ${NORMAL_WAVE_MS}ms 가 authFetch 기본 상한 ${AUTH_FETCH_TIMEOUT_MS}ms 이하다 — 사고 전제가 사라졌다`,
  );
  assert.ok(
    NORMAL_WAVE_MS > DEFAULT_PAID_BODY_BUDGET_MS,
    `서버 웨이브 ${NORMAL_WAVE_MS}ms 가 기본 총예산 ${DEFAULT_PAID_BODY_BUDGET_MS}ms 이하다 — 사고 전제가 사라졌다`,
  );
});

test("🔴 기본 예산이면 정상 웨이브가 예산 초과로 잘린다 (고치기 전 동작)", async (t) => {
  const { runAccessCheckWithTransientRetry, PASS_CHECK_BUDGET_EXCEEDED_REASON } = await pollingModule;
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });

  const running = runAccessCheckWithTransientRetry(okAttempt(NORMAL_WAVE_MS), {
    budgetMs: DEFAULT_PAID_BODY_BUDGET_MS,
    maxAttempts: 2,
  });
  t.mock.timers.tick(DEFAULT_PAID_BODY_BUDGET_MS + 1000);
  const result = await running;

  assert.equal(result.data.reason, PASS_CHECK_BUDGET_EXCEEDED_REASON);
  assert.equal(result.status, 503);
});

test("🔴 웨이브 예산을 주면 같은 응답이 온전히 도착한다", async (t) => {
  const { runAccessCheckWithTransientRetry } = await pollingModule;
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });

  const running = runAccessCheckWithTransientRetry(okAttempt(NORMAL_WAVE_MS), {
    budgetMs: WAVE_REQUEST_BUDGET_MS,
    maxAttempts: 2,
  });
  t.mock.timers.tick(NORMAL_WAVE_MS + 1);
  const result = await running;

  assert.equal(result.data.ok, true);
  assert.equal(result.status, 200);
});

test("🔴 총예산은 요청 상한보다 짧으면 안 된다 — 첫 시도를 끝까지 못 기다린다", () => {
  assert.ok(
    WAVE_REQUEST_BUDGET_MS >= WAVE_REQUEST_TIMEOUT_MS,
    `총예산 ${WAVE_REQUEST_BUDGET_MS}ms < 요청 상한 ${WAVE_REQUEST_TIMEOUT_MS}ms — race 가 먼저 끊는다`,
  );
});
