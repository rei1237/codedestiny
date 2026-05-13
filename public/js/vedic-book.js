/**
 * 베다 점성술 프리미엄 (Vedic Astrology — Premium Life Report)
 * CODE-DESTINY v1.0  •  Jyotish 조티쉬 기반 13챕터 인생 총람
 */
(function () {
  'use strict';

  var VEDIC_TOTAL_CHAPTERS = 13;

  var CHAPTER_TITLES = [
    '🕉️ 라그나와 영혼의 목적 — Lagna & Atmakaraka',
    '🌙 나크샤트라 — 무의식의 27가지 빛, 달별자리 심층 분석',
    '⏳ 다샤 — 인생의 시기 흐름, Vimshottari Dasha 전략',
    '💰 부와 번영의 정렬 — Artha & 2·11하우스 다나 요가',
    '👑 삶의 과제와 천직 — Dharma & 10하우스 · D9 · D10',
    '💎 나밤샤 — 영혼의 성숙도, D9 숨겨진 잠재력',
    '🔮 관계의 거울 — 아슈타 쿠타(Ashta Koota) 궁합 분석',
    '💞 인연의 깊이와 카르믹 계약 — 7하우스 · 금성/화성',
    '🌿 생명력과 정화 — Health 6·8·12하우스 · 체질 관리',
    '✨ 요가 — 특별한 축복의 조합, 차트의 천부적 재능',
    '🙏 우파야 — 운명을 바꾸는 실천, 행성 에너지 정화 비책',
    '🌟 마스터플랜 — 삶의 과제를 넘어서는 성장, 총결산 & 북극성 선언',
    '🧭 카르믹 블루프린트 — 90일 현실 실행 로드맵',
  ];

  var CHAPTER_SUBTITLES = [
    '상승궁(Lagna)이 결정하는 삶의 무대·아트마카라카·영혼의 목적 완전 해독',
    '달 나크샤트라의 기본 에너지·무의식 패턴·27수 달빛 운명 지도',
    '빔쇼타리 다샤(시기 흐름) 현재 대운·세운 전략·인생의 황금기와 시련기 파악',
    '2하우스·11하우스·다나 요가로 보는 재물 구조와 번영 전략',
    '10하우스 커리어 축·D10 차트·직업 운명 분석',
    'D9(나밤샤) 영혼의 진짜 저력·중년 이후 운명적 전환점 분석',
    '달별자리 기반 아슈타 쿠타 8항목 궁합·관계 갈등 패턴',
    '7하우스·금성·화성으로 읽는 인연의 색깔·카르믹 관계 패턴',
    '6·8·12하우스 건강·장수·정화·체질 타입 분석',
    '차트에서 검출된 요가(Yoga) 완전 해석·천부적 재능 발굴',
    '우파야(Upaya) 행성별 정화·만트라·요일 의례·삶의 과제 해소법',
    '차트 전체 총결산·단 하나의 마스터 해빗·북극성 인생 선언문',
    '1~90일 구간별 목표·실천 행동·주의 포인트를 표 기반으로 실행 설계',
  ];

  var LOADING_MSGS = [
    '라그나(Lagna)와 아트마카라카의 영혼 목적을 해독하는 중...',
    '달 나크샤트라(Nakshatra) 27수 운명 지도를 펼치는 중...',
    '빔쇼타리 다샤(Vimshottari Dasha) 시기 흐름 전략을 설계하는 중...',
    '다나 요가·2·11하우스 부와 번영의 정렬을 분석하는 중...',
    '커리어 축·D10 천직 방정식을 탐색하는 중...',
    '나밤샤(Navamsa) D9 영혼의 성숙도와 잠재력을 분석하는 중...',
    '아슈타 쿠타(Ashta Koota) 8항목 궁합을 계산하는 중...',
    '7하우스·금성·화성 인연의 카르믹 패턴을 분석하는 중...',
    '6·8·12하우스 건강 & 체질 타입을 분석하는 중...',
    '요가(Yoga) 조합·천부적 재능을 검출하는 중...',
    '우파야(Upaya) 행성 에너지 정화 비책을 설계하는 중...',
    '베다 마스터플랜과 북극성 선언문을 총결산하는 중...',
    '카르믹 블루프린트 90일 실행 로드맵을 완성하는 중...',
  ];

  var MYSTIC_QUOTES = [
    '베다 점성술(Jyotish)은 빛의 과학 — 신의 눈으로 운명을 읽는 지혜입니다.',
    '라그나는 이 생에 영혼이 착용한 우주적 코스튬입니다.',
    '나크샤트라는 달이 태어날 때 머문 별자리 — 무의식의 기본 코드.',
    '다샤는 인생의 시기별 흐름을 배우는 시간입니다.',
    '아트마카라카는 이 생에서 완성해야 할 영혼의 숙제를 가리킵니다.',
    '요가(Yoga)는 행성들이 이루는 특별한 크리스털 조합입니다.',
    '우파야(Upaya)는 운명의 강물에 최적의 노를 젓는 행위입니다.',
    '나밤샤(D9)는 외면적 차트보다 더 깊은 영혼의 진짜 설계도.',
    '삶의 과제는 피할 수 없는 감옥이 아니라 성장의 교과서입니다.',
    '다나 요가(Dhana Yoga)는 부(富)가 자연스럽게 흘러드는 별들의 구조.',
    '베다 점성술은 운명을 예언하는 것이 아니라 최적의 길을 보여줍니다.',
    '행성은 강요하지 않습니다. 다만 당신이 놓친 가능성을 비추어줄 뿐.',
  ];

  var _chapters = Array(VEDIC_TOTAL_CHAPTERS).fill(null);
  var _generating = false;
  var _currentChapter = 1;
  var _mysticTimer = null;
  var PREMIUM_VEDIC_COST = 390;
  var PREMIUM_VEDIC_FEATURE_KEY = 'premium-veda';
  var PREMIUM_VEDIC_TX_KEY = 'cd_premium_tx_veda';

  function _qs(id){return document.getElementById(id);}

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

  function _autoRefundPremium(cost, featureKey, label, txStorageKey) {
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}
    var refundHeaders = {
      'Content-Type': 'application/json',
    };
    if (token) refundHeaders.Authorization = 'Bearer ' + token;

    var sourceTransactionId = '';
    try { sourceTransactionId = sessionStorage.getItem(txStorageKey) || ''; } catch (_) {}
    var requestId = 'premium-refund:' + featureKey + ':' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);

    return fetch('/api/fortune/pig-coin/refund', {
      method: 'POST',
      headers: refundHeaders,
      credentials: 'include',
      cache: 'no-store',
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

  function _formatPremiumFailureMessage(data, fallback) {
    var base = (data && (data.message || data.error)) ? String(data.message || data.error) : String(fallback || '요청에 실패했습니다.');
    var missing = (data && Array.isArray(data.missingFields)) ? data.missingFields : [];
    if (missing.length) base += '\n누락 필드: ' + missing.slice(0, 5).join(', ');
    return base;
  }

  function _applyVedicTheme(modal){
    if(!modal||!modal.style)return;
    modal.style.setProperty('--lb-void','#120904');
    modal.style.setProperty('--lb-deep','#1d1206');
    modal.style.setProperty('--lb-dark','#2a1708');
    modal.style.setProperty('--lb-surface','#3a200c');
    modal.style.setProperty('--lb-border-bright','rgba(251, 146, 60, 0.5)');
    modal.style.setProperty('--lb-gold','#fdba74');
    modal.style.setProperty('--lb-gold-dim','rgba(253, 186, 116, 0.66)');
    modal.style.setProperty('--lb-amethyst','#fb923c');
    modal.style.setProperty('--lb-violet','#ea580c');
    modal.style.setProperty('--lb-lilac','#ffedd5');
    modal.style.setProperty('--lb-glow-violet','rgba(234, 88, 12, 0.46)');
    modal.style.setProperty('--lb-glow-gold','rgba(251, 146, 60, 0.4)');
  }

  function _escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  function _md2html(text){
    if(!text)return'';
    var h=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    h=h.replace(/^&gt; (.+)$/gm,'<blockquote class="zb-md-blockquote">$1</blockquote>');
    h=h.replace(/<\/blockquote>\n<blockquote class="zb-md-blockquote">/g,'<br>');
    h=h.replace(/^#### (.+)$/gm,'<h4 class="zb-md-h4">$1</h4>');
    h=h.replace(/^### (.+)$/gm,'<h3 class="zb-md-h3">$1</h3>');
    h=h.replace(/^## (.+)$/gm,'<h2 class="zb-md-h2">$1</h2>');
    h=h.replace(/^# (.+)$/gm,'<h1 class="zb-md-h1">$1</h1>');
    h=h.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>');
    h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
    h=h.replace(/\*(.+?)\*/g,'<em>$1</em>');
    h=h.replace(/^---+$/gm,'<hr class="zb-md-hr">');
    h=h.replace(/^[*-] (.+)$/gm,'<li class="zb-md-li">$1</li>');
    h=h.replace(/(<li[\s\S]*?<\/li>(\n|$))+/g,function(m){return'<ul class="zb-md-ul">'+m+'</ul>';});
    h=h.replace(/^\d+\. (.+)$/gm,'<li class="zb-md-li zb-md-oli">$1</li>');
    h=h.replace(/\n\n+/g,'\n\n');
    var lines=h.split('\n'),result=[];
    for(var i=0;i<lines.length;i++){
      var line=lines[i].trim();
      if(!line){result.push('');continue;}
      if(/^<(h[1-4]|ul|li|hr|blockquote)/.test(line)||/<\/(h[1-4]|ul|li|hr|blockquote)>$/.test(line))result.push(line);
      else result.push('<p class="zb-md-p">'+line+'</p>');
    }
    return result.join('\n');
  }

  function _getActiveBirthProfile(){
    var p=window.__cdActiveBirthProfile;
    if(p&&p.birth&&p.birth.year)return p;
    var snap=window.__destinyFlowerSajuSnapshot;
    if(snap&&snap.birth&&snap.birth.year)return snap;
    try{
      var ns='FORTUNE_APP_USER_PROFILES';
      var list=JSON.parse(localStorage.getItem(ns+'.list')||'[]');
      var currId=localStorage.getItem(ns+'.current');
      var match=(currId&&list.find(function(p2){return p2.id===currId;}))||(list.length&&list[0])||null;
      if(match&&match.birth&&match.birth.year)return match;
    }catch(_){}
    try{
      var dateEl=document.getElementById('birthDate');
      if(dateEl&&dateEl.value){
        var parts=dateEl.value.split('-');
        if(parts.length>=3){
          var y=Number(parts[0]),m=Number(parts[1]),d=Number(parts[2]);
          if(y&&m&&d){
            var nameEl=document.getElementById('nameInput');
            var isFemale=document.querySelector('#btnF.on')!==null;
            var hourEl=document.getElementById('birthHour');
            var minEl=document.getElementById('birthMinute');
            var countrySel=document.getElementById('birthCountry');
            var loc={label:'대한민국 (서울)',lng:126.978,lat:37.5665,tz:'Asia/Seoul',tzOffset:9,baseTzOffset:9};
            if(countrySel&&countrySel.selectedIndex>=0){
              var opt=countrySel.options[countrySel.selectedIndex];
              if(opt)loc={label:(opt.textContent||opt.text||'').trim(),lng:parseFloat(opt.getAttribute('data-long')||'126.978'),lat:parseFloat(opt.getAttribute('data-lat')||'37.5665'),tz:opt.value||'Asia/Seoul',tzOffset:parseFloat(opt.getAttribute('data-tz')||'9'),baseTzOffset:parseFloat(opt.getAttribute('data-base-tz')||'9')};
            }
            return{name:(nameEl&&nameEl.value.trim())||'사용자',gender:isFemale?'F':'M',birth:{year:y,month:m,day:d,hour:hourEl?Number(hourEl.value):12,minute:minEl?Number(minEl.value):0},location:loc};
          }
        }
      }
    }catch(_){}
    return null;
  }

  var _VD_STORE_VER='vd_v1_';
  function _vdMakeKey(p){var b=(p&&p.birth)||{};return _VD_STORE_VER+(b.year||'0')+'_'+(b.month||'0')+'_'+(b.day||'0')+'_'+((p&&p.gender)||'u');}
  function _vdSaveResult(p){try{sessionStorage.setItem(_vdMakeKey(p),JSON.stringify({chapters:_chapters,name:(p&&p.name)||'사용자',birth:(p&&p.birth)||{},gender:(p&&p.gender)||'',savedAt:new Date().toISOString()}));}catch(_){}}
  function _vdLoadSaved(p){try{var raw=sessionStorage.getItem(_vdMakeKey(p));return raw?JSON.parse(raw):null;}catch(_){return null;}}

  function _showScreen(id){
    var screens=['vdNoProfileScreen','vdStartScreen','vdLoadingScreen','vdResultScreen','vdErrorScreen'];
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
    var start=document.getElementById('vdStartScreen');
    if(!start)return;
    var wrap=start.querySelector('.lb-start__chapters');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='lb-start__chapters';
      wrap.innerHTML=
        '<div class="lb-start__ch-label">📖 13챕터 구성</div>'+
        '<ul class="lb-start__ch-list" id="vdChapterPreviewList"></ul>';
      var anchor=start.querySelector('.lb-start__note');
      if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(wrap,anchor.nextSibling);
      else start.appendChild(wrap);
    }
    var list=document.getElementById('vdChapterPreviewList')||wrap.querySelector('.lb-start__ch-list');
    if(!list)return;
    var html='';
    for(var i=0;i<CHAPTER_TITLES.length;i++){
      html+='<li class="lb-start__ch-item lb-start__ch-item--detail">'+
        '<div class="lb-start__ch-head" style="display:flex;gap:8px;align-items:flex-start;">'+
          '<span class="lb-start__ch-num">Ch.'+(i+1)+'</span>'+
          '<span class="lb-start__ch-title">'+_escHtml(CHAPTER_TITLES[i])+'</span>'+
        '</div>'+
        '<p class="lb-start__ch-sub" style="margin:6px 0 0 58px;font-size:0.85rem;line-height:1.55;color:#ffedd5;">'+_escHtml(CHAPTER_SUBTITLES[i])+'</p>'+
      '</li>';
    }
    list.innerHTML=html;
  }

  var VD_ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII'];

  function _renderToc(){
    var nav=document.getElementById('vdToc');
    if(!nav||nav.querySelector('[data-vd-chapter]'))return;
    var html='';
    for(var i=1;i<=VEDIC_TOTAL_CHAPTERS;i++) html+='<button type="button" class="lb-toc-item vd-toc-item'+(i===1?' active':'')+'" data-vd-chapter="'+i+'">'+VD_ROMAN[i-1]+'</button>';
    nav.innerHTML=html;
  }

  function _bindToc(){
    var nav=document.getElementById('vdToc');
    if(!nav)return;
    _renderToc();
    nav.addEventListener('click',function(e){
      var btn=e.target.closest('[data-vd-chapter]');
      if(!btn)return;
      var ch=Number(btn.getAttribute('data-vd-chapter'));
      if(!ch||!_chapters[ch-1])return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.vd-toc-item'),function(b){
        b.classList.toggle('active',b===btn);
        b.classList.toggle('loaded',!!_chapters[Number(b.getAttribute('data-vd-chapter'))-1]);
      });
    });
  }

  function _renderChapter(ch){
    var content=_qs('vdChapterContent');
    if(!content)return;
    var idx=ch-1,data=_chapters[idx];
    if(!data){content.innerHTML='<p class="zb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';return;}
    content.innerHTML='<div class="zb-chapter-wrap"><div class="zb-chapter-header"><span class="zb-chapter-num">Chapter '+ch+'</span><h2 class="zb-chapter-title">'+_escHtml(CHAPTER_TITLES[idx])+'</h2><p class="zb-chapter-sub">'+_escHtml(CHAPTER_SUBTITLES[idx])+'</p></div><div class="zb-chapter-body">'+_md2html(data)+'</div></div>';
    content.scrollTop=0;
  }

  function _updateTocState(){
    _renderToc();
    Array.prototype.forEach.call(document.querySelectorAll('#vdToc .vd-toc-item'),function(btn){
      var ch=Number(btn.getAttribute('data-vd-chapter'));
      btn.classList.toggle('loaded',!!_chapters[ch-1]);
      btn.classList.toggle('active',ch===1);
    });
  }

  window.openVedicBookModal = function(profileArg){
    // 로그인 세션 확인 — 비로그인(게스트) 상태에서는 서비스 진입 차단
    if (typeof window.__dpHasLoginSession === 'function' && !window.__dpHasLoginSession()) {
      if (typeof window.__cdOpenLoginRequiredModal === 'function') {
        window.__cdOpenLoginRequiredModal({ reason: 'login_required', redirectTo: window.location.pathname });
      }
      return;
    }
    var modal=_qs('vedicBookModal');
    if(!modal){console.error('[베다 점성술 프리미엄] vedicBookModal 요소를 찾을 수 없습니다.');return;}
    _applyVedicTheme(modal);
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
      _showScreen('vdNoProfileScreen');
      return;
    }
    if(!window.__cdActiveBirthProfile||!window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile=profile;
    var saved=_vdLoadSaved(profile);
    if(saved&&saved.chapters&&saved.chapters.some(Boolean)){
      _chapters=saved.chapters;
      _currentChapter=1;
      _showScreen('vdResultScreen');
      _updateTocState();_renderChapter(1);_bindToc();
      var nameEl=_qs('vdResultName'),dateEl=_qs('vdResultDate');
      if(nameEl)nameEl.textContent='🪷 '+(saved.name||'사용자')+'님의 베다 인생 총람';
      if(dateEl){var b=saved.birth||{};var sd=saved.savedAt?new Date(saved.savedAt).toLocaleDateString('ko-KR'):'';dateEl.textContent=[b.year,b.month,b.day].filter(Boolean).join('.')+(sd?' · 💾 '+sd+' 저장':'');}
      modal.style.display='flex'; modal.style.zIndex='100120';document.body.style.overflow='hidden';
      document.body.classList.add('lb-modal-open');
      try{modal.setAttribute('aria-hidden','false');}catch(_){}
      return;
    }
    _chapters=Array(VEDIC_TOTAL_CHAPTERS).fill(null);
    _currentChapter=1;
    _showScreen('vdStartScreen');
    modal.style.display='flex'; modal.style.zIndex='100120';
    document.body.style.overflow='hidden';
    document.body.classList.add('lb-modal-open');
    try{modal.setAttribute('aria-hidden','false');var cb=modal.querySelector('.lb-modal__close');if(cb)setTimeout(function(){cb.focus();},60);}catch(_){}
    _prefillVedicProfile(profile);
    _renderDetailedChapterPreview();
  };

  // 별칭: openVedicPremiumModal 도 지원
  window.openVedicPremiumModal = function(profileArg){window.openVedicBookModal(profileArg);};

  function _prefillVedicProfile(profile){
    if(!profile)return;
    var b=profile.birth||{};
    var infoEl=_qs('vdProfileSummary');
    if(infoEl&&b.year){
      infoEl.textContent=(profile.name||'사용자')+' · '+(profile.gender==='F'?'여성':profile.gender==='M'?'남성':'')+' · '+b.year+'년 '+(b.month||'')+'월 '+(b.day||'')+'일 '+(b.hour!==undefined?b.hour+'시':'')+(b.minute&&b.minute>0?' '+b.minute+'분':'')+'생';
      infoEl.style.display='';
    }
  }

  window.closeVedicBookModal = function(){
    var modal=_qs('vedicBookModal');
    if(!modal)return;
    if(_mysticTimer){clearInterval(_mysticTimer);_mysticTimer=null;}
    modal.style.display='none';
    document.body.style.overflow='';
    document.body.classList.remove('lb-modal-open');
    try{modal.setAttribute('aria-hidden','true');}catch(_){}
  };

  window.generateVedicBook = function(){
    if(_generating)return;
    var profile=_getActiveBirthProfile();
    if(!profile){alert('사주/베다 계산을 먼저 완료해 주세요.');return;}
    if(!window.__cdActiveBirthProfile||!window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile=profile;
    var b=profile.birth||{};
    if(!b.year||!b.month||!b.day){alert('생년월일을 확인할 수 없습니다. 사주 계산 후 다시 시도해 주세요.');return;}
    var loc=profile.location||{lat:37.5665,lng:126.978,tzOffset:9};

    _generating=true;
    _chapters=Array(VEDIC_TOTAL_CHAPTERS).fill(null);
    _showScreen('vdLoadingScreen');
    _activateCinematicLoading('vdLoadingScreen','#fdba74','#ea580c','rgba(251,146,60,0.5)');

    var progressBar=_qs('vdProgressBar'),progressText=_qs('vdProgressText');
    var stageEl=_qs('vdLoadingStageText');
    if(!stageEl&&progressText&&progressText.parentElement){
      stageEl=document.createElement('div');
      stageEl.id='vdLoadingStageText';
      stageEl.style.cssText='margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(251,146,60,0.12);border:1px solid rgba(253,186,116,0.35);font-size:0.83rem;color:#ffedd5;line-height:1.45;';
      progressText.parentElement.appendChild(stageEl);
    }
    var chapterMsg=_qs('vdLoadingChapter'),chapterNumEl=_qs('vdLoadingChapterNum');
    var mysticEl=_qs('vdMysticQuote');

    if(_mysticTimer)clearInterval(_mysticTimer);
    var _mqIdx=0;
    if(mysticEl){mysticEl.textContent=MYSTIC_QUOTES[0];mysticEl.classList.remove('lb-fade-out');}
    _mysticTimer=setInterval(function(){
      _mqIdx=(_mqIdx+1)%MYSTIC_QUOTES.length;
      if(mysticEl){mysticEl.classList.add('lb-fade-out');setTimeout(function(){if(mysticEl){mysticEl.textContent=MYSTIC_QUOTES[_mqIdx];mysticEl.classList.remove('lb-fade-out');}},420);}
    },3600);

    var chDots=document.querySelectorAll('.vd-ch-dot');
    Array.prototype.forEach.call(chDots,function(d){d.classList.remove('zb-ch-dot--done','zb-ch-dot--active','lb-ch-dot--done','lb-ch-dot--active','lb-ch-dot--just-done');});
    if(chDots[0])chDots[0].classList.add('zb-ch-dot--active','lb-ch-dot--active');

    var chapterWrap = chapterNumEl && chapterNumEl.parentElement && chapterNumEl.parentElement.classList && chapterNumEl.parentElement.classList.contains('lb-loading__chapter')
      ? chapterNumEl.parentElement
      : null;

    function _setProgress(done){
      var pct=Math.round((done/VEDIC_TOTAL_CHAPTERS)*100);
      if(progressBar)progressBar.style.width=pct+'%';
      if(progressText)progressText.textContent=done+' / '+VEDIC_TOTAL_CHAPTERS+' 챕터 완성 ('+pct+'%)';
      if(stageEl){
        var _phase=done===0
          ? '라그나/나크샤트라 데이터 정렬 중'
          : (done<VEDIC_TOTAL_CHAPTERS?('AI가 Chapter '+(done+1)+' 베다 해석 중'):'PDF 저장 준비 완료');
        var _subtitle=done<VEDIC_TOTAL_CHAPTERS?(CHAPTER_SUBTITLES[done]||''):'전체 챕터 정리를 완료했습니다.';
        stageEl.textContent='진행 단계: '+_phase+(_subtitle?' · '+_subtitle:'');
      }
      if(chapterMsg&&done<VEDIC_TOTAL_CHAPTERS)chapterMsg.textContent=LOADING_MSGS[done]||'분석 중...';
      if(chapterMsg&&done>=VEDIC_TOTAL_CHAPTERS)chapterMsg.textContent='베다 Karmic Blueprint가 완성되었습니다 ✦';
      if(chapterNumEl)chapterNumEl.textContent=done<VEDIC_TOTAL_CHAPTERS?'Chapter '+(done+1):'✦ 완성 ✦';
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
        var ch=Number(d.getAttribute('data-vdch'));
        var isDone=ch<=done;
        var isActive=ch===done+1&&done<VEDIC_TOTAL_CHAPTERS;
        var isPending=!isDone&&!isActive;
        var wasDone=d.classList.contains('zb-ch-dot--done')||d.classList.contains('lb-ch-dot--done');
        d.classList.toggle('zb-ch-dot--done',isDone);
        d.classList.toggle('zb-ch-dot--active',isActive);
        d.classList.toggle('lb-ch-dot--done',isDone);
        d.classList.toggle('lb-ch-dot--active',isActive);
        d.classList.toggle('lb-ch-dot--pending',isPending);
        if(!wasDone&&isDone){
          d.classList.add('lb-ch-dot--just-done');
          setTimeout(function(){ d.classList.remove('lb-ch-dot--just-done'); }, 760);
          d.style.animation='none';requestAnimationFrame(function(){requestAnimationFrame(function(){d.style.animation='';});});
        }
      });
    }

    _setProgress(0);

    var _premiumReportSessionId = '';

    function _buildVedicChapterPayload(idx) {
      return {
        year:b.year,month:b.month,day:b.day,
        hour:b.hour!==undefined?b.hour:12,
        minute:b.minute!==undefined?b.minute:0,
        timezone:loc.tzOffset!==undefined?loc.tzOffset:9,
        lat:loc.lat!==undefined?loc.lat:37.5665,
        lon:loc.lng!==undefined?loc.lng:126.978,
        chapter:idx+1,
        reportType:'personal',
        birthPlace:loc.label||'대한민국 (서울)',
        timezoneName:loc.tz||'Asia/Seoul',
        calendarType:profile.calendarType||b.calendarType||'solar',
        isLeapMonth:!!(profile.isLeapMonth||b.isLeapMonth),
        ayanamsa:profile.ayanamsa||'lahiri'
      };
    }

    function _ensurePremiumReportSession() {
      if (_premiumReportSessionId) {
        return Promise.resolve({ ok: true, reportSessionId: _premiumReportSessionId });
      }
      if (typeof window.__cdPremiumAuthJson !== 'function') {
        return Promise.resolve({ ok: false, code: 'AUTH_HELPER_MISSING', message: '인증 모듈을 초기화하지 못했습니다.' });
      }
      return window.__cdPremiumAuthJson('/api/premium-report/prepare', {
        featureType: 'vedic_premium',
        reportType: 'vedicPremium',
        requestBody: _buildVedicChapterPayload(0)
      }).then(function(prepared) {
        if (prepared && prepared.ok && prepared.reportSessionId) {
          _premiumReportSessionId = String(prepared.reportSessionId);
          return prepared;
        }
        return prepared || { ok: false, message: '프리미엄 세션 준비에 실패했습니다.' };
      });
    }

    function _fetchChapter(idx){
      function _attempt(tryNo){
        return new Promise(function(resolve){
          var tid=setTimeout(function(){resolve({ok:false,message:'응답 시간 초과 (70초).'});},70000);
          _ensurePremiumReportSession().then(function(prepared) {
            if (!prepared || !prepared.ok || !_premiumReportSessionId) {
              clearTimeout(tid);
              resolve(prepared || { ok: false, message: '프리미엄 세션 준비에 실패했습니다.' });
              return;
            }
            if (typeof window.__cdPremiumAuthJson !== 'function') {
              clearTimeout(tid);
              resolve({ ok: false, code: 'AUTH_HELPER_MISSING', message: '인증 모듈을 초기화하지 못했습니다.' });
              return;
            }
            window.__cdPremiumAuthJson('/api/premium-report/chapter', {
              reportSessionId: _premiumReportSessionId,
              chapterId: idx + 1
            }).then(function(data) {
              clearTimeout(tid);
              resolve(data);
            }).catch(function(err) {
              clearTimeout(tid);
              resolve({ok:false,message:String(err&&err.message?err.message:err)});
            });
          }).catch(function(err){clearTimeout(tid);resolve({ok:false,message:String(err&&err.message?err.message:err)});});
        }).then(function(data){
          var code = String((data && data.code) || '').toUpperCase();
          var status = Number((data && data.status) || 0);
          if (status === 401 || code === 'UNAUTHORIZED' || code === 'AUTH_REQUIRED' || code === 'LOGIN_REQUIRED') {
            data = data || { ok: false };
            data.fatal = true;
            data.errorCode = 'AUTH_REQUIRED';
            return data;
          }
          if (
            status === 422
            || code === 'MISSING_CALCULATION_DATA'
            || code === 'PREMIUM_REPORT_DATA_INCOMPLETE'
            || code === 'PREMIUM_REPORT_CHAPTER_DATA_MISSING'
          ) {
            data = data || { ok: false };
            data.fatal = true;
            data.errorCode = 'DATA_INCOMPLETE';
            data.message = _formatPremiumFailureMessage(data, '계산 데이터가 부족해 리포트를 생성할 수 없습니다.');
            return data;
          }
          var maxTry = 3;
          if(data&&data.ok&&data.text) return data;
          if(tryNo>=maxTry) return data;
          return _attempt(tryNo+1);
        });
      }
      return _attempt(1);
    }

    var _failCount=0;
    (function generateNext(idx){
      if(idx>=VEDIC_TOTAL_CHAPTERS){
        clearInterval(_mysticTimer);_mysticTimer=null;_generating=false;
        var validCount=_chapters.filter(function(c){return typeof c==='string'&&c.trim().length>=900&&!/^⚠️/.test(c.trim());}).length;
        var minValid=Math.max(10, VEDIC_TOTAL_CHAPTERS-3);
        if(validCount<minValid){
          var errEl=_qs('vdErrorMsg');
          if(errEl)errEl.textContent='챕터 생성이 불완전합니다 ('+validCount+'/'+VEDIC_TOTAL_CHAPTERS+'). 자동 환급을 시도합니다. 잠시 후 다시 시도해 주세요.';
          _showScreen('vdErrorScreen');
          _autoRefundPremium(PREMIUM_VEDIC_COST, PREMIUM_VEDIC_FEATURE_KEY, '베다 프리미엄 PDF', PREMIUM_VEDIC_TX_KEY)
            .then(function(refunded){ if(refunded) window.alert('베다 프리미엄 결제가 자동 환급되었습니다.'); });
          return;
        }
        try { sessionStorage.removeItem(PREMIUM_VEDIC_TX_KEY); } catch (_) {}
        _showScreen('vdResultScreen');
        _updateTocState();_renderChapter(1);_bindToc();
        var prof=window.__cdActiveBirthProfile||{};
        var _nameEl=_qs('vdResultName'),_dateEl=_qs('vdResultDate');
        if(_nameEl)_nameEl.textContent='🪷 '+(prof.name||'사용자')+'님의 베다 Karmic Blueprint';
        if(_dateEl){var _b=prof.birth||{};_dateEl.textContent=[_b.year,_b.month,_b.day].filter(Boolean).join('.')+'생 · 🗓️ '+new Date().toLocaleDateString('ko-KR')+' 발행';}
        _vdSaveResult(prof);
        return;
      }
      if(chapterMsg)chapterMsg.textContent=LOADING_MSGS[idx]||'분석 중...';
      _fetchChapter(idx).then(function(data){
        if (data && data.fatal && data.errorCode === 'AUTH_REQUIRED') {
          console.error('[베다 프리미엄 PDF][AUTH_REQUIRED]', {
            chapter: idx + 1,
            code: String((data && data.code) || ''),
            status: Number((data && data.status) || 0),
            message: String((data && data.message) || ''),
            requestId: String((data && data.requestId) || ''),
            reportSessionId: String((data && data.reportSessionId) || ''),
          });
          _generating = false;
          if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
          var authErrEl = _qs('vdErrorMsg');
          if (authErrEl) authErrEl.textContent = '로그인 세션이 만료되어 리포트 생성을 중단했습니다. 다시 로그인 후 재시도해 주세요.';
          _showScreen('vdErrorScreen');
          if (typeof window.__cdOpenLoginRequiredModal === 'function') {
            window.__cdOpenLoginRequiredModal({ reason: '프리미엄 리포트 생성 중 세션이 만료되었습니다.' });
          }
          return;
        }
        if (data && data.fatal && data.errorCode === 'DATA_INCOMPLETE') {
          console.error('[베다 프리미엄 PDF][DATA_INCOMPLETE]', {
            chapter: idx + 1,
            code: String((data && data.code) || ''),
            status: Number((data && data.status) || 0),
            message: String((data && data.message) || ''),
            missingData: Array.isArray(data && data.missingData) ? data.missingData : [],
            missingFields: Array.isArray(data && data.missingFields) ? data.missingFields : [],
            requestId: String((data && data.requestId) || ''),
            reportSessionId: String((data && data.reportSessionId) || ''),
          });
          _generating = false;
          if (_mysticTimer) { clearInterval(_mysticTimer); _mysticTimer = null; }
          var dataErrEl = _qs('vdErrorMsg');
          if (dataErrEl) dataErrEl.textContent = _formatPremiumFailureMessage(data, 'PDF 생성에 필요한 계산 데이터가 부족합니다. 데이터를 다시 확인해 주세요.');
          _showScreen('vdErrorScreen');
          _autoRefundPremium(PREMIUM_VEDIC_COST, PREMIUM_VEDIC_FEATURE_KEY, '베다 프리미엄 PDF', PREMIUM_VEDIC_TX_KEY)
            .then(function(refunded){ if(refunded) window.alert('베다 프리미엄 결제가 자동 환급되었습니다.'); });
          return;
        }
        if(data&&data.ok&&data.text){_chapters[idx]=data.text;}
        else{
          _failCount++;
          var msg=(data&&(data.error||data.message))?data.error||data.message:'알 수 없는 오류';
          console.error('[베다 프리미엄 PDF][CHAPTER_FAILED]', {
            chapter: idx + 1,
            status: Number((data && data.status) || 0),
            code: String((data && data.code) || ''),
            chapterStatus: String((data && data.chapterStatus) || ''),
            retryable: Boolean(data && data.retryable),
            attemptsUsed: Number((data && data.attemptsUsed) || 0),
            maxChapterAttempts: Number((data && data.maxChapterAttempts) || 0),
            lengthValidation: data && data.lengthValidation ? data.lengthValidation : null,
            missingData: Array.isArray(data && data.missingData) ? data.missingData : [],
            missingFields: Array.isArray(data && data.missingFields) ? data.missingFields : [],
            requestId: String((data && data.requestId) || ''),
            reportSessionId: String((data && data.reportSessionId) || ''),
            raw: data || null,
          });
          console.warn('[베다] Chapter '+(idx+1)+' 실패:',msg);
          _chapters[idx]='⚠️ **이 챕터의 분석을 불러오는 데 실패했습니다.**\n\n오류: '+msg+'\n\n잠시 후 다시 시도해 주세요.';
        }
        _setProgress(idx+1);
        generateNext(idx+1);
      });
    })(0);
  };

  window.downloadVedicBookPdf = function(){
    if(!_chapters.some(Boolean)){alert('먼저 베다 인생 총람을 생성해 주세요.');return;}
    var profile=window.__cdActiveBirthProfile||{};
    var name=(profile.name||'사용자')+'님의 베다 인생 총람';
    var birth=profile.birth||{};
    var issued=new Date().toLocaleDateString('ko-KR');
    var bodyHtml='';
    for(var i=0;i<VEDIC_TOTAL_CHAPTERS;i++){
      if(!_chapters[i])continue;
      bodyHtml+='<div class="chapter" style="page-break-before:'+(i>0?'always':'auto')+'"><div class="chapter-header"><span class="chapter-num">Chapter '+(i+1)+'</span><h2 class="chapter-title">'+_escHtml(CHAPTER_TITLES[i])+'</h2><p class="chapter-sub">'+_escHtml(CHAPTER_SUBTITLES[i])+'</p></div><div class="chapter-body">'+_md2html(_chapters[i])+'</div></div>';
    }
    var fullHtml='<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>'+_escHtml(name)+'</title>' +
      '<style>@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap");' +
      'body{font-family:"Noto Serif KR",serif;color:#0a0820;background:#fff;margin:0;padding:0;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(135deg,#0f0803 0%,#1e1206 50%,#0f0803 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:0.75rem;letter-spacing:0.2em;color:#fdba74;margin-bottom:16px;text-transform:uppercase;}' +
      '.cover-title{font-size:2.6rem;font-weight:700;margin:0 0 12px;color:#fff;}' +
      '.cover-name{font-size:1.6rem;color:#fdba74;margin:8px 0;}' +
      '.cover-info{font-size:0.9rem;color:#94a3b8;}' +
      '.chapter{padding:52px 60px;}' +
      '.chapter-header{border-bottom:2px solid #fdba74;margin-bottom:28px;padding-bottom:20px;}' +
      '.chapter-num{font-size:0.75rem;letter-spacing:0.2em;color:#c2410c;text-transform:uppercase;}' +
      '.chapter-title{font-size:1.5rem;font-weight:700;color:#1c0a00;margin:8px 0 6px;}' +
      '.chapter-sub{font-size:0.9rem;color:#c2410c;margin:0;}' +
      'h1,h2,h3,h4{color:#1c0a00;}p{line-height:1.9;color:#1c0a00;}' +
      'blockquote{border-left:3px solid #fb923c;padding:8px 16px;background:#fff7ed;margin:16px 0;}' +
      'strong{color:#9a3412;} ul,ol{padding-left:1.5em;} li{margin-bottom:6px;}' +
      '</style></head><body>' +
      '<div class="cover"><p class="cover-badge">🪷 VEDIC JYOTISH PREMIUM</p>' +
      '<h1 class="cover-title">베다 Karmic Blueprint</h1>' +
      '<p style="font-size:1rem;color:#fdba74;margin-bottom:20px;">인도 조티쉬(Jyotish) 기반 13챕터 인생 흐름 리포트</p>' +
      '<div style="width:60px;height:1px;background:rgba(253,186,116,0.4);margin:0 auto 20px;"></div>' +
      '<p class="cover-name">'+_escHtml((profile.name||'사용자'))+'님의 베다 차트</p>' +
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
    var el=e.target;if(!el)return;
    var node=el.closest?el.closest('[data-action]'):null;if(!node)return;
    var act=node.getAttribute('data-action');
    if(act==='closeVedicBookModal'){window.closeVedicBookModal();e.stopPropagation();}
  });

  window.gotoVedicPremium = function(profileArg){window.openVedicBookModal(profileArg);};
})();
