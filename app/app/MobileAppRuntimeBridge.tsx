"use client";

import { useEffect } from "react";

type NativePurchaseInput = {
  featureKey: string;
  productId: string;
  productType?: string;
  idempotencyKey?: string;
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

declare global {
  interface Window {
    __CODE_DESTINY_RUNTIME_TARGET?: string;
    CodeDestinyNative?: {
      purchase(input: NativePurchaseInput): Promise<NativePurchaseResult>;
    };
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: Record<string, unknown>;
    };
  }
}

function getNativeBillingPlugin() {
  const plugins = window.Capacitor?.Plugins || {};
  return plugins.CodeDestinyBilling as
    | { purchase?: (input: NativePurchaseInput) => Promise<NativePurchaseResult> }
    | undefined;
}

export default function MobileAppRuntimeBridge() {
  useEffect(() => {
    window.__CODE_DESTINY_RUNTIME_TARGET = "mobile-app";
    document.documentElement.dataset.runtimeTarget = "mobile-app";

    if (!window.CodeDestinyNative) {
      window.CodeDestinyNative = {
        async purchase(input) {
          const plugin = getNativeBillingPlugin();
          if (!plugin?.purchase) {
            return {
              ok: false,
              code: "NATIVE_BILLING_UNAVAILABLE",
              message: "앱 결제 연결이 아직 준비되지 않았습니다.",
            };
          }
          return plugin.purchase(input);
        },
      };
    }
  }, []);

  return null;
}
