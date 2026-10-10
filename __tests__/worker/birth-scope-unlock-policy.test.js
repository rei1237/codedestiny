/**
 * @jest-environment node
 *
 * 출생 기반 영구 해금 정책(A–H)을 한 곳에서 고정한다. 해금 신원은 userId + birthKey + contentKey 이고,
 * birthKey 는 서버에 저장된 이 계정의 ProfileCard 출생 정보로만 만든다.
 *
 * 실제 쓰기(grantPermanentUnlock)가 만든 행을 메모리 저장소에 넣고, 실제 읽기(findActivePaidContentUnlock)
 * 필터로 다시 찾는다 — 쓰기·읽기를 따로 보는 테스트로는 둘의 신원 불일치를 못 잡는다.
 * G·H 의 브라우저 쪽(로컬 저장·직접 입력 차단)은 __tests__/ui 정적 테스트가 본다. 여기서는 서버 판정만 본다.
 */

import { jest } from "@jest/globals";
import { OTHER_USER_ID, TEST_USER_ID, profileCardModel, testCard } from "../fixtures/profile-card-model.mjs";

const rows = [];
const cards = [];

function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$and") return condition.every((clause) => matchesFilter(doc, clause));
    if (key === "$or") return condition.some((clause) => matchesFilter(doc, clause));
    return matchesValue(doc[key], condition);
  });
}

function matchesValue(value, condition) {
  if (condition === null) return value === null || value === undefined;
  if (condition instanceof Date || typeof condition !== "object") return value === condition;
  if ("$in" in condition) return condition.$in.includes(value);
  if ("$gt" in condition) return value != null && value > condition.$gt;
  if ("$exists" in condition) return (value !== undefined) === condition.$exists;
  return value === condition;
}

function equalityFields(filter) {
  return Object.fromEntries(Object.entries(filter).filter(([key, value]) => !key.startsWith("$") && (value === null || typeof value !== "object")));
}

const ContentEntitlement = {
  findOneAndUpdate(filter, update, options = {}) {
    const run = async () => {
      let doc = rows.find((row) => matchesFilter(row, filter));
      if (!doc) {
        if (!options.upsert) return null;
        doc = { _id: `row-${rows.length + 1}`, ...equalityFields(filter), ...update.$setOnInsert };
        rows.push(doc);
      }
      Object.assign(doc, update.$set);
      return { ...doc };
    };
    const query = { session: () => query, lean: run };
    return query;
  },
  findOne(filter) {
    const query = { select: () => query, session: () => query, lean: async () => rows.find((row) => matchesFilter(row, filter)) || null };
    return query;
  },
};

let grantPermanentUnlock;
let findActivePaidContentUnlock;
let hasPaidUnlockForProfile;
let hasUserScopedPermanentUnlock;
let resolveBirthUnlockIdentity;

beforeAll(async () => {
  await jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    CONTENT_ENTITLEMENT_SCOPES: { PROFILE: "PROFILE", USER: "USER", BIRTH: "BIRTH" },
    CONTENT_ENTITLEMENT_SOURCES: {
      COIN: "COIN",
      PAYMENT: "PAYMENT",
      PASS: "PASS",
      MONTHLY: "MONTHLY",
      ADMIN: "ADMIN",
      BACKFILL: "BACKFILL",
    },
    CONTENT_ENTITLEMENT_STATUSES: { ACTIVE: "ACTIVE", REFUNDED: "REFUNDED", CANCELLED: "CANCELLED" },
    ContentEntitlement,
    SAJU_LOCKED_CONTENT_KEYS: {
      DAEUN_ANALYSIS: "saju.daeunAnalysis",
      FULL_READING: "saju.fullReading",
      COMPATIBILITY: "saju.compatibility",
    },
    ProfileCard: profileCardModel(cards),
    User: {},
  }));
  ({ grantPermanentUnlock, findActivePaidContentUnlock, hasPaidUnlockForProfile } = await import("../../worker/lib/content-unlocks.js"));
  ({ hasUserScopedPermanentUnlock } = await import("../../worker/lib/paid-content-read-access.js"));
  ({ resolveBirthUnlockIdentity } = await import("../../worker/lib/birth-scoped-unlock-identity.js"));
});

beforeEach(() => {
  rows.length = 0;
  cards.length = 0;
  cards.push(
    testCard("p1"),
    testCard("p2", { year: 1992, month: 11, day: 3 }),
    testCard("p1-twin"), // 같은 계정·같은 생년월일·시각·성별의 다른 카드
    testCard("p1-male", { gender: "M" }),
    testCard("p1-minute", { minute: 31 }),
    testCard("other-1", { userId: OTHER_USER_ID }), // 다른 계정, 같은 출생 정보
  );
});

const grant = (featureKey, extra = {}) => grantPermanentUnlock({
  userId: TEST_USER_ID,
  profileId: "p1",
  featureKey,
  source: "COIN",
  orderId: `order-${featureKey}`,
  ...extra,
});

const opens = async (featureKey, profileId, extra = {}) => hasPaidUnlockForProfile({
  userId: TEST_USER_ID,
  profileId,
  featureKey,
  ...extra,
});

describe("A·B: 전체 풀이·대운은 출생 정보 단위로 열린다", () => {
  test.each(["section_summary", "section_daewun"])("%s: 다른 생년월일 프로필은 잠기고 같은 출생 정보 카드는 열린다", async (featureKey) => {
    await grant(featureKey);

    expect(await opens(featureKey, "p1")).toBe(true);
    expect(await opens(featureKey, "p1-twin")).toBe(true);
    expect(await opens(featureKey, "p2")).toBe(false);
    // 성별·분이 다르면 다른 사람이다.
    expect(await opens(featureKey, "p1-male")).toBe(false);
    expect(await opens(featureKey, "p1-minute")).toBe(false);
  });

  test("궁합은 본인·상대 출생 정보 쌍으로 열리고, 상대를 바꾸거나 순서를 뒤집으면 잠긴다", async () => {
    await grant("section_compat", { partnerProfileId: "p2" });

    expect(await opens("section_compat", "p1", { partnerProfileId: "p2" })).toBe(true);
    expect(await opens("section_compat", "p1-twin", { partnerProfileId: "p2" })).toBe(true);
    expect(await opens("section_compat", "p1", { partnerProfileId: "p1-male" })).toBe(false);
    expect(await opens("section_compat", "p2", { partnerProfileId: "p1" })).toBe(false);
    expect(await opens("section_compat", "p1")).toBe(false);
  });

  test("궁합 구매는 저장된 상대 프로필이 없으면 거절한다", async () => {
    await expect(grant("section_compat")).rejects.toMatchObject({ code: "MISSING_PROFILE_ID" });
    await expect(grant("section_compat", { partnerProfileId: "other-1" })).rejects.toMatchObject({ code: "INVALID_PROFILE" });
  });
});

describe("C: 추가 리포트(rpt_*)도 계정 공유가 아니다", () => {
  test("다른 생년월일 프로필은 따로 사야 한다", async () => {
    await grant("rpt_quantumCard");

    expect(await opens("rpt_quantumCard", "p1")).toBe(true);
    expect(await opens("rpt_quantumCard", "p2")).toBe(false);
  });

  test("전환 이전 USER/PROFILE 행은 근거가 아니다", async () => {
    rows.push(
      { userId: TEST_USER_ID, profileId: "__user__", scope: "USER", serviceKey: "saju", contentKey: "rpt_quantumCard", featureKey: "rpt_quantumCard", status: "ACTIVE", expiresAt: null },
      { userId: TEST_USER_ID, profileId: "p1", scope: "PROFILE", serviceKey: "saju", contentKey: "saju.fullReading", featureKey: "section_summary", status: "ACTIVE", expiresAt: null },
    );

    expect(await opens("rpt_quantumCard", "p1")).toBe(false);
    expect(await opens("section_summary", "p1")).toBe(false);
  });
});

describe("D: 생년월일 수정", () => {
  // 2026-10-11 부터 카드 수정이 무료라, 이 재잠금이 "남의 출생 정보로 고쳐 공짜로 보기"를 막는 유일한 장치다.
  test("결제한 카드에서 열리고, 고치면 다시 잠기고, 되돌리면 다시 열린다", async () => {
    await grant("section_summary");
    const card = cards.find((item) => item.profileId === "p1");
    expect(await opens("section_summary", "p1")).toBe(true);

    card.birth = { ...card.birth, day: 18 };
    expect(await opens("section_summary", "p1")).toBe(false);

    card.birth = { ...card.birth, day: 17 };
    expect(await opens("section_summary", "p1")).toBe(true);
  });

  test("고친 생년월일로 다시 사면 원래 출생 정보의 해금은 그대로 남는다", async () => {
    await grant("section_summary");
    const card = cards.find((item) => item.profileId === "p1");
    card.birth = { ...card.birth, day: 18 };
    await grant("section_summary", { orderId: "order-2" });

    expect(rows.filter((row) => row.scope === "BIRTH")).toHaveLength(2);
    expect(await opens("section_summary", "p1-twin")).toBe(true);
  });
});

describe("E: 프로필 없음 · USER · 남의 프로필", () => {
  test("profileId 없이는 지급하지 않는다", async () => {
    await expect(grant("section_summary", { profileId: "" })).rejects.toMatchObject({ code: "MISSING_PROFILE_ID" });
    await expect(grant("section_summary", { profileId: "__user__" })).rejects.toMatchObject({ code: "MISSING_PROFILE_ID" });
    expect(rows).toHaveLength(0);
  });

  test("다른 계정의 프로필로는 지급하지 않는다", async () => {
    await expect(grant("section_summary", { profileId: "other-1" })).rejects.toMatchObject({ code: "INVALID_PROFILE" });
    expect(rows).toHaveLength(0);
  });

  test("클라이언트가 보낸 합성 신원(birth:…)은 받지 않는다", async () => {
    await expect(resolveBirthUnlockIdentity({ userId: TEST_USER_ID, profileId: `birth:${"a".repeat(64)}`, featureKey: "section_summary" }))
      .rejects.toMatchObject({ code: "MISSING_PROFILE_ID" });
  });

  test("scope: USER 를 요구해도 BIRTH 행으로 쓴다", async () => {
    await grant("section_summary", { scope: "USER" });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ scope: "BIRTH", purchaseProfileId: "p1" });
    expect(rows[0].profileId).toMatch(/^birth:[0-9a-f]{64}$/);
    expect(await opens("section_summary", "p2")).toBe(false);
  });

  test("profileId 없이 조회하면 잠금이다", async () => {
    await grant("section_summary");

    expect(await findActivePaidContentUnlock({ userId: TEST_USER_ID, featureKey: "section_summary" })).toBeNull();
  });

  test("같은 출생 정보라도 다른 계정은 잠긴다", async () => {
    await grant("section_summary");

    expect(await hasPaidUnlockForProfile({ userId: OTHER_USER_ID, profileId: "other-1", featureKey: "section_summary" })).toBe(false);
  });

  test("응답에는 합성 신원 대신 요청한 프로필 id 가 실린다", async () => {
    await grant("section_summary");

    const doc = await findActivePaidContentUnlock({ userId: TEST_USER_ID, profileId: "p1-twin", featureKey: "section_summary" });
    expect(doc.profileId).toBe("p1-twin");
  });
});

describe("F: 이용권 차감 판단(이미 산 출생 정보인가)", () => {
  test("새 출생 정보는 미보유(차감 대상), 같은 출생 정보는 보유(차감 없음)", async () => {
    await grant("section_summary", { source: "PASS", passId: "membership:pro:req-1" });

    expect(await findActivePaidContentUnlock({ userId: TEST_USER_ID, profileId: "p2", featureKey: "section_summary" })).toBeNull();
    expect(await findActivePaidContentUnlock({ userId: TEST_USER_ID, profileId: "p1-twin", featureKey: "section_summary" })).not.toBeNull();
  });

  test("같은 출생 정보로 두 번 지급해도 행은 하나다", async () => {
    await grant("section_summary", { orderId: "order-1" });
    await grant("section_summary", { profileId: "p1-twin", orderId: "order-2" });

    expect(rows).toHaveLength(1);
  });
});

describe("G: 계정 배열은 출생 기반 키의 근거가 아니다", () => {
  test("unlockedFeatures 에 있어도 출생 기반 키는 열리지 않고, 계정 기반 키는 그대로 열린다", async () => {
    const unlockedFeatures = ["section_summary", "rpt_quantumCard", "tetogen_deep_report"];

    expect(await hasUserScopedPermanentUnlock({}, { userId: TEST_USER_ID, featureKey: "section_summary", unlockedFeatures })).toBe(false);
    expect(await hasUserScopedPermanentUnlock({}, { userId: TEST_USER_ID, featureKey: "rpt_quantumCard", unlockedFeatures })).toBe(false);
    expect(await hasUserScopedPermanentUnlock({}, { userId: TEST_USER_ID, featureKey: "tetogen_deep_report", unlockedFeatures })).toBe(true);
  });
});

describe("H: 저장하지 않은(직접 입력) 출생 정보", () => {
  test("저장된 프로필이 아닌 id 로는 사지도 열지도 못한다", async () => {
    await expect(grant("section_summary", { profileId: "direct-input" })).rejects.toMatchObject({ code: "INVALID_PROFILE" });
    expect(await opens("section_summary", "direct-input")).toBe(false);
  });
});
