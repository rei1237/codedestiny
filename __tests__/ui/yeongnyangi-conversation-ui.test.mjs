import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
require('../../scripts/lib/mock-network-guard.cjs');
const React=require('react'),{act}=React,{JSDOM}=require('jsdom'),{build}=require('esbuild');
const bundle=await build({entryPoints:[fileURLToPath(new URL('../../app/yeongnyangi/_components/QuestionConversation.tsx',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react/jsx-runtime'],plugins:[{name:'mock-boundaries',setup(b){
 b.onResolve({filter:/^\.\.\/_lib\/api$/},()=>({path:'api',namespace:'mock'}));
 b.onResolve({filter:/\.css$/},()=>({path:'css',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='api'?'export const fortuneApi=(...args)=>globalThis.__conversationRequest(...args);':'export default {};',loader:'js'}));
}}]});

test('visible followups require an explicit send, retain every remaining slot and close only after saved answers',async t=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://test.invalid/yeongnyangi/result/'});
 const keys=['window','document','navigator','IS_REACT_ACT_ENVIRONMENT','__conversationRequest'];
 const saved=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const key of keys)Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:key==='IS_REACT_ACT_ENVIRONMENT'?true:dom.window[key]});
 const {createRoot}=require('react-dom/client');
 const mod={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,mod,mod.exports);
 const {default:Conversation,QuestionConversationEntry:Entry}=mod.exports;
 let row={id:'a'.repeat(64),conversation:{limit:2,used:0,remaining:2,closed:false,ready:true,exchanges:[]}};
 const calls=[];
 globalThis.__conversationRequest=async(path,body)=>{
  calls.push({path,body});assert.ok(body.question);assert.equal(body.action,undefined);
  const c=row.conversation,used=c.used+1;
  row={...row,conversation:{...c,used,remaining:c.limit-used,closed:used===c.limit,exchanges:[...c.exchanges,{id:body.id,question:body.question,kind:'answer',text:'질문에 맞는 저장된 답변'}]}};
  return {fortune:row};
 };
 function Page(){const [value,setValue]=React.useState(row);return React.createElement(React.Fragment,null,React.createElement(Entry,{row:value}),React.createElement(Conversation,{row:value,onRow:setValue}));}
 const root=createRoot(document.getElementById('root'));
 t.after(async()=>{await act(async()=>root.unmount());dom.window.close();for(const [key,descriptor]of saved)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
 await act(async()=>root.render(React.createElement(Page)));
 const text=()=>document.body.textContent;
 const button=label=>[...document.querySelectorAll('button')].find(b=>b.textContent===label);
 assert.match(text(),/2회 남았어요/);assert.equal(calls.length,0);assert.equal(button('상담 마치기'),undefined);
 await act(async()=>document.querySelector('a[href="#question-conversation-input"]').click());
 assert.equal(document.activeElement.id,'question-conversation-input');
 for(let i=0;i<2;i++){
  const suggestion=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(i?'선택 기준':'먼저 바꿔볼 행동'));
  await act(async()=>suggestion.click());
  assert.equal(calls.length,i,'suggestions only fill the composer');
  await act(async()=>{button('질문 보내기').click();button('질문 보내기').click();});
  assert.equal(calls.length,i+1,'double click shares the same locked intent');
  if(i===0){assert.match(text(),/1회 남았어요/);assert.ok(document.getElementById('question-conversation-input'));}
 }
 assert.equal(document.getElementById('question-conversation-input'),null);
 assert.equal(document.querySelectorAll('article').length,2);
 assert.match(text(),/기존 결과와 대화는 계속 다시 볼 수 있어요/);
 assert.equal(new Set(calls.map(c=>c.body.id)).size,2);
});

test('context limit requires an explicit same-entitlement thread transition and restores the unsent draft',async t=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://test.invalid/yeongnyangi/result/?id='+'a'.repeat(64)});
 const keys=['window','document','navigator','IS_REACT_ACT_ENVIRONMENT','__conversationRequest'];
 const saved=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const key of keys)Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:key==='IS_REACT_ACT_ENVIRONMENT'?true:dom.window[key]});
 const {createRoot}=require('react-dom/client');
 const mod={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,mod,mod.exports);
 const Conversation=mod.exports.default;
 const offerId='44444444-4444-4444-8444-444444444444';
 let row={id:'a'.repeat(64),conversation:{limit:4,used:2,remaining:2,closed:false,ready:true,thread:{id:'thread-0',index:0},archivedThreads:[],exchanges:[],continuation:{id:offerId,reason:'context_limit',question:'작성 중이던 질문'}}};
 const calls=[];
 globalThis.__conversationRequest=async(path,body)=>{
  calls.push({path,body});assert.match(path,/conversation\/continue$/);assert.deepEqual(body,{id:offerId});
  row={...row,conversation:{...row.conversation,thread:{id:'opaque-next-thread',index:1},archivedThreads:[{id:'thread-0',index:0,exchanges:[]}],continuation:undefined,draft:{id:offerId,question:'작성 중이던 질문'}}};
  return {fortune:row};
 };
 function Page(){const [value,setValue]=React.useState(row);return React.createElement(Conversation,{row:value,onRow:setValue});}
 const root=createRoot(document.getElementById('root'));
 t.after(async()=>{await act(async()=>root.unmount());dom.window.close();for(const [key,descriptor]of saved)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
 await act(async()=>root.render(React.createElement(Page)));
 const button=[...document.querySelectorAll('button')].find(node=>node.textContent==='새 대화에서 이어가기');
 assert.ok(button);assert.equal(calls.length,0);assert.match(document.body.textContent,/남은 추가 질문 횟수와 작성한 질문은 그대로/);
 await act(async()=>button.click());
 assert.equal(calls.length,1);assert.equal(document.getElementById('question-conversation-input').value,'작성 중이던 질문');
 assert.equal(new URL(window.location.href).searchParams.get('thread'),'opaque-next-thread');
 assert.match(document.body.textContent,/2회 남았어요/);
});
