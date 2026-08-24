#!/usr/bin/env node

/**
 * 머지한 작업이 정말로 프로덕션에 도달했는지 확인한다.
 *
 * 이 저장소에는 "머지는 됐는데 그 변경이 프로덕션에 없고, 아무도 그 사실을 모르는" 경로가
 * 세 개 있었다. 셋 다 실패했다는 신호를 남기지 않는다는 점이 같다.
 *
 *   ① 스택 PR 좌초 — 부모(→main)를 자식보다 먼저 머지하면 자식의 머지 커밋은 목적지를 잃은
 *      브랜치로 들어간다. GitHub 은 자식을 "Merged" 로 칠하지만 그 커밋은 main 의 조상이
 *      아니다. 전수조사에서 9건 나왔다.
 *   ② 릴리스 런 취소 — concurrency 그룹당 실행 1 + 대기 1 만 유지되므로, 연속 머지 시
 *      대기 런이 취소된다. 취소된 런은 잡이 시작조차 안 해서 PR 코멘트 스텝이 돌지 않고,
 *      GitHub 은 실패와 달리 취소에는 메일을 보내지 않는다. 최근 60런 중 8건이 그랬다.
 *   ③ 프로덕션 드리프트 — 라이브 SHA 와 main HEAD 를 비교하는 장치가 없었다.
 *
 * 그래서 이 스크립트는 판정만 하고, 결과를 **하나의 GitHub 이슈**로 모은다. 사람이 봐야 할
 * 곳을 한 곳으로 만드는 것이 목적이다.
 *
 * 🔴 판정 순서가 곧 정확성이다(classifyMergedPr 주석 참고). 특히 머지 커밋을 head 커밋보다
 * 먼저 봐야 한다 — squash 머지는 새 커밋을 만들어 head 가 절대 main 의 조상이 되지 않으므로,
 * head 를 먼저 보면 squash 로 머지된 PR 이 전부 좌초로 오탐된다.
 *
 * 🔴 "모른다"를 critical 로 올리지 않는다. GitHub API 장애 한 번이 거짓 경보를 울리면 다음엔
 * 진짜 경보도 무시당한다. 그러면 이 스크립트는 자기가 고치려던 문제가 된다.
 *
 * 실행:
 *   node scripts/verify-merge-landed.mjs                     # 판정만, 쓰기 없음
 *   node scripts/verify-merge-landed.mjs --check=drift --json # 릴리스 워크플로의 드리프트 게이트
 *   node scripts/verify-merge-landed.mjs --report            # 이슈·코멘트까지 갱신
 *   node scripts/verify-merge-landed.mjs --dry-run           # 본문만 출력하고 아무것도 쓰지 않음
 *   node scripts/verify-merge-landed.mjs --self-test
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readProductionShas, shaMatches } from "./verify-deployed-sha.mjs";

const DEFAULT_DAYS = 7;
const DEFAULT_BASE_REF = "origin/main";
const DEFAULT_ORIGIN = "https://code-destiny.com";
const ACK_FILE = "config/landing-recovered.json";

/** 머지 직후에는 릴리스가 아직 돌고 있다. 그 사이를 좌초로 부르지 않는다. */
const MERGE_GRACE_MS = 15 * 60_000;
/** 릴리스 자체가 ~10분 걸린다. 그보다 짧게 잡으면 정상 배포 중을 드리프트로 읽는다. */
const DRIFT_GRACE_MS = 20 * 60_000;
/** GitHub 의 mergeable 은 지연 계산이라 base 가 움직인 직후엔 깨끗한 PR 도 CONFLICTING 으로 읽힌다. */
const CONFLICT_QUIET_MS = 10 * 60_000;

const ISSUE_TITLE = "🚧 착지 감시: 머지된 작업이 프로덕션에 도달하지 못했습니다";
const ISSUE_MARKER = "<!-- cd-landing-watchdog -->";
const STATE_MARKER = "cd-landing-watchdog:state";
const PR_COMMENT_MARKER = "<!-- cd-landing-watchdog:stranded -->";

const SEVERITY_RANK = { ok: 0, info: 1, critical: 2 };

// ---------------------------------------------------------------------------
// 순수 판정 — 여기 있는 것만 self-test 대상이다. git 도 네트워크도 만지지 않는다.
// ---------------------------------------------------------------------------

/**
 * 머지된 PR 하나를 판정한다.
 *
 * 🔴 순서를 바꾸지 말 것. 각 줄이 앞줄을 전제로 한다.
 *   1) 머지 커밋이 main 에 있으면 끝. merge·squash·rebase 세 방식을 여기서 전부 흡수한다.
 *   2) 머지 직후는 판정하지 않는다(릴리스가 도는 중).
 *   3) base 가 main 이 아니고 그 부모 PR 이 아직 열려 있으면 정상이다 — 스택을 쓰기로 했으므로
 *      자식이 부모 브랜치에 머지돼 있는 상태는 좌초가 아니라 대기다.
 *   4) 사람이 "내용은 착지했다"고 확인해 대장에 등재한 것은 낮춘다. 조상 관계는 의미론이
 *      아니라서(내용이 다른 PR 로 회수돼도 커밋은 영영 고아다) 이게 없으면 상시 빨간불이 된다.
 *   5) 판정에 필요한 값을 못 구했으면 "모른다"로 두고 조용히 넘어간다.
 *   6) 머지 커밋은 고아인데 head 는 main 에 있으면 내용은 살아 있다는 뜻이다.
 *   7) 커밋이 둘 다 고아여도 그 PR 이 바꾼 파일의 내용이 main 과 같으면 착지한 것이다.
 *      부모를 스쿼시로 머지하면 자식의 머지 커밋과 head 커밋이 **동시에** 고아가 되므로
 *      (#1061·#1084 실측) 조상 관계만으로는 영영 구제되지 않고, 사람이 매번 대장에 손으로
 *      등재할 때까지 워치독이 빨간불로 남는다 — 그게 진짜 경보를 덮는 경로다.
 *   8) 둘 다 없고 내용도 다르면 진짜 좌초다.
 */
export function classifyMergedPr(input) {
  const {
    number,
    title = "",
    url = "",
    baseRefName = "",
    mergedAtMs = 0,
    mergeCommitInMain = null,
    headCommitInMain = null,
    parentPrOpen = false,
    acknowledged = false,
    contentInMain = null,
    now = 0,
    graceMs = MERGE_GRACE_MS,
  } = input || {};

  const verdict = (status, severity, reason) => ({ number, title, url, baseRefName, status, severity, reason });

  if (mergeCommitInMain === true) return verdict("landed", "ok", "머지 커밋이 main 에 있습니다.");
  if (now - mergedAtMs < graceMs) return verdict("too-fresh", "ok", "머지 직후라 아직 판정하지 않습니다.");
  if (baseRefName && baseRefName !== "main" && parentPrOpen) {
    return verdict("pending-parent", "ok", `base 브랜치(${baseRefName})의 PR 이 아직 열려 있습니다.`);
  }
  if (acknowledged) return verdict("acknowledged", "info", "내용 착지가 확인돼 대장에 등재된 PR 입니다.");
  if (mergeCommitInMain === null || headCommitInMain === null) {
    return verdict("unknown", "info", "조상 관계를 판정하지 못했습니다.");
  }
  if (headCommitInMain === true) {
    return verdict("recovered", "info", "머지 커밋은 고아지만 내용(head 커밋)은 main 에 있습니다.");
  }
  if (contentInMain === true) {
    return verdict("content-landed", "info", "커밋은 둘 다 고아지만 변경 파일 내용이 main 과 동일합니다.");
  }
  return verdict("stranded", "critical", `머지됐지만 main 에 없습니다 (base 가 ${baseRefName || "?"} 였습니다).`);
}

/**
 * main HEAD 를 배포하는 릴리스 런이 **지금 돌고 있는가**.
 *
 * 🔴 이 축이 없으면 시간 유예가 자기 목적을 배신한다. 유예는 "정상적으로 배포 중인 것을
 * 드리프트로 부르지 않기" 위한 것인데, 기준이 **main HEAD 의 커밋 시각**이라 머지가 들어올
 * 때마다 처음부터 다시 흐른다. 스케줄 주기(20분)와 유예(20분)가 같으므로, 머지가 20분보다
 * 잦은 구간에서는 모든 주기가 유예 안에서 깨어나 **자가 수렴이 영영 돌지 않는다.**
 * 실측 2026-08-22: 스테이징이 두 머지 뒤처진 상태에서 16:30 스케줄 런(32584921998)이
 * "스테이징이 main HEAD 와 같습니다"로 판정하고 배포를 건너뛰었다.
 *
 * 그래서 "정말 배포 중인가"를 시각이 아니라 런 상태로 묻는다.
 *   true  — 아직 끝나지 않은 런이 있다. 기다리는 것이 맞다.
 *   false — 그 SHA 의 런은 전부 끝났다(실패·취소 포함). 기다릴 대상이 없으므로 유예도 없다.
 *   null  — 런 목록을 못 읽었다. 판단 근거가 없으니 옛 시간 유예로 되돌아간다.
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
    return { state: "running", severity: "ok", detail: "머지 직후라 아직 기다립니다." };
  }
  if (!mine.length) {
    return { state: "missing", severity: "critical", detail: "main HEAD 에 대한 릴리스 런이 아예 없습니다." };
  }
  const newest = mine[0];
  const state = newest.conclusion === "cancelled" ? "cancelled" : "failed";
  return { state, severity: "critical", detail: `가장 최근 릴리스 런이 ${newest.conclusion} 입니다. ${newest.url || ""}`.trim() };
}

/**
 * 충돌 PR — 간격을 둔 두 조회가 **둘 다** CONFLICTING 일 때만 인정한다.
 *
 * GitHub 의 mergeable 은 지연 계산이라 base 가 막 움직인 직후에는 멀쩡한 PR 도 CONFLICTING /
 * UNKNOWN 으로 읽힌다. 실제로 PR #600 이 그렇게 읽혔다가 재조회에서 MERGEABLE 로 바뀌었다.
 * 한 번 읽고 신고하면 오탐이 쌓이고, 오탐이 쌓이면 아무도 안 본다.
 */
export function stableConflicts(first, second, options) {
  const { now = 0, quietMs = CONFLICT_QUIET_MS } = options || {};
  const before = new Map((first || []).map((pr) => [pr.number, pr]));
  return (second || [])
    .filter((pr) => {
      const earlier = before.get(pr.number);
      if (!earlier || earlier.mergeable !== "CONFLICTING") return false;
      if (pr.mergeable !== "CONFLICTING") return false;
      return now - (pr.updatedAtMs || 0) >= quietMs;
    })
    .map((pr) => ({ number: pr.number, title: pr.title, url: pr.url }));
}

/**
 * main 을 자동 병합해 줄 PR 고르기.
 *
 * 🔴 base 가 main 인 것만 고른다. 스택 PR(자식)에 main 을 병합하면 스택이 깨진다 — 자식은
 * 부모 위에 쌓여 있어야 하고, 거기에 main 을 끼워 넣으면 부모의 diff 가 자식 PR 로 새어 든다.
 *
 * mergeStateStatus 만 보지 않는 이유: BEHIND 는 룰셋이 "최신 상태 요구"를 켰을 때만 나온다.
 * 이 저장소는 strict_required_status_checks_policy 가 false 라 그 값이 아예 안 나온다.
 * 그래서 compare API 로 센 behindBy 를 1차 근거로 쓴다.
 */
export function selectPrsToUpdate(openPrs, options) {
  const { minBehind = 1 } = options || {};
  return (openPrs || [])
    .filter((pr) => pr && pr.baseRefName === "main")
    .filter((pr) => (Number(pr.behindBy) || 0) >= minBehind || pr.mergeStateStatus === "BEHIND")
    .map((pr) => ({ number: pr.number, title: pr.title, url: pr.url, behindBy: Number(pr.behindBy) || 0 }));
}

/** 가장 높은 심각도. */
export function overallSeverity(findings) {
  const all = [
    findings?.drift?.severity,
    findings?.release?.severity,
    ...(findings?.merged || []).map((item) => item.severity),
    ...((findings?.conflicts || []).length ? ["info"] : []),
  ].filter(Boolean);
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
  for (const item of findings?.merged || []) {
    if (item.severity === "critical") keys.push(`stranded:${item.number}`);
  }
  return keys.sort();
}

/**
 * 알림(코멘트)을 보낼 것인가.
 *
 * 🔴 gh issue edit 은 알림을 보내지 않는다. 이슈가 조용히 갱신되기만 하면 그것 역시
 * "실패했는데 아무도 모르는" 네 번째 경로가 된다. 그래서 새 critical 이 생겼을 때만 코멘트한다.
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

const STATUS_LABEL = {
  landed: "착지함",
  "too-fresh": "판정 보류(머지 직후)",
  "pending-parent": "부모 PR 대기 중",
  acknowledged: "확인됨(대장 등재)",
  unknown: "판정 불가",
  recovered: "내용만 착지(커밋 고아)",
  "content-landed": "내용 착지(커밋 고아, 파일 대조)",
  stranded: "좌초 — main 에 없음",
};

/** 이슈 본문. 순수 함수라 self-test 로 왕복을 고정할 수 있다. */
export function renderIssueBody(findings) {
  const severity = overallSeverity(findings);
  const keys = findingKeys(findings);
  const lines = [ISSUE_MARKER, ""];

  lines.push(`**main HEAD**: \`${String(findings?.mainSha || "").slice(0, 12)}\` · 검사 시각: ${findings?.generatedAt || "-"}`);
  lines.push("");

  if (severity === "ok") {
    lines.push("모두 정상입니다. 머지된 작업이 전부 main 에 있고, 프로덕션이 main HEAD 와 같습니다.");
  }

  const drift = findings?.drift;
  if (drift) {
    lines.push(`## ${severityBadge(drift.severity)} 프로덕션 드리프트 — ${drift.state}`);
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

  const merged = findings?.merged || [];
  const loud = merged.filter((item) => item.severity === "critical");
  const quiet = merged.filter((item) => item.severity === "info");

  lines.push(`## ${severityBadge(loud.length ? "critical" : "ok")} 좌초된 PR — ${loud.length}건`);
  lines.push("");
  if (loud.length) {
    lines.push("| PR | 제목 | base | 판정 |");
    lines.push("|---|---|---|---|");
    for (const item of loud) {
      lines.push(`| #${item.number} | ${item.title} | \`${item.baseRefName}\` | ${STATUS_LABEL[item.status] || item.status} |`);
    }
    lines.push("");
    lines.push("> 내용이 실제로 main 에 있다면 `config/landing-recovered.json` 에 근거와 함께 등재하세요. 확인 없이 등재하는 것은 감시기를 끄는 것과 같습니다.");
  } else {
    lines.push("없습니다.");
  }
  lines.push("");

  if (quiet.length) {
    lines.push("<details><summary>참고 — 커밋만 고아이거나 판정 불가인 PR</summary>");
    lines.push("");
    for (const item of quiet) {
      lines.push(`- #${item.number} — ${STATUS_LABEL[item.status] || item.status}: ${item.reason}`);
    }
    lines.push("");
    lines.push("</details>");
    lines.push("");
  }

  const conflicts = findings?.conflicts || [];
  if (conflicts.length) {
    lines.push(`## 🟡 충돌로 머지할 수 없는 PR — ${conflicts.length}건`);
    lines.push("");
    for (const pr of conflicts) lines.push(`- #${pr.number} — ${pr.title}`);
    lines.push("");
  }

  lines.push(`<!-- ${STATE_MARKER} ${JSON.stringify({ severity, keys })} -->`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 바깥 세계 — git, gh, 네트워크
// ---------------------------------------------------------------------------

// maxBuffer: 기본 1MB 로는 base…head 전체 변경 목록(contentLandedInMain)이 잘릴 수 있다.
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

/**
 * sha 가 base 의 조상인가.
 *
 * 🔴 에러를 false 로 읽지 않는다. merge-base 는 0/1 만 답이고 그 밖(128 등)은 "모른다"이다.
 * 그리고 브랜치 자동 삭제를 켜면 고아 머지 커밋이 클론에서 도달 불가능해지므로, 로컬에 객체가
 * 없을 때 GitHub 에 되묻는 폴백이 선택이 아니라 필수다.
 */
function isAncestor(sha, base) {
  if (!/^[0-9a-f]{7,40}$/i.test(String(sha || ""))) return null;

  if (git(["cat-file", "-e", `${sha}^{commit}`]).status === 0) {
    const result = git(["merge-base", "--is-ancestor", sha, base]);
    if (result.status === 0) return true;
    if (result.status === 1) return false;
    return null;
  }

  const compared = gh(["api", `repos/{owner}/{repo}/compare/${base.replace(/^origin\//, "")}...${sha}`, "--jq", ".status"]);
  if (compared.status !== 0) return null;
  const status = String(compared.stdout || "").trim();
  if (status === "identical" || status === "behind") return true;
  if (status === "ahead" || status === "diverged") return false;
  return null;
}

/**
 * 커밋 조상으로는 좌초인 PR 의 **내용**이 base 에 있는가.
 *
 * 스택 PR 의 부모를 스쿼시로 머지하면 자식의 머지 커밋도 head 커밋도 동시에 고아가 된다.
 * 조상 관계는 의미론이 아니므로 이 축이 없으면 그 PR 은 영영 좌초로 남고, 사람이 대장에
 * 등재할 때까지 워치독이 빨간불이다. 실측으로 두 번 났다(#1061 2026-08-24, #1084 같은 날).
 *
 * 🔴 fail-closed 다. 아래는 전부 null(= 좌초 유지)로 떨어진다 — head SHA 가 형식에 안 맞음,
 * 파일 목록 조회 실패, 파일 목록 0건, 커밋을 끝내 못 받아옴, git diff 가 0 이 아닌 종료코드.
 * 내용 대조는 **경보를 끄는 근거**이지 못 본 것을 눈감는 근거가 아니다.
 *
 * 🔴 대조 대상은 그 PR 이 바꾼 파일뿐이다. 뒤이은 PR 이 같은 파일을 더 고쳤으면 차이가 남아
 * 좌초로 유지된다 — 그건 오검출이 아니라 사람이 실제로 봐야 하는 상태다.
 *
 * 🔴 pathspec 으로 걸러 달라고 git 에 부탁하지 않는다. `git diff` 는 --pathspec-from-file 을
 * 지원하지 않고(실측: exit 129), 경로를 인자로 늘어놓으면 파일 많은 PR 에서 명령줄 길이에
 * 걸리며, app/[locale]/… 같은 경로가 23개라 대괄호가 글롭으로 해석돼 조용히 빗나간다.
 * 대신 전체 변경 목록을 한 번 받아 **JS 에서 교집합**을 낸다 — git 호출 1회, 인용 문제 0.
 */
function contentLandedInMain({ number, headRefOid }, baseRef) {
  if (!/^[0-9a-f]{7,40}$/i.test(String(headRefOid || ""))) return null;

  const listed = gh(["api", "--paginate", `repos/{owner}/{repo}/pulls/${number}/files`, "--jq", ".[].filename"]);
  if (listed.status !== 0) return null;
  const files = String(listed.stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!files.length) return null;

  // 브랜치가 지워졌어도 GitHub 은 refs/pull/<n>/head 를 영구 보관한다.
  if (git(["cat-file", "-e", `${headRefOid}^{commit}`]).status !== 0) {
    git(["fetch", "--no-tags", "--quiet", "origin", `refs/pull/${number}/head`]);
    if (git(["cat-file", "-e", `${headRefOid}^{commit}`]).status !== 0) return null;
  }

  // -z: 경로를 NUL 로 끊어 C-따옴표 인용을 피한다. --no-renames: 리네임을 한 줄로 접으면
  // 원래 경로가 목록에서 사라져 "차이 없음" 으로 오독된다.
  const diff = git(["diff", "--name-only", "-z", "--no-renames", baseRef, headRefOid]);
  if (diff.status !== 0) return null;
  const changed = new Set(String(diff.stdout || "").split("\0").filter(Boolean));
  return !files.some((file) => changed.has(file));
}

function loadMainState(baseRef) {
  const sha = String(git(["rev-parse", baseRef]).stdout || "").trim();
  const committedAt = String(git(["log", "-1", "--format=%cI", baseRef]).stdout || "").trim();
  return { sha, committedAtMs: committedAt ? Date.parse(committedAt) : 0 };
}

function loadAcknowledged(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    const entries = Object.entries(parsed?.recovered || {});
    return new Set(entries.filter(([, value]) => value?.acknowledged === true).map(([key]) => Number(key)));
  } catch (error) {
    console.warn(`[verify-merge-landed] ack 대장을 읽지 못했습니다(${file}): ${error.message}`);
    return new Set();
  }
}

function loadMergedPrs(days, limit) {
  const rows = ghJson([
    "pr", "list", "--state", "merged", "--limit", String(limit),
    "--json", "number,title,url,mergedAt,baseRefName,headRefName,headRefOid,mergeCommit",
  ]);
  if (!rows) return null;
  const cutoff = Date.now() - days * 24 * 60 * 60_000;
  return rows
    .map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.url,
      baseRefName: pr.baseRefName,
      headRefName: pr.headRefName,
      headRefOid: pr.headRefOid,
      mergeCommitOid: pr.mergeCommit?.oid || "",
      mergedAtMs: pr.mergedAt ? Date.parse(pr.mergedAt) : 0,
    }))
    .filter((pr) => pr.mergedAtMs >= cutoff);
}

function loadOpenPrs() {
  const rows = ghJson([
    "pr", "list", "--state", "open", "--limit", "100",
    "--json", "number,title,url,mergeable,mergeStateStatus,baseRefName,headRefName,updatedAt",
  ]);
  if (!rows) return null;
  return rows.map((pr) => ({
    number: pr.number,
    title: pr.title,
    url: pr.url,
    mergeable: pr.mergeable,
    mergeStateStatus: pr.mergeStateStatus,
    baseRefName: pr.baseRefName,
    headRefName: pr.headRefName,
    updatedAtMs: pr.updatedAt ? Date.parse(pr.updatedAt) : 0,
  }));
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

function countBehind(baseRef, headRef) {
  const base = baseRef.replace(/^origin\//, "");
  const result = gh(["api", `repos/{owner}/{repo}/compare/${base}...${headRef}`, "--jq", ".behind_by"]);
  if (result.status !== 0) return 0;
  return Number(String(result.stdout || "").trim()) || 0;
}

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
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
      gh(["issue", "close", String(existing.number), "--comment", "모두 정상으로 돌아왔습니다. 머지된 작업이 전부 main 에 있고 프로덕션이 main HEAD 와 같습니다."]);
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

function commentOnStrandedPr(item) {
  const existing = gh(["api", `repos/{owner}/{repo}/issues/${item.number}/comments`, "--jq", ".[].body"]);
  if (existing.status === 0 && String(existing.stdout || "").includes(PR_COMMENT_MARKER)) return;
  const body = [
    PR_COMMENT_MARKER,
    "### 🔴 이 PR 은 머지됐지만 main 에 도달하지 못했습니다",
    "",
    item.reason,
    "",
    "복구는 이 PR 의 커밋을 main 위에 다시 이식하는 새 PR 로 합니다. 복구가 끝나면 `config/landing-recovered.json` 에 근거와 함께 등재해 이 경보를 끄세요.",
  ].join("\n");
  gh(["issue", "comment", String(item.number), "--body-file", "-"], body);
  console.log(`[verify-merge-landed] PR #${item.number} 에 좌초 코멘트를 남겼습니다.`);
}

function updateBehindPrs(openPrs, baseRef, minBehind) {
  const annotated = openPrs.map((pr) => ({ ...pr, behindBy: pr.baseRefName === "main" ? countBehind(baseRef, pr.headRefName) : 0 }));
  const targets = selectPrsToUpdate(annotated, { minBehind });
  if (!targets.length) {
    console.log("[verify-merge-landed] 최신화할 PR 이 없습니다.");
    return;
  }
  for (const pr of targets) {
    const result = gh(["api", "-X", "PUT", `repos/{owner}/{repo}/pulls/${pr.number}/update-branch`]);
    if (result.status === 0) {
      console.log(`[verify-merge-landed] PR #${pr.number} 를 main 으로 최신화했습니다 (${pr.behindBy}커밋 뒤).`);
      continue;
    }
    console.log(`[verify-merge-landed] PR #${pr.number} 최신화 실패 — 충돌로 보입니다.`);
    gh(["issue", "comment", String(pr.number), "--body", "main 을 자동 병합하지 못했습니다. 충돌이 있어 직접 해결해야 합니다. 지금 고치는 편이 나중보다 쉽습니다 — 벌어진 간격이 작을수록 충돌도 작습니다."]);
  }
}

// ---------------------------------------------------------------------------

async function collectFindings({ check, baseRef, origin, days, limit, now }) {
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

  if (check === "all" || check === "stranded") {
    const merged = loadMergedPrs(days, limit);
    const open = loadOpenPrs() || [];
    const openHeads = new Set(open.map((pr) => pr.headRefName));
    const acknowledged = loadAcknowledged(ACK_FILE);

    findings.merged = (merged || []).map((pr) => {
      const input = {
        number: pr.number,
        title: pr.title,
        url: pr.url,
        baseRefName: pr.baseRefName,
        mergedAtMs: pr.mergedAtMs,
        mergeCommitInMain: pr.mergeCommitOid ? isAncestor(pr.mergeCommitOid, baseRef) : null,
        headCommitInMain: isAncestor(pr.headRefOid, baseRef),
        parentPrOpen: openHeads.has(pr.baseRefName),
        acknowledged: acknowledged.has(pr.number),
        now,
      };
      const verdict = classifyMergedPr(input);
      // 🔴 내용 대조는 좌초로 떨어진 PR 에만 돌린다. 평시 비용이 0 이어야 이 워치독을
      // 20분마다 돌릴 수 있고, 좌초는 드물어서(7일 창에서 0~2건) 그 몇 번의 API·git
      // 왕복이 곧 판정 정확도가 된다. 전부에 돌리면 PR 수만큼 왕복한다.
      if (verdict.status !== "stranded") return verdict;
      return classifyMergedPr({ ...input, contentInMain: contentLandedInMain(pr, baseRef) });
    });
  }

  if (check === "all" || check === "conflicts") {
    const first = loadOpenPrs() || [];
    await sleep(Number(argValue("conflict-recheck-ms", "20000")) || 20_000);
    const second = loadOpenPrs() || [];
    findings.conflicts = stableConflicts(first, second, { now });
  }

  return findings;
}

function printSummary(findings) {
  const severity = overallSeverity(findings);
  console.log(`[verify-merge-landed] main=${String(findings.mainSha).slice(0, 12)} 전체 판정=${severity}`);
  if (findings.drift) console.log(`  드리프트: ${findings.drift.state}`);
  if (findings.release) console.log(`  릴리스 런: ${findings.release.state} — ${findings.release.detail}`);
  for (const item of findings.merged || []) {
    if (item.severity === "ok") continue;
    console.log(`  #${item.number} ${item.status} (${item.severity}) — ${item.reason}`);
  }
  for (const pr of findings.conflicts || []) console.log(`  #${pr.number} 충돌 — ${pr.title}`);
}

async function main() {
  const check = argValue("check", "all");
  const baseRef = argValue("base", DEFAULT_BASE_REF);
  const origin = argValue("origin", process.env.CD_PRODUCTION_ORIGIN || DEFAULT_ORIGIN);
  const days = Number(argValue("days", String(DEFAULT_DAYS))) || DEFAULT_DAYS;
  const limit = Number(argValue("limit", "200")) || 200;
  const dryRun = hasFlag("dry-run");
  const now = Date.now();

  const findings = await collectFindings({ check, baseRef, origin, days, limit, now });
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
    for (const item of findings.merged || []) {
      if (item.severity === "critical") commentOnStrandedPr(item);
    }
  }

  if (!dryRun && hasFlag("update-branches")) {
    const open = loadOpenPrs() || [];
    updateBehindPrs(open, baseRef, Number(argValue("min-behind", "1")) || 1);
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

  const classify = (extra) =>
    classifyMergedPr({ number: 1, baseRefName: "feature/x", mergedAtMs: old, now, ...extra }).status;

  const cases = [
    // 판정 순서 — 이 순서가 곧 정확성이다.
    [classify({ mergeCommitInMain: true, headCommitInMain: false }), "landed", "squash 머지: 머지 커밋이 있으면 head 가 없어도 착지다"],
    [classify({ mergeCommitInMain: true, headCommitInMain: true }), "landed", "일반 머지도 착지"],
    [classify({ mergeCommitInMain: false, headCommitInMain: false, mergedAtMs: now - 60_000 }), "too-fresh", "머지 직후는 판정 보류"],
    [classify({ mergeCommitInMain: false, headCommitInMain: false, parentPrOpen: true }), "pending-parent", "부모 PR 이 열려 있으면 대기이지 좌초가 아니다"],
    [classify({ mergeCommitInMain: false, headCommitInMain: false, parentPrOpen: false }), "stranded", "둘 다 없으면 좌초"],
    [classify({ mergeCommitInMain: false, headCommitInMain: true }), "recovered", "머지 커밋만 고아면 내용은 살아 있다"],
    [classify({ mergeCommitInMain: false, headCommitInMain: false, acknowledged: true }), "acknowledged", "대장 등재는 좌초보다 우선"],
    [classify({ mergeCommitInMain: null, headCommitInMain: false }), "unknown", "판정 불가는 좌초가 아니다"],
    [classify({ mergeCommitInMain: false, headCommitInMain: null }), "unknown", "한쪽만 몰라도 판정 불가"],
    [classify({ mergeCommitInMain: true, headCommitInMain: null, acknowledged: true }), "landed", "착지가 대장보다 우선"],
    [classify({ baseRefName: "main", mergeCommitInMain: false, headCommitInMain: false, parentPrOpen: true }), "stranded", "base 가 main 이면 부모 대기가 성립하지 않는다"],

    // 내용 대조 — 부모 스쿼시로 커밋이 둘 다 고아가 된 스택 PR 의 구제축.
    [classify({ mergeCommitInMain: false, headCommitInMain: false, contentInMain: true }), "content-landed", "커밋이 둘 다 고아여도 파일 내용이 같으면 착지다"],
    [classify({ mergeCommitInMain: false, headCommitInMain: false, contentInMain: false }), "stranded", "내용이 다르면 좌초 그대로"],
    [classify({ mergeCommitInMain: false, headCommitInMain: false, contentInMain: null }), "stranded", "대조 실패는 좌초를 낮추지 않는다(fail-closed)"],
    [classify({ mergeCommitInMain: true, headCommitInMain: false, contentInMain: false }), "landed", "착지가 내용 대조보다 앞선다"],
    [classify({ mergeCommitInMain: false, headCommitInMain: true, contentInMain: false }), "recovered", "head 착지가 내용 대조보다 앞선다"],
    [classify({ mergeCommitInMain: null, headCommitInMain: null, contentInMain: true }), "unknown", "판정 불가에는 내용 대조를 적용하지 않는다"],

    // 심각도
    [classifyMergedPr({ number: 2, mergedAtMs: old, now, mergeCommitInMain: false, headCommitInMain: false }).severity, "critical", "좌초는 critical"],
    [classifyMergedPr({ number: 2, mergedAtMs: old, now, mergeCommitInMain: false, headCommitInMain: true }).severity, "info", "회수됨은 info"],
    [classifyMergedPr({ number: 2, mergedAtMs: old, now, mergeCommitInMain: null, headCommitInMain: null }).severity, "info", "판정 불가는 절대 critical 이 아니다"],
    [classifyMergedPr({ number: 2, mergedAtMs: old, now, mergeCommitInMain: false, headCommitInMain: false, contentInMain: true }).severity, "info", "내용 착지는 info"],
  ];

  const sha = "abcdef1234567890abcdef1234567890abcdef12";
  const other = "1234567890abcdef1234567890abcdef12345678";
  const drift = (overrides) =>
    driftVerdict({ mainSha: sha, mainCommittedAtMs: old, pages: { sha }, worker: { sha }, now, ...overrides });

  cases.push(
    [drift({}).state, "in-sync", "양쪽이 main 과 같으면 정상"],
    [drift({ worker: { sha: other } }).state, "drifted", "Worker 만 달라도 드리프트다"],
    [drift({ pages: { sha: other }, mainCommittedAtMs: now - 60_000 }).state, "deploying", "머지 직후 불일치는 배포 중이다"],
    [drift({ pages: { sha: null, error: "HTTP 503" } }).state, "unknown", "조회 실패는 드리프트가 아니라 판정 불가"],
    [drift({ pages: { sha: null, error: "HTTP 503" } }).severity, "info", "조회 실패로 경보를 울리지 않는다"],
    [drift({ worker: { skipped: true } }).state, "in-sync", "생략한 계층은 통과 취급"],
  );

  // 🔴 자가 수렴이 죽어 있던 구멍. 유예의 기준이 "main 의 커밋 시각" 이라 머지가 잦으면
  // 모든 스케줄 주기가 유예 안에서 깨어나 영영 배포하지 않았다(2026-08-22 실측).
  const inFlightCase = (inFlight) =>
    drift({ pages: { sha: other }, mainCommittedAtMs: now - 60_000, inFlight }).state;
  cases.push(
    [inFlightCase(true), "deploying", "그 SHA 의 릴리스가 아직 돌면 기다린다"],
    [inFlightCase(false), "drifted", "릴리스가 이미 끝났으면 머지 직후여도 드리프트다 — 기다릴 대상이 없다"],
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
    [releaseRunVerdict({ mainSha: sha, mainCommittedAtMs: now - 60_000, runs: [], now }).state, "running", "머지 직후 런이 없는 것은 정상"],
  );

  const conflictPr = (mergeable, updatedAtMs) => [{ number: 7, title: "t", url: "u", mergeable, updatedAtMs }];
  cases.push(
    [stableConflicts(conflictPr("CONFLICTING", old), conflictPr("CONFLICTING", old), { now }).length, 1, "두 번 다 충돌이면 보고"],
    [stableConflicts(conflictPr("CONFLICTING", old), conflictPr("MERGEABLE", old), { now }).length, 0, "재조회에서 풀리면 보고하지 않는다"],
    [stableConflicts(conflictPr("UNKNOWN", old), conflictPr("CONFLICTING", old), { now }).length, 0, "첫 조회가 UNKNOWN 이면 보고하지 않는다"],
    [stableConflicts(conflictPr("CONFLICTING", now - 60_000), conflictPr("CONFLICTING", now - 60_000), { now }).length, 0, "막 갱신된 PR 은 아직 계산 중일 수 있다"],
  );

  const openPr = (extra) => ({ number: 9, title: "t", url: "u", baseRefName: "main", behindBy: 3, ...extra });
  cases.push(
    [selectPrsToUpdate([openPr({})]).length, 1, "main 을 base 로 하고 뒤처졌으면 최신화 대상"],
    [selectPrsToUpdate([openPr({ baseRefName: "feature/parent" })]).length, 0, "스택 PR 은 절대 최신화하지 않는다"],
    [selectPrsToUpdate([openPr({ behindBy: 0 })]).length, 0, "뒤처지지 않았으면 건드리지 않는다"],
    [selectPrsToUpdate([openPr({ behindBy: 0, mergeStateStatus: "BEHIND" })]).length, 1, "BEHIND 신호만 있어도 대상"],
    [selectPrsToUpdate([openPr({ behindBy: 2 })], { minBehind: 5 }).length, 0, "임계값으로 조일 수 있다"],
  );

  const stranded = { number: 11, title: "t", url: "u", baseRefName: "feature/y", status: "stranded", severity: "critical", reason: "r" };
  const clean = { mainSha: sha, generatedAt: "2026-01-01T00:00:00.000Z", drift: { state: "in-sync", severity: "ok", rows: [] }, merged: [] };
  const loud = { ...clean, merged: [stranded] };

  cases.push(
    [overallSeverity(clean), "ok", "이상이 없으면 ok"],
    [overallSeverity(loud), "critical", "좌초가 있으면 critical"],
    [findingKeys(loud).join(","), "stranded:11", "좌초는 PR 번호로 키가 된다"],
    [renderIssueBody(loud).includes(ISSUE_MARKER), true, "본문에 마커가 들어간다"],
    [parseWatchdogState(renderIssueBody(loud))?.severity, "critical", "상태 줄을 왕복해서 읽을 수 있다"],
    [parseWatchdogState(renderIssueBody(loud))?.keys.join(","), "stranded:11", "키도 왕복한다"],
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
