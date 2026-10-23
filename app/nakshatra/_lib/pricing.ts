import { FEATURE_KEY_PRICE_TABLE } from "../../../worker/lib/paid-feature-registry.js";

export const NAKSHATRA_COMPAT_PRICING = FEATURE_KEY_PRICE_TABLE["nakshatra-compat"];
export const NAKSHATRA_MUHURTA_PRICING = FEATURE_KEY_PRICE_TABLE["nakshatra-muhurta"];
export function nakshatraMuhurtaPriceLabel(locale: string) {
  const amount = NAKSHATRA_MUHURTA_PRICING.amountKRW;
  return locale === "ko" ? `${new Intl.NumberFormat("ko-KR").format(amount)}원`
    : new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(amount);
}
export const NAKSHATRA_COMPAT_PRICE_LABEL = new Intl.NumberFormat("ko-KR").format(NAKSHATRA_COMPAT_PRICING.amountKRW) + "원";
