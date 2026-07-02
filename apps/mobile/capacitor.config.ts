import type { CapacitorConfig } from "@capacitor/cli";

const androidConfig = {
  path: "android",
  appStartPath: "/app",
} as CapacitorConfig["android"] & { appStartPath: string };

const config: CapacitorConfig = {
  appId: process.env.CODE_DESTINY_ANDROID_PACKAGE_ID || "com.codedestiny.app",
  appName: process.env.CODE_DESTINY_ANDROID_APP_NAME || "Code Destiny - 꿀꿀 운세",
  webDir: "../../dist",
  server: {
    androidScheme: "https",
    cleartext: false,
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
