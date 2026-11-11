import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountCompactReading} from '../../js/core/saju/compact-reading.mjs';
const frame=()=>new Promise(r=>setTimeout(r,40));
test('classic reading retains original order, open chart, actions and old deep links',async()=>{
 const dom=new JSDOM('<html lang="ko"><div id="resultPage"><section id="sajuCard"><h2>명식</h2><button id="paid">기존 결제</button></section><section id="sajuReadingHeader"></section><section id="iljuCard"><h3>기질</h3></section><section id="daewunCard"><h3>대운</h3></section><section id="reportDashboardCard"><details><summary>본문</summary><p id="deep">상세</p></details></section></div></html>',{url:'https://example.invalid/',pretendToBeVisual:true});
 const w=dom.window,doc=w.document,ids=()=>[...doc.getElementById('resultPage').children].map(n=>n.id);const order=ids();let clicked=0,profiles=0;
 const button=doc.getElementById('paid');button.addEventListener('click',()=>clicked++);w.dpOpenList=()=>profiles++;
 const cleanup=mountCompactReading(doc);await frame();assert.deepEqual(ids(),order);assert.equal(doc.querySelectorAll('[data-reading-fold],#sajuCompactOverview').length,0);assert.equal(doc.getElementById('sajuCard').closest('details'),null);button.click();assert.equal(clicked,1);doc.querySelector('.saju-reading-profile-change').click();assert.equal(profiles,1);
 w.location.hash='#deep';await frame();assert.ok(doc.getElementById('deep').closest('details').open);
 let scroll=0;doc.getElementById('sajuCard').scrollIntoView=()=>scroll++;w.location.hash='#sajuCompact-nature';await frame();assert.equal(scroll,1);
 doc.getElementById('sajuReadingHeader').innerHTML='<h2>영냥이</h2>';await frame();assert.equal(doc.querySelectorAll('.saju-reading-profile-change').length,1);assert.deepEqual(ids(),order);
 w.__cdCurrentDestinyProfile={id:'b',name:'다른 프로필'};doc.getElementById('sajuReadingHeader').innerHTML='<h2>다른 프로필</h2>';await frame();assert.equal(doc.getElementById('sajuCard').closest('details'),null);assert.deepEqual(ids(),order);
 doc.documentElement.lang='en';w.dispatchEvent(new w.Event('cd:locale-ready'));assert.equal(doc.querySelector('.saju-reading-profile-change').textContent,'Change profile');
 cleanup();assert.equal(doc.querySelector('.saju-reading-profile-change'),null);w.close();
});
test('compact reading module remains executable HTML, outside comments',async()=>{
 const {readFileSync}=await import('node:fs');const html=readFileSync('index.html','utf8').replace(/<!--[\s\S]*?-->/g,'');
 assert.match(html,/<script type="module" src="\/js\/core\/saju\/compact-reading\.mjs\?v=build-[a-f0-9]+"><\/script>/);
});
