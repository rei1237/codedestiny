import test from 'node:test';
import assert from 'node:assert/strict';
import {chartFixture} from './chart-fixture.mjs';
const exampleBirth={date:'1990-02-03',time:'08:35',unknown:false,calendar:'solar',gender:'F',city:'서울'};
test('past-life keeps login, original nine purposes, manual and owned-profile inputs, and native return',async()=>{
 const {dom,React,createRoot,Component}=await chartFixture('SukuyoPastLife.tsx','/sukuyo/',[{name:'style-raw',setup(build){build.onResolve({filter:/astro-reading\.css\?raw$/},()=>({path:'styles',namespace:'raw'}));build.onLoad({filter:/.*/,namespace:'raw'},()=>({contents:'export default "";',loader:'js'}));}}]);
 const root=createRoot(document.getElementById('chart')),requests=[];let logins=0;
 const request=async(route,body)=>{requests.push({route,body});if(route==='/canonical/profile')return {profiles:[{profileId:'mine',name:'저장한 나'}]};assert.equal(route,'/sukuyo/past-life');return {ok:true,source:'public',stored:false,html:'<p>원문 mock</p>',css:'',data:{title:'두 사람의 인연',aiFollowupPrompt:'mock prompt',logicVersion:'sukyo-bond-report-v1'}};};
 const click=async(text)=>React.act(async()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(button,text);button.click();});
 const onError=()=>assert.fail();
 try{await React.act(()=>root.render(React.createElement(Component,{loggedIn:false,onLogin:()=>logins++,onError,request,exampleBirth})));assert.equal(document.querySelector('form'),null);assert.equal(requests.length,0);await click('토스 로그인하고 인연 살펴보기');assert.equal(logins,1);
 await React.act(async()=>root.render(React.createElement(Component,{loggedIn:true,onLogin:()=>logins++,onError,request,exampleBirth})));await click('모의 예시 입력하기');const selects=document.querySelectorAll('select');assert.equal(selects[selects.length-1].options.length,9);assert.equal([...selects].some(s=>s.textContent.includes('도시를 선택')),false);
 await React.act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.equal(requests.at(-1).body.userBirthDate,'1990-02-03');assert.equal(requests.at(-1).body.partnerBirthDate,'1991-04-05');assert.equal(document.querySelector('iframe').title,'숙요 전생 인연 리딩');
 await React.act(()=>assert.equal(window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})),false));assert.equal(document.querySelector('[type=date]').value,'1990-02-03');await React.act(()=>{const select=document.querySelector('select');Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set.call(select,'mine');select.dispatchEvent(new window.Event('change',{bubbles:true}));});await React.act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.equal(requests.at(-1).body.profileId,'mine');assert.equal(requests.at(-1).body.userBirthDate,undefined);assert.equal(logins,1);
 }finally{await React.act(()=>root.unmount());dom.window.close();}
});
