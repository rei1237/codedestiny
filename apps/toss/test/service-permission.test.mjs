import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import {createServiceFetch} from '../service/transport.mjs';
for(const [status,code,pattern] of [[403,'REQUEST_FAILED',/접근할 권한/],[401,'SESSION_EXPIRED',/로그인/]])test(`transport preserves ${status} error semantics`,async()=>{
 let fallbacks=0;const request=createServiceFetch({origin:'https://miniapp.example',nativeFetch:()=>{fallbacks++;throw Error('web fallback forbidden');},send:async()=>{throw Object.assign(new Error('internal'),{status,code});}});const response=await request('/api/life-book-ai/prepare',{method:'POST',body:'{}'}),body=await response.json();assert.equal(response.status,status);assert.equal(body.error.code,code);assert.equal(body.code,code);assert.match(body.message,pattern);assert.equal(fallbacks,0);
});

for(const payload of [{error:'ORDER_OWNERSHIP_MISMATCH'},{reason:'RESULT_NOT_AVAILABLE'}])test('transport preserves a returned 403 reason and displays permission guidance',async()=>{
 let fallbacks=0;const request=createServiceFetch({origin:'https://miniapp.example',nativeFetch:()=>{fallbacks++;throw Error('web fallback forbidden');},send:async()=>Response.json({...payload,message:'일반 연결 오류'},{status:403,headers:{'Content-Length':'999'}})});const response=await request('/api/love-secret-ai/result'),body=await response.json();assert.equal(response.status,403);assert.match(body.message,/접근할 권한/);assert.equal(response.headers.get('Content-Length'),null);if(payload.reason)assert.equal(body.reason,payload.reason);else assert.equal(body.error.code,payload.error);assert.equal(fallbacks,0);
});

test('transport keeps a returned 401 code and requests login',async()=>{
 const request=createServiceFetch({origin:'https://miniapp.example',nativeFetch:()=>{throw Error('web fallback forbidden');},send:async()=>Response.json({error:'SESSION_EXPIRED'},{status:401})});const response=await request('/api/life-book-ai/result'),body=await response.json();assert.equal(response.status,401);assert.equal(body.error.code,'SESSION_EXPIRED');assert.match(body.message,/로그인/);
});

for(const status of [401,403])test('transport retains '+status+' for a non-JSON upstream response',async()=>{
 const request=createServiceFetch({origin:'https://miniapp.example',nativeFetch:()=>{throw Error('web fallback forbidden');},send:async()=>new Response('gateway failure',{status,headers:{'content-type':'text/html'}})});const response=await request('/api/records'),body=await response.json();assert.equal(response.status,status);assert.equal(response.headers.get('content-type'),'application/json');assert.match(body.message,status===401?/로그인/:/접근할 권한/);assert.equal(body.code,status===401?'LOGIN_REQUIRED':'ACCESS_DENIED');
});

test('transport does not turn an account change during error-body reading into a stale 401',async()=>{
 const request=createServiceFetch({origin:'https://miniapp.example',nativeFetch:()=>{throw Error('web fallback forbidden');},send:async()=>new Response(new ReadableStream({start(c){c.error(Object.assign(new Error('changed'),{code:'SESSION_CHANGED',status:409}));}}),{status:401})});const response=await request('/api/records'),body=await response.json();assert.equal(response.status,409);assert.equal(body.code,'SESSION_CHANGED');
});
