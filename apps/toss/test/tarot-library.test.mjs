import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TAROT_DELIVERY_LEASE_MS,failTarotLibraryDelivery,TOSS_TAROT_LIBRARY_FLOWS,attachTarotLibraryInput,buildTarotLibraryBaseline,claimTarotLibraryDelivery,completeTarotLibraryDelivery,deliverTarotLibraryOrder,grantTarotLibraryOrder,tarotLibraryProduct,tarotLibraryResult} from '../../../worker/toss/tarot-library.js';
import {generateTarotLibraryResult} from '../../../worker/toss/tarot-library-generator.js';

const order={orderId:'01900000-1111-7111-8111-000000000042',sku:'approved-tarot-library',status:'PAYMENT_COMPLETED'};
const auth={_id:'toss-identity',ownerId:'internal-owner',revision:0,environment:'SANDBOX'};
const rawProduct={kind:'tarot-library',tarotFlowId:'tarot-mindscan',featureKey:'tarot-mindscan',productId:'tarot-library:tarot-mindscan',sku:order.sku,approved:true,approvedPriceKRW:3000,priceEvidence:'mock-console-evidence'};
const validInput={question:'상대의 말과 행동을 어떻게 살펴볼까요?',cards:['words','actions','gap','boundary','next'].map((position,index)=>({cardId:`M0${index}`,position,orientation:'upright'}))};

function fixture(){
  let data={purchases:{},executions:{}};let serial=Promise.resolve();
  return {get:()=>data,store:{transaction(task){const run=serial.then(async()=>{const draft=structuredClone(data);const tx={
    assertIdentity:async identity=>assert.equal(identity._id,auth._id),purchase:async id=>draft.purchases[id],execution:async id=>draft.executions[id],
    insertPurchase:async row=>{assert.equal(draft.purchases[row._id],undefined);draft.purchases[row._id]=row;},
    insertExecution:async row=>{assert.equal(draft.executions[row.orderId],undefined);draft.executions[row.orderId]=row;},
    attachExecutionInput:async(id,input)=>{const row=draft.executions[id];if(!row||row.input||row.status!=='paid_pending_generation')return null;row.input=input;return row;},
    claimExecution:async(id,{token,now,until})=>{const row=draft.executions[id];if(!row||!(['paid_pending_generation','generation_failed'].includes(row.status)||row.status==='generating'&&row.tossDeliveryLeaseUntil&&row.tossDeliveryLeaseUntil<=now))return null;return draft.executions[id]={...row,status:'generating',error:null,tossDeliveryToken:token,tossDeliveryLeaseUntil:until};},
    completeExecution:async(id,result,token)=>{const row=draft.executions[id];if(!row||row.status!=='generating'||row.tossDeliveryToken!==token)return null;return draft.executions[id]={...row,status:'completed',result,consumedAt:new Date(),completedAt:new Date(),error:null};},
    failExecution:async(id,error,token)=>{const row=draft.executions[id];if(!row||row.status!=='generating'||row.tossDeliveryToken!==token)return null;return draft.executions[id]={...row,status:'generation_failed',error};},
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
  const pending={requestId:'toss-tarot:'+order.orderId,resultId:'toss-tarot-result:'+order.orderId,featureId:product.featureKey,status:'generation_failed',input:validInput};
  assert.deepEqual(tarotLibraryResult(pending,flow),{requestId:pending.requestId,resultId:pending.resultId,flowId:flow.id,featureKey:product.featureKey,state:'generation_failed',result:null,canRetryNow:true});
  const completed={...pending,status:'completed',result:{title:'저장된 결과'}};
  assert.equal(tarotLibraryResult(completed,flow).result.title,'저장된 결과');
  assert.throws(()=>tarotLibraryResult({...pending,status:'refunded'},flow),/ORDER_REFUNDED/);
});
test('server delivery claims once, completes once, and replays the stored result without a new IAP grant',async()=>{
 const f=fixture(),product=tarotLibraryProduct(rawProduct);
 await grantTarotLibraryOrder({store:f.store,auth,order,product,input:validInput});
 const claim=await claimTarotLibraryDelivery({store:f.store,auth,orderId:order.orderId,flowId:product.flow.id});
 assert.equal(claim.state,'claimed');
 assert.equal((await claimTarotLibraryDelivery({store:f.store,auth,orderId:order.orderId,flowId:product.flow.id})).state,'in_progress');
 const completed=await completeTarotLibraryDelivery({store:f.store,auth,orderId:order.orderId,flowId:product.flow.id,token:claim.execution.tossDeliveryToken,result:{title:'저장된 마인드스캔'}});
 assert.equal(completed.state,'completed');
 assert.equal(completed.result.title,'저장된 마인드스캔');
 assert.equal((await claimTarotLibraryDelivery({store:f.store,auth,orderId:order.orderId,flowId:product.flow.id})).state,'completed');
});

test('recovery without input remains actionable, attaches once, and never requires another purchase',async()=>{
 const f=fixture(),product=tarotLibraryProduct(rawProduct);
 await grantTarotLibraryOrder({store:f.store,auth,order,product});
 const args={store:f.store,auth,orderId:order.orderId,flowId:product.flow.id};
 const pending=await deliverTarotLibraryOrder({...args,generate:()=>assert.fail('no input must not generate')});
 assert.equal(pending.state,'input_required');assert.equal(pending.canRetryNow,false);
 assert.equal(f.get().executions[order.orderId].status,'paid_pending_generation');
 await attachTarotLibraryInput({...args,input:validInput});
 await attachTarotLibraryInput({...args,input:{...validInput,question:'교체하면 안 되는 질문'}});
 assert.equal(f.get().executions[order.orderId].input.question,validInput.question);
 assert.equal(tarotLibraryResult(f.get().executions[order.orderId],product.flow).canRetryNow,true);
 let calls=0;
 const generate=async()=>{calls++;return {title:'저장된 결과'};};
 assert.equal((await deliverTarotLibraryOrder({...args,generate})).state,'completed');
 assert.equal((await deliverTarotLibraryOrder({...args,generate})).result.title,'저장된 결과');
 assert.equal(calls,1);assert.equal(Object.keys(f.get().purchases).length,1);
});

test('recovery input rejects a different owner, environment, flow, or refunded order',async()=>{
 const f=fixture(),product=tarotLibraryProduct(rawProduct);
 await grantTarotLibraryOrder({store:f.store,auth,order,product});
 const args={store:f.store,auth,orderId:order.orderId,flowId:product.flow.id,input:validInput};
 await assert.rejects(attachTarotLibraryInput({...args,auth:{...auth,ownerId:'other'}}),/OWNERSHIP/);
 await assert.rejects(attachTarotLibraryInput({...args,auth:{...auth,environment:'DEFAULT'}}),/OWNERSHIP/);
 await assert.rejects(attachTarotLibraryInput({...args,flowId:'tarot-reunion'}));
 assert.equal(f.get().executions[order.orderId].input,null);
 f.get().purchases[order.orderId].status='REFUNDED';
 await assert.rejects(attachTarotLibraryInput(args),/ORDER_REFUNDED/);
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

test('each paid flow uses its service generator and keeps a service-specific presentation',async()=>{
  const oracleGenerator=async input=>({ok:true,consultation:{coreQuestion:'질문의 핵심',closingLine:'마무리 조언',actions:['오늘의 행동'],positionReadings:input.cards.map(card=>({headline:card.positionLabel,reading:'카드가 비춘 조건을 차분히 살핍니다.'}))}});
  for(const flow of TOSS_TAROT_LIBRARY_FLOWS.filter(item=>item.access==='iap')){
    const input={question:'지금 관계와 선택의 기준이 궁금해요.',cards:[]};
    input.cards=flow.positions.map(([position],index)=>({cardId:`M${String(index).padStart(2,'0')}`,position,orientation:index%2?'reversed':'upright'}));
    if(flow.id==='tarot-numerology')input.birthDate='1994-04-18';
    if(flow.id==='tarot-crystal-soul')input.gem='amethyst';
    const result=await generateTarotLibraryResult(flow.id,input,{oracleGenerator});
    assert.equal(result.flowId,flow.id);assert.equal(result.renderer,flow.resultKind==='career'?'career':flow.resultKind);
    assert.equal(result.cards.length,flow.cardCount);assert.equal(typeof result.presentation.opening,'string');
  }
});

test('a failed generator returns the existing order to an explicit retry state',async()=>{
  const f=fixture(),product=tarotLibraryProduct(rawProduct);
  const input={question:'상대의 말과 행동이 달라 보여요.',cards:[['M00','words'],['M01','actions'],['M02','gap'],['M03','boundary'],['M04','next']].map(([cardId,position])=>({cardId,position,orientation:'upright'}))};
  await grantTarotLibraryOrder({store:f.store,auth,order,product,input});
  const failed=await deliverTarotLibraryOrder({store:f.store,auth,orderId:order.orderId,flowId:product.flow.id,generate:async()=>{throw Object.assign(Error('mock failure'),{code:'MOCK_FAILURE'});}});
  assert.equal(failed.state,'generation_failed');assert.equal(failed.canRetryNow,true);assert.equal(f.get().executions[order.orderId].error.code,'MOCK_FAILURE');
  const completed=await deliverTarotLibraryOrder({store:f.store,auth,orderId:order.orderId,flowId:product.flow.id,generate:async()=>({title:'재시도 결과'})});
  assert.equal(completed.state,'completed');assert.equal(completed.result.title,'재시도 결과');
});


test('expired delivery resumes once and fences late completion and failure from its prior worker',async()=>{
 const f=fixture(),product=tarotLibraryProduct(rawProduct);
 await grantTarotLibraryOrder({store:f.store,auth,order,product,input:validInput});
 const args={store:f.store,auth,orderId:order.orderId,flowId:product.flow.id};
 const first=await claimTarotLibraryDelivery({...args,now:new Date(Date.now()-TAROT_DELIVERY_LEASE_MS-1000)});
 assert.equal(tarotLibraryResult(first.execution,product.flow).canRetryNow,true);
 const claims=await Promise.all([claimTarotLibraryDelivery(args),claimTarotLibraryDelivery(args)]);
 assert.deepEqual(claims.map(c=>c.state),['claimed','in_progress']);
 const current=claims[0].execution.tossDeliveryToken;
 assert.notEqual(current,first.execution.tossDeliveryToken);
 await assert.rejects(completeTarotLibraryDelivery({...args,token:first.execution.tossDeliveryToken,result:{title:'stale'}}),/DELIVERY_NOT_CLAIMED/);
 await assert.rejects(failTarotLibraryDelivery({...args,token:first.execution.tossDeliveryToken,error:Error('late')}),/DELIVERY_NOT_CLAIMED/);
 assert.equal(f.get().executions[order.orderId].tossDeliveryToken,current);
 const completed=await completeTarotLibraryDelivery({...args,token:current,result:{title:'resumed'}});
 assert.equal(completed.result.title,'resumed');
 assert.equal(Object.keys(f.get().purchases).length,1);
});
