import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const bundle=await build({entryPoints:['js/activation-entry.mjs'],bundle:true,write:false,format:'iife',platform:'browser'});
const source=bundle.outputFiles[0].text;
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setTimeout(resolve,0));};
function setup(){
 const dom=new JSDOM('<html lang="ko"><body></body></html>',{url:'https://example.com/ggulggul/',runScripts:'outside-only'}),win=dom.window;
 const reward={ok:true,accountId:'own-account',tutorial:{eligible:true},wallet:{balance:0}},school={ok:true,eligibleEmail:false,features:[],unlockedFeatureKeys:[]};
 let resolveStatus;const status=new Promise(resolve=>{resolveStatus=resolve;});const calls=[];
 win.__cdDestinyProfileServerReady=true;win._sajuPromptResolveProfileId=()=> 'own-profile';
 win.fetchJsonWithAuth=async(url,init)=>{calls.push({url,body:init.body});const data=url.endsWith('/status')&&!url.includes('/snu/')?await status:url.endsWith('/tutorial/start')?{...reward,tutorial:{eligible:true,receipt:{status:'started'}}}:school;return {ok:true,payload:data};};
 win.eval(source);return{dom,win,calls,release:()=>resolveStatus(reward)};
}
test('free saju completed before status finishes still offers the tutorial reward',async()=>{
 const {dom,win,calls,release}=setup();win.dispatchEvent(new win.Event('cd:saju-summary-ready'));assert.equal(calls.filter(x=>x.url.endsWith('/tutorial/start')).length,0);
 release();await flush();const requests=calls.filter(x=>x.url.endsWith('/tutorial/start'));assert.equal(requests.length,1);assert.equal(JSON.parse(requests[0].body).profileId,'own-profile');assert.match(win.document.getElementById('cdActivationGuide').textContent,/월정석 선물 받기/);dom.window.close();
});
test('logout discards pending tutorial profile, late state, and private result popup',async()=>{
 const {dom,win,calls,release}=setup();win.dispatchEvent(new win.Event('cd:saju-summary-ready'));
 const dialog=win.document.createElement('dialog');dialog.className='cd-activation-dialog';win.document.body.append(dialog);
 win.dispatchEvent(new win.CustomEvent('cd:auth-changed',{detail:{event:'logout'}}));release();await flush();assert.equal(calls.filter(x=>x.url.endsWith('/tutorial/start')).length,0);assert.equal(win.document.querySelector('.cd-activation-dialog'),null);assert.equal(win.document.getElementById('cdActivationGuide'),null);dom.window.close();
});
