import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountPetGarden} from '../../js/core/profile-pet-card.mjs';
import {petBond} from '../../js/core/profile-honey-manager.mjs';
import {mountCharacterCard} from '../../js/core/profile-character-card.mjs';

const honeySource=readFileSync(new URL('../../js/prompt-hub-honey.js',import.meta.url),'utf8');
const widget='<section class="cdh-honey" data-cd-honey-widget hidden><details class="cdh-honey__details"><summary><span id="cdHoneyTitle">출석 · 꿀방울</span><span data-cd-honey-streak hidden></span><span class="cdh-honey__wallet"><img src="/images/fortune-tea-house/honey-drop-jewel-v1.webp"><strong data-cd-honey-balance></strong></span></summary><img class="cdh-honey__yeoni"><div data-cd-honey-calendar hidden></div><button data-cd-honey-attend>출석 체크하기</button><button data-cd-sheet-open="cdHoneySheet">사용처 보기</button><p data-cd-honey-status role="status"></p><button data-cd-honey-retry hidden>다시 확인하기</button></details></section>';
const preview={character:{id:'animal-rabbit',element:'목'},fortune:{headline:'나의 속도를 살피는 날',advice:'한 가지씩 마무리해 보세요.'}};
const tick=async()=>{await new Promise(r=>setTimeout(r,50));};
let cleanup;
afterEach(async()=>{await cleanup?.();cleanup=null;});
async function fixture({mountGame=true}={}){
 const dom=new JSDOM('<div id="parking">'+widget+'</div><main><div id="garden"></div></main>',{url:'https://example.test/ggulggul/',runScripts:'outside-only',pretendToBeVisual:true});
 const win=dom.window;
 globalThis.window=win;globalThis.document=win.document;globalThis.localStorage=win.localStorage;globalThis.CustomEvent=win.CustomEvent;globalThis.AbortController=win.AbortController;
 win.matchMedia=()=>({matches:true});
 const observers=[],Observer=win.MutationObserver;
 win.MutationObserver=class extends Observer{constructor(callback){super(callback);observers.push(this);}};
 const attendance={day:'2026-11-09',balance:20,attended:false,streak:4,streakEvery:5,streakBonus:4,nextBonusIn:1,monthDays:[5,6,7,8].map(n=>({day:'2026-11-0'+n,bonus:0}))};
 const calls=[];let failure=false,claimed=false;
 win._cdAIPromptRequestJson=async(path,init)=>{
  calls.push({path,method:init?.method});
  if(path==='/api/honey/catalog')return {ok:true,status:200,payload:{ok:true,products:[]}};
  if(path==='/api/honey/attendance'){
   if(failure)return {ok:false,status:500,payload:{ok:false}};
   if(init?.method==='POST'&&!attendance.attended){attendance.attended=true;attendance.streak=5;attendance.nextBonusIn=5;attendance.balance+=5;attendance.monthDays.push({day:attendance.day,bonus:4});}
   return {ok:true,status:200,payload:{ok:true,...structuredClone(attendance)}};
  }
  return {ok:true,status:200,payload:{ok:true}};
 };
 win.eval(honeySource);await tick();
 const pet={speciesId:'rabbit',name:'토끼',coat:'wood',eggType:'moon',traits:{pattern:1,expression:2,accessory:3},affection:25,fed:false,played:false};
 const petCalls=[];
 const api=async(path,body)=>{
  petCalls.push({path,body});let rewarded=0;
  if(path.endsWith('/care')){const key=body.action==='feed'?'fed':'played';if(!pet[key]){pet[key]=true;pet.affection+=5;}if(pet.fed&&pet.played&&!claimed){claimed=true;rewarded=1;attendance.balance++;}}
  return {ok:true,...preview,pet:structuredClone(pet),balance:attendance.balance,careRewardClaimed:claimed,careHoney:1,rewarded};
 };
 let controller=new win.AbortController();
 const target=win.document.getElementById('garden'),original=win.document.querySelector('[data-cd-honey-widget]');
 const mount=()=>mountPetGarden(target,{profileId:'one',preview,owner:'owner',api,current:()=>true,signal:controller.signal});
 if(mountGame)await mount();
 cleanup=async()=>{observers.forEach(observer=>observer.disconnect());controller.abort();await tick();dom.window.close();};
 return {win,target,original,attendance,calls,petCalls,api,fail:()=>{failure=true;},recover:()=>{failure=false;},remount:async()=>{controller.abort();controller=new win.AbortController();await mount();},abort:()=>controller.abort()};
}

test('the live wallet moves once, survives game redraws, and returns before profile disposal',async()=>{
 const f=await fixture();
 assert.equal(f.target.querySelector('[data-cd-honey-widget]'),f.original);
 assert.equal(f.win.document.querySelectorAll('[data-cd-honey-attend]').length,1);
 assert.equal(f.target.querySelector('[data-pet-attend]'),null,'there is no second attendance implementation');
 assert.equal(f.original.hidden,false);
 assert.equal(f.original.querySelector('.cdh-honey__details').open,true);
 const month=f.original.querySelector('.cdh-cal__month');month.open=true;
 f.target.querySelector('[data-pet-action="fortune"]').click();await tick();
 assert.equal(f.target.querySelector('[data-cd-honey-widget]'),f.original);
 assert.equal(f.original.querySelector('.cdh-cal__month'),month);
 await f.remount();
 assert.equal(f.target.querySelector('[data-cd-honey-widget]'),f.original);
 f.abort();
 assert.equal(f.win.document.getElementById('parking').firstElementChild,f.original);
 assert.equal(f.original.hidden,true);
});

test('the original fifth-day attendance posts once and synchronizes both wallet displays',async()=>{
 const f=await fixture(),before=f.petCalls.length;
 f.original.querySelector('.cdh-cal__month').open=true;
 f.original.querySelector('[data-cd-honey-attend]').click();
 f.original.querySelector('[data-cd-honey-attend]').click();await tick();
 assert.equal(f.calls.filter(c=>c.path==='/api/honey/attendance'&&c.method==='POST').length,1);
 assert.equal(f.attendance.balance,25);
 assert.match(f.target.querySelector('.pg-wallet').textContent,/25개/);
 assert.equal(f.original.querySelector('[data-cd-honey-balance]').textContent,'25개');
 assert.equal(f.original.querySelectorAll('.cdh-cal__slot.is-filled').length,5);
 assert.equal(f.original.querySelector('.cdh-cal__month').open,true);
 assert.match(f.target.querySelector('#petBondHint').textContent,/오늘 출석을 완료/);
 assert.equal(f.petCalls.length,before,'wallet render events never fetch or credit the pet again');
});

test('care reward, spending refresh and recovery share the original wallet controller',async()=>{
 const f=await fixture();
 f.target.querySelector('[data-pet-action="feed"]').click();await tick();
 f.target.querySelector('[data-pet-action="play"]').click();await tick();
 assert.equal(f.attendance.balance,21);
 assert.match(f.target.querySelector('.pg-wallet').textContent,/21개/);
 assert.match(f.target.querySelector('.pg-bond-heading').textContent,/반가운 친구/);
 const focused=f.target.querySelector('[data-pet-action="fortune"]');focused.focus();
 f.attendance.balance=3;await f.win.CdHoney.refresh(false);
 assert.match(f.target.querySelector('.pg-wallet').textContent,/3개/);
 assert.equal(f.win.document.activeElement,focused,'a wallet refresh preserves keyboard focus and the active game control');
 const snapshot=f.win.CdHoney.getState();snapshot.balance=999;
 assert.equal(f.win.CdHoney.getState().balance,3,'the snapshot cannot change the actual wallet state');
 f.fail();await f.win.CdHoney.refresh(false);
 assert.match(f.target.querySelector('.pg-wallet').textContent,/다시 확인하기/);
 assert.equal(f.original.querySelector('[data-cd-honey-retry]').hidden,false);
 f.recover();f.original.querySelector('[data-cd-honey-retry]').click();await tick();
 assert.match(f.target.querySelector('.pg-wallet').textContent,/3개/);
});

test('friendship follows existing reaction thresholds without introducing honey multipliers',()=>{
 assert.equal(petBond(0).label,petBond(29).label);
 assert.equal(petBond(30).label,petBond(69).label);
 assert.equal(petBond(70).label,petBond(100).label);
 assert.equal(petBond(29).next,30);assert.equal(petBond(69).next,70);assert.equal(petBond(100).next,100);
 assert.match(petBond(70,true).greeting,/출석도 완료/);
});

test('replacing the entire profile root recovers the original wallet from the detached old card',async()=>{
 const f=await fixture({mountGame:false}),doc=f.win.document;
 const profile={id:'one',birth:{year:1995,month:5,day:15,hour:12,minute:0},gender:'female'};
 const options={owner:()=> 'owner',request:async(path,init)=>({ok:true,data:{ok:true,...(path.includes('character-preview')?preview:path.endsWith('/characters')?{ownedIds:[],equippedId:null}:await f.api(path,init?.body?JSON.parse(init.body):undefined))}})};
 f.target.innerHTML='<div data-profile-character></div>';
 await mountCharacterCard(f.target,profile,options);
 assert.equal(f.target.querySelector('[data-cd-honey-widget]'),f.original);
 const replacement=doc.createElement('div');replacement.innerHTML='<div data-profile-character></div>';
 f.target.replaceWith(replacement);
 await mountCharacterCard(replacement,{...profile,id:'two'},options);
 assert.equal(replacement.querySelector('[data-cd-honey-widget]'),f.original);
 replacement.querySelector('.pc-details').open=true;await tick();
 assert.match(replacement.querySelector('[data-pc-wallet]').textContent,/출석·꿀단지/,'the spirit catalogue cannot show an old second wallet balance');
 assert.equal(doc.querySelectorAll('[data-cd-honey-widget]').length,1);
 assert.equal(doc.querySelectorAll('[data-cd-honey-attend]').length,1);
});

test('a failed character preview leaves the wallet usable and retry preserves its credited attendance',async()=>{
 const f=await fixture({mountGame:false});let previewFailed=true;
 const profile={id:'preview-retry',birth:{year:1997,month:7,day:9,hour:12,minute:0},gender:'female'};
 const options={owner:()=> 'owner',request:async(path,init)=>{
  if(path.includes('character-preview'))return previewFailed?{ok:false,data:{ok:false,message:'친구를 다시 확인해 주세요.'}}:{ok:true,data:{ok:true,...preview}};
  return {ok:true,data:{ok:true,...(path.endsWith('/characters')?{ownedIds:[],equippedId:null}:await f.api(path,init?.body?JSON.parse(init.body):undefined))}};
 }};
 f.target.innerHTML='<div data-profile-character></div>';
 await mountCharacterCard(f.target,profile,options);await tick();
 assert.equal(f.target.querySelector('[data-cd-honey-widget]'),f.original);
 assert.ok(f.target.querySelector('[data-pc-retry]'));
 f.original.querySelector('[data-cd-honey-attend]').click();await tick();
 assert.equal(f.attendance.balance,25);
 previewFailed=false;f.target.querySelector('[data-pc-retry]').click();await tick();
 assert.equal(f.target.querySelector('[data-cd-honey-widget]'),f.original);
 assert.ok(f.target.querySelector('.pg-pet'));
 assert.equal(f.original.querySelector('[data-cd-honey-balance]').textContent,'25개');
 assert.equal(f.calls.filter(c=>c.path==='/api/honey/attendance'&&c.method==='POST').length,1);
});
