import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
for(const success of [false,true])test(`static saju guide ${success?'replaces the old thumbnails':'retains the old thumbnails on failure'} without changing the purchase button`,async()=>{
 const dom=new JSDOM('<html lang="ko"><body><section data-saju-static-offer="compat-saju-compatibility"><div class="compat-preview__grid">기존 미리보기</div></section><button id="compatRunBtn" data-action="runCompat">궁합 분석하기</button></body></html>',{url:'https://example.test'});
 Object.assign(globalThis,{document:dom.window.document,window:dom.window,MutationObserver:dom.window.MutationObserver,HTMLImageElement:dom.window.HTMLImageElement});
 const urls=[];globalThis.fetch=async url=>{urls.push(url);return {ok:success,json:async()=>({title:'사주 궁합',notice:'범위',panels:[]})};};
 const button=document.querySelector('#compatRunBtn');
 await import('../../js/core/saju/crafted-product-details.mjs?static='+success);
 const details=document.querySelector('.saju-crafted-offer');details.open=true;details.dispatchEvent(new dom.window.Event('toggle'));await new Promise(r=>setTimeout(r,15));
 assert.equal(document.querySelector('#compatRunBtn'),button);assert.equal(button.dataset.action,'runCompat');
 assert.equal(!!document.querySelector('.compat-preview__grid'),!success);assert(urls.every(u=>u==='/feature-details/crafted/saju-compatibility/manifest.json'));
 dom.window.close();
});
