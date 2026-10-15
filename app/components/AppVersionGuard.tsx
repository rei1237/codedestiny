"use client";
import { useEffect } from "react";
import { usePaymentProcessing } from "./PaymentProcessingContext";
import { isPaidAttemptInProgress, restorePaidAttemptFromUrlOrStorage } from "../_lib/paid-attempt-session";
type RuntimeWindow = Window & Record<string, unknown>;
function getWindowBooleanFlag(flagName: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean((window as unknown as RuntimeWindow)[flagName]);
  } catch (e) {
    return false;
  }
}

function getBlockingReason(isPaymentProcessing: boolean): string {
  if (typeof document === "undefined") {
    return "";
  }
  const copy = { reasons: { paymentProcessing:"payment", paidAttempt:"paid", importantInput:"input", criticalTask:"busy", typing:"typing" } };

  if (isPaymentProcessing || getWindowBooleanFlag("__CD_PAYMENT_PROCESSING__")) {
    return copy.reasons.paymentProcessing;
  }

  if (isPaidAttemptInProgress()) {
    return copy.reasons.paidAttempt;
  }

  if (getWindowBooleanFlag("__CD_VERSION_GUARD_BLOCK__")) {
    return copy.reasons.importantInput;
  }

  if (document?.body?.dataset?.cdVersionGuardBusy === "1") {
    return copy.reasons.criticalTask;
  }

  const active = document.activeElement as
    | (HTMLElement & { value?: string })
    | null;

  if (active) {
    const tagName = String(active.tagName || "").toLowerCase();
    const isEditable = active.isContentEditable
      || tagName === "input"
      || tagName === "textarea"
      || tagName === "select";

    if (isEditable) {
      const value = String(active.value || "").trim();
      const text = String(active.textContent || "").trim();
      if (value || text) {
        return copy.reasons.typing;
      }
    }
  }

  return "";
}

export default function AppVersionGuard() {
 const { isPaymentLoading } = usePaymentProcessing();
 useEffect(() => {
   (function removeCompletedVersionQuery() {
     try {
       const url = new URL(window.location.href);
       const reloadVersion = window.sessionStorage.getItem("app_version_reload_guard");
       if (reloadVersion && url.searchParams.get("v") === reloadVersion) {
         url.searchParams.delete("v");
         window.history.replaceState(window.history.state, "", url.toString());
       }
     } catch { /* Embedded storage may be unavailable. */ }
   })();
   restorePaidAttemptFromUrlOrStorage();
 }, []);
 useEffect(() => {
   const bind = () => { const runtime = (window as unknown as { __cdPwaLifecycle?: { setSafetyProvider: (fn: (() => boolean) | null) => void } }).__cdPwaLifecycle;
   runtime?.setSafetyProvider(() => !getBlockingReason(isPaymentLoading)); };
   bind();window.addEventListener("cd:pwa-ready",bind);
   return () => {window.removeEventListener("cd:pwa-ready",bind);};
 }, [isPaymentLoading]);
 return null;
}
