import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {famousLibrary} from '../canonical/famous-library.mjs';
import {chartFixture} from './chart-fixture.mjs';
const data=await famousLibrary();
test('full published web archive retains 60 readings and sourced three-system details',()=>{
 assert.equal(data.ilju.length,60);assert.equal(data.people.length,Object.keys(data.readings).length);assert.ok(data.people.length>200);
 for(const person of data.people){const detail=data.readings[person.slug];assert.ok(detail.magazine.sections.length);assert.deepEqual(detail.multiSystem.rows.map(row=>row.system),['saju','sukuyo','vedic']);assert.ok(detail.multiSystem.rows.every(row=>row.basis));assert.equal(person.classification,'needs_review');}
});
test('archive filters, candidate-only cycle, public original detail and deep-link reentry',async()=>{
 const {dom,React,createRoot,Component}=await chartFixture('FamousLibrary.tsx','/insights/famous-saju/',[{name:'library',setup(build){build.onResolve({filter:/^virtual:toss-famous-library$/},()=>({path:'asset',namespace:'library'}));build.onLoad({filter:/.*/,namespace:'library'},()=>({contents:'export default "/library.gz";'}));}}]);
 const prior=globalThis.fetch,priorHistory=globalThis.history;globalThis.history=window.history;window.scrollTo=()=>{};globalThis.fetch=async()=>new Response(gzipSync(JSON.stringify(data)));
 let root=createRoot(document.getElementById('chart'));
 const render=()=>React.act(async()=>{root.render(React.createElement(Component));await new Promise(resolve=>setTimeout(resolve,20));});
 const click=text=>React.act(async()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent===text);assert.ok(button,text);button.click();});
 try{await render();assert.equal(document.querySelectorAll('button.record').length,12);await click('60일주');await click('갑자');assert.match(document.querySelector('[role=status]').textContent,/검색 결과 0명/);await click('갑자일주 해설과 계산 후보 읽기');assert.equal(document.querySelector('h1').textContent,'갑자일주');assert.match(document.body.textContent,/확정 분류가 아닙니다/);
  const candidate=data.people.find(row=>row.dayPillar==='갑자');await React.act(()=>document.querySelector('button.record').click());assert.equal(document.querySelector('h1').textContent,candidate.name+' 사주');assert.ok(document.body.textContent.includes(data.readings[candidate.slug].magazine.sections[0].body));assert.equal(location.pathname,'/insights/famous-saju/'+candidate.slug+'/');
  await React.act(()=>root.unmount());root=createRoot(document.getElementById('chart'));await render();assert.equal(document.querySelector('h1').textContent,candidate.name+' 사주');
  window.history.replaceState({},'','/insights/famous-saju/unpublished-draft/');await React.act(()=>window.dispatchEvent(new window.PopStateEvent('popstate')));assert.equal(document.querySelector('h1').textContent,'공개된 글을 찾을 수 없어요');
 }finally{await React.act(()=>root.unmount());globalThis.fetch=prior;globalThis.history=priorHistory;dom.window.close();}
});
