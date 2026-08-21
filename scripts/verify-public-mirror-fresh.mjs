#!/usr/bin/env node
/**
 * public/ 미러 신선도 가드.
 *
 * 왜 필요한가 — 같은 사고가 **2026-08-20~21 이틀에 세 번** 났다. 증상이 셋 다 달라서 아무도
 * 같은 원인으로 보지 않았다:
 *   ① b44bd7862 가 index.html 을 고치고 sync:public 을 안 돌려, 로케일 홈(/en/ /ja/ /zh/ /zh-tw/)이
 *      **개편 전 마크업을 서빙**했다(중복 고민 선택 칩 등).
 *   ② 같은 커밋이 지운 앵커를 요구하던 테스트가 남아 **main 이 빨간 채로** 머지됐다(PR #871 이 수습).
 *   ③ PR #872 가 또 index.html 만 고쳐 로케일 미러가 다시 낡았다(PR #874 가 수습).
 * 그리고 public/tadagochi.html · public/destiny-island.html 은 **그보다 더 오래** 낡아 있었다.
 *
 * 🔴 미러는 배포 산출물이라 **틀려도 CI 가 아무 말을 하지 않는다.** 테스트도 타입체크도 통과한다.
 * 아는 사람은 그 화면을 보는 사용자뿐이다. 그래서 이 가드가 필요하다.
 *
 * 어떻게 — 손으로 미러 목록을 적지 않는다(그건 가드가 아니다, CLAUDE.md 원칙 10).
 * **진짜 생성기를 그대로 돌려** 결과가 커밋된 내용과 같은지 본다. 새 미러가 생기거나 생성 규칙이
 * 바뀌어도 자동으로 따라온다. sync:public 이 멱등이라는 것은 실측으로 확인했다(2026-08-21:
 * 연속 두 번 실행 시 2회차 변경 0건).
 *
 * 🔴 fail-closed 3방향:
 *   ① 작업 트리가 더러우면 **판정 불가 → 실패.** 내 편집인지 드리프트인지 구분할 수 없다.
 *      (이 조건이 아래 복원용 `git checkout` 을 안전하게 만든다 — 날릴 미커밋 작업이 없음을
 *       먼저 증명하고 나서만 부른다.)
 *   ② 생성기가 파일을 바꾸면 실패 = 미러가 낡았다.
 *   ③ 생성기 자체가 죽으면 실패. 못 돌린 것은 통과가 아니다.
 *
 * 실행: npm run verify:public-mirror-fresh [--self-test]
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SYNC_SCRIPT = "scripts/sync-legacy-static-to-public.mjs";

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} 실패: ${(result.stderr || result.stdout || "").slice(0, 400)}`);
  }
  return String(result.stdout || "");
}

/** 추적 파일의 더러운 상태만 본다. 미추적 파일(빌드 산출물·스크래치)은 미러 판정과 무관하다. */
export function trackedDirtyPaths(porcelain) {
  const paths = [];
  for (const line of String(porcelain || "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const status = line.slice(0, 2);
    if (status === "??") continue;
    // 리네임은 "R  old -> new" 형태다.
    const rest = line.slice(3);
    const arrow = rest.indexOf(" -> ");
    paths.push(arrow === -1 ? rest.trim() : rest.slice(arrow + 4).trim());
  }
  return paths.sort();
}

/** 생성기 실행 전후를 비교해 **새로 더러워진** 파일만 돌려준다(순수 함수 — self-test 대상). */
export function newlyDirty(beforePaths, afterPaths) {
  const before = new Set(beforePaths);
  return afterPaths.filter((path) => !before.has(path));
}

/* 🔴 벤더 사본은 소스가 아니라 **node_modules** 에서 온다(생성기가 node_modules/sweph-wasm/dist 를
   js/vendor/sweph-wasm 으로 복사한다). 그러니 "커밋된 것과 같은가" 는 이 가드의 질문이 아니라
   **락파일↔벤더 사본** 이라는 다른 불변식이고, 설치 환경마다 갈릴 수 있다.
   여기서 실패시키면 이 가드가 지키려던 미러 드리프트가 그 소음에 묻힌다.
   🔴 대신 조용히 넘기지 않는다 — 목록으로 출력하고, 아래 assertVendorCarveOutIsHonest 가
   생성기의 벤더 대상 경로가 여전히 js/vendor 인지 확인해 이 예외가 낡는 것을 막는다. */
const VENDOR_PREFIXES = ["js/vendor/", "public/js/vendor/"];

export function partitionDrift(paths) {
  const vendor = paths.filter((p) => VENDOR_PREFIXES.some((prefix) => p.startsWith(prefix)));
  const mirrors = paths.filter((p) => !VENDOR_PREFIXES.some((prefix) => p.startsWith(prefix)));
  return { mirrors, vendor };
}

/** 예외가 진실인지 생성기 소스에서 확인한다. 벤더 대상이 옮겨가면 예외도 함께 실패해야 한다. */
function assertVendorCarveOutIsHonest() {
  const source = readFileSync(resolve(root, SYNC_SCRIPT), "utf8");
  if (!/resolve\(rootDir,\s*"js",\s*"vendor"/.test(source)) {
    throw new Error(
      "생성기의 벤더 복사 대상이 js/vendor 가 아니다. VENDOR_PREFIXES 예외가 더 이상 진실이 아니므로"
      + " 함께 갱신할 것 — 낡은 예외는 가드에 뚫린 구멍이다.",
    );
  }
}

/* 🔴 생성기는 환경변수 하나로 **모드가 바뀐다.**
   resolveDeterministicCacheKey 는 CACHE_BUST_KEY · BUILD_CACHE_KEY · CF_PAGES_COMMIT_SHA ·
   GITHUB_SHA 가 있으면 그 값을 캐시 키로 쓰고, 없을 때만 **파일 내용 해시**를 쓴다.
   CI 에는 GITHUB_SHA 가 항상 있으므로 그대로 돌리면 모든 ?v=build-… 핀이 커밋 SHA 로 다시 쓰여
   **커밋된 내용과 영원히 불일치**한다(실측 2026-08-21: 그 상태에서 13개 파일이 어긋났고, 같은
   변수를 로컬에 주자 똑같이 13개가 재현됐다).
   커밋되는 것은 내용 해시 모드의 결과이므로, 판정도 그 모드로 해야 한다. */
const NON_DETERMINISTIC_ENV = ["CACHE_BUST_KEY", "BUILD_CACHE_KEY", "CF_PAGES_COMMIT_SHA", "GITHUB_SHA"];

function runSync() {
  const env = { ...process.env };
  for (const key of NON_DETERMINISTIC_ENV) delete env[key];
  const result = spawnSync(process.execPath, [SYNC_SCRIPT], { cwd: root, encoding: "utf8", env });
  if (result.status !== 0) {
    throw new Error(`${SYNC_SCRIPT} 가 실패했다(exit ${result.status}). 못 돌린 것은 통과가 아니다.\n${(result.stderr || result.stdout || "").slice(0, 600)}`);
  }
}

/** 생성기를 돌려 드리프트 목록을 얻고, 작업 트리는 원래대로 되돌린다. */
function detectDrift() {
  const before = trackedDirtyPaths(git(["status", "--porcelain"]));
  if (before.length > 0) {
    throw new Error(
      "작업 트리에 커밋되지 않은 변경이 있어 미러 신선도를 판정할 수 없다.\n"
      + "  판정 불가는 통과가 아니다 — 커밋하거나 되돌린 뒤 다시 실행할 것.\n"
      + before.map((p) => `    · ${p}`).join("\n"),
    );
  }

  assertVendorCarveOutIsHonest();
  runSync();
  const drifted = newlyDirty(before, trackedDirtyPaths(git(["status", "--porcelain"])));

  // 🔴 여기서 checkout 이 안전한 이유: 위에서 트리가 깨끗함을 **이미 증명했다.**
  //    (그 증명 없이 복원에 checkout 을 쓰면 그 파일의 미커밋 작업이 통째로 날아간다.)
  if (drifted.length > 0) git(["checkout", "--", ...drifted]);

  return partitionDrift(drifted);
}

function report({ mirrors, vendor }) {
  if (vendor.length > 0) {
    console.log(`[verify-public-mirror-fresh] 참고: 벤더 사본 ${vendor.length}개가 설치본과 다르다(node_modules 유래라 실패시키지 않는다).`);
    for (const path of vendor) console.log(`    · ${path}`);
    console.log("    락파일과 벤더 사본을 맞추려면 npm ci 후 sync:public 을 돌려 커밋할 것.");
  }
  if (mirrors.length === 0) {
    console.log("[verify-public-mirror-fresh] OK — 생성기를 돌려도 미러가 바뀌지 않는다. 소스와 일치한다.");
    return true;
  }
  console.error("[verify-public-mirror-fresh] FAIL — 미러가 소스보다 낡았다.");
  console.error(`  ${SYNC_SCRIPT} 를 돌리면 아래 ${mirrors.length}개 파일이 바뀐다:`);
  for (const path of mirrors) console.error(`    · ${path}`);
  console.error("\n  고치는 법: `npm run sync:public` 을 돌리고 결과를 **같은 커밋에** 담을 것.");
  console.error("  🔴 미러는 배포 산출물이라 낡아도 테스트가 통과한다. 사용자만 옛 화면을 본다.");
  return false;
}

/**
 * 🔴 단언이 공허하지 않은지 증명한다.
 * 순수 비교 함수는 합성 입력으로, 전체 사슬은 **소스를 실제로 건드려** 확인한다.
 * 건드린 파일은 finally 에서 되돌리며, 진입 시 트리가 깨끗함을 먼저 확인하므로 안전하다.
 */
function runSelfTest() {
  // ── 순수 함수 ──────────────────────────────────────────────────────────
  const cases = [
    [[], ["public/index.html"], ["public/index.html"]],
    [["index.html"], ["index.html"], []],
    [["index.html"], ["index.html", "public/index.html"], ["public/index.html"]],
    [[], [], []],
  ];
  for (const [before, after, expected] of cases) {
    const actual = newlyDirty(before, after);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`newlyDirty(${JSON.stringify(before)}, ${JSON.stringify(after)}) = ${JSON.stringify(actual)}, 기대 ${JSON.stringify(expected)}`);
    }
  }
  if (trackedDirtyPaths("?? scratch.txt\n M index.html\nR  a.html -> b.html\n").join(",") !== "b.html,index.html") {
    throw new Error("trackedDirtyPaths 가 미추적/리네임을 제대로 다루지 않는다");
  }

  // ── 전체 사슬 ──────────────────────────────────────────────────────────
  const baseline = detectDrift();
  if (baseline.mirrors.length > 0) {
    throw new Error(`self-test 기준선 실패: 지금 이미 미러 드리프트가 있다(${baseline.mirrors.length}건). 먼저 sync:public 을 커밋할 것.`);
  }

  // 🔴 CI 모드 재현: GITHUB_SHA 가 있어도 판정이 흔들리면 안 된다. 이 한 줄이 없었을 때
  //    PR CI 가 13개 파일 드리프트로 실패했다(2026-08-21).
  const ciEnvBaseline = (() => {
    const saved = process.env.GITHUB_SHA;
    process.env.GITHUB_SHA = "0".repeat(40);
    try { return detectDrift(); } finally {
      if (saved === undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA = saved;
    }
  })();
  if (ciEnvBaseline.mirrors.length > 0) {
    throw new Error(`GITHUB_SHA 가 있으면 판정이 달라진다(${ciEnvBaseline.mirrors.length}건) — 생성기 환경을 결정적으로 만들지 못했다.`);
  }

  const shellPath = resolve(root, "index.html");
  const original = readFileSync(shellPath, "utf8");
  let drifted = [];
  try {
    // 렌더에 영향이 없는 주석 한 줄만 넣는다. 미러가 따라오면 드리프트로 잡혀야 한다.
    writeFileSync(shellPath, `${original}\n<!-- verify-public-mirror-fresh self-test marker -->\n`, "utf8");
    runSync();
    drifted = newlyDirty([], trackedDirtyPaths(git(["status", "--porcelain"])));
  } finally {
    writeFileSync(shellPath, original, "utf8");
    const stillDirty = trackedDirtyPaths(git(["status", "--porcelain"]));
    if (stillDirty.length > 0) git(["checkout", "--", ...stillDirty]);
  }

  if (!drifted.some((path) => path.startsWith("public/"))) {
    throw new Error(`단언이 공허하다 — 소스를 바꿨는데 public/ 미러가 드리프트로 잡히지 않았다(변경: ${drifted.join(", ") || "없음"}).`);
  }

  const after = detectDrift();
  if (after.mirrors.length > 0) {
    throw new Error(`self-test 가 트리를 되돌리지 못했다(${after.mirrors.length}건 남음).`);
  }

  console.log(`[verify-public-mirror-fresh] self-test passed (순수 ${cases.length + 1}건 · 전체 사슬 1건 · CI 환경 재현 1건, 복원 확인)`);
}

function main() {
  try {
    if (process.argv.includes("--self-test")) return runSelfTest();
    if (!report(detectDrift())) process.exit(1);
  } catch (error) {
    console.error(`[verify-public-mirror-fresh] FAIL — ${String(error?.message || error)}`);
    process.exit(1);
  }
}

main();
