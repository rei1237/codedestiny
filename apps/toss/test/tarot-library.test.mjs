import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TOSS_TAROT_LIBRARY_FLOWS,buildTarotLibraryBaseline,claimTarotLibraryDelivery,completeTarotLibraryDelivery,deliverTarotLibraryOrder,grantTarotLibraryOrder,tarotLibraryProduct,tarotLibraryResult} from '../../../worker/toss/tarot-library.js';

const order={orderId:'01900000-1111-7111-8111-000000000042',sku:'approved-tarot-library',status:'PAYMENT_COMPLETED'};
const auth={_id:'toss-identity',ownerId:'internal-owner',revision:0,environment:'SANDBOX'};
const rawProduct={kind:'tarot-library',tarotFlowId:'tarot-mindscan',featureKey:'tarot-mindscan',productId:'tarot-library:tarot-mindscan',sku:order.sku,approved:true,approvedPriceKRW:3000,priceEvidence:'mock-console-evidence'};

function fixture(){
  let data={purchases:{},executions:{}};let serial=Promise.resolve();
  return {get:()=>data,store:{transaction(task){const run=serial.then(async()=>{const draft=structuredClone(data);const tx={
    assertIdentity:async identity=>assert.equal(identity._id,auth._id),purchase:async id=>draft.purchases[id],execution:async id=>draft.executions[id],
    insertPurchase:async row=>{assert.equal(draft.purchases[row._id],undefined);draft.purchases[row._id]=row;},
    insertExecution:async row=>{assert.equal(draft.executions[row.orderId],undefined);draft.executions[row.orderId]=row;},
    claimExecution:async id=>{const row=draft.executions[id];if(!row||!['paid_pending_generation','generation_failed'].includes(row.status))return null;return draft.executions[id]={...row,status:'generating',error:null};},
    completeExecution:async(id,result)=>{const row=draft.executions[id];if(!row||row.status!=='generating')return null;return draft.executions[id]={...row,status:'completed',result,consumedAt:new Date(),completedAt:new Date(),error:null};},
  };const value=await task(tx);data=draft;return value;});serial=run.catch(()=>{});return run;}}};
}

test('tarot library defines all twelve flows without giving free local flows an IAP product',()=>{
  assert.equal(TOSS_TAROT_LIBRARY_FLOWS.length,12);
  assert.deepEqual(TOSS_TAROT_LIBRARY_FLOWS.filter(flow=>flow.access==='free-local').map(flow=>flow.id),['tarot','tarot-healing','tarot-self-esteem']);
  assert.ok(TOSS_TAROT_LIBRARY_FLOWS.filter(flow=>flow.access==='iap').every(flow=>flow.featureKeys.length));
});
test('approved Toss product must bind exactly one paid tarot flow and official feature key',()=>{
  assert.equal(tarotLibraryProduct(rawProduct).flow.id,'tarot-mindscan');
  assert.throws(()=>tarotLibraryProduct({...rawProduct,featureKey:'tarot-year-fortune'}),/TOSS_PRODUCT_NOT_APPROVED/);
  assert.throws(()=>tarotLibraryProduct({...rawProduct,tarotFlowId:'tarot-self-esteem',productId:'tarot-library:tarot-self-esteem'}),/TOSS_PRODUCT_NOT_APPROVED/);
});
test('duplicate IAP grants retain one owner-bound execution and never generate a result',async()=>{
  const f=fixture(),product=tarotLibraryProduct(rawProduct);
  const receipts=await Promise.all(Array.from({length:6},()=>grantTarotLibraryOrder({store:f.store,auth,order,product})));
  assert.equal(Object.keys(f.get().purchases).length,1);assert.equal(Object.keys(f.get().executions).length,1);
  assert.ok(receipts.every(receipt=>receipt.durable&&receipt.state==='paid_pending_generation'));
  const execution=f.get().executions[order.orderId];
  assert.equal(execution.result,null);assert.equal(execution.userId,auth.ownerId);assert.equal(execution.featureId,'tarot-mindscan');
});
test('stored result is readable only as a completed execution and never treats a failed generation as a new purchase',()=>{
  const product=tarotLibraryProduct(rawProduct),flow=product.flow;
  const pending={requestId:'toss-tarot:'+order.orderId,resultId:'toss-tarot-result:'+order.orderId,featureId:product.featureKey,status:'generation_failed'};
  assert.deepEqual(tarotLibraryResult(pending,flow),{requestId:pending.requestId,resultId:pending.resultId,flowId:flow.id,featureKey:product.featureKey,state:'generation_failed',result:null,canRetryNow:true});
  const completed={...pending,status:'completed',result:{title:'저장된 결과'}};
  assert.equal(tarotLibraryResult(completed,flow).result.title,'저장된 결과');
  assert.throws(()=>tarotLibraryResult({...pending,status:'refunded'},flow),/ORDER_REFUNDED/);
});
test('server delivery claims once, completes once, and replays the stored result without a new IAP grant',async()=>{
 const f=fixture(),product=tarotLibraryProduct(rawProduct);
 await grantTarotLibraryOrder({store:f.store,auth,order,product});
 const claim=await claimTarotLibraryDelivery({store:f.store,auth,orderId:order.orderId,flowId:product.flow.id});
 assert.equal(claim.state,'claimed');
 assert.equal((await claimTarotLibraryDelivery({store:f.store,auth,orderId:order.orderId,flowId:product.flow.id})).state,'in_progress');
 const completed=await completeTarotLibraryDelivery({store:f.store,auth,orderId:order.orderId,flowId:product.flow.id,result:{title:'저장된 마인드스캔'}});
 assert.equal(completed.state,'completed');
 assert.equal(completed.result.title,'저장된 마인드스캔');
 assert.equal((await claimTarotLibraryDelivery({store:f.store,auth,orderId:order.orderId,flowId:product.flow.id})).state,'completed');
});
test('a Toss tarot delivery stores only validated server-built card data',async()=>{
 const f=fixture(),product=tarotLibraryProduct(rawProduct);
 const input={question:'상대의 말과 행동이 달라 보여요.',cards:[
  ['M00','words'],['M01','actions'],['M02','gap'],['M03','boundary'],['M04','next'],
 ].map(([cardId,position],index)=>({cardId,position,orientation:index===1?'reversed':'upright'}))};
 await grantTarotLibraryOrder({store:f.store,auth,order,product,input});
 const completed=await deliverTarotLibraryOrder({store:f.store,auth,orderId:order.orderId,flowId:product.flow.id});
 assert.equal(completed.state,'completed');assert.equal(completed.result.flowId,'tarot-mindscan');
 assert.equal(completed.result.cards.length,5);assert.equal(completed.result.cards[1].orientation,'reversed');
 assert.equal(typeof completed.result.opening,'string');assert.equal(typeof completed.result.advice,'string');
 assert.equal(buildTarotLibraryBaseline(product.flow.id,input).cards[0].nameKr.length>0,true);
});
