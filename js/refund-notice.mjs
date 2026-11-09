// 결제 버튼 옆 자동 환불 한 줄의 단일 정본. js/ 는 브라우저로 그대로 나가 lib/ 를 import 할 수 없어
// 여기에 두고, lib/marketing/home-concerns.mjs 가 다시 내보낸다(서버·빌드는 거기서 읽는다).
export const REFUND_LINE = '환불 기준과 문의 방법을 확인하세요.';

// 한국어 환불·청약철회 정책(app/refund-policy/page.js). /refund/는 같은 페이지를 다시 내보내는 별칭이다.
export const REFUND_POLICY_HREF = '/refund-policy/';
export const REFUND_POLICY_LABEL = '환불 기준';

/** 구매 버튼 아래에 붙는 한 줄. 문구와 링크는 위 상수에서만 온다. */
export function renderRefundNoticeHtml(escape = value => String(value ?? '')) {
  return `<p class="fortuneAction__refund">${escape(REFUND_LINE)} <a href="${escape(REFUND_POLICY_HREF)}">${escape(REFUND_POLICY_LABEL)}</a></p>`;
}
