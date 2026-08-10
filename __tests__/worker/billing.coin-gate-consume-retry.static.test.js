/**
 * @jest-environment node
 *
 * "coin-gate 결제가 간헐적 503을 낸다"의 회귀 가드 (두 번째 라운드).
 *
 * 프로덕션 실측(wrangler tail, 2026-08-10):
 *   [db-op-timeout] totalMs:12000 opMs:12000 inFlightOps:2
 *     checkOutStarted:14 checkedOut:1 checkOutFailed:7 lastCheckOutFailReason:"timeout"
 *   [worker-auth-error] stage:verify-access-token-user code:AUTH_ERROR
 *     message:"MongoDB operation timed out in Worker."
 *   [worker-paid-access] stage:INFRA_503_AUTH httpStatus:503 scope:"auth"
 *
 * 원인을 더 추적하니 consumeCoinWithRetry(billing.js)가 이미 내부적으로 재시도하는 인증 체인
 * (resolvePaidRouteAuth → withMongoRetry)을 감싸서 status>=500 이면 무조건 통째로 한 번 더
 * 돌리고 있었다 — 안쪽 재시도가 방금 소진돼서 난 503(AUTH_STATUS_TEMPORARILY_UNAVAILABLE)을
 * 보고 똑같은 인증 조회를 또 하는 중첩 재시도다. 풀이 가장 바쁜 순간 비용만 두 배로 만들고,
 * 그 아래 실제 코인 차감 쓰기는 LEGACY_COIN_DISABLED(402) 조기 반환에 막힌 죽은 코드라 이득도 없다.
 *
 * scripts/verify-no-nested-retry.mjs 는 이 패턴을 못 잡는다 — 리터럴 `withMongoRetry(` 호출이
 * 아니라 수동 for 문이고, resolvePigCoinConsumeAuth 는 그 검사기의 4개 하드코딩 인증함수 목록에
 * 없기 때문이다. 이 테스트가 그 사각지대를 대신 지킨다.
 */

import fs from "node:fs";
import path from "node:path";

const billingSource = fs.readFileSync(
  path.join(process.cwd(), "worker/routes/billing.js"),
  "utf8",
);

// 함수 본문을 중괄호 균형으로 잘라낸다 (worker/routes/billing.js 기존 테스트와 동일한 헬퍼).
function sliceFunction(source, header) {
  const start = source.indexOf(header);
  expect(start).toBeGreaterThanOrEqual(0);
  let paren = 0;
  let i = start;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "(") paren += 1;
    else if (ch === ")") {
      paren -= 1;
      if (paren === 0) {
        i += 1;
        break;
      }
    }
  }
  let depth = 0;
  let seenBody = false;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
      seenBody = true;
    } else if (ch === "}") {
      depth -= 1;
      if (seenBody && depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces for ${header}`);
}

describe("coin-gate 소비 위임 재시도 중첩 가드", () => {
  test("DB 인프라 신호(AUTH_STATUS_TEMPORARILY_UNAVAILABLE/SERVICE_UNAVAILABLE)는 재시도하지 않는다", () => {
    const fn = sliceFunction(billingSource, "function shouldRetryCoinConsume(");
    const authGuardAt = fn.indexOf('code === "AUTH_STATUS_TEMPORARILY_UNAVAILABLE"');
    const statusCheckAt = fn.indexOf("status >= 500");
    expect(authGuardAt).toBeGreaterThanOrEqual(0);
    expect(statusCheckAt).toBeGreaterThan(0);
    // 🔴 순서가 중요하다 — status>=500 체크보다 먼저 인프라 신호를 걸러 return false 해야
    // 안쪽에서 이미 소진된 인증 재시도를 바깥에서 다시 돌리지 않는다.
    expect(authGuardAt).toBeLessThan(statusCheckAt);
    expect(fn).toMatch(/code === "SERVICE_UNAVAILABLE"\) return false;/);
    expect(fn).toMatch(/return false;[\s\S]{0,80}status >= 500/);
  });

  test("일반 5xx/WORKER_UNHANDLED_EXCEPTION 재시도는 그대로 유지된다", () => {
    const fn = sliceFunction(billingSource, "function shouldRetryCoinConsume(");
    expect(fn).toMatch(/if \(status >= 500\) return true;/);
    expect(fn).toMatch(/return code === "WORKER_UNHANDLED_EXCEPTION";/);
  });

  test("예외 경로(MongoTopologyClosedError 등)의 재시도는 손대지 않았다", () => {
    const fn = sliceFunction(billingSource, "function shouldRetryCoinConsumeException(");
    expect(fn).toMatch(/name === "MONGOTOPOLOGYCLOSEDERROR"/);
    expect(fn).toMatch(/message\.includes\("TOPOLOGY IS CLOSED"\)/);
    expect(fn).toMatch(/code === "COIN_GATE_CONSUME_TIMEOUT"/);
  });

  test("재시도 루프 구조(최대 2회, 120ms 대기)는 그대로 유지된다", () => {
    const fn = sliceFunction(billingSource, "async function consumeCoinWithRetry(");
    expect(fn).toMatch(/const maxAttempts = 2;/);
    expect(fn).toMatch(/attempt <= maxAttempts/);
    expect(fn).toMatch(/await sleep\(120\);/);
  });
});
