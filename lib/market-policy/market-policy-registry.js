/**
 * Market policy registry for commerce, legal, tax, and localization boundaries.
 *
 * Language locale must stay separate from commerce and legal market decisions.
 * Adding a UI locale must never enable payments in a market.
 */

export const MARKET_POLICY_REGISTRY_VERSION = "market-policy-2026-08-06";

export const LEGAL_REVIEW_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  MACHINE_TRANSLATED: "MACHINE_TRANSLATED",
  NATIVE_REVIEWED: "NATIVE_REVIEWED",
  LEGAL_REVIEW_REQUIRED: "LEGAL_REVIEW_REQUIRED",
  LEGAL_APPROVED: "LEGAL_APPROVED",
  PUBLISHED: "PUBLISHED",
  RETIRED: "RETIRED",
});

export const PAYMENT_PRODUCT_TERMS = Object.freeze({
  PASS: "PASS",
  MONTHLY_CREDIT: "MONTHLY_CREDIT",
  ONE_TIME: "ONE_TIME",
});

export const AI_OUTPUT_MARKET_LOCALES = Object.freeze(["ko", "en", "ja", "zh-CN", "zh-TW"]);

export const UI_RUNTIME_LOCALES = Object.freeze([
  "ko",
  "en",
  "ja",
  "zh-CN",
  "zh-TW",
  "vi",
  "hi",
  "es",
  "fr",
  "de",
  "nl",
  "ms",
]);

const COMMON_PAYMENT_COPY_GUARD = Object.freeze({
  allowedProductTerms: [
    PAYMENT_PRODUCT_TERMS.PASS,
    PAYMENT_PRODUCT_TERMS.MONTHLY_CREDIT,
    PAYMENT_PRODUCT_TERMS.ONE_TIME,
  ],
  prohibitedClaims: [
    "auto_renewal",
    "subscription_cancellation_right",
    "free_trial_to_paid_conversion",
    "unlimited_access",
    "lifetime_access",
    "guaranteed_result",
  ],
  currentServiceHasAutoRenewalSubscription: false,
  currentServiceHasSubscriptionCancellationRight: false,
});

export const MARKET_POLICY_REGISTRY = Object.freeze({
  KR: {
    marketCode: "KR",
    enabled: true,
    defaultLocale: "ko",
    supportedLocales: ["ko", "en", "ja", "zh-CN", "zh-TW"],
    aiOutputLocales: AI_OUTPUT_MARKET_LOCALES,
    jurisdiction: "KR",
    settlementCurrencies: ["KRW"],
    displayCurrencies: ["KRW"],
    paymentProcessor: "PORTONE_V2_KG_INICIS",
    taxMode: "KR_VAT_DIGITAL_SERVICE_REVIEW_REQUIRED",
    legalPack: "KR-DIGITAL-2026-08-DRAFT",
    privacyPack: "KR-PRIVACY-2026-08-DRAFT",
    refundPack: "KR-DIGITAL-REFUND-2026-08-DRAFT",
    recurringPaymentEnabled: false,
    autoRenewalEnabled: false,
    launchMode: "domestic-current-service",
    legalReviewRequired: true,
    legalReviewStatus: LEGAL_REVIEW_STATUS.LEGAL_REVIEW_REQUIRED,
    paymentCopyGuard: COMMON_PAYMENT_COPY_GUARD,
  },
  JP: draftDisabledMarket("JP", "ja", ["ja", "en"], "JPY", "JP-DRAFT-2026-08"),
  US: draftDisabledMarket("US", "en", ["en"], "USD", "US-DRAFT-2026-08"),
  EU: draftDisabledMarket("EU", "en", ["en", "fr", "de", "nl"], "EUR", "EU-DRAFT-2026-08"),
  GB: draftDisabledMarket("GB", "en", ["en"], "GBP", "GB-DRAFT-2026-08"),
  CA: draftDisabledMarket("CA", "en", ["en", "fr"], "CAD", "CA-DRAFT-2026-08"),
  AU: draftDisabledMarket("AU", "en", ["en"], "AUD", "AU-DRAFT-2026-08"),
  NZ: draftDisabledMarket("NZ", "en", ["en"], "NZD", "NZ-DRAFT-2026-08"),
  SG: draftDisabledMarket("SG", "en", ["en", "zh-CN", "zh-TW"], "SGD", "SG-DRAFT-2026-08"),
  TW: draftDisabledMarket("TW", "zh-TW", ["zh-TW", "en"], "TWD", "TW-DRAFT-2026-08"),
  HK: draftDisabledMarket("HK", "zh-TW", ["zh-TW", "en"], "HKD", "HK-DRAFT-2026-08"),
  CN: draftDisabledMarket("CN", "zh-CN", ["zh-CN"], "CNY", "CN-DRAFT-2026-08"),
});

function draftDisabledMarket(marketCode, defaultLocale, supportedLocales, currency, draftPrefix) {
  return Object.freeze({
    marketCode,
    enabled: false,
    defaultLocale,
    supportedLocales,
    aiOutputLocales: AI_OUTPUT_MARKET_LOCALES.filter((locale) => supportedLocales.includes(locale)),
    jurisdiction: marketCode,
    settlementCurrencies: [currency],
    displayCurrencies: [currency],
    paymentProcessor: "UNCONFIRMED",
    taxMode: `${marketCode}_TAX_REVIEW_REQUIRED`,
    legalPack: `${draftPrefix}-LEGAL`,
    privacyPack: `${draftPrefix}-PRIVACY`,
    refundPack: `${draftPrefix}-REFUND`,
    recurringPaymentEnabled: false,
    autoRenewalEnabled: false,
    launchMode: "blocked-until-local-legal-tax-payment-review",
    legalReviewRequired: true,
    legalReviewStatus: LEGAL_REVIEW_STATUS.LEGAL_REVIEW_REQUIRED,
    paymentCopyGuard: COMMON_PAYMENT_COPY_GUARD,
  });
}

export function getMarketPolicy(marketCode) {
  const key = String(marketCode || "").trim().toUpperCase();
  return MARKET_POLICY_REGISTRY[key] || null;
}

export function canUseMarketForLivePayment(marketCode) {
  const policy = getMarketPolicy(marketCode);
  return Boolean(
    policy
      && policy.enabled
      && policy.legalReviewStatus === LEGAL_REVIEW_STATUS.LEGAL_APPROVED
      && policy.paymentProcessor !== "UNCONFIRMED",
  );
}
