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
  var COVER_IMAGE = '/fuctionassets/신년운세.webp';

  var _generating = false;
  var _chapters = [];
  var _resultPayload = null;
  var _activeChapter = 1;
  var _progressTimer = null;
  var _premiumVerifiedUntil = 0;

  var LOADING_MESSAGES = [
    '사주 원국과 대상 연도를 검증하는 중입니다',
    '결제 및 접근 권한을 확인하는 중입니다',
    '원국, 대운, 세운, 월운 흐름을 계산하는 중입니다',
    '10챕터 상담 원고를 집필하는 중입니다',
    '원고 품질을 검증하고 PDF를 준비하는 중입니다'
  ];

  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }
  function _esc(value) {
    return _clean(value).replace(/[&<>"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] || ch;
    });
  }
  function _pad2(value) { return String(Number(value || 0)).padStart(2, '0'); }

  function _log(stage, meta) {
    try { console.info('[NewYearPremiumPDF][' + String(stage || 'Unknown') + ']', meta || {}); } catch (_) {}
  }
  function _logError(error, meta) {
    try {
      var safe = {
        stage: _clean(meta && meta.stage) || _clean(error && error.stage) || 'unknown',
        code: _clean(error && (error.code || error.name)) || _clean(meta && meta.code) || 'SAJU_NEW_YEAR_CLIENT_ERROR',
        message: _clean(error && error.message ? error.message : error) || 'unknown',
        status: Number(error && error.status || meta && meta.status || 0) || undefined,
        reportId: _clean(error && error.reportId || meta && meta.reportId || _resultPayload && _resultPayload.reportId) || undefined,
        sessionId: _clean(error && error.sessionId || meta && meta.sessionId || '') || undefined,
        causeMessage: _clean(error && error.causeMessage || error && error.cause && (error.cause.message || error.cause) || meta && meta.causeMessage) || undefined
      };
      if (error && error.debugSafe && typeof error.debugSafe === 'object') safe.debugSafe = error.debugSafe;
      console.error('[NewYearPremiumPDF][Error][' + safe.stage + ']', safe);
    } catch (_) {}
  }

  function _publicErrorMessage(error, fallback) {
    var message = _clean(error && error.message ? error.message : error);
    if (!message || message === '[object Object]' || /^HTTP\s*5\d\d/i.test(message)) {
      return fallback || '신년운세 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
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

  function _startProgressAnimation() {
    _stopProgressAnimation();
    var step = 0;
    _progressTimer = setInterval(function () {
      if (step < TOTAL_CHAPTERS) {
        step += 1;
        _setProgress(step, '10챕터 상담 원고 집필 중 (' + step + '/' + TOTAL_CHAPTERS + ')');
        return;
      }
      _setProgress(TOTAL_CHAPTERS, '원고 품질 최종 검증 중');
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
    var requestId = 'saju-new-year:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
    var premiumToken = _readPremiumAccessToken();
    var headers = { 'Content-Type': 'application/json' };
    if (premiumToken) headers['x-premium-access-token'] = premiumToken;
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
          var grant = _normalizeAccessGrant(data, reportId, requestId);
          if (!grant) {
            resolve({ ok: false, status: 500, message: '결제 접근 권한을 확인하지 못했습니다.', requestId: requestId });
            return;
          }
          _log('PaymentVerificationPassed', { featureKey: BILLING_FEATURE_KEY, reportId: reportId, hasPurchaseId: !!grant.purchaseId });
          resolve({ ok: true, accessGrant: grant, premiumAccessToken: token, requestId: requestId });
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
            title: REASON,
            reason: REASON,
            coinPrice: COIN_COST,
            cost: COIN_COST,
            reportId: reportId,
            sessionId: 'saju-new-year:' + reportId,
            reportSessionId: 'saju-new-year:' + reportId,
            requestId: requestId,
            onGranted: function(_transactionId, payload) { finish(payload); },
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
        reason: REASON,
        mode: 'saju-new-year',
        reportId: reportId,
        sessionId: 'saju-new-year:' + reportId,
        reportSessionId: 'saju-new-year:' + reportId,
        requestId: requestId,
        forceDeduct: true
      })
    });
    var payload = {};
    try { payload = await response.json(); } catch (_) { payload = {}; }
    var data = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
    var token = _extractPremiumToken(payload);
    if (token) _persistPremiumAccessToken(token);
    var grant = _normalizeAccessGrant(data, reportId, requestId);
    if (!response.ok || payload.ok === false || !grant) {
      return { ok: false, status: response.status, message: _clean(payload.message || (payload.error && payload.error.message)) || '프리미엄 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다.' };
    }
    _log('PaymentVerificationPassed', { featureKey: BILLING_FEATURE_KEY, reportId: reportId, hasPurchaseId: !!grant.purchaseId });
    return { ok: true, accessGrant: grant, premiumAccessToken: token, requestId: requestId };
  }

  async function _postPrepare(payload) {
    var token = _readPremiumAccessToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['x-premium-access-token'] = token;
    var response = await fetch(PREPARE_API, {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify(payload)
    });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok || !body || body.ok === false) {
      var msg = _clean(body && body.message) || ('HTTP ' + response.status);
      _log('RequestFailed', { status: response.status, code: _clean(body && body.code), message: msg });
      var requestError = new Error(msg);
      requestError.status = response.status;
      requestError.code = _clean(body && body.code) || 'SAJU_NEW_YEAR_REQUEST_FAILED';
      requestError.stage = _clean(body && body.debugSafe && body.debugSafe.stage) || 'prepare';
      requestError.reportId = _clean(body && body.debugSafe && body.debugSafe.reportId);
      requestError.sessionId = _clean(body && body.debugSafe && body.debugSafe.sessionId);
      requestError.causeMessage = _clean(body && body.debugSafe && body.debugSafe.causeMessage);
      requestError.debugSafe = body && body.debugSafe;
      throw requestError;
    }
    return body;
  }

  async function _postPrepareUntilReady(payload) {
    var attempts = 0;
    var maxAttempts = 180;
    while (true) {
      var data = await _postPrepare(payload);
      if (!_isPrepareRunning(data)) return data;
      attempts += 1;
      _setProgress(Math.max(1, TOTAL_CHAPTERS - 1), '동일 세션의 신년운세 원고가 생성 중입니다. 완료 결과를 확인하는 중입니다.');
      if (attempts >= maxAttempts) {
        var timeoutError = new Error('신년운세 PDF 생성 시간이 길어지고 있습니다. 잠시 후 다시 확인해 주세요.');
        timeoutError.code = 'SAJU_NEW_YEAR_RUNNING_TIMEOUT';
        timeoutError.stage = 'prepare';
        throw timeoutError;
      }
      var waitMs = Number(data && data.retryAfterMs || 5000);
      await _sleep(Math.max(2000, Math.min(10000, waitMs)));
    }
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
      return '<button type="button" class="lb-toc-item ny-toc-item' + (index === 0 ? ' active' : '') + '" data-ny-chapter="' + no + '">' + _esc(_roman(no)) + '</button>';
    }).join('');
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
    _syncTocItems();
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
      _startProgressAnimation();

      _log('RequestReceived', { reportId: reportId, targetYear: targetYear });
      _log('PaymentVerificationStarted', { featureKey: BILLING_FEATURE_KEY });
      var sajuBase = _collectSajuBase();
      _log('LocalEngineStarted', { targetYear: targetYear });

      _postPrepareUntilReady({
        serviceKey: SERVICE_KEY,
        productKey: BILLING_FEATURE_KEY,
        featureKey: BILLING_FEATURE_KEY,
        apiFeatureKey: API_FEATURE_KEY,
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
        sajuBase: sajuBase,
        quantumMyeongriJson: _collectQuantumMyeongriJson()
      }).then(function (data) {
        var payload = data && data.data && typeof data.data === 'object' ? data.data : data;
        if (String(data && data.status || '') === 'running') {
          _setProgress(TOTAL_CHAPTERS, '동일 세션 생성이 진행 중입니다. 잠시 후 결과를 확인합니다.');
          return;
        }
        _markPremiumVerified(25 * 60 * 1000);
        _log('LocalChapterDraftCompleted', { chapterCount: Number(payload && payload.localDraftChapterCount || TOTAL_CHAPTERS) });
        _log('LocalQualityValidationPassed', { chapterCount: Number(payload && payload.localDraftChapterCount || TOTAL_CHAPTERS) });
        _log('FinalValidationPassed', { chapterCount: payload && payload.chapterCount || TOTAL_CHAPTERS });
        _log('PDFRenderStarted', { chapterCount: payload && payload.chapterCount || TOTAL_CHAPTERS });
        _setProgress(TOTAL_CHAPTERS, '신년운세 프리미엄 PDF를 완성하는 중입니다');
        _renderResult(payload, profile, targetYear);
        _log('PDFRenderCompleted', { chapterCount: _chapters.length, source: _clean(payload && payload.manuscriptSource) });
        if (payload && payload.fallbackUsed && payload.llmFallbackReason) {
          _setProgress(TOTAL_CHAPTERS, '일부 상담문 보강이 지연되어 기본 원고로 안전하게 완료했습니다');
        }
        _showScreen('nyResultScreen');
      }).catch(function (error) {
        _logError(error, { stage: 'generate' });
        _setError(_publicErrorMessage(error, '신년운세 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'));
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
    var result = _resultPayload || {};
    var ready = result.pdfReady && typeof result.pdfReady === 'object' ? result.pdfReady : {};
    var reportId = _clean(result.reportId || ready.reportId || '');
    var resolvedUrl = _clean(
      result.downloadUrl
      || result.pdfUrl
      || result.htmlUrl
      || result.storedUrl
      || result.reportUrl
      || result.fileUrl
      || result.storageUrl
      || ready.downloadUrl
      || ready.pdfUrl
      || ready.htmlUrl
      || ready.storedUrl
      || ready.reportUrl
      || ready.fileUrl
      || ready.storageUrl
      || (reportId ? ('/api/premium/pdf-archive/' + encodeURIComponent(reportId)) : '')
    );

    if (resolvedUrl) {
      var documentUrl = resolvedUrl;
      if (documentUrl.indexOf('/api/premium/pdf-archive/') >= 0 && !/[?&]format=/.test(documentUrl)) {
        documentUrl += (documentUrl.indexOf('?') >= 0 ? '&' : '?') + 'format=pdf';
      }
      var openWin = window.open(documentUrl, '_blank', 'noopener,noreferrer');
      if (!openWin) {
        window.alert('팝업이 차단되어 출력 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.');
        return;
      }
      openWin.focus();
      return;
    }

    if (!ready || !ready.html) {
      window.alert('신년운세 리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }

    var html = String(ready.html || '');
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
