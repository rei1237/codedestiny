/** @jest-environment node */
import { FREE_FORTUNE_FEATURE_KEYS, isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';
let sale, permanentHoney, perUseHoney;
beforeAll(async()=>{
 ({assertProductSaleOpen:sale}=await import('../../worker/payments/catalog.js'));
 ({unlockHoneyContent:permanentHoney}=await import('../../worker/lib/honey-unlocks.js'));
 ({unlockHoneyUse:perUseHoney}=await import('../../worker/lib/honey-per-use.js'));
});
const forbiddenStore=new Proxy({}, {get(){throw new Error('free content touched a debit store');}});
test.each(FREE_FORTUNE_FEATURE_KEYS)('%s cannot initiate a new purchase or honey deduction',async featureKey=>{
 expect(()=>sale(featureKey)).toThrow();
 try{sale(featureKey);}catch(error){expect(error.code || error.payload?.code).toBe('FEATURE_NOW_FREE');}
 await expect(permanentHoney({userId:'user',productId:featureKey},forbiddenStore)).rejects.toMatchObject({status:409,payload:{code:'FEATURE_NOW_FREE'}});
 await expect(perUseHoney({userId:'user',product:{featureKey}},forbiddenStore)).rejects.toMatchObject({status:409,payload:{code:'FEATURE_NOW_FREE'}});
});
test.each(['section_summary','section_daewun','saju_lifetime_bundle','allPaidSaju','saju-guardian-unlock','premiumDivinationPack','yeongnyangi-prashna-v1','astrology-ai-consultation','human-design-report'])('%s never becomes free by category or bundle',key=>expect(isFreeFortuneFeatureKey(key)).toBe(false));

test('Static Human Design guide is distinct from paid AI report and paid saju sections',()=>{
 expect(isFreeFortuneFeatureKey('human_design_reading')).toBe(true);
 expect(isFreeFortuneFeatureKey('saju_brain_reading')).toBe(true);
 for(const key of ['human-design-report','section_summary','section_daewun','saju_lifetime_bundle']) expect(isFreeFortuneFeatureKey(key)).toBe(false);
});
