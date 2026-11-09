import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountCompactReading} from '../../js/core/saju/compact-reading.mjs';
const frame=()=>new Promise(r=>setTimeout(r,70));
test('compact reading retains paid nodes, actions and deep links while closing details',async()=>{
 const dom=new JSDOM('<html lang="ko"><div id="resultPage"><section id="sajuReadingHeader"></section><section id="sajuCard"><h2>명식</h2><button id="paid">기존 결제</button></section><section id="iljuCard"><h3>기질</h3></section><section id="daewunCard"><h3>대운</h3></section></div></html>',{url:'https://example.invalid/',pretendToBeVisual:true});
 const w=dom.window;w.G_PILLARS={y:{g:'甲',j:'子'},m:{g:'乙',j:'丑'},d:{g:'丙',j:'寅'},h:{g:'丁',j:'卯'}};w.__cdCurrentDestinyProfile={id:'a',name:'긴 이름 프로필'};let clicked=0;const button=w.document.getElementById('paid');button.addEventListener('click',()=>clicked++);
 const cleanup=mountCompactReading(w.document);await frame();const folds=w.document.querySelectorAll('[data-reading-fold]');assert.equal(folds.length,3);assert.ok([...folds].every(n=>!n.open));assert.equal(w.document.querySelectorAll('#sajuCompactOverview dl>div').length,4);assert.equal(w.document.getElementById('paid'),button);button.click();assert.equal(clicked,1);
 w.location.hash='#paid';await frame();assert.ok(button.closest('details').open);w.location.hash='';await frame();w.document.getElementById('iljuCard').closest('details').open=true;w.document.getElementById('sajuReadingHeader').textContent='영냥이';await frame();assert.ok(w.document.getElementById('iljuCard').closest('details').open);
 w.__cdCurrentDestinyProfile={id:'b',name:'다른 프로필'};w.document.getElementById('sajuReadingHeader').textContent='변경';await frame();assert.ok([...folds].every(n=>!n.open));assert.match(w.document.getElementById('sajuCompactOverview').textContent,/다른 프로필/);w.__cdBirthTimeUnknown=true;w.document.getElementById('sajuReadingHeader').textContent='시간 미상';await frame();assert.equal(w.document.querySelector('#sajuCompactOverview dl>div:last-child dd').textContent,'—');w.document.documentElement.lang='en';w.dispatchEvent(new w.Event('cd:locale-ready'));await frame();assert.equal(w.document.querySelector('.saju-compact-nav a').textContent,'Overview');assert.equal(w.document.querySelector('#sajuCompactOverview button').textContent,'Change profile');cleanup();w.close();
});
