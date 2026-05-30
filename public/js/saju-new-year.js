/**
 * Saju New Year premium PDF flow.
 * Uses the existing saju screen profile/engine snapshot, then calls the worker-native PDF pipeline.
 */
(function () {
  'use strict';

  var SERVICE_KEY = 'saju-new-year';
  var BILLING_FEATURE_KEY = 'saju_new_year_pdf';
  var API_FEATURE_KEY = 'premium_pdf_saju_new_year';
  var REASON = '사주 신년운세 PDF 리포트 생성';
  var PREPARE_API = '/api/saju-new-year/prepare';
  var TOTAL_CHAPTERS = 10;
  var COIN_COST = 300;
  var NEW_YEAR_FETCH_TIMEOUT_MS = 30000;
  var COVER_IMAGE = '/fuctionassets/신년운세.webp';

  var _generating = false;
  var _chapters = [];
  var _resultPayload = null;
  var _activeChapter = 1;
  var _progressTimer = null;
  var _premiumVerifiedUntil = 0;

  var LOADING_MESSAGES = [
    '새해의 운명 지도를 펼치는 중입니다',
    '원국과 올해의 흐름을 맞춰보고 있습니다',
    '대운과 세운이 만나는 지점을 읽고 있습니다',
    '일과 재물, 사랑의 흐름을 정리하고 있습니다',
    '올해의 마스터플랜을 완성하고 있습니다'
  ];

  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }
  function _esc(value) {
    return _clean(value).replace(/[&<>"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] || ch;
    });
  }
  function _pad2(value) { return String(Number(value || 0)).padStart(2, '0'); }

  function _buildApiCandidates(pathname) {
    var path = String(pathname || '');
    if (path.charAt(0) !== '/') path = '/' + path;
    var bases = [
      '',
      (typeof window !== 'undefined' && window.__CD_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.__AUTH_API_BASE_URL) || '',
      (typeof window !== 'undefined' && window.location && window.location.origin) || ''
    ];
    var seen = {};
    var out = [];
    for (var i = 0; i < bases.length; i += 1) {
      var base = String(bases[i] || '').trim();
      var url = base ? (base.replace(/\/+$/, '') + path) : path;
      if (seen[url]) continue;
      seen[url] = true;
      out.push(url);
    }
    return out.length ? out : [path];
  }

  function _fetchJsonWithTimeout(url, init, timeoutMs) {
    var controller = (typeof AbortController === 'function') ? new AbortController() : null;
    var timerId = null;
    if (controller) {
      timerId = setTimeout(function () {
        try { controller.abort(); } catch (_) {}
      }, Math.max(1000, Number(timeoutMs || NEW_YEAR_FETCH_TIMEOUT_MS)));
    }

    return fetch(url, Object.assign({}, init || {}, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
    }))
      .then(function (res) {
        return res.text().then(function (body) {
          var json = {};
          if (body) {
            try { json = JSON.parse(body); } catch (_) { json = {}; }
          }
          return { res: res, json: json };
        });
      })
      .finally(function () {
        if (timerId) clearTimeout(timerId);
      });
  }

  function _isRetryableNewYearStatus(status) {
    var code = Number(status || 0);
    return code >= 500 || code === 408 || code === 425 || code === 429;
  }

  function _isNewYearAuthOrPaymentFailure(status, payload) {
    var code = String((payload && (payload.code || payload.error || payload.message)) || '').toUpperCase();
    if (status === 401 || status === 402 || status === 403) return true;
    return code.indexOf('AUTH') >= 0
      || code.indexOf('UNAUTHORIZED') >= 0
      || code.indexOf('FORBIDDEN') >= 0
      || code.indexOf('PAYMENT') >= 0
      || code.indexOf('PREMIUM') >= 0;
  }

  function _log(stage, meta) {
    try { console.info('[NewYearPremiumPDF][' + String(stage || 'Unknown') + ']', meta || {}); } catch (_) {}
  }
  function _logError(error, meta) {
    try {
      var msg = String(error && error.message ? error.message : error || 'unknown');
      var stage = meta && meta.stage ? String(meta.stage) : '';
      var label = '[NewYearPremiumPDF][Error]' + (stage ? '[' + stage + ']' : '') + ' ' + msg;
      console.error(label, { message: msg, stage: stage, error: error });
    } catch (_) {}
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

  function _premiumTokenMatches() {
    var token = _readPremiumAccessToken();
    if (!token || typeof atob !== 'function') return false;
    try {
      var body = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      var reportType = _clean(body.reportType).toLowerCase().replace(/[^a-z0-9]/g, '');
      var featureKey = _clean(body.featureKey || body.productKey).toLowerCase();
      var exp = Number(body.exp || 0);
      var typeOk = reportType === 'sajunewyear' || featureKey.indexOf('saju_new_year') >= 0 || featureKey.indexOf('saju-newyear') >= 0;
      return typeOk && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000);
    } catch (_) {
      return false;
    }
  }

  function _markPremiumVerified(ttlMs) {
    var ttl = Number(ttlMs || 0);
    if (!Number.isFinite(ttl) || ttl <= 0) ttl = 25 * 60 * 1000;
    _premiumVerifiedUntil = Math.max(_premiumVerifiedUntil, Date.now() + ttl);
  }

  function _hasPremiumAccessForGeneration() {
    if (Date.now() < _premiumVerifiedUntil) return true;
    if (_premiumTokenMatches()) {
      _markPremiumVerified(25 * 60 * 1000);
      return true;
    }
    return false;
  }

  function _recoverBirthFromDom() {
    try {
      var birthDateEl = _qs('birthDate');
      if (!birthDateEl || !birthDateEl.value) return null;
      var parts = birthDateEl.value.split('-');
      var year = Number(parts[0]);
      var month = Number(parts[1]);
      var day = Number(parts[2]);
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
      var ns = 'FORTUNE_APP_USER_PROFILES';
      var list = JSON.parse(localStorage.getItem(ns + '.list') || '[]');
      var currId = localStorage.getItem(ns + '.current');
      return (currId && list.find(function (item) { return item.id === currId; })) || list[0] || null;
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

  function _showScreen(id) {
    ['nyStartScreen', 'nyLoadingScreen', 'nyResultScreen', 'nyErrorScreen'].forEach(function (screenId) {
      var el = _qs(screenId);
      if (el) el.style.display = screenId === id ? '' : 'none';
    });
  }

  function _setError(message) {
    var el = _qs('nyErrorMsg');
    if (el) el.textContent = _clean(message) || 'PDF 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    _showScreen('nyErrorScreen');
  }

  function _setBusy(isBusy) {
    var btn = _qs('nyGenerateBtn');
    if (!btn) return;
    btn.disabled = !!isBusy;
    btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function _setProgress(done, message) {
    var bounded = Math.max(0, Math.min(TOTAL_CHAPTERS, Number(done || 0)));
    var bar = _qs('nyProgressBar');
    var text = _qs('nyProgressText');
    var chapter = _qs('nyLoadingChapter');
    var num = _qs('nyLoadingChapterNum');
    if (bar) bar.style.width = (bounded / TOTAL_CHAPTERS * 100) + '%';
    if (text) text.textContent = bounded + ' / ' + TOTAL_CHAPTERS + ' 챕터 완성';
    if (chapter) chapter.textContent = message || LOADING_MESSAGES[bounded % LOADING_MESSAGES.length] || '신년운세를 정리하는 중입니다';
    if (num) num.textContent = bounded >= TOTAL_CHAPTERS ? '완성' : Math.max(1, bounded + 1) + '장';
  }

  function _startProgressAnimation(targetYear) {
    _stopProgressAnimation();
    var step = 0;
    var chapterTitles = [
      '제1장 ' + targetYear + '년 총운 작성 중...',
      '제2장 대운과 세운의 교차 작성 중...',
      '제3장 일과 커리어 운 작성 중...',
      '제4장 재물운 작성 중...',
      '제5장 연애와 인연운 작성 중...',
      '제6장 인간관계와 귀인운 작성 중...',
      '제7장 건강과 멘탈운 작성 중...',
      '제8장 월별 운세 작성 중...',
      '제9장 위기와 반전 작성 중...',
      '제10장 ' + targetYear + '년 마스터플랜 작성 중...'
    ];
    _progressTimer = setInterval(function () {
      if (step < TOTAL_CHAPTERS) {
        _setProgress(step + 1, chapterTitles[step] || LOADING_MESSAGES[step % LOADING_MESSAGES.length]);
        step += 1;
        return;
      }
      _setProgress(TOTAL_CHAPTERS, 'PDF를 완성하고 있습니다');
    }, 900);
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

  function _renderProfileSummary(profile) {
    var dateEl = _qs('nyResultDate');
    if (dateEl && profile && profile.birth) {
      dateEl.textContent = profile.birth.year + '. ' + profile.birth.month + '. ' + profile.birth.day + ' 생 · ' + (_targetYear() || new Date().getFullYear()) + '년 기준';
    }
  }

  function _buildReportId(targetYear) {
    return 'saju-new-year-' + targetYear + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function _normalizeAccessGrant(raw, reportId, fallbackRequestId) {
    var data = raw && typeof raw === 'object' ? raw : {};
    var accessGrant = data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    var consume = data.consume && typeof data.consume === 'object' ? data.consume : {};
    var normalizedReportId = _clean(accessGrant.reportId || data.reportId || reportId);
    var purchaseId = _clean(accessGrant.purchaseId || data.purchaseId || data.transactionId || consume.transactionId);
    var sessionId = _clean(accessGrant.sessionId || data.sessionId || data.reportSessionId || ('saju-new-year:' + normalizedReportId));
    var requestId = _clean(accessGrant.requestId || data.requestId || consume.requestId || fallbackRequestId);
    if (!normalizedReportId || !purchaseId) return null;
    return {
      ok: true,
      featureKey: BILLING_FEATURE_KEY,
      sessionId: sessionId,
      reportSessionId: sessionId,
      purchaseId: purchaseId,
      requestId: requestId,
      reportId: normalizedReportId,
      paidAt: _clean(accessGrant.paidAt || data.paidAt || new Date().toISOString())
    };
  }

  async function _runCoinGate(reportId) {
    var endpoints = _buildApiCandidates('/api/billing/coin-gate');
    var endpointIndex = 0;
    var requestId = 'saju-new-year:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
    var authToken = '';
    try { authToken = String(localStorage.getItem('fortune_auth_token') || '').trim(); } catch (_) { authToken = ''; }
    _log('PaymentVerificationStarted', { featureKey: BILLING_FEATURE_KEY, reportId: reportId });
    while (endpointIndex < endpoints.length) {
      var premiumToken = _readPremiumAccessToken();
      var headers = { 'Content-Type': 'application/json' };
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;
      if (authToken) headers.Authorization = 'Bearer ' + authToken;

      var pack;
      try {
        pack = await _fetchJsonWithTimeout(endpoints[endpointIndex++], {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            categoryKey: 'premium-report',
            featureKey: BILLING_FEATURE_KEY,
            reason: REASON,
            mode: 'saju-new-year',
            reportId: reportId,
            sessionId: 'saju-new-year:' + reportId,
            reportSessionId: 'saju-new-year:' + reportId,
            requestId: requestId,
            forceDeduct: true
          })
        }, NEW_YEAR_FETCH_TIMEOUT_MS);
      } catch (error) {
        if (endpointIndex < endpoints.length) continue;
        throw error;
      }

      var response = pack.res;
      var payload = pack.json || {};
      var data = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
      var token = _extractPremiumToken(payload);
      if (token) _persistPremiumAccessToken(token);
      var grant = _normalizeAccessGrant(data, reportId, requestId);
      if (response.ok && payload.ok !== false && grant) {
        _log('PaymentVerificationPassed', { featureKey: BILLING_FEATURE_KEY, reportId: reportId, hasPurchaseId: !!grant.purchaseId });
        return { ok: true, accessGrant: grant, premiumAccessToken: token, requestId: requestId };
      }

      if (_isNewYearAuthOrPaymentFailure(Number(response.status || 0), payload || {})) {
        return { ok: false, status: response.status, message: _clean(payload.message || (payload.error && payload.error.message)) || '프리미엄 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다.' };
      }
      if (!_isRetryableNewYearStatus(Number(response.status || 0))) {
        return { ok: false, status: response.status, message: _clean(payload.message || (payload.error && payload.error.message)) || ('결제 확인에 실패했습니다. HTTP ' + response.status) };
      }
    }

    return { ok: false, status: 0, message: '프리미엄 결제 확인 요청이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.' };
  }

  async function _postPrepare(payload) {
    var endpoints = _buildApiCandidates(PREPARE_API);
    var endpointIndex = 0;
    var authToken = '';
    try { authToken = String(localStorage.getItem('fortune_auth_token') || '').trim(); } catch (_) { authToken = ''; }

    while (endpointIndex < endpoints.length) {
      var token = _readPremiumAccessToken();
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['x-premium-access-token'] = token;
      if (authToken) headers.Authorization = 'Bearer ' + authToken;

      var pack;
      try {
        pack = await _fetchJsonWithTimeout(endpoints[endpointIndex++], {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        }, NEW_YEAR_FETCH_TIMEOUT_MS);
      } catch (error) {
        if (endpointIndex < endpoints.length) continue;
        var timeoutErr = new Error('신년운세 PDF 요청 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.');
        timeoutErr.status = 0;
        timeoutErr.code = 'NEW_YEAR_PREPARE_TIMEOUT';
        throw timeoutErr;
      }

      var response = pack.res;
      var body = pack.json || {};
      if (response.ok && body && body.ok !== false) {
        return body;
      }

      if (_isNewYearAuthOrPaymentFailure(Number(response.status || 0), body || {})) {
        var authErr = new Error(_clean(body && body.message) || '로그인 또는 결제 확인이 필요합니다.');
        authErr.status = response.status;
        authErr.code = _clean(body && body.code).toUpperCase() || 'NEW_YEAR_PREPARE_AUTH';
        authErr.serverMessage = _clean(body && body.message);
        authErr.errorDetails = body && body.errorDetails ? body.errorDetails : null;
        throw authErr;
      }

      if (!_isRetryableNewYearStatus(Number(response.status || 0))) {
        var msg = _clean(body && body.message) || ('HTTP ' + response.status);
        var code = _clean(body && body.code).toUpperCase();
        var err = new Error(msg || '요청 처리 중 문제가 발생했습니다.');
        err.status = response.status;
        err.code = code || 'NEW_YEAR_PREPARE_FAILED';
        err.serverMessage = msg;
        err.errorDetails = body && body.errorDetails ? body.errorDetails : null;
        _log('RequestFailed', { status: response.status, code: err.code, message: msg });
        throw err;
      }
    }

    var finalErr = new Error('신년운세 PDF 생성 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    finalErr.status = 0;
    finalErr.code = 'NEW_YEAR_PREPARE_RETRY_EXHAUSTED';
    throw finalErr;
  }

  function _toFriendlyErrorMessage(error) {
    var message = _clean(error && error.message);
    var code = _clean(error && error.code).toUpperCase();
    var status = Number(error && error.status || 0);

    if (code === 'SAJU_NEW_YEAR_SEED_INVALID' || code === 'MISSING_BIRTH' || code === 'INVALID_TARGET_YEAR') {
      return '입력 정보를 확인해 주세요. 생년월일/시간 정보가 부족하면 신년운세를 완성할 수 없습니다.';
    }
    if (code === 'PAYMENT_REQUIRED' || status === 402) {
      return '프리미엄 이용권 또는 코인 상태를 확인해 주세요.';
    }
    if (code === 'UNAUTHORIZED' || status === 401) {
      return '로그인이 만료되었습니다. 다시 로그인한 뒤 시도해 주세요.';
    }
    if (code === 'NEW_YEAR_LLM_TIMEOUT' || status === 504) {
      return 'AI 해석 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code === 'NEW_YEAR_LLM_CHAPTER_FAILED' || code === 'NEW_YEAR_FINAL_QUALITY_FAILED') {
      return '일부 챕터를 정밀하게 다듬는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (/internal server error/i.test(message)) {
      return '서버 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
    return message || 'PDF 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
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

  function _renderChapter(chapterNo) {
    var content = _qs('nyChapterContent');
    if (!content) return;
    var chapter = _chapters[chapterNo - 1] || null;
    if (!chapter) {
      content.innerHTML = '<p>챕터를 불러오지 못했습니다.</p>';
      return;
    }
    _activeChapter = chapterNo;
    var sections = Array.isArray(chapter.categories) && chapter.categories.length
      ? chapter.categories.map(function (section) {
        return '<section class="lb-result-article__section"><h4 class="lb-result-article__section-title">' + _esc(section.title) + '</h4><div class="lb-result-article__section-body">' + _mdToHtml(section.finalText || section.text || '') + '</div></section>';
      }).join('')
      : _mdToHtml(chapter.text || '');
    content.innerHTML = '<article class="lb-result-article"><h3>' + _esc(chapter.title) + '</h3>' + sections + '</article>';
    _renderToc();
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
    _chapters = Array.isArray(response.chapters) ? response.chapters : [];
    var nameEl = _qs('nyResultName');
    var dateEl = _qs('nyResultDate');
    if (nameEl) nameEl.textContent = targetYear + ' 신년운세 프리미엄 리포트';
    if (dateEl && profile && profile.birth) {
      dateEl.textContent = (profile.name || '사용자') + ' · ' + profile.birth.year + '. ' + profile.birth.month + '. ' + profile.birth.day + ' 생 · ' + new Date().toLocaleDateString('ko-KR') + ' 발행';
    }
    _activeChapter = 1;
    _bindToc();
    _renderChapter(1);
  }

  window.openSajuNewYearModal = function () {
    _log('ModalOpen');
    var modal = _qs('sajuNewYearModal');
    if (!modal) return;
    var yearEl = _qs('nyTargetYear');
    if (yearEl && !yearEl.value) yearEl.value = String(_resolveDefaultTargetYear());
    var profile = _getActiveBirthProfile();
    if (profile && profile.birth) {
      window.__cdActiveBirthProfile = profile;
      _renderProfileSummary(profile);
      _showScreen('nyStartScreen');
    } else {
      _setError('정확한 신년운세 계산을 위해 생년월일시 정보를 확인해 주세요.');
    }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
  };

  window.closeSajuNewYearModal = function () {
    var modal = _qs('sajuNewYearModal');
    if (!modal) return;
    _stopProgressAnimation();
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.generateSajuNewYear = function () {
    if (_generating) return;
    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth || !profile.birth.year) {
      _setError('정확한 신년운세 계산을 위해 생년월일시 정보를 확인해 주세요.');
      return;
    }
    var targetYear = _targetYear();
    if (!targetYear) {
      _setError('신년운세를 볼 대상 연도를 선택해 주세요.');
      return;
    }
    var normalizedBirth = _normalizeBirthInput(profile);
    if (!normalizedBirth.birthDate) {
      _setError('정확한 신년운세 계산을 위해 생년월일 정보를 확인해 주세요.');
      return;
    }
    _log('BirthInputValidated', { birthDate: normalizedBirth.birthDate, isTimeUnknown: normalizedBirth.isTimeUnknown });
    _log('TargetYearValidated', { targetYear: targetYear });

    if (typeof window.computeProfileForModal === 'function') {
      try { window.computeProfileForModal(profile); } catch (_) {}
    }

    var reportId = _buildReportId(targetYear);
    var runAfterBilling = function (accessGrant, premiumToken) {
      _generating = true;
      _setBusy(true);
      _showScreen('nyLoadingScreen');
      _setProgress(0, LOADING_MESSAGES[0]);
      _startProgressAnimation(targetYear);

      _log('RequestReceived', { reportId: reportId, targetYear: targetYear });
      _log('PaymentVerificationStarted', { featureKey: BILLING_FEATURE_KEY });
      var sajuBase = _collectSajuBase();
      _log('LocalEngineStarted', { targetYear: targetYear });

      _postPrepare({
        serviceKey: SERVICE_KEY,
        productKey: API_FEATURE_KEY,
        featureKey: API_FEATURE_KEY,
        billingFeatureKey: BILLING_FEATURE_KEY,
        reason: REASON,
        reportId: reportId,
        sessionId: accessGrant && accessGrant.sessionId,
        reportSessionId: accessGrant && (accessGrant.reportSessionId || accessGrant.sessionId),
        purchaseId: accessGrant && accessGrant.purchaseId,
        requestId: accessGrant && accessGrant.requestId,
        accessGrant: accessGrant || undefined,
        premiumAccessToken: premiumToken || _readPremiumAccessToken() || undefined,
        payment: accessGrant ? {
          featureKey: BILLING_FEATURE_KEY,
          requestId: accessGrant.requestId,
          purchaseId: accessGrant.purchaseId,
          sessionId: accessGrant.sessionId,
          reportSessionId: accessGrant.reportSessionId || accessGrant.sessionId,
          reportId: reportId
        } : undefined,
        _paymentContext: accessGrant ? {
          featureKey: BILLING_FEATURE_KEY,
          requestId: accessGrant.requestId,
          purchaseId: accessGrant.purchaseId,
          sessionId: accessGrant.sessionId,
          reportSessionId: accessGrant.reportSessionId || accessGrant.sessionId,
          reportId: reportId
        } : undefined,
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
        sajuBase: sajuBase
      }).then(function (data) {
        if (String(data && data.status || '') === 'running') {
          _setProgress(TOTAL_CHAPTERS, '동일 세션 생성이 진행 중입니다. 잠시 후 결과를 확인합니다.');
          return;
        }
        var manuscriptSource = _clean(data && data.manuscriptSource);
        var llmUsed = !!(data && data.llmUsed);
        var chapterCount = Array.isArray(data && data.chapters) ? data.chapters.length : 0;
        if (!llmUsed || manuscriptSource !== 'llm-only' || chapterCount !== TOTAL_CHAPTERS) {
          throw new Error('신년운세 PDF 생성 결과가 LLM 전용 규격을 충족하지 않았습니다. 잠시 후 다시 시도해 주세요.');
        }
        _log('GenerationDiagnostics', {
          reinforcedChapterNos: Array.isArray(data && data.generationDiagnostics && data.generationDiagnostics.reinforcedChapterNos)
            ? data.generationDiagnostics.reinforcedChapterNos
            : [],
          duplicateSentenceCount: Number(data && data.generationDiagnostics && data.generationDiagnostics.duplicateSentenceCount || 0)
        });
        _markPremiumVerified(25 * 60 * 1000);
        _log('ChapterGenerationStarted', { chapterCount: Number(data.chapterCount || TOTAL_CHAPTERS) });
        _log('ChapterGenerationCompleted', { chapterCount: Number(data.chapterCount || TOTAL_CHAPTERS), llmUsed: !!(data && data.llmUsed) });
        _log('FinalValidationPassed', { chapterCount: data.chapterCount || TOTAL_CHAPTERS });
        _log('PDFRenderStarted', { chapterCount: data.chapterCount || TOTAL_CHAPTERS });
        _setProgress(TOTAL_CHAPTERS, '신년운세 프리미엄 PDF를 완성하는 중입니다');
        _renderResult(data, profile, targetYear);
        _log('PDFRenderCompleted', { chapterCount: _chapters.length, source: _clean(data && data.manuscriptSource) });
        _showScreen('nyResultScreen');
      }).catch(function (error) {
        _logError(error, { stage: 'generate' });
        _setError(_toFriendlyErrorMessage(error));
      }).finally(function () {
        _generating = false;
        _setBusy(false);
        _stopProgressAnimation();
      });
    };

    if (_hasPremiumAccessForGeneration()) {
      runAfterBilling({ ok: true, featureKey: BILLING_FEATURE_KEY, sessionId: 'saju-new-year:' + reportId, reportSessionId: 'saju-new-year:' + reportId, purchaseId: 'token:' + reportId, requestId: 'token:' + reportId, reportId: reportId }, _readPremiumAccessToken());
      return;
    }

    _runCoinGate(reportId).then(function (gate) {
      if (!gate.ok) {
        if (Number(gate.status) === 402 && typeof window.__cdOpenChargeModal === 'function') window.__cdOpenChargeModal();
        window.alert(gate.message || '프리미엄 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다.');
        return;
      }
      _markPremiumVerified(25 * 60 * 1000);
      runAfterBilling(gate.accessGrant, gate.premiumAccessToken);
    }).catch(function (error) {
      _logError(error, { stage: 'billing' });
      window.alert('결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    });
  };

  window.downloadSajuNewYearPdf = function () {
    if (!_resultPayload || !_resultPayload.pdfReady || !_resultPayload.pdfReady.html) {
      window.alert('신년운세 리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }
    var html = String(_resultPayload.pdfReady.html || '');
    var htmlBlob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var htmlUrl = URL.createObjectURL(htmlBlob);
    var win = window.open(htmlUrl, '_blank', 'width=980,height=760');
    if (!win) {
      URL.revokeObjectURL(htmlUrl);
      window.alert('팝업이 차단되어 출력 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    win.focus();
    setTimeout(function () {
      try { win.print(); } catch (_) {}
      try { URL.revokeObjectURL(htmlUrl); } catch (_) {}
    }, 900);
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');
    if (action === 'openSajuNewYearModal') { window.openSajuNewYearModal(); return; }
    if (action === 'closeSajuNewYearModal') { window.closeSajuNewYearModal(); return; }
    if (action === 'generateSajuNewYear') { window.generateSajuNewYear(); return; }
    if (action === 'downloadSajuNewYearPdf') { window.downloadSajuNewYearPdf(); return; }
  });

  try { window.__cdSajuNewYearCoverImage = COVER_IMAGE; } catch (_) {}
})();