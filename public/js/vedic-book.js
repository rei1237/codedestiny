/**
 * 베다 점성술 프리미엄 (Vedic Astrology — Premium Life Report)
 * CODE-DESTINY v1.0  •  Jyotish 조티쉬 기반 12챕터 인생 총람
 */
(function () {
  'use strict';

  var CHAPTER_TITLES = [
    '🕉️ 라그나와 영혼의 목적 — Lagna & Atmakaraka',
    '🌙 나크샤트라 — 무의식의 27가지 빛, 달별자리 심층 분석',
    '⏳ 다샤 — 인생의 시기 흐름, Vimshottari Dasha 전략',
    '💰 부와 번영의 정렬 — Artha & 2·11하우스 다나 요가',
    '👑 삶의 과제와 천직 — Dharma & 10하우스 · D9 · D10',
    '💎 나밤샤 — 영혼의 성숙도, D9 숨겨진 잠재력',
    '🔮 관계 패턴의 이해 — 7하우스와 정서적 안정 구조',
    '💞 인연의 깊이와 관계 운영 전략 — 금성/화성/달',
    '🌿 생명력과 정화 — Health 6·8·12하우스 · 체질 관리',
    '✨ 요가 — 특별한 축복의 조합, 차트의 천부적 재능',
    '🙏 우파야 — 운명을 바꾸는 실천, 행성 에너지 정화 비책',
    '🌟 마스터플랜 — 삶의 과제를 넘어서는 성장, 총결산 & 북극성 선언',
  ];

  var CHAPTER_SUBTITLES = [
    '상승궁(Lagna)이 결정하는 삶의 무대·아트마카라카·영혼의 목적 완전 해독',
    '달 나크샤트라의 기본 에너지·무의식 패턴·27수 달빛 운명 지도',
    '빔쇼타리 다샤(시기 흐름) 현재 대운·세운 전략·인생의 황금기와 시련기 파악',
    '2하우스·11하우스·다나 요가로 보는 재물 구조와 번영 전략',
    '10하우스 커리어 축·D10 차트·직업 운명 분석',
    'D9(나밤샤) 영혼의 진짜 저력·중년 이후 운명적 전환점 분석',
    '7하우스·금성·달 중심 관계 패턴·감정 안정 전략',
    '관계 갈등 패턴·친밀감 유지·장기 관계 운영 전략',
    '6·8·12하우스 건강·장수·정화·체질 타입 분석',
    '차트에서 검출된 요가(Yoga) 완전 해석·천부적 재능 발굴',
    '우파야(Upaya) 행성별 정화·만트라·요일 의례·삶의 과제 해소법',
    '차트 전체 총결산·단 하나의 마스터 해빗·북극성 인생 선언문',
  ];

  var LOADING_MSGS = [
    '라그나(Lagna)와 아트마카라카의 영혼 목적을 해독하는 중...',
    '달 나크샤트라(Nakshatra) 27수 운명 지도를 펼치는 중...',
    '빔쇼타리 다샤(Vimshottari Dasha) 시기 흐름 전략을 설계하는 중...',
    '다나 요가·2·11하우스 부와 번영의 정렬을 분석하는 중...',
    '커리어 축·D10 천직 방정식을 탐색하는 중...',
    '나밤샤(Navamsa) D9 영혼의 성숙도와 잠재력을 분석하는 중...',
    '7하우스·금성·달의 관계 패턴을 분석하는 중...',
    '관계 운영 전략과 감정 안정 조건을 분석하는 중...',
    '6·8·12하우스 건강 & 체질 타입을 분석하는 중...',
    '요가(Yoga) 조합·천부적 재능을 검출하는 중...',
    '우파야(Upaya) 행성 에너지 정화 비책을 설계하는 중...',
    '베다 마스터플랜과 북극성 선언문을 총결산하는 중...',
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

  var CHAPTER_STRUCTURED_LABELS = {
    1: ['라그나 상승궁 분석', '아트마카라카 해석', '영혼의 목적 파악', '차트 룰러 위치', '삶의 무대 설계', '핵심 성향 도출', '이번 생의 최우선 과제'],
    2: ['달 나크샤트라 분석', '무의식의 27가지 빛', '정서 반응 패턴', '달빛 기억 코드', '유년기 그림자', '감정 치유 방향'],
    3: ['현재 마하다샤 분석', '안타르다샤 흐름', '인생 황금기 파악', '시련기 대응 전략', '다음 다샤 예측', '시기별 최적 행동'],
    4: ['2하우스 재물 구조', '11하우스 소득 흐름', '다나 요가 해석', '부 축적 전략', '번영 방향 설계'],
    5: ['10하우스 커리어 축', 'D10 직업 운명', '천직 방정식 풀기', '커리어 발전 로드맵', '조직 vs 독립 판단'],
    6: ['D9 나밤샤 핵심', '영혼의 성숙도', '중년 전환점 분석', '숨겨진 잠재력 발굴', '후반 인생 설계'],
    7: ['7하우스 관계 패턴', '금성 욕망 코드', '달 감정 안정 조건', '파트너십 구조', '관계 갈등 원인'],
    8: ['관계 갈등 패턴', '친밀감 유지법', '장기 관계 전략', '정서적 경계 설계', '관계 회복 기술'],
    9: ['6하우스 건강 취약점', '8하우스 변혁 에너지', '12하우스 정화 영역', '체질 타입 분석', '건강 루틴 설계'],
    10: ['주요 요가 목록', '라자 요가 해석', '다나 요가 해석', '천부적 재능 발굴', '요가 활성화 전략'],
    11: ['행성별 우파야', '만트라 처방', '요일 의례 설계', '삶의 과제 해소법', '에너지 정화 루틴'],
    12: ['차트 전체 총결산', '단 하나의 마스터 해빗', '북극성 인생 선언', '개운 루틴', '최종 행동 지침'],
  };

  var _chapters = Array(12).fill(null);
  var _chapterStructured = Array(12).fill(null);
  var _chapterMeta = Array(12).fill(null);
  var _chapterErrors = Array(12).fill(null);
  var _generating = false;
  var _currentChapter = 1;
  var _mysticTimer = null;
  var _premiumPaidUntil = 0;

  function _readPremiumTokenForReport(){
    var token='';
    try{ token=String(window.__cdPremiumAccessToken||'').trim(); }catch(_){ token=''; }
    if(!token){ try{ token=String(sessionStorage.getItem('cd_premium_access_token')||'').trim(); }catch(_){ token=''; } }
    if(!token){ try{ token=String(localStorage.getItem('cd_premium_access_token')||'').trim(); }catch(_){ token=''; } }
    return token;
  }

  function _premiumTokenMatches(reportType){
    var token=_readPremiumTokenForReport();
    if(!token||typeof atob!=='function')return false;
    try{
      var payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
      var exp=Number(payload&&payload.exp);
      return String(payload&&payload.reportType||'')===reportType
        && (!Number.isFinite(exp)||exp*1000>Date.now()+5000);
    }catch(_){
      return false;
    }
  }

  function _ensurePremiumPaymentThenStart(){
    if(_premiumTokenMatches('vedicPremium')||Date.now()<_premiumPaidUntil)return true;
    if(typeof window._cdCoinGatePerUse!=='function'){
      alert('결제 확인 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
      return false;
    }
    window._cdCoinGatePerUse(390,'베다 점성술 프리미엄 PDF 리포트 생성',function(){
      _premiumPaidUntil=Date.now()+25*60*1000;
      window.generateVedicBook();
    },null,{
      featureKey:'premium_pdf_vedic',
      requestId:'premium_pdf_vedic-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)
    });
    return false;
  }

  function _qs(id){return document.getElementById(id);}

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


  function _getChapterMeta(idx){
    var base=_chapterMeta[idx]||{};
    return { title:String(base.title||CHAPTER_TITLES[idx]||('Chapter '+(idx+1))), subtitle:String(base.subtitle||CHAPTER_SUBTITLES[idx]||'') };
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
      '- 베다 생성 응답 지연으로 기본 골격을 먼저 구성했습니다.',
      '- 재생성 시 동일 챕터 본문이 자동 보강됩니다.',
      '',
      '### 실천 포인트',
      '- 핵심 주제 1개 정리',
      '- 실행 루틴 1개 지정',
      '',
      reason?('### 참고\n- 원인: '+String(reason)):'',
      ''
    ].filter(Boolean).join('\n');
  }

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

  var VD_ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

  function _renderToc(){
    var nav=document.getElementById('vdToc');
    if(!nav||nav.querySelector('[data-vd-chapter]'))return;
    var html='';
    for(var i=1;i<=12;i++) html+='<button type="button" class="lb-toc-item vd-toc-item'+(i===1?' active':'')+'" data-vd-chapter="'+i+'">'+VD_ROMAN[i-1]+'</button>';
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
    var idx=ch-1,data=_chapters[idx],structured=_chapterStructured[idx];
    if(!data&&!structured){content.innerHTML='<p class="zb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';return;}
    var meta=_getChapterMeta(idx);
    var bodyHtml=_renderStructuredChapterBody(ch,structured);
    if(!bodyHtml&&data)bodyHtml=_md2html(data);
    content.innerHTML='<div class="zb-chapter-wrap"><div class="zb-chapter-header"><span class="zb-chapter-num">Chapter '+ch+'</span><h2 class="zb-chapter-title">'+_escHtml(meta.title)+'</h2><p class="zb-chapter-sub">'+_escHtml(meta.subtitle)+'</p></div><div class="zb-chapter-body">'+bodyHtml+'</div></div>';
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

  window.openVedicBookModal = function(){
    var modal=_qs('vedicBookModal');
    if(!modal){console.error('[베다 점성술 프리미엄] vedicBookModal 요소를 찾을 수 없습니다.');return;}
    _applyVedicTheme(modal);
    var _pvwEl=document.getElementById('tilePvwOverlay');if(_pvwEl){_pvwEl.classList.remove('pvw-open');_pvwEl.style.opacity='0';_pvwEl.style.pointerEvents='none';_pvwEl.style.visibility='hidden';setTimeout(function(){_pvwEl.style.opacity='';_pvwEl.style.pointerEvents='';_pvwEl.style.visibility='';},400);}
    var profile=_getActiveBirthProfile();
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
    _chapters=Array(12).fill(null);
    _chapterStructured=Array(12).fill(null);
    _chapterMeta=Array(12).fill(null);
    _chapterErrors=Array(12).fill(null);
    _currentChapter=1;
    _showScreen('vdStartScreen');
    modal.style.display='flex'; modal.style.zIndex='100120';
    document.body.style.overflow='hidden';
    document.body.classList.add('lb-modal-open');
    try{modal.setAttribute('aria-hidden','false');var cb=modal.querySelector('.lb-modal__close');if(cb)setTimeout(function(){cb.focus();},60);}catch(_){}
    _prefillVedicProfile(profile);
  };

  // 별칭: openVedicPremiumModal 도 지원
  window.openVedicPremiumModal = function(){window.openVedicBookModal();};

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
    if(!_ensurePremiumPaymentThenStart())return;
    var profile=_getActiveBirthProfile();
    if(!profile){alert('사주/베다 계산을 먼저 완료해 주세요.');return;}
    if(!window.__cdActiveBirthProfile||!window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile=profile;
    var b=profile.birth||{};
    if(!b.year||!b.month||!b.day){alert('생년월일을 확인할 수 없습니다. 사주 계산 후 다시 시도해 주세요.');return;}
    var loc=profile.location||{lat:37.5665,lng:126.978,tzOffset:9};

    _generating=true;
    _chapters=Array(12).fill(null);
    _chapterStructured=Array(12).fill(null);
    _chapterMeta=Array(12).fill(null);
    _chapterErrors=Array(12).fill(null);
    _showScreen('vdLoadingScreen');

    var progressBar=_qs('vdProgressBar'),progressText=_qs('vdProgressText');
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
      var pct=(done/12)*100;
      if(progressBar)progressBar.style.width=pct+'%';
      if(progressText)progressText.textContent=done+' / 12 챕터 완성';
      if(chapterMsg&&done<12)chapterMsg.textContent=LOADING_MSGS[done]||'분석 중...';
      if(chapterMsg&&done>=12)chapterMsg.textContent='베다 인생 총람이 완성되었습니다 ✦';
      if(chapterNumEl)chapterNumEl.textContent=done<12?'Chapter '+(done+1):'✦ 완성 ✦';
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
        var isActive=ch===done+1&&done<12;
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

    var _vdReportId = 'vedic_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

    function _vdReadPremiumAccessToken(){
      var token='';
      try{ token=String(window.__cdPremiumAccessToken||'').trim(); }catch(_){ token=''; }
      if(!token){ try{ token=String(sessionStorage.getItem('cd_premium_access_token')||'').trim(); }catch(_){ token=''; } }
      if(!token){ try{ token=String(localStorage.getItem('cd_premium_access_token')||'').trim(); }catch(_){ token=''; } }
      return token;
    }

    function _fetchChapter(idx){
      return new Promise(function(resolve){
        var tid=setTimeout(function(){resolve({ok:false,message:'응답 시간 초과 (60초).'});},60000);
        var _vdPremiumToken=_vdReadPremiumAccessToken();
        var _vdMode='personal';
        var _vdHeaders={'Content-Type':'application/json'};
        if(_vdPremiumToken) _vdHeaders['x-premium-access-token']=_vdPremiumToken;
        fetch('/api/vedic/generate-chapter',{
          method:'POST',headers:_vdHeaders,
          body:JSON.stringify({
            reportId:_vdReportId,
            requestId:'vedic-'+_vdReportId+'-ch'+(idx+1),
            premiumAccessToken:_vdPremiumToken||undefined,
            mode:_vdMode,
            reportMode:_vdMode,
            reportType:_vdMode,
            year:b.year,month:b.month,day:b.day,
            hour:b.hour!==undefined?b.hour:12,
            minute:b.minute!==undefined?b.minute:0,
            timezone:loc.tzOffset!==undefined?loc.tzOffset:9,
            lat:loc.lat!==undefined?loc.lat:37.5665,
            lon:loc.lng!==undefined?loc.lng:126.978,
            chapter:idx+1,
            chapterIndex:idx+1,
            sessionId:idx+1,
            strictNoFallback:false,
            chapterTitle: CHAPTER_TITLES[idx] || ('Chapter ' + (idx + 1)),
            chapterSubtitle: CHAPTER_SUBTITLES[idx] || '',
            chapterSpecificSections: (CHAPTER_STRUCTURED_LABELS[idx + 1] || []).slice(0, 7)
          })
        })
        .then(function(res){return res.ok?res.json():res.json().catch(function(){return{};}).then(function(e){return{ok:false,message:(e&&e.message)||'HTTP '+res.status};});})
        .then(function(data){clearTimeout(tid);resolve(data);})
        .catch(function(err){clearTimeout(tid);resolve({ok:false,message:String(err&&err.message?err.message:err)});});
      });
    }

    var _failCount=0;
    var _chapterRetries=Array(12).fill(0);
    (function generateNext(idx){
      if(idx>=12){
        clearInterval(_mysticTimer);_mysticTimer=null;_generating=false;
        var validCount=_chapters.filter(function(c){ return typeof c==='string' && c.trim().length>0; }).length;
        if(validCount===0){
          var firstErr=_chapterErrors.find(function(e){return !!e;})||'베다 리포트 생성 중 오류가 발생했습니다.';
          var errEl=_qs('vdErrorMsg');
          if(errEl)errEl.textContent='베다 리포트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요. ('+String(firstErr)+')';
          _showScreen('vdErrorScreen');
          return;
        }
        _showScreen('vdResultScreen');
        _updateTocState();_renderChapter(1);_bindToc();
        var prof=window.__cdActiveBirthProfile||{};
        var _nameEl=_qs('vdResultName'),_dateEl=_qs('vdResultDate');
        if(_nameEl)_nameEl.textContent='🪷 '+(prof.name||'사용자')+'님의 베다 인생 총람';
        if(_dateEl){var _b=prof.birth||{};_dateEl.textContent=[_b.year,_b.month,_b.day].filter(Boolean).join('.')+'생 · 🗓️ '+new Date().toLocaleDateString('ko-KR')+' 발행';}
        _vdSaveResult(prof);
        return;
      }
      if(chapterMsg)chapterMsg.textContent=LOADING_MSGS[idx]||'분석 중...';
      _fetchChapter(idx).then(function(data){
        if(data&&data.ok&&data.text){
          _syncChapterMetaFromResponse(idx,data);
          _chapters[idx]=data.text;
          _chapterStructured[idx]=(Array.isArray(data.sections)&&data.sections.length)?{sections:data.sections}:(data.chapterJson&&typeof data.chapterJson==='object'?data.chapterJson:null);
          _chapterErrors[idx]=null;
          _chapterRetries[idx]=0;
        }
        else{
          _failCount++;
          var msg=(data&&(data.error||data.message))?data.error||data.message:'알 수 없는 오류';
          console.warn('[베다] Chapter '+(idx+1)+' 실패:',msg);
          _chapterRetries[idx]=Number(_chapterRetries[idx]||0)+1;
          if(_chapterRetries[idx] < 5){
            if(chapterMsg)chapterMsg.textContent='Chapter '+(idx+1)+' 재시도 중... ('+_chapterRetries[idx]+'/4)';
            setTimeout(function(){ generateNext(idx); }, 900);
            return;
          }
          _chapterErrors[idx]=msg;
          _chapters[idx]=_buildChapterSkeleton(idx,msg);
          _chapterStructured[idx]=null;
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
    for(var i=0;i<12;i++){
      if(!_chapters[i])continue;
      bodyHtml+='<div class="chapter" style="page-break-before:'+(i>0?'always':'auto')+'"><div class="chapter-header"><span class="chapter-num">Chapter '+(i+1)+'</span><h2 class="chapter-title">'+_escHtml(_getChapterMeta(i).title)+'</h2><p class="chapter-sub">'+_escHtml(_getChapterMeta(i).subtitle)+'</p></div><div class="chapter-body">'+_md2html(_chapters[i])+'</div></div>';
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
      '<h1 class="cover-title">베다 인생 총람</h1>' +
      '<p style="font-size:1rem;color:#fdba74;margin-bottom:20px;">인도 조티쉬(Jyotish) 기반 12챕터 인생 흐름 리포트</p>' +
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

  window.gotoVedicPremium = function(){window.openVedicBookModal();};
})();
