# Android 배포 키/크리덴셜 체크리스트

`docs/android-release.md`는 빌드·서명 절차를 다룬다. 이 문서는 "어떤 키가 실제로 쓰이는지"와 "배포에 필수인지"만 정리한다. 값이 비어 있어도 디버그 빌드/에뮬레이터 실행은 항상 가능하며, release 빌드에서만 필수 키 누락 시 실패한다(`scripts/android-release-check.ps1` 참고).

| 키 | 용도 | 발급 위치 | 코드 내 참조 위치 | 현재 상태 | 배포 필수 여부 |
|---|---|---|---|---|---|
| `CODE_DESTINY_ANDROID_KEYSTORE_FILE`, `CODE_DESTINY_ANDROID_KEYSTORE_PASSWORD`, `CODE_DESTINY_ANDROID_KEY_ALIAS`, `CODE_DESTINY_ANDROID_KEY_PASSWORD` | release 서명 키스토어 | `keytool -genkeypair` (docs/android-release.md 참고) | `apps/mobile/android/app/build.gradle` signingConfigs, `apps/mobile/android/release-signing.properties` | 예시 파일(`release-signing.example.properties`)만 커밋됨, 실제 값은 로컬 전용 | **필수** — 없으면 `bundleRelease`/`assembleRelease` 실패 |
| Google Play Console 서비스 계정 JSON | Play Publishing API 자동 배포 | Play Console → API 액세스 | 해당 없음 | 코드에 Fastlane/Play Publishing API 연동 없음 | 선택 — 수동 업로드로 충분, 자동 배포 도입 시에만 발급 |
| `google-services.json` | Firebase/FCM 푸시 알림 | Firebase Console | `apps/mobile/android/app/build.gradle:123-128` (파일 없으면 google-services 플러그인 자동 비활성화) | 없음, 웹/워커 코드에 FCM 연동 전무 | 선택 — 푸시 알림 기능 도입 시에만 필요 |
| `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` | 카카오 로그인/SDK | Kakao Developers | `app/components/KakaoSdk.tsx`, `worker/routes/auth.js` | 웹과 동일 값 사용 중 | **필수** — 앱 전용 키해시 추가 불필요(로그인은 `com.codedestiny.app://auth` 커스텀 스킴 딥링크로 처리, AndroidManifest에 이미 등록됨) |
| `NEXT_PUBLIC_PORTONE_IMP_CODE` / `_STORE_ID` / `_CHANNEL_KEY` / `_TOSS_CHANNEL_KEY` / `_PG_CARD` / `_MOBILE_REDIRECT_PATH` | PortOne 결제 SDK | PortOne 콘솔 | `lib/payment/portone.ts`, GitHub Actions `cloudflare-pages-deploy.yml` | 웹 배포 시 이미 주입됨 | **필수** — 앱은 static export 산출물을 그대로 번들링하므로 앱 전용 값 불필요 |
| Galaxia Moneytree 키 | 결제 PG | — | 해당 없음(문서 언급만) | 코드 미구현 | 해당 없음 |
| App Links SHA-256 fingerprint / `.well-known/assetlinks.json` | Digital Asset Links (TWA/App Links) | Play Console 서명 정보 | 해당 없음 | 미사용 — Capacitor WebView 방식이라 Android App Links 불필요, 인증은 커스텀 스킴 딥링크만 사용 | 해당 없음 |
| AdMob 앱 ID/광고 단위 ID | 네이티브 광고 | AdMob 콘솔 | 해당 없음 | 코드/env 참조 없음 | 해당 없음 |
| `applicationId` | 앱 패키지 식별자 | — | `apps/mobile/android/app/build.gradle` | `com.codedestiny.app`로 확정 | 필수(이미 완료) |
| `CODE_DESTINY_ANDROID_VERSION_CODE` / `VERSION_NAME` | 버전 관리 | — | `release-signing.properties` | env var 기반 전략 기 구현 | 필수(release 시마다 값 증가 확인) |

## 참고

- 카카오톡 인앱브라우저 전용 판별 로직(`isKakaoInApp` 등)은 프로젝트에 없다. `js/share.js`의 카카오 공유는 `kakaotalk://send` OS 레벨 딥링크만 사용하므로 네이티브 앱 WebView와 모바일 브라우저에서 동일하게 동작한다. 네이티브 앱 여부를 구분해야 하는 새 기능이 생기면 이미 존재하는 `isMobileAppRuntime()`(`app/_lib/billing-client.ts`, `app/_lib/auth-client.ts` — `Capacitor.isNativePlatform()` / `NEXT_PUBLIC_RUNTIME_TARGET=mobile-app` / `__CODE_DESTINY_RUNTIME_TARGET` 확인)를 재사용할 것.
