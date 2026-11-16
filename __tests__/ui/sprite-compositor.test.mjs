import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync('app/moonlit-lotus/_lib/sprite-compositor.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function setup(){
 const events=[],ctx={clearRect(...args){events.push(['clear',...args]);},drawImage(...args){events.push(['draw',...args]);}};
 const canvas={getContext:()=>ctx};
 const sandbox={exports:{},requestAnimationFrame(){throw Error('Static sprites must not schedule frames');}};
 vm.runInNewContext(source,sandbox);
 return {renderer:sandbox.exports.createSpriteCompositor(canvas),events};
}
const image={naturalWidth:1536,naturalHeight:1536};
test('one synchronous decoded drawing replaces each pose, including interrupted rapid changes',()=>{
 const t=setup();t.renderer.show(image,0);t.renderer.show(image,5);t.renderer.show(image,9);
 assert.deepEqual(t.events.map(e=>e[0]),['clear','draw','clear','draw','clear','draw']);
 assert.deepEqual(t.events[3].slice(2),[384,384,384,384,0,0,384,384]);
 assert.deepEqual(t.events[5].slice(2),[384,768,384,384,0,0,384,384]);
});
test('duplicate, invalid and disposed requests preserve the current pixels without scheduling',()=>{
 const t=setup();t.renderer.show(image,3);const count=t.events.length;
 t.renderer.show(image,3);t.renderer.show(image,16);t.renderer.show(image,-1);t.renderer.show(image,NaN);t.renderer.show({naturalWidth:0,naturalHeight:0},0);
 assert.equal(t.events.length,count);t.renderer.dispose();t.renderer.show(image,4);assert.equal(t.events.length,count);
});
test('a one-row atlas has the same stable output dimensions',()=>{
 const t=setup();t.renderer.show({naturalWidth:1536,naturalHeight:384},3,true,4,1);
 assert.deepEqual(t.events[1].slice(2),[1152,0,384,384,0,0,384,384]);
});
