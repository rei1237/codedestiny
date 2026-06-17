/**
 * Premium Astrology PDF (Cosmic Chart)
 * Local chart-first pipeline + worker premium prepare endpoint.
 */
(function () {
  'use strict';

  var ASTRO_FEATURE_KEY = 'premium-astrology-report';
  var ASTRO_BILLING_FEATURE_KEY = 'premium-astrology-report';
  var ASTRO_PREPARE_API = '/api/astro/premium/prepare';
  var ASTRO_STATUS_API = '/api/astro/premium/status';
  var ASTRO_CHAPTERS_API = '/api/astro/premium/chapters';
  var ASTRO_WESTERN_CHART_API = '/api/astro/western-chart';
  var ASTRO_TOTAL_CHAPTERS = 12;
  var ASTRO_COIN_COST = 390;
  var ASTRO_PREPARE_TIMEOUT_MS = 90000;
  var ASTRO_DOWNLOAD_TIMEOUT_MS = 60000;
  var ASTRO_STATUS_POLL_MS = 4000;
  var ASTRO_SIGN_NAMES = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];

  var _chapters = [];
  var _canonicalChapters = [];
  var _resultPayload = null;
  var _generating = false;
  var _progressTimer = null;
  var _premiumAccessVerifiedUntil = 0;
  var _premiumPaidUntil = 0;
  var _lastPremiumPayment = null;

  function _qs(id) { return document.getElementById(id); }
  function _detachModalFromResultPage(modal) {
    try {
      if (!modal || !modal.parentElement) return;
      if (typeof modal.closest === 'function' && modal.closest('#resultPage')) {
        document.body.appendChild(modal);
      }
    } catch (_) {}
  }

  function _clean(v) { return String(v || '').trim(); }

  function _withPdfArchiveFormat(url, format) {
    var value = _clean(url);
    var targetFormat = _clean(format) || 'pdf';
    if (!value || value.indexOf('/api/premium/pdf-archive/') < 0) return value;
    if (/[?&]format=/i.test(value)) {
      return value.replace(/([?&]format=)[^&]+/i, '$1' + encodeURIComponent(targetFormat));
    }
    return value + (value.indexOf('?') >= 0 ? '&' : '?') + 'format=' + encodeURIComponent(targetFormat);
  }

  function _fetchWithTimeout(url, options, timeoutMs) {
    var ms = Math.max(1000, Number(timeoutMs || 0) || 30000);
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = null;
    var requestOptions = options || {};
    if (controller) {
      requestOptions = Object.assign({}, requestOptions, { signal: controller.signal });
      timer = setTimeout(function () { controller.abort(); }, ms);
    }
    return fetch(url, requestOptions).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  function _logFlow(code, meta) {
    try {
      console.info('[AstroBook][Flow] ' + code, meta || {});
    } catch (_) {}
  }

  function normalizeAstroError(error) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        status: error.status,
        code: error.code,
        stage: error.stage,
        payloadSafe: error.payloadSafe,
      };
    }
    if (typeof error === 'object' && error !== null) {
      try {
        return JSON.parse(JSON.stringify(error));
      } catch (_) {
        return { message: String(error) };
      }
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

  function _buildAstroApiError(pack, fallbackMessage, context) {
    var res = pack && pack.res ? pack.res : {};
    var payload = pack && pack.json && typeof pack.json === 'object'
      ? pack.json
      : (pack && pack.body && typeof pack.body === 'object' ? pack.body : {});
    var status = Number((pack && pack.status) || res.status || payload.status || payload.statusCode || 0);
    var safe = _payloadSafe(payload);
    var err = new Error(_clean(safe.message || fallbackMessage || ('HTTP ' + (status || ''))) || 'Astro PDF request failed.');
    err.status = status || undefined;
    err.code = _clean(safe.code) || 'ASTRO_PREMIUM_REQUEST_FAILED';
    err.stage = _clean(safe.stage || context && context.stage) || 'prepare';
    err.failureType = _clean(safe.failureType);
    err.reportId = _clean(safe.reportId || context && context.reportId);
    err.sessionId = _clean(safe.sessionId || context && context.sessionId);
    err.executionId = _clean(safe.executionId);
    err.missing = safe.missing;
    err.issues = safe.issues;
    err.payloadSafe = safe;
    err.payload = payload;
    return err;
  }

  function _logStage(stage, meta) {
    try {
      console.info('[AstroBook][' + stage + ']', meta || {});
    } catch (_) {}
  }

  function _logError(error, meta) {
    try {
      var payloadSafe = error && error.payloadSafe
        ? error.payloadSafe
        : _payloadSafe((error && error.payload) || (error && typeof error === 'object' ? error : {}));
      console.error('[AstroBook][Error]', {
        serviceKey: 'astro-premium',
        featureKey: ASTRO_FEATURE_KEY,
        billingFeatureKey: ASTRO_BILLING_FEATURE_KEY,
        reportType: 'westernAstrologyPremium',
        stage: _clean(meta && meta.stage || error && error.stage || payloadSafe.stage) || 'unknown',
        message: String(error && error.message ? error.message : error || 'unknown'),
        status: Number(error && error.status ? error.status : 0) || null,
        code: _clean(error && error.code || payloadSafe.code) || 'ASTRO_PREMIUM_CLIENT_ERROR',
        failureType: _clean(error && error.failureType || payloadSafe.failureType) || undefined,
        reportId: _clean(error && error.reportId || payloadSafe.reportId || meta && meta.reportId) || undefined,
        sessionId: _clean(error && error.sessionId || payloadSafe.sessionId || meta && meta.sessionId) || undefined,
        executionId: _clean(error && error.executionId || payloadSafe.executionId || meta && meta.executionId) || undefined,
        missing: _shortList(error && error.missing || payloadSafe.missing, 6),
        issues: _shortList(error && error.issues || payloadSafe.issues, 6),
        causeMessage: _clean(error && error.cause && (error.cause.message || error.cause)) || undefined,
        payloadSafe: payloadSafe,
        details: normalizeAstroError(error),
      });
    } catch (_) {}
  }

  function _persistPremiumAccessToken(token) {
    var value = String(token || '').trim();
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function _sanitizeText(v) {
    return String(v || '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|api|debug|object|recovered|calculationmode|swiss_required|astro_chart_seed_failed)\b/gi, '')
      .replace(/chapter\s*1/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .replace(/internal\s*server\s*error/gi, '')
      .replace(/데이터\s*부족/gi, '')
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

  function _renderAstroSectionBody(text) {
    var headingRe = /^(핵심 진단|차트 근거|현실에서 드러나는 모습|장점|주의점|상담사의 조언|실천 과제)$/;
    var src = String(text || '')
      .replace(/\r/g, '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|api|debug|object|recovered|calculationmode|swiss_required|astro_chart_seed_failed)\b/gi, '')
      .replace(/internal\s*server\s*error/gi, '')
      .replace(/데이터\s*부족/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .trim();
    return src
      .split(/\n+/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .map(function (line) {
        if (headingRe.test(line)) return '<h4 class="lb-sub-head">' + _escapeHtml(line) + '</h4>';
        return '<p class="lb-sub-paragraph">' + _escapeHtml(line) + '</p>';
      })
      .join('');
  }

  function _readPremiumAccessToken() {
    var t = '';
    try { t = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { t = ''; }
    if (!t) { try { t = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { t = ''; } }
    if (!t) { try { t = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { t = ''; } }
    return t;
  }

  function _extractPremiumToken(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var keys = ['premiumAccessToken', '_premiumAccessToken', 'accessToken', 'token'];
    for (var i = 0; i < keys.length; i += 1) {
      var found = String(payload[keys[i]] || '').trim();
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
      featureKey: ASTRO_BILLING_FEATURE_KEY,
      reportType: 'westernAstrologyPremium',
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

  function _premiumTokenMatches(reportType) {
    var token = _readPremiumAccessToken();
    if (!token || typeof atob !== 'function') return false;
    try {
      var payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      var actual = _clean(payload && payload.reportType).toLowerCase().replace(/[^a-z0-9]/g, '');
      var expected = _clean(reportType).toLowerCase().replace(/[^a-z0-9]/g, '');
      var aliases = ['westernastrologypremium', 'westernastrology', 'astropremium'];
      var matched = actual === expected || aliases.indexOf(actual) >= 0;
      var exp = Number(payload && payload.exp);
      return matched && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000);
    } catch (_) {
      return false;
    }
  }

  function _markPremiumAccessVerified(ttlMs) {
    var ttl = Number(ttlMs || 0);
    if (!Number.isFinite(ttl) || ttl <= 0) ttl = 25 * 60 * 1000;
    var until = Date.now() + ttl;
    if (until > _premiumAccessVerifiedUntil) _premiumAccessVerifiedUntil = until;
    if (until > _premiumPaidUntil) _premiumPaidUntil = until;
  }

  function _hasPremiumAccessForGeneration() {
    if (Date.now() < _premiumAccessVerifiedUntil) return true;
    if (_premiumTokenMatches('westernAstrologyPremium') || Date.now() < _premiumPaidUntil) {
      _markPremiumAccessVerified(25 * 60 * 1000);
      return true;
    }
    return false;
  }

  function _parseAstroBirthDateInput(value) {
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
    return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
      ? { year: year, month: month, day: day }
      : null;
  }

  function _recoverBirthFromDOM() {
    try {
      var birthDateEl = document.getElementById('birthDate');
      var hourEl = document.getElementById('birthHour');
      var minEl = document.getElementById('birthMinute');
      var nameEl = document.getElementById('nameInput');
      var femaleEl = document.getElementById('genderFemale');
      var countryEl = document.getElementById('birthCountry');
      if (!birthDateEl || !birthDateEl.value) return null;
      var dateParts = _parseAstroBirthDateInput(birthDateEl.value);
      var y = Number(dateParts && dateParts.year);
      var m = Number(dateParts && dateParts.month);
      var d = Number(dateParts && dateParts.day);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
      var isFemale = !!(femaleEl && femaleEl.checked);
      var locationData = _readAstroDomLocation() || {
        label: '대한민국 (서울)',
        lat: 37.5665,
        lon: 126.9780,
        lng: 126.9780,
        tzOffset: 9,
        tz: 'Asia/Seoul',
      };
      return {
        name: (nameEl && nameEl.value && nameEl.value.trim()) || '사용자',
        gender: isFemale ? 'F' : 'M',
        birth: {
          year: y,
          month: m,
          day: d,
          hour: hourEl && String(hourEl.value || '').trim() !== '' ? Number(hourEl.value) : null,
          minute: minEl && String(minEl.value || '').trim() !== '' ? Number(minEl.value) : 0,
        },
        location: locationData,
      };
    } catch (_) {
      return null;
    }
  }

  function _readAstroDomLocation() {
    try {
      var countryEl = document.getElementById('birthCountry');
      var opt = countryEl && countryEl.options ? countryEl.options[countryEl.selectedIndex] : null;
      if (!opt) return null;
      var lon = parseFloat(opt.getAttribute('data-long') || opt.getAttribute('data-lon') || opt.getAttribute('data-lng') || '126.9780');
      var lat = parseFloat(opt.getAttribute('data-lat') || '37.5665');
      var tzOffset = parseFloat(opt.getAttribute('data-tz') || opt.getAttribute('data-base-tz') || '9');
      return {
        label: _clean(opt.textContent || opt.getAttribute('data-label') || '') || '대한민국 (서울)',
        lat: Number.isFinite(lat) ? lat : 37.5665,
        lon: Number.isFinite(lon) ? lon : 126.9780,
        lng: Number.isFinite(lon) ? lon : 126.9780,
        tzOffset: Number.isFinite(tzOffset) ? tzOffset : 9,
        baseTzOffset: Number.isFinite(tzOffset) ? tzOffset : 9,
        tz: (opt && opt.value) || 'Asia/Seoul',
      };
    } catch (_) {
      return null;
    }
  }

  function _hasAstroBirth(candidate) {
    return !!(candidate && candidate.birth && Number.isFinite(Number(candidate.birth.year)));
  }

  function _scoreAstroProfileCandidate(candidate) {
    if (!_hasAstroBirth(candidate)) return -1;
    var birth = candidate.birth || {};
    var location = candidate.location || {};
    var score = 1;
    if (Number.isFinite(Number(birth.hour))) score += 2;
    if (_clean(location.label || candidate.birthPlace || candidate.locationName || candidate.place)) score += 2;
    if (Number.isFinite(Number(location.lat || candidate.latitude || candidate.lat))) score += 2;
    if (Number.isFinite(Number(location.lon != null ? location.lon : (location.lng != null ? location.lng : (candidate.longitude != null ? candidate.longitude : candidate.lng))))) score += 2;
    if (_clean(location.tz || location.timezone || candidate.timezone) || Number.isFinite(Number(location.tzOffset || candidate.tzOffset || candidate.timezoneOffsetHours))) score += 2;
    if (candidate === window.__cdCurrentDestinyProfile) score += 1;
    return score;
  }

  function _getActiveBirthProfile() {
    var candidates = [];
    try {
      if (typeof window.__cdGetCurrentDestinyProfile === 'function') candidates.push(window.__cdGetCurrentDestinyProfile());
    } catch (_) {}
    try { candidates.push(window.__cdCurrentDestinyProfile || null); } catch (_) {}
    candidates.push(_recoverBirthFromDOM());
    try { candidates.push(window.__cdActiveBirthProfile || null); } catch (_) {}
    try { candidates.push(window.__destinyFlowerSajuSnapshot || null); } catch (_) {}
    var best = null;
    var bestScore = -1;
    for (var i = 0; i < candidates.length; i += 1) {
      var score = _scoreAstroProfileCandidate(candidates[i]);
      if (score > bestScore) {
        best = candidates[i];
        bestScore = score;
      }
    }
    return bestScore >= 0 ? best : null;
  }

  function _showScreen(screenId) {
    var ids = ['abNoProfileScreen', 'abStartScreen', 'abLoadingScreen', 'abResultScreen', 'abErrorScreen'];
    ids.forEach(function (id) {
      var el = _qs(id);
      if (!el) return;
      el.style.display = (id === screenId) ? '' : 'none';
    });
  }

  function _setError(msg) {
    var raw = String(msg || '');
    var message = _sanitizeText(msg);
    if (/PAYMENT_CONFIRMED_BUT_ACCESS_MISSING|결제는 확인되었지만/i.test(raw)) {
      message = '결제는 확인되었지만 생성 권한 연결이 아직 완료되지 않았습니다. 잠시 후 다시 시도하면 중복 결제 없이 이어서 확인합니다.';
    } else if (/ASTRO_PAYMENT_CANCELLED|결제\s*취소|payment\s*cancel/i.test(raw)) {
      message = '결제가 완료되지 않았습니다. 결제 내역은 생성되지 않았으며, 원하실 때 다시 생성할 수 있습니다.';
    } else if (/internal\s*server\s*error|\bobject\b|ASTRO_PREMIUM|ASTRO_REPORT|ASTRO_CHART|PDF 결과|원고|검증|시간이 초과|생성 실패|생성 오류|HTTP\s*5/i.test(raw)) {
      message = 'PDF 생성이 완료되지 않았습니다. 결제 처리분은 자동 보상 확인 대상이며, 잠시 후 결제 내역을 확인한 뒤 다시 시도해 주세요.';
    }
    var el = _qs('abErrorMsg');
    if (el) el.textContent = message || '생성 중 오류가 발생했습니다.';
    _showScreen('abErrorScreen');
  }

  function _resolveAstroStoredUrl(payload) {
    var p = payload || {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    var fallbackArchive = p.reportId ? ('/api/premium/pdf-archive/' + encodeURIComponent(String(p.reportId))) : '';
    return _withPdfArchiveFormat(_clean(
      p.downloadUrl
      || p.pdfUrl
      || p.htmlUrl
      || ready.downloadUrl
      || ready.pdfUrl
      || ready.htmlUrl
      || fallbackArchive
    ), 'pdf');
  }

  function _isCompletedReportReady(response) {
    var payload = response || {};
    var chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
    var total = _getTotalChapters();
    var hasReportId = !!_clean(payload.reportId);
    var hasStoredUrl = !!_resolveAstroStoredUrl(payload);
    var completed = _clean(payload.status || '').toLowerCase();
    var chapterComplete = chapters.length >= total;
    return hasReportId && hasStoredUrl && chapterComplete && completed === 'completed' && _hasAstroLocalReady(payload, total);
  }

  function _hasAstroLocalReady(payload, totalOverride) {
    var p = payload || {};
    var ready = p.pdfReady && typeof p.pdfReady === 'object' ? p.pdfReady : {};
    var total = Number(totalOverride || _getTotalChapters() || ASTRO_TOTAL_CHAPTERS || 12);
    var localDraftChapterCount = Number(p.localDraftChapterCount || ready.localDraftChapterCount || 0);
    var localAssembly = p.localAssembly && typeof p.localAssembly === 'object'
      ? p.localAssembly
      : (ready.localAssembly && typeof ready.localAssembly === 'object' ? ready.localAssembly : {});
    var quality = p.quality && typeof p.quality === 'object' ? p.quality : {};
    var pdfQuality = p.pdfQuality && typeof p.pdfQuality === 'object' ? p.pdfQuality : {};
    var validation = p.validation && typeof p.validation === 'object' ? p.validation : {};
    var source = _clean(p.manuscriptSource || ready.manuscriptSource || quality.manuscriptSource).toLowerCase();
    var qualityOk = quality.ok !== false && pdfQuality.ok !== false && validation.ok !== false;
    return source === 'local-assembled'
      && localDraftChapterCount === total
      && qualityOk
      && localAssembly.enabled === true
      && localAssembly.externalGeneration === false
      && Number(localAssembly.chapterCount || 0) === total
      && Number(localAssembly.expectedChapterCount || 0) === total
      && _clean(localAssembly.templateVersion);
  }

  function _setStartBusy(isBusy) {
    var btn = _qs('abStartBtn');
    if (!btn) return;
    btn.disabled = !!isBusy;
    btn.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function _signFromIndex(index) {
    var n = Number(index);
    if (!Number.isFinite(n)) return '';
    return ASTRO_SIGN_NAMES[((Math.floor(n) % 12) + 12) % 12] || '';
  }

  function _signFromLongitude(longitude) {
    var n = Number(longitude);
    if (!Number.isFinite(n)) return '';
    return _signFromIndex(Math.floor((((n % 360) + 360) % 360) / 30));
  }

  function _readSign(node) {
    if (!node) return '';
    if (typeof node === 'string') return _clean(node);
    if (typeof node === 'number') return _signFromIndex(node);
    if (typeof node !== 'object') return '';
    var direct = _clean(node.signKo || node.signName || node.name || node.value);
    if (direct) return direct;
    if (typeof node.sign === 'string') return _clean(node.sign);
    if (typeof node.sign === 'number') return _signFromIndex(node.sign);
    if (node.sign && typeof node.sign === 'object') return _readSign(node.sign);
    return _signFromLongitude(node.longitude);
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
    for (var i = 0; i < bases.length; i++) {
      var base = String(bases[i] || '').trim();
      var url = base ? (base.replace(/\/+$/, '') + path) : path;
      if (seen[url]) continue;
      seen[url] = true;
      out.push(url);
    }
    return out;
  }

  function _formatBirth(profile) {
    var birth = (profile && profile.birth) || {};
    var y = Number(birth.year || 0);
    var m = Number(birth.month || 0);
    var d = Number(birth.day || 0);
    var h = Number(birth.hour);
    var mm = Number(birth.minute || 0);
    var hasTime = Number.isFinite(h);
    return {
      birthDate: [String(y).padStart(4, '0'), String(m).padStart(2, '0'), String(d).padStart(2, '0')].join('-'),
      birthTime: hasTime ? [String(h).padStart(2, '0'), String(Number.isFinite(mm) ? mm : 0).padStart(2, '0')].join(':') : '',
    };
  }

  function _parseBirthTimeInput(rawTime, rawHour, rawMinute) {
    var text = _clean(rawTime);
    if (/모름|미상|unknown|none|na/i.test(text)) {
      return { birthTime: '', birthHour: null, birthMinute: 0, isTimeUnknown: true };
    }
    var hhmm = text.match(/^(\d{1,2})\s*[:시]\s*(\d{1,2})/);
    if (hhmm) {
      var h1 = Math.max(0, Math.min(23, Number(hhmm[1])));
      var m1 = Math.max(0, Math.min(59, Number(hhmm[2])));
      return {
        birthTime: String(h1).padStart(2, '0') + ':' + String(m1).padStart(2, '0'),
        birthHour: h1,
        birthMinute: m1,
        isTimeUnknown: false,
      };
    }
    var korean = text.match(/오(전|후)\s*(\d{1,2})(?:\s*[:시]\s*(\d{1,2}))?/);
    if (korean) {
      var isPm = korean[1] === '후';
      var h2 = Math.max(0, Math.min(23, Number(korean[2])));
      var m2 = Math.max(0, Math.min(59, Number(korean[3] || 0)));
      if (isPm && h2 < 12) h2 += 12;
      if (!isPm && h2 === 12) h2 = 0;
      return {
        birthTime: String(h2).padStart(2, '0') + ':' + String(m2).padStart(2, '0'),
        birthHour: h2,
        birthMinute: m2,
        isTimeUnknown: false,
      };
    }
    var h3 = Number(rawHour);
    var m3 = Number(rawMinute || 0);
    if (!Number.isFinite(h3) && /^\d{1,2}$/.test(text)) h3 = Number(text);
    if (Number.isFinite(h3)) {
      h3 = Math.max(0, Math.min(23, Math.trunc(h3)));
      m3 = Number.isFinite(m3) ? Math.max(0, Math.min(59, Math.trunc(m3))) : 0;
      return {
        birthTime: String(h3).padStart(2, '0') + ':' + String(m3).padStart(2, '0'),
        birthHour: h3,
        birthMinute: m3,
        isTimeUnknown: false,
      };
    }
    return { birthTime: '', birthHour: null, birthMinute: 0, isTimeUnknown: true };
  }

  function _parseTimezoneOffsetLiteral(value) {
    if (value === 0) return 0;
    var raw = _clean(value);
    if (!raw) return NaN;
    var direct = Number(raw);
    if (Number.isFinite(direct)) return direct;
    var lower = raw.toLowerCase();
    if (lower === 'asia/seoul' || lower === 'asia/jeju' || lower === 'kst' || lower === 'korea standard time' || lower === 'korean standard time') return 9;
    if (lower === 'asia/tokyo' || lower === 'jst' || lower === 'japan standard time') return 9;
    if (lower === 'utc' || lower === 'gmt' || lower === 'z' || lower === 'zulu') return 0;
    var match = raw.match(/^(?:utc|gmt)?\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i);
    if (!match) return NaN;
    var hour = Number(match[2]);
    var minute = Number(match[3] || 0);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;
    return (match[1] === '-' ? -1 : 1) * (hour + minute / 60);
  }

  function _resolveTimezoneOffsetHours(timezone, parts) {
    var literal = _parseTimezoneOffsetLiteral(timezone);
    if (Number.isFinite(literal)) return literal;
    var raw = _clean(timezone);
    if (!raw || raw.indexOf('/') < 0 || typeof Intl === 'undefined' || !Intl.DateTimeFormat) return NaN;
    try {
      var p = parts || {};
      var year = Number(p.year || p.birthYear);
      var month = Number(p.month || p.birthMonth);
      var day = Number(p.day || p.birthDay);
      var hour = Number(p.hour != null ? p.hour : p.birthHour);
      var minute = Number(p.minute != null ? p.minute : p.birthMinute);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return NaN;
      var date = new Date(Date.UTC(year, month - 1, day, Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0));
      var formatted = new Intl.DateTimeFormat('en-US', {
        timeZone: raw,
        timeZoneName: 'shortOffset',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(date);
      for (var i = 0; i < formatted.length; i += 1) {
        if (formatted[i].type === 'timeZoneName') return _parseTimezoneOffsetLiteral(formatted[i].value);
      }
    } catch (_) {}
    return NaN;
  }

  function _pickAstroTimezoneOffset(profile, location) {
    var p = profile || {};
    var l = location || {};
    var values = [
      l.tzOffset,
      l.tzOffsetHours,
      l.timezoneOffsetHours,
      l.timezoneOffsetHour,
      l.timezoneOffset,
      l.utcOffsetHours,
      l.utcOffset,
      l.baseTzOffset,
      l.baseTimezoneOffset,
      p.timezoneOffsetHours,
      p.timezoneOffsetHour,
      p.tzOffsetHours,
      p.tzOffset,
      p.utcOffsetHours,
      p.utcOffset,
      p.baseTzOffset,
      p.baseTimezoneOffset
    ];
    for (var i = 0; i < values.length; i += 1) {
      if (values[i] == null || values[i] === '') continue;
      return values[i];
    }
    return null;
  }

  function _normalizeAstroBirthInput(profile) {
    var p = profile || {};
    var b = p.birth || {};
    var domLocation = _readAstroDomLocation() || {};
    var l = Object.assign({}, domLocation, p.location || {});
    var year = Number(b.year || p.birthYear || 0);
    var month = Number(b.month || p.birthMonth || 0);
    var day = Number(b.day || p.birthDay || 0);
    var parsedTime = _parseBirthTimeInput(
      b.time || b.birthTime || p.birthTime || '',
      b.hour != null ? b.hour : p.birthHour,
      b.minute != null ? b.minute : p.birthMinute
    );
    var tz = _clean(l.tz || l.timezone || p.timezone || '');
    var rawTzOffset = _pickAstroTimezoneOffset(p, l);
    var tzOffset = Number(rawTzOffset);
    if (!Number.isFinite(tzOffset)) {
      tzOffset = _resolveTimezoneOffsetHours(tz, {
        year: year,
        month: month,
        day: day,
        hour: parsedTime.birthHour,
        minute: parsedTime.birthMinute
      });
    }
    if (!tz && Number.isFinite(tzOffset)) tz = String(tzOffset);
    var gender = _clean(p.gender).toLowerCase();
    var normGender = 'unknown';
    if (gender === 'm' || gender === 'male' || gender.indexOf('남') >= 0) normGender = 'male';
    if (gender === 'f' || gender === 'female' || gender.indexOf('여') >= 0) normGender = 'female';
    return {
      name: _clean(p.name) || undefined,
      gender: normGender,
      birthDate: [String(year).padStart(4, '0'), String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-'),
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthTime: parsedTime.birthTime,
      birthHour: parsedTime.birthHour,
      birthMinute: parsedTime.birthMinute,
      timezone: tz,
      timezoneOffsetHours: Number.isFinite(tzOffset) ? tzOffset : null,
      baseTzOffset: Number.isFinite(tzOffset) ? tzOffset : null,
      birthPlace: _clean(l.label || l.name || p.birthPlace || p.place || p.locationName || ''),
      latitude: Number.isFinite(Number(l.lat != null ? l.lat : (l.latitude != null ? l.latitude : p.latitude))) ? Number(l.lat != null ? l.lat : (l.latitude != null ? l.latitude : p.latitude)) : null,
      longitude: Number.isFinite(Number(l.lon != null ? l.lon : (l.lng != null ? l.lng : (l.longitude != null ? l.longitude : (p.longitude != null ? p.longitude : (p.lng != null ? p.lng : p.lon)))))) ? Number(l.lon != null ? l.lon : (l.lng != null ? l.lng : (l.longitude != null ? l.longitude : (p.longitude != null ? p.longitude : (p.lng != null ? p.lng : p.lon))))) : null,
      isTimeUnknown: !!parsedTime.isTimeUnknown,
    };
  }

  function _validateBirthInputBeforePayment(birthInput) {
    var hasBirthDate = !!_clean(birthInput && birthInput.birthDate);
    var hasBirthYmd = Number.isFinite(Number(birthInput && birthInput.birthYear))
      && Number.isFinite(Number(birthInput && birthInput.birthMonth))
      && Number.isFinite(Number(birthInput && birthInput.birthDay));
    var hasBirthTime = Number.isFinite(Number(birthInput && birthInput.birthHour));
    var hasTimezone = !!_clean(birthInput && birthInput.timezone);
    var hasTimezoneOffset = Number.isFinite(Number(birthInput && birthInput.timezoneOffsetHours));
    var hasBirthPlace = !!_clean(birthInput && birthInput.birthPlace);
    var hasCoordinates = Number.isFinite(Number(birthInput && birthInput.latitude))
      && Number.isFinite(Number(birthInput && birthInput.longitude));
    if (!hasBirthDate || !hasBirthYmd) {
      return { ok: false, message: '생년월일 정보가 확인되지 않아 점성술 PDF를 생성할 수 없습니다. 프로필 카드에서 생년월일을 먼저 입력해주세요.' };
    }
    if (!hasBirthTime || birthInput.isTimeUnknown) {
      return { ok: false, message: '점성술 PDF는 상승궁과 하우스 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.' };
    }
    if (!hasTimezone || !hasTimezoneOffset) {
      return { ok: false, message: '점성술 PDF는 정확한 하우스 계산을 위해 출생지 시간대가 필요합니다. 프로필 카드에서 태어난 지역을 다시 선택해주세요.' };
    }
    if (!hasBirthPlace || !hasCoordinates) {
      return { ok: false, message: '점성술 PDF는 상승궁·하우스·천정점 계산을 위해 출생지가 필요합니다. 프로필 카드에서 태어난 지역을 먼저 선택해주세요.' };
    }
    return { ok: true };
  }

  function _buildChartFromLocal(profile) {
    if (typeof window.calcAstroSwissChartOrThrow !== 'function') return null;
    try {
      var birth = profile.birth || {};
      var location = profile.location || {};
      var hour = Number(birth.hour);
      if (!Number.isFinite(hour)) return null;
      var localHour = hour + Number(birth.minute || 0) / 60;
      var lat = Number(location.lat != null ? location.lat : 37.5665);
      var lon = Number(location.lon != null ? location.lon : (location.lng != null ? location.lng : 126.9780));
      var rawTz = location.tzOffset != null ? location.tzOffset : (location.timezoneOffset != null ? location.timezoneOffset : (location.utcOffset != null ? location.utcOffset : location.timezone || location.tz));
      var tz = _resolveTimezoneOffsetHours(rawTz, {
        year: birth.year,
        month: birth.month,
        day: birth.day,
        hour: birth.hour,
        minute: birth.minute
      });
      if (!Number.isFinite(tz)) return null;
      var hs = (typeof window !== 'undefined' && window.ASTRO_HOUSE_SYSTEM) ? window.ASTRO_HOUSE_SYSTEM : 'P';
      var chart = window.calcAstroSwissChartOrThrow(
        Number(birth.year),
        Number(birth.month),
        Number(birth.day),
        localHour,
        lat,
        lon,
        tz,
        hs,
      );
      return chart;
    } catch (_) {
      return null;
    }
  }

  function _buildPlanets(chart) {
    var planets = [];
    var dict = (chart && chart.planets) ? chart.planets : {};
    var keys = Object.keys(dict || {});
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var p = dict[k] || {};
      var signName = _readSign(p);
      planets.push({
        name: k,
        sign: signName,
        degree: Number(p.degree != null ? p.degree : (p.deg != null ? p.deg : (p.sign && p.sign.deg))),
        house: Number(p.house || 0) || undefined,
        retrograde: Boolean(p.retrograde || p.retro),
      });
    }
    return planets;
  }

  function _buildHouses(chart) {
    var houses = [];
    var h = (chart && chart.houses) ? chart.houses : {};
    if ((!h || !Object.keys(h).length) && Array.isArray(chart && chart.houseCusps)) {
      for (var c = 0; c < chart.houseCusps.length && c < 12; c++) {
        var lon = Number(chart.houseCusps[c]);
        houses.push({
          house: c + 1,
          sign: _signFromLongitude(lon),
          degree: Number.isFinite(lon) ? Math.round((((lon % 30) + 30) % 30) * 100) / 100 : undefined,
        });
      }
      return houses;
    }
    for (var i = 1; i <= 12; i++) {
      var node = h['h' + i] || {};
      houses.push({
        house: i,
        sign: _readSign(node),
        degree: Number(node.degree != null ? node.degree : (node.deg != null ? node.deg : (node.sign && node.sign.deg))),
      });
    }
    return houses;
  }

  function _buildAspects(chart) {
    var aspects = [];
    var arr = (chart && chart.natal && Array.isArray(chart.natal.aspects)) ? chart.natal.aspects : (Array.isArray(chart && chart.aspects) ? chart.aspects : []);
    for (var i = 0; i < arr.length; i++) {
      var a = arr[i] || {};
      aspects.push({
        planetA: _clean(a.a || a.p1 || a.planetA),
        planetB: _clean(a.b || a.p2 || a.planetB),
        type: _clean(a.type || a.aspect),
        orb: Number(a.orb),
        strength: _clean(a.strength),
      });
    }
    return aspects;
  }

  function _buildAstroBaseFromChart(profile, chart) {
    var birthFmt = _formatBirth(profile);
    if (!chart) return null;

    var planetMap = (chart && chart.planets) || {};
    var sunSign = _readSign(chart.sun || chart.Sun || planetMap.Sun);
    var moonSign = _readSign(chart.moon || chart.Moon || planetMap.Moon);
    var asc = _readSign(chart.asc || chart.ascendant);
    var mc = _readSign(chart.mc || chart.midheaven);

    return {
      user: {
        name: _clean(profile.name) || '사용자',
        birthDate: birthFmt.birthDate,
        birthTime: birthFmt.birthTime,
        birthPlace: _clean(profile.location && profile.location.label) || '대한민국 (서울)',
        timezone: _clean(profile.location && profile.location.tz) || 'Asia/Seoul',
        gender: _clean(profile.gender),
      },
      chart: {
        sunSign: sunSign,
        moonSign: moonSign,
        ascendant: asc,
        midheaven: mc,
        planets: _buildPlanets(chart),
        houses: _buildHouses(chart),
        aspects: _buildAspects(chart),
      },
      timing: {
        yearlyThemes: [],
        monthlyThemes: [],
      },
    };
  }

  function _buildAstroBase(profile) {
    return _buildAstroBaseFromChart(profile, _buildChartFromLocal(profile));
  }

  function _buildWesternChartRequest(profile) {
    var birth = (profile && profile.birth) || {};
    var location = (profile && profile.location) || {};
    var hour = Number(birth.hour);
    var minute = Number(birth.minute || 0);
    var rawTzOffset = _pickAstroTimezoneOffset(profile, location) || location.timezone || location.tz;
    var tzOffset = _resolveTimezoneOffsetHours(rawTzOffset, {
      year: birth.year,
      month: birth.month,
      day: birth.day,
      hour: birth.hour,
      minute: birth.minute
    });
    return {
      year: Number(birth.year),
      month: Number(birth.month),
      day: Number(birth.day),
      hour: Number.isFinite(hour) ? hour : null,
      minute: Number.isFinite(minute) ? minute : 0,
      timezone: Number.isFinite(tzOffset) ? tzOffset : NaN,
      lat: Number(location.lat != null ? location.lat : 37.5665),
      lon: Number(location.lon != null ? location.lon : (location.lng != null ? location.lng : 126.9780)),
    };
  }

  function _fetchWesternChart(profile) {
    var endpoints = _buildApiCandidates(ASTRO_WESTERN_CHART_API);
    var body = _buildWesternChartRequest(profile);
    var idx = 0;

    function run(resolve, reject, lastErr) {
      if (idx >= endpoints.length) {
        reject(new Error(lastErr || '점성술 계산 API 호출에 실패했습니다.'));
        return;
      }
      var url = endpoints[idx++];
      var headers = { 'Content-Type': 'application/json' };
      var authToken = '';
      try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        credentials: 'include',
        cache: 'no-store',
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok !== false) {
            resolve(pack.json);
            return;
          }
          run(resolve, reject, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status));
        })
        .catch(function (err) {
          run(resolve, reject, String(err && err.message || err || '요청 실패'));
        });
    }

    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _buildAstroBaseAsync(profile) {
    var localBase = _buildAstroBase(profile);
    if (localBase && localBase.chart && localBase.chart.sunSign && localBase.chart.moonSign && localBase.chart.ascendant) {
      _logFlow('ASTRO_SEED_OK', { source: 'local' });
      return Promise.resolve(localBase);
    }
    _logFlow('ASTRO_SEED_REMOTE_START');
    return _fetchWesternChart(profile).then(function (chart) {
      var remoteBase = _buildAstroBaseFromChart(profile, chart);
      if (!remoteBase || !remoteBase.chart || !remoteBase.chart.sunSign || !remoteBase.chart.moonSign || !remoteBase.chart.ascendant) {
        throw new Error('점성술 계산 결과가 PDF 생성에 필요한 구조와 맞지 않습니다.');
      }
      _logFlow('ASTRO_SEED_OK', { source: 'worker-western-chart' });
      return remoteBase;
    });
  }

  function _buildAstroClientEvidenceJson(profile, birthInput) {
    var localBase = _buildAstroBase(profile) || {};
    var chart = localBase.chart || {};
    var planets = Array.isArray(chart.planets) ? chart.planets : [];
    var houses = Array.isArray(chart.houses) ? chart.houses : [];
    var aspects = Array.isArray(chart.aspects) ? chart.aspects : [];
    var evidence = [
      chart.sunSign,
      chart.moonSign,
      chart.ascendant,
      chart.midheaven,
    ].concat(
      planets.slice(0, 12).map(function (planet) {
        return _clean(planet.name) + ' ' + _clean(planet.sign) + (planet.house ? ' ' + planet.house + 'H' : '');
      }),
      houses.slice(0, 12).map(function (house) {
        return _clean(house.house || house.number) + 'H ' + _clean(house.sign);
      }),
      aspects.slice(0, 16).map(function (aspect) {
        return _clean(aspect.pair || aspect.type || aspect.aspect);
      })
    ).map(_clean).filter(Boolean);

    return {
      schemaVersion: 'astro-premium-client-evidence.v1',
      source: 'browser-local-astro',
      chartAvailable: Boolean(chart.sunSign && chart.moonSign && chart.ascendant),
      evidenceCount: evidence.length,
      birthInput: {
        birthDate: _clean(birthInput && birthInput.birthDate),
        birthTime: _clean(birthInput && birthInput.birthTime),
        timezone: _clean(birthInput && birthInput.timezone),
        timezoneOffsetHours: Number.isFinite(Number(birthInput && birthInput.timezoneOffsetHours)) ? Number(birthInput.timezoneOffsetHours) : null,
        birthPlace: _clean(birthInput && birthInput.birthPlace),
      },
      coreSigns: {
        sun: _clean(chart.sunSign),
        moon: _clean(chart.moonSign),
        ascendant: _clean(chart.ascendant),
        midheaven: _clean(chart.midheaven),
      },
      planetCount: planets.length,
      houseCount: houses.length,
      aspectCount: aspects.length,
      evidence: evidence.slice(0, 40),
    };
  }

  function _renderProfileSummary(profile) {
    var el = _qs('abProfileSummary');
    if (!el) return;
    if (!profile) {
      el.textContent = '생년월일 정보를 찾을 수 없습니다. 먼저 기본 점성술 계산을 완료해 주세요.';
      return;
    }
    var birth = profile.birth || {};
    var place = (profile.location && profile.location.label) || '출생지 미입력';
    var hour = Number(birth.hour);
    var minute = Number(birth.minute || 0);
    var time = Number.isFinite(hour)
      ? [String(hour).padStart(2, '0'), String(Number.isFinite(minute) ? minute : 0).padStart(2, '0')].join(':')
      : '시간 미입력';
    el.textContent = [
      (profile.name || '사용자') + ' · ' + (profile.gender === 'F' ? '여성' : profile.gender === 'M' ? '남성' : ''),
      [birth.year, birth.month, birth.day].filter(Boolean).join('년 ') + '일 ' + time,
      place,
    ].join(' · ');
  }

  function _setLoadingProgress(step, total, title, done) {
    var safeTotal = Math.max(1, Math.trunc(Number(total || 1)));
    var safeStep = Math.max(0, Math.min(safeTotal, Math.trunc(Number(step || 0))));
    var isDone = done === true;
    var pct = Math.max(0, Math.min(100, Math.round((safeStep / safeTotal) * 100)));
    if (!isDone) pct = Math.min(92, pct);
    var bar = _qs('abProgressBar');
    var txt = _qs('abProgressText');
    var num = _qs('abLoadingChapterNum');
    var ch = _qs('abLoadingChapter');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = safeStep + ' / ' + safeTotal + ' 챕터 ' + (isDone ? '완성' : '진행');
    if (num) num.textContent = 'Chapter ' + Math.max(1, safeStep || 1);
    if (ch) ch.textContent = _sanitizeText(title || '점성술 코즈믹 리포트 PDF를 완성하는 중입니다');

    var dots = document.querySelectorAll('.ab-ch-dot');
    Array.prototype.forEach.call(dots, function (dot) {
      var n = Number(dot.getAttribute('data-abch'));
      dot.classList.toggle('lb-ch-dot--active', !isDone && n === Math.max(1, safeStep || 1));
      dot.classList.toggle('lb-ch-dot--done', isDone ? n <= safeStep : n < safeStep);
    });
  }

  function _getTotalChapters() {
    var fromCanonical = Array.isArray(_canonicalChapters) ? _canonicalChapters.length : 0;
    var fromResult = Array.isArray(_chapters) ? _chapters.length : 0;
    var fromState = Number(ASTRO_TOTAL_CHAPTERS || 0);
    var total = fromCanonical || fromResult || fromState || 1;
    return Math.max(1, Math.trunc(total));
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
      '출생 정보를 확인하는 중입니다',
      '리포트 세션을 여는 중입니다',
      '행성 좌표와 하우스를 계산하는 중입니다',
    ];
    var total = _getTotalChapters();
    var idx = 0;
    _setLoadingProgress(0, total, titles[0]);
    _progressTimer = setInterval(function () {
      if (!_generating) {
        _stopProgressAnimation();
        return;
      }
      total = _getTotalChapters();
      idx = (idx + 1) % titles.length;
      _setLoadingProgress(0, total, titles[idx]);
    }, 2400);
  }

  function _renderResult(chapters, payload) {
    var toc = _qs('abToc');
    var content = _qs('abChapterContent');
    var n = _qs('abResultName');
    var d = _qs('abResultDate');
    if (toc) toc.innerHTML = '';
    if (content) content.innerHTML = '';
    if (n) n.textContent = '✨ ' + _sanitizeText(payload && payload.user && payload.user.name || '사용자') + '님의 코즈믹 리포트';
    if (d) d.textContent = _sanitizeText(payload && payload.user && payload.user.birthDate || '');

    chapters.forEach(function (chapter, idx) {
      if (toc) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lb-toc-item loaded';
        btn.textContent = chapter.roman + '. ' + _sanitizeText(chapter.title);
        btn.addEventListener('click', function () {
          var sec = document.getElementById('abChapter-' + (idx + 1));
          if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        toc.appendChild(btn);
      }

      if (content) {
        var section = document.createElement('section');
        section.id = 'abChapter-' + (idx + 1);
        section.className = 'lb-chapter-card';
        var html = '<h4 class="lb-chapter-title">' + chapter.roman + '. ' + _sanitizeText(chapter.title) + '</h4>';
        var cats = Array.isArray(chapter.categories) ? chapter.categories : [];
        for (var i = 0; i < cats.length; i++) {
          var c = cats[i] || {};
          html += '<article class="lb-sub-card">'
            + '<h5 class="lb-sub-title">' + _sanitizeText(c.title || ('세부 카테고리 ' + (i + 1))) + '</h5>'
            + '<div class="lb-sub-body">' + _renderAstroSectionBody(c.text || c.localSummary || '') + '</div>'
            + '</article>';
        }
        section.innerHTML = html;
        content.appendChild(section);
      }
    });
  }

  function _fetchCanonicalChapters() {
    var endpoints = _buildApiCandidates(ASTRO_CHAPTERS_API);
    var idx = 0;
    function next(resolve) {
      if (idx >= endpoints.length) return resolve([]);
      var u = endpoints[idx++];
      fetch(u)
        .then(function (res) { return res.json().catch(function () { return {}; }); })
        .then(function (data) {
          if (data && data.ok && Array.isArray(data.chapters) && data.chapters.length) {
            resolve(data.chapters);
            return;
          }
          next(resolve);
        })
        .catch(function () { next(resolve); });
    }
    return new Promise(function (resolve) { next(resolve); });
  }

  function _postPrepare(body) {
    var endpoints = _buildApiCandidates(ASTRO_PREPARE_API);
    var idx = 0;
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();

    function run(resolve, reject, lastErr) {
      if (idx >= endpoints.length) {
        reject(lastErr instanceof Error ? lastErr : new Error(lastErr || '점성술 프리미엄 API 호출에 실패했습니다.'));
        return;
      }
      var url = endpoints[idx++];
      var headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;

      _fetchWithTimeout(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      }, ASTRO_PREPARE_TIMEOUT_MS)
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok) {
            _persistPremiumAccessToken(_extractPremiumToken(pack.json));
            resolve(pack.json);
            return;
          }
          run(resolve, reject, _buildAstroApiError(pack, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status), {
            stage: 'prepare',
            sessionId: body && body.sessionId,
            reportId: body && body.reportId
          }));
        })
        .catch(function (err) {
          if (err && err.name === 'AbortError') {
            if (idx < endpoints.length) {
              run(resolve, reject, err);
              return;
            }
            _fetchAstroStatus(body && body.sessionId, body && body.reportId)
              .then(function (payload) {
                var data = _statusData(payload);
                if (data.status === 'done' && data.result) {
                  resolve({ ok: true, status: 'done', result: data.result, sessionId: data.sessionId, reportId: data.reportId });
                  return;
                }
                if (data.status === 'running') {
                  resolve({
                    ok: true,
                    status: 'running',
                    sessionId: data.sessionId || (body && body.sessionId),
                    reportId: data.reportId || (body && body.reportId),
                    timeoutRecovery: true,
                  });
                  return;
                }
                reject(_buildAstroApiError({ status: data.statusCode || 500, body: data }, (data.error && data.error.message) || data.message || '점성술 PDF 생성 상태를 확인하지 못했습니다.', {
                  stage: 'prepare-timeout',
                  sessionId: body && body.sessionId,
                  reportId: body && body.reportId
                }));
              })
              .catch(function (statusErr) {
                reject(statusErr instanceof Error ? statusErr : new Error(String(statusErr && statusErr.message || statusErr || '상태 확인 실패')));
              });
            return;
          }
          reject(err instanceof Error ? err : new Error(String(err && err.message || err || '요청 실패')));
        });
    }

    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _astroStatusHeaders() {
    var headers = {};
    var authToken = '';
    var premiumToken = _readPremiumAccessToken();
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    if (authToken) headers.Authorization = 'Bearer ' + authToken;
    if (premiumToken) headers['x-premium-access-token'] = premiumToken;
    return headers;
  }

  function _fetchAstroStatus(sessionId, reportId) {
    var sid = _clean(sessionId);
    var rid = _clean(reportId);
    if (!sid && !rid) return Promise.reject(new Error('점성술 생성 세션을 확인할 수 없습니다.'));
    var query = [];
    if (sid) query.push('sessionId=' + encodeURIComponent(sid));
    if (rid) query.push('reportId=' + encodeURIComponent(rid));
    var endpoints = _buildApiCandidates(ASTRO_STATUS_API + '?' + query.join('&'));
    var idx = 0;
    function run(resolve, reject, lastErr) {
      if (idx >= endpoints.length) {
        reject(lastErr instanceof Error ? lastErr : new Error(lastErr || '점성술 생성 상태를 확인할 수 없습니다.'));
        return;
      }
      fetch(endpoints[idx++], { method: 'GET', headers: _astroStatusHeaders() })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return { res: res, json: json };
          });
        })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok) {
            resolve(pack.json);
            return;
          }
          run(resolve, reject, _buildAstroApiError(pack, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status), {
            stage: 'status',
            sessionId: sid
          }));
        })
        .catch(function (err) {
          run(resolve, reject, err instanceof Error ? err : new Error(String(err && err.message || err || '상태 확인 실패')));
        });
    }
    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _statusData(payload) {
    if (payload && payload.data && typeof payload.data === 'object') return payload.data;
    return payload || {};
  }

  function _statusRetryDelay(statusData) {
    var ms = Number(statusData && statusData.retryAfterMs);
    if (!Number.isFinite(ms) || ms < 1000) return ASTRO_STATUS_POLL_MS;
    return Math.min(10000, Math.max(1000, Math.trunc(ms)));
  }

  function _progressTitle(progress, statusData) {
    var state = _clean((progress && progress.stateKey) || (statusData && statusData.status));
    var title = _clean(progress && progress.currentChapterTitle);
    if (state === 'local_calculation') return '행성 좌표와 하우스의 삶의 장면을 정리하는 중입니다';
    if (state === 'writing_seed') return '차트의 핵심 상징을 상담 목차로 엮는 중입니다';
    if (state === 'writing_local') return title ? title : '12개 챕터의 상담문을 차례로 엮는 중입니다';
    if (state === 'manuscript_validated') return '챕터 흐름과 문장 결을 마지막으로 살피는 중입니다';
    if (state === 'pdf_rendering') return '코즈믹 리포트 PDF를 편집하는 중입니다';
    if (state === 'pdf_rendered') return 'PDF 저장 경로를 확인하는 중입니다';
    if (state === 'failed') return '코즈믹 리포트 작성이 완료되지 않았습니다';
    if (state === 'completed' || state === 'done') return '완료';
    return title || '점성술 코즈믹 리포트 PDF를 준비하는 중입니다';
  }

  function _applyAstroStatusProgress(statusPayload) {
    var data = _statusData(statusPayload);
    var progress = data.progress && typeof data.progress === 'object' ? data.progress : {};
    var total = Number(progress.totalChapters || data.chapterCount || ASTRO_TOTAL_CHAPTERS || 12);
    var current = Number(progress.currentChapterNo || data.localAssembly && data.localAssembly.chapterCount || 0);
    var state = _clean(progress.stateKey || data.status);
    if (Number.isFinite(total) && total > 0) ASTRO_TOTAL_CHAPTERS = Math.trunc(total);
    _setLoadingProgress(
      Number.isFinite(current) ? current : 0,
      _getTotalChapters(),
      _progressTitle(progress, data),
      state === 'completed' || state === 'done'
    );
    return data;
  }

  function _startAstroStatusPolling(sessionId, reportId) {
    _stopProgressAnimation();
    function tick() {
      if (!_generating) {
        _stopProgressAnimation();
        return;
      }
      _fetchAstroStatus(sessionId, reportId)
        .then(function (payload) {
          var data = _applyAstroStatusProgress(payload);
          if (data.status === 'done' || data.status === 'failed') _stopProgressAnimation();
        })
        .catch(function () {});
    }
    tick();
    _progressTimer = setInterval(tick, ASTRO_STATUS_POLL_MS);
  }

  function _waitForAstroCompletion(sessionId, reportId) {
    var started = Date.now();
    var timeoutMs = 12 * 60 * 1000;
    function wait() {
      return _fetchAstroStatus(sessionId, reportId).then(function (payload) {
        var data = _applyAstroStatusProgress(payload);
        if (data.status === 'done' && data.result) return data.result;
        if (data.status === 'failed') throw _buildAstroApiError({ status: data.statusCode || 500, body: data }, (data.error && data.error.message) || data.message || '점성술 PDF 생성에 실패했습니다.', {
          stage: 'status',
          sessionId: sessionId,
          reportId: data.reportId
        });
        if (Date.now() - started > timeoutMs) throw new Error('점성술 PDF 생성 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
        return new Promise(function (resolve) { setTimeout(resolve, _statusRetryDelay(data)); }).then(wait);
      });
    }
    return wait();
  }

  function _downloadAstroBookUrl(url, filename) {
    var safeUrl = _clean(url);
    if (!safeUrl) return Promise.reject(new Error('PDF 다운로드 URL이 아직 준비되지 않았습니다.'));
    return _fetchWithTimeout(safeUrl, {
      method: 'GET',
      headers: _astroStatusHeaders(),
    }, ASTRO_DOWNLOAD_TIMEOUT_MS)
      .then(function (res) {
        if (!res.ok) {
          return res.text().catch(function () { return ''; }).then(function (text) {
            var err = new Error(text || ('PDF 다운로드 요청에 실패했습니다. HTTP ' + res.status));
            err.status = res.status;
            throw err;
          });
        }
        return res.blob();
      })
      .then(function (blob) {
        var objectUrl = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename || 'astro-premium-report.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () {
          try { URL.revokeObjectURL(objectUrl); } catch (_) {}
        }, 1500);
      });
  }

  function _ensurePremiumPaymentAsync() {
    if (_hasPremiumAccessForGeneration()) {
      _logStage('PaymentGateStart', { featureKey: ASTRO_BILLING_FEATURE_KEY, reused: true });
      _logStage('PaymentGateSuccess', { featureKey: ASTRO_BILLING_FEATURE_KEY, reused: true });
      return Promise.resolve({ ok: true, skipped: true });
    }
    if (typeof window._cdCoinGatePerUse !== 'function') {
      var missingPaymentError = new Error('결제 모듈을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
      missingPaymentError.status = 503;
      missingPaymentError.code = 'ASTRO_PAYMENT_MODULE_MISSING';
      missingPaymentError.stage = 'billing';
      _logError(missingPaymentError, { stage: 'billing' });
      return Promise.reject(missingPaymentError);
    }
    _logStage('PaymentGateStart', { featureKey: ASTRO_BILLING_FEATURE_KEY });
    return new Promise(function (resolve, reject) {
      try {
        window._cdCoinGatePerUse(ASTRO_COIN_COST, '점성술 프리미엄 PDF 리포트 생성', function (_transactionId, data) {
          _lastPremiumPayment = _normalizePremiumPayment(_transactionId, data);
          _persistPremiumAccessToken(_lastPremiumPayment.premiumAccessToken || _extractPremiumToken(data));
          _markPremiumAccessVerified(25 * 60 * 1000);
          _logStage('PaymentGateSuccess', { featureKey: ASTRO_BILLING_FEATURE_KEY });
          resolve({ ok: true, skipped: false, data: _lastPremiumPayment });
        }, function () {
          var billingError = new Error('결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
          billingError.status = 402;
          billingError.code = 'ASTRO_PAYMENT_CANCELLED';
          billingError.stage = 'billing';
          _logError(billingError, { stage: 'billing' });
          reject(billingError);
        }, {
          featureKey: ASTRO_BILLING_FEATURE_KEY,
          requestId: 'astro-premium-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  window.openAstroBookModal = function () {
    _logFlow('CARD_CLICK');
    _logStage('ModalOpen', {});
    var modal = _qs('astroBookModal');
    if (!modal) return;
    _detachModalFromResultPage(modal);

    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth || !profile.birth.year) {
      try {
        var _dpMatch = (typeof window.__cdGetCurrentDestinyProfile === 'function' && window.__cdGetCurrentDestinyProfile())
          || window.__cdCurrentDestinyProfile
          || null;
        if (_dpMatch && _dpMatch.birth && _dpMatch.birth.year) {
          window.__cdActiveBirthProfile = _dpMatch;
          profile = _dpMatch;
        }
      } catch (_dpE) {}
    }

    if (profile && profile.birth && profile.birth.year) {
      window.__cdActiveBirthProfile = profile;
      _renderProfileSummary(profile);
      _showScreen('abStartScreen');
    } else {
      _showScreen('abNoProfileScreen');
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}

    _fetchCanonicalChapters().then(function (chapters) {
      if (Array.isArray(chapters) && chapters.length) {
        _canonicalChapters = chapters;
        ASTRO_TOTAL_CHAPTERS = chapters.length;
      }
    }).catch(function () {});
  };

  window.closeAstroBookModal = function () {
    var modal = _qs('astroBookModal');
    if (!modal) return;
    _stopProgressAnimation();
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.gotoAstrologyPremium = function () {
    _logFlow('CARD_VISIBLE_CHECK', { card: 'gotoAstrologyPremium' });
    window.openAstroBookModal();
  };

  window.generateAstroBook = function () {
    if (_generating) return;
    var profile = _getActiveBirthProfile();
    _logStage('ProfileResolved', {
      hasBirthDate: !!(profile && profile.birth && profile.birth.year),
      hasBirthTime: !!(profile && profile.birth && Number.isFinite(Number(profile.birth.hour))),
      hasLocation: !!(profile && profile.location),
    });

    if (!profile || !profile.birth) {
      _showScreen('abNoProfileScreen');
      return;
    }

    var birthInput = _normalizeAstroBirthInput(profile);
    _logStage('BirthInputNormalized', {
      hasBirthDate: !!_clean(birthInput.birthDate),
      hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
      birthHour: Number.isFinite(Number(birthInput.birthHour)) ? Number(birthInput.birthHour) : null,
      hasTimezone: !!_clean(birthInput.timezone),
      hasLocation: !!_clean(birthInput.birthPlace),
      houseSystemUsed: true,
    });

    var valid = _validateBirthInputBeforePayment(birthInput);
    _logStage('ValidationBeforePayment', {
      ok: !!valid.ok,
      hasBirthDate: !!_clean(birthInput.birthDate),
      hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
      hasTimezone: !!_clean(birthInput.timezone),
      hasLocation: !!_clean(birthInput.birthPlace),
      houseSystemUsed: true,
    });
    if (!valid.ok) {
      _setError(valid.message);
      return;
    }

    var astroBase = _buildAstroBase(profile);
    var astroClientEvidenceJson = _buildAstroClientEvidenceJson(profile, birthInput);

    _generating = true;
    _setStartBusy(true);
    _showScreen('abLoadingScreen');
    var total = _getTotalChapters();
    _setLoadingProgress(0, total, '프로필 정보 확인 중');
    _startProgressAnimation();
    _setLoadingProgress(0, total, '결제 및 세션 준비 중');
    _logStage('PaymentAndSessionStart', { totalChapters: total });

    _ensurePremiumPaymentAsync()
      .then(function (payment) {
        var paymentContext = _normalizePremiumPayment('', (payment && payment.data) || _lastPremiumPayment || {});
        _logStage('SessionCreateStart', {
          hasBirthDate: !!_clean(birthInput.birthDate),
          hasBirthTime: Number.isFinite(Number(birthInput.birthHour)),
        });
        var sessionId = 'astro-premium:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
        paymentContext.sessionId = _clean(paymentContext.sessionId || sessionId) || undefined;
        paymentContext.reportSessionId = _clean(paymentContext.reportSessionId || paymentContext.sessionId || sessionId) || undefined;
        paymentContext.premiumAccessToken = _readPremiumAccessToken() || paymentContext.premiumAccessToken || undefined;
        var paymentGrant = paymentContext.accessGrant && typeof paymentContext.accessGrant === 'object' ? paymentContext.accessGrant : null;
        _logStage('SessionCreateSuccess', { sessionId: sessionId });
        _setLoadingProgress(0, total, '출생 차트 계산 요청 중');
        _logStage('PdfRequestStart', { featureKey: ASTRO_FEATURE_KEY, sessionId: sessionId });
        return _postPrepare({
          featureKey: ASTRO_FEATURE_KEY,
          reportType: 'westernAstrologyPremium',
          premiumAccessToken: paymentContext.premiumAccessToken || undefined,
          sessionId: sessionId,
          reportSessionId: paymentContext.reportSessionId || sessionId,
          purchaseId: paymentContext.purchaseId || undefined,
          requestId: paymentContext.requestId || undefined,
          reportId: paymentContext.reportId || undefined,
          accessGrant: paymentGrant || undefined,
          payment: paymentContext,
          _paymentContext: paymentContext,
          birthInput: birthInput,
          profile: profile,
          astroBase: astroBase && astroBase.chart ? astroBase : undefined,
          astroClientEvidenceJson: astroClientEvidenceJson,
        }).then(function (response) {
          if (response && response.status === 'running') {
            return _waitForAstroCompletion(sessionId, response.reportId || paymentContext.reportId);
          }
          return response;
        });
      })
      .then(function (response) {
        if (response && response.result && response.status === 'done') response = response.result;
        total = _getTotalChapters();
        if (response && !_hasAstroLocalReady(response, total)) {
          throw new Error('점성술 프리미엄 원고 검증이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        }
        if (!_isCompletedReportReady(response)) {
          throw new Error('점성술 PDF 결과가 아직 완전히 저장되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        }
        _markPremiumAccessVerified(25 * 60 * 1000);
        _resultPayload = response;
        _chapters = Array.isArray(response.chapters) ? response.chapters : [];
        if (!_chapters.length) throw new Error('점성술 챕터 데이터가 비어 있습니다.');
        ASTRO_TOTAL_CHAPTERS = _chapters.length;
        total = _getTotalChapters();
        _setLoadingProgress(total, total, 'PDF 저장 정보를 확인하는 중입니다');
        _logStage('PdfRenderStart', { chapterCount: total });
        _setLoadingProgress(total, total, 'PDF 편집/렌더링 중');
        _renderResult(_chapters, response.payload || {});
        _setLoadingProgress(total, total, '완료', true);
        _logStage('PdfRequestSuccess', { chapterCount: _chapters.length, localAssembly: response.localAssembly || null });
        _showScreen('abResultScreen');
      })
      .catch(function (err) {
        _logError(err, { stage: 'generate' });
        _setError(String(err && err.message ? err.message : err || '생성 실패'));
      })
      .finally(function () {
        _generating = false;
        _setStartBusy(false);
        _stopProgressAnimation();
      });
  };

  window.downloadAstroBookPdf = function () {
    if (!_isCompletedReportReady(_resultPayload)) {
      _setError('점성술 프리미엄 원고와 PDF 저장이 아직 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    var url = _resolveAstroStoredUrl(_resultPayload);

    if (url) {
      var filename = ((_resultPayload && _resultPayload.pdfReady && _resultPayload.pdfReady.filename) || 'astro-premium-report.pdf').replace(/\.html?$/i, '.pdf');
      _downloadAstroBookUrl(url, filename).catch(function (err) {
        _logError(err, { stage: 'download' });
        _setError('PDF 다운로드 권한을 확인하지 못했습니다. 로그인 상태를 확인한 뒤 다시 시도해 주세요.');
      });
      return;
    }

    alert('리포트 저장 URL이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
  };

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var actionEl = target.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');

    if (action === 'openAstroBookModal') {
      window.openAstroBookModal();
      return;
    }
    if (action === 'closeAstroBookModal') {
      window.closeAstroBookModal();
      return;
    }
    if (action === 'gotoAstrologyPremium') {
      window.gotoAstrologyPremium();
      return;
    }
  });
})();
