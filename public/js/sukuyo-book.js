/**
 * Sukyo Premium Compatibility PDF
 * Worker engine-first pipeline + premium access gate.
 */
(function () {
  'use strict';

  var SUKYO_FEATURE_KEY = 'premium-sukuyo-report-compat';
  var SUKYO_ALIAS_FEATURE_KEY = 'premium_pdf_sukyo_compat';
  var SUKYO_PREPARE_API = '/api/sukuyo/premium/prepare';
  var SUKYO_CHAPTERS_API = '/api/sukuyo/premium/chapters';
  var SUKYO_TOTAL_CHAPTERS = 15;
  var SUKYO_COIN_COST = 490;

  var _chapters = [];
  var _canonicalChapters = [];
  var _resultPayload = null;
  var _generating = false;
  var _progressTimer = null;
  var _premiumAccessVerifiedUntil = 0;
  var _premiumPaidUntil = 0;
  var _partnerGender = 'F';

  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }
  function _num(value, fallback) { var n = Number(value); return Number.isFinite(n) ? n : fallback; }

  function _logFlow(code, meta) {
    try { console.info('[SukyoBook][Flow] ' + code, meta || {}); } catch (_) {}
  }

  function _logError(error, meta) {
    try {
      console.error('[SukyoBook][Error]', {
        message: String(error && error.message ? error.message : error || 'unknown'),
        code: String(error && error.code ? error.code : ''),
        stage: meta && meta.stage ? String(meta.stage) : '',
      });
    } catch (_) {}
  }

  function _sanitizeText(value) {
    return String(value || '')
      .replace(/\b(undefined|null|nan)\b/gi, '')
      .replace(/\b(payload|json|localdraft|fallback|llm|api|debug|engine)\b/gi, '')
      .replace(/자동\s*복구\s*생성/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
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

  function _premiumTokenMatches() {
    var token = _readPremiumAccessToken();
    if (!token || typeof atob !== 'function') return false;
    try {
      var middle = token.split('.')[1] || '';
      var payload = JSON.parse(atob(middle.replace(/-/g, '+').replace(/_/g, '/')));
      var actual = _clean(payload && payload.reportType).toLowerCase().replace(/[^a-z0-9]/g, '');
      var featureKey = _clean(payload && payload.featureKey);
      var aliases = ['sookyopremium', 'sukyopremium', 'sukuyo', 'premiumshukuyo'];
      var exp = Number(payload && payload.exp);
      return (aliases.indexOf(actual) >= 0 || featureKey === SUKYO_FEATURE_KEY || featureKey === SUKYO_ALIAS_FEATURE_KEY)
        && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000);
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
    var bases = ['', window.__CD_API_BASE_URL || '', window.__API_BASE_URL || '', window.__AUTH_API_BASE_URL || '', window.location && window.location.origin || ''];
    var seen = {};
    var out = [];
    bases.forEach(function (base) {
      var cleanBase = String(base || '').trim();
      var url = cleanBase ? cleanBase.replace(/\/+$/, '') + path : path;
      if (!seen[url]) { seen[url] = true; out.push(url); }
    });
    return out;
  }

  function _recoverBirthFromDOM() {
    try {
      var birthDateEl = _qs('birthDate');
      var hourEl = _qs('birthHour');
      var minuteEl = _qs('birthMinute');
      var nameEl = _qs('nameInput');
      var femaleEl = _qs('genderFemale');
      if (!birthDateEl || !birthDateEl.value) return null;
      var parts = birthDateEl.value.split('-');
      var year = _num(parts[0], NaN);
      var month = _num(parts[1], NaN);
      var day = _num(parts[2], NaN);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      return {
        name: _clean(nameEl && nameEl.value) || '사용자',
        gender: femaleEl && femaleEl.checked ? 'F' : 'M',
        birth: { year: year, month: month, day: day, hour: hourEl ? _num(hourEl.value, 12) : 12, minute: minuteEl ? _num(minuteEl.value, 0) : 0 },
        calendarType: 'solar',
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

  function _formatProfile(profile) {
    var birth = profile && profile.birth || {};
    var date = [String(_num(birth.year, 0)).padStart(4, '0'), String(_num(birth.month, 0)).padStart(2, '0'), String(_num(birth.day, 0)).padStart(2, '0')].join('-');
    var time = [String(_num(birth.hour, 12)).padStart(2, '0'), String(_num(birth.minute, 0)).padStart(2, '0')].join(':');
    return {
      name: _clean(profile && profile.name) || '사용자',
      gender: _clean(profile && profile.gender),
      birthDate: date,
      birthTime: time,
      calendarType: _clean(profile && profile.calendarType) || 'solar',
    };
  }

  function _getSelectedPartnerCalendarType() {
    var selected = document.querySelector('input[name="skPartnerCalType"]:checked');
    return selected ? selected.value : 'solar';
  }

  function _getPartnerProfile() {
    var dateEl = _qs('skPartnerBirthDate');
    var hourEl = _qs('skPartnerHour');
    var minuteEl = _qs('skPartnerMinute');
    var nameEl = _qs('skPartnerName');
    var birthDate = _clean(dateEl && dateEl.value);
    if (!birthDate) return null;
    var hour = _clean(hourEl && hourEl.value);
    var minute = _clean(minuteEl && minuteEl.value);
    return {
      name: _clean(nameEl && nameEl.value) || '상대방',
      gender: _partnerGender,
      birthDate: birthDate,
      birthTime: hour ? String(_num(hour, 12)).padStart(2, '0') + ':' + String(_num(minute, 0)).padStart(2, '0') : '',
      calendarType: _getSelectedPartnerCalendarType(),
    };
  }

  function _populateTimeSelects() {
    var hourEl = _qs('skPartnerHour');
    var minuteEl = _qs('skPartnerMinute');
    if (hourEl && hourEl.options.length <= 1) {
      for (var h = 0; h < 24; h += 1) {
        var opt = document.createElement('option');
        opt.value = String(h);
        opt.textContent = String(h).padStart(2, '0') + '시';
        hourEl.appendChild(opt);
      }
    }
    if (minuteEl && minuteEl.options.length <= 1) {
      [0, 10, 20, 30, 40, 50].forEach(function (m) {
        var opt = document.createElement('option');
        opt.value = String(m);
        opt.textContent = String(m).padStart(2, '0') + '분';
        minuteEl.appendChild(opt);
      });
    }
  }

  function _forceCompatibilityMode() {
    var personalBtn = _qs('skModePersonalBtn');
    var compatBtn = _qs('skModeCompatBtn');
    if (personalBtn) personalBtn.classList.remove('on');
    if (compatBtn) compatBtn.classList.add('on');
    var section = _qs('skPartnerFormSection');
    if (section) section.style.display = '';
    var hint = _qs('skModeHint');
    if (hint) hint.textContent = '숙요점 프리미엄 PDF는 본인과 상대방 정보를 함께 사용해 궁합 리포트로 생성됩니다.';
    var startDesc = _qs('skStartDesc');
    if (startDesc) startDesc.innerHTML = '본인과 상대방의 본명숙, 관계 타입, 거리감을 바탕으로 <strong>15챕터 궁합 PDF</strong>를 생성합니다.';
    var startBtn = _qs('skStartBtn');
    if (startBtn) startBtn.textContent = '숙요점 궁합 PDF 생성하기';
    var label = _qs('skChapterLabel');
    if (label) label.textContent = '📖 15챕터 구성';
  }

  function _renderChapterList(chapters) {
    var list = _qs('skChapterList');
    if (!list) return;
    var source = Array.isArray(chapters) && chapters.length ? chapters : _canonicalChapters;
    if (!source.length) return;
    list.innerHTML = '';
    source.forEach(function (chapter) {
      var li = document.createElement('li');
      li.className = 'lb-start__ch-item';
      var num = document.createElement('span');
      num.className = 'lb-start__ch-num';
      num.textContent = String(chapter.order || chapter.num || '');
      var title = document.createElement('span');
      title.textContent = _sanitizeText(chapter.title || '');
      li.appendChild(num);
      li.appendChild(title);
      list.appendChild(li);
    });
  }

  function _renderDots(chapters) {
    var grid = _qs('skChapterDotGrid');
    if (!grid) return;
    var source = Array.isArray(chapters) && chapters.length ? chapters : _canonicalChapters;
    if (!source.length) return;
    grid.innerHTML = '';
    source.forEach(function (chapter, index) {
      var dot = document.createElement('span');
      dot.className = 'lb-ch-dot sk-ch-dot' + (index === 0 ? ' lb-ch-dot--active' : '');
      dot.setAttribute('data-skch', String(index + 1));
      dot.title = _sanitizeText(chapter.title || '');
      dot.textContent = String(index + 1);
      grid.appendChild(dot);
    });
  }

  function _showScreen(screenId) {
    ['skNoProfileScreen', 'skStartScreen', 'skLoadingScreen', 'skResultScreen', 'skErrorScreen'].forEach(function (id) {
      var element = _qs(id);
      if (element) element.style.display = id === screenId ? '' : 'none';
    });
  }

  function _setError(message) {
    var element = _qs('skErrorMsg');
    if (element) element.textContent = _sanitizeText(message) || 'PDF 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    _showScreen('skErrorScreen');
  }

  function _setStartBusy(isBusy) {
    var button = _qs('skStartBtn');
    if (!button) return;
    button.disabled = !!isBusy;
    button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
  }

  function _renderProfileSummary(profile) {
    var element = _qs('skProfileSummary');
    if (!element) return;
    if (!profile) {
      element.textContent = '생년월일 정보를 찾을 수 없습니다. 먼저 나의 운명 카드를 설정해 주세요.';
      return;
    }
    var birth = profile.birth || {};
    var time = [String(_num(birth.hour, 12)).padStart(2, '0'), String(_num(birth.minute, 0)).padStart(2, '0')].join(':');
    element.textContent = [(_clean(profile.name) || '사용자'), [birth.year, birth.month, birth.day].filter(Boolean).join('-') + ' ' + time, _clean(profile.gender)].filter(Boolean).join(' · ');
  }

  function _setLoadingProgress(step, total, title) {
    var pct = Math.max(0, Math.min(100, Math.round((step / Math.max(total, 1)) * 100)));
    var bar = _qs('skProgressBar');
    var text = _qs('skProgressText');
    var number = _qs('skLoadingChapterNum');
    var chapter = _qs('skLoadingChapter');
    if (bar) bar.style.width = pct + '%';
    if (text) text.textContent = step + ' / ' + total + ' 챕터 완성';
    if (number) number.textContent = 'Chapter ' + step;
    if (chapter) chapter.textContent = _sanitizeText(title || '숙요점 챕터를 생성하는 중입니다');
    Array.prototype.forEach.call(document.querySelectorAll('.sk-ch-dot'), function (dot) {
      var dotNo = Number(dot.getAttribute('data-skch'));
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
    var defaults = [
      '두 사람의 달별을 찾는 중입니다',
      '본명숙과 상대방 숙의 관계를 계산하는 중입니다',
      '인연의 거리와 관계 타입을 정리하는 중입니다',
      '전생 인연과 연애 궁합을 15챕터로 엮는 중입니다',
      '숙요점 프리미엄 궁합 PDF를 완성하는 중입니다',
    ];
    var titles = _canonicalChapters.length ? _canonicalChapters.map(function (chapter) { return chapter.title; }) : defaults;
    var index = 1;
    _setLoadingProgress(1, SUKYO_TOTAL_CHAPTERS, defaults[0]);
    _progressTimer = setInterval(function () {
      if (!_generating) { _stopProgressAnimation(); return; }
      index += 1;
      if (index > SUKYO_TOTAL_CHAPTERS) index = SUKYO_TOTAL_CHAPTERS;
      _setLoadingProgress(index, SUKYO_TOTAL_CHAPTERS, titles[Math.min(index - 1, titles.length - 1)] || defaults[defaults.length - 1]);
      if (index >= SUKYO_TOTAL_CHAPTERS) _stopProgressAnimation();
    }, 850);
  }

  function _fetchCanonicalChapters() {
    var endpoints = _buildApiCandidates(SUKYO_CHAPTERS_API);
    var endpointIndex = 0;
    function next(resolve) {
      if (endpointIndex >= endpoints.length) return resolve([]);
      fetch(endpoints[endpointIndex++], { cache: 'no-store', credentials: 'include' })
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
    var endpoints = _buildApiCandidates(SUKYO_PREPARE_API);
    var endpointIndex = 0;
    var authToken = '';
    try { authToken = localStorage.getItem('fortune_auth_token') || ''; } catch (_) { authToken = ''; }
    var premiumToken = _readPremiumAccessToken();
    function run(resolve, reject, lastErr) {
      if (endpointIndex >= endpoints.length) { reject(new Error(lastErr || '숙요점 프리미엄 API 호출에 실패했습니다.')); return; }
      var url = endpoints[endpointIndex++];
      var headers = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = 'Bearer ' + authToken;
      if (premiumToken) headers['x-premium-access-token'] = premiumToken;
      _logFlow('PDF_RENDER_START', { featureKey: SUKYO_FEATURE_KEY });
      fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), credentials: 'include', cache: 'no-store' })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (json) { return { res: res, json: json }; }); })
        .then(function (pack) {
          if (pack.res.ok && pack.json && pack.json.ok) { _persistPremiumAccessToken(_extractPremiumToken(pack.json)); resolve(pack.json); return; }
          var msg = (pack.json && (pack.json.message || pack.json.code)) || ('HTTP ' + pack.res.status);
          if (pack.res.status === 401) { reject(new Error('숙요점 PDF 생성을 위해 먼저 로그인해 주세요.')); return; }
          if (pack.res.status === 402 || pack.res.status === 403) { reject(new Error('프리미엄 궁합 PDF 생성을 위해 코인 또는 이용권 확인이 필요합니다.')); return; }
          if (pack.res.status === 400 || pack.res.status === 422) { reject(new Error(msg || '본인과 상대방의 생년월일 정보를 확인해 주세요.')); return; }
          run(resolve, reject, msg);
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
    _logFlow('BILLING_CHECK_START', { featureKey: SUKYO_FEATURE_KEY });
    window._cdCoinGatePerUse(SUKYO_COIN_COST, '숙요점 프리미엄 PDF 궁합 리포트 생성', function (_transactionId, data) {
      _persistPremiumAccessToken(_extractPremiumToken(data));
      _markPremiumAccessVerified(25 * 60 * 1000);
      _logFlow('BILLING_CHECK_OK', { featureKey: SUKYO_FEATURE_KEY });
      window.generateSukuyoBook();
    }, null, {
      featureKey: SUKYO_FEATURE_KEY,
      mode: 'compatibility',
      reportMode: 'compatibility',
      reportType: 'sookyoPremium',
      requestId: 'sukyo-premium-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    });
    return false;
  }

  function _renderResult(chapters, payload) {
    var toc = _qs('skToc');
    var content = _qs('skChapterContent');
    var name = _qs('skResultName');
    var date = _qs('skResultDate');
    var seed = payload && payload.payload || payload || {};
    if (toc) toc.innerHTML = '';
    if (content) content.innerHTML = '';
    if (name) name.textContent = '💫 ' + _sanitizeText(seed.userProfile && seed.userProfile.name || '사용자') + ' x ' + _sanitizeText(seed.partnerProfile && seed.partnerProfile.name || '상대방');
    if (date) date.textContent = [_sanitizeText(seed.userSukyo && seed.userSukyo.nameKo || ''), _sanitizeText(seed.partnerSukyo && seed.partnerSukyo.nameKo || ''), _sanitizeText(seed.compatibility && seed.compatibility.relationType || '')].filter(Boolean).join(' · ');
    chapters.forEach(function (chapter, index) {
      if (toc) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'lb-toc-item loaded';
        button.textContent = 'Chapter ' + chapter.order + '. ' + _sanitizeText(chapter.title);
        button.addEventListener('click', function () {
          var section = document.getElementById('skChapter-' + (index + 1));
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        toc.appendChild(button);
      }
      if (content) {
        var sectionEl = document.createElement('section');
        sectionEl.id = 'skChapter-' + (index + 1);
        sectionEl.className = 'lb-chapter-card';
        var html = '<h4 class="lb-chapter-title">Chapter ' + chapter.order + '. ' + _sanitizeText(chapter.title) + '</h4>';
        var sections = Array.isArray(chapter.sections) ? chapter.sections : [];
        sections.forEach(function (section) {
          html += '<article class="lb-sub-card"><h5 class="lb-sub-title">' + _sanitizeText(section.heading || '') + '</h5><p class="lb-sub-body">' + _sanitizeText(section.body || '') + '</p></article>';
        });
        sectionEl.innerHTML = html;
        content.appendChild(sectionEl);
      }
    });
  }

  function _buildRequestBody(profile, partner) {
    return {
      featureKey: SUKYO_FEATURE_KEY,
      premiumAccessToken: _readPremiumAccessToken() || undefined,
      mode: 'compatibility',
      reportMode: 'compatibility',
      reportType: 'sookyoPremium',
      user: _formatProfile(profile),
      partner: partner,
    };
  }

  window.openSukuyoBookModal = function () {
    _logFlow('CARD_CLICK');
    var modal = _qs('sukuyoBookModal');
    if (!modal) return;
    _populateTimeSelects();
    _forceCompatibilityMode();
    var profile = _getActiveBirthProfile();
    if (profile && profile.birth) {
      window.__cdActiveBirthProfile = profile;
      _renderProfileSummary(profile);
      _showScreen('skStartScreen');
    } else {
      _showScreen('skNoProfileScreen');
    }
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
    _fetchCanonicalChapters().then(function (chapters) {
      if (Array.isArray(chapters) && chapters.length) {
        _canonicalChapters = chapters;
        SUKYO_TOTAL_CHAPTERS = chapters.length;
        _renderChapterList(chapters);
        _renderDots(chapters);
      }
    }).catch(function () {});
  };

  window.closeSukuyoBookModal = function () {
    var modal = _qs('sukuyoBookModal');
    if (!modal) return;
    _stopProgressAnimation();
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.gotoSukuyoPremium = function () {
    window.openSukuyoBookModal();
  };

  window.generateSukuyoBook = function () {
    if (_generating) return;
    var profile = _getActiveBirthProfile();
    if (!profile || !profile.birth) { _showScreen('skNoProfileScreen'); return; }
    var partner = _getPartnerProfile();
    if (!partner || !partner.birthDate) {
      _setError('숙요점 궁합 PDF는 상대방 생년월일 정보가 필요합니다.');
      return;
    }
    _logFlow('INPUT_READY', { mode: 'compatibility', hasUser: true, hasPartner: true, featureKey: SUKYO_FEATURE_KEY });
    if (!_hasPremiumAccessForGeneration()) {
      if (!_ensurePremiumPaymentThenStart()) return;
      return;
    }
    _generating = true;
    _setStartBusy(true);
    _showScreen('skLoadingScreen');
    _setLoadingProgress(1, SUKYO_TOTAL_CHAPTERS, '두 사람의 달별을 찾는 중입니다');
    _startProgressAnimation();
    _logFlow('ENGINE_CALC_START');
    _postPrepare(_buildRequestBody(profile, partner))
      .then(function (response) {
        _markPremiumAccessVerified(25 * 60 * 1000);
        _resultPayload = response;
        _chapters = Array.isArray(response.chapters) ? response.chapters : [];
        if (!_chapters.length || Number(response.chapterCount) !== 15) throw new Error('15챕터 리포트 데이터가 비어 있습니다.');
        _setLoadingProgress(SUKYO_TOTAL_CHAPTERS, SUKYO_TOTAL_CHAPTERS, '숙요점 프리미엄 궁합 PDF를 완성하는 중입니다');
        _renderResult(_chapters, response);
        _logFlow('ENGINE_CALC_OK', { chapterCount: _chapters.length });
        _logFlow('PDF_SEED_READY', { chapterCount: _chapters.length });
        _logFlow('LOCAL_SKELETON_READY', { chapterCount: _chapters.length });
        _logFlow(response.fallbackUsed ? 'LLM_ENRICH_FALLBACK' : 'LLM_ENRICH_OK', { fallbackUsed: !!response.fallbackUsed });
        _logFlow('PDF_RENDER_OK', { chapterCount: _chapters.length });
        _showScreen('skResultScreen');
      })
      .catch(function (error) {
        _logError(error, { stage: 'generate' });
        _setError(String(error && error.message ? error.message : error || 'PDF 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'));
      })
      .finally(function () {
        _generating = false;
        _setStartBusy(false);
        _stopProgressAnimation();
      });
  };

  window.downloadSukuyoBookPdf = function () {
    if (!_chapters.length || !_resultPayload || !_resultPayload.pdfReady || !_resultPayload.pdfReady.html) {
      alert('리포트가 아직 준비되지 않았습니다. 먼저 생성해 주세요.');
      return;
    }
    var html = String(_resultPayload.pdfReady.html || '');
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
    if (action === 'openSukuyoBookModal') { window.openSukuyoBookModal(); return; }
    if (action === 'closeSukuyoBookModal') { window.closeSukuyoBookModal(); return; }
    if (action === 'gotoSukuyoPremium') { window.gotoSukuyoPremium(); return; }
    if (action === 'generateSukuyoBook') { window.generateSukuyoBook(); }
  });

  document.addEventListener('change', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    if (target.id === 'skPartnerHour') {
      var minuteEl = _qs('skPartnerMinute');
      if (minuteEl && _clean(target.value) && !_clean(minuteEl.value)) minuteEl.value = '0';
    }
  });

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;
    if (target.id === 'skPartnerGenderF' || target.closest('#skPartnerGenderF')) {
      _partnerGender = 'F';
      var f = _qs('skPartnerGenderF');
      var m = _qs('skPartnerGenderM');
      if (f) f.classList.add('on');
      if (m) m.classList.remove('on');
    }
    if (target.id === 'skPartnerGenderM' || target.closest('#skPartnerGenderM')) {
      _partnerGender = 'M';
      var ff = _qs('skPartnerGenderF');
      var mm = _qs('skPartnerGenderM');
      if (ff) ff.classList.remove('on');
      if (mm) mm.classList.add('on');
    }
  });
})();
