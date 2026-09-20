import { connectDb } from "./db.js";
import { MasterLoveCodexSession } from "./models.js";
import { recoverCodexSession } from "./master-love-codex-session-access.js";
import { acquireBatchLock, runCodexWave, syncCodexExecution, diagnoseCodexSession, __masterLoveCodexTestUtils } from "../routes/master-love-codex.js";
import { bootstrapPaidCodexSessions } from "./master-love-codex-paid-bootstrap.js";

/**
 * 마스터 인연의 서 — 버려진 생성 세션의 **백스톱**.
 *
 * 인연의 서는 20장을 4장씩 5~8왕복으로 쓴다(왕복당 예산 78초). 그 루프의 주체는 브라우저이고,
 * 이제 결과 화면이 이어받는다(src/features/master-love-codex/_lib/runCodexBatches.ts). 그래도
 * 탭이 닫히거나 기기가 잠들면 세션은 미완인 채 남는다 — 결제는 이미 끝난 상태다.
 * 그 세션을 사람 손 없이 완주까지 밀어 올리는 것이 이 태스크다.
 *
 * 틱당 최대 3세션을 순환하며 4분 예산이 남으면 진행된 세션의 다음 웨이브도 실행한다.
 *
 * 🔴 **크론을 새로 만들지 않는다.** worker/wrangler.toml 의 crons 는 수정 금지 대상이라
 *    기존 10분 크론("*\/10 * * * *")의 태스크 목록에 얹혀 간다(worker/index.js). 선례는
 *    같은 자리의 runSnsDailyPostRecovery 다.
 *
 * 🔴 여기의 ctx.waitUntil 은 **scheduled 핸들러**의 것이라, 9850c8906 이 7개 라우트에서 지운
 *    "fetch 요청 컨텍스트의 waitUntil" 금지와 다른 것이다. 그 금지의 실패 모드는 공유 mongoose
 *    연결을 여러 **동시 요청**이 재사용하면서 생기는 Workers 요청 간 I/O 격리였고, 크론 틱은
 *    그 연결을 나눠 쓰는 주체가 아니다.
 *
 * 🔴 **락은 라우트의 acquireBatchLock 을 그대로 부른다.** 그 필터의 status 조건이 완료 세션을
 *    되살리지 않는 유일한 보장이다. 여기서 쿼리를 새로 짜면 그 보장이 둘로 갈라진다.
 */

/** 락 획득 후 웨이브 하나에 주는 예산. 라우트의 BATCH_BUDGET_MS 와 같은 값을 쓴다. */
const WAVE_BUDGET_MS = __masterLoveCodexTestUtils.BATCH_BUDGET_MS;

/**
 * 이보다 최근에 손댄 세션은 건드리지 않는다.
 *
 * 🔴 살아 있는 브라우저 루프와 경합하지 않기 위한 값이다. 왕복 1회가 78초까지 걸리고 그 사이
 *    updatedAt 이 갱신되지 않으므로, 왕복 예산의 서너 배는 떨어져 있어야 "정말 버려진 세션"이다.
 *    (경합해도 데이터는 안 깨진다 — 커밋이 lockToken 으로 핀된다. 낭비되는 것은 LLM 비용뿐이다.)
 */
const ABANDONED_AFTER_MS = 5 * 60 * 1000;

/** 틱당 손대는 세션 수. 10분 주기 안에 여유롭게 끝나야 한다. */
const MAX_SESSIONS_PER_TICK = 3;

/** 태스크 전체 벽시계 상한. 새 웨이브를 시작하기 전에 남은 시간을 확인한다. */
const TASK_BUDGET_MS = 4 * 60 * 1000;

/** 버려진 미완성 세션 후보. 락이 비어 있는 것만 고른다(라우트 필터와 같은 형태). */
export function buildAbandonedFilter(now) {
  return {
    status: { $in: ["generating", "delivery_pending", "generation_failed"] },
    updatedAt: { $lt: new Date(now - ABANDONED_AFTER_MS) },
    // 환급이 끝난 세션은 이미 값이 돌아간 것이다 — 공짜로 완성시키지 않는다.
    // 🔴 코인·월정석은 돌려줘도 세션 자체는 멀쩡해서 recoverCodexSession 이 막지 못한다
    //    (그쪽이 거절하는 것은 취소된 카드 결제뿐이다). 여기서 빼는 것이 유일한 방어다.
    "passRefund.refundedAt": { $exists: false },
    "billingRefund.refundedAt": { $exists: false },
    "deliveryMeta.reviewRequired": { $ne: true },
    $and: [{ $or: [{ "deliveryMeta.nextAttemptAt": { $exists: false } }, { "deliveryMeta.nextAttemptAt": null },
      { "deliveryMeta.nextAttemptAt": { $lte: new Date(now) } }] }],
    $or: [
      { "generationProgress.lockedAt": { $exists: false } },
      { "generationProgress.lockedAt": null },
      { "generationProgress.lockedAt": { $lt: new Date(now - __masterLoveCodexTestUtils.BATCH_LOCK_TTL_MS) } },
    ],
  };
}

export function buildCodexStalledFilter(now) {
  const cutoff = new Date(now - 1800000);
  return { status: { $in: ["generating", "delivery_pending", "generation_failed"] },
    "passRefund.refundedAt": { $exists: false }, "billingRefund.refundedAt": { $exists: false },
    $or: [{ "deliveryMeta.lastProgressAt": { $lt: cutoff } }, { "deliveryMeta.lastProgressAt": null, createdAt: { $lt: cutoff } }] };
}

/**
 * 시도를 소진해 닫힌(reviewRequired) 세션 후보. 재개 사유는 JS 에서 두 갈래로 가른다.
 *
 * 🔴 두 표식을 따로 둔다 — 세션 하나가 각 사유로 **한 번씩만** 재개된다. 표식이 하나면
 *    두 사유가 서로의 1회를 잡아먹어, 정작 필요한 재개가 조용히 건너뛰어진다.
 */
export function buildCodexReopenFilter(marker = "dedupeReopenedAt") {
  return {
    status: "generation_failed",
    "deliveryMeta.reviewRequired": true,
    "deliveryMeta.reviewReason": "GENERATION_BUDGET_EXCEEDED",
    [`deliveryMeta.${marker}`]: { $exists: false },
    "passRefund.refundedAt": { $exists: false },
    "billingRefund.refundedAt": { $exists: false },
  };
}

function closedByDedupeMismatch(doc) {
  const ids = doc?.deliveryMeta?.exhaustedChapterIds;
  return Array.isArray(ids) && ids.length > 0 && ids.every(id => doc.deliveryMeta?.errors?.[id]?.code === "LLM_OUTPUT_REPEATED");
}

/**
 * 재개 계획을 세운다. **LLM 을 부르지 않고 저장된 문서만 읽는다.**
 *
 * 1. `dedupe_mismatch` — 소진된 장이 전부 LLM_OUTPUT_REPEATED 로 닫힌 세션(2026-09-17 수정
 *    이전의 판정 키 불일치). 그 장들의 시도 기록만 지워 한 번 더 기회를 준다. **먼저 본다** —
 *    이 갈래가 소진된 장까지 되살리므로, 한 번의 재개로 남은 장과 막힌 장이 함께 풀린다.
 * 2. `stale_close` — 아직 시도 가능한 장이 남아 있는데 닫힌 세션. 2026-09-19 이전 규칙은
 *    한 장이 3회를 소진하면 세션 전체를 닫았다(나머지 19장은 영영 시도되지 않았다). 이미
 *    그렇게 닫힌 운영 세션이 남아 있으므로 크론이 되살린다. **시도 기록은 지우지 않는다** —
 *    소진된 장은 소진된 채 두고, 남은 장만 쓰게 한다(불필요한 과금 호출 0).
 *
 * 둘 다 아니면 사람 검토 대상 그대로 둔다. 표식이 갈래별로 따로이므로 한 세션이 각 사유로
 * 한 번씩만 열리고, 두 번째 닫힘 뒤에는 사람이 본다.
 */
export function planCodexReopen(doc, diagnose) {
  const meta = doc?.deliveryMeta || {};
  // 🔴 닫힌 세션만 연다. DB 필터에만 의존하면 살아 있는 세션을 "재개"하면서 락·진행 상태를
  //    건드릴 수 있다 — 판정은 호출부가 아니라 이 함수가 갖는다(fail-closed).
  if (doc?.status !== "generation_failed" || meta.reviewRequired !== true) return null;
  // The self chapter explicitly forbids partner interpretation. v3 nevertheless required it.
  // Restore exactly one reservation for this known contract defect, never the whole book.
  if (doc.mode === "compat" && !meta.evidenceScopeReopenedAt
      && meta.errors?.self?.code === "LLM_PARTNER_EVIDENCE_MISSING") {
    return { marker: "evidenceScopeReopenedAt", reason: "evidence_scope_mismatch",
      set: { "deliveryMeta.attempts.self": __masterLoveCodexTestUtils.CHAPTER_ATTEMPT_LIMIT - 1,
        "deliveryMeta.failures.self": __masterLoveCodexTestUtils.CHAPTER_ATTEMPT_LIMIT - 1 },
      unset: { "deliveryMeta.reviewReason": "", "deliveryMeta.exhaustedChapterIds": "", "deliveryMeta.errors.self": "" } };
  }
  if (closedByDedupeMismatch(doc) && !meta.dedupeReopenedAt) {
    const unset = { "deliveryMeta.reviewReason": "", "deliveryMeta.exhaustedChapterIds": "" };
    for (const id of meta.exhaustedChapterIds) {
      for (const field of ["attempts", "failures", "errors"]) unset[`deliveryMeta.${field}.${id}`] = "";
    }
    return { marker: "dedupeReopenedAt", reason: "dedupe_mismatch", unset };
  }
  if (!meta.codexReopenedAt && diagnose(doc).actionable.length) {
    return { marker: "codexReopenedAt", reason: "stale_close", unset: { "deliveryMeta.reviewReason": "" } };
  }
  return null;
}

async function markRevokedSession(SessionModel, doc, access, now) {
  if (access?.reason !== "PURCHASE_REFUNDED") return;
  // Persist only a terminal generation state; never issue another refund or alter purchase records.
  await SessionModel.updateOne({ id: doc.id, userId: doc.userId, ...(doc.updatedAt ? { updatedAt: doc.updatedAt } : {}),
    status: { $in: ["generating", "delivery_pending", "generation_failed"] } }, {
    $set: { status: "generation_failed", deliveryMeta: { ...doc.deliveryMeta, reviewRequired: true,
      reviewReason: "PURCHASE_REFUNDED" }, generationError: { code: "PURCHASE_REFUNDED", at: new Date(now) } },
  });
}

async function reopenClosedSessions(SessionModel, now, syncFn, diagnose, accessFn) {
  const docs = (await SessionModel.find({
    status: "generation_failed",
    "deliveryMeta.reviewRequired": true,
    "deliveryMeta.reviewReason": "GENERATION_BUDGET_EXCEEDED",
    "passRefund.refundedAt": { $exists: false },
    "billingRefund.refundedAt": { $exists: false },
    $or: [{ "deliveryMeta.codexReopenedAt": { $exists: false } }, { "deliveryMeta.dedupeReopenedAt": { $exists: false } },
      { mode: "compat", "deliveryMeta.evidenceScopeReopenedAt": { $exists: false }, "deliveryMeta.errors.self.code": "LLM_PARTNER_EVIDENCE_MISSING" }],
  }).sort({ updatedAt: 1 }).limit(MAX_SESSIONS_PER_TICK).lean()) || [];
  const reopened = [];
  for (const doc of docs) {
    const access = await accessFn({ userId: doc.userId, sessionId: doc.id });
    if (!access || access.denied) { await markRevokedSession(SessionModel, doc, access, now); continue; }
    const plan = planCodexReopen(doc, diagnose);
    if (!plan) continue;
    // 조건부 원자 갱신: 그 사이 환급·재개된 세션은 매치되지 않는다(표식이 그 조건이다).
    // updatedAt 을 두어 이번 틱에 바로 회수된다.
    const saved = await SessionModel.updateOne({ ...buildCodexReopenFilter(plan.marker), id: doc.id, userId: doc.userId }, {
      $set: { status: "generating", "deliveryMeta.reviewRequired": false, [`deliveryMeta.${plan.marker}`]: new Date(now), generationError: null, ...plan.set },
      $unset: plan.unset,
    }, { timestamps: false });
    if (!saved?.modifiedCount) continue;
    reopened.push(`${doc.id}:${plan.reason}`);
    await syncFn({ ...doc, status: "generating", deliveryMeta: { ...doc.deliveryMeta, reviewRequired: false } });
  }
  return reopened;
}

export async function runMasterLoveCodexRecovery(env, options = {}) {
  const now = options.now || Date.now();
  const deadline = now + TASK_BUDGET_MS;
  const SessionModel = options.MasterLoveCodexSession || MasterLoveCodexSession;
  const lockFn = options.acquireBatchLock || acquireBatchLock;
  const waveFn = options.runCodexWave || runCodexWave;
  const accessFn = options.recoverCodexSession || recoverCodexSession;

  await (options.connectDb || connectDb)(env);
  const bootstrapped = await (options.bootstrapPaidCodexSessions || bootstrapPaidCodexSessions)(env, { ...options, now, deadlineAt: deadline });
  const unsynced = await SessionModel.find({ status: "completed", "deliveryMeta.executionSyncPending": true }).sort({ updatedAt: 1 }).limit(3).lean();
  for (const doc of unsynced) {
    const access = await accessFn({ userId: doc.userId, sessionId: doc.id });
    if (access && !access.denied) await (options.syncCodexExecution || syncCodexExecution)(access.session);
  }
  const reopened = await reopenClosedSessions(
    SessionModel, now, options.syncCodexExecution || syncCodexExecution, options.diagnoseCodexSession || diagnoseCodexSession, accessFn,
  );
  const candidates = await SessionModel
    .find(buildAbandonedFilter(now))
    .sort({ updatedAt: 1 }) // 가장 오래 방치된 것부터
    .limit(MAX_SESSIONS_PER_TICK)
    .lean();

  const outcomes = [];
  const queue = candidates.map(candidate => ({ candidate, saved: Number(candidate.generationProgress?.completed || 0) }));
  for (let turns = 0; queue.length && turns < 32; turns++) {
    // 남은 예산이 웨이브 하나를 못 담으면 다음 틱으로 넘긴다 — 잘린 웨이브는 락만 남긴다.
    if (Date.now() + WAVE_BUDGET_MS > deadline) break;
    const { candidate, saved } = queue.shift();

    const sessionId = String(candidate.id || "");
    const userId = String(candidate.userId || "");
    if (!sessionId || !userId) continue;

    try {
      // 생성 비용을 쓰기 **전에** 접근 권한을 본다(환불·불일치 세션을 걸러낸다).
      const access = await accessFn({ userId, sessionId });
      if (!access || access.denied) {
        await markRevokedSession(SessionModel, candidate, access, now);
        outcomes.push({ sessionId, outcome: "denied" });
        continue;
      }

      const lock = await lockFn(sessionId, userId);
      if (!lock.ok) {
        // 그 사이 브라우저가 집었거나 완료됐다. 정상 상태다.
        outcomes.push({ sessionId, outcome: "lock_busy" });
        continue;
      }

      const wave = await waveFn(env, {
        sessionId,
        userId,
        doc: lock.doc,
        lockToken: lock.lockToken,
        dependencies: options.dependencies || {},
        deadlineAt: Date.now() + WAVE_BUDGET_MS,
      });
      outcomes.push({ sessionId, outcome: wave.outcome, done: Boolean(wave.done) });
      const progress = Number(wave.session?.generationProgress?.completed || 0);
      if (wave.outcome === "committed" && !wave.done && progress > saved) queue.push({ candidate: wave.session, saved: progress });
    } catch (error) {
      // 세션 하나의 실패가 나머지 회수를 막지 않는다. 락은 runCodexWave 의 catch 가 푼다.
      console.error("[master-love-codex-recovery]", sessionId, String(error?.message || error).slice(0, 300));
      outcomes.push({ sessionId, outcome: "failed" });
    }
  }

  const reviewNeeded = await SessionModel.countDocuments({ "deliveryMeta.reviewRequired": true, status: "generation_failed" });
  const stalled = await SessionModel.countDocuments(buildCodexStalledFilter(now));
  console.log("[master-love-codex-recovery]", JSON.stringify({ bootstrapped, reopened, outcomes, reviewNeeded, stalled }));
  return { ok: true, scanned: candidates.length, bootstrapped, reopened, outcomes, reviewNeeded, stalled };
}

export const __masterLoveCodexRecoveryTestUtils = {
  ABANDONED_AFTER_MS, MAX_SESSIONS_PER_TICK, TASK_BUDGET_MS, WAVE_BUDGET_MS,
  buildAbandonedFilter, buildCodexReopenFilter, planCodexReopen,
};
