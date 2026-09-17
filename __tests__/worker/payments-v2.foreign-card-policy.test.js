/**
 * @jest-environment node
 *
 * 해외 발급 카드 결제창 노출 판정(해외카드 1단계 C3) — 서버가 판정하고 기본값은 닫힘이다.
 * 판정 표 자체를 고정한다. prepare 가 판정을 주문에 남기는 계약은 prepare-compat 테스트가 맡는다.
 */
import {
  FOREIGN_CARD_POLICY_VERSION,
  FOREIGN_CARD_PRODUCT_POLICY,
  canUseForeignCard,
  isForeignCardFlagEnabled,
  narrowToOrderSnapshot,
  toForeignCardSnapshot,
} from "../../worker/payments/foreign-card-policy.js";

const ON = { env: { FOREIGN_CARD_ENABLED: "1" } };
const CONTENT = { type: "digital_content" };
const PASS = { type: "membership_pass", durationDays: 30 };
const GIFT = { type: "membership_pass_gift", durationDays: 30 };

function input(overrides = {}) {
  return { user: { id: "u1" }, product: CONTENT, billingCountry: null, paymentChannel: "card_general", ...overrides };
}

function closed(reason) {
  return { offered: false, reason, policyVersion: FOREIGN_CARD_POLICY_VERSION };
}

const OPEN = { offered: true, reason: "ELIGIBLE", policyVersion: FOREIGN_CARD_POLICY_VERSION };

test("🔴 플래그는 문자열 \"1\" 만 켠다 — 미설정·'0'·'true'·공백 섞인 값은 FLAG_OFF", () => {
  for (const value of [undefined, null, "", "0", "true", "TRUE", " 1", "1 ", "yes", true, 0]) {
    expect(isForeignCardFlagEnabled({ FOREIGN_CARD_ENABLED: value })).toBe(false);
    expect(canUseForeignCard(input(), { env: { FOREIGN_CARD_ENABLED: value } })).toEqual(closed("FLAG_OFF"));
  }
  expect(isForeignCardFlagEnabled(undefined)).toBe(false);
  expect(canUseForeignCard(input())).toEqual(closed("FLAG_OFF"));
  expect(canUseForeignCard()).toEqual(closed("FLAG_OFF"));
  // 문자열 강제 비교라 숫자 1 은 켜진다(GIFTS_ENABLED 와 같은 관례).
  expect(isForeignCardFlagEnabled({ FOREIGN_CARD_ENABLED: "1" })).toBe(true);
  expect(isForeignCardFlagEnabled({ FOREIGN_CARD_ENABLED: 1 })).toBe(true);
});

test("🔴 로그인 사용자 id 가 없으면 AUTH_REQUIRED", () => {
  for (const user of [undefined, null, {}, { id: "" }, { email: "t@e.st" }]) {
    expect(canUseForeignCard(input({ user }), ON)).toEqual(closed("AUTH_REQUIRED"));
  }
});

test("판정 순서는 플래그 → 로그인 → 상품 → 결제수단이다", () => {
  const worst = { user: null, product: { type: "physical_goods" }, paymentChannel: "transfer" };
  expect(canUseForeignCard(worst).reason).toBe("FLAG_OFF");
  expect(canUseForeignCard(worst, ON).reason).toBe("AUTH_REQUIRED");
  expect(canUseForeignCard({ ...worst, user: { id: "u1" } }, ON).reason).toBe("PRODUCT_NOT_ELIGIBLE");
  expect(canUseForeignCard({ ...worst, user: { id: "u1" }, product: CONTENT }, ON).reason).toBe("CHANNEL_NOT_SUPPORTED");
});

test("🔴 정책 표의 3유형만 열린다 — 표 밖 유형·프로토타입 키는 닫힌다", () => {
  expect(Object.keys(FOREIGN_CARD_PRODUCT_POLICY).sort()).toEqual(["digital_content", "membership_pass", "membership_pass_gift"]);
  for (const product of [CONTENT, PASS, GIFT]) {
    expect(canUseForeignCard(input({ product }), ON)).toEqual(OPEN);
  }
  for (const type of ["physical_goods", "subscription", "points", "Digital_Content", "constructor", "__proto__", "toString", "hasOwnProperty", "", undefined]) {
    expect(canUseForeignCard(input({ product: { type, durationDays: 30 } }), ON)).toEqual(closed("PRODUCT_NOT_ELIGIBLE"));
  }
  expect(canUseForeignCard(input({ product: undefined }), ON)).toEqual(closed("PRODUCT_NOT_ELIGIBLE"));
});

test("🔴 이용권·선물은 30일 상품만 열린다", () => {
  for (const durationDays of [undefined, null, 0, 29, 31, 365, "30"]) {
    expect(canUseForeignCard(input({ product: { ...PASS, durationDays } }), ON)).toEqual(closed("PRODUCT_NOT_ELIGIBLE"));
    expect(canUseForeignCard(input({ product: { ...GIFT, durationDays } }), ON)).toEqual(closed("PRODUCT_NOT_ELIGIBLE"));
  }
});

test("🔴 결제수단은 일반 카드(card_general)만 — 카카오페이·계좌이체·상품권은 닫힌다", () => {
  for (const paymentChannel of ["card_general", "CARD_GENERAL", " card_general "]) {
    expect(canUseForeignCard(input({ paymentChannel }), ON)).toEqual(OPEN);
  }
  // 코드는 checkout-entry.js 결제수단 표의 orderMethod 그대로다.
  for (const paymentChannel of ["transfer", "kakaopay", "gift_cultureland", "gift_booknlife", "gift_smart_munsang", "CARD", "card", "", undefined, null]) {
    expect(canUseForeignCard(input({ paymentChannel }), ON)).toEqual(closed("CHANNEL_NOT_SUPPORTED"));
  }
});

test("billingCountry 는 결과를 바꾸지 않는다 — 발급국은 결제 전에 알 수 없고 추정하지 않는다", () => {
  for (const [overrides, options] of [[{}, ON], [{}, {}], [{ paymentChannel: "transfer" }, ON]]) {
    const baseline = canUseForeignCard(input({ ...overrides, billingCountry: undefined }), options);
    for (const billingCountry of ["KR", "US", "JP", "", null]) {
      expect(canUseForeignCard(input({ ...overrides, billingCountry }), options)).toEqual(baseline);
    }
  }
});

test("toForeignCardSnapshot — 주문에 남기는 판정은 offered 가 true 일 때만 열림이다", () => {
  const now = new Date("2026-09-17T10:00:00.000Z");
  expect(toForeignCardSnapshot(canUseForeignCard(input(), ON), now)).toEqual({ ...OPEN, decidedAt: now });
  expect(toForeignCardSnapshot(canUseForeignCard(input()), now)).toEqual({ ...closed("FLAG_OFF"), decidedAt: now });
  for (const forged of [null, undefined, {}, { offered: "true" }, { offered: 1 }]) {
    expect(toForeignCardSnapshot(forged, now).offered).toBe(false);
  }
});

test("🔴 narrowToOrderSnapshot — 지금 판정과 주문 스냅숏이 둘 다 열려야 열린다", () => {
  const now = new Date("2026-09-17T10:00:00.000Z");
  const open = canUseForeignCard(input(), ON);
  const openSnapshot = toForeignCardSnapshot(open, now);
  expect(narrowToOrderSnapshot(open, openSnapshot)).toEqual(OPEN);

  // 지금 닫혀 있으면 스냅숏이 열려 있어도 지금 사유로 닫힌다(플래그를 내리면 기존 주문도 즉시 닫힘).
  expect(narrowToOrderSnapshot(canUseForeignCard(input()), openSnapshot)).toEqual(closed("FLAG_OFF"));
  expect(narrowToOrderSnapshot(canUseForeignCard(input({ paymentChannel: "kakaopay" }), ON), openSnapshot)).toEqual(closed("CHANNEL_NOT_SUPPORTED"));
  for (const fresh of [null, undefined, {}, { offered: "true", reason: "ELIGIBLE" }]) {
    expect(narrowToOrderSnapshot(fresh, openSnapshot).offered).toBe(false);
  }

  // 지금 열려 있어도 스냅숏이 닫힘·없음·위조면 ORDER_SNAPSHOT_CLOSED(닫힌 채 만든 주문은 나중에 켜도 닫힘).
  const closedSnapshot = toForeignCardSnapshot(canUseForeignCard(input()), now);
  for (const snapshot of [closedSnapshot, null, undefined, {}, { offered: "true" }, { offered: 1 }]) {
    expect(narrowToOrderSnapshot(open, snapshot)).toEqual(closed("ORDER_SNAPSHOT_CLOSED"));
  }
});
