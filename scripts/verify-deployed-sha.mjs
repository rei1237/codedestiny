#!/usr/bin/env node

/**
 * 프로덕션에 실제로 떠 있는 코드가 이번 릴리스의 커밋인지 확인한다.
 *
 * Pages 와 Worker 는 서로 다른 시스템이라, 한쪽만 성공해도 배포는 "끝난 것처럼" 보인다.
 * 그 상태가 위험한 이유는 두 계층이 **서로 다른 계약으로 대화**하기 때문이다 — 새 클라이언트가
 * 없는 API 를 부르거나, 옛 클라이언트가 바뀐 응답을 못 읽는다. 결제·접근 상태처럼 양쪽이
 * 맞물린 변경에서는 그 어긋남이 곧 매출 사고다.
 *
 * 그래서 배포 후 두 곳을 모두 읽어 **같은 SHA** 인지 확인하고, 하나라도 다르면 실패시킨다.
 *   - Pages: <origin>/version.json  (scripts/write-version-json.mjs 가 빌드 시 기록)
 *   - Worker: <origin>/api/version  (배포 시 --var COMMIT_SHA 로 주입)
 *
 * 배포 직후에는 엣지 전파가 끝나지 않아 옛 값이 잠깐 보일 수 있으므로 재시도한다.
 * 재시도가 끝나도 다르면 그것은 전파 지연이 아니라 실제 불일치다.
 *
 * 기존 scripts/verify-pages-worker-parity.mjs 는 "Worker 가 Pages 커밋과 같은가"만 본다.
 * 여기서는 기대 SHA(=이번에 머지된 main 커밋)를 바깥에서 주입해 **양쪽 모두**를 대조한다.
 *
 * 🔴 이 파일은 다른 스크립트가 import 하는 모듈이기도 하다(verify-merge-landed.mjs 가
 * readProductionShas 를 쓴다). 그래서 맨 아래 main() 호출에 엔트리포인트 가드가 있다 —
 * 가드를 빼면 import 하는 순간 main() 이 돌아 "기대 SHA 가 필요합니다"로 던지고
 * process.exitCode = 1 을 남긴다. 부르는 쪽은 자기가 실패한 줄 알게 된다.
 */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ORIGIN = "https://code-destiny.com";
const DEFAULT_ATTEMPTS = 6;
const DEFAULT_DELAY_MS = 10_000;

function argValue(name, argv = process.argv) {
  const prefix = `--${name}=`;
  const inline = argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? String(argv[index + 1] || "").trim() : "";
}

export function normalizeSha(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * 두 SHA 가 같은 커밋을 가리키는지. 한쪽이 축약형(short SHA)이어도 접두사로 일치하면 같은 커밋이다.
 * 7자 미만은 우연 일치가 가능하므로 비교를 거부한다.
 */
export function shaMatches(expected, actual) {
  const left = normalizeSha(expected);
  const right = normalizeSha(actual);
  if (!/^[0-9a-f]{7,64}$/.test(left) || !/^[0-9a-f]{7,64}$/.test(right)) return false;
  const length = Math.min(left.length, right.length);
  return left.slice(0, length) === right.slice(0, length);
}

/** /version.json 과 /api/version 은 필드 이름이 조금씩 다르다. 둘 다 받아 준다. */
export function readShaFromPayload(payload) {
  return normalizeSha(payload?.gitSha || payload?.commit || payload?.commitShort || "");
}

export async function fetchSha(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "Cache-Control": "no-store" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const sha = readShaFromPayload(await response.json());
  if (!sha) throw new Error("응답에 커밋 SHA 가 없습니다.");
  return sha;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyTarget(label, url, expected, attempts, delayMs) {
  let last = "";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const actual = await fetchSha(url);
      if (shaMatches(expected, actual)) {
        console.log(`[verify-deployed-sha] ${label} PASS ${actual.slice(0, 12)} (${url})`);
        return { ok: true, actual };
      }
      last = actual;
      console.log(`[verify-deployed-sha] ${label} 대기 ${attempt}/${attempts}: ${actual.slice(0, 12)} != ${expected.slice(0, 12)}`);
    } catch (error) {
      last = `error: ${error.message}`;
      console.log(`[verify-deployed-sha] ${label} 대기 ${attempt}/${attempts}: ${error.message}`);
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  console.error(`[verify-deployed-sha] ${label} FAIL expected=${expected.slice(0, 12)} actual=${String(last).slice(0, 40)} (${url})`);
  return { ok: false, actual: last };
}

/**
 * "지금 프로덕션에 떠 있는 것은 무엇인가"를 한 번 읽는다.
 *
 * verifyTarget() 과 재시도의 의미가 다르다. 저쪽은 기대 SHA 가 나타날 때까지 전파를 기다리지만,
 * 여기서는 **불일치가 곧 답**이라 기다릴 이유가 없다. 그래서 네트워크 실패에만 재시도한다.
 * 드리프트 감시가 "잠깐 기다리면 맞겠지" 하고 늘어지면 감시의 의미가 없어진다.
 */
export async function readProductionShas({
  origin = DEFAULT_ORIGIN,
  skipWorker = false,
  attempts = 2,
  delayMs = 5_000,
} = {}) {
  const base = String(origin || DEFAULT_ORIGIN).replace(/\/+$/, "");
  const read = async (url) => {
    let error = "";
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return { sha: await fetchSha(url), error: null };
      } catch (cause) {
        error = cause.message;
        if (attempt < attempts) await sleep(delayMs);
      }
    }
    return { sha: null, error };
  };

  return {
    origin: base,
    pages: await read(`${base}/version.json`),
    worker: skipWorker ? { sha: null, error: null, skipped: true } : await read(`${base}/api/version`),
  };
}

/**
 * 직접 실행인가, import 인가. win32 는 호출 경로에 따라 드라이브 문자 대소문자가 달라진다.
 */
function isEntrypoint() {
  const entry = process.argv[1];
  if (!entry) return false;
  const self = fileURLToPath(import.meta.url);
  const invoked = resolve(entry);
  if (invoked === self) return true;
  return process.platform === "win32" && invoked.toLowerCase() === self.toLowerCase();
}

function selfTest() {
  const cases = [
    [shaMatches("abcdef1234567890", "abcdef1234567890"), true, "동일한 전체 SHA 는 일치"],
    [shaMatches("abcdef1234567890", "abcdef123456"), true, "축약형은 접두사로 일치"],
    [shaMatches("abcdef123456", "ABCDEF1234567890"), true, "대소문자는 무시"],
    [shaMatches("abcdef1234567890", "1234567890abcdef"), false, "다른 커밋은 불일치"],
    [shaMatches("abcdef1234567890", "abcde"), false, "7자 미만은 비교 거부"],
    [shaMatches("abcdef1234567890", ""), false, "빈 값은 불일치"],
    [shaMatches("", "abcdef1234567890"), false, "기대값이 비면 불일치"],
    [shaMatches("abcdef1234567890", "unknown"), false, "unknown 은 SHA 가 아니다"],
    [readShaFromPayload({ gitSha: "ABC1234567" }) === "abc1234567", true, "gitSha 를 읽는다"],
    [readShaFromPayload({ commit: "abc1234567" }) === "abc1234567", true, "commit 을 읽는다"],
    [readShaFromPayload({ commitShort: "abc1234567" }) === "abc1234567", true, "commitShort 를 읽는다"],
    [readShaFromPayload({ gitSha: null, commit: null }) === "", true, "null 이면 빈 문자열"],
    [argValue("sha", ["--sha=abc123"]) === "abc123", true, "--sha=값 형식"],
    [argValue("sha", ["--sha", "abc123"]) === "abc123", true, "--sha 값 형식"],
    [argValue("sha", []) === "", true, "인자가 없으면 빈 문자열"],
    [typeof fetchSha === "function", true, "fetchSha 는 재사용 가능하게 export 된다"],
    [typeof readProductionShas === "function", true, "readProductionShas 는 재사용 가능하게 export 된다"],
    // self-test 는 직접 실행으로만 도달하므로 여기서는 항상 참이어야 한다.
    [isEntrypoint(), true, "직접 실행이면 엔트리포인트로 인식한다"],
  ];
  for (const [actual, expected, label] of cases) {
    if (actual !== expected) throw new Error(`self-test 실패: ${label}`);
  }

  // 🔴 반대 방향이 진짜로 지켜야 할 쪽이다. 다른 스크립트가 이 모듈을 import 하면
  // argv[1] 은 그 스크립트가 되고, 그때 main() 이 돌면 부르는 쪽이 exit 1 을 뒤집어쓴다.
  const realEntry = process.argv[1];
  try {
    process.argv[1] = resolve("scripts", "some-other-script.mjs");
    if (isEntrypoint()) throw new Error("self-test 실패: import 경로를 엔트리포인트로 오인한다");
  } finally {
    process.argv[1] = realEntry;
  }

  console.log("[verify-deployed-sha] self-test passed");
}

async function main() {
  if (process.argv.includes("--self-test")) return selfTest();

  const expected = normalizeSha(argValue("sha") || process.env.GITHUB_SHA || "");
  if (!/^[0-9a-f]{7,64}$/.test(expected)) {
    throw new Error("기대 SHA 가 필요합니다: --sha=<commit> 또는 GITHUB_SHA.");
  }

  const origin = (argValue("origin") || process.env.CD_PRODUCTION_ORIGIN || DEFAULT_ORIGIN).replace(/\/+$/, "");
  if (!/^https:\/\//i.test(origin)) throw new Error("origin 은 HTTPS 절대 URL 이어야 합니다.");

  const attempts = Number(argValue("attempts") || DEFAULT_ATTEMPTS);
  const delayMs = Number(argValue("delay-ms") || DEFAULT_DELAY_MS);
  const skipWorker = process.argv.includes("--skip-worker");

  console.log(`[verify-deployed-sha] expected=${expected.slice(0, 12)} origin=${origin}`);

  const pages = await verifyTarget("Pages", `${origin}/version.json`, expected, attempts, delayMs);
  const worker = skipWorker
    ? { ok: true, actual: "skipped", skipped: true }
    : await verifyTarget("Worker", argValue("worker-version-url") || `${origin}/api/version`, expected, attempts, delayMs);

  if (skipWorker) console.log("[verify-deployed-sha] Worker 검증 생략: 이번 릴리스는 Worker 를 승격하지 않았습니다.");

  // GitHub Actions 요약에 그대로 실을 수 있도록 결과를 한 줄로 남긴다.
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_OUTPUT, `pages_sha=${pages.actual}\nworker_sha=${worker.actual}\n`);
  }

  if (!pages.ok || !worker.ok) {
    throw new Error("배포된 SHA 가 이번 릴리스 커밋과 일치하지 않습니다.");
  }
  console.log(`[verify-deployed-sha] PASS: Pages 와 Worker 모두 ${expected.slice(0, 12)} 입니다.`);
}

if (isEntrypoint()) {
  main().catch((error) => {
    console.error(`[verify-deployed-sha] FAIL: ${error.message}`);
    process.exitCode = 1;
  });
}
