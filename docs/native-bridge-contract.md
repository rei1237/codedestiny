# 네이티브 브리지 계약 — 초안 (v0 현황 → v1 제안)

- 상태: **초안**(2026-11-18, Android Phase 0). iOS 이식 프롬프트 §4([docs/prompts/2026-11-18-02-ios-port.md](prompts/2026-11-18-02-ios-port.md))가 v1 기본안이다. 그 프롬프트는 "Android에 이미 있는 메서드 이름과 시그니처가 우선한다"고 정했으므로, 이 문서는 먼저 Android 실제 구현(v0)을 기록하고 그다음 v1과의 대응을 제안한다.
- 웹은 이 계약만 알고 플랫폼은 몰라야 한다. v1 확정은 02 Phase 0과 함께 사용자 승인을 받아 진행한다.
- 진단 맥락: [docs/app-audit/2026-11-18-android-release-phase0.md](app-audit/2026-11-18-android-release-phase0.md)

## 1. 현재 전송 방식 (v0, Android)

- 웹 → 네이티브: Capacitor 플러그인 호출(`window.Capacitor.Plugins.<Name>.<method>(params)`). 결과는 Promise다. 별도의 콜백 ID나 envelope는 없다.
- JS shim: `scripts/app-native-bridge.js`가 `window.CodeDestinyNative`를 만든다(`:565-665`, 대입은 `:665`). 플러그인이 없으면 throw하지 않고 `{ ok:false, code }`로 응답한다.
- fetch 래퍼(`scripts/app-native-bridge.js:182-205`)
  - 같은 출처(`https://localhost`)의 `/api/` 요청만 프로덕션 API 출처로 다시 쓴다.
  - 그 요청에 `Authorization: Bearer`와 `X-Code-Destiny-Runtime: mobile-app`를 붙인다.
  - 🔴 절대 URL로 부르는 요청은 이 래퍼를 통과하지 못한다. 탈퇴 P0가 여기서 나온다.
- 네이티브 → 웹 이벤트: `@capacitor/app`의 `appStateChange`, `appUrlOpen`(딥링크 `com.codedestiny.app://auth`), `backButton`
- 출처 신뢰: WebView는 번들만 로드한다. 최상위 탐색은 `CodeDestinyNavigationPlugin.shouldOverrideLoad`(`apps/mobile/android/app/src/main/java/com/codedestiny/app/CodeDestinyNavigationPlugin.java:42`)가 걸러서 외부 URL은 Custom Tabs로 보낸다(`:178-179`). 플러그인 호출 출처를 따로 검증하지는 않는다. 번들 출처 하나만 있다는 전제에 기대고 있다.

## 2. 현재 메서드 (v0)

### 2-1. `window.CodeDestinyNative` (JS shim)

| 메서드 | 입력 → 결과 | 네이티브 | 비고 |
|---|---|---|---|
| `purchase(input)` | `{productId, ...}` → 플러그인 결과 | `CodeDestinyBilling.purchase` | 지급은 웹의 `app-payment-guard.js`가 `/api/app-store/google/verify`로 별도로 한다. |
| `restore(input?)` | 기본 `{productType:"all"}` → `{purchases[]}` | `CodeDestinyBilling.restore` | `:574` |
| `consume(input)` | `{purchaseToken}` → 결과 | `CodeDestinyBilling.consume` | verify가 성공한 뒤에만 부른다. |
| `queryProducts(input)` | `{productIds[]}` → `{products[]}` | `CodeDestinyBilling.queryProducts` | |
| `credentials.isAvailable/create/restore/clear` | WebAuthn 요청 JSON 문자열 → 결과 | `CodeDestinyCredentials.*` | Restore Credentials(Zero-Tap). 설계: docs/app-audit/ZERO_TAP_SIGNIN_DESIGN.md |
| `openAuth({provider, nextPath, flow, extraParams})` | → `{ok, provider}` | `@capacitor/browser` (Custom Tabs) | google·naver·kakao만 허용한다. 3초 안의 중복 호출은 무시한다. |

### 2-2. Capacitor 플러그인 `@PluginMethod` 전체 목록

| 플러그인 이름 | 메서드 | 파일 |
|---|---|---|
| `CodeDestinyBilling` | purchase, consume, acknowledge, queryProducts, restore | `CodeDestinyBillingPlugin.java:30` |
| `CodeDestinyCredentials` | isAvailable, create, restore, clear | `CodeDestinyCredentialsPlugin.java:48` |
| `CodeDestinyHomeWidget` | getState, requestPin, update | `CodeDestinyHomeWidgetPlugin.java:22` |
| `CodeDestinyLocale` | initialize, setLanguage | `CodeDestinyLocalePlugin.java:15` |
| `CodeDestinyLockScreen` | getState, setState, setEnabled, scheduleAlarms, dismiss, requestOverlayPermission, setPublicContent, testNotification, clearNotifications, openNotificationSettings | `CodeDestinyLockScreenPlugin.java:28` |
| `StatusBar` | setStyle | `CodeDestinyStatusBarPlugin.java:34` |
| `CodeDestinyWallpaper` | getScreenInfo, exportImage | `CodeDestinyWallpaperPlugin.java:30` |
| `CodeDestinyNavigation` | (호출 메서드 없음) `shouldOverrideLoad` 훅 | `CodeDestinyNavigationPlugin.java:32` |

경로 접두는 `apps/mobile/android/app/src/main/java/com/codedestiny/app/`다.

### 2-3. 현재 오류·타임아웃 규칙

- 플러그인이 없을 때: `{ ok:false, code:"NATIVE_*_UNAVAILABLE" }`를 돌려준다(throw하지 않음).
- 웹 → 서버 타임아웃
  - 결제 서버 25초(`scripts/app-payment-guard.js:40`)
  - 인증 15~20초(`scripts/app-native-bridge.js:721`, `:874`, `:892`)
  - 서버 상태 확인 2.5초(`:54`)
- 오류 코드 체계가 통일돼 있지 않다. `OAUTH_PROVIDER_UNSUPPORTED`, `NATIVE_BROWSER_*`, `APP_STORE_*`가 섞여 있다.

## 3. v1 대응 제안 (v0 이름 → §4-2 이름)

v1 공통 형식은 `CodeDestinyNative.call(method, params)`로 하고, 응답은 `{ok:true,result} | {ok:false,error:{code,message,retryable}}`로 통일한다. 기존 v0 메서드는 별칭으로 유지한다(웹 호출부를 바꾸지 않기 위해서다).

| v1 메서드 | Android v0 대응 | 차이 / 할 일 |
|---|---|---|
| `app.getInfo` | 없음 | 신설. `{platform, appVersion, build, bridgeVersion, osVersion, locale, safeArea}`. safeArea는 지금 CSS 변수로 전달하고 있다. |
| `app.ready` | 없음 | 신설(스플래시 → 웹 전환 신호) |
| `auth.signIn` | `openAuth` | Android는 쿠키가 아니라 Bearer다. "세션 쿠키 주입이 끝난 뒤 resolve"를 "토큰 저장이 끝난 뒤 resolve"로 일반화한다. |
| `auth.signOut` | 웹 로그아웃 + `credentials.clear` | 네이티브 저장소와 웹 저장소를 함께 정리하도록 하나로 묶는다(탈퇴 P1과 연결). |
| `store.getProducts` | `queryProducts` | 결과 필드를 `{id, displayPrice, type, title}`로 정규화한다. |
| `store.purchase` | `purchase` + 웹 verify | v1은 "서버 지급이 끝난 뒤에만 granted"다. Android는 지금 웹 가드가 verify를 한다. 셈법은 같지만 경계가 다르다. Phase 2 결제 게이트에서 정한다. |
| `store.restore` | `restore` | 기본 범위를 실제 상품 유형으로 좁힌다(SUBS 조회 제거 검토). |
| `consent.*`, `push.*`, `haptics.play`, `share.open`, `review.request` | 없음 | 03 UX 범위와 함께 신설한다. Android에서 지원하지 않으면 `E_UNSUPPORTED`. |
| `ui.setChrome` | `StatusBar.setStyle` | 이름만 바꾼다. |
| `ui.openExternal` | Navigation 훅 → Custom Tabs | 명시 메서드로 노출한다. |
| (Android 전용) | HomeWidget, LockScreen, Wallpaper, Locale | v1의 `android.*` 네임스페이스로 둔다. iOS는 `E_UNSUPPORTED`. |

오류 코드는 §4-2의 `E_*` 집합으로 통일한다. v0 코드는 다음처럼 대응한다.
- `NATIVE_*_UNAVAILABLE` → `E_UNSUPPORTED`
- `APP_STORE_REQUEST_TIMEOUT` → `E_TIMEOUT`
- 결제 취소 → `E_CANCELLED`
- 보류 결제 → `E_PENDING`

## 4. 출처 신뢰 모델 (제안)

- Android: 번들 출처 하나만 쓴다(`https://localhost`, html5mode false). 원격 페이지를 WebView에 띄우지 않는다는 불변 조건을 계약에 명시한다. OAuth는 항상 Custom Tabs로 연다(불변 규칙 7).
- 민감한 메서드(store·auth)는 메인 프레임에서만 허용한다. Android는 iframe이 플러그인을 부르지 못하게 막는 확인을 v1에서 추가한다.
- iOS는 `frameInfo.isMainFrame` + `securityOrigin` 허용 목록을 쓴다(02 §4-1).

## 5. 버전 정책 (제안)

- `bridgeVersion`은 정수다. v0(현재)는 암묵적으로 0으로 본다. `app.getInfo`를 도입하는 빌드를 1로 한다.
- 메서드를 추가할 때는 같은 버전 안에서 하위 호환으로 한다. 의미가 바뀌면 버전을 올린다.
- 웹은 `app.getInfo`로 기능을 감지한다. 메서드가 없으면 v0으로 보고 우아하게 축소한다.
- 서버 `/app/config`의 `minSupportedBuild`보다 낮으면 강제 업데이트 화면을 보여준다. Android는 Play In-App Update를 함께 쓴다.

## 6. 미정 (v1 확정 때 결정)

- `store.purchase`의 경계: 네이티브가 verify까지 할지, 웹 가드가 계속 할지
- 이벤트 이름: v0 Capacitor 이벤트를 `cdnative:*` CustomEvent로 다시 내보낼지
- 기본 타임아웃(§4-1의 15초)을 Android의 결제 서버 25초와 어떻게 맞출지

## 7. 웹 공통 client (2026-11-19, iOS Phase 2 단계 3)

- 파일: `js/core/native-bridge-client.js`(+ `.d.ts`), 테스트 `__tests__/ui/native-bridge-client.test.js`. 전역 `__cdNativeBridgeClient`, require 도 가능하다.
- 모양: `getPlatform()`(app-context 위임) · `getBridge()` · `has(method)`(점 경로 허용) · `call(method, params)` · `getInfo()` → `{platform, bridgeVersion: 0, available}`.
- `call` 은 v0 메서드 이름(1–2절)을 그대로 받고 3절의 v1 응답 형식으로 돌려준다. throw 하지 않는다. 웹이거나 메서드가 없으면 `E_UNSUPPORTED`, `NATIVE_*_UNAVAILABLE` → `E_UNSUPPORTED`, `APP_STORE_REQUEST_TIMEOUT` → `E_TIMEOUT`(retryable), 그 밖의 코드는 그대로, 코드 없는 예외는 `E_NATIVE`.
- 아직 소비자는 없다. 기존 호출부(`scripts/app-native-bridge.js`, `scripts/app-payment-guard.js`, `app/app/_lib/native-billing.ts`, `js/core/play-display-price.js` 등)는 바꾸지 않았다. Android 동작은 그대로다.
- v1 이름(`store.*`, `auth.*`, `app.getInfo` 네이티브 구현)과 StoreKit 구매 배선은 Phase 4·6에서 이 client 위에 얹는다. 소비자를 옮길 때는 기존 래퍼의 재시도·폴백과 이중으로 감싸지 않는지 확인한다.
