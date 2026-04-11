/**
 * scripts/minify-handler.mjs
 *
 * OpenNext build 결과 handler.mjs에 minifyIdentifiers: true 추가 패스를 적용한다.
 * OpenNext 자체는 minifyIdentifiers 를 생략하는데, 이 스크립트가 해당 단계를 보완해
 * CF Workers 3 MiB 무료 한도에 더 가깝게 패킹한다.
 *
 * 사용: node scripts/minify-handler.mjs
 */

import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const handlerPath = resolve(rootDir, ".open-next", "server-functions", "default", "handler.mjs");

if (!existsSync(handlerPath)) {
  console.log("[minify-handler] handler.mjs not found — skipping (no .open-next build output).");
  process.exit(0);
}

const beforeBytes = statSync(handlerPath).size;
console.log(`[minify-handler] Before: ${(beforeBytes / 1024 / 1024).toFixed(2)} MiB`);

// esbuild --bundle=false: 이미 번들된 파일을 minify만 진행 (재번들 없음).
// minifyIdentifiers: true 를 추가하여 OpenNext가 건너뛴 식별자 축약을 적용한다.
const isWindows = process.platform === "win32";
const cmd = isWindows ? "cmd.exe" : "node";
const args = isWindows
  ? [
      "/d", "/s", "/c",
      `npx esbuild "${handlerPath}" --bundle=false --minify --format=esm --platform=neutral --allow-overwrite --outfile="${handlerPath}"`,
    ]
  : [
      "node_modules/.bin/esbuild",
      handlerPath,
      "--bundle=false",
      "--minify",
      "--format=esm",
      "--platform=neutral",
      `--allow-overwrite`,
      `--outfile=${handlerPath}`,
    ];

const result = spawnSync(cmd, args, { stdio: "inherit", shell: false });

if (result.error) {
  console.warn(`[minify-handler] esbuild spawn error: ${result.error.message}`);
  process.exit(0); // non-fatal — wrangler still does its own minification pass
}

if (result.status !== 0) {
  console.warn(`[minify-handler] esbuild exited with status ${result.status} — skipping.`);
  process.exit(0);
}

if (existsSync(handlerPath)) {
  const afterBytes = statSync(handlerPath).size;
  const saved = ((1 - afterBytes / beforeBytes) * 100).toFixed(1);
  console.log(
    `[minify-handler] After : ${(afterBytes / 1024 / 1024).toFixed(2)} MiB  (saved ${saved}%)`
  );
}
