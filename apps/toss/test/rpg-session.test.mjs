import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {extractRpgEngine} from '../service/rpg-loader.mjs';

test('guest transfer, lost acknowledgement, guest reset and account changes on one device',async()=>{
 const texts=await Promise.all(['entertain-engine','destiny-profile'].map(name=>readFile(new URL('../../../js/'+name+'.js',import.meta.url),'utf8')));
 const {outputFiles}=await build({entryPoints:[fileURLToPath(new URL('../src/rpg-progress.ts',import.meta.url))],bundle:true,platform:'browser',format:'esm',write:false,
 plugins:[{name:'offline-session',setup(b){
  b.onResolve({filter:/^virtual:rpg-sheet$/},()=>({path:'engine',namespace:'rpg'}));
  b.onLoad({filter:/.*/,namespace:'rpg'},()=>({contents:extractRpgEngine(...texts)}));
  b.onLoad({filter:/[\\/]platform\.ts$/},()=>({contents:'export const api=(...args)=>globalThis.rpc(...args),getTossSessionRevision=()=>globalThis.revision,hasTossSession=()=>!!globalThis.owner;'}));
 }}]});
 const dom=new JSDOM('<main/>',{url:'https://local.test'}),document=dom.window.document;
 globalThis.window=dom.window;globalThis.localStorage=dom.window.localStorage;
 globalThis.revision=0;globalThis.owner='';
 const key='cd:toss:rpg:guest:v1',today=new Date(Date.now()+9*3600e3).toISOString().slice(0,10).replaceAll('-','.');
 let interrupted=true;
 const users={A:{total:0,completed:[]},B:{total:0,completed:[]}};
 globalThis.rpc=async(path,body)=>{
  const scope=globalThis.owner,person=users[scope];assert.ok(person);
  if(path.endsWith('/adopt')){
   person.total=Math.max(person.total,body.totalExp);person.completed=[...new Set([...person.completed,...body.completed])];
   if(interrupted){interrupted=false;throw Error('lost acknowledgement');}
   return {ok:true};
  }
  if(path.endsWith('/quest')&&!person.completed.includes(body.questId)){person.completed.push(body.questId);person.total+=15;}
  return {scope,date:today.replaceAll('.','-'),completed:[...person.completed],
   progress:{totalExp:person.total,currentLevel:1,currentLevelExp:person.total,nextLevelExp:200}};
 };
 const {mountRpgQuest}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));
 const main=document.querySelector('main');
 let unmount;
 function mount(who,stem='甲',element='wood'){unmount?.();globalThis.owner=who;globalThis.revision++;main.replaceChildren();unmount=mountRpgQuest(main,{stem,element,name:''},()=>{});}
 async function wait(test){
  for(let i=0;i<150;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}
  assert.fail(main.textContent.slice(-250));
 }
 const ready=()=>wait(()=>main.querySelector('[data-rpg-complete]')&&!main.firstChild.inert);
 const done=n=>wait(()=>main.querySelectorAll('.ent-rpg-quest-card.is-complete').length===n);
 try{
  mount('');await ready();main.querySelector('[data-rpg-complete]').click();await done(1);
  const first=JSON.parse(localStorage.getItem(key));assert.equal(first.totalExp,15);
  mount('A');await wait(()=>main.textContent.includes('다시 시도해 주세요'));
  assert.equal(JSON.parse(localStorage.getItem(key)).bound,'A');
  mount('B');await ready();await done(0);assert.equal(users.B.total,0);
  mount('A');await ready();await done(1);assert.equal(localStorage.getItem(key),null);
  main.querySelector('[data-rpg-complete]:not(:disabled)').click();await done(2);
  mount('');await ready();await done(0);
  mount('B');await ready();await done(0);
  localStorage.removeItem('cd:toss:rpg:quests:A');
  mount('A','庚','metal');await ready();await done(2);assert.equal(users.A.total,30);
 }finally{unmount?.();dom.window.close();delete globalThis.window;delete globalThis.localStorage;delete globalThis.rpc;delete globalThis.owner;delete globalThis.revision;}
});
