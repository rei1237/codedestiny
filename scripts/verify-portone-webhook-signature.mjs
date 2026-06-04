import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { __paymentsTestUtils } from "../worker/routes/payments.js";

const {
  signStandardWebhookPayload,
  verifyPortOneWebhookSignature,
} = __paymentsTestUtils;

const rawBody = JSON.stringify({
  type: "Transaction.Paid",
  data: { paymentId: "cd-single-unit-1710000000000-test" },
});
const webhookId = "msg_unit_portone_01";
const timestamp = "1710000000";
const rawSecret = "unit-test-webhook-secret";
const whsec = `whsec_${Buffer.from(rawSecret, "utf8").toString("base64")}`;

const signature = await signStandardWebhookPayload(whsec, webhookId, timestamp, rawBody);
const validHeaders = new Headers({
  "webhook-id": webhookId,
  "webhook-timestamp": timestamp,
  "webhook-signature": `v1,${signature}`,
});

assert.equal(
  await verifyPortOneWebhookSignature(whsec, rawBody, validHeaders),
  true,
  "valid Standard Webhooks signature should pass",
);

assert.equal(
  await verifyPortOneWebhookSignature(whsec, `${rawBody} `, validHeaders),
  false,
  "tampered raw body should fail",
);

const xHeaderSignature = await signStandardWebhookPayload(rawSecret, webhookId, timestamp, rawBody);
const xHeaders = new Headers({
  "x-webhook-id": webhookId,
  "x-webhook-timestamp": timestamp,
  "x-webhook-signature": `v1,${xHeaderSignature}`,
});

assert.equal(
  await verifyPortOneWebhookSignature(rawSecret, rawBody, xHeaders),
  true,
  "raw secret and x-webhook-* aliases should pass",
);

const badHeaders = new Headers({
  "webhook-id": webhookId,
  "webhook-timestamp": timestamp,
  "webhook-signature": "v1,invalid",
});

assert.equal(
  await verifyPortOneWebhookSignature(whsec, rawBody, badHeaders),
  false,
  "invalid signature should fail",
);

console.log("[verify-portone-webhook-signature] OK");
