/**
 * @jest-environment node
 *
 * PortOne webhook 수신.
 *
 * 🔴 여기서 가장 중요한 것은 **서명 알고리즘이 기존 구현과 한 비트도 다르지 않다는 것**이다.
 * 서명이 어긋나면 webhook 이 전량 거부되고, webhook 은 결제 확정의 복구 경로이므로 그대로
 * "결제는 됐는데 권한이 안 열리는" 장애가 된다. 그래서 벡터를 새로 만들지 않고 **살아 있는
 * payments.js 의 구현과 직접 교차검증**한다.
 */
import {
  WEBHOOK_STALE_PROCESSING_MS,
  WEBHOOK_TIMESTAMP_MAX_AGE_MS,
  __webhookTestUtils,
  acceptWebhook,
  isWebhookTimestampStale,
  markEventFailed,
  markEventProcessed,
  reserveEvent,
  resolveEventId,
  resolvePaymentId,
  signWebhookPayload,
  verifyWebhookSignature,
} from "../../worker/payments/webhook.js";
import { PaymentError, classify } from "../../worker/payments/errors.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const SECRET = "whsec_dGVzdC1zZWNyZXQtdmFsdWU=";
const PLAIN_SECRET = "plain-test-secret";
const EVENT = "evt_01HZZ";

// {provider, eventId} unique 는 프로덕션에 실제로 존재한다(2026-08-11 실측). 멱등이 여기 기댄다.
const makeWebhookDb = () => makeFakePaymentDb({ uniqueKeys: [["provider", "eventId"]] });

function headersOf(map) {
  return { get: (key) => map[String(key).toLowerCase()] ?? null };
}

async function signedHeaders(secret, id, timestamp, body) {
  return headersOf({
    "webhook-id": id,
    "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${await signWebhookPayload(secret, id, timestamp, body)}`,
  });
}

/** acceptWebhook 은 신선도를 보므로 지금 시각으로 서명한다(고정 리터럴은 언젠가 반드시 낡는다). */
const nowSeconds = () => String(Math.floor(Date.now() / 1000));

describe("🔴 서명은 기존 구현과 동일하다", () => {
  let legacySign;
  let legacyVerify;

  beforeAll(async () => {
    const mod = await import("../../worker/routes/payments.js");
    legacySign = mod.__paymentsTestUtils.signStandardWebhookPayload;
    legacyVerify = mod.__paymentsTestUtils.verifyPortOneWebhookSignature;
  });

  test("같은 입력에 같은 서명이 나온다 (whsec_ 접두 · 평문 둘 다)", async () => {
    for (const secret of [SECRET, PLAIN_SECRET]) {
      for (const body of ['{"type":"Transaction.Paid"}', "", '{"a":"한글"}']) {
        expect(await signWebhookPayload(secret, EVENT, "1786000000", body))
          .toBe(await legacySign(secret, EVENT, "1786000000", body));
      }
    }
  });

  test("기존 검증기가 통과시키는 것을 새 검증기도 통과시킨다", async () => {
    const body = '{"type":"Transaction.Paid","data":{"paymentId":"cdorder1"}}';
    const headers = await signedHeaders(SECRET, EVENT, "1786000000", body);
    expect(await legacyVerify(SECRET, body, headers)).toBe(true);
    expect(await verifyWebhookSignature(SECRET, body, headers)).toBe(true);
  });

  test("🔴 x-webhook-* 별칭 헤더 + 평문 시크릿도 두 구현 모두 통과시킨다", async () => {
    // PortOne 이 프록시 뒤에서 x- 접두 헤더로 보내는 경로다. 별칭을 놓치면 서명이 맞는데도
    // 헤더가 비어 보여 전량 거부되고, webhook 이 결제 확정의 복구 경로이므로 그대로 장애다.
    const body = '{"type":"Transaction.Paid","data":{"paymentId":"cdorder1"}}';
    const timestamp = "1786000000";
    const headers = headersOf({
      "x-webhook-id": EVENT,
      "x-webhook-timestamp": timestamp,
      "x-webhook-signature": `v1,${await signWebhookPayload(PLAIN_SECRET, EVENT, timestamp, body)}`,
    });
    expect(await legacyVerify(PLAIN_SECRET, body, headers)).toBe(true);
    expect(await verifyWebhookSignature(PLAIN_SECRET, body, headers)).toBe(true);
  });
});

describe("서명 검증", () => {
  const BODY = '{"type":"Transaction.Paid","data":{"paymentId":"cdorder1"}}';

  test("올바른 서명은 통과한다", async () => {
    expect(await verifyWebhookSignature(SECRET, BODY, await signedHeaders(SECRET, EVENT, "1", BODY))).toBe(true);
  });

  test("본문이 한 글자만 달라도 거부한다", async () => {
    const headers = await signedHeaders(SECRET, EVENT, "1", BODY);
    expect(await verifyWebhookSignature(SECRET, `${BODY} `, headers)).toBe(false);
  });

  test("다른 시크릿으로 서명된 것은 거부한다", async () => {
    const headers = await signedHeaders(PLAIN_SECRET, EVENT, "1", BODY);
    expect(await verifyWebhookSignature(SECRET, BODY, headers)).toBe(false);
  });

  test("헤더가 하나라도 없으면 거부한다", async () => {
    expect(await verifyWebhookSignature(SECRET, BODY, headersOf({}))).toBe(false);
    expect(await verifyWebhookSignature(SECRET, BODY, headersOf({ "webhook-id": EVENT }))).toBe(false);
  });

  test("🔴 키 로테이션 창: 서명 두 개가 공백으로 붙어 와도 통과한다", async () => {
    // 쉼표로 먼저 자르면 앞 서명이 "AAA v1" 이라는 쓰레기가 되어, 유효한데도 전량 거부된다.
    // 그 장애가 실제로 있었다 — 평시(서명 1개)에는 우연히 동작해 눈에 안 띈다.
    const valid = await signWebhookPayload(SECRET, EVENT, "1", BODY);
    const headers = headersOf({
      "webhook-id": EVENT,
      "webhook-timestamp": "1",
      "webhook-signature": `v1,b2xkLXNpZ25hdHVyZS12YWx1ZQ== v1,${valid}`,
    });
    expect(await verifyWebhookSignature(SECRET, BODY, headers)).toBe(true);
  });

  test("v1= · v1: 구분자도 받는다", () => {
    expect(__webhookTestUtils.parseSignatures("v1,AAA v1=BBB v1:CCC")).toEqual(["AAA", "BBB", "CCC"]);
    // "v1" 로 시작하는 base64 서명 자체는 잘리지 않는다.
    expect(__webhookTestUtils.parseSignatures("v1abcDEF")).toEqual(["v1abcDEF"]);
  });
});

describe("중복 수신", () => {
  const base = { eventId: EVENT, eventType: "Transaction.Paid", paymentId: "cdorder1" };

  test("처음 받으면 점유한다", async () => {
    const db = makeWebhookDb();
    expect(await reserveEvent(db, base)).toEqual({ claimed: true, duplicate: false, busy: false });
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0].status).toBe("processing");
  });

  test("🔴 같은 이벤트를 두 번 받으면 두 번째는 처리하지 않는다 — 형제가 살아 있으면 busy 다", async () => {
    const db = makeWebhookDb();
    await reserveEvent(db, base);
    expect(await reserveEvent(db, base)).toEqual({ claimed: false, duplicate: false, busy: true });
    expect(db.rows).toHaveLength(1);
  });

  test("🔴 이미 성공한 이벤트는 재점유하지 않는다 — 그게 곧 중복 지급이다", async () => {
    const db = makeWebhookDb();
    await reserveEvent(db, base);
    await markEventProcessed(db, { eventId: EVENT });
    const long = new Date(Date.now() + WEBHOOK_STALE_PROCESSING_MS * 10);
    expect(await reserveEvent(db, { ...base, now: long })).toEqual({ claimed: false, duplicate: true, busy: false });
    expect(db.rows[0].status).toBe("processed");
  });

  test("🔴 처리 중 죽은 이벤트는 재점유한다 — 아니면 영영 미확정으로 남는다", async () => {
    const db = makeWebhookDb();
    const start = new Date("2026-08-11T00:00:00Z");
    await reserveEvent(db, { ...base, now: start });
    const later = new Date(start.getTime() + WEBHOOK_STALE_PROCESSING_MS + 1000);
    expect(await reserveEvent(db, { ...base, now: later })).toEqual({ claimed: true, duplicate: false, busy: false });
    expect(db.rows[0].attempts).toBe(2);
  });

  test("🔴 살아 있는 형제가 처리 중이면 duplicate 가 아니라 busy 다 — 200 을 주면 재전송 사다리가 끊긴다", async () => {
    const db = makeWebhookDb();
    const start = new Date("2026-08-11T00:00:00Z");
    await reserveEvent(db, { ...base, now: start });
    const soon = new Date(start.getTime() + 30_000);
    expect(await reserveEvent(db, { ...base, now: soon })).toEqual({ claimed: false, duplicate: false, busy: true });
  });

  test("실패한 이벤트는 재전송 때 다시 시도된다", async () => {
    const db = makeWebhookDb();
    const start = new Date("2026-08-11T00:00:00Z");
    await reserveEvent(db, { ...base, now: start });
    await markEventFailed(db, { eventId: EVENT, reason: "boom", now: start });
    const later = new Date(start.getTime() + WEBHOOK_STALE_PROCESSING_MS + 1000);
    expect((await reserveEvent(db, { ...base, now: later })).claimed).toBe(true);
  });

  test("🔴 실패한 이벤트는 2분을 기다리지 않고 즉시 재점유한다 — PortOne 첫 재전송(1분)이 그 창 안에 온다", async () => {
    const db = makeWebhookDb();
    const start = new Date("2026-08-11T00:00:00Z");
    await reserveEvent(db, { ...base, now: start });
    await markEventFailed(db, { eventId: EVENT, reason: "boom", now: start });
    const soon = new Date(start.getTime() + 60_000);
    expect(await reserveEvent(db, { ...base, now: soon })).toEqual({ claimed: true, duplicate: false, busy: false });
    expect(db.rows[0].attempts).toBe(2);
  });
});

describe("acceptWebhook", () => {
  const BODY = '{"type":"Transaction.Paid","data":{"paymentId":"cdorder1"}}';
  const ENV = { PORTONE_WEBHOOK_SECRET: SECRET };

  test("정상 흐름은 이벤트 정보를 뽑아 준다", async () => {
    const db = makeWebhookDb();
    const result = await acceptWebhook(ENV, db, {
      rawBody: BODY,
      headers: await signedHeaders(SECRET, EVENT, nowSeconds(), BODY),
    });
    expect(result).toMatchObject({
      claimed: true, duplicate: false, eventId: EVENT, eventType: "Transaction.Paid", paymentId: "cdorder1",
    });
  });

  test("서명 불일치는 401", async () => {
    const db = makeWebhookDb();
    await expect(acceptWebhook(ENV, db, { rawBody: BODY, headers: headersOf({}) })).rejects.toThrow(PaymentError);
    try {
      await acceptWebhook(ENV, db, { rawBody: BODY, headers: headersOf({}) });
    } catch (error) {
      expect(classify(error).status).toBe(401);
    }
  });

  test("🔴 시크릿 미설정은 500 이다 — 503 이면 PortOne 이 영원히 재전송한다", async () => {
    const db = makeWebhookDb();
    try {
      await acceptWebhook({}, db, { rawBody: BODY, headers: await signedHeaders(SECRET, EVENT, nowSeconds(), BODY) });
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentError);
      expect(classify(error).status).toBe(500);
    }
  });

  test("본문이 JSON 이 아니면 400", async () => {
    const db = makeWebhookDb();
    const bad = "not json";
    try {
      await acceptWebhook(ENV, db, { rawBody: bad, headers: await signedHeaders(SECRET, EVENT, nowSeconds(), bad) });
      throw new Error("expected a throw");
    } catch (error) {
      expect(classify(error).status).toBe(400);
    }
  });
});

describe("타임스탬프 신선도", () => {
  const BODY = '{"type":"Transaction.Paid","data":{"paymentId":"cdorder1"}}';
  const ENV = { PORTONE_WEBHOOK_SECRET: SECRET };
  const NOW = new Date("2026-08-28T00:00:00Z");
  const at = (msAgo) => String(Math.floor((NOW.getTime() - msAgo) / 1000));

  test("허용 범위 안이면 통과한다", () => {
    expect(isWebhookTimestampStale(at(0), NOW)).toBe(false);
    expect(isWebhookTimestampStale(at(WEBHOOK_TIMESTAMP_MAX_AGE_MS - 1000), NOW)).toBe(false);
  });

  test("허용 범위를 넘기면 오래된 것으로 본다", () => {
    expect(isWebhookTimestampStale(at(WEBHOOK_TIMESTAMP_MAX_AGE_MS + 1000), NOW)).toBe(true);
    expect(isWebhookTimestampStale("1", NOW)).toBe(true);
  });

  test("🔴 PortOne 재전송 지평(0→1→4→16→64→256분) 전체가 허용 범위 안에 있다", () => {
    // 헤더 타임스탬프가 첫 발송 값으로 고정되더라도 마지막 재전송이 통과해야 한다.
    // 여기서 막으면 결제 확정의 유일한 복구 경로가 끊긴다.
    const lastRetryMs = (0 + 1 + 4 + 16 + 64 + 256) * 60_000;
    expect(isWebhookTimestampStale(at(lastRetryMs), NOW)).toBe(false);
    expect(WEBHOOK_TIMESTAMP_MAX_AGE_MS).toBeGreaterThan(lastRetryMs * 2);
  });

  test("🔴 판정할 수 없는 값은 막지 않는다 — 형식 오독의 대가가 webhook 전량 거부다", () => {
    expect(isWebhookTimestampStale("not-a-number", NOW)).toBe(false);
    // 밀리초 값이 오면 아득한 미래가 되어 자연히 통과한다(단위 분기를 두지 않는 이유).
    expect(isWebhookTimestampStale(String(NOW.getTime()), NOW)).toBe(false);
  });

  test("오래된 타임스탬프는 서명이 맞아도 401 이고, 서명 불일치와 코드가 다르다", async () => {
    const db = makeWebhookDb();
    const stale = String(Math.floor((NOW.getTime() - WEBHOOK_TIMESTAMP_MAX_AGE_MS - 60_000) / 1000));
    try {
      await acceptWebhook(ENV, db, { rawBody: BODY, headers: await signedHeaders(SECRET, EVENT, stale, BODY), now: NOW });
      throw new Error("expected a throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentError);
      expect(error.code).toBe("WEBHOOK_TIMESTAMP_STALE");
      expect(classify(error).status).toBe(401);
    }
    // 🔴 거절된 이벤트는 점유되지 않는다 — 점유되면 뒤이은 정상 재전송이 중복으로 밀린다.
    expect(db.rows).toHaveLength(0);
  });
});

describe("식별자 추출", () => {
  test("헤더의 webhook-id 를 우선한다", () => {
    expect(resolveEventId(headersOf({ "webhook-id": "h1" }), { id: "b1" })).toBe("h1");
  });

  test("헤더가 없으면 본문 id, 그것도 없으면 타입+결제 id 로 합성한다", () => {
    expect(resolveEventId(headersOf({}), { id: "b1" })).toBe("b1");
    expect(resolveEventId(headersOf({}), { type: "T", data: { paymentId: "p1" } })).toBe("T:p1");
  });

  test("결제 id 는 여러 형태를 받는다", () => {
    expect(resolvePaymentId({ data: { paymentId: "a" } })).toBe("a");
    expect(resolvePaymentId({ paymentId: "b" })).toBe("b");
    expect(resolvePaymentId({})).toBe("");
  });
});
