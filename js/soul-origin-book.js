(function () {
  'use strict';

  var FEATURE_KEY = 'coin-gate-per-use';
  var REPORT_TYPE = 'soulOriginKarma';
  var COIN_COST = 690;
  var PREPARE_API = '/api/soul-origin';
  var READ_API = '/api/soul-origin/report';
  var STORAGE_KEY = 'premium:soul-origin:last:v1';

  var _result = null;
  var _loadingTimer = null;
  var _isGenerating = false;

  var LOADING_TEXTS = [
    '당신이 태어난 순간의 시간과 별을 펼치는 중입니다.',
    '다섯 운명 체계가 하나의 기원 서사로 연결되고 있습니다.',
    '반복되던 삶의 장면 속에서 숨은 의미를 찾고 있습니다.',
    '당신의 업을 벌이 아닌 방향으로 다시 해석하고 있습니다.',
  ];

  function $(id) { return document.getElementById(id); }
  function clean(value) { return String(value == null ? '' : value).trim(); }

  function setDisplay(id, value) {
    var el = $(id);
    if (el) el.style.display = value;
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

  function normalizeInput(raw) {
    var src = raw || {};
    var date = parseDateParts(src.birthDate || '');
    var time = parseTimeParts(src.birthTime || '');
    if (!date || !time) return null;

    var lat = Number(src.latitude);
    var lon = Number(src.longitude);
    if (!Number.isFinite(lat)) lat = 37.5665;
    if (!Number.isFinite(lon)) lon = 126.978;

    var timezone = clean(src.timezone || 'Asia/Seoul') || 'Asia/Seoul';

    return {
      name: clean(src.name || '사용자') || '사용자',
      gender: clean(src.gender || 'unknown') || 'unknown',
      birthDate: src.birthDate,
      birthTime: src.birthTime,
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

  function buildZiweiSnapshot(input) {
    try {
      if (typeof window.calcZiweiPalaces !== 'function') return null;
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

    if (titleEl) titleEl.textContent = clean(payload && payload.title) || '운명의 기원서';
    if (summaryEl) summaryEl.textContent = clean(payload && payload.summary) || '당신의 기원서가 열렸습니다.';

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

  function storePremiumToken(token) {
    var value = clean(token);
    if (!value) return;
    try { window.__cdPremiumAccessToken = value; } catch (_) {}
    try { sessionStorage.setItem('cd_premium_access_token', value); } catch (_) {}
    try { localStorage.setItem('cd_premium_access_token', value); } catch (_) {}
  }

  function ensurePayment() {
    if (typeof window._cdCoinGatePerUse !== 'function') {
      return Promise.resolve({ ok: true, premiumAccessToken: readPremiumToken() });
    }

    return new Promise(function (resolve, reject) {
      var settled = false;
      function done(payload) {
        if (settled) return;
        settled = true;
        if (payload && payload.ok === false) {
          reject(new Error(clean(payload.message) || '코인 결제 확인이 필요합니다.'));
          return;
        }
        var token = clean((payload && (payload.premiumAccessToken || payload.accessToken || payload.token)) || '');
        if (token) storePremiumToken(token);
        resolve(payload || { ok: true, premiumAccessToken: readPremiumToken() });
      }

      try {
        var immediate = window._cdCoinGatePerUse(
          COIN_COST,
          '운명의 기원서 생성',
          function (transactionId, data) {
            done(Object.assign({ ok: true, transactionId: transactionId }, data || {}));
          },
          function (error) {
            done({ ok: false, message: clean(error && error.message) || '코인 결제 확인이 필요합니다.' });
          },
          {
            featureKey: FEATURE_KEY,
            reportType: REPORT_TYPE,
            serviceKey: 'soul-origin',
            requestId: 'soul-origin-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
          },
        );

        if (immediate && typeof immediate.then === 'function') {
          immediate.then(done).catch(function (error) {
            done({ ok: false, message: clean(error && error.message) });
          });
        }
      } catch (error) {
        done({ ok: false, message: clean(error && error.message) });
      }
    });
  }

  function callApi(path, payload, token) {
    var endpoints = getApiBaseCandidates(path);
    var idx = 0;

    return new Promise(function (resolve, reject) {
      function run() {
        if (idx >= endpoints.length) {
          reject(new Error('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
          return;
        }

        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['x-premium-access-token'] = token;

        fetch(endpoints[idx], {
          method: 'POST',
          credentials: 'include',
          headers: headers,
          body: JSON.stringify(payload),
        })
          .then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
              return { ok: res.ok, status: res.status, data: data };
            });
          })
          .then(function (pack) {
            if (pack.ok && pack.data && pack.data.ok) {
              resolve(pack.data);
              return;
            }

            if (pack.status === 401 || pack.status === 403 || pack.status === 422) {
              reject(new Error(clean(pack.data && pack.data.message) || '입력값 또는 결제 상태를 확인해 주세요.'));
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
    });
  }

  async function generateSoulOrigin() {
    if (_isGenerating) return;
    _isGenerating = true;

    try {
      var profileRaw = readActiveProfile();
      var input = normalizeInput(profileRaw || {});
      if (!input) {
        throw new Error('태어난 시간과 장소 정보를 다시 확인해야 기원서를 열 수 있습니다. 입력값을 확인한 뒤 다시 시도해주세요.');
      }

      showScreen('loading');
      startLoadingTicker();

      var payment = await ensurePayment();
      var token = clean((payment && (payment.premiumAccessToken || payment.accessToken)) || readPremiumToken());

      var snapshots = {
        saju: buildSajuSnapshot(),
      };

      var ziwei = buildZiweiSnapshot(input);
      if (ziwei) snapshots.ziwei = ziwei;

      var reportId = 'soul-origin:' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 8);
      var payload = {
        mode: 'personal',
        featureKey: FEATURE_KEY,
        reportId: reportId,
        input: input,
        premiumAccessToken: token || undefined,
        engineSnapshots: snapshots,
      };

      var data = await callApi(PREPARE_API, payload, token);
      persistResult(data);
      renderResult(data);
    } catch (error) {
      var msg = clean(error && error.message) || '기원서를 여는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
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
    document.body.style.overflow = '';
  }

  function openModal() {
    var modal = $('soulOriginModal');
    if (!modal) return;
    modal.style.display = 'block';
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
        alert('요청한 기원서를 찾지 못했습니다.');
        return;
      }
      fetch(endpoints[idx], { method: 'GET', credentials: 'include' })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
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
