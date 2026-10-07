import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source=readFileSync('js/destiny-profile.js','utf8');
function setup(){
 const events={},state=new Map(),opened=[],synced=[];
 let profile=null,creates=0;
 const ctx={sessionStorage:{setItem:(k,v)=>state.set(k,v),removeItem:k=>state.delete(k),getItem:k=>state.get(k)},document:{addEventListener:(n,fn)=>events[n]=fn},window:{addEventListener:(n,fn)=>events[n]=fn,_dpOpenFortuneType:t=>opened.push(t),dpStartProfileCreate:()=>creates++},_dpResolveCurrentProfileForSaju:()=>profile,_dpHasValidProfileDate:(y,m,d)=>!!(y&&m&&d),_dpSyncProfileFormToCurrent:p=>synced.push(p),_toast(){}};
 vm.runInNewContext(source.slice(source.indexOf("  var _dpHomeEntryKey ="),source.indexOf("  window.cdOneStepFreeSajuEntry =")),ctx);
 return {ctx,events,state,opened,synced,setProfile:p=>profile=p,creates:()=>creates};
}
test('five birth services directly use the selected profile, without landing detours',()=>{
 for(const type of ['saju','ziwei','sukuyo','vedic','astro']){
  const h=setup();h.setProfile({birth:{year:1990,month:1,day:1}});h.ctx.window.cdHomeFortuneEntry(type);
  assert.deepEqual(h.opened,[type]);assert.equal(h.synced.length,1);assert.equal(h.creates(),0);
 }
});
test('missing profile resumes selected service only after confirmed save, once',()=>{
 const h=setup();h.ctx.window.cdHomeFortuneEntry('ziwei');assert.equal(h.creates(),1);assert.equal(h.opened.length,0);
 h.setProfile({birth:{year:1990,month:1,day:1},syncStatus:'pending'});h.events.destinyProfileChanged();assert.equal(h.opened.length,0);
 h.setProfile({birth:{year:1990,month:1,day:1}});h.events.destinyProfileChanged();h.events['cd:destiny-profile-server-ready']();assert.deepEqual(h.opened,['ziwei']);
});
test('tarot needs no birth card; home navigation cancels an unfinished entry',()=>{
 const h=setup();h.ctx.window.cdHomeFortuneEntry('vedic');h.ctx.window.cdHomeFortuneEntry('tarot');assert.deepEqual(h.opened,['tarot']);assert.equal(h.state.size,0);
 h.ctx.window.cdHomeFortuneEntry('astro');h.events.click({target:{closest:()=>true}});h.setProfile({birth:{year:1990,month:1,day:1}});h.events.destinyProfileChanged();assert.deepEqual(h.opened,['tarot']);
});
