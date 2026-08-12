/**
 * @jest-environment node
 *
 * 결제 요청은 **핸드셰이크를 한 번만** 한다.
 *
 * 2026-08-12 배포 직후 실측: 같은 V2 핸들러인데 웜 아이솔레이트로 간 `/api/payments/prepare` 는
 * 201, 콜드로 간 `/api/billing/checkout` 은 503 `DB_UNAVAILABLE`(op timeout) 이었다. 원인은
 * 콜드 아이솔레이트에서 공유 커넥션(withMongoRetry 의 connectDb)과 결제 레인(connectPaymentDb)을
 * **직렬로 두 번** 세운 것이다 — M0 서버선택이 최대 8초라 둘을 더하면 12초 op 예산을 넘는다.
 *
 * 그래서 여기서 고정하는 계약은 두 가지다:
 *   ① 결제 옵션은 skipSharedConnect 로 공유 핸드셰이크를 끈다(부기 분리도 함께)
 *   ② 레인이 죽었을 때만 공유 커넥션으로 폴백한다 — bufferCommands:false 라 연결 없이
 *      Model.collection 을 부르면 즉시 실패하므로, 폴백 경로에는 반드시 connectDb 가 있어야 한다
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __paymentDbTestUtils } from "../../worker/payments/db.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(path.join(root, "worker/payments/db.js"), "utf8");

test("🔴 결제 옵션은 공유 핸드셰이크를 끈다(콜드 아이솔레이트 이중 핸드셰이크 방지)", () => {
  expect(__paymentDbTestUtils.PAYMENT_DB_OPTIONS.skipSharedConnect).toBe(true);
});

test("결제 레인과 admission 레인은 한 세트로 함께 켜져 있다", () => {
  const options = __paymentDbTestUtils.PAYMENT_DB_OPTIONS;
  expect(options.admissionLane).toBe("payment");
  // 소켓만 나누고 admission 을 공유하면 부팅 폭풍이 한도를 채울 때 결제가 하드 503 이 된다.
  expect(options.retryAdmissionOnOverload).toBe(true);
});

test("🔴 레인 실패 폴백에는 공유 connectDb 가 있다 — 없으면 bufferCommands:false 로 즉시 실패한다", () => {
  const body = source.slice(source.indexOf("export async function withPaymentDb"));
  expect(body).toMatch(/connectPaymentDb\(env\)/);
  // 폴백 분기(레인이 null 일 때)에서 공유 커넥션을 세운다.
  expect(body).toMatch(/if\s*\(!paymentConn\)\s*await connectDb\(env\)/);
});

test("공유 커넥션 소유권 판정은 db.js 의 skipSharedConnect 하나로 갈린다(드리프트 방지)", () => {
  const dbSource = readFileSync(path.join(root, "worker/lib/db.js"), "utf8");
  expect(dbSource).toMatch(/options\.skipSharedConnect\s*!==\s*true/);
  // 그 판정이 실제로 시도마다의 connectDb 를 가른다.
  expect(dbSource).toMatch(/if\s*\(ownsSharedConnection\)\s*await connectDb\(env\)/);
});
