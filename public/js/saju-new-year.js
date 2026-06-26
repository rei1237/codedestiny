/**
 * Saju New Year AI consultation flow.
 * Uses the existing saju screen profile/engine snapshot, then calls the worker-native LLM consultation route.
 */
(function () {
  'use strict';
  if (window.__cdSajuNewYearFlowLoaded) return;
  window.__cdSajuNewYearFlowLoaded = true;

  var SERVICE_KEY = 'saju-new-year';
  var API_FEATURE_KEY = 'premium_pdf_saju_new_year';
  var BILLING_FEATURE_KEY = API_FEATURE_KEY;
  var REASON = '사주 신년운세 AI 상담';
  var AI_CONSULTATION_API = '/api/saju-new-year/ai-consultation';
  var VERIFY_ACCESS_API = '/api/saju-new-year/verify-access';
  var CREATE_JOB_API = '/api/saju-new-year/create-job';
  var GENERATE_MOCK_API = '/api/saju-new-year/generate-mock';
  var STATUS_API = '/api/saju-new-year/status';
  var RESULT_API = '/api/saju-new-year/result';
  var JOB_STORAGE_KEY = 'currentNewYearPdfJobId';
  var TOTAL_CHAPTERS = 10;
  var COIN_COST = 300;
  var COVER_IMAGE = '/fuctionassets/신년운세.webp';
  var DEFAULT_QUESTION = '선택한 해에 제 직업운과 수입 흐름은 어떻게 될까요?';
  var CATEGORY_QUESTIONS = {
    '종합운': '올해 전반적인 신년운세와 가장 중요한 선택 기준을 알려주세요.',
    '연애/재회': '올해 연애운과 재회 가능성, 관계에서 조심해야 할 흐름이 궁금해요.',
    '직업/이직': '올해 직업운, 이직운, 커리어 전환 타이밍을 봐주세요.',
    '재물/수입': '올해 재물운과 수입 흐름, 지출에서 조심할 시기를 알려주세요.',
    '건강/멘탈': '올해 건강운과 멘탈 흐름에서 조심해야 할 부분을 봐주세요.',
    '가족/인간관계': '올해 가족과 인간관계에서 좋은 흐름과 조심할 흐름을 알려주세요.',
    '월별 흐름': '월별로 좋은 시기와 피해야 할 시기를 정리해 주세요.',
    '조심해야 할 시기': '신년운세 기준으로 올해 특히 조심해야 할 시기와 이유를 알려주세요.',
    '올해의 행동 전략': '올해 제 명식과 세운 흐름에 맞는 현실적인 행동 전략을 알려주세요.'
  };

  var _generating = false;
  var _chapters = [];
  var _resultPayload = null;
  var _activeChapter = 1;
  var _progressTimer = null;
  var _pendingGeneration = null;
  var _lastAccessGrant = null;
  var _lastPremiumToken = '';
  var _selectedCategory = '종합운';
  var _billingSnapshot = {
    cost: COIN_COST,
    balance: null,
    balanceKnown: false,
    authenticated: null,
    pricingKnown: false,
    source: 'fallback'
  };
  var _billingSnapshotPromise = null;

  var LOADING_MESSAGES = [
    '명식과 올해의 세운을 읽고 있어요.',
    '대운과 세운의 결을 맞춰보고 있어요.',
    '질문에 맞는 올해의 흐름을 정리하고 있어요.'
  ];

  var STAGE_TITLES = {
    lookup: '상담 질문을 확인하는 중입니다',
    billing: '결제 권한을 확인하는 중입니다',
    calculate: '사주 원국을 계산하는 중입니다',
    write: '질문에 맞는 올해의 흐름을 정리하는 중입니다',
    archive: '상담 결과를 정리하는 중입니다'
  };

  var TOC_LABELS = ['총운', '커리어', '재물', '인간관계', '연애·가족', '건강·심리', '분기별 결정', '위험 관리', '12개월 지도', '최종 로드맵'];

  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }
  function _esc(value) {
    return _clean(value).replace(/[&<>"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] || ch;
    });
  }
  function _pad2(value) { return String(Number(value || 0)).padStart(2, '0'); }

  function _coinNumber(value) {
    var number = Number(value);
    if (!Number.isFinite(number) || number < 0) return null;
    return Math.floor(number);
  }

  function _formatCoins(value, fallback) {
    var number = _coinNumber(value);
    if (number === null) return fallback || '결제창 확인';
    var won = Math.max(0, Math.floor(number)) * 100;
    try { return won.toLocaleString('ko-KR') + '원'; } catch (_) { return String(won) + '원'; }
  }

  function _firstCoinValue(payload, keys) {
    var roots = [];
    function add(value) {
      if (value && typeof value === 'object' && roots.indexOf(value) < 0) roots.push(value);
    }
    add(payload);
    add(payload && payload.data);
    add(payload && payload.pricing);
    add(payload && payload.paymentDecision);
    add(payload && payload.balance);
    add(payload && payload.user);
    add(payload && payload.data && payload.data.pricing);
    add(payload && payload.data && payload.data.paymentDecision);
    add(payload && payload.data && payload.data.balance);
    add(payload && payload.data && payload.data.user);
    for (var i = 0; i < roots.length; i += 1) {
      for (var j = 0; j < keys.length; j += 1) {
        var number = _coinNumber(roots[i][keys[j]]);
        if (number !== null) return number;
      }
    }
    return null;
  }

  function _mergeBillingSnapshot(payload, source) {
    var next = Object.assign({}, _billingSnapshot);
    var cost = _firstCoinValue(payload, ['finalCoinPrice', 'coinPrice', 'requiredCoins', 'coinCost', 'cost', 'priceCoin', 'price']);
    var balance = _firstCoinValue(payload, ['balance', 'coinBalance', 'coins', 'currentCoins', 'remainingCoins', 'points', 'point']);
    var data = payload && payload.data && typeof payload.data === 'object' ? payload.data : {};
    if (cost !== null && cost > 0) {
      next.cost = cost;
      next.pricingKnown = true;
    }
    if (balance !== null) {
      next.balance = balance;
      next.balanceKnown = true;
    }
    if (payload && payload.authenticated === false || data && data.authenticated === false) next.authenticated = false;
    if (payload && payload.authenticated === true || data && data.authenticated === true) next.authenticated = true;
    next.source = source || next.source || 'fallback';
    _billingSnapshot = next;
    _applyBillingSnapshot(next);
    return next;
  }

  function _applyBillingSnapshot(snapshot) {
    var state = snapshot || _billingSnapshot || {};
    var costLabel = _formatCoins(state.cost || COIN_COST, '결제창 확인');
    var coinLabel = _qs('nyCoinLabel');
    var tileBadge = _qs('nyTileCoinBadge');
    var generateCoin = _qs('nyGenerateCoin');
    var generateBtn = _qs('nyGenerateBtn');
    if (coinLabel) coinLabel.innerHTML = '<strong>' + _esc(costLabel) + '</strong> · 결제/이용권 확인 후 AI 상담 생성';
    if (tileBadge) tileBadge.textContent = '🪙 ' + costLabel + ' 기준';
    if (generateCoin) generateCoin.textContent = '🪙 ' + costLabel;
    if (generateBtn) generateBtn.setAttribute('data-coin-cost', String(_coinNumber(state.cost) || COIN_COST));
  }

  async function _fetchBillingJson(url) {
    var headers = _buildAuthHeaders();
    var response = await fetch(url, { method: 'GET', credentials: 'include', headers: headers, cache: 'no-store' });
    var body = await response.json().catch(function () { return {}; });
    body._httpStatus = response.status;
    return body;
  }

  function _refreshNewYearBillingSnapshot() {
    if (_billingSnapshotPromise) return _billingSnapshotPromise;
    _applyBillingSnapshot(_billingSnapshot);
    _billingSnapshotPromise = (async function () {
      try {
        var pricingUrl = '/api/billing/features?categoryKey=premium-report&featureKey=' + encodeURIComponent(BILLING_FEATURE_KEY) + '&reason=' + encodeURIComponent(REASON);
        _mergeBillingSnapshot(await _fetchBillingJson(pricingUrl), 'server-pricing');
      } catch (_) {}
      try {
        var balanceUrl = '/api/billing/balance?sync=1&reason=' + encodeURIComponent(REASON) + '&_=' + Date.now();
        _mergeBillingSnapshot(await _fetchBillingJson(balanceUrl), 'server-balance');
      } catch (_) {}
      _applyBillingSnapshot(_billingSnapshot);
      return _billingSnapshot;
    })().finally(function () { _billingSnapshotPromise = null; });
    return _billingSnapshotPromise;
  }

  function _billingCost() {
    return _coinNumber(_billingSnapshot && _billingSnapshot.cost) || COIN_COST;
  }

  function _log(stage, meta) {
    try { console.info('[NewYearAIConsultation][' + String(stage || 'Unknown') + ']', meta || {}); } catch (_) {}
  }
  function _toShortList(value, limit) {
    var source = Array.isArray(value) ? value : [];
    return source.map(function (item) { return _clean(item); }).filter(Boolean).slice(0, Math.max(1, Number(limit || 6)));
  }
  function _payloadSafe(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.error && typeof data.error === 'object' ? data.error : {};
    var debugSafe = data.debugSafe && typeof data.debugSafe === 'object' ? data.debugSafe : {};
    return {
      code: _clean(data.code || nested.code || data.errorCode || nested.errorCode) || undefined,
      message: _clean(data.message || nested.message || data.reasonMessage || nested.reasonMessage) || undefined,
      stage: _clean(data.stage || data.failureStage || debugSafe.stage || nested.stage || nested.failureStage) || undefined,
      failureType: _clean(data.failureType || debugSafe.failureType || nested.failureType) || undefined,
      reportId: _clean(data.reportId || debugSafe.reportId || nested.reportId) || undefined,
      executionId: _clean(data.executionId || debugSafe.executionId || nested.executionId) || undefined,
      missing: _toShortList(data.missing || nested.missing, 6),
      issues: _toShortList(data.issues || nested.issues || data.errors || nested.errors, 6),
      debugSafe: Object.keys(debugSafe).length ? debugSafe : undefined
    };
  }
  function _buildPdfApiError(payload, status, fallbackMessage) {
    var safe = _payloadSafe(payload);
    var msg = _clean(safe.message || fallbackMessage || ('HTTP ' + (status || '')));
    var err = new Error(msg || '신년운세 AI 상담 요청에 실패했습니다.');
    err.status = Number(status || 0) || undefined;
    err.code = _clean(safe.code) || 'SAJU_NEW_YEAR_REQUEST_FAILED';
    err.stage = _clean(safe.stage) || 'prepare';
    err.failureType = _clean(safe.failureType);
    err.reportId = _clean(safe.reportId);
    err.executionId = _clean(safe.executionId);
    err.missing = safe.missing;
    err.issues = safe.issues;
    err.payloadSafe = safe;
    err.payload = payload && typeof payload === 'object' ? payload : undefined;
    return err;
  }
  function _logError(error, meta) {
    try {
      var safePayload = error && error.payloadSafe
        ? error.payloadSafe
        : _payloadSafe((error && error.payload) || (error && error.debugSafe ? { debugSafe: error.debugSafe } : error));
      var safe = {
        serviceKey: SERVICE_KEY,
        featureKey: API_FEATURE_KEY,
        billingFeatureKey: BILLING_FEATURE_KEY,
        reportType: 'sajuNewYear',
        stage: _clean(meta && meta.stage) || _clean(error && error.stage) || 'unknown',
        code: _clean(error && (error.code || error.name)) || _clean(meta && meta.code) || 'SAJU_NEW_YEAR_CLIENT_ERROR',
        failureType: _clean(error && error.failureType || safePayload.failureType) || undefined,
        message: _clean(error && error.message ? error.message : error) || 'unknown',
        status: Number(error && error.status || meta && meta.status || 0) || undefined,
        requestUrl: _clean(error && error.requestUrl || meta && meta.requestUrl || safePayload.debugSafe && safePayload.debugSafe.requestUrl) || undefined,
        httpStatus: Number(error && error.httpStatus || error && error.status || meta && meta.httpStatus || meta && meta.status || 0) || undefined,
        responseCode: _clean(error && error.responseCode || safePayload.code || meta && meta.responseCode) || undefined,
        responseMessage: _clean(error && error.responseMessage || safePayload.message || meta && meta.responseMessage) || undefined,
        reportId: _clean(error && error.reportId || safePayload.reportId || meta && meta.reportId || _resultPayload && _resultPayload.reportId) || undefined,
        sessionId: _clean(error && error.sessionId || meta && meta.sessionId || '') || undefined,
        executionId: _clean(error && error.executionId || safePayload.executionId || meta && meta.executionId) || undefined,
        missing: _toShortList(error && error.missing || safePayload.missing, 6),
        missingFields: _toShortList(error && error.missingFields || safePayload.debugSafe && safePayload.debugSafe.missingFields, 8),
        issues: _toShortList(error && error.issues || safePayload.issues, 6),
        hasCookie: typeof (error && error.hasCookie) === 'boolean' ? error.hasCookie : undefined,
        hasAuthorization: typeof (error && error.hasAuthorization) === 'boolean' ? error.hasAuthorization : undefined,
        credentialsIncluded: typeof (error && error.credentialsIncluded) === 'boolean' ? error.credentialsIncluded : undefined,
        accessVerified: typeof (error && error.accessVerified) === 'boolean' ? error.accessVerified : undefined,
        isComingSoonBlocked: typeof (error && error.isComingSoonBlocked) === 'boolean' ? error.isComingSoonBlocked : undefined,
        authFailureReason: _clean(error && error.authFailureReason || safePayload.debugSafe && safePayload.debugSafe.authFailureReason) || undefined,
        causeMessage: _clean(error && error.causeMessage || error && error.cause && (error.cause.message || error.cause) || meta && meta.causeMessage) || undefined,
        payloadSafe: safePayload
      };
      if (error && error.debugSafe && typeof error.debugSafe === 'object') safe.debugSafe = error.debugSafe;
      console.error('[NewYearAIConsultation][Error][' + safe.stage + ']', safe);
    } catch (_) {}
  }

  function _publicErrorMessage(error, fallback) {
    var code = _clean(error && (error.code || error.name)).toUpperCase();
    var messages = {
      AUTH_REQUIRED: '신년운세 AI 상담을 위해 먼저 로그인해 주세요.',
      SESSION_INVALID: '로그인 세션이 만료되었습니다. 다시 로그인한 뒤 시도해 주세요.',
      ENTITLEMENT_REQUIRED: '신년운세 AI 상담 권한이 필요합니다. 결제 또는 이용권을 확인해 주세요.',
      ENTITLEMENT_CHECK_FAILED: '결제 권한 확인 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.',
      INVALID_INPUT: '입력 정보를 확인해 주세요. 대상 연도와 생년월일은 필수입니다.',
      GENERATION_FAILED: '신년운세 AI 상담 생성 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.',
      NEW_YEAR_AI_LLM_FAILED: '현재 신년운세 AI 상담 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      PDF_RENDER_FAILED: '신년운세 AI 상담 생성 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.'
    };
    if (messages[code]) return messages[code];
    var message = _clean(error && error.message ? error.message : error);
    if (/Authentication service error|retry login/i.test(message)) return messages.SESSION_INVALID;
    if (!message || message === '[object Object]' || /^HTTP\s*5\d\d/i.test(message)) {
      return fallback || '신년운세 AI 상담 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
    return message;
  }

  function _sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function _isPrepareRunning(data) {
    var status = String(data && (data.status || data.serverStatus) || '').toLowerCase();
    return status === 'running';
  }

  function _isTerminalStatus(status) {
    var value = String(status || '').toLowerCase();
    return value === 'completed' || value === 'done' || value === 'failed';
  }

  function _resolveDefaultTargetYear() {
    return new Date().getFullYear() + 1;
  }

  function _parseBirthTime(rawTime, rawHour, rawMinute) {
    var token = _clean(rawTime).toLowerCase();
    if (!token && (rawHour === null || rawHour === undefined || rawHour === '')) {
      return { birthTime: '', birthHour: null, birthMinute: null, isTimeUnknown: true };
    }
    if (/(모름|unknown|미상|없음)/.test(token)) {
      return { birthTime: '', birthHour: null, birthMinute: null, isTimeUnknown: true };
    }
    var hour = Number(rawHour);
    var minute = Number(rawMinute);
    var hm = token.match(/(?:오전|오후)?\s*(\d{1,2})\s*(?::|시)\s*(\d{1,2})?\s*(?:분)?/);
    if (hm) {
      hour = Number(hm[1]);
      minute = hm[2] ? Number(hm[2]) : 0;
    }
    if (token.indexOf('오후') >= 0 && Number.isFinite(hour) && hour < 12) hour += 12;
    if (token.indexOf('오전') >= 0 && hour === 12) hour = 0;
    if (!Number.isFinite(hour)) {
      return { birthTime: '', birthHour: null, birthMinute: null, isTimeUnknown: true };
    }
    if (!Number.isFinite(minute)) minute = 0;
    hour = Math.max(0, Math.min(23, Math.trunc(hour)));
    minute = Math.max(0, Math.min(59, Math.trunc(minute)));
    return {
      birthTime: _pad2(hour) + ':' + _pad2(minute),
      birthHour: hour,
      birthMinute: minute,
      isTimeUnknown: false
    };
  }

  function _normalizeBirthInput(profile) {
    var birth = profile && profile.birth ? profile.birth : {};
    var year = Number(birth.year || profile.birthYear || 0);
    var month = Number(birth.month || profile.birthMonth || 0);
    var day = Number(birth.day || profile.birthDay || 0);
    var time = _parseBirthTime(birth.birthTime || profile.birthTime || '', birth.hour, birth.minute);
    return {
      name: _clean(profile && profile.name) || '사용자',
      gender: _clean(profile && profile.gender) || '',
      calendarType: _clean(birth.calendarType || birth.calType || profile.calendarType || 'solar') || 'solar',
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthDate: year && month && day ? String(year).padStart(4, '0') + '-' + _pad2(month) + '-' + _pad2(day) : '',
      birthTime: time.birthTime,
      birthHour: time.birthHour,
      birthMinute: time.birthMinute,
      isTimeUnknown: time.isTimeUnknown
    };
  }

  function _readPremiumAccessToken() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (!token) { try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    if (!token) { try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    return token;
  }

  function _readAuthToken() {
    var token = '';
    try { token = String(localStorage.getItem('fortune_auth_token') || '').trim(); } catch (_) { token = ''; }
    if (!token) { try { token = String(localStorage.getItem('cd_access_token') || '').trim(); } catch (_) { token = ''; } }
    if (!token) { try { token = String(localStorage.getItem('authToken') || '').trim(); } catch (_) { token = ''; } }
    if (!token) { try { token = String(localStorage.getItem('cdToken') || '').trim(); } catch (_) { token = ''; } }
    return token;
  }

  function _buildAuthHeaders(baseHeaders) {
    var headers = Object.assign({}, baseHeaders || {});
    var premiumToken = _readPremiumAccessToken();
    var authToken = _readAuthToken();
    if (premiumToken) headers['x-premium-access-token'] = premiumToken;
    if (authToken) headers.Authorization = 'Bearer ' + authToken;
    return headers;
  }

  function _hasReadableCookie() {
    try { return Boolean(document.cookie); } catch (_) { return false; }
  }

  function _requestDebug(url, headers) {
    return {
      requestUrl: _clean(url),
      hasCookie: _hasReadableCookie(),
      hasAuthorization: Boolean(headers && (headers.Authorization || headers.authorization)),
      credentialsIncluded: true
    };
  }

  function _stageForRequestUrl(url) {
    var value = _clean(url).toLowerCase();
    if (value.indexOf('/generate') >= 0) return 'generate';
    if (value.indexOf('/status') >= 0) return 'status';
    if (value.indexOf('/result') >= 0) return 'result';
    if (value.indexOf('/ai-consultation') >= 0) return 'ai-consultation';
    if (value.indexOf('/billing/') >= 0) return 'billing';
    return 'prepare';
  }

  function _responseCode(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.error && typeof data.error === 'object' ? data.error : {};
    return _clean(data.code || data.errorCode || nested.code || nested.errorCode);
  }

  function _responseMessage(payload, fallback) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.error && typeof data.error === 'object' ? data.error : {};
    return _clean(data.message || nested.message || data.reasonMessage || nested.reasonMessage || fallback);
  }

  function _attachRequestDebug(error, url, status, payload, headers, stage) {
    if (!error) return error;
    var debugSafe = payload && payload.debugSafe && typeof payload.debugSafe === 'object' ? payload.debugSafe : {};
    var requestDebug = _requestDebug(url, headers);
    error.stage = _clean(stage || debugSafe.stage || error.stage) || error.stage;
    error.requestUrl = _clean(debugSafe.requestUrl || requestDebug.requestUrl);
    error.httpStatus = Number(debugSafe.httpStatus || status || error.status || 0) || undefined;
    error.responseCode = _clean(debugSafe.responseCode || _responseCode(payload) || error.code);
    error.responseMessage = _clean(debugSafe.responseMessage || _responseMessage(payload, error.message));
    error.hasCookie = typeof debugSafe.hasCookie === 'boolean' ? debugSafe.hasCookie : requestDebug.hasCookie;
    error.hasAuthorization = typeof debugSafe.hasAuthorization === 'boolean' ? debugSafe.hasAuthorization : requestDebug.hasAuthorization;
    error.credentialsIncluded = typeof debugSafe.credentialsIncluded === 'boolean' ? debugSafe.credentialsIncluded : true;
    error.accessVerified = typeof debugSafe.accessVerified === 'boolean' ? debugSafe.accessVerified : undefined;
    error.isComingSoonBlocked = typeof debugSafe.isComingSoonBlocked === 'boolean' ? debugSafe.isComingSoonBlocked : undefined;
    error.authFailureReason = _clean(debugSafe.authFailureReason);
    error.missingFields = _toShortList(debugSafe.missingFields || debugSafe.missing || payload && payload.missing, 8);
    return error;
  }

  function _persistPremiumAccessToken(token) {
    var value = _clean(token);
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function _extractPremiumToken(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token'];
    for (var i = 0; i < keys.length; i += 1) {
      var found = _clean(payload[keys[i]]);
      if (found) return found;
    }
    return _extractPremiumToken(payload.data) || _extractPremiumToken(payload.payload);
  }

  function _parseSajuNewYearDateInput(value) {
    var raw = _clean(value);
    if (!raw) return null;
    var datePart = raw.split(/[T\s]/)[0] || raw;
    var parts = datePart.indexOf('-') >= 0 || datePart.indexOf('/') >= 0 || datePart.indexOf('.') >= 0
      ? datePart.split(/[-/.]/)
      : [datePart.replace(/\D/g, '').slice(0, 4), datePart.replace(/\D/g, '').slice(4, 6), datePart.replace(/\D/g, '').slice(6, 8)];
    if (parts.length < 3 || String(parts[0] || '').length < 4) return null;
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    return year && month && day ? { year: year, month: month, day: day } : null;
  }

  function _recoverBirthFromDom() {
    try {
      var birthDateEl = _qs('birthDate');
      if (!birthDateEl || !birthDateEl.value) return null;
      var dateParts = _parseSajuNewYearDateInput(birthDateEl.value);
      var year = Number(dateParts && dateParts.year);
      var month = Number(dateParts && dateParts.month);
      var day = Number(dateParts && dateParts.day);
      if (!year || !month || !day) return null;
      var nameEl = _qs('nameInput');
      var hourEl = _qs('birthHour');
      var minuteEl = _qs('birthMinute');
      var femaleEl = _qs('genderFemale');
      return {
        name: _clean(nameEl && nameEl.value) || '사용자',
        gender: femaleEl && femaleEl.checked ? 'F' : 'M',
        birth: {
          year: year,
          month: month,
          day: day,
          hour: Number(hourEl && hourEl.value || 12),
          minute: Number(minuteEl && minuteEl.value || 0)
        }
      };
    } catch (_) {
      return null;
    }
  }

  function _recoverBirthFromStorage() {
    try {
      return (typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
        || window.__cdCurrentDestinyProfile
        || null;
    } catch (_) {
      return null;
    }
  }

  function _getActiveBirthProfile() {
    var profile = window.__cdActiveBirthProfile;
    if (profile && profile.birth && profile.birth.year) return profile;
    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    var domProfile = _recoverBirthFromDom();
    if (domProfile) return domProfile;
    var stored = _recoverBirthFromStorage();
    if (stored && stored.birth && stored.birth.year) return stored;
    return null;
  }

  function _collectSajuBase() {
    var profile = _getActiveBirthProfile() || {};
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var analysis = snap.analysis || snap.saju || {};
    var G = window.G_PILLARS || {};
    var counts = analysis.elementWeights || analysis.counts || {};
    var tenGodCounts = (window.G_POWER && window.G_POWER.groups) ? window.G_POWER.groups : {};
    var birth = profile.birth || snap.birth || {};

    function safeNum(value) {
      var n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }
    function birthDate() {
      if (!birth.year || !birth.month || !birth.day) return '';
      return String(birth.year).padStart(4, '0') + '-' + _pad2(birth.month) + '-' + _pad2(birth.day);
    }

    return {
      user: {
        name: _clean(profile.name || snap.name || '사용자'),
        gender: _clean(profile.gender || snap.gender || ''),
        birthDate: birthDate(),
        birthTime: birth.hour !== undefined ? (_pad2(birth.hour) + ':' + _pad2(birth.minute || 0)) : '',
        calendarType: _clean(birth.calendarType || birth.calType || 'solar') || 'solar'
      },
      pillars: {
        year: { gan: _clean(G.y && G.y.g), zhi: _clean(G.y && G.y.j) },
        month: { gan: _clean(G.m && G.m.g), zhi: _clean(G.m && G.m.j) },
        day: { gan: _clean(G.d && G.d.g), zhi: _clean(G.d && G.d.j) },
        hour: { gan: _clean(G.h && G.h.g), zhi: _clean(G.h && G.h.j) }
      },
      core: {
        dayMaster: _clean((G.d && G.d.g) || analysis.dayStem || ''),
        dayBranch: _clean((G.d && G.d.j) || ''),
        monthBranch: _clean((G.m && G.m.j) || ''),
        season: _clean(analysis.season || '')
      },
      elementBalance: {
        counts: {
          wood: safeNum(counts.wood),
          fire: safeNum(counts.fire),
          earth: safeNum(counts.earth),
          metal: safeNum(counts.metal),
          water: safeNum(counts.water)
        },
        dominant: _clean(analysis.dominantElement || analysis.dominant || ''),
        deficient: _clean(analysis.weakElement || analysis.deficient || ''),
        balanceScore: safeNum(analysis.balanceScore || 0)
      },
      tenGods: {
        counts: tenGodCounts,
        dominantTenGod: _clean(analysis.dominantTenGod || '')
      },
      strength: {
        isStrong: !!(window.G_POWER && window.G_POWER.isStrong),
        label: _clean(analysis.power_label || ''),
        reason: _clean((window.G_POWER && window.G_POWER.reason) || '')
      },
      johu: snap.johu || analysis.johu || null,
      yongshin: {
        usefulElements: Array.isArray(analysis.yongshin_elements) ? analysis.yongshin_elements.slice(0, 5) : []
      },
      specialStars: {
        tao: safeNum(analysis.taoPct || 0),
        hwa: safeNum(analysis.hwaPct || 0),
        yeokma: safeNum(analysis.yeokmaPct || 0),
        gwimun: !!analysis.hasGwimun
      },
      timing: {
        daeun: window.G_DAEWUN || window.G_DAEUN || []
      }
    };
  }

  function _collectQuantumMyeongriJson() {
    var base = _collectSajuBase();
    return {
      schemaVersion: 'saju-new-year-client-evidence.v1',
      calculationSource: 'main-shell-saju-engine',
      evidencePolicy: 'supplemental_only_worker_engine_is_source_of_truth',
      sajuBase: base,
      pillars: base.pillars,
      core: base.core,
      elementBalance: base.elementBalance,
      tenGods: base.tenGods,
      strength: base.strength,
      johu: window.G_JOHU || base.johu || null,
      yongshin: base.yongshin,
      specialStars: base.specialStars,
      timing: base.timing,
      quantumRuntime: {
        power: window.G_POWER || null,
        daeun: window.G_DAEWUN || window.G_DAEUN || [],
        analysis: (window.__destinyFlowerSajuSnapshot && (window.__destinyFlowerSajuSnapshot.analysis || window.__destinyFlowerSajuSnapshot.saju)) || null
      }
    };
  }

  function _showScreen(id) {
    ['nyStartScreen', 'nyLoadingScreen', 'nyResultScreen', 'nyErrorScreen'].forEach(function (screenId) {
      var el = _qs(screenId);
      if (el) el.style.display = screenId === id ? '' : 'none';
    });
  }

  function _setError(message, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var el = _qs('nyErrorMsg');
    if (el) el.textContent = _clean(message) || '신년운세 AI 상담 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    var detail = _qs('nyErrorDetail');
    if (detail) {
      var detailText = _clean(opts.detail || '');
      detail.textContent = detailText;
      detail.style.display = detailText ? '' : 'none';
    }
    var birthBtn = _qs('nyBirthInputBtn');
    if (birthBtn) birthBtn.style.display = opts.showBirthInput ? '' : 'none';
    var chargeBtn = _qs('nyChargeBtn');
    if (chargeBtn) chargeBtn.style.display = opts.showCharge ? '' : 'none';
    var loginBtn = _qs('nyLoginBtn');
    if (loginBtn) loginBtn.style.display = opts.showLogin ? '' : 'none';
    var retryBtn = _qs('nyRetryBtn');
    if (retryBtn) {
      retryBtn.style.display = opts.hideRetry ? 'none' : '';
      retryBtn.textContent = _clean(opts.retryText) || '다시 시도';
    }
    _setStage('');
    _showScreen('nyErrorScreen');
  }

  function _setBusy(isBusy) {
    ['nyGenerateBtn'].forEach(function (id) {
      var btn = _qs(id);
      if (!btn) return;
      btn.disabled = !!isBusy;
      btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    });
  }

  function _setStage(stage) {
    var active = _clean(stage);
    var pills = document.querySelectorAll('#sajuNewYearModal .ny-stage-pill');
    Array.prototype.forEach.call(pills, function (pill) {
      pill.classList.toggle('is-active', _clean(pill.getAttribute('data-ny-stage')) === active);
    });
    var title = _qs('nyLoadingTitle') || document.querySelector('#nyLoadingScreen .lb-loading-title');
    if (title && STAGE_TITLES[active]) title.textContent = STAGE_TITLES[active];
  }

  function _setProgress(done, message) {
    var totalSteps = LOADING_MESSAGES.length || 3;
    var bounded = Math.max(0, Math.min(totalSteps, Number(done || 0)));
    var percent = Math.round((bounded / Math.max(1, totalSteps)) * 100);
    var bar = _qs('nyProgressBar');
    var text = _qs('nyProgressText');
    var chapter = _qs('nyLoadingChapter');
    var num = _qs('nyLoadingChapterNum');
    var quote = _qs('nyMysticQuote');
    if (bar) {
      bar.style.width = percent + '%';
      bar.setAttribute('aria-valuenow', String(percent));
    }
    if (text) text.textContent = percent + '% · AI 상담 생성 중';
    if (chapter) chapter.textContent = message || LOADING_MESSAGES[bounded % LOADING_MESSAGES.length] || '신년운세 상담을 정리하는 중입니다';
    if (quote && message) quote.textContent = message;
    if (num) num.textContent = bounded >= totalSteps ? '완성' : '상담 ' + Math.max(1, bounded + 1);
  }

  function _normalizeJobStatus(payload) {
    var root = payload && typeof payload === 'object' ? payload : {};
    var data = root.data && typeof root.data === 'object' ? root.data : root;
    var progress = data.progress && typeof data.progress === 'object'
      ? data.progress
      : (data.newYearPdfProgress && typeof data.newYearPdfProgress === 'object' ? data.newYearPdfProgress : data);
    var status = _clean(progress.status || data.status || data.serverStatus || root.status || root.serverStatus).toLowerCase();
    if (status === 'done') status = 'completed';
    if (status === 'processing' || status === 'running' || status === 'validating') status = 'generating';
    if (!status) status = 'pending';
    var chapters = Array.isArray(data.chapters)
      ? data.chapters
      : (Array.isArray(root.chapters) ? root.chapters : []);
    var total = Number(progress.totalChapters || progress.chapterCount || data.totalChapters || data.chapterCount || chapters.length || TOTAL_CHAPTERS);
    if (!Number.isFinite(total) || total <= 0) total = TOTAL_CHAPTERS;
    total = Math.max(1, Math.trunc(total));
    var completed = Number(progress.completedChapters != null ? progress.completedChapters : progress.completedChapterCount);
    if (!Number.isFinite(completed) && chapters.length) {
      completed = chapters.filter(function (chapter) { return _clean(chapter && chapter.status).toLowerCase() === 'completed'; }).length;
    }
    if (!Number.isFinite(completed)) completed = status === 'completed' ? total : 0;
    completed = Math.max(0, Math.min(total, Math.trunc(completed)));
    var current = Number(progress.currentChapterNumber || progress.currentChapterNo || progress.chapterIndex || data.currentChapterNumber || data.currentChapterNo);
    if (!Number.isFinite(current) || current <= 0) current = completed >= total ? total : completed + 1;
    current = Math.max(1, Math.min(total, Math.trunc(current)));
    var percent = Number(data.progressPercent != null ? data.progressPercent : (root.progressPercent != null ? root.progressPercent : (progress.progress != null ? progress.progress : progress.percent)));
    if (!Number.isFinite(percent)) {
      percent = status === 'completed'
        ? 100
        : status === 'failed'
          ? Math.max(0, Math.round((completed / total) * 80))
          : Math.max(8, Math.min(95, Math.round((completed / total) * 70) + 15));
    }
    percent = Math.max(0, Math.min(100, Math.round(percent)));
    var title = _clean(progress.currentChapterTitle || data.currentChapterTitle || '');
    var step = _clean(progress.currentStep || progress.currentStepMessage || data.currentStep || data.currentStepMessage || data.message);
    if (!step) {
      if (status === 'rendering') step = 'PDF 렌더링 중입니다.';
      else if (status === 'completed') step = '신년운세 PDF가 완성되었습니다.';
      else if (status === 'failed') step = _clean(progress.errorMessage || data.errorMessage) || '신년운세 PDF 생성이 중단되었습니다.';
      else step = '신년운세 PDF를 작성하고 있어요.';
    }
    return {
      jobId: _clean(progress.jobId || data.jobId || data.reportId || root.reportId),
      status: status,
      progress: percent,
      currentStep: step,
      currentChapterNumber: current,
      currentChapterTitle: title,
      totalChapters: total,
      completedChapters: completed,
      chapters: chapters,
      provider: _clean(data.provider || root.provider || 'mock'),
      tokensUsed: Number(data.tokensUsed || root.tokensUsed || 0) || 0,
      cost: Number(data.cost || root.cost || 0) || 0,
      isMock: data.isMock === true || root.isMock === true || _clean(data.provider || root.provider) === 'mock',
      resultId: _clean(data.resultId || data.reportId || root.reportId),
      pdfUrl: _clean(data.pdfUrl || data.downloadUrl || (data.pdfReady && (data.pdfReady.pdfUrl || data.pdfReady.downloadUrl))),
      errorCode: _clean(progress.errorCode || data.errorCode || data.code),
      errorMessage: _clean(progress.errorMessage || data.errorMessage || data.message)
    };
  }

  function _chapterStatusLabel(status) {
    var value = _clean(status).toLowerCase();
    if (value === 'completed') return '완료';
    if (value === 'generating' || value === 'chapter_generating') return '생성 중';
    if (value === 'failed') return '실패';
    return '대기';
  }

  function _renderChapterStatusList(job) {
    var list = _qs('nyChapterStatusList');
    if (!list) return;
    var chapters = job && Array.isArray(job.chapters) ? job.chapters : [];
    if (!chapters.length) {
      list.innerHTML = '';
      return;
    }
    list.innerHTML = chapters.map(function (chapter, index) {
      var status = _clean(chapter && chapter.status).toLowerCase() || 'pending';
      var title = _clean(chapter && chapter.title) || ((index + 1) + '장');
      var order = Number(chapter && (chapter.order || chapter.no || chapter.chapter));
      if (!Number.isFinite(order) || order <= 0) order = index + 1;
      return '<div class="ny-chapter-status-item is-' + _esc(status) + '"><span>[' + _esc(_chapterStatusLabel(status)) + ']</span><strong>' + _esc(order + '장 ' + title) + '</strong></div>';
    }).join('');
  }

  function _applyJobProgress(payload) {
    var job = _normalizeJobStatus(payload);
    var bar = _qs('nyProgressBar');
    var text = _qs('nyProgressText');
    var chapter = _qs('nyLoadingChapter');
    var num = _qs('nyLoadingChapterNum');
    var quote = _qs('nyMysticQuote');
    if (bar) {
      bar.style.width = job.progress + '%';
      bar.setAttribute('aria-valuenow', String(job.progress));
    }
    if (text) text.textContent = job.progress + '% · ' + job.completedChapters + ' / ' + job.totalChapters + ' 챕터 완성';
    var label = job.status === 'failed'
      ? job.currentStep
      : job.currentChapterTitle
        ? '현재 챕터 ' + job.currentChapterNumber + ': ' + job.currentChapterTitle + ' 생성 중입니다.'
        : job.currentStep;
    if (chapter) chapter.textContent = label;
    if (quote) quote.textContent = job.currentStep;
    if (num) num.textContent = job.status === 'completed' ? '완성' : (job.status === 'failed' ? '실패' : job.currentChapterNumber + '장');
    _renderChapterStatusList(job);
    if (job.status === 'rendering' || job.status === 'saving' || job.status === 'completed') _setStage('archive');
    else if (job.completedChapters > 0 || job.currentChapterNumber > 1) _setStage('write');
    else if (job.status === 'queued' || job.status === 'access_verified' || job.status === 'pending') _setStage('calculate');
    return job;
  }

  function _startProgressAnimation() {
    _stopProgressAnimation();
  }

  function _stopProgressAnimation() {
    if (_progressTimer) clearInterval(_progressTimer);
    _progressTimer = null;
  }

  function _targetYear() {
    var el = _qs('nyTargetYear');
    var year = Number(el && el.value || _resolveDefaultTargetYear());
    if (!Number.isFinite(year) || year < 1900 || year > 2100) return 0;
    return Math.trunc(year);
  }

  function _syncTargetYearBounds() {
    var el = _qs('nyTargetYear');
    if (!el) return;
    var baseYear = new Date().getFullYear();
    var minYear = baseYear;
    var maxYear = baseYear + 10;
    el.min = String(minYear);
    el.max = String(maxYear);
    if (!el.value) el.value = String(_resolveDefaultTargetYear());
    var selected = Number(el.value);
    if (Number.isFinite(selected) && selected < minYear) el.value = String(minYear);
    if (Number.isFinite(selected) && selected > maxYear) el.value = String(maxYear);
  }

  function _profileLabel(profile) {
    var normalized = _normalizeBirthInput(profile || {});
    var name = normalized.name || '사용자';
    var birth = normalized.birthDate || '생년월일 확인 필요';
    var time = normalized.birthTime || '출생시간 미상';
    return name + ' · ' + birth + ' · ' + time;
  }

  function _updateProfileStatus(profile) {
    var el = _qs('nyProfileStatus');
    if (!el) return;
    if (profile && profile.birth && profile.birth.year) {
      el.innerHTML = '<strong>상담 기준</strong> ' + _esc(_profileLabel(profile)) + '<br>대상 연도와 질문을 확인한 뒤 신년운세 AI 상담을 시작합니다.';
      return;
    }
    el.innerHTML = '<strong>사주 정보 필요</strong> 생년월일을 먼저 입력해야 신년운세 AI 상담을 정확하게 생성할 수 있습니다.';
  }

  function _questionInput() {
    return _qs('nyQuestion');
  }

  function _currentQuestion() {
    var input = _questionInput();
    return _clean(input && input.value) || '';
  }

  function _currentCategory() {
    var active = document.querySelector('#sajuNewYearModal .ny-category-chip.is-active');
    return _clean(active && active.getAttribute('data-ny-category')) || _selectedCategory || '종합운';
  }

  function _setCategory(category, fillQuestion) {
    _selectedCategory = _clean(category) || '종합운';
    var chips = document.querySelectorAll('#sajuNewYearModal .ny-category-chip');
    Array.prototype.forEach.call(chips, function (chip) {
      chip.classList.toggle('is-active', _clean(chip.getAttribute('data-ny-category')) === _selectedCategory);
    });
    var input = _questionInput();
    if (input) {
      input.placeholder = CATEGORY_QUESTIONS[_selectedCategory] || DEFAULT_QUESTION;
      if (fillQuestion || !_clean(input.value)) input.value = CATEGORY_QUESTIONS[_selectedCategory] || DEFAULT_QUESTION;
    }
  }

  function _bindQuestionControls() {
    var chips = document.querySelectorAll('#sajuNewYearModal .ny-category-chip');
    Array.prototype.forEach.call(chips, function (chip) {
      if (chip.dataset.nyBound === '1') return;
      chip.dataset.nyBound = '1';
      chip.addEventListener('click', function () {
        _setCategory(chip.getAttribute('data-ny-category'), true);
      });
    });
    _setCategory(_selectedCategory || '종합운', false);
  }

  function _billingErrorOptions(gate) {
    var status = Number(gate && gate.status || 0);
    var code = _clean(gate && (gate.code || gate.errorCode)).toUpperCase();
    var message = _clean(gate && gate.message);
    if (status === 401 || code === 'AUTH_REQUIRED' || code === 'SESSION_INVALID' || code === 'UNAUTHORIZED') {
      return {
        showLogin: true,
        detail: code === 'SESSION_INVALID' ? '로그인 세션이 만료되었습니다. 다시 로그인한 뒤 신년운세 AI 상담을 이어갈 수 있습니다.' : '신년운세 AI 상담을 위해 먼저 로그인이 필요합니다.',
        retryText: '로그인 후 다시 시도'
      };
    }
    if (code === 'INVALID_INPUT') {
      return {
        showBirthInput: true,
        detail: '생년월일과 대상 연도를 확인해 주세요. 대상 연도가 없으면 AI 상담을 시작하지 않습니다.',
        retryText: '입력 다시 확인'
      };
    }
    if (code === 'ENTITLEMENT_CHECK_FAILED') {
      return {
        detail: '결제 권한 확인 서버 응답이 안정적으로 도착하지 않았습니다. 결제 내역을 보존한 상태로 다시 확인합니다.',
        retryText: '권한 다시 확인'
      };
    }
    if (status === 402 || code === 'ENTITLEMENT_REQUIRED' || code === 'INSUFFICIENT_COINS' || /잔액|이용권|결제|권한/.test(message)) {
      return {
        showCharge: true,
        detail: '단건 결제, 월정석 크레딧, 이용권 중 하나의 권한이 필요합니다. 권한이 확인되기 전에는 AI 상담이 시작되지 않습니다.',
        retryText: '권한 다시 확인'
      };
    }
    if (code === 'GENERATION_FAILED' || code === 'PDF_RENDER_FAILED') {
      return {
        detail: '신년운세 AI 상담이 완료되지 않았습니다. 같은 입력으로 다시 시도해 주세요.',
        retryText: '상담 다시 시도'
      };
    }
    if (code === 'PAYMENT_CONFIRMED_BUT_ACCESS_MISSING') {
      return {
        detail: '결제 확인은 되었지만 생성 권한 연결이 늦어지고 있습니다. 잠시 후 다시 시도하면 기존 결제 권한을 먼저 조회합니다.',
        retryText: '권한 다시 확인'
      };
    }
    return {
      detail: '결제창 또는 권한 확인 응답이 완전히 도착하지 않았습니다. 잠시 후 다시 시도해 주세요.',
      retryText: '다시 확인'
    };
  }

  function _renderProfileSummary(profile) {
    var dateEl = _qs('nyResultDate');
    if (dateEl && profile && profile.birth) {
      dateEl.textContent = profile.birth.year + '. ' + profile.birth.month + '. ' + profile.birth.day + ' 생 · ' + (_targetYear() || new Date().getFullYear()) + '년 기준';
    }
  }

  function _buildReportId(targetYear) {
    return 'saju-new-year-' + targetYear + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function _buildPreparePayload(reportId, targetYear, profile, normalizedBirth, accessGrant, premiumToken, options) {
    var sessionId = _clean(accessGrant && (accessGrant.sessionId || accessGrant.reportSessionId)) || ('saju-new-year:' + reportId);
    var accessFeatureKey = _clean(accessGrant && accessGrant.featureKey) || API_FEATURE_KEY;
    var accessType = _clean(accessGrant && (accessGrant.accessType || accessGrant.transactionType));
    var accessMethod = _clean(accessGrant && (accessGrant.accessMethod || accessGrant.paymentMethod));
    var transactionId = _clean(accessGrant && (accessGrant.transactionId || accessGrant.sourceTransactionId || accessGrant.paymentId || accessGrant.evidenceId));
    var paymentToken = _clean(premiumToken || (accessGrant && (accessGrant.premiumAccessToken || accessGrant._premiumAccessToken || accessGrant.accessToken || accessGrant.token)));
    var payload = {
      serviceKey: SERVICE_KEY,
      serviceType: SERVICE_KEY,
      productKey: API_FEATURE_KEY,
      entitlementKey: 'saju_new_year_pdf',
      paymentPurpose: 'pdf_generation',
      featureKey: API_FEATURE_KEY,
      apiFeatureKey: API_FEATURE_KEY,
      billingFeatureKey: BILLING_FEATURE_KEY,
      reason: REASON,
      reportId: reportId,
      sessionId: sessionId,
      reportSessionId: sessionId,
      targetYear: targetYear,
      selectedYear: targetYear,
      name: normalizedBirth.name,
      gender: normalizedBirth.gender,
      calendarType: normalizedBirth.calendarType,
      birthDate: normalizedBirth.birthDate,
      birthTime: normalizedBirth.birthTime,
      birthTimeKnown: !normalizedBirth.isTimeUnknown,
      hour: normalizedBirth.birthHour,
      minute: normalizedBirth.birthMinute,
      profile: profile,
      birthInput: normalizedBirth,
      sajuBase: _collectSajuBase(),
      quantumMyeongriJson: _collectQuantumMyeongriJson()
    };
    if (options && options.preflightOnly) {
      payload.preflightOnly = true;
      payload.lookupOnly = true;
    }
    if (paymentToken) payload.premiumAccessToken = paymentToken;
    if (accessGrant) {
      payload.purchaseId = accessGrant.purchaseId;
      payload.requestId = accessGrant.requestId;
      if (transactionId) {
        payload.transactionId = transactionId;
        payload.sourceTransactionId = transactionId;
        payload.paymentId = transactionId;
      }
      payload.accessGrant = accessGrant;
      payload.payment = {
        featureKey: accessFeatureKey,
        requestId: accessGrant.requestId,
        purchaseId: accessGrant.purchaseId,
        transactionId: transactionId || undefined,
        sourceTransactionId: transactionId || undefined,
        paymentId: transactionId || undefined,
        sessionId: sessionId,
        reportSessionId: sessionId,
        reportId: reportId,
        accessType: accessType || undefined,
        transactionType: accessType || undefined,
        accessMethod: accessMethod || undefined,
        paymentMethod: accessMethod || undefined,
        premiumAccessToken: paymentToken || undefined
      };
      payload._paymentContext = {
        featureKey: accessFeatureKey,
        requestId: accessGrant.requestId,
        purchaseId: accessGrant.purchaseId,
        transactionId: transactionId || undefined,
        sourceTransactionId: transactionId || undefined,
        paymentId: transactionId || undefined,
        sessionId: sessionId,
        reportSessionId: sessionId,
        reportId: reportId,
        accessType: accessType || undefined,
        transactionType: accessType || undefined,
        accessMethod: accessMethod || undefined,
        paymentMethod: accessMethod || undefined,
        premiumAccessToken: paymentToken || undefined
      };
    }
    return payload;
  }

  function _buildAIConsultationPayload(pending, accessGrant, premiumToken) {
    var payload = _buildPreparePayload(
      pending.reportId,
      pending.targetYear,
      pending.profile,
      pending.normalizedBirth,
      accessGrant,
      premiumToken || _readPremiumAccessToken()
    );
    payload.paymentPurpose = 'ai_consultation';
    payload.entitlementKey = 'saju_new_year_pdf';
    payload.question = pending.question;
    payload.category = pending.category;
    payload.questionCategory = pending.category;
    payload.requestId = _clean(payload.requestId || accessGrant && accessGrant.requestId || ('saju-new-year-ai:' + pending.reportId));
    payload.dryRun = false;
    return payload;
  }

  function _unwrapPreparePayload(data) {
    return data && data.data && typeof data.data === 'object' ? data.data : data;
  }

  function _isCompletedPreparePayload(payload) {
    var status = _clean(payload && (payload.status || payload.serverStatus)).toLowerCase();
    return payload && payload.ok !== false && status === 'completed' && Array.isArray(payload.chapters) && payload.chapters.length > 0;
  }

  function _assertHighQualityPreparePayload(payload) {
    var manuscriptSource = _clean(payload && payload.manuscriptSource).toLowerCase();
    var ready = payload && payload.pdfReady && typeof payload.pdfReady === 'object' ? payload.pdfReady : {};
    var llmAssembly = payload && payload.llmAssembly && typeof payload.llmAssembly === 'object'
      ? payload.llmAssembly
      : (ready && ready.metadata && ready.metadata.llmAssembly && typeof ready.metadata.llmAssembly === 'object' ? ready.metadata.llmAssembly : {});
    var qualityStatus = _clean(payload && payload.qualityStatus || ready && ready.metadata && ready.metadata.qualityStatus).toLowerCase();
    var pdfUrl = _clean(payload && (payload.downloadUrl || payload.pdfUrl) || ready && (ready.downloadUrl || ready.pdfUrl));
    var provider = _clean(payload && payload.provider || ready && ready.metadata && ready.metadata.provider).toLowerCase();
    var isMock = payload && payload.isMock === true || ready && ready.metadata && ready.metadata.isMock === true || provider === 'mock';
    if (isMock && provider === 'mock' && Number(payload && payload.tokensUsed || 0) === 0 && Number(payload && payload.cost || 0) === 0 && pdfUrl) return;
    if ((payload && payload.fallbackUsed) || manuscriptSource !== 'saju-new-year-llm-only' || llmAssembly.enabled !== true || llmAssembly.externalGeneration !== true || llmAssembly.fallbackUsed === true || qualityStatus !== 'passed' || !pdfUrl) {
      throw _buildPdfApiError(payload, 422, '신년운세 PDF가 고품질 원고 검증을 통과하지 못했습니다. 원고를 보강한 뒤 다시 생성해 주세요.');
    }
  }

  function _handlePrepareSuccess(data, profile, targetYear) {
    var payload = _unwrapPreparePayload(data);
    if (!_isCompletedPreparePayload(payload)) return false;
    _assertHighQualityPreparePayload(payload);
    _log('LlmChapterDraftCompleted', { chapterCount: Number(payload && (payload.llmDraftChapterCount || payload.chapterCount) || TOTAL_CHAPTERS), cacheHit: !!payload.cacheHit });
    _log('LlmQualityValidationPassed', { chapterCount: Number(payload && (payload.llmDraftChapterCount || payload.chapterCount) || TOTAL_CHAPTERS) });
    _log('FinalValidationPassed', { chapterCount: payload && payload.chapterCount || TOTAL_CHAPTERS });
    _log('PDFArchiveReady', { chapterCount: payload && payload.chapterCount || TOTAL_CHAPTERS });
    _setProgress(TOTAL_CHAPTERS, payload && payload.cacheHit ? '보관된 신년운세 PDF를 불러왔습니다' : '신년운세 프리미엄 PDF를 완성하는 중입니다');
    _renderResult(payload, profile, targetYear);
    _log('PDFArchiveCompleted', { chapterCount: _chapters.length, source: _clean(payload && payload.manuscriptSource), cacheHit: !!payload.cacheHit });
    _showScreen('nyResultScreen');
    return true;
  }

  function _normalizeAccessGrant(raw, reportId, fallbackRequestId) {
    var data = raw && typeof raw === 'object' ? raw : {};
    var accessGrant = data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    var consume = data.consume && typeof data.consume === 'object' ? data.consume : {};
    var access = data.access && typeof data.access === 'object' ? data.access : {};
    var featureKey = _clean(accessGrant.featureKey || consume.featureKey || access.featureKey || data.featureKey || API_FEATURE_KEY) || API_FEATURE_KEY;
    var accessType = _clean(accessGrant.accessType || consume.accessType || access.accessType || data.accessType || data.transactionType);
    var accessMethod = _clean(accessGrant.accessMethod || consume.accessMethod || access.accessMethod || data.accessMethod || data.paymentMethod);
    var transactionId = _clean(
      accessGrant.transactionId
      || accessGrant.sourceTransactionId
      || accessGrant.paymentId
      || accessGrant.evidenceId
      || consume.transactionId
      || consume.sourceTransactionId
      || consume.paymentId
      || consume.evidenceId
      || data.transactionId
      || data.sourceTransactionId
      || data.paymentId
      || data.evidenceId
      || access.transactionId
      || access.sourceTransactionId
      || access.paymentId
      || access.evidenceId
    );
    var premiumAccessToken = _extractPremiumToken(data);
    var normalizedReportId = _clean(accessGrant.reportId || data.reportId || reportId);
    var sessionId = _clean(accessGrant.sessionId || data.sessionId || data.reportSessionId || ('saju-new-year:' + normalizedReportId));
    var requestId = _clean(accessGrant.requestId || data.requestId || consume.requestId || fallbackRequestId);
    var explicitPurchaseId = _clean(
      accessGrant.purchaseId
      || accessGrant.transactionId
      || data.purchaseId
      || data.transactionId
      || data.unlockId
      || consume.purchaseId
      || consume.transactionId
      || consume.unlockId
      || access.purchaseId
      || access.transactionId
      || access.unlockId
    );
    var statusText = _clean(data.status || accessGrant.status || consume.status || access.status).toLowerCase();
    var accessOk = data.ok === true
      || data.accessGranted === true
      || data.granted === true
      || accessGrant.ok === true
      || accessGrant.accessGranted === true
      || consume.ok === true
      || access.ok === true
      || access.accessGranted === true
      || ['granted', 'success', 'succeeded', 'pass_applied', 'has_entitlement', 'completed', 'monthly_paid'].indexOf(statusText) >= 0;
    var purchaseId = explicitPurchaseId || (accessOk ? ('access:' + _clean(requestId || sessionId || normalizedReportId)) : '');
    if (!normalizedReportId || !purchaseId) return null;
    return {
      ok: true,
      featureKey: featureKey,
      sessionId: sessionId,
      reportSessionId: sessionId,
      purchaseId: purchaseId,
      requestId: requestId,
      transactionId: transactionId || undefined,
      sourceTransactionId: transactionId || undefined,
      paymentId: transactionId || undefined,
      evidenceId: _clean(accessGrant.evidenceId || consume.evidenceId || data.evidenceId || access.evidenceId) || undefined,
      accessType: accessType || undefined,
      transactionType: accessType || undefined,
      accessMethod: accessMethod || undefined,
      paymentMethod: accessMethod || undefined,
      premiumAccessToken: premiumAccessToken || undefined,
      reportId: normalizedReportId,
      paidAt: _clean(accessGrant.paidAt || data.paidAt || new Date().toISOString())
    };
  }

  function _rememberAccessGrant(pending, accessGrant, premiumToken) {
    if (!accessGrant) return;
    _lastAccessGrant = Object.assign({}, accessGrant, {
      reportId: pending && pending.reportId ? pending.reportId : accessGrant.reportId,
      sessionId: accessGrant.sessionId || (pending && pending.reportId ? 'saju-new-year:' + pending.reportId : ''),
      reportSessionId: accessGrant.reportSessionId || accessGrant.sessionId || (pending && pending.reportId ? 'saju-new-year:' + pending.reportId : '')
    });
    _lastPremiumToken = _clean(premiumToken || accessGrant.premiumAccessToken || _readPremiumAccessToken());
    if (_lastPremiumToken) _persistPremiumAccessToken(_lastPremiumToken);
  }

  function _hasReusableAccessFor(pending) {
    if (!_lastAccessGrant || !pending) return false;
    var sameReport = _clean(_lastAccessGrant.reportId) === _clean(pending.reportId);
    var hasEvidence = !!(_clean(_lastAccessGrant.purchaseId) || _clean(_lastAccessGrant.transactionId) || _clean(_lastAccessGrant.paymentId) || _lastPremiumToken);
    return sameReport && hasEvidence;
  }

  async function _runCoinGate(reportId) {
    var requestId = 'saju-new-year:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
    var resolvedCost = _billingCost();
    var premiumToken = _readPremiumAccessToken();
    var headers = _buildAuthHeaders({ 'Content-Type': 'application/json' });
    _log('PaymentVerificationStarted', { featureKey: BILLING_FEATURE_KEY, reportId: reportId });
    if (typeof window._cdOpenPaidServiceGate === 'function') {
      var gateResult = await new Promise(function(resolve) {
        var settled = false;
        function finish(payload) {
          if (settled) return;
          settled = true;
          var raw = payload && typeof payload === 'object' ? payload : {};
          var data = raw && raw.data && typeof raw.data === 'object'
            ? raw.data
            : (raw && raw.payload && typeof raw.payload === 'object')
              ? raw.payload
              : raw;
          var token = _extractPremiumToken(raw);
          if (token) _persistPremiumAccessToken(token);
          _mergeBillingSnapshot(data, 'coin-gate');
          var grant = _normalizeAccessGrant(data, reportId, requestId);
          var grantToken = token || _clean(grant && grant.premiumAccessToken) || _readPremiumAccessToken();
          if (!grant) {
            resolve({ ok: false, status: 500, message: '결제 접근 권한을 확인하지 못했습니다.', requestId: requestId });
            return;
          }
          _log('PaymentVerificationPassed', { featureKey: BILLING_FEATURE_KEY, reportId: reportId, hasPurchaseId: !!grant.purchaseId });
          resolve({ ok: true, accessGrant: grant, premiumAccessToken: grantToken, requestId: requestId });
        }
        function cancel() {
          if (settled) return;
          settled = true;
          resolve({ ok: false, status: 402, message: '결제가 취소되었습니다.', requestId: requestId });
        }
        function fail(error) {
          if (settled) return;
          settled = true;
          resolve({
            ok: false,
            status: Number(error && error.status || 0),
            message: String(error && error.message || '결제 게이트를 불러오지 못했습니다.'),
            requestId: requestId,
            fallback: true,
          });
        }
        try {
          var gate = window._cdOpenPaidServiceGate({
            categoryKey: 'premium-report',
            featureKey: BILLING_FEATURE_KEY,
            serviceType: SERVICE_KEY,
            productKey: API_FEATURE_KEY,
            entitlementKey: 'saju_new_year_pdf',
            paymentPurpose: 'ai_consultation',
            allowedPaymentModes: ['direct', 'monthly', 'pass'],
            title: REASON,
            reason: REASON,
            coinPrice: resolvedCost,
            cost: resolvedCost,
            reportId: reportId,
            sessionId: 'saju-new-year:' + reportId,
            reportSessionId: 'saju-new-year:' + reportId,
            requestId: requestId,
            onGranted: function(transactionId, payload) {
              var grantedPayload = payload && typeof payload === 'object' ? payload : {};
              var txId = _clean((grantedPayload && (grantedPayload.purchaseId || grantedPayload.transactionId)) || transactionId);
              finish(Object.assign({}, grantedPayload, txId ? { purchaseId: txId, transactionId: txId } : {}));
            },
            onPassApplied: function(access) { finish((access && (access.payload || access.rawPayload)) || access || {}); },
            onCancel: cancel
          });
          if (gate && typeof gate.then === 'function') gate.then(function(payload) {
            if (payload === null || payload === undefined || (payload && payload.status === 'cancelled')) cancel();
            else finish(payload);
          }).catch(fail);
          else if (!gate) fail(new Error('결제 게이트를 불러오지 못했습니다.'));
        } catch (_) {
          fail(_);
        }
      });
      if (gateResult.ok || Number(gateResult.status) === 402 || !gateResult.fallback) return gateResult;
    }

    var response = await fetch('/api/billing/coin-gate', {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify({
        categoryKey: 'premium-report',
        featureKey: BILLING_FEATURE_KEY,
        serviceType: SERVICE_KEY,
        productKey: API_FEATURE_KEY,
        entitlementKey: 'saju_new_year_pdf',
        paymentPurpose: 'ai_consultation',
        allowedPaymentModes: ['direct', 'monthly', 'pass'],
        reason: REASON,
        mode: 'saju-new-year',
        reportId: reportId,
        sessionId: 'saju-new-year:' + reportId,
        reportSessionId: 'saju-new-year:' + reportId,
        requestId: requestId,
        coinPrice: resolvedCost,
        cost: resolvedCost,
        forceDeduct: true,
        confirmedByUser: true
      })
    });
    var payload = {};
    try { payload = await response.json(); } catch (_) { payload = {}; }
    var data = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
    var token = _extractPremiumToken(payload);
    if (token) _persistPremiumAccessToken(token);
    _mergeBillingSnapshot(payload, 'coin-gate');
    var grant = _normalizeAccessGrant(data, reportId, requestId);
    var grantToken = token || _clean(grant && grant.premiumAccessToken) || _readPremiumAccessToken();
    if (!response.ok || payload.ok === false || !grant) {
      return {
        ok: false,
        status: response.status,
        code: _clean(payload.code || (payload.error && payload.error.code)),
        message: _clean(payload.message || (payload.error && payload.error.message)) || '신년운세 AI 상담을 위해 원화 결제 또는 이용권 확인이 필요합니다.'
      };
    }
    _log('PaymentVerificationPassed', { featureKey: BILLING_FEATURE_KEY, reportId: reportId, hasPurchaseId: !!grant.purchaseId });
    return { ok: true, accessGrant: grant, premiumAccessToken: grantToken, requestId: requestId };
  }

  async function _postJson(url, payload) {
    var headers = _buildAuthHeaders({ 'Content-Type': 'application/json' });
    var response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify(payload)
    });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok || !body || body.ok === false) {
      var msg = _clean(body && body.message) || ('HTTP ' + response.status);
      _log('RequestFailed', { status: response.status, code: _clean(body && body.code), message: msg });
      var requestError = _buildPdfApiError(body, response.status, msg);
      _attachRequestDebug(requestError, url, response.status, body, headers, _stageForRequestUrl(url));
      requestError.sessionId = _clean(body && body.debugSafe && body.debugSafe.sessionId);
      requestError.causeMessage = _clean(body && body.debugSafe && body.debugSafe.causeMessage);
      requestError.debugSafe = body && body.debugSafe;
      throw requestError;
    }
    return body;
  }

  function _statusQuery(pending) {
    var source = pending && typeof pending === 'object' ? pending : {};
    var jobId = _clean(source.jobId || source.reportId);
    if (jobId) return STATUS_API + '/' + encodeURIComponent(jobId);
    var params = new URLSearchParams();
    if (source.reportId) params.set('reportId', source.reportId);
    if (source.sessionId) params.set('sessionId', source.sessionId);
    if (!source.sessionId && source.reportId) params.set('sessionId', 'saju-new-year:' + source.reportId);
    return STATUS_API + '?' + params.toString();
  }

  function _resultQuery(pending) {
    var source = pending && typeof pending === 'object' ? pending : {};
    var jobId = _clean(source.jobId || source.reportId);
    if (jobId) return RESULT_API + '/' + encodeURIComponent(jobId);
    return RESULT_API;
  }

  function _saveCurrentJob(pending) {
    var source = pending && typeof pending === 'object' ? pending : {};
    var jobId = _clean(source.jobId || source.reportId);
    if (!jobId) return;
    try {
      localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify({
        jobId: jobId,
        reportId: _clean(source.reportId || jobId),
        sessionId: _clean(source.sessionId || ('saju-new-year:' + jobId)),
        targetYear: source.targetYear || null
      }));
    } catch (_) {}
  }

  function _readCurrentJob() {
    try {
      var raw = localStorage.getItem(JOB_STORAGE_KEY);
      if (!raw) return null;
      if (raw.charAt(0) !== '{') return { jobId: raw, reportId: raw, sessionId: 'saju-new-year:' + raw };
      var parsed = JSON.parse(raw);
      var jobId = _clean(parsed && (parsed.jobId || parsed.reportId));
      if (!jobId) return null;
      return {
        jobId: jobId,
        reportId: _clean(parsed.reportId || jobId),
        sessionId: _clean(parsed.sessionId || ('saju-new-year:' + jobId)),
        targetYear: parsed.targetYear || null
      };
    } catch (_) {
      return null;
    }
  }

  function _clearCurrentJob() {
    try { localStorage.removeItem(JOB_STORAGE_KEY); } catch (_) {}
  }

  async function _fetchJobStatus(pending) {
    var headers = _buildAuthHeaders();
    var url = _statusQuery(pending);
    var response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: headers,
      cache: 'no-store'
    });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok || body.ok === false) {
      throw _attachRequestDebug(
        _buildPdfApiError(body, response.status, _clean(body && body.message) || '신년운세 PDF 생성 상태를 확인하지 못했습니다.'),
        url,
        response.status,
        body,
        headers,
        'status'
      );
    }
    return body;
  }

  async function _fetchJobResult(pending) {
    var headers = _buildAuthHeaders();
    var url = _resultQuery(pending);
    var response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: headers,
      cache: 'no-store'
    });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok || body.ok === false) {
      throw _attachRequestDebug(
        _buildPdfApiError(body, response.status, _clean(body && body.message) || '신년운세 PDF 결과를 불러오지 못했습니다.'),
        url,
        response.status,
        body,
        headers,
        'result'
      );
    }
    return body;
  }

  async function _pollJobStatus(pending, stop) {
    var attempts = 0;
    while (!stop || !stop()) {
      attempts += 1;
      try {
        var payload = await _fetchJobStatus(pending);
        var job = _applyJobProgress(payload);
        if (job.status === 'failed') throw _buildPdfApiError({
          code: job.errorCode || 'GENERATION_FAILED',
          message: job.errorMessage || '신년운세 PDF 생성이 중단되었습니다.',
          progress: job
        }, 500, job.errorMessage || '신년운세 PDF 생성이 중단되었습니다.');
        if (_isTerminalStatus(job.status)) return payload;
      } catch (error) {
        if (!stop || !stop()) throw error;
      }
      if (attempts >= 720) {
        var timeoutError = new Error('신년운세 PDF 생성 시간이 길어지고 있습니다. 잠시 후 다시 확인해 주세요.');
        timeoutError.code = 'SAJU_NEW_YEAR_RUNNING_TIMEOUT';
        timeoutError.stage = 'status';
        throw timeoutError;
      }
      await _sleep(2500);
    }
    return null;
  }

  async function _startMockGeneration(payload) {
    var jobId = _clean(payload && (payload.jobId || payload.reportId));
    if (!jobId) throw _buildPdfApiError({ code: 'MISSING_JOB_ID', message: 'jobId가 필요합니다.' }, 422, 'jobId가 필요합니다.');
    return _postJson(GENERATE_MOCK_API, {
      jobId: jobId,
      reportId: jobId,
      sessionId: _clean(payload.sessionId || payload.reportSessionId || ('saju-new-year:' + jobId)),
      reportSessionId: _clean(payload.sessionId || payload.reportSessionId || ('saju-new-year:' + jobId))
    });
  }

  function _mdToHtml(text) {
    var lines = _clean(text).split(/\n+/);
    var html = '';
    lines.forEach(function (line) {
      if (/^##\s+/.test(line)) html += '<h4>' + _esc(line.replace(/^##\s+/, '')) + '</h4>';
      else if (_clean(line)) html += '<p>' + _esc(line) + '</p>';
    });
    return html;
  }

  function _renderToc() {
    var items = document.querySelectorAll('.ny-toc-item');
    Array.prototype.forEach.call(items, function (item) {
      var ch = Number(item.getAttribute('data-ny-chapter') || 0);
      item.classList.toggle('active', ch === _activeChapter);
    });
  }

  function _roman(number) {
    return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][Number(number || 1) - 1] || String(number || '');
  }

  function _syncTocItems() {
    var toc = document.querySelector('#nyResultScreen .lb-toc');
    if (!toc || !_chapters.length) return;
    var items = document.querySelectorAll('#nyResultScreen .ny-toc-item');
    if (items.length === _chapters.length) return;
    toc.innerHTML = _chapters.map(function (chapter, index) {
      var no = Number(chapter && chapter.no || index + 1);
      var label = TOC_LABELS[no - 1] || '장';
      return '<button type="button" class="lb-toc-item ny-toc-item' + (index === 0 ? ' active' : '') + '" data-ny-chapter="' + no + '">' + _esc(_roman(no) + ' ' + label) + '</button>';
    }).join('');
  }

  function _monthChipHtml(item) {
    var month = Number(item && item.month || 0);
    var label = _clean(item && (item.label || item.summary || item.action || item.caution));
    var score = Number(item && item.score || 0);
    var decision = _clean(item && item.decision);
    return '<div class="ny-month-chip"><span>' + _esc(month ? month + '월' : '월별 흐름') + '</span><span>' + _esc([decision, score ? score + '점' : '', label].filter(Boolean).slice(0, 2).join(' · ')) + '</span></div>';
  }

  function _fallbackSummary(response) {
    var master = response && response.newYearMasterJson && typeof response.newYearMasterJson === 'object' ? response.newYearMasterJson : {};
    var yearly = master.yearlyFlow && typeof master.yearlyFlow === 'object' ? master.yearlyFlow : {};
    var monthly = Array.isArray(master.monthlyFlow) ? master.monthlyFlow.slice() : [];
    var opportunities = monthly.slice().sort(function (a, b) { return Number(b.finalScore || b.score || 0) - Number(a.finalScore || a.score || 0); }).slice(0, 3);
    var cautions = monthly.slice().sort(function (a, b) { return Number(a.finalScore || a.score || 100) - Number(b.finalScore || b.score || 100); }).slice(0, 3);
    return {
      cards: [
        { label: '세운', value: _clean(yearly.pillar || yearly.label) || '세운 확인' },
        { label: '십성', value: _clean(yearly.tenGodToDayMaster || yearly.tenGod) || '중심 기운' },
        { label: '일간 관계', value: _clean(yearly.dayMasterRelation) || '균형과 조율' },
        { label: '챕터', value: (_chapters.length || TOTAL_CHAPTERS) + '챕터 상담문' }
      ],
      opportunities: opportunities,
      cautions: cautions,
      consultation: [
        '확장 흐름에서는 실행을 앞에 두고, 부담이 커지는 흐름에서는 약속과 지출을 차분히 정비하는 것이 핵심입니다.',
        '이 리포트는 한 해의 흐름을 단정하지 않고, 월별 선택 기준과 실천 순서로 풀어낸 상담서입니다.'
      ],
      quality: { status: response && response.qualityStatus || 'passed' }
    };
  }

  function _renderClientSummary(response) {
    var summary = response && response.clientSummary && typeof response.clientSummary === 'object'
      ? response.clientSummary
      : _fallbackSummary(response || {});
    var cardsEl = _qs('nyInsightCards');
    var oppEl = _qs('nyOpportunityMonths');
    var cautionEl = _qs('nyCautionMonths');
    var linesEl = _qs('nyConsultationLines');
    var badgeEl = _qs('nyQualityBadge');
    var cards = Array.isArray(summary.cards) ? summary.cards.slice(0, 6) : [];
    var opportunities = Array.isArray(summary.opportunities) ? summary.opportunities.slice(0, 3) : [];
    var cautions = Array.isArray(summary.cautions) ? summary.cautions.slice(0, 3) : [];
    var lines = Array.isArray(summary.consultation) ? summary.consultation.slice(0, 3) : [];
    if (cardsEl) {
      cardsEl.innerHTML = cards.map(function (item) {
        return '<div class="ny-insight-card"><strong>' + _esc(item && item.label) + '</strong><span>' + _esc(item && item.value) + '</span></div>';
      }).join('');
    }
    if (oppEl) oppEl.innerHTML = opportunities.length ? opportunities.map(_monthChipHtml).join('') : '<div class="ny-month-chip"><span>기회</span><span>월별 흐름 확인</span></div>';
    if (cautionEl) cautionEl.innerHTML = cautions.length ? cautions.map(_monthChipHtml).join('') : '<div class="ny-month-chip"><span>주의</span><span>월별 흐름 확인</span></div>';
    if (linesEl) linesEl.innerHTML = lines.map(function (line) { return '<li>' + _esc(line) + '</li>'; }).join('');
    if (badgeEl) {
      var quality = summary.quality && typeof summary.quality === 'object' ? summary.quality : {};
      var qualityStatus = _clean(quality.status || summary.qualityStatus).toLowerCase();
      badgeEl.textContent = quality.pdfReady === false
        ? '상담서 보강 필요'
        : qualityStatus && qualityStatus !== 'passed'
          ? '상담서 확인 중'
          : '상담서 준비 완료';
    }
  }

  function _updateChapterControls() {
    var indicator = _qs('nyChapterIndicator');
    var prev = _qs('nyPrevChapterBtn');
    var next = _qs('nyNextChapterBtn');
    var total = _chapters.length || TOTAL_CHAPTERS;
    if (indicator) indicator.textContent = _activeChapter + ' / ' + total;
    if (prev) prev.disabled = _activeChapter <= 1;
    if (next) next.disabled = _activeChapter >= total;
  }

  function _renderChapter(chapterNo) {
    var content = _qs('nyChapterContent');
    if (!content) return;
    var chapter = _chapters[chapterNo - 1] || null;
    if (!chapter) {
      content.innerHTML = '<p>챕터를 불러오지 못했습니다.</p>';
      return;
    }
    _activeChapter = chapterNo;
    if (content && typeof content.scrollIntoView === 'function') {
      try { content.scrollIntoView({ block: 'nearest' }); } catch (_) {}
    }
    var sections = Array.isArray(chapter.categories) && chapter.categories.length
      ? chapter.categories.map(function (section) {
        return '<section class="lb-result-article__section"><h4 class="lb-result-article__section-title">' + _esc(section.title) + '</h4><div class="lb-result-article__section-body">' + _mdToHtml(section.finalText || section.text || '') + '</div></section>';
      }).join('')
      : _mdToHtml(chapter.text || '');
    content.innerHTML = '<article class="lb-result-article"><h3>' + _esc(chapter.title) + '</h3>' + sections + '</article>';
    _renderToc();
    _updateChapterControls();
  }

  function _textBlockHtml(value) {
    var text = _clean(value);
    if (!text) return '<p>상담문을 정리하지 못했습니다.</p>';
    return text.split(/\n{2,}/).map(function (part) {
      return '<p>' + _esc(part).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function _listBlockHtml(items) {
    var list = Array.isArray(items) ? items.map(function (item) { return _clean(item); }).filter(Boolean) : [];
    if (!list.length) return '';
    return '<ul>' + list.map(function (item) { return '<li>' + _esc(item) + '</li>'; }).join('') + '</ul>';
  }

  function _timingBlockHtml(timing) {
    var data = timing && typeof timing === 'object' ? timing : {};
    var monthly = Array.isArray(data.monthlyNotes) ? data.monthlyNotes : [];
    var html = '';
    if (data.goodPeriods && data.goodPeriods.length) {
      html += '<div class="ny-ai-period"><strong>좋은 시기</strong>' + _listBlockHtml(data.goodPeriods) + '</div>';
    }
    if (data.cautionPeriods && data.cautionPeriods.length) {
      html += '<div class="ny-ai-period"><strong>조심할 시기</strong>' + _listBlockHtml(data.cautionPeriods) + '</div>';
    }
    if (monthly.length) {
      html += '<div class="ny-ai-month-grid">' + monthly.map(function (item) {
        return '<div class="ny-ai-month"><strong>' + _esc(item && item.month || '시기') + '</strong><span>' + _esc(item && item.note) + '</span></div>';
      }).join('') + '</div>';
    }
    return html || '<p>월운 데이터가 충분하지 않아 구체 월별 단정보다는 분기와 계절 흐름 중심으로 상담합니다.</p>';
  }

  function _chapterSectionsHtml(sections) {
    var list = Array.isArray(sections) ? sections : [];
    if (!list.length) return '';
    return '<div class="ny-ai-chapter-sections">' + list.map(function (section) {
      var title = _clean(section && section.title);
      var body = _clean(section && section.body);
      if (!body) return '';
      return '<section class="ny-ai-chapter-section">' + (title ? '<h5>' + _esc(title) + '</h5>' : '') + _textBlockHtml(body) + '</section>';
    }).join('') + '</div>';
  }

  function _chapterConsultationsHtml(chapters) {
    var list = Array.isArray(chapters) ? chapters : [];
    if (!list.length) return '';
    return '<section class="ny-ai-result-card ny-ai-result-card--chapters"><h4>신년운세 전체 상담</h4><div class="ny-ai-chapter-list">' + list.map(function (chapter, index) {
      var no = Number(chapter && chapter.no || index + 1);
      var title = _clean(chapter && chapter.title) || (no + '장 신년운세 상담');
      var overview = _clean(chapter && chapter.overview);
      var takeaways = Array.isArray(chapter && chapter.keyTakeaways) ? chapter.keyTakeaways : [];
      var actions = Array.isArray(chapter && chapter.actionItems) ? chapter.actionItems : [];
      return '<article class="ny-ai-chapter-card">'
        + '<div class="ny-ai-chapter-kicker">' + _esc(no + '장') + '</div>'
        + '<h5>' + _esc(title) + '</h5>'
        + (overview ? _textBlockHtml(overview) : '')
        + _chapterSectionsHtml(chapter && chapter.sections)
        + (takeaways.length ? '<div class="ny-ai-chapter-notes"><strong>핵심 포인트</strong>' + _listBlockHtml(takeaways) + '</div>' : '')
        + (actions.length ? '<div class="ny-ai-chapter-notes"><strong>행동 조언</strong>' + _listBlockHtml(actions) + '</div>' : '')
        + '</article>';
    }).join('') + '</div></section>';
  }

  function _renderAIConsultationResult(response, profile, targetYear) {
    _resultPayload = response;
    _pendingGeneration = null;
    _chapters = [];
    var result = response && response.result && typeof response.result === 'object' ? response.result : {};
    var cards = _qs('nyConsultationResultCards');
    var nameEl = _qs('nyResultName');
    var dateEl = _qs('nyResultDate');
    if (nameEl) nameEl.textContent = targetYear + ' 신년운세 AI 상담';
    if (dateEl && profile && profile.birth) {
      dateEl.textContent = (profile.name || '사용자') + ' · ' + profile.birth.year + '. ' + profile.birth.month + '. ' + profile.birth.day + ' 생 · ' + new Date().toLocaleDateString('ko-KR') + ' 상담';
    }
    if (!cards) return;
    var followUps = Array.isArray(result.followUpQuestions) ? result.followUpQuestions : [];
    cards.innerHTML = [
      '<section class="ny-ai-result-card"><h4>상담 요약</h4>' + _textBlockHtml(result.summary) + '</section>',
      '<section class="ny-ai-result-card"><h4>올해의 큰 흐름</h4>' + _textBlockHtml(result.yearlyFlow) + '</section>',
      '<section class="ny-ai-result-card"><h4>질문 주제별 답변</h4>' + _textBlockHtml(result.topicAnswer || result.rawText) + '</section>',
      '<section class="ny-ai-result-card"><h4>좋은 시기와 조심할 시기</h4>' + _timingBlockHtml(result.timing) + '</section>',
      _chapterConsultationsHtml(result.chapterConsultations),
      '<section class="ny-ai-result-card"><h4>현실적인 조언</h4>' + (_listBlockHtml(result.actionGuide) || _textBlockHtml(result.actionGuide)) + '</section>',
      '<section class="ny-ai-result-card"><h4>마지막 한마디</h4>' + _textBlockHtml(result.closingMessage) + '</section>',
      '<section class="ny-ai-result-card ny-ai-result-card--follow"><h4>이어 물어보기</h4>' + (followUps.length ? '<div class="ny-followup-list">' + followUps.map(function (item) { return '<button type="button" class="ny-followup-chip" data-ny-followup="' + _esc(item) + '">' + _esc(item) + '</button>'; }).join('') + '</div>' : '<p>올해 가장 궁금한 주제를 하나 더 좁혀 물어보면 흐름이 더 섬세하게 열립니다.</p>') + '</section>'
    ].filter(Boolean).join('');
    Array.prototype.forEach.call(cards.querySelectorAll('.ny-followup-chip'), function (btn) {
      btn.addEventListener('click', function () {
        var input = _questionInput();
        if (input) {
          input.value = btn.getAttribute('data-ny-followup') || '';
          input.focus();
        }
        _showScreen('nyStartScreen');
      });
    });
  }

  function _bindToc() {
    var toc = document.querySelector('#nyResultScreen .lb-toc');
    if (!toc || toc.dataset.nyBound === '1') return;
    toc.dataset.nyBound = '1';
    toc.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;
      var btn = target.closest('.ny-toc-item');
      if (!btn) return;
      var chapter = Number(btn.getAttribute('data-ny-chapter') || 1);
      _renderChapter(chapter);
    });
  }

  function _renderResult(response, profile, targetYear) {
    _resultPayload = response;
    _pendingGeneration = null;
    _chapters = Array.isArray(response.chapters) ? response.chapters : [];
    var nameEl = _qs('nyResultName');
    var dateEl = _qs('nyResultDate');
    if (nameEl) nameEl.textContent = targetYear + ' 신년운세 프리미엄 리포트';
    if (dateEl && profile && profile.birth) {
      dateEl.textContent = (profile.name || '사용자') + ' · ' + profile.birth.year + '. ' + profile.birth.month + '. ' + profile.birth.day + ' 생 · ' + new Date().toLocaleDateString('ko-KR') + ' 발행';
    }
    _activeChapter = 1;
    _renderClientSummary(response);
    _syncTocItems();
    _bindToc();
    _renderChapter(1);
  }

  function _buildPendingGeneration() {
    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth || !profile.birth.year) {
      _updateProfileStatus(null);
      _setError('정확한 신년운세 계산을 위해 생년월일 정보를 확인해 주세요.', {
        showBirthInput: true,
        hideRetry: true,
        detail: '사주 원국이 확인되어야 대상 연도의 세운과 월운을 정확히 계산할 수 있습니다.'
      });
      return null;
    }
    var targetYear = _targetYear();
    if (!targetYear) {
      _setError('신년운세를 볼 대상 연도를 선택해 주세요.', {
        detail: '대상 연도는 현재 연도부터 10년 뒤까지 선택할 수 있습니다.'
      });
      return null;
    }
    var normalizedBirth = _normalizeBirthInput(profile);
    if (!normalizedBirth.birthDate) {
      _updateProfileStatus(null);
      _setError('정확한 신년운세 계산을 위해 생년월일 정보를 확인해 주세요.', {
        showBirthInput: true,
        hideRetry: true,
        detail: '생년월일이 비어 있으면 AI 상담 전에 원국 계산을 완료할 수 없습니다.'
      });
      return null;
    }
    var question = _currentQuestion();
    if (question.length < 5) {
      _setError('신년운세에서 궁금한 질문을 먼저 입력해 주세요.', {
        hideRetry: true,
        detail: '예: 선택한 해에 제 직업운과 수입 흐름은 어떻게 될까요?'
      });
      return null;
    }
    if (typeof window.computeProfileForModal === 'function') {
      try { window.computeProfileForModal(profile); } catch (_) {}
    }
    _log('BirthInputValidated', { birthDate: normalizedBirth.birthDate, isTimeUnknown: normalizedBirth.isTimeUnknown });
    _log('TargetYearValidated', { targetYear: targetYear });
    return {
      reportId: _buildReportId(targetYear),
      targetYear: targetYear,
      profile: profile,
      normalizedBirth: normalizedBirth,
      question: question,
      category: _currentCategory()
    };
  }

  function _runAfterBillingAI(pending, accessGrant, premiumToken) {
    _setStage('calculate');
    _setProgress(2, '명식과 올해의 세운을 읽고 있어요.');
    _rememberAccessGrant(pending, accessGrant, premiumToken);
    _log('RequestReceived', {
      reportId: pending.reportId,
      targetYear: pending.targetYear,
      category: pending.category,
      questionLength: pending.question.length
    });
    var payload = _buildAIConsultationPayload(pending, accessGrant, premiumToken);
    return _postJson(AI_CONSULTATION_API, payload).then(function (data) {
      if (!data || data.ok === false || !data.result) {
        throw _buildPdfApiError(data, 502, '신년운세 AI 상담 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
      _setStage('archive');
      _setProgress(3, '질문에 맞는 올해의 흐름을 정리하고 있어요.');
      _renderAIConsultationResult(data, pending.profile, pending.targetYear);
      _showScreen('nyResultScreen');
      _log('ConsultationCompleted', {
        reportId: pending.reportId,
        targetYear: pending.targetYear,
        provider: _clean(data.provider),
        isMock: data.isMock === true
      });
    });
  }

  function _runAfterBilling(pending, accessGrant, premiumToken) {
    _setStage('calculate');
    _setProgress(2, '사주 원국과 대상 연도의 흐름을 계산하는 중입니다');
    _rememberAccessGrant(pending, accessGrant, premiumToken);
    _log('RequestReceived', { reportId: pending.reportId, targetYear: pending.targetYear });
    _log('PaymentVerificationStarted', { featureKey: BILLING_FEATURE_KEY });
    _log('LocalEngineStarted', { targetYear: pending.targetYear });
    var preparePayload = _buildPreparePayload(
      pending.reportId,
      pending.targetYear,
      pending.profile,
      pending.normalizedBirth,
      accessGrant,
      premiumToken || _readPremiumAccessToken()
    );
    pending.sessionId = preparePayload.sessionId || preparePayload.reportSessionId;
    var stopPolling = false;
    var polling = _pollJobStatus(pending, function () { return stopPolling; }).catch(function (error) {
      if (!stopPolling) _logError(error, { stage: 'status', reportId: pending.reportId });
      return null;
    });
    return _postPrepareUntilReady(preparePayload).then(function (data) {
      _setStage('archive');
      if (!_handlePrepareSuccess(data, pending.profile, pending.targetYear)) {
        throw _buildPdfApiError(data, 422, '신년운세 PDF 생성 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }).finally(function () {
      stopPolling = true;
      polling.catch(function () {});
    });
  }

  function _runAfterBillingMock(pending, accessGrant, premiumToken) {
    _setStage('billing');
    _setProgress(1, '결제 검증 중입니다.');
    _rememberAccessGrant(pending, accessGrant, premiumToken);
    _log('RequestReceived', { reportId: pending.reportId, targetYear: pending.targetYear });
    _log('PaymentVerificationStarted', { featureKey: BILLING_FEATURE_KEY });
    var basePayload = _buildPreparePayload(
      pending.reportId,
      pending.targetYear,
      pending.profile,
      pending.normalizedBirth,
      accessGrant,
      premiumToken || _readPremiumAccessToken()
    );
    pending.sessionId = basePayload.sessionId || basePayload.reportSessionId;
    return _postJson(VERIFY_ACCESS_API, basePayload).then(function (verifyPayload) {
      if (!verifyPayload || verifyPayload.accessGranted !== true) {
        throw _buildPdfApiError(verifyPayload, 402, '신년운세 PDF 생성 권한을 확인하지 못했습니다.');
      }
      _setStage('calculate');
      _setProgress(1, 'PDF 생성 준비 중입니다.');
      var createPayload = Object.assign({}, basePayload, {
        accessGrant: Object.assign({}, basePayload.accessGrant || {}, verifyPayload.accessGrant || {}),
        verifiedAccess: verifyPayload.access || null
      });
      return _postJson(CREATE_JOB_API, createPayload);
    }).then(function (createdPayload) {
      var job = _applyJobProgress(createdPayload);
      var jobId = _clean(job.jobId || createdPayload.jobId || createdPayload.reportId || pending.reportId);
      pending.jobId = jobId;
      pending.reportId = jobId;
      pending.sessionId = _clean(createdPayload.sessionId || job.sessionId || pending.sessionId || ('saju-new-year:' + jobId));
      _saveCurrentJob(pending);
      var stopPolling = false;
      var polling = _pollJobStatus(pending, function () { return stopPolling; });
      var generating = _startMockGeneration({
        jobId: jobId,
        reportId: jobId,
        sessionId: pending.sessionId,
        reportSessionId: pending.sessionId
      }).catch(function (error) {
        if (!stopPolling) throw error;
        return null;
      });
      return Promise.all([polling, generating]).then(function (results) {
        var statusPayload = results[0] || results[1] || createdPayload;
        var finalJob = _applyJobProgress(statusPayload);
        if (finalJob.status !== 'completed') {
          throw _buildPdfApiError(statusPayload, 422, '신년운세 PDF 생성이 아직 완료되지 않았습니다.');
        }
        return _fetchJobResult(pending);
      }).finally(function () {
        stopPolling = true;
      });
    }).then(function (resultPayload) {
      _setStage('archive');
      if (!_handlePrepareSuccess(resultPayload, pending.profile, pending.targetYear)) {
        throw _buildPdfApiError(resultPayload, 422, '신년운세 PDF 생성 결과를 확인하지 못했습니다.');
      }
    });
  }

  function _runBillingAndGeneration(pending) {
    _showScreen('nyLoadingScreen');
    _setStage('billing');
    _setProgress(1, '결제창에서 권한과 잔액을 확인하는 중입니다');
    if (_hasReusableAccessFor(pending)) {
      _setProgress(1, '확인된 결제 권한으로 신년운세 AI 상담을 다시 시작합니다');
      return _runAfterBillingAI(pending, _lastAccessGrant, _lastPremiumToken);
    }
    return _refreshNewYearBillingSnapshot().catch(function () { return null; }).then(function () {
      return _runCoinGate(pending.reportId);
    }).then(function (gate) {
      if (!gate.ok) {
        _logError(gate, { stage: 'billing', reportId: pending.reportId });
        _setError(gate.message || '신년운세 AI 상담을 위해 원화 결제 또는 이용권 확인이 필요합니다.', _billingErrorOptions(gate));
        return null;
      }
      _rememberAccessGrant(pending, gate.accessGrant, gate.premiumAccessToken);
      return _runAfterBillingAI(pending, gate.accessGrant, gate.premiumAccessToken);
    });
  }

  function _restoreCurrentNewYearJob(profile) {
    return false;
    var stored = _readCurrentJob();
    if (!stored || !stored.jobId) return false;
    var activeProfile = profile || _getActiveBirthProfile();
    var pending = {
      jobId: stored.jobId,
      reportId: stored.reportId || stored.jobId,
      sessionId: stored.sessionId || ('saju-new-year:' + stored.jobId),
      targetYear: stored.targetYear || _targetYear(),
      profile: activeProfile,
      normalizedBirth: activeProfile ? _normalizeBirthInput(activeProfile) : null
    };
    _pendingGeneration = pending;
    _showScreen('nyLoadingScreen');
    _setBusy(true);
    _fetchJobStatus(pending).then(function (statusPayload) {
      var job = _applyJobProgress(statusPayload);
      if (job.status === 'completed') return _fetchJobResult(pending);
      if (job.status === 'failed') {
        throw _buildPdfApiError(statusPayload, 500, job.errorMessage || '신년운세 PDF 생성 중 문제가 발생했습니다.');
      }
      return _pollJobStatus(pending).then(function (finalStatusPayload) {
        var finalJob = _applyJobProgress(finalStatusPayload);
        if (finalJob.status === 'failed') {
          throw _buildPdfApiError(finalStatusPayload, 500, finalJob.errorMessage || '신년운세 PDF 생성 중 문제가 발생했습니다.');
        }
        return _fetchJobResult(pending);
      });
    }).then(function (resultPayload) {
      if (!_handlePrepareSuccess(resultPayload, pending.profile, pending.targetYear || _targetYear())) {
        throw _buildPdfApiError(resultPayload, 422, '신년운세 PDF 결과를 복구하지 못했습니다.');
      }
    }).catch(function (error) {
      _logError(error, { stage: 'restore', reportId: pending.reportId, sessionId: pending.sessionId });
      if (Number(error && error.status || 0) === 404) _clearCurrentJob();
      _setError(_publicErrorMessage(error, '신년운세 PDF 상태를 복구하지 못했습니다. 다시 시도해주세요.'), {
        detail: '새로고침 후 저장된 jobId의 status/result 조회가 실패했습니다.',
        retryText: '다시 확인'
      });
    }).finally(function () {
      _setBusy(false);
    });
    return true;
  }

  window.openSajuNewYearModal = function () {
    _log('ModalOpen');
    var modal = _qs('sajuNewYearModal');
    if (!modal) return;
    _syncTargetYearBounds();
    _bindQuestionControls();
    _refreshNewYearBillingSnapshot();
    var profile = _getActiveBirthProfile();
    _updateProfileStatus(profile);
    if (profile && profile.birth) {
      window.__cdActiveBirthProfile = profile;
      _renderProfileSummary(profile);
      if (!_restoreCurrentNewYearJob(profile)) _showScreen('nyStartScreen');
    } else {
      _setError('정확한 신년운세 계산을 위해 생년월일 정보를 확인해 주세요.', {
        showBirthInput: true,
        hideRetry: true,
        detail: '신년운세 AI 상담은 사주 원국과 대상 연도의 흐름을 함께 계산하므로 생년월일 입력이 먼저 필요합니다.'
      });
    }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
  };

  window.backSajuNewYearStart = function () {
    _stopProgressAnimation();
    _setBusy(false);
    _generating = false;
    _syncTargetYearBounds();
    _updateProfileStatus(_getActiveBirthProfile());
    _showScreen('nyStartScreen');
  };

  window.prevSajuNewYearChapter = function () {
    if (_activeChapter > 1) _renderChapter(_activeChapter - 1);
  };

  window.nextSajuNewYearChapter = function () {
    var total = _chapters.length || TOTAL_CHAPTERS;
    if (_activeChapter < total) _renderChapter(_activeChapter + 1);
  };

  window.closeSajuNewYearModal = function () {
    var modal = _qs('sajuNewYearModal');
    if (!modal) return;
    _stopProgressAnimation();
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.focusSajuNewYearBirthInput = function () {
    window.closeSajuNewYearModal();
    var target = _qs('birthDate') || _qs('destinyCardForm') || document.querySelector('[name="birthDate"], [data-saju-input]');
    if (!target) return;
    try { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) { target.scrollIntoView(); }
    try { if (typeof target.focus === 'function') target.focus({ preventScroll: true }); } catch (_) {}
  };

  window.openSajuNewYearCharge = function () {
    if (typeof window.__cdOpenChargeModal === 'function') {
      window.closeSajuNewYearModal();
      window.__cdOpenChargeModal();
      return;
    }
    var chargeAction = document.querySelector('[data-action="openGoldenGrainCharge"]');
    if (chargeAction && typeof chargeAction.click === 'function') {
      window.closeSajuNewYearModal();
      chargeAction.click();
      return;
    }
    _setError('결제 창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.', {
      detail: '상단의 이용권 상점에서 원화 결제 또는 이용권 상태를 확인해 주세요.',
      retryText: '다시 확인'
    });
  };

  window.openSajuNewYearLogin = function () {
    window.closeSajuNewYearModal();
    var nextPath = (window.location.pathname || '/') + (window.location.search || '') + (window.location.hash || '');
    if (typeof window.__cdOpenLoginRequiredModal === 'function') {
      window.__cdOpenLoginRequiredModal({ nextPath: nextPath, reason: 'saju_new_year_pdf' });
      return;
    }
    window.location.href = '/login?next=' + encodeURIComponent(nextPath || '/');
  };

  window.generateSajuNewYear = function () {
    if (_generating) return;
    var pending = _hasReusableAccessFor(_pendingGeneration) ? _pendingGeneration : _buildPendingGeneration();
    if (!pending) return;
    _pendingGeneration = pending;
    _refreshNewYearBillingSnapshot();

    _generating = true;
    _setBusy(true);
    _runBillingAndGeneration(pending).catch(function (error) {
      _logError(error, { stage: error && error.stage || 'generate', reportId: pending.reportId });
      var options = Number(error && error.status || 0) === 401
        ? _billingErrorOptions(error)
        : {
          detail: _hasReusableAccessFor(pending)
            ? '결제 내역은 확인되었습니다. 재결제 없이 같은 신년운세 AI 상담을 다시 시도할 수 있습니다.'
            : '결제 권한 확인 또는 상담 생성 준비 중 문제가 생겼습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요.',
          retryText: _hasReusableAccessFor(pending) ? '재결제 없이 다시 상담' : '상담 다시 확인'
        };
      _setError(_publicErrorMessage(error, '신년운세 AI 상담 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'), options);
    }).finally(function () {
      _generating = false;
      _setBusy(false);
      _stopProgressAnimation();
    });
  };

  window.confirmSajuNewYearPayment = function () {
    if (_generating) return;
    var pending = _pendingGeneration || _buildPendingGeneration();
    if (!pending) return;
    _pendingGeneration = pending;
    _generating = true;
    _setBusy(true);
    _runBillingAndGeneration(pending).catch(function (error) {
      _logError(error, { stage: error && error.stage || 'generate', reportId: pending.reportId });
      _setError(_publicErrorMessage(error, '신년운세 AI 상담 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'), {
        detail: '결제 권한이 확인된 뒤 상담 생성 단계에서 문제가 생겼습니다. 다시 시도하면 기존 권한을 먼저 조회합니다.',
        retryText: '상담 다시 확인'
      });
    }).finally(function () {
      _generating = false;
      _setBusy(false);
      _stopProgressAnimation();
    });
  };

  window.downloadSajuNewYearPdf = function () {
    var result = _resultPayload || {};
    var ready = result.pdfReady && typeof result.pdfReady === 'object' ? result.pdfReady : {};
    var resolvedUrl = _clean(
      result.downloadUrl
      || result.pdfUrl
      || result.directDownloadUrl
      || ready.downloadUrl
      || ready.pdfUrl
      || ready.directDownloadUrl
    );

    if (resolvedUrl) {
      var documentUrl = resolvedUrl;
      if (documentUrl.indexOf('/api/premium/pdf-archive/') >= 0 && !/[?&]format=/.test(documentUrl)) {
        documentUrl += (documentUrl.indexOf('?') >= 0 ? '&' : '?') + 'format=pdf';
      }
      var fileName = _clean(ready.filename || result.filename || ('saju-new-year-' + (result.targetYear || ready.targetYear || 'report') + '.pdf')).replace(/\.html$/i, '.pdf');
      var link = document.createElement('a');
      link.href = documentUrl;
      link.download = fileName || 'saju-new-year-report.pdf';
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(function () {
        try { document.body.removeChild(link); } catch (_) {}
      }, 0);
      return;
    }

    _setError('신년운세 PDF가 아직 완성되지 않았습니다.', {
      detail: '고품질 원고 검증과 PDF 저장 주소가 모두 완료된 뒤에만 다운로드할 수 있습니다.',
      retryText: '생성 다시 확인'
    });
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');
    if (action === 'openSajuNewYearModal') { window.openSajuNewYearModal(); return; }
    if (action === 'closeSajuNewYearModal') { window.closeSajuNewYearModal(); return; }
    if (action === 'backSajuNewYearStart') { window.backSajuNewYearStart(); return; }
    if (action === 'generateSajuNewYear') { window.generateSajuNewYear(); return; }
    if (action === 'confirmSajuNewYearPayment') { window.confirmSajuNewYearPayment(); return; }
    if (action === 'downloadSajuNewYearPdf') { window.downloadSajuNewYearPdf(); return; }
    if (action === 'focusSajuNewYearBirthInput') { window.focusSajuNewYearBirthInput(); return; }
    if (action === 'openSajuNewYearCharge') { window.openSajuNewYearCharge(); return; }
    if (action === 'prevSajuNewYearChapter') { window.prevSajuNewYearChapter(); return; }
    if (action === 'nextSajuNewYearChapter') { window.nextSajuNewYearChapter(); return; }
  });

  try { window.__cdSajuNewYearCoverImage = COVER_IMAGE; } catch (_) {}
})();
