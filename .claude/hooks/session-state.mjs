#!/usr/bin/env node
/**
 * SessionStart 훅 — 세션 상태 파일로 자동 압축을 건너 작업 기억을 잇는다.
 *
 * 왜 (2026-10-01 사용자 요청): "인수 인계 방식으로 하니까 너무 작업이 느린데 그냥 한 세션에서
 * 계속 자동 압축하면서 한번에 끝까지 작업하도록". 작업을 세션마다 끊으면 인수인계 문서 작성 →
 * /clear → 붙여넣기 → 재독·재검증에 매번 사람이 끼어든다. 자동 압축은 이미 켜져 있다
 * (사용자 설정 autoCompactWindow 200k → 약 187k 에서 발동. 실측 6회: 168k → 8~15k, 회당 62~106초).
 * 압축이 잃는 것은 요약에서 빠지는 세부(실측 수치·실패한 시도·경로)다. 이 훅은 그 공백을
 * 사람 대신 파일로 메운다.
 *
 *   startup·resume·clear → 이 세션의 상태 파일 경로를 알려 준다(파일은 모델이 쓴다).
 *                          최근 72시간 안의 미완료(`- [ ]` 가 남은) 다른 상태 파일도 최대 3개.
 *   compact             → 상태 파일 본문(6,000자 상한)과 git 위치를 다시 넣는다.
 *
 * 경로는 `<프로젝트>/.claude/state/<session_id 앞 8자>.md` 이고 .gitignore 대상이다. 세션마다
 * 따로라 동시 세션끼리 섞이지 않는다. 압축은 session_id 를 바꾸지 않으므로 같은 파일을 다시 찾는다.
 *
 * 🔴 부작용이 없다 — 파일·디렉터리를 만들거나 고치지 않는다. git 도 조회만 하고,
 *    `--no-optional-locks` 로 index.lock 을 잡지 않는다(공유 체크아웃의 옆 세션 git 과 충돌 방지).
 * 🔴 정확성 가드가 아니라 기억 보조라 fail-open 이다(원칙 10 예외 — session-context-budget 과 같은
 *    이유). 입력이 깨지면 0바이트로 exit 0, git 이 실패하면 그 단락만 뺀다. 원칙 10 의 취지는
 *    session-state.test.mjs 가 지킨다.
 *
 * 손으로 확인:
 *   echo '{"hook_event_name":"SessionStart","source":"compact","session_id":"abcd1234-x","cwd":"<repo>"}' \
 *     | CLAUDE_PROJECT_DIR=<repo> node .claude/hooks/session-state.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/** 압축 뒤 다시 넣는 본문 상한(자). 넘으면 자르고 Read 하라고 적는다. */
const BODY_LIMIT = 6_000;
/** 시작 때 알려 줄 다른 상태 파일 — 최근 이 시간 안에 고친 것, 최대 이 개수. */
const RECENT_MS = 72 * 60 * 60 * 1000;
const RECENT_MAX = 3;
/** git status 줄 상한. 공유 체크아웃은 옆 세션의 미커밋 파일로 길어진다. */
const STATUS_MAX = 20;
const GIT_TIMEOUT_MS = 3_000;

const START_SOURCES = new Set(["startup", "resume", "clear"]);

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

/** git 을 돌려 stdout 을 돌려준다. 실패·타임아웃은 null. 앞 공백은 status 형식이라 남긴다. */
function git(args, cwd) {
  const result = spawnSync("git", ["--no-optional-locks", ...args], {
    cwd,
    encoding: "utf8",
    timeout: GIT_TIMEOUT_MS,
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  return String(result.stdout ?? "").trimEnd();
}

/** session_id 앞 8자. 경로 문자는 버린다 — 상태 디렉터리 밖으로 나갈 수 없게. */
function stateIdOf(sessionId) {
  const id = String(sessionId ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 8);
  return id || null;
}

function readText(file) {
  try {
    const text = fs.readFileSync(file, "utf8");
    return text.trim() ? text : null;
  } catch {
    return null;
  }
}

/** 미완료 = 체크리스트에 안 끝난 칸(`- [ ]`)이 남아 있다. */
function isUnfinished(text) {
  return /^\s*[-*] \[ \]/m.test(text);
}

function titleOf(text) {
  const first = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  return first.replace(/^#+\s*/, "").trim().slice(0, 40);
}

/** 최근 72시간 안의 미완료 상태 파일(내 것 제외), 최신순 최대 3개. */
function recentOthers(dir, ownFile) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const now = Date.now();
  const found = [];
  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    const file = path.join(dir, name);
    if (file === ownFile) continue;
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile() || now - stat.mtimeMs > RECENT_MS) continue;
      const text = fs.readFileSync(file, "utf8");
      if (!isUnfinished(text)) continue;
      found.push({ file, mtimeMs: stat.mtimeMs, title: titleOf(text) });
    } catch {
      // 읽는 사이 사라진 파일은 건너뛴다.
    }
  }
  return found.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, RECENT_MAX);
}

function startMessage(file, exists, others) {
  const lines = [
    `📝 세션 상태 파일: ${file} (${exists ? "있음 — 이어서 갱신" : "아직 없음"}). 여러 단계 작업이면 만들어서 목표·요청 원문·체크리스트(- [ ])·실측·실패한 시도를 적고 단계마다 갱신하라. 자동 압축 뒤 이 파일이 다시 주입된다.`,
  ];
  if (others.length) {
    const list = others.map((o) => `${o.file}「${o.title}」`).join(" · ");
    lines.push(`최근 미완료 상태 파일(다른 세션 것일 수 있다 — 사용자가 이어 하라고 할 때만 읽는다): ${list}`);
  }
  return lines.join("\n");
}

/** 압축 뒤 위치 확인용 git 요약. git 저장소가 아니거나 git 이 실패하면 null. */
function gitSnapshot(cwd) {
  const branch = git(["branch", "--show-current"], cwd);
  if (branch === null) return null;
  const lines = [`── git (${cwd})`, `branch: ${branch || "(detached HEAD)"}`];
  const status = git(["status", "--short"], cwd);
  if (status !== null) {
    const rows = status ? status.split("\n") : [];
    lines.push(rows.length ? "status:" : "status: clean");
    lines.push(...rows.slice(0, STATUS_MAX));
    if (rows.length > STATUS_MAX) lines.push(`… 외 ${rows.length - STATUS_MAX}줄`);
  }
  const log = git(["log", "--oneline", "-5"], cwd);
  if (log) lines.push("log:", log);
  return lines.join("\n");
}

function compactMessage(file, body, cwd) {
  const parts = [
    "🔁 자동 압축 뒤 복원 — 요약과 다르면 이 상태 파일과 git 이 정본이다. 수치·경로는 기억 말고 파일과 코드로 다시 확인하라.",
  ];
  if (body == null) {
    parts.push(`상태 파일 없음: ${file} — 여러 단계 작업이면 지금 만들어라.`);
  } else if (body.length > BODY_LIMIT) {
    parts.push(`── 상태 파일 ${file} (앞 ${BODY_LIMIT}자 / 전체 ${body.length}자 — 나머지는 Read 로 읽어라)`);
    parts.push(body.slice(0, BODY_LIMIT));
  } else {
    parts.push(`── 상태 파일 ${file}`);
    parts.push(body.trimEnd());
  }
  const snapshot = gitSnapshot(cwd);
  if (snapshot) parts.push(snapshot);
  return parts.join("\n");
}

async function main() {
  let event;
  try {
    event = JSON.parse(await readStdin());
  } catch {
    process.exit(0);
  }

  if (event?.hook_event_name !== "SessionStart") process.exit(0);
  const source = event?.source;
  if (source !== "compact" && !START_SOURCES.has(source)) process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR;
  if (!root || !fs.existsSync(root)) process.exit(0);

  const id = stateIdOf(event?.session_id);
  if (!id) process.exit(0);

  const file = path.join(root, ".claude", "state", `${id}.md`);
  const body = readText(file);

  let message;
  if (source === "compact") {
    const cwd = event?.cwd && fs.existsSync(event.cwd) ? event.cwd : root;
    message = compactMessage(file, body, cwd);
  } else {
    message = startMessage(file, body != null, recentOthers(path.dirname(file), file));
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: message,
      },
    })
  );
  process.exit(0);
}

main().catch(() => process.exit(0));
