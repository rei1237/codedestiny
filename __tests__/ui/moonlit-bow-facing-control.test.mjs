import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {JSDOM} from 'jsdom';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';

const root = new URL('../../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');

test('bow-facing choices are real accessible toggle buttons driven only by presentation state', async () => {
 const source=read('app/moonlit-lotus/_components/BowFacingControl.tsx');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const require=createRequire(import.meta.url), mod={exports:{}};
 new Function('require','module','exports',output)(id=>id.endsWith('.css')?{}:require(id),mod,mod.exports);
 const App=mod.exports.default;
 const dom=new JSDOM('<div id="app"></div>',{url:'https://fixture.invalid/'});
 const values={window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true};
 const prior=Object.fromEntries(Object.keys(values).map(key=>[key,globalThis[key]]));
 Object.assign(globalThis,values);
 const container=dom.window.document.getElementById('app'), react=createRoot(container), changes=[];
 const draw=async (rearView,disabled=false)=>act(async()=>react.render(React.createElement(App,{rearView,disabled,onChange:rear=>changes.push(rear)})));
 try{
  await draw(true);
  const rear=container.querySelector('button[data-bow-facing="rear"]');
  const front=container.querySelector('button[data-bow-facing="front"]');
  assert.equal(rear.getAttribute('aria-pressed'),'true');
  assert.equal(front.getAttribute('aria-pressed'),'false');
  assert.match(front.textContent,/앞모습 보기/);
  await act(async()=>front.click());assert.deepEqual(changes,[false]);
  await draw(false);
  assert.equal(rear.getAttribute('aria-pressed'),'false');
  assert.equal(front.getAttribute('aria-pressed'),'true');
  await act(async()=>rear.click());assert.deepEqual(changes,[false,true]);
  await draw(false,true);assert.match(front.matches(':disabled').toString(),/^true$/);
 }finally{
  await act(async()=>react.unmount());
  dom.window.close();
  Object.assign(globalThis,prior);
 }
});
test('the facing toggle stays outside collapsed settings and preserves the bow session clock',()=>{
 const page=read('app/moonlit-lotus/Space.tsx');
 const bow=page.indexOf('<BowFacingControl '),settings=page.indexOf('<details className={styles.bowOptions}>');
 assert.ok(bow>=0&&settings>bow);
 const change=page.match(/const changeBowFacing=.*?;\r?\n/)?.[0];
 assert.ok(change?.includes('setRearView(rear)'));
 assert.doesNotMatch(change,/bow\.(start|stop|pause|reset|speed)|setScene|setView/);
 assert.match(page,/<Character [^>]*elapsed=\{bow\.session\.elapsed\}/);
});
