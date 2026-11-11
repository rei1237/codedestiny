import { FEATURE_KEY_PRICE_TABLE } from "../../../worker/lib/paid-feature-registry.js";
import { isFreeFortuneFeatureKey } from "../../../lib/payment/free-fortune-policy.mjs";
const prior = FEATURE_KEY_PRICE_TABLE["nakshatra-compat"];
export const NAKSHATRA_COMPAT_PRICING = isFreeFortuneFeatureKey("nakshatra-compat") ? {...prior,cost:0,coinPrice:0,amountKRW:0} : prior;
export const NAKSHATRA_COMPAT_PRICE_LABEL = NAKSHATRA_COMPAT_PRICING.amountKRW === 0 ? "무료" : new Intl.NumberFormat("ko-KR").format(NAKSHATRA_COMPAT_PRICING.amountKRW) + "원";
