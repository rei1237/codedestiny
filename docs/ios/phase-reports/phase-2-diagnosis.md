# iOS Phase 2 진단 — 웹 플랫폼 레이어 (읽기 전용)

- 작성: 2026-11-18. 기준 커밋은 origin/main `57c938db7`.
- 범위: 인수인계 문서 [ios-phase2-2026-11-18](../../handoff/ios-phase2-2026-11-18.md)의 설계 질문 1–8, 세션, 서비스 워커.
- 이번 단계에서는 코드를 바꾸지 않았다.
- 사용자 지시 원문(2026-11-18): "정해야하는 부분은 추천안으로 진행해줘". 그래서 아래 추천안을 기본 계획으로 삼는다.
  - GREEN 항목은 추천안대로 진행한다.
  - RED 항목은 결제·인증·공유 동작에 해당한다. 구현 전에 사용자 승인을 1회 받는다.
- 실측과 추정을 나눠 표기한다.
  - **[실측]**: `git grep`, 코드 읽기, node 실행으로 확인한 사실이다.
  - **[추정]**: 기기나 소스로 확인하지 못한 내용이다.
- 이 문서에서 "제외 범위"는 다음 경로를 뺀 `git grep` 검색을 뜻한다.
  - 생성 미러와 빌드 산출물: `public/`, `dist/`
  - 그 밖의 경로: `docs/`, `worker/`, `__tests__/`, `apps/`, `scripts/`, `content/`, `app/admin/`, `js/vendor/`, `.claude/`

## 0. 프롬프트 전제와 실제의 차이

| 프롬프트·인수인계의 전제 | 실제 [실측] | 영향 |
|---|---|---|
| iOS 바이너리가 없다(phase-1 보고) | `apps/mobile/ios` Capacitor iOS 프로젝트가 이미 있다. 근거는 `apps/mobile/ios/App/App/CodeDestinyViewController.swift`, `CapApp-SPM/Package.swift`(iOS 15, capacitor-swift-pm 8.4.3), `Info.plist:6`(URL scheme `com.codedestiny.app`), `PrivacyInfo.xcprivacy`. 커밋 이력: 7a4caad1c(2026-10-24), 0d9bffb97 "chore: prepare ios 1.0.59 release"(2026-11-13) | Q1의 답이 정해진다. 새 셸은 만들지 않는다 |
| `isMobileAppRuntime()`이 두 곳에 따로 정의돼 있다 | 두 곳 모두 `js/core/app-context.js`의 `isApp()`에 위임한다(`app/_lib/auth-client.ts:146`, `app/_lib/billing-client.ts:2757`) | 판별 정본은 이미 하나다. 인수인계 문구를 고쳤다 |
| 세션을 HttpOnly 쿠키로 바꾼다 | 웹은 이미 HttpOnly 쿠키를 쓴다(`worker/routes/auth.js:715-730`). 앱은 Bearer + localStorage 방식이다(`scripts/app-native-bridge.js:182-230`) | 쿠키로 공통 전환하면 Android 전체에 영향이 가므로 RED이다. 추천안은 현행 유지다 |
| PortOne을 dynamic import로 바꾼다 | PortOne SDK는 이미 CDN 스크립트로 지연 로드한다(`lib/payment/portone.ts:334`, `index.html:21092`, `js/destiny-profile.js:4123`, `app/points/PointsClient.tsx:1692`) | 구조 개편은 필요 없다 |
| `@capacitor/ios` 빌드 경로 | 루트 `node_modules`에 `@capacitor/ios`가 없다. `package.json`에 `mobile:ios:*` 스크립트도 없다(android 스크립트만 있다) | Phase 3에서 설치하고 스크립트를 추가해야 한다 |

## Q1. 셸 방식 — 추천: 기존 Capacitor iOS 유지 (GREEN)

- 추천: 기존 `apps/mobile/ios` 위에서 작업을 이어 간다. 이렇게 하면 Android와 같은 JS 브리지 계약(`window.CodeDestinyNative`)과 플러그인 구조를 그대로 공유한다.
  - 대안 D(순수 WKWebView 셸)는 추천하지 않는다. 플러그인 3종(Wallpaper·Locale·Navigation)과 라우터(`CodeDestinyRouter`)를 다시 만들어야 하고, 브리지 계약이 둘로 갈라진다.
- 근거 [실측]
  - `CodeDestinyViewController: CAPBridgeViewController`가 Wallpaper·Locale·Navigation 플러그인을 등록한다.
  - `CodeDestinyNavigationPlugin.shouldOverrideLoad`는 code-destiny.com URL을 `capacitor://localhost`로 바꾼다.
  - `apps/mobile/capacitor.config.ts`에 `ios` 블록과 `iosScheme`이 없다. 따라서 기본 스킴인 `capacitor://`를 쓰고, 시작 경로는 `appStartPath: /index.html`이다.
- 위험: 낮다. 단, `iosScheme` 결정은 아래 "선행 결함 1"과 엮여 있다.
- 검증: Phase 3에서 `npx cap sync ios`, Xcode 빌드, 시뮬레이터 부팅을 확인한다.
- 롤백: 이 단계에서는 바꾸는 것이 없다.

## Q2. 플랫폼 판별 — 추천: app-context.js에 `getPlatform()` 추가 (GREEN, 공유 모듈)

- 추천: `js/core/app-context.js`에 `getPlatform(): 'android' | 'ios' | 'web'`를 추가한다.
  - 판정 기준은 두 가지다. 먼저 기존 `isApp()` 신호로 앱인지 확인하고, 앱이면 `Capacitor.getPlatform()`으로 플랫폼을 고른다.
  - UA 스니핑은 쓰지 않는다. UA 토큰 `CodeDestinyApp/iOS/{ver}`는 서버 로그 구분용으로만 둔다(Phase 3, `appendUserAgent`).
  - `html[data-platform]`은 `scripts/app-native-bridge.js:117-120`에서 설정한다. 이곳은 `runtimeTarget`을 설정하는 바로 옆자리다.
  - 흩어진 iOS 분기 5곳은 `getPlatform()`으로 하나씩 옮긴다. 기능별 Phase에서 같이 옮긴다.
- 근거 [실측]
  - `isApp()`(`js/core/app-context.js:51-82`)은 네 신호의 합집합이고, 반환값은 boolean뿐이다. 네 신호는 `__CODE_DESTINY_RUNTIME_TARGET`, `data-runtime-target`, `Capacitor.isNativePlatform()`, `__cdAppPaymentGuard.installed`다.
  - `Capacitor.getPlatform()==="ios"` 직접 분기:
    - `scripts/app-native-bridge.js:482`, `:800`
    - `scripts/app-payment-guard.js:100`
    - `app/app/_lib/native-billing.ts:62,67-71`
    - `app/app/store/AppPassStoreClient.tsx:74,164`
    - `app/app/MobileAppRuntimeBridge.tsx:131`
    - `js/core/play-display-price.js:19`
  - 기존 테스트도 iOS를 다룬다: `__tests__/ui/app-pending-purchase.test.js:17`, `__tests__/ui/play-display-price.test.mjs:54`.
  - 다음 문자열은 검색 결과가 0건이다: `data-platform`, `applicationNameForUserAgent`, `CodeDestinyApp`.
- 위험: 공유 모듈이다. `isApp()`의 의미는 바꾸지 않고 함수만 추가한다. 착수 전에 regression-scout로 영향을 확인한다.
- 검증: app-context 단위 테스트에 android·ios·web 3케이스를 넣는다. 위 기존 iOS 테스트 두 개도 통과해야 한다.
- 롤백: 추가 커밋 1개를 revert한다.

## Q3. 결제 진입 분기 — 추천: 기존 봉인 유지 + 가드에 StoreKit 경로 추가 (RED)

- 추천: 앱 빌드에서 PortOne을 봉인하는 현재 구조를 그대로 둔다.
  - 앱 빌드 스크립트 `scripts/build-mobile-app.mjs`가 `GUARD_TAG`를 주입하고 `PRUNED_ROUTES`를 적용한다.
  - 봉인은 `scripts/verify-app-no-portone.mjs`가 검증한다.
  - iOS 구매는 Phase 6에서 결제 가드(`scripts/app-payment-guard.js:100`)에 StoreKit 분기를 추가해 연다. 지금은 이 줄이 `IOS_BILLING_NOT_CONFIGURED`를 던진다.
  - dynamic import 개편은 하지 않는다.
- 근거 [실측]
  - `lib/payment/portone.ts`는 세 모듈이 정적으로 import하고, 각 모듈이 `isApp()`으로 차단한다.
    - `app/components/service-packs/service-pack-client.ts:114,122,164`
    - `app/neo-consultation/checkout.ts:8`
    - `app/business/api/Business.jsx:178`
  - `billing-client.ts:2363`(`directKrwUsesNativeBilling`)와 `:2497-2507`은 가드가 없을 때 `APP_PAYMENT_GUARD_MISSING`을 반환한다. 즉 fail-closed다.
  - `verify-app-no-portone` 검사는 플랫폼을 가리지 않으므로 iOS 번들에도 그대로 적용된다.
- 현재 iOS 상태: 새 구매는 "iPhone의 새 구매 기능은 준비 중이에요..." 안내로 막혀 있다(fail-closed). PortOne으로는 결제할 수 없다.
- 위험: 결제 동결 대상이다. payment-freeze 절차와 paid-gate-auditor 감사가 필요하다.
- 검증:
  - `verify-app-no-portone`
  - 결제 가드 jsdom 테스트
  - StoreKit sandbox. 실결제는 하지 않는다.
- 롤백: 가드 분기 커밋만 revert한다. 그러면 fail-closed 상태로 돌아간다.

## Q4. 가격 표시 — 추천: 플랫폼 인지형 `store.getProducts` 가격만 표시 + iOS 웹 유도 문구 제거 (RED)

- 추천
  - 가격 표시는 `js/core/play-display-price.js`와 `app/app/_lib/native-billing.ts`에서 플랫폼별로 나눈다.
    - Android는 Play의 가격 문자열을 그대로 쓴다.
    - iOS는 StoreKit의 `displayPrice`만 쓴다.
    - 둘 다 없으면 지금처럼 "가격 확인 필요"를 표시한다. 웹 원화 금액은 보여 주지 않는다.
  - iOS에서는 아래 웹 결제 유도 문구를 숨기거나 중립 문구로 바꾼다.
- 근거 [실측]
  - `play-display-price.js`의 현재 동작:
    - `:19`: iOS면 `null`을 반환한다.
    - `:27`: provider가 `GOOGLE_PLAY`일 때만 가격을 받는다.
    - `:41`: 가격이 없으면 "가격 확인 필요"를 표시한다.
    - `:50-52`: 로딩 중에도 웹 원화 금액을 보여 주지 않는다.
  - `billing-client.ts:2497-2520`은 `fetchAppStoreAmountKRW`로 받은 **서버 원화 금액**을 iOS 결제창에도 표시한다. 이 값은 StoreKit 가격이 아니다.
  - 금액이 null이면 iOS에서도 아래 문구가 나온다(`billing-client.ts:2519-2520`).
    > "Google Play 판매를 준비하고 있습니다. 웹에서 꿀단지 이용권·월정석·단건 결제를 이용해 주세요."
  - 다른 웹 유도 문구:
    - `app/components/service-packs/service-pack-copy.ts:28`(`webOnly`, 사용처는 `ServicePacks.tsx:107`)
    - `app/neo-consultation/checkout.ts:8`("이 상담은 현재 웹 브라우저에서만 신청할 수 있습니다...")
  - 결제와 무관한 "웹에서 보기" 문구는 대상이 아니다. 아래 파일들은 읽기 안내다.
    - `app/human-design/_copy/index.ts:183`
    - `report/_lib/copy.ts:32`
    - `report/page.tsx:10`
    - 영냥이 `ConcernGuide.tsx:43`, `ProductGuide.tsx:87`
- 위험
  - App Store 3.1.1·3.1.3을 위반하면 리젝된다. 앱 안에서 웹 결제를 안내하거나 웹 가격을 노출하면 해당한다.
  - 결제 표시 경로이므로 RED이고, 결제창 렌더러 3종의 정합성을 감사해야 한다.
- 검증:
  - `play-display-price` 테스트에 iOS 케이스를 추가한다.
  - iOS 번들 빌드 결과에서 "웹에서 … 결제" 문자열을 grep한다.
- 롤백: 문구·표시 커밋을 revert한다.

## Q5. 다이얼로그 — 추천: 웹 호출부는 그대로, 네이티브 WKUIDelegate로 처리 (GREEN, 웹 변경 없음)

- 추천: `alert`·`confirm`·`prompt` 호출부 약 210곳을 바꾸지 않는다. 네이티브 패널이 처리하게 한다.
  - Capacitor iOS의 `WebViewDelegationHandler`가 WKUIDelegate 패널 3종을 구현한다고 알려져 있다. **[추정]** 이 저장소에는 `@capacitor/ios` 소스가 설치돼 있지 않아 확인하지 못했다. Phase 3에서 기기로 확인한다.
  - `window.open`·`target=_blank`·파일 업로드도 Phase 3에서 네이티브로 동작을 확인한다.
- 근거 [실측, 제외 범위 git grep]
  - `alert(`: 31파일 177건. 많은 곳은 `js/destiny-profile.js` 30건, `js/saju-engine.js` 25건, `js/saju-engine-tarot-sukuyo-quantum.js` 14건, `vedic-astrology.html` 13건이다.
  - `confirm(`: 약 11파일 31건. `js/core/index-inline-runtime.js` 8건, saju-engine 7건, destiny-profile 5건.
  - `prompt(`: 5파일 6건.
  - `window.open`: 14파일 22건.
  - `type="file"`: 6파일 8건. PalmDestinyMain.tsx, AttachmentDropzone.tsx, BiasPhotoPicker, DiaryBackupPanel, PhysiognomyUI.js, PastLifeFaceUI.js.
  - `target=_blank`: 약 84건.
- 위험: 패널이 동작하지 않으면 확인 대화상자가 바로 false를 반환한다. 그러면 삭제나 확정 버튼이 무반응이 된다. 기기 검증이 필수다.
- 검증: 시뮬레이터에서 alert·confirm·prompt 각 1곳, `window.open`, 사진 첨부를 실행해 본다.
- 롤백: 해당 없음. 웹 변경이 없다.

## Q6. 히스토리·스와이프 백 — 추천: 웹 레이어 신설 없음, 네이티브 제스처만 켜고 기존 가드로 검증 (GREEN, 검증만)

- 추천: 새 웹 히스토리 레이어는 만들지 않는다.
  - iOS 뷰 컨트롤러에서 `allowsBackForwardNavigationGestures`를 켠다(Phase 3).
  - 스와이프 백이 기존 오버레이 가드에 걸리는지 기기에서 확인한다.
  - 공유 히스토리 동작을 바꿔야 한다는 결과가 나오면 그때 RED로 따로 보고한다.
- 근거 [실측]: 이미 두 가지 히스토리 가드 체계가 있다.
  - React 체계
    - `lib/navigation/backHandler.ts:178,190`(pushState)
    - `app/providers/NavigationProvider.tsx:180-200,304,360-375`(오버레이·위저드 스코프, html dialog 핸들러)
    - `useBackNavigation` 사용처 5곳
  - 정적 셸 체계: `js/mobile-backstack-navigation.js:195,202`(pushState), `:524`(popstate), `:525`(`cd:app-back`)
  - Android는 네이티브 backButton을 받아 처리한다(`app-native-bridge.js:1428-1470`). 처리 순서는 오버레이 닫기(`dispatchAppBack('overlay')`, `closeTopOverlay()` `:1021`) → `history.back` → 홈 replace → 두 번 눌러 종료다.
  - 전체 집계: pushState 8파일 10건, popstate 26파일 50건, `role=dialog`·`aria-modal`이 있는 파일 38개.
- 위험: iOS 스와이프 백은 popstate만 발생시킨다. Android처럼 `cd:app-back` 이벤트를 거치지 않으므로, 오버레이가 popstate에 반응하지 않으면 모달 뒤의 페이지로 넘어갈 수 있다. **[추정]**
- 검증: 시뮬레이터에서 모달·위저드·바텀시트를 각각 열고 스와이프 백을 해 본다.
- 롤백: 네이티브 플래그 1줄을 되돌린다.

## Q7. 입력 확대 방지(16px) — 추천: iOS 한정 전역 CSS 1규칙 (GREEN, Q2 선행)

- 추천: 전역 CSS에 iOS 한정 규칙 하나를 둔다.
  ```css
  html[data-platform="ios"] :is(input, textarea, select) { font-size: max(16px, 1em); }
  ```
  - 개별 파일은 고치지 않는다.
  - 뷰포트의 `maximum-scale`·`user-scalable=no`는 쓰지 않는다. 확대를 막으면 접근성이 나빠진다.
  - `index.html`을 고치게 되면 `sync:public` 미러 커밋을 함께 한다.
- 근거 [실측]
  - 입력 요소 선택자에 16px 미만 글꼴을 지정한 곳이 6곳이다.
    - `app/moonlit-lotus/space.module.css:42`(.85rem)
    - `app/saju/destiny-bias/destiny-bias.module.css:331`(15px)
    - `app/yeongnyangi/_components/intake-chat.module.css:21`(13px)
    - `src/features/fortune-tea-house/styles/fortune-tea-house.module.css:1938`(0.82rem), `:9534`(0.76rem)
    - `styles/fortune-ui.css:13675`(.95rem !important)
  - 클래스 선택자까지 넣으면 23파일 53줄이 걸린다. 이 수치는 상한 추정이다.
  - 뷰포트는 `index.html:504`에 있다: `width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content`.
- 위험
  - `fortune-ui.css:13675`는 `!important`라 특이도에서 이길 수 없다. 이 줄은 개별로 확인해야 한다.
  - 작은 입력칸의 레이아웃이 커질 수 있다. iOS에서만 적용되므로 웹에는 영향이 없다.
- 검증: 시뮬레이터에서 위 6곳에 포커스했을 때 화면이 확대되지 않는지 본다.
- 롤백: CSS 커밋 1개를 revert한다.

## Q8. Sign in with Apple과 계정 연결 — 추천: Apple은 자동 연결 금지, 연결 제안 + 기존 방식 재로그인 (RED)

- 추천
  - 서버에 `apple`을 OAuth provider로 추가한다.
    - 웹 SIWA는 `response_mode=form_post`를 쓰므로 POST 콜백 라우트를 새로 만든다. 지금 콜백은 GET만 받는다.
    - 네이티브 SIWA는 Phase 4에서 identity token을 검증하는 경로로 만든다.
  - Apple 계정은 **이메일로 자동 연결하지 않는다.**
    - 검증된 비릴레이 이메일이 기존 계정과 같으면 "기존 계정에 연결" 제안만 띄운다. 연결은 기존 로그인 방식으로 다시 로그인한 뒤에만 한다.
    - 릴레이 이메일(`privaterelay.appleid.com`)이면 설정의 "기존 계정 연결" 메뉴로 연결한다.
  - 기존 Google·Naver·Kakao의 이메일 자동 연결은 이번 범위에서 바꾸지 않는다. 다만 프롬프트의 "자동 병합 금지"와 충돌하므로 사용자가 결정할 사항으로 남긴다.
- 근거 [실측]
  - `worker/routes/auth.js:62`: `OAUTH_PROVIDERS = ["google","naver","kakao"]`.
  - 콜백은 GET만 받는다(`auth.js:5589-5591`). redirect URI는 `/api/auth/oauth/${provider}/callback`이다(`:1203,1210`).
  - 현재 이메일 자동 연결 정책(`auth.js:1866-1888`):
    1. `User.findOne({email})`로 기존 사용자를 찾는다.
    2. 이메일이 미검증이면 `${provider}_email_unverified` 오류를 낸다.
    3. 검증된 이메일이면 `socialAccounts.${provider}.id`를 설정해 연결한다.
  - 앱 브리지 `openAuth`는 google·naver·kakao만 허용한다(`scripts/app-native-bridge.js:621-625`).
  - 명시적 계정 연결 플로우는 auth.js에서 찾지 못했다. 검색 범위는 `worker/routes/auth.js`, `worker/lib/auth.js`의 "link" 관련 grep이다. 결론이 불확실하므로 착수 전에 다시 확인한다.
- 위험: 인증·계정 병합이 바뀐다. 잘못 연결하면 다른 사람의 계정을 탈취할 수 있다. RED다.
- 검증:
  - auth 라우트 단위 테스트 4케이스: 신규 가입, 비릴레이 일치, 릴레이, 미검증.
  - 스테이징 SIWA 서비스 ID로 실제 로그인을 1회 해 본다.
- 롤백: provider 추가 커밋을 revert한다. 기존 3사 로그인에는 영향이 없다.

## 세션 — 추천: 앱은 Bearer 유지(두 플랫폼 공통), 쿠키 전환 안 함 (현행 유지)

- 근거 [실측]
  - 앱은 Bearer 토큰을 localStorage에 둔다. refresh 토큰은 `X-Code-Destiny-Refresh-Token` 헤더로 보낸다(`scripts/app-native-bridge.js:182-230`).
  - 웹은 HttpOnly 쿠키를 쓴다(`worker/routes/auth.js:715-730`).
  - 서버는 `isMobileAppAuthRequest`로 앱 요청인지 판별한다(`worker/lib/auth.js:14-32`). 호출부는 `auth.js:1155-1188`, `:1835`, `:2068-2073`, `activation-rewards.js:8`이다.
- 위험: 앱을 쿠키로 바꾸면 Android 전체 인증이 바뀐다(RED). 추천안대로 하면 변경이 없다.
- 단, iOS는 아래 선행 결함 1을 고쳐야 Bearer 경로가 동작한다.

## 서비스 워커 — iOS 미등록이 이미 보장됨 (GREEN, 변경 없음)

- `js/pwa-lifecycle.js:15-16`의 `native()`는 `__cdAppContext.isApp()`이다.
- 앱이면 `:158`에서 바로 반환한다. 등록 호출은 `:161` 한 곳뿐이다.
- iOS도 같은 `isApp()`을 거치므로 서비스 워커가 등록되지 않는다.

## 선행 결함 (보고만, 이번 단계에서 고치지 않음)

1. **iOS 앱 인증 origin 불일치** — 인증 RED. [코드 근거 실측 + 동작 추정, 기기 미검증]
   - 전제
     - iOS Capacitor의 기본 origin은 `capacitor://localhost`다.
     - node로 확인한 결과 `new URL('capacitor://localhost').origin === "null"`이다. 특수 스킴이 아니기 때문이다.
   - 서버가 놓치는 지점
     - `worker/lib/auth.js:14-32`의 `MOBILE_APP_REQUEST_ORIGINS`에는 `https://localhost`만 있다. 게다가 `isMobileAppAuthRequest`가 `new URL(origin).origin`으로 비교하므로 iOS 요청은 늘 false다.
     - 그 결과 iOS 요청은 CSRF·sec-fetch-site 예외와 refresh 헤더 처리를 받지 못한다.
     - `worker/routes/recommendations.js:25`도 `https://localhost`만 허용한다.
     - CORS 쪽은 이미 허용한다(`worker/index.js:563-572`, `worker/lib/security/index.js:145-150`).
   - 예상 증상: `/oauth/complete`, 로그아웃, refresh가 403 또는 401을 받는다.
   - 수정 방향(추천순)
     1. origin 문자열을 직접 비교하는 목록에 `capacitor://localhost`를 추가한다.
     2. `iosScheme: "https"`로 바꿔 Android와 origin을 맞춘다. 이 경우 WKWebView에서 https 커스텀 스킴이 허용되는지 확인해야 한다.
2. **iOS 결제창이 웹 결제로 유도하고 서버 원화 금액을 노출한다.** 근거는 `app/_lib/billing-client.ts:2497-2520`이고, 자세한 내용은 Q4에 있다. 리젝 사유다.
3. **소셜 로그인 이메일 자동 연결**(`worker/routes/auth.js:1866-1888`)이 프롬프트의 "자동 병합 금지"와 충돌한다. 결정은 사용자 몫이다.
4. **문서 누락**: phase-1 보고와 인수인계 문서가 기존 `apps/mobile/ios` 프로젝트를 다루지 않는다. 또 루트 `node_modules`에 `@capacitor/ios`가 없고 iOS 빌드 스크립트도 없다.
5. **Android phase0 결함이 iOS에도 해당한다.** 같은 번들을 쓰기 때문이다. 해당 결함은 탈퇴 P0, 결제 401 refresh 등이다(`docs/app-audit/2026-11-18-android-release-phase0.md` §2–§5).

## 레드팀 — 지금 상태로 심사에 내면 예상되는 리젝 사유

- 4.8: Google·Naver·Kakao 로그인만 있고 SIWA가 없다.
- 3.1.1: 구매 기능이 "준비 중"이라 디지털 상품을 앱 안에서 살 수 없다. 이 상태에서 앱에 웹 결제 안내가 남아 있다.
- 3.1.3: "웹에서 … 결제를 이용해 주세요" 문구와 서버 원화 금액이 노출된다.
- 2.1: 선행 결함 1 때문에 로그인 후 세션 유지가 실패하면 심사관이 기능을 확인할 수 없다.
- 5.1.1(v): 계정 삭제 경로는 Android phase0의 탈퇴 P0 결함을 그대로 이어받는다.

## 승인이 필요한 RED 결정 목록

| # | 결정 | 추천안 |
|---|---|---|
| R1 | Q3: 결제 가드에 iOS StoreKit 경로 추가(Phase 6) | PortOne 봉인은 유지하고 가드에서 분기한다. dynamic import 개편은 하지 않는다 |
| R2 | Q4: iOS 가격을 StoreKit `displayPrice`로만 표시하고 웹 유도 문구를 제거·중립화 | `play-display-price`·`native-billing`을 플랫폼 인지형으로 바꾸고, `billing-client.ts:2519-2520`·`service-pack-copy.ts:28`·`neo-consultation/checkout.ts:8`의 iOS 문구를 교체한다 |
| R3 | Q8: Apple provider 추가, form_post 콜백 신설, Apple 자동 연결 금지 | 연결 제안 + 기존 방식으로 재로그인한 뒤 연결한다. 릴레이 이메일은 설정 메뉴로 연결한다 |
| R4 | Q8 부속: 기존 3사 이메일 자동 연결 유지 여부 | 이번에는 유지한다. 바꾸려면 별도 결정을 받는다 |
| R5 | 선행 결함 1: 서버 앱 origin 판별에 `capacitor://localhost` 추가 | 문자열 비교 목록에 추가하는 방식(1안)을 쓴다. `iosScheme` 변경은 2안이다 |

GREEN으로 추천안대로 진행할 수 있는 항목은 다음과 같다.

- Q1: 기존 셸 유지
- Q2: `getPlatform()` 추가와 `data-platform` 설정
- Q5: 네이티브 다이얼로그 검증
- Q6: 스와이프 제스처 검증
- Q7: iOS 16px CSS
- 서비스 워커: 변경 없음

Q2는 공유 모듈을 건드리므로 착수 전에 regression-scout로 영향을 확인한다.
