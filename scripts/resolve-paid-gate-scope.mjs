#!/usr/bin/env node
/**
 * Paid Flow Gates 가 이 PR 에서 실제로 필요한지 판정한다.
 *
 * 🔴 왜 필요한가 — 경로 트리거만으로는 구분이 안 된다.
 * `index.html`(+미러 6)은 **결제창 렌더러의 정본**이면서 동시에 **홈 콘텐츠 셸**이다.
 * `js/core/index-inline-runtime.js` 는 `cd:auth-changed` 리스너 때문에 트리거인데,
 * `npm run sync:public` 이 캐시키(`?v=build-…`)만 재생성해도 그 파일이 "변경"으로 잡힌다.
 * 그래서 팝업 문구 한 줄이나 이미지 하나만 고쳐도 36개 검증기가 통째로 돌았다.
 *
 * 🔴 마커 단어 목록으로 판정하지 않는다. 2026-08-14 에 그 방식을 만들어 실제 커밋으로 검증했더니
 * 양방향으로 틀렸다(문구 PR 은 `featureKey` 한 단어에 걸려 돌고, 결제 진입을 고친 PR 은
 * 목록에 없는 식별자라 건너뜀). 원칙 11 — 손으로 쓴 목록은 가드가 아니다.
 *
 * 판정 재료는 셋 다 **정본에서 가져온다**:
 *   1) 결제·인증 축은 `scripts/lib/change-risk.mjs` 의 `requiresDeepVerification` 에 묻는다.
 *   2) 트리거 경로 목록은 **이 워크플로 YAML 을 직접 파싱**한다(목록을 두 벌로 만들지 않는다).
 *   3) 셸의 모호함은 단어가 아니라 **결제 모달 구간**(함수 본문을 중괄호로 잘라낸 실제 범위)으로 본다.
 *
 * 캐시키만 바뀐 줄은 생성 노이즈이므로 버린다.
 * 🔴 fail-closed: 무엇 하나라도 못 구하면 **돌린다.** "모른다"를 "안전하다"로 읽지 않는다.
 *
 * 사용: node scripts/resolve-paid-gate-scope.mjs --base <sha> [--head <sha>]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { requiresDeepVerification } from "./lib/change-risk.mjs";

const WORKFLOW = ".github/workflows/paid-flow-gates.yml";

/** 셸 안에서 "결제 모달 정본"으로 보는 심볼. 이 함수들의 **본문 범위**가 판정 구간이 된다. */
const SHELL_PAYMENT_SYMBOLS = [
  "_cdChooseServicePaymentMode",
  "_cdEnsureDirectPaymentStyles",
  "_cdRunDirectKrwCheckout",
  "_cdOpenPaidServiceGate",
  "_cdRunPerUseCoinGate",
  "__cdRunPerUseCoinGateFromTile",
  "__cdRequireTileLockGate",
];

const SHELLS = new Set([
  "index.html",
  "public/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
  "public/zh-tw/index.html",
  "public/static/index.html",
]);

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : "";
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
}

/** 워크플로 YAML 의 `paths:` 목록을 그대로 읽어 온다(목록 중복 정의 금지). */
function readTriggerGlobs() {
  const text = fs.readFileSync(WORKFLOW, "utf8");
  const start = text.indexOf("    paths:");
  if (start < 0) throw new Error("paths: 블록을 못 찾았다");
  const rest = text.slice(start);
  const globs = [];
  for (const line of rest.split("\n").slice(1)) {
    const m = /^\s{6}- "(.+)"\s*$/.exec(line);
    if (m) { globs.push(m[1]); continue; }
    if (/^\s{6}#/.test(line) || !line.trim()) continue;
    break; // paths 블록 끝
  }
  if (!globs.length) throw new Error("paths: 목록이 비었다");
  return globs;
}

function globToRegExp(glob) {
  let out = "";
  for (let i = 0; i < glob.length; i += 1) {
    if (glob.startsWith("**/", i)) { out += "(?:.*/)?"; i += 2; continue; }
    if (glob.startsWith("**", i)) { out += ".*"; i += 1; continue; }
    const c = glob[i];
    if (c === "*") { out += "[^/]*"; continue; }
    out += c.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

/** 캐시키만 바뀐 줄인가 — sync:public 이 만드는 생성 노이즈. */
function isCacheBustLine(line) {
  return /\?v=(build-[0-9a-f]+|h[0-9a-f]+)/.test(line);
}

/** 파일별로 "캐시키가 아닌 실제 변경이 있는 새 파일 기준 줄번호" 목록을 뽑는다. */
function substantiveChangedLines(base, head, file) {
  const patch = git(["diff", "--unified=0", `${base}...${head}`, "--", file]);
  const lines = [];
  let newLine = 0;
  for (const raw of patch.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(raw);
    if (hunk) { newLine = Number(hunk[1]); continue; }
    if (raw.startsWith("+++") || raw.startsWith("---")) continue;
    if (raw.startsWith("+")) {
      if (!isCacheBustLine(raw)) lines.push(newLine);
      newLine += 1;
      continue;
    }
    if (raw.startsWith("-")) {
      // 삭제 줄은 새 파일에 위치가 없다. 캐시키가 아니면 그 자리(newLine)를 대표값으로 쓴다.
      if (!isCacheBustLine(raw)) lines.push(newLine);
    }
  }
  return lines;
}

/** 심볼의 함수 본문을 중괄호 균형으로 잘라 [시작줄, 끝줄] 범위를 만든다. */
function paymentRegions(fileText) {
  const BSLASH = String.fromCharCode(92);
  const regions = [];
  for (const symbol of SHELL_PAYMENT_SYMBOLS) {
    let from = 0;
    for (;;) {
      const at = fileText.indexOf(symbol, from);
      if (at < 0) break;
      from = at + symbol.length;
      const open = fileText.indexOf("{", at);
      if (open < 0) continue;
      // 선언부와 본문 사이가 지나치게 멀면 참조일 뿐이므로 건너뛴다.
      if (open - at > 400) continue;
      let depth = 0, q = null, esc = false, close = -1;
      for (let i = open; i < fileText.length; i += 1) {
        const c = fileText[i];
        if (q) {
          if (esc) { esc = false; continue; }
          if (c === BSLASH) { esc = true; continue; }
          if (c === q) q = null;
          continue;
        }
        if (c === '"' || c === "'" || c === "`") { q = c; continue; }
        if (c === "{") depth += 1;
        else if (c === "}") { depth -= 1; if (depth === 0) { close = i; break; } }
      }
      if (close < 0) continue;
      const startLine = fileText.slice(0, at).split("\n").length;
      const endLine = fileText.slice(0, close).split("\n").length;
      regions.push([startLine, endLine]);
    }
  }
  return regions;
}

function decide() {
  const base = arg("--base");
  const head = arg("--head") || "HEAD";
  if (!base) return { run: true, reason: "base 를 못 구했다 (fail-closed)" };

  const files = git(["diff", "--name-only", `${base}...${head}`])
    .split("\n").map((v) => v.trim()).filter(Boolean);
  if (!files.length) return { run: false, reason: "변경 파일 없음" };

  // 1) 결제·인증 축은 정본에 묻는다.
  const deep = requiresDeepVerification(files);
  if (deep && deep.required) {
    const why = (deep.matches || []).slice(0, 3).map((m) => `${m.file}(${m.reason})`).join(", ");
    return { run: true, reason: `change-risk deepRequired: ${why}` };
  }

  // 2) 트리거 목록은 워크플로에서 읽는다.
  const globs = readTriggerGlobs().map(globToRegExp);
  const triggered = files.filter((f) => globs.some((re) => re.test(f)));
  if (!triggered.length) return { run: false, reason: "트리거 경로에 걸린 변경이 없다" };

  // 3) 캐시키뿐인 변경과, 결제 구간 밖의 셸 변경을 걷어낸다.
  const remaining = [];
  for (const file of triggered) {
    const changed = substantiveChangedLines(base, head, file);
    if (!changed.length) continue; // 캐시키만 바뀐 파일
    if (!SHELLS.has(file)) { remaining.push(`${file}(실변경 ${changed.length}줄)`); continue; }
    let text;
    try { text = fs.readFileSync(path.resolve(file), "utf8"); }
    catch { return { run: true, reason: `셸을 읽지 못했다: ${file} (fail-closed)` }; }
    const regions = paymentRegions(text);
    if (!regions.length) return { run: true, reason: `셸에서 결제 구간을 못 찾았다: ${file} (fail-closed)` };
    const inside = changed.filter((ln) => regions.some(([s, e]) => ln >= s && ln <= e));
    if (inside.length) remaining.push(`${file}(결제 구간 ${inside.length}줄)`);
  }

  if (remaining.length) return { run: true, reason: `실제 결제 관련 변경: ${remaining.slice(0, 4).join(", ")}` };
  return { run: false, reason: `셸/미러의 비결제 변경뿐 (트리거 매칭 ${triggered.length}개)` };
}

let verdict;
try {
  verdict = decide();
} catch (error) {
  verdict = { run: true, reason: `판정 실패: ${error.message} (fail-closed)` };
}
console.log(`[paid-gate-scope] run=${verdict.run} — ${verdict.reason}`);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `run=${verdict.run}\n`);
}
