import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync('app/moonlit-lotus/_lib/sprite-compositor.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function setup(){
 let now=0,id=0;const queue=new Map(),events=new Map(),draws=[];
 const context=()=>({clearRect(){},drawImage(...args){draws.push({ctx:this,alpha:this.globalAlpha,mode:this.globalCompositeOperation,args});}});
 const ctx=context(),canvas={getContext:()=>ctx},scratch={getContext:()=>context()};
 const document={hidden:false,createElement:()=>scratch,addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const sandbox={exports:{},document,performance:{now:()=>now},requestAnimationFrame:f=>{queue.set(++id,f);return id;},cancelAnimationFrame:i=>queue.delete(i)};
 vm.runInNewContext(source,sandbox);
 const renderer=sandbox.exports.createSpriteCompositor(canvas);
 return {renderer,canvas,ctx,draws,queue,events,document,scratch,step(t){now=t;const batch=[...queue.values()];queue.clear();batch.forEach(f=>f(t));},setNow(t){now=t;}};
}
const image={naturalWidth:1536};
test('first/reduced frame is immediate; midpoint uses complementary additive alpha',()=>{
 const t=setup();t.renderer.show(image,0);assert.equal(t.queue.size,0);
 t.renderer.show(image,5);t.step(35);
 const pair=t.draws.filter(d=>d.ctx===t.ctx).slice(-2);
 assert.deepEqual(pair.map(d=>d.alpha),[.5,.5]);assert.equal(pair[1].mode,'lighter');
 assert.deepEqual(pair[1].args.slice(1),[384,384,384,384,0,0,384,384]);
 t.step(70);assert.equal(t.queue.size,0);
 t.renderer.show(image,8,true);assert.equal(t.queue.size,0);
});
test('interruption snapshots visible canvas and never starves the pending display frame',()=>{
 const t=setup();t.renderer.show(image,0);t.renderer.show(image,1);const first=[...t.queue.keys()][0];
 t.setNow(20);t.renderer.show(image,2);assert.equal([...t.queue.keys()][0],first);
 assert.equal(t.draws.at(-1).args[0],t.canvas);
 t.step(90);assert.equal(t.queue.size,0);assert.equal(t.draws.at(-1).args[1],768);
});
test('hidden and unmounted renderers cancel work and release their scratch surface',()=>{
 const t=setup();t.renderer.show(image,0);t.renderer.show(image,1);
 t.document.hidden=true;t.events.get('visibilitychange')();assert.equal(t.queue.size,0);
 t.renderer.show(image,2);assert.equal(t.queue.size,0);
 t.renderer.dispose();assert.equal(t.events.size,0);assert.equal(t.scratch.width,0);
 const count=t.draws.length;t.renderer.show(image,3);assert.equal(t.draws.length,count);
});
