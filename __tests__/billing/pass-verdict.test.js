/**
 * 이용권 판정 공용 모듈(js/core/pass-verdict.js) 단위 검증.
 *
 * 이 모듈은 정적 셸·React·독립 정적 페이지 세 런타임이 공유하는 유일한 판정 정본이라,
 * 여기가 틀리면 세 곳이 함께 틀린다. 특히 "한 번 조회한 이용권은 만료 전까지 서버 왕복 없이
 * 유지된다"는 성질과 "만료된 이용권은 어떤 경우에도 살아남지 않는다"는 성질을 함께 고정한다.
 */

const passVerdict = require("../../js/core/pass-verdict.js");

const USER_ID = "6650aa11bb22cc33dd44ee55";
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    has: (key) => map.has(key),
    size: () => map.size,
  };
}

function seed(storage, snapshot) {
  storage.setItem(passVerdict.snapshotKey(USER_ID), JSON.stringify({
    userId: USER_ID,
    purchaseVersion: "",
    source: "test",
    ...snapshot,
  }));
}

let storage;

beforeEach(() => {
  storage = makeStorage();
  global.localStorage = storage;
});

afterEach(() => {
  delete global.localStorage;
});

describe("passLimitForTier", () => {
  it("등급별 한도가 결제 정책과 일치한다", () => {
    // 2026-08-24 적용 가격 범위: 5,000 / 10,000 / 20,000원 (코인 = 원/100)
    expect(passVerdict.passLimitForTier("standard")).toBe(50);
    expect(passVerdict.passLimitForTier("premium")).toBe(100);
    expect(passVerdict.passLimitForTier("vvip")).toBe(200);
    expect(passVerdict.passLimitForTier("family")).toBe(999999999);
    expect(passVerdict.passLimitForTier("free")).toBe(0);
    expect(passVerdict.passLimitForTier(undefined)).toBe(0);
  });

  it("서버가 쓰는 별칭 표기도 같은 등급으로 정규화한다", () => {
    expect(passVerdict.normalizeTier("GOLD")).toBe("vvip");
    expect(passVerdict.normalizeTier("SILVER")).toBe("premium");
    expect(passVerdict.normalizeTier("BRONZE")).toBe("standard");
    expect(passVerdict.normalizeTier("프리미엄")).toBe("premium");
    expect(passVerdict.normalizeTier("Code Destiny Family")).toBe("family");
  });
});

describe("readSnapshot — active 는 만료일이 유효기간이다", () => {
  it("🔴 TTL 을 넘겼어도 이용권 만료일이 남아 있으면 커버 판정을 유지한다(서버 왕복 0)", () => {
    seed(storage, {
      state: "active",
      tier: "premium",
      expiresAt: new Date(Date.now() + 20 * DAY).toISOString(),
      checkedAt: Date.now() - 10 * MINUTE, // ACTIVE_TTL(5분) 초과
    });

    const snapshot = passVerdict.readSnapshot(USER_ID);
    expect(snapshot).not.toBeNull();
    expect(snapshot.stale).toBe(true);
    expect(storage.has(passVerdict.snapshotKey(USER_ID))).toBe(true);

    const verdict = passVerdict.resolveVerdict(snapshot, 30);
    expect(verdict.coversNow).toBe(true);
    expect(verdict.cannotCover).toBe(false);
  });

  it("TTL 안이면 stale 이 아니다", () => {
    seed(storage, {
      state: "active",
      tier: "standard",
      expiresAt: new Date(Date.now() + 5 * DAY).toISOString(),
      checkedAt: Date.now() - MINUTE,
    });
    const snapshot = passVerdict.readSnapshot(USER_ID);
    expect(snapshot.stale).toBe(false);
    expect(passVerdict.resolveVerdict(snapshot, 30).coversNow).toBe(true);
  });

  it("이용권이 만료됐으면 TTL 과 무관하게 폐기한다", () => {
    seed(storage, {
      state: "active",
      tier: "vvip",
      expiresAt: new Date(Date.now() - MINUTE).toISOString(),
      checkedAt: Date.now(),
    });
    expect(passVerdict.readSnapshot(USER_ID)).toBeNull();
    expect(storage.has(passVerdict.snapshotKey(USER_ID))).toBe(false);
  });

  // 지켜야 할 불변식은 "삭제한다"가 아니라 **"무기한 무료 통과를 만들지 않는다"** 이다.
  // 예전에는 TTL 초과 즉시 삭제해서 그걸 달성했는데, 그러면 storeStatus 의 다운그레이드 가드가
  // 지킬 대상을 잃어 그 뒤 도착한 신뢰 불가 'none'(토큰 폴백)이 '미보유 확정'으로 굳었다.
  // 이제는 stale 로 보존하되 coversNow=false 로 무료 통과를 막는다 — 불변식은 더 강하게 단언한다.
  it("만료일을 모르는 active 는 TTL 을 넘겨도 무료 통과를 만들지 않는다", () => {
    seed(storage, {
      state: "active",
      tier: "premium",
      expiresAt: null,
      checkedAt: Date.now() - 10 * MINUTE,
    });
    const snapshot = passVerdict.readSnapshot(USER_ID);
    expect(snapshot).not.toBeNull();
    expect(snapshot.stale).toBe(true);
    // 핵심: 낙관 통과 후보가 되지 않는다(서버 검사로 폴백).
    expect(passVerdict.resolveVerdict(snapshot, 10).coversNow).toBe(false);
  });

  it("만료일을 모르는 active 도 하드 상한(24h)을 넘기면 폐기한다", () => {
    seed(storage, {
      state: "active",
      tier: "premium",
      expiresAt: null,
      checkedAt: Date.now() - 25 * HOUR,
    });
    expect(passVerdict.readSnapshot(USER_ID)).toBeNull();
    expect(storage.has(passVerdict.snapshotKey(USER_ID))).toBe(false);
  });

  it("만료일을 모르는 active 도 TTL 안이면 그대로 쓴다(종전 동작 보존)", () => {
    seed(storage, {
      state: "active",
      tier: "premium",
      expiresAt: null,
      checkedAt: Date.now() - MINUTE,
    });
    const snapshot = passVerdict.readSnapshot(USER_ID);
    expect(snapshot).not.toBeNull();
    expect(snapshot.stale).toBe(false);
  });

  it("절대 상한(35일)을 넘긴 active 는 만료일이 남아 있어도 폐기한다", () => {
    seed(storage, {
      state: "active",
      tier: "vvip",
      expiresAt: new Date(Date.now() + 10 * DAY).toISOString(),
      checkedAt: Date.now() - 40 * DAY,
    });
    expect(passVerdict.readSnapshot(USER_ID)).toBeNull();
  });
});

describe("readSnapshot — none 은 SWR", () => {
  it("TTL 을 넘겨도 allowStaleNone 이면 미보유 확정으로 쓴다", () => {
    seed(storage, { state: "none", tier: "free", expiresAt: null, checkedAt: Date.now() - HOUR });
    const snapshot = passVerdict.readSnapshot(USER_ID, { allowStaleNone: true });
    expect(snapshot.stale).toBe(true);
    expect(passVerdict.resolveVerdict(snapshot, 30).cannotCover).toBe(true);
    expect(storage.has(passVerdict.snapshotKey(USER_ID))).toBe(true);
  });

  it("allowStaleNone 이 없으면 종전대로 폐기한다", () => {
    seed(storage, { state: "none", tier: "free", expiresAt: null, checkedAt: Date.now() - HOUR });
    expect(passVerdict.readSnapshot(USER_ID)).toBeNull();
  });

  it("24시간 상한을 넘기면 폐기한다", () => {
    seed(storage, { state: "none", tier: "free", expiresAt: null, checkedAt: Date.now() - 25 * HOUR });
    expect(passVerdict.readSnapshot(USER_ID, { allowStaleNone: true })).toBeNull();
  });
});

describe("readSnapshot — 계정·위조 방어", () => {
  it("다른 사용자의 스냅샷은 읽지 않고 지운다", () => {
    storage.setItem(passVerdict.snapshotKey(USER_ID), JSON.stringify({
      userId: "someone-else",
      state: "active",
      tier: "vvip",
      expiresAt: new Date(Date.now() + DAY).toISOString(),
      checkedAt: Date.now(),
    }));
    expect(passVerdict.readSnapshot(USER_ID)).toBeNull();
    expect(storage.has(passVerdict.snapshotKey(USER_ID))).toBe(false);
  });

  it("checkedAt 이 먼 미래로 적힌 스냅샷은 폐기한다(영원히 신선해지는 것을 막는다)", () => {
    seed(storage, {
      state: "active",
      tier: "vvip",
      expiresAt: new Date(Date.now() + 10 * DAY).toISOString(),
      checkedAt: Date.now() + 3 * DAY,
    });
    expect(passVerdict.readSnapshot(USER_ID)).toBeNull();
  });

  it("state:'active' 인데 등급이 free 면 폐기한다", () => {
    seed(storage, { state: "active", tier: "free", expiresAt: null, checkedAt: Date.now() });
    expect(passVerdict.readSnapshot(USER_ID)).toBeNull();
  });

  it("userId 가 없으면 아무것도 읽지 않는다", () => {
    expect(passVerdict.readSnapshot("")).toBeNull();
  });
});

describe("resolveVerdict — 한도 판정", () => {
  const activeSnapshot = (tier) => ({
    userId: USER_ID,
    state: "active",
    tier,
    expiresAt: new Date(Date.now() + 10 * DAY).toISOString(),
    checkedAt: Date.now(),
    purchaseVersion: "",
    source: "test",
    stale: false,
  });

  it("가격이 등급 한도를 넘으면 미커버 확정이다", () => {
    // standard 상한은 50코인(5,000원)이므로 51코인이 경계 바깥이다.
    const verdict = passVerdict.resolveVerdict(activeSnapshot("standard"), 51);
    expect(verdict.coversNow).toBe(false);
    expect(verdict.cannotCover).toBe(true);
  });

  it("가격이 등급 한도와 정확히 같으면 커버 확정이다", () => {
    const verdict = passVerdict.resolveVerdict(activeSnapshot("standard"), 50);
    expect(verdict.coversNow).toBe(true);
    expect(verdict.cannotCover).toBe(false);
  });

  it("vvip 는 200코인까지 커버하고 201코인부터 미커버 확정이다", () => {
    expect(passVerdict.resolveVerdict(activeSnapshot("vvip"), 200).coversNow).toBe(true);
    expect(passVerdict.resolveVerdict(activeSnapshot("vvip"), 201).cannotCover).toBe(true);
  });

  it("family 는 금액과 무관하게 커버한다 — 건당 상한이 없는 유일한 등급이다", () => {
    // 🔴 2026-08-24: '프리미엄 상담 포함 횟수'(기간당 10회)가 폐지돼, 300코인 이상을
    //    '미확정'으로 남길 이유가 사라졌다. 남은 제약은 월 이용 한도 하나이고 그건
    //    아래 별도 분기(monthlySpendRemainingCoin)가 판정한다.
    for (const cost of [299, 300, 500, 100000]) {
      const verdict = passVerdict.resolveVerdict(activeSnapshot("family"), cost);
      expect(verdict.coversNow).toBe(true);
      expect(verdict.cannotCover).toBe(false);
    }
  });

  it("가격이 0이면 어느 쪽도 확정하지 않는다", () => {
    const verdict = passVerdict.resolveVerdict(activeSnapshot("premium"), 0);
    expect(verdict.coversNow).toBe(false);
    expect(verdict.cannotCover).toBe(false);
  });

  it("스냅샷이 없으면 어느 쪽도 확정하지 않는다(서버 판정으로 넘긴다)", () => {
    const verdict = passVerdict.resolveVerdict(null, 30);
    expect(verdict.coversNow).toBe(false);
    expect(verdict.cannotCover).toBe(false);
  });
});

describe("buildSnapshotFromStatus / storeStatus", () => {
  it("만료일이 미래면 active 로 저장하고 그대로 읽힌다", () => {
    const expiresAt = new Date(Date.now() + 12 * DAY).toISOString();
    const stored = passVerdict.storeStatus(USER_ID, { tier: "premium", isActive: true, expiresAt }, "unit-test");
    expect(stored.state).toBe("active");
    expect(stored.expiresAt).toBe(expiresAt);

    const roundTrip = passVerdict.readSnapshot(USER_ID);
    expect(roundTrip.state).toBe("active");
    expect(roundTrip.tier).toBe("premium");
    expect(roundTrip.expiresAt).toBe(expiresAt);
  });

  it("paymentOptions.expiresAt 만 있어도 만료일을 집어낸다(unlock-status?scope=pass 응답 형태)", () => {
    const expiresAt = new Date(Date.now() + 7 * DAY).toISOString();
    const snapshot = passVerdict.buildSnapshotFromStatus(USER_ID, {
      paymentOptions: { hasActivePass: true, passTier: "vvip", expiresAt },
    }, "unlock-status");
    expect(snapshot.state).toBe("active");
    expect(snapshot.tier).toBe("vvip");
    expect(snapshot.expiresAt).toBe(expiresAt);
  });

  it("만료된 응답은 none 으로 저장한다", () => {
    const snapshot = passVerdict.buildSnapshotFromStatus(USER_ID, {
      tier: "vvip",
      isActive: true,
      expiresAt: new Date(Date.now() - DAY).toISOString(),
    }, "unit-test");
    expect(snapshot.state).toBe("none");
    expect(snapshot.tier).toBe("free");
    expect(snapshot.expiresAt).toBeNull();
  });

  it("비활성 상태 문자열은 none 으로 저장한다", () => {
    const snapshot = passVerdict.buildSnapshotFromStatus(USER_ID, { tier: "premium", status: "refunded" }, "unit-test");
    expect(snapshot.state).toBe("none");
  });
});

describe("coverageFromSnapshot — 기존 런타임이 쓰던 모양 유지", () => {
  it("none 의 source 는 고정 문자열이다(호출부가 payment_required 의 reason 으로 쓴다)", () => {
    const snapshot = { userId: USER_ID, state: "none", tier: "free", expiresAt: null, checkedAt: Date.now(), purchaseVersion: "", source: "membership-cache", stale: false };
    const coverage = passVerdict.coverageFromSnapshot(snapshot, 30);
    expect(coverage.canUseByPass).toBe(false);
    expect(coverage.hasActivePass).toBe(false);
    expect(coverage.source).toBe("subscription_snapshot_none");
  });

  it("active 는 등급 한도를 freeLimit/passLimit 양쪽에 채운다", () => {
    const snapshot = { userId: USER_ID, state: "active", tier: "vvip", expiresAt: new Date(Date.now() + DAY).toISOString(), checkedAt: Date.now(), purchaseVersion: "", source: "server", stale: false };
    const coverage = passVerdict.coverageFromSnapshot(snapshot, 100);
    expect(coverage.canUseByPass).toBe(true);
    expect(coverage.freeLimit).toBe(200);
    expect(coverage.passLimit).toBe(200);
    expect(coverage.coinCost).toBe(100);
    expect(coverage.passTier).toBe("vvip");
  });
});

describe("snapshot authority downgrade protection", () => {
  it("keeps an active pass when a degraded partial response says free", () => {
    const expiresAt = new Date(Date.now() + DAY).toISOString();
    passVerdict.storeStatus(USER_ID, {
      tier: "premium",
      isActive: true,
      expiresAt,
      completeness: "full",
      authority: "server",
    }, "access-state");

    const stored = passVerdict.storeStatus(USER_ID, {
      tier: "free",
      isActive: false,
      completeness: "partial",
      authority: "cache",
      degraded: true,
    }, "access-state-stale");

    expect(stored.state).toBe("active");
    expect(stored.tier).toBe("premium");
    expect(stored.expiresAt).toBe(expiresAt);
  });

  it("allows a full authoritative server response to revoke a pass", () => {
    passVerdict.storeStatus(USER_ID, {
      tier: "premium",
      isActive: true,
      expiresAt: new Date(Date.now() + DAY).toISOString(),
      completeness: "full",
      authority: "server",
    }, "access-state");

    const stored = passVerdict.storeStatus(USER_ID, {
      tier: "free",
      isActive: false,
      completeness: "full",
      authority: "server",
    }, "access-state");

    expect(stored.state).toBe("none");
    expect(stored.tier).toBe("free");
  });
});

// 🔴 프로덕션 사고 경로의 회귀 테스트.
// /api/auth/me 가 Mongo 블립에서 JWT 만으로 답하면(worker/routes/auth.js buildTokenFallbackUser)
// profileSubscription 이 실제 구독과 무관하게 무조건 {tier:'free', source:'token'} 이고,
// 그 응답에는 degraded:true 가 붙지 않는다. 이걸 저장하면 진짜 이용권 보유자에게
// 'none'(미보유 확정) 스냅샷이 생겨 **서버 왕복 0으로** 결제창에 보내진다.
describe("신뢰할 수 없는 출처는 '미보유 확정'을 만들 수 없다", () => {
  const TOKEN_FALLBACK_SUBSCRIPTION = {
    tier: "free",
    isActive: false,
    isSubscribed: false,
    status: "free",
    source: "token",
    expiresAt: null,
  };

  it("스냅샷이 없을 때 토큰 폴백은 none 을 생성하지 않는다", () => {
    const stored = passVerdict.storeStatus(USER_ID, TOKEN_FALLBACK_SUBSCRIPTION, "verified-auth-cache");
    expect(stored).toBeNull();
    expect(storage.has(passVerdict.snapshotKey(USER_ID))).toBe(false);
  });

  it("토큰 폴백은 기존 active 를 덮어쓰지 않는다", () => {
    const expiresAt = new Date(Date.now() + DAY).toISOString();
    passVerdict.storeStatus(USER_ID, {
      tier: "premium",
      isActive: true,
      expiresAt,
      completeness: "full",
      authority: "server",
    }, "access-state");

    const stored = passVerdict.storeStatus(USER_ID, TOKEN_FALLBACK_SUBSCRIPTION, "verified-auth-cache");
    expect(stored.state).toBe("active");
    expect(stored.tier).toBe("premium");
  });

  it("degraded 응답도 none 을 생성하지 않는다", () => {
    const stored = passVerdict.storeStatus(USER_ID, {
      tier: "free",
      isActive: false,
      degraded: true,
    }, "subscription-status");
    expect(stored).toBeNull();
    expect(storage.has(passVerdict.snapshotKey(USER_ID))).toBe(false);
  });

  it("정상 서버 응답의 none 은 그대로 기록된다(과잉 차단 아님)", () => {
    const stored = passVerdict.storeStatus(USER_ID, {
      tier: "free",
      isActive: false,
      completeness: "full",
      authority: "server",
    }, "subscription-status");
    expect(stored).not.toBeNull();
    expect(stored.state).toBe("none");
  });
});

describe("resolveVerdict — 월 이용 한도(monthlySpendRemainingCoin)", () => {
  const activeSnapshot = (tier, extra = {}) => ({
    userId: USER_ID,
    state: "active",
    tier,
    expiresAt: new Date(Date.now() + 10 * DAY).toISOString(),
    checkedAt: Date.now(),
    purchaseVersion: "",
    source: "test",
    stale: false,
    ...extra,
  });

  it("네 등급 모두 남은 한도 0 이면 10코인도 미커버 확정이고 사유는 monthly_pass_limit_exceeded 다", () => {
    for (const tier of ["standard", "premium", "vvip", "family"]) {
      const verdict = passVerdict.resolveVerdict(activeSnapshot(tier, { monthlySpendRemainingCoin: 0 }), 10);
      expect(verdict.coversNow).toBe(false);
      expect(verdict.cannotCover).toBe(true);
      expect(verdict.reason).toBe(passVerdict.REASON_MONTHLY_LIMIT);
      expect(verdict.reason).toBe("monthly_pass_limit_exceeded");
    }
  });

  it("남은 한도가 이번 건과 정확히 같으면 커버 확정이다(경계 포함)", () => {
    const verdict = passVerdict.resolveVerdict(activeSnapshot("premium", { monthlySpendRemainingCoin: 40 }), 40);
    expect(verdict.coversNow).toBe(true);
    expect(verdict.cannotCover).toBe(false);
    expect(verdict.reason).toBe("");
  });

  it("월 한도 캐시가 오래됐어도(monthlyCheckedAt 30일 전) 남은 한도 부족이면 그대로 거부한다", () => {
    const verdict = passVerdict.resolveVerdict(activeSnapshot("vvip", {
      monthlySpendRemainingCoin: 5,
      monthlyCheckedAt: Date.now() - 30 * DAY,
    }), 10);
    expect(verdict.cannotCover).toBe(true);
    expect(verdict.reason).toBe("monthly_pass_limit_exceeded");
  });

  it("월 한도 캐시가 없으면(null/undefined) 검사를 건너뛰고 커버 확정이다", () => {
    expect(passVerdict.resolveVerdict(activeSnapshot("standard", { monthlySpendRemainingCoin: null }), 30).coversNow).toBe(true);
    expect(passVerdict.resolveVerdict(activeSnapshot("standard"), 30).coversNow).toBe(true);
  });

  it("🔴 월 한도 필드가 없는 상태 응답으로 만든 스냅샷은 '잔여 0'으로 읽히지 않는다(Number(null)===0 함정)", () => {
    // /api/auth/me 모양 — monthlySpendRemaining 이 아예 없다. storeStatus → writeSnapshot → readSnapshot
    // 전 구간에서 null 이 0 으로 바뀌면 활성 이용권 전부가 거부된다(2026-09-03 verify:entry-fanout 이 잡음).
    const stored = passVerdict.storeStatus(USER_ID, {
      tier: "premium", isActive: true, status: "active",
      expiresAt: new Date(Date.now() + 20 * DAY).toISOString(),
      passLimit: 100, freeLimit: 100,
    }, "auth-me");
    expect(stored.state).toBe("active");
    expect(stored.monthlySpendRemainingCoin).toBeNull();
    expect(passVerdict.resolveVerdict(stored, 30).coversNow).toBe(true);
    const reread = passVerdict.readSnapshot(USER_ID);
    expect(reread.monthlySpendRemainingCoin).toBeNull();
    expect(passVerdict.resolveVerdict(reread, 30).coversNow).toBe(true);
    // 명시적 null 도 같다.
    const withNull = passVerdict.storeStatus(USER_ID, {
      tier: "premium", isActive: true, status: "active", monthlySpendRemaining: null,
      expiresAt: new Date(Date.now() + 20 * DAY).toISOString(),
    }, "auth-me");
    expect(passVerdict.resolveVerdict(withNull, 30).coversNow).toBe(true);
  });

  it("건당 상한 초과가 월 한도보다 먼저 판정된다", () => {
    const verdict = passVerdict.resolveVerdict(activeSnapshot("standard", { monthlySpendRemainingCoin: 0 }), 51);
    expect(verdict.cannotCover).toBe(true);
    expect(verdict.reason).toBe(passVerdict.REASON_PASS_LIMIT);
  });

  it("coverageFromSnapshot 은 사유를 deniedReason 으로 노출한다", () => {
    const coverage = passVerdict.coverageFromSnapshot(activeSnapshot("premium", { monthlySpendRemainingCoin: 0 }), 10, "test");
    expect(coverage.canUseByPass).toBe(false);
    expect(coverage.deniedReason).toBe("monthly_pass_limit_exceeded");
  });
});

describe("storeMonthlyQuotaFromPayload — coin-gate 응답의 월 한도 반영", () => {
  const active = (extra = {}) => ({
    state: "active",
    tier: "premium",
    expiresAt: new Date(Date.now() + 10 * DAY).toISOString(),
    checkedAt: Date.now() - HOUR,
    stale: false,
    ...extra,
  });

  it("402 최상위 스프레드의 monthlySpendRemaining 을 활성 스냅샷에 기록한다", () => {
    seed(storage, active());
    const stored = passVerdict.storeMonthlyQuotaFromPayload(USER_ID, {
      ok: false,
      decisionReason: "MONTHLY_PASS_LIMIT_EXCEEDED",
      monthlySpendRemaining: 3,
    });
    expect(stored).not.toBeNull();
    expect(stored.monthlySpendRemainingCoin).toBe(3);
    expect(passVerdict.readSnapshot(USER_ID).monthlySpendRemainingCoin).toBe(3);
  });

  it("성공 200 의 data.paymentOptions.monthlySpendRemaining 도 읽는다", () => {
    seed(storage, active());
    const stored = passVerdict.storeMonthlyQuotaFromPayload(USER_ID, {
      ok: true,
      data: { granted: true, paymentOptions: { monthlySpendRemaining: 70 } },
    });
    expect(stored.monthlySpendRemainingCoin).toBe(70);
  });

  it("기존 캐시보다 큰 값은 되돌리지 못한다(단조 감소)", () => {
    seed(storage, active({ monthlySpendRemainingCoin: 20 }));
    const stored = passVerdict.storeMonthlyQuotaFromPayload(USER_ID, { monthlySpendRemaining: 80 });
    expect(stored.monthlySpendRemainingCoin).toBe(20);
    expect(passVerdict.storeMonthlyQuotaFromPayload(USER_ID, { monthlySpendRemaining: 7 }).monthlySpendRemainingCoin).toBe(7);
  });

  it("스냅샷이 없거나 none 이면 아무것도 날조하지 않는다", () => {
    expect(passVerdict.storeMonthlyQuotaFromPayload(USER_ID, { monthlySpendRemaining: 0 })).toBeNull();
    expect(storage.has(passVerdict.snapshotKey(USER_ID))).toBe(false);
    seed(storage, { state: "none", tier: "free", expiresAt: null, checkedAt: Date.now(), stale: false });
    expect(passVerdict.storeMonthlyQuotaFromPayload(USER_ID, { monthlySpendRemaining: 0 })).toBeNull();
    expect(passVerdict.readSnapshot(USER_ID).state).toBe("none");
  });

  it("이용권 상태 신선도(checkedAt)는 건드리지 않고 monthlyCheckedAt 만 찍는다", () => {
    const checkedAt = Date.now() - HOUR;
    seed(storage, active({ checkedAt }));
    const stored = passVerdict.storeMonthlyQuotaFromPayload(USER_ID, { monthlySpendRemaining: 1 });
    expect(stored.checkedAt).toBe(checkedAt);
    expect(stored.monthlyCheckedAt).toBeGreaterThan(checkedAt);
  });

  it("월 한도 필드가 없는 응답은 무시한다", () => {
    seed(storage, active({ monthlySpendRemainingCoin: 20 }));
    expect(passVerdict.storeMonthlyQuotaFromPayload(USER_ID, { ok: true, data: { granted: true } })).toBeNull();
    expect(passVerdict.readSnapshot(USER_ID).monthlySpendRemainingCoin).toBe(20);
  });
});

describe("isMonthlyLimitPayload", () => {
  it("decisionReason 이 최상위·data·paymentOptions 어디에 있어도 잡는다", () => {
    expect(passVerdict.isMonthlyLimitPayload({ decisionReason: "MONTHLY_PASS_LIMIT_EXCEEDED" })).toBe(true);
    expect(passVerdict.isMonthlyLimitPayload({ data: { decisionReason: "monthly_pass_limit_exceeded" } })).toBe(true);
    expect(passVerdict.isMonthlyLimitPayload({ data: { paymentOptions: { decisionReason: "MONTHLY_PASS_LIMIT_EXCEEDED" } } })).toBe(true);
    expect(passVerdict.isMonthlyLimitPayload({ paymentOptions: { decisionReason: "MONTHLY_PASS_LIMIT_EXCEEDED" } })).toBe(true);
  });

  it("다른 사유·빈 값·비객체는 false 다", () => {
    expect(passVerdict.isMonthlyLimitPayload({ decisionReason: "PASS_LIMIT_EXCEEDED" })).toBe(false);
    expect(passVerdict.isMonthlyLimitPayload({ data: { paymentOptions: {} } })).toBe(false);
    expect(passVerdict.isMonthlyLimitPayload(null)).toBe(false);
    expect(passVerdict.isMonthlyLimitPayload("MONTHLY_PASS_LIMIT_EXCEEDED")).toBe(false);
  });
});
