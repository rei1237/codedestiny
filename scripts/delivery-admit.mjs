#!/usr/bin/env node
// PR 순차 머지 전에만 쓰는 읽기 전용 입장 검사다. 머지·push·checkout은 수행하지 않는다.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectWorktree } from "./worktree-status.mjs";
import { readProductionShas, shaMatches } from "./verify-deployed-sha.mjs";

const execute = promisify(execFile);
const DEFAULT_STAGING_ORIGIN = "https://staging.code-destiny.com";

function argValue(name, argv = process.argv) {
  const prefix = `--${name}=`;
  const inline = argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? String(argv[index + 1] || "").trim() : "";
}
function hasFlag(name, argv = process.argv) { return argv.includes(`--${name}`); }
async function command(file, args, { cwd, optional = false } = {}) {
  try {
    const result = await execute(file, args, { cwd, encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
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
const git = (args, options) => command("git", args, options);
const gh = (args, options) => command("gh", args, options);

async function collectAdmission({ cwd = process.cwd(), prNumber, stagingOrigin = DEFAULT_STAGING_ORIGIN } = {}) {
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
  const [mainResult, worktree] = await Promise.all([git(["rev-parse", "origin/main"], { cwd: root, optional: true }), inspectWorktree(root, { untracked: true })]);
  const mainSha = mainResult.stdout;
  const preflight = await command(process.execPath, ["scripts/ci-preflight.mjs", "--verify-receipt"], { cwd: root, optional: true });
  append(findings, preflight.ok, "최신 tree/main 로컬 preflight", preflight.ok ? "검증 증거 일치" : preflight.stderr || "npm run ci:preflight 필요");
  append(findings, Boolean(mainSha), "main 기준 SHA", mainSha || "origin/main을 확인하지 못했습니다.");
  const conflicts = worktree.activeOverlaps;
  append(findings, conflicts.length === 0, "활성 워크트리 파일 충돌", conflicts.length === 0 ? "후보 변경 파일과 겹치는 다른 활성 워크트리가 없습니다." : conflicts.map((item) => `${item.branch || item.path}: ${item.files.join(", ")}`).join(" | "));
  const containsMain = mainSha ? await git(["merge-base", "--is-ancestor", "origin/main", "HEAD"], { cwd: root, optional: true }) : { ok: false };
  append(findings, containsMain.ok, "최신 main 반영", containsMain.ok ? `${mainSha.slice(0, 12)} 포함` : "후보 브랜치가 최신 origin/main을 포함하지 않습니다.");
  const pr = await gh(["pr", "view", String(prNumber), "--json", "number,isDraft,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,url"], { cwd: root, optional: true });
  if (!pr.ok) { append(findings, false, "PR 조회", pr.stderr); return summarizeAdmission(findings); }
  let metadata;
  try { metadata = JSON.parse(pr.stdout); } catch { append(findings, false, "PR 메타데이터", "GitHub 응답을 해석하지 못했습니다."); return summarizeAdmission(findings); }
  append(findings, metadata.baseRefName === "main", "PR 대상", metadata.baseRefName === "main" ? "main 대상 PR" : `base=${metadata.baseRefName}`);
  append(findings, !metadata.isDraft, "Ready PR", metadata.isDraft ? "Draft PR은 큐에 넣지 않습니다." : "Draft 아님");
  append(findings, metadata.headRefName === branch && metadata.headRefOid === head, "후보와 PR head 일치", metadata.headRefName === branch && metadata.headRefOid === head ? `${branch} @ ${head.slice(0, 12)}` : "현재 워크트리와 GitHub PR head가 일치하지 않습니다.");
  append(findings, metadata.mergeable === "MERGEABLE" && metadata.mergeStateStatus === "CLEAN", "GitHub 병합 가능", `mergeable=${metadata.mergeable}, state=${metadata.mergeStateStatus}`);
  const checks = await gh(["pr", "checks", String(prNumber), "--required", "--json", "name,state,bucket"], { cwd: root, optional: true });
  if (!checks.ok) append(findings, false, "필수 PR CI", checks.stderr || checks.stdout || "필수 검사 실패 또는 아직 완료되지 않음");
  else try {
    const required = parseRequiredChecks(checks.stdout);
    append(findings, required.length > 0, "필수 PR CI 존재", required.length > 0 ? `${required.length}개` : "필수 체크가 보고되지 않았습니다.");
    append(findings, required.length > 0 && required.every((check) => check.bucket === "pass"), "필수 PR CI 통과", required.map((check) => `${check.name}:${check.bucket}`).join(", "));
  } catch (error) { append(findings, false, "필수 PR CI", error.message); }
  if (mainSha) {
    const live = await readProductionShas({ origin: stagingOrigin });
    const pagesOk = !live.pages.error && shaMatches(mainSha, live.pages.sha);
    const workerOk = !live.worker.error && shaMatches(mainSha, live.worker.sha);
    append(findings, pagesOk && workerOk, "직전 main 스테이징 도달", `expected=${mainSha.slice(0, 12)}, pages=${live.pages.sha || live.pages.error || "unknown"}, worker=${live.worker.sha || live.worker.error || "unknown"}`);
  }
  return summarizeAdmission(findings);
}
function printReport(report, asJson) {
  if (asJson) return console.log(JSON.stringify(report, null, 2));
  for (const finding of report.findings) console.log(`${finding.ok ? "PASS" : "BLOCK"} ${finding.label}: ${finding.detail}`);
  console.log(report.ok ? "[delivery-admit] PASS: 이 PR만 순차 머지할 수 있습니다." : "[delivery-admit] BLOCK: 실패 항목을 해결할 때까지 다음 PR을 포함해 머지하지 마세요.");
}
export function selfTest() {
  const tests = [
    [argValue("pr", ["--pr=42"]) === "42", "--pr=값 형식"], [argValue("pr", ["--pr", "42"]) === "42", "--pr 값 형식"], [hasFlag("json", ["--json"]), "플래그 형식"],
    [parseRequiredChecks('[{"name":"CI required","bucket":"pass"}]').length === 1, "필수 검사 배열 해석"], [summarizeAdmission([{ ok: true }, { ok: true }]).ok, "모든 조건 통과"], [!summarizeAdmission([{ ok: true }, { ok: false }]).ok, "하나라도 실패하면 차단"],
  ];
  for (const [actual, label] of tests) if (!actual) throw new Error(`self-test 실패: ${label}`);
  console.log("[delivery-admit] self-test passed");
}
async function main() {
  if (hasFlag("self-test")) return selfTest();
  const prNumber = argValue("pr");
  const stagingOrigin = argValue("staging-origin") || process.env.CD_STAGING_ORIGIN || DEFAULT_STAGING_ORIGIN;
  if (!/^\d+$/.test(prNumber)) throw new Error("PR 번호가 필요합니다: npm run delivery:admit -- --pr=<number>");
  if (!/^https:\/\//i.test(stagingOrigin)) throw new Error("staging-origin은 HTTPS 절대 URL이어야 합니다.");
  const report = await collectAdmission({ prNumber, stagingOrigin });
  printReport(report, hasFlag("json"));
  if (!report.ok) process.exitCode = 1;
}
function isEntrypoint() { return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
if (isEntrypoint()) main().catch((error) => { console.error(`[delivery-admit] FAIL: ${error.message}`); process.exitCode = 1; });
