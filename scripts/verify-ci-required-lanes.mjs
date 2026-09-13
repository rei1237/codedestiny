#!/usr/bin/env node

/**
 * `CI required` 가 **정말로 무엇을 검사했는지** 대조한다.
 *
 * 배경(2026-09-13 실측):
 *   `.github/workflows/pr-ci.yml` 의 `ci-required` 는 lane 결론이 `skipped` 면 무조건
 *   통과시켰다. 그런데 lane 의 실행 조건은 전부 `needs.classify.outputs.runs_* == 'true'` 다.
 *   즉 classify 잡이 **성공하면서 출력을 비우기만 하면**(출력 키 오타, `steps.tier` id 드리프트,
 *   GITHUB_OUTPUT 쓰기 실패) 네 lane 이 전부 `skipped` 가 되고, 브랜치 룰셋이 요구하는 유일한
 *   체크가 **검사 0건으로 초록불**이 된다. 지금까지 그 상태와 정상 통과가 구분되지 않았다.
 *
 * 그래서 여기서는 "비성공이 아니면 통과"가 아니라 **선언과 실행을 대조**한다:
 *   classify 가 "이 lane 은 돈다"고 했으면 그 lane 은 `success` 여야 하고,
 *   "안 돈다"고 했으면 `skipped` 여야 한다. 둘 다 아니면 실패다(fail closed).
 *
 * 🔴 판정 로직을 yml 인라인 bash 로 두지 않는 이유: 그러면 로직 자체를 테스트할 방법이 없다.
 *   이 파일은 `--self-test` 를 갖고, 티어 → lane 매핑은 classify 와 **같은 정본**(resolve-ci-tier
 *   의 TIERS)을 읽는다. 여기서 값을 다시 적으면 고치려던 드리프트를 재현하게 된다.
 *
 * 실행:
 *   npm run verify:ci-required-lanes -- --self-test
 *   npm run verify:ci-required-lanes            # 워크플로가 env 로 넘긴 결론을 대조
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { TIERS } from "./resolve-ci-tier.mjs";

/** 워크플로의 `needs` 순서와 같다. runsKey 가 없는 lane 은 티어로 기대값을 유도할 수 없다. */
const LANES = [
  { label: "Typecheck and lint", runsEnv: "RUNS_FAST", resultEnv: "FAST_RESULT", tierKey: null },
  { label: "Static guards", runsEnv: "RUNS_GUARDS", resultEnv: "GUARDS_RESULT", tierKey: null },
  { label: "Build Pages and Worker", runsEnv: "RUNS_BUILD", resultEnv: "BUILD_RESULT", tierKey: "runsBuild" },
  { label: "Critical checks", runsEnv: "RUNS_CRITICAL", resultEnv: "CRITICAL_RESULT", tierKey: "runsCritical" },
];

function read(env, key) {
  return String(env[key] ?? "").trim();
}

function shown(value) {
  return value || "(비어 있음)";
}

/**
 * @param {Record<string, string|undefined>} env
 * @returns {string[]} 사람이 읽을 수 있는 문제 목록. 비어 있으면 합격.
 */
export function auditLanes(env) {
  const problems = [];

  // classify 가 성공하지 않았으면 아래 판정의 근거(티어·선언)가 통째로 없다. 더 볼 것이 없다.
  const classify = read(env, "CLASSIFY_RESULT");
  if (classify !== "success") {
    problems.push(`classify(Risk tier) 잡의 결론이 "${shown(classify)}" 입니다 — 티어를 못 정한 실행은 통과가 아닙니다.`);
    return problems;
  }

  const tier = read(env, "TIER");
  if (!Object.prototype.hasOwnProperty.call(TIERS, tier)) {
    problems.push(
      `classify 의 tier 출력이 "${shown(tier)}" 입니다 — 출력이 비면 모든 lane 의 if 조건이 거짓이 되어 전부 skipped 로 떨어집니다. 그건 "검사 0건" 이지 "통과" 가 아닙니다.`,
    );
    return problems;
  }

  for (const lane of LANES) {
    const declared = read(env, lane.runsEnv);
    if (declared !== "true" && declared !== "false") {
      problems.push(
        `${lane.runsEnv} 가 "${shown(declared)}" 입니다 — true/false 가 아니면 lane 의 if 조건이 항상 거짓이 되어 조용히 skipped 가 됩니다.`,
      );
      continue;
    }

    // 티어로 유도되는 lane 은 classify 의 선언이 정본 매핑과 맞는지부터 본다.
    if (lane.tierKey) {
      const expected = TIERS[tier][lane.tierKey];
      if (declared !== String(expected)) {
        problems.push(
          `tier=${tier} 는 ${lane.runsEnv}=${expected} 여야 하는데 "${declared}" 입니다 — classify 출력이 티어 정본과 어긋났습니다.`,
        );
        continue;
      }
    }

    const result = read(env, lane.resultEnv);
    if (declared === "true" && result !== "success") {
      problems.push(
        `${lane.label} lane 은 tier=${tier} 에서 돌아야 하는데 결론이 "${shown(result)}" 입니다.`,
      );
    }
    if (declared === "false" && result !== "skipped") {
      problems.push(
        `${lane.label} lane 은 tier=${tier} 에서 돌지 않아야 하는데 결론이 "${shown(result)}" 입니다 — 워크플로의 if 조건이 이 판정과 어긋났습니다.`,
      );
    }
  }

  // build·critical 이 필요한 변경이면 typecheck·lint 도 반드시 필요하다. runs_fast 는 티어가
  // 아니라 shouldRunFastChecks 가 정하므로 정본 매핑으로는 유도되지 않는다 — 이 불변식으로 묶는다.
  if (tier !== "fast" && read(env, "RUNS_FAST") !== "true") {
    problems.push(`tier=${tier} 인데 RUNS_FAST 가 "true" 가 아닙니다 — build/critical 이 필요한 변경은 typecheck·lint 도 필요합니다.`);
  }

  return problems;
}

function selfTest() {
  const ok = (extra) => ({ CLASSIFY_RESULT: "success", ...extra });
  const cases = [
    // ── 합격해야 하는 것 ───────────────────────────────────────────────
    [
      "문서 전용: 모든 lane 이 정당하게 skipped",
      ok({ TIER: "fast", RUNS_FAST: "false", RUNS_GUARDS: "false", RUNS_BUILD: "false", RUNS_CRITICAL: "false", FAST_RESULT: "skipped", GUARDS_RESULT: "skipped", BUILD_RESULT: "skipped", CRITICAL_RESULT: "skipped" }),
      0,
    ],
    [
      "fast 티어: typecheck·lint·가드만",
      ok({ TIER: "fast", RUNS_FAST: "true", RUNS_GUARDS: "true", RUNS_BUILD: "false", RUNS_CRITICAL: "false", FAST_RESULT: "success", GUARDS_RESULT: "success", BUILD_RESULT: "skipped", CRITICAL_RESULT: "skipped" }),
      0,
    ],
    [
      "standard 티어: build 까지",
      ok({ TIER: "standard", RUNS_FAST: "true", RUNS_GUARDS: "false", RUNS_BUILD: "true", RUNS_CRITICAL: "false", FAST_RESULT: "success", GUARDS_RESULT: "skipped", BUILD_RESULT: "success", CRITICAL_RESULT: "skipped" }),
      0,
    ],
    [
      "critical 티어: 전원 실행",
      ok({ TIER: "critical", RUNS_FAST: "true", RUNS_GUARDS: "true", RUNS_BUILD: "true", RUNS_CRITICAL: "true", FAST_RESULT: "success", GUARDS_RESULT: "success", BUILD_RESULT: "success", CRITICAL_RESULT: "success" }),
      0,
    ],
    // ── 🔴 이 가드를 만든 이유 ─────────────────────────────────────────
    [
      "classify 가 출력을 못 내보내 전 lane 이 skipped — 검사 0건 초록불",
      ok({ TIER: "", RUNS_FAST: "", RUNS_GUARDS: "", RUNS_BUILD: "", RUNS_CRITICAL: "", FAST_RESULT: "skipped", GUARDS_RESULT: "skipped", BUILD_RESULT: "skipped", CRITICAL_RESULT: "skipped" }),
      1,
    ],
    [
      "critical 이 돌아야 하는데 skipped",
      ok({ TIER: "critical", RUNS_FAST: "true", RUNS_GUARDS: "true", RUNS_BUILD: "true", RUNS_CRITICAL: "true", FAST_RESULT: "success", GUARDS_RESULT: "success", BUILD_RESULT: "success", CRITICAL_RESULT: "skipped" }),
      1,
    ],
    // ── 나머지 fail-closed 축 ──────────────────────────────────────────
    ["classify 자체가 skipped", { CLASSIFY_RESULT: "skipped" }, 1],
    ["classify 실패", { CLASSIFY_RESULT: "failure" }, 1],
    [
      // 🔴 실제로 도달하는 경로다. doc-only 변경은 lane 이 전부 정당하게 skipped 인데,
      // classify 안의 `verify:doc-freshness` 는 **바로 그때만** 돈다. 그 스텝이 실패하면
      // 선언·실행은 완벽히 일관되고 classify 결론만 failure 다 — 여기서 안 잡으면 초록불이다.
      "doc-only 인데 classify 안의 문서 신선도 검사가 실패 — 선언·실행은 일관",
      { CLASSIFY_RESULT: "failure", TIER: "fast", RUNS_FAST: "false", RUNS_GUARDS: "false", RUNS_BUILD: "false", RUNS_CRITICAL: "false", FAST_RESULT: "skipped", GUARDS_RESULT: "skipped", BUILD_RESULT: "skipped", CRITICAL_RESULT: "skipped" },
      1,
    ],
    ["classify 결론이 비어 있음", {}, 1],
    [
      "tier 값이 미지의 문자열",
      ok({ TIER: "turbo", RUNS_FAST: "true", RUNS_GUARDS: "true", RUNS_BUILD: "true", RUNS_CRITICAL: "true" }),
      1,
    ],
    [
      "critical 티어인데 runs_build 선언이 false",
      ok({ TIER: "critical", RUNS_FAST: "true", RUNS_GUARDS: "true", RUNS_BUILD: "false", RUNS_CRITICAL: "true", FAST_RESULT: "success", GUARDS_RESULT: "success", BUILD_RESULT: "skipped", CRITICAL_RESULT: "success" }),
      1,
    ],
    [
      "standard 티어인데 runs_fast 가 false",
      ok({ TIER: "standard", RUNS_FAST: "false", RUNS_GUARDS: "false", RUNS_BUILD: "true", RUNS_CRITICAL: "false", FAST_RESULT: "skipped", GUARDS_RESULT: "skipped", BUILD_RESULT: "success", CRITICAL_RESULT: "skipped" }),
      1,
    ],
    [
      "runs_* 가 true/false 가 아닌 값",
      ok({ TIER: "fast", RUNS_FAST: "True", RUNS_GUARDS: "false", RUNS_BUILD: "false", RUNS_CRITICAL: "false", FAST_RESULT: "success", GUARDS_RESULT: "skipped", BUILD_RESULT: "skipped", CRITICAL_RESULT: "skipped" }),
      1,
    ],
    [
      "안 돌아야 할 lane 이 실행됨 — yml if 조건이 이 판정과 어긋남",
      ok({ TIER: "fast", RUNS_FAST: "true", RUNS_GUARDS: "false", RUNS_BUILD: "false", RUNS_CRITICAL: "false", FAST_RESULT: "success", GUARDS_RESULT: "success", BUILD_RESULT: "skipped", CRITICAL_RESULT: "skipped" }),
      1,
    ],
    [
      "돌아야 할 lane 이 실패",
      ok({ TIER: "fast", RUNS_FAST: "true", RUNS_GUARDS: "true", RUNS_BUILD: "false", RUNS_CRITICAL: "false", FAST_RESULT: "failure", GUARDS_RESULT: "success", BUILD_RESULT: "skipped", CRITICAL_RESULT: "skipped" }),
      1,
    ],
    [
      "워크플로 취소 — cancelled 는 통과가 아니다",
      ok({ TIER: "critical", RUNS_FAST: "true", RUNS_GUARDS: "true", RUNS_BUILD: "true", RUNS_CRITICAL: "true", FAST_RESULT: "success", GUARDS_RESULT: "success", BUILD_RESULT: "cancelled", CRITICAL_RESULT: "success" }),
      1,
    ],
  ];

  for (const [label, env, minProblems] of cases) {
    const problems = auditLanes(env);
    if (minProblems === 0 && problems.length !== 0) {
      throw new Error(`self-test "${label}" 는 합격해야 하는데 ${problems.length}건 걸렸습니다: ${problems.join(" / ")}`);
    }
    if (minProblems > 0 && problems.length < minProblems) {
      throw new Error(`self-test "${label}" 는 최소 ${minProblems}건을 잡아야 하는데 ${problems.length}건입니다.`);
    }
  }
  console.log(`[verify-ci-required-lanes] self-test passed (${cases.length} cases)`);
}

function main() {
  if (process.argv.includes("--self-test")) return selfTest();

  const problems = auditLanes(process.env);
  if (problems.length) {
    console.error("[verify-ci-required-lanes] 필수 CI 가 선언한 검사와 실제 실행이 어긋났습니다:");
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error("\n::error::CI required: 선언된 lane 이 실제로 실행되지 않았습니다. skipped 를 통과로 인정하지 않습니다.");
    process.exit(1);
  }
  console.log(`[verify-ci-required-lanes] tier=${read(process.env, "TIER")} — 선언된 lane 이 전부 실제로 실행되어 성공했습니다.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
