#!/usr/bin/env node
/**
 * guard-image-read.mjs 파이프 테스트.
 *
 * 실행: node --test .claude/hooks/guard-image-read.test.mjs
 * (npm run test:node 가 .claude/hooks/*.test.mjs 를 함께 돌린다 — PR CI fast 잡)
 *
 * 이 훅은 fail-closed 다. 그래서 "비싼 이미지를 막는가"만큼 **"막지 말아야 할 것을
 * 통과시키는가"** 를 함께 본다 — 텍스트 Read 마다 승인창이 뜨면 아무도 이 가드를 안 켠다.
 *
 * 경계는 픽셀로 정확히 만든다. 토큰 추정식이 `가로×세로/750` 이므로 치수를 역산해
 * 임계 바로 아래/위 두 장을 각각 렌더한다.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "guard-image-read.mjs");
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gir-"));

/** 지정한 치수의 단색 PNG 를 만든다(단색이라 파일은 작지만 치수는 진짜다). */
async function makeImage(name, width, height) {
  const file = path.join(tmpRoot, name);
  await sharp({
    create: { width, height, channels: 3, background: { r: 20, g: 20, b: 30 } },
  })
    .png()
    .toFile(file);
  return file;
}

function runHook(payload) {
  const result = spawnSync(process.execPath, [HOOK], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf-8",
  });
  return { status: result.status, stdout: result.stdout || "" };
}

/** 'PASS' | 'WARN' | 'ASK' 로 분류한다. */
function decisionOf(stdout) {
  if (!stdout.trim()) return "PASS";
  const out = JSON.parse(stdout).hookSpecificOutput;
  if (out.permissionDecision === "ask") return "ASK";
  if (out.additionalContext) return "WARN";
  return null;
}

function readOf(filePath) {
  return runHook({
    hook_event_name: "PreToolUse",
    tool_name: "Read",
    tool_input: { file_path: filePath },
  });
}

// ─────────────────────────────────────────── 막으면 안 되는 것

test("이미지가 아닌 Read 는 그냥 통과한다 — 0바이트", () => {
  for (const p of [
    "app/components/PaymentProcessingContext.tsx",
    "docs/handoff/detail-sheet-copy-rewrite.md",
    "package.json",
    "styles/mobile-lite.css",
    "index.html",
    "scripts/verify-guard-wiring.mjs",
  ]) {
    const { status, stdout } = readOf(p);
    assert.equal(status, 0, `${p}: exit 0`);
    assert.equal(stdout.length, 0, `${p}: 텍스트 Read 에 출력이 붙었다`);
  }
});

test("Read 가 아닌 도구는 건드리지 않는다", () => {
  for (const tool of ["Edit", "Write", "Bash", "Grep", "Glob"]) {
    const { stdout } = runHook({
      hook_event_name: "PreToolUse",
      tool_name: tool,
      tool_input: { file_path: "shot.png" },
    });
    assert.equal(stdout.length, 0, `${tool}: 건드리면 안 된다`);
  }
});

test("file_path 가 없으면 통과한다", () => {
  const { stdout } = runHook({
    hook_event_name: "PreToolUse",
    tool_name: "Read",
    tool_input: {},
  });
  assert.equal(stdout.length, 0);
});

test("없는 이미지 파일은 통과한다 — Read 가 알아서 실패한다", () => {
  const { status, stdout } = readOf(path.join(tmpRoot, "nope.png"));
  assert.equal(status, 0);
  assert.equal(stdout.length, 0);
});

test("작은 이미지는 통과한다", async () => {
  const file = await makeImage("tiny.png", 100, 100);
  assert.equal(decisionOf(readOf(file).stdout), "PASS");
});

// ─────────────────────────────────────────── 경계 (전수)

test("4,000 토큰 경계 — 안내가 붙기 시작한다", async () => {
  // 2000x1499 = 2,998,000px -> 3,997 토큰 (임계 미만)
  const below = await makeImage("below-warn.png", 2000, 1499);
  assert.equal(decisionOf(readOf(below).stdout), "PASS");

  // 2000x1500 = 3,000,000px -> 4,000 토큰 (임계)
  const at = await makeImage("at-warn.png", 2000, 1500);
  const { stdout } = readOf(at);
  assert.equal(decisionOf(stdout), "WARN");
  const ctx = JSON.parse(stdout).hookSpecificOutput.additionalContext;
  assert.match(ctx, /visual-checker/);
  assert.match(ctx, /shrink-shot\.mjs/);
  assert.match(ctx, /2000x1500/);
});

test("15,000 토큰 경계 — 승인창으로 승격된다", async () => {
  // 3749x3000 = 11,247,000px -> 14,996 토큰 (임계 미만)
  const below = await makeImage("below-ask.png", 3749, 3000);
  assert.equal(decisionOf(readOf(below).stdout), "WARN");

  // 3750x3000 = 11,250,000px -> 15,000 토큰 (임계)
  const at = await makeImage("at-ask.png", 3750, 3000);
  const { stdout } = readOf(at);
  assert.equal(decisionOf(stdout), "ASK");
  const reason = JSON.parse(stdout).hookSpecificOutput.permissionDecisionReason;
  assert.match(reason, /visual-checker/);
  assert.match(reason, /모든 후속 요청/);
});

test("실측된 전체페이지 샷 치수는 승인창을 띄운다", async () => {
  // 실제로 컨텍스트를 태운 그 이미지 — 1440x15019 = 약 28,836 토큰.
  const file = await makeImage("desktop-full.png", 1440, 15019);
  const { stdout } = readOf(file);
  assert.equal(decisionOf(stdout), "ASK");
  assert.match(JSON.parse(stdout).hookSpecificOutput.permissionDecisionReason, /28,836/);
});

test("모든 확장자가 분류된다 — 미분류가 없다", async () => {
  const seen = new Set();
  for (const [name, w, h] of [
    ["a.png", 100, 100],
    ["b.png", 2000, 1500],
    ["c.png", 3750, 3000],
  ]) {
    const file = await makeImage(name, w, h);
    const d = decisionOf(readOf(file).stdout);
    assert.ok(d, `${name}: 분류되지 않았다`);
    seen.add(d);
  }
  assert.deepEqual([...seen].sort(), ["ASK", "PASS", "WARN"], "세 판정이 모두 나와야 한다");
});

// ─────────────────────────────────────────── fail-closed

test("입력이 깨지면 통과가 아니라 ask 로 간다", () => {
  for (const [label, payload] of [
    ["빈 입력", ""],
    ["JSON 아님", "not json"],
  ]) {
    const { status, stdout } = runHook(payload);
    assert.equal(status, 0, `${label}: 턴은 깨지 않는다`);
    assert.equal(decisionOf(stdout), "ASK", `${label}: fail-closed 여야 한다`);
  }
});

test("이미지인데 크기를 못 재면 ask 로 간다", () => {
  // 확장자는 png 인데 내용이 이미지가 아니다 — sharp 도 실패한다.
  // 이때는 바이트 폴백이 받는다. 폴백조차 못 하는 경우(=stat 실패)는 위의 '없는 파일'이 덮는다.
  const file = path.join(tmpRoot, "not-really.png");
  fs.writeFileSync(file, "이건 PNG 가 아니다", "utf-8");
  const d = decisionOf(readOf(file).stdout);
  // 아주 작은 파일이므로 바이트 폴백은 PASS 로 본다 — 그게 맞다(작은 것은 비싸지 않다).
  assert.equal(d, "PASS");

  // 반대로 큰 바이너리는 치수를 못 재도 비싸다고 보고 막아야 한다.
  const big = path.join(tmpRoot, "big-blob.png");
  fs.writeFileSync(big, Buffer.alloc(5 * 1024 * 1024, 7));
  assert.equal(decisionOf(readOf(big).stdout), "ASK", "바이트 폴백이 큰 파일을 막아야 한다");
});

test.after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});
