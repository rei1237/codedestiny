(function () {
  'use strict';

  var FEATURE_KEY = 'premium_pdf_soul_origin';
  var REPORT_TYPE = 'soulOriginKarma';
  var COIN_COST = 690;
  var PREPARE_API = '/api/soul-origin';
  var READ_API = '/api/soul-origin/report';
  var SOUL_ORIGIN_FETCH_TIMEOUT_MS = 30000;
  var STORAGE_KEY = 'premium:soul-origin:last:v1';
  var REQUEST_ID_KEY = 'premium:soul-origin:last-request-id:v1';
  var SESSION_ID_KEY = 'premium:soul-origin:last-session-id:v1';

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
      var hour = Number.isFinite(Number(birth.hour)) ? Number(birth.hour) : 12;
      var minute = Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0;
      var date = [String(birth.year).padStart(4, '0'), String(birth.month).padStart(2, '0'), String(birth.day).padStart(2, '0')].join('-');
      var time = [String(hour).padStart(2, '0'), String(minute).padStart(2, '0')].join(':');
      return {
        name: clean(profile.name || '사용자') || '사용자',
        gender: clean(profile.gender || 'unknown') || 'unknown',
        birthDate: date,
        birthTime: time,
        birthPlace: clean(profile.birthPlace || (profile.location && profile.location.label) || ''),
        timezone: clean(profile.timezone || (profile.location && profile.location.tz) || 'Asia/Seoul') || 'Asia/Seoul',
        latitude: Number(profile.latitude != null ? profile.latitude : (profile.location && profile.location.lat)),
        longitude: Number(profile.longitude != null ? profile.longitude : (profile.location && (profile.location.lon != null ? profile.location.lon : profile.location.lng))),
      };
    }

    return readStorageProfile();
  }

  function readPrayerIntent() {
    function readValue(id) {
      var el = $(id);
      if (!el) return '';
      return clean(el.value || el.textContent || '');
    }

    return {
      prayerTopic: readValue('soPrayerTopic') || clean(window.__cdSoulOriginPrayerTopic || ''),
      currentConcern: readValue('soCurrentConcern') || clean(window.__cdSoulOriginCurrentConcern || ''),
      desiredOutcome: readValue('soDesiredOutcome') || clean(window.__cdSoulOriginDesiredOutcome || ''),
      partnerInfo: readValue('soPartnerInfo') || clean(window.__cdSoulOriginPartnerInfo || ''),
      partnerBirthDate: readValue('soPartnerBirthDate') || clean(window.__cdSoulOriginPartnerBirthDate || ''),
      partnerBirthTime: readValue('soPartnerBirthTime') || clean(window.__cdSoulOriginPartnerBirthTime || ''),
    };
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

    if (!time || !Number.isFinite(time.hour)) {
      // 시간 미상인 경우 정오 기준으로 로컬 계산을 진행해 생성 파이프라인을 유지한다.
      time = { hour: 12, minute: 0 };
    }

    var lat = Number(src.latitude);
    var lon = Number(src.longitude);
    if (!Number.isFinite(lat)) lat = 37.5665;
    if (!Number.isFinite(lon)) lon = 126.978;

    var timezone = clean(src.timezone || 'Asia/Seoul') || 'Asia/Seoul';

    return {
      name: clean(src.name || '사용자') || '사용자',
      gender: clean(src.gender || 'unknown') || 'unknown',
      birthDate: src.birthDate,
      birthTime: clean(src.birthTime) || [String(time.hour).padStart(2, '0'), String(time.minute).padStart(2, '0')].join(':'),
      birthPlace: clean(src.birthPlace || '출생지 미상') || '출생지 미상',
      timezone: timezone,
      timezoneOffset: inferTimezoneOffsetHours(timezone),
      latitude: lat,
      longitude: lon,
    };
  }

  function buildSajuSnapshot() {
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var analysis = snap.analysis || snap.saju || {};
    var daewoon = [];

    if (Array.isArray(window.G_DAEWOON)) {
      daewoon = window.G_DAEWOON.slice(0, 8).map(function (row) {
        if (!row || typeof row !== 'object') return null;
        return {
          label: clean(row.label || row.name || row.ganji || ''),
          period: clean(row.period || row.range || ''),
        };
      }).filter(Boolean);
    }

    return {
      dayMaster: clean((window.G_PILLARS && window.G_PILLARS.d && window.G_PILLARS.d.g) || analysis.dayMaster || ''),
      analysis: {
        power_label: clean(analysis.power_label || ((window.G_POWER && window.G_POWER.isStrong) ? '신강' : (window.G_POWER ? '신약' : ''))),
        yongshin_elements: Array.isArray(analysis.yongshin_elements)
          ? analysis.yongshin_elements.slice(0, 5)
          : (window.G_POWER && Array.isArray(window.G_POWER.yongshin) ? window.G_POWER.yongshin.slice(0, 5) : []),
        elementWeights: analysis.elementWeights || {},
      },
      daewoon: daewoon,
    };
  }

  function normalizeZiweiStars(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 4).map(function (row) {
      var item = row || {};
      return {
        name: {
          ko: clean((item.name && item.name.ko) || item.nameKo || item.name || ''),
        },
        strengthName: clean(item.strengthName || item.strength || ''),
      };
    }).filter(function (item) { return clean(item.name.ko); });
  }

  function normalizeZiweiPalaces(raw) {
    var source = [];
    if (Array.isArray(raw && raw.palaceStarData)) source = raw.palaceStarData;
    else if (Array.isArray(raw && raw.palaces)) source = raw.palaces;
    return source.slice(0, 12).map(function (row, index) {
      var p = row || {};
      return {
        key: clean(p.key || p.id || ''),
        nameKo: clean(p.nameKo || p.name || p.palace || ''),
        mainStars: normalizeZiweiStars(p.mainStars || p.stars || []),
        index: index,
      };
    }).filter(function (item) { return clean(item.nameKo); });
  }

  async function ensureZiweiEngineReady() {
    if (typeof window.calcZiweiPalaces === 'function') return true;
    if (typeof window.__cdEnsureSajuCoreLoaded === 'function') {
      try {
        await window.__cdEnsureSajuCoreLoaded();
      } catch (_) {}
    }
    return typeof window.calcZiweiPalaces === 'function';
  }

  async function buildZiweiSnapshot(input) {
    try {
      var hasZiweiEngine = await ensureZiweiEngineReady();
      if (!hasZiweiEngine) return null;
      var gender = input.gender === 'male' ? 'M' : (input.gender === 'female' ? 'F' : 'OTHER');
      var date = parseDateParts(input.birthDate);
      var time = parseTimeParts(input.birthTime);
      if (!date || !time) return null;
      var raw = window.calcZiweiPalaces(date.year, date.month, date.day, time.hour, time.minute);
      if (!raw || (!raw.palaceStarData && !raw.palaces)) return null;

      return {
        chartMeta: {
          mingGong: clean(raw.meng || ''),
          shenGong: clean(raw.shen || ''),
        },
        palaces: normalizeZiweiPalaces(raw),
      };
    } catch (_) {
      return null;
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

  function runServerCoinGate(reportId, requestId, sessionId) {
    var endpoints = getApiBaseCandidates('/api/billing/coin-gate');
    var idx = 0;

    function next(resolve, reject, lastMessage) {
      if (idx >= endpoints.length) {
        reject(new Error(lastMessage || '코인 결제 확인에 실패했습니다.'));
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
            reject(new Error(clean(payload.message || payload.error || payload.code) || '코인 결제 확인이 필요합니다.'));
            return;
          }

          if (!isRetryableStatus(pack.status)) {
            reject(new Error(clean(payload.message || payload.error || payload.code) || ('HTTP ' + pack.status)));
            return;
          }

          next(resolve, reject, clean(payload.message || payload.error || payload.code));
        })
        .catch(function (error) {
          next(resolve, reject, clean(error && error.message));
        });
    }

    return new Promise(function (resolve, reject) { next(resolve, reject, ''); });
  }

  function ensurePayment() {
    var requestId = readSessionValue(REQUEST_ID_KEY) || makeRequestId();
    var sessionId = readSessionValue(SESSION_ID_KEY) || makeSessionId();
    writeSessionValue(REQUEST_ID_KEY, requestId);
    writeSessionValue(SESSION_ID_KEY, sessionId);

    if (typeof window._cdCoinGatePerUse !== 'function') {
      return runServerCoinGate('soul-origin:' + Date.now().toString(36), requestId, sessionId);
    }

    return new Promise(function (resolve, reject) {
      var settled = false;
      function done(payload) {
        if (settled) return;
        settled = true;
        if (payload && payload.ok === false) {
          runServerCoinGate('soul-origin:' + Date.now().toString(36), requestId, sessionId)
            .then(resolve)
            .catch(function () {
              reject(new Error(clean(payload.message) || '코인 결제 확인이 필요합니다.'));
            });
          return;
        }
        var token = clean((payload && (payload.premiumAccessToken || payload.accessToken || payload.token)) || '');
        if (token) storePremiumToken(token);
        var reportId = clean(payload && payload.reportId) || ('soul-origin:' + Date.now().toString(36));
        var grant = normalizeAccessGrant(payload, reportId, requestId, sessionId);
        resolve(Object.assign({}, payload || { ok: true, premiumAccessToken: readPremiumToken() }, {
          requestId: clean((payload && payload.requestId) || requestId),
          sessionId: clean((payload && (payload.sessionId || payload.reportSessionId)) || sessionId),
          premiumAccessToken: token || readPremiumToken(),
          accessGrant: grant,
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
            logStage('Failed', { stage: 'CoinGateFailed', errorCode: 'COIN_GATE_FAILED' });
            done({ ok: false, message: clean(error && error.message) || '코인 결제 확인이 필요합니다.' });
          },
          {
            featureKey: FEATURE_KEY,
            reportType: REPORT_TYPE,
            serviceKey: 'soul-origin',
            requestId: requestId,
          },
        );

        if (immediate && typeof immediate.then === 'function') {
          immediate.then(done).catch(function (error) {
            done({ ok: false, message: clean(error && error.message) });
          });
        }
      } catch (error) {
        logStage('Failed', { stage: 'CoinGateException', errorCode: clean(error && error.code) || 'COIN_GATE_EXCEPTION' });
        done({ ok: false, message: clean(error && error.message) });
      }
    });
  }

  function callApi(path, payload, token) {
    var endpoints = getApiBaseCandidates(path);
    var idx = 0;
    var lastClientError = '';

    return new Promise(function (resolve, reject) {
      function run() {
        if (idx >= endpoints.length) {
          reject(new Error(lastClientError || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
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
              lastClientError = message || '입력값 또는 결제 상태를 확인해 주세요.';
              reject(new Error(lastClientError));
              return;
            }

            idx += 1;
            run();
          })
          .catch(function (error) {
            var reason = clean(error && error.message);
            if (reason && !lastClientError) lastClientError = reason;
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
        throw new Error('태어난 날짜 정보를 확인해야 운명의 업 리포트를 열 수 있습니다. 생년월일을 확인한 뒤 다시 시도해주세요.');
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

      var snapshots = {
        saju: buildSajuSnapshot(),
      };

      var ziwei = await buildZiweiSnapshot(input);
      if (ziwei) snapshots.ziwei = ziwei;

      var reportId = 'soul-origin:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
      var payload = {
        mode: 'personal',
        featureKey: FEATURE_KEY,
        productKey: FEATURE_KEY,
        reportType: REPORT_TYPE,
        requestId: paymentRequestId || requestId,
        sessionId: paymentSessionId || sessionId,
        reportSessionId: paymentSessionId || sessionId,
        reportId: reportId,
        input: Object.assign({}, input, readPrayerIntent()),
        premiumAccessToken: token || undefined,
        accessGrant: accessGrant || undefined,
        payment: accessGrant ? {
          requestId: clean(accessGrant.requestId || paymentRequestId || requestId) || undefined,
          purchaseId: clean(accessGrant.purchaseId || '') || undefined,
          sessionId: clean(accessGrant.sessionId || paymentSessionId || sessionId) || undefined,
          reportSessionId: clean(accessGrant.reportSessionId || accessGrant.sessionId || paymentSessionId || sessionId) || undefined,
        } : undefined,
        _paymentContext: accessGrant ? {
          requestId: clean(accessGrant.requestId || paymentRequestId || requestId) || undefined,
          purchaseId: clean(accessGrant.purchaseId || '') || undefined,
          sessionId: clean(accessGrant.sessionId || paymentSessionId || sessionId) || undefined,
          reportSessionId: clean(accessGrant.reportSessionId || accessGrant.sessionId || paymentSessionId || sessionId) || undefined,
        } : undefined,
        engineSnapshots: snapshots,
      };

      logStage('SessionCreateStart', { requestId: requestId, sessionId: sessionId });
      logStage('LocalCalcStart', { requestId: requestId, sessionId: sessionId });
      var data = await callApi(PREPARE_API, payload, token);
      logStage('LocalCalcSuccess', { requestId: requestId, sessionId: clean(data && data.sessionId) || sessionId });
      logStage('PDFCreateStart', { requestId: requestId, sessionId: clean(data && data.sessionId) || sessionId });
      logStage('PDFCreateSuccess', { requestId: requestId, sessionId: clean(data && data.sessionId) || sessionId });
      persistResult(data);
      renderResult(data);
    } catch (error) {
      logStage('Failed', {
        stage: 'Failed',
        requestId: requestId,
        sessionId: sessionId,
        errorCode: clean(error && error.code) || 'DESTINY_PRAYER_BOOK_FAILED',
      });
      var msg = clean(error && error.message) || '운명의 업 리포트를 여는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
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

    var profile = normalizeInput(readActiveProfile() || {});
    var summaryEl = $('soProfileSummary');
    if (summaryEl) {
      if (profile) {
        summaryEl.textContent = [
          clean(profile.name || '사용자'),
          clean(profile.birthDate),
          clean(profile.birthTime),
          clean(profile.birthPlace),
        ].filter(Boolean).join(' · ');
      } else {
        summaryEl.textContent = '생년월일시와 출생지를 확인해주세요.';
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
          if (pack.ok && pack.data && pack.data.ok) {
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
