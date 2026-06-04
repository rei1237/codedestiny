/* ?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê??   Destiny Profile Manager  ¬∑  v1.0
   Deep Space & Sacred Gold ???ùÎÖÑ?îÏùº & ?•ÏÜå Í∏∞Î∞ò ?úÏ∞® Î≥¥Ï†ï ?ÑÎ°ú??   Namespace: FORTUNE_APP_USER_PROFILES
   CustomEvent: 'destinyProfileChanged' ???¨Ï£º ?îÏßÑ ?êÎèô ?∞Îèô
?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê?ê‚ïê??*/
(function() {
  'use strict';

  /* ?Ä?Ä ?§ÌÜ†Î¶¨Ï? ???Ä?Ä */
  var NS       = 'FORTUNE_APP_USER_PROFILES';
  var KEY_LIST = NS + '.list';
  var KEY_CURR = NS + '.current';
  var KEY_SCOPE_HINT  = NS + '.scope';
  var KEY_LEGACY_OWNER = NS + '.legacyOwner';
  var KEY_LIST_PREFIX = NS + '.list::';
  var KEY_CURR_PREFIX = NS + '.current::';
  var _dpScopedStorageReadyScope = '';

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

  function _dpResolveIdScope(user) {
    var scopeRaw = user && (user.id || user.userId || user._id || user.uid);
    return String(scopeRaw || '').trim().toLowerCase();
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
      safe.profileSubscription = {
        tier: String(user.profileSubscription.tier || 'free'),
        isActive: !!user.profileSubscription.isActive,
        expiresAt: user.profileSubscription.expiresAt || null,
      };
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

  function _dpReadListByKey(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
      return [];
    }
  }

  function _dpWriteProfilesToLocal(scope, profiles, currentId) {
    var safeScope = String(scope || 'guest');
    var listKey = _dpGetScopedListKey(safeScope);
    var currKey = _dpGetScopedCurrentKey(safeScope);
    try {
      localStorage.setItem(listKey, JSON.stringify(Array.isArray(profiles) ? profiles : []));
      if (currentId) localStorage.setItem(currKey, String(currentId));
      else localStorage.removeItem(currKey);
      _dpMirrorScopedToLegacy(safeScope);
    } catch (e) {}
  }

  function _dpMirrorScopedToLegacy(scope) {
    try {
      var safeScope = String(scope || 'guest');
      var listKey = _dpGetScopedListKey(safeScope);
      var currKey = _dpGetScopedCurrentKey(safeScope);
      var scopedListRaw = localStorage.getItem(listKey);
      localStorage.setItem(KEY_LIST, scopedListRaw || '[]');
      var currId = localStorage.getItem(currKey) || '';
      if (currId) localStorage.setItem(KEY_CURR, currId);
      else localStorage.removeItem(KEY_CURR);
      localStorage.setItem(KEY_SCOPE_HINT, safeScope);
      localStorage.setItem(KEY_LEGACY_OWNER, safeScope);
    } catch (e) {}
  }

  function _dpEnsureScopedStorageReady() {
    var scope = _dpGetProfileScope();
    if (_dpScopedStorageReadyScope === scope) return scope;

    try {
      var listKey = _dpGetScopedListKey(scope);
      var currKey = _dpGetScopedCurrentKey(scope);
      var scopedListRaw = localStorage.getItem(listKey);

      if (scopedListRaw == null) {
        var legacyRaw = localStorage.getItem(KEY_LIST);
        if (legacyRaw) {
          var legacyOwner = String(localStorage.getItem(KEY_LEGACY_OWNER) || localStorage.getItem(KEY_SCOPE_HINT) || '').trim().toLowerCase();
          var canMigrate = (scope === 'guest') || !legacyOwner || legacyOwner === scope;
          if (canMigrate) {
            localStorage.setItem(listKey, legacyRaw);
            var legacyCurr = localStorage.getItem(KEY_CURR) || '';
            if (legacyCurr) localStorage.setItem(currKey, legacyCurr);
          }
        }
      }

      if (localStorage.getItem(listKey) == null) {
        localStorage.setItem(listKey, '[]');
      }
      _dpMirrorScopedToLegacy(scope);
    } catch (e) {}

    _dpScopedStorageReadyScope = scope;
    return scope;
  }

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     1. Storage Module
  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
  var DPStorage = {
    list: function() {
      var scope = _dpEnsureScopedStorageReady();
      return _dpReadListByKey(_dpGetScopedListKey(scope));
    },
    save: function(profiles) {
      var scope = _dpEnsureScopedStorageReady();
      try {
        var currentId = localStorage.getItem(_dpGetScopedCurrentKey(scope)) || '';
        _dpWriteProfilesToLocal(scope, profiles, currentId);
      } catch (e) {}
    },
    current: function() {
      try {
        var scope = _dpEnsureScopedStorageReady();
        var id = localStorage.getItem(_dpGetScopedCurrentKey(scope));
        if (!id) return null;
        return DPStorage.list().find(function(p) { return p.id === id; }) || null;
      } catch(e) { return null; }
    },
    setCurrent: function(id) {
      var scope = _dpEnsureScopedStorageReady();
      try {
        localStorage.setItem(_dpGetScopedCurrentKey(scope), id || '');
        _dpMirrorScopedToLegacy(scope);
        _dpSetCurrentOnServerDebounced(id || '');
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
      var list = DPStorage.list().filter(function(p) { return p.id !== id; });
      DPStorage.save(list);
      if (localStorage.getItem(_dpGetScopedCurrentKey(scope)) === id) {
        DPStorage.setCurrent(list.length ? list[0].id : '');
      }
    },
    update: function(id, patch) {
      var list = DPStorage.list().map(function(p) {
        return p.id === id ? Object.assign({}, p, patch) : p;
      });
      DPStorage.save(list);
    }
  };

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     1-S. ?úÎ≤Ñ ?ôÍ∏∞??(Î°úÍ∑∏???ÅÌÉú ?ÑÏö©)
     ?ùÎÖÑ?îÏùº¬∑Ï∂úÏÉù?úÍ∞Ñ¬∑?±Î≥Ñ ?ïÎ≥¥???¥ÏÑ∏ ?úÎπÑ???úÍ≥µ Î™©Ï†Å???úÌï¥ ?úÎ≤Ñ???Ä?•Îê©?àÎã§.
  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
  function _dpReadStoredAuthToken() {
    try {
      var primary = String(localStorage.getItem('fortune_auth_token') || '').trim();
      if (primary) return primary;

      var sessionToken = String(sessionStorage.getItem('fortune_auth_token') || '').trim();
      if (sessionToken) {
        try { localStorage.setItem('fortune_auth_token', sessionToken); } catch (_) {}
        return sessionToken;
      }

      var legacy = String(localStorage.getItem('cdToken') || '').trim();
      if (!legacy) return '';

      try { localStorage.setItem('fortune_auth_token', legacy); } catch (_) {}
      return legacy;
    } catch (e) {
      return '';
    }
  }

  function _dpGetAuthToken() {
    return _dpReadStoredAuthToken();
  }

  function _dpBuildAuthHeaders(baseHeaders) {
    var headers = Object.assign({}, baseHeaders || {});
    var token = _dpGetAuthToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    return headers;
  }

  var _DP_DEFAULT_API_WORKER_ORIGIN = 'https://code-destiny-web.bulegyung.workers.dev';
  var _DP_FETCH_TIMEOUT_MS = 9000;
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

  function _dpIsAuthSensitivePath(pathname) {
    var path = String(pathname || '');
    return path.indexOf('/api/auth/') === 0
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
      pushBase('');
      try { pushBase((window && window.location && window.location.origin) || ''); } catch (_) {}
      try { pushBase(localStorage.getItem('fortune_api_base_url') || ''); } catch (_) {}
      try { pushBase((window && window.__CD_API_BASE_URL) || ''); } catch (_) {}
      try { pushBase((window && window.CODE_DESTINY_API_BASE_URL) || ''); } catch (_) {}
      try { pushBase((window && window.__CF_PAGES_API_BASE_URL) || ''); } catch (_) {}
      if (allowWorkerFallback) pushBase(_DP_DEFAULT_API_WORKER_ORIGIN);
    } else {
      try { pushBase(localStorage.getItem('fortune_api_base_url') || ''); } catch (_) {}
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
    ms = Math.max(2000, Math.min(20000, Math.floor(ms)));

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
        }, opts.timeoutMs)
          .then(function(response) {
            if (!response.ok) {
              if (response.status >= 500 && index < refreshCandidates.length - 1) return attempt(index + 1);
              return false;
            }

            return response.json().catch(function() { return null; }).then(function(payload) {
              if (!payload || payload.ok !== true) return false;
              var accessToken = String((payload && payload.accessToken) || '').trim();
              if (accessToken) {
                try { localStorage.setItem('fortune_auth_token', accessToken); } catch (_) {}
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

  function _dpFetchJsonWithFallback(pathname, init, options) {
    var opts = options || {};
    var method = String(((init && init.method) || 'GET')).toUpperCase();
    var requestInit = Object.assign({}, init || {});
    requestInit.method = method;
    requestInit.credentials = 'include';
    if (!requestInit.cache) requestInit.cache = 'no-store';

    var cooldownEnabled = _dpShouldApplyCooldown(pathname, method);
    if (cooldownEnabled) {
      var cooldownUntil = _dpReadCooldown(pathname);
      if (cooldownUntil > Date.now()) {
        return Promise.resolve({
          ok: false,
          status: 503,
          data: {
            code: 'SERVICE_UNAVAILABLE',
            message: '?úÎ≤Ñ ?ëÎãµ??Î∂àÏïà?ïÌïò???†Ïãú ?ÄÍ∏?Ï§ëÏûÖ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??'
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
          data: { message: 'API ?∞Í≤∞???§Ìå®?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??' },
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
              if (!payload.message) payload.message = '?úÎ≤Ñ ?ëÎãµ ?ïÏãù???¨Î∞îÎ•¥Ï? ?äÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??';
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

            if (response.status === 401 && _dpShouldTryRefresh(pathname, opts)) {
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
                        if (!retryPayload.message) retryPayload.message = '?úÎ≤Ñ ?ëÎãµ ?ïÏãù???¨Î∞îÎ•¥Ï? ?äÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??';
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
            var hasNext = index < candidates.length - 1;
            var retryable = looksHtml || response.status >= 500 || response.status === 404 || response.status === 0;
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
              message: '?§Ìä∏?åÌÅ¨ ?§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??',
              error: String((error && error.message) || error || 'network_error'),
            },
            response: null,
            base: candidate.base,
            url: candidate.url,
            looksHtml: false,
          };

          if (cooldownEnabled) _dpMarkCooldown(pathname, 0, false);
          if (index < candidates.length - 1) return attempt(index + 1);
          return lastResult;
        });
    }

    var requestPromise = attempt(0);
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
      return document.cookie.indexOf('fortune_auth_role=') >= 0;
    } catch (e) {}
    return false;
  }

  var _dpSessionVerify = {
    checkedAt: 0,
    ok: false,
    userId: '',
    signature: '',
    pending: null
  };

  function _dpGetSessionVerifyTtlMs(state) {
    var isOk = !!(state && state.ok);
    return isOk ? 30000 : 2000;
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
    _dpSessionVerify.signature = _dpGetSessionHintSignature();
  }

  function _dpVerifyLoginSession(forceRefresh) {
    var force = !!forceRefresh;
    var now = Date.now();
    var signature = _dpGetSessionHintSignature();
    var ttlMs = _dpGetSessionVerifyTtlMs(_dpSessionVerify);
    if (!force
      && _dpSessionVerify.checkedAt
      && _dpSessionVerify.signature === signature
      && (now - _dpSessionVerify.checkedAt < ttlMs)) {
      return Promise.resolve(!!_dpSessionVerify.ok);
    }
    if (_dpSessionVerify.pending) return _dpSessionVerify.pending;
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
        if ((result.status === 401 || result.status === 403) && _dpIsSameOriginBase(result.base)) {
          try { localStorage.removeItem('fortune_auth_token'); } catch (_) {}
          try { localStorage.removeItem('fortune_auth_user'); } catch (_) {}
        }
        return null;
      }
      return (result.data && typeof result.data === 'object') ? result.data : null;
    }).then(function(payload) {
      var user = payload && payload.user ? payload.user : null;
      var userId = String((user && (user.id || user.userId || user._id || user.uid)) || '').trim();
      var ok = !!userId;
      _dpMarkSessionVerify(ok, userId);
      if (ok) {
        if (payload && payload.accessToken) {
          try { localStorage.setItem('fortune_auth_token', String(payload.accessToken)); } catch (_) {}
        }
        _dpPersistSessionUser(user);
      }
      return ok;
    }).catch(function() {
      _dpMarkSessionVerify(false, '');
      return false;
    }).finally(function() {
      _dpSessionVerify.pending = null;
    });

    return _dpSessionVerify.pending;
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
  // ?§Î•∏ JS Î™®Îìà?êÏÑú???¨Ïö©?????àÎèÑÎ°??ÑÏó≠ ?∏Ï∂ú
  window.__dpHasLoginSession = _dpHasLoginSession;

  var _dpSetCurrentTimer = null;

  function _dpSetCurrentOnServer(currentId) {
    var nextId = String(currentId || '').trim();
    if (!_dpHasSessionHint() || !nextId) return;
    _dpVerifyLoginSession(false).then(function(ok) {
      if (!ok) return;
      _dpFetchJsonWithFallback('/api/profile/current', {
        method: 'PATCH',
        credentials: 'include',
        cache: 'no-store',
        headers: _dpBuildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ currentId: nextId })
      }).then(function(res) {
        var data = res && res.data ? res.data : null;
        if (data && data.profileAccess) _dpApplyProfileAccess(data.profileAccess);
        if (res && res.status === 403 && data && data.code === 'PROFILE_SINGLE_LOCKED') {
          alert(data.message || '?ïÏ†ï???ÑÎ°ú??Ïπ¥ÎìúÎß??¨Ïö©?????àÏäµ?àÎã§.');
          _dpLoadFromServer(function(loaded) {
            if (!loaded) return;
            renderMasterCard(DPStorage.current());
            renderProfileList();
          });
        }
      }).catch(function() {});
    }).catch(function() {});
  }

  function _dpSetCurrentOnServerDebounced(currentId) {
    var nextId = String(currentId || '').trim();
    if (_dpSetCurrentTimer) clearTimeout(_dpSetCurrentTimer);
    _dpSetCurrentTimer = setTimeout(function() {
      _dpSetCurrentTimer = null;
      _dpSetCurrentOnServer(nextId);
    }, 240);
  }

  function _dpLoadFromServer(callback) {
    if (!_dpHasSessionHint()) { if (callback) callback(false); return; }
    _dpVerifyLoginSession(false).then(function(ok) {
      if (!ok) {
        if (callback) callback(false);
        return;
      }
      _dpFetchJsonWithFallback('/api/profile', {
        credentials: 'include',
        cache: 'no-store',
        headers: _dpBuildAuthHeaders()
      })
      .then(function(result) {
        if (result.status === 401 || result.status === 403) return null;
        return result.ok ? result.data : null;
      })
      .then(function(data) {
        if (!data || !data.ok || !Array.isArray(data.profiles)) { if (callback) callback(false); return; }
        var scope = _dpGetProfileScope();
        _dpWriteProfilesToLocal(scope, data.profiles, data.currentId || '');
        _dpApplyProfileAccess(data.profileAccess);
        if (data.profileAccess && data.profileAccess.selectionRequired) {
          _toast('?¥Ïö©Í∂??úÌÉù??Ï¢ÖÎ£å?òÏñ¥ ?¨Ïö©???ÑÎ°ú??Ïπ¥Îìú 1Í∞úÎ? ?†ÌÉù?¥Ïïº ?©Îãà??', 'warn');
        }
        if (data.subscription && typeof data.subscription === 'object') {
          var s = data.subscription;
          var tier = _dpNormalizeTier(s.tier);
          var active = !!s.isActive && tier !== 'free';
          var rawLimit = Number(s.profileLimit);
          var resolvedLimit = (isFinite(rawLimit) && rawLimit > 0) ? rawLimit : _dpGetTierProfileLimit(tier);
          _dpSubTier = tier;
          _dpSubIsActive = active;
          _dpSubProfileLimit = active ? resolvedLimit : 1;
          _dpSubScope = scope;
          _dpWriteSubCache(tier, active, resolvedLimit, s.expiresAt || null);
          _dpUpdateSaveBtn();
        }
        if (callback) callback(true);
      })
      .catch(function() { if (callback) callback(false); });
    }).catch(function() {
      if (callback) callback(false);
    });
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

  /* lockBody ?∏Ï∂ú ?¨Î? Ï∂îÏ†Å ??mobile ?êÏÑú unlockBody Î∂àÌïÑ???∏Ï∂ú Î∞©Ï? */
  var _bodyLocked = false;

  /* ?Ä?Ä ?ÑÎ°ú??Ïπ¥Îìú ?¥ÏÑ∏ ?†ÌÉù Î™®Îã¨: ÏΩîÏù∏ ?†Í∏à ?§Ï†ï ?Ä?Ä
     Í∏∞Î≥∏ Ï∞®Ìä∏(?êÎ??êÏàò¬∑?ôÏöî?ê¬∑Î≤†?§Ï†ê¬∑?êÏÑ±????Î¨¥Î£å Í∞úÎ∞©.
     ?¥Î™Ö??ÍΩ??ÑÌ?Î¶¨Ïóê??1??200ÏΩîÏù∏ ?ÅÍµ¨ ?¥Í∏à. ?Ä?Ä */
  var _DP_FEATURE_LOCKS = {
    olympus: { key: 'olympus-fc', cost: 100, name: '?¨Î¶º?∏Ïä§ ?†ÌÉÅ' },
    flower:  { key: 'flower-fc',  cost: 200, name: '?¥Î™Ö??ÍΩ??ÑÌ?Î¶¨Ïóê ?ÑÏ≤¥', extraUnlockKeys: ['flower-destiny', 'flower-astro', 'flower-ziwei', 'flower-sukuyo'] }
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

    // Legacy fallback: scoped ?ùÎ≥Ñ?êÍ? ?ÜÍ±∞??scoped ?∞Ïù¥?∞Í? ÎπÑÏñ¥ ?àÎäî Í≤ΩÏö∞?êÎßå
    // ?¥Ï†Ñ ?Ä????cd_tile_locks)???¥Í∏à ?ÅÌÉúÎ•??ΩÏñ¥ ?†Í∏à ?¨Î∞ú??Î∞©Ï??úÎã§.
    // (scoped ?∞Ïù¥?∞Í? ?àÏúºÎ©?legacyÎ•?Î≥ëÌï©?òÏ? ?äÏïÑ Í≥ÑÏ†ï Í∞??§Ïóº??ÎßâÎäî??
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
      var remain = Number(balance);
      var detail = reason ? String(reason) : '?†Î£å ?úÎπÑ??;
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
        + '<span>?™ô ' + detail + ' ?¥Ïö©?ºÎ°ú <strong>' + amount.toLocaleString('ko-KR') + 'ÏΩîÏù∏</strong>??Ï∞®Í∞ê?òÏóà?µÎãà??</span>'
        + '<span style="display:block;color:rgba(255,255,255,0.86);margin-top:2px;">?®Ï? ÏΩîÏù∏: ' + (isFinite(remain) ? remain.toLocaleString('ko-KR') : '-') + '</span>';

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
      var tierLabel = tierRaw === 'vvip' ? 'VVIP' : (tierRaw === 'premium' ? '?ÑÎ¶¨ÎØ∏ÏóÑ' : (tierRaw === 'standard' ? '?§ÌÉ†?§Îìú' : 'Íµ¨ÎèÖ'));
      var requiredCoins = Number(info.requiredCoins || 0);
      var freeLimit = Number(info.freeLimit || 0);
      var message = String(info.message || '').trim() || (tierLabel + ' ?úÌÉù?ºÎ°ú ?¥Î≤à Î¶¨Îî©?Ä ÏΩîÏù∏??Ï∞®Í∞ê?òÏ? ?äÏïò?¥Ïöî. ?∞Ïù¥Í∞Ä Î≥ÑÎπõ Î∞©Ìå®Î°?ÏßÄÏºúÎìú?∏Ïñ¥??');

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
      var policyLabel = 'Íµ¨ÎèÖ ?ïÏ±Ö ?ÅÏö©: ' + tierLabel + ' ?åÎûú';
      if (freeLimit > 0) {
        policyLabel += ' ¬∑ ' + freeLimit.toLocaleString('ko-KR') + 'ÏΩîÏù∏ ?¥Ìïò ?úÎπÑ??ÎπÑÏ∞®Í∞?;
      }
      if (requiredCoins > 0) {
        policyLabel += ' ¬∑ ?¥Î≤à ?úÎπÑ??' + requiredCoins.toLocaleString('ko-KR') + 'ÏΩîÏù∏';
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

  function _dpSetPaymentPending(show, message) {
    var text = String(message || '').trim() || 'Í≤∞Ï†úÍ∞Ä ÏßÑÌñâ Ï§ëÏûÖ?àÎã§.';

    try {
      if (typeof window._cdSetCoinGateOverlay === 'function') {
        window._cdSetCoinGateOverlay(!!show, text);
      } else {
        _dpSetStandalonePaymentOverlay(!!show, text);
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
      var raf = typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame.bind(window)
        : function(callback) { return setTimeout(callback, 16); };
      raf(function() {
        setTimeout(resolve, 0);
      });
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
      '  background: radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.78), rgba(2, 6, 23, 0.92));',
      '  backdrop-filter: blur(8px);',
      '  padding: 16px;',
      '}',
      '#cdStandalonePaymentOverlay .cd-standalone-payment-card {',
      '  width: min(420px, 100%);',
      '  border-radius: 20px;',
      '  border: 1px solid rgba(125, 211, 252, 0.42);',
      '  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.94));',
      '  box-shadow: 0 24px 54px rgba(2, 6, 23, 0.5);',
      '  padding: 22px 18px;',
      '  color: rgba(226, 232, 240, 0.98);',
      '  text-align: center;',
      '}',
      '#cdStandalonePaymentOverlay .cd-standalone-payment-spinner {',
      '  width: 44px;',
      '  height: 44px;',
      '  margin: 0 auto 12px;',
      '  border-radius: 999px;',
      '  border: 3px solid rgba(125, 211, 252, 0.22);',
      '  border-top-color: rgba(125, 211, 252, 0.96);',
      '  animation: cdStandalonePaymentSpin 0.9s linear infinite;',
      '}',
      '#cdStandalonePaymentOverlay .cd-standalone-payment-title {',
      '  margin: 0;',
      '  font-size: 19px;',
      '  font-weight: 800;',
      '  color: rgba(224, 242, 254, 0.98);',
      '}',
      '#cdStandalonePaymentOverlay .cd-standalone-payment-desc {',
      '  margin: 9px 0 0;',
      '  font-size: 14px;',
      '  color: rgba(186, 230, 253, 0.95);',
      '}',
      '#cdStandalonePaymentOverlay .cd-standalone-payment-status {',
      '  margin: 13px 0 0;',
      '  border-radius: 12px;',
      '  border: 1px solid rgba(167, 243, 208, 0.3);',
      '  background: linear-gradient(135deg, rgba(15, 23, 42, 0.44), rgba(6, 78, 59, 0.3));',
      '  padding: 8px 10px;',
      '  color: rgba(220, 252, 231, 0.98);',
      '  font-size: 13px;',
      '  font-weight: 600;',
      '}',
      '@media (max-width: 480px) {',
      '  #cdStandalonePaymentOverlay .cd-standalone-payment-card { padding: 20px 16px; border-radius: 18px; }',
      '  #cdStandalonePaymentOverlay .cd-standalone-payment-title { font-size: 17px; }',
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
      '  <div class="cd-standalone-payment-spinner" aria-hidden="true"></div>',
      '  <p class="cd-standalone-payment-title">?Ä??Í≤∞Ï†úÎß??ôÍ∏∞??Ï§?..</p>',
      '  <p class="cd-standalone-payment-desc">Î≥ÑÎπõ ?åÎ°úÎ°?Í≤∞Ï†ú ?ïÎ≥¥Î•??àÏ†Ñ?òÍ≤å ?ïÏù∏?òÍ≥† ?àÏäµ?àÎã§.</p>',
      '  <p class="cd-standalone-payment-status" id="cdStandalonePaymentOverlayStatus">Í≤∞Ï†úÍ∞Ä ÏßÑÌñâ Ï§ëÏûÖ?àÎã§.</p>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);
    return overlay;
  }

  function _dpSetStandalonePaymentOverlay(show, message) {
    if (typeof document === 'undefined') return;
    var overlay = _dpEnsureStandalonePaymentOverlay();
    if (!overlay) return;
    var statusEl = document.getElementById('cdStandalonePaymentOverlayStatus');
    if (statusEl) {
      statusEl.textContent = String(message || '').trim() || 'Í≤∞Ï†úÍ∞Ä ÏßÑÌñâ Ï§ëÏûÖ?àÎã§.';
    }
    overlay.style.display = show ? 'flex' : 'none';
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

  function _dpReadActiveMembershipCoverage(cost) {
    try {
      var user = JSON.parse(localStorage.getItem('fortune_auth_user') || 'null');
      var sub = user && user.profileSubscription;
      if (!sub || typeof sub !== 'object') return null;
      var tier = String(sub.tier || sub.plan || sub.planId || sub.productId || '').trim().toLowerCase();
      if (tier.indexOf('vvip') >= 0) tier = 'vvip';
      else if (tier.indexOf('premium') >= 0 || tier.indexOf('?ÑÎ¶¨ÎØ∏ÏóÑ') >= 0) tier = 'premium';
      else if (tier.indexOf('standard') >= 0 || tier.indexOf('?§ÌÉ†?§Îìú') >= 0) tier = 'standard';
      else return null;
      var activeStatus = String(sub.status || sub.subscriptionStatus || '').trim().toLowerCase();
      var active = sub.isActive === true || sub.isSubscribed === true || activeStatus === 'active' || activeStatus === 'paid' || activeStatus === 'current';
      if (!active) return null;
      if (sub.expiresAt) {
        var expiresAt = new Date(sub.expiresAt);
        if (!isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) return null;
      }
      var freeLimit = tier === 'vvip' ? 100 : (tier === 'premium' ? 50 : 30);
      var requiredCoins = Number(cost || 0);
      if (!(requiredCoins > 0) || requiredCoins > freeLimit) return null;
      return { tier: tier, freeLimit: freeLimit };
    } catch (_) {
      return null;
    }
  }

  /**
   * 1??ÏΩîÏù∏ Ï∞®Í∞ê Í≤åÏù¥?????ÅÍµ¨ ?¥Í∏à ?ÜÏù¥ ?¨Ïö©???åÎßà??cost ÏΩîÏù∏ Ï∞®Í∞ê.
   * @param {number} cost   Ï∞®Í∞ê ÏΩîÏù∏ ??   * @param {string} reason Í∏∞Îä•Î™?(?åÎ¶º Î¨∏Íµ¨??
   * @param {Function} cb   ?±Í≥µ ???∏Ï∂ú??ÏΩúÎ∞±
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
    var requestInit = Object.assign({}, init || {});
    requestInit.headers = _dpBuildAuthHeaders(Object.assign(
      { 'Content-Type': 'application/json' },
      requestInit.headers || {}
    ));
    if (typeof window.fetchJsonWithAuth === 'function') {
      return window.fetchJsonWithAuth(pathname, requestInit).then(_dpNormalizeBillingFetchResult);
    }
    return _dpFetchJsonWithFallback(pathname, requestInit, Object.assign({
      retryOn401: true,
      timeoutMs: 20000,
    }, options || {})).then(_dpNormalizeBillingFetchResult);
  }

  function _dpExtractBillingData(payload) {
    if (!payload || typeof payload !== 'object') return {};
    return (payload.data && typeof payload.data === 'object') ? payload.data : payload;
  }

  function _dpReadBillingMessage(payload, fallback) {
    if (payload && typeof payload === 'object') {
      if (payload.message) return String(payload.message);
      if (payload.error && payload.error.message) return String(payload.error.message);
    }
    return String(fallback || 'Í≤∞Ï†ú Ï≤òÎ¶¨???§Ìå®?àÏäµ?àÎã§.');
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

  function _dpLoadPortOneV2Sdk() {
    if (window.PortOne && typeof window.PortOne.requestPayment === 'function') return Promise.resolve();
    return new Promise(function(resolve, reject) {
      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        if (ok && window.PortOne && typeof window.PortOne.requestPayment === 'function') resolve();
        else reject(new Error('?¨Ìä∏??V2 Í≤∞Ï†ú SDKÍ∞Ä Ï¥àÍ∏∞?îÎêòÏßÄ ?äÏïò?µÎãà??'));
      }

      var existing = document.getElementById('portone-v2-sdk');
      if (!existing) {
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

  if (typeof window._cdRunDirectKrwCheckout !== 'function') {
    window._cdRunDirectKrwCheckout = async function(options) {
      var opts = options || {};
      var coinPrice = Math.max(0, Math.floor(Number(opts.coinPrice || opts.cost || 0)));
      var amountKrw = Math.max(0, Math.floor(Number(opts.amountKrw || (coinPrice * 100))));
      var checkoutPayload = Object.assign({
        paymentType: 'digital_content',
        paymentMode: 'DIRECT_KRW',
        provider: 'PORTONE_V2',
        pg: 'KG_INICIS',
        featureKey: String(opts.featureKey || '').trim(),
        reason: String(opts.reason || opts.title || '?†Î£å ?úÎπÑ??).trim(),
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

      var checkoutRes = await _dpPaymentFetchJson('/api/billing/checkout', {
        method: 'POST',
        headers: checkoutPayload.idempotencyKey ? { 'Idempotency-Key': checkoutPayload.idempotencyKey } : undefined,
        body: JSON.stringify(checkoutPayload),
      });
      if (!checkoutRes.ok) throw new Error(_dpReadBillingMessage(checkoutRes.payload, 'Í≤∞Ï†ú Ï§ÄÎπÑÏóê ?§Ìå®?àÏäµ?àÎã§.'));

      var checkoutData = _dpExtractBillingData(checkoutRes.payload);
      var order = checkoutData && typeof checkoutData.order === 'object' ? checkoutData.order : null;
      if (!order) {
        throw new Error('\uacb0\uc81c \uc8fc\ubb38 \uc815\ubcf4\ub97c \ud655\uc778\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.');
      }
      var merchantUid = String(order.merchantUid || order.paymentId || order.orderId || '').trim();
      var orderAmount = Number(order.paymentAmount || order.amountKRW || order.amount || 0);
      if (!merchantUid) {
        throw new Error('\uacb0\uc81c \uc8fc\ubb38 \uc815\ubcf4\uc5d0 \uc8fc\ubb38 ID\uac00 \uc5c6\uc2b5\ub2c8\ub2e4.');
      }
      if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
        throw new Error('\uacb0\uc81c \uc8fc\ubb38 \uc815\ubcf4\uc5d0 \uacb0\uc81c \uae08\uc561\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.');
      }
      await _dpLoadPortOneV2Sdk();
      var configRes = await _dpPaymentFetchJson('/api/payments/config', { method: 'GET' });
      if (!configRes.ok) throw new Error(_dpReadBillingMessage(configRes.payload, 'Í≤∞Ï†ú ?òÍ≤Ω ?§Ï†ï???ïÏù∏?????ÜÏäµ?àÎã§.'));
      var config = _dpExtractBillingData(configRes.payload);
      if (!config.storeId || !config.channelKey) {
        throw new Error('?¨Ìä∏??V2 Í≤∞Ï†ú ?§Ï†ï???ÜÏäµ?àÎã§.');
      }

      var checkoutUser = _dpReadAuthUser() || {};
      if ((!checkoutUser.email && !checkoutUser.userEmail) && typeof _dpVerifyLoginSession === 'function') {
        try { await _dpVerifyLoginSession(true); } catch (_) {}
        checkoutUser = _dpReadAuthUser() || checkoutUser;
      }

      var payloadCustomer = checkoutPayload.customer && typeof checkoutPayload.customer === 'object' ? checkoutPayload.customer : {};
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
      ]) || 'Íµ¨Îß§??;
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
      var customerPhone = _dpDigitsOnly(_dpPickText([
        payloadCustomer.phoneNumber,
        payloadCustomer.phone,
        checkoutPayload.phoneNumber,
        checkoutPayload.phone,
        checkoutUser.phoneNumber,
        checkoutUser.phone,
      ]));

      if (!customerName) {
        throw new Error('Í≤∞Ï†ú ?îÏ≤≠???¨Ïö©??Íµ¨Îß§???¥Î¶Ñ???ïÏù∏?????ÜÏäµ?àÎã§. Î°úÍ∑∏???ïÎ≥¥ ?êÎäî ?ÖÎ†• ?ºÏùò ?¥Î¶Ñ???ïÏù∏??Ï£ºÏÑ∏??');
      }
      if (!customerEmail) {
        throw new Error('?¥Îãà?úÏä§ V2 ?ºÎ∞ò Í≤∞Ï†ú?êÎäî Íµ¨Îß§???¥Î©î?ºÏù¥ ?ÑÏöî?©Îãà?? Î°úÍ∑∏???ïÎ≥¥ ?êÎäî ?ÖÎ†• ?ºÏùò ?¥Î©î?ºÏùÑ ?ïÏù∏??Ï£ºÏÑ∏??');
      }
      if (!_dpIsValidEmail(customerEmail)) {
        throw new Error('Íµ¨Îß§???¥Î©î???ïÏãù???¨Î∞îÎ•¥Ï? ?äÏäµ?àÎã§.');
      }

      var redirectUrl = new URL(window.location.href);
      redirectUrl.searchParams.set('portone_redirect', '1');
      var customer = {
        customerId: customerId,
        fullName: customerName,
        email: customerEmail
      };
      if (customerPhone) customer.phoneNumber = customerPhone;
      var requestData = {
        storeId: config.storeId,
        channelKey: config.channelKey,
        paymentId: merchantUid,
        orderName: String(order.productName || checkoutPayload.reason || '?îÏ????¥ÏÑ∏ ÏΩòÌÖêÏ∏?).slice(0, 80),
        totalAmount: orderAmount,
        currency: config.currency || 'CURRENCY_KRW',
        payMethod: config.payMethod || 'CARD',
        customer: customer,
        redirectUrl: redirectUrl.toString(),
        customData: {
          paymentType: 'digital_content',
          featureKey: String(order.featureKey || checkoutPayload.featureKey || ''),
          requestId: String(checkoutPayload.requestId || ''),
        },
      };
      if (config.noticeUrl) requestData.noticeUrls = [config.noticeUrl];

      var rsp = await window.PortOne.requestPayment(requestData);
      var paymentId = String((rsp && rsp.paymentId) || merchantUid || '').trim();
      if (!rsp || rsp.code || !paymentId) {
        throw new Error(String((rsp && (rsp.message || rsp.code)) || 'Í≤∞Ï†úÍ∞Ä ?ÑÎ£å?òÏ? ?äÏïò?µÎãà??'));
      }

      var confirmRes = await _dpPaymentFetchJson('/api/billing/confirm', {
        method: 'POST',
        body: JSON.stringify(Object.assign({}, checkoutPayload, {
          impUid: paymentId,
          paymentId: paymentId,
          merchantUid: merchantUid,
          amount: orderAmount,
          paymentAmount: orderAmount,
          coinPrice: Number(order.coinPrice || coinPrice),
          paymentType: 'digital_content',
          paymentMode: 'DIRECT_KRW',
          provider: 'PORTONE_V2',
          pg: 'KG_INICIS',
          paymentMethod: 'card_general',
        })),
      });
      if (!confirmRes.ok) throw new Error(_dpReadBillingMessage(confirmRes.payload, 'Í≤∞Ï†ú Í≤ÄÏ¶ùÏóê ?§Ìå®?àÏäµ?àÎã§.'));
      return confirmRes.payload;
    };
  }

  window._cdCoinGatePerUse = function(cost, reason, cb, onCancel, options) {
    if (!options && onCancel && typeof onCancel === 'object' && typeof cb === 'function') {
      options = onCancel;
      onCancel = undefined;
    }
    var optionBag = (options && typeof options === 'object') ? options : {};
    var normalizedFeatureKey = String(optionBag.featureKey || '').trim() || 'coin-gate-per-use';
    var now = Date.now();
    var lockAt = Number(window.__cdCoinGatePerUseLockAt || 0);
    var lockAgeMs = lockAt > 0 ? (now - lockAt) : 0;
    var isStaleLock = !lockAt || lockAgeMs > 45000;

    // Ï§ëÎ≥µ ?§Ìñâ Î∞©Ï?: ?¥Ï†Ñ fetchÍ∞Ä ÏßÑÌñâ Ï§ëÏù¥Î©?Ï∞®Îã®
    if (window._cdCoinGatePerUseInFlight) {
      if (isStaleLock) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        window.alert('?¥Ï†Ñ Í≤∞Ï†ú ?ÅÌÉúÎ•?Î≥µÍµ¨?àÏäµ?àÎã§. ?§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
      } else {
      window.alert('?¥Ï†Ñ Í≤∞Ï†ú Ï≤òÎ¶¨ Ï§ëÏûÖ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
      }
      if (typeof onCancel === 'function') onCancel();
      return;
    }

    var dedupeKey = normalizedFeatureKey + '|' + String(reason || '') + '|' + String(cost || 0);
    var dedupeMap = window.__cdCoinGatePromptDedup || (window.__cdCoinGatePromptDedup = {});
    // ?†Ô∏è Dedup ?Ä?ÑÏïÑ?ÉÏùÑ 2.5Ï¥àÎ°ú Ï¶ùÍ? (?∞Ìöå ?úÍ∞Ñ ?úÍ±∞)
    if (dedupeMap[dedupeKey] && (now - dedupeMap[dedupeKey] < 2500)) {
      if (typeof onCancel === 'function') onCancel();
      return;
    }
    dedupeMap[dedupeKey] = now;

    if (_cdIsAdminLikeUser()) {
      if (typeof cb === 'function') cb();
      return;
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
    var balanceLabel = hasBalanceSnapshot ? (Number(balance).toLocaleString('ko-KR') + 'ÏΩîÏù∏') : '?????ÜÏùå';
    var membershipCoverage = _dpReadActiveMembershipCoverage(cost);
    var pendingPass = _dpReadPendingSubscriptionPass();
    if (!membershipCoverage && pendingPass) {
      var prevTier = _dpSubTier;
      var prevActive = _dpSubIsActive;
      var prevLimit = _dpSubProfileLimit;
      _dpSubTier = pendingPass.tier;
      _dpSubIsActive = true;
      _dpSubProfileLimit = pendingPass.profileLimit;
      membershipCoverage = _dpReadActiveMembershipCoverage(cost);
      _dpSubTier = prevTier;
      _dpSubIsActive = prevActive;
      _dpSubProfileLimit = prevLimit;
    }
    if (pendingPass && membershipCoverage) {
      _cdShowSubscriptionShieldNotice({
        message: '¿ÃøÎ±« µÓ∑œ »Æ¿Œ ¡ﬂ¿‘¥œ¥Ÿ. ƒ⁄¿Œ¿∫ ¬˜∞®µ«¡ˆ æ æ“Ω¿¥œ¥Ÿ.',
        subscriptionTier: pendingPass.tier,
        freeLimit: null,
        requiredCoins: Number(cost || 0),
      });
      if (typeof cb === 'function') {
        cb(String(pendingPass.merchantUid || 'pending-subscription'), {
          ok: true,
          freeBySubscription: true,
          chargedCoins: 0,
          pendingSubscription: true,
          subscriptionTier: pendingPass.tier,
          message: '¿ÃøÎ±« µÓ∑œ »Æ¿Œ ¡ﬂ¿‘¥œ¥Ÿ. ƒ⁄¿Œ¿∫ ¬˜∞®µ«¡ˆ æ æ“Ω¿¥œ¥Ÿ.'
        });
      }
      return;
    }
    if (!membershipCoverage) {
        }).catch(function(error) {
          window._cdCoinGatePerUseInFlight = false;
          window.__cdCoinGatePerUseLockAt = 0;
          _dpSetPaymentPending(false);
          window.alert(String(error && error.message || '?®Í±¥ Í≤∞Ï†úÎ•??ÑÎ£å?òÏ? Î™ªÌñà?µÎãà?? Í≤∞Ï†ú ?òÎã®???ïÏù∏?????§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??'));
          if (typeof onCancel === 'function') onCancel(error);
        });
      }
    }
    var requestId = String(optionBag.requestId || '').trim().slice(0, 120);
    if (!requestId) {
      requestId = 'coin-gate-per-use-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }
    var consumeHeaders = { 'Content-Type': 'application/json' };
    if (token) consumeHeaders.Authorization = 'Bearer ' + token;
    window._cdCoinGatePerUseInFlight = true;
    window.__cdCoinGatePerUseLockAt = Date.now();
    var pendingLabel = String(reason || '').trim() || '?†Î£å ?úÎπÑ??;
    _dpSetPaymentPending(true, pendingLabel + (membershipCoverage ? ' ?¥Ïö©Í∂??úÎèÑÎ•??ïÏù∏?òÎäî Ï§ëÏûÖ?àÎã§...' : ' ?®Í±¥ Í≤∞Ï†úÎ•??ïÏù∏?òÎäî Ï§ëÏûÖ?àÎã§...'));
    _dpWaitForPaymentOverlayPaint().then(function() {
      return _dpFetchJsonWithFallback('/api/billing/coin-gate', {
        method: 'POST',
        headers: consumeHeaders,
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ cost: cost, reason: reason, featureKey: normalizedFeatureKey, forceDeduct: true, requestId: requestId })
      }, {
        retryOn401: true,
        timeoutMs: _DP_FETCH_TIMEOUT_MS,
      });
    })
    .then(function(res) {
      window._cdCoinGatePerUseInFlight = false;
      window.__cdCoinGatePerUseLockAt = 0;
      _dpSetPaymentPending(false);
      if (res.status === 401 || res.status === 403) {
        if (typeof window.__cdOpenLoginRequiredModal === 'function') {
          window.__cdOpenLoginRequiredModal({
            reason: 'Î°úÍ∑∏?????¥Ïö©?????àÎäî Í∏∞Îä•?ÖÎãà??',
            redirectTo: window.location.pathname + window.location.search + window.location.hash,
          });
        }
        if (typeof onCancel === 'function') onCancel();
        return;
      }
      if (res.status === 402 || !res.ok) {
        var rawFailData = (res && res.data && typeof res.data === 'object') ? res.data : {};
        var failData = (rawFailData.data && typeof rawFailData.data === 'object') ? rawFailData.data : rawFailData;
        var msg = rawFailData.message || failData.message || '?®Í±¥ Í≤∞Ï†úÍ∞Ä ?ÑÏöî?©Îãà??';
        if (res.status === 402) msg = msg + '\n\n?®Í±¥ Í≤∞Ï†ú Í∏∞Ï?: 50ÏΩîÏù∏ = 5,000??n?¨Ìä∏??V2 KG?¥Îãà?úÏä§ Í≤∞Ï†úÎ°?ÏßÑÌñâ?©Îãà??';
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
        var failMsg = String((data && data.message) || 'ÏΩîÏù∏ Í≤∞Ï†ú ?ïÏù∏Í∞íÏù¥ Î∂ÄÏ°±Ìïò???ùÏÑ±???úÏûë?òÏ? ?äÏïò?µÎãà?? ?§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
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
    .catch(function(e) { window._cdCoinGatePerUseInFlight = false; window.__cdCoinGatePerUseLockAt = 0; _dpSetPaymentPending(false); console.error('[coin-gate-per-use]', e); window.alert('?§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??'); if (typeof onCancel === 'function') onCancel(); });
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
    if (tier !== 'standard' && tier !== 'premium' && tier !== 'vvip') tier = 'free';
    return tier;
  }

  function _dpGetTierProfileLimit(tierRaw) {
    var tier = _dpNormalizeTier(tierRaw);
    if (tier === 'standard') return 3;
    if (tier === 'premium') return 7;
    if (tier === 'vvip') return 15;
    return 1;
  }

  function _dpGetTierLabel(tierRaw) {
    var tier = _dpNormalizeTier(tierRaw);
    if (tier === 'standard') return '?§ÌÉ†?§Îìú';
    if (tier === 'premium') return '?ÑÎ¶¨ÎØ∏ÏóÑ';
    if (tier === 'vvip') return 'VVIP';
    return 'Î¨¥Î£å';
  }

  function _dpGetNextTier(tierRaw) {
    var tier = _dpNormalizeTier(tierRaw);
    if (tier === 'free') return 'standard';
    if (tier === 'standard') return 'premium';
    if (tier === 'premium') return 'vvip';
    return '';
  }

  function _dpFormatLimitLabel(limit) {
    var n = Number(limit);
    if (!isFinite(n) || n <= 0) return 'Î¨¥Ï†ú??;
    return String(Math.floor(n)) + 'Í∞?;
  }

  /**
   * ?ÑÎ°ú??Ïπ¥Îìú Î™®Îã¨ ÏΩîÏù∏ ?†Í∏à Í≤åÏù¥??   * ?¥Î? ?¥Í∏à?êÍ±∞??Í¥ÄÎ¶¨Ïûê/?ÑÎ¶¨ÎØ∏ÏóÑ?¥Î©¥ cb() Ï¶âÏãú ?∏Ï∂ú,
   * ?ÑÎãå Í≤ΩÏö∞ ÏΩîÏù∏ ?ïÏù∏ ??Ï∞®Í∞ê API ???ÅÍµ¨ ?¥Í∏à ?Ä????cb()
   */
  function _dpGateLockFeature(type, cb) {
    var info = _DP_FEATURE_LOCKS[type];
    if (!info) { cb(); return; }
    if (!_dpIsFeatureLocked(info.key)) { cb(); return; }

    if (_cdIsAdminLikeUser()) { cb(); return; }

    var token = _dpGetAuthToken();
    var balance = _dpGetUserBalance();
    var hasBalanceSnapshot = false;
    try {
      var _uLock = JSON.parse(localStorage.getItem('fortune_auth_user') || 'null');
      hasBalanceSnapshot = !!(_uLock && typeof _uLock.points === 'number');
    } catch (_) {}
    var balanceLabel = hasBalanceSnapshot ? Number(balance).toLocaleString('ko-KR') : '?????ÜÏùå';

    var unlockProductId = _DP_UNLOCK_PRODUCT_BY_FEATURE_KEY[info.key] || '';
    var unlockRequestId = 'unlock-' + (unlockProductId || info.key) + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    if (typeof window._cdChooseServicePaymentMode === 'function') {
      window._cdChooseServicePaymentMode({
        title: info.name + ' ?ÅÍµ¨ ?¥Í∏à',
        coinPrice: info.cost,
        cost: info.cost,
        currentCoins: balance,
        balanceLabel: balanceLabel
      }).then(function(choice) {
        if (choice === 'monthly') {
          runFeatureUnlock();
          return;
        }
        if (choice === 'direct' && typeof window._cdRunDirectKrwCheckout === 'function') {
          _dpSetPaymentPending(true, info.name + ' ?®Í±¥ Í≤∞Ï†úÎ•?Ï§ÄÎπÑÌïò??Ï§ëÏûÖ?àÎã§...');
          window._cdRunDirectKrwCheckout({
            coinPrice: info.cost,
            cost: info.cost,
            title: info.name + ' ?ÅÍµ¨ ?¥Í∏à',
            reason: info.name + ' ?ÅÍµ¨ ?¥Í∏à',
            featureKey: info.key,
            productId: unlockProductId,
            requestId: unlockRequestId,
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
            window.alert(String(error && error.message || '?®Í±¥ Í≤∞Ï†úÎ•??ÑÎ£å?òÏ? Î™ªÌñà?µÎãà?? Í≤∞Ï†ú ?òÎã®???ïÏù∏?????§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??'));
          });
        }
      });
      return;
    }

    runFeatureUnlock();

    function runFeatureUnlock() {
      var inFlight = false;
      if (inFlight) return;
      inFlight = true;
      var productId = _DP_UNLOCK_PRODUCT_BY_FEATURE_KEY[info.key] || '';
      var requestId = 'unlock-' + (productId || info.key) + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
      var endpoint = productId ? '/api/fortune/pig-coin/unlock' : '/api/billing/coin-gate';
      var payload = productId
        ? { productId: productId, requestId: requestId }
        : {
          cost: info.cost,
          featureKey: info.key,
          reason: info.name + ' ?ÅÍµ¨ ?¥Í∏à',
          forceDeduct: true,
          requestId: requestId
        };
      var unlockHeaders = {
        'Content-Type': 'application/json'
      };
      if (token) unlockHeaders.Authorization = 'Bearer ' + token;
      _dpSetPaymentPending(true, info.name + ' Í≤∞Ï†úÎ•?Ï≤òÎ¶¨?òÎäî Ï§ëÏûÖ?àÎã§...');
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
        if (res.status === 401 || res.status === 403) {
          if (typeof window.__cdOpenLoginRequiredModal === 'function') {
            window.__cdOpenLoginRequiredModal({
              reason: 'Î°úÍ∑∏?????¥Ïö©?????àÎäî Í∏∞Îä•?ÖÎãà??',
              redirectTo: window.location.pathname + window.location.search + window.location.hash,
            });
          }
          return;
        }
        if (res.status === 402) {
          if (typeof window.__cdOpenChargeModal === 'function') {
            window.alert('?®Í±¥ Í≤∞Ï†úÍ∞Ä ?ÑÏöî?©Îãà?? Í≤∞Ï†ú ?ÅÏ†ê???¥Í≤†?µÎãà??');
            window.__cdOpenChargeModal();
          } else {
            window.location.href = '/points';
          }
          return;
        }
        if (!res.ok) {
          window.alert((res.data && res.data.message) || 'ÏΩîÏù∏ Ï∞®Í∞ê???§Ìå®?àÏäµ?àÎã§. ?§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
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
          _cdShowCoinDeductNotice(chargedCoins, newBalance, info.name + ' ?ÅÍµ¨ ?¥Í∏à');
        }
        _dpSaveFeatureUnlock(info.key);
        if (info.extraUnlockKeys) { for (var _ekI = 0; _ekI < info.extraUnlockKeys.length; _ekI++) _dpSaveFeatureUnlock(info.extraUnlockKeys[_ekI]); }
        window.alert('?éâ ' + info.name + '??Í∞Ä) ?¥Í∏à?òÏóà?µÎãà??');
        cb();
      })
      .catch(function (e) {
        inFlight = false;
        _dpSetPaymentPending(false);
        console.error('[dp-coin-gate]', e);
        window.alert('?§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
      });
    }
  }

  /* ?Ä?Ä ?ÑÎ°ú??Íµ¨ÎèÖ ?ÅÌÉú (Î°úÎìú ??Í∞±Ïã†) ?Ä?Ä */
  var _DP_SUB_CACHE_LEGACY_KEY = 'fortune_profile_subscription';
  var _DP_SUB_CACHE_OWNER_KEY = 'fortune_profile_subscription_owner';
  var _DP_SUB_CACHE_PREFIX = 'fortune_profile_subscription::';
  var _DP_PENDING_SUB_PASS_KEY = 'fortune_pending_subscription_pass';

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

  /** localStorage Ï∫êÏãú?êÏÑú Íµ¨ÎèÖ ?ÅÌÉúÎ•??ΩÏñ¥ Î≥Ä??Ï¥àÍ∏∞??*/
  function _dpLoadSubCache() {
    var scope = _dpGetProfileScope();
    _dpSubScope = scope;
    _dpSubTier = 'free';
    _dpSubIsActive = false;
    _dpSubProfileLimit = 1;
    try {
      var raw = localStorage.getItem(_dpGetSubCacheKey()) || '';
      if (!raw) {
        var legacyRaw = localStorage.getItem(_DP_SUB_CACHE_LEGACY_KEY) || '';
        var legacyOwner = String(localStorage.getItem(_DP_SUB_CACHE_OWNER_KEY) || '').trim().toLowerCase();
        if (legacyRaw && (!legacyOwner || legacyOwner === scope || scope === 'guest')) {
          raw = legacyRaw;
          localStorage.setItem(_dpGetSubCacheKey(), legacyRaw);
        }
      }
      if (!raw) return;

      var c = JSON.parse(raw);
      var tier = _dpNormalizeTier(c && c.tier);
      var active = !!(c && c.isActive) && tier !== 'free';
      var rawLimit = Number(c && c.profileLimit);
      var resolvedLimit = (isFinite(rawLimit) && rawLimit > 0) ? rawLimit : _dpGetTierProfileLimit(tier);

      _dpSubTier         = tier;
      _dpSubIsActive     = active;
      _dpSubProfileLimit = active ? resolvedLimit : 1;
    } catch(e) {}
  function _dpReadPendingSubscriptionPass() {
    try {
      var raw = localStorage.getItem(_DP_PENDING_SUB_PASS_KEY) || '';
      if (!raw) return null;
      var pending = JSON.parse(raw);
      var tier = _dpNormalizeTier(pending && pending.tier);
      if (tier === 'free') return null;
      return {
        tier: tier,
        merchantUid: String(pending && pending.merchantUid || '').trim(),
        profileLimit: Math.max(1, Math.floor(Number(pending && pending.profileLimit) || _dpGetTierProfileLimit(tier)))
      };
    } catch (_) {
      return null;
    }
  }

  }

  /** ?úÎ≤Ñ?êÏÑú Íµ¨ÎèÖ ?ÅÌÉú Ï°∞Ìöå ??Ï∫êÏãú¬∑Î≥Ä??Í∞±Ïã† */
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
        if (res.status === 401 || res.status === 403) return null;
        return res.ok ? res.data : null;
      })
      .then(function(d) {
        if (!d) return;
        var tier = _dpNormalizeTier(d.tier);
        var active = !!d.isActive && tier !== 'free';
        var rawLimit = Number(d.profileLimit);
        var resolvedLimit = (isFinite(rawLimit) && rawLimit > 0) ? rawLimit : _dpGetTierProfileLimit(tier);

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

  /** ?ÑÏû¨ ?åÎûú???∞Î•∏ ÏµúÎ? ?ÑÎ°ú????Î∞òÌôò */
  function _dpGetMaxProfiles() {
    var scope = _dpGetProfileScope();
    if (_dpSubScope !== scope || !_dpSubIsActive) _dpLoadSubCache();
    if (_dpSubIsActive) return _dpSubProfileLimit;
    return _dpGetTierProfileLimit(_dpGetUserPlan());
  }

  function _dpApplyProfileAccess(access) {
    if (!access || typeof access !== 'object') return;
    _dpProfileAccess = {
      mode: String(access.mode || 'subscription'),
      selectionRequired: !!access.selectionRequired,
      locked: !!access.locked,
      lockedProfileId: String(access.lockedProfileId || '').trim(),
      profileLimit: Math.max(1, Math.floor(Number(access.profileLimit || 1)))
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
          alert((data && data.message) || '?ÑÎ°ú???†ÌÉù???ïÏ†ï?????ÜÏäµ?àÎã§. ?§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
          if (callback) callback(false);
          return;
        }
        _dpApplyProfileAccess(data.profileAccess);
        if (callback) callback(true);
      }).catch(function() {
        alert('?ÑÎ°ú???†ÌÉù ?ïÏ†ï Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
        if (callback) callback(false);
      });
    }).catch(function() { if (callback) callback(false); });
  }

  /** ?Ä??Î≤ÑÌäº ?ÅÌÉúÎ•?Íµ¨ÎèÖ ?åÎûú??ÎßûÍ≤å ?ÖÎç∞?¥Ìä∏ */
  function _dpUpdateSaveBtn() {
    var btn = document.getElementById('dpSaveBtn');
    if (!btn) return;

    btn.disabled = false;
    btn.textContent = '???ÑÎ°ú???Ä??;
    btn.style.opacity = '';
    btn.style.cursor = '';
    btn.title = '?Ä????Î°úÍ∑∏??Íµ¨ÎèÖ ?ÅÌÉúÎ•??úÎ≤Ñ?êÏÑú ÏµúÏ¢Ö ?ïÏù∏?©Îãà??';
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

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     2. ÏßÑÌÉú?ëÏãú(True Solar Time) Î≥¥Ï†ï
        KST Í∏∞Ï?: ?úÏ? ?êÏò§??135??        Î≥¥Ï†ï??Î∂? = (135 - lng) √ó 4
  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
  function calcTrueSolarOffset(lng, tzOffsetHours) {
    /* ?úÏ? ?êÏò§??= UTC?§ÌîÑ??√ó 15??*/
    var stdMeridian = (tzOffsetHours !== undefined ? tzOffsetHours : 9) * 15;
    var offsetMin = Math.round((stdMeridian - lng) * 4);
    return offsetMin;   /* ?ëÏàò: ?§Î°ú ?πÍ?, ?åÏàò: ?ûÏúºÎ°??πÍ? */
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
    /* ?êÏ†ï ?¥Ï†Ñ/?¥ÌõÑ Ï≤òÎ¶¨ */
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
    return hh + ':' + mm + ' (' + dir + abs + 'Î∂?Î≥¥Ï†ï)';
  }

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     3. CustomEvent Î∏åÎ°ú?úÏ∫ê?§Ìä∏
        ???¨Ï£º ?îÏßÑ, ?êÎ??êÏàò, ?ôÏöî???êÎèô ?∞Îèô
  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
  function broadcastProfileChange(profile) {
    try {
      document.dispatchEvent(new CustomEvent('destinyProfileChanged', {
        detail: { profile: profile },
        bubbles: true
      }));
    } catch(e) {}
  }

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     4. ?ÖÎ†• ?????ÑÎ°ú???§Î∏å?ùÌä∏ Î≥Ä??  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
  function readFormData() {
    var name    = (document.getElementById('nameInput') || {}).value || '';
    var bdEl    = document.getElementById('birthDate');
    var bd      = bdEl ? bdEl.value : '';
    var hourRaw = parseInt((document.getElementById('birthHour') || {}).value, 10);
    var minuteRaw = parseInt((document.getElementById('birthMinute') || {}).value, 10);
    var hour = (Number.isFinite(hourRaw) && hourRaw >= 0 && hourRaw <= 23) ? hourRaw : 12;
    var minute = (Number.isFinite(minuteRaw) && minuteRaw >= 0 && minuteRaw <= 59) ? minuteRaw : 0;
    /* ?±Î≥Ñ: ?úÏÑ± Î≤ÑÌäº ?∞ÏÑ†, ?¥Î∞± window._gender, Í∏∞Î≥∏Í∞?'F' */
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

    /* ?•ÏÜå */
    var countrySel = document.getElementById('birthCountry');
    var opt        = countrySel ? countrySel.options[countrySel.selectedIndex] : null;
    var tz   = opt ? countrySel.value   : 'Asia/Seoul';
    var lng  = opt ? parseFloat(opt.getAttribute('data-long') || '127') : 127.0;
    var lat  = opt ? parseFloat(opt.getAttribute('data-lat')  || '37.6'): 37.6;
    var tzOff= opt ? parseFloat(opt.getAttribute('data-tz')   || '9')   : 9;
    var baseTzOff = opt ? parseFloat(opt.getAttribute('data-base-tz') || String(tzOff)) : tzOff;
    var locationLabel = opt ? opt.text : '?Ä?úÎ?Íµ?(?úÏö∏)';

    if (!name || !bd) return null;

    var parts  = bd.split('-');
    var year   = parseInt(parts[0]), month = parseInt(parts[1]), day = parseInt(parts[2]);

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

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     5. UI ??Master Destiny Card (?ÅÎã® Ïπ¥Îìú)
  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
  function renderMasterCard(profile) {
    var el = document.getElementById('dpMasterCard');
    if (!el) return;

    if (!profile) {
      el.innerHTML = _emptyCard();
      el.className = 'dp-master-card dp-master-card--empty';
      return;
    }

    var b = profile.birth;
    var l = profile.location || {};
    var profileLng = (l.lng !== undefined && l.lng !== null && !isNaN(Number(l.lng)))
      ? Number(l.lng)
      : ((l.lon !== undefined && l.lon !== null && !isNaN(Number(l.lon))) ? Number(l.lon) : null);
    var tzResolved = resolveTimezoneOffset(b, l);
    var safeLng = (profileLng !== null) ? profileLng : 127.0;
    var tso = calcTrueSolarOffset(safeLng, tzResolved.tzOffsetHours);
    var corrected = applyTrueSolarOffset(b.hour, b.minute, tso);
    var trueSolarStr = String(corrected.h).padStart(2,'0') + ':' + String(corrected.m).padStart(2,'0');
    var dir = tso > 0 ? '?? : '+';
    var absMin = Math.abs(tso);
    var zodiacEmoji = _zodiacEmoji(b.year);
    var calLabel = b.calType === 'solar' ? '?ëÎ†•' : (b.calType === 'lunar_leap' ? '?åÎ†•(??' : '?åÎ†•');

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
            + '<div class="dp-mc-label">??MY DESTINY CARD</div>'
            + '<div class="dp-mc-name">' + _esc(profile.name) + '</div>'
            + '<div class="dp-mc-birth">' + calLabel + ' '
              + b.year + '??' + b.month + '??' + b.day + '??'
              + String(b.hour).padStart(2,'0') + ':' + String(b.minute).padStart(2,'0')
            + '</div>'
            + '<div style="margin-top:4px;">'
              + (profile.gender === 'M'
                ? '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(96,165,250,0.18);border:1px solid rgba(96,165,250,0.45);color:#93c5fd;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.5px;">&#9794; ?®ÏÑ±</span>'
                : '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(244,114,182,0.18);border:1px solid rgba(244,114,182,0.45);color:#f9a8d4;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.5px;">&#9792; ?¨ÏÑ±</span>')
            + '</div>'
          + '</div>'
          + '<button class="dp-mc-list-btn" onclick="dpOpenList()" aria-label="?ÑÎ°ú??Î™©Î°ù" style="touch-action:manipulation">'
            + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'
          + '</button>'
        + '</div>'
        + '<div class="dp-mc-divider"></div>'
        + '<div class="dp-mc-info">'
          + '<div class="dp-mc-info-item dp-mc-info-item--wide">'
            + '<span class="dp-mc-info-label">'
              + '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
              + 'Ï∂úÏÉùÏßÄ'
            + '</span>'
            + '<span class="dp-mc-info-val">' + _esc(l.label) + '</span>'
          + '</div>'
          + '<div class="dp-mc-info-item">'
            + '<span class="dp-mc-info-label">'
              + '<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><circle cx="12" cy="12" r="4"/><path fill="none" stroke="currentColor" stroke-width="2" d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M17.66 6.34l1.41-1.41M4.93 19.07l1.41-1.41"/></svg>'
              + 'ÏßÑÌÉú?ëÏãú'
            + '</span>'
            + '<span class="dp-mc-info-val dp-mc-solar">'
              + trueSolarStr
              + '<span class="dp-mc-correction">' + dir + absMin + 'Î∂?/span>'
            + '</span>'
          + '</div>'
          + '<div class="dp-mc-info-item">'
            + '<span class="dp-mc-info-label">'
              + '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><line x1="2" y1="12" x2="22" y2="12"/></svg>'
              + 'Í≤ΩÎèÑ'
            + '</span>'
            + '<span class="dp-mc-info-val">' + l.lng.toFixed(1) + '¬∞</span>'
          + '</div>'
        + '</div>'
        + '<button class="dp-mc-load-btn" onclick="dpLoadProfile()" style="touch-action:manipulation">?????ÑÎ°ú?ÑÎ°ú ?¥ÏÑ∏ Î≥¥Í∏∞</button>'
      + '</div>';
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
      + '<div class="dp-mc-empty-title">?òÏùò ?¥Î™Ö Ïπ¥Îìú</div>'
      + '<div class="dp-mc-empty-desc">?ÑÎûò ?ïÎ≥¥Î•??ÖÎ†•?òÍ≥† ?Ä?•ÌïòÎ©?br>?¥Í≥≥???òÌ??©Îãà??/div>'
      + '<div class="dp-mc-empty-hint">???ÑÎûò?êÏÑú ?¥Î™Ö???àÍ∏∞?∏Ïöî</div>'
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
    var safeName = profile && profile.name ? _esc(profile.name) : '???ÑÎ°ú??;
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
        + '<div class="dp-saving-title">' + safeName + '?òÏùò ?¥Î™Ö Ïπ¥ÎìúÎ•??àÍ∏∞??Ï§?/div>'
        + '<div class="dp-saving-desc">?¨Îπõ ?ÑÎûò Î≥ÑÏùò Ï¢åÌëúÎ•?ÎßûÏ∂îÍ≥??àÏäµ?àÎã§.</div>'
        + '<div class="dp-saving-bar" aria-hidden="true"></div>'
      + '</div>';
  }

  function _zodiacEmoji(year) {
    var animals = ['??','?êÇ','?êÖ','?êá','?êâ','?êç','?êé','?êë','?êí','?êì','?êï','?êñ'];
    return animals[(year - 4 + 120) % 12];
  }
  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     3-A. Data Injection & Execution Pipeline
          ?ÑÎ°ú????????ÎπÑÎèôÍ∏?Í≥ÑÏÇ∞ ?§Ìñâ
  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
  /** Î≤†Îã§?????∏Î?Î°??òÍ∏∏ ??location/birth null Î≥¥Ï†ï (?úÏö∏ Í∏∞Î≥∏Í∞? */
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
        label: l.label || '?Ä?úÎ?Íµ?(?úÏö∏)',
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
        label: l.label || '?Ä?úÎ?Íµ?(?úÏö∏)',
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
    if (type === 'saju')   return '??' + safeName + ' ¬∑ ?¨Ï£º ?Ä?¥Î? ?úÏûë?©Îãà??;
    if (type === 'sukuyo') return '??' + safeName + ' ¬∑ ?ôÏöî??Î∂ÑÏÑù??Ï§ÄÎπÑÌï©?àÎã§';
    if (type === 'ziwei')  return '??' + safeName + ' ¬∑ ?êÎ??êÏàò Î™ÖÎ∞ò???¨Îäî Ï§ëÏûÖ?àÎã§';
    if (type === 'astro')  return '??' + safeName + ' ¬∑ ?êÏÑ±??ÏΩîÏ¶àÎØ?Ï∞®Ìä∏Î•?Ï§ÄÎπÑÌï©?àÎã§';
    if (type === 'vedic')  return '??' + safeName + ' ¬∑ Î≤†Îã§ ?êÏÑ±?†Î°ú ?¥Îèô?©Îãà??;
    if (type === 'flower') return '??' + safeName + ' ¬∑ ?¥Î™Ö??ÍΩ???úºÎ°??¥Îèô?©Îãà??;
    if (type === 'tarot')  return '??' + safeName + ' ¬∑ ?ÄÎ°?Ïª¨Î†â?òÏúºÎ°??¥Îèô?©Îãà??;
    return '??' + safeName + ' ¬∑ ?¥ÏÑ∏ Î∂ÑÏÑù???úÏûë?©Îãà??;
  }

  function _runSajuWhenReady(maxAttempts, delayMs) {
    var attempts = 0;
    var max = (typeof maxAttempts === 'number' && maxAttempts > 0) ? maxAttempts : 60;
    var delay = (typeof delayMs === 'number' && delayMs > 0) ? delayMs : 250;

    function tick() {
      attempts += 1;
      if (typeof window.checkPrivacyAndCalculate === 'function') {
        try {
          var p = window.checkPrivacyAndCalculate();
          if (p && typeof p.catch === 'function') {
            p.catch(function(err) {
              console.error('[DP] Í≥ÑÏÇ∞ ?ÑÎ£å ÏΩúÎ∞± ?§Î•ò:', err);
              _toast('?†Ô∏è Í≥ÑÏÇ∞ ?ÑÎ£å ??ÏΩòÌÖêÏ∏??úÏÑ±??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§', 'warn');
            });
          }
        } catch (err) {
          console.error('[DP] Í≥ÑÏÇ∞ ?§Ìñâ ?§Î•ò:', err);
          _toast('?†Ô∏è Í≥ÑÏÇ∞ ?§Ìñâ Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§', 'warn');
        }
        return;
      }

      if (attempts < max) {
        setTimeout(tick, delay);
      } else {
        _toast('?†Ô∏è Í≥ÑÏÇ∞ Î™®Îìà Î°úÎî©??ÏßÄ?∞ÎêòÍ≥??àÏäµ?àÎã§. ?†Ïãú ???êÎèô?ºÎ°ú ?§Ïãú ?úÎèÑ?©Îãà??', 'warn');
      }
    }

    tick();
  }

  function _injectAndRun(profile, fortuneType) {
    if (!profile) {
      _toast('?†Ô∏è ?úÏÑ±?îÎêú ?ÑÎ°ú?ÑÏù¥ ?ÜÏäµ?àÎã§', 'warn');
      return;
    }
    var b = profile.birth;
    var l = profile.location || {};
    var profileLng = (l.lng !== undefined && l.lng !== null && !isNaN(Number(l.lng)))
      ? Number(l.lng)
      : ((l.lon !== undefined && l.lon !== null && !isNaN(Number(l.lon))) ? Number(l.lon) : null);

    /* ?ÑÏàòÍ∞?Í≤ÄÏ¶?*/
    if (!b || !b.year || !b.month || !b.day) {
      _toast('?†Ô∏è ?ùÎÖÑ?îÏùº ?∞Ïù¥?∞Í? ?ÜÏäµ?àÎã§. ?ÑÎ°ú?ÑÏùÑ ?§Ïãú ?Ä?•Ìïò?∏Ïöî.', 'warn');
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

    /* ?úÍ∞Å ?ºÎìúÎ∞?Î®ºÏ? */
    spawnStardust(document.getElementById('dpMasterCard'));
    _toast(_fortuneStartMessage(profile.name, fortuneType || 'saju'), 'success');

    /* ?????∞Ïù¥??Ï£ºÏûÖ */
    var nameEl = document.getElementById('nameInput');
    if (nameEl) nameEl.value = profile.name || '';

    var bdEl = document.getElementById('birthDate');
    if (bdEl) bdEl.value = b.year + '-' + String(b.month).padStart(2,'0') + '-' + String(b.day).padStart(2,'0');

    var calBtns = document.querySelectorAll('input[name="calType"]');
    calBtns.forEach(function(btn) { btn.checked = btn.value === (b.calType || 'solar'); });

    var hourEl = document.getElementById('birthHour');
    var minEl  = document.getElementById('birthMinute');
    if (hourEl) hourEl.value = (b.hour !== undefined && b.hour !== null) ? b.hour : 12;
    if (minEl)  minEl.value  = (b.minute !== undefined && b.minute !== null) ? b.minute : 0;

    /* ???•ÏÜå ?†ÌÉù ??tz + Í≤ΩÎèÑ ?ïÎ? Îß§Ïπ≠, ?¥Î∞± tz-only */
    var countrySel = document.getElementById('birthCountry');
    if (countrySel && l.tz) {
      var matched = false;
      for (var i = 0; i < countrySel.options.length; i++) {
        var opt = countrySel.options[i];
        if (opt.value === l.tz && profileLng !== null && Math.abs(parseFloat(opt.getAttribute('data-long') || 0) - profileLng) < 1) {
          countrySel.selectedIndex = i; matched = true; break;
        }
      }
      if (!matched) {
        for (var j = 0; j < countrySel.options.length; j++) {
          if (countrySel.options[j].value === l.tz) { countrySel.selectedIndex = j; break; }
        }
      }
      try { countrySel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    }

    /* ???±Î≥Ñ ?ôÍ∏∞??*/
    if (window.setGender) window.setGender(profile.gender || 'F');
    window._gender = profile.gender || 'F';
    
    /* ??2. ?±Î≥Ñ Î≤ÑÌäº UI ?ôÍ∏∞??*/
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

    /* ??ÎØ∏Î¶¨Î≥¥Í∏∞ Í∞±Ïã† ???àÏô∏ Ï≤òÎ¶¨ Í∞ïÌôî */
    try {
      if (window.updateLunarPreview && typeof window.updateLunarPreview === 'function') {
        window.updateLunarPreview('birthDate', 'calType', 'lunarPreview');
      }
    } catch (err) {
      console.error('[DP] ?åÎ†• ÎØ∏Î¶¨Î≥¥Í∏∞ Í∞±Ïã† ?§Ìå®:', err);
    }
    try {
      if (window.updateCorrectedTimePreview && typeof window.updateCorrectedTimePreview === 'function') {
        window.updateCorrectedTimePreview();
      }
    } catch (err) {
      console.error('[DP] ?úÍ∞Ñ Î≥¥Ï†ï ÎØ∏Î¶¨Î≥¥Í∏∞ Í∞±Ïã† ?§Ìå®:', err);
    }

    /* ??ÎπÑÎèôÍ∏??§Ìñâ ??RAF + Ï∂©Î∂Ñ??ÏßÄ??+ ???ÑÎìú ?ÑÎπÑ ?ïÏù∏ ??Í≥ÑÏÇ∞ */
    requestAnimationFrame(function() {
      setTimeout(function() {
        /* ???ÑÎìúÍ∞Ä ?ÑÏ†Ñ??Ï§ÄÎπÑÎêò?àÎäîÏßÄ ?ïÏù∏ */
        try {
          var bdVal = document.getElementById('birthDate') ? document.getElementById('birthDate').value : '';
          var hVal = document.getElementById('birthHour') ? document.getElementById('birthHour').value : '';
          var mVal = document.getElementById('birthMinute') ? document.getElementById('birthMinute').value : '';
          console.log('[DP] ???ÑÎìú Í≤ÄÏ¶?', { bd: bdVal, hour: hVal, minute: mVal });
        } catch (e) {}
        _runSajuWhenReady(60, 250);
      }, 200); /* 80ms ??200msÎ°?Ï¶ùÍ?: ???ÑÏ†Ñ ?ÖÎç∞?¥Ìä∏ Î∞??¥Î≤§??Ï≤òÎ¶¨ ?ÄÍ∏?*/
    });
  }

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     6. UI ??Profile Constellation List (Î∞îÌ? ?úÌä∏)
  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
  function renderProfileList() {
    var list = DPStorage.list();
    var currId = (DPStorage.current() || {}).id;
    var container = document.getElementById('dpListInner');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = '<div class="dp-list-empty">ÍµêÏ≤¥???ÑÎ°ú?ÑÏù¥ ?ÜÏäµ?àÎã§.<br><small>?ÑÎûò ?ºÏùÑ ?ÖÎ†• ??\'?Ä??' Î≤ÑÌäº???åÎü¨Ï£ºÏÑ∏??</small></div>';
      return;
    }

    // Render placeholder first to prevent blank modal during slower mobile paints.
    container.innerHTML = '<div class="dp-list-empty">?ÑÎ°ú??Î™©Î°ù??Î∂àÎü¨?§Îäî Ï§?..</div>';

    requestAnimationFrame(function() {
      try {
        var isFreeUser = _dpGetMaxProfiles() <= 1;
        var access = _dpProfileAccess || {};
        var selectionRequired = !!access.selectionRequired;
        var lockedProfileId = String(access.lockedProfileId || '').trim();
        var lockedNotice = selectionRequired
          ? '<div style="margin-top:10px;padding:8px 12px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.4);border-radius:8px;text-align:center;font-size:0.72rem;color:#fbbf24;">?¥Ïö©Í∂??úÌÉù??Ï¢ÖÎ£å?òÏóà?µÎãà?? Í≥ÑÏÜç ?¨Ïö©???ÑÎ°ú??Ïπ¥Îìú 1Í∞úÎ? ?†ÌÉù?òÎ©¥ ?§Ïùå ?¥Ïö©Í∂?Í≤∞Ï†ú ?ÑÍπåÏßÄ ?¥Îãπ Ïπ¥ÎìúÎß??¨Ïö©?????àÏäµ?àÎã§.</div>'
          : (isFreeUser
          ? '<div style="margin-top:10px;padding:8px 12px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.4);border-radius:8px;text-align:center;font-size:0.72rem;color:#fbbf24;">?îí ?ÑÎ°ú??Ïπ¥Îìú????Î≤??ùÏÑ±?òÎ©¥ ?òÏ†ï/??†úÍ∞Ä Î∂àÍ??•Ìï©?àÎã§. ?ùÏÑ± ?ÑÏóê ?ïÎ≥¥Î•?Íº??ïÏù∏??Ï£ºÏÑ∏??</div>'
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
          var calLabel = b.calType === 'solar' ? '?? : (b.calType === 'lunar_leap' ? '?? : '??);
          var pid = safe.id || ('broken_' + idx);
          var pname = safe.name || '?¥Î¶Ñ ?ÜÏùå';
          var locLabel = l.label || 'Ï∂úÏÉùÏßÄ ÎØ∏Ï???;

          var isLockedOut = !!lockedProfileId && pid !== lockedProfileId;

          return '<div class="dp-list-item' + (isActive ? ' dp-list-item--active' : '') + '"'
            + ' data-profile-id="' + pid + '"'
            + ' role="button" tabindex="0"'
            + ' style="animation-delay:' + (idx * 0.07) + 's; cursor:pointer; touch-action:manipulation; -webkit-tap-highlight-color:transparent;"'
            + ' onclick="dpSelectProfile(\'' + pid + '\')">'
            + '<div class="dp-li-left">'
              + '<div class="dp-li-avatar">' + zodiac + '</div>'
              + '<div class="dp-li-body">'
                + '<div class="dp-li-name">' + _esc(pname)
                  + (isActive ? ' <span class="dp-li-current-badge">?ÑÏû¨</span>' : '')
                  + (isFreeUser && isLockedOut
                    ? ' <span style="font-size:0.62rem;color:#f87171;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.3);padding:1px 6px;border-radius:10px;">?¨Ïö©Î∂àÍ?</span>'
                    : '')
                  + (lockedProfileId && pid === lockedProfileId
                    ? ' <span style="font-size:0.62rem;color:#34d399;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.3);padding:1px 6px;border-radius:10px;">?ïÏ†ï</span>'
                    : '')
                  + (safe.gender === 'M'
                    ? ' <span style="font-size:0.65rem;color:#93c5fd;background:rgba(96,165,250,0.15);border:1px solid rgba(96,165,250,0.3);padding:1px 6px;border-radius:10px;">&#9794;</span>'
                    : ' <span style="font-size:0.65rem;color:#f9a8d4;background:rgba(244,114,182,0.15);border:1px solid rgba(244,114,182,0.3);padding:1px 6px;border-radius:10px;">&#9792;</span>')
                + '</div>'
                + '<div class="dp-li-meta">[' + calLabel + '] ' + safeYear + '.' + safeMonth + '.' + safeDay
                  + ' ¬∑ ÏßÑÌÉú?ëÏãú ' + tsStr + '</div>'
                + '<div class="dp-li-loc">?ìç ' + _esc(locLabel) + '</div>'
              + '</div>'
            + '</div>'
            + '</div>';
        }).join('') + lockedNotice;
      } catch (err) {
        console.error('[DP] renderProfileList failed', err);
        container.innerHTML = '<div class="dp-list-empty">?ÑÎ°ú??Î™©Î°ù???úÏãú?????ÜÏäµ?àÎã§.<br><small>?àÎ°úÍ≥†Ïπ® ???§Ïãú ?úÎèÑ?¥Ï£º?∏Ïöî.</small></div>';
      }
    });
  }

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     7. ?§Ì??îÏä§??Stardust) ?åÌã∞???®Í≥º
  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
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

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     8. Í≥µÍ∞ú API (window.dp*)
  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
  window.dpSaveProfile = function() {
    var data = readFormData();
    if (!data) {
      alert('?¥Î¶ÑÍ≥??ùÎÖÑ?îÏùº???ÖÎ†•?¥Ï£º?∏Ïöî.');
      return;
    }
    if (!confirm('???ÑÎ°ú??Ïπ¥ÎìúÎ•??ùÏÑ±?†Íπå??\n??Î≤??ùÏÑ±???ÑÎ°ú??Ïπ¥Îìú???òÏ†ï Î∞???†úÍ∞Ä Î∂àÍ??•Ìï©?àÎã§.\n?ÖÎ†•???ùÎÖÑ?îÏùº/?úÍ∞Ñ/?±Î≥Ñ/Ï∂úÏÉùÏßÄÎ•??§Ïãú ?ïÏù∏??Ï£ºÏÑ∏??')) return;
    var btn = document.getElementById('dpSaveBtn');
    var savingCardVisible = false;
    function restoreCardAfterSaveAttempt() {
      if (!savingCardVisible) return;
      savingCardVisible = false;
      renderMasterCard(DPStorage.current());
    }
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.65';
      btn.style.cursor = 'not-allowed';
    }
    renderProfileSavingCard(data);
    savingCardVisible = true;

    _dpVerifyLoginSession(true).then(function(ok) {
      if (!ok) {
        throw new Error('AUTH_REQUIRED');
      }
      return _dpFetchJsonWithFallback('/api/profile', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: _dpBuildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ profile: data })
      });
    }).then(function(result) {
      if (!result || !result.ok) {
        var payload = result && result.data ? result.data : null;
        var code = String((payload && payload.code) || '').trim().toUpperCase();
        var msg = String((payload && payload.message) || '').trim();
        if (result && result.status === 403 && code === 'PROFILE_LIMIT_EXCEEDED') {
          var sub = payload && payload.subscription ? payload.subscription : null;
          var tier = _dpNormalizeTier(sub && sub.tier);
          var limit = Number(sub && sub.profileLimit);
          var limitLabel = _dpFormatLimitLabel(limit);
          var tierLabel = _dpGetTierLabel(tier);
          var nextTier = _dpGetNextTier(tier);
          var guide = nextTier
            ? ('\n/points ?òÏù¥ÏßÄ?êÏÑú ' + _dpGetTierLabel(nextTier) + 'Î°??ÖÍ∑∏?àÏù¥?úÌïòÎ©???ÎßéÏ? ?ÑÎ°ú?ÑÏùÑ Ï∂îÍ??????àÏäµ?àÎã§.')
            : '';
          window.alert(msg || (tierLabel + ' ?åÎûú ?úÎèÑ(' + limitLabel + ')???ÑÎã¨?àÏäµ?àÎã§.' + guide));
          restoreCardAfterSaveAttempt();
          return null;
        }
        throw new Error(msg || '?ÑÎ°ú???Ä??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.');
      }

      var payloadOk = result.data && typeof result.data === 'object' ? result.data : {};
      var created = payloadOk.profile && typeof payloadOk.profile === 'object' ? payloadOk.profile : null;
      var scope = _dpGetProfileScope();
      var list = DPStorage.list();
      if (created && created.id) {
        var nextId = String(created.id);
        var replaced = false;
        for (var i = 0; i < list.length; i += 1) {
          if (String(list[i] && list[i].id || '') === nextId) {
            list[i] = created;
            replaced = true;
            break;
          }
        }
        if (!replaced) list.push(created);
        var currentId = String(payloadOk.currentId || nextId);
        _dpWriteProfilesToLocal(scope, list, currentId);
      }

      // ?Ä???±Í≥µ ÏßÅÌõÑ?êÎäî Î°úÏª¨ ?ÅÌÉúÎ•?Ï¶âÏãú ?åÎçîÎßÅÌï¥ Ï≤¥Í∞ê Î∞òÏùë ?çÎèÑÎ•??∞ÏÑ†?úÎã§.
      var curr = DPStorage.current();
      savingCardVisible = false;
      spawnStardust(document.getElementById('dpSaveBtn'));
      renderMasterCard(curr);
      renderProfileList();
      _dpScrollProfileIntoViewMobile();
      broadcastProfileChange(curr || created || null);
      _dpUpdateSaveBtn();

      // ?úÎ≤Ñ ?¨Ï°∞?åÎäî Î∞±Í∑∏?ºÏö¥?úÎ°ú ?òÌñâ??ÏµúÏ¢Ö ?ïÌï©?±Îßå Î≥¥Ï†ï?úÎã§.
      _dpLoadFromServer(function(loaded) {
        if (!loaded) return;
        var refreshedCurr = DPStorage.current();
        renderMasterCard(refreshedCurr || curr || created || null);
        renderProfileList();
        broadcastProfileChange(refreshedCurr || curr || created || null);
        _dpUpdateSaveBtn();
      });

      _toast('?ùÎÖÑ?îÏùº¬∑Ï∂úÏÉù?úÍ∞Ñ¬∑?±Î≥Ñ ?ïÎ≥¥???¥ÏÑ∏ ?úÎπÑ???úÍ≥µ Î™©Ï†Å???úÌï¥ ?úÎ≤Ñ???àÏ†Ñ?òÍ≤å ?Ä?•Îê©?àÎã§.', 'privacy');
      return null;
    }).catch(function(err) {
      var msg = String((err && err.message) || '?ÑÎ°ú???Ä??Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
      restoreCardAfterSaveAttempt();
      if (msg === 'AUTH_REQUIRED') {
        if (window.confirm('?îí ?ÑÎ°ú??Ïπ¥Îìú??Î°úÍ∑∏???ÑÏóêÎß??ùÏÑ±?????àÏäµ?àÎã§.\nÎ°úÍ∑∏???òÏù¥ÏßÄÎ°??¥Îèô?†Íπå??')) {
          window.location.href = '/login?next=%2F';
          return;
        }
        msg = 'Î°úÍ∑∏???ÅÌÉúÎ•??ïÏù∏?????§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??';
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

  window.dpOpenList = function() {
    var sheet = document.getElementById('dpListSheet');
    var overlay = document.getElementById('dpListOverlay');
    var scroller = sheet ? sheet.querySelector('.dp-list-scroll') : null;
    if (!sheet || !overlay) {
      console.error('[DP] list modal elements missing');
      return;
    }

    // Open modal frame first so users never see only a backdrop without a container.
    sheet.classList.add('dp-sheet--open');
    overlay.classList.add('dp-sheet--open');

    try {
      renderProfileList();
      if (scroller) scroller.scrollTop = 0;
    } catch (err) {
      console.error('[DP] openList render failed', err);
      var container = document.getElementById('dpListInner');
      if (container) {
        container.innerHTML = '<div class="dp-list-empty">?ÑÎ°ú??Î°úÎî© Ï§?Î¨∏Ï†úÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.<br><small>?†Ïãú ???§Ïãú ?úÎèÑ?¥Ï£º?∏Ïöî.</small></div>';
      }
    }

    if (sheet) {
      if (!_isMobileViewport()) {
        _bodyLocked = true;
        if (window._perf && window._perf.lockBody) window._perf.lockBody();
        else document.body.style.overflow = 'hidden';
      }
    }
  };

  window.dpCloseList = function() {
    var sheet = document.getElementById('dpListSheet');
    var overlay = document.getElementById('dpListOverlay');
    if (sheet) {
      sheet.classList.remove('dp-sheet--open');
      if (overlay) overlay.classList.remove('dp-sheet--open');
    }
    if (_bodyLocked) {
      _bodyLocked = false;
      if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
      else document.body.style.overflow = '';
    }

    /* lockBody ?îÏó¨ ?§Ì???Í∞ïÏ†ú ?ïÎ¶¨ (Î™®Î∞î??fullscreen Í≥†Ï∞© Î∞©Ï?) */
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  };

  window.dpSelectProfile = function(id) {
    var access = _dpProfileAccess || {};
    var lockedId = String(access.lockedProfileId || '').trim();
    var maxProfiles = _dpGetMaxProfiles();
    var currentIdForPolicy = (DPStorage.current() || {}).id;
    function activateSelectedProfile() {
      DPStorage.setCurrent(id);
      var p = DPStorage.current();
      renderMasterCard(p);
      broadcastProfileChange(p);
      dpCloseList();
      spawnStardust(document.getElementById('dpMasterCard'));
      _toast('??' + (p ? _esc(p.name) : '') + ' ¬∑ ?ÑÎ°ú???úÏÑ±??, 'success');
    }

    if (maxProfiles <= 1 && lockedId && id !== lockedId) {
      alert('?¥Ïö©Í∂??úÌÉù Ï¢ÖÎ£å ???ïÏ†ï???ÑÎ°ú??Ïπ¥ÎìúÎß??¨Ïö©?????àÏäµ?àÎã§.\n/points ?òÏù¥ÏßÄ?êÏÑú ?¥Ïö©Í∂åÏùÑ Í≤∞Ï†ú?òÎ©¥ ?§Ïãú ?¨Îü¨ ?ÑÎ°ú?ÑÏùÑ ?¥Ïö©?????àÏäµ?àÎã§.');
      return;
    }

    if (maxProfiles <= 1 && access.selectionRequired) {
      var selected = (DPStorage.list() || []).find(function(profile) { return profile && profile.id === id; });
      var profileName = selected && selected.name ? selected.name : '?†ÌÉù???ÑÎ°ú??;
      if (!confirm(profileName + ' ?ÑÎ°ú??Ïπ¥ÎìúÎ°??ïÏ†ï?†Íπå??\n?ïÏ†ï ??Ï∂îÍ? ?¥Ïö©Í∂?Í≤∞Ï†ú ?ÑÍπåÏßÄ ??Ïπ¥ÎìúÎß??¨Ïö©?????àÏäµ?àÎã§.')) return;
      _dpCommitSingleProfileSelection(id, function(ok) {
        if (!ok) return;
        _dpProfileAccess.selectionRequired = false;
        _dpProfileAccess.locked = true;
        _dpProfileAccess.lockedProfileId = id;
        activateSelectedProfile();
      });
      return;
    }

    if (maxProfiles <= 1 && id !== currentIdForPolicy) {
      alert('Î¨¥Î£å ?åÎûú?Ä ?ÑÎ°ú??1Í∞úÎßå ?¨Ïö©?????àÏäµ?àÎã§.\n/points ?òÏù¥ÏßÄ?êÏÑú ?¥Ïö©Í∂åÏùÑ Í≤∞Ï†ú?òÎ©¥ ?¨Îü¨ ?ÑÎ°ú?ÑÏùÑ ?¥Ïö©?????àÏäµ?àÎã§.');
      return;
    }

    activateSelectedProfile();
    return;
    /* ??Î¨¥Î£å ?åÎûú: ?§Î•∏ ?ÑÎ°ú???†ÌÉù Î∂àÍ? (?ÑÎ°ú??1Í∞??úÌïú) */
    var _curId = (DPStorage.current() || {}).id;
    if (_dpGetMaxProfiles() <= 1 && id !== _curId) {
      alert('Î¨¥Î£å ?åÎûú?Ä ?ÑÎ°ú??1Í∞úÎßå ?¨Ïö©?????àÏäµ?àÎã§.\n/points ?òÏù¥ÏßÄ?êÏÑú Íµ¨ÎèÖ???ÖÍ∑∏?àÏù¥?úÌïòÎ©??¨Îü¨ ?ÑÎ°ú?ÑÏùÑ ?¥Ïö©?????àÏäµ?àÎã§.');
      return;
    }
    DPStorage.setCurrent(id);
    var p = DPStorage.current();
    renderMasterCard(p);
    broadcastProfileChange(p);
    dpCloseList();
    spawnStardust(document.getElementById('dpMasterCard'));
    _toast('??' + (p ? _esc(p.name) : '') + ' ¬∑ ?ÑÎ°ú???úÏÑ±??, 'success');
  };

  window.dpDeleteProfile = function(id) {
    alert('?ÑÎ°ú??Ïπ¥Îìú????Î≤??ùÏÑ±?òÎ©¥ ?òÏ†ï Î∞???†úÍ∞Ä Î∂àÍ??•Ìï©?àÎã§.\n?ùÏÑ± ?ÑÏóê ?ÖÎ†• ?ïÎ≥¥Î•?Íº??§Ïãú ?ïÏù∏??Ï£ºÏÑ∏??');
  };

  /** Î≤†Îã§?????∏Î? ?òÏù¥ÏßÄÎ°??òÍ∏∏ ?ÑÏû¨ ?ÑÎ°ú??(?Ä?•Îêú ?ÑÏû¨ ?†ÌÉù ?ÑÎ°ú???êÎäî ???∞Ïù¥?? */
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
    var p = DPStorage.current();
    if (!p || !p.birth) {
      _toast('?†Ô∏è ?ÑÎ°ú?ÑÏùÑ Î®ºÏ? ?Ä?•Ìï¥ Ï£ºÏÑ∏??', 'warn');
      return;
    }

    var btn = document.querySelector('.dp-mc-guardian-btn');
    var oldText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = '???ùÏÑ± Ï§?..';
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
        throw new Error((data && data.message) || ('?ÑÎ∞î?Ä ?ùÏÑ± ?§Ìå® (' + resp.status + ')'));
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
      _toast('?™Ñ Í∞Ä?îÏñ∏ ?†ÌÖú ?¥Î?ÏßÄÍ∞Ä ?ÑÏÑ±?òÏóà?µÎãà??', 'success');
    } catch (err) {
      _toast('?†Ô∏è ?¥Ïö©?êÍ? ÎßéÏïÑ???§Ìå®?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ?¥Ï£º?∏Ïöî.', 'warn');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText || '?ñºÔ∏?Í∞Ä?îÏñ∏ ?†ÌÖú ?ùÏÑ±';
        btn.style.opacity = '';
      }
    }
  };

  window.dpLoadProfile = function() {
    var p = DPStorage.current();
    if (!p) { _toast('?†Ô∏è Î∂àÎü¨???ÑÎ°ú?ÑÏù¥ ?ÜÏäµ?àÎã§', 'warn'); return; }

    var card = document.getElementById('dpMasterCard');
    spawnStardust(card);

    /* ?¨Ï£º ???ôÍ∏∞??(?¨Ï£º ?§Ìñâ Í≤ΩÎ°ú ?¨Ï†Ñ Ï§ÄÎπ? */
    var b = p.birth, l = p.location || {};
    var nameEl = document.getElementById('nameInput');
    if (nameEl) nameEl.value = p.name || '';
    var bdEl = document.getElementById('birthDate');
    if (bdEl) {
      bdEl.value = b.year + '-' + String(b.month).padStart(2,'0') + '-' + String(b.day).padStart(2,'0');
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
      var matched = false;
      for (var i = 0; i < countrySel.options.length; i++) {
        var opt = countrySel.options[i];
        if (opt.value === l.tz && Math.abs(parseFloat(opt.getAttribute('data-long') || 0) - l.lng) < 1) {
          countrySel.selectedIndex = i; matched = true; break;
        }
      }
      if (!matched) {
        for (var j = 0; j < countrySel.options.length; j++) {
          if (countrySel.options[j].value === l.tz) { countrySel.selectedIndex = j; break; }
        }
      }
      try { countrySel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    }
    if (window.setGender) window.setGender(p.gender || 'F');
    window._gender = p.gender || 'F';
    /* ?±Î≥Ñ Î≤ÑÌäº UI ?ôÍ∏∞??*/
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

    /* ?Ä?Ä ?¥ÏÑ∏ ?†Ìòï ?†ÌÉù Î™®Îã¨ ?Ä?Ä */
    var zodiac   = _zodiacEmoji(b.year);
    var calLabel = b.calType === 'solar' ? '?ëÎ†•' : (b.calType === 'lunar_leap' ? '?åÎ†•(??' : '?åÎ†•');
    var dateStr  = calLabel + ' ' + b.year + '.' + String(b.month).padStart(2,'0') + '.' + String(b.day).padStart(2,'0')
                 + '&nbsp;¬∑&nbsp;' + String(b.hour != null ? b.hour : 12).padStart(2,'0')
                 + ':' + String(b.minute != null ? b.minute : 0).padStart(2,'0');
    var ov = document.createElement('div');
    ov.className = 'dp-fsel-overlay';
    ov.innerHTML =
      '<div class="dp-fsel-modal">'
      + '<button type="button" class="dp-fsel-close-btn" aria-label="?´Í∏∞" onclick="window._dpCloseFortuneSel && window._dpCloseFortuneSel(); return false;">??/button>'
      + '<div class="dp-fsel-profile">'
        + '<span class="dp-fsel-zodiac">' + zodiac + '</span>'
        + '<div class="dp-fsel-pname">' + _esc(p.name) + '</div>'
        + '<div class="dp-fsel-pdate">' + dateStr + '</div>'
        + (l.label ? '<div class="dp-fsel-ploc">?ìç ' + _esc(l.label) + '</div>' : '')
      + '</div>'
      + '<div class="dp-fsel-divider"></div>'
      + '<div class="dp-fsel-ask">?¥Îñ§ ?¥ÏÑ∏Î•?Î≥¥ÏãúÍ≤†Ïäµ?àÍπå?</div>'
      + '<div class="dp-fsel-btns">'
        + '<button class="dp-fsel-btn dp-fsel-btn--saju"   onclick="window._dpOpenFortuneType(\'saju\')"   style="touch-action:manipulation"><span class="dp-fsel-btn-icon">?îÆ</span><span class="dp-fsel-btn-label">?¨Ï£º ?Ä??/span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--sukuyo" onclick="window._dpOpenFortuneType(\'sukuyo\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">?í´</span><span class="dp-fsel-btn-label">?ôÏöî??/span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--ziwei" onclick="window._dpOpenFortuneType(\'ziwei\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">?åå</span><span class="dp-fsel-btn-label">?êÎ??êÏàò</span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--astro" onclick="window._dpOpenFortuneType(\'astro\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">??/span><span class="dp-fsel-btn-label">?êÏÑ±??/span></button>'
        + (function(){ var lk=_dpIsFeatureLocked('olympus-fc'); return '<button class="dp-fsel-btn dp-fsel-btn--olympus' + (lk?' dp-fsel-btn--locked':'') + '" onclick="window._dpOpenFortuneType(\'olympus\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">' + (lk?'?îí':'??) + '</span><span class="dp-fsel-btn-label">?¨Î¶º?∏Ïä§ ?†ÌÉÅ' + (lk?'<span class="dp-fsel-btn-cost"> ?îí 100ÏΩîÏù∏</span>':'') + '</span></button>'; })()
        + '<button class="dp-fsel-btn dp-fsel-btn--vedic" onclick="window._dpOpenFortuneType(\'vedic\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">?™ê</span><span class="dp-fsel-btn-label">Î≤†Îã§??/span></button>'
        + '<button class="dp-fsel-btn dp-fsel-btn--tarot"  onclick="window._dpOpenFortuneType(\'tarot\')"  style="touch-action:manipulation"><span class="dp-fsel-btn-icon">?Éè</span><span class="dp-fsel-btn-label">?ÄÎ°?/span></button>'
        + (function(){ var lk=_dpIsFeatureLocked('flower-fc'); return '<button class="dp-fsel-btn dp-fsel-btn--flower' + (lk?' dp-fsel-btn--locked':'') + '" onclick="window._dpOpenFortuneType(\'flower\')" style="touch-action:manipulation"><span class="dp-fsel-btn-icon">' + (lk?'?îí':'?å∏') + '</span><span class="dp-fsel-btn-label">?¥Î™Ö??ÍΩ? + (lk?'<span class="dp-fsel-btn-cost"> 200ÏΩîÏù∏</span>':'') + '</span></button>'; })()
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
    /* fsel ?§Î≤Ñ?àÏù¥Î•??òÏù¥?úÏïÑ????DOM?êÏÑú ?ÑÏ†Ñ ?úÍ±∞????Î™®Îã¨ ?¥Í∏∞
       (backdrop-filter stacking context ??iOS WebKit ?îÏù¥?∏Ïä§?¨Î¶∞ Î∞©Ï?) */
    var ov = window._dpFortuneSelEl || document.querySelector('.dp-fsel-overlay');
    window._dpFortuneSelEl = null;

    function _openTarget() {
      /* ÏΩîÏù∏ ?†Í∏à ?Ä??Í∏∞Îä•?Ä Í≤åÏù¥?∏Î? ?µÍ≥º?¥Ïïº ?§Ìñâ */
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
        var p = DPStorage.current();
        if (p) _injectAndRun(p, 'saju');
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
          _toast('?†Ô∏è ?¨Î¶º?∏Ïä§ ?†ÌÉÅ?Ä ?ùÎÖÑ?îÏùº¬∑?úÍ∞Ñ???àÎäî ?ÑÎ°ú?ÑÏù¥ ?ÑÏöî?©Îãà??', 'warn');
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
              _toast('?†Ô∏è ?¨Î¶º?∏Ïä§ ?†ÌÉÅ Î™®Îìà Î°úÎî©??ÏßÄ?∞ÎêòÍ≥??àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??', 'warn');
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
              _toast('?†Ô∏è ?¨Î¶º?∏Ïä§ ?†ÌÉÅ Î™®Îìà Î°úÎî©??ÏßÄ?∞ÎêòÍ≥??àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??', 'warn');
            }
          };
          _s.onerror = function() {
            _toast('?†Ô∏è ?¨Î¶º?∏Ïä§ ?†ÌÉÅ Î™®Îìà Î°úÎî©???§Ìå®?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??', 'warn');
          };
          document.head.appendChild(_s);
        } catch (_) {
          _toast('?†Ô∏è ?¨Î¶º?∏Ïä§ ?†ÌÉÅ Î™®Îìà Î°úÎî©???§Ìå®?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??', 'warn');
        }
      } else if (type === 'vedic') {
        var pVedic = _resolveVedicProfileCandidate();
        if (!pVedic || !pVedic.birth) {
          try { pVedic = _normalizeProfileForVedic(readFormData()); } catch (_) {}
        }
        if (!pVedic || !pVedic.birth) {
          _toast('?†Ô∏è Î≤†Îã§?êÏùÑ Î≥¥Î†§Î©??ùÎÖÑ?îÏùº¬∑?úÍ∞Ñ???àÎäî ?ÑÎ°ú?ÑÏùÑ ?†ÌÉù??Ï£ºÏÑ∏??', 'warn');
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
          _toast('?†Ô∏è ?¥Î™Ö??ÍΩ?Î™®Îìà???ÑÏßÅ Î°úÎî© Ï§ëÏûÖ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ?òÏÑ∏??', 'warn');
        }
      }
    }

    if (!ov) { _openTarget(); return; }

    /* CSS ?∏ÎûúÏßÄ?????úÍ±∞ ??Î™®Îã¨ ?¥Í∏∞ */
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
        _toast('?†Ô∏è ?¨Î¶º?∏Ïä§ ?†ÌÉÅ?Ä ?ùÎÖÑ?îÏùº¬∑?úÍ∞Ñ???àÎäî ?ÑÎ°ú?ÑÏùÑ Î®ºÏ? ?ÖÎ†•??Ï£ºÏÑ∏??', 'warn');
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
        _toast('?†Ô∏è Î≤†Îã§?êÏùÑ Î≥¥Î†§Î©??ùÎÖÑ?îÏùº¬∑?úÍ∞Ñ???àÎäî ?ÑÎ°ú?ÑÏùÑ Î®ºÏ? ?ÖÎ†•??Ï£ºÏÑ∏??', 'warn');
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

  /* ?∏Î??êÏÑú _injectAndRun ?∏Ï∂ú ???ÑÎ°ú???ÑÌôò ???¨Ï£º ?¨Í≥Ñ??*/
  window.dpRunWithProfile = function(profileId) {
    var list = DPStorage.list();
    var p = null;
    for (var i = 0; i < list.length; i++) { if (list[i].id === profileId) { p = list[i]; break; } }
    if (!p) return;
    DPStorage.setCurrent(profileId);
    _injectAndRun(p, 'saju');
  };

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     9. ?†Ïä§??  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
  function _toast(msg, type) {
    /* Í∏∞Ï°¥ Í∞ôÏ? ?Ä???†Ïä§???úÍ±∞ */
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

  /* ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä
     10. Ï¥àÍ∏∞??  ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä */
  function init() {
    /* Î™®Î∞î??Î∏åÎùº?∞Ï?(BFCache/?∏ÏÖò Î≥µÏõê)?êÏÑú ?úÌä∏ ?¥Î¶∞ ?ÅÌÉúÍ∞Ä ?®Îäî Î¨∏Ï†ú Î∞©Ï? */
    dpCloseList();

    _dpBindTouchScrollMark();

    _dpEnsureScopedStorageReady();

    renderMasterCard(DPStorage.current());

    /* ??Íµ¨ÎèÖ ?åÎûú Í∏∞Î∞ò ?Ä??Î≤ÑÌäº Ï¥àÍ∏∞??*/
    _dpLoadSubCache();
    _dpUpdateSaveBtn();

    // Ï¥àÍ∏∞ ÏßÑÏûÖ ?úÏóê???∏Ï¶ù ?ÅÌÉúÎ•?Î®ºÏ? ?ïÏù∏???§ÏóêÎß?Í≤∞Ï†ú/Íµ¨ÎèÖ/?ÑÎ°ú??APIÎ•??∏Ï∂ú?úÎã§.
    _dpVerifyLoginSession(false).then(function(ok) {
      if (!ok) return;

      _dpLoadFromServer(function(loaded) {
        if (loaded) {
          renderMasterCard(DPStorage.current());
          renderProfileList();
        }
      });

      _fetchSubscription();
    }).catch(function() {});

    /* ESC ?§Î°ú ?úÌä∏ ?´Í∏∞ */
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') dpCloseList();
    });

    /* ?§Î≤Ñ?àÏù¥ ?¥Î¶≠?ºÎ°ú ?úÌä∏ ?´Í∏∞ */
    var overlay = document.getElementById('dpListOverlay');
    if (overlay) overlay.addEventListener('click', dpCloseList);
    var sheet = document.getElementById('dpListSheet');
    if (sheet) {
      var sheetCloseTouchState = { active: false, x: 0, y: 0, startedAt: 0 };
      /* ?úÌä∏ ?¥Î? ?¥Î¶≠: data-action ?îÏÜå??Î≤ÑÎ∏îÎß??àÏö©, ?òÎ®∏ÏßÄ??stopPropagation */
      sheet.addEventListener('click', function(e) {
        var targetEl = _resolveEventElement(e.target);
        if (targetEl && targetEl.closest('[data-action]')) return;
        e.stopPropagation();
      });
      /* ?´Í∏∞ Î≤ÑÌäº: ?úÌä∏ ?ÑÏûÑ?ºÎ°ú Ï≤òÎ¶¨ (ÏßÅÏ†ë Î∞îÏù∏???§Ìå®¬∑Î™®Î∞î???∞Ïπò ?Ä?? */
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

    /* Î™®Î∞î?? document ?∞Ïπò ?ÑÏûÑ ??dp-sheet ?´Í∏∞ Î≤ÑÌäº (iOS Safari onclick ?†Ïã§ Î∞©Ï?) */
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
      /* Î™®Î∞î?ºÏóê??onclick ?†Ïã§?òÎäî Í≤ΩÏö∞Î•??ÄÎπÑÌï¥ ?∞Ïπò ?∏Îì§?¨Î? Ï∂îÍ??úÎã§. */
      card.addEventListener('touchstart', function(e) {
        _dpRecordTouchTapStart(cardTouchState, e);
      }, { passive: true });
      card.addEventListener('touchend', function(e) {
        if (!_dpIsStableTouchTap(cardTouchState, e, { moveX: 14, moveY: 20, recentScrollBlockMs: 260 })) return;
        var targetEl = _resolveEventElement(e.target);
        if (!targetEl) return;
        var menuBtn = targetEl.closest('.dp-mc-list-btn');
        if (menuBtn) {
          if (e.cancelable) e.preventDefault();
          dpOpenList();
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
      _dpSessionVerify.checkedAt = 0;
      _dpSessionVerify.ok = false;
      _dpSessionVerify.userId = '';
      _dpSessionVerify.signature = '';
      _dpSessionVerify.pending = null;

      _dpEnsureScopedStorageReady();
      _dpLoadSubCache();
      _dpUpdateSaveBtn();
      renderMasterCard(DPStorage.current());
      renderProfileList();

      _dpLoadFromServer(function(loaded) {
        if (!loaded) return;
        renderMasterCard(DPStorage.current());
        renderProfileList();
        _dpUpdateSaveBtn();
      });
      _fetchSubscription();
    }

    window.addEventListener('cd:auth-changed', _dpRefreshAuthScopeNow);

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        var authSyncChannel = new BroadcastChannel('code-destiny-auth-sync');
        authSyncChannel.onmessage = function() {
          _dpRefreshAuthScopeNow();
        };
      }
    } catch (e) {}

    window.addEventListener('storage', function(ev) {
      var key = ev && ev.key ? String(ev.key) : '';
      if (!key) return;
      if (key === 'fortune_auth_user' || key === 'fortune_auth_token' || key === 'fortune_auth_role') {
        _dpRefreshAuthScopeNow();
      }
    });

    /* ?¥ÏÑ∏ ?†Ìòï ?†ÌÉù Î™®Îã¨(dp-fsel) ??Î™®Î∞î???∞Ïπò ?ÑÏûÑ (onclick ?†Ïã§ Î∞©Ï?) */
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
      if (!_dpIsStableTouchTap(fselTouchState, e, { moveX: 10, moveY: 16 })) return; /* ?§ÌÅ¨Î°§Î°ú Í∞ÑÏ£º */
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

    /* Î™®Î∞î???∞Ïπò ?¥Î≤§???ÑÏûÑ ??iOS Safari onclick ?¥Î≤§???†Ïã§ Î∞©Ï? */
    var listInner = document.getElementById('dpListInner');
    if (listInner) {
      var listTouchState = { active: false, x: 0, y: 0, startedAt: 0 };
      listInner.addEventListener('touchstart', function(e) {
        _dpRecordTouchTapStart(listTouchState, e);
      }, { passive: true });
      listInner.addEventListener('touchend', function(e) {
        /* ?§ÌÅ¨Î°§Ïù¥ ?ÑÎãå ??ßå Ï≤òÎ¶¨ (?¥Îèô 10px ÎØ∏Îßå) */
        if (!_dpIsStableTouchTap(listTouchState, e, { moveX: 10, moveY: 16 })) return;
        var targetEl = _resolveEventElement(e.target);
        if (!targetEl) return;
        var delBtn = targetEl.closest('.dp-li-del');
        if (delBtn) {
          var delItem = targetEl.closest('[data-profile-id]');
          var delPid = delItem ? delItem.getAttribute('data-profile-id') : '';
          if (delPid) {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            dpDeleteProfile(delPid);
          }
          return;
        }
        var item = targetEl.closest('[data-profile-id]');
        if (item && !targetEl.closest('.dp-li-del')) {
          var pid = item.getAttribute('data-profile-id');
          if (pid) { if (e.cancelable) e.preventDefault(); dpSelectProfile(pid); }
        }
      }, { passive: false });
      listInner.addEventListener('touchcancel', function() {
        _dpResetTouchTapState(listTouchState);
      }, { passive: true });
    }

    /* ??Î≥ÄÍ≤???Ïπ¥Îìú ?êÎèô Í∞±Ïã† (?Ä???ÑÏù¥?ºÎèÑ ?•ÏÜå??Î∞òÏòÅ) */
    ['birthCountry'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function() {
        /* ?ÑÏû¨ ?ÑÎ°ú?ÑÏù¥ ?àÏùÑ ?åÎßå Î¶¨Î†å??*/
        if (DPStorage.current()) renderMasterCard(DPStorage.current());
      });
    });

    window.addEventListener('pageshow', function() {
      dpCloseList();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ?∏Î? ?∏Ï∂ú */
  window.DestinyProfileManager = {
    storage: DPStorage,
    calcTrueSolarOffset: calcTrueSolarOffset,
    resolveTimezoneOffset: resolveTimezoneOffset,
    getTimeZoneOffsetHoursForDate: getTimeZoneOffsetHoursForDate
  };

  window.generateGuardianAvatar = window.dpGenerateGuardianAvatar;

  if (typeof window._cdChooseServicePaymentMode !== 'function') {
    function _dpGetMonthlyCreditBalance() {
      try {
        var user = JSON.parse(localStorage.getItem('fortune_auth_user') || 'null') || {};
        var sub = user.profileSubscription || {};
        var candidates = [
          sub.membershipCreditBalance,
          user.membershipCreditBalance,
          user.monthlyCreditBalance,
          user.points,
          user.coinBalance,
          user.coins,
          user.balance
        ];
        for (var i = 0; i < candidates.length; i += 1) {
          var amount = Number(candidates[i]);
          if (Number.isFinite(amount) && amount >= 0) return Math.floor(amount);
        }
      } catch (_) {}
      return 0;
    }

    function _dpEnsureServicePaymentStyles() {
      if (document.getElementById('cdDirectPaymentStyles')) return;
      var style = document.createElement('style');
      style.id = 'cdDirectPaymentStyles';
      style.textContent = [
        '.cd-direct-payment-modal{position:fixed;inset:0;z-index:100260;display:none;align-items:flex-end;justify-content:center;padding:max(14px,env(safe-area-inset-top,0px)) max(14px,env(safe-area-inset-right,0px)) max(14px,env(safe-area-inset-bottom,0px)) max(14px,env(safe-area-inset-left,0px));background:radial-gradient(circle at 72% 8%,rgba(254,240,138,.20),transparent 22%),linear-gradient(180deg,rgba(2,6,23,.62),rgba(2,6,23,.82));backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow:hidden}',
        '.cd-direct-payment-modal.is-open{display:flex}',
        '.cd-direct-payment-dialog{width:min(490px,100%);max-height:min(82dvh,calc(100dvh - 28px - env(safe-area-inset-top,0px)));border:1px solid rgba(237,229,198,.38);border-radius:8px;background:linear-gradient(145deg,rgba(9,18,42,.82),rgba(24,29,62,.76));color:#fff7e6;box-shadow:0 24px 78px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.18);padding:24px 24px calc(24px + env(safe-area-inset-bottom,0px));position:relative;overflow:auto;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}',
        '.cd-direct-payment-dialog::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 18% 34%,rgba(255,255,255,.12),transparent 24%),radial-gradient(circle at 92% 84%,rgba(250,204,21,.12),transparent 20%);pointer-events:none}',
        '.cd-direct-payment-dialog::after{content:"";position:absolute;right:18px;top:18px;width:58px;height:58px;border-radius:50%;background:radial-gradient(circle at 38% 35%,#fff7d8 0 13%,#d9e1ef 14% 34%,#68799b 48%,rgba(18,31,59,.08) 64%,transparent 72%);box-shadow:0 0 24px rgba(225,234,255,.32);pointer-events:none}',
        '.cd-direct-payment-title{position:relative;z-index:1;margin:0 96px 10px 0;font-family:Georgia,"Times New Roman","Noto Serif KR",serif;font-size:23px;font-weight:800;line-height:1.35;color:#f4f0e7;text-shadow:0 2px 18px rgba(0,0,0,.62)}',
        '.cd-direct-payment-sub{position:relative;z-index:1;margin:0 84px 16px 0;color:#eee8de;font-size:14px;line-height:1.65;text-shadow:0 1px 10px rgba(0,0,0,.56)}',
        '.cd-direct-payment-note{position:relative;z-index:1;margin:0 0 14px;padding:15px 92px 15px 16px;border-radius:8px;background:linear-gradient(135deg,rgba(255,255,255,.20),rgba(255,255,255,.08));border:1px solid rgba(255,255,255,.30);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 12px 28px rgba(0,0,0,.24);color:#f8f1df;font-size:13px;line-height:1.55;backdrop-filter:blur(16px);overflow:hidden}',
        '.cd-direct-payment-note::after{content:"";position:absolute;right:18px;top:18px;width:58px;height:72px;opacity:.22;background:linear-gradient(90deg,transparent 0 20%,rgba(255,255,255,.8) 21% 22%,transparent 23%),radial-gradient(circle at 48% 43%,transparent 0 28%,rgba(255,255,255,.95) 29% 31%,transparent 32%);border:1px solid rgba(255,255,255,.38);border-radius:10px;transform:rotate(5deg);pointer-events:none}',
        '.cd-direct-payment-note strong{display:block;margin-bottom:5px;color:#fff8df;font-size:17px;line-height:1.35;text-shadow:0 1px 10px rgba(0,0,0,.52)}',
        '.cd-direct-payment-options,.cd-direct-payment-choice-grid{display:grid;grid-template-columns:1fr;gap:12px;position:relative;z-index:1}',
        '.cd-direct-payment-option{width:100%;min-height:auto;margin:0;padding:16px;border:1px solid rgba(255,255,255,.30);border-radius:8px;background:linear-gradient(145deg,rgba(255,255,255,.16),rgba(72,91,140,.24));color:inherit;text-align:left;cursor:pointer;position:relative;z-index:1;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 12px 28px rgba(0,0,0,.24);backdrop-filter:blur(16px)}',
        '.cd-direct-payment-option::before{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(135deg,rgba(255,255,255,.18),transparent 38%,rgba(255,255,255,.06));pointer-events:none}',
        '.cd-direct-payment-option[data-mode="direct"]{border-color:rgba(248,222,140,.62);background:linear-gradient(145deg,rgba(255,255,255,.18),rgba(34,45,88,.40))}',
        '.cd-direct-payment-option[data-mode="monthly"]{border-color:rgba(198,190,255,.58);background:linear-gradient(145deg,rgba(212,219,255,.18),rgba(28,43,91,.46))}',
        '.cd-direct-payment-option.is-disabled{opacity:.58;cursor:not-allowed}',
        '.cd-direct-payment-mode{position:relative;display:inline-flex;align-items:center;gap:6px;margin-bottom:10px;padding:5px 10px;border-radius:999px;background:linear-gradient(135deg,rgba(255,255,255,.25),rgba(255,255,255,.08));border:1px solid rgba(255,255,255,.30);font-size:11px;font-weight:900;color:#fff8df;box-shadow:inset 0 1px 0 rgba(255,255,255,.24)}',
        '.cd-direct-payment-option strong{position:relative;display:block;margin-bottom:7px;font-size:16px;color:#fff9e8;text-shadow:0 1px 10px rgba(0,0,0,.54)}',
        '.cd-direct-payment-option span{position:relative;display:block;font-size:12.5px;line-height:1.55;color:#f1ecdf}',
        '.cd-direct-payment-metric{position:relative;display:flex;justify-content:space-between;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.12);font-size:12px;color:#d8deef}',
        '.cd-direct-payment-metric b{color:#fff7d1}',
        '.cd-direct-payment-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;position:relative;z-index:1}',
        '.cd-direct-payment-cancel{border:1px solid rgba(255,255,255,.38);border-radius:999px;background:linear-gradient(135deg,rgba(255,255,255,.18),rgba(255,255,255,.05));color:#f6efe4;padding:10px 16px;cursor:pointer;font-weight:800}',
        '@media(min-width:561px){.cd-direct-payment-modal{align-items:center}}',
        '@media(max-width:560px){.cd-direct-payment-modal{padding:0 0 env(safe-area-inset-bottom,0px)}.cd-direct-payment-dialog{width:100%;padding:20px 16px calc(22px + env(safe-area-inset-bottom,0px));border-radius:8px 8px 0 0}.cd-direct-payment-title{margin-right:78px;font-size:21px}.cd-direct-payment-sub{margin-right:74px}.cd-direct-payment-note{padding-right:76px}.cd-direct-payment-option{min-height:0}}'
      ].join('');
      document.head.appendChild(style);
    }

    window._cdGetMonthlyCreditBalance = window._cdGetMonthlyCreditBalance || _dpGetMonthlyCreditBalance;
    window._cdChooseServicePaymentMode = function(options) {
      var opts = options || {};
      var title = String(opts.title || '?†Î£å ?úÎπÑ??).trim();
      var coinPrice = Math.max(0, Math.floor(Number(opts.coinPrice || opts.cost || 0)));
      var amountKrw = Math.max(0, Math.floor(Number(opts.amountKrw || (coinPrice * 100))));
      var requiredMonthlyCredits = Math.max(0, coinPrice * 10);
      var monthlyBalance = _dpGetMonthlyCreditBalance();
      var canUseMonthly = monthlyBalance >= requiredMonthlyCredits && requiredMonthlyCredits > 0;
      var monthlyShortage = Math.max(0, requiredMonthlyCredits - monthlyBalance);
      var escapeHtml = function(value) {
        return String(value || '').replace(/[&<>"']/g, function(ch) {
          return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] || ch;
        });
      };

      _dpEnsureServicePaymentStyles();
      return new Promise(function(resolve) {
        var modal = document.createElement('div');
        modal.className = 'cd-direct-payment-modal is-open';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML =
          '<div class="cd-direct-payment-dialog">' +
            '<h2 class="cd-direct-payment-title">?¨Îπõ Í≤∞Ï†ú Î∞©Ïãù ?†ÌÉù</h2>' +
            '<p class="cd-direct-payment-sub">??ÏΩòÌÖêÏ∏†Îßå ??Î≤?Íµ¨Îß§?òÍ≥†, Íµ¨Îß§ ?????ÑÎ°ú?ÑÏóê?úÎäî Í≥ÑÏÜç ?¥Îûå?????àÏñ¥??</p>' +
            '<div class="cd-direct-payment-note"><strong>' + escapeHtml(title) + '</strong>?®Í±¥ Í≤∞Ï†ú: ' + coinPrice.toLocaleString('ko-KR') + 'ÏΩîÏù∏ ¬∑ ' + amountKrw.toLocaleString('ko-KR') + '??br>?îÏ†ï??Í≤∞Ï†ú: ?ÑÏöî ?îÏ†ï??' + requiredMonthlyCredits.toLocaleString('ko-KR') + 'Í∞?¬∑ ?ÑÏû¨ Î≥¥Ïú† ?îÏ†ï??' + monthlyBalance.toLocaleString('ko-KR') + '</div>' +
            '<div class="cd-direct-payment-options">' +
              '<button type="button" class="cd-direct-payment-option" data-mode="direct">' +
                '<em class="cd-direct-payment-mode">PortOne V2 ¬∑ KG?¥Îãà?úÏä§</em>' +
                '<strong>?®Í±¥ Í≤∞Ï†ú</strong>' +
                '<span>??ÏΩòÌÖêÏ∏†Îßå ??Î≤?Íµ¨Îß§?òÍ≥†, Íµ¨Îß§ ?????ÑÎ°ú?ÑÏóê?úÎäî Í≥ÑÏÜç ?¥Îûå?????àÏñ¥??</span>' +
                '<span class="cd-direct-payment-metric"><span>Í≤∞Ï†ú Í∏àÏï°</span><b>' + coinPrice.toLocaleString('ko-KR') + 'ÏΩîÏù∏ ¬∑ ' + amountKrw.toLocaleString('ko-KR') + '??/b></span>' +
                '<span class="cd-direct-payment-metric"><span>?ïÏù∏ Î∞©Ïãù</span><b>?úÎ≤Ñ ?àÏ†Ñ ?ïÏù∏</b></span>' +
              '</button>' +
              '<button type="button" class="cd-direct-payment-option' + (canUseMonthly ? '' : ' is-disabled') + '" data-mode="' + (canUseMonthly ? 'monthly' : 'monthly-disabled') + '">' +
                '<em class="cd-direct-payment-mode">Î≥¥Ïú† ?îÏ†ï??/em>' +
                '<strong>?îÏ†ï??Í≤∞Ï†ú</strong>' +
                '<span>' + (canUseMonthly ? 'Î≥¥Ïú†???îÏ†ï???îÎüâ?ºÎ°ú Í≤∞Ï†ú?òÍ≥† Ï¶âÏãú ?¥Ïö©?©Îãà??' : 'Î≥¥Ïú†???îÏ†ï???îÎüâ??Î∂ÄÏ°±Ìï¥ ??Î∞©Ïãù?Ä ?¨Ïö©?????ÜÏäµ?àÎã§.') + '</span>' +
                '<span class="cd-direct-payment-metric"><span>?ÑÏöî ?îÏ†ï??/span><b>' + requiredMonthlyCredits.toLocaleString('ko-KR') + 'Í∞?/b></span>' +
                '<span class="cd-direct-payment-metric"><span>' + (canUseMonthly ? 'Í≤∞Ï†ú ???îÏó¨' : 'Î∂ÄÏ°??îÏ†ï??) + '</span><b>' + (canUseMonthly ? (monthlyBalance - requiredMonthlyCredits) : monthlyShortage).toLocaleString('ko-KR') + '</b></span>' +
              '</button>' +
            '</div>' +
            '<div class="cd-direct-payment-actions"><button type="button" class="cd-direct-payment-cancel" data-mode="cancel">Ï∑®ÏÜå</button></div>' +
          '</div>';

        function close(mode) {
          modal.classList.remove('is-open');
          if (modal.parentNode) modal.parentNode.removeChild(modal);
          resolve(mode);
        }

        modal.addEventListener('click', function(event) {
          if (event.target === modal) close('cancel');
        });
        modal.querySelectorAll('[data-mode]').forEach(function(node) {
          node.addEventListener('click', function() {
            var mode = node.getAttribute('data-mode') || 'cancel';
            if (mode === 'monthly-disabled') return;
            close(mode);
          });
        });
        document.body.appendChild(modal);
        var direct = modal.querySelector('[data-mode="direct"]');
        if (direct && typeof direct.focus === 'function') direct.focus();
      });
    };
  }

  window._cdCoinGatePerUse = function(cost, reason, cb, onCancel, options) {
    if (!options && onCancel && typeof onCancel === 'object' && typeof cb === 'function') {
      options = onCancel;
      onCancel = undefined;
    }

    var optionBag = (options && typeof options === 'object') ? options : {};
    var normalizedFeatureKey = String(optionBag.featureKey || '').trim() || 'coin-gate-per-use';
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
        window.alert('?¥Ï†Ñ Í≤∞Ï†ú ?ÅÌÉúÎ•?Î≥µÍµ¨?àÏäµ?àÎã§. ?§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
      } else {
        window.alert('?¥Ï†Ñ Í≤∞Ï†ú Ï≤òÎ¶¨ Ï§ëÏûÖ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
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

    var requestId = String(optionBag.requestId || '').trim().slice(0, 120);
    if (!requestId) {
      requestId = 'coin-gate-per-use-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }

    function runMonthlyCreditGate() {
      var consumeHeaders = { 'Content-Type': 'application/json' };
      if (token) consumeHeaders.Authorization = 'Bearer ' + token;
      window._cdCoinGatePerUseInFlight = true;
      window.__cdCoinGatePerUseLockAt = Date.now();
      var pendingLabel = String(reason || '').trim() || '?†Î£å ?úÎπÑ??;
      _dpSetPaymentPending(true, pendingLabel + ' ?îÏ†ï??Í≤∞Ï†úÎ•??ïÏù∏?òÎäî Ï§ëÏûÖ?àÎã§...');
      return _dpWaitForPaymentOverlayPaint().then(function() {
        return _dpFetchJsonWithFallback('/api/billing/coin-gate', {
          method: 'POST',
          headers: consumeHeaders,
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({
            cost: cost,
            reason: reason,
            featureKey: normalizedFeatureKey,
            paymentMode: 'MONTHLY_CREDIT',
            forceDeduct: true,
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
        if (res.status === 401 || res.status === 403) {
          if (typeof window.__cdOpenLoginRequiredModal === 'function') {
            window.__cdOpenLoginRequiredModal({
              reason: 'Î°úÍ∑∏?∏Ïù¥ ?ÑÏöî??Í∏∞Îä•?ÖÎãà??',
              redirectTo: window.location.pathname + window.location.search + window.location.hash,
            });
          }
          if (typeof onCancel === 'function') onCancel();
          return;
        }

        var rawData = (res && res.data && typeof res.data === 'object') ? res.data : {};
        var data = (rawData.data && typeof rawData.data === 'object') ? rawData.data : rawData;
        if (res.status === 402 || !res.ok || !data || data.ok === false) {
          var failMessage = String((data && data.message) || rawData.message || '?îÏ†ï?ùÏù¥ Î∂ÄÏ°±Ìï©?àÎã§. ?ÑÏöî ?îÏ†ï?ùÍ≥º Î≥¥Ïú† ?îÏ†ï?ùÏùÑ ?ïÏù∏??Ï£ºÏÑ∏??');
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
        window.alert('Í≤∞Ï†úÎ•?Ï≤òÎ¶¨?òÎäî Ï§?Î¨∏Ï†úÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§. ?†Ïãú ???§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
        if (typeof onCancel === 'function') onCancel();
      });
    }

    function runDirectCheckout() {
      if (typeof window._cdRunDirectKrwCheckout !== 'function') {
        window.alert('?®Í±¥ Í≤∞Ï†ú Î™®Îìà??Ï∞æÏùÑ ???ÜÏäµ?àÎã§. ?òÏù¥ÏßÄÎ•??àÎ°úÍ≥†Ïπ®?????§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??');
        if (typeof onCancel === 'function') onCancel();
        return Promise.resolve();
      }
      window._cdCoinGatePerUseInFlight = true;
      window.__cdCoinGatePerUseLockAt = Date.now();
      _dpSetPaymentPending(true, String(reason || '?†Î£å ?úÎπÑ??) + ' ?®Í±¥ Í≤∞Ï†úÎ•?Ï§ÄÎπÑÌïò??Ï§ëÏûÖ?àÎã§...');
      return window._cdRunDirectKrwCheckout({
        coinPrice: cost,
        cost: cost,
        title: reason,
        reason: reason,
        featureKey: normalizedFeatureKey,
        requestId: requestId,
        checkoutPayload: {
          reportType: optionBag.reportType,
          serviceKey: optionBag.serviceKey,
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
        window.alert(String(error && error.message || '?®Í±¥ Í≤∞Ï†úÎ•??ÑÎ£å?òÏ? Î™ªÌñà?µÎãà?? Í≤∞Ï†ú ?òÎã®???ïÏù∏?????§Ïãú ?úÎèÑ??Ï£ºÏÑ∏??'));
        if (typeof onCancel === 'function') onCancel(error);
      });
    }

    if (typeof window._cdChooseServicePaymentMode === 'function') {
      return window._cdChooseServicePaymentMode({
        title: reason,
        coinPrice: cost,
        cost: cost
      }).then(function(choice) {
        if (choice === 'direct') return runDirectCheckout();
        if (choice === 'monthly') return runMonthlyCreditGate();
        if (typeof onCancel === 'function') onCancel();
      });
    }

    return runMonthlyCreditGate();
  };

})();
