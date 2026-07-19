import type { CapacitorConfig } from "@capacitor/cli";

const androidConfig = {
  path: "android",
} as CapacitorConfig["android"];

// html5mode 는 Android 런타임(CapConfig.java 가 server.html5mode 를 읽는다)에는 있지만
// @capacitor/cli 의 타입 정의에는 빠져 있다. android 블록과 같은 방식으로 캐스팅한다.
type ServerConfig = NonNullable<CapacitorConfig["server"]> & { html5mode?: boolean };

const config: CapacitorConfig = {
  appId: process.env.CODE_DESTINY_ANDROID_PACKAGE_ID || "com.codedestiny.app",
  appName: process.env.CODE_DESTINY_ANDROID_APP_NAME || "Code Destiny",
  webDir: "../../dist",
  server: {
    androidScheme: "https",
    cleartext: false,
    // 앱은 기존 모바일 웹 UI(루트 셸)를 그대로 쓰되 앱뷰로 동작한다.
    // Capacitor는 이 값을 server.appStartPath 에서만 읽는다(android 블록이 아니라).
    // 확장자까지 적는다 — 아래 html5mode 를 껐으므로 폴백에 기대지 않는다.
    appStartPath: "/index.html",

    // html5mode 를 끈다.
    //
    // 켜져 있으면 WebViewLocalServer.shouldInterceptRequest 가 확장자 없는 모든 경로를
    // 399행에서 가로채 루트 셸을 돌려준다 — 원래 경로를 잃어버리므로 RouteProcessor(647행)에
    // 도달조차 못 한다. 이게 "탭을 누르면 홈으로 튕기고 웹처럼 되는" 증상의 원인이었다.
    //
    // 끄면 확장자 없는 경로가 RouteProcessor 까지 내려오고, MainActivity 에 등록한 프로세서가
    // "/route" → "/route/index.html" 로 결정론적으로 해석한다. 없는 경로의 홈 폴백도
    // 그 프로세서가 유지하므로 404 는 생기지 않는다.
    html5mode: false,
  } as ServerConfig,
  android: androidConfig,
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      // 셸이 연이 라이트(크림/로즈)로 뜨므로 스플래시도 같은 톤이어야 첫 페인트에 번쩍이지 않는다.
      // 예전 값(#070b1f 네이비)은 앱이 다크 허브를 띄우던 시절의 잔재다.
      backgroundColor: "#fffaf7",
    },
  },
};

export default config;
