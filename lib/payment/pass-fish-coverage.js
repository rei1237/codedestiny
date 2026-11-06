import { CURRENT_PASS_PLANS } from './pass-policy.js';
import { getBillingFeaturePricing } from '../../worker/lib/billing-feature-registry.js';
import { KRW_PER_COIN } from '../../worker/lib/billing-policy.js';

// Which Yeongnyangi fish a honey pot reaches is derived, never hand-written:
// the per-item cap comes from the pass policy and each price from the billing registry.
const FISH = [['mackerel', '고등어'], ['salmon', '연어'], ['flounder', '광어'], ['tuna', '참치']];

const fishPrice = id => {
  const result = getBillingFeaturePricing({ featureKey: `yeongnyangi-saju-${id}` });
  if (!result?.ok || !(result.pricing?.amountKRW > 0)) throw new Error(`missing fish price: ${id}`);
  return result.pricing.amountKRW;
};

export function passFishCoverage(tier) {
  const plan = CURRENT_PASS_PLANS[tier];
  const fish = FISH.map(([id, name]) => {
    const priceKRW = fishPrice(id);
    const usable = Boolean(plan) && plan.maxCoveredCoin * KRW_PER_COIN >= priceKRW;
    return { id, name, priceKRW, usable, count: usable ? Math.floor(plan.monthlyLimitCoin * KRW_PER_COIN / priceKRW) : 0 };
  });
  const usable = fish.filter(item => item.usable);
  // Assorted and omakase sets stay Family-only even though a cap could reach them.
  const fusion = plan?.tier === 'family';
  return {
    fish,
    fusion,
    reachLabel: fusion ? '영냥이 모둠·오마카세까지' : usable.length ? `영냥이 ${usable.at(-1).name}까지` : '영냥이 상담은 대상이 아니에요',
    countsLine: usable.length ? `한 생선만 쓰면 ${usable.map(item => `${item.name} ${item.count}회`).join(' · ')}` : '',
  };
}

export function passUpgradeNameForAmount(amountKRW) {
  return Object.values(CURRENT_PASS_PLANS).find(plan => plan.maxCoveredCoin * KRW_PER_COIN >= amountKRW)?.name ?? '';
}
