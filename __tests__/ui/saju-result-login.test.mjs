import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {sliceFunction} from '../../scripts/lib/js-source-slice.mjs';
const source=readFileSync('js/saju-engine.js','utf8');
// 기존 계약(로그인 벽)은 플래그를 끈 원본 동작으로 고정한다. 켠 동작(W2 비회원 무료 결과)은 아래 별도 테스트.
function fixture(status='guest',guestEnabled=false) {
 const data=new Map(), fields=Object.fromEntries(['nameInput','birthDate','birthHour','birthMinute','birthTimeText','birthCountry','birthCountryInput'].map(id=>[id,{value:''}]));
 Object.assign(fields.birthDate,{value:'19900515'});fields.birthHour.value='12';fields.birthMinute.value='0';
 const radios=[{value:'solar',checked:true},{value:'lunar',checked:false}];
 const calls={modal:0,calculation:0,status:[],events:[]};
 const context={Date,Number,JSON,Promise,GENDER:'F',location:{pathname:'/ggulggul/',search:''},sessionStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},document:{getElementById:id=>fields[id],querySelector:()=>radios.find(r=>r.checked),querySelectorAll:()=>radios},setGender:g=>context.GENDER=g,setSajuFormStatus:m=>calls.status.push(m),getSajuReturnPath:()=>'/ggulggul/',startSajuCalculationFlow:async()=>calls.calculation++,window:{__cdBirthTimeUnknown:true,__dpVerifyResultSession:async()=>status,__cdOpenLoginRequiredModal:()=>calls.modal++,cdTrack:n=>calls.events.push(n)}};
 context.setTimeout=setTimeout;context.clearTimeout=clearTimeout;context.URL=URL;context.window.location={origin:'https://example.test'};
 vm.createContext(context);
 vm.runInContext(sliceFunction(source,'function _sajuCalculationWait('),context);
 vm.runInContext(source.slice(source.indexOf('var SAJU_LOGIN_DRAFT_KEY'),source.indexOf('function redirectToPointRecharge')),context);
 context.FREE_RESULT_GUEST_ENABLED=guestEnabled;
 return {context,calls,data,fields,radios};
}
test('guest cannot proceed and draft retains unknown time without personal data in return URL',async()=>{
 const f=fixture();assert.equal(await f.context.ensureSajuResultSession(),false);assert.equal(f.calls.modal,1);
 const draft=JSON.parse([...f.data.values()][0]);assert.equal(draft.fields.birthDate,'19900515');assert.equal(draft.timeUnknown,true);assert.equal(draft.path,'/ggulggul/');
});
test('verified user proceeds without modal or storing a draft',async()=>{
 const f=fixture('authenticated');assert.equal(await f.context.ensureSajuResultSession(),true);assert.equal(f.calls.modal,0);assert.equal(f.data.size,0);
});
test('unavailable auth blocks results without redirect or treating it as logout',async()=>{
 const f=fixture('unavailable');assert.equal(await f.context.ensureSajuResultSession(),false);assert.equal(f.calls.modal,0);assert.match(f.calls.status[0],/확인하지 못/);
});
test('cancelled login restores input without reopening modal; verified return resumes',async()=>{
 const f=fixture();await f.context.ensureSajuResultSession();f.fields.birthDate.value='';await f.context.restoreSajuLoginDraft();assert.equal(f.fields.birthDate.value,'19900515');assert.equal(f.calls.modal,1);assert.equal(f.calls.calculation,0);
 f.context.window.__dpVerifyResultSession=async()=>'authenticated';await f.context.restoreSajuLoginDraft();assert.equal(f.calls.calculation,1);
});
test('expired or wrong-route drafts never resume',async()=>{
 const f=fixture();f.context.saveSajuLoginDraft();f.context.location.pathname='/other/';await f.context.restoreSajuLoginDraft();assert.equal(f.calls.calculation,0);
 f.context.location.pathname='/ggulggul/';const key=[...f.data.keys()][0],draft=JSON.parse(f.data.get(key));draft.savedAt=Date.now()-3600001;f.data.set(key,JSON.stringify(draft));await f.context.restoreSajuLoginDraft();assert.equal(f.data.size,0);
});
test('direct calculate cannot bypass the gate',async()=>{
 const context={setTimeout,clearTimeout,ensureSajuResultSession:async()=>false,document:{getElementById:()=>{throw Error('result touched before login');}}};vm.createContext(context);vm.runInContext(sliceFunction(source,'function _sajuCalculationWait(')+sliceFunction(source,'async function calculate(run){'),context);await context.calculate();
});
test('storage failure keeps input on screen and does not navigate',async()=>{
 const f=fixture();f.context.sessionStorage.setItem=()=>{throw Error('blocked');};assert.equal(await f.context.ensureSajuResultSession(),false);assert.equal(f.calls.modal,0);assert.match(f.calls.status[0],/임시 보관하지 못/);
});
test('W2 flag: static constant matches lib/guided-flow/flags.mjs',async()=>{
 const flags=await import('../../lib/guided-flow/flags.mjs');
 const m=source.match(/^var FREE_RESULT_GUEST_ENABLED = (true|false);$/m);
 assert.ok(m,'static flag is a plain boolean constant');assert.equal(m[1]==='true',flags.FREE_RESULT_GUEST_ENABLED);
});
test('W2 flag ON: guest sees the free result without login modal, event or draft',async()=>{
 const f=fixture('guest',true);assert.equal(await f.context.ensureSajuResultSession(),true);
 assert.equal(f.calls.modal,0);assert.equal(f.data.size,0);assert.deepEqual(f.calls.events,[]);assert.equal(f.context.sajuResultSessionStatus,'guest');
});
test('W2 flag ON: unavailable auth still opens the client-side free result; authenticated unchanged',async()=>{
 const u=fixture('unavailable',true);assert.equal(await u.context.ensureSajuResultSession(),true);assert.equal(u.calls.modal,0);assert.deepEqual(u.calls.status,[]);
 const a=fixture('authenticated',true);assert.equal(await a.context.ensureSajuResultSession(),true);assert.equal(a.calls.modal,0);assert.equal(a.data.size,0);assert.equal(a.context.sajuResultSessionStatus,'authenticated');
});
test('W2 flag ON: guest result draft resumes the same result after login, stays silent for guests',async()=>{
 const f=fixture('guest',true);f.context.saveSajuLoginDraft(true);
 const draft=JSON.parse([...f.data.values()][0]);assert.equal(draft.guestResult,true);assert.equal(draft.fields.birthDate,'19900515');
 f.fields.birthDate.value='';await f.context.restoreSajuLoginDraft();
 assert.equal(f.fields.birthDate.value,'19900515');assert.deepEqual(f.calls.status,[]);assert.equal(f.calls.calculation,0);
 f.context.window.__dpVerifyResultSession=async()=>'authenticated';await f.context.restoreSajuLoginDraft();assert.equal(f.calls.calculation,1);
});
test('flag OFF draft has no guestResult marker (original format)',()=>{
 const f=fixture();f.context.saveSajuLoginDraft();assert.equal('guestResult' in JSON.parse([...f.data.values()][0]),false);
});
test('free result flow: guest result keeps a resumable draft only when flag ON; free_saju_started reports real sign-in',()=>{
 const flow=sliceFunction(source,'async function startSajuCalculationFlow() {');
 assert.ok(flow.includes("cdTrack('free_saju_started', { signed_in: sajuResultSessionStatus === 'authenticated' })"));
 assert.ok(flow.replace(/\s+/g,' ').includes("if (FREE_RESULT_GUEST_ENABLED && sajuResultSessionStatus === 'guest') { saveSajuLoginDraft(true); _sajuBindGuestResultLoginReturn(); } else sessionStorage.removeItem(SAJU_LOGIN_DRAFT_KEY);"));
});
test('W2 flag ON: login modal opened over a guest result returns to the free saju entry, otherwise keeps caller path',()=>{
 const f=fixture('guest',true);const seen=[];let display='block';
 f.context.window.__cdOpenLoginRequiredModal=o=>{seen.push(o);return true;};
 f.context.document.getElementById=id=>id==='resultPage'?{style:{display}}:f.fields[id];
 f.context.Object=Object;
 f.context._sajuBindGuestResultLoginReturn();f.context._sajuBindGuestResultLoginReturn();
 f.context.window.__cdOpenLoginRequiredModal({reason:'x',redirectTo:'/ggulggul/'});
 assert.equal(seen[0].nextPath,undefined,'no guest draft: caller path kept');
 f.context.saveSajuLoginDraft(true);f.context.window.__cdOpenLoginRequiredModal({reason:'x',redirectTo:'/ggulggul/'});
 assert.equal(seen[1].nextPath,'/ggulggul/?action=cdOneStepFreeSajuEntry');assert.equal(seen[1].reason,'x');
 display='none';f.context.window.__cdOpenLoginRequiredModal({reason:'y'});assert.equal(seen[2].nextPath,undefined,'result hidden: caller path kept');
});
