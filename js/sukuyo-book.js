(function () {
  'use strict';

  var TOTAL_CHAPTERS = 12;
  var API_TIMEOUT_MS = 360000;
  var LOADING_QUOTES = [
    '숙요 27수 좌표를 정밀 정렬하는 중입니다...',
    '관계 거리와 역할 역학을 교차 검증하고 있습니다...',
    '달의 리듬 데이터를 챕터 문맥으로 직조하는 중입니다...',
    '챕터별 해석 품질을 점검하고 보정하고 있습니다...'
  ];

  var SUKUYO_COIN_BASE_COST = 390;
  var SUKUYO_COIN_COMPAT_EXTRA_COST = 100;
  var SUKUYO_COIN_FEATURE_KEY = 'premium-sukuyo-report';
  var SUKUYO_COIN_FEATURE_KEY_COMPAT = 'premium-sukuyo-report-compat';
  var SUKUYO_COIN_REASON = '숙요점 프리미엄 PDF 리포트 생성';
  var SUKUYO_COIN_REASON_COMPAT = '숙요점 프리미엄 PDF 궁합 리포트 생성';

  var SUKUYO_LOADING_FLOW = [
    '본명숙과 월령 좌표를 정렬하는 중입니다...',
    '27수 기질 패턴을 해석하는 중입니다...',
    '관계 거리와 감정 리듬을 계산하는 중입니다...',
    '갈등 완화 포인트를 추출하는 중입니다...',
    '재물·건강 흐름을 정리하는 중입니다...',
    '관계 유지 전략을 구성하는 중입니다...',
    '위기 구간 대응 전술을 작성하는 중입니다...',
    '장기 관계 안정성 지표를 검토하는 중입니다...',
    '실천 루틴과 생활 가이드를 정리하는 중입니다...',
    '운세 전환 구간을 요약하는 중입니다...',
    '핵심 통찰과 조언을 교차 검증하는 중입니다...',
    '숙요 리포트 최종 편집을 진행하는 중입니다...'
  ];

  var state = {
    generating: false,
    mode: 'personal',
    reportSessionId: '',
    reportId: '',
    chapterTexts: {},
    chapterMeta: {},
    fakeProgressTimer: null,
    fakeProgress: 0,
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
    if (controller) {
      timer = setTimeout(function () { controller.abort(); }, API_TIMEOUT_MS);
    }

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
      return { ok: false, status: 0, data: { ok: false, message: String(error && error.message || '요청 중 오류가 발생했습니다.') }, response: null };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function showOnly(screenId) {
    var screens = ['skStartScreen', 'skLoadingScreen', 'skResultScreen', 'skErrorScreen', 'skNoProfileScreen'];
    for (var i = 0; i < screens.length; i += 1) {
      var el = qs(screens[i]);
      if (el) el.style.display = screens[i] === screenId ? '' : 'none';
    }
  }

  function chapterCount() {
    var count = 0;
    for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) {
      if (String(state.chapterTexts[i] || '').trim()) count += 1;
    }
    return count;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function markdownToHtml(markdown) {
    var lines = String(markdown || '').replace(/\r/g, '').split('\n');
    var out = [];
    var inList = false;

    function closeList() {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
    }

    for (var i = 0; i < lines.length; i += 1) {
      var line = String(lines[i] || '').trim();
      if (!line) {
        closeList();
        continue;
      }
      if (/^###\s+/.test(line)) {
        closeList();
        out.push('<h3>' + escapeHtml(line.replace(/^###\s+/, '')) + '</h3>');
        continue;
      }
      if (/^##\s+/.test(line)) {
        closeList();
        out.push('<h2>' + escapeHtml(line.replace(/^##\s+/, '')) + '</h2>');
        continue;
      }
      if (/^#\s+/.test(line)) {
        closeList();
        out.push('<h1>' + escapeHtml(line.replace(/^#\s+/, '')) + '</h1>');
        continue;
      }
      if (/^-\s+/.test(line)) {
        if (!inList) {
          out.push('<ul>');
          inList = true;
        }
        out.push('<li>' + escapeHtml(line.replace(/^-\s+/, '')) + '</li>');
        continue;
      }
      if (/^>\s*/.test(line)) {
        closeList();
        out.push('<blockquote>' + escapeHtml(line.replace(/^>\s*/, '')) + '</blockquote>');
        continue;
      }
      closeList();
      out.push('<p>' + escapeHtml(line) + '</p>');
    }

    closeList();
    return out.join('\n');
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
    var time = Number.isFinite(Number(b.hour))
      ? String(Number(b.hour)).padStart(2, '0') + ':' + String(Number(b.minute || 0)).padStart(2, '0')
      : '시각 미상';
    var cal = String(b.calType || b.calendarType || 'solar').toLowerCase();
    var calLabel = cal === 'lunar' ? '음력' : (cal === 'lunar_leap' ? '음력(윤달)' : '양력');
    return [
      String(profile.name || '사용자') + ' · ' + date,
      calLabel + ' · ' + time
    ].join(' · ');
  }

  function readPartnerInput() {
    var dateRaw = String((qs('skPartnerBirthDate') && qs('skPartnerBirthDate').value) || '').trim();
    var dm = dateRaw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!dm) return null;

    var calType = 'solar';
    var radio = document.querySelector('input[name="skPartnerCalType"]:checked');
    if (radio && radio.value) calType = String(radio.value);

    var gender = 'female';
    var gM = qs('skPartnerGenderM');
    if (gM && gM.classList.contains('on')) gender = 'male';

    return {
      partnerName: String((qs('skPartnerName') && qs('skPartnerName').value) || '').trim() || '상대',
      partnerYear: Number(dm[1]),
      partnerMonth: Number(dm[2]),
      partnerDay: Number(dm[3]),
      partnerHour: Number((qs('skPartnerHour') && qs('skPartnerHour').value) || 12),
      partnerMinute: Number((qs('skPartnerMinute') && qs('skPartnerMinute').value) || 0),
      partnerCalType: calType,
      partnerGender: gender
    };
  }

  function resolveMode() {
    return readPartnerInput() ? 'compatibility' : 'personal';
  }

  function buildRequestBody() {
    var profile = getActiveProfile() || {};
    var birth = profile.birth || {};
    var mode = resolveMode();
    var body = {
      name: String(profile.name || '사용자'),
      gender: String(profile.gender || ''),
      year: Number(birth.year || 0),
      month: Number(birth.month || 0),
      day: Number(birth.day || 0),
      hour: Number(Number.isFinite(Number(birth.hour)) ? birth.hour : 12),
      minute: Number(Number.isFinite(Number(birth.minute)) ? birth.minute : 0),
      calType: String(birth.calType || birth.calendarType || 'solar'),
      timezoneName: 'Asia/Seoul',
      mode: mode,
      reportMode: mode,
      reportType: mode
    };

    if (mode === 'compatibility') {
      var partner = readPartnerInput();
      if (partner) {
        body.partnerName = partner.partnerName;
        body.partnerYear = partner.partnerYear;
        body.partnerMonth = partner.partnerMonth;
        body.partnerDay = partner.partnerDay;
        body.partnerHour = partner.partnerHour;
        body.partnerMinute = partner.partnerMinute;
        body.partnerCalType = partner.partnerCalType;
        body.partnerGender = partner.partnerGender;
      }
    }

    return body;
  }

  function setError(message) {
    var msg = qs('skErrorMsg');
    if (msg) msg.textContent = String(message || '생성 중 오류가 발생했습니다.');
    showOnly('skErrorScreen');
  }

  function resetDots(activeChapter) {
    var dots = qsa(qs('sukuyoBookModal'), '.sk-ch-dot');
    for (var i = 0; i < dots.length; i += 1) {
      var dot = dots[i];
      var ch = Number(dot.getAttribute('data-skch') || 0);
      dot.classList.remove('lb-ch-dot--pending', 'lb-ch-dot--active', 'lb-ch-dot--done');
      if (ch < 1 || ch > TOTAL_CHAPTERS) {
        dot.style.display = 'none';
        continue;
      }
      dot.style.display = '';
      if (ch < activeChapter) dot.classList.add('lb-ch-dot--done');
      else if (ch === activeChapter) dot.classList.add('lb-ch-dot--active');
      else dot.classList.add('lb-ch-dot--pending');
    }
  }

  function setLoadingProgress(chapter, status) {
    var safeChapter = Math.max(1, Math.min(TOTAL_CHAPTERS, Number(chapter || 1)));
    var completed = Math.max(0, Math.min(TOTAL_CHAPTERS, chapterCount()));
    var ratio = TOTAL_CHAPTERS > 0 ? (completed / TOTAL_CHAPTERS) : 0;
    var statusToken = String(status || 'generating').toLowerCase();
    var subtitle = statusToken === 'completed'
      ? '숙요 리포트 최종 편집을 마무리하는 중입니다...'
      : String(SUKUYO_LOADING_FLOW[Math.max(0, Math.min(SUKUYO_LOADING_FLOW.length - 1, safeChapter - 1))] || '숙요 챕터를 생성하는 중입니다...');
    var progressBar = qs('skProgressBar');
    var progressText = qs('skProgressText');
    var chapterNum = qs('skLoadingChapterNum');
    var chapterLabel = qs('skLoadingChapter');
    var quote = qs('skMysticQuote');

    if (progressBar) progressBar.style.width = String(Math.max(state.fakeProgress, Math.round(ratio * 100))) + '%';
    if (progressText) progressText.textContent = completed + ' / ' + TOTAL_CHAPTERS + ' 챕터';
    if (chapterNum) chapterNum.textContent = 'Chapter ' + safeChapter;
    if (chapterLabel) chapterLabel.textContent = subtitle || '숙요 챕터 해석을 생성하는 중...';
    if (quote) quote.textContent = LOADING_QUOTES[(safeChapter - 1) % LOADING_QUOTES.length];
    resetDots(safeChapter);
  }

  function startFakeProgress() {
    stopFakeProgress();
    state.fakeProgress = 2;
    state.fakeProgressTimer = setInterval(function () {
      state.fakeProgress = Math.min(92, state.fakeProgress + 2);
      setLoadingProgress(1, '숙요 데이터를 정규화하는 중...');
    }, 1200);
  }

  function stopFakeProgress() {
    if (state.fakeProgressTimer) {
      clearInterval(state.fakeProgressTimer);
      state.fakeProgressTimer = null;
    }
  }

  function setModeText(mode) {
    var modal = qs('sukuyoBookModal');
    if (!modal) return;
    var subtitle = modal.querySelector('.lb-modal__subtitle');
    var cta = qs('skStartBtn');
    var note = modal.querySelector('.lb-start__note');
    var chapterLabel = modal.querySelector('.lb-start__ch-label');
    var heroDesc = modal.querySelector('.lb-start__desc');
    var modeTitle = mode === 'compatibility' ? '궁합 리포트' : '인생 리포트';
    if (subtitle) subtitle.textContent = '불교 밀교 비전 27수 기반 12챕터 달빛 ' + modeTitle;
    if (cta) cta.textContent = mode === 'compatibility' ? '💞 숙요 궁합 리포트 생성하기' : '💫 숙요 인생 리포트 생성하기';
    if (note) note.textContent = '생성까지 약 4~8분 소요 · 완료 후 다운로드 가능';
    if (chapterLabel) chapterLabel.textContent = '📖 12챕터 구성';
    if (heroDesc) heroDesc.innerHTML = mode === 'compatibility'
      ? '두 사람의 27수 좌표를 정밀 분석해<br>관계 거리와 역할을 12챕터로 해석합니다'
      : '27수 본명숙과 달의 리듬을 기반으로<br>당신의 인생 흐름을 12챕터로 해석합니다';

    var chapterItems = qsa(modal, '.lb-start__ch-item');
    for (var i = 0; i < chapterItems.length; i += 1) {
      chapterItems[i].style.display = i < TOTAL_CHAPTERS ? '' : 'none';
    }
    var resultTitle = qs('skResultName');
    if (resultTitle && !resultTitle.textContent) resultTitle.textContent = mode === 'compatibility' ? '숙요 궁합 리포트' : '숙요 인생 리포트';
  }

  function renderResultScreen() {
    var toc = qs('skToc');
    var content = qs('skChapterContent');
    var resultName = qs('skResultName');
    var resultDate = qs('skResultDate');
    if (!toc || !content) return;

    var modeTitle = state.mode === 'compatibility' ? '숙요 궁합 리포트' : '숙요 인생 리포트';
    if (resultName) resultName.textContent = modeTitle;
    if (resultDate) {
      var d = new Date();
      resultDate.textContent = d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
    }

    var tocHtml = [];
    var articleHtml = [];
    for (var i = 1; i <= TOTAL_CHAPTERS; i += 1) {
      var text = String(state.chapterTexts[i] || '').trim();
      if (!text) continue;
      var meta = state.chapterMeta[i] || {};
      var title = String(meta.title || ('Chapter ' + i));
      tocHtml.push('<button type="button" class="lb-toc-item" data-sk-chapter="' + i + '"><span>Ch.' + i + '</span><strong>' + escapeHtml(title) + '</strong></button>');
      articleHtml.push(
        '<article class="lb-result-article" data-sk-article="' + i + '">'
        + '<p class="lb-result-article__chapter">CHAPTER ' + i + '</p>'
        + '<h3 class="lb-result-article__title">' + escapeHtml(title) + '</h3>'
        + '<div class="lb-result-article__body">' + markdownToHtml(text) + '</div>'
        + '</article>'
      );
    }

    toc.innerHTML = tocHtml.join('');
    content.innerHTML = articleHtml.join('');
    showOnly('skResultScreen');
  }

  async function fetchStatusWithTexts() {
    if (!state.reportSessionId) return { ok: false, message: 'reportSessionId가 없습니다.' };
    var url = '/api/premium/syukyo/status?reportSessionId=' + encodeURIComponent(state.reportSessionId) + '&includeText=1';
    var res = await requestJson(url, { method: 'GET' });
    if (!res.ok || !res.data || !res.data.ok) {
      return { ok: false, message: String(res.data && res.data.message || '상태 조회에 실패했습니다.') };
    }

    var rows = Array.isArray(res.data.chapters) ? res.data.chapters : [];
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i] || {};
      var chapter = Number(row.chapter || 0);
      if (chapter < 1 || chapter > TOTAL_CHAPTERS) continue;
      if (typeof row.text === 'string' && row.text.trim()) {
        state.chapterTexts[chapter] = row.text;
      }
      state.chapterMeta[chapter] = {
        title: String(row.title || ('Chapter ' + chapter)),
        subtitle: String(row.subtitle || '')
      };
    }

    if (res.data.reportId) state.reportId = String(res.data.reportId);
    return { ok: true, data: res.data };
  }

  function resetStateForGenerate() {
    state.chapterTexts = {};
    state.chapterMeta = {};
    state.reportSessionId = '';
    state.reportId = '';
    state.fakeProgress = 0;
    resetDots(1);
    var progressBar = qs('skProgressBar');
    var progressText = qs('skProgressText');
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0 / ' + TOTAL_CHAPTERS + ' 챕터';
  }

  function buildSukuyoGateKey(body) {
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

  function resolveSukuyoCoinPolicy(body) {
    var mode = String(body && body.mode || 'personal');
    var isCompat = mode === 'compatibility';
    return {
      cost: SUKUYO_COIN_BASE_COST + (isCompat ? SUKUYO_COIN_COMPAT_EXTRA_COST : 0),
      featureKey: isCompat ? SUKUYO_COIN_FEATURE_KEY_COMPAT : SUKUYO_COIN_FEATURE_KEY,
      reason: isCompat ? SUKUYO_COIN_REASON_COMPAT : SUKUYO_COIN_REASON,
      modeLabel: isCompat ? '궁합' : '개인'
    };
  }

  function extractCoinGatePayload(data) {
    if (data && typeof data.data === 'object') return data.data;
    return data || {};
  }

  async function attemptSukuyoAutoRefund(reason) {
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
          reason: String(reason || '숙요 프리미엄 PDF 생성 실패 자동 환불')
        }
      });

      var payload = refundRes.data || {};
      var code = String(payload.code || '').toUpperCase();
      if (refundRes.ok || code === 'REFUND_ALREADY_PROCESSED') {
        state.paymentContext = null;
        state.paidGateKey = '';
        return true;
      }

      console.warn('[SukuyoBook] auto refund failed:', payload);
      return false;
    } catch (error) {
      console.warn('[SukuyoBook] auto refund exception:', error);
      return false;
    } finally {
      state.refundInFlight = false;
    }
  }

  async function ensureSukuyoCoinGate(body) {
    var gateKey = buildSukuyoGateKey(body);
    if (state.paidGateKey && state.paidGateKey === gateKey) return true;
    var policy = resolveSukuyoCoinPolicy(body);

    try {
      if (window.__cdAdminBypass === true) {
        state.paidGateKey = gateKey;
        return true;
      }
    } catch (_) {}

    if (!window.confirm('🪙 숙요 프리미엄 ' + policy.modeLabel + ' 리포트 생성\n이용 시 ' + policy.cost + '코인이 차감됩니다.\n지금 생성하시겠습니까?')) {
      return false;
    }

    var requestId = 'premium-sukuyo:' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
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
          reason: '로그인 후 숙요 프리미엄 리포트를 생성할 수 있습니다.',
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

    state.paidGateKey = gateKey;
    return true;
  }

  async function generateSukuyoBookImpl() {
    if (state.generating) return;
    if (!hasProfile()) {
      showOnly('skNoProfileScreen');
      return;
    }

    var partner = readPartnerInput();
    state.mode = partner ? 'compatibility' : 'personal';
    setModeText(state.mode);

    if (state.mode === 'compatibility' && !partner) {
      setError('궁합 리포트는 상대방 생년월일을 입력해야 생성할 수 있습니다.');
      return;
    }

    var payload = buildRequestBody();
    var gateOk = await ensureSukuyoCoinGate(payload);
    if (!gateOk) return;

    state.generating = true;
    resetStateForGenerate();
    showOnly('skLoadingScreen');
    startFakeProgress();
    setLoadingProgress(1, 'generating');

    try {
      var genRes = await requestJson('/api/premium/syukyo/generate', {
        method: 'POST',
        body: {
          requestBody: payload,
          maxAttemptsPerChapter: 2,
          stopOnFailure: true
        }
      });

      if (!genRes.ok || !genRes.data || !genRes.data.ok) {
        await attemptSukuyoAutoRefund('숙요 프리미엄 PDF 생성 실패 자동 환불');
        throw new Error(String(genRes.data && genRes.data.message || '리포트 생성에 실패했습니다.'));
      }

      state.reportSessionId = String(genRes.data.reportSessionId || genRes.data.generationId || '').trim();
      state.reportId = String(genRes.data.reportId || '').trim();

      var status = await fetchStatusWithTexts();
      if (!status.ok) throw new Error(status.message || '리포트 상태 조회에 실패했습니다.');

      state.fakeProgress = 100;
  setLoadingProgress(TOTAL_CHAPTERS, 'completed');
      state.paymentContext = null;
      renderResultScreen();
      notify('숙요 리포트 생성이 완료되었습니다.');
    } catch (error) {
      console.error('[SukuyoBook] generate failed:', error);
      await attemptSukuyoAutoRefund('숙요 프리미엄 PDF 생성 미완료 자동 환불');
      setError(String(error && error.message || '생성 중 오류가 발생했습니다.'));
    } finally {
      stopFakeProgress();
      state.generating = false;
    }
  }

  async function downloadSukuyoBookImpl() {
    if (!state.reportSessionId) {
      notify('먼저 리포트를 생성해 주세요.');
      return;
    }

    var token = getAuthToken();
    var headers = new Headers();
    if (token) headers.set('Authorization', 'Bearer ' + token);

    var url = '/api/premium/syukyo/download?reportSessionId=' + encodeURIComponent(state.reportSessionId);
    var res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: headers
    });

    if (!res.ok) {
      var errData = null;
      try { errData = await res.json(); } catch (_) { errData = null; }
      throw new Error(String(errData && errData.message || '다운로드 생성에 실패했습니다.'));
    }

    var blob = await res.blob();
    var objectUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'syukyo-' + (state.reportId || Date.now()) + '.md';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(objectUrl);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 0);
    notify('리포트 파일을 다운로드했습니다.');
  }

  function applyBaseUi() {
    var profile = getActiveProfile();
    var summary = qs('skProfileSummary');
    if (summary) summary.textContent = formatProfileSummary(profile);

    var hourSel = qs('skPartnerHour');
    var minSel = qs('skPartnerMinute');
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

    var gF = qs('skPartnerGenderF');
    var gM = qs('skPartnerGenderM');
    if (gF && gM) {
      gF.onclick = function () {
        gF.classList.add('on');
        gM.classList.remove('on');
      };
      gM.onclick = function () {
        gM.classList.add('on');
        gF.classList.remove('on');
      };
    }

    state.mode = resolveMode();
    setModeText(state.mode);
    resetDots(1);
  }

  function applyActiveProfileArg(profileArg) {
    if (!profileArg || !profileArg.birth) return;
    var birth = profileArg.birth;
    if (!(Number(birth.year) > 0 && Number(birth.month) > 0 && Number(birth.day) > 0)) return;
    try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
  }

  window.openSukuyoBookModal = function (profileArg) {
    var modal = qs('sukuyoBookModal');
    if (!modal) return;
    applyActiveProfileArg(profileArg);
    applyBaseUi();
    showOnly(hasProfile() ? 'skStartScreen' : 'skNoProfileScreen');
    modal.style.display = 'flex';
    modal.style.zIndex = '100120';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-modal-open');
    try { modal.setAttribute('aria-hidden', 'false'); } catch (_) {}
  };

  window.closeSukuyoBookModal = function () {
    var modal = qs('sukuyoBookModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
    stopFakeProgress();
    try { modal.setAttribute('aria-hidden', 'true'); } catch (_) {}
  };

  window.generateSukuyoBook = function () {
    generateSukuyoBookImpl().catch(function (error) {
      console.error('[SukuyoBook] generate crash:', error);
      setError(String(error && error.message || '생성 중 오류가 발생했습니다.'));
    });
  };

  window.downloadSukuyoBookPdf = function () {
    downloadSukuyoBookImpl().catch(function (error) {
      console.error('[SukuyoBook] download failed:', error);
      notify(String(error && error.message || '다운로드에 실패했습니다.'));
    });
  };

  window.gotoSukuyoPremium = function () {
    window.openSukuyoBookModal();
  };

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;

    var btn = target.closest('[data-action]');
    if (btn) {
      var action = btn.getAttribute('data-action');
      if (action === 'closeSukuyoBookModal') {
        window.closeSukuyoBookModal();
        return;
      }
    }

    var tocItem = target.closest('.lb-toc-item[data-sk-chapter]');
    if (tocItem) {
      var chapter = Number(tocItem.getAttribute('data-sk-chapter') || 0);
      if (chapter > 0) {
        var article = qs('skChapterContent');
        var targetArticle = article ? article.querySelector('[data-sk-article="' + chapter + '"]') : null;
        if (targetArticle && typeof targetArticle.scrollIntoView === 'function') {
          targetArticle.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }, false);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var modal = qs('sukuyoBookModal');
    if (modal && modal.style.display !== 'none') window.closeSukuyoBookModal();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBaseUi, { once: true });
  } else {
    applyBaseUi();
  }
})();