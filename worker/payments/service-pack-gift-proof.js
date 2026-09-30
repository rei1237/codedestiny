import { Gift, GiftGrant } from '../lib/gift-models.js';
import { Payment } from '../lib/models.js';
import { toObjectId } from './db.js';

const sameId=(left,right)=>String(left||'')===String(right||'');
function sameSnapshot(left,right) {
  return left&&right&&['planId','fishId','policyVersion','priceKRW','totalUses','validityDays','unitPriceKRW']
    .every(key=>left[key]===right[key])&&Array.isArray(left.eligibleFeatureKeys)
    &&left.eligibleFeatureKeys.length===right.eligibleFeatureKeys?.length
    &&left.eligibleFeatureKeys.every((key,index)=>key===right.eligibleFeatureKeys[index]);
}

// A claimed gift keeps the recipient's rights after provider cancellation under
// the existing gift policy. Payment ownership and immutable purchase facts still
// have to match Gift, GiftGrant and the recipient's pack; paid status alone is not
// the recipient's entitlement once the claim has committed.
export function matchesGiftPackFunding(right,gift,grant,order) {
  return Boolean(right?.type==='service_pack'&&right.status==='granted'&&right.giftId
    &&gift?.status==='CLAIMED'&&gift.giftId===right.giftId&&gift.orderId===right.orderId
    &&sameId(gift.recipientUserId,right.userId)
    &&grant?.giftId===gift.giftId&&grant.orderId===gift.orderId
    &&sameId(grant.recipientUserId,right.userId)&&sameId(grant.purchaserUserId,gift.purchaserUserId)
    &&sameId(grant.after?.servicePack?.entitlementId,right._id)
    &&order?.purchaseType==='GIFT'&&order.merchantUid===right.orderId
    &&sameId(order.userId,gift.purchaserUserId)&&order.productId===right.productId
    &&order.pricingSnapshot?.fulfillmentType==='service_pack'
    &&sameSnapshot(right.packSnapshot,order.pricingSnapshot.packSnapshot)
    &&sameSnapshot(right.packSnapshot,gift.productSnapshot));
}
export async function findGiftPackFunding(db,right,{commitMarker=''}={}) {
  const gift=await db.findOne(Gift,{giftId:right.giftId,orderId:right.orderId,
    recipientUserId:toObjectId(right.userId),status:'CLAIMED'});
  const grant=gift&&await db.findOne(GiftGrant,{giftId:right.giftId,orderId:right.orderId,
    recipientUserId:toObjectId(right.userId)});
  const order=gift&&await db.findOne(Payment,{merchantUid:right.orderId,purchaseType:'GIFT',
    userId:toObjectId(gift.purchaserUserId),productId:right.productId});
  if(!matchesGiftPackFunding(right,gift,grant,order))return null;
  if(commitMarker) {
    const gifted=await db.findOneAndUpdate(Gift,{_id:gift._id,status:'CLAIMED',
      recipientUserId:toObjectId(right.userId)},{$inc:{servicePackProofVersion:1}},{returnDocument:'after'});
    const granted=await db.findOneAndUpdate(GiftGrant,{giftId:gift.giftId,
      recipientUserId:toObjectId(right.userId),'after.servicePack.entitlementId':String(right._id)},
      {$inc:{servicePackProofVersion:1}},{returnDocument:'after'});
    const paid=await db.findOneAndUpdate(Payment,{_id:order._id,purchaseType:'GIFT',
      userId:toObjectId(gift.purchaserUserId),productId:right.productId},
      {$set:{'metadata.servicePackUseGuard':commitMarker},$inc:{'metadata.servicePackProofRevision':1}},
      {returnDocument:'after'});
    if(!gifted||!granted||!paid)return null;
  }
  return order;
}
export async function listGiftPackFundingIds(db,rights) {
  if(!rights.length)return new Set();
  const giftIds=rights.map(right=>right.giftId),orderIds=rights.map(right=>right.orderId);
  const [gifts,grants,orders]=await Promise.all([
    db.find(Gift,{giftId:{$in:giftIds},status:'CLAIMED'}),
    db.find(GiftGrant,{giftId:{$in:giftIds}}),
    db.find(Payment,{merchantUid:{$in:orderIds},purchaseType:'GIFT'}),
  ]);
  return new Set(rights.filter(right=>matchesGiftPackFunding(right,
    gifts.find(gift=>gift.giftId===right.giftId),
    grants.find(grant=>grant.giftId===right.giftId),
    orders.find(order=>order.merchantUid===right.orderId))).map(right=>right.orderId));
}

export async function readClaimedGiftServicePack(db,gift,grant) {
  const {PurchaseEntitlement}=await import('./purchase-entitlement-model.js');
  const right=await db.findOne(PurchaseEntitlement,{_id:toObjectId(grant.after?.servicePack?.entitlementId),
    userId:String(gift.recipientUserId),giftId:gift.giftId,type:'service_pack',status:'granted'});
  if(!right||!await findGiftPackFunding(db,right))return null;
  const {presentPack}=await import('./service-packs.js');
  return presentPack(right,true);
}
