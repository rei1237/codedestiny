import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const engine=readFileSync('js/saju-engine.js','utf8');
const source=engine.slice(engine.indexOf('function runDeferredSajuTasks('),engine.indexOf('function invokeOptionalGlobalRenderer('));
test('old deferred work cannot update a new chart or reopen a result after home navigation',()=>{
 for(const exit of ['new-chart','home']){
  const tasks=[],result={style:{display:'block'}},chart={},ctx={G_PILLARS:chart,document:{getElementById:()=>result},setTimeout:fn=>tasks.push(fn),window:{},console};
  vm.runInNewContext(source,ctx);
  let rendered=0;ctx.runDeferredSajuTasks([()=>rendered++]);
  if(exit==='new-chart')ctx.G_PILLARS={};else result.style.display='none';
  tasks.shift()();assert.equal(rendered,0,exit);
 }
});
