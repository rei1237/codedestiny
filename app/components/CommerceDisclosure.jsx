import Link from "next/link";
import { BUSINESS_IDENTITY, BUSINESS_PHONE_INTL, SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/site-policy-config";
import { PASS_MONTHLY_WON } from "../../lib/payment/pass-pricing";
import { resolveServerFeaturePricing } from "../../lib/payment/server-feature-pricing";
import { COMMERCE_DISCLOSURE_COPY } from "../../lib/i18n/commerce-disclosure-copy.mjs";

export default function CommerceDisclosure({ locale }) {
  const copy = COMMERCE_DISCLOSURE_COPY[locale];
  if (!copy) return null;
  const formatPrice = (price) => new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", currencyDisplay: "code", maximumFractionDigits: 0 }).format(price);
  return (
    <section className="policy-embed-section" id="business-information" aria-labelledby="business-information-title">
      <h2 className="policy-embed-heading" id="business-information-title">{copy.title}</h2>
      <p>{copy.identityNote}</p>
      <dl>
        {Object.entries(copy.labels).map(([key, label]) => (
          <div key={key}>
            <dt><strong>{label}</strong></dt>
            <dd>{key === "email" ? <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a>
              : key === "phone" ? <a href={`tel:${BUSINESS_PHONE_INTL}`}>{BUSINESS_PHONE_INTL}</a>
                : <span lang="ko" translate="no" data-cd-no-trans>{BUSINESS_IDENTITY[key]}</span>}</dd>
          </div>
        ))}
      </dl>
      <h3>{copy.products}</h3>
      <p>{copy.productText}</p>
      <h3>{copy.singlePrices}</h3>
      <p>{copy.singleText}</p>
      <ul>{Object.entries(copy.singleExamples).map(([featureKey, label]) => {
        const pricing = resolveServerFeaturePricing({ featureKey });
        return pricing ? <li key={featureKey}>{label}: {formatPrice(pricing.amountKRW)}</li> : null;
      })}</ul>
      <h3>{copy.prices}</h3>
      <ul>{Object.entries(PASS_MONTHLY_WON).map(([tier, price]) => (
        <li key={tier}>{tier === "vvip" ? "VVIP" : tier[0].toUpperCase() + tier.slice(1)}: {new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", currencyDisplay: "code", maximumFractionDigits: 0 }).format(price)}</li>
      ))}</ul>
      <p>{copy.passText}</p>
      <p><Link href="/points/">{copy.store}</Link></p>
      <h3>{copy.currency}</h3><p>{copy.currencyText}</p>
      <h3>{copy.delivery}</h3><p>{copy.deliveryText}</p>
      <h3>{copy.refund}</h3><p>{copy.refundText}</p>
    </section>
  );
}
