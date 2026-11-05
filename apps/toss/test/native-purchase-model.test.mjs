import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TossPurchase,TossNativeConsultation} from '../../../worker/toss/models.js';
import {ZiweiAiConsultation} from '../../../worker/lib/models.js';

const ownerId='507f1f77bcf86cd799439011';
for(const service of ['tea','neo','fusion','life-book','love-secret','astrology','vedic','ziwei']){
 test(`${service} can persist its approved purchase and immutable intent without database access`,()=>{
  const shared={_id:'offline-model-fixture',identityId:'offline-identity',ownerId,environment:'SANDBOX',
   nativeService:service,sku:'offline-only',approvedPriceKRW:10000,priceEvidence:'offline fixture'};
  const purchase=new TossPurchase({...shared,productId:`native:${service}:fixture`,status:'PURCHASED',verifiedAt:new Date()});
  const intent=new TossNativeConsultation({...shared,requestId:'offline-request',resultId:'offline-result',featureKey:'fixture',inputHash:'fixture',input:{},pricing:{amountKRW:10000}});
  assert.equal(purchase.validateSync(),undefined);
  assert.equal(intent.validateSync(),undefined);
 });
}
test('unknown native service remains invalid in both persisted models',()=>{
 for(const Model of [TossPurchase,TossNativeConsultation])assert.ok(new Model({nativeService:'unknown'}).validateSync()?.errors.nativeService);
});
test('Ziwei stored results retain Toss origin and reject an unknown origin',()=>{
 const origin=ZiweiAiConsultation.schema.path('accessSource');
 assert.deepEqual(origin.enumValues,['','toss']);
 assert.equal(origin.defaultValue,'');
});
