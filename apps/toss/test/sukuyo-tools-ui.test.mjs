import test from 'node:test';
import assert from 'node:assert/strict';
import {chartFixture} from './chart-fixture.mjs';
import {TOSS_SUKUYO_TOOLS} from '../../../lib/fortune/toss-sukuyo-tools.mjs';
const exampleBirth={date:'1990-02-03',time:'08:35',unknown:false,calendar:'solar',gender:'F',city:'서울'};
test('Sukuyo public tools retain original adjuncts and pair inputs and return to the same form',async()=>{
 const {dom,React,createRoot,Component}=await chartFixture('SukuyoTools.tsx','/sukuyo/',[{name:'style-raw',setup(build){build.onResolve({filter:/^\.\/BasicSajuReading$/},()=>({path:'existing',namespace:'basic'}));build.onLoad({filter:/.*/,namespace:'basic'},()=>({contents:'import React from \"react\";export default ()=>React.createElement(\"section\",{\"data-existing-saju\":true});',loader:'js'}));build.onResolve({filter:/astro-reading\.css\?raw$/},()=>({path:'styles',namespace:'raw'}));build.onLoad({filter:/.*/,namespace:'raw'},()=>({contents:'export default "";',loader:'js'}));}}]);
 const root=createRoot(document.getElementById('chart')),calls=[];
 const request=async(route,body)=>{calls.push(body);assert.equal(route,'/sukuyo/tools');if(body.featureKey.includes('compat')){assert.equal(body.partner.date,'1991-04-05');assert.equal(body.partner.hour,12);assert.equal(body.place.name,'서울');}return {ok:true,featureKey:body.featureKey,html:'<p>원문 단위검증</p>',sajuBaseHtml:'<p>사주 근거</p>',prescriptionHtml:'<p>처방</p>'};};
 const click=async text=>React.act(async()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(button,text);button.click();});
 try{await React.act(()=>root.render(React.createElement(Component,{request,exampleBirth})));await click('모의 예시 입력하기');for(const [key,title] of Object.entries(TOSS_SUKUYO_TOOLS).filter(([key])=>key!=='sukuyo-extreme-t-relationship')){
  await React.act(()=>{const select=document.querySelector('select');Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set.call(select,key);select.dispatchEvent(new window.Event('change',{bubbles:true}));});
  await React.act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.equal(document.querySelector('iframe').title,title);await React.act(()=>assert.equal(window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})),false));assert.equal(document.querySelector('[type=date]').value,'1990-02-03');}
 assert.equal(calls.length,4);
 await React.act(()=>{const select=document.querySelector('select');Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set.call(select,'sukuyo-extreme-t-relationship');select.dispatchEvent(new window.Event('change',{bubbles:true}));});assert.ok(document.querySelector('[data-existing-saju]'));assert.equal(calls.length,4);await click('숙요 주제 선택으로 돌아가기');
 }finally{await React.act(()=>root.unmount());dom.window.close();}
});
