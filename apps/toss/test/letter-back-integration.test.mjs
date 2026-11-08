import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {build} from 'esbuild';import {createRequire} from 'node:module';import path from 'node:path';import fs from 'node:fs';
const root=path.resolve(import.meta.dirname,'../../..'),require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module'),React=require('react'),{createRoot}=require('react-dom/client');
const mocks={
 'next/image':"import React from 'react';export default ()=>React.createElement('i');",
 'next/link':"import React from 'react';export default ({children})=>React.createElement('span',null,children);",
 'lucide-react':"export const ArrowLeft=()=>null,ArrowRight=()=>null,Check=()=>null,PencilLine=()=>null;",
 '@/app/components/PriceBadge':"export const PriceBadge=()=>null;",
 './consultation-world':"export const TAROT_KINDS=[{id:'choice',label:'선택'}];",
 './consultation-access':"export const HONEY_COST=30;",
 '@/app/_lib/auth-store':"export const useAuthStore=()=>({isAuthenticated:true,user:{id:'owner'}});export const getAuthState=()=>({isAuthenticated:true,user:{id:'owner'}});export const subscribeAuth=()=>()=>{};",
 '@/app/yeongnyangi/_lib/use-profiles':"export const profileKey=p=>p.profileId;export const useProfiles=()=>({profiles:[{profileId:'p',name:'본인'}],profileId:'p',select:()=>{},saved:()=>{},guest:false,loading:false,refresh:async()=>{}});",
 '@/app/yeongnyangi/_components/ProfileForm':"export default ()=>null;",
 '@/app/fortune-chat/ConsultationResult':"export default ()=>null;",
 '@/app/fortune-chat/YeoniWelcome':"export default ()=>null;",
 '@/app/fortune-chat/consultation-api':"export const isConsultationId=id=>/^[a-f0-9]{64}$/.test(id);export const consultationApi={list:async()=>({consultations:[]})};",
 '../src/platform':"export const paymentRequiresReview=()=>false;export const api=async path=>path.includes('/fortune-chat/recovery/')?{order:{orderId:path.split('/').at(-1),status:'UNASSIGNED',sku:'old',productId:'chat_tarot',domain:'tarot'}}:{consultations:[],nextCursor:null},event=()=>{},purchase=()=>{},saleProducts=async()=>[{id:'yeoni:chat_saju',sku:'sku',displayAmount:'₩5,000'}];",
 './native-back.mjs':"export const dispatchServiceBack=()=>{if(!window.dispatchEvent(new window.Event('code-destiny:toss-overlay-back',{cancelable:true})))return true;return !window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true}));};"
};
const room=fs.readFileSync(path.join(root,'apps/toss/service/TossLetterRoom.tsx'),'utf8'),intake=fs.readFileSync(path.join(root,'app/fortune-chat/ConsultationIntake.tsx'),'utf8');
const bundle=await build({stdin:{contents:room,resolveDir:path.join(root,'apps/toss/service'),loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'back-boundaries',setup(b){b.onResolve({filter:/.*/},a=>/^react(?:\/jsx-runtime)?$/.test(a.path)?{path:a.path,external:true}:a.path==='@/app/fortune-chat/ConsultationIntake'?{path:'intake',namespace:'intake'}:{path:a.path,namespace:'mock'});b.onLoad({filter:/.*/,namespace:'intake'},()=>({contents:intake,loader:'tsx',resolveDir:path.join(root,'app/fortune-chat')}));b.onLoad({filter:/.*/,namespace:'mock'},({path:p})=>({contents:mocks[p]||(p.endsWith('.css')?'export default {};':'export default ()=>null;')}));}}]});
const m=new Module(path.join(root,'letter-back-integration.cjs'));m.paths=Module._nodeModulePaths(path.join(root,'apps/toss'));m._compile(bundle.outputFiles[0].text,m.id);
for(const [mode,props,expected] of [
 ['review', {reviewOnly:true}, ['사주']],
 ['purchased tarot', {reviewOnly:true,initialOrderId:'01900000-1111-7111-8111-000000000001'}, ['타로']],
 ['unrestricted', {}, ['사주','자미두수','숙요','베다점','서양 점성술','타로']],
]){
 test(mode+' shows exactly the available methods',async()=>{
  const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/fortune-tea-house/?counsel=letter'});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;
  globalThis.sessionStorage=dom.window.sessionStorage;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const app=createRoot(document.getElementById('root'));
  const button=(text)=>[...document.querySelectorAll('button')].find(el=>el.textContent.includes(text));
  try{
   await React.act(async()=>app.render(React.createElement(m.exports.default,props)));
   await React.act(async()=>button('올해 이직').click());
   await React.act(async()=>button('계속하기').click());
   const methods=document.querySelector('fieldset');
   assert.equal(methods.querySelector('legend').textContent,'해석 방식');
   assert.deepEqual([...methods.querySelectorAll('button strong')].map(el=>el.textContent),expected);
   assert.equal(methods.querySelectorAll('button:disabled').length,0);
  }finally{await React.act(async()=>app.unmount());dom.window.close();}
 });
}
test('native back moves intake step before leaving, then saves the current account draft',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/fortune-tea-house/?counsel=letter'});globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.location=dom.window.location;globalThis.sessionStorage=dom.window.sessionStorage;globalThis.IS_REACT_ACT_ENVIRONMENT=true;sessionStorage.setItem('toss:letter-draft',JSON.stringify({question:'작성 중인 질문',owner:'owner',at:Date.now()}));
 const app=createRoot(document.getElementById('root'));try{await React.act(async()=>app.render(React.createElement(m.exports.default)));const next=[...document.querySelectorAll('button')].find(button=>button.textContent.includes('계속하기'));await React.act(async()=>next.click());assert.match(document.body.textContent,/어떤 관점으로 살펴볼까요/);assert.equal(document.querySelector('button[aria-label="뒤로"]'),null);const overlay=new dom.window.Event('code-destiny:toss-overlay-back',{cancelable:true});await React.act(async()=>window.dispatchEvent(overlay));assert.equal(overlay.defaultPrevented,true);assert.match(document.body.textContent,/어떤 이야기를 나누고 싶나요/);const event=new dom.window.Event('code-destiny:toss-back',{cancelable:true});await React.act(async()=>window.dispatchEvent(event));assert.equal(event.defaultPrevented,false);const draft=JSON.parse(sessionStorage.getItem('toss:letter-draft'));assert.equal(draft.owner,'owner');assert.equal(draft.question,'작성 중인 질문');}finally{await React.act(async()=>app.unmount());dom.window.close();}
});
