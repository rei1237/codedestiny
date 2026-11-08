import test from 'node:test';
import assert from 'node:assert/strict';
import {APPROVED_TOSS_PRODUCTS,APPROVED_TOSS_NATIVE_PRODUCTS,APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS} from '../../../worker/toss/catalog.js';
import {isReviewSale} from '../../../worker/toss/review-products.js';

test('first review sells only the original Saju products of the correct adviser',()=>{
  for(const tier of ['mackerel','salmon','flounder','tuna']){
    assert.equal(isReviewSale('saju_'+tier,'yeongnyangi'),true);
    assert.equal(isReviewSale('saju_'+tier,'yeoni'),false);
  }
  assert.equal(isReviewSale('chat_saju','yeoni'),true);
  for(const [product,owner] of [['chat_saju','neo'],['chat_saju',undefined],['chat_saju_tuna','yeoni'],['chat_tarot','yeoni'],['fusion_all','yeongnyangi']]){
    assert.equal(isReviewSale(product,owner),false);
  }
});

test('an approved listing outside the release scope cannot enter the shipping registries',()=>{
  for(const row of APPROVED_TOSS_PRODUCTS.filter(row=>row.approved)){
    assert.ok(isReviewSale(row.productId,row.serviceId),row.productId);
  }
  assert.equal([...APPROVED_TOSS_NATIVE_PRODUCTS,...APPROVED_TOSS_TAROT_LIBRARY_PRODUCTS].some(row=>row.approved),false);
});
