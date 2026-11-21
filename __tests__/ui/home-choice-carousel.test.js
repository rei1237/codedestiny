const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync(require('node:path').join(__dirname,'../../js/core/home-funnel.js'),'utf8');
// The old #cdSigViewport rail was replaced by the signature banner (signature-banner.behavior.test.js, 2026-11-22).

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
