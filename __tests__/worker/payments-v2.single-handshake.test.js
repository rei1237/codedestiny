/**
 * @jest-environment node
 *
 * 결제 커넥션 정책 — 소켓 레인은 기본 꺼짐, 핸드셰이크는 요청당 1회.
 *
 * 2026-08-12 프로덕션 실측(18요청): 소켓 레인을 켠 상태에서 약 1/3 이 **정확히 op 예산
 * (12.16~12.22초)** 에서 DB_UNAVAILABLE 로 죽었고, 성공 요청은 1.3~3.6초였다. 경로와 무관했다
 * (= 특정 아이솔레이트의 레인 커넥션이 좀비가 되면 그 아이솔레이트의 결제가 계속 예산까지 매달린다).
 * 공유 커넥션에는 그 상황을 위한 복구 기계장치가 있지만 레인에는 없었고, skipSharedConnect 가
 * 그 부기까지 꺼서 아무도 고치지 않는 상태가 됐다.
 *
 * 그래서 계약은 세 가지다:
 *   ① 커넥션은 검증된 공유 경로가 기본이다(레인은 env 로 명시적으로 켤 때만)
 *   ② 효과가 확인된 admission 레인은 항상 켜 둔다(커넥션을 늘리지 않는 분리라 비용이 없다)
 *   ③ 레인을 켠 경우엔 공유 핸드셰이크를 끄고(이중 핸드셰이크 금지) 자가복구를 배선한다
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __paymentDbTestUtils } from "../../worker/payments/db.js";

const { PAYMENT_DB_OPTIONS, paymentDbOptions, isSocketLaneEnabled } = __paymentDbTestUtils;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(path.join(root, "worker/payments/db.js"), "utf8");

test("🔴 소켓 레인은 기본 꺼짐 — 커넥션은 복구 기계장치가 있는 공유 경로를 탄다", () => {
  expect(isSocketLaneEnabled({})).toBe(false);
  expect(isSocketLaneEnabled({ PAYMENTS_DB_SOCKET_LANE: "" })).toBe(false);
  expect(isSocketLaneEnabled({ PAYMENTS_DB_SOCKET_LANE: "1" })).toBe(true);
  expect(isSocketLaneEnabled({ PAYMENTS_DB_SOCKET_LANE: "true" })).toBe(true);
});

test("기본 옵션은 공유 핸드셰이크를 끄지 않는다(레인이 없으면 그게 유일한 연결이다)", () => {
  expect(paymentDbOptions({}).skipSharedConnect).toBeUndefined();
});

test("🔴 레인을 켠 경우에만 공유 핸드셰이크를 끈다 — 둘을 직렬로 세우면 12초 예산을 넘는다", () => {
  expect(paymentDbOptions({ PAYMENTS_DB_SOCKET_LANE: "1" }).skipSharedConnect).toBe(true);
});

test("admission 레인은 레인 on/off 와 무관하게 항상 켜져 있다(측정된 유일한 효과)", () => {
  for (const env of [{}, { PAYMENTS_DB_SOCKET_LANE: "1" }]) {
    expect(paymentDbOptions(env).admissionLane).toBe("payment");
    expect(paymentDbOptions(env).retryAdmissionOnOverload).toBe(true);
  }
  expect(PAYMENT_DB_OPTIONS.admissionLane).toBe("payment");
});

test("🔴 레인 자가복구가 배선돼 있다 — 없으면 좀비 커넥션이 영구 실패가 된다", () => {
  const body = source.slice(source.indexOf("export async function withPaymentDb"));
  expect(body).toMatch(/isTransientMongoError\(error\)/);
  expect(body).toMatch(/resetPaymentConnection\(\)/);
  // 레인 실패 폴백에는 공유 connectDb 가 있어야 한다(bufferCommands:false).
  expect(body).toMatch(/if\s*\(!paymentConn\)\s*await connectDb\(env\)/);
});
