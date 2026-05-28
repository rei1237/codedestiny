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
    '올해의 세운을 계산하는 중입니다',
    '대운과 올해의 기운이 만나는 지점을 읽는 중입니다',
    '일, 돈, 사랑, 건강의 흐름을 정리하는 중입니다',
    '12개월 운세 흐름을 10챕터로 엮는 중입니다',
    '신년운세 프리미엄 PDF를 완성하는 중입니다'
  ];

  function _qs(id) { return document.getElementById(id); }
  function _clean(value) { return String(value || '').trim(); }
  function _esc(value) {
    return _clean(value).replace(/[&<>"]/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] || ch;
    });
  }
  function _pad2(value) { return String(Number(value || 0)).padStart(2, '0'); }

  function _log(code, meta) {
    try { console.info('[NewYearBook][Flow] ' + code, meta || {}); } catch (_) {}
  }
  function _logError(error, meta) {
    try {
      console.error('[NewYearBook][Error]', {
        message: String(error && error.message ? error.message : error || 'unknown'),
        stage: meta && meta.stage ? String(meta.stage) : ''
      });
    } catch (_) {}
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

  function _startProgressAnimation() {
    _stopProgressAnimation();
    var step = 0;
    _progressTimer = setInterval(function () {
      step = Math.min(TOTAL_CHAPTERS - 1, step + 1);
      _setProgress(step, LOADING_MESSAGES[step % LOADING_MESSAGES.length]);
    }, 2400);
  }

  function _stopProgressAnimation() {
    if (_progressTimer) clearInterval(_progressTimer);
    _progressTimer = null;
  }

  function _targetYear() {
    var el = _qs('nyTargetYear');
    var year = Number(el && el.value || new Date().getFullYear());
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
    _log('BILLING_CHECK_START', { featureKey: BILLING_FEATURE_KEY, reportId: reportId });
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
    _log('BILLING_CHECK_OK', { featureKey: BILLING_FEATURE_KEY, reportId: reportId, hasPurchaseId: !!grant.purchaseId });
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
      throw new Error(msg);
    }
    return body;
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
    _log('CARD_CLICK');
    var modal = _qs('sajuNewYearModal');
    if (!modal) return;
    var yearEl = _qs('nyTargetYear');
    if (yearEl && !yearEl.value) yearEl.value = String(new Date().getFullYear());
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

    if (typeof window.computeProfileForModal === 'function') {
      try { window.computeProfileForModal(profile); } catch (_) {}
    }

    var reportId = _buildReportId(targetYear);
    var runAfterBilling = function (accessGrant, premiumToken) {
      _generating = true;
      _setBusy(true);
      _showScreen('nyLoadingScreen');
      _setProgress(0, '올해의 세운을 계산하는 중입니다');
      _startProgressAnimation();

      _log('INPUT_READY', { hasBirth: true });
      _log('TARGET_YEAR_READY', { targetYear: targetYear });
      _log('ENGINE_CALC_START', { targetYear: targetYear });
      var sajuBase = _collectSajuBase();
      _log('ENGINE_CALC_OK', { hasDayMaster: !!(sajuBase.core && sajuBase.core.dayMaster) });
      _log('PDF_SEED_READY', { targetYear: targetYear });
      _log('LOCAL_SKELETON_READY', { chapterCount: TOTAL_CHAPTERS });
      _log('LLM_WRITE_START', { chapterCount: TOTAL_CHAPTERS });

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
        name: profile.name || '사용자',
        gender: profile.gender || '',
        calendarType: (profile.birth && (profile.birth.calendarType || profile.birth.calType)) || 'solar',
        birthDate: profile.birth.year + '-' + _pad2(profile.birth.month) + '-' + _pad2(profile.birth.day),
        birthTimeKnown: true,
        hour: Number(profile.birth.hour || 12),
        minute: Number(profile.birth.minute || 0),
        profile: profile,
        sajuBase: sajuBase
      }).then(function (data) {
        _markPremiumVerified(25 * 60 * 1000);
        _log('LLM_WRITE_OK', { chapterCount: data.chapterCount || TOTAL_CHAPTERS, fallbackUsed: !!data.fallbackUsed });
        _log('PDF_RENDER_START', { chapterCount: data.chapterCount || TOTAL_CHAPTERS });
        _setProgress(TOTAL_CHAPTERS, '신년운세 프리미엄 PDF를 완성하는 중입니다');
        _renderResult(data, profile, targetYear);
        _log('PDF_RENDER_OK', { chapterCount: _chapters.length });
        _showScreen('nyResultScreen');
      }).catch(function (error) {
        _logError(error, { stage: 'generate' });
        _setError(String(error && error.message ? error.message : error || 'PDF 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'));
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
    var win = window.open('', '_blank', 'width=980,height=760');
    if (!win) {
      window.alert('팝업이 차단되어 출력 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    win.document.open();
    win.document.write(String(_resultPayload.pdfReady.html || ''));
    win.document.close();
    win.focus();
    setTimeout(function () {
      try { win.print(); } catch (_) {}
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