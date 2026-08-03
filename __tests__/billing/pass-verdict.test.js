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
    expect(passVerdict.passLimitForTier("standard")).toBe(30);
    expect(passVerdict.passLimitForTier("premium")).toBe(50);
    expect(passVerdict.passLimitForTier("vvip")).toBe(100);
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

  it("만료일을 모르는 active 는 TTL 을 넘기면 폐기한다(무기한 무료 통과 차단)", () => {
    seed(storage, {
      state: "active",
      tier: "premium",
      expiresAt: null,
      checkedAt: Date.now() - 10 * MINUTE,
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
    const verdict = passVerdict.resolveVerdict(activeSnapshot("standard"), 50);
    expect(verdict.coversNow).toBe(false);
    expect(verdict.cannotCover).toBe(true);
  });

  it("family 는 프리미엄 문턱 아래에서는 가격과 무관하게 커버한다", () => {
    // 299코인(29,900원)까지는 한도가 사실상 무제한이라 즉시 커버 확정.
    const verdict = passVerdict.resolveVerdict(activeSnapshot("family"), 299);
    expect(verdict.coversNow).toBe(true);
    expect(verdict.cannotCover).toBe(false);
  });

  it("family 의 프리미엄 상담(300코인 이상)은 어느 쪽도 확정하지 않는다", () => {
    // 포함 횟수(기간당 10회) 소진 여부는 서버만 안다. 여기서 커버로 단정하면
    // 결제창 없이 진행하다 402 를 맞고, 미커버로 단정하면 남은 횟수가 있는데도
    // 결제를 요구한다. 그래서 미확정으로 두어 호출부가 서버에 물어보게 한다.
    for (const cost of [300, 500, 100000]) {
      const verdict = passVerdict.resolveVerdict(activeSnapshot("family"), cost);
      expect(verdict.coversNow).toBe(false);
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
    expect(coverage.freeLimit).toBe(100);
    expect(coverage.passLimit).toBe(100);
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
