import { AI_OUTPUT_MARKET_LOCALES, MARKET_POLICY_REGISTRY, getMarketPolicy } from "./market-policy-registry.js";

export function normalizeLanguageLocale(value, fallback = "ko") {
  const raw = String(value || "").trim();
  if (AI_OUTPUT_MARKET_LOCALES.includes(raw)) return raw;
  const lower = raw.toLowerCase().replace("_", "-");
  if (lower === "zh" || lower === "zh-cn" || lower === "zh-hans") return "zh-CN";
  if (lower === "zh-tw" || lower === "zh-hant" || lower === "zh-hk" || lower === "zh-mo") return "zh-TW";
  if (lower === "en-us" || lower === "en-gb" || lower === "en-au" || lower === "en-sg") return "en";
  if (lower === "ja-jp") return "ja";
  if (lower === "ko-kr") return "ko";
  return fallback;
}

export function createUserLocaleContext(input = {}) {
  return Object.freeze({
    languageLocale: normalizeLanguageLocale(input.languageLocale || input.locale),
    timeZone: cleanOptional(input.timeZone),
  });
}

export function createCommerceContext(input = {}) {
  const marketCode = String(input.marketCode || "").trim().toUpperCase();
  const policy = getMarketPolicy(marketCode);
  return Object.freeze({
    marketCode,
    billingCountry: cleanCountry(input.billingCountry),
    residenceCountry: cleanCountry(input.residenceCountry),
    paymentCountry: cleanCountry(input.paymentCountry),
    taxCountry: cleanCountry(input.taxCountry),
    settlementCurrency: cleanCurrency(input.settlementCurrency) || first(policy?.settlementCurrencies),
    displayCurrency: cleanCurrency(input.displayCurrency) || first(policy?.displayCurrencies),
  });
}

export function createLegalContext(input = {}) {
  const jurisdiction = String(input.jurisdiction || input.legalJurisdiction || "").trim().toUpperCase();
  const policy = MARKET_POLICY_REGISTRY[jurisdiction] || null;
  return Object.freeze({
    jurisdiction,
    legalPackVersion: cleanOptional(input.legalPackVersion) || policy?.legalPack || "",
    privacyPolicyVersion: cleanOptional(input.privacyPolicyVersion) || policy?.privacyPack || "",
    termsVersion: cleanOptional(input.termsVersion) || policy?.legalPack || "",
    refundPolicyVersion: cleanOptional(input.refundPolicyVersion) || policy?.refundPack || "",
    subscriptionPolicyVersion: cleanOptional(input.subscriptionPolicyVersion) || "",
  });
}

export function resolveCommerceMarket({ selectedMarketCode, billingCountry, accountCountry, ipCountry } = {}) {
  const explicit = cleanCountry(selectedMarketCode);
  if (explicit) return { marketCode: explicit, source: "USER_SELECTED", confidence: "high" };

  const billing = cleanCountry(billingCountry);
  if (billing) return { marketCode: billing, source: "PG_BILLING_COUNTRY", confidence: "high" };

  const account = cleanCountry(accountCountry);
  if (account) return { marketCode: account, source: "ACCOUNT_COUNTRY", confidence: "medium" };

  const ip = cleanCountry(ipCountry);
  if (ip) return { marketCode: "", source: "IP_COUNTRY_HINT_ONLY", confidence: "low", hint: ip };

  return { marketCode: "", source: "UNRESOLVED", confidence: "none" };
}

function cleanOptional(value) {
  const text = String(value || "").trim();
  return text || undefined;
}

function cleanCountry(value) {
  const text = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(text) || text === "EU" ? text : "";
}

function cleanCurrency(value) {
  const text = String(value || "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(text) ? text : "";
}

function first(value) {
  return Array.isArray(value) && value.length ? value[0] : "";
}
