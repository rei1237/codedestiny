/**
 * 워커 배포 전 "베이스가 최신인가" 검사.
 *
 * 🔴 `wrangler deploy` 는 커밋이 아니라 **워킹트리를 그대로 프로덕션에 민다.** 그래서 베이스가
 * 낡았으면 그 사이 main 에 머지된 남의 워커 커밋이 PR·CI 를 거치지 않고 즉시 사라진다.
 * `git status` 가 깨끗한 것과 베이스가 최신인 것은 전혀 다른 문제라, 눈으로는 안 잡힌다.
 *
 * 2026-08-01 하루에만 세 번 터졌다(서로 다른 세션 포함): #223 nakshatra 재설계,
 * #224 LLM 계측·섹션분할, #226 DB 풀 축소, #222 연애비책 리뉴얼이 각각 배포본에서 증발했다.
 *
 * deploy-worker.mjs 안에 두지 않고 분리한 이유는 **실제로 실행해 검증하기 위해서**다
 * (verify:deploy-base-guard 가 임시 저장소를 만들어 차단/통과를 둘 다 확인한다).
 */
import { spawnSync } from "node:child_process";

export function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) return null;
  return String(result.stdout || "").trim();
}

/**
 * 내 HEAD 에는 없는데 origin/main 에는 있는 worker/·lib/ 커밋 목록.
 *
 * 내가 만든 변경은 HEAD 쪽이라 여기 안 잡히고(오탐 없음),
 * scripts/·.github/ 만 바뀐 커밋도 안 잡힌다(경로 필터).
 */
export function findMissingWorkerCommits(rootDir) {
  if (!git(["rev-parse", "--git-dir"], rootDir)) return { skipped: "not-a-git-repo" };
  if (!git(["rev-parse", "--verify", "--quiet", "origin/main"], rootDir)) return { skipped: "no-origin-main" };

  const missing = git(["log", "--oneline", "HEAD..origin/main", "--", "worker/", "lib/"], rootDir);
  return { commits: missing ? missing.split("\n").filter(Boolean) : [] };
}

/**
 * 배포에 커밋 정보를 새긴다.
 *
 * 지금까지 `wrangler deployments list` 의 Message 가 전부 `-` 라, 라이브 버전이 어느 커밋에서
 * 나왔는지 확인할 방법이 아예 없었다. 동시 세션이 번갈아 배포하는 이 레포에서는
 * "지금 뜬 게 내 코드가 맞나"를 못 따지는 것 자체가 사고의 원인이 된다.
 */
export function buildDeployMessage(rootDir) {
  const sha = git(["rev-parse", "--short", "HEAD"], rootDir) || "unknown";
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], rootDir) || "unknown";
  const dirty = git(["status", "--porcelain"], rootDir) ? "+dirty" : "";
  // 🔴 공백을 넣지 말 것. deploy-worker.mjs 는 win32 에서 `spawnSync("npx", args, {shell:true})` 로
  // 도는데, 그러면 공백이 든 인자가 셸에서 쪼개져 뒷부분이 **위치 인자(엔트리포인트)로 오인**된다.
  // 실제로 "sha @branch" 로 만들었다가 `entry-point file at "@fix\..." was not found` 로 배포가 죽었다.
  // 브랜치명에 셸 특수문자가 들어갈 수 있으므로 영숫자·`-_./+@` 외에는 전부 치환한다.
  const safeBranch = branch.replace(/[^A-Za-z0-9._/-]/g, "-");
  return `${sha}${dirty}@${safeBranch}`;
}

/**
 * 낡은 베이스면 exit(1). 통과하면 아무것도 안 한다.
 * @returns {"ok"|"skipped"|"bypassed"} 테스트에서 판정하기 위한 결과 코드
 */
export function assertWorkerBaseIsFresh(rootDir, { argv = [], logger = console, exit = process.exit, fetchFirst = true } = {}) {
  if (argv.includes("--allow-stale")) {
    logger.warn("[deploy-worker] --allow-stale: 베이스 최신 여부 검사를 건너뛴다. 남의 워커 커밋을 되돌릴 수 있다.");
    return "bypassed";
  }

  // 네트워크 실패로 배포 자체를 막지는 않는다 — 대신 마지막으로 아는 origin/main 으로라도 검사한다.
  if (fetchFirst && git(["rev-parse", "--git-dir"], rootDir) && git(["fetch", "origin", "main"], rootDir) === null) {
    logger.warn("[deploy-worker] git fetch 실패 — 로컬에 남은 origin/main 기준으로만 검사한다(오래됐을 수 있음).");
  }

  const { skipped, commits } = findMissingWorkerCommits(rootDir);
  if (skipped) {
    logger.warn(`[deploy-worker] 베이스 최신 검사를 건너뛴다(${skipped}).`);
    return "skipped";
  }
  if (!commits.length) return "ok";

  logger.error("");
  logger.error("[deploy-worker] 🔴 배포 중단 — 이 트리는 origin/main 의 워커 코드보다 낡았다.");
  logger.error(`  지금 배포하면 아래 ${commits.length}개 커밋의 worker/·lib/ 변경이 프로덕션에서 사라진다:`);
  for (const line of commits.slice(0, 12)) logger.error(`    - ${line}`);
  if (commits.length > 12) logger.error(`    ... 외 ${commits.length - 12}개`);
  logger.error("");
  logger.error("  해결:");
  logger.error("    git rebase origin/main   # 또는 git merge origin/main");
  logger.error("    npm run typecheck && 관련 verify:* 재실행");
  logger.error("    npm run deploy:cf:worker");
  logger.error("");
  logger.error("  (정말 의도한 롤백이라면 --allow-stale 로 우회할 수 있다.)");
  exit(1);
  return "blocked";
}
