(function () {
  'use strict';

  if (typeof window === 'undefined' || window.CDPremiumPdfJobClient) return;

  function readToken() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (!token) {
      try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    }
    if (!token) {
      try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    }
    return token;
  }

  function authJson(path, body, method) {
    if (typeof window.fetchJsonWithAuth === 'function') {
      return window.fetchJsonWithAuth(path, {
        method: method || 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
    }
    var headers = { 'Content-Type': 'application/json' };
    var token = readToken();
    if (token) headers['x-premium-access-token'] = token;
    return fetch(path, {
      method: method || 'POST',
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    }).then(function (res) {
      return res.json().catch(function () { return { ok: false, code: 'JSON_PARSE_FAILED', message: 'JSON parse failed' }; });
    });
  }

  function readState(stateKey) {
    if (!stateKey) return null;
    try {
      var raw = localStorage.getItem(stateKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeState(stateKey, state) {
    if (!stateKey || !state) return;
    try {
      localStorage.setItem(stateKey, JSON.stringify(state));
    } catch (_) {}
  }

  function clearState(stateKey) {
    if (!stateKey) return;
    try { localStorage.removeItem(stateKey); } catch (_) {}
  }

  function normalizeState(prev, payload) {
    var source = payload && payload.premiumPdfJob ? payload.premiumPdfJob : payload || {};
    var session = payload && payload.premiumPdfSession ? payload.premiumPdfSession : payload || {};
    return {
      jobId: String(source.jobId || (prev && prev.jobId) || '').trim(),
      reportSessionId: String(session.reportSessionId || source.reportSessionId || (prev && prev.reportSessionId) || '').trim(),
      status: String(source.status || (prev && prev.status) || '').trim(),
      updatedAt: Date.now(),
    };
  }

  async function start(options) {
    var stateKey = String(options && options.stateKey || '').trim();
    var body = {
      reportType: options && options.reportType,
      featureType: options && options.featureType,
      idempotencyKey: options && options.idempotencyKey,
      requestBody: options && options.requestBody ? options.requestBody : {},
    };
    var payload = await authJson('/api/premium-report/job/start', body, 'POST');
    var merged = normalizeState(readState(stateKey), payload);
    if (merged.jobId || merged.reportSessionId) writeState(stateKey, merged);
    return { ok: !!(payload && payload.ok), payload: payload, state: merged };
  }

  async function run(options) {
    var stateKey = String(options && options.stateKey || '').trim();
    var prev = readState(stateKey) || {};
    var body = {
      jobId: String((options && options.jobId) || prev.jobId || '').trim(),
      reportSessionId: String((options && options.reportSessionId) || prev.reportSessionId || '').trim(),
      startChapter: Number(options && options.startChapter || 1),
      endChapter: Number(options && options.endChapter || 1),
      stopOnFailure: options && options.stopOnFailure === false ? false : true,
    };
    var payload = await authJson('/api/premium-report/job/run', body, 'POST');
    var merged = normalizeState(prev, payload);
    if (merged.jobId || merged.reportSessionId) writeState(stateKey, merged);
    return { ok: !!(payload && payload.ok), payload: payload, state: merged };
  }

  async function status(options) {
    var stateKey = String(options && options.stateKey || '').trim();
    var prev = readState(stateKey) || {};
    var jobId = String((options && options.jobId) || prev.jobId || '').trim();
    var reportSessionId = String((options && options.reportSessionId) || prev.reportSessionId || '').trim();
    if (!jobId && !reportSessionId) {
      return { ok: false, payload: { ok: false, code: 'PREMIUM_PDF_JOB_REQUIRED' }, state: prev };
    }
    var query = jobId
      ? ('jobId=' + encodeURIComponent(jobId))
      : ('reportSessionId=' + encodeURIComponent(reportSessionId));
    var payload = await authJson('/api/premium-report/job/status?' + query, null, 'GET');
    var merged = normalizeState(prev, payload);
    if (merged.jobId || merged.reportSessionId) writeState(stateKey, merged);
    return { ok: !!(payload && payload.ok), payload: payload, state: merged };
  }

  async function resume(options) {
    var result = await status(options || {});
    if (!result.ok && result.payload && (result.payload.code === 'PREMIUM_PDF_JOB_NOT_FOUND' || result.payload.code === 'PREMIUM_REPORT_SESSION_NOT_FOUND')) {
      clearState(options && options.stateKey);
    }
    return result;
  }

  window.CDPremiumPdfJobClient = {
    readState: readState,
    writeState: writeState,
    clearState: clearState,
    start: start,
    run: run,
    status: status,
    resume: resume,
  };
})();
