import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cloudflareTransport} from '../../scripts/lib/cloudflare-transport.mjs';
const offline=()=>{throw new TypeError('fetch failed');};
test('a stale read socket is retried with a fresh bounded request',async()=>{
 let calls=0;const delays=[],signals=[];
 const response=await cloudflareTransport('https://example.invalid',{},async(_url,opts)=>{calls++;signals.push(opts.signal);assert.equal(opts.headers.get('Connection'),'close');if(calls===1)offline();return {ok:true};},async ms=>delays.push(ms));
 assert.equal(response.ok,true);assert.equal(calls,2);assert.deepEqual(delays,[250]);assert.notEqual(signals[0],signals[1]);
});
test('persistent network failures have a finite read retry budget',async()=>{
 let calls=0;const delays=[];
 await assert.rejects(cloudflareTransport('https://example.invalid',{},async()=>{calls++;offline();},async ms=>delays.push(ms)),TypeError);
 assert.equal(calls,3);assert.deepEqual(delays,[250,500]);
});
test('mutations, caller cancellation and HTTP errors are never replayed',async()=>{
 for(const method of ['POST','PUT','PATCH','DELETE']){let calls=0;await assert.rejects(cloudflareTransport('https://example.invalid',{method},async(_url,opts)=>{calls++;assert.equal(opts.signal,undefined);offline();},async()=>{}));assert.equal(calls,1);}
 const controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(cloudflareTransport('https://example.invalid',{signal:controller.signal},async()=>{calls++;offline();},async()=>{}));assert.equal(calls,1);
 calls=0;const response=await cloudflareTransport('https://example.invalid',{},async()=>{calls++;return {ok:false,status:403};},async()=>{});assert.equal(response.status,403);assert.equal(calls,1);
});
