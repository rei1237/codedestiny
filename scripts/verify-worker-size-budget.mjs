/**
 * Worker 업로드 크기 예산 가드.
 *
 * 🔴 이 가드는 오랫동안 아무것도 검사하지 않았다. `.open-next/server-functions/default/handler.mjs`
 * 를 찾다가 없으면 "Skipping size budget check." 를 찍고 **exit 0** 으로 통과했는데, 프로덕션
 * 워커는 OpenNext 가 아니라 `wrangler deploy --config worker/wrangler.toml` 로 빌드된다.
 * 즉 그 파일은 애초에 생기지 않으므로 항상 건너뛰었다. pr-ci.yml 은 build:worker 바로 뒤에서
 * 이걸 부르고 있었으니, 초록불이 예산을 지키는 것처럼 보였을 뿐이다.
 *
 * 그 사이 번들은 무료 플랜 한도의 96% 까지 찼다(2026-08-13 실측: gzip 2.888 MiB / 3 MiB).
 *
 * 두 가지를 바꿨다:
 *  ① 측정 대상을 **실제 업로드 산출물**(build:worker 의 --outdir)로 바꿨다.
 *  ② 산출물이 없으면 통과가 아니라 **실패**한다 — 침묵하는 가드가 이 사고의 본체였다.
 *
 * 예산은 wrangler 가 보고하는 것과 같은 대상을 잰다: 업로드되는 파일 전부(엔트리 + wasm 등),
 * 소스맵 제외. 예전 스크립트가 handler.mjs 만 재고 "나머지 오버헤드 150KB" 를 빼 두었던 보정은
 * 이제 필요 없다 — 전부 세기 때문이다.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative, extname, join } from "node:path";
import { gzipSync } from "node:zlib";

const rootDir = process.cwd();

// build:worker 가 여기에 번들을 쓴다. 바꿀 때는 package.json 의 --outdir 도 함께 바꿀 것.
//
// 🔴 wrangler 는 --outdir 를 **설정 파일이 있는 디렉터리**(worker/) 기준으로 푼다. 그래서
// package.json 의 값이 `../build-cache/worker-bundle` — 앞의 `../` 가 저장소 루트로 되돌리는
// 부분이다. 이걸 빼면 산출물이 `worker/build-cache/` 에 떨어지는데, **그러면 안 된다**:
// 13 MiB 짜리 번들이 worker/ 안에 생기면 worker/ 전체를 훑는 정적 가드들이 번들 안의 코드를
// 진짜 소스로 착각한다(`__tests__/worker/db.transaction-budget.test.js` 가 번들에 섞인
// withTransaction 호출을 "시간 상한 없는 위반"으로 신고하며 실제로 깨졌다).
const bundleDir = resolve(rootDir, process.env.CF_WORKER_BUNDLE_DIR || "build-cache/worker-bundle");

// Cloudflare Workers 스크립트 크기 상한(gzip 압축 후): **무료 3 MiB · 유료 10 MiB**.
//
// 🔴 2026-08-21 에 기본값을 유료 한도로 올렸다. 근거는 Workers Paid 전환이고, 그 전환이
// 실제로 반영된 간접 증거는 Smart Placement 가 진짜 상태값을 돌려준다는 것이다
// (placement_status=SUCCESS — 유료 전용 기능, worker/wrangler.toml 의 [placement] 주석 참고).
// 계정 구독을 API 로 직접 읽는 것은 wrangler OAuth 토큰에 billing 스코프가 없어 401 이라 못 한다.
//
// 플랜이 무료로 되돌아가면 여기서 통과한 번들이 wrangler 업로드 단계에서 거부된다.
// 이 가드는 **조기 경보이지 마지막 방어선이 아니므로** 그 실패는 조용하지 않다.
//
// 실측 2026-08-21: gzip 2.39 MiB = 무료 한도의 79.7%, 유료 한도의 23.9%.
// 무료 한도로 되돌리려면 CF_WORKER_MAIN_BUDGET_BYTES 로 덮는다.
const CF_FREE_LIMIT_BYTES = 3 * 1024 * 1024;
const CF_PAID_LIMIT_BYTES = 10 * 1024 * 1024;
const MAX_GZIP_BYTES = Number.parseInt(
  process.env.CF_WORKER_MAIN_BUDGET_BYTES || String(CF_PAID_LIMIT_BYTES),
  10,
);
// 한도에 닿기 전에 알린다. 96% 에서 처음 알게 되면 이미 손쓸 여지가 없다.
const WARN_RATIO = Number.parseFloat(process.env.CF_WORKER_WARN_RATIO || "0.9");
const HEAVY_FILE_MIN_BYTES = Number.parseInt(process.env.CF_WORKER_HEAVY_FILE_MIN_BYTES || "200000", 10);

function toMiB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

/** 업로드되지 않는 것은 빼고 센다 — 소스맵은 배포에 올라가지 않는다. */
function isUploadedArtifact(name) {
  if (name === "README.md") return false;
  return extname(name).toLowerCase() !== ".map";
}

function collectBundleFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectBundleFiles(abs, out);
      continue;
    }
    if (!isUploadedArtifact(entry.name)) continue;
    out.push({ path: abs, size: statSync(abs).size });
  }
  return out;
}

if (!existsSync(bundleDir)) {
  console.error(`[verify-worker-size-budget] FAIL: 번들 산출물이 없다 → ${relative(rootDir, bundleDir)}`);
  console.error("  먼저 `npm run build:worker` 를 실행할 것(--outdir 로 이 디렉터리에 쓴다).");
  console.error("  🔴 예전에는 여기서 조용히 통과했다. 그래서 이 가드는 오랫동안 아무것도 지키지 않았다.");
  process.exit(1);
}

const files = collectBundleFiles(bundleDir);

if (files.length === 0) {
  console.error(`[verify-worker-size-budget] FAIL: ${relative(rootDir, bundleDir)} 에 업로드 대상 파일이 없다.`);
  console.error("  `npm run build:worker` 가 실패했거나 --outdir 경로가 어긋났다.");
  process.exit(1);
}

let rawBytes = 0;
let gzipBytes = 0;
for (const file of files) {
  rawBytes += file.size;
  gzipBytes += gzipSync(readFileSync(file.path), { level: 9 }).length;
}

const usedRatio = gzipBytes / MAX_GZIP_BYTES;

console.log(
  `[verify-worker-size-budget] files=${files.length}`
  + ` raw=${toMiB(rawBytes)} MiB, gzip=${toMiB(gzipBytes)} MiB`
  + `, budget=${toMiB(MAX_GZIP_BYTES)} MiB (${(usedRatio * 100).toFixed(1)}% 사용)`,
);

function printHeavyFiles(log) {
  const heavy = files
    .filter((f) => f.size >= HEAVY_FILE_MIN_BYTES)
    .sort((a, b) => b.size - a.size)
    .slice(0, 12);
  if (heavy.length === 0) return;
  log("[verify-worker-size-budget] 큰 파일(raw):");
  for (const file of heavy) log(`- ${relative(rootDir, file.path)}: ${toMiB(file.size)} MiB`);
}

if (gzipBytes > MAX_GZIP_BYTES) {
  console.error("[verify-worker-size-budget] FAIL: 업로드 크기가 예산을 넘었다.");
  console.error(`  gzip ${toMiB(gzipBytes)} MiB > 예산 ${toMiB(MAX_GZIP_BYTES)} MiB`);
  printHeavyFiles(console.error);
  process.exit(2);
}

/* 🔴 예산을 유료 한도로 올린 뒤에는 "예산 안" 이 곧 "무료 플랜에서도 된다" 를 뜻하지 않는다.
   그 구분이 출력에 없으면, 플랜을 내리는 순간 배포가 막히는 것을 아무도 미리 모른다. */
if (gzipBytes > CF_FREE_LIMIT_BYTES) {
  console.warn(
    `[verify-worker-size-budget] 참고: 무료 플랜 한도(${toMiB(CF_FREE_LIMIT_BYTES)} MiB)는 이미 넘었다`
    + ` — Workers Paid 를 해지하면 이 번들은 업로드 자체가 거부된다.`,
  );
}

if (usedRatio >= WARN_RATIO) {
  console.warn(
    `[verify-worker-size-budget] WARN: 예산의 ${(usedRatio * 100).toFixed(1)}% 를 쓰고 있다`
    + ` (경고선 ${(WARN_RATIO * 100).toFixed(0)}%). 남은 여유 ${toMiB(MAX_GZIP_BYTES - gzipBytes)} MiB.`,
  );
  printHeavyFiles(console.warn);
}

console.log("[verify-worker-size-budget] OK: 업로드 크기가 예산 안이다.");
