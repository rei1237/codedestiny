"use client";

import { useEffect, useState } from "react";
import { FEATURE_KEY_PRICE_TABLE, normalizePaidFeatureKey } from "@/worker/lib/paid-feature-registry.js";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import { formatKrwFromCoins } from "@/lib/payment/coin-pricing";

export type ServerPriceInput = {
  featureKey?: string;
  subFeatureKey?: string;
  categoryKey?: string;
  /** Used only for non-feature legacy displays without a registry key. */
  fallbackLabel?: string;
  /** Used only for non-feature legacy displays without a registry key. */
  fallbackCoins?: number;
};

export type ServerPriceState = {
  label: string;
  loading: boolean;
  source: "registry" | "fallback";
};

const priceLabelCache = new Map<string, string>();

function priceCacheKey(input: ServerPriceInput): string {
  return [input.featureKey || "", input.subFeatureKey || "", input.categoryKey || ""].join("|");
}

function resolveFallbackLabel(input: ServerPriceInput): string {
  const label = String(input.fallbackLabel || "").trim();
  if (label) return label;
  const coins = Number(input.fallbackCoins || 0);
  if (coins > 0) return formatKrwFromCoins(coins, getCurrentLoadingLocale());
  return "";
}

function formatRegistryAmount(amountKRW: number, locale: string): string {
  if (!Number.isFinite(amountKRW) || amountKRW <= 0) return "";
  if (String(locale).toLowerCase().startsWith("ko")) {
    return `${Math.floor(amountKRW).toLocaleString("ko-KR")}원`;
  }
  return `KRW ${Math.floor(amountKRW).toLocaleString("en-US")}`;
}

type RegistryPricing = {
  amountKRW?: number;
  displayPrice?: string;
  cashPrice?: number;
  cost?: number;
  coinPrice?: number;
};

function resolveRegistryPriceLabel(input: ServerPriceInput): string | null {
  const requestedKey = String(input.featureKey || "").trim();
  if (!requestedKey) return null;

  const normalizedKey = normalizePaidFeatureKey(requestedKey);
  const table = FEATURE_KEY_PRICE_TABLE as Record<string, RegistryPricing>;
  const pricing = table[normalizedKey] || table[requestedKey];
  if (!pricing) return null;

  const displayPrice = String(pricing.displayPrice || "").trim();
  if (displayPrice) return displayPrice;

  const amountKRW = Number(pricing.amountKRW || pricing.cashPrice || 0)
    || Number(pricing.cost || pricing.coinPrice || 0) * 100;
  return formatRegistryAmount(amountKRW, getCurrentLoadingLocale()) || null;
}

function resolveCachedRegistryPrice(input: ServerPriceInput): string | null {
  const key = priceCacheKey(input);
  const cached = priceLabelCache.get(key);
  if (cached) return cached;
  const label = resolveRegistryPriceLabel(input);
  if (label) priceLabelCache.set(key, label);
  return label;
}

/**
 * Price display is intentionally local and synchronous. The Worker pricing
 * registry is imported as the canonical build-time source, so cards do not
 * request /api/billing/features just to render a matching price. Server-side
 * billing remains authoritative when an order or access decision is made.
 */
export function useServerPrice(input: ServerPriceInput): ServerPriceState {
  const key = priceCacheKey(input);
  const hasQuery = Boolean(input.featureKey || input.subFeatureKey || input.categoryKey);
  const cached = hasQuery ? resolveCachedRegistryPrice(input) : undefined;
  const fallback = hasQuery ? "" : resolveFallbackLabel(input);

  const [state, setState] = useState<ServerPriceState>(() => cached
    ? { label: cached, loading: false, source: "registry" }
    : { label: fallback, loading: false, source: "fallback" });

  useEffect(() => {
    if (!hasQuery) {
      setState({ label: fallback, loading: false, source: "fallback" });
      return;
    }
    const label = resolveCachedRegistryPrice(input);
    setState(label
      ? { label, loading: false, source: "registry" }
      : { label: "", loading: false, source: "registry" });
    // The registry key is the complete dependency for this display lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fallback]);

  return state;
}
