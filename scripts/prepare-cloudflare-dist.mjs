import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const distDir = resolve(rootDir, "dist");
const publicDir = resolve(rootDir, "public");
const candidates = [resolve(rootDir, ".open-next", "assets"), resolve(rootDir, "out")];

const sourceDir = candidates.find((dirPath) => existsSync(dirPath));

if (!sourceDir) {
  console.error("[prepare-cloudflare-dist] Missing source output (.open-next/assets or out).");
  process.exit(1);
}

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}

mkdirSync(distDir, { recursive: true });
cpSync(sourceDir, distDir, { recursive: true, force: true });

// Safety net: merge committed public assets so Pages deploy never misses legacy static files.
if (existsSync(publicDir)) {
  cpSync(publicDir, distDir, { recursive: true, force: true });
  console.log(`[prepare-cloudflare-dist] Merged ${publicDir} -> ${distDir}`);
}

// If Cloudflare Pages is configured to publish directly from `.open-next/assets` (common with
// OpenNext deployments), ensure legacy static files are also merged there.
// This prevents `/styles/*.css` (and other public assets) from being served as HTML fallback.
const openNextAssetsDir = resolve(rootDir, ".open-next", "assets");
if (existsSync(openNextAssetsDir) && existsSync(publicDir)) {
  cpSync(publicDir, openNextAssetsDir, { recursive: true, force: true });
  console.log(`[prepare-cloudflare-dist] Merged ${publicDir} -> ${openNextAssetsDir}`);
}

if (!existsSync(resolve(distDir, "index.html"))) {
  console.error("[prepare-cloudflare-dist] dist/index.html is missing after copy.");
  process.exit(1);
}

console.log(`[prepare-cloudflare-dist] Copied ${sourceDir} -> ${distDir}`);

// 로컬 js/inline 파일들을 dist + .open-next/assets에 복사 (Pages는 dist, Workers wrangler는 .open-next/assets)
const inlineSourceDir = resolve(rootDir, "js", "inline");
if (existsSync(inlineSourceDir)) {
  const inlineDistDir = resolve(distDir, "js", "inline");
  mkdirSync(inlineDistDir, { recursive: true });
  cpSync(inlineSourceDir, inlineDistDir, { recursive: true, force: true });
  console.log(`[prepare-cloudflare-dist] Copied ${inlineSourceDir} -> ${inlineDistDir}`);

  const assetsRoot = resolve(rootDir, ".open-next", "assets");
  if (existsSync(assetsRoot)) {
    if (existsSync(publicDir)) {
      cpSync(publicDir, assetsRoot, { recursive: true, force: true });
      console.log(`[prepare-cloudflare-dist] Merged ${publicDir} -> ${assetsRoot}`);
    }

    const inlineAssetsDir = resolve(assetsRoot, "js", "inline");
    mkdirSync(inlineAssetsDir, { recursive: true });
    cpSync(inlineSourceDir, inlineAssetsDir, { recursive: true, force: true });
    console.log(`[prepare-cloudflare-dist] Copied ${inlineSourceDir} -> ${inlineAssetsDir}`);
  }
}