/**
 * Bundled for static pages (index.html): `npx esbuild scripts/web-vitals-console.mjs --bundle --format=esm --outfile=js/web-vitals-console.js --platform=browser`
 */
import { onCLS, onINP, onLCP } from "web-vitals";

const THRESHOLDS = { LCP: 2500, CLS: 0.1, INP: 200 };

function report(name, metric) {
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

onCLS((m) => report("CLS", m));
onINP((m) => report("INP", m));
onLCP((m) => report("LCP", m));
