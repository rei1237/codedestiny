import {TossNativeConsultation,TossPurchase,TossIdentity} from './models.js';
import {APPROVED_TOSS_NATIVE_PRODUCTS} from './catalog.js';
import {hash,unseal} from './crypto.js';
import {TossError} from './policy.js';
import {lookupOrder} from './partner.js';
import {recordTossRefund,purchaseStore} from './purchases.js';
import {assertNativeIntent,nativeProduct,retainedNativeProduct,grantNativeOrder} from './native-consultation.js';
import {bindNativeTossRequest} from './native-context.js';
import {nativeTeaContract,nativeTeaStoredState,handleFortuneTeaHouseRoutes} from '../routes/fortune-tea-house.js';
import {getBillingFeaturePricing} from '../lib/billing-feature-registry.js';

const intentId=(auth,contract)=>hash(JSON.stringify([auth._id,auth.environment,'tea',contract.requestId]));
const ownerFilter=auth=>({identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:'tea'});
const view=row=>({id:row._id,sku:row.sku,amountKRW:row.approvedPriceKRW,paid:row.status==='paid',resultId:row.resultId,orderId:row.orderId});

export function approvedNativeTeaProduct(sku){
  const item=APPROVED_TOSS_NATIVE_PRODUCTS.find(product=>product.sku===sku);
  const pricing=getBillingFeaturePricing({featureKey:item?.featureKey});
  return nativeProduct(item,{featureKey:item?.featureKey,pricing:pricing.pricing||{}});
}
export function nativeTeaCatalog(){
  return APPROVED_TOSS_NATIVE_PRODUCTS.map(item=>{
    const product=approvedNativeTeaProduct(item.sku);
    return {id:product.productId,name:'운명의 찻집',sku:product.sku,featureKey:product.featureKey,
      approvedPriceKRW:product.approvedPriceKRW,available:true};
  });
}

export async function prepareNativeTea(env,auth,input,orderId){
  const contract=nativeTeaContract(input),id=await intentId(auth,contract);
  const previous=await TossNativeConsultation.findOne({_id:id,...ownerFilter(auth)}).lean();
  const recovered=orderId?await TossPurchase.findOne({_id:orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:'tea'}).lean():null;
  if(orderId&&!recovered)throw new TossError('RESULT_NOT_FOUND',404);
  if(recovered?.requestId&&recovered.requestId!==id)throw new TossError('ORDER_ALREADY_ASSIGNED',409);
  if(previous){
    assertNativeIntent(previous,auth,contract);
    if(!orderId||previous.status==='paid')return view(previous);
  }
  const product=recovered?retainedNativeProduct(recovered,auth):nativeProduct(APPROVED_TOSS_NATIVE_PRODUCTS.find(item=>item.nativeService==='tea'&&item.featureKey===contract.featureKey),contract);
  if(product.featureKey!==contract.featureKey)throw new TossError('ORDER_PRODUCT_MISMATCH',409);
  const saved=await TossNativeConsultation.findOneAndUpdate({_id:id},{$setOnInsert:{
    ...ownerFilter(auth),...contract,input,pricing:{...contract.pricing,amountKRW:product.approvedPriceKRW},sku:product.sku,
    approvedPriceKRW:product.approvedPriceKRW,priceEvidence:product.priceEvidence,status:'prepared',orderId:null,
  }},{upsert:true,new:true,runValidators:true}).lean();
  if(recovered){
    assertNativeIntent(saved,auth,contract);
    const order=await lookupOrder(env,auth.userKey,orderId);
    if(order.orderId!==orderId||order.sku!==product.sku)throw new TossError('ORDER_MISMATCH',403);
    if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
    await grantNativeOrder({store:purchaseStore,auth,order,product,requestId:id});
    return readNativeTeaIntent(env,auth,id);
  }
  return view(assertNativeIntent(saved,auth,contract));
}

async function verifiedIntent(env,auth,intent){
  assertNativeIntent(intent,auth);
  if(!intent.orderId||intent.status!=='paid')throw new TossError('PAYMENT_REQUIRED',402);
  const purchase=await TossPurchase.findOne({_id:intent.orderId,identityId:auth._id,ownerId:auth.ownerId,
    environment:auth.environment,nativeService:'tea',requestId:intent._id,featureKey:intent.featureKey,sku:intent.sku}).lean();
  if(!purchase)throw new TossError('RESULT_NOT_FOUND',404);
  if(purchase.status==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);
  if(!await TossIdentity.findOne({_id:auth._id,ownerId:auth.ownerId,active:true,revision:auth.revision}).lean())throw new TossError('SESSION_EXPIRED',401);
  const order=await lookupOrder(env,auth.userKey,purchase._id);
  if(order.orderId!==purchase._id||order.sku!==purchase.sku)throw new TossError('ORDER_MISMATCH',403);
  if(order.status==='REFUNDED'){await recordTossRefund(auth,order);throw new TossError('ORDER_REFUNDED',409);}
  if(!['PURCHASED','PAYMENT_COMPLETED'].includes(order.status))throw new TossError('ORDER_NOT_PAID',409);
  return intent;
}

function teaContext(env,auth){
  const nativeAuth={userId:auth.userId,tossNative:true};
  return {
    auth:nativeAuth,
    async access(body){
      const contract=nativeTeaContract(body),id=await intentId(auth,contract);
      const saved=await TossNativeConsultation.findOne({_id:id,...ownerFilter(auth)}).lean();
      if(!saved||saved.status==='prepared')return {ok:false,response:Response.json({ok:false,paymentRequired:true,
        featureKey:contract.featureKey,pricing:contract.pricing,message:'단건 결제로 상담을 시작할 수 있어요.'},{status:402})};
      assertNativeIntent(saved,auth,contract);
      const intent=await verifiedIntent(env,auth,saved);
      return {ok:true,auth:nativeAuth,featureKey:intent.featureKey,pricing:intent.pricing,deferredUsage:false,
        accessDecision:{allowed:true,reason:'TOSS_IAP',paymentId:intent.orderId,featureKey:intent.featureKey,
          userId:auth.userId,accessSource:'toss',licenseType:'single_purchase',pricing:intent.pricing,claimEvidenceIds:[]}};
    },
    async assertStored(doc){
      if(String(doc?.userId)!==auth.userId||doc.revokedAt||doc.refundedAt)throw new TossError('RESULT_NOT_FOUND',404);
      const intent=await TossNativeConsultation.findOne({...ownerFilter(auth),resultId:doc.resultId,featureKey:doc.featureKey}).lean();
      if(!intent||intent.orderId!==doc.deliveryAccessKey||intent.inputHash!==doc.generationRequestHash)throw new TossError('RESULT_NOT_FOUND',404);
      return verifiedIntent(env,auth,intent);
    },
  };
}

export async function readNativeTeaIntent(env,auth,id){
  const row=await TossNativeConsultation.findOne({_id:id,...ownerFilter(auth)}).lean();
  assertNativeIntent(row,auth);
  if(row.status==='paid')await verifiedIntent(env,auth,row);
  return view(row);
}

export async function handleNativeTea(request,env,auth,path){
  const url=new URL(request.url);url.pathname='/api/fortune-tea-house'+path;
  // Do not forward cookies or tokens to the original web authentication path.
  const forwarded=new Request(url,{method:request.method,headers:{'Content-Type':'application/json'},
    ...(request.method==='POST'?{body:await request.text()}:{}),signal:request.signal});
  bindNativeTossRequest(forwarded,teaContext(env,auth));
  const response=await handleFortuneTeaHouseRoutes(forwarded,env);
  // A purchase may be acknowledged before the first generator checkpoint exists.
  // Recover its immutable input through the original screen's pending contract.
  if(path==='/pending'&&request.method==='GET'&&response.status===404){
    const resultId=url.searchParams.get('resultId');
    const rows=await TossNativeConsultation.find({...ownerFilter(auth),status:'paid',...(resultId?{resultId}:{})}).sort({createdAt:-1}).limit(50).lean();
    for(const row of rows){
      const doc=await nativeTeaStoredState(env,auth.userId,row.resultId);
      if(doc?.status==='completed')continue;
      await verifiedIntent(env,auth,row);
      return Response.json({ok:true,status:'partial',retryable:true,resultId:row.resultId,completedSections:[],requestPayload:row.input},{status:202});
    }
  }
  // A completed reread is always the original stored response. No generator or
  // synthetic response format is substituted by this adapter.
  return response;
}

export async function nativeTeaLibraryItem(env,auth,purchase){
  const href='/fortune-tea-house/';
  if(!purchase.requestId)return {state:'UNASSIGNED',href:href+'?orderId='+encodeURIComponent(purchase._id)};
  const row=await TossNativeConsultation.findOne({_id:purchase.requestId,...ownerFilter(auth),orderId:purchase._id}).lean();
  assertNativeIntent(row,auth);
  const doc=await nativeTeaStoredState(env,auth.userId,row.resultId);
  if(doc&&(doc.generationRequestHash!==row.inputHash||doc.deliveryAccessKey!==purchase._id))throw new TossError('RESULT_NOT_FOUND',404);
  const completed=doc?.status==='completed';
  return {state:completed?'COMPLETED':doc?.status==='generation_failed'?'GENERATION_FAILED':'PENDING',
    resultId:row.resultId,href:href+(completed?'?resultId=':'?recoverResultId=')+encodeURIComponent(row.resultId),
    question:String(row.input.question||'').slice(0,200)};
}

export async function nativeTeaRecords(env,auth,params){
  const group=params.get('group')||'all';
  if(!['all','report'].includes(group))return {ok:true,items:[],failures:[],nextCursor:null};
  const filter={...ownerFilter(auth),status:'paid'};
  const q=(params.get('q')||'').trim().slice(0,160);
  if(q)filter['input.question']={$regex:q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};
  const cursor=params.get('cursor');
  if(cursor){
    if(!/^\d{4}-\d{2}-\d{2}T[\d:.]+Z,[a-f0-9]{64}$/.test(cursor))throw new TossError('LIBRARY_CURSOR_INVALID');
    const [stamp,id]=cursor.split(','),createdAt=new Date(stamp);
    if(!Number.isFinite(createdAt.getTime())||createdAt.toISOString()!==stamp)throw new TossError('LIBRARY_CURSOR_INVALID');
    filter.$or=[{createdAt:{$lt:createdAt}},{createdAt,_id:{$lt:id}}];
  }
  const rows=await TossNativeConsultation.find(filter).sort({createdAt:-1,_id:-1}).limit(51).lean();
  const items=[];
  for(const row of rows.slice(0,50)){
    const purchase=await TossPurchase.findOne({_id:row.orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,requestId:row._id,nativeService:'tea'}).lean();
    if(!purchase||purchase.status==='REFUNDED')continue;
    const saved=await nativeTeaLibraryItem(env,auth,purchase);
    items.push({id:row.resultId,key:'tea:'+row.resultId,source:'tea',serviceId:'tea',serviceName:'연이의 운명 찻집',
      title:saved.question||'운명의 찻집',question:saved.question,createdAt:row.createdAt,status:saved.state==='COMPLETED'?'completed':'generating',
      character:'yeoni',group:'report',href:saved.href,nativeHref:saved.href,startHref:'/fortune-tea-house/'});
  }
  const last=rows[49];
  return {ok:true,items,failures:[],nextCursor:rows.length>50?`${new Date(last.createdAt).toISOString()},${last._id}`:null};
}

export async function bindNativeTeaRecovery(request,env,doc){
  const intent=await TossNativeConsultation.findOne({nativeService:'tea',ownerId:doc.userId,resultId:doc.resultId}).lean();
  if(!intent)return false;
  if(env.TOSS_RELEASE_READY!=='true')throw new TossError('TOSS_RELEASE_PENDING',503);
  const identity=await TossIdentity.findOne({_id:intent.identityId,ownerId:intent.ownerId,active:true}).lean();
  if(!identity)throw new TossError('SESSION_EXPIRED',401);
  const auth={...identity,userId:String(identity.ownerId),environment:intent.environment,
    userKey:await unseal(env,identity.encryptedKey,identity._id)};
  await verifiedIntent(env,auth,intent);
  bindNativeTossRequest(request,teaContext(env,auth));
  return true;
}
