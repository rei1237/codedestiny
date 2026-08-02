(function accessStoreBootstrap(global) {
  'use strict';

  if (!global || global.CodeDestinyAccessStore) return;

  var STORAGE_VERSION = 2;
  var STORAGE_PREFIX = 'cd_access_store_v2::';
  var LEGACY_LEDGER_KEY = 'cd_verified_unlock_grants_v1';
  var RETRY_DELAYS = [1000, 3000, 10000];
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
  var retryTimers = Object.create(null);
  var retryAttempts = Object.create(null);
  var loadedEpoch = Object.create(null);
  var bootEpoch = 0;
  var contextKey = '';
  var abortController = null;
  var state = createState('');

  function createState(key) {
    return {
      cacheKey: key,
      profileId: '',
      userId: '',
      serviceKeys: DEFAULT_SERVICE_KEYS.slice(),
      persistentUnlocks: Object.create(null),
      optimistic: Object.create(null),
      membership: null,
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

  function makeCacheKey(userId, profileId, serviceKeys) {
    return userId + '::' + (profileId || 'default') + '::' + serviceKeys.join(',');
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

  function notify() {
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

  function syncLegacyFeatureMap() {
    var next = Object.create(null);
    Object.keys(state.persistentUnlocks).forEach(function (key) {
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
      storage.setItem(
        storageKey(state.cacheKey),
        JSON.stringify({
          version: STORAGE_VERSION,
          cacheKey: state.cacheKey,
          profileId: state.profileId,
          userId: state.userId,
          persistentUnlocks: state.persistentUnlocks,
          optimistic: state.optimistic,
          membership: state.membership,
          savedAt: Date.now()
        })
      );
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

  function readLegacyLedger(profileId) {
    var storage = getStorage();
    if (!storage) return Object.create(null);
    try {
      var parsed = JSON.parse(storage.getItem(LEGACY_LEDGER_KEY) || '{}');
      var grants = parsed && parsed.grants && typeof parsed.grants === 'object' ? parsed.grants : parsed;
      var result = Object.create(null);
      Object.keys(grants || {}).forEach(function (key) {
        var grant = grants[key];
        if (!grant || grant.profileId && profileId && String(grant.profileId) !== String(profileId)) return;
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
        restored = JSON.parse(storage.getItem(storageKey(key)) || 'null');
      } catch (_) {
        restored = null;
      }
    }
    if (!restored || restored.version !== STORAGE_VERSION || restored.userId !== userId) {
      restored = null;
    }

    state = createState(key);
    state.profileId = profileId;
    state.userId = userId;
    state.serviceKeys = normalizeServiceKeys({ serviceKeys: key.split('::').slice(2).join('::').split(',') });
    if (restored) {
      state.persistentUnlocks = copyMap(restored.persistentUnlocks);
      state.optimistic = restored.optimistic && typeof restored.optimistic === 'object' ? restored.optimistic : Object.create(null);
      state.membership = copyObject(restored.membership) || readMembershipSnapshot(userId);
      state.checkedAt = Number(restored.savedAt || 0);
      state.source = 'localStorage';
      state.status = 'ready';
      debug('cache hit', { cacheKey: key, ageMs: Date.now() - state.checkedAt });
    } else {
      state.persistentUnlocks = readLegacyLedger(profileId);
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
    var key = makeCacheKey(userId, profileId, serviceKeys);
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

  function applyServerPayload(payload, context) {
    var serverUnlocks = extractUnlockMap(payload);
    var merged = copyMap(serverUnlocks);
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
    if (typeof global.fetch !== 'function') {
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
    var request = global.fetch('/api/billing/unlock-status' + (query ? '?' + query : ''), {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
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
      });
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
    return Object.keys(state.persistentUnlocks).length > 0 || Object.keys(state.optimistic).length > 0 || Boolean(state.membership);
  }

  function clearRetry(key) {
    if (retryTimers[key]) {
      global.clearTimeout(retryTimers[key]);
      delete retryTimers[key];
    }
    delete retryAttempts[key];
  }

  function startFetch(context, attempt) {
    if (inFlight[context.key]) {
      debug('reused', { cacheKey: context.key });
      return inFlight[context.key].promise;
    }
    if (typeof global.fetch !== 'function') {
      return Promise.resolve({ ok: false, status: state.status, reason: 'FETCH_UNAVAILABLE' });
    }
    abortController = typeof global.AbortController === 'function' ? new global.AbortController() : null;
    var controller = abortController;
    var query = '/api/access/unlocks?profileId=' + encodeURIComponent(context.profileId) +
      '&serviceKey=' + encodeURIComponent(context.serviceKeys.join(',')) + '&includeBackfill=1';
    var epoch = bootEpoch;
    var request = global.fetch(query, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (!response.ok || payload && payload.ok === false) {
          var error = new Error('Unlock request failed: ' + response.status);
          error.status = response.status;
          error.payload = payload;
          throw error;
        }
        return payload;
      });
    }).then(function (payload) {
      if (epoch !== bootEpoch || context.key !== contextKey) {
        debug('ignored stale response', { cacheKey: context.key });
        return { ok: false, stale: true };
      }
      applyServerPayload(payload, context);
      clearRetry(context.key);
      return { ok: true, payload: payload };
    }).catch(function (error) {
      if (error && error.name === 'AbortError') {
        debug('fetch aborted', { cacheKey: context.key });
        return { ok: false, aborted: true };
      }
      if (error && (error.status === 401 || error.status === 403)) {
        reset({ clearCache: true });
        contextKey = '';
        state.status = 'error';
        state.error = { status: error.status, code: 'AUTH_REQUIRED' };
        notify();
        return { ok: false, status: error.status };
      }
      state.status = hasUsableCache() ? 'degraded' : 'error';
      state.error = { status: error && error.status || 0, code: 'UNLOCK_FETCH_FAILED' };
      notify();
      scheduleRetry(context);
      debug('fetch failed', { cacheKey: context.key, status: error && error.status, attempt: attempt || 0 });
      return { ok: false, status: state.status, stale: hasUsableCache() };
    }).finally(function () {
      if (inFlight[context.key] && inFlight[context.key].promise === request) delete inFlight[context.key];
      if (abortController === controller) abortController = null;
    });
    inFlight[context.key] = { promise: request, controller: controller, epoch: epoch };
    debug('fetch started', { cacheKey: context.key, attempt: attempt || 0 });
    return request;
  }

  function scheduleRetry(context) {
    if (retryTimers[context.key]) return;
    var attempt = Number(retryAttempts[context.key] || 0);
    if (attempt >= RETRY_DELAYS.length) return;
    retryAttempts[context.key] = attempt + 1;
    retryTimers[context.key] = global.setTimeout(function () {
      delete retryTimers[context.key];
      if (context.key !== contextKey) return;
      startFetch(context, attempt + 1);
    }, RETRY_DELAYS[attempt]);
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
    return {
      cacheKey: state.cacheKey,
      profileId: state.profileId,
      userId: state.userId,
      persistentUnlocks: copyMap(state.persistentUnlocks),
      optimistic: copyObject(state.optimistic) || {},
      membership: copyObject(state.membership),
      accessDecision: copyObject(state.accessDecision) || {},
      status: state.status,
      error: copyObject(state.error),
      checkedAt: state.checkedAt,
      source: state.source,
      lastPayload: copyObject(state.lastPayload)
    };
  }

  function isUnlocked(featureKey) {
    var key = String(featureKey || '');
    return Boolean(state.persistentUnlocks[key] || state.optimistic[key] && state.optimistic[key].expiresAt > Date.now());
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

  function applyPaymentPayload(payload, options) {
    var unlockMap = extractUnlockMap(payload);
    var profileId = getProfileId(options || {}) || state.profileId;
    Object.keys(unlockMap).forEach(function (key) {
      markOptimisticallyUnlocked(key, profileId, { source: 'payment-payload' });
    });
    if (Object.keys(unlockMap).length && state.profileId) {
      var context = { key: contextKey, userId: state.userId, profileId: state.profileId, serviceKeys: state.serviceKeys.slice() };
      global.setTimeout(function () {
        if (context.key === contextKey) startFetch(context, 0);
      }, 0);
    }
    return Object.keys(unlockMap);
  }

  function ensureLoaded(options) {
    var context = ensureContext(options || {});
    if (!context.profileId || !hasSessionHint(options || {})) {
      state.status = hasUsableCache() ? 'ready' : 'ready';
      notify();
      return Promise.resolve({ ok: true, skipped: true, reason: 'NO_AUTH_PROFILE' });
    }
    if (inFlight[context.key]) {
      debug('reused', { cacheKey: context.key });
      return inFlight[context.key].promise;
    }
    if (!options || !options.force && loadedEpoch[context.key] === bootEpoch) {
      return Promise.resolve({ ok: true, cached: true, snapshot: getSnapshot() });
    }
    loadedEpoch[context.key] = bootEpoch;
    return startFetch(context, 0);
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
      accessDecisionCache = Object.create(null);
      Object.keys(retryTimers).forEach(function (key) { clearRetry(key); });
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
    getFeatureState: function (featureKey) {
      return { unlocked: isUnlocked(featureKey), status: state.status, error: state.error };
    },
    isUnlocked: isUnlocked,
    ensureLoaded: ensureLoaded,
    revalidate: revalidate,
    getAccessDecision: getAccessDecision,
    invalidateAccessDecision: clearAccessDecisionCache,
    applyPaymentPayload: applyPaymentPayload,
    markOptimisticallyUnlocked: markOptimisticallyUnlocked,
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
      reset({ clearCache: true });
      contextKey = '';
      return;
    }
    revalidate({ userId: detail.userId, profileId: detail.profileId, authenticated: true });
  });
  global.addEventListener && global.addEventListener('cd:profile-changed', function (event) {
    var detail = event && event.detail || {};
    revalidate({ profileId: detail.profileId, userId: detail.userId, authenticated: true });
  });
  global.addEventListener && global.addEventListener('cd:billing-balance-updated', function (event) {
    var detail = event && event.detail || {};
    clearAccessDecisionCache();
    if (detail.unlocks || detail.unlockedFeatures || detail.unlockedFeatureMap || detail.payload) {
      applyPaymentPayload(detail.payload || detail, { profileId: detail.profileId });
    }
  });

  debug('provider mounted', { version: STORAGE_VERSION });
})(typeof globalThis !== 'undefined' ? globalThis : window);
