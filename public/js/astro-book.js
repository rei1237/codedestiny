(function () {
  'use strict';

  var TOTAL_CHAPTERS = 12;
  var API_TIMEOUT_MS = 360000;
  var POLL_INTERVAL_MS = 1800;
  var LOADING_QUOTES = [
    '행성 좌표와 하우스 축을 교차 검증하는 중입니다...',
    '챕터별 점성술 근거 데이터를 정리하는 중입니다...',
    '관계/커리어/생활 적용 전략을 다듬는 중입니다...',
    '최종 실행 플랜 문장을 구성하는 중입니다...'
  ];

  var PERSONAL_CHAPTER_PREVIEW = [
    '기본 차트 요약',
    '자아와 정체성',
    '감정과 무의식',
    '사고/소통 스타일',
    '사랑/관계 스타일',
    '행동/에너지 패턴',
    '확장/행운 포인트',
    '책임/성취 구조',
    '변화/성장 트리거',
    '영혼 과제/노드 축',
    '커리어/사회적 포지션',
    '연간 흐름/실행 로드맵'
  ];

  var COMPAT_CHAPTER_PREVIEW = [
    '두 사람의 관계 총론',
    '태양/달 페어링',
    '금성/화성 케미',
    '수성/소통 호환',
    '갈등 트리거/힐링',
    '장기 안정성',
    '친밀도/성적 리듬',
    '결혼/동거 현실성',
    '재정/커리어 합',
    '자녀/가정 운영',
    '위기 시나리오',
    '관계 운영 마스터 플랜'
  ];

  var ASTRO_COIN_BASE_COST = 390;
  var ASTRO_COIN_COMPAT_EXTRA_COST = 100;
  var ASTRO_COIN_FEATURE_KEY = 'premium-astrology-report';
  var ASTRO_COIN_FEATURE_KEY_COMPAT = 'premium-astrology-report-compat';
  var ASTRO_COIN_REASON = '점성술 프리미엄 PDF 리포트 생성';
  var ASTRO_COIN_REASON_COMPAT = '점성술 프리미엄 PDF 궁합 리포트 생성';

  var ASTRO_LOADING_FLOW_PERSONAL = [
    '출생 차트의 기준 축을 정렬하고 있습니다...',
    '태양·달·상승궁의 핵심 에너지를 해석하는 중입니다...',
    '행성 간 각도를 정밀 계산해 관계를 분석하는 중입니다...',
    '사랑·관계 패턴 챕터를 구성하는 중입니다...',
    '커리어·성취 흐름 챕터를 다듬는 중입니다...',
    '재정·기회 구간의 타이밍을 정리하는 중입니다...',
    '변화 트리거와 전환 신호를 분석하는 중입니다...',
    '갈등 완화·리스크 관리 포인트를 추출하는 중입니다...',
    '생활 루틴 최적화 조언을 생성하는 중입니다...',
    '영혼 과제와 노드 축 해석을 정리하는 중입니다...',
    '연간 운세 흐름과 실천 로드맵을 연결하는 중입니다...',
    '최종 코즈믹 리포트 문장을 검수하는 중입니다...'
  ];

  var ASTRO_LOADING_FLOW_COMPAT = [
    '두 사람의 기준 차트를 동기화하고 있습니다...',
    '태양·달 조합의 정서 호흡을 분석하는 중입니다...',
    '금성·화성 케미스트리를 정밀 해석하는 중입니다...',
    '소통 스타일과 오해 패턴을 점검하는 중입니다...',
    '갈등 트리거와 회복 루틴을 구성하는 중입니다...',
    '장기 안정성·신뢰 지표를 계산하는 중입니다...',
    '친밀도와 관계 리듬을 분석하는 중입니다...',
    '동거·결혼 현실성 챕터를 작성하는 중입니다...',
    '재정·커리어 합을 정리하는 중입니다...',
    '가정 운영과 장기 계획을 연결하는 중입니다...',
    '위기 시나리오별 대응 전략을 도출하는 중입니다...',
    '관계 운영 마스터 플랜을 완성하는 중입니다...'
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
    refundInFlight: false
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
    var checked = document.querySelector('input[name="abReportMode"]:checked');
    var mode = checked ? String(checked.value || '') : 'personal';
    return mode === 'compatibility' ? 'compatibility' : 'personal';
  }

  function ensureModeUi() {
    var startScreen = qs('abStartScreen');
    if (!startScreen) return;
    if (qs('abModePanel')) return;

    var panel = document.createElement('div');
    panel.id = 'abModePanel';
    panel.style.cssText = 'margin:14px 0 12px;padding:14px;border:1px solid rgba(251,191,36,0.35);border-radius:12px;background:rgba(27,12,4,0.45);';
    panel.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">',
      '  <strong style="font-size:13px;color:#fde68a;">리포트 모드</strong>',
      '  <div style="display:flex;gap:10px;align-items:center;">',
      '    <label style="display:flex;gap:6px;align-items:center;font-size:12px;color:#fef3c7;cursor:pointer;">',
      '      <input type="radio" name="abReportMode" value="personal" checked> 개인',
      '    </label>',
      '    <label style="display:flex;gap:6px;align-items:center;font-size:12px;color:#fef3c7;cursor:pointer;">',
      '      <input type="radio" name="abReportMode" value="compatibility"> 궁합',
      '    </label>',
      '  </div>',
      '</div>',
      '<div id="abPartnerWrap" style="display:none;margin-top:12px;border-top:1px dashed rgba(251,191,36,0.35);padding-top:12px;">',
      '  <p style="margin:0 0 10px;font-size:12px;color:#fde68a;">궁합 모드는 상대 생년월일이 필요합니다. (시간 미상 시 12:00 권장)</p>',
      '  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">',
      '    <input id="abPartnerName" type="text" placeholder="상대 이름" style="padding:10px;border-radius:10px;border:1px solid rgba(251,191,36,0.35);background:#1a0f06;color:#fff;">',
      '    <input id="abPartnerBirthDate" type="date" style="padding:10px;border-radius:10px;border:1px solid rgba(251,191,36,0.35);background:#1a0f06;color:#fff;">',
      '    <input id="abPartnerHour" type="number" min="0" max="23" value="12" placeholder="시(0~23)" style="padding:10px;border-radius:10px;border:1px solid rgba(251,191,36,0.35);background:#1a0f06;color:#fff;">',
      '    <input id="abPartnerMinute" type="number" min="0" max="59" value="0" placeholder="분(0~59)" style="padding:10px;border-radius:10px;border:1px solid rgba(251,191,36,0.35);background:#1a0f06;color:#fff;">',
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
      var wrap = qs('abPartnerWrap');
      if (!wrap) return;
      wrap.style.display = getSelectedMode() === 'compatibility' ? '' : 'none';
    }

    var radios = qsa(panel, 'input[name="abReportMode"]');
    for (var i = 0; i < radios.length; i += 1) {
      radios[i].addEventListener('change', syncPartnerVisibility);
    }
    syncPartnerVisibility();
  }

  function readPartnerInput() {
    var dateRaw = String((qs('abPartnerBirthDate') && qs('abPartnerBirthDate').value) || '').trim();
    var dm = dateRaw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!dm) return null;
    var hour = Number((qs('abPartnerHour') && qs('abPartnerHour').value) || 12);
    var minute = Number((qs('abPartnerMinute') && qs('abPartnerMinute').value) || 0);
    return {
      name: String((qs('abPartnerName') && qs('abPartnerName').value) || '').trim() || '상대',
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
    var labels = mode === 'compatibility' ? COMPAT_CHAPTER_PREVIEW : PERSONAL_CHAPTER_PREVIEW;
    var modal = qs('astroBookModal');
    var dots = qsa(modal, '.ab-ch-dot');
    for (var i = 0; i < dots.length; i += 1) {
      var chapter = Number(dots[i].getAttribute('data-abch') || 0);
      if (chapter >= 1 && chapter <= labels.length) {
        dots[i].setAttribute('title', 'Ch.' + chapter + ' ' + labels[chapter - 1]);
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
    var flow = state.mode === 'compatibility' ? ASTRO_LOADING_FLOW_COMPAT : ASTRO_LOADING_FLOW_PERSONAL;
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
    var mode = String(b.mode || 'personal');
    var chunks = [
      mode,
      Number(b.year || 0), Number(b.month || 0), Number(b.day || 0),
      Number(b.hour || 12), Number(b.minute || 0)
    ];
    if (mode === 'compatibility') {
      chunks.push(
        Number(b.partnerYear || 0), Number(b.partnerMonth || 0), Number(b.partnerDay || 0),
        Number(b.partnerHour || 12), Number(b.partnerMinute || 0)
      );
    }
    return chunks.join('|');
  }

  function resolveAstroCoinPolicy(body) {
    var mode = String(body && body.mode || 'personal');
    var isCompat = mode === 'compatibility';
    return {
      cost: ASTRO_COIN_BASE_COST + (isCompat ? ASTRO_COIN_COMPAT_EXTRA_COST : 0),
      featureKey: isCompat ? ASTRO_COIN_FEATURE_KEY_COMPAT : ASTRO_COIN_FEATURE_KEY,
      reason: isCompat ? ASTRO_COIN_REASON_COMPAT : ASTRO_COIN_REASON,
      modeLabel: isCompat ? '궁합' : '개인'
    };
  }

  function extractCoinGatePayload(data) {
    if (data && typeof data.data === 'object') return data.data;
    return data || {};
  }

  async function attemptAstroAutoRefund(reason) {
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
    var consume = payload && typeof payload.consume === 'object' ? payload.consume : {};
    state.paymentContext = {
      featureKey: String(policy.featureKey || ''),
      cost: Number(policy.cost || 0),
      requestId: String(requestId || ''),
      sourceTransactionId: String(consume.transactionId || payload.transactionId || ''),
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

  function renderResultScreen() {
    var toc = qs('abToc');
    var content = qs('abChapterContent');
    var name = qs('abResultName');
    var date = qs('abResultDate');
    if (!toc || !content) return;

    var modeTitle = state.mode === 'compatibility' ? '점성술 궁합 리포트' : '점성술 개인 리포트';
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
    showOnly('abResultScreen');
  }

  function renderChapterPreviewList(mode) {
    var list = document.querySelector('#abStartScreen .lb-start__ch-list');
    if (!list) return;
    var labels = mode === 'compatibility' ? COMPAT_CHAPTER_PREVIEW : PERSONAL_CHAPTER_PREVIEW;
    list.innerHTML = labels.map(function (title, idx) {
      var chapter = idx + 1;
      return '<li class="lb-start__ch-item"><span class="lb-start__ch-num">Ch.' + chapter + '</span><span>' + escapeHtml(title) + '</span></li>';
    }).join('');
    updateDotTitles(mode);
  }

  async function pollStatusLoop() {
    for (var attempt = 0; attempt < 260; attempt += 1) {
      var res = await requestJson('/api/premium/astrology/status?reportId=' + encodeURIComponent(state.reportId) + '&includeChapters=1', { method: 'GET' });
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

    var mode = getSelectedMode();
    renderChapterPreviewList(mode);

    var cta = qs('abStartBtn');
    if (cta) cta.textContent = mode === 'compatibility' ? '💞 점성술 궁합 리포트 생성하기' : '✨ 점성술 코즈믹 차트 생성하기';
  }

  function applyActiveProfileArg(profileArg) {
    if (!profileArg || !profileArg.birth) return;
    var birth = profileArg.birth;
    if (!(Number(birth.year) > 0 && Number(birth.month) > 0 && Number(birth.day) > 0)) return;
    try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
  }

  window.openAstroBookModal = function (profileArg) {
    var modal = qs('astroBookModal');
    if (!modal) return;

    applyActiveProfileArg(profileArg);

    ensureModeUi();
    updateStartUi();
    showOnly(hasProfile() ? 'abStartScreen' : 'abNoProfileScreen');
    modal.style.display = 'flex';
    modal.style.zIndex = '100120';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-modal-open');
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
  };

  window.closeAstroBookModal = function () {
    var modal = qs('astroBookModal');
    if (!modal) return;
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

    var gateOk = await ensureAstroCoinGate(requestInput.body);
    if (!gateOk) return;

    state.generating = true;
    state.mode = String(requestInput.body.mode || 'personal');
    state.reportId = '';
    state.downloadUrl = '';
    state.chapters = [];
    state.quoteTick = 0;

    showOnly('abLoadingScreen');
    setLoadingProgress({ currentChapter: 0, status: 'generating', message: '점성술 원본 데이터를 검증하는 중...' });

    var res = await requestJson('/api/premium/astrology/generate', {
      method: 'POST',
      body: requestInput.body
    });

    if (!res.ok || !res.data || !res.data.ok) {
      await attemptAstroAutoRefund('점성술 프리미엄 PDF 생성 시작 실패 자동 환불');
      state.generating = false;
      setError(String(res.data && res.data.message || '점성술 리포트 생성 시작에 실패했습니다.'));
      return;
    }

    state.reportId = String(res.data.reportId || '');
    state.mode = String(res.data.mode || state.mode || 'personal');
    state.downloadUrl = String(res.data.downloadUrl || '');

    if (!state.reportId) {
      await attemptAstroAutoRefund('점성술 프리미엄 PDF reportId 누락 자동 환불');
      state.generating = false;
      setError('reportId를 받지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    var done = await pollStatusLoop();
    state.generating = false;
    if (!done && qs('abLoadingScreen') && qs('abLoadingScreen').style.display !== 'none') {
      setError('리포트 생성 중 문제가 발생했습니다.');
    }
  };

  window.downloadAstroBookPdf = function () {
    if (state.generating) {
      notify('아직 생성 중입니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (!state.reportId) {
      notify('다운로드할 리포트를 찾을 수 없습니다.');
      return;
    }
    var url = state.downloadUrl || ('/api/premium/astrology/download?reportId=' + encodeURIComponent(state.reportId));
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
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

  document.addEventListener('change', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    if (target.matches('input[name="abReportMode"]')) {
      updateStartUi();
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