#!/usr/bin/env node
/**
 * guard-costly-commands.mjs 파이프 테스트.
 *
 * 실행: node .claude/hooks/guard-costly-commands.test.mjs
 * CI 게이트가 아니다(로컬 전용). 훅 규칙을 고쳤으면 손으로 한 번 돌린다.
 *
 * 이 훅은 fail-closed 여야 하므로 "정상 명령이 통과하는가"만큼
 * "입력이 깨졌을 때 통과가 아니라 ask 로 가는가"를 함께 본다.
 *
 * 통과 케이스 절반은 **실측으로 잡은 오탐**이다 — 이름만 보고 규칙을 쓰면
 * `build:worker`(내부가 `wrangler deploy --dry-run`)와 `deploy:critical`
 * (실제로는 검증 체인)이 매번 승인창을 띄운다. 지우지 말 것.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "guard-costly-commands.mjs");

/** [기대값, 도구, 명령] — ASK = 승인창을 띄워야 함, PASS = 그냥 통과해야 함 */
const CASES = [
  // --- 통과해야 하는 일상 작업 (예전엔 이것들이 전부 프롬프트를 탔다) ---
  ["PASS", "Bash", "npm run verify:billing-pass-policy"],
  ["PASS", "Bash", "node scripts/verify-mindscan-reading.mjs"],
  ["PASS", "Bash", "git push -u origin fix/some-branch"],
  ["PASS", "Bash", "git log --oneline -5"],
  ["PASS", "Bash", "grep -rn 'maintenance' worker/"],
  ["PASS", "Bash", "gh pr create --title x --body y"],
  ["PASS", "Bash", "gh pr view 648 --json statusCheckRollup"],
  // CI 상태 1회 조회와 실패 구간만 보는 것은 계속 허용된다 (ci-poll 이 잡으면 안 되는 쪽)
  ["PASS", "Bash", "gh run list --limit 5"],
  ["PASS", "Bash", "gh run view 31889129456 --json status,conclusion"],
  ["PASS", "Bash", "gh run view 31889129456 --log-failed"],
  ["PASS", "Bash", "gh pr checks 648"],
  ["PASS", "PowerShell", "npm run typecheck"],
  ["PASS", "Read", "(command 필드 없음 — 다른 도구는 건드리지 않는다)"],

  // --- 실측 오탐 방지 ---
  // 이름이 비슷한 다른 플래그
  ["PASS", "Bash", "npm run dev --live-reload"],
  // deploy: 접두사지만 업로드가 없는 것들
  ["PASS", "Bash", "npm run deploy:check"],
  ["PASS", "Bash", "npm run deploy:critical"],
  // build:worker 는 업로드 없는 번들 빌드다 (크기 측정용)
  ["PASS", "Bash", "npm run build:worker"],
  [
    "PASS",
    "Bash",
    "npx wrangler deploy --config worker/wrangler.toml --dry-run --outdir ../build-cache/worker-bundle",
  ],
  // --dry-run 변형
  ["PASS", "Bash", "npm run secrets:cf:worker:dry"],

  // --- 과금 실호출 ---
  ["ASK ", "Bash", "node scripts/verify-mindscan-reading.mjs --live"],
  ["ASK ", "Bash", "npm run audit:content-headroom:live"],
  // 배치 번역: 소스 안에 엔드포인트가 있어서 llm-endpoint 규칙에 안 걸렸다(2026-08-25 발견).
  ["ASK ", "Bash", "node scripts/i18n-translate-pending.mjs --namespace loveSimulationScenes"],
  ["ASK ", "Bash", "node scripts/i18n-translate-pending.mjs --provider workers-ai --neuron-budget 10000"],
  ["ASK ", "Bash", "npm run i18n:translate-pending"],
  // 🔴 --sample 은 12키를 실제로 번역해 과금된다 — 통과시키면 안 된다.
  ["ASK ", "Bash", "node scripts/i18n-translate-pending.mjs --provider workers-ai --locales ja --sample"],
  // --dry-run 은 프롬프트만 찍고 exit 0 이라 과금이 없다.
  ["PASS", "Bash", "node scripts/i18n-translate-pending.mjs --dry-run"],
  ["PASS", "Bash", "npm run i18n:translate-pending -- --dry-run"],
  // --- 배포 (npm 별칭과 실제 스크립트 경로 둘 다) ---
  ["ASK ", "Bash", "npx wrangler deploy"],
  ["ASK ", "Bash", "npx wrangler versions upload"],
  ["ASK ", "Bash", "npm run deploy:cf:worker"],
  ["ASK ", "Bash", "npm run deploy:preview"],
  ["ASK ", "Bash", "npm run deploy:smoke"],
  ["ASK ", "PowerShell", "npm run deploy:cf:pages"],
  ["ASK ", "Bash", "node scripts/deploy-worker.mjs"],
  ["ASK ", "Bash", "CD_BREAK_GLASS=1 npm run deploy:safe -- --break-glass"],
  // --- 시크릿 ---
  ["ASK ", "Bash", "npm run secrets:cf:worker"],
  ["ASK ", "Bash", "npx wrangler secret put FOO"],
  ["ASK ", "Bash", "node scripts/sync-cloudflare-worker-secrets.mjs"],
  // --- DB 쓰기 (마이그레이션·시드·백필) ---
  ["ASK ", "Bash", "npm run migrate:llm-cache-indexes"],
  ["ASK ", "Bash", "node scripts/migrations/20260813-add-ziwei-deep-report-indexes.mjs"],
  ["ASK ", "Bash", "npm run seed:test-account"],
  ["ASK ", "Bash", "node scripts/seed-test-account.mjs"],
  ["ASK ", "Bash", "npm run backfill:insights-pexels"],
  // --- 머지 = 배포, 워크플로 수동 실행 ---
  ["ASK ", "Bash", "gh pr merge 648 --squash"],
  ["ASK ", "Bash", "gh workflow run release.yml -f mode=preview"],
  // --- CI 완료 대기 폴링·로그 전량 (토큰 소모) ---
  ["ASK ", "Bash", "gh run watch 31889129456 --exit-status"],
  ["ASK ", "Bash", "gh run view 31889129456 --log"],
  ["ASK ", "Bash", "gh pr checks 648 --watch"],
  [
    "ASK ",
    "PowerShell",
    'gh run watch 31889129456 --exit-status; echo "=== FINAL ==="; gh run view 31889129456 --json status,conclusion',
  ],
  // --- git ---
  ["ASK ", "Bash", "git push origin main"],
  ["ASK ", "Bash", "git push --force-with-lease"],
];

/** 입력이 망가졌을 때 통과시키면 가드가 아니다 (원칙 11). */
const FAIL_CLOSED = [
  ["깨진 JSON", "{not json"],
  ["빈 입력", ""],
  ["command 누락", JSON.stringify({ tool_name: "Bash", tool_input: {} })],
];

let failed = 0;

for (const [want, tool, command] of CASES) {
  const payload =
    tool === "Read"
      ? JSON.stringify({ tool_name: "Read", tool_input: { file_path: "x" } })
      : JSON.stringify({ tool_name: tool, tool_input: { command } });
  const run = spawnSync(process.execPath, [HOOK], { input: payload, encoding: "utf8" });
  const got = run.stdout.includes('"permissionDecision":"ask"') ? "ASK " : "PASS";
  const ok = got === want && run.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${got} (want ${want})  ${tool}: ${command}`);
}

for (const [label, input] of FAIL_CLOSED) {
  const run = spawnSync(process.execPath, [HOOK], { input, encoding: "utf8" });
  const asked = run.stdout.includes('"permissionDecision":"ask"');
  if (!asked) failed++;
  console.log(`${asked ? "ok  " : "FAIL"} fail-closed(${label}) -> ${asked ? "ASK" : "PASS"}`);
}

const total = CASES.length + FAIL_CLOSED.length;
console.log(failed === 0 ? `\nALL PASS (${total})` : `\n${failed}/${total} FAILED`);
process.exit(failed === 0 ? 0 : 1);
