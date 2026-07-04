// 유명인 사주 히어로 이미지 빌드타임 수집기.
//
// - 각 slug의 일간(오행)을 계산해 물상 기반 Pexels 검색 쿼리를 만들고, 쿼리당 1회만
//   Pexels API를 호출한다. 결과(src.large2x/large URL + photographer 크레딧)를
//   lib/famous-saju/image-cache.json에 정적 인라인한다.
// - 재현성: 같은 일간 → 같은 쿼리 → byQuery 캐시 재사용(추가 호출 없음). 새 인물 추가 시에만 호출.
// - 실패 slug는 bySlug에 남기지 않아 페이지가 og:image webp로 폴백한다.
// - PEXELS_API_KEY는 빌드 환경변수(.env / CI secret)로만 사용. Pages 런타임 시크릿에 넣지 않는다.
//
// 사용법:
//   node scripts/fetch-saju-images.mjs            # 캐시에 없는 slug만 수집
//   node scripts/fetch-saju-images.mjs --force    # 전체 재수집(쿼리 캐시 무시)
//   node scripts/fetch-saju-images.mjs --dry-run  # 호출 없이 계획만 출력

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import Module from "node:module";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

// .env 로드(있으면). 키가 없으면 폴백 유지하고 정상 종료.
for (const envFile of [".env.cloudflare.local", ".env.cloudflare", ".env.local", ".env"]) {
  const envPath = path.resolve(root, envFile);
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    const key = match[1];
    if (process.env[key] === undefined) {
      process.env[key] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

// TS/TSX require 브리지(verify 스크립트와 동일 패턴)
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(root, request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

function compileTs(module, filename) {
  const output = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      resolveJsonModule: true,
      skipLibCheck: true,
      baseUrl: root,
      paths: { "@/*": ["./*"] },
    },
  }).outputText;
  module._compile(output, filename);
}
require.extensions[".ts"] = compileTs;
require.extensions[".tsx"] = compileTs;

const service = require(path.join(root, "lib/famous-saju/celebrity-saju-service.ts"));
const imageHelper = require(path.join(root, "lib/famous-saju/famous-saju-image.ts"));

const FLAGS = new Set(process.argv.slice(2).map((v) => String(v || "").trim().toLowerCase()));
const FORCE = FLAGS.has("--force");
const DRY_RUN = FLAGS.has("--dry-run");

const CACHE_PATH = path.join(root, "lib/famous-saju/image-cache.json");
const cache = JSON.parse(readFileSync(CACHE_PATH, "utf8"));
cache.byQuery = cache.byQuery || {};
cache.bySlug = cache.bySlug || {};

function getPexelsApiKey() {
  return String(process.env.PEXELS_API_KEY || process.env.PEXELS_APIKEY || "").trim();
}

async function searchPexels(query, apiKey) {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "8");
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("size", "large");
  url.searchParams.set("locale", "en-US");
  const response = await fetch(url, { headers: { Authorization: apiKey } });
  if (!response.ok) throw new Error(`Pexels ${response.status}`);
  const data = await response.json().catch(() => null);
  const photos = Array.isArray(data?.photos) ? data.photos : [];
  const photo = photos.find((p) => p?.src?.large2x || p?.src?.large || p?.src?.landscape);
  if (!photo) throw new Error("no photo");
  return {
    src: photo.src.large2x || photo.src.large || photo.src.landscape,
    alt: photo.alt || "",
    photographer: photo.photographer || "",
    photographerUrl: photo.photographer_url || photo.url || "",
    pexelsUrl: photo.url || "",
  };
}

async function main() {
  const seeds = service.publishedCelebritySajuSeeds;
  const apiKey = getPexelsApiKey();

  let calls = 0;
  let reused = 0;
  let fallbacks = 0;
  let resolved = 0;

  for (const seed of seeds) {
    let dayElement = "";
    try {
      dayElement = service.buildCelebrityReading(seed).magazine.dayElement || "";
    } catch {
      dayElement = "";
    }
    const query = imageHelper.resolveDayElementQuery(dayElement);

    // 이미 이 slug가 채워져 있고 --force가 아니면 건드리지 않는다(새 인물만 호출).
    if (!FORCE && cache.bySlug[seed.slug]?.src) {
      resolved += 1;
      continue;
    }

    // 같은 일간 쿼리 결과가 있으면 재사용(재현성 + 쿼터 절약).
    if (!FORCE && cache.byQuery[query]?.src) {
      cache.bySlug[seed.slug] = { query, dayElement, ...cache.byQuery[query] };
      reused += 1;
      resolved += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[dry-run] ${seed.slug} (일간 ${dayElement || "미상"}) → "${query}"`);
      continue;
    }
    if (!apiKey) {
      fallbacks += 1;
      continue;
    }

    try {
      const image = await searchPexels(query, apiKey);
      calls += 1;
      cache.byQuery[query] = image;
      cache.bySlug[seed.slug] = { query, dayElement, ...image };
      resolved += 1;
      console.log(`[ok] ${seed.slug} (일간 ${dayElement || "미상"}) ← ${image.photographer || "unknown"}`);
    } catch (error) {
      fallbacks += 1;
      console.warn(`[fallback] ${seed.slug}: ${error?.message || error} → og:image webp`);
    }
  }

  if (!DRY_RUN) {
    writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  }

  console.log("[fetch-saju-images]", {
    seeds: seeds.length,
    apiKey: apiKey ? "present" : "MISSING(→fallback)",
    calls,
    reused,
    resolved,
    fallbacks,
    dryRun: DRY_RUN,
    force: FORCE,
  });
}

main().catch((error) => {
  console.error("[fetch-saju-images] failed:", error);
  process.exit(1);
});
