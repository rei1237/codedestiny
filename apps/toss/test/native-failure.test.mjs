import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import {nativeFailureResponse,TOSS_UNCERTAIN_DELIVERY_MESSAGE} from '../../../worker/toss/native-failure.js';
for(const reason of ['SERVER_ERROR','LLM_ERROR','RESULT_EMPTY','SAJU_CALCULATION_FAILED','GENERATION_ALREADY_FAILED','LLM_FAILED','GENERATION_FAILED'])test(`Toss ${reason} does not assert a web refund`,async()=>{
 const before=Response.json({ok:false,reason,message:'차감되지 않았습니다',errorId:'mock-id',retryable:true},{status:503,headers:{'X-Mock':'yes','Content-Length':'999'}});const response=await nativeFailureResponse(before),body=await response.json();
 assert.equal(response.status,503);assert.equal(response.headers.get('X-Mock'),'yes');assert.equal(response.headers.get('Content-Length'),null);assert.equal(body.reason,reason);assert.equal(body.errorId,'mock-id');assert.equal(body.retryable,true);assert.equal(body.message,TOSS_UNCERTAIN_DELIVERY_MESSAGE);
});
test('permission and input errors are preserved exactly',async()=>{for(const reason of ['ORDER_OWNERSHIP_MISMATCH','INVALID_INPUT']){const before=Response.json({ok:false,reason,message:'원래 안내'},{status:403});const response=await nativeFailureResponse(before);assert.equal(response,before);assert.equal((await response.json()).reason,reason);}});
test('successful results are not parsed or rewritten',async()=>{const before=Response.json({ok:true,reason:'LLM_ERROR',message:'stored result'});const response=await nativeFailureResponse(before);assert.equal(response,before);assert.equal((await response.json()).message,'stored result');});

test('a 403 remains a permission error even with a generic reason',async()=>{const before=Response.json({ok:false,reason:'SERVER_ERROR',message:'권한 오류'},{status:403});const response=await nativeFailureResponse(before);assert.equal(response,before);assert.equal((await response.json()).message,'권한 오류');});
