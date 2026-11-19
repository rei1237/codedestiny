// js/core/app-context.js 의 타입 선언. 런타임 정본은 .js 쪽 하나이고 이 파일은 타입만 제공한다.
// sync-legacy-static-to-public.mjs 는 .js/.mjs/.cjs/.json 만 미러링하므로 이 파일은 배포되지 않는다.

declare const appContext: {
  /**
   * 지금 실행 중인 문서가 앱(Android WebView / Capacitor) 안인가.
   * 확실한 앱 신호 4종의 합집합이며, `!!window.Capacitor` 같은 과대판정 폴백은 쓰지 않는다.
   * SSR/프리렌더에서는 NEXT_PUBLIC_RUNTIME_TARGET 만 본다.
   */
  isApp(): boolean;
  /**
   * 실행 플랫폼. 앱이 아니면 "web", 앱이면 Capacitor.getPlatform() 의 "ios"/"android".
   * 앱인데 판별할 수 없으면 "android"(기존 가정). 웹 브라우저가 옛 캐시 파일을 쓸 수 있으니
   * classic script 전역(`__cdAppContext`)으로 부를 때는 존재 여부를 먼저 확인한다.
   */
  getPlatform(): "android" | "ios" | "web";
};

export default appContext;
