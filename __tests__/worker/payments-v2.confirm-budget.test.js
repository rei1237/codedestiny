/**
 * @jest-environment node
 *
 * 확정(confirm) 경로의 **슬롯 점유** 계약.
 *
 * 확정은 세 단계다: 상태 판정(Mongo) → PG 검증(PortOne REST, 기본 8초) → 정산·지급(Mongo).
 * 예전에는 셋이 한 withPaymentDb 콜백 안에 있어서, PortOne 이 답할 때까지 결제 레인의 admission
 * 슬롯과 Mongo 소켓을 하나씩 붙들고 있었다. 레인 한도가 12 라 PG 가 느려지는 순간 확정 12건이
 * 레인을 채우고 **그 뒤의 결제창 요청이 하드 503** 을 받는다(admission 거절은 재시도 대상이 아니다).
 * 그때는 그 구조를 전제로 확정 전용 예산(CONFIRM_DB_OPTIONS 15000)을 따로 뒀다.
 *
 * 지금 계약은 그 반대다: **PG 검증은 어떤 슬롯 안에서도 돌지 않는다.** verifyPgPayment 는 Mongo 를
 * 건드리지 않으므로(worker/payments/pg.js) 슬롯 안에 있을 이유가 없고, 밖으로 빼면 전용 예산도
 * 필요 없어진다. 이 테스트가 지키는 것은 그 구조이지 특정 숫자가 아니다 —
 * CONFIRM_DB_OPTIONS 를 되살리는 변경은 대개 "PG 를 슬롯 안으로 되돌렸다"는 신호다.
 *
 * 남은 부등식(값이 아니라 관계를 고정한다):
 *
 *   시도 상한 × 2(판정·정산) + PortOne 타임아웃  <  셸 confirm 요청 상한
 *        8000  × 2            +      8000        <         25000
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __paymentDbTestUtils } from "../../worker/payments/db.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(ROOT, rel), "utf8");

/* 관계식의 항을 소스에서 직접 읽는다 — 숫자를 여기 또 적으면 그 사본이 드리프트한다. */
function readDefault(source, marker) {
  const at = source.indexOf(marker);
  if (at < 0) throw new Error(`marker not found: ${marker}`);
  const window = source.slice(at, at + 400);
  const hit = window.match(/"(\d{3,6})"/);
  if (!hit) throw new Error(`default not found near: ${marker}`);
  return Number(hit[1]);
}

/** `withDb(env, ctx,` 로 열리는 블록을 괄호 균형으로 하나씩 잘라 낸다. */
function sliceWithDbBlocks(source) {
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
  return blocks;
}

test("🔴 PG 검증이 어떤 DB 슬롯 안에서도 돌지 않는다", () => {
  const source = read("worker/payments/index.js");
  const blocks = sliceWithDbBlocks(source);
  expect(blocks.length).toBeGreaterThan(0);

  const holdingPg = blocks.filter((block) => block.includes("verifyPgPayment("));
  expect(holdingPg).toEqual([]);

  // 확정 오케스트레이터가 실제로 PG 를 부르긴 하는지 — 위 단언이 "아무도 안 부른다"로 통과하면 안 된다.
  expect(source).toContain("verifyPgPayment(env,");
});

test("확정 전용 예산은 없어야 한다 — 있으면 PG 가 슬롯 안으로 돌아갔다는 신호다", async () => {
  const paymentDb = await import("../../worker/payments/db.js");
  expect(paymentDb.CONFIRM_DB_OPTIONS).toBeUndefined();
  expect(read("worker/payments/index.js")).not.toContain("CONFIRM_DB_OPTIONS");
});

test("확정 한 건의 최악 비용이 셸 confirm 요청 상한 안에 있다", () => {
  const portOneTimeoutMS = readDefault(read("worker/lib/portone.js"), "PORTONE_API_TIMEOUT_MS");
  const attemptTimeoutMS = readDefault(read("worker/lib/db.js"), 'getEnv(env, "MONGO_OP_ATTEMPT_TIMEOUT_MS"');
  expect(portOneTimeoutMS).toBeGreaterThan(0);
  expect(attemptTimeoutMS).toBeGreaterThan(0);

  // 셸(index.html)이 confirm 계열 요청에 거는 상한. 서버가 이보다 오래 붙들면 클라가 먼저 포기해
  // "실패로 보이는 성공"이 된다.
  const shellSource = read("index.html");
  expect(shellSource).toContain("/api/billing/confirm");
  const shellConfirmCapMS = 25000;
  expect(shellSource).toContain(String(shellConfirmCapMS));

  // 판정 슬롯 + PG(슬롯 밖) + 정산 슬롯.
  expect(attemptTimeoutMS * 2 + portOneTimeoutMS).toBeLessThan(shellConfirmCapMS);
});

test("시도 상한이 withMongoRetry clamp 안에 있다", () => {
  // clamp 상한(18000)을 넘으면 조용히 잘려 위 계산이 무의미해진다.
  const attemptTimeoutMS = readDefault(read("worker/lib/db.js"), 'getEnv(env, "MONGO_OP_ATTEMPT_TIMEOUT_MS"');
  expect(attemptTimeoutMS).toBeLessThanOrEqual(18000);
});

test("결제 레인은 예산을 덮어써도 유지된다", () => {
  // admissionLane 이 덮이면 결제가 공유 레인으로 새어 부팅 폭풍과 슬롯을 다투게 된다.
  expect(__paymentDbTestUtils.PAYMENT_DB_OPTIONS.admissionLane).toBe("payment");
  // 순수 DB 경로라 op-타임아웃 재시도를 켜 둔다(풀 리셋의 수혜자가 다음 요청이 아니라 자기 자신이 된다).
  expect(__paymentDbTestUtils.PAYMENT_DB_OPTIONS.retryOnOperationTimeout).toBe(true);
  const dbSource = read("worker/payments/db.js");
  expect(dbSource).toMatch(/admissionLane:\s*PAYMENT_DB_OPTIONS\.admissionLane/);
});

test("확정 호출부는 슬롯을 직접 열지 않고 오케스트레이터에 맡긴다", () => {
  const source = read("worker/payments/index.js");

  // 옛 서명(withDb 콜백 안에서 db 를 받아 확정)이 남아 있으면 그 경로만 슬롯을 붙든 채 PG 를 부른다.
  expect(source).not.toMatch(/confirmOrder\(env,\s*db,/);

  // 오케스트레이터에 닿는 호출부 4곳: /orders/:id/confirm · /confirm · 이용권 확정 · 웹훅.
  const callCount = (source.match(/(?<!function )confirmOrder\(env, ctx,/g) || []).length;
  expect(callCount).toBeGreaterThanOrEqual(4);
});
