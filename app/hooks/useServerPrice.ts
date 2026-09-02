"use client";

import { useEffect, useState } from "react";
import {
  FEATURE_KEY_PRICE_TABLE,
  PIG_COIN_UNLOCK_PRODUCTS,
  normalizePaidFeatureKey,
} from "@/worker/lib/paid-feature-registry.js";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";
import { formatKrwFromCoins } from "@/lib/payment/coin-pricing";
import { checkoutEntryRuntime } from "@/app/_lib/legacy-core-runtime";
import { useLocale, useTPick } from "@/lib/i18n/useT";

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

/**
 * 🔴 로케일 의존 **라벨**이 아니라 금액을 캐시한다. 캐시 키에는 로케일이 없어서
 * (featureKey|subFeatureKey|categoryKey), 라벨을 담아 두면 세션 중 언어를 바꿔도
 * 첫 로케일의 라벨이 계속 나온다. 금액은 로케일 무관이라 이 키가 구조적으로 안전하다.
 */
const priceAmountCache = new Map<string, ResolvedPrice>();

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

/** 레지스트리에서 뽑은 **로케일 무관** 가격. 포맷은 조회가 아니라 렌더 시점에 한다. */
type ResolvedPrice = { displayPrice: string; amountKRW: number };

function resolveRegistryPrice(input: ServerPriceInput): ResolvedPrice | null {
  const requestedKey = String(input.featureKey || "").trim();
  if (!requestedKey) return null;

  const pricing = lookupRegistryPricing(requestedKey);
  if (!pricing) return null;

  const displayPrice = String(pricing.displayPrice || "").trim();
  const amountKRW = Number(pricing.amountKRW || pricing.cashPrice || 0)
    || Number(pricing.cost || pricing.coinPrice || 0) * 100;
  if (!displayPrice && !(Number.isFinite(amountKRW) && amountKRW > 0)) return null;
  return { displayPrice, amountKRW };
}

function resolveCachedRegistryPrice(input: ServerPriceInput): ResolvedPrice | null {
  const key = priceCacheKey(input);
  const cached = priceAmountCache.get(key);
  if (cached) return cached;
  const resolved = resolveRegistryPrice(input);
  if (resolved) priceAmountCache.set(key, resolved);
  return resolved;
}

function formatResolvedPrice(resolved: ResolvedPrice, locale: string): string {
  if (resolved.displayPrice) return resolved.displayPrice;
  return formatRegistryAmount(resolved.amountKRW, locale);
}

/** `appendReferenceApprox` 가 쓰는 참고 환산 런타임의 최소 계약(테스트에서 가짜를 주입한다). */
export type ReferenceApproxRuntime = {
  formatReferenceAmount(krwAmount: number): string;
};

/**
 * 사전이 아직 안 왔을 때 `useTPick` 이 그대로 돌려줄 표식.
 * payment.overseas.approx 는 12벌 전부에 있으므로(실측 2026-09-03), 이 값이 되돌아왔다는
 * 것은 **사전 미도착** 하나뿐이다.
 */
const APPROX_TEMPLATE_PENDING = "cd:approx-template-pending";

/**
 * 원화 라벨 뒤에 **표시 전용** 개산가를 덧붙인다.
 *
 * 🔴 결제 금액으로 쓰면 안 된다 — KG이니시스 해외카드 특약은 승인·정산이 모두 KRW 다.
 *    환산 정본은 js/core/checkout-entry.js 의 formatReferenceAmount 하나(정적 참고표)이고
 *    여기서는 그 결과를 문자열로 붙이기만 한다. 가드: scripts/verify-overseas-payment-notice.mjs
 *
 * 한국어 화면에서는 formatReferenceAmount 가 "" 를 돌려주므로 라벨이 한 글자도 바뀌지 않는다.
 *
 * `approxTemplate` 은 **React 사전에서 이미 해석된** 문구다(`"approx. {amount}"`). 빈 문자열이면
 * 접미를 통째로 건너뛴다 — 아래 주석 참고.
 */
export function appendReferenceApprox(
  label: string,
  amountKRW: number,
  runtime: ReferenceApproxRuntime,
  approxTemplate: string,
): string {
  if (!label || !Number.isFinite(amountKRW) || amountKRW <= 0) return label;
  const amount = runtime.formatReferenceAmount(amountKRW);
  if (!amount) return label;
  // 🔴 문구는 checkoutEntry.text 로 읽지 않는다. cdTranslate 는 사전이 아직 없으면
  //    **호출부의 한국어 폴백**을 돌려주고(LocaleRuntimeBridge.tsx 의 activeDictionary 분기),
  //    브리지는 cd:locale-ready 를 사전 로드 **전에** 쏘므로 구독만으로는 못 막는다.
  //    그래서 영어 화면에 `KRW 30,000 (약 $22 상당)` 이 나갔다
  //    (2026-09-03 스테이징 실측: /naming-ai/?lang=en · /vedic-ai/?lang=ja).
  //    사전이 오기 전에는 원화 라벨만 두고, 도착하면 그때 붙인다.
  if (!approxTemplate) return label;
  return `${label} (${approxTemplate.replace(/\{amount\}/g, amount)})`;
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
  // 🔴 재실행 트리거 전용 — 값은 아래 getCurrentLoadingLocale() 이 그대로 읽는다.
  //    useLocale 이 cd:locale-ready 를 구독하는데, LocaleRuntimeBridge 는 그 이벤트를
  //    window.cdGetCurrentLanguage 를 심은 **뒤에** 쏜다(LocaleRuntimeBridge.tsx:140→34).
  //    이 구독이 없으면 개산가가 영원히 안 붙는다 — 그 브리지는 dynamic import 라
  //    (RuntimeClientGuards.tsx:11) 이 훅의 effect 가 대개 먼저 돌고, 그때
  //    formatReferenceAmount 는 언어를 몰라 한국어 화면으로 판정해 "" 를 돌려준다.
  //    GlobalHeader.tsx:186 이 같은 순서 문제로 네비가 ko 로 굳었던 자리다.
  const locale = useLocale();
  // 🔴 개산가 문구는 React 사전에서만 읽는다(appendReferenceApprox 안의 주석이 이유다).
  //    사전이 도착하면 이 값이 표식에서 실문구로 바뀌므로, effect 의존성에 그대로 넣어
  //    그때 접미가 붙게 한다. useT 가 아니라 useTPick 인 이유는 PriceBadge 와 같다.
  const pick = useTPick();
  const approxRaw = pick("payment.overseas.approx", APPROX_TEMPLATE_PENDING);
  const approxTemplate = approxRaw === APPROX_TEMPLATE_PENDING ? "" : String(approxRaw || "");
  const cached = hasQuery ? resolveCachedRegistryPrice(input) : null;
  const fallback = hasQuery ? "" : resolveFallbackLabel(input);

  const [state, setState] = useState<ServerPriceState>(() => cached
    ? { label: formatResolvedPrice(cached, getCurrentLoadingLocale()), loading: false, source: "registry" }
    : { label: fallback, loading: false, source: "fallback" });

  useEffect(() => {
    if (!hasQuery) {
      setState({ label: fallback, loading: false, source: "fallback" });
      return;
    }
    const resolved = resolveCachedRegistryPrice(input);
    const label = resolved ? formatResolvedPrice(resolved, getCurrentLoadingLocale()) : "";
    // 🔴 개산가는 **마운트 뒤에만** 붙인다. checkoutEntryRuntime 은 SSR 과 레거시 코어 로드
    //    전에 throw 하는 프록시라(app/_lib/legacy-core-runtime.ts) 렌더 중에 부르면 서버
    //    렌더가 죽는다. app/points/PointsClient.tsx 의 useOverseasCharge 와 같은 계약이다.
    let display = label;
    if (label && resolved && !resolved.displayPrice) {
      try {
        display = appendReferenceApprox(label, resolved.amountKRW, checkoutEntryRuntime, approxTemplate);
      } catch {
        /* 런타임이 아직 없으면 원화 라벨만 보여 준다 */
      }
    }
    setState({ label: display, loading: false, source: "registry" });
    // 레지스트리 키·로케일·개산가 문구가 이 표시 조회의 완전한 의존이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fallback, locale, approxTemplate]);

  return state;
}
