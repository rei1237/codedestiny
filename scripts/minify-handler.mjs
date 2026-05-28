/**
 * scripts/minify-handler.mjs
 *
 * OpenNext build 결과 handler.mjs에 minifyIdentifiers: true 추가 패스를 적용한다.
 * OpenNext 자체는 minifyIdentifiers 를 생략하는데, 이 스크립트가 해당 단계를 보완해
 * CF Workers 3 MiB 무료 한도에 더 가깝게 패킹한다.
 *
 * 사용: node scripts/minify-handler.mjs
 */

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const handlerPath = resolve(rootDir, ".open-next", "server-functions", "default", "handler.mjs");

if (!existsSync(handlerPath)) {
  console.log("[minify-handler] handler.mjs not found — skipping (no .open-next build output).");
  process.exit(0);
}

const beforeBytes = statSync(handlerPath).size;
console.log(`[minify-handler] Before: ${(beforeBytes / 1024 / 1024).toFixed(2)} MiB`);

// esbuild API를 직접 사용 (shell 명령 대신 — Windows 경로 공백 문제 회피).
// bundle=false: 이미 번들된 파일을 minify만 진행 (재번들 없음).
// minifyIdentifiers: true 를 추가하여 OpenNext가 건너뛴 식별자 축약을 적용한다.
let build;
try {
  ({ build } = await import("esbuild"));
} catch (e) {
  console.warn("[minify-handler] esbuild not available — skipping identifier minification.");
  process.exit(0);
}

try {
  const result = await build({
    entryPoints: [handlerPath],
    bundle: false,
    minify: true,
    format: "esm",
    platform: "neutral",
    allowOverwrite: true,
    outfile: handlerPath,
    legalComments: "none",
  });

  if (result.errors && result.errors.length > 0) {
    console.warn("[minify-handler] esbuild reported errors — skipping.");
    process.exit(0);
  }
} catch (err) {
  console.warn(`[minify-handler] esbuild failed: ${err.message} — skipping.`);
  process.exit(0);
}

if (existsSync(handlerPath)) {
  const afterBytes = statSync(handlerPath).size;
  const saved = ((1 - afterBytes / beforeBytes) * 100).toFixed(1);
  console.log(
    `[minify-handler] After : ${(afterBytes / 1024 / 1024).toFixed(2)} MiB  (saved ${saved}%)`
  );
}
