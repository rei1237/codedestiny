import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require=createRequire(import.meta.url),Module=require('node:module'),root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'apps/toss/src/platform.ts')],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'offline-platform',setup(b){
 b.onResolve({filter:/^(\.\/release|@apps-in-toss\/web-framework)$/},args=>({path:args.path,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},({path:p})=>({loader:'js',contents:p==='./release'?'export const SERVICE_AVAILABLE=true;':`export const Environment={environment:'sandbox'},IAP={},TossAuth={},Storage={},Share={},isMinVersionSupported=()=>true;`}));
}}]});
const loaded=new Module(path.join(root,'pet-platform-fixture.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);const {api}=loaded.exports;
const id='a'.repeat(64),pathFor='/native/pet/intents/'+id+'/generate';

test('the pet generation request allows the bounded server provider time without changing other timeouts',async()=>{
 const originalFetch=globalThis.fetch,originalTimeout=AbortSignal.timeout,seen=[];
 try{
  AbortSignal.timeout=ms=>{seen.push(ms);return originalTimeout(100000);};
  globalThis.fetch=async()=>Response.json({ok:true});
  await api(pathFor,{});await api('/native/pet/intents/'+id+'/result');await api('/session');
  assert.deepEqual(seen,[75000,20000,20000]);
 }finally{globalThis.fetch=originalFetch;AbortSignal.timeout=originalTimeout;}
});

test('permission and purchase errors preserve server reasons and status',async()=>{
 const originalFetch=globalThis.fetch;
 try{
  for(const [status,payload,code] of [[403,{reason:'PAYMENT_REVOKED'},'PAYMENT_REVOKED'],[409,{reason:'INPUT_MISMATCH'},'INPUT_MISMATCH'],[401,{reason:'SESSION_EXPIRED'},'SESSION_EXPIRED'],[403,{error:'ACCESS_DENIED',reason:'PAYMENT_REVOKED'},'ACCESS_DENIED'],[403,{reason:'invalid human text'},'ACCESS_DENIED'],[401,null,'SESSION_EXPIRED'],[403,null,'ACCESS_DENIED'],[409,null,'REQUEST_FAILED']]){
   globalThis.fetch=async()=>Response.json(payload,{status});
   await assert.rejects(api(pathFor,{}),error=>error.status===status&&error.code===code);
  }
 }finally{globalThis.fetch=originalFetch;}
});
