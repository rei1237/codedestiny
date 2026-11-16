import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
function setup(){
 const states=[],effects=[],sounds=[],listeners={};
 class Sound {paused=true;currentTime=0;volume=1;error=null;constructor(src){this.src=src;sounds.push(this);}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}load(){}removeAttribute(){this.src='';}}
 const sandbox={Audio:Sound,document:{hidden:false,addEventListener:(n,f)=>listeners[n]=f,removeEventListener:n=>delete listeners[n]},useRef:v=>({current:v}),useState:v=>{const i=states.length;states.push(v);return[v,n=>states[i]=n];},useEffect:f=>effects.push(f()),useCallback:f=>f};
 let js=ts.transpileModule(readFileSync('app/moonlit-lotus/_lib/use-effects.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText.replace(/import .* from 'react';/,'').replace('export function','function');
 vm.runInNewContext(js+';this.hook=useEffects();',sandbox);
 return {hook:sandbox.hook,sounds,states,effects,listeners,sandbox};
}
test('one click loops both layers, another stops; restart never creates another player',async()=>{
 const {hook,sounds}=setup();await hook.strike();assert.equal(sounds.length,1);assert.equal(sounds[0].loop,true);assert.equal(sounds[0].paused,false);
 await hook.strike();assert.equal(sounds[0].paused,true);await hook.strike();assert.equal(sounds.length,1);assert.equal(sounds[0].paused,false);
 hook.changeVolume(.2);assert.equal(sounds[0].volume,.2);hook.toggle();assert.equal(sounds[0].paused,true);
});
test('hidden tab and unmount stop audio; sources/listeners are released',async()=>{
 const {hook,sounds,sandbox,listeners,effects}=setup();await hook.strike();sandbox.document.hidden=true;listeners.visibilitychange();assert.equal(sounds[0].paused,true);
 effects[0]();assert.equal(sounds[0].src,'');assert.equal(listeners.visibilitychange,undefined);
});
test('a failed play can be retried without overlapping or stale loading',async()=>{
 const {hook,sounds,states}=setup();await hook.strike();hook.stop();sounds[0].play=()=>Promise.reject(Error('network'));
 await hook.strike();assert.equal(states[3],false);assert.match(states[2],/다시/);assert.equal(sounds[0].paused,true);
 sounds[0].play=function(){this.paused=false;return Promise.resolve();};await hook.strike();assert.equal(states[1],true);
});
test('pending playback can be cancelled without a late success resetting state',async()=>{
 const {hook,sounds,states}=setup();await hook.strike();hook.stop();let resolve;sounds[0].play=()=>new Promise(r=>resolve=r);
 const pending=hook.strike();await hook.strike();resolve();await pending;assert.equal(states[1],false);assert.equal(states[3],false);
});
