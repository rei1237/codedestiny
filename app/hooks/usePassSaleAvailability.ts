"use client";
import { useEffect, useState } from "react";

export function usePassSaleAvailability(channel: "web" | "googlePlay" = "web") {
  const [ready, setReady] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/payments/pass-offers?channel=${channel}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(body => {
        if (!controller.signal.aborted && Array.isArray(body?.offers)) {
          setReady(Object.fromEntries(body.offers.map((offer: { tier: string; saleEnabled: boolean }) => [offer.tier, offer.saleEnabled === true])));
        }
      }).catch(() => { /* Unknown availability never enables a purchase. */ });
    return () => controller.abort();
  }, [channel]);
  return ready;
}
