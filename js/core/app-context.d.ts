// js/core/app-context.js 의 타입 선언. 런타임 정본은 .js 쪽 하나이고 이 파일은 타입만 제공한다.
// sync-legacy-static-to-public.mjs 는 .js/.mjs/.cjs/.json 만 미러링하므로 이 파일은 배포되지 않는다.

declare const appContext: {
  /**
   * 지금 실행 중인 문서가 앱(Android WebView / Capacitor) 안인가.
   * 확실한 앱 신호 4종의 합집합이며, `!!window.Capacitor` 같은 과대판정 폴백은 쓰지 않는다.
   * SSR/프리렌더에서는 NEXT_PUBLIC_RUNTIME_TARGET 만 본다.
   */
  isApp(): boolean;
};

export default appContext;
