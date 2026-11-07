import test from 'node:test';
import assert from 'node:assert/strict';
import {grantNativeOrder,assertNativeIntent,nativeProduct,retainedNativeProduct} from '../../../worker/toss/native-consultation.js';
import {bindNativeTossRequest,nativeTossContext} from '../../../worker/toss/native-context.js';

const auth={_id:'owner-identity',ownerId:'owner',environment:'SANDBOX'};
const product={nativeService:'tea',featureKey:'fortune-tea-house-saju-consultation',productId:'native:tea:fortune-tea-house-saju-consultation',
 sku:'injected-test-only',approved:true,approvedPriceKRW:6000,priceEvidence:'offline fixture'};
const contract={requestId:'attempt',resultId:'fortune-tea-house:attempt',featureKey:product.featureKey,inputHash:'fixed-input',pricing:{amountKRW:6000}};
const initial={...auth,_id:'a'.repeat(64),identityId:auth._id,...contract,nativeService:'tea',sku:product.sku,approvedPriceKRW:6000,status:'prepared',orderId:null};
const order={orderId:'01900000-1111-7111-8111-000000000042',sku:product.sku,status:'PURCHASED'};
function store(){
 const state={purchases:new Map(),intent:structuredClone(initial),writes:0};
 return {state,transaction:async task=>{
  const before={purchases:new Map(state.purchases),intent:structuredClone(state.intent),writes:state.writes};
  try{return await task({
   assertIdentity:async user=>assert.equal(user._id,auth._id),
   purchase:async id=>state.purchases.get(id),
   insertPurchase:async row=>{state.purchases.set(row._id,row);state.writes++;},
   nativeIntent:async(id,owner)=>id===state.intent._id&&owner===state.intent.ownerId?state.intent:null,
   fundNativeIntent:async(id,owner,orderId)=>{assert.equal(id,state.intent._id);assert.equal(owner,state.intent.ownerId);assert.equal(state.intent.orderId,null);state.intent={...state.intent,orderId,status:'paid'};state.writes++;},
   assignPurchase:async(id,requestId)=>state.purchases.set(id,{...state.purchases.get(id),requestId}),
  });}catch(error){Object.assign(state,before);throw error;}
 }};
}
test('native catalogue requires approved exact service, feature and price evidence',()=>{
 assert.equal(nativeProduct(product,contract),product);
 for(const wrong of [{...product,approved:false},{...product,approvedPriceKRW:1},{...product,nativeService:'neo'},{...product,featureKey:'different'}])assert.throws(()=>nativeProduct(wrong,contract));
});
test('relationship report grants require its own approved SKU, price and immutable input',async()=>{
 const relation={...product,nativeService:'relationship',featureKey:'relationship-boundary-test',productId:'native:relationship:relationship-boundary-test'};
 const relationContract={...contract,featureKey:relation.featureKey};assert.equal(nativeProduct(relation,relationContract),relation);
 for(const wrong of [{...relation,approved:false},{...relation,featureKey:'love-secret-ai-consultation'},{...relation,approvedPriceKRW:1},{...relation,priceEvidence:''}])assert.throws(()=>nativeProduct(wrong,relationContract));
 const storage=store();storage.state.intent={...storage.state.intent,nativeService:'relationship',featureKey:relation.featureKey};
 const receipt=await grantNativeOrder({store:storage,auth,product:relation,order,requestId:initial._id});assert.equal(receipt.durable,true);
 assert.equal(storage.state.purchases.get(order.orderId).nativeService,'relationship');await assert.rejects(grantNativeOrder({store:storage,auth,product,order,requestId:initial._id}),/ORDER_OWNERSHIP_MISMATCH/);
});
test('astrology orders require their own approved feature and immutable price',async()=>{
 const astrology={...product,nativeService:'astrology',featureKey:'astrology-ai-consultation',productId:'native:astrology:astrology-ai-consultation'};
 const astrologyContract={...contract,featureKey:astrology.featureKey};
 assert.equal(nativeProduct(astrology,astrologyContract),astrology);
 for(const wrong of [{...astrology,approved:false},{...astrology,featureKey:product.featureKey},{...astrology,approvedPriceKRW:1},{...astrology,priceEvidence:''}])assert.throws(()=>nativeProduct(wrong,astrologyContract));
 const storage=store();storage.state.intent={...storage.state.intent,nativeService:'astrology',featureKey:astrology.featureKey};
 const receipt=await grantNativeOrder({store:storage,auth,product:astrology,order,requestId:initial._id});
 assert.equal(receipt.durable,true);assert.equal(storage.state.purchases.get(order.orderId).nativeService,'astrology');
 await assert.rejects(grantNativeOrder({store:storage,auth,product,order,requestId:initial._id}),/ORDER_OWNERSHIP_MISMATCH/);
});
test('Vedic orders cannot use another service, price or unapproved SKU',async()=>{
 const vedic={...product,nativeService:'vedic',featureKey:'vedic-ai-consultation',productId:'native:vedic:vedic-ai-consultation'};
 const vedicContract={...contract,featureKey:vedic.featureKey};assert.equal(nativeProduct(vedic,vedicContract),vedic);
 for(const wrong of [{...vedic,approved:false},{...vedic,featureKey:'astrology-ai-consultation'},{...vedic,approvedPriceKRW:1},{...vedic,priceEvidence:''}])assert.throws(()=>nativeProduct(wrong,vedicContract));
 const storage=store();storage.state.intent={...storage.state.intent,nativeService:'vedic',featureKey:vedic.featureKey};
 const receipt=await grantNativeOrder({store:storage,auth,product:vedic,order,requestId:initial._id});assert.equal(receipt.durable,true);
 await assert.rejects(grantNativeOrder({store:storage,auth,product,order,requestId:initial._id}),/ORDER_OWNERSHIP_MISMATCH/);
});
test('Ziwei orders require their own approved feature and immutable price',async()=>{
 const ziwei={...product,nativeService:'ziwei',featureKey:'ziwei-ai-consultation',productId:'native:ziwei:ziwei-ai-consultation'};
 const ziweiContract={...contract,featureKey:ziwei.featureKey};assert.equal(nativeProduct(ziwei,ziweiContract),ziwei);
 for(const wrong of [{...ziwei,approved:false},{...ziwei,featureKey:'vedic-ai-consultation'},{...ziwei,approvedPriceKRW:1},{...ziwei,priceEvidence:''}])assert.throws(()=>nativeProduct(wrong,ziweiContract));
 const storage=store();storage.state.intent={...storage.state.intent,nativeService:'ziwei',featureKey:ziwei.featureKey};
 const receipt=await grantNativeOrder({store:storage,auth,product:ziwei,order,requestId:initial._id});assert.equal(receipt.durable,true);
 await assert.rejects(grantNativeOrder({store:storage,auth,product,order,requestId:initial._id}),/ORDER_OWNERSHIP_MISMATCH/);
});
test('Karma orders require their own approved product, price and owner',async()=>{
 const karma={...product,nativeService:'karma',featureKey:'karma-destiny-ai-consultation',productId:'native:karma:karma-destiny-ai-consultation'};
 const karmaContract={...contract,featureKey:karma.featureKey};assert.equal(nativeProduct(karma,karmaContract),karma);
 for(const wrong of [{...karma,approved:false},{...karma,featureKey:'new-year-ai-consultation'},{...karma,approvedPriceKRW:1},{...karma,priceEvidence:''}])assert.throws(()=>nativeProduct(wrong,karmaContract));
 const storage=store();storage.state.intent={...storage.state.intent,nativeService:'karma',featureKey:karma.featureKey};
 const receipt=await grantNativeOrder({store:storage,auth,product:karma,order,requestId:initial._id});assert.equal(receipt.durable,true);
 await assert.rejects(grantNativeOrder({store:storage,auth,product,order,requestId:initial._id}),/ORDER_OWNERSHIP_MISMATCH/);
});
test('one original consultation input binds one order atomically and grant retries never generate',async()=>{
 const storage=store(),args={store:storage,auth,product,order,requestId:initial._id};
 const first=await grantNativeOrder(args),again=await grantNativeOrder(args);
 assert.deepEqual(first,again);assert.equal(first.durable,true);assert.equal(storage.state.writes,2);
 await assert.rejects(grantNativeOrder({...args,order:{...order,orderId:'01900000-1111-7111-8111-000000000043'}}),/REQUEST_ALREADY_FUNDED/);
 assert.equal(storage.state.purchases.size,1);
 await assert.rejects(grantNativeOrder({...args,requestId:'b'.repeat(64)}),/ORDER_ALREADY_ASSIGNED/);
});
test('recovery can retain an unassigned right but never attach another account or changed input',async()=>{
 const storage=store(),args={store:storage,auth,product,order};
 const unassigned=await grantNativeOrder(args);assert.equal(unassigned.requestId,null);assert.equal(storage.state.intent.status,'prepared');
 await assert.rejects(grantNativeOrder({...args,auth:{...auth,environment:'DEFAULT'},requestId:initial._id}),/ORDER_OWNERSHIP_MISMATCH/);
 await assert.rejects(grantNativeOrder({...args,requestId:'b'.repeat(64)}),/RESULT_NOT_FOUND/);
 assert.throws(()=>assertNativeIntent(initial,{...auth,ownerId:'another'}),/RESULT_NOT_FOUND/);
 assert.throws(()=>assertNativeIntent(initial,auth,{...contract,inputHash:'forged'}),/REQUEST_INPUT_MISMATCH/);
 assert.throws(()=>assertNativeIntent({...initial,status:'refunded'},auth),/ORDER_REFUNDED/);
 const receipt=await grantNativeOrder({...args,requestId:initial._id});assert.equal(receipt.requestId,initial._id);
 storage.state.purchases.get(order.orderId).status='REFUNDED';
 await assert.rejects(grantNativeOrder({...args,requestId:initial._id}),/ORDER_REFUNDED/);
});
test('native authority is bound to the server request identity and cannot cross a clone',()=>{
 const request=new Request('https://example.invalid',{headers:{'X-Toss-Owner':'forged'}});
 assert.equal(nativeTossContext(request),null);
 bindNativeTossRequest(request,{auth});assert.equal(nativeTossContext(request).auth,auth);
 assert.equal(nativeTossContext(request.clone()),null);
 assert.throws(()=>bindNativeTossRequest(request,{auth}),/ALREADY_BOUND/);
});

test('retained purchases keep their own price snapshot and require the original owner',()=>{
 const row={...product,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,status:'PURCHASED',approvedPriceKRW:5000};
 assert.equal(retainedNativeProduct(row,auth).approvedPriceKRW,5000);
 assert.throws(()=>retainedNativeProduct(row,{...auth,ownerId:'other'}),/RESULT_NOT_FOUND/);
 assert.throws(()=>retainedNativeProduct({...row,status:'REFUNDED'},auth),/ORDER_REFUNDED/);
});

test('native Neo grant binds only the approved strategy SKU and keeps its own service identity',async()=>{
 const neo={...product,nativeService:'neo',featureKey:'neo-operation-room-consultation',productId:'native:neo:neo-operation-room-consultation'};
 assert.equal(nativeProduct(neo,{...contract,featureKey:neo.featureKey}),neo);
 const storage=store();storage.state.intent={...storage.state.intent,nativeService:'neo',featureKey:neo.featureKey};
 await grantNativeOrder({store:storage,auth,product:neo,order,requestId:initial._id});
 assert.equal(storage.state.purchases.get(order.orderId).nativeService,'neo');
 assert.equal(storage.state.purchases.get(order.orderId).serviceId,'neo');
 await assert.rejects(grantNativeOrder({store:storage,auth,product,order,requestId:initial._id}),/ORDER_OWNERSHIP_MISMATCH/);
});
