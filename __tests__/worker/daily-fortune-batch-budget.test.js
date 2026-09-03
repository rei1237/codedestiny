/**
 * @jest-environment node
 *
 * 일일 운세 발송 크론의 배치 상한과 시간 예산.
 *
 * 이 태스크는 구독자 1인당 메일 1통을 직렬로 보내는데, 종전에는 `.limit()` 도 시간 상한도 없어
 * 구독자 수에 선형 비례했다. 같은 일일 크론의 나머지 4개 태스크와 한 실행을 공유하고, 그 넷은
 * 전부 배치 상한을 갖고 있었다.
 *
 * 🔴 여기서 지키는 핵심은 "상한을 걸었다"가 아니라 **누가 잘리는가**다. 크론이 하루 1회라
 * 잘린 구독자는 그날 메일을 영영 못 받는다. 정렬이 lastSentAt 오름차순이어야 오늘 아직 못 받은
 * 사람이 앞에 오고, 잘리는 쪽이 이미 오늘 받아서 어차피 skipped 될 사람이 된다.
 *
 * 실제 대기 없이 재현하려고 Date.now 를 통제한다(예산 clamp 하한이 5000ms 다).
 */
import { jest } from "@jest/globals";

const subscriptionFind = jest.fn();
const subscriptionUpdateOne = jest.fn(async () => ({}));
const sendEmail = jest.fn();

let runDailyFortuneTask;
let clock;
let realDateNow;
let lastQuery;

/** find(...).sort(...).limit(...).lean() 체인 대역 — sort/limit 인자를 기록한다. */
function fakeQuery(rows) {
  const spy = { sort: null, limit: null };
  const chain = {
    sort: (value) => { spy.sort = value; return chain; },
    limit: (value) => { spy.limit = value; return chain; },
    lean: async () => rows,
  };
  lastQuery = spy;
  return chain;
}

function makeSubscribers(count) {
  return Array.from({ length: count }, (_, index) => ({
    _id: `sub-${index}`,
    email: `user${index}@example.com`,
  }));
}

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb: jest.fn(),
      // 🔴 통과형 스텁이다. 크론 DB op 은 activeMongoOps 등록을 위해 withMongoRetry 를 타는데
      // (2026-09-03 실사고), 여기서 콜백을 삼키면 아래 모델 스텁 단언이 통째로 위양성이 된다.
      withMongoRetry: jest.fn((env, operation) => operation()),
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      DailyFortuneSubscription: { find: subscriptionFind, updateOne: subscriptionUpdateOne },
    })),
    jest.unstable_mockModule("../../worker/lib/resend.js", () => ({ sendEmail })),
  ]);
  ({ runDailyFortuneTask } = await import("../../worker/lib/daily-fortune-task.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  clock = { t: 1_700_000_000_000 };
  realDateNow = Date.now;
  Date.now = () => clock.t;
  // 메일 1통 = 10초. 예산 60초면 6명에서 끊긴다.
  sendEmail.mockImplementation(async () => {
    clock.t += 10000;
    return { ok: true };
  });
});

afterEach(() => {
  Date.now = realDateNow;
});

test("🔴 오늘 아직 못 받은 사람이 앞에 오도록 lastSentAt 오름차순으로 읽는다", async () => {
  subscriptionFind.mockImplementation(() => fakeQuery(makeSubscribers(3)));

  await runDailyFortuneTask({});

  // 이 정렬이 없으면 절단이 무작위 대상을 자르고, 잘린 사람은 그날 메일을 못 받는다.
  expect(lastQuery.sort).toEqual({ lastSentAt: 1 });
  expect(lastQuery.limit).toBe(500);
});

test("배치 상한은 env 로 낮출 수 있다", async () => {
  subscriptionFind.mockImplementation(() => fakeQuery(makeSubscribers(1)));

  await runDailyFortuneTask({ DAILY_FORTUNE_BATCH_LIMIT: "50" });

  expect(lastQuery.limit).toBe(50);
});

test("예산이 소진되면 남은 구독자를 건드리지 않고 멈춘다", async () => {
  subscriptionFind.mockImplementation(() => fakeQuery(makeSubscribers(10)));

  await runDailyFortuneTask({ DAILY_FORTUNE_TIME_BUDGET_MS: "60000" });

  // 10초 × 6통 = 60000 이 예산에 닿는 순간 7번째 앞에서 끊긴다.
  expect(sendEmail).toHaveBeenCalledTimes(6);
});

test("예산 안에서 끝나면 종전대로 전건을 보낸다", async () => {
  subscriptionFind.mockImplementation(() => fakeQuery(makeSubscribers(3)));

  await runDailyFortuneTask({ DAILY_FORTUNE_TIME_BUDGET_MS: "60000" });

  expect(sendEmail).toHaveBeenCalledTimes(3);
});

test("구독자가 없으면 종전대로 조용히 끝난다", async () => {
  subscriptionFind.mockImplementation(() => fakeQuery([]));

  await runDailyFortuneTask({});

  expect(sendEmail).not.toHaveBeenCalled();
});

/**
 * 🔴 아래 둘이 지키는 것: **"던지지 않았다"를 "일했다"로 읽지 않는 것.**
 * 2026-08-20~08-31 의 12일 침묵에서 구독 문서는 갱신조차 되지 않았다. 대상 조회가 비면 이
 * 태스크는 정상 반환하므로 호출부는 그 침묵을 성공과 구분할 수 없었다. 요약을 돌려주는 것이
 * worker/index.js 가 "발송 0 · 건너뜀 0" 실행을 알림에 실을 수 있는 유일한 근거다.
 */
test("🔴 구독자가 없으면 0 요약을 돌려준다 — 호출부가 침묵을 성공과 구분해야 한다", async () => {
  subscriptionFind.mockImplementation(() => fakeQuery([]));

  const summary = await runDailyFortuneTask({});

  expect(summary).toEqual({ subscribers: 0, sent: 0, skipped: 0, failed: 0, processed: 0, abortedReason: "" });
});

test("보낸 실행은 실제 건수를 요약으로 돌려준다", async () => {
  subscriptionFind.mockImplementation(() => fakeQuery(makeSubscribers(3)));

  const summary = await runDailyFortuneTask({ DAILY_FORTUNE_TIME_BUDGET_MS: "60000" });

  expect(summary).toMatchObject({ subscribers: 3, sent: 3, skipped: 0, failed: 0, processed: 3 });
});

test("예산에 잘린 실행은 중단 사유를 요약에 남긴다", async () => {
  subscriptionFind.mockImplementation(() => fakeQuery(makeSubscribers(10)));

  const summary = await runDailyFortuneTask({ DAILY_FORTUNE_TIME_BUDGET_MS: "60000" });

  expect(summary).toMatchObject({ subscribers: 10, sent: 6, processed: 6, abortedReason: "time_budget" });
});
