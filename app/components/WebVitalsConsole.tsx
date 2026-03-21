"use client";

import { onCLS, onINP, onLCP } from "web-vitals";
import { useEffect } from "react";

const THRESHOLDS = { LCP: 2500, CLS: 0.1, INP: 200 } as const;

type VName = keyof typeof THRESHOLDS;

function report(name: VName, metric: { value: number; rating?: string; id?: string; navigationType?: string }) {
  const v = metric.value;
  let pass = true;
  if (name === "LCP") pass = v <= THRESHOLDS.LCP;
  else if (name === "CLS") pass = v <= THRESHOLDS.CLS;
  else if (name === "INP") pass = v <= THRESHOLDS.INP;

  const payload = {
    value: v,
    rating: metric.rating,
    threshold: THRESHOLDS[name],
    pass,
    id: metric.id,
    navigationType: metric.navigationType,
  };

  if (pass) {
    console.log("[web-vitals]", name, payload);
  } else {
    console.warn("[web-vitals] THRESHOLD EXCEEDED", name, payload);
  }
}

/** Next.js 라우트에서 LCP / CLS / INP를 콘솔에 출력하고 목표치 대비 pass 여부를 표시 */
export default function WebVitalsConsole() {
  useEffect(() => {
    onCLS((m) => report("CLS", m));
    onINP((m) => report("INP", m));
    onLCP((m) => report("LCP", m));
  }, []);

  return null;
}
