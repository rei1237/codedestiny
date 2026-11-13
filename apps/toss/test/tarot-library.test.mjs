import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TAROT_DELIVERY_LEASE_MS,freeTarotReading,failTarotLibraryDelivery,TOSS_TAROT_LIBRARY_FLOWS,attachTarotLibraryInput,claimTarotLibraryDelivery,completeTarotLibraryDelivery,deliverTarotLibraryOrder,grantTarotLibraryOrder,tarotLibraryProduct,tarotLibraryResult} from '../../../worker/toss/tarot-library.js';
import {generateTarotLibraryResult} from '../../../worker/toss/tarot-library-generator.js';

const order={orderId:'01900000-1111-7111-8111-000000000042',sku:'approved-tarot-library',status:'PAYMENT_COMPLETED'};
const auth={_id:'toss-identity',ownerId:'internal-owner',revision:0,environment:'SANDBOX'};
const rawProduct={kind:'tarot-library',tarotFlowId:'tarot-mindscan',featureKey:'tarot-mindscan',productId:'tarot-library:tarot-mindscan',sku:order.sku,approved:true,approvedPriceKRW:3000,priceEvidence:'mock-console-evidence'};
const validInput={question:'상대의 말과 행동을 어떻게 살펴볼까요?',picks:Array.from({length:10},(_,i)=>i)};

function fixture(){
  let data={purchases:{},executions:{}};let serial=Promise.resolve();
  return {get:()=>data,store:{transaction(task){const run=serial.then(async()=>{const draft=structuredClone(data);const tx={
    assertIdentity:async identity=>assert.equal(identity._id,auth._id),purchase:async id=>draft.purchases[id],execution:async id=>draft.executions[id],
    insertPurchase:async row=>{assert.equal(draft.purchases[row._id],undefined);draft.purchases[row._id]=row;},
    insertExecution:async row=>{assert.equal(draft.executions[row.orderId],undefined);draft.executions[row.orderId]=row;},
    attachExecutionInput:async(id,input)=>{const row=draft.executions[id];if(!row||row.input||row.status!=='paid_pending_generation')return null;row.input=input;return row;},
    claimExecution:async(id,{token,now,until})=>{const row=draft.executions[id];if(!row||!(['paid_pending_generation','partial','generation_failed'].includes(row.status)||row.status==='generating'&&row.tossDeliveryLeaseUntil&&row.tossDeliveryLeaseUntil<=now))return null;return draft.executions[id]={...row,status:'generating',error:null,tossDeliveryToken:token,tossDeliveryLeaseUntil:until};},
    pauseTarot:async(id,token,retryable)=>{const row=draft.executions[id];assert.equal(row.tossDeliveryToken,token);row.status=retryable?'partial':'generation_failed';row.tossDeliveryToken='';return row;},
    saveTarotCheckpoint:async(id,token,state)=>{const row=draft.executions[id];assert.equal(row.tossDeliveryToken,token);row.tossTarotCheckpoint=structuredClone(state);},
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
const card=(i,position='slot_'+i)=>({cardId:'M'+String(i).padStart(2,'0'),orientation:i%2?'reversed':'upright',position,positionLabel:'질문의 자리 '+i,positionDescription:'이 자리의 의미 '+i});
const keys=['tarot-prompt-maker','tarot-prompt-maker-standard','tarot-prompt-maker-deep','tarot-prompt-maker-master'];
test('each oracle SKU verifies the web card count tier then preserves every original chapter across resume and reread',async()=>{
  const {seedTarotOracleNarrative,tarotOracleNarrativeAdapter}=await import('../../../worker/lib/tarot-oracle-delivery.js');
  for(const [index,count] of [3,5,10,14].entries()){
    const featureKey=keys[index],id='tarot-prompt-maker',f=fixture(),product=tarotLibraryProduct({...rawProduct,productId:'tarot-library:'+id,tarotFlowId:id,featureKey});
    const input={spreadTitle:'원본 배열',category:'love',question:'관계의 다음 선택이 궁금해요',cards:Array.from({length:count},(_,i)=>card(i))};
    const wrong=tarotLibraryProduct({...product,featureKey:keys[(index+1)%4]});
    await assert.rejects(grantTarotLibraryOrder({store:f.store,auth,order,product:wrong,input}),/INPUT_INVALID/);
    await grantTarotLibraryOrder({store:f.store,auth,order,product,input});
    const args={store:f.store,auth,orderId:order.orderId,flowId:id};
    let calls=0,original;
    const narrate=async(env,owner,key,body,verify)=>{
      await verify();assert.equal(owner,auth.ownerId);assert.equal(key,featureKey);assert.deepEqual(body.cards,input.cards);
      if(++calls===1)return {ok:true,status:'partial',retryable:true};
      const state=seedTarotOracleNarrative(body,{});
      assert.ok(state.tasks.reduce((sum,t)=>sum+t.minChars,0)>=8000);
      const parts=Object.fromEntries(state.tasks.map(t=>[t.id,'[모의] '+t.title+'의 첫 문단\n\n[모의] 다음 문단 '+t.id]));
      original=tarotOracleNarrativeAdapter({}).render({...state,body,parts,locale:'ko'});
      return {...original,saved:true,status:'completed'};
    };
    const generate=(id,input,options)=>generateTarotLibraryResult(id,input,{...options,narrate});
    const pending=await deliverTarotLibraryOrder({...args,generate});assert.equal(pending.state,'partial');assert.equal(pending.canRetryNow,true);
    const saved=await deliverTarotLibraryOrder({...args,generate});assert.equal(saved.state,'completed');
    assert.deepEqual(saved.result.reading,original.consultation);
    assert.deepEqual(saved.result.presentation.sections,original.sections.map(({title,body})=>({title,body})));
    assert.deepEqual((await deliverTarotLibraryOrder({...args,generate})).result,saved.result);assert.equal(calls,2);
    await assert.rejects(deliverTarotLibraryOrder({...args,auth:{...auth,ownerId:'other'}}),/OWNERSHIP/);
  }
});
test('love and mindscan send the selected slots to a committed server draw and receive all source sections',async()=>{
  for(const [id,count] of [['tarot-love-relationship',6],['tarot-mindscan',10]]){
    const f=fixture(),product=tarotLibraryProduct({...rawProduct,tarotFlowId:id,featureKey:id,productId:'tarot-library:'+id});
    const input={...validInput,picks:validInput.picks.slice(0,count)},cards=input.picks.map(i=>card(i));
    const args={store:f.store,auth,orderId:order.orderId,flowId:id};
    await grantTarotLibraryOrder({store:f.store,auth,order,product,input});
    const result=await deliverTarotLibraryOrder({...args,generate:(id,input,options)=>generateTarotLibraryResult(id,input,{...options,
      deal:async(_env,body)=>{assert.deepEqual(body.picks,input.picks);assert.equal(body.drawId,'toss-tarot:'+order.orderId);return {cards};},
      narrate:async(_env,_owner,key,body,verify)=>{await verify();assert.equal(key,id);
        if(count===10){
          assert.deepEqual(body.pairs,cards.slice(0,5).map((c,i)=>({mainCardId:c.cardId,subCardId:cards[i+5].cardId})));
        }else{assert.deepEqual(body.cards,cards);assert.equal(body.userQuestion,input.question);}
        return {saved:true,status:'completed',reading:{sections:cards.slice(0,5)},deliverySections:cards.map(c=>({title:c.positionLabel,body:'[모의] '+c.position}))};
      },
    })});
    assert.equal(result.result.cards.length,count);assert.equal(result.result.presentation.sections.length,count);
  }
});

test('a failed generator returns the existing order to an explicit retry state',async()=>{
  const f=fixture(),product=tarotLibraryProduct(rawProduct);
  const input=validInput;
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

test('the five free web readings preserve their original card and chapter data',async()=>{
  const ids=['tarot-reunion','tarot-crystal-soul','tarot-year-fortune','tarot-numerology','tarot-ijik'];
  for(const id of ids){
    const flow=TOSS_TAROT_LIBRARY_FLOWS.find(row=>row.id===id);
    const cards=flow.positions.map(([position],i)=>({position,cardId:'M'+String(i).padStart(2,'0'),orientation:i%2?'reversed':'upright'}));
    const result=await freeTarotReading(id,{question:'나의 선택을 어떻게 돌아볼까요?',birthDate:'1990-01-01',topic:'career',name:'은하',gem:'rose_quartz',cards});
    assert.equal(result.flowId,id);
    assert.deepEqual(result.cards.map(card=>card.code),cards.map(card=>card.cardId));
    assert.ok(result.presentation.sections.length);
    assert.ok(result.presentation.summary.length);
    assert.doesNotMatch(JSON.stringify(result.presentation),/\[object Object\]/);
    if(id==='tarot-reunion')assert.equal(result.presentation.sections[0].body,result.reading.positions[0].detailedReading);
    if(id==='tarot-crystal-soul'){
      assert.equal(result.reading.gem,'rose_quartz');
      assert.deepEqual(result.reading.cards.map(card=>card.orientation),cards.map(card=>card.orientation));
    }
    if(id==='tarot-year-fortune')assert.equal(result.presentation.sections.length,12);
    if(id==='tarot-numerology'){
      assert.equal(result.reading.topic,'career');assert.match(result.reading.opening,/은하/);
      assert.equal(result.reading.cards.length,5);
      assert.ok(result.reading.quintessence);
    }
  }
  assert.throws(()=>freeTarotReading('tarot-prompt-maker',{}),/TAROT_LIBRARY_FLOW_INVALID/);
});
