import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const bundle=await build({entryPoints:['js/activation-entry.mjs'],bundle:true,write:false,format:'iife',platform:'browser'});
const source=bundle.outputFiles[0].text;
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setTimeout(resolve,0));};
function setup(overrides={}){
 const dom=new JSDOM('<html lang="ko"><body></body></html>',{url:'https://example.com/ggulggul/',runScripts:'outside-only'}),win=dom.window;
 const reward={ok:true,accountId:'own-account',tutorial:{eligible:true,guideEligible:true},wallet:{balance:0},...overrides},school={ok:true,eligibleEmail:false,features:[],unlockedFeatureKeys:[]};
 let resolveStatus;const status=new Promise(resolve=>{resolveStatus=resolve;});const calls=[];
 win.__cdDestinyProfileServerReady=true;win._sajuPromptResolveProfileId=()=> 'own-profile';
 win.fetchJsonWithAuth=async(url,init)=>{calls.push({url,body:init.body});const data=url.endsWith('/status')&&!url.includes('/snu/')?await status:url.endsWith('/tutorial/start')?{...reward,tutorial:{eligible:true,receipt:{status:'started'}}}:school;return {ok:true,payload:data};};
 win.eval(source);return{dom,win,calls,reward,release:()=>resolveStatus(reward)};
}
test('free saju before status finishes records the tutorial without repeating the invitation',async()=>{
 const {dom,win,calls,release}=setup();win.dispatchEvent(new win.Event('cd:saju-summary-ready'));assert.equal(calls.filter(x=>x.url.endsWith('/tutorial/start')).length,0);
 release();await flush();const requests=calls.filter(x=>x.url.endsWith('/tutorial/start'));assert.equal(requests.length,1);assert.equal(JSON.parse(requests[0].body).profileId,'own-profile');assert.equal(win.document.getElementById('cdActivationGuide'),null);dom.window.close();
});

test('eligible newcomers can hide the invitation for today across refresh events',async()=>{
 const {dom,win,release}=setup();release();await flush();
 const guide=win.document.getElementById('cdActivationGuide');assert.match(guide.textContent,/무료 사주/);
 const button=guide.querySelector('button');assert.equal(button.textContent,'오늘 하루 보지 않기');button.click();
 win.dispatchEvent(new win.Event('cd:destiny-profile-server-ready'));await flush();assert.equal(win.document.getElementById('cdActivationGuide'),null);
 assert.ok(Number(win.localStorage.getItem('cd:activation-guide:hidden-until:own-account'))>Date.now());dom.window.close();
});

for(const tutorial of [
 {eligible:true,guideEligible:false,receipt:{status:'started'}},
 {eligible:false,guideEligible:false,receipt:{status:'granted'}},
 {eligible:false,guideEligible:false,legacySignupReceived:true},
 {eligible:true,guideEligible:false},
 {eligible:true},
])test('ineligible or unconfirmed state never falls back to a wallet promotion '+JSON.stringify(tutorial),async()=>{
 const {dom,win,release}=setup({tutorial,wallet:{balance:500}});release();await flush();assert.equal(win.document.getElementById('cdActivationGuide'),null);dom.window.close();
});

test('a reward update removes an already visible invitation',async()=>{
 const {dom,win,release,reward}=setup();release();await flush();assert.ok(win.document.getElementById('cdActivationGuide'));
 reward.tutorial={eligible:false,guideEligible:false,receipt:{status:'granted'}};
 win.dispatchEvent(new win.Event('cd:activation-reward-updated'));assert.equal(win.document.getElementById('cdActivationGuide'),null);
 await flush();assert.equal(win.document.getElementById('cdActivationGuide'),null);dom.window.close();
});
test('logout discards pending tutorial profile, late state, and private result popup',async()=>{
 const {dom,win,calls,release}=setup();win.dispatchEvent(new win.Event('cd:saju-summary-ready'));
 const dialog=win.document.createElement('dialog');dialog.className='cd-activation-dialog';win.document.body.append(dialog);
 win.dispatchEvent(new win.CustomEvent('cd:auth-changed',{detail:{event:'logout'}}));release();await flush();assert.equal(calls.filter(x=>x.url.endsWith('/tutorial/start')).length,0);assert.equal(win.document.querySelector('.cd-activation-dialog'),null);assert.equal(win.document.getElementById('cdActivationGuide'),null);dom.window.close();
});
