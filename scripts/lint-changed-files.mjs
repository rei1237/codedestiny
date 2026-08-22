#!/usr/bin/env node

/**
 * PR 이 바꾼 파일에 eslint 를 직접 건다 — **머지 후 배포가 거는 것과 같은 범위로.**
 *
 * `npm run lint` 는 `next lint` 이고, 그것은 `pages/ app/ components/ lib/ src/` 만 본다.
 * 반면 scripts/deploy-safe.mjs 의 "changed-file lint" 는 변경 파일 전부에 eslint 를 건다.
 * 두 범위가 다르면 PR CI 는 초록불인데 머지 직후 스테이징 배포가 린트로 죽는다 —
 * 그리고 사람에게 보이는 마지막 에러는 그 다음 스텝의 "SHA 불일치" 뿐이라 원인이 가려진다.
 * (2026-08-22 run 32584789263 실측)
 *
 * 대상 선정은 scripts/lib/lint-targets.mjs 하나가 정본이고 deploy-safe 도 그것을 쓴다.
 * 여기서 규칙을 다시 쓰면 고치려던 드리프트를 그대로 재현하게 된다.
 *
 * 실행:
 *   PR_BASE_SHA=... PR_HEAD_SHA=... node scripts/lint-changed-files.mjs
 *   node scripts/lint-changed-files.mjs --base=<sha> --head=<sha>
 *   node scripts/lint-changed-files.mjs --self-test
 */

import { spawnSync } from "node:child_process";

import { lintTargets, selfTestLintTargets } from "./lib/lint-targets.mjs";

function argValue(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  return inline ? inline.slice(prefix.length).trim() : "";
}

function changedFiles() {
  const base = argValue("base") || process.env.PR_BASE_SHA || "";
  const head = argValue("head") || process.env.PR_HEAD_SHA || "HEAD";
  // 🔴 base 를 못 구했다는 것은 "바뀐 게 없다"가 아니라 "모른다"이다. 조용히 통과시키면
  // 이 게이트는 있으나 마나가 된다. resolve-ci-tier.mjs 는 같은 상황에서 티어를 critical 로
  // 올리는데(fail closed), 여기서는 올릴 티어가 없으므로 마지막 커밋을 대신 본다.
  const range = /^[0-9a-f]{7,64}$/i.test(base) ? `${base}...${head}` : "HEAD^..HEAD";
  const result = spawnSync("git", ["diff", "--name-only", range], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`[lint-changed] git diff ${range} 실패: ${String(result.stderr || "").trim()}`);
    process.exit(1);
  }
  return String(result.stdout || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function main() {
  if (process.argv.includes("--self-test")) {
    const count = selfTestLintTargets();
    console.log(`[lint-changed] self-test passed (${count} cases)`);
    return;
  }

  const files = changedFiles();
  const targets = lintTargets(files);
  if (!targets.length) {
    console.log(`[lint-changed] 린트 대상 없음 (변경 파일 ${files.length}개).`);
    return;
  }

  console.log(`[lint-changed] eslint ${targets.length}개 파일 (변경 파일 ${files.length}개)`);
  for (const target of targets.slice(0, 40)) console.log(`  ${target}`);
  if (targets.length > 40) console.log(`  ... 그 외 ${targets.length - 40}개`);

  const result = spawnSync("npm", ["exec", "--", "eslint", "--quiet", ...targets], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(`[lint-changed] eslint 실행 실패: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
  console.log("[lint-changed] PASS");
}

main();
