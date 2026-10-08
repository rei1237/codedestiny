/** @jest-environment node */
import {resolveProduct} from '../../worker/payments/catalog.js';
import {getBillingFeaturePricing} from '../../worker/lib/billing-feature-registry.js';
import {isAppFreeFeature} from '../../worker/lib/app-store-pricing.js';

// Approved new-sale prices. Stored orders and entitlements are not repriced.
import priceKeys from '../fixtures/static-reading-price-keys.cjs';
const {STATIC_READING_PRICE_KEYS: staticKeys} = priceKeys;
test.each(staticKeys)('%s uses its approved price and cannot become free in the app',featureKey=>{
 const product=resolveProduct({featureKey});
 const amount = featureKey === "nakshatra-compat" ? 20000 : 1000;
 expect(product).toMatchObject({priceKRW:amount,priceCoins:amount/100,monthlyCost:amount/10});
 expect(getBillingFeaturePricing({featureKey}).pricing).toMatchObject({amountKRW:amount,cost:amount/100});
 expect(isAppFreeFeature(featureKey,product.priceCoins)).toBe(false);
});
test.each([['geomancy',3000],['animal-totem-basic',3000],['animal-totem-deep',3000],['saju-guardian-unlock',5000],['yeongnyangi-saju-mackerel',3000]])('%s retains its AI product price', (featureKey,priceKRW)=>{
 expect(resolveProduct({featureKey}).priceKRW).toBe(priceKRW);
});
