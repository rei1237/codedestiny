#!/usr/bin/env node
/**
 * 워커 배포 스테일 베이스 가드의 실행 가드.
 *
 * 소스 단언이 아니라 **임시 git 저장소를 만들어 실제로 돌린다.** 이 가드가 조용히 무력화되면
 * (경로 필터 오타, origin/main 참조 변경 등) 증상이 "배포가 그냥 잘 됨"이라 아무도 모른다.
 * 그 다음 사고는 남의 워커 커밋이 프로덕션에서 사라지는 형태로 온다.
 *
 * 실행: node scripts/verify-deploy-base-guard.mjs
 */

import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { assertWorkerBaseIsFresh, buildDeployMessage, findMissingWorkerCommits } from "./lib/worker-deploy-base-guard.mjs";

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

function run(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return String(result.stdout || "").trim();
}

function write(repo, relPath, text) {
  const full = join(repo, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, text);
}

/** 스테일 상황을 재현한 임시 저장소를 만든다. HEAD 는 base, origin/main 은 그보다 앞선 상태. */
function buildFixture() {
  const repo = mkdtempSync(join(tmpdir(), "cd-deploy-guard-"));
  run(["init", "-q", "-b", "main"], repo);
  run(["config", "user.email", "t@t"], repo);
  run(["config", "user.name", "t"], repo);

  write(repo, "worker/index.js", "// base\n");
  write(repo, "scripts/thing.mjs", "// base\n");
  run(["add", "-A"], repo);
  run(["commit", "-qm", "base"], repo);
  const base = run(["rev-parse", "HEAD"], repo);

  // main 이 워커 코드를 바꿔 앞서간다.
  write(repo, "worker/routes/new.js", "// merged by someone else\n");
  run(["add", "-A"], repo);
  run(["commit", "-qm", "feat(worker): 남의 워커 커밋"], repo);
  const aheadWorker = run(["rev-parse", "HEAD"], repo);

  // scripts 만 바꾸는 커밋도 하나 얹는다 — 이건 워커 배포에 무해하므로 잡히면 안 된다.
  write(repo, "scripts/thing.mjs", "// changed\n");
  run(["add", "-A"], repo);
  run(["commit", "-qm", "chore(scripts): 워커와 무관"], repo);
  const aheadScripts = run(["rev-parse", "HEAD"], repo);

  return { repo, base, aheadWorker, aheadScripts };
}

function guardResult(repo, argv = []) {
  const logs = [];
  const logger = { warn: (...a) => logs.push(a.join(" ")), error: (...a) => logs.push(a.join(" ")), log: (...a) => logs.push(a.join(" ")) };
  let exitCode = null;
  // fetchFirst=false — 이 픽스처엔 원격이 없다. 실제 배포 경로의 fetch 는 실패해도 진행하도록 설계돼 있다.
  const outcome = assertWorkerBaseIsFresh(repo, {
    argv,
    logger,
    exit: (code) => { exitCode = code; },
    fetchFirst: false,
  });
  return { outcome, exitCode, logs: logs.join("\n") };
}

const { repo, base, aheadWorker, aheadScripts } = buildFixture();

try {
  // ── 1. 낡은 베이스 → 차단 ────────────────────────────────────────────────
  run(["update-ref", "refs/remotes/origin/main", aheadScripts], repo);
  run(["checkout", "-q", "--detach", base], repo);

  const stale = guardResult(repo);
  assert(stale.exitCode === 1, `낡은 베이스인데 차단하지 않았다 (exit=${stale.exitCode})`);
  assert(/배포 중단/.test(stale.logs), "차단 사유를 설명하지 않았다");
  assert(/남의 워커 커밋/.test(stale.logs), "사라질 커밋을 나열하지 않았다 — 이게 없으면 원인을 못 찾는다");
  assert(!/워커와 무관/.test(stale.logs), "🔴 scripts 만 바꾼 커밋을 워커 회귀로 오탐했다");

  const missing = findMissingWorkerCommits(repo);
  assert(missing.commits?.length === 1, `놓친 워커 커밋 수가 1이어야 하는데 ${missing.commits?.length}`);

  // ── 2. 최신 베이스 → 통과 ────────────────────────────────────────────────
  run(["checkout", "-q", "--detach", aheadScripts], repo);
  const fresh = guardResult(repo);
  assert(fresh.outcome === "ok", `최신 베이스인데 통과하지 않았다 (${fresh.outcome})`);
  assert(fresh.exitCode === null, "최신 베이스인데 exit 했다");

  // ── 3. 워커 커밋만 앞선 경우도 잡는다 ─────────────────────────────────────
  run(["update-ref", "refs/remotes/origin/main", aheadWorker], repo);
  run(["checkout", "-q", "--detach", base], repo);
  const workerOnly = guardResult(repo);
  assert(workerOnly.exitCode === 1, "워커 커밋이 앞서 있는데 차단하지 않았다");

  // ── 4. --allow-stale 우회는 동작하되 경고를 남긴다 ────────────────────────
  const bypass = guardResult(repo, ["--allow-stale"]);
  assert(bypass.outcome === "bypassed", "--allow-stale 우회가 동작하지 않았다");
  assert(bypass.exitCode === null, "--allow-stale 인데 차단했다");
  assert(/되돌릴 수 있다/.test(bypass.logs), "--allow-stale 이 위험을 경고하지 않았다");

  // ── 5. origin/main 이 없으면 건너뛴다(신규 클론 등에서 배포를 막지 않는다) ──
  run(["update-ref", "-d", "refs/remotes/origin/main"], repo);
  const noRef = guardResult(repo);
  assert(noRef.outcome === "skipped", `origin/main 없을 때 skipped 여야 하는데 ${noRef.outcome}`);
  assert(noRef.exitCode === null, "origin/main 이 없다고 배포를 막았다");

  // ── 6. 배포 메시지에 커밋·브랜치가 실린다 ─────────────────────────────────
  const message = buildDeployMessage(repo);
  assert(/^[0-9a-f]{7,}/.test(message), `배포 메시지에 커밋 SHA 가 없다: ${message}`);
  assert(message.includes("@"), `배포 메시지에 브랜치가 없다: ${message}`);

  // ── 7. 배포 스크립트가 가드를 실제로 호출하는지 ───────────────────────────
  const deployScript = readFileSync(new URL("./deploy-worker.mjs", import.meta.url), "utf8");
  assert(/assertWorkerBaseIsFresh\(/.test(deployScript), "deploy-worker.mjs 가 가드를 호출하지 않는다");
  assert(
    deployScript.indexOf("assertWorkerBaseIsFresh(") < deployScript.indexOf('"wrangler", "deploy"'),
    "가드가 wrangler deploy 호출보다 뒤에 있다 — 막지 못한다",
  );
  assert(/--message/.test(deployScript), "배포에 --message 를 넣지 않는다 — 무엇이 배포됐는지 추적 불가");
} finally {
  rmSync(repo, { recursive: true, force: true });
}

if (failures.length) {
  console.error("[verify:deploy-base-guard] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("[verify:deploy-base-guard] PASS");
console.log("  차단·통과·오탐없음·우회·건너뛰기·배포메시지·호출순서 7종 확인");
