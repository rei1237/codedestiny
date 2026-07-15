"use client";

// window.CodeDestinyNative(= MobileAppRuntimeBridge가 설치) 타입 래퍼.
// 브리지가 아직 안 붙었거나 웹 브라우저로 열린 경우에도 던지지 않고 실패 객체를 돌려준다.

export type AppProductDetails = {
  productId: string;
  productType: string;
  title: string;
  name: string;
  description: string;
  /** 화면에 표시할 가격. 하드코딩 대신 반드시 이 값을 쓴다(Play Console 가격 변경 추종). */
  formattedPrice: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
};

export type AppNativePurchase = {
  productId?: string;
  productType?: string;
  purchaseToken?: string;
  packageName?: string;
  orderId?: string;
  purchaseState?: number | string;
  acknowledged?: boolean;
};

/** Play Billing의 Purchase.PurchaseState. 0=UNSPECIFIED, 1=PURCHASED, 2=PENDING */
export const PURCHASE_STATE_PURCHASED = 1;
export const PURCHASE_STATE_PENDING = 2;

type NativeBridge = {
  purchase?: (input: {
    featureKey: string;
    productId: string;
    productType?: string;
    idempotencyKey?: string;
    obfuscatedAccountId?: string;
    obfuscatedProfileId?: string;
  }) => Promise<AppNativePurchase & { ok?: boolean; code?: string; message?: string }>;
  consume?: (input: { purchaseToken: string }) => Promise<{ ok?: boolean; code?: string; message?: string }>;
  restore?: (input?: { productType?: "inapp" | "subs" | "all" }) => Promise<{
    ok?: boolean;
    code?: string;
    message?: string;
    purchases?: AppNativePurchase[];
  }>;
  queryProducts?: (input: { productIds: string[]; productType?: string }) => Promise<{
    ok?: boolean;
    code?: string;
    message?: string;
    products?: Partial<AppProductDetails>[];
  }>;
};

export function getNativeBridge(): NativeBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { CodeDestinyNative?: NativeBridge }).CodeDestinyNative || null;
}

export function isNativeBillingReady(): boolean {
  const bridge = getNativeBridge();
  return typeof bridge?.purchase === "function";
}

export async function queryAppProducts(productIds: string[]): Promise<AppProductDetails[]> {
  const bridge = getNativeBridge();
  if (!bridge?.queryProducts || !productIds.length) return [];
  try {
    const result = await bridge.queryProducts({ productIds, productType: "inapp" });
    if (!result?.ok || !Array.isArray(result.products)) return [];
    return result.products.map((product) => ({
      productId: String(product.productId || ""),
      productType: String(product.productType || "inapp"),
      title: String(product.title || ""),
      name: String(product.name || ""),
      description: String(product.description || ""),
      formattedPrice: String(product.formattedPrice || ""),
      priceAmountMicros: Number(product.priceAmountMicros || 0),
      priceCurrencyCode: String(product.priceCurrencyCode || ""),
    }));
  } catch {
    return [];
  }
}

export async function restoreNativePurchases(): Promise<AppNativePurchase[]> {
  const bridge = getNativeBridge();
  if (!bridge?.restore) return [];
  try {
    const result = await bridge.restore({ productType: "all" });
    return result?.ok && Array.isArray(result.purchases) ? result.purchases : [];
  } catch {
    return [];
  }
}

export async function consumeNativePurchase(purchaseToken: string): Promise<boolean> {
  const bridge = getNativeBridge();
  if (!bridge?.consume || !purchaseToken) return false;
  try {
    const result = await bridge.consume({ purchaseToken });
    return result?.ok === true;
  } catch {
    return false;
  }
}
