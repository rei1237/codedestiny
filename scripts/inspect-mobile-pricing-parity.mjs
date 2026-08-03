import fs from "node:fs";
import { listBillingFeatures } from "../worker/lib/billing-feature-registry.js";

const shell = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const markup = shell.replace(/<script[\s\S]*?<\/script>/gi, "");
const cardTags = [...markup.matchAll(/<(?:a|button|div)\b[^>]*(?:data-coin-cost|data-tile-lock-cost)[^>]*>/g)].map((match) => match[0]);
const readAttribute = (tag, name) => tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] || "";
const toNumber = (value) => {
  if (String(value || "").trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const cardRows = cardTags
  .map((tag) => {
    const featureKey = readAttribute(tag, "data-feature-key").trim();
    const coinPriceValue = readAttribute(tag, "data-coin-cost") || readAttribute(tag, "data-tile-lock-cost");
    return {
      featureKey,
      coinPrice: toNumber(coinPriceValue),
      amountKRW: toNumber(readAttribute(tag, "data-price-krw")),
    };
  })
  .filter((row) => row.featureKey);
const paidCardKeys = cardRows.map((row) => row.featureKey);
const catalog = listBillingFeatures();
const registryKeys = new Set([
  ...(catalog.legacyFeatureTable || []).map((entry) => entry.featureKey),
  ...(catalog.categories || []).flatMap((category) => (category.subFeatures || []).map((entry) => entry.featureKey)),
  ...(catalog.categories || []).map((category) => category.featureKey).filter(Boolean),
]);

const uniqueCardKeys = [...new Set(paidCardKeys)];
const registryByKey = new Map([
  ...(catalog.legacyFeatureTable || []),
  ...(catalog.categories || []).flatMap((category) => [
    ...(category.subFeatures || []),
    ...(category.featureKey ? [category] : []),
  ]),
].map((entry) => [entry.featureKey, entry]));
const priceMismatches = cardRows
  .map((row) => {
    const registry = registryByKey.get(row.featureKey);
    if (!registry) return null;
    const registryCoinPrice = toNumber(registry.coinPrice ?? registry.cost);
    const registryAmountKRW = toNumber(registry.amountKRW ?? registry.cashPrice ?? registry.paymentAmount);
    const coinMismatch = row.coinPrice !== null && registryCoinPrice !== null && row.coinPrice !== registryCoinPrice;
    const amountMismatch = row.amountKRW !== null && registryAmountKRW !== null && row.amountKRW !== registryAmountKRW;
    return coinMismatch || amountMismatch
      ? { ...row, registryCoinPrice, registryAmountKRW }
      : null;
  })
  .filter(Boolean);
const result = {
  cardKeys: uniqueCardKeys,
  missing: uniqueCardKeys.filter((key) => !registryKeys.has(key)),
  priceMismatches,
  registryCount: registryKeys.size,
};
console.log(JSON.stringify(result, null, 2));

if (process.argv.includes("--strict") && (result.missing.length > 0 || result.priceMismatches.length > 0)) {
  process.exitCode = 1;
}
