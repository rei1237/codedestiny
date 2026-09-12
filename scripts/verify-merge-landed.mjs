#!/usr/bin/env node

/**
 * main 에 올린 작업이 정말로 배포까지 도달했는지 확인한다.
 *
 * 이 저장소에는 "커밋은 올라갔는데 그 변경이 라이브에 없고, 아무도 그 사실을 모르는" 경로가
 * 있었다. 둘 다 실패했다는 신호를 남기지 않는다는 점이 같다.
 *
 *   ① 릴리스 런 취소 — concurrency 그룹당 실행 1 + 대기 1 만 유지되므로, 연속 push 시
 *      대기 런이 취소된다. 취소된 런은 잡이 시작조차 안 하고, GitHub 은 실패와 달리
 *      취소에는 메일을 보내지 않는다. 최근 60런 중 8건이 그랬다.
 *   ② 드리프트 — 라이브 SHA 와 main HEAD 를 비교하는 장치가 없었다.
 *
 * 그래서 이 스크립트는 판정만 하고, 결과를 **하나의 GitHub 이슈**로 모은다. 사람이 봐야 할
 * 곳을 한 곳으로 만드는 것이 목적이다.
 *
 * 🔴 "모른다"를 critical 로 올리지 않는다. GitHub API 장애 한 번이 거짓 경보를 울리면 다음엔
 * 진짜 경보도 무시당한다. 그러면 이 스크립트는 자기가 고치려던 문제가 된다.
 *
 * 🔴 2026-09-12: 좌초 PR·충돌 PR·PR 자동 최신화 세 축을 제거했다. 이 레포는 PR 을 쓰지 않고
 * main 에 직접 커밋하므로 "머지된 PR 의 커밋이 main 의 조상인가" 라는 질문 자체가 성립하지
 * 않는다(커밋이 곧 main 이다). 남은 두 축은 PR 과 무관하게 "올린 것이 라이브에 있는가" 만
 * 묻는다. 지운 축의 판정 규칙은 git 이력(스택 PR 좌초·부모 흡수·내용 대조)에 남아 있다.
 *
 * 실행:
 *   node scripts/verify-merge-landed.mjs                     # 판정만, 쓰기 없음
 *   node scripts/verify-merge-landed.mjs --check=drift --json # 릴리스 워크플로의 드리프트 게이트
 *   node scripts/verify-merge-landed.mjs --report            # 이슈까지 갱신
 *   node scripts/verify-merge-landed.mjs --dry-run           # 본문만 출력하고 아무것도 쓰지 않음
 *   node scripts/verify-merge-landed.mjs --self-test
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readProductionShas, shaMatches } from "./verify-deployed-sha.mjs";

const DEFAULT_BASE_REF = "origin/main";
const DEFAULT_ORIGIN = "https://code-destiny.com";

/** 릴리스 자체가 ~10분 걸린다. 그보다 짧게 잡으면 정상 배포 중을 드리프트로 읽는다. */
const DRIFT_GRACE_MS = 20 * 60_000;

const ISSUE_TITLE = "🚧 착지 감시: main 에 올린 작업이 라이브에 도달하지 못했습니다";
const ISSUE_MARKER = "<!-- cd-landing-watchdog -->";
const STATE_MARKER = "cd-landing-watchdog:state";

const SEVERITY_RANK = { ok: 0, info: 1, critical: 2 };

// ---------------------------------------------------------------------------
// 순수 판정 — 여기 있는 것만 self-test 대상이다. git 도 네트워크도 만지지 않는다.
// ---------------------------------------------------------------------------

/**
 * main HEAD 를 배포하는 릴리스 런이 **지금 돌고 있는가**.
 *
 * 🔴 이 축이 없으면 시간 유예가 자기 목적을 배신한다. 유예는 "정상적으로 배포 중인 것을
 * 드리프트로 부르지 않기" 위한 것인데, push 가 잦으면 모든 주기가 유예 안에서 깨어나
 * 영영 배포하지 않는다(2026-08-22 실측).
 *
 * 🔴 자기 자신을 세지 않는다. 이 판정을 부르는 스케줄 런의 headSha 는 곧 main HEAD 이고
 * 상태는 in_progress 라, 빼지 않으면 **언제나** "배포 중"이 되어 고치려던 버그를 재현한다.
 */
export function releaseInFlight(input) {
  const { mainSha, runs = null, currentRunId = "" } = input || {};
  if (!Array.isArray(runs)) return null;
  const self = String(currentRunId || "");
  return runs.some((run) => (
    shaMatches(mainSha, run?.headSha)
    && String(run?.databaseId ?? "") !== self
    && run?.status !== "completed"
  ));
}

/** 라이브 Pages·Worker 가 main HEAD 와 같은 커밋인가. */
export function driftVerdict(input) {
  const {
    mainSha,
    mainCommittedAtMs = 0,
    pages,
    worker,
    now = 0,
    graceMs = DRIFT_GRACE_MS,
    inFlight = null,
  } = input || {};
  const rows = [];

  const check = (label, layer) => {
    if (!layer || layer.skipped) {
      rows.push({ layer: label, sha: "생략", ok: true });
      return true;
    }
    if (layer.error || !layer.sha) {
      rows.push({ layer: label, sha: `조회 실패 (${layer.error || "빈 응답"})`, ok: null });
      return null;
    }
    const ok = shaMatches(mainSha, layer.sha);
    rows.push({ layer: label, sha: String(layer.sha).slice(0, 12), ok });
    return ok;
  };

  const pagesOk = check("Pages", pages);
  const workerOk = check("Worker", worker);

  if (pagesOk === null || workerOk === null) return { state: "unknown", severity: "info", rows };
  if (pagesOk && workerOk) return { state: "in-sync", severity: "ok", rows };
  // 런 상태를 아는 쪽이 언제나 정확하다. 시간 유예는 그것을 못 읽었을 때의 폴백이다.
  if (inFlight === true) return { state: "deploying", severity: "ok", rows };
  if (inFlight === false) return { state: "drifted", severity: "critical", rows };
  if (now - mainCommittedAtMs < graceMs) return { state: "deploying", severity: "ok", rows };
  return { state: "drifted", severity: "critical", rows };
}

/**
 * main HEAD 를 실제로 배포한 릴리스 런이 있었는가.
 *
 * 드리프트 유예가 끝나기 전에도 "취소된 런" 을 직접 잡기 위한 축이다. 성공을 먼저 보는 이유는
 * 취소된 런 뒤에 같은 SHA 로 성공한 런(=스케줄 수렴)이 있으면 그것이 답이기 때문이다.
 */
export function releaseRunVerdict(input) {
  const { mainSha, mainCommittedAtMs = 0, runs = [], now = 0, graceMs = DRIFT_GRACE_MS } = input || {};
  const mine = runs.filter((run) => shaMatches(mainSha, run?.headSha));

  if (mine.some((run) => run.conclusion === "success")) {
    return { state: "success", severity: "ok", detail: "main HEAD 를 배포한 릴리스가 성공했습니다." };
  }
  if (mine.some((run) => run.status && run.status !== "completed")) {
    return { state: "running", severity: "ok", detail: "릴리스가 아직 진행 중입니다." };
  }
  if (now - mainCommittedAtMs < graceMs) {
    return { state: "running", severity: "ok", detail: "커밋 직후라 아직 기다립니다." };
  }
  if (!mine.length) {
    return { state: "missing", severity: "critical", detail: "main HEAD 에 대한 릴리스 런이 아예 없습니다." };
  }
  const newest = mine[0];
  const state = newest.conclusion === "cancelled" ? "cancelled" : "failed";
  return { state, severity: "critical", detail: `가장 최근 릴리스 런이 ${newest.conclusion} 입니다. ${newest.url || ""}`.trim() };
}

/** 가장 높은 심각도. */
export function overallSeverity(findings) {
  const all = [findings?.drift?.severity, findings?.release?.severity].filter(Boolean);
  let worst = "ok";
  for (const severity of all) {
    if ((SEVERITY_RANK[severity] ?? 0) > (SEVERITY_RANK[worst] ?? 0)) worst = severity;
  }
  return worst;
}

/**
 * 알림 전이를 판단할 키. **critical 인 것만** 센다.
 * 같은 문제로 매 시간 코멘트가 달리면 그것도 소음이라, 키가 바뀔 때만 발화한다.
 */
export function findingKeys(findings) {
  const keys = [];
  if (findings?.drift?.severity === "critical") keys.push(`drift:${findings.drift.state}`);
  if (findings?.release?.severity === "critical") keys.push(`release:${findings.release.state}`);
  return keys.sort();
}

/**
 * 알림(코멘트)을 보낼 것인가.
 *
 * 🔴 gh issue edit 은 알림을 보내지 않는다. 이슈가 조용히 갱신되기만 하면 그것 역시
 * "실패했는데 아무도 모르는" 또 하나의 경로가 된다. 그래서 새 critical 이 생겼을 때만 코멘트한다.
 */
export function shouldNotify(previous, next) {
  if (next?.severity !== "critical") return false;
  if (!previous) return true;
  if (previous.severity !== "critical") return true;
  const known = new Set(previous.keys || []);
  return (next.keys || []).some((key) => !known.has(key));
}

/** 본문 끝의 기계 판독 상태 줄을 읽는다. 외부 저장소 없이 전이를 판단하기 위한 장치다. */
export function parseWatchdogState(body) {
  const match = String(body || "").match(new RegExp(`<!--\\s*${STATE_MARKER}\\s*(\\{[\\s\\S]*?\\})\\s*-->`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return { severity: parsed.severity || "ok", keys: Array.isArray(parsed.keys) ? parsed.keys : [] };
  } catch {
    return null;
  }
}

function severityBadge(severity) {
  if (severity === "critical") return "🔴";
  if (severity === "info") return "🟡";
  return "🟢";
}

/** 이슈 본문. 순수 함수라 self-test 로 왕복을 고정할 수 있다. */
export function renderIssueBody(findings) {
  const severity = overallSeverity(findings);
  const keys = findingKeys(findings);
  const lines = [ISSUE_MARKER, ""];

  lines.push(`**main HEAD**: \`${String(findings?.mainSha || "").slice(0, 12)}\` · 검사 시각: ${findings?.generatedAt || "-"}`);
  lines.push("");

  if (severity === "ok") {
    lines.push("모두 정상입니다. 라이브가 main HEAD 와 같은 커밋입니다.");
  }

  const drift = findings?.drift;
  if (drift) {
    lines.push(`## ${severityBadge(drift.severity)} 배포 드리프트 — ${drift.state}`);
    lines.push("");
    lines.push("| 계층 | 떠 있는 커밋 | main 과 일치 |");
    lines.push("|---|---|---|");
    for (const row of drift.rows || []) {
      const mark = row.ok === null ? "판정 불가" : row.ok ? "예" : "**아니오**";
      lines.push(`| ${row.layer} | \`${row.sha}\` | ${mark} |`);
    }
    lines.push("");
  }

  const release = findings?.release;
  if (release) {
    lines.push(`## ${severityBadge(release.severity)} 릴리스 런 — ${release.state}`);
    lines.push("");
    lines.push(release.detail || "");
    lines.push("");
  }

  lines.push(`<!-- ${STATE_MARKER} ${JSON.stringify({ severity, keys })} -->`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 바깥 세계 — git, gh, 네트워크
// ---------------------------------------------------------------------------

function git(args) {
  return spawnSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function gh(args, input) {
  return spawnSync("gh", args, { encoding: "utf8", input, maxBuffer: 64 * 1024 * 1024 });
}

function ghJson(args) {
  const result = gh(args);
  if (result.status !== 0) return null;
  try {
    return JSON.parse(String(result.stdout || ""));
  } catch {
    return null;
  }
}

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function loadMainState(baseRef) {
  const sha = String(git(["rev-parse", baseRef]).stdout || "").trim();
  const committedAt = String(git(["log", "-1", "--format=%cI", baseRef]).stdout || "").trim();
  return { sha, committedAtMs: committedAt ? Date.parse(committedAt) : 0 };
}

/**
 * 릴리스 런 목록. 🔴 조회 실패와 "런이 0건" 을 구분해서 돌려준다 —
 * 드리프트 게이트가 그 둘을 같게 읽으면 "gh 를 못 불렀다" 가 "배포 중인 런이 없다" 가 되어
 * 정상 배포 중에 중복 배포를 걸게 된다. 부르는 쪽이 null 을 "모른다"로 다룬다.
 */
function loadReleaseRunsOrNull() {
  return ghJson([
    "run", "list", "--workflow", "cloudflare-pages-deploy.yml", "--limit", "40",
    "--json", "databaseId,headSha,status,conclusion,url,createdAt,event",
  ]);
}

function loadReleaseRuns() {
  return loadReleaseRunsOrNull() || [];
}

// ---------------------------------------------------------------------------
// 보고 — 이슈 하나를 제자리에서 갱신한다
// ---------------------------------------------------------------------------

function findWatchdogIssue() {
  const rows = ghJson(["issue", "list", "--state", "all", "--limit", "50", "--json", "number,state,body,title"]);
  if (!rows) return null;
  return rows.find((issue) => String(issue.body || "").includes(ISSUE_MARKER)) || null;
}

function syncWatchdogIssue(findings, body) {
  const severity = overallSeverity(findings);
  const next = { severity, keys: findingKeys(findings) };
  const existing = findWatchdogIssue();
  const previous = existing ? parseWatchdogState(existing.body) : null;

  if (!existing) {
    if (severity === "ok") {
      console.log("[verify-merge-landed] 이상 없음 — 이슈를 만들지 않습니다.");
      return;
    }
    const created = gh(["issue", "create", "--title", ISSUE_TITLE, "--body-file", "-"], body);
    console.log(created.status === 0 ? `[verify-merge-landed] 이슈 생성: ${String(created.stdout || "").trim()}` : "[verify-merge-landed] 이슈 생성 실패");
    return;
  }

  gh(["issue", "edit", String(existing.number), "--body-file", "-"], body);

  if (severity === "ok") {
    if (existing.state !== "CLOSED") {
      gh(["issue", "close", String(existing.number), "--comment", "모두 정상으로 돌아왔습니다. 라이브가 main HEAD 와 같습니다."]);
      console.log(`[verify-merge-landed] 이슈 #${existing.number} 를 닫았습니다.`);
    }
    return;
  }

  if (existing.state === "CLOSED") gh(["issue", "reopen", String(existing.number)]);

  if (shouldNotify(previous, next)) {
    const added = next.keys.filter((key) => !(previous?.keys || []).includes(key));
    gh(["issue", "comment", String(existing.number), "--body", `새 문제가 감지됐습니다: ${added.join(", ") || next.keys.join(", ")}`]);
    console.log(`[verify-merge-landed] 이슈 #${existing.number} 에 악화 알림을 남겼습니다.`);
  } else {
    console.log(`[verify-merge-landed] 이슈 #${existing.number} 본문만 갱신했습니다(알림 없음).`);
  }
}

// ---------------------------------------------------------------------------

async function collectFindings({ check, baseRef, origin, now }) {
  const main = loadMainState(baseRef);
  if (!main.sha) throw new Error(`${baseRef} 를 확인하지 못했습니다. 전체 히스토리로 체크아웃했는지 확인하세요.`);

  const findings = { generatedAt: new Date(now).toISOString(), mainSha: main.sha };

  if (check === "all" || check === "drift") {
    const live = await readProductionShas({ origin });
    // 🔴 "지금 그 SHA 를 배포하는 런이 도는가" 를 실제로 묻는다. 이걸 못 읽으면(null) 옛
    // 시간 유예로 폴백하므로, gh 토큰이 없는 환경에서도 동작은 이전과 같다.
    const inFlight = releaseInFlight({
      mainSha: main.sha,
      runs: loadReleaseRunsOrNull(),
      currentRunId: process.env.GITHUB_RUN_ID || "",
    });
    findings.drift = driftVerdict({
      mainSha: main.sha,
      mainCommittedAtMs: main.committedAtMs,
      pages: live.pages,
      worker: live.worker,
      now,
      inFlight,
    });
  }

  if (check === "all" || check === "runs") {
    findings.release = releaseRunVerdict({
      mainSha: main.sha,
      mainCommittedAtMs: main.committedAtMs,
      runs: loadReleaseRuns(),
      now,
    });
  }

  return findings;
}

function printSummary(findings) {
  const severity = overallSeverity(findings);
  console.log(`[verify-merge-landed] main=${String(findings.mainSha).slice(0, 12)} 전체 판정=${severity}`);
  if (findings.drift) console.log(`  드리프트: ${findings.drift.state}`);
  if (findings.release) console.log(`  릴리스 런: ${findings.release.state} — ${findings.release.detail}`);
}

async function main() {
  const check = argValue("check", "all");
  const baseRef = argValue("base", DEFAULT_BASE_REF);
  const origin = argValue("origin", process.env.CD_PRODUCTION_ORIGIN || DEFAULT_ORIGIN);
  const dryRun = hasFlag("dry-run");
  const now = Date.now();

  const findings = await collectFindings({ check, baseRef, origin, now });
  const severity = overallSeverity(findings);

  if (hasFlag("json")) {
    console.log(JSON.stringify({ ...findings, severity, drifted: findings.drift?.state === "drifted" }, null, 2));
  } else {
    printSummary(findings);
  }

  const body = renderIssueBody(findings);

  if (dryRun) {
    console.log("\n--- 이슈 본문 (dry-run, 쓰지 않음) ---\n");
    console.log(body);
  } else if (hasFlag("report")) {
    syncWatchdogIssue(findings, body);
  }

  if (severity === "critical" && !hasFlag("soft")) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// self-test — 네트워크도 git 도 gh 도 부르지 않는다.
//
// ⚠️ 픽스처에 스크립트 경로나 npm 스크립트 이름을 넣지 말 것. verify-guard-wiring 이
// 따옴표 안의 파일명과 명령 문자열을 "배선 근거"로 읽어서, 무관한 검증기가 거짓으로
// "배선됨" 처리된다.
// ---------------------------------------------------------------------------

function selfTest() {
  const HOUR = 60 * 60_000;
  const now = 1_000 * HOUR;
  const old = now - 5 * HOUR;

  const sha = "abcdef1234567890abcdef1234567890abcdef12";
  const other = "1234567890abcdef1234567890abcdef12345678";
  const drift = (overrides) =>
    driftVerdict({ mainSha: sha, mainCommittedAtMs: old, pages: { sha }, worker: { sha }, now, ...overrides });

  const cases = [
    [drift({}).state, "in-sync", "양쪽이 main 과 같으면 정상"],
    [drift({ worker: { sha: other } }).state, "drifted", "Worker 만 달라도 드리프트다"],
    [drift({ pages: { sha: other }, mainCommittedAtMs: now - 60_000 }).state, "deploying", "커밋 직후 불일치는 배포 중이다"],
    [drift({ pages: { sha: null, error: "HTTP 503" } }).state, "unknown", "조회 실패는 드리프트가 아니라 판정 불가"],
    [drift({ pages: { sha: null, error: "HTTP 503" } }).severity, "info", "조회 실패로 경보를 울리지 않는다"],
    [drift({ worker: { skipped: true } }).state, "in-sync", "생략한 계층은 통과 취급"],
  ];

  // 🔴 자가 수렴이 죽어 있던 구멍. 유예의 기준이 "main 의 커밋 시각" 이라 커밋이 잦으면
  // 모든 스케줄 주기가 유예 안에서 깨어나 영영 배포하지 않았다(2026-08-22 실측).
  // 🔴 main 직접 개발으로 바뀌어 커밋 간격이 더 짧아졌으므로 이 축이 전보다 더 중요하다.
  const inFlightCase = (inFlight) =>
    drift({ pages: { sha: other }, mainCommittedAtMs: now - 60_000, inFlight }).state;
  cases.push(
    [inFlightCase(true), "deploying", "그 SHA 의 릴리스가 아직 돌면 기다린다"],
    [inFlightCase(false), "drifted", "릴리스가 이미 끝났으면 커밋 직후여도 드리프트다 — 기다릴 대상이 없다"],
    [inFlightCase(null), "deploying", "런 상태를 모르면 옛 시간 유예로 폴백한다"],
    [drift({ pages: { sha: other }, inFlight: true }).state, "deploying", "유예가 지났어도 도는 런이 있으면 기다린다"],
    [drift({ pages: { sha: other }, inFlight: null }).state, "drifted", "유예가 지났고 근거가 없으면 드리프트"],
  );

  const flight = (list, currentRunId) => releaseInFlight({ mainSha: sha, runs: list, currentRunId });
  cases.push(
    [flight([{ databaseId: 1, headSha: sha, status: "in_progress" }], ""), true, "진행 중인 런은 배포 중이다"],
    [flight([{ databaseId: 1, headSha: sha, status: "queued" }], ""), true, "대기 중인 런도 배포 중이다"],
    [flight([{ databaseId: 1, headSha: sha, status: "completed", conclusion: "failure" }], ""), false, "실패로 끝난 런은 기다릴 대상이 아니다"],
    [flight([{ databaseId: 1, headSha: sha, status: "completed", conclusion: "cancelled" }], ""), false, "취소로 끝난 런도 기다릴 대상이 아니다"],
    [flight([{ databaseId: 1, headSha: other, status: "in_progress" }], ""), false, "다른 SHA 의 런은 우리 것이 아니다"],
    // 🔴 이 케이스를 빼면 고치려던 버그가 그대로 돌아온다 — 판정을 부르는 스케줄 런 자신이
    // 언제나 in_progress 라, 자기를 세면 결과는 영원히 "배포 중" 이다.
    [flight([{ databaseId: 42, headSha: sha, status: "in_progress" }], "42"), false, "자기 자신은 세지 않는다"],
    [flight([{ databaseId: 42, headSha: sha, status: "in_progress" }, { databaseId: 43, headSha: sha, status: "in_progress" }], "42"), true, "자기 말고 다른 런이 돌면 배포 중이다"],
    [flight([], ""), false, "런이 0건이면 기다릴 대상이 없다"],
    [flight(null, ""), null, "목록을 못 읽으면 '모른다'이지 '없다'가 아니다"],
  );

  const runs = (list) => releaseRunVerdict({ mainSha: sha, mainCommittedAtMs: old, runs: list, now });
  cases.push(
    [runs([{ headSha: sha, status: "completed", conclusion: "success" }]).state, "success", "성공 런이 있으면 성공"],
    [runs([{ headSha: sha, status: "completed", conclusion: "cancelled" }, { headSha: sha, status: "completed", conclusion: "success" }]).state, "success", "취소 뒤 성공이면 성공이다"],
    [runs([{ headSha: sha, status: "completed", conclusion: "cancelled" }]).state, "cancelled", "취소만 있으면 취소"],
    [runs([{ headSha: sha, status: "completed", conclusion: "cancelled" }]).severity, "critical", "취소는 critical"],
    [runs([{ headSha: sha, status: "in_progress", conclusion: null }]).state, "running", "진행 중이면 기다린다"],
    [runs([{ headSha: other, status: "completed", conclusion: "success" }]).state, "missing", "다른 SHA 의 성공은 우리 것이 아니다"],
    [releaseRunVerdict({ mainSha: sha, mainCommittedAtMs: now - 60_000, runs: [], now }).state, "running", "커밋 직후 런이 없는 것은 정상"],
  );

  const clean = { mainSha: sha, generatedAt: "2026-01-01T00:00:00.000Z", drift: { state: "in-sync", severity: "ok", rows: [] } };
  const loud = { ...clean, drift: { state: "drifted", severity: "critical", rows: [{ layer: "Pages", sha: other, ok: false }] } };

  cases.push(
    [overallSeverity(clean), "ok", "이상이 없으면 ok"],
    [overallSeverity(loud), "critical", "드리프트가 있으면 critical"],
    [findingKeys(loud).join(","), "drift:drifted", "드리프트는 상태로 키가 된다"],
    [findingKeys({ ...clean, release: { state: "cancelled", severity: "critical" } }).join(","), "release:cancelled", "취소된 릴리스도 키가 된다"],
    [renderIssueBody(loud).includes(ISSUE_MARKER), true, "본문에 마커가 들어간다"],
    [parseWatchdogState(renderIssueBody(loud))?.severity, "critical", "상태 줄을 왕복해서 읽을 수 있다"],
    [parseWatchdogState(renderIssueBody(loud))?.keys.join(","), "drift:drifted", "키도 왕복한다"],
    [parseWatchdogState("아무 내용 없음"), null, "상태 줄이 없으면 null"],
    [shouldNotify(null, { severity: "critical", keys: ["a"] }), true, "처음 발생하면 알린다"],
    [shouldNotify({ severity: "critical", keys: ["a"] }, { severity: "critical", keys: ["a"] }), false, "같은 문제로 반복 알림하지 않는다"],
    [shouldNotify({ severity: "critical", keys: ["a"] }, { severity: "critical", keys: ["a", "b"] }), true, "새 문제가 붙으면 알린다"],
    [shouldNotify({ severity: "ok", keys: [] }, { severity: "critical", keys: ["a"] }), true, "정상에서 악화되면 알린다"],
    [shouldNotify({ severity: "critical", keys: ["a"] }, { severity: "info", keys: [] }), false, "나아졌으면 알리지 않는다"],
  );

  for (const [actual, expected, label] of cases) {
    if (actual !== expected) throw new Error(`self-test 실패: ${label} (기대 ${expected}, 실제 ${actual})`);
  }
  console.log(`[verify-merge-landed] self-test passed (${cases.length} cases)`);
}

function isEntrypoint() {
  const entry = process.argv[1];
  if (!entry) return false;
  const self = fileURLToPath(import.meta.url);
  const invoked = resolve(entry);
  if (invoked === self) return true;
  return process.platform === "win32" && invoked.toLowerCase() === self.toLowerCase();
}

if (isEntrypoint()) {
  if (process.argv.includes("--self-test")) {
    try {
      selfTest();
    } catch (error) {
      console.error(`[verify-merge-landed] FAIL: ${error.message}`);
      process.exitCode = 1;
    }
  } else {
    main().catch((error) => {
      console.error(`[verify-merge-landed] FAIL: ${error.message}`);
      process.exitCode = 1;
    });
  }
}
