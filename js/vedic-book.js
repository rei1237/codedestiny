/**
 * Vedic Premium PDF (Jyotish)
 * Worker-native local-first premium pipeline.
 */
(function () {
  'use strict';

  var VEDIC_FEATURE_KEY = 'premium_pdf_vedic';
  var VEDIC_PREPARE_API = '/api/vedic/premium/prepare';
  var VEDIC_STATUS_API = '/api/vedic/premium/status';
  var VEDIC_CHAPTERS_API = '/api/vedic/premium/chapters';
  var VEDIC_PLANETS_API = '/api/vedic/planets';
  var VEDIC_TOTAL_CHAPTERS = 12;
  var VEDIC_COIN_COST = 390;
  var VEDIC_LOCAL_MANUSCRIPT_SOURCE = 'local-assembled';
  var VEDIC_CLIENT_EVIDENCE_SCHEMA_VERSION = 'vedic-premium-client-evidence.v1';
  var VEDIC_STATUS_MAX_ATTEMPTS = 150;
  var VEDIC_STATUS_POLL_MS = 4000;
  var VEDIC_PROGRESS_STAGE_TITLES = [
    '프로필 정보를 확인하는 중입니다',
    '베다 차트를 계산하고 있습니다',
    '라그나와 나크샤트라 근거를 정리하고 있습니다',
    '행성·하우스·다샤 신호를 검증하고 있습니다',
    '직업·관계·재물 상담 문장을 구성하고 있습니다',
    '상징 문장과 시각 요약을 조율하고 있습니다',
    '프리미엄 PDF를 렌더링하고 있습니다',
    'PDF 저장 정보를 확인하고 있습니다',
    '상담 리포트 완성도를 점검하고 있습니다',
    '챕터 목차를 정리하고 있습니다',
    '결과 화면을 준비하고 있습니다',
    '완료'
  ];

  var _chapters = [];
  var _canonicalChapters = [];
  var _resultPayload = null;
  var VEDIC_UI_CHAPTER_TITLES = [
    '베다 차트 전체 총론',
    '라그나와 타고난 인생 설계',
    '문 사인과 나크샤트라 심층 해석',
    '태양과 자아의 방향성',
    '행성들이 말하는 재능과 성향',
    '하우스로 보는 인생 영역',
    '직업과 사회적 성공운',
    '재물과 풍요의 흐름',
    '사랑과 배우자운',
    '다샤로 보는 운의 흐름',
    '카르마와 영적 성장의 방향',
    '최종 베다 마스터플랜'
  ];
  var _generating = false;
  var _progressTimer = null;
  var _premiumAccessVerifiedUntil = 0;
  var _premiumPaidUntil = 0;
  var _currentVedicSessionId = '';
  var _currentVedicReportId = '';
  var _currentVedicPaymentRequestId = '';
  var _lastPremiumPayment = null;

  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }

  function _detachModalFromResultPage(modal) {
    try {
      if (!modal || !modal.parentElement) return;
      if (typeof modal.closest === 'function' && modal.closest('#resultPage')) {
        document.body.appendChild(modal);
      }
    } catch (_) {}
  }

  function _logStage(stage, meta) {
    try { console.info('[VedicBook][' + stage + ']', meta || {}); } catch (_) {}
  }

  function normalizeVedicError(error) {
    if (error instanceof Error) {
      return { name: error.name, message: error.message, stack: error.stack, status: error.status, code: error.code, stage: error.stage, payloadSafe: error.payloadSafe };
    }
    if (typeof error === 'object' && error !== null) {
      try { return JSON.parse(JSON.stringify(error)); } catch (_) { return { message: String(error) }; }
    }
    return { message: String(error) };
  }

  function _shortList(value, limit) {
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
      sessionId: _clean(data.sessionId || debugSafe.sessionId || nested.sessionId) || undefined,
      executionId: _clean(data.executionId || debugSafe.executionId || nested.executionId) || undefined,
      missing: _shortList(data.missing || nested.missing || data.hardMissingFields, 6),
      issues: _shortList(data.issues || nested.issues || data.errors || nested.errors, 6),
      debugSafe: Object.keys(debugSafe).length ? debugSafe : undefined
    };
  }

  function _buildVedicApiError(pack, fallbackMessage, context) {
    var res = pack && pack.res ? pack.res : {};
    var payload = pack && pack.json && typeof pack.json === 'object'
      ? pack.json
      : (pack && pack.body && typeof pack.body === 'object' ? pack.body : {});
    var status = Number((pack && pack.status) || res.status || payload.status || payload.statusCode || 0);
    var safe = _payloadSafe(payload);
    var err = new Error(_clean(safe.message || fallbackMessage || ('HTTP ' + (status || ''))) || 'Vedic PDF request failed.');
    err.status = status || undefined;
    err.code = _clean(safe.code) || 'VEDIC_PREMIUM_REQUEST_FAILED';
    err.stage = _clean(safe.stage || context && context.stage) || 'prepare';
    err.failureType = _clean(safe.failureType);
    err.reportId = _clean(safe.reportId || context && context.reportId || _currentVedicReportId);
    err.sessionId = _clean(safe.sessionId || context && context.sessionId || _currentVedicSessionId);
    err.executionId = _clean(safe.executionId);
    err.missing = safe.missing;
    err.issues = safe.issues;
    err.payloadSafe = safe;
    err.payload = payload;
    return err;
  }

  function _logError(error, meta) {
    var payloadSafe = error && error.payloadSafe
      ? error.payloadSafe
      : _payloadSafe((error && error.payload) || (error && typeof error === 'object' ? error : {}));
    var stage = _clean(meta && meta.stage || error && error.stage || payloadSafe.stage) || 'unknown';
    var message = _clean(error && error.message) || _clean(error) || 'unknown';
    var status = Number(error && error.status);
    var code = _clean(error && error.code || payloadSafe.code);
    try {
      console.error('[VedicBook][Error]', {
        serviceKey: 'vedic-premium',
        featureKey: VEDIC_FEATURE_KEY,
        reportType: 'vedicPremium',
        stage: stage,
        message: message,
        status: Number.isFinite(status) ? status : null,
        code: code || 'VEDIC_PREMIUM_CLIENT_ERROR',
        failureType: _clean(error && error.failureType || payloadSafe.failureType) || undefined,
        reportId: _clean(error && error.reportId || payloadSafe.reportId || meta && meta.reportId || _currentVedicReportId) || undefined,
        sessionId: _clean(error && error.sessionId || payloadSafe.sessionId || meta && meta.sessionId || _currentVedicSessionId) || undefined,
        executionId: _clean(error && error.executionId || payloadSafe.executionId || meta && meta.executionId) || undefined,
        missing: _shortList(error && error.missing || payloadSafe.missing, 6),
        issues: _shortList(error && error.issues || payloadSafe.issues, 6),
        causeMessage: _clean(error && error.cause && (error.cause.message || error.cause)) || undefined,
        payloadSafe: payloadSafe,
        details: normalizeVedicError(error),
      });
    } catch (_) {}
  }

  function _sanitizeText(value) {
    return String(value || '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|api|debug|internal\s*server\s*error|object|calculationmode|recovered|about:blank)\b/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .replace(/chapter\s*1\s*chapter\s*1/gi, '')
      .replace(/데이터가\s*부족합니다/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function _escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _persistPremiumAccessToken(token) {
    var value = String(token || '').trim();
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function _readPremiumAccessToken() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (!token) { try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    if (!token) { try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    return token;
  }

  function _extractPremiumToken(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token'];
    for (var index = 0; index < keys.length; index += 1) {
      var found = String(payload[keys[index]] || '').trim();
      if (found) return found;
    }
    return _extractPremiumToken(payload.data) || _extractPremiumToken(payload.payload);
  }

  function _extractAccessGrant(payload) {
    if (!payload || typeof payload !== 'object') return null;
    if (payload.accessGrant && typeof payload.accessGrant === 'object') return payload.accessGrant;
    return _extractAccessGrant(payload.data) || _extractAccessGrant(payload.payload) || _extractAccessGrant(payload.payment) || _extractAccessGrant(payload._paymentContext) || _extractAccessGrant(payload.consume);
  }

  function _normalizePremiumPayment(transactionId, payload) {
    var raw = payload && typeof payload === 'object' ? payload : {};
    var data = raw.data && typeof raw.data === 'object' ? raw.data : {};
    var nested = raw.payload && typeof raw.payload === 'object' ? raw.payload : {};
    var payment = raw.payment && typeof raw.payment === 'object' ? raw.payment : {};
    var context = raw._paymentContext && typeof raw._paymentContext === 'object' ? raw._paymentContext : {};
    var grant = _extractAccessGrant(raw);
    var token = _extractPremiumToken(raw) || _readPremiumAccessToken();
    var tx = _clean(transactionId || raw.transactionId || data.transactionId || nested.transactionId || payment.transactionId || context.transactionId || raw.paymentId || data.paymentId || (grant && (grant.transactionId || grant.purchaseId || grant.requestId)));
    var requestId = _clean((grant && (grant.requestId || grant.transactionId)) || raw.requestId || data.requestId || nested.requestId || payment.requestId || context.requestId || tx);
    var purchaseId = _clean((grant && grant.purchaseId) || raw.purchaseId || data.purchaseId || nested.purchaseId || payment.purchaseId || context.purchaseId || raw.paymentId || data.paymentId || tx);
    var sessionId = _clean((grant && (grant.sessionId || grant.reportSessionId)) || raw.sessionId || data.sessionId || nested.sessionId || payment.sessionId || context.sessionId);
    var reportSessionId = _clean((grant && (grant.reportSessionId || grant.sessionId)) || raw.reportSessionId || data.reportSessionId || nested.reportSessionId || payment.reportSessionId || context.reportSessionId || sessionId);
    var reportId = _clean((grant && grant.reportId) || raw.reportId || data.reportId || nested.reportId || payment.reportId || context.reportId);
    var normalized = {
      featureKey: VEDIC_FEATURE_KEY,
      reportType: 'vedicPremium',
      premiumAccessToken: token || undefined,
      transactionId: tx || undefined,
      requestId: requestId || undefined,
      purchaseId: purchaseId || undefined,
      sessionId: sessionId || undefined,
      reportSessionId: reportSessionId || undefined,
      reportId: reportId || undefined,
    };
    if (grant) normalized.accessGrant = grant;
    return normalized;
  }

  function _premiumTokenMatches() {
    var token = _readPremiumAccessToken();
    if (!token || typeof atob !== 'function') return false;
    try {
      var middle = token.split('.')[1] || '';
      var payload = JSON.parse(atob(middle.replace(/-/g, '+').replace(/_/g, '/')));
      var actual = _clean(payload && payload.reportType).toLowerCase().replace(/[^a-z0-9]/g, '');
      var aliases = ['vedicpremium', 'vedic', 'premiumvedicreport', 'premiumvedic'];
      var exp = Number(payload && payload.exp);
      return aliases.indexOf(actual) >= 0 && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000);
    } catch (_) {
      return false;
    }
  }

  function _ensureCurrentVedicGenerationIds() {
    if (!_currentVedicSessionId) {
      _currentVedicSessionId = 'vedic-premium-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    }
    if (!_currentVedicReportId) {
      _currentVedicReportId = _currentVedicSessionId.replace(/^vedic-premium-/, 'vedic-report-');
    }
    if (!_currentVedicPaymentRequestId) {
      _currentVedicPaymentRequestId = _currentVedicSessionId + ':pay';
    }
    return {
      sessionId: _currentVedicSessionId,
      reportId: _currentVedicReportId,
      requestId: _currentVedicPaymentRequestId
    };
  }

  function _bindPaymentToCurrentGeneration(payment) {
    var context = _ensureCurrentVedicGenerationIds();
    var next = payment && typeof payment === 'object' ? payment : {};
    next.sessionId = _clean(next.sessionId || context.sessionId) || undefined;
    next.reportSessionId = _clean(next.reportSessionId || next.sessionId || context.sessionId) || undefined;
    next.reportId = _clean(next.reportId || context.reportId) || undefined;
    next.requestId = _clean(next.requestId || context.requestId) || undefined;
    if (next.accessGrant && typeof next.accessGrant === 'object') {
      next.accessGrant.sessionId = _clean(next.accessGrant.sessionId || next.sessionId) || undefined;
      next.accessGrant.reportSessionId = _clean(next.accessGrant.reportSessionId || next.reportSessionId) || undefined;
      next.accessGrant.reportId = _clean(next.accessGrant.reportId || next.reportId) || undefined;
      next.accessGrant.requestId = _clean(next.accessGrant.requestId || next.requestId) || undefined;
    }
    return next;
  }

  function _paymentMatchesCurrentGeneration(payment) {
    var context = _ensureCurrentVedicGenerationIds();
    var value = payment && typeof payment === 'object' ? payment : {};
    if (value.adminTestMode === true || value.adminBypass === true) return true;
    var hasPaymentEvidence = Boolean(value.transactionId || value.purchaseId || value.premiumAccessToken || value.accessGrant);
    if (!hasPaymentEvidence) return false;
    var sessionId = _clean(value.sessionId || value.reportSessionId || value.accessGrant && (value.accessGrant.sessionId || value.accessGrant.reportSessionId));
    var reportId = _clean(value.reportId || value.accessGrant && value.accessGrant.reportId);
    return sessionId === context.sessionId && reportId === context.reportId;
  }

  function _markPremiumAccessVerified(ttlMs) {
    var ttl = Number(ttlMs || 0);
    if (!Number.isFinite(ttl) || ttl <= 0) ttl = 25 * 60 * 1000;
    var until = Date.now() + ttl;
    if (until > _premiumAccessVerifiedUntil) _premiumAccessVerifiedUntil = until;
    if (until > _premiumPaidUntil) _premiumPaidUntil = until;
  }

  function _hasPremiumAccessForGeneration() {
    return Date.now() < _premiumAccessVerifiedUntil && _paymentMatchesCurrentGeneration(_lastPremiumPayment);
  }

  function _buildApiCandidates(pathname) {
    var path = String(pathname || '');
    if (path.charAt(0) !== '/') path = '/' + path;
    var bases = [
      '',
      (typeof window !== 'undefined' && window.__CD_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__AUTH_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.location && window.location.origin) || '',
    ];
    var seen = {};
    var out = [];
    for (var index = 0; index < bases.length; index += 1) {
      var base = String(bases[index] || '').trim();
      var url = base ? (base.replace(/\/+$/, '') + path) : path;
      if (seen[url]) continue;
      seen[url] = true;
      out.push(url);
    }
    return out;
  }

  function _recoverBirthFromDOM() {
    try {
      var birthDateEl = document.getElementById('birthDate');
      var hourEl = document.getElementById('birthHour');
      var minuteEl = document.getElementById('birthMinute');
      var nameEl = document.getElementById('nameInput');
      var femaleEl = document.getElementById('genderFemale');
      var countryEl = document.getElementById('birthCountry');
      if (!birthDateEl || !birthDateEl.value) return null;
      var parts = birthDateEl.value.split('-');
      var year = Number(parts[0]);
      var month = Number(parts[1]);
      var day = Number(parts[2]);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      var option = countryEl && countryEl.options ? countryEl.options[countryEl.selectedIndex] : null;
      var h = hourEl ? Number(hourEl.value) : NaN;
      var m = minuteEl ? Number(minuteEl.value) : 0;
      return {
        name: (nameEl && nameEl.value && nameEl.value.trim()) || '사용자',
        gender: femaleEl && femaleEl.checked ? 'F' : 'M',
        birth: {
          year: year,
          month: month,
          day: day,
          hour: Number.isFinite(h) ? h : null,
          minute: Number.isFinite(m) ? m : 0,
        },
        location: {
          label: option ? (option.textContent || '대한민국 (서울)') : '대한민국 (서울)',
          lat: parseFloat(option && option.getAttribute('data-lat') || '37.5665'),
          lon: parseFloat(option && option.getAttribute('data-lon') || '126.9780'),
          tzOffset: parseFloat(option && option.getAttribute('data-tz') || '9'),
          tz: (option && option.value) || 'Asia/Seoul',
        },
      };
    } catch (_) {
      return null;
    }
  }

  function _hasValidBirthProfile(profile) {
    return Boolean(profile && profile.birth && Number(profile.birth.year) > 1800 && Number(profile.birth.month) > 0 && Number(profile.birth.day) > 0);
  }

  function _readBirthProfileFromStorage() {
    try {
      var match = (typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
        || window.__cdCurrentDestinyProfile
        || null;
      if (_hasValidBirthProfile(match)) return match;
    } catch (_) {}

    try {
      var payload = JSON.parse(localStorage.getItem('destiny_profile') || sessionStorage.getItem('destiny_profile') || '{}');
      if (payload && payload.birth && payload.birth.year) return payload;
    } catch (_) {}

    return null;
  }

  function _toProfileFromAuthMe(raw) {
    var source = (raw && (raw.profile || raw.user || raw.data || raw)) || {};
    var birth = source.birth || source.birthInput || {};
    var location = source.location || {};
    var year = Number(source.birthYear != null ? source.birthYear : birth.year);
    var month = Number(source.birthMonth != null ? source.birthMonth : birth.month);
    var day = Number(source.birthDay != null ? source.birthDay : birth.day);
    var hour = Number(source.birthHour != null ? source.birthHour : birth.hour);
    var minute = Number(source.birthMinute != null ? source.birthMinute : birth.minute);
    if (!_hasValidBirthProfile({ birth: { year: year, month: month, day: day } })) return null;

    return {
      name: source.name || source.nickname || '사용자',
      gender: source.gender || source.sex || 'unknown',
      birth: {
        year: year,
        month: month,
        day: day,
        hour: Number.isFinite(hour) ? hour : null,
        minute: Number.isFinite(minute) ? minute : 0,
      },
      location: {
        label: source.birthPlace || source.place || source.locationName || location.label || '대한민국 (서울)',
        lat: Number(source.latitude != null ? source.latitude : (source.lat != null ? source.lat : location.lat)),
        lon: Number(source.longitude != null ? source.longitude : (source.lng != null ? source.lng : (source.lon != null ? source.lon : location.lon))),
        tz: source.timezone || source.tz || location.tz || 'Asia/Seoul',
      },
    };
  }

  function _fetchBirthProfileFromAuthApi() {
    var endpoints = _buildApiCandidates('/api/auth/me');
    var endpointIndex = 0;
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }

    function run(resolve) {
      if (endpointIndex >= endpoints.length) { resolve(null); return; }
      var headers = {};
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      fetch(endpoints[endpointIndex++], { method: 'GET', headers: headers, credentials: 'include', cache: 'no-store' })
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (data) {
          var profile = _toProfileFromAuthMe(data);
          if (_hasValidBirthProfile(profile)) { resolve(profile); return; }
          run(resolve);
        })
        .catch(function () { run(resolve); });
    }

    return new Promise(function (resolve) { run(resolve); });
  }

  function _getActiveBirthProfile() {
    var profile = window.__cdActiveBirthProfile;
    if (_hasValidBirthProfile(profile)) return profile;
    var snap = window.__destinyFlowerSajuSnapshot;
    if (_hasValidBirthProfile(snap)) return snap;
    var storageProfile = _readBirthProfileFromStorage();
    if (_hasValidBirthProfile(storageProfile)) return storageProfile;
    var fromDom = _recoverBirthFromDOM();
    if (_hasValidBirthProfile(fromDom)) return fromDom;
    return null;
  }

  function _resolveBirthProfile() {
    var active = _getActiveBirthProfile();
    if (_hasValidBirthProfile(active)) return Promise.resolve(active);
    return _fetchBirthProfileFromAuthApi().then(function (apiProfile) {
      if (_hasValidBirthProfile(apiProfile)) return apiProfile;
      return _getActiveBirthProfile();
    });
  }

  function _normalizeGender(value) {
    var token = _clean(value).toLowerCase();
    if (token === 'm' || token === 'male' || token === '남' || token === '남자' || token === '남성') return 'male';
    if (token === 'f' || token === 'female' || token === '여' || token === '여자' || token === '여성') return 'female';
    return 'unknown';
  }

  function _toTimezoneOffset(timezone) {
    var raw = _clean(timezone);
    if (!raw) return 9;
    var n = Number(raw);
    if (Number.isFinite(n)) return n;
    var lower = raw.toLowerCase();
    if (lower === 'asia/seoul' || lower === 'asia/tokyo') return 9;
    if (lower === 'utc' || lower === 'etc/utc' || lower === 'gmt') return 0;
    return 9;
  }

  function _normalizeBirthInput(profile) {
    var birth = (profile && profile.birth) || {};
    var location = (profile && profile.location) || {};
    var year = Number(birth.year);
    var month = Number(birth.month);
    var day = Number(birth.day);
    var hasDate = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) && year > 1800;

    var hour = Number(birth.hour);
    var minute = Number(birth.minute);
    if (!Number.isFinite(minute)) minute = 0;
    var isTimeUnknown = !Number.isFinite(hour);
    if (!isTimeUnknown) {
      hour = Math.max(0, Math.min(23, Math.floor(hour)));
      minute = Math.max(0, Math.min(59, Math.floor(minute)));
    }

    return {
      name: _clean(profile && profile.name) || undefined,
      gender: _normalizeGender(profile && profile.gender),
      birthDate: hasDate ? [String(year).padStart(4, '0'), String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-') : '',
      birthYear: hasDate ? year : null,
      birthMonth: hasDate ? month : null,
      birthDay: hasDate ? day : null,
      birthTime: isTimeUnknown ? '' : [String(hour).padStart(2, '0'), String(minute).padStart(2, '0')].join(':'),
      birthHour: isTimeUnknown ? null : hour,
      birthMinute: minute,
      timezone: _clean(location.tz) || 'Asia/Seoul',
      birthPlace: _clean(location.label) || undefined,
      latitude: Number.isFinite(Number(location.lat)) ? Number(location.lat) : null,
      longitude: Number.isFinite(Number(location.lon || location.lng)) ? Number(location.lon || location.lng) : null,
      isTimeUnknown: isTimeUnknown,
    };
  }

  function _validateBeforePayment(birthInput) {
    if (!_clean(birthInput && birthInput.birthDate)) {
      var dateErr = new Error('베다점 PDF 생성을 위해 생년월일 정보가 필요합니다. 프로필 카드를 먼저 확인해주세요.');
      dateErr.code = 'BIRTH_DATE_REQUIRED';
      dateErr.status = 422;
      throw dateErr;
    }
    if (birthInput && (birthInput.isTimeUnknown || birthInput.birthHour == null)) {
      var timeErr = new Error('베다점 PDF는 라그나와 하우스 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.');
      timeErr.code = 'BIRTH_TIME_REQUIRED';
      timeErr.status = 422;
      throw timeErr;
    }
  }

  function _buildVedicChartRequest(profile, birthInput) {
    var birth = (profile && profile.birth) || {};
    var location = (profile && profile.location) || {};
    var normalized = birthInput || _normalizeBirthInput(profile || {});
    return {
      year: Number(normalized.birthYear || birth.year),
      month: Number(normalized.birthMonth || birth.month),
      day: Number(normalized.birthDay || birth.day),
      hour: Number(normalized.birthHour != null ? normalized.birthHour : (birth.hour || 12)),
      minute: Number(normalized.birthMinute != null ? normalized.birthMinute : (birth.minute || 0)),
      timezone: Number(location.tzOffset != null ? location.tzOffset : _toTimezoneOffset(normalized.timezone || location.tz || location.timezone)),
      lat: Number(normalized.latitude != null ? normalized.latitude : (location.lat || 37.5665)),
      lon: Number(normalized.longitude != null ? normalized.longitude : (location.lon || location.lng || 126.9780)),
    };
  }

  function _fetchVedicChart(profile, birthInput) {
    var endpoints = _buildApiCandidates(VEDIC_PLANETS_API);
    var body = _buildVedicChartRequest(profile, birthInput);
    var endpointIndex = 0;
    function run(resolve, lastErr) {
      if (endpointIndex >= endpoints.length) {
        resolve(null);
        return;
      }
      var url = endpoints[endpointIndex++];
      var headers = { 'Content-Type': 'application/json' };
      var authToken = '';
      try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), credentials: 'include', cache: 'no-store' })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (json) { return { res: res, json: json }; }); })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok !== false) { resolve(pack.json); return; }
          run(resolve, (pack.json && (pack.json.message || pack.json.error || pack.json.code)) || ('HTTP ' + pack.res.status));
        })
        .catch(function (error) { run(resolve, String(error && error.message || error || '요청 실패')); });
    }
    return new Promise(function (resolve) { run(resolve, ''); });
  }

  function _buildVedicBase(profile, chart, birthInput) {
    var normalized = birthInput || _normalizeBirthInput(profile || {});
    return {
      birthInput: normalized,
      user: {
        name: _clean(normalized.name) || '사용자',
        birthDate: _clean(normalized.birthDate),
        birthTime: _clean(normalized.birthTime),
        birthPlace: _clean(normalized.birthPlace) || '대한민국 (서울)',
        timezone: _clean(normalized.timezone) || 'Asia/Seoul',
        gender: _clean(normalized.gender),
      },
      chart: {
        planets: (chart && chart.planets) || {},
        retrograde: (chart && chart.retrograde) || {},
        ayanamsa: chart && chart.ayanamsa,
        ascendantSidereal: chart && chart.ascendantSidereal,
        source: _clean(chart && chart.source) || 'worker-vedic-planets',
      },
      location: {
        lat: Number(normalized.latitude != null ? normalized.latitude : 37.5665),
        lon: Number(normalized.longitude != null ? normalized.longitude : 126.9780),
      },
    };
  }

  function _buildVedicClientEvidenceJson(profile, birthInput, chart) {
    var localChart = chart && typeof chart.localVedicChartJson === 'object' ? chart.localVedicChartJson : null;
    var chartBody = chart && typeof chart === 'object' ? chart : {};
    var planetMap = chartBody.planets && typeof chartBody.planets === 'object' ? chartBody.planets : {};
    var localPlanets = localChart && localChart.chart && Array.isArray(localChart.chart.planets) ? localChart.chart.planets : [];
    var localHouses = localChart && localChart.chart && Array.isArray(localChart.chart.houses) ? localChart.chart.houses : [];
    var hasPlanets = Object.keys(planetMap).length > 0 || localPlanets.length > 0;
    var hasAscendant = Number.isFinite(Number(chartBody.ascendantSidereal || chartBody.ascendant || chartBody.lagnaLongitude))
      || Boolean(localChart && localChart.chart && _clean(localChart.chart.lagnaSign));
    return {
      schemaVersion: VEDIC_CLIENT_EVIDENCE_SCHEMA_VERSION,
      source: 'browser-vedic-book',
      featureKey: VEDIC_FEATURE_KEY,
      chartAvailable: Boolean(chart),
      hasBirthInput: Boolean(birthInput && _clean(birthInput.birthDate)),
      hasPlanets: hasPlanets,
      hasAscendant: hasAscendant,
      evidenceCount: (hasPlanets ? 1 : 0) + (hasAscendant ? 1 : 0) + localHouses.length,
      birthProfile: {
        birthDate: _clean(birthInput && birthInput.birthDate),
        birthTime: _clean(birthInput && birthInput.birthTime),
        timezone: _clean(birthInput && birthInput.timezone),
        birthPlace: _clean(birthInput && birthInput.birthPlace),
      },
      chartSummary: {
        calculationMode: _clean(localChart && localChart.calculationMode),
        lagnaSign: _clean(localChart && localChart.chart && localChart.chart.lagnaSign),
        moonSign: _clean(localChart && localChart.chart && localChart.chart.moonSign),
        sunSign: _clean(localChart && localChart.chart && localChart.chart.sunSign),
        moonNakshatra: _clean(localChart && localChart.chart && localChart.chart.nakshatra && localChart.chart.nakshatra.name),
        planetCount: localPlanets.length || Object.keys(planetMap).length,
        houseCount: localHouses.length,
      },
    };
  }

  function _withVedicPdfArchiveFormat(url, format) {
    var value = _clean(url);
    var targetFormat = _clean(format) || 'pdf';
    if (!value || value.indexOf('/api/premium/pdf-archive/') === -1) return value;
    if (/[?&]format=/i.test(value)) {
      return value.replace(/([?&]format=)[^&]+/i, '$1' + encodeURIComponent(targetFormat));
    }
    return value + (value.indexOf('?') >= 0 ? '&' : '?') + 'format=' + encodeURIComponent(targetFormat);
  }

  function _renderVedicSectionBody(body) {
    var lines = String(body || '').split(/\n+/).map(function (line) { return _clean(line); }).filter(Boolean);
    var titleMap = {
      '핵심 진단': true,
      '차트 근거': true,
      '현실에서 드러나는 모습': true,
      '주의해야 할 흐름': true,
      '베다 마스터의 조언': true,
      '실천 과제': true,
    };
    return lines.map(function (line) {
      var safe = _sanitizeText(line);
      if (!safe) return '';
      if (titleMap[safe]) return '<h4 class="vd-section-heading">' + _escapeHtml(safe) + '</h4>';
      return '<p>' + _escapeHtml(safe) + '</p>';
    }).join('');
  }

  function _resolveVedicDownloadUrl(result) {
    var payload = result || {};
    return _withVedicPdfArchiveFormat(_clean(
      payload.downloadUrl
      || payload.pdfUrl
      || (payload.pdfReady && (payload.pdfReady.downloadUrl || payload.pdfReady.pdfUrl || payload.pdfReady.htmlUrl))
      || (payload.reportId ? ('/api/premium/pdf-archive/' + encodeURIComponent(payload.reportId)) : '')
    ), 'pdf');
  }

  function _showScreen(screenId) {
    ['vdNoProfileScreen', 'vdStartScreen', 'vdLoadingScreen', 'vdResultScreen', 'vdErrorScreen'].forEach(function (id) {
      var element = _qs(id);
      if (!element) return;
      element.style.display = id === screenId ? '' : 'none';
    });
  }

  function _setError(message) {
    var element = _qs('vdErrorMsg');
    var safe = _sanitizeText(message);
    if (/internal\s*server\s*error/i.test(String(message || ''))) {
      safe = 'PDF 생성이 완료되지 않았습니다. 결제 처리분은 자동 환불 확인 대상입니다. 다시 시도해 주세요.';
    }
    if (element) element.textContent = safe || '생성 중 오류가 발생했습니다.';
    _showScreen('vdErrorScreen');
  }

  function _isCompletedReportReady(response) {
    var payload = response || {};
    var ready = payload.pdfReady && typeof payload.pdfReady === 'object' ? payload.pdfReady : {};
    var chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
    var total = Number(VEDIC_TOTAL_CHAPTERS || 0) || 12;
    var completed = _clean(payload.status || '').toLowerCase();
    var hasReportId = !!_clean(payload.reportId);
    var hasPdfHtml = !!_clean(ready.html);
    var hasStoredUrl = !!_clean(
      payload.pdfUrl
      || payload.htmlUrl
      || payload.downloadUrl
      || ready.pdfUrl
      || ready.htmlUrl
      || ready.downloadUrl
    );
    var manuscriptSource = _clean(payload.manuscriptSource || ready.manuscriptSource).toLowerCase();
    var localAssembly = payload.localAssembly && typeof payload.localAssembly === 'object'
      ? payload.localAssembly
      : (ready.localAssembly && typeof ready.localAssembly === 'object' ? ready.localAssembly : {});
    var localContractOk = manuscriptSource === VEDIC_LOCAL_MANUSCRIPT_SOURCE
      && localAssembly.enabled === true
      && localAssembly.externalGeneration === false
      && localAssembly.externalCallsAllowed === false
      && Number(localAssembly.chapterCount || 0) >= total
      && Number(localAssembly.expectedChapterCount || 0) === total
      && _clean(localAssembly.templateVersion) === 'vedic-premium-local-assembled-v2';
    return hasReportId && hasPdfHtml && hasStoredUrl && chapters.length >= total && (!completed || completed === 'completed') && localContractOk;
  }

  function _isRunningReport(response) {
    var status = _clean(response && response.status).toLowerCase();
    return status === 'running' || status === 'pending' || status === 'generating';
  }

  function _sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, Math.max(500, Number(ms || 0)));
    });
  }

  function _queryString(params) {
    var out = [];
    Object.keys(params || {}).forEach(function (key) {
      var value = _clean(params[key]);
      if (value) out.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    });
    return out.length ? ('?' + out.join('&')) : '';
  }

  function _getVedicStatus(sessionId, reportId) {
    var query = _queryString({ sessionId: sessionId, reportId: reportId });
    var endpoints = _buildApiCandidates(VEDIC_STATUS_API + query);
    var endpointIndex = 0;
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();
    function rejectWithStatus(reject, pack) {
      var payload = pack && pack.json ? pack.json : {};
      var error = _buildVedicApiError(pack, (payload && (payload.message || payload.code)) || ('HTTP ' + pack.res.status), {
        stage: 'status',
        sessionId: sessionId,
        reportId: reportId
      });
      error.permanent = error.status === 401 || error.status === 403 || error.status === 422 || _clean(payload.status).toLowerCase() === 'failed';
      reject(error);
    }
    function run(resolve, reject, lastErr) {
      if (endpointIndex >= endpoints.length) { reject(lastErr instanceof Error ? lastErr : new Error(lastErr || '베다점 PDF 상태 확인에 실패했습니다.')); return; }
      var url = endpoints[endpointIndex++];
      var headers = {};
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;
      fetch(url, { method: 'GET', headers: headers, credentials: 'include', cache: 'no-store' })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (json) { return { res: res, json: json }; }); })
        .then(function (pack) {
          if (pack.res.ok && pack.json) { resolve(pack.json); return; }
          if (pack.res.status === 401 || pack.res.status === 403 || pack.res.status === 422 || _clean(pack.json && pack.json.status).toLowerCase() === 'failed') {
            rejectWithStatus(reject, pack);
            return;
          }
          run(resolve, reject, _buildVedicApiError(pack, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status), {
            stage: 'status',
            sessionId: sessionId,
            reportId: reportId
          }));
        })
        .catch(function (error) { run(resolve, reject, error instanceof Error ? error : new Error(String(error && error.message || error || '요청 실패'))); });
    }
    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _waitForVedicCompletion(seed) {
    var sessionId = _clean(seed && seed.sessionId) || _currentVedicSessionId;
    var reportId = _clean(seed && seed.reportId) || _currentVedicReportId;
    var attempts = 0;
    function poll() {
      attempts += 1;
      _setLoadingProgress(
        Math.min(VEDIC_TOTAL_CHAPTERS - 1, 3 + Math.floor(attempts / 12)),
        VEDIC_TOTAL_CHAPTERS,
        '베다점 원고와 PDF를 완성하는 중입니다'
      );
      return _getVedicStatus(sessionId, reportId).then(function (payload) {
        if (_isCompletedReportReady(payload)) return payload;
        if (payload && payload.ok === false && _clean(payload.status).toLowerCase() === 'failed') {
          var failedError = _buildVedicApiError({ status: payload.statusCode || 500, body: payload }, _clean(payload.message) || '베다점 PDF 생성이 완료되지 않았습니다. 다시 시도해 주세요.', {
            stage: 'status',
            sessionId: sessionId,
            reportId: reportId
          });
          failedError.permanent = true;
          throw failedError;
        }
        if (payload && payload.ok === false && !_isRunningReport(payload)) {
          var statusError = _buildVedicApiError({ status: payload.statusCode || 500, body: payload }, _clean(payload.message) || '베다점 PDF 생성에 실패했습니다.', {
            stage: 'status',
            sessionId: sessionId,
            reportId: reportId
          });
          statusError.permanent = true;
          throw statusError;
        }
        if (attempts >= VEDIC_STATUS_MAX_ATTEMPTS) {
          throw new Error('베다점 PDF 생성 시간이 길어지고 있습니다. 잠시 후 다시 확인해 주세요.');
        }
        return _sleep(Number(payload && payload.retryAfterMs) || VEDIC_STATUS_POLL_MS).then(poll);
      }).catch(function (error) {
        if (error && error.permanent) throw error;
        if (Number(error && error.status) === 401 || Number(error && error.status) === 403 || Number(error && error.status) === 422) throw error;
        if (attempts >= VEDIC_STATUS_MAX_ATTEMPTS) throw error;
        return _sleep(VEDIC_STATUS_POLL_MS).then(poll);
      });
    }
    return poll();
  }

  function _setStartBusy(isBusy) {
    var button = _qs('vdStartBtn');
    if (!button) return;
    button.disabled = !!isBusy;
    button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function _renderProfileSummary(profile) {
    var element = _qs('vdProfileSummary');
    if (!element) return;
    if (!profile) {
      element.textContent = '생년월일 정보를 찾을 수 없습니다. 먼저 나의 운명 카드를 설정해 주세요.';
      return;
    }
    var birth = profile.birth || {};
    var place = (profile.location && profile.location.label) || '대한민국 (서울)';
    var hour = Number(birth.hour);
    var minute = Number(birth.minute);
    var time = Number.isFinite(hour)
      ? [String(Math.max(0, Math.min(23, Math.floor(hour)))).padStart(2, '0'), String(Number.isFinite(minute) ? Math.max(0, Math.min(59, Math.floor(minute))) : 0).padStart(2, '0')].join(':')
      : '시간 미입력';
    element.textContent = [(profile.name || '사용자') + ' · ' + (profile.gender === 'F' ? '여성' : profile.gender === 'M' ? '남성' : ''), [birth.year, birth.month, birth.day].filter(Boolean).join('년 ') + '일 ' + time, place].join(' · ');
  }

  function _setLoadingProgress(step, total, title) {
    var pct = Math.max(0, Math.min(100, Math.round((step / Math.max(total, 1)) * 100)));
    var bar = _qs('vdProgressBar');
    var text = _qs('vdProgressText');
    var number = _qs('vdLoadingChapterNum');
    var chapter = _qs('vdLoadingChapter');
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = step + ' / ' + total + ' 챕터 완성';
    if (number) number.textContent = '제' + step + '장';
    if (chapter) chapter.textContent = _sanitizeText(title || '베다점 챕터를 생성하는 중입니다');
    var fallbackTitle = VEDIC_PROGRESS_STAGE_TITLES[Math.max(0, Math.min(VEDIC_PROGRESS_STAGE_TITLES.length - 1, step - 1))] || '베다점 PDF를 생성하는 중입니다';
    var safeTitle = _sanitizeText(title || fallbackTitle);
    if (/[\uFFFD]|[踰좊떎梨꾨꾩]/.test(safeTitle)) safeTitle = fallbackTitle;
    if (text) text.textContent = step + ' / ' + total + ' 챕터 완성';
    if (number) number.textContent = 'Chapter ' + step;
    if (chapter) chapter.textContent = safeTitle || fallbackTitle;
    var dots = document.querySelectorAll('.vd-ch-dot');
    Array.prototype.forEach.call(dots, function (dot) {
      var dotNo = Number(dot.getAttribute('data-vdch'));
      dot.classList.toggle('lb-ch-dot--active', dotNo === step);
      dot.classList.toggle('lb-ch-dot--done', dotNo < step);
    });
  }

  function _stopProgressAnimation() {
    if (_progressTimer) {
      clearInterval(_progressTimer);
      _progressTimer = null;
    }
  }

  function _startProgressAnimation() {
    _stopProgressAnimation();
    var titles = [
      '라그나와 달의 흐름을 정리하는 중입니다',
      '나크샤트라와 카라카를 해석하는 중입니다',
      '행성 강약과 바바의 의미를 정리하는 중입니다',
      'Moon 다샤와 다음 시기를 구성하는 중입니다',
      '사랑·직업·재물의 흐름을 정리하는 중입니다',
      '차크라와 레메디 조언을 구성하는 중입니다',
      '베다 점성술 리포트를 완성하는 중입니다'
    ];
    titles = VEDIC_PROGRESS_STAGE_TITLES;
    var index = 1;
    _setLoadingProgress(1, VEDIC_TOTAL_CHAPTERS, titles[0]);
    _progressTimer = setInterval(function () {
      if (!_generating) { _stopProgressAnimation(); return; }
      index += 1;
      if (index > VEDIC_TOTAL_CHAPTERS) index = VEDIC_TOTAL_CHAPTERS;
      var titleIndex = Math.min(titles.length - 1, Math.max(0, index - 1));
      _setLoadingProgress(index, VEDIC_TOTAL_CHAPTERS, titles[titleIndex]);
      if (index >= VEDIC_TOTAL_CHAPTERS) _stopProgressAnimation();
    }, 850);
  }

  function _normalizeVedicUiSummary(chapters, payload, report) {
    var source = report && report.pdfReady && report.pdfReady.visualSummary
      || report && report.vedicVisualSummary
      || payload && payload.visualSummary
      || {};
    var chart = payload && payload.chart || {};
    var nakshatra = chart.nakshatra && typeof chart.nakshatra === 'object' ? chart.nakshatra : {};
    var evidenceCount = Number(source.evidenceCount || report && report.quality && report.quality.evidenceUniqueSignalCount || 0);
    if (!evidenceCount) {
      var seen = {};
      (chapters || []).forEach(function (chapter) {
        var categories = Array.isArray(chapter.categories) ? chapter.categories : [];
        categories.forEach(function (category) {
          var ids = Array.isArray(category.usedSignalIds) ? category.usedSignalIds : [];
          ids.forEach(function (id) { if (_clean(id)) seen[_clean(id)] = true; });
        });
      });
      evidenceCount = Object.keys(seen).length;
    }
    return {
      lagna: _sanitizeText(source.lagna || chart.lagnaSign || '라그나'),
      moonSign: _sanitizeText(source.moonSign || chart.moonSign || '문 사인'),
      moonNakshatra: _sanitizeText(source.moonNakshatra || nakshatra.name || '나크샤트라'),
      activeDasha: _sanitizeText(source.activeDasha || chart.dashas && chart.dashas.currentMahaDasha || '현재 다샤'),
      nextDasha: _sanitizeText(source.nextDasha || '다음 다샤'),
      evidenceCount: evidenceCount,
      symbolicSentence: _sanitizeText(source.symbolicSentence || report && report.symbolicSentence || '라그나와 나크샤트라가 만나는 지점에서 지금의 선택이 현실의 문장으로 정리됩니다.'),
      elementBalance: Array.isArray(source.elementBalance) ? source.elementBalance : [],
      houseFocus: Array.isArray(source.houseFocus) ? source.houseFocus : []
    };
  }

  function _renderVedicUiBars(rows) {
    return (Array.isArray(rows) ? rows : []).slice(0, 7).map(function (row) {
      var percent = Math.max(6, Math.min(100, Number(row && (row.percent || row.value) || 0)));
      return '<div class="vd-ui-bar"><span>' + _escapeHtml(_sanitizeText(row && (row.label || row.title))) + '</span><i style="--value:' + percent + '%"></i><b>' + _escapeHtml(_sanitizeText(row && row.value)) + '</b></div>';
    }).join('');
  }

  function _renderVedicConsultSummary(chapters, payload, report) {
    var summary = _normalizeVedicUiSummary(chapters || [], payload || {}, report || {});
    var elementBars = _renderVedicUiBars(summary.elementBalance);
    var houseBars = _renderVedicUiBars(summary.houseFocus);
    return '<section class="vd-consult-summary" data-vedic-ui-summary>' +
      '<div class="vd-consult-summary__seal" aria-hidden="true">🪷</div>' +
      '<div class="vd-consult-summary__body">' +
      '<p class="vd-consult-summary__kicker">상징 문장</p>' +
      '<h4>' + _escapeHtml(summary.symbolicSentence) + '</h4>' +
      '<div class="vd-consult-summary__grid">' +
      '<span><b>라그나</b>' + _escapeHtml(summary.lagna) + '</span>' +
      '<span><b>달</b>' + _escapeHtml(summary.moonSign) + ' · ' + _escapeHtml(summary.moonNakshatra) + '</span>' +
      '<span><b>현재 다샤</b>' + _escapeHtml(summary.activeDasha) + '</span>' +
      '<span><b>근거 신호</b>' + _escapeHtml(String(summary.evidenceCount || 0)) + '개</span>' +
      '</div>' +
      '<div class="vd-consult-summary__charts">' +
      '<div><strong>원소 밸런스</strong>' + (elementBars || '<p>차트 계산값을 PDF에 반영했습니다.</p>') + '</div>' +
      '<div><strong>하우스 집중도</strong>' + (houseBars || '<p>장별 상담 근거를 정리했습니다.</p>') + '</div>' +
      '</div>' +
      '</div>' +
      '</section>';
  }

  function _renderResult(chapters, payload, report) {
    var toc = _qs('vdToc');
    var content = _qs('vdChapterContent');
    var name = _qs('vdResultName');
    var date = _qs('vdResultDate');
    if (toc) toc.innerHTML = '';
    if (content) content.innerHTML = '';
    if (content) content.innerHTML = _renderVedicConsultSummary(chapters || [], payload || {}, report || _resultPayload || {});
    if (name) name.textContent = '🪷 ' + _sanitizeText(payload && payload.user && payload.user.name || '사용자') + '님의 베다점 리포트';
    if (date) date.textContent = _sanitizeText(payload && payload.user && payload.user.birthDate || '');
    if (name) name.textContent = _sanitizeText(payload && payload.user && payload.user.name || '사용자') + '님의 베다점 리포트';
    chapters.forEach(function (chapter, index) {
      var chapterNo = Number(chapter && (chapter.order || chapter.chapterNo || (index + 1))) || (index + 1);
      var heading = _sanitizeText(String(chapter && chapter.title || '').split('—')[0]) || ('제' + chapterNo + '장');
      heading = VEDIC_UI_CHAPTER_TITLES[index] || heading || ('제' + chapterNo + '장');
      if (toc) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'lb-toc-item loaded';
        button.textContent = '제' + chapterNo + '장 ' + heading;
        button.textContent = '제' + chapterNo + '장 ' + heading;
        button.addEventListener('click', function () {
          var section = document.getElementById('vdChapter-' + (index + 1));
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        toc.appendChild(button);
      }
      if (content) {
        var sectionEl = document.createElement('section');
        sectionEl.id = 'vdChapter-' + (index + 1);
        sectionEl.className = 'lb-chapter-card';
        var html = '<h4 class="lb-chapter-title">제' + chapterNo + '장 ' + heading + '</h4>';
        html = '<h4 class="lb-chapter-title">제' + chapterNo + '장 ' + _escapeHtml(heading) + '</h4>';
        var categories = Array.isArray(chapter.categories) ? chapter.categories : [];
        for (var categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
          var category = categories[categoryIndex] || {};
          html += '<article class="lb-sub-card"><h5 class="lb-sub-title">' + _escapeHtml(_sanitizeText(category.title || ('세부 카테고리 ' + (categoryIndex + 1)))) + '</h5><div class="lb-sub-body vd-section-body">' + _renderVedicSectionBody(category.text || category.localSummary || category.body || '') + '</div></article>';
        }
        sectionEl.innerHTML = html;
        content.appendChild(sectionEl);
      }
    });
  }

  function _fetchCanonicalChapters() {
    var endpoints = _buildApiCandidates(VEDIC_CHAPTERS_API);
    var endpointIndex = 0;
    function next(resolve) {
      if (endpointIndex >= endpoints.length) return resolve([]);
      var url = endpoints[endpointIndex++];
      fetch(url)
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.ok && Array.isArray(data.chapters) && data.chapters.length) { resolve(data.chapters); return; }
          next(resolve);
        })
        .catch(function () { next(resolve); });
    }
    return new Promise(function (resolve) { next(resolve); });
  }

  function _postPrepare(body) {
    var endpoints = _buildApiCandidates(VEDIC_PREPARE_API);
    var endpointIndex = 0;
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();
    function run(resolve, reject, lastErr) {
      if (endpointIndex >= endpoints.length) { reject(lastErr instanceof Error ? lastErr : new Error(lastErr || '베다점 프리미엄 API 호출에 실패했습니다.')); return; }
      var url = endpoints[endpointIndex++];
      var headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;
      fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), credentials: 'include', cache: 'no-store' })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (json) { return { res: res, json: json }; }); })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok) { _persistPremiumAccessToken(_extractPremiumToken(pack.json)); resolve(pack.json); return; }
          run(resolve, reject, _buildVedicApiError(pack, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status), {
            stage: 'prepare',
            sessionId: body && body.sessionId,
            reportId: body && body.reportId
          }));
        })
        .catch(function (error) { run(resolve, reject, error instanceof Error ? error : new Error(String(error && error.message || error || '요청 실패'))); });
    }
    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _ensurePremiumPaymentThenStart() {
    var context = _ensureCurrentVedicGenerationIds();
    if (_hasPremiumAccessForGeneration()) return true;
    if (typeof window._cdCoinGatePerUse !== 'function') {
      _logError({ message: '결제 모듈을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.', status: 503, code: 'VEDIC_PAYMENT_MODULE_MISSING' }, { stage: 'billing' });
      alert('결제 모듈을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
      return false;
    }
    _logStage('PaymentGateStart', { featureKey: VEDIC_FEATURE_KEY, sessionId: context.sessionId, reportId: context.reportId });
    window._cdCoinGatePerUse(VEDIC_COIN_COST, '베다 점성술 프리미엄 PDF 리포트 생성', function (_transactionId, data) {
      _lastPremiumPayment = _bindPaymentToCurrentGeneration(_normalizePremiumPayment(_transactionId, data));
      if (!_lastPremiumPayment.transactionId && !_lastPremiumPayment.purchaseId && !_lastPremiumPayment.premiumAccessToken && !_lastPremiumPayment.accessGrant) {
        _lastPremiumPayment.adminTestMode = true;
      }
      _persistPremiumAccessToken(_lastPremiumPayment.premiumAccessToken || _extractPremiumToken(data));
      _markPremiumAccessVerified(25 * 60 * 1000);
      _logStage('PaymentGateSuccess', { featureKey: VEDIC_FEATURE_KEY, sessionId: context.sessionId, reportId: context.reportId });
      window.generateVedicBook();
    }, function () {
      _lastPremiumPayment = null;
      _logError({ message: '결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.', status: 402, code: 'VEDIC_PAYMENT_CANCELLED' }, { stage: 'billing' });
      _logStage('PaymentGateCancel', { featureKey: VEDIC_FEATURE_KEY });
    }, {
      featureKey: VEDIC_FEATURE_KEY,
      reportType: 'vedicPremium',
      serviceKey: 'vedic-premium',
      actionType: 'pdf',
      action: 'generateVedicPremiumPdf',
      requestId: context.requestId,
      reportId: context.reportId,
      sessionId: context.sessionId,
      reportSessionId: context.sessionId,
    });
    return false;
  }

  window.openVedicBookModal = function () {
    _logStage('CardClick');
    var modal = _qs('vedicBookModal');
    if (!modal) return;
    _detachModalFromResultPage(modal);

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}

    _logStage('ModalOpen');
    _resolveBirthProfile().then(function (profile) {
      if (_hasValidBirthProfile(profile)) {
        window.__cdActiveBirthProfile = profile;
        _renderProfileSummary(profile);
        _showScreen('vdStartScreen');
        return;
      }
      _showScreen('vdNoProfileScreen');
    }).catch(function () {
      _showScreen('vdNoProfileScreen');
    });

    _fetchCanonicalChapters().then(function (chapters) {
      if (Array.isArray(chapters) && chapters.length) {
        _canonicalChapters = chapters;
        VEDIC_TOTAL_CHAPTERS = chapters.length;
      }
    }).catch(function () {});
  };

  window.closeVedicBookModal = function () {
    var modal = _qs('vedicBookModal');
    if (!modal) return;
    _stopProgressAnimation();
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.gotoVedicPremium = function () {
    _logStage('CardVisibleCheck', { card: 'gotoVedicPremium' });
    window.openVedicBookModal();
  };

  window.generateVedicBook = function () {
    if (_generating) return;

    _resolveBirthProfile().then(function (profile) {
    if (!profile || !profile.birth) {
      _showScreen('vdNoProfileScreen');
      return;
    }

    var birthInput = _normalizeBirthInput(profile);
    _logStage('ProfileResolved', {
      hasBirthDate: Boolean(_clean(birthInput.birthDate)),
      hasBirthTime: Boolean(_clean(birthInput.birthTime)),
      birthHour: birthInput.birthHour,
      hasTimezone: Boolean(_clean(birthInput.timezone)),
      hasLocation: Boolean(_clean(birthInput.birthPlace)),
    });
    _logStage('BirthInputNormalized', {
      birthDate: _clean(birthInput.birthDate),
      birthYear: birthInput.birthYear,
      birthMonth: birthInput.birthMonth,
      birthDay: birthInput.birthDay,
      birthHour: birthInput.birthHour,
      birthMinute: birthInput.birthMinute,
      timezone: _clean(birthInput.timezone),
    });

    try {
      _validateBeforePayment(birthInput);
      _logStage('ValidationBeforePayment', {
        hasBirthDate: Boolean(_clean(birthInput.birthDate)),
        hasBirthTime: Boolean(_clean(birthInput.birthTime)),
        birthHour: birthInput.birthHour,
      });
    } catch (error) {
      _logError(error, { stage: 'ValidationBeforePayment' });
      _setError(String(error && error.message ? error.message : error || '입력값 검증 실패'));
      return;
    }

    _ensureCurrentVedicGenerationIds();

    if (!_hasPremiumAccessForGeneration()) {
      if (!_ensurePremiumPaymentThenStart()) return;
      return;
    }

    _generating = true;
    _setStartBusy(true);
    _showScreen('vdLoadingScreen');
    _setLoadingProgress(1, VEDIC_TOTAL_CHAPTERS, '프로필 정보 확인 중');
    _startProgressAnimation();

    Promise.resolve()
      .then(function () {
        return _fetchVedicChart(profile, birthInput).then(function (chart) {
          if (chart) {
            _logStage('VedicPlanetsPrecalcReady', { source: _clean(chart && chart.source) || 'server-vedic' });
          } else {
            _logStage('VedicPlanetsPrecalcSkipped', { reason: 'unavailable' });
          }
          return chart;
        });
      })
      .then(function (chart) {
        _setLoadingProgress(2, VEDIC_TOTAL_CHAPTERS, '나크샤트라와 카라카를 해석하는 중입니다');
        _setLoadingProgress(VEDIC_TOTAL_CHAPTERS, VEDIC_TOTAL_CHAPTERS, '베다 점성술 리포트를 완성하는 중입니다');
        _logStage('SessionCreateStart', { endpoint: VEDIC_PREPARE_API, featureKey: VEDIC_FEATURE_KEY });
        var paymentContext = _bindPaymentToCurrentGeneration(_normalizePremiumPayment('', _lastPremiumPayment || {}));
        paymentContext.sessionId = _clean(paymentContext.sessionId || _currentVedicSessionId) || undefined;
        paymentContext.reportSessionId = _clean(paymentContext.reportSessionId || paymentContext.sessionId || _currentVedicSessionId) || undefined;
        paymentContext.premiumAccessToken = _readPremiumAccessToken() || paymentContext.premiumAccessToken || undefined;
        _currentVedicReportId = _clean(paymentContext.reportId || _currentVedicReportId);
        var paymentGrant = paymentContext.accessGrant && typeof paymentContext.accessGrant === 'object' ? paymentContext.accessGrant : null;
        return _postPrepare({
          sessionId: _currentVedicSessionId,
          featureKey: VEDIC_FEATURE_KEY,
          reportSessionId: paymentContext.reportSessionId || _currentVedicSessionId,
          purchaseId: paymentContext.purchaseId || undefined,
          requestId: paymentContext.requestId || undefined,
          reportId: _currentVedicReportId || paymentContext.reportId || undefined,
          accessGrant: paymentGrant || undefined,
          premiumAccessToken: paymentContext.premiumAccessToken || undefined,
          payment: paymentContext,
          _paymentContext: paymentContext,
          birthInput: birthInput,
          reportType: 'vedicPremium',
          mode: 'personal',
          vedicClientEvidenceJson: _buildVedicClientEvidenceJson(profile, birthInput, chart),
          vedicBase: chart ? _buildVedicBase(profile, chart, birthInput) : null,
        }).then(function (data) {
          _logStage('SessionCreateSuccess', {
            chapterCount: Number(data && data.chapterCount || 0),
            localAssembly: Boolean(data && data.localAssembly && data.localAssembly.enabled === true),
          });
          _logStage('PdfRequestStart', {
            chapterCount: Number(data && data.chapterCount || 0),
          });
          return data;
        });
      })
      .then(function (response) {
        response = response || {};

        if (response && response.status === 'running') {
          _logStage('SessionAlreadyRunning', { sessionId: _clean(response.sessionId || _currentVedicSessionId) });
          return _waitForVedicCompletion({
            sessionId: _clean(response.sessionId || _currentVedicSessionId),
            reportId: _clean(response.reportId || _currentVedicReportId),
          });
        }
        return response;
      })
      .then(function (response) {
        response = response || {};
        if (!_isCompletedReportReady(response)) {
          throw new Error('베다점 PDF 결과가 아직 완전히 저장되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        }

        _markPremiumAccessVerified(25 * 60 * 1000);
        _resultPayload = response;
        _chapters = Array.isArray(response.chapters) ? response.chapters : [];
        if (!_chapters.length) throw new Error('베다점 챕터 데이터가 비어 있습니다.');

        _setLoadingProgress(VEDIC_TOTAL_CHAPTERS, VEDIC_TOTAL_CHAPTERS, '사랑·직업·재물의 흐름을 정리하는 중입니다');
        _setLoadingProgress(VEDIC_TOTAL_CHAPTERS, VEDIC_TOTAL_CHAPTERS, 'PDF 편집/렌더링 중');
        _setLoadingProgress(VEDIC_TOTAL_CHAPTERS, VEDIC_TOTAL_CHAPTERS, '완료');
        _renderResult(_chapters, response.payload || {}, response);
        _logStage('PdfRequestSuccess', { chapterCount: _chapters.length, localAssembly: Boolean(response.localAssembly && response.localAssembly.enabled === true) });

        _showScreen('vdResultScreen');
      })
      .catch(function (error) {
        _logError(error, { stage: 'generate' });
        _setError(String(error && error.message ? error.message : error || '생성 실패'));
      })
      .finally(function () {
        _generating = false;
        _currentVedicSessionId = '';
        _currentVedicReportId = '';
        _currentVedicPaymentRequestId = '';
        _premiumAccessVerifiedUntil = 0;
        _premiumPaidUntil = 0;
        _lastPremiumPayment = null;
        _setStartBusy(false);
        _stopProgressAnimation();
      });
    }).catch(function (error) {
      _logError(error, { stage: 'resolve-profile' });
      _setError(String(error && error.message ? error.message : error || '생성 실패'));
    });
  };

  window.downloadVedicBookPdf = function () {
    if (!_chapters || !_chapters.length || !_resultPayload) {
      alert('리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }
    var storedUrl = _resolveVedicDownloadUrl(_resultPayload);
    if (storedUrl) {
      var anchor = document.createElement('a');
      anchor.href = storedUrl;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.download = (_clean(_resultPayload && _resultPayload.pdfReady && _resultPayload.pdfReady.filename) || 'vedic-premium-report.pdf').replace(/\.html?$/i, '.pdf');
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }

    alert('PDF 다운로드 링크가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
    return;

    if (!_resultPayload.pdfReady || !_resultPayload.pdfReady.html) {
      alert('리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }
    var html = String(_resultPayload.pdfReady.html || '');
    if (!html) {
      alert('PDF 본문을 생성하지 못했습니다. 다시 시도해 주세요.');
      return;
    }
    var url = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    var popup = window.open(url, '_blank', 'width=980,height=760');
    if (!popup) {
      alert('팝업이 차단되어 출력 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    popup.focus();
    setTimeout(function () { try { popup.print(); } catch (_) {} }, 1200);
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');
    if (action === 'openVedicBookModal') { window.openVedicBookModal(); return; }
    if (action === 'closeVedicBookModal') { window.closeVedicBookModal(); return; }
    if (action === 'gotoVedicPremium') { window.gotoVedicPremium(); }
  });
})();
