/**
 * 베다 점성술 프리미엄 (Vedic Astrology — Premium Life Report)
 * CODE-DESTINY v1.0  •  Jyotish 조티쉬 기반 12챕터 인생 총람
 */
(function () {
  'use strict';

  var CHAPTER_TITLES = [
    '🕉️ Ch.1 베다 차트 핵심 총론 — 이번 생의 기본 설계',
    '♈ Ch.2 라그나와 1하우스 — 타고난 기질과 삶의 태도',
    '🌙 Ch.3 달과 나크샤트라 — 감정, 욕구, 내면 안정',
    '☀️ Ch.4 아트마카라카와 영혼의 과제 — 이번 생의 깊은 숙제',
    '🪐 Ch.5 행성별 카르마 해석 — 9그라하의 작동 방식',
    '🗺️ Ch.6 12하우스 인생 영역 분석 — 삶의 무대별 사건 구조',
    '✨ Ch.7 커리어와 사회적 성취 — 10하우스와 라후의 방향',
    '🧭 Ch.8 재물과 수익 구조 — 2·11하우스와 다나 요가',
    '⚠️ Ch.9 사랑과 관계 — 금성, 5하우스, 7하우스',
    '💼 Ch.10 건강과 에너지 — 6·8·12하우스의 신호',
    '💞 Ch.11 다샤 흐름 — 현재 시기의 운의 과제',
    '🧘 Ch.12 최종 인생 전략 — 베다 차트 종합 로드맵',
  ];

  var CHAPTER_SUBTITLES = [
    '라그나·달·태양 핵심 총론',
    '라그나 중심 자아 구조',
    '달과 나크샤트라 정서 구조',
    '아트마카라카 기반 영혼 과제',
    '태양·달·화성·수성·목성·금성·토성·라후·케투',
    '하우스별 삶의 영역과 반복 패턴',
    '직업, 사회적 역할, 성취 방식',
    '수익 구조와 재물 운용',
    '연애, 결혼, 관계 패턴',
    '건강, 소진, 회복 루틴',
    '마하다샤·안타르다샤 기반 현재 운의 리듬',
    '라그나·나크샤트라·다샤·하우스 통합 실행 전략',
  ];

  var LOADING_MSGS = [
    '라그나·달·태양을 묶어 이번 생의 핵심 설계를 정리하는 중...',
    '라그나와 1하우스 중심 자아 패턴을 해석하는 중...',
    '달과 나크샤트라의 감정 구조를 분석하는 중...',
    '아트마카라카 기반 영혼 과제를 정리하는 중...',
    '9그라하 행성별 카르마 작동 방식을 읽는 중...',
    '12하우스 삶의 무대별 반복 패턴을 정리하는 중...',
    '커리어와 사회적 성취 축을 분석하는 중...',
    '재물과 수익 구조를 해석하는 중...',
    '사랑과 관계 패턴을 분석하는 중...',
    '건강·소진·회복 신호를 정리하는 중...',
    '현재 다샤 흐름의 기회와 리스크를 해석하는 중...',
    '최종 인생 전략과 실행 로드맵을 종합하는 중...',
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
    1: ['라그나가 보여주는 인생의 출발점', '달 별자리와 나크샤트라가 보여주는 마음의 구조', '태양이 보여주는 자아와 삶의 방향', '차트 전체에서 가장 강한 신호', '이번 생의 핵심 키워드'],
    2: ['라그나 별자리의 핵심 성향', '1하우스 행성이 만드는 첫인상과 존재감', '라그나 로드의 위치와 인생 방향', '강점이 드러나는 방식', '약점이 반복되는 패턴', '라그나 기준 실전 조언'],
    3: ['달 별자리의 감정 패턴', '나크샤트라가 보여주는 본능적 욕구', '마음이 흔들리는 순간', '애착과 안정감의 구조', '감정 회복 루틴'],
    4: ['아트마카라카 행성의 의미', '영혼이 반복해서 마주하는 과제', '고통이 성숙으로 바뀌는 지점', '피하면 반복되는 문제', '이번 생에서 반드시 키워야 할 힘'],
    5: ['개인 행성이 만드는 성격과 선택', '목성과 금성이 주는 확장과 관계성', '토성이 만드는 책임과 지연', '라후와 케투가 만드는 욕망과 해탈', '행성 전체의 균형과 불균형'],
    6: ['1·4·7·10하우스 핵심 축', '2·6·10하우스 현실 성취 축', '5·7·11하우스 관계와 욕망 축', '8·12하우스 무의식과 변화 축', '하우스 전체에서 반복되는 삶의 패턴'],
    7: ['직업적 방향성과 사회적 역할', '10하우스 행성과 커리어 욕망', '라후가 만드는 비정형적 성공 욕구', '조직형·독립형·창작형 적성', '커리어 리스크와 돌파 전략'],
    8: ['돈을 버는 방식', '수익이 커지는 구조', '돈이 막히는 습관', '네트워크와 보상의 연결', '재물 관리 실전 조언'],
    9: ['사랑에서 드러나는 매력', '끌리는 상대의 특징', '관계에서 이상화가 생기는 지점', '장기 관계에서의 과제', '사랑을 오래 지키는 방법'],
    10: ['몸과 마음의 취약 패턴', '스트레스가 쌓이는 방식', '무의식적 소진과 회피', '회복이 필요한 생활 습관', '건강 관리 조언'],
    11: ['현재 마하다샤의 큰 흐름', '현재 안타르다샤의 세부 과제', '지금 열리는 기회', '지금 조심해야 할 선택', '현재 운을 활용하는 전략'],
    12: ['차트 전체 핵심 요약', '가장 강한 자원', '가장 반복되는 약점', '앞으로 강화해야 할 선택', '피해야 할 선택', '최종 실행 로드맵'],
  };

  var _chapters = Array(12).fill(null);
  var _chapterStructured = Array(12).fill(null);
  var _chapterMeta = Array(12).fill(null);
  var _chapterErrors = Array(12).fill(null);
  var _generating = false;
  var _currentChapter = 1;
  var _vdCurrentReportId = '';
  var _mysticTimer = null;
  var _premiumPaidUntil = 0;
  var _vdFetchChapterForPartialRegenerate = null;
  var _vdJobStateKey = 'cd:premium-job:vedic';

  function _vdGetJobClient() {
    return (typeof window !== 'undefined' && window.CDPremiumPdfJobClient) ? window.CDPremiumPdfJobClient : null;
  }

  function _vdStartPremiumJob(profile) {
    var client = _vdGetJobClient();
    if (!client) return;
    var birth = (profile && profile.birth) ? profile.birth : {};
    client.start({
      stateKey: _vdJobStateKey,
      reportType: 'vedicPremium',
      featureType: 'premium_pdf_vedic',
      requestBody: {
        name: String((profile && profile.name) || '사용자'),
        gender: String((profile && profile.gender) || ''),
        year: Number(birth.year || 0),
        month: Number(birth.month || 0),
        day: Number(birth.day || 0),
        hour: Number(birth.hour || 12),
        minute: Number(birth.minute || 0),
      },
    }).catch(function () {});
  }

  function _vdResumePremiumJob() {
    var client = _vdGetJobClient();
    if (!client) return;
    client.resume({ stateKey: _vdJobStateKey }).catch(function () {});
  }

  function _vdRunPremiumJob(totalChapters) {
    var client = _vdGetJobClient();
    if (!client) return;
    client.run({
      stateKey: _vdJobStateKey,
      startChapter: 1,
      endChapter: Number(totalChapters || 12),
      stopOnFailure: false,
    }).catch(function () {});
  }

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
    modal.style.setProperty('--lb-history-a','rgba(234, 88, 12, 0.2)');
    modal.style.setProperty('--lb-history-b','rgba(194, 65, 12, 0.48)');
    modal.style.setProperty('--lb-history-border','rgba(251, 146, 60, 0.5)');
    modal.style.setProperty('--lb-history-text','#ffedd5');
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
      '일시적인 응답 지연으로 해석을 불러오지 못했습니다. 부분 재생성 버튼을 이용해주세요.',
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
  function _vdSaveResult(p){try{sessionStorage.setItem(_vdMakeKey(p),JSON.stringify({chapters:_chapters,chapterStructured:_chapterStructured,chapterMeta:_chapterMeta,currentChapter:_currentChapter,reportId:String(_vdCurrentReportId||'').trim(),name:(p&&p.name)||'사용자',birth:(p&&p.birth)||{},gender:(p&&p.gender)||'',savedAt:new Date().toISOString()}));}catch(_){} }
  function _vdLoadSaved(p){try{var raw=sessionStorage.getItem(_vdMakeKey(p));return raw?JSON.parse(raw):null;}catch(_){return null;}}

  function _vdHasSavedContent(saved){
    if(!saved||typeof saved!=='object')return false;
    var chapters=Array.isArray(saved.chapters)?saved.chapters:[];
    if(chapters.some(function(ch){var text=String(ch||'').trim();return text.length>0&&!/^⚠️/.test(text);})){return true;}
    var structured=Array.isArray(saved.chapterStructured)?saved.chapterStructured:[];
    return structured.some(function(block){return block&&Array.isArray(block.sections)&&block.sections.some(function(row){return String((row&&(row.body||row.content))||'').trim().length>0;});});
  }

  function _vdApplySavedResult(saved, modal){
    if(!saved||!modal)return;
    _chapters=Array.isArray(saved.chapters)?saved.chapters.slice(0,12):Array(12).fill(null);
    _chapterStructured=Array.isArray(saved.chapterStructured)?saved.chapterStructured.slice(0,12):Array(12).fill(null);
    _chapterMeta=Array.isArray(saved.chapterMeta)?saved.chapterMeta.slice(0,12):Array(12).fill(null);
    _currentChapter=Math.max(1,Math.min(12,Number(saved.currentChapter||1)));
    _vdCurrentReportId=String(saved.reportId||'').trim();
    _showScreen('vdResultScreen');
    _updateTocState(_currentChapter);
    _renderChapter(_currentChapter);
    _bindToc();
    _ensureVedicPartialRegenerateControl();
    var nameEl=_qs('vdResultName'),dateEl=_qs('vdResultDate');
    if(nameEl)nameEl.textContent='🪷 '+(saved.name||'사용자')+'님의 베다 인생 총람';
    if(dateEl){var b=saved.birth||{};var sd=saved.savedAt?new Date(saved.savedAt).toLocaleDateString('ko-KR'):'';dateEl.textContent=[b.year,b.month,b.day].filter(Boolean).join('.')+(sd?' · 💾 '+sd+' 저장':'');}
    console.info('[VedicPremium][Flow] SESSION_RESTORED',{reportId:_vdCurrentReportId||null,validChapters:_chapters.filter(function(row,idx){var txt=String(row||'').trim();var structured=_chapterStructured[idx];return (txt.length>0&&!/^⚠️/.test(txt))||(structured&&Array.isArray(structured.sections)&&structured.sections.some(function(sec){return String((sec&&(sec.body||sec.content))||'').trim().length>0;}));}).length,totalChapters:12,message:'구조화 섹션도 로드됨'});
  }

  function _vdEnsureHistoryButton(saved, modal){
    var startScreen=_qs('vdStartScreen');
    if(!startScreen||!modal)return;
    var btn=_qs('vdViewSavedBtn');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.id='vdViewSavedBtn';
      btn.className='lb-btn-generate lb-btn-history';
      btn.textContent='📂 지난 베다 총람 열기';
      startScreen.appendChild(btn);
      btn.addEventListener('click',function(){
        var payload=btn.__savedPayload||null;
        if(!_vdHasSavedContent(payload))return;
        _vdApplySavedResult(payload, modal);
      });
    }
    btn.__savedPayload=saved;
    btn.style.display=_vdHasSavedContent(saved)?'':'none';
  }

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
      _currentChapter=ch;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.vd-toc-item'),function(b){
        b.classList.toggle('active',b===btn);
        b.classList.toggle('loaded',!!_chapters[Number(b.getAttribute('data-vd-chapter'))-1]);
      });
      try{if(window.__cdActiveBirthProfile&&_vdHasSavedContent({chapters:_chapters,chapterStructured:_chapterStructured}))_vdSaveResult(window.__cdActiveBirthProfile);}catch(_){}
    });
  }

  function _renderChapter(ch){
    var content=_qs('vdChapterContent');
    if(!content)return;
    _currentChapter=Math.max(1,Math.min(12,Number(ch||1)));
    var idx=ch-1,data=_chapters[idx],structured=_chapterStructured[idx];
    if(!data&&!structured){content.innerHTML='<p class="zb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';return;}
    var meta=_getChapterMeta(idx);
    var bodyHtml=_renderStructuredChapterBody(ch,structured);
    if(!bodyHtml&&data)bodyHtml=_md2html(data);
    content.innerHTML='<div class="zb-chapter-wrap"><div class="zb-chapter-header"><span class="zb-chapter-num">Chapter '+ch+'</span><h2 class="zb-chapter-title">'+_escHtml(meta.title)+'</h2><p class="zb-chapter-sub">'+_escHtml(meta.subtitle)+'</p></div><div class="zb-chapter-body">'+bodyHtml+'</div></div>';
    content.scrollTop=0;
  }

  function _updateTocState(activeChapter){
    _renderToc();
    var current=Math.max(1,Math.min(12,Number(activeChapter||_currentChapter||1)));
    Array.prototype.forEach.call(document.querySelectorAll('#vdToc .vd-toc-item'),function(btn){
      var ch=Number(btn.getAttribute('data-vd-chapter'));
      btn.classList.toggle('loaded',!!_chapters[ch-1]);
      btn.classList.toggle('active',ch===current);
    });
  }

  function _regenerateVedicCurrentChapter(){
    var chapter=Math.max(1,Math.min(12,Number(_currentChapter||1)));
    var idx=chapter-1;
    var fetchChapter=_vdFetchChapterForPartialRegenerate;
    var runPipeline=(typeof window.__cdRunPremiumChapterPipeline==='function')?window.__cdRunPremiumChapterPipeline:null;
    if(!runPipeline){
      alert('공통 챕터 파이프라인을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if(!_vdCurrentReportId||typeof fetchChapter!=='function'){
      alert('현재 세션 정보가 부족해 부분 재생성을 시작할 수 없습니다. 리포트를 다시 생성한 뒤 시도해 주세요.');
      return;
    }

    runPipeline({
      totalChapters:1,
      maxAttempts:3,
      retryDelayMs:3000,
      fetchChapter:function(){ return fetchChapter(idx); },
      isSuccess:function(data){ return !!(data&&data.ok&&data.text); },
      onSuccess:function(_,data){
        _syncChapterMetaFromResponse(idx,data);
        _chapters[idx]=String(data.text||'').trim();
        _chapterStructured[idx]=(Array.isArray(data.sections)&&data.sections.length)?{sections:data.sections}:(data.chapterJson&&typeof data.chapterJson==='object'?data.chapterJson:null);
        _chapterErrors[idx]=null;
        _vdSaveResult(window.__cdActiveBirthProfile||{});
        _updateTocState(chapter);
        _renderChapter(chapter);
      },
      onFallback:function(_,fallbackPayload){
        var fallbackText=String(window.__cdPremiumChapterFallbackText||'일시적인 응답 지연으로 해석을 불러오지 못했습니다. 부분 재생성 버튼을 이용해주세요.');
        var msg=(fallbackPayload&&fallbackPayload.message)?String(fallbackPayload.message):'알 수 없는 오류';
        _chapterErrors[idx]=msg;
        _chapters[idx]=fallbackText;
        _chapterStructured[idx]=null;
        _vdSaveResult(window.__cdActiveBirthProfile||{});
        _updateTocState(chapter);
        _renderChapter(chapter);
      }
    }).catch(function(error){
      var msg=String(error&&error.message?error.message:error||'부분 재생성 중 오류가 발생했습니다.');
      alert('베다 부분 재생성 중 오류가 발생했습니다: '+msg);
    });
  }

  function _ensureVedicPartialRegenerateControl(){
    if(typeof window.__cdAttachPartialRegenerateControl!=='function') return;
    window.__cdAttachPartialRegenerateControl({
      scopeSelector:'#vdToc',
      buttonId:'vdPartialRegenerateBtn',
      buttonText:'현재 챕터 재생성',
      onClick:_regenerateVedicCurrentChapter
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
    _vdResumePremiumJob();

    if(!window.__cdActiveBirthProfile||!window.__cdActiveBirthProfile.birth) window.__cdActiveBirthProfile=profile;
      if (_generating) {
        _showScreen('vdLoadingScreen');
        modal.style.display='flex';
        modal.style.zIndex='100120';
        document.body.style.overflow='hidden';
        document.body.classList.add('lb-modal-open');
        try{modal.setAttribute('aria-hidden','false');}catch(_){ }
        return;
      }
    var saved=_vdLoadSaved(profile);
    _chapters=Array(12).fill(null);
    _chapterStructured=Array(12).fill(null);
    _chapterMeta=Array(12).fill(null);
    _chapterErrors=Array(12).fill(null);
    _currentChapter=1;
    _vdCurrentReportId='';
    _showScreen('vdStartScreen');
    modal.style.display='flex'; modal.style.zIndex='100120';
    document.body.style.overflow='hidden';
    document.body.classList.add('lb-modal-open');
    _vdEnsureHistoryButton(saved, modal);
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
    _vdStartPremiumJob(profile);
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
    _vdCurrentReportId=_vdReportId;

    function _vdReadPremiumAccessToken(){
      var token='';
      try{ token=String(window.__cdPremiumAccessToken||'').trim(); }catch(_){ token=''; }
      if(!token){ try{ token=String(sessionStorage.getItem('cd_premium_access_token')||'').trim(); }catch(_){ token=''; } }
      if(!token){ try{ token=String(localStorage.getItem('cd_premium_access_token')||'').trim(); }catch(_){ token=''; } }
      return token;
    }

    var VEDIC_CLIENT_TIMEOUT_MS = 180000;
    var VEDIC_INTER_CHAPTER_DELAY_MS = 3000;
    var VEDIC_RETRY_BASE_DELAY_MS = 5000;
    var VEDIC_MAX_RETRY_COUNT = 2;

    function _sleep(ms){
      return new Promise(function(resolve){ setTimeout(resolve, Math.max(0, Number(ms)||0)); });
    }

    function _fetchChapter(idx){
      return new Promise(function(resolve){
        var controller = new AbortController();
        var timeoutId = setTimeout(function(){
          try { controller.abort('timeout'); } catch(_) {}
        }, VEDIC_CLIENT_TIMEOUT_MS);
        var _vdPremiumToken=_vdReadPremiumAccessToken();
        var _vdMode='personal';
        var _vdHeaders={'Content-Type':'application/json'};
        if(_vdPremiumToken) _vdHeaders['x-premium-access-token']=_vdPremiumToken;
        fetch('/api/vedic/generate-chapter',{
          method:'POST',headers:_vdHeaders,
          signal: controller.signal,
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
        .then(function(data){clearTimeout(timeoutId);resolve(data);})
        .catch(function(err){
          clearTimeout(timeoutId);
          if(err && (err.name === 'AbortError' || String(err.message||err).toLowerCase().indexOf('aborted') !== -1)){
            resolve({ok:false,message:'응답 시간 초과 (180초).'});
            return;
          }
          resolve({ok:false,message:String(err&&err.message?err.message:err)});
        });
      });
    }

    async function _fetchChapterWithRetry(idx){
      var lastData = null;
      for(var attempt=0; attempt<=VEDIC_MAX_RETRY_COUNT; attempt++){
        if(chapterMsg){
          if(attempt===0) chapterMsg.textContent=LOADING_MSGS[idx]||'분석 중...';
          else chapterMsg.textContent='Chapter '+(idx+1)+' 재시도 중... ('+attempt+'/'+VEDIC_MAX_RETRY_COUNT+')';
        }
        var data = await _fetchChapter(idx);
        if(data&&data.ok&&data.text){
          return data;
        }
        lastData = data;
        var msg=(data&&(data.error||data.message))?data.error||data.message:'알 수 없는 오류';
        console.warn('[베다] Chapter '+(idx+1)+' 실패:',msg);
        if(attempt < VEDIC_MAX_RETRY_COUNT){
          var backoffMs = VEDIC_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          await _sleep(backoffMs);
        }
      }
      return lastData||{ok:false,message:'알 수 없는 오류'};
    }
    _vdFetchChapterForPartialRegenerate = _fetchChapterWithRetry;

    (async function generateSequentialChapters(){
      var _failCount=0;
      var chapterIndexes=[];
      for(var i=0;i<12;i++) chapterIndexes.push(i);

      for(var _i=0; _i<chapterIndexes.length; _i++){
        var idx = chapterIndexes[_i];
        var data = await _fetchChapterWithRetry(idx);
        if(data&&data.ok&&data.text){
          _syncChapterMetaFromResponse(idx,data);
          _chapters[idx]=data.text;
          _chapterStructured[idx]=(Array.isArray(data.sections)&&data.sections.length)?{sections:data.sections}:(data.chapterJson&&typeof data.chapterJson==='object'?data.chapterJson:null);
          _chapterErrors[idx]=null;
        } else {
          _failCount++;
          var msg=(data&&(data.error||data.message))?data.error||data.message:'알 수 없는 오류';
          _chapterErrors[idx]=msg;
          _chapters[idx]=_buildChapterSkeleton(idx,msg);
          _chapterStructured[idx]=null;
        }

        _setProgress(idx+1);
        if(_i < chapterIndexes.length - 1){
          await _sleep(VEDIC_INTER_CHAPTER_DELAY_MS);
        }
      }

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
      _currentChapter=1;
      _updateTocState(_currentChapter);_renderChapter(_currentChapter);_bindToc();
      _ensureVedicPartialRegenerateControl();
      var prof=window.__cdActiveBirthProfile||{};
      var _nameEl=_qs('vdResultName'),_dateEl=_qs('vdResultDate');
      if(_nameEl)_nameEl.textContent='🪷 '+(prof.name||'사용자')+'님의 베다 인생 총람';
      if(_dateEl){var _b=prof.birth||{};_dateEl.textContent=[_b.year,_b.month,_b.day].filter(Boolean).join('.')+'생 · 🗓️ '+new Date().toLocaleDateString('ko-KR')+' 발행';}
      _vdSaveResult(prof);
      _vdRunPremiumJob(12);
    })();
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
