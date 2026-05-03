/**
 * 숙요점 프리미엄 (Sukuyo 宿曜占 — Premium Life Report)
 * CODE-DESTINY v1.0  •  27수 숙요 기반 13챕터 인생 총람
 */
(function () {
  'use strict';

  var CHAPTER_TITLES = [
    '🌑 영혼의 원형 — 당신의 숙요별이 새긴 운명 코드',
    '🌊 감정의 조수간만 — 달의 주기가 만들어내는 정서 파동',
    '🎭 페르소나와 브랜딩 — 세상이 당신을 기억하는 방식',
    '💰 자산의 중력 — 부를 끌어당기는 달빛 전략',
    '⚙️ 보이지 않는 톱니바퀴 — 성공 뒤에 숨겨진 협력 역학',
    '📡 관계의 정밀 레이더 — 6대 숙요 관계 역학 완전 분석',
    '💥 파괴적 혁신 — 위기를 기회로 전환하는 달빛 전략',
    '🌿 조화로운 성장 — 나를 살리는 공간과 환경의 법칙',
    '❤️ 정서적 유대 — 깊은 연결을 만드는 감정 지능',
    '🧭 운명적 거리 — 가까이해야 할 것과 멀리해야 할 것',
    '🌙 달의 주기 — 월령 에너지 사이클 완전 공략',
    '⚗️ 관계를 정리하는 회복 기술 — 힘든 인연을 좋은 흐름으로 바꾸는 법',
    '🗺️ 영혼의 마스터플랜 — 달빛 전략가의 10년 로드맵',
  ];

  var CHAPTER_SUBTITLES = [
    '27수 탄생 숙요의 본질·숨겨진 이면·반복되는 패턴·재능 지수 완전 해독',
    '달의 삭망 사이클과 숙요 에너지 공명·에너지 상승기·하강기 전략',
    '숙요 이미지 코드·숨은 성향 극복·30일 이미지 관리 실행 플랜',
    '숙요 재물 코드·달의 상승기 투자 원칙·재물 파괴 패턴 차단',
    '조직 내 역할·협력 시너지·마찰 포인트 달빛 해결법',
    '성·친·화·쇠·괴·살 6대 관계 역학 완전 분석',
    '쇠괴 에너지 위기 전략·달빛 혁신법·역경을 성장 자원으로',
    '공간 에너지·환경 심리학·건강 루틴·달월령 생활 설계',
    '깊은 감정 연결·공감 지능·정서적 유대 강화법',
    '성사·해로운 관계 경계·귀인 구별법·에너지 뱀파이어 차단',
    '월령 27주기 에너지 사이클·시기별 최적 행동 전략',
    '힘든 관계 정리·인연 회복 전략·새로운 인연 초대 의식',
    '10년 운세 지도·생애 핵심 미션·3·5·10년 마스터플랜',
  ];

  var LOADING_MSGS = [
    '탄생 숙요(宿曜)의 원형 코드를 해독하는 중...',
    '달의 삭망 주기와 정서 파동을 분석하는 중...',
    '숙요 페르소나와 브랜딩 코드를 구성하는 중...',
    '숙요 재물 코드와 달빛 자산 전략을 설계하는 중...',
    '협력 역학과 보이지 않는 톱니바퀴를 분석하는 중...',
    '6대 숙요 관계 역학 레이더를 구축하는 중...',
    '파괴적 혁신과 달빛 위기 전략을 설계하는 중...',
    '조화로운 성장을 위한 공간·환경 법칙을 분석하는 중...',
    '정서적 유대와 감정 지능 지도를 그리는 중...',
    '운명적 거리와 귀인 레이더를 설정하는 중...',
    '달의 27주기 에너지 사이클을 로드맵화하는 중...',
    '인연 정화 의식과 관계 회복 전략을 설계하는 중...',
    '영혼의 마스터플랜과 10년 로드맵을 총결산하는 중...',
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
  var _generating = false;
  var _currentChapter = 1;
  var _mysticTimer = null;

  function _qs(id) { return document.getElementById(id); }

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

  var _SK_STORE_VER='sk_v1_';
  function _skMakeKey(p){var b=(p&&p.birth)||{};return _SK_STORE_VER+(b.year||'0')+'_'+(b.month||'0')+'_'+(b.day||'0')+'_'+((p&&p.gender)||'u');}
  function _skSaveResult(p){try{sessionStorage.setItem(_skMakeKey(p),JSON.stringify({chapters:_chapters,name:(p&&p.name)||'사용자',birth:(p&&p.birth)||{},gender:(p&&p.gender)||'',savedAt:new Date().toISOString()}));}catch(_){}}
  function _skLoadSaved(p){try{var raw=sessionStorage.getItem(_skMakeKey(p));return raw?JSON.parse(raw):null;}catch(_){return null;}}

  function _showScreen(id){
    var screens=['skNoProfileScreen','skStartScreen','skLoadingScreen','skResultScreen','skErrorScreen'];
    for(var i=0;i<screens.length;i++){var el=_qs(screens[i]);if(el)el.style.display=(screens[i]===id)?'':'none';}
  }

  var SK_ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII'];

  function _renderToc(){
    var nav=document.getElementById('skToc');
    if(!nav||nav.querySelector('[data-sk-chapter]'))return;
    var html='';
    for(var i=1;i<=13;i++) html+='<button type="button" class="lb-toc-item sk-toc-item'+(i===1?' active':'')+'" data-sk-chapter="'+i+'">'+SK_ROMAN[i-1]+'</button>';
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
      if(!ch||!_chapters[ch-1])return;
      _renderChapter(ch);
      Array.prototype.forEach.call(nav.querySelectorAll('.sk-toc-item'),function(b){
        b.classList.toggle('active',b===btn);
        b.classList.toggle('loaded',!!_chapters[Number(b.getAttribute('data-sk-chapter'))-1]);
      });
    });
  }

  function _renderChapter(ch){
    var content=_qs('skChapterContent');
    if(!content)return;
    var idx=ch-1, data=_chapters[idx];
    if(!data){content.innerHTML='<p class="zb-ch-empty">이 챕터가 아직 생성되지 않았습니다.</p>';return;}
    content.innerHTML='<div class="zb-chapter-wrap"><div class="zb-chapter-header"><span class="zb-chapter-num">Chapter '+ch+'</span><h2 class="zb-chapter-title">'+_escHtml(CHAPTER_TITLES[idx])+'</h2><p class="zb-chapter-sub">'+_escHtml(CHAPTER_SUBTITLES[idx])+'</p></div><div class="zb-chapter-body">'+_md2html(data)+'</div></div>';
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
      _chapters=saved.chapters;
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
    _chapters=Array(13).fill(null);
    _currentChapter=1;
    _showScreen('skStartScreen');
    modal.style.display='flex'; modal.style.zIndex='100120';
    document.body.style.overflow='hidden';
    document.body.classList.add('lb-modal-open');
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

    _generating=true;
    _chapters=Array(13).fill(null);
    _showScreen('skLoadingScreen');

    var partner=_readPartnerData();

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

    function _setProgress(done){
      var pct=Math.round((done/13)*100);
      if(progressBar)progressBar.style.width=pct+'%';
      if(progressText)progressText.textContent=done+' / 13 챕터 완성 ('+pct+'%)';
      if(stageEl){
        var _phase=done===0
          ? '별자리 관계 데이터 정렬 중'
          : (done<13?('AI가 Chapter '+(done+1)+' 숙요 해석 중'):'PDF 저장 준비 완료');
        stageEl.textContent='진행 단계: '+_phase;
      }
      if(chapterMsg&&done<13)chapterMsg.textContent=LOADING_MSGS[done]||'분석 중...';
      if(chapterMsg&&done>=13)chapterMsg.textContent='숙요점 인생 총람이 완성되었습니다 ✦';
      if(chapterNumEl)chapterNumEl.textContent=done<13?'Chapter '+(done+1):'✦ 완성 ✦';
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
        var isActive=ch===done+1&&done<13;
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
      return new Promise(function(resolve){
        var tid=setTimeout(function(){resolve({ok:false,message:'응답 시간 초과 (60초).'});},60000);
        fetch('/api/premium/sukuyo-life',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({year:b.year,month:b.month,day:b.day,hour:b.hour!==undefined?b.hour:12,chapter:idx+1,
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
      });
    }

    var _failCount=0;
    (function generateNext(idx){
      if(idx>=13){
        clearInterval(_mysticTimer);_mysticTimer=null;_generating=false;
        var allFailed=_chapters.every(function(c){return !c||/^⚠️/.test(c);});
        if(allFailed){var errEl=_qs('skErrorMsg');if(errEl)errEl.textContent='모든 챕터 생성에 실패했습니다. API 키 설정 또는 네트워크를 확인해 주세요.';_showScreen('skErrorScreen');return;}
        _showScreen('skResultScreen');
        _updateTocState();_renderChapter(1);_bindToc();
        var prof=window.__cdActiveBirthProfile||{};
        var _nameEl=_qs('skResultName'),_dateEl=_qs('skResultDate');
        if(_nameEl)_nameEl.textContent='💫 '+(prof.name||'사용자')+'님의 숙요점 인생 총람';
        if(_dateEl){var _b=prof.birth||{};_dateEl.textContent=[_b.year,_b.month,_b.day].filter(Boolean).join('.')+'생 · 🗓️ '+new Date().toLocaleDateString('ko-KR')+' 발행';}
        _skSaveResult(prof);
        return;
      }
      if(chapterMsg)chapterMsg.textContent=LOADING_MSGS[idx]||'분석 중...';
      _fetchChapter(idx).then(function(data){
        if(data&&data.ok&&data.text){_chapters[idx]=data.text;}
        else{_failCount++;var msg=(data&&(data.error||data.message))?data.error||data.message:'알 수 없는 오류';console.warn('[숙요] Chapter '+(idx+1)+' 실패:',msg);_chapters[idx]='⚠️ **이 챕터의 분석을 불러오는 데 실패했습니다.**\n\n오류: '+msg+'\n\n잠시 후 다시 시도해 주세요.';}
        _setProgress(idx+1);
        generateNext(idx+1);
      });
    })(0);
  };

  window.downloadSukuyoBookPdf = function(){
    if(!_chapters.some(Boolean)){alert('먼저 숙요점 인생 총람을 생성해 주세요.');return;}
    var profile=window.__cdActiveBirthProfile||{};
    var name=(profile.name||'사용자')+'님의 숙요점 인생 총람';
    var birth=profile.birth||{};
    var issued=new Date().toLocaleDateString('ko-KR');
    var bodyHtml='';
    for(var i=0;i<13;i++){
      if(!_chapters[i])continue;
      bodyHtml+='<div class="chapter" style="page-break-before:'+(i>0?'always':'auto')+'"><div class="chapter-header"><span class="chapter-num">Chapter '+(i+1)+'</span><h2 class="chapter-title">'+_escHtml(CHAPTER_TITLES[i])+'</h2><p class="chapter-sub">'+_escHtml(CHAPTER_SUBTITLES[i])+'</p></div><div class="chapter-body">'+_md2html(_chapters[i])+'</div></div>';
    }
    var fullHtml='<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>'+_escHtml(name)+'</title>' +
      '<style>@import url("https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700&display=swap");' +
      'body{font-family:"Noto Serif KR",serif;color:#0a0820;background:#fff;margin:0;padding:0;}' +
      '.cover{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:40px;background:linear-gradient(135deg,#020817 0%,#0c1a2e 50%,#020817 100%);color:#fff;page-break-after:always;}' +
      '.cover-badge{font-size:0.75rem;letter-spacing:0.2em;color:#7dd3fc;margin-bottom:16px;text-transform:uppercase;}' +
      '.cover-title{font-size:2.6rem;font-weight:700;margin:0 0 12px;color:#fff;}' +
      '.cover-name{font-size:1.6rem;color:#7dd3fc;margin:8px 0;}' +
      '.cover-info{font-size:0.9rem;color:#94a3b8;}' +
      '.chapter{padding:52px 60px;}' +
      '.chapter-header{border-bottom:2px solid#7dd3fc;margin-bottom:28px;padding-bottom:20px;}' +
      '.chapter-num{font-size:0.75rem;letter-spacing:0.2em;color:#0284c7;text-transform:uppercase;}' +
      '.chapter-title{font-size:1.5rem;font-weight:700;color:#0c1a2e;margin:8px 0 6px;}' +
      '.chapter-sub{font-size:0.9rem;color:#0369a1;margin:0;}' +
      'h1,h2,h3,h4{color:#0c1a2e;}p{line-height:1.9;color:#0c1a2e;}' +
      'blockquote{border-left:3px solid#38bdf8;padding:8px 16px;background:#f0f9ff;margin:16px 0;}' +
      'strong{color:#075985;} ul,ol{padding-left:1.5em;} li{margin-bottom:6px;}' +
      '</style></head><body>' +
      '<div class="cover"><p class="cover-badge">💫 SUKUYO 宿曜占 PREMIUM</p>' +
      '<h1 class="cover-title">숙요점 인생 총람</h1>' +
      '<p style="font-size:1rem;color:#7dd3fc;margin-bottom:20px;">불교 밀교 비전 27수 기반 13챕터 달빛 운명 리포트</p>' +
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

  window.gotoSukuyoPremium = function(profileArg){window.openSukuyoBookModal(profileArg);};
})();
