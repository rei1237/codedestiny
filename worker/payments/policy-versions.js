/**
 * 주문 시점 정책 버전 — 주문 문서 `policyVersions` 에 박는 증빙(해외카드 1단계 C6).
 *
 * 🔴 주문 시점에 **게시**돼 있던 버전이지 동의 기록이 아니다. 서버에 남는 동의는 가입 때의
 *    `User.legalConsents` 뿐이다.
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
