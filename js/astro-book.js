/**
 * Premium Astrology PDF (Cosmic Chart)
 * Local chart-first pipeline + worker premium prepare endpoint.
 */
(function () {
  'use strict';

  var ASTRO_FEATURE_KEY = 'premium-astrology-report';
  var ASTRO_BILLING_FEATURE_KEY = 'premium-astrology-report';
  var ASTRO_PREPARE_API = '/api/astro/premium/prepare';
  var ASTRO_CHAPTERS_API = '/api/astro/premium/chapters';
  var ASTRO_TOTAL_CHAPTERS = 12;
  var ASTRO_COIN_COST = 390;

  var _chapters = [];
  var _canonicalChapters = [];
  var _resultPayload = null;
  var _generating = false;
  var _progressTimer = null;
  var _premiumAccessVerifiedUntil = 0;
  var _premiumPaidUntil = 0;

  function _qs(id) { return document.getElementById(id); }

  function _clean(v) { return String(v || '').trim(); }

  function _sanitizeText(v) {
    return String(v || '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|llm|api)\b/gi, '')
      .replace(/chapter\s*1/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function _readPremiumAccessToken() {
    var t = '';
    try { t = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { t = ''; }
    if (!t) { try { t = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { t = ''; } }
    if (!t) { try { t = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { t = ''; } }
    return t;
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

  function _recoverBirthFromDOM() {
    try {
      var birthDateEl = document.getElementById('birthDate');
      var hourEl = document.getElementById('birthHour');
      var minEl = document.getElementById('birthMinute');
      var nameEl = document.getElementById('nameInput');
      var femaleEl = document.getElementById('genderFemale');
      var countryEl = document.getElementById('birthCountry');
      if (!birthDateEl || !birthDateEl.value) return null;
      var p = birthDateEl.value.split('-');
      var y = Number(p[0]);
      var m = Number(p[1]);
      var d = Number(p[2]);
      if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
      var isFemale = !!(femaleEl && femaleEl.checked);
      var opt = countryEl && countryEl.options ? countryEl.options[countryEl.selectedIndex] : null;
      var locationData = {
        label: opt ? (opt.textContent || '대한민국 (서울)') : '대한민국 (서울)',
        lat: parseFloat(opt && opt.getAttribute('data-lat') || '37.5665'),
        lon: parseFloat(opt && opt.getAttribute('data-lon') || '126.9780'),
        tzOffset: parseFloat(opt && opt.getAttribute('data-tz') || '9'),
        tz: (opt && opt.value) || 'Asia/Seoul',
      };
      return {
        name: (nameEl && nameEl.value && nameEl.value.trim()) || '사용자',
        gender: isFemale ? 'F' : 'M',
        birth: {
          year: y,
          month: m,
          day: d,
          hour: hourEl ? Number(hourEl.value || 12) : 12,
          minute: minEl ? Number(minEl.value || 0) : 0,
        },
        location: locationData,
      };
    } catch (_) {
      return null;
    }
  }

  function _getActiveBirthProfile() {
    var p = window.__cdActiveBirthProfile;
    if (p && p.birth && p.birth.year) return p;
    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    var fromDom = _recoverBirthFromDOM();
    if (fromDom) return fromDom;
    try {
      var ns = 'FORTUNE_APP_USER_PROFILES';
      var list = JSON.parse(localStorage.getItem(ns + '.list') || '[]');
      var currId = localStorage.getItem(ns + '.current');
      var match = (currId && list.find(function (it) { return it.id === currId; })) || list[0];
      if (match && match.birth && match.birth.year) return match;
    } catch (_) {}
    return null;
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
    var el = _qs('abErrorMsg');
    if (el) el.textContent = _sanitizeText(msg) || '생성 중 오류가 발생했습니다.';
    _showScreen('abErrorScreen');
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
    return {
      birthDate: [String(y).padStart(4, '0'), String(m).padStart(2, '0'), String(d).padStart(2, '0')].join('-'),
      birthTime: [String(Number(birth.hour || 12)).padStart(2, '0'), String(Number(birth.minute || 0)).padStart(2, '0')].join(':'),
    };
  }

  function _buildChartFromLocal(profile) {
    if (typeof window.calcAstroSwissChartOrThrow !== 'function') return null;
    try {
      var birth = profile.birth || {};
      var location = profile.location || {};
      var localHour = Number(birth.hour || 12) + Number(birth.minute || 0) / 60;
      var lat = Number(location.lat || 37.5665);
      var lon = Number(location.lon || 126.9780);
      var tz = Number(location.tzOffset || 9);
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
      var signNode = p.sign || {};
      planets.push({
        name: k,
        sign: _clean(signNode.sign || signNode.name),
        degree: Number(signNode.deg),
        house: Number(p.house || 0) || undefined,
        retrograde: Boolean(p.retro),
      });
    }
    return planets;
  }

  function _buildHouses(chart) {
    var houses = [];
    var h = (chart && chart.houses) ? chart.houses : {};
    for (var i = 1; i <= 12; i++) {
      var node = h['h' + i] || {};
      houses.push({
        house: i,
        sign: _clean(node.sign || node.name),
        degree: Number(node.deg),
      });
    }
    return houses;
  }

  function _buildAspects(chart) {
    var aspects = [];
    var arr = (chart && chart.natal && Array.isArray(chart.natal.aspects)) ? chart.natal.aspects : [];
    for (var i = 0; i < arr.length; i++) {
      var a = arr[i] || {};
      aspects.push({
        planetA: _clean(a.a || a.planetA),
        planetB: _clean(a.b || a.planetB),
        type: _clean(a.type || a.aspect),
        orb: Number(a.orb),
        strength: _clean(a.strength),
      });
    }
    return aspects;
  }

  function _buildAstroBase(profile) {
    var birthFmt = _formatBirth(profile);
    var chart = _buildChartFromLocal(profile);
    if (!chart) return null;

    var sunSign = _clean(chart.sun && chart.sun.sign);
    var moonSign = _clean(chart.moon && chart.moon.sign);
    var asc = _clean(chart.asc && chart.asc.sign);
    var mc = _clean(chart.mc && chart.mc.sign);

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

  function _renderProfileSummary(profile) {
    var el = _qs('abProfileSummary');
    if (!el) return;
    if (!profile) {
      el.textContent = '생년월일 정보를 찾을 수 없습니다. 먼저 기본 점성술 계산을 완료해 주세요.';
      return;
    }
    var birth = profile.birth || {};
    var place = (profile.location && profile.location.label) || '대한민국 (서울)';
    var time = [String(Number(birth.hour || 12)).padStart(2, '0'), String(Number(birth.minute || 0)).padStart(2, '0')].join(':');
    el.textContent = [
      (profile.name || '사용자') + ' · ' + (profile.gender === 'F' ? '여성' : profile.gender === 'M' ? '남성' : ''),
      [birth.year, birth.month, birth.day].filter(Boolean).join('년 ') + '일 ' + time,
      place,
    ].join(' · ');
  }

  function _setLoadingProgress(step, total, title) {
    var pct = Math.max(0, Math.min(100, Math.round((step / Math.max(total, 1)) * 100)));
    var bar = _qs('abProgressBar');
    var txt = _qs('abProgressText');
    var num = _qs('abLoadingChapterNum');
    var ch = _qs('abLoadingChapter');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = step + ' / ' + total + ' 챕터 완성';
    if (num) num.textContent = 'Chapter ' + step;
    if (ch) ch.textContent = _sanitizeText(title || '점성술 챕터를 생성하는 중...');

    var dots = document.querySelectorAll('.ab-ch-dot');
    Array.prototype.forEach.call(dots, function (dot) {
      var n = Number(dot.getAttribute('data-abch'));
      dot.classList.toggle('lb-ch-dot--active', n === step);
      dot.classList.toggle('lb-ch-dot--done', n < step);
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
    var titles = _canonicalChapters.length
      ? _canonicalChapters.map(function (c) { return c.title; })
      : [];
    if (!titles.length) {
      titles = [
        '출생 차트 총론을 분석하는 중...',
        '태양·달·상승궁을 정밀 해석하는 중...',
        '행성/하우스 패턴을 정리하는 중...',
        '관계·일·재정 전략을 설계하는 중...',
        '최종 우주 로드맵을 완성하는 중...',
      ];
    }
    var idx = 1;
    _setLoadingProgress(1, ASTRO_TOTAL_CHAPTERS, titles[0]);
    _progressTimer = setInterval(function () {
      if (!_generating) {
        _stopProgressAnimation();
        return;
      }
      idx += 1;
      if (idx > ASTRO_TOTAL_CHAPTERS) idx = ASTRO_TOTAL_CHAPTERS;
      _setLoadingProgress(idx, ASTRO_TOTAL_CHAPTERS, titles[Math.min(idx - 1, titles.length - 1)]);
      if (idx >= ASTRO_TOTAL_CHAPTERS) _stopProgressAnimation();
    }, 850);
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
            + '<p class="lb-sub-body">' + _sanitizeText(c.text || c.localSummary || '') + '</p>'
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
        reject(new Error(lastErr || '점성술 프리미엄 API 호출에 실패했습니다.'));
        return;
      }
      var url = endpoints[idx++];
      var headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;

      fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
      })
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
          run(resolve, reject, (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status));
        })
        .catch(function (err) {
          run(resolve, reject, String(err && err.message || err || '요청 실패'));
        });
    }

    return new Promise(function (resolve, reject) { run(resolve, reject, ''); });
  }

  function _ensurePremiumPaymentThenStart() {
    if (_hasPremiumAccessForGeneration()) return true;
    if (typeof window._cdCoinGatePerUse !== 'function') {
      alert('결제 모듈을 찾을 수 없습니다. 페이지를 새로고침 후 다시 시도해 주세요.');
      return false;
    }
    window._cdCoinGatePerUse(ASTRO_COIN_COST, '프리미엄 점성술 PDF 생성', function () {
      _markPremiumAccessVerified(25 * 60 * 1000);
      window.generateAstroBook();
    }, null, {
      featureKey: ASTRO_BILLING_FEATURE_KEY,
      requestId: 'astro-premium-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    });
    return false;
  }

  window.openAstroBookModal = function () {
    var modal = _qs('astroBookModal');
    if (!modal) return;

    var profile = _getActiveBirthProfile();
    if (profile && profile.birth) {
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
    window.openAstroBookModal();
  };

  window.generateAstroBook = function () {
    if (_generating) return;

    if (!_hasPremiumAccessForGeneration()) {
      if (!_ensurePremiumPaymentThenStart()) return;
      return;
    }

    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth) {
      _showScreen('abNoProfileScreen');
      return;
    }

    var astroBase = _buildAstroBase(profile);
    if (!astroBase || !astroBase.chart || !astroBase.chart.sunSign || !astroBase.chart.moonSign || !astroBase.chart.ascendant) {
      _setError('점성술 차트 계산 정보를 찾을 수 없습니다. 기본 점성술 분석을 먼저 완료해 주세요.');
      return;
    }

    _generating = true;
    _showScreen('abLoadingScreen');
    _startProgressAnimation();

    _postPrepare({
      featureKey: ASTRO_FEATURE_KEY,
      premiumAccessToken: _readPremiumAccessToken() || undefined,
      astroBase: astroBase,
    })
      .then(function (data) {
        _markPremiumAccessVerified(25 * 60 * 1000);
        _resultPayload = data;
        _chapters = Array.isArray(data.chapters) ? data.chapters : [];
        if (!_chapters.length) throw new Error('점성술 챕터 데이터가 비어 있습니다.');
        _setLoadingProgress(ASTRO_TOTAL_CHAPTERS, ASTRO_TOTAL_CHAPTERS, '최종 리포트를 완성하는 중...');
        _renderResult(_chapters, data.payload || astroBase);
        _showScreen('abResultScreen');
      })
      .catch(function (err) {
        _setError(String(err && err.message ? err.message : err || '생성 실패'));
      })
      .finally(function () {
        _generating = false;
        _stopProgressAnimation();
      });
  };

  window.downloadAstroBookPdf = function () {
    if (!_chapters || !_chapters.length || !_resultPayload || !_resultPayload.pdfReady || !_resultPayload.pdfReady.html) {
      alert('리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }

    var html = String(_resultPayload.pdfReady.html || '');
    if (!html) {
      alert('PDF 본문을 생성하지 못했습니다. 다시 시도해 주세요.');
      return;
    }

    var win = window.open('', '_blank', 'width=980,height=760');
    if (!win) {
      alert('팝업이 차단되어 출력 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function () {
      try { win.print(); } catch (_) {}
    }, 900);
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
