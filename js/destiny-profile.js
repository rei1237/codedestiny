/* ═══════════════════════════════════════════════════════════════
   Destiny Profile Manager  ·  v1.0
   Deep Space & Sacred Gold — 생년월일 & 장소 기반 시차 보정 프로필
   Namespace: FORTUNE_APP_USER_PROFILES
   CustomEvent: 'destinyProfileChanged' → 사주 엔진 자동 연동
═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  /* 출생지 드롭다운에서 저장된 좌표에 '가장 가까운' 도시 옵션을 선택한다.
     모든 한국 도시가 option.value='Asia/Seoul'로 동일하고, 인접 도시(예: 대구 128.60°E·부산 129.08°E)는
     경도 차가 1도 미만이라, 과거의 "경도차<1도 첫 매칭"은 목록에서 앞선 도시로 오선택됐다(대구 선택→부산).
     tz가 일치하는 옵션 중 경도(+위도) 거리가 최소인 옵션을 고르므로 특정 도시 하드코딩 없이 전 지역이 정확히 복원된다. */
  function _dpSelectBirthPlaceOption(countrySel, tz, lng, lat) {
    if (!countrySel || !tz) return false;
    var targetLng = Number(lng);
    var hasLng = isFinite(targetLng);
    var targetLat = Number(lat);
    var hasLat = isFinite(targetLat);
    var bestIdx = -1;
    var bestScore = Infinity;
    var tzFallbackIdx = -1;
    for (var i = 0; i < countrySel.options.length; i++) {
      var opt = countrySel.options[i];
      if (opt.value !== tz) continue;
      if (tzFallbackIdx < 0) tzFallbackIdx = i;
      if (!hasLng) continue;
      var optLng = parseFloat(opt.getAttribute('data-long'));
      if (!isFinite(optLng)) continue;
      var score = Math.abs(optLng - targetLng);
      if (hasLat) {
        var optLat = parseFloat(opt.getAttribute('data-lat'));
        if (isFinite(optLat)) score += Math.abs(optLat - targetLat);
      }
      if (score < bestScore) { bestScore = score; bestIdx = i; }
    }
    var chosen = bestIdx >= 0 ? bestIdx : tzFallbackIdx;
    if (chosen < 0) return false;
    countrySel.selectedIndex = chosen;
    try { countrySel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    return true;
  }

  /* ── 스토리지 키 ── */
  var NS       = 'FORTUNE_APP_USER_PROFILES';
  var KEY_LIST = NS + '.list';
  var KEY_CURR = NS + '.current';
  var KEY_SCOPE_HINT  = NS + '.scope';
  var KEY_LEGACY_OWNER = NS + '.legacyOwner';
  var KEY_LIST_PREFIX = NS + '.list::';
  var KEY_CURR_PREFIX = NS + '.current::';
  var KEY_META_PREFIX = NS + '.meta::';
  var KEY_POLICY_PREFIX = NS + '.policy::';
  var PROFILE_POLICY_TTL_MS = 10 * 60 * 1000;
  var _dpScopedStorageReadyScope = '';
  var _dpProfileMemoryScope = '';
  var _dpProfiles = [];
  var _dpCurrentId = '';
  var PROFILE_CARD_MANAGE_FEATURE_KEY = 'profile-card-manage';
  var PROFILE_CARD_MANAGE_COST = 50;
  var PROFILE_CARD_MANAGE_MONTHLY_COST = PROFILE_CARD_MANAGE_COST * 10;
  var DP_PROFILE_DELETE_GATE_MARKER = 'profile-delete-dedicated-gate-v20260618-monthly';
  var ACTIVE_PROFILE_CACHE_KEY = 'code-destiny.activeProfileCache.v1';
  var ACTIVE_PROFILE_ID_KEY = 'code-destiny.activeProfileId';
  var GUEST_PROFILE_KEY = 'codeDestiny:guestProfile';
  var _dpProfileMenuLastTouchAt = 0;
  var _dpProfileMenuPointerHandledAt = 0;
  var _dpProfileMenuSyntheticEvent = false;
  var DP_TEXT_TRANSLATIONS = {
    ko: {
      apiCooldown: '서버 응답이 불안정하여 잠시 대기 중입니다. 잠시 후 다시 시도해 주세요.',
      apiConnectionFailed: 'API 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      networkError: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      passAppliedOverlay: '이용권이 적용되었습니다.\n이번 콘텐츠는 보유한 이용권으로 무료 이용됩니다.\n추가 결제 없이 바로 열어드릴게요.',
      monthlyAppliedOverlay: '월정석 사용이 완료되었습니다.\n보유한 월정석으로 이번 콘텐츠를 이용합니다.\n바로 열어드릴게요.',
      paymentCompleteOverlay: '결제가 완료되었습니다.\n콘텐츠를 여는 중입니다.\n잠시만 기다려 주세요.',
      subscriptionIncluded: '이용권으로 추가 결제 없이 이용합니다.',
      serviceTermDisclaimer: '결제 완료 후 즉시 서비스가 제공됩니다. 구매한 서비스는 결제가 확인되는 순간부터 이용이 시작됩니다.',
      paymentBeforeWarning: '⚠️ 이 서비스는 결제 완료 후 즉시 제공되며, 구매 확인 후에는 환불이 불가능합니다.',
      openProfileList: '프로필 목록 열기',
      profileCardManage: '프로필 카드 관리',
      loginRequiredConfirm: '🔒 프로필 카드는 로그인 후에만 생성할 수 있습니다.\n로그인 페이지로 이동할까요?',
      close: '닫기',
    },
    en: {
      apiCooldown: 'The server response is unstable, so we are waiting briefly. Please try again soon.',
      apiConnectionFailed: 'API connection failed. Please try again soon.',
      networkError: 'A network error occurred. Please try again soon.',
      passAppliedOverlay: 'Your pass has been applied.\nThis content is free with your current pass.\nIt will open without any extra payment.',
      monthlyAppliedOverlay: 'Your Moonlight Stones have been used.\nThis content is unlocked with your Moonlight Stones.\nOpening it now.',
      paymentCompleteOverlay: 'Payment complete.\nOpening your content now.\nPlease wait a moment.',
      subscriptionIncluded: 'Using your pass with no additional payment.',
      serviceTermDisclaimer: 'The service is provided immediately upon payment completion. Your purchased service begins the moment payment is confirmed.',
      paymentBeforeWarning: '⚠️ This service is provided immediately upon payment completion, and refunds are not possible after purchase confirmation.',
      openProfileList: 'Open profile list',
      profileCardManage: 'Manage profile cards',
      loginRequiredConfirm: '🔒 Profile cards can only be created after login.\nMove to the login page?',
      close: 'Close',
    },
    ja: {
      apiCooldown: 'サーバー応答が不安定なため、しばらく待機しています。少し後でもう一度お試しください。',
      apiConnectionFailed: 'API接続に失敗しました。少し後でもう一度お試しください。',
      networkError: 'ネットワークエラーが発生しました。少し後でもう一度お試しください。',
      passAppliedOverlay: '利用券が適用されました。\nこのコンテンツはお持ちの利用券で無料で利用できます。\n追加決済なしですぐに開きます。',
      monthlyAppliedOverlay: '月精石の使用が完了しました。\nこのコンテンツはお持ちの月精石で利用します。\nすぐに開きます。',
      paymentCompleteOverlay: '決済が完了しました。\nコンテンツを開いています。\n少々お待ちください。',
      subscriptionIncluded: '利用券で追加決済なしに利用します。',
      serviceTermDisclaimer: '決済完了後、サービスが即座に提供されます。購入したサービスは、決済が確認された時点から利用が開始されます。',
      paymentBeforeWarning: '⚠️ このサービスは決済完了後に即座に提供されるため、購入確認後の返金はできません。',
      openProfileList: 'プロフィール一覧を開く',
      profileCardManage: 'プロフィールカード管理',
      loginRequiredConfirm: '🔒 プロフィールカードはログイン後にのみ作成できます。\nログインページへ移動しますか？',
      close: '閉じる',
    },
    'zh-CN': {
      apiCooldown: '服务器响应不稳定，正在短暂等待。请稍后再试。',
      apiConnectionFailed: 'API 连接失败。请稍后再试。',
      networkError: '发生网络错误。请稍后再试。',
      passAppliedOverlay: '已应用使用券。\n本内容可使用当前持有的使用券免费查看。\n无需额外付款，将立即开启。',
      monthlyAppliedOverlay: '月精石使用完成。\n本内容将使用您持有的月精石。\n即将为您开启。',
      paymentCompleteOverlay: '支付完成。\n正在为您开启内容。\n请稍候。',
      subscriptionIncluded: '使用券已生效，无需额外付款。',
      serviceTermDisclaimer: '付款完成后，服务将立即提供。购买的服务在付款确认的那一刻开始使用。',
      paymentBeforeWarning: '⚠️ 本服务在完成付款后立即提供，购买确认后无法退款。',
      openProfileList: '打开个人资料列表',
      profileCardManage: '管理个人资料卡',
      loginRequiredConfirm: '🔒 个人资料卡只能在登录后创建。\n要前往登录页面吗？',
      close: '关闭',
    },
    'zh-TW': {
      apiCooldown: '伺服器回應不穩定，正在短暫等待。請稍後再試。',
      apiConnectionFailed: 'API 連線失敗。請稍後再試。',
      networkError: '發生網路錯誤。請稍後再試。',
      passAppliedOverlay: '已套用使用券。\n本內容可使用目前持有的使用券免費查看。\n無需額外付款，將立即開啟。',
      monthlyAppliedOverlay: '月精石使用完成。\n本內容將使用您持有的月精石。\n即將為您開啟。',
      paymentCompleteOverlay: '付款完成。\n正在為您開啟內容。\n請稍候。',
      subscriptionIncluded: '使用券已生效，無需額外付款。',
      serviceTermDisclaimer: '付款完成後，服務將立即提供。購買的服務在付款確認的那一刻開始使用。',
      paymentBeforeWarning: '⚠️ 本服務在完成付款後立即提供，購買確認後無法退款。',
      openProfileList: '開啟個人資料列表',
      profileCardManage: '管理個人資料卡',
      loginRequiredConfirm: '🔒 個人資料卡只能在登入後建立。\n要前往登入頁面嗎？',
      close: '關閉',
    },
  };

  function _dpTextLang() {
    var lang = 'ko';
    try {
      if (typeof window !== 'undefined' && typeof window.cdGetCurrentLanguage === 'function') lang = window.cdGetCurrentLanguage();
      else if (typeof window !== 'undefined' && window.localStorage) lang = window.localStorage.getItem('cd_lang') || lang;
    } catch (_) {}
    lang = String(lang || 'ko').toLowerCase();
    if (lang === 'zh' || lang === 'zh-cn' || lang === 'zh-hans') return 'zh-CN';
    if (lang === 'zh-tw' || lang === 'zh-hant' || lang === 'zh-hk') return 'zh-TW';
    if (lang.indexOf('ja') === 0) return 'ja';
    if (lang.indexOf('en') === 0) return 'en';
    return 'ko';
  }

  function _dpText(key) {
    var table = DP_TEXT_TRANSLATIONS[_dpTextLang()] || DP_TEXT_TRANSLATIONS.en;
    return table[key] || DP_TEXT_TRANSLATIONS.en[key] || 'Translation pending';
  }

  function _dpReadAuthUser() {
    try {
      var raw = localStorage.getItem('fortune_auth_user') || '';
      var parsed = raw ? JSON.parse(raw) : null;
      var safe = _dpSanitizeAuthUser(parsed);
      if (!safe) return null;
      var normalized = JSON.stringify(safe);
      if (raw !== normalized) localStorage.setItem('fortune_auth_user', normalized);
      return safe;
    } catch (e) {
      return null;
    }
  }

  function _dpIsAuthRequiredResult(result) {
    var data = result && result.data && typeof result.data === 'object' ? result.data : {};
    var error = data.error && typeof data.error === 'object' ? data.error : {};
    var code = String(data.code || error.code || result && result.code || '').trim().toUpperCase();
    return Number(result && result.status || 0) === 401
      || code === 'AUTH_REQUIRED'
      || code === 'LOGIN_REQUIRED'
      || code === 'NOT_LOGGED_IN'
      || code === 'TOKEN_EXPIRED';
  }

  function _dpResolveIdScope(user) {
    var scopeRaw = user && (user.id || user.userId || user._id || user.uid);
    return String(scopeRaw || '').trim().toLowerCase();
  }

  function _dpIsActiveMembershipStatusValue(value) {
    var status = String(value || '').trim().toLowerCase();
    return status === 'active'
      || status === 'paid'
      || status === 'current'
      || status === 'subscribed'
      || status === 'trialing'
      || status === 'success'
      || status === 'registered'
      || status === 'registering'
      || status === 'enrolled'
      || status === 'enabled'
      || status === 'valid'
      || status === 'ok'
      || status === 'complete'
      || status === 'completed'
      || status === 'confirmed'
      || status === 'approved'
      || status === '\uB4F1\uB85D\uC911'
      || status === '\uC774\uC6A9\uC911'
      || status === '\uC720\uD6A8'
      || status === '\uC644\uB8CC';
  }

  function _dpHasFutureMembershipExpiry(value) {
    if (!value) return false;
    var expiresAt = new Date(value);
    return isFinite(expiresAt.getTime()) && expiresAt.getTime() > Date.now();
  }

  function _dpSanitizeAuthUser(user) {
    if (!user || typeof user !== 'object') return null;
    var safe = {};
    if (user.id) safe.id = String(user.id);
    if (user.userId) safe.userId = String(user.userId);
    if (user._id) safe._id = String(user._id);
    if (user.uid) safe.uid = String(user.uid);
    if (user.name) safe.name = String(user.name);
    if (user.email) safe.email = String(user.email);
    if (user.userEmail) safe.userEmail = String(user.userEmail);
    if (user.phoneNumber) safe.phoneNumber = String(user.phoneNumber);
    if (user.phone) safe.phone = String(user.phone);
    if (user.role) safe.role = String(user.role);
    if (user.plan) safe.plan = String(user.plan);
    if (typeof user.hasLocalAuth === 'boolean') safe.hasLocalAuth = user.hasLocalAuth;
    var points = Number(user.points);
    if (Number.isFinite(points) && points >= 0) safe.points = points;
    if (user.profileSubscription && typeof user.profileSubscription === 'object') {
      var tierValue = String(user.profileSubscription.tier || user.profileSubscription.passTier || user.profileSubscription.plan || user.profileSubscription.planId || user.profileSubscription.productId || user.plan || 'free');
      var activeValue = Boolean(
        user.profileSubscription.isActive
        || user.profileSubscription.isSubscribed
        || user.profileSubscription.active
        || user.profileSubscription.enabled
        || user.profileSubscription.valid
        || user.profileSubscription.registered
        || _dpIsActiveMembershipStatusValue(user.profileSubscription.status)
        || _dpIsActiveMembershipStatusValue(user.profileSubscription.subscriptionStatus)
        || _dpIsActiveMembershipStatusValue(user.profileSubscription.membershipStatus)
        || _dpIsActiveMembershipStatusValue(user.profileSubscription.lastBillingStatus)
        || _dpHasFutureMembershipExpiry(user.profileSubscription.expiresAt)
      );
      safe.profileSubscription = {
        tier: tierValue,
        isActive: activeValue,
        isSubscribed: activeValue,
        expiresAt: user.profileSubscription.expiresAt || null,
      };
      var passLimit = Number(user.profileSubscription.passLimit || user.profileSubscription.freeLimit || user.profileSubscription.maxFreeCoinLimit || user.profileSubscription.maxCoveredCoin);
      var tierKey = String(safe.profileSubscription.tier || '').toLowerCase();
      var policyPassLimit = tierKey.indexOf('vvip') >= 0 ? 100 : (tierKey.indexOf('premium') >= 0 ? 50 : (tierKey.indexOf('standard') >= 0 ? 30 : 0));
      if (policyPassLimit > 0) {
        safe.profileSubscription.passLimit = policyPassLimit;
        safe.profileSubscription.freeLimit = policyPassLimit;
        safe.profileSubscription.maxCoveredCoin = policyPassLimit;
      } else if (Number.isFinite(passLimit) && passLimit > 0) {
        safe.profileSubscription.passLimit = Math.floor(passLimit);
        safe.profileSubscription.freeLimit = Math.floor(passLimit);
        safe.profileSubscription.maxCoveredCoin = Math.floor(passLimit);
      }
      if (user.profileSubscription.passTier) safe.profileSubscription.passTier = String(user.profileSubscription.passTier);
      var profileLimit = _dpReadProfileLimitValue(user.profileSubscription);
      if (Number.isFinite(profileLimit) && profileLimit >= 0) safe.profileSubscription.profileLimit = Math.floor(profileLimit);
      if (user.profileSubscription.plan) safe.profileSubscription.plan = String(user.profileSubscription.plan);
      if (user.profileSubscription.planId) safe.profileSubscription.planId = String(user.profileSubscription.planId);
      if (user.profileSubscription.productId) safe.profileSubscription.productId = String(user.profileSubscription.productId);
      if (user.profileSubscription.status) safe.profileSubscription.status = String(user.profileSubscription.status);
    }
    if (user.profilePolicySnapshot && typeof user.profilePolicySnapshot === 'object') {
      var policySnapshot = _dpNormalizeProfilePolicySnapshot(user.profilePolicySnapshot, 'auth_user');
      if (policySnapshot) safe.profilePolicySnapshot = policySnapshot;
    }
    return Object.keys(safe).length ? safe : null;
  }

  function _dpWriteAuthUser(user) {
    try {
      var safe = _dpSanitizeAuthUser(user);
      if (!safe) {
        localStorage.removeItem('fortune_auth_user');
        return null;
      }
      localStorage.setItem('fortune_auth_user', JSON.stringify(safe));
      return safe;
    } catch (e) {
      return null;
    }
  }

  function _dpResolveProfileScope(user) {
    var scope = _dpResolveIdScope(user);
    if (!scope && typeof _dpSessionVerify !== 'undefined' && _dpSessionVerify && _dpSessionVerify.ok && _dpSessionVerify.userId) {
      scope = String(_dpSessionVerify.userId).trim().toLowerCase();
    }
    return scope || 'guest';
  }

  function _dpGetProfileScope() {
    return _dpResolveProfileScope(_dpReadAuthUser());
  }

  function _dpGetScopedListKey(scope) {
    return KEY_LIST_PREFIX + String(scope || 'guest');
  }

  function _dpGetScopedCurrentKey(scope) {
    return KEY_CURR_PREFIX + String(scope || 'guest');
  }

  function _dpGetScopedMetaKey(scope) {
    return KEY_META_PREFIX + String(scope || 'guest');
  }

  function _dpGetScopedPolicyKey(scope) {
    return KEY_POLICY_PREFIX + String(scope || 'guest');
  }

  function _dpNormalizeProfilePolicySnapshot(snapshot, source) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    var tier = _dpNormalizeTier(snapshot.tier || snapshot.passTier || snapshot.plan || 'free');
    var active = !!snapshot.isActive && tier !== 'free';
    var rawLimit = snapshot.maxProfileCount;
    if (rawLimit == null) rawLimit = snapshot.profileLimit;
    if (rawLimit == null) rawLimit = snapshot.maxProfiles;
    var resolvedLimit = _dpResolveProfileLimit(tier, rawLimit);
    if (!active) resolvedLimit = 1;
    var fetchedAt = Number(snapshot.fetchedAt);
    if (!isFinite(fetchedAt) || fetchedAt <= 0) fetchedAt = Date.now();
    var ttlMs = Number(snapshot.ttlMs);
    if (!isFinite(ttlMs) || ttlMs <= 0) ttlMs = PROFILE_POLICY_TTL_MS;
    return {
      tier: tier,
      isActive: active,
      profileLimit: resolvedLimit,
      maxProfileCount: resolvedLimit,
      unlimited: _dpIsUnlimitedProfileLimit(resolvedLimit),
      expiresAt: snapshot.expiresAt || null,
      fetchedAt: Math.floor(fetchedAt),
      ttlMs: Math.floor(ttlMs),
      source: String(snapshot.source || source || 'client')
    };
  }

  function _dpWriteProfilePolicySnapshot(scope, snapshot) {
    var normalized = _dpNormalizeProfilePolicySnapshot(snapshot, 'client');
    if (!normalized) return null;
    try {
      localStorage.setItem(_dpGetScopedPolicyKey(scope || _dpGetProfileScope()), JSON.stringify(normalized));
    } catch (e) {}
    return normalized;
  }

  function _dpReadProfilePolicySnapshot(scope) {
    var safeScope = String(scope || _dpGetProfileScope() || 'guest');
    try {
      var raw = localStorage.getItem(_dpGetScopedPolicyKey(safeScope)) || '';
      if (!raw) return null;
      var snapshot = _dpNormalizeProfilePolicySnapshot(JSON.parse(raw), 'cache');
      if (!snapshot) return null;
      if (Date.now() - snapshot.fetchedAt > snapshot.ttlMs) snapshot.stale = true;
      return snapshot;
    } catch (e) {
      try { localStorage.removeItem(_dpGetScopedPolicyKey(safeScope)); } catch (_) {}
      return null;
    }
  }

  function _dpApplyProfilePolicySnapshot(snapshot, source) {
    var normalized = _dpNormalizeProfilePolicySnapshot(snapshot, source);
    if (!normalized) return false;
    var scope = _dpGetProfileScope();
    _dpWriteProfilePolicySnapshot(scope, normalized);
    _dpSubTier = normalized.tier;
    _dpSubIsActive = normalized.isActive;
    _dpSubProfileLimit = normalized.maxProfileCount;
    _dpSubScope = scope;
    _dpWriteSubCache(normalized.tier, normalized.isActive, normalized.maxProfileCount, normalized.expiresAt);
    return true;
  }

  function _dpIsLoggedInScope(scope) {
    var safeScope = String(scope || _dpGetProfileScope() || 'guest').trim().toLowerCase();
    return !!safeScope && safeScope !== 'guest';
  }

  function _dpGetScopedActiveProfileIdKey(scope) {
    return ACTIVE_PROFILE_ID_KEY + '::' + String(scope || 'guest');
  }

  function _dpGetScopedActiveProfileCacheKey(scope) {
    return ACTIVE_PROFILE_CACHE_KEY + '::' + String(scope || 'guest');
  }

  function _dpGetAuthTokenCacheHint() {
    var token = '';
    try {
      token = String(_dpReadStoredAuthToken() || '').trim();
    } catch (e) {}
    if (!token) return '';
    return [token.length, token.slice(0, 8), token.slice(-16)].join(':');
  }

  function _dpReadStoredProfileState(scope) {
    var safeScope = String(scope || 'guest');
    try {
      var raw = localStorage.getItem(_dpGetScopedListKey(safeScope)) || '';
      var profiles = raw ? _dpNormalizeProfiles(JSON.parse(raw)) : [];
      var currentId = String(localStorage.getItem(_dpGetScopedCurrentKey(safeScope)) || '');
      return {
        profiles: profiles,
        currentId: _dpResolveCurrentIdFromProfiles(profiles, currentId)
      };
    } catch (e) {
      try {
        localStorage.removeItem(_dpGetScopedListKey(safeScope));
        localStorage.removeItem(_dpGetScopedCurrentKey(safeScope));
        localStorage.removeItem(_dpGetScopedMetaKey(safeScope));
      } catch (_) {}
      return { profiles: [], currentId: '' };
    }
  }

  function _dpWriteStoredProfileState(scope, profiles, currentId) {
    var safeScope = String(scope || 'guest');
    try {
      var normalized = _dpNormalizeProfiles(profiles);
      var resolvedCurrentId = _dpResolveCurrentIdFromProfiles(normalized, currentId);
      localStorage.setItem(_dpGetScopedListKey(safeScope), JSON.stringify(normalized));
      localStorage.setItem(_dpGetScopedCurrentKey(safeScope), resolvedCurrentId);
      localStorage.setItem(_dpGetScopedMetaKey(safeScope), JSON.stringify({
        scope: safeScope,
        tokenHint: safeScope === 'guest' ? '' : _dpGetAuthTokenCacheHint(),
        savedAt: Date.now()
      }));
      localStorage.setItem(_dpGetScopedActiveProfileIdKey(safeScope), resolvedCurrentId);
      var active = _dpPickProfileFromPayload(normalized, resolvedCurrentId);
      if (active) {
        var activePayload = JSON.stringify(active);
        localStorage.setItem(_dpGetScopedActiveProfileCacheKey(safeScope), activePayload);
        try { sessionStorage.setItem(_dpGetScopedActiveProfileCacheKey(safeScope), activePayload); } catch (_) {}
      } else {
        localStorage.removeItem(_dpGetScopedActiveProfileCacheKey(safeScope));
        try { sessionStorage.removeItem(_dpGetScopedActiveProfileCacheKey(safeScope)); } catch (_) {}
      }
    } catch (e) {}
  }

  function _dpClearLegacyProfileStorage() {
    try {
      var directKeys = [KEY_LIST, KEY_CURR, KEY_SCOPE_HINT, KEY_LEGACY_OWNER];
      for (var i = 0; i < directKeys.length; i += 1) localStorage.removeItem(directKeys[i]);
    } catch (e) {}
  }

  function _dpClearGlobalProfileBridge() {
    try {
      localStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
      localStorage.removeItem(ACTIVE_PROFILE_CACHE_KEY);
      localStorage.removeItem('FORTUNE_APP_USER_PROFILE');
      localStorage.removeItem('FORTUNE_APP_VEDIC_PAYLOAD');
      localStorage.removeItem('OLYMPUS_ORACLE_PROFILE');
      sessionStorage.removeItem(ACTIVE_PROFILE_CACHE_KEY);
      sessionStorage.removeItem('FORTUNE_APP_USER_PROFILE');
      sessionStorage.removeItem('FORTUNE_APP_VEDIC_PAYLOAD');
      sessionStorage.removeItem('OLYMPUS_ORACLE_PROFILE');
    } catch (e) {}
  }

  function _dpToProfileInt(value, fallback) {
    var n = parseInt(value, 10);
    return isFinite(n) ? n : fallback;
  }

  function _dpHasValidProfileDate(year, month, day) {
    if (!isFinite(year) || !isFinite(month) || !isFinite(day)) return false;
    var dt = new Date(Date.UTC(year, month - 1, day));
    return dt.getUTCFullYear() === year && dt.getUTCMonth() + 1 === month && dt.getUTCDate() === day;
  }

  function _dpBuildProfileBirthDateValue(year, month, day) {
    year = _dpToProfileInt(year, NaN);
    month = _dpToProfileInt(month, NaN);
    day = _dpToProfileInt(day, NaN);
    if (!_dpHasValidProfileDate(year, month, day)) return '';
    return String(year).padStart(4, '0') + '-' + _dpPad2(month) + '-' + _dpPad2(day);
  }

  function _dpNormalizeBirthDateInputValue(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    var digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return raw;
    return _dpBuildProfileBirthDateValue(digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)) || raw;
  }

  function _dpNormalizeProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    var next = Object.assign({}, profile);
    var id = String(next.id || next.profileId || '').trim();
    if (id) {
      next.id = id;
      next.profileId = id;
    }

    var birth = next.birth && typeof next.birth === 'object' ? Object.assign({}, next.birth) : {};
    var dateText = typeof next.birthDate === 'string' ? next.birthDate : '';
    if (!dateText && typeof next.birthIso === 'string') dateText = String(next.birthIso).split(/[T\s]/)[0] || '';
    var parsedDate = null;
    if (dateText) {
      var dateParts = dateText.indexOf('-') >= 0 || dateText.indexOf('/') >= 0
        ? dateText.split(/[-/]/)
        : [dateText.slice(0, 4), dateText.slice(4, 6), dateText.slice(6, 8)];
      if (dateParts.length >= 3) {
        parsedDate = {
          year: _dpToProfileInt(dateParts[0], NaN),
          month: _dpToProfileInt(dateParts[1], NaN),
          day: _dpToProfileInt(dateParts[2], NaN)
        };
      }
    }

    var timeText = typeof next.birthTime === 'string' ? next.birthTime : '';
    if (!timeText && typeof next.birthIso === 'string') {
      var isoTime = String(next.birthIso).split(/[T\s]/)[1] || '';
      if (isoTime) timeText = isoTime;
    }
    var parsedTime = null;
    if (timeText) {
      var timeParts = timeText.split(':');
      if (timeParts.length >= 2) {
        parsedTime = {
          hour: _dpToProfileInt(timeParts[0], NaN),
          minute: _dpToProfileInt(timeParts[1], NaN)
        };
      }
    }

    var year = _dpToProfileInt(birth.year != null ? birth.year : (next.birthYear != null ? next.birthYear : parsedDate && parsedDate.year), NaN);
    var month = _dpToProfileInt(birth.month != null ? birth.month : (next.birthMonth != null ? next.birthMonth : parsedDate && parsedDate.month), NaN);
    var day = _dpToProfileInt(birth.day != null ? birth.day : (next.birthDay != null ? next.birthDay : parsedDate && parsedDate.day), NaN);

    if (_dpHasValidProfileDate(year, month, day)) {
      var hour = _dpToProfileInt(birth.hour != null ? birth.hour : (next.birthHour != null ? next.birthHour : parsedTime && parsedTime.hour), 12);
      var minute = _dpToProfileInt(birth.minute != null ? birth.minute : (next.birthMinute != null ? next.birthMinute : parsedTime && parsedTime.minute), 0);
      if (hour < 0 || hour > 23) hour = 12;
      if (minute < 0 || minute > 59) minute = 0;
      var calType = String(birth.calType || next.calType || next.calendarType || 'solar').trim();
      if (calType !== 'lunar' && calType !== 'lunar_leap') calType = 'solar';

      next.birth = Object.assign({}, birth, {
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        calType: calType
      });
      next.birthYear = year;
      next.birthMonth = month;
      next.birthDay = day;
      next.birthHour = hour;
      next.birthMinute = minute;
      next.calType = calType;
      next.birthDate = year + '-' + _dpPad2(month) + '-' + _dpPad2(day);
      next.birthTime = _dpPad2(hour) + ':' + _dpPad2(minute);
      next.birthIso = next.birthDate + ' ' + next.birthTime;
    }

    return next;
  }

  function _dpNormalizeProfiles(profiles) {
    if (!Array.isArray(profiles)) return [];
    return profiles.map(_dpNormalizeProfile).filter(function(profile) {
      return profile && typeof profile === 'object';
    });
  }

  function _dpReadJsonStore(store, key) {
    try {
      var raw = store && store.getItem ? store.getItem(key) : '';
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function _dpPickProfileFromPayload(payload, requestedId) {
    if (!payload) return null;
    var targetId = String(requestedId || '').trim();
    if (Array.isArray(payload)) {
      var normalizedList = _dpNormalizeProfiles(payload);
      if (targetId) {
        for (var i = 0; i < normalizedList.length; i += 1) {
          if (_dpGetProfileId(normalizedList[i]) === targetId) return normalizedList[i];
        }
      }
      return normalizedList[0] || null;
    }
    if (typeof payload !== 'object') return null;
    var nested = payload.profile || payload.currentProfile || payload.destinyProfile || payload.payload;
    if (nested && nested !== payload) {
      var nestedProfile = _dpPickProfileFromPayload(nested, targetId);
      if (nestedProfile) return nestedProfile;
    }
    var normalized = _dpNormalizeProfile(payload);
    return normalized && (normalized.birth || normalized.birthDate || normalized.birthYear) ? normalized : null;
  }

  function _dpResolveCurrentProfileForSaju(profileId) {
    var requestedId = String(profileId || '').trim();
    var current = DPStorage.current();
    if (current && (!requestedId || _dpGetProfileId(current) === requestedId)) return current;

    var list = DPStorage.list();
    var listed = _dpPickProfileFromPayload(list, requestedId);
    if (listed) return listed;

    var scope = _dpGetProfileScope();
    var loggedIn = _dpIsLoggedInScope(scope);
    var cacheId = requestedId;
    try {
      cacheId = cacheId || String(localStorage.getItem(_dpGetScopedActiveProfileIdKey(scope)) || '').trim();
      if (!loggedIn) cacheId = cacheId || String(localStorage.getItem(ACTIVE_PROFILE_ID_KEY) || '').trim();
    } catch (e) {}

    var globalProfile = null;
    try {
      globalProfile = window.__cdCurrentDestinyProfile || window.__cdActiveBirthProfile || null;
    } catch (e2) {}
    var fromGlobal = _dpPickProfileFromPayload(globalProfile, cacheId);
    if (fromGlobal) return fromGlobal;

    var stores = [];
    try { stores.push(localStorage); } catch (e3) {}
    try { stores.push(sessionStorage); } catch (e4) {}
    var keys = loggedIn
      ? [_dpGetScopedActiveProfileCacheKey(scope)]
      : [_dpGetScopedActiveProfileCacheKey(scope), GUEST_PROFILE_KEY, ACTIVE_PROFILE_CACHE_KEY, 'FORTUNE_APP_USER_PROFILE', 'FORTUNE_APP_VEDIC_PAYLOAD', 'OLYMPUS_ORACLE_PROFILE'];
    for (var si = 0; si < stores.length; si += 1) {
      for (var ki = 0; ki < keys.length; ki += 1) {
        var cached = _dpPickProfileFromPayload(_dpReadJsonStore(stores[si], keys[ki]), cacheId);
        if (cached) return cached;
      }
    }
    return null;
  }

  function _dpResolveCurrentIdFromProfiles(profiles, currentId) {
    var requested = String(currentId || '').trim();
    if (requested) {
      for (var i = 0; i < profiles.length; i += 1) {
        var rowId = _dpGetProfileId(profiles[i]);
        if (rowId === requested) return rowId;
      }
    }
    return profiles.length ? _dpGetProfileId(profiles[0]) : '';
  }

  function _dpGetProfileId(profile) {
    return String((profile && (profile.id || profile.profileId)) || '').trim();
  }

  function _dpPublishCurrentProfile() {
    try {
      var current = DPStorage.current();
      if (current) window.__cdCurrentDestinyProfile = current;
      else delete window.__cdCurrentDestinyProfile;
    } catch (e) {}
  }

  function _dpSetProfileState(scope, profiles, currentId) {
    var nextScope = String(scope || 'guest');
    var activeScope = _dpGetProfileScope();
    if (nextScope !== activeScope) {
      if (_dpProfileMemoryScope !== activeScope) {
        _dpProfileMemoryScope = activeScope;
        _dpProfiles = [];
        _dpCurrentId = '';
        _dpPublishCurrentProfile();
      }
      _dpClearLegacyProfileStorage();
      return false;
    }
    _dpProfileMemoryScope = nextScope;
    _dpProfiles = _dpNormalizeProfiles(profiles);
    _dpCurrentId = _dpResolveCurrentIdFromProfiles(_dpProfiles, currentId);
    _dpClearLegacyProfileStorage();
    if (_dpIsLoggedInScope(nextScope)) _dpClearGlobalProfileBridge();
    _dpWriteStoredProfileState(nextScope, _dpProfiles, _dpCurrentId);
    _dpPublishCurrentProfile();
    return true;
  }

  function _dpEnsureScopedStorageReady() {
    var scope = _dpGetProfileScope();
    if (_dpScopedStorageReadyScope !== scope || _dpProfileMemoryScope !== scope) {
      _dpScopedStorageReadyScope = scope;
      _dpProfileMemoryScope = scope;
      var cached = _dpReadStoredProfileState(scope);
      _dpProfiles = cached.profiles;
      _dpCurrentId = cached.currentId;
      _dpPublishCurrentProfile();
    }
    _dpClearLegacyProfileStorage();

    return scope;
  }

  /* ──────────────────────────────────────────
     1. Storage Module
  ────────────────────────────────────────── */
  var DPStorage = {
    list: function() {
      _dpEnsureScopedStorageReady();
      return _dpProfiles.slice();
    },
    save: function(profiles) {
      var scope = _dpEnsureScopedStorageReady();
      _dpSetProfileState(scope, profiles, _dpCurrentId);
    },
    current: function() {
      try {
        _dpEnsureScopedStorageReady();
        var id = String(_dpCurrentId || '').trim();
        if (!id) return null;
        return _dpProfiles.find(function(p) { return _dpGetProfileId(p) === id; }) || null;
      } catch(e) { return null; }
    },
    setCurrent: function(id) {
      _dpEnsureScopedStorageReady();
      try {
        var scope = _dpEnsureScopedStorageReady();
        var baseCurrentId = _dpCurrentId;
        _dpCurrentId = _dpResolveCurrentIdFromProfiles(_dpProfiles, id || '');
        if (_dpCurrentId) _dpMarkPendingCurrentProfile(_dpCurrentId);
        _dpWriteStoredProfileState(scope, _dpProfiles, _dpCurrentId);
        _dpPublishCurrentProfile();
        _dpSetCurrentOnServerDebounced(_dpCurrentId, baseCurrentId);
      } catch(e) {}
    },
    add: function(profile) {
      var scope = _dpEnsureScopedStorageReady();
      var list = DPStorage.list();
      profile.id = 'dp_' + Date.now();
      profile.createdAt = new Date().toISOString();
      profile.ownerScope = scope;
      if (list.length === 0) DPStorage.setCurrent(profile.id);
      list.push(profile);
      DPStorage.save(list);
      return profile;
    },
    remove: function(id) {
      var scope = _dpEnsureScopedStorageReady();
      var targetId = String(id || '').trim();
      var list = DPStorage.list().filter(function(p) {
        return _dpGetProfileId(p) !== targetId;
      });
      _dpSetProfileState(scope, list, _dpCurrentId === targetId ? (list.length ? _dpGetProfileId(list[0]) : '') : _dpCurrentId);
    },
    update: function(id, patch) {
      var scope = _dpEnsureScopedStorageReady();
      var targetId = String(id || '').trim();
      var list = DPStorage.list().map(function(p) {
        return String((p && (p.id || p.profileId)) || '').trim() === targetId ? Object.assign({}, p, patch) : p;
      });
      _dpSetProfileState(scope, list, _dpCurrentId || id);
    }
  };

  /* ──────────────────────────────────────────
     1-S. 서버 동기화 (로그인 상태 전용)
     생년월일·출생시간·성별 정보는 운세 서비스 제공 목적에 한해 서버에 저장됩니다.
  ────────────────────────────────────────── */
  function _dpReadStoredAuthToken() {
    try {
      return localStorage.getItem('fortune_auth_token') || sessionStorage.getItem('fortune_auth_token') || '';
    } catch (e) {
      return '';
    }
  }

  function _dpGetAuthToken() {
    return _dpReadStoredAuthToken();
  }

  /* 앱(Capacitor) 런타임인가.
     앱은 https://localhost 출처에서 돌고 API 는 https://code-destiny.com 으로 나간다. */
  function _dpIsMobileAppRuntime() {
    try {
      if (window.__CODE_DESTINY_RUNTIME_TARGET === 'mobile-app') return true;
      if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
        return !!window.Capacitor.isNativePlatform();
      }
      return !!window.Capacitor;
    } catch (e) {
      return false;
    }
  }

  function _dpBuildAuthHeaders(baseHeaders) {
    var headers = Object.assign({}, baseHeaders || {});
    /* 앱에서는 Authorization 을 직접 붙인다.
       웹은 index-inline-runtime.js 의 전역 fetch 패치가 "동일 출처 + /api/" 조건에서 토큰을 주입해 준다.
       앱은 출처(https://localhost)와 API(https://code-destiny.com)가 달라 그 조건이 거짓이고,
       세션 쿠키도 SameSite=Lax 라 교차 사이트로 전송되지 않는다 — 그래서 여기서 붙이지 않으면
       모든 프로필 호출이 게스트로 취급된다("로그인했는데 로그인 필요" 증상의 원인).
       후보 base 는 전부 자사 도메인(상대경로/localhost/code-destiny.com/워커)이라 유출 위험이 없다.
       웹 동작을 바꾸지 않기 위해 앱 런타임에서만 붙인다. */
    if (!headers.Authorization && !headers.authorization && _dpIsMobileAppRuntime()) {
      var token = _dpGetAuthToken();
      if (token) {
        headers.Authorization = 'Bearer ' + token;
        headers['X-Code-Destiny-Runtime'] = 'mobile-app';
      }
    }
    return headers;
  }

  /* 앱은 리프레시 쿠키를 받지도 보내지도 못한다(SameSite=Lax + https://localhost 출처).
     서버가 JSON 본문으로 내려준 리프레시 토큰을 여기서 헤더로 되돌려 보낸다.
     worker/routes/auth.js 의 APP_REFRESH_TOKEN_HEADER 와 짝을 이룬다. */
  var _DP_REFRESH_TOKEN_KEY = 'fortune_auth_refresh_token';

  function _dpBuildRefreshHeaders() {
    var headers = _dpBuildAuthHeaders();
    if (!_dpIsMobileAppRuntime()) return headers;
    try {
      var refreshToken = String(localStorage.getItem(_DP_REFRESH_TOKEN_KEY) || '').trim();
      if (refreshToken) headers['X-Code-Destiny-Refresh-Token'] = refreshToken;
    } catch (e) { /* 저장소 실패는 무시 — 쿠키 경로가 남아 있는 웹은 영향 없다 */ }
    return headers;
  }

  /* 서버는 갱신할 때마다 리프레시 토큰을 회전시킨다. 새 토큰을 갈아끼우지 않으면
     다음 갱신이 이미 회전된 토큰을 보내 재사용 탐지에 걸리고 전 세션이 폐기된다. */
  function _dpPersistAppRefreshToken(refreshToken) {
    if (!_dpIsMobileAppRuntime()) return;
    var token = String(refreshToken || '').trim();
    if (!token) return;
    try { localStorage.setItem(_DP_REFRESH_TOKEN_KEY, token); } catch (e) { /* noop */ }
  }

  var _DP_DEFAULT_API_WORKER_ORIGIN = 'https://code-destiny-web.bulegyung.workers.dev';
  var _DP_LOCAL_DEV_API_ORIGIN = '';
  var _DP_FETCH_TIMEOUT_MS = 20000;
  // 프로필 부트스트랩이 끊겼을 때 로딩 카드를 강제로 걷어내는 상한. 22s는 과도(스피너 오래 노출) —
  // 프로필 도착 즉시 렌더(인증검증 비대기)+서버 병렬화로 실제 로드가 빨라졌으므로 10s로 낮춘다.
  var PROFILE_LOADING_FAILSAFE_MS = 10000;
  var _dpRefreshSessionInFlight = null;
  var _dpApiInFlightGet = Object.create(null);
  var _dpApiCooldownUntil = Object.create(null);

  function _dpIsWorkerFallbackSafePath(pathname) {
    var path = String(pathname || '');
    if (!path || path.indexOf('/api/') !== 0) return false;
    if (path === '/api/auth/refresh' || path === '/api/auth/logout' || path === '/api/auth/login' || path === '/api/auth/register') {
      return false;
    }
    if (path.indexOf('/api/auth/oauth/') === 0) return false;
    if (path === '/api/auth/me') return true;
    if (path.indexOf('/api/profile') === 0) return true;
    return path.indexOf('/api/fortune/pig-coin/') === 0
      || path.indexOf('/api/billing/') === 0
      || path.indexOf('/api/payments/') === 0
      || path.indexOf('/api/subscription/') === 0;
  }

  function _dpIsWorkersDevHost(hostname) {
    var host = String(hostname || '').trim().toLowerCase();
    if (!host) return false;
    try {
      if (host.indexOf('://') >= 0) host = new URL(host).hostname.toLowerCase();
    } catch (_) {}
    return host === 'workers.dev' || host.slice(-12) === '.workers.dev';
  }

  function _dpIsLocalDevHost(hostname) {
    var host = String(hostname || '').trim().toLowerCase();
    if (!host) return false;
    try {
      if (host.indexOf('://') >= 0) host = new URL(host).hostname.toLowerCase();
    } catch (_) {}
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
  }

  function _dpNormalizeApiBase(rawBase) {
    var base = String(rawBase || '').trim();
    if (!base) return '';
    var normalized = base.replace(/\/+$/, '');
    try {
      var currentHost = (window && window.location && window.location.hostname) || '';
      if (_dpIsWorkersDevHost(normalized) && !_dpIsWorkersDevHost(currentHost)) return '';
    } catch (_) {}
    return normalized;
  }

  function _dpJoinApiUrl(base, pathname) {
    var path = String(pathname || '');
    if (path.charAt(0) !== '/') path = '/' + path;
    var normalizedBase = _dpNormalizeApiBase(base);
    return normalizedBase ? (normalizedBase + path) : path;
  }

  (function _dpSanitizeStoredApiBase() {
    try {
      var stored = String(localStorage.getItem('fortune_api_base_url') || '').trim();
      if (!stored) return;
      var normalized = _dpNormalizeApiBase(stored);
      if (!normalized) {
        localStorage.removeItem('fortune_api_base_url');
        return;
      }
      if (normalized !== stored) localStorage.setItem('fortune_api_base_url', normalized);
    } catch (_) {}
  })();

  // /api/me/* 는 워커에서 /api/auth/me/* 로 재작성돼 CSRF 동일출처 가드를 그대로 탄다. 비민감으로
  // 두면 아래 _dpBuildApiCandidates 가 저장된 base 를 상대경로보다 먼저 시도하고 workers.dev 폴백까지
  // 붙여, 교차출처 요청이 403 "Invalid auth request origin."으로 돌아왔다.
  function _dpIsAuthSensitivePath(pathname) {
    var path = String(pathname || '');
    return path.indexOf('/api/auth/') === 0
      || path.indexOf('/api/me/') === 0
      || path.indexOf('/api/user/') === 0
      || path.indexOf('/api/fortune/pig-coin/') === 0
      || path.indexOf('/api/billing/') === 0
      || path.indexOf('/api/payments/') === 0
      || path.indexOf('/api/subscription/') === 0;
  }

  function _dpShouldAllowWorkerFallback(pathname, options) {
    var opts = options || {};
    if (opts.allowWorkerFallback === true) return true;
    if (opts.allowWorkerFallback === false) return false;

    if (!_dpIsAuthSensitivePath(pathname)) return true;
    try {
      if (_dpIsWorkersDevHost(window.location.hostname || '')) return true;
    } catch (_) {}
    return _dpIsWorkerFallbackSafePath(pathname);
  }

  function _dpIsSameOriginBase(base) {
    var normalized = _dpNormalizeApiBase(base);
    if (!normalized) return true;
    try {
      return normalized === _dpNormalizeApiBase(window.location.origin || '');
    } catch (_) {
      return false;
    }
  }

  function _dpShouldTryRefresh(pathname, options) {
    var opts = options || {};
    if (opts.retryOn401 === false) return false;
    var path = String(pathname || '');
    if (!_dpIsAuthSensitivePath(path)) return false;
    if (path === '/api/auth/refresh') return false;
    if (path === '/api/auth/login') return false;
    if (path === '/api/auth/register') return false;
    if (path === '/api/auth/logout') return false;
    if (path === '/api/auth/oauth/complete') return false;
    return true;
  }

  function _dpBuildApiCandidates(pathname, options) {
    var path = String(pathname || '');
    if (path.charAt(0) !== '/') path = '/' + path;
    var opts = options || {};
    var authSensitive = _dpIsAuthSensitivePath(path);
    var allowWorkerFallback = _dpShouldAllowWorkerFallback(path, opts);
    var isLocalDevHost = false;
    try { isLocalDevHost = _dpIsLocalDevHost((window && window.location && window.location.hostname) || ''); } catch (_) {}

    var out = [];
    var seen = Object.create(null);

    function pushBase(rawBase) {
      var normalized = _dpNormalizeApiBase(rawBase);
      var url = _dpJoinApiUrl(normalized, path);
      if (seen[url]) return;
      seen[url] = true;
      out.push({ base: normalized, url: url });
    }

    if (authSensitive) {
      if (isLocalDevHost) {
        pushBase('');
        try { pushBase((window && window.location && window.location.origin) || ''); } catch (_) {}
        try { pushBase((window && window.__CD_API_BASE_URL) || ''); } catch (_) {}
        try { pushBase((window && window.CODE_DESTINY_API_BASE_URL) || ''); } catch (_) {}
        try { pushBase((window && window.__CF_PAGES_API_BASE_URL) || ''); } catch (_) {}
      }
      pushBase('');
      try { pushBase((window && window.location && window.location.origin) || ''); } catch (_) {}
      if (!isLocalDevHost) {
        try { pushBase(localStorage.getItem('fortune_api_base_url') || ''); } catch (_) {}
        try { pushBase((window && window.__CD_API_BASE_URL) || ''); } catch (_) {}
        try { pushBase((window && window.CODE_DESTINY_API_BASE_URL) || ''); } catch (_) {}
        try { pushBase((window && window.__CF_PAGES_API_BASE_URL) || ''); } catch (_) {}
      }
      if (allowWorkerFallback) pushBase(_DP_DEFAULT_API_WORKER_ORIGIN);
    } else {
      if (isLocalDevHost) {
        pushBase('');
        try { pushBase((window && window.location && window.location.origin) || ''); } catch (_) {}
        try { pushBase((window && window.__CD_API_BASE_URL) || ''); } catch (_) {}
        try { pushBase((window && window.CODE_DESTINY_API_BASE_URL) || ''); } catch (_) {}
        try { pushBase((window && window.__CF_PAGES_API_BASE_URL) || ''); } catch (_) {}
      } else {
        try { pushBase(localStorage.getItem('fortune_api_base_url') || ''); } catch (_) {}
      }
      try { pushBase((window && window.__CD_API_BASE_URL) || ''); } catch (_) {}
      try { pushBase((window && window.CODE_DESTINY_API_BASE_URL) || ''); } catch (_) {}
      try { pushBase((window && window.__CF_PAGES_API_BASE_URL) || ''); } catch (_) {}
      pushBase('');
      try { pushBase((window && window.location && window.location.origin) || ''); } catch (_) {}
      if (allowWorkerFallback) pushBase(_DP_DEFAULT_API_WORKER_ORIGIN);
    }

    return out.length ? out : [{ base: '', url: path }];
  }

  function _dpFetchWithTimeout(url, init, timeoutMs) {
    var ms = Number(timeoutMs);
    if (!isFinite(ms) || ms <= 0) ms = _DP_FETCH_TIMEOUT_MS;
    ms = Math.max(2000, Math.min(60000, Math.floor(ms)));

    if (typeof AbortController === 'undefined') {
      return fetch(url, init);
    }

    var controller = new AbortController();
    var requestInit = Object.assign({}, init || {}, { signal: controller.signal });
    var timeoutId = setTimeout(function() {
      try { controller.abort(); } catch (_) {}
    }, ms);

    return fetch(url, requestInit).finally(function() {
      clearTimeout(timeoutId);
    });
  }

  function _dpLooksLikeHtmlResponse(response, bodyText) {
    var contentType = '';
    try {
      contentType = String((response && response.headers && response.headers.get('Content-Type')) || '').toLowerCase();
    } catch (_) {}
    if (contentType.indexOf('text/html') >= 0) return true;

    var text = String(bodyText || '').trim().toLowerCase();
    if (!text) return false;
    return text.indexOf('<!doctype') === 0 || text.charAt(0) === '<';
  }

  function _dpRememberApiBase(base) {
    var normalized = _dpNormalizeApiBase(base);
    if (!normalized) {
      try {
        var currentIsWorkers = _dpIsWorkersDevHost((window && window.location && window.location.hostname) || '');
        if (!currentIsWorkers) localStorage.removeItem('fortune_api_base_url');
      } catch (_) {}
      return;
    }
    try { localStorage.setItem('fortune_api_base_url', normalized); } catch (_) {}
    try {
      window.CODE_DESTINY_API_BASE_URL = normalized;
      window.__CF_PAGES_API_BASE_URL = normalized;
      window.__CD_API_BASE_URL = normalized;
    } catch (_) {}
  }

  function _dpReadApiPayload(response) {
    return response.clone().json()
      .then(function(data) {
        return { data: data, text: '', parsed: true };
      })
      .catch(function() {
        return response.clone().text()
          .then(function(text) {
            return { data: null, text: text, parsed: false };
          })
          .catch(function() {
            return { data: null, text: '', parsed: false };
          });
      });
  }

  function _dpRefreshAuthSessionSilently(options) {
    var opts = options || {};
    if (_dpRefreshSessionInFlight) return _dpRefreshSessionInFlight;

    _dpRefreshSessionInFlight = (function() {
      var refreshCandidates = _dpBuildApiCandidates('/api/auth/refresh', {
        allowWorkerFallback: false,
        retryOn401: false,
      });

      function attempt(index) {
        if (index >= refreshCandidates.length) return Promise.resolve(false);

        var candidate = refreshCandidates[index];
        return _dpFetchWithTimeout(candidate.url, {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          /* /refresh 는 워커의 동일 출처 가드를 지난다(worker/routes/auth.js requiresSameOriginAuthGuard).
             앱은 교차 출처라 X-Code-Destiny-Runtime 헤더가 없으면 403 으로 막혀
             401 이후 자동 세션 갱신이 통째로 죽는다(isMobileAppAuthRequest 면제 조건).
             리프레시 토큰도 쿠키로 오지 않으므로 앱에서는 헤더로 실어 보낸다. */
          headers: _dpBuildRefreshHeaders(),
        }, opts.timeoutMs)
          .then(function(response) {
            if (!response.ok) {
              if (response.status >= 500 && index < refreshCandidates.length - 1) return attempt(index + 1);
              return false;
            }

            return response.json().catch(function() { return null; }).then(function(payload) {
              if (!payload || payload.ok !== true) return false;
              /* 앱은 이 토큰이 유일한 자격증명이다(쿠키가 오지 않는다) — 지우지 않고 갱신한다. */
              if (_dpIsMobileAppRuntime()) {
                if (payload.accessToken) {
                  try { localStorage.setItem('fortune_auth_token', String(payload.accessToken)); } catch (_) {}
                }
                _dpPersistAppRefreshToken(payload.refreshToken);
              } else {
                try { localStorage.removeItem('fortune_auth_token'); } catch (_) {}
              }
              if (payload && payload.user) _dpPersistSessionUser(payload.user);
              return true;
            });
          })
          .catch(function() {
            if (index < refreshCandidates.length - 1) return attempt(index + 1);
            return false;
          });
      }

      return attempt(0).finally(function() {
        _dpRefreshSessionInFlight = null;
      });
    })();

    return _dpRefreshSessionInFlight;
  }

  function _dpShouldDedupeGet(pathname, method) {
    if (String(method || '').toUpperCase() !== 'GET') return false;
    var path = String(pathname || '');
    return path.indexOf('/api/profile') === 0
      || path.indexOf('/api/subscription/me') === 0
      || path.indexOf('/api/fortune/pig-coin/profile-subscription/status') === 0
      || path.indexOf('/api/billing/balance') === 0
      || path.indexOf('/api/auth/me') === 0;
  }

  function _dpShouldApplyCooldown(pathname, method) {
    return _dpShouldDedupeGet(pathname, method);
  }

  function _dpCooldownKey(pathname) {
    return String(pathname || '').trim().toLowerCase();
  }

  function _dpReadCooldown(pathname) {
    var key = _dpCooldownKey(pathname);
    if (!key) return 0;
    return Number(_dpApiCooldownUntil[key] || 0);
  }

  function _dpMarkCooldown(pathname, status, looksHtml) {
    var key = _dpCooldownKey(pathname);
    if (!key) return;
    var code = Number(status || 0);
    var ms = 0;
    if (looksHtml) ms = 6000;
    else if (code === 0) ms = 3500;
    else if (code >= 503) ms = 5000;
    else if (code >= 500) ms = 2600;
    if (ms <= 0) return;
    _dpApiCooldownUntil[key] = Date.now() + ms;
  }

  function _dpClearCooldown(pathname) {
    var key = _dpCooldownKey(pathname);
    if (!key) return;
    delete _dpApiCooldownUntil[key];
  }

  function _dpIsTransientResult(result) {
    var status = Number(result && result.status || 0);
    return status === 0 || status === 503 || status === 504;
  }

  function _dpRunTransientRetry(operation, options, normalize) {
    var opts = options || {};
    var maxRetries = Math.max(0, Math.min(2, Number(opts.maxTransientRetries == null ? 2 : opts.maxTransientRetries)));
    var retryCount = 0;
    var delayMs = Math.max(150, Number(opts.transientRetryDelayMs || 700));

    function run() {
      return Promise.resolve().then(operation).then(function(raw) {
        return typeof normalize === 'function' ? normalize(raw) : raw;
      }, function(error) {
        return {
          ok: false,
          status: 0,
          data: {
            code: 'NETWORK_ERROR',
            message: _dpText('networkError'),
            error: String((error && error.message) || error || 'network_error'),
          },
          payload: {
            code: 'NETWORK_ERROR',
            message: _dpText('networkError'),
          },
          error: error,
        };
      }).then(function(result) {
        if (!opts.retryTransient || !_dpIsTransientResult(result) || retryCount >= maxRetries) return result;
        retryCount += 1;
        return new Promise(function(resolve) {
          setTimeout(resolve, delayMs * retryCount);
        }).then(run);
      });
    }

    return run();
  }

  function _dpClientSource(pathname) {
    return String(pathname || '').indexOf('/api/billing/coin-gate') === 0
      ? 'feature:coin-gate'
      : 'legacy:destiny-profile';
  }

  function _dpFetchJsonWithFallback(pathname, init, options) {
    var opts = options || {};
    var method = String(((init && init.method) || 'GET')).toUpperCase();
    var requestInit = Object.assign({}, init || {});
    requestInit.method = method;
    requestInit.credentials = 'include';
    if (!requestInit.cache) requestInit.cache = 'no-store';
    var traceHeaders = new Headers(requestInit.headers || {});
    if (!traceHeaders.has('X-Code-Destiny-Client')) traceHeaders.set('X-Code-Destiny-Client', _dpClientSource(pathname));
    requestInit.headers = traceHeaders;

    var cooldownEnabled = _dpShouldApplyCooldown(pathname, method);
    if (cooldownEnabled) {
      var cooldownUntil = _dpReadCooldown(pathname);
      if (cooldownUntil > Date.now()) {
        return Promise.resolve({
          ok: false,
          status: 503,
          data: {
            code: 'SERVICE_UNAVAILABLE',
            message: _dpText('apiCooldown')
          },
          response: null,
          base: '',
          url: _dpJoinApiUrl('', pathname),
          looksHtml: false,
        });
      }
    }

    var dedupeKey = _dpShouldDedupeGet(pathname, method) ? (method + ':' + String(pathname || '')) : '';
    if (dedupeKey && _dpApiInFlightGet[dedupeKey]) return _dpApiInFlightGet[dedupeKey];

    var candidates = _dpBuildApiCandidates(pathname, opts);
    var lastResult = null;

    function runRetryOnce(candidate) {
      return new Promise(function(resolve) {
        setTimeout(resolve, 180);
      }).then(function() {
        return _dpFetchWithTimeout(candidate.url, requestInit, opts.timeoutMs);
      });
    }

    function attempt(index) {
      if (index >= candidates.length) {
        return Promise.resolve(lastResult || {
          ok: false,
          status: 503,
          data: { message: _dpText('apiConnectionFailed') },
          response: null,
          base: '',
          url: _dpJoinApiUrl('', pathname),
          looksHtml: false,
        });
      }

      var candidate = candidates[index];
      return _dpFetchWithTimeout(candidate.url, requestInit, opts.timeoutMs)
        .catch(function(error) {
          if (method === 'GET') {
            return runRetryOnce(candidate).catch(function() { throw error; });
          }
          throw error;
        })
        .then(function(response) {
          return _dpReadApiPayload(response).then(function(parsed) {
            var data = parsed && parsed.data;
            var looksHtml = !parsed.parsed && _dpLooksLikeHtmlResponse(response, parsed.text);
            var payload = (data && typeof data === 'object') ? data : {};

            if (looksHtml) {
              payload.code = String(payload.code || 'INVALID_RESPONSE_FORMAT');
              if (!payload.message) payload.message = '서버 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.';
            }

            var result = {
              ok: response.ok && !looksHtml,
              status: response.status,
              data: payload,
              response: response,
              base: candidate.base,
              url: candidate.url,
              looksHtml: looksHtml,
            };

            lastResult = result;

            if (method === 'GET' && response.status === 401 && _dpShouldTryRefresh(pathname, opts)) {
              return _dpRefreshAuthSessionSilently({ timeoutMs: opts.timeoutMs }).then(function(refreshed) {
                if (!refreshed) return result;
                return _dpFetchWithTimeout(candidate.url, requestInit, opts.timeoutMs)
                  .then(function(retryResponse) {
                    return _dpReadApiPayload(retryResponse).then(function(retryParsed) {
                      var retryData = retryParsed && retryParsed.data;
                      var retryLooksHtml = !retryParsed.parsed && _dpLooksLikeHtmlResponse(retryResponse, retryParsed.text);
                      var retryPayload = (retryData && typeof retryData === 'object') ? retryData : {};
                      if (retryLooksHtml) {
                        retryPayload.code = String(retryPayload.code || 'INVALID_RESPONSE_FORMAT');
                        if (!retryPayload.message) retryPayload.message = '서버 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.';
                      }

                      var retryResult = {
                        ok: retryResponse.ok && !retryLooksHtml,
                        status: retryResponse.status,
                        data: retryPayload,
                        response: retryResponse,
                        base: candidate.base,
                        url: candidate.url,
                        looksHtml: retryLooksHtml,
                      };

                      lastResult = retryResult;
                      if (retryResult.ok) {
                        _dpClearCooldown(pathname);
                        _dpRememberApiBase(candidate.base);
                      } else if (cooldownEnabled) {
                        _dpMarkCooldown(pathname, retryResponse.status, retryLooksHtml);
                      }
                      return retryResult;
                    });
                  })
                  .catch(function() {
                    return result;
                  });
              });
            }

            if (result.ok) {
              _dpClearCooldown(pathname);
              _dpRememberApiBase(candidate.base);
              return result;
            }

            if (cooldownEnabled) _dpMarkCooldown(pathname, response.status, looksHtml);
            var hasNext = method === 'GET' && index < candidates.length - 1;
            /* 후보 베이스 순회는 "이 API 주소가 틀렸다"를 위한 장치다. 그런데 워커가 내는 JSON 503은
               "DB가 잠시 아프다"는 degraded 신호이고, 후보(상대경로·origin·workers.dev)는 전부 같은
               워커·같은 클러스터로 가므로 순회해봐야 똑같이 503이다. 요청·콘솔오류·DB부하만 후보 수만큼
               배가된다(홈 진입 1회 블립이 3배로 보이던 원인). 셸의 shouldTryNextCandidate 와 정책을 맞춘다.
               Cloudflare/Pages 가 내는 503 은 HTML 이라 looksHtml 로 잡혀 종전대로 폴백한다. */
            var retryable = looksHtml
              || response.status === 404
              || response.status === 0
              || (response.status >= 500 && response.status !== 503);
            if (hasNext && retryable) return attempt(index + 1);

            return result;
          });
        })
        .catch(function(error) {
          lastResult = {
            ok: false,
            status: 0,
            data: {
              code: 'NETWORK_ERROR',
              message: _dpText('networkError'),
              error: String((error && error.message) || error || 'network_error'),
            },
            response: null,
            base: candidate.base,
            url: candidate.url,
            looksHtml: false,
          };

          if (cooldownEnabled) _dpMarkCooldown(pathname, 0, false);
          if (method === 'GET' && index < candidates.length - 1) return attempt(index + 1);
          return lastResult;
        });
    }

    var requestPromise = _dpRunTransientRetry(function() {
      return attempt(0);
    }, opts);
    if (dedupeKey) {
      _dpApiInFlightGet[dedupeKey] = requestPromise.finally(function() {
        delete _dpApiInFlightGet[dedupeKey];
      });
      return _dpApiInFlightGet[dedupeKey];
    }

    return requestPromise;
  }

  function _dpHasSessionHint() {
    try {
      if (_dpGetProfileScope() !== 'guest') return true;
    } catch (e) {}
    try {
      if (_dpReadStoredAuthToken()) return true;
    } catch (e2) {}
    try {
      var cookieText = String(document.cookie || '');
      return cookieText.indexOf('fortune_auth_role=') >= 0 || cookieText.indexOf('fortune_auth_token=') >= 0;
    } catch (e3) {}
    return false;
  }

  var _dpSessionVerify = {
    checkedAt: 0,
    ok: false,
    userId: '',
    signature: '',
    pending: null
  };

  // 🔴 실패 TTL 이 2000ms 라 9개 호출부가 2초마다 /api/auth/me 를 재발사했고, DB 장애 중에는
  // 그게 /api/profile 과 짝을 이뤄 503 폭주의 박자를 만들었다. 인프라 실패는 곧 복구되지 않으므로
  // 확정 미인증(401/403)보다 훨씬 길게 잡는다.
  function _dpGetSessionVerifyTtlMs(state) {
    if (state && state.ok) return 30000;
    if (state && state.indeterminate === true) return 15000;
    return 2000;
  }

  function _dpGetSessionHintSignature() {
    var scope = '';
    var hasRoleCookie = false;
    var roleCookieValue = '';
    var hasToken = false;
    var tokenHint = '';
    var userHint = '';
    try {
      scope = _dpGetProfileScope();
    } catch (e) {}
    try {
      var roleMatch = String(document.cookie || '').match(/(?:^|;\s*)fortune_auth_role=([^;]*)/);
      hasRoleCookie = !!(roleMatch && roleMatch[1]);
      roleCookieValue = hasRoleCookie ? String(decodeURIComponent(roleMatch[1] || '')).trim().toLowerCase() : '';
    } catch (e2) {}
    try {
      var token = String(_dpReadStoredAuthToken() || '').trim();
      hasToken = !!token;
      tokenHint = token ? token.slice(-16) : '';
    } catch (e3) {}
    try {
      var user = _dpReadAuthUser();
      userHint = String((user && (user.id || user.userId || user._id || user.uid)) || '').trim().toLowerCase();
    } catch (e4) {}
    return [scope, hasRoleCookie ? '1' : '0', roleCookieValue, hasToken ? '1' : '0', tokenHint, userHint].join('|');
  }

  function _dpPersistSessionUser(user) {
    if (!user || typeof user !== 'object') return;
    try {
      var merged = _dpReadAuthUser() || {};
      if (typeof merged !== 'object' || merged === null) merged = {};
      merged.id = user.id || merged.id;
      merged.userId = user.userId || merged.userId;
      merged._id = user._id || merged._id;
      merged.uid = user.uid || merged.uid;
      merged.name = user.name || merged.name;
      merged.email = user.email || user.emailAddress || merged.email;
      merged.userEmail = user.userEmail || user.email || user.emailAddress || merged.userEmail;
      merged.phoneNumber = user.phoneNumber || user.phone || merged.phoneNumber;
      merged.phone = user.phone || user.phoneNumber || merged.phone;
      merged.role = user.role || merged.role || 'user';
      var points = Number(user.points);
      if (isFinite(points) && points >= 0) merged.points = points;
      _dpWriteAuthUser(merged);
    } catch (e) {}
  }

  function _dpMarkSessionVerify(ok, userId) {
    _dpSessionVerify.checkedAt = Date.now();
    _dpSessionVerify.ok = !!ok;
    _dpSessionVerify.userId = ok ? String(userId || '') : '';
    _dpSessionVerify.indeterminate = false;
    _dpSessionVerify.signature = _dpGetSessionHintSignature();
  }

  // 인프라 실패로 판정을 못한 경우: 직전 ok/userId 는 그대로 두고 재발사 간격만 늘린다
  // (_dpGetSessionVerifyTtlMs). 로그인 상태를 인프라 오류로 잃지 않게 하는 것이 핵심이다.
  function _dpMarkSessionVerifyIndeterminate() {
    _dpSessionVerify.checkedAt = Date.now();
    _dpSessionVerify.indeterminate = true;
    _dpSessionVerify.signature = _dpGetSessionHintSignature();
  }

  function _dpVerifyLoginSession(forceRefresh, options) {
    var force = !!forceRefresh;
    var allowIndeterminate = !!(options && options.allowIndeterminate);
    function sessionResult() {
      return !!_dpSessionVerify.ok || (allowIndeterminate && _dpSessionVerify.indeterminate === true && _dpHasSessionHint());
    }
    var now = Date.now();
    var signature = _dpGetSessionHintSignature();
    var ttlMs = _dpGetSessionVerifyTtlMs(_dpSessionVerify);
    if (!force
      && _dpSessionVerify.checkedAt
      && _dpSessionVerify.signature === signature
      && (now - _dpSessionVerify.checkedAt < ttlMs)) {
      return Promise.resolve(sessionResult());
    }
    if (_dpSessionVerify.pending) return _dpSessionVerify.pending.then(function() { return sessionResult(); });
    if (!_dpHasSessionHint() && !force) {
      _dpMarkSessionVerify(false, '');
      return Promise.resolve(false);
    }

    _dpSessionVerify.pending = _dpFetchJsonWithFallback('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: _dpBuildAuthHeaders()
    }, {
      allowWorkerFallback: false,
      retryOn401: true,
      timeoutMs: _DP_FETCH_TIMEOUT_MS,
    }).then(function(result) {
      if (!result.ok) {
        if (_dpIsAuthRequiredResult(result) && _dpIsSameOriginBase(result.base)) {
          try { localStorage.removeItem('fortune_auth_token'); } catch (_) {}
          try { localStorage.removeItem('fortune_auth_user'); } catch (_) {}
          return null;
        }
        // 확정 미인증이 아닌 실패(503/500/네트워크)는 "미확정"이다 — 짧은 TTL 로 재발사하지 않는다.
        return { __dpAuthIndeterminate: true };
      }
      return (result.data && typeof result.data === 'object') ? result.data : null;
    }).then(function(payload) {
      if (payload && payload.__dpAuthIndeterminate === true) {
        // 직전 판정을 보존한다(ok/userId 유지) — 인프라 실패로 로그인 상태를 잃으면 안 된다.
        // checkedAt·indeterminate 만 갱신해 재발사 간격을 늘린다.
        _dpMarkSessionVerifyIndeterminate();
        return sessionResult();
      }
      var user = payload && payload.user ? payload.user : null;
      var userId = String((user && (user.id || user.userId || user._id || user.uid)) || '').trim();
      var ok = !!userId;
      if (ok) {
        /* 웹은 세션 확인이 끝나면 쿠키가 정본이므로 localStorage 토큰을 지운다.
           앱에는 그 쿠키가 없다(SameSite=Lax + 교차 출처) — 여기서 지우면 첫 성공 직후
           유일한 자격증명이 사라져 다음 호출부터 다시 401 이 된다. 앱에서는 보존한다. */
        if (!_dpIsMobileAppRuntime()) {
          try { localStorage.removeItem('fortune_auth_token'); } catch (_) {}
        }
        _dpPersistSessionUser(user);
      }
      _dpMarkSessionVerify(ok, userId);
      return ok;
    }).catch(function() {
      // 네트워크 오류·타임아웃은 확정 미인증이 아니다 — 직전 판정을 유지한다.
      _dpMarkSessionVerifyIndeterminate();
      return sessionResult();
    }).finally(function() {
      _dpSessionVerify.pending = null;
    });

    return _dpSessionVerify.pending;
  }

  // 명시적인 이용권 선택은 최종 coin-gate POST 전에 인증 복구가 끝날 때까지 기다린다.
  // 재진입 직후에는 쿠키 세션은 유효하지만 이 독립 런타임의 메모리/로컬 스냅샷이 아직 비어 있을 수 있다.
  // 이 상태의 첫 401을 payment_required로 바꾸면 이용권 보유자를 상점으로 보내므로, 인증이 미확정이면
  // 결제창을 유지하고 재시도 가능한 오류로 표면화한다.
  async function _dpPrepareMembershipPassAuth() {
    var hadSessionHint = _dpHasSessionHint();
    try {
      var authenticated = await _dpVerifyLoginSession(true, { allowIndeterminate: false });
      if (authenticated) return { ready: true };
      if (hadSessionHint || _dpHasSessionHint()) {
        return {
          ready: false,
          code: 'AUTH_SESSION_CHECK_UNAVAILABLE',
          message: '\uB85C\uADF8\uC778 \uC815\uBCF4\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'
        };
      }
      return { ready: false, code: 'AUTH_REQUIRED', message: '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.' };
    } catch (_authPreparationError) {
      if (hadSessionHint || _dpHasSessionHint()) {
        return {
          ready: false,
          code: 'AUTH_SESSION_CHECK_UNAVAILABLE',
          message: '\uB85C\uADF8\uC778 \uC815\uBCF4\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'
        };
      }
      return { ready: false, code: 'AUTH_REQUIRED', message: '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.' };
    }
  }

  function _dpHasLoginSession() {
    var now = Date.now();
    var ttlMs = _dpGetSessionVerifyTtlMs(_dpSessionVerify);
    if (_dpSessionVerify.ok
      && _dpSessionVerify.checkedAt
      && _dpSessionVerify.signature === _dpGetSessionHintSignature()
      && (now - _dpSessionVerify.checkedAt < ttlMs)) {
      return true;
    }
    return _dpHasSessionHint();
  }
  // 다른 JS 모듈에서도 사용할 수 있도록 전역 노출
  window.__dpHasLoginSession = _dpHasLoginSession;

  var _dpSetCurrentTimer = null;
  var _dpPendingSwitchBaseId = null;
  var _dpLoadFromServerPending = null;
  var _dpLastServerSyncAt = 0;
  var _dpProfileServerReadyNotified = false;
  var _dpPendingCurrentProfileId = '';
  var _dpPendingCurrentProfileUntil = 0;

  function _dpFindProfileById(profiles, id) {
    var targetId = String(id || '').trim();
    if (!targetId || !Array.isArray(profiles)) return null;
    for (var i = 0; i < profiles.length; i += 1) {
      if (_dpGetProfileId(profiles[i]) === targetId) return profiles[i];
    }
    return null;
  }

  function _dpMarkPendingCurrentProfile(id) {
    var nextId = String(id || '').trim();
    if (!nextId) return;
    _dpPendingCurrentProfileId = nextId;
    _dpPendingCurrentProfileUntil = Date.now() + 12000;
  }

  function _dpClearPendingCurrentProfile(id) {
    var targetId = String(id || '').trim();
    if (!targetId || _dpPendingCurrentProfileId === targetId) {
      _dpPendingCurrentProfileId = '';
      _dpPendingCurrentProfileUntil = 0;
    }
  }

  function _dpResolveServerCurrentId(currentId, profiles) {
    if (_dpPendingCurrentProfileId) {
      if (Date.now() > _dpPendingCurrentProfileUntil) {
        _dpClearPendingCurrentProfile();
      } else if (_dpFindProfileById(profiles, _dpPendingCurrentProfileId)) {
        return _dpPendingCurrentProfileId;
      } else {
        _dpClearPendingCurrentProfile();
      }
    }
    return currentId || '';
  }

  function _dpNotifyProfileServerReady(detail) {
    if (_dpProfileServerReadyNotified) return;
    _dpProfileServerReadyNotified = true;
    var payload = Object.assign({
      ok: false,
      loaded: false,
      reason: 'unknown',
      at: Date.now()
    }, detail || {});
    window.__cdDestinyProfileServerReady = true;
    window.__cdDestinyProfileServerReadyDetail = payload;
    try {
      window.dispatchEvent(new CustomEvent('cd:destiny-profile-server-ready', { detail: payload }));
    } catch (_) {}
  }

  function _dpSetCurrentOnServer(currentId, baseCurrentId) {
    var nextId = String(currentId || '').trim();
    var baseId = String(baseCurrentId || '').trim();
    if (!_dpHasSessionHint() || !nextId) return;
    _dpVerifyLoginSession(false).then(function(ok) {
      if (!ok) return;
      _dpFetchJsonWithFallback('/api/profile/current', {
        method: 'PATCH',
        credentials: 'include',
        cache: 'no-store',
        headers: _dpBuildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ currentId: nextId, baseCurrentId: baseId })
      }).then(function(res) {
        var data = res && res.data ? res.data : null;
        if (res && res.status === 403 && data && data.code === 'PROFILE_SINGLE_LOCKED') {
          _dpClearPendingCurrentProfile(nextId);
          alert(data.message || '확정된 프로필 카드만 사용할 수 있습니다.');
          _dpLoadFromServer(function(loaded) {
            if (!loaded) return;
            renderMasterCard(DPStorage.current());
            renderProfileList();
          });
          return;
        }
        if (!res || !res.ok || (data && data.ok === false)) {
          _dpClearPendingCurrentProfile(nextId);
          _dpLoadFromServer(function(loaded) {
            if (!loaded) return;
            renderMasterCard(DPStorage.current());
            renderProfileList();
          });
          return;
        }
        // 다른 탭이 먼저 전환한 뒤라 서버가 이 전환을 거부(staleSwitchIgnored)했다면,
        // 서버가 돌려준 authoritative currentId로 로컬 상태를 정정한다.
        if (data && data.staleSwitchIgnored && data.currentId) {
          _dpClearPendingCurrentProfile(nextId);
          _dpSetProfileState(_dpGetProfileScope(), _dpProfiles, data.currentId);
          renderMasterCard(DPStorage.current());
          renderProfileList();
          return;
        }
        if (data && data.profileAccess) _dpApplyProfileAccess(data.profileAccess);
        if (String((data && data.currentId) || nextId || '').trim() === nextId) _dpClearPendingCurrentProfile(nextId);
      }).catch(function() {});
    }).catch(function() {});
  }

  function _dpSetCurrentOnServerDebounced(currentId, baseCurrentId) {
    var nextId = String(currentId || '').trim();
    if (_dpPendingSwitchBaseId === null) {
      _dpPendingSwitchBaseId = String(baseCurrentId || '').trim();
    }
    if (_dpSetCurrentTimer) clearTimeout(_dpSetCurrentTimer);
    _dpSetCurrentTimer = setTimeout(function() {
      _dpSetCurrentTimer = null;
      var baseId = _dpPendingSwitchBaseId || '';
      _dpPendingSwitchBaseId = null;
      _dpSetCurrentOnServer(nextId, baseId);
    }, 240);
  }

  /** 구독 상태를 free(비활성)로 리셋 — 비로그인/세션만료 시 사용 */
  function _dpResetSubscriptionState() {
    _dpSubScope = _dpGetProfileScope();
    _dpSubTier = 'free';
    _dpSubIsActive = false;
    _dpSubProfileLimit = 1;
    _dpUpdateSaveBtn();
  }

  function _dpLoadFromServer(callback) {
    if (!_dpHasSessionHint()) {
      _dpResetSubscriptionState();
      _dpNotifyProfileServerReady({ ok: false, loaded: false, reason: 'no-session-hint' });
      if (callback) callback(false);
      return Promise.resolve(false);
    }
    if (_dpLoadFromServerPending) {
      if (callback) _dpLoadFromServerPending.then(function(loaded) { callback(loaded); }).catch(function() { callback(false); });
      return _dpLoadFromServerPending;
    }

    // 세션 힌트가 있으므로 세션검증(/api/auth/me)과 프로필 조회(/api/profile)를
    // 병렬로 시작한다. /api/profile은 쿠키(requireUserFromRequest)로 독립 인증되므로
    // 세션검증 완료를 기다릴 필요가 없다(콜드 경로 2왕복 → 1왕복). 세션검증의
    // 부수효과(토큰 정리·세션 유저 persist·401 정리)는 그대로 병렬 수행된다.
    _dpLoadFromServerPending = (function() {
      var requestScope = _dpGetProfileScope();
      var verifyPromise = _dpVerifyLoginSession(false);
      var profilePromise = _dpFetchJsonWithFallback('/api/profile', {
        credentials: 'include',
        cache: 'no-store',
        headers: _dpBuildAuthHeaders()
      })
      .then(function(result) {
        if (_dpIsAuthRequiredResult(result)) return null;
        return result.ok ? result.data : null;
      })
      .catch(function() { return null; });

      // 프로필은 '도착 즉시' 적용한다 — 인증검증(/api/auth/me)이 느려도(콜드 Mongo) 렌더가 막히지 않는다.
      // (/api/profile 자체가 독립 인증이므로 data.ok=true가 곧 로그인 신호. 검증은 프로필이 없을 때만 기다려
      //  구독상태 리셋 여부를 판단하고, 있을 때는 백그라운드에서 부수효과만 정리한다.)
      return profilePromise.then(function(data) {
        var hasProfile = data && data.ok && Array.isArray(data.profiles);
        if (!hasProfile) {
          return verifyPromise.then(function(ok) {
            if (!ok) _dpResetSubscriptionState();
            return false;
          }).catch(function() { return false; });
        }
        var scope = _dpGetProfileScope();
        // 세션검증이 게스트→실계정으로 스코프를 채운 경우는 정상 진행하고,
        // 실계정→다른 실계정으로 바뀐 경우(계정 전환 레이스)만 폐기한다.
        if (scope !== requestScope && requestScope !== 'guest') return false;
        var serverCurrentId = _dpResolveServerCurrentId(data.currentId || '', data.profiles);
        if (!_dpSetProfileState(scope, data.profiles, serverCurrentId)) {
          return false;
        }
        _dpApplyProfileAccess(data.profileAccess);
        if (data.profileAccess && data.profileAccess.selectionRequired) {
          _toast('이용권 혜택이 종료되어 사용할 프로필 카드 1개를 선택해야 합니다.', 'warn');
        }
        if (data.profilePolicySnapshot && typeof data.profilePolicySnapshot === 'object') {
          _dpApplyProfilePolicySnapshot(data.profilePolicySnapshot, 'profile_get');
        }
        if (data.subscription && typeof data.subscription === 'object') {
          var s = data.subscription;
          var tier = _dpNormalizeTier(s.tier);
          var active = !!s.isActive && tier !== 'free';
          var rawLimit = _dpReadProfileLimitValue(s);
          var resolvedLimit = _dpResolveProfileLimit(tier, rawLimit);
          _dpSubTier = tier;
          _dpSubIsActive = active;
          _dpSubProfileLimit = active ? resolvedLimit : 1;
          _dpSubScope = scope;
          _dpWriteSubCache(tier, active, resolvedLimit, s.expiresAt || null);
          _dpUpdateSaveBtn();
        }
        return true;
      });
    })().catch(function() {
      return false;
    }).then(function(loaded) {
      if (loaded) _dpLastServerSyncAt = Date.now();
      _dpNotifyProfileServerReady({
        ok: !!loaded,
        loaded: !!loaded,
        reason: loaded ? 'server-profile-loaded' : 'server-profile-unavailable'
      });
      return loaded;
    }).finally(function() {
      _dpLoadFromServerPending = null;
    });

    if (callback) _dpLoadFromServerPending.then(function(loaded) { callback(loaded); }).catch(function() { callback(false); });
    return _dpLoadFromServerPending;
  }

  function _isMobileViewport() {
    try {
      return window.matchMedia('(max-width: 900px)').matches;
    } catch (e) {
      return false;
    }
  }

  function _dpMeasureViewportTopOffset() {
    var offset = 0;
    try {
      var nav = document.querySelector('.fsn-navbar');
      if (nav) {
        var style = window.getComputedStyle ? window.getComputedStyle(nav) : null;
        var isPinned = style && (style.position === 'fixed' || style.position === 'sticky');
        if (isPinned) {
          var navRect = nav.getBoundingClientRect();
          if (navRect && navRect.height > 0) offset += navRect.height;
        }
      }
    } catch (_) {}
    // Keep a small breathing room so title text is not glued under the header.
    return Math.max(0, Math.round(offset + 12));
  }

  function _dpScrollProfileIntoViewMobile() {
    if (!_isMobileViewport()) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        var target = document.getElementById('dpMasterCard') || document.querySelector('.input-section');
        if (!target || typeof target.getBoundingClientRect !== 'function') return;

        var topOffset = _dpMeasureViewportTopOffset();
        var rect = target.getBoundingClientRect();
        var currentTop = window.pageYOffset || document.documentElement.scrollTop || 0;
        var targetTop = Math.max(0, Math.round(currentTop + rect.top - topOffset));

        try {
          window.scrollTo({ top: targetTop, behavior: 'smooth' });
        } catch (_) {
          window.scrollTo(0, targetTop);
        }
      });
    });
  }

  /* lockBody 호출 여부 추적 — mobile 에서 unlockBody 불필요 호출 방지 */
  var _bodyLocked = false;

  /* ── 프로필 카드 운세 선택 모달: 유료 잠금 설정 ──
     기본 차트(자미두수·숙요점·베다점·점성술)는 무료 개방.
     운명의 꽃 아틀리에는 1회 20,000원 영구 해금. ── */
  var _DP_FEATURE_LOCKS = {
    olympus: { key: 'olympus-fc', cost: 100, name: '올림푸스 신탁' },
    flower:  { key: 'flower-fc',  cost: 200, name: '운명의 꽃 아틀리에 전체', extraUnlockKeys: ['flower-destiny', 'flower-astro', 'flower-ziwei', 'flower-sukuyo'] }
  };
  var _DP_UNLOCK_PRODUCT_BY_FEATURE_KEY = {
    'olympus-fc': 'unlock.olympus_fc',
    'flower-fc': 'unlock.flower_fc'
  };
  var _DP_TILE_LOCKS_KEY_PREFIX = 'cd_tile_locks_v2::';

  function _dpGetTileLockScopeKey() {
    try {
      var raw = localStorage.getItem('fortune_auth_user') || '';
      var user = raw ? JSON.parse(raw) : null;
      var scope = _dpResolveIdScope(user);
      if (!scope) return '';
      return _DP_TILE_LOCKS_KEY_PREFIX + scope;
    } catch (e) {}
    return '';
  }

  function _dpHasAuthToken() {
    if (_dpReadStoredAuthToken()) return true;
    return _dpHasSessionHint();
  }

  try {
    window.hasAuthToken = function() {
      return _dpHasAuthToken();
    };
  } catch (_) {}

  function _dpResolveUnlockAliasKeys(lockKey) {
    var base = String(lockKey || '').trim();
    if (!base) return [];
    var map = Object.create(null);
    map[base] = true;

    if (base === 'olympus' || base === 'olympus-fc' || base === 'olympus-profile-fc' || base === 'olympus_all') {
      ['olympus', 'olympus-fc', 'olympus-profile-fc', 'olympus_all'].forEach(function(k){ map[k]=true; });
    }

    if (base === 'flower' || base === 'flower-fc' || base === 'flower_premium' || base === 'flower_all' || base.indexOf('flower-') === 0) {
      ['flower', 'flower-fc', 'flower_premium', 'flower_all', 'flower-destiny', 'flower-astro', 'flower-ziwei', 'flower-sukuyo'].forEach(function(k){ map[k]=true; });
    }

    return Object.keys(map);
  }

  function _dpReadTileLockMap() {
    if (!_dpHasAuthToken()) return Object.create(null);

    var merged = Object.create(null);
    var scopedKey = '';
    var hasScopedData = false;
    try {
      scopedKey = _dpGetTileLockScopeKey();
      if (scopedKey) {
        var scopedRaw = localStorage.getItem(scopedKey);
        if (scopedRaw) {
          var scopedParsed = JSON.parse(scopedRaw);
          if (scopedParsed && typeof scopedParsed === 'object') {
            hasScopedData = true;
            var scopedKeys = Object.keys(scopedParsed);
            for (var si = 0; si < scopedKeys.length; si += 1) {
              if (scopedParsed[scopedKeys[si]] === true) merged[scopedKeys[si]] = true;
            }
          }
        }
      }
    } catch (e) {}

    // Legacy fallback: scoped 식별자가 없거나 scoped 데이터가 비어 있는 경우에만
    // 이전 저장 키(cd_tile_locks)의 해금 상태를 읽어 잠금 재발을 방지한다.
    // (scoped 데이터가 있으면 legacy를 병합하지 않아 계정 간 오염을 막는다)
    try {
      if (!scopedKey || !hasScopedData) {
        var legacyRaw = localStorage.getItem('cd_tile_locks');
        if (legacyRaw) {
          var legacyParsed = JSON.parse(legacyRaw);
          if (legacyParsed && typeof legacyParsed === 'object') {
            var legacyKeys = Object.keys(legacyParsed);
            for (var li = 0; li < legacyKeys.length; li += 1) {
              if (legacyParsed[legacyKeys[li]] === true) merged[legacyKeys[li]] = true;
            }
          }
        }
      }
    } catch (e2) {}

    var normalized = Object.create(null);
    var keys = Object.keys(merged);
    for (var i = 0; i < keys.length; i += 1) {
      var aliases = _dpResolveUnlockAliasKeys(keys[i]);
      for (var j = 0; j < aliases.length; j += 1) normalized[aliases[j]] = true;
    }
    return normalized;
  }

  function _dpWriteTileLockMap(map) {
    var safe = Object.create(null);
    if (map && typeof map === 'object') {
      var keys = Object.keys(map);
      for (var i = 0; i < keys.length; i += 1) {
        if (map[keys[i]] === true) safe[keys[i]] = true;
      }
    }

    try {
      var scopedKey = _dpGetTileLockScopeKey();
      if (scopedKey) localStorage.setItem(scopedKey, JSON.stringify(safe));
    } catch (e) {}
    try {
      localStorage.setItem('cd_tile_locks', JSON.stringify(safe));
    } catch (e) {}
  }

  function _dpNotifyTileLocksUpdated() {
    try {
      window.dispatchEvent(new CustomEvent('cd:tile-locks-updated'));
    } catch (e) {
      try {
        var evt = document.createEvent('Event');
        evt.initEvent('cd:tile-locks-updated', true, true);
        window.dispatchEvent(evt);
      } catch (_) {}
    }
  }

  function _dpIsFeatureLocked(lockKey) {
    if (!_dpHasAuthToken()) return true;

    var map = _dpReadTileLockMap();
    var aliases = _dpResolveUnlockAliasKeys(lockKey);
    var unlocked = false;
    for (var i = 0; i < aliases.length; i += 1) {
      if (map[aliases[i]] === true) {
        unlocked = true;
        break;
      }
    }

    if (!unlocked && String(lockKey || '') === 'flower-fc') {
      var required = (_DP_FEATURE_LOCKS.flower && _DP_FEATURE_LOCKS.flower.extraUnlockKeys) || [];
      if (required.length) {
        unlocked = true;
        for (var ri = 0; ri < required.length; ri += 1) {
          if (map[required[ri]] !== true) {
            unlocked = false;
            break;
          }
        }
      }
    }
    return !unlocked;
  }

  function _dpSaveFeatureUnlock(lockKey) {
    var map = _dpReadTileLockMap();
    var aliases = _dpResolveUnlockAliasKeys(lockKey);
    for (var i = 0; i < aliases.length; i += 1) map[aliases[i]] = true;
    if (String(lockKey || '') === 'flower-fc') {
      var extras = (_DP_FEATURE_LOCKS.flower && _DP_FEATURE_LOCKS.flower.extraUnlockKeys) || [];
      for (var ei = 0; ei < extras.length; ei += 1) map[extras[ei]] = true;
    }
    _dpWriteTileLockMap(map);
    _dpNotifyTileLocksUpdated();
  }

  function _cdShowCoinDeductNotice(cost, balance, reason) {
    try {
      var amount = Number(cost) || 0;
      var detail = reason ? String(reason) : '유료 서비스';
      var root = document.getElementById('cd-coin-notice-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'cd-coin-notice-root';
        root.style.position = 'fixed';
        root.style.top = '74px';
        root.style.right = '16px';
        root.style.zIndex = '99999';
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
        root.style.gap = '10px';
        root.style.pointerEvents = 'none';
        document.body.appendChild(root);
      }

      var item = document.createElement('div');
      item.style.minWidth = '280px';
      item.style.maxWidth = '390px';
      item.style.borderRadius = '16px';
      item.style.border = '1px solid rgba(251,191,36,0.34)';
      item.style.background = 'linear-gradient(135deg, rgba(51,24,90,0.96), rgba(24,44,92,0.96))';
      item.style.boxShadow = '0 22px 46px rgba(10,10,30,0.45)';
      item.style.color = '#fef3c7';
      item.style.padding = '12px 14px';
      item.style.fontSize = '13px';
      item.style.lineHeight = '1.5';
      item.style.opacity = '0';
      item.style.transform = 'translateY(-8px) scale(0.97)';
      item.style.transition = 'opacity 220ms ease, transform 220ms ease';
      item.style.pointerEvents = 'auto';
      item.innerHTML = '<strong style="display:block;font-size:12px;letter-spacing:.08em;color:#fde68a;">COIN NOTICE</strong>'
        + '<span>🪙 ' + detail + ' 이용으로 <strong>' + (amount * 100).toLocaleString('ko-KR') + '원</strong> 결제가 확인되었습니다.</span>';

      root.appendChild(item);
      requestAnimationFrame(function() {
        item.style.opacity = '1';
        item.style.transform = 'translateY(0) scale(1)';
      });

      setTimeout(function() {
        item.style.opacity = '0';
        item.style.transform = 'translateY(-6px) scale(0.98)';
        setTimeout(function() {
          if (item.parentNode) item.parentNode.removeChild(item);
        }, 240);
      }, 3400);
    } catch (_) {}
  }

  function _cdShowSubscriptionShieldNotice(meta) {
    try {
      var info = meta && typeof meta === 'object' ? meta : {};
      var tierRaw = String(info.subscriptionTier || info.tier || '').trim().toLowerCase();
      var tierLabel = tierRaw === 'vvip' ? 'VVIP' : (tierRaw === 'premium' ? '프리미엄' : (tierRaw === 'standard' ? '스탠다드' : '구독'));
      var requiredCoins = Number(info.requiredCoins || 0);
      var freeLimit = Number(info.freeLimit || 0);
      var message = String(info.message || '').trim() || (tierLabel + ' 혜택으로 이번 리딩은 추가 결제 없이 열렸어요. 연이가 별빛 방패로 지켜드렸어요.');

      var root = document.getElementById('cd-subscription-notice-root');
      if (!root) {
        root = document.createElement('div');
        root.id = 'cd-subscription-notice-root';
        root.style.position = 'fixed';
        root.style.top = '74px';
        root.style.right = '16px';
        root.style.zIndex = '100000';
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
        root.style.gap = '10px';
        root.style.pointerEvents = 'none';
        document.body.appendChild(root);
      }

      var card = document.createElement('div');
      card.style.minWidth = '290px';
      card.style.maxWidth = '430px';
      card.style.borderRadius = '18px';
      card.style.border = '1px solid rgba(249, 168, 212, 0.44)';
      card.style.background = 'linear-gradient(135deg, rgba(120,53,15,0.95), rgba(159,18,57,0.93) 52%, rgba(30,58,138,0.93))';
      card.style.boxShadow = '0 24px 48px rgba(15,23,42,0.48)';
      card.style.color = '#fff7ed';
      card.style.padding = '12px 14px';
      card.style.display = 'grid';
      card.style.gridTemplateColumns = '66px 1fr';
      card.style.gap = '12px';
      card.style.alignItems = 'center';
      card.style.pointerEvents = 'auto';
      card.style.opacity = '0';
      card.style.transform = 'translateY(-10px) scale(0.97)';
      card.style.transition = 'opacity 230ms ease, transform 230ms ease';

      var spriteWrap = document.createElement('div');
      spriteWrap.style.width = '66px';
      spriteWrap.style.height = '66px';
      spriteWrap.style.borderRadius = '14px';
      spriteWrap.style.overflow = 'hidden';
      spriteWrap.style.border = '1px solid rgba(255,255,255,0.28)';
      spriteWrap.style.background = 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.38), rgba(255,255,255,0.06) 52%, rgba(15,23,42,0.22))';

      var sprite = document.createElement('div');
      sprite.style.width = '100%';
      sprite.style.height = '100%';
      sprite.style.backgroundImage = 'url("/fuctionassets/%EC%97%B0%EC%9D%B4%20%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%8A%A4%ED%94%84%EB%9D%BC%EC%9D%B4%ED%8A%B8%20%EC%8B%9C%ED%8A%B8.webp")';
      sprite.style.backgroundRepeat = 'no-repeat';
      sprite.style.backgroundSize = 'calc(100% * 4) calc(100% * 3)';
      sprite.style.backgroundPosition = '0% 0%';
      sprite.style.imageRendering = 'auto';
      spriteWrap.appendChild(sprite);

      var textWrap = document.createElement('div');
      var heading = document.createElement('strong');
      heading.style.display = 'block';
      heading.style.fontSize = '12px';
      heading.style.letterSpacing = '.06em';
      heading.style.color = '#fbcfe8';
      heading.textContent = 'YEON SUBSCRIPTION SHIELD';

      var body = document.createElement('div');
      body.style.fontSize = '13px';
      body.style.lineHeight = '1.52';
      body.style.marginTop = '2px';
      body.textContent = message;

      var policy = document.createElement('div');
      policy.style.marginTop = '4px';
      policy.style.fontSize = '12px';
      policy.style.color = 'rgba(255,247,237,0.9)';
      var policyLabel = '구독 정책 적용: ' + tierLabel + ' 플랜';
      if (freeLimit > 0) {
        policyLabel += ' · ' + (freeLimit * 100).toLocaleString('ko-KR') + '원 이하 서비스 비차감';
      }
      if (requiredCoins > 0) {
        policyLabel += ' · 이번 서비스 ' + (requiredCoins * 100).toLocaleString('ko-KR') + '원';
      }
      policy.textContent = policyLabel;

      textWrap.appendChild(heading);
      textWrap.appendChild(body);
      textWrap.appendChild(policy);
      card.appendChild(spriteWrap);
      card.appendChild(textWrap);
      root.appendChild(card);

      var frames = [0, 1, 2, 1, 4, 5, 6, 5, 4, 1, 0, 3];
      var cols = 4;
      var rows = 3;
      var randomFrame = Math.floor(Math.random() * (cols * rows));
      var randomPickIdx = frames.indexOf(randomFrame);
      var frameIdx = randomPickIdx >= 0 ? randomPickIdx : Math.floor(Math.random() * frames.length);
      function applySpriteFrame(frame) {
        var safeFrame = Number(frame);
        if (!isFinite(safeFrame)) safeFrame = 0;
        var normalized = ((Math.floor(safeFrame) % (cols * rows)) + (cols * rows)) % (cols * rows);
        var col = normalized % cols;
        var row = Math.floor(normalized / cols);
        var x = cols <= 1 ? 0 : (col * 100 / (cols - 1));
        var y = rows <= 1 ? 0 : (row * 100 / (rows - 1));
        sprite.style.backgroundPosition = x + '% ' + y + '%';
      }
      applySpriteFrame(frames[frameIdx]);
      var frameTimer = setInterval(function() {
        frameIdx = (frameIdx + 1) % frames.length;
        applySpriteFrame(frames[frameIdx]);
      }, 130);

      requestAnimationFrame(function() {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
      });

      setTimeout(function() {
        card.style.opacity = '0';
        card.style.transform = 'translateY(-8px) scale(0.98)';
        setTimeout(function() {
          clearInterval(frameTimer);
          if (card.parentNode) card.parentNode.removeChild(card);
        }, 240);
      }, 4700);
    } catch (_) {}
  }

  // 🔴 전체화면 대기/결과 오버레이 허용목록 — 셸 CD_WAIT_UI_ALLOWED_MODE_RE 의 거울(셸이 없을 때만 쓴다).
  var DP_WAIT_UI_ALLOWED_MODE_RE = /^(pass|monthly|pass-applied|payment-complete|payment-failed|unlock-saving|refund|refund-pending|refunded|refund-failed)$/;
  function _dpSetPaymentPending(show, message, mode) {
    var text = String(message || '').trim() || '결제가 진행 중입니다.';
    if (show && String(mode || '').trim() === 'card' && /준비|여는 중|열고 있|주문 정보를 확인|보안 결제창|결제를 처리하고 있어요|창을 닫지 말아 주세요|진행 중입니다/.test(text)) {
      text = '단건 결제 준비 중입니다. 주문 정보와 인증 흐름이 조용히 맞춰지고 있어요.';
    }

    // 🔴 대기 화면 금지 구간에는 띄우지 않는다(셸의 __cdPaymentWaitUiBlocked 가 판정 정본):
    // 미커버 확정→결제창 노출 / 결제창이 떠 있는 동안 / 단건 확정→PG창. 종단(결과)은 통과한다.
    // 셸이 없는 독립 페이지에서는 플래그도 없으니 그대로 동작한다.
    // 셸이 없는 독립 페이지에서는 아래 window._cdSetCoinGateOverlay 심이 같은 허용목록으로 거른다.
    try {
      if (show && typeof window.__cdPaymentWaitUiBlocked === 'function'
        && window.__cdPaymentWaitUiBlocked(mode)) return;
    } catch (_dpPreCheckoutProbeError) {}

    try {
      if (typeof window._cdSetCoinGateOverlay === 'function') {
        window._cdSetCoinGateOverlay(!!show, text, mode);
      } else {
        // mode 를 빠뜨리면 _dpResolveStandaloneOverlayCopy 가 default('이용권 확인 중')로 떨어져,
        // 단건 결제 준비 구간에 이용권 문구가 뜬다. 셸 경로와 같은 mode 를 넘긴다.
        _dpSetStandalonePaymentOverlay(!!show, text, mode);
      }
    } catch (_) {}

    try {
      window.dispatchEvent(new CustomEvent('cd:payment-pending', {
        detail: {
          pending: !!show,
          message: text,
          source: 'destiny-profile',
        }
      }));
    } catch (_) {}
  }

  function _dpWaitForPaymentOverlayPaint() {
    return new Promise(function(resolve) {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }
      // 단일 rAF. 중첩 rAF는 호출마다 프레임을 2개 먹어, 결제창 진입 경로에서만 6프레임이 쌓였다
      // (정적 셸 _cdWaitForPaymentOverlayPaint 도 단일 rAF로 충분히 페인트를 보장한다).
      var raf = typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : function(callback) { return setTimeout(callback, 16); };
      raf(resolve);
    });
  }

  function _dpEnsureStandalonePaymentOverlayStyle() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('cdStandalonePaymentOverlayStyle')) return;
    var style = document.createElement('style');
    style.id = 'cdStandalonePaymentOverlayStyle';
    style.textContent = [
      '@keyframes cdStandalonePaymentSpin {',
      '  from { transform: rotate(0deg); }',
      '  to { transform: rotate(360deg); }',
      '}',
      '#cdStandalonePaymentOverlay {',
      '  position: fixed;',
      '  inset: 0;',
      '  z-index: 2147483000;',
      '  display: none;',
      '  align-items: center;',
      '  justify-content: center;',
      '  background: radial-gradient(circle at 50% 50%, rgba(18, 14, 38, 0.80), rgba(4, 3, 12, 0.94));',
      '  backdrop-filter: blur(8px);',
      '  padding: 16px;',
      '}',
      '#cdStandalonePaymentOverlay .cd-standalone-payment-card {',
      '  width: min(420px, 100%);',
      '  border-radius: 20px;',
      '  border: 1px solid rgba(212, 168, 67, 0.42);',
      '  background: linear-gradient(135deg, rgba(26, 20, 48, 0.94), rgba(12, 9, 24, 0.96));',
      '  box-shadow: 0 24px 54px rgba(4, 3, 12, 0.55);',
      '  padding: 22px 18px;',
      '  color: rgba(242, 228, 192, 0.98);',
      '  text-align: center;',
      '}',
      '#cdStandalonePaymentOverlay .cd-standalone-payment-spinner {',
      '  width: 44px;',
      '  height: 44px;',
      '  margin: 0 auto 12px;',
      '  border-radius: 999px;',
      '  border: 3px solid rgba(212, 168, 67, 0.22);',
      '  border-top-color: rgba(232, 200, 112, 0.96);',
      '  animation: cdStandalonePaymentSpin 0.9s linear infinite;',
      '}',
      '#cdStandalonePaymentOverlay .cd-standalone-payment-yeon {',
      '  display: block;',
      '  width: min(132px, 40vw);',
      '  height: auto;',
      '  margin: -8px auto 8px;',
      '  filter: drop-shadow(0 10px 18px rgba(244, 190, 209, 0.22));',
      '}',
      '#cdStandalonePaymentOverlay .cd-standalone-payment-title {',
      '  margin: 0;',
      '  font-size: 19px;',
      '  font-weight: 800;',
      '  color: rgba(242, 228, 192, 0.98);',
      '}',
      '#cdStandalonePaymentOverlay .cd-standalone-payment-desc {',
      '  margin: 9px 0 0;',
      '  font-size: 14px;',
      '  color: rgba(200, 168, 120, 0.95);',
      '}',
      '#cdStandalonePaymentOverlay .cd-standalone-payment-status {',
      '  margin: 13px 0 0;',
      '  border-radius: 12px;',
      '  border: 1px solid rgba(212, 168, 67, 0.32);',
      '  background: linear-gradient(135deg, rgba(26, 20, 48, 0.5), rgba(38, 28, 8, 0.42));',
      '  padding: 8px 10px;',
      '  color: rgba(242, 228, 192, 0.96);',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '  white-space: pre-line;',
      '}',
      '@media (max-width: 480px) {',
      '  #cdStandalonePaymentOverlay .cd-standalone-payment-card { padding: 20px 16px; border-radius: 18px; }',
      '  #cdStandalonePaymentOverlay .cd-standalone-payment-title { font-size: 17px; }',
      '}',
      '@media (prefers-reduced-motion: reduce) {',
      '  #cdStandalonePaymentOverlay .cd-standalone-payment-spinner { animation: none; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function _dpEnsureStandalonePaymentOverlay() {
    if (typeof document === 'undefined') return null;
    var existing = document.getElementById('cdStandalonePaymentOverlay');
    if (existing) return existing;

    _dpEnsureStandalonePaymentOverlayStyle();

    var overlay = document.createElement('div');
    overlay.id = 'cdStandalonePaymentOverlay';
    overlay.innerHTML = [
      '<div class="cd-standalone-payment-card" role="alertdialog" aria-modal="true" aria-live="assertive">',
      '  <img class="cd-standalone-payment-yeon" src="/images/fortune-tea-house/flower-pig-honey-hug.webp" alt="이용권을 확인하는 꽃돼지 연이">',
      '  <div class="cd-standalone-payment-spinner" id="cdStandalonePaymentOverlaySpinner" aria-hidden="true"></div>',
      '  <p class="cd-standalone-payment-title" id="cdStandalonePaymentOverlayTitle">이용권 확인 중</p>',
      '  <p class="cd-standalone-payment-desc" id="cdStandalonePaymentOverlayDesc">보유 이용권으로 바로 열 수 있는지 확인하고 있어요.</p>',
      '  <p class="cd-standalone-payment-status" id="cdStandalonePaymentOverlayStatus">가능하면 결제창 없이 곧바로 이어집니다.</p>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);
    return overlay;
  }

  // 결제수단별 오버레이 카피(제목/설명/완료여부). 'done'이면 스피너를 숨겨 완료 상태로 보이게 한다.
  function _dpResolveStandaloneOverlayCopy(mode) {
    switch (String(mode || '')) {
      case 'pass-applied':
        return { title: '이용권 적용 완료', desc: '보유한 이용권으로 이번 콘텐츠가 열렸습니다.', done: true, fallback: '추가 결제 없이 바로 이어집니다.' };
      case 'payment-complete':
        return { title: '결제 완료', desc: '결제가 확인되어 콘텐츠를 여는 중입니다.', done: true, fallback: '곧 콘텐츠가 열립니다.' };
      case 'monthly':
      case 'subscription':
        return { title: '월정석 사용 중', desc: '보유한 월정석으로 이용 권한을 확인하고 있어요.', done: false, fallback: '월정석 잔량을 확인하고 있습니다.' };
      case 'card':
      case 'checkout':
      case 'confirm':
        return { title: '결제 진행 중', desc: '결제를 안전하게 진행하고 있어요.', done: false, fallback: '결제가 진행 중입니다.' };
      default:
        return { title: '이용권 확인 중', desc: '보유 이용권으로 바로 열 수 있는지 확인하고 있어요.', done: false, fallback: '결제가 진행 중입니다.' };
    }
  }

  function _dpSetStandalonePaymentOverlay(show, message, mode) {
    if (typeof document === 'undefined') return;
    var overlay = _dpEnsureStandalonePaymentOverlay();
    if (!overlay) return;
    var copy = _dpResolveStandaloneOverlayCopy(mode);
    var titleEl = document.getElementById('cdStandalonePaymentOverlayTitle');
    var descEl = document.getElementById('cdStandalonePaymentOverlayDesc');
    var spinnerEl = document.getElementById('cdStandalonePaymentOverlaySpinner');
    var statusEl = document.getElementById('cdStandalonePaymentOverlayStatus');
    if (titleEl) titleEl.textContent = copy.title;
    if (descEl) descEl.textContent = copy.desc;
    if (spinnerEl) spinnerEl.style.display = copy.done ? 'none' : '';
    if (statusEl) {
      statusEl.textContent = String(message || '').trim() || copy.fallback;
    }
    overlay.style.display = show ? 'flex' : 'none';
  }

  // 독립(정적) 페이지 폴백: index.html 인라인 canonical(_cdSetCoinGateOverlay)이 없는 환경에서도
  // 이용권 확인/결제 대기 오버레이가 표준 방식으로 뜨도록 자체 완결형 오버레이로 브리지한다.
  // (메인 앱은 canonical이 먼저 등록되므로 이 심이 설치되지 않는다.)
  if (typeof window._cdSetCoinGateOverlay !== 'function') {
    window._cdSetCoinGateOverlay = function (isOpen, message, mode) {
      // 🔴 정책 집행 지점(셸이 없는 환경). 독립 페이지들이 이 함수를 직접 부르므로 여기서 막아야
      // 빠짐이 없다 — _dpSetPaymentPending 안에만 두면 tarot/geomancy/royal-tea 등의 직접 호출이 샌다.
      if (isOpen && !DP_WAIT_UI_ALLOWED_MODE_RE.test(String(mode || '').trim() || 'payment')) return;
      _dpSetStandalonePaymentOverlay(!!isOpen, message, mode);
    };
  }

  // 결제 완료(이용권 적용/월정석 사용/단건 결제) 오버레이를 표시하고 최소 노출(~1.2s) 후 자동으로 닫는다.
  // 콘텐츠 생성(onGranted)은 이 표시와 병렬로 진행되므로, 완료 UI를 보장하면서도 체감 지연을 최소화한다.
  var _dpPaymentDoneHideTimer = 0;
  function _dpShowPaymentDoneOverlay(message, mode) {
    if (typeof window === 'undefined' || typeof window._cdSetCoinGateOverlay !== 'function') return;
    try { window._cdSetCoinGateOverlay(true, message || '', String(mode || 'pass-applied')); } catch (_) {}
    try { if (_dpPaymentDoneHideTimer) clearTimeout(_dpPaymentDoneHideTimer); } catch (_) {}
    _dpPaymentDoneHideTimer = window.setTimeout(function () {
      _dpPaymentDoneHideTimer = 0;
      try { window._cdSetCoinGateOverlay(false); } catch (_) {}
    }, 1200);
  }
  function _dpShowPassAppliedOverlay(message) {
    _dpShowPaymentDoneOverlay(message || _dpText('passAppliedOverlay'), 'pass-applied');
  }
  function _dpShowPaymentCompleteOverlay(message) {
    _dpShowPaymentDoneOverlay(message || _dpText('paymentCompleteOverlay'), 'payment-complete');
  }

  function _cdIsAdminLikeUser() {
    var FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
    try {
      if (String(sessionStorage.getItem('flower_admin_password_ok') || '') !== '1') return false;
    } catch (_) {
      return false;
    }
    try {
      if (typeof window.__cdIsAdminLikeUser === 'function' && window.__cdIsAdminLikeUser()) return true;
    } catch (_) {}
    try {
      var sessionAdminToken = String(sessionStorage.getItem('flower_admin_token') || '').trim();
      if (sessionAdminToken && FLOWER_ADMIN_TOKEN_RE.test(sessionAdminToken)) return true;
    } catch (_) {}
    try {
      var localAdminToken = String(localStorage.getItem('flower_admin_token') || '').trim();
      if (localAdminToken && FLOWER_ADMIN_TOKEN_RE.test(localAdminToken)) return true;
    } catch (_) {}
    return false;
  }

  // ── 구독 스냅샷 소비자 ────────────────────────────────────────────────────────────────
  // 정본은 셸(index.html)의 cd_subscription_snapshot_v2 이다. 새 저장 포맷을 만들지 않고
  // 같은 키·같은 TTL·같은 검증을 그대로 쓴다 — 같은 오리진이라 셸을 방문한 사용자의 스냅샷을
  // 독립 정적 페이지가 그대로 재사용하고, 여기서 갱신한 값은 셸에서도 쓰인다.
  // 셸 안에서 실행될 때는 셸의 리더를 그대로 호출해 판정 로직이 두 벌로 갈라지지 않게 한다.
  // 🔴 상수·읽기·쓰기·판정은 전부 /js/core/pass-verdict.js 가 소유한다(셸·React 와 공유하는 정본).
  // 모듈이 없으면 '스냅샷 없음'으로 취급해 서버 검사로 폴백한다 — 낙관 통과 쪽으로는 폴백하지 않는다.
  function _dpPassVerdict() {
    var api = window.__cdPassVerdict;
    return api && typeof api.readSnapshot === 'function' ? api : null;
  }

  // 🔴 결제창 진입·복귀·계측의 구현 정본은 /js/core/checkout-entry.js 하나다(셸·React 와 공유).
  // 아래는 얇은 위임 래퍼이며, 모듈이 아직 안 붙었어도 결제 흐름이 죽지 않도록 안전한 기본값을 준다.
  function _dpCheckoutEntry() {
    try { return window.__cdCheckoutEntry || null; } catch (_checkoutEntryError) { return null; }
  }
  // 앱에서는 /points 가 번들에 없다 — 판정이 애매하면 앱 경로(충전 모달)로 폴백한다.
  function _dpShouldUseAppStoreEntry() {
    var api = _dpCheckoutEntry();
    if (!api || typeof api.shouldUseAppStoreEntry !== 'function') return false;
    try { return api.shouldUseAppStoreEntry() === true; } catch (_appEntryError) { return false; }
  }
  // 결제창 문구 조회. 셸·React 와 같은 키·같은 사전(public/i18n)을 본다.
  // 폴백도 보간한다. 예전에는 checkout-entry 가 아직/영영 로드되지 않으면 인자를 버린 원문을 그대로
  // 돌려줘서, 결제창에 '{amount}원'·'보유 월정석 {balance}' 같은 자리표시자가 그대로 노출됐다.
  function _dpInterpolateText(text, vars) {
    var value = String(text == null ? '' : text);
    if (!vars || typeof vars !== 'object') return value;
    return value.replace(/\{(\w+)\}/g, function(match, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) && vars[name] != null ? String(vars[name]) : match;
    });
  }
  function _dpCheckoutText(key, fallback, vars) {
    var api = _dpCheckoutEntry();
    if (!api || typeof api.text !== 'function') return _dpInterpolateText(fallback, vars);
    try { return api.text(key, fallback, vars); } catch (_checkoutTextError) { return _dpInterpolateText(fallback, vars); }
  }
  function _dpTrackCheckoutEvent(name, payload) {
    var api = _dpCheckoutEntry();
    if (!api || typeof api.trackCheckoutEvent !== 'function') return;
    try {
      var detail = payload || {};
      detail.renderer = 'standalone';
      api.trackCheckoutEvent(name, detail);
    } catch (_trackError) { /* 계측은 결제 흐름을 막지 않는다 */ }
  }
  // 빈 문자열을 돌려주면 호출부가 기존 충전 모달 폴백을 그대로 탄다(모듈 미로딩 대비).
  function _dpBuildPassStoreUrl(coinPrice, passCoverage, source) {
    var api = _dpCheckoutEntry();
    if (!api || typeof api.buildPassStoreUrl !== 'function') return '';
    try {
      return api.buildPassStoreUrl({
        costCoins: coinPrice,
        currentTier: (passCoverage && (passCoverage.passTier || passCoverage.tier)) || '',
        source: source
      });
    } catch (_passStoreUrlError) { return ''; }
  }
  // 이용권을 사러 떠나기 직전에 남긴다 — /points 가 결제 성공 후 이 지점으로 돌려보낸다.
  function _dpRememberCheckoutReturn(featureKey) {
    var api = _dpCheckoutEntry();
    if (!api || typeof api.rememberCheckoutReturn !== 'function') return;
    try {
      api.rememberCheckoutReturn({
        url: String(window.location.pathname || '/') + String(window.location.search || '') + String(window.location.hash || ''),
        featureKey: String(featureKey || '')
      });
    } catch (_rememberError) { /* 복귀 지점 저장 실패는 결제를 막지 않는다 */ }
  }
  var _dpSnapshotRevalidateInFlight = false;

  // stale 'none' 을 읽었을 때의 백그라운드 갱신. 결제창이 어차피 쓰는 /api/billing/balance 를 재사용하고
  // (같은 응답이 스냅샷을 채운다) 동시 1건만 돌린다 — 이 경로에는 기존 dedup 이 없어 여기서 한 겹만 건다.
  function _dpRevalidateSubscriptionSnapshot() {
    try {
      if (_dpSnapshotRevalidateInFlight) return;
      if (typeof _dpFetchMoonlightStoneBalance !== 'function') return;
      if (!_dpHasSessionHint()) return;
      _dpSnapshotRevalidateInFlight = true;
      _dpFetchMoonlightStoneBalance({}).catch(function() {}).then(function() {
        _dpSnapshotRevalidateInFlight = false;
      });
    } catch (_) {
      _dpSnapshotRevalidateInFlight = false;
    }
  }

  function _dpMembershipPassLimitForTier(tier) {
    var api = _dpPassVerdict();
    return api ? api.passLimitForTier(tier) : 0;
  }

  // 셸의 __cdResolveAuthScopeId 와 동일한 규칙(_dpResolveIdScope)이라 키가 정확히 일치한다.
  function _dpSubSnapshotUserId() {
    try { return _dpResolveIdScope(_dpReadAuthUser()); } catch (_) { return ''; }
  }

  function _dpHasVerifiedAuthCacheForUser(user) {
    try {
      if (typeof window.__cdHasVerifiedAuthCache === 'function') {
        return window.__cdHasVerifiedAuthCache(user) === true;
      }
      var raw = localStorage.getItem('fortune_auth_cache_verified_v1') || '';
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      var verifiedAt = Number(parsed && parsed.verifiedAt || 0);
      var verifiedScope = String(parsed && parsed.scope || '').trim().toLowerCase();
      var userScope = _dpResolveIdScope(user);
      return !!userScope
        && verifiedScope === userScope
        && Number.isFinite(verifiedAt)
        && verifiedAt > 0
        && Date.now() - verifiedAt <= 10 * 60 * 1000;
    } catch (_) {
      return false;
    }
  }

  function _dpRemoveSubscriptionSnapshot(userId) {
    var api = _dpPassVerdict();
    if (api) api.removeSnapshot(userId);
  }

  // options.allowStaleNone: TTL 을 넘긴 'none' 도 { stale:true } 로 돌려받는다(삭제하지 않음).
  // 'active' 는 이용권 만료일이 남아 있으면 TTL 을 넘겨도 { stale:true } 로 유지된다(판정은 그대로 유효).
  function _dpReadSubscriptionSnapshotLocal(options) {
    var api = _dpPassVerdict();
    if (!api) return null;
    return api.readSnapshot(_dpSubSnapshotUserId(), options);
  }

  function _dpReadSubscriptionSnapshot(options) {
    try {
      if (typeof window.__cdReadSubscriptionSnapshot === 'function'
        && window.__cdReadSubscriptionSnapshot !== _dpReadSubscriptionSnapshotLocal) {
        // 셸 안에서 돌 때는 셸 리더가 정본 — 옵션도 그대로 넘겨 판정이 두 벌로 갈라지지 않게 한다.
        return window.__cdReadSubscriptionSnapshot(options);
      }
    } catch (_) {}
    return _dpReadSubscriptionSnapshotLocal(options);
  }

  // 서버가 확인해 준 등급만 저장한다(degraded 응답은 호출부에서 이미 걸러진다).
  function _dpWriteSubscriptionSnapshot(membership, source) {
    var api = _dpPassVerdict();
    if (!api) return;
    api.storeStatus(_dpSubSnapshotUserId(), membership, source || 'destiny-profile');
  }

  // 셸이 없는 독립 페이지에서도 같은 리더를 다른 코드가 재사용할 수 있게 노출한다(셸 정본은 덮지 않는다).
  try {
    if (typeof window.__cdReadSubscriptionSnapshot !== 'function') {
      window.__cdReadSubscriptionSnapshot = _dpReadSubscriptionSnapshotLocal;
    }
  } catch (_) {}

  // 서버 왕복 없이 '이용권 미커버'가 확정되는 신호만 판정한다.
  // 🔴 지연·타임아웃은 절대 근거로 쓰지 않는다 — 느린 것과 없는 것을 혼동하면 이용권 보유자가 결제창으로 샌다.
  function _dpResolveCertainPassMiss(coinPrice) {
    var cost = Math.max(0, Math.floor(Number(coinPrice || 0)));
    if (!(cost > 0)) return '';
    // (1) 미로그인 — 자격증명이 없으면 서버는 반드시 401이고, 이 집합에 이용권 보유자는 0명이다.
    if (!_dpHasSessionHint()) return 'signed_out';
    // 미보유 확정은 stale 'none' 으로도 내린다(SWR) — TTL 60초 만료마다 차단형 왕복이 되살아나던 지점이다.
    var snapshot = _dpReadSubscriptionSnapshot({ allowStaleNone: true });
    if (!snapshot) return '';
    if (snapshot.stale === true) _dpRevalidateSubscriptionSnapshot();
    // (2) 서버가 '이용권 없음'이라고 답한 기록(만료됐어도 판정에 쓰고 갱신은 백그라운드).
    if (snapshot.state === 'none') return 'subscription_snapshot_none';
    // (3) 산술적 한도 초과 — 신선도와 무관하게 이 가격은 이 등급으로 커버되지 않는다.
    if (snapshot.state === 'active' && cost > _dpMembershipPassLimitForTier(snapshot.tier)) return 'snapshot_pass_limit_exceeded';
    return '';
  }

  function _dpReadActiveMembershipCoverage(cost) {
    try {
      var api = _dpPassVerdict();
      if (!api) return null;
      var snapshot = _dpReadSubscriptionSnapshot();
      if (!snapshot) {
        var user = _dpReadAuthUser();
        var sub = user && user.profileSubscription;
        if (sub && typeof sub === 'object' && _dpHasVerifiedAuthCacheForUser(user)) {
          snapshot = api.storeStatus(_dpResolveIdScope(user), sub, 'verified-auth-cache');
        }
      }
      if (!snapshot) return null;
      if (snapshot.stale === true) _dpRevalidateSubscriptionSnapshot();
      var verdict = api.resolveVerdict(snapshot, cost);
      if (verdict.coversNow) return { tier: verdict.tier, freeLimit: verdict.passLimit };
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * 1회 결제 게이트 — 영구 해금 없이 사용할 때마다 cost 기준으로 확인.
   * @param {number} cost   결제 기준 수
   * @param {string} reason 기능명 (알림 문구용)
   * @param {Function} cb   성공 시 호출할 콜백
   */
  function _dpNormalizeBillingFetchResult(result) {
    var payload = {};
    if (result && result.payload && typeof result.payload === 'object') payload = result.payload;
    else if (result && result.data && typeof result.data === 'object') payload = result.data;
    return {
      ok: !!(result && result.ok),
      status: Number((result && result.status) || 0),
      payload: payload,
    };
  }

  function _dpPaymentFetchJson(pathname, init, options) {
    var opts = options || {};
    var requestInit = Object.assign({}, init || {});
    requestInit.headers = _dpBuildAuthHeaders(Object.assign(
      { 'Content-Type': 'application/json' },
      requestInit.headers || {}
    ));
    var requestMethod = String(requestInit.method || 'GET').toUpperCase();
    var retryOptions = Object.assign({}, opts, {
      retryTransient: requestMethod === 'GET' && opts.retryTransient === true,
      maxTransientRetries: opts.maxTransientRetries == null ? 1 : opts.maxTransientRetries,
    });
    if (typeof window.fetchJsonWithAuth === 'function') {
      return _dpRunTransientRetry(function() {
        return window.fetchJsonWithAuth(pathname, requestInit);
      }, retryOptions, _dpNormalizeBillingFetchResult);
    }
    return _dpFetchJsonWithFallback(pathname, requestInit, Object.assign({
      retryOn401: requestMethod === 'GET',
      // 셸이 없는 App Router 페이지에서 쓰이는 폴백 경로다. 셸의 resolveTimeoutMs 는 결제 POST
      // (coin-gate/checkout/confirm)에 25s 를 주는데 여기가 20s 라 어긋나 있었다 — 공유혀 Mongo 에서
      // 클라가 먼저 끊으면 status 0 → "네트워크 오류" 로 PG창이 안 열리고, confirm 이 끊기면
      // 승인은 됐는데 지급이 안 된다. 이 헬퍼의 호출부는 전부 결제 경로이므로 상한을 맞춘다.
      timeoutMs: 25000,
    }, retryOptions)).then(_dpNormalizeBillingFetchResult);
  }

  function _dpExtractBillingData(payload) {
    if (!payload || typeof payload !== 'object') return {};
    return (payload.data && typeof payload.data === 'object') ? payload.data : payload;
  }

  function _dpFindCheckoutOrder(payload) {
    function visit(node, depth, seen) {
      if (!node || typeof node !== "object" || depth > 5) return null;
      if (seen.indexOf(node) >= 0) return null;
      seen.push(node);
      var candidates = [
        node,
        node.order,
        node.payment,
        node.payment && node.payment.order,
        node.checkout,
        node.checkout && node.checkout.order,
        node.result,
        node.result && node.result.order,
        node.data,
        node.data && node.data.order,
        node.payload,
        node.payload && node.payload.order,
      ];
      for (var i = 0; i < candidates.length; i += 1) {
        var candidate = candidates[i];
        if (!candidate || typeof candidate !== "object") continue;
        var merchantUid = String(candidate.merchantUid || candidate.paymentId || candidate.orderId || "").trim();
        var paymentAmount = Number(candidate.paymentAmount || candidate.totalAmount || candidate.amountKRW || candidate.amountKrw || candidate.amount || 0);
        if (merchantUid && Number.isFinite(paymentAmount) && paymentAmount > 0) {
          if (!candidate.merchantUid) candidate.merchantUid = merchantUid;
          if (!candidate.paymentAmount) candidate.paymentAmount = paymentAmount;
          return candidate;
        }
      }
      for (var j = 0; j < candidates.length; j += 1) {
        var nested = candidates[j];
        if (!nested || typeof nested !== "object" || nested === node) continue;
        var found = visit(nested, depth + 1, seen);
        if (found) return found;
      }
      return null;
    }
    return visit(payload, 0, []);
  }

  function _dpIsCheckoutAccessBypass(payload, featureKey) {
    if (!payload || typeof payload !== "object") return false;
    var requestedFeature = String(featureKey || "").trim();
    var responseFeature = String(payload.featureKey || payload.contentId || (payload.accessGrant && payload.accessGrant.featureKey) || "").trim();
    if (requestedFeature && responseFeature && requestedFeature !== responseFeature) return false;
    var accessType = String(payload.accessType || payload.transactionType || (payload.accessGrant && payload.accessGrant.accessType) || "").trim().toLowerCase();
    return Boolean(
      payload.alreadyUnlocked === true ||
      payload.__cdPassGateResolved === true ||
      payload.freeBySubscription === true ||
      payload.freeBySubscription === "true" ||
      accessType === "already_unlocked" ||
      accessType === "membership_pass"
    );
  }

  function _dpReadBillingMessage(payload, fallback) {
    if (payload && typeof payload === 'object') {
      if (payload.message) return String(payload.message);
      if (payload.error && payload.error.message) return String(payload.error.message);
    }
    return String(fallback || '결제 처리에 실패했습니다.');
  }

  function _dpToText(value) {
    return String(value === undefined || value === null ? '' : value).trim();
  }

  function _dpPickText(values) {
    for (var i = 0; i < values.length; i += 1) {
      var text = _dpToText(values[i]);
      if (text) return text;
    }
    return '';
  }

  function _dpIsValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_dpToText(value));
  }

  function _dpDigitsOnly(value) {
    return _dpToText(value).replace(/\D+/g, '');
  }

  function _dpNormalizePaymentPhoneNumber(value) {
    var digits = _dpDigitsOnly(value);
    var normalized = digits.indexOf('82') === 0 && digits.length >= 11 ? ('0' + digits.slice(2)) : digits;
    return /^01\d{8,9}$/.test(normalized) ? normalized : '';
  }

  function _dpReadPaymentPhoneState(payload) {
    var data = _dpExtractBillingData(payload || {});
    var phoneNumber = _dpNormalizePaymentPhoneNumber(data.phoneNumber || data.phone || data.mobile || data.mobileNumber || data.buyerTel || data.buyer_tel);
    return {
      hasPhone: Boolean(phoneNumber || data.hasPhone),
      maskedPhone: String(data.maskedPhone || '').trim(),
      phoneNumber: phoneNumber
    };
  }

  // 🔴 조회 실패를 던지지 않고 checked:false 로 구분한다(셸 _cdGetPaymentPhoneStatus 와 같은 계약).
  // "확인 실패"는 "번호 없음"이 아니다 — 401/503/쿨다운을 미보유로 세탁하면 서버에 번호가 있어도 다시 묻는다.
  // 재시도를 밖에서 감싸지 않는다: _dpPaymentFetchJson 이 이미 타임아웃(_DP_FETCH_TIMEOUT_MS)을 갖고 있다.
  async function _dpGetPaymentPhoneStatus() {
    var result;
    try {
      result = await _dpPaymentFetchJson('/api/me/payment-phone', { method: 'GET' });
    } catch (_lookupError) {
      return { checked: false, hasPhone: false, maskedPhone: '', phoneNumber: '' };
    }
    if (!result || !result.ok) return { checked: false, hasPhone: false, maskedPhone: '', phoneNumber: '' };
    var state = _dpReadPaymentPhoneState(result.payload);
    state.checked = true;
    return state;
  }

  async function _dpSavePaymentPhoneNumber(phoneNumber) {
    var result = await _dpPaymentFetchJson('/api/me/payment-phone', {
      method: 'POST',
      body: JSON.stringify({ phone: phoneNumber })
    });
    if (!result || !result.ok) throw new Error(_dpDescribePaymentPhoneSaveFailure(result));
    var saved = _dpReadPaymentPhoneState(result.payload);
    if (!saved.phoneNumber) saved.phoneNumber = _dpNormalizePaymentPhoneNumber(phoneNumber);
    try {
      var currentUser = _dpReadAuthUser() || {};
      if (saved.phoneNumber) _dpPersistSessionUser(Object.assign({}, currentUser, { phoneNumber: saved.phoneNumber, phone: currentUser.phone || saved.phoneNumber }));
    } catch (_) {}
    return saved;
  }

  // 서버 원문(예: 교차출처 승격으로 생긴 403 "Invalid auth request origin.")을 그대로 띄우지 않는다.
  function _dpDescribePaymentPhoneSaveFailure(result) {
    var status = Number((result && result.status) || 0);
    var payload = (result && result.payload) || {};
    var code = String(payload.code || '').trim().toLowerCase();
    if (status === 0) return '네트워크가 불안정해 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
    if (code === 'csrf_origin_mismatch') return '일시적인 문제로 저장하지 못했어요. 다시 시도해 주세요.';
    if (status === 401) return '로그인이 만료됐어요. 다시 로그인한 뒤 시도해 주세요.';
    if (status === 400) return '휴대폰 번호를 정확히 입력해 주세요.';
    if (status >= 500) return '서버가 잠시 불안정해요. 잠시 후 다시 시도해 주세요.';
    return '휴대폰 번호 저장에 실패했어요. 잠시 후 다시 시도해 주세요.';
  }

  // window.prompt 는 카카오·인스타·네이버 등 인앱 웹뷰에서 억제되어 즉시 null 을 반환한다. 그러면
  // 번호를 넣을 방법이 없는 채로 throw 되어 결제창이 아예 열리지 않았다 — 인페이지 모달로 교체한다.
  function _dpPromptPaymentPhoneNumber() {
    if (typeof document === 'undefined') return Promise.resolve(null);
    return new Promise(function(resolve) {
      var settled = false;
      var overlay = document.createElement('div');
      var card = document.createElement('form');
      var title = document.createElement('h2');
      var desc = document.createElement('p');
      var input = document.createElement('input');
      var error = document.createElement('p');
      var notice = document.createElement('p');
      var actions = document.createElement('div');
      var cancelButton = document.createElement('button');
      var submitButton = document.createElement('button');

      function close(value) {
        if (settled) return;
        settled = true;
        try { input.value = ''; } catch (_) {}
        try { overlay.remove(); } catch (_) {}
        resolve(value || null);
      }

      function setBusy(isBusy) {
        input.disabled = !!isBusy;
        cancelButton.disabled = !!isBusy;
        submitButton.disabled = !!isBusy;
        submitButton.textContent = isBusy ? '저장 중...' : '저장하고 결제 계속하기';
      }

      overlay.setAttribute('role', 'presentation');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(8,13,31,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);';
      card.style.cssText = 'width:min(400px,100%);border:1px solid rgba(255,255,255,.22);border-radius:18px;background:linear-gradient(145deg,rgba(20,25,48,.98),rgba(45,31,82,.98));box-shadow:0 24px 80px rgba(0,0,0,.46);padding:22px;color:#fff;font-family:inherit;';
      title.style.cssText = 'margin:0 0 10px;font-size:19px;font-weight:800;letter-spacing:0;';
      desc.style.cssText = 'margin:0 0 16px;color:rgba(238,242,255,.78);font-size:14px;line-height:1.6;';
      input.style.cssText = 'width:100%;height:48px;box-sizing:border-box;border-radius:12px;border:1px solid rgba(196,181,253,.45);background:rgba(15,23,42,.78);color:#fff;font-size:16px;padding:0 14px;outline:none;';
      error.style.cssText = 'min-height:20px;margin:8px 0 0;color:#fecdd3;font-size:13px;line-height:1.45;';
      notice.style.cssText = 'margin:8px 0 0;color:rgba(221,214,254,.78);font-size:12px;line-height:1.45;';
      actions.style.cssText = 'display:flex;gap:10px;margin-top:18px;';
      cancelButton.style.cssText = 'flex:0 0 auto;min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#e5e7eb;padding:0 16px;font-weight:700;';
      submitButton.style.cssText = 'flex:1;min-height:44px;border-radius:12px;border:0;background:linear-gradient(135deg,#f59e0b,#fb7185);color:#111827;padding:0 16px;font-weight:900;';

      title.textContent = '단건결제를 위해 휴대폰 번호가 필요해요';
      desc.textContent = 'KG이니시스 결제 진행에 필요한 정보입니다. 최초 1회만 입력하면 다음 결제부터는 바로 결제창이 열립니다.';
      input.type = 'tel';
      input.inputMode = 'tel';
      input.autocomplete = 'tel';
      input.placeholder = '01012345678';
      notice.textContent = '입력한 번호는 결제 진행 목적으로만 사용되며 서버에 저장됩니다.';
      cancelButton.type = 'button';
      cancelButton.textContent = '취소';
      submitButton.type = 'submit';
      submitButton.textContent = '저장하고 결제 계속하기';

      cancelButton.addEventListener('click', function() { close(null); });
      card.addEventListener('submit', function(event) {
        event.preventDefault();
        var normalized = _dpNormalizePaymentPhoneNumber(input.value);
        if (!normalized) {
          error.textContent = '휴대폰 번호를 정확히 입력해 주세요.';
          input.focus();
          return;
        }
        setBusy(true);
        error.textContent = '';
        _dpSavePaymentPhoneNumber(normalized).then(function(saved) {
          close(saved || { phoneNumber: normalized, hasPhone: true });
        }).catch(function(saveError) {
          setBusy(false);
          error.textContent = String((saveError && saveError.message) || '휴대폰 번호 저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
          input.focus();
        });
      });

      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(input);
      card.appendChild(error);
      card.appendChild(notice);
      actions.appendChild(cancelButton);
      actions.appendChild(submitButton);
      card.appendChild(actions);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      try { input.focus(); } catch (_) {}
    });
  }

  // 로컬에 이미 아는 번호가 있으면 서버에 묻지 않는다(결제창 진입 왕복 1회 절감). 셸이 있으면
  // 셸의 정본 리더를 그대로 쓰고, 셸이 없는 독립 페이지에서는 같은 캐시를 직접 읽는다.
  function _dpReadLocalPaymentPhoneNumber() {
    try {
      if (typeof window._cdReadLocalPaymentPhoneNumber === 'function') {
        var shellPhone = _dpNormalizePaymentPhoneNumber(window._cdReadLocalPaymentPhoneNumber());
        if (shellPhone) return shellPhone;
      }
    } catch (_) {}
    try {
      var cached = _dpReadAuthUser() || {};
      return _dpNormalizePaymentPhoneNumber(cached.phoneNumber || cached.phone || '');
    } catch (_) {
      return '';
    }
  }

  // 번호 입력창을 띄우기 직전에 대기 오버레이·게이트 패널을 내린다. 예전에는 '이용권 확인'/'결제 상품
  // 보기' 창이 입력창 위에 남아 입력 자체가 보이지 않아 결제를 끝낼 수 없었다.
  function _dpCloseBlockingLayersBeforePhonePrompt() {
    try { if (typeof window._cdSetCoinGateOverlay === 'function') window._cdSetCoinGateOverlay(false); } catch (_) {}
    try {
      var bridge = window.__cdPaidFeatureGate;
      if (bridge && typeof bridge.close === 'function') bridge.close();
    } catch (_) {}
  }

  async function _dpEnsurePaymentPhoneNumber() {
    var localPhone = _dpReadLocalPaymentPhoneNumber();
    if (localPhone) return localPhone;
    var current = await _dpGetPaymentPhoneStatus();
    if (current && current.phoneNumber) return current.phoneNumber;
    // 조회 실패(503 등)를 '번호 없음'으로 단정하지 않는다. 확정 미보유가 아닐 때만 두 번째 소스를 본다 —
    // /api/auth/me 는 같은 번호를 함께 실어 보내고(ME_USER_PROJECTION.phoneNumber), 성공하면
    // _dpPersistSessionUser 가 로컬 캐시에 채워 준다. TTL memo + in-flight dedupe 가 이미 걸려 있다.
    if (current && current.checked !== true) {
      var fallbackPhone = _dpReadLocalPaymentPhoneNumber();
      if (fallbackPhone) return fallbackPhone;
      try {
        if (typeof _dpVerifyLoginSession === 'function') await _dpVerifyLoginSession(false);
      } catch (_sessionRecoveryError) {}
      var recoveredPhone = _dpReadLocalPaymentPhoneNumber();
      if (recoveredPhone) return recoveredPhone;
    }
    _dpCloseBlockingLayersBeforePhonePrompt();
    // 정적 셸이 로드된 화면에서는 셸의 정본 모달을 재사용해 같은 UI가 두 벌 생기지 않게 한다.
    var saved = null;
    if (typeof window._cdPromptDirectCheckoutPhoneNumber === 'function') {
      saved = await window._cdPromptDirectCheckoutPhoneNumber();
    } else {
      saved = await _dpPromptPaymentPhoneNumber();
    }
    var resolved = _dpNormalizePaymentPhoneNumber((saved && (saved.phoneNumber || saved.phone)) || '');
    if (!resolved) throw new Error('단건 결제를 진행하려면 구매자 휴대폰 번호가 필요합니다.');
    return resolved;
  }

  function _dpLoadPortOneV2Sdk() {
    if (window.PortOne && typeof window.PortOne.requestPayment === 'function') return Promise.resolve();
    return new Promise(function(resolve, reject) {
      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        if (ok && window.PortOne && typeof window.PortOne.requestPayment === 'function') {
          resolve();
          return;
        }
        // 죽은 태그를 남기면 다음 시도가 그 태그를 물려받아 새 요청 없이 상한까지 기다린다.
        try {
          var dead = document.getElementById('portone-v2-sdk');
          if (dead && dead.parentNode) dead.parentNode.removeChild(dead);
        } catch (_removeError) {}
        reject(new Error('포트원 V2 결제 SDK가 초기화되지 않았습니다.'));
      }

      var existing = document.getElementById('portone-v2-sdk');
      if (!existing) {
        // React 라우트에는 정적 셸 <head> 의 preconnect 가 없다. 스크립트를 붙이기 직전에 연결을
        // 예열해 DNS+TLS 왕복이 스크립트 다운로드와 직렬로 붙지 않게 한다(중복 삽입 방지).
        try {
          if (!document.getElementById('portone-v2-preconnect')) {
            var preconnect = document.createElement('link');
            preconnect.id = 'portone-v2-preconnect';
            preconnect.rel = 'preconnect';
            preconnect.href = 'https://cdn.portone.io';
            preconnect.crossOrigin = 'anonymous';
            document.head.appendChild(preconnect);
          }
        } catch (_preconnectError) {}
        existing = document.createElement('script');
        existing.id = 'portone-v2-sdk';
        existing.src = 'https://cdn.portone.io/v2/browser-sdk.js';
        existing.async = true;
        document.head.appendChild(existing);
      }

      existing.addEventListener('load', function() { finish(true); }, { once: true });
      existing.addEventListener('error', function() { finish(false); }, { once: true });
      setTimeout(function() { finish(!!(window.PortOne && typeof window.PortOne.requestPayment === 'function')); }, 8000);
    });
  }

  // 결제수단 모달을 띄우는 시점에 SDK 다운로드를 시작해 임계경로에서 뺀다. 예전에는 checkout 응답을
  // 받은 뒤에야 <script> 를 붙여, CDN 왕복이 클릭~결제창 사이에 그대로 얹혔다(모바일에서 그 지연으로
  // user-gesture 가 소멸해 결제창이 아예 안 열리는 원인).
  // 정적 셸과 같은 전역 promise·같은 script#portone-v2-sdk 를 공유하므로 이중 로드가 되지 않는다.
  function _dpPortOneV2SdkPromise() {
    var shared = window.__cdPortOneV2PreloadPromise;
    if (shared && typeof shared.then === 'function') return shared;
    var created = _dpLoadPortOneV2Sdk();
    window.__cdPortOneV2PreloadPromise = created;
    // 실패한 promise 를 캐시에 남기면 재시도가 영구히 같은 실패를 재사용한다.
    created.catch(function() {
      if (window.__cdPortOneV2PreloadPromise === created) window.__cdPortOneV2PreloadPromise = null;
    });
    return created;
  }

  function _dpPreloadPortOneV2Sdk() {
    try { _dpPortOneV2SdkPromise(); } catch (_) {}
  }

  // 단건 checkout 본문 정본. 명시적인 단건 선택 뒤 한 번만 주문을 발급한다.
  function _dpBuildDirectCheckoutPayload(options) {
    var opts = options || {};
    var coinPrice = Math.max(0, Math.floor(Number(opts.coinPrice || opts.cost || 0)));
    var amountKrw = Math.max(0, Math.floor(Number(opts.amountKrw || (coinPrice * 100))));
    var directFeatureKey = _dpResolvePaidGateFeatureKey(opts, String(opts.title || opts.reason || ''));
    var checkoutPayload = Object.assign({
      paymentType: 'digital_content',
      paymentMode: 'DIRECT_KRW',
      provider: 'PORTONE_V2',
      pg: 'KG_INICIS',
      featureKey: directFeatureKey,
      reason: String(opts.reason || opts.title || '유료 서비스').trim(),
      paymentAmount: amountKrw,
      amountKrw: amountKrw,
      coinPriceBasis: coinPrice,
      paymentMethod: 'card_general',
      requestId: String(opts.requestId || '').trim(),
    }, opts.checkoutPayload || {});

    checkoutPayload.idempotencyKey = String(checkoutPayload.idempotencyKey || checkoutPayload.requestId || '').trim();
    if (opts.categoryKey) checkoutPayload.categoryKey = opts.categoryKey;
    if (opts.subFeatureKey) checkoutPayload.subFeatureKey = opts.subFeatureKey;
    if (opts.productId) checkoutPayload.productId = opts.productId;
    if (opts.reportId) checkoutPayload.reportId = opts.reportId;
    if (opts.sessionId) checkoutPayload.sessionId = opts.sessionId;
    if (opts.reportSessionId || opts.sessionId) checkoutPayload.reportSessionId = opts.reportSessionId || opts.sessionId;
    if (opts.purchaseId) checkoutPayload.purchaseId = opts.purchaseId;
    if (opts.orderId) checkoutPayload.orderId = opts.orderId;
    if (opts.actionType) checkoutPayload.actionType = opts.actionType;
    if (opts.profileAction) checkoutPayload.profileAction = opts.profileAction;
    if (opts.action) checkoutPayload.action = opts.action;
    if (opts.profileId) checkoutPayload.profileId = opts.profileId;
    if (opts.selectedProfileId || opts.profileId) checkoutPayload.selectedProfileId = opts.selectedProfileId || opts.profileId;
    if (opts.profileCardId || opts.profileId) checkoutPayload.profileCardId = opts.profileCardId || opts.profileId;
    if (opts.contentKey) checkoutPayload.contentKey = opts.contentKey;
    if (opts.contentId || opts.contentKey) checkoutPayload.contentId = opts.contentId || opts.contentKey;
    if (opts.targetYear !== undefined && opts.targetYear !== null) checkoutPayload.targetYear = opts.targetYear;
    if (opts.serviceKey) checkoutPayload.serviceKey = opts.serviceKey;
    if (opts.serviceId || opts.serviceKey) checkoutPayload.serviceId = opts.serviceId || opts.serviceKey;
    return { checkoutPayload: checkoutPayload, coinPrice: coinPrice, amountKrw: amountKrw, featureKey: directFeatureKey };
  }

  // 결제 POST는 사전발급하거나 자동 재시도하지 않는다. 클릭 한 번과 주문 한 번을 대응시킨다.
  function _dpTakeDirectCheckoutResponse(checkoutPayload) {
    var key = String((checkoutPayload && checkoutPayload.idempotencyKey) || '').trim();
    return _dpPaymentFetchJson('/api/billing/checkout', {
      method: 'POST',
      headers: key ? { 'Idempotency-Key': key } : undefined,
      body: JSON.stringify(checkoutPayload),
    });
  }

  // 서버 trimUtf8Bytes(worker/routes/payments.js)와 같은 규칙. 이니시스 orderName 제한은
  // 바이트 기준이라 글자수 slice 로는 안 된다(한글 1자 = 3바이트).
  function _dpTrimUtf8Bytes(value, maxBytes) {
    var text = String(value == null ? '' : value);
    if (typeof TextEncoder === 'undefined') return text.slice(0, Math.max(0, Math.floor(maxBytes / 3))).trim();
    var encoder = new TextEncoder();
    var output = '';
    var chars = Array.from(text);
    for (var i = 0; i < chars.length; i += 1) {
      var next = output + chars[i];
      if (encoder.encode(next).length > maxBytes) break;
      output = next;
    }
    return output.trim();
  }

  function _dpResolvePortOneOrderName(order, checkoutPayload) {
    var serverOrderName = _dpTrimUtf8Bytes((order && order.orderName) || '', 40);
    if (serverOrderName) return serverOrderName;
    var fallback = _dpTrimUtf8Bytes((checkoutPayload && checkoutPayload.reason) || '', 40);
    return fallback || 'Code Destiny';
  }

  // PortOne V2 는 실패를 reject 하지 않고 {code, message} 로 resolve 한다. 사용자 취소만 취소로 분류한다.
  function _dpIsPortOneUserCancelCode(code) {
    var normalized = String(code || '').trim().toUpperCase();
    if (!normalized) return false;
    return normalized.indexOf('CANCEL') === 0 || normalized.indexOf('USER_CANCEL') === 0 || normalized === 'PAYMENT_CANCELLED';
  }

  // ── 모바일 리다이렉트 복귀 처리 ──────────────────────────────────────────────
  // PortOne V2 는 모바일에서 결제를 상위 프레임 리다이렉트로 처리할 수 있다. 그러면 await 중이던
  // requestPayment 프로미스가 페이지와 함께 죽어 /api/billing/confirm 이 호출되지 않는다 —
  // 결제는 승인됐는데 권한이 안 붙고, 사용자에겐 "결제창이 안 뜨고 화면만 깜빡"으로 보였다.
  // redirectUrl 에 심는 portone_redirect=1 의 소비자가 /points 하나뿐이어서 유료 기능은 방치됐다.
  // 이 파일은 정적 셸(defer)과 React 유료 화면 양쪽에 로드되는 공통 런타임이라 복귀 처리를 여기 한 곳에 둔다.
  var _DP_DIRECT_RESUME_KEY = 'cd_direct_payment_resume';
  var _DP_DIRECT_RESUME_TTL_MS = 30 * 60 * 1000;

  function _dpWriteDirectResumeTicket(ticket) {
    try {
      sessionStorage.setItem(_DP_DIRECT_RESUME_KEY, JSON.stringify(ticket));
    } catch (_) {}
  }

  function _dpClearDirectResumeTicket() {
    try { sessionStorage.removeItem(_DP_DIRECT_RESUME_KEY); } catch (_) {}
  }

  function _dpReadDirectResumeTicket() {
    var raw = '';
    try { raw = String(sessionStorage.getItem(_DP_DIRECT_RESUME_KEY) || ''); } catch (_) { return null; }
    if (!raw) return null;
    var parsed = null;
    try { parsed = JSON.parse(raw); } catch (_) { parsed = null; }
    if (!parsed || typeof parsed !== 'object') {
      _dpClearDirectResumeTicket();
      return null;
    }
    // 오래된 티켓이 훗날 무관한 리다이렉트에서 되살아나 엉뚱한 주문을 확정하지 않도록 만료시킨다.
    if (!parsed.at || (Date.now() - Number(parsed.at)) > _DP_DIRECT_RESUME_TTL_MS) {
      _dpClearDirectResumeTicket();
      return null;
    }
    return parsed;
  }

  async function _dpResumeDirectPaymentAfterRedirect() {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
    var query;
    try { query = new URLSearchParams(window.location.search || ''); } catch (_) { return; }
    if (query.get('portone_redirect') !== '1') return;

    var ticket = _dpReadDirectResumeTicket();
    // 티켓이 없으면 이 복귀는 우리 것이 아니다(예: /points 가 자기 키로 처리하는 이용권·월정석 결제).
    if (!ticket || !ticket.confirmBody) return;

    var paymentId = String(
      query.get('paymentId') || query.get('payment_id') || query.get('imp_uid') || ticket.merchantUid || '',
    ).trim();
    var failed = String(query.get('code') || '').trim() !== ''
      || String(query.get('imp_success') || '').toLowerCase() === 'false';

    if (!paymentId || failed) {
      // 승인이 나지 않은 복귀다 — 티켓을 회수한다.
      _dpClearDirectResumeTicket();
      var failMessage = String(query.get('message') || query.get('error_msg') || '').trim();
      window.alert(failMessage || '결제가 완료되지 않았습니다. 다시 시도해 주세요.');
      return;
    }

    try {
      _dpSetPaymentPending(true, '결제 승인과 콘텐츠 이용 권한을 확인하고 있습니다.', 'confirm');
      // 🔴 티켓은 confirm 성공 뒤에 지운다. 먼저 지우면 5xx 한 번에 승인된 결제의 복구 수단이 사라진다.
      // 티켓은 30분 TTL(_DP_DIRECT_RESUME_TTL_MS)로 스스로 만료되므로 남겨 둬도 되살아나지 않는다.
      var dpResumeBody = JSON.stringify(Object.assign({}, ticket.confirmBody, {
        impUid: paymentId,
        paymentId: paymentId,
      }));
      var confirmRes = await _dpPaymentFetchJson('/api/billing/confirm', { method: 'POST', body: dpResumeBody });
      _dpSetPaymentPending(false);
      if (!confirmRes.ok) {
        window.alert(_dpReadBillingMessage(confirmRes.payload, '결제 검증에 실패했습니다. 고객센터로 문의해 주세요.'));
        return;
      }
      // 서버 confirm 은 멱등이다(existingUnlock 감지 → alreadyUnlocked). 중복 확정 위험은 없다.
      _dpClearDirectResumeTicket();
      _dpShowPaymentCompleteOverlay(_dpText('paymentCompleteOverlay'));
    } catch (error) {
      _dpSetPaymentPending(false);
      console.error('[direct-payment-resume]', error);
      window.alert('결제 확인 중 오류가 발생했습니다. 잠시 후 주문 내역을 확인해 주세요.');
    }
  }


  var __dpPaidPassGateCache = window.__cdPassAccessResultCache || (window.__cdPassAccessResultCache = {});

  function _dpPaidPassCacheKey(opts, title, coinPrice) {
    opts = opts || {};
    var featureKey = String(opts.featureKey || opts.subFeatureKey || opts.serviceKey || opts.productId || '').trim();
    var reason = String(opts.reason || title || opts.title || '').trim();
    var cost = Math.max(0, Math.floor(Number(coinPrice || opts.coinPrice || opts.cost || 0)));
    return [featureKey, reason, cost].join('|');
  }

  function _dpBuildPaidServiceSingleFlightKey(options, title, coinPrice, amountKrw) {
    var opts = options || {};
    var feature = String(opts.featureKey || opts.subFeatureKey || opts.categoryKey || opts.contentKey || opts.productId || opts.serviceKey || opts.reportType || opts.actionType || opts.action || title || opts.reason || 'paid-service').trim().toLowerCase();
    var label = String(title || opts.reason || opts.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
    var cost = Math.max(0, Math.floor(Number(coinPrice || opts.coinPrice || opts.cost || 0)));
    var amount = Math.max(0, Math.floor(Number(amountKrw || opts.amountKrw || opts.amountKRW || opts.paymentAmount || opts.amount || (cost * 100) || 0)));
    var profile = String(opts.profileId || opts.selectedProfileId || '').trim().toLowerCase();
    return [feature || 'paid-service', label, cost, amount, profile].join('|');
  }

  function _dpJoinPaidServiceSingleFlight(slotName, key, ttlMs, producer) {
    var now = Date.now();
    var active = window[slotName];
    if (active && active.promise && active.key === key && now - Number(active.startedAt || 0) < ttlMs) {
      return active.promise;
    }
    var promise = Promise.resolve().then(producer);
    window[slotName] = { key: key, startedAt: now, promise: promise };
    var clear = function() {
      window.setTimeout(function() {
        var current = window[slotName];
        if (current && current.promise === promise) window[slotName] = null;
      }, 1800);
    };
    promise.then(clear, clear);
    return promise;
  }

  function _dpHasActivePaidServiceSingleFlight(slotName, key, ttlMs) {
    var active = window[slotName];
    if (!active || !active.promise) return false;
    if (active.key === key) return false;
    return Date.now() - Number(active.startedAt || 0) < ttlMs;
  }

  function _dpIsGenericPaidGateFeatureKey(value) {
    var key = String(value || '').trim().toLowerCase();
    return !key || key === 'coin-gate-per-use' || key === 'paid-service' || key === 'paid_service' || key === 'default' || key === 'service';
  }

  function _dpNormalizePaidReason(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  var _DP_PAID_REASON_FEATURE_KEYS = {
    '십이지신 천운 타로': 'tarot-year-fortune',
    '우리는 무슨 사이? 타로 리딩': 'tarot-love-relationship',
    '재회운 타로 리딩': 'tarot-reunion-reading',
    '주역 거북점 리딩': 'openJuyukModal',
    '이집트 신탁 리딩': 'openKemetModal',
    '애니멀 토템 리딩': 'animal-totem-basic',
    '애니멀 토템 심화 리딩': 'animal-totem-deep',
    '점성술 셜럭 시나스트리 궁합': 'compat-astro-synastry',
    '점성술 직접 입력 시나스트리 궁합': 'compat-astro-direct-synastry',
    '자미두수 궁합 분석': 'compat-ziwei-compatibility',
    '사주 궁합 분석': 'compat-saju-compatibility',
    '숙요점 유명인 궁합': 'compat-sukuyo-compatibility',
    '숙요점 궁합 분석': 'compat-sukuyo-compatibility',
    '프로필 카드 추가': 'profile-card-manage',
    '프로필 카드 삭제': 'profile-card-manage'
  };

  function _dpResolvePaidGateReasonFeatureKey(opts, title) {
    opts = opts || {};
    var reason = _dpNormalizePaidReason(opts.reason || title || opts.title || '');
    if (_DP_PAID_REASON_FEATURE_KEYS[reason]) return _DP_PAID_REASON_FEATURE_KEYS[reason];
    var compact = reason.replace(/\s+/g, '');
    if (!compact) return '';
    if (compact.indexOf('십이지신') >= 0 && compact.indexOf('천운') >= 0 && compact.indexOf('타로') >= 0) return 'tarot-year-fortune';
    if (compact.indexOf('우리는무슨사이') >= 0 && compact.indexOf('타로') >= 0) return 'tarot-love-relationship';
    if (compact.indexOf('재회운') >= 0 && compact.indexOf('타로') >= 0) return 'tarot-reunion-reading';
    if (compact.indexOf('주역') >= 0 && compact.indexOf('거북점') >= 0) return 'openJuyukModal';
    if (compact.indexOf('이집트') >= 0 && compact.indexOf('신탁') >= 0) return 'openKemetModal';
    if (compact.indexOf('애니멀토템심화') >= 0) return 'animal-totem-deep';
    if (compact.indexOf('애니멀토템') >= 0) return 'animal-totem-basic';
    if (compact.indexOf('점성술셜럭') >= 0 && compact.indexOf('시나스트리궁합') >= 0) return 'compat-astro-synastry';
    if (compact.indexOf('점성술직접입력') >= 0 && compact.indexOf('시나스트리궁합') >= 0) return 'compat-astro-direct-synastry';
    if (compact.indexOf('자미두수') >= 0 && compact.indexOf('궁합') >= 0) return 'compat-ziwei-compatibility';
    if (compact.indexOf('사주') >= 0 && compact.indexOf('궁합분석') >= 0) return 'compat-saju-compatibility';
    if (compact.indexOf('숙요점') >= 0 && compact.indexOf('궁합') >= 0) return 'compat-sukuyo-compatibility';
    if (compact.indexOf('프로필카드') >= 0) return 'profile-card-manage';
    return '';
  }

  function _dpResolvePaidGateFeatureKey(opts, title) {
    opts = opts || {};
    var explicit = String(opts.featureKey || '').trim();
    if (!_dpIsGenericPaidGateFeatureKey(explicit)) return explicit;
    var fallback = String(opts.subFeatureKey || opts.serviceKey || opts.productId || opts.actionType || opts.profileAction || opts.action || '').trim();
    if (!_dpIsGenericPaidGateFeatureKey(fallback)) return fallback;
    return _dpResolvePaidGateReasonFeatureKey(opts, title);
  }

  // 미커버(payment_required) 판정도 캐시한다 — 예전엔 grant 만 15초 캐시하고 그마저 파괴적으로 읽어,
  // 이용권 없는 사용자가 클릭할 때마다 같은 답을 서버에서 다시 받아왔다. 셸 정본과 같은 30초 TTL.
  var _DP_PASS_GATE_CACHE_TTL_MS = 30000;

  function _dpStorePaidPassGateResult(key, result) {
    if (!key || !result) return;
    var status = String(result.status || '');
    if (status !== 'pass_applied' && status !== 'already_unlocked' && status !== 'payment_required') return;
    __dpPaidPassGateCache[key] = { access: result, expiresAt: Date.now() + _DP_PASS_GATE_CACHE_TTL_MS };
  }

  // 비파괴 읽기 — 만료 전에는 반복 클릭이 모두 캐시를 맞는다(파괴적 읽기는 두 번째 클릭부터 다시 왕복했다).
  function _dpTakePaidPassGateResult(key) {
    if (!key) return null;
    var entry = __dpPaidPassGateCache[key];
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      delete __dpPaidPassGateCache[key];
      return null;
    }
    return entry.access || null;
  }

  // 이용권 구매·결제 성공·로그인 상태 변화처럼 판정 근거가 바뀌면 캐시를 통째로 비운다.
  function _dpClearPaidPassGateCache(reason) {
    try {
      Object.keys(__dpPaidPassGateCache).forEach(function(key) { delete __dpPaidPassGateCache[key]; });
    } catch (_) {}
    try {
      if (reason === 'auth-changed' || reason === 'logout') _dpRemoveSubscriptionSnapshot(_dpSubSnapshotUserId());
    } catch (_) {}
  }
  try { window._dpClearPaidPassGateCache = _dpClearPaidPassGateCache; } catch (_) {}

  function _dpIsMembershipPassGrantedPayload(payload) {
    var data = _dpExtractBillingData(payload || {});
    var consume = data && data.consume && typeof data.consume === 'object' ? data.consume : {};
    var accessGrant = data && data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    var values = [data.freeBySubscription === true ? 'membership_pass' : '', data.alreadyUnlocked === true ? 'already_unlocked' : '', data.accessType, data.transactionType, data.accessMethod, data.paymentMethod, consume.accessType, consume.transactionType, consume.accessMethod, consume.paymentMethod, accessGrant.accessType, accessGrant.transactionType, accessGrant.accessMethod, accessGrant.paymentMethod];
    for (var i = 0; i < values.length; i += 1) {
      var value = String(values[i] || '').toLowerCase();
      if (value === 'membership_pass' || value === 'already_unlocked') return true;
    }
    return false;
  }

  function _dpPaidPassPayloadTransactionId(payload, fallbackId) {
    var data = _dpExtractBillingData(payload || {});
    var consume = data && data.consume && typeof data.consume === 'object' ? data.consume : {};
    var accessGrant = data && data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    return String(data.transactionId || data.paymentId || data.purchaseId || data.requestId || consume.transactionId || consume.requestId || accessGrant.evidenceId || accessGrant.purchaseId || accessGrant.requestId || fallbackId || '');
  }

  function _dpBuildPaidGatePayload(opts, title, coinPrice, requestId, paymentMode) {
    opts = opts || {};
    var actionType = opts.actionType || opts.profileAction || opts.action || undefined;
    return {
      cost: coinPrice,
      coinPrice: coinPrice,
      reason: String(opts.reason || title),
      featureKey: _dpResolvePaidGateFeatureKey(opts, title) || undefined,
      paymentMode: paymentMode,
      requestId: requestId,
      categoryKey: opts.categoryKey || undefined,
      subFeatureKey: opts.subFeatureKey || undefined,
      productId: opts.productId || undefined,
      reportType: opts.reportType || undefined,
      serviceKey: opts.serviceKey || undefined,
      actionType: actionType,
      profileAction: actionType,
      action: actionType,
      profileId: opts.profileId || undefined,
      selectedProfileId: opts.selectedProfileId || opts.profileId || undefined
    };
  }

  async function _dpApplyMembershipPassBeforePayment(options) {
    var opts = options || {};
    var coinPrice = Math.max(0, Math.floor(Number(opts.coinPrice || opts.cost || 0)));
    if (!coinPrice) return { status: 'payment_required' };
    var title = String(opts.title || opts.reason || '\uC720\uB8CC \uC11C\uBE44\uC2A4').trim();
    var featureKey = _dpResolvePaidGateFeatureKey(opts, title);
    var requestId = String(opts.requestId || '').trim() || ('pass-gate-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
    var cacheKey = _dpPaidPassCacheKey(opts, title, coinPrice);
    var cached = _dpTakePaidPassGateResult(cacheKey);
    if (cached && (cached.status === 'pass_applied' || cached.status === 'already_unlocked')) return cached;
    // 명시적 이용권 선택은 매번 현재 서버 상태로 판정한다. 직전 미커버 캐시를 재사용하면
    // 이용권 구매·세션 갱신 뒤에도 사용자를 다시 상점으로 보내는 stale-miss가 된다.
    // 최종 MEMBERSHIP_PASS 판정 전에 현재 세션을 먼저 확정한다. 이 GET은 인증 복구를 위한
    // single-flight 준비 단계이며, coin-gate 결제 명령을 자동 재시도하지 않는다.
    var authPreparation = await _dpPrepareMembershipPassAuth();
    if (!authPreparation || authPreparation.ready !== true) {
      return {
        status: 'error',
        code: (authPreparation && authPreparation.code) || 'AUTH_SESSION_CHECK_UNAVAILABLE',
        message: (authPreparation && authPreparation.message) || '\uB85C\uADF8\uC778 \uC815\uBCF4\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
        requestId: requestId
      };
    }
    var res;
    try {
      res = await _dpPaymentFetchJson('/api/billing/coin-gate', { method: 'POST', body: JSON.stringify(_dpBuildPaidGatePayload(opts, title, coinPrice, requestId, 'MEMBERSHIP_PASS')) });
    } catch (passCheckError) {
      // 네트워크/타임아웃 등으로 이용권 확인 자체가 실패 — '이용권 없음'으로 오인해 결제창으로 강등하지 않고 일시 오류로 표면화.
      return { status: 'error', code: 'PASS_CHECK_UNAVAILABLE', error: passCheckError, requestId: requestId };
    }
    var payload = res && res.payload ? res.payload : res;
    var statusCode = Number((res && res.status) || (payload && payload.status) || 0);
    var code = String((payload && (payload.code || payload.errorCode)) || '').toUpperCase();
    if (res && res.ok && _dpIsMembershipPassGrantedPayload(payload)) {
      var result = { status: _dpExtractBillingData(payload).alreadyUnlocked === true ? 'already_unlocked' : 'pass_applied', payload: payload, requestId: requestId };
      _dpStorePaidPassGateResult(cacheKey, result);
      try {
        if (result.status === 'pass_applied' || result.status === 'already_unlocked') {
          if (typeof window._cdShowMembershipFreeNotice === 'function') window._cdShowMembershipFreeNotice({ title: title, coinPrice: coinPrice, payload: payload });
          else if (typeof window._cdSetCoinGateOverlay === 'function') _dpShowPassAppliedOverlay(_dpText('passAppliedOverlay'));
          else if (typeof window._cdShowSubscriptionShieldNotice === 'function') window._cdShowSubscriptionShieldNotice({ message: _dpText('subscriptionIncluded'), requiredCoins: coinPrice });
        }
      } catch (_) {}
      return result;
    }
    if (statusCode === 402 || code === 'MEMBERSHIP_PASS_NOT_COVERED' || code === 'PAYMENT_REQUIRED') {
      var notCovered = { status: 'payment_required', payload: payload, requestId: requestId };
      return notCovered;
    }
    // 진짜 미보유(402/미커버)만 결제창으로 유도한다. 5xx·degraded·인증 일시장애·비2xx 응답을 '이용권 없음'으로
    // 오인해 결제창으로 강등하면 이용권 보유자가 결제창으로 세탁된다 — 정상 게이트(index.html PASS_APPLY_FAILED)와
    // 동일하게 일시 오류로 구분해 결제창 대신 재시도로 유도한다.
    var passCheckDegraded = !!(payload && (payload.degraded === true || (payload.data && payload.data.degraded === true)));
    // 확정 인증 실패(401/403)는 '일시 오류'가 아니다 — 로그인하지 않았다면 이용권도 있을 수 없다.
    // 예전엔 아래 res.ok === false 가 이걸 삼켜 재시도 3회 + 백오프 700ms 를 버렸다. 단, 서버가 일시 장애를
    // 401 로 표면화하는 코드(AUTH_STATUS_TEMPORARILY_UNAVAILABLE / AUTH_DB_UNAVAILABLE)와 degraded 응답은
    // 계속 '일시 오류'로 남겨 이용권 보유자의 무료 통과 기회를 지킨다.
    var passCheckAuthDefinite = (statusCode === 401 || statusCode === 403)
      && !passCheckDegraded
      && code !== 'AUTH_STATUS_TEMPORARILY_UNAVAILABLE'
      && code !== 'AUTH_DB_UNAVAILABLE'
      && code !== 'AUTH_REFRESH_TEMPORARY_FAILURE';
    if (passCheckAuthDefinite) {
      // 401/403은 이용권 미커버가 아니다. 인증 복구 중일 수 있는 사용자를 상점으로 보내지 않고
      // 결제창을 유지한다. 세션 흔적이 전혀 없을 때만 로그인 안내를 반환한다.
      if (_dpHasSessionHint()) {
        return { status: 'error', code: 'AUTH_SESSION_CHECK_UNAVAILABLE', message: '\uB85C\uADF8\uC778 \uC815\uBCF4\uB97C \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.', payload: payload, requestId: requestId };
      }
      return { status: 'error', code: code || 'AUTH_REQUIRED', message: '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.', payload: payload, requestId: requestId };
    }
    if (statusCode >= 500 || passCheckDegraded || code === 'PASS_STATUS_TEMPORARILY_UNAVAILABLE' || code === 'AUTH_STATUS_TEMPORARILY_UNAVAILABLE' || code === 'BALANCE_SNAPSHOT_UNAVAILABLE' || (res && res.ok === false)) {
      return { status: 'error', code: code || 'PASS_CHECK_UNAVAILABLE', payload: payload, requestId: requestId };
    }
    return { status: 'payment_required', payload: payload, requestId: requestId };
  }

  async function _dpRunMonthlyCreditFromMainGate(options) {
    var opts = options || {};
    var coinPrice = Math.max(0, Math.floor(Number(opts.coinPrice || opts.cost || 0)));
    var title = String(opts.title || opts.reason || '\uC720\uB8CC \uC11C\uBE44\uC2A4').trim();
    var featureKey = _dpResolvePaidGateFeatureKey(opts, title);
    var requestId = String(opts.requestId || '').trim() || ('monthly-gate-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
    var res = await _dpPaymentFetchJson('/api/billing/coin-gate', { method: 'POST', body: JSON.stringify(_dpBuildPaidGatePayload(opts, title, coinPrice, requestId, 'MOONLIGHT_STONE')) });
    if (!res || !res.ok) throw new Error(_dpReadBillingMessage(res && res.payload, '\uC6D4\uC815\uC11D \uACB0\uC81C\uB97C \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'));
    return res.payload || res;
  }

  function _dpBuildPaidGateGrantedResult(access, requestId, onGranted) {
    var granted = access && typeof access === 'object' ? access : {};
    var payload = granted.payload || granted.rawPayload || {};
    var txId = _dpPaidPassPayloadTransactionId(payload, requestId);
    if (typeof onGranted === 'function') onGranted(txId, payload || {}, granted);
    return { status: 'granted', transactionId: txId, payload: payload || {}, access: granted };
  }

  // 낙관적 pass 즉시 허용의 정확성 안전장치: 백그라운드 기록이 실제로는 미커버(만료 등)로 밝혀지면
  // 잠시 낙관적 허용을 끄고(세션 갱신 전까지) 서버 판정으로 폴백시킨다.
  var _dpOptimisticPassDisabledUntil = 0;
  function _dpDisableOptimisticPassBriefly() { _dpOptimisticPassDisabledUntil = Date.now() + 60000; }
  function _dpOptimisticPassDisabled() { return Date.now() < _dpOptimisticPassDisabledUntil; }

  // 낙관적 즉시 허용 후 서버에 pass 사용을 기록(fire-and-forget). pass는 무료라 기록 실패해도 금전영향 0.
  // 서버가 미커버(402)로 응답하면 로컬 스냅샷이 낡은 것이므로 세션을 갱신하고 낙관적 허용을 잠시 비활성화한다.
  function _dpRecordMembershipPassInBackground(opts, title, coinPrice, requestId) {
    try {
      var bgRequestId = String(requestId || '').trim() || ('opt-pass-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8));
      _dpPaymentFetchJson('/api/billing/coin-gate', { method: 'POST', body: JSON.stringify(_dpBuildPaidGatePayload(opts, title, coinPrice, bgRequestId, 'MEMBERSHIP_PASS')) })
        .then(function(res) {
          var payload = res && res.payload ? res.payload : res;
          if (res && res.ok && _dpIsMembershipPassGrantedPayload(payload)) return; // 서버도 pass 확인 — 정합.
          var statusCode = Number((res && res.status) || (payload && payload.status) || 0);
          var code = String((payload && (payload.code || payload.errorCode)) || '').toUpperCase();
          if (statusCode === 402 || code === 'MEMBERSHIP_PASS_NOT_COVERED' || code === 'PAYMENT_REQUIRED') {
            // 🔴 낙관 잠금은 전역 60초다. '이 가격이 이 등급 한도를 넘는다'는 미커버는 스냅샷이 이미 아는
            // 사실이라 자기수정할 것이 없는데, 여기서 잠그면 한도 이내 기능들의 낙관 통과까지 함께 죽는다.
            // 스냅샷과 서버 답이 실제로 어긋난 경우만 잠근다(셸 _cdRecordMembershipPassInBackground 와 동일 규칙).
            var deniedSnapshot = _dpReadSubscriptionSnapshot({ allowStaleNone: true });
            if (deniedSnapshot
              && deniedSnapshot.state === 'active'
              && deniedSnapshot.tier !== 'family'
              && Math.max(0, Math.floor(Number(coinPrice || 0))) > _dpMembershipPassLimitForTier(deniedSnapshot.tier)) return;
            _dpDisableOptimisticPassBriefly();
            try { _dpRefreshAuthSessionSilently({}); } catch (_) {}
          }
          // 5xx/degraded는 일시장애 — 무시(재시도 불필요).
        })
        .catch(function() {});
    } catch (_) {}
  }

  window.__cdApplyMembershipPassBeforePayment = window.__cdApplyMembershipPassBeforePayment || _dpApplyMembershipPassBeforePayment;

  if (typeof window._cdOpenPaidServiceGate !== 'function') {
    window._cdOpenPaidServiceGate = async function(options) {
      var opts = options || {};
      var title = String(opts.title || opts.reason || '\uC720\uB8CC \uC11C\uBE44\uC2A4').trim();
      var coinPrice = Math.max(0, Math.floor(Number(opts.coinPrice || opts.cost || 0)));
      var requestId = String(opts.requestId || '').trim() || ('paid-gate-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
      if (typeof window._cdChooseServicePaymentMode !== 'function') {
        // \uACB0\uC81C \uC120\uD0DD\uCC3D \uD568\uC218 \uBBF8\uC124\uCE58(\uADF9\uB2E8\uC801 \uB85C\uB4DC\uC21C\uC11C)\uB77C\uB3C4 throw\uB85C dead-end\uD558\uC9C0 \uC54A\uACE0, \uC774 \uD30C\uC77C\uC774 \uC81C\uACF5\uD558\uB294
        // \uC815\uCC45\uC900\uC218 \uACB0\uC81C \uC120\uD0DD \uBAA8\uB2EC(_dpCanonicalPaymentChoice\u2192\uB3C5\uB9BD \uBAA8\uB2EC \uD3F4\uBC31)\uB85C \uC989\uC2DC \uC790\uAE30\uC218\uBCF5\uD574
        // \uACB0\uC81C\uCC3D(\uB2E8\uAC74+\uC6D4\uC815\uC11D)\uC774 \uBC18\uB4DC\uC2DC \uC5F4\uB9AC\uB3C4\uB85D \uD55C\uB2E4.
        if (typeof _dpCanonicalPaymentChoice === 'function') window._cdChooseServicePaymentMode = _dpCanonicalPaymentChoice;
      }
      // 확정 미커버(미로그인 / 서버가 쓴 none 스냅샷 / 산술적 한도 초과)면 서버 pass-check 왕복을 건너뛰고
      // 곧바로 결제창을 연다. 셸(index.html allowSnapshotFastPath)과 같은 근거만 쓰며, 지연을 근거로 쓰지 않는다.
      // requireServerPassCheck 로 서버 재검증을 명시 요청한 호출부는 이 지름길을 타지 않는다.
      var _dpCertainPassMiss = (opts.disablePassFirst === true || opts.requireServerPassCheck === true)
        ? ''
        : _dpResolveCertainPassMiss(coinPrice);
      if (typeof window.__cdApplyMembershipPassBeforePayment === 'function' && opts.disablePassFirst !== true && !_dpCertainPassMiss) {
        // 낙관적 즉시 허용: 로컬 구독 스냅샷이 pass 커버를 확인하면 서버 왕복을 백그라운드로 돌려 속도를 유지한다
        // (정확성은 백그라운드 미커버 응답 시 세션 갱신으로 자기수정). 단 "확인 중 → 적용 완료" 2단계 UX는
        // 그대로 유지하고, 완료 오버레이 표시 중 onGranted(콘텐츠 생성)를 병렬 진행한다.
        if (!_dpOptimisticPassDisabled() && _dpReadActiveMembershipCoverage(coinPrice)) {
          _dpRecordMembershipPassInBackground(opts, title, coinPrice, requestId);
          _dpSetPaymentPending(true, '이용권을 확인하고 있어요…', 'pass');
          await _dpWaitForPaymentOverlayPaint();
          // '확인 중 → 적용 완료' 두 프레임을 보여주되 대기는 최소로. 기존 450ms 는 이용권 보유자 전원이
          // 매 진입마다 버리는 인위적 지연이었다(왕복이 없는 낙관 경로라 기다릴 이유가 없다).
          await new Promise(function (resolve) { setTimeout(resolve, 150); });
          _dpShowPassAppliedOverlay(_dpText('passAppliedOverlay'));
          return _dpBuildPaidGateGrantedResult({ status: 'pass_applied', payload: { __cdOptimisticPass: true } }, requestId, opts.onGranted);
        }
        // 🔴 여기서 서버에 이용권을 묻지 않는다(2026-08 정책 전환, 셸 index.html · React 와 동일).
        // 스냅샷이 커버를 확답하면 위에서 이미 무료로 통과했고, 확답하지 못하면 기다리지 않고 곧바로
        // 결제창을 연다. 예전에는 여기서 __cdApplyMembershipPassBeforePayment 를 6초 예산 + 재시도 2회로
        // 두드렸고, 그 대기가 곧 사용자가 결제창을 만나기까지의 지연이었다.
        // 이용권 확인은 결제창의 '이용권으로 구매' 카드가 그 자리에서 수행한다.
        // 단건 결제 선택은 이용권으로 자동 전환하지 않는다.
      }
      // 결제창이 열리는 동안(사용자가 단건/월정석을 읽는 시간) SDK를 내려받아 임계경로에서 뺀다.
      _dpPreloadPortOneV2Sdk();
      var choice = await window._cdChooseServicePaymentMode(Object.assign({}, opts, { title: title, coinPrice: coinPrice, cost: coinPrice, requestId: requestId, internalMainGate: true, skipPassProbe: true }));
      if (!choice || choice === 'cancel') {
        if (typeof opts.onCancel === 'function') opts.onCancel();
        return { status: 'cancelled' };
      }
      if (choice === 'pass') choice = 'pass_applied';
      if (choice === 'pass_applied') {
        var passCacheKey = _dpPaidPassCacheKey(Object.assign({}, opts, { title: title, coinPrice: coinPrice, cost: coinPrice, requestId: requestId }), title, coinPrice);
        var passResult = _dpTakePaidPassGateResult(passCacheKey);
        if ((!passResult || (passResult.status !== 'pass_applied' && passResult.status !== 'already_unlocked')) && typeof window.__cdApplyMembershipPassBeforePayment === 'function') {
          passResult = await window.__cdApplyMembershipPassBeforePayment(Object.assign({}, opts, {
            title: title,
            coinPrice: coinPrice,
            cost: coinPrice,
            requestId: requestId
          }));
        }
        if (passResult && (passResult.status === 'pass_applied' || passResult.status === 'already_unlocked')) {
          return _dpBuildPaidGateGrantedResult(passResult, requestId, opts.onGranted);
        }
        return { status: 'payment_required', reason: 'membership_pass_not_covered', payload: passResult && passResult.payload ? passResult.payload : null };
      }
      if (choice === 'monthly') _dpSetPaymentPending(true, '월정석 잔량으로 콘텐츠 이용 권한을 확인하고 있습니다.', 'monthly');
      // [regression-guard] Moonlight settles server-side immediately so a wait overlay is correct there;
      // single payment shows NO wait UI until the PG window is open.
      var payload = choice === 'monthly' ? await _dpRunMonthlyCreditFromMainGate(Object.assign({}, opts, { title: title, coinPrice: coinPrice, cost: coinPrice, requestId: requestId })) : await window._cdRunDirectKrwCheckout(Object.assign({}, opts, { title: title, coinPrice: coinPrice, cost: coinPrice, requestId: requestId, forceDirectPayment: true, internalMainGate: true }));
      // 월정석 완료 프레임 표시(단건은 _cdRunDirectKrwCheckout 내부에서 이미 표시). 완료 오버레이 표시 중 onGranted(생성)는 병렬 진행.
      if (choice === 'monthly') _dpShowPaymentCompleteOverlay(_dpText('monthlyAppliedOverlay'));
      var txId = _dpPaidPassPayloadTransactionId(payload, requestId);
      if (typeof opts.onGranted === 'function') opts.onGranted(txId, payload || {}, { status: choice === 'monthly' ? 'monthly_paid' : 'direct_paid' });
      return { status: 'granted', transactionId: txId, payload: payload || {} };
    };
  }  if (typeof window._cdRunDirectKrwCheckout !== 'function') {
    window._cdRunDirectKrwCheckout = async function(options) {
      var opts = options || {};
      var _dpDirectBuilt = _dpBuildDirectCheckoutPayload(opts);
      var checkoutPayload = _dpDirectBuilt.checkoutPayload;
      var coinPrice = _dpDirectBuilt.coinPrice;
      var amountKrw = _dpDirectBuilt.amountKrw;
      var directFeatureKey = _dpDirectBuilt.featureKey;
      // 🔴 주문 요청을 **먼저 발사**하고 그 다음에 대기 오버레이를 켠다. 오버레이 점등은 리플로우와
      // 스크롤락을 동반해(React 경로에서는 리렌더까지) 메인스레드를 붙잡으므로, 앞에 두면 그만큼
      // checkout 요청 시작이 밀린다 — 대기 UI 때문에 PG창이 늦어지지 않게 하는 것이 이 순서의 목적이다.
      // 명시적인 단건 선택 뒤 주문을 한 번만 발급한다.
      var checkoutPending = _dpTakeDirectCheckoutResponse(checkoutPayload);
      // 클릭~PG창 구간을 꽃돼지 '단건 결제창 준비 중'(mode 'card') 오버레이로 채운다. 빈 화면은
      // 이탈로 이어진다. 결제수단 선택 모달이 이미 닫힌 뒤라 겹치지 않고, PG창 렌더 직전의
      // _dpSetPaymentPending(false) 가 내린다. 문구는 mode 'card' 정본 카피에 맡긴다.
      _dpSetPaymentPending(true, '', 'card');
      var checkoutRes = await checkoutPending;
      if (!checkoutRes.ok) throw new Error(_dpReadBillingMessage(checkoutRes.payload, '결제 준비에 실패했습니다.'));

      var checkoutData = _dpExtractBillingData(checkoutRes.payload);
      var order = _dpFindCheckoutOrder(checkoutData);
      if (!order) {
        var accessGrant = checkoutData && checkoutData.accessGrant && typeof checkoutData.accessGrant === 'object' ? checkoutData.accessGrant : null;
        var consume = checkoutData && checkoutData.consume && typeof checkoutData.consume === 'object' ? checkoutData.consume : null;
        var freeTxHint = String(
          (accessGrant && (accessGrant.evidenceId || accessGrant.purchaseId || accessGrant.transactionId || accessGrant.requestId)) ||
          (consume && (consume.transactionId || consume.requestId)) ||
          checkoutPayload.requestId ||
          '',
        ).trim();
        var allowDirectCheckoutAccessBypass = opts.allowServerAccessBypass === true && opts.forceDirectPayment !== true;
        if (allowDirectCheckoutAccessBypass && (accessGrant || consume || _dpIsCheckoutAccessBypass(checkoutData, checkoutPayload.featureKey || opts.featureKey || ''))) {
          var freePaymentPayload = Object.assign({}, checkoutData, {
            transactionId: freeTxHint,
            paymentId: freeTxHint || checkoutPayload.requestId || undefined,
          });
          if (typeof cb === 'function') cb(freeTxHint || checkoutPayload.requestId || '', freePaymentPayload);
          return freePaymentPayload;
        }
        throw new Error(_dpReadBillingMessage(checkoutData, '결제 주문 정보를 확인할 수 없습니다.'));
      }
      var merchantUid = String(order.merchantUid || order.paymentId || order.orderId || '').trim();
      var orderAmount = Number(order.paymentAmount || order.amountKRW || order.amount || 0);
      if (!merchantUid) {
        throw new Error('\uacb0\uc81c \uc8fc\ubb38 \uc815\ubcf4\uc5d0 \uc8fc\ubb38 ID\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.');
      }
      if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
        throw new Error('\uacb0\uc81c \uc8fc\ubb38 \uc815\ubcf4\uc5d0 \uacb0\uc81c \uae08\uc561\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.');
      }
      // 결제수단 모달 렌더 시점에 시작된 프리로드를 기다린다 — 정상 경로에서는 이미 resolve 상태다.
      await _dpPortOneV2SdkPromise();
      // storeId/channelKey 는 checkout 응답에 이미 실려 온다(worker/routes/payments.js). 그걸 쓰면
      // /api/payments/config 왕복이 통째로 사라진다. 정적 셸의 _cdResolveDirectCheckoutConfig 와 같은 방식.
      // currency/payMethod/noticeUrl 도 함께 받는다 — storeId/channelKey 만 읽으면 /api/payments/config
      // 폴백이 사라진 순간 noticeUrls(웹훅 통지 URL)가 조용히 빠진다. 셸의 _cdResolveDirectCheckoutConfig
      // 와 같은 필드 집합으로 맞춘다.
      var config = {
        storeId: String((order && order.storeId) || (checkoutData && checkoutData.storeId) || '').trim(),
        channelKey: String((order && order.channelKey) || (checkoutData && checkoutData.channelKey) || '').trim(),
        currency: (order && order.currency) || (checkoutData && checkoutData.currency),
        payMethod: (order && order.payMethod) || (checkoutData && checkoutData.payMethod),
        noticeUrl: (order && order.noticeUrl) || (checkoutData && checkoutData.noticeUrl),
      };
      if (!config.storeId || !config.channelKey) {
        var configRes = await _dpPaymentFetchJson('/api/payments/config', { method: 'GET' });
        if (!configRes.ok) throw new Error(_dpReadBillingMessage(configRes.payload, '결제 환경 설정을 확인할 수 없습니다.'));
        config = _dpExtractBillingData(configRes.payload);
      }
      if (!config.storeId || !config.channelKey) {
        throw new Error('포트원 V2 결제 설정이 없습니다.');
      }

      var checkoutUser = _dpReadAuthUser() || {};
      if ((!checkoutUser.email && !checkoutUser.userEmail) && typeof _dpVerifyLoginSession === 'function') {
        try { await _dpVerifyLoginSession(true); } catch (_) {}
        checkoutUser = _dpReadAuthUser() || checkoutUser;
      }

      var payloadCustomer = checkoutPayload.customer && typeof checkoutPayload.customer === 'object' ? checkoutPayload.customer : {};
      // 🔴 서버 주문 응답의 customer(worker/routes/payments.js buildSinglePaymentCustomer)도 소스로 쓴다.
      // 예전에는 checkoutPayload.customer 만 봤기 때문에, 서버가 저장된 번호를 실어 보내도 이 경로(독립
      // 정적 페이지 전부)는 매번 GET /api/me/payment-phone 을 다시 타야 했다 — 셸(index.html)과 순서를 맞춘다.
      var orderCustomer = order && typeof order.customer === 'object' && order.customer ? order.customer : {};
      var customerName = _dpPickText([
        payloadCustomer.fullName,
        payloadCustomer.name,
        checkoutPayload.fullName,
        checkoutPayload.customerName,
        checkoutPayload.name,
        checkoutPayload.userName,
        checkoutUser.name,
        checkoutUser.fullName,
        checkoutUser.username,
        checkoutUser.displayName,
      ]) || '구매자';
      var customerId = _dpPickText([
        payloadCustomer.customerId,
        payloadCustomer.userId,
        checkoutPayload.customerId,
        checkoutPayload.userId,
        checkoutPayload.uid,
        checkoutUser.id,
        checkoutUser.userId,
        checkoutUser.uid,
      ]) || merchantUid;
      var customerEmail = _dpPickText([
        payloadCustomer.email,
        payloadCustomer.customerEmail,
        payloadCustomer.userEmail,
        checkoutPayload.email,
        checkoutPayload.customerEmail,
        checkoutPayload.userEmail,
        checkoutUser.email,
        checkoutUser.userEmail,
      ]);
      var customerPhone = _dpNormalizePaymentPhoneNumber(_dpPickText([
        orderCustomer.phoneNumber,
        orderCustomer.phone,
        payloadCustomer.phoneNumber,
        payloadCustomer.phone,
        checkoutPayload.phoneNumber,
        checkoutPayload.phone,
        checkoutUser.phoneNumber,
        checkoutUser.phone,
      ]));

      if (!customerName) {
        throw new Error('결제 요청에 사용할 구매자 이름을 확인할 수 없습니다. 로그인 정보 또는 입력 폼의 이름을 확인해 주세요.');
      }
      if (!customerEmail) {
        throw new Error('이니시스 V2 일반 결제에는 구매자 이메일이 필요합니다. 로그인 정보 또는 입력 폼의 이메일을 확인해 주세요.');
      }
      if (!_dpIsValidEmail(customerEmail)) {
        throw new Error('구매자 이메일 형식이 올바르지 않습니다.');
      }

      if (!customerPhone) {
        customerPhone = await _dpEnsurePaymentPhoneNumber();
      }
      if (!customerPhone) {
        throw new Error('\uC774\uB2C8\uC2DC\uC2A4 \uACB0\uC81C\uB97C \uC9C4\uD589\uD558\uB824\uBA74 \uAD6C\uB9E4\uC790 \uD734\uB300\uD3F0 \uBC88\uD638\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.');
      }

      // [regression-guard] redirectUrl is built from the current page URL. PR #104 changed this to
      // prefer the server-built order.redirectUrl and the PG window stopped opening. Mobile return is
      // handled by the cd_direct_payment_resume ticket, so the server URL is unnecessary.
      var redirectUrl = new URL(window.location.href);
      redirectUrl.searchParams.set('portone_redirect', '1');
      var customer = {
        customerId: customerId,
        fullName: customerName,
        email: customerEmail,
        phoneNumber: customerPhone
      };
      var requestData = {
        storeId: config.storeId,
        channelKey: config.channelKey,
        paymentId: merchantUid,
        // 🔴 order.productName 은 서버 응답에 없는 필드다(구독 응답 전용). 항상 undefined 가 되어
        // reason 으로 흘렀고, 서버가 이니시스 제약에 맞춰 40 UTF-8 바이트로 다듬은 orderName 이 버려졌다.
        // .slice(0,80) 은 글자 기준이라 한글이면 최대 240바이트 — 초과 시 PG 가 결제창을 그리기 전에 거절한다.
        orderName: _dpResolvePortOneOrderName(order, checkoutPayload),
        totalAmount: orderAmount,
        currency: config.currency || 'CURRENCY_KRW',
        payMethod: config.payMethod || 'CARD',
        // [regression-guard] Do NOT send windowType. PR #104 added { pc:'IFRAME', mobile:'REDIRECTION' }
        // and the PG window stopped opening; no other working payment path in this repo sends it
        // (see lib/payment/portone.ts). Do not re-add without confirming PortOne per-PG support.
        customer: customer,
        redirectUrl: redirectUrl.toString(),
        customData: {
          paymentType: 'digital_content',
          featureKey: String(order.featureKey || checkoutPayload.featureKey || ''),
          requestId: String(checkoutPayload.requestId || ''),
          profileId: String(checkoutPayload.profileId || checkoutPayload.selectedProfileId || ''),
          contentKey: String(checkoutPayload.contentKey || checkoutPayload.contentId || ''),
          targetYear: String(checkoutPayload.targetYear || ''),
        },
      };
      if (config.noticeUrl) requestData.noticeUrls = [config.noticeUrl];

      // 확정 본문을 한 번만 만들어 정상 완료와 리다이렉트 복귀가 완전히 같은 값을 쓰게 한다.
      var _dpDirectConfirmBody = Object.assign({}, checkoutPayload, {
        merchantUid: merchantUid,
        amount: orderAmount,
        paymentAmount: orderAmount,
        coinPrice: Number(order.coinPrice || coinPrice),
        paymentType: 'digital_content',
        paymentMode: 'DIRECT_KRW',
        provider: 'PORTONE_V2',
        pg: 'KG_INICIS',
        paymentMethod: 'card_general',
      });

      // [regression-guard] No wait overlay before the PG window opens. This used to raise an
      // "opening the payment window" overlay and close it one line later, so users saw only
      // the waiting screen. Wait UI belongs after requestPayment returns.
      // \uC911\uAC04 \uBA54\uC2DC\uC9C0("\uC5F4\uB9B0 \uACB0\uC81C\uCC3D\uC5D0\uC11C \uCE74\uB4DC \uC778\uC99D\uC744\u2026")\uB294 \uBC14\uB85C \uC544\uB798\uC5D0\uC11C \uC624\uBC84\uB808\uC774\uB97C \uB2EB\uC544 \uC2E4\uC81C\uB85C \uBCF4\uC774\uC9C0 \uC54A\uB294\uB370
      // \uD504\uB808\uC784\uB9CC \uD55C \uBC88 \uB354 \uBA39\uC5C8\uB2E4 \u2014 \uC81C\uAC70\uD588\uB2E4. \uC624\uBC84\uB808\uC774 \uD574\uC81C\uC640 requestPayment \uC0AC\uC774\uC5D0\uB294 \uC544\uBB34\uAC83\uB3C4 \uB450\uC9C0 \uC54A\uB294\uB2E4
      // (\uD55C \uD504\uB808\uC784\uC774\uB77C\uB3C4 \uB07C\uC6B0\uBA74 user-gesture \uC18C\uBA78\uC5D0 \uB354 \uAC00\uAE4C\uC6CC\uC9C4\uB2E4. verify:paid-gate-ui \uAC00 \uC774 \uC21C\uC11C\uB97C \uACE0\uC815\uD55C\uB2E4).
      // PG가 상위 프레임을 리다이렉트하면 아래 await 는 페이지와 함께 죽는다. 그 경우에도 결제를 확정할
      // 수 있도록 복귀 티켓을 미리 남긴다(_dpResumeDirectPaymentAfterRedirect 가 소비).
      _dpWriteDirectResumeTicket({ at: Date.now(), merchantUid: merchantUid, confirmBody: _dpDirectConfirmBody });

      // PG의 상위 프레임 리다이렉트는 의도된 이동이다 — PaymentProcessingContext 의 beforeunload
      // 차단이 그걸 막지 않도록 이 구간만 예외로 표시한다.
      window.__cdSuppressPaymentUnloadBlock = true;
      _dpSetPaymentPending(false);
      var rsp = await window.PortOne.requestPayment(requestData);
      window.__cdSuppressPaymentUnloadBlock = false;
      var paymentId = String((rsp && rsp.paymentId) || merchantUid || '').trim();
      if (!rsp || rsp.code || !paymentId) {
        // 승인 자체가 나지 않았으니 복귀 티켓은 의미가 없다 — 여기서만 회수한다.
        _dpClearDirectResumeTicket();
        var dpRspCode = String((rsp && rsp.code) || '').trim();
        if (!_dpIsPortOneUserCancelCode(dpRspCode)) {
          try {
            console.error('[dp-direct-checkout] PortOne requestPayment failed', {
              code: dpRspCode,
              message: String((rsp && rsp.message) || ''),
              paymentId: merchantUid,
              orderName: requestData.orderName,
              orderNameBytes: (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(String(requestData.orderName || '')).length : -1,
              totalAmount: requestData.totalAmount
            });
          } catch (_dpLogErr) {}
        }
        throw new Error(String((rsp && rsp.message) || dpRspCode || '결제가 완료되지 않았습니다.'));
      }

      _dpSetPaymentPending(true, '\uB2E8\uAC74 \uACB0\uC81C \uC2B9\uC778\uACFC \uCF58\uD150\uCE20 \uC774\uC6A9 \uAD8C\uD55C\uC744 \uD655\uC778\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.', 'confirm');

      // 🔴 복귀 티켓은 confirm 이 성공한 뒤에 지운다. 예전에는 requestPayment 반환 직후 지워서,
      // 카드 승인은 났는데 confirm 이 5xx 로 죽으면 복구 수단이 통째로 사라졌다(돈은 나가고 지급은 안 됨).
      // confirm 5xx/네트워크 장애는 자동 POST 재시도하지 않는다. 복귀 티켓을 유지해
      // 동일 주문의 명시적 복구만 허용하고 새 결제를 유도하지 않는다.
      var dpConfirmBody = JSON.stringify(Object.assign({}, _dpDirectConfirmBody, {
        impUid: paymentId,
        paymentId: paymentId,
      }));
      var confirmRes = await _dpPaymentFetchJson('/api/billing/confirm', { method: 'POST', body: dpConfirmBody });
      if (!confirmRes.ok) throw new Error(_dpReadBillingMessage(confirmRes.payload, '결제 검증에 실패했습니다.'));
      // 확정됐으니 이제 복귀 티켓을 회수한다.
      _dpClearDirectResumeTicket();
      // \uB2E8\uAC74 \uACB0\uC81C \uC644\uB8CC \uD504\uB808\uC784(\uC81C\uBAA9 "\uACB0\uC81C \uC644\uB8CC"\u00B7\uC2A4\uD53C\uB108 off) \uD45C\uC2DC \uD6C4 ~1.2s \uC790\uB3D9 \uB2EB\uD798. \uC774\uD6C4 \uCF58\uD150\uCE20 \uC0DD\uC131\uC740 \uBCD1\uB82C \uC9C4\uD589.
      _dpShowPaymentCompleteOverlay(_dpText('paymentCompleteOverlay'));
      await _dpWaitForPaymentOverlayPaint();
      return confirmRes.payload;
    };
  }

  if (typeof window._cdRunDirectKrwCheckout === 'function' && window._cdRunDirectKrwCheckout.__cdSinglePaymentGuard !== true) {
    var _dpRunDirectKrwCheckoutCore = window._cdRunDirectKrwCheckout;
    var _dpRunDirectKrwCheckoutGuarded = function(options) {
      var opts = options || {};
      var coinPrice = Math.max(0, Math.floor(Number(opts.coinPrice || opts.cost || 0)));
      var amountKrw = Math.max(0, Math.floor(Number(opts.amountKrw || opts.amountKRW || opts.paymentAmount || opts.amount || (coinPrice * 100))));
      var title = String(opts.title || opts.reason || '').trim();
      var key = _dpBuildPaidServiceSingleFlightKey(opts, title, coinPrice, amountKrw);
      return _dpJoinPaidServiceSingleFlight('__cdDirectKrwCheckoutInFlight', key, 60000, function() {
        // 실패로 끝나도 '단건 결제창 준비 중' 오버레이가 남지 않게 여기 한 곳에서 정리한다.
        // core 본문에는 outer try/finally 가 없어(결제 준비 실패·PortOne 설정 누락·이메일/번호 누락 등)
        // 준비 구간에서 던지면 스피너가 그대로 멈춘 채 PG창도 안 뜬 화면이 된다. 셸의
        // _cdRunDirectKrwCheckout 래퍼(index.html)와 같은 자리·같은 방식으로 맞춘다.
        // 정상 경로는 PG창 직전에 이미 내려가 있으므로 무해하다.
        return Promise.resolve(_dpRunDirectKrwCheckoutCore(opts)).catch(function(_dpDirectCheckoutError) {
          _dpSetPaymentPending(false);
          throw _dpDirectCheckoutError;
        });
      });
    };
    _dpRunDirectKrwCheckoutGuarded.__cdSinglePaymentGuard = true;
    window._cdRunDirectKrwCheckout = _dpRunDirectKrwCheckoutGuarded;
  }

  if (typeof window._cdOpenPaidServiceGate === 'function' && window._cdOpenPaidServiceGate.__cdSinglePaymentGuard !== true) {
    var _dpOpenPaidServiceGateCore = window._cdOpenPaidServiceGate;
    var _dpOpenPaidServiceGateGuarded = function(options) {
      var opts = options || {};
      var title = String(opts.title || opts.reason || '').trim();
      var coinPrice = Math.max(0, Math.floor(Number(opts.coinPrice || opts.cost || 0)));
      var amountKrw = Math.max(0, Math.floor(Number(opts.amountKrw || opts.amountKRW || opts.paymentAmount || opts.amount || (coinPrice * 100))));
      var key = _dpBuildPaidServiceSingleFlightKey(opts, title, coinPrice, amountKrw);
      var service = window.CodeDestinyPaymentService;
      if (service && typeof service.executePayment === 'function') {
        return service.executePayment({
          method: String(opts.paymentMode || 'PAYMENT_GATE'),
          requestId: String(opts.requestId || key),
          productId: String(opts.productId || ''),
          featureKey: String(opts.featureKey || opts.subFeatureKey || opts.categoryKey || ''),
          profileId: String(opts.profileId || opts.selectedProfileId || '')
        }, function() {
          return _dpOpenPaidServiceGateCore(opts);
        });
      }
      return _dpJoinPaidServiceSingleFlight('__cdPaidServiceGateInFlight', key, 45000, function() {
        return _dpOpenPaidServiceGateCore(opts);
      });
    };
    _dpOpenPaidServiceGateGuarded.__cdSinglePaymentGuard = true;
    _dpOpenPaidServiceGateGuarded.__cdPaymentServiceBoundary = true;
    window._cdOpenPaidServiceGate = _dpOpenPaidServiceGateGuarded;
  }

  function _dpEmitPaymentSuccess(transactionId, payload, options, featureKey, requestId) {
    var service = window.CodeDestinyPaymentService;
    if (!service || typeof service.reducePaymentSuccess !== 'function') return;
    var data = payload && payload.data && typeof payload.data === 'object' ? payload.data : (payload || {});
    var accessGrant = data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    var consume = data.consume && typeof data.consume === 'object' ? data.consume : {};
    var operationId = String(accessGrant.operationId || accessGrant.evidenceId || transactionId || consume.transactionId || data.transactionId || data.paymentId || '').trim();
    var normalizedRequestId = String(accessGrant.requestId || consume.requestId || data.requestId || requestId || operationId).trim();
    if (!operationId || !normalizedRequestId) return;
    var normalizedFeatureKey = String(featureKey || accessGrant.featureKey || data.featureKey || '').trim();
    var unlockMap = data.unlockMap && typeof data.unlockMap === 'object' ? data.unlockMap : {};
    if (normalizedFeatureKey && !Object.keys(unlockMap).length) unlockMap[normalizedFeatureKey] = true;
    service.reducePaymentSuccess({
      operationId: operationId,
      requestId: normalizedRequestId,
      productId: String(options && options.productId || data.productId || ''),
      featureKey: normalizedFeatureKey,
      profileId: String(options && (options.profileId || options.selectedProfileId) || accessGrant.profileId || data.profileId || ''),
      method: String(accessGrant.accessMethod || consume.accessMethod || data.paymentMode || data.paymentMethod || ''),
      accessGrant: accessGrant,
      unlockMap: unlockMap,
      monthlyBalance: data.monthlyStoneBalance != null ? data.monthlyStoneBalance : data.membershipCreditBalance,
      snapshotPatch: data.snapshotPatch && typeof data.snapshotPatch === 'object' ? data.snapshotPatch : {},
      completedAt: String(data.completedAt || data.paidAt || '')
    });
  }

  window._cdCoinGatePerUse = function(cost, reason, cb, onCancel, options) {
    if (!options && onCancel && typeof onCancel === 'object' && typeof cb === 'function') {
      options = onCancel;
      onCancel = undefined;
    }
    var optionBag = (options && typeof options === 'object') ? options : {};
    var normalizedFeatureKey = _dpResolvePaidGateFeatureKey(optionBag, reason);
    var now = Date.now();
    var lockAt = Number(window.__cdCoinGatePerUseLockAt || 0);
    var lockAgeMs = lockAt > 0 ? (now - lockAt) : 0;
    var isStaleLock = !lockAt || lockAgeMs > 45000;

    // 중복 실행 방지: 이전 fetch가 진행 중이면 차단
    if (window._cdCoinGatePerUseInFlight) {
      if (isStaleLock) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        window.alert('이전 결제 상태를 복구했습니다. 다시 시도해 주세요.');
      } else {
      window.alert('이전 결제 처리 중입니다. 잠시 후 다시 시도해 주세요.');
      }
      if (typeof onCancel === 'function') onCancel();
      return;
    }

    var dedupeKey = normalizedFeatureKey + '|' + String(reason || '') + '|' + String(cost || 0);
    var dedupeMap = window.__cdCoinGatePromptDedup || (window.__cdCoinGatePromptDedup = {});
    // ⚠️ Dedup 타임아웃을 2.5초로 증가 (우회 시간 제거)
    if (dedupeMap[dedupeKey] && (now - dedupeMap[dedupeKey] < 2500)) {
      if (typeof onCancel === 'function') onCancel();
      return;
    }
    dedupeMap[dedupeKey] = now;

    if (_cdIsAdminLikeUser()) {
      if (typeof cb === 'function') cb();
      return;
    }

    var gateGrantedDelivered = false;
    function deliverGateGrant(transactionId, payload) {
      gateGrantedDelivered = true;
      _dpEmitPaymentSuccess(transactionId, payload, optionBag, normalizedFeatureKey, requestId);
      if (typeof cb === 'function') cb(String(transactionId || requestId), payload || {});
    }

    if (typeof window._cdOpenPaidServiceGate === 'function') {
      return window._cdOpenPaidServiceGate({
        title: reason,
        reason: reason,
        coinPrice: cost,
        cost: cost,
        featureKey: normalizedFeatureKey,
        requestId: requestId,
        categoryKey: optionBag.categoryKey,
        subFeatureKey: optionBag.subFeatureKey,
        contentKey: optionBag.contentKey,
        productId: optionBag.productId,
        reportType: optionBag.reportType,
        serviceKey: optionBag.serviceKey,
        reportId: optionBag.reportId,
        sessionId: optionBag.sessionId,
        reportSessionId: optionBag.reportSessionId || optionBag.sessionId,
        purchaseId: optionBag.purchaseId,
        actionType: optionBag.actionType,
        profileAction: optionBag.profileAction,
        action: optionBag.action,
        profileId: optionBag.profileId,
        selectedProfileId: optionBag.selectedProfileId,
        amountKrw: optionBag.amountKrw,
        membershipCreditCost: optionBag.membershipCreditCost,
        allowedPaymentModes: optionBag.allowedPaymentModes,
        disablePassFirst: optionBag.disablePassFirst,
        disablePassChoice: optionBag.disablePassChoice,
        onGranted: function(transactionId, payload) {
          deliverGateGrant(transactionId, payload);
        },
        onCancel: onCancel
      }).then(function(result) {
        if (result && result.status === 'granted' && !gateGrantedDelivered) {
          deliverGateGrant(result.transactionId, result.payload || result);
        } else if (result && result.status === 'cancelled' && result.reason === 'pass_applied_in_modal' && !gateGrantedDelivered) {
          deliverGateGrant(requestId, { __cdPassGateResolved: true, requestId: requestId, featureKey: normalizedFeatureKey });
        }
        return result;
      }).catch(function(error) {
        console.error('[legacy-main-paid-service-gate]', error);
        var gateMessage = String(error && error.message || '\uACB0\uC81C\uB97C \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
        var gateCode = String(error && error.code || '').toUpperCase();
        if (gateCode === 'AUTH_STATUS_TEMPORARILY_UNAVAILABLE' || gateCode === 'AUTH_DB_UNAVAILABLE' || gateCode === 'AUTH_REFRESH_TEMPORARY_FAILURE') {
          gateMessage = '로그아웃되지 않았어요. 이용권 확인이 잠시 지연되고 있으니 잠시 후 다시 시도해 주세요.';
        } else if (Number(error && error.status || 0) >= 500 || gateCode.indexOf('SERVICE_UNAVAILABLE') >= 0 || gateMessage.toLowerCase().indexOf('database is temporarily unavailable') >= 0) {
          gateMessage = '이용권 확인 서버 연결을 일시적으로 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
        }
        window.alert(gateMessage);
        if (typeof onCancel === 'function') onCancel(error);
        return null;
      });
    }
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch(_) {}
    var balance = 0;
    var hasBalanceSnapshot = false;
    try {
      var _u2 = JSON.parse(localStorage.getItem('fortune_auth_user') || 'null');
      if (_u2 && typeof _u2.points === 'number') {
        balance = Number(_u2.points) || 0;
        hasBalanceSnapshot = true;
      }
    } catch(_) {}
    var balanceLabel = hasBalanceSnapshot ? ((Number(balance) * 100).toLocaleString('ko-KR') + '원') : '알 수 없음';
    var membershipCoverage = _dpReadActiveMembershipCoverage(cost);
    if (!membershipCoverage) {
      if (typeof window._cdResolvePaidContentAccess === 'function' && optionBag.disablePassFirst !== true && optionBag.disablePassChoice !== true) {
        return window._cdResolvePaidContentAccess({
          title: reason,
          reason: reason,
          coinPrice: cost,
          cost: cost,
          featureKey: normalizedFeatureKey || undefined,
          requestId: requestId,
          reportType: optionBag.reportType,
          serviceKey: optionBag.serviceKey,
          actionType: optionBag.actionType,
          profileAction: optionBag.profileAction,
          action: optionBag.action,
          profileId: optionBag.profileId,
          selectedProfileId: optionBag.selectedProfileId,
          // 셸 메인 게이트와 같은 근거(_cdCoverageFromSubscriptionSnapshot)로 즉시 판정한다. 이 진입점만
          // 빠져 있어 이용권 유무가 이미 확정된 사용자도 서버 왕복을 기다렸다.
          allowSnapshotFastPath: true
        }).then(function(access) {
          if (access && (access.status === 'already_unlocked' || access.status === 'pass_applied')) {
            var passPayload = access.payload || access.rawPayload || {};
            try { passPayload.__cdPassGateResolved = true; } catch (_) {}
            var passTransactionId = String(passPayload.transactionId || passPayload.paymentId || passPayload.purchaseId || passPayload.requestId || access.requestId || requestId);
            if (typeof cb === 'function') cb(passTransactionId, passPayload);
            return passPayload;
          }
          if (access && access.status === 'error') {
            window.alert(access.message || '이용권 확인에 실패했습니다.');
            if (typeof onCancel === 'function') onCancel(access);
            return null;
          }
          // 🔴 예전에는 여기서 alert 도 onCancel 도 없이 return null 이라, 결제 모듈 미로드 시
          // 클릭이 완전 무음으로 먹혔다("아무 일도 안 일어남"의 두 원인 중 하나).
          if (typeof window._cdChooseServicePaymentMode !== 'function' || typeof window._cdRunDirectKrwCheckout !== 'function') {
            try { window.alert('결제 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'); } catch (_dpChoiceMissingAlertErr) {}
            if (typeof onCancel === 'function') onCancel();
            return null;
          }
          return window._cdChooseServicePaymentMode({
            title: reason,
            coinPrice: cost,
            cost: cost,
            amountKrw: Number(cost || 0) * 100,
            reason: reason,
            featureKey: normalizedFeatureKey || undefined,
            reportType: optionBag.reportType,
            serviceKey: optionBag.serviceKey,
            actionType: optionBag.actionType,
            profileAction: optionBag.profileAction,
            action: optionBag.action,
            profileId: optionBag.profileId,
            selectedProfileId: optionBag.selectedProfileId,
            amountKrw: optionBag.amountKrw,
            membershipCreditCost: optionBag.membershipCreditCost,
            allowedPaymentModes: optionBag.allowedPaymentModes,
            disablePassFirst: optionBag.disablePassFirst,
            disablePassChoice: optionBag.disablePassChoice
          }).then(function(choice) {
            if ((choice === 'pass' || choice === 'pass_applied') && optionBag.disablePassChoice !== true) {
              if (typeof cb === 'function') cb(requestId, { __cdPassGateResolved: true, requestId: requestId });
              return { __cdPassGateResolved: true, requestId: requestId };
            }
            if (choice === 'monthly') {
              window._cdCoinGatePerUseInFlight = true;
              window.__cdCoinGatePerUseLockAt = Date.now();
              _dpSetPaymentPending(true, '결제 권한을 확인하고 있습니다.', 'monthly');
              return _dpRunMonthlyCreditFromMainGate({
                title: reason,
                reason: reason,
                coinPrice: cost,
                cost: cost,
                featureKey: normalizedFeatureKey || undefined,
                requestId: requestId,
                reportType: optionBag.reportType,
                serviceKey: optionBag.serviceKey,
                actionType: optionBag.actionType,
                profileAction: optionBag.profileAction,
                action: optionBag.action,
                profileId: optionBag.profileId,
                selectedProfileId: optionBag.selectedProfileId
              });
            }
            if (choice !== 'direct') {
              if (typeof onCancel === 'function') onCancel();
              return null;
            }
            window._cdCoinGatePerUseInFlight = true;
            window.__cdCoinGatePerUseLockAt = Date.now();
            // 🔴 PG창이 열리기 전에는 어떤 대기 UI도 켜지 않는다. 예전에는 여기서 '단건 결제를 진행
            // 중입니다' 오버레이를 띄웠고, 사용자에게는 결제수단을 고른 뒤 또 한 겹 로딩이 끼는 것으로 보였다.
            // _cdRunDirectKrwCheckout 이 진입 시점부터 PG 오픈까지 억제 창을 걸고 스스로 오버레이를 내린다.
            return window._cdRunDirectKrwCheckout({
              coinPrice: cost,
              cost: cost,
              title: reason,
              reason: reason,
              featureKey: normalizedFeatureKey || undefined,
              requestId: requestId,
              forceDirectPayment: true,
              internalMainGate: true,
              __cdPaymentGateAuthorized: true,
              checkoutPayload: {
                paymentMode: 'DIRECT_KRW',
                reportType: optionBag.reportType,
                serviceKey: optionBag.serviceKey,
                actionType: optionBag.actionType,
                profileAction: optionBag.profileAction,
                action: optionBag.action,
                profileId: optionBag.profileId,
                selectedProfileId: optionBag.selectedProfileId
              },
            });
          });
        }).then(function(payload) {
          if (!payload) return null;
          if (payload && (payload.__cdPassGateResolved === true || payload.freeBySubscription === true || String(payload.accessType || payload.transactionType || '').toLowerCase() === 'membership_pass')) return payload;
          window._cdCoinGatePerUseInFlight = false;
          window.__cdCoinGatePerUseLockAt = 0;
          _dpSetPaymentPending(false);
          var txId = String((payload && (payload.transactionId || payload.paymentId || payload.purchaseId || payload.requestId)) || requestId);
          if (typeof cb === 'function') cb(txId, payload || {});
          return payload;
        }).catch(function(error) {
          window._cdCoinGatePerUseInFlight = false;
          window.__cdCoinGatePerUseLockAt = 0;
          _dpSetPaymentPending(false);
          console.error('[coin-gate-per-use-pass-first]', error);
          window.alert(String(error && error.message || '결제를 완료하지 못했습니다. 결제 수단을 확인하고 다시 시도해 주세요.'));
          if (typeof onCancel === 'function') onCancel(error);
          return null;
        });
      }
      if (typeof window._cdChooseServicePaymentMode === 'function' && typeof window._cdRunDirectKrwCheckout === 'function') {
        return window._cdChooseServicePaymentMode({
          title: reason,
          coinPrice: cost,
          cost: cost,
          amountKrw: Number(cost || 0) * 100,
          reason: reason,
          featureKey: normalizedFeatureKey || undefined,
          membershipCreditCost: optionBag.membershipCreditCost,
          allowedPaymentModes: optionBag.allowedPaymentModes,
          disablePassFirst: optionBag.disablePassFirst,
          disablePassChoice: optionBag.disablePassChoice,
          }).then(function(choice) {
          if ((choice === 'pass' || choice === 'pass_applied') && optionBag.disablePassChoice !== true) {
            if (typeof cb === 'function') cb(String(optionBag.requestId || ''), { __cdPassGateResolved: true });
            return null;
          }
          if (choice === 'monthly') {
            window._cdCoinGatePerUseInFlight = true;
            window.__cdCoinGatePerUseLockAt = Date.now();
            _dpSetPaymentPending(true, '결제 권한을 확인하고 있습니다.', 'monthly');
            return _dpRunMonthlyCreditFromMainGate({
              title: reason,
              reason: reason,
              coinPrice: cost,
              cost: cost,
              featureKey: normalizedFeatureKey || undefined,
              requestId: String(optionBag.requestId || '').trim().slice(0, 120) || undefined
            }).then(function(payload) {
              window._cdCoinGatePerUseInFlight = false;
              window.__cdCoinGatePerUseLockAt = 0;
              _dpSetPaymentPending(false);
              var txId = String((payload && (payload.transactionId || payload.paymentId || payload.purchaseId || payload.requestId)) || '');
              if (typeof cb === 'function') cb(txId, payload || {});
              return payload;
            });
          }
          if (choice !== 'direct') {
            if (typeof onCancel === 'function') onCancel();
            return null;
          }
          window._cdCoinGatePerUseInFlight = true;
          window.__cdCoinGatePerUseLockAt = Date.now();
          // 🔴 PG창이 열리기 전에는 어떤 대기 UI도 켜지 않는다. 예전에는 여기서 '단건 결제를 진행
          // 중입니다' 오버레이를 띄웠고, 사용자에게는 결제수단을 고른 뒤 또 한 겹 로딩이 끼는 것으로 보였다.
          // _cdRunDirectKrwCheckout 이 진입 시점부터 PG 오픈까지 억제 창을 걸고 스스로 오버레이를 내린다.
          return window._cdRunDirectKrwCheckout({
            coinPrice: cost,
            cost: cost,
            title: reason,
            reason: reason,
            featureKey: normalizedFeatureKey || undefined,
            requestId: String(optionBag.requestId || '').trim().slice(0, 120) || undefined,
            forceDirectPayment: true,
            internalMainGate: true,
            __cdPaymentGateAuthorized: true,
            checkoutPayload: {
              paymentMode: 'DIRECT_KRW',
            },
          }).then(function(payload) {
            window._cdCoinGatePerUseInFlight = false;
            window.__cdCoinGatePerUseLockAt = 0;
            _dpSetPaymentPending(false);
            var txId = String((payload && (payload.transactionId || payload.paymentId || payload.purchaseId || payload.requestId)) || '');
            if (typeof cb === 'function') cb(txId, payload || {});
            return payload;
          });
        }).catch(function(error) {
          window._cdCoinGatePerUseInFlight = false;
          window.__cdCoinGatePerUseLockAt = 0;
          _dpSetPaymentPending(false);
          window.alert(String(error && error.message || '단건 결제를 완료하지 못했습니다. 결제 수단을 확인한 뒤 다시 시도해 주세요.'));
          if (typeof onCancel === 'function') onCancel(error);
        });
      }
    }

    window._cdCoinGatePerUseInFlight = false;
    window.__cdCoinGatePerUseLockAt = 0;
    _dpSetPaymentPending(false);
    window.alert('\uACB0\uC81C \uAC8C\uC774\uD2B8\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC0C8\uB85C\uACE0\uCE68 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.');
    if (typeof onCancel === 'function') onCancel();
    return;

    var consumeHeaders = { 'Content-Type': 'application/json' };
    if (token) consumeHeaders.Authorization = 'Bearer ' + token;
    window._cdCoinGatePerUseInFlight = true;
    window.__cdCoinGatePerUseLockAt = Date.now();
    var pendingLabel = String(reason || '').trim() || '유료 서비스';
    // coin-gate 는 "이용권으로 커버되는가"를 판정하는 접근 확인 단계다 — mode 를 빼먹으면 셸 기본값
    // 'payment' 로 낙하해 'PAYMENT CHECK · 결제 상태 확인 중' 스킨이 뜬다(아직 결제는 시작도 안 했다).
    _dpSetPaymentPending(true, pendingLabel + (membershipCoverage ? ' 이용권 한도를 확인하는 중입니다...' : ' 단건 결제를 확인하는 중입니다...'), 'pass');
    _dpWaitForPaymentOverlayPaint().then(function() {
      return _dpFetchJsonWithFallback('/api/billing/coin-gate', {
        method: 'POST',
        headers: consumeHeaders,
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ cost: cost, reason: reason, featureKey: normalizedFeatureKey, requestId: requestId })
      }, {
        retryOn401: true,
        timeoutMs: _DP_FETCH_TIMEOUT_MS,
      });
    })
    .then(function(res) {
      window._cdCoinGatePerUseInFlight = false;
      window.__cdCoinGatePerUseLockAt = 0;
      _dpSetPaymentPending(false);
      if (_dpIsAuthRequiredResult(res)) {
        if (typeof window.__cdOpenLoginRequiredModal === 'function') {
          window.__cdOpenLoginRequiredModal({
            reason: '로그인 후 이용할 수 있는 기능입니다.',
            redirectTo: window.location.pathname + window.location.search + window.location.hash,
          });
        }
        if (typeof onCancel === 'function') onCancel();
        return;
      }
      if (res.status === 402 || !res.ok) {
        var rawFailData = (res && res.data && typeof res.data === 'object') ? res.data : {};
        var failData = (rawFailData.data && typeof rawFailData.data === 'object') ? rawFailData.data : rawFailData;
        var msg = rawFailData.message || failData.message || '단건 결제가 필요합니다.';
        if (res.status === 402) msg = msg + '\n\n단건 결제 기준: 5,000원\n포트원 V2 KG이니시스 결제로 진행됩니다.';
        if (typeof window.__cdOpenChargeModal === 'function') { window.alert(msg); window.__cdOpenChargeModal(); }
        else window.location.href = '/points';
        if (typeof onCancel === 'function') onCancel();
        return;
      }
      var rawData = (res && res.data && typeof res.data === 'object') ? res.data : {};
      var data = (rawData.data && typeof rawData.data === 'object') ? rawData.data : rawData;
      var consumeData = (data && data.consume && typeof data.consume === 'object') ? data.consume : {};
      var accessGrant = (data && data.accessGrant && typeof data.accessGrant === 'object') ? data.accessGrant : {};
      if (!data.message && rawData.message) data.message = rawData.message;
      var chargedCoins = Number((data && data.chargedCoins) || consumeData.chargedCoins || 0);
      var freeBySubscription = Boolean((data && data.freeBySubscription === true) || consumeData.accessType === 'membership_pass' || consumeData.transactionType === 'membership_pass');
      var transactionId = data && data.transactionId ? String(data.transactionId) : String(consumeData.transactionId || accessGrant.evidenceId || accessGrant.purchaseId || accessGrant.requestId || '');
      var requestedCost = Number(cost || 0);
      var coinGateConfirmed = Number(res.status || 0) === 200
        && data
        && data.ok !== false
        && (requestedCost <= 0 || freeBySubscription || chargedCoins > 0 || transactionId);
      if (!coinGateConfirmed) {
        var failMsg = String((data && data.message) || '원화 결제 확인값이 부족하여 생성을 시작하지 않았습니다. 다시 시도해 주세요.');
        window.alert(failMsg);
        if (typeof onCancel === 'function') onCancel();
        return;
      }
      var nb = null;
      if (data && data.user && typeof data.user.points === 'number') nb = data.user.points;
      else if (data && typeof data.remainingPoints === 'number') nb = data.remainingPoints;
      else if (data && typeof data.balance === 'number') nb = data.balance;
      else if (freeBySubscription && hasBalanceSnapshot) nb = balance;
      else if (hasBalanceSnapshot) nb = Math.max(0, balance - cost);
      if (!Number.isFinite(Number(nb))) nb = _dpGetUserBalance();
      try { var _u3 = JSON.parse(localStorage.getItem('fortune_auth_user') || 'null') || {}; _u3.points = nb; _dpWriteAuthUser(_u3); } catch(_) {}
      if (typeof window.__cdSetGoldenBalance === 'function') window.__cdSetGoldenBalance(nb);
      if (freeBySubscription) {
        _cdShowSubscriptionShieldNotice({
          message: data.message,
          subscriptionTier: data.subscriptionTier,
          freeLimit: data.freeLimit,
          requiredCoins: requestedCost,
        });
      } else if (chargedCoins > 0) {
        _cdShowCoinDeductNotice(chargedCoins, nb, reason);
      }
      cb(transactionId, data);
    })
    .catch(function(e) { window._cdCoinGatePerUseInFlight = false; window.__cdCoinGatePerUseLockAt = 0; _dpSetPaymentPending(false); console.error('[coin-gate-per-use]', e); window.alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'); if (typeof onCancel === 'function') onCancel(); });
  };

  function _dpGetAuthToken() {
    return _dpReadStoredAuthToken();
  }

  function _dpGetUserBalance() {
    try {
      var raw = localStorage.getItem('fortune_auth_user');
      if (!raw) return 0;
      var u = JSON.parse(raw);
      return Number(u && u.points) || 0;
    } catch (e) { return 0; }
  }

  function _dpSaveUserBalance(newBalance) {
    try {
      var raw = localStorage.getItem('fortune_auth_user');
      var u = (raw && JSON.parse(raw)) || {};
      u.points = Number(newBalance);
      _dpWriteAuthUser(u);
    } catch (e) {}
  }
  function _dpGetUserPlan() {
    try {
      var raw = localStorage.getItem('fortune_auth_user');
      var u = raw && JSON.parse(raw);
      return (u && u.plan) ? String(u.plan) : '';
    } catch (e) { return ''; }
  }

  function _dpNormalizeTier(tierRaw) {
    var tier = String(tierRaw || '').trim().toLowerCase();
    if (tier === 'vip') tier = 'vvip';
    if (tier === 'unlimited') tier = 'vvip';
    if (tier === 'pro') tier = 'premium';
    if (tier === 'basic') tier = 'standard';
    if (tier.indexOf('family') >= 0) tier = 'family';
    if (tier !== 'standard' && tier !== 'premium' && tier !== 'vvip' && tier !== 'family') tier = 'free';
    return tier;
  }

  function _dpGetTierProfileLimit(tierRaw) {
    var tier = _dpNormalizeTier(tierRaw);
    if (tier === 'standard') return 3;
    if (tier === 'premium') return 7;
    if (tier === 'vvip') return 15;
    if (tier === 'family') return 0;
    return 1;
  }

  function _dpGetTierLabel(tierRaw) {
    var tier = _dpNormalizeTier(tierRaw);
    if (tier === 'standard') return '스탠다드';
    if (tier === 'premium') return '프리미엄';
    if (tier === 'vvip') return 'VVIP';
    if (tier === 'family') return '패밀리';
    return '무료';
  }

  function _dpGetNextTier(tierRaw) {
    var tier = _dpNormalizeTier(tierRaw);
    if (tier === 'free') return 'standard';
    if (tier === 'standard') return 'premium';
    if (tier === 'premium') return 'vvip';
    if (tier === 'vvip') return 'family';
    return '';
  }

  function _dpFormatLimitLabel(limit) {
    var n = Number(limit);
    if (!isFinite(n) || n <= 0) return '무제한';
    return String(Math.floor(n)) + '개';
  }

  function _dpReadProfileLimitValue(source) {
    if (!source || typeof source !== 'object') return NaN;
    var keys = ['profileLimit', 'maxProfileLimit', 'profileCardLimit', 'maxProfiles'];
    for (var i = 0; i < keys.length; i += 1) {
      if (!Object.prototype.hasOwnProperty.call(source, keys[i])) continue;
      var n = Number(source[keys[i]]);
      if (isFinite(n) && n >= 0) return Math.floor(n);
    }
    return NaN;
  }

  function _dpResolveProfileLimit(tierRaw, valueRaw) {
    var tier = _dpNormalizeTier(tierRaw);
    if (tier === 'family') return 0;
    var n = Number(valueRaw);
    if (isFinite(n) && n > 0) return Math.floor(n);
    return _dpGetTierProfileLimit(tier);
  }

  function _dpIsUnlimitedProfileLimit(maxProfiles) {
    var n = Number(maxProfiles);
    return isFinite(n) && n <= 0;
  }

  function _dpGetPositiveProfileLimit(maxProfiles) {
    var n = Number(maxProfiles);
    return (isFinite(n) && n > 0) ? Math.max(1, Math.floor(n)) : 1;
  }

  function _dpCanUseProfileSlot(profileCount, maxProfiles) {
    if (_dpIsUnlimitedProfileLimit(maxProfiles)) return true;
    var count = Math.max(0, Math.floor(Number(profileCount || 0)));
    return count < _dpGetPositiveProfileLimit(maxProfiles);
  }

  function _dpGetProfileLimitSlotLabel(profileCount, maxProfiles) {
    var count = Math.max(0, Math.floor(Number(profileCount || 0)));
    return count + '/' + (_dpIsUnlimitedProfileLimit(maxProfiles) ? '무제한' : _dpGetPositiveProfileLimit(maxProfiles));
  }

  /**
   * 프로필 카드 모달 유료 잠금 게이트
   * 이미 해금됐거나 관리자/프리미엄이면 cb() 즉시 호출,
   * 아닌 경우 결제 확인 → 권한 저장 → cb()
   */
  function _dpGateLockFeature(type, cb) {
    var info = _DP_FEATURE_LOCKS[type];
    if (!info) { cb(); return; }
    if (!_dpIsFeatureLocked(info.key)) { cb(); return; }

    if (_cdIsAdminLikeUser()) { cb(); return; }

    var token = _dpGetAuthToken();
    var unlockProductId = _DP_UNLOCK_PRODUCT_BY_FEATURE_KEY[info.key] || '';
    var unlockRequestId = 'unlock-' + (unlockProductId || info.key) + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    if (typeof window._cdChooseServicePaymentMode === 'function') {
      window._cdChooseServicePaymentMode({
        title: info.name + ' 영구 해금',
        reason: info.name + ' ?곴뎄 ?닿툑',
        coinPrice: info.cost,
        cost: info.cost,
        featureKey: info.key,
        productId: unlockProductId,
        requestId: unlockRequestId,
      }).then(function(choice) {
        if (choice === 'pass' || choice === 'pass_applied') {
          _dpSaveFeatureUnlock(info.key);
          if (info.extraUnlockKeys) { for (var _ekPassI = 0; _ekPassI < info.extraUnlockKeys.length; _ekPassI++) _dpSaveFeatureUnlock(info.extraUnlockKeys[_ekPassI]); }
          cb(unlockRequestId);
          return;
        }
        if (choice === 'monthly') {
          runFeatureUnlock();
          return;
        }
        if (choice === 'direct' && typeof window._cdRunDirectKrwCheckout === 'function') {
          // 바로 아래에서 PG창을 여는 구간이므로 'card'(= "PG사 결제창을 로드하는 중입니다.")를 쓴다.
          _dpSetPaymentPending(true, info.name + ' 단건 결제를 준비하는 중입니다...', 'card');
          window._cdRunDirectKrwCheckout({
            coinPrice: info.cost,
            cost: info.cost,
            title: info.name + ' 영구 해금',
            reason: info.name + ' 영구 해금',
            featureKey: info.key,
            productId: unlockProductId,
            requestId: unlockRequestId,
            forceDirectPayment: true,
            internalMainGate: true,
            __cdPaymentGateAuthorized: true,
            checkoutPayload: {
              productId: unlockProductId,
              paymentMode: 'DIRECT_KRW'
            }
          }).then(function(payload) {
            _dpSetPaymentPending(false);
            _dpSaveFeatureUnlock(info.key);
            if (info.extraUnlockKeys) { for (var _ekI = 0; _ekI < info.extraUnlockKeys.length; _ekI++) _dpSaveFeatureUnlock(info.extraUnlockKeys[_ekI]); }
            cb(payload && (payload.transactionId || payload.paymentId || payload.purchaseId || unlockRequestId));
          }).catch(function(error) {
            _dpSetPaymentPending(false);
            console.error('[dp-direct-unlock]', error);
            window.alert(String(error && error.message || '단건 결제를 완료하지 못했습니다. 결제 수단을 확인한 뒤 다시 시도해 주세요.'));
          });
        }
      });
      return;
    }

    _dpSetPaymentPending(false);
    window.alert('\uACB0\uC81C \uAC8C\uC774\uD2B8\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC0C8\uB85C\uACE0\uCE68 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.');
    return;

    function runFeatureUnlock() {
      var inFlight = false;
      if (inFlight) return;
      _dpSetPaymentPending(true, info.name + ' 결제 권한을 확인하는 중입니다...', 'monthly');
      _dpRunMonthlyCreditFromMainGate({
        title: info.name + ' 영구 해금',
        reason: info.name + ' 영구 해금',
        coinPrice: info.cost,
        cost: info.cost,
        featureKey: info.key,
        requestId: unlockRequestId,
      }).then(function (payload) {
        _dpSetPaymentPending(false);
        _dpSaveFeatureUnlock(info.key);
        if (info.extraUnlockKeys) { for (var _ekMonthlyI = 0; _ekMonthlyI < info.extraUnlockKeys.length; _ekMonthlyI++) _dpSaveFeatureUnlock(info.extraUnlockKeys[_ekMonthlyI]); }
        cb(payload && (payload.transactionId || payload.paymentId || payload.purchaseId || unlockRequestId));
      }).catch(function (error) {
        _dpSetPaymentPending(false);
        console.error('[dp-monthly-unlock]', error);
        window.alert(String(error && error.message || '월정석 결제를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
      });
      return;
      inFlight = true;
      var productId = _DP_UNLOCK_PRODUCT_BY_FEATURE_KEY[info.key] || '';
      var requestId = 'unlock-' + (productId || info.key) + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
      var endpoint = '/api/billing/coin-gate';
      var payload = productId
        ? { productId: productId, requestId: requestId }
        : {
          cost: info.cost,
          featureKey: info.key,
          reason: info.name + ' 영구 해금',
          requestId: requestId
        };
      var unlockHeaders = {
        'Content-Type': 'application/json'
      };
      if (token) unlockHeaders.Authorization = 'Bearer ' + token;
      // forceDeduct 해금 요청 = 실제 차감 + 열람 권한 저장 단계.
      _dpSetPaymentPending(true, info.name + ' 결제를 처리하는 중입니다...', 'unlock-saving');
      _dpWaitForPaymentOverlayPaint().then(function () {
        return _dpFetchJsonWithFallback(endpoint, {
          method: 'POST',
          headers: unlockHeaders,
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify(payload)
        }, {
          retryOn401: true,
          timeoutMs: _DP_FETCH_TIMEOUT_MS,
        });
      })
      .then(function (res) {
        inFlight = false;
        _dpSetPaymentPending(false);
        if (_dpIsAuthRequiredResult(res)) {
          if (typeof window.__cdOpenLoginRequiredModal === 'function') {
            window.__cdOpenLoginRequiredModal({
              reason: '로그인 후 이용할 수 있는 기능입니다.',
              redirectTo: window.location.pathname + window.location.search + window.location.hash,
            });
          }
          return;
        }
        if (res.status === 402) {
          if (typeof window.__cdOpenChargeModal === 'function') {
            window.alert('단건 결제가 필요합니다. 결제 상점을 열겠습니다.');
            window.__cdOpenChargeModal();
          } else {
            window.location.href = '/points';
          }
          return;
        }
        if (!res.ok) {
          window.alert((res.data && res.data.message) || '원화 결제 확인에 실패했습니다. 다시 시도해 주세요.');
          return;
        }
        var newBalance = (res.data && res.data.user && typeof res.data.user.points === 'number')
          ? res.data.user.points
          : (hasBalanceSnapshot ? Math.max(0, balance - info.cost) : _dpGetUserBalance());
        _dpSaveUserBalance(newBalance);
        if (typeof window.__cdSetGoldenBalance === 'function') window.__cdSetGoldenBalance(newBalance);
        var chargedCoins = Number((res.data && res.data.chargedCoins) || info.cost);
        if (res.data && res.data.freeBySubscription === true) {
          _cdShowSubscriptionShieldNotice({
            message: res.data.message,
            subscriptionTier: res.data.subscriptionTier,
            freeLimit: res.data.freeLimit,
            requiredCoins: info.cost,
          });
        } else if (chargedCoins > 0) {
          _cdShowCoinDeductNotice(chargedCoins, newBalance, info.name + ' 영구 해금');
        }
        _dpSaveFeatureUnlock(info.key);
        if (info.extraUnlockKeys) { for (var _ekI = 0; _ekI < info.extraUnlockKeys.length; _ekI++) _dpSaveFeatureUnlock(info.extraUnlockKeys[_ekI]); }
        window.alert('🎉 ' + info.name + '이(가) 해금되었습니다!');
        cb();
      })
      .catch(function (e) {
        inFlight = false;
        _dpSetPaymentPending(false);
        console.error('[dp-coin-gate]', e);
        window.alert('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      });
    }
  }

  /* ── 프로필 구독 상태 (로드 후 갱신) ── */
  var _DP_SUB_CACHE_LEGACY_KEY = 'fortune_profile_subscription';
  var _DP_SUB_CACHE_OWNER_KEY = 'fortune_profile_subscription_owner';
  var _DP_SUB_CACHE_PREFIX = 'fortune_profile_subscription::';

  var _dpSubTier         = 'free';   // 'free' | 'standard' | 'premium' | 'vvip'
  var _dpSubIsActive     = false;
  var _dpSubProfileLimit = 1;        // 1 | 3 | 7 | 15
  var _dpSubScope        = '';
  var _dpProfileAccess   = { mode: 'subscription', selectionRequired: false, locked: false, lockedProfileId: '', profileLimit: 1 };

  function _dpGetSubCacheKey() {
    return _DP_SUB_CACHE_PREFIX + _dpGetProfileScope();
  }

  function _dpWriteSubCache(tier, isActive, profileLimit, expiresAt) {
    try {
      var scope = _dpGetProfileScope();
      var payload = {
        tier: _dpNormalizeTier(tier),
        isActive: !!isActive,
        profileLimit: profileLimit,
        expiresAt: expiresAt || null
      };
      var raw = JSON.stringify(payload);
      localStorage.setItem(_dpGetSubCacheKey(), raw);
      localStorage.setItem(_DP_SUB_CACHE_LEGACY_KEY, raw);
      localStorage.setItem(_DP_SUB_CACHE_OWNER_KEY, scope);
    } catch (e) {}
  }

  function _dpReadAuthSubscriptionSnapshot() {
    var scope = _dpGetProfileScope();
    var policySnapshot = _dpReadProfilePolicySnapshot(scope);
    if (policySnapshot && !policySnapshot.stale) {
      return {
        tier: policySnapshot.tier,
        isActive: policySnapshot.isActive,
        profileLimit: policySnapshot.maxProfileCount,
        expiresAt: policySnapshot.expiresAt || null
      };
    }
    var user = _dpReadAuthUser();
    if (user && user.profilePolicySnapshot && typeof user.profilePolicySnapshot === 'object') {
      var authPolicy = _dpNormalizeProfilePolicySnapshot(user.profilePolicySnapshot, 'auth_user');
      if (authPolicy) {
        _dpWriteProfilePolicySnapshot(scope, authPolicy);
        return {
          tier: authPolicy.tier,
          isActive: authPolicy.isActive,
          profileLimit: authPolicy.maxProfileCount,
          expiresAt: authPolicy.expiresAt || null
        };
      }
    }
    var sub = user && user.profileSubscription && typeof user.profileSubscription === 'object' ? user.profileSubscription : null;
    if (!sub) return null;
    var tier = _dpNormalizeTier(sub.tier || sub.passTier || sub.plan || sub.planId || sub.productId || user.plan);
    var active = tier !== 'free' && !!(
      sub.isActive
      || sub.isSubscribed
      || sub.active
      || sub.enabled
      || sub.valid
      || sub.registered
      || _dpIsActiveMembershipStatusValue(sub.status)
      || _dpIsActiveMembershipStatusValue(sub.subscriptionStatus)
      || _dpIsActiveMembershipStatusValue(sub.membershipStatus)
      || _dpHasFutureMembershipExpiry(sub.expiresAt)
    );
    var rawLimit = _dpReadProfileLimitValue(sub);
    var resolvedLimit = _dpResolveProfileLimit(tier, rawLimit);
    return {
      tier: tier,
      isActive: active,
      profileLimit: active ? resolvedLimit : 1,
      expiresAt: sub.expiresAt || null
    };
  }

  /** localStorage 캐시에서 구독 상태를 읽어 변수 초기화 */
  function _dpLoadSubCache() {
    var scope = _dpGetProfileScope();
    _dpSubScope = scope;
    _dpSubTier = 'free';
    _dpSubIsActive = false;
    _dpSubProfileLimit = 1;
    try {
      var authSnapshot = _dpReadAuthSubscriptionSnapshot();
      var raw = localStorage.getItem(_dpGetSubCacheKey()) || '';
      if (!raw) {
        var legacyRaw = localStorage.getItem(_DP_SUB_CACHE_LEGACY_KEY) || '';
        var legacyOwner = String(localStorage.getItem(_DP_SUB_CACHE_OWNER_KEY) || '').trim().toLowerCase();
        if (legacyRaw && (!legacyOwner || legacyOwner === scope || scope === 'guest')) {
          raw = legacyRaw;
          localStorage.setItem(_dpGetSubCacheKey(), legacyRaw);
        }
      }
      if (!raw) {
        if (authSnapshot && authSnapshot.isActive) {
          _dpSubTier = authSnapshot.tier;
          _dpSubIsActive = true;
          _dpSubProfileLimit = authSnapshot.profileLimit;
          _dpWriteSubCache(authSnapshot.tier, true, authSnapshot.profileLimit, authSnapshot.expiresAt);
        }
        return;
      }

      var c = JSON.parse(raw);
      var tier = _dpNormalizeTier(c && c.tier);
      var active = !!(c && c.isActive) && tier !== 'free';
      var rawLimit = _dpReadProfileLimitValue(c);
      var resolvedLimit = _dpResolveProfileLimit(tier, rawLimit);
      if (authSnapshot && authSnapshot.isActive) {
        tier = authSnapshot.tier;
        active = true;
        resolvedLimit = authSnapshot.profileLimit;
        _dpWriteSubCache(authSnapshot.tier, true, authSnapshot.profileLimit, authSnapshot.expiresAt);
      }

      _dpSubTier         = tier;
      _dpSubIsActive     = active;
      _dpSubProfileLimit = active ? resolvedLimit : 1;
    } catch(e) {}
  }

  /** 서버에서 구독 상태 조회 후 캐시·변수 갱신 */
  function _fetchSubscription() {
    if (!_dpHasSessionHint()) {
      _dpSubScope = _dpGetProfileScope();
      _dpSubTier = 'free';
      _dpSubIsActive = false;
      _dpSubProfileLimit = 1;
      _dpUpdateSaveBtn();
      return;
    }
    _dpVerifyLoginSession(false).then(function(ok) {
      if (!ok) {
        _dpSubScope = _dpGetProfileScope();
        _dpSubTier = 'free';
        _dpSubIsActive = false;
        _dpSubProfileLimit = 1;
        _dpUpdateSaveBtn();
        return;
      }

      _dpFetchJsonWithFallback('/api/fortune/pig-coin/profile-subscription/status', {
        credentials: 'include',
        cache: 'no-store',
        headers: _dpBuildAuthHeaders()
      })
      .then(function(res) {
        if (_dpIsAuthRequiredResult(res)) return null;
        return res.ok ? res.data : null;
      })
      .then(function(d) {
        if (!d) return;
        // DB 일시오류 시 서버는 degraded 스냅샷(tier:"free")을 준다. 이걸 그대로 믿으면
        // 이용권 보유자가 무료로 확정 저장돼 프로필 추가에 결제창이 뜬다 — 이전 값을 유지한다.
        if (d.degraded === true) return;
        var tier = _dpNormalizeTier(d.tier);
        var active = !!d.isActive && tier !== 'free';
        var rawLimit = _dpReadProfileLimitValue(d);
        var resolvedLimit = _dpResolveProfileLimit(tier, rawLimit);

        _dpSubTier         = tier;
        _dpSubIsActive     = active;
        _dpSubProfileLimit = active ? resolvedLimit : 1;
        _dpSubScope        = _dpGetProfileScope();

        _dpWriteSubCache(tier, active, resolvedLimit, d.expiresAt || null);
        _dpUpdateSaveBtn();
        renderProfileList();
      })
      .catch(function() {});
    }).catch(function() {
      _dpSubScope = _dpGetProfileScope();
      _dpSubTier = 'free';
      _dpSubIsActive = false;
      _dpSubProfileLimit = 1;
      _dpUpdateSaveBtn();
    });
  }

  /** 현재 플랜에 따른 최대 프로필 수 반환 */
  function _dpGetMaxProfiles() {
    var scope = _dpGetProfileScope();
    if (_dpSubScope !== scope || !_dpSubIsActive) _dpLoadSubCache();
    if (_dpSubIsActive) return _dpSubProfileLimit;
    return _dpGetTierProfileLimit(_dpGetUserPlan());
  }

  function _dpApplyProfileAccess(access) {
    if (!access || typeof access !== 'object') return;
    var profileLimit = _dpReadProfileLimitValue(access);
    if (!Number.isFinite(profileLimit)) profileLimit = 1;
    _dpProfileAccess = {
      mode: String(access.mode || 'subscription'),
      selectionRequired: !!access.selectionRequired,
      locked: !!access.locked,
      lockedProfileId: String(access.lockedProfileId || '').trim(),
      profileLimit: profileLimit
    };
  }

  function _dpCommitSingleProfileSelection(profileId, callback) {
    var nextId = String(profileId || '').trim();
    if (!_dpHasSessionHint() || !nextId) {
      if (callback) callback(false);
      return;
    }
    _dpVerifyLoginSession(false).then(function(ok) {
      if (!ok) { if (callback) callback(false); return; }
      _dpFetchJsonWithFallback('/api/profile/current', {
        method: 'PATCH',
        credentials: 'include',
        cache: 'no-store',
        headers: _dpBuildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ currentId: nextId })
      }).then(function(res) {
        var data = res && res.data ? res.data : null;
        if (!res || !res.ok || !data || data.ok === false) {
          alert((data && data.message) || '프로필 선택을 확정할 수 없습니다. 다시 시도해 주세요.');
          if (callback) callback(false);
          return;
        }
        _dpApplyProfileAccess(data.profileAccess);
        if (callback) callback(true);
      }).catch(function() {
        alert('프로필 선택 확정 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        if (callback) callback(false);
      });
    }).catch(function() { if (callback) callback(false); });
  }

  /** 저장 버튼 상태를 구독 플랜에 맞게 업데이트 */
  function _dpUpdateProfileQuotaText(profileCount, maxProfiles, planLabel, canUsePlanSlot) {
    var quotaText = document.getElementById('dpProfileQuotaText');
    if (!quotaText) return;
    var used = Math.max(0, Math.floor(Number(profileCount || 0)));
    var unlimited = _dpIsUnlimitedProfileLimit(maxProfiles);
    var limit = _dpGetPositiveProfileLimit(maxProfiles);
    var remaining = unlimited ? '무제한' : String(Math.max(0, limit - used));
    var limitLabel = unlimited ? '무제한' : String(limit);
    var label = planLabel || '무료 플랜';
    if (canUsePlanSlot) {
      quotaText.textContent = label + ' · 기본 제공 프로필 카드 ' + remaining + (unlimited ? '' : '개') + ' 저장 가능 (' + used + '/' + limitLabel + ')';
    } else if (!_dpSubIsActive) {
      quotaText.textContent = '무료 계정 · 기본 프로필 카드 1개 사용 완료 · 추가 생성 ' + (PROFILE_CARD_MANAGE_COST * 100).toLocaleString('ko-KR') + '원';
    } else {
      quotaText.textContent = label + ' · 기본 한도 ' + limitLabel + '개 사용 완료 · 추가 생성 5,000원';
    }
  }

  function _dpUpdateSaveBtn() {
    var btn = document.getElementById('dpSaveBtn');
    var profileCount = DPStorage.list().length;
    var maxProfiles = _dpGetMaxProfiles();
    var hasProfiles = profileCount > 0;
    var canUsePlanSlot = _dpCanUseProfileSlot(profileCount, maxProfiles);
    var canCreateWithoutPayment = canUsePlanSlot;
    var planLabel = _dpGetTierLabel(_dpSubIsActive ? _dpSubTier : _dpGetUserPlan());
    var slotLabel = _dpGetProfileLimitSlotLabel(profileCount, maxProfiles);
    _dpUpdateProfileQuotaText(profileCount, maxProfiles, planLabel, canUsePlanSlot);
    if (!btn) return;

    function setSaveButtonContent(label, badge) {
      btn.innerHTML = '<span class="moon-submit-btn__star lotus-icon" aria-hidden="true">✦</span><span class="moon-submit-btn__text main-txt"></span><span class="moon-submit-btn__coin coin-pill"></span>';
      var textNode = btn.querySelector('.moon-submit-btn__text');
      var coinNode = btn.querySelector('.moon-submit-btn__coin');
      if (textNode) textNode.textContent = label;
      if (coinNode) {
        coinNode.textContent = badge;
        coinNode.hidden = !badge;
        coinNode.style.display = badge ? 'inline-flex' : 'none';
      }
      btn.setAttribute('aria-label', badge ? (label + ', ' + badge) : label);
    }

    btn.disabled = false;
    if (hasProfiles) {
      var isFamilyPlan = _dpSubIsActive && _dpSubTier === 'family';
      setSaveButtonContent('프로필 카드 수정', isFamilyPlan ? '무료' : '5,000원');
      btn.title = isFamilyPlan
        ? 'Code Destiny Family 이용권으로 프로필 정보를 무료로 수정합니다.'
        : '프로필 수정·삭제에는 5,000원 단건 결제 또는 월정석 사용이 필요합니다.';
      return;
    }
    if (!hasProfiles && canCreateWithoutPayment) {
      setSaveButtonContent('이 정보를 나의 운명 카드에 저장', slotLabel);
    } else if (canCreateWithoutPayment) {
      setSaveButtonContent('프로필 카드 생성', slotLabel + ' 사용 중');
    } else {
      setSaveButtonContent('프로필 카드 추가 생성', (PROFILE_CARD_MANAGE_COST * 100).toLocaleString('ko-KR') + '원');
    }
    btn.style.opacity = '';
    btn.style.cursor = '';
    btn.title = canCreateWithoutPayment
      ? planLabel + ' 한도 ' + _dpFormatLimitLabel(maxProfiles) + ' 중 ' + profileCount + '개를 사용 중입니다.'
      : '프로필 카드 추가는 서버에서 5,000원 결제를 확인한 뒤 저장됩니다.';
  }

  function _resolveEventElement(target) {
    if (!target) return null;
    if (target.nodeType === 1) return target;
    return target.parentElement || null;
  }

  var _DP_TOUCH_STABILITY = {
    moveX: 12,
    moveY: 16,
    maxDurationMs: 520,
    recentScrollBlockMs: 220
  };

  var _dpLastTouchScrollAt = 0;
  var _dpTouchScrollMarkBound = false;

  function _dpResetTouchTapState(state) {
    if (!state) return;
    state.active = false;
    state.x = 0;
    state.y = 0;
    state.startedAt = 0;
  }

  function _dpReadTouchPoint(event, useChangedTouches) {
    if (!event) return null;
    var touches = useChangedTouches ? event.changedTouches : event.touches;
    if (touches && touches.length) return touches[0];
    return event;
  }

  function _dpRecordTouchTapStart(state, event) {
    var point = _dpReadTouchPoint(event, false);
    if (!point || typeof point.clientX !== 'number' || typeof point.clientY !== 'number') {
      _dpResetTouchTapState(state);
      return;
    }
    state.active = true;
    state.x = point.clientX;
    state.y = point.clientY;
    state.startedAt = Date.now();
  }

  function _dpIsStableTouchTap(state, event, opts) {
    if (!state || !state.active) {
      _dpResetTouchTapState(state);
      return false;
    }

    var point = _dpReadTouchPoint(event, true);
    var now = Date.now();
    var options = opts || {};
    var moveX = (typeof options.moveX === 'number') ? options.moveX : _DP_TOUCH_STABILITY.moveX;
    var moveY = (typeof options.moveY === 'number') ? options.moveY : _DP_TOUCH_STABILITY.moveY;
    var maxDurationMs = (typeof options.maxDurationMs === 'number') ? options.maxDurationMs : _DP_TOUCH_STABILITY.maxDurationMs;
    var recentScrollBlockMs = (typeof options.recentScrollBlockMs === 'number') ? options.recentScrollBlockMs : _DP_TOUCH_STABILITY.recentScrollBlockMs;

    var stable = false;
    if (point && typeof point.clientX === 'number' && typeof point.clientY === 'number') {
      var dx = Math.abs(point.clientX - state.x);
      var dy = Math.abs(point.clientY - state.y);
      var duration = state.startedAt ? (now - state.startedAt) : Number.MAX_SAFE_INTEGER;
      stable = dx < moveX
        && dy < moveY
        && duration <= maxDurationMs
        && (now - _dpLastTouchScrollAt) >= recentScrollBlockMs;
    }

    _dpResetTouchTapState(state);
    return stable;
  }

  function _dpBindTouchScrollMark() {
    if (_dpTouchScrollMarkBound) return;
    _dpTouchScrollMarkBound = true;

    var markScroll = function() {
      _dpLastTouchScrollAt = Date.now();
    };

    window.addEventListener('scroll', markScroll, { passive: true, capture: true });
    document.addEventListener('scroll', markScroll, { passive: true, capture: true });
  }

  /* ──────────────────────────────────────────
     2. 진태양시(True Solar Time) 보정
        KST 기준: 표준 자오선 135도
        보정량(분) = (135 - lng) × 4
  ────────────────────────────────────────── */
  function calcTrueSolarOffset(lng, tzOffsetHours) {
    /* 표준 자오선 = UTC오프셋 × 15도 */
    var stdMeridian = (tzOffsetHours !== undefined ? tzOffsetHours : 9) * 15;
    var offsetMin = Math.round((stdMeridian - lng) * 4);
    return offsetMin;   /* 양수: 뒤로 당김, 음수: 앞으로 당김 */
  }

  function _parseTimeZoneNameOffset(tzName) {
    if (!tzName) return null;
    var m = String(tzName).match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if (!m) return null;
    var sign = m[1] === '-' ? -1 : 1;
    var hh = parseInt(m[2], 10) || 0;
    var mm = parseInt(m[3] || '0', 10) || 0;
    return sign * (hh + mm / 60);
  }

  function getTimeZoneOffsetHoursForDate(year, month, day, hour, minute, tz, fallbackOffsetHours) {
    var fallback = (typeof fallbackOffsetHours === 'number' && !isNaN(fallbackOffsetHours)) ? fallbackOffsetHours : 9;
    if (!tz || typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') return fallback;
    try {
      var probeUtc = new Date(Date.UTC(year, (month || 1) - 1, day || 1, hour || 12, minute || 0, 0));
      var fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'shortOffset'
      });
      var parts = fmt.formatToParts(probeUtc);
      var tzPart = '';
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === 'timeZoneName') {
          tzPart = parts[i].value || '';
          break;
        }
      }
      var parsed = _parseTimeZoneNameOffset(tzPart);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function resolveTimezoneOffset(birth, location) {
    birth = birth || {};
    location = location || {};
    var base = (typeof location.baseTzOffset === 'number' && !isNaN(location.baseTzOffset))
      ? location.baseTzOffset
      : ((typeof location.tzOffset === 'number' && !isNaN(location.tzOffset)) ? location.tzOffset : 9);
    var tz = location.tz || 'Asia/Seoul';
    var y = birth.year || 2000;
    var m = birth.month || 1;
    var d = birth.day || 1;
    var h = (birth.hour != null) ? birth.hour : 12;
    var mm = (birth.minute != null) ? birth.minute : 0;
    var eff = getTimeZoneOffsetHoursForDate(y, m, d, h, mm, tz, base);
    var dstMinutes = Math.round((eff - base) * 60);
    return {
      tzOffsetHours: eff,
      baseOffsetHours: base,
      dstMinutes: dstMinutes,
      isDstApplied: dstMinutes !== 0
    };
  }

  function applyTrueSolarOffset(hour, minute, offsetMin) {
    var total = hour * 60 + minute - offsetMin;
    /* 자정 이전/이후 처리 */
    total = ((total % 1440) + 1440) % 1440;
    return { h: Math.floor(total / 60), m: total % 60 };
  }

  function formatTrueSolarTime(hour, minute, lng, tzOffset) {
    var offsetMin = calcTrueSolarOffset(lng, tzOffset);
    var t = applyTrueSolarOffset(hour, minute, offsetMin);
    var hh = String(t.h).padStart(2,'0');
    var mm = String(t.m).padStart(2,'0');
    var dir = offsetMin > 0 ? '-' : '+';
    var abs = Math.abs(offsetMin);
    return hh + ':' + mm + ' (' + dir + abs + '분 보정)';
  }

  /* ──────────────────────────────────────────
     3. CustomEvent 브로드캐스트
        → 사주 엔진, 자미두수, 숙요점 자동 연동
  ────────────────────────────────────────── */
  function broadcastProfileChange(profile) {
    try {
      document.dispatchEvent(new CustomEvent('destinyProfileChanged', {
        detail: { profile: profile },
        bubbles: true
      }));
    } catch(e) {}
  }

  /* ──────────────────────────────────────────
     4. 입력 폼 → 프로필 오브젝트 변환
  ────────────────────────────────────────── */
  function readFormData() {
    var name    = (document.getElementById('nameInput') || {}).value || '';
    var bdEl    = document.getElementById('birthDate');
    var bd      = bdEl ? _dpNormalizeBirthDateInputValue(bdEl.value) : '';
    var hourRaw = parseInt((document.getElementById('birthHour') || {}).value, 10);
    var minuteRaw = parseInt((document.getElementById('birthMinute') || {}).value, 10);
    var hour = (Number.isFinite(hourRaw) && hourRaw >= 0 && hourRaw <= 23) ? hourRaw : 12;
    var minute = (Number.isFinite(minuteRaw) && minuteRaw >= 0 && minuteRaw <= 59) ? minuteRaw : 0;
    /* 성별: 활성 버튼 우선, 폴백 window._gender, 기본값 'F' */
    var gender  = 'F';
    var btnM = document.getElementById('btnM');
    var btnF = document.getElementById('btnF');
    if (btnM && btnM.classList.contains('on')) {
      gender = 'M';
    } else if (btnF && btnF.classList.contains('on')) {
      gender = 'F';
    } else if (window._gender && (window._gender === 'M' || window._gender === 'F')) {
      gender = window._gender;
    } else if (typeof window.GENDER !== 'undefined' && window.GENDER) {
      gender = window.GENDER;
    }

    /* calType */
    var calType = 'solar';
    var calBtns = document.querySelectorAll('input[name="calType"]');
    for (var i = 0; i < calBtns.length; i++) {
      if (calBtns[i].checked) { calType = calBtns[i].value; break; }
    }

    /* 장소 */
    var countrySel = document.getElementById('birthCountry');
    var opt        = countrySel ? countrySel.options[countrySel.selectedIndex] : null;
    var tz   = opt ? countrySel.value   : 'Asia/Seoul';
    var lng  = opt ? parseFloat(opt.getAttribute('data-long') || '127') : 127.0;
    var lat  = opt ? parseFloat(opt.getAttribute('data-lat')  || '37.6'): 37.6;
    var tzOff= opt ? parseFloat(opt.getAttribute('data-tz')   || '9')   : 9;
    var baseTzOff = opt ? parseFloat(opt.getAttribute('data-base-tz') || String(tzOff)) : tzOff;
    var locationLabel = opt ? opt.text : '대한민국 (서울)';

    if (!name || !bd) return null;
    if (bdEl && bd !== bdEl.value) bdEl.value = bd;

    var parts = String(bd || '').split('-');
    if (parts.length < 3) return null;
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var day = parseInt(parts[2], 10);
    if (!_dpHasValidProfileDate(year, month, day)) return null;

    var resolvedTz = resolveTimezoneOffset(
      { year: year, month: month, day: day, hour: hour, minute: minute },
      { tz: tz, tzOffset: tzOff, baseTzOffset: baseTzOff }
    );

    return {
      name: name,
      gender: gender,
      birth: { year: year, month: month, day: day, hour: hour, minute: minute, calType: calType },
      location: {
        label: locationLabel,
        tz: tz,
        lng: lng,
        lat: lat,
        tzOffset: resolvedTz.tzOffsetHours,
        baseTzOffset: resolvedTz.baseOffsetHours,
        dstMinutes: resolvedTz.dstMinutes
      }
    };
  }

  function _dpEscapeJsString(value) {
    return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function _dpBuildProfileManageRequestId(action, profileId) {
    return ('profile-card:' + action + ':' + String(profileId || 'new') + ':' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8)).slice(0, 120);
  }

  function _dpReadProfileDeleteLock() {
    var raw = window.__dpProfileDeleteInFlight;
    if (raw && typeof raw === 'object') {
      return {
        profileId: String(raw.profileId || '').trim(),
        startedAt: Number(raw.startedAt || 0)
      };
    }
    return {
      profileId: String(raw || '').trim(),
      startedAt: Number(window.__dpProfileDeleteInFlightAt || 0)
    };
  }

  function _dpSetProfileDeleteLock(profileId) {
    var startedAt = Date.now();
    window.__dpProfileDeleteInFlight = { profileId: String(profileId || '').trim(), startedAt: startedAt };
    window.__dpProfileDeleteInFlightAt = startedAt;
  }

  function _dpClearProfileDeleteLock(profileId) {
    var lock = _dpReadProfileDeleteLock();
    if (profileId && lock.profileId && lock.profileId !== String(profileId || '').trim()) return;
    window.__dpProfileDeleteInFlight = '';
    window.__dpProfileDeleteInFlightAt = 0;
  }

  function _dpBuildProfileCreateId(seed) {
    var suffix = String(seed || 'new').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'new';
    return ('dp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8) + '_' + suffix).slice(0, 80);
  }

  function _dpEnsureProfileActionMenuStyles() {
    if (document.getElementById('dpProfileActionMenuStyles')) return;
    var style = document.createElement('style');
    style.id = 'dpProfileActionMenuStyles';
    style.textContent = ''
      + '.dp-master-card.dp-master-card--active,.dp-master-card.dp-master-card--active .dp-mc-inner,.dp-master-card.dp-master-card--active .dp-mc-header{overflow:visible!important;}'
      + '.dp-mc-action-wrap{position:relative;z-index:180;display:flex;align-items:flex-start;overflow:visible;pointer-events:auto;}'
      + '.dp-mc-menu-btn{min-width:46px!important;min-height:46px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;position:relative;z-index:82;pointer-events:auto!important;-webkit-tap-highlight-color:transparent;}'
      + '.dp-mc-action-menu{position:absolute;right:0;top:calc(100% + 10px);width:min(272px,calc(100vw - 28px));display:none;gap:8px;padding:10px;border-radius:8px;background:linear-gradient(145deg,rgba(8,13,32,.98),rgba(37,29,78,.96));border:1px solid rgba(255,215,0,.32);box-shadow:0 18px 46px rgba(0,0,0,.45),0 0 24px rgba(255,215,0,.12);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);pointer-events:auto;isolation:isolate;z-index:9999;overflow-y:auto;}'
      + '.dp-mc-action-wrap.is-open .dp-mc-action-menu{display:grid;}'
      + '.dp-mc-action-menu__item{width:100%;min-height:48px;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(255,255,255,.06);color:#f8fafc;padding:12px 13px;text-align:left;font-size:.82rem;font-weight:900;line-height:1.25;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}'
      + '.dp-mc-action-menu__item span{font-size:.68rem;font-weight:800;color:rgba(226,232,240,.72);white-space:nowrap;}'
      + '.dp-mc-action-menu__item:active{transform:translateY(1px);}'
      + '.dp-mc-action-menu__item--danger{border-color:rgba(251,113,133,.42);background:rgba(127,29,29,.24);color:#fecdd3;}'
      + '.dp-mc-action-menu__item--danger span{color:#fbbf24;}'
      + '@media(max-width:768px){.dp-mc-action-wrap{z-index:220}.dp-mc-action-menu{top:calc(100% + 8px);width:min(284px,calc(100vw - 24px));padding:10px}.dp-mc-action-menu__item{min-height:54px;font-size:.88rem;}.dp-master-card,.dp-mc-inner,.dp-mc-header{overflow:visible!important;}}';
    document.head.appendChild(style);
  }

  function _dpCloseProfileMenu() {
    var wrap = document.querySelector('#dpMasterCard .dp-mc-action-wrap.is-open');
    if (!wrap) return;
    wrap.classList.remove('is-open');
    var btn = wrap.querySelector('.dp-mc-menu-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function _dpWasProfileMenuPointerRecentlyHandled(node) {
    var handledAt = 0;
    try {
      handledAt = node && node.getAttribute ? Number(node.getAttribute('data-dp-pointer-handled-at') || 0) : 0;
    } catch (_) {}
    return handledAt > 0 && Date.now() - handledAt < 700;
  }

  function _dpMarkProfileMenuPointerHandled(node) {
    var now = Date.now();
    _dpProfileMenuPointerHandledAt = now;
    try {
      if (node && node.setAttribute) node.setAttribute('data-dp-pointer-handled-at', String(now));
    } catch (_) {}
  }

  function _dpPositionProfileMenu(btn, wrap) {
    if (!btn || !wrap || !btn.getBoundingClientRect) return;
    var menu = wrap.querySelector('.dp-mc-action-menu');
    if (!menu) return;
    var rect = btn.getBoundingClientRect();
    var wrapRect = wrap.getBoundingClientRect ? wrap.getBoundingClientRect() : rect;
    var card = document.getElementById('dpMasterCard');
    var cardRect = card && card.getBoundingClientRect ? card.getBoundingClientRect() : null;
    var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    var width = Math.min(_isMobileViewport() ? 284 : 272, Math.max(220, vw - 24));
    var minLeft = Math.max(12, cardRect ? cardRect.left + 8 : 12);
    var maxRight = Math.min(vw - 12, cardRect ? cardRect.right - 8 : vw - 12);
    var desiredRight = Math.min(maxRight, Math.max(minLeft + width, wrapRect.right));
    var right = Math.round(wrapRect.right - desiredRight);
    menu.style.width = width + 'px';
    menu.style.right = right + 'px';
    menu.style.top = '';
    menu.style.left = '';
    menu.style.maxHeight = 'min(72vh, 360px)';
  }

  function _dpToggleProfileMenuFromButton(btn, event, source) {
    if (event && event.preventDefault) event.preventDefault();
    if (event && event.stopPropagation) event.stopPropagation();
    if (!_dpProfileMenuSyntheticEvent && event && event.type === 'click' && (Date.now() - _dpProfileMenuLastTouchAt < 700 || _dpWasProfileMenuPointerRecentlyHandled(btn))) return;
    if (!_dpProfileMenuSyntheticEvent && event && event.type === 'touchend' && _dpWasProfileMenuPointerRecentlyHandled(btn)) return;
    if (source === 'touch') _dpProfileMenuLastTouchAt = Date.now();
    _dpCloseProfileMenu();
    if (btn && btn.setAttribute) btn.setAttribute('aria-expanded', 'false');
    if (typeof window.dpOpenList === 'function') window.dpOpenList();
  }

  function _dpRunProfileMenuActionNode(node, event) {
    if (event && event.preventDefault) event.preventDefault();
    if (event && event.stopPropagation) event.stopPropagation();
    var item = node && node.closest ? node.closest('.dp-mc-action-menu__item') : null;
    if (!item) return;
    if (!_dpProfileMenuSyntheticEvent && event && (event.type === 'click' || event.type === 'touchend') && _dpWasProfileMenuPointerRecentlyHandled(item)) return;
    var action = String(item.getAttribute('data-dp-menu-action') || '').trim();
    var profileId = String(item.getAttribute('data-profile-id') || '').trim();
    _dpCloseProfileMenu();
    if (action === 'view' || action === 'list') {
      window.dpOpenList();
      return;
    }
    if (action === 'delete' && profileId) {
      window.dpDeleteProfile(profileId);
    }
  }

  function _dpBindMasterCardMenuEvents(root) {
    if (!root || !root.querySelector) return;
    var btn = root.querySelector('.dp-mc-menu-btn');
    if (btn && btn.getAttribute('data-dp-bound') !== '1') {
      btn.setAttribute('data-dp-bound', '1');
      btn.addEventListener('click', function(event) {
        _dpToggleProfileMenuFromButton(btn, event, 'click');
      });
      btn.addEventListener('touchend', function(event) {
        _dpToggleProfileMenuFromButton(btn, event, 'touch');
      }, { passive: false });
    }
    root.querySelectorAll('.dp-mc-action-menu__item').forEach(function(item) {
      if (item.getAttribute('data-dp-bound') === '1') return;
      item.setAttribute('data-dp-bound', '1');
      item.addEventListener('click', function(event) {
        _dpRunProfileMenuActionNode(item, event);
      });
      item.addEventListener('touchend', function(event) {
        _dpRunProfileMenuActionNode(item, event);
      }, { passive: false });
    });
    var loadBtn = root.querySelector('.dp-mc-load-btn');
    if (loadBtn && loadBtn.getAttribute('data-dp-bound') !== '1') {
      loadBtn.setAttribute('data-dp-bound', '1');
      loadBtn.addEventListener('click', function(event) {
        if (event && event.preventDefault) event.preventDefault();
        if (event && event.stopPropagation) event.stopPropagation();
        if (typeof window.dpLoadProfile === 'function') window.dpLoadProfile();
      });
    }
  }

  function _dpBuildProfileDeletePaymentBase(profileId, requestId) {
    var title = '\uD504\uB85C\uD544 \uCE74\uB4DC \uC0AD\uC81C';
    var normalizedProfileId = String(profileId || '').trim();
    return {
      title: title,
      reason: title,
      featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
      coinPrice: PROFILE_CARD_MANAGE_COST,
      cost: PROFILE_CARD_MANAGE_COST,
      amountKrw: PROFILE_CARD_MANAGE_COST * 100,
      amountKRW: PROFILE_CARD_MANAGE_COST * 100,
      cashPrice: PROFILE_CARD_MANAGE_COST * 100,
      membershipCreditCost: PROFILE_CARD_MANAGE_MONTHLY_COST,
      requiredMonthlyCredits: PROFILE_CARD_MANAGE_MONTHLY_COST,
      requestId: requestId,
      profileId: normalizedProfileId,
      selectedProfileId: normalizedProfileId,
      profileCardId: normalizedProfileId,
      serviceKey: 'profile_card_delete',
      reportType: 'profile_card_delete',
      actionType: 'profile_card_delete',
      profileAction: 'delete',
      action: 'delete',
      allowedPaymentModes: ['direct', 'monthly'],
      disablePassFirst: true,
      disablePassChoice: true,
      skipPassProbe: true,
    };
  }

  function _dpNormalizeProfileDeletePaymentContext(payload, profileId, requestId, paymentMode) {
    var data = _dpExtractBillingData(payload || {});
    if (!data || typeof data !== 'object') data = {};
    var accessGrant = data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    var consume = data.consume && typeof data.consume === 'object' ? data.consume : {};
    var paymentId = String(_dpPaidPassPayloadTransactionId(data, requestId) || requestId || '');
    var normalizedProfileId = String(profileId || '').trim();
    return {
      requestId: requestId,
      transactionId: paymentId,
      paymentId: paymentId,
      purchaseId: paymentId,
      paymentSettled: true,
      paymentMode: paymentMode,
      payment: data,
      accessGrant: accessGrant,
      consume: consume,
      _paymentContext: {
        requestId: requestId,
        transactionId: paymentId,
        paymentId: paymentId,
        purchaseId: paymentId,
        paymentSettled: true,
        paymentMode: paymentMode,
        featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
        profileId: normalizedProfileId,
        selectedProfileId: normalizedProfileId,
        profileCardId: normalizedProfileId,
        actionType: 'profile_card_delete',
        profileAction: 'delete',
        action: 'delete'
      }
    };
  }

  function _dpEnsureProfileDeleteGateStyles() {
    if (document.getElementById('dpProfileDeleteGateStyles')) return;
    var style = document.createElement('style');
    style.id = 'dpProfileDeleteGateStyles';
    style.textContent = ''
      + '.dp-delete-gate{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(5,8,18,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);}'
      + '.dp-delete-gate__panel{width:min(520px,calc(100vw - 28px));border-radius:8px;border:1px solid rgba(255,215,0,.42);background:linear-gradient(145deg,rgba(10,15,32,.98),rgba(37,29,78,.97) 52%,rgba(20,26,45,.98));box-shadow:0 28px 80px rgba(0,0,0,.58),0 0 28px rgba(255,215,0,.14);color:#fff7d6;overflow:hidden;}'
      + '.dp-delete-gate__head{display:grid;grid-template-columns:52px 1fr;gap:14px;align-items:center;padding:20px 18px 14px;border-bottom:1px solid rgba(255,215,0,.18);}'
      + '.dp-delete-gate__icon{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,150,120,.58);background:rgba(180,65,50,.18);color:#ffd6c8;font-size:24px;font-weight:900;line-height:1;}'
      + '.dp-delete-gate__eyebrow{margin:0 0 5px;font-size:11px;font-weight:800;letter-spacing:0;color:#ffd700;}'
      + '.dp-delete-gate__title{margin:0;font-size:20px;line-height:1.26;font-weight:900;letter-spacing:0;color:#fff8dc;}'
      + '.dp-delete-gate__name{margin:6px 0 0;font-size:13px;line-height:1.45;color:rgba(255,248,220,.78);word-break:break-word;}'
      + '.dp-delete-gate__body{padding:14px 18px 18px;}'
      + '.dp-delete-gate__copy{margin:0 0 12px;font-size:13px;line-height:1.58;color:rgba(255,248,220,.86);}'
      + '.dp-delete-gate__warning{display:flex;gap:8px;align-items:flex-start;margin:0 0 14px;padding:10px 11px;border-left:3px solid rgba(255,150,120,.72);background:rgba(180,65,50,.12);color:#ffd9cf;font-size:12px;line-height:1.5;}'
      + '.dp-delete-gate__options{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 10px;}'
      + '.dp-delete-gate__option{min-height:68px;border-radius:8px;border:1px solid rgba(255,215,0,.24);background:rgba(255,255,255,.07);color:#fff8dc;text-align:left;padding:11px 12px;cursor:pointer;transition:transform .16s ease,border-color .16s ease,background .16s ease;}'
      + '.dp-delete-gate__option:hover{transform:translateY(-1px);border-color:rgba(255,215,0,.58);background:rgba(255,215,0,.10);}'
      + '.dp-delete-gate__option:disabled{opacity:.55;cursor:wait;transform:none;}'
      + '.dp-delete-gate__option strong{display:block;font-size:14px;line-height:1.25;letter-spacing:0;}'
      + '.dp-delete-gate__option span{display:block;margin-top:5px;font-size:12px;line-height:1.35;color:rgba(255,248,220,.72);}'
      + '.dp-delete-gate__foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;}'
      + '.dp-delete-gate__status{min-height:20px;font-size:12px;line-height:1.35;color:rgba(255,248,220,.72);}'
      + '.dp-delete-gate__cancel{min-height:38px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e5e7eb;padding:0 14px;cursor:pointer;}'
      + '.dp-delete-gate__cancel:hover{border-color:rgba(255,255,255,.35);background:rgba(255,255,255,.10);}'
      + '@media(max-width:520px){.dp-delete-gate{align-items:flex-end;padding:12px}.dp-delete-gate__panel{width:100%;}.dp-delete-gate__head{grid-template-columns:44px 1fr;padding:18px 14px 13px}.dp-delete-gate__icon{width:42px;height:42px;font-size:21px}.dp-delete-gate__title{font-size:18px}.dp-delete-gate__body{padding:13px 14px 16px}.dp-delete-gate__options{grid-template-columns:1fr}.dp-delete-gate__foot{align-items:stretch;flex-direction:column}.dp-delete-gate__cancel{width:100%;}}';
    document.head.appendChild(style);
  }

  function _dpOpenProfileDeleteGate(profile, profileId, requestId) {
    return new Promise(function(resolve) {
      var isFamilyPlan = _dpSubIsActive && _dpSubTier === 'family';
      _dpEnsureProfileDeleteGateStyles();
      var previous = document.getElementById('dpProfileDeleteGate');
      if (previous && typeof previous.__dpClose === 'function') previous.__dpClose(null);
      var overlay = document.createElement('div');
      overlay.id = 'dpProfileDeleteGate';
      overlay.className = 'dp-delete-gate';
      overlay.setAttribute('data-marker', DP_PROFILE_DELETE_GATE_MARKER);
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'dpProfileDeleteGateTitle');

      var panel = document.createElement('div');
      panel.className = 'dp-delete-gate__panel';
      var head = document.createElement('div');
      head.className = 'dp-delete-gate__head';
      var icon = document.createElement('div');
      icon.className = 'dp-delete-gate__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '!';
      var titleWrap = document.createElement('div');
      var eyebrow = document.createElement('p');
      eyebrow.className = 'dp-delete-gate__eyebrow';
      eyebrow.textContent = 'PROFILE DELETE';
      var title = document.createElement('h2');
      title.id = 'dpProfileDeleteGateTitle';
      title.className = 'dp-delete-gate__title';
      title.textContent = '\uD504\uB85C\uD544 \uCE74\uB4DC \uC0AD\uC81C';
      var name = document.createElement('p');
      name.className = 'dp-delete-gate__name';
      name.textContent = String((profile && profile.name) || '\uC120\uD0DD\uD55C \uD504\uB85C\uD544') + ' \u00B7 ' + String(profileId || requestId || '');
      titleWrap.appendChild(eyebrow);
      titleWrap.appendChild(title);
      titleWrap.appendChild(name);
      head.appendChild(icon);
      head.appendChild(titleWrap);

      var body = document.createElement('div');
      body.className = 'dp-delete-gate__body';
      var copy = document.createElement('p');
      copy.className = 'dp-delete-gate__copy';
      copy.textContent = isFamilyPlan
        ? 'Code Destiny Family 이용권으로 프로필 카드를 결제 없이 삭제할 수 있습니다.'
        : '프로필 수정·삭제에는 5,000원 단건 결제 또는 월정석 사용이 필요합니다.';
      var warning = document.createElement('div');
      warning.className = 'dp-delete-gate__warning';
      warning.textContent = '\uC0AD\uC81C \uD6C4\uC5D0\uB294 \uBCF5\uAD6C\uD560 \uC218 \uC5C6\uC5B4\uC694. \uC0AD\uC81C\uD560 \uD504\uB85C\uD544\uC774 \uB9DE\uB294\uC9C0 \uD655\uC778\uD574 \uC8FC\uC138\uC694.';
      var options = document.createElement('div');
      options.className = 'dp-delete-gate__options';

      function buildOption(mode, label, detail) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dp-delete-gate__option dp-delete-gate__option--' + mode;
        btn.setAttribute('data-mode', mode);
        var strong = document.createElement('strong');
        strong.textContent = label;
        var span = document.createElement('span');
        span.textContent = detail;
        btn.appendChild(strong);
        btn.appendChild(span);
        return btn;
      }

      var directBtn = buildOption('direct', '\uB2E8\uAC74 \uACB0\uC81C ' + (PROFILE_CARD_MANAGE_COST * 100).toLocaleString('ko-KR') + '\uC6D0', '\uC0AD\uC81C \uC804\uC6A9 1\uD68C \uACB0\uC81C');
      options.appendChild(directBtn);
      var monthlyBtn = buildOption('monthly', '\uC6D4\uC815\uC11D\uC73C\uB85C \uC0AD\uC81C', '\uBCF4\uC720 \uC6D4\uC815\uC11D\uC5D0\uC11C ' + (PROFILE_CARD_MANAGE_MONTHLY_COST * 10).toLocaleString('ko-KR') + '\uC6D0 \uC0C1\uB2F9\uC744 \uC0AC\uC6A9');
      options.appendChild(monthlyBtn);
      var familyBtn = null;
      if (isFamilyPlan) {
        directBtn.hidden = true;
        monthlyBtn.hidden = true;
        familyBtn = buildOption('family', '프로필 삭제', 'Family 이용권으로 무료 진행');
        options.appendChild(familyBtn);
      }

      var foot = document.createElement('div');
      foot.className = 'dp-delete-gate__foot';
      var status = document.createElement('div');
      status.className = 'dp-delete-gate__status';
      status.textContent = isFamilyPlan ? 'Family 이용권을 적용해 삭제합니다.' : '\uC0AD\uC81C\uD560 \uACB0\uC81C \uBC29\uC2DD\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.';
      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'dp-delete-gate__cancel';
      cancel.textContent = '\uCDE8\uC18C';
      foot.appendChild(status);
      foot.appendChild(cancel);
      body.appendChild(copy);
      body.appendChild(warning);
      body.appendChild(options);
      body.appendChild(foot);
      panel.appendChild(head);
      panel.appendChild(body);
      overlay.appendChild(panel);

      var settled = false;
      function done(value) {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKey);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(value || null);
      }
      function onKey(event) {
        if (event && event.key === 'Escape') done(null);
      }
      function pick(mode) {
        status.textContent = '\uACB0\uC81C \uC120\uD0DD\uC744 \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.';
        directBtn.disabled = true;
        monthlyBtn.disabled = true;
        if (familyBtn) familyBtn.disabled = true;
        cancel.disabled = true;
        done(mode);
      }
      overlay.__dpClose = done;
      overlay.addEventListener('click', function(event) {
        if (event && event.target === overlay) done(null);
      });
      directBtn.addEventListener('click', function() { pick('direct'); });
      monthlyBtn.addEventListener('click', function() { pick('monthly'); });
      if (familyBtn) familyBtn.addEventListener('click', function() { pick('family'); });
      cancel.addEventListener('click', function() { done(null); });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(overlay);
      (familyBtn || directBtn || cancel).focus({ preventScroll: true });
    });
  }

  async function _dpRunProfileDeleteGate(profile, profileId, requestId) {
    var choice = await _dpOpenProfileDeleteGate(profile, profileId, requestId);
    if (!choice) return null;
    if (choice === 'family') return {};
    var base = _dpBuildProfileDeletePaymentBase(profileId, requestId);
    if (choice === 'monthly') {
      _dpSetPaymentPending(true, '\uD504\uB85C\uD544 \uCE74\uB4DC \uC0AD\uC81C \uACB0\uC81C \uAD8C\uD55C\uC744 \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4...', 'monthly');
      var monthlyPayload = await _dpRunMonthlyCreditFromMainGate(Object.assign({}, base, {
        paymentMode: 'MOONLIGHT_STONE',
        accessMode: 'moonlight_stone'
      }));
      return _dpNormalizeProfileDeletePaymentContext(monthlyPayload, profileId, requestId, 'MOONLIGHT_STONE');
    }
    if (typeof window._cdRunDirectKrwCheckout !== 'function') {
      throw new Error('\uB2E8\uAC74\uACB0\uC81C \uBAA8\uB4C8\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uD398\uC774\uC9C0\uB97C \uC0C8\uB85C\uACE0\uCE68 \uD55C \uB4A4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.');
    }
    _dpSetPaymentPending(true, '\uB2E8\uAC74\uACB0\uC81C\uB85C \uD504\uB85C\uD544 \uCE74\uB4DC \uC0AD\uC81C \uACB0\uC81C\uB97C \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4...', 'checkout');
    var directPayload = await window._cdRunDirectKrwCheckout(Object.assign({}, base, {
      forceDirectPayment: true,
      internalMainGate: true,
      __cdPaymentGateAuthorized: true,
      checkoutPayload: Object.assign({}, base, {
        paymentType: 'digital_content',
        paymentMode: 'DIRECT_KRW',
        provider: 'PORTONE_V2',
        paymentAmount: base.amountKrw,
        amountKrw: base.amountKrw,
        amountKRW: base.amountKrw,
        cashPrice: base.amountKrw,
        idempotencyKey: requestId,
        orderId: requestId
      })
    }));
    return _dpNormalizeProfileDeletePaymentContext(directPayload, profileId, requestId, 'DIRECT_KRW');
  }

  function _dpRunProfileManageGate(action, profileId, requestId) {
    return new Promise(function(resolve, reject) {
      if (typeof window._cdCoinGatePerUse !== 'function') {
        reject(new Error('결제 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'));
        return;
      }
      var normalizedAction = action === 'delete' ? 'delete' : (action === 'update' ? 'update' : 'create');
      var serviceKey = normalizedAction === 'delete' ? 'profile_card_delete' : (normalizedAction === 'update' ? 'profile_card_update' : 'profile_card_create');
      var reason = normalizedAction === 'delete' ? '\uD504\uB85C\uD544 \uCE74\uB4DC \uC0AD\uC81C' : (normalizedAction === 'update' ? '프로필 카드 수정' : '\uD504\uB85C\uD544 \uCE74\uB4DC \uCD94\uAC00');
      var isDeleteAction = normalizedAction === 'delete';
      window._cdCoinGatePerUse(PROFILE_CARD_MANAGE_COST, reason, function(transactionId, payload) {
        var data = (payload && typeof payload === 'object') ? payload : {};
        var accessGrant = data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
        var consume = data.consume && typeof data.consume === 'object' ? data.consume : {};
        var paymentId = String(transactionId || data.transactionId || data.paymentId || data.purchaseId || requestId);
        resolve({
          requestId: requestId,
          transactionId: paymentId,
          paymentId: paymentId,
          purchaseId: paymentId,
          paymentSettled: true,
          payment: data,
          accessGrant: accessGrant,
          consume: consume,
          _paymentContext: {
            requestId: requestId,
            transactionId: paymentId,
            paymentId: paymentId,
            purchaseId: paymentId,
            paymentSettled: true,
            featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
            profileId: profileId || '',
            actionType: serviceKey,
            profileAction: normalizedAction
          }
        });
      }, function(error) {
        if (error) reject(error);
        else resolve(null);
      }, {
        featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
        requestId: requestId,
        profileId: profileId || '',
        selectedProfileId: profileId || '',
        serviceKey: serviceKey,
        reportType: serviceKey,
        actionType: serviceKey,
        profileAction: normalizedAction,
        action: normalizedAction,
        amountKrw: PROFILE_CARD_MANAGE_COST * 100,
        membershipCreditCost: isDeleteAction ? PROFILE_CARD_MANAGE_MONTHLY_COST : PROFILE_CARD_MANAGE_COST * 10,
        // 프로필 카드 추가/삭제는 이용권으로 결제할 수 없다(D유형) — 추가·삭제 '모두' 이용권 선검사 없이
        // 단건/월정석 결제창으로 직행한다. 과거엔 삭제만 스킵하고 추가는 선검사를 태워, premium/vvip가
        // "이용권으로 커버됨" + 결제수단 전부 숨김을 받은 뒤 서버가 거부하는 막다른 길이 됐다.
        // (무료 카드는 여기 오지 않는다 — profile.js가 402를 준 뒤에만 이 게이트가 열린다.)
        allowedPaymentModes: ['direct', 'monthly'],
        disablePassFirst: true,
        disablePassChoice: true
      });
    });
  }

  /* ──────────────────────────────────────────
     5. UI — Master Destiny Card (상단 카드)
  ────────────────────────────────────────── */
  /* ═══════════════════════════════════════════════════════════════
     CDLevel · 프로필 카드 데일리 레벨 시스템
     - 로컬(localStorage)이 렌더 소스, 서버 /api/rpg/*는 동기화 레이어다.
       서버가 404/503이어도 카드의 레벨 스트립은 절대 사라지지 않는다.
     - 레벨 곡선은 worker/routes/rpg.js의 getExpToNextLevel()과 같은 식을 쓴다.
     - 진행도는 계정 단위다(프로필 카드별 아님). 카드를 추가·삭제해도 레벨은 유지된다.
     - 퀘스트는 사주에 의존하지 않는다. 프로필 카드가 없어도 동작한다.
  ═══════════════════════════════════════════════════════════════ */
  var CD_LEVEL_KEY = 'cd_level_v1';
  var CD_LEVEL_LEGACY_PREFIX = 'cd_rpg_local_progress_v20260617';
  /* 레벨 곡선은 서버(worker/routes/rpg.js)와 같은 식을 써야 로그인 전후로 레벨이 튀지 않는다.
     expToNext(n) = min(200 + 100 × (n-1), 1500) — 초반은 가파르고, 후반은 상한으로 만렙(99)을 열어둔다. */
  var CD_LEVEL_BASE_EXP = 200;
  var CD_LEVEL_GROWTH = 100;
  var CD_LEVEL_STEP_CAP = 1500;
  var CD_LEVEL_MAX = 99;
  // 곡선을 바꿀 때마다 올린다. 이전 곡선(레벨당 100 + 25×(n-1))으로 얻은 레벨을 보존하는 데 쓴다.
  var CD_LEVEL_CURVE_VERSION = 2;
  var CD_LEVEL_PREV_BASE_EXP = 100;
  var CD_LEVEL_PREV_GROWTH = 25;
  var CD_LEVEL_DAY_RETENTION = 14;
  var CD_LEVEL_SYNC_COOLDOWN_MS = 60000;
  var CD_LEVEL_ADOPT_CAP = 5000;
  var _cdLevelStore = null;
  var _cdLevelServer = null;
  var _cdLevelSyncAt = 0;
  var _cdLevelSyncPromise = null;
  var _cdLevelWriteFailed = false;
  /* 지급 종류별 EXP와 하루 한도. 서버 worker/routes/rpg.js의 화이트리스트와 같은 값을 쓴다.
     서버가 정본이고 여기 값은 낙관적 표시용이라, 어긋나면 서버 응답이 덮어쓴다. */
  var CD_LEVEL_AWARD = {
    checkin: { exp: 20, dailyLimit: 1 },
    quest:   { exp: 15, dailyLimit: 3 },
    paid:    { exp: 30, dailyLimit: 3 }
  };
  /* 레벨 마일스톤 월정석 보상표. 서버 worker/routes/rpg.js의 LEVEL_MONTHLY_CREDIT_REWARDS와
     같은 값이어야 하며, 값 일치는 scripts/verify-profile-card-level.mjs가 행 단위로 강제한다.
     서버에 물어보지 않아도(비로그인·오프라인·503) "다음 보상"을 그릴 수 있어야 해서 사본을 둔다 —
     레벨 곡선 상수를 이중으로 두는 것과 같은 이유다. 실제 지급 판단은 언제나 서버가 한다.
     payments/krw = 그 단계를 받는 데 필요한 누적 현금 결제 횟수·금액(단계가 올라갈수록 함께 오른다). */
  var CD_LEVEL_REWARD_TABLE = [
    { level: 5,  credits: 500,  payments: 1,  krw: 3000 },
    { level: 10, credits: 500,  payments: 2,  krw: 8000 },
    { level: 20, credits: 700,  payments: 4,  krw: 20000 },
    { level: 30, credits: 800,  payments: 6,  krw: 35000 },
    { level: 50, credits: 1000, payments: 10, krw: 60000 },
    { level: 70, credits: 1500, payments: 15, krw: 100000 },
    { level: 99, credits: 5000, payments: 30, krw: 200000 }
  ];
  // 월정석 1개 = 10원 (KRW_PER_COIN 100 ÷ MEMBERSHIP_CREDIT_PER_COIN 10)
  var CD_LEVEL_REWARD_KRW_PER_CREDIT = 10;
  // 지급된 월정석의 수명. worker/lib/monthly-credit-lots.js의 MONTHLY_CREDIT_TTL_MS와 같다.
  var CD_LEVEL_REWARD_EXPIRE_DAYS = 30;

  /* 날짜 시드로 매일 3개를 고른다. 사주 무관한 생활 행동이라 프로필이 없어도 성립한다. */
  var CD_LEVEL_QUEST_POOL = [
    { id: 'water',    icon: '💧', text: '물 한 잔으로 하루 시작하기' },
    { id: 'walk',     icon: '🚶', text: '10분 이상 걷거나 스트레칭하기' },
    { id: 'tidy',     icon: '🧹', text: '책상 위 한 곳만 5분 정리하기' },
    { id: 'gratitude',icon: '📝', text: '오늘 감사한 일 하나 적어두기' },
    { id: 'contact',  icon: '💬', text: '가까운 사람에게 먼저 안부 보내기' },
    { id: 'frog',     icon: '🐸', text: '가장 미루던 일 하나를 먼저 끝내기' },
    { id: 'breath',   icon: '🫁', text: '숨 고르기 5분 — 천천히 들이쉬고 내쉬기' },
    { id: 'learn',    icon: '📖', text: '새로 알게 된 것 하나를 기록하기' },
    { id: 'budget',   icon: '📊', text: '오늘 지출 한 번 훑어보기' },
    { id: 'green',    icon: '🥗', text: '채소 한 가지를 오늘 식사에 넣기' },
    { id: 'declutter',icon: '🗑️', text: '안 쓰는 파일이나 물건 하나 비우기' },
    { id: 'sleep',    icon: '😴', text: '잘 시간 30분 전에 화면 내려놓기' }
  ];

  function _cdLevelExpToNext(level) {
    var safe = Math.max(1, Number(level) || 1);
    return Math.min(CD_LEVEL_BASE_EXP + (safe - 1) * CD_LEVEL_GROWTH, CD_LEVEL_STEP_CAP);
  }

  /* 누적 EXP → 레벨 상태. 서버 calculateLevelState()와 결과가 일치해야 한다. */
  function _cdLevelState(totalExp) {
    var remaining = Math.max(0, Number(totalExp) || 0);
    var level = 1;
    while (level < CD_LEVEL_MAX && remaining >= _cdLevelExpToNext(level)) {
      remaining -= _cdLevelExpToNext(level);
      level += 1;
    }
    // 만렙에서는 바를 가득 찬 상태로 둔다(다음 레벨이 없다).
    if (level >= CD_LEVEL_MAX) {
      level = CD_LEVEL_MAX;
      remaining = Math.min(remaining, _cdLevelExpToNext(CD_LEVEL_MAX));
    }
    return {
      currentLevel: level,
      totalExp: Math.max(0, Number(totalExp) || 0),
      currentLevelExp: remaining,
      nextLevelExp: _cdLevelExpToNext(level)
    };
  }

  /* 해당 레벨에 막 도달하는 최소 누적 EXP. 로컬(레벨당 100 고정) 진행분을
     서버 곡선으로 옮길 때 레벨이 내려가 보이지 않도록 환산하는 데 쓴다. */
  function _cdLevelMinExpForLevel(level) {
    var target = Math.max(1, Number(level) || 1);
    var sum = 0;
    for (var i = 1; i < target; i += 1) sum += _cdLevelExpToNext(i);
    return sum;
  }

  function _cdLevelKstDate(offsetDays) {
    var shift = (Number(offsetDays) || 0) * 24 * 60 * 60 * 1000;
    var d = new Date(Date.now() + 9 * 60 * 60 * 1000 + shift);
    return d.getUTCFullYear() + '.'
      + String(d.getUTCMonth() + 1).padStart(2, '0') + '.'
      + String(d.getUTCDate()).padStart(2, '0');
  }

  function _cdLevelEmptyStore() {
    return {
      v: 1,
      totalExp: 0,
      streakDays: 0,
      longestStreakDays: 0,
      lastCheckinDate: '',
      lastSyncedDate: '',
      days: {},
      adopted: false,
      legacyMerged: false,
      curveVersion: CD_LEVEL_CURVE_VERSION
    };
  }

  function _cdLevelNormalizeStore(raw) {
    var store = _cdLevelEmptyStore();
    if (!raw || typeof raw !== 'object') return store;
    store.totalExp = Math.max(0, Number(raw.totalExp) || 0);
    store.streakDays = Math.max(0, Number(raw.streakDays) || 0);
    store.longestStreakDays = Math.max(store.streakDays, Number(raw.longestStreakDays) || 0);
    store.lastCheckinDate = String(raw.lastCheckinDate || '');
    store.lastSyncedDate = String(raw.lastSyncedDate || '');
    store.adopted = !!raw.adopted;
    store.legacyMerged = !!raw.legacyMerged;
    store.curveVersion = Math.max(0, Number(raw.curveVersion) || 0);
    /* 곡선이 바뀌면 같은 누적 EXP 가 더 낮은 레벨로 읽힌다. 눈앞에서 레벨이 내려가는 건
       사용자 입장에서 손해이므로, 이전 곡선으로 계산한 레벨을 유지하는 최소 EXP 로 한 번만 올린다.
       (EXP 를 깎는 방향으로는 절대 움직이지 않는다.) */
    if (store.curveVersion < CD_LEVEL_CURVE_VERSION && store.totalExp > 0) {
      var priorLevel = 1;
      var left = store.totalExp;
      while (priorLevel < CD_LEVEL_MAX) {
        var step = CD_LEVEL_PREV_BASE_EXP + (priorLevel - 1) * CD_LEVEL_PREV_GROWTH;
        if (left < step) break;
        left -= step;
        priorLevel += 1;
      }
      store.totalExp = Math.max(store.totalExp, _cdLevelMinExpForLevel(priorLevel));
    }
    store.curveVersion = CD_LEVEL_CURVE_VERSION;
    if (raw.days && typeof raw.days === 'object') {
      /* 날짜 항목이 무한히 쌓이면 localStorage 쿼터를 밀어내므로 최근분만 남긴다. */
      var keys = Object.keys(raw.days).sort().slice(-CD_LEVEL_DAY_RETENTION);
      for (var i = 0; i < keys.length; i += 1) {
        var day = raw.days[keys[i]];
        if (!day || typeof day !== 'object') continue;
        store.days[keys[i]] = {
          checkin: !!day.checkin,
          quests: Array.isArray(day.quests) ? day.quests.map(String) : [],
          paid: Array.isArray(day.paid) ? day.paid.map(String) : []
        };
      }
    }
    return store;
  }

  /* 예전 사주 RPG가 프로필별로 남긴 진행분을 계정 단위로 한 번만 흡수한다.
     여러 프로필에 흩어져 있으면 합산이 아니라 최댓값을 쓴다(과다 지급 방지). */
  function _cdLevelMergeLegacy(store) {
    if (store.legacyMerged) return store;
    store.legacyMerged = true;
    try {
      if (!window.localStorage) return store;
      var bestExp = 0;
      var bestStreak = 0;
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i) || '';
        if (key.indexOf(CD_LEVEL_LEGACY_PREFIX) !== 0) continue;
        var legacy = JSON.parse(localStorage.getItem(key) || 'null');
        if (!legacy || typeof legacy !== 'object') continue;
        bestExp = Math.max(bestExp, Number(legacy.totalExp) || 0);
        bestStreak = Math.max(bestStreak, Number(legacy.longestStreakDays) || 0);
      }
      if (bestExp > 0) {
        /* 예전 곡선은 레벨당 100 고정이었다. 같은 레벨을 유지하는 최소 EXP로 환산한다. */
        var legacyLevel = Math.floor(bestExp / 100) + 1;
        store.totalExp = Math.max(store.totalExp, _cdLevelMinExpForLevel(legacyLevel));
      }
      store.longestStreakDays = Math.max(store.longestStreakDays, bestStreak);
    } catch (e) {}
    return store;
  }

  function _cdLevelRead() {
    if (_cdLevelStore) return _cdLevelStore;
    var parsed = null;
    try {
      parsed = window.localStorage ? JSON.parse(localStorage.getItem(CD_LEVEL_KEY) || 'null') : null;
    } catch (e) {
      parsed = null;
    }
    var fresh = !parsed;
    _cdLevelStore = _cdLevelNormalizeStore(parsed);
    if (fresh) {
      _cdLevelMergeLegacy(_cdLevelStore);
      _cdLevelWrite(_cdLevelStore);
    }
    return _cdLevelStore;
  }

  /* 쓰기 실패(사파리 프라이빗 모드·쿼터 초과)를 조용히 삼키지 않는다.
     호출부가 성공 여부를 보고 사용자에게 알릴 수 있어야 한다. */
  function _cdLevelWrite(store) {
    _cdLevelStore = store;
    try {
      if (!window.localStorage) return false;
      localStorage.setItem(CD_LEVEL_KEY, JSON.stringify(store));
      _cdLevelWriteFailed = false;
      return true;
    } catch (e) {
      _cdLevelWriteFailed = true;
      return false;
    }
  }

  function _cdLevelDay(store, dateKey) {
    if (!store.days[dateKey]) store.days[dateKey] = { checkin: false, quests: [], paid: [] };
    return store.days[dateKey];
  }

  function _cdLevelHash(text) {
    var h = 0;
    var str = String(text || '');
    for (var i = 0; i < str.length; i += 1) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  /* 사주 RPG 시트는 오행 기반으로 개인화된 퀘스트를 만든다. 그쪽이 열려 있으면 그 목록을
     카드에도 그대로 쓴다 — 두 화면이 다른 퀘스트를 보여주면 같은 하루치 EXP 예산을 두고
     서로 어긋나기 때문이다. 날짜가 바뀌면 자동으로 버린다. */
  var _cdLevelPublished = null;
  function _cdLevelPublishQuests(list) {
    if (!Array.isArray(list) || !list.length) return;
    var normalized = list.slice(0, 3).map(function(quest) {
      return {
        id: String(quest.questId || quest.id || ''),
        icon: String(quest.icon || '✦'),
        text: String(quest.text || '')
      };
    }).filter(function(quest) { return quest.id && quest.text; });
    if (!normalized.length) return;
    _cdLevelPublished = { dateKey: _cdLevelKstDate(0), quests: normalized };
  }

  function _cdLevelTodayQuests() {
    var dateKey = _cdLevelKstDate(0);
    if (_cdLevelPublished && _cdLevelPublished.dateKey === dateKey) return _cdLevelPublished.quests;
    var picked = [];
    var used = {};
    var cursor = _cdLevelHash(dateKey);
    while (picked.length < 3 && picked.length < CD_LEVEL_QUEST_POOL.length) {
      var idx = cursor % CD_LEVEL_QUEST_POOL.length;
      if (!used[idx]) {
        used[idx] = true;
        picked.push(CD_LEVEL_QUEST_POOL[idx]);
      }
      cursor += 7;
    }
    return picked;
  }

  /* 서버가 알려준 수령 상태(있으면). 없으면 레벨만 보고 낙관적으로 그린다 —
     이 값은 안내용이고 실제 지급 판정은 서버가 한다. */
  var _cdLevelRewardStatus = null;

  function _cdLevelGrantedRewardSet() {
    var set = {};
    var list = (_cdLevelRewardStatus && _cdLevelRewardStatus.grantedLevels) || [];
    for (var i = 0; i < list.length; i += 1) set[Number(list[i])] = true;
    return set;
  }

  /* 아직 못 받은 첫 마일스톤. 전부 받았거나 표를 다 지났으면 null. */
  function _cdLevelNextReward(level) {
    var granted = _cdLevelGrantedRewardSet();
    for (var i = 0; i < CD_LEVEL_REWARD_TABLE.length; i += 1) {
      var row = CD_LEVEL_REWARD_TABLE[i];
      if (!granted[row.level] && row.level > level) return row;
    }
    return null;
  }

  /* 카드 렌더에 필요한 값 전부. 네트워크를 타지 않으므로 항상 즉시 반환된다. */
  function _cdLevelSnapshot() {
    var store = _cdLevelRead();
    var dateKey = _cdLevelKstDate(0);
    var day = store.days[dateKey] || { checkin: false, quests: [], paid: [] };
    var state = _cdLevelState(store.totalExp);
    return {
      currentLevel: state.currentLevel,
      totalExp: state.totalExp,
      currentLevelExp: state.currentLevelExp,
      nextLevelExp: state.nextLevelExp,
      streakDays: store.streakDays,
      longestStreakDays: store.longestStreakDays,
      checkedInToday: !!day.checkin,
      completedQuestIds: (day.quests || []).slice(),
      quests: _cdLevelTodayQuests(),
      synced: !!_cdLevelServer,
      loggedIn: _dpIsLoggedInScope(),
      writeFailed: _cdLevelWriteFailed,
      nextReward: _cdLevelNextReward(state.currentLevel)
    };
  }

  /* 로컬에 먼저 반영하고(=낙관적) 서버에는 뒤따라 알린다.
     서버가 실패해도 사용자 진행은 로컬에 남고, 다음 sync에서 서버값이 정본이 된다. */
  function _cdLevelAward(kind, key) {
    var rule = CD_LEVEL_AWARD[kind];
    if (!rule) return { changed: false };
    var store = _cdLevelRead();
    var dateKey = _cdLevelKstDate(0);
    var day = _cdLevelDay(store, dateKey);
    var beforeLevel = _cdLevelState(store.totalExp).currentLevel;
    var safeKey = String(key || '');
    var changed = false;

    if (kind === 'checkin') {
      if (!day.checkin) {
        day.checkin = true;
        var yesterday = _cdLevelKstDate(-1);
        store.streakDays = store.lastCheckinDate === yesterday ? store.streakDays + 1 : 1;
        store.longestStreakDays = Math.max(store.longestStreakDays, store.streakDays);
        store.lastCheckinDate = dateKey;
        store.totalExp += rule.exp;
        changed = true;
      }
    } else {
      var bucket = kind === 'paid' ? day.paid : day.quests;
      if (bucket.indexOf(safeKey) < 0 && bucket.length < rule.dailyLimit) {
        bucket.push(safeKey);
        store.totalExp += rule.exp;
        changed = true;
      }
    }

    if (!changed) return { changed: false };

    var written = _cdLevelWrite(store);
    var afterLevel = _cdLevelState(store.totalExp).currentLevel;
    _cdLevelPostAward(kind, safeKey || dateKey);
    return {
      changed: true,
      written: written,
      leveledUp: afterLevel > beforeLevel,
      level: afterLevel,
      gainedExp: rule.exp
    };
  }

  function _cdLevelPostAward(kind, key) {
    if (!_dpIsLoggedInScope()) return Promise.resolve(null);
    return _dpFetchJsonWithFallback('/api/rpg/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: kind, key: key })
    }, { timeoutMs: 8000 }).then(function(res) {
      var data = (res && res.ok && res.data) ? res.data : null;
      if (data && data.progress) _cdLevelApplyServer(data.progress);
      /* 서버는 예전부터 leveledUp·monthlyCreditGrants 를 실어 보냈는데 여기서 통째로 버려서,
         월정석이 실제로 지급돼도 화면에는 아무 일도 일어나지 않았다. */
      if (data) {
        var grants = Array.isArray(data.monthlyCreditGrants) ? data.monthlyCreditGrants : [];
        if (grants.length) _cdLevelRewardStatus = null; // 다음 시트 열람에서 서버 상태를 다시 받는다
        if (grants.length || data.leveledUp === true) {
          _dpCelebrateLevelUp({
            level: (data.progress && Number(data.progress.currentLevel)) || _cdLevelSnapshot().currentLevel,
            grants: grants
          });
        }
        _dpRefreshLevelStrip();
      }
      return res;
    }).catch(function() { return null; });
  }

  /* 서버가 정본이다. 다만 로컬이 앞서 있으면(오프라인 중 적립) 큰 쪽을 남긴다. */
  function _cdLevelApplyServer(progress) {
    if (!progress || typeof progress !== 'object') return;
    _cdLevelServer = progress;
    var store = _cdLevelRead();
    store.totalExp = Math.max(store.totalExp, Math.max(0, Number(progress.totalExp) || 0));
    store.streakDays = Math.max(store.streakDays, Math.max(0, Number(progress.streakDays) || 0));
    store.longestStreakDays = Math.max(store.longestStreakDays, Math.max(0, Number(progress.longestStreakDays) || 0));
    _cdLevelWrite(store);
  }

  /* 로그인 계정에 로컬 진행분을 한 번만 넘긴다. 서버가 rewardLog로 1회성을 보장하므로
     여기 플래그는 불필요한 왕복을 줄이는 용도일 뿐이다. */
  function _cdLevelAdopt() {
    var store = _cdLevelRead();
    if (store.adopted || !_dpIsLoggedInScope() || store.totalExp <= 0) return Promise.resolve(null);
    return _dpFetchJsonWithFallback('/api/rpg/adopt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        localTotalExp: Math.min(store.totalExp, CD_LEVEL_ADOPT_CAP),
        localStreakDays: store.streakDays,
        localLongestStreakDays: store.longestStreakDays
      })
    }, { timeoutMs: 8000 }).then(function(res) {
      if (res && res.ok) {
        store.adopted = true;
        _cdLevelWrite(store);
        if (res.data && res.data.progress) _cdLevelApplyServer(res.data.progress);
      }
      return res;
    }).catch(function() { return null; });
  }

  /* 메인 홈은 트래픽이 가장 높은 화면이라 여기서 서버를 자주 부르면 그 자체가 부하가 된다.
     그래서 세 겹으로 막는다 — in-flight 병합, 60초 쿨다운, 그리고 같은 날 이미 맞췄으면 스킵.
     renderMasterCard()가 프로필 저장·전환·삭제마다 다시 불리는 것도 이 가드가 흡수한다.
     읽는 값은 누적 EXP·스트릭 셋뿐이라 /status가 아니라 경량 /progress를 쓴다. */
  function _cdLevelSync(options) {
    var opts = options || {};
    if (!_dpIsLoggedInScope()) return Promise.resolve(null);
    if (_cdLevelSyncPromise) return _cdLevelSyncPromise;
    if (!opts.force) {
      if (Date.now() - _cdLevelSyncAt < CD_LEVEL_SYNC_COOLDOWN_MS) return Promise.resolve(null);
      if (_cdLevelRead().lastSyncedDate === _cdLevelKstDate(0)) return Promise.resolve(null);
    }
    _cdLevelSyncAt = Date.now();
    _cdLevelSyncPromise = _cdLevelAdopt().then(function() {
      return _dpFetchJsonWithFallback('/api/rpg/progress', { method: 'GET' }, { timeoutMs: 8000 });
    }).then(function(res) {
      if (res && res.ok && res.data && res.data.progress) {
        _cdLevelApplyServer(res.data.progress);
        var store = _cdLevelRead();
        store.lastSyncedDate = _cdLevelKstDate(0);
        _cdLevelWrite(store);
      }
      return res;
    }).catch(function() {
      return null;
    }).then(function(res) {
      _cdLevelSyncPromise = null;
      return res;
    });
    return _cdLevelSyncPromise;
  }

  /* 첫 페인트를 밀어내지 않도록 한가할 때로 미룬다(runVersionProbe와 같은 방식). */
  function _cdLevelSyncWhenIdle() {
    var run = function() { _cdLevelSync().then(function(res) { if (res) _dpRefreshLevelStrip(); }); };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 4000 });
    } else {
      setTimeout(run, 1500);
    }
  }

  window.CDLevel = {
    snapshot: _cdLevelSnapshot,
    levelState: _cdLevelState,
    expToNext: _cdLevelExpToNext,
    minExpForLevel: _cdLevelMinExpForLevel,
    kstDate: _cdLevelKstDate,
    award: _cdLevelAward,
    sync: _cdLevelSync,
    publishQuests: _cdLevelPublishQuests,
    rewardTable: CD_LEVEL_REWARD_TABLE,
    buildStrip: function() { return _dpBuildLevelStrip(); },
    // 보상 안내·연출은 순수 표시 계층이다(지급은 서버만 한다). 다른 화면에서도 같은 안내를 열 수 있게 노출한다.
    openRewardSheet: function() { return _dpOpenLevelRewardSheet(); },
    celebrate: function(options) { return _dpCelebrateLevelUp(options); }
  };

  /* ── 프로필 카드 레벨 스트립 UI ── */
  var DP_LEVEL_MARKER = 'profile-card-level-v20260721';
  var _dpLevelQuestsOpen = false;
  var _dpLevelBootDone = false;

  function _dpEnsureLevelStyles() {
    if (document.getElementById('dpLevelStyles')) return;
    var style = document.createElement('style');
    style.id = 'dpLevelStyles';
    style.textContent = ''
      + '.dp-lvl{margin-top:14px;padding:12px 13px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,215,0,.22);}'
      + '.dp-lvl__top{display:flex;align-items:center;justify-content:space-between;gap:8px;}'
      + '.dp-lvl__badge{display:inline-flex;align-items:center;gap:5px;font-size:.78rem;font-weight:900;color:#FFD700;letter-spacing:.02em;}'
      + '.dp-lvl__streak{font-size:.7rem;font-weight:800;color:rgba(255,235,180,.86);}'
      + '.dp-lvl__bar{position:relative;height:8px;margin-top:9px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden;}'
      /* 레이아웃을 다시 잡지 않도록 width가 아니라 scaleX로 채운다. */
      + '.dp-lvl__fill{display:block;width:100%;height:100%;border-radius:999px;background:linear-gradient(90deg,#FFD700,#ffb347);transform-origin:left center;transition:transform .45s ease;}'
      + '.dp-lvl__meta{margin-top:6px;font-size:.68rem;font-weight:700;color:rgba(226,232,240,.76);}'
      + '.dp-lvl__toggle{width:100%;min-height:44px;margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(255,255,255,.06);color:#f8fafc;font-size:.76rem;font-weight:800;cursor:pointer;touch-action:manipulation;}'
      + '.dp-lvl__toggle b{color:#FFD700;}'
      + '.dp-lvl__chev{transition:transform .25s ease;}'
      + '.dp-lvl__toggle[aria-expanded="true"] .dp-lvl__chev{transform:rotate(180deg);}'
      + '.dp-lvl__quests{display:grid;gap:7px;margin-top:9px;}'
      + '.dp-lvl__quest{width:100%;min-height:44px;display:flex;align-items:center;gap:9px;padding:9px 11px;border:1px solid rgba(255,255,255,.13);border-radius:10px;background:rgba(255,255,255,.05);color:#e8edf7;font-size:.76rem;font-weight:700;line-height:1.35;text-align:left;cursor:pointer;touch-action:manipulation;}'
      + '.dp-lvl__quest[aria-pressed="true"]{border-color:rgba(255,215,0,.44);background:rgba(255,215,0,.12);color:#ffe9a8;text-decoration:line-through;text-decoration-color:rgba(255,215,0,.5);cursor:default;}'
      + '.dp-lvl__quest-exp{margin-left:auto;flex-shrink:0;font-size:.66rem;font-weight:900;color:#FFD700;}'
      + '.dp-lvl__note{margin-top:9px;font-size:.66rem;line-height:1.5;color:rgba(203,213,225,.72);}'
      + '.dp-lvl__note--warn{color:#fca5a5;}'
      /* 보상 요약 1줄. 달빛(월정석) 계열로 골드 EXP 바와 역할을 구분한다. */
      + '.dp-lvl__reward{width:100%;min-height:44px;margin-top:9px;display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid rgba(196,181,253,.34);border-radius:10px;background:linear-gradient(120deg,rgba(124,101,214,.20),rgba(255,215,0,.08));color:#e9e4ff;font-size:.72rem;font-weight:800;line-height:1.35;text-align:left;cursor:pointer;touch-action:manipulation;}'
      + '.dp-lvl__reward-moon{flex-shrink:0;font-size:.86rem;}'
      + '.dp-lvl__reward-amt{margin-left:auto;flex-shrink:0;display:inline-flex;align-items:center;gap:4px;font-size:.72rem;font-weight:900;color:#d9cbff;}'
      + '.dp-lvl__reward-arrow{color:rgba(217,203,255,.7);font-weight:700;}'
      + '.dp-lvl__reward--done{cursor:pointer;color:rgba(233,228,255,.86);}'
      /* 보상 시트 — 기존 .dp-delete-gate 오버레이 관례를 그대로 따른다(스크롤락 없음). */
      + '.dp-lvlrw{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(5,8,18,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);}'
      + '.dp-lvlrw__card{width:min(430px,100%);max-height:min(86vh,760px);overflow-y:auto;-webkit-overflow-scrolling:touch;border-radius:18px;border:1px solid rgba(196,181,253,.34);background:linear-gradient(160deg,rgba(22,18,48,.99),rgba(12,10,28,.99));box-shadow:0 26px 80px rgba(0,0,0,.5);padding:20px 18px 18px;color:#f2effd;}'
      + '.dp-lvlrw__head{display:flex;align-items:flex-start;gap:10px;}'
      + '.dp-lvlrw__title{margin:0;font-size:1.02rem;font-weight:900;letter-spacing:.01em;color:#fff;}'
      + '.dp-lvlrw__sub{margin:6px 0 0;font-size:.74rem;line-height:1.6;color:rgba(221,214,254,.82);}'
      + '.dp-lvlrw__close{margin-left:auto;flex-shrink:0;width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#e9e4ff;font-size:1rem;font-weight:800;line-height:1;cursor:pointer;touch-action:manipulation;}'
      + '.dp-lvlrw__mine{margin-top:14px;padding:9px 12px;border-radius:10px;border:1px solid rgba(196,181,253,.28);background:rgba(196,181,253,.10);font-size:.72rem;font-weight:700;color:rgba(233,228,255,.9);}'
      + '.dp-lvlrw__mine b{color:#FFD700;font-weight:900;}'
      + '.dp-lvlrw__list{display:grid;gap:7px;margin-top:11px;}'
      + '.dp-lvlrw__row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:11px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.04);}'
      + '.dp-lvlrw__row--done{border-color:rgba(134,239,172,.34);background:rgba(134,239,172,.09);}'
      + '.dp-lvlrw__row--next{border-color:rgba(255,215,0,.44);background:rgba(255,215,0,.10);}'
      + '.dp-lvlrw__lv{flex-shrink:0;min-width:52px;font-size:.78rem;font-weight:900;color:#FFD700;}'
      + '.dp-lvlrw__row--done .dp-lvlrw__lv{color:rgba(187,247,208,.95);}'
      + '.dp-lvlrw__amt{font-size:.76rem;font-weight:800;color:#efeaff;}'
      + '.dp-lvlrw__krw{display:block;margin-top:2px;font-size:.64rem;font-weight:700;color:rgba(203,213,225,.66);}'
      + '.dp-lvlrw__right{margin-left:auto;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:2px;text-align:right;}'
      + '.dp-lvlrw__state{font-size:.66rem;font-weight:800;color:rgba(221,214,254,.72);white-space:nowrap;}'
      + '.dp-lvlrw__req{font-size:.6rem;font-weight:700;color:rgba(203,213,225,.58);white-space:nowrap;}'
      + '.dp-lvlrw__row--done .dp-lvlrw__state{color:#86efac;}'
      + '.dp-lvlrw__row--next .dp-lvlrw__state{color:#FFD700;}'
      + '.dp-lvlrw__terms{margin:14px 0 0;padding:12px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);}'
      + '.dp-lvlrw__terms li{margin:0 0 6px;padding-left:14px;position:relative;font-size:.7rem;line-height:1.6;color:rgba(214,211,240,.82);list-style:none;}'
      + '.dp-lvlrw__terms li:last-child{margin-bottom:0;}'
      + '.dp-lvlrw__terms li::before{content:"·";position:absolute;left:4px;color:rgba(196,181,253,.8);font-weight:900;}'
      + '.dp-lvlrw__claim{width:100%;min-height:48px;margin-top:14px;border-radius:12px;border:1px solid rgba(255,215,0,.5);background:linear-gradient(120deg,rgba(255,215,0,.24),rgba(196,181,253,.22));color:#fff6d8;font-size:.84rem;font-weight:900;cursor:pointer;touch-action:manipulation;}'
      + '.dp-lvlrw__claim[disabled]{opacity:.6;cursor:default;}'
      /* 축하 연출 */
      + '.dp-lvlup{position:fixed;inset:0;z-index:2147483400;display:flex;align-items:center;justify-content:center;padding:18px;background:radial-gradient(circle at 50% 42%,rgba(76,58,150,.62),rgba(5,7,18,.9) 62%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:0;transition:opacity .3s ease;}'
      + '.dp-lvlup--in{opacity:1;}'
      + '.dp-lvlup__card{position:relative;width:min(360px,100%);padding:26px 22px 20px;border-radius:22px;border:1px solid rgba(255,215,0,.36);background:linear-gradient(165deg,rgba(30,24,64,.98),rgba(12,10,28,.98));box-shadow:0 28px 90px rgba(0,0,0,.55),0 0 60px rgba(196,181,253,.18);text-align:center;color:#fff;transform:scale(.9);opacity:0;transition:transform .42s cubic-bezier(.16,1,.3,1),opacity .32s ease;}'
      + '.dp-lvlup--in .dp-lvlup__card{transform:scale(1);opacity:1;}'
      + '.dp-lvlup__eyebrow{margin:0;font-size:.68rem;font-weight:900;letter-spacing:.18em;color:rgba(255,215,0,.9);}'
      + '.dp-lvlup__lv{margin:8px 0 0;font-size:1.9rem;font-weight:900;line-height:1.1;color:#FFD700;text-shadow:0 0 24px rgba(255,215,0,.36);}'
      + '.dp-lvlup__stage{position:relative;height:96px;margin:10px 0 2px;display:flex;align-items:center;justify-content:center;}'
      + '.dp-lvlup__moon{font-size:2.6rem;filter:drop-shadow(0 0 18px rgba(196,181,253,.7));animation:dpLvlUpMoonPulse 1.6s ease-in-out infinite;}'
      + '.dp-lvlup__spark{position:absolute;left:50%;top:50%;font-size:1rem;opacity:0;animation:dpLvlUpGather .95s ease-out forwards;}'
      + '.dp-lvlup__amt{margin:6px 0 0;font-size:1.34rem;font-weight:900;color:#e6dcff;}'
      + '.dp-lvlup__amt b{color:#FFD700;}'
      + '.dp-lvlup__balance{margin:8px 0 0;min-height:18px;font-size:.72rem;font-weight:800;color:rgba(214,211,240,.8);}'
      + '.dp-lvlup__hint{margin:10px 0 0;font-size:.66rem;line-height:1.6;color:rgba(203,213,225,.66);}'
      + '.dp-lvlup__close{width:100%;min-height:44px;margin-top:14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);color:#f1eeff;font-size:.78rem;font-weight:800;cursor:pointer;touch-action:manipulation;}'
      + '@keyframes dpLvlUpGather{0%{opacity:0;transform:translate(-50%,-50%) translate(var(--dx),var(--dy)) scale(.5);}30%{opacity:1;}100%{opacity:0;transform:translate(-50%,-50%) scale(.2);}}'
      + '@keyframes dpLvlUpMoonPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.09);}}'
      + '@media (prefers-reduced-motion: reduce){.dp-lvl__fill,.dp-lvl__chev{transition:none;}'
        + '.dp-lvlup,.dp-lvlup__card{transition:none;opacity:1;transform:none;}'
        + '.dp-lvlup__spark{display:none;}.dp-lvlup__moon{animation:none;}}';
    document.head.appendChild(style);
  }

  function _dpBuildLevelStrip() {
    var snap = _cdLevelSnapshot();
    var pct = snap.nextLevelExp > 0
      ? Math.min(100, Math.round((snap.currentLevelExp / snap.nextLevelExp) * 100))
      : 0;
    var doneCount = snap.completedQuestIds.length;
    var note = '';
    if (snap.writeFailed) {
      note = '<div class="dp-lvl__note dp-lvl__note--warn">이 브라우저에 진행을 저장하지 못했습니다. 시크릿 모드라면 일반 창에서 열어주세요.</div>';
    } else if (!snap.loggedIn) {
      note = '<div class="dp-lvl__note">로그인하면 기기가 바뀌어도 이어집니다.</div>';
    }

    /* 보상 요약 1줄. 레벨을 올리면 월정석이 나온다는 사실 자체를 여기서 처음 알린다 —
       그동안 서버는 지급하고 있었는데 화면 어디에도 설명이 없었다. */
    var rewardLabel;
    var rewardAmount = '';
    if (!snap.loggedIn) {
      rewardLabel = '레벨 보상 · 로그인 후 지급';
    } else if (snap.nextReward) {
      rewardLabel = '다음 보상 · Lv.' + snap.nextReward.level;
      rewardAmount = '월정석 ' + snap.nextReward.credits.toLocaleString('ko-KR');
    } else {
      rewardLabel = '모든 레벨 보상을 받았어요';
    }
    var rewardHtml = '<button type="button" class="dp-lvl__reward'
      + (snap.nextReward ? '' : ' dp-lvl__reward--done') + '" data-dp-level-reward'
      + ' aria-label="레벨 보상 안내 열기">'
      + '<span class="dp-lvl__reward-moon" aria-hidden="true">🌙</span>'
      + '<span>' + rewardLabel + '</span>'
      + (rewardAmount ? '<span class="dp-lvl__reward-amt">' + rewardAmount + '</span>' : '<span class="dp-lvl__reward-amt"></span>')
      + '<span class="dp-lvl__reward-arrow" aria-hidden="true">›</span>'
      + '</button>';

    var questsHtml = snap.quests.map(function(quest) {
      var done = snap.completedQuestIds.indexOf(quest.id) >= 0;
      return '<button type="button" class="dp-lvl__quest" data-dp-quest="' + _esc(quest.id) + '"'
        + ' aria-pressed="' + (done ? 'true' : 'false') + '"' + (done ? ' disabled' : '') + '>'
        + '<span aria-hidden="true">' + quest.icon + '</span>'
        + '<span>' + _esc(quest.text) + '</span>'
        + '<span class="dp-lvl__quest-exp">+' + CD_LEVEL_AWARD.quest.exp + '</span>'
        + '</button>';
    }).join('');

    return '<div class="dp-lvl" data-cd-level-marker="' + DP_LEVEL_MARKER + '">'
      + '<div class="dp-lvl__top">'
        + '<span class="dp-lvl__badge">✦ Lv.' + snap.currentLevel + '</span>'
        + (snap.streakDays > 0 ? '<span class="dp-lvl__streak">🔥 ' + snap.streakDays + '일 연속</span>' : '')
      + '</div>'
      + '<div class="dp-lvl__bar" role="progressbar" aria-label="경험치"'
        + ' aria-valuemin="0" aria-valuemax="' + snap.nextLevelExp + '" aria-valuenow="' + snap.currentLevelExp + '">'
        + '<span class="dp-lvl__fill" style="transform:scaleX(' + (pct / 100) + ')"></span>'
      + '</div>'
      + '<div class="dp-lvl__meta">' + snap.currentLevelExp + ' / ' + snap.nextLevelExp + ' EXP</div>'
      + rewardHtml
      + '<button type="button" class="dp-lvl__toggle" aria-expanded="' + (_dpLevelQuestsOpen ? 'true' : 'false') + '"'
        + ' aria-controls="dpLvlQuests" aria-label="오늘의 퀘스트 ' + (_dpLevelQuestsOpen ? '접기' : '펼치기') + '">'
        + '<span>오늘의 퀘스트 <b>' + doneCount + '/' + snap.quests.length + '</b></span>'
        + '<span class="dp-lvl__chev" aria-hidden="true">▾</span>'
      + '</button>'
      + '<div class="dp-lvl__quests" id="dpLvlQuests"' + (_dpLevelQuestsOpen ? '' : ' hidden') + '>' + questsHtml + '</div>'
      + note
    + '</div>';
  }

  /* 카드 전체를 다시 그리면 열려 있던 메뉴·포커스가 날아가므로 레벨 블록만 바꿔 끼운다. */
  function _dpRefreshLevelStrip() {
    var root = document.querySelector('#dpMasterCard .dp-lvl');
    if (!root) return;
    var holder = document.createElement('div');
    holder.innerHTML = _dpBuildLevelStrip();
    var next = holder.firstElementChild;
    if (next && root.parentNode) root.parentNode.replaceChild(next, root);
  }

  function _dpBindLevelEvents(el) {
    if (!el || el.__dpLevelBound) return;
    el.__dpLevelBound = true;
    el.addEventListener('click', function(event) {
      var toggle = event.target && event.target.closest ? event.target.closest('.dp-lvl__toggle') : null;
      if (toggle) {
        _dpLevelQuestsOpen = !_dpLevelQuestsOpen;
        _dpRefreshLevelStrip();
        return;
      }
      var rewardBtn = event.target && event.target.closest ? event.target.closest('[data-dp-level-reward]') : null;
      if (rewardBtn) {
        _dpOpenLevelRewardSheet();
        return;
      }
      var questBtn = event.target && event.target.closest ? event.target.closest('[data-dp-quest]') : null;
      if (!questBtn || questBtn.disabled) return;
      var result = _cdLevelAward('quest', questBtn.getAttribute('data-dp-quest') || '');
      if (result.changed) {
        _dpRefreshLevelStrip();
        _dpNoteLocalLevelUp(result);
      }
    });
  }

  /* ── 레벨 보상 안내 시트 ── */

  function _dpLevelRewardKrw(credits) {
    return (credits * CD_LEVEL_REWARD_KRW_PER_CREDIT).toLocaleString('ko-KR');
  }

  function _dpLevelRewardWon(amount) {
    return (Number(amount) || 0).toLocaleString('ko-KR') + '원';
  }

  /* 내 결제 실적 한 줄. 서버가 준 값이 없으면(비로그인·degraded) 아예 그리지 않는다 —
     0으로 보여주면 "결제했는데 0으로 나온다"는 오해가 생긴다. */
  function _dpBuildLevelRewardProgress(status) {
    if (!status || status.degraded === true || typeof status.paymentCount !== 'number') return '';
    var note = status.accountAgeOk === false ? ' · 가입 14일 경과 대기' : '';
    return '<div class="dp-lvlrw__mine">내 결제 실적 · <b>' + status.paymentCount.toLocaleString('ko-KR') + '회</b>'
      + ' · <b>' + _dpLevelRewardWon(status.paidKrw) + '</b>' + note + '</div>';
  }

  /* 로컬 표만으로 그리는 기본형. 서버 상태를 못 받아도 시트가 비지 않게 하는 것이 목적이다. */
  function _dpBuildLevelRewardRows(status, currentLevel) {
    var granted = {};
    var claimable = {};
    var i;
    if (status && Array.isArray(status.grantedLevels)) {
      for (i = 0; i < status.grantedLevels.length; i += 1) granted[Number(status.grantedLevels[i])] = true;
    }
    if (status && Array.isArray(status.claimableLevels)) {
      for (i = 0; i < status.claimableLevels.length; i += 1) claimable[Number(status.claimableLevels[i])] = true;
    }
    var unknown = !status || status.degraded === true;
    var hasStats = !unknown && typeof status.paymentCount === 'number';
    var nextMarked = false;

    return CD_LEVEL_REWARD_TABLE.map(function(row) {
      var cls = 'dp-lvlrw__row';
      var state;
      if (granted[row.level]) {
        cls += ' dp-lvlrw__row--done';
        state = '수령 완료';
      } else if (unknown) {
        state = currentLevel >= row.level ? '도달' : 'Lv.' + row.level + ' 필요';
      } else if (claimable[row.level]) {
        cls += ' dp-lvlrw__row--next';
        state = '수령 대기';
      } else if (currentLevel >= row.level && hasStats) {
        /* 레벨은 도달했는데 결제 실적이 모자란 단계. 무엇이 얼마나 남았는지 그대로 보여준다. */
        cls += ' dp-lvlrw__row--next';
        state = status.accountAgeOk === false
          ? '가입 14일 대기'
          : (status.paymentCount < row.payments
            ? '결제 ' + status.paymentCount + '/' + row.payments + '회'
            : '누적 ' + Math.round(status.paidKrw / 1000) + '/' + Math.round(row.krw / 1000) + '천원');
      } else if (!nextMarked) {
        nextMarked = true;
        cls += ' dp-lvlrw__row--next';
        state = '다음 목표';
      } else {
        state = '잠김';
      }
      /* 요구 실적을 보상 밑에 붙이면 줄이 넘쳐 행이 3줄로 깨진다. 오른쪽 열에 상태와 세로로 쌓는다. */
      return '<div class="' + cls + '">'
        + '<span class="dp-lvlrw__lv">Lv.' + row.level + '</span>'
        + '<span class="dp-lvlrw__amt">월정석 ' + row.credits.toLocaleString('ko-KR') + '개'
          + '<span class="dp-lvlrw__krw">' + _dpLevelRewardKrw(row.credits) + '원 상당</span>'
        + '</span>'
        + '<span class="dp-lvlrw__right">'
          + '<span class="dp-lvlrw__state">' + state + '</span>'
          + '<span class="dp-lvlrw__req">결제 ' + row.payments + '회 · ' + _dpLevelRewardWon(row.krw) + '</span>'
        + '</span>'
      + '</div>';
    }).join('');
  }

  function _dpOpenLevelRewardSheet() {
    if (document.querySelector('.dp-lvlrw')) return;
    _dpEnsureLevelStyles();

    var snap = _cdLevelSnapshot();
    var overlay = document.createElement('div');
    overlay.className = 'dp-lvlrw';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '레벨 보상 안내');

    function render(status) {
      var claimCount = (status && Array.isArray(status.claimableLevels)) ? status.claimableLevels.length : 0;
      var pendingCount = (status && Array.isArray(status.pendingLevels)) ? status.pendingLevels.length : 0;
      var loadFailed = !!(status && status.degraded);
      overlay.innerHTML = '<div class="dp-lvlrw__card">'
        + '<div class="dp-lvlrw__head">'
          + '<div>'
            + '<h3 class="dp-lvlrw__title">🌙 레벨 보상</h3>'
            + '<p class="dp-lvlrw__sub">레벨이 아래 단계에 도달하고 그 단계의 결제 실적을 채우면 월정석을 드립니다.'
              + (loadFailed ? '<br><b>수령 상태를 불러오지 못했어요.</b> 보상표만 표시합니다.' : '')
              + (snap.loggedIn ? '' : '<br>로그인하면 내 수령 상태까지 함께 보여드려요.')
            + '</p>'
          + '</div>'
          + '<button type="button" class="dp-lvlrw__close" data-dp-lvlrw-close aria-label="닫기">✕</button>'
        + '</div>'
        + _dpBuildLevelRewardProgress(status)
        /* 레벨은 서버 값이 정본이다. 로컬 스냅샷을 쓰면 서버가 이미 도달로 보는 단계를
           "다음 목표"로 잘못 표시해, 왜 못 받는지(=결제 실적 부족)를 못 보여준다. */
        + '<div class="dp-lvlrw__list">'
          + _dpBuildLevelRewardRows(status, (status && Number(status.currentLevel)) || snap.currentLevel)
        + '</div>'
        + '<ul class="dp-lvlrw__terms">'
          + '<li>가입 후 14일이 지나야 수령할 수 있어요.</li>'
          + '<li>단계가 올라갈수록 필요한 누적 결제 횟수와 금액이 함께 올라갑니다.</li>'
          + '<li>월정석·이용권으로 이용한 건은 결제 실적에 포함되지 않아요.</li>'
          + '<li>조건을 아직 못 채웠어도 보상은 사라지지 않아요 — 조건을 채우면 그동안 밀린 보상이 한 번에 지급됩니다.</li>'
          + '<li>지급된 월정석은 받은 날부터 ' + CD_LEVEL_REWARD_EXPIRE_DAYS + '일 뒤 소멸합니다.</li>'
          + '<li>월정석은 이벤트성 선불 재화로, 유료 기능 이용에 쓸 수 있어요.</li>'
        + '</ul>'
        + (claimCount
          ? '<button type="button" class="dp-lvlrw__claim" data-dp-lvlrw-claim>밀린 보상 ' + claimCount + '건 받기</button>'
          : (pendingCount
            ? '<button type="button" class="dp-lvlrw__claim" disabled>조건을 채우면 밀린 ' + pendingCount + '건이 한 번에 지급됩니다</button>'
            : ''))
      + '</div>';
    }

    render(null);
    document.body.appendChild(overlay);
    var closeBtn = overlay.querySelector('[data-dp-lvlrw-close]');
    if (closeBtn) { try { closeBtn.focus(); } catch (_) {} }

    function close() {
      try { overlay.remove(); } catch (_) {}
      document.removeEventListener('keydown', onKey);
    }
    function onKey(event) { if (event.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);

    overlay.addEventListener('click', function(event) {
      if (event.target === overlay || (event.target.closest && event.target.closest('[data-dp-lvlrw-close]'))) {
        close();
        return;
      }
      var claimBtn = event.target.closest ? event.target.closest('[data-dp-lvlrw-claim]') : null;
      if (!claimBtn || claimBtn.hasAttribute('disabled')) return;
      claimBtn.setAttribute('disabled', 'disabled');
      claimBtn.textContent = '수령 중...';
      _dpFetchJsonWithFallback('/api/rpg/level-rewards/claim', {
        method: 'POST',
        credentials: 'include',
        headers: _dpBuildAuthHeaders()
      }, { timeoutMs: 12000 }).then(function(res) {
        var grants = (res && res.ok && res.data && Array.isArray(res.data.granted)) ? res.data.granted : [];
        if (grants.length) {
          _cdLevelRewardStatus = null;
          close();
          _dpCelebrateLevelUp({ level: snap.currentLevel, grants: grants, force: true });
          _dpRefreshLevelStrip();
        } else {
          claimBtn.textContent = '아직 받을 수 있는 보상이 없어요';
        }
      }).catch(function() {
        claimBtn.textContent = '수령에 실패했어요. 잠시 후 다시 시도해 주세요';
      });
    });

    /* 🔴 시트를 열 때만 부른다. 홈 진입에서 자동 호출하면 트래픽 1위 화면에 Mongo 왕복이 얹힌다. */
    if (!snap.loggedIn) return;
    if (_cdLevelRewardStatus) { render(_cdLevelRewardStatus); return; }
    _dpFetchJsonWithFallback('/api/rpg/level-rewards', {
      method: 'GET',
      credentials: 'include',
      headers: _dpBuildAuthHeaders()
    }, { timeoutMs: 8000 }).then(function(res) {
      var data = (res && res.ok && res.data) ? res.data : null;
      if (!data) { render({ degraded: true }); return; }
      if (data.degraded !== true) _cdLevelRewardStatus = data;
      if (!overlay.parentNode) return; // 응답 전에 닫혔다
      render(data);
    }).catch(function() {
      if (overlay.parentNode) render({ degraded: true });
    });
  }

  /* ── 레벨업 축하 연출 ── */
  var _dpLevelUpCelebratedLevel = 0;
  var _dpLevelUpDeferTimer = null;

  /* 결제 완료 직후(cd:unlocks-changed) 레벨업이 터지면 결제 오버레이 위를 덮게 된다.
     사주 RPG 시트도 자체 레벨업 모달(entertain-engine.js [data-rpg-modal])을 띄우므로 겹친다.
     최상단 오버레이가 열려 있는 동안은 미뤘다가, 닫히면 그때 띄운다. */
  function _dpIsTopOverlayOpen() {
    return !!document.querySelector('.cd-direct-payment-modal, .cd-direct-payment-backdrop, .dp-delete-gate, #cdCoinGateOverlay, [data-cd-payment-overlay], [data-rpg-modal].is-open');
  }

  function _dpCelebrateLevelUp(options) {
    var opts = options || {};
    var level = Math.max(1, Number(opts.level) || 1);
    var grants = Array.isArray(opts.grants) ? opts.grants : [];
    var credits = grants.reduce(function(sum, row) { return sum + (Number(row && row.credits) || 0); }, 0);

    /* 로컬 낙관 → 서버 응답 → sync 재확인이 같은 레벨업을 세 번 통과할 수 있다. */
    if (!opts.force) {
      if (_dpLevelUpCelebratedLevel >= level && !credits) return;
      _dpLevelUpCelebratedLevel = Math.max(_dpLevelUpCelebratedLevel, level);
    }

    // 보상이 없는 순수 레벨업은 오버레이를 띄우지 않는다(과한 방해).
    if (!credits) {
      var snap = _cdLevelSnapshot();
      var tail = snap.nextReward ? ' · 다음 보상까지 ' + Math.max(1, snap.nextReward.level - level) + '레벨' : '';
      _toast('✦ Lv.' + level + ' 달성' + tail, 'success');
      return;
    }

    if (_dpIsTopOverlayOpen()) {
      if (_dpLevelUpDeferTimer) return;
      var waited = 0;
      _dpLevelUpDeferTimer = setInterval(function() {
        waited += 1200;
        if (!_dpIsTopOverlayOpen() || waited >= 15000) {
          clearInterval(_dpLevelUpDeferTimer);
          _dpLevelUpDeferTimer = null;
          _dpCelebrateLevelUp({ level: level, grants: grants, force: true });
        }
      }, 1200);
      return;
    }

    _dpEnsureLevelStyles();
    if (document.querySelector('.dp-lvlup')) return;

    var sparks = '';
    for (var i = 0; i < 12; i += 1) {
      var angle = (i / 12) * Math.PI * 2;
      var dx = Math.round(Math.cos(angle) * 88);
      var dy = Math.round(Math.sin(angle) * 62);
      sparks += '<span class="dp-lvlup__spark" aria-hidden="true" style="--dx:' + dx + 'px;--dy:' + dy + 'px;'
        + 'animation-delay:' + (i * 45) + 'ms">🌙</span>';
    }

    var overlay = document.createElement('div');
    overlay.className = 'dp-lvlup';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Lv.' + level + ' 달성 보상');
    overlay.innerHTML = '<div class="dp-lvlup__card">'
      + '<p class="dp-lvlup__eyebrow">LEVEL UP</p>'
      + '<p class="dp-lvlup__lv">Lv.' + level + ' 달성</p>'
      + '<div class="dp-lvlup__stage">' + sparks + '<span class="dp-lvlup__moon" aria-hidden="true">🌕</span></div>'
      + '<p class="dp-lvlup__amt">월정석 <b data-dp-lvlup-count>0</b>개 지급</p>'
      + '<p class="dp-lvlup__balance" data-dp-lvlup-balance></p>'
      + '<p class="dp-lvlup__hint">' + _dpLevelRewardKrw(credits) + '원 상당 · 받은 날부터 '
        + CD_LEVEL_REWARD_EXPIRE_DAYS + '일간 사용할 수 있어요.</p>'
      + '<button type="button" class="dp-lvlup__close" data-dp-lvlup-close>확인</button>'
    + '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.classList.add('dp-lvlup--in'); });

    var closeTimer = null;
    function close() {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      document.removeEventListener('keydown', onKey);
      overlay.classList.remove('dp-lvlup--in');
      setTimeout(function() { try { overlay.remove(); } catch (_) {} }, 300);
    }
    function onKey(event) { if (event.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', function(event) {
      if (event.target === overlay || (event.target.closest && event.target.closest('[data-dp-lvlup-close]'))) close();
    });
    closeTimer = setTimeout(close, 5200);

    // 숫자 카운트업. reduced-motion 이면 곧장 최종값을 쓴다.
    var countEl = overlay.querySelector('[data-dp-lvlup-count]');
    var reduce = false;
    try {
      reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (_) {}
    if (!countEl) { /* 렌더 실패는 무시 */ }
    else if (reduce) { countEl.textContent = credits.toLocaleString('ko-KR'); }
    else {
      var startedAt = Date.now();
      var tick = setInterval(function() {
        var ratio = Math.min(1, (Date.now() - startedAt) / 900);
        countEl.textContent = Math.round(credits * ratio).toLocaleString('ko-KR');
        if (ratio >= 1) clearInterval(tick);
      }, 40);
    }

    /* 갱신된 보유 잔량. fresh=1 이어야 서버의 5초 표시용 캐시를 우회한다.
       실패하면 그 줄만 비운다(지급 사실 자체는 이미 서버가 확정했다). */
    var balanceEl = overlay.querySelector('[data-dp-lvlup-balance]');
    if (balanceEl && typeof _dpFetchMoonlightStoneBalance === 'function') {
      _dpFetchMoonlightStoneBalance({ fresh: true }).then(function(result) {
        if (!balanceEl.isConnected || !result || !result.ok) return;
        balanceEl.textContent = '보유 월정석 ' + result.balance.toLocaleString('ko-KR') + '개';
      }).catch(function() {});
    }
  }

  /* 로컬 낙관 계산이 먼저 레벨업을 알아챈다. 월정석 지급 여부는 서버만 알기 때문에
     여기서는 가벼운 토스트까지만 하고, 실제 보상 연출은 award 응답이 맡는다. */
  function _dpNoteLocalLevelUp(result) {
    if (!result || !result.leveledUp) return;
    _dpCelebrateLevelUp({ level: result.level, grants: [] });
  }

  /* 하루 첫 방문에 출석 EXP를 주고 서버와 한 번 맞춘다. 세션당 1회만 돈다. */
  function _dpBootLevelDaily() {
    if (_dpLevelBootDone) return;
    _dpLevelBootDone = true;
    _dpNoteLocalLevelUp(_cdLevelAward('checkin', _cdLevelKstDate(0)));
    _cdLevelSyncWhenIdle();
    window.addEventListener('cd:auth-changed', function() {
      _cdLevelSync({ force: true }).then(function() { _dpRefreshLevelStrip(); });
    });
    /* 유료 기능이 해금·열람되면 보너스 EXP. 결제 경로는 건드리지 않고 이벤트만 듣는다. */
    window.addEventListener('cd:unlocks-changed', function(event) {
      var key = (event && event.detail && event.detail.featureKey) ? String(event.detail.featureKey) : 'paid-view';
      var paidResult = _cdLevelAward('paid', key);
      if (paidResult.changed) {
        _dpRefreshLevelStrip();
        _dpNoteLocalLevelUp(paidResult);
      }
    });
  }

  function renderMasterCard(profile) {
    var el = document.getElementById('dpMasterCard');
    if (!el) return;
    _dpEnsureProfileActionMenuStyles();
    _dpEnsureLevelStyles();
    _dpBootLevelDaily();

    if (!profile) {
      /* 카드가 없어도 레벨은 계정에 쌓인다. 첫 방문자도 여기서 성장 훅을 만난다. */
      el.innerHTML = _emptyCard() + _dpBuildLevelStrip();
      el.className = 'dp-master-card dp-master-card--empty';
      _dpBindLevelEvents(el);
      return;
    }

    var b = profile.birth;
    var l = profile.location || {};
    var locationLabel = String(
      l.label
      || l.name
      || profile.locationLabel
      || [profile.countryName || profile.country, profile.cityName || profile.city].filter(Boolean).join(' · ')
      || '\uB300\uD55C\uBBFC\uAD6D \u00B7 \uC11C\uC6B8'
    );
    var genderKey = String(profile.gender || profile.sex || '').trim().toLowerCase();
    var isMale = genderKey === 'm' || genderKey === 'male' || genderKey === '\uB0A8\uC131';
    var profileLng = (l.lng !== undefined && l.lng !== null && !isNaN(Number(l.lng)))
      ? Number(l.lng)
      : ((l.lon !== undefined && l.lon !== null && !isNaN(Number(l.lon))) ? Number(l.lon) : null);
    var tzResolved = resolveTimezoneOffset(b, l);
    var safeLng = (profileLng !== null) ? profileLng : 127.0;
    var tso = calcTrueSolarOffset(safeLng, tzResolved.tzOffsetHours);
    var corrected = applyTrueSolarOffset(b.hour, b.minute, tso);
    var trueSolarStr = String(corrected.h).padStart(2,'0') + ':' + String(corrected.m).padStart(2,'0');
    var dir = tso > 0 ? '−' : '+';
    var absMin = Math.abs(tso);
    var zodiacEmoji = _zodiacEmoji(b.year);
    var calLabel = b.calType === 'solar' ? '양력' : (b.calType === 'lunar_leap' ? '음력(윤)' : '음력');

    el.className = 'dp-master-card dp-master-card--active';
    el.innerHTML =
      '<div class="dp-mc-glow"></div>'
      + '<div class="dp-mc-stars" aria-hidden="true"></div>'
      + '<svg class="dp-mc-flower" viewBox="0 0 120 120" fill="none" aria-hidden="true" style="color:#FFD700">'
        + '<circle cx="60" cy="60" r="52" stroke="currentColor" stroke-width="0.5"/>'
        + '<circle cx="60" cy="60" r="32" stroke="currentColor" stroke-width="0.4"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4" transform="rotate(30 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4" transform="rotate(60 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4" transform="rotate(90 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4" transform="rotate(120 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.4" transform="rotate(150 60 60)"/>'
        + '<circle cx="60" cy="60" r="4" fill="currentColor" opacity="0.6"/>'
      + '</svg>'
      + '<div class="dp-mc-inner">'
        + '<div class="dp-mc-header">'
          + '<div class="dp-mc-avatar">' + zodiacEmoji + '</div>'
          + '<div class="dp-mc-identity">'
            + '<div class="dp-mc-label">✦ MY DESTINY CARD</div>'
            + '<div class="dp-mc-name">' + _esc(profile.name) + '</div>'
            + '<div class="dp-mc-birth">' + calLabel + ' '
              + b.year + '년 ' + b.month + '월 ' + b.day + '일 '
              + String(b.hour).padStart(2,'0') + ':' + String(b.minute).padStart(2,'0')
            + '</div>'
            + '<div style="margin-top:4px;">'
              + (isMale
                ? '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(96,165,250,0.18);border:1px solid rgba(96,165,250,0.45);color:#93c5fd;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.5px;">&#9794; 남성</span>'
                : '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(244,114,182,0.18);border:1px solid rgba(244,114,182,0.45);color:#f9a8d4;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.5px;">&#9792; 여성</span>')
            + '</div>'
          + '</div>'
          + '<div class="dp-mc-action-wrap">'
            + '<button type="button" class="dp-mc-list-btn dp-mc-menu-btn" aria-label="' + _esc(_dpText('openProfileList')) + '" aria-expanded="false" aria-controls="dpListSheet" data-profile-menu-marker="profile-card-hamburger-list-delete-v20260611" style="touch-action:manipulation">'
              + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'
            + '</button>'
          + '</div>'
        + '</div>'
        + '<div class="dp-mc-divider"></div>'
        + '<div class="dp-mc-info">'
          + '<div class="dp-mc-info-item dp-mc-info-item--wide">'
            + '<span class="dp-mc-info-label">'
              + '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
              + '출생지'
            + '</span>'
            + '<span class="dp-mc-info-val">' + _esc(locationLabel) + '</span>'
          + '</div>'
          + '<div class="dp-mc-info-item">'
            + '<span class="dp-mc-info-label">'
              + '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><circle cx="12" cy="12" r="4"/><path fill="none" stroke="currentColor" stroke-width="2" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M17.66 6.34l1.41-1.41M4.93 19.07l1.41-1.41"/></svg>'
              + '진태양시'
            + '</span>'
            + '<span class="dp-mc-info-val dp-mc-solar">'
              + trueSolarStr
              + '<span class="dp-mc-correction">' + dir + absMin + '분</span>'
            + '</span>'
          + '</div>'
          + '<div class="dp-mc-info-item">'
            + '<span class="dp-mc-info-label">'
              + '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><line x1="2" y1="12" x2="22" y2="12"/></svg>'
              + '경도'
            + '</span>'
            + '<span class="dp-mc-info-val">' + safeLng.toFixed(1) + '°</span>'
          + '</div>'
        + '</div>'
        + _dpBuildLevelStrip()
        + '<button class="dp-mc-load-btn" style="touch-action:manipulation">✦ 이 프로필로 운세 보기</button>'
      + '</div>';
    _dpBindMasterCardMenuEvents(el);
    _dpBindLevelEvents(el);
  }

  function _emptyCard() {
    return '<div class="dp-mc-empty-inner" onclick="dpScrollToForm()">'
      + '<svg class="dp-mc-empty-bloom" viewBox="0 0 120 120" fill="none" aria-hidden="true" style="color:rgba(255,215,0,0.5)">'
        + '<circle cx="60" cy="60" r="52" stroke="currentColor" stroke-width="0.8"/>'
        + '<circle cx="60" cy="60" r="32" stroke="currentColor" stroke-width="0.8"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7" transform="rotate(30 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7" transform="rotate(60 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7" transform="rotate(90 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7" transform="rotate(120 60 60)"/>'
        + '<ellipse cx="60" cy="60" rx="52" ry="13" stroke="currentColor" stroke-width="0.8" opacity="0.7" transform="rotate(150 60 60)"/>'
        + '<circle cx="60" cy="60" r="5" fill="currentColor" opacity="0.5"/>'
      + '</svg>'
      + '<div class="dp-mc-empty-title">나의 운명 카드</div>'
      + '<div class="dp-mc-empty-desc">프로필 카드를 새로 작성해<br>운명의 지도를 다시 열어보세요</div>'
      + '<div class="dp-mc-empty-hint">↓ 아래에서 프로필 카드 작성</div>'
    + '</div>';
  }

  function _dpEnsureSavingCardStyles() {
    if (document.getElementById('dpSavingCardStyles')) return;
    var style = document.createElement('style');
    style.id = 'dpSavingCardStyles';
    style.textContent = ''
      + '.dp-master-card--saving{position:relative;overflow:hidden;min-height:238px;background:radial-gradient(circle at 50% 0%,rgba(186,230,253,.28),rgba(79,70,229,.2) 34%,rgba(8,6,32,.98) 100%);border:1px solid rgba(224,231,255,.46);box-shadow:0 22px 58px rgba(15,23,42,.58),0 0 46px rgba(125,211,252,.22),inset 0 1px 0 rgba(255,255,255,.18);}'
      + '.dp-saving-sky{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 18% 24%,rgba(255,255,255,.75) 0 1px,transparent 2px),radial-gradient(circle at 72% 18%,rgba(253,224,71,.9) 0 1px,transparent 2px),radial-gradient(circle at 84% 62%,rgba(186,230,253,.8) 0 1px,transparent 2px),radial-gradient(circle at 28% 76%,rgba(255,255,255,.7) 0 1px,transparent 2px);animation:dpSavingTwinkle 2.8s ease-in-out infinite;}'
      + '.dp-saving-inner{position:relative;z-index:1;min-height:238px;padding:28px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#f8fafc;}'
      + '.dp-saving-orbit{position:relative;width:104px;height:104px;margin-bottom:16px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,rgba(255,255,255,.12),rgba(14,165,233,.08) 52%,transparent 70%);}'
      + '.dp-saving-orbit::before{content:"";position:absolute;inset:6px;border-radius:50%;border:1px solid rgba(191,219,254,.36);border-top-color:rgba(250,204,21,.95);animation:dpSavingOrbit 1.9s linear infinite;}'
      + '.dp-saving-moon{width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#fff7c2 0%,#fde68a 40%,#f59e0b 100%);box-shadow:0 0 28px rgba(253,224,71,.55),inset -13px 4px 0 rgba(67,56,202,.34);}'
      + '.dp-saving-star{position:absolute;width:9px;height:9px;background:#fff7ed;clip-path:polygon(50% 0,62% 36%,100% 50%,62% 64%,50% 100%,38% 64%,0 50%,38% 36%);box-shadow:0 0 14px rgba(255,255,255,.9);animation:dpSavingPulse 1.6s ease-in-out infinite;}'
      + '.dp-saving-star--a{left:18px;top:21px;}.dp-saving-star--b{right:16px;top:36px;animation-delay:.35s;}.dp-saving-star--c{left:55px;bottom:12px;animation-delay:.7s;}'
      + '.dp-saving-title{font-size:1.05rem;font-weight:900;letter-spacing:.02em;color:#fff7ed;text-shadow:0 0 18px rgba(255,255,255,.36);}'
      + '.dp-saving-desc{margin-top:7px;font-size:.82rem;font-weight:700;line-height:1.55;color:rgba(224,242,254,.9);}'
      + '.dp-saving-bar{width:min(210px,74%);height:6px;margin-top:17px;border-radius:999px;overflow:hidden;background:rgba(15,23,42,.54);border:1px solid rgba(191,219,254,.25);}'
      + '.dp-saving-bar::before{content:"";display:block;width:44%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#fef3c7,#bae6fd,#c4b5fd);animation:dpSavingBar 1.45s ease-in-out infinite;}'
      + '@keyframes dpSavingOrbit{to{transform:rotate(360deg);}}'
      + '@keyframes dpSavingPulse{0%,100%{transform:scale(.85);opacity:.55;}50%{transform:scale(1.22);opacity:1;}}'
      + '@keyframes dpSavingTwinkle{0%,100%{opacity:.68;}50%{opacity:1;}}'
      + '@keyframes dpSavingBar{0%{transform:translateX(-80%);}100%{transform:translateX(230%);}}';
    document.head.appendChild(style);
  }

  function renderProfileSavingCard(profile) {
    var el = document.getElementById('dpMasterCard');
    if (!el) return;
    _dpEnsureSavingCardStyles();
    var safeName = profile && profile.name ? _esc(profile.name) : '새 프로필';
    el.className = 'dp-master-card dp-master-card--saving';
    el.innerHTML =
      '<div class="dp-saving-sky" aria-hidden="true"></div>'
      + '<div class="dp-saving-inner" role="status" aria-live="polite">'
        + '<div class="dp-saving-orbit" aria-hidden="true">'
          + '<div class="dp-saving-moon"></div>'
          + '<span class="dp-saving-star dp-saving-star--a"></span>'
          + '<span class="dp-saving-star dp-saving-star--b"></span>'
          + '<span class="dp-saving-star dp-saving-star--c"></span>'
        + '</div>'
        + '<div class="dp-saving-title">' + safeName + '님의 운명 카드를 새기는 중</div>'
        + '<div class="dp-saving-desc">달빛 아래 별의 좌표를 맞추고 있습니다.</div>'
        + '<div class="dp-saving-bar" aria-hidden="true"></div>'
      + '</div>';
  }

  function renderProfileLoadingCard() {
    var el = document.getElementById('dpMasterCard');
    if (!el) return;
    // \uCCAB \uD398\uC778\uD2B8 \uC815\uC801 \uC2A4\uCF08\uB808\uD1A4(dp-master-card--moon-loading)\uACFC \uB3D9\uC77C\uD55C \uB9C8\uD06C\uC5C5/\uD074\uB798\uC2A4\uB97C
    // \uC7AC\uC0AC\uC6A9\uD574 \uAE5C\uBE61\uC784\uC744 \uC5C6\uC560\uACE0, \uC5F0\uC774(\uAF43)\u00B7\uB124\uC624(\uB2EC\uBE5B) \uC591 \uD14C\uB9C8\uC5D0\uC11C \uB2E4\uD06C \uD50C\uB798\uC2DC \uC5C6\uC774
    // \uBC1D\uC740 \uAF43 \uC2A4\uCF08\uB808\uD1A4\uC744 \uC720\uC9C0\uD55C\uB2E4(\uB2E4\uD06C --saving \uCE74\uB4DC\uB85C \uAD50\uCCB4\uD558\uC9C0 \uC54A\uC74C).
    el.className = 'dp-master-card dp-master-card--empty dp-master-card--moon-loading moon-destiny-form';
    el.innerHTML =
      '<svg class="moon-form-stars" aria-hidden="true" width="72" height="28" viewBox="0 0 72 28">'
        + '<circle class="moon-form-progress-dot moon-form-progress-dot--active" cx="8" cy="14" r="4"></circle>'
        + '<ellipse class="moon-form-progress-petal" cx="24" cy="14" rx="3" ry="6" transform="rotate(-24 24 14)"></ellipse>'
        + '<circle class="moon-form-progress-dot" cx="38" cy="14" r="3"></circle>'
        + '<ellipse class="moon-form-progress-petal" cx="52" cy="14" rx="3" ry="6" transform="rotate(24 52 14)"></ellipse>'
        + '<circle class="moon-form-progress-dot" cx="66" cy="14" r="3"></circle>'
      + '</svg>'
      + '<div class="dp-mc-empty-inner moon-form-header" role="status" aria-live="polite">'
        + '<span class="moon-form-header__icon" aria-hidden="true">'
          + '<svg width="32" height="32" viewBox="0 0 32 32" fill="none">'
            + '<ellipse cx="16" cy="7.6" rx="4.2" ry="7.1" fill="currentColor" opacity="0.7"></ellipse>'
            + '<ellipse cx="16" cy="24.4" rx="4.2" ry="7.1" fill="currentColor" opacity="0.44"></ellipse>'
            + '<ellipse cx="7.6" cy="16" rx="7.1" ry="4.2" fill="currentColor" opacity="0.52"></ellipse>'
            + '<ellipse cx="24.4" cy="16" rx="7.1" ry="4.2" fill="currentColor" opacity="0.6"></ellipse>'
            + '<ellipse cx="10.1" cy="10.1" rx="3.5" ry="6.2" fill="currentColor" opacity="0.5" transform="rotate(-45 10.1 10.1)"></ellipse>'
            + '<ellipse cx="21.9" cy="21.9" rx="3.5" ry="6.2" fill="currentColor" opacity="0.38" transform="rotate(-45 21.9 21.9)"></ellipse>'
            + '<circle cx="16" cy="16" r="4.1" fill="rgba(255,250,235,0.96)" stroke="rgba(157,23,77,0.24)" stroke-width="0.8"></circle>'
          + '</svg>'
        + '</span>'
        + '<div class="moon-form-header__copy">'
          + '<span class="destiny-input-head__kicker" data-cd-trans="home.input.loadingKicker">DESTINY CARD</span>'
          + '<div class="dp-mc-empty-title destiny-input-head__title" data-cd-trans="home.input.loadingTitle">\uC6B4\uBA85 \uCE74\uB4DC\uAC00 \uD53C\uC5B4\uB0A0 \uC790\uB9AC\uB97C \uBC1D\uD788\uB294 \uC911\uC785\uB2C8\uB2E4.</div>'
          + '<div class="dp-mc-empty-desc destiny-input-head__desc" data-cd-trans="home.input.loadingDesc">\uC800\uC7A5\uB41C \uC0DD\uB144\uC6D4\uC77C\uC758 \uBCC4\uBE5B\uC744 \uB9DE\uCD94\uACE0 \uC788\uC2B5\uB2C8\uB2E4.</div>'
        + '</div>'
      + '</div>'
      + '<div class="dp-mc-loading-action moon-submit-btn moon-submit-btn--primary" aria-hidden="true">'
        + '<span class="moon-submit-btn__star lotus-icon"><svg width="8" height="8" viewBox="0 0 8 8"><path d="M4 0.8L4.9 3.1L7.2 4L4.9 4.9L4 7.2L3.1 4.9L0.8 4L3.1 3.1Z" fill="currentColor"></path></svg></span>'
        + '<span class="moon-submit-btn__text main-txt" data-cd-trans="home.input.loadingAction">\uB098\uC758 \uC6B4\uBA85 \uCE74\uB4DC\uB85C \uC774\uC5B4\uC9C0\uB294 \uC911</span>'
        + '<span class="moon-submit-btn__coin coin-pill">LOADING</span>'
      + '</div>';
  }

  /* 로그인 상태인데 서버 프로필을 못 받아온 최종 상태.
     예전에는 이 경우도 _emptyCard()(= "카드를 새로 작성하세요")로 내려앉아서, 서버에 카드가
     멀쩡히 있는 계정이 기기에 따라 "카드 없음"으로 보였다. 카드가 없는 것과 못 불러온 것은
     다른 상태이므로 분리하고, 사용자가 직접 재조회할 수 있게 한다. */
  /* 문구는 셸의 <template id="dpProfileSyncErrorTpl"> 에 있다(12개 로케일 사전으로 번역됨).
     여기에 한국어를 박지 않는 이유는 그 템플릿 주석 참고. 템플릿이 없는 진입점(다른 셸에서
     이 스크립트만 로드하는 경우)에서는 이미 번역된 기존 키로 최소 안내만 띄운다. */
  function renderProfileSyncErrorCard() {
    var el = document.getElementById('dpMasterCard');
    if (!el) return;
    el.className = 'dp-master-card dp-master-card--empty';
    var tpl = document.getElementById('dpProfileSyncErrorTpl');
    if (tpl && tpl.content) {
      el.innerHTML = '';
      el.appendChild(document.importNode(tpl.content, true));
      _dpApplyTranslationsWithin(el);
      return;
    }
    var inner = document.createElement('div');
    inner.className = 'dp-mc-empty-inner dp-mc-retry-btn';
    var desc = document.createElement('div');
    desc.className = 'dp-mc-empty-desc';
    desc.textContent = _dpText('networkError');
    inner.appendChild(desc);
    inner.onclick = dpRetryProfileSync;
    el.innerHTML = '';
    el.appendChild(inner);
  }

  /* 템플릿을 복제해 붙인 노드는 언어 런타임이 이미 훑고 지나간 뒤라 번역이 안 걸려 있다.
     한국어면 마크업 원문이 곧 정답이므로 아무것도 하지 않는다. */
  function _dpApplyTranslationsWithin(root) {
    try {
      if (!root || typeof window.cdApplyNativeTranslations !== 'function') return;
      if (_dpTextLang() === 'ko') return;
      window.cdApplyNativeTranslations(window.cdGetCurrentLanguage());
    } catch (e) { /* 번역 실패는 표시 자체를 막지 않는다 */ }
  }

  /* 재시도: 서버를 다시 조회한다. 실패 쿨다운을 걷어내야 즉시 재요청이 나간다. */
  function dpRetryProfileSync() {
    _dpClearCooldown('/api/profile');
    _dpClearCooldown('/api/auth/me');
    _dpSessionVerify.checkedAt = 0;
    renderProfileLoadingCard();
    _dpLoadFromServer(function(loaded) {
      if (loaded) {
        renderMasterCard(DPStorage.current());
        renderProfileList();
        return;
      }
      _dpRenderProfileSyncFallback();
    });
  }
  window.dpRetryProfileSync = dpRetryProfileSync;

  /* 서버 조회가 끝내 실패했을 때의 최종 렌더. 캐시된 카드가 있으면 그것을 유지하고
     (SWR — 이미 본 카드를 지우지 않는다), 아무것도 없을 때만 오류/재시도 카드를 띄운다. */
  function _dpRenderProfileSyncFallback() {
    var cached = DPStorage.current();
    if (cached) {
      renderMasterCard(cached);
      renderProfileList();
      return;
    }
    if (_dpHasSessionHint()) {
      renderProfileSyncErrorCard();
      return;
    }
    renderMasterCard(null);
    renderProfileList();
  }

  function _zodiacEmoji(year) {
    var animals = ['🐀','🐂','🐅','🐇','🐉','🐍','🐎','🐑','🐒','🐓','🐕','🐖'];
    return animals[(year - 4 + 120) % 12];
  }
  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ──────────────────────────────────────────
     3-A. Data Injection & Execution Pipeline
          프로필 → 폼 → 비동기 계산 실행
  ────────────────────────────────────────── */
  /** 베다점 등 외부로 넘길 때 location/birth null 보정 (서울 기본값) */
  function _normalizeProfileForVedic(profile) {
    if (!profile) return profile;
    var parsedBirth = null;
    if (typeof profile.birthDate === 'string') {
      var dparts = profile.birthDate.split(/[-/]/);
      if (dparts.length >= 3) {
        parsedBirth = {
          year: parseInt(dparts[0], 10),
          month: parseInt(dparts[1], 10),
          day: parseInt(dparts[2], 10)
        };
      } else if (dparts.length === 1 && dparts[0].length >= 8) {
        parsedBirth = {
          year: parseInt(dparts[0].slice(0, 4), 10),
          month: parseInt(dparts[0].slice(4, 6), 10),
          day: parseInt(dparts[0].slice(6, 8), 10)
        };
      }
    }
    var b = profile.birth || {
      year: profile.birthYear != null ? profile.birthYear : (parsedBirth && parsedBirth.year),
      month: profile.birthMonth != null ? profile.birthMonth : (parsedBirth && parsedBirth.month),
      day: profile.birthDay != null ? profile.birthDay : (parsedBirth && parsedBirth.day),
      hour: profile.birthHour,
      minute: profile.birthMinute,
      calType: profile.calType
    };
    if (!b || (b.year == null && b.month == null && b.day == null && profile.birthDate == null)) return profile;
    if ((b.hour == null || b.hour === '') && profile.birthHour != null && profile.birthHour !== '') b.hour = profile.birthHour;
    if ((b.minute == null || b.minute === '') && profile.birthMinute != null && profile.birthMinute !== '') b.minute = profile.birthMinute;
    if ((b.hour == null || b.hour === '' || b.minute == null || b.minute === '') && typeof profile.birthTime === 'string') {
      var tparts = profile.birthTime.split(':');
      if (tparts.length >= 2) {
        if (b.hour == null || b.hour === '') b.hour = parseInt(tparts[0], 10);
        if (b.minute == null || b.minute === '') b.minute = parseInt(tparts[1], 10);
      }
    }
    var l = profile.location || {};
    var latNum = (typeof l.lat === 'number' && !isNaN(l.lat)) ? l.lat : parseFloat(l.lat);
    var lngNum = (typeof l.lng === 'number' && !isNaN(l.lng)) ? l.lng
      : ((typeof l.lon === 'number' && !isNaN(l.lon)) ? l.lon : (parseFloat(l.lng) || parseFloat(l.lon)));
    var baseTzNum = (typeof l.baseTzOffset === 'number' && !isNaN(l.baseTzOffset)) ? l.baseTzOffset : parseFloat(l.baseTzOffset);
    var tzOffsetNum = (typeof l.tzOffset === 'number' && !isNaN(l.tzOffset)) ? l.tzOffset : parseFloat(l.tzOffset);
    var lat = (typeof latNum === 'number' && !isNaN(latNum)) ? latNum : 37.5665;
    var lng = (typeof lngNum === 'number' && !isNaN(lngNum)) ? lngNum : 126.978;
    var tzHours = (typeof baseTzNum === 'number' && !isNaN(baseTzNum)) ? baseTzNum
      : ((typeof tzOffsetNum === 'number' && !isNaN(tzOffsetNum)) ? (Math.abs(tzOffsetNum) <= 24 ? tzOffsetNum : tzOffsetNum / 60) : 9);
    return {
      id: profile.id,
      name: profile.name,
      gender: profile.gender,
      birth: {
        year: parseInt(b.year, 10),
        month: parseInt(b.month, 10),
        day: parseInt(b.day, 10),
        hour: b.hour != null ? b.hour : 12,
        minute: b.minute != null ? b.minute : 0,
        calType: b.calType || 'solar'
      },
      location: {
        label: l.label || '대한민국 (서울)',
        tz: l.tz || 'Asia/Seoul',
        lat: lat,
        lng: lng,
        tzOffset: tzHours,
        baseTzOffset: tzHours,
        dstMinutes: l.dstMinutes
      }
    };
  }

  function _dpPad2(value) {
    var n = parseInt(value, 10);
    if (!isFinite(n)) n = 0;
    return String(n).padStart(2, '0');
  }

  function _buildVedicBridgePayload(profile) {
    var normalized = _normalizeProfileForVedic(profile) || profile || {};
    var b = normalized.birth || {};
    var l = normalized.location || {};

    var year = parseInt(b.year, 10);
    var month = parseInt(b.month, 10);
    var day = parseInt(b.day, 10);
    var hour = parseInt(b.hour, 10);
    var minute = parseInt(b.minute, 10);

    if (!isFinite(year)) year = 1990;
    if (!isFinite(month)) month = 1;
    if (!isFinite(day)) day = 1;
    if (!isFinite(hour)) hour = 12;
    if (!isFinite(minute)) minute = 0;

    var lat = parseFloat(l.lat);
    var lng = parseFloat(l.lng);
    if (!isFinite(lng)) lng = parseFloat(l.lon);
    if (!isFinite(lat)) lat = 37.5665;
    if (!isFinite(lng)) lng = 126.978;

    var tzHours = parseFloat(l.baseTzOffset);
    if (!isFinite(tzHours)) {
      tzHours = parseFloat(l.tzOffset);
      if (isFinite(tzHours) && Math.abs(tzHours) > 24) tzHours = tzHours / 60;
    }
    if (!isFinite(tzHours)) tzHours = 9;

    var bridge = {
      id: normalized.id,
      name: normalized.name,
      gender: normalized.gender,
      birth: {
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        calType: b.calType || 'solar'
      },
      location: {
        label: l.label || '대한민국 (서울)',
        tz: l.tz || 'Asia/Seoul',
        lat: lat,
        lng: lng,
        tzOffset: tzHours,
        baseTzOffset: tzHours,
        dstMinutes: l.dstMinutes
      }
    };

    bridge.birthYear = year;
    bridge.birthMonth = month;
    bridge.birthDay = day;
    bridge.birthHour = hour;
    bridge.birthMinute = minute;
    bridge.calType = bridge.birth.calType;
    bridge.birthDate = year + '-' + _dpPad2(month) + '-' + _dpPad2(day);
    bridge.birthTime = _dpPad2(hour) + ':' + _dpPad2(minute);
    bridge.lat = lat;
    bridge.lng = lng;
    bridge.lon = lng;
    bridge.timezone = tzHours;
    bridge.tzOffset = tzHours;
    bridge.baseTzOffset = tzHours;

    return bridge;
  }

  function _resolveVedicProfileCandidate() {
    function hasBirth(p) {
      if (!(p && p.birth)) return false;
      var by = parseInt(p.birth.year, 10);
      var bm = parseInt(p.birth.month, 10);
      var bd = parseInt(p.birth.day, 10);
      return !isNaN(by) && !isNaN(bm) && !isNaN(bd);
    }
    function hasTime(p) {
      return !!(p && p.birth && p.birth.hour != null && p.birth.minute != null);
    }
    var cur = _normalizeProfileForVedic(DPStorage.current());
    if (hasBirth(cur)) return cur;
    var list = DPStorage.list();
    if (!Array.isArray(list) || list.length === 0) return null;
    var firstBirth = null;
    for (var i = 0; i < list.length; i++) {
      var normalized = _normalizeProfileForVedic(list[i]);
      if (!hasBirth(normalized)) continue;
      if (!firstBirth) firstBirth = normalized;
      if (hasTime(normalized)) return normalized;
    }
    return firstBirth;
  }

  function _fortuneStartMessage(profileName, type) {
    var safeName = _esc(profileName || '');
    if (type === 'saju')   return '✦ ' + safeName + ' · 사주 풀이를 시작합니다';
    if (type === 'sukuyo') return '✦ ' + safeName + ' · 숙요점 분석을 준비합니다';
    if (type === 'ziwei')  return '✦ ' + safeName + ' · 자미두수 명반을 여는 중입니다';
    if (type === 'astro')  return '✦ ' + safeName + ' · 점성술 코즈믹 차트를 준비합니다';
    if (type === 'vedic')  return '✦ ' + safeName + ' · 베다 점성술로 이동합니다';
    if (type === 'flower') return '✦ ' + safeName + ' · 운명의 꽃 탭으로 이동합니다';
    if (type === 'tarot')  return '✦ ' + safeName + ' · 타로 컬렉션으로 이동합니다';
    return '✦ ' + safeName + ' · 운세 분석을 시작합니다';
  }

  function _runSajuWhenReady(maxAttempts, delayMs) {
    var attempts = 0;
    var max = (typeof maxAttempts === 'number' && maxAttempts > 0) ? maxAttempts : 60;
    var delay = (typeof delayMs === 'number' && delayMs > 0) ? delayMs : 250;

    /* 모바일에서 프로필 경로로 첫 진입 시 사주 엔진(saju-engine.js 등)이 아직 lazy-load 되지
       않아 window.checkPrivacyAndCalculate 스텁이 조용히 지연/실패할 수 있다. 엔진 로드를
       능동적으로 트리거하고 실패는 사용자에게 표면화한다(스텁 자체 catch는 무음). */
    if (typeof window.__cdEnsureSajuCoreLoaded === 'function') {
      try {
        window.__cdEnsureSajuCoreLoaded().catch(function(err) {
          console.error('[DP] 사주 엔진 로드 실패:', err);
          _toast('⚠️ 사주 계산 엔진을 불러오지 못했습니다. 네트워크 확인 후 다시 시도해 주세요.', 'warn');
        });
      } catch (e) {}
    }

    function tick() {
      attempts += 1;
      if (typeof window.checkPrivacyAndCalculate === 'function') {
        try {
          var p = window.checkPrivacyAndCalculate();
          if (p && typeof p.catch === 'function') {
            p.catch(function(err) {
              console.error('[DP] 계산 완료 콜백 오류:', err);
              _toast('⚠️ 계산 완료 후 콘텐츠 활성화 중 오류가 발생했습니다', 'warn');
            });
          }
        } catch (err) {
          console.error('[DP] 계산 실행 오류:', err);
          _toast('⚠️ 계산 실행 중 오류가 발생했습니다', 'warn');
        }
        return;
      }

      if (attempts < max) {
        setTimeout(tick, delay);
      } else {
        _toast('⚠️ 계산 모듈 로딩이 지연되고 있습니다. 잠시 후 자동으로 다시 시도됩니다.', 'warn');
      }
    }

    tick();
  }

  function _injectAndRun(profile, fortuneType) {
    if (!profile) {
      _toast('⚠️ 활성화된 프로필이 없습니다', 'warn');
      return;
    }
    var b = profile.birth;
    var l = profile.location || {};
    var profileLng = (l.lng !== undefined && l.lng !== null && !isNaN(Number(l.lng)))
      ? Number(l.lng)
      : ((l.lon !== undefined && l.lon !== null && !isNaN(Number(l.lon))) ? Number(l.lon) : null);

    /* 필수값 검증 */
    if (!b || !b.year || !b.month || !b.day) {
      _toast('⚠️ 생년월일 데이터가 없습니다. 프로필을 다시 저장하세요.', 'warn');
      var formEl = document.querySelector('.input-section');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (!l.tz || profileLng === null) {
      var fallbackSel = document.getElementById('birthCountry');
      var fallbackOpt = fallbackSel ? fallbackSel.options[fallbackSel.selectedIndex] : null;
      if (fallbackOpt) {
        if (!l.tz) l.tz = fallbackSel.value || 'Asia/Seoul';
        if (profileLng === null) {
          var fallbackLng = parseFloat(fallbackOpt.getAttribute('data-long') || '127');
          profileLng = isNaN(fallbackLng) ? 127.0 : fallbackLng;
        }
      } else {
        if (!l.tz) l.tz = 'Asia/Seoul';
        if (profileLng === null) profileLng = 127.0;
      }
    }

    /* 시각 피드백 먼저 */
    spawnStardust(document.getElementById('dpMasterCard'));
    _toast(_fortuneStartMessage(profile.name, fortuneType || 'saju'), 'success');

    /* 모바일에서 엔진 로드/계산 완료 전까지 화면이 그대로라 "이동이 안 된" 것처럼 보인다.
       즉시 입력 영역으로 스크롤해 로딩 스피너·전환이 사용자 시야에 들어오게 한다. */
    var inputSectionEl = document.querySelector('.input-section');
    if (inputSectionEl && typeof inputSectionEl.scrollIntoView === 'function') {
      try { inputSectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    }

    /* ① 폼 데이터 주입 */
    var nameEl = document.getElementById('nameInput');
    if (nameEl) nameEl.value = profile.name || '';

    var bdEl = document.getElementById('birthDate');
    if (bdEl) bdEl.value = _dpBuildProfileBirthDateValue(b.year, b.month, b.day);

    var calBtns = document.querySelectorAll('input[name="calType"]');
    calBtns.forEach(function(btn) { btn.checked = btn.value === (b.calType || 'solar'); });

    var hourEl = document.getElementById('birthHour');
    var minEl  = document.getElementById('birthMinute');
    if (hourEl) hourEl.value = (b.hour !== undefined && b.hour !== null) ? b.hour : 12;
    if (minEl)  minEl.value  = (b.minute !== undefined && b.minute !== null) ? b.minute : 0;

    /* ② 장소 선택 — tz 일치 옵션 중 좌표 최근접 매칭(전 지역 정확 복원), 폴백 tz-only */
    var countrySel = document.getElementById('birthCountry');
    if (countrySel && l.tz) {
      _dpSelectBirthPlaceOption(countrySel, l.tz, profileLng, (l.lat != null ? l.lat : l.latitude));
    }

    /* ③ 성별 동기화 */
    if (window.setGender) window.setGender(profile.gender || 'F');
    window._gender = profile.gender || 'F';
    
    /* ③-2. 성별 버튼 UI 동기화 */
    var btnF = document.getElementById('btnF');
    var btnM = document.getElementById('btnM');
    if (btnF || btnM) {
      var gender = profile.gender || 'F';
      if (btnF) {
        if (gender === 'F') {
          btnF.classList.add('selected');
          btnM && btnM.classList.remove('selected');
        } else {
          btnF.classList.remove('selected');
        }
      }
      if (btnM) {
        if (gender === 'M') {
          btnM.classList.add('selected');
          btnF && btnF.classList.remove('selected');
        } else {
          btnM.classList.remove('selected');
        }
      }
    }

    /* ④ 미리보기 갱신 — 예외 처리 강화 */
    try {
      if (window.updateLunarPreview && typeof window.updateLunarPreview === 'function') {
        window.updateLunarPreview('birthDate', 'calType', 'lunarPreview');
      }
    } catch (err) {
      console.error('[DP] 음력 미리보기 갱신 실패:', err);
    }
    try {
      if (window.updateCorrectedTimePreview && typeof window.updateCorrectedTimePreview === 'function') {
        window.updateCorrectedTimePreview();
      }
    } catch (err) {
      console.error('[DP] 시간 보정 미리보기 갱신 실패:', err);
    }

    /* ⑤ 비동기 실행 — RAF + 충분한 지연 + 폼 필드 완비 확인 후 계산 */
    requestAnimationFrame(function() {
      setTimeout(function() {
        /* 폼 필드가 완전히 준비되었는지 확인 */
        try {
          var bdVal = document.getElementById('birthDate') ? document.getElementById('birthDate').value : '';
          var hVal = document.getElementById('birthHour') ? document.getElementById('birthHour').value : '';
          var mVal = document.getElementById('birthMinute') ? document.getElementById('birthMinute').value : '';
          console.log('[DP] 폼 필드 검증:', { bd: bdVal, hour: hVal, minute: mVal });
        } catch (e) {}
        _runSajuWhenReady(60, 250);
      }, 200); /* 80ms → 200ms로 증가: 폼 완전 업데이트 및 이벤트 처리 대기 */
    });
  }

  /* ──────────────────────────────────────────
     6. UI — Profile Constellation List (바텀 시트)
  ────────────────────────────────────────── */

  /* 가로 캐러셀 양 끝 페이드. CSS mask 폭 두 개만 스크롤 위치에 따라 바꾼다.
     카드가 한 장이라 넘칠 게 없으면 양쪽 0px 이라 아무것도 흐려지지 않는다. */
  function _dpQpSyncFade(el) {
    if (!el) return;
    var max = el.scrollWidth - el.clientWidth;
    var x = el.scrollLeft;
    el.style.setProperty('--dp-qp-fade-l', (max > 2 && x > 2) ? '28px' : '0px');
    el.style.setProperty('--dp-qp-fade-r', (max > 2 && x < max - 2) ? '28px' : '0px');
  }

  /* renderProfileList 가 저장·선택·삭제·서버동기화 20여 곳에서 스트립을 다시 그리므로
     리스너는 컨테이너당 한 번만 붙인다(칩 클릭 자체는 전역 data-action 델리게이션 담당). */
  function _dpQpBindFade(el) {
    if (!el || el.dataset.qpFadeBound === '1') return;
    el.dataset.qpFadeBound = '1';
    el.addEventListener('scroll', function() { _dpQpSyncFade(el); }, { passive: true });
    if (typeof ResizeObserver === 'function') {
      try { new ResizeObserver(function() { _dpQpSyncFade(el); }).observe(el); } catch (roErr) {}
    }
  }

  /* 사주 입력 폼 위의 "사주 바로보기" 프로필 카드 캐러셀.
     칩 클릭은 기존 data-action 디스패처가 window.dpRunWithProfile 로 넘겨주므로
     여기서 클릭 핸들러를 따로 달지 않는다(핸들러 중복 방지).

     🔒 이용권 접근 정책: dpRunWithProfile 에는 dpSelectProfile 이 갖고 있는
     lockedProfileId/selectionRequired 가드가 없다. 여기서 가드를 새로 구현하면
     정책이 두 벌이 되므로, 대신 "노출 자체"를 정책에 맞춘다 —
     확정이 필요한 상태면 스트립을 숨기고, 확정된 카드가 있으면 그 카드만 보여준다. */
  function renderProfileQuickStrip() {
    var strip = document.getElementById('dpQuickPickStrip');
    var inner = document.getElementById('dpQuickPickInner');
    if (!strip || !inner) return;

    function hide() {
      strip.hidden = true;
      inner.innerHTML = '';
    }

    if (!_dpHasSessionHint()) return hide();

    var access = _dpProfileAccess || {};
    if (access.selectionRequired === true) return hide();

    var list = DPStorage.list();
    var lockedId = String(access.lockedProfileId || '').trim();
    if (lockedId) {
      list = list.filter(function(p) { return _dpGetProfileId(p) === lockedId; });
    }
    if (!list.length) return hide();

    var currId = (DPStorage.current() || {}).id;

    inner.innerHTML = list.map(function(p) {
      var safe = p || {};
      var b = safe.birth || {};
      var pid = _dpGetProfileId(safe);
      if (!pid || !b.year) return '';

      var pname = safe.name || '이름 없음';
      var dateLabel = b.year + '.' + String(b.month || 1).padStart(2, '0') + '.' + String(b.day || 1).padStart(2, '0');
      var isActive = safe.id === currId;

      return '<button type="button" class="dp-qp__chip' + (isActive ? ' is-active' : '') + '"'
        + ' role="listitem" data-action="dpRunWithProfile" data-action-args="' + _esc(pid) + '"'
        + (isActive ? ' aria-current="true"' : '')
        + ' aria-label="' + _esc(pname) + ' 프로필로 사주 바로 보기">'
        + '<span class="dp-qp__badge" aria-hidden="true">' + _zodiacEmoji(b.year) + '</span>'
        + '<span class="dp-qp__name">' + _esc(pname) + '</span>'
        + '<span class="dp-qp__date">' + dateLabel + '</span>'
        + '</button>';
    }).join('');

    strip.hidden = !inner.innerHTML;
    if (!strip.hidden) { _dpQpBindFade(inner); _dpQpSyncFade(inner); }
  }

  function renderProfileList() {
    /* 스트립은 프로필 상태가 바뀌는 모든 지점에서 같이 갱신되어야 한다.
       renderProfileList 가 이미 저장·선택·삭제·서버동기화 12곳에서 불리므로 여기 얹는다.
       try/catch 필수 — 스트립이 던지면 아래 목록 렌더까지 죽는다. */
    try { renderProfileQuickStrip(); } catch (stripErr) { console.warn('[DP] quick strip 렌더 실패', stripErr); }

    var list = DPStorage.list();
    var currId = (DPStorage.current() || {}).id;
    var container = document.getElementById('dpListInner');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = '<div class="dp-list-empty">아직 저장된 프로필 카드가 없어요.'
        + '<br><small>생년월일·태어난 시각을 입력해 첫 프로필 카드를 만들어 보세요.</small>'
        + '<br><button type="button" class="dp-list-empty-cta" onclick="dpCloseList();dpScrollToForm();"'
        + ' style="margin-top:16px;padding:11px 22px;border-radius:999px;border:1px solid rgba(255,215,0,0.42);'
        + 'background:rgba(255,215,0,0.12);color:var(--dp-gold);font-size:0.86rem;font-weight:700;cursor:pointer;'
        + 'touch-action:manipulation;-webkit-tap-highlight-color:transparent;">프로필 카드 만들기</button></div>';
      return;
    }

    // Render placeholder first to prevent blank modal during slower mobile paints.
    container.innerHTML = '<div class="dp-list-empty">프로필 목록을 불러오는 중...</div>';

    var _dpRenderProfileListFrame = function(callback) { callback(); };
    _dpRenderProfileListFrame(function() {
      try {
        var listMaxProfiles = _dpGetMaxProfiles();
        var isFreeUser = !_dpIsUnlimitedProfileLimit(listMaxProfiles) && _dpGetPositiveProfileLimit(listMaxProfiles) <= 1;
        var access = _dpProfileAccess || {};
        var selectionRequired = !!access.selectionRequired;
        var lockedProfileId = String(access.lockedProfileId || '').trim();
        var lockedNotice = selectionRequired
          ? '<div style="margin-top:10px;padding:8px 12px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.4);border-radius:8px;text-align:center;font-size:0.72rem;color:#fbbf24;">이용권 혜택이 종료되었습니다. 계속 사용할 프로필 카드 1개를 선택하면 다음 이용권 결제 전까지 해당 카드만 사용할 수 있습니다.</div>'
          : (isFreeUser
          ? '<div style="margin-top:10px;padding:8px 12px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.4);border-radius:8px;text-align:center;font-size:0.72rem;color:#fbbf24;">프로필 수정·삭제에는 5,000원 단건 결제 또는 월정석 사용이 필요합니다.</div>'
          : '');

    container.innerHTML = list.map(function(p, idx) {
          var safe = p || {};
          var b = safe.birth || {};
          var l = safe.location || {};
          var safeHour = (typeof b.hour === 'number') ? b.hour : 12;
          var safeMinute = (typeof b.minute === 'number') ? b.minute : 0;
          var safeLng = (typeof l.lng === 'number') ? l.lng : 127.0;
          var safeTzOffset = (typeof l.tzOffset === 'number') ? l.tzOffset : 9;
          var safeYear = (typeof b.year === 'number') ? b.year : new Date().getFullYear();
          var safeMonth = (typeof b.month === 'number') ? b.month : 1;
          var safeDay = (typeof b.day === 'number') ? b.day : 1;

          var isActive = safe.id === currId;
                var tzResolved = resolveTimezoneOffset(
                  { year: safeYear, month: safeMonth, day: safeDay, hour: safeHour, minute: safeMinute },
                  { tz: l.tz, tzOffset: safeTzOffset, baseTzOffset: l.baseTzOffset }
                );
                var tso = calcTrueSolarOffset(safeLng, tzResolved.tzOffsetHours);
          var corrected = applyTrueSolarOffset(safeHour, safeMinute, tso);
          var tsStr = String(corrected.h).padStart(2,'0') + ':' + String(corrected.m).padStart(2,'0');
          var zodiac = _zodiacEmoji(safeYear);
          var calLabel = b.calType === 'solar' ? '양' : (b.calType === 'lunar_leap' ? '윤' : '음');
          var pid = safe.id || ('broken_' + idx);
          var pname = safe.name || '이름 없음';
          var locLabel = l.label || '출생지 미지정';

          var isLockedOut = !!lockedProfileId && pid !== lockedProfileId;

          return '<div class="dp-list-item' + (isActive ? ' dp-list-item--active' : '') + '"'
            + ' data-profile-id="' + pid + '"'
            + ' role="button" tabindex="0"'
            + ' style="animation-delay:' + (idx * 0.07) + 's; cursor:pointer; touch-action:manipulation; -webkit-tap-highlight-color:transparent;">'
            + '<div class="dp-li-left">'
              + '<div class="dp-li-avatar">' + zodiac + '</div>'
              + '<div class="dp-li-body">'
                + '<div class="dp-li-name">' + _esc(pname)
                  + (isActive ? ' <span class="dp-li-current-badge">현재</span>' : '')
                  + (isFreeUser && isLockedOut
                    ? ' <span style="font-size:0.62rem;color:#f87171;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.3);padding:1px 6px;border-radius:10px;">사용불가</span>'
                    : '')
                  + (lockedProfileId && pid === lockedProfileId
                    ? ' <span style="font-size:0.62rem;color:#34d399;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.3);padding:1px 6px;border-radius:10px;">확정</span>'
                    : '')
                  + (safe.gender === 'M'
                    ? ' <span style="font-size:0.65rem;color:#93c5fd;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);padding:1px 6px;border-radius:10px;">&#9794;</span>'
                    : ' <span style="font-size:0.65rem;color:#f9a8d4;background:rgba(244,114,182,0.15);border:1px solid rgba(244,114,182,0.3);padding:1px 6px;border-radius:10px;">&#9792;</span>')
                + '</div>'
                + '<div class="dp-li-meta">[' + calLabel + '] ' + safeYear + '.' + safeMonth + '.' + safeDay
                  + ' · 진태양시 ' + tsStr + '</div>'
                + '<div class="dp-li-loc">📍 ' + _esc(locLabel) + '</div>'
              + '</div>'
            + '</div>'
            + '<div class="dp-li-actions" aria-label="' + _esc(_dpText('profileCardManage')) + '">'
              + '<button type="button" class="dp-li-del" aria-label="프로필 수정·삭제 정책 확인" data-profile-delete-marker="profile-list-delete-only-50coin-v20260612">\uC0AD\uC81C \u00B7 ' + (PROFILE_CARD_MANAGE_COST * 100).toLocaleString('ko-KR') + '\uC6D0/\uC6D4\uC815\uC11D</button>'
            + '</div>'
            + '<button type="button" class="dp-li-edit" aria-label="프로필 카드 수정" data-profile-edit-marker="profile-list-edit-50coin-v20260802">수정 · ' + (_dpSubIsActive && _dpSubTier === 'family' ? '무료' : (PROFILE_CARD_MANAGE_COST * 100).toLocaleString('ko-KR') + '원') + '</button>'
            + '</div>';
        }).join('') + lockedNotice;
      } catch (err) {
        console.error('[DP] renderProfileList failed', err);
        container.innerHTML = '<div class="dp-list-empty">프로필 목록을 표시할 수 없습니다.<br><small>새로고침 후 다시 시도해주세요.</small></div>';
      }
    });
  }

  /* ──────────────────────────────────────────
     7. 스타더스트(Stardust) 파티클 효과
  ────────────────────────────────────────── */
  function spawnStardust(el) {
    if (!el) return;
    var rect = el.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top  + rect.height / 2;
    for (var i = 0; i < 12; i++) {
      var dot = document.createElement('div');
      dot.className = 'dp-stardust';
      var angle = (Math.PI * 2 / 12) * i + Math.random() * 0.5;
      var dist  = 30 + Math.random() * 50;
      var tx = Math.cos(angle) * dist;
      var ty = Math.sin(angle) * dist;
      dot.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;'
        + '--tx:' + tx.toFixed(1) + 'px;--ty:' + ty.toFixed(1) + 'px;';
      document.body.appendChild(dot);
      setTimeout(function(d) { if (d.parentNode) d.parentNode.removeChild(d); }, 900, dot);
    }
  }

  /* ──────────────────────────────────────────
     8. 공개 API (window.dp*)
  ────────────────────────────────────────── */
  function _dpApplyProfileToForm(profile) {
    if (!profile || !profile.birth) return;
    var b = profile.birth;
    var l = profile.location || {};
    var nameEl = document.getElementById('nameInput');
    if (nameEl) {
      nameEl.value = profile.name || '';
      _dpDispatchProfileFieldRefresh(nameEl);
    }
    var bdEl = document.getElementById('birthDate');
    if (bdEl) {
      bdEl.value = _dpBuildProfileBirthDateValue(b.year, b.month, b.day);
      try { bdEl.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    }
    var calBtns = document.querySelectorAll('input[name="calType"]');
    calBtns.forEach(function(btn) {
      btn.checked = btn.value === (b.calType || 'solar');
      if (btn.checked) try { btn.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    });
    var hourEl = document.getElementById('birthHour');
    var minEl = document.getElementById('birthMinute');
    if (hourEl) {
      hourEl.value = (b.hour !== undefined && b.hour !== null) ? b.hour : 12;
      _dpDispatchProfileFieldRefresh(hourEl);
    }
    if (minEl) {
      minEl.value = (b.minute !== undefined && b.minute !== null) ? b.minute : 0;
      _dpDispatchProfileFieldRefresh(minEl);
    }
    var countrySel = document.getElementById('birthCountry');
    if (countrySel && l.tz) {
      var lng = (l.lng !== undefined && l.lng !== null) ? Number(l.lng) : Number(l.lon);
      _dpSelectBirthPlaceOption(countrySel, l.tz, lng, (l.lat != null ? l.lat : l.latitude));
    }
    if (window.setGender) window.setGender(profile.gender || 'F');
    window._gender = profile.gender || 'F';
    if (window.updateLunarPreview) window.updateLunarPreview('birthDate', 'calType', 'lunarPreview');
    if (window.updateCorrectedTimePreview) window.updateCorrectedTimePreview();
  }

  function _dpDispatchProfileFieldRefresh(el) {
    if (!el) return;
    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
  }

  function _dpSetProfileFieldValue(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? '' : String(value);
    _dpDispatchProfileFieldRefresh(el);
  }

  function _dpClearProfileForm() {
    _dpSetProfileFieldValue('nameInput', '');
    _dpSetProfileFieldValue('birthDate', '');
    _dpSetProfileFieldValue('birthHour', '');
    _dpSetProfileFieldValue('birthMinute', '');
    var calBtns = document.querySelectorAll('input[name="calType"]');
    calBtns.forEach(function(btn) {
      btn.checked = btn.value === 'solar';
      _dpDispatchProfileFieldRefresh(btn);
    });
    if (window.setGender) window.setGender('F');
    window._gender = 'F';
    var btnF = document.getElementById('btnF');
    var btnM = document.getElementById('btnM');
    if (btnF) {
      btnF.classList.add('selected');
      btnF.classList.add('on');
      btnF.setAttribute('aria-pressed', 'true');
    }
    if (btnM) {
      btnM.classList.remove('selected');
      btnM.classList.remove('on');
      btnM.setAttribute('aria-pressed', 'false');
    }
    if (window.updateLunarPreview) window.updateLunarPreview('birthDate', 'calType', 'lunarPreview');
    if (window.updateCorrectedTimePreview) window.updateCorrectedTimePreview();
  }

  function _dpSyncProfileFormToCurrent(profile) {
    if (profile && profile.birth) _dpApplyProfileToForm(profile);
    else _dpClearProfileForm();
  }

  window.dpSaveProfile = function() {
    var data = readFormData();
    if (!data) {
      alert('이름과 생년월일을 입력해주세요.');
      return;
    }
    var profileCount = DPStorage.list().length;
    var maxProfiles = _dpGetMaxProfiles();
    var hasProfiles = profileCount > 0;
    var canUsePlanSlot = _dpCanUseProfileSlot(profileCount, maxProfiles);
    var currentProfile = DPStorage.current();
    var isUpdate = !!(currentProfile && (currentProfile.id || currentProfile.profileId));
    var mutationAction = isUpdate ? 'update' : 'create';
    var isFamilyPlan = _dpSubIsActive && _dpSubTier === 'family';
    var createRequiresPayment = isUpdate ? !isFamilyPlan : !canUsePlanSlot;
    var createProfileId = isUpdate
      ? String(currentProfile.id || currentProfile.profileId)
      : String(data.profileId || data.id || '').trim() || _dpBuildProfileCreateId(data && data.name);
    data.profileId = createProfileId;
    data.id = createProfileId;
    var createRequestId = _dpBuildProfileManageRequestId(mutationAction, createProfileId);
    var createScope = '';
    if (createRequiresPayment) {
      var limitLabel = _dpFormatLimitLabel(maxProfiles);
      window.alert('현재 이용권에서는 프로필 카드를 ' + limitLabel + '까지 저장할 수 있어요. 기존 카드를 정리하거나 이용권을 확인해 주세요.');
      return;
    }
    var createConfirm = createRequiresPayment
      ? '프로필 카드를 추가 생성할까요?\n추가 생성은 서버에서 5,000원 결제 확인 후 저장됩니다.\n입력한 생년월일/시간/성별/출생지를 다시 확인해 주세요.'
      : '새 프로필 카드를 생성할까요?\n입력한 생년월일/시간/성별/출생지를 다시 확인해 주세요.';
    if (isUpdate) {
      createConfirm = '프로필 정보를 수정할까요?\n수정·삭제에는 5,000원 단건 결제 또는 월정석 사용이 필요합니다.\n입력한 생년월일/시간/성별/출생지를 다시 확인해 주세요.';
    }
    if ((isUpdate || createRequiresPayment || !hasProfiles) && !confirm(createConfirm)) return;
    var btn = document.getElementById('dpSaveBtn');
    var savingCardVisible = false;
    function restoreCardAfterSaveAttempt() {
      rollbackOptimisticCreate();
      if (!savingCardVisible) {
        renderMasterCard(DPStorage.current());
        renderProfileList();
        _dpUpdateSaveBtn();
        return;
      }
      savingCardVisible = false;
      renderMasterCard(DPStorage.current());
    }
    var optimisticState = null;
    function applyOptimisticCreate() {
      var scope = _dpGetProfileScope();
      var before = DPStorage.list();
      optimisticState = { scope: scope, profiles: before, currentId: _dpCurrentId };
      var optimisticProfile = _dpNormalizeProfile(Object.assign({}, data, {
        id: createProfileId,
        profileId: createProfileId,
        createdAt: new Date().toISOString(),
        ownerScope: scope,
        syncStatus: 'pending'
      }));
      if (!optimisticProfile) return null;
      var next = before.filter(function(item) { return _dpGetProfileId(item) !== createProfileId; });
      next.push(optimisticProfile);
      _dpSetProfileState(scope, next, createProfileId);
      renderMasterCard(optimisticProfile);
      renderProfileList();
      broadcastProfileChange(optimisticProfile);
      _dpUpdateSaveBtn();
      return optimisticProfile;
    }
    function rollbackOptimisticCreate() {
      if (!optimisticState) return;
      _dpSetProfileState(optimisticState.scope, optimisticState.profiles, optimisticState.currentId);
      optimisticState = null;
    }
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.65';
      btn.style.cursor = 'not-allowed';
    }
    if (!applyOptimisticCreate()) {
      restoreCardAfterSaveAttempt();
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
      }
      window.alert('프로필 카드 정보를 정리하지 못했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.');
      return;
    }

    _dpVerifyLoginSession(false, { allowIndeterminate: true }).then(function(ok) {
      if (!ok) {
        throw new Error('AUTH_REQUIRED');
      }
      createScope = _dpGetProfileScope();
      function postProfile(paymentContext) {
        return _dpFetchJsonWithFallback(isUpdate ? '/api/profile/' + encodeURIComponent(createProfileId) : '/api/profile', {
          method: isUpdate ? 'PATCH' : 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: _dpBuildAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(Object.assign({
            profile: data,
            requestId: createRequestId,
            featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
            actionType: isUpdate ? 'profile_card_update' : 'create',
            profileAction: mutationAction,
            action: mutationAction,
            profileId: createProfileId,
            selectedProfileId: createProfileId
          }, paymentContext || {}))
        }, {
          retryOn401: true,
          retryTransient: true,
          maxTransientRetries: 2,
          timeoutMs: _DP_FETCH_TIMEOUT_MS,
        });
      }
      return postProfile().then(function(result) {
        var payload = result && result.data ? result.data : null;
        var code = String((payload && payload.code) || '').trim().toUpperCase();
        if (result && result.status === 402 && code === 'PAYMENT_REQUIRED') {
          return _dpRunProfileManageGate(mutationAction, createProfileId, createRequestId).then(function(paymentContext) {
            if (!paymentContext) {
              restoreCardAfterSaveAttempt();
              return null;
            }
            return postProfile(paymentContext);
          });
        }
        return result;
      });
    }).then(function(result) {
      if (!result) return null;
      if (!result || !result.ok) {
        var payload = result && result.data ? result.data : null;
        var code = String((payload && payload.code) || '').trim().toUpperCase();
        var msg = String((payload && payload.message) || '').trim();
        if (_dpIsAuthRequiredResult(result)) {
          throw new Error('AUTH_REQUIRED');
        }
        if (result && (result.status === 503 || result.status === 504 || result.status === 0)) {
          throw new Error('PROFILE_MUTATION_TRANSIENT_UNAVAILABLE');
        }
        if (result && (result.status === 409 || result.status === 403) && (code === 'PROFILE_LIMIT_RECONCILE_REQUIRED' || code === 'PROFILE_LIMIT_EXCEEDED')) {
          if (payload && payload.profilePolicySnapshot) _dpApplyProfilePolicySnapshot(payload.profilePolicySnapshot, 'profile_reconcile');
          var sub = payload && payload.subscription ? payload.subscription : null;
          var tier = _dpNormalizeTier(sub && sub.tier);
          var limit = Number(sub && sub.profileLimit);
          var limitLabel = _dpFormatLimitLabel(limit);
          var tierLabel = _dpGetTierLabel(tier);
          var nextTier = _dpGetNextTier(tier);
          var guide = nextTier
            ? ('\n/points 페이지에서 ' + _dpGetTierLabel(nextTier) + '로 업그레이드하면 더 많은 프로필을 추가할 수 있습니다.')
            : '';
          window.alert(msg || (tierLabel + ' 플랜 한도(' + limitLabel + ')에 도달했습니다.' + guide));
          restoreCardAfterSaveAttempt();
          return null;
        }
        throw new Error(msg || '프로필 저장 중 오류가 발생했습니다.');
      }

      var payloadOk = result.data && typeof result.data === 'object' ? result.data : {};
      var created = payloadOk.profile && typeof payloadOk.profile === 'object' ? payloadOk.profile : null;
      var scope = _dpGetProfileScope();
      if (createScope && scope !== createScope) {
        restoreCardAfterSaveAttempt();
        _dpLoadFromServer(function(loaded) {
          if (!loaded) return;
          renderMasterCard(DPStorage.current());
          renderProfileList();
          _dpUpdateSaveBtn();
        });
        return null;
      }
      var list = DPStorage.list();
      var nextId = created && created.id ? String(created.id) : '';
      var currentId = String(payloadOk.currentId || nextId);
      if (Array.isArray(payloadOk.profiles)) {
        _dpSetProfileState(scope, payloadOk.profiles, currentId);
      } else if (created && created.id) {
        var replaced = false;
        for (var i = 0; i < list.length; i += 1) {
          if (String(list[i] && list[i].id || '') === nextId) {
            list[i] = created;
            replaced = true;
            break;
          }
        }
        if (!replaced) list.push(created);
        _dpSetProfileState(scope, list, currentId);
      }
      optimisticState = null;

      // 저장 성공 직후에는 로컬 상태를 즉시 렌더링해 체감 반응 속도를 우선한다.
      var curr = DPStorage.current();
      savingCardVisible = false;
      spawnStardust(document.getElementById('dpSaveBtn'));
      renderMasterCard(curr);
      renderProfileList();
      _dpScrollProfileIntoViewMobile();
      broadcastProfileChange(curr || created || null);
      _dpUpdateSaveBtn();

      // 서버 재조회는 백그라운드로 수행해 최종 정합성만 보정한다.
      _dpLoadFromServer(function(loaded) {
        if (!loaded) return;
        var refreshedCurr = DPStorage.current();
        renderMasterCard(refreshedCurr || curr || created || null);
        renderProfileList();
        broadcastProfileChange(refreshedCurr || curr || created || null);
        _dpUpdateSaveBtn();
      });

      _toast('생년월일·출생시간·성별 정보는 운세 서비스 제공 목적에 한해 서버에 안전하게 저장됩니다.', 'privacy');
      return null;
    }).catch(function(err) {
      var msg = String((err && err.message) || '프로필 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      restoreCardAfterSaveAttempt();
      if (msg === 'AUTH_REQUIRED') {
        if (window.confirm(_dpText('loginRequiredConfirm'))) {
          window.location.href = '/login?next=%2F';
          return;
        }
        msg = '로그인 상태를 확인한 뒤 다시 시도해 주세요.';
      }
      if (msg === 'PROFILE_MUTATION_TRANSIENT_UNAVAILABLE') {
        msg = '서버 연결이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.';
      }
      window.alert(msg);
    }).finally(function() {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
      }
    });
  };

  var _dpListOpenedAt = 0;
  function _dpEnsureListSheetMounted() {
    var sheet = document.getElementById('dpListSheet');
    var overlay = document.getElementById('dpListOverlay');
    if (sheet && overlay) return { sheet: sheet, overlay: overlay };
    var template = document.getElementById('dpListSheetTemplate');
    if (!template || !template.content) return null;
    var fragment = template.content.cloneNode(true);
    document.body.appendChild(fragment);
    sheet = document.getElementById('dpListSheet');
    overlay = document.getElementById('dpListOverlay');
    if (!sheet || !overlay) return null;
    if (!sheet.__dpLazyBound) {
      sheet.__dpLazyBound = true;
      var closeBtn = sheet.querySelector('.dp-sheet-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
          e.preventDefault();
          dpCloseList();
        });
      }
      overlay.addEventListener('click', function(e) {
        e.preventDefault();
        dpCloseList();
      });
    }
    return { sheet: sheet, overlay: overlay };
  }

  function _dpUnmountListSheetAfterClose(sheet, overlay) {
    window.setTimeout(function() {
      var currentSheet = document.getElementById('dpListSheet');
      if (currentSheet && !currentSheet.classList.contains('dp-sheet--open')) currentSheet.remove();
      var currentOverlay = document.getElementById('dpListOverlay');
      if (currentOverlay && (!currentSheet || !currentSheet.classList.contains('dp-sheet--open'))) currentOverlay.remove();
    }, 260);
  }

  window.dpOpenList = function() {
    var mounted = _dpEnsureListSheetMounted();
    var sheet = mounted && mounted.sheet;
    var overlay = mounted && mounted.overlay;
    var scroller = sheet ? sheet.querySelector('.dp-list-scroll') : null;
    var container = document.getElementById('dpListInner');
    if (!sheet || !overlay) {
      console.error('[DP] list modal elements missing');
      return;
    }

    sheet.classList.add('dp-sheet--open');
    overlay.classList.add('dp-sheet--open');
    sheet.setAttribute('aria-hidden', 'false');
    _dpListOpenedAt = Date.now();

    function renderOpenList() {
      try {
        renderProfileList();
        if (scroller) scroller.scrollTop = 0;
      } catch (err) {
        console.error('[DP] openList render failed', err);
        if (container) {
          container.innerHTML = '<div class="dp-list-empty">\uD504\uB85C\uD544 \uB85C\uB529 \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.<br><small>\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.</small></div>';
        }
      }

      if (sheet && !_isMobileViewport()) {
        _bodyLocked = true;
        if (window._perf && window._perf.lockBody) window._perf.lockBody();
        else document.body.style.overflow = 'hidden';
      }
    }

    var hasCachedProfiles = false;
    try {
      hasCachedProfiles = DPStorage.list().length > 0;
    } catch (e) {}

    if (_dpHasSessionHint()) {
      if (hasCachedProfiles) {
        renderOpenList();
      } else if (container) {
        container.innerHTML = '<div class="dp-list-empty">\uC0DD\uC131\uD55C \uD504\uB85C\uD544 \uAD8C\uD55C\uC744 \uD655\uC778\uD558\uB294 \uC911...</div>';
      }
      _dpLoadFromServer(function(loaded) {
        if (!loaded) {
          if (!hasCachedProfiles && container) {
            container.innerHTML = '<div class="dp-list-empty">\uC11C\uBC84\uC5D0\uC11C \uD504\uB85C\uD544 \uAD8C\uD55C\uC744 \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.<br><small>\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC5F4\uC5B4 \uC8FC\uC138\uC694.</small></div>';
          }
          return;
        }
        renderOpenList();
      });
      return;
    }

    renderOpenList();
  };

  window.dpCloseList = function() {
    var sheet = document.getElementById('dpListSheet');
    var overlay = document.getElementById('dpListOverlay');
    if (sheet) {
      sheet.classList.remove('dp-sheet--open');
      sheet.setAttribute('aria-hidden', 'true');
      if (overlay) overlay.classList.remove('dp-sheet--open');
      _dpUnmountListSheetAfterClose(sheet, overlay);
    }
    if (_bodyLocked) {
      _bodyLocked = false;
      if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
      else document.body.style.overflow = '';
    }

    /* lockBody 잔여 스타일 강제 정리 (모바일 fullscreen 고착 방지) */
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  };

  window.dpEditProfile = function(id) {
    var profileId = String(id || '').trim();
    var profile = _dpFindProfileById(DPStorage.list(), profileId);
    if (!profile) {
      alert('수정할 프로필 카드를 찾을 수 없습니다.');
      return;
    }
    DPStorage.setCurrent(profileId);
    _dpSyncProfileFormToCurrent(profile);
    renderMasterCard(profile);
    renderProfileList();
    _dpUpdateSaveBtn();
    dpCloseList();
    if (typeof window.dpScrollToForm === 'function') window.dpScrollToForm();
  };

  window.dpSelectProfile = function(id) {
    var profileId = String(id || '').trim();
    var selectedProfile = _dpFindProfileById(DPStorage.list(), profileId);
    if (!selectedProfile) {
      alert('선택한 프로필 카드를 찾을 수 없습니다.');
      renderProfileList();
      return;
    }
    var access = _dpProfileAccess || {};
    var lockedId = String(access.lockedProfileId || '').trim();
    var isServerLocked = String(access.mode || '').trim() === 'single' || access.locked === true || !!lockedId;
    function activateSelectedProfile(serverConfirmed) {
      DPStorage.setCurrent(profileId);
      var p = DPStorage.current() || selectedProfile;
      _dpSyncProfileFormToCurrent(p);
      renderMasterCard(p);
      renderProfileList();
      broadcastProfileChange(p);
      _dpUpdateSaveBtn();
      dpCloseList();
      spawnStardust(document.getElementById('dpMasterCard'));
      _toast('✨ ' + (p ? _esc(p.name) : '') + ' · 프로필 활성화', 'success');
      if (!serverConfirmed && _dpHasSessionHint()) {
        _dpCommitSingleProfileSelection(profileId, function(ok) {
          if (ok) return;
          _dpClearPendingCurrentProfile(profileId);
          _dpLoadFromServer(function(loaded) {
            if (!loaded) return;
            var restored = DPStorage.current();
            _dpSyncProfileFormToCurrent(restored);
            renderMasterCard(restored);
            renderProfileList();
            broadcastProfileChange(restored || null);
            _dpUpdateSaveBtn();
          });
        });
      }
    }

    if (isServerLocked && lockedId && profileId !== lockedId) {
      alert('이용권 혜택 종료 후 확정한 프로필 카드만 사용할 수 있습니다.\n/points 페이지에서 이용권을 결제하면 다시 여러 프로필을 이용할 수 있습니다.');
      return;
    }

    if (access.selectionRequired === true) {
      var profileName = selectedProfile && selectedProfile.name ? selectedProfile.name : '선택한 프로필';
      if (!confirm(profileName + ' 프로필 카드로 확정할까요?\n확정 후 추가 이용권 결제 전까지 이 카드만 사용할 수 있습니다.')) return;
      _dpCommitSingleProfileSelection(profileId, function(ok) {
        if (!ok) {
          _dpClearPendingCurrentProfile(profileId);
          _dpLoadFromServer(function(loaded) {
            if (!loaded) return;
            var restored = DPStorage.current();
            _dpSyncProfileFormToCurrent(restored);
            renderMasterCard(restored);
            renderProfileList();
            broadcastProfileChange(restored || null);
            _dpUpdateSaveBtn();
          });
          return;
        }
        _dpProfileAccess.selectionRequired = false;
        _dpProfileAccess.locked = true;
        _dpProfileAccess.lockedProfileId = profileId;
        activateSelectedProfile(true);
      });
      return;
    }

    activateSelectedProfile(false);
    return;
  };

  window.dpToggleProfileMenu = function(event) {
    var btn = event && event.currentTarget ? event.currentTarget : document.querySelector('#dpMasterCard .dp-mc-menu-btn');
    _dpToggleProfileMenuFromButton(btn, event, event && event.source);
  };

  window.dpCloseProfileMenu = _dpCloseProfileMenu;

  window.dpRunProfileMenuAction = function(node, event) {
    _dpRunProfileMenuActionNode(node, event);
  };

  window.dpDeleteProfile = function(id) {
    var profileId = String(id || '').trim();
    var list = DPStorage.list();
    var profile = list.find(function(item) { return item && String((item.id || item.profileId) || '').trim() === profileId; });
    if (!profile) {
      alert('삭제할 프로필 카드를 찾을 수 없습니다.');
      return;
    }
    var currentBeforeDelete = DPStorage.current();
    var currentBeforeDeleteId = String((currentBeforeDelete && (currentBeforeDelete.id || currentBeforeDelete.profileId)) || '').trim();
    var wasCurrentProfile = currentBeforeDeleteId === profileId;
    var deletedBirth = profile.birth || {};
    var hasDeletedBirthDate = deletedBirth.year != null && deletedBirth.month != null && deletedBirth.day != null;
    var deletedBirthDate = hasDeletedBirthDate
      ? deletedBirth.year + '-' + String(deletedBirth.month).padStart(2, '0') + '-' + String(deletedBirth.day).padStart(2, '0')
      : '';
    var deletedBirthTime = deletedBirth.hour != null && deletedBirth.minute != null
      ? String(deletedBirth.hour).padStart(2, '0') + ':' + String(deletedBirth.minute).padStart(2, '0')
      : '';
    var formBirthDate = _dpNormalizeBirthDateInputValue((document.getElementById('birthDate') || {}).value || '');
    var rawFormHour = String((document.getElementById('birthHour') || {}).value || '').trim();
    var rawFormMinute = String((document.getElementById('birthMinute') || {}).value || '').trim();
    var formBirthTime = rawFormHour !== '' && rawFormMinute !== ''
      ? rawFormHour.padStart(2, '0') + ':' + rawFormMinute.padStart(2, '0')
      : '';
    var formName = String((document.getElementById('nameInput') || {}).value || '').trim();
    var wasLoadedFormProfile = !!deletedBirthDate
      && formBirthDate === deletedBirthDate
      && (!deletedBirthTime || formBirthTime === deletedBirthTime)
      && (!formName || !profile.name || formName === String(profile.name).trim());
    var deleteLock = _dpReadProfileDeleteLock();
    if (deleteLock.profileId === profileId) {
      var lockAgeMs = deleteLock.startedAt ? (Date.now() - deleteLock.startedAt) : 0;
      if (!lockAgeMs || lockAgeMs < 1200) return;
      if (lockAgeMs < 45000) return;
      _dpClearProfileDeleteLock(profileId);
    }
    var requestId = _dpBuildProfileManageRequestId('delete', profileId);
    _dpSetProfileDeleteLock(profileId);
    var deleteOptimisticState = null;

    function applyOptimisticDelete() {
      var scope = _dpGetProfileScope();
      var before = DPStorage.list();
      deleteOptimisticState = { scope: scope, profiles: before, currentId: _dpCurrentId };
      var nextProfiles = before.filter(function(item) {
        return _dpGetProfileId(item) !== profileId;
      });
      var nextCurrentId = wasCurrentProfile
        ? (_dpGetProfileId(nextProfiles[0]) || '')
        : String(_dpCurrentId || '');
      _dpClearPendingCurrentProfile(profileId);
      _dpSetProfileState(scope, nextProfiles, nextCurrentId);
      var current = DPStorage.current();
      if (wasCurrentProfile || wasLoadedFormProfile) {
        _dpSyncProfileFormToCurrent(current);
      }
      renderMasterCard(current);
      renderProfileList();
      broadcastProfileChange(current || null);
      _dpUpdateSaveBtn();
    }

    function rollbackOptimisticDelete() {
      if (!deleteOptimisticState) return;
      _dpSetProfileState(deleteOptimisticState.scope, deleteOptimisticState.profiles, deleteOptimisticState.currentId);
      deleteOptimisticState = null;
      var current = DPStorage.current();
      if (wasCurrentProfile || wasLoadedFormProfile) {
        _dpSyncProfileFormToCurrent(current);
      }
      renderMasterCard(current);
      renderProfileList();
      broadcastProfileChange(current || null);
      _dpUpdateSaveBtn();
    }

    function requestDelete(paymentContext) {
      _dpSetPaymentPending(true, '\uACB0\uC81C \uD655\uC778 \uD6C4 \uD504\uB85C\uD544 \uCE74\uB4DC\uB97C \uC0AD\uC81C\uD558\uB294 \uC911\uC785\uB2C8\uB2E4...', 'confirm');
      return _dpFetchJsonWithFallback('/api/profile/' + encodeURIComponent(profileId), {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
        headers: _dpBuildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(Object.assign({
          requestId: requestId,
          featureKey: PROFILE_CARD_MANAGE_FEATURE_KEY,
          actionType: 'delete',
          profileAction: 'delete',
          action: 'delete',
          profileId: profileId,
          selectedProfileId: profileId
        }, paymentContext || {}))
      }, {
        retryOn401: true,
        retryTransient: true,
        maxTransientRetries: 2,
        timeoutMs: _DP_FETCH_TIMEOUT_MS
      });
    }

    // 삭제창은 로컬 카드만으로 먼저 열어 체감 지연을 없앤다. 인증과 결제 검증은
    // 사용자가 삭제/결제 방식을 확정한 뒤 서버 요청 직전에 수행한다.
    _dpSetPaymentPending(false);
    _dpRunProfileDeleteGate(profile, profileId, requestId).then(function(paymentContext) {
      if (!paymentContext) return null;
      return _dpVerifyLoginSession(true).then(function(ok) {
        if (!ok) throw new Error('AUTH_REQUIRED');
        return requestDelete(paymentContext);
      });
    }).then(function(result) {
      _dpSetPaymentPending(false);
      if (!result) return;
      if (!result.ok || !result.data || result.data.ok === false) {
        if (_dpIsAuthRequiredResult(result)) throw new Error('AUTH_REQUIRED');
        if (result && (result.status === 503 || result.status === 504 || result.status === 0)) {
          throw new Error('PROFILE_MUTATION_TRANSIENT_UNAVAILABLE');
        }
        throw new Error((result.data && result.data.message) || '프로필 카드 삭제에 실패했습니다.');
      }
      var payload = result.data || {};
      if (payload.profilePolicySnapshot) _dpApplyProfilePolicySnapshot(payload.profilePolicySnapshot, 'profile_delete');
      _dpClearPendingCurrentProfile(profileId);
      if (Array.isArray(payload.profiles)) {
        var nextProfiles = payload.profiles.filter(function(item) {
          return _dpGetProfileId(item) !== profileId;
        });
        var stateSynced = _dpSetProfileState(_dpGetProfileScope(), nextProfiles, payload.currentId || '');
        if (!stateSynced) DPStorage.remove(profileId);
      } else {
        DPStorage.remove(profileId);
      }
      deleteOptimisticState = null;
      var current = DPStorage.current();
      if (wasCurrentProfile || wasLoadedFormProfile) {
        _dpSyncProfileFormToCurrent(current);
      }
      renderMasterCard(current);
      renderProfileList();
      broadcastProfileChange(current || null);
      _dpUpdateSaveBtn();
      _toast('프로필 카드 "' + String((profile && profile.name) || '선택한 프로필') + '"를 삭제했습니다.', 'success');
      _dpLoadFromServer(function(loaded) {
        if (!loaded) return;
        var refreshed = DPStorage.current();
        if (wasCurrentProfile || wasLoadedFormProfile) {
          _dpSyncProfileFormToCurrent(refreshed);
        }
        renderMasterCard(refreshed);
        renderProfileList();
        broadcastProfileChange(refreshed || null);
        _dpUpdateSaveBtn();
      });
      return null;
    }).catch(function(error) {
      _dpSetPaymentPending(false);
      rollbackOptimisticDelete();
      if (String(error && error.message || '') === 'PROFILE_MUTATION_TRANSIENT_UNAVAILABLE') {
        error = new Error('서버 연결이 잠시 불안정해요. 결제 상태는 보존되며, 잠시 후 다시 시도해 주세요.');
      }
      var msg = String(error && error.message || '프로필 카드 삭제 중 오류가 발생했습니다.');
      if (msg === 'AUTH_REQUIRED') msg = '로그인 상태를 확인한 뒤 다시 시도해 주세요.';
      alert(msg);
      _dpLoadFromServer(function(loaded) {
        if (!loaded) return;
        var refreshed = DPStorage.current();
        if (wasCurrentProfile || wasLoadedFormProfile) {
          _dpSyncProfileFormToCurrent(refreshed);
        }
        renderMasterCard(refreshed);
        renderProfileList();
        broadcastProfileChange(refreshed || null);
        _dpUpdateSaveBtn();
      });
    }).then(function() {
      _dpClearProfileDeleteLock(profileId);
    });
  };

  /** 베다점 등 외부 페이지로 넘길 현재 프로필 (저장된 현재 선택 프로필 또는 폼 데이터) */
  window.dpGetDataForVedic = function() {
    var p = _resolveVedicProfileCandidate();
    if (p && p.birth) return _buildVedicBridgePayload(p);
    return _buildVedicBridgePayload(readFormData());
  };

  function _dpBuildSajuAnalysisSnapshot() {
    var natal = window.G_NATAL || {};
    var ratios = natal.ratios || {};
    var counts = natal.counts || {};
    var toNum = function(v) {
      var n = Number(v);
      return isFinite(n) ? n : 0;
    };
    var normalizedRatios = {
      wood: toNum(ratios.wood),
      fire: toNum(ratios.fire),
      earth: toNum(ratios.earth),
      metal: toNum(ratios.metal),
      water: toNum(ratios.water)
    };
    var normalizedCounts = {
      wood: toNum(counts.wood),
      fire: toNum(counts.fire),
      earth: toNum(counts.earth),
      metal: toNum(counts.metal),
      water: toNum(counts.water)
    };
    var totalCounts = normalizedCounts.wood + normalizedCounts.fire + normalizedCounts.earth + normalizedCounts.metal + normalizedCounts.water;
    var totalRatios = normalizedRatios.wood + normalizedRatios.fire + normalizedRatios.earth + normalizedRatios.metal + normalizedRatios.water;
    if (totalCounts <= 0 && totalRatios <= 0) return null;

    if (totalCounts <= 0 && totalRatios > 0) {
      normalizedCounts.wood = Math.round(normalizedRatios.wood / 10);
      normalizedCounts.fire = Math.round(normalizedRatios.fire / 10);
      normalizedCounts.earth = Math.round(normalizedRatios.earth / 10);
      normalizedCounts.metal = Math.round(normalizedRatios.metal / 10);
      normalizedCounts.water = Math.round(normalizedRatios.water / 10);
    }
    if (totalRatios <= 0 && totalCounts > 0) {
      normalizedRatios.wood = Number(((normalizedCounts.wood / totalCounts) * 100).toFixed(1));
      normalizedRatios.fire = Number(((normalizedCounts.fire / totalCounts) * 100).toFixed(1));
      normalizedRatios.earth = Number(((normalizedCounts.earth / totalCounts) * 100).toFixed(1));
      normalizedRatios.metal = Number(((normalizedCounts.metal / totalCounts) * 100).toFixed(1));
      normalizedRatios.water = Number(((normalizedCounts.water / totalCounts) * 100).toFixed(1));
    }

    return {
      dominant_element: natal.dominant || '',
      five_elements_count: normalizedCounts,
      five_elements_ratio: normalizedRatios
    };
  }

  function _dpRasterizeGuardianToPng(guardian, size) {
    return new Promise(function(resolve) {
      if (!guardian || typeof guardian !== 'object') {
        resolve(guardian);
        return;
      }
      if (guardian.image_data_uri) {
        resolve(guardian);
        return;
      }

      var svgMarkup = guardian.svg_markup ? String(guardian.svg_markup) : '';
      var fallbackSvgMarkup = guardian.fallback_svg_markup ? String(guardian.fallback_svg_markup) : '';
      var svgDataUri = guardian.svg_data_uri ? String(guardian.svg_data_uri) : '';
      var sources = [];
      if (svgDataUri) sources.push({ type: 'uri', value: svgDataUri });
      if (svgMarkup) sources.push({ type: 'svg', value: svgMarkup });
      if (fallbackSvgMarkup) sources.push({ type: 'svg', value: fallbackSvgMarkup });
      if (!sources.length) {
        resolve(guardian);
        return;
      }

      var canvasSize = Math.max(160, Math.min(640, Number(size) || 320));
      var canvas = document.createElement('canvas');
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      var ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(guardian);
        return;
      }

      function isMeaningfulCanvas() {
        try {
          var data = ctx.getImageData(0, 0, canvasSize, canvasSize).data;
          var alphaPixels = 0;
          var minL = 255;
          var maxL = 0;
          var step = Math.max(8, Math.floor((canvasSize * canvasSize) / 1200)) * 4;
          var i;
          for (i = 0; i < data.length; i += step) {
            var a = data[i + 3];
            if (a > 16) {
              alphaPixels += 1;
              var lum = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
              if (lum < minL) minL = lum;
              if (lum > maxL) maxL = lum;
            }
          }
          if (alphaPixels < 24) return false;
          return (maxL - minL) >= 10;
        } catch (e) {
          return false;
        }
      }

      var sourceIdx = 0;
      function tryNextSource() {
        if (sourceIdx >= sources.length) {
          resolve(guardian);
          return;
        }

        var src = sources[sourceIdx++];
        var img = new Image();
        var objectUrl = '';
        img.onload = function() {
          try {
            ctx.clearRect(0, 0, canvasSize, canvasSize);
            ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
            if (!isMeaningfulCanvas()) {
              if (objectUrl) URL.revokeObjectURL(objectUrl);
              tryNextSource();
              return;
            }
            guardian.image_data_uri = canvas.toDataURL('image/png');
            guardian.svg_data_uri = '';
          } catch (e) {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            tryNextSource();
            return;
          }
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          resolve(guardian);
        };
        img.onerror = function() {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          tryNextSource();
        };

        if (src.type === 'uri') {
          img.src = src.value;
          return;
        }

        try {
          var blob = new Blob([src.value], { type: 'image/svg+xml;charset=utf-8' });
          objectUrl = URL.createObjectURL(blob);
          img.src = objectUrl;
        } catch (e) {
          tryNextSource();
        }
      }

      tryNextSource();
    });
  }

  window.dpGenerateGuardianAvatar = async function() {
    var p = _dpResolveCurrentProfileForSaju();
    if (!p || !p.birth) {
      _toast('⚠️ 프로필을 먼저 저장해 주세요.', 'warn');
      return;
    }

    var btn = document.querySelector('.dp-mc-guardian-btn');
    var oldText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = '✨ 생성 중...';
      btn.style.opacity = '0.75';
    }

    try {
      var resp = await fetch('/api/guardian-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: p, sajuAnalysis: _dpBuildSajuAnalysisSnapshot(), renderMode: 'profile-mini' })
      });
      var data = await resp.json().catch(function() { return null; });
      if (!resp.ok || !data || !data.ok || !data.guardian) {
        throw new Error((data && data.message) || ('아바타 생성 실패 (' + resp.status + ')'));
      }

      var guardian = data.guardian;
      if (!guardian || !guardian.image_data_uri) {
        throw new Error('guardian-image-missing');
      }

      DPStorage.update(p.id, {
        guardianAvatar: {
          image_data_uri: guardian.image_data_uri,
          svg_data_uri: '',
          summary: guardian.summary || '',
          facial_expression: guardian.facial_expression || '',
          background_motif: guardian.background_motif || '',
          illustration_prompt: guardian.illustration_prompt || '',
          created_at: guardian.created_at || new Date().toISOString()
        }
      });

      var updated = DPStorage.current() || p;
      renderMasterCard(updated);
      broadcastProfileChange(updated);
      _toast('🪄 가디언 토템 이미지가 완성되었습니다!', 'success');
    } catch (err) {
      _toast('⚠️ 이용자가 많아서 실패했습니다. 잠시 후 다시 시도해주세요.', 'warn');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText || '🖼️ 가디언 토템 생성';
        btn.style.opacity = '';
      }
    }
  };

  window.dpLoadProfile = function() {
    var p = DPStorage.current();
    if (!p && _dpHasSessionHint()) {
      _dpLoadFromServer(function(loaded) {
        var refreshed = loaded ? DPStorage.current() : null;
        if (refreshed) {
          window.dpLoadProfile();
          return;
        }
        _toast('⚠️ 불러올 프로필이 없습니다', 'warn');
      });
      return;
    }
    if (!p) { _toast('⚠️ 불러올 프로필이 없습니다', 'warn'); return; }

    var card = document.getElementById('dpMasterCard');
    spawnStardust(card);

    /* 사주 폼 동기화 (사주 실행 경로 사전 준비) */
    var b = p.birth, l = p.location || {};
    var nameEl = document.getElementById('nameInput');
    if (nameEl) nameEl.value = p.name || '';
    var bdEl = document.getElementById('birthDate');
    if (bdEl) {
      bdEl.value = _dpBuildProfileBirthDateValue(b.year, b.month, b.day);
      try { bdEl.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    }
    var calBtns = document.querySelectorAll('input[name="calType"]');
    calBtns.forEach(function(btn) {
      btn.checked = btn.value === (b.calType || 'solar');
      if (btn.checked) try { btn.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    });
    var hourEl = document.getElementById('birthHour');
    var minEl  = document.getElementById('birthMinute');
    if (hourEl) {
      var hVal = String((b.hour !== undefined && b.hour !== null) ? b.hour : 12);
      hourEl.value = hVal;
      try { hourEl.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    }
    if (minEl) {
      var mVal = String((b.minute !== undefined && b.minute !== null) ? b.minute : 0);
      minEl.value = mVal;
      try { minEl.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    }
    var countrySel = document.getElementById('birthCountry');
    if (countrySel && l.tz) {
      _dpSelectBirthPlaceOption(countrySel, l.tz, l.lng, (l.lat != null ? l.lat : l.latitude));
    }
    if (window.setGender) window.setGender(p.gender || 'F');
    window._gender = p.gender || 'F';
    /* 성별 버튼 UI 동기화 */
    var dpBtnF = document.getElementById('btnF');
    var dpBtnM = document.getElementById('btnM');
    if (dpBtnF || dpBtnM) {
      var dpGender = p.gender || 'F';
      if (dpBtnF) {
        if (dpGender === 'F') {
          dpBtnF.classList.add('selected');
          dpBtnM && dpBtnM.classList.remove('selected');
        } else {
          dpBtnF.classList.remove('selected');
        }
      }
      if (dpBtnM) {
        if (dpGender === 'M') {
          dpBtnM.classList.add('selected');
          dpBtnF && dpBtnF.classList.remove('selected');
        } else {
          dpBtnM.classList.remove('selected');
        }
      }
    }
    if (window.updateLunarPreview) window.updateLunarPreview('birthDate', 'calType', 'lunarPreview');
    if (window.updateCorrectedTimePreview) window.updateCorrectedTimePreview();
    broadcastProfileChange(p);

    /* ── 운세 유형 선택 모달 ── */
    var zodiac   = _zodiacEmoji(b.year);
    var calLabel = b.calType === 'solar' ? '양력' : (b.calType === 'lunar_leap' ? '음력(윤)' : '음력');
    var dateStr  = calLabel + ' ' + b.year + '.' + String(b.month).padStart(2,'0') + '.' + String(b.day).padStart(2,'0')
                 + '&nbsp;·&nbsp;' + String(b.hour != null ? b.hour : 12).padStart(2,'0')
                 + ':' + String(b.minute != null ? b.minute : 0).padStart(2,'0');
    var ov = document.createElement('div');
    ov.className = 'dp-fsel-overlay';
    ov.innerHTML =
      '<div class="dp-fsel-modal">'
      + '<button type="button" class="dp-fsel-close-btn" aria-label="' + _esc(_dpText('close')) + '" onclick="window._dpCloseFortuneSel && window._dpCloseFortuneSel(); return false;">✕</button>'
      + '<div class="dp-fsel-profile">'
        + '<span class="dp-fsel-zodiac">' + zodiac + '</span>'
        + '<div class="dp-fsel-pname">' + _esc(p.name) + '</div>'
        + '<div class="dp-fsel-pdate">' + dateStr + '</div>'
        + (l.label ? '<div class="dp-fsel-ploc">📍 ' + _esc(l.label) + '</div>' : '')
      + '</div>'
      + '<div class="dp-fsel-divider"></div>'
      + '<div class="dp-fsel-ask">어떤 운세를 보시겠습니까?</div>'
      + '<div class="dp-fsel-btns">'
        + '<button class="dp-fsel-btn dp-fsel-btn--saju"   onclick="window._dpOpenFortuneType(\'saju\')"   style="touch-action:manipulation"><span class="dp-fsel-btn-icon">🔮</span><span class="dp-fsel-btn-label">사주 풀이</span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--sukuyo" onclick="window._dpOpenFortuneType(\'sukuyo\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">💫</span><span class="dp-fsel-btn-label">숙요점</span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--ziwei" onclick="window._dpOpenFortuneType(\'ziwei\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">🌌</span><span class="dp-fsel-btn-label">자미두수</span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--astro" onclick="window._dpOpenFortuneType(\'astro\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">✨</span><span class="dp-fsel-btn-label">점성술</span></button>'
        + (function(){ var lk=_dpIsFeatureLocked('olympus-fc'); return '<button class="dp-fsel-btn dp-fsel-btn--olympus' + (lk?' dp-fsel-btn--locked':'') + '" onclick="window._dpOpenFortuneType(\'olympus\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">' + (lk?'🔒':'⚡') + '</span><span class="dp-fsel-btn-label">올림푸스 신탁' + (lk?'<span class="dp-fsel-btn-cost"> 🔒 10,000원</span>':'') + '</span></button>'; })()
        + '<button class="dp-fsel-btn dp-fsel-btn--vedic" onclick="window._dpOpenFortuneType(\'vedic\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">🪐</span><span class="dp-fsel-btn-label">베다점</span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--tarot"  onclick="window._dpOpenFortuneType(\'tarot\')"  style="touch-action:manipulation"><span class="dp-fsel-btn-icon">🃏</span><span class="dp-fsel-btn-label">타로</span></button>'
        + (function(){ var lk=_dpIsFeatureLocked('flower-fc'); return '<button class="dp-fsel-btn dp-fsel-btn--flower' + (lk?' dp-fsel-btn--locked':'') + '" onclick="window._dpOpenFortuneType(\'flower\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">' + (lk?'🔒':'🌸') + '</span><span class="dp-fsel-btn-label">운명의 꽃' + (lk?'<span class="dp-fsel-btn-cost"> 20,000원</span>':'') + '</span></button>'; })()
      + '</div>'
      + '</div>';
    document.body.appendChild(ov);
    window._dpFortuneSelEl = ov;
    var doClose = function(e) {
      if (e && e.cancelable) e.preventDefault();
      if (typeof window._dpCloseFortuneSel === 'function') window._dpCloseFortuneSel();
    };
    var closeBtnEl = ov.querySelector('.dp-fsel-close-btn');
    if (closeBtnEl) {
      var closeBtnTouchState = { active: false, x: 0, y: 0, startedAt: 0 };
      closeBtnEl.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        doClose(e);
      });
      closeBtnEl.addEventListener('touchstart', function(e) {
        _dpRecordTouchTapStart(closeBtnTouchState, e);
      }, { passive: true });
      closeBtnEl.addEventListener('touchend', function(e) {
        if (!_dpIsStableTouchTap(closeBtnTouchState, e, { moveX: 24, moveY: 24 })) return;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        doClose(e);
      }, { passive: false });
      closeBtnEl.addEventListener('touchcancel', function() {
        _dpResetTouchTapState(closeBtnTouchState);
      }, { passive: true });
    }
    ov.addEventListener('click', function(e) {
      if (e.target === ov) doClose(e);
    });
    requestAnimationFrame(function() { ov.classList.add('dp-fsel-overlay--in'); });
  };

  window._dpCloseFortuneSel = function() {
    var ov = window._dpFortuneSelEl || document.querySelector('.dp-fsel-overlay');
    if (!ov) return;
    ov.classList.remove('dp-fsel-overlay--in');
    setTimeout(function() { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 350);
    window._dpFortuneSelEl = null;
  };

  window._dpOpenFortuneType = function(type) {
    /* fsel 오버레이를 페이드아웃 후 DOM에서 완전 제거한 뒤 모달 열기
       (backdrop-filter stacking context → iOS WebKit 화이트스크린 방지) */
    var ov = window._dpFortuneSelEl || document.querySelector('.dp-fsel-overlay');
    window._dpFortuneSelEl = null;

    function _openTarget() {
      /* 유료 잠금 대상 기능은 게이트를 통과해야 실행 */
      if (_DP_FEATURE_LOCKS[type]) {
        _dpGateLockFeature(type, function() { _runFortuneType(type); });
        return;
      }
      _runFortuneType(type);
    }

    function _runFortuneType(type) {
      function _olympusSunSignFromDate(month, day) {
        if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
        if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
        if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
        if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
        if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
        if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
        if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
        if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
        if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
        if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
        if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
        return 'pisces';
      }
      function _olympusTimezoneOffset() {
        var offset = -new Date().getTimezoneOffset() / 60;
        return Number.isFinite(offset) ? offset : 9;
      }
      function _olympusToDateString(birth) {
        var mm = String(birth.month).padStart(2, '0');
        var dd = String(birth.day).padStart(2, '0');
        return birth.year + '-' + mm + '-' + dd;
      }
      function _olympusToTimeString(birth) {
        var hh = String(birth.hour != null ? birth.hour : 12).padStart(2, '0');
        var mm = String(birth.minute != null ? birth.minute : 0).padStart(2, '0');
        return hh + ':' + mm;
      }
      function _olympusCommitProfile(payload) {
        try {
          sessionStorage.setItem('OLYMPUS_ORACLE_PROFILE', JSON.stringify(payload));
        } catch (e) {}
        window.location.href = '/olympus';
      }

      if (type === 'saju') {
        var p = _dpResolveCurrentProfileForSaju();
        if (p) _injectAndRun(p, 'saju');
        else _toast('⚠️ 프로필 카드의 생년월일·출생시간을 불러오지 못했습니다.', 'warn');
      } else if (type === 'sukuyo') {
        var pSukuyo = DPStorage.current();
        if (pSukuyo) _toast(_fortuneStartMessage(pSukuyo.name, 'sukuyo'), 'success');
        if (typeof openSukuyoModal === 'function') openSukuyoModal();
      } else if (type === 'ziwei') {
        var pZiwei = DPStorage.current();
        if (pZiwei) _toast(_fortuneStartMessage(pZiwei.name, 'ziwei'), 'success');
        if (typeof openZiweiModal === 'function') openZiweiModal();
      } else if (type === 'astro') {
        var pAstro = DPStorage.current();
        if (pAstro) _toast(_fortuneStartMessage(pAstro.name, 'astro'), 'success');
        if (typeof openAstroModal === 'function') openAstroModal();
      } else if (type === 'olympus') {
        var pOlympus = DPStorage.current();
        if (!pOlympus || !pOlympus.birth) {
          try { pOlympus = _normalizeProfileForVedic(readFormData()); } catch (_) {}
        }
        if (!pOlympus || !pOlympus.birth) {
          _toast('⚠️ 올림푸스 신탁은 생년월일·시간이 있는 프로필이 필요합니다.', 'warn');
          return;
        }
        if (pOlympus.id) {
          try { DPStorage.setCurrent(pOlympus.id); } catch (_) {}
        }

        function _runOlympusBridge() {
          if (typeof window.openOlympusOracleModal === 'function') {
            window.openOlympusOracleModal();
            return true;
          }
          return false;
        }

        if (_runOlympusBridge()) return;

        var _olympusScript = document.querySelector('script[src*="/js/olympus-oracle.js"]');
        if (_olympusScript) {
          setTimeout(function() {
            if (!_runOlympusBridge()) {
              _toast('⚠️ 올림푸스 신탁 모듈 로딩이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.', 'warn');
            }
          }, 0);
          return;
        }

        try {
          var _s = document.createElement('script');
          _s.src = '/js/olympus-oracle.js?v=20260506-swiss';
          _s.async = true;
          _s.defer = true;
          _s.onload = function() {
            if (!_runOlympusBridge()) {
              _toast('⚠️ 올림푸스 신탁 모듈 로딩이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.', 'warn');
            }
          };
          _s.onerror = function() {
            _toast('⚠️ 올림푸스 신탁 모듈 로딩에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'warn');
          };
          document.head.appendChild(_s);
        } catch (_) {
          _toast('⚠️ 올림푸스 신탁 모듈 로딩에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'warn');
        }
      } else if (type === 'vedic') {
        var pVedic = _resolveVedicProfileCandidate();
        if (!pVedic || !pVedic.birth) {
          try { pVedic = _normalizeProfileForVedic(readFormData()); } catch (_) {}
        }
        if (!pVedic || !pVedic.birth) {
          _toast('⚠️ 베다점을 보려면 생년월일·시간이 있는 프로필을 선택해 주세요.', 'warn');
          return;
        }
        if (pVedic.id) {
          try { DPStorage.setCurrent(pVedic.id); } catch (e0) {}
        }
        var forVedic = _buildVedicBridgePayload(pVedic);
        try {
          sessionStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(forVedic));
          localStorage.setItem('FORTUNE_APP_VEDIC_PAYLOAD', JSON.stringify(forVedic));
          sessionStorage.setItem('FORTUNE_APP_USER_PROFILE', JSON.stringify(forVedic));
          localStorage.setItem('FORTUNE_APP_USER_PROFILE', JSON.stringify(forVedic));
          window.FORTUNE_APP_VEDIC_PAYLOAD = forVedic;
        } catch (e) {}
        if (pVedic) _toast(_fortuneStartMessage(pVedic.name, 'vedic'), 'success');
        var _vdTarget = '/vedic-astrology.html';
        try {
          var _vp = encodeURIComponent(JSON.stringify(forVedic));
          _vdTarget += (_vdTarget.indexOf('?') >= 0 ? '&' : '?') + 'vp=' + _vp;
        } catch (_) {}
        window.location.href = _vdTarget;
      } else if (type === 'tarot') {
        var pTarot = DPStorage.current();
        if (pTarot) _toast(_fortuneStartMessage(pTarot.name, 'tarot'), 'success');
        var tarotEl = document.getElementById('tarotCollection');
        if (tarotEl && typeof tarotEl.scrollIntoView === 'function') {
          tarotEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.location.href = (window.location.pathname === '/' ? '#' : '/#') + 'tarotCollection';
        }
      } else if (type === 'flower') {
        var pFlower = DPStorage.current();
        if (pFlower) _toast(_fortuneStartMessage(pFlower.name, 'flower'), 'success');
        var openStudio = window.openDestinyFlowerStudio;
        var openFlower = window.openDestinyFlower;
        if (typeof openStudio === 'function') {
          openStudio();
        } else if (typeof openFlower === 'function') {
          openFlower(false);
          var flowerCard = document.querySelector('.feature-card.feature-card--destiny-flower');
          if (flowerCard && typeof flowerCard.scrollIntoView === 'function') {
            setTimeout(function() {
              flowerCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
          }
        } else {
          _toast('⚠️ 운명의 꽃 모듈이 아직 로딩 중입니다. 잠시 후 다시 시도하세요.', 'warn');
        }
      }
    }

    if (!ov) { _openTarget(); return; }

    /* CSS 트랜지션 후 제거 → 모달 열기 */
    ov.classList.remove('dp-fsel-overlay--in');
    setTimeout(function() {
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      _openTarget();
    }, 350);
  };

  window.openFortuneFromProfile = function(type) {
    var targetType = type || 'saju';
    if (typeof window._dpOpenFortuneType !== 'function') return false;

    if (targetType === 'olympus') {
      var olympusProfile = DPStorage.current();
      if (!olympusProfile || !olympusProfile.birth) {
        try { olympusProfile = _normalizeProfileForVedic(readFormData()); } catch (_) {}
      }
      if (!olympusProfile || !olympusProfile.birth) {
        _toast('⚠️ 올림푸스 신탁은 생년월일·시간이 있는 프로필을 먼저 입력해 주세요.', 'warn');
        if (typeof window.dpScrollToForm === 'function') window.dpScrollToForm();
        return false;
      }
    }

    if (targetType === 'vedic') {
      var vedicProfile = _resolveVedicProfileCandidate();
      if (!vedicProfile || !vedicProfile.birth) {
        try { vedicProfile = _normalizeProfileForVedic(readFormData()); } catch (_) {}
      }
      if (!vedicProfile || !vedicProfile.birth) {
        _toast('⚠️ 베다점을 보려면 생년월일·시간이 있는 프로필을 먼저 입력해 주세요.', 'warn');
        if (typeof window.dpScrollToForm === 'function') window.dpScrollToForm();
        return false;
      }
    }

    window._dpOpenFortuneType(targetType);
    return true;
  };

  window.dpScrollToForm = function() {
    var el = document.querySelector('.input-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* 외부에서 _injectAndRun 호출 — 프로필 전환 후 사주 재계산 */
  window.dpRunWithProfile = function(profileId) {
    var list = DPStorage.list();
    var p = null;
    for (var i = 0; i < list.length; i++) { if (list[i].id === profileId) { p = list[i]; break; } }
    if (!p) p = _dpResolveCurrentProfileForSaju(profileId);
    if (!p) {
      _toast('⚠️ 프로필 카드의 생년월일·출생시간을 불러오지 못했습니다.', 'warn');
      return;
    }
    if (_dpFindProfileById(list, profileId)) DPStorage.setCurrent(profileId);
    _injectAndRun(p, 'saju');
  };

  /**
   * 모바일 하단 네비 '사주' 탭 진입점.
   * 로그인 + 대표 프로필이 있으면 재입력 없이 곧바로 사주를 계산한다.
   * 정적 셸에서는 탭이 직접 호출하고, React 페이지에서는 /?action=cdSajuTabEntry 로 넘어와
   * 라우트 액션 러너가 호출한다(허용목록: js/core/index-inline-runtime.js).
   */
  window.cdSajuTabEntry = function() {
    var loginUrl = '/login?next=' + encodeURIComponent('/?action=cdSajuTabEntry');

    function goCreateProfile() {
      _toast('사주를 보려면 먼저 프로필을 만들어 주세요.', 'warn');
      var form = document.getElementById('destinyCardForm') || document.querySelector('.input-section');
      if (form) {
        try { form.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      }
    }

    // 세션 힌트조차 없으면 왕복 없이 바로 로그인으로 보낸다.
    if (!_dpHasSessionHint()) {
      window.location.href = loginUrl;
      return;
    }

    // 캐시에 대표 프로필이 있으면 낙관적으로 즉시 실행한다(서버 왕복 대기 없음).
    var cached = _dpResolveCurrentProfileForSaju('');
    if (cached && cached.birth && cached.birth.year) {
      _injectAndRun(cached, 'saju');
      return;
    }

    // 캐시가 비었을 때만 서버에서 대표 프로필을 받아온다.
    _dpLoadFromServer(function(loaded) {
      if (!loaded) {
        if (!_dpHasSessionHint()) window.location.href = loginUrl;
        else goCreateProfile();
        return;
      }
      var profile = _dpResolveCurrentProfileForSaju('');
      if (profile && profile.birth && profile.birth.year) _injectAndRun(profile, 'saju');
      else goCreateProfile();
    });
  };

  /* ──────────────────────────────────────────
     9. 토스트
  ────────────────────────────────────────── */
  function _toast(msg, type) {
    /* 기존 같은 타입 토스트 제거 */
    var prev = document.querySelector('.dp-toast.dp-toast--' + (type || 'info'));
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
    var t = document.createElement('div');
    t.className = 'dp-toast dp-toast--' + (type || 'info');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function() { t.classList.add('dp-toast--show'); });
    setTimeout(function() {
      t.classList.remove('dp-toast--show');
      setTimeout(function() { if(t.parentNode) t.parentNode.removeChild(t); }, 400);
    }, 2600);
  }

  /* ──────────────────────────────────────────
     10. 초기화
  ────────────────────────────────────────── */
  function _dpRenderCachedProfileNow() {
    _dpEnsureScopedStorageReady();
    var cachedProfile = DPStorage.current();
    if (!cachedProfile) return false;
    renderMasterCard(cachedProfile);
    renderProfileList();
    return true;
  }

  function init() {
    /* 모바일 브라우저(BFCache/세션 복원)에서 시트 열린 상태가 남는 문제 방지 */
    dpCloseList();

    _dpBindTouchScrollMark();

    var hasInitialSessionHint = _dpHasSessionHint();
    if (!hasInitialSessionHint) _dpEnsureScopedStorageReady();

    // 로그인 사용자도 현재 스코프에 저장된 프로필이 있으면 즉시 렌더(SWR식) —
    // DPStorage.current()는 인증 사용자 스코프 기준으로 읽으므로 이전 사용자
    // 카드가 노출되지 않는다. 저장분이 없을 때만 로딩 카드를 띄운다.
    var initialProfile = DPStorage.current();
    var shouldShowProfileLoading = hasInitialSessionHint;
    if (initialProfile) renderMasterCard(initialProfile);
    else if (shouldShowProfileLoading) renderProfileLoadingCard();
    else renderMasterCard(null);

    // 로딩 카드는 스스로 빠져나오지 못한다. 아래 부트스트랩이 어느 단계에서든 조용히 끊기면
    // (네트워크 지연·앱의 교차 출처 401·콜백 미호출) 카드가 영구히 "불러오는 중"으로 남고,
    // 그 아래 입력 폼과 겹쳐 보여 카드가 두 개인 것처럼 읽힌다. 실패해도 최종 상태로 반드시 내려온다.
    if (shouldShowProfileLoading && !initialProfile) {
      // 진행 중인 서버 조회를 잘라내면 안 된다 — 상한(10s)이 요청 타임아웃(20s)보다 짧아서,
      // 느린 기기·콜드 워커에서는 응답이 오기도 전에 이 실패안전이 먼저 터져 빈 카드를 그렸다.
      // (앱은 후보 base 를 순회하므로 더 쉽게 걸린다.) 조회가 살아 있으면 한 번 더 기다린다.
      var failsafeTicks = 0;
      var runProfileLoadingFailsafe = function() {
        var card = document.getElementById('dpMasterCard');
        if (!card || card.className.indexOf('dp-master-card--moon-loading') < 0) return;
        if (_dpLoadFromServerPending && failsafeTicks < 3) {
          failsafeTicks += 1;
          window.setTimeout(runProfileLoadingFailsafe, PROFILE_LOADING_FAILSAFE_MS);
          return;
        }
        _dpRenderProfileSyncFallback();
      };
      window.setTimeout(runProfileLoadingFailsafe, PROFILE_LOADING_FAILSAFE_MS);
    }

    /* ★ 구독 플랜 기반 저장 버튼 초기화 */
    _dpLoadSubCache();
    _dpUpdateSaveBtn();

    // 프로필 조회를 세션검증(/api/auth/me) 성공에 종속시키지 않는다.
    //
    // /api/profile 은 쿠키/Authorization 으로 독립 인증되므로(worker requireUserFromRequest)
    // me 를 기다릴 이유도, me 가 실패했다고 조회를 건너뛸 이유도 없다. 예전에는 me 가
    // 일시적으로 실패하기만 해도(타임아웃 20s·5xx·앱 교차출처 401) 프로필 조회 자체가
    // 스킵되어, 서버에 카드가 있는 로그인 사용자에게 빈 카드가 떴다 — 기기·회선에 따라
    // 결과가 달라지던 원인. _dpLoadFromServer 가 내부에서 검증을 병렬로 돌리고
    // 토큰 정리·세션 유저 persist 같은 부수효과도 그대로 수행한다.
    _dpLoadFromServer(function(loaded) {
      if (loaded) {
        renderMasterCard(DPStorage.current());
        renderProfileList();
        return;
      }
      // 실패도 하나의 최종 상태로 내려준다 — 로딩 카드가 남지 않게.
      if (shouldShowProfileLoading || initialProfile) _dpRenderProfileSyncFallback();
    });

    /* ESC 키로 시트 닫기 */
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        dpCloseList();
        _dpCloseProfileMenu();
      }
    });

    document.addEventListener('pointerdown', function(e) {
      var targetEl = _resolveEventElement(e.target);
      if (!targetEl || !targetEl.closest) return;
      var menuItem = targetEl.closest('#dpMasterCard .dp-mc-action-menu__item');
      if (menuItem) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        _dpMarkProfileMenuPointerHandled(menuItem);
        _dpProfileMenuSyntheticEvent = true;
        try {
          dpRunProfileMenuAction(menuItem, { preventDefault: function(){}, stopPropagation: function(){} });
        } finally {
          _dpProfileMenuSyntheticEvent = false;
        }
        return;
      }
      var menuBtn = targetEl.closest('#dpMasterCard .dp-mc-menu-btn');
      if (menuBtn) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        _dpMarkProfileMenuPointerHandled(menuBtn);
        _dpProfileMenuSyntheticEvent = true;
        try {
          dpToggleProfileMenu({ currentTarget: menuBtn, source: 'pointer', preventDefault: function(){}, stopPropagation: function(){} });
        } finally {
          _dpProfileMenuSyntheticEvent = false;
        }
        return;
      }
      if (!targetEl.closest('#dpMasterCard .dp-mc-action-wrap')) _dpCloseProfileMenu();
    }, { capture: true, passive: false });

    document.addEventListener('click', function(e) {
      var targetEl = _resolveEventElement(e.target);
      if (targetEl && targetEl.closest && targetEl.closest('#dpMasterCard .dp-mc-action-wrap')) return;
      _dpCloseProfileMenu();
    });

    /* 오버레이 클릭으로 시트 닫기 */
    var overlay = document.getElementById('dpListOverlay');
    if (overlay) overlay.addEventListener('click', function() {
      // 시트를 방금 연 탭(하단 '마이' 등)의 합성 click이 전체화면 오버레이로 새어
      // 시트를 즉시 닫는 "깜빡임" 회귀 방지 — 개방 직후 짧은 구간의 클릭은 무시한다.
      if (Date.now() - _dpListOpenedAt < 500) return;
      dpCloseList();
    });
    var sheet = document.getElementById('dpListSheet');
    if (sheet) {
      var sheetCloseTouchState = { active: false, x: 0, y: 0, startedAt: 0 };
      /* 시트 내부 클릭: data-action 요소는 버블링 허용, 나머지는 stopPropagation */
      sheet.addEventListener('click', function(e) {
        var targetEl = _resolveEventElement(e.target);
        if (targetEl && targetEl.closest('[data-action]')) return;
        e.stopPropagation();
      });
      /* 닫기 버튼: 시트 위임으로 처리 (직접 바인딩 실패·모바일 터치 대응) */
      sheet.addEventListener('click', function(e) {
        var targetEl = _resolveEventElement(e.target);
        if (targetEl && targetEl.closest('.dp-sheet-close')) {
          e.preventDefault();
          e.stopPropagation();
          dpCloseList();
        }
      }, true);
      sheet.addEventListener('touchstart', function(e) {
        var targetEl = _resolveEventElement(e.target);
        if (targetEl && targetEl.closest && targetEl.closest('.dp-sheet-close')) {
          _dpRecordTouchTapStart(sheetCloseTouchState, e);
          return;
        }
        _dpResetTouchTapState(sheetCloseTouchState);
      }, { capture: true, passive: true });
      sheet.addEventListener('touchend', function(e) {
        var targetEl = _resolveEventElement(e.target);
        if (!targetEl || !targetEl.closest) return;
        if (targetEl.closest('.dp-sheet-close')) {
          if (!_dpIsStableTouchTap(sheetCloseTouchState, e, { moveX: 36, moveY: 36 })) return;
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          dpCloseList();
        }
      }, { capture: true, passive: false });
      sheet.addEventListener('touchcancel', function() {
        _dpResetTouchTapState(sheetCloseTouchState);
      }, { capture: true, passive: true });
    }

    var closeBtn = document.querySelector('#dpListSheet .dp-sheet-close');
    if (closeBtn) {
      var closeBtnTouchState = { active: false, x: 0, y: 0, startedAt: 0 };
      closeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        dpCloseList();
      });
      closeBtn.addEventListener('touchstart', function(e) {
        _dpRecordTouchTapStart(closeBtnTouchState, e);
      }, { passive: true });
      closeBtn.addEventListener('touchend', function(e) {
        if (!_dpIsStableTouchTap(closeBtnTouchState, e, { moveX: 36, moveY: 36 })) return;
        if (e.cancelable) e.preventDefault();
        dpCloseList();
      }, { passive: false });
      closeBtn.addEventListener('touchcancel', function() {
        _dpResetTouchTapState(closeBtnTouchState);
      }, { passive: true });
    }

    /* 모바일: document 터치 위임 — dp-sheet 닫기 버튼 (iOS Safari onclick 유실 방지) */
    var dpSheetDocTouchState = { active: false, x: 0, y: 0, startedAt: 0 };
    document.addEventListener('touchstart', function(e) {
      if (e.touches && e.touches[0]) {
        var t = _resolveEventElement(e.target);
        if (t && t.closest && t.closest('#dpListSheet .dp-sheet-close')) {
          _dpRecordTouchTapStart(dpSheetDocTouchState, e);
          return;
        }
      }
      _dpResetTouchTapState(dpSheetDocTouchState);
    }, { passive: true });
    document.addEventListener('touchend', function(e) {
      var targetEl = _resolveEventElement(e.target);
      if (!targetEl || !targetEl.closest) return;
      var closeBtnEl = targetEl.closest('#dpListSheet .dp-sheet-close');
      if (!closeBtnEl) return;
      var sheetEl = document.getElementById('dpListSheet');
      if (!sheetEl || !sheetEl.classList.contains('dp-sheet--open')) return;
      if (_dpIsStableTouchTap(dpSheetDocTouchState, e, { moveX: 36, moveY: 36, recentScrollBlockMs: 240 })) {
        if (e.cancelable) e.preventDefault();
        dpCloseList();
      }
    }, { passive: false });
    document.addEventListener('touchcancel', function() {
      _dpResetTouchTapState(dpSheetDocTouchState);
    }, { passive: true });

    var card = document.getElementById('dpMasterCard');
    if (card) {
      var cardTouchState = { active: false, x: 0, y: 0, startedAt: 0 };
      /* 모바일에서 onclick 유실되는 경우를 대비해 터치 핸들러를 추가한다. */
      card.addEventListener('touchstart', function(e) {
        _dpRecordTouchTapStart(cardTouchState, e);
      }, { passive: true });
      card.addEventListener('touchend', function(e) {
        if (!_dpIsStableTouchTap(cardTouchState, e, { moveX: 14, moveY: 20, recentScrollBlockMs: 260 })) return;
        var targetEl = _resolveEventElement(e.target);
        if (!targetEl) return;
        var menuItem = targetEl.closest('.dp-mc-action-menu__item');
        if (menuItem) {
          if (Date.now() - _dpProfileMenuPointerHandledAt < 700) return;
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          dpRunProfileMenuAction(menuItem, { preventDefault: function(){}, stopPropagation: function(){} });
          return;
        }
        var menuBtn = targetEl.closest('.dp-mc-menu-btn');
        if (menuBtn) {
          if (Date.now() - _dpProfileMenuPointerHandledAt < 700) return;
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          dpToggleProfileMenu({ currentTarget: menuBtn, source: 'touch', preventDefault: function(){}, stopPropagation: function(){} });
          return;
        }
        /* 재시도 버튼은 .dp-mc-load-btn 스타일을 공유하므로 반드시 먼저 걸러낸다.
           아래 분기에 먼저 걸리면 카드도 없는 상태에서 dpLoadProfile()이 돈다. */
        var retryBtn = targetEl.closest('.dp-mc-retry-btn');
        if (retryBtn) {
          if (e.cancelable) e.preventDefault();
          dpRetryProfileSync();
          return;
        }
        var loadBtn = targetEl.closest('.dp-mc-load-btn');
        if (loadBtn) {
          if (e.cancelable) e.preventDefault();
          dpLoadProfile();
          return;
        }
        var guardianBtn = targetEl.closest('.dp-mc-guardian-btn');
        if (guardianBtn) {
          if (e.cancelable) e.preventDefault();
          if (typeof window.dpGenerateGuardianAvatar === 'function') window.dpGenerateGuardianAvatar();
          return;
        }
      }, { passive: false });
      card.addEventListener('touchcancel', function() {
        _dpResetTouchTapState(cardTouchState);
      }, { passive: true });
    }

    function _dpRefreshAuthScopeNow() {
      _dpScopedStorageReadyScope = '';
      _dpProfileMemoryScope = '';
      _dpProfiles = [];
      _dpCurrentId = '';
      _dpSessionVerify.checkedAt = 0;
      _dpSessionVerify.ok = false;
      _dpSessionVerify.userId = '';
      _dpSessionVerify.signature = '';
      _dpSessionVerify.pending = null;
      _dpClearGlobalProfileBridge();
      _dpPublishCurrentProfile();

      // init()과 동일하게 SWR식으로: 스코프 캐시가 있으면 로딩 카드로 되돌리지 않고
      // 마스터 카드를 유지한 채 백그라운드 갱신만 한다(이미 본 카드가 재로딩되는 증상 방지).
      // 로딩 카드는 "세션 힌트는 있으나 캐시가 없을 때"만 노출.
      var _dpScopedCurrent = DPStorage.current();
      if (_dpHasSessionHint()) {
        if (_dpScopedCurrent) renderMasterCard(_dpScopedCurrent);
        else renderProfileLoadingCard();
      } else {
        _dpEnsureScopedStorageReady();
      }
      _dpLoadSubCache();
      _dpUpdateSaveBtn();
      if (!_dpHasSessionHint()) renderMasterCard(DPStorage.current());
      renderProfileList();

      // 구독 상태는 _dpLoadFromServer가 /api/profile 응답으로 갱신하므로
      // 별도 _fetchSubscription() 호출(중복 네트워크)을 제거한다.
      _dpLoadFromServer(function(loaded) {
        if (!loaded) return;
        renderMasterCard(DPStorage.current());
        renderProfileList();
        _dpUpdateSaveBtn();
      });
    }

    // cd:auth-changed / BroadcastChannel / storage 세 리스너가 동일 인증 변경에
    // 대해 거의 동시에 발화하므로, 트레일링 디바운스로 1회 실행으로 합쳐
    // 프로필+구독 재조회 중복을 막는다(최종 인증 상태 기준으로 실행).
    var _dpAuthScopeRefreshTimer = null;
    function _dpScheduleAuthScopeRefresh() {
      // 인증이 바뀌면 이용권 판정 근거(스냅샷·미커버 캐시)가 다른 계정 것이 된다 — 즉시 버린다.
      try { if (typeof _dpClearPaidPassGateCache === 'function') _dpClearPaidPassGateCache('auth-changed'); } catch (_) {}
      try { window.__cdSubscriptionSnapshotPrewarmed = false; } catch (_) {}
      if (_dpAuthScopeRefreshTimer) clearTimeout(_dpAuthScopeRefreshTimer);
      _dpAuthScopeRefreshTimer = setTimeout(function() {
        _dpAuthScopeRefreshTimer = null;
        _dpRefreshAuthScopeNow();
      }, 150);
    }

    window.addEventListener('cd:auth-changed', _dpScheduleAuthScopeRefresh);

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        var authSyncChannel = new BroadcastChannel('code-destiny-auth-sync');
        authSyncChannel.onmessage = function() {
          _dpScheduleAuthScopeRefresh();
        };
      }
    } catch (e) {}

    window.addEventListener('storage', function(ev) {
      var key = ev && ev.key ? String(ev.key) : '';
      if (!key) return;
      if (key === 'fortune_auth_user' || key === 'fortune_auth_token' || key === 'fortune_auth_role') {
        _dpScheduleAuthScopeRefresh();
      }
    });

    /* 운세 유형 선택 모달(dp-fsel) — 모바일 터치 위임 (onclick 유실 방지) */
    var fselTouchState = { active: false, x: 0, y: 0, startedAt: 0 };
    document.addEventListener('touchstart', function(e) {
      if (e.touches && e.touches[0]) {
        var t = _resolveEventElement(e.target);
        if (t && t.closest && t.closest('.dp-fsel-overlay')) {
          _dpRecordTouchTapStart(fselTouchState, e);
          return;
        }
      }
      _dpResetTouchTapState(fselTouchState);
    }, { passive: true });
    document.addEventListener('touchend', function(e) {
      var targetEl = _resolveEventElement(e.target);
      if (!targetEl || !targetEl.closest) return;
      var closeBtn = targetEl.closest('.dp-fsel-overlay .dp-fsel-close-btn');
      if (closeBtn) {
        if (_dpIsStableTouchTap(fselTouchState, e, { moveX: 24, moveY: 24 }) && typeof window._dpCloseFortuneSel === 'function') {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          window._dpCloseFortuneSel();
        }
        return;
      }
      var btn = targetEl.closest('.dp-fsel-overlay .dp-fsel-btn');
      if (!btn) return;
      if (!_dpIsStableTouchTap(fselTouchState, e, { moveX: 10, moveY: 16 })) return; /* 스크롤로 간주 */
      if (e.cancelable) e.preventDefault();
      var type = '';
      if (btn.classList.contains('dp-fsel-btn--saju')) type = 'saju';
      else if (btn.classList.contains('dp-fsel-btn--sukuyo')) type = 'sukuyo';
      else if (btn.classList.contains('dp-fsel-btn--ziwei')) type = 'ziwei';
      else if (btn.classList.contains('dp-fsel-btn--astro')) type = 'astro';
      else if (btn.classList.contains('dp-fsel-btn--olympus')) type = 'olympus';
      else if (btn.classList.contains('dp-fsel-btn--vedic')) type = 'vedic';
      else if (btn.classList.contains('dp-fsel-btn--tarot')) type = 'tarot';
      else if (btn.classList.contains('dp-fsel-btn--flower')) type = 'flower';
      if (type && typeof window._dpOpenFortuneType === 'function') {
        window._dpOpenFortuneType(type);
      }
    }, { passive: false });
    document.addEventListener('touchcancel', function() {
      _dpResetTouchTapState(fselTouchState);
    }, { passive: true });

    /* 모바일 터치 이벤트 위임 — iOS Safari onclick 이벤트 유실 방지 */
    var listInner = document.getElementById('dpListInner');
    if (listInner) {
      var listTouchState = { active: false, x: 0, y: 0, startedAt: 0 };
      listInner.addEventListener('touchstart', function(e) {
        _dpRecordTouchTapStart(listTouchState, e);
      }, { passive: true });
      listInner.addEventListener('click', function(e) {
        var targetEl = _resolveEventElement(e.target);
        if (!targetEl) return;
        if (listTouchState.lastHandledAt && Date.now() - listTouchState.lastHandledAt < 700) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          return;
        }
        var delBtn = targetEl.closest('.dp-li-del');
        var editBtn = targetEl.closest('.dp-li-edit');
        var actionItem = targetEl.closest('[data-profile-id]');
        var actionPid = actionItem ? actionItem.getAttribute('data-profile-id') : '';
        if (!actionPid) return;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        listTouchState.lastHandledAt = Date.now();
        listTouchState.lastHandledAction = editBtn ? 'update' : (delBtn ? 'delete' : 'select');
        listTouchState.lastHandledProfileId = actionPid;
        if (editBtn) dpEditProfile(actionPid);
        else if (delBtn) dpDeleteProfile(actionPid);
        else dpSelectProfile(actionPid);
      }, true);
      listInner.addEventListener('touchend', function(e) {
        /* 스크롤이 아닌 탭만 처리 (이동 10px 미만) */
        if (!_dpIsStableTouchTap(listTouchState, e, { moveX: 10, moveY: 16 })) return;
        var targetEl = _resolveEventElement(e.target);
        if (!targetEl) return;
        var delBtn = targetEl.closest('.dp-li-del');
        var editBtn = targetEl.closest('.dp-li-edit');
        if (editBtn) {
          var editItem = targetEl.closest('[data-profile-id]');
          var editPid = editItem ? editItem.getAttribute('data-profile-id') : '';
          if (editPid) {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            listTouchState.lastHandledAt = Date.now();
            listTouchState.lastHandledAction = 'update';
            listTouchState.lastHandledProfileId = editPid;
            dpEditProfile(editPid);
          }
          return;
        }
        if (delBtn) {
          var delItem = targetEl.closest('[data-profile-id]');
          var delPid = delItem ? delItem.getAttribute('data-profile-id') : '';
          if (delPid) {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            listTouchState.lastHandledAt = Date.now();
            listTouchState.lastHandledAction = 'delete';
            listTouchState.lastHandledProfileId = delPid;
            dpDeleteProfile(delPid);
          }
          return;
        }
        var item = targetEl.closest('[data-profile-id]');
        if (item && !targetEl.closest('.dp-li-del')) {
          var pid = item.getAttribute('data-profile-id');
          if (pid) {
            if (e.cancelable) e.preventDefault();
            listTouchState.lastHandledAt = Date.now();
            listTouchState.lastHandledAction = 'select';
            listTouchState.lastHandledProfileId = pid;
            dpSelectProfile(pid);
          }
        }
      }, { passive: false });
      listInner.addEventListener('touchcancel', function() {
        _dpResetTouchTapState(listTouchState);
      }, { passive: true });
    }

    /* 폼 변경 시 카드 자동 갱신 (저장 전이라도 장소는 반영) */
    ['birthCountry'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function() {
        /* 현재 프로필이 있을 때만 리렌더 */
        if (DPStorage.current()) renderMasterCard(DPStorage.current());
      });
    });

    window.addEventListener('pageshow', function() {
      dpCloseList();
    }, { passive: true });

    /* 포그라운드 복귀 시 서버와 재동기화.
       앱은 화면을 오래 띄워둔 채 다른 기기에서 카드를 추가·삭제·전환할 수 있어, 복귀 시점의
       로컬 캐시가 낡아 있다. 서버가 정본이므로 다시 읽어온다.
       요청 중복은 _dpFetchJsonWithFallback 의 in-flight dedup 과 _dpLoadFromServerPending 이
       이미 막으므로 여기서 또 감싸지 않고, 성공 직후 반복 호출만 최소 간격으로 거른다. */
    var PROFILE_RESUME_SYNC_MIN_GAP_MS = 15000;
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState !== 'visible') return;
      if (!_dpHasSessionHint()) return;
      if (Date.now() - _dpLastServerSyncAt < PROFILE_RESUME_SYNC_MIN_GAP_MS) return;
      _dpLoadFromServer(function(loaded) {
        if (!loaded) return;
        renderMasterCard(DPStorage.current());
        renderProfileList();
        _dpUpdateSaveBtn();
      });
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* 외부 노출 */
  window.DestinyProfileManager = {
    storage: DPStorage,
    calcTrueSolarOffset: calcTrueSolarOffset,
    resolveTimezoneOffset: resolveTimezoneOffset,
    getTimeZoneOffsetHoursForDate: getTimeZoneOffsetHoursForDate
  };
  window.__cdGetCurrentDestinyProfile = function() {
    return DPStorage.current();
  };
  window.__cdListDestinyProfiles = function() {
    return DPStorage.list();
  };

  window.generateGuardianAvatar = window.dpGenerateGuardianAvatar;

  // 정적/외부 페이지 공용: 월정석 잔량 정본 조회(/api/billing/balance?moonlightStone=1).
  // 반환 Promise<{ ok, degraded, signedOut, balance }>. degrade(503)·미인증은 ok:false로 구분해 '확인 필요'로 처리한다.
  function _dpFetchMoonlightStoneBalance(opts) {
    if (typeof _dpFetchJsonWithFallback !== 'function') {
      return Promise.resolve({ ok: false, degraded: true, signedOut: false, balance: 0 });
    }
    // opts.fresh=true(수동 재조회)면 서버 표시용 잔량 캐시를 우회해 항상 최신값을 읽는다.
    var _balUrl = '/api/billing/balance?moonlightStone=1&compact=1' + ((opts && opts.fresh) ? '&fresh=1' : '');
    return _dpFetchJsonWithFallback(_balUrl, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: _dpBuildAuthHeaders()
    }, {
      allowWorkerFallback: false,
      retryOn401: true,
      timeoutMs: _DP_FETCH_TIMEOUT_MS
    }).then(function(result) {
      if (!result || !result.ok) {
        var signedOut = _dpIsAuthRequiredResult(result);
        return { ok: false, degraded: !signedOut, signedOut: signedOut, balance: 0 };
      }
      var data = (result.data && typeof result.data === 'object') ? result.data : {};
      if (data.degraded === true || (data.raw && data.raw.degraded === true)) {
        return { ok: false, degraded: true, signedOut: false, balance: 0 };
      }
      var membership = (data.membership && typeof data.membership === 'object') ? data.membership : {};
      // 같은 응답에 이미 들어있는 등급 정보를 버리지 않고 구독 스냅샷에 반영한다(추가 요청 0).
      // 이 값이 있어야 다음 결제 클릭에서 서버 왕복 없이 이용권 유무를 판정할 수 있다.
      // degraded 응답은 위에서 이미 반환됐고, 미인증이면 '이용권 없음'이 확정이다.
      try {
        if (data.authenticated === false) _dpWriteSubscriptionSnapshot({ isActive: false }, 'billing-balance');
        else if (data.membership && typeof data.membership === 'object') _dpWriteSubscriptionSnapshot(membership, 'billing-balance');
      } catch (_) {}
      var raw = (data.monthlyStoneBalance != null) ? data.monthlyStoneBalance
        : (data.membershipCreditBalance != null) ? data.membershipCreditBalance
        : (membership.monthlyStoneBalance != null) ? membership.monthlyStoneBalance : 0;
      var bal = Math.floor(Number(raw));
      if (!isFinite(bal) || bal < 0) bal = 0;
      return { ok: true, degraded: false, signedOut: data.authenticated === false, balance: bal };
    }).catch(function() {
      return { ok: false, degraded: true, signedOut: false, balance: 0 };
    });
  }
  try { window._dpFetchMoonlightStoneBalance = _dpFetchMoonlightStoneBalance; } catch (_) {}

  // 진입 시 1회 구독 스냅샷 프리워밍 — 사용자가 리딩 버튼을 누르는 시점에는 이용권 판정이 이미 끝나 있어
  // 서버 왕복 없이 결제창이 열린다. 요청은 늘지 않는다(결제창이 어차피 쓰던 /api/billing/balance 를 앞당길 뿐).
  // 셸(index.html)은 자체 스냅샷 워밍 경로가 있으므로 독립 정적 페이지에서만 돈다.
  function _dpPrewarmSubscriptionSnapshot() {
    try {
      if (window.__cdSubscriptionSnapshotPrewarmed) return;
      if (typeof window.__cdReadSubscriptionSnapshot === 'function'
        && window.__cdReadSubscriptionSnapshot !== _dpReadSubscriptionSnapshotLocal) return;
      if (!_dpHasSessionHint()) return;
      if (_dpReadSubscriptionSnapshotLocal()) return;
      window.__cdSubscriptionSnapshotPrewarmed = true;
      _dpFetchMoonlightStoneBalance({});
    } catch (_) {}
  }
  // 이용권·월정석 잔량은 결제 선택창을 열 때만 조회한다. 독립 정적 페이지 진입 시
  // idle/load 예열을 하면 사용자가 결제하지 않아도 잔액 API가 실행되어 메인 타일 판정과
  // 결제 잔액 조회가 다시 결합된다.

  // 독립(정적) 페이지용 자체 결제 선택 모달 스타일(1회 주입).
  function _dpEnsureStandalonePaymentChoiceStyle() {
    // 정본은 index.html의 _cdEnsureDirectPaymentStyles — 규칙 텍스트가 동일해야 하고
    // verify:payment-choice-parity가 세 구현(셸/React/독립 폴백)의 일치를 강제한다.
    if (typeof document === 'undefined' || document.getElementById('cdDirectPaymentStyles')) return;
    var style = document.createElement('style');
    style.id = 'cdDirectPaymentStyles';
    style.textContent = [
      ".cd-direct-payment-modal{position:fixed;inset:0;z-index:2147483004;display:none;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top,0px)) 16px max(16px,env(safe-area-inset-bottom,0px));background:radial-gradient(circle at 50% 2%,rgba(250,230,160,.2),transparent 30%),radial-gradient(circle at 16% 18%,rgba(147,197,253,.14),transparent 28%),radial-gradient(circle at 88% 74%,rgba(196,181,253,.16),transparent 30%),linear-gradient(145deg,rgba(7,11,34,.86),rgba(13,18,52,.88) 48%,rgba(21,16,42,.9));backdrop-filter:blur(16px) saturate(130%);overflow:auto}",
      ".cd-direct-payment-modal.is-open{display:flex}",
      ".cd-direct-payment-dialog{width:min(520px,100%);max-height:calc(100dvh - 32px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));border:1px solid rgba(255,242,184,.34);border-radius:24px;background:radial-gradient(circle at 50% -8%,rgba(250,230,160,.16),transparent 34%),radial-gradient(circle at 18% 20%,rgba(147,197,253,.1),transparent 32%),linear-gradient(155deg,rgba(7,12,34,.98),rgba(14,22,56,.985) 48%,rgba(33,24,64,.97));color:#f8fafc;box-shadow:0 30px 80px rgba(0,0,0,.56),0 0 46px rgba(147,197,253,.14),0 0 34px rgba(250,230,160,.1),inset 0 1px 0 rgba(255,255,255,.16);padding:18px 20px 20px;position:relative;overflow:auto;overflow-x:hidden;scrollbar-width:thin;isolation:isolate}",
      ".cd-direct-payment-dialog::before{content:\"\";position:absolute;right:-38px;top:-50px;width:166px;height:166px;border-radius:999px;background:radial-gradient(circle at 64% 35%,rgba(8,12,32,.96) 0 33%,transparent 34%),radial-gradient(circle at 38% 32%,rgba(255,242,184,.66) 0 18%,rgba(247,215,122,.28) 19% 38%,rgba(219,234,254,.09) 39% 66%,transparent 68%);filter:blur(.3px);opacity:.7;box-shadow:0 0 42px rgba(250,230,160,.16),0 0 70px rgba(147,197,253,.08);pointer-events:none}",
      ".cd-direct-payment-dialog::after{content:\"\";position:absolute;inset:0;background:radial-gradient(circle at 12% 13%,rgba(255,255,255,.8) 0 1px,transparent 2px),radial-gradient(circle at 76% 18%,rgba(186,230,253,.72) 0 1px,transparent 2px),radial-gradient(circle at 20% 58%,rgba(221,214,254,.58) 0 1px,transparent 2px),radial-gradient(circle at 88% 70%,rgba(254,243,199,.62) 0 1px,transparent 2px),radial-gradient(circle at 44% 3%,rgba(255,242,184,.16),transparent 24%);pointer-events:none;opacity:.78}",
      ".cd-direct-payment-moon-header{position:relative;z-index:2;width:112px;height:96px;margin:0 auto 8px;pointer-events:none;animation:cdDirectPaymentMoonFloat 6.8s ease-in-out infinite}",
      ".cd-direct-payment-moon-aura,.cd-direct-payment-moon-glass,.cd-direct-payment-moon-crescent,.cd-direct-payment-moon-stars,.cd-direct-payment-moon-reflect{position:absolute;pointer-events:none}",
      ".cd-direct-payment-moon-aura{border-radius:999px;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid rgba(219,234,254,.2);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 24px rgba(147,197,253,.1)}",
      ".cd-direct-payment-moon-aura--outer{width:94px;height:94px;background:radial-gradient(circle,rgba(219,234,254,.05),rgba(196,181,253,.06) 48%,transparent 70%)}",
      ".cd-direct-payment-moon-aura--inner{width:72px;height:72px;border-color:rgba(255,242,184,.24);background:radial-gradient(circle,rgba(250,230,160,.08),transparent 64%);box-shadow:0 0 30px rgba(250,230,160,.14)}",
      ".cd-direct-payment-moon-glass{left:16px;top:8px;width:80px;height:80px;border-radius:999px;background:radial-gradient(circle at 35% 26%,rgba(255,255,255,.18),transparent 24%),linear-gradient(145deg,rgba(219,234,254,.09),rgba(196,181,253,.04));border:1px solid rgba(219,234,254,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.14);backdrop-filter:blur(3px)}",
      ".cd-direct-payment-moon-crescent{left:32px;top:22px;width:50px;height:50px;border-radius:999px;background:radial-gradient(circle at 32% 28%,#fff7d6 0 20%,#fff2b8 21% 42%,#f7d77a 58%,#dbeafe 100%);box-shadow:0 0 22px rgba(250,230,160,.32),0 0 40px rgba(147,197,253,.13),inset -7px -5px 12px rgba(196,181,253,.18)}",
      ".cd-direct-payment-moon-crescent::before{content:\"\";position:absolute;left:19px;top:3px;width:48px;height:48px;border-radius:999px;background:linear-gradient(145deg,rgba(7,11,34,.96),rgba(24,21,56,.92));box-shadow:-8px 3px 14px rgba(7,11,34,.22),inset 7px 0 16px rgba(147,197,253,.06)}",
      ".cd-direct-payment-moon-crescent::after{content:\"\";position:absolute;left:10px;top:11px;width:4px;height:4px;border-radius:999px;background:rgba(255,255,255,.78);box-shadow:14px 25px 0 rgba(255,242,184,.54),22px 7px 0 rgba(219,234,254,.4);opacity:.72}",
      ".cd-direct-payment-moon-stars{left:22px;top:20px;width:3px;height:3px;border-radius:999px;background:rgba(219,234,254,.92);box-shadow:52px -6px 0 rgba(255,242,184,.78),70px 23px 0 rgba(196,181,253,.66),8px 46px 0 rgba(255,255,255,.54),58px 54px 0 rgba(186,230,253,.55)}",
      ".cd-direct-payment-moon-reflect{left:27px;right:27px;bottom:3px;height:12px;border-radius:999px;background:radial-gradient(ellipse,rgba(250,230,160,.18),rgba(147,197,253,.08) 48%,transparent 72%);filter:blur(3px)}",
      "@keyframes cdDirectPaymentMoonFloat{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-5px,0)}}",
      ".cd-direct-payment-title{position:relative;z-index:1;margin:0 0 6px;font-size:22px;font-weight:950;letter-spacing:0;color:#fff7db;text-shadow:0 0 22px rgba(245,219,154,.24)}",
      ".cd-direct-payment-sub{position:relative;z-index:1;margin:0 0 12px;color:#dbeafe;font-size:13px;line-height:1.55}",
      ".cd-direct-payment-choice-grid{display:grid;grid-template-columns:1fr;gap:10px;position:relative;z-index:1}",
      ".cd-direct-payment-option{width:100%;min-height:auto;margin:0;padding:13px 14px;border:1px solid rgba(219,234,254,.22);border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.03));color:inherit;text-align:left;cursor:pointer;position:relative;z-index:1;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.11),0 10px 26px rgba(2,6,23,.24);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,filter .18s ease}",
      ".cd-direct-payment-option::before{content:\"\";position:absolute;inset:0;background:radial-gradient(circle at 92% 16%,rgba(255,242,184,.1),transparent 30%),linear-gradient(135deg,rgba(255,255,255,.06),transparent 42%);pointer-events:none}",
      ".cd-direct-payment-option:hover{border-color:rgba(255,242,184,.64);transform:translateY(-1px);box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 16px 34px rgba(2,6,23,.34),0 0 24px rgba(250,230,160,.12)}",
      ".cd-direct-payment-option:focus{outline:0}",
      ".cd-direct-payment-option:focus-visible{outline:2px solid rgba(255,242,184,.84);outline-offset:3px;border-color:rgba(255,242,184,.78);box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 0 5px rgba(250,230,160,.1),0 0 24px rgba(147,197,253,.14)}",
      ".cd-direct-payment-option[data-mode=\"pass\"]{border-color:rgba(255,242,184,.62);background:linear-gradient(145deg,rgba(54,43,96,.84),rgba(15,34,72,.82));box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 16px 34px rgba(23,13,58,.3),0 0 24px rgba(250,230,160,.12)}",
      ".cd-direct-payment-option[data-mode=\"pass-store\"]{border-color:rgba(255,242,184,.66);background:linear-gradient(145deg,rgba(46,42,30,.84),rgba(28,32,66,.82));box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 16px 34px rgba(23,13,58,.28),0 0 24px rgba(250,230,160,.12)}",
      ".cd-direct-payment-option[data-mode=\"direct\"]{border-color:rgba(247,215,122,.42);background:linear-gradient(145deg,rgba(45,37,30,.82),rgba(31,27,43,.82))}",
      ".cd-direct-payment-option[data-mode=\"monthly\"]{border-color:rgba(147,197,253,.42);background:linear-gradient(145deg,rgba(12,40,67,.82),rgba(22,27,58,.82))}",
      ".cd-direct-payment-option strong{display:block;margin:0 0 4px;font-size:15px;line-height:1.28;color:#ffffff}",
      ".cd-direct-payment-option span{display:block;font-size:12.5px;line-height:1.45;color:#e5ecff}",
      ".cd-direct-payment-option br{display:none}",
      ".cd-direct-payment-option .cd-direct-payment-cardhead{position:relative;display:flex;align-items:center;gap:8px;margin:0 0 9px}",
      ".cd-direct-payment-cardhead .cd-direct-payment-badge{flex:0 0 auto;display:inline-flex;align-items:center;min-height:22px;padding:0 10px;border-radius:999px;border:1px solid rgba(255,242,184,.28);background:linear-gradient(135deg,rgba(255,255,255,.16),rgba(219,234,254,.07));backdrop-filter:blur(8px);font-size:11px;font-weight:900;color:#fff7db;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 0 18px rgba(250,230,160,.08)}",
      ".cd-direct-payment-badge .cd-direct-payment-glyph{display:inline;margin-right:5px;font-size:12px;line-height:1;filter:drop-shadow(0 0 6px rgba(250,230,160,.32))}",
      ".cd-direct-payment-cardhead .cd-direct-payment-recommend{margin-left:auto;flex:0 0 auto;display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;background:linear-gradient(135deg,#ffe9a8,#f6be6a);color:#3a2606;font-size:10.5px;font-weight:900;letter-spacing:.02em;box-shadow:0 4px 12px rgba(246,190,106,.34)}",
      ".cd-direct-payment-option strong .cd-direct-payment-amount{display:inline;color:#ffe9a8;font-size:16.5px;font-weight:900;letter-spacing:.01em;text-shadow:0 0 14px rgba(250,220,150,.3)}",
      ".cd-direct-payment-option .cd-direct-payment-moonbal-current{display:block;margin-top:4px;color:rgba(191,219,254,.94);font-weight:800;font-size:12px}",
      ".cd-direct-payment-option--recommended{border-color:rgba(255,224,130,.74)!important;background:linear-gradient(145deg,rgba(255,247,219,.16),rgba(250,230,160,.06))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 16px 34px rgba(2,6,23,.3),0 0 26px rgba(250,220,150,.18)!important}",
      ".cd-direct-payment-option--recommended:hover{border-color:rgba(255,232,150,.9)!important}",
      ".cd-direct-payment-option[disabled]{opacity:.45;cursor:not-allowed}",
      ".cd-direct-payment-option.is-disabled{cursor:not-allowed;opacity:.62;border-color:rgba(148,163,184,.3)!important;background:linear-gradient(145deg,rgba(30,37,54,.74),rgba(22,27,44,.74))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)!important}",
      ".cd-direct-payment-option.is-disabled:hover{transform:none;border-color:rgba(148,163,184,.3)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)!important}",
      ".cd-direct-payment-option.is-disabled strong .cd-direct-payment-amount{color:rgba(226,232,240,.64);text-shadow:none}",
      ".cd-direct-payment-option.is-loading{pointer-events:none;opacity:.72}",
      ".cd-direct-payment-balance-check{position:relative;z-index:1;margin:10px 0 0;padding:10px 12px;border-radius:14px;border:1px solid rgba(147,197,253,.24);background:linear-gradient(135deg,rgba(8,47,73,.42),rgba(30,27,75,.34));color:#dbeafe;font-size:12.5px;line-height:1.45;font-weight:800}",
      ".cd-direct-payment-balance-check{display:flex;align-items:center;justify-content:space-between;gap:10px}",
      ".cd-direct-payment-balance-check__text{min-width:0}",
      ".cd-direct-payment-refresh{flex:0 0 auto;border:1px solid rgba(255,242,184,.38);border-radius:999px;background:rgba(255,255,255,.1);padding:7px 10px;color:#fff7db;font-size:12px;font-weight:900;cursor:pointer}",
      ".cd-direct-payment-refresh:disabled{cursor:wait;opacity:.62}",
      ".cd-direct-payment-balance-check[data-state=\"fresh\"]{border-color:rgba(110,231,183,.34);color:#d1fae5;background:linear-gradient(135deg,rgba(6,78,59,.34),rgba(30,41,59,.32))}",
      ".cd-direct-payment-balance-check[data-state=\"error\"]{border-color:rgba(248,113,113,.36);color:#fee2e2;background:linear-gradient(135deg,rgba(127,29,29,.34),rgba(30,41,59,.34))}",
      ".cd-direct-payment-status{min-height:16px;margin:9px 0 0;color:#f3dd9a;font-size:12px;line-height:1.4;position:relative;z-index:1}",
      ".cd-direct-payment-note{position:relative;z-index:1;margin:0 0 10px;padding:11px 13px;border-radius:16px;background:linear-gradient(135deg,rgba(10,17,42,.76),rgba(20,28,66,.6));border:1px solid rgba(219,234,254,.22);color:#dbeafe;font-size:12.5px;line-height:1.45;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 0 22px rgba(147,197,253,.06)}",
      ".cd-direct-payment-note strong{display:block;margin-bottom:3px;color:#ffffff;font-size:15px;line-height:1.28}",
      ".cd-direct-payment-legal{position:relative;z-index:1;margin:8px 0 0;padding:0;color:rgba(219,234,254,.68);font-size:11px;line-height:1.42}",
      ".cd-direct-payment-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px;position:relative;z-index:1}",
      ".cd-direct-payment-cancel{border:1px solid rgba(186,230,253,.28);border-radius:999px;background:rgba(255,255,255,.1);color:#f8fafc;padding:9px 15px;cursor:pointer;font-weight:900}",
      "@media(max-width:760px){.cd-direct-payment-modal{align-items:center;justify-content:center;padding:max(10px,env(safe-area-inset-top,0px)) 10px max(10px,env(safe-area-inset-bottom,0px))}.cd-direct-payment-dialog{padding:12px;width:100%;max-height:calc(100dvh - 20px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));border-radius:20px}.cd-direct-payment-dialog::before{width:118px;height:118px;right:-30px;top:-42px;opacity:.58}.cd-direct-payment-moon-header{width:94px;height:78px;margin-bottom:6px}.cd-direct-payment-moon-aura--outer{width:78px;height:78px}.cd-direct-payment-moon-aura--inner{width:60px;height:60px}.cd-direct-payment-moon-glass{left:15px;top:7px;width:64px;height:64px}.cd-direct-payment-moon-crescent{left:29px;top:20px;width:39px;height:39px}.cd-direct-payment-moon-crescent::before{left:15px;top:2px;width:38px;height:38px}.cd-direct-payment-title{font-size:19px;margin-bottom:4px}.cd-direct-payment-sub{font-size:12px;line-height:1.42;margin-bottom:8px}.cd-direct-payment-note{padding:10px 11px;font-size:12px;line-height:1.4;margin-bottom:8px}.cd-direct-payment-note strong{font-size:14px}.cd-direct-payment-choice-grid{gap:8px}.cd-direct-payment-option{padding:11px 12px;border-radius:14px}.cd-direct-payment-option strong{font-size:14px}.cd-direct-payment-option span{font-size:11.5px;line-height:1.38}.cd-direct-payment-option .cd-direct-payment-cardhead{margin-bottom:8px}.cd-direct-payment-cardhead .cd-direct-payment-badge{min-height:20px;padding:0 9px;font-size:10.5px}.cd-direct-payment-option strong .cd-direct-payment-amount{font-size:15.5px}.cd-direct-payment-actions{margin-top:8px}.cd-direct-payment-cancel{padding:8px 13px;font-size:12px}}",
      "@media(prefers-reduced-motion:reduce){.cd-direct-payment-moon-header{animation:none!important}.cd-direct-payment-option{transition:none}.cd-direct-payment-option:hover{transform:none}}"
    ].join('\n');
    document.head.appendChild(style);
  }

  // 독립(정적) 페이지 전용 결제 선택 모달. 단건결제(DIRECT_KRW)와 월정석(MOONLIGHT_STONE)을 항상 동등 노출한다.
  // 이용권 선검사는 호출부(_cdOpenPaidServiceGate)에서 이미 끝난 뒤 열리므로 pass-first 순서를 지키며,
  // 실제 결제 실행은 기존 배관(_cdRunDirectKrwCheckout / _dpRunMonthlyCreditFromMainGate)이 담당한다.
  // 반환: 'direct' | 'monthly' | 'cancel'.
  function _dpRenderStandalonePaymentChoice(options) {
    if (typeof document === 'undefined') return Promise.resolve('cancel');
    var opts = options || {};
    var cost = Math.max(0, Math.floor(Number(opts.coinPrice || opts.cost || 0)));
    var amountKrw = Math.max(0, Math.floor(Number(opts.amountKrw || (cost * 100))));
    // 월정석 필요분 = 코인 × MEMBERSHIP_CREDIT_PER_COIN(10). *10이 빠지면 500석짜리를 50석으로 표시하고
    // 아래 insufficient 판정까지 오염돼 '잔량 충분'으로 오인 → 클릭 → 서버 402가 된다.
    var monthlyStones = Math.max(0, Math.floor(Number(opts.membershipCreditCost || (cost * 10))));
    var title = String(opts.title || opts.reason || '유료 서비스').trim();
    var coverage = opts.membershipCoverage && typeof opts.membershipCoverage === 'object' ? opts.membershipCoverage : null;
    var tierName = String((coverage && (coverage.tier || coverage.passTier)) || '').trim();
    // 무료/미보유 등급을 등급명으로 오표기하지 않는다(무료 이용권이라는 재화는 없음).
    var hasActivePassTier = !!(tierName && tierName.toLowerCase() !== 'free');
    // 이용권 카드는 결제창의 첫 선택지이자 이용권 검사 지점이라 항상 맨 위 + '추천'이다
    // (단건/월정석 동등 노출은 그대로 유지 — 세 카드가 모두 보인다).
    var passStoreFirst = !hasActivePassTier;
    // 🔴 결제창 문구는 셸·React 와 **같은 i18n 키**를 쓴다(js/core/checkout-entry.js 의 text()).
    // 한국어 인자는 ko 정본 폴백이며 public/i18n/*.json 12개와 함께 유지된다.
    var passBadgeLabel = _dpCheckoutText('payment.directModal.passBadge', '달빛 이용권');
    var passBadge = hasActivePassTier ? (tierName.toUpperCase() + ' ' + passBadgeLabel) : passBadgeLabel;
    var passTitle = hasActivePassTier
      ? _dpCheckoutText('payment.directModal.passUpgradeTitle', '달빛 이용권 업그레이드')
      : _dpCheckoutText('payment.directModal.passBuyTitle', '이용권으로 구매');
    var passHint = hasActivePassTier
      ? _dpCheckoutText('payment.directModal.passHint.upgrade', '지금 등급으로는 이 기능이 무료로 열리지 않습니다. 상위 이용권을 확인해 주세요.')
      : _dpCheckoutText('payment.directModal.passHint.store', '30일간 한도 이하 기능을 결제창 없이 무제한. 이미 이용권이 있으면 눌러서 바로 확인됩니다.');
    // 앱(Play Billing)에서는 외부 PG를 안내하면 사실과 다르고 Play 정책에도 걸린다.
    var directUsesAppStore = _dpShouldUseAppStoreEntry();
    var directBadge = directUsesAppStore
      ? _dpCheckoutText('payment.directModal.pgBadgeApp', 'Google Play 결제')
      : _dpCheckoutText('payment.directModal.pgBadge', 'PortOne V2 · KG이니시스');
    var directHint = directUsesAppStore
      ? _dpCheckoutText('payment.directModal.directHintApp', '지금 이 결과 하나만. Google Play 결제로 바로 열립니다.')
      : _dpCheckoutText('payment.directModal.directHint', '지금 이 결과 하나만. 카드·간편결제로 바로 열립니다.');
    var directTitleLabel = _dpCheckoutText('payment.directModal.directTitleLabel', '단건 결제');
    var monthlyHintChecking = _dpCheckoutText('payment.directModal.monthlyHint.checking', '월정석 이벤트 재화 잔량 확인이 필요합니다. 원화 단건 결제는 계속 이용할 수 있어요.');
    // 잔량 표기는 셸 formatMonthlyCreditValueWon 과 같은 키를 쓴다(코인 수치를 그대로 노출하지 않는 규칙).
    var formatMonthlyCredits = function(value) {
      var creditValue = Math.max(0, Math.floor(Number(value || 0)));
      return _dpCheckoutText('payment.currency.monthlyCredits', '{count}개', { count: creditValue.toLocaleString('ko-KR') });
    };
    var moonTitleText = _dpCheckoutText('payment.directModal.moonTitle', '달빛 결제 방식 선택');
    var recommendBadgeText = _dpCheckoutText('payment.directModal.recommendBadge', '추천');
    var monthlyBadgeText = _dpCheckoutText('payment.directModal.monthlyBadge', '월정석 사용');
    var monthlyTitleText = _dpCheckoutText('payment.directModal.monthlyTitle', '월정석 사용');
    var monthlyUnitText = _dpCheckoutText('payment.directModal.monthlyUnit', '이벤트 재화');
    var monthlyOwnedUnknownText = _dpCheckoutText('payment.directModal.monthlyBalance.ownedUnknown', '보유 월정석 · 확인 필요');
    var monthlyCheckingText = _dpCheckoutText('payment.directModal.monthlyBalance.checking', '월정석 잔여를 확인하고 있습니다.');
    var monthlyRefreshText = _dpCheckoutText('payment.directModal.monthlyBalance.refresh', '월정석 재조회');
    function esc(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
        return ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;';
      });
    }
    var passButtonHtml = '<button type="button" class="cd-direct-payment-option is-store' + (passStoreFirst ? ' cd-direct-payment-option--recommended' : '') + '" data-mode="pass-store">' +
        '<span class="cd-direct-payment-cardhead"><span class="cd-direct-payment-badge"><span class="cd-direct-payment-glyph" aria-hidden="true">🎫</span>' + esc(passBadge) + '</span>' + (passStoreFirst ? '<span class="cd-direct-payment-recommend">' + esc(recommendBadgeText) + '</span>' : '') + '</span>' +
        '<strong>' + esc(passTitle) + '</strong>' +
        '<span>' + esc(passHint) + '</span>' +
      '</button>';
    var directButtonHtml = '<button type="button" class="cd-direct-payment-option" data-mode="direct">' +
        '<span class="cd-direct-payment-cardhead"><span class="cd-direct-payment-badge"><span class="cd-direct-payment-glyph" aria-hidden="true">💳</span>' + esc(directBadge) + '</span></span>' +
        '<strong>' + esc(directTitleLabel) + ' · <span class="cd-direct-payment-amount">' + esc(_dpCheckoutText('payment.currency.krw', '{amount}원', { amount: amountKrw.toLocaleString('ko-KR') })) + '</span></strong>' +
        '<span>' + esc(directHint) + '</span>' +
      '</button>';
    var monthlyButtonHtml = '<button type="button" class="cd-direct-payment-option" data-mode="monthly" data-monthly-option>' +
        '<span class="cd-direct-payment-cardhead"><span class="cd-direct-payment-badge"><span class="cd-direct-payment-glyph" aria-hidden="true">🌙</span>' + esc(monthlyBadgeText) + '</span></span>' +
        '<strong>' + esc(monthlyTitleText) + ' · <span class="cd-direct-payment-amount">' + esc(monthlyStones.toLocaleString('ko-KR')) + '</span> ' + esc(monthlyUnitText) + '</strong>' +
        '<span data-monthly-hint>' + esc(monthlyHintChecking) + '</span>' +
        '<span class="cd-direct-payment-moonbal-current" data-monthly-current>' + esc(monthlyOwnedUnknownText) + '</span>' +
      '</button>';
    _dpEnsureStandalonePaymentChoiceStyle();
    return new Promise(function(resolve) {
      var settled = false;
      var root = document.createElement('div');
      root.id = 'cdStandalonePaymentChoice';
      root.className = 'cd-direct-payment-modal is-open';
      root.setAttribute('data-marker', 'direct-payment-pass-store-v20260607');
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', moonTitleText);
      root.innerHTML =
        '<div class="cd-direct-payment-dialog">' +
          '<div class="cd-direct-payment-moon-header" data-marker="direct-payment-luxury-moon-v20260611" aria-hidden="true">' +
            '<span class="cd-direct-payment-moon-aura cd-direct-payment-moon-aura--outer"></span>' +
            '<span class="cd-direct-payment-moon-aura cd-direct-payment-moon-aura--inner"></span>' +
            '<span class="cd-direct-payment-moon-glass"></span>' +
            '<span class="cd-direct-payment-moon-crescent"></span>' +
            '<span class="cd-direct-payment-moon-stars"></span>' +
            '<span class="cd-direct-payment-moon-reflect"></span>' +
          '</div>' +
          '<h2 class="cd-direct-payment-title">' + esc(moonTitleText) + '</h2>' +
          '<p class="cd-direct-payment-sub">' + esc(_dpCheckoutText('payment.directModal.moonSubtitle', '이용권 확인이 끝났습니다. 달빛 아래 가장 알맞은 방식으로 콘텐츠를 열어주세요.')) + '</p>' +
          '<div class="cd-direct-payment-note"><strong>' + esc(title) + '</strong>' +
            esc(_dpCheckoutText('payment.directModal.note.basis', '월정석 이벤트 재화 기준 · {amount}', { amount: amountKrw.toLocaleString('ko-KR') + '원' })) + '<br>' +
            esc(_dpCheckoutText('payment.directModal.note.withPass', '한도 이하 서비스는 이용권으로 열리고, 월정석 잔량이 충분하면 보유 월정석에서 차감됩니다.')) +
          '</div>' +
          '<div class="cd-direct-payment-choice-grid">' +
            (passStoreFirst
              ? (passButtonHtml + directButtonHtml + monthlyButtonHtml)
              : (directButtonHtml + monthlyButtonHtml + passButtonHtml)) +
          '</div>' +
          '<div class="cd-direct-payment-balance-check" data-monthly-balance-status data-state="checking">' +
            '<span class="cd-direct-payment-balance-check__text" data-monthly-balance-text>' + esc(monthlyCheckingText) + '</span>' +
            '<button type="button" class="cd-direct-payment-refresh" data-mode="monthly-refresh">' + esc(monthlyRefreshText) + '</button>' +
          '</div>' +
          '<div class="cd-direct-payment-status" data-payment-status role="status" aria-live="polite"></div>' +
          '<p class="cd-direct-payment-legal">' + _dpText('paymentBeforeWarning') + '</p>' +
          '<div class="cd-direct-payment-actions"><button type="button" class="cd-direct-payment-cancel" data-mode="cancel">' + esc(_dpCheckoutText('common.cancel', '취소')) + '</button></div>' +
        '</div>';
      var monthlyBtn = root.querySelector('[data-monthly-option]');
      var moonbalText = root.querySelector('[data-monthly-balance-text]');
      var moonbalStatus = root.querySelector('[data-monthly-balance-status]');
      var monthlyCurrent = root.querySelector('[data-monthly-current]');
      var monthlyHintNode = root.querySelector('[data-monthly-hint]');
      var moonbalBusy = false;
      // 한 번이라도 확인에 성공했으면 그 값을 들고 있다가, 뒤이은 조회 실패가 이미 확인된 잔량을
      // '확인 필요'로 되돌리지 않게 한다(셸·React 결제창의 sticky 계약과 동일).
      var lastKnownStandaloneBalance = null;
      // 월정석 잔량을 모달을 닫지 않고 제자리 갱신한다. 미확정/실패는 '확인 필요'로 두고(0으로 오인 금지),
      // 알려진 잔량이 필요분보다 적을 때만 월정석 버튼을 비활성화한다(단건 결제는 항상 가능).
      function applyStandaloneMoonbal(state, balance) {
        var fresh = state === 'fresh' && isFinite(balance) && balance >= 0;
        if (fresh) lastKnownStandaloneBalance = Math.floor(balance);
        if (state === 'signed-out') lastKnownStandaloneBalance = null;
        if (!fresh && state === 'error' && lastKnownStandaloneBalance !== null) balance = lastKnownStandaloneBalance;
        var known = fresh || (state === 'error' && lastKnownStandaloneBalance !== null);
        var insufficient = known && balance < monthlyStones;
        var balanceLabel = known ? formatMonthlyCredits(balance) : '';
        if (moonbalText) {
          moonbalText.textContent = state === 'signed-out'
            ? _dpCheckoutText('payment.directModal.monthlyBalance.signedOut', '로그인 후 월정석 잔량을 확인할 수 있어요.')
            : state === 'error'
              ? (known
                ? _dpCheckoutText('payment.directModal.monthlyBalance.staleAfterError', '월정석 잔량을 다시 확인하지 못해 직전 확인값을 표시합니다 · 현재 {balance}', { balance: balanceLabel })
                : _dpCheckoutText('payment.directModal.monthlyBalance.unconfirmed', '월정석 잔량을 확인하지 못했어요. 그대로 사용해 볼 수 있고, 부족하면 결제 단계에서 알려드려요.'))
              : known
                ? _dpCheckoutText('payment.directModal.monthlyBalance.ready', '월정석 잔여 확인 완료 · 현재 {balance}', { balance: balanceLabel })
                : monthlyCheckingText;
        }
        if (moonbalStatus) moonbalStatus.setAttribute('data-state', fresh ? 'fresh' : (state === 'fresh' ? 'checking' : state));
        if (monthlyCurrent) {
          monthlyCurrent.textContent = known
            ? _dpCheckoutText('payment.directModal.monthlyBalance.owned', '보유 월정석 {balance}', { balance: balanceLabel })
            : monthlyOwnedUnknownText;
        }
        if (monthlyHintNode) {
          monthlyHintNode.textContent = !known
            ? monthlyHintChecking
            : (insufficient
              ? _dpCheckoutText('payment.directModal.monthlyHint.insufficient', '월정석 이벤트 재화 잔량이 부족합니다. 원화 단건 결제로 진행할 수 있어요.')
              : _dpCheckoutText('payment.directModal.monthlyHint.use', '이미 받아 두신 월정석으로 결제합니다. 추가 지출 없이 열립니다.'));
        }
        if (monthlyBtn) {
          // 미인증은 월정석 결제 자체가 불가능하므로 비활성한다(React 결제창과 같은 계약).
          // 조회 실패(error)는 비활성 사유가 아니다 — 확인된 부족일 때만 잠근다.
          var blocked = insufficient || state === 'signed-out';
          if (blocked) { monthlyBtn.setAttribute('disabled', 'disabled'); monthlyBtn.classList.add('is-disabled'); }
          else { monthlyBtn.removeAttribute('disabled'); monthlyBtn.classList.remove('is-disabled'); }
        }
      }
      function refreshStandaloneMoonbal(fresh) {
        if (settled || moonbalBusy) return;
        moonbalBusy = true;
        var refreshBtn = root.querySelector('[data-mode="monthly-refresh"]');
        if (refreshBtn) refreshBtn.disabled = true;
        if (moonbalText) {
          moonbalText.textContent = fresh === true
            ? _dpCheckoutText('payment.directModal.monthlyBalance.refreshing', '월정석 잔량을 다시 조회하고 있습니다.')
            : monthlyCheckingText;
        }
        // 수동 재조회(fresh=true)는 서버 캐시를 우회해 최신값을 읽고, 자동 조회는 캐시를 허용해 빠르게 응답한다.
        var fetcher = (typeof window._dpFetchMoonlightStoneBalance === 'function')
          ? window._dpFetchMoonlightStoneBalance({ fresh: fresh === true })
          : Promise.resolve({ ok: false, degraded: true, signedOut: false, balance: 0 });
        fetcher.then(function(res) {
          if (settled) return;
          // 🔴 signedOut 을 ok 보다 먼저 본다. 서버는 게스트/만료 토큰에 200 + authenticated:false + 잔액 0 을
          // 주는데(billing.js readBillingSnapshot 의 비인증 분기), ok 를 먼저 검사하면 그 0 이 '잔여 확인 완료 ·
          // 현재 0개'라는 확신에 찬 거짓으로 렌더되고 월정석 버튼이 잠겼다 — signed-out 분기는 401/403 일 때만
          // 도달했다. 로그인 안내를 띄우는 게 맞다.
          if (res && res.signedOut) applyStandaloneMoonbal('signed-out', 0);
          else if (res && res.ok) applyStandaloneMoonbal('fresh', res.balance);
          else applyStandaloneMoonbal('error', 0);
        }).catch(function() {
          if (!settled) applyStandaloneMoonbal('error', 0);
        }).finally(function() {
          moonbalBusy = false;
          if (refreshBtn && !settled) refreshBtn.disabled = false;
        });
      }
      var modalOpenedAt = Date.now();
      // 이용권 상점으로 떠날 때도 finish('cancel') 로 닫는다(호출부 계약 유지) — 그건 이탈이 아니므로
      // 계측에서 제외한다. pass_store_entered 가 그 전이를 이미 남긴다.
      var leavingForPassStore = false;
      function finish(choice) {
        if (settled) return;
        settled = true;
        try { document.removeEventListener('keydown', onKey, true); } catch (_) {}
        if (root.parentNode) root.parentNode.removeChild(root);
        var resolved = (choice === 'direct' || choice === 'monthly' || choice === 'pass') ? choice : 'cancel';
        if (resolved === 'cancel' && !leavingForPassStore) {
          _dpTrackCheckoutEvent('checkout_dismissed', { coinPrice: cost, featureKey: opts.featureKey, dwellMs: Date.now() - modalOpenedAt });
        }
        resolve(resolved);
      }
      function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); finish('cancel'); } }
      function goPassStore() {
        _dpTrackCheckoutEvent('pass_store_entered', { option: 'pass', coinPrice: cost, featureKey: opts.featureKey });
        leavingForPassStore = true;
        finish('cancel');
        // 앱: /points 는 앱 번들에 없고 app-payment-guard 는 앵커 클릭만 가로챈다 — 반드시 이 경로를 먼저 탄다.
        try {
          if (_dpShouldUseAppStoreEntry() && typeof window.__cdOpenChargeModal === 'function') { window.__cdOpenChargeModal(); return; }
        } catch (_) {}
        // 웹: 중간 충전 모달을 건너뛰고 /points 의 이용권 결제 확인 모달까지 한 번에 간다.
        var storeUrl = _dpBuildPassStoreUrl(cost, coverage, 'standalone-payment-pass-store');
        if (storeUrl) {
          _dpRememberCheckoutReturn(opts.featureKey);
          try { window.location.assign(storeUrl); } catch (_) { window.location.href = storeUrl; }
          return;
        }
        try { if (typeof window.__cdOpenChargeModal === 'function') { window.__cdOpenChargeModal(); return; } } catch (_) {}
        try { window.location.assign('/points?source=standalone-payment-pass-store'); } catch (_) { window.location.href = '/points?source=standalone-payment-pass-store'; }
      }
      root.addEventListener('click', async function(e) {
        var hit = e.target && e.target.closest ? e.target.closest('[data-mode]') : null;
        if (hit) {
          var act = hit.getAttribute('data-mode');
          if (act === 'monthly-refresh') { e.preventDefault(); refreshStandaloneMoonbal(true); return; }
          // 🔴 '이용권으로 구매' = 이용권 검사 지점(셸 index.html 과 같은 계약). 진입 선검사가 사라졌으므로
          // 결제창을 여는 시점에는 보유 여부를 모른다 — 여기서 서버에 한 번 묻고, 커버되면 결제 없이
          // 'pass' 로 닫아 호출부가 무료로 열게 하고, 아니면 이용권 상점으로 보낸다.
          if (act === 'pass-store') {
            e.preventDefault();
            if (hit.hasAttribute('disabled')) return;
            hit.setAttribute('disabled', 'disabled');
            hit.classList.add('is-loading');
            _dpTrackCheckoutEvent('checkout_option_click', { option: 'pass', coinPrice: cost, featureKey: opts.featureKey });
            var passReady = null;
            try {
              if (typeof window.__cdApplyMembershipPassBeforePayment === 'function') {
                passReady = await window.__cdApplyMembershipPassBeforePayment(Object.assign({}, opts, {
                  title: title,
                  coinPrice: cost,
                  cost: cost
                }));
              }
            } catch (_passProbeError) { passReady = null; }
            if (passReady && (passReady.status === 'pass_applied' || passReady.status === 'already_unlocked')) {
              _dpTrackCheckoutEvent('pass_verified_free', { option: 'pass', coinPrice: cost, featureKey: opts.featureKey });
              finish('pass');
              return;
            }
            // 확인 자체가 실패(5xx/degrade/타임아웃)면 상점으로 보내지 않는다 — 지연을 미커버 근거로 쓰면
            // 실제 보유자가 이미 가진 이용권을 또 사러 가게 된다. 모달을 열어 둔 채 재시도를 안내한다.
            if (!passReady || passReady.status === 'error') {
              hit.removeAttribute('disabled');
              hit.classList.remove('is-loading');
              var passRetryNode = root.querySelector('[data-payment-status]');
              if (passRetryNode) {
                passRetryNode.textContent = _dpCheckoutText('payment.directModal.passCheckRetry', '이용권 상태를 확인하지 못했습니다. 잠시 후 다시 눌러 주세요.');
                passRetryNode.style.color = '#fca5a5';
              }
              return;
            }
            goPassStore();
            return;
          }
          if (hit.hasAttribute('disabled')) return; // 잔량 부족으로 비활성화된 월정석 버튼
          if (act === 'direct' || act === 'monthly') {
            _dpTrackCheckoutEvent('checkout_option_click', { option: act, coinPrice: cost, featureKey: opts.featureKey });
          }
          finish(act);
          return;
        }
        if (e.target === root) finish('cancel'); // 배경 클릭 = 취소
      });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(root);
      // 퍼널 시작점. 여기부터 checkout_option_click / checkout_dismissed 까지가 한 세션이다.
      _dpTrackCheckoutEvent('checkout_opened', {
        coinPrice: cost,
        featureKey: opts.featureKey,
        hasPassHint: hasActivePassTier ? 'active' : 'unknown'
      });
      // 자동 1회 재조회: 열리는 즉시 최신 월정석 잔량을 채운다(수동 버튼과 별개).
      refreshStandaloneMoonbal();
    });
  }

  if (typeof window.__cdRestoreCanonicalPaymentMode === 'function') {
    try { window.__cdRestoreCanonicalPaymentMode(); } catch (_) {}
  }
  if (typeof window._cdChooseServicePaymentMode !== 'function' || window._cdChooseServicePaymentMode.__cdSupportsPassChoice !== true) {
    var _dpCanonicalPaymentChoice = function(options) {
      var restored = null;
      if (typeof window.__cdRestoreCanonicalPaymentMode === 'function') {
        try { restored = window.__cdRestoreCanonicalPaymentMode(); } catch (_) { restored = null; }
      }
      var canonical = restored || window.__cdChooseServicePaymentModeCanonical;
      if (typeof canonical === 'function' && canonical !== _dpCanonicalPaymentChoice && canonical.__cdSupportsPassChoice === true) {
        return canonical(options || {});
      }
      // canonical 모달이 없는 독립(정적) 페이지: 정책준수 자체 결제 선택 모달(단건/월정석 동등)을 연다.
      return _dpRenderStandalonePaymentChoice(options || {});
    };
    _dpCanonicalPaymentChoice.__cdSupportsPassChoice = true;
    if (window.CodeDestinyPaymentService && typeof window.CodeDestinyPaymentService.registerPaymentWindow === 'function') {
      window.CodeDestinyPaymentService.registerPaymentWindow(_dpCanonicalPaymentChoice, 'standalone');
      var _dpPaymentServiceChoice = function(options) {
        return window.CodeDestinyPaymentService.openPaymentWindow(options || {});
      };
      _dpPaymentServiceChoice.__cdSupportsPassChoice = true;
      window._cdChooseServicePaymentMode = _dpPaymentServiceChoice;
    } else {
      window._cdChooseServicePaymentMode = _dpCanonicalPaymentChoice;
    }
  }

  window._cdCoinGatePerUse = function(cost, reason, cb, onCancel, options) {
    if (!options && onCancel && typeof onCancel === 'object' && typeof cb === 'function') {
      options = onCancel;
      onCancel = undefined;
    }

    var optionBag = (options && typeof options === 'object') ? options : {};
    var normalizedFeatureKey = _dpResolvePaidGateFeatureKey(optionBag, reason);
    var requestId = String(optionBag.requestId || '').trim().slice(0, 120);
    if (!requestId) {
      requestId = 'coin-gate-per-use-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}

    if (_cdIsAdminLikeUser()) {
      if (typeof cb === 'function') cb();
      return;
    }

    var now = Date.now();
    var lockAt = Number(window.__cdCoinGatePerUseLockAt || 0);
    var lockAgeMs = lockAt > 0 ? (now - lockAt) : 0;
    var isStaleLock = !lockAt || lockAgeMs > 45000;
    if (window._cdCoinGatePerUseInFlight) {
      if (isStaleLock) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        window.alert('이전 결제 상태를 복구했습니다. 다시 시도해 주세요.');
      } else {
        window.alert('이전 결제 처리 중입니다. 잠시 후 다시 시도해 주세요.');
      }
      if (typeof onCancel === 'function') onCancel();
      return;
    }

    var dedupeKey = normalizedFeatureKey + '|' + String(reason || '') + '|' + String(cost || 0);
    var dedupeMap = window.__cdCoinGatePromptDedup || (window.__cdCoinGatePromptDedup = {});
    if (dedupeMap[dedupeKey] && (now - dedupeMap[dedupeKey] < 2500)) {
      if (typeof onCancel === 'function') onCancel();
      return;
    }
    dedupeMap[dedupeKey] = now;

    var gateGrantedDelivered = false;
    function deliverGateGrant(transactionId, payload) {
      gateGrantedDelivered = true;
      _dpEmitPaymentSuccess(transactionId, payload, optionBag, normalizedFeatureKey, requestId);
      if (typeof cb === 'function') cb(String(transactionId || requestId), payload || {});
    }

    if (typeof window._cdOpenPaidServiceGate === 'function') {
      return window._cdOpenPaidServiceGate({
        title: reason,
        reason: reason,
        coinPrice: cost,
        cost: cost,
        featureKey: normalizedFeatureKey,
        requestId: requestId,
        categoryKey: optionBag.categoryKey,
        subFeatureKey: optionBag.subFeatureKey,
        contentKey: optionBag.contentKey,
        productId: optionBag.productId,
        reportType: optionBag.reportType,
        serviceKey: optionBag.serviceKey,
        reportId: optionBag.reportId,
        sessionId: optionBag.sessionId,
        reportSessionId: optionBag.reportSessionId || optionBag.sessionId,
        purchaseId: optionBag.purchaseId,
        actionType: optionBag.actionType,
        profileAction: optionBag.profileAction,
        action: optionBag.action,
        profileId: optionBag.profileId,
        selectedProfileId: optionBag.selectedProfileId,
        amountKrw: optionBag.amountKrw,
        membershipCreditCost: optionBag.membershipCreditCost,
        allowedPaymentModes: optionBag.allowedPaymentModes,
        disablePassFirst: optionBag.disablePassFirst,
        disablePassChoice: optionBag.disablePassChoice,
        onGranted: function(transactionId, payload) {
          deliverGateGrant(transactionId, payload);
        },
        onCancel: onCancel
      }).then(function(result) {
        if (result && result.status === 'granted' && !gateGrantedDelivered) {
          deliverGateGrant(result.transactionId, result.payload || result);
        } else if (result && result.status === 'cancelled' && result.reason === 'pass_applied_in_modal' && !gateGrantedDelivered) {
          deliverGateGrant(requestId, { __cdPassGateResolved: true, requestId: requestId, featureKey: normalizedFeatureKey });
        }
        return result;
      }).catch(function(error) {
        console.error('[main-paid-service-gate]', error);
        var gateMessage = String(error && error.message || '\uACB0\uC81C\uB97C \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
        var gateCode = String(error && error.code || '').toUpperCase();
        if (gateCode === 'AUTH_STATUS_TEMPORARILY_UNAVAILABLE' || gateCode === 'AUTH_DB_UNAVAILABLE' || gateCode === 'AUTH_REFRESH_TEMPORARY_FAILURE') {
          gateMessage = '로그아웃되지 않았어요. 이용권 확인이 잠시 지연되고 있으니 잠시 후 다시 시도해 주세요.';
        } else if (Number(error && error.status || 0) >= 500 || gateCode.indexOf('SERVICE_UNAVAILABLE') >= 0 || gateMessage.toLowerCase().indexOf('database is temporarily unavailable') >= 0) {
          gateMessage = '이용권 확인 서버 연결을 일시적으로 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
        }
        window.alert(gateMessage);
        if (typeof onCancel === 'function') onCancel(error);
        return null;
      });
    }

    if (typeof window._cdResolvePaidContentAccess === 'function' && optionBag.disablePassFirst !== true && optionBag.disablePassChoice !== true) {
      return window._cdResolvePaidContentAccess({ title: reason, reason: reason, coinPrice: cost, cost: cost, featureKey: normalizedFeatureKey, requestId: requestId, categoryKey: optionBag.categoryKey, subFeatureKey: optionBag.subFeatureKey, contentKey: optionBag.contentKey, productId: optionBag.productId, reportType: optionBag.reportType, serviceKey: optionBag.serviceKey, reportId: optionBag.reportId, sessionId: optionBag.sessionId, reportSessionId: optionBag.reportSessionId || optionBag.sessionId, purchaseId: optionBag.purchaseId, actionType: optionBag.actionType, profileAction: optionBag.profileAction, action: optionBag.action, profileId: optionBag.profileId, selectedProfileId: optionBag.selectedProfileId, allowSnapshotFastPath: true }).then(function(access) {
        if (access && (access.status === 'already_unlocked' || access.status === 'pass_applied')) {
          var passPayload = access.payload || access.rawPayload || {};
          var passTransactionId = String(passPayload.transactionId || passPayload.paymentId || passPayload.purchaseId || passPayload.requestId || access.requestId || requestId);
          if (typeof cb === 'function') cb(passTransactionId, passPayload);
          return passPayload;
        }
        if (access && access.status === 'error') { window.alert(access.message || '\uC774\uC6A9\uAD8C \uD655\uC778\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.'); if (typeof onCancel === 'function') onCancel(access); return null; }
        if (typeof window._cdChooseServicePaymentMode === 'function') { return window._cdChooseServicePaymentMode({ title: reason, reason: reason, coinPrice: cost, cost: cost, featureKey: normalizedFeatureKey || undefined, amountKrw: optionBag.amountKrw, membershipCreditCost: optionBag.membershipCreditCost, allowedPaymentModes: optionBag.allowedPaymentModes, disablePassFirst: optionBag.disablePassFirst, disablePassChoice: optionBag.disablePassChoice }).then(function(choice) { if (choice === 'direct') return runDirectCheckout(); if (choice === 'monthly') return runMonthlyCreditGate(); if ((choice === 'pass' || choice === 'pass_applied') && optionBag.disablePassChoice !== true) { if (typeof cb === 'function') cb(); return null; } if (typeof onCancel === 'function') onCancel(); return null; }); }
        return runMonthlyCreditGate();
      }).catch(function(error) { window.alert(String(error && error.message || '\uC774\uC6A9\uAD8C \uD655\uC778 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.')); if (typeof onCancel === 'function') onCancel(error); return null; });
    }

    function runMonthlyCreditGate() {
      var consumeHeaders = { 'Content-Type': 'application/json' };
      if (token) consumeHeaders.Authorization = 'Bearer ' + token;
      window._cdCoinGatePerUseInFlight = true;
      window.__cdCoinGatePerUseLockAt = Date.now();
      var pendingLabel = String(reason || '').trim() || '유료 서비스';
      _dpSetPaymentPending(true, pendingLabel + ' 결제 권한을 확인하고 있습니다.', 'monthly');
      return _dpWaitForPaymentOverlayPaint().then(function() {
        return _dpFetchJsonWithFallback('/api/billing/coin-gate', {
          method: 'POST',
          headers: consumeHeaders,
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({
            cost: cost,
            reason: reason,
            featureKey: normalizedFeatureKey || undefined,
            reportType: optionBag.reportType,
            serviceKey: optionBag.serviceKey,
            reportId: optionBag.reportId,
            sessionId: optionBag.sessionId,
            reportSessionId: optionBag.reportSessionId || optionBag.sessionId,
            purchaseId: optionBag.purchaseId,
            actionType: optionBag.actionType,
            profileAction: optionBag.profileAction,
            action: optionBag.action,
            profileId: optionBag.profileId,
            selectedProfileId: optionBag.selectedProfileId,
            paymentMode: 'MOONLIGHT_STONE',
            requestId: requestId
          })
        }, {
          retryOn401: true,
          timeoutMs: _DP_FETCH_TIMEOUT_MS,
        });
      })
      .then(function(res) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        if (_dpIsAuthRequiredResult(res)) {
          if (typeof window.__cdOpenLoginRequiredModal === 'function') {
            window.__cdOpenLoginRequiredModal({
              reason: '로그인이 필요한 기능입니다.',
              redirectTo: window.location.pathname + window.location.search + window.location.hash,
            });
          }
          if (typeof onCancel === 'function') onCancel();
          return;
        }

        var rawData = (res && res.data && typeof res.data === 'object') ? res.data : {};
        var data = (rawData.data && typeof rawData.data === 'object') ? rawData.data : rawData;
        if (res.status === 402 || !res.ok || !data || data.ok === false) {
          var failMessage = String((data && data.message) || rawData.message || '결제 권한을 확인하지 못했습니다. 단건 결제를 선택해 주세요.');
          window.alert(failMessage);
          if (typeof onCancel === 'function') onCancel();
          return;
        }

        var consumeData = (data && data.consume && typeof data.consume === 'object') ? data.consume : {};
        var accessGrant = (data && data.accessGrant && typeof data.accessGrant === 'object') ? data.accessGrant : {};
        var transactionId = String(data.transactionId || consumeData.transactionId || accessGrant.evidenceId || accessGrant.purchaseId || accessGrant.requestId || '');
        if (typeof cb === 'function') cb(transactionId, data);
        return data;
      })
      .catch(function(error) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        console.error('[coin-gate-per-use]', error);
        window.alert('결제를 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        if (typeof onCancel === 'function') onCancel();
      });
    }

    function runDirectCheckout() {
      if (typeof window._cdRunDirectKrwCheckout !== 'function') {
        window.alert('단건 결제 모듈을 찾을 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
        if (typeof onCancel === 'function') onCancel();
        return Promise.resolve();
      }
      window._cdCoinGatePerUseInFlight = true;
      window.__cdCoinGatePerUseLockAt = Date.now();
      // 🔴 PG창이 열리기 전에는 어떤 대기 UI도 켜지 않는다. 예전에는 여기서 '단건 결제를 진행
      // 중입니다' 오버레이를 띄웠고, 사용자에게는 결제수단을 고른 뒤 또 한 겹 로딩이 끼는 것으로 보였다.
      // _cdRunDirectKrwCheckout 이 진입 시점부터 PG 오픈까지 억제 창을 걸고 스스로 오버레이를 내린다.
      return window._cdRunDirectKrwCheckout({
        coinPrice: cost,
        cost: cost,
        title: reason,
        reason: reason,
        featureKey: normalizedFeatureKey,
        requestId: requestId,
        forceDirectPayment: true,
        internalMainGate: true,
        __cdPaymentGateAuthorized: true,
        checkoutPayload: {
          categoryKey: optionBag.categoryKey,
          subFeatureKey: optionBag.subFeatureKey,
          contentKey: optionBag.contentKey,
          productId: optionBag.productId,
          reportType: optionBag.reportType,
          serviceKey: optionBag.serviceKey,
          reportId: optionBag.reportId,
          sessionId: optionBag.sessionId,
          reportSessionId: optionBag.reportSessionId || optionBag.sessionId,
          purchaseId: optionBag.purchaseId,
          actionType: optionBag.actionType,
          profileAction: optionBag.profileAction,
          action: optionBag.action,
          profileId: optionBag.profileId,
          selectedProfileId: optionBag.selectedProfileId,
          paymentMode: 'DIRECT_KRW'
        }
      }).then(function(payload) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        var txId = String((payload && (payload.transactionId || payload.paymentId || payload.purchaseId || payload.requestId)) || requestId);
        if (typeof cb === 'function') cb(txId, payload || {});
        return payload;
      }).catch(function(error) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        console.error('[direct-checkout]', error);
        window.alert(String(error && error.message || '단건 결제를 완료하지 못했습니다. 결제 수단을 확인한 뒤 다시 시도해 주세요.'));
        if (typeof onCancel === 'function') onCancel(error);
      });
    }

    if (typeof window._cdChooseServicePaymentMode === 'function') {
      return window._cdChooseServicePaymentMode({
        title: reason,
        coinPrice: cost,
        cost: cost,
        reason: reason,
        featureKey: normalizedFeatureKey || undefined,
        reportType: optionBag.reportType,
        serviceKey: optionBag.serviceKey,
        actionType: optionBag.actionType,
        profileAction: optionBag.profileAction,
        action: optionBag.action,
        profileId: optionBag.profileId,
        selectedProfileId: optionBag.selectedProfileId,
        amountKrw: optionBag.amountKrw,
        membershipCreditCost: optionBag.membershipCreditCost,
        allowedPaymentModes: optionBag.allowedPaymentModes,
        disablePassFirst: optionBag.disablePassFirst,
        disablePassChoice: optionBag.disablePassChoice
      }).then(function(choice) {
        if (choice === 'direct') return runDirectCheckout();
        if (choice === 'monthly') return runMonthlyCreditGate();
        if ((choice === 'pass' || choice === 'pass_applied') && optionBag.disablePassChoice !== true) { if (typeof cb === 'function') cb(); return null; }
        if (typeof onCancel === 'function') onCancel();
      });
    }

    return runMonthlyCreditGate();
  };

  // 리다이렉트 복귀 확정은 한 번만 시도한다(같은 페이지에 이 스크립트가 두 번 주입되는 경우 대비).
  if (!window.__cdDirectPaymentResumeStarted) {
    window.__cdDirectPaymentResumeStarted = true;
    try { void _dpResumeDirectPaymentAfterRedirect(); } catch (_) {}
  }

})();
