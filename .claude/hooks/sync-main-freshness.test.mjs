#!/usr/bin/env node
/**
 * sync-main-freshness.mjs 실행 테스트.
 *
 * 실행: node --test .claude/hooks/sync-main-freshness.test.mjs (npm run test:node 가 글롭으로 잡는다)
 *
 * 소스 단언이 아니라 **임시 저장소(bare 원격 + 클론)를 만들어 훅을 실제로 파이프에 물린다.**
 * 훅 자체는 fail-open 이므로(원칙 10 예외 — 헤더 참조), 원칙 10 의 취지는 여기서 지킨다:
 * "당겨지는가"만큼 **"건드리면 안 될 때 정말로 안 건드리는가"**를 4종 전부 본다.
 * 그 4종이 죽으면 증상이 "그냥 잘 됨"이라 아무도 모르고, 다음 사고는 남의 미커밋 변경이
 * 사라지는 형태로 온다.
 *
 * 🔴 **침묵도 단언 대상이다.** 안내는 대규모 변경(LARGE_CHANGE_FILES)에서만 나가야 한다 —
 *    임계가 밀리면 증상이 "안내가 좀 자주 뜸"이라 회귀로 안 보이는데, 그게 정확히 이 훅을
 *    다시 고치게 만든 문제다. 그래서 경계 199/200 을 실제 파일 수로 만들어 양쪽을 본다.
 */

import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOK = join(HERE, "sync-main-freshness.mjs");

/**
 * 임계는 훅 소스에서 읽어 온다 — 여기에 200을 손으로 적으면 둘이 조용히 갈라진다.
 * (훅은 실행 스크립트라 import 하면 main() 이 돈다. 그래서 소스에서 뽑는다.)
 */
const LARGE_CHANGE_FILES = Number(
  /const LARGE_CHANGE_FILES = (\d+);/.exec(readFileSync(HOOK, "utf8"))?.[1]
);
assert.ok(
  Number.isInteger(LARGE_CHANGE_FILES) && LARGE_CHANGE_FILES > 1,
  "훅에서 LARGE_CHANGE_FILES 를 못 읽었다 — 임계 테스트가 통째로 무효다"
);
/** 임계를 넉넉히 넘는 규모. */
const LARGE = LARGE_CHANGE_FILES + 5;

const fixtures = [];

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return String(result.stdout ?? "").trim();
}

function hasRef(work, ref) {
  return spawnSync("git", ["rev-parse", "--verify", "--quiet", ref], { cwd: work }).status === 0;
}

function behindCount(work) {
  return Number(git(["rev-list", "--count", "main..origin/main"], work));
}

/**
 * 로컬 main 이 origin/main 보다 2 커밋 · `files` 개 파일 뒤처진 저장소를 만든다.
 * 원격 추적 참조와 FETCH_HEAD 는 지워 둬서, 훅이 **실제로 fetch 해야만** 뒤처짐을 알 수 있게 한다.
 *
 * 🔴 `files` 를 픽스처가 진짜로 만든다 — 임계를 테스트용 env 노브로 빼지 않고 **훅에 박힌
 *    상수를 그대로 시험**하기 위해서다. 임계가 바뀌면 이 테스트가 먼저 실패해야 한다.
 */
function buildFixture({ files = 2 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cd-main-sync-"));
  fixtures.push(dir);
  const remote = join(dir, "remote.git");
  const work = join(dir, "work");

  git(["init", "-q", "--bare", "-b", "main", remote], dir);
  mkdirSync(work, { recursive: true });
  git(["init", "-q", "-b", "main"], work);
  git(["config", "user.email", "t@t"], work);
  git(["config", "user.name", "t"], work);
  git(["config", "commit.gpgsign", "false"], work);

  writeFileSync(join(work, "base.txt"), "base\n");
  git(["add", "-A"], work);
  git(["commit", "-qm", "base"], work);
  git(["remote", "add", "origin", remote], work);
  git(["push", "-q", "-u", "origin", "main"], work);
  const base = git(["rev-parse", "HEAD"], work);

  // 커밋 2개로 나누되, 두 커밋이 건드리는 파일 수의 합이 정확히 `files` 가 되게 한다.
  writeFileSync(join(work, "ahead-1.txt"), "1\n");
  git(["add", "-A"], work);
  git(["commit", "-qm", "ahead 1"], work);
  for (let n = 2; n <= files; n += 1) {
    writeFileSync(join(work, `ahead-${n}.txt`), `${n}\n`);
  }
  git(["add", "-A"], work);
  git(["commit", "-qm", `ahead 2 (${files - 1} files)`], work);
  git(["push", "-q", "origin", "main"], work);
  const tip = git(["rev-parse", "HEAD"], work);

  git(["reset", "-q", "--hard", base], work);
  return { dir, remote, work, base, tip };
}

/** 원격 추적 참조와 fetch 스탬프를 지워, 훅이 fetch 를 실제로 돌아야만 하는 상태로 만든다. */
function forgetRemoteState(work) {
  if (hasRef(work, "refs/remotes/origin/main")) {
    git(["update-ref", "-d", "refs/remotes/origin/main"], work);
  }
  rmSync(join(work, ".git", "FETCH_HEAD"), { force: true });
}

function runHook(root, { event = "SessionStart", cwd = root } = {}) {
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: event, source: "startup", cwd }),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  });
  const stdout = String(result.stdout ?? "");
  return {
    status: result.status,
    stdout,
    context: stdout ? JSON.parse(stdout)?.hookSpecificOutput?.additionalContext ?? null : null,
  };
}

after(() => {
  for (const dir of fixtures) {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    } catch {
      // 윈도우에서 git 팩 파일이 읽기전용이라 실패할 수 있다 — 테스트 결과와 무관하다.
    }
  }
});

test("대규모 변경이면 fast-forward 하고 규모를 알린다 — fetch 부터 실제로 돈다", () => {
  const { work, tip } = buildFixture({ files: LARGE });
  forgetRemoteState(work);

  const out = runHook(work);

  assert.equal(out.status, 0);
  assert.match(out.context ?? "", new RegExp(`2 커밋 / ${LARGE} 파일 fast-forward`));
  assert.equal(git(["rev-parse", "HEAD"], work), tip, "로컬 main 이 origin/main 까지 안 왔다");
  assert.equal(behindCount(work), 0);
});

test("🔴 소규모 변경이면 fast-forward 는 하되 출력이 0바이트다", () => {
  const { work, tip } = buildFixture({ files: 2 });
  forgetRemoteState(work);

  const out = runHook(work);

  assert.equal(out.stdout, "", "🔴 소규모인데 안내가 나갔다 — 이게 사용자가 없애라고 한 소음이다");
  assert.equal(git(["rev-parse", "HEAD"], work), tip, "소규모라도 fast-forward 자체는 해야 한다");
  assert.equal(behindCount(work), 0);
});

test("🔴 임계 경계 — 199파일은 침묵하고 200파일은 알린다", () => {
  const quiet = buildFixture({ files: LARGE_CHANGE_FILES - 1 });
  forgetRemoteState(quiet.work);
  assert.equal(
    runHook(quiet.work).stdout,
    "",
    `🔴 ${LARGE_CHANGE_FILES - 1} 파일인데 안내가 나갔다 — 임계가 밀렸다`
  );

  const loud = buildFixture({ files: LARGE_CHANGE_FILES });
  forgetRemoteState(loud.work);
  assert.match(
    runHook(loud.work).context ?? "",
    new RegExp(`${LARGE_CHANGE_FILES} 파일`),
    `🔴 정확히 ${LARGE_CHANGE_FILES} 파일인데 침묵했다 — 임계가 배타적으로 밀렸다`
  );
});

test("미커밋 변경이 있으면 손대지 않고 사유만 알린다", () => {
  const { work, base } = buildFixture({ files: LARGE });
  forgetRemoteState(work);
  writeFileSync(join(work, "base.txt"), "남의 작업 중\n");

  const out = runHook(work);

  assert.match(out.context ?? "", /미커밋 변경/);
  assert.match(out.context ?? "", new RegExp(`2 커밋 / ${LARGE} 파일 뒤처졌`));
  assert.equal(git(["rev-parse", "HEAD"], work), base, "🔴 미커밋 변경이 있는데 HEAD 를 움직였다");
  assert.equal(behindCount(work), 2);
});

test("🔴 소규모인 채로 ff 가 막히면 아무 말도 하지 않는다", () => {
  const { work, base } = buildFixture({ files: 2 });
  forgetRemoteState(work);
  writeFileSync(join(work, "base.txt"), "남의 작업 중\n");

  const out = runHook(work);

  assert.equal(out.stdout, "", "🔴 소규모 차단인데 안내가 나갔다");
  assert.equal(git(["rev-parse", "HEAD"], work), base);
  assert.equal(behindCount(work), 2);
});

test("추적되지 않는 파일도 미커밋 변경으로 본다", () => {
  const { work, base } = buildFixture({ files: LARGE });
  forgetRemoteState(work);
  writeFileSync(join(work, "scratch.log"), "임시 산출물\n");

  const out = runHook(work);

  assert.match(out.context ?? "", /미커밋 변경/);
  assert.equal(git(["rev-parse", "HEAD"], work), base);
});

test("HEAD 가 다른 브랜치면 손대지 않는다", () => {
  const { work } = buildFixture({ files: LARGE });
  forgetRemoteState(work);
  git(["checkout", "-q", "-b", "feature/x"], work);
  const head = git(["rev-parse", "HEAD"], work);

  const out = runHook(work);

  assert.match(out.context ?? "", /HEAD 가 `feature\/x`/);
  assert.equal(git(["rev-parse", "HEAD"], work), head);
  assert.equal(behindCount(work), 2);
});

test("워크트리 세션에서는 루트 체크아웃을 건드리지 않는다", () => {
  const { dir, work, base } = buildFixture({ files: LARGE });
  const wt = join(dir, "wt");
  git(["worktree", "add", "-q", "-b", "worktree-x", wt], work);
  forgetRemoteState(work);

  const out = runHook(work, { cwd: wt });

  assert.match(out.context ?? "", /격리 워크트리/);
  assert.equal(git(["rev-parse", "HEAD"], work), base, "🔴 워크트리 세션이 루트 HEAD 를 움직였다");
  assert.equal(behindCount(work), 2, "fetch 는 돌아야 뒤처짐을 셀 수 있다");
});

test("최신이면 출력이 0바이트다 — 훅 자신이 토큰을 쓰면 안 된다", () => {
  const { work, tip } = buildFixture();
  git(["reset", "-q", "--hard", tip], work);

  const out = runHook(work);

  assert.equal(out.stdout, "");
  assert.equal(out.status, 0);
  assert.ok(hasRef(work, "refs/remotes/origin/main"), "origin/main 이 없으면 다른 이유로 조용한 것이다");
});

test("원격이 죽어 있어도 세션을 막지 않는다", () => {
  const { dir, work, base } = buildFixture();
  git(["remote", "set-url", "origin", join(dir, "없는-원격.git")], work);
  forgetRemoteState(work);

  const out = runHook(work);

  assert.equal(out.status, 0);
  assert.equal(out.stdout, "");
  assert.equal(git(["rev-parse", "HEAD"], work), base);
});

test("쿨다운 안이면 fetch 하지 않는다", () => {
  const { work } = buildFixture();
  forgetRemoteState(work);
  writeFileSync(join(work, ".git", "FETCH_HEAD"), "");
  const stampBefore = statSync(join(work, ".git", "FETCH_HEAD")).mtimeMs;

  const out = runHook(work);

  assert.equal(out.stdout, "");
  assert.equal(
    hasRef(work, "refs/remotes/origin/main"),
    false,
    "🔴 쿨다운 안인데 fetch 가 돌았다"
  );
  assert.equal(statSync(join(work, ".git", "FETCH_HEAD")).mtimeMs, stampBefore);
});

test("PreToolUse 는 fetch 만 하고 0바이트로 빠진다", () => {
  const { work, base } = buildFixture();
  forgetRemoteState(work);

  const out = runHook(work, { event: "PreToolUse" });

  assert.equal(out.status, 0);
  assert.equal(out.stdout, "", "🔴 PreToolUse 에서 출력을 내면 권한 흐름에 끼어든다");
  assert.ok(hasRef(work, "refs/remotes/origin/main"), "PreToolUse 가 fetch 를 안 돌렸다");
  assert.equal(git(["rev-parse", "HEAD"], work), base, "PreToolUse 는 ff 하지 않는다");
});

test("모르는 이벤트에는 아무것도 하지 않는다", () => {
  const { work } = buildFixture();
  forgetRemoteState(work);

  const out = runHook(work, { event: "PostToolUse" });

  assert.equal(out.status, 0);
  assert.equal(out.stdout, "");
  assert.equal(hasRef(work, "refs/remotes/origin/main"), false, "모르는 이벤트인데 fetch 가 돌았다");
});

test("stdin 이 깨져도 세션을 막지 않는다", () => {
  const result = spawnSync(process.execPath, [HOOK], {
    input: "not json",
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: HERE },
  });
  assert.equal(result.status, 0);
  assert.equal(String(result.stdout ?? ""), "");
});

test("CLAUDE_PROJECT_DIR 이 없으면 조용히 빠진다", () => {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  const result = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: "SessionStart", cwd: HERE }),
    encoding: "utf8",
    env,
  });
  assert.equal(result.status, 0);
  assert.equal(String(result.stdout ?? ""), "");
});

test("훅 파일에 배선된 이벤트가 settings.json 과 어긋나지 않는다", () => {
  const settings = JSON.parse(readFileSync(join(HERE, "..", "settings.json"), "utf8"));
  const wired = [];
  for (const [eventName, blocks] of Object.entries(settings.hooks ?? {})) {
    for (const block of blocks) {
      for (const hook of block.hooks ?? []) {
        if (String(hook.command ?? "").includes("sync-main-freshness.mjs")) {
          wired.push({ eventName, matcher: block.matcher });
        }
      }
    }
  }
  assert.deepEqual(
    wired.map((w) => w.eventName).sort(),
    ["PreToolUse", "SessionStart"],
    "훅이 두 이벤트에 배선돼 있어야 한다 — 배선이 빠지면 훅은 조용히 안 돈다"
  );
  const preToolUse = wired.find((w) => w.eventName === "PreToolUse");
  assert.match(
    preToolUse.matcher ?? "",
    /EnterWorktree/,
    "PreToolUse matcher 가 EnterWorktree 를 잡지 않는다"
  );
});
