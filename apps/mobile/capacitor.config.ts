import type { CapacitorConfig } from "@capacitor/cli";

const androidConfig = {
  path: "android",
} as CapacitorConfig["android"];

// html5mode 는 Android 런타임(CapConfig.java 가 server.html5mode 를 읽는다)에는 있지만
// @capacitor/cli 의 타입 정의에는 빠져 있다. android 블록과 같은 방식으로 캐스팅한다.
type ServerConfig = NonNullable<CapacitorConfig["server"]> & { html5mode?: boolean };

const config: CapacitorConfig = {
  appId: process.env.CODE_DESTINY_ANDROID_PACKAGE_ID || "com.codedestiny.app",
  appName: process.env.CODE_DESTINY_ANDROID_APP_NAME || "꿀꿀 사주",
  webDir: "../../dist",
  server: {
    androidScheme: "https",
    cleartext: false,
    // 꿀꿀 사주에서 시작하고 영냥이는 서비스 내 탐색으로 이어간다.
    // Capacitor는 이 값을 server.appStartPath 에서만 읽는다(android 블록이 아니라).
    // 확장자까지 적는다 — 아래 html5mode 를 껐으므로 폴백에 기대지 않는다.
    appStartPath: "/ggulggul/index.html",

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
      // 연이·네오 모두 통합 브랜드의 웹 부팅 화면과 같은 시작 배경을 쓴다.
      backgroundColor: "#1b1028",
    },
  },
};

export default config;
