const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function boot(){
  const states=[],effects=[],requests=[];
  const React={useState(value){const i=states.push(value)-1;return[value,next=>{states[i]=typeof next==='function'?next(states[i]):next;}];},useRef(value){return{current:value};},useCallback(fn){return fn;},useEffect(fn){effects.push(fn);}};
  const source=fs.readFileSync('app/hooks/useAiProfileSeed.ts','utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,window:new EventTarget(),document:new EventTarget(),require(name){
    if(name==='react')return React;
    if(name.includes('ai-prefill-seed'))return{readAiProfileSeed:()=>null,seedFromDestinyProfile:p=>p};
    return{isDestinyProfileStorageKey:()=>true,fetchCurrentDestinyProfile:()=>new Promise(resolve=>requests.push(resolve))};
  }});
  const hook=exports.useAiProfileSeed();const cleanups=effects.map(f=>f());
  return{hook,states,requests,cleanup:()=>cleanups.forEach(f=>f?.())};
}
test('late initial hydration cannot replace the explicitly reloaded profile',async()=>{
  const h=boot();const latest=h.hook.reload();
  h.requests[1]({birthDate:'2001-02-03',profileId:'B'});await latest;
  h.requests[0]({birthDate:'1990-01-01',profileId:'A'});await Promise.resolve();
  assert.equal(h.states[0].profileId,'B');h.cleanup();
});
test('an empty profile response clears the previous seed',async()=>{
  const h=boot();h.requests[0]({birthDate:'1990-01-01'});await Promise.resolve();
  const reloaded=h.hook.reload();h.requests[1](null);await reloaded;
  assert.equal(h.states[0],null);h.cleanup();
});
