import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {approvedProduct,assertUniqueApprovedSaleSkus,APPROVED_TOSS_PRODUCTS} from '../../../worker/toss/catalog.js';
const root=path.resolve(import.meta.dirname,'../../..');
const evidence=JSON.parse(readFileSync(path.join(root,'docs/toss/assets/products/manifest.json'),'utf8'));
test('approved sale SKUs are valid and unique across consultation, tarot and native registries',()=>{
 const row=sku=>({sku,approved:true});
 assert.doesNotThrow(()=>assertUniqueApprovedSaleSkus([[row('consult')],[row('tarot')],[row('native')]]));
 for(const registries of [[[row('same')],[row('same')],[]],[[row('same')],[],[row('same')]], [[],[row('same')],[row('same')]],[[row(' ')]],[[row(' bad')]],[[row(undefined)]]]) {
  assert.throws(()=>assertUniqueApprovedSaleSkus(registries),e=>e.code==='TOSS_PRODUCT_NOT_APPROVED'&&e.status===503);
 }
 assert.doesNotThrow(()=>assertUniqueApprovedSaleSkus([[row('same')],[{sku:'same',approved:false}],[]]));
});
test('console product records use unique generated IDs and exact VAT totals',()=>{
 assert.equal(APPROVED_TOSS_PRODUCTS.length,5);
 assert.equal(new Set(APPROVED_TOSS_PRODUCTS.map(row=>row.sku)).size,5);
 for(const row of APPROVED_TOSS_PRODUCTS){
  assert.match(row.sku,/^ait\./);assert.equal(row.supplyPriceKRW%10,0);assert.equal(row.approvedPriceKRW,row.supplyPriceKRW*11/10);assert.equal(approvedProduct(row.sku),row);
  const saved=evidence.products.find(product=>product.sku===row.sku);
  assert.ok(saved);assert.equal(saved.productId,row.productId);assert.equal(saved.serviceId,row.serviceId);assert.equal(saved.supplyPriceKRW,row.supplyPriceKRW);assert.equal(saved.salePriceKRW,row.approvedPriceKRW);assert.equal(saved.consoleEvidence,row.priceEvidence);
  const image=readFileSync(path.join(root,'docs/toss/assets/products',saved.image));
  assert.equal(image.length,saved.imageBytes);assert.equal(createHash('sha256').update(image).digest('hex'),saved.imageSha256);
 }
});
test('ambiguous or malformed approved SKU cannot grant either product',()=>{
 const item={productId:'saju_mackerel',sku:'same-sku',approved:true,supplyPriceKRW:3000,approvedPriceKRW:3300,priceEvidence:'offline fixture'};
 assert.throws(()=>approvedProduct(item.sku,[item,{...item,productId:'saju_salmon'}]));
 for(const sku of ['', ' same-sku ', undefined])assert.throws(()=>approvedProduct(sku,[{...item,sku}]));
});
test('approved birth-system products retain exact identity and price evidence',()=>{
 for(const domain of ['saju','astrology','ziwei','vedic','sukuyo','tarot']){
  const item={productId:domain+'_mackerel',sku:'test-'+domain,approved:true,supplyPriceKRW:400,approvedPriceKRW:440,priceEvidence:'offline fixture'};
  assert.equal(approvedProduct(item.sku,[item]),item);
  assert.throws(()=>approvedProduct(item.sku,[{...item,approved:false}]));
  assert.throws(()=>approvedProduct(item.sku,[{...item,priceEvidence:''}]));
 }
});
test('unsupported long-period systems and arbitrary products cannot be granted',()=>{
 for(const productId of ['astrology_tuna','sukuyo_tuna','tarot_tuna','arbitrary_mackerel'])assert.throws(()=>approvedProduct('test',[{productId,sku:'test',approved:true,supplyPriceKRW:400,approvedPriceKRW:440,priceEvidence:'offline fixture'}]));
});

test('chat catalog requires explicit matching server service and rejects unsupported depths',()=>{
 for(const serviceId of ['yeoni','neo']){
  const item={serviceId,productId:'chat_saju_mackerel',sku:'test-'+serviceId,approved:true,supplyPriceKRW:3000,approvedPriceKRW:3300,priceEvidence:'offline fixture'};
  assert.equal(approvedProduct(item.sku,[item]),item);
  for(const invalid of [{...item,serviceId:'yeongnyangi'},{...item,productId:'saju_mackerel'},{...item,productId:'chat_tarot_tuna'}])assert.throws(()=>approvedProduct(item.sku,[invalid]));
 }
});
