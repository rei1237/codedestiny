/**
 * 숙요점 프리미엄 (Sukuyo 宿曜占 — Premium Life Report)
 * CODE-DESTINY v1.0  •  27수 숙요 기반 13챕터 인생 총람
 */
(function () {
  'use strict';

  var PERSONAL_CHAPTER_META = [
    { title: '🌑 본명숙 원형 해독', subtitle: '나의 27숙 정체성' },
    { title: '🌙 달의 주기와 정서 리듬', subtitle: '월상·삭망각·조도 분석' },
    { title: '🎭 페르소나와 첫인상', subtitle: '세상이 나를 기억하는 방식' },
    { title: '💰 자산 감각과 생활 기반', subtitle: '돈을 대하는 숙요적 태도' },
    { title: '⚙️ 협업과 조직 적응', subtitle: '보이지 않는 톱니바퀴' },
    { title: '📡 관계 감지력', subtitle: '인간관계 레이더와 거리 조절' },
    { title: '💥 위기와 전환', subtitle: '무너질 때 다시 살아나는 방식' },
    { title: '🏡 가족과 뿌리', subtitle: '정서적 기반과 소속감' },
    { title: '🔥 욕망과 추진력', subtitle: '내가 움직이는 진짜 이유' },
    { title: '🧘 내면 회복과 영성', subtitle: '혼자 있을 때 살아나는 힘' },
    { title: '🧭 인생 방향성', subtitle: '나에게 맞는 길의 형태' },
    { title: '📅 달빛 실천 캘린더', subtitle: '4주 루틴' },
    { title: '🌕 숙요점 인생 총결산', subtitle: '나의 달빛 사용법' },
  ];

  var COMPAT_CHAPTER_META = [
    { title: '🌙 두 사람의 본명숙 계산표', subtitle: '27숙 원형과 달의 좌표' },
    { title: '🧭 관계 거리와 숙요 궁합 공식', subtitle: '왜 이 관계로 분류되는가' },
    { title: '💞 첫 끌림과 감정 화학작용', subtitle: '두 숙이 서로를 알아보는 방식' },
    { title: '🪞 서로의 그림자', subtitle: '반복 갈등과 상처 버튼' },
    { title: '🏡 안정감과 장기 관계 가능성', subtitle: '결혼·동거·일상 궁합' },
    { title: '🔥 애정 표현과 친밀감', subtitle: '연애 온도와 거리 조절' },
    { title: '🗣️ 대화와 오해의 구조', subtitle: '말이 통하는 지점과 어긋나는 지점' },
    { title: '💼 협업과 현실 궁합', subtitle: '일·돈·목표를 함께할 수 있는가' },
    { title: '🌊 위기 상황의 관계 반응', subtitle: '멀어질 때와 다시 가까워질 때' },
    { title: '🧩 관계 유형별 심층 분석', subtitle: '실제 relationType 심층' },
    { title: '📅 30일 관계 운영 로드맵', subtitle: '관계 유형/거리별 실행 설계' },
    { title: '🕯️ 관계를 살리는 문장과 피해야 할 문장', subtitle: '갈등·화해 문장 실전' },
    { title: '🌕 최종 궁합 총평', subtitle: '점수표·장점·위험·원칙' },
  ];

  var PERSONAL_LOADING_MSGS = [
    '본명숙 원형 해독 데이터를 정리하는 중...',
    '달의 주기와 정서 리듬을 분석하는 중...',
    '페르소나와 첫인상 코드를 해석하는 중...',
    '자산 감각과 생활 기반을 정리하는 중...',
    '협업과 조직 적응 패턴을 추출하는 중...',
    '관계 감지력과 거리 조절법을 계산하는 중...',
    '위기와 전환 리듬을 분석하는 중...',
    '가족과 뿌리의 정서 기반을 구성하는 중...',
    '욕망과 추진력의 동기를 분석하는 중...',
    '내면 회복과 영성 루틴을 설계하는 중...',
    '인생 방향성과 성장 축을 정리하는 중...',
    '달빛 실천 캘린더를 작성하는 중...',
    '숙요점 인생 총결산을 완성하는 중...',
  ];

  var COMPAT_LOADING_MSGS = [
    '두 사람의 본명숙 계산표를 생성하는 중...',
    '관계 거리와 숙요 궁합 공식을 분석하는 중...',
    '첫 끌림의 감정 화학작용을 해석하는 중...',
    '반복 갈등과 상처 버튼을 정리하는 중...',
    '장기 관계 가능성과 안정감을 점검하는 중...',
    '애정 표현과 친밀감 온도를 맞추는 중...',
    '대화/오해 패턴을 구조화하는 중...',
    '협업·현실 궁합 지표를 계산하는 중...',
    '위기 상황의 관계 반응을 시뮬레이션하는 중...',
    '관계 유형별 심층 분석을 정리하는 중...',
    '30일 관계 운영 로드맵을 설계하는 중...',
    '관계를 살리는 문장과 금지 문장을 정리하는 중...',
    '최종 궁합 총평과 원칙을 완성하는 중...',
  ];

  var MYSTIC_QUOTES = [
    '숙요(宿曜)는 달이 하늘을 여행하며 만나는 27개의 별자리 여관입니다.',
    '에도 막부가 민간 사용을 금지했던 이유 — 너무 정확했기 때문입니다.',
    '달이 태어날 때 머물던 별자리가 영혼의 첫 인장을 새깁니다.',
    '성(成)·친(親)·화(和)·쇠(衰)·괴(壞)·살(殺) — 달빛이 관계를 분류하는 방식.',
    '27수는 불교 밀교가 천년 동안 숨겨온 운명 해독의 열쇠입니다.',
    '달의 주기와 함께하면 모든 것이 저항 없이 흐릅니다.',
    '숙요 재능 지수는 이 별자리 태생이 가진 선천적 강점입니다.',
    '달빛 전략가는 물처럼 흐르며 기회를 만납니다.',
    '반복되는 패턴을 아는 사람만이 같은 시련을 끊을 수 있습니다.',
    '만트라는 영혼이 스스로에게 보내는 진동 코드입니다.',
  ];

  var _chapters = Array(13).fill(null);
  var _sukuyoChart = null;
  var _generating = false;
  var _currentChapter = 1;
  var _mysticTimer = null;
  var PREMIUM_SUKUYO_COST = 390;
  var PREMIUM_SUKUYO_COMPAT_EXTRA_COST = 300;
  var PREMIUM_SUKUYO_FEATURE_KEY = 'premium-sukuyo';
  var PREMIUM_SUKUYO_COMPAT_FEATURE_KEY = 'premium-sukuyo-compat-extra';
  var PREMIUM_SUKUYO_TX_KEY = 'cd_premium_tx_sukuyo';
  var PREMIUM_SUKUYO_COMPAT_TX_KEY = 'cd_premium_tx_sukuyo_compat_extra';
  var _reportMode = 'personal';
  var _totalChapters = 13;
  var _reportId = '';
  var _canonicalSukuyoCompatibility = null;
  var _chapterMetaRuntime = Array(_totalChapters).fill(null);

  function _qs(id) { return document.getElementById(id); }

  function _getActiveChapterMeta() {
    return _reportMode === 'compatibility' ? COMPAT_CHAPTER_META : PERSONAL_CHAPTER_META;
  }

  function _getActiveLoadingMessages() {
    return _reportMode === 'compatibility' ? COMPAT_LOADING_MSGS : PERSONAL_LOADING_MSGS;
  }

  function _getChapterMetaAt(idx) {
    var fallback = _getActiveChapterMeta();
    var runtime = _chapterMetaRuntime[idx];
    return runtime || fallback[idx] || { title: 'Chapter ' + (idx + 1), subtitle: '' };
  }

  function _resetChapterState() {
    _totalChapters = 13;
    _chapters = Array(_totalChapters).fill(null);
    _chapterMetaRuntime = Array(_totalChapters).fill(null);
    _reportId = '';
    _canonicalSukuyoCompatibility = null;
  }

  function _syncReportModeSelector(mode) {
    var off = document.getElementById('skCompatOff');
    var on = document.getElementById('skCompatOn');
    if (off) off.checked = mode !== 'compatibility';
    if (on) on.checked = mode === 'compatibility';
  }

  function _buildApiCandidates(pathname) {
    var p = String(pathname || '');
    if (p.charAt(0) !== '/') p = '/' + p;
    var seen = {};
    var out = [];

    function pushBase(raw) {
      var b = String(raw || '').trim();
      var u = b ? (b.replace(/\/+$/, '') + p) : p;
      if (!u || seen[u]) return;
      seen[u] = true;
      out.push(u);
    }

    pushBase('');
    try { pushBase((window && window.__CD_API_BASE_URL) || ''); } catch (_) {}
    try { pushBase((window && window.CODE_DESTINY_API_BASE_URL) || ''); } catch (_) {}
    try { pushBase((window && window.__CF_PAGES_API_BASE_URL) || ''); } catch (_) {}
    try { pushBase(localStorage.getItem('fortune_api_base_url') || ''); } catch (_) {}
    try { pushBase((window && window.location && window.location.origin) || ''); } catch (_) {}

    return out.length ? out : [p];
  }

  function _syncUserPoints(payload) {
    try {
      var points = Number(payload && (payload.remainingPoints != null ? payload.remainingPoints : (payload.user && payload.user.points)));
      if (!isFinite(points)) return;
      var raw = localStorage.getItem('fortune_auth_user');
      if (!raw) return;
      var user = JSON.parse(raw);
      user.points = points;
      localStorage.setItem('fortune_auth_user', JSON.stringify(user));
      if (typeof window.__cdSetGoldenBalance === 'function') window.__cdSetGoldenBalance(points);
    } catch (_) {}
  }

  function _getReportMode() {
    var yes = document.getElementById('skCompatOn');
    return (yes && yes.checked) ? 'compatibility' : 'personal';
  }

  function _applyReportModeUi() {
    var partnerBox = document.getElementById('skPartnerFormSection');
    var startBtn = document.getElementById('skStartBtn');
    var mode = _getReportMode();
    var previousMode = _reportMode;
    _reportMode = mode;
    _totalChapters = 13;
    if (partnerBox) partnerBox.style.display = mode === 'compatibility' ? '' : 'none';
    if (startBtn) {
      startBtn.textContent = mode === 'compatibility'
        ? '💞 숙요 궁합 인생 총람 생성하기 (690코인)'
        : '💫 숙요점 인생 총람 생성하기 (390코인)';
    }
    if (previousMode !== _reportMode) {
      _renderDetailedChapterPreview();
      _renderToc();
    }
  }

  function _ensureReportModeSelector() {
    var host = document.getElementById('skStartScreen');
    if (!host || document.getElementById('skReportModeBox')) {
      _applyReportModeUi();
      return;
    }
    var profileBox = host.querySelector('.lb-start__profile-box');
    var modeBox = document.createElement('div');
    modeBox.id = 'skReportModeBox';
    modeBox.className = 'lb-start__profile-box';
    modeBox.style.marginTop = '12px';
    modeBox.innerHTML = ''+
      '<div class="lb-start__profile-label">🧭 리포트 모드 선택</div>'+
      '<div style="display:flex;gap:14px;flex-wrap:wrap;padding-top:4px;">'+
        '<label style="display:inline-flex;align-items:center;gap:6px;color:#e0f2fe;"><input type="radio" name="skReportMode" id="skCompatOff" checked> 1인 기본 (390코인)</label>'+
        '<label style="display:inline-flex;align-items:center;gap:6px;color:#e0f2fe;"><input type="radio" name="skReportMode" id="skCompatOn"> 궁합 포함 (+300코인)</label>'+
      '</div>';
    if (profileBox && profileBox.parentNode) profileBox.parentNode.insertBefore(modeBox, profileBox.nextSibling);
    else host.insertBefore(modeBox, host.firstChild);
    var off = document.getElementById('skCompatOff');
    var on = document.getElementById('skCompatOn');
    if (off) off.addEventListener('change', _applyReportModeUi);
    if (on) on.addEventListener('change', _applyReportModeUi);
    _applyReportModeUi();
  }

  function _ensureCompatibilitySurchargeIfNeeded(profile, partner) {
    if (_reportMode !== 'compatibility') return Promise.resolve({ ok: true, skipped: true });
    if (!partner || !partner.year || !partner.month || !partner.day) {
      return Promise.resolve({ ok: false, message: '궁합 모드에서는 상대방 생년월일이 필요합니다.' });
    }
    try {
      var existing = sessionStorage.getItem(PREMIUM_SUKUYO_COMPAT_TX_KEY);
      if (existing) return Promise.resolve({ ok: true, alreadyCharged: true });
    } catch (_) {}

    var requestId = [
      'premium-sukuyo-compat-extra',
      (profile && profile.birth ? [profile.birth.year, profile.birth.month, profile.birth.day].join('-') : 'na'),
      [partner.year, partner.month, partner.day].join('-')
    ].join(':');

    var endpoints = _buildApiCandidates('/api/fortune/pig-coin/consume');
    return new Promise(function (resolve) {
      function run(at) {
        if (at >= endpoints.length) {
          resolve({ ok: false, message: '궁합 추가 코인 차감 API 호출에 실패했습니다.' });
          return;
        }
        fetch(endpoints[at], {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cost: PREMIUM_SUKUYO_COMPAT_EXTRA_COST,
            reason: '숙요점 궁합 확장 분석 추가',
            featureKey: PREMIUM_SUKUYO_COMPAT_FEATURE_KEY,
            forceDeduct: true,
            requestId: requestId,
            inputHash: requestId,
            reportJobId: requestId
          })
        }).then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) {
              resolve({ ok: false, message: String((data && data.message) || ('HTTP ' + res.status)) });
              return;
            }
            _syncUserPoints(data);
            try {
              if (data && data.transactionId) sessionStorage.setItem(PREMIUM_SUKUYO_COMPAT_TX_KEY, String(data.transactionId));
            } catch (_) {}
            resolve({ ok: true, data: data });
          });
        }).catch(function () {
          run(at + 1);
        });
      }
      run(0);
    });
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

  function _applySukuyoTheme(modal) {
    if (!modal || !modal.style) return;
    modal.style.setProperty('--lb-void', '#020b16');
    modal.style.setProperty('--lb-deep', '#031226');
    modal.style.setProperty('--lb-dark', '#0a1b35');
    modal.style.setProperty('--lb-surface', '#102848');
    modal.style.setProperty('--lb-border-bright', 'rgba(125, 211, 252, 0.5)');
    modal.style.setProperty('--lb-gold', '#67e8f9');
    modal.style.setProperty('--lb-gold-dim', 'rgba(103, 232, 249, 0.64)');
    modal.style.setProperty('--lb-amethyst', '#38bdf8');
    modal.style.setProperty('--lb-violet', '#0ea5e9');
    modal.style.setProperty('--lb-lilac', '#bae6fd');
    modal.style.setProperty('--lb-glow-violet', 'rgba(14, 165, 233, 0.45)');
    modal.style.setProperty('--lb-glow-gold', 'rgba(103, 232, 249, 0.36)');
  }

  function _escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _md2html(text) {
    if (!text) return '';
    var h = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    h = h.replace(/^&gt; (.+)$/gm,'<blockquote class="zb-md-blockquote">$1</blockquote>');
    h = h.replace(/<\/blockquote>\n<blockquote class="zb-md-blockquote">/g,'<br>');
    h = h.replace(/^#### (.+)$/gm,'<h4 class="zb-md-h4">$1</h4>');
    h = h.replace(/^### (.+)$/gm,'<h3 class="zb-md-h3">$1</h3>');
    h = h.replace(/^## (.+)$/gm,'<h2 class="zb-md-h2">$1</h2>');
    h = h.replace(/^# (.+)$/gm,'<h1 class="zb-md-h1">$1</h1>');
    h = h.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g,'<em>$1</em>');
    h = h.replace(/^---+$/gm,'<hr class="zb-md-hr">');
    h = h.replace(/^[*-] (.+)$/gm,'<li class="zb-md-li">$1</li>');
    h = h.replace(/(<li[\s\S]*?<\/li>(\n|$))+/g,function(m){return '<ul class="zb-md-ul">'+m+'</ul>';});
    h = h.replace(/^\d+\. (.+)$/gm,'<li class="zb-md-li zb-md-oli">$1</li>');
    h = h.replace(/\n\n+/g,'\n\n');
    var lines=h.split('\n'), result=[];
    for (var i=0;i<lines.length;i++) {
      var line=lines[i].trim();
      if (!line){result.push('');continue;}
      if (/^<(h[1-4]|ul|li|hr|blockquote)/.test(line)||/<\/(h[1-4]|ul|li|hr|blockquote)>$/.test(line)) result.push(line);
      else result.push('<p class="zb-md-p">'+line+'</p>');
    }
    return result.join('\n');
  }

  function _getActiveBirthProfile() {
    var p=window.__cdActiveBirthProfile;
    if (p&&p.birth&&p.birth.year) return p;
    var snap=window.__destinyFlowerSajuSnapshot;
    if (snap&&snap.birth&&snap.birth.year) return snap;
    try {
      var ns='FORTUNE_APP_USER_PROFILES';
      var list=JSON.parse(localStorage.getItem(ns+'.list')||'[]');
      var currId=localStorage.getItem(ns+'.current');
      var match=(currId&&list.find(function(p2){return p2.id===currId;}))||(list.length&&list[0])||null;
      if (match&&match.birth&&match.birth.year) return match;
    } catch(_){}
    try {
      var dateEl=document.getElementById('birthDate');
      if (dateEl&&dateEl.value) {
        var parts=dateEl.value.split('-');
        if (parts.length>=3) {
          var y=Number(parts[0]),m=Number(parts[1]),d=Number(parts[2]);
          if (y&&m&&d) {
            var nameEl=document.getElementById('nameInput');
            var isFemale=document.querySelector('#btnF.on')!==null;
            var hourEl=document.getElementById('birthHour');
            return {name:(nameEl&&nameEl.value.trim())||'사용자',gender:isFemale?'F':'M',birth:{year:y,month:m,day:d,hour:hourEl?Number(hourEl.value):12,minute:0}};
          }
        }
      }
    } catch(_){}
    return null;
  }

  function _resolveExistingLunarHint(profile) {
    var p = profile || {};
    var b = p.birth || {};
    var snap = window.__destinyFlowerSajuSnapshot || {};
    var sameBirth = !!(snap && snap.birth && b &&
      Number(snap.birth.year) === Number(b.year) &&
      Number(snap.birth.month) === Number(b.month) &&
      Number(snap.birth.day) === Number(b.day));
    if (!sameBirth) return null;

    var lm = Number(snap.lunarMonth);
    var ld = Number(snap.lunarDay);
    if (!Number.isFinite(lm) || !Number.isFinite(ld)) return null;
    return {
      lunarMonth: lm,
      lunarDay: ld,
      isLeap: !!snap.isLeap,
    };
  }

  var _SK_STORE_VER='sk_v1_';
  function _skMakeKey(p){var b=(p&&p.birth)||{};return _SK_STORE_VER+(b.year||'0')+'_'+(b.month||'0')+'_'+(b.day||'0')+'_'+((p&&p.gender)||'u');}
  function _skSaveResult(p){try{sessionStorage.setItem(_skMakeKey(p),JSON.stringify({chapters:_chapters,chart:_sukuyoChart,name:(p&&p.name)||'사용자',birth:(p&&p.birth)||{},gender:(p&&p.gender)||'',reportMode:_reportMode,totalChapters:_totalChapters,reportId:_reportId||'',canonicalSukuyoCompatibility:_canonicalSukuyoCompatibility||null,chapterMetaRuntime:_chapterMetaRuntime||[],savedAt:new Date().toISOString()}));}catch(_){} }
  function _skLoadSaved(p){try{var raw=sessionStorage.getItem(_skMakeKey(p));return raw?JSON.parse(raw):null;}catch(_){return null;}}

  function _showScreen(id){
    var screens=['skNoProfileScreen','skStartScreen','skLoadingScreen','skResultScreen','skErrorScreen'];
    for(var i=0;i<screens.length;i++){var el=_qs(screens[i]);if(el)el.style.display=(screens[i]===id)?'':'none';}
  }

  function _ensurePremiumCinematicStyles(){
    if(document.getElementById('cdPremiumLoadingCinematicStyles'))return;
    var style=document.createElement('style');
    style.id='cdPremiumLoadingCinematicStyles';
    style.textContent=
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

  function _activateCinematicLoading(screenId,glowA,glowB,ring){
    _ensurePremiumCinematicStyles();
    var screen=_qs(screenId);
    if(!screen)return;
    screen.classList.add('lb-loading--cinematic');
    if(glowA)screen.style.setProperty('--cd-glow-a',glowA);
    if(glowB)screen.style.setProperty('--cd-glow-b',glowB);
    if(ring)screen.style.setProperty('--cd-ring',ring);
  }

  function _renderDetailedChapterPreview(){
    var start=document.getElementById('skStartScreen');
    if(!start)return;
    var chapterMeta=_getActiveChapterMeta();
    var wrap=start.querySelector('.lb-start__chapters');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='lb-start__chapters';
      wrap.innerHTML=
        '<div class="lb-start__ch-label">📖 '+chapterMeta.length+'챕터 구성</div>'+
        '<ul class="lb-start__ch-list" id="skChapterPreviewList"></ul>';
      var anchor=start.querySelector('.lb-start__note');
      if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(wrap,anchor.nextSibling);
      else start.appendChild(wrap);
    }
    var labelEl = wrap.querySelector('.lb-start__ch-label');
    if (labelEl) labelEl.textContent = '📖 ' + chapterMeta.length + '챕터 구성';
    var list=document.getElementById('skChapterPreviewList')||wrap.querySelector('.lb-start__ch-list');
    if(!list)return;
    var html='';
    for(var i=0;i<chapterMeta.length;i++){
      var meta = chapterMeta[i] || { title: 'Chapter ' + (i + 1), subtitle: '' };
      html+='<li class="lb-start__ch-item lb-start__ch-item--detail">'+
        '<div class="lb-start__ch-head" style="display:flex;gap:8px;align-items:flex-start;">'+
          '<span class="lb-start__ch-num">Ch.'+(i+1)+'</span>'+
          '<span class="lb-start__ch-title">'+_escHtml(meta.title)+'</span>'+
        '</div>'+
        '<p class="lb-start__ch-sub" style="margin:6px 0 0 58px;font-size:0.85rem;line-height:1.55;color:#cffafe;">'+_escHtml(meta.subtitle||'')+'</p>'+
      '</li>';
    }
    list.innerHTML=html;
  }

  var SK_ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII'];

  function _renderToc(){
    var nav=document.getElementById('skToc');
    if(!nav)return;
    var existing = nav.querySelectorAll('[data-sk-chapter]');
    if(existing.length===_totalChapters && existing.length>0)return;
    var html='';
    for(var i=1;i<=_totalChapters;i++) html+='<button type="button" class="lb-toc-item sk-toc-item'+(i===1?' active':'')+'" data-sk-chapter="'+i+'">'+(SK_ROMAN[i-1]||String(i))+'</button>';
    nav.innerHTML=html;
  }

  function _bindToc(){
    var nav=document.getElementById('skToc');
    if(!nav)return;
    _renderToc();
    if(nav._skBound)return;
    nav._skBound=true;
    nav.addEventListener('click',function(e){
      var btn=e.target.closest('[data-sk-chapter]');
      if(!btn)return;
      var ch=Number(btn.getAttribute('data-sk-chapter'));
      if(!ch||!_chapters[ch-1])return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.sk-toc-item'),function(b){
        b.classList.toggle('active',b===btn);
        b.classList.toggle('loaded',!!_chapters[Number(b.getAttribute('data-sk-chapter'))-1]);
      });
    });
  }

  function _numOrText(v, suffix){
    var n=Number(v);
    if(!isFinite(n)) return '정보 없음';
    var rounded=Math.round(n*10)/10;
    return String(rounded)+(suffix||'');
  }

  function _renderSukuyoChartCard(chart){
    if(!chart||!chart.core) return '';
    var core=chart.core||{};
    var phase=chart.moonPhase||{};
    var rel=chart.relation||{};
    var wheel=Array.isArray(chart.wheel)?chart.wheel:[];
    var chips='';
    for(var i=0;i<wheel.length;i++){
      var node=wheel[i]||{};
      var isPrimary=!!node.isPrimary;
      var isPartner=!!node.isPartner;
      var bg=isPrimary?'rgba(56,189,248,0.35)':(isPartner?'rgba(186,230,253,0.3)':'rgba(8,47,73,0.44)');
      var border=isPrimary?'rgba(125,211,252,0.9)':(isPartner?'rgba(186,230,253,0.8)':'rgba(125,211,252,0.24)');
      chips+='<span style="display:inline-flex;align-items:center;gap:3px;padding:4px 8px;border-radius:999px;background:'+bg+';border:1px solid '+border+';font-size:11px;color:#ecfeff;">'+
        '<strong style="font-weight:700;">'+_escHtml(String(node.mansion||'?'))+'</strong>'+
        '<span style="opacity:0.85">'+_escHtml(String(node.mansionCh||''))+'</span>'+
      '</span>';
    }
    return '<section style="margin:0 0 16px;padding:14px 14px 12px;border-radius:14px;border:1px solid rgba(125,211,252,0.34);background:linear-gradient(135deg,rgba(2,6,23,0.76),rgba(8,47,73,0.7));">'+
      '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">'+
        '<div><p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;color:#bae6fd;text-transform:uppercase;">SUKUYO ORIENTAL CHART</p><h3 style="margin:0;font-size:16px;color:#e0f2fe;">'+_escHtml(String(core.primaryMansion||'본명숙 정보 없음'))+'</h3></div>'+
        '<div style="display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:6px 10px;font-size:12px;color:#e0f2fe;">'+
          '<span>방위: <strong>'+_escHtml(String(core.primaryDirection||'정보 없음'))+'</strong></span>'+
          '<span>오행: <strong>'+_escHtml(String(core.primaryElement||'정보 없음'))+'</strong></span>'+
          '<span>월상: <strong>'+_escHtml(String(phase.label||'정보 없음'))+'</strong></span>'+
          '<span>삭망각: <strong>'+_escHtml(_numOrText(phase.phaseAngle,'도'))+'</strong></span>'+
          '<span>조도: <strong>'+_escHtml(_numOrText(phase.illumination,'%'))+'</strong></span>'+
          '<span>관계축: <strong>'+_escHtml(String(rel.label||'개인 리포트'))+'</strong></span>'+
        '</div>'+
      '</div>'+
      '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(125,211,252,0.35);display:flex;flex-wrap:wrap;gap:6px;">'+chips+'</div>'+
    '</section>';
  }

  function _renderChapter(ch){
    var content=_qs('skChapterContent');
    if(!content)return;
    var idx=ch-1, data=_chapters[idx];
    if(!data){content.innerHTML='<p class="zb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';return;}
    var chapterMeta = _getChapterMetaAt(idx);
    var chartHtml=(ch===1)?_renderSukuyoChartCard(_sukuyoChart):'';
    content.innerHTML='<div class="zb-chapter-wrap"><div class="zb-chapter-header"><span class="zb-chapter-num">Chapter '+ch+'</span><h2 class="zb-chapter-title">'+_escHtml(chapterMeta.title)+'</h2><p class="zb-chapter-sub">'+_escHtml(chapterMeta.subtitle||'')+'</p></div>'+chartHtml+'<div class="zb-chapter-body">'+_md2html(data)+'</div></div>';
    content.scrollTop=0;
  }

  function _updateTocState(){
    _renderToc();
    Array.prototype.forEach.call(document.querySelectorAll('#skToc .sk-toc-item'),function(btn){
      var ch=Number(btn.getAttribute('data-sk-chapter'));
      btn.classList.toggle('loaded',!!_chapters[ch-1]);
      btn.classList.toggle('active',ch===1);
    });
  }

  window.openSukuyoBookModal = function(profileArg){
    // 로그인 세션 확인 — 비로그인(게스트) 상태에서는 서비스 진입 차단
    if (typeof window.__dpHasLoginSession === 'function' && !window.__dpHasLoginSession()) {
      if (typeof window.__cdOpenLoginRequiredModal === 'function') {
        window.__cdOpenLoginRequiredModal({ reason: 'login_required', redirectTo: window.location.pathname });
      }
      return;
    }
    var modal=_qs('sukuyoBookModal');
    if(!modal){console.error('[숙요점 프리미엄] sukuyoBookModal 요소를 찾을 수 없습니다.');return;}
    _applySukuyoTheme(modal);
    var _pvwEl=document.getElementById('tilePvwOverlay');if(_pvwEl){_pvwEl.classList.remove('pvw-open');_pvwEl.style.opacity='0';_pvwEl.style.pointerEvents='none';_pvwEl.style.visibility='hidden';setTimeout(function(){_pvwEl.style.opacity='';_pvwEl.style.pointerEvents='';_pvwEl.style.visibility='';},400);}
    if (profileArg && profileArg.birth && profileArg.birth.year) {
      try { window.__cdActiveBirthProfile = profileArg; } catch (_) {}
    }
    var profile=(profileArg && profileArg.birth && profileArg.birth.year) ? profileArg : _getActiveBirthProfile();
    if(!profile){
      modal.style.display='flex'; modal.style.zIndex='100120';
      document.body.style.overflow='hidden';
      document.body.classList.add('lb-modal-open');
      try{modal.setAttribute('aria-hidden','false');}catch(_){ }
      _showScreen('skNoProfileScreen');
      return;
    }
    if(!window.__cdActiveBirthProfile||!window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile=profile;
    var saved=_skLoadSaved(profile);
    if(saved&&saved.chapters&&saved.chapters.some(Boolean)){
      _reportMode = saved.reportMode === 'compatibility' ? 'compatibility' : 'personal';
      _syncReportModeSelector(_reportMode);
      _applyReportModeUi();
      _totalChapters = Number(saved.totalChapters) || 13;
      _chapters=saved.chapters;
      if (_chapters.length !== _totalChapters) {
        _chapters = _chapters.slice(0, _totalChapters);
        while (_chapters.length < _totalChapters) _chapters.push(null);
      }
      _sukuyoChart=saved.chart||null;
      _reportId = String(saved.reportId || '');
      _canonicalSukuyoCompatibility = saved.canonicalSukuyoCompatibility || null;
      _chapterMetaRuntime = Array.isArray(saved.chapterMetaRuntime) ? saved.chapterMetaRuntime.slice(0, _totalChapters) : Array(_totalChapters).fill(null);
      while (_chapterMetaRuntime.length < _totalChapters) _chapterMetaRuntime.push(null);
      _currentChapter=1;
      _showScreen('skResultScreen');
      _updateTocState(); _renderChapter(1); _bindToc();
      var nameEl=_qs('skResultName'),dateEl=_qs('skResultDate');
      if(nameEl) nameEl.textContent='💫 '+(saved.name||'사용자')+'님의 숙요점 인생 총람';
      if(dateEl){var b=saved.birth||{};var sd=saved.savedAt?new Date(saved.savedAt).toLocaleDateString('ko-KR'):'';dateEl.textContent=[b.year,b.month,b.day].filter(Boolean).join('.')+(sd?' · 💾 '+sd+' 저장':'');}
      modal.style.display='flex'; modal.style.zIndex='100120'; document.body.style.overflow='hidden';
      document.body.classList.add('lb-modal-open');
      try{modal.setAttribute('aria-hidden','false');}catch(_){}
      return;
    }
    _reportMode = _getReportMode();
    _resetChapterState();
    _sukuyoChart=null;
    _currentChapter=1;
    _showScreen('skStartScreen');
    _ensureReportModeSelector();
    modal.style.display='flex'; modal.style.zIndex='100120';
    document.body.style.overflow='hidden';
    document.body.classList.add('lb-modal-open');
    try{modal.setAttribute('aria-hidden','false');var cb=modal.querySelector('.lb-modal__close');if(cb)setTimeout(function(){cb.focus();},60);}catch(_){}
    _prefillSukuyoProfile(profile);
    _renderDetailedChapterPreview();
    _populatePartnerSelects();
    _bindPartnerGenderToggle();
  };

  function _prefillSukuyoProfile(profile){
    if(!profile)return;
    var b=profile.birth||{};
    var infoEl=_qs('skProfileSummary');
    if(infoEl&&b.year){
      infoEl.textContent=(profile.name||'사용자')+' · '+(profile.gender==='F'?'여성':profile.gender==='M'?'남성':'')+' · '+b.year+'년 '+(b.month||'')+'월 '+(b.day||'')+'일 '+(b.hour!==undefined?b.hour+'시':'')+(b.minute&&b.minute>0?' '+b.minute+'분':'')+'생';
      infoEl.style.display='';
    }
  }

  var _partnerSelectsPopulated=false;
  function _populatePartnerSelects(){
    if(_partnerSelectsPopulated)return;
    _partnerSelectsPopulated=true;
    var hourSel=document.getElementById('skPartnerHour');
    var minSel=document.getElementById('skPartnerMinute');
    if(hourSel&&hourSel.options.length<=1){
      var hourLabels=['자시(0시)','축시(1시)','인시(2시)','묘시(3시)','진시(4시)','사시(5시)','오시(6시)','미시(7시)','신시(8시)','유시(9시)','술시(10시)','해시(11시)'];
      for(var h=0;h<24;h++){
        var opt=document.createElement('option');
        opt.value=String(h);
        opt.textContent=h+'시'+(h<12?'  ('+hourLabels[h]+')':'');
        hourSel.appendChild(opt);
      }
    }
    if(minSel&&minSel.options.length<=1){
      for(var m=0;m<60;m+=5){
        var mopt=document.createElement('option');
        mopt.value=String(m);
        mopt.textContent=(m<10?'0':'')+m+'분';
        minSel.appendChild(mopt);
      }
    }
  }

  function _bindPartnerGenderToggle(){
    var btnF=document.getElementById('skPartnerGenderF');
    var btnM=document.getElementById('skPartnerGenderM');
    if(!btnF||!btnM||btnF._skBound)return;
    btnF._skBound=true;
    btnF.addEventListener('click',function(){btnF.classList.add('on');btnM.classList.remove('on');});
    btnM.addEventListener('click',function(){btnM.classList.add('on');btnF.classList.remove('on');});
  }

  function _readPartnerData(){
    if (_reportMode !== 'compatibility') {
      return { name: '', year: null, month: null, day: null, hour: null, minute: null, gender: 'F', calType: 'solar' };
    }
    var nameEl=document.getElementById('skPartnerName');
    var dateEl=document.getElementById('skPartnerBirthDate');
    var hourEl=document.getElementById('skPartnerHour');
    var minEl=document.getElementById('skPartnerMinute');
    var calTypeEls=document.querySelectorAll('[name="skPartnerCalType"]');
    var genderF=document.getElementById('skPartnerGenderF');
    var calType='solar';
    for(var i=0;i<calTypeEls.length;i++){if(calTypeEls[i].checked){calType=calTypeEls[i].value;break;}}
    var dateVal=dateEl?dateEl.value:'';
    var parts=dateVal?dateVal.split('-'):[];
    return {
      name:(nameEl&&nameEl.value.trim())||'',
      year:parts[0]?Number(parts[0]):null,
      month:parts[1]?Number(parts[1]):null,
      day:parts[2]?Number(parts[2]):null,
      hour:hourEl&&hourEl.value!==''?Number(hourEl.value):null,
      minute:minEl&&minEl.value!==''?Number(minEl.value):null,
      gender:(genderF&&genderF.classList.contains('on'))?'F':'M',
      calType:calType
    };
  }

  window.closeSukuyoBookModal = function(){
    var modal=_qs('sukuyoBookModal');
    if(!modal)return;
    if(_mysticTimer){clearInterval(_mysticTimer);_mysticTimer=null;}
    modal.style.display='none';
    document.body.style.overflow='';
    document.body.classList.remove('lb-modal-open');
    try{modal.setAttribute('aria-hidden','true');}catch(_){}
  };

  window.generateSukuyoBook = function(){
    if(_generating)return;
    var profile=_getActiveBirthProfile();
    if(!profile){alert('사주/숙요 계산을 먼저 완료해 주세요.');return;}
    if(!window.__cdActiveBirthProfile||!window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile=profile;
    var b=profile.birth||{};
    if(!b.year||!b.month||!b.day){alert('생년월일을 확인할 수 없습니다. 사주 계산 후 다시 시도해 주세요.');return;}

    _reportMode = _getReportMode();
    var partner=_readPartnerData();
    if (_reportMode === 'compatibility' && (!partner.year || !partner.month || !partner.day)) {
      alert('궁합 모드에서는 상대방 생년월일을 입력해 주세요.');
      return;
    }

    _ensureCompatibilitySurchargeIfNeeded(profile, partner).then(function (chargeResult) {
      if (!chargeResult || !chargeResult.ok) {
        alert((chargeResult && chargeResult.message) || '궁합 추가 코인 차감에 실패했습니다.');
        return;
      }

      _generating=true;
      _resetChapterState();
      _sukuyoChart=null;
      _showScreen('skLoadingScreen');
      _activateCinematicLoading('skLoadingScreen','#67e8f9','#0369a1','rgba(34,211,238,0.46)');

    var progressBar=_qs('skProgressBar'),progressText=_qs('skProgressText');
    var stageEl=_qs('skLoadingStageText');
    if(!stageEl&&progressText&&progressText.parentElement){
      stageEl=document.createElement('div');
      stageEl.id='skLoadingStageText';
      stageEl.style.cssText='margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(56,189,248,0.12);border:1px solid rgba(125,211,252,0.35);font-size:0.83rem;color:#cffafe;line-height:1.45;';
      progressText.parentElement.appendChild(stageEl);
    }
    var chapterMsg=_qs('skLoadingChapter'),chapterNumEl=_qs('skLoadingChapterNum');
    var mysticEl=_qs('skMysticQuote');

    if(_mysticTimer)clearInterval(_mysticTimer);
    var _mqIdx=0;
    if(mysticEl){mysticEl.textContent=MYSTIC_QUOTES[0];mysticEl.classList.remove('lb-fade-out');}
    _mysticTimer=setInterval(function(){
      _mqIdx=(_mqIdx+1)%MYSTIC_QUOTES.length;
      if(mysticEl){mysticEl.classList.add('lb-fade-out');setTimeout(function(){if(mysticEl){mysticEl.textContent=MYSTIC_QUOTES[_mqIdx];mysticEl.classList.remove('lb-fade-out');}},420);}
    },3600);

    var chDots=document.querySelectorAll('.sk-ch-dot');
    Array.prototype.forEach.call(chDots,function(d){d.classList.remove('zb-ch-dot--done','zb-ch-dot--active','lb-ch-dot--done','lb-ch-dot--active','lb-ch-dot--just-done');});
    if(chDots[0])chDots[0].classList.add('zb-ch-dot--active','lb-ch-dot--active');

    var chapterWrap = chapterNumEl && chapterNumEl.parentElement && chapterNumEl.parentElement.classList && chapterNumEl.parentElement.classList.contains('lb-loading__chapter')
      ? chapterNumEl.parentElement
      : null;
    var activeLoading = _getActiveLoadingMessages();

    function _setProgress(done){
      var pct=Math.round((done/_totalChapters)*100);
      if(progressBar)progressBar.style.width=pct+'%';
      if(progressText)progressText.textContent=done+' / '+_totalChapters+' 챕터 완성 ('+pct+'%)';
      if(stageEl){
        var _phase=done===0
          ? '별자리 관계 데이터 정렬 중'
          : (done<_totalChapters?('AI가 Chapter '+(done+1)+' 숙요 해석 중'):'PDF 저장 준비 완료');
        var _chapterMeta = _getChapterMetaAt(done);
        var _subtitle=done<_totalChapters?((_chapterMeta&&_chapterMeta.subtitle)||''):'전체 챕터 정리를 완료했습니다.';
        stageEl.textContent='진행 단계: '+_phase+(_subtitle?' · '+_subtitle:'');
      }
      if(chapterMsg&&done<_totalChapters)chapterMsg.textContent=activeLoading[done]||'분석 중...';
      if(chapterMsg&&done>=_totalChapters)chapterMsg.textContent='숙요점 인생 총람이 완성되었습니다 ✦';
      if(chapterNumEl)chapterNumEl.textContent=done<_totalChapters?'Chapter '+(done+1):'✦ 완성 ✦';
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
      Array.prototype.forEach.call(chDots,function(d){
        var ch=Number(d.getAttribute('data-skch'));
        var isDone=ch<=done;
        var isActive=ch===done+1&&done<_totalChapters;
        var wasDone=d.classList.contains('zb-ch-dot--done')||d.classList.contains('lb-ch-dot--done');
        d.classList.toggle('zb-ch-dot--done',isDone);
        d.classList.toggle('zb-ch-dot--active',isActive);
        d.classList.toggle('lb-ch-dot--done',isDone);
        d.classList.toggle('lb-ch-dot--active',isActive);
        if(!wasDone&&isDone){
          d.classList.add('lb-ch-dot--just-done');
          setTimeout(function(){ d.classList.remove('lb-ch-dot--just-done'); }, 760);
          d.style.animation='none';requestAnimationFrame(function(){requestAnimationFrame(function(){d.style.animation='';});});
        }
      });
    }

    _setProgress(0);

    function _fetchChapter(idx){
      var endpoints = _buildApiCandidates('/api/premium/sukuyo-life');
      var lunarHint = _resolveExistingLunarHint(profile);
      var previousChapterTexts = _chapters.slice(0, idx).filter(function (t) { return typeof t === 'string' && t.trim(); });
      function _attempt(tryNo){
        return new Promise(function(resolve){
          var tid=setTimeout(function(){resolve({ok:false,message:'응답 시간 초과 (120초).'});},120000);
          var endpoint = endpoints[(tryNo - 1) % endpoints.length] || '/api/premium/sukuyo-life';
          fetch(endpoint,{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({year:b.year,month:b.month,day:b.day,hour:b.hour!==undefined?b.hour:12,chapter:idx+1,
              name: profile.name || '사용자',
              reportId:_reportId||undefined,
              reportType:_reportMode,
              reportMode:_reportMode,
              includeCompatibility:_reportMode==='compatibility',
              previousChapterTexts: previousChapterTexts,
              lunarMonth:lunarHint?lunarHint.lunarMonth:undefined,
              lunarDay:lunarHint?lunarHint.lunarDay:undefined,
              isLeap:lunarHint?lunarHint.isLeap:undefined,
              partnerName:partner.name||undefined,
              partnerYear:partner.year||undefined,
              partnerMonth:partner.month||undefined,
              partnerDay:partner.day||undefined,
              partnerHour:partner.hour!==null?partner.hour:undefined,
              partnerMinute:partner.minute!==null?partner.minute:undefined,
              partnerGender:partner.gender||undefined,
              partnerCalType:partner.calType||undefined
            })
          })
          .then(function(res){return res.ok?res.json():res.json().catch(function(){return{};}).then(function(e){return{ok:false,message:(e&&e.message)||'HTTP '+res.status};});})
          .then(function(data){clearTimeout(tid);resolve(data);})
          .catch(function(err){clearTimeout(tid);resolve({ok:false,message:String(err&&err.message?err.message:err)});});
        }).then(function(data){
          var maxTry = Math.max(4, endpoints.length);
          if(data&&data.ok&&data.text) return data;
          if(tryNo>=maxTry) return data;
          return _attempt(tryNo+1);
        });
      }
      return _attempt(1);
    }

    var _failCount=0;
    (function generateNext(idx){
      if(idx>=_totalChapters){
        clearInterval(_mysticTimer);_mysticTimer=null;_generating=false;
        var validCount=_chapters.filter(function(c){return typeof c==='string'&&c.trim().length>=900&&!/^⚠️/.test(c.trim());}).length;
        if(validCount<_totalChapters){
          var errEl=_qs('skErrorMsg');
          if(errEl)errEl.textContent='챕터 생성이 불완전합니다 ('+validCount+'/'+_totalChapters+'). 자동 환급을 시도합니다. 잠시 후 다시 시도해 주세요.';
          _showScreen('skErrorScreen');
          _autoRefundPremium(PREMIUM_SUKUYO_COST, PREMIUM_SUKUYO_FEATURE_KEY, '숙요 프리미엄 PDF', PREMIUM_SUKUYO_TX_KEY)
            .then(function(){
              if (_reportMode === 'compatibility') {
                return _autoRefundPremium(PREMIUM_SUKUYO_COMPAT_EXTRA_COST, PREMIUM_SUKUYO_COMPAT_FEATURE_KEY, '숙요 궁합 추가 결제', PREMIUM_SUKUYO_COMPAT_TX_KEY);
              }
              return false;
            })
            .then(function(refunded){ if(refunded) window.alert('숙요 프리미엄 결제가 자동 환급되었습니다.'); });
          return;
        }
        try { sessionStorage.removeItem(PREMIUM_SUKUYO_TX_KEY); } catch (_) {}
        try { sessionStorage.removeItem(PREMIUM_SUKUYO_COMPAT_TX_KEY); } catch (_) {}
        _showScreen('skResultScreen');
        _updateTocState();_renderChapter(1);_bindToc();
        var prof=window.__cdActiveBirthProfile||{};
        var _nameEl=_qs('skResultName'),_dateEl=_qs('skResultDate');
        if(_nameEl)_nameEl.textContent='💫 '+(prof.name||'사용자')+'님의 숙요점 인생 총람';
        if(_dateEl){var _b=prof.birth||{};_dateEl.textContent=[_b.year,_b.month,_b.day].filter(Boolean).join('.')+'생 · 🗓️ '+new Date().toLocaleDateString('ko-KR')+' 발행';}
        _skSaveResult(prof);
        return;
      }
      if(chapterMsg)chapterMsg.textContent=activeLoading[idx]||'분석 중...';
      _fetchChapter(idx).then(function(data){
        if(data&&data.ok&&data.text){
          _chapters[idx]=data.text;
          if(!_sukuyoChart&&data.chart) _sukuyoChart=data.chart;
          if(data.chapterMeta) _chapterMetaRuntime[idx]=data.chapterMeta;
          if(data.reportId) _reportId=String(data.reportId);
          if(data.canonicalSukuyoCompatibility) _canonicalSukuyoCompatibility=data.canonicalSukuyoCompatibility;
        }
        else{_failCount++;var msg=(data&&(data.error||data.message))?data.error||data.message:'알 수 없는 오류';console.warn('[숙요] Chapter '+(idx+1)+' 실패:',msg);_chapters[idx]='⚠️ **이 챕터의 분석을 불러오는 데 실패했습니다.**\n\n오류: '+msg+'\n\n잠시 후 다시 시도해 주세요.';}
        _setProgress(idx+1);
        generateNext(idx+1);
      });
    })(0);
    });
  };

  function _buildSukuyoCalcSummaryRows(profile){
    var birth = (profile && profile.birth) || {};
    var canonical = _canonicalSukuyoCompatibility || {};
    var personA = canonical.personA || {};
    var sukuyo = personA.sukuyo || {};
    var comp = canonical.compatibility || {};
    var source = canonical.calculationMeta || {};
    var rows = [
      ['양력 생일', [birth.year,birth.month,birth.day].filter(Boolean).join('-') || '정보 없음'],
      ['음력 생일', (personA.birth && personA.birth.lunarDate) || '정보 없음'],
      ['윤달 여부', (personA.birth && personA.birth.isLeapMonth != null) ? String(!!personA.birth.isLeapMonth) : '정보 없음'],
      ['본명숙', (sukuyo.nameKo && sukuyo.nameHan) ? (sukuyo.nameKo + '宿 / ' + sukuyo.nameHan + '宿') : '정보 없음'],
      ['27숙 index', sukuyo.index != null ? String(sukuyo.index) : '정보 없음'],
      ['월상', (_sukuyoChart && _sukuyoChart.moonPhase && _sukuyoChart.moonPhase.label) || '정보 없음'],
      ['조도', (_sukuyoChart && _sukuyoChart.moonPhase && _sukuyoChart.moonPhase.illumination != null) ? (Math.round(Number(_sukuyoChart.moonPhase.illumination) * 10) / 10) + '%' : '정보 없음'],
      ['삭망각', (_sukuyoChart && _sukuyoChart.moonPhase && _sukuyoChart.moonPhase.phaseAngle != null) ? (Math.round(Number(_sukuyoChart.moonPhase.phaseAngle) * 10) / 10) + '도' : '정보 없음'],
      ['방향', sukuyo.direction || '정보 없음'],
      ['속성', sukuyo.element || '정보 없음'],
      ['핵심 키워드', Array.isArray(sukuyo.keywords) ? sukuyo.keywords.join(', ') : '정보 없음'],
      ['계산 소스', source.calendarSource || source.engine || '정보 없음']
    ];
    if (_reportMode === 'compatibility') {
      rows.push(['관계 유형', comp.relationType || '정보 없음']);
      rows.push(['거리', comp.shortestDistance != null ? String(comp.shortestDistance) : '정보 없음']);
    }
    return rows;
  }

  function _renderSukuyoCalcSummaryHtml(profile){
    var rows = _buildSukuyoCalcSummaryRows(profile);
    var tr='';
    for(var i=0;i<rows.length;i++){
      tr += '<tr><th>'+_escHtml(rows[i][0])+'</th><td>'+_escHtml(rows[i][1])+'</td></tr>';
    }
    return '<section class="calc-summary page-break"><h2>계산 데이터 요약표</h2><table><thead><tr><th>항목</th><th>값</th></tr></thead><tbody>'+tr+'</tbody></table></section>';
  }

  window.downloadSukuyoBookPdf = function(){
    if(!_chapters.some(Boolean)){alert('먼저 숙요점 인생 총람을 생성해 주세요.');return;}
    var profile=window.__cdActiveBirthProfile||{};
    var name=(profile.name||'사용자')+'님의 숙요점 인생 총람';
    var birth=profile.birth||{};
    var issued=new Date().toLocaleDateString('ko-KR');
    var tocItems='';
    var bodyHtml='';
    for(var i=0;i<_totalChapters;i++){
      if(!_chapters[i])continue;
      var meta = _getChapterMetaAt(i);
      tocItems += '<li><span>Chapter '+(i+1)+'</span><strong>'+_escHtml(meta.title)+'</strong></li>';
      bodyHtml+='<section class="chapter page-break"><div class="chapter-header"><span class="chapter-num">Chapter '+(i+1)+'</span><h2 class="chapter-title">'+_escHtml(meta.title)+'</h2><p class="chapter-sub">'+_escHtml(meta.subtitle||'')+'</p></div><div class="chapter-body">'+_md2html(_chapters[i])+'</div></section>';
    }
    var fullHtml='<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>'+_escHtml(name)+'</title>' +
      '<style>@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&family=Noto+Sans+KR:wght@400;500;700&display=swap");' +
      '@page{size:A4;margin:18mm 16mm 20mm;}' +
      'html,body{margin:0;padding:0;background:#fff;color:#0f172a;}' +
      'body{font-family:"Noto Serif KR","Noto Sans KR",serif;line-height:1.8;word-break:keep-all;line-break:strict;overflow-wrap:anywhere;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(150deg,#020817 0%,#0f172a 45%,#082f49 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:11px;letter-spacing:.2em;color:#7dd3fc;margin-bottom:14px;text-transform:uppercase;}' +
      '.cover-title{font-size:38px;font-weight:700;margin:0 0 10px;color:#fff;}' +
      '.cover-name{font-size:24px;color:#bae6fd;margin:10px 0 6px;}' +
      '.cover-info{font-size:13px;color:#cbd5e1;}' +
      '.toc{padding:4mm 0 0;page-break-after:always;}' +
      '.toc h2{font-size:24px;margin:0 0 14px;color:#0c4a6e;}' +
      '.toc ol{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:1fr;gap:8px;}' +
      '.toc li{display:flex;justify-content:space-between;gap:12px;padding:8px 10px;border-radius:10px;background:#f0f9ff;border:1px solid #bae6fd;font-size:13px;}' +
      '.calc-summary{padding-top:2mm;page-break-after:always;}' +
      '.calc-summary h2{font-size:22px;margin:0 0 12px;color:#0c4a6e;}' +
      'table{width:100%;border-collapse:collapse;font-size:13px;page-break-inside:auto;}' +
      'thead{display:table-header-group;} tr{page-break-inside:avoid;page-break-after:auto;}' +
      'th,td{border:1px solid #cbd5e1;padding:8px 10px;vertical-align:top;} th{background:#eff6ff;text-align:left;width:30%;}' +
      '.chapter{padding-top:2mm;}' +
      '.chapter-header{border-bottom:2px solid #7dd3fc;margin-bottom:16px;padding-bottom:12px;}' +
      '.chapter-num{font-size:11px;letter-spacing:.18em;color:#0284c7;text-transform:uppercase;}' +
      '.chapter-title{font-size:24px;font-weight:700;color:#0f172a;margin:6px 0 4px;}' +
      '.chapter-sub{font-size:13px;color:#0369a1;margin:0;}' +
      '.chapter-body h1,.chapter-body h2,.chapter-body h3,.chapter-body h4{color:#0f172a;margin-top:16px;}' +
      '.chapter-body p{margin:0 0 10px;color:#111827;}' +
      '.chapter-body blockquote{border-left:3px solid #38bdf8;padding:8px 14px;background:#f0f9ff;margin:14px 0;}' +
      '.chapter-body ul,.chapter-body ol{padding-left:1.4em;}' +
      '.chapter-body li{margin-bottom:5px;}' +
      '.page-break{page-break-before:always;}' +
      '.page-footer{position:fixed;left:0;right:0;bottom:4mm;text-align:center;font-size:10px;color:#94a3b8;}' +
      '.page-footer:after{content:"Page " counter(page);}' +
      '</style></head><body>' +
      '<div class="cover"><p class="cover-badge">SUKUYO 宿曜占 PREMIUM</p>' +
      '<h1 class="cover-title">숙요점 인생 총람</h1>' +
      '<p style="font-size:15px;color:#bae6fd;margin-bottom:14px;">정확한 본명숙 계산값 기반 '+_totalChapters+'챕터 리포트</p>' +
      '<div style="width:64px;height:1px;background:rgba(125,211,252,0.45);margin:0 auto 16px;"></div>' +
      '<p class="cover-name">'+_escHtml((profile.name||'사용자'))+'님의 숙요 리포트</p>' +
      '<p class="cover-info">'+([birth.year,birth.month,birth.day].filter(Boolean).join('년 ')+(birth.day?'일':'')||'생년월일 미상')+'</p>' +
      '<p class="cover-info" style="margin-top:8px;">발행일 '+issued+'</p></div>' +
      '<section class="toc"><h2>목차</h2><ol>'+tocItems+'</ol></section>' +
      _renderSukuyoCalcSummaryHtml(profile) +
      bodyHtml +
      '<div class="page-footer"></div>' +
      '</body></html>';

    var blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    var blobUrl = URL.createObjectURL(blob);
    var win = window.open(blobUrl, '_blank', 'width=940,height=760');
    if (!win) {
      URL.revokeObjectURL(blobUrl);
      alert('팝업이 차단되어 PDF 생성 창을 열 수 없습니다.\n브라우저 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    var revokeLater = setTimeout(function(){ try{ URL.revokeObjectURL(blobUrl); }catch(_){} }, 120000);
    var triggerPrint = function(){
      try { win.focus(); } catch (_) {}
      try { win.print(); } catch (_) {}
    };
    try {
      win.addEventListener('load', function(){ setTimeout(triggerPrint, 700); });
      win.onafterprint = function(){
        clearTimeout(revokeLater);
        setTimeout(function(){ try{ URL.revokeObjectURL(blobUrl); }catch(_){} }, 1000);
      };
    } catch (_) {
      setTimeout(triggerPrint, 1200);
    }
  };

  document.addEventListener('click',function(e){
    var el=e.target; if(!el)return;
    var node=el.closest?el.closest('[data-action]'):null; if(!node)return;
    var act=node.getAttribute('data-action');
    if(act==='closeSukuyoBookModal'){window.closeSukuyoBookModal();e.stopPropagation();}
  });

  window.gotoSukuyoPremium = function(profileArg){window.openSukuyoBookModal(profileArg);};
  _ensureReportModeSelector();
})();
