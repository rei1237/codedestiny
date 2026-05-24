(function () {
  'use strict';

  var TOTAL_CHAPTERS = 12;
  var API_TIMEOUT_MS = 45000;
  var COIN_GATE_TIMEOUT_MS = 15000;
  var POLL_INTERVAL_MS = 1800;
  var ASTRO_RESULT_STORAGE_KEY = '__cd_astro_premium_result_v2__';
  var LOADING_QUOTES = [
    '행성 좌표와 하우스 축을 교차 검증하는 중입니다...',
    '챕터별 점성술 근거 데이터를 정리하는 중입니다...',
    '관계/커리어/생활 적용 전략을 다듬는 중입니다...',
    '최종 실행 플랜 문장을 구성하는 중입니다...'
  ];

  var PERSONAL_CHAPTER_PREVIEW = [
    { title: 'I. 출생 차트 총론', subtitle: '나의 우주적 설계도와 핵심 테마를 통합합니다.' },
    { title: 'II. 빅3 해석', subtitle: '태양·달·상승궁의 내면/외면 축을 정밀 진단합니다.' },
    { title: 'III. 10행성 완전 해석', subtitle: '행성별 동기와 현실 작동 방식을 해석합니다.' },
    { title: 'IV. 12하우스 분석', subtitle: '삶의 영역별 운명 지도를 구조적으로 읽습니다.' },
    { title: 'V. 원소와 양식 분석', subtitle: '기질의 균형과 과부족 패턴을 정리합니다.' },
    { title: 'VI. 어스펙트 분석', subtitle: '긴장과 재능의 회로를 구체적 패턴으로 해석합니다.' },
    { title: 'VII. 사랑과 관계운', subtitle: '연애·결혼·매력의 반복 구조와 안정 전략을 제시합니다.' },
    { title: 'VIII. 직업·재물·성공운', subtitle: '사회적 성취와 수익화 전략을 설계합니다.' },
    { title: 'IX. 심리·무의식·상처 분석', subtitle: '내면 그림자와 회복 루틴을 구체화합니다.' },
    { title: 'X. 건강·생활 리듬 분석', subtitle: '몸·에너지 관리와 번아웃 예방 기준을 제공합니다.' },
    { title: 'XI. 운의 흐름 분석', subtitle: '트랜짓·프로그레션·솔라리턴으로 시기운을 읽습니다.' },
    { title: 'XII. 최종 종합 리포트', subtitle: '인생 로드맵과 실행 전략을 최종 확정합니다.' }
  ];

  function getPreviewTitle(entry) {
    if (entry && typeof entry === 'object') return String(entry.title || '').trim();
    return String(entry || '').trim();
  }

  function getPreviewSubtitle(entry) {
    if (entry && typeof entry === 'object') return String(entry.subtitle || '').trim();
    return '';
  }

  var ASTRO_COIN_BASE_COST = 390;
  var ASTRO_COIN_FEATURE_KEY = 'premium-astrology-report';
  var ASTRO_COIN_REASON = '점성술 프리미엄 PDF 리포트 생성';
  var ASTRO_PREMIUM_REPORT_TYPE = 'westernAstrologyPremium';
  var ASTRO_PREMIUM_FEATURE_TYPE = 'astrology_premium';

  var ASTRO_LOADING_FLOW_PERSONAL = [
    '출생 차트 총론을 구성하는 중입니다...',
    '빅3(태양·달·상승궁)를 해석하는 중입니다...',
    '10행성 핵심 동력을 정리하는 중입니다...',
    '12하우스 영역 지도를 분석하는 중입니다...',
    '원소/양식 기질 균형을 계산하는 중입니다...',
    '주요 어스펙트 패턴을 진단하는 중입니다...',
    '사랑·관계운 전략을 생성하는 중입니다...',
    '직업·재물·성공운 전략을 구성하는 중입니다...',
    '심리·무의식·상처 분석을 정리하는 중입니다...',
    '건강·생활 리듬 루틴을 설계하는 중입니다...',
    '운의 흐름(트랜짓/프로그레션)을 분석하는 중입니다...',
    '최종 종합 리포트를 검수하는 중입니다...'
  ];

  var state = {
    generating: false,
    mode: 'personal',
    reportId: '',
    downloadUrl: '',
    chapters: [],
    quoteTick: 0,
    paidGateKey: '',
    paymentContext: null,
    refundInFlight: false,
    lastRequestBody: null
  };

  function safeJsonStringify(value) {
    try { return JSON.stringify(value); }
    catch (_) { return ''; }
  }

  function logAstroDebug(stage, payload, level) {
    var fn = (level === 'error') ? 'error' : ((level === 'warn') ? 'warn' : 'info');
    var entry = {
      stage: String(stage || '').trim() || 'UnknownStage',
      ts: new Date().toISOString(),
      payload: payload && typeof payload === 'object' ? payload : { value: payload }
    };
    try {
      if (typeof console !== 'undefined' && typeof console[fn] === 'function') {
        console[fn]('[AstroBook]', safeJsonStringify(entry) || entry);
      }
    } catch (_) {}
  }

  function qs(id) { return document.getElementById(id); }
  function qsa(root, selector) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function notify(message) {
    try {
      if (typeof window.showToast === 'function') window.showToast(String(message || ''));
      else window.alert(String(message || ''));
    } catch (_) {}
  }

  function safeParseJson(raw, fallback) {
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function resolveRequestTimeoutMs(url, method) {
    var normalizedMethod = String(method || 'GET').toUpperCase();
    var normalizedUrl = String(url || '');
    if (normalizedMethod !== 'GET' && normalizedUrl.indexOf('/api/billing/coin-gate') >= 0) {
      return COIN_GATE_TIMEOUT_MS;
    }
    return API_TIMEOUT_MS;
  }

  function resolveApiUrl(input) {
    var raw = String(input || '').trim();
    if (!raw) return raw;
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) return raw;
    if (raw.indexOf('//') === 0) {
      try { return String(window.location.protocol || 'https:') + raw; }
      catch (_) { return raw; }
    }
    if (raw.charAt(0) === '/') {
      try {
        var origin = String(window.location.origin || '').replace(/\/$/, '');
        return origin ? (origin + raw) : raw;
      } catch (_) {
        return raw;
      }
    }
    try { return new URL(raw, window.location.href).toString(); }
    catch (error) {
      logAstroDebug('ResolveApiUrlFailed', {
        input: raw,
        baseHref: (function () {
          try { return String(window.location.href || ''); }
          catch (_) { return ''; }
        })(),
        message: String(error && error.message || error || 'URL parse failed')
      }, 'warn');
      return raw;
    }
  }

  function getAuthToken() {
    try { return String(localStorage.getItem('fortune_auth_token') || '').trim(); }
    catch (_) { return ''; }
  }

  function readPremiumAccessToken() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (token) return token;
    try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    if (token) return token;
    try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; }
    return token;
  }

  function extractPremiumAccessTokenFromPayload(payload) {
    var source = payload && typeof payload === 'object' ? payload : {};
    var nested = source.data && typeof source.data === 'object' ? source.data : null;
    var consume = source.consume && typeof source.consume === 'object' ? source.consume : null;
    var candidates = [
      source.premiumAccessToken,
      source.premium_access_token,
      source.accessToken,
      nested && nested.premiumAccessToken,
      nested && nested.premium_access_token,
      nested && nested.accessToken,
      consume && consume.premiumAccessToken,
      consume && consume.premium_access_token,
      consume && consume.accessToken
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var token = String(candidates[i] || '').trim();
      if (token) return token;
    }
    return '';
  }

  function persistPremiumAccessToken(payload) {
    var token = extractPremiumAccessTokenFromPayload(payload);
    if (!token) return '';

    try {
      if (typeof window.__cdPersistPremiumAccessToken === 'function') {
        window.__cdPersistPremiumAccessToken(token);
        return token;
      }
    } catch (_) {}

    try { window.__cdPremiumAccessToken = token; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', token); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', token); } catch (_) {}
    return token;
  }

  async function requestJson(url, options) {
    var opts = options || {};
    var targetUrl = resolveApiUrl(url);
    var headers = new Headers(opts.headers || {});
    headers.set('Content-Type', 'application/json');
    var token = getAuthToken();
    if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = null;
    if (controller) {
      var timeoutMs = resolveRequestTimeoutMs(targetUrl, opts.method || 'GET');
      timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    }

    try {
      logAstroDebug('RequestStart', {
        url: targetUrl,
        method: String(opts.method || 'GET')
      });
      var res = await fetch(targetUrl, {
        method: opts.method || 'GET',
        credentials: 'include',
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller ? controller.signal : undefined
      });
      var data = null;
      try { data = await res.json(); } catch (_) { data = null; }
      if (!res.ok) {
        logAstroDebug('RequestNonOk', {
          url: targetUrl,
          method: String(opts.method || 'GET'),
          status: Number(res.status || 0),
          responseCode: String((data && data.code) || ''),
          responseMessage: String((data && data.message) || '')
        }, 'warn');
      }
      return { ok: res.ok, status: res.status, data: data };
    } catch (error) {
      logAstroDebug('RequestFailed', {
        url: targetUrl,
        method: String(opts.method || 'GET'),
        message: String(error && error.message || error || '요청 실패'),
        name: String(error && error.name || '')
      }, 'error');
      return {
        ok: false,
        status: 0,
        data: { ok: false, message: String(error && error.message || '요청 중 오류가 발생했습니다.') }
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function premiumAuthJson(pathname, body, options) {
    var targetPath = resolveApiUrl(pathname);
    var payload = body && typeof body === 'object' ? Object.assign({}, body) : {};
    if (!payload.premiumAccessToken) {
      var premiumAccessToken = readPremiumAccessToken();
      if (premiumAccessToken) payload.premiumAccessToken = premiumAccessToken;
    }
    if (typeof window.__cdPremiumAuthJson === 'function') {
      try {
        return await window.__cdPremiumAuthJson(targetPath || pathname, payload, options || {});
      } catch (error) {
        logAstroDebug('PremiumAuthHelperFallback', {
          path: targetPath || pathname,
          message: String(error && error.message || error || 'premium auth helper failed')
        }, 'warn');
      }
    }
    var res = await requestJson(targetPath || pathname, {
      method: 'POST',
      body: payload
    });
    var data = (res && res.data && typeof res.data === 'object') ? res.data : {};
    if (!res.ok) data.status = Number(data.status || res.status || 0);
    if (!res.ok || data.ok === false) {
      logAstroDebug('PremiumAuthRequestFailed', {
        path: targetPath || pathname,
        status: Number(data.status || res.status || 0),
        code: String((data && data.code) || ''),
        message: String((data && data.message) || '')
      }, 'warn');
    }
    return data;
  }

  function buildAstroCanonicalSeed(requestBody, chart, source, warnings) {
    var body = requestBody && typeof requestBody === 'object' ? requestBody : {};
    var chartObj = chart && typeof chart === 'object' ? chart : {};
    var planetsObj = (chartObj.planets && typeof chartObj.planets === 'object') ? chartObj.planets : {};
    var planets = Object.keys(planetsObj).map(function (name) {
      var row = planetsObj[name] || {};
      return {
        nameEn: String(name || ''),
        nameKo: String(row.nameKo || row.name || name || ''),
        signKo: String(row.signKo || row.signName || row.sign || ''),
        degree: Number(Number(row.degree || 0).toFixed(2)),
        house: Number(row.house || 0),
        longitude: Number(Number(row.longitude || 0).toFixed(4))
      };
    });

    var asc = chartObj.ascendant || {};
    var mc = chartObj.midheaven || {};

    var locationLabel = String(
      body.birthPlace
      || body.place
      || body.location
      || body.timezoneName
      || body.timezone
      || ((Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lon)))
        ? ('lat:' + Number(body.lat).toFixed(4) + ',lon:' + Number(body.lon).toFixed(4))
        : '')
      || '정보 없음'
    ).trim();

    return {
      profile: {
        profileId: String(body.profileId || ''),
        name: String(body.name || '사용자'),
        birth: {
          date: String(body.birthDate || ''),
          time: String(body.birthTime || ''),
          timezone: String(body.timezone || body.timezoneName || 'Asia/Seoul'),
          locationName: locationLabel
        }
      },
      calculationMeta: {
        engine: String(source || chartObj.source || 'astro-western'),
        houseSystem: String(body.houseSystem || 'placidus'),
        zodiac: String(body.zodiacType || 'tropical'),
        generatedAt: new Date().toISOString(),
        warnings: Array.isArray(warnings) ? warnings.slice(0, 10) : []
      },
      angles: {
        ascendant: {
          sign: String(asc.signKo || asc.signName || asc.sign || ''),
          degree: Number(Number(asc.degree || 0).toFixed(2)),
          longitude: Number(Number(asc.longitude || 0).toFixed(4))
        },
        mc: {
          sign: String(mc.signKo || mc.signName || mc.sign || ''),
          degree: Number(Number(mc.degree || 0).toFixed(2)),
          longitude: Number(Number(mc.longitude || 0).toFixed(4))
        }
      },
      planets: planets,
      aspects: Array.isArray(chartObj.aspects) ? chartObj.aspects : []
    };
  }

  async function enrichRequestBodyWithAstroSeed(baseBody) {
    var requestBody = (baseBody && typeof baseBody === 'object') ? Object.assign({}, baseBody) : {};
    var seedInput = {
      year: Number(requestBody.year || 0),
      month: Number(requestBody.month || 0),
      day: Number(requestBody.day || 0),
      hour: Number(Number.isFinite(Number(requestBody.hour)) ? requestBody.hour : 12),
      minute: Number(Number.isFinite(Number(requestBody.minute)) ? requestBody.minute : 0),
      timezone: Number(Number.isFinite(Number(requestBody.timezoneOffset)) ? requestBody.timezoneOffset : 9),
      lat: Number(Number.isFinite(Number(requestBody.lat)) ? requestBody.lat : 37.5665),
      lon: Number(Number.isFinite(Number(requestBody.lon)) ? requestBody.lon : 126.978)
    };

    var basic = await requestJson('/api/premium/astro-western', {
      method: 'POST',
      body: seedInput
    });
    var data = basic && basic.data && typeof basic.data === 'object' ? basic.data : {};
    var chart = data && typeof data === 'object' ? data : {};
    var hasChart = !!(chart.planets && chart.ascendant && chart.midheaven);
    if (!basic.ok || !hasChart) {
      logAstroDebug('AstroSeedUnavailable', {
        status: Number((basic && basic.status) || 0),
        code: String((data && data.code) || ''),
        message: String((data && (data.message || data.error)) || ''),
        hasChart: hasChart,
        attempts: 1
      }, 'warn');
      return requestBody;
    }

    var source = String(data.calculationSource || data.source || chart.source || 'astro-western');
    var warnings = Array.isArray(data.warnings) ? data.warnings : [];
    requestBody.chart = chart;
    requestBody.basicAstroResult = {
      ok: true,
      source: source,
      warnings: warnings,
      chart: chart
    };
    requestBody.canonicalAstroChart = buildAstroCanonicalSeed(requestBody, chart, source, warnings);
    logAstroDebug('AstroSeedPrepared', {
      source: source,
      warnings: warnings.length,
      aspects: Array.isArray(chart.aspects) ? chart.aspects.length : 0,
      planets: (chart.planets && typeof chart.planets === 'object') ? Object.keys(chart.planets).length : 0
    });
    return requestBody;
  }

  function buildPreflightMessage(response, fallback) {
    var base = String((response && response.message) || fallback || '생성 전 데이터 검증에 실패했습니다.');
    var blocked = Array.isArray(response && response.blockedChapters) ? response.blockedChapters : [];
    if (!blocked.length) return base;
    var first = blocked[0] || {};
    var title = String(first.chapterTitle || ('챕터 ' + String(first.chapterId || ''))).trim();
    var missing = Array.isArray(first.missingFields) ? first.missingFields.filter(Boolean) : [];
    if (!missing.length) return base;
    return base + ' (' + title + ' · 누락: ' + missing.slice(0, 2).join(', ') + ')';
  }

  async function ensureAstroPremiumPreflight(requestBody) {
    var prepared = null;
    for (var attempt = 0; attempt < 3; attempt += 1) {
      prepared = await premiumAuthJson('/api/premium-report/prepare', {
        featureType: ASTRO_PREMIUM_FEATURE_TYPE,
        reportType: ASTRO_PREMIUM_REPORT_TYPE,
        requestBody: requestBody || {}
      }, {
        maxAttempts: 2
      });
      var preparedCode = String((prepared && prepared.code) || '').toUpperCase();
      var preparedStatus = Number((prepared && prepared.status) || 0);
      var waitForPaymentSync = !prepared || !prepared.ok
        ? (preparedStatus === 402 || preparedCode === 'PAYMENT_REQUIRED')
        : false;
      if (!waitForPaymentSync) break;
      await delay(450);
    }

    if (!prepared || !prepared.ok || !prepared.reportSessionId) {
      return {
        ok: false,
        code: String((prepared && prepared.code) || ''),
        status: Number((prepared && prepared.status) || 0),
        message: buildPreflightMessage(prepared, '결제 확인/세션 준비에 실패했습니다.'),
      };
    }

    var preflight = null;
    for (var preflightAttempt = 0; preflightAttempt < 2; preflightAttempt += 1) {
      preflight = await premiumAuthJson('/api/premium-report/preflight', {
        reportSessionId: String(prepared.reportSessionId || ''),
        reportType: ASTRO_PREMIUM_REPORT_TYPE,
        featureType: ASTRO_PREMIUM_FEATURE_TYPE,
        requestBody: requestBody || {},
        requestId: 'astro:preflight:' + Date.now().toString(36)
      }, {
        maxAttempts: 2
      });

      var preflightCode = String((preflight && preflight.code) || '').toUpperCase();
      var shouldRecoverSession = !preflight || !preflight.ok
        ? (Number(preflight && preflight.status || 0) === 404 || preflightCode === 'PREMIUM_REPORT_SESSION_NOT_FOUND')
        : false;
      if (!shouldRecoverSession) break;

      prepared = await premiumAuthJson('/api/premium-report/prepare', {
        featureType: ASTRO_PREMIUM_FEATURE_TYPE,
        reportType: ASTRO_PREMIUM_REPORT_TYPE,
        requestBody: requestBody || {}
      }, {
        maxAttempts: 2
      });
      if (!prepared || !prepared.ok || !prepared.reportSessionId) break;
      await delay(250);
    }

    if (!preflight || !preflight.ok) {
      return {
        ok: false,
        code: String((preflight && preflight.code) || ''),
        status: Number((preflight && preflight.status) || 0),
        message: buildPreflightMessage(preflight, '생성 전 데이터 점검(preflight)에서 실패했습니다.'),
      };
    }

    return {
      ok: true,
      reportSessionId: String((prepared && prepared.reportSessionId) || ''),
      snapshotId: String((preflight && preflight.snapshotId) || (prepared && prepared.snapshotId) || ''),
      totalChapters: Number((prepared && prepared.totalChapters) || (preflight && preflight.totalChapters) || TOTAL_CHAPTERS),
      chapterPlan: Array.isArray(prepared && prepared.chapterPlan) ? prepared.chapterPlan : []
    };
  }

  function normalizeCalType(value) {
    var v = String(value || '').trim().toLowerCase();
    if (v === 'lunar' || v === 'l' || v === '음력') return 'lunar';
    if (v === 'lunar_leap' || v === '윤달') return 'lunar_leap';
    return 'solar';
  }

  function parseDateParts(raw) {
    var src = String(raw || '').trim();
    var m = src.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
    if (!m) return null;
    return {
      year: Number(m[1]),
      month: Number(m[2]),
      day: Number(m[3])
    };
  }

  function parseTimeParts(raw) {
    var src = String(raw || '').trim();
    var m = src.match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return null;
    return {
      hour: Number(m[1]),
      minute: Number(m[2])
    };
  }

  function buildProfileFromCardRow(row) {
    if (!row || typeof row !== 'object') return null;
    var birth = (row.birth && typeof row.birth === 'object') ? row.birth : null;
    var parsedDate = parseDateParts((birth && birth.birthDate) || row.birthDate || row.dateOfBirth);
    var parsedTime = parseTimeParts((birth && birth.birthTime) || row.birthTime);
    var year = Number((birth && birth.year) || row.birthYear || row.year || (parsedDate && parsedDate.year) || 0);
    var month = Number((birth && birth.month) || row.birthMonth || row.month || (parsedDate && parsedDate.month) || 0);
    var day = Number((birth && birth.day) || row.birthDay || row.day || (parsedDate && parsedDate.day) || 0);
    if (!(year > 0 && month > 0 && day > 0)) return null;

    var hour = Number((birth && birth.hour) || row.birthHour || row.hour || (parsedTime && parsedTime.hour));
    var minute = Number((birth && birth.minute) || row.birthMinute || row.minute || (parsedTime && parsedTime.minute));
    var calType = normalizeCalType((birth && (birth.calType || birth.calendarType)) || row.calType || row.calendarType || 'solar');
    var tz = String((row.location && row.location.tz) || row.tz || row.timezone || 'Asia/Seoul').trim() || 'Asia/Seoul';
    var lat = Number((row.location && row.location.lat) || row.lat || row.latitude);
    var lng = Number((row.location && row.location.lng) || row.lng || row.longitude);
    var birthPlace = String((birth && (birth.birthPlace || birth.place || birth.locationName)) || row.birthPlace || row.place || row.city || '').trim();

    return {
      id: String(row.id || row.profileId || '').trim(),
      profileId: String(row.profileId || row.id || '').trim(),
      name: String(row.name || row.nickname || row.profileName || '사용자'),
      gender: String(row.gender || ''),
      birth: {
        year: year,
        month: month,
        day: day,
        hour: Number.isFinite(hour) ? hour : 12,
        minute: Number.isFinite(minute) ? minute : 0,
        calType: calType
      },
      location: {
        tz: tz,
        lat: Number.isFinite(lat) ? lat : 37.5665,
        lng: Number.isFinite(lng) ? lng : 126.9780,
        birthPlace: birthPlace || undefined
      },
      birthPlace: birthPlace || undefined
    };
  }

  function getCurrentProfileFromStorage() {
    try {
      var list = safeParseJson(localStorage.getItem('FORTUNE_APP_USER_PROFILES.list') || '[]', []);
      var currentId = String(localStorage.getItem('FORTUNE_APP_USER_PROFILES.current') || '').trim();
      if (!Array.isArray(list) || !list.length) return null;
      if (currentId) {
        for (var i = 0; i < list.length; i += 1) {
          var row = list[i] || {};
          if (String(row.id || '').trim() === currentId) {
            return buildProfileFromCardRow(row);
          }
        }
      }
      return buildProfileFromCardRow(list[0] || null);
    } catch (_) {
      return null;
    }
  }

  function getProfileFromStorage() {
    try {
      var currentProfile = getCurrentProfileFromStorage();
      if (currentProfile) return currentProfile;

      var user = safeParseJson(localStorage.getItem('fortune_auth_user') || 'null', null);
      if (!user) return null;
      var date = String(user.birthDate || '').trim();
      var time = String(user.birthTime || '').trim();
      var dm = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      var tm = time.match(/^(\d{1,2}):(\d{1,2})$/);
      if (!dm) return null;
      return {
        id: String(user.profileId || user.id || '').trim(),
        profileId: String(user.profileId || user.id || '').trim(),
        name: String(user.name || user.nickname || '사용자'),
        gender: String(user.gender || ''),
        birth: {
          year: Number(dm[1]),
          month: Number(dm[2]),
          day: Number(dm[3]),
          hour: tm ? Number(tm[1]) : 12,
          minute: tm ? Number(tm[2]) : 0,
          calType: normalizeCalType(user.calendarType || user.calType || 'solar')
        },
        location: {
          tz: String(user.timezone || user.tz || 'Asia/Seoul').trim() || 'Asia/Seoul',
          lat: 37.5665,
          lng: 126.9780,
          birthPlace: String(user.birthPlace || user.place || '').trim() || undefined
        },
        birthPlace: String(user.birthPlace || user.place || '').trim() || undefined
      };
    } catch (_) {
      return null;
    }
  }

  function getActiveProfile() {
    var profile = null;
    try { profile = window.__cdActiveBirthProfile || null; } catch (_) { profile = null; }
    if (profile && profile.birth && Number(profile.birth.year) > 0) return profile;
    return getProfileFromStorage();
  }

  function hasProfile() {
    var p = getActiveProfile();
    return !!(p && p.birth && Number(p.birth.year) > 0 && Number(p.birth.month) > 0 && Number(p.birth.day) > 0);
  }

  function formatProfileSummary(profile) {
    if (!profile || !profile.birth) return '생년월일 정보를 찾을 수 없습니다.';
    var b = profile.birth;
    var date = [b.year, String(b.month || '').padStart(2, '0'), String(b.day || '').padStart(2, '0')].join('-');
    var time = String(Number.isFinite(Number(b.hour)) ? Number(b.hour) : 12).padStart(2, '0')
      + ':' + String(Number.isFinite(Number(b.minute)) ? Number(b.minute) : 0).padStart(2, '0');
    var cal = String(b.calType || b.calendarType || 'solar').toLowerCase();
    var calLabel = cal === 'lunar' ? '음력' : (cal === 'lunar_leap' ? '음력(윤달)' : '양력');
    return [String(profile.name || '사용자') + ' · ' + date, calLabel + ' · ' + time].join(' · ');
  }

  function makeAstroProfileKey(profile, mode) {
    var p = profile && profile.birth ? profile : {};
    var b = p.birth || {};
    return [
      Number(b.year || 0),
      Number(b.month || 0),
      Number(b.day || 0),
      Number(Number.isFinite(Number(b.hour)) ? b.hour : 12),
      Number(Number.isFinite(Number(b.minute)) ? b.minute : 0),
      String(p.gender || ''),
      String(mode || state.mode || 'personal')
    ].join('|');
  }

  function saveAstroResult(profile) {
    try {
      var chapters = Array.isArray(state.chapters) ? state.chapters.slice() : [];
      if (!chapters.length) return;
      var payload = {
        profileKey: makeAstroProfileKey(profile || getActiveProfile(), state.mode),
        mode: String(state.mode || 'personal'),
        reportId: String(state.reportId || ''),
        downloadUrl: String(state.downloadUrl || ''),
        chapters: chapters,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(ASTRO_RESULT_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {}
  }

  function loadAstroResult(profile, mode) {
    try {
      var raw = localStorage.getItem(ASTRO_RESULT_STORAGE_KEY);
      if (!raw) return null;
      var saved = safeParseJson(raw, null);
      if (!saved || typeof saved !== 'object') return null;
      var expected = makeAstroProfileKey(profile || getActiveProfile(), mode || state.mode || 'personal');
      if (String(saved.profileKey || '') !== expected) return null;
      if (!Array.isArray(saved.chapters) || !saved.chapters.length) return null;
      return saved;
    } catch (_) {
      return null;
    }
  }

  function setAstroMode(mode) {
    state.mode = 'personal';
  }

  function ensureAstroCinematicStyles() {
    if (document.getElementById('cdPremiumLoadingCinematicStyles')) return;
    var style = document.createElement('style');
    style.id = 'cdPremiumLoadingCinematicStyles';
    style.textContent = ''
      + '.lb-loading--cinematic{position:relative;overflow:hidden;--cd-glow-a:#fb923c;--cd-glow-b:#b45309;--cd-ring:rgba(251,146,60,.42);}'
      + '.lb-loading--cinematic::before{content:"";position:absolute;inset:-18% -10% auto -10%;height:65%;background:radial-gradient(circle at center,var(--cd-ring),transparent 68%);pointer-events:none;opacity:.9;filter:blur(2px);}'
      + '.lb-loading--cinematic .lb-loading__symbol{position:relative;display:inline-flex;align-items:center;justify-content:center;animation:cd-premium-orb-pulse 2.8s ease-in-out infinite;}'
      + '.lb-loading--cinematic .lb-loading__symbol::before,.lb-loading--cinematic .lb-loading__symbol::after{content:"";position:absolute;inset:-10px;border-radius:999px;border:1px solid var(--cd-ring);}'
      + '.lb-loading--cinematic .lb-loading__symbol::before{animation:cd-premium-ring-spin 7.2s linear infinite;}'
      + '.lb-loading--cinematic .lb-loading__symbol::after{inset:-16px;border-style:dashed;opacity:.7;animation:cd-premium-ring-spin 10.5s linear infinite reverse;}'
      + '.lb-loading--cinematic .lb-progress__bar,.lb-loading--cinematic .lb-progress-bar{background:linear-gradient(90deg,var(--cd-glow-a),#fff7ed,var(--cd-glow-b));background-size:200% 100%;animation:cd-premium-bar-shimmer 2.4s linear infinite;}'
      + '.lb-loading--cinematic .lb-loading__chapter{animation:cd-premium-float 1.8s ease-in-out infinite;}'
      + '@keyframes cd-premium-orb-pulse{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-2px) scale(1.04)}}'
      + '@keyframes cd-premium-ring-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'
      + '@keyframes cd-premium-bar-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}'
      + '@keyframes cd-premium-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}';
    document.head.appendChild(style);
  }

  function activateAstroCinematicLoading() {
    ensureAstroCinematicStyles();
    var screen = qs('abLoadingScreen');
    if (!screen) return;
    screen.classList.add('lb-loading--cinematic');
    screen.style.setProperty('--cd-glow-a', '#fb923c');
    screen.style.setProperty('--cd-glow-b', '#b45309');
    screen.style.setProperty('--cd-ring', 'rgba(251,146,60,.42)');
  }

  function showOnly(screenId) {
    var screens = ['abStartScreen', 'abLoadingScreen', 'abResultScreen', 'abErrorScreen', 'abNoProfileScreen'];
    for (var i = 0; i < screens.length; i += 1) {
      var el = qs(screens[i]);
      if (el) el.style.display = screens[i] === screenId ? '' : 'none';
    }
  }

  function setError(message) {
    var el = qs('abErrorMsg');
    if (el) el.textContent = String(message || '생성 중 오류가 발생했습니다.');
    showOnly('abErrorScreen');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toParagraphHtml(text) {
    var safe = escapeHtml(text || '').replace(/\r/g, '').replace(/\n{2,}/g, '\n\n').replace(/\n/g, '<br>');
    return '<p>' + safe + '</p>';
  }

  function getSelectedMode() {
    return 'personal';
  }

  function ensureModeUi() {
    state.mode = 'personal';
  }

  function buildRequestBody() {
    var profile = getActiveProfile() || {};
    var birth = profile.birth || {};
    var location = profile.location || {};
    var mode = 'personal';
    var profileId = String(profile.profileId || profile.id || '').trim();
    var birthDate = [
      Number(birth.year || 0),
      String(Number(birth.month || 0)).padStart(2, '0'),
      String(Number(birth.day || 0)).padStart(2, '0')
    ].join('-');
    var birthTime = String(Number.isFinite(Number(birth.hour)) ? Number(birth.hour) : 12).padStart(2, '0')
      + ':' + String(Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0).padStart(2, '0');
    var calendarType = normalizeCalType(birth.calType || birth.calendarType || 'solar');
    var timeUnknown = !!(birth.timeUnknown || birth.birthTimeUnknown || birth.unknownTime);
    var isLunar = calendarType === 'lunar' || calendarType === 'lunar_leap';
    var birthPlace = String(profile.birthPlace || location.birthPlace || location.label || profile.place || '').trim();

    var body = {
      mode: mode,
      reportMode: mode,
      reportType: mode,
      _premiumStrictPayload: false,
      _premiumStrictValidation: false,
      includeCompatibility: false,
      profileId: profileId,
      name: String(profile.name || '사용자'),
      gender: String(profile.gender || ''),
      year: Number(birth.year || 0),
      month: Number(birth.month || 0),
      day: Number(birth.day || 0),
      hour: Number(Number.isFinite(Number(birth.hour)) ? birth.hour : 12),
      minute: Number(Number.isFinite(Number(birth.minute)) ? birth.minute : 0),
      birthDate: birthDate,
      birthTime: birthTime,
      calType: calendarType,
      calendarType: calendarType,
      isLunar: isLunar,
      timeUnknown: timeUnknown,
      birthPlace: birthPlace || undefined,
      timezoneName: String(location.tz || 'Asia/Seoul'),
      timezone: String(location.tz || 'Asia/Seoul'),
      lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
      lon: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780),
      birthData: {
        profileId: profileId,
        name: String(profile.name || '사용자'),
        gender: String(profile.gender || ''),
        year: Number(birth.year || 0),
        month: Number(birth.month || 0),
        day: Number(birth.day || 0),
        hour: Number(Number.isFinite(Number(birth.hour)) ? birth.hour : 12),
        minute: Number(Number.isFinite(Number(birth.minute)) ? birth.minute : 0),
        birthDate: birthDate,
        birthTime: birthTime,
        calendarType: calendarType,
        isLunar: isLunar,
        timeUnknown: timeUnknown,
        birthPlace: birthPlace || undefined,
        timezoneName: String(location.tz || 'Asia/Seoul'),
        timezone: String(location.tz || 'Asia/Seoul'),
        lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
        lon: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780)
      },
      profile: {
        profileId: profileId,
        name: String(profile.name || '사용자'),
        gender: String(profile.gender || ''),
        birthDate: birthDate,
        birthTime: birthTime,
        calendarType: calendarType,
        isLunar: isLunar,
        timeUnknown: timeUnknown,
        birthPlace: birthPlace || undefined,
        timezone: String(location.tz || 'Asia/Seoul')
      }
    };

    return { ok: true, body: body };
  }

  function resetDots(activeChapter) {
    var modal = qs('astroBookModal');
    var dots = qsa(modal, '.ab-ch-dot');
    for (var i = 0; i < dots.length; i += 1) {
      var dot = dots[i];
      var chapter = Number(dot.getAttribute('data-abch') || 0);
      dot.classList.remove('lb-ch-dot--pending', 'lb-ch-dot--active', 'lb-ch-dot--done');
      if (chapter < 1 || chapter > TOTAL_CHAPTERS) continue;
      if (chapter < activeChapter) dot.classList.add('lb-ch-dot--done');
      else if (chapter === activeChapter) dot.classList.add('lb-ch-dot--active');
      else dot.classList.add('lb-ch-dot--pending');
    }
  }

  function updateDotTitles(mode) {
    var labels = PERSONAL_CHAPTER_PREVIEW;
    var modal = qs('astroBookModal');
    var dots = qsa(modal, '.ab-ch-dot');
    for (var i = 0; i < dots.length; i += 1) {
      var chapter = Number(dots[i].getAttribute('data-abch') || 0);
      if (chapter >= 1 && chapter <= labels.length) {
        dots[i].setAttribute('title', 'Ch.' + chapter + ' ' + getPreviewTitle(labels[chapter - 1]));
      }
    }
  }

  function setLoadingProgress(payload) {
    var total = Number(payload && payload.totalChapters || TOTAL_CHAPTERS);
    if (!Number.isFinite(total) || total <= 0) total = TOTAL_CHAPTERS;
    var currentChapter = Number(payload && payload.currentChapter || 0);
    var status = String(payload && payload.status || 'generating');
    var completed = status === 'completed' ? total : Math.max(0, Math.min(total, currentChapter));
    var nextChapter = Math.max(1, Math.min(total, currentChapter + 1));
    var progress = Math.round((completed / total) * 100);
    var flow = ASTRO_LOADING_FLOW_PERSONAL;
    var message = status === 'completed'
      ? '코즈믹 리포트 최종 편집을 마무리하고 있습니다...'
      : String(flow[Math.max(0, Math.min(flow.length - 1, nextChapter - 1))] || '점성술 리포트를 생성하는 중입니다...');

    var bar = qs('abProgressBar');
    var text = qs('abProgressText');
    var num = qs('abLoadingChapterNum');
    var label = qs('abLoadingChapter');
    var quote = qs('abMysticQuote');

    if (bar) bar.style.width = progress + '%';
    if (text) text.textContent = completed + ' / ' + total + ' 챕터';
    if (num) num.textContent = 'Chapter ' + nextChapter;
    if (label) label.textContent = message;
    if (quote) {
      state.quoteTick += 1;
      quote.textContent = LOADING_QUOTES[state.quoteTick % LOADING_QUOTES.length];
    }
    resetDots(nextChapter);
  }

  function buildAstroGateKey(body) {
    var b = body || {};
    var chunks = [
      'personal',
      Number(b.year || 0), Number(b.month || 0), Number(b.day || 0),
      Number(b.hour || 12), Number(b.minute || 0)
    ];
    return chunks.join('|');
  }

  function resolveAstroCoinPolicy(body) {
    return {
      cost: ASTRO_COIN_BASE_COST,
      featureKey: ASTRO_COIN_FEATURE_KEY,
      reason: ASTRO_COIN_REASON,
      modeLabel: '개인'
    };
  }

  function extractCoinGatePayload(data) {
    if (data && typeof data.data === 'object') return data.data;
    return data || {};
  }

  async function attemptAstroAutoRefund(reason) {
    var reasonText = String(reason || '');
    if (!/LOCAL_REPORT_FAILED|로컬\s*리포트\s*실패/i.test(reasonText)) return false;
    if (state.refundInFlight) return false;
    var ctx = state.paymentContext;
    if (!ctx || !ctx.featureKey || !Number(ctx.cost)) return false;

    state.refundInFlight = true;
    try {
      var refundRes = await requestJson('/api/fortune/pig-coin/refund', {
        method: 'POST',
        body: {
          cost: Number(ctx.cost),
          featureKey: String(ctx.featureKey),
          sourceTransactionId: String(ctx.sourceTransactionId || ''),
          requestId: String(('refund:' + (ctx.requestId || state.reportId || Date.now())).slice(0, 120)),
          reason: String(reason || '점성술 프리미엄 PDF 생성 실패 자동 환불')
        }
      });

      var payload = refundRes.data || {};
      var code = String(payload.code || '').toUpperCase();
      if (refundRes.ok || code === 'REFUND_ALREADY_PROCESSED') {
        state.paymentContext = null;
        state.paidGateKey = '';
        return true;
      }

      console.warn('[AstroBook] auto refund failed:', payload);
      return false;
    } catch (error) {
      console.warn('[AstroBook] auto refund exception:', error);
      return false;
    } finally {
      state.refundInFlight = false;
    }
  }

  async function ensureAstroCoinGate(body) {
    var gateKey = buildAstroGateKey(body);
    if (state.paidGateKey && state.paidGateKey === gateKey) return true;
    var policy = resolveAstroCoinPolicy(body);

    try {
      if (window.__cdAdminBypass === true) {
        state.paidGateKey = gateKey;
        return true;
      }
    } catch (_) {}

    if (!window.confirm('🪙 점성술 프리미엄 ' + policy.modeLabel + ' 리포트 생성\n이용 시 ' + policy.cost + '코인이 차감됩니다.\n지금 생성하시겠습니까?')) {
      return false;
    }

    var requestId = 'premium-astro:' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    var gateBody = {
      featureKey: policy.featureKey,
      reason: policy.reason,
      forceDeduct: true,
      requestId: requestId
    };

    var res = await requestJson('/api/billing/coin-gate', {
      method: 'POST',
      body: gateBody
    });

    var data = (res && res.data) || {};
    var code = String((data && data.code) || '').toUpperCase();
    var retryableGateError = (!res.ok || data.ok === false)
      && (Number(res.status || 0) >= 500 || Number(res.status || 0) === 0 || code === 'SERVER_ERROR' || code === 'WORKER_UNHANDLED_EXCEPTION');

    if (retryableGateError) {
      res = await requestJson('/api/billing/coin-gate', {
        method: 'POST',
        body: gateBody
      });
      data = (res && res.data) || {};
      code = String((data && data.code) || '').toUpperCase();
    }
    if (res.status === 401 || res.status === 403 || code === 'AUTH_REQUIRED') {
      if (typeof window.__cdOpenLoginRequiredModal === 'function') {
        window.__cdOpenLoginRequiredModal({
          reason: '로그인 후 점성술 프리미엄 리포트를 생성할 수 있습니다.',
          redirectTo: window.location.pathname + window.location.search + window.location.hash
        });
      } else {
        window.location.href = '/login?next=%2F';
      }
      return false;
    }

    if (res.status === 402 || code === 'PAYMENT_REQUIRED' || code === 'INSUFFICIENT_COINS') {
      window.alert(String(data.message || '코인이 부족합니다. 충전 후 다시 시도해 주세요.'));
      if (typeof window.__cdOpenChargeModal === 'function') window.__cdOpenChargeModal();
      return false;
    }

    if (!res.ok || !data || data.ok === false) {
      window.alert(String(data.message || '코인 결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.'));
      return false;
    }

    var payload = extractCoinGatePayload(data);
    persistPremiumAccessToken(payload);
    var consume = payload && typeof payload.consume === 'object' ? payload.consume : {};
    var sourceTransactionId = String(consume.transactionId || payload.transactionId || '');
    var chargedCoins = Number(consume.chargedCoins || payload.chargedCoins || 0);
    var freeBySubscription = Boolean(consume.freeBySubscription || payload.freeBySubscription);
    var coinGateConfirmed = Number(res.status || 0) === 200
      && (!Number(policy.cost || 0) || !!sourceTransactionId || freeBySubscription || chargedCoins <= 0);
    if (!coinGateConfirmed) {
      window.alert('코인 결제 확인값이 부족하여 리포트 생성을 시작하지 않았습니다. 다시 시도해 주세요.');
      return false;
    }

    state.paymentContext = {
      featureKey: String(policy.featureKey || ''),
      cost: Number(policy.cost || 0),
      requestId: String(requestId || ''),
      sourceTransactionId: sourceTransactionId,
      mode: String(policy.modeLabel || '')
    };

    try {
      var user = payload.user || (payload.consume && payload.consume.user) || null;
      if (user && typeof user.points === 'number' && typeof window.__cdSetGoldenBalance === 'function') {
        window.__cdSetGoldenBalance(user.points);
      }
    } catch (_) {}

    state.paidGateKey = gateKey;
    return true;
  }

  function buildChapterArticle(chapter, index) {
    var sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    var insights = Array.isArray(chapter.keyInsights) ? chapter.keyInsights : [];
    var advice = Array.isArray(chapter.practicalAdvice) ? chapter.practicalAdvice : [];

    var sectionsHtml = sections.map(function (section) {
      return '<section class="lb-result-article__section">'
        + '<h4>' + escapeHtml(section.heading || '') + '</h4>'
        + toParagraphHtml(section.body || '')
        + '</section>';
    }).join('');

    var insightsHtml = insights.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');
    var adviceHtml = advice.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');

    return '<article class="lb-result-article" data-ab-article="' + index + '">'
      + '<p class="lb-result-article__chapter">CHAPTER ' + index + '</p>'
      + '<h3 class="lb-result-article__title">' + escapeHtml(chapter.title || ('Chapter ' + index)) + '</h3>'
      + (chapter.subtitle ? '<p class="lb-result-article__subtitle">' + escapeHtml(chapter.subtitle) + '</p>' : '')
      + (chapter.summary ? '<div class="lb-result-article__summary">' + toParagraphHtml(chapter.summary) + '</div>' : '')
      + '<div class="lb-result-article__body">' + sectionsHtml + '</div>'
      + '<div class="lb-result-article__extras" style="display:grid;gap:12px;">'
      + '<div class="lb-result-article__list"><h5>핵심 통찰</h5><ul>' + insightsHtml + '</ul></div>'
      + '<div class="lb-result-article__list"><h5>실천 조언</h5><ul>' + adviceHtml + '</ul></div>'
      + '</div>'
      + '</article>';
  }

  function inferChapterSummary(text) {
    var source = String(text || '').trim();
    if (!source) return '';
    var compact = source.replace(/\r/g, '').replace(/\n+/g, ' ').trim();
    if (compact.length <= 220) return compact;
    return compact.slice(0, 220).trim() + '...';
  }

  function parseSectionsFromMarkdown(fallbackText, preferredHeadings) {
    var text = String(fallbackText || '').replace(/\r/g, '').trim();
    if (!text) return [];

    var headingRegex = /^###\s*(?:\d+\.?\s*)?(.+)$/gm;
    var matches = [];
    var match = null;
    while ((match = headingRegex.exec(text)) !== null) {
      matches.push({
        heading: String(match[1] || '').trim(),
        index: Number(match.index || 0),
        end: Number(headingRegex.lastIndex || 0)
      });
    }

    var sections = [];
    for (var i = 0; i < matches.length; i += 1) {
      var current = matches[i];
      var next = matches[i + 1] || null;
      var bodyStart = current.end;
      var bodyEnd = next ? next.index : text.length;
      var body = String(text.slice(bodyStart, bodyEnd) || '').trim();
      if (!current.heading && !body) continue;
      sections.push({
        heading: current.heading || '핵심 해석',
        body: body
      });
    }

    if (sections.length) return sections;

    var preferred = Array.isArray(preferredHeadings) ? preferredHeadings.filter(Boolean) : [];
    if (preferred.length) {
      return [{ heading: preferred[0], body: text }];
    }

    return [{ heading: '핵심 해석', body: text }];
  }

  function normalizePremiumChapterSections(rawSections, fallbackText, chapterJson, preferredHeadings) {
    var sections = Array.isArray(rawSections) ? rawSections : [];
    var jsonSections = chapterJson && Array.isArray(chapterJson.sections) ? chapterJson.sections : [];
    if (!sections.length && jsonSections.length) sections = jsonSections;

    var normalized = sections.map(function (section) {
      var heading = String((section && (section.heading || section.title || section.name)) || '').trim();
      var body = String((section && (section.body || section.content || section.text)) || '').trim();
      if (!heading && !body) return null;
      return {
        heading: heading || '핵심 해석',
        body: body || ''
      };
    }).filter(Boolean);

    if (normalized.length) return normalized;
    return parseSectionsFromMarkdown(fallbackText, preferredHeadings);
  }

  function normalizeAstroPremiumChapter(data, chapterId, chapterPlan) {
    var chapterJson = (data && data.chapterJson && typeof data.chapterJson === 'object') ? data.chapterJson : null;
    var chapterMeta = (data && data.chapterMeta && typeof data.chapterMeta === 'object')
      ? data.chapterMeta
      : ((Array.isArray(chapterPlan) ? chapterPlan[chapterId - 1] : null) || {});
    var text = String((data && data.text) || '').trim();
    var preferredHeadings = Array.isArray(data && data.chapterSpecificSections)
      ? data.chapterSpecificSections
      : [];
    var sections = normalizePremiumChapterSections(data && data.sections, text, chapterJson, preferredHeadings);
    var title = String((chapterMeta && (chapterMeta.title || chapterMeta.name)) || (chapterJson && chapterJson.title) || ('Chapter ' + chapterId)).trim();
    var subtitle = String((chapterMeta && chapterMeta.subtitle) || (chapterJson && chapterJson.subtitle) || '').trim();
    var summary = String((chapterJson && chapterJson.summary) || inferChapterSummary(text)).trim();
    var keyInsights = chapterJson
      ? (Array.isArray(chapterJson.keyInsights) ? chapterJson.keyInsights : (Array.isArray(chapterJson.cautions) ? chapterJson.cautions : []))
      : [];
    var practicalAdvice = chapterJson && Array.isArray(chapterJson.practicalAdvice) ? chapterJson.practicalAdvice : [];

    return {
      chapterIndex: chapterId,
      title: title,
      subtitle: subtitle,
      summary: summary,
      sections: sections,
      keyInsights: keyInsights,
      practicalAdvice: practicalAdvice,
      text: text,
      chapterJson: chapterJson,
      updatedAt: new Date().toISOString()
    };
  }

  async function generateAstroViaPremiumReport(requestBody, preflightInfo) {
    if (typeof window.__cdPremiumAuthJson !== 'function') {
      return { ok: false, message: '인증 모듈을 초기화하지 못했습니다.' };
    }

    var preparedInfo = preflightInfo || null;
    var reportSessionId = String((preparedInfo && preparedInfo.reportSessionId) || '').trim();
    var snapshotId = String((preparedInfo && preparedInfo.snapshotId) || '').trim();
    var chapterPlan = Array.isArray(preparedInfo && preparedInfo.chapterPlan) ? preparedInfo.chapterPlan.slice() : [];
    var totalChapters = Number((preparedInfo && preparedInfo.totalChapters) || chapterPlan.length || TOTAL_CHAPTERS);
    if (!Number.isFinite(totalChapters) || totalChapters <= 0) totalChapters = TOTAL_CHAPTERS;

    if (!reportSessionId) {
      var prepared = await premiumAuthJson('/api/premium-report/prepare', {
        featureType: ASTRO_PREMIUM_FEATURE_TYPE,
        reportType: ASTRO_PREMIUM_REPORT_TYPE,
        requestBody: requestBody || {},
        requestId: 'astro:prepare:fallback:' + Date.now().toString(36)
      }, {
        maxAttempts: 2
      });

      if (!prepared || !prepared.ok || !prepared.reportSessionId) {
        return {
          ok: false,
          message: buildPreflightMessage(prepared, '리포트 세션 복구에 실패했습니다.')
        };
      }

      reportSessionId = String(prepared.reportSessionId || '');
      snapshotId = String(prepared.snapshotId || snapshotId || '');
      if (Array.isArray(prepared.chapterPlan) && prepared.chapterPlan.length) chapterPlan = prepared.chapterPlan.slice();
      if (Number(prepared.totalChapters) > 0) totalChapters = Number(prepared.totalChapters);
    }

    var chapters = [];

    for (var chapterId = 1; chapterId <= totalChapters; chapterId += 1) {
      setLoadingProgress({
        status: 'generating',
        currentChapter: Math.max(0, chapterId - 1),
        totalChapters: totalChapters
      });

      var chapterResult = null;
      for (var retry = 1; retry <= 4; retry += 1) {
        chapterResult = await premiumAuthJson('/api/premium-report/chapter', {
          reportSessionId: reportSessionId,
          snapshotId: snapshotId || undefined,
          chapterId: chapterId,
          reportType: ASTRO_PREMIUM_REPORT_TYPE,
          featureType: ASTRO_PREMIUM_FEATURE_TYPE,
          requestBody: requestBody || {},
          requestId: 'astro:chapter:' + chapterId + ':' + Date.now().toString(36) + ':' + retry
        }, {
          maxAttempts: 2
        });

        if (chapterResult && chapterResult.reportSessionId) reportSessionId = String(chapterResult.reportSessionId || reportSessionId);
        if (chapterResult && chapterResult.snapshotId) snapshotId = String(chapterResult.snapshotId || snapshotId);

        if (chapterResult && chapterResult.ok) break;

        logAstroDebug('PremiumChapterRetry', {
          chapterId: chapterId,
          retry: retry,
          status: Number((chapterResult && chapterResult.status) || 0),
          code: String((chapterResult && chapterResult.code) || ''),
          message: String((chapterResult && chapterResult.message) || '')
        }, 'warn');

        var status = Number((chapterResult && chapterResult.status) || 0);
        var code = String((chapterResult && chapterResult.code) || '').toUpperCase();
        var sessionMissing = status === 404 || code === 'PREMIUM_REPORT_SESSION_NOT_FOUND' || code === 'REPORT_SESSION_NOT_FOUND';
        var bindingMismatch = status === 409 && code === 'PREMIUM_REPORT_SESSION_BINDING_MISMATCH';
        if (sessionMissing || bindingMismatch) {
          var recovered = await premiumAuthJson('/api/premium-report/prepare', {
            featureType: ASTRO_PREMIUM_FEATURE_TYPE,
            reportType: ASTRO_PREMIUM_REPORT_TYPE,
            requestBody: requestBody || {},
            requestId: 'astro:prepare:recover:' + Date.now().toString(36) + ':' + chapterId + ':' + retry
          }, {
            maxAttempts: 2
          });
          if (recovered && recovered.ok && recovered.reportSessionId) {
            reportSessionId = String(recovered.reportSessionId || reportSessionId);
            snapshotId = String(recovered.snapshotId || snapshotId || '');
            if (Array.isArray(recovered.chapterPlan) && recovered.chapterPlan.length) chapterPlan = recovered.chapterPlan.slice();
            if (Number(recovered.totalChapters) > 0) totalChapters = Number(recovered.totalChapters);
            await delay(220);
            continue;
          }
        }

        if (retry < 4) {
          await delay(Math.min(450 * retry, 1200));
        }
      }

      if (!chapterResult || !chapterResult.ok) {
        return {
          ok: false,
          message: String((chapterResult && chapterResult.message) || ('챕터 ' + chapterId + ' 생성에 실패했습니다.'))
        };
      }

      chapters.push(normalizeAstroPremiumChapter(chapterResult, chapterId, chapterPlan));

      setLoadingProgress({
        status: chapterId >= totalChapters ? 'completed' : 'generating',
        currentChapter: chapterId,
        totalChapters: totalChapters
      });
    }

    var pdfReady = await premiumAuthJson('/api/premium-report/pdf', {
      reportSessionId: reportSessionId,
      snapshotId: snapshotId || undefined,
      reportType: ASTRO_PREMIUM_REPORT_TYPE,
      featureType: ASTRO_PREMIUM_FEATURE_TYPE,
      requestBody: requestBody || {},
      requestId: 'astro:pdf:' + Date.now().toString(36)
    }, {
      maxAttempts: 2
    });

    if (!pdfReady || !pdfReady.ok) {
      logAstroDebug('PremiumPdfFinalizeFailed', {
        status: Number((pdfReady && pdfReady.status) || 0),
        code: String((pdfReady && pdfReady.code) || ''),
        message: String((pdfReady && pdfReady.message) || ''),
        reportSessionId: reportSessionId
      }, 'error');
      return {
        ok: false,
        message: String((pdfReady && pdfReady.message) || 'PDF 생성 준비 검증에 실패했습니다.')
      };
    }

    return {
      ok: true,
      reportId: reportSessionId,
      reportSessionId: reportSessionId,
      snapshotId: snapshotId,
      chapters: chapters,
      chapterPlan: chapterPlan
    };
  }

  function renderResultScreen() {
    var toc = qs('abToc');
    var content = qs('abChapterContent');
    var name = qs('abResultName');
    var date = qs('abResultDate');
    if (!toc || !content) return;

    var modeTitle = '점성술 개인 리포트';
    if (name) name.textContent = modeTitle;
    if (date) {
      var now = new Date();
      date.textContent = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
    }

    var chapters = Array.isArray(state.chapters) ? state.chapters.slice() : [];
    chapters.sort(function (a, b) { return Number(a.chapterIndex || 0) - Number(b.chapterIndex || 0); });

    var tocHtml = [];
    var articleHtml = [];
    for (var i = 0; i < chapters.length; i += 1) {
      var chapter = chapters[i] || {};
      var idx = Number(chapter.chapterIndex || (i + 1));
      tocHtml.push('<button type="button" class="lb-toc-item" data-ab-chapter="' + idx + '"><span>Ch.' + idx + '</span><strong>' + escapeHtml(chapter.title || ('Chapter ' + idx)) + '</strong></button>');
      articleHtml.push(buildChapterArticle(chapter, idx));
    }

    toc.innerHTML = tocHtml.join('');
    content.innerHTML = articleHtml.join('');
    saveAstroResult(getActiveProfile());
    showOnly('abResultScreen');
  }

  function renderChapterPreviewList(mode) {
    var list = document.querySelector('#abStartScreen .lb-start__ch-list');
    if (!list) return;
    var labels = PERSONAL_CHAPTER_PREVIEW;
    var total = Math.max(TOTAL_CHAPTERS, labels.length);
    list.innerHTML = Array.from({ length: total }).map(function (_, idx) {
      var chapter = idx + 1;
      var entry = labels[idx] || { title: 'Chapter ' + chapter, subtitle: '챕터 세부 전략' };
      var title = escapeHtml(getPreviewTitle(entry));
      var subtitle = escapeHtml(getPreviewSubtitle(entry));
      return '<li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.' + chapter + '</span><span>' + title + (subtitle ? '<br><small style="opacity:.82;">' + subtitle + '</small>' : '') + '</span></li>';
    }).join('');
    updateDotTitles(mode);
  }

  async function pollStatusLoop() {
    for (var attempt = 0; attempt < 260; attempt += 1) {
      var res = await requestJson('/api/premium/astrology/status?reportId=' + encodeURIComponent(state.reportId) + '&includeChapters=1', { method: 'GET' });
      var data = res.data || {};
      var code = String((data && data.code) || '').toUpperCase();

      if (res.status === 401 || res.status === 403 || code === 'AUTH_REQUIRED') {
        await attemptAstroAutoRefund('점성술 프리미엄 PDF 생성 중 세션 만료 자동 환불');
        if (typeof window.__cdOpenLoginRequiredModal === 'function') {
          window.__cdOpenLoginRequiredModal({
            reason: '로그인 세션이 만료되어 점성술 프리미엄 리포트 생성을 중단했습니다.',
            redirectTo: window.location.pathname + window.location.search + window.location.hash
          });
        }
        setError(String(data.message || '로그인 세션이 만료되었습니다. 다시 로그인 후 시도해 주세요.'));
        return false;
      }

      if (!res.ok || !data || !data.ok) {
        var sessionMissing = Number(res.status || 0) === 404 || code === 'LEGACY_SESSION_NOT_FOUND';
        if (sessionMissing && state.lastRequestBody && typeof window.__cdPremiumAuthJson === 'function') {
          setLoadingProgress({ currentChapter: 0, status: 'generating', message: '리포트 세션을 복구하는 중...' });
          var recoveredRun = await generateAstroViaPremiumReport(state.lastRequestBody, null);
          if (recoveredRun && recoveredRun.ok) {
            state.reportId = String(recoveredRun.reportId || state.reportId || '');
            state.downloadUrl = '';
            state.chapters = Array.isArray(recoveredRun.chapters) ? recoveredRun.chapters : [];
            state.paymentContext = null;
            renderResultScreen();
            return true;
          }
        }

        if (attempt > 4) {
          await attemptAstroAutoRefund('점성술 프리미엄 PDF 상태 조회 실패 자동 환불');
          setError(String(data.message || '리포트 상태 조회에 실패했습니다.'));
          return false;
        }
        await delay(POLL_INTERVAL_MS);
        continue;
      }

      state.mode = 'personal';
      state.downloadUrl = String(data.downloadUrl || state.downloadUrl || '');
      setLoadingProgress(data);

      if (String(data.status) === 'completed') {
        state.chapters = Array.isArray(data.chapters) ? data.chapters : [];
        state.paymentContext = null;
        renderResultScreen();
        return true;
      }

      if (String(data.status) === 'failed') {
        await attemptAstroAutoRefund('점성술 프리미엄 PDF 생성 실패 자동 환불');
        setError(String(data.errorMessage || data.message || '리포트 생성에 실패했습니다.'));
        return false;
      }

      await delay(POLL_INTERVAL_MS);
    }

    await attemptAstroAutoRefund('점성술 프리미엄 PDF 생성 미완료 자동 환불');
    setError('생성 시간이 길어지고 있습니다. 코인이 차감된 경우 자동 환불을 시도했습니다. 잠시 후 다시 시도해 주세요.');
    return false;
  }

  function updateStartUi() {
    var profile = getActiveProfile();
    var summary = qs('abProfileSummary');
    if (summary) summary.textContent = formatProfileSummary(profile);

    var mode = 'personal';
    renderChapterPreviewList(mode);

    var cta = qs('abStartBtn');
    if (cta) cta.textContent = '✨ 점성술 코즈믹 차트 생성하기';
  }

  function applyActiveProfileArg(profileArg) {
    if (!profileArg || !profileArg.birth) return;
    var birth = profileArg.birth;
    if (!(Number(birth.year) > 0 && Number(birth.month) > 0 && Number(birth.day) > 0)) return;
    try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
  }

  function blurActiveInsideModal(modal) {
    try {
      var active = document.activeElement;
      if (active && modal && modal.contains(active) && typeof active.blur === 'function') {
        active.blur();
      }
    } catch (_) {}
  }

  window.openAstroBookModal = function (profileArg) {
    var modal = qs('astroBookModal');
    if (!modal) return;

    applyActiveProfileArg(profileArg);

    ensureModeUi();
    updateStartUi();
    var selectedMode = getSelectedMode();
    var restored = loadAstroResult(getActiveProfile(), selectedMode);
    if (restored) {
      setAstroMode('personal');
      updateStartUi();
      state.mode = 'personal';
      state.reportId = String(restored.reportId || '');
      state.downloadUrl = String(restored.downloadUrl || '');
      state.chapters = Array.isArray(restored.chapters) ? restored.chapters.slice() : [];
      renderResultScreen();
    } else {
      showOnly(hasProfile() ? 'abStartScreen' : 'abNoProfileScreen');
    }
    modal.style.display = 'flex';
    modal.style.zIndex = '100120';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-modal-open');
    try {
      modal.setAttribute('aria-hidden', 'false');
      var closeBtn = modal.querySelector('.lb-modal__close');
      if (closeBtn && typeof closeBtn.focus === 'function') {
        setTimeout(function () { try { closeBtn.focus(); } catch (_) {} }, 40);
      }
    } catch (_) {}
  };

  window.closeAstroBookModal = function () {
    var modal = qs('astroBookModal');
    if (!modal) return;
    blurActiveInsideModal(modal);
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.generateAstroBook = async function () {
    if (state.generating) {
      notify('이미 리포트를 생성 중입니다.');
      return;
    }
    if (!hasProfile()) {
      showOnly('abNoProfileScreen');
      return;
    }

    ensureModeUi();
    updateStartUi();

    var requestInput = buildRequestBody();
    if (!requestInput.ok) {
      setError(requestInput.message || '입력값을 확인해 주세요.');
      return;
    }

    state.generating = true;
    state.mode = String(requestInput.body.mode || 'personal');
    state.reportId = '';
    state.downloadUrl = '';
    state.chapters = [];
    state.quoteTick = 0;
    var generationBody = requestInput.body;
    state.lastRequestBody = generationBody;

    showOnly('abLoadingScreen');
    activateAstroCinematicLoading();
    setLoadingProgress({ currentChapter: 0, status: 'generating', message: '결제 확인 중...' });

    try {
      var gateOk = await ensureAstroCoinGate(generationBody);
      if (!gateOk) {
        showOnly('abStartScreen');
        return;
      }

      generationBody = await enrichRequestBodyWithAstroSeed(generationBody);
      state.lastRequestBody = generationBody;

      setLoadingProgress({ currentChapter: 0, status: 'generating', message: '생성 전 데이터 점검 중...' });
      var preflight = await ensureAstroPremiumPreflight(generationBody);
      if (!preflight.ok) {
        var preflightCode = String((preflight && preflight.code) || '').toUpperCase();
        // ASTRO_CHART_SEED_FAILED: server fallback should have prevented this,
        // but if still occurs (transient), do NOT refund – chart calc failure is retriable
        var isSeedFailure = preflightCode.indexOf('ASTRO_CHART_SEED') !== -1 ||
          preflightCode.indexOf('ASTRO_CANONICAL') !== -1;
        if (!isSeedFailure) {
          await attemptAstroAutoRefund('점성술 프리미엄 preflight 실패 자동 환불');
        }
        state.paidGateKey = '';
        setError(String(preflight.message || '생성 전 데이터 점검에 실패했습니다.'));
        return;
      }

      setLoadingProgress({ currentChapter: 0, status: 'generating', message: '리포트 생성을 시작합니다...' });

      var res = await requestJson('/api/premium/astrology/generate', {
        method: 'POST',
        body: generationBody
      });

      if (!res.ok || !res.data || !res.data.ok) {
        logAstroDebug('LegacyGenerateFailed', {
          status: Number(res.status || 0),
          code: String((res.data && res.data.code) || ''),
          message: String((res.data && res.data.message) || '')
        }, 'warn');
        var fallbackRun = await generateAstroViaPremiumReport(generationBody, preflight);
        if (fallbackRun && fallbackRun.ok) {
          state.reportId = String(fallbackRun.reportId || '');
          state.downloadUrl = '';
          state.chapters = Array.isArray(fallbackRun.chapters) ? fallbackRun.chapters : [];
          state.paymentContext = null;
          renderResultScreen();
          return;
        }
        await attemptAstroAutoRefund('점성술 프리미엄 PDF 생성 시작 실패 자동 환불');
        setError(String((res.data && res.data.message) || fallbackRun && fallbackRun.message || '점성술 리포트 생성 시작에 실패했습니다.'));
        return;
      }

      state.reportId = String(res.data.reportId || '');
      state.mode = String(res.data.mode || state.mode || 'personal');
      state.downloadUrl = String(res.data.downloadUrl || '');

      if (!state.reportId) {
        var reportIdFallback = await generateAstroViaPremiumReport(generationBody, preflight);
        if (reportIdFallback && reportIdFallback.ok) {
          state.reportId = String(reportIdFallback.reportId || '');
          state.downloadUrl = '';
          state.chapters = Array.isArray(reportIdFallback.chapters) ? reportIdFallback.chapters : [];
          state.paymentContext = null;
          renderResultScreen();
          return;
        }
        await attemptAstroAutoRefund('점성술 프리미엄 PDF reportId 누락 자동 환불');
        setError(String(reportIdFallback && reportIdFallback.message || 'reportId를 받지 못했습니다. 잠시 후 다시 시도해 주세요.'));
        return;
      }

      var done = await pollStatusLoop();
      if (!done && qs('abLoadingScreen') && qs('abLoadingScreen').style.display !== 'none') {
        setError('리포트 생성 중 문제가 발생했습니다.');
      }
    } catch (error) {
      logAstroDebug('GenerateUnhandledException', {
        message: String(error && error.message || error || 'unknown'),
        name: String(error && error.name || '')
      }, 'error');
      await attemptAstroAutoRefund('점성술 프리미엄 예외 자동 환불');
      state.paidGateKey = '';
      setError(String(error && error.message || '점성술 리포트 생성 중 오류가 발생했습니다.'));
    } finally {
      state.generating = false;
    }
  };

  function buildLocalAstroPrintableHtml() {
    var profile = getActiveProfile() || {};
    var ownerName = String(profile.name || '사용자');
    var modeLabel = '점성술 개인 리포트';
    var now = new Date();
    var generatedAt = now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getDate()).padStart(2, '0');
    var chapters = Array.isArray(state.chapters) ? state.chapters.slice() : [];
    chapters.sort(function (a, b) {
      return Number(a && a.chapterIndex || 0) - Number(b && b.chapterIndex || 0);
    });

    var chapterBlocks = chapters.map(function (chapter, i) {
      var chapterIndex = Number(chapter && chapter.chapterIndex || (i + 1));
      var title = String(chapter && chapter.title || ('Chapter ' + chapterIndex));
      var subtitle = String(chapter && chapter.subtitle || '');
      var summary = String(chapter && chapter.summary || '');
      var sections = Array.isArray(chapter && chapter.sections) ? chapter.sections : [];
      var advice = Array.isArray(chapter && chapter.practicalAdvice) ? chapter.practicalAdvice : [];
      var insights = Array.isArray(chapter && chapter.keyInsights) ? chapter.keyInsights : [];

      var sectionHtml = sections.map(function (section) {
        var heading = escapeHtml(section && section.heading || '핵심 해석');
        var body = toParagraphHtml(section && section.body || '');
        return '<section class="ab-print-section"><h4>' + heading + '</h4>' + body + '</section>';
      }).join('');

      var adviceHtml = advice.length
        ? '<div class="ab-print-list"><h5>실천 조언</h5><ul>' + advice.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div>'
        : '';
      var insightsHtml = insights.length
        ? '<div class="ab-print-list"><h5>핵심 통찰</h5><ul>' + insights.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div>'
        : '';

      return [
        '<article class="ab-print-chapter">',
        '<p class="ab-print-chip">CHAPTER ' + chapterIndex + '</p>',
        '<h2>' + escapeHtml(title) + '</h2>',
        subtitle ? '<p class="ab-print-sub">' + escapeHtml(subtitle) + '</p>' : '',
        summary ? '<div class="ab-print-summary">' + toParagraphHtml(summary) + '</div>' : '',
        sectionHtml,
        insightsHtml,
        adviceHtml,
        '</article>'
      ].join('');
    }).join('');

    return [
      '<!doctype html>',
      '<html lang="ko">',
      '<head>',
      '<meta charset="utf-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1" />',
      '<title>' + escapeHtml(ownerName + '님의 ' + modeLabel) + '</title>',
      '<style>',
      'body{margin:0;padding:24px;font-family:"Noto Serif KR","Nanum Myeongjo",serif;background:#f8fafc;color:#0f172a;line-height:1.75}',
      '.ab-print-cover{padding:24px;border:1px solid #dbe5f7;border-radius:16px;background:#ffffff;margin-bottom:20px}',
      '.ab-print-cover h1{margin:0 0 8px;font-size:30px;color:#7c2d12}',
      '.ab-print-cover p{margin:2px 0;font-size:13px;color:#334155}',
      '.ab-print-chapter{margin-bottom:18px;padding:18px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;break-inside:avoid}',
      '.ab-print-chip{display:inline-block;margin:0 0 10px;padding:4px 10px;border-radius:999px;background:#fff7ed;color:#9a3412;font-weight:700;font-size:11px}',
      '.ab-print-chapter h2{margin:0 0 6px;font-size:22px;color:#111827}',
      '.ab-print-sub{margin:0 0 10px;color:#334155}',
      '.ab-print-summary{margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa}',
      '.ab-print-section{margin:0 0 10px}',
      '.ab-print-section h4{margin:0 0 6px;font-size:16px;color:#1f2937}',
      '.ab-print-list{margin-top:8px}',
      '.ab-print-list h5{margin:0 0 6px;font-size:14px;color:#1f2937}',
      '.ab-print-list ul{margin:0 0 0 18px;padding:0}',
      '.ab-print-list li{margin:0 0 5px}',
      '@media print{body{padding:0;background:#fff}.ab-print-cover,.ab-print-chapter{border:none;border-radius:0;box-shadow:none}}',
      '</style>',
      '</head>',
      '<body>',
      '<section class="ab-print-cover">',
      '<h1>' + escapeHtml(ownerName + ' · ' + modeLabel) + '</h1>',
      '<p>리포트 ID: ' + escapeHtml(String(state.reportId || 'local-preview')) + '</p>',
      '<p>생성일: ' + escapeHtml(generatedAt) + '</p>',
      '</section>',
      chapterBlocks,
      '</body>',
      '</html>'
    ].join('\n');
  }

  function openPrintWindow(html) {
    var printWindow = null;
    try {
      printWindow = window.open('', '_blank');
      if (!printWindow) return false;
      printWindow.document.open();
      printWindow.document.write(String(html || ''));
      printWindow.document.close();
      printWindow.focus();
      setTimeout(function () {
        try { printWindow.print(); } catch (_) {}
      }, 350);
      return true;
    } catch (_) {
      return false;
    }
  }

  window.downloadAstroBookPdf = async function () {
    if (state.generating) {
      notify('아직 생성 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (!state.reportId) {
      notify('다운로드할 리포트를 찾을 수 없습니다.');
      return;
    }

    var downloadUrl = state.downloadUrl || ('/api/premium/astrology/download?reportId=' + encodeURIComponent(state.reportId));
    var fetchUrl = resolveApiUrl(downloadUrl);
    var headers = new Headers();
    var token = getAuthToken();
    if (token) headers.set('Authorization', 'Bearer ' + token);

    var html = '';
    var fetchError = null;
    try {
      var res = await fetch(fetchUrl, {
        method: 'GET',
        credentials: 'include',
        headers: headers
      });

      if (!res.ok) {
        var errData = null;
        try { errData = await res.json(); } catch (_) { errData = null; }
        throw new Error(String(errData && errData.message || '다운로드에 실패했습니다.'));
      }

      var contentType = String((res.headers && res.headers.get('content-type')) || '').toLowerCase();
      if (contentType.indexOf('application/json') >= 0) {
        var payload = null;
        try { payload = await res.json(); } catch (_) { payload = null; }
        throw new Error(String(payload && payload.message || '다운로드 응답 형식이 올바르지 않습니다.'));
      }

      html = await res.text();
    } catch (error) {
      fetchError = error;
    }

    if (!html) html = buildLocalAstroPrintableHtml();
    if (!html) {
      throw (fetchError || new Error('저장 가능한 리포트 내용을 찾지 못했습니다.'));
    }

    if (openPrintWindow(html)) {
      notify('인쇄 창이 열렸습니다. 대상 프린터를 PDF로 선택해 저장해 주세요.');
      return;
    }

    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var objectUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'astrology-premium-' + (state.mode || 'personal') + '-' + (state.reportId || Date.now()) + '.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(objectUrl);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1200);
    notify('HTML 파일로 다운로드되었습니다. 브라우저에서 열어 인쇄 > PDF 저장을 선택해 주세요.');
  };

  window.gotoAstrologyPremium = function () {
    window.openAstroBookModal();
  };

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;

    var actionEl = target.closest('[data-action]');
    if (actionEl) {
      var action = actionEl.getAttribute('data-action');
      if (action === 'closeAstroBookModal') {
        window.closeAstroBookModal();
        return;
      }
    }

    var tocBtn = target.closest('[data-ab-chapter]');
    if (tocBtn) {
      var chapter = String(tocBtn.getAttribute('data-ab-chapter') || '').trim();
      var article = chapter ? document.querySelector('[data-ab-article="' + chapter + '"]') : null;
      if (article && typeof article.scrollIntoView === 'function') {
        article.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
  }, false);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var modal = qs('astroBookModal');
    if (modal && modal.style.display !== 'none') window.closeAstroBookModal();
  });

  function init() {
    ensureModeUi();
    updateStartUi();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();