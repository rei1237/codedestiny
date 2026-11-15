import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';import {build} from 'esbuild';import {createRequire} from 'node:module';import path from 'node:path';import fs from 'node:fs';
const root=path.resolve(import.meta.dirname,'../../..'),require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module'),React=require('react'),{createRoot}=require('react-dom/client'),{Simulate}=require('react-dom/test-utils');
const mocks={
 '@/app/_lib/auth-client':`export const authFetch=(...args)=>globalThis.__profileTest.fetch(...args);`,
 '@/app/_lib/profile-card-storage':`export const readDestinyProfileAccountId=()=>globalThis.__profileTest.account;`,
 '@/app/_lib/user-session-cache':`export const invalidateProfileCache=()=>{};`,
 '@/app/hooks/useBackNavigation':`export const useBackNavigation=options=>{globalThis.__profileTest.back=options;};`,
 '../_lib/api':`export const loginForCurrentPage=()=>{};`,
 '@/app/components/CurrentLocationButton':`import React from 'react';export default ({onLocation})=>React.createElement('button',{type:'button','data-test-location':'',onClick:()=>onLocation({latitude:35.68,longitude:139.76,source:'geolocation',accuracy:12,name:'일본 도쿄',timezone:'Asia/Tokyo'})},'현재 위치 테스트');`,
};
const bundled=await build({entryPoints:[path.join(root,'app/yeongnyangi/_components/ProfileForm.tsx')],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'profile-fixture',setup(b){
 b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'mock'}:a.path.endsWith('.css')?{path:a.path,namespace:'css'}:a.path.startsWith('@/')?{path:['','.ts','.tsx','.js','.mjs'].map(ext=>path.join(root,a.path.slice(2)+ext)).find(p=>fs.existsSync(p)&&fs.statSync(p).isFile())}:null);
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'jsx'}));b.onLoad({filter:/.*/,namespace:'css'},()=>({contents:'export default {};'}));
}}]});
const m=new Module(path.join(root,'apps/toss/test/guided-profile-fixture.cjs'));m.paths=Module._nodeModulePaths(path.join(root,'apps/toss'));m._compile(bundled.outputFiles[0].text,m.id);const Form=m.exports.default;
test('guided profile keeps original validation, drafts, calendar/time payload and account isolation',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.invalid/yeongnyangi/fortune/?flow=question'});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:fn=>fn()});
 const requests=[];globalThis.__profileTest={account:'toss-A',fetch:async(url,init)=>{requests.push({url,init});return new Response(JSON.stringify({profile:{profileId:'saved',name:'테스트'}}));}};
 let app=createRoot(document.getElementById('root')),saved;
 const mount=()=>app.render(React.createElement(Form,{guided:true,locale:'ko',onSaved:value=>{saved=value;}}));
 const input=(name,value)=>{const el=document.querySelector(`[name="${name}"]`);Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));Simulate.change(el);};
 const submit=()=>document.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
 const active=()=>document.querySelector('[data-profile-step]:not([hidden])').dataset.profileStep;
 try{
  await React.act(async()=>mount());assert.equal(active(),'0');await React.act(async()=>submit());assert.equal(active(),'0','empty name cannot advance');
  await React.act(async()=>{input('name','테스트');submit();});assert.equal(active(),'1');
  await React.act(async()=>input('date','1990-99-99'));await React.act(async()=>submit());assert.equal(active(),'1','invalid birth date is stopped in its own step');
  await React.act(async()=>{input('date','1990-01-01');const calendar=document.querySelector('[name=calendar]');calendar.value='lunar_leap';calendar.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});await React.act(async()=>submit());assert.equal(active(),'2',document.querySelector('[name=date]').outerHTML);
  await React.act(async()=>submit());assert.equal(active(),'2','known time requires a value');
  await React.act(async()=>document.querySelector('input[type=checkbox]').click());
  await React.act(async()=>submit());assert.equal(active(),'3');await React.act(async()=>document.querySelector('[data-test-location]').click());
  await React.act(async()=>assert.equal(window.dispatchEvent(new window.Event('code-destiny:toss-overlay-back',{cancelable:true})),false));assert.equal(active(),'2');
  await React.act(async()=>app.unmount());app=createRoot(document.getElementById('root'));await React.act(async()=>mount());assert.equal(active(),'2');assert.equal(document.querySelector('[name=date]').value,'1990-01-01');assert.equal(document.querySelector('[name=name]').value,'테스트');assert.equal(document.querySelector('[name=calendar]').value,'lunar_leap');assert.equal(document.querySelector('input[type=checkbox]').checked,true);
  await React.act(async()=>app.unmount());window.history.replaceState(null,'','/yeongnyangi/fortune/?domain=vedic');app=createRoot(document.getElementById('root'));await React.act(async()=>mount());assert.equal(document.querySelector('[name=name]').value,'','another route does not receive this draft');await React.act(async()=>app.unmount());window.history.replaceState(null,'','/yeongnyangi/fortune/?flow=question');globalThis.__profileTest.account='toss-B';app=createRoot(document.getElementById('root'));await React.act(async()=>mount());assert.equal(active(),'0');assert.equal(document.querySelector('[name=name]').value,'');
  await React.act(async()=>app.unmount());globalThis.__profileTest.account='toss-A';app=createRoot(document.getElementById('root'));await React.act(async()=>mount());await React.act(async()=>submit());await React.act(async()=>submit());
  assert.ok(saved,JSON.stringify({active:active(),text:document.body.textContent,requests}));assert.equal(saved.profileId,'saved');assert.equal(requests.length,1);const payload=JSON.parse(requests[0].init.body).profile;assert.equal(payload.birth.calType,'lunar_leap');assert.equal(payload.birth.year,1990);assert.equal(payload.birth.timeUnknown,true);assert.equal(payload.birth.hour,null);assert.equal(payload.name,'테스트');assert.deepEqual(payload.location,{label:'일본 도쿄',tz:'Asia/Tokyo',lat:35.68,lng:139.76});
  assert.equal([...Array(window.sessionStorage.length)].map((_,i)=>window.sessionStorage.key(i)).filter(key=>key.includes('toss-A')&&key.includes(encodeURIComponent('/yeongnyangi/fortune/?flow=question'))).length,0,'successful save clears only this account draft');
 }finally{await React.act(async()=>app.unmount());dom.window.close();delete globalThis.__profileTest;}
});
