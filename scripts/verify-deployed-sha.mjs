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
 */

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

async function fetchSha(url) {
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
  ];
  for (const [actual, expected, label] of cases) {
    if (actual !== expected) throw new Error(`self-test 실패: ${label}`);
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

main().catch((error) => {
  console.error(`[verify-deployed-sha] FAIL: ${error.message}`);
  process.exitCode = 1;
});
