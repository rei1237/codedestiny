import { FEATURE_KEY_PRICE_TABLE } from "../../../worker/lib/paid-feature-registry.js";

export const NAKSHATRA_COMPAT_PRICING = FEATURE_KEY_PRICE_TABLE["nakshatra-compat"];
export const NAKSHATRA_COMPAT_PRICE_LABEL = new Intl.NumberFormat("ko-KR").format(NAKSHATRA_COMPAT_PRICING.amountKRW) + "원";
