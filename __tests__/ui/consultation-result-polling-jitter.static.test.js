/**
 * @jest-environment node
 *
 * "/prepare 재시도가 풀 포화 순간 재시도 폭풍을 만든다"의 회귀 가드.
 *
 * runAccessCheckWithTransientRetry(16개 유료 기능 페이지가 공유)의 백오프가 완전히 결정론적
 * (250ms → 450ms → 810ms, 항상 동일)이면, 동시에 실패한 여러 사용자가 정확히 같은 시점에
 * 함께 재시도해 막 회복 중인 Mongo 풀을 다시 두들긴다. 지터를 넣어 재시도 시점을 흩뜨리되,
 * 시도 횟수·총 예산·재시도 트리거 조건(maxAttempts/baseDelayMs/PASS_CHECK_BUDGET_MS)은
 * 그대로 유지해야 한다 — 이 값들은 2026-07-29 사고 이후 이미 튜닝된 UX 예산이다.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(
  path.join(root, "app/_lib/consultationResultPolling.ts"),
  "utf8",
);

test("백오프 지연에 지터가 들어갔다", () => {
  assert.match(source, /const delayMs = Math\.round\(Math\.random\(\) \* baseDelayMs \* Math\.pow\(1\.8, i - 1\)\);/);
  // 결정론적(지터 없는) 이전 수식으로 되돌아가지 않았는지 확인한다.
  assert.doesNotMatch(source, /const delayMs = Math\.round\(baseDelayMs \* Math\.pow\(1\.8, i - 1\)\);/);
});

test("시도 횟수·기본 지연·총 예산은 그대로다", () => {
  assert.match(source, /const maxAttempts = Math\.max\(1, Math\.min\(6, Math\.floor\(options\.maxAttempts \?\? 4\)\)\);/);
  assert.match(source, /const baseDelayMs = Math\.max\(0, Math\.floor\(options\.baseDelayMs \?\? 250\)\);/);
  assert.match(source, /export const PASS_CHECK_BUDGET_MS = 15000;/);
});

test("지수 백오프 상한 공식 자체는 유지된다", () => {
  assert.match(source, /Math\.pow\(1\.8, i - 1\)/);
});
