import fs from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isFreeFortuneFeatureKey } from "../lib/payment/free-fortune-policy.mjs";
import { listBillingFeatures } from "../worker/lib/billing-feature-registry.js";

// Display policy is current; the billing registry preserves historical purchase prices.
export function inspectMobilePricingParity(shell, catalog = listBillingFeatures()) {
  const markup = shell.replace(/<script[\s\S]*?<\/script>/gi, "");
  const cardTags = [...markup.matchAll(/<(?:a|button|div)\b[^>]*(?:data-coin-cost|data-tile-lock-cost)[^>]*>/g)].map((match) => match[0]);
  const readAttribute = (tag, name) => tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] || "";
  const toNumber = (value) => {
    if (value == null || String(value).trim() === "") return null;
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
        hasAmountKRW: /\bdata-price-krw\s*=/.test(tag),
        tileLockPrice: toNumber(readAttribute(tag, "data-tile-lock-cost")),
        hasTileLockPrice: /\bdata-tile-lock-cost\s*=/.test(tag),
      };
    })
    .filter((row) => row.featureKey);
  const paidCardKeys = cardRows.map((row) => row.featureKey);
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
      const free = isFreeFortuneFeatureKey(row.featureKey);
      const expectedCoinPrice = free ? 0 : registryCoinPrice;
      const expectedAmountKRW = free ? 0 : registryAmountKRW;
      // Free cards must explicitly keep a zero coin price; stale secondary locks still fail.
      const coinMismatch = free ? row.coinPrice !== 0
        : row.coinPrice !== null && expectedCoinPrice !== null && row.coinPrice !== expectedCoinPrice;
      const amountMismatch = free ? row.hasAmountKRW && row.amountKRW !== 0
        : row.amountKRW !== null && expectedAmountKRW !== null && row.amountKRW !== expectedAmountKRW;
      const freeLockMismatch = free && row.hasTileLockPrice && row.tileLockPrice !== 0;
      return coinMismatch || amountMismatch || freeLockMismatch
        ? { ...row, registryCoinPrice, registryAmountKRW, expectedCoinPrice, expectedAmountKRW }
        : null;
    })
    .filter(Boolean);
  const result = {
    cardKeys: uniqueCardKeys,
    missing: uniqueCardKeys.filter((key) => !registryKeys.has(key)),
    priceMismatches,
    registryCount: registryKeys.size,
  };
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const shell = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const result = inspectMobilePricingParity(shell);
  console.log(JSON.stringify(result, null, 2));
  if (process.argv.includes("--strict") && (result.missing.length > 0 || result.priceMismatches.length > 0)) {
    process.exitCode = 1;
  }
}
