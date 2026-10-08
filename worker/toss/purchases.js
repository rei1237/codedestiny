import {TossIdentity,TossPurchase} from './models.js';
import {YeongnyangiRequest} from '../lib/yeongnyangi-models.js';
import {tossTransaction} from './session.js';
import {TossError} from './policy.js';
import {requestMatchesService} from './services.js';

export const purchaseStore={transaction:task=>tossTransaction(session=>task({
  async assertIdentity(auth) {
    const result=await TossIdentity.updateOne({_id:auth._id,active:true,revision:auth.revision},{$set:{updatedAt:new Date()}},{session});
    if(!result.matchedCount)throw new TossError('SESSION_EXPIRED',401);
  },
  purchase:orderId=>TossPurchase.findById(orderId).session(session).lean(),
  insertPurchase:purchase=>TossPurchase.create([purchase],{session}),
  request:(id,ownerId)=>YeongnyangiRequest.findOne({_id:id,userId:ownerId}).session(session).lean(),
  async attachRequest(id,ownerId,orderId) {
    const result=await YeongnyangiRequest.updateOne({_id:id,userId:ownerId,state:'CREATED',accessMethod:null,paymentId:null},
      {$set:{accessMethod:'TOSS_IAP',state:'PAID',paymentClaimOrderId:orderId}},{session});
    if(result.modifiedCount!==1)throw new TossError('REQUEST_ALREADY_FUNDED',409);
  },
  assignPurchase:(orderId,requestId)=>TossPurchase.updateOne({_id:orderId,requestId:null},{$set:{requestId}},{session}),
}))};

export async function findTossPurchaseEvidence(row,ownerId,session,commitMarker) {
  const filter={_id:row.paymentClaimOrderId,ownerId,requestId:String(row._id),productId:row.productId,
    status:{$in:['PURCHASED','PAYMENT_COMPLETED']}};
  const query=commitMarker?TossPurchase.findOneAndUpdate(filter,{$set:{commitMarker}},{new:true,session}):TossPurchase.findOne(filter);
  if(session)query.session(session);
  const purchase=await query.lean();
  if(!purchase||!requestMatchesService(row,purchase))return null;
  const identityQuery=commitMarker?TossIdentity.findOneAndUpdate({_id:purchase.identityId,active:true},
    {$set:{updatedAt:new Date()}},{new:true,session}):TossIdentity.findOne({_id:purchase.identityId,active:true});
  if(session)identityQuery.session(session);
  return await identityQuery.lean()?purchase:null;
}
export async function recordTossRefund(auth,order) {
  await tossTransaction(async session=>{
    const purchase=await TossPurchase.findOneAndUpdate({_id:order.orderId,identityId:auth._id,sku:order.sku},
      {$set:{status:'REFUNDED',verifiedAt:new Date()}},{new:true,session}).lean();
    if(purchase?.requestId)await YeongnyangiRequest.updateOne({_id:purchase.requestId,userId:auth.ownerId,accessMethod:'TOSS_IAP'},
      {$set:{state:'REFUNDED',errorCode:'PAYMENT_NOT_ACTIVE',leaseToken:'',leaseUntil:null}},{session});
  });
}
