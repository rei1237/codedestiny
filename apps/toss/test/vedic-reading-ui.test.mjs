import test from 'node:test';
import assert from 'node:assert/strict';
import {vedicReadingModule} from '../canonical/vedic-reading.mjs';
import {chartFixture} from './chart-fixture.mjs';
const input={name:'모의 명반',year:1990,month:2,day:3,hour:8,minute:35,timezone:9,lat:37.5665,lon:126.978,gender:'F',birthTimeKnown:true};
const jd=(Date.UTC(1990,1,3,8,35)-9*3600000)/86400000+2440587.5;
const samples=[-.5,0,.5].map(shift=>({jd:jd+shift,ayanamsa:24,ascendantSidereal:120,engineQuality:'swiss',fallbackUsed:false,planets:Object.fromEntries(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Rahu','Ketu'].map((key,index)=>[key,(index*37+shift+360)%360]))}));
test('Vedic full reader submits birth input, switches both charts, opens eight original details and uses native back',async()=>{
 const {dom,React,createRoot,Component}=await chartFixture('../service/VedicReading.jsx','/vedic/',[{name:'vedic-source',setup(build){build.onResolve({filter:/^virtual:toss-vedic-reading(?:\.css)?$/},args=>({path:args.path,namespace:'vedic'}));build.onLoad({filter:/.*/,namespace:'vedic'},args=>({contents:args.path.endsWith('.css')?'':vedicReadingModule({factory:true}),loader:'js'}));}}]);
 const root=createRoot(document.getElementById('chart'));window.scrollTo=()=>{};let calls=0;
 const request=async(path,body)=>{calls++;assert.equal(path,'/vedic/reading');assert.equal(body.birth.gender,'F');return {stored:false,input,samples,natal:null};};
 const click=text=>React.act(()=>{const button=[...document.querySelectorAll('button')].find(item=>item.textContent===text);assert.ok(button,text);button.click();});
 const inputValue=async(element,value)=>React.act(()=>{Object.getOwnPropertyDescriptor(element.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype,'value').set.call(element,value);element.dispatchEvent(new window.Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));});
 try{
  await React.act(()=>root.render(React.createElement(Component,{request})));
  await inputValue(document.querySelector('[type=date]'),'1990-02-03');await inputValue(document.querySelector('[type=time]'),'08:35');const selects=document.querySelectorAll('select');await inputValue(selects[1],'F');await inputValue(selects[2],'서울');
  await React.act(async()=>{document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));});
  assert.equal(calls,1);assert.equal(document.querySelector('h1').textContent,'나의 베다 명반');assert.equal(document.querySelectorAll('[aria-label="베다 해석 주제"] button').length,7);
  await click('북인도 명반');assert.ok(document.querySelector('svg'));await click('남인도 명반');
  for(const detail of ['성향 심층','재물 상세','직업 상세','연애 상세','차크라 상세','요가 상세','처방 상세','빔쇼타리 다샤']){await click(detail);assert.equal(document.querySelector('h1').textContent,detail);assert.equal(document.querySelectorAll('[onclick]').length,0);assert.ok(document.querySelector('[data-vedic-action]'));const accordion=document.querySelector('[data-vedic-action^="toggleAcc"]');if(accordion){await React.act(()=>accordion.click());assert.match(accordion.getAttribute('aria-expanded'),/true|false/);}await React.act(()=>assert.equal(window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})),false));assert.equal(document.querySelector('h1').textContent,'나의 베다 명반');}
  await React.act(()=>window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})));assert.ok(document.querySelector('form'));assert.equal(document.querySelector('[type=date]').value,'1990-02-03');assert.equal(calls,1);
 }finally{await React.act(()=>root.unmount());dom.window.close();}
});
