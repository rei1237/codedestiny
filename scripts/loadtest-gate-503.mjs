#!/usr/bin/env node
/**
 * loadtest-gate-503.mjs
 *
 * 진입 게이트 두 엔드포인트(/api/profile, /api/billing/coin-gate)의 503 발생률과
 * 레이턴시 분포(p50/p95/p99)를 통제된 부하로 측정한다. Phase 1 계측(서버 로그)과 함께
 * 검증 기준(p99<500ms, 503<0.01%, 피크 3배 동시성)을 확인하는 용도.
 *
 * 외부 의존성 없음(Node 18+ 내장 fetch). 실행 예:
 *   BASE_URL=https://code-destiny.com \
 *   AUTH_TOKEN="<로그인 JWT>" \
 *   TARGET=coin-gate CONCURRENCY=30 TOTAL=600 \
 *   node scripts/loadtest-gate-503.mjs
 *
 * ⚠️ 주의: 이 스크립트는 실제 서버에 요청을 보낸다. 프로덕션을 대상으로 할 때는
 *   - coin-gate는 '결제 확인(access_check)' 성격의 READ 프로브만 보내도록 dryRun 페이로드를 쓴다
 *     (아래 COIN_GATE_PROBE_BODY 참고 — 잠금해제/차감을 유발하지 않는 확인 전용 요청).
 *   - 반드시 낮은 동시성/총량으로 시작하고, CF rate-limit(coin-gate 20req/60s per user)에 유의한다.
 *     단일 토큰으로 고동시성을 주면 rate-limit(429)에 먼저 막혀 503 측정이 오염된다 —
 *     여러 사용자 토큰을 AUTH_TOKENS(콤마구분)로 넘겨 분산하는 것을 권장.
 */

const BASE_URL = (process.env.BASE_URL || "").replace(/\/+$/, "");
const AUTH_TOKENS = String(process.env.AUTH_TOKENS || process.env.AUTH_TOKEN || "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
const TARGET = String(process.env.TARGET || "profile").trim(); // "profile" | "coin-gate"
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 10));
const TOTAL = Math.max(1, Number(process.env.TOTAL || 200));
const TIMEOUT_MS = Math.max(1000, Number(process.env.TIMEOUT_MS || 15000));

if (!BASE_URL) {
  console.error("BASE_URL 환경변수가 필요합니다 (예: https://code-destiny.com).");
  process.exit(1);
}
if (!AUTH_TOKENS.length) {
  console.error("AUTH_TOKEN 또는 AUTH_TOKENS(콤마구분) 환경변수가 필요합니다 (로그인 JWT).");
  process.exit(1);
}

// coin-gate 확인 전용 프로브 페이로드. featureKey는 실제 유료 기능 키로 교체.
// dryRun/checkOnly 성격이라 잠금해제·차감 없이 게이트 판정만 유발한다.
const COIN_GATE_PROBE_BODY = {
  featureKey: process.env.COIN_GATE_FEATURE_KEY || "saju.analysis",
  paymentMode: "CHECK",
  dryRun: true,
};

function endpointFor(target) {
  if (target === "coin-gate") {
    return {
      url: `${BASE_URL}/api/billing/coin-gate`,
      method: "POST",
      body: JSON.stringify(COIN_GATE_PROBE_BODY),
      headers: { "Content-Type": "application/json" },
    };
  }
  return { url: `${BASE_URL}/api/profile`, method: "GET", body: undefined, headers: {} };
}

function percentile(sortedMs, p) {
  if (!sortedMs.length) return 0;
  const idx = Math.min(sortedMs.length - 1, Math.floor((p / 100) * sortedMs.length));
  return sortedMs[idx];
}

async function oneRequest(tokenIdx) {
  const spec = endpointFor(TARGET);
  const token = AUTH_TOKENS[tokenIdx % AUTH_TOKENS.length];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const res = await fetch(spec.url, {
      method: spec.method,
      headers: {
        ...spec.headers,
        Authorization: `Bearer ${token}`,
        Cookie: `access_token=${token}`,
      },
      body: spec.body,
      signal: controller.signal,
    });
    // 503 진단 신호(X-Error-Code / code)도 함께 수집.
    let code = "";
    try {
      const data = await res.clone().json();
      code = String(data?.code || data?.error?.code || "");
    } catch {
      code = res.headers.get("X-Error-Code") || "";
    }
    return { ms: Date.now() - startedAt, status: res.status, code };
  } catch (error) {
    return { ms: Date.now() - startedAt, status: 0, code: error?.name === "AbortError" ? "TIMEOUT" : "FETCH_ERROR" };
  } finally {
    clearTimeout(timer);
  }
}

async function run() {
  console.log(
    `[loadtest] target=${TARGET} base=${BASE_URL} concurrency=${CONCURRENCY} total=${TOTAL} tokens=${AUTH_TOKENS.length}`,
  );
  const results = [];
  let dispatched = 0;
  const wallStart = Date.now();

  async function worker(workerIdx) {
    while (dispatched < TOTAL) {
      const myIndex = dispatched++;
      if (myIndex >= TOTAL) break;
      results.push(await oneRequest(workerIdx));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  const wallMs = Date.now() - wallStart;
  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const byStatus = {};
  const byCode = {};
  for (const r of results) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    if (r.code) byCode[r.code] = (byCode[r.code] || 0) + 1;
  }
  const count503 = byStatus[503] || 0;
  const rate503 = results.length ? (count503 / results.length) * 100 : 0;

  console.log("\n===== 결과 =====");
  console.log(`총 요청: ${results.length}  |  소요: ${wallMs}ms  |  처리량: ${(results.length / (wallMs / 1000)).toFixed(1)} req/s`);
  console.log(`레이턴시  p50=${percentile(latencies, 50)}ms  p95=${percentile(latencies, 95)}ms  p99=${percentile(latencies, 99)}ms  max=${latencies[latencies.length - 1] || 0}ms`);
  console.log(`상태코드 분포: ${JSON.stringify(byStatus)}`);
  console.log(`에러 code 분포: ${JSON.stringify(byCode)}`);
  console.log(`503 발생률: ${rate503.toFixed(3)}%  (기준 <0.01%)`);
  console.log("\n판정:");
  console.log(`  p99<500ms  : ${percentile(latencies, 99) < 500 ? "PASS" : "FAIL"}`);
  console.log(`  503<0.01%  : ${rate503 < 0.01 ? "PASS" : "FAIL"}`);
}

run().catch((error) => {
  console.error("[loadtest] 실행 실패:", error);
  process.exit(1);
});
