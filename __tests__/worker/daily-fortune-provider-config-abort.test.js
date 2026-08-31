/**
 * @jest-environment node
 *
 * 일일 운세 발송 크론이 **설정성 발송 실패**를 만났을 때의 행동.
 *
 * 🔴 이 스위트가 지키는 것은 "실패를 잘 기록한다"가 아니라 **실패가 사람에게 도달한다**이다.
 * 2026-08-19 부터 08-31 까지 이 크론은 매일 정상 실행됐고 매일 전건이 실패했다. Resend 가
 * `403 domain is not verified` 를 돌려줬는데, 종전 코드는 구독자별로 console.error 한 줄과
 * lastMailError 만 남기고 루프를 끝까지 돌았다. 요약 로그는 `failed=N` 한 줄이라 "구독자 몇 명이
 * 실패했다"와 "발송이 통째로 죽었다"가 구별되지 않았고, 12일이 지나서야 사람이 알아챘다.
 *
 * 그래서 두 가지를 함께 단언한다.
 *   1) 설정성 오류면 **첫 실패에서 배치를 멈춘다** — 남은 구독자에게 보내도 같은 응답이 온다.
 *   2) 같은 실행에서 **알림을 정확히 1회** 보낸다.
 * 그리고 대칭으로, 수신자별 오류(5xx 등)는 종전대로 계속 돌고 알림을 보내지 않는다 —
 * 이 구분이 무너지면 일시적 실패 한 건이 그날 발송 전체를 죽인다.
 */
import { jest } from "@jest/globals";

const subscriptionFind = jest.fn();
const subscriptionUpdateOne = jest.fn(async () => ({}));
const sendEmail = jest.fn();
const sendTelegramMessage = jest.fn(async () => ({ ok: true, status: 200 }));

let runDailyFortuneTask;

function fakeQuery(rows) {
  const chain = {
    sort: () => chain,
    limit: () => chain,
    lean: async () => rows,
  };
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
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({ connectDb: jest.fn() })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({
      DailyFortuneSubscription: { find: subscriptionFind, updateOne: subscriptionUpdateOne },
    })),
    jest.unstable_mockModule("../../worker/lib/resend.js", () => ({ sendEmail })),
    jest.unstable_mockModule("../../worker/lib/telegram.js", () => ({
      sendTelegramMessage,
      escapeTelegramHtml: (value) => String(value == null ? "" : value),
    })),
  ]);
  ({ runDailyFortuneTask } = await import("../../worker/lib/daily-fortune-task.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  sendTelegramMessage.mockResolvedValue({ ok: true, status: 200 });
  subscriptionFind.mockImplementation(() => fakeQuery(makeSubscribers(25)));
});

test("🔴 도메인 미인증(403)이면 첫 구독자에서 배치를 멈춘다", async () => {
  sendEmail.mockResolvedValue({
    ok: false,
    status: 403,
    error: "The code-destiny.com domain is not verified.",
    configError: true,
    from: "Code Destiny <admin@code-destiny.com>",
  });

  await runDailyFortuneTask({});

  // 종전에는 25통 전부 시도해 403 을 25번 받아 냈다.
  expect(sendEmail).toHaveBeenCalledTimes(1);
});

test("🔴 설정성 실패는 같은 실행에서 정확히 1회 알린다", async () => {
  sendEmail.mockResolvedValue({
    ok: false,
    status: 403,
    error: "The code-destiny.com domain is not verified.",
    configError: true,
    from: "Code Destiny <admin@code-destiny.com>",
  });

  await runDailyFortuneTask({});

  expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
  const text = String(sendTelegramMessage.mock.calls[0][1].text);
  // 알림만 보고 어느 도메인이 왜 막혔는지 알 수 있어야 한다. 로그를 다시 뒤지게 하면 의미가 없다.
  expect(text).toContain("code-destiny.com");
  expect(text).toContain("403");
  expect(text).toContain("The code-destiny.com domain is not verified.");
  // 🔴 같은 키를 결제 영수증·피드백 알림도 쓴다는 사실이 알림에 없으면 피해 범위를 오판한다.
  expect(text).toContain("결제 영수증");
});

test("API 키 누락(status 0)도 설정성 실패로 다뤄 멈추고 알린다", async () => {
  sendEmail.mockResolvedValue({
    ok: false,
    status: 0,
    error: "missing_api_key",
    configError: true,
    from: "",
  });

  await runDailyFortuneTask({});

  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
});

test("설정성 실패도 그 구독자의 lastMailError 는 종전대로 남긴다", async () => {
  sendEmail.mockResolvedValue({
    ok: false,
    status: 403,
    error: "The code-destiny.com domain is not verified.",
    configError: true,
    from: "Code Destiny <admin@code-destiny.com>",
  });

  await runDailyFortuneTask({});

  expect(subscriptionUpdateOne).toHaveBeenCalledTimes(1);
  const [filter, update] = subscriptionUpdateOne.mock.calls[0];
  expect(filter).toEqual({ _id: "sub-0" });
  expect(update.$set.lastMailError).toBe("The code-destiny.com domain is not verified.");
});

test("🔴 수신자별 실패(5xx)는 종전대로 끝까지 돌고 알리지 않는다", async () => {
  sendEmail.mockResolvedValue({
    ok: false,
    status: 500,
    error: "internal_server_error",
    configError: false,
    from: "Code Destiny <admin@code-destiny.com>",
  });

  await runDailyFortuneTask({});

  // 일시적 실패 한 건이 그날 발송 전체를 죽이면 안 된다.
  expect(sendEmail).toHaveBeenCalledTimes(25);
  expect(sendTelegramMessage).not.toHaveBeenCalled();
});

test("정상 발송에서는 알림이 나가지 않는다", async () => {
  sendEmail.mockResolvedValue({ ok: true, status: 200, data: { id: "re_1" } });

  await runDailyFortuneTask({});

  expect(sendEmail).toHaveBeenCalledTimes(25);
  expect(sendTelegramMessage).not.toHaveBeenCalled();
});

test("알림 발행이 실패해도 크론은 던지지 않는다", async () => {
  sendEmail.mockResolvedValue({
    ok: false,
    status: 401,
    error: "API key is invalid",
    configError: true,
    from: "Code Destiny <admin@code-destiny.com>",
  });
  sendTelegramMessage.mockRejectedValue(new Error("telegram down"));

  // 같은 크론 실행을 공유하는 나머지 태스크(구독 정산 등)를 이 알림이 죽이면 안 된다.
  // 던지지 않는 것이 이 테스트의 전부다 — 돌려주는 요약은 중단 사유를 그대로 담는다.
  await expect(runDailyFortuneTask({})).resolves.toMatchObject({ sent: 0, abortedReason: "provider_config" });
});
