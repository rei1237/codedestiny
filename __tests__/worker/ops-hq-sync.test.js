/**
 * @jest-environment node
 */
// 별빛 운영본부 — 트래픽 상태·정정, 업적, 동기화 단계 격리, Threads 읽기 전용, 라우트 유틸.

const fs = require("node:fs");
const path = require("node:path");
const { createOpsCols } = require("../fixtures/ops-hq-fake-cols.cjs");

let traffic;
let achievements;
let sync;
let quests;
let xp;
let routeUtils;

beforeAll(async () => {
  traffic = await import("../../worker/ops-hq/traffic.js");
  achievements = await import("../../worker/ops-hq/achievements.js");
  sync = await import("../../worker/ops-hq/sync.js");
  quests = await import("../../worker/ops-hq/quests.js");
  xp = await import("../../worker/ops-hq/xp.js");
  ({ __adminHqTestUtils: routeUtils } = await import("../../worker/routes/admin-hq.js"));
});

const SETTINGS = { revenueSince: "2026-10-12", excludedUserIds: [] };
// KST 2026-10-20 12:00
const NOW = new Date("2026-10-20T03:00:00Z");
const GA4_ENV = { GA4_SERVICE_ACCOUNT_JSON: "{\"client_email\":\"test\"}", GA4_PROPERTY_ID: "123456789" };
const report = (rows) => async () => ({ propertyId: "123456789", timeZone: "Asia/Seoul", rows });

describe("트래픽", () => {
  test("비밀값이 없으면 연동 대기 — 값도 XP 도 만들지 않는다", async () => {
    const cols = createOpsCols();
    const fetcher = jest.fn();
    const result = await traffic.syncTraffic({}, cols, { settings: SETTINGS, now: NOW, fetcher });
    expect(result).toEqual({ status: "integration_pending", missing: ["GA4_SERVICE_ACCOUNT_JSON", "GA4_PROPERTY_ID"] });
    expect(fetcher).not.toHaveBeenCalled();
    expect(cols.traffic.rows.size).toBe(0);
    expect(cols.ledger.rows.size).toBe(0);
    expect((await traffic.readTraffic({}, cols, { fromDate: "2026-10-12", toDate: "2026-10-20" })).status).toBe("integration_pending");
  });

  test("하향 정정은 음수 delta 로 반영되고, 조회 실패는 직전 값을 지운다거나 0 으로 만들지 않는다", async () => {
    const cols = createOpsCols();
    await traffic.syncTraffic(GA4_ENV, cols, { settings: SETTINGS, now: NOW, fetcher: report([
      { date: "2026-10-13", engagedSessions: 0, sessions: 4 },
      { date: "2026-10-19", engagedSessions: 120, sessions: 150 },
    ]) });
    expect(await cols.traffic.findOne({ _id: "ga4:123456789:2026-10-13" })).toMatchObject({ value: 0, status: "final" });
    expect(await cols.traffic.findOne({ _id: "ga4:123456789:2026-10-19" })).toMatchObject({ value: 120, status: "provisional" });
    expect(await xp.readBucketTotal(cols, traffic.trafficBucket("2026-10-19"))).toBe(12);

    const later = new Date(NOW.getTime() + 60_000);
    await traffic.syncTraffic(GA4_ENV, cols, { settings: SETTINGS, now: later, force: true, fetcher: report([{ date: "2026-10-19", engagedSessions: 80, sessions: 100 }]) });
    const corrected = await cols.traffic.findOne({ _id: "ga4:123456789:2026-10-19" });
    expect(corrected).toMatchObject({ value: 80, revision: 2 });
    expect(corrected.history).toEqual([expect.objectContaining({ value: 120 })]);
    const rows = [...cols.ledger.rows.values()].filter((row) => row.bucket === traffic.trafficBucket("2026-10-19"));
    expect(rows.map((row) => row.delta)).toEqual([12, -4]);

    const failing = async () => { throw Object.assign(new Error("quota"), { code: "GA4_QUOTA" }); };
    expect(await traffic.syncTraffic(GA4_ENV, cols, { settings: SETTINGS, now: later, force: true, fetcher: failing })).toEqual({ status: "error", code: "GA4_QUOTA" });
    expect((await cols.traffic.findOne({ _id: "ga4:123456789:2026-10-19" })).value).toBe(80);
    expect((await traffic.readTraffic(GA4_ENV, cols, { fromDate: "2026-10-12", toDate: "2026-10-20" })).status).toBe("error");
  });

  test("firstDateToFetch — 확정 안 된 가장 이른 날, 최근 3일은 항상 다시 본다", () => {
    const finals = (...dates) => new Set(dates);
    expect(traffic.firstDateToFetch("2026-10-12", "2026-10-20", finals("2026-10-12", "2026-10-13"))).toBe("2026-10-14");
    expect(traffic.firstDateToFetch("2026-10-12", "2026-10-20", finals("2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"))).toBe("2026-10-17");
    expect(traffic.firstDateToFetch("2026-10-19", "2026-10-20", finals())).toBe("2026-10-19");
  });
});

describe("업적", () => {
  test("근거 기록의 최초 시각으로 한 번만 기록된다", async () => {
    const cols = createOpsCols();
    const first = new Date("2026-10-13T01:00:00Z");
    await cols.quests.insertOne({ _id: "q1", kind: "publish", channel: "tiktok", status: "done", xpVerifiedAt: first });
    await cols.quests.insertOne({ _id: "q2", kind: "copy", status: "done", xpVerifiedAt: new Date("2026-10-14T01:00:00Z") });
    expect(await achievements.syncAchievements(cols, { now: NOW })).toEqual({ created: 2 });
    expect(await achievements.syncAchievements(cols, { now: NOW })).toEqual({ created: 0 });
    const list = await achievements.readAchievements(cols);
    expect(list.find((row) => row.key === "first_quest")).toMatchObject({ unlocked: true, achievedAt: first });
    expect(list.find((row) => row.key === "all_channels").unlocked).toBe(false);
  });
});

describe("동기화", () => {
  test("한 단계가 실패해도 나머지는 돌고, 실패는 연결 상태에 남는다", async () => {
    const cols = createOpsCols();
    const deps = {
      readThreadsStatus: async () => ({}),
      revenue: { loadPayments: async () => { throw new Error("mongo down"); }, loadEvidence: async () => new Map(), refundCheck: async () => null },
    };
    const result = await sync.runOpsHqSync({}, { now: NOW, cols, deps });
    expect(result.busy).toBe(false);
    expect(result.steps.revenue).toMatchObject({ ok: false, error: "mongo down" });
    for (const id of ["threads", "task_xp", "traffic", "xp_state", "achievements"]) expect(result.steps[id].ok).toBe(true);
    const connections = await sync.readConnections(cols, { now: NOW });
    expect(connections.find((row) => row.id === "revenue")).toMatchObject({ status: "error", lastError: expect.objectContaining({ message: "mongo down" }) });
    expect(connections.find((row) => row.id === "traffic").status).toBe("integration_pending");
  });

  test("다른 실행이 잠금을 쥐고 있으면 아무것도 하지 않는다", async () => {
    const cols = createOpsCols();
    await cols.syncState.insertOne({ _id: "lease:run", until: new Date(NOW.getTime() + 60_000), holder: "other" });
    expect(await sync.runOpsHqSync({}, { now: NOW, cols })).toEqual({ busy: true });
    expect(cols.quests.rows.size).toBe(0);
  });

  test("Threads 확인 퀘스트는 기존 기록이 모두 성공일 때만 자동 완료(0 XP)", async () => {
    const cols = createOpsCols();
    const now = new Date("2026-10-13T03:00:00Z");
    await quests.syncPlanQuests(cols, sync.CAMPAIGN_PLAN, { now, actor: "test" });
    const readStatus = async (env, dates) => Object.fromEntries(dates.map((date) => [date, {
      mode: "live",
      allConfirmed: date === "2026-10-12",
      attention: date !== "2026-10-12",
      jobs: [{ type: "morning", label: "아침", time: "08:30", state: date === "2026-10-12" ? "confirmed" : "uncertain", stateLabel: "", note: "", postIds: ["p1"] }],
    }]));
    const result = await sync.syncThreadsQuests({}, cols, { now, readStatus });
    expect(result.confirmed).toBe(1);
    const threads = [...cols.quests.rows.values()].filter((quest) => quest.kind === "auto_publish_check" && quest.plannedDate <= "2026-10-13");
    expect(threads.find((quest) => quest.plannedDate === "2026-10-12")).toMatchObject({ status: "done", evidenceTypes: expect.arrayContaining(["auto_threads"]) });
    expect(threads.find((quest) => quest.plannedDate === "2026-10-13").status).not.toBe("done");
    expect((await xp.syncTaskXp(cols, { now })).changes).toEqual([]);
  });
});

describe("격리·권한 (정적 확인)", () => {
  const root = path.resolve(__dirname, "../..");
  const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
  const opsFiles = fs.readdirSync(path.join(root, "worker/ops-hq")).filter((name) => name.endsWith(".js")).map((name) => `worker/ops-hq/${name}`);

  test("운영본부 코드는 Threads 공개 발행(/run·runThreadsDailyJobs)을 부르지 않는다", () => {
    for (const file of [...opsFiles, "worker/routes/admin-hq.js"]) {
      const source = read(file);
      expect({ file, run: /sns-daily-post\/run["'`]/.test(source) }).toEqual({ file, run: false });
      expect({ file, jobs: /runThreadsDailyJobs\s*\(|import[^;]*runThreadsDailyJobs/.test(source) }).toEqual({ file, jobs: false });
    }
  });

  test("/hq 는 관리자 인증 뒤에서만 열리고, 크론 동기화 실패는 결제 경로와 분리된다", () => {
    const admin = read("worker/routes/admin.js");
    const block = admin.slice(admin.indexOf('path === "/hq"'), admin.indexOf("handleAdminHqRoutes(path"));
    expect(block).toContain("await authorizeAdminRequest(request, env)");
    expect(read("worker/index.js")).toMatch(/ctx\.waitUntil\(import\("\.\/ops-hq\/sync\.js"\)\s*\.then\(\(\{ runOpsHqSync \}\) => runOpsHqSync\(env\)\)\s*\.catch\(/);
    const payments = fs.readdirSync(path.join(root, "worker/payments")).filter((name) => name.endsWith(".js"));
    for (const name of payments) expect(read(`worker/payments/${name}`)).not.toMatch(/ops-hq/);
  });
});

describe("라우트 유틸", () => {
  test("기간은 KST 날짜로 풀고 같은 길이의 직전 기간을 함께 준다", () => {
    const range = routeUtils.resolveRange(new URL("https://example.test/api/admin/hq/summary?range=7d"), NOW);
    expect(range).toMatchObject({ fromDate: "2026-10-14", toDate: "2026-10-20", prevFrom: "2026-10-07", prevTo: "2026-10-13" });
    expect(() => routeUtils.resolveRange(new URL("https://example.test/?from=2026-10-20&to=2026-10-01"), NOW)).toThrow();
  });

  test("한국어 SNS 초안의 문장 끝 마침표만 지우고 숫자·URL 은 둔다", () => {
    expect(routeUtils.stripKoreanSentencePeriods("오늘 리딩을 열었어요. 내일도 만나요.\nv1.2 버전 https://codedestiny.kr/a.b"))
      .toBe("오늘 리딩을 열었어요 내일도 만나요\nv1.2 버전 https://codedestiny.kr/a.b");
  });
});
