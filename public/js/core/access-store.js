(function accessStoreBootstrap(global) {
  'use strict';

  if (!global || global.CodeDestinyAccessStore) return;

  var STORAGE_VERSION = 4;
  var STORAGE_PREFIX = 'cd_access_store_v4::';
  var LEGACY_STORAGE_PREFIX = 'cd_access_store_v3::';
  var ACCESS_SYNC_CHANNEL = 'code-destiny-access-sync';
  var LEGACY_LEDGER_KEY = 'cd_verified_unlock_grants_v1';
  // Access reads are display probes. A 503 keeps the last usable snapshot and waits
  // for an explicit user/session action instead of adding another request to the burst.
  var RETRY_DELAYS = [];
  var FRESH_TTL_MS = 60 * 1000;
  var STALE_TTL_MS = 30 * 60 * 1000;
  var GRACE_TTL_MS = 24 * 60 * 60 * 1000;
  var REFRESH_THROTTLE_MS = 15 * 1000;
  var DEFAULT_SERVICE_KEYS = ['saju', 'ziwei', 'ad_free'];
  var CONTENT_KEY_TO_FEATURE_KEY = {
    'saju.daewunAnalysis': 'section_daewun',
    'saju.fullReading': 'section_summary',
    'saju.compatibility': 'section_compat',
    'ziwei.decadeLuck': 'ziwei_decade_luck',
    'ziwei.loveDeep': 'ziwei_love_deep',
    'ziwei.twelvePalaces': 'ziwei_twelve_palaces',
    'ziwei.symbolicLayer': 'ziwei_symbolic_layer',
    'ziwei.lifeYearlyFlow': 'ziwei_life_yearly_flow'
  };
  var listeners = [];
  var inFlight = Object.create(null);
  var accessDecisionInFlight = Object.create(null);
  var accessDecisionCache = Object.create(null);
  var accessDecisionControllers = Object.create(null);
  var loadedEpoch = Object.create(null);
  var lastRefreshAttemptAt = Object.create(null);
  var bootEpoch = 0;
  var contextKey = '';
  var abortController = null;
  var requestAdapter = null;
  var syncChannel = null;
  var snapshotCache = null;
  var state = createState('');

  function createState(key) {
    return {
      cacheKey: key,
      profileId: '',
      userId: '',
      serviceKeys: DEFAULT_SERVICE_KEYS.slice(),
      persistentUnlocks: Object.create(null),
      confirmedUnlocks: Object.create(null),
      optimistic: Object.create(null),
      membership: null,
      entitlementSnapshot: null,
      monthlyBalance: null,
      freeUsage: null,
      accessDecision: Object.create(null),
      status: 'loading',
      error: null,
      checkedAt: 0,
      source: 'empty',
      lastPayload: null
    };
  }

  function copyMap(value) {
    var result = Object.create(null);
    if (!value || typeof value !== 'object') return result;
    Object.keys(value).forEach(function (key) {
      if (value[key]) result[key] = true;
    });
    return result;
  }

  function copyObject(value) {
    if (!value || typeof value !== 'object') return null;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return null;
    }
  }

  function getStorage() {
    try {
      return global.localStorage || null;
    } catch (_) {
      return null;
    }
  }

  function readMembershipSnapshot(userId) {
    var verdict = global.__cdPassVerdict;
    if (!verdict || typeof verdict.readSnapshot !== 'function' || !userId || userId === 'anonymous') return null;
    try {
      return verdict.readSnapshot(userId);
    } catch (_) {
      return null;
    }
  }

  function getAuthUser() {
    var candidates = [
      global.__cdAuthUser,
      global.currentUser,
      global.user,
      global.CodeDestinyAuth && global.CodeDestinyAuth.user
    ];
    for (var index = 0; index < candidates.length; index += 1) {
      var candidate = candidates[index];
      if (!candidate) continue;
      if (typeof candidate === 'string') return { id: candidate };
      if (candidate.id || candidate.userId || candidate._id || candidate.email) {
        return candidate;
      }
    }
    try {
      var storage = getStorage();
      var rawUser = storage && storage.getItem('fortune_auth_user');
      var storedUser = rawUser ? JSON.parse(rawUser) : null;
      if (storedUser && typeof storedUser === 'object' && (storedUser.id || storedUser.userId || storedUser._id || storedUser.email)) {
        return storedUser;
      }
    } catch (_) {
      // Invalid auth snapshots are ignored; the session hint still gates fetches.
    }
    return null;
  }

  function getUserId(options) {
    var authUser = getAuthUser();
    var requested = options && (options.userId || options.user && (options.user.id || options.user.userId));
    return String(
      requested ||
      (authUser && (authUser.id || authUser.userId || authUser._id || authUser.email)) ||
      global.__cdAuthUserId ||
      'anonymous'
    );
  }

  function getProfileId(options) {
    var profile = options && (options.profileId || options.profile && (options.profile.id || options.profile.profileId));
    var globals = [
      profile,
      global.__cdCurrentProfileId,
      global.currentProfileId,
      global.__cdActiveProfile && (global.__cdActiveProfile.id || global.__cdActiveProfile.profileId)
    ];
    for (var index = 0; index < globals.length; index += 1) {
      if (globals[index]) return String(globals[index]);
    }
    return '';
  }

  function hasSessionHint(options) {
    if (options && options.authenticated === true) return true;
    if (getAuthUser()) return true;
    try {
      return Boolean(
        global.sessionStorage &&
        (global.sessionStorage.getItem('cd_auth_session') ||
          global.sessionStorage.getItem('cd_auth_user') ||
          global.sessionStorage.getItem('authToken')) ||
        Boolean(getStorage() && (getStorage().getItem('fortune_auth_token') || getStorage().getItem('fortune_auth_user')))
      );
    } catch (_) {
      return Boolean(global.__cdAuthSessionHint || global.__cdHasAuthSession);
    }
  }

  function normalizeServiceKeys(options) {
    var requested = options && Array.isArray(options.serviceKeys) ? options.serviceKeys : DEFAULT_SERVICE_KEYS;
    var keys = requested.map(function (key) { return String(key || '').trim(); }).filter(Boolean);
    return keys.length ? keys.filter(function (key, index) { return keys.indexOf(key) === index; }) : DEFAULT_SERVICE_KEYS.slice();
  }

  function makeCacheKey(userId, profileId) {
    return userId + '::' + (profileId || 'default');
  }

  function storageKey(key) {
    return STORAGE_PREFIX + key;
  }

  function debug(event, detail) {
    if (!global.__CD_DEBUG__ && !global.__cdDebugAccess) return;
    try {
      if (global.console && typeof global.console.debug === 'function') {
        global.console.debug('[AccessStore]', event, detail || '');
      }
    } catch (_) {
      // Debug logging must never affect access decisions.
    }
  }

  function traceEvent(type, detail) {
    try {
      var trace = global.__cdMobileFortuneTrace;
      if (trace && typeof trace.record === 'function') trace.record(type, detail || {});
    } catch (_) {
      // Development-only tracing must never affect access decisions.
    }
  }

  function notify() {
    snapshotCache = null;
    var snapshot = getSnapshot();
    listeners.slice().forEach(function (listener) {
      try {
        listener(snapshot);
      } catch (_) {
        // A subscriber must not break the shared store.
      }
    });
  }

  function dispatch(name, detail) {
    try {
      if (typeof global.dispatchEvent !== 'function') return;
      var event;
      if (typeof global.CustomEvent === 'function') {
        event = new global.CustomEvent(name, { detail: detail || null });
      } else if (global.document && typeof global.document.createEvent === 'function') {
        event = global.document.createEvent('CustomEvent');
        event.initCustomEvent(name, false, false, detail || null);
      }
      if (event) global.dispatchEvent(event);
    } catch (_) {
      // Compatibility events are best effort only.
    }
  }

  function normalizeRequestResult(result) {
    if (result && typeof result.json === 'function') {
      return result.json().catch(function () { return {}; }).then(function (payload) {
        return { ok: Boolean(result.ok), status: Number(result.status || 0), payload: payload || {} };
      });
    }
    if (result && typeof result === 'object' && ('payload' in result || 'status' in result)) {
      return Promise.resolve({
        ok: Boolean(result.ok),
        status: Number(result.status || 0),
        payload: result.payload && typeof result.payload === 'object' ? result.payload : {}
      });
    }
    return Promise.resolve({ ok: false, status: 0, payload: {} });
  }

  function requestJson(url, init) {
    var requester = requestAdapter;
    if (!requester && typeof global.fetchJsonWithAuth === 'function') {
      requester = function (target, options) { return global.fetchJsonWithAuth(target, options); };
    }
    if (!requester && typeof global.fetch === 'function') requester = global.fetch.bind(global);
    if (!requester) return Promise.resolve({ ok: false, status: 0, payload: { code: 'FETCH_UNAVAILABLE' } });
    return Promise.resolve(requester(url, init || {})).then(normalizeRequestResult);
  }

  function publishAccessSync(reason, savedAt) {
    if (!syncChannel || !state.cacheKey || state.userId === 'anonymous') return;
    try {
      syncChannel.postMessage({
        type: 'snapshot-changed',
        cacheKey: state.cacheKey,
        userId: state.userId,
        profileId: state.profileId,
        checkedAt: state.checkedAt,
        savedAt: Number(savedAt || Date.now()),
        reason: String(reason || state.source || 'updated')
      });
    } catch (_) {
      // Cross-tab synchronization is an optional acceleration layer.
    }
  }

  function syncLegacyFeatureMap() {
    var next = Object.create(null);
    Object.keys(state.persistentUnlocks).forEach(function (key) {
      next[CONTENT_KEY_TO_FEATURE_KEY[key] || key] = true;
    });
    Object.keys(state.confirmedUnlocks).forEach(function (key) {
      next[CONTENT_KEY_TO_FEATURE_KEY[key] || key] = true;
    });
    Object.keys(state.optimistic).forEach(function (key) {
      if (state.optimistic[key] && state.optimistic[key].expiresAt > Date.now()) next[key] = true;
    });
    global.unlockedFeatureMap = next;
  }

  function saveCache() {
    var storage = getStorage();
    if (!storage || !state.cacheKey || state.userId === 'anonymous') return;
    try {
      var savedAt = Date.now();
      storage.setItem(
        storageKey(state.cacheKey),
        JSON.stringify({
          version: STORAGE_VERSION,
          cacheKey: state.cacheKey,
          profileId: state.profileId,
          userId: state.userId,
          persistentUnlocks: state.persistentUnlocks,
          confirmedUnlocks: state.confirmedUnlocks,
          optimistic: state.optimistic,
          membership: state.membership,
          entitlementSnapshot: state.entitlementSnapshot,
          monthlyBalance: state.monthlyBalance,
          freeUsage: state.freeUsage,
          savedAt: savedAt
        })
      );
      publishAccessSync(state.source, savedAt);
    } catch (_) {
      // localStorage is an optional acceleration layer.
    }
  }

  function clearUserCache(userId) {
    var storage = getStorage();
    var normalizedUserId = String(userId || '').trim();
    if (!storage || !normalizedUserId || normalizedUserId === 'anonymous') return;
    var prefix = storageKey(normalizedUserId + '::');
    try {
      for (var index = storage.length - 1; index >= 0; index -= 1) {
        var key = storage.key(index);
        if (key && key.indexOf(prefix) === 0) storage.removeItem(key);
      }
    } catch (_) {
      // Cache removal is best effort; the in-memory state is still cleared.
    }
  }

  function clearLegacyUnlockLedger() {
    var storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(LEGACY_LEDGER_KEY);
    } catch (_) {
      // Legacy ledger removal is best effort.
    }
  }

  function readLegacyLedger(profileId, confirmedOnly) {
    var storage = getStorage();
    if (!storage) return Object.create(null);
    try {
      var parsed = JSON.parse(storage.getItem(LEGACY_LEDGER_KEY) || '{}');
      var grants = parsed && parsed.grants && typeof parsed.grants === 'object' ? parsed.grants : parsed;
      var result = Object.create(null);
      Object.keys(grants || {}).forEach(function (key) {
        var grant = grants[key];
        if (!grant || grant.profileId && profileId && String(grant.profileId) !== String(profileId)) return;
        if (confirmedOnly && String(grant.mode || '') !== 'confirmed') return;
        var expiresAt = Number(grant.expiresAt || grant.expiry || 0);
        if (expiresAt && expiresAt < Date.now()) return;
        result[key.split('::')[0]] = true;
      });
      return result;
    } catch (_) {
      return Object.create(null);
    }
  }

  function restoreCache(key, userId, profileId) {
    var storage = getStorage();
    var restored = null;
    if (storage) {
      try {
        restored = JSON.parse(
          storage.getItem(storageKey(key))
          || storage.getItem(LEGACY_STORAGE_PREFIX + key)
          || 'null'
        );
      } catch (_) {
        restored = null;
      }
    }
    var compatibleVersion = restored && (restored.version === STORAGE_VERSION || restored.version === 3);
    var restoredConfirmed = restored && restored.version === STORAGE_VERSION
      ? copyMap(restored.confirmedUnlocks)
      : Object.create(null);
    var cacheExpired = restored && Date.now() - Number(restored.savedAt || 0) > GRACE_TTL_MS;
    if (!restored || !compatibleVersion || restored.userId !== userId
      || cacheExpired && Object.keys(restoredConfirmed).length === 0) {
      restored = null;
    }

    state = createState(key);
    state.profileId = profileId;
    state.userId = userId;
    state.serviceKeys = DEFAULT_SERVICE_KEYS.slice();
    if (restored) {
      state.persistentUnlocks = cacheExpired ? Object.create(null) : copyMap(restored.persistentUnlocks);
      state.confirmedUnlocks = restoredConfirmed;
      state.optimistic = !cacheExpired && restored.optimistic && typeof restored.optimistic === 'object' ? restored.optimistic : Object.create(null);
      state.membership = cacheExpired ? readMembershipSnapshot(userId) : copyObject(restored.membership) || readMembershipSnapshot(userId);
      state.entitlementSnapshot = cacheExpired ? null : copyObject(restored.entitlementSnapshot);
      state.monthlyBalance = cacheExpired ? null : copyObject(restored.monthlyBalance);
      state.freeUsage = cacheExpired ? null : copyObject(restored.freeUsage);
      state.checkedAt = Number(restored.savedAt || 0);
      state.source = 'localStorage';
      state.status = cacheExpired || Date.now() - state.checkedAt > FRESH_TTL_MS ? 'degraded' : 'ready';
      debug('cache hit', { cacheKey: key, ageMs: Date.now() - state.checkedAt });
    } else {
      state.persistentUnlocks = readLegacyLedger(profileId);
      state.confirmedUnlocks = readLegacyLedger(profileId, true);
      state.membership = readMembershipSnapshot(userId);
      state.source = Object.keys(state.persistentUnlocks).length ? 'legacy-ledger' : 'empty';
      state.status = Object.keys(state.persistentUnlocks).length ? 'ready' : 'loading';
      debug(Object.keys(state.persistentUnlocks).length ? 'legacy cache hit' : 'cache miss', { cacheKey: key });
    }
    syncLegacyFeatureMap();
    notify();
  }

  function ensureContext(options) {
    var userId = getUserId(options || {});
    var profileId = getProfileId(options || {});
    var serviceKeys = normalizeServiceKeys(options || {});
    var key = makeCacheKey(userId, profileId);
    if (key !== contextKey) {
      abortCurrent('context-changed');
      contextKey = key;
      bootEpoch += 1;
      loadedEpoch = Object.create(null);
      restoreCache(key, userId, profileId);
    }
    return { key: key, userId: userId, profileId: profileId, serviceKeys: serviceKeys };
  }

  function extractUnlockMap(payload) {
    var result = Object.create(null);
    function addKey(rawKey) {
      var key = String(rawKey || '').trim();
      if (!key) return;
      result[key] = true;
      if (CONTENT_KEY_TO_FEATURE_KEY[key]) result[CONTENT_KEY_TO_FEATURE_KEY[key]] = true;
    }
    var arrays = [
      payload && payload.unlockedContentKeys,
      payload && payload.unlockedFeatures,
      payload && payload.unlockedFeatureIds,
      payload && payload.entitlementSnapshot && payload.entitlementSnapshot.unlockedFeatureIds,
      payload && payload.unlockedFeatureMap
    ];
    arrays.forEach(function (source) {
      if (!Array.isArray(source)) return;
      source.forEach(function (key) { addKey(key); });
    });
    var maps = [
      payload && payload.unlockedFeatureMap,
      payload && payload.unlocks,
      payload && payload.unlockMap
    ];
    maps.forEach(function (source) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) return;
      Object.keys(source).forEach(function (key) {
        var value = source[key];
        if (value === true || value && (value.unlocked === true || value.status === 'active' || value.status === 'granted')) {
          addKey(key);
        }
      });
    });
    var nested = payload && payload.data && typeof payload.data === 'object' ? extractUnlockMap(payload.data) : null;
    if (nested) {
      Object.keys(nested).forEach(function (key) { result[key] = true; });
    }
    var directFeatureKey = payload && (payload.featureKey || payload.accessGrant && payload.accessGrant.featureKey);
    var directStatus = String(payload && (payload.status || payload.accessGrant && payload.accessGrant.status) || '').trim().toLowerCase();
    if (directFeatureKey && (payload.unlocked === true || payload.alreadyUnlocked === true || payload.accessGranted === true
      || /^(paid|success|fulfilled|unlocked|already_unlocked|pass_applied)$/.test(directStatus))) {
      addKey(directFeatureKey);
    }
    return result;
  }

  /**
   * access-state 응답의 이용권 정보를 pass-verdict 스냅샷에도 흘린다. **추가 요청이 0건**이다 —
   * 이미 받은 응답을 버리지 않을 뿐이다(js/destiny-profile.js 가 /api/billing/balance 의 membership 에
   * 대해 하고 있는 것과 같은 패턴).
   *
   * 이 응답만이 completeness:'full' + authority:'server' 를 실어서, 만료된 이용권을 올바르게 'none' 으로
   * 내릴 수 있는 유일한 경로다(pass-verdict storeStatus 의 다운그레이드 가드). balance 응답의 membership
   * 에는 그 두 필드가 없어 기존 active 를 덮지 못한다.
   *
   * 🔴 entitlementSnapshot 을 **그대로 넘기면 안 된다.** 그 안의 expiresAt 은 이용권 만료일이 아니라
   * access-state 캐시 만료(worker/lib/access-state.js)라서, buildSnapshotFromStatus 가 그걸 이용권
   * 만료일로 읽어 몇 분짜리 active 스냅샷을 만든다. 진짜 만료일은 activePasses[0].expiresAt 이다.
   */
  function syncPassVerdictSnapshot(userId, payload) {
    try {
      var verdict = globalThis.__cdPassVerdict;
      if (!verdict || typeof verdict.storeStatus !== 'function') return;
      var uid = String(userId || '').trim();
      if (!uid || uid === 'anonymous') return;
      var source = payload && typeof payload === 'object' ? payload : null;
      var snap = source && source.entitlementSnapshot && typeof source.entitlementSnapshot === 'object'
        ? source.entitlementSnapshot
        : null;
      if (!snap) return;
      // applyAccessStateSnapshot 의 authoritativeFull 과 같은 기준을 쓴다(새 기준을 만들지 않는다).
      if (source.degraded === true || snap.degraded === true) return;
      var completeness = String(source.completeness || snap.completeness || '').toLowerCase();
      var authority = String(source.authority || snap.authority || '').toLowerCase();
      if (completeness !== 'full' || authority !== 'server') return;
      var tier = String(snap.tier || '').trim().toLowerCase();
      var hasActivePass = Boolean(tier) && tier !== 'free' && tier !== 'none';
      var activePass = Array.isArray(snap.activePasses) && snap.activePasses[0] ? snap.activePasses[0] : null;
      verdict.storeStatus(uid, {
        tier: tier,
        hasActivePass: hasActivePass,
        expiresAt: (activePass && activePass.expiresAt) || null,
        completeness: 'full',
        authority: 'server',
        degraded: false
      }, 'access-state');
    } catch (e) {
      // 스냅샷 반영 실패가 접근 상태 갱신을 막아서는 안 된다.
    }
  }

  function applyServerPayload(payload, context) {
    var serverUnlocks = extractUnlockMap(payload);
    Object.keys(serverUnlocks).forEach(function (key) { state.confirmedUnlocks[key] = true; });
    var merged = copyMap(serverUnlocks);
    Object.keys(state.confirmedUnlocks).forEach(function (key) { merged[key] = true; });
    Object.keys(state.optimistic).forEach(function (key) {
      if (state.optimistic[key] && state.optimistic[key].expiresAt > Date.now()) merged[key] = true;
    });
    state.persistentUnlocks = copyMap(serverUnlocks);
    state.optimistic = Object.keys(state.optimistic).reduce(function (accumulator, key) {
      if (state.optimistic[key] && state.optimistic[key].expiresAt > Date.now()) accumulator[key] = state.optimistic[key];
      return accumulator;
    }, Object.create(null));
    state.profileId = context.profileId;
    state.userId = context.userId;
    state.serviceKeys = context.serviceKeys.slice();
    if (payload && payload.entitlementSnapshot && typeof payload.entitlementSnapshot === 'object') {
      state.entitlementSnapshot = copyObject(payload.entitlementSnapshot);
    }
    var nextMonthlyBalance = payload && (payload.monthlyBalance || payload.monthlyBalanceSummary
      || payload.entitlementSnapshot && payload.entitlementSnapshot.monthlyBalance);
    if (nextMonthlyBalance && typeof nextMonthlyBalance === 'object') {
      state.monthlyBalance = copyObject(nextMonthlyBalance);
    }
    if (payload && payload.freeUsage && typeof payload.freeUsage === 'object') {
      var nextGuardianUsage = payload.freeUsage.guardian;
      if (!nextGuardianUsage || nextGuardianUsage.degraded !== true || !state.freeUsage || !state.freeUsage.guardian) {
        state.freeUsage = copyObject(payload.freeUsage);
      }
    }
    if (payload && payload.entitlementSnapshot) {
      state.membership = copyObject(payload.entitlementSnapshot);
    }
    syncPassVerdictSnapshot(context.userId, payload);
    state.status = 'ready';
    state.error = null;
    state.checkedAt = Date.now();
    state.source = 'network';
    state.lastPayload = copyObject(payload);
    syncLegacyFeatureMap();
    saveCache();
    notify();
    dispatch('cd:unlocks-changed', { source: 'access-store', unlockedFeatureMap: merged });
    debug('fetch finished', { cacheKey: context.key, count: Object.keys(merged).length });
  }

  function resolveSnapshotPayload(payload) {
    var source = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
    return source && typeof source === 'object' ? source : null;
  }

  function applyAccessStateSnapshot(payload, options) {
    var source = resolveSnapshotPayload(payload);
    if (!source || !source.userId) return false;
    var sourceUserId = String(source.userId || '');
    var requestedUserId = getUserId(options || {});
    if (requestedUserId !== 'anonymous' && sourceUserId !== requestedUserId) return false;
    var profileId = String(
      (options && options.profileId) ||
      source.profileId ||
      source.currentProfileId ||
      state.profileId ||
      ''
    );
    var context = ensureContext({
      userId: sourceUserId,
      profileId: profileId,
      serviceKeys: options && options.serviceKeys,
      authenticated: true
    });
    var unlocks = extractUnlockMap(source);
    state.profileId = profileId;
    state.userId = sourceUserId;
    state.serviceKeys = context.serviceKeys.slice();
    var completeness = String(source.completeness || source.entitlementSnapshot && source.entitlementSnapshot.completeness || '').toLowerCase();
    var authority = String(source.authority || source.entitlementSnapshot && source.entitlementSnapshot.authority || '').toLowerCase();
    var authoritativeFull = source.degraded !== true && completeness === 'full' && authority === 'server';
    if (authoritativeFull) {
      Object.keys(unlocks).forEach(function (key) { state.confirmedUnlocks[key] = true; });
    }
    var merged = authoritativeFull ? copyMap(unlocks) : copyMap(state.persistentUnlocks);
    Object.keys(unlocks).forEach(function (key) { merged[key] = true; });
    Object.keys(state.confirmedUnlocks).forEach(function (key) { merged[key] = true; });
    if (authoritativeFull && source.version && Array.isArray(source.revokedFeatureIds)) {
      source.revokedFeatureIds.forEach(function (rawKey) {
        var revokedKey = String(rawKey || '').trim();
        if (!revokedKey) return;
        delete state.confirmedUnlocks[revokedKey];
        delete merged[revokedKey];
      });
    }
    Object.keys(state.optimistic).forEach(function (key) {
      if (state.optimistic[key] && state.optimistic[key].expiresAt > Date.now()) merged[key] = true;
    });
    state.persistentUnlocks = authoritativeFull ? copyMap(unlocks) : copyMap(merged);
    var incomingEntitlement = copyObject(source.entitlementSnapshot);
    var currentTier = String(state.entitlementSnapshot && state.entitlementSnapshot.tier || '').toLowerCase();
    var incomingTier = String(incomingEntitlement && incomingEntitlement.tier || '').toLowerCase();
    var currentActive = currentTier && currentTier !== 'free' && currentTier !== 'none';
    var incomingInactive = !incomingTier || incomingTier === 'free' || incomingTier === 'none';
    if (incomingEntitlement && (!currentActive || !incomingInactive || authoritativeFull)) {
      state.entitlementSnapshot = incomingEntitlement;
      state.membership = copyObject(incomingEntitlement) || state.membership;
    }
    // 신원 검사는 위 :532 에서 이미 끝났다(requestedUserId 불일치면 여기 도달하지 않는다).
    syncPassVerdictSnapshot(sourceUserId, source);
    var incomingMonthlyBalance = source.monthlyBalance || source.monthlyBalanceSummary
      || incomingEntitlement && incomingEntitlement.monthlyBalance;
    if (incomingMonthlyBalance && typeof incomingMonthlyBalance === 'object'
      && (authoritativeFull || !state.monthlyBalance)) {
      state.monthlyBalance = copyObject(incomingMonthlyBalance);
    }
    if (source.freeUsage && typeof source.freeUsage === 'object') {
      var incomingGuardianUsage = source.freeUsage.guardian;
      if (!incomingGuardianUsage || incomingGuardianUsage.degraded !== true || !state.freeUsage || !state.freeUsage.guardian) {
        state.freeUsage = copyObject(source.freeUsage);
      }
    }
    state.status = source.degraded === true || !authoritativeFull ? 'degraded' : 'ready';
    state.error = source.degraded === true ? { code: 'ACCESS_STATE_DEGRADED' } : null;
    state.checkedAt = Date.parse(String(source.fetchedAt || source.checkedAt || '')) || Date.now();
    state.source = source.source === 'stale-cache' ? 'stale-cache' : 'access-state';
    state.lastPayload = copyObject(source);
    loadedEpoch[context.key] = bootEpoch;
    syncLegacyFeatureMap();
    saveCache();
    notify();
    dispatch('cd:unlocks-changed', { source: 'access-state', unlockedFeatureMap: merged });
    return true;
  }

  function accessDecisionQuery(options) {
    var params = new URLSearchParams();
    var fields = [
      'productId', 'serviceType', 'categoryKey', 'subFeatureKey', 'featureKey',
      'reason', 'coinCost', 'coinPrice', 'priceKRW', 'amountKRW', 'scope', 'profileId'
    ];
    fields.forEach(function (field) {
      var value = options && options[field];
      if (value !== undefined && value !== null && String(value).trim()) params.set(field, String(value));
    });
    return params;
  }

  function clearAccessDecisionCache() {
    accessDecisionCache = Object.create(null);
    notify();
  }

  function extractAccessDecisionMembership(payload) {
    var source = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
    if (!source || typeof source !== 'object') return null;
    return source.membershipPass || source.membership || source.subscription || null;
  }

  function getAccessDecision(options) {
    var opts = options || {};
    var context = ensureContext(opts);
    var snapshotFeatureKey = String(opts.featureKey || opts.subFeatureKey || '').trim();
    if (snapshotFeatureKey && isUnlocked(snapshotFeatureKey)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        code: '',
        source: 'access-snapshot',
        payload: {
          ok: true,
          data: {
            unlocked: true,
            alreadyUnlocked: true,
            canAccess: true,
            accessDecision: { accessGranted: true, reason: 'already_unlocked', source: 'access-snapshot' }
          }
        }
      });
    }
    if (!requestAdapter && typeof global.fetchJsonWithAuth !== 'function' && typeof global.fetch !== 'function') {
      return Promise.resolve({ ok: false, status: 0, payload: null, code: 'FETCH_UNAVAILABLE' });
    }
    var params = accessDecisionQuery(opts);
    var key = context.key + '::decision::' + params.toString();
    var ttlMs = Math.max(1000, Number(opts.cacheTtlMs || 15000));
    var now = Date.now();
    var cached = accessDecisionCache[key];
    if (!opts.force && !opts.revalidate && cached && cached.expiresAt > now) {
      debug('access decision cache hit', { key: key });
      return Promise.resolve(cached.result);
    }
    if (accessDecisionInFlight[key]) {
      debug('access decision reused', { key: key });
      return accessDecisionInFlight[key];
    }

    var controller = typeof global.AbortController === 'function' ? new global.AbortController() : null;
    accessDecisionControllers[key] = controller;
    var timeoutId = null;
    var timeoutMs = Number(opts.timeoutMs || 0);
    if (controller && Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timeoutId = global.setTimeout(function () { controller.abort(); }, timeoutMs);
    }
    var query = params.toString();
    var request = requestJson('/api/billing/unlock-status' + (query ? '?' + query : ''), {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
        var payload = response.payload || {};
        var result = {
          ok: Boolean(response.ok && payload && payload.ok === true),
          status: Number(response.status || 0),
          payload: payload,
          code: payload && payload.error && payload.error.code || payload && payload.code || ''
        };
        if (result.ok) {
          state.accessDecision[key] = {
            ok: true,
            status: result.status,
            payload: copyObject(payload),
            checkedAt: Date.now()
          };
          var membership = extractAccessDecisionMembership(payload);
          if (membership) state.membership = copyObject(membership);
          accessDecisionCache[key] = { result: result, expiresAt: Date.now() + ttlMs };
          notify();
          debug('access decision finished', { key: key, status: result.status });
        } else {
          state.accessDecision[key] = {
            ok: false,
            status: result.status,
            payload: copyObject(payload),
            checkedAt: Date.now()
          };
          notify();
          debug('access decision failed', { key: key, status: result.status });
        }
        return result;
    }).catch(function (error) {
      if (error && error.name === 'AbortError') {
        debug('access decision aborted', { key: key });
        return { ok: false, status: 0, aborted: true, payload: null, code: 'ABORTED' };
      }
      state.accessDecision[key] = {
        ok: false,
        status: Number(error && error.status || 0),
        payload: null,
        checkedAt: Date.now()
      };
      notify();
      debug('access decision failed', { key: key, status: error && error.status });
      return { ok: false, status: Number(error && error.status || 0), payload: null, code: 'ACCESS_DECISION_FAILED' };
    }).finally(function () {
      if (timeoutId) global.clearTimeout(timeoutId);
      if (accessDecisionInFlight[key] === request) delete accessDecisionInFlight[key];
      if (accessDecisionControllers[key] === controller) delete accessDecisionControllers[key];
    });
    accessDecisionInFlight[key] = request;
    debug('access decision started', { key: key });
    return request;
  }

  function hasUsableCache() {
    return Object.keys(state.persistentUnlocks).length > 0 || Object.keys(state.confirmedUnlocks).length > 0
      || Object.keys(state.optimistic).length > 0 || Boolean(state.membership);
  }

  function startFetch(context, attempt, options) {
    var includeGuardian = options && options.includeGuardian === true;
    var requestKey = context.key + (includeGuardian ? '::include=guardian' : '');
    if (inFlight[requestKey]) {
      debug('reused', { cacheKey: context.key });
      return inFlight[requestKey].promise;
    }
    if (typeof global.fetch !== 'function') {
      return Promise.resolve({ ok: false, status: state.status, reason: 'FETCH_UNAVAILABLE' });
    }
    abortController = typeof global.AbortController === 'function' ? new global.AbortController() : null;
    lastRefreshAttemptAt[requestKey] = Date.now();
    var controller = abortController;
    var query = '/api/me/access-state?profileId=' + encodeURIComponent(context.profileId);
    if (includeGuardian) query += '&include=guardian';
    traceEvent('access:start', {
      request: 'unlocks',
      serviceKeys: context.serviceKeys.slice(),
      attempt: Number(attempt || 0),
    });
    var epoch = bootEpoch;
    var request = requestJson(query, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
        var payload = response.payload || {};
        if (!response.ok || payload && payload.ok === false) {
          var error = new Error('Unlock request failed: ' + response.status);
          error.status = response.status;
          error.payload = payload;
          throw error;
        }
        traceEvent('access:response', {
          request: 'unlocks',
          status: Number(response.status || 0),
          ok: Boolean(response.ok && payload && payload.ok === true),
        });
        return payload;
    }).then(function (payload) {
      if (epoch !== bootEpoch || context.key !== contextKey) {
        debug('ignored stale response', { cacheKey: context.key });
        return { ok: false, stale: true };
      }
      if (!applyAccessStateSnapshot(payload, {
        userId: context.userId,
        profileId: context.profileId,
        authenticated: true,
        serviceKeys: context.serviceKeys
      })) {
        applyServerPayload(payload, context);
      }
      return { ok: true, payload: payload };
    }).catch(function (error) {
      if (error && error.name === 'AbortError') {
        debug('fetch aborted', { cacheKey: context.key });
        return { ok: false, aborted: true };
      }
      if (error && error.status === 401) {
        state.status = hasUsableCache() ? 'degraded' : 'error';
        state.error = { status: 401, code: 'AUTH_REQUIRED' };
        notify();
        return { ok: false, status: 401, code: 'AUTH_REQUIRED', stale: hasUsableCache() };
      }
      if (error && (error.status === 403 || error.status === 404)) {
        var payloadCode = String(error.payload && (error.payload.code || error.payload.error && error.payload.error.code) || '');
        var profileError = /PROFILE|MISSING_PROFILE/.test(payloadCode);
        state.status = hasUsableCache() ? 'degraded' : 'error';
        state.error = { status: error.status, code: profileError ? 'PROFILE_REQUIRED' : 'PERMISSION_DENIED' };
        notify();
        return { ok: false, status: error.status, code: state.error.code, stale: hasUsableCache() };
      }
      state.status = hasUsableCache() ? 'degraded' : 'error';
      state.error = { status: error && error.status || 0, code: 'UNLOCK_FETCH_FAILED' };
      notify();
      traceEvent('access:error', {
        request: 'unlocks',
        status: Number(error && error.status || 0),
        code: 'UNLOCK_FETCH_FAILED',
        degraded: hasUsableCache(),
        retryScheduled: false,
      });
      debug('fetch failed', { cacheKey: context.key, status: error && error.status, attempt: attempt || 0 });
      return { ok: false, status: state.status, stale: hasUsableCache() };
    }).finally(function () {
      if (inFlight[requestKey] && inFlight[requestKey].promise === request) delete inFlight[requestKey];
      if (abortController === controller) abortController = null;
      traceEvent('access:finish', { request: 'unlocks' });
    });
    inFlight[requestKey] = { promise: request, controller: controller, epoch: epoch };
    debug('fetch started', { cacheKey: context.key, attempt: attempt || 0 });
    return request;
  }

  function abortCurrent(reason) {
    if (abortController && typeof abortController.abort === 'function') {
      debug('fetch aborted', { reason: reason });
      abortController.abort();
    }
    abortController = null;
    Object.keys(accessDecisionControllers).forEach(function (key) {
      var controller = accessDecisionControllers[key];
      if (controller && typeof controller.abort === 'function') controller.abort();
      delete accessDecisionControllers[key];
    });
  }

  function getSnapshot() {
    if (snapshotCache) return snapshotCache;
    snapshotCache = {
      cacheKey: state.cacheKey,
      profileId: state.profileId,
      userId: state.userId,
      persistentUnlocks: copyMap(state.persistentUnlocks),
      confirmedUnlocks: copyMap(state.confirmedUnlocks),
      optimistic: copyObject(state.optimistic) || {},
      membership: copyObject(state.membership),
      entitlementSnapshot: copyObject(state.entitlementSnapshot),
      monthlyBalance: copyObject(state.monthlyBalance),
      freeUsage: copyObject(state.freeUsage),
      accessDecision: copyObject(state.accessDecision) || {},
      status: state.status,
      error: copyObject(state.error),
      checkedAt: state.checkedAt,
      source: state.source,
      lastPayload: copyObject(state.lastPayload)
    };
    return snapshotCache;
  }

  function isUnlocked(featureKey) {
    var key = String(featureKey || '');
    return Boolean(state.confirmedUnlocks[key] || state.persistentUnlocks[key]
      || state.optimistic[key] && state.optimistic[key].expiresAt > Date.now());
  }

  function getEffectiveTier() {
    var snapshot = state.entitlementSnapshot && typeof state.entitlementSnapshot === 'object' ? state.entitlementSnapshot : null;
    var tier = snapshot && snapshot.tier || state.membership && (state.membership.tier || state.membership.passType || state.membership.passTier);
    var passExpiry = snapshot && Array.isArray(snapshot.activePasses) && snapshot.activePasses[0] && snapshot.activePasses[0].expiresAt
      || state.membership && (state.membership.activeUntil || state.membership.passExpiresAt);
    if (passExpiry) {
      var passExpiryMs = Date.parse(String(passExpiry));
      if (!Number.isFinite(passExpiryMs) || passExpiryMs <= Date.now()) return 'free';
    }
    return String(tier || 'free').trim().toLowerCase() || 'free';
  }

  function getMonthlyBalance() {
    var balance = state.monthlyBalance && typeof state.monthlyBalance === 'object'
      ? state.monthlyBalance
      : state.entitlementSnapshot && state.entitlementSnapshot.monthlyBalance;
    if (!balance || typeof balance !== 'object') return null;
    return copyObject(balance);
  }

  function canAccessFeature(featureId) {
    return isUnlocked(featureId);
  }

  function canPurchaseProduct(productId) {
    return {
      productId: String(productId || ''),
      canPurchase: null,
      requiresServerVerification: true,
      source: state.source || 'client-snapshot'
    };
  }

  function markOptimisticallyUnlocked(featureKey, profileId, metadata) {
    var key = String(featureKey || '');
    if (!key) return false;
    var targetProfileId = String(profileId || state.profileId || '');
    state.optimistic[key] = {
      profileId: targetProfileId,
      expiresAt: Date.now() + 10 * 60 * 1000,
      source: metadata && metadata.source || 'payment'
    };
    syncLegacyFeatureMap();
    saveCache();
    notify();
    dispatch('cd:unlocks-changed', { source: 'access-store-optimistic', featureKey: key });
    return true;
  }

  function markConfirmedUnlocked(featureKey, profileId, metadata) {
    var key = String(featureKey || '').trim();
    if (!key) return false;
    state.confirmedUnlocks[key] = true;
    delete state.optimistic[key];
    syncLegacyFeatureMap();
    saveCache();
    notify();
    dispatch('cd:unlocks-changed', {
      source: 'access-store-confirmed',
      featureKey: key,
      profileId: String(profileId || state.profileId || ''),
      grant: copyObject(metadata)
    });
    return true;
  }

  function extractConfirmedUnlockMap(payload) {
    var result = Object.create(null);
    function visit(value, depth) {
      if (!value || typeof value !== 'object' || depth > 3) return;
      var candidates = [value.unlockGrant, value.accessGrant && value.accessGrant.unlockGrant];
      candidates.forEach(function (grant) {
        if (!grant || typeof grant !== 'object') return;
        var grantType = String(grant.grantType || '').trim().toLowerCase();
        var status = String(grant.status || '').trim().toLowerCase();
        var key = String(grant.featureKey || '').trim();
        if (key && grantType === 'permanent_unlock' && status === 'active') result[key] = grant;
      });
      if (value.data && typeof value.data === 'object') visit(value.data, depth + 1);
      if (value.payload && typeof value.payload === 'object') visit(value.payload, depth + 1);
    }
    visit(payload, 0);
    return result;
  }

  function applyPaymentPayload(payload, options) {
    ensureContext(Object.assign({}, options || {}, { authenticated: true }));
    var unlockMap = extractUnlockMap(payload);
    var confirmed = extractConfirmedUnlockMap(payload);
    var profileId = getProfileId(options || {}) || state.profileId;
    Object.keys(confirmed).forEach(function (key) {
      markConfirmedUnlocked(key, profileId, confirmed[key]);
    });
    Object.keys(unlockMap).forEach(function (key) {
      if (confirmed[key] || state.confirmedUnlocks[key]) return;
      markOptimisticallyUnlocked(key, profileId, { source: 'payment-payload' });
    });
    return Array.from(new Set(Object.keys(confirmed).concat(Object.keys(unlockMap))));
  }

  function ensureLoaded(options) {
    var context = ensureContext(options || {});
    if (!context.profileId || !hasSessionHint(options || {})) {
      state.status = hasUsableCache() ? 'ready' : 'ready';
      notify();
      return Promise.resolve({ ok: true, skipped: true, reason: 'NO_AUTH_PROFILE' });
    }
    var opts = options || {};
    var requestKey = context.key + (opts.includeGuardian === true ? '::include=guardian' : '');
    if (inFlight[requestKey]) {
      debug('reused', { cacheKey: context.key });
      traceEvent('access:dedupe', { request: 'unlocks', reason: options && options.reason || 'unknown' });
      return inFlight[requestKey].promise;
    }
    var ageMs = state.checkedAt ? Date.now() - state.checkedAt : Number.POSITIVE_INFINITY;
    var tier = getEffectiveTier();
    var adminSnapshot = tier === 'admin';
    var guardianReady = opts.includeGuardian !== true || Boolean(state.freeUsage && state.freeUsage.guardian && state.freeUsage.guardian.degraded !== true);
    if (!opts.force && guardianReady && ageMs <= FRESH_TTL_MS) {
      traceEvent('access:cache-hit', { request: 'unlocks', reason: options && options.reason || 'cached' });      return Promise.resolve({ ok: true, cached: true, snapshot: getSnapshot() });
    }
    var canUseStale = hasUsableCache() && ageMs <= STALE_TTL_MS;
    var canUseGrace = hasUsableCache() && !adminSnapshot && ageMs <= GRACE_TTL_MS;
    if (!opts.force && (canUseStale || canUseGrace)) {
      state.status = 'degraded';
      notify();
      if (Date.now() - Number(lastRefreshAttemptAt[requestKey] || 0) >= REFRESH_THROTTLE_MS) {
        startFetch(context, 0, opts);
      }
      return Promise.resolve({ ok: true, cached: true, stale: true, snapshot: getSnapshot() });
    }
    loadedEpoch[context.key] = bootEpoch;
    return startFetch(context, 0, opts);
  }

  function revalidate(options) {
    var next = Object.assign({}, options || {}, { force: true });
    return ensureLoaded(next);
  }

  function reset(options) {
    var targetKey = options && options.key;
    if (!targetKey || targetKey === contextKey) {
      if (options && options.clearCache) {
        clearUserCache(state.userId);
        clearLegacyUnlockLedger();
      }
      abortCurrent('reset');
      bootEpoch += 1;
      loadedEpoch = Object.create(null);
      lastRefreshAttemptAt = Object.create(null);
      accessDecisionCache = Object.create(null);
      state = createState(contextKey);
      syncLegacyFeatureMap();
      notify();
    }
  }

  var store = {
    version: STORAGE_VERSION,
    subscribe: function (listener) {
      if (typeof listener !== 'function') return function () {};
      listeners.push(listener);
      listener(getSnapshot());
      return function () {
        listeners = listeners.filter(function (candidate) { return candidate !== listener; });
      };
    },
    getSnapshot: getSnapshot,
    getEffectiveTier: getEffectiveTier,
    canAccessFeature: canAccessFeature,
    canPurchaseProduct: canPurchaseProduct,
    getMonthlyBalance: getMonthlyBalance,
    getFeatureState: function (featureKey) {
      return { unlocked: isUnlocked(featureKey), status: state.status, error: state.error };
    },
    isUnlocked: isUnlocked,
    ensureLoaded: ensureLoaded,
    revalidate: revalidate,
    refreshEntitlements: revalidate,
    getAccessDecision: getAccessDecision,
    invalidateAccessDecision: clearAccessDecisionCache,
    invalidateEntitlements: function (reason) {
      clearAccessDecisionCache();
      if (contextKey) delete loadedEpoch[contextKey];
      if (contextKey) delete lastRefreshAttemptAt[contextKey];
      state.error = null;
      debug('invalidated', { cacheKey: contextKey, reason: reason || 'entitlement-invalidated' });
      return Promise.resolve({ ok: true, invalidated: true, snapshot: getSnapshot() });
    },
    applyAccessStateSnapshot: applyAccessStateSnapshot,
    setRequestAdapter: function (adapter) {
      requestAdapter = typeof adapter === 'function' ? adapter : null;
      return true;
    },
    applyPaymentPayload: applyPaymentPayload,
    markConfirmedUnlocked: markConfirmedUnlocked,
    markOptimisticallyUnlocked: markOptimisticallyUnlocked,
    applyOptimisticUpdate: function (update) {
      var payload = update && update.payload || update || {};
      return applyPaymentPayload(payload, update || {});
    },
    rollbackOptimisticUpdate: function (reason) {
      state.optimistic = Object.create(null);
      syncLegacyFeatureMap();
      saveCache();
      notify();
      dispatch('cd:unlocks-changed', { source: 'access-store-rollback', reason: reason || 'rollback' });
      return true;
    },
    setAccessDecision: function (featureKey, decision) {
      state.accessDecision[String(featureKey || '')] = decision;
      notify();
    },
    reset: reset,
    abort: abortCurrent
  };

  global.CodeDestinyAccessStore = store;
  global.addEventListener && global.addEventListener('cd:auth-changed', function (event) {
    var detail = event && event.detail || {};
    if (detail.type === 'logout' || detail.loggedIn === false || detail.user === null) {
      reset({ clearCache: false });
      contextKey = '';
      return;
    }
    var authEvent = String(detail.event || detail.type || '').toLowerCase();
    var authSource = String(detail.source || '').toLowerCase();
    if (authEvent === 'subscription' || authSource === 'membership-cache') return;
    store.invalidateEntitlements('auth-changed');
  });
  function handleProfileChanged(event) {
    var detail = event && event.detail || {};
    var profile = detail.profile && typeof detail.profile === 'object' ? detail.profile : detail;
    var profileId = String(profile && (profile.id || profile.profileId || profile._id) || detail.profileId || '').trim();
    store.invalidateEntitlements('profile-changed');
    if (!profileId || !hasSessionHint({})) return;
    try { global.__cdCurrentProfileId = profileId; } catch (_) {}
    /* force 를 주지 않는다. 정합성은 캐시 키(makeCacheKey(userId, profileId))가 이미 보장한다 —
       카드가 바뀌면 restoreCache 가 그 카드 전용 스냅샷으로 통째 교체된다. force 는 신선도만
       담당했는데, 그 때문에 A↔B 왕복 전환이 매번 access-state 를 강제 발사해 프로필 전환 PATCH 와
       같은 순간 Mongo admission 게이트를 함께 때리고 있었다. FRESH_TTL 과 stale 재검증에 맡긴다. */
    store.ensureLoaded({ profileId: profileId, authenticated: true, reason: 'profile-changed' });
  }
  global.addEventListener && global.addEventListener('cd:profile-changed', handleProfileChanged);
  global.addEventListener && global.addEventListener('destinyProfileChanged', handleProfileChanged);
  global.addEventListener && global.addEventListener('cd:billing-balance-updated', function (event) {
    var detail = event && event.detail || {};
    clearAccessDecisionCache();
    if (detail.unlocks || detail.unlockedFeatures || detail.unlockedFeatureMap || detail.payload) {
      applyPaymentPayload(detail.payload || detail, { profileId: detail.profileId });
      store.revalidate({ profileId: detail.profileId || state.profileId, authenticated: true, reason: 'payment' });
    }
  });

  global.addEventListener && global.addEventListener('storage', function (event) {
    if (!event || event.key !== storageKey(contextKey) || !contextKey || !state.userId) return;
    restoreCache(contextKey, state.userId, state.profileId);
  });
  if (typeof global.BroadcastChannel === 'function') {
    try {
      syncChannel = new global.BroadcastChannel(ACCESS_SYNC_CHANNEL);
      syncChannel.onmessage = function (event) {
        var detail = event && event.data || {};
        if (detail.type !== 'snapshot-changed' || detail.cacheKey !== contextKey) return;
        if (Number(detail.savedAt || detail.checkedAt || 0) <= Number(state.checkedAt || 0)) return;
        restoreCache(contextKey, state.userId, state.profileId);
      };
    } catch (_) {
      syncChannel = null;
    }
  }

  debug('provider mounted', { version: STORAGE_VERSION });
})(typeof globalThis !== 'undefined' ? globalThis : window);
