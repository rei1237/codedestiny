/**
 * @jest-environment node
 *
 * 결제 후 미이행·PG 대조 실패 운영자 알림(해외카드 1단계 C7).
 *
 * 🔴 결제 알림은 운영자 전용 채널(관리자 메일·Discord·Slack 웹훅)로만 간다. 공개 대화방 env 가 있어도
 *    쓰지 않는다 — 채널이 하나도 없으면 fetch 0회. 표식은 전달 성공 후에만 찍혀 실패한 알림은 다음 틱에 다시 간다.
 * getEnv 는 process.env 로 폴백하므로 운영자 채널 env 3종을 테스트 동안 비운다(값은 읽지도 출력하지도 않는다).
 */
import { jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { alertPaymentAnomalies } from "../../worker/payments/reconcile.js";
import { buildPaymentAlert, createOperatorAlertSender, PAYMENT_ALERT_TEXT_LIMIT } from "../../worker/payments/fulfillment-alert.js";
import { maskId } from "../../worker/payments/log.js";
import { notifyOperators } from "../../worker/lib/feedback-notify.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const NOW = new Date("2026-09-17T12:00:00Z");
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms, base = NOW) => new Date(base.getTime() - ms);
const later = (ms) => new Date(NOW.getTime() + ms);

const USER_ID = "507f1f77bcf86cd799439011";
const EMAIL = "buyer@example.com";
const PHONE = "01012345678";
const PII = { userId: USER_ID, customer: { email: EMAIL, phoneNumber: PHONE }, rawPortOne: { customer: { email: EMAIL, phoneNumber: PHONE }, pgTxId: "raw-pg-tx-0001" } };
const OPERATOR_ENV_KEYS = ["ADMIN_FEEDBACK_EMAIL", "FEEDBACK_DISCORD_WEBHOOK_URL", "FEEDBACK_SLACK_WEBHOOK_URL"];
const DISCORD_ENV = { FEEDBACK_DISCORD_WEBHOOK_URL: "https://discord.example.test/api/webhooks/1/test" };

const uid = (name) => `cd_20260917_${name}`;
const unfulfilledRow = (name, overrides = {}) => ({
  merchantUid: uid(name), status: "paid", entitlementGrantedAt: null, paymentType: "digital_content",
  featureKey: "master-love-codex", paymentAmount: 30000, paidAt: ago(45 * MIN), updatedAt: ago(45 * MIN),
  metadata: { fulfillmentAttempts: 3, fulfillmentLastError: "INTERNAL_ERROR" }, ...PII, ...overrides,
});
const verifyFailureRow = (name, failureCode, overrides = {}) => ({
  merchantUid: uid(name), status: "failed", failureStage: "pg-verify", failureCode, paymentType: "membership_pass",
  featureKey: "membership_pass", paymentAmount: 9900, updatedAt: ago(20 * MIN), metadata: {}, ...PII, ...overrides,
});

async function seed(rows) {
  const db = makeFakePaymentDb();
  for (const row of rows) await db.insertOne({}, row);
  return db;
}
const rowOf = (db, name) => db.rows.find((row) => row.merchantUid === uid(name));
const deliveredNotify = () => jest.fn(async () => ({ delivered: true }));

let savedEnv;
let originalFetch;
beforeEach(() => {
  savedEnv = {};
  for (const key of OPERATOR_ENV_KEYS) {
    if (Object.hasOwn(process.env, key)) savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  originalFetch = global.fetch;
  global.fetch = jest.fn(async () => ({ ok: true, status: 204, text: async () => "" }));
});
afterEach(() => {
  for (const key of OPERATOR_ENV_KEYS) {
    if (Object.hasOwn(savedEnv, key)) process.env[key] = savedEnv[key];
    else delete process.env[key];
  }
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

test("A 는 paid·결제 30분+·미지급(재지급과 같은 정의)만, B 는 pg-verify 대조 실패 4종만(PG_PAYMENT_NOT_PAID·다른 단계·30일 밖 제외)", async () => {
  const db = await seed([
    unfulfilledRow("a-target"),
    // 단건(per_use)은 권한 시각이 있어도 구매 지급 버전이 없으면 재지급 대상이다 — 알림도 같은 정의를 쓴다.
    unfulfilledRow("a-per-use", { entitlementGrantedAt: ago(40 * MIN), metadata: {} }),
    unfulfilledRow("a-fresh", { paidAt: ago(10 * MIN) }),
    unfulfilledRow("a-granted", { entitlementGrantedAt: ago(40 * MIN), metadata: { purchaseGrantVersion: 1 } }),
    unfulfilledRow("a-pending", { status: "pending", paidAt: null }),
    unfulfilledRow("a-refunded", { status: "refunded", paidAt: ago(2 * HOUR) }),
    verifyFailureRow("b-amount", "AMOUNT_MISMATCH"),
    verifyFailureRow("b-currency", "CURRENCY_MISMATCH"),
    verifyFailureRow("b-payment", "PAYMENT_ID_MISMATCH"),
    verifyFailureRow("b-store", "STORE_ID_MISMATCH"),
    verifyFailureRow("b-not-paid", "PG_PAYMENT_NOT_PAID"),
    verifyFailureRow("b-webhook", "AMOUNT_MISMATCH", { failureStage: "webhook" }),
    verifyFailureRow("b-old", "AMOUNT_MISMATCH", { updatedAt: ago(31 * DAY) }),
  ]);
  const notify = deliveredNotify();
  expect(await alertPaymentAnomalies(db, { notify, now: NOW })).toEqual({ unfulfilled: 2, verifyFailures: 4, delivered: true, marked: 6 });
  expect(notify).toHaveBeenCalledTimes(1);
  const { subject, text } = notify.mock.calls[0][0];
  expect(subject).toBe("[결제 알림] 미지급 2건 · PG 대조 실패 4건");
  expect(text).toContain(`${maskId(uid("a-target"))} · master-love-codex · digital_content · 30,000원 · 결제 후 45분 · 재지급 실패 3회 · INTERNAL_ERROR`);
  for (const code of ["AMOUNT_MISMATCH", "CURRENCY_MISMATCH", "PAYMENT_ID_MISMATCH", "STORE_ID_MISMATCH"]) expect(text).toContain(code);
  expect(text).not.toContain("PG_PAYMENT_NOT_PAID");
  for (const name of ["a-target", "a-per-use"]) expect(rowOf(db, name).metadata.fulfillmentAlert).toEqual({ lastAlertedAt: NOW, count: 1 });
  for (const name of ["a-fresh", "a-granted", "a-pending", "a-refunded"]) expect(rowOf(db, name).metadata.fulfillmentAlert).toBeUndefined();
  for (const name of ["b-amount", "b-currency", "b-payment", "b-store"]) expect(rowOf(db, name).metadata.verifyAlert).toEqual({ lastAlertedAt: NOW });
  for (const name of ["b-not-paid", "b-webhook", "b-old"]) expect(rowOf(db, name).metadata.verifyAlert).toBeUndefined();
});

test("전달 후 다시 돌면 보내지 않는다 — 대조 실패는 주문당 1회, 미지급은 24시간 안에 재알림 없음", async () => {
  const db = await seed([unfulfilledRow("a1"), verifyFailureRow("b1", "AMOUNT_MISMATCH")]);
  await alertPaymentAnomalies(db, { notify: deliveredNotify(), now: NOW });
  const again = deliveredNotify();
  expect(await alertPaymentAnomalies(db, { notify: again, now: later(10 * MIN) })).toEqual({ unfulfilled: 0, verifyFailures: 0, delivered: false, marked: 0 });
  expect(await alertPaymentAnomalies(db, { notify: again, now: later(23 * HOUR) })).toMatchObject({ unfulfilled: 0, verifyFailures: 0 });
  expect(again).not.toHaveBeenCalled();
});

test("미지급은 24시간마다 다시 알리고 7회 뒤에는 멈춘다", async () => {
  const db = await seed([unfulfilledRow("a1")]);
  const notify = deliveredNotify();
  for (let day = 0; day < 10; day += 1) await alertPaymentAnomalies(db, { notify, now: later(day * DAY) });
  expect(notify).toHaveBeenCalledTimes(7);
  expect(rowOf(db, "a1").metadata.fulfillmentAlert).toEqual({ lastAlertedAt: later(6 * DAY), count: 7 });
});

test("🔴 전달 실패·예외·타임아웃이면 표식이 없고 다음 틱에 다시 보낸다", async () => {
  const db = await seed([unfulfilledRow("a1"), verifyFailureRow("b1", "CURRENCY_MISMATCH")]);
  const unmarked = () => {
    expect(rowOf(db, "a1").metadata.fulfillmentAlert).toBeUndefined();
    expect(rowOf(db, "b1").metadata.verifyAlert).toBeUndefined();
  };
  expect(await alertPaymentAnomalies(db, { notify: async () => ({ delivered: false }), now: NOW })).toMatchObject({ delivered: false, marked: 0 });
  unmarked();
  expect(await alertPaymentAnomalies(db, { notify: async () => { throw new Error("boom"); }, now: NOW })).toMatchObject({ delivered: false, marked: 0 });
  unmarked();
  jest.spyOn(console, "error").mockImplementation(() => {});
  const hanging = createOperatorAlertSender(DISCORD_ENV, { send: () => new Promise(() => {}), timeoutMs: 20 });
  expect(await alertPaymentAnomalies(db, { notify: hanging, now: NOW })).toMatchObject({ delivered: false, marked: 0 });
  unmarked();
  expect(await alertPaymentAnomalies(db, { notify: deliveredNotify(), now: later(10 * MIN) })).toMatchObject({ delivered: true, marked: 2 });
});

test("🔴 운영자 채널 미설정이면 공개 대화방 env(TELEGRAM_*)가 있어도 fetch 0회 — unconfigured 로그만, 표식 없음", async () => {
  const db = await seed([unfulfilledRow("a1"), verifyFailureRow("b1", "AMOUNT_MISMATCH")]);
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const env = { TELEGRAM_BOT_TOKEN: "test-bot-token", TELEGRAM_CHAT_ID: "-1001234567890" };
  expect(await alertPaymentAnomalies(db, { notify: createOperatorAlertSender(env), now: NOW })).toMatchObject({ delivered: false, marked: 0 });
  expect(global.fetch).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledWith("[pay-alert] unconfigured");
  expect(await notifyOperators(env, { subject: "s", text: "t" })).toEqual({ ok: false, error: "unconfigured", results: [] });
  expect(global.fetch).not.toHaveBeenCalled();
});

test("전달 판정 = ok 이면서 skipped 아닌 채널 1개 이상 — 수신자 없는 메일(skipped)만 있으면 미전달", async () => {
  const skippedOnly = async () => ({ ok: true, error: "", results: [{ channel: "email", ok: true, skipped: "no_recipient" }] });
  expect(await createOperatorAlertSender({}, { send: skippedOnly })({ subject: "s", text: "t" })).toMatchObject({ delivered: false });
  const webhookFailed = async () => ({ ok: false, error: "", results: [{ channel: "discord", ok: false, status: 500 }] });
  expect(await createOperatorAlertSender({}, { send: webhookFailed })({ subject: "s", text: "t" })).toMatchObject({ delivered: false });
  const oneDelivered = async () => ({ ok: true, results: [{ channel: "email", ok: true, skipped: "no_recipient" }, { channel: "discord", ok: true, status: 204 }] });
  expect(await createOperatorAlertSender({}, { send: oneDelivered })({ subject: "s", text: "t" })).toMatchObject({ delivered: true });
});

test("🔴 운영자 채널로 간 인자·본문에 userId·이메일·전화·rawPortOne·전체 주문번호가 없다", async () => {
  const db = await seed([unfulfilledRow("a1"), verifyFailureRow("b1", "PAYMENT_ID_MISMATCH")]);
  expect(await alertPaymentAnomalies(db, { notify: createOperatorAlertSender(DISCORD_ENV), now: NOW })).toMatchObject({ delivered: true, marked: 2 });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [url, init] = global.fetch.mock.calls[0];
  expect(url).toBe(DISCORD_ENV.FEEDBACK_DISCORD_WEBHOOK_URL);
  const sent = JSON.stringify(global.fetch.mock.calls);
  expect(JSON.parse(init.body).content).toContain(maskId(uid("a1")));
  for (const secret of [USER_ID, EMAIL, PHONE, "raw-pg-tx-0001", "rawPortOne", uid("a1"), uid("b1")]) expect(sent).not.toContain(secret);
});

test("섹션 20건·본문 길이 한도 — 빠진 주문은 표식 없이 다음 틱에 간다", async () => {
  const many = Array.from({ length: 25 }, (_, i) => unfulfilledRow(`s${String(i).padStart(2, "0")}`, { featureKey: "a", metadata: {} }));
  const capped = buildPaymentAlert({ unfulfilled: many, now: NOW });
  expect(capped.included.unfulfilled).toHaveLength(20);
  expect(capped.text).toContain("(외 5건은 다음 알림)");
  expect(capped.text.length).toBeLessThanOrEqual(PAYMENT_ALERT_TEXT_LIMIT);

  const longKey = "k".repeat(80);
  const rows = [
    ...Array.from({ length: 20 }, (_, i) => unfulfilledRow(`l${String(i).padStart(2, "0")}`, { featureKey: longKey, paidAt: ago((45 + i) * MIN) })),
    ...Array.from({ length: 20 }, (_, i) => verifyFailureRow(`v${String(i).padStart(2, "0")}`, "AMOUNT_MISMATCH", { featureKey: longKey })),
  ];
  const db = await seed(rows);
  const notify = deliveredNotify();
  const first = await alertPaymentAnomalies(db, { notify, now: NOW });
  const { text } = notify.mock.calls[0][0];
  expect(text.length).toBeLessThanOrEqual(PAYMENT_ALERT_TEXT_LIMIT);
  expect(first.marked).toBeGreaterThan(0);
  expect(first.marked).toBeLessThan(40);
  expect(text).toContain(`(외 ${40 - first.marked}건은 다음 알림)`);
  const second = await alertPaymentAnomalies(db, { notify, now: later(10 * MIN) });
  expect(second.unfulfilled + second.verifyFailures).toBe(40 - first.marked);
});

test("🔴 결제 알림 모듈은 공개 대화방 헬퍼를 모른다 — 운영자 채널(feedback-notify)만 동적 import", () => {
  const source = readFileSync("worker/payments/fulfillment-alert.js", "utf8");
  expect(source).not.toMatch(/telegram/i);
  expect(source).toContain('await import("../lib/feedback-notify.js")');
  expect(readFileSync("worker/payments/reconcile.js", "utf8")).not.toMatch(/telegram/i);
});
