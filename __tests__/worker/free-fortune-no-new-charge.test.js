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

test('Deterministic voyage and bias are exact free keys without making AI or light saju free',()=>{
 expect(FREE_FORTUNE_FEATURE_KEYS).toHaveLength(84);
 for(const key of ['destiny-compass-life-voyage','destiny-bias-analyze']) expect(isFreeFortuneFeatureKey(key)).toBe(true);
 for(const key of ['destiny-compass-deep-report','saju-guardian-unlock','section_summary','section_daewun','saju_lifetime_bundle']) expect(isFreeFortuneFeatureKey(key)).toBe(false);
});

// 2026-11-12 C1: 남은 비LLM 상품 22종은 무료, LLM 상담·라이트 사주·대운·묶음·수호신은 계속 유료.
test.each(["physiognomy-compatibility","physiognomy-pastlife-compatibility","physiognomy-ogwan-mole-deep","tarot-year-fortune","tarot-reunion-reading","tarot-crystal-soul-reading","tarot-numerology-reading","tarot-ijik","maya-prompt-generator","fortune-prompt-hub-generate","dream-prompt-generator","royal-tea-oracle","ifa-oracle","openJuyukModal","openKemetModal","neville-meditation","cosmic-soul-meditation","stonehenge-runes-single","stonehenge-runes-triad","stonehenge-runes-deep","stonehenge-runes-yearly","mbti-animal-compat"])("C1 non-LLM %s is free",key=>expect(isFreeFortuneFeatureKey(key)).toBe(true));
test.each(["section_summary","section_daewun","saju_lifetime_bundle","saju-guardian-unlock","tarot-mindscan","tarot-love-relationship","fortune-tea-house-tarot-consultation","dream-psycho-analysis"])("C1 keeps %s paid",key=>expect(isFreeFortuneFeatureKey(key)).toBe(false));
