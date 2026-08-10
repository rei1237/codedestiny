#!/usr/bin/env node
//
// 프로덕션 빌드 전에 Next dev 서버가 떠 있는지 확인한다.
//
// 존재 이유: dev 와 prod 빌드는 `.next/` 하나를 공유한다. dev 서버가 켜진 채로 build 를
// 돌리면 clean:build 가 dev 서버 발밑의 디렉터리를 지우고, 이후 두 프로세스가 같은 경로에
// 번갈아 쓰면서 빌드가 **에러 없이 그대로 멈춘다**. 2026-08-10 에 이걸로 35분을 날렸다 —
// 출력도 없고 CPU 도 0 이라 "느린 빌드"와 구분이 안 됐고, .next/static/development 와
// .next/cache/webpack/client-development 가 갱신되는 걸 보고서야 dev 서버를 찾았다.
//
// 조용한 무응답을 즉시 실패로 바꾸는 것이 이 스크립트의 전부다.
// 우회가 필요하면 ALLOW_DEV_SERVER_DURING_BUILD=1.

import { spawnSync } from "node:child_process";

if (process.env.ALLOW_DEV_SERVER_DURING_BUILD === "1") {
  console.log("[no-dev-server] skipped (ALLOW_DEV_SERVER_DURING_BUILD=1)");
  process.exit(0);
}

// `next dev` 만 잡는다. `next build`(우리 자신)와 `next start` 는 걸리지 않아야 한다.
const DEV_SERVER_PATTERN = /next(?:[\\/]dist[\\/]bin[\\/]next|\.js)?["']?\s+dev\b|\brun\s+dev(?::\w+)?\b/i;

function listCommandLines() {
  if (process.platform === "win32") {
    const result = spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | ForEach-Object { $_.CommandLine }",
      ],
      { encoding: "utf8", windowsHide: true },
    );
    if (result.status !== 0 || !result.stdout) return null;
    return result.stdout.split(/\r?\n/);
  }

  const result = spawnSync("ps", ["-eo", "args="], { encoding: "utf8" });
  if (result.status !== 0 || !result.stdout) return null;
  return result.stdout.split(/\n/);
}

const lines = listCommandLines();
if (!lines) {
  // 프로세스 목록을 못 읽는 환경(제한된 CI 컨테이너 등)에서 빌드를 막지는 않는다.
  console.log("[no-dev-server] skipped (process list unavailable)");
  process.exit(0);
}

const offenders = lines
  .map((line) => line.trim())
  .filter((line) => line && DEV_SERVER_PATTERN.test(line));

if (!offenders.length) {
  console.log("[no-dev-server] OK: no Next dev server is holding .next");
  process.exit(0);
}

console.error("[no-dev-server] BLOCKED: a Next dev server is running and owns .next/.");
console.error("  dev 와 prod 빌드는 .next 하나를 공유하므로 동시에 돌릴 수 없습니다.");
console.error("  그대로 두면 빌드가 에러 없이 멈춥니다(2026-08-10 에 35분 소요).");
for (const line of offenders.slice(0, 5)) console.error(`  ! ${line.slice(0, 160)}`);
console.error("  dev 서버를 끄고 다시 실행하세요. 의도한 것이면 ALLOW_DEV_SERVER_DURING_BUILD=1.");
process.exit(1);
