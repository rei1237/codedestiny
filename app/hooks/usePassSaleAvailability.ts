"use client";
import { useEffect, useState } from "react";

export function usePassSaleAvailability(channel: "web" | "googlePlay" = "web") {
  return usePassSaleAvailabilityDetails(channel).ready;
}

export function usePassSaleAvailabilityDetails(channel: "web" | "googlePlay" = "web") {
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setReady({});
    setStatus("loading");
    fetch(`/api/payments/pass-offers?channel=${channel}`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Pass offers unavailable");
        return response.json();
      })
      .then(body => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(body?.offers) || body.offers.length === 0) throw new Error("Missing pass offers");
        setReady(Object.fromEntries(body.offers.map((offer: { tier: string; saleEnabled: boolean }) => [offer.tier, offer.saleEnabled === true])));
        setStatus("ready");
      }).catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [channel, attempt]);
  return { ready, status, refresh: () => setAttempt(value => value + 1) };
}
