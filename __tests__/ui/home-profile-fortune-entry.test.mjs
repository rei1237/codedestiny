import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source=readFileSync('js/destiny-profile.js','utf8');
function setup({session=false,server=null}={}){
 const events={},state=new Map(),opened=[],synced=[];
 let profile=null,creates=0,loads=0;
 const ctx={DPStorage:{current:()=>profile},_dpProfileSaveInFlight:false,sessionStorage:{setItem:(k,v)=>state.set(k,v),removeItem:k=>state.delete(k),getItem:k=>state.get(k)},document:{addEventListener:(n,fn)=>events[n]=fn},window:{addEventListener:(n,fn)=>events[n]=fn,_dpOpenFortuneType:t=>opened.push(t),dpStartProfileCreate:()=>creates++},_dpResolveCurrentProfileForSaju:()=>profile,_dpHasValidProfileDate:(y,m,d)=>!!(y&&m&&d),_dpSyncProfileFormToCurrent:p=>synced.push(p),_toast(){},_dpHasSessionHint:()=>session,_dpLoadFromServer:cb=>{loads++;if(server)profile=server;cb(!!server);}};
 vm.runInNewContext(source.slice(source.indexOf("  var _dpHomeEntryKey ="),source.indexOf("  window.cdOneStepFreeSajuEntry =")),ctx);
 return {ctx,events,state,opened,synced,setProfile:p=>profile=p,creates:()=>creates,loads:()=>loads};
}
test('five birth services directly use the selected profile, without landing detours',()=>{
 for(const type of ['saju','ziwei','sukuyo','vedic','astro']){
  const h=setup();h.setProfile({birth:{year:1990,month:1,day:1}});h.ctx.window.cdHomeFortuneEntry(type);
  assert.deepEqual(h.opened,[type]);assert.equal(h.synced.length,1);assert.equal(h.creates(),0);
 }
});
test('missing profile resumes selected service after save, once',()=>{
 const h=setup();h.ctx.window.cdHomeFortuneEntry('ziwei');assert.equal(h.creates(),1);assert.equal(h.opened.length,0);
 h.setProfile({birth:{year:1990,month:1}});h.events.destinyProfileChanged();assert.equal(h.opened.length,0);
 h.setProfile({birth:{year:1990,month:1,day:1}});h.events.destinyProfileChanged();h.events['cd:destiny-profile-server-ready']();assert.deepEqual(h.opened,['ziwei']);
});

// 2026-11-12 홈 무료 타일 회귀: 저장 프로필이 있는 로그인 사용자에게 '프로필을 설정해 주세요'가 떴다.
test('logged-in tap with an empty local cache loads the server profile before prompting',()=>{
 const h=setup({session:true,server:{birth:{year:1990,month:1,day:1}}});h.ctx.window.cdHomeFortuneEntry('sukuyo');
 assert.equal(h.loads(),1);assert.deepEqual(h.opened,['sukuyo']);assert.equal(h.creates(),0);assert.equal(h.state.size,0);
 const none=setup({session:true});none.ctx.window.cdHomeFortuneEntry('vedic');
 assert.equal(none.loads(),1);assert.equal(none.creates(),1);assert.deepEqual(none.opened,[]);
});
test('a pending card with a valid birth date opens directly and resumes an intent',()=>{
 const h=setup({session:true});h.setProfile({birth:{year:1990,month:1,day:1},syncStatus:'pending'});h.ctx.window.cdHomeFortuneEntry('astro');
 assert.deepEqual(h.opened,['astro']);assert.equal(h.loads(),0);assert.equal(h.creates(),0);
 const r=setup();r.ctx.window.cdHomeFortuneEntry('ziwei');r.setProfile({birth:{year:1990,month:1,day:1},syncStatus:'pending'});r.events.destinyProfileChanged();assert.deepEqual(r.opened,['ziwei']);
});
test('a tap after the server profile loaded opens without another round trip',()=>{
 const h=setup({session:true});h.setProfile({birth:{year:1990,month:1,day:1},syncStatus:'synced'});h.ctx.window.cdHomeFortuneEntry('ziwei');
 assert.deepEqual(h.opened,['ziwei']);assert.equal(h.loads(),0);assert.equal(h.creates(),0);
});
test('tarot needs no birth card; home navigation cancels an unfinished entry',()=>{
 const h=setup();h.ctx.window.cdHomeFortuneEntry('vedic');h.ctx.window.cdHomeFortuneEntry('tarot');assert.deepEqual(h.opened,['tarot']);assert.equal(h.state.size,0);
 h.ctx.window.cdHomeFortuneEntry('astro');h.events.click({target:{closest:()=>true}});h.setProfile({birth:{year:1990,month:1,day:1}});h.events.destinyProfileChanged();assert.deepEqual(h.opened,['tarot']);
});

test('home tarot opens the existing draw on the first tap without a profile',()=>{
 const h=setup();h.ctx.window.cdHomeTarotEntry();
 assert.deepEqual(h.opened,['tarot']);assert.equal(h.creates(),0);
});

test('returning from profile entry cancels the pending service before a later save',()=>{
 const h=setup();h.ctx.window.cdHomeFortuneEntry('vedic');
 h.events.click({button:0,defaultPrevented:true,target:{closest:selector=>selector.includes('[data-cdh-input-return]')}});
 assert.equal(h.state.size,0);
 h.setProfile({birth:{year:1990,month:1,day:1}});h.events.destinyProfileChanged();
 assert.deepEqual(h.opened,[]);
});

test('blocked session storage still resumes the chosen feature in memory',()=>{
 const h=setup();h.ctx.sessionStorage.getItem=()=>{throw Error('blocked')};h.ctx.sessionStorage.setItem=()=>{throw Error('blocked')};
 h.ctx.window.cdHomeFortuneEntry('ziwei');h.setProfile({birth:{year:1990,month:1,day:1}});h.events.destinyProfileChanged();
 assert.deepEqual(h.opened,['ziwei']);
});


test('optimistic create does not consume the selected feature before authenticated save',()=>{
 const h=setup();h.ctx.window.cdHomeZiweiEntry();h.ctx._dpProfileSaveInFlight=true;
 h.setProfile({birth:{year:1990,month:1,day:1},syncStatus:'pending'});h.events.destinyProfileChanged();
 assert.deepEqual(h.opened,[]);
 assert.equal(h.ctx._dpHomeEntryReturnPath(),'/ggulggul/?action=cdHomeZiweiEntry');
 h.ctx._dpProfileSaveInFlight=false;h.setProfile({birth:{year:1990,month:1,day:1},syncStatus:'synced'});
 h.events.destinyProfileChanged();h.events.destinyProfileChanged();assert.deepEqual(h.opened,['ziwei']);
});
test('login return permits only known feature actions and preserves saju subsection',()=>{
 const h=setup();h.ctx._dpHomeIntent('saju');h.ctx._dpHomeSection='terms24Card';
 assert.equal(h.ctx._dpHomeEntryReturnPath(),'/ggulggul/?action=cdOneStepFreeSajuEntry&section=terms24Card');
 h.ctx._dpHomeIntent('https://outside.invalid');assert.equal(h.ctx._dpHomeEntryReturnPath(),'/');
});

test('a stale guest cache cannot open a birth modal after login without a saved profile',()=>{
 const h=setup({session:true});
 h.ctx._dpResolveCurrentProfileForSaju=()=>({birth:{year:1990,month:1,day:1}});
 h.ctx.window.cdHomeZiweiEntry();
 assert.deepEqual(h.opened,[]);assert.equal(h.creates(),1);
 assert.equal(h.ctx._dpHomeEntryReturnPath(),'/ggulggul/?action=cdHomeZiweiEntry');
 h.setProfile({birth:{year:1990,month:1,day:1}});h.events.destinyProfileChanged();
 assert.deepEqual(h.opened,['ziwei']);
});
