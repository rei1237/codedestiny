(function () {
  'use strict';

  var TOTAL_CHAPTERS = 12;
  var API_TIMEOUT_MS = 360000;
  var POLL_INTERVAL_MS = 1800;
  var LOADING_QUOTES = [
    '라그나와 하우스를 교차 해석하는 중입니다...',
    '나크샤트라와 다샤 흐름을 안정적으로 정리하는 중입니다...',
    '챕터별 근거 데이터와 해석 문장을 검증하는 중입니다...',
    '실전 조언을 챕터 문맥에 맞게 정리하는 중입니다...'
  ];

  var state = {
    generating: false,
    mode: 'personal',
    reportId: '',
    downloadUrl: '',
    chapters: [],
    quoteTick: 0
  };

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
      return { ok: res.ok, status: res.status, data: data };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        data: { ok: false, message: String(error && error.message || '요청 중 오류가 발생했습니다.') }
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
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
    var calType = String((birth && (birth.calType || birth.calendarType)) || row.calType || row.calendarType || 'solar').toLowerCase();
    if (calType !== 'lunar' && calType !== 'lunar_leap') calType = 'solar';

    return {
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
        tz: 'Asia/Seoul',
        lat: 37.5665,
        lng: 126.9780
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
        gender: String(user.gender || ''),
        birth: {
          year: Number(dm[1]),
          month: Number(dm[2]),
          day: Number(dm[3]),
          hour: tm ? Number(tm[1]) : 12,
          minute: tm ? Number(tm[2]) : 0,
          calType: 'solar'
        },
        location: {
          tz: 'Asia/Seoul',
          lat: 37.5665,
          lng: 126.9780
        }
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

  function showOnly(screenId) {
    var screens = ['vdStartScreen', 'vdLoadingScreen', 'vdResultScreen', 'vdErrorScreen', 'vdNoProfileScreen'];
    for (var i = 0; i < screens.length; i += 1) {
      var el = qs(screens[i]);
      if (el) el.style.display = screens[i] === screenId ? '' : 'none';
    }
  }

  function setError(message) {
    var el = qs('vdErrorMsg');
    if (el) el.textContent = String(message || '생성 중 오류가 발생했습니다.');
    showOnly('vdErrorScreen');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureModeUi() {
    var startScreen = qs('vdStartScreen');
    if (!startScreen) return;
    if (qs('vdModePanel')) return;

    var panel = document.createElement('div');
    panel.id = 'vdModePanel';
    panel.style.cssText = 'margin:14px 0 12px;padding:14px;border:1px solid rgba(251,146,60,0.35);border-radius:12px;background:rgba(30,15,8,0.45);';
    panel.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">',
      '  <strong style="font-size:13px;color:#fed7aa;">리포트 모드</strong>',
      '  <div style="display:flex;gap:10px;align-items:center;">',
      '    <label style="display:flex;gap:6px;align-items:center;font-size:12px;color:#ffe7c2;cursor:pointer;">',
      '      <input type="radio" name="vdReportMode" id="vdModePersonal" value="personal" checked> 개인',
      '    </label>',
      '    <label style="display:flex;gap:6px;align-items:center;font-size:12px;color:#ffe7c2;cursor:pointer;">',
      '      <input type="radio" name="vdReportMode" id="vdModeCompat" value="compatibility"> 궁합',
      '    </label>',
      '  </div>',
      '</div>',
      '<div id="vdPartnerWrap" style="display:none;margin-top:12px;border-top:1px dashed rgba(251,146,60,0.35);padding-top:12px;">',
      '  <p style="margin:0 0 10px;font-size:12px;color:#fcd9b6;">궁합 모드는 상대 생년월일이 필요합니다. (시간 미상 시 12:00 권장)</p>',
      '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">',
      '    <input id="vdPartnerName" type="text" placeholder="상대 이름" style="padding:10px;border-radius:10px;border:1px solid rgba(251,146,60,0.35);background:#160b04;color:#fff;">',
      '    <input id="vdPartnerBirthDate" type="date" style="padding:10px;border-radius:10px;border:1px solid rgba(251,146,60,0.35);background:#160b04;color:#fff;">',
      '    <input id="vdPartnerHour" type="number" min="0" max="23" value="12" placeholder="시(0~23)" style="padding:10px;border-radius:10px;border:1px solid rgba(251,146,60,0.35);background:#160b04;color:#fff;">',
      '    <input id="vdPartnerMinute" type="number" min="0" max="59" value="0" placeholder="분(0~59)" style="padding:10px;border-radius:10px;border:1px solid rgba(251,146,60,0.35);background:#160b04;color:#fff;">',
      '  </div>',
      '</div>'
    ].join('');

    var profileBox = startScreen.querySelector('.lb-start__profile-box');
    if (profileBox && profileBox.parentNode) {
      profileBox.parentNode.insertBefore(panel, profileBox.nextSibling);
    } else {
      startScreen.appendChild(panel);
    }

    function syncPartnerVisibility() {
      var wrap = qs('vdPartnerWrap');
      if (!wrap) return;
      wrap.style.display = getSelectedMode() === 'compatibility' ? '' : 'none';
    }

    var radios = qsa(panel, 'input[name="vdReportMode"]');
    for (var i = 0; i < radios.length; i += 1) {
      radios[i].addEventListener('change', syncPartnerVisibility);
    }
    syncPartnerVisibility();
  }

  function getSelectedMode() {
    var checked = document.querySelector('input[name="vdReportMode"]:checked');
    var mode = checked ? String(checked.value || '') : 'personal';
    return mode === 'compatibility' ? 'compatibility' : 'personal';
  }

  function readPartnerInput() {
    var dateRaw = String((qs('vdPartnerBirthDate') && qs('vdPartnerBirthDate').value) || '').trim();
    var dm = dateRaw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!dm) return null;
    var hour = Number((qs('vdPartnerHour') && qs('vdPartnerHour').value) || 12);
    var minute = Number((qs('vdPartnerMinute') && qs('vdPartnerMinute').value) || 0);
    return {
      name: String((qs('vdPartnerName') && qs('vdPartnerName').value) || '').trim() || '상대',
      year: Number(dm[1]),
      month: Number(dm[2]),
      day: Number(dm[3]),
      hour: Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 12,
      minute: Number.isFinite(minute) ? Math.max(0, Math.min(59, minute)) : 0
    };
  }

  function buildRequestBody() {
    var profile = getActiveProfile() || {};
    var birth = profile.birth || {};
    var location = profile.location || {};
    var mode = getSelectedMode();

    var body = {
      mode: mode,
      reportMode: mode,
      reportType: mode,
      includeCompatibility: mode === 'compatibility',
      name: String(profile.name || '사용자'),
      gender: String(profile.gender || ''),
      year: Number(birth.year || 0),
      month: Number(birth.month || 0),
      day: Number(birth.day || 0),
      hour: Number(Number.isFinite(Number(birth.hour)) ? birth.hour : 12),
      minute: Number(Number.isFinite(Number(birth.minute)) ? birth.minute : 0),
      calType: String(birth.calType || birth.calendarType || 'solar'),
      timezoneName: String(location.tz || 'Asia/Seoul'),
      timezone: String(location.tz || 'Asia/Seoul'),
      lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
      lon: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780),
      birthData: {
        name: String(profile.name || '사용자'),
        gender: String(profile.gender || ''),
        year: Number(birth.year || 0),
        month: Number(birth.month || 0),
        day: Number(birth.day || 0),
        hour: Number(Number.isFinite(Number(birth.hour)) ? birth.hour : 12),
        minute: Number(Number.isFinite(Number(birth.minute)) ? birth.minute : 0),
        timezoneName: String(location.tz || 'Asia/Seoul'),
        timezone: String(location.tz || 'Asia/Seoul'),
        lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
        lon: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780)
      }
    };

    if (mode === 'compatibility') {
      var partner = readPartnerInput();
      if (!partner) return { ok: false, message: '궁합 모드는 상대 생년월일이 필요합니다.' };
      body.partnerName = partner.name;
      body.partnerYear = partner.year;
      body.partnerMonth = partner.month;
      body.partnerDay = partner.day;
      body.partnerHour = partner.hour;
      body.partnerMinute = partner.minute;
      body.partnerBirthData = {
        name: partner.name,
        year: partner.year,
        month: partner.month,
        day: partner.day,
        hour: partner.hour,
        minute: partner.minute,
        timezoneName: String(location.tz || 'Asia/Seoul'),
        timezone: String(location.tz || 'Asia/Seoul'),
        lat: Number(Number.isFinite(Number(location.lat)) ? Number(location.lat) : 37.5665),
        lon: Number(Number.isFinite(Number(location.lng)) ? Number(location.lng) : 126.9780)
      };
    }

    return { ok: true, body: body };
  }

  function resetDots(activeChapter) {
    var modal = qs('vedicBookModal');
    var dots = qsa(modal, '.vd-ch-dot');
    for (var i = 0; i < dots.length; i += 1) {
      var dot = dots[i];
      var chapter = Number(dot.getAttribute('data-vdch') || 0);
      dot.classList.remove('lb-ch-dot--pending', 'lb-ch-dot--active', 'lb-ch-dot--done');
      if (chapter < 1 || chapter > TOTAL_CHAPTERS) continue;
      if (chapter < activeChapter) dot.classList.add('lb-ch-dot--done');
      else if (chapter === activeChapter) dot.classList.add('lb-ch-dot--active');
      else dot.classList.add('lb-ch-dot--pending');
    }
  }

  function setLoadingProgress(payload) {
    var currentChapter = Number(payload && payload.currentChapter || 0);
    var status = String(payload && payload.status || 'generating');
    var message = String(payload && payload.message || '베다 챕터를 생성하는 중...');
    var completed = status === 'completed' ? TOTAL_CHAPTERS : Math.max(0, Math.min(TOTAL_CHAPTERS, currentChapter));
    var nextChapter = Math.max(1, Math.min(TOTAL_CHAPTERS, currentChapter || 1));
    var progress = Math.round((completed / TOTAL_CHAPTERS) * 100);

    var bar = qs('vdProgressBar');
    var text = qs('vdProgressText');
    var num = qs('vdLoadingChapterNum');
    var label = qs('vdLoadingChapter');
    var quote = qs('vdMysticQuote');

    if (bar) bar.style.width = progress + '%';
    if (text) text.textContent = completed + ' / ' + TOTAL_CHAPTERS + ' 챕터';
    if (num) num.textContent = 'Chapter ' + nextChapter;
    if (label) label.textContent = message;
    if (quote) {
      state.quoteTick += 1;
      quote.textContent = LOADING_QUOTES[state.quoteTick % LOADING_QUOTES.length];
    }
    resetDots(nextChapter);
  }

  function buildChapterArticle(chapter, index) {
    var sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    var insights = Array.isArray(chapter.keyInsights) ? chapter.keyInsights : [];
    var advice = Array.isArray(chapter.practicalAdvice) ? chapter.practicalAdvice : [];

    var sectionsHtml = sections.map(function (section) {
      return '<section>'
        + '<h4>' + escapeHtml(section.heading || '') + '</h4>'
        + '<p>' + escapeHtml(section.body || '') + '</p>'
        + '</section>';
    }).join('');

    var insightsHtml = insights.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');
    var adviceHtml = advice.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');

    return '<article class="lb-result-article" data-vd-article="' + index + '">'
      + '<p class="lb-result-article__chapter">CHAPTER ' + index + '</p>'
      + '<h3 class="lb-result-article__title">' + escapeHtml(chapter.title || ('Chapter ' + index)) + '</h3>'
      + (chapter.subtitle ? '<p class="lb-result-article__subtitle">' + escapeHtml(chapter.subtitle) + '</p>' : '')
      + (chapter.summary ? '<p class="lb-result-article__summary">' + escapeHtml(chapter.summary) + '</p>' : '')
      + '<div class="lb-result-article__body">' + sectionsHtml + '</div>'
      + '<div class="lb-result-article__extras" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'
      + '<div><h5 style="margin:0 0 8px;">핵심 통찰</h5><ul>' + insightsHtml + '</ul></div>'
      + '<div><h5 style="margin:0 0 8px;">실천 조언</h5><ul>' + adviceHtml + '</ul></div>'
      + '</div>'
      + '</article>';
  }

  function renderResultScreen() {
    var toc = qs('vdToc');
    var content = qs('vdChapterContent');
    var name = qs('vdResultName');
    var date = qs('vdResultDate');
    if (!toc || !content) return;

    var modeTitle = state.mode === 'compatibility' ? '베다 궁합 리포트' : '베다 인생 리포트';
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
      tocHtml.push('<button type="button" class="lb-toc-item" data-vd-chapter="' + idx + '"><span>Ch.' + idx + '</span><strong>' + escapeHtml(chapter.title || ('Chapter ' + idx)) + '</strong></button>');
      articleHtml.push(buildChapterArticle(chapter, idx));
    }

    toc.innerHTML = tocHtml.join('');
    content.innerHTML = articleHtml.join('');
    showOnly('vdResultScreen');
  }

  async function pollStatusLoop() {
    for (var attempt = 0; attempt < 260; attempt += 1) {
      var res = await requestJson('/api/premium/vedic/status?reportId=' + encodeURIComponent(state.reportId), { method: 'GET' });
      var data = res.data || {};

      if (!res.ok || !data || !data.ok) {
        if (attempt > 4) {
          setError(String(data.message || '리포트 상태 조회에 실패했습니다.'));
          return false;
        }
        await delay(POLL_INTERVAL_MS);
        continue;
      }

      state.mode = String(data.mode || state.mode || 'personal');
      state.downloadUrl = String(data.downloadUrl || state.downloadUrl || '');
      setLoadingProgress(data);

      if (String(data.status) === 'completed') {
        state.chapters = Array.isArray(data.chapters) ? data.chapters : [];
        renderResultScreen();
        return true;
      }

      if (String(data.status) === 'failed') {
        setError(String(data.errorMessage || data.message || '리포트 생성에 실패했습니다.'));
        return false;
      }

      await delay(POLL_INTERVAL_MS);
    }

    setError('생성 시간이 길어지고 있습니다. 잠시 후 다시 시도해 주세요.');
    return false;
  }

  function updateStartUi() {
    var profile = getActiveProfile();
    var summary = qs('vdProfileSummary');
    if (summary) summary.textContent = formatProfileSummary(profile);

    var cta = qs('vdStartBtn');
    var mode = getSelectedMode();
    if (cta) cta.textContent = mode === 'compatibility' ? '💞 베다 궁합 리포트 생성하기' : '🪷 베다 인생 총람 생성하기';
  }

  function applyActiveProfileArg(profileArg) {
    if (!profileArg || !profileArg.birth) return;
    var birth = profileArg.birth;
    if (!(Number(birth.year) > 0 && Number(birth.month) > 0 && Number(birth.day) > 0)) return;
    try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
  }

  window.openVedicBookModal = function (profileArg) {
    var modal = qs('vedicBookModal');
    if (!modal) return;

    applyActiveProfileArg(profileArg);

    ensureModeUi();
    updateStartUi();
    showOnly(hasProfile() ? 'vdStartScreen' : 'vdNoProfileScreen');
    modal.style.display = 'flex';
    modal.style.zIndex = '100120';
    document.body.style.overflow = 'hidden';
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
  };

  window.openVedicPremiumModal = function () { window.openVedicBookModal(); };

  window.closeVedicBookModal = function () {
    var modal = qs('vedicBookModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.generateVedicBook = async function () {
    if (state.generating) {
      notify('이미 리포트를 생성 중입니다.');
      return;
    }
    if (!hasProfile()) {
      showOnly('vdNoProfileScreen');
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

    showOnly('vdLoadingScreen');
    setLoadingProgress({ currentChapter: 1, status: 'generating', message: '베다 원본 데이터를 검증하는 중...' });

    var res = await requestJson('/api/premium/vedic/generate', {
      method: 'POST',
      body: requestInput.body
    });

    if (!res.ok || !res.data || !res.data.ok) {
      state.generating = false;
      setError(String(res.data && res.data.message || '베다 리포트 생성 시작에 실패했습니다.'));
      return;
    }

    state.reportId = String(res.data.reportId || '');
    state.mode = String(res.data.mode || state.mode || 'personal');
    state.downloadUrl = String(res.data.downloadUrl || '');

    if (!state.reportId) {
      state.generating = false;
      setError('reportId를 받지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    var done = await pollStatusLoop();
    state.generating = false;
    if (!done && qs('vdLoadingScreen') && qs('vdLoadingScreen').style.display !== 'none') {
      setError('리포트 생성 중 문제가 발생했습니다.');
    }
  };

  window.downloadVedicBookPdf = function () {
    if (state.generating) {
      notify('아직 생성 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (!state.reportId) {
      notify('다운로드할 리포트를 찾을 수 없습니다.');
      return;
    }
    var url = state.downloadUrl || ('/api/premium/vedic/download?reportId=' + encodeURIComponent(state.reportId));
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  window.gotoVedicPremium = function () {
    window.openVedicBookModal();
  };

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;

    var actionEl = target.closest('[data-action]');
    if (actionEl) {
      var action = actionEl.getAttribute('data-action');
      if (action === 'closeVedicBookModal') {
        window.closeVedicBookModal();
        return;
      }
    }

    var tocBtn = target.closest('[data-vd-chapter]');
    if (tocBtn) {
      var chapter = String(tocBtn.getAttribute('data-vd-chapter') || '').trim();
      var article = chapter ? document.querySelector('[data-vd-article="' + chapter + '"]') : null;
      if (article && typeof article.scrollIntoView === 'function') {
        article.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
  }, false);

  document.addEventListener('change', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    if (target.matches('input[name="vdReportMode"]')) {
      updateStartUi();
    }
  }, false);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var modal = qs('vedicBookModal');
    if (modal && modal.style.display !== 'none') window.closeVedicBookModal();
  });

  function init() {
    ensureModeUi();
    updateStartUi();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();