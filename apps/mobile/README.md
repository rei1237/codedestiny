# Code Destiny Android App

Android 앱 루트는 웹 빌드 산출물(`dist`)을 Capacitor WebView에 패키징합니다.

```bash
npm run mobile:android:add
npm run mobile:android:sync
```

앱 내 단건 결제는 `window.CodeDestinyNative.purchase()`를 통해 Google Play Billing으로 흐르고, Worker의 `/api/app-store/google/verify`가 기존 권한 테이블에 결제 증빙을 저장합니다.

## Release setup

1. `apps/mobile/android/release-signing.example.properties`를 복사해 `apps/mobile/android/release-signing.properties`를 만들고 upload key, `CODE_DESTINY_ANDROID_VERSION_CODE`, `CODE_DESTINY_ANDROID_VERSION_NAME`을 채웁니다.
2. Play Console OAuth callback은 기존 `/api/auth/oauth/{provider}/callback`을 유지하고, 앱은 `com.codedestiny.app://auth` 딥링크로 `social_grant`를 받습니다.
3. Worker 배포 환경에 `GOOGLE_PLAY_PACKAGE_NAME`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PRODUCT_MAP`, `GOOGLE_PLAY_RTDN_TOKEN`을 설정합니다.
4. Play Console Pub/Sub RTDN push URL은 `/api/app-store/google/rtdn`으로 연결하고 `GOOGLE_PLAY_RTDN_TOKEN`과 같은 bearer 또는 channel token을 보냅니다.
