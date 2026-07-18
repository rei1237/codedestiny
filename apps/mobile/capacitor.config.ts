import type { CapacitorConfig } from "@capacitor/cli";

const androidConfig = {
  path: "android",
} as CapacitorConfig["android"];

const config: CapacitorConfig = {
  appId: process.env.CODE_DESTINY_ANDROID_PACKAGE_ID || "com.codedestiny.app",
  appName: process.env.CODE_DESTINY_ANDROID_APP_NAME || "Code Destiny",
  webDir: "../../dist",
  server: {
    androidScheme: "https",
    cleartext: false,
    // 앱은 전용 네이티브 허브 /app 에서 시작한다(클래식 웹 셸 아님).
    // Capacitor는 이 값을 server.appStartPath 에서만 읽는다(android 블록이 아니라).
    appStartPath: "/app",
  },
  android: androidConfig,
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#070b1f",
    },
  },
};

export default config;
