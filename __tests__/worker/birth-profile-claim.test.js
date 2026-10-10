/**
 * @jest-environment node
 *
 * 프로필 선택 지급(P0-1, 2026-10-10). 출생 기반 전환 전 주문은 스냅샷에 생년월일이 없어, 저장 프로필이
 * 사라지면 지급 대상을 알 수 없다. 환불하지 않고 사용자가 고른 프로필의 출생 정보로 BIRTH 행을 지급한다.
 *
 * 쓰기는 실제 V2 라우트(가짜 결제 DB)로, 읽기는 실제 리더(content-unlocks.js hasPaidUnlockForProfile)로 본다 —
 * 둘을 따로 보면 신원 불일치(serviceKey·contentKey·profileId 모양)를 못 잡는다.
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { ContentEntitlement, ProfileCard } from "../../worker/lib/models.js";
import { hasPaidUnlockForProfile } from "../../worker/lib/content-unlocks.js";
import { makeFakePaymentDb, matches } from "../fixtures/fake-payment-db.mjs";
import { TEST_USER_ID as USER, OTHER_USER_ID, profileCardModel, testCard } from "../fixtures/profile-card-model.mjs";

const ENV = { JWT_ACCESS_SECRET: "test-access-secret-value-0123456789" };
const CARDS = [
  testCard("p1"),
  testCard("p2", { year: 1992, month: 11, day: 3 }),
  testCard("other-1", { userId: OTHER_USER_ID }),
];

let db;
const originals = { entitlementFindOne: ContentEntitlement.findOne, profileFindOne: ProfileCard.findOne };

beforeEach(() => {
  db = makeFakePaymentDb({ profileCards: CARDS });
  // 리더(mongoose 모델)를 가짜 DB 의 같은 행으로 돌린다.
  ContentEntitlement.findOne = (filter) => {
    const run = async () => db.rows.find((row) => row.grantType === "permanent_unlock" && matches(row, filter)) || null;
    const query = { select: () => query, session: () => query, lean: run };
    return query;
  };
  ProfileCard.findOne = profileCardModel(CARDS).findOne;
});

afterAll(() => {
  ContentEntitlement.findOne = originals.entitlementFindOne;
  ProfileCard.findOne = originals.profileFindOne;
});

async function call(method, path, body, { asUser = USER } = {}) {
  const { signAuthToken } = await import("../../worker/lib/auth.js");
  const token = await signAuthToken({ _id: asUser, email: "t@e.st", role: "user", name: "t" }, ENV);
  const request = new Request(`https://code-destiny.com/api/payments${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const response = await handlePaymentsContext(request, ENV, { prefix: "/api/payments", withDb: (_env, _ctx, fn) => fn(db) });
  return { status: response.status, payload: await response.json() };
}

const legacyHeld = (overrides = {}) => ({
  merchantUid: "cd-single-retro-0001",
  userId: USER,
  featureKey: "section_summary",
  productId: "saju",
  paymentType: "digital_content",
  status: "processing",
  orderState: "PAID_VERIFIED",
  paymentAmount: 4900,
  coinPrice: 49,
  impUid: "pay_retro_0001",
  paidAt: new Date("2026-10-01T00:00:00Z"),
  failureCode: "delivery_failed_manual_review",
  failureStage: "single_unlock_upsert",
  pricingSnapshot: { profileId: "deleted-profile" },
  ...overrides,
});

const opens = (profileId) => hasPaidUnlockForProfile({ userId: USER, profileId, featureKey: "section_summary" });

test("🔴 보류된 구 단건 주문: 목록에 뜨고, 고른 프로필의 생년월일로만 열린다(환불 없음)", async () => {
  db.rows.push(legacyHeld());
  const list = await call("GET", "/birth-profile-pending");
  expect(list.status).toBe(200);
  expect(list.payload.orders).toEqual([expect.objectContaining({ orderId: "cd-single-retro-0001", featureKey: "section_summary", requiresPartner: false })]);
  expect(JSON.stringify(list.payload)).not.toContain("deleted-profile"); // 프로필 id 를 싣지 않는다

  expect(await opens("p1")).toBe(false);
  const claim = await call("POST", "/birth-profile-pending/cd-single-retro-0001/claim", { profileId: "p1" });
  expect(claim.status).toBe(200);
  expect(claim.payload).toMatchObject({ ok: true, orderId: "cd-single-retro-0001", replayed: false });

  expect(await opens("p1")).toBe(true);
  expect(await opens("p2")).toBe(false); // 다른 생년월일 프로필은 잠긴다

  const order = db.rows.find((row) => row.merchantUid === "cd-single-retro-0001");
  expect(order).toMatchObject({ status: "fulfilled", orderState: "UNLOCKED", failureCode: null, failureStage: null });
  expect(order.pricingSnapshot).toMatchObject({ profileId: "p1", scope: "BIRTH" });
  expect(order.pricingSnapshot.birthKey).toMatch(/^[a-f0-9]{64}$/);
  expect(order.entitlementGrantedAt).toBeInstanceOf(Date);
  // 권한 행의 회계 필드는 실제 결제 금액이다.
  expect(db.rows.find((row) => row.grantType === "permanent_unlock")).toMatchObject({ orderId: "cd-single-retro-0001", amountKRW: 4900, scope: "BIRTH" });

  // 지급 뒤에는 목록에서 빠지고, 같은 요청을 다시 보내면 성공(재생)으로 답한다.
  expect((await call("GET", "/birth-profile-pending")).payload.orders).toEqual([]);
  const again = await call("POST", "/birth-profile-pending/cd-single-retro-0001/claim", { profileId: "p1" });
  expect(again.payload).toMatchObject({ ok: true, replayed: true });
});

test("V2 종결 주문·구글 검토 주문도 같은 정의로 뜨고 지급된다", async () => {
  db.rows.push(
    legacyHeld({ merchantUid: "cdv2retro0001", status: "paid", orderState: "PAID_VERIFIED", entitlementGrantedAt: null, failureStage: "birth_profile_required" }),
    legacyHeld({ merchantUid: "GPA.retro-0001", status: "success", failureStage: "google_birth_unlock_identity", pricingSnapshot: { birthUnlockReviewRequired: true } }),
  );
  const list = await call("GET", "/birth-profile-pending");
  expect(list.payload.orders.map((o) => o.orderId).sort()).toEqual(["GPA.retro-0001", "cdv2retro0001"]);

  expect((await call("POST", "/birth-profile-pending/cdv2retro0001/claim", { profileId: "p1" })).status).toBe(200);
  expect((await call("POST", "/birth-profile-pending/GPA.retro-0001/claim", { profileId: "p1" })).status).toBe(200);
  const v2 = db.rows.find((row) => row.merchantUid === "cdv2retro0001");
  expect(v2.status).toBe("paid");
  expect(v2.entitlementGrantedAt).toBeInstanceOf(Date);
  const google = db.rows.find((row) => row.merchantUid === "GPA.retro-0001");
  expect(google.status).toBe("success");
  expect(google.pricingSnapshot.birthUnlockReviewRequired).toBe(false);
  expect(await opens("p1")).toBe(true);
});

test("대상이 아닌 주문은 뜨지 않는다 — 스냅샷 생년월일 있음·환불·계정 단위 키·남의 주문", async () => {
  db.rows.push(
    legacyHeld({ merchantUid: "has-birth", pricingSnapshot: { profileId: "p1", birthKey: "a".repeat(64), scope: "BIRTH" } }),
    legacyHeld({ merchantUid: "refunded", status: "refunded" }),
    legacyHeld({ merchantUid: "account-key", featureKey: "love-code" }),
    legacyHeld({ merchantUid: "others", userId: OTHER_USER_ID }),
    legacyHeld({ merchantUid: "granted-v2", status: "paid", failureCode: null, entitlementGrantedAt: new Date() }),
  );
  expect((await call("GET", "/birth-profile-pending")).payload.orders).toEqual([]);
  const forbidden = await call("POST", "/birth-profile-pending/others/claim", { profileId: "p1" });
  expect(forbidden.status).toBe(403);
  const notPending = await call("POST", "/birth-profile-pending/has-birth/claim", { profileId: "p1" });
  expect(notPending.status).toBe(409);
});

test("남의 프로필·없는 프로필로는 지급하지 않고, 프로필 미선택은 400", async () => {
  db.rows.push(legacyHeld());
  expect((await call("POST", "/birth-profile-pending/cd-single-retro-0001/claim", {})).status).toBe(400);
  const other = await call("POST", "/birth-profile-pending/cd-single-retro-0001/claim", { profileId: "other-1" });
  expect(other.status).toBe(403);
  expect(other.payload.code).toBe("INVALID_PROFILE");
  expect(db.rows.some((row) => row.grantType === "permanent_unlock")).toBe(false);
  // 실패한 요청은 주문을 바꾸지 않는다 — 여전히 대기 목록에 있다.
  expect((await call("GET", "/birth-profile-pending")).payload.orders).toHaveLength(1);
});

test("🔴 한 주문을 서로 다른 생년월일로 두 번 지급하지 않는다(선점)", async () => {
  db.rows.push(legacyHeld());
  // 첫 선택이 선점만 하고 지급 전에 끊긴 상태를 만든다.
  const order = db.rows[0];
  order.metadata = { birthProfileClaim: { profileId: "p2", birthKey: "b".repeat(64) } };
  const blocked = await call("POST", "/birth-profile-pending/cd-single-retro-0001/claim", { profileId: "p1" });
  expect(blocked.status).toBe(409);
  expect(db.rows.some((row) => row.grantType === "permanent_unlock")).toBe(false);
});
