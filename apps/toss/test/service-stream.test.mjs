import test from 'node:test';
import assert from 'node:assert/strict';
import {forwardServiceResponse} from '../../../worker/toss/service-response.js';
import {createServiceFetch} from '../service/transport.mjs';

test('canonical transport delivers progress before completion and preserves cancellation',async()=>{
  let controller,cancelled;
  const stream=new ReadableStream({start(value){controller=value;},cancel(reason){cancelled=reason;}});
  const original=new Response(stream,{status:202,headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store, no-transform'}});
  const forwarded=forwardServiceResponse(original,{'Access-Control-Allow-Origin':'https://example.invalid','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  const fetch=createServiceFetch({origin:'https://example.invalid',nativeFetch:()=>{throw Error('No external fallback');},send:async()=>forwarded});
  const response=await fetch('/api/fusion-fortune/generate/stream',{method:'POST',body:'{}'});
  assert.equal(response.status,202);
  assert.equal(response.headers.get('Content-Type'),'text/event-stream');
  assert.equal(response.headers.get('Cache-Control'),'no-store, no-transform');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://example.invalid');
  const reader=response.body.getReader();
  controller.enqueue(new TextEncoder().encode('event: checkpoint\ndata: {"stage":1}\n\n'));
  const first=await reader.read();
  assert.equal(first.done,false);
  assert.match(new TextDecoder().decode(first.value),/checkpoint/);
  await reader.cancel('screen closed');
  assert.equal(cancelled,'screen closed');
});

test('forwarding retains JSON errors and empty responses',async()=>{
  const error=forwardServiceResponse(Response.json({error:'RESULT_ACCESS_REVOKED'},{status:403}),{});
  assert.equal(error.status,403);
  assert.deepEqual(await error.json(),{error:'RESULT_ACCESS_REVOKED'});
  const empty=forwardServiceResponse(new Response(null,{status:204}),{});
  assert.equal(empty.status,204);
  assert.equal(empty.body,null);
});

test('native saved reads override the canonical private cache policy',()=>{
  const response=forwardServiceResponse(Response.json({saved:true},{headers:{'Cache-Control':'private, max-age=300'}}),{'Cache-Control':'no-store'});
  assert.equal(response.headers.get('Cache-Control'),'no-store');
});
