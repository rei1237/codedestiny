// PG 복귀 문서 판정. js/destiny-profile.js 의 복귀 처리(쿼리 신호 또는 TTL 안의 단건 티켓)와 같은 조건이다.
// /points 는 코인·이용권 복귀를 PointsClient 가 따로 맡으므로 제외한다.
const PAYMENT_RETURN_QUERY_RE = /[?&](?:portone_redirect|paid_pass_resume|paymentId|payment_id|imp_uid)=/;
const DIRECT_PAYMENT_RESUME_KEY = "cd_direct_payment_resume";
const DIRECT_PAYMENT_RESUME_TTL_MS = 30 * 60 * 1000;

export function isPaymentReturnDocument(): boolean {
  if (typeof window === "undefined") return false;
  if (/^\/points(?:\/|$)/.test(window.location.pathname)) return false;
  if (PAYMENT_RETURN_QUERY_RE.test(window.location.search)) return true;
  const stores: Storage[] = [];
  try { stores.push(window.sessionStorage); } catch { /* storage blocked */ }
  try { stores.push(window.localStorage); } catch { /* storage blocked */ }
  return stores.some(store => {
    try {
      const ticket = JSON.parse(store.getItem(DIRECT_PAYMENT_RESUME_KEY) || "null");
      const age = Date.now() - (Number(ticket?.at) || 0);
      return Boolean(ticket?.merchantUid && ticket?.confirmBody) && age >= 0 && age <= DIRECT_PAYMENT_RESUME_TTL_MS;
    } catch { return false; }
  });
}
