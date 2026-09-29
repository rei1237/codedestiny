import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {sliceFunction} from '../../scripts/lib/js-source-slice.mjs';
const source=readFileSync('js/saju-engine.js','utf8');
function fixture(status='guest') {
 const data=new Map(), fields=Object.fromEntries(['nameInput','birthDate','birthHour','birthMinute','birthTimeText','birthCountry','birthCountryInput'].map(id=>[id,{value:''}]));
 Object.assign(fields.birthDate,{value:'19900515'});fields.birthHour.value='12';fields.birthMinute.value='0';
 const radios=[{value:'solar',checked:true},{value:'lunar',checked:false}];
 const calls={modal:0,calculation:0,status:[],events:[]};
 const context={Date,Number,JSON,Promise,GENDER:'F',location:{pathname:'/ggulggul/',search:''},sessionStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},document:{getElementById:id=>fields[id],querySelector:()=>radios.find(r=>r.checked),querySelectorAll:()=>radios},setGender:g=>context.GENDER=g,setSajuFormStatus:m=>calls.status.push(m),getSajuReturnPath:()=>'/ggulggul/',startSajuCalculationFlow:async()=>calls.calculation++,window:{__cdBirthTimeUnknown:true,__dpVerifyResultSession:async()=>status,__cdOpenLoginRequiredModal:()=>calls.modal++,cdTrack:n=>calls.events.push(n)}};
 context.URL=URL;context.window.location={origin:'https://example.test'};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('var SAJU_LOGIN_DRAFT_KEY'),source.indexOf('function redirectToPointRecharge')),context);
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
 const context={ensureSajuResultSession:async()=>false,document:{getElementById:()=>{throw Error('result touched before login');}}};vm.createContext(context);vm.runInContext(sliceFunction(source,'async function calculate(){'),context);await context.calculate();
});
test('storage failure keeps input on screen and does not navigate',async()=>{
 const f=fixture();f.context.sessionStorage.setItem=()=>{throw Error('blocked');};assert.equal(await f.context.ensureSajuResultSession(),false);assert.equal(f.calls.modal,0);assert.match(f.calls.status[0],/임시 보관하지 못/);
});
