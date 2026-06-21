import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  canLoadAdsense,
  canLoadAdsenseForCanonicalPath,
  canLoadAdsenseForCanonicalUrl,
} from "../app/components/adsense-route-policy.js";

const allowRoutes = [
  "/about",
  "/faq",
  "/famous-saju",
  "/famous-saju/category/actor",
  "/insights/saju",
  "/insights/famous-saju/adele",
  "/high-value/complete-guide-to-saju",
  "/saju/guide",
  "/saju/ten-gods",
  "/saju/five-elements",
  "/astrology/guide",
  "/calendar/guide",
  "/mayan-calendar/guide",
  "/music/guide",
  "/sukuyo/guide",
  "/tarot/guide",
  "/tarot/numerology",
  "/tarot/prompt-maker",
  "/vedic/guide",
  "/ziwei/guide",
];

const blockedRoutes = [
  "/advertising-policy",
  "/404",
  "/_not-found",
  "/contact",
  "/disclaimer",
  "/dev-status",
  "/editorial-policy",
  "/en",
  "/en/insights",
  "/en/saju/guide",
  "/en-us",
  "/health-report/guide",
  "/index.html",
  "/ja-jp",
  "/landing",
  "/login",
  "/animal/physio",
  "/maya",
  "/me",
  "/music",
  "/oracle/royal-tea",
  "/olympus",
  "/palm-reading",
  "/palm-reading/scan",
  "/pdf/life-book",
  "/pdf/love-report",
  "/pdf/new-year",
  "/points/history",
  "/premium",
  "/premium-reports",
  "/premium/saju-lifebook",
  "/premium/saju-love-bible",
  "/premium-unlock",
  "/psychotest",
  "/psychotest/psycho",
  "/privacy",
  "/results/demo",
  "/saju/animal-destiny",
  "/saju/destiny-bias",
  "/saju/destiny-bias/result",
  "/saju/destiny-meeting-place",
  "/saju/lifebook",
  "/saju/love-bible",
  "/saju/love-simulation",
  "/saju-fpti",
  "/saju-guardian",
  "/saju-picture",
  "/signup",
  "/sukuyo/calendar",
  "/tarot/crystal-soul",
  "/tarot/mindscan",
  "/tarot/year",
  "/thin/guide",
  "/unknown/guide",
  "/ziwei/chart",
  "/ziwei/chart/result",
  "/zh-cn",
  "/zh/health-report/guide",
  "/500",
  "/blog",
  "/famous",
  "/fortune",
  "/fortune/sikojen-povailu",
  "/fortune/prompt-hub/result",
  "/famous-saju/adele",
  "/famous-saju/king-sejong",
  "/premium-reports/archive",
  "/saju/animal-destiny/result",
  "/saju/lifebook/result",
  "/saju/love-bible/result",
  "/tarot/crystal-soul/result",
  "/tarot/mindscan/result",
  "/tarot/numerology/result",
  "/tarot/prompt-maker/result",
];

const adSupportedPaidLaunchRoutes = new Set([
  "/tarot/numerology",
  "/tarot/prompt-maker",
]);

function paidFeatureLaunchPathnames() {
  const source = readFileSync(resolve("app/_lib/serviceFeatureRegistry.ts"), "utf8");
  const routes = new Set();
  const matcher = /accessType:\s*"(paid|premium_report)"/g;
  let match;

  while ((match = matcher.exec(source))) {
    const featureStart = source.lastIndexOf("\n  {", match.index);
    const block = source.slice(Math.max(0, featureStart), match.index);
    const launchRoute = block.match(/launchRoute:\s*"([^"]+)"/)?.[1];
    if (!launchRoute) continue;

    routes.add(new URL(launchRoute, "https://code-destiny.com").pathname);
  }

  return [...routes].sort();
}

const canonicalAllowSamples = [
  ["/about", "/about"],
  ["/about/", "/about"],
  ["/about?utm_source=test", "/about"],
  ["/about?gclid=test-click-id", "/about"],
  ["/insights/famous-saju/king-sejong", "/insights/famous-saju/king-sejong"],
  ["/high-value/complete-guide-to-saju?utm_source=test", "/high-value/complete-guide-to-saju"],
  ["/tarot/numerology", "/tarot/numerology"],
  ["/tarot/prompt-maker", "/tarot/prompt-maker"],
];

const canonicalBlockedSamples = [
  ["/about", "/faq"],
  ["/about?action=openPaymentModal", "/about"],
  ["/saju/guide?premiumIntent=love-secret-pdf", "/saju/guide"],
  ["/saju/guide?birthDate=1990-01-01", "/saju/guide"],
  ["/tarot/numerology?birthDate=1990-01-01", "/tarot/numerology"],
  ["/tarot/numerology?payment=1", "/tarot/numerology"],
  ["/tarot/prompt-maker?resultId=demo", "/tarot/prompt-maker"],
  ["/tarot/prompt-maker?payment=1", "/tarot/prompt-maker"],
  ["/famous-saju/king-sejong", "/insights/famous-saju/king-sejong"],
  ["/login", "/login"],
  ["/privacy", "/privacy"],
];

const canonicalUrlAllowSamples = [
  [
    "/about",
    "https://code-destiny.com/about/",
    "https://code-destiny.com/about/",
  ],
  [
    "/high-value/complete-guide-to-saju?utm_source=test",
    "https://code-destiny.com/high-value/complete-guide-to-saju/",
    "https://code-destiny.com/high-value/complete-guide-to-saju/?utm_source=test",
  ],
  [
    "/saju/guide?gclid=test-click-id",
    "https://code-destiny.com/saju/guide/",
    "https://code-destiny.com/saju/guide/?gclid=test-click-id",
  ],
  [
    "/tarot/numerology",
    "https://code-destiny.com/tarot/numerology/",
    "https://code-destiny.com/tarot/numerology/",
  ],
  [
    "/tarot/prompt-maker",
    "https://code-destiny.com/tarot/prompt-maker/",
    "https://code-destiny.com/tarot/prompt-maker/",
  ],
];

const canonicalUrlBlockedSamples = [
  [
    "/about",
    "https://code-destiny.com/about/",
    "http://localhost:3000/about/",
  ],
  [
    "/about",
    "https://preview.code-destiny.pages.dev/about/",
    "https://code-destiny.com/about/",
  ],
  [
    "/about",
    "https://code-destiny.com/about/",
    "https://code-destiny.com/about/?action=openPremiumModal",
  ],
  [
    "/saju/guide",
    "https://code-destiny.com/saju/guide/",
    "https://code-destiny.com/saju/guide/?premiumIntent=love-secret-pdf",
  ],
  [
    "/saju/guide",
    "https://code-destiny.com/saju/guide/",
    "https://code-destiny.com/saju/guide/?birthDate=1990-01-01",
  ],
  [
    "/insights/saju",
    "https://code-destiny.com/insights/saju/",
    "https://code-destiny.com/insights/saju/?resultId=demo",
  ],
  [
    "/tarot/numerology",
    "https://code-destiny.com/tarot/numerology/",
    "https://code-destiny.com/tarot/numerology/?birthDate=1990-01-01",
  ],
  [
    "/tarot/prompt-maker",
    "https://code-destiny.com/tarot/prompt-maker/",
    "https://code-destiny.com/tarot/prompt-maker/?payment=1",
  ],
  [
    "/famous-saju/king-sejong",
    "https://code-destiny.com/insights/famous-saju/king-sejong/",
    "https://code-destiny.com/famous-saju/king-sejong/",
  ],
];

for (const route of allowRoutes) {
  if (!canLoadAdsense(route)) {
    throw new Error(`[adsense-route-policy] expected allowed route: ${route}`);
  }
}

for (const route of blockedRoutes) {
  if (canLoadAdsense(route)) {
    throw new Error(`[adsense-route-policy] expected blocked route: ${route}`);
  }
}

for (const route of paidFeatureLaunchPathnames()) {
  if (adSupportedPaidLaunchRoutes.has(route)) continue;
  if (canLoadAdsense(route)) {
    throw new Error(`[adsense-route-policy] paid feature launch route must be blocked: ${route}`);
  }
}

for (const [route, canonicalPath] of canonicalAllowSamples) {
  if (!canLoadAdsenseForCanonicalPath(route, canonicalPath)) {
    throw new Error(`[adsense-route-policy] expected canonical allowed route: ${route} -> ${canonicalPath}`);
  }
}

for (const [route, canonicalPath] of canonicalBlockedSamples) {
  if (canLoadAdsenseForCanonicalPath(route, canonicalPath)) {
    throw new Error(`[adsense-route-policy] expected canonical blocked route: ${route} -> ${canonicalPath}`);
  }
}

for (const [route, canonicalHref, currentHref] of canonicalUrlAllowSamples) {
  if (!canLoadAdsenseForCanonicalUrl(route, canonicalHref, currentHref)) {
    throw new Error(`[adsense-route-policy] expected canonical URL allowed route: ${route}`);
  }
}

for (const [route, canonicalHref, currentHref] of canonicalUrlBlockedSamples) {
  if (canLoadAdsenseForCanonicalUrl(route, canonicalHref, currentHref)) {
    throw new Error(`[adsense-route-policy] expected canonical URL blocked route: ${route}`);
  }
}

const staticEntrypoints = [
  "index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];

for (const entrypoint of staticEntrypoints) {
  const content = readFileSync(resolve(entrypoint), "utf8");
  if (/googlesyndication|adsbygoogle|ca-pub-9863227498729828/.test(content)) {
    throw new Error(`[adsense-route-policy] static shell must not load AdSense directly: ${entrypoint}`);
  }
}

console.log("[adsense-route-policy] OK");
