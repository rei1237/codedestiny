import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';
const html=fs.readFileSync('vedic-astrology.html','utf8');
function fn(name,next){const start=html.indexOf('async function '+name+'(');const end=html.indexOf('\nfunction '+next+'(',start);assert.ok(start>0&&end>start);return html.slice(start,end);}
function fixture(status=200){
 const state={question:'A single question',latitude:'37.5',longitude:'127',inFlight:false,prompt:'old',order:{orderId:'old'}};
 const requests=[],ctx={state,console,vedicPrashnaEnsureState:()=>state,vedicPrashnaValidateClient:()=>'',vedicPrashnaRefreshUi:()=>{},vedicPrashnaReadAuthHeaders:()=>({Authorization:'Bearer mocked'}),vedicPrashnaLoginPrompt:()=>{ctx.login=true;},vedicPrashnaSetStatus:(s,e)=>{state.statusMessage=s;state.statusError=e;},vedicPrashnaTrack:()=>{},fetch:async(url,init)=>{requests.push({url,init});return{ok:status===200,status,json:async()=>status===200?{snapshot:{question:'Q'},result:{promptText:'free result',chart:{lagna:1}}}:{code:status===401?'AUTH_REQUIRED':'UNAVAILABLE',message:'try again'}};}};
 vm.createContext(ctx);vm.runInContext(fn('vedicPrashnaCreateSnapshot','vedicPrashnaCloseConfirm'),ctx);return{ctx,state,requests};
}
test('Vedic deterministic prompt uses free endpoint with no new paid order',async()=>{
 const f=fixture();assert.equal(await f.ctx.vedicPrashnaCreateSnapshot(),true);assert.equal(f.requests.length,1);assert.equal(f.requests[0].url,'/api/fortune/vedic/prashna/free');assert.equal(f.state.prompt,'free result');assert.equal(f.state.order,null);assert.equal(f.state.confirmOpen,false);assert.equal(f.state.inFlight,false);assert.deepEqual(Object.keys(JSON.parse(f.requests[0].init.body)),['question','latitude','longitude']);
});
test('free prompt preserves sign-in errors and rejects repeated clicks',async()=>{
 const f=fixture(401);await f.ctx.vedicPrashnaCreateSnapshot();assert.equal(f.ctx.login,true);assert.equal(f.state.statusError,true);assert.equal(f.state.inFlight,false);f.state.inFlight=true;assert.equal(await f.ctx.vedicPrashnaCreateSnapshot(),false);assert.equal(f.requests.length,1);
});
test('free prompt failure stays retryable without billing and past paid resume is retained',async()=>{
 const f=fixture(503);await f.ctx.vedicPrashnaCreateSnapshot();assert.equal(f.state.prompt,'');assert.equal(f.state.order,null);assert.equal(f.state.inFlight,false);assert.match(html,/async function vedicPrashnaConfirmGenerateCore\(resumeGate\)/);assert.match(html,/fetch\('\/api\/fortune\/vedic\/prashna\/generate'/);assert.match(html,/runVedicPrashnaResume/);
});
test('standalone Vedic loads canonical policy before pricing and offers free basic/compatibility',()=>{
 assert.ok(html.indexOf('/js/core/free-fortune-policy.js')<html.indexOf('/js/core/feature-pricing-store.js'));
 const basic=html.slice(html.indexOf('function _vedicBasicIsUnlocked'),html.indexOf('function _vedicBasicLockCard'));
 assert.match(basic,/cdIsFreeFortuneFeatureKey\(VEDIC_BASIC_FEATURE_KEY\)/);
 const compat=html.slice(html.indexOf('async function _vedicCompatCoinGate'),html.indexOf('async function doCompatCalc'));
 assert.ok(compat.indexOf("cdIsFreeFortuneFeatureKey('vedic-compatibility-per-use')")<compat.indexOf('_cdCoinGatePerUse'));
 assert.match(compat,/fetch\('\/api\/auth\/me'/);assert.match(compat,/credentials:'include'/);
});
const hook=fs.readFileSync('app/hooks/useCoinGate.ts','utf8');
const start=hook.indexOf('      const publicFeatureKey');const end=hook.indexOf('      /*',start);const branch=hook.slice(start,end);
async function runBranch(featureKey,onPaid){const ctx={input:{featureKey,onPaid},toText:v=>String(v||''),isFreeFortuneFeatureKey,setPaymentMessage:()=>{},coinGateText:k=>k};vm.createContext(ctx);vm.runInContext(ts.transpileModule('async function run(){'+branch+'return {code:"PAID_PATH"};}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);return ctx.run();}
test('React public branch executes content without payment evidence; paid exceptions stay paid',async()=>{
 let execution;const out=await runBranch('nakshatra-lord-report',async c=>{execution=c;});assert.equal(out.code,'PUBLIC_READING');assert.equal(execution.accessSource,'free');assert.equal(execution.transactionId,'');assert.equal(execution.chargedCoins,0);
 for(const key of ['section_summary','section_daewun','nakshatra-ai-consultation','saju_lifetime_bundle'])assert.equal((await runBranch(key)).code,'PAID_PATH',key);
 assert.ok(hook.indexOf('code: "AUTH_REQUIRED"')<start);assert.ok(start<hook.indexOf('checkoutEntry.consumePaidGrantReceipt',start));
});
test('React public content failure never triggers a refund or paid success',async()=>{const out=await runBranch('nakshatra-vvip-codex',async()=>{throw new Error('retry');});assert.equal(out.ok,false);assert.equal(out.code,'FEATURE_EXECUTION_FAILED');assert.equal(out.refunded,false);assert.equal(out.chargedCoins,0);});

test('Play display resolves approved free products without requesting a SKU',async()=>{
 const context={cdIsFreeFortuneFeatureKey:isFreeFortuneFeatureKey,__cdAppContext:{isApp:()=>true},Capacitor:{getPlatform:()=> 'android'}};
 context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('js/core/play-display-price.js','utf8'),context);
 const result=await context.__cdPlayDisplayPrice.read({featureKey:'nakshatra-muhurta'},()=>{throw new Error('must not fetch a SKU');});
 assert.equal(result.freeInApp,true);assert.equal(result.accessSource,'public');
});
test('home descriptions and current catalog do not sell approved free calculations',()=>{
 const shell=fs.readFileSync('index.html','utf8');
 assert.doesNotMatch(shell,/기본 출생차트 무료 · 시너스트리 궁합 5,000원|명반 무료 · 해석 5,000원 · 궁합 5,000원/);
 const context={window:{}};vm.runInNewContext(fs.readFileSync('js/core/service-registry.js','utf8'),context);
 for(const item of context.window.__cdServiceRegistry)if(isFreeFortuneFeatureKey(item.featureKey))assert.equal(item.price,'무료',item.featureKey);
});

test('free Vedic compatibility admits cookie sessions and keeps guests out without billing',async()=>{
 const start=html.indexOf('async function _vedicCompatCoinGate(');const end=html.indexOf('\nasync function doCompatCalc(',start);let status=200,logins=0,calls=0;
 const ctx={window:{cdIsFreeFortuneFeatureKey:isFreeFortuneFeatureKey,alert:()=>{}},vedicPrashnaReadAuthHeaders:()=>({}),vedicPrashnaLoginPrompt:()=>{logins++;},fetch:async(url,init)=>{calls++;assert.equal(url,'/api/auth/me');assert.equal(init.credentials,'include');return{ok:status===200,status};}};
 vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);assert.equal(await ctx._vedicCompatCoinGate(50,'test',null),true);status=401;assert.equal(await ctx._vedicCompatCoinGate(50,'test',null),false);assert.equal(logins,1);assert.equal(calls,2);
});
