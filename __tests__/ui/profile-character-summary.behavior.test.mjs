import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { sliceFunction } from '../../scripts/lib/js-source-slice.mjs';

let sequence = 0;
async function fixture(request) {
  const dom = new JSDOM('<div id="parking"><section data-cd-honey-widget hidden><details class="cdh-honey__details"></details></section></div><div id="dpListSheet" class="dp-sheet--open"><article id="card"><div data-pc-portrait></div><p data-pc-title>일주 캐릭터를 확인하고 있어요.</p><div data-pc-element></div><div data-profile-character></div></article></div>', {url:'https://example.test/ggulggul/'});
  const previous = {window:globalThis.window,document:globalThis.document,AbortController:globalThis.AbortController};
  const { window } = dom;
  globalThis.window = window; globalThis.document = window.document; globalThis.AbortController = window.AbortController;
  window.CdHoney = { refresh(){}, getCatalog:async()=>({products:[]}), getState:()=>({balance:16}) };
  const cardModule = await import('../../js/core/profile-character-card.mjs?summary=' + sequence++);
  const profile = {id:'one',name:'검수',gender:'male',birth:{year:1990,month:1,day:15,timeUnknown:true,calType:'solar'}};
  const root = window.document.getElementById('card');
  let owner = 'account-one';
  return {root,window,profile, module:cardModule, options:{owner:()=>owner, request}, setOwner:value=>{owner=value;},
    close(){window.dispatchEvent(new window.Event('cd:profile-sheet-close'));dom.window.close();Object.assign(globalThis,previous);} };
}
const payload = {ok:true,data:{ok:true,character:{id:'animal-pig',name:'달빛 돼지',ganji:'신해',element:'금'}}};

test('ordinary profile entry resolves the day pillar without fetching pet or collection data', async()=>{
  const calls=[];const f=await fixture(async path=>{calls.push(path);return payload;});
  try {
    await f.module.mountCharacterCard(f.root,f.profile,f.options);
    assert.deepEqual(calls,['/api/rpg/character-preview']);
    assert.equal(f.root.querySelector('[data-pc-title]').textContent,'신해 · 달빛 돼지');
    assert.equal(f.root.querySelector('[data-pc-portrait]').getAttribute('aria-busy'),'false');
    assert.ok(f.root.querySelector('[data-pc-portrait] .pc-sprite'));
    assert.ok(f.root.querySelector('.pc-diary-open[href="/diary/?from=profile"]'));
    assert.equal(f.root.querySelectorAll('[data-cd-honey-widget]').length,1);
    f.window.dispatchEvent(new f.window.CustomEvent('cd:profile-card-before-render',{detail:{root:f.root}}));
    f.root.replaceChildren();
    assert.equal(f.window.document.querySelector('[data-cd-honey-widget]').parentElement.id,'parking');
  } finally {f.close();}
});

test('failed preview ends loading and retry fetches a fresh result',async()=>{
  let attempts=0;const f=await fixture(async()=>++attempts===1?{ok:false,data:{ok:false}}:payload);
  try {
    await f.module.mountCharacterCard(f.root,f.profile,f.options);
    assert.match(f.root.querySelector('[data-pc-title]').textContent,/불러오지 못/);
    assert.equal(f.root.querySelector('[data-pc-portrait]').getAttribute('aria-busy'),'false');
    await f.root.querySelector('[data-pc-retry]').onclick();
    assert.equal(attempts,2);
    assert.match(f.root.querySelector('[data-pc-title]').textContent,/신해/);
  } finally {f.close();}
});

test('incomplete birth information offers the existing profile editor',async()=>{
  const f=await fixture(async()=>({ok:false,data:{ok:false,code:'PROFILE_INCOMPLETE'}}));
  try {
    let edited;f.window.dpEditProfile=id=>{edited=id;};
    await f.module.mountCharacterCard(f.root,f.profile,f.options);
    assert.match(f.root.querySelector('[data-pc-title]').textContent,/보완/);
    f.root.querySelector('[data-pc-retry]').click();assert.equal(edited,'one');
  } finally {f.close();}
});

test('a late preview cannot overwrite the next account or a closed profile',async()=>{
  let release;const f=await fixture(()=>new Promise(resolve=>{release=resolve;}));
  try {
    const pending=f.module.mountCharacterCard(f.root,f.profile,f.options);
    f.setOwner('account-two');
    f.root.querySelector('[data-pc-title]').textContent='새 프로필';
    release(payload);await pending;
    assert.equal(f.root.querySelector('[data-pc-title]').textContent,'새 프로필');
    assert.equal(f.root.querySelector('[data-pc-portrait] .pc-sprite'),null);
  } finally {f.close();}
});

test('honey suggestions use the server catalog and wallet without exposing a spend action',async()=>{
  const f=await fixture(async()=>payload);
  try {
    let balance=16;
    f.window.isTileKeyUnlocked=()=>true; // A temporary free opening is not ownership.
    f.window.CdHoney.getState=()=>({balance});
    f.window.CdHoney.getCatalog=async()=>({products:[
      {productId:'expensive',featureKey:'expensive',title:'관계의 흐름',action:'openRelationship',serviceScope:'GGULGGUL',honeyCost:30},
      {productId:'available',featureKey:'available',title:'나의 강점',action:'openStrength',serviceScope:'GGULGGUL',honeyCost:6},
      {productId:'other',featureKey:'other',title:'다른 서비스',action:'other',serviceScope:'OTHER',honeyCost:1},
    ]});
    await f.module.mountCharacterCard(f.root,f.profile,f.options);
    await new Promise(resolve=>setImmediate(resolve));
    const uses=f.root.querySelector('.pc-honey-suggestions');
    assert.equal(uses.querySelectorAll('li').length,2);
    assert.match(uses.querySelector('li').textContent,/나의 강점.*꿀방울 6개.*지금 사용할/s);
    assert.match(uses.textContent,/14개 더 모으면/);
    assert.equal(uses.querySelector('[data-honey-open]'),null);
    assert.equal(uses.querySelector('a').getAttribute('href'),'/ggulggul/?action=openStrength&honeyContent=available');
    balance=0;f.window.dispatchEvent(new f.window.Event('cd:honey-state'));
    assert.match(uses.querySelector('li').textContent,/6개 더 모으면/);
  } finally {f.close();}
});

test('only server-confirmed ownership is described as an already opened fortune',async()=>{
  const f=await fixture(async()=>payload);
  try {
    f.window.CdHoney.getUnlockedFeatureKeys=async()=>['owned'];
    f.window.CdHoney.getCatalog=async()=>({products:[{productId:'owned',featureKey:'owned',title:'나의 해석',action:'openStrength',serviceScope:'GGULGGUL',honeyCost:30}]});
    await f.module.mountCharacterCard(f.root,f.profile,f.options);
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(f.root.querySelector('.pc-honey-suggestions li').textContent,/열어 둔 운세/);
  } finally {f.close();}
});

test('unknown and missing birth times never display the noon fallback as a calculated birth time',()=>{
  const source=readFileSync(new URL('../../js/destiny-profile.js',import.meta.url),'utf8');
  const label=new Function(sliceFunction(source,'function _dpProfileListTimeLabel')+';return _dpProfileListTimeLabel;')();
  assert.equal(label({birth:{timeUnknown:true,hour:12,minute:0}},'11:28'),'생시 모름');
  assert.equal(label({birthTimeUnknown:true,birth:{}},'11:28'),'생시 모름');
  assert.equal(label({birth:{}},'11:28'),'생시 미입력');
  assert.equal(label({birth:{hour:0,minute:0}},'23:28'),'진태양시 23:28');
});

test('a failed catalog has a recovery action and never invents a price or entitlement',async()=>{
  const f=await fixture(async()=>payload);
  try {
    f.window.CdHoney.getCatalog=async()=>{throw new Error('offline');};
    await f.module.mountCharacterCard(f.root,f.profile,f.options);
    await new Promise(resolve=>setImmediate(resolve));
    const uses=f.root.querySelector('.pc-honey-suggestions');
    assert.match(uses.textContent,/불러오지 못/);
    assert.equal(uses.querySelector('a'),null);
    f.window.CdHoney.getCatalog=async()=>({products:[]});
    await uses.querySelector('button').onclick();
    assert.match(uses.textContent,/전체 사용처/);
  } finally {f.close();}
});
