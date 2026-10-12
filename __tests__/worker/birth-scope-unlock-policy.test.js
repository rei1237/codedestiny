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
  find(filter) {
    const query = { select: () => query, lean: async () => rows.filter((row) => matchesFilter(row, filter)) };
    return query;
  },
};

let grantPermanentUnlock;
let findActivePaidContentUnlock;
let hasPaidUnlockForProfile;
let getUnlockedContentSnapshot;
let listLegacyProfileBirthUnlockKeys;
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
  ({ grantPermanentUnlock, findActivePaidContentUnlock, hasPaidUnlockForProfile, getUnlockedContentSnapshot, listLegacyProfileBirthUnlockKeys } = await import("../../worker/lib/content-unlocks.js"));
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
});

// 출생 기반 전환 이전에 결제한 고객이 다시 잠기면 안 된다(2026-10-11 결정). 새 해금은 BIRTH 로만 쓰므로 scope 로 레거시를 정한다.
describe("I: 전환 이전 USER/PROFILE 행(레거시)은 계속 열린다", () => {
  const legacyRow = (extra) => ({ userId: TEST_USER_ID, serviceKey: "saju", status: "ACTIVE", expiresAt: null, ...extra });

  test("USER 행은 계정의 모든 프로필에서, 프로필 없이도 열린다", async () => {
    rows.push(
      legacyRow({ profileId: "__user__", scope: "USER", serviceKey: "paid_content", contentKey: "rpt_quantumCard", featureKey: "rpt_quantumCard" }),
      // 2026-06 무렵 행은 featureKey 없이 contentKey 만 있다.
      legacyRow({ profileId: "__user__", scope: "USER", contentKey: "saju.daeunAnalysis" }),
    );

    for (const featureKey of ["rpt_quantumCard", "section_daewun"]) {
      expect(await opens(featureKey, "p1")).toBe(true);
      expect(await opens(featureKey, "p2")).toBe(true);
      expect(await findActivePaidContentUnlock({ userId: TEST_USER_ID, featureKey })).not.toBeNull();
    }
    expect(await opens("section_summary", "p1")).toBe(false);
  });

  test("PROFILE 행은 그 프로필에서만 열리고, 생년월일을 고쳐도 열린다", async () => {
    rows.push(legacyRow({ profileId: "p1", scope: "PROFILE", contentKey: "saju.fullReading", featureKey: "section_summary" }));
    const card = cards.find((item) => item.profileId === "p1");

    expect(await opens("section_summary", "p1")).toBe(true);
    card.birth = { ...card.birth, day: 18 };
    expect(await opens("section_summary", "p1")).toBe(true);
    expect(await opens("section_summary", "p1-twin")).toBe(false);
    expect(await opens("section_summary", "p2")).toBe(false);
    expect(await findActivePaidContentUnlock({ userId: TEST_USER_ID, featureKey: "section_summary" })).toBeNull();
  });

  test("궁합 PROFILE 행도 그 프로필에서 열린다", async () => {
    rows.push(legacyRow({ profileId: "p1", scope: "PROFILE", contentKey: "saju.compatibility", featureKey: "section_compat" }));

    expect(await opens("section_compat", "p1", { partnerProfileId: "p2" })).toBe(true);
    expect(await opens("section_compat", "p2", { partnerProfileId: "p1" })).toBe(false);
  });

  test("스냅샷은 레거시로 열린 키를 계정(USER)·프로필(PROFILE)로 나눠 싣는다", async () => {
    rows.push(
      legacyRow({ profileId: "__user__", scope: "USER", contentKey: "saju.daeunAnalysis" }),
      legacyRow({ profileId: "p1", scope: "PROFILE", contentKey: "saju.fullReading", featureKey: "section_summary" }),
    );
    await grant("rpt_quantumCard");

    const onP1 = await getUnlockedContentSnapshot({ userId: TEST_USER_ID, profileId: "p1" });
    expect(onP1.featureKeys.sort()).toEqual(["rpt_quantumCard", "section_daewun", "section_summary"]);
    expect(onP1.legacyAccountFeatureKeys).toEqual(["section_daewun"]);
    expect(onP1.legacyProfileFeatureKeys).toEqual(["section_summary"]);

    // 저장 프로필 없이도 계정 레거시 키는 실린다. BIRTH 행·다른 카드의 PROFILE 행은 실리지 않는다.
    const noProfile = await getUnlockedContentSnapshot({ userId: TEST_USER_ID });
    expect(noProfile.featureKeys).toEqual(["section_daewun"]);
    expect(noProfile.legacyAccountFeatureKeys).toEqual(["section_daewun"]);
    expect(noProfile.legacyProfileFeatureKeys).toEqual([]);

    const onP2 = await getUnlockedContentSnapshot({ userId: TEST_USER_ID, profileId: "p2" });
    expect(onP2.featureKeys).toEqual(["section_daewun"]);
  });

  test("카드 수정 감사용: 그 카드의 레거시 PROFILE 출생 기반 키만 고른다", async () => {
    rows.push(
      legacyRow({ profileId: "p1", scope: "PROFILE", contentKey: "saju.fullReading" }),
      legacyRow({ profileId: "p1", scope: "PROFILE", serviceKey: "flower", contentKey: "flower-fc", featureKey: "flower-fc" }),
      legacyRow({ profileId: "__user__", scope: "USER", contentKey: "saju.daeunAnalysis" }),
    );
    await grant("section_daewun");

    expect(await listLegacyProfileBirthUnlockKeys({ userId: TEST_USER_ID, profileId: "p1" })).toEqual(["section_summary"]);
    expect(await listLegacyProfileBirthUnlockKeys({ userId: TEST_USER_ID, profileId: "p2" })).toEqual([]);
  });

  test("만료·비활성 레거시 행은 열지 않는다", async () => {
    rows.push(
      legacyRow({ profileId: "__user__", scope: "USER", contentKey: "saju.daeunAnalysis", status: "REFUNDED" }),
      legacyRow({ profileId: "p1", scope: "PROFILE", contentKey: "saju.fullReading", expiresAt: new Date("2026-01-01T00:00:00Z") }),
    );

    expect(await opens("section_daewun", "p1")).toBe(false);
    expect(await opens("section_summary", "p1")).toBe(false);
  });

  test.each([
    ["section_summary", "USER"],
    ["section_daewun", "PROFILE"],
    ["rpt_quantumCard", "USER"],
  ])("%s: scope %s 를 요구해도 새 해금은 레거시 행으로 쓰지 않는다", async (featureKey, scope) => {
    await grant(featureKey, { scope });

    expect(rows.map((row) => row.scope)).toEqual(["BIRTH"]);
  });
});

describe("D: 생년월일 수정", () => {
  // 2026-10-11 부터 카드 수정이 무료라, 이 재잠금이 "남의 출생 정보로 고쳐 공짜로 보기"를 막는 유일한 장치다.
  // 예외: 전환 이전 레거시 PROFILE 행은 고쳐도 열린다(I 절 — 재잠금 방지, 수정은 로그로만 감시).
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
