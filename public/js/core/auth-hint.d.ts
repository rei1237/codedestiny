// js/core/auth-hint.js 의 타입 선언. 런타임 정본은 .js 쪽 하나이고 이 파일은 타입만 제공한다.
// sync-legacy-static-to-public.mjs 는 .js/.mjs/.cjs/.json 만 미러링하므로 이 파일은 배포되지 않는다.

declare const authHint: {
  /** localStorage/sessionStorage 토큰, 캐시된 사용자, fortune_auth_role 쿠키(guest/anonymous 값 제외) 순으로 확인한다. */
  hasAuthHint(): boolean;
};

export default authHint;
