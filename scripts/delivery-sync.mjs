#!/usr/bin/env node
// 후보 브랜치를 최신 origin/main으로 병합 동기화한다. 충돌을 자동 해결하지 않고 즉시 중단한다
// (원칙 10: 가드는 fail-closed). delivery-admit.mjs의 판정 로직은 건드리지 않고, 그 앞에서
// "최신 main 반영" 조건을 스스로 충족시키는 보조 스크립트다.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const execute = promisify(execFile);

function hasFlag(name, argv = process.argv) { return argv.includes(`--${name}`); }
async function command(file, args, { cwd, optional = false } = {}) {
  try {
    const result = await execute(file, args, { cwd, encoding: "utf8", windowsHide: true, timeout: 60_000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
    return { ok: true, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  } catch (error) {
    if (optional) return { ok: false, stdout: String(error.stdout || "").trim(), stderr: String(error.stderr || error.message || "").trim() };
    throw error;
  }
}
const git = (args, options) => command("git", args, options);

export async function syncWithMain({ cwd = process.cwd(), push = false } = {}) {
  const root = (await git(["rev-parse", "--show-toplevel"], { cwd })).stdout;
  const dirty = await git(["status", "--porcelain"], { cwd: root });
  if (dirty.stdout) return { ok: false, merged: false, message: "미커밋 변경이 있어 동기화를 건너뜁니다. 먼저 커밋하거나 정리하세요." };
  const fetched = await git(["fetch", "--quiet", "origin", "+refs/heads/main:refs/remotes/origin/main"], { cwd: root, optional: true });
  if (!fetched.ok) return { ok: false, merged: false, message: `origin/main 조회 실패: ${fetched.stderr}` };
  const ancestor = await git(["merge-base", "--is-ancestor", "origin/main", "HEAD"], { cwd: root, optional: true });
  if (ancestor.ok) return { ok: true, merged: false, message: "이미 최신 origin/main을 포함하고 있습니다." };
  const branch = (await git(["symbolic-ref", "--short", "-q", "HEAD"], { cwd: root, optional: true })).stdout;
  if (!branch) return { ok: false, merged: false, message: "detached HEAD에서는 동기화할 수 없습니다." };
  const merge = await git(["merge", "--no-edit", "origin/main"], { cwd: root, optional: true });
  if (!merge.ok) {
    await git(["merge", "--abort"], { cwd: root, optional: true });
    const conflicts = await git(["diff", "--name-only", "--diff-filter=U", "HEAD", "origin/main"], { cwd: root, optional: true });
    const files = conflicts.stdout ? conflicts.stdout.split("\n").filter(Boolean) : [];
    return { ok: false, merged: false, message: `origin/main 병합 충돌로 중단했습니다. 수동으로 해결하세요.${files.length ? ` 충돌 후보 파일: ${files.join(", ")}` : ""}` };
  }
  if (!push) return { ok: true, merged: true, message: "origin/main을 병합했습니다. push는 별도로 하세요." };
  const pushed = await git(["push", "origin", `HEAD:${branch}`], { cwd: root, optional: true });
  if (!pushed.ok) return { ok: false, merged: true, message: `병합은 완료했지만 push에 실패했습니다: ${pushed.stderr}` };
  return { ok: true, merged: true, message: "origin/main을 병합하고 push했습니다." };
}

async function main() {
  const result = await syncWithMain({ push: hasFlag("push") });
  console.log(result.ok ? `[delivery-sync] PASS: ${result.message}` : `[delivery-sync] FAIL: ${result.message}`);
  if (!result.ok) process.exitCode = 1;
}
function isEntrypoint() { return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
if (isEntrypoint()) main().catch((error) => { console.error(`[delivery-sync] FAIL: ${error.message}`); process.exitCode = 1; });
