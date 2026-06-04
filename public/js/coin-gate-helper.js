(() => {
  'use strict';

  if (typeof globalThis !== 'undefined' && globalThis.__cdCoinGateHelperInitialized) {
    return;
  }

  const LOVE_BOOK_FEATURE_KEY = 'saju_love_book_pdf';
  const COIN_GATE_TIMEOUT_MS = 25000;

  function normalizeApiBase(raw) {
    var value = String(raw || '').trim();
    if (!value) return '';
    return value.replace(/\/+$/, '');
  }

  function buildApiCandidates(path) {
    var pathname = String(path || '').trim();
    if (!pathname) pathname = '/';
    if (pathname.charAt(0) !== '/') pathname = '/' + pathname;

    var seen = {};
    var list = [];
    function push(url) {
      var normalized = String(url || '').trim();
      if (!normalized || seen[normalized]) return;
      seen[normalized] = true;
      list.push(normalized);
    }

    push(pathname);

    var baseCandidates = [];
    try { baseCandidates.push((typeof window !== 'undefined' && window.location && window.location.origin) || ''); } catch (_) {}
    try { baseCandidates.push((typeof window !== 'undefined' && window.CODE_DESTINY_API_BASE_URL) || ''); } catch (_) {}
    try { baseCandidates.push((typeof window !== 'undefined' && window.__CD_API_BASE_URL) || ''); } catch (_) {}
    try { baseCandidates.push((typeof window !== 'undefined' && window.__API_BASE_URL) || ''); } catch (_) {}
    try { baseCandidates.push((typeof window !== 'undefined' && window.__AUTH_API_BASE_URL) || ''); } catch (_) {}
    baseCandidates.push('https://code-destiny.com');

    for (var i = 0; i < baseCandidates.length; i += 1) {
      var base = normalizeApiBase(baseCandidates[i]);
      if (!base) continue;
      push(base + pathname);
    }

    return list;
  }

  function readPremiumAccessToken() {
    var token = '';
    try { token = String(globalThis.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (!token) {
      try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    }
    if (!token) {
      try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    }
    return token;
  }

  function readAuthToken() {
    var token = '';
    try { token = String(localStorage.getItem('fortune_auth_token') || '').trim(); } catch (_) { token = ''; }
    return token;
  }

  function shouldRetryRequest(status, error) {
    if (Number(status || 0) >= 500) return true;
    if (status === 408 || status === 425 || status === 429) return true;
    if (error && error.name === 'AbortError') return true;
    if (error instanceof TypeError && !status) return true;
    var message = String((error && error.message) || '').toLowerCase();
    if (!status && (message.indexOf('network') !== -1 || message.indexOf('fetch') !== -1 || message.indexOf('timeout') !== -1)) return true;
    return false;
  }

  async function parseJsonSafely(response) {
    var text = '';
    try {
      text = await response.text();
    } catch (_) {
      text = '';
    }
    if (!text) return {};
    try {
      var parsed = JSON.parse(text);
      return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  async function requestJson(path, init) {
    if (typeof window !== 'undefined' && typeof window.fetchJsonWithAuth === 'function') {
      return window.fetchJsonWithAuth(path, init || {});
    }

    var method = String((init && init.method) || 'POST').toUpperCase();
    var endpoints = buildApiCandidates(path);
    var lastStatus = 0;
    var lastPayload = {};
    var lastError = null;

    for (var i = 0; i < endpoints.length; i += 1) {
      var endpoint = endpoints[i];
      var headers = Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json' }, (init && init.headers) || {});

      var premiumToken = readPremiumAccessToken();
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;

      var authToken = readAuthToken();
      if (authToken && !headers.Authorization) headers.Authorization = 'Bearer ' + authToken;

      var controller = (typeof AbortController === 'function') ? new AbortController() : null;
      var timeoutId = null;
      if (controller) {
        timeoutId = setTimeout(function () {
          try { controller.abort(); } catch (_) {}
        }, COIN_GATE_TIMEOUT_MS);
      }

      try {
        var response = await fetch(endpoint, {
          method: method,
          headers: headers,
          body: init && init.body,
          credentials: 'include',
          cache: 'no-store',
          signal: controller ? controller.signal : undefined,
        });

        var payload = await parseJsonSafely(response);
        var status = Number(response.status || 0);
        lastStatus = status;
        lastPayload = payload;

        if (response.ok && payload && payload.ok !== false) {
          if (timeoutId) clearTimeout(timeoutId);
          return {
            ok: true,
            status: status,
            payload: payload,
          };
        }

        if (!shouldRetryRequest(status, null)) {
          if (timeoutId) clearTimeout(timeoutId);
          return {
            ok: false,
            status: status,
            payload: payload || {},
          };
        }
      } catch (error) {
        lastError = error;
        if (!shouldRetryRequest(0, error)) {
          if (timeoutId) clearTimeout(timeoutId);
          return {
            ok: false,
            status: 0,
            payload: {
              ok: false,
              code: (error && error.name === 'AbortError') ? 'TIMEOUT' : 'NETWORK_ERROR',
              message: String((error && error.message) || '요청 중 네트워크 오류가 발생했습니다.'),
            },
          };
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    return {
      ok: false,
      status: Number(lastStatus || 0),
      payload: (lastPayload && Object.keys(lastPayload).length)
        ? lastPayload
        : {
            ok: false,
            code: (lastError && lastError.name === 'AbortError') ? 'TIMEOUT' : 'REQUEST_FAILED',
            message: String((lastError && lastError.message) || '요청 처리에 실패했습니다.'),
          },
    };
  }

  function persistPremiumAccessToken(token) {
    var value = String(token || '').trim();
    if (!value) return;
    try { globalThis.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function normalizeReportSessionId(reportId, payload) {
    return String(
      (payload && payload.sessionId)
      || (payload && payload.reportSessionId)
      || (payload && payload.accessGrant && payload.accessGrant.sessionId)
      || (reportId ? ('love-book:' + reportId) : '')
    ).trim();
  }

  function normalizeAccessGrant(data, payload) {
    var reportId = String((payload && payload.reportId) || (data && data.reportId) || '').trim();
    var accessGrant = data && data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    var purchaseId = String(
      (accessGrant && accessGrant.purchaseId)
      || (data && data.purchaseId)
      || (data && data.transactionId)
      || (((data && data.consume) || {}).transactionId)
      || ''
    ).trim();
    var sessionId = String((accessGrant && accessGrant.sessionId) || normalizeReportSessionId(reportId, payload)).trim();
    var requestId = String(
      (accessGrant && accessGrant.requestId)
      || (data && data.requestId)
      || (((data && data.consume) || {}).requestId)
      || (payload && payload.requestId)
      || ''
    ).trim();

    if (!reportId || !purchaseId) return null;

    return {
      ok: true,
      featureKey: String((payload && payload.featureKey) || (accessGrant && accessGrant.featureKey) || LOVE_BOOK_FEATURE_KEY),
      sessionId: sessionId || undefined,
      purchaseId: purchaseId || undefined,
      requestId: requestId || undefined,
      reportId: reportId,
      paidAt: String((accessGrant && accessGrant.paidAt) || (data && data.paidAt) || new Date().toISOString()),
    };
  }

  function buildHelper() {
    return {
      async purchaseFeature(input) {
        var payload = input && typeof input.payload === 'object' ? input.payload : {};
        var requestedFeatureKey = String((input && input.featureKey) || payload.featureKey || LOVE_BOOK_FEATURE_KEY).trim() || LOVE_BOOK_FEATURE_KEY;
        var reportId = String(payload.reportId || '').trim();
        var sessionId = normalizeReportSessionId(reportId, payload);
        var requestBody = {
          categoryKey: 'premium-report',
          featureKey: requestedFeatureKey,
          subFeatureKey: String(payload.subFeatureKey || '').trim() || undefined,
          reason: String(payload.reason || '').trim(),
          requestId: String(payload.requestId || '').trim() || undefined,
          forceDeduct: payload.forceDeduct !== false,
          mode: String(payload.mode || 'solo').trim(),
          reportId: reportId || undefined,
          sessionId: sessionId || undefined,
          reportSessionId: sessionId || undefined,
        };
        var requestedCoinPrice = Math.max(0, Math.floor(Number(payload.coinPrice || payload.cost || payload.priceCoin || 0)));
        if (!(requestedCoinPrice > 0) && requestBody.featureKey) {
          var featureResponse = await requestJson('/api/billing/features?featureKey=' + encodeURIComponent(requestBody.featureKey), {
            method: 'GET',
          });
          if (featureResponse && featureResponse.ok) {
            var featurePayload = (featureResponse.payload && featureResponse.payload.data) || featureResponse.payload || {};
            var pricing = featurePayload && featurePayload.pricing ? featurePayload.pricing : featurePayload;
            requestedCoinPrice = Math.max(0, Math.floor(Number(pricing && (pricing.coinPrice || pricing.cost) || 0)));
            if (!requestBody.reason && pricing && pricing.reason) requestBody.reason = String(pricing.reason || '').trim();
          }
        }

        if (typeof globalThis._cdResolvePaidContentAccess === 'function') {
          var passAccess = await globalThis._cdResolvePaidContentAccess({
            categoryKey: requestBody.categoryKey,
            featureKey: requestBody.featureKey,
            subFeatureKey: requestBody.subFeatureKey,
            title: requestBody.reason || '프리미엄 PDF',
            reason: requestBody.reason || '프리미엄 PDF',
            coinPrice: requestedCoinPrice,
            cost: requestedCoinPrice,
            requestId: requestBody.requestId,
            reportId: requestBody.reportId,
            sessionId: requestBody.sessionId,
            reportSessionId: requestBody.reportSessionId,
            actionType: 'pdf'
          });
          if (passAccess && (passAccess.status === 'already_unlocked' || passAccess.status === 'pass_applied')) {
            var passData = (passAccess && (passAccess.payload || passAccess.rawPayload)) || {};
            var passPayload = passData && passData.data && typeof passData.data === 'object' ? passData.data : passData;
            var premiumAccessToken = String((passPayload && passPayload.premiumAccessToken) || (passData && passData.premiumAccessToken) || '').trim();
            if (premiumAccessToken) persistPremiumAccessToken(premiumAccessToken);
            var accessGrant = normalizeAccessGrant(passPayload, requestBody);
            return {
              ok: !!accessGrant,
              status: 200,
              message: '',
              featureKey: requestedFeatureKey,
              accessGrant: accessGrant,
              purchaseId: String((accessGrant && accessGrant.purchaseId) || '').trim(),
              premiumAccessToken: premiumAccessToken || null,
              raw: passData || {},
            };
          }
          if (passAccess && passAccess.status === 'error') {
            return {
              ok: false,
              status: Number((passAccess.raw && passAccess.raw.status) || 500),
              message: String(passAccess.message || '이용권 확인에 실패했습니다.'),
              featureKey: requestedFeatureKey,
              accessGrant: null,
              purchaseId: '',
              premiumAccessToken: null,
              raw: passAccess.raw || {},
            };
          }
        }

        if (typeof globalThis._cdOpenPaidServiceGate === 'function') {
          var gatePayload = await new Promise(function(resolve, reject) {
            var settled = false;
            function finish(payload) {
              if (settled) return;
              settled = true;
              resolve(payload && typeof payload === 'object' ? payload : {});
            }
            function fail(error) {
              if (settled) return;
              settled = true;
              reject(error || { status: 402, message: '결제가 취소되었습니다.' });
            }
            var gatePromise;
            try {
              gatePromise = globalThis._cdOpenPaidServiceGate({
                categoryKey: requestBody.categoryKey,
                featureKey: requestBody.featureKey,
                subFeatureKey: requestBody.subFeatureKey,
                title: requestBody.reason || '프리미엄 PDF',
                reason: requestBody.reason || '프리미엄 PDF',
                coinPrice: requestedCoinPrice,
                cost: requestedCoinPrice,
                requestId: requestBody.requestId,
                reportId: requestBody.reportId,
                sessionId: requestBody.sessionId,
                reportSessionId: requestBody.reportSessionId,
                actionType: 'pdf',
                onGranted: function(transactionId, grantedPayload) {
                  var nextPayload = grantedPayload && typeof grantedPayload === 'object' ? grantedPayload : {};
                  if (!nextPayload.transactionId && transactionId) nextPayload.transactionId = String(transactionId);
                  finish(nextPayload);
                },
                onPassApplied: function(access) {
                  finish((access && (access.payload || access.rawPayload)) || access || {});
                },
                onCancel: fail
              });
            } catch (error) {
              fail(error);
              return;
            }
            if (gatePromise && typeof gatePromise.then === 'function') {
              gatePromise.then(function(payload) {
                if (payload === null || payload === undefined) fail({ status: 402, message: '결제가 취소되었습니다.' });
                else finish(payload);
              }).catch(fail);
            }
          });
          var gateData = gatePayload && gatePayload.data && typeof gatePayload.data === 'object' ? gatePayload.data : gatePayload;
          var gateToken = String((gateData && gateData.premiumAccessToken) || (gatePayload && gatePayload.premiumAccessToken) || '').trim();
          if (gateToken) persistPremiumAccessToken(gateToken);
          var gateAccessGrant = normalizeAccessGrant(gateData, requestBody);
          return {
            ok: !!gateAccessGrant,
            status: 200,
            message: '',
            featureKey: requestedFeatureKey,
            accessGrant: gateAccessGrant,
            purchaseId: String((gateAccessGrant && gateAccessGrant.purchaseId) || '').trim(),
            premiumAccessToken: gateToken || null,
            raw: gatePayload || {},
          };
        }

        return {
          ok: false,
          status: 503,
          message: '결제 게이트를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.',
          featureKey: requestedFeatureKey,
          accessGrant: null,
          purchaseId: '',
          premiumAccessToken: null,
          raw: {},
        };
      },

      async restorePurchase(input) {
        var reportId = String((input && input.reportId) || '').trim();
        if (!reportId) {
          return { ok: false, status: 400, message: 'reportId is required', accessGrant: null };
        }
        var response = await requestJson('/api/love-secret/access?reportId=' + encodeURIComponent(reportId), {
          method: 'GET',
        });
        var data = (response.payload && response.payload.data) || response.payload || {};
        return {
          ok: !!response.ok,
          status: Number(response.status || 0),
          message: String((response.payload && response.payload.message) || ''),
          accessGrant: (data && data.accessGrant) || null,
          raw: response.payload || {},
        };
      },

      async validateAccess(input) {
        return this.restorePurchase(input || {});
      },
    };
  }

  var singleton = globalThis.__cdCoinGateHelperSingleton || buildHelper();
  globalThis.__cdCoinGateHelperSingleton = singleton;
  globalThis.__cdCoinGateHelper = singleton;

  if (typeof globalThis !== 'undefined') {
    globalThis.__cdCoinGateHelperInitialized = true;
  }
})();
