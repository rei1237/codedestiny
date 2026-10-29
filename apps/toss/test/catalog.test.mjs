import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedProduct,APPROVED_TOSS_PRODUCTS} from '../../../worker/toss/catalog.js';
test('no production SKU is invented while external approvals are pending',()=>assert.equal(APPROVED_TOSS_PRODUCTS.length,0));
test('approved birth-system products retain exact identity and price evidence',()=>{
 for(const domain of ['saju','astrology','ziwei','vedic','sukuyo','tarot']){
  const item={productId:domain+'_mackerel',sku:'test-'+domain,approved:true,approvedPriceKRW:100,priceEvidence:'offline fixture'};
  assert.equal(approvedProduct(item.sku,[item]),item);
  assert.throws(()=>approvedProduct(item.sku,[{...item,approved:false}]));
  assert.throws(()=>approvedProduct(item.sku,[{...item,priceEvidence:''}]));
 }
});
test('unsupported long-period systems and arbitrary products cannot be granted',()=>{
 for(const productId of ['astrology_tuna','sukuyo_tuna','tarot_tuna','arbitrary_mackerel'])assert.throws(()=>approvedProduct('test',[{productId,sku:'test',approved:true,approvedPriceKRW:100,priceEvidence:'offline fixture'}]));
});

test('chat catalog requires explicit matching server service and rejects unsupported depths',()=>{
 for(const serviceId of ['yeoni','neo']){
  const item={serviceId,productId:'chat_saju_mackerel',sku:'test-'+serviceId,approved:true,approvedPriceKRW:3000,priceEvidence:'offline fixture'};
  assert.equal(approvedProduct(item.sku,[item]),item);
  for(const invalid of [{...item,serviceId:'yeongnyangi'},{...item,productId:'saju_mackerel'},{...item,productId:'chat_tarot_tuna'}])assert.throws(()=>approvedProduct(item.sku,[invalid]));
 }
});
