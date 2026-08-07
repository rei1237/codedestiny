/**
 * 이용권(pass) 판정 단일 정본.
 *
 * 🔴 이 파일이 유일한 구현이다. 정적 셸(index.html 인라인) · React(app/_lib/billing-client.ts) ·
 * 독립 정적 페이지(js/destiny-profile.js) 세 런타임이 **같은 localStorage 키**
 * (cd_subscription_snapshot_v2::<userId>)를 읽고 쓰므로, 상수나 판정이 한쪽에서만 바뀌면
 * 한 런타임이 다른 런타임의 캐시를 만료로 보고 지워 버린다(실제로 active TTL 이 5분/15분으로
 * 갈라져 있었다). 새 사본을 만들지 말고 여기를 고칠 것.
 *
 * 유효기간의 기준은 **벽시계 TTL 이 아니라 이용권 자체의 expiresAt** 이다.
 * canUseByPass(등급, 만료일, 가격) 은 순수 함수라 등급과 만료일을 한 번 알면 만료 전까지
 * 서버에 다시 물을 이유가 없다. TTL 은 "언제 백그라운드로 갱신할까"만 정하고, 판정을 버리지 않는다.
 *
 * 로딩 방식(번들러 없이 3런타임 공유):
 *   - 브라우저 classic script: `globalThis.__cdPassVerdict`
 *   - webpack/Node(require): `module.exports` (package.json type=commonjs)
 */
(function (factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") globalThis.__cdPassVerdict = api;
})(function () {
  "use strict";

  var KEY_PREFIX = "cd_subscription_snapshot_v2::";
  var NONE_TTL_MS = 60000;
  var ACTIVE_TTL_MS = 5 * 60 * 1000;
  // 🔴 stale-while-revalidate 상한. TTL 을 넘긴 'none' 은 삭제하지 않고 이 상한까지 '미보유 확정'
  // 판정에 그대로 쓰고(= 결제창 직행, 서버 왕복 0) 백그라운드로만 갱신한다.
  var NONE_STALE_MAX_MS = 24 * 60 * 60 * 1000;
  // 🔴 만료일을 모르는 'active' 의 상한. 서버 응답에 expiresAt 이 없어도 isActive:true 하나로
  // state:'active' 가 만들어지는 경로가 있어서(구 unlock-status?scope=pass 등), 이 밸브가 없으면
  // "만료 근거가 전혀 없는 무기한 무료 통과" 스냅샷이 생긴다. 값은 종전 ACTIVE_TTL_MS 와 같다(= 무회귀).
  var ACTIVE_NO_EXPIRY_MAX_MS = 5 * 60 * 1000;
  // 🔴 만료일 없는 'active' 를 TTL 초과 즉시 **삭제**하지 않고 이 상한까지 stale 로 보존한다.
  // 삭제하면 storeStatus 의 다운그레이드 가드가 지킬 대상을 잃어, 그 뒤 도착한 신뢰 불가 'none'
  // (토큰 폴백 등)이 그대로 '미보유 확정'으로 굳는다 — 보유자가 서버 왕복 0으로 결제창에 간다.
  // 보존해도 무료 통과는 생기지 않는다: resolveVerdict 가 stale && 만료일 미상이면 coversNow=false 다.
  // ACTIVE_STALE_MAX_MS(35일)를 재사용하지 않는 이유는, 만료 근거가 전혀 없는 기록을 그렇게 오래
  // 들고 있으면 배지 등 UI 표면에서 '보유 중'이 과하게 오래 남기 때문이다.
  var ACTIVE_NO_EXPIRY_KEEP_MAX_MS = 24 * 60 * 60 * 1000;
  // 이용권 최장 기간(30일) + 여유. expiresAt 이 비정상적으로 먼 미래여도 이 상한을 넘기면 폐기한다.
  // 보안 통제가 아니라 sanity bound 다 — 권위는 서버의 402 이고 localStorage 는 어차피 사용자 제어다.
  var ACTIVE_STALE_MAX_MS = 35 * 24 * 60 * 60 * 1000;
  // checkedAt 이 미래로 적힌 스냅샷(시계 조작·다른 기기 시계 오차)은 age 가 음수가 되어 영원히 신선해진다.
  var FUTURE_CLOCK_SKEW_MAX_MS = 24 * 60 * 60 * 1000;

  var PASS_LIMIT_BY_TIER = { family: 999999999, vvip: 100, premium: 50, standard: 30, free: 0 };
  // 서버 정본은 lib/profile-limits.js 의 FAMILY_PREMIUM_MIN_COIN_COST. 이 값 이상의 기능은
  // family 라도 포함 횟수(기간당 N회)를 다 썼을 수 있어 스냅샷만으로 커버를 단정할 수 없다.
  // 남은 횟수는 서버만 안다 — 그래서 '커버 확정'도 '커버 불가'도 아닌 미확정으로 두어
  // 호출부가 서버에 물어보게 한다. 여기서 커버로 단정하면 결제창 없이 진행하다 402 를 맞는다.
  var FAMILY_PREMIUM_MIN_COIN_COST = 300;
  var ACTIVE_STATUS_RE = /^(active|subscribed|paid|success|succeeded|complete|completed|confirmed|approved)$/i;
  var INACTIVE_STATUS_RE = /^(none|free|inactive|expired|canceled|cancelled|refunded|failed|paused)$/i;

  function text(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function getStorage() {
    try {
      if (typeof localStorage === "undefined" || !localStorage) return null;
      return localStorage;
    } catch (_storageError) {
      return null;
    }
  }

  // 셸 _cdNormalizeMembershipTier 와 React normalizeSubscriptionSnapshotTier 의 합집합
  // (한국어 표기 '프리미엄'/'스탠다드'는 셸 쪽에만 있었다).
  function normalizeTier(value) {
    var tier = text(value).toLowerCase();
    if (tier.indexOf("family") >= 0) return "family";
    if (tier.indexOf("gold") >= 0 || tier.indexOf("vvip") >= 0) return "vvip";
    if (tier.indexOf("silver") >= 0 || tier.indexOf("premium") >= 0 || tier.indexOf("프리미엄") >= 0) return "premium";
    if (tier.indexOf("bronze") >= 0 || tier.indexOf("standard") >= 0 || tier.indexOf("스탠다드") >= 0) return "standard";
    return "free";
  }

  function passLimitForTier(tier) {
    var limit = PASS_LIMIT_BY_TIER[normalizeTier(tier)];
    return Number.isFinite(limit) ? limit : 0;
  }

  function normalizeUserId(userId) {
    return text(userId).toLowerCase();
  }

  function snapshotKey(userId) {
    return KEY_PREFIX + normalizeUserId(userId);
  }

  function normalizeDate(value) {
    var raw = text(value);
    if (!raw) return null;
    var time = Date.parse(raw);
    if (!Number.isFinite(time)) return null;
    return new Date(time).toISOString();
  }

  function isFutureDate(value) {
    if (!value) return false;
    var time = Date.parse(String(value));
    return Number.isFinite(time) && time > Date.now();
  }

  function isPastDate(value) {
    if (!value) return false;
    var time = Date.parse(String(value));
    return !Number.isFinite(time) || time <= Date.now();
  }

  function removeSnapshot(userId) {
    var storage = getStorage();
    var uid = normalizeUserId(userId);
    if (!storage || !uid) return;
    try {
      storage.removeItem(snapshotKey(uid));
    } catch (_removeError) {}
  }

  /**
   * options.allowStaleNone — TTL 을 넘긴 'none' 도 { stale:true } 로 돌려받는다(삭제하지 않음).
   *   호출부는 이것을 **미보유 확정** 판정에만 쓰고 백그라운드 갱신을 예약해야 한다.
   *
   * 'active' 는 TTL 을 넘겨도 **이용권 만료일이 아직 남아 있으면** { stale:true } 로 유지한다.
   * 삭제 조건은 "이용권 자체가 끝났을 때"(expiresAt <= now)와 "만료일을 모르는 채 TTL 초과"뿐이다.
   * 만료일을 아는 한 판정은 그대로 유효하므로 버릴 이유가 없다 — 이게 보유자가 5분마다
   * 차단형 서버 왕복을 다시 겪던 원인이었다.
   */
  function readSnapshot(userId, options) {
    var uid = normalizeUserId(userId);
    if (!uid) return null;
    var storage = getStorage();
    if (!storage) return null;
    var allowStaleNone = Boolean(options && options.allowStaleNone);
    try {
      var raw = storage.getItem(snapshotKey(uid));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        removeSnapshot(uid);
        return null;
      }
      var snapshotUserId = normalizeUserId(parsed.userId);
      var state = parsed.state === "active" || parsed.state === "none" ? parsed.state : "";
      var tier = normalizeTier(parsed.tier);
      var checkedAt = Number(parsed.checkedAt);
      var expiresAt = normalizeDate(parsed.expiresAt);
      if (snapshotUserId !== uid || !state || !Number.isFinite(checkedAt) || (state === "active" && tier === "free")) {
        removeSnapshot(uid);
        return null;
      }
      // 이용권 자체가 끝났으면 어떤 경우에도 살리지 않는다(만료된 이용권으로 콘텐츠가 새는 경로).
      if (state === "active" && expiresAt && isPastDate(expiresAt)) {
        removeSnapshot(uid);
        return null;
      }
      var rawAge = Date.now() - checkedAt;
      if (rawAge < -FUTURE_CLOCK_SKEW_MAX_MS) {
        removeSnapshot(uid);
        return null;
      }
      var age = rawAge < 0 ? 0 : rawAge;
      var stale = false;
      if (state === "none" && age > NONE_TTL_MS) {
        if (!allowStaleNone || age > NONE_STALE_MAX_MS) {
          removeSnapshot(uid);
          return null;
        }
        stale = true;
      }
      if (state === "active") {
        if (!expiresAt) {
          // 만료일을 모르면 커버를 단정할 수 없다 — 하지만 폐기하지도 않는다(위 상수 주석 참고).
          // TTL 초과는 stale 로 표시만 하고(=coversNow false, 서버 검사로 폴백), 하드 상한에서만 지운다.
          if (age > ACTIVE_NO_EXPIRY_KEEP_MAX_MS) {
            removeSnapshot(uid);
            return null;
          }
          if (age > ACTIVE_NO_EXPIRY_MAX_MS) stale = true;
        } else if (age > ACTIVE_STALE_MAX_MS) {
          removeSnapshot(uid);
          return null;
        } else if (age > ACTIVE_TTL_MS) {
          // 만료일이 아직 남아 있으므로 판정은 그대로 유효하다. 갱신은 백그라운드로만.
          stale = true;
        }
      }
      return {
        userId: uid,
        state: state,
        tier: state === "active" ? tier : "free",
        expiresAt: state === "active" ? expiresAt : null,
        checkedAt: checkedAt,
        purchaseVersion: text(parsed.purchaseVersion),
        source: text(parsed.source) || "local",
        completeness: text(parsed.completeness),
        authority: text(parsed.authority),
        stale: stale,
      };
    } catch (_readError) {
      removeSnapshot(uid);
      return null;
    }
  }

  // 서버 응답(형태가 라우트마다 다르다) → 스냅샷. 후보 필드는 셸·React 두 목록의 합집합이다.
  function buildSnapshotFromStatus(userId, status, source) {
    var data = status && typeof status === "object" ? status : {};
    var nested = (data.entitlementSnapshot && typeof data.entitlementSnapshot === "object" && data.entitlementSnapshot)
      || (data.subscription && typeof data.subscription === "object" && data.subscription)
      || (data.membership && typeof data.membership === "object" && data.membership)
      || (data.membershipPass && typeof data.membershipPass === "object" && data.membershipPass)
      || {};
    var membership = data.membership && typeof data.membership === "object" ? data.membership : {};
    var membershipPass = data.membershipPass && typeof data.membershipPass === "object" ? data.membershipPass : {};
    var options = data.paymentOptions && typeof data.paymentOptions === "object" ? data.paymentOptions : {};
    var tier = normalizeTier(
      data.tier || data.plan || data.planId || data.passTier || data.subscriptionTier
      || options.tier || options.passTier || options.subscriptionTier
      || membershipPass.tier || membershipPass.passTier
      || nested.tier || nested.plan || nested.passTier
      || membership.tier || membership.plan || membership.passTier
    );
    var expiresAt = normalizeDate(
      data.expiresAt || data.currentPeriodEnd || data.endsAt || data.validUntil
      || options.expiresAt || options.currentPeriodEnd || options.endsAt || options.validUntil
      || nested.expiresAt || nested.currentPeriodEnd || nested.endsAt || nested.validUntil
      || membership.expiresAt || membership.currentPeriodEnd || membership.endsAt || membership.validUntil
      || membershipPass.expiresAt || membershipPass.validUntil
    );
    var rawStatus = data.status || data.subscriptionStatus || data.membershipStatus
      || options.status || nested.status || nested.subscriptionStatus || membership.status;
    var explicitActive = Boolean(
      data.isActive === true || data.isSubscribed === true || data.active === true
      || data.enabled === true || data.valid === true || data.hasActivePass === true
      || options.hasActivePass === true
      || nested.isActive === true || nested.isSubscribed === true
      || membership.isActive === true || membership.isSubscribed === true
      || ACTIVE_STATUS_RE.test(text(rawStatus))
    );
    var explicitInactive = Boolean(
      INACTIVE_STATUS_RE.test(text(rawStatus))
      || (data.isActive === false && !explicitActive)
      || (data.isSubscribed === false && !explicitActive)
      || (data.hasActivePass === false && !explicitActive)
      || (options.hasActivePass === false && !explicitActive)
      || (nested.isActive === false && !explicitActive)
      || (nested.isSubscribed === false && !explicitActive)
      || (membership.isActive === false && !explicitActive)
      || (membership.isSubscribed === false && !explicitActive)
    );
    var expiredByDate = Boolean(expiresAt) && isPastDate(expiresAt);
    var state = tier !== "free" && !expiredByDate && !explicitInactive && (explicitActive || isFutureDate(expiresAt))
      ? "active"
      : "none";
    return {
      userId: normalizeUserId(userId),
      state: state,
      tier: state === "active" ? tier : "free",
      expiresAt: state === "active" ? expiresAt : null,
      checkedAt: Date.now(),
      purchaseVersion: text(
        data.purchaseVersion || data.paymentId || data.merchantUid || data.orderId
        || data.subscriptionId || data.updatedAt || expiresAt
      ),
      source: text(source || data.source) || "client",
      completeness: text(data.completeness || nested.completeness),
      authority: text(data.authority || nested.authority),
      stale: false,
    };
  }

  function writeSnapshot(userId, snapshot) {
    var storage = getStorage();
    var uid = normalizeUserId(userId);
    if (!storage || !uid || !snapshot) return null;
    try {
      var payload = {
        userId: uid,
        state: snapshot.state,
        tier: snapshot.tier,
        expiresAt: snapshot.expiresAt || null,
        checkedAt: Number(snapshot.checkedAt) || Date.now(),
        purchaseVersion: text(snapshot.purchaseVersion),
        source: text(snapshot.source) || "client",
        completeness: text(snapshot.completeness),
        authority: text(snapshot.authority),
      };
      storage.setItem(snapshotKey(uid), JSON.stringify(payload));
      return Object.assign({}, payload, { stale: false });
    } catch (_writeError) {
      return null;
    }
  }

  // 🔴 "미보유 확정"을 만들 자격이 없는 응답을 가려낸다.
  //
  // /api/auth/me 는 Mongo 블립에서 JWT 만으로 토큰 폴백 유저를 돌려주는데, 그 payload 의
  // profileSubscription 은 실제 구독과 무관하게 **무조건** {tier:"free", isActive:false,
  // source:"token"} 이다(worker/routes/auth.js buildTokenFallbackUser). 그런데 그 응답에는
  // degraded:true 가 붙지 않아서 클라이언트가 정상 응답으로 읽는다.
  //
  // 이걸 스냅샷으로 저장하면 진짜 이용권 보유자에게 state:'none' 이 생기고, resolveVerdict 가
  // cannotCover(미보유 확정)를 돌려줘 **서버 왕복 0으로** 결제창에 보내진다. 아래 기존
  // 다운그레이드 가드는 '이미 active 스냅샷이 있을 때'만 막아서, 스냅샷이 아직 없는 콜드 진입
  // (시크릿창·저장소 삭제·첫 방문)에서는 그대로 뚫렸다. 그래서 생성 자체를 막는다.
  function isUntrustedNoneSource(data, nested, source) {
    if (data.degraded === true || nested.degraded === true) return true;
    var claimed = text(data.source || nested.source).toLowerCase();
    if (claimed === "token" || claimed === "fallback") return true;
    var declared = text(source).toLowerCase();
    if (declared === "token" || declared === "fallback") return true;
    return false;
  }

  function storeStatus(userId, status, source) {
    var next = buildSnapshotFromStatus(userId, status, source);
    if (next.state === "none") {
      var existing = readSnapshot(userId, { allowStaleNone: true });
      var data = status && typeof status === "object" ? status : {};
      var nested = data.entitlementSnapshot && typeof data.entitlementSnapshot === "object"
        ? data.entitlementSnapshot
        : {};
      // 출처가 신뢰 불가면 'none' 을 생성하지도, 덮어쓰지도 않는다. 기존 스냅샷이 있으면 그대로,
      // 없으면 null(=미확정) 을 돌려줘 호출부가 서버에 물어보게 한다.
      if (isUntrustedNoneSource(data, nested, source)) return existing;
      var complete = text(data.completeness || nested.completeness).toLowerCase() === "full";
      var authoritative = text(data.authority || nested.authority).toLowerCase() === "server";
      var degraded = data.degraded === true || nested.degraded === true;
      if (existing && existing.state === "active" && (!complete || !authoritative || degraded)) return existing;
    }
    return writeSnapshot(userId, next);
  }

  /**
   * 스냅샷만으로 내릴 수 있는 이용권 판정의 단일 정본.
   *   coversNow   — 커버 확정(낙관 즉시 통과 후보, 서버 왕복 0)
   *   cannotCover — 미보유/한도초과 확정(결제창 직행, 서버 왕복 0)
   * 둘 다 false 면 "아직 모름" 이고 서버 판정으로 넘어간다. 🔴 지연·타임아웃은 미커버 근거가 아니다.
   */
  function resolveVerdict(snapshot, coinCost) {
    var cost = Math.max(0, Math.floor(Number(coinCost || 0)));
    var result = {
      snapshot: snapshot || null,
      stale: Boolean(snapshot && snapshot.stale),
      tier: snapshot && snapshot.state === "active" ? snapshot.tier : "free",
      passLimit: 0,
      hasActivePass: false,
      coversNow: false,
      cannotCover: false,
    };
    if (!snapshot || !(cost > 0)) return result;
    if (snapshot.state === "none") {
      result.cannotCover = true;
      return result;
    }
    if (snapshot.state !== "active") return result;
    var limit = passLimitForTier(snapshot.tier);
    result.passLimit = limit;
    result.hasActivePass = true;
    if (!(limit > 0)) return result;
    if (snapshot.tier !== "family" && cost > limit) {
      result.cannotCover = true;
      return result;
    }
    // family 의 프리미엄 상담은 포함 횟수 소진 여부를 서버만 안다 → 미확정으로 남긴다.
    // (coversNow=false, cannotCover=false = "모름". 호출부는 서버 판정을 기다린다.)
    if (snapshot.tier === "family" && cost >= FAMILY_PREMIUM_MIN_COIN_COST) return result;
    // 커버 확정. TTL 을 넘겼어도 이용권 만료일이 아직 남아 있으면 판정은 그대로 유효하다.
    result.coversNow = !snapshot.stale || isFutureDate(snapshot.expiresAt);
    return result;
  }

  // 판정 결과 → 기존 런타임들이 주고받던 membershipCoverage 모양. 호출부를 바꾸지 않기 위한 어댑터다.
  function coverageFromSnapshot(snapshot, coinCost, sourceLabel) {
    if (!snapshot) return null;
    var verdict = resolveVerdict(snapshot, coinCost);
    var cost = Math.max(0, Math.floor(Number(coinCost || 0)));
    return {
      tier: verdict.tier,
      passTier: verdict.hasActivePass ? verdict.tier : "",
      hasActivePass: verdict.hasActivePass,
      freeLimit: verdict.passLimit,
      passLimit: verdict.passLimit,
      coinCost: cost,
      canUseByPass: verdict.coversNow,
      stale: verdict.stale,
      // 'none' 의 source 는 고정 문자열이다 — 호출부가 이 값을 payment_required 의 reason 으로 그대로 쓴다.
      source: snapshot.state === "none"
        ? "subscription_snapshot_none"
        : (text(sourceLabel) || text(snapshot.source) || "subscription_snapshot_active"),
    };
  }

  return {
    VERSION: 1,
    KEY_PREFIX: KEY_PREFIX,
    NONE_TTL_MS: NONE_TTL_MS,
    ACTIVE_TTL_MS: ACTIVE_TTL_MS,
    NONE_STALE_MAX_MS: NONE_STALE_MAX_MS,
    ACTIVE_NO_EXPIRY_MAX_MS: ACTIVE_NO_EXPIRY_MAX_MS,
    ACTIVE_STALE_MAX_MS: ACTIVE_STALE_MAX_MS,
    normalizeTier: normalizeTier,
    passLimitForTier: passLimitForTier,
    normalizeUserId: normalizeUserId,
    snapshotKey: snapshotKey,
    normalizeDate: normalizeDate,
    readSnapshot: readSnapshot,
    writeSnapshot: writeSnapshot,
    removeSnapshot: removeSnapshot,
    buildSnapshotFromStatus: buildSnapshotFromStatus,
    storeStatus: storeStatus,
    resolveVerdict: resolveVerdict,
    coverageFromSnapshot: coverageFromSnapshot,
  };
});
