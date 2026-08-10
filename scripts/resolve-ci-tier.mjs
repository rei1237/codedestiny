#!/usr/bin/env node

/**
 * PR 이 어느 검증 티어를 받아야 하는지 **변경된 파일 경로**로 정한다.
 *
 * 모든 PR 에 같은 검사를 돌리면 CSS 한 줄 고치는 데 전체 회귀를 기다리게 되고, 그러면
 * 사람은 게이트를 우회할 방법을 찾는다. 반대로 전부 가볍게 하면 결제·인증이 무방비가 된다.
 * 그래서 위험한 경로가 걸렸을 때만 무겁게 간다.
 *
 * 🔴 판정 정본을 새로 만들지 않는다. scripts/lib/change-risk.mjs 가 이미 두 축을 갖고 있고,
 * 배포 파이프라인(deploy-safe)과 check-changed 도 그 하나를 쓴다. 여기서 규칙을 다시 쓰면
 * 같은 커밋을 CI 와 배포가 다르게 판정하게 되고, 그 드리프트가 곧 "CI 는 초록인데 배포에서
 * 터지는 게이트"가 된다. 이 파일은 **매핑만** 한다.
 *
 * | change-risk 판정            | tier     | 무엇이 도는가                                        |
 * |-----------------------------|----------|------------------------------------------------------|
 * | deepRequired = true         | critical | typecheck · lint · build · test · 배포가드 · 자동 Preview |
 * | level = high                | critical | 위와 같음                                            |
 * | level = medium              | standard | typecheck · lint · build                             |
 * | level = low                 | fast     | typecheck · lint                                     |
 * | 변경 파일을 못 구함          | critical | 모르면 무겁게 간다(fail closed)                       |
 *
 * deepRequired 를 level 과 함께 보는 이유: app/hooks/useCoinGate.ts 는 `app/` 이라 level=medium
 * 이지만 단건 결제 훅이라 전체 검증이 필요하다. 두 축은 독립이므로 둘 중 하나만 봐도 구멍이 난다.
 */

import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { riskOf, requiresDeepVerification } from "./lib/change-risk.mjs";

const TIERS = {
  fast: { runsBuild: false, runsCritical: false, label: "Fast" },
  standard: { runsBuild: true, runsCritical: false, label: "Standard" },
  critical: { runsBuild: true, runsCritical: true, label: "Critical" },
};

function argValue(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  return inline ? inline.slice(prefix.length).trim() : "";
}

/**
 * 순수 매핑. 여기가 이 파일의 전부이므로 테스트도 이것만 본다.
 * @returns {"fast"|"standard"|"critical"}
 */
export function resolveTier(files) {
  const list = (files || []).map((file) => String(file || "").trim()).filter(Boolean);
  // 변경 파일을 못 구했다는 것은 "안전하다"가 아니라 "모른다"이다. 모르면 무겁게 간다.
  if (!list.length) return "critical";
  if (requiresDeepVerification(list).required) return "critical";
  const level = riskOf(list).level;
  if (level === "high") return "critical";
  if (level === "medium") return "standard";
  return "fast";
}

/** 왜 그 티어인지 사람이 읽을 수 있게. 티어를 올린 파일만 보여 준다. */
export function explainTier(files) {
  const list = (files || []).filter(Boolean);
  if (!list.length) return [{ file: "(변경 파일을 확인하지 못함)", reason: "fail closed — 모르면 critical" }];
  const deep = requiresDeepVerification(list);
  if (deep.matches.length) return deep.matches;
  const risk = riskOf(list);
  return risk.rows.filter((row) => row.level === risk.level).map((row) => ({ file: row.file, reason: row.reason }));
}

function changedFiles() {
  const base = argValue("base") || process.env.PR_BASE_SHA || "";
  const head = argValue("head") || process.env.PR_HEAD_SHA || "HEAD";
  if (!/^[0-9a-f]{7,64}$/i.test(base)) return [];
  // 세 점(...)은 공통 조상 기준이라, base 브랜치가 앞서 나가도 이 PR 이 실제로 바꾼 것만 남는다.
  const result = spawnSync("git", ["diff", "--name-only", `${base}...${head}`], { encoding: "utf8" });
  if (result.status !== 0) return [];
  return String(result.stdout || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function selfTest() {
  const cases = [
    [["styles/site.css"], "fast"],
    [["docs/guide.md"], "fast"],
    [["public/images/hero.webp"], "fast"],
    [["components/Button.tsx"], "standard"],
    [["app/stories/page.tsx"], "standard"],
    [["js/destiny-profile.js"], "standard"],
    [["worker/routes/payments.js"], "critical"],
    [["worker/routes/ziwei-ai.js"], "critical"],
    [["worker/lib/models.js"], "critical"],
    [["wrangler.toml"], "critical"],
    [[".github/workflows/pr-ci.yml"], "critical"],
    [["scripts/migrations/20260805-add-fortune-chat-indexes.mjs"], "critical"],
    [["package-lock.json"], "critical"],
    // level=medium 이지만 deepRequired 라 critical 이어야 한다. 두 축을 함께 보는 이유.
    [["app/hooks/useCoinGate.ts"], "critical"],
    [["app/_lib/billing-client.ts"], "critical"],
    [["js/core/pass-verdict.js"], "critical"],
    // 섞이면 가장 높은 티어를 따른다.
    [["docs/a.md", "worker/routes/payments.js"], "critical"],
    [["docs/a.md", "components/Button.tsx"], "standard"],
    [["docs/a.md", "styles/site.css"], "fast"],
    // 모르면 critical.
    [[], "critical"],
    [[""], "critical"],
  ];
  for (const [files, expected] of cases) {
    const actual = resolveTier(files);
    if (actual !== expected) {
      throw new Error(`resolveTier(${JSON.stringify(files)}) = ${actual}, expected ${expected}`);
    }
  }
  if (!explainTier(["worker/routes/payments.js"])[0].reason) throw new Error("explainTier must give a reason");
  if (!explainTier([])[0].reason.includes("fail closed")) throw new Error("empty change set must explain the fail-closed default");
  console.log(`[resolve-ci-tier] self-test passed (${cases.length} cases)`);
}

function main() {
  if (process.argv.includes("--self-test")) return selfTest();

  const files = changedFiles();
  // `full-ci` 라벨은 티어를 올리기만 한다. 내리는 길은 두지 않는다 — 그건 게이트를 끄는 버튼이다.
  const forced = String(process.env.CD_FORCE_CRITICAL || "").trim().toLowerCase() === "true";
  const tier = forced ? "critical" : resolveTier(files);
  const config = TIERS[tier];
  const reasons = forced
    ? [{ file: "(full-ci 라벨)", reason: "사람이 티어를 critical 로 올렸습니다" }]
    : explainTier(files);

  if (forced) console.log("[resolve-ci-tier] full-ci 라벨이 붙어 티어를 critical 로 올립니다.");
  console.log(`[resolve-ci-tier] tier=${tier} files=${files.length}`);
  for (const row of reasons.slice(0, 20)) console.log(`  ${row.file} — ${row.reason}`);
  if (reasons.length > 20) console.log(`  ... 그 외 ${reasons.length - 20}건`);

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      [
        `tier=${tier}`,
        `runs_build=${config.runsBuild}`,
        `runs_critical=${config.runsCritical}`,
        `file_count=${files.length}`,
      ].join("\n") + "\n",
    );
  }

  if (process.env.GITHUB_STEP_SUMMARY) {
    const what = tier === "critical"
      ? "typecheck · lint · build · 전체 테스트 · 배포 설정 가드 · 자동 Preview"
      : tier === "standard"
        ? "typecheck · lint · build"
        : "typecheck · lint";
    const lines = [
      `## 검증 티어: **${config.label}**`,
      "",
      `변경 파일 ${files.length}건 → 이 PR 에서 도는 검사: ${what}`,
      "",
      "| 티어를 정한 파일 | 이유 |",
      "|---|---|",
      ...reasons.slice(0, 20).map((row) => `| \`${row.file}\` | ${row.reason} |`),
      "",
      "> 판정 정본은 `scripts/lib/change-risk.mjs` 하나이며 배포 파이프라인도 같은 모듈을 씁니다.",
      "> 더 무겁게 돌리고 싶으면 PR 에 `full-ci` 라벨을, Preview 만 필요하면 `preview` 라벨을 붙이세요.",
    ];
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  }
}

main();
