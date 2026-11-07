import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {Module} from 'node:module';
import {build} from 'esbuild';
import {chartFixture} from './chart-fixture.mjs';

const entry=path.resolve(import.meta.dirname,'../canonical/mansion-atlas.ts');
const bundle=await build({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false});
const mod=new Module(entry);mod._compile(bundle.outputFiles[0].text,entry);
const rows=mod.exports.publicMansions();
test('the public atlas maps every eastern mansion to the source counterpart without including personal report fields',()=>{
  assert.equal(rows.length,27);assert.equal(new Set(rows.map(r=>r.indian.name)).size,27);
  assert.deepEqual([rows[0].eastern.name,rows[0].eastern.han,rows[0].indian.name],['각','角','우타라 팔구니']);
  assert.ok(rows.every((r,i)=>r.index===i && r.convergence && r.divergence && r.indian.padas.length===4));
  assert.deepEqual(rows[5].eastern.shadows,[]);
  assert.ok(!JSON.stringify(rows).includes('chapterSpecs'));
});
test('the published atlas lists 27 articles, renders the entry with no shadow text and wraps from the last entry to the first',async()=>{
  const plugin=mod.exports.default(),id='virtual:toss-mansion-atlas';
  const {dom,React,createRoot,Component}=await chartFixture('MansionAtlas.tsx','/nakshatra/codex',[{name:'public-atlas',setup(b){
    b.onResolve({filter:/^virtual:toss-mansion-atlas$/},()=>({path:id,namespace:'articles'}));
    b.onLoad({filter:/.*/,namespace:'articles'},()=>({contents:plugin.load(plugin.resolveId(id))}));
  }}]);
  function Flow(){const [index,change]=React.useState(null);return React.createElement(Component,{index,onOpen:change});}
  const root=createRoot(document.getElementById('chart'));
  const button=t=>document.querySelectorAll('button')&&Array.from(document.querySelectorAll('button')).find(n=>n.textContent.includes(t));
  const click=async t=>React.act(()=>{const el=button(t);assert.ok(el,t);el.click();});
  try{
    await React.act(()=>root.render(React.createElement(Flow)));
    assert.equal(document.querySelectorAll('button.record').length,27);
    await click(rows[5].eastern.name+'수 ·');assert.match(document.querySelector('h1').textContent,/미수\(尾\)/);
    assert.doesNotMatch(document.body.textContent,/undefined|균형을 살펴볼 상징/);
    await click('도감 차례로');await click(rows[26].eastern.name+'수 ·');await click('다음 별');
    assert.match(document.querySelector('h1').textContent,/각수\(角\)/);
    assert.equal(document.activeElement.tagName,'H1');
  }finally{await React.act(()=>root.unmount());dom.window.close();}
});
