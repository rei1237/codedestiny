import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {sliceFunction} from '../../scripts/lib/js-source-slice.mjs';
import * as core from '../../lib/korean-calendar/index.js';
import * as runtime from '../../worker/yeongnyangi/fortune/saju-runtime.mjs';
const source=fs.readFileSync('js/saju-engine.js','utf8');
function fixture(){
 const context={window:{},console,Date,Number,String,Object,Math,KasiEngine:{lunarToSolar:core.lunarToSolar},...runtime,
  _koreanCalendar:()=>core,attachKasiDaewunBridge:()=>{},resetEvalDaewunMemo:()=>{},_syncDestinyFlowerSajuSnapshot:()=>{},
  GAN:Object.fromEntries([...core.STEM_HANJA].map(k=>[k,{}])),JI:Object.fromEntries([...core.BRANCH_HANJA].map(k=>[k,{}])),G_JONG_VERIFIED:null,GENDER:'F'};
 vm.createContext(context);
 vm.runInContext(sliceFunction(source,'function _cdNatalBazi('),context);
 vm.runInContext(sliceFunction(source,'function _jongVerifiedKey('),context);
 const start=source.indexOf('window.computeProfileForModal = function(profile)');const end=source.indexOf('\n};',start)+3;
 vm.runInContext(source.slice(start,end),context);return context;
}
test('saved profile modal and its derived globals share corrected day/hour, raw time retained',()=>{
 const c=fixture(),profile={birth:{year:1988,month:1,day:7,hour:23,minute:26,calType:'solar'},location:{lat:37.5665,lng:126.978,tz:'Asia/Seoul'},gender:'F'};
 const original=JSON.stringify(profile),result=c.window.computeProfileForModal(profile);
 assert.ok(result);assert.equal(result.p.d.g+result.p.d.j,'辛酉');assert.equal(result.p.h.g+result.p.h.j,'己亥');
 assert.equal(c.G_BAZI.getDayGan()+c.G_BAZI.getDayZhi(),'辛酉');assert.equal(c.window._astroBirth.hour,23);assert.equal(JSON.stringify(profile),original);
 assert.equal(c.window.__cdSajuCalculationMeta.corrected.hour,22);
});
test('lunar profile restore converts exactly once and unknown time leaves no hour pillar',()=>{
 const c=fixture(),p={birth:{year:1987,month:11,day:18,hour:23,minute:26,calType:'lunar'},location:{lat:37.5665,lng:126.978,tz:'Asia/Seoul'}};
 const r=c.window.computeProfileForModal(p);assert.equal(r.p.d.g+r.p.d.j,'辛酉');assert.equal(r.p.h.g+r.p.h.j,'己亥');
 p.birth.timeUnknown=true;const unknown=c.window.computeProfileForModal(p);assert.equal(unknown.p.h.g,'');assert.equal(unknown.p.h.j,'');
});
