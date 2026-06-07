(function () {
  'use strict';

  if (typeof window !== 'undefined' && window.__cdSoulOriginBookInitialized) {
    return;
  }
  if (typeof window !== 'undefined') {
    window.__cdSoulOriginBookInitialized = true;
  }

  var FEATURE_KEY = 'premium_pdf_soul_origin';
  var REPORT_TYPE = 'soulOriginKarma';
  var ARCHIVE_REPORT_TYPE = 'soul_origin_karma';
  var EXPECTED_CHAPTER_COUNT = 12;
  var REPORT_TYPE_ALIASES = [
    'premium_pdf_soul_origin',
    REPORT_TYPE,
    ARCHIVE_REPORT_TYPE,
    'soul-origin',
    'premium-soul-origin-report',
  ];
  var FEATURE_ALIASES = [
    REPORT_TYPE,
    ARCHIVE_REPORT_TYPE,
    'soul-origin',
    'premium-soul-origin-report',
  ];
  var COIN_COST = 690;
  var PREPARE_API = '/api/soul-origin';
  var STATUS_API = '/api/soul-origin/status';
  var READ_API = '/api/soul-origin/report';
  var SOUL_ORIGIN_FETCH_TIMEOUT_MS = 180000;
  var SOUL_ORIGIN_STATUS_TIMEOUT_MS = 360000;
  var SOUL_ORIGIN_STATUS_INITIAL_DELAY_MS = 2500;
  var SOUL_ORIGIN_STATUS_MAX_DELAY_MS = 8000;
  var STORAGE_KEY = 'premium:soul-origin:last:v1';
  var REQUEST_ID_KEY = 'premium:soul-origin:last-request-id:v1';
  var SESSION_ID_KEY = 'premium:soul-origin:last-session-id:v1';
  var TONE_PRESETS = {
    default: 1,
    emotion_first: 1,
    direct_action: 1,
    relationship_focus: 1,
    money_focus: 1,
    destiny_focus: 1,
  };
  var DEFAULT_TONE_PRESET = 'default';
  var DEFAULT_TONE_INTENSITY = 2;

  var _result = null;
  var _loadingTimer = null;
  var _isGenerating = false;

  var LOADING_TEXTS = [
    '다섯 운세 흐름의 핵심 주제를 정리하는 중입니다.',
    '사주 원국과 대운의 반복 패턴을 해석하는 중입니다.',
    '자미두수 명궁과 신궁의 운명 구조를 정리하는 중입니다.',
    '점성술과 베다점의 시기 흐름을 반영하는 중입니다.',
    '숙요점 인연 카르마를 통합하는 중입니다.',
    '운명의 업 프리미엄 리포트를 완성하는 중입니다.',
  ];

  function $(id) { return document.getElementById(id); }
  function clean(value) { return String(value == null ? '' : value).trim(); }

  function setDisplay(id, value) {
    var el = $(id);
    if (el) el.style.display = value;
  }

  function makeRequestId() {
    return 'soul-origin-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function makeSessionId() {
    return 'soul-origin:session:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
  }

  function readSessionValue(key) {
    try { return clean(sessionStorage.getItem(key) || ''); } catch (_) { return ''; }
  }

  function writeSessionValue(key, value) {
    try { sessionStorage.setItem(key, clean(value)); } catch (_) {}
  }

  function logStage(stage, extras) {
    var payload = Object.assign({
      stage: clean(stage) || 'unknown',
      reportType: REPORT_TYPE,
      productKey: FEATURE_KEY,
      requestId: readSessionValue(REQUEST_ID_KEY),
      sessionId: readSessionValue(SESSION_ID_KEY),
      errorCode: '',
    }, extras || {});
    var tag = '[DestinyPrayerBook] ' + payload.stage;
    if (payload.errorCode) {
      console.error(tag, payload);
      return;
    }
    console.info(tag, payload);
  }

  function shortList(value, limit) {
    var source = Array.isArray(value) ? value : [];
    return source.map(function (item) { return clean(item); }).filter(Boolean).slice(0, Math.max(1, Number(limit || 6)));
  }

  function payloadSafe(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.error && typeof data.error === 'object' ? data.error : {};
    var debugSafe = data.debugSafe && typeof data.debugSafe === 'object' ? data.debugSafe : {};
    return {
      code: clean(data.code || nested.code || data.errorCode || nested.errorCode || data.error) || undefined,
      message: clean(data.message || nested.message || data.reasonMessage || nested.reasonMessage || data.error) || undefined,
      stage: clean(data.stage || data.failureStage || debugSafe.stage || nested.stage || nested.failureStage) || undefined,
      failureType: clean(data.failureType || debugSafe.failureType || nested.failureType) || undefined,
      reportId: clean(data.reportId || debugSafe.reportId || nested.reportId) || undefined,
      sessionId: clean(data.sessionId || debugSafe.sessionId || nested.sessionId) || undefined,
      executionId: clean(data.executionId || debugSafe.executionId || nested.executionId) || undefined,
      missing: shortList(data.missing || nested.missing || data.hardMissingFields, 6),
      issues: shortList(data.issues || nested.issues || data.errors || nested.errors, 6),
      debugSafe: Object.keys(debugSafe).length ? debugSafe : undefined
    };
  }

  function buildApiError(pack, fallbackMessage, context) {
    var payload = pack && pack.data && typeof pack.data === 'object'
      ? pack.data
      : (pack && pack.body && typeof pack.body === 'object' ? pack.body : {});
    var status = Number((pack && pack.status) || payload.statusCode || payload.status || 0);
    var safe = payloadSafe(payload);
    var error = new Error(clean(safe.message || fallbackMessage || ('HTTP ' + (status || ''))) || 'Soul origin PDF request failed.');
    error.status = status || undefined;
    error.code = clean(safe.code) || 'SOUL_ORIGIN_REQUEST_FAILED';
    error.stage = clean(safe.stage || context && context.stage) || 'prepare';
    error.failureType = clean(safe.failureType);
    error.reportId = clean(safe.reportId || context && context.reportId);
    error.sessionId = clean(safe.sessionId || context && context.sessionId);
    error.executionId = clean(safe.executionId);
    error.missing = safe.missing;
    error.issues = safe.issues;
    error.payloadSafe = safe;
    error.payload = payload;
    return error;
  }

  function logExactError(error, extras) {
    try {
      var safePayload = error && error.payloadSafe
        ? error.payloadSafe
        : payloadSafe((error && error.payload) || (error && typeof error === 'object' ? error : {}));
      var safe = {
        serviceKey: 'soul-origin',
        featureKey: FEATURE_KEY,
        reportType: REPORT_TYPE,
        stage: clean(extras && extras.stage || error && error.stage || safePayload.stage) || 'unknown',
        failureType: clean(error && error.failureType || safePayload.failureType) || undefined,
        status: Number(error && error.status || extras && extras.status || 0) || undefined,
        code: clean(error && error.code || safePayload.code) || 'SOUL_ORIGIN_CLIENT_ERROR',
        message: clean(error && error.message ? error.message : error) || 'unknown',
        requestId: clean(extras && extras.requestId || error && error.requestId || readSessionValue(REQUEST_ID_KEY)) || undefined,
        sessionId: clean(extras && extras.sessionId || error && error.sessionId || safePayload.sessionId || readSessionValue(SESSION_ID_KEY)) || undefined,
        reportId: clean(extras && extras.reportId || error && error.reportId || safePayload.reportId) || undefined,
        executionId: clean(extras && extras.executionId || error && error.executionId || safePayload.executionId) || undefined,
        missing: shortList(error && error.missing || safePayload.missing, 6),
        issues: shortList(error && error.issues || safePayload.issues, 6),
        causeMessage: clean(error && error.cause && (error.cause.message || error.cause)) || undefined,
        payloadSafe: safePayload
      };
      console.error('[SoulOriginBook][Error][' + safe.stage + ']', safe);
    } catch (_) {}
  }

  function showScreen(name) {
    setDisplay('soStartScreen', name === 'start' ? '' : 'none');
    setDisplay('soLoadingScreen', name === 'loading' ? '' : 'none');
    setDisplay('soResultScreen', name === 'result' ? '' : 'none');
    setDisplay('soErrorScreen', name === 'error' ? '' : 'none');
  }

  function getApiBaseCandidates(path) {
    var p = String(path || '');
    if (p.charAt(0) !== '/') p = '/' + p;
    var out = [];
    var seen = {};
    function push(base) {
      var b = clean(base).replace(/\/+$/, '');
      var u = b ? (b + p) : p;
      if (seen[u]) return;
      seen[u] = true;
      out.push(u);
    }
    push('');
    push(window.__CD_API_BASE_URL || '');
    push(window.__API_BASE_URL || '');
    push(window.__AUTH_API_BASE_URL || '');
    push(window.location && window.location.origin ? window.location.origin : '');
    return out;
  }

  function parseDateParts(dateStr) {
    var m = clean(dateStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  }

  function parseTimeParts(timeStr) {
    var m = clean(timeStr).match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return null;
    return { hour: Number(m[1]), minute: Number(m[2]) };
  }

  function inferTimezoneOffsetHours(timezone) {
    if (!clean(timezone)) return 9;
    if (/seoul|tokyo/i.test(timezone)) return 9;
    if (/utc/i.test(timezone)) return 0;
    return 9;
  }

  function normalizeCalendarType(value) {
    var raw = clean(value || 'solar').toLowerCase();
    if (raw.indexOf('lunar') >= 0 || raw.indexOf('음') >= 0) {
      return raw.indexOf('leap') >= 0 || raw.indexOf('윤') >= 0 ? 'lunar_leap' : 'lunar';
    }
    return 'solar';
  }

  function normalizeTonePreset(value) {
    var raw = clean(value).toLowerCase().replace(/[\s]/g, '_');
    if (!raw || !TONE_PRESETS[raw]) {
      return DEFAULT_TONE_PRESET;
    }
    return raw;
  }

  function normalizeToneIntensity(value) {
    var parsed = Number(clean(value));
    if (!Number.isFinite(parsed)) return DEFAULT_TONE_INTENSITY;
    var next = Math.round(parsed);
    if (next < 1 || next > 5) return DEFAULT_TONE_INTENSITY;
    return next;
  }

  function normalizeToneWeightValue(value) {
    var parsed = Number(clean(value));
    if (!Number.isFinite(parsed)) return null;
    var next = Math.round(parsed);
    if (next < 0 || next > 10) return null;
    return next;
  }

  function readSoulOriginToneWeightsFromQuery(params) {
    var result = {};
    var parsedWeights = {};

    try {
      if (typeof params.get === 'function') {
        var packed = clean(params.get('toneWeights'));
        if (packed) {
          var parsed = JSON.parse(packed);
          if (parsed && typeof parsed === 'object') {
            parsedWeights = parsed;
          }
        }
      }
    } catch (_) {
      parsedWeights = {};
    }

    var direct = {
      love: normalizeToneWeightValue((typeof params.get === 'function' && params.get('toneWeightLove')) || ''),
      career: normalizeToneWeightValue((typeof params.get === 'function' && params.get('toneWeightCareer')) || ''),
      money: normalizeToneWeightValue((typeof params.get === 'function' && params.get('toneWeightMoney')) || ''),
      fortune: normalizeToneWeightValue((typeof params.get === 'function' && params.get('toneWeightFortune')) || ''),
      identity: normalizeToneWeightValue((typeof params.get === 'function' && params.get('toneWeightIdentity')) || ''),
    };
    var pLove = normalizeToneWeightValue(parsedWeights.love);
    var pCareer = normalizeToneWeightValue(parsedWeights.career);
    var pMoney = normalizeToneWeightValue(parsedWeights.money);
    var pFortune = normalizeToneWeightValue(parsedWeights.fortune);
    var pIdentity = normalizeToneWeightValue(parsedWeights.identity);
    var globalWeights = {};
    try { globalWeights = window.__cdSoulOriginToneWeights && typeof window.__cdSoulOriginToneWeights === 'object' ? window.__cdSoulOriginToneWeights : {}; } catch (_) { globalWeights = {}; }

    var gLove = normalizeToneWeightValue(globalWeights.love);
    var gCareer = normalizeToneWeightValue(globalWeights.career);
    var gMoney = normalizeToneWeightValue(globalWeights.money);
    var gFortune = normalizeToneWeightValue(globalWeights.fortune);
    var gIdentity = normalizeToneWeightValue(globalWeights.identity);

    if (pLove !== null || gLove !== null || direct.love !== null) result.love = direct.love !== null ? direct.love : (gLove !== null ? gLove : pLove);
    if (pCareer !== null || gCareer !== null || direct.career !== null) result.career = direct.career !== null ? direct.career : (gCareer !== null ? gCareer : pCareer);
    if (pMoney !== null || gMoney !== null || direct.money !== null) result.money = direct.money !== null ? direct.money : (gMoney !== null ? gMoney : pMoney);
    if (pFortune !== null || gFortune !== null || direct.fortune !== null) result.fortune = direct.fortune !== null ? direct.fortune : (gFortune !== null ? gFortune : pFortune);
    if (pIdentity !== null || gIdentity !== null || direct.identity !== null) result.identity = direct.identity !== null ? direct.identity : (gIdentity !== null ? gIdentity : pIdentity);

    if (Object.keys(result).length <= 0) return {};
    return result;
  }

  function readSoulOriginToneSettings() {
    var params = {};
    try {
      params = new URLSearchParams(window.location && window.location.search ? window.location.search : '');
    } catch (_) {
      params = {};
    }

    var preset = normalizeTonePreset(
      (typeof params.get === 'function' && clean(params.get('tonePreset'))) ||
      (typeof params.get === 'function' && clean(params.get('counselingTonePreset'))) ||
      (typeof params.get === 'function' && clean(params.get('toneMode'))) ||
      window.__cdSoulOriginTonePreset ||
      '',
    );

    var intensity = normalizeToneIntensity(
      (typeof params.get === 'function' && params.get('toneIntensity')) ||
      (typeof params.get === 'function' && params.get('toneWeight')) ||
      (typeof params.get === 'function' && params.get('toneStrength')) ||
      window.__cdSoulOriginToneIntensity,
    );
    var toneWeights = readSoulOriginToneWeightsFromQuery(params);

    return {
      tonePreset: preset,
      toneIntensity: intensity,
      toneWeights: toneWeights,
    };
  }

  function readStorageProfile() {
    try {
      var namespace = 'FORTUNE_APP_USER_PROFILES';
      var list = JSON.parse(localStorage.getItem(namespace + '.list') || '[]');
      var currentId = localStorage.getItem(namespace + '.current');
      var selected = (currentId && list.find(function (item) { return item && (item.id === currentId || item.profileId === currentId); })) || list[0] || null;
      if (!selected) return null;
      var birth = selected.birth || {};
      return {
        name: clean(selected.name || selected.profileName || '사용자') || '사용자',
        gender: clean(selected.gender || selected.sex || 'unknown') || 'unknown',
        birthDate: clean(selected.birthDate || selected.birthday || birth.birthDate || ''),
        birthTime: clean(selected.birthTime || selected.time || ''),
        birthPlace: clean(selected.birthPlace || selected.birthplace || (selected.location && selected.location.label) || ''),
        calendarType: clean(selected.calendarType || selected.calendar || selected.calType || birth.calendarType || birth.calendar || birth.calType || 'solar') || 'solar',
        timezone: clean(selected.timezone || (selected.location && selected.location.tz) || 'Asia/Seoul') || 'Asia/Seoul',
        latitude: Number(selected.latitude != null ? selected.latitude : (selected.location && selected.location.lat)),
        longitude: Number(selected.longitude != null ? selected.longitude : (selected.location && (selected.location.lon != null ? selected.location.lon : selected.location.lng))),
      };
    } catch (_) {
      return null;
    }
  }

  function readActiveProfile() {
    var profile = window.__cdActiveBirthProfile || {};
    var birth = profile.birth || {};
    if (birth.year && birth.month && birth.day) {
      var hasHour = Number.isFinite(Number(birth.hour));
      var hour = hasHour ? Number(birth.hour) : null;
      var minute = Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0;
      var date = [String(birth.year).padStart(4, '0'), String(birth.month).padStart(2, '0'), String(birth.day).padStart(2, '0')].join('-');
      var time = hasHour ? [String(hour).padStart(2, '0'), String(minute).padStart(2, '0')].join(':') : '';
      return {
        name: clean(profile.name || '사용자') || '사용자',
        gender: clean(profile.gender || 'unknown') || 'unknown',
        birthDate: date,
        birthTime: time,
        birthPlace: clean(profile.birthPlace || (profile.location && profile.location.label) || ''),
        calendarType: clean(profile.calendarType || profile.calendar || profile.calType || birth.calendarType || birth.calendar || birth.calType || 'solar') || 'solar',
        timezone: clean(profile.timezone || (profile.location && profile.location.tz) || 'Asia/Seoul') || 'Asia/Seoul',
        latitude: Number(profile.latitude != null ? profile.latitude : (profile.location && profile.location.lat)),
        longitude: Number(profile.longitude != null ? profile.longitude : (profile.location && (profile.location.lon != null ? profile.location.lon : profile.location.lng))),
      };
    }

    return readStorageProfile();
  }

  function normalizeInput(raw) {
    var src = raw || {};
    var date = parseDateParts(src.birthDate || '');
    var time = parseTimeParts(src.birthTime || '');
    if (!date) return null;

    var fallbackHour = Number(src.birthHour);
    var fallbackMinute = Number(src.birthMinute);
    if ((!time || !Number.isFinite(time.hour)) && Number.isFinite(fallbackHour)) {
      time = {
        hour: fallbackHour,
        minute: Number.isFinite(fallbackMinute) ? fallbackMinute : 0,
      };
    }

    if (!time || !Number.isFinite(time.hour)) return null;

    var lat = Number(src.latitude);
    var lon = Number(src.longitude);
    if (!Number.isFinite(lat)) lat = 37.5665;
    if (!Number.isFinite(lon)) lon = 126.978;

    var timezone = clean(src.timezone || 'Asia/Seoul') || 'Asia/Seoul';
    var calendarType = normalizeCalendarType(src.calendarType || src.calendar || src.calType || 'solar');

    return {
      name: clean(src.name || '사용자') || '사용자',
      gender: clean(src.gender || 'unknown') || 'unknown',
      birthDate: [String(date.year).padStart(4, '0'), String(date.month).padStart(2, '0'), String(date.day).padStart(2, '0')].join('-'),
      birthTime: [String(time.hour).padStart(2, '0'), String(time.minute).padStart(2, '0')].join(':'),
      birthPlace: clean(src.birthPlace || '출생지 미상') || '출생지 미상',
      calendarType: calendarType,
      timezone: timezone,
      timezoneOffset: inferTimezoneOffsetHours(timezone),
      latitude: lat,
      longitude: lon,
      year: date.year,
      month: date.month,
      day: date.day,
      hour: time.hour,
      minute: time.minute,
      birthHour: time.hour,
      birthMinute: time.minute,
    };
  }

  function resolveReportUrl(payload) {
    var pdfReady = payload && payload.pdfReady && typeof payload.pdfReady === 'object' ? payload.pdfReady : {};
    return clean(
      (payload && payload.pdfUrl)
      || (payload && payload.downloadUrl)
      || (payload && payload.htmlUrl)
      || pdfReady.pdfUrl
      || pdfReady.downloadUrl
      || pdfReady.htmlUrl
    );
  }

  function isSoulOriginReportReady(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var chapters = Array.isArray(data.chapters) ? data.chapters : [];
    var reportedCount = Number(data.chapterCount || 0);
    var status = clean(data.status).toLowerCase();
    var serverStatus = clean(data.serverStatus).toLowerCase();
    var qualityStatus = clean(data.qualityStatus).toLowerCase();
    var manuscriptSource = clean(data.manuscriptSource).toLowerCase();
    var chapterAuthoringSource = clean(data.chapterAuthoringSource).toLowerCase();
    var summarySource = clean(data.summarySource).toLowerCase();
    var fallbackUsed = data.fallbackUsed === true;
    var fallbackChapterCount = Number(data.fallbackChapterCount || 0);
    var localAuthoringUsed = data.localAuthoringUsed === true;
    var hasReportId = !!clean(data.reportId);
    var hasStoredUrl = !!resolveReportUrl(data);
    var isCompleted = (!status && !serverStatus) || status === 'completed' || serverStatus === 'completed';
    var hasExpectedChapters = chapters.length >= EXPECTED_CHAPTER_COUNT || reportedCount >= EXPECTED_CHAPTER_COUNT;
    var hasPassedQuality = !qualityStatus || qualityStatus === 'passed';
    var hasAcceptedManuscript = !manuscriptSource || manuscriptSource === 'llm-only' || manuscriptSource === 'local-calculation' || manuscriptSource === 'local-calculation+llm-enhanced';
    var hasAcceptedChapters = !chapterAuthoringSource || chapterAuthoringSource === 'llm-only' || chapterAuthoringSource === 'local-calculation' || chapterAuthoringSource === 'local-calculation+llm-enhanced';
    var hasLocalSummary = !summarySource || summarySource === 'local-calculation';
    var hasUsableFallback = !fallbackUsed || fallbackChapterCount <= EXPECTED_CHAPTER_COUNT;
    var hasAcceptedAuthoring = localAuthoringUsed || manuscriptSource === 'llm-only' || !manuscriptSource;
    return hasReportId && hasStoredUrl && hasExpectedChapters && hasPassedQuality && isCompleted && hasAcceptedManuscript && hasAcceptedChapters && hasLocalSummary && hasUsableFallback && hasAcceptedAuthoring;
  }

  function isSoulOriginRunning(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var nested = data.data && typeof data.data === 'object' ? data.data : {};
    var status = clean(data.status || data.serverStatus || nested.status).toLowerCase();
    return status === 'running' || status === 'processing' || status === 'generating' || status === 'pending';
  }

  function isSoulOriginFailed(payload) {
    var data = payload && typeof payload === 'object' ? payload : {};
    var status = clean(data.status || data.serverStatus).toLowerCase();
    var premiumStatus = clean(data.premiumStatus || (data.execution && data.execution.premiumStatus)).toLowerCase();
    var code = clean(data.code).toUpperCase();
    if (status === 'not_found' || code.indexOf('EXECUTION_NOT_FOUND') >= 0) return false;
    return data.ok === false || status === 'failed' || premiumStatus === 'failed' || premiumStatus === 'abandoned' || premiumStatus === 'refunded' || premiumStatus === 'refund_failed';
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, Math.max(0, Number(ms || 0)));
    });
  }

  function buildStatusPath(context) {
    var params = [];
    function add(key, value) {
      var text = clean(value);
      if (text) params.push(encodeURIComponent(key) + '=' + encodeURIComponent(text));
    }
    add('reportId', context && context.reportId);
    add('sessionId', context && context.sessionId);
    add('requestId', context && context.requestId);
    return STATUS_API + (params.length ? ('?' + params.join('&')) : '');
  }

  function callStatusApi(context, token) {
    var endpoints = getApiBaseCandidates(buildStatusPath(context));
    var idx = 0;
    var lastError = null;
    return new Promise(function (resolve, reject) {
      function run() {
        if (idx >= endpoints.length) {
          var error = lastError || new Error('운명의 업 PDF 생성 상태를 확인하지 못했습니다.');
          error.code = clean(error.code) || 'SOUL_ORIGIN_STATUS_LOOKUP_FAILED';
          reject(error);
          return;
        }
        var headers = {};
        var premiumToken = clean(token || readPremiumToken());
        var authToken = readAuthToken();
        if (premiumToken) headers['x-premium-access-token'] = premiumToken;
        if (authToken) headers.Authorization = 'Bearer ' + authToken;
        fetchJsonWithTimeout(endpoints[idx], { method: 'GET', headers: headers }, 20000)
          .then(function (pack) {
            if (pack.ok && pack.data) {
              resolve(pack.data);
              return;
            }
            if (pack.data) {
              var status = clean(pack.data.status || pack.data.serverStatus).toLowerCase();
              var code = clean(pack.data.code).toUpperCase();
              if (status === 'not_found' || code.indexOf('EXECUTION_NOT_FOUND') >= 0) {
                resolve(pack.data);
                return;
              }
            }
            if (pack.data && isSoulOriginFailed(pack.data)) {
              var failed = buildApiError(pack, clean(pack.data.message || pack.data.code) || '운명의 업 PDF 생성 중 문제가 발생했습니다.', {
                stage: 'status',
                reportId: clean(context && context.reportId),
                sessionId: clean(context && context.sessionId)
              });
              failed.code = clean(failed.code) || 'SOUL_ORIGIN_STATUS_FAILED';
              reject(failed);
              return;
            }
            lastError = buildApiError(pack, clean(pack.data && (pack.data.message || pack.data.code)) || ('HTTP ' + pack.status), {
              stage: 'status',
              reportId: clean(context && context.reportId),
              sessionId: clean(context && context.sessionId)
            });
            idx += 1;
            run();
          })
          .catch(function (error) {
            lastError = error instanceof Error ? error : new Error(clean(error && error.message) || '상태 확인 실패');
            idx += 1;
            run();
          });
      }
      run();
    });
  }

  async function pollSoulOriginStatus(context, token) {
    var started = Date.now();
    var delay = SOUL_ORIGIN_STATUS_INITIAL_DELAY_MS;
    while (Date.now() - started < SOUL_ORIGIN_STATUS_TIMEOUT_MS) {
      await sleep(delay);
      logStage('StatusPollStart', {
        requestId: clean(context && context.requestId),
        sessionId: clean(context && context.sessionId),
        reportId: clean(context && context.reportId),
      });
      var data = await callStatusApi(context, token);
      if (isSoulOriginReportReady(data)) {
        logStage('StatusPollSuccess', {
          requestId: clean(context && context.requestId),
          sessionId: clean(data && data.sessionId) || clean(context && context.sessionId),
          reportId: clean(data && data.reportId) || clean(context && context.reportId),
        });
        return data;
      }
      if (isSoulOriginFailed(data)) {
        var failed = buildApiError({ status: Number(data && data.statusCode || 500), data: data }, clean(data && (data.message || data.code)) || '운명의 업 PDF 생성 중 문제가 발생했습니다.', {
          stage: 'status',
          reportId: clean(context && context.reportId),
          sessionId: clean(context && context.sessionId)
        });
        failed.code = clean(failed.code) || 'SOUL_ORIGIN_GENERATION_FAILED';
        throw failed;
      }
      delay = Math.min(SOUL_ORIGIN_STATUS_MAX_DELAY_MS, delay + 1000);
    }
    var timeout = new Error('운명의 업 PDF 생성이 오래 걸리고 있습니다. 잠시 후 다시 불러오기를 시도해 주세요.');
    timeout.code = 'SOUL_ORIGIN_STATUS_TIMEOUT';
    throw timeout;
  }

  function shouldRecoverWithStatus(error) {
    var code = clean(error && error.code).toUpperCase();
    var msg = clean(error && error.message).toLowerCase();
    return code === 'REQUEST_FAILED'
      || code.indexOf('TIMEOUT') >= 0
      || msg.indexOf('abort') >= 0
      || msg.indexOf('timeout') >= 0
      || msg.indexOf('network') >= 0
      || msg.indexOf('failed to fetch') >= 0;
  }

  function renderResultActions(payload) {
    var reportUrl = resolveReportUrl(payload);
    var openBtn = $('soOpenReportBtn');
    var downloadBtn = $('soDownloadReportBtn');

    if (openBtn) {
      openBtn.style.display = reportUrl ? '' : 'none';
      openBtn.onclick = reportUrl ? function () { window.open(reportUrl, '_blank', 'noopener'); } : null;
    }

    if (downloadBtn) {
      downloadBtn.style.display = reportUrl ? '' : 'none';
      downloadBtn.onclick = reportUrl ? function () { window.open(reportUrl, '_blank', 'noopener'); } : null;
    }
  }

  function persistResult(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        reportId: clean(data && data.reportId),
        payload: data || null,
      }));
    } catch (_) {}
  }

  function readPersisted() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return parsed && parsed.payload ? parsed.payload : null;
    } catch (_) {
      return null;
    }
  }

  function renderResult(payload) {
    _result = payload;
    var titleEl = $('soResultTitle');
    var summaryEl = $('soResultSummary');
    var listEl = $('soResultContent');

    if (titleEl) titleEl.textContent = clean(payload && payload.title) || '운명의 업 프리미엄 리포트';
    if (summaryEl) summaryEl.textContent = clean(payload && payload.summary) || '운명의 업 리포트가 열렸습니다.';

    if (listEl) {
      listEl.innerHTML = '';
      var chapters = Array.isArray(payload && payload.chapters) ? payload.chapters : [];
      for (var i = 0; i < chapters.length; i += 1) {
        var chapter = chapters[i] || {};
        var article = document.createElement('article');
        article.className = 'lb-result-article';

        var h3 = document.createElement('h3');
        h3.className = 'lb-result-article__title';
        h3.textContent = clean(chapter.title || ('Chapter ' + (i + 1)));
        article.appendChild(h3);

        var subtitle = document.createElement('p');
        subtitle.className = 'lb-result-article__subtitle';
        subtitle.textContent = clean(chapter.subtitle || '');
        article.appendChild(subtitle);

        var sections = Array.isArray(chapter.sections) ? chapter.sections : [];
        for (var j = 0; j < sections.length; j += 1) {
          var sec = sections[j] || {};
          var sectionEl = document.createElement('section');
          sectionEl.className = 'lb-result-article__section';

          var h4 = document.createElement('h4');
          h4.className = 'lb-result-article__section-title';
          h4.textContent = clean(sec.title || ('항목 ' + (j + 1)));

          var body = document.createElement('p');
          body.className = 'lb-result-article__section-body';
          body.textContent = clean(sec.body || '');

          sectionEl.appendChild(h4);
          sectionEl.appendChild(body);
          article.appendChild(sectionEl);
        }

        listEl.appendChild(article);
      }
    }

    renderResultActions(payload || {});
    showScreen('result');
  }

  function stopLoadingTicker() {
    if (_loadingTimer) {
      clearInterval(_loadingTimer);
      _loadingTimer = null;
    }
  }

  function startLoadingTicker() {
    stopLoadingTicker();
    var idx = 0;
    var el = $('soLoadingMessage');
    if (!el) return;
    el.textContent = LOADING_TEXTS[0];
    _loadingTimer = setInterval(function () {
      idx = (idx + 1) % LOADING_TEXTS.length;
      el.textContent = LOADING_TEXTS[idx];
    }, 1700);
  }

  function readPremiumToken() {
    var token = '';
    try { token = clean(window.__cdPremiumAccessToken || ''); } catch (_) { token = ''; }
    if (!token) { try { token = clean(sessionStorage.getItem('cd_premium_access_token') || ''); } catch (_) { token = ''; } }
    if (!token) { try { token = clean(localStorage.getItem('cd_premium_access_token') || ''); } catch (_) { token = ''; } }
    return token;
  }

  function readAuthToken() {
    var token = '';
    try { token = clean(localStorage.getItem('fortune_auth_token') || ''); } catch (_) { token = ''; }
    return token;
  }

  function storePremiumToken(token) {
    var value = clean(token);
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function fetchJsonWithTimeout(url, init, timeoutMs) {
    var controller = (typeof AbortController === 'function') ? new AbortController() : null;
    var timerId = null;
    if (controller) {
      timerId = setTimeout(function () {
        try { controller.abort(); } catch (_) {}
      }, Math.max(1000, Number(timeoutMs || SOUL_ORIGIN_FETCH_TIMEOUT_MS)));
    }

    return fetch(url, Object.assign({}, init || {}, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
    }))
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: Number(res.status || 0), data: data };
        });
      })
      .finally(function () {
        if (timerId) clearTimeout(timerId);
      });
  }

  function isRetryableStatus(status) {
    var code = Number(status || 0);
    return code >= 500 || code === 408 || code === 425 || code === 429;
  }

  function isAuthOrPaymentFailure(status, payload) {
    var code = clean(payload && (payload.code || payload.error || payload.message)).toUpperCase();
    if (status === 401 || status === 402 || status === 403) return true;
    return code.indexOf('AUTH') >= 0
      || code.indexOf('UNAUTHORIZED') >= 0
      || code.indexOf('FORBIDDEN') >= 0
      || code.indexOf('PAYMENT') >= 0
      || code.indexOf('PREMIUM') >= 0;
  }

  function mapSoulOriginUserMessage(error) {
    var status = Number(error && error.status || 0);
    var code = clean(error && error.code).toUpperCase();
    var stage = clean(error && error.stage).toUpperCase();
    var raw = clean(error && error.message);

    if (status === 401 || code.indexOf('UNAUTHORIZED') >= 0 || code.indexOf('AUTH') >= 0) {
      return '로그인 후 운명의 업 PDF를 생성할 수 있습니다.';
    }
    if (code.indexOf('PAYMENT_CONFIRMED_BUT_ACCESS_MISSING') >= 0) {
      return '결제는 완료되었지만 생성 권한 연결이 지연되었습니다. 다시 시도해 주세요.';
    }
    if (status >= 500
      || code.indexOf('SERVICE_UNAVAILABLE') >= 0
      || code.indexOf('DB_UNAVAILABLE') >= 0
      || raw.toLowerCase().indexOf('database is temporarily unavailable') >= 0
      || raw.toLowerCase().indexOf('mongodb') >= 0
    ) {
      return '결제 서버 연결이 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (status === 402 || code.indexOf('PAYMENT_REQUIRED') >= 0 || code.indexOf('INSUFFICIENT') >= 0 || code.indexOf('COIN') >= 0 || code.indexOf('POINT') >= 0) {
      return '운명의 업 PDF 생성을 위해 코인이 필요합니다.';
    }
    if (code.indexOf('BIRTH_') >= 0 || raw.indexOf('태어난 시간') >= 0 || raw.indexOf('생년월일') >= 0) {
      return '생년월일시 정보를 확인한 뒤 다시 시도해 주세요.';
    }
    if (code.indexOf('REPORT_SAVE_URL_MISSING') >= 0 || code.indexOf('SOUL_ORIGIN_REPORT_NOT_READY') >= 0) {
      return 'PDF 저장 경로가 아직 열리지 않았습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code.indexOf('SOUL_ORIGIN_STATUS_TIMEOUT') >= 0) {
      return '운명의 업 PDF 생성이 오래 걸리고 있습니다. 잠시 후 reportId로 다시 불러와 주세요.';
    }
    if (stage === 'LLM-GENERATION' || stage === 'LLM_GENERATION') {
      return '상담 문장 생성 단계에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code.indexOf('SOUL_ORIGIN_LLM_CHAPTER_FAILED') >= 0
      || code.indexOf('SOUL_ORIGIN_LLM_DISABLED') >= 0
      || code.indexOf('LLM_ONLY') >= 0
    ) {
      return '운명의 상담 문장을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code.indexOf('SOUL_ORIGIN_LLM_GENERATION_FAILED') >= 0
      || code.indexOf('SOUL_ORIGIN_LLM_JSON_PARSE_FAILED') >= 0
      || code.indexOf('SOUL_ORIGIN_LLM_CHAPTER_VALIDATION_FAILED') >= 0
      || code.indexOf('SOUL_ORIGIN_LLM_MANUSCRIPT_VALIDATION_FAILED') >= 0
      || code.indexOf('SOUL_ORIGIN_GENERATION_FAILED') >= 0
      || code.indexOf('SOUL_ORIGIN_MANUSCRIPT_INVALID') >= 0
    ) {
      return '운명의 업 상담서 생성 중 문제가 발생했습니다. 입력 정보를 확인한 뒤 다시 시도해 주세요.';
    }
    if (code.indexOf('GEMINI_KEYS_MISSING') >= 0
      || code.indexOf('GEMINI_KEYS_UNUSABLE') >= 0
      || code.indexOf('GEMINI_EXHAUSTED') >= 0
      || code.indexOf('GEMINI_SDK') >= 0
    ) {
      return '상담 엔진 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (code.indexOf('SOUL_ORIGIN_ARCHIVE_URL_MISSING') >= 0) {
      return '상담 원고가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.';
    }
    return raw || '운명의 업 상담서를 여는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
  }

  function normalizeAccessGrant(raw, reportId, requestId, sessionId) {
    var data = raw && typeof raw === 'object' ? raw : {};
    var accessGrant = data.accessGrant && typeof data.accessGrant === 'object' ? data.accessGrant : {};
    var consume = data.consume && typeof data.consume === 'object' ? data.consume : {};

    var normalizedReportId = clean(accessGrant.reportId || data.reportId || reportId);
    var normalizedRequestId = clean(accessGrant.requestId || data.requestId || consume.requestId || requestId);
    var normalizedSessionId = clean(accessGrant.sessionId || data.sessionId || data.reportSessionId || sessionId);
    var purchaseId = clean(accessGrant.purchaseId || data.purchaseId || data.transactionId || consume.transactionId);

    if (!normalizedReportId || !normalizedSessionId || !normalizedRequestId || !purchaseId) return null;

    return {
      ok: true,
      featureKey: FEATURE_KEY,
      reportId: normalizedReportId,
      sessionId: normalizedSessionId,
      reportSessionId: normalizedSessionId,
      requestId: normalizedRequestId,
      purchaseId: purchaseId,
      paidAt: clean(accessGrant.paidAt || data.paidAt || new Date().toISOString()),
    };
  }

  function buildPaymentContext(payment, accessGrant, token, reportId, requestId, sessionId) {
    var source = payment && typeof payment === 'object' ? payment : {};
    var grant = accessGrant && typeof accessGrant === 'object' ? accessGrant : (source.accessGrant && typeof source.accessGrant === 'object' ? source.accessGrant : {});
    var nestedPayment = source.payment && typeof source.payment === 'object' ? source.payment : {};
    var nestedContext = source._paymentContext && typeof source._paymentContext === 'object' ? source._paymentContext : {};
    var normalizedSessionId = clean(grant.sessionId || grant.reportSessionId || source.sessionId || source.reportSessionId || nestedPayment.sessionId || nestedContext.sessionId || sessionId);
    var context = {
      featureKey: FEATURE_KEY,
      reportType: REPORT_TYPE,
      premiumAccessToken: clean(token || source.premiumAccessToken || source.accessToken || source.token || nestedPayment.premiumAccessToken || nestedContext.premiumAccessToken || readPremiumToken()) || undefined,
      requestId: clean(grant.requestId || source.requestId || nestedPayment.requestId || nestedContext.requestId || requestId) || undefined,
      purchaseId: clean(grant.purchaseId || source.purchaseId || source.paymentId || source.transactionId || nestedPayment.purchaseId || nestedContext.purchaseId) || undefined,
      transactionId: clean(source.transactionId || grant.transactionId || nestedPayment.transactionId || nestedContext.transactionId) || undefined,
      sessionId: normalizedSessionId || undefined,
      reportSessionId: clean(grant.reportSessionId || grant.sessionId || source.reportSessionId || nestedPayment.reportSessionId || nestedContext.reportSessionId || normalizedSessionId || sessionId) || undefined,
      reportId: clean(grant.reportId || source.reportId || nestedPayment.reportId || nestedContext.reportId || reportId) || undefined,
    };
    if (Object.keys(grant).length) context.accessGrant = grant;
    return context;
  }

  function runServerCoinGate(reportId, requestId, sessionId) {
    var endpoints = getApiBaseCandidates('/api/billing/coin-gate');
    var idx = 0;

    function next(resolve, reject, lastMessage) {
      if (idx >= endpoints.length) {
        reject(lastMessage instanceof Error ? lastMessage : new Error(lastMessage || '코인 결제 확인에 실패했습니다.'));
        return;
      }

      var token = readPremiumToken();
      var authToken = readAuthToken();
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['x-premium-access-token'] = token;
      if (authToken) headers.Authorization = 'Bearer ' + authToken;

      fetchJsonWithTimeout(endpoints[idx++], {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          categoryKey: 'premium-report',
          featureKey: FEATURE_KEY,
          reason: '운명의 업 리포트 생성',
          reportType: REPORT_TYPE,
          mode: 'soul-origin',
          reportId: reportId,
          sessionId: sessionId,
          reportSessionId: sessionId,
          requestId: requestId,
          forceDeduct: true,
        }),
      }, SOUL_ORIGIN_FETCH_TIMEOUT_MS)
        .then(function (pack) {
          var payload = pack && pack.data ? pack.data : {};
          var data = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
          var premiumToken = clean((data && (data.premiumAccessToken || data.accessToken || data.token)) || (payload && (payload.premiumAccessToken || payload.accessToken || payload.token)));
          if (premiumToken) storePremiumToken(premiumToken);

          var grant = normalizeAccessGrant(data, reportId, requestId, sessionId);
          if (pack.ok && payload.ok !== false && grant) {
            resolve({
              ok: true,
              premiumAccessToken: premiumToken || readPremiumToken(),
              accessGrant: grant,
              requestId: grant.requestId,
              sessionId: grant.sessionId,
            });
            return;
          }

          if (isAuthOrPaymentFailure(pack.status, payload)) {
            var accessErr = buildApiError({ status: pack.status, data: payload }, clean(payload.message || payload.error || payload.code) || '결제는 완료되었지만 생성 권한 연결이 지연되었습니다. 다시 시도해 주세요.', {
              stage: 'billing',
              reportId: reportId,
              sessionId: sessionId
            });
            accessErr.code = clean(accessErr.code) || 'PAYMENT_REQUIRED';
            reject(accessErr);
            return;
          }

          if (!isRetryableStatus(pack.status)) {
            reject(buildApiError({ status: pack.status, data: payload }, clean(payload.message || payload.error || payload.code) || ('HTTP ' + pack.status), {
              stage: 'billing',
              reportId: reportId,
              sessionId: sessionId
            }));
            return;
          }

          next(resolve, reject, buildApiError({ status: pack.status, data: payload }, clean(payload.message || payload.error || payload.code), {
            stage: 'billing',
            reportId: reportId,
            sessionId: sessionId
          }));
        })
        .catch(function (error) {
          next(resolve, reject, error instanceof Error ? error : new Error(clean(error && error.message)));
        });
    }

    return new Promise(function (resolve, reject) { next(resolve, reject, ''); });
  }

  function ensurePayment() {
    var requestId = readSessionValue(REQUEST_ID_KEY) || makeRequestId();
    var sessionId = readSessionValue(SESSION_ID_KEY) || makeSessionId();
    var paymentReportId = 'soul-origin:' + Date.now().toString(36);
    writeSessionValue(REQUEST_ID_KEY, requestId);
    writeSessionValue(SESSION_ID_KEY, sessionId);

    if (typeof window._cdCoinGatePerUse !== 'function') {
      if (typeof window._cdOpenPaidServiceGate === 'function') {
        return new Promise(function(resolve, reject) {
          var reportId = paymentReportId;
          var settled = false;
          function finish(payload) {
            if (settled) return;
            settled = true;
            var raw = payload && typeof payload === 'object' ? payload : {};
            var data = raw && raw.data && typeof raw.data === 'object' ? raw.data : raw;
            var token = clean((data && (data.premiumAccessToken || data.accessToken || data.token)) || (raw && (raw.premiumAccessToken || raw.accessToken || raw.token)));
            if (token) storePremiumToken(token);
            var grant = normalizeAccessGrant(data, reportId, requestId, sessionId);
            var paymentContext = buildPaymentContext(data, grant, token, reportId, requestId, sessionId);
            resolve({
              ok: true,
              premiumAccessToken: token || readPremiumToken(),
              accessGrant: grant || undefined,
              requestId: paymentContext.requestId || requestId,
              sessionId: paymentContext.sessionId || sessionId,
              reportSessionId: paymentContext.reportSessionId || paymentContext.sessionId || sessionId,
              purchaseId: paymentContext.purchaseId || undefined,
              reportId: paymentContext.reportId || reportId,
              payment: paymentContext,
              _paymentContext: paymentContext,
            });
          }
          function cancel(error) {
            if (settled) return;
            settled = true;
            reject(error instanceof Error ? error : new Error(clean(error && error.message) || '결제가 취소되었습니다.'));
          }
          function fail(error) {
            if (settled) return;
            settled = true;
            runServerCoinGate(reportId, requestId, sessionId)
              .then(resolve)
              .catch(function (fallbackError) {
                reject(fallbackError || error || new Error('코인 결제 확인에 실패했습니다.'));
              });
          }
          try {
            var gate = window._cdOpenPaidServiceGate({
              categoryKey: 'premium-report',
              featureKey: FEATURE_KEY,
              title: '영혼의 기원 리포트 생성',
              reason: '영혼의 기원 리포트 생성',
              coinPrice: COIN_COST,
              cost: COIN_COST,
              reportType: REPORT_TYPE,
              reportId: reportId,
              sessionId: sessionId,
              reportSessionId: sessionId,
              requestId: requestId,
              onGranted: function(_transactionId, payload) { finish(payload); },
              onPassApplied: function(access) { finish((access && (access.payload || access.rawPayload)) || access || {}); },
              onCancel: cancel
            });
            if (gate && typeof gate.then === 'function') gate.then(function(payload) {
              if (payload === null || payload === undefined) cancel();
              else finish(payload);
            }).catch(fail);
          } catch (error) {
            fail(error);
          }
        });
      }
      var gateError = new Error('결제 게이트를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');
      gateError.status = 503;
      gateError.code = 'SOUL_ORIGIN_PAYMENT_GATE_MISSING';
      gateError.stage = 'billing';
      logExactError(gateError, { stage: 'billing', requestId: requestId, sessionId: sessionId });
      return Promise.reject(gateError);
    }

    return new Promise(function (resolve, reject) {
      var settled = false;
      function done(payload) {
        if (settled) return;
        settled = true;
        if (payload && payload.ok === false) {
          var failError = buildApiError({ status: Number(payload.status || payload.httpStatus || 0), data: payload }, clean(payload.message) || '결제 접근 권한을 확인하지 못했습니다. 다시 시도해 주세요.', {
            stage: 'billing',
            requestId: requestId,
            sessionId: sessionId
          });
          failError.stage = clean(payload.stage || failError.stage || 'billing');
          logExactError(failError, { stage: 'billing', requestId: requestId, sessionId: sessionId });
          reject(failError);
          return;
        }
        var token = clean((payload && (payload.premiumAccessToken || payload.accessToken || payload.token)) || '');
        if (token) storePremiumToken(token);
        var reportId = clean((payload && (payload.reportId || (payload.accessGrant && payload.accessGrant.reportId))) || '') || paymentReportId;
        var grant = normalizeAccessGrant(payload, reportId, requestId, sessionId);
        var paymentContext = buildPaymentContext(payload, grant, token, reportId, requestId, sessionId);
        resolve(Object.assign({}, payload || { ok: true, premiumAccessToken: readPremiumToken() }, {
          requestId: paymentContext.requestId || clean((payload && payload.requestId) || requestId),
          sessionId: paymentContext.sessionId || clean((payload && (payload.sessionId || payload.reportSessionId)) || sessionId),
          reportSessionId: paymentContext.reportSessionId || paymentContext.sessionId || sessionId,
          purchaseId: paymentContext.purchaseId || undefined,
          reportId: paymentContext.reportId || reportId,
          premiumAccessToken: token || readPremiumToken(),
          accessGrant: grant || undefined,
          payment: paymentContext,
          _paymentContext: paymentContext,
        }));
      }

      try {
        logStage('CoinGateStart');
        var immediate = window._cdCoinGatePerUse(
          COIN_COST,
          '운명의 업 리포트 생성',
          function (transactionId, data) {
            logStage('CoinGateSuccess', {
              sessionId: clean((data && (data.sessionId || data.reportSessionId)) || readSessionValue(SESSION_ID_KEY)),
              requestId: clean((data && data.requestId) || readSessionValue(REQUEST_ID_KEY)),
            });
            done(Object.assign({ ok: true, transactionId: transactionId }, data || {}));
          },
          function (error) {
            logStage('Failed', { stage: 'CoinGateFailed', errorCode: clean(error && error.code) || 'COIN_GATE_FAILED' });
            done({
              ok: false,
              message: clean(error && error.message) || '코인 결제 확인이 필요합니다.',
              code: clean(error && error.code) || 'COIN_GATE_FAILED',
              status: Number(error && error.status || 0) || undefined,
              stage: 'CoinGateFailed',
            });
          },
          {
            featureKey: FEATURE_KEY,
            reportType: REPORT_TYPE,
            serviceKey: 'soul-origin',
            reportId: paymentReportId,
            sessionId: sessionId,
            reportSessionId: sessionId,
            requestId: requestId,
          },
        );

        if (immediate && typeof immediate.then === 'function') {
          immediate.then(done).catch(function (error) {
            done({
              ok: false,
              message: clean(error && error.message),
              code: clean(error && error.code),
              status: Number(error && error.status || 0) || undefined,
              stage: 'CoinGateFailed',
            });
          });
        }
      } catch (error) {
        logStage('Failed', { stage: 'CoinGateException', errorCode: clean(error && error.code) || 'COIN_GATE_EXCEPTION' });
        done({
          ok: false,
          message: clean(error && error.message),
          code: clean(error && error.code) || 'COIN_GATE_EXCEPTION',
          status: Number(error && error.status || 0) || undefined,
          stage: 'CoinGateException',
        });
      }
    });
  }

  function callApi(path, payload, token) {
    var endpoints = getApiBaseCandidates(path);
    var idx = 0;
    var lastClientError = '';
    var lastStage = '';
    var lastError = null;

    return new Promise(function (resolve, reject) {
      function run() {
        if (idx >= endpoints.length) {
          var finalError = lastError || new Error(lastClientError || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          finalError.code = clean(finalError.code) || 'REQUEST_FAILED';
          if (lastStage) finalError.stage = lastStage;
          reject(finalError);
          return;
        }

        var headers = { 'Content-Type': 'application/json' };
        var premiumToken = clean(token || readPremiumToken());
        var authToken = readAuthToken();
        if (premiumToken) headers['x-premium-access-token'] = premiumToken;
        if (authToken) headers.Authorization = 'Bearer ' + authToken;

        fetchJsonWithTimeout(endpoints[idx], {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload),
        }, SOUL_ORIGIN_FETCH_TIMEOUT_MS)
          .then(function (pack) {
            if (pack.ok && pack.data && pack.data.ok) {
              resolve(pack.data);
              return;
            }

            if (isAuthOrPaymentFailure(pack.status, pack.data || {}) || (pack.status >= 400 && pack.status < 500 && !isRetryableStatus(pack.status))) {
              var message = clean(pack.data && (pack.data.message || pack.data.error || pack.data.code));
              var remoteStage = clean(pack.data && pack.data.debugSafe && pack.data.debugSafe.stage);
              lastClientError = message || '입력값 또는 결제 상태를 확인해 주세요.';
              var reqError = buildApiError(pack, lastClientError, {
                stage: remoteStage || 'prepare',
                reportId: payload && payload.reportId,
                sessionId: payload && payload.sessionId
              });
              reqError.code = clean(reqError.code || pack.data && (pack.data.code || pack.data.error || 'REQUEST_FAILED'));
              if (remoteStage) {
                reqError.stage = remoteStage;
                lastStage = remoteStage;
              }
              reject(reqError);
              return;
            }

            lastStage = clean(pack.data && pack.data.debugSafe && pack.data.debugSafe.stage);
            lastError = buildApiError(pack, clean(pack.data && (pack.data.message || pack.data.error || pack.data.code)) || ('HTTP ' + pack.status), {
              stage: lastStage || 'prepare',
              reportId: payload && payload.reportId,
              sessionId: payload && payload.sessionId
            });

            idx += 1;
            run();
          })
          .catch(function (error) {
            var reason = clean(error && error.message);
            if (reason && !lastClientError) lastClientError = reason;
            if (error && error.stage) lastStage = clean(error.stage);
            lastError = error instanceof Error ? error : new Error(reason || '요청 실패');
            idx += 1;
            run();
          });
      }
      run();
    });
  }

  async function generateSoulOrigin() {
    if (_isGenerating) return;
    _isGenerating = true;
    var requestId = readSessionValue(REQUEST_ID_KEY) || makeRequestId();
    var sessionId = readSessionValue(SESSION_ID_KEY) || makeSessionId();
    writeSessionValue(REQUEST_ID_KEY, requestId);
    writeSessionValue(SESSION_ID_KEY, sessionId);

    try {
      var profileRaw = readActiveProfile();
      var input = normalizeInput(profileRaw || {});
      if (!input) {
        throw new Error('운명의 업 PDF는 자미두수·베다점·점성술 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요.');
      }

      showScreen('loading');
      startLoadingTicker();

      logStage('ProductLookupStart', { requestId: requestId, sessionId: sessionId });
      if (!FEATURE_KEY || !REPORT_TYPE) {
        logStage('ProductLookupFailed', {
          requestId: requestId,
          sessionId: sessionId,
          errorCode: 'MISSING_PRODUCT_MAPPING',
        });
        throw new Error('결제 상품 정보를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      }
      logStage('ProductLookupSuccess', { requestId: requestId, sessionId: sessionId });

      var payment = await ensurePayment();
      var token = clean((payment && (payment.premiumAccessToken || payment.accessToken || payment.token)) || readPremiumToken());
      var paymentRequestId = clean((payment && payment.requestId) || requestId);
      var paymentSessionId = clean((payment && (payment.sessionId || payment.reportSessionId)) || sessionId);
      var accessGrant = payment && payment.accessGrant && typeof payment.accessGrant === 'object' ? payment.accessGrant : null;
      writeSessionValue(REQUEST_ID_KEY, paymentRequestId || requestId);
      writeSessionValue(SESSION_ID_KEY, paymentSessionId || sessionId);

      var reportId = clean((accessGrant && accessGrant.reportId) || (payment && (payment.reportId || (payment.payment && payment.payment.reportId) || (payment._paymentContext && payment._paymentContext.reportId))) || '') || ('soul-origin:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8));
      var paymentContext = buildPaymentContext(payment, accessGrant, token, reportId, paymentRequestId || requestId, paymentSessionId || sessionId);
      var toneSettings = readSoulOriginToneSettings();
      var payload = {
        mode: 'personal',
        featureKey: FEATURE_KEY,
        productKey: FEATURE_KEY,
        reportType: REPORT_TYPE,
        canonicalReportType: REPORT_TYPE,
        archiveReportType: ARCHIVE_REPORT_TYPE,
        reportTypeAliases: REPORT_TYPE_ALIASES.slice(),
        featureAliases: FEATURE_ALIASES.slice(),
        expectedChapterCount: EXPECTED_CHAPTER_COUNT,
        requestId: paymentRequestId || requestId,
        sessionId: paymentSessionId || sessionId,
        reportSessionId: paymentSessionId || sessionId,
        reportId: reportId,
        input: input,
        birthInput: input,
        premiumAccessToken: token || undefined,
        _premiumAccessToken: token || undefined,
        accessGrant: accessGrant || undefined,
        payment: paymentContext,
        _paymentContext: paymentContext,
        tonePreset: toneSettings.tonePreset,
        toneIntensity: toneSettings.toneIntensity,
        toneWeights: toneSettings.toneWeights,
        tone: {
          preset: toneSettings.tonePreset,
          intensity: toneSettings.toneIntensity,
          weights: toneSettings.toneWeights,
        },
        toneProfile: {
          preset: toneSettings.tonePreset,
          intensity: toneSettings.toneIntensity,
          weights: toneSettings.toneWeights,
        },
      };

      logStage('SessionCreateStart', { requestId: requestId, sessionId: sessionId });
      logStage('ServerLocalCalcStart', { requestId: requestId, sessionId: sessionId });
      logStage('LLMGenerationStart', { requestId: requestId, sessionId: sessionId, expectedChapterCount: EXPECTED_CHAPTER_COUNT });
      logStage('PDFRenderStart', { requestId: requestId, sessionId: sessionId });
      var statusContext = {
        reportId: reportId,
        sessionId: paymentSessionId || sessionId,
        requestId: paymentRequestId || requestId,
      };
      var data;
      try {
        data = await callApi(PREPARE_API, payload, token);
      } catch (requestError) {
        if (!shouldRecoverWithStatus(requestError)) throw requestError;
        logStage('StatusRecoverStart', {
          requestId: statusContext.requestId,
          sessionId: statusContext.sessionId,
          reportId: statusContext.reportId,
          errorCode: clean(requestError && requestError.code) || 'REQUEST_FAILED',
        });
        data = await pollSoulOriginStatus(statusContext, token);
      }
      if (isSoulOriginRunning(data)) {
        statusContext.reportId = clean(data && (data.reportId || (data.data && data.data.reportId))) || statusContext.reportId;
        statusContext.sessionId = clean(data && (data.sessionId || (data.data && data.data.sessionId))) || statusContext.sessionId;
        data = await pollSoulOriginStatus(statusContext, token);
      }
      if (!isSoulOriginReportReady(data)) {
        var readyError = new Error('리포트 저장 URL이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
        readyError.code = 'SOUL_ORIGIN_REPORT_NOT_READY';
        throw readyError;
      }
      logStage('ServerLocalCalcSuccess', { requestId: requestId, sessionId: clean(data && data.sessionId) || sessionId });
      logStage('LLMGenerationSuccess', {
        requestId: requestId,
        sessionId: clean(data && data.sessionId) || sessionId,
        chapterCount: Number(data && data.chapterCount || 0),
        qualityStatus: clean(data && data.qualityStatus),
      });
      logStage('PDFRenderSuccess', {
        requestId: requestId,
        sessionId: clean(data && data.sessionId) || sessionId,
        reportId: clean(data && data.reportId) || reportId,
      });
      persistResult(data);
      renderResult(data);
    } catch (error) {
      logStage('Failed', {
        stage: 'Failed',
        requestId: requestId,
        sessionId: sessionId,
        errorCode: clean(error && error.code) || 'DESTINY_PRAYER_BOOK_FAILED',
      });
      logExactError(error, { stage: clean(error && error.stage) || 'generate', requestId: requestId, sessionId: sessionId });
      var msg = mapSoulOriginUserMessage(error);
      var errEl = $('soErrorMsg');
      if (errEl) errEl.textContent = msg;
      showScreen('error');
    } finally {
      stopLoadingTicker();
      _isGenerating = false;
    }
  }

  function closeModal() {
    var modal = $('soulOriginModal');
    if (!modal) return;
    modal.style.display = 'none';
    stopLoadingTicker();
    document.body.classList.remove('lb-modal-open');
    document.body.style.overflow = '';
  }

  function openModal() {
    var modal = $('soulOriginModal');
    if (!modal) return;
    modal.style.display = 'flex';
    logStage('OpenModal', { requestId: readSessionValue(REQUEST_ID_KEY), sessionId: readSessionValue(SESSION_ID_KEY) });
    document.body.classList.add('lb-modal-open');
    document.body.style.overflow = 'hidden';

    var persisted = readPersisted();
    if (persisted && Array.isArray(persisted.chapters) && persisted.chapters.length) {
      renderResult(persisted);
    } else {
      showScreen('start');
    }

    var rawProfile = readActiveProfile() || {};
    var summaryEl = $('soProfileSummary');
    if (summaryEl) {
      if (rawProfile && clean(rawProfile.birthDate)) {
        var birthTimeText = clean(rawProfile.birthTime) || '태어난 시간 미입력';
        summaryEl.textContent = [
          clean(rawProfile.name || '사용자'),
          clean(rawProfile.birthDate),
          birthTimeText,
          clean(rawProfile.birthPlace || '출생지 미상'),
        ].filter(Boolean).join(' · ');
      } else {
        summaryEl.textContent = '프로필 카드의 생년월일시를 확인해주세요.';
      }
    }
  }

  function restoreByReportId() {
    var reportId = clean(prompt('불러올 reportId를 입력해주세요.'));
    if (!reportId) return;

    var endpoints = getApiBaseCandidates(READ_API + '?reportId=' + encodeURIComponent(reportId));
    var idx = 0;
    function run() {
      if (idx >= endpoints.length) {
        alert('요청한 운명의 업 리포트를 찾지 못했습니다.');
        return;
      }
      var headers = {};
      var authToken = readAuthToken();
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      fetchJsonWithTimeout(endpoints[idx], { method: 'GET', headers: headers }, 15000)
        .then(function (pack) {
          if (pack.ok && pack.data && pack.data.ok && isSoulOriginReportReady(pack.data)) {
            persistResult(pack.data);
            renderResult(pack.data);
            return;
          }
          idx += 1;
          run();
        })
        .catch(function () {
          idx += 1;
          run();
        });
    }
    run();
  }

  window.openSoulOriginModal = openModal;
  window.closeSoulOriginModal = closeModal;
  window.generateSoulOriginReport = generateSoulOrigin;
  window.restoreSoulOriginReport = restoreByReportId;

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var btn = target.closest('[data-action]');
    if (!btn) return;

    var action = clean(btn.getAttribute('data-action'));

    if (action === 'openSoulOriginModal' || action === 'gotoSoulOriginPremium') {
      event.preventDefault();
      openModal();
      return;
    }
    if (action === 'closeSoulOriginModal') {
      event.preventDefault();
      closeModal();
      return;
    }
  }, true);
})();
