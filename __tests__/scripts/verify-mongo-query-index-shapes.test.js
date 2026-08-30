/**
 * scripts/verify-mongo-query-index-shapes.mjs 의 판정 로직을 픽스처로 고정한다(git checkout 없이).
 * 원장에 없는 키 → 위반 · allowlist 사유 없음 → 오류 · 선두 키 일치 → 통과.
 */
import { extractQueries, judge, queryId, extractMigrationIndexKeys, selfTest } from "../../scripts/verify-mongo-query-index-shapes.mjs";

const FILE = "worker/routes/fixture.js";
const ledgerCtx = {
  ledger: { users: [["email"], ["status", "createdAt"]], payments: [["userId", "createdAt"]] },
  modelToCollection: { User: "users", Payment: "payments" },
};

function analyze(body) {
  return extractQueries(`import { User, Payment } from "../lib/models.js";\nexport async function h(id, q) {\n${body}\n}`, { file: FILE });
}

describe("verify-mongo-query-index-shapes", () => {
  test("원장에 없는 키로 조회하면 위반이고, 실패 메시지가 인덱스 선두 키를 알려준다", () => {
    const r = judge(analyze(`await User.findOne({ referralCode: "x" });`), ledgerCtx, []);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].why).toMatch(/선두 키 불일치.*email/);
    expect(r.violations[0].id).toBe(`${FILE}::User.findOne::{referralCode}`);
  });

  test("선두 키가 있으면 통과 — 복합 인덱스의 두 번째 키만 있으면 위반", () => {
    const ok = judge(analyze(`await User.find({ status: "a", role: "b" }).sort({ createdAt: -1 });`), ledgerCtx, []);
    expect(ok.violations).toHaveLength(0);
    expect(ok.indexed).toHaveLength(1);
    const bad = judge(analyze(`await User.find({ createdAt: { $gt: 1 } });`), ledgerCtx, []);
    expect(bad.violations).toHaveLength(1);
  });

  test("$or 는 가지마다 따로 본다 — 한 가지라도 인덱스가 없으면 위반", () => {
    const ok = judge(analyze(`await Payment.find({ userId: id, $or: [{ a: 1 }, { b: 2 }] });`), ledgerCtx, []);
    expect(ok.violations).toHaveLength(0);
    const bad = judge(analyze(`await Payment.find({ $or: [{ userId: id }, { orderId: "o" }] });`), ledgerCtx, []);
    expect(bad.violations).toHaveLength(1);
    expect(bad.violations[0].why).toMatch(/orderId/);
  });

  test("_id 조회·findById 는 항상 통과, 빈 필터 find() 는 위반", () => {
    const r = judge(analyze(`await User.findById(id);\nawait User.updateOne({ _id: id }, { $set: { a: 1 } });\nawait User.find();`), ledgerCtx, []);
    expect(r.indexed).toHaveLength(2);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].why).toMatch(/빈 필터/);
  });

  test("리터럴이 아닌 필터(식별자·스프레드·$expr)는 dynamic 으로 분류돼 실패시키지 않는다", () => {
    const r = judge(analyze(`await User.find(q);\nawait User.find({ ...q, a: 1 });\nawait User.find({ $expr: { $gt: ["$a", 1] } });`), ledgerCtx, []);
    expect(r.dynamic).toHaveLength(3);
    expect(r.violations).toHaveLength(0);
  });

  test("원장에 없는 컬렉션(모델)은 위반이다 — 미분류를 통과시키지 않는다", () => {
    const r = judge(analyze(`await Payment.findOne({ userId: id });`), { ledger: { users: ledgerCtx.ledger.users }, modelToCollection: ledgerCtx.modelToCollection }, []);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].why).toMatch(/원장에 컬렉션 없음/);
  });

  test("allowlist: 사유가 있으면 구제, 사유 없음·중복·낡은 항목은 오류", () => {
    const queries = analyze(`await User.findOne({ referralCode: "x" });`);
    const id = queryId(queries[0]);
    const rescued = judge(queries, ledgerCtx, [{ id, reason: "문서 300건 미만, 가입 시 1회" }]);
    expect(rescued.violations).toHaveLength(0);
    expect(rescued.allowlisted).toHaveLength(1);
    expect(rescued.allowlistErrors).toHaveLength(0);

    const broken = judge(queries, ledgerCtx, [{ id, reason: "" }, { id, reason: "중복 항목의 사유" }, { id: `${FILE}::User.find::{gone}`, reason: "이미 지워진 쿼리" }]);
    expect(broken.allowlistErrors.join("\n")).toMatch(/사유 없음/);
    expect(broken.allowlistErrors.join("\n")).toMatch(/중복/);
    expect(broken.allowlistErrors.join("\n")).toMatch(/낡은 항목/);
  });

  test("$elemMatch 는 배열 하위 경로 인덱스를 탄다", () => {
    const ctx = { ledger: { users: [["lots.expiresAt"]] }, modelToCollection: { User: "users" } };
    const r = judge(analyze(`await User.find({ lots: { $elemMatch: { expiresAt: { $lte: 1 }, remaining: { $gt: 0 } } } });`), ctx, []);
    expect(r.violations).toHaveLength(0);
    expect(r.indexed).toHaveLength(1);
  });

  test("마이그레이션 원문에서 createIndex({…})·spec: {…} 리터럴만 뽑는다", () => {
    expect(extractMigrationIndexKeys(`await X.collection.createIndex({ a: 1, "b.c": -1 }, { name: "n" });\nconst T = [{ spec: { d: 1 } }];\nawait X.collection.createIndex(index.spec, index.options);`))
      .toEqual([["a", "b.c"], ["d"]]);
  });

  test("스크립트 내장 self-test 도 통과한다", () => {
    expect(() => selfTest()).not.toThrow();
  });
});
