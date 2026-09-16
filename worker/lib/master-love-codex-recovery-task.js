import { connectDb } from "./db.js";
import { MasterLoveCodexSession } from "./models.js";
import { recoverCodexSession } from "./master-love-codex-session-access.js";
import { acquireBatchLock, runCodexWave, syncCodexExecution, __masterLoveCodexTestUtils } from "../routes/master-love-codex.js";
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
  const stalled = await SessionModel.countDocuments({ status: { $in: ["generating", "delivery_pending", "generation_failed"] },
    updatedAt: { $lt: new Date(now - 1800000) }, "passRefund.refundedAt": { $exists: false }, "billingRefund.refundedAt": { $exists: false } });
  console.log("[master-love-codex-recovery]", JSON.stringify({ bootstrapped, outcomes, reviewNeeded, stalled }));
  return { ok: true, scanned: candidates.length, bootstrapped, outcomes, reviewNeeded, stalled };
}

export const __masterLoveCodexRecoveryTestUtils = {
  ABANDONED_AFTER_MS, MAX_SESSIONS_PER_TICK, TASK_BUDGET_MS, WAVE_BUDGET_MS, buildAbandonedFilter,
};
