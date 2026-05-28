const LOVE_BOOK_FEATURE_KEY = 'saju_love_book_pdf';

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

async function requestJson(path, init) {
  if (typeof window !== 'undefined' && typeof window.fetchJsonWithAuth === 'function') {
    return window.fetchJsonWithAuth(path, init || {});
  }

  var headers = Object.assign({ 'Content-Type': 'application/json' }, (init && init.headers) || {});
  var token = readPremiumAccessToken();
  if (token) headers['x-premium-access-token'] = token;

  var response = await fetch(path, {
    method: (init && init.method) || 'POST',
    headers: headers,
    body: init && init.body,
    credentials: 'include',
  });

  var payload = {};
  try {
    payload = await response.json();
  } catch (_) {
    payload = {};
  }

  return {
    ok: !!response.ok && payload && payload.ok !== false,
    status: Number(response.status || 0),
    payload: payload,
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
    payload?.sessionId
    || payload?.reportSessionId
    || payload?.accessGrant?.sessionId
    || (reportId ? ('love-book:' + reportId) : '')
  ).trim();
}

function normalizeAccessGrant(data, payload) {
  var reportId = String(payload?.reportId || data?.reportId || '').trim();
  var accessGrant = data?.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
  var purchaseId = String(
    accessGrant?.purchaseId
    || data?.purchaseId
    || data?.transactionId
    || (((data?.consume || {}).transactionId) || '')
  ).trim();
  var sessionId = String(accessGrant?.sessionId || normalizeReportSessionId(reportId, payload)).trim();
  var requestId = String(
    accessGrant?.requestId
    || data?.requestId
    || (((data?.consume || {}).requestId) || '')
    || payload?.requestId
    || ''
  ).trim();

  if (!reportId || !purchaseId) return null;

  return {
    ok: true,
    featureKey: LOVE_BOOK_FEATURE_KEY,
    sessionId: sessionId || undefined,
    purchaseId: purchaseId || undefined,
    requestId: requestId || undefined,
    reportId: reportId,
    paidAt: String(accessGrant?.paidAt || data?.paidAt || new Date().toISOString()),
  };
}

function buildHelper() {
  return {
    async purchaseFeature(input) {
      var payload = input && typeof input.payload === 'object' ? input.payload : {};
      var reportId = String(payload.reportId || '').trim();
      var sessionId = normalizeReportSessionId(reportId, payload);
      var requestBody = {
        categoryKey: 'premium-report',
        featureKey: LOVE_BOOK_FEATURE_KEY,
        subFeatureKey: String(payload.subFeatureKey || '').trim() || undefined,
        reason: String(payload.reason || '').trim(),
        requestId: String(payload.requestId || '').trim() || undefined,
        forceDeduct: payload.forceDeduct !== false,
        mode: String(payload.mode || 'solo').trim(),
        reportId: reportId || undefined,
        sessionId: sessionId || undefined,
        reportSessionId: sessionId || undefined,
      };

      var response = await requestJson('/api/billing/coin-gate', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      var data = (response.payload && response.payload.data) || {};
      var premiumAccessToken = String(data.premiumAccessToken || response.payload?.premiumAccessToken || '').trim();
      if (premiumAccessToken) persistPremiumAccessToken(premiumAccessToken);
      var accessGrant = normalizeAccessGrant(data, requestBody);

      return {
        ok: !!response.ok && !!accessGrant,
        status: Number(response.status || 0),
        message: String(response.payload?.message || ''),
        featureKey: LOVE_BOOK_FEATURE_KEY,
        accessGrant: accessGrant,
        purchaseId: String(accessGrant?.purchaseId || '').trim(),
        premiumAccessToken: premiumAccessToken || null,
        raw: response.payload || {},
      };
    },

    async restorePurchase(input) {
      var reportId = String(input?.reportId || '').trim();
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
        message: String(response.payload?.message || ''),
        accessGrant: data?.accessGrant || null,
        raw: response.payload || {},
      };
    },

    async validateAccess(input) {
      return this.restorePurchase(input || {});
    },
  };
}

const singleton = globalThis.__cdCoinGateHelperSingleton || buildHelper();
globalThis.__cdCoinGateHelperSingleton = singleton;

const FEATURE_KEY_SAJU_LOVE_BOOK_PDF = LOVE_BOOK_FEATURE_KEY;
const coinGateHelper = singleton;

async function getCoinGateHelper() {
  if (!coinGateHelper) {
    throw new Error('COIN_GATE_HELPER_MISSING');
  }
  return coinGateHelper;
}

// ESM export for dynamic import compatibility
if (typeof module !== 'undefined' && typeof module.exports === 'undefined') {
  // Browser environment - expose as module for import()
  globalThis.__cdCoinGateHelperModule = {
    coinGateHelper: coinGateHelper,
    FEATURE_KEY_SAJU_LOVE_BOOK_PDF: FEATURE_KEY_SAJU_LOVE_BOOK_PDF,
    getCoinGateHelper: getCoinGateHelper,
  };
}