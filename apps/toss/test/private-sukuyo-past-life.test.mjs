import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module} from 'node:module';
import path from 'node:path';
import example from '../private-simulation/sukuyo-past-life-examples.json' with {type:'json'};
import {internFixtureStrings} from '../private-simulation/compressed-naming-data.mjs';
import {privateSukuyoPastLife} from '../private-simulation/sukuyo-past-life.mjs';
import {createSimulationApi} from '../private-simulation/api.mjs';
test('all nine private purposes match original local calculation and lossless string interning',async()=>{
 const root=path.resolve(import.meta.dirname,'../../..'),bundle=await build({entryPoints:[path.join(root,'worker/toss/sukuyo-past-life.js')],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
 const compiled=new Module(path.join(root,'test-private-past-life.cjs'));compiled.paths=Module._nodeModulePaths(root);compiled._compile(bundle.outputFiles[0].text,compiled.id);
 for(const purpose of Object.keys(example.purposes)){
  const input={...example.input,purpose},original=await compiled.exports.tossSukuyoPastLife({},{ownerId:'test-owner'},input,{requestUrl:''}),actual=await privateSukuyoPastLife(input).json();
  // The original report stamps its generation time; all content and logic remain identical.
  original.data.generatedAt=actual.data.generatedAt;assert.deepEqual(actual,original);
 }
 const {pool,tree}=internFixtureStrings(example);const decode=v=>Array.isArray(v)?v.map(decode):v&&typeof v==='object'?Object.hasOwn(v,'$tossString')?pool[v.$tossString]:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,decode(x)])):v;assert.deepEqual(decode(tree),example);
 assert.equal(privateSukuyoPastLife({...example.input,purpose:'love',profileId:'other'}).status,403);assert.equal(privateSukuyoPastLife({...example.input,purpose:'love',userBirthDate:'2000-01-01'}).status,422);
});
test('past life stays authenticated and never creates a purchase or result record',async()=>{
 const data=new Map(),api=createSimulationApi({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},'A');
 const call=(route,body,token='')=>api(new Request('https://private.invalid/private-simulation-api'+route,{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify(body)}));
 const input={...example.input,purpose:'general'};assert.equal((await call('/sukuyo/past-life',input)).status,401);
 await call('/login',{authorizationCode:'private-simulation-person-A'});assert.equal((await call('/sukuyo/past-life',input,'private-simulation-token-A')).status,200);
 const ledger=JSON.parse(data.get('consultations'));assert.deepEqual(ledger.orders,[]);assert.deepEqual(ledger.fortunes,[]);
});
