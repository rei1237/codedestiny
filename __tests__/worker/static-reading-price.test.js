/** @jest-environment node */
import {resolveProduct} from '../../worker/payments/catalog.js';
import {getBillingFeaturePricing} from '../../worker/lib/billing-feature-registry.js';
import {isAppFreeFeature} from '../../worker/lib/app-store-pricing.js';

// Approved new-sale prices. Stored orders and entitlements are not repriced.
import priceKeys from '../fixtures/static-reading-price-keys.cjs';
const {STATIC_READING_PRICE_KEYS: staticKeys} = priceKeys;
test.each(staticKeys)('%s uses its approved price and cannot become free in the app',featureKey=>{
 const product=resolveProduct({featureKey});
 const amount = ({
  "openJuyukModal": 3000,
  "turtleIChing": 3000,
  "openKemetModal": 3000,
  "egyptOracle": 3000,
  "stonehengeRunes": 3000,
  "stonehenge-runes-single": 3000,
  "stonehenge-runes-triad": 3000,
  "stonehenge-runes-deep": 3000,
  "stonehenge-runes-yearly": 3000,
  "royal-tea-oracle": 3000,
  "ifa-oracle": 3000,
  "nakshatra-compat": 20000,
  "animal-destiny-unlock": 7000,
  "rpt_quantumCard": 10000,
  "nakshatra-muhurta": 7000,
 })[featureKey] || 5000;
 expect(product).toMatchObject({priceKRW:amount,priceCoins:amount/100,monthlyCost:amount/10});
 expect(getBillingFeaturePricing({featureKey}).pricing).toMatchObject({amountKRW:amount,cost:amount/100});
 expect(isAppFreeFeature(featureKey,product.priceCoins)).toBe(false);
});
test.each([['geomancy',5000],['animal-totem-basic',5000],['animal-totem-deep',5000],['saju-guardian-unlock',7000],['yeongnyangi-saju-mackerel',5000]])('%s uses its premium repricing amount', (featureKey,priceKRW)=>{
 expect(resolveProduct({featureKey}).priceKRW).toBe(priceKRW);
});
test('music stays free in the app while paid 1,000 won features use tier 15',()=>{
 expect(isAppFreeFeature('music-track-fixture',10)).toBe(true);
 for(const featureKey of ['profile-card-manage','rpt_specialCharmCard','rpt_skillTreeCard','fun.quantumLotto.ritualReport']){
  expect(isAppFreeFeature(featureKey,10)).toBe(false);
 }
});
