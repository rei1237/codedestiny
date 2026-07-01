# Code Destiny Android App

Android 앱은 루트 웹 빌드 산출물(`dist`)을 Capacitor WebView에 패키징한다.

```bash
npm run mobile:android:add
npm run mobile:android:sync
```

앱 내부 신규 유료 구매는 `window.CodeDestinyNative.purchase()`를 통해 Google Play Billing으로 흐르고, Worker의 `/api/app-store/google/verify`가 기존 권한 테이블에 결제 증빙을 저장한다.
