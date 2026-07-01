import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: process.env.CODE_DESTINY_ANDROID_PACKAGE_ID || "com.codedestiny.app",
  appName: process.env.CODE_DESTINY_ANDROID_APP_NAME || "Code Destiny - 꿀꿀 운세",
  webDir: "../../dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    path: "android",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#070b1f",
    },
  },
};

export default config;
