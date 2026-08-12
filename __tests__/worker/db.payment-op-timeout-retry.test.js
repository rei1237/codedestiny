/**
 * @jest-environment node
 *
 * op-타임아웃 재시도는 **결제만** 켠다.
 *
 * 2026-08-12 프로덕션 실측(18요청): 결제 요청의 1/3~1/2 이 정확히 op 예산(12.16~12.45초)에서
 * DB_UNAVAILABLE 로 죽었고, 성공 요청은 1.3~5.5초였다. 코드를 읽어 보면 op-타임아웃은
 * `isTransientMongoError` 에 잡히지 않아 **재시도 대상에서 명시적으로 제외**돼 있다(db.js) —
 * 실패한 요청은 풀 리셋만 남기고 죽고, 그 리셋의 수혜자는 **다음 요청**이다. 그래서 성공과
 * 실패가 교대로 나오고 사용자에게는 "될 때도 있고 안 될 때도 있는 결제창"이 된다.
 *
 * 결제 컨텍스트는 요청당 슬롯도 op 도 하나뿐이라(withPaymentDb) 인증 라우트의 11.5s×N 누적
 * 문제가 없다. 그래서 결제만 예외로 켠다 — 이 테스트가 그 경계를 고정한다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __paymentDbTestUtils } from "../../worker/payments/db.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dbSource = readFileSync(path.join(root, "worker/lib/db.js"), "utf8");

test("🔴 결제 옵션은 op-타임아웃 재시도를 켠다", () => {
  expect(__paymentDbTestUtils.PAYMENT_DB_OPTIONS.retryOnOperationTimeout).toBe(true);
});

test("🔴 기본값은 꺼짐 — 다른 라우트는 종전대로 재시도하지 않는다(11.5s×N 누적 방지)", () => {
  // opt-in 이어야 한다: `=== true` 로만 켜지고, 옵션이 없으면 false 다.
  expect(dbSource).toMatch(/const retryOnOperationTimeout = options\.retryOnOperationTimeout === true/);
});

test("재시도 판정에 op-타임아웃 예외가 실제로 배선돼 있다", () => {
  const start = dbSource.indexOf("const willRetry = attempt < maxRetries");
  expect(start).toBeGreaterThan(0);
  const block = dbSource.slice(start, start + 260);
  expect(block).toMatch(/isOperationTimeout && retryOnOperationTimeout/);
  // 과부하(admission) 오류는 여전히 재시도하지 않는다 — 대기열 압력을 배가시키기 때문이다.
  expect(block).toMatch(/MongoOperationOverloadedError/);
});

test("재시도가 새 연결로 가도록 웜 참조 무효화가 그대로 남아 있다", () => {
  // 이게 없으면 재시도가 같은 죽은 소켓으로 다시 가 두 배로 느린 실패가 된다.
  const start = dbSource.indexOf("if (isConnectionLevelFailure)");
  expect(start).toBeGreaterThan(0);
  const block = dbSource.slice(start, start + 200);
  expect(block).toMatch(/lastHealthyAt = 0/);
  expect(block).toMatch(/connectPromise = null/);
});
