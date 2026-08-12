/**
 * @jest-environment node
 *
 * 결제 전용 커넥션 레인 — 컬렉션 해석과 폴백 계약.
 *
 * "PG 결제창이 아예 안 뜬다"(2026-08-12)의 원인은 부팅 요청 폭풍이 공유 풀(5소켓)을 선점해
 * checkout 이 커넥션 체크아웃에서 굶는 것이었다(실브라우저 재현: DB_BUSY 503). 결제 컨텍스트는
 * 전용 커넥션의 컬렉션을 쓰되, 레인 수립 실패 시 공유 커넥션으로 폴백해 가용성이 종전보다
 * 나빠지는 경로가 없어야 한다 — 그 두 계약을 여기서 고정한다.
 */
import { __paymentDbTestUtils } from "../../worker/payments/db.js";

const { resolveCollection, makeCountingDb } = __paymentDbTestUtils;

function fakeModel(name) {
  return { collection: { collectionName: name, findOne: () => "shared" } };
}

function fakePaymentConn(ready = 1) {
  const handed = [];
  return {
    readyState: ready,
    db: { collection: (name) => ({ __lane: true, name, findOne: () => { handed.push(name); return "lane"; } }) },
    handed,
  };
}

test("레인이 준비되면(readyState 1) 전용 커넥션의 컬렉션을 쓴다", () => {
  const conn = fakePaymentConn(1);
  const col = resolveCollection(fakeModel("payments"), conn);
  expect(col.__lane).toBe(true);
  expect(col.name).toBe("payments");
});

test("레인이 없거나 미수립이면 공유 커넥션(Model.collection)으로 폴백한다", () => {
  const model = fakeModel("payments");
  expect(resolveCollection(model, null)).toBe(model.collection);
  expect(resolveCollection(model, fakePaymentConn(0))).toBe(model.collection); // 연결 중/실패
});

test("레인 db.collection 이 던져도 공유 커넥션으로 폴백한다 — 레인은 가용성 조건이 아니다", () => {
  const model = fakeModel("payments");
  const broken = { readyState: 1, db: { collection: () => { throw new Error("lane broken"); } } };
  expect(resolveCollection(model, broken)).toBe(model.collection);
});

test("makeCountingDb 는 레인 커넥션으로 연산을 실행하고 왕복을 센다", async () => {
  const conn = fakePaymentConn(1);
  const ctx = { mongoOps: 0 };
  const db = makeCountingDb(ctx, conn);
  const result = await db.findOne(fakeModel("payments"), { a: 1 });
  expect(result).toBe("lane");
  expect(conn.handed).toEqual(["payments"]);
  expect(ctx.mongoOps).toBe(1);
});
