/**
 * Vedic Premium PDF (Jyotish)
 * Worker Vedic-engine-first pipeline + premium prepare endpoint.
 */
(function () {
  'use strict';

  var VEDIC_FEATURE_KEY = 'premium_pdf_vedic';
  var VEDIC_PREPARE_API = '/api/vedic/premium/prepare';
  var VEDIC_CHAPTERS_API = '/api/vedic/premium/chapters';
  var VEDIC_PLANETS_API = '/api/vedic/planets';
  var VEDIC_TOTAL_CHAPTERS = 12;
  var VEDIC_COIN_COST = 390;

  var _chapters = [];
  var _canonicalChapters = [];
  var _resultPayload = null;
  var _generating = false;
  var _progressTimer = null;
  var _premiumAccessVerifiedUntil = 0;
  var _premiumPaidUntil = 0;

  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }

  function _logFlow(code, meta) {
    try { console.info('[VedicBook][Flow] ' + code, meta || {}); } catch (_) {}
  }

  function _logError(error, meta) {
    try {
      console.error('[VedicBook][Error]', {
        message: String(error && error.message ? error.message : error || 'unknown'),
        code: String(error && error.code ? error.code : ''),
        stage: meta && meta.stage ? String(meta.stage) : '',
      });
    } catch (_) {}
  }

  function _sanitizeText(value) {
    return String(value || '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|llm|api|debug)\b/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
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

  function _markPremiumAccessVerified(ttlMs) {
    var ttl = Number(ttlMs || 0);
    if (!Number.isFinite(ttl) || ttl <= 0) ttl = 25 * 60 * 1000;
    var until = Date.now() + ttl;
    if (until > _premiumAccessVerifiedUntil) _premiumAccessVerifiedUntil = until;
    if (until > _premiumPaidUntil) _premiumPaidUntil = until;
  }

  function _hasPremiumAccessForGeneration() {
    if (Date.now() < _premiumAccessVerifiedUntil) return true;
    if (_premiumTokenMatches() || Date.now() < _premiumPaidUntil) {
      _markPremiumAccessVerified(25 * 60 * 1000);
      return true;
    }
    return false;
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
      return {
        name: (nameEl && nameEl.value && nameEl.value.trim()) || '사용자',
        gender: femaleEl && femaleEl.checked ? 'F' : 'M',
        birth: { year: year, month: month, day: day, hour: hourEl ? Number(hourEl.value || 12) : 12, minute: minuteEl ? Number(minuteEl.value || 0) : 0 },
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

  function _getActiveBirthProfile() {
    var profile = window.__cdActiveBirthProfile;
    if (profile && profile.birth && profile.birth.year) return profile;
    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    var fromDom = _recoverBirthFromDOM();
    if (fromDom) return fromDom;
    try {
      var namespace = 'FORTUNE_APP_USER_PROFILES';
      var list = JSON.parse(localStorage.getItem(namespace + '.list') || '[]');
      var currentId = localStorage.getItem(namespace + '.current');
      var match = (currentId && list.find(function (item) { return item.id === currentId; })) || list[0];
      if (match && match.birth && match.birth.year) return match;
    } catch (_) {}
    return null;
  }

  function _formatBirth(profile) {
    var birth = (profile && profile.birth) || {};
    var year = Number(birth.year || 0);
    var month = Number(birth.month || 0);
    var day = Number(birth.day || 0);
    return {
      birthDate: [String(year).padStart(4, '0'), String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-'),
      birthTime: [String(Number(birth.hour || 12)).padStart(2, '0'), String(Number(birth.minute || 0)).padStart(2, '0')].join(':'),
    };
  }

  function _buildVedicChartRequest(profile) {
    var birth = (profile && profile.birth) || {};
    var location = (profile && profile.location) || {};
    return {
      year: Number(birth.year),
      month: Number(birth.month),
      day: Number(birth.day),
      hour: Number(birth.hour || 12),
      minute: Number(birth.minute || 0),
      timezone: Number(location.tzOffset || location.timezone || 9),
      lat: Number(location.lat || 37.5665),
      lon: Number(location.lon || location.lng || 126.9780),
    };
  }

  function _fetchVedicChart(profile) {
    var endpoints = _buildApiCandidates(VEDIC_PLANETS_API);
    var body = _buildVedicChartRequest(profile);
    var endpointIndex = 0;
    function run(resolve, reject, lastErr) {
      if (endpointIndex >= endpoints.length) {
        reject(new Error(lastErr || '베다점 계산 API 호출에 실패했습니다.'));
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
          run(resolve, reject, (pack.json && (pack.json.message || pack.json.error || pack.json.code)) || ('HTTP ' + pack.res.status));
        })
        .catch(function (error) { run(resolve, reject, String(error && error.message || error || '요청 실패')); });
    }
    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _buildVedicBase(profile, chart) {
    var birthFmt = _formatBirth(profile);
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
        planets: (chart && chart.planets) || {},
        retrograde: (chart && chart.retrograde) || {},
        ayanamsa: chart && chart.ayanamsa,
        ascendantSidereal: chart && chart.ascendantSidereal,
        source: _clean(chart && chart.source) || 'worker-vedic-planets',
      },
    };
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
    if (element) element.textContent = _sanitizeText(message) || '생성 중 오류가 발생했습니다.';
    _showScreen('vdErrorScreen');
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
    var time = [String(Number(birth.hour || 12)).padStart(2, '0'), String(Number(birth.minute || 0)).padStart(2, '0')].join(':');
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
    if (number) number.textContent = 'Chapter ' + step;
    if (chapter) chapter.textContent = _sanitizeText(title || '베다점 챕터를 생성하는 중입니다');
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
    var titles = _canonicalChapters.length ? _canonicalChapters.map(function (chapter) { return chapter.title; }) : [
      '라그나의 첫 빛을 계산하는 중입니다',
      '달의 별자리와 나크샤트라를 정리하는 중입니다',
      '행성들이 머무는 하우스의 의미를 해석하는 중입니다',
      '다르마와 카르마의 흐름을 12챕터로 엮는 중입니다',
      '베다점 프리미엄 PDF를 아름답게 완성하는 중입니다',
    ];
    var index = 1;
    _setLoadingProgress(1, VEDIC_TOTAL_CHAPTERS, titles[0]);
    _progressTimer = setInterval(function () {
      if (!_generating) { _stopProgressAnimation(); return; }
      index += 1;
      if (index > VEDIC_TOTAL_CHAPTERS) index = VEDIC_TOTAL_CHAPTERS;
      _setLoadingProgress(index, VEDIC_TOTAL_CHAPTERS, titles[Math.min(index - 1, titles.length - 1)]);
      if (index >= VEDIC_TOTAL_CHAPTERS) _stopProgressAnimation();
    }, 850);
  }

  function _renderResult(chapters, payload) {
    var toc = _qs('vdToc');
    var content = _qs('vdChapterContent');
    var name = _qs('vdResultName');
    var date = _qs('vdResultDate');
    if (toc) toc.innerHTML = '';
    if (content) content.innerHTML = '';
    if (name) name.textContent = '🪷 ' + _sanitizeText(payload && payload.user && payload.user.name || '사용자') + '님의 베다점 리포트';
    if (date) date.textContent = _sanitizeText(payload && payload.user && payload.user.birthDate || '');
    chapters.forEach(function (chapter, index) {
      if (toc) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'lb-toc-item loaded';
        button.textContent = chapter.roman + '. ' + _sanitizeText(chapter.title);
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
        var html = '<h4 class="lb-chapter-title">' + chapter.roman + '. ' + _sanitizeText(chapter.title) + '</h4>';
        var categories = Array.isArray(chapter.categories) ? chapter.categories : [];
        for (var categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
          var category = categories[categoryIndex] || {};
          html += '<article class="lb-sub-card"><h5 class="lb-sub-title">' + _sanitizeText(category.title || ('세부 카테고리 ' + (categoryIndex + 1))) + '</h5><p class="lb-sub-body">' + _sanitizeText(category.text || category.localSummary || '') + '</p></article>';
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
      if (endpointIndex >= endpoints.length) { reject(new Error(lastErr || '베다점 프리미엄 API 호출에 실패했습니다.')); return; }
      var url = endpoints[endpointIndex++];
      var headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;
      fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), credentials: 'include', cache: 'no-store' })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (json) { return { res: res, json: json }; }); })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok) { _persistPremiumAccessToken(_extractPremiumToken(pack.json)); resolve(pack.json); return; }
          run(resolve, reject, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status));
        })
        .catch(function (error) { run(resolve, reject, String(error && error.message || error || '요청 실패')); });
    }
    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _ensurePremiumPaymentThenStart() {
    if (_hasPremiumAccessForGeneration()) return true;
    if (typeof window._cdCoinGatePerUse !== 'function') {
      alert('결제 모듈을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
      return false;
    }
    _logFlow('BILLING_CHECK_START', { featureKey: VEDIC_FEATURE_KEY });
    window._cdCoinGatePerUse(VEDIC_COIN_COST, '베다 점성술 프리미엄 PDF 리포트 생성', function (_transactionId, data) {
      _persistPremiumAccessToken(_extractPremiumToken(data));
      _markPremiumAccessVerified(25 * 60 * 1000);
      _logFlow('BILLING_CHECK_OK', { featureKey: VEDIC_FEATURE_KEY });
      window.generateVedicBook();
    }, null, {
      featureKey: VEDIC_FEATURE_KEY,
      requestId: 'vedic-premium-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    });
    return false;
  }

  window.openVedicBookModal = function () {
    _logFlow('CARD_CLICK');
    var modal = _qs('vedicBookModal');
    if (!modal) return;
    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth || !profile.birth.year) {
      try {
        var _dpNs = 'FORTUNE_APP_USER_PROFILES';
        var _dpList = JSON.parse(localStorage.getItem(_dpNs + '.list') || '[]');
        var _dpCurrId = localStorage.getItem(_dpNs + '.current');
        var _dpMatch = (_dpCurrId && _dpList.find(function (item) { return item.id === _dpCurrId; })) || _dpList[0] || null;
        if (_dpMatch && _dpMatch.birth && _dpMatch.birth.year) {
          window.__cdActiveBirthProfile = _dpMatch;
          profile = _dpMatch;
        }
      } catch (_dpE) {}
    }

    if (profile && profile.birth && profile.birth.year) {
      window.__cdActiveBirthProfile = profile;
      _renderProfileSummary(profile);
      _showScreen('vdStartScreen');
    } else {
      _showScreen('vdNoProfileScreen');
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
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
    _logFlow('CARD_VISIBLE_CHECK', { card: 'gotoVedicPremium' });
    window.openVedicBookModal();
  };

  window.generateVedicBook = function () {
    if (_generating) return;
    if (!_hasPremiumAccessForGeneration()) {
      if (!_ensurePremiumPaymentThenStart()) return;
      return;
    }
    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth) { _showScreen('vdNoProfileScreen'); return; }
    _generating = true;
    _setStartBusy(true);
    _showScreen('vdLoadingScreen');
    _setLoadingProgress(1, VEDIC_TOTAL_CHAPTERS, '라그나의 첫 빛을 계산하는 중입니다');
    _startProgressAnimation();
    _logFlow('VEDIC_SEED_START');
    _fetchVedicChart(profile)
      .then(function (chart) {
        var vedicBase = _buildVedicBase(profile, chart);
        _setLoadingProgress(2, VEDIC_TOTAL_CHAPTERS, '달의 별자리와 나크샤트라를 정리하는 중입니다');
        _logFlow('PDF_API_START', { featureKey: VEDIC_FEATURE_KEY });
        return _postPrepare({ featureKey: VEDIC_FEATURE_KEY, premiumAccessToken: _readPremiumAccessToken() || undefined, vedicBase: vedicBase }).then(function (data) {
          return { data: data, vedicBase: vedicBase };
        });
      })
      .then(function (pack) {
        var response = (pack && pack.data) || {};
        var vedicBase = (pack && pack.vedicBase) || null;
        _markPremiumAccessVerified(25 * 60 * 1000);
        _resultPayload = response;
        _chapters = Array.isArray(response.chapters) ? response.chapters : [];
        if (!_chapters.length) throw new Error('베다점 챕터 데이터가 비어 있습니다.');
        _setLoadingProgress(VEDIC_TOTAL_CHAPTERS, VEDIC_TOTAL_CHAPTERS, '베다점 프리미엄 PDF를 아름답게 완성하는 중입니다');
        _renderResult(_chapters, response.payload || vedicBase);
        _logFlow('PDF_API_OK', { chapterCount: _chapters.length, fallbackUsed: !!response.fallbackUsed });
        _showScreen('vdResultScreen');
      })
      .catch(function (error) {
        _logError(error, { stage: 'generate' });
        _setError(String(error && error.message ? error.message : error || '생성 실패'));
      })
      .finally(function () {
        _generating = false;
        _setStartBusy(false);
        _stopProgressAnimation();
      });
  };

  window.downloadVedicBookPdf = function () {
    if (!_chapters || !_chapters.length || !_resultPayload || !_resultPayload.pdfReady || !_resultPayload.pdfReady.html) {
      alert('리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }
    var html = String(_resultPayload.pdfReady.html || '');
    if (!html) { alert('PDF 본문을 생성하지 못했습니다. 다시 시도해 주세요.'); return; }
    var popup = window.open('', '_blank', 'width=980,height=760');
    if (!popup) { alert('팝업이 차단되어 출력 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.'); return; }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    setTimeout(function () { try { popup.print(); } catch (_) {} }, 900);
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
