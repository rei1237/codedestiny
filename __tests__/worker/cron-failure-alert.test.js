/**
 * @jest-environment node
 *
 * 일일 크론 태스크가 **던졌을 때** 사람에게 도달하는지.
 *
 * 🔴 이 스위트가 지키는 것: 2026-08-20~08-31 에 일일 운세 구독 문서는 갱신조차 되지 않았다.
 * 발송을 시도한 뒤의 설정 오류 알림(daily-fortune-task)은 그 12일을 잡지 못한다 — 루프에
 * 닿기 전에 죽었기 때문이다. 여기서 지키는 것은 "던지면 한 통이 나간다"와 "한 통뿐이다"다.
 */
import { notifyCronTaskFailures } from "../../worker/lib/cron-failure-alert.js";

const ENV = { TELEGRAM_BOT_TOKEN: "bot-token", TELEGRAM_CHAT_ID: "-100123" };

/** 🔴 실발행 금지. 항상 주입한다. */
function recorder(ok = true) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body || "{}")) });
      return { ok, status: ok ? 200 : 400, text: async () => JSON.stringify({ ok, description: ok ? "" : "chat not found" }) };
    },
  };
}

describe("notifyCronTaskFailures", () => {
  test("던진 태스크가 있으면 한 통을 보내고 태스크 이름과 사유를 싣는다", async () => {
    const telegram = recorder();

    const result = await notifyCronTaskFailures(
      ENV,
      [
        { name: "daily-fortune", message: "connect ETIMEDOUT" },
        { name: "webhook-reconcile", message: "boom" },
      ],
      { fetchImpl: telegram.fetchImpl },
    );

    expect(result.ok).toBe(true);
    expect(telegram.calls).toHaveLength(1);
    const text = telegram.calls[0].body.text;
    expect(text).toContain("daily-fortune");
    expect(text).toContain("connect ETIMEDOUT");
    expect(text).toContain("webhook-reconcile");
  });

  test("🔴 실패가 없으면 보내지 않는다 — 매일 도는 크론이라 무해한 알림도 소음이 된다", async () => {
    const telegram = recorder();

    const result = await notifyCronTaskFailures(ENV, [], { fetchImpl: telegram.fetchImpl });

    expect(result).toMatchObject({ ok: true, skipped: true });
    expect(telegram.calls).toHaveLength(0);
  });

  test("발행이 실패해도 던지지 않는다 (알림 실패가 크론을 죽이면 안 된다)", async () => {
    const telegram = recorder(false);

    const result = await notifyCronTaskFailures(ENV, [{ name: "daily-fortune", message: "boom" }], {
      fetchImpl: telegram.fetchImpl,
    });

    expect(result.ok).toBe(false);
    expect(telegram.calls).toHaveLength(1);
  });

  test("HTML 특수문자를 이스케이프한다 (parse_mode 가 HTML 이다)", async () => {
    const telegram = recorder();

    await notifyCronTaskFailures(ENV, [{ name: "daily-fortune", message: "<b>x</b> & y" }], {
      fetchImpl: telegram.fetchImpl,
    });

    const text = telegram.calls[0].body.text;
    expect(text).toContain("&lt;b&gt;x&lt;/b&gt; &amp; y");
  });
});
