/**
 * Copies root static assets → public/ (Cloudflare / static hosting).
 * 사주 엔진은 js/saju-engine.js + tarot-sukuyo-quantum + core/saju/reportDashboard + continuation 순서로 index.html에 로드됨.
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const publicDir = resolve(rootDir, "public");

const staticTargets = [
  "AnalysisEngine.js",
  "PhysiognomyUI.js",
  "HwatuFortune.js",
  "secret-house-final.html",
  "ads.txt",
  "manifest.json",
  "manifest-samba.json",
  "service-worker.js",
  "css",
  "js",
  "icons",
  "styles",
  "fortune",
  "fuctionassets",
  "lib",
  "sudda",
];

const rootIndexPath = resolve(rootDir, "index.html");
const publicIndexPath = resolve(publicDir, "index.html");

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

for (const target of staticTargets) {
  const sourcePath = resolve(rootDir, target);
  const destinationPath = resolve(publicDir, target);

  if (!existsSync(sourcePath)) {
    continue;
  }

  cpSync(sourcePath, destinationPath, { recursive: true, force: true });
}

// Keep public/index.html as the source of truth for production shell.
// Root index can be edited independently for local experiments, but should not overwrite deploy entry.
if (!existsSync(publicIndexPath) && existsSync(rootIndexPath)) {
  cpSync(rootIndexPath, publicIndexPath, { force: true });
  console.log("[sync-legacy-static-to-public] Seeded missing public/index.html from root/index.html");
}

// Fallback: some pipelines generate ads.txt under build/ only.
// Keep /public/ads.txt populated so final dist always exposes /ads.txt.
const rootAdsTxt = resolve(rootDir, "ads.txt");
const buildAdsTxt = resolve(rootDir, "build", "ads.txt");
const publicAdsTxt = resolve(publicDir, "ads.txt");
if (!existsSync(rootAdsTxt) && existsSync(buildAdsTxt)) {
  cpSync(buildAdsTxt, publicAdsTxt, { force: true });
  console.log("[sync-legacy-static-to-public] Fallback copied build/ads.txt -> public/ads.txt");
}

// Locale landing paths (same slugs as middleware.js LOCALE_SLUGS / app/layout.js).
// Ensures Cloudflare Pages / asset-first hosts return 200 for /en-us etc., not 404.
const localeLandingDirs = [
  "en-us",
  "ja-jp",
  "zh-cn",
  "hi-in",
  "es-es",
  "fr-fr",
  "de-de",
  "nl-nl",
  "ms-my",
];
const publicIndex = resolve(publicDir, "index.html");
if (existsSync(publicIndex)) {
  const staticDir = resolve(publicDir, "static");
  mkdirSync(staticDir, { recursive: true });
  cpSync(publicIndex, resolve(staticDir, "index.html"), { force: true });
  console.log("[sync-legacy-static-to-public] Copied index.html -> public/static/index.html (SPA shell; avoids [adminHash] collision).");

  for (const loc of localeLandingDirs) {
    const locDir = resolve(publicDir, loc);
    mkdirSync(locDir, { recursive: true });
    cpSync(publicIndex, resolve(locDir, "index.html"), { force: true });
  }
  console.log(
    `[sync-legacy-static-to-public] Locale landing pages: /${localeLandingDirs.join(", /")}/index.html`,
  );
}

console.log("[sync-legacy-static-to-public] Completed static asset sync.");
