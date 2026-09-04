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

  // 서버 정본은 worker/lib/profile-limits.js 의 PASS_LIMITS(건당 적용 가격 범위, coin 단위).
  // 2026-08-24: 50 / 100 / 200 = 5,000원 / 10,000원 / 20,000원 (이전 30/50/100).
  // family 는 건당 상한이 없다 — 금액 무관 커버, 다만 월 이용 한도는 동일 적용.
  var PASS_LIMIT_BY_TIER = { family: 999999999, vvip: 200, premium: 100, standard: 50, free: 0 };
  // 서버 정본은 lib/profile-limits.js 의 MONTHLY_PASS_LIMITS(월 누적 한도, coin 단위).
  // 건당 상한과는 별개의 AND 게이트 — 이번 건이 건당 상한을 통과해도 이번 사이클
  // 누적 사용액이 이 값을 넘으면 이용권으로 커버되지 않는다.
  var MONTHLY_PASS_LIMIT_BY_TIER = { family: 5000, vvip: 2000, premium: 1000, standard: 300, free: 0 };
  // 월 누적 잔여 캐시(monthlySpendRemainingCoin)에는 신선도 상한이 없다. 잔여는 사이클 안에서
  // 단조 감소(소비만 있고 환불은 드묾)하므로 낡은 캐시로 내린 '부족' 판정은 여전히 참이고,
  // 사이클이 바뀌면 서버 상태 응답(storeStatus)이 새 잔여로 덮어쓴다. 예전엔 TTL(5분) 밖의
  // 캐시를 "모름"으로 버려 한도 소진자가 매번 낙관 통과→백그라운드 402 를 겪었다(2026-09-03).
  // 거부 사유 문자열은 서버 billing.js 의 deny reason 과 같은 값을 쓴다.
  var REASON_MONTHLY_LIMIT = "monthly_pass_limit_exceeded";
  var REASON_PASS_LIMIT = "snapshot_pass_limit_exceeded";
  var REASON_NONE = "subscription_snapshot_none";
  /* 🔴 '프리미엄 상담 포함 횟수'는 2026-08-24 폐지됐다(서버 정본
     worker/lib/profile-limits.js 의 PREMIUM_QUOTA_INCLUDED_USES_BY_TIER 가 빈 표다).
     그래서 여기에도 그 개념이 없다 — 판정은 건당 상한 + 월 이용 한도 둘뿐이다.
     되살리면 스냅샷이 '미확정'으로 남기던 구간이 다시 생겨 서버 왕복이 늘고,
     무엇보다 가격 페이지 문구('2만원급 콘텐츠까지')와 어긋난다. */
  var ACTIVE_STATUS_RE = /^(active|subscribed|paid|success|succeeded|complete|completed|confirmed|approved)$/i;
  var INACTIVE_STATUS_RE = /^(none|free|inactive|expired|canceled|cancelled|refunded|failed|paused)$/i;

  function text(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  // 🔴 Number(null) === 0 이다. 월 한도 필드는 "없음"(null/undefined/"")과 "잔여 0"이 정반대
  // 뜻이라 — 전자는 검사 생략, 후자는 확정 거부 — 없음을 NaN 으로 돌려 둘을 갈라 둔다.
  // 2026-09-03 에 이 구분이 없어 월 한도 정보 없는 활성 이용권이 전부 거부됐다(테스트가 잡음).
  function numberOrNaN(value) {
    if (value === null || value === undefined || value === "") return NaN;
    return Number(value);
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

  function monthlyLimitForTier(tier) {
    var limit = MONTHLY_PASS_LIMIT_BY_TIER[normalizeTier(tier)];
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
      var monthlySpendRemainingCoin = numberOrNaN(parsed.monthlySpendRemainingCoin);
      var monthlyCheckedAt = numberOrNaN(parsed.monthlyCheckedAt);
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
        monthlySpendRemainingCoin: state === "active" && Number.isFinite(monthlySpendRemainingCoin) ? monthlySpendRemainingCoin : null,
        monthlyCheckedAt: state === "active" && Number.isFinite(monthlyCheckedAt) ? monthlyCheckedAt : null,
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
    // 월 누적 한도 잔여(coin). buildPassPaymentDecision(billing.js)의 monthlySpendRemaining이
    // 호출부의 `...data, ...options` 스프레드를 거쳐 여기 도달한다 — 값이 있을 때만 신선한
    // 캐시로 반영하고(monthlyCheckedAt=지금), 없으면 null로 남겨 resolveVerdict가 "모름"으로 처리한다.
    var monthlySpendRemainingRaw = data.monthlySpendRemaining ?? nested.monthlySpendRemaining
      ?? membership.monthlySpendRemaining ?? membershipPass.monthlySpendRemaining;
    var monthlySpendRemainingCoin = numberOrNaN(monthlySpendRemainingRaw);
    var hasMonthlySpendRemaining = state === "active" && Number.isFinite(monthlySpendRemainingCoin);
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
      monthlySpendRemainingCoin: hasMonthlySpendRemaining ? Math.max(0, Math.floor(monthlySpendRemainingCoin)) : null,
      monthlyCheckedAt: hasMonthlySpendRemaining ? Date.now() : null,
    };
  }

  function writeSnapshot(userId, snapshot) {
    var storage = getStorage();
    var uid = normalizeUserId(userId);
    if (!storage || !uid || !snapshot) return null;
    try {
      var monthlySpendRemainingCoin = numberOrNaN(snapshot.monthlySpendRemainingCoin);
      var monthlyCheckedAt = numberOrNaN(snapshot.monthlyCheckedAt);
      var hasMonthly = Number.isFinite(monthlySpendRemainingCoin) && Number.isFinite(monthlyCheckedAt);
      // 이번 갱신에 월 한도 정보가 없으면(예: 이용권 정보만 담은 다른 상태 응답) 무작정 지우지
      // 않는다 — 같은 이용권(같은 등급·만료일)이면 기존 캐시를 그대로 보존한다. 등급/만료일이
      // 바뀌면(=다른 이용권) 보존하지 않는다 — 새 사이클의 잔여 한도를 옛 캐시로 오판할 수 있다.
      if (!hasMonthly && snapshot.state === "active") {
        var prior = readSnapshot(uid, { allowStaleNone: true });
        if (
          prior && prior.state === "active"
          && prior.tier === snapshot.tier
          && prior.expiresAt === (snapshot.expiresAt || null)
          && Number.isFinite(prior.monthlySpendRemainingCoin)
          && Number.isFinite(prior.monthlyCheckedAt)
        ) {
          monthlySpendRemainingCoin = prior.monthlySpendRemainingCoin;
          monthlyCheckedAt = prior.monthlyCheckedAt;
          hasMonthly = true;
        }
      }
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
        monthlySpendRemainingCoin: hasMonthly ? Math.max(0, Math.floor(monthlySpendRemainingCoin)) : null,
        monthlyCheckedAt: hasMonthly ? Math.floor(monthlyCheckedAt) : null,
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
      // cannotCover 일 때만 채워진다. 호출부는 이 값을 payment_required 의 reason 으로 쓰고,
      // 결제창은 REASON_MONTHLY_LIMIT 이면 '이용권 상점' 으로 튕기지 않는다(이용권은 있다).
      reason: "",
    };
    if (!snapshot || !(cost > 0)) return result;
    if (snapshot.state === "none") {
      result.cannotCover = true;
      result.reason = REASON_NONE;
      return result;
    }
    if (snapshot.state !== "active") return result;
    var limit = passLimitForTier(snapshot.tier);
    result.passLimit = limit;
    result.hasActivePass = true;
    if (!(limit > 0)) return result;
    // family 는 건당 상한이 없다(limit = 999999999) — 아래 비교가 참이 될 수 없어 그대로 통과하고
    // 월 이용 한도 검사로 넘어간다. 나머지 등급은 상한을 넘으면 여기서 확정 거부다.
    if (cost > limit) {
      result.cannotCover = true;
      result.reason = REASON_PASS_LIMIT;
      return result;
    }
    // 월 이용 한도: 로컬 캐시에 남은 한도가 있고 그 값이 이번 건보다 적으면 확정 거부한다.
    // 캐시 나이는 보지 않는다(상단 REASON_MONTHLY_LIMIT 주석). 캐시가 없으면(null) 검사를
    // 건너뛰고 낙관 통과시킨다 — "캐시가 없으면 결제창으로" 를 택하면, 캐시가 아직 한 번도
    // 채워지지 않은 모든 사용자가 매번 서버 왕복을 타게 된다. 최종 확정은 실제 소비 시점의
    // 서버 재검사(consumeTierPassIfAvailable)가 맡고, 그 402 는 storeMonthlyQuotaFromPayload 로
    // 캐시에 반영돼 다음 진입부터 여기서 걸린다.
    var monthlyLimit = monthlyLimitForTier(snapshot.tier);
    if (monthlyLimit > 0) {
      // "캐시 없음"(null) 은 검사 생략, "잔여 0" 은 확정 거부 — numberOrNaN 이 둘을 가른다.
      var monthlyRemaining = numberOrNaN(snapshot.monthlySpendRemainingCoin);
      if (Number.isFinite(monthlyRemaining) && monthlyRemaining < cost) {
        result.cannotCover = true;
        result.reason = REASON_MONTHLY_LIMIT;
        return result;
      }
    }
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
      // 거부 사유. 호출부가 payment_required 의 reason 으로 쓰고, 결제창의 pass-store 핸들러는
      // REASON_MONTHLY_LIMIT 이면 상점으로 보내지 않는다.
      deniedReason: verdict.reason,
      // 'none' 의 source 는 고정 문자열이다 — 호출부가 이 값을 payment_required 의 reason 으로 그대로 쓴다.
      source: snapshot.state === "none"
        ? REASON_NONE
        : (text(sourceLabel) || text(snapshot.source) || "subscription_snapshot_active"),
    };
  }

  // coin-gate 응답(성공 200·거부 402 모두)의 월 한도 필드를 **활성 스냅샷에만** 반영한다.
  // 스냅샷 생성 경로(buildSnapshotFromStatus)는 건드리지 않는다 — coin-gate 응답에는 이용권
  // 상태가 없어 그걸로 스냅샷을 만들면 'none' 을 날조한다. 기존 캐시가 있으면 더 작은 값을
  // 택한다(잔여는 단조 감소; 늦게 도착한 옛 응답이 캐시를 되돌리지 못하게). checkedAt 은
  // 이용권 상태의 신선도라 여기서 바꾸지 않는다.
  function storeMonthlyQuotaFromPayload(userId, payload) {
    var uid = normalizeUserId(userId);
    if (!uid || !payload || typeof payload !== "object") return null;
    var data = payload.data && typeof payload.data === "object" ? payload.data : payload;
    var error = payload.error && typeof payload.error === "object" ? payload.error : {};
    // 성공 200 은 data.paymentOptions(=buildPassPaymentDecision) 안에, 402 는 최상위 스프레드에 있다.
    var options = data.paymentOptions && typeof data.paymentOptions === "object" ? data.paymentOptions : {};
    var remainingRaw = data.monthlySpendRemaining ?? options.monthlySpendRemaining
      ?? payload.monthlySpendRemaining ?? error.monthlySpendRemaining;
    var remaining = Number(remainingRaw);
    if (remainingRaw === null || remainingRaw === undefined || !Number.isFinite(remaining)) return null;
    var existing = readSnapshot(uid);
    if (!existing || existing.state !== "active") return null;
    var next = Math.max(0, Math.floor(remaining));
    if (Number.isFinite(existing.monthlySpendRemainingCoin)) next = Math.min(next, existing.monthlySpendRemainingCoin);
    return writeSnapshot(uid, Object.assign({}, existing, {
      monthlySpendRemainingCoin: next,
      monthlyCheckedAt: Date.now(),
    }));
  }

  // coin-gate 성공 200 이 "이 건으로 월 한도를 다 써서 이용권이 종료됐다"고 알리면(서버 정본은
  // worker/lib/profile-limits.js isPassBudgetExhausted → compat.js membershipPass.passEnded)
  // 로컬 스냅샷을 즉시 미보유로 내린다. 안 내리면 다음 진입이 낙관 통과 → 402 → 결제창으로
  // 한 왕복을 더 돈다.
  //
  // 🔴 storeStatus/buildSnapshotFromStatus 를 태우지 않는다 — 그 경로는 이용권 상태가 없는
  // 응답으로 'none' 을 날조하지 못하게 막는 가드(isUntrustedNoneSource)를 품고 있고, 여기서는
  // 서버가 "끝났다"고 명시한 것이라 그 가드를 통과시킬 이유가 없다. 전용 경로로 분리해 둔다.
  function markPassEndedFromPayload(userId, payload) {
    var uid = normalizeUserId(userId);
    if (!uid || !payload || typeof payload !== "object") return null;
    var data = payload.data && typeof payload.data === "object" ? payload.data : payload;
    var pass = data.membershipPass && typeof data.membershipPass === "object" ? data.membershipPass : {};
    var ended = pass.passEnded === true || data.passEnded === true || payload.passEnded === true;
    if (!ended) return null;
    return writeSnapshot(uid, {
      state: "none",
      tier: "free",
      expiresAt: null,
      checkedAt: Date.now(),
      purchaseVersion: text(pass.passEndedAt || data.passEndedAt),
      source: "pass_budget_exhausted",
      completeness: "full",
      authority: "server",
      monthlySpendRemainingCoin: 0,
      monthlyCheckedAt: Date.now(),
    });
  }

  // coin-gate 402 가 '월 한도 소진' 때문인지 판정한다. 서버 정본은 buildPassPaymentDecision 의
  // decisionReason 이고, 402 는 최상위 스프레드·paymentOptions·data 세 자리 중 하나에 실려 온다.
  // 세 결제창 렌더러가 이 한 함수로 "이용권은 있으니 상점으로 보내지 않는다"를 판정한다.
  function isMonthlyLimitPayload(payload) {
    if (!payload || typeof payload !== "object") return false;
    var data = payload.data && typeof payload.data === "object" ? payload.data : payload;
    var options = data.paymentOptions && typeof data.paymentOptions === "object" ? data.paymentOptions : {};
    var reason = data.decisionReason ?? options.decisionReason ?? payload.decisionReason;
    return String(reason || "").trim().toUpperCase() === "MONTHLY_PASS_LIMIT_EXCEEDED";
  }

  return {
    VERSION: 1,
    KEY_PREFIX: KEY_PREFIX,
    NONE_TTL_MS: NONE_TTL_MS,
    ACTIVE_TTL_MS: ACTIVE_TTL_MS,
    NONE_STALE_MAX_MS: NONE_STALE_MAX_MS,
    ACTIVE_NO_EXPIRY_MAX_MS: ACTIVE_NO_EXPIRY_MAX_MS,
    ACTIVE_STALE_MAX_MS: ACTIVE_STALE_MAX_MS,
    REASON_MONTHLY_LIMIT: REASON_MONTHLY_LIMIT,
    REASON_PASS_LIMIT: REASON_PASS_LIMIT,
    REASON_NONE: REASON_NONE,
    normalizeTier: normalizeTier,
    passLimitForTier: passLimitForTier,
    monthlyLimitForTier: monthlyLimitForTier,
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
    storeMonthlyQuotaFromPayload: storeMonthlyQuotaFromPayload,
    markPassEndedFromPayload: markPassEndedFromPayload,
    isMonthlyLimitPayload: isMonthlyLimitPayload,
  };
});
