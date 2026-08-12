/**
 * @jest-environment node
 *
 * 확정(confirm) 경로의 **시도 예산** 계약.
 *
 * confirmOrder 는 verifyPgPayment(PortOne REST, 기본 8초)를 withPaymentDb 콜백 **안에서** 돌린다.
 * 즉 한 시도의 비용이 "Mongo 쿼리"가 아니라 "Mongo 쿼리 + 외부 HTTP"다. 그런데 시도 상한의 공유
 * 기본값(MONGO_OP_ATTEMPT_TIMEOUT_MS)은 전자만 담도록 잡혀 있어, 그대로 두면 **PG 가 느린 순간마다**
 * op-타임아웃이 난다.
 *
 * 그 실패의 대가가 크다: 카드는 이미 승인됐는데 주문이 PENDING 으로 남는다. 재조정 크론
 * (worker/lib/payment-reconcile-task.js)이 PortOne 에 다시 물어 정산하므로 돈이 사라지지는 않지만,
 * 그 사이 사용자는 "결제 실패"를 본다.
 *
 * 이 계약은 **숫자 세 개의 관계**라 어느 하나만 움직여도 조용히 깨진다. 그래서 값이 아니라
 * 부등식을 고정한다:
 *
 *   PortOne 타임아웃 + waitQueue  ≤  CONFIRM 시도 상한  <  셸 confirm 요청 상한
 *          8000      +   4000     ≤        15000        <        25000
 *
 * 그리고 confirmOrder 에 닿는 **모든** withDb 호출부가 이 예산을 실제로 넘기는지 함께 본다 —
 * 예산만 정의하고 호출부 하나를 빠뜨리면 그 경로만 옛 기본값으로 죽는다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONFIRM_DB_OPTIONS, __paymentDbTestUtils } from "../../worker/payments/db.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

/* 관계식의 다른 두 항을 소스에서 직접 읽는다 — 숫자를 여기 또 적으면 그 사본이 드리프트한다. */
function readDefault(source, marker) {
  const at = source.indexOf(marker);
  if (at < 0) throw new Error(`marker not found: ${marker}`);
  const window = source.slice(at, at + 400);
  const hit = window.match(/"(\d{3,6})"/);
  if (!hit) throw new Error(`default not found near: ${marker}`);
  return Number(hit[1]);
}

test("확정 예산이 PortOne 타임아웃 + 큐 대기를 담는다", () => {
  const portOneTimeoutMS = readDefault(read("worker/lib/portone.js"), "PORTONE_API_TIMEOUT_MS");
  const waitQueueTimeoutMS = readDefault(read("worker/lib/db.js"), "MONGO_WAIT_QUEUE_TIMEOUT_MS");

  expect(portOneTimeoutMS).toBeGreaterThan(0);
  expect(waitQueueTimeoutMS).toBeGreaterThan(0);
  // 이 부등식이 깨지면 PG 가 자기 타임아웃까지 쓰는 순간 우리 쪽이 먼저 포기한다.
  expect(CONFIRM_DB_OPTIONS.attemptTimeoutMS).toBeGreaterThanOrEqual(portOneTimeoutMS + waitQueueTimeoutMS);
});

test("확정 예산이 셸 confirm 요청 상한 안에 있다", () => {
  // 셸(index.html)이 confirm 계열 요청에 거는 상한. 서버가 이보다 오래 붙들면 클라가 먼저 포기해
  // "실패로 보이는 성공"이 된다.
  const shellSource = read("index.html");
  expect(shellSource).toContain("/api/billing/confirm");
  const shellConfirmCapMS = 25000;
  expect(shellSource).toContain(String(shellConfirmCapMS));
  expect(CONFIRM_DB_OPTIONS.attemptTimeoutMS).toBeLessThan(shellConfirmCapMS);

  // 🔴 op-타임아웃 재시도는 이 예산에서 꺼야 한다. 켜면 15000 × 2 = 30초로 셸 상한을 넘긴다.
  // 게다가 여기서의 타임아웃은 죽은 커넥션이 아니라 PG 지연이 지배적이라 재시도해도 같은 값을
  // 다시 기다린다(결제 기본값 PAYMENT_DB_OPTIONS 는 그대로 켜 둔다 — 그쪽은 순수 DB 경로다).
  expect(CONFIRM_DB_OPTIONS.retryOnOperationTimeout).toBe(false);
  expect(__paymentDbTestUtils.PAYMENT_DB_OPTIONS.retryOnOperationTimeout).toBe(true);
});

test("확정 예산이 시도 상한 clamp 안에 있다", () => {
  // withMongoRetry 의 clamp 상한(18000)을 넘으면 조용히 잘려 계약이 무의미해진다.
  expect(CONFIRM_DB_OPTIONS.attemptTimeoutMS).toBeLessThanOrEqual(18000);
});

test("결제 레인은 예산을 덮어써도 유지된다", () => {
  // admissionLane 이 덮이면 결제가 공유 레인으로 새어 부팅 폭풍과 슬롯을 다투게 된다.
  expect(CONFIRM_DB_OPTIONS.admissionLane).toBeUndefined();
  expect(__paymentDbTestUtils.PAYMENT_DB_OPTIONS.admissionLane).toBe("payment");
  const dbSource = read("worker/payments/db.js");
  expect(dbSource).toMatch(/admissionLane:\s*PAYMENT_DB_OPTIONS\.admissionLane/);
});

test("confirmOrder 에 닿는 모든 withDb 호출부가 확정 예산을 넘긴다", () => {
  const source = read("worker/payments/index.js");

  // 🔴 `confirmOrder(env, db, ctx` 를 그냥 세면 **함수 정의까지** 잡힌다. 그렇다고 `await` 로 좁히면
  // 화살표 즉시반환 형태(`(db) => confirmOrder(...)`)를 놓친다 — 실제로 4곳 중 2곳이 그 형태다.
  // 정의 하나만 빼고 센다.
  const confirmCallCount = (source.match(/(?<!function )confirmOrder\(env, db, ctx/g) || []).length;
  expect(confirmCallCount).toBeGreaterThanOrEqual(4);

  // 예산 없이 열린 withDb 안에서 confirmOrder 가 돌면 그 경로만 옛 기본값으로 죽는다.
  // withDb 블록을 하나씩 잘라 confirmOrder 를 품은 블록이 CONFIRM_DB_OPTIONS 로 닫히는지 확인한다.
  const blocks = [];
  const opener = /withDb\(env, ctx,/g;
  let match;
  while ((match = opener.exec(source)) !== null) {
    let depth = 0;
    let i = match.index + "withDb(".length - 1;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "(") depth += 1;
      else if (ch === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    blocks.push(source.slice(match.index, i + 1));
  }
  expect(blocks.length).toBeGreaterThan(0);

  const unbudgeted = blocks.filter(
    (block) => block.includes("confirmOrder(env, db, ctx") && !block.includes("CONFIRM_DB_OPTIONS"),
  );
  expect(unbudgeted).toEqual([]);
});
