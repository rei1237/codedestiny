/**
 * "이 번들은 앱(Android/Capacitor)용으로 빌드됐는가" — **빌드 타깃** 단일 상수.
 *
 * 🔴 런타임 판별(js/core/app-context.js 의 `isApp()`)과 축이 다르다. 그쪽은 "지금 이 문서가
 * 앱 WebView 안에서 돌고 있는가"를 window 신호로 보고, 웹 번들에서도 true 가 될 수 있다.
 * 여기 상수는 `npm run build:mobile`(NEXT_PUBLIC_RUNTIME_TARGET=mobile-app)로 만든 번들에서만
 * true 이며, 웹 번들에서는 영원히 false 다.
 *
 * 🔴 정적 export 산출물에서 **무엇을 렌더할지**를 가르는 데는 반드시 이쪽을 쓴다.
 * `isApp()` 로 가르면 서버 프리렌더(window 없음 → 빌드 상수)와 하이드레이션(window 신호 →
 * 브릿지 주입 타이밍 의존)이 어긋나 하이드레이션 불일치가 난다. 이 상수는 Next 가 서버·클라이언트
 * 양쪽에 같은 리터럴로 인라인하므로 그 갈림이 원리적으로 생기지 않는다.
 *
 * 근거: docs/app-audit/APP_UIUX_SPEC.md §64 — 빌드 상수는 SSR/빌드 시점 판정 전용.
 */
export const IS_APP_BUILD = process.env.NEXT_PUBLIC_RUNTIME_TARGET === "mobile-app";
