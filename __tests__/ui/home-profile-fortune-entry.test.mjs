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

test('home tarot opens the mobile service library instead of the basic draw modal',()=>{
 const h=setup(),libraries=[];
 h.ctx.document.getElementById=()=>({});
 h.ctx.window.cdMobileCollectionFullscreen={open:id=>libraries.push(id),isOpen:()=>true};
 h.ctx.window.cdHomeTarotEntry();
 assert.deepEqual(libraries,['tarotCollection']);assert.deepEqual(h.opened,[]);assert.equal(h.creates(),0);
});

test('desktop library unfolds the garden without closing an already open collection',()=>{
 const h=setup();let open=false,toggles=0,garden=0,scroll=0;
 const collection={getAttribute:()=>String(open),querySelector:()=>({click:()=>{toggles++;open=true;}}),scrollIntoView:()=>scroll++};
 h.ctx.document.getElementById=()=>collection;
 h.ctx.window.cdMobileCollectionFullscreen={open:()=>{},isOpen:()=>false};
 h.ctx.window.__cdOpenGarden=()=>garden++;h.ctx.window.requestAnimationFrame=fn=>fn();
 h.ctx.window.cdHomeTarotEntry();h.ctx.window.cdHomeTarotEntry();
 assert.equal(garden,2);assert.equal(toggles,1);assert.equal(scroll,2);assert.deepEqual(h.opened,[]);
});
