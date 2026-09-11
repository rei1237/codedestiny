#!/usr/bin/env node
// PR 순차 머지 전에만 쓰는 입장 검사다. 머지·checkout은 수행하지 않는다.
// 유일한 쓰기 예외는 캐시버스트 자동 복구(attemptCachebustRecovery)다: GitHub 가 mergeable=CONFLICTING
// 을 보고했을 때만, PR head 브랜치 한 개에 --force-with-lease 로 리베이스 결과를 올린다.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { syncWithMain } from "./delivery-sync.mjs";

const execute = promisify(execFile);

function argValue(name, argv = process.argv) {
  const prefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? String(argv[index + 1] || "").trim() : "";
}
function hasFlag(name, argv = process.argv) { return argv.includes(`--${name}`); }
async function command(file, args, { cwd, optional = false, timeout = 30_000 } = {}) {
  try {
    const result = await execute(file, args, { cwd, encoding: "utf8", windowsHide: true, timeout, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
    return { ok: true, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  } catch (error) {
    if (optional) return { ok: false, stdout: String(error.stdout || "").trim(), stderr: String(error.stderr || error.message || "").trim() };
    throw error;
  }
}
function append(findings, ok, label, detail) { findings.push({ ok, label, detail }); }
export function summarizeAdmission(findings) { return { ok: findings.every((finding) => finding.ok), findings }; }
export function parseRequiredChecks(output) {
  const parsed = JSON.parse(output);
  if (!Array.isArray(parsed)) throw new Error("필수 PR 검사 응답 형식이 배열이 아닙니다.");
  return parsed;
}
export const AGGREGATE_CHECK = "CI required";
// 룰셋에 필수 검사가 없으면 보고된 PR 체크 전체를 본다 — paid-flow-gates·secret-scan 등은 CI required 집계 밖이다.
// 집계 체크가 아직 없으면 빈 목록(=차단). skip 판정 체크만 뺀다.
export function selectRequiredChecks(checks, noRequired) {
  if (!noRequired) return checks;
  return checks.some((check) => check.name === AGGREGATE_CHECK) ? checks.filter((check) => check.bucket !== "skipping") : [];
}
const git =(args, options) => command("git", args, options);
const gh = (args, options) => command("gh", args, options);

// ── 캐시버스트 false CONFLICTING 자동 복구 ─────────────────────────────────────
// GitHub 의 서버측 mergeable 계산은 로컬 .git/config 에 등록된 custom merge driver 를 절대 실행하지
// 않는다(플랫폼 제약). 그래서 origin/main 이 .gitattributes 의 merge=cachebust 파일을 건드리면,
// 내용 차이가 0인 PR 도 전부 mergeable=CONFLICTING 으로 보인다. 지금까지는 사람이 "로컬 리베이스 +
// force-push" 를 손으로 했다. 아래는 그 한 번을 자동화할 뿐이고, 해시를 걷어내고도 남는 충돌은
// 예전과 똑같이 차단한다(원칙 10: fail-closed).
const SHA40 = /^[0-9a-f]{40}$/;
const CONFLICT_STATUS = /^(?:DD|AU|UD|UA|DU|AA|UU)\s/;
/** rebase 의 종료 코드만 믿지 않는다. 드라이버가 일부만 해결하고 충돌을 남길 수 있다. */
export function hasUnresolvedConflicts(porcelain) {
  return String(porcelain || "").split(/\r?\n/).filter(Boolean).some((line) => CONFLICT_STATUS.test(line));
}
/** 복구 push 는 PR head 브랜치 정확히 하나에만, 항상 --force-with-lease 로 나간다. */
export function cachebustForcePushArgs({ branch, expectedOid, newSha }) {
  if (!branch || !/^[A-Za-z0-9][\w.\-/]*$/.test(branch) || branch.includes("..")) throw new Error(`복구 push 대상 브랜치 이름이 안전하지 않습니다: ${branch}`);
  if (branch === "main" || branch === "HEAD" || branch.startsWith("refs/")) throw new Error(`복구 push 는 PR head 브랜치에만 허용됩니다: ${branch}`);
  if (!SHA40.test(expectedOid)) throw new Error(`복구 push 기준 SHA가 올바르지 않습니다: ${expectedOid}`);
  if (!SHA40.test(newSha)) throw new Error(`복구 push 대상 SHA가 올바르지 않습니다: ${newSha}`);
  return ["push", `--force-with-lease=refs/heads/${branch}:${expectedOid}`, "origin", `${newSha}:refs/heads/${branch}`];
}
/**
 * 일회용 detached worktree 에서만 리베이스한다. 사용자의 워크트리·index·브랜치는 건드리지 않는다.
 * 성공 조건은 "rebase 종료 코드 0 + 충돌 표식 0 + 트리 clean + upstream 포함" 전부다.
 */
export async function rebaseWithCachebustDriver({ root, headOid, worktreePath, upstream = "origin/main", timeout = 10 * 60_000 }) {
  if (!SHA40.test(headOid)) return { ok: false, reason: "input", detail: `리베이스 대상 SHA가 올바르지 않습니다: ${headOid}` };
  const added = await git(["-c", "core.longpaths=true", "worktree", "add", "--detach", worktreePath, headOid], { cwd: root, optional: true, timeout });
  if (!added.ok) return { ok: false, reason: "worktree", detail: added.stderr || "일회용 worktree 를 만들지 못했습니다." };
  try {
    const rebase = await git(["rebase", upstream], { cwd: worktreePath, optional: true, timeout });
    const status = await git(["status", "--porcelain"], { cwd: worktreePath, optional: true, timeout });
    const conflicted = hasUnresolvedConflicts(status.stdout);
    if (!rebase.ok || conflicted || status.stdout) {
      await git(["rebase", "--abort"], { cwd: worktreePath, optional: true, timeout });
      const detail = conflicted ? `충돌 파일: ${status.stdout.split(/\r?\n/).filter((line) => CONFLICT_STATUS.test(line)).join(" | ")}` : (rebase.stderr || status.stdout || "리베이스가 깨끗하게 끝나지 않았습니다.");
      return { ok: false, reason: conflicted ? "conflict" : (rebase.ok ? "dirty" : "rebase"), detail };
    }
    const sha = (await git(["rev-parse", "HEAD"], { cwd: worktreePath, optional: true, timeout })).stdout;
    const contains = await git(["merge-base", "--is-ancestor", upstream, "HEAD"], { cwd: worktreePath, optional: true, timeout });
    if (!SHA40.test(sha) || !contains.ok) return { ok: false, reason: "verify", detail: `리베이스 결과를 확인하지 못했습니다(sha=${sha || "?"}, upstream 포함=${contains.ok}).` };
    return { ok: true, sha, detail: `${upstream} 위로 리베이스 완료` };
  } finally {
    const name = String(worktreePath).split(/[\\/]/).at(-1);
    // 방금 이 함수가 만든 일회용 경로만 제거한다. 다른 worktree 는 절대 건드리지 않는다.
    if (/^\.admit-recovery-[0-9a-f]{8}$|^\.admit-recovery-test/.test(name)) await git(["-c", "core.longpaths=true", "worktree", "remove", "--force", "--", worktreePath], { cwd: root, optional: true, timeout });
  }
}
/** 성공하면 원격 PR head 가 리베이스 결과로 바뀐다. 실패·오류는 호출부가 원래 판정을 그대로 쓴다. */
export async function attemptCachebustRecovery({ root, prNumber, branch, metadata }) {
  const setup = await command(process.execPath, ["scripts/setup-git-merge-drivers.mjs"], { cwd: root, optional: true, timeout: 60_000 });
  if (!setup.ok) return { ok: false, message: `merge driver 등록에 실패해 복구를 중단했습니다: ${setup.stderr}` };
  const fetched = await git(["fetch", "--quiet", "origin", "+refs/heads/main:refs/remotes/origin/main"], { cwd: root, optional: true, timeout: 120_000 });
  if (!fetched.ok) return { ok: false, message: `origin/main 조회에 실패해 복구를 중단했습니다: ${fetched.stderr}` };
  const worktreePath = resolve(dirname(root), `.admit-recovery-${randomUUID().slice(0, 8)}`);
  const rebased = await rebaseWithCachebustDriver({ root, headOid: metadata.headRefOid, worktreePath });
  if (!rebased.ok) {
    return { ok: false, realConflict: rebased.reason === "conflict", message: rebased.reason === "conflict" ? `캐시버스트를 걷어내도 남는 실제 충돌입니다. 리베이스를 취소했고 원래 판정을 유지합니다. ${rebased.detail}` : `리베이스를 시도하지 못했습니다(원래 판정 유지): ${rebased.detail}` };
  }
  const pushed = await git(cachebustForcePushArgs({ branch, expectedOid: metadata.headRefOid, newSha: rebased.sha }), { cwd: root, optional: true, timeout: 120_000 });
  if (!pushed.ok) return { ok: false, message: `리베이스는 깨끗했지만 force-with-lease push 에 실패했습니다(원래 판정 유지): ${pushed.stderr}` };
  const refreshed = await gh(["pr", "view", String(prNumber), "--json", "headRefOid,mergeable,mergeStateStatus"], { cwd: root, optional: true, timeout: 60_000 });
  if (!refreshed.ok) return { ok: false, message: `push 는 했지만 PR 상태를 다시 읽지 못했습니다(원래 판정 유지): ${refreshed.stderr}` };
  let fresh;
  try { fresh = JSON.parse(refreshed.stdout); } catch { return { ok: false, message: "push 는 했지만 갱신된 PR 응답을 해석하지 못했습니다(원래 판정 유지)." }; }
  return { ok: true, metadata: fresh, message: `원격 ${branch} 를 리베이스 결과 ${rebased.sha.slice(0, 12)} 로 갱신했습니다. 로컬 브랜치는 그대로이므로 git fetch && git reset --hard origin/${branch} 로 맞춘 뒤 PR CI 결과를 다시 확인하세요.` };
}

// ── main 파일 겹침 판정 ────────────────────────────────────────────────────────
// Upstream moved but never touched any file this candidate changed: merging without a refresh is safe.
// GitHub itself does not require a PR branch to contain the latest main (no merge queue, strict status checks off),
// so this local rule only needs to match that already-accepted risk level, not exceed it.
// 2026-09-12 이전에는 이 판정이 ci-preflight.mjs 의 receipt 안에 있었다. preflight 폐기와 함께
// admit 실행 시점에 직접 계산한다 — 고정된 증거가 아니라 지금의 origin/main 을 본다.
export function upstreamCompatible({ ancestor, upstreamFiles, files }) {
  if (!ancestor) return false;
  return !upstreamFiles.some((file) => files.includes(file));
}
/** git 조회가 하나라도 실패하면 통과시키지 않는다(원칙 10: fail-closed). */
export async function checkUpstreamOverlap({ root, upstream = "origin/main" }) {
  const base = await git(["merge-base", upstream, "HEAD"], { cwd: root, optional: true });
  if (!base.ok || !SHA40.test(base.stdout)) return { ok: false, detail: base.stderr || `${upstream} 와의 merge-base 를 구하지 못했습니다.` };
  const [upstreamDiff, candidateDiff] = await Promise.all([
    git(["diff", "--name-only", base.stdout, upstream], { cwd: root, optional: true }),
    git(["diff", "--name-only", base.stdout, "HEAD"], { cwd: root, optional: true }),
  ]);
  if (!upstreamDiff.ok || !candidateDiff.ok) return { ok: false, detail: upstreamDiff.stderr || candidateDiff.stderr || "변경 파일 목록을 구하지 못했습니다." };
  const names = (output) => output.split(/\r?\n/).filter(Boolean);
  const upstreamFiles = names(upstreamDiff.stdout);
  const files = names(candidateDiff.stdout);
  const ok = upstreamCompatible({ ancestor: true, upstreamFiles, files });
  if (!ok) return { ok, detail: `merge-base 이후 main 이 같은 파일을 건드렸습니다: ${upstreamFiles.filter((file) => files.includes(file)).join(", ")}` };
  return { ok, detail: upstreamFiles.length ? `main 이 ${upstreamFiles.length}개 파일 전진했지만 후보 ${files.length}개와 겹치지 않습니다.` : "merge-base 이후 main 전진 없음" };
}

export async function collectAdmission({ cwd = process.cwd(), prNumber, allowRecovery = true } = {}) {
  const findings = [];
  const root = (await git(["rev-parse", "--show-toplevel"], { cwd })).stdout;
  const [branchResult, headResult, dirtyResult] = await Promise.all([
    git(["symbolic-ref", "--short", "-q", "HEAD"], { cwd, optional: true }), git(["rev-parse", "HEAD"], { cwd }), git(["status", "--porcelain"], { cwd }),
  ]);
  const branch = branchResult.stdout;
  const head = headResult.stdout;
  append(findings, Boolean(branch), "후보 브랜치", branch || "detached HEAD에서는 머지 입장 검사를 할 수 없습니다.");
  append(findings, !dirtyResult.stdout, "후보 워크트리 clean", dirtyResult.stdout || "미커밋 변경 없음");
  const fetched = await git(["fetch", "--quiet", "origin", "+refs/heads/main:refs/remotes/origin/main"], { cwd: root, optional: true });
  append(findings, fetched.ok, "origin/main 최신 조회", fetched.ok ? "origin/main을 갱신했습니다." : fetched.stderr);
  if (!fetched.ok) return summarizeAdmission(findings);
  const mainResult = await git(["rev-parse", "origin/main"], { cwd: root, optional: true });
  const mainSha = mainResult.stdout;
  append(findings, Boolean(mainSha), "main 기준 SHA", mainSha || "origin/main을 확인하지 못했습니다.");
  const [mergeTree, overlap] = mainSha ? await Promise.all([
    git(["merge-tree", "--write-tree", "origin/main", "HEAD"], { cwd: root, optional: true }),
    checkUpstreamOverlap({ root }),
  ]) : [{ ok: false, stderr: "origin/main을 확인하지 못했습니다." }, { ok: false, detail: "origin/main을 확인하지 못했습니다." }];
  append(findings, mergeTree.ok, "Git-native merge-tree 충돌 없음", mergeTree.ok ? "후보 커밋을 최신 origin/main에 병합할 수 있습니다." : mergeTree.stderr || "후보 커밋과 최신 origin/main의 병합 충돌을 해결해야 합니다.");
  append(findings, overlap.ok, "main 파일 겹침 없음", overlap.detail);
  // 최신 main 포함은 입장 조건이 아니다(GitHub ruleset 도 요구하지 않음, 2026-09-12). 병합 충돌은 위 merge-tree 가,
  // main 이 같은 파일을 건드린 경우는 바로 위 겹침 검사가 막는다. 여기서는 뒤처진 정도만 알린다.
  const behind = mainSha ? await git(["rev-list", "--count", "HEAD..origin/main"], { cwd: root, optional: true }) : { ok: false };
  append(findings, true, "최신 main 반영(정보)", behind.ok && behind.stdout === "0" ? `${mainSha.slice(0, 12)} 포함` : `origin/main 보다 ${behind.ok ? behind.stdout : "?"}커밋 뒤 — 충돌·파일 겹침이 없으면 갱신 없이 머지 가능`);
  // 전체 활성 worktree 스캔은 동기 입장 조건에서 제외한다. 실제 병합 안전성은 후보 커밋
  // 자체의 merge-tree와 GitHub mergeability/필수 CI가 판정하고, 상세 중첩 진단은 필요할 때
  // 사용자가 별도로 `npm run worktree:status`를 실행한다.
  append(findings, true, "활성 워크트리 중첩 검사", "비차단·동기 입장 검사에서 제외했습니다. 필요할 때만 worktree:status로 확인합니다.");
  const pr = await gh(["pr", "view", String(prNumber), "--json", "number,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,url"], { cwd: root, optional: true });
  if (!pr.ok) { append(findings, false, "PR 조회", pr.stderr); return summarizeAdmission(findings); }
  let metadata;
  try { metadata = JSON.parse(pr.stdout); } catch { append(findings, false, "PR 메타데이터", "GitHub 응답을 해석하지 못했습니다."); return summarizeAdmission(findings); }
  append(findings, metadata.baseRefName === "main", "PR 대상", metadata.baseRefName === "main" ? "main 대상 PR" : `base=${metadata.baseRefName}`);
  append(findings, !metadata.isDraft, "Ready PR", metadata.isDraft ? "Draft PR은 큐에 넣지 않습니다." : "Draft 아님");
  // 자동 복구는 딱 한 번, mergeable=CONFLICTING 일 때만 시도한다. Draft·base 불일치·head 불일치처럼
  // 다른 이유로 막힌 PR 에는 손대지 않는다. 복구가 어떤 이유로든 실패하면 아래 판정은 복구 이전 값을
  // 그대로 쓰며, 결과적으로 오늘과 동일하게 차단된다.
  let effective = metadata;
  let recoveryNote = "";
  const localHeadMatched = metadata.headRefName === branch && metadata.headRefOid === head;
  if (allowRecovery && metadata.mergeable === "CONFLICTING" && !metadata.isDraft && metadata.baseRefName === "main" && localHeadMatched) {
    try {
      const recovery = await attemptCachebustRecovery({ root, prNumber, branch, metadata });
      recoveryNote = ` / 캐시버스트 자동 복구: ${recovery.message}`;
      if (recovery.ok && recovery.metadata) effective = { ...metadata, ...recovery.metadata };
    } catch (error) {
      // 복구 경로의 버그가 판정을 통과시키는 일은 없어야 한다. 원래 값으로 되돌아간다.
      recoveryNote = ` / 캐시버스트 자동 복구 오류(원래 판정 유지): ${error.message}`;
    }
  }
  const headMatched = effective.headRefName === branch && effective.headRefOid === head;
  append(findings, headMatched, "후보와 PR head 일치", headMatched ? `${branch} @ ${head.slice(0, 12)}` : `현재 워크트리와 GitHub PR head가 일치하지 않습니다.${recoveryNote ? " 자동 복구로 원격 head 가 앞서 있으면 로컬을 맞추고 PR CI 결과를 다시 확인하세요." : ""}`);
  append(findings, effective.mergeable === "MERGEABLE" && effective.mergeStateStatus === "CLEAN", "GitHub 병합 가능", `mergeable=${effective.mergeable}, state=${effective.mergeStateStatus}${recoveryNote}`);
  const requiredChecks = await gh(["pr", "checks", String(prNumber), "--required", "--json", "name,state,bucket"], { cwd: root, optional: true });
  // ruleset 에 필수 상태 검사가 없으면 --required 가 "no required checks reported" 로 실패한다(2026-09-12 실측).
  // 그때는 pr-ci 의 단일 집계 체크를 필수로 간주한다. 집계 체크가 없으면 아래에서 차단된다(fail-closed).
  const noRequired = !requiredChecks.ok && /no required checks/i.test(`${requiredChecks.stderr}\n${requiredChecks.stdout}`);
  const checks = noRequired ? await gh(["pr", "checks", String(prNumber), "--json", "name,state,bucket"], { cwd: root, optional: true }) : requiredChecks;
  if (!checks.ok && !(noRequired && checks.stdout.startsWith("["))) append(findings, false, "필수 PR CI", checks.stderr || checks.stdout || "필수 검사 실패 또는 아직 완료되지 않음");
  else try {
    const required = selectRequiredChecks(parseRequiredChecks(checks.stdout), noRequired);
    append(findings, required.length > 0, "필수 PR CI 존재", required.length > 0 ? `${required.length}개` : "필수 체크가 보고되지 않았습니다.");
    append(findings, required.length > 0 && required.every((check) => check.bucket === "pass"), "필수 PR CI 통과", required.map((check) => `${check.name}:${check.bucket}`).join(", "));
  } catch (error) { append(findings, false, "필수 PR CI", error.message); }
  return summarizeAdmission(findings);
}
function printReport(report, asJson) {
  if (asJson) return console.log(JSON.stringify(report, null, 2));
  for (const finding of report.findings) console.log(`${finding.ok ? "PASS" : "BLOCK"} ${finding.label}: ${finding.detail}`);
  console.log(report.ok ? "[delivery-admit] PASS: 이 HEAD를 머지할 수 있습니다. 다음 PR도 admission을 확인하세요. 스테이징 확인은 선택(npm run verify:staging)입니다." : "[delivery-admit] BLOCK: 실패 항목을 해결할 때까지 다음 PR을 포함해 머지하지 마세요.");
}
export function selfTest() {
  const tests = [
    [argValue("pr", ["--pr=42"]) === "42", "--pr=값 형식"], [argValue("pr", ["--pr", "42"]) === "42", "--pr 값 형식"], [hasFlag("json", ["--json"]), "플래그 형식"],
    [parseRequiredChecks('[{"name":"CI required","bucket":"pass"}]').length === 1, "필수 검사 배열 해석"], [selectRequiredChecks([{ name: "paid", bucket: "fail" }, { name: "CI required", bucket: "pass" }], true).length === 2 && selectRequiredChecks([{ name: "lint" }], true).length === 0, "필수 검사 없으면 전체 체크(집계 체크 필수)"], [summarizeAdmission([{ ok: true }, { ok: true }]).ok, "모든 조건 통과"], [!summarizeAdmission([{ ok: true }, { ok: false }]).ok, "하나라도 실패하면 차단"],
    [upstreamCompatible({ ancestor: true, upstreamFiles: ["a.md"], files: ["b.md"] }) && !upstreamCompatible({ ancestor: true, upstreamFiles: ["a.md"], files: ["a.md"] }) && !upstreamCompatible({ ancestor: false, upstreamFiles: [], files: [] }), "main 파일 겹침 판정"],
    [hasUnresolvedConflicts("UU index.html"), "충돌 표식 감지"], [!hasUnresolvedConflicts(" M index.html\n?? tmp.txt"), "일반 변경은 충돌이 아니다"],
    [cachebustForcePushArgs({ branch: "feat/x", expectedOid: "a".repeat(40), newSha: "b".repeat(40) }).join(" ") === `push --force-with-lease=refs/heads/feat/x:${"a".repeat(40)} origin ${"b".repeat(40)}:refs/heads/feat/x`, "복구 push 인자"],
    [(() => { try { cachebustForcePushArgs({ branch: "main", expectedOid: "a".repeat(40), newSha: "b".repeat(40) }); return false; } catch { return true; } })(), "main 으로는 복구 push 하지 않는다"],
  ];
  for (const [actual, label] of tests) if (!actual) throw new Error(`self-test 실패: ${label}`);
  console.log("[delivery-admit] self-test passed");
}
async function main() {
  if (hasFlag("self-test")) return selfTest();
  const prNumber = argValue("pr");
  if (!/^\d+$/.test(prNumber)) throw new Error("PR 번호가 필요합니다: npm run delivery:admit -- --pr=<number>");
  // --auto-sync는 판정 전에 origin/main을 미리 병합·push한다(선택). "최신 main 반영"은 이제 정보 항목이라
  // 필요 없지만, 겹치는 파일 때문에 preflight 를 다시 돌려야 할 때 쓴다. 충돌 시에는 그대로 사람에게 넘긴다.
  if (hasFlag("auto-sync")) {
    const sync = await syncWithMain({ push: true });
    console.log(sync.ok ? `[delivery-admit] auto-sync: ${sync.message}` : `[delivery-admit] auto-sync FAIL: ${sync.message}`);
    if (!sync.ok) { process.exitCode = 1; return; }
  }
  // --no-recovery: 캐시버스트 자동 복구(리베이스 + PR head 브랜치 force-with-lease)를 끈다.
  const report = await collectAdmission({ prNumber, allowRecovery: !hasFlag("no-recovery") });
  printReport(report, hasFlag("json"));
  if (!report.ok) process.exitCode = 1;
}
function isEntrypoint() { return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
if (isEntrypoint()) main().catch((error) => { console.error(`[delivery-admit] FAIL: ${error.message}`); process.exitCode = 1; });
