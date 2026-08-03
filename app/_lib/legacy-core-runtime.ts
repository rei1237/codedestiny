import type checkoutEntry from "@/js/core/checkout-entry.js";
import type passVerdict from "@/js/core/pass-verdict.js";

type CheckoutEntryRuntime = typeof checkoutEntry;
type PassVerdictRuntime = typeof passVerdict;

type LegacyCoreWindow = Window & typeof globalThis & {
  __cdCheckoutEntry?: CheckoutEntryRuntime;
  __cdPassVerdict?: PassVerdictRuntime;
};

function runtimeWindow(): LegacyCoreWindow {
  if (typeof window === "undefined") {
    throw new Error("Legacy billing runtime was accessed during server rendering.");
  }
  return window as LegacyCoreWindow;
}

function checkoutEntrySource(): CheckoutEntryRuntime {
  const source = runtimeWindow().__cdCheckoutEntry;
  if (!source) {
    throw new Error("Checkout entry runtime is not ready.");
  }
  return source;
}

function passVerdictSource(): PassVerdictRuntime {
  const source = runtimeWindow().__cdPassVerdict;
  if (!source) {
    throw new Error("Pass verdict runtime is not ready.");
  }
  return source;
}

function createLegacyRuntimeProxy<T extends object>(source: () => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const runtime = source();
      const value = Reflect.get(runtime, property);
      return typeof value === "function" ? value.bind(runtime) : value;
    },
  });
}

// 정적 셸·독립 정적·React가 동일한 UMD 구현을 읽는다. Next 번들에는 타입만 남긴다.
export const checkoutEntryRuntime = createLegacyRuntimeProxy<CheckoutEntryRuntime>(checkoutEntrySource);
export const passVerdictRuntime = createLegacyRuntimeProxy<PassVerdictRuntime>(passVerdictSource);
