/**
 * 점성술 코즈믹 차트 프리미엄 (Astrology Cosmic Chart — Premium Life Report)
 * CODE-DESTINY v1.0  •  열대황도 점성술 기반 13챕터 인생 총람
 */
(function () {
  'use strict';

  var ASTRO_TOTAL_CHAPTERS = 13;

  var CHAPTER_TITLES = [
    '🌌 프롤로그와 페르소나의 핵 — 우주 지도 소개 + ASC·Sun·Moon',
    '🌊 감정의 뿌리 — Moon & 4하우스, 무의식의 안전가옥',
    '🧠 사고 방식과 정보 활용 — Mercury & 3·9하우스',
    '💎 욕망의 미학과 가치 자산 — Venus & 2·7하우스',
    '⚡ 추진력의 방향과 에너지 관리 — Mars & 1·8하우스',
    '🌠 행운의 좌표와 확장의 철학 — Jupiter & 9하우스',
    '🏛️ 업보의 한계와 마스터의 길 — Saturn & 10하우스',
    '🌀 세대적 변화와 개인의 혁신 — Uranus · Neptune · Pluto',
    '🧭 영혼의 나침반 — North/South Node · Chiron',
    '🏆 직업과 사회적 성공 — MC · 10th · 6th · 2nd House',
    '💞 사랑과 관계의 패턴 — 7th House · Venus · Mars · Juno',
    '📡 현재 하늘의 메시지 — Transit·Progression·Solar Return',
    '🌟 별들의 마스터플랜 — 총결산·Master Habit·90일 실행 로드맵',
  ];

  var CHAPTER_SUBTITLES = [
    '네이탈 차트 읽는 법 프롤로그 + 상승궁·태양·달의 3각 에너지로 성격 핵심과 차트 룰러 분석',
    '달 별자리와 4하우스가 만드는 무의식의 정서 패턴·유년기 그림자·감정 치유 지도',
    '수성의 사고 지도·학습 최적화·이미지 관리 커뮤니케이션 전략',
    '금성의 욕망 코드·재물 블록·관계 끌림 패턴·풍요 전략',
    '화성의 추진 엔진·에너지 고갈 패턴·비즈니스 실행 전략',
    '목성의 황금 통로·행운 좌표·전문성 확장 로드맵',
    '토성의 삶의 과제·한계·마스터의 길·29.5년 귀환 전략',
    '외행성의 혁신 에너지·세대적 사명·창의적 발상법',
    '노드 축과 키론 기반 영혼 성장 방향·치유 과제·30일 성장 루틴',
    'MC·10하우스·6하우스·2하우스 기반 직업 성취·수입 구조·1년 전략',
    '7하우스·금성·화성·Juno 기반 사랑 패턴·장기 관계 조건·회복 대화법',
    '트랜짓·프로그레션·솔라리턴 기반 올해 흐름 및 월별 실전 전략',
    '차트 전체 요약·Master Habit·90일 실행표·최종 선언문',
  ];

  var LOADING_MSGS = [
    '프롤로그와 ASC·태양·달의 핵심 구조를 작성하는 중...',
    '달의 무의식 안전가옥과 4하우스 그림자를 분석하는 중...',
    '수성의 사고 지도와 커뮤니케이션 전략을 구성하는 중...',
    '금성의 욕망 코드와 풍요 블록을 해독하는 중...',
    '화성의 추진 엔진과 에너지 관리 전략을 설계하는 중...',
    '목성의 황금 통로와 행운 좌표를 탐색하는 중...',
    '토성의 과제와 성장의 길을 분석하는 중...',
    '외행성의 혁신 에너지와 세대적 사명을 분석하는 중...',
    '노드 축과 키론의 성장·치유 과제를 통합하는 중...',
    '직업·재물·사회적 성취 전략을 정리하는 중...',
    '사랑·관계·장기 파트너십 패턴을 해석하는 중...',
    '현재 하늘의 트랜짓·프로그레션·솔라리턴을 해석하는 중...',
    '별들의 마스터플랜과 90일 로드맵을 총결산하는 중...',
  ];

  var MYSTIC_QUOTES = [
    '태양은 의식, 달은 무의식, 상승궁은 세상이 보는 당신의 얼굴입니다.',
    '행성의 배치는 당신이 받은 우주의 초기 설정값입니다.',
    '차트 룰러의 위치가 인생의 전반적인 무대를 결정합니다.',
    '목성이 있는 하우스가 저항 없이 행운이 흘러드는 영역입니다.',
    '토성의 귀환(29.5년)은 숙제를 완성하는 우주의 마감일입니다.',
    '금성은 당신이 풍요롭다고 느끼는 방식을 결정합니다.',
    '화성이 있는 하우스에서 당신은 가장 강렬하게 싸웁니다.',
    '노스 노드는 두렵지만 반드시 나아가야 할 방향을 가리킵니다.',
    '에스펙트는 행성 간의 대화 — 조화·긴장·변형의 언어입니다.',
    '수성의 별자리가 당신이 세상을 인식하는 필터를 결정합니다.',
    '4하우스에 있는 행성이 당신의 심리적 뿌리를 말해줍니다.',
    '별들은 강요하지 않습니다. 다만 당신이 인식하지 못한 경로를 비추어줄 뿐.',
    '점성술은 운명의 지도가 아니라 내비게이션입니다.',
    '차트는 당신이 누구인지가 아니라, 어떤 가능성을 지닌 존재인지를 보여줍니다.',
  ];

  var _chapters = Array(ASTRO_TOTAL_CHAPTERS).fill(null);
  var _generating = false;
  var _currentChapter = 1;
  var _mysticTimer = null;
  var PREMIUM_ASTRO_COST = 390;
  var PREMIUM_ASTRO_FEATURE_KEY = 'premium-astrology';
  var PREMIUM_ASTRO_TX_KEY = 'cd_premium_tx_astrology';

  function _qs(id) { return document.getElementById(id); }

  function _buildApiCandidates(path) {
    var normalizedPath = String(path || '/').trim();
    if (normalizedPath[0] !== '/') normalizedPath = '/' + normalizedPath;
    var seen = Object.create(null);
    var out = [];

    function push(raw) {
      var value = String(raw || '').trim();
      if (!value || seen[value]) return;
      seen[value] = true;
      out.push(value);
    }

    push(normalizedPath);
    try {
      var base = (window && window.__CD_API_BASE_URL) ? String(window.__CD_API_BASE_URL).trim() : '';
      if (base) push(base.replace(/\/+$/, '') + normalizedPath);
    } catch (_) {}
    try {
      var origin = (window && window.location && window.location.origin) ? String(window.location.origin).trim() : '';
      if (origin) push(origin.replace(/\/+$/, '') + normalizedPath);
    } catch (_) {}

    return out;
  }

  function _autoRefundPremium(cost, featureKey, label, txStorageKey) {
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}
    if (!token) return Promise.resolve(false);

    var sourceTransactionId = '';
    try { sourceTransactionId = sessionStorage.getItem(txStorageKey) || ''; } catch (_) {}
    var requestId = 'premium-refund:' + featureKey + ':' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

    return fetch('/api/fortune/pig-coin/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({
        cost: cost,
        featureKey: featureKey,
        sourceTransactionId: sourceTransactionId || undefined,
        requestId: requestId,
        reason: label + ' 생성 실패 자동 환급',
      }),
    })
    .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; }); })
    .then(function (payload) {
      if (!payload.ok && !payload.data?.alreadyRefunded) return false;
      var pts = Number(payload.data?.user?.points);
      if (isFinite(pts)) {
        try {
          var user = JSON.parse(localStorage.getItem('fortune_auth_user') || 'null') || {};
          user.points = pts;
          localStorage.setItem('fortune_auth_user', JSON.stringify(user));
        } catch (_) {}
        if (typeof window.__cdSetGoldenBalance === 'function') window.__cdSetGoldenBalance(pts);
      }
      try { sessionStorage.removeItem(txStorageKey); } catch (_) {}
      return true;
    })
    .catch(function () { return false; });
  }

  function _applyAstroTheme(modal) {
    if (!modal || !modal.style) return;
    modal.style.setProperty('--lb-void', '#050914');
    modal.style.setProperty('--lb-deep', '#0a1226');
    modal.style.setProperty('--lb-dark', '#101b35');
    modal.style.setProperty('--lb-surface', '#1a2347');
    modal.style.setProperty('--lb-border-bright', 'rgba(250, 204, 21, 0.48)');
    modal.style.setProperty('--lb-gold', '#fde68a');
    modal.style.setProperty('--lb-gold-dim', 'rgba(253, 230, 138, 0.68)');
    modal.style.setProperty('--lb-amethyst', '#fbbf24');
    modal.style.setProperty('--lb-violet', '#1d4ed8');
    modal.style.setProperty('--lb-lilac', '#fef3c7');
    modal.style.setProperty('--lb-glow-violet', 'rgba(29, 78, 216, 0.42)');
    modal.style.setProperty('--lb-glow-gold', 'rgba(250, 204, 21, 0.42)');
  }

  function _escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _md2html(text) {
    if (!text) return '';
    var h = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    h = h.replace(/^&gt; (.+)$/gm, '<blockquote class="zb-md-blockquote">$1</blockquote>');
    h = h.replace(/<\/blockquote>\n<blockquote class="zb-md-blockquote">/g, '<br>');
    h = h.replace(/^#### (.+)$/gm, '<h4 class="zb-md-h4">$1</h4>');
    h = h.replace(/^### (.+)$/gm, '<h3 class="zb-md-h3">$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2 class="zb-md-h2">$1</h2>');
    h = h.replace(/^# (.+)$/gm, '<h1 class="zb-md-h1">$1</h1>');
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/^---+$/gm, '<hr class="zb-md-hr">');
    h = h.replace(/^[*-] (.+)$/gm, '<li class="zb-md-li">$1</li>');
    h = h.replace(/(<li[\s\S]*?<\/li>(\n|$))+/g, function(m) { return '<ul class="zb-md-ul">' + m + '</ul>'; });
    h = h.replace(/^\d+\. (.+)$/gm, '<li class="zb-md-li zb-md-oli">$1</li>');
    h = h.replace(/\n\n+/g, '\n\n');
    var lines = h.split('\n');
    var result = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) { result.push(''); continue; }
      if (/^<(h[1-4]|ul|li|hr|blockquote)/.test(line) || /<\/(h[1-4]|ul|li|hr|blockquote)>$/.test(line)) {
        result.push(line);
      } else {
        result.push('<p class="zb-md-p">' + line + '</p>');
      }
    }
    return result.join('\n');
  }

  function _getActiveBirthProfile() {
    var p = window.__cdActiveBirthProfile;
    if (p && p.birth && p.birth.year) return p;
    var snap = window.__destinyFlowerSajuSnapshot;
    if (snap && snap.birth && snap.birth.year) return snap;
    try {
      var ns = 'FORTUNE_APP_USER_PROFILES';
      var list = JSON.parse(localStorage.getItem(ns + '.list') || '[]');
      var currId = localStorage.getItem(ns + '.current');
      var match = (currId && list.find(function(p2){return p2.id===currId;})) || (list.length && list[0]) || null;
      if (match && match.birth && match.birth.year) return match;
    } catch (_) {}
    try {
      var dateEl = document.getElementById('birthDate');
      if (dateEl && dateEl.value) {
        var parts = dateEl.value.split('-');
        if (parts.length >= 3) {
          var y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
          if (y && m && d) {
            var nameEl = document.getElementById('nameInput');
            var isFemale = document.querySelector('#btnF.on') !== null;
            var hourEl = document.getElementById('birthHour');
            var minEl = document.getElementById('birthMinute');
            var countrySel = document.getElementById('birthCountry');
            var loc = { label: '대한민국 (서울)', lng: 126.978, lat: 37.5665, tz: 'Asia/Seoul', tzOffset: 9, baseTzOffset: 9 };
            if (countrySel && countrySel.selectedIndex >= 0) {
              var opt = countrySel.options[countrySel.selectedIndex];
              if (opt) loc = { label: (opt.textContent||opt.text||'').trim(), lng: parseFloat(opt.getAttribute('data-long')||'126.978'), lat: parseFloat(opt.getAttribute('data-lat')||'37.5665'), tz: opt.value||'Asia/Seoul', tzOffset: parseFloat(opt.getAttribute('data-tz')||'9'), baseTzOffset: parseFloat(opt.getAttribute('data-base-tz')||'9') };
            }
            return { name: (nameEl&&nameEl.value.trim())||'사용자', gender: isFemale?'F':'M', birth: { year:y, month:m, day:d, hour: hourEl?Number(hourEl.value):12, minute: minEl?Number(minEl.value):0 }, location: loc };
          }
        }
      }
    } catch (_) {}
    return null;
  }

  var _AB_STORE_VER = 'ab_v1_';

  function _abMakeKey(profile) {
    var b = (profile && profile.birth) || {};
    return _AB_STORE_VER + (b.year||'0') + '_' + (b.month||'0') + '_' + (b.day||'0') + '_' + ((profile&&profile.gender)||'u');
  }

  function _abSaveResult(profile) {
    try { sessionStorage.setItem(_abMakeKey(profile), JSON.stringify({ chapters:_chapters, name:(profile&&profile.name)||'사용자', birth:(profile&&profile.birth)||{}, gender:(profile&&profile.gender)||'', savedAt:new Date().toISOString() })); } catch(_) {}
  }

  function _abLoadSaved(profile) {
    try { var raw = sessionStorage.getItem(_abMakeKey(profile)); return raw ? JSON.parse(raw) : null; } catch(_) { return null; }
  }

  function _showScreen(id) {
    var screens = ['abNoProfileScreen','abStartScreen','abLoadingScreen','abResultScreen','abErrorScreen'];
    for (var i=0; i<screens.length; i++) { var el=_qs(screens[i]); if(el) el.style.display=(screens[i]===id)?'':'none'; }
  }

  function _ensurePremiumCinematicStyles() {
    if (document.getElementById('cdPremiumLoadingCinematicStyles')) return;
    var style = document.createElement('style');
    style.id = 'cdPremiumLoadingCinematicStyles';
    style.textContent =
      '.lb-loading--cinematic{position:relative;overflow:hidden;--cd-glow-a:#7c3aed;--cd-glow-b:#4338ca;--cd-ring:rgba(129,140,248,0.45);}' +
      '.lb-loading--cinematic::before{content:"";position:absolute;inset:-20% -10% auto -10%;height:65%;background:radial-gradient(circle at center,var(--cd-ring),transparent 68%);pointer-events:none;opacity:.85;filter:blur(2px);}' +
      '.lb-loading--cinematic .lb-loading__symbol{position:relative;display:inline-flex;align-items:center;justify-content:center;width:86px;height:86px;border-radius:999px;background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.35),transparent 40%),linear-gradient(135deg,var(--cd-glow-a),var(--cd-glow-b));box-shadow:0 14px 40px rgba(15,23,42,.45),0 0 34px var(--cd-ring);animation:cd-premium-orb-pulse 2.8s ease-in-out infinite;}' +
      '.lb-loading--cinematic .lb-loading__symbol::before,.lb-loading--cinematic .lb-loading__symbol::after{content:"";position:absolute;inset:-10px;border-radius:999px;border:1px solid var(--cd-ring);}' +
      '.lb-loading--cinematic .lb-loading__symbol::before{animation:cd-premium-ring-spin 7.2s linear infinite;}' +
      '.lb-loading--cinematic .lb-loading__symbol::after{inset:-16px;border-style:dashed;opacity:.7;animation:cd-premium-ring-spin 10.5s linear infinite reverse;}' +
      '.lb-loading--cinematic .lb-progress__bar{background:linear-gradient(90deg,var(--cd-glow-a),#f8fafc,var(--cd-glow-b));background-size:200% 100%;animation:cd-premium-bar-shimmer 2.4s linear infinite;}' +
      '.lb-loading--cinematic .lb-loading__chapter{animation:cd-premium-float 1.8s ease-in-out infinite;}' +
      '@keyframes cd-premium-orb-pulse{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-2px) scale(1.04)}}' +
      '@keyframes cd-premium-ring-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
      '@keyframes cd-premium-bar-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}' +
      '@keyframes cd-premium-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}';
    document.head.appendChild(style);
  }

  function _activateCinematicLoading(screenId, glowA, glowB, ring) {
    _ensurePremiumCinematicStyles();
    var screen = _qs(screenId);
    if (!screen) return;
    screen.classList.add('lb-loading--cinematic');
    if (glowA) screen.style.setProperty('--cd-glow-a', glowA);
    if (glowB) screen.style.setProperty('--cd-glow-b', glowB);
    if (ring) screen.style.setProperty('--cd-ring', ring);
  }

  function _renderDetailedChapterPreview() {
    var start = document.getElementById('abStartScreen');
    if (!start) return;
    var wrap = start.querySelector('.lb-start__chapters');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'lb-start__chapters';
      wrap.innerHTML =
        '<div class="lb-start__ch-label">📖 13챕터 구성</div>' +
        '<ul class="lb-start__ch-list" id="abChapterPreviewList"></ul>';
      var anchor = start.querySelector('.lb-start__note');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
      else start.appendChild(wrap);
    }
    var list = document.getElementById('abChapterPreviewList') || wrap.querySelector('.lb-start__ch-list');
    if (!list) return;
    var html = '';
    for (var i = 0; i < CHAPTER_TITLES.length; i++) {
      html += '<li class="lb-start__ch-item lb-start__ch-item--detail">' +
        '<div class="lb-start__ch-head" style="display:flex;gap:8px;align-items:flex-start;">' +
          '<span class="lb-start__ch-num">Ch.' + (i + 1) + '</span>' +
          '<span class="lb-start__ch-title">' + _escHtml(CHAPTER_TITLES[i]) + '</span>' +
        '</div>' +
        '<p class="lb-start__ch-sub" style="margin:6px 0 0 58px;font-size:0.85rem;line-height:1.55;color:#cbd5ff;">' + _escHtml(CHAPTER_SUBTITLES[i]) + '</p>' +
      '</li>';
    }
    list.innerHTML = html;
  }

  function _ensureCompatibilityInputs() {
    var start = document.getElementById('abStartScreen');
    if (!start || document.getElementById('abCompatPanel')) return;

    var panel = document.createElement('section');
    panel.id = 'abCompatPanel';
    panel.style.cssText = 'margin:14px 0 10px;padding:12px 14px;border-radius:12px;background:rgba(30,58,138,0.22);border:1px solid rgba(125,211,252,0.35);';
    panel.innerHTML =
      '<label style="display:flex;align-items:center;gap:8px;font-weight:700;color:#dbeafe;cursor:pointer;">' +
        '<input type="checkbox" id="abCompatMode" style="width:16px;height:16px;"> 궁합 리포트 모드 (상대 정보 입력)' +
      '</label>' +
      '<div id="abPartnerFields" style="display:none;margin-top:10px;">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<input id="abPartnerName" type="text" placeholder="상대 이름" style="padding:10px;border-radius:8px;border:1px solid rgba(147,197,253,.45);background:rgba(15,23,42,.5);color:#e2e8f0;">' +
          '<input id="abPartnerBirthDate" type="date" style="padding:10px;border-radius:8px;border:1px solid rgba(147,197,253,.45);background:rgba(15,23,42,.5);color:#e2e8f0;">' +
          '<input id="abPartnerHour" type="number" min="0" max="23" placeholder="태어난 시 (0-23)" style="padding:10px;border-radius:8px;border:1px solid rgba(147,197,253,.45);background:rgba(15,23,42,.5);color:#e2e8f0;">' +
          '<input id="abPartnerMinute" type="number" min="0" max="59" placeholder="태어난 분 (0-59)" style="padding:10px;border-radius:8px;border:1px solid rgba(147,197,253,.45);background:rgba(15,23,42,.5);color:#e2e8f0;">' +
        '</div>' +
        '<input id="abPartnerBirthPlace" type="text" placeholder="상대 출생지 (도시/국가)" style="margin-top:8px;width:100%;padding:10px;border-radius:8px;border:1px solid rgba(147,197,253,.45);background:rgba(15,23,42,.5);color:#e2e8f0;">' +
      '</div>';

    var anchor = start.querySelector('.lb-start__note') || start.firstElementChild;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor.nextSibling);
    else start.appendChild(panel);

    var mode = document.getElementById('abCompatMode');
    var fields = document.getElementById('abPartnerFields');
    if (mode && fields) {
      mode.addEventListener('change', function () {
        fields.style.display = mode.checked ? '' : 'none';
      });
    }
  }

  function _readCompatibilityPayload() {
    var modeEl = document.getElementById('abCompatMode');
    var useCompat = !!(modeEl && modeEl.checked);
    if (!useCompat) return { reportType: 'personal' };

    var dateText = String((_qs('abPartnerBirthDate') && _qs('abPartnerBirthDate').value) || '').trim();
    var dateParts = dateText ? dateText.split('-') : [];
    var py = Number(dateParts[0]);
    var pm = Number(dateParts[1]);
    var pd = Number(dateParts[2]);
    var ph = Number((_qs('abPartnerHour') && _qs('abPartnerHour').value) || 12);
    var pmin = Number((_qs('abPartnerMinute') && _qs('abPartnerMinute').value) || 0);
    var pname = String((_qs('abPartnerName') && _qs('abPartnerName').value) || '').trim();
    var pplace = String((_qs('abPartnerBirthPlace') && _qs('abPartnerBirthPlace').value) || '').trim();

    if (!py) py = 1990;
    if (!pm) pm = 1;
    if (!pd) pd = 1;
    if (!isFinite(ph) || ph < 0 || ph > 23) ph = 12;
    if (!isFinite(pmin) || pmin < 0 || pmin > 59) pmin = 0;
    if (!pplace) pplace = '정보 없음';

    return {
      reportType: 'compatibility',
      partnerName: pname || '상대',
      partnerYear: py,
      partnerMonth: pm,
      partnerDay: pd,
      partnerHour: ph,
      partnerMinute: pmin,
      partnerBirthPlace: pplace,
    };
  }

  var AB_ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII'];

  function _renderToc() {
    var nav = document.getElementById('abToc');
    if (!nav || nav.querySelector('[data-ab-chapter]')) return;
    var html = '';
    for (var i=1; i<=ASTRO_TOTAL_CHAPTERS; i++) html += '<button type="button" class="lb-toc-item ab-toc-item'+(i===1?' active':'')+'" data-ab-chapter="'+i+'">' + AB_ROMAN[i-1] + '</button>';
    nav.innerHTML = html;
  }

  function _bindToc() {
    var nav = document.getElementById('abToc');
    if (!nav) return;
    _renderToc();
    nav.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-ab-chapter]');
      if (!btn) return;
      var ch = Number(btn.getAttribute('data-ab-chapter'));
      if (!ch || !_chapters[ch-1]) return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.ab-toc-item'), function(b) {
        b.classList.toggle('active', b===btn);
        b.classList.toggle('loaded', !!_chapters[Number(b.getAttribute('data-ab-chapter'))-1]);
      });
    });
  }

  function _renderChapter(ch) {
    var content = _qs('abChapterContent');
    if (!content) return;
    var idx = ch-1;
    var data = _chapters[idx];
    if (!data) { content.innerHTML = '<p class="zb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>'; return; }
    content.innerHTML =
      '<div class="zb-chapter-wrap">' +
      '<div class="zb-chapter-header">' +
      '<span class="zb-chapter-num">Chapter '+ch+'</span>' +
      '<h2 class="zb-chapter-title">'+_escHtml(CHAPTER_TITLES[idx])+'</h2>' +
      '<p class="zb-chapter-sub">'+_escHtml(CHAPTER_SUBTITLES[idx])+'</p>' +
      '</div>' +
      '<div class="zb-chapter-body">'+_md2html(data)+'</div>' +
      '</div>';
    content.scrollTop = 0;
  }

  function _updateTocState() {
    _renderToc();
    var items = document.querySelectorAll('#abToc .ab-toc-item');
    Array.prototype.forEach.call(items, function(btn) {
      var ch = Number(btn.getAttribute('data-ab-chapter'));
      btn.classList.toggle('loaded', !!_chapters[ch-1]);
      btn.classList.toggle('active', ch===1);
    });
  }

  window.openAstroBookModal = function(profileArg) {
    var modal = _qs('astroBookModal');
    if (!modal) { console.error('[점성술 코즈믹 차트] astroBookModal 요소를 찾을 수 없습니다.'); return; }
    _applyAstroTheme(modal);
    var _pvwEl=document.getElementById('tilePvwOverlay');if(_pvwEl){_pvwEl.classList.remove('pvw-open');_pvwEl.style.opacity='0';_pvwEl.style.pointerEvents='none';_pvwEl.style.visibility='hidden';setTimeout(function(){_pvwEl.style.opacity='';_pvwEl.style.pointerEvents='';_pvwEl.style.visibility='';},400);}
    if (profileArg && profileArg.birth && profileArg.birth.year) {
      try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
    }
    var profile = (profileArg && profileArg.birth && profileArg.birth.year) ? profileArg : _getActiveBirthProfile();
    if (!profile) {
      modal.style.display = 'flex'; modal.style.zIndex='100120';
      document.body.style.overflow = 'hidden';
      document.body.classList.add('lb-modal-open');
      try { modal.setAttribute('aria-hidden', 'false'); } catch(_) {}
      _showScreen('abNoProfileScreen');
      return;
    }
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile = profile;
    var saved = _abLoadSaved(profile);
    if (saved && saved.chapters && saved.chapters.some(Boolean)) {
      _chapters = saved.chapters;
      _currentChapter = 1;
      _showScreen('abResultScreen');
      _updateTocState();
      _renderChapter(1);
      _bindToc();
      var nameEl=_qs('abResultName'), dateEl=_qs('abResultDate');
      if (nameEl) nameEl.textContent = '✨ '+(saved.name||'사용자')+'님의 점성술 코즈믹 차트';
      if (dateEl) { var b=saved.birth||{}; var sd=saved.savedAt?new Date(saved.savedAt).toLocaleDateString('ko-KR'):''; dateEl.textContent=[b.year,b.month,b.day].filter(Boolean).join('.')+(sd?' · 💾 '+sd+' 저장':''); }
      modal.style.display='flex'; modal.style.zIndex='100120'; document.body.style.overflow='hidden';
      document.body.classList.add('lb-modal-open');
      try { modal.setAttribute('aria-hidden','false'); } catch(_){}
      return;
    }
    _chapters = Array(ASTRO_TOTAL_CHAPTERS).fill(null);
    _currentChapter = 1;
    _showScreen('abStartScreen');
    modal.style.display = 'flex'; modal.style.zIndex='100120';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('lb-modal-open');
    try { modal.setAttribute('aria-hidden','false'); var closeBtn=modal.querySelector('.lb-modal__close'); if(closeBtn) setTimeout(function(){closeBtn.focus();},60); } catch(_){}
    _prefillAstroProfile(profile);
    _ensureCompatibilityInputs();
    _renderDetailedChapterPreview();
  };

  function _prefillAstroProfile(profile) {
    if (!profile) return;
    var b = profile.birth||{};
    var infoEl = _qs('abProfileSummary');
    if (infoEl && b.year) {
      infoEl.textContent = (profile.name||'사용자') + ' · ' + (profile.gender==='F'?'여성':profile.gender==='M'?'남성':'') + ' · ' + b.year+'년 '+(b.month||'')+'월 '+(b.day||'')+'일 '+(b.hour!==undefined?b.hour+'시':'')+(b.minute&&b.minute>0?' '+b.minute+'분':'') + ' 생';
      infoEl.style.display = '';
    }
  }

  window.closeAstroBookModal = function() {
    var modal = _qs('astroBookModal');
    if (!modal) return;
    if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer=null; }
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('lb-modal-open');
    try { modal.setAttribute('aria-hidden','true'); } catch(_){}
  };

  window.generateAstroBook = function() {
    if (_generating) return;
    var profile = _getActiveBirthProfile();
    if (!profile) { alert('사주/점성술 계산을 먼저 완료해 주세요.'); return; }
    if (!window.__cdActiveBirthProfile || !window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile = profile;

    var b = profile.birth || {};
    if (!b.year || !b.month || !b.day) { alert('생년월일을 확인할 수 없습니다. 사주 계산 후 다시 시도해 주세요.'); return; }

    var loc = profile.location || { lat:37.5665, lng:126.978, tzOffset:9 };
    var compat = _readCompatibilityPayload();
    if (compat.error) { alert(compat.error); return; }

    _generating = true;
    _chapters = Array(ASTRO_TOTAL_CHAPTERS).fill(null);

    _showScreen('abLoadingScreen');
    _activateCinematicLoading('abLoadingScreen', '#67e8f9', '#1d4ed8', 'rgba(59,130,246,0.46)');

    var progressBar=_qs('abProgressBar'), progressText=_qs('abProgressText');
    var stageEl=_qs('abLoadingStageText');
    if(!stageEl&&progressText&&progressText.parentElement){
      stageEl=document.createElement('div');
      stageEl.id='abLoadingStageText';
      stageEl.style.cssText='margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(56,189,248,0.12);border:1px solid rgba(125,211,252,0.35);font-size:0.83rem;color:#dbeafe;line-height:1.45;';
      progressText.parentElement.appendChild(stageEl);
    }
    var chapterMsg=_qs('abLoadingChapter'), chapterNumEl=_qs('abLoadingChapterNum');
    var mysticEl=_qs('abMysticQuote');

    if (_mysticTimer) clearInterval(_mysticTimer);
    var _mqIdx=0;
    if (mysticEl) { mysticEl.textContent=MYSTIC_QUOTES[0]; mysticEl.classList.remove('lb-fade-out'); }
    _mysticTimer = setInterval(function(){
      _mqIdx=(_mqIdx+1)%MYSTIC_QUOTES.length;
      if (mysticEl) {
        mysticEl.classList.add('lb-fade-out');
        setTimeout(function(){ if(mysticEl){ mysticEl.textContent=MYSTIC_QUOTES[_mqIdx]; mysticEl.classList.remove('lb-fade-out'); } },420);
      }
    },3600);

    var chDots = document.querySelectorAll('.ab-ch-dot');
    Array.prototype.forEach.call(chDots, function(d){ d.classList.remove('zb-ch-dot--done','zb-ch-dot--active','lb-ch-dot--done','lb-ch-dot--active','lb-ch-dot--just-done'); });
    if (chDots[0]) chDots[0].classList.add('zb-ch-dot--active','lb-ch-dot--active');

    var chapterWrap = chapterNumEl && chapterNumEl.parentElement && chapterNumEl.parentElement.classList && chapterNumEl.parentElement.classList.contains('lb-loading__chapter')
      ? chapterNumEl.parentElement
      : null;

    function _setProgress(done) {
      var pct=Math.round((done/ASTRO_TOTAL_CHAPTERS)*100);
      if (progressBar) progressBar.style.width=pct+'%';
      if (progressText) progressText.textContent=done+' / '+ASTRO_TOTAL_CHAPTERS+' 챕터 완성 ('+pct+'%)';
      if (stageEl) {
        var _phase = done===0
          ? '천궁 데이터 정렬 및 좌표 동기화'
          : (done<ASTRO_TOTAL_CHAPTERS ? ('AI가 Chapter '+(done+1)+' Professional 해석 중') : 'PDF 저장 준비 완료');
        var _subtitle = done < ASTRO_TOTAL_CHAPTERS ? (CHAPTER_SUBTITLES[done] || '') : '전체 챕터 정리를 완료했습니다.';
        stageEl.textContent='진행 단계: '+_phase+(_subtitle ? ' · '+_subtitle : '');
      }
      if (chapterMsg&&done<ASTRO_TOTAL_CHAPTERS) chapterMsg.textContent=LOADING_MSGS[done]||'분석 중...';
      if (chapterMsg&&done>=ASTRO_TOTAL_CHAPTERS) chapterMsg.textContent='Professional Edition 리포트가 완성되었습니다 ✦';
      if (chapterNumEl) chapterNumEl.textContent=done<ASTRO_TOTAL_CHAPTERS?'Chapter '+(done+1):'✦ 완성 ✦';
      if (chapterMsg) {
        chapterMsg.classList.remove('lb-loading__status--pulse');
        void chapterMsg.offsetWidth;
        chapterMsg.classList.add('lb-loading__status--pulse');
      }
      if (chapterWrap) {
        chapterWrap.classList.remove('is-updating');
        void chapterWrap.offsetWidth;
        chapterWrap.classList.add('is-updating');
      }
      Array.prototype.forEach.call(chDots, function(d){
        var ch=Number(d.getAttribute('data-abch'));
        var isDone=ch<=done;
        var isActive=ch===done+1&&done<ASTRO_TOTAL_CHAPTERS;
        var wasDone=d.classList.contains('zb-ch-dot--done')||d.classList.contains('lb-ch-dot--done');
        d.classList.toggle('zb-ch-dot--done', isDone);
        d.classList.toggle('zb-ch-dot--active', isActive);
        d.classList.toggle('lb-ch-dot--done', isDone);
        d.classList.toggle('lb-ch-dot--active', isActive);
        if (!wasDone&&isDone){
          d.classList.add('lb-ch-dot--just-done');
          setTimeout(function(){ d.classList.remove('lb-ch-dot--just-done'); }, 760);
          d.style.animation='none'; requestAnimationFrame(function(){requestAnimationFrame(function(){d.style.animation='';});});
        }
      });
    }

    _setProgress(0);

    function _fetchChapter(idx) {
      var endpoints = _buildApiCandidates('/api/premium/astro-life');
      function _attempt(tryNo) {
        return new Promise(function(resolve) {
          var tid = setTimeout(function(){ resolve({ok:false,message:'응답 시간 초과 (70초).'}); },70000);
          var endpoint = endpoints[(tryNo - 1) % endpoints.length] || '/api/premium/astro-life';
          fetch(endpoint, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              year: b.year, month: b.month, day: b.day,
              hour: b.hour !== undefined ? b.hour : 12,
              minute: b.minute !== undefined ? b.minute : 0,
              timezone: loc.tzOffset !== undefined ? loc.tzOffset : 9,
              lat: loc.lat !== undefined ? loc.lat : 37.5665,
              lon: loc.lng !== undefined ? loc.lng : 126.978,
              chapter: idx+1,
              reportType: compat.reportType,
              houseSystem: profile.houseSystem || 'placidus',
              zodiacType: profile.zodiacType || 'tropical',
              birthPlace: loc.label || '대한민국 (서울)',
              timezoneName: loc.tz || 'Asia/Seoul',
              birthTimeUnknown: !!(profile.birthTimeUnknown || b.birthTimeUnknown || b.timeUnknown),
              includeMinorAspects: true,
              partnerName: compat.partnerName,
              partnerYear: compat.partnerYear,
              partnerMonth: compat.partnerMonth,
              partnerDay: compat.partnerDay,
              partnerHour: compat.partnerHour,
              partnerMinute: compat.partnerMinute,
              partnerBirthPlace: compat.partnerBirthPlace
            })
          })
          .then(function(res){ return res.ok?res.json():res.json().catch(function(){return{};}).then(function(e){return{ok:false,message:(e&&e.error)||(e&&e.message)||'HTTP '+res.status};}); })
          .then(function(data){ clearTimeout(tid); resolve(data); })
          .catch(function(err){ clearTimeout(tid); resolve({ok:false,message:String(err&&err.message?err.message:err)}); });
        }).then(function(data) {
          if (data && data.ok && data.text) return data;
          if (tryNo >= 3) return data;
          return _attempt(tryNo + 1);
        });
      }
      return _attempt(1);
    }

    var _failCount=0;
    (function generateNext(idx) {
      if (idx>=ASTRO_TOTAL_CHAPTERS) {
        clearInterval(_mysticTimer); _mysticTimer=null; _generating=false;
        var validCount = _chapters.filter(function(c){ return typeof c === 'string' && c.trim().length >= 900 && !/^⚠️/.test(c.trim()); }).length;
        var minValid = Math.max(10, ASTRO_TOTAL_CHAPTERS - 3);
        if (validCount < minValid) {
          var errEl=_qs('abErrorMsg');
          if(errEl) errEl.textContent='챕터 생성이 불완전합니다 (' + validCount + '/'+ASTRO_TOTAL_CHAPTERS+'). 자동 환급을 시도합니다. 잠시 후 다시 시도해 주세요.';
          _showScreen('abErrorScreen');
          _autoRefundPremium(PREMIUM_ASTRO_COST, PREMIUM_ASTRO_FEATURE_KEY, '점성술 프리미엄 PDF', PREMIUM_ASTRO_TX_KEY)
            .then(function(refunded){ if(refunded) window.alert('점성술 프리미엄 결제가 자동 환급되었습니다.'); });
          return;
        }
        try { sessionStorage.removeItem(PREMIUM_ASTRO_TX_KEY); } catch (_) {}
        _showScreen('abResultScreen');
        _updateTocState(); _renderChapter(1); _bindToc();
        var prof=window.__cdActiveBirthProfile||{};
        var _nameEl=_qs('abResultName'), _dateEl=_qs('abResultDate');
        if (_nameEl) _nameEl.textContent='✨ '+(prof.name||'사용자')+'님의 Professional Astrology Report';
        if (_dateEl) { var _b=prof.birth||{}; _dateEl.textContent=[_b.year,_b.month,_b.day].filter(Boolean).join('.')+'생 · 🗓️ '+new Date().toLocaleDateString('ko-KR')+' 발행'; }
        _abSaveResult(prof);
        return;
      }
      if (chapterMsg) chapterMsg.textContent=LOADING_MSGS[idx]||'분석 중...';
      _fetchChapter(idx).then(function(data) {
        if (data&&data.ok&&data.text) { _chapters[idx]=data.text; }
        else { _failCount++; var msg=(data&&(data.error||data.message))?data.error||data.message:'알 수 없는 오류'; console.warn('[점성술] Chapter '+(idx+1)+' 실패:',msg); _chapters[idx]='⚠️ **이 챕터의 분석을 불러오는 데 실패했습니다.**\n\n오류: '+msg+'\n\n잠시 후 다시 시도해 주세요.'; }
        _setProgress(idx+1);
        generateNext(idx+1);
      });
    })(0);
  };

  window.downloadAstroBookPdf = function() {
    if (!_chapters.some(Boolean)) { alert('먼저 점성술 코즈믹 차트를 생성해 주세요.'); return; }
    var profile=window.__cdActiveBirthProfile||{};
    var name=(profile.name||'사용자')+'님의 점성술 코즈믹 차트';
    var birth=profile.birth||{};
    var issued=new Date().toLocaleDateString('ko-KR');
    var bodyHtml='';
    var tocItems='';
    for (var i=0;i<ASTRO_TOTAL_CHAPTERS;i++) {
      if (!_chapters[i]) continue;
      tocItems+='<li><span>Chapter '+(i+1)+'. '+_escHtml(CHAPTER_TITLES[i])+'</span><span>Sec.'+(i+1)+'</span></li>';
      bodyHtml+='<div class="chapter" style="page-break-before:'+(i>0?'always':'auto')+'"><div class="chapter-header"><span class="chapter-num">Chapter '+(i+1)+'</span><h2 class="chapter-title">'+_escHtml(CHAPTER_TITLES[i])+'</h2><p class="chapter-sub">'+_escHtml(CHAPTER_SUBTITLES[i])+'</p></div><div class="chapter-body">'+_md2html(_chapters[i])+'</div></div>';
    }
    var tocHtml='<div class="toc" style="page-break-after:always;"><h2>Table of Contents</h2><ul>'+tocItems+'</ul></div>';
    var fullHtml='<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>'+_escHtml(name)+'</title>' +
      '<style>@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap");' +
      'body{font-family:"Noto Serif KR",serif;color:#0a0820;background:#fff;margin:0;padding:0;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(135deg,#060312 0%,#0d0624 50%,#060312 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:0.75rem;letter-spacing:0.2em;color:#fde68a;margin-bottom:16px;text-transform:uppercase;}' +
      '.cover-title{font-size:2.6rem;font-weight:700;margin:0 0 12px;color:#fff;}' +
      '.cover-name{font-size:1.6rem;color:#fde68a;margin:8px 0;}' +
      '.cover-info{font-size:0.9rem;color:#94a3b8;}' +
      '.toc{padding:46px 60px;background:#f8fafc;}' +
      '.toc h2{margin:0 0 14px;color:#0f172a;border-bottom:2px solid #cbd5e1;padding-bottom:8px;}' +
      '.toc ul{list-style:none;padding:0;margin:0;}' +
      '.toc li{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:0.95rem;color:#0f172a;}' +
      '.chapter{padding:52px 60px;}' +
      '.chapter-header{border-bottom:2px solid #fde68a;margin-bottom:28px;padding-bottom:20px;}' +
      '.chapter-num{font-size:0.75rem;letter-spacing:0.2em;color:#b45309;text-transform:uppercase;}' +
      '.chapter-title{font-size:1.5rem;font-weight:700;color:#1c0a00;margin:8px 0 6px;}' +
      '.chapter-sub{font-size:0.9rem;color:#78350f;margin:0;}' +
      'h1,h2,h3,h4{color:#1c0a00;}p{line-height:1.9;color:#1c0a00;}' +
      'blockquote{border-left:3px solid #fbbf24;padding:8px 16px;background:#fffbeb;margin:16px 0;}' +
      'strong{color:#92400e;} ul,ol{padding-left:1.5em;} li{margin-bottom:6px;}' +
      '.page-footer{position:fixed;bottom:10px;left:0;right:0;text-align:center;font-size:0.75rem;color:#64748b;}' +
      '.page-footer:after{content:"Page " counter(page) " of " counter(pages);}' +
      '</style></head><body>' +
      '<div class="cover"><p class="cover-badge">✨ COSMIC CHART PREMIUM</p>' +
      '<h1 class="cover-title">Professional Edition</h1>' +
      '<p style="font-size:1rem;color:#fde68a;margin-bottom:20px;">서양 점성술 프리미엄 리포트 · 13 Chapters</p>' +
      '<div style="width:60px;height:1px;background:rgba(253,230,138,0.4);margin:0 auto 20px;"></div>' +
      '<p class="cover-name">'+_escHtml((profile.name||'사용자'))+'님의 코즈믹 차트</p>' +
      '<p class="cover-info">'+([birth.year,birth.month,birth.day].filter(Boolean).join('년 ')+(birth.day?'일':'')||'생년월일 미상')+'</p>' +
      '<p class="cover-info" style="margin-top:10px;">🗓️ '+issued+' 발행</p></div>' +
      tocHtml + bodyHtml + '<div class="page-footer"></div></body></html>';
    var win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('팝업이 차단되어 PDF 생성 창을 열 수 없습니다.\n브라우저 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    win.document.open();
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    setTimeout(function () { try { win.print(); } catch (_) {} }, 1200);
  };

  // 액션 등록
  var _alEl = document.querySelector('[data-action="closeAstroBookModal"]');
  document.addEventListener('click', function(e) {
    var el=e.target; if(!el) return;
    var node=el.closest?el.closest('[data-action]'):null; if(!node) return;
    var act=node.getAttribute('data-action');
    if (act==='closeAstroBookModal') { window.closeAstroBookModal(); e.stopPropagation(); }
  });

  window.gotoAstrologyPremium = function(profileArg) { window.openAstroBookModal(profileArg); };
})();
