(function () {
  'use strict';

  var TOTAL_CHAPTERS = 13;
  var POLL_INTERVAL_MS = 2500;
  var MAX_POLL_COUNT = 220;
  var API_TIMEOUT_MS = 420000;
  var LOADING_QUOTES = [
    '명궁·신궁 구조를 안정적으로 정렬하고 있습니다...',
    '12궁 별 배치를 챕터 문맥으로 정제하는 중입니다...',
    '사화와 대운 흐름을 보수적으로 교차 검증하고 있습니다...',
    '챕터별 품질 규칙을 검사하고 재시도하고 있습니다...'
  ];

  var PERSONAL_CHAPTERS = [
    '명궁 핵심 설계도',
    '신궁 잠재 동력',
    '12궁 별 배치 지도',
    '주성 핵심 해석',
    '관록궁 커리어 로드맵',
    '재백궁 재정 전략',
    '부처궁 관계 패턴',
    '교우궁 네트워크',
    '전택궁 공간·자산',
    '질액궁 컨디션',
    '대운 10년 파노라마',
    '유년 타이밍 전략',
    '별의 편지'
  ];

  var ZIWEI_COIN_BASE_COST = 590;
  var ZIWEI_COIN_FEATURE_KEY = 'premium-ziwei-report';
  var ZIWEI_COIN_REASON = '자미두수 프리미엄 PDF 리포트 생성';

  var state = {
    generating: false,
    mode: 'personal',
    reportId: '',
    chapters: [],
    downloadUrl: '',
    stopPolling: false,
    currentMessage: '',
    paidGateKey: ''
  };

  function qs(id) { return document.getElementById(id); }
  function qsa(root, selector) {
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll(selector));
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
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

  function getAuthToken() {
    try { return String(localStorage.getItem('fortune_auth_token') || '').trim(); }
    catch (_) { return ''; }
  }

  async function requestJson(url, options) {
    var opts = options || {};
    var headers = new Headers(opts.headers || {});
    headers.set('Content-Type', 'application/json');

    var token = getAuthToken();
    if (token && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + token);

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = null;
    if (controller) timer = setTimeout(function () { controller.abort(); }, API_TIMEOUT_MS);

    try {
      var res = await fetch(url, {
        method: opts.method || 'GET',
        credentials: 'include',
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller ? controller.signal : undefined
      });
      var data = null;
      try { data = await res.json(); } catch (_) { data = null; }
      return { ok: res.ok, status: res.status, data: data, response: res };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        data: { ok: false, message: String(error && error.message || '요청 중 오류가 발생했습니다.') },
        response: null
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function showOnly(screenId) {
    var screens = ['zbStartScreen', 'zbLoadingScreen', 'zbResultScreen', 'zbErrorScreen', 'zbNoProfileScreen'];
    for (var i = 0; i < screens.length; i += 1) {
      var el = qs(screens[i]);
      if (el) el.style.display = screens[i] === screenId ? '' : 'none';
    }
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

  function normalizeGender(value) {
    var v = String(value || '').trim().toLowerCase();
    if (!v) return '';
    if (v === 'm' || v === 'male' || v === '남' || v === '남성') return 'male';
    if (v === 'f' || v === 'female' || v === '여' || v === '여성') return 'female';
    return String(value || '');
  }

  function normalizeCalType(value) {
    var v = String(value || '').trim().toLowerCase();
    if (v === 'lunar' || v === '음력' || v === 'l') return 'lunar';
    return 'solar';
  }

  function buildProfileFromCardRow(row) {
    if (!row || typeof row !== 'object') return null;
    var birth = (row.birth && typeof row.birth === 'object') ? row.birth : null;
    var year = Number((birth && birth.year) || row.birthYear || row.year || 0);
    var month = Number((birth && birth.month) || row.birthMonth || row.month || 0);
    var day = Number((birth && birth.day) || row.birthDay || row.day || 0);
    if (!(year > 0 && month > 0 && day > 0)) return null;

    var hour = Number((birth && birth.hour) || row.birthHour || row.hour);
    var minute = Number((birth && birth.minute) || row.birthMinute || row.minute);

    return {
      name: String(row.name || row.nickname || row.profileName || '사용자'),
      gender: normalizeGender(row.gender),
      birth: {
        year: year,
        month: month,
        day: day,
        hour: Number.isFinite(hour) ? hour : 12,
        minute: Number.isFinite(minute) ? minute : 0,
        calType: normalizeCalType((birth && (birth.calType || birth.calendarType)) || row.calType || row.calendarType || 'solar')
      },
      location: {
        tz: 'Asia/Seoul'
      }
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
          if (String(row.id || '').trim() === currentId) return buildProfileFromCardRow(row);
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
        name: String(user.name || user.nickname || '사용자'),
        gender: normalizeGender(user.gender),
        birth: {
          year: Number(dm[1]),
          month: Number(dm[2]),
          day: Number(dm[3]),
          hour: tm ? Number(tm[1]) : 12,
          minute: tm ? Number(tm[2]) : 0,
          calType: 'solar'
        },
        location: {
          tz: 'Asia/Seoul'
        }
      };
    } catch (_) {
      return null;
    }
  }

  function getActiveProfile() {
    var profile = null;
    try { profile = window.__cdActiveBirthProfile || null; } catch (_) { profile = null; }
    if (profile && profile.birth && profile.birth.year) return profile;
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
    var time = String(Number.isFinite(Number(b.hour)) ? Number(b.hour) : 12).padStart(2, '0') + ':' + String(Number.isFinite(Number(b.minute)) ? Number(b.minute) : 0).padStart(2, '0');
    var cal = normalizeCalType(b.calType || b.calendarType || 'solar');
    var calLabel = cal === 'lunar' ? '음력' : '양력';
    return [String(profile.name || '사용자') + ' · ' + date, calLabel + ' · ' + time].join(' · ');
  }

  function getChapterTitles() {
    return PERSONAL_CHAPTERS;
  }

  function ensurePartnerSelectOptions() {
    var hourSel = qs('zbPartnerHour');
    var minSel = qs('zbPartnerMinute');
    if (hourSel && hourSel.options.length <= 1) {
      for (var h = 0; h < 24; h += 1) {
        var optH = document.createElement('option');
        optH.value = String(h);
        optH.textContent = String(h).padStart(2, '0') + '시';
        if (h === 12) optH.selected = true;
        hourSel.appendChild(optH);
      }
    }
    if (minSel && minSel.options.length <= 1) {
      for (var m = 0; m < 60; m += 5) {
        var optM = document.createElement('option');
        optM.value = String(m);
        optM.textContent = String(m).padStart(2, '0') + '분';
        if (m === 0) optM.selected = true;
        minSel.appendChild(optM);
      }
    }
  }

  function ensureModeUi() {
    var startScreen = qs('zbStartScreen');
    if (!startScreen) return;
    if (qs('zbModeCard')) return;

    var profileBox = startScreen.querySelector('.lb-start__profile-box');
    if (!profileBox || !profileBox.parentNode) return;

    var card = document.createElement('div');
    card.id = 'zbModeCard';
    card.style.cssText = 'margin-top:12px;padding:12px;border-radius:12px;border:1px solid rgba(167,139,250,0.35);background:rgba(30,27,75,0.36);';
    card.innerHTML = ''
      + '<div style="font-size:12px;color:#c4b5fd;margin-bottom:6px">리포트 모드</div>'
      + '<div style="display:inline-flex;align-items:center;gap:6px;color:#e9d5ff;font-size:13px">'
      + '  <strong style="color:#f5f3ff">개인 모드 전용</strong>'
      + '</div>'
      + '<div style="margin-top:6px;font-size:12px;color:#cbd5e1">자미두수 PDF는 개인 명반 기준으로만 생성됩니다.</div>';

    profileBox.parentNode.insertBefore(card, profileBox.nextSibling);
    state.mode = 'personal';
    var subtitle = qs('ziweiBookModal') ? qs('ziweiBookModal').querySelector('.lb-modal__subtitle') : null;
    var cta = qs('zbStartBtn');
    var heroDesc = qs('ziweiBookModal') ? qs('ziweiBookModal').querySelector('.lb-start__desc') : null;
    var chLabel = qs('ziweiBookModal') ? qs('ziweiBookModal').querySelector('.lb-start__ch-label') : null;
    if (subtitle) subtitle.textContent = '나의 명반 기반 13챕터 자미두수 인생 PDF';
    if (cta) cta.textContent = '🌌 자미두수 인생 총람 생성하기';
    if (heroDesc) heroDesc.innerHTML = '복잡한 부가 화면 없이<br>자미두수 핵심 명반을 정리해<br>최종 PDF 인생 전서를 생성합니다';
    if (chLabel) chLabel.textContent = '📖 13챕터 구성';
    renderChapterList();
  }

  function renderChapterList() {
    var root = qs('ziweiBookModal');
    if (!root) return;
    var list = root.querySelector('.lb-start__ch-list');
    if (!list) return;
    var titles = getChapterTitles();
    list.innerHTML = titles.map(function (title, idx) {
      return '<li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.' + (idx + 1) + '</span><span>' + escapeHtml(title) + '</span></li>';
    }).join('');

    var dotTitles = getChapterTitles();
    for (var i = 0; i < TOTAL_CHAPTERS; i += 1) {
      var dot = qs('zbChDot' + i);
      if (dot) dot.setAttribute('title', 'Ch.' + (i + 1) + ' ' + dotTitles[i]);
    }
  }

  function getSelectedMode() {
    return 'personal';
  }

  function readPartnerInput() {
    var dateRaw = String((qs('zbPartnerBirthDate') && qs('zbPartnerBirthDate').value) || '').trim();
    var dm = dateRaw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!dm) return null;
    return {
      name: String((qs('zbPartnerName') && qs('zbPartnerName').value) || '').trim() || '상대',
      gender: normalizeGender((qs('zbPartnerGender') && qs('zbPartnerGender').value) || 'female'),
      year: Number(dm[1]),
      month: Number(dm[2]),
      day: Number(dm[3]),
      hour: Number((qs('zbPartnerHour') && qs('zbPartnerHour').value) || 12),
      minute: Number((qs('zbPartnerMinute') && qs('zbPartnerMinute').value) || 0),
      calendarType: 'solar'
    };
  }

  function convertRawZiweiToStructured(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var rows = Array.isArray(raw.palaceStarData) ? raw.palaceStarData : [];
    return {
      meng: raw.meng,
      shen: raw.shen,
      juInfo: raw.juInfo,
      calcMeta: raw.calcMeta || null,
      palaces: rows.map(function (row) {
        return {
          palace: row && row.palace ? row.palace : '',
          branch: row && row.branch ? row.branch : '',
          stars: Array.isArray(row && row.stars) ? row.stars : [],
          auxStars: Array.isArray(row && row.auxStars) ? row.auxStars : [],
          badStars: Array.isArray(row && row.badStars) ? row.badStars : []
        };
      })
    };
  }

  function getPrimaryZiweiStructured() {
    try {
      if (typeof window.getZiweiStructuredData === 'function') {
        var structured = window.getZiweiStructuredData();
        if (structured && typeof structured === 'object') return structured;
      }
    } catch (_) {}
    return null;
  }

  function getPartnerZiweiStructured(partner) {
    try {
      if (typeof window.calcZiweiPalaces === 'function') {
        var raw = window.calcZiweiPalaces(partner.year, partner.month, partner.day, partner.hour, partner.minute);
        return convertRawZiweiToStructured(raw);
      }
    } catch (_) {}
    return null;
  }

  function buildRequestBody(forceRegenerate) {
    var profile = getActiveProfile() || {};
    var birth = profile.birth || {};
    state.mode = 'personal';

    var body = {
      mode: 'personal',
      forceRegenerate: !!forceRegenerate,
      birthData: {
        name: String(profile.name || '사용자'),
        gender: normalizeGender(profile.gender),
        year: Number(birth.year || 0),
        month: Number(birth.month || 0),
        day: Number(birth.day || 0),
        hour: Number(Number.isFinite(Number(birth.hour)) ? birth.hour : 12),
        minute: Number(Number.isFinite(Number(birth.minute)) ? birth.minute : 0),
        calendarType: normalizeCalType(birth.calType || birth.calendarType || 'solar'),
        timezone: String((profile.location && profile.location.tz) || 'Asia/Seoul'),
        lat: Number((profile.location && profile.location.lat) || 37.5665),
        lon: Number((profile.location && profile.location.lng) || 126.9780),
        ziweiStructured: getPrimaryZiweiStructured()
      }
    };

    return { body: body };
  }

  function setError(message) {
    var msg = qs('zbErrorMsg');
    if (msg) msg.textContent = String(message || '생성 중 오류가 발생했습니다.');
    showOnly('zbErrorScreen');
  }

  function resetDots(activeChapter, doneChapter) {
    var active = Math.max(1, Math.min(TOTAL_CHAPTERS, Number(activeChapter || 1)));
    var done = Math.max(0, Math.min(TOTAL_CHAPTERS, Number(doneChapter || 0)));
    var dots = qsa(qs('ziweiBookModal'), '.lb-ch-dot');
    for (var i = 0; i < dots.length; i += 1) {
      var dot = dots[i];
      var ch = Number(dot.getAttribute('data-zbch') || 0);
      dot.classList.remove('lb-ch-dot--pending', 'lb-ch-dot--active', 'lb-ch-dot--done');
      if (ch < 1 || ch > TOTAL_CHAPTERS) {
        dot.style.display = 'none';
        continue;
      }
      dot.style.display = '';
      if (ch <= done) dot.classList.add('lb-ch-dot--done');
      else if (ch === active) dot.classList.add('lb-ch-dot--active');
      else dot.classList.add('lb-ch-dot--pending');
    }
  }

  function setLoadingProgress(currentChapter, status) {
    var done = Math.max(0, Math.min(TOTAL_CHAPTERS, Number(currentChapter || 0)));
    var active = Math.min(TOTAL_CHAPTERS, done + 1);
    var pct = done <= 0 ? 3 : Math.round((done / TOTAL_CHAPTERS) * 100);
    var titles = getChapterTitles();
    var statusToken = String(status || 'generating').toLowerCase();
    var progressMessage = statusToken === 'completed'
      ? '자미두수 원고를 최종 교정하고 있습니다...'
      : ('' + titles[Math.max(0, active - 1)] + ' 챕터를 정교하게 해석하는 중입니다...');

    var progressBar = qs('zbProgressBar');
    var progressText = qs('zbProgressText');
    var loadingStatus = qs('zbLoadingStatus');
    var chapterNum = qs('zbLoadingChapterNum');
    var chapterTitle = qs('zbLoadingChapterTitle');
    var quote = qs('zbMysticQuote');

    if (progressBar) progressBar.style.width = String(Math.max(2, Math.min(100, pct))) + '%';
    if (progressText) progressText.textContent = done + ' / ' + TOTAL_CHAPTERS + ' 챕터';
    if (loadingStatus) loadingStatus.textContent = progressMessage;
    if (chapterNum) chapterNum.textContent = 'Ch.' + Math.max(1, active);
    if (chapterTitle) chapterTitle.textContent = done >= TOTAL_CHAPTERS ? '완료 처리 중...' : String(titles[Math.max(0, active - 1)] || '준비 중...');
    if (quote) quote.textContent = LOADING_QUOTES[(Math.max(1, active) - 1) % LOADING_QUOTES.length];
    resetDots(active, done);
  }

  function renderResultScreen() {
    var toc = qs('zbToc');
    var content = qs('zbChapterContent');
    var resultName = qs('zbResultName');
    var resultDate = qs('zbResultDate');
    if (!toc || !content) return;

    var profile = getActiveProfile();
    var modeLabel = state.mode === 'compatibility' ? '자미두수 궁합 리포트' : '자미두수 인생 리포트';
    if (resultName) {
      var label = profile && profile.name ? profile.name + ' · ' + modeLabel : modeLabel;
      resultName.textContent = label;
    }
    if (resultDate) {
      var d = new Date();
      resultDate.textContent = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    }

    var chapters = Array.isArray(state.chapters) ? state.chapters.slice() : [];
    chapters.sort(function (a, b) {
      return Number(a && a.chapterIndex || 0) - Number(b && b.chapterIndex || 0);
    });

    var tocHtml = [];
    var articleHtml = [];
    for (var i = 0; i < chapters.length; i += 1) {
      var chapter = chapters[i] || {};
      var chapterIndex = Number(chapter.chapterIndex || i + 1);
      var title = String(chapter.title || ('Chapter ' + chapterIndex));
      var subtitle = String(chapter.subtitle || '');
      var summary = String(chapter.summary || '');
      var sections = Array.isArray(chapter.sections) ? chapter.sections : [];
      var insights = Array.isArray(chapter.keyInsights) ? chapter.keyInsights : [];
      var advice = Array.isArray(chapter.practicalAdvice) ? chapter.practicalAdvice : [];

      tocHtml.push('<button type="button" class="lb-toc-item" data-zb-chapter="' + chapterIndex + '"><span>Ch.' + chapterIndex + '</span><strong>' + escapeHtml(title) + '</strong></button>');

      var sectionHtml = sections.map(function (section) {
        return '<h4>' + escapeHtml(section && section.heading || '') + '</h4>' + toParagraphHtml(section && section.body || '');
      }).join('');
      var insightsHtml = insights.length
        ? '<div class="lb-result-article__list"><h5>핵심 통찰</h5><ul>' + insights.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div>'
        : '';
      var adviceHtml = advice.length
        ? '<div class="lb-result-article__list"><h5>실천 조언</h5><ul>' + advice.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></div>'
        : '';

      articleHtml.push(
        '<article class="lb-result-article" data-zb-article="' + chapterIndex + '">' +
          '<p class="lb-result-article__chapter">CHAPTER ' + chapterIndex + '</p>' +
          '<h3 class="lb-result-article__title">' + escapeHtml(title) + '</h3>' +
          (subtitle ? '<p class="lb-result-article__subtitle">' + escapeHtml(subtitle) + '</p>' : '') +
          (summary ? '<div class="lb-result-article__summary">' + toParagraphHtml(summary) + '</div>' : '') +
          '<div class="lb-result-article__body">' + sectionHtml + insightsHtml + adviceHtml + '</div>' +
        '</article>'
      );
    }

    toc.innerHTML = tocHtml.join('');
    content.innerHTML = articleHtml.join('');
    showOnly('zbResultScreen');
  }

  function applyStatus(statusData) {
    if (!statusData || typeof statusData !== 'object') return;
    if (statusData.reportId) state.reportId = String(statusData.reportId);
    if (statusData.downloadUrl) state.downloadUrl = String(statusData.downloadUrl);
    if (Array.isArray(statusData.chapters)) state.chapters = statusData.chapters.slice();
    state.currentMessage = String(statusData.message || '');
    setLoadingProgress(Number(statusData.currentChapter || 0), String(statusData.status || 'generating'));
  }

  async function pollStatusUntilDone() {
    if (!state.reportId) throw new Error('reportId가 없습니다.');

    for (var i = 0; i < MAX_POLL_COUNT; i += 1) {
      if (state.stopPolling) throw new Error('생성이 중단되었습니다.');
      var url = '/api/premium/ziwei/status?reportId=' + encodeURIComponent(state.reportId) + '&includeChapters=1';
      var res = await requestJson(url, { method: 'GET' });
      if (!res.ok || !res.data || !res.data.ok) {
        throw new Error(String(res.data && res.data.message || '상태 조회에 실패했습니다.'));
      }

      applyStatus(res.data);
      if (String(res.data.status) === 'completed') return res.data;
      if (String(res.data.status) === 'failed') {
        throw new Error(String(res.data.errorMessage || res.data.message || '리포트 생성에 실패했습니다.'));
      }

      await delay(POLL_INTERVAL_MS);
    }

    throw new Error('생성 시간이 길어지고 있습니다. 잠시 뒤 다시 시도해 주세요.');
  }

  function resetForGenerate() {
    state.reportId = '';
    state.chapters = [];
    state.downloadUrl = '';
    state.currentMessage = '';
    state.stopPolling = false;
    setLoadingProgress(0, 'generating');
  }

  function buildZiweiGateKey(body) {
    var b = body || {};
    var mode = String(b.mode || 'personal');
    var birth = (b.birthData && typeof b.birthData === 'object') ? b.birthData : {};
    var partnerBirth = (b.partnerBirthData && typeof b.partnerBirthData === 'object') ? b.partnerBirthData : {};
    var chunks = [
      mode,
      Number(b.year || birth.year || 0), Number(b.month || birth.month || 0), Number(b.day || birth.day || 0),
      Number(b.hour || birth.hour || 12), Number(b.minute || birth.minute || 0)
    ];
    if (mode === 'compatibility') {
      chunks.push(
        Number(b.partnerYear || partnerBirth.year || 0), Number(b.partnerMonth || partnerBirth.month || 0), Number(b.partnerDay || partnerBirth.day || 0),
        Number(b.partnerHour || partnerBirth.hour || 12), Number(b.partnerMinute || partnerBirth.minute || 0)
      );
    }
    return chunks.join('|');
  }

  function resolveZiweiCoinPolicy(body) {
    return {
      cost: ZIWEI_COIN_BASE_COST,
      featureKey: ZIWEI_COIN_FEATURE_KEY,
      reason: ZIWEI_COIN_REASON,
      modeLabel: '개인'
    };
  }

  async function ensureZiweiCoinGate(body) {
    var gateKey = buildZiweiGateKey(body);
    if (state.paidGateKey && state.paidGateKey === gateKey) return true;
    var policy = resolveZiweiCoinPolicy(body);

    try {
      if (window.__cdAdminBypass === true) {
        state.paidGateKey = gateKey;
        return true;
      }
    } catch (_) {}

    if (!window.confirm('🪙 자미두수 프리미엄 ' + policy.modeLabel + ' 리포트 생성\n이용 시 ' + policy.cost + '코인이 차감됩니다.\n지금 생성하시겠습니까?')) {
      return false;
    }

    var requestId = 'premium-ziwei:' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    var res = await requestJson('/api/billing/coin-gate', {
      method: 'POST',
      body: {
        featureKey: policy.featureKey,
        reason: policy.reason,
        forceDeduct: true,
        requestId: requestId
      }
    });

    var data = (res && res.data) || {};
    var code = String((data && data.code) || '').toUpperCase();
    if (res.status === 401 || res.status === 403 || code === 'AUTH_REQUIRED') {
      if (typeof window.__cdOpenLoginRequiredModal === 'function') {
        window.__cdOpenLoginRequiredModal({
          reason: '로그인 후 자미두수 프리미엄 리포트를 생성할 수 있습니다.',
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

    state.paidGateKey = gateKey;
    return true;
  }

  async function generateZiweiBookImpl(forceRegenerate) {
    if (state.generating) return;
    if (!hasProfile()) {
      showOnly('zbNoProfileScreen');
      return;
    }

    var payloadInfo = buildRequestBody(forceRegenerate);
    if (payloadInfo.error) {
      setError(payloadInfo.error);
      return;
    }

    var gateOk = await ensureZiweiCoinGate(payloadInfo.body);
    if (!gateOk) return;

    state.generating = true;
    resetForGenerate();
    showOnly('zbLoadingScreen');

    try {
      var genRes = await requestJson('/api/premium/ziwei/generate', {
        method: 'POST',
        body: payloadInfo.body
      });

      if (!genRes.ok || !genRes.data || !genRes.data.ok) {
        throw new Error(String(genRes.data && genRes.data.message || '리포트 생성 요청에 실패했습니다.'));
      }

      state.reportId = String(genRes.data.reportId || '').trim();
      if (!state.reportId) throw new Error('리포트 식별자를 받지 못했습니다.');

      applyStatus(genRes.data);
      var finalStatus = String(genRes.data.status || '').toLowerCase() === 'completed'
        ? genRes.data
        : await pollStatusUntilDone();

      applyStatus(finalStatus);
      setLoadingProgress(TOTAL_CHAPTERS, 'completed');
      renderResultScreen();
      notify('자미두수 리포트 생성이 완료되었습니다.');
    } catch (error) {
      console.error('[ZiweiBook] generate failed:', error);
      setError(String(error && error.message || '생성 중 오류가 발생했습니다.'));
    } finally {
      state.generating = false;
      state.stopPolling = false;
    }
  }

  async function downloadZiweiBookImpl() {
    if (!state.reportId) {
      notify('먼저 리포트를 생성해 주세요.');
      return;
    }

    var downloadUrl = state.downloadUrl || ('/api/premium/ziwei/download?reportId=' + encodeURIComponent(state.reportId));
    var headers = new Headers();
    var token = getAuthToken();
    if (token) headers.set('Authorization', 'Bearer ' + token);

    var res = await fetch(downloadUrl, {
      method: 'GET',
      credentials: 'include',
      headers: headers
    });

    if (!res.ok) {
      var errData = null;
      try { errData = await res.json(); } catch (_) { errData = null; }
      throw new Error(String(errData && errData.message || '다운로드에 실패했습니다.'));
    }

    var blob = await res.blob();
    var objectUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'ziwei-premium-' + (state.mode || 'personal') + '-' + (state.reportId || Date.now()) + '.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(objectUrl);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 0);
    notify('리포트 파일을 다운로드했습니다.');
  }

  function applyBaseUi() {
    ensureModeUi();
    renderChapterList();

    var profile = getActiveProfile();
    var summary = qs('zbProfileSummary');
    if (summary) summary.textContent = formatProfileSummary(profile);

    state.mode = getSelectedMode();
    resetDots(1, 0);
  }

  function applyActiveProfileArg(profileArg) {
    if (!profileArg || !profileArg.birth) return;
    var birth = profileArg.birth;
    if (!(Number(birth.year) > 0 && Number(birth.month) > 0 && Number(birth.day) > 0)) return;
    try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
  }

  window.openZiweiBookModal = function (profileArg) {
    var modal = qs('ziweiBookModal');
    if (!modal) return;
    applyActiveProfileArg(profileArg);
    applyBaseUi();
    showOnly(hasProfile() ? 'zbStartScreen' : 'zbNoProfileScreen');
    modal.style.display = 'flex';
    modal.style.zIndex = '100120';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-modal-open');
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
  };

  window.closeZiweiBookModal = function () {
    var modal = qs('ziweiBookModal');
    if (!modal) return;
    state.stopPolling = true;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.generateZiweiBook = function (forceRegenerate) {
    generateZiweiBookImpl(!!forceRegenerate).catch(function (error) {
      console.error('[ZiweiBook] generate crash:', error);
      setError(String(error && error.message || '생성 중 오류가 발생했습니다.'));
    });
  };

  window.downloadZiweiBookPdf = function () {
    downloadZiweiBookImpl().catch(function (error) {
      console.error('[ZiweiBook] download failed:', error);
      notify(String(error && error.message || '다운로드에 실패했습니다.'));
    });
  };

  window.gotoZiweiPremium = function () {
    window.openZiweiBookModal();
  };

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;

    var btn = target.closest('[data-action]');
    if (btn) {
      var action = btn.getAttribute('data-action');
      if (action === 'openZiweiBookModal') {
        window.openZiweiBookModal();
        return;
      }
      if (action === 'closeZiweiBookModal') {
        window.closeZiweiBookModal();
        return;
      }
    }

    var tocItem = target.closest('.lb-toc-item[data-zb-chapter]');
    if (tocItem) {
      var chapter = Number(tocItem.getAttribute('data-zb-chapter') || 0);
      if (chapter > 0) {
        var articleWrap = qs('zbChapterContent');
        var article = articleWrap ? articleWrap.querySelector('[data-zb-article="' + chapter + '"]') : null;
        if (article && typeof article.scrollIntoView === 'function') {
          article.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }, false);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var modal = qs('ziweiBookModal');
    if (modal && modal.style.display !== 'none') window.closeZiweiBookModal();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBaseUi, { once: true });
  } else {
    applyBaseUi();
  }
})();