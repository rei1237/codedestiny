# iOS Phase 2 — 웹 플랫폼 레이어 (2026-11-19)

- 입력 프롬프트: [docs/prompts/2026-11-18-02-ios-port.md](../../prompts/2026-11-18-02-ios-port.md) Phase 2. 보고 형식은 같은 문서의 "보고 형식" 절을 따른다. 저장 경로가 `phase-reports/` 인 이유는 [phase-1](phase-1.md) 머리말에 있다.
- 진단: [phase-2-diagnosis.md](phase-2-diagnosis.md) (Q1–Q8, R1–R5). 인수인계: [ios-phase2-2026-11-18](../../handoff/ios-phase2-2026-11-18.md).
- 승인: 2026-11-18 사용자 원문 "모두 승인하고 추천안으로 진행해줘" — R1–R5 와 남은 Phase 2 단계 전부를 진단 추천안으로 진행한다.
- 실측과 추정을 나눈다. 이 Phase 에서는 iOS 기기·시뮬레이터를 한 번도 돌리지 않았다. 검증은 전부 mock 단위 테스트와 정적 가드다.

## 1. 요약

1. 웹 레이어에 iOS 를 1급 플랫폼으로 들였다: 서버가 `capacitor://localhost` 를 앱 출처로 인정하고(R5), `getPlatform()`·`html[data-platform]`·iOS 16px 입력, 공통 bridge client 를 넣었다.
2. iOS 앱에서는 웹 원화 가격·"웹에서 결제" 유도·"Google Play" 표기가 나오지 않는다(R2). 결제창은 열지 않고 무료 전환 아니면 중립 안내로 끝난다. StoreKit 구매는 Phase 6 이다(R1).
3. 웹 Sign in with Apple(이메일 자동 연결 없음)을 코드로 넣었다(R3). 실동작은 사용자의 Apple 콘솔·워커 시크릿·DB 인덱스 작업 뒤에 확인한다.

## 2. 결정 사항과 근거

| # | 결정 | 근거 | 관점 |
|---|---|---|---|
| Q1 | 기존 Capacitor iOS 셸(`apps/mobile/ios`) 유지, 자체 WKWebView 셸(D안) 안 함 | Android 와 같은 `window.CodeDestinyNative`·플러그인 계약을 공유한다. 진단 Q1 | 1 아키텍처 |
| Q2 | 플랫폼 판별은 `js/core/app-context.js` `getPlatform()` 하나. UA 스니핑 없음 | `isApp()` 의미 불변, 그 위에 얹음. 주입이 늦는 iOS 를 android 로 굳히지 않게 캐시 없음 | 1 아키텍처 |
| 단계 3 | 공통 bridge client 는 **얇은 래퍼만**: `js/core/native-bridge-client.js` — `getPlatform/getBridge/has/call/getInfo`, 응답은 계약 v1 형식, 웹·미구현은 `E_UNSUPPORTED` | 기존 호출부를 옮기지 않아 Android 동작이 그대로다. v1 이름(`store.*`·`auth.*`)과 StoreKit 은 Phase 4·6 에서 이 위에 얹는다. 계약 7절 | 1 아키텍처, 7 레드팀 |
| R1 | 결제 가드에 StoreKit 경로 — **Phase 6** | PortOne 봉인(`build-mobile-app.mjs`·`verify-app-no-portone`) 유지, dynamic import 개편 안 함 | 2 StoreKit |
| R2 | iOS 가격은 StoreKit 만, 없으면 숨김 + 중립 문구 | App Store 3.1.1·3.1.3. StoreKit 가격 브리지가 아직 없어 "가격 숨김" 폴백 | 2 StoreKit, 7 레드팀 |
| R3 | 웹 SIWA 추가, Apple 은 이메일 자동 연결 금지(연결 제안 + 기존 방식 재로그인, 링크 모드) | 계정 탈취 방지. 릴레이 이메일 대응 | 3 인증·보안 |
| R4 | Google·Naver·Kakao 이메일 자동 연결은 유지 | 이번 범위에서 바꾸지 않음. 바꾸려면 별도 결정 | 3 인증·보안 |
| R5 | 서버 앱 출처 목록에 `capacitor://localhost` 문자열 추가(1안) | `new URL('capacitor://localhost').origin === "null"` 이라 기존 비교가 늘 실패했다. `iosScheme` 변경(2안)은 WKWebView 확인이 필요 | 3 인증·보안, 4 백엔드 |
| 단계 6 | **세션: 앱은 Bearer + localStorage, 웹은 HttpOnly 쿠키 그대로. 코드 변경 없음** | 프롬프트의 "쿠키 전환·localStorage 제거"는 Android 인증 전체를 바꾸는 RED 다(`scripts/app-native-bridge.js` fetch 래퍼가 `https://localhost` → API 출처로 Bearer·refresh 헤더를 붙인다). 웹은 이미 HttpOnly 쿠키(`worker/routes/auth.js` 쿠키 설정). iOS 는 R5 로 같은 Bearer 경로를 탄다. 재검토 조건: 네이티브 SIWA(Phase 4)에서 Keychain 보관을 도입할 때 | 3 인증·보안 |
| 단계 7 history | **웹 변경 없음.** Phase 3 에서 `allowsBackForwardNavigationGestures` 를 켜고 기기로 확인 | 이미 React(`lib/navigation/backHandler.ts`·`NavigationProvider`)와 셸(`js/mobile-backstack-navigation.js`) 두 히스토리 가드가 있다. 결과가 나쁘면 그때 RED 로 따로 보고 | 5 UX |
| 단계 7 alert/confirm | **웹 변경 없음.** 호출부 약 210곳은 그대로, 네이티브 WKUIDelegate 패널로 처리 | Capacitor iOS 가 패널 3종을 구현한다고 알려져 있음 **[추정]** — 소스 미설치로 미확인 | 5 UX |
| 단계 7 font-size | `html[data-platform="ios"] :is(input,textarea,select){font-size:max(16px,1em)}` | 확대 금지(`maximum-scale`) 대신. 웹 영향 없음 | 5 UX |
| 서비스 워커 | 변경 없음 | `js/pwa-lifecycle.js` `native()` 가 같은 `isApp()` 이라 iOS 에서도 등록하지 않는다 | 1 아키텍처 |
| 개인정보처리방침 | 휴대폰 번호 수집 문장에 "Apple 로그인으로 가입하신 경우"를 구글 옆에 추가(4개 번역본 포함) | Apple 은 번호를 주지 않으므로 구글과 같이 첫 카드 결제에서 받는다. 다른 법률 문구는 손대지 않음 | 3 인증·보안, 6 법무 |

## 3. 변경 파일 (Phase 2 커밋, origin/main 기준 SHA)

| 커밋 | 내용 | 주요 파일 |
|---|---|---|
| c40f99e2b | 진단 보고서 | `docs/ios/phase-reports/phase-2-diagnosis.md` |
| f72d11741 | R5: iOS 출처 `capacitor://localhost` 를 앱 출처로 인정 | `worker/lib/auth.js`(`MOBILE_APP_REQUEST_ORIGINS`·`isMobileAppAuthRequest` 문자열 비교), `worker/routes/recommendations.js`, 테스트 2개 |
| 01daf8a13 | `getPlatform()` + `html[data-platform]` | `js/core/app-context.js`, `js/core/app-context.d.ts`, `scripts/app-native-bridge.js`(runtimeTarget 옆 스탬프, DOMContentLoaded/load 재시도), `__tests__/ui/app-platform.test.js`, 미러·캐시 키·사이트맵 원장 |
| 4e56592af | iOS 입력 16px 이상 | `styles/theme-tokens.css`, 셸 캐시 키 |
| c655f98d3 | R2 React 경로: iOS 결제창 서버 원화·웹 결제 문구 숨김 | `app/_lib/billing-client.ts`(`isIosAppRuntime`·`iosPurchasePreparationMessage`), `service-pack-copy.ts`(`appUnavailable` 12 로케일), `ServicePacks.tsx`, `neo-consultation/checkout.ts`, `config/payment-freeze.json`, `verify-app-store-billing-policy.mjs` [7] |
| d5100eebf | R2 셸 가드: iOS 는 free-grant 또는 `IOS_BILLING_NOT_CONFIGURED` | `scripts/app-payment-guard.js`(`resolveIosPaymentChoice`), `__tests__/ui/app-pending-purchase.test.js`, verify [7] |
| a7c6ec0e7 | R2 렌더러 3종: iOS 는 결제창을 그리지 않음("Google Play 결제" 배지 도달 불가) | `index.html` `_cdChooseServicePaymentMode`, `js/destiny-profile.js`, `billing-client.ts` React 렌더러, 동결 매니페스트, `docs/context/payment-gating.md` R2 예외 절, 독립 페이지 `?v=` 핀 |
| e1c1971d5 | R2 CheckoutClient "Google Play" 표기·보류 팩 원화 숨김 | `app/checkout/CheckoutClient.tsx`, `ServicePacks.tsx`, `pass-consolidation-shop.test.mjs` |
| c8eb35672 | R3 서버: 웹 SIWA(form_post 콜백, JWKS 검증, 자동 연결 없음) | `worker/lib/apple-signin.js`, `worker/routes/auth.js`, `worker/lib/models.js`(`socialAccounts.apple` + 부분 인덱스), `config/env.contract.json`(APPLE_* 4개), `verify-auth-p0p1-regression.mjs`, `__tests__/worker/auth.apple-signin.test.js` |
| 7b7cb8e81 | R3 UI: Apple 버튼(앱 런타임 숨김), 콜백 페이지, 계정 연결 페이지(noindex) | `app/components/auth/AuthShell.tsx`, `app/auth/apple/callback/page.tsx`, `app/account/apple/*` |
| (이번 묶음) 08cc2a633 | 단계 3 공통 bridge client | `js/core/native-bridge-client.js`(+`.d.ts`, public 미러), `__tests__/ui/native-bridge-client.test.js`, `docs/native-bridge-contract.md` 7절, 셸 build 키·`.ignore` |
| (이번 묶음) a1966b793 | 개인정보처리방침 Apple 추가 | `app/privacy-policy/PrivacyPolicyContent.jsx:39`, `lib/legal/legalContent.ts`(en·ja·zh·zh-TW 2절 첫 문단), `public/static/policies/privacy/index.html`, 사이트맵 원장(법률 페이지 13 URL lastmod) |
| (이번 묶음) 이 커밋 | 이 보고서, 인수인계 닫기 | `docs/ios/phase-reports/phase-2.md`, `docs/handoff/ios-phase2-2026-11-18.md` |

## 4. 검증 결과

| 대상 | 방법 | 결과 |
|---|---|---|
| 플랫폼 판별·data-platform | `node --test __tests__/ui/app-platform.test.js` (jsdom, android/ios/web·늦은 주입) | 통과 |
| bridge client | `node --test __tests__/ui/native-bridge-client.test.js` 7건(웹 E_UNSUPPORTED, android/ios 동일 래핑, 점 경로 this, v0 코드 대응, reject·throw, require 경로) | 통과 |
| R5 | `auth.app-refresh-token.test.js`·`recommendations.test.js` | 통과(커밋 당시) |
| R2 | `verify-app-store-billing-policy` [7](렌더러 3종·가드 분기 순서, 변이로 무는 것 확인), `app-pending-purchase`, paid-gate-auditor 편집 전·커밋 전 감사 | PASS / PASS with notes(커밋 당시) |
| R3 | mock JWKS·토큰 jest 15건, `verify-auth-p0p1-regression`, check:fast 전체 jest 8189 | 통과(커밋 당시) |
| 개인정보처리방침 | `node scripts/verify-signup-phone-required.mjs` | OK |
| 이번 묶음 전체 | `npm run check:fast`, `npm run check:pre-push` | check:fast 통과(critical tier 자동 승격, jest 8189 passed / 1 skipped, test:node 포함). check:pre-push 는 커밋된 트리에서 push 직전 실행 |
| iOS 기기·시뮬레이터 | — | **미실행.** 스크린샷·로그 없음 |

## 5. 레드팀: 지금 제출하면 반려될 사유

- 2.1 / 3.1.1: 앱 안에서 디지털 상품을 살 수 없다(구매는 중립 안내로 막힘). StoreKit 이 Phase 6 이다.
- 4.8: 웹 SIWA 는 코드만 있고 시크릿이 없어 버튼이 숨는다. 앱 런타임 버튼은 일부러 숨겼다(네이티브 SIWA 는 Phase 4). 지금 iOS 앱에는 SIWA 가 없다.
- 2.1: R5·Bearer 경로, Capacitor 주입 시점, WKUIDelegate 패널을 기기로 확인하지 않았다. 로그인 유지가 실패하면 심사관이 기능을 볼 수 없다.
- 5.1.1(v): 계정 삭제 경로는 Android phase0 탈퇴 P0 결함을 그대로 이어받는다(`docs/app-audit/2026-11-18-android-release-phase0.md`).
- 3.1.3 잔여 위험: CheckoutClient 첫 프레임에 "Google Play" 가 잠깐 보일 수 있다(아래 7절 ①).

## 6. 사용자가 해야 할 일

1. Apple 콘솔: Services ID `com.codedestiny.app.siwa` 생성(도메인 `code-destiny.com`, 반환 URL `https://code-destiny.com/api/auth/oauth/apple/callback` + 스테이징 같은 경로), Sign in with Apple 키(.p8) 발급.
2. Cloudflare 워커 시크릿 등록(이름만): `APPLE_TEAM_ID`, `APPLE_SIWA_SERVICES_ID`, `APPLE_SIWA_KEY_ID`, `APPLE_SIWA_PRIVATE_KEY`. 하나라도 없으면 버튼이 숨고 start 는 503 `apple_signin_not_configured`. (`--only-key` 없이 동기화하면 프로덕션 시크릿 전체를 덮어쓰니 주의.)
3. 🔴 운영 DB: `npm run migrate:auth-core-indexes` 로 `socialAccounts.apple.id` 부분 인덱스 생성 — 운영 DB 쓰기라 **별도 1회 승인** 필요. 데이터 마이그레이션은 없다.
4. 그 뒤 스테이징에서 웹 SIWA 실로그인 1회(신규·비릴레이 일치·릴레이·링크 모드).
5. Phase 1 콘솔 작업(개발자 등록·계약·IAP 상품)은 [phase-1](phase-1.md) 7절 순서대로 계속.

## 7. 남은 위험·열린 결정과 다음 Phase 승인 요청

열린 결정(사용자):

- **링크 모드 재인증 강도**: 지금은 로그인 세션만 확인하고 "방금 재인증"을 요구하지 않는다. 더 엄격히 할지.
- **Apple health keyCheck**: `/api/health` FEATURE_KEY_GROUPS 에 Apple 을 일부러 넣지 않았다(미설정 운영에서 health 가 빨개짐). 시크릿 등록 뒤 넣을지.
- **`migrate:auth-core-indexes`**: 운영 DB 쓰기 승인(위 6-3).
- **개인정보처리방침 시행일**: Apple 문구를 넣었지만 `PRIVACY_POLICY_EFFECTIVE_DATE`(= 서버 `AUTH_PRIVACY_VERSION`, 동의 버전)는 바꾸지 않았다. 개정 고지·시행일 갱신이 필요한지는 법무 판단이다. 바꾸면 두 값을 함께 바꿔야 한다.

남은 위험(보고만, 범위 밖):

- ① CheckoutClient 첫 프레임 "Google Play" 깜빡임(`iosApp` 이 effect 뒤에 true).
- ② CI 트리거 공백: `paid-flow-gates.yml` 에 `app/checkout/**`·`scripts/app-payment-guard.js`·`app/app/_lib/native-billing.ts` 가 없고, `change-risk.mjs` 는 가드를 deepRequired 로 보지 않는다.
- ③ 사이트맵 lastmod 대량 갱신: 공유 모듈(`app/layout.js`·`lib/legal/legalContent.ts` 등)을 고치면 관련 없는 URL 의 lastmod 까지 오늘로 바뀐다. 이번 묶음은 법률 페이지 13 URL(privacy·terms·refund × 로케일 등).
- ④ R2 후속(인수인계 단계 4): 독립·React iOS 분기 `featureKey` 미설정 시 fail-closed 중립 취소, 무료 경로 `/products` 2회 조회, 셸 중립 alert 중복 가능, destiny-profile 캐시 키 갈라짐.
- ⑤ 스냅샷 없는 이용권 보유자(재설치)는 iOS 에서 결제창 [이용권] 구제 지점이 없다(결제창을 안 열기 때문). Phase 6 에서 해소.
- ⑥ `i18n/authored/shellRuntime-61.json` 의 방침 ko 원문은 이미 현재 본문과 다르다(이번 변경 전부터). 셸 런타임 번역이 이 문단에 붙지 않을 수 있다.
- ⑦ 루트 `node_modules` 에 `@capacitor/ios` 가 없고 `mobile:ios:*` 스크립트도 없다(Phase 3 에서 추가).

Phase 3 이 기기에서 확인해야 할 것:

- Capacitor 주입이 `getPlatform()`·`data-platform` 스탬프보다 먼저인지, 실제 WebView Origin 문자열이 `capacitor://localhost` 인지, 로그인 → refresh → 로그아웃이 Bearer 로 도는지(R5).
- 시뮬레이터에서 진단 Q7 의 입력 6곳 포커스 시 확대가 없는지(`styles/fortune-ui.css:13675` `!important` 포함).
- alert·confirm·prompt 각 1곳, `window.open`·`target=_blank`, 사진 첨부(`type="file"` 6파일)가 네이티브 패널로 동작하는지. confirm 이 바로 false 를 돌려주면 삭제·확정 버튼이 무반응이 된다.
- `allowsBackForwardNavigationGestures` 를 켠 뒤 모달·위저드·바텀시트에서 스와이프 백이 오버레이를 먼저 닫는지(popstate 만 오므로 `cd:app-back` 을 거치지 않는다).
- iOS 결제 진입이 결제창 없이 무료 전환 또는 중립 안내로 끝나는지, 서버 `/api/app-store/products`·`/free-grant` 의 iOS 요청 응답.
- `__cdNativeBridgeClient.getInfo()` 가 iOS 에서 `{platform:"ios", available:true}` 인지.

다음 Phase 시작 문장:

> iOS Phase 3(프로젝트 골격과 WebShell)을 시작한다. `docs/ios/phase-reports/phase-2.md` 7절의 "Phase 3 이 기기에서 확인해야 할 것"을 WKWebView 체크리스트(프롬프트 Phase 3)와 합쳐, 기존 `apps/mobile/ios` Capacitor 프로젝트 위에서 `@capacitor/ios` 설치·`mobile:ios:*` 스크립트·`npx cap sync ios`·시뮬레이터 부팅부터 진단하고 보고한다.
