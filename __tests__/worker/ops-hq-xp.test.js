/**
 * @jest-environment node
 */
// 별빛 운영본부 — 레벨 공식·작업 XP 일 상한·append-only 원장의 멱등성.

const { createOpsCols } = require("../fixtures/ops-hq-fake-cols.cjs");

let levels;
let xp;

beforeAll(async () => {
  levels = await import("../../worker/ops-hq/levels.js");
  xp = await import("../../worker/ops-hq/xp.js");
});

const at = (iso) => new Date(iso);

function doneQuest(id, kind, verifiedAt) {
  return { _id: id, kind, status: "done", xpVerifiedAt: at(verifiedAt) };
}

async function seedDone(cols, rows) {
  for (const row of rows) await cols.quests.insertOne(row);
}

describe("레벨 공식", () => {
  test("T(L)=100(L−1)+20(L−1)(L−2) 경계", () => {
    expect([1, 2, 3, 5, 10].map(levels.levelStartXp)).toEqual([0, 100, 240, 640, 2340]);
    expect(levels.levelForXp(99)).toBe(1);
    expect(levels.levelForXp(100)).toBe(2);
    expect(levels.levelForXp(239)).toBe(2);
    expect(levels.levelForXp(240)).toBe(3);
    expect(levels.levelForXp(640)).toBe(5);
    expect(levels.xpToNextLevel(3)).toBe(180);
  });

  test("칭호와 6단계 등급", () => {
    expect([1, 4, 5, 10, 20, 30, 45].map(levels.titleForLevel)).toEqual([
      "별빛 견습생", "별빛 견습생", "운명 기록가", "별의 안내자", "천체 설계자", "운명 길드장", "운명 길드장",
    ]);
    expect(levels.rankTierForLevel(40)).toBe(5);
  });
});

describe("XP 목표 계산", () => {
  test("매출은 합계에서 1,000원당 5 XP 로 한 번만 내리고 음수는 0", () => {
    expect(xp.revenueXpTarget(12_999)).toBe(60);
    expect(xp.revenueXpTarget(-5000)).toBe(0);
  });

  test("트래픽은 유효 참여 10세션당 1 XP, 하루 50 상한", () => {
    expect(xp.trafficXpTarget(99)).toBe(9);
    expect(xp.trafficXpTarget(10_000)).toBe(50);
  });

  test("작업 XP 는 KST 날짜별 200 상한을 (검증 시각, id) 순서로 결정적으로 배분한다", () => {
    const rows = [
      doneQuest("q4", "production", "2026-10-13T03:00:00Z"),
      doneQuest("q1", "production", "2026-10-13T01:00:00Z"),
      doneQuest("q2", "production", "2026-10-13T01:00:00Z"),
      doneQuest("q3", "production", "2026-10-13T02:00:00Z"),
      // KST 10/14 00:30 — 다음 날 버킷.
      doneQuest("q5", "copy", "2026-10-13T15:30:00Z"),
    ];
    const first = xp.allocateTaskXp(rows);
    const again = xp.allocateTaskXp([...rows].reverse());
    expect([...first.perQuest.entries()]).toEqual([...again.perQuest.entries()]);
    expect(first.perQuest.get("q3")).toMatchObject({ awarded: 60 });
    expect(first.perQuest.get("q4")).toMatchObject({ awarded: 20, capped: true });
    expect(first.usedByDate.get("2026-10-13")).toBe(200);
    expect(first.perQuest.get("q5")).toMatchObject({ date: "2026-10-14", awarded: 30 });
  });
});

describe("원장", () => {
  test("같은 원천을 다시 계산하면 아무것도 쓰지 않는다", async () => {
    const cols = createOpsCols();
    await seedDone(cols, [doneQuest("q1", "copy", "2026-10-13T01:00:00Z"), doneQuest("q2", "publish", "2026-10-13T02:00:00Z")]);
    const first = await xp.syncTaskXp(cols, { now: at("2026-10-13T03:00:00Z") });
    expect(first.changes.map((change) => change.delta).sort()).toEqual([20, 30]);
    const second = await xp.syncTaskXp(cols, { now: at("2026-10-13T04:00:00Z") });
    expect(second.changes).toEqual([]);
    expect(cols.ledger.rows.size).toBe(2);
  });

  test("완료를 되돌리면 음수 정정 행이 새로 생기고 이전 행은 그대로다", async () => {
    const cols = createOpsCols();
    await seedDone(cols, [doneQuest("q1", "copy", "2026-10-13T01:00:00Z")]);
    await xp.syncTaskXp(cols, { now: at("2026-10-13T02:00:00Z") });
    await cols.quests.updateOne({ _id: "q1" }, { $set: { status: "in_progress" } });
    const { changes } = await xp.syncTaskXp(cols, { now: at("2026-10-13T03:00:00Z") });
    expect(changes).toHaveLength(1);
    expect(changes[0].entry).toMatchObject({ delta: -30, target: 0, correctsEntryId: "task:2026-10-13:content#r000001" });
    expect((await cols.ledger.findOne({ _id: "task:2026-10-13:content#r000001" })).delta).toBe(30);
  });

  test("완료 후 원본 일정에서 빠져 보관된 퀘스트의 보상은 유지된다", async () => {
    const cols = createOpsCols();
    await seedDone(cols, [{ ...doneQuest("q1", "publish", "2026-10-13T01:00:00Z"), status: "archived", archivedFromStatus: "done" }]);
    const { changes } = await xp.syncTaskXp(cols, { now: at("2026-10-13T02:00:00Z") });
    expect(changes.map((change) => change.delta)).toEqual([20]);
  });

  test("동시에 같은 revision 을 쓰면(E11000) 다시 읽고 차이만 쓴다 — 중복 보상 없음", async () => {
    const cols = createOpsCols();
    const spec = { bucket: "revenue:cumulative", target: 50, sourceType: "revenue", now: at("2026-10-13T00:00:00Z") };
    // 이 요청이 r1 을 쓰기 직전에 다른 요청이 같은 목표로 r1 을 먼저 쓴다.
    cols.ledger.failNextInsert = async (collection, doc) => {
      await collection.insertOne({ ...doc, actor: "other-request" });
    };
    const result = await xp.applyBucketTarget(cols, spec);
    expect(result.delta).toBe(0);
    expect(cols.ledger.rows.size).toBe(1);
    expect(await xp.readBucketTotal(cols, "revenue:cumulative")).toBe(50);
  });

  test("최고 레벨은 내려가지 않고, 확인한 레벨은 다시 축하하지 않는다", async () => {
    const cols = createOpsCols();
    const now = at("2026-10-13T00:00:00Z");
    await xp.applyBucketTarget(cols, { bucket: "revenue:cumulative", target: 0, sourceType: "revenue", now });
    let state = await xp.recomputeXpState(cols, { now });
    expect(state).toMatchObject({ level: 1, ackLevel: 1, pendingLevelUp: null });

    await xp.applyBucketTarget(cols, { bucket: "revenue:cumulative", target: 250, sourceType: "revenue", now });
    state = await xp.recomputeXpState(cols, { now });
    expect(state.pendingLevelUp).toEqual({ from: 1, to: 3 });
    state = await xp.acknowledgeLevel(cols, { now });
    expect(state.pendingLevelUp).toBeNull();

    // 환불로 내려갔다가 다시 올라도 같은 레벨 축하는 다시 나오지 않는다.
    await xp.applyBucketTarget(cols, { bucket: "revenue:cumulative", target: 120, sourceType: "revenue", now });
    state = await xp.recomputeXpState(cols, { now });
    expect(state).toMatchObject({ level: 2, peakLevel: 3 });
    await xp.applyBucketTarget(cols, { bucket: "revenue:cumulative", target: 250, sourceType: "revenue", now });
    state = await xp.recomputeXpState(cols, { now });
    expect(state.pendingLevelUp).toBeNull();
    expect([...cols.ledger.rows.values()].map((row) => row.delta)).toEqual([250, -130, 130]);
  });
});
