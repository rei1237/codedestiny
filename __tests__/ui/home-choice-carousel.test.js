const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync(require('node:path').join(__dirname,'../../js/core/home-funnel.js'),'utf8');
function fixture(width=1280,reduced=false,translate){
 const dom=new JSDOM('<body><main id="cdHomeFunnel"><section><div id="cdSigViewport" tabindex="0"><div>'+Array.from({length:8},(_,i)=>'<a class="cd-sig-card" href="/consultation/'+i+'">'+i+'</a>').join('')+'</div></div><div class="cd-sig__controls" hidden><div data-sig-dots></div><button data-sig-prev></button><span data-sig-position></span><button data-sig-next></button><button data-sig-pause></button></div></section></main></body>',{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,timers=new Map();let timer=0,observer,mediaChange,frame=0,resizeObserver,stride=300;const frames=[];
 const flush=()=>{while(frames.length)frames.shift()();};
 Object.defineProperty(w,'innerWidth',{value:width,writable:true});
 const media={matches:reduced,addEventListener:(_type,fn)=>{mediaChange=fn;}};
 w.matchMedia=()=>media;
 w.setInterval=(fn,ms)=>{timers.set(++timer,{fn,ms});return timer;};w.clearInterval=id=>timers.delete(id);
 w.requestAnimationFrame=fn=>{frames.push(fn);return ++frame;};
 w.ResizeObserver=class{constructor(fn){resizeObserver=fn;}observe(){}disconnect(){}};
 w.IntersectionObserver=class{constructor(fn){observer=fn;}observe(){}disconnect(){}};
 const rail=d.querySelector('#cdSigViewport'),cards=[...d.querySelectorAll('.cd-sig-card')];
 rail.getBoundingClientRect=()=>({left:0});
 Object.defineProperty(rail,'clientWidth',{get:()=>stride});
 cards.forEach((card,i)=>{card.getBoundingClientRect=()=>({left:4+i*stride-rail.scrollLeft});});
 rail.scrollTo=({left})=>{rail.scrollLeft=left;rail.dispatchEvent(new w.Event('scroll'));flush();};
 rail.scrollBy=({left})=>rail.scrollTo({left:rail.scrollLeft+left});
 if(translate)w.cdTranslate=translate;
 w.eval(source);
 return {w,d,timers,rail,cards,media,flush,resize:value=>{stride=value;resizeObserver();flush();},setVisible:ratio=>observer([{intersectionRatio:ratio}]),changeMotion:matches=>{media.matches=matches;mediaChange();},close:()=>dom.window.close()};
}
test('8초 자동 이동은 보이는 상담 레일에만 적용된다',()=>{
 const f=fixture();assert.equal(f.timers.size,0);f.setVisible(1);
 assert.equal(f.timers.size,1);const timer=[...f.timers.values()][0];assert.equal(timer.ms,8000);timer.fn();
 assert.equal(f.rail.scrollLeft,300);assert.equal(f.d.querySelector('[data-sig-position]').textContent,'02–04 / 08');
 f.setVisible(0);assert.equal(f.timers.size,0);f.close();
});
test('화면 폭마다 3·2·1장의 키보드 접근 범위를 유지한다',()=>{
 for(const [width,count] of [[1280,3],[800,2],[430,1],[390,1],[360,1],[320,1]]){
  const f=fixture(width);assert.equal(f.cards.filter(c=>!c.inert).length,count);
  f.d.querySelector('[data-sig-next]').click();assert.equal(f.rail.scrollLeft,300);
  assert.equal(f.cards[0].inert,true);f.close();
 }
});
test('사용자 이동 뒤에는 화면 복귀만으로 자동 이동을 다시 시작하지 않는다',()=>{
 const f=fixture();f.setVisible(1);f.d.querySelector('[data-sig-next]').click();
 assert.equal(f.timers.size,0);f.setVisible(0);f.setVisible(1);assert.equal(f.timers.size,0);
 const pause=f.d.querySelector('[data-sig-pause]');
 assert.equal(pause.getAttribute('aria-pressed'),'true');assert.equal(pause.getAttribute('aria-disabled'),'true');
 assert.equal(pause.getAttribute('aria-label'),'상담 카드 자동 넘김 멈춤');pause.click();assert.equal(f.timers.size,0);f.close();
});
test('마우스·키보드 포커스·문서 숨김·팝업은 이동을 멈춘다',async()=>{
 const f=fixture();f.setVisible(1);const section=f.rail.parentElement;
 section.dispatchEvent(new f.w.Event('mouseenter'));assert.equal(f.timers.size,0);
 section.dispatchEvent(new f.w.Event('mouseleave'));assert.equal(f.timers.size,1);
 f.rail.focus();assert.equal(f.timers.size,0);f.rail.blur();f.flush();assert.equal(f.timers.size,1);
 Object.defineProperty(f.d,'hidden',{value:true,configurable:true});f.d.dispatchEvent(new f.w.Event('visibilitychange'));assert.equal(f.timers.size,0);
 Object.defineProperty(f.d,'hidden',{value:false});f.d.dispatchEvent(new f.w.Event('visibilitychange'));
 const dialog=f.d.createElement('dialog');dialog.open=true;f.d.body.append(dialog);await Promise.resolve();assert.equal(f.timers.size,0);f.close();
});
test('연속 이동과 레일 폭 변화는 선택 카드 정렬을 유지한다',()=>{
 const f=fixture(390);const next=f.d.querySelector('[data-sig-next]');next.click();next.click();assert.equal(f.rail.scrollLeft,600);
 f.rail.dispatchEvent(new f.w.Event('scrollend'));f.rail.scrollLeft=0;
 f.resize(224);assert.equal(f.rail.scrollLeft,448);assert.equal(f.d.querySelector('[data-sig-position]').textContent,'03 / 08');assert.equal(f.cards.filter(c=>!c.inert).length,1);f.close();
});
test('현재 위치 점을 눌러도 화면 밖 카드는 키보드 접근에서 제외한다',()=>{
 const f=fixture(390);f.rail.scrollTo=()=>{};f.d.querySelector('[data-sig-slide="0"]').click();assert.equal(f.cards.filter(c=>!c.inert).length,1);f.close();
});
test('동작 축소에서는 자동 이동과 재생 버튼을 사용하지 않는다',()=>{
 const f=fixture(390,true);f.setVisible(1);assert.equal(f.timers.size,0);assert.equal(f.d.querySelector('[data-sig-pause]').hidden,true);f.close();
});

test('동적 카드 위치와 멈춤 안내에도 현재 언어를 적용한다',()=>{
 const f=fixture(390,false,(key,vars)=>key==='home.choice.position'?'Card '+vars.number:key==='home.choice.paused'?'Stopped':'Stop');
 assert.equal(f.d.querySelector('[data-sig-slide="0"]').getAttribute('aria-label'),'Card 1');
 f.d.querySelector('[data-sig-next]').click();assert.equal(f.d.querySelector('[data-sig-pause]').getAttribute('aria-label'),'Stopped');f.close();
});


test('달빛 장식은 화면 밖에서 멈추고 숨겨진 문서에서는 일시 정지한다',()=>{
 const dom=new JSDOM('<main id="cdHomeFunnel"><a class="cd-sig__samples-link" href="/consultation-samples/">예시 보기</a></main>',{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;let report,observed;
 w.matchMedia=()=>({matches:false});
 w.IntersectionObserver=class{constructor(fn){report=fn;}observe(node){observed=node;}};
 w.eval(source);
 const link=d.querySelector('a'),home=d.querySelector('main');
 assert.equal(observed,link);assert.equal(link.hasAttribute('data-moonlit-visible'),false);
 report([{target:link,isIntersecting:true,intersectionRatio:.8}]);
 assert.equal(link.hasAttribute('data-moonlit-visible'),true);
 Object.defineProperty(d,'hidden',{value:true,configurable:true});d.dispatchEvent(new w.Event('visibilitychange'));
 assert.equal(home.hasAttribute('data-moonlit-paused'),true);
 Object.defineProperty(d,'hidden',{value:false});d.dispatchEvent(new w.Event('visibilitychange'));
 assert.equal(home.hasAttribute('data-moonlit-paused'),false);
 report([{target:link,isIntersecting:false,intersectionRatio:0}]);
 assert.equal(link.hasAttribute('data-moonlit-visible'),false);assert.equal(link.getAttribute('href'),'/consultation-samples/');
 dom.window.close();
});
