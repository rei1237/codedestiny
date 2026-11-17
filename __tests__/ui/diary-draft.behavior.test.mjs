import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
const require=createRequire(import.meta.url);
const code=buildSync({entryPoints:[fileURLToPath(new URL('../../app/diary/_lib/use-diary-draft.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',external:['react'],write:false}).outputFiles[0].text;
const bundleModule={exports:{}};
new Function('module','exports','require',code)(bundleModule,bundleModule.exports,require);
const {useDiaryDraft}=bundleModule.exports;
let count=0;
async function fixture(commit){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test/diary/',pretendToBeVisual:true});
 const previous={window:globalThis.window,document:globalThis.document,IS_REACT_ACT_ENVIRONMENT:globalThis.IS_REACT_ACT_ENVIRONMENT};
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const root=createRoot(document.getElementById('root'));
 let draft;
 const id='draft-'+count++;
 function View({day}){draft=useDiaryDraft('',value=>commit(day,value),id+':'+day);return React.createElement('span',null,draft.value);}
 const render=async day=>{await act(async()=>root.render(React.createElement(View,{key:day,day})));};
 await render('2026-11-17');
 return {get draft(){return draft;},render,async close(){await act(async()=>root.unmount());dom.window.close();Object.assign(globalThis,previous);}};
}

test('failed writes keep the draft retryable and only mark it saved after success',async()=>{
 let succeeds=false,calls=0;const f=await fixture(()=>{calls++;return succeeds;});
 try{
  await act(async()=>f.draft.onChange('보존할 문장'));
  assert.equal(f.draft.status,'pending');
  await act(async()=>{assert.equal(f.draft.flush(),false);});
  assert.equal(f.draft.status,'error');assert.equal(f.draft.value,'보존할 문장');
  succeeds=true;await act(async()=>{assert.equal(f.draft.flush(),true);});
  assert.equal(f.draft.status,'saved');assert.equal(calls,2);
  await act(async()=>f.draft.flush());assert.equal(calls,2);
 }finally{await f.close();}
});

test('date navigation flushes to the original date and restores failed text when revisiting it',async()=>{
 const writes=[];let succeeds=false;
 const f=await fixture((day,value)=>{writes.push([day,value]);return succeeds;});
 try{
  await act(async()=>f.draft.onChange('어제 쓰던 글'));
  await f.render('2026-11-18');assert.equal(f.draft.value,'');
  assert.deepEqual(writes[0],['2026-11-17','어제 쓰던 글']);
  await f.render('2026-11-17');assert.equal(f.draft.value,'어제 쓰던 글');
  succeeds=true;await act(async()=>f.draft.flush());
  assert.deepEqual(writes.at(-1),['2026-11-17','어제 쓰던 글']);
 }finally{await f.close();}
});

test('closing the page flushes pending input immediately without waiting for the debounce',async()=>{
 const writes=[];const f=await fixture((day,value)=>{writes.push([day,value]);return true;});
 try{
  await act(async()=>f.draft.onChange('마지막 문장'));
  await act(async()=>window.dispatchEvent(new window.Event('pagehide')));
  assert.deepEqual(writes,[['2026-11-17','마지막 문장']]);
  assert.equal(f.draft.status,'saved');
 }finally{await f.close();}
});
