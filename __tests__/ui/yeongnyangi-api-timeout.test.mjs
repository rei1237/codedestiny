import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './app/yeongnyangi/_lib/api';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'mock-auth',setup(b){b.onLoad({filter:/auth-client\.ts$/},()=>({contents:'export const authFetch=(...args)=>globalThis.__fortuneFetch(...args);',loader:'ts'}));}}]});
const {fortuneApi}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('body stalled after successful headers still reaches the timeout',async()=>{
 let calls=0;globalThis.__fortuneFetch=async()=>{calls++;return {ok:true,json:()=>new Promise(()=>{})};};
 await assert.rejects(()=>fortuneApi('requests',undefined,{timeoutMs:20}),{code:'REQUEST_TIMEOUT'});assert.equal(calls,1);
});
test('uncertain writes are never repeated by the API wrapper',async()=>{
 let calls=0;globalThis.__fortuneFetch=async()=>{calls++;return new Promise(()=>{});};
 await assert.rejects(()=>fortuneApi('requests',{productId:'saju_mackerel'},{timeoutMs:20}),{code:'REQUEST_TIMEOUT'});assert.equal(calls,1);
});
test('caller cancellation rejects without waiting for body or refresh',async()=>{
 globalThis.__fortuneFetch=async()=>({ok:true,json:()=>new Promise(()=>{})});
 const controller=new AbortController();const pending=fortuneApi('requests',undefined,{signal:controller.signal});controller.abort();
 await assert.rejects(()=>pending,{name:'AbortError'});
});
test('transient auth errors retain retry semantics and are not converted into logout',async()=>{
 globalThis.__fortuneFetch=async()=>new Response(JSON.stringify({code:'AUTH_REFRESH_UNAVAILABLE',message:'잠시 후',retryable:true}),{status:503,headers:{'Retry-After':'2'}});
 await assert.rejects(()=>fortuneApi('requests'),error=>error.status===503&&error.retryable&&error.retryAfterSeconds===2);
});
test('network failures surface a retryable notice instead of the raw fetch message',async()=>{
 globalThis.__fortuneFetch=async()=>{throw new TypeError('Failed to fetch');};
 await assert.rejects(()=>fortuneApi('requests'),error=>error.code==='NETWORK_ERROR'&&error.retryable&&!/Failed to fetch/.test(error.message));
});
test('a non-JSON gateway page keeps the retry contract without leaking the parse error',async()=>{
 globalThis.__fortuneFetch=async()=>new Response('<html>502 Bad Gateway</html>',{status:502,headers:{'Content-Type':'text/html'}});
 await assert.rejects(()=>fortuneApi('requests'),error=>error.status===502&&error.retryable&&/[가-힣]/.test(error.message)&&!/Unexpected token|JSON/.test(error.message));
});
