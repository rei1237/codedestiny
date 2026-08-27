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
  // 🔴 externalize 뒤 · minify 앞. 앞에 두면 8KB 이상 블록이 아직 인라인이라 대상이 달라지고,
  //    뒤에 두면 우리가 감싼 코드가 minify 를 못 탄다.
  "scripts/split-dist-boot-tasks.mjs",
  "scripts/minify-dist-js.mjs",
  // 🔴 externalize 뒤에 둔다. 그래야 셸에서 빠져나간 인라인 <script> 안의 `<style>` 문자열이
  //    HTML 에 남아 있지 않고, CSS minify 가 볼 <style> 은 전부 진짜 마크업이다.
  "scripts/minify-dist-css.mjs",
  // 🔴 minify 뒤 · 마지막. 저작 주석은 브라우저가 쓸 일이 없고, 셸 HTML 은 no-cache 라
  //    매 방문 다시 내려간다. 정적 셸만 대상이고 하이드레이션 HTML 은 건너뛴다.
  "scripts/strip-dist-html-comments.mjs",
];

// 🔴 스테이징 배포본만 색인·광고에서 뺀다. **마지막 단계**여야 한다 — 앞에 두면 minify·externalize
//    가 산출물을 다시 쓰면서 주입한 메타가 어떤 경로로든 사라질 여지가 남는다.
//    마커는 scripts/deploy-safe.mjs 가 --stage 에서 직접 넣으므로 워크플로 env 가 새거나 빠져도
//    타깃과 어긋나지 않는다. 프로덕션 빌드에서는 이 줄이 아예 추가되지 않는다.
if (String(process.env.CD_DEPLOY_TARGET || "").trim().toLowerCase() === "staging") {
  steps.push("scripts/apply-staging-noindex.mjs");
}

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
