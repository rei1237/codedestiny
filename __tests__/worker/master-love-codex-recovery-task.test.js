/** @jest-environment node */
/**
 * 버려진 인연의 서 세션을 10분 크론이 회수하는 백스톱의 회귀 테스트.
 *
 * DB·LLM·결제 실호출 0건 — 모델·락·웨이브·접근검사를 전부 주입한다.
 */
import { jest } from "@jest/globals";
import {
  runMasterLoveCodexRecovery,
  buildAbandonedFilter,
  __masterLoveCodexRecoveryTestUtils,
} from "../../worker/lib/master-love-codex-recovery-task.js";

const { ABANDONED_AFTER_MS, MAX_SESSIONS_PER_TICK } = __masterLoveCodexRecoveryTestUtils;

function sessionModel(docs) {
  const query = {
    find: jest.fn(filter => { query.current = filter.status === "completed" ? [] : docs; return query; }),
    sort: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn(async () => query.current),
    countDocuments: jest.fn(async () => 0),
  };
  return query;
}

function harness(docs, overrides = {}) {
  const model = sessionModel(docs);
  const options = {
    connectDb: jest.fn(async () => {}),
    bootstrapPaidCodexSessions: jest.fn(async () => []),
    syncCodexExecution: jest.fn(async () => true),
    MasterLoveCodexSession: model,
    recoverCodexSession: jest.fn(async () => ({ session: {} })),
    acquireBatchLock: jest.fn(async (sessionId) => ({ ok: true, lockToken: `lock-${sessionId}`, doc: { id: sessionId } })),
    runCodexWave: jest.fn(async () => ({ outcome: "committed", done: false })),
    ...overrides,
  };
  return { model, options };
}

describe("buildAbandonedFilter", () => {
  test("미완 상태 · 방치 시간 · 락 free · 이용권 미환급을 모두 요구한다", () => {
    const now = Date.UTC(2026, 8, 13, 0, 0, 0);
    const filter = buildAbandonedFilter(now);
    expect(filter.status).toEqual({ $in: ["generating", "delivery_pending", "generation_failed"] });
    expect(filter.updatedAt.$lt.getTime()).toBe(now - ABANDONED_AFTER_MS);
    // 🔴 환급이 끝난 세션을 되살리면 값을 돌려주고도 책을 내주게 된다.
    expect(filter["passRefund.refundedAt"]).toEqual({ $exists: false });
    expect(filter["billingRefund.refundedAt"]).toEqual({ $exists: false });
    expect(filter.$or).toHaveLength(3);
    // 🔴 completed 는 후보에서 아예 빠진다 — 완료 세션 재기동은 구조적으로 불가능해야 한다.
    expect(filter.status.$in).not.toContain("completed");
  });
});

describe("runMasterLoveCodexRecovery", () => {
  test("브라우저가 없어도 진행된 세션을 순환하며 새 락으로 20장까지 완성한다", async () => {
    const saved = { s1: 0, s2: 0 }, turns = [];
    const { options } = harness([{ id: 's1', userId: 'u1' }, { id: 's2', userId: 'u2' }], {
      runCodexWave: jest.fn(async (_env, { sessionId, userId }) => {
        turns.push(sessionId); saved[sessionId] += 4;
        return { outcome: saved[sessionId] === 20 ? 'completed' : 'committed', done: saved[sessionId] === 20,
          session: { id: sessionId, userId, generationProgress: { completed: saved[sessionId] } } };
      }),
    });
    const result = await runMasterLoveCodexRecovery({}, options);
    expect(turns).toEqual(['s1', 's2', 's1', 's2', 's1', 's2', 's1', 's2', 's1', 's2']);
    expect(options.acquireBatchLock).toHaveBeenCalledTimes(10);
    expect(result.outcomes.filter(row => row.done)).toHaveLength(2);
  });
  test("4분 중 다음 78초 배치가 들어갈 수 없으면 다음 틱에 넘긴다", async () => {
    const clock = jest.spyOn(Date, 'now'); let now = 1000000; clock.mockImplementation(() => now);
    const { options } = harness([{ id: 's1', userId: 'u1' }], { now,
      runCodexWave: jest.fn(async (_env, { sessionId, userId }) => {
        now += 78000;
        return { outcome: 'committed', session: { id: sessionId, userId, generationProgress: { completed: (now - 1000000) / 78000 * 4 } } };
      }),
    });
    try { await runMasterLoveCodexRecovery({}, options); expect(options.runCodexWave).toHaveBeenCalledTimes(3); }
    finally { clock.mockRestore(); }
  });
  test("후보 세션마다 락을 잡고 웨이브를 정확히 한 번 돌린다", async () => {
    const { options } = harness([
      { id: "s1", userId: "u1" },
      { id: "s2", userId: "u2" },
    ]);
    const result = await runMasterLoveCodexRecovery({}, options);

    expect(options.runCodexWave).toHaveBeenCalledTimes(2);
    // 🔴 한 락으로 두 웨이브를 돌면 156초+ 라 락 TTL(120초)을 넘겨 클라이언트가 락을 훔친다.
    expect(options.runCodexWave.mock.calls[0][1]).toMatchObject({ sessionId: "s1", lockToken: "lock-s1" });
    expect(result.outcomes.map((row) => row.outcome)).toEqual(["committed", "committed"]);
  });

  test("락을 못 잡으면 그 세션은 생성 없이 건너뛴다 — 살아있는 브라우저 루프와 겹치지 않는다", async () => {
    const { options } = harness([{ id: "s1", userId: "u1" }], {
      acquireBatchLock: jest.fn(async () => ({ ok: false })),
    });
    const result = await runMasterLoveCodexRecovery({}, options);

    expect(options.runCodexWave).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ sessionId: "s1", outcome: "lock_busy" }]);
  });

  test("접근이 거부된 세션(환불·불일치)은 락도 잡지 않는다 — LLM 비용을 쓰기 전에 막는다", async () => {
    const { options } = harness([{ id: "s1", userId: "u1" }], {
      recoverCodexSession: jest.fn(async () => ({ denied: true, reason: "PURCHASE_REFUNDED" })),
    });
    const result = await runMasterLoveCodexRecovery({}, options);

    expect(options.acquireBatchLock).not.toHaveBeenCalled();
    expect(options.runCodexWave).not.toHaveBeenCalled();
    expect(result.outcomes).toEqual([{ sessionId: "s1", outcome: "denied" }]);
  });

  test("한 세션이 던져도 나머지 회수가 계속된다", async () => {
    const { options } = harness([
      { id: "s1", userId: "u1" },
      { id: "s2", userId: "u2" },
    ], {
      runCodexWave: jest.fn(async (_env, { sessionId }) => {
        if (sessionId === "s1") throw new Error("boom");
        return { outcome: "committed", done: true };
      }),
    });
    const result = await runMasterLoveCodexRecovery({}, options);

    expect(result.outcomes.map((row) => row.outcome)).toEqual(["failed", "committed"]);
  });

  test("틱당 세션 수를 상한으로 조회한다", async () => {
    const { model, options } = harness([]);
    await runMasterLoveCodexRecovery({}, options);

    expect(model.limit).toHaveBeenCalledWith(MAX_SESSIONS_PER_TICK);
    expect(model.sort).toHaveBeenCalledWith({ updatedAt: 1 });
  });
});
