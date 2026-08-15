import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const npmCli = process.env.npm_execpath || resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const canRunNpmCliWithNode = npmCli && existsSync(npmCli);
const npmCommand = canRunNpmCliWithNode ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const npmArgs = (args) => (canRunNpmCliWithNode ? [npmCli, ...args] : args);

// optional: true 인 스텝은 실패해도 빌드를 멈추지 않고 경고만 남긴다.
//
// 🔴 i18n:check 가 optional 인 이유 — 이건 번역 "커버리지/ratchet" 지표라 콘텐츠가 쌓이는 만큼
// 자연히 뒤처진다. 그런데 이 스텝이 배포 경로(deploy:cf:pages → build:cf → 여기) 안에 있어서,
// 한국어 문구 몇 개가 늘어난 것만으로 프로덕션 배포 전체가 멈췄다(2026-07-28, 커밋 88685d224 이후
// Pages 배포 연속 실패). i18n 검사는 원래 배포 워크플로에 넣지 않기로 한 것이라, 여기 있는 것
// 자체가 그 의도와 어긋나 있었다.
// 회귀 가시성은 유지된다: 실패 내용은 그대로 빌드 로그에 찍힌다. 전용 i18n 워크플로는 2026-08-08
// CI 게이트 정리에서 없앴고, 필요하면 `npm run verify:locale-main-sync` 등을 수동으로 돌린다.
// 되돌리려면 optional 플래그만 지우면 된다.
const steps = [
  // 🔴 clean:build 보다 먼저 와야 한다 — dev 서버가 떠 있으면 clean 이 그 발밑의 .next 를
  // 지우고, 이후 두 프로세스가 같은 경로를 번갈아 쓰면서 빌드가 조용히 멈춘다.
  { command: process.execPath, args: ["scripts/verify-no-dev-server.mjs"] },
  { command: npmCommand, args: npmArgs(["run", "clean:build"]) },
  { command: npmCommand, args: npmArgs(["run", "sync:public"]) },
  { command: npmCommand, args: npmArgs(["run", "sitemap:generate"]) },
  // 🔴 sitemap 과 함께 돌아야 한다. 여기 없던 동안 rss.xml 의 lastBuildDate 가 2026-05-06 에
  // 멈춰 있었고(sitemap 은 2026-08-15) 네이버 서치어드바이저에 제출할 피드가 3개월 낡아 있었다.
  // `seo:generate`(sitemap && rss)로 합치지 않는 이유: 스텝 하나가 npm 을 두 번 spawn 하면
  // 종료코드로 어느 쪽이 죽었는지 구분할 수 없다.
  { command: npmCommand, args: npmArgs(["run", "rss:generate"]) },
  { command: npmCommand, args: npmArgs(["run", "verify:public-parity"]) },
  { command: npmCommand, args: npmArgs(["run", "i18n:check"]), optional: true },
  { command: npmCommand, args: npmArgs(["run", "verify:locale-main-sync"]) },
  { command: npmCommand, args: npmArgs(["run", "verify:runtime-cache-sync"]) },
  { command: npmCommand, args: npmArgs(["run", "verify:adsense-route-policy"]) },
  { command: process.execPath, args: ["scripts/print-build-context.mjs"] },
  { command: process.execPath, args: ["scripts/next-build-with-pages-manifest.mjs"] },
];

for (const { command, args, optional } of steps) {
  const label = `${command} ${args.join(" ")}`;
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    windowsHide: true,
    env: process.env,
  });

  if (result.error) {
    if (optional) {
      console.warn(`[build-cf-main] (optional) skipped after launch failure: ${label} — ${result.error.message}`);
      continue;
    }
    console.error(`[build-cf-main] Failed to run ${label}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    if (optional) {
      console.warn(`[build-cf-main] (optional) step failed but does not block the build: ${label} (exit ${result.status})`);
      continue;
    }
    process.exit(typeof result.status === "number" ? result.status : 1);
  }
}
