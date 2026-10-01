#!/usr/bin/env node
/**
 * session-state.mjs 파이프 테스트.
 *
 * 실행: node --test .claude/hooks/session-state.test.mjs
 * (npm run test:node 가 .claude/hooks/*.test.mjs 를 함께 돌린다)
 *
 * 훅은 fail-open 이라 "깨진 입력에 정말 0바이트인가", "압축 뒤 본문이 상한 안에서 다시
 * 들어오는가", "아무것도 쓰지 않는가"가 핵심이다. 프로젝트 루트는 매번 임시 디렉터리를 새로
 * 만들어 CLAUDE_PROJECT_DIR 로 넘긴다.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "session-state.mjs");
const SESSION_ID = "abcd1234-5678-90ef";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cd-session-state-"));

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} 실패: ${result.stderr}`);
}

/** 임시 프로젝트 루트. 상태 디렉터리는 기본으로 만들고, 필요하면 git 저장소로 만든다. */
let seq = 0;
function makeRoot({ withGit = false, withStateDir = true } = {}) {
  seq += 1;
  const root = path.join(tmpRoot, `p${seq}`);
  fs.mkdirSync(root, { recursive: true });
  if (withStateDir) fs.mkdirSync(path.join(root, ".claude", "state"), { recursive: true });
  if (withGit) {
    git(["-c", "init.defaultBranch=main", "init", "-q"], root);
    git(
      ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false",
        "commit", "-q", "--allow-empty", "-m", "첫 커밋"],
      root
    );
  }
  return root;
}

function stateFile(root, id = SESSION_ID.slice(0, 8)) {
  return path.join(root, ".claude", "state", `${id}.md`);
}

function startEvent(source, extra = {}) {
  return { hook_event_name: "SessionStart", source, session_id: SESSION_ID, ...extra };
}

/** 훅을 실제로 파이프로 돌린다. root 가 없으면 CLAUDE_PROJECT_DIR 를 뺀다. */
function runHook(root, payload) {
  const env = { ...process.env };
  if (root) env.CLAUDE_PROJECT_DIR = root;
  else delete env.CLAUDE_PROJECT_DIR;
  const result = spawnSync(process.execPath, [HOOK], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf-8",
    env,
  });
  return { status: result.status, stdout: result.stdout || "" };
}

function contextOf(stdout) {
  if (!stdout.trim()) return null;
  const parsed = JSON.parse(stdout);
  assert.equal(parsed?.hookSpecificOutput?.hookEventName, "SessionStart");
  return parsed.hookSpecificOutput.additionalContext ?? null;
}

// ─────────────────────────────────────────── 시작: 경로 안내

test("시작·재개·clear — 이 세션의 상태 파일 경로를 알려 준다", () => {
  const root = makeRoot();
  for (const source of ["startup", "resume", "clear"]) {
    const ctx = contextOf(runHook(root, startEvent(source)).stdout);
    assert.ok(ctx?.includes(stateFile(root)), `${source}: 경로가 없다 — ${ctx}`);
    assert.match(ctx, /아직 없음/);
  }

  fs.writeFileSync(stateFile(root), "# 목표\n- [ ] 1단계\n", "utf8");
  assert.match(contextOf(runHook(root, startEvent("resume")).stdout), /있음/);

  // 경로 문자는 버려진다 — 상태 디렉터리 밖을 가리킬 수 없다.
  const escaped = contextOf(runHook(root, startEvent("startup", { session_id: "../x/../yz" })).stdout);
  assert.ok(escaped.includes(stateFile(root, "xyz")), escaped);
});

test("시작 — 최근 미완료 다른 상태 파일은 최신 3개만, 끝난 것·오래된 것·내 것은 뺀다", () => {
  const root = makeRoot();
  const dir = path.dirname(stateFile(root));
  const now = Date.now() / 1000;
  const write = (name, text, ageSec) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, text, "utf8");
    fs.utimesSync(file, now - ageSec, now - ageSec);
  };
  write("abcd1234.md", "# 내 작업\n- [ ] 남음\n", 0);
  for (let i = 1; i <= 5; i += 1) write(`other${i}.md`, `# 작업 ${i}\n- [ ] 남음\n`, i * 60);
  write("done.md", "# 끝난 작업\n- [x] 끝\n", 30);
  write("old.md", "# 묵은 작업\n- [ ] 남음\n", 73 * 3600);

  const ctx = contextOf(runHook(root, startEvent("startup")).stdout);
  for (const name of ["other1.md", "other2.md", "other3.md"]) assert.ok(ctx.includes(name), `${name} 이 빠졌다`);
  for (const name of ["other4.md", "other5.md", "done.md", "old.md"]) assert.ok(!ctx.includes(name), `${name} 이 들어갔다`);
  assert.equal(ctx.split("abcd1234.md").length - 1, 1, "내 파일은 주 경로로 한 번만 나와야 한다");
  assert.match(ctx, /「작업 1」/);
});

// ─────────────────────────────────────────── 압축: 본문 재주입

test("압축 — 상태 파일 본문과 git 위치를 다시 넣는다", () => {
  const root = makeRoot({ withGit: true });
  fs.writeFileSync(stateFile(root), "# 목표\n요청 원문 보존\n- [ ] 2단계: 훅 등록\n", "utf8");
  const ctx = contextOf(runHook(root, startEvent("compact", { cwd: root })).stdout);
  assert.match(ctx, /정본/);
  assert.match(ctx, /요청 원문 보존/);
  assert.match(ctx, /2단계: 훅 등록/);
  assert.match(ctx, /branch: main/);
  assert.match(ctx, /log:\n[0-9a-f]+ 첫 커밋/);
});

test("압축 — 본문은 6,000자에서 자르고 나머지는 Read 하라고 적는다", () => {
  const root = makeRoot();
  fs.writeFileSync(stateFile(root), `${"가".repeat(7_000)}끝표시`, "utf8");
  const ctx = contextOf(runHook(root, startEvent("compact", { cwd: root })).stdout);
  assert.ok(!ctx.includes("끝표시"), "상한 뒤 본문이 들어갔다");
  assert.match(ctx, /Read/);
  assert.match(ctx, /전체 7003자/);
  assert.ok(ctx.length < 6_000 + 1_000, `주입이 ${ctx.length}자다 — 상한이 안 걸렸다`);
});

test("압축 — 상태 파일이 없으면 만들라고 안내한다", () => {
  const root = makeRoot();
  const ctx = contextOf(runHook(root, startEvent("compact", { cwd: root })).stdout);
  assert.match(ctx, /상태 파일 없음/);
  assert.ok(ctx.includes(stateFile(root)));
});

test("압축 — git status 는 20줄까지만 싣는다", () => {
  const root = makeRoot({ withGit: true, withStateDir: false });
  for (let i = 1; i <= 25; i += 1) fs.writeFileSync(path.join(root, `f${String(i).padStart(2, "0")}.txt`), "x");
  const ctx = contextOf(runHook(root, startEvent("compact", { cwd: root })).stdout);
  assert.equal(ctx.split("\n").filter((line) => line.startsWith("?? ")).length, 20);
  assert.match(ctx, /… 외 5줄/);
});

// ─────────────────────────────────────────── 부작용·fail-open

test("아무것도 쓰지 않는다 — 상태 디렉터리도 만들지 않는다", () => {
  const root = makeRoot({ withStateDir: false });
  for (const source of ["startup", "compact"]) runHook(root, startEvent(source, { cwd: root }));
  assert.equal(fs.existsSync(path.join(root, ".claude")), false);
});

test("입력이 깨지면 0바이트로 조용히 빠진다", () => {
  const root = makeRoot();
  const cases = [
    ["빈 입력", root, ""],
    ["JSON 아님", root, "not json"],
    ["다른 이벤트", root, { hook_event_name: "UserPromptSubmit", session_id: SESSION_ID }],
    ["모르는 source", root, startEvent("weird")],
    ["session_id 없음", root, { hook_event_name: "SessionStart", source: "startup" }],
    ["경로 문자뿐인 session_id", root, startEvent("startup", { session_id: "../.." })],
    ["CLAUDE_PROJECT_DIR 없음", null, startEvent("startup")],
  ];
  for (const [label, caseRoot, payload] of cases) {
    const { status, stdout } = runHook(caseRoot, payload);
    assert.equal(status, 0, `${label}: exit 0 이어야 한다`);
    assert.equal(stdout.length, 0, `${label}: 0바이트여야 하는데 ${stdout.length}바이트`);
  }
});

test.after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});
