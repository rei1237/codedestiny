import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chartFixture} from './chart-fixture.mjs';
import {TOSS_ASTRO_SECTIONS} from '../../../lib/fortune/toss-astro-sections.mjs';
process.chdir(path.resolve(import.meta.dirname,'../../..'));
const exampleBirth={date:'1990-02-03',time:'08:35',unknown:false,calendar:'solar',gender:'F',city:'서울'};
const fixture={ok:true,planets:['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].map((name,index)=>({name,longitude:index*40,house:index+1})),angles:{ascendant:{longitude:10},midheaven:{longitude:280}},houses:Array.from({length:12},(_,index)=>({longitude:index*30+10})),aspects:[{p1:'Sun',p2:'Moon',type:'sextile',orb:1}]};
test('guest western reading opens original wheel and all ten sections, caches returns and preserves birth on native back',async()=>{
 const {dom,React,createRoot,Component}=await chartFixture('AstroReading.tsx','/astrology/',[{name:'original-styles',setup(build){build.onResolve({filter:/astro-reading\.css\?raw$/},()=>({path:path.resolve('public/styles/astro-reading.css'),namespace:'raw'}));build.onLoad({filter:/.*/,namespace:'raw'},args=>({contents:fs.readFileSync(args.path,'utf8'),loader:'text'}));}}]);
 const root=createRoot(document.getElementById('chart')),calls=[];
 const request=async(route,body)=>{calls.push({route,body});if(route==='/astro/chart')return fixture;assert.equal(route,'/astro/section');return {ok:true,accessSource:'public',featureKey:body.featureKey,html:'<details><summary>모의 근거</summary><p>단위 검증용 HTML</p></details>'};};
 const click=async(text)=>React.act(async()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(button,text);button.click();});
 try{await React.act(()=>root.render(React.createElement(Component,{request,exampleBirth})));await click('모의 예시 입력하기');await React.act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
 assert.ok(document.querySelector('svg[aria-label="출생 천궁도"]'));assert.equal(document.querySelectorAll('[aria-label="점성술 풀이 선택"] button').length,10);
 for(const title of Object.values(TOSS_ASTRO_SECTIONS)){await click(title);assert.equal(document.querySelector('iframe').title,title);assert.equal(document.querySelector('iframe').getAttribute('sandbox'),'allow-same-origin');}
 assert.equal(calls.length,11);await click('기본 심층 패키지');assert.equal(calls.length,11);
 await React.act(()=>assert.equal(window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})),false));assert.equal(document.querySelector('[type=date]').value,'1990-02-03');assert.equal(document.querySelector('[type=time]').value,'08:35');
 }finally{await React.act(()=>root.unmount());dom.window.close();}
});
