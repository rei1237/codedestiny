import { spawnSync } from "node:child_process";

// Worker 승격(`wrangler versions deploy`)이 성공을 반환해도 전 세계 엣지에 퍼지는 데는 초 단위
// 지연이 있다 — Pages 별칭 전환(verify-deployed-assets.mjs)과 같은 성질이다. 같은 이유로 같은
// /api/version 엔드포인트를 재는 verify-deployed-sha.mjs 가 이미 6회×10초 재시도 예산으로
// 이 문제를 풀어 두었으므로 그 값을 그대로 쓴다(예산을 갈라 둘 근거가 없다).
const PARITY_ATTEMPTS = 6;
const PARITY_DELAY_MS = 10_000;

const PAYMENT_BOUNDARY_FILES = new Set([
  "app/_lib/billing-client.ts",
  "js/core/access-store.js",
  "worker/routes/access.js",
  "worker/routes/billing.js",
  "worker/routes/payments.js",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function needsWorkerParity(files) {
  return files.some((file) => PAYMENT_BOUNDARY_FILES.has(String(file || "").trim()));
}

/**
 * 호출자가 "이번 릴리스는 Worker 를 실제로 승격했다"고 알려 준 경우. 그러면 두 계층은 무조건
 * 같은 커밋이어야 하므로 아래의 변경 파일 추정을 건너뛴다 — 추정은 그 사실을 모를 때만 쓰는 대용품이다.
 */
function parityIsMandatory(argv) {
  return argv.includes("--worker-promoted");
}

function changedFilesForCommit(commit) {
  const result = spawnSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", commit], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error("Could not inspect files changed by the Pages deploy commit.");
  return String(result.stdout || "").split(/\r?\n/).map((file) => file.trim()).filter(Boolean);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readRuntimeCommit(versionUrl) {
  const response = await fetch(versionUrl, {
    headers: { Accept: "application/json", "Cache-Control": "no-store" },
    cache: "no-store",
  });
  assert(response.ok, `Worker version endpoint returned HTTP ${response.status}.`);
  const payload = await response.json();
  const actualCommit = String(payload?.commit || payload?.gitSha || "").trim();
  assert(actualCommit, "Worker version endpoint did not expose a commit SHA.");
  return actualCommit;
}

/**
 * 첫 응답만 보고 실패시키면, 방금 정상적으로 승격된 Worker 를 전파 지연 때문에 되돌리게 된다
 * (2026-08-11 PR #466 릴리스: Worker 는 이미 새 커밋으로 100% 승격됐지만, 승격 28초 뒤 이
 * 검사가 아직 옛 커밋을 서빙하던 엣지를 만나 FAIL 했고, 그 결과 정상 배포가 자동 롤백됐다).
 * 재시도 예산을 다 써도 다르면 그건 전파 지연이 아니라 실제 불일치이므로 그대로 실패한다.
 */
async function verifyRuntimeCommit(expectedCommit, versionUrl) {
  let lastError = "";
  for (let attempt = 1; attempt <= PARITY_ATTEMPTS; attempt += 1) {
    try {
      const actualCommit = await readRuntimeCommit(versionUrl);
      if (actualCommit === expectedCommit) {
        if (attempt > 1) console.log(`[verify-pages-worker-parity] PASS on attempt ${attempt}/${PARITY_ATTEMPTS}.`);
        return;
      }
      lastError = `Worker commit ${actualCommit.slice(0, 12)} does not match Pages commit ${expectedCommit.slice(0, 12)}.`;
    } catch (error) {
      lastError = error.message;
    }
    if (attempt < PARITY_ATTEMPTS) {
      console.log(`[verify-pages-worker-parity] 대기 ${attempt}/${PARITY_ATTEMPTS}: ${lastError}`);
      await sleep(PARITY_DELAY_MS);
    }
  }
  throw new Error(lastError);
}

async function main() {
  if (process.argv.includes("--self-test")) {
    assert(needsWorkerParity(["app/_lib/billing-client.ts"]), "billing client changes must require Worker parity");
    assert(needsWorkerParity(["worker/routes/access.js"]), "access route changes must require Worker parity");
    assert(!needsWorkerParity(["app/page.tsx"]), "unrelated Pages changes must not require Worker parity");
    assert(parityIsMandatory(["--worker-promoted"]), "--worker-promoted must force parity regardless of changed files");
    assert(!parityIsMandatory([]), "parity must stay heuristic when the caller says nothing");
    console.log("[verify-pages-worker-parity] self-test passed");
    return;
  }

  const expectedCommit = String(process.env.GITHUB_SHA || "").trim();
  assert(/^[0-9a-f]{7,64}$/i.test(expectedCommit), "GITHUB_SHA is required for Pages/Worker parity verification.");
  // 🔴 변경 파일 추정은 팁 커밋 하나만 본다(diff-tree -r <sha>). 로컬 배포는 커밋 여러 개를
  // 한 번에 내보내므로, 마지막 커밋이 결제 파일을 안 건드리면 검사가 스스로 꺼진다 —
  // 2026-08-11 릴리스(15커밋, billing.js·payments.js 포함)가 정확히 그렇게 건너뛰었다.
  // 팁 커밋은 조회 스크립트 하나만 바꿨기 때문이다. 그래서 Worker 승격 여부를 아는 호출자는
  // 추정에 맡기지 말고 --worker-promoted 로 사실을 통보한다.
  if (!parityIsMandatory(process.argv)) {
    const files = changedFilesForCommit(expectedCommit);
    if (!needsWorkerParity(files)) {
      console.log(`[verify-pages-worker-parity] skipped: no payment boundary files in ${expectedCommit.slice(0, 12)} (tip commit only).`);
      return;
    }
  }

  const versionUrl = String(process.env.CD_WORKER_VERSION_URL || "https://code-destiny.com/api/version").trim();
  assert(/^https:\/\//i.test(versionUrl), "CD_WORKER_VERSION_URL must be an HTTPS URL.");
  await verifyRuntimeCommit(expectedCommit, versionUrl);
  console.log(`[verify-pages-worker-parity] PASS: Worker and Pages commit ${expectedCommit.slice(0, 12)} match.`);
}

main().catch((error) => {
  console.error(`[verify-pages-worker-parity] FAIL: ${error.message}`);
  process.exitCode = 1;
});
