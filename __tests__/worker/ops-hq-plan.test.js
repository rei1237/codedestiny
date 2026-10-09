/**
 * @jest-environment node
 */
// 별빛 운영본부 — 캠페인 계획 변환·퀘스트 수입·상태 전이·증빙.

const fs = require("node:fs");
const path = require("node:path");
const { createOpsCols } = require("../fixtures/ops-hq-fake-cols.cjs");

let plan;
let quests;
let buildPlan;
let render;

const NOW = new Date("2026-10-12T00:00:00Z");
const ACTOR = "admin:test";

beforeAll(async () => {
  ({ default: plan } = await import("../../worker/ops-hq/generated/growth-20261012.js"));
  quests = await import("../../worker/ops-hq/quests.js");
  ({ buildPlan, render } = await import("../../scripts/build-ops-hq-plan.mjs"));
});

function withRows(rows) {
  return { ...plan, planVersion: `test-${rows.length}-${rows.map((row) => row.rowHash).join("").length}`, rows };
}

describe("계획 변환", () => {
  test("생성 파일이 캠페인 원본(CSV·week01·README)과 일치한다", () => {
    const file = path.resolve(__dirname, "../../worker/ops-hq/generated/growth-20261012.js");
    expect(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")).toBe(render(buildPlan()));
  });

  test("회차 키는 유일하고 캠페인 기간 안에만 있다", () => {
    const keys = plan.rows.map((row) => row.occurrenceKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(plan.rows.every((row) => row.date >= "2026-10-12" && row.date <= "2026-11-08")).toBe(true);
  });

  test("V 원고는 원본 제작 1개 + 채널 발행 퀘스트로 나뉘고 Threads 는 XP 0 자동 확인이다", () => {
    const built = quests.buildQuestsFromPlan(plan);
    const v01 = built.filter((quest) => quest.contentId === "V01");
    const parent = v01.find((quest) => quest.kind === "production");
    const children = v01.filter((quest) => quest.kind === "publish");
    expect(parent).toBeTruthy();
    expect(children.map((quest) => quest.channel).sort()).toEqual(["tiktok", "youtube_shorts"]);
    expect(children.every((quest) => quest.parentId === parent._id)).toBe(true);
    const threads = built.filter((quest) => quest.channel === "threads_existing_worker");
    expect(threads.length).toBeGreaterThan(0);
    expect(threads.every((quest) => quest.kind === "auto_publish_check" && quest.automation?.kind === "threads")).toBe(true);
  });
});

describe("퀘스트 수입", () => {
  test("다시 돌려도 퀘스트·증빙이 늘지 않는다(멱등)", async () => {
    const cols = createOpsCols();
    const first = await quests.syncPlanQuests(cols, plan, { now: NOW, actor: ACTOR });
    const questCount = cols.quests.rows.size;
    const evidenceCount = cols.evidence.rows.size;
    expect(first.created).toBe(questCount);
    const second = await quests.syncPlanQuests(cols, plan, { now: NOW, actor: ACTOR });
    expect(second).toEqual({ created: 0, updated: 0, archived: 0, restored: 0, unchanged: questCount });
    expect(cols.quests.rows.size).toBe(questCount);
    expect(cols.evidence.rows.size).toBe(evidenceCount);
    const b01 = [...cols.quests.rows.values()].find((quest) => quest.contentId === "B01" && quest.kind === "copy");
    expect(b01.evidenceCount).toBe(1);
    expect(b01.evidenceTypes).toEqual(["copy_ready"]);
  });

  test("날짜가 바뀌어도 같은 퀘스트로 이어지고 증빙·진행 상태를 덮어쓰지 않는다", async () => {
    const cols = createOpsCols();
    await quests.syncPlanQuests(cols, plan, { now: NOW, actor: ACTOR });
    const row = plan.rows.find((item) => item.channel === "naver_blog");
    const id = quests.questIdFor(row.occurrenceKey);
    const before = await cols.quests.findOne({ _id: id });
    await quests.transitionQuest(cols, { questId: id, to: "in_progress", expectedVersion: before.version, actor: ACTOR, now: NOW });
    await quests.addEvidence(cols, { questId: id, body: { type: "reservation", note: "네이버 예약함" }, actor: ACTOR, now: NOW });

    const moved = plan.rows.map((item) => (item === row ? { ...item, date: "2026-10-14", rowHash: "moved-hash" } : item));
    const counts = await quests.syncPlanQuests(cols, withRows(moved), { now: NOW, actor: ACTOR });
    // 발행 행과 그 원본 제작 퀘스트(첫 발행일 기준)가 함께 갱신된다.
    expect(counts.updated).toBe(2);
    const after = await cols.quests.findOne({ _id: id });
    expect(after.plannedDate).toBe("2026-10-14");
    expect(after.status).toBe("in_progress");
    expect(after.evidenceTypes).toContain("reservation");
    expect(after.sourceHistory.at(-1)).toMatchObject({ kind: "changed", changes: { plannedDate: { from: row.date, to: "2026-10-14" } } });
  });

  test("원본에서 빠진 행은 지우지 않고 보관했다가 다시 나타나면 복원한다", async () => {
    const cols = createOpsCols();
    await quests.syncPlanQuests(cols, plan, { now: NOW, actor: ACTOR });
    const row = plan.rows.find((item) => item.channel === "x");
    const id = quests.questIdFor(row.occurrenceKey);
    const removed = await quests.syncPlanQuests(cols, withRows(plan.rows.filter((item) => item !== row)), { now: NOW, actor: ACTOR });
    // X 원고는 채널이 하나라 원본 작성 퀘스트도 함께 보관된다.
    expect(removed.archived).toBe(2);
    expect(await cols.quests.findOne({ _id: id })).toMatchObject({ status: "archived", archivedFromStatus: "scheduled" });
    const restored = await quests.syncPlanQuests(cols, plan, { now: NOW, actor: ACTOR });
    expect(restored.restored).toBe(2);
    expect((await cols.quests.findOne({ _id: id })).status).toBe("scheduled");
  });
});

describe("상태 전이·증빙", () => {
  async function seeded() {
    const cols = createOpsCols();
    await quests.syncPlanQuests(cols, plan, { now: NOW, actor: ACTOR });
    const row = plan.rows.find((item) => item.channel === "tiktok");
    return { cols, id: quests.questIdFor(row.occurrenceKey) };
  }

  test("공개 URL 없이 발행 퀘스트를 완료할 수 없고, 채널 도메인이 다른 URL 은 거절한다", async () => {
    const { cols, id } = await seeded();
    await expect(quests.transitionQuest(cols, { questId: id, to: "done", actor: ACTOR, now: NOW }))
      .rejects.toMatchObject({ status: 409, payload: expect.objectContaining({ code: "QUEST_EVIDENCE_REQUIRED" }) });
    await expect(quests.addEvidence(cols, { questId: id, body: { type: "public_url", url: "https://x.com/codedestiny/status/1" }, actor: ACTOR, now: NOW }))
      .rejects.toMatchObject({ status: 400 });
    await expect(quests.addEvidence(cols, { questId: id, body: { type: "auto_threads", note: "x" }, actor: ACTOR, now: NOW }))
      .rejects.toMatchObject({ status: 400 });
  });

  test("예약·공개·완료가 단계별로 구분되고 xpVerifiedAt 은 처음 완료 때 한 번만 찍힌다", async () => {
    const { cols, id } = await seeded();
    await quests.addEvidence(cols, { questId: id, body: { type: "reservation", note: "예약" }, actor: ACTOR, now: NOW });
    expect((await cols.quests.findOne({ _id: id })).stage).toBe("scheduled");
    const url = { type: "public_url", url: "https://www.tiktok.com/@codedestiny/video/1" };
    const added = await quests.addEvidence(cols, { questId: id, body: url, actor: ACTOR, now: NOW });
    const again = await quests.addEvidence(cols, { questId: id, body: url, actor: ACTOR, now: NOW });
    expect([added.created, again.created]).toEqual([true, false]);
    expect((await cols.quests.findOne({ _id: id })).stage).toBe("published");

    const firstDone = new Date("2026-10-13T11:00:00Z");
    const done = await quests.transitionQuest(cols, { questId: id, to: "done", actor: ACTOR, now: firstDone });
    expect(done).toMatchObject({ changed: true, affectsXp: true });
    await expect(quests.transitionQuest(cols, { questId: id, to: "in_progress", actor: ACTOR, now: NOW }))
      .rejects.toMatchObject({ payload: expect.objectContaining({ code: "QUEST_REOPEN_REASON_REQUIRED" }) });
    await quests.transitionQuest(cols, { questId: id, to: "in_progress", reason: "링크 수정", actor: ACTOR, now: NOW });
    const redone = await quests.transitionQuest(cols, { questId: id, to: "done", actor: ACTOR, now: new Date("2026-10-20T11:00:00Z") });
    expect(redone.quest.xpVerifiedAt).toEqual(firstDone);
  });

  test("다른 화면이 먼저 바꾸면 409 로 막는다", async () => {
    const { cols, id } = await seeded();
    const quest = await cols.quests.findOne({ _id: id });
    await quests.transitionQuest(cols, { questId: id, to: "in_progress", expectedVersion: quest.version, actor: ACTOR, now: NOW });
    await expect(quests.transitionQuest(cols, { questId: id, to: "on_hold", expectedVersion: quest.version, actor: ACTOR, now: NOW }))
      .rejects.toMatchObject({ status: 409, payload: expect.objectContaining({ code: "QUEST_VERSION_CONFLICT" }) });
  });
});
