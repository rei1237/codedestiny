import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { matchesBudget, mountProfileFortuneFinder, waitForProfileFortuneCatalogue, restoreProfileFocusOnPreviewDismiss } from '../../js/core/profile-fortune-finder.mjs';

async function boot() {
  const dom = new JSDOM('<body><main id="inputPage"></main></body>', { url: 'https://example.test/ggulggul/', runScripts: 'outside-only' });
  const win = dom.window;
  for (const file of ['service-registry.js', 'home-service-finder.js']) win.eval(readFileSync('js/core/' + file, 'utf8'));
  const source = readFileSync('js/destiny-profile.js', 'utf8');
  const start = source.indexOf('    ov.innerHTML =', source.indexOf('window.dpLoadProfile ='));
  const end = source.indexOf('    document.body.appendChild(ov);', start);
  win.eval(`var ov = document.createElement('div'); ov.className='dp-fsel-overlay';
    var p={name:'테스트'},l={},zodiac='',dateStr='',fortuneTypes=[['saju','사주 풀이']];
    var _esc=x=>x,_dpText=x=>x,_dpFortuneSeal=()=>'';
    ${source.slice(start,end)} document.body.appendChild(ov);`);
  const root = win.document.querySelector('.dp-fsel-finder');
  mountProfileFortuneFinder(root, win.CodeDestinyAllFortunes);
  return { dom, win, root, query: root.querySelector('[data-fsel-query]'), budget: root.querySelector('[data-fsel-budget]') };
}

test('budget boundaries use catalogue amounts, allow free starts and exclude unknown paid prices', () => {
  for (const [price, budget, expected] of [['5,000원~15,000원',5000,true],['5,000원',4999,false],['10,000원',10000,true],['이용권',5000,false],['가격 확인',0,false],['1회 3,000원',3000,true]]) {
    assert.equal(matchesBudget({price,buckets:[]},budget),expected,price);
  }
  assert.equal(matchesBudget({price:'무료 시작 · 5,000원',buckets:['free','high']},0),true);
  assert.equal(matchesBudget({price:'5,000원'},-1),false);
  assert.equal(matchesBudget({price:'이용권'},''),true);
});

test('early first opening waits for the existing deferred catalogue; failure rejects without adding scripts', async()=>{
  for(const loaded of [true,false]) {
    const dom=new JSDOM('<script defer src="/js/core/home-service-finder.js?v=build-test"></script>',{url:'https://example.test/'});
    try {
      const win=dom.window, original=win.document.scripts.length;
      const ready=waitForProfileFortuneCatalogue(win);
      if(loaded) win.CodeDestinyAllFortunes={filter:()=>[]};
      win.document.scripts[0].dispatchEvent(new win.Event(loaded?'load':'error'));
      if(loaded) assert.equal(await ready,win.CodeDestinyAllFortunes);
      else await assert.rejects(ready,/unavailable/);
      assert.equal(win.document.scripts.length,original);
    }finally{dom.window.close();}
  }
});

test('range products keep their authoritative starting-price qualifier',async()=>{
  const {dom,win,root,query}=await boot();
  try {
    query.value='운명의 찻집';query.dispatchEvent(new win.Event('input'));
    const item=win.CodeDestinyAllFortunes.filter({query:query.value}).find(x=>x.id==='fortune-tea-house');
    assert.ok(item.priceFrom);
    assert.equal(root.querySelector('[data-cd-service-id="fortune-tea-house"] b').textContent,item.price.split('원')[0]+'원부터');
  }finally{dom.window.close();}
});

test('real popup composes keyword, budget and method, supports empty/reset, IME and pagination', async () => {
  const {dom,win,root,query,budget} = await boot();
  try {
    const count = () => root.querySelectorAll('.dp-fsel-result').length;
    assert.equal(count(),6);
    root.querySelector('[data-fsel-more]').click();
    assert.equal(count(),18);
    assert.equal(win.document.activeElement, root.querySelectorAll('.dp-fsel-result')[6]);
    root.querySelector('[data-fsel-price="5000"]').click();
    assert.equal(budget.value,'5000');
    query.value='연애'; query.dispatchEvent(new win.Event('input'));
    root.querySelector('[data-fsel-method="tarot"]').click();
    const expected=win.CodeDestinyAllFortunes.filter({query:'연애',methods:['tarot']}).filter(x=>matchesBudget(x,5000));
    assert.equal(count(),Math.min(6,expected.length));
    assert.equal(root.querySelector('[data-fsel-summary]').textContent,'조건에 맞는 운세 '+expected.length+'개');
    query.dispatchEvent(new win.Event('compositionstart'));
    query.value='zzzzzzzzzz'; query.dispatchEvent(new win.Event('input'));
    assert.equal(count(),Math.min(6,expected.length));
    query.dispatchEvent(new win.Event('compositionend'));
    assert.equal(count(),0); assert.equal(root.querySelector('[data-fsel-empty]').hidden,false);
    root.querySelector('[data-fsel-empty] button').click();
    assert.equal(query.value,''); assert.equal(budget.value,''); assert.equal(win.document.activeElement,query);
    assert.equal(count(),6);
    budget.value='-1'; budget.dispatchEvent(new win.Event('input'));
    assert.equal(count(),0); assert.equal(budget.getAttribute('aria-invalid'),'true');
  } finally {dom.window.close();}
});

test('cards preserve authoritative preview/gate metadata and dismiss the dialog before delegated selection',async()=>{
  const {dom,win,root}=await boot();
  try {
    const cards=[...root.querySelectorAll('.dp-fsel-result')];
    const paid=cards.find(card=>card.hasAttribute('data-pvw-paid'));
    assert.ok(paid); assert.ok(paid.getAttribute('data-feature-key'));
    assert.equal(paid.hasAttribute('data-coin-cost'),false);
    assert.equal(paid.hasAttribute('data-tile-lock-cost'),false);
    let dismissed=false;
    win.document.addEventListener('click',event=>{event.preventDefault(); dismissed=root.closest('.dp-fsel-overlay').hidden;});
    paid.click();
    assert.equal(dismissed,true);
  } finally {dom.window.close();}
});

test('capture-phase preview and mobile bridge close the high overlay; suppressed scroll clicks do not',async()=>{
  for (const mode of ['preview','preview-before-paint','bridge','scroll']) {
    const {dom,win,root}=await boot();
    try {
      const overlay=root.closest('.dp-fsel-overlay');
      win.document.addEventListener('click',event=>{
        event.preventDefault(); event.stopImmediatePropagation();
        if(mode.startsWith('preview')) {
          const preview=win.document.createElement('div');
          preview.id='tilePvwOverlay';
          preview.setAttribute('data-cd-detail-overlay','open');preview.setAttribute('aria-hidden','false');
          if(mode==='preview') preview.className='pvw-open';
          win.document.body.append(preview);
        }
        if(mode==='bridge') event.__cdMobileBridgeHandled=true;
      },true);
      // Drain the click's nested browser tasks, not wall-clock time. Under load a
      // fixed 10ms wait can run before the removal task scheduled by the first task.
      const tasks=[];
      const originalSetTimeout=win.setTimeout;
      win.setTimeout=(callback,delay,...args)=>{
        assert.equal(delay,0,'selection should only defer to the next task');
        tasks.push(()=>callback(...args));
        return tasks.length;
      };
      root.querySelector('.dp-fsel-result').click();
      try {
        let executed=0;
        while(tasks.length) {
          assert.ok(++executed<=10,'selection tasks must settle');
          tasks.shift()();
        }
      } finally {win.setTimeout=originalSetTimeout;}
      assert.equal(overlay.isConnected,mode==='scroll',mode);
      if(mode==='preview-before-paint') {
        await Promise.resolve();
        const preview=win.document.querySelector('#tilePvwOverlay');
        assert.equal(preview.classList.contains('pvw-open'),false);
        assert.equal(preview.__dpProfileFocusRestore,true,'paint-pending open must retain its close observer');
      }
    } finally {dom.window.close();}
  }
});

test('preview dismissal restores the live profile entry without stealing focus on CTA or a newer destination',async()=>{
  for(const mode of ['close','close-body','escape','escape-before-paint','backdrop','back','swipe','fallback','cta','cta-pending','other-focus','new-dialog']) {
    const dom=new JSDOM('<button id="origin">프로필 진입</button><button class="dp-mc-load-btn">이 프로필로 운세 보기</button><button id="next">다음 기능</button><nav id="cdMobileBottomNav"><a href="#" data-nav-key="fortunes">운세</a></nav><div id="tilePvwOverlay" class="pvw-open" data-cd-detail-overlay="open" aria-hidden="false"><button id="tilePvwClose">닫기</button><button id="tilePvwBd">배경</button><button id="tilePvwCtaBtn">시작하기</button></div>',{url:'https://example.test/'});
    try {
      const win=dom.window,doc=win.document,preview=doc.querySelector('#tilePvwOverlay');
      const origin=doc.querySelector('#origin'),fallback=doc.querySelector('.dp-mc-load-btn'),next=doc.querySelector('#next');
      let parentEscapeCalls=0;
      for(const button of [origin,fallback]) button.getClientRects=()=>[{width:196,height:48}];
      if(mode==='fallback') origin.remove();
      // The existing preview close handler first tries its now-detached result and
      // then its global navigation fallback. Run that contract before observation.
      function close() {
        preview.classList.remove('pvw-open');preview.setAttribute('aria-hidden','true');
        preview.setAttribute('data-cd-detail-overlay','');
        if(mode==='close-body') doc.activeElement.blur();
        else doc.querySelector('#cdMobileBottomNav a').focus();
      }
      preview.querySelector('#tilePvwClose').addEventListener('click',close);
      preview.querySelector('#tilePvwBd').addEventListener('click',close);
      preview.querySelector('#tilePvwCtaBtn').addEventListener('click',()=>{close();if(mode!=='cta-pending')next.focus();});
      doc.addEventListener('keydown',event=>{if(event.key==='Escape'){parentEscapeCalls++;close();}});
      win.addEventListener('popstate',close);
      if(mode==='escape-before-paint') preview.classList.remove('pvw-open');
      restoreProfileFocusOnPreviewDismiss(preview,origin);
      preview.querySelector('#tilePvwClose').focus();
      if(mode.startsWith('escape')) doc.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      else if(mode==='back') win.dispatchEvent(new win.PopStateEvent('popstate'));
      else if(mode==='swipe') close(); // Original preview's qualifying swipe invokes the same close function.
      else preview.querySelector(mode.startsWith('cta')?'#tilePvwCtaBtn':mode==='backdrop'?'#tilePvwBd':'#tilePvwClose').click();
      if(mode==='other-focus') next.focus();
      if(mode==='new-dialog') {
        const dialog=doc.createElement('div');dialog.setAttribute('role','dialog');
        dialog.getClientRects=()=>[{width:300,height:500}];doc.body.append(dialog);
      }
      await Promise.resolve(); // MutationObserver delivery, not a timed sleep.
      assert.equal(doc.activeElement,mode==='cta-pending'||mode==='new-dialog'?doc.querySelector('#cdMobileBottomNav a'):mode==='cta'||mode==='other-focus'?next:mode==='fallback'?fallback:origin,mode);
      assert.equal(parentEscapeCalls,0,'Escape must only close the top preview, not the parent profile sheet');
      assert.equal(preview.__dpProfileFocusRestore,undefined,'observer is released after close');
    }finally{dom.window.close();}
  }
});

test('the real preview animation callback cannot resurrect or focus a closed or replaced overlay',()=>{
  const source=readFileSync('index.html','utf8');
  const start=source.indexOf('    var openingOverlay = _ov;',source.indexOf('  function _open(tile,href,d){'));
  assert.ok(start>=0,'preview paint must retain the opening overlay identity');
  const end=source.indexOf('    if(window.__cdMobileFortuneTrace)',start);
  assert.ok(end>start);
  for(const mode of ['open','closed-before-paint','replaced-before-paint']) {
    const dom=new JSDOM('<button id="origin">프로필</button><div id="preview" data-cd-detail-overlay="open" aria-hidden="false"><button>닫기</button></div>');
    try {
      const doc=dom.window.document,preview=doc.querySelector('#preview'),origin=doc.querySelector('#origin');
      origin.focus();
      const frames=[];
      const context={_ov:preview,requestAnimationFrame:callback=>frames.push(callback),_focusables:()=>[preview.querySelector('button')]};
      vm.runInNewContext(source.slice(start,end),context);
      assert.equal(frames.length,1);
      if(mode==='closed-before-paint') {
        preview.setAttribute('data-cd-detail-overlay','');preview.setAttribute('aria-hidden','true');
      }
      if(mode==='replaced-before-paint') context._ov=preview.cloneNode(true);
      frames.shift()();
      assert.equal(preview.classList.contains('pvw-open'),mode==='open',mode);
      assert.equal(doc.activeElement,mode==='open'?preview.querySelector('button'):origin,mode);
    }finally{dom.window.close();}
  }
});
