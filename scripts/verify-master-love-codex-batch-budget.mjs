#!/usr/bin/env node
/**
 * 마스터 인연의 서 — 배치 시간 예산 회귀 가드.
 *
 * 🔴 이 스크립트는 LLM 을 호출하지 않는다. 라우트가 노출한 순수 함수/상수만 검증한다
 *    (검증은 mock 이 기본, 실호출은 사용자 허락 필수 — CLAUDE.md 코딩 원칙 8).
 *
 * 무엇을 지키는가
 *  1. 배치 예산이 엣지 컷(100초) 안쪽이고, 락 TTL 이 그 예산과 한 세트일 것
 *  2. withDeadline 이 예산을 넘긴 대기를 deferred 로 끊고, 진 프라미스의 거부를 흘리지 않을 것
 *  3. planBatchCommit 이 '선두 연속분만' 커밋할 것 (챕터 번호에 구멍이 나면 안 된다)
 *
 * 배경: CHAPTER_TIMEOUT_MS 는 Gemini fetch 하나만 묶는다. 그 뒤 Workers AI 폴백 체인은
 *       타임아웃이 없어(lib/llm-client.ts callCloudflareWorkersAI), 예산이 없으면 배치가
 *       엣지에 잘려 클라이언트가 JSON 대신 게이트웨이 HTML 을 받는다.
 */

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const {
  withDeadline, planBatchCommit,
  BATCH_BUDGET_MS, BATCH_LOCK_TTL_MS, CHAPTER_MIN_BUDGET_MS, EDGE_RESPONSE_DEADLINE_MS,
} = (await import("../worker/routes/master-love-codex.js")).__masterLoveCodexTestUtils;

// ── 1. 상수 불변식 ───────────────────────────────────────────────────────────
assert(
  BATCH_BUDGET_MS < EDGE_RESPONSE_DEADLINE_MS,
  `배치 예산(${BATCH_BUDGET_MS}ms)은 엣지 컷(${EDGE_RESPONSE_DEADLINE_MS}ms)보다 짧아야 합니다`,
);
assert(
  EDGE_RESPONSE_DEADLINE_MS - BATCH_BUDGET_MS >= 15_000,
  `엣지 컷까지 최소 15초 여유가 있어야 합니다(인증·DB 왕복·병합 저장 몫) — 현재 ${EDGE_RESPONSE_DEADLINE_MS - BATCH_BUDGET_MS}ms`,
);
assert(
  BATCH_LOCK_TTL_MS > BATCH_BUDGET_MS,
  `락 TTL(${BATCH_LOCK_TTL_MS}ms)이 배치 예산(${BATCH_BUDGET_MS}ms)보다 짧으면 생성 중인 배치가 중복 기동됩니다`,
);
assert(
  BATCH_LOCK_TTL_MS <= 150_000,
  `락 TTL(${BATCH_LOCK_TTL_MS}ms)이 길면 엣지 컷으로 락 해제 코드가 못 돌았을 때 그만큼 재시도가 막힙니다`,
);
assert(
  CHAPTER_MIN_BUDGET_MS > 0 && CHAPTER_MIN_BUDGET_MS < BATCH_BUDGET_MS,
  `장 최소 예산(${CHAPTER_MIN_BUDGET_MS}ms)은 0보다 크고 배치 예산보다 작아야 합니다`,
);

// ── 2. withDeadline ──────────────────────────────────────────────────────────
{
  const fast = await withDeadline(Promise.resolve("done"), Date.now() + 1_000);
  assert(fast.value === "done", "withDeadline: 예산 안에 끝난 값은 그대로 통과해야 합니다");
  assert(!fast.deferred, "withDeadline: 정상 완료를 deferred 로 표시하면 안 됩니다");
}
{
  const slow = new Promise((resolve) => setTimeout(() => resolve("late"), 200));
  const raced = await withDeadline(slow, Date.now() + 30);
  assert(raced.deferred === true, "withDeadline: 예산을 넘긴 대기는 deferred 여야 합니다");
  assert(raced.value === undefined, "withDeadline: 예산 초과 시 값을 돌려주면 안 됩니다");
}
{
  const already = await withDeadline(Promise.resolve("x"), Date.now() - 1);
  assert(already.deferred === true, "withDeadline: 이미 예산이 끝났으면 즉시 deferred 여야 합니다");
}
{
  // 🔴 타이머가 이긴 뒤 원래 프라미스가 거부해도 unhandled rejection 이 남으면 안 된다.
  let unhandled = null;
  const onUnhandled = (reason) => { unhandled = reason; };
  process.on("unhandledRejection", onUnhandled);
  const rejectsLate = new Promise((_, reject) => setTimeout(() => reject(new Error("late boom")), 60));
  const raced = await withDeadline(rejectsLate, Date.now() + 20);
  assert(raced.deferred === true, "withDeadline: 늦게 거부되는 프라미스도 예산에서 끊어야 합니다");
  await new Promise((resolve) => setTimeout(resolve, 150));
  process.off("unhandledRejection", onUnhandled);
  assert(unhandled === null, `withDeadline: 진 프라미스의 거부가 새어 나왔습니다 (${unhandled?.message || unhandled})`);
}
{
  // 예산 안에서 거부하면 값이 아니라 error 로 접혀 돌아와야 한다(호출부가 다시 throw 한다).
  const raced = await withDeadline(Promise.reject(new Error("boom")), Date.now() + 1_000);
  assert(raced.error instanceof Error && raced.error.message === "boom", "withDeadline: 예산 안 거부는 error 로 접어 돌려줘야 합니다");
  assert(!raced.deferred, "withDeadline: 예산 안 거부를 deferred 로 표시하면 안 됩니다");
}

// ── 3. planBatchCommit ───────────────────────────────────────────────────────
const chapterOf = (order) => ({ id: `ch${order}`, order });
const resultOf = (status, order) => ({ status, chapter: status === "deferred" ? null : chapterOf(order), loveDna: null });

{
  const committed = planBatchCommit([resultOf("ok", 1), resultOf("ok", 2), resultOf("ok", 3), resultOf("ok", 4)]);
  assert(committed.length === 4, `전부 성공하면 4장 모두 커밋해야 합니다 (현재 ${committed.length})`);
}
{
  // 🔴 뒤쪽 성공분(4)을 주워 담으면 챕터 번호에 구멍이 난다. startIndex 는 chapters.length 이므로
  //    구멍이 생기면 그 뒤 장이 영영 다른 번호로 밀린다.
  const committed = planBatchCommit([resultOf("ok", 1), resultOf("ok", 2), resultOf("deferred"), resultOf("ok", 4)]);
  assert(committed.length === 2, `deferred 앞까지만 커밋해야 합니다 (현재 ${committed.length})`);
  assert(
    committed.every((entry) => entry.status !== "deferred"),
    "커밋 목록에 deferred 가 섞이면 사과문조차 없는 빈 장이 저장됩니다",
  );
}
{
  // 예산 안에서 실패한 장(사과문)은 저장한다 — 결제 후 결과는 반드시 전달한다는 기존 계약.
  const committed = planBatchCommit([resultOf("ok", 1), resultOf("fallback", 2), resultOf("ok", 3)]);
  assert(committed.length === 3, `fallback 은 저장 대상입니다 (현재 ${committed.length})`);
}
{
  const committed = planBatchCommit([resultOf("deferred"), resultOf("ok", 2)]);
  assert(committed.length === 0, "첫 장부터 예산을 넘겼으면 아무것도 커밋하지 않아야 합니다(→ retryable 503)");
}
{
  assert(planBatchCommit([]).length === 0, "빈 배치는 빈 커밋이어야 합니다");
  assert(planBatchCommit([null, resultOf("ok", 2)]).length === 0, "비정상 항목은 그 지점에서 잘라야 합니다");
}

if (failures.length) {
  console.error("[verify-master-love-codex-batch-budget] FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("[verify-master-love-codex-batch-budget] OK");
