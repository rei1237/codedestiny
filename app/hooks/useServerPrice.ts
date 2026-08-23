"use client";

import { useEffect, useState } from "react";
import {
  FEATURE_KEY_PRICE_TABLE,
  PIG_COIN_UNLOCK_PRODUCTS,
  normalizePaidFeatureKey,
} from "@/worker/lib/paid-feature-registry.js";
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
  accessModel?: string;
};

/**
 * 영구 해금 상품은 `FEATURE_KEY_PRICE_TABLE` 이 아니라 `PIG_COIN_UNLOCK_PRODUCTS` 에 있고,
 * 키가 featureKey 가 아니라 `unlock.<snake_case>` 다. 그래서 featureKey 로만 조회하면 해금
 * 상품은 전부 값이 없어 라벨이 빈칸이 된다(2026-08-23 실측: `flower-fc` 가 그랬고, 랜딩 4개가
 * 그 자리를 회당 결제 키로 메워 5,000원을 표시하고 있었다 — 실제 게이트는 20,000원 해금).
 * featureKey 로 되짚어 찾는다.
 */
const UNLOCK_PRICING_BY_FEATURE_KEY: Record<string, RegistryPricing> = Object.fromEntries(
  Object.values(PIG_COIN_UNLOCK_PRODUCTS as Record<string, RegistryPricing & { featureKey?: string }>)
    .filter((entry) => Boolean(entry?.featureKey))
    .map((entry) => [String(entry.featureKey), entry]),
);

function lookupRegistryPricing(requestedKey: string): RegistryPricing | null {
  const normalizedKey = normalizePaidFeatureKey(requestedKey);
  const table = FEATURE_KEY_PRICE_TABLE as Record<string, RegistryPricing>;
  return table[normalizedKey]
    || table[requestedKey]
    || UNLOCK_PRICING_BY_FEATURE_KEY[normalizedKey]
    || UNLOCK_PRICING_BY_FEATURE_KEY[requestedKey]
    || null;
}

/** 이 featureKey 가 회당 결제인지 영구 해금인지. 레지스트리의 `accessModel` 이 정본이다. */
export function resolveFeatureAccessModel(featureKey?: string): "per_use" | "unlock" | "" {
  const requestedKey = String(featureKey || "").trim();
  if (!requestedKey) return "";
  const pricing = lookupRegistryPricing(requestedKey);
  const model = String(pricing?.accessModel || "").trim();
  return model === "unlock" || model === "per_use" ? model : "";
}

function resolveRegistryPriceLabel(input: ServerPriceInput): string | null {
  const requestedKey = String(input.featureKey || "").trim();
  if (!requestedKey) return null;

  const pricing = lookupRegistryPricing(requestedKey);
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
