/**
 * 주문 시점 정책 버전 — 주문 문서 `policyVersions` 에 박는 증빙(해외카드 1단계 C6).
 *
 * 🔴 주문 시점에 **게시**돼 있던 버전이지 동의 기록이 아니다. 주문 시점의 동의는 아래
 *    `buildRefundConsentRecord` 가 따로 남긴다(그 전까지 서버에 남는 동의는 가입 때의
 *    `User.legalConsents` 뿐이었다).
 * - terms: 이용약관 시행일. 환불정책은 약관 §12 라 여기에 포함된다.
 * - privacy: 개인정보처리방침 시행일.
 *
 * 값은 worker/routes/auth.js AUTH_TERMS_VERSION·AUTH_PRIVACY_VERSION,
 * app/terms-of-service/TermsContent.jsx TERMS_EFFECTIVE_DATE,
 * app/privacy-policy/PrivacyPolicyContent.jsx PRIVACY_POLICY_EFFECTIVE_DATE 와 같아야 한다
 * (__tests__/worker/payments-v2.policy-versions.test.js 가 텍스트로 대조한다).
 */
export const ORDER_POLICY_VERSIONS = Object.freeze({
  terms: "2026-04-11",
  privacy: "2026-08-25",
});

/**
 * 주문 시점 환불 동의 기록 — 주문 문서 `refundConsent`(해외카드 2단계). 전자상거래법 제17조 청약철회
 * 안내를 결제 전에 고지하고 동의받았다는 증빙이고, 다투는 자리는 제22조(사업자 입증책임)다.
 *
 * 🔴 **"클라이언트가 동의를 보냈다"는 사실의 기록이지 서버가 동의를 강제한 결과가 아니다.**
 *    강제하지 않는 이유는 결제 번호 동의와 같다(worker/routes/auth.js 의 phoneConsent 머리주석):
 *    동의 없는 요청을 400 으로 막으면 스토어에 남은 구버전 앱이 결제를 통째로 못 하게 되고,
 *    그 위험이 얻는 것보다 크다. 동의 전 결제 시작을 막는 것은 UI 쪽이다(이용권 모달은 체크 전
 *    결제수단 그리드 전체가 잠긴다). 그래서 동의가 없으면 거절이 아니라 `null` 을 남긴다 —
 *    "동의 없이 만들어진 주문"이 그대로 보이는 편이 증빙으로도 정확하다.
 *
 * - agreed: 항상 true(false 면 이 레코드 자체를 만들지 않는다).
 * - agreedAt: 주문 생성 시각. 체크박스를 누른 시각이 아니라 **서버가 받은 시각**이다.
 * - termsVersion: 동의 시점에 게시돼 있던 이용약관 시행일. 환불정책이 약관 §12 라 이 값이다.
 * - source: 동의를 받은 화면. 레일이 늘면 여기서 갈린다(지금은 이용권 모달 하나뿐).
 */
export function buildRefundConsentRecord(agreed, { now = new Date(), source = "" } = {}) {
  if (agreed !== true) return null;
  return {
    agreed: true,
    agreedAt: now,
    termsVersion: ORDER_POLICY_VERSIONS.terms,
    ...(source ? { source: String(source) } : {}),
  };
}
