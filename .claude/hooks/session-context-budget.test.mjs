#!/usr/bin/env node
/**
 * session-context-budget.mjs 파이프 테스트.
 *
 * 실행: node --test .claude/hooks/session-context-budget.test.mjs
 * (npm run test:node 가 .claude/hooks/*.test.mjs 를 함께 돌린다 — PR CI fast 잡)
 *
 * 이 훅은 fail-open 이라 "경고가 뜨는가"보다 **"안 떠야 할 때 정말 0바이트인가"** 가 중요하다.
 * 훅 자신이 매 프롬프트마다 토큰을 쓰면 최적화가 그대로 역전되기 때문이다. 그래서 임계
 * 미만 케이스는 stdout 길이를 0 으로 못박는다.
 *
 * 경계는 전수로 본다(원칙 10 의 취지 — 미분류를 통과시키지 않는다). 구간이 4개면
 * 경계도 4쌍 전부 단언한다.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK = path.join(HERE, "session-context-budget.mjs");

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "scb-"));

/** usage 를 가진 assistant 줄 하나를 만든다. */
function usageLine(total, extra = {}) {
  return JSON.stringify({
    type: "assistant",
    timestamp: "2026-08-24T00:00:00.000Z",
    message: {
      role: "assistant",
      model: "claude-opus-5",
      usage: {
        input_tokens: 10,
        cache_read_input_tokens: Math.max(0, total - 10),
        cache_creation_input_tokens: 0,
        output_tokens: 100,
      },
    },
    ...extra,
  });
}

/** 트랜스크립트 파일을 만들고 경로를 돌려준다. */
let seq = 0;
function writeTranscript(lines) {
  seq += 1;
  const file = path.join(tmpRoot, `t${seq}.jsonl`);
  fs.writeFileSync(file, lines.join("\n") + "\n", "utf-8");
  return file;
}

/** 훅을 실제로 파이프로 돌린다. */
function runHook(payload) {
  const result = spawnSync(process.execPath, [HOOK], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf-8",
  });
  return { status: result.status, stdout: result.stdout || "" };
}

/** stdout 에서 additionalContext 를 꺼낸다. 없으면 null. */
function contextOf(stdout) {
  if (!stdout.trim()) return null;
  return JSON.parse(stdout)?.hookSpecificOutput?.additionalContext ?? null;
}

function runWithTokens(total) {
  const transcript = writeTranscript([usageLine(total)]);
  return runHook({
    hook_event_name: "UserPromptSubmit",
    session_id: "test",
    transcript_path: transcript,
    cwd: process.cwd(),
    prompt: "무언가 해줘",
  });
}

// ─────────────────────────────────────────── 구간 경계 (전수)

test("임계 미만은 출력이 0바이트다 — 훅 자신이 토큰을 쓰면 안 된다", () => {
  for (const tokens of [0, 1_000, 50_000, 149_999]) {
    const { status, stdout } = runWithTokens(tokens);
    assert.equal(status, 0, `${tokens}: exit 0 이어야 한다`);
    assert.equal(stdout.length, 0, `${tokens}: stdout 이 0바이트여야 하는데 ${stdout.length}바이트`);
  }
});

test("150k 경계 — 150,000 부터 주의 문구가 뜬다", () => {
  assert.equal(runWithTokens(149_999).stdout.length, 0);

  const ctx = contextOf(runWithTokens(150_000).stdout);
  assert.ok(ctx, "150,000 에서는 문구가 있어야 한다");
  assert.match(ctx, /\/clear/);
  assert.match(ctx, /150k/);
});

test("200k 경계 — 인수인계 착수 지시로 승격된다", () => {
  const notice = contextOf(runWithTokens(199_999).stdout);
  assert.doesNotMatch(notice, /docs\/handoff/, "199,999 는 아직 주의 구간이다");

  const handoff = contextOf(runWithTokens(200_000).stdout);
  assert.match(handoff, /docs\/handoff/);
  assert.match(handoff, /원칙 12/);
  assert.match(handoff, /detail-sheet-copy-rewrite\.md/);
  assert.doesNotMatch(handoff, /새 작업 착수 금지/, "200k 는 아직 하드 구간이 아니다");
});

test("300k 경계 — 하드 구간은 새 작업 착수를 금지한다", () => {
  const handoff = contextOf(runWithTokens(299_999).stdout);
  assert.doesNotMatch(handoff, /새 작업 착수 금지/);

  const hard = contextOf(runWithTokens(300_000).stdout);
  assert.match(hard, /새 작업 착수 금지/);
  assert.match(hard, /docs\/handoff/);
});

test("모든 구간이 분류된다 — 미분류가 없다", () => {
  const buckets = new Map([
    ["silent", 0],
    ["notice", 0],
    ["handoff", 0],
    ["hard", 0],
  ]);
  for (const tokens of [50_000, 149_999, 150_000, 175_000, 199_999, 200_000, 250_000, 299_999, 300_000, 999_999]) {
    const ctx = contextOf(runWithTokens(tokens).stdout);
    let bucket;
    if (ctx === null) bucket = "silent";
    else if (/새 작업 착수 금지/.test(ctx)) bucket = "hard";
    else if (/docs\/handoff/.test(ctx)) bucket = "handoff";
    else if (/\/clear/.test(ctx)) bucket = "notice";
    else bucket = null;
    assert.ok(bucket, `${tokens} 토큰이 어느 구간에도 분류되지 않았다: ${ctx}`);
    buckets.set(bucket, buckets.get(bucket) + 1);
  }
  for (const [name, count] of buckets) {
    assert.ok(count > 0, `${name} 구간이 한 번도 안 나왔다 — 케이스 목록이 구간을 못 덮는다`);
  }
});

test("NOTICE 문구는 200자 미만이다 — 훅 자신이 토큰을 쓰면 최적화가 역전된다", () => {
  // 150k 는 대부분의 세션에서 뜬다. 0바이트 축만으로는 이 축이 안 지켜진다.
  const ctx = contextOf(runWithTokens(150_000).stdout);
  assert.ok(ctx, "150,000 에서는 문구가 있어야 한다");
  assert.ok(
    ctx.length < 200,
    `NOTICE 문구가 ${ctx.length}자다 — 자주 뜨는 구간이므로 200자 미만이어야 한다`
  );
});

// ─────────────────────────────────────────── 서브에이전트 줄

test("isSidechain 줄은 건너뛴다 — 서브에이전트가 메인 컨텍스트를 가리면 안 된다", () => {
  // 메인 세션은 900k 인데 그 뒤에 서브에이전트의 작은 usage 가 붙은 상황.
  const transcript = writeTranscript([
    usageLine(900_000),
    usageLine(40_000, { isSidechain: true }),
    usageLine(45_000, { isSidechain: true }),
  ]);
  const ctx = contextOf(
    runHook({ hook_event_name: "UserPromptSubmit", transcript_path: transcript }).stdout
  );
  assert.ok(ctx, "메인 세션 900k 가 잡혀야 한다");
  assert.match(ctx, /새 작업 착수 금지/, "서브에이전트 줄에 가려 경고가 죽었다");
});

test("가장 최근 메인 줄을 쓴다 — 오래된 큰 값이 아니라", () => {
  const transcript = writeTranscript([usageLine(900_000), usageLine(50_000)]);
  const { stdout } = runHook({
    hook_event_name: "UserPromptSubmit",
    transcript_path: transcript,
  });
  assert.equal(stdout.length, 0, "최신 줄이 50k 이므로 조용해야 한다");
});

// ─────────────────────────────────────────── 큰 줄 (꼬리 확장 경로)

test("한 줄이 256KB 를 넘어도 찾아낸다", () => {
  // 꼬리 256KB 안에 완전한 줄이 하나도 없도록 거대한 줄을 뒤에 둔다.
  const huge = JSON.stringify({
    type: "user",
    timestamp: "2026-08-24T00:00:00.000Z",
    message: { role: "user", content: "x".repeat(400 * 1024) },
  });
  const transcript = writeTranscript([usageLine(700_000), huge]);
  const ctx = contextOf(
    runHook({ hook_event_name: "UserPromptSubmit", transcript_path: transcript }).stdout
  );
  assert.ok(ctx, "확장 재시도로 usage 줄을 찾아야 한다");
  assert.match(ctx, /새 작업 착수 금지/);
});

// ─────────────────────────────────────────── fail-open (조용히 통과)

test("입력이 깨져도 턴을 깨지 않는다 — 조용히 exit 0", () => {
  const broken = [
    ["빈 입력", ""],
    ["JSON 아님", "not json at all"],
    ["transcript_path 없음", JSON.stringify({ hook_event_name: "UserPromptSubmit" })],
    [
      "없는 경로",
      JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        transcript_path: path.join(tmpRoot, "does-not-exist.jsonl"),
      }),
    ],
  ];
  for (const [label, payload] of broken) {
    const { status, stdout } = runHook(payload);
    assert.equal(status, 0, `${label}: exit 0 이어야 한다`);
    assert.equal(stdout.length, 0, `${label}: 조용해야 한다`);
  }
});

test("usage 가 없는 트랜스크립트는 조용히 통과한다", () => {
  const transcript = writeTranscript([
    JSON.stringify({ type: "user", message: { role: "user", content: "안녕" } }),
    JSON.stringify({ type: "summary", summary: "요약" }),
    "",
  ]);
  const { status, stdout } = runHook({
    hook_event_name: "UserPromptSubmit",
    transcript_path: transcript,
  });
  assert.equal(status, 0);
  assert.equal(stdout.length, 0);
});

test("빈 파일도 조용히 통과한다", () => {
  const transcript = writeTranscript([]);
  const { status, stdout } = runHook({
    hook_event_name: "UserPromptSubmit",
    transcript_path: transcript,
  });
  assert.equal(status, 0);
  assert.equal(stdout.length, 0);
});

// ─────────────────────────────────────────── 출력 형식

test("출력은 UserPromptSubmit additionalContext 봉투다", () => {
  const { stdout } = runWithTokens(500_000);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.equal(typeof parsed.hookSpecificOutput.additionalContext, "string");
});

test.after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});
