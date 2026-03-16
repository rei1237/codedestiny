(function() {
  /* eslint-disable */

  /*
   * GROUPS
   * color  = 다크 모드(neo-mode) 텍스트강조 색상 (밝고 포화)
   * lite   = 라이트 모드(pig) 텍스트강조 색상 (어두워 가독성 우수)
   * bg     = 라이트 모드 헤더 배경 틴트
   */
  var GROUPS = [
    { id:'acc-core',   emoji:'\uD83D\uDD2E', title:'\uc0ac\uc8fc \uba85\ub9ac\ud559\uc758 \uc7a5',       open:true,  color:'#f9a8d4', lite:'#be185d', bg:'rgba(253,242,248,1)'  },
    { id:'acc-fun',    emoji:'\uD83C\uDFAA', title:'\uc7ac\ubc0c\ub294 \uc0ac\uc8fc \ucf58\ud150\uce20',  open:false, color:'#fda4af', lite:'#e11d48', bg:'rgba(255,241,242,1)'  },
    { id:'acc-ai',     emoji:'\uD83E\uDD16', title:'AI \uc0ac\uc8fc \ud504\ub86c\ud504\ud2b8 \ubaa8\uc74c',open:false, color:'#7dd3fc', lite:'#0369a1', bg:'rgba(240,249,255,1)'  },
    { id:'acc-lotto',  emoji:'\uD83C\uDFB1', title:'\ud589\uc6b4\uc758 \ub85c\ub610',                     open:false, color:'#86efac', lite:'#15803d', bg:'rgba(240,253,244,1)'  },
    { id:'acc-ziwei',  emoji:'\uD83C\uDF0C', title:'\uc790\ubbf8\ub450\uc218',                             open:false, color:'#c4b5fd', lite:'#6d28d9', bg:'rgba(245,243,255,1)'  },
    { id:'acc-astro',  emoji:'\u2728',        title:'\uc810\uc131\uc220',                                   open:false, color:'#a5b4fc', lite:'#4338ca', bg:'rgba(238,242,255,1)'  },
    { id:'acc-sukuyo', emoji:'💫', title:'숙요점', open:false, color:'#c084fc', lite:'#9333ea', bg:'rgba(250,245,255,1)' }
  ];

  var CORE_IDS  = ['sajuCard','adMiddle1','iljuCard','tenshinCard','johuCard','ukbuCard','adMiddle2','dailyMonthlyCard','summaryCard','adMiddle3','daewunCard','quantumCard','adMiddle4','compatCard','adMiddle5','similarCelebCard'];
  var FUN_IDS   = ['villainCard','skillTreeCard','energyCoordCard','healthReportCard','hormone-vibe-section','tTestCard'];
  var LOTTO_IDS = ['lottoCard'];
  var SUKUYO_IDS = ['sukuyoCard'];
  var EGYPT_IDS = ['egyptCard'];

  function toRgba(hex, a) {
    var r = parseInt(hex.slice(1,3),16);
    var g = parseInt(hex.slice(3,5),16);
    var b = parseInt(hex.slice(5,7),16);
    return 'rgba('+r+','+g+','+b+','+a+')';
  }

  function injectCSS() {
    if (document.getElementById('iaAccStyle')) return;
    var s = document.createElement('style');
    s.id = 'iaAccStyle';
    s.textContent = [
      /*  래퍼  */
      '#iaAcc{display:flex;flex-direction:column;gap:12px;margin:20px 0 32px;}',

      /*  아이템 공통  */
      '.ia-item{position:relative;border-radius:20px;overflow:hidden;border:1.5px solid var(--ia-border,rgba(255,183,178,.3));transition:border-color .3s,box-shadow .3s,transform .2s cubic-bezier(.34,1,.64,1);}',
      '.ia-item:active{transform:scale(0.985)!important;}',
      '.ia-item:hover{box-shadow:0 6px 24px var(--ia-shadow,rgba(219,39,119,.12));}',

      /*  열림 상태  */
      '.ia-item.ia-open{border-color:var(--ia-lite,#be185d);box-shadow:0 4px 20px var(--ia-shadow,rgba(219,39,119,.15));}',
      '.ia-item.ia-open:hover{box-shadow:0 8px 32px var(--ia-shadow,rgba(219,39,119,.22));}',

      /*  헤더 버튼 (라이트 모드 기본)  */
      '.ia-hd{position:relative;z-index:1;width:100%;display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border:none;cursor:pointer;font-family:"Gowun Dodum",sans-serif;font-size:1rem;font-weight:700;letter-spacing:.025em;text-align:left;color:var(--ia-lite,#be185d);background:var(--ia-bg,rgba(253,242,248,1));transition:background .25s,color .25s,filter .2s;}',
      '.ia-hd:hover{filter:brightness(0.96);}',
      '.ia-item.ia-open .ia-hd{background:var(--ia-bg,rgba(253,242,248,1));}',

      /* 왼쪽 컬러 액센트 바 */
      '.ia-hd::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--ia-lite,#be185d);border-radius:20px 0 0 0;transition:background .3s;}',
      '.ia-item.ia-open .ia-hd::before{border-radius:20px 0 0 0;}',

      /*  왼쪽 영역  */
      '.ia-hd-left{display:flex;align-items:center;gap:10px;padding-left:4px;}',
      '.ia-hd-emoji{font-size:1.25rem;line-height:1;display:inline-block;transition:transform .4s cubic-bezier(.34,1.56,.64,1);}',
      '.ia-item.ia-open .ia-hd-emoji{transform:scale(1.2) rotate(-6deg);}',
      '.ia-hd-title{font-size:1rem;font-weight:700;color:var(--ia-lite,#be185d);transition:color .25s;}',

      /*  화살표  */
      '.ia-hd-arrow{font-size:.72rem;color:var(--ia-lite,#be185d);opacity:.5;transition:transform .4s cubic-bezier(.4,0,.2,1),opacity .25s;will-change:transform;}',
      '.ia-item.ia-open .ia-hd-arrow{transform:rotate(180deg);opacity:.85;}',

      /*  바디 (라이트)  */
      '.ia-body{display:none!important;padding:14px 16px 18px;flex-direction:column;gap:14px;background:var(--card-bg,#fff);border-top:1.5px solid var(--ia-border,rgba(255,183,178,.25));position:relative;z-index:1;}',
      '.ia-item.ia-open .ia-body{display:flex!important;animation:iaSlide .38s cubic-bezier(.4,0,.2,1);}',
      '@keyframes iaSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}',

      /* 내부 카드 */
      '.ia-body>.card,.ia-body .card{box-shadow:none!important;margin-bottom:0!important;border-color:var(--border-color,rgba(255,183,178,.2))!important;}',
      '.ia-prem-wrap{display:flex;flex-direction:column;gap:14px;}',
      '.ia-prem-wrap .prem-box{margin:0!important;}',

      /*  다크 모드 (neo-mode) 재정의  */
      'body.neo-mode .ia-item{border-color:rgba(255,255,255,.08);}',
      'body.neo-mode .ia-item.ia-open{border-color:var(--ia-color,#f9a8d4);box-shadow:0 0 0 1px var(--ia-color,#f9a8d4),0 6px 28px var(--ia-shadow-neo,rgba(249,168,212,.18));}',
      'body.neo-mode .ia-item:hover{box-shadow:0 4px 20px rgba(255,255,255,.06);}',
      'body.neo-mode .ia-item.ia-open:hover{box-shadow:0 0 0 1px var(--ia-color,#f9a8d4),0 8px 36px var(--ia-shadow-neo,rgba(249,168,212,.25));}',

      'body.neo-mode .ia-hd{background:linear-gradient(135deg,rgba(30,20,50,.92) 0%,rgba(22,14,40,.96) 100%);color:var(--ia-color,#f9a8d4);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}',
      'body.neo-mode .ia-hd::before{background:var(--ia-color,#f9a8d4);}',
      'body.neo-mode .ia-hd:hover{filter:brightness(1.12);}',
      'body.neo-mode .ia-item.ia-open .ia-hd{background:linear-gradient(135deg,rgba(36,24,58,.95) 0%,rgba(26,16,46,.98) 100%);}',

      'body.neo-mode .ia-hd-title{color:var(--ia-color,#f9a8d4);}',
      'body.neo-mode .ia-item.ia-open .ia-hd-title{letter-spacing:.045em;background:linear-gradient(90deg,var(--ia-color,#f9a8d4) 0%,#fff 50%,var(--ia-color,#f9a8d4) 100%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:iaShine 2.6s linear infinite;}',
      '@keyframes iaShine{to{background-position:200% center}}',

      'body.neo-mode .ia-hd-arrow{color:var(--ia-color,#f9a8d4);opacity:.55;}',
      'body.neo-mode .ia-item.ia-open .ia-hd-arrow{opacity:1;text-shadow:0 0 8px var(--ia-color,#f9a8d4);}',
      'body.neo-mode .ia-item.ia-open .ia-hd-emoji{filter:drop-shadow(0 0 5px var(--ia-color,#f9a8d4));}',

      'body.neo-mode .ia-body{background:linear-gradient(180deg,rgba(30,20,50,.6) 0%,rgba(14,10,28,.5) 100%);border-top-color:rgba(255,255,255,.07);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}',
      'body.neo-mode .ia-body>.card,.body.neo-mode .ia-body .card{border-color:rgba(255,255,255,.07)!important;background:rgba(255,255,255,.03)!important;}',

      /* 다크 모드 고유 특수 효과 */
      'body.neo-mode .ia-item.ia-open{animation:iaGlow 3s ease-in-out infinite;}',
      '@keyframes iaGlow{0%,100%{box-shadow:0 0 0 1px var(--ia-color,#f9a8d4),0 4px 20px var(--ia-shadow-neo,rgba(249,168,212,.15)),0 10px 40px var(--ia-shadow-neo,rgba(249,168,212,.08));}50%{box-shadow:0 0 0 2px var(--ia-color,#f9a8d4),0 8px 36px var(--ia-shadow-neo,rgba(249,168,212,.3)),0 20px 60px var(--ia-shadow-neo,rgba(249,168,212,.18));}}',

      /* 다크 전용 개별 효과 */
      'body.neo-mode #acc-ai .ia-hd::after{content:"";position:absolute;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 0%,rgba(125,211,252,.7) 50%,transparent 100%);pointer-events:none;top:0;opacity:0;}',
      'body.neo-mode #acc-ai.ia-open .ia-hd::after{opacity:1;animation:iaScan 2.5s ease-in-out infinite;}',
      '@keyframes iaScan{0%{top:0%;opacity:0}12%{opacity:1}88%{opacity:1}100%{top:100%;opacity:0}}',

      'body.neo-mode #acc-ziwei.ia-open .ia-hd::after{content:"\\2736";position:absolute;right:44px;top:50%;font-size:1.1rem;color:rgba(196,181,253,.9);transform:translateY(-50%);pointer-events:none;animation:iaSpin 5s linear infinite;}',
      '@keyframes iaSpin{to{transform:translateY(-50%) rotate(360deg)}}',

      'body.neo-mode #acc-iching.ia-open .ia-hd::after{content:"\\262F";position:absolute;right:44px;top:50%;font-size:1.2rem;color:rgba(252,211,77,.9);transform:translateY(-50%) scale(1);pointer-events:none;animation:iaYin 8s linear infinite;}',
      '@keyframes iaYin{to{transform:translateY(-50%) scale(1) rotate(360deg)}}',

      'body.neo-mode #acc-astro.ia-open .ia-hd::after{content:"\\2605\\00A0\\2606\\00A0\\2605";position:absolute;right:44px;top:50%;transform:translateY(-50%);font-size:.68rem;letter-spacing:3px;color:rgba(165,180,252,.9);pointer-events:none;animation:iaTwink 1.8s ease-in-out infinite alternate;}',
      '@keyframes iaTwink{from{opacity:.3;letter-spacing:3px}to{opacity:1;letter-spacing:6px}}'
    ].join('');
    document.head.appendChild(s);
  }

  function buildAccordion() {
    var rp = document.getElementById('resultPage');
    if (!rp || document.getElementById('iaAcc')) return;
    injectCSS();

    var wrap = document.createElement('div');
    wrap.id = 'iaAcc';

    GROUPS.forEach(function(g) {
      var item = document.createElement('div');
      item.className = 'ia-item' + (g.open ? ' ia-open' : '');
      item.id = g.id;
      /* CSS 변수 주입 */
      item.style.setProperty('--ia-color', g.color);
      item.style.setProperty('--ia-lite',  g.lite);
      item.style.setProperty('--ia-bg',    g.bg);
      item.style.setProperty('--ia-border', toRgba(g.lite, 0.20));
      item.style.setProperty('--ia-shadow', toRgba(g.lite, 0.14));
      item.style.setProperty('--ia-shadow-neo', toRgba(g.color, 0.22));

      var hd = document.createElement('button');
      hd.type = 'button';
      hd.className = 'ia-hd';
      hd.innerHTML = '<span class="ia-hd-left"><span class="ia-hd-emoji">' + g.emoji + '</span><span class="ia-hd-title">' + g.title + '</span></span><span class="ia-hd-arrow">&#9660;</span>';
      /* touchend+passive:false+preventDefault는 iOS 스크롤 모멘텀을 방해함
         button 요소는 click 이벤트만으로도 모바일 탭(300ms 딜레이 없음)이 정상 작동 */
      var _toggle = function(e) { e.preventDefault(); e.stopPropagation(); item.classList.toggle('ia-open'); };
      hd.addEventListener('click', _toggle);

      var body = document.createElement('div');
      body.className = 'ia-body';
      body.id = g.id + '-body';

      item.appendChild(hd);
      item.appendChild(body);
      wrap.appendChild(item);
    });

    var anchor = document.getElementById('sajuCard');
    if (anchor && anchor.parentNode === rp) {
      rp.insertBefore(wrap, anchor);
    } else {
      rp.insertBefore(wrap, rp.firstChild);
    }
  }

  function moveCard(cardId, groupId) {
    var card = document.getElementById(cardId);
    var body = document.getElementById(groupId + '-body');
    if (card && body && !card.dataset.iaMoved) {
      card.dataset.iaMoved = '1';
      card.style.display = '';
      body.appendChild(card);
    }
  }

  function moveAll() {
    CORE_IDS.forEach(function(id) { moveCard(id, 'acc-core'); });
    FUN_IDS.forEach(function(id)  { moveCard(id, 'acc-fun');  });

    var charm = document.getElementById('specialCharmCard');
    if (charm && !charm.dataset.iaMoved) {
      charm.dataset.iaMoved = '1';
      var premBoxes = charm.querySelectorAll('.prem-box');
      if (premBoxes.length >= 1) {
        var aiWrap = document.getElementById('acc-ai-body');
        if (aiWrap) {
          var pw = document.createElement('div');
          pw.className = 'ia-prem-wrap';
          for (var i = 0; i < premBoxes.length; i++) { pw.appendChild(premBoxes[i]); }
          aiWrap.appendChild(pw);
        }
      }
      var funBody = document.getElementById('acc-fun-body');
      if (funBody) funBody.insertBefore(charm, funBody.firstChild);
    }

    LOTTO_IDS.forEach(function(id) { moveCard(id, 'acc-lotto'); });
    SUKUYO_IDS.forEach(function(id) { moveCard(id, 'acc-sukuyo'); });
    EGYPT_IDS.forEach(function(id) { moveCard(id, 'acc-egypt'); });

    var tabZiwei  = document.getElementById('tabZiwei');
    var tabAstro  = document.getElementById('tabAstro');
    var zbody = document.getElementById('acc-ziwei-body');
    var abody = document.getElementById('acc-astro-body');

    if (tabZiwei  && zbody && !tabZiwei.dataset.iaMoved)  { tabZiwei.dataset.iaMoved='1';  tabZiwei.style.display='block';  zbody.appendChild(tabZiwei); }
    if (tabAstro  && abody && !tabAstro.dataset.iaMoved)  { tabAstro.dataset.iaMoved='1';  tabAstro.style.display='block';  abody.appendChild(tabAstro); }

    var mw = document.querySelector('.mystic-tabs-wrapper');
    
    if (mw) mw.style.display = 'none';

    // ✄ Main Accordion Body Ads 
    if (window.BokchaeAdComponent && !window._iaAdsInjected) {
      window._iaAdsInjected = true;
      var catMap = {
        'acc-core': 'Saju',
        'acc-fun': 'Saju',
        'acc-ai': 'Saju',
        'acc-lotto': 'Saju',
        'acc-ziwei': 'Saju',
        'acc-astro': 'Zodiac'
      };
      
      GROUPS.forEach(function(g, idx) {
        // 2,4,6 th accordions get ads
        if (idx % 2 !== 0) {
          var body = document.getElementById(g.id + '-body');
          if (body) {
            var cat = catMap[g.id] || 'Saju';
            var adWrapper = document.createElement('view');
            adWrapper.innerHTML = window.BokchaeAdComponent.createHtml(cat);
            body.appendChild(adWrapper);
            setTimeout(function() { window.BokchaeAdComponent.injectScript(); }, 150);
          }
        }
      });
    }

  }

  function watchMode() {
    new MutationObserver(function() {
      var isNeo = document.body.classList.contains('neo-mode');
      GROUPS.forEach(function(g) {
        var item = document.getElementById(g.id);
        if (!item) return;
        item.style.setProperty('--ia-color', g.color);
        item.style.setProperty('--ia-lite',  isNeo ? g.color : g.lite);
        item.style.setProperty('--ia-bg',    isNeo ? 'transparent' : g.bg);
        item.style.setProperty('--ia-border', toRgba(isNeo ? g.color : g.lite, 0.22));
        item.style.setProperty('--ia-shadow', toRgba(isNeo ? g.color : g.lite, 0.15));
      });
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  document.addEventListener('DOMContentLoaded', function() {
    var rp = document.getElementById('resultPage');
    if (!rp) return;

    new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        if (m.attributeName === 'style') {
          var vis = rp.style.display !== 'none' && rp.style.display !== '';
          if (vis) {
            buildAccordion();
            setTimeout(moveAll, 120);
            setTimeout(moveAll, 700);
            setTimeout(moveAll, 1900);
          }
        }
      });
    }).observe(rp, { attributes: true });

    watchMode();

    if (rp.style.display !== 'none' && rp.style.display !== '') {
      buildAccordion();
      setTimeout(moveAll, 200);
    }
  });
})();