# DIAGNOSIS_REPORT — 앱(Android WebView) Phase 0 현황 진단

> 2026-08-12 · 정적 분석만 수행(코드 수정 0줄) · 실기기/에뮬레이터 실측 항목은 부록 "기기 검증 필요"로 분리
> 브랜치: `fix/moonstone-lot-cas-native` (워크트리에 다른 세션의 미커밋 변경 존재 — 본 진단은 읽기만 수행)

---

## 진단 요약

- P0(앱 사용 불가): **5건** (최초 6건 → #5 로그인 이탈은 검증 결과 **오탐으로 정정**, 아래 참조)
- P1(주요 기능 손상): **28건**
- P2(UX 저하): **37건**
- P3(다듬기): **17건**

(각 절 표의 등급 집계. 정적 판정 기준이며 "기기검증필요" 표기 건은 실측에서 가감될 수 있다.)

> **조치 현황(2026-08-12)**: P0 5건 전부 [PR #514](https://github.com/rei1237/codedestiny/pull/514)에서 선행 수정됨.
> 수정 중 케멧(이집트 신탁) 모달 닫기 버튼도 #4와 동일 증상으로 확인되어 함께 수정.

## P0 상세

| # | 화면 | 증상 | 파일:라인 | 원인 추정 | 예상 수정 규모 |
|---|---|---|---|---|---|
| 1 | 타로 체험 3종(연애/재회/연간) — 홈 모달 | 앱에서 AI 결과 요청이 전부 실패(시도 후보 API 호스트 전멸) → 기능 불가 | `js/tarot-reunion-experience.js:209-262` (love `:394-447` / year `:136-189` 동일 패턴) | `isSafeTarotApiBase()`가 앱 출처(`https://localhost`)에서 프로덕션 호스트를 "비동일출처"로 배제 → 후보가 `["", localhost:3000, localhost:4000]`만 남음 | 파일당 함수 1곳 ×3 (+`public/js` 미러) |
| 2 | 홈 하단 네비 | **테마 토글 알약이 4·5번째 탭('이용권'·'마이')을 덮어 클릭 불가** (`fixed!important` + z-index 2147483000 vs 네비 960) | `index.html:533,644,6585,15195-15196` | 앱바용 재정의가 `position`을 안 덮어 fixed가 승리, 우하단에 네비와 겹침 | CSS 1블록(+미러 5) |
| 3 | 모달 전반(셸 결제창·`/app` 마케팅 모달·섬 시트·코덱스 오버레이) | **백버튼이 열린 모달을 닫지 못함** — 루트 화면에선 "모달 열린 채 앱 종료" 수순, 비루트에선 페이지째 이탈. 모달 open 시 history 배선이 저장소 전체 0건, 닫기는 Escape뿐 | `scripts/app-native-bridge.js:557-600`, `app/app/_lib/useAndroidBackButton.ts:41-55` | 백버튼 계약(모달 스택 우선 닫기) 자체가 미구현. 부수: `/app`에서 두 핸들러 이중 등록(1회 입력 2단 후퇴) | 공통 오버레이 레지스트리 1개 + 핸들러 2곳 |
| 4 | 타로 모달(명리 3카드) | 닫기 버튼이 상태바 아래 깔림 — 인라인 `absolute top:20px`, 부모 `fixed inset:0`이라 body padding-top 보정 무효 | `index.html:20255` | 타로 모달만 인라인 스타일이라 `.modal-top-nav`류 safe-area 보정 부재 | 인라인 스타일 1곳(+미러) |
| ~~5~~ | ~~로그인(`/login`)~~ | **오탐 정정(2026-08-12)**: `location.assign(절대 URL)` 최상위 이동은 `CodeDestinyNavigationPlugin.shouldOverrideLoad`(`CodeDestinyNavigationPlugin.java:42-91`)가 잡아 appRedirect 보강 후 커스텀탭으로 연다 — http(s)에 null 미반환으로 외부 Chrome 이탈이 봉쇄되어 있다. 잔존 이슈는 `openAuth` 실패 시 폴백 부재(P1, 화면 6 표 참조)뿐 | — | — | 수정 불요 |
| 6 | 운명의 섬 상담(`/island-consult`) | "운명의 섬으로 돌아가기"가 홈으로 튕김 — `href="/destiny-island"`(확장자 없음)인데 dist엔 `destiny-island.html`만 존재, RouteProcessor 폴백이 홈 셸 | `app/island-consult/IslandConsultClient.tsx:520,627,633`, `MainActivity.java:249-257` | html5mode off 환경에서 확장자 없는 정적 파일 경로 | href 3곳 |

---

## 0-A. 작업 프롬프트 ↔ 실제 레포 불일치 (진단 전 확정 사항)

프롬프트는 다른 스냅샷("codedestiny-main") 기준으로 작성돼 있어 다수 참조가 실물과 다르다. 이후 Phase는 아래 실물 기준으로 진행해야 한다.

| 프롬프트 표현 | 실제 |
|---|---|
| `pricing.app.ts` / `pricing.web.ts` | 없음 → 앱 가격 정본 `worker/lib/app-store-pricing.js`, 웹 정본 `worker/lib/paid-feature-registry.js`, 정책 `worker/lib/billing-policy.js`, 프론트 `lib/payment/coin-pricing.ts` |
| `formatPrice` | 없음 → `formatKrwFromCoins`(`lib/payment/coin-pricing.ts`) + 로컬 중복 `formatCoinValue` 류 5곳(→ PRICING_FINDINGS) |
| `@JavascriptInterface` 브릿지 | 커스텀 `@JavascriptInterface` **0개**. 실체는 Capacitor 8 `@PluginMethod` 플러그인 4종(§0-2) |
| 앱 로드 방식 | 원격 URL 아님 — `apps/mobile/capacitor.config.ts` `webDir:"../../dist"` 번들 자산. 앱 전용 JS 2종은 `scripts/build-mobile-app.mjs`가 dist HTML `<head>`에 후처리 주입 |
| `verify:i18n`/`verify:security`/`verify:ai`/`verify:billing` | 그 이름 없음 → `verify:i18n-*`, `verify:security-hardening`, `verify:billing-pass-policy` 등으로 대체(§0-5, Phase 4 때 목록 확정 필요) |
| `lib/platform/appContext.ts`, `components/app-shell/`, `styles/app.css` | 없음(Phase 1~2 신설 후보) → 현 대응물 `app/app/_components/AppShell.tsx`·`AppTabBar.tsx`, `styles/app-shell.css` |
| 운명의 섬 TILE_W=128 아이소메트릭 맵 | 레포에 존재하지 않음. 실체는 `destiny-island.html` + `worker/lib/island/*` |
| i18n 5개 언어 | 일치 — `lib/i18n/locales.ts` = ko/ja/zh/**zh-TW**/en (CLAUDE.md의 4개 서술이 구식) |
| `sajuAdapter.ts` `calculateLocalResult()` / `normalizeSaju.ts` / KASI prefetch | 실재(`app/saju/animal-destiny/lib/sajuAdapter.ts:271` 등) — 불변 상수 준수 대상 |
| AAB/APK npm 빌드 스크립트 | 없음 — gradle wrapper는 존재(`apps/mobile/android/`), 서명은 `CODE_DESTINY_ANDROID_KEYSTORE_FILE` 참조. AAB 생성은 수동 단계(Phase 5 과제) |

---

## 0-1. 플랫폼 판별 인벤토리 — 판별식 6그룹 공존

### 그룹 A — "3단 폴백" 4벌 복제 (최종 폴백이 과대)
`__CODE_DESTINY_RUNTIME_TARGET==='mobile-app'` → `Capacitor.isNativePlatform()` → **`!!window.Capacitor`**(과대 — Capacitor JS가 로드되기만 해도 true).

- `js/destiny-profile.js:897-906` `_dpIsMobileAppRuntime()`
- `js/core/index-inline-runtime.js:397-407` `__cdIsMobileAppRuntime()`
- `js/pwa-install-prompt.js:8-17` `isNativeApp()`
- `PhysiognomyUI.js:618-627` `isPhysiognomyAppRuntime()`

### 그룹 B — 빌드타임 env 포함
- `app/_lib/billing-client.ts:2575-2585` — `NEXT_PUBLIC_RUNTIME_TARGET` → 전역 → `isNativePlatform()` (Capacitor 존재 폴백 없음)

### 그룹 C — Capacitor를 아예 안 봄 (DOM/전역만)
- `js/core/checkout-entry.js:170-180` `shouldUseAppStoreEntry()` — ① `__cdAppPaymentGuard.installed` ② `__CODE_DESTINY_RUNTIME_TARGET` ③ `<html data-runtime-target>`. **주입 스크립트 실행 여부에만 의존** — 주입 실패 시 앱인데도 false → `/points` 이동 → 빈 화면(조건부 P1: 주입은 빌드 후처리라 평시에는 성립하나, 단일 실패점이라는 구조 리스크)
- `app/_lib/auth-client.ts:144-150`

### 그룹 D — Capacitor만
- `app/_lib/api-config.ts:28-36` `isCapacitorNativeRuntime()` — API base 강제(`https://code-destiny.com` 폴백, `api-config.ts:86-93`)

### 그룹 E — 죽은 브릿지 휴리스틱 (이 앱에 없는 객체 탐지)
- `lib/navigation/backHandler.ts:99-121` — `; wv)` UA, `window.Android.exitApp`, `webkit.messageHandlers`, `ReactNativeWebView`
- `js/mobile-backstack-navigation.js:346-375` — 같은 6종 브릿지 순차 시도. 이 앱에서 실동작하는 것은 Capacitor `App.exitApp` 분기뿐

### 그룹 F — "모바일 뷰포트" 휴리스틱 (앱 판별 아님 — 혼동 주의)
`js/mobile-interaction-patch.js:184-199` 등 다수 — `max-width:900px` + UA. 앱/웹 구분과 무관.

### 서버 측 판별
- `worker/routes/auth.js:1135-1140` `isMobileAppAuthRequest()` — 헤더 `X-Code-Destiny-Runtime: mobile-app` **AND** `Origin: https://localhost` 이중 조건(CSRF 면제)

### 불일치 매트릭스

| 지점 | Capacitor 확인 | data-attr | 빌드 env | 가드 설치 |
|---|---|---|---|---|
| A(4벌) | ✅(+`!!Capacitor` 과대 폴백) | ❌ | ❌ | ❌ |
| billing-client | ✅ | ❌ | ✅ | ❌ |
| checkout-entry / auth-client | ❌ | ✅ | 일부 | checkout-entry만 ✅ |
| api-config | ✅ | ❌ | ❌ | ❌ |

→ Phase 1 스펙의 "판별 단일 진실 원천(appContext)" 신설 근거. 판별 축이 다르면 같은 문서에서 "앱이다/아니다"가 갈릴 수 있다.

---

## 0-2. WebView 브릿지 실측 (Capacitor 기준)

### 커스텀 `@JavascriptInterface`: 0개
유일한 `@JavascriptInterface`는 Capacitor 내부 `com.getcapacitor.MessageHandler.postMessage`이며 `apps/mobile/android/app/proguard-rules.pro:24-26`이 보호한다. 브릿지 실체는 아래 Capacitor 플러그인.

### 커스텀 플러그인 4종 (`apps/mobile/android/app/src/main/java/com/codedestiny/app/`)

| 클래스 | 플러그인명 | 메서드 | 웹 호출부 |
|---|---|---|---|
| `CodeDestinyBillingPlugin.java:30` | `CodeDestinyBilling` | `purchase`(:41) `consume`(:62) `acknowledge`(:88) `queryProducts`(:112) `restore`(:161) | `scripts/app-native-bridge.js:351-369`, `app/app/_lib/native-billing.ts`, `app/app/MobileAppRuntimeBridge.tsx:220-265` |
| `CodeDestinyNavigationPlugin.java:32` | `CodeDestinyNavigation` | `@PluginMethod` 없음 — `shouldOverrideLoad(Uri)`(:42) 네이티브 훅 전용 | (없음) |
| `CodeDestinyStatusBarPlugin.java:34` | `StatusBar`(공식 플러그인명 의도적 점유 — 공식 `@capacitor/status-bar` 설치 시 충돌 주의, 파일 주석 :15-32) | `setStyle`(:47) | `index.html:35326` 셸 `applyTheme` |
| `CodeDestinyLockScreenPlugin.java:23` | `CodeDestinyLockScreen` | `getState`(:34) `setState`(:42) `setEnabled`(:49) `scheduleAlarms`(:62) `dismiss`(:68) `requestOverlayPermission`(:75) | `scripts/app-native-bridge.js:63-88`, `app/lock-screen-fortune/LockScreenFortuneClient.tsx:128` |

JS 파사드: `window.CodeDestinyNative = { purchase, restore, consume, queryProducts, openAuth }` — 정본 `scripts/app-native-bridge.js:350-421`, 사본 `app/app/MobileAppRuntimeBridge.tsx:218-280`(정본 설치 시 조기 return :195-197).

### 고아/누락/불일치

| 증상 | 파일:라인 | 심각도 | 판정 |
|---|---|---|---|
| 웹에서 부르는데 네이티브에 없는 브릿지 탐지 코드(죽은 경로): `window.Android`, `webkit.messageHandlers`, `ReactNativeWebView` | `lib/navigation/backHandler.ts:111-113`, `js/mobile-backstack-navigation.js:346-375` | P3 | 정적 확정 |
| proguard keep에 `CodeDestinyLockScreenPlugin` 명시 누락(Capacitor consumer 룰 의존) | `apps/mobile/android/app/proguard-rules.pro:36-42` | P2 | 정적 확정 — R8 실빌드 생존 여부는 기기 검증 |
| proguard 헤더 주석 "네이티브는 MainActivity와 BillingPlugin 둘뿐"이 실물(11개 클래스)과 불일치 | `proguard-rules.pro:3-5` | P3 | 정적 확정 |
| `capacitor.config.ts:36-41`의 `plugins.SplashScreen` 설정 무효 — `@capacitor/splash-screen` 미설치. 실제 스플래시는 `androidx.core.splashscreen` + `MainActivity.java:61-66,188-205` + `styles.xml` | `apps/mobile/capacitor.config.ts:36-41` | P3 | 정적 확정 |
| R8 릴리스 빌드 후 브릿지 생존(mapping.txt 대조) | — | — | **기기 검증 필요**(릴리스 빌드 필요) |

설치된 Capacitor 플러그인: `@capacitor/android`·`app`·`browser`·`core`뿐(`apps/mobile/package.json`).

---

## 0-3. 앱에서 깨지는 화면 목록 (우선순위 8종, 정적 판정)

### 공통 구조 결함 (여러 화면에 걸침)

| 증상 | 파일:라인 | P | 판정 |
|---|---|---|---|
| **백버튼 핸들러 2벌 모두 "열린 모달/시트"를 모른다.** 모달 open 시 `history.pushState`/`popstate` 배선이 저장소 전체에 0건, 닫기는 Escape 키뿐(안드로이드에 없음) → 모달 위에서 백버튼 = 페이지 이탈 또는 앱 종료 | `scripts/app-native-bridge.js:557-600`, `app/app/_lib/useAndroidBackButton.ts:41-55` | P0 뿌리 | 정적확정 |
| **없는 라우트 링크는 조용히 홈으로 튕긴다.** html5mode off — RouteProcessor가 `/route/index.html`을 찾고 없으면 `/index.html` 폴백 | `apps/mobile/capacitor.config.ts:32`, `MainActivity.java:249-257` | — | 정적확정(전제) |
| **전역 하단 네비(`.cd-mnav`, 56px+safe)가 `/destiny-compass`·`/island-consult`·`/master-love-codex`에 렌더**되는데 세 화면 CSS가 `--cd-mnav-offset`을 반영하지 않음 | `app/components/AppChrome.tsx:180`(면제 목록), `styles/mobile-bottom-nav.css:22-26` | P1 뿌리 | 정적확정 |

### 스플래시 ↔ 첫 페인트 배경색 대조 (FOUC)

| 항목 | 값 | 파일:라인 |
|---|---|---|
| 네이티브 스플래시(연이/기본) | `#FFFAF7` | `apps/mobile/android/app/src/main/res/values/colors.xml:8` |
| 네이티브 스플래시(네오) | `#0A0818` | `colors.xml:10`, `styles.xml:36` |
| 홈 셸 body(연이/네오, 모바일 MQ) | `#fffaf7` / `#0a0818` — **스플래시와 정확히 일치** | `index.html:6260,6262` |
| 홈 셸 네오 전역값(MQ 밖) | `#020617` — 스플래시 `#0A0818`과 불일치 | `index.html:1128` (P3) |
| `/today` body/main | `#0a0818` / `#070A11` — 연이 스플래시(크림)와 불일치 → 크림→다크 플래시 | `styles/globals.css:101`, `app/today/TodayHubClient.tsx:153` (P2) |
| `/login` | `#050516`(하이드레이션 전)→`#090b1a`→`#11132a` — 한 화면에 배경 4개 순차 교체 | `app/login/LoginRouteClient.tsx:22`, `app/components/auth/AuthShell.tsx:229` (P2, 체감은 기기검증) |
| OS 다크 + 연이 라이트 조합 | `@media(prefers-color-scheme:dark){:root:not(.theme-pig){color-scheme:dark}}` — UA 캔버스가 다크로 선칠 → 다크 플래시 위험 | `index.html:637-639` (P1, 기기검증) |

### 화면 1: 홈 (정적 셸 `index.html`) / 오늘의 운세 허브 (`/today`)

viewport: 홈 `width=device-width, initial-scale=1.0, viewport-fit=cover`(`index.html:417`) — `interactive-widget` 없음.

| 증상·위험 | 파일:라인 | P | 판정 |
|---|---|---|---|
| **테마 토글 알약이 하단 네비 "마이" 탭을 덮어 눌리지 않는다.** `.theme-switch-wrapper`가 `position:fixed!important; bottom:max(10px,env(bottom)); z-index:2147483000` — 마크업상 앱바 안이지만 fixed로 우하단 고정, 폭 ≈164px가 5칸 네비의 4·5번째 탭 위를 점유(네비 z-index 960). ≤380px에서도 접힌 56px이 정확히 "마이" 탭 위 | `index.html:533,644,6585,11775,15196` | **P0** | 정적확정 |
| 결과 페이지(`#resultPage`)에 하단 네비 여백 없음 — `#inputPage`만 `padding-bottom:calc(136px+env(bottom))`, 네비는 결과에서도 표시 → 마지막 콘텐츠가 네비(≈68px+safe)에 깔림 | `index.html:3536,15834` | P1 | 기기검증필요 |
| sticky CTA `padding:12px 20px 20px` — safe-area-inset-bottom 미반영, 제스처바에 깔림 | `index.html:2360` | P1 | 정적확정 |
| IME 대응 부재: `interactive-widget` 없음 + edge-to-edge(`MainActivity.java:83`)라 `adjustResize` 무력, IME inset 리스너 없음(단 `js/mobile-interaction-patch.js:2215`의 visualViewport 보정이 모달 높이는 커버) | `index.html:417`, `AndroidManifest.xml:24` | P1 | 기기검증필요 |
| 터치 타깃 미달: 컬렉션 닫기 38px(44px 정의를 `!important`로 덮음), 쿠키 동의 버튼 38px, 유저카드 재시도 34px | `index.html:3677,7417,1277` | P2 | 정적확정 |
| 하단 네비 라벨 `white-space:nowrap`+`overflow:hidden`(ellipsis 없음) → en/ja 긴 라벨 잘림 | `index.html:3554` | P2 | 기기검증필요 |
| share-toast·플로팅 새로고침 버튼 safe-area 미반영 | `index.html:579,30089` | P2 | 정적확정 |
| `100vw` 실위험 2건(`.dream-ledger-overlay`, `.golden-grain-modal`) | `index.html:576,3715` | P3 | 기기검증필요 |
| `/today`: 앱에서 하단 네비 없는 화면인데 본문에 홈 복귀 UI가 없음(하드웨어 백만 유효) | `app/today/TodayHubClient.tsx:148-232` | P1 | 정적확정 |
| `/today`: 라이트 전용 클래스(`bg-white`·`bg-indigo-50/70` 등)를 켜는 `dark` 주체가 없어 다크 배경 위 흰 카드 혼재 | `TodayHubClient.tsx:62,80,191` | P1 | 기기검증필요 |
| `/today`: SEO 푸터 링크트리(약 60+ 라우트)·절대 URL 로케일 스위처(`/rss.xml` 포함)가 앱에 그대로 노출 | `dist/today/index.html`(산출물) | P2 | 정적확정 |

### 화면 6: 로그인 (셸 모달 `index.html:27359` → `/login` `app/components/auth/AuthShell.tsx`)

| 증상·위험 | 파일:라인 | P | 판정 |
|---|---|---|---|
| ~~OAuth 앵커 선점 가드가 실제 로그인 UI에 무효~~ → **오탐 정정(2026-08-12)**: JS 가드는 `a[href]`만 캡처하지만, `location.assign(절대 URL)` 최상위 이동은 네이티브 `CodeDestinyNavigationPlugin.shouldOverrideLoad`가 최종 차단·커스텀탭 전환한다(외부 Chrome 이탈 없음) | `CodeDestinyNavigationPlugin.java:42-91` | 정정 | 검증 완료 |
| `openAuth`가 `NATIVE_BROWSER_UNAVAILABLE`로 실패하면 폴백 경로 없이 에러 문구만 표시 | `app-native-bridge.js:398-403` | P1 | 기기검증필요 |
| 회원가입 모드 긴 폼(이름·전화·이메일·비번·약관)의 하단 필드 IME 가림 — visualViewport/scrollIntoView 대응 0건 | `AuthShell.tsx:236-250` | P1 | 기기검증필요 |
| 약관·개인정보 링크 `target="_blank"` — WebView에서 새 창은 이탈/무반응 위험 | `AuthShell.tsx:248` | P1 | 기기검증필요 |
| 셸 로그인 모달의 소셜 버튼 CSS는 있는데 마크업이 없음(죽은 CSS) — 셸에서 소셜 직행 불가, 항상 `/login` 왕복 | `index.html:27380-27403` | P2 | 정적확정 |
| 하이드레이션 전 셸 `min-h-[calc(100vh-3rem)]`(100vh, safe-area 미반영) | `app/login/LoginRouteClient.tsx:22-23` | P2 | 정적확정 |
| safe-area·터치 타깃(소셜/제출/입력 48px, 라벨 44px)은 이 화면이 가장 정확 | `AuthShell.tsx:229-249` | — | 문제없음 |

### 화면 2: 6개 엔진 입력·결과 화면

진입 실체 확정(`middleware.ts:167-187`의 `MODAL_ROUTE_ACTION`): 사주·타로·점성술·숙요·자미두수 5개는 Next 라우트가 아니라 **정적 셸 `index.html` 모달**(`?action=`)이 실사용 진입이다. 베다만 React 라우트(`app/vedic-ai/`). 입력 폼은 사주·점성술·숙요·자미두수가 `#destinyCardForm`(`index.html:16392`)을 공유.

**엔진 횡단 공통 결함**:
- `position:fixed` 요소는 브릿지의 body `padding-top` 보정을 못 받는다 — 셸 모달들은 `.modal-top-nav`(`styles/fortune-ui.css:947-948`)에서 자체 보정해 안전하지만 **타로 모달만 인라인 스타일이라 보정 0**.
- `.modal-nav-home`에 `min-height` 누락(형제 `.modal-nav-close`는 44px 있음) → 점성술·숙요·자미두수 3개 모달의 '홈으로' 버튼이 ≈31px (`styles/core-ui.css:1850-1856`, P1).
- `useAiProfileSeed` 채택 비대칭: AI 유료 라우트 23개는 전부 사용, 셸 모달 5개(vanilla라 훅 불가)와 `app/nakshatra`(커스텀 프리필 병렬 구현, `NakshatraFormClient.tsx:48-76`)는 미사용(P2~P3).

| 엔진 | 증상·위험 | 파일:라인 | P | 판정 |
|---|---|---|---|---|
| 타로 | **닫기 버튼이 상태바 아래 깔림** — `position:absolute; top:20px`인데 부모가 `fixed inset:0`이라 body padding-top 보정 무효 | `index.html:20255` | **P0** | 정적확정 |
| 타로 | 오버레이 전체에 `env(safe-area-inset-*)` 0건(`inset:0`+`100dvh`) | `index.html:20254`, `styles/fortune-ui.css:12946-12959` | P1 | 정적확정 |
| 타로 | 카테고리 칩 ≈32px, 모드 토글 ≈33px, 최종 버튼 ≈42px | `styles/fortune-ui.css:12763-12873` | P1/P2 | 정적확정 |
| 타로 | 하단 여백 `max(80px, env(bottom))` — `calc(80px + env())` 의도 오기, safe-area 실반영 0 | `styles/fortune-ui.css:12957-12959` | P2 | 정적확정 |
| 사주 | 입력 폼이 홈 최하단 + fixed 하단 네비 항상 노출, focusin 시 네비 숨김 없음 → 키보드와 3중 겹침 | `index.html:3539,15254` | P1 | 기기검증필요 |
| 사주 | 입력 `font-size:15px!important`(16px 정의를 특이도로 덮음) / 폼 `width:calc(100vw-24px)!important` | `styles/cosmic-main.css:2130,2096,2179` | P2 | 정적확정 |
| 사주 | 결과 플로팅 인디케이터 `bottom:86px` safe-area 미반영(네비와 겹침) | `styles/fortune-ui.css:7464-7482` | P2 | 정적확정 |
| 점성술 | 네비 3요소 `white-space:nowrap`(좌우 버튼 축소 불가) / 모바일 입력 `min-height:42px` | `styles/core-ui.css:1843-1847`, `js/saju-engine.js:12743` | P2 | 정적확정 |
| 베다 | **진입 3홉 우회**: 홈 카드 → `/vedic/jyotish`(링크 0개 SEO 랜딩) → 셸 복귀 → `/vedic-ai` — 앱에서 풀 내비게이션 2회 낭비 | `index.html:16371,21877-21887`, `app/components/FeatureLandingPage.tsx:272,614` | P1 | 정적확정 |
| 베다 | 입력 ≈42px / 컨테이너 `min-height:100vh` | `app/vedic-ai/VedicAiClient.module.css:324-334,3` | P2/P3 | 정적확정 |
| 베다(보조) | `app/nakshatra` 입력 ≈40px·15px, 체크박스 16px, 최하단 폼 IME 가림 | `app/nakshatra/nakshatra.module.css:235-243`, `NakshatraFormClient.tsx:244-265` | P1/P2 | 일부 기기검증 |
| 숙요 | 27숙 달력 월 선택 ≈28px·12px, 이전/다음 버튼 34→32px, ≤480px 숙 이름 9px | `index.html:10269,10279,10326` | P1/P2 | 정적확정 |
| 자미두수 | 12궁 명반 `min-width:516px` → 360px에서 가로 스크롤 필수(overflow 래퍼+안내로 의도된 설계이나 핵심 결과의 UX 비용 큼) | `js/saju-engine.js:18505-18536,18738-18741` | P1 | 정적확정 |
| 자미두수 | 요약 표 `min-width:540px`(래퍼 있음) | `js/saju-engine.js:15455` | P2 | 정적확정 |
| 공통(양호) | 셸 모달 시트 하단 `calc(120px+env(bottom))`, `#resultPage` `calc(180px+env(bottom))`, React 라우트는 `styles/globals.css:117` body 보정 | `styles/fortune-ui.css:250,1017-1019` | — | 문제없음 |

### 화면 3: 운명의 나침반 (`app/destiny-compass/`)

레이더는 8방향 viewBox SVG(`_components/DestinyRadar.tsx:10-30`, `width:min(80vw,300px)`)라 360px에서 안전. `<canvas>` 0건.

| 증상·위험 | 파일:라인 | P | 판정 |
|---|---|---|---|
| 하단 콘텐츠가 전역 네비에 가림(`--cd-mnav-offset` 미반영, safe-area만) | `_components/compass.module.css:8` | P1 | 정적확정 |
| 토스트 `bottom:calc(22px+safe)` < 네비 56px → 네비 뒤로 숨음 | `_components/map.module.css:1664-1670` | P1 | 정적확정 |
| 첫 페인트: `.page`가 연이 핑크 라이트로 칠해진 뒤 `.zoneWarroom` 다크가 덮음(주석이 인정) | `compass.module.css:4-8,33` | P2 | 정적확정 |
| 터치 타깃: 빠른질문 칩 38px, 보조 버튼 34px | `map.module.css:724,1119` | P2 | 정적확정 |
| 스테이지 머신(Arrival→Crossroads→Report)에 history 배선 0건 → 백 1회에 전체 이탈 | `app/destiny-compass/**` | P2 | 정적확정 |

### 화면 4: 운명의 섬 (`destiny-island.html` + `app/island-consult/`)

앱 번들 포함 확정. 터치 팬/줌은 구현되어 있음(`destiny-island.html:1626-1668` — 포인터+핀치 1~3배 clamp, `touch-action:none`). 고정 폭 SVG 없음(viewBox 1000×720).

| 증상·위험 | 파일:라인 | P | 판정 |
|---|---|---|---|
| **"운명의 섬으로 돌아가기" 링크가 홈으로 튕김** — `href="/destiny-island"`(확장자 없음)인데 dist에는 `destiny-island.html`만 있어 RouteProcessor 폴백 → 홈 셸 | `app/island-consult/IslandConsultClient.tsx:520,627,633` | **P0** | 정적확정 |
| 백버튼이 궁 시트/대화창을 닫지 않고 페이지째 이탈 | `destiny-island.html:962-965` | P1 | 정적확정 |
| `.ic-root` `min-height:100vh`(dvh 미사용) + 하단 패딩에 `.cd-mnav` 56px 미반영 | `IslandConsultClient.tsx:640` | P2 | 정적확정 |
| 터치 타깃: `.ic-change` 36px, `.ic-check` 40px | `IslandConsultClient.tsx:697,702` | P2 | 정적확정 |
| 섬 자체 HUD·시트·토스트는 safe-area 반영, 버튼 46~48px — 양호 | `destiny-island.html:303-419` | — | 문제없음 |

### 화면 5: 마스터 인연의 서 (`app/master-love-codex/` + `src/features/master-love-codex/`)

safe-area·하단바 처리(`--cd-mnav-offset` 이중 가산 방지 포함)는 저장소 내 모범 사례(`styles/codex.module.css:544-566`). `100svh` 사용, nowrap 금지 주석 준수.

| 증상·위험 | 파일:라인 | P | 판정 |
|---|---|---|---|
| 몰입 오버레이(`fixed inset:0 z-60`)를 백버튼이 못 닫음 → 백 1회에 라우트 이탈 | `codex.module.css:41-47` | P1 | 정적확정 |
| 터치 타깃: 재개 프롬프트 38px, 칩 38px, 소형 컨트롤 32px | `codex.module.css:256,184,479` | P2 | 정적확정 |

### 화면 7: 마이페이지/보관함 (`/app` 셸 + 정적 셸 탭)

| 증상·위험 | 파일:라인 | P | 판정 |
|---|---|---|---|
| **`/app` 홈에서 마케팅 모달 열고 백버튼 → 모달 안 닫히고 앱 종료 수순**(`/app`은 isRoot → 종료 힌트 → 종료) | `app/app/_components/AppShell.tsx:11,19`, `useAndroidBackButton.ts:43-54`, `FeatureMarketingDetailModal.tsx:462-467` | **P0** | 정적확정 |
| **탭바가 2벌로 서로 다름**: React 앱 셸(홈/운세/찻집/전략실/마이 — `AppTabBar.tsx:10-17`) vs 정적 셸(홈/사주/모든운세/**이용권→`/points`**/마이 — `app/_lib/mobile-tabs.ts:44-71`). 셸 "이용권" 탭은 가드 리다이렉트로 살지만 라벨·목적지 어긋남 | 좌기 | P2 | 정적확정 |
| **보관함(저장 결과 열람) 진입점이 앱 탭 어디에도 없음** — 기능별 산재(`app/fortune/prompt-hub/`, `index.html:20666` 등), `/mypage` 라우트 자체가 없음 | `AppTabBar.tsx:10-17` | P1 | 정적확정 |
| "마이" 탭이 `location.assign("/?action=dpOpenList")` 하드 이동 → React 앱 셸(탭바) 통째 이탈, 실체는 프로필 카드 시트 | `AppTabBar.tsx:16,19-22,58-61` | P1 | 정적확정 |
| 첫 페인트: 스플래시 `#fffaf7`(크림, `capacitor.config.ts:40` — 단 이 설정은 무효 플러그인 값, 실값은 styles.xml 참조) vs 앱 셸 `#0a0d1c` 다크 → 밝음→어두움 플래시 | `styles/app-shell.css:8`, `styles/globals.css:101` | P2 | 기기검증필요(체감) |
| 앱 셸 자체 safe-area·터치타깃(48×48)·가로 오버플로 방지는 정확 | `app-shell.css:164-194,246-254` | — | 문제없음 |

### 화면 8: 결제 화면 (레이아웃만)

- **`/app/store`(React)**: 전체 페이지형 — AppShell 스크롤 컨테이너 상속으로 safe-area/탭바 확보, 버튼 48×48, 오버플로 없음, 백버튼 정상. 레이아웃 이슈 없음.
- **정적 셸 결제창(`cd-direct-payment-*`, `index.html:22790-22861`)**: 컨테이너/다이얼로그가 `dvh`+safe-area+스크롤 정확.

| 증상·위험 | 파일:라인 | P | 판정 |
|---|---|---|---|
| **백버튼이 결제 모달을 닫지 않고 앱 종료 수순**(셸은 pathname `/` → isRoot → 종료 힌트/종료; 이 모달엔 Escape 배선도 없음) | `index.html:22790-22861` + `app-native-bridge.js:557-597` | **P0** | 정적확정 |
| 닫기(취소) 버튼 ≈36px, 재조회 버튼 ≈30px — 취소가 유일한 닫기 UI | `index.html:22850,22846` | P2 | 정적확정 |


---

## 0-4. 웹 전용 잔재

이미 처리되고 있는 것(재작업 불필요):
- 라우트 제거: `scripts/build-mobile-app.mjs:49` `REMOVED_ROUTE_DIRS = ["points","premium-unlock","insights","famous-saju"]` + `scripts/app-payment-guard.js:223-228` PRUNED_ROUTES(링크 리라이트/삭제), 홈 SEO 섹션 제거(:245)
- PWA 설치 배너: `js/pwa-install-prompt.js:8-31` 앱에서 억제
- 언어 선택기·Google 번역 위젯: `scripts/app-native-bridge.js:46-47` 숨김
- PortOne 봉쇄: `scripts/app-payment-guard.js:161-167`(`window.PortOne` 고정), `:180-181`, `:207-214`
- 관상 라이브 카메라 탭: `PhysiognomyUI.js:629-632`(CAMERA 권한 없음)

잔존(빠진 것):

| 증상 | 파일:라인 | P | 판정 |
|---|---|---|---|
| **두 번째 PWA 설치 유도가 앱에서 노출** — `js/luck-sync-diary.js`는 `js/pwa-install-prompt.js`와 달리 앱 런타임 억제가 전혀 없음(`Capacitor`/`__CODE_DESTINY_RUNTIME_TARGET` 참조 0건). WebView에선 `beforeinstallprompt`가 안 오므로 "홈 화면에 추가하기" 안내 패널이 그대로 뜸. Play 심사 리스크 | `js/luck-sync-diary.js:645,843-862,889` | P1 | 정적확정 |
| **외부 제3자 도메인 타일**: 심리테스트 타일 전체가 `https://aesthetic-pig-design--youngchan1237.replit.app`(href + data-fallback-href). 커스텀탭으로 열려 이탈은 막지만 세션 없는 외부 도메인이 기능 하나를 대체 | `index.html:19256` | P1 | 정적확정 |
| 쿠키 동의 배너(`#cdCookieConsent`)가 앱에서도 뜸 — 억제 없음(웹 GDPR용 UI) | `index.html:11659`, CSS `:7363` | P2 | 정적확정 |
| SEO 푸터 링크트리(약 60+ 라우트)가 홈·`/today` 등에서 앱에 그대로 노출(가드는 insights/famous-saju 섹션만 제거) | `scripts/app-payment-guard.js:245` | P2~P3 | 정적확정 |
| `/today` 로케일 스위처가 절대 URL(`https://code-destiny.com/en/` 등) + `/rss.xml` 링크 — 앱에서 열 화면 아님 | `dist/today/index.html`(산출물) | P2 | 정적확정 |
| SNS 외부 앵커 5개(YouTube/Threads/Instagram/Naver Blog/X) — 커스텀탭 처리되어 동작은 정상 | `index.html:21996-22000` | P3 | 정적확정 |

---

## 0-5. i18n (검증 스크립트 실측)

실행: `verify:i18n-no-hardcoded-korean` / `verify:i18n-ko-coverage` / `verify:i18n-no-fallback` (모두 exit 0 — 기준선 관리형이라 "OK"지만 내용은 아래)

| 측정 | 값 | 비고 |
|---|---|---|
| 한국어 하드코딩 리터럴 | 총 115,158개 (app 35,825 / js 35,503 / worker 17,389 / lib 18,220 / src 6,089 / components 2,132) | 기준선 대비 +8,413 증가 경고 |
| i18n 키 커버리지(ko 기준) | 5,715키 중 3,615 커버(63.3%), **미커버 2,100키** | 기준선 3,508 대비 개선 중 |
| 한국어 fallback 구조/인자 | 523 / 317 (기준선 135/181 대비 급증 경고) | 아래 측정 오염 참고 |

🔴 **측정 오염 주의(도구 이슈, 수정은 안 함)**: `verify:i18n-no-fallback` 위반 목록에 `.claude/worktrees/inline-diet/...` 경로가 다수 포함 — 스크립트가 **다른 세션의 git worktree 사본까지 스캔**한다. 하드코딩/fallback "증가" 수치의 상당분은 워크트리 중복 계상일 가능성이 높다. Phase 4에서 i18n 상태를 판단할 때는 `.claude/worktrees` 제외 후 재측정이 필요하다(스크립트 스캔 루트 이슈로 기록만).

- 언어별 키 누락 매트릭스: ko 기준 미커버 2,100키가 상한. 로케일별 상세는 `verify:locale-main-sync`·`i18n/locale-table-baseline.json` 참고(아래 실행 결과 반영).

- `verify:locale-main-sync` 실행 결과: **OK** — 정적 셸 필수 마커가 static + 전 로케일 미러에 동기화되어 있음(로케일 셸 구조 결손 없음).

- 언어별 텍스트 길이 초과(en/ja 버튼 오버플로): 정적 위험 후보는 0-3 화면 표에 포함. 실측은 기기 검증 부록.

---

## 0-6. 런타임 (정적 대체 분석)

### API 호스트 오판 — 앱 출처가 `https://localhost`라는 구조적 함정

앱은 `https://localhost` 출처로 번들을 서빙한다. `location.hostname === 'localhost'`를 "로컬 개발"로 읽는 레거시 코드는 앱에서 전부 오판한다. 방어선은 빌드 주입 전역 `window.CODE_DESTINY_API_BASE_URL="https://code-destiny.com"`(`scripts/build-mobile-app.mjs:31`, 모든 HTML `<head>` 최선두 주입)이며, 전역을 **우선 확인하는 코드는 안전**하고 아닌 코드는 깨진다.

| 모듈 | 판정 | 근거 |
|---|---|---|
| 🔴 타로 체험 3종(연애/재회/연간) | **P0 — 앱에서 API 후보 전멸** | `js/tarot-reunion-experience.js:209-222` `isSafeTarotApiBase()`: 호스트가 localhost가 아니면 **동일출처만 안전 판정** → 앱에서 전역 base(`code-destiny.com`)가 후보에서 배제(:248-251). 남는 후보 `["", "http://localhost:3000", "http://localhost:4000"]`(:239,255-257) — ①상대경로=`https://localhost/api/...`(서버 없음, 404) ②③연결 불가. 요청 루프(:316-)가 전 후보 소진 → 실패. `tarot-love-experience.js:394-447`, `tarot-year-fortune-experience.js:136-189` 동일 패턴. 3종 모두 홈 셸에서 지연 로드되어 앱 번들에 포함(`js/core/uiBindings.js:75`, `js/core/index-inline-runtime.js:1811`, `js/mobile-interaction-patch.js:1164`) |
| 숙요/양자 타로 엔진 | P2 — 죽은 후보 2회 선행 후 성공(지연) | `js/saju-engine-tarot-sukuyo-quantum.js:1300-1340`: 후보에 `''`·`location.origin`(=`https://localhost`)이 앞서고, `getFortuneApiBaseUrl()`(전역 우선)과 `https://code-destiny.com` 명시 폴백(:1334-1336)이 뒤따름 — 실패 2회 후 성공. ⚠️ 이 파일은 현재 다른 세션이 수정 중(워크트리 dirty) — Phase 2 착수 전 재확인 |
| 자존감 타로 / 꿈해몽 | 정상 | `js/tarot-self-esteem-experience.js:387-406`, `js/psycho-dream-analyzer-freuds-study.js:221-238` — 전역 우선 확인 |
| `js/saju-engine.js` 공용 `getFortuneApiBaseUrl` | 정상 | `:4699-4711` 전역 우선 |
| `js/inline/api-base-init.js` | 정상 | `:57-62` 명시 전역 우선(주입 전역이 먼저 실행되므로 localhost 분기(:73) 미도달) |
| React 측 `app/_lib/api-config.ts` | 정상 | `:86-93` Capacitor 감지 시 프로덕션 base 강제 |
| `js/share.js:1783` 등 localhost→`:4000` 반환 코드 | 개별 확인 필요(P2 후보) | 전역 우선 여부 파일별 상이 — Phase 2 전 전수 확인 목록에 포함 |

### OAuth 세션 유지 (코드 흐름 정적 확정)
쿠키가 아니라 **localStorage 토큰**으로 유지된다: Custom Tabs(`Browser.open`) → 서버 HTML 중계(`worker/routes/auth.js:1249-1305`, intent:// → 커스텀 스킴 → 수동 버튼 3단) → 딥링크 `com.codedestiny.app://auth` + `social_grant` → `POST /api/auth/oauth/complete` → `fortune_auth_token`·`fortune_auth_refresh_token`(SameSite 쿠키 불가로 본문 수령)·`fortune_auth_user` 저장(`scripts/app-native-bridge.js:424-471`) → `cd:auth-changed` → 복귀. 앵커 선점 가드(:659-684)와 네이티브 폴백(`CodeDestinyNavigationPlugin.java:76-78`)의 이중 방어. 실왕복 성공 여부는 기기 검증.

- 콘솔 에러/실패 네트워크 전수 실측: **기기 검증 필요**.

---

## 0-7. 가격/결제 관련 발견사항

→ 별도 문서 [PRICING_FINDINGS.md](PRICING_FINDINGS.md) (기록만, 수정 없음)

---

## 부록 A. 기기 검증 필요 목록 (정적으로 판정 불가)

| # | 항목 | 왜 실측이 필요한가 |
|---|---|---|
| 1 | R8 릴리스 빌드 mapping.txt 대조(플러그인 4종 + LockScreenPlugin keep 누락 영향) | 릴리스 빌드 산출물 필요 |
| 2 | 타로 3종 API 실패의 실기기 재현(P0 #1 확인) | 로직상 결정적이나 실증 필요 |
| 3 | OAuth Custom Tabs 실왕복 → localStorage 토큰 복귀 | 네이티브↔브라우저 전환 실측 |
| 4 | 앱 실행 중 콘솔 에러/실패 네트워크 전수 | 런타임 전용 |
| 5 | 스플래시→웹 첫 페인트 배경 연속성(FOUC) 육안 확인 | 페인트 타이밍 |
| 6 | 키보드 오버랩·폰트 배율 130/200%·3버튼/제스처 내비 매트릭스 | 렌더 실측 |
| 7 | 백버튼 이중 등록의 실동작(1회 입력에 2단계 후퇴) | 이벤트 순서 실측 |
| 8 | en/ja 텍스트 길이 오버플로 화면(하단 네비 라벨 `index.html:3554` 등) | 렌더 실측 |
| 9 | 사주 입력 폼 ↔ 키보드 ↔ 하단 네비 3중 겹침(`index.html:15254`) | IME 실측 |
| 10 | `/today` 라이트 전용 카드가 다크 배경 위에 뜨는 혼재(`app/today/TodayHubClient.tsx:62,80,191`) | 렌더 실측 |
| 11 | `js/share.js:1783` 등 localhost→`:4000` 반환 코드의 전역 우선 여부 파일별 전수 확인 | 정적 후속 조사(Phase 2 전) |
