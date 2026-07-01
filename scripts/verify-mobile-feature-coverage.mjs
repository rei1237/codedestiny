import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const sourcePaths = {
  serviceSections: "app/_lib/serviceSections.js",
  homeSections: "app/components/HomeServiceSections.tsx",
  featureLanding: "app/components/FeatureLandingPage.tsx",
  index: "index.html",
  mobilePatch: "js/mobile-interaction-patch.js",
  mobileLite: "styles/mobile-lite.css",
  musicHook: "app/music/_hooks/useMusicPlayer.ts",
};

const sources = Object.fromEntries(
  Object.entries(sourcePaths).map(([key, rel]) => [key, readFile(rel)])
);

const serviceRoutes = unique([...sources.serviceSections.matchAll(/href:\s*"([^"]+)"/g)].map((match) => match[1]));
const homeActionRoutes = parseQuotedRouteMap(sources.homeSections);
const landingActionRoutes = parseQuotedRouteMap(sources.featureLanding);
const actionRoutes = new Map([...homeActionRoutes, ...landingActionRoutes]);
const actionCorpus = [sources.index, sources.mobilePatch, sources.featureLanding, sources.homeSections].join("\n");
const routeCorpus = [sources.index, sources.homeSections, sources.featureLanding, sources.serviceSections].join("\n");

const requiredRouteGroups = [
  { id: "saju", routes: ["/saju/basic", "/saju/sibyl", "/life-book-ai", "/love-secret-ai", "/saju/love-simulation"] },
  { id: "premium-saju", routes: ["/saju/destiny-bias", "/saju/animal-destiny", "/saju/destiny-meeting-place"] },
  { id: "core-charts", routes: ["/ziwei/chart", "/astrology/cosmic", "/vedic/jyotish", "/oracle/sukuyo"] },
  { id: "tarot", routes: ["/tarot/mingri", "/tarot/love", "/tarot/healing", "/tarot/self-esteem", "/tarot/reunion", "/tarot/year"] },
  { id: "tarot-paid-static", routes: ["/tarot/crystal-soul/", "/tarot/mindscan/", "/tarot-ijik.html", "/celestial-harmony.html"] },
  { id: "oracle", routes: ["/oracle/hwatu", "/oracle/kemet", "/oracle/juyuk", "/oracle/rune", "/ifa-oracle.html", "/royal-tea-oracle.html"] },
  { id: "mobile-modal-actions", routes: ["/animal/physio", "/animal/mbti", "/animal/totem", "/flower/destiny", "/flower/astrology", "/flower/jamidusu", "/flower/sukuyo"] },
];

const requiredActions = [
  "openGoldenGrainCharge",
  "openTarotModal",
  "openTarotLoveModal",
  "openTarotHealingModal",
  "openTarotSelfEsteemModal",
  "openTarotReunionModal",
  "openTarotYearFortuneModal",
  "openDreamModal",
  "openPsychoDreamModal",
  "openKemetModal",
  "openRoyalTeaOracle",
  "openGeomancyOracle",
  "openAnimalTotemModal",
  "openSajuAnimalPage",
  "openSibylModal",
  "navigateToVedic",
];

const requiredMarkers = [
  { id: "mobile bottom nav", source: "index", value: "cd-mobile-bottom-navigation-v20260701" },
  { id: "mobile payment lock UX", source: "index", value: "cd-mobile-payment-lock-ux-v20260701" },
  { id: "mobile feature cards", source: "index", value: "MobileFeatureCard" },
  { id: "mobile detail bottom sheet", source: "index", value: "MobileFeatureBottomSheet" },
  { id: "lazy feature scripts", source: "index", value: "data-cd-lazy-src" },
  { id: "noncritical scripts", source: "index", value: "data-cd-noncritical-src" },
  { id: "low-end skip guard", source: "index", value: "data-cd-lowend-skip" },
  { id: "touch manipulation", source: "mobilePatch", value: "touch-action: manipulation" },
  { id: "44px touch target", source: "mobilePatch", value: "min-height: 44px" },
  { id: "safe viewport var", source: "mobilePatch", value: "--cd-safe-vh" },
  { id: "dynamic viewport height", source: "mobilePatch", value: "100dvh" },
  { id: "hidden overlay pointer guard", source: "mobilePatch", value: "pointer-events: none !important" },
  { id: "reduced motion guard", source: "mobilePatch", value: "prefers-reduced-motion" },
  { id: "music audio idle preload", source: "musicHook", value: 'audio.preload = "none"' },
  { id: "mobile modal viewport CSS", source: "mobileLite", value: "[data-component=\"MobileFeatureBottomSheet\"]" },
];

const failures = [];

for (const route of serviceRoutes) {
  if (!hasMobileEntry(route)) {
    failures.push(`service route has no mobile entry evidence: ${route}`);
  }
}

for (const group of requiredRouteGroups) {
  for (const route of group.routes) {
    if (!serviceRoutes.includes(route) && !routeCorpus.includes(route)) {
      failures.push(`required route missing from source corpus (${group.id}): ${route}`);
      continue;
    }
    if (!routeCanOpen(route)) {
      failures.push(`required route has no page/html/action entry (${group.id}): ${route}`);
    }
  }
}

for (const action of requiredActions) {
  if (!actionCorpus.includes(action)) {
    failures.push(`required mobile action missing: ${action}`);
  }
}

for (const marker of requiredMarkers) {
  if (!sources[marker.source].includes(marker.value)) {
    failures.push(`required mobile marker missing (${marker.id}): ${marker.value}`);
  }
}

if (failures.length) {
  console.error("Mobile feature coverage verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("Mobile feature coverage OK");
  console.log(`- Service routes discovered: ${serviceRoutes.length}`);
  console.log(`- Route groups checked: ${requiredRouteGroups.length}`);
  console.log(`- Critical actions checked: ${requiredActions.length}`);
  console.log(`- Mobile performance markers checked: ${requiredMarkers.length}`);
}

function hasMobileEntry(route) {
  return routeCorpus.includes(route) || actionRoutes.has(stripTrailingSlash(route));
}

function routeCanOpen(route) {
  const normalized = stripTrailingSlash(route);
  if (actionRoutes.has(normalized) || actionRoutes.has(route)) {
    return true;
  }
  if (route.endsWith(".html")) {
    return ["", "public", "dist"].some((prefix) => existsPath(prefix ? path.join(prefix, route.slice(1)) : route.slice(1)));
  }
  return pageExists(route) || publicIndexExists(route);
}

function pageExists(route) {
  const clean = stripTrailingSlash(route).replace(/^\/+/, "");
  return ["page.tsx", "page.ts", "page.jsx", "page.js"].some((file) => existsPath(path.join("app", clean, file)));
}

function publicIndexExists(route) {
  const clean = stripTrailingSlash(route).replace(/^\/+/, "");
  return ["public", "dist"].some((prefix) => existsPath(path.join(prefix, clean, "index.html")));
}

function parseQuotedRouteMap(text) {
  const map = new Map();
  for (const match of text.matchAll(/"((?:\/[A-Za-z0-9._~:-]+)+\/?)"\s*:\s*"([^"]+)"/g)) {
    map.set(stripTrailingSlash(match[1]), match[2]);
  }
  return map;
}

function stripTrailingSlash(value) {
  return value.length > 1 ? value.replace(/\/+$/, "") : value;
}

function existsPath(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function readFile(relPath) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Missing file: ${relPath}`);
  }
  return fs.readFileSync(abs, "utf8");
}

function unique(values) {
  return [...new Set(values)];
}
