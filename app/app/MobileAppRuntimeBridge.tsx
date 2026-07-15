"use client";

import { useEffect } from "react";
import { getApiBaseUrl } from "@/app/_lib/api-config";
import { persistSanitizedAuthUser } from "@/app/_lib/auth-storage";
import { toAbsoluteApiUrl } from "@/app/_lib/http-client";

type NativePurchaseInput = {
  featureKey: string;
  productId: string;
  productType?: string;
  idempotencyKey?: string;
  obfuscatedAccountId?: string;
  obfuscatedProfileId?: string;
};

type NativeConsumeInput = {
  purchaseToken: string;
};

type NativeConsumeResult = {
  ok?: boolean;
  purchaseToken?: string;
  message?: string;
  code?: string;
};

type NativeQueryProductsInput = {
  productIds: string[];
  productType?: string;
};

type NativeProductDetails = {
  productId?: string;
  productType?: string;
  title?: string;
  name?: string;
  description?: string;
  formattedPrice?: string;
  priceAmountMicros?: number;
  priceCurrencyCode?: string;
};

type NativeQueryProductsResult = {
  ok?: boolean;
  provider?: string;
  products?: NativeProductDetails[];
  message?: string;
  code?: string;
};

type NativePurchaseResult = {
  ok?: boolean;
  purchaseToken?: string;
  productId?: string;
  productType?: string;
  packageName?: string;
  orderId?: string;
  purchaseState?: number | string;
  acknowledged?: boolean;
  message?: string;
  code?: string;
};

type NativeRestoreInput = {
  productType?: "inapp" | "subs" | "all";
};

type NativeRestoreResult = {
  ok?: boolean;
  provider?: string;
  packageName?: string;
  purchases?: NativePurchaseResult[];
  message?: string;
  code?: string;
};

type NativeAuthInput = {
  provider: "google" | "naver" | "kakao";
  nextPath?: string;
};

type NativeAuthResult = {
  ok?: boolean;
  provider?: string;
  message?: string;
  code?: string;
};

type NativeListenerHandle = {
  remove?: () => Promise<void> | void;
};

type CapacitorRuntime = {
  isNativePlatform?: () => boolean;
  Plugins?: {
    CodeDestinyBilling?: {
      purchase?: (input: NativePurchaseInput) => Promise<NativePurchaseResult>;
      restore?: (input: NativeRestoreInput) => Promise<NativeRestoreResult>;
      consume?: (input: NativeConsumeInput) => Promise<NativeConsumeResult>;
      queryProducts?: (input: NativeQueryProductsInput) => Promise<NativeQueryProductsResult>;
    };
    App?: {
      addListener?: (
        eventName: "appUrlOpen",
        listenerFunc: (event: { url?: string }) => void,
      ) => Promise<NativeListenerHandle> | NativeListenerHandle;
    };
    Browser?: {
      open?: (input: { url: string }) => Promise<void>;
      close?: () => Promise<void>;
    };
  } & Record<string, unknown>;
};

declare global {
  interface Window {
    __CODE_DESTINY_RUNTIME_TARGET?: string;
    CodeDestinyNative?: {
      purchase(input: NativePurchaseInput): Promise<NativePurchaseResult>;
      restore(input?: NativeRestoreInput): Promise<NativeRestoreResult>;
      consume(input: NativeConsumeInput): Promise<NativeConsumeResult>;
      queryProducts(input: NativeQueryProductsInput): Promise<NativeQueryProductsResult>;
      openAuth(input: NativeAuthInput): Promise<NativeAuthResult>;
    };
  }
}

function getNativeBillingPlugin() {
  return (window as unknown as { Capacitor?: CapacitorRuntime }).Capacitor?.Plugins?.CodeDestinyBilling;
}

function getNativeAppPlugin() {
  return (window as unknown as { Capacitor?: CapacitorRuntime }).Capacitor?.Plugins?.App;
}

function getNativeBrowserPlugin() {
  return (window as unknown as { Capacitor?: CapacitorRuntime }).Capacitor?.Plugins?.Browser;
}

function buildOAuthStartUrl(input: NativeAuthInput) {
  const provider = String(input.provider || "").trim().toLowerCase();
  const url = new URL(toAbsoluteApiUrl(`/api/auth/oauth/${provider}/start`, getApiBaseUrl()), window.location.href);
  url.searchParams.set("runtimeTarget", "mobile-app");
  url.searchParams.set("appRedirect", "com.codedestiny.app://auth");
  url.searchParams.set("next", input.nextPath || "/app");
  return url.toString();
}

async function completeMobileOAuth(appUrl: string) {
  const parsed = new URL(appUrl);
  if (parsed.protocol !== "com.codedestiny.app:" || parsed.host !== "auth") return false;
  const socialGrant = parsed.searchParams.get("social_grant") || parsed.searchParams.get("socialGrant") || "";
  if (!socialGrant) return false;

  const response = await fetch(toAbsoluteApiUrl("/api/auth/oauth/complete", getApiBaseUrl()), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({
      socialGrant,
      nextPath: parsed.searchParams.get("next") || "/app",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.accessToken) {
    throw new Error(String(payload?.message || "Mobile OAuth completion failed."));
  }

  localStorage.setItem("fortune_auth_token", String(payload.accessToken));
  if (payload.user) persistSanitizedAuthUser(payload.user);
  window.dispatchEvent(new CustomEvent("cd:auth-changed", {
    detail: { source: "mobile-app-oauth", event: "login", at: Date.now() },
  }));
  return true;
}

export default function MobileAppRuntimeBridge() {
  useEffect(() => {
    window.__CODE_DESTINY_RUNTIME_TARGET = "mobile-app";
    document.documentElement.dataset.runtimeTarget = "mobile-app";

    let appUrlListener: NativeListenerHandle | null = null;
    const listenerResult = getNativeAppPlugin()?.addListener?.("appUrlOpen", (event) => {
      const appUrl = String(event?.url || "");
      if (!appUrl) return;
      completeMobileOAuth(appUrl)
        .then((handled) => {
          if (handled) return getNativeBrowserPlugin()?.close?.();
          return undefined;
        })
        .catch(() => undefined);
    });
    if (listenerResult) {
      Promise.resolve(listenerResult)
        .then((handle) => {
          appUrlListener = handle || null;
        })
        .catch(() => undefined);
    }

    window.CodeDestinyNative = {
      ...window.CodeDestinyNative,
      async purchase(input) {
        const plugin = getNativeBillingPlugin();
        if (!plugin?.purchase) {
          return {
            ok: false,
            code: "NATIVE_BILLING_UNAVAILABLE",
            message: "Native billing is not available yet.",
          };
        }
        return plugin.purchase(input);
      },
      async restore(input = { productType: "all" }) {
        const plugin = getNativeBillingPlugin();
        if (!plugin?.restore) {
          return {
            ok: false,
            code: "NATIVE_BILLING_UNAVAILABLE",
            message: "Native billing restore is not available yet.",
            purchases: [],
          };
        }
        return plugin.restore(input);
      },
      async consume(input) {
        const plugin = getNativeBillingPlugin();
        if (!plugin?.consume) {
          return {
            ok: false,
            code: "NATIVE_BILLING_UNAVAILABLE",
            message: "Native billing consume is not available yet.",
          };
        }
        return plugin.consume(input);
      },
      async queryProducts(input) {
        const plugin = getNativeBillingPlugin();
        if (!plugin?.queryProducts) {
          return {
            ok: false,
            code: "NATIVE_BILLING_UNAVAILABLE",
            message: "Native billing product query is not available yet.",
            products: [],
          };
        }
        return plugin.queryProducts(input);
      },
      async openAuth(input) {
        const provider = String(input?.provider || "").trim().toLowerCase();
        if (!["google", "naver", "kakao"].includes(provider)) {
          return { ok: false, code: "OAUTH_PROVIDER_UNSUPPORTED", message: "Unsupported provider." };
        }
        const startUrl = buildOAuthStartUrl({ ...input, provider: provider as NativeAuthInput["provider"] });
        const browser = getNativeBrowserPlugin();
        if (browser?.open) {
          await browser.open({ url: startUrl });
        } else {
          window.location.href = startUrl;
        }
        return { ok: true, provider };
      },
    };

    return () => {
      void appUrlListener?.remove?.();
    };
  }, []);

  return null;
}
