import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const requiredExportFiles = [
  "out/about/index.html",
  "out/tarot/mindscan/index.html",
  "out/tarot/crystal-soul/index.html",
];
const requiredPublicExportFiles = [
  "ads.txt",
];

const steps = [
  "scripts/prepare-cloudflare-dist.mjs",
  "scripts/write-version-json.mjs",
  "scripts/promote-static-shell-to-root.mjs",
  // 셸 승격이 끝난 뒤, 검증 게이트 앞에서 로케일 산출물을 손본다.
  // 순서를 바꾸면 promote 단계가 다시 한국어 셸로 덮어쓴다.
  "scripts/fix-locale-html-lang.mjs",
  "scripts/prerender-locale-shell-translations.mjs",
  "scripts/verify-adsense-readiness.mjs",
  // 아래 둘은 **검증이 끝난 뒤 배포 바이트만** 고치는 최적화 단계다. 소스(index.html·js/)와
  // 미러(public/)는 건드리지 않으므로, 셸을 문자열로 읽는 가드 61개는 계속 원본을 읽는다.
  // 🔴 반드시 verify-adsense-readiness **뒤**에 둘 것 — 그 검증기가 dist 셸의 본문 텍스트와
  //    dist/js 의 한국어 문구를 읽는 유일한 소비자라, 앞에 두면 가공된 산출물을 검사하게 된다.
  // 🔴 externalize → minify 순서를 지킬 것. 그래야 셸에서 빠져나온 스크립트도 minify 를 탄다.
  "scripts/externalize-dist-inline-scripts.mjs",
  "scripts/minify-dist-js.mjs",
];

function wait(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForRequiredExportFiles() {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const missing = requiredExportFiles.filter((filePath) => !existsSync(resolve(process.cwd(), filePath)));
    if (missing.length === 0) return;
    wait(250);
  }
}

function syncRequiredPublicExportFiles() {
  const rootDir = process.cwd();
  const outDir = resolve(rootDir, "out");
  const publicDir = resolve(rootDir, "public");
  if (!existsSync(outDir)) return;

  for (const filePath of requiredPublicExportFiles) {
    const sourcePath = resolve(publicDir, filePath);
    const targetPath = resolve(outDir, filePath);
    if (existsSync(targetPath) || !existsSync(sourcePath)) continue;
    copyFileSync(sourcePath, targetPath);
  }
}

for (const scriptPath of steps) {
  if (scriptPath === "scripts/verify-adsense-readiness.mjs") {
    waitForRequiredExportFiles();
    syncRequiredPublicExportFiles();
  }

  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
