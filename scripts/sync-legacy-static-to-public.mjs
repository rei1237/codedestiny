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
  "index.html",
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

console.log("[sync-legacy-static-to-public] Completed static asset sync.");
