/**
 * 숙요점 프리미엄 (Sukuyo 宿曜占 — Premium Life Report)
 * CODE-DESTINY v1.0  •  27수 숙요 기반 10챕터 궁합 리포트
 */
(function () {
  'use strict';

  var CHAPTER_TITLES = [
    '1장. 두 사람의 본명숙과 첫 끌림의 구조',
    '2장. 관계 유형과 거리감이 만드는 운명의 구조',
    '3장. 감정선과 애착 온도차',
    '4장. 갈등과 그림자의 충돌 패턴',
    '5장. 사랑의 몰입도와 현실 적합성',
    '6장. 소통, 신뢰, 경계선의 협상',
    '7장. 재회, 이별, 반복 인연의 가능성',
    '8장. 결혼, 동거, 장기 파트너십 적합성',
    '9장. 서로를 성장시키는 힘과 위험 신호',
    '10장. 두 사람을 위한 실행형 궁합 로드맵',
  ];

  var CHAPTER_SUBTITLES = [
    'A/B 본명숙, 기본 기질, 첫 인상과 초반 흡인력을 해석합니다.',
    'relationType과 거리감을 중심으로 두 사람의 핵심 궁합 구조를 읽습니다.',
    '감정 리듬, 애착 속도, 서운함이 쌓이는 경로를 정리합니다.',
    '갈등 촉발점과 그림자 반응, 회복 프로토콜을 구체화합니다.',
    '연애 몰입, 생활 궁합, 장기 유지 가능성을 현실적으로 점검합니다.',
    '대화 습관과 신뢰 형성, 경계선 조율 방식을 해석합니다.',
    '반복 인연과 재회 가능성, 놓아야 할 시그널을 읽습니다.',
    '장기 생활과 책임 분배, 안정화 조건을 분석합니다.',
    '성장 자극과 에너지 소모, 관계 보호 장치를 정리합니다.',
    '전체 궁합을 행동 규칙과 실행 계획으로 종합합니다.',
  ];

  var LOADING_MSGS = [
    '두 사람의 본명숙 좌표와 첫 끌림의 구조를 정렬하는 중...',
    '관계 유형과 거리감을 바탕으로 궁합 축을 계산하는 중...',
    '감정선과 애착 온도차를 정밀 해석하는 중...',
    '갈등과 그림자 충돌 패턴을 정리하는 중...',
    '사랑의 몰입도와 현실 적합성을 점검하는 중...',
    '소통 습관과 신뢰의 균형점을 해석하는 중...',
    '재회와 이별, 반복 인연의 가능성을 읽는 중...',
    '장기 파트너십과 생활 궁합을 구조화하는 중...',
    '성장 자극과 위험 신호를 정리하는 중...',
    '실행형 궁합 로드맵을 완성하는 중...',
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

  var CHAPTER_STRUCTURED_LABELS = {
    1: ['A의 본명숙과 관계 반응', 'B의 본명숙과 관계 반응', '처음 끌림이 생기는 이유', '서로를 오해하기 쉬운 첫 포인트', '관계의 출발선 정리'],
    2: ['관계 유형의 본질', '거리감이 만드는 심리 메커니즘', 'A가 B에게 주는 영향', 'B가 A에게 주는 영향', '이 관계를 지배하는 기본 규칙'],
    3: ['감정 표현 속도의 차이', '서운함이 쌓이는 메커니즘', '안정감을 느끼는 조건', '정서 회복 방식의 차이', '감정 조율법'],
    4: ['갈등의 점화 포인트', '서로의 그림자가 충돌하는 순간', '싸움이 길어지는 이유', '관계를 망치지 않는 대화 규칙', '갈등 후 회복 프로토콜'],
    5: ['연애 초반 몰입도', '현실 생활 궁합', '함께 있을 때 강해지는 영역', '생활 패턴 충돌 포인트', '장기 유지 가능성'],
    6: ['말이 잘 통하는 순간', '오해가 커지는 언어 습관', '신뢰를 만드는 행동', '서로의 경계선 이해', '건강한 합의 방식'],
    7: ['헤어짐이 반복되는 이유', '재회의 조건', '놓아야 할 시그널', '다시 만난다면 필요한 변화', '인연의 학습 과제'],
    8: ['장기 파트너십의 장점', '생활 운영에서 부딪히는 지점', '책임과 역할 분배', '같이 살 때 필요한 규칙', '장기 안정화 조건'],
    9: ['서로를 성장시키는 자극', '에너지 소모 패턴', '피해야 할 행동 고리', '보완이 잘 되는 순간', '관계를 지키는 핵심 장치'],
    10: ['핵심 궁합 결론', '지금 당장 바꿔야 할 행동', '감정 소모를 줄이는 습관', '장기 관계 운영 규칙', '향후 90일 실행 로드맵'],
  };

  var CHAPTER_COUNT = CHAPTER_TITLES.length;
  var _chapters = Array(CHAPTER_COUNT).fill(null);
  var _chapterStructured = Array(CHAPTER_COUNT).fill(null);
  var _chapterMeta = Array(CHAPTER_COUNT).fill(null);
  var _skLastReportId = '';
  var _generating = false;
  var _currentChapter = 1;
  var _mysticTimer = null;
  var _premiumPaidUntil = 0;
  var _skFetchChapterForPartialRegenerate = null;
  var _skJobStateKey = 'cd:premium-job:sukuyo';

  function _skGetJobClient() {
    return (typeof window !== 'undefined' && window.CDPremiumPdfJobClient) ? window.CDPremiumPdfJobClient : null;
  }

  function _skStartPremiumJob(profile, partner) {
    var client = _skGetJobClient();
    if (!client) return;
    var birth = (profile && profile.birth) ? profile.birth : {};
    client.start({
      stateKey: _skJobStateKey,
      reportType: 'sookyoPremium',
      featureType: 'premium_pdf_sukyo_compat',
      requestBody: {
        mode: 'compatibility',
        name: String((profile && profile.name) || '사용자'),
        gender: String((profile && profile.gender) || ''),
        year: Number(birth.year || 0),
        month: Number(birth.month || 0),
        day: Number(birth.day || 0),
        hour: Number(birth.hour || 12),
        minute: Number(birth.minute || 0),
        partnerName: String((partner && partner.name) || ''),
        partnerYear: Number((partner && partner.year) || 0),
        partnerMonth: Number((partner && partner.month) || 0),
        partnerDay: Number((partner && partner.day) || 0),
      },
    }).catch(function () {});
  }

  function _skResumePremiumJob() {
    var client = _skGetJobClient();
    if (!client) return;
    client.resume({ stateKey: _skJobStateKey }).catch(function () {});
  }

  function _skRunPremiumJob(totalChapters) {
    var client = _skGetJobClient();
    if (!client) return;
    client.run({
      stateKey: _skJobStateKey,
      startChapter: 1,
      endChapter: Number(totalChapters || CHAPTER_COUNT),
      stopOnFailure: false,
    }).catch(function () {});
  }

  function _readPremiumTokenForReport() {
    var token = '';
    try { token = String(window.__cdPremiumAccessToken || '').trim(); } catch (_) { token = ''; }
    if (!token) { try { token = String(sessionStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    if (!token) { try { token = String(localStorage.getItem('cd_premium_access_token') || '').trim(); } catch (_) { token = ''; } }
    return token;
  }

  function _premiumTokenMatches(reportType) {
    var token = _readPremiumTokenForReport();
    if (!token || typeof atob !== 'function') return false;
    try {
      var payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      var exp = Number(payload && payload.exp);
      return String(payload && payload.reportType || '') === reportType
        && (!Number.isFinite(exp) || exp * 1000 > Date.now() + 5000);
    } catch (_) {
      return false;
    }
  }

  function _ensurePremiumPaymentThenStart() {
    if (_premiumTokenMatches('sookyoPremium') || Date.now() < _premiumPaidUntil) return true;
    if (typeof window._cdCoinGatePerUse !== 'function') {
      alert('결제 확인 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
      return false;
    }
    window._cdCoinGatePerUse(490, '숙요점 프리미엄 PDF 궁합 리포트 생성', function () {
      _premiumPaidUntil = Date.now() + 25 * 60 * 1000;
      window.generateSukuyoBook();
    }, null, {
      featureKey: 'premium_pdf_sukyo_compat',
      requestId: 'premium_pdf_sukyo_compat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
    });
    return false;
  }

  function _qs(id) { return document.getElementById(id); }

  function _normalizeChapterArray(source) {
    var out = Array(CHAPTER_COUNT).fill(null);
    if (!Array.isArray(source)) return out;
    for (var i = 0; i < Math.min(CHAPTER_COUNT, source.length); i++) out[i] = source[i] || null;
    return out;
  }

  function _hourLabelFor(hour) {
    var h = Number(hour);
    if (!Number.isFinite(h)) return '';
    if (h === 23 || h === 0) return '자시(23-01시)';
    if (h === 1 || h === 2) return '축시(01-03시)';
    if (h === 3 || h === 4) return '인시(03-05시)';
    if (h === 5 || h === 6) return '묘시(05-07시)';
    if (h === 7 || h === 8) return '진시(07-09시)';
    if (h === 9 || h === 10) return '사시(09-11시)';
    if (h === 11 || h === 12) return '오시(11-13시)';
    if (h === 13 || h === 14) return '미시(13-15시)';
    if (h === 15 || h === 16) return '신시(15-17시)';
    if (h === 17 || h === 18) return '유시(17-19시)';
    if (h === 19 || h === 20) return '술시(19-21시)';
    return '해시(21-23시)';
  }

  function _parseLunarHint(raw) {
    var source = String(raw || '').trim();
    if (!source) return null;
    var nums = source.match(/\d+/g);
    if (!nums || nums.length < 3) return null;
    return {
      lunarMonth: Number(nums[1]),
      lunarDay: Number(nums[2]),
      isLeapMonth: /윤/.test(source),
    };
  }

  function _solarToLunarHint(input) {
    if (!input || !input.year || !input.month || !input.day) return null;
    try {
      if (!window.KasiEngine || typeof window.KasiEngine.solarToLunar !== 'function') return null;
      var lunar = window.KasiEngine.solarToLunar(new Date(Number(input.year), Number(input.month) - 1, Number(input.day), Number(input.hour) || 12, Number(input.minute) || 0), true);
      if (!lunar || !lunar.month || !lunar.day) return null;
      return {
        lunarMonth: Number(lunar.month),
        lunarDay: Number(lunar.day),
        isLeapMonth: !!lunar.isLeap,
      };
    } catch (_) {
      return null;
    }
  }

  function _resolveSelfLunarHint(profile) {
    var birth = profile && profile.birth ? profile.birth : {};
    var direct = _parseLunarHint(birth.lunarDate);
    return direct || _solarToLunarHint(birth);
  }

  function _resolvePartnerLunarHint(partner) {
    if (!partner) return null;
    var calType = String(partner.calType || 'solar').toLowerCase();
    if (calType === 'lunar' || calType === 'lunar_leap') {
      if (!partner.month || !partner.day) return null;
      return {
        lunarMonth: Number(partner.month),
        lunarDay: Number(partner.day),
        isLeapMonth: calType === 'lunar_leap',
      };
    }
    return _solarToLunarHint(partner);
  }

  function _readCurrentSukuyoHints() {
    var basic = null;
    var compat = null;
    try { basic = window._syLastSukuyoBasicResult || null; } catch (_) { basic = null; }
    try { compat = window._syLastCompat || null; } catch (_) { compat = null; }
    return {
      currentSukuyoName: basic && basic.mansion ? String(basic.mansion) : '',
      currentSukuyoIndex: basic && Number.isFinite(Number(basic.mansionIdx)) ? Number(basic.mansionIdx) : null,
      partnerSukuyoName: compat && compat.partnerMansion ? String(compat.partnerMansion) : '',
      partnerSukuyoIndex: compat && Number.isFinite(Number(compat.partnerIdx)) ? Number(compat.partnerIdx) : null,
    };
  }

  function _getFatalChapterError(data) {
    var code = String(data && (data.code || data.errorCode) || '').trim().toUpperCase();
    var msg = String(data && (data.error || data.message) || '').trim();
    if (code === 'SUKUYO_CALCULATION_INCOMPLETE') return msg || '숙요 계산 데이터가 부족합니다.';
    if (code === 'SUKUYO_PARTNER_INPUT_REQUIRED') return msg || '상대방 생년월일 정보가 필요합니다.';
    if (code === 'SUKUYO_MODE_UNSUPPORTED') return msg || '지원하지 않는 숙요 리포트 모드입니다.';
    if (code === 'SUKYO_REPORT_PAYLOAD_INCOMPLETE' || code === 'SUKUYO_CANONICAL_INCOMPLETE') return msg || '숙요 리포트에 필요한 핵심 데이터가 부족합니다.';
    if (/숙요 계산 데이터가 불완전합니다|궁합 리포트는 상대방 생년월일이 필요합니다/.test(msg)) return msg;
    return '';
  }

  function _shouldRetryChapter(data, message) {
    var code = String(data && (data.code || data.errorCode) || '').trim().toUpperCase();
    var status = Number(data && data.status);
    var msg = String(message || '').trim();
    if (code && /INCOMPLETE|REQUIRED|UNSUPPORTED|INVALID/.test(code)) return false;
    if (Number.isFinite(status) && status >= 500) return true;
    return /응답 시간 초과|timeout|network|failed to fetch|load failed/i.test(msg);
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
    modal.style.setProperty('--lb-history-a', 'rgba(8, 145, 178, 0.2)');
    modal.style.setProperty('--lb-history-b', 'rgba(3, 105, 161, 0.48)');
    modal.style.setProperty('--lb-history-border', 'rgba(125, 211, 252, 0.52)');
    modal.style.setProperty('--lb-history-text', '#cffafe');
  }

  function _escHtml(s) {
      function _deriveTextFromChapterJson(chapterJson) {
        if (!chapterJson || !Array.isArray(chapterJson.sections)) return '';
        return chapterJson.sections.filter(function(r){return r&&String(r.body||r.content||'').trim();}).map(function(r){
          var b=String(r.body||r.content||'').trim(); var t=String(r.title||r.label||'').trim(); return t?('## '+t+'\n'+b):b;
        }).join('\n\n');
      }

      function _renderStructuredChapterBody(chapter, chapterJson) {
        if (!chapterJson || !Array.isArray(chapterJson.sections) || !chapterJson.sections.length) return '';
        var sections = chapterJson.sections;
        var labels = CHAPTER_STRUCTURED_LABELS[Number(chapter)] || [];
        var out = [];
        for (var i = 0; i < sections.length; i++) {
          var row = sections[i] || {};
          var content = String(row.body || row.content || '').trim();
          if (!content) continue;
          var title = String(row.title || row.label || labels[i] || ('핵심 항목 ' + (i + 1)));
          out.push('<section class="lb-result-article__section"><h4 class="lb-result-article__section-title">' + _escHtml(title) + '</h4><div class="lb-result-article__section-body">' + _md2html(content) + '</div></section>');
        }
        if (!out.length) return '';
        return '<div class="lb-result-article__structured">' + out.join('') + '</div>';
      }

    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function _getChapterMeta(idx){
    var base=_chapterMeta[idx]||{};
    return {
      title:String(base.title||CHAPTER_TITLES[idx]||('Chapter '+(idx+1))),
      subtitle:String(base.subtitle||CHAPTER_SUBTITLES[idx]||''),
    };
  }

  function _syncChapterMetaFromResponse(idx,data){
    if(!data||typeof data!=='object') return;
    var chapterMeta=data.chapterMeta&&typeof data.chapterMeta==='object'?data.chapterMeta:null;
    _chapterMeta[idx]={
      title:String((chapterMeta&&chapterMeta.title)||CHAPTER_TITLES[idx]||('Chapter '+(idx+1))),
      subtitle:String((chapterMeta&&chapterMeta.subtitle)||CHAPTER_SUBTITLES[idx]||''),
      isSkeleton:false,
    };
  }

  function _buildChapterSkeleton(idx,reason){
    var meta=_getChapterMeta(idx);
    return [
      '## '+meta.title,
      meta.subtitle?('> '+meta.subtitle):'',
      '',
      '### 챕터 구조 복구',
      '- 숙요 API 응답 지연으로 기본 골격을 우선 구성했습니다.',
      '- 재생성 시 동일 챕터에 본문이 자동 보강됩니다.',
      '',
      '### 실천 포인트',
      '- 달 주기 체크',
      '- 관계 에너지 점검',
      '- 다음 행동 1개 선정',
      '',
      reason?('### 참고\n- 원인: '+String(reason)):'',
      ''
    ].filter(Boolean).join('\n');
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

  var _SK_STORE_VER='sk_v2_';
  function _skMakeKey(p){var b=(p&&p.birth)||{};return _SK_STORE_VER+(b.year||'0')+'_'+(b.month||'0')+'_'+(b.day||'0')+'_'+((p&&p.gender)||'u');}
  function _hasUsableStructuredChapter(ch){
    if(!ch||typeof ch!=='object'||!Array.isArray(ch.sections))return false;
    return ch.sections.some(function(r){return r&&String(r.body||r.content||'').trim();});
  }
  function _skSaveResult(p,reportId){
    try{
      sessionStorage.setItem(_skMakeKey(p),JSON.stringify({
        chapters:_chapters,
        chapterStructured:_chapterStructured,
        chapterMeta:_chapterMeta,
        reportId:String(reportId||_skLastReportId||'').trim(),
        name:(p&&p.name)||'사용자',
        birth:(p&&p.birth)||{},
        gender:(p&&p.gender)||'',
        savedAt:new Date().toISOString()
      }));
    }catch(_){}
  }
  function _skLoadSaved(p){try{var raw=sessionStorage.getItem(_skMakeKey(p));return raw?JSON.parse(raw):null;}catch(_){return null;}}

  function _skHasSavedContent(saved){
    if(!saved||!Array.isArray(saved.chapters))return false;
    var validSavedCount=saved.chapters.filter(function(c,idx){
      var hasText=typeof c==='string'&&c.trim().length>0&&!/^⚠️/.test(c.trim());
      var structured=Array.isArray(saved.chapterStructured)?saved.chapterStructured[idx]:null;
      return hasText||_hasUsableStructuredChapter(structured);
    }).length;
    return validSavedCount>0;
  }

  function _skApplySavedResult(saved, modal){
    if(!saved||!modal)return;
    _chapters=_normalizeChapterArray(saved.chapters);
    _chapterStructured=Array.isArray(saved.chapterStructured)?saved.chapterStructured.slice(0,CHAPTER_COUNT):Array(CHAPTER_COUNT).fill(null);
    _chapterMeta=Array.isArray(saved.chapterMeta)?saved.chapterMeta.slice(0,CHAPTER_COUNT):Array(CHAPTER_COUNT).fill(null);
    _skLastReportId=String(saved.reportId||'').trim();
    _currentChapter=1;
    _showScreen('skResultScreen');
    _updateTocState();
    _renderChapter(1);
    _bindToc();
    _ensureSukuyoPartialRegenerateControl();
    var nameEl=_qs('skResultName'),dateEl=_qs('skResultDate');
    if(nameEl) nameEl.textContent='💫 '+(saved.name||'사용자')+'님의 숙요점 궁합 리포트';
    if(dateEl){var b=saved.birth||{};var sd=saved.savedAt?new Date(saved.savedAt).toLocaleDateString('ko-KR'):'';dateEl.textContent=[b.year,b.month,b.day].filter(Boolean).join('.')+(sd?' · 💾 '+sd+' 저장':'');}
  }

  function _skEnsureHistoryButton(saved, modal){
    var startScreen=_qs('skStartScreen');
    if(!startScreen||!modal)return;
    var btn=_qs('skViewSavedBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.id='skViewSavedBtn';
      btn.className='lb-btn-generate lb-btn-history';
      btn.textContent='📂 지난 숙요 궁합 리포트 열기';
      startScreen.appendChild(btn);
      btn.addEventListener('click',function(){
        var payload=btn.__savedPayload||null;
        if(!_skHasSavedContent(payload))return;
        _skApplySavedResult(payload, modal);
      });
    }
    btn.__savedPayload=saved;
    btn.style.display=_skHasSavedContent(saved)?'':'none';
  }

  function _showScreen(id){
    var screens=['skNoProfileScreen','skStartScreen','skLoadingScreen','skResultScreen','skErrorScreen'];
    for(var i=0;i<screens.length;i++){var el=_qs(screens[i]);if(el)el.style.display=(screens[i]===id)?'':'none';}
  }

  var SK_ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X'];

  function _renderToc(){
    var nav=document.getElementById('skToc');
    if(!nav||nav.querySelector('[data-sk-chapter]'))return;
    var html='';
    for(var i=1;i<=CHAPTER_COUNT;i++) html+='<button type="button" class="lb-toc-item sk-toc-item'+(i===1?' active':'')+'" data-sk-chapter="'+i+'">'+SK_ROMAN[i-1]+'</button>';
    nav.innerHTML=html;
  }

  function _bindToc(){
    var nav=document.getElementById('skToc');
    if(!nav)return;
    _renderToc();
    nav.addEventListener('click',function(e){
      var btn=e.target.closest('[data-sk-chapter]');
      if(!btn)return;
      var ch=Number(btn.getAttribute('data-sk-chapter'));
      var bi=ch-1;
      if(!ch||(!_chapters[bi]&&!_hasUsableStructuredChapter(_chapterStructured[bi])))return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.sk-toc-item'),function(b){
        var idx2=Number(b.getAttribute('data-sk-chapter'))-1;
        b.classList.toggle('active',b===btn);
        b.classList.toggle('loaded',!!_chapters[idx2]||_hasUsableStructuredChapter(_chapterStructured[idx2]));
      });
    });
  }

  function _renderChapter(ch){
    var content=_qs('skChapterContent');
    if(!content)return;
    var idx=ch-1, data=_chapters[idx], structured=_chapterStructured[idx];
    if(!data && !structured){content.innerHTML='<p class="zb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';return;}
    var meta=_getChapterMeta(idx);
    var bodyHtml=_renderStructuredChapterBody(ch,structured);
    if(!bodyHtml&&data)bodyHtml=_md2html(data);
    content.innerHTML='<div class="zb-chapter-wrap"><div class="zb-chapter-header"><span class="zb-chapter-num">Chapter '+ch+'</span><h2 class="zb-chapter-title">'+_escHtml(meta.title)+'</h2><p class="zb-chapter-sub">'+_escHtml(meta.subtitle)+'</p></div><div class="zb-chapter-body">'+bodyHtml+'</div></div>';
    content.scrollTop=0;
    _currentChapter=ch;
  }

  function _updateTocState(){
    _renderToc();
    Array.prototype.forEach.call(document.querySelectorAll('#skToc .sk-toc-item'),function(btn){
      var ch=Number(btn.getAttribute('data-sk-chapter'));
      var idx=ch-1;
      btn.classList.toggle('loaded',!!_chapters[idx]||_hasUsableStructuredChapter(_chapterStructured[idx]));
      btn.classList.toggle('active',ch===_currentChapter);
    });
  }

  function _regenerateSukuyoCurrentChapter(){
    var chapter=Number(_currentChapter||1);
    if(!Number.isFinite(chapter)||chapter<1||chapter>CHAPTER_COUNT) chapter=1;
    var idx=chapter-1;
    var fetchChapter=_skFetchChapterForPartialRegenerate;
    var runPipeline=(typeof window.__cdRunPremiumChapterPipeline==='function')?window.__cdRunPremiumChapterPipeline:null;
    if(!runPipeline){
      alert('공통 챕터 파이프라인을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if(!_skLastReportId||typeof fetchChapter!=='function'){
      alert('현재 세션 정보가 부족해 부분 재생성을 시작할 수 없습니다. 리포트를 다시 생성한 뒤 시도해 주세요.');
      return;
    }

    runPipeline({
      totalChapters:1,
      maxAttempts:3,
      retryDelayMs:3000,
      fetchChapter:function(){ return fetchChapter(idx); },
      isSuccess:function(data){ return !!(data&&data.ok&&data.text); },
      shouldFailFast:function(data){ return !!_getFatalChapterError(data); },
      onSuccess:function(_,data){
        _syncChapterMetaFromResponse(idx,data);
        _chapters[idx]=String(data.text||'').trim();
        _chapterStructured[idx]=(Array.isArray(data.sections)&&data.sections.length)?{sections:data.sections}:(data.chapterJson&&typeof data.chapterJson==='object'?data.chapterJson:null);
        _skSaveResult(window.__cdActiveBirthProfile||{},_skLastReportId);
        _updateTocState();
        _renderChapter(chapter);
      },
      onFallback:function(_,fallbackPayload,data){
        var fallbackText=String(window.__cdPremiumChapterFallbackText||'일시적인 응답 지연으로 해석을 불러오지 못했습니다. 부분 재생성 버튼을 이용해주세요.');
        var msg=(fallbackPayload&&fallbackPayload.message)?String(fallbackPayload.message):((data&&(data.error||data.message))?String(data.error||data.message):'알 수 없는 오류');
        _chapters[idx]=fallbackText;
        _chapterStructured[idx]=null;
        console.warn('[숙요] Chapter '+chapter+' 부분 재생성 실패:',msg);
        _skSaveResult(window.__cdActiveBirthProfile||{},_skLastReportId);
        _updateTocState();
        _renderChapter(chapter);
      }
    }).catch(function(error){
      var msg=String(error&&error.message?error.message:error||'부분 재생성 중 오류가 발생했습니다.');
      alert('숙요 부분 재생성 중 오류가 발생했습니다: '+msg);
    });
  }

  function _ensureSukuyoPartialRegenerateControl(){
    if(typeof window.__cdAttachPartialRegenerateControl!=='function') return;
    window.__cdAttachPartialRegenerateControl({
      scopeSelector:'#skToc',
      buttonId:'skPartialRegenerateBtn',
      buttonText:'현재 챕터 재생성',
      onClick:_regenerateSukuyoCurrentChapter
    });
  }

  window.openSukuyoBookModal = function(){
    var modal=_qs('sukuyoBookModal');
    if(!modal){console.error('[숙요점 프리미엄] sukuyoBookModal 요소를 찾을 수 없습니다.');return;}
    _applySukuyoTheme(modal);
    var _pvwEl=document.getElementById('tilePvwOverlay');if(_pvwEl){_pvwEl.classList.remove('pvw-open');_pvwEl.style.opacity='0';_pvwEl.style.pointerEvents='none';_pvwEl.style.visibility='hidden';setTimeout(function(){_pvwEl.style.opacity='';_pvwEl.style.pointerEvents='';_pvwEl.style.visibility='';},400);}
    var profile=_getActiveBirthProfile();
    if(!profile){
      modal.style.display='flex'; modal.style.zIndex='100120';
      document.body.style.overflow='hidden';
      document.body.classList.add('lb-modal-open');
      try{modal.setAttribute('aria-hidden','false');}catch(_){ }
      _showScreen('skNoProfileScreen');
      return;
    }
    _skResumePremiumJob();

    if(!window.__cdActiveBirthProfile||!window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile=profile;
    var saved=_skLoadSaved(profile);
    _chapters=Array(CHAPTER_COUNT).fill(null);
    _chapterStructured=Array(CHAPTER_COUNT).fill(null);
    _chapterMeta=Array(CHAPTER_COUNT).fill(null);
    _skLastReportId='';
    _currentChapter=1;
    _showScreen('skStartScreen');
    modal.style.display='flex'; modal.style.zIndex='100120';
    document.body.style.overflow='hidden';
    document.body.classList.add('lb-modal-open');
    _skEnsureHistoryButton(saved, modal);
    try{modal.setAttribute('aria-hidden','false');var cb=modal.querySelector('.lb-modal__close');if(cb)setTimeout(function(){cb.focus();},60);}catch(_){}
    _prefillSukuyoProfile(profile);
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
      for(var h=0;h<24;h++){
        var opt=document.createElement('option');
        opt.value=String(h);
        opt.textContent=h+'시 ('+_hourLabelFor(h)+')';
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
    if(!_ensurePremiumPaymentThenStart())return;
    var profile=_getActiveBirthProfile();
    if(!profile){alert('사주/숙요 계산을 먼저 완료해 주세요.');return;}
    if(!window.__cdActiveBirthProfile||!window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile=profile;
    var b=profile.birth||{};
    if(!b.year||!b.month||!b.day){alert('생년월일을 확인할 수 없습니다. 사주 계산 후 다시 시도해 주세요.');return;}

    _generating=true;
    _chapters=Array(CHAPTER_COUNT).fill(null);
    _chapterStructured=Array(CHAPTER_COUNT).fill(null);
    _chapterMeta=Array(CHAPTER_COUNT).fill(null);
    _showScreen('skLoadingScreen');

    var partner=_readPartnerData();
    _skStartPremiumJob(profile, partner);
    var selfLunarHint=_resolveSelfLunarHint(profile);
    var partnerLunarHint=_resolvePartnerLunarHint(partner);
    var engineHints=_readCurrentSukuyoHints();

    var progressBar=_qs('skProgressBar'),progressText=_qs('skProgressText');
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

    function _setProgress(done){
      var pct=(done/CHAPTER_COUNT)*100;
      if(progressBar)progressBar.style.width=pct+'%';
      if(progressText)progressText.textContent=done+' / '+CHAPTER_COUNT+' 챕터 완성';
      if(chapterMsg&&done<CHAPTER_COUNT)chapterMsg.textContent=LOADING_MSGS[done]||'분석 중...';
      if(chapterMsg&&done>=CHAPTER_COUNT)chapterMsg.textContent='숙요점 궁합 리포트가 완성되었습니다.';
      if(chapterNumEl)chapterNumEl.textContent=done<CHAPTER_COUNT?'Chapter '+(done+1):'완성';
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
        var isActive=ch===done+1&&done<CHAPTER_COUNT;
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

    var _skReportId = 'sukuyo_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    _skLastReportId = _skReportId;

    function _skReadPremiumAccessToken(){
      var token='';
      try{ token=String(window.__cdPremiumAccessToken||'').trim(); }catch(_){ token=''; }
      if(!token){ try{ token=String(sessionStorage.getItem('cd_premium_access_token')||'').trim(); }catch(_){ token=''; } }
      if(!token){ try{ token=String(localStorage.getItem('cd_premium_access_token')||'').trim(); }catch(_){ token=''; } }
      return token;
    }

    function _fetchChapter(idx){
      return new Promise(function(resolve){
        var tid=setTimeout(function(){resolve({ok:false,message:'응답 시간 초과 (60초).'});},60000);
        var _skPremiumToken=_skReadPremiumAccessToken();
        var _skHeaders={'Content-Type':'application/json'};
        if(_skPremiumToken) _skHeaders['x-premium-access-token']=_skPremiumToken;
        fetch('/api/sukuyo/generate-chapter',{
          method:'POST',headers:_skHeaders,
          body:JSON.stringify({
            reportId:_skReportId,
            requestId:'sukuyo-'+_skReportId+'-ch'+(idx+1),
            premiumAccessToken:_skPremiumToken||undefined,
            mode:'compatibility',
            reportMode:'compatibility',
            reportType:'compatibility',
            name:profile.name||'사용자',
            gender:profile.gender||undefined,
            year:b.year,month:b.month,day:b.day,hour:b.hour!==undefined?b.hour:12,chapter:idx+1,
            chapterIndex:idx+1,
            sessionId:idx+1,
            timezone:9,
            strictNoFallback:false,
            chapterTitle: CHAPTER_TITLES[idx] || ('Chapter ' + (idx + 1)),
            chapterSubtitle: CHAPTER_SUBTITLES[idx] || '',
            chapterSpecificSections: (CHAPTER_STRUCTURED_LABELS[idx + 1] || []).slice(0, 8),
            lunarMonth:selfLunarHint?selfLunarHint.lunarMonth:undefined,
            lunarDay:selfLunarHint?selfLunarHint.lunarDay:undefined,
            isLeap:selfLunarHint?selfLunarHint.isLeapMonth:undefined,
            currentSukuyoName:engineHints.currentSukuyoName||undefined,
            currentSukuyoIndex:engineHints.currentSukuyoIndex,
            partnerName:partner.name||undefined,
            partnerYear:partner.year||undefined,
            partnerMonth:partner.month||undefined,
            partnerDay:partner.day||undefined,
            partnerHour:partner.hour!==null?partner.hour:undefined,
            partnerMinute:partner.minute!==null?partner.minute:undefined,
            partnerTimezone:9,
            partnerGender:partner.gender||undefined,
            partnerCalType:partner.calType||undefined,
            partnerLunarMonth:partnerLunarHint?partnerLunarHint.lunarMonth:undefined,
            partnerLunarDay:partnerLunarHint?partnerLunarHint.lunarDay:undefined,
            partnerIsLeap:partnerLunarHint?partnerLunarHint.isLeapMonth:undefined,
            partnerSukuyoName:engineHints.partnerSukuyoName||undefined,
            partnerSukuyoIndex:engineHints.partnerSukuyoIndex
          })
        })
        .then(function(res){return res.ok?res.json():res.json().catch(function(){return{};}).then(function(e){return{ok:false,message:(e&&e.message)||'HTTP '+res.status,status:res.status,code:e&&e.code};});})
        .then(function(data){clearTimeout(tid);resolve(data);})
        .catch(function(err){clearTimeout(tid);resolve({ok:false,message:String(err&&err.message?err.message:err)});});
      });
    }
    _skFetchChapterForPartialRegenerate=_fetchChapter;

    var _failCount=0;
    var runPipeline=(typeof window.__cdRunPremiumChapterPipeline==='function')?window.__cdRunPremiumChapterPipeline:null;
    if(!runPipeline){
      clearInterval(_mysticTimer);_mysticTimer=null;_generating=false;
      var missingEl=_qs('skErrorMsg');
      if(missingEl)missingEl.textContent='공통 챕터 파이프라인을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      _showScreen('skErrorScreen');
      return;
    }
    var fallbackText=String(window.__cdPremiumChapterFallbackText||'일시적인 응답 지연으로 해석을 불러오지 못했습니다. 부분 재생성 버튼을 이용해주세요.');
    runPipeline({
      totalChapters:CHAPTER_COUNT,
      maxAttempts:3,
      interChapterDelayMs:3000,
      retryDelayMs:3000,
      fetchChapter:function(idx){
        if(chapterMsg)chapterMsg.textContent=LOADING_MSGS[idx]||'분석 중...';
        return _fetchChapter(idx);
      },
      isSuccess:function(data){
        return !!(data&&data.ok&&data.text);
      },
      shouldFailFast:function(data){
        return !!_getFatalChapterError(data);
      },
      onSuccess:function(idx,data){
        _syncChapterMetaFromResponse(idx,data);
        _chapters[idx]=data.text;
        _chapterStructured[idx]=(Array.isArray(data.sections)&&data.sections.length)?{sections:data.sections}:(data.chapterJson&&typeof data.chapterJson==='object'?data.chapterJson:null);
        _skSaveResult(window.__cdActiveBirthProfile||{},_skReportId);
      },
      onFallback:function(idx,fallbackPayload,data){
        _failCount+=1;
        var msg=(fallbackPayload&&fallbackPayload.message)?String(fallbackPayload.message):((data&&(data.error||data.message))?String(data.error||data.message):'알 수 없는 오류');
        console.warn('[숙요] Chapter '+(idx+1)+' 실패:',msg);
        _chapters[idx]=fallbackText;
        _chapterStructured[idx]=null;
        _skSaveResult(window.__cdActiveBirthProfile||{},_skReportId);
      },
      onProgress:function(idx){
        _setProgress(idx+1);
      }
    }).then(function(){
      clearInterval(_mysticTimer);_mysticTimer=null;_generating=false;
      var validCount=_chapters.filter(function(c){return typeof c==='string'&&c.trim().length>0&&!/^⚠️/.test(c);}).length;
      if(validCount===0){var errEl=_qs('skErrorMsg');if(errEl)errEl.textContent='모든 챕터 생성에 실패했습니다. 숙요 기본 해석 데이터와 네트워크 상태를 확인해 주세요.';_showScreen('skErrorScreen');return;}
      _showScreen('skResultScreen');
      _updateTocState();_renderChapter(1);_bindToc();
      _ensureSukuyoPartialRegenerateControl();
      var prof=window.__cdActiveBirthProfile||{};
      var _nameEl=_qs('skResultName'),_dateEl=_qs('skResultDate');
      if(_nameEl)_nameEl.textContent='💫 '+(prof.name||'사용자')+'님의 숙요점 궁합 리포트';
      if(_dateEl){var _b=prof.birth||{};_dateEl.textContent=[_b.year,_b.month,_b.day].filter(Boolean).join('.')+'생 · 🗓️ '+new Date().toLocaleDateString('ko-KR')+' 발행';}
      _skSaveResult(prof,_skReportId);
      _skRunPremiumJob(CHAPTER_COUNT);
    }).catch(function(err){
      clearInterval(_mysticTimer);_mysticTimer=null;_generating=false;
      var fatalEl=_qs('skErrorMsg');
      var msg=String(err&&err.message?err.message:err||'챕터 생성 중 오류가 발생했습니다.');
      if(fatalEl)fatalEl.textContent=msg+' 기본 숙요 화면에서 본인과 상대의 생년월일, 시간, 달력 종류를 다시 확인한 뒤 재시도해 주세요.';
      _showScreen('skErrorScreen');
    });
  };

  window.downloadSukuyoBookPdf = function(){
    if(!_chapters.some(Boolean)){alert('먼저 숙요점 궁합 리포트를 생성해 주세요.');return;}
    var profile=window.__cdActiveBirthProfile||{};
    var name=(profile.name||'사용자')+'님의 숙요점 궁합 리포트';
    var birth=profile.birth||{};
    var issued=new Date().toLocaleDateString('ko-KR');
    var bodyHtml='';
    for(var i=0;i<CHAPTER_COUNT;i++){
      if(!_chapters[i])continue;
      bodyHtml+='<div class="chapter" style="page-break-before:'+(i>0?'always':'auto')+'"><div class="chapter-header"><span class="chapter-num">Chapter '+(i+1)+'</span><h2 class="chapter-title">'+_escHtml(_getChapterMeta(i).title)+'</h2><p class="chapter-sub">'+_escHtml(_getChapterMeta(i).subtitle)+'</p></div><div class="chapter-body">'+_md2html(_chapters[i])+'</div></div>';
    }
    var fullHtml='<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>'+_escHtml(name)+'</title>' +
      '<style>@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap");' +
      'body{font-family:"Noto Serif KR",serif;color:#0a0820;background:#fff;margin:0;padding:0;word-break:keep-all;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(135deg,#020817 0%,#0c1a2e 50%,#020817 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:0.75rem;letter-spacing:0.2em;color:#7dd3fc;margin-bottom:16px;text-transform:uppercase;}' +
      '.cover-title{font-size:2.6rem;font-weight:700;margin:0 0 12px;color:#fff;}' +
      '.cover-name{font-size:1.6rem;color:#7dd3fc;margin:8px 0;}' +
      '.cover-info{font-size:0.9rem;color:#94a3b8;max-width:520px;line-height:1.7;}' +
      '.chapter{padding:52px 60px;max-width:780px;margin:0 auto;}' +
      '.chapter-header{border-bottom:2px solid#7dd3fc;margin-bottom:28px;padding-bottom:20px;}' +
      '.chapter-num{font-size:0.75rem;letter-spacing:0.2em;color:#0284c7;text-transform:uppercase;}' +
      '.chapter-title{font-size:1.5rem;font-weight:700;color:#0c1a2e;margin:8px 0 6px;}' +
      '.chapter-sub{font-size:0.9rem;color:#0369a1;margin:0;}' +
      '.chapter-body{font-size:1rem;line-height:1.95;}' +
      'h1,h2,h3,h4{color:#0c1a2e;}p{line-height:1.9;color:#0c1a2e;margin:0 0 14px;}' +
      'blockquote{border-left:3px solid#38bdf8;padding:8px 16px;background:#f0f9ff;margin:16px 0;}' +
      'strong{color:#075985;} ul,ol{padding-left:1.5em;} li{margin-bottom:6px;}' +
      '</style></head><body>' +
      '<div class="cover"><p class="cover-badge">💫 SUKUYO 宿曜占 PREMIUM</p>' +
      '<h1 class="cover-title">숙요점 궁합 리포트</h1>' +
      '<p style="font-size:1rem;color:#7dd3fc;margin-bottom:20px;">불교 밀교 비전 27수 기반 10챕터 관계 분석 리포트</p>' +
      '<div style="width:60px;height:1px;background:rgba(125,211,252,0.4);margin:0 auto 20px;"></div>' +
      '<p class="cover-name">'+_escHtml((profile.name||'사용자'))+'님의 숙요 리포트</p>' +
      '<p class="cover-info">'+([birth.year,birth.month,birth.day].filter(Boolean).join('년 ')+(birth.day?'일':'')||'생년월일 미상')+'</p>' +
      '<p class="cover-info" style="margin-top:10px;">🗓️ '+issued+' 발행</p></div>' +
      bodyHtml+'</body></html>';
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

  document.addEventListener('click',function(e){
    var el=e.target; if(!el)return;
    var node=el.closest?el.closest('[data-action]'):null; if(!node)return;
    var act=node.getAttribute('data-action');
    if(act==='closeSukuyoBookModal'){window.closeSukuyoBookModal();e.stopPropagation();}
  });

  window.gotoSukuyoPremium = function(){window.openSukuyoBookModal();};
})();
