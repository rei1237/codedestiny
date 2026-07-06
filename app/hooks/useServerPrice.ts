"use client";

import { useEffect, useState } from "react";
import { fetchBillingFeaturePricing } from "@/app/_lib/billing-client";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import { formatKrwFromCoins } from "@/lib/payment/coin-pricing";

export type ServerPriceInput = {
  featureKey?: string;
  subFeatureKey?: string;
  categoryKey?: string;
  /** 서버 조회 실패 시 표시할 라벨 (기존 하드코딩 라벨을 fallback으로 강등) */
  fallbackLabel?: string;
  /** 서버 조회 실패 시 환산 표시할 코인 값 */
  fallbackCoins?: number;
};

export type ServerPriceState = {
  label: string;
  loading: boolean;
  source: "server" | "fallback";
};

// 세션 내 기능별 1회 조회 캐시 (가격은 세션 중 바뀌지 않음)
const priceLabelCache = new Map<string, string>();
const priceInflight = new Map<string, Promise<string | null>>();

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

async function fetchServerPriceLabel(input: ServerPriceInput): Promise<string | null> {
  const key = priceCacheKey(input);
  const cached = priceLabelCache.get(key);
  if (cached) return cached;

  let inflight = priceInflight.get(key);
  if (!inflight) {
    inflight = (async () => {
      try {
        const result = await fetchBillingFeaturePricing({
          featureKey: input.featureKey,
          subFeatureKey: input.subFeatureKey,
          categoryKey: input.categoryKey,
          reason: "price-display",
          silent: true,
        });
        const pricing = result.ok ? result.data?.pricing : null;
        if (!pricing) return null;
        const displayPrice = String(pricing.displayPrice || "").trim();
        const label = displayPrice || (pricing.cost > 0 ? formatKrwFromCoins(pricing.cost, getCurrentLoadingLocale()) : "");
        if (!label) return null;
        priceLabelCache.set(key, label);
        return label;
      } catch {
        return null;
      } finally {
        priceInflight.delete(key);
      }
    })();
    priceInflight.set(key, inflight);
  }
  return inflight;
}

/**
 * 서버 billing-features 가격 단일 정본 조회 훅 (표시 전용 — 결제 동작 없음).
 * 서버 가격 → fallbackLabel → formatKrwFromCoins(fallbackCoins) → "" 순으로 강등.
 */
export function useServerPrice(input: ServerPriceInput): ServerPriceState {
  const key = priceCacheKey(input);
  const fallback = resolveFallbackLabel(input);
  const hasQuery = Boolean(input.featureKey || input.subFeatureKey || input.categoryKey);
  const cached = hasQuery ? priceLabelCache.get(key) : undefined;

  const [state, setState] = useState<ServerPriceState>(() => (
    cached
      ? { label: cached, loading: false, source: "server" }
      : { label: fallback, loading: hasQuery, source: "fallback" }
  ));

  useEffect(() => {
    if (!hasQuery) {
      setState({ label: fallback, loading: false, source: "fallback" });
      return;
    }
    let cancelled = false;
    void fetchServerPriceLabel({
      featureKey: input.featureKey,
      subFeatureKey: input.subFeatureKey,
      categoryKey: input.categoryKey,
    }).then((label) => {
      if (cancelled) return;
      if (label) {
        setState({ label, loading: false, source: "server" });
      } else {
        setState({ label: fallback, loading: false, source: "fallback" });
      }
    });
    return () => {
      cancelled = true;
    };
    // key가 조회 파라미터 3종을 대표, fallback은 문자열 비교로 충분
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fallback]);

  return state;
}
