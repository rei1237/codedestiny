/**
 * 구매 확인 메일 — 전자상거래법 제13조("계약내용에 관한 서면"의 교부)에 해당하는 통지.
 *
 * 🔴 **결제 경로에 넣지 않는다.** 확정(confirmOrder)은 PG 검증 → 주문 PAID → 권한 지급을
 *    admission 슬롯 12개짜리 전용 레인에서 돌린다. 거기에 사용자 조회 + 외부 HTTP(Resend)를
 *    얹으면, 메일 서버가 느려지는 순간 그 지연이 그대로 **결제창 하드 503** 으로 나온다
 *    (2026-08-12 에 같은 모양의 사고가 세 번 났다 — worker/lib/db.js 주석 참고).
 *    그래서 10분 크론(payments-v2-reconcile)이 "지급까지 끝났는데 아직 안 보낸 주문"을 걷는다.
 *    영수증이 몇 분 늦는 것은 결제가 실패하는 것보다 낫다.
 *
 * 🔴 **선점 후 발송.** 표식을 먼저 CAS 로 찍고 보낸다. 보낸 뒤에 찍으면 아이솔레이트가 중간에
 *    죽었을 때 같은 영수증이 두 번 간다. 발송이 실패하면 표식을 되돌려 다음 크론이 다시 잡는다.
 *
 * 🔴 **나이 창(RECEIPT_MAX_AGE_MS)이 없으면 첫 배포에 과거 주문 전체로 메일이 나간다.**
 *    이 기능 이전에 결제한 사람에게 갑자기 영수증이 가는 것은 사고다. 창 밖 주문은 영원히
 *    대상이 아니고, 창 안에서는 크론 12회분의 재시도 여유가 된다.
 *
 * 언어: **한국어 + 영어 병기 한 벌.** 주문에 구매자 로케일이 없고(User 스키마에 없다), 그걸
 * 넣으려면 결제 준비 경로를 건드려야 한다. 법정 고지를 12개 로케일로 기계번역하는 것은
 * 2026-08-20 에 사업자 표기에서 실제로 사고가 된 방식이라 하지 않는다. 준거법은 대한민국이므로
 * 한국어가 정본이고 영어는 병기다.
 */

import { Payment, User } from "../lib/models.js";
import { resolvePaymentMethodLabel } from "../lib/payment-method-label.js";
import { sendEmail as sendEmailViaResend } from "../lib/resend.js";
import { BUSINESS_IDENTITY, BUSINESS_PHONE_INTL, SUPPORT_EMAIL } from "../../lib/site-policy-config.js";
import { RECEIPT_WITHDRAWAL_ROWS } from "../../lib/legal/refund-policy-rows.js";
import { toObjectId } from "./db.js";
import { resolveProduct } from "./catalog.js";
import { resolvePassPlan } from "./passes.js";

/** 이 창보다 오래된 주문에는 영수증을 보내지 않는다. 기능 도입 이전 주문을 보호한다. */
export const RECEIPT_MAX_AGE_MS = 2 * 60 * 60_000;

/**
 * 한 크론 회차에 처리할 최대 건수.
 *
 * 🔴 작게 잡는 이유는 성능이 아니라 **점유 시간**이다. 이 스윕은 결제 레인의 DB 슬롯 안에서
 *    돌고 발송은 외부 HTTP 다 — 한 회차가 길어질수록 그 슬롯이 사용자 요청에서 빠져 있다.
 *    10분마다 5건이면 하루 720건이고, 실제 결제량(90일 20건대)의 수십 배다.
 */
const RECEIPT_BATCH_LIMIT = 5;

/**
 * 발송 한 건을 기다리는 상한. Resend 가 응답하지 않을 때 슬롯을 붙들고 있지 않기 위한 것이다.
 * 🔴 타임아웃은 실패로 센다 — 표식이 되돌아가 다음 크론이 다시 잡는다. 그 결과 최악의 경우
 *    같은 영수증이 두 번 갈 수 있다(첫 요청이 늦게 성공한 경우). 안 보내는 것보다 낫다는 판단이다.
 */
const RECEIPT_SEND_TIMEOUT_MS = 8_000;

const SITE_ORIGIN = "https://code-destiny.com";
const REFUND_POLICY_URL = `${SITE_ORIGIN}/en/refund-policy/`;
const TERMS_URL = `${SITE_ORIGIN}/terms-of-service/`;

function unwrap(result) {
  if (!result) return null;
  return Object.hasOwn(result, "value") ? result.value : result;
}

/**
 * 발송을 무한정 기다리지 않는다. fetch 를 취소하지는 못하지만 **슬롯을 놓아 준다** —
 * 이 스윕이 붙들고 있는 것은 결제 레인의 커넥션이라 기다림 자체가 비용이다.
 */
function withTimeout(promise, ms) {
  if (!(ms > 0)) return promise;
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("receipt_send_timeout")), ms);
    }),
  ]);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 결제일시를 KST 로 적는다. 판매자가 대한민국 사업자이므로 표기 시간대도 KST 다. */
export function formatKstDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const kst = new Date(date.getTime() + 9 * 60 * 60_000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`
    + ` ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())} (KST)`;
}

/**
 * 상품명. 주문에 사람이 읽을 이름이 저장돼 있지 않아 정본에서 다시 푼다.
 * 못 풀면 featureKey 를 그대로 쓴다 — 영수증을 안 보내는 것보다 낫다.
 */
export function resolveOrderProductName(order) {
  if (String(order?.paymentType || "") === "membership_pass") {
    const plan = resolvePassPlan(order?.subscriptionTier, Number(order?.metadata?.durationMonths || 1));
    if (plan?.name) return plan.name;
    return String(order?.subscriptionTier || "이용권");
  }
  try {
    const product = resolveProduct({
      productId: String(order?.productId || ""),
      featureKey: String(order?.featureKey || ""),
    });
    if (product?.label) return product.label;
  } catch {
    // 상품표에서 사라진 옛 상품일 수 있다. 아래 폴백으로 간다.
  }
  return String(order?.featureKey || order?.productId || "");
}

const ROWS = [
  ["주문번호 / Order no.", (order) => String(order.merchantUid || "")],
  ["결제일시 / Paid at", (order) => formatKstDateTime(order.paidAt || order.updatedAt)],
  ["상품명 / Item", (order) => resolveOrderProductName(order)],
  ["결제금액 / Amount", (order) => `${Number(order.paymentAmount || 0).toLocaleString("ko-KR")}원 (KRW)`],
  // 🔴 영수증은 법정 통지라 내부 코드가 그대로 나가면 안 된다(예전엔 order.paymentMethod 원문이었다).
  ["결제수단 / Method", (order) => resolvePaymentMethodLabel(order)],
  ["제공시점 / Delivered", () => "결제 승인 직후 디지털 콘텐츠로 제공 / Digital content, delivered immediately after approval"],
];

const SELLER_ROWS = [
  ["상호 / Company", BUSINESS_IDENTITY.companyName],
  ["대표자 / Representative", BUSINESS_IDENTITY.representative],
  ["사업자등록번호 / Business reg. no.", BUSINESS_IDENTITY.registrationNumber],
  ["통신판매업 신고번호 / Mail-order reg. no.", BUSINESS_IDENTITY.mailOrderNumber],
  ["주소 / Address", `${BUSINESS_IDENTITY.address} (Republic of Korea)`],
  ["연락처 / Phone", BUSINESS_PHONE_INTL],
  ["이메일 / Email", SUPPORT_EMAIL],
];

function renderRows(rows) {
  return rows
    .map(([label, value]) => (
      `<tr><th style="text-align:left;padding:6px 12px 6px 0;vertical-align:top;color:#555;font-weight:600;white-space:nowrap">${escapeHtml(label)}</th>`
      + `<td style="padding:6px 0;vertical-align:top;color:#111">${escapeHtml(value)}</td></tr>`
    ))
    .join("");
}

/**
 * 영수증 본문. 청약철회 문안은 요약하지 않고 `lib/legal/refund-policy-rows.js` 정본을
 * **그대로** 싣는다 — 여기서 다시 쓰면 사이트 문안과 갈라진다.
 */
export function buildReceiptEmail(order) {
  const orderId = String(order?.merchantUid || "");
  const subject = `[Code Destiny] 결제가 완료되었습니다 / Payment confirmed (${orderId})`;
  const html = [
    // 메일 클라이언트는 웹폰트를 신뢰할 수 없다. 시스템 스택에 맡긴다(한글은 OS 폴백이 처리한다).
    '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111">',
    '<h1 style="font-size:20px;margin:0 0 4px">결제가 완료되었습니다</h1>',
    '<p style="font-size:14px;color:#555;margin:0 0 20px">Your payment has been completed.</p>',
    '<table style="width:100%;border-collapse:collapse;font-size:14px">',
    renderRows(ROWS.map(([label, get]) => [label, get(order)])),
    "</table>",
    '<h2 style="font-size:15px;margin:24px 0 8px">청약철회 안내 / Withdrawal</h2>',
    ...RECEIPT_WITHDRAWAL_ROWS.map((row) => (
      `<p style="font-size:13px;line-height:1.6;color:#333;margin:0 0 8px">${escapeHtml(row)}</p>`
    )),
    `<p style="font-size:13px;line-height:1.6;color:#333;margin:0 0 8px">`
      + `전문은 <a href="${TERMS_URL}">이용약관 제12조</a> 및 <a href="${REFUND_POLICY_URL}">환불 정책</a>에서 확인하실 수 있습니다. / `
      + `Full terms: <a href="${TERMS_URL}">Terms of Service, Section 12</a> and <a href="${REFUND_POLICY_URL}">Refund Policy</a>.</p>`,
    '<h2 style="font-size:15px;margin:24px 0 8px">판매자 정보 / Seller</h2>',
    '<table style="width:100%;border-collapse:collapse;font-size:13px">',
    renderRows(SELLER_ROWS),
    "</table>",
    `<p style="font-size:12px;color:#777;margin:20px 0 0">문의: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`,
    "</div>",
  ].join("");
  return { subject, html };
}

/** 발송 권한 선점. null 이면 다른 주체가 이미 잡았다. */
async function claimReceipt(db, { orderId, now }) {
  const result = await db.findOneAndUpdate(
    Payment,
    { merchantUid: orderId, receiptEmailSentAt: null },
    { $set: { receiptEmailSentAt: now } },
    { returnDocument: "after" },
  );
  return unwrap(result);
}

/** 발송 실패 되돌리기. 다음 크론이 같은 주문을 다시 잡는다(나이 창 안에서만). */
async function releaseReceipt(db, { orderId }) {
  await db.findOneAndUpdate(
    Payment,
    { merchantUid: orderId },
    { $set: { receiptEmailSentAt: null } },
    { returnDocument: "after" },
  );
}

/**
 * 지급까지 끝났는데 영수증을 아직 안 보낸 최근 주문에 보낸다.
 *
 * 🔴 재시도 루프가 아니다 — 한 주문당 한 번만 시도하고 실패하면 다음 크론에 다시 만난다.
 *    크론 안에서 재시도를 돌리면 admission 슬롯을 몰아 쓰게 되고 그게 사용자 요청을 굶긴다
 *    (reconcile.js 머리주석과 같은 규칙).
 *
 * @param {object} env
 * @param {object} db
 * @param {{ now?: Date, limit?: number, maxAgeMs?: number, send?: Function }} [options]
 *   send — 테스트 주입점. 기본은 Resend. 🔴 실메일 발송이므로 테스트는 반드시 주입한다.
 */
export async function sendPendingReceiptEmails(env, db, options = {}) {
  const {
    now = new Date(),
    limit = RECEIPT_BATCH_LIMIT,
    maxAgeMs = RECEIPT_MAX_AGE_MS,
    sendTimeoutMs = RECEIPT_SEND_TIMEOUT_MS,
    send = sendEmailViaResend,
  } = options;

  const cutoff = new Date(now.getTime() - maxAgeMs);
  const orders = await db.find(
    Payment,
    {
      status: "paid",
      entitlementGrantedAt: { $ne: null },
      receiptEmailSentAt: null,
      paidAt: { $gte: cutoff },
    },
    { limit },
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let configError = false;

  for (const order of orders) {
    const orderId = String(order?.merchantUid || "");
    if (!orderId) { skipped += 1; continue; }

    let address = "";
    try {
      const user = await db.findOne(User, { _id: toObjectId(String(order.userId || "")) });
      address = String(user?.email || "").trim();
    } catch {
      address = "";
    }

    // 주소가 없으면 다시 시도해도 결과가 같다. 표식을 찍어 매 크론 재조회에서 빼 준다.
    if (!address) {
      await claimReceipt(db, { orderId, now });
      skipped += 1;
      continue;
    }

    // 🔴 보내기 **전에** 선점한다. 진 쪽은 조용히 넘어간다(다른 아이솔레이트가 보내는 중이다).
    const claimed = await claimReceipt(db, { orderId, now });
    if (!claimed) { skipped += 1; continue; }

    const { subject, html } = buildReceiptEmail(order);
    let ok = false;
    let providerConfigError = false;
    let providerFrom = "";
    try {
      const result = await withTimeout(send(env, { to: address, subject, html }), sendTimeoutMs);
      ok = Boolean(result?.ok);
      // 🔴 타임아웃(throw)은 여기 오지 않는다 — 설정 오류가 아니라 일시적 실패이기 때문이다.
      providerConfigError = result?.configError === true;
      providerFrom = String(result?.from || "");
    } catch {
      ok = false;
    }

    if (ok) {
      sent += 1;
    } else {
      failed += 1;
      try {
        await releaseReceipt(db, { orderId });
      } catch {
        // 되돌리기까지 실패하면 이 주문은 영수증 없이 남는다. reconcile 로그에 드러난다.
      }
      // 🔴 계정 설정 실패(401·403·키 누락·발신자 422)는 수신자와 무관하다 — 남은 주문에 보내도
      //    같은 응답이 온다. 계속 돌면 실패 요청만 주문 수만큼 쌓이고 요약은 failed=N 으로만 보여
      //    "주소 몇 개가 나빴다"와 구별되지 않는다(일일 운세 크론이 2026-08-19~08-31 에 그랬다).
      //    선점은 위에서 이미 풀었으므로 설정이 고쳐지면 다음 크론이 그대로 다시 잡는다.
      if (providerConfigError) {
        configError = true;
        console.error(
          `[payments-v2-reconcile] receipt email aborted: provider config failure (from=${providerFrom || "?"})`,
        );
        break;
      }
    }
  }

  return { scanned: orders.length, sent, skipped, failed, configError };
}
