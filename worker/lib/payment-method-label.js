/**
 * 결제수단 코드 → 사람이 읽는 라벨. **읽기 경로 전부가 이 파일 하나를 본다.**
 *
 * ## 왜 공유 모듈인가
 *
 * 라벨표가 worker/routes/payments.js 안에만 있었다. 그런데 주문 상세 `GET /api/payments/orders/:id`
 * 는 2026-08-13 컷오버 이후 worker/payments/compat.js 를 타므로(worker/index.js 의 legacyShape)
 * 그 표를 못 봤고, `order.paymentMethod` **원문**이 그대로 화면에 나갔다. 표를 복제하면 다음에
 * 또 갈라지므로 옮겼다 — 서버 3곳(주문 상세·결제내역·영수증 메일)이 여기만 부른다.
 *
 * ## 🔴 마지막 return 이 코드 원문을 돌려주지 않는다
 *
 * 모르는 코드는 원화 단건 결제로 접는다. 결제내역 목록(app/points/PointsClient.tsx
 * formatPaymentMethodLabel)이 예전부터 그렇게 접어 왔으므로, 상세만 원문을 내보내면 같은 주문이
 * 두 화면에서 다르게 보인다. 표에 코드를 늘리는 것이 정답이고,
 * `verify:checkout-pass-card` 가 결제창 표(DIRECT_PAY_METHODS)의 orderMethod 전수를 여기에 대고
 * **실제로 호출해** 강제한다(문자열 존재 검사가 아니다).
 */

/**
 * PortOne V2 가 돌려주는 `method.type`(소문자) → 우리 내부 코드.
 *
 * 🔴 확정(markOrderPaid)이 주문의 paymentMethod 를 이 값으로 덮어써 왔다. 그래서 DB 에는
 * `paymentmethodeasypay` 같은 행이 이미 쌓여 있다 — 지난 주문을 되살리려면 이 표가 필요하다.
 */
export const PG_METHOD_CODE = Object.freeze({
  paymentmethodcard: "card_general",
  paymentmethodeasypay: "easy_pay",
  paymentmethodtransfer: "transfer",
  paymentmethodvirtualaccount: "virtual_account",
  paymentmethodgiftcertificate: "gift_certificate",
  paymentmethodmobile: "mobile",
});

/** 내부 코드 → 한국어 라벨. */
const METHOD_LABEL = Object.freeze({
  card: "카드 결제",
  card_general: "카드 결제",
  easy_pay: "간편결제",
  kakaopay: "카카오페이",
  naverpay: "네이버페이",
  transfer: "실시간 계좌이체",
  virtual_account: "가상계좌",
  mobile: "휴대폰 소액결제",
  // 상품권은 발행사별로 코드가 다르다(js/core/checkout-entry.js DIRECT_PAY_METHODS.orderMethod).
  gift_certificate: "상품권",
  gift_cultureland: "컬쳐랜드 문화상품권",
  gift_booknlife: "도서문화상품권",
  gift_smart_munsang: "스마트문상",
});

/**
 * 계열. 같은 계열이면 브랜드를 아는 우리 코드가 이긴다 — PG 는 `easy_pay` 까지만 알려주고
 * 어느 간편결제사였는지는 결제창을 띄운 우리가 이미 안다.
 */
const METHOD_FAMILY = Object.freeze({
  card: "card",
  card_general: "card",
  easy_pay: "easy_pay",
  kakaopay: "easy_pay",
  naverpay: "easy_pay",
  transfer: "transfer",
  virtual_account: "virtual_account",
  mobile: "mobile",
  gift_certificate: "gift",
  gift_cultureland: "gift",
  gift_booknlife: "gift",
  gift_smart_munsang: "gift",
});

/** 이용권으로 커버돼 실제 과금이 없는 건. "카드 결제"로 보이면 안 된다. */
const PASS_COVERED_CODES = Object.freeze(["pass", "family", "membership_pass", "subscription"]);
/** accessType 쪽 판정은 subscription 을 포함하지 않는다(구독 카드 결제가 여기로 새면 안 된다). */
const PASS_COVERED_ACCESS_TYPES = Object.freeze(["pass", "family", "membership_pass"]);
/** 이벤트 지급분(월정석)으로 처리된 건. */
const PROMOTION_CODES = Object.freeze(["moonlight_stone", "monthly_credit", "monthly"]);

/** 🔴 표에 없는 코드가 도달했을 때의 라벨. 코드 원문은 절대 내보내지 않는다. */
export const GENERIC_PAID_LABEL = "카드 결제";
export const PASS_COVERED_LABEL = "이용권으로 처리";
export const PROMOTION_LABEL = "이용권 혜택";

/** PG 가 준 값이든 우리가 쓴 값이든 하나의 내부 코드로 접는다. 모르는 값은 그대로 돌려준다. */
export function normalizePaymentMethodCode(value) {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return "";
  return PG_METHOD_CODE[code] || code;
}

/** 계열 이름. 표에 없으면 빈 문자열 — 가드가 그걸 실패로 읽는다. */
export function paymentMethodFamily(value) {
  return METHOD_FAMILY[normalizePaymentMethodCode(value)] || "";
}

/** 주문·결제 문서 하나를 받아 화면에 그대로 쓸 수 있는 라벨을 돌려준다. */
export function resolvePaymentMethodLabel(payment) {
  const metadata = payment?.metadata && typeof payment.metadata === "object" ? payment.metadata : {};
  const code = normalizePaymentMethodCode(payment?.paymentMethod);
  const accessType = String(payment?.accessType || "").trim().toLowerCase();
  const currency = String(metadata.currency || "").trim().toUpperCase();

  if (PROMOTION_CODES.includes(code) || accessType === "membership_credit"
    || currency === "MOONLIGHT_STONE" || currency === "MONTHLY_CREDIT") {
    return PROMOTION_LABEL;
  }
  if (PASS_COVERED_CODES.includes(code) || PASS_COVERED_ACCESS_TYPES.includes(accessType)) {
    return PASS_COVERED_LABEL;
  }
  if (!code) return "-";
  return METHOD_LABEL[code] || GENERIC_PAID_LABEL;
}

/**
 * 확정 시점에 주문에 기록할 결제수단.
 *
 * 🔴 PG 가 준 굵은 타입으로 우리가 이미 아는 브랜드를 덮지 않는다. PortOne V2 는 `method.type` 으로
 * `PaymentMethodEasyPay` 까지만 알려주므로, 그 값을 그대로 쓰면 결제창에서 고른 카카오페이·
 * 계좌이체·상품권 3종이 **승인되는 순간 지워져** 결제내역이 전부 "카드 결제"로 보인다(2026-08-31).
 * 계열이 같으면 우리 코드를 지키고, 계열이 다르면(카드창에서 가상계좌가 발급된 경우 등) 실제로
 * 승인된 PG 값을 쓴다.
 */
export function resolveConfirmedPaymentMethod(storedMethod, pgMethod) {
  const stored = normalizePaymentMethodCode(storedMethod);
  const fromPg = normalizePaymentMethodCode(pgMethod);
  if (!fromPg) return stored || "unknown";
  if (!stored) return fromPg;
  const storedFamily = METHOD_FAMILY[stored] || "";
  const pgFamily = METHOD_FAMILY[fromPg] || "";
  if (storedFamily && storedFamily === pgFamily) return stored;
  return fromPg;
}
