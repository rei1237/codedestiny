import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {chartFixture} from './chart-fixture.mjs';
const exampleBirth={date:'1990-02-03',time:'08:35',unknown:false,calendar:'solar',gender:'F',city:'서울'};
const plugins=[{name:'synastry-dependencies',setup(build){build.onResolve({filter:/question-location$/},()=>({path:'native',namespace:'synastry'}));build.onLoad({filter:/.*/,namespace:'synastry'},()=>({contents:'export const copyReadingText=async()=>{};'}));build.onResolve({filter:/astro-reading\.css\?raw$/},()=>({path:path.resolve('public/styles/astro-reading.css'),namespace:'raw'}));build.onLoad({filter:/.*/,namespace:'raw'},args=>({contents:fs.readFileSync(args.path,'utf8'),loader:'text'}));}}];
for(const famous of [false,true])test(`public ${famous?'celebrity':'direct'} synastry uses actual input flow and preserves inputs on native back`,async()=>{
 const {dom,React,createRoot,Component}=await chartFixture('AstroSynastry.tsx','/astrology/',plugins),root=createRoot(document.getElementById('chart')),calls=[];
 const request=async(route,body)=>{calls.push({route,body});if(route.endsWith('/people'))return {people:[{name:'원본 인물',birth:'1995-01-02',cat:'배우',nationality:'KR'}],categories:['배우'],countries:{KR:{label:'한국',flag:'',order:0}},css:'.astro-syn-card{color:white}'};assert.equal(route,'/astro/synastry');return {ok:true,accessSource:'public',featureKey:body.featureKey,html:'<h2>단위검증 본문</h2>'};};
 const click=async text=>React.act(async()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent===text);assert.ok(button,text);button.click();});
 try{await React.act(async()=>root.render(React.createElement(Component,{famous,request,exampleBirth})));await click('모의 예시 입력하기');if(famous)await click('원본 인물');await React.act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(document.querySelector('iframe')?.title,'서양 점성술 시너스트리');const sent=calls.at(-1).body;assert.equal(sent.birth.date.year,1990);assert.equal(sent.featureKey,famous?'compat-astro-synastry':'compat-astro-direct-synastry');if(famous)assert.equal(sent.celeb.name,'원본 인물');else{assert.equal(sent.partner.birth.date.year,1991);assert.equal(sent.partner.name,'상대');}
  await React.act(()=>window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})));assert.equal(document.querySelector('[type=date]').value,'1990-02-03');assert.equal(calls.length,2);
 }finally{await React.act(()=>root.unmount());dom.window.close();}
});
