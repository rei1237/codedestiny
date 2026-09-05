# Phase 1 실사 — 모바일 웹 & 안드로이드 앱 (2026-07-22)

> 범위: 모바일 웹 UI/UX · 로그인 · 결제(웹 PortOne / 앱 Play Billing) · Capacitor 안드로이드 래퍼 · 빌드/릴리즈 파이프라인 · 성능
> 방법: 읽기 전용 병렬 감사 9축 → 각 축의 P0/P1 주장에 대해 독립 반증 에이전트 투입(총 41 에이전트). 반증 통과 항목만 아래 "확인된 결함"에 남겼다.
> 실행·편집·빌드는 하지 않았다.

---

## 0. 한 줄 결론

**이 프롬프트가 요구한 작업의 70~80%는 이미 구현되어 있다.** Capacitor 래퍼·Play Billing 전용 결제 경로·릴리즈 서명 fail-closed·평문 차단·세이프에어리어·CDN 자산 오프로드가 전부 완성 상태다. 남은 것은 **앱 세션 갱신 결함 1건(P1)**, **네이티브 UX 결함 4건(P2)**, **Play Billing 예외 처리 4건(P1~P2)**, 그리고 **릴리즈 빌드 절차상의 함정 1건(P1)** 이다.

---

## 1. 프롬프트 가정 정정 (진행 전 필수 확인)

| # | 프롬프트의 가정 | 판정 | 실제 |
|---|---|---|---|
| 1 | saju 유일 권위 경로 = `animal-destiny/lib/sajuAdapter.ts` → `calculateLocalResult()` | **거짓(부분사실)** | 그 경로는 없다. 실제는 `app/saju/animal-destiny/lib/sajuAdapter.ts:269`이고, `calculateLocalResult`는 **export도 안 되는 5줄짜리 어댑터**다. 실제 계산 정본은 `app/saju/animal-destiny/engine/localSajuCalculator.ts`의 `calculateLocalSaju()`(5,371줄). 게다가 엔진은 **최소 3계통 병존**(React: localSajuCalculator / 정적 셸: `js/saju-engine.js` 31,902줄 / 워커: `worker/lib/life-book-ai-saju.js` lunar-javascript). 또한 `NEXT_PUBLIC_ANIMAL_DESTINY_SAJU_ENDPOINT`가 설정돼 있으면 **외부 엔드포인트가 로컬 계산보다 먼저 채택**된다(sajuAdapter.ts:299-302). |
| 2 | PortOne + Inicis 실결제, Galaxia 미사용 | **부분사실** | Galaxia 0건(사실). 단 이니시스는 독립 PG가 아니라 **PortOne V2의 `pg:'KG_INICIS'` 채널**이다. 그리고 **안드로이드 앱은 PortOne을 아예 쓰지 않는다** — Google Play Billing 전용 경로가 별도로 존재하며 `verify:app-no-portone` 가드가 PortOne 잔존을 빌드 실패로 막는다. store ID `store-2c695a62-…f`는 소스 하드코딩 0건, env에서만 확인됐고 값 일치. |
| 3 | 산출물 `AUDIT.md` / `QA-CHECKLIST.md` / `INSTALL.md` / `RELEASE-NOTES.md` | **부재** | 정확한 이름으로는 4개 모두 없다. 다만 유사 문서는 이미 20여 개 존재(`DEPLOY_CHECKLIST.md`, `docs/android-release.md`, `MOBILE_*_AUDIT.md` 등). 신규 생성 vs 기존 갱신 결정 필요. |
| 4 | 회귀 이슈: 대구→부산 매핑 / 일주 자시 경계 / normalizeSaju 타임존 | **부분사실** | 앞 2건은 실재했고 커밋 `1abaaf1c`에서 3계통 전부 근본 수정 완료. 단 그 회귀 하네스(`scripts/test-saju-day-pillar-civil-date.mjs` 등)가 **npm/CI 어디에도 배선돼 있지 않아** 재발 방지가 자동화되지 않았다. `normalizeSaju 타임존`은 회귀가 아니라 **입력 타입(`AnimalDestinyInput`)에 timezone/경도 필드 자체가 없는 미배선 갭**이다. |

**Phase 5(아키텍처 선택)는 사실상 결론이 나 있다** — B안(Capacitor)이 이미 채택·구현되어 있으므로 A/B/C 비교는 무의미하다.

---

## 2. 이미 완료된 것 (건드리지 말 것)

- **래퍼**: Capacitor 8.4.1 / minSdk 24 / compile·targetSdk 36 / AGP 8.13 / Gradle 8.14.3
- **결제(앱)**: Play Billing 9.1.0 네이티브 플러그인(purchase/consume/acknowledge/queryProducts/restore) ↔ `window.CodeDestinyNative` 브릿지 ↔ `scripts/app-payment-guard.js`(PortOne 봉인) ↔ 워커 `/api/app-store/google/{intent,verify,restore,rtdn}`. 서버는 androidpublisher `purchases.products.get`으로 실영수증 검증 + acknowledge + 멱등(`google:<token해시>`) + 토큰 리플레이 409 + 계정 귀속 대조까지 수행. 상품 17개(inapp 일회성)
- **결제 정책**: 이용권 선검사 → 미커버 시 단건+월정석 **동등 노출** 순서가 서버·정적셸·React 3계층 모두 준수. CLAUDE.md 금지패턴 4종 **위반 0건**. 앱도 정본 게이트를 재사용하고 금액만 앱 확정가로 바꾼다
- **보안**: `usesCleartextTraffic=false` + network_security_config 이중, 웹 HSTS 1년, 릴리즈 서명 미구성 시 `assembleRelease`/`bundleRelease`를 **GradleException으로 강제 실패**(디버그 서명 폴백 불가), keystore·`release-signing.properties` 이중 gitignore + 히스토리 유출 0건
- **세이프에어리어**: 6개 셸 전부 `viewport-fit=cover`, `env(safe-area-inset-*)` 44곳, edge-to-edge + 디스플레이 컷아웃 + 알고리즘 다크닝 차단이 네이티브~웹까지 일관 배선. `/app` 허브는 `visualViewport` 구독까지
- **앱 이탈 차단**: 자사 호스트는 앱 출처로 재로드, 외부는 커스텀탭 — Play 안티스티어링 위반 소지 차단
- **성능 기반**: 컬렉션 IO 하이드레이션 + Cloudflare Image Resizing, 모바일 웹폰트 전면 시스템폰트 강등(앱 WebView 폰트 다운로드 0), Next 코드 스플리팅(최대 1.43MB 청크가 lazy)
- **인증**: 유령 로그인 / transient DB 오류의 401 오분류는 서버·클라·정적셸 3곳 모두 해결됨. 리프레시 회전 + 재사용 탐지 + 멀티탭 grace window
- **런처 아이콘**: 기본 Capacitor 아이콘 아님(브랜드 자산), 어댑티브 세이프존 충족
- **뒤로가기**: `scripts/app-native-bridge.js:498 installBackButton()`이 `App.addListener('backButton')`으로 처리(루트에서 2초 내 두 번 → 종료). *초기 감사의 "무반응" 주장은 반증됨*

---

## 3. 확인된 결함 (반증 통과분만)

### 3-A. 앱 — 세션/네이티브

| ID | 심각도 | 결함 | 근거 |
|---|---|---|---|
| A1 | **P1** | **앱은 액세스 토큰(기본 30분) 만료 후 갱신 수단이 없다.** `handleRefresh`는 리프레시 토큰을 **쿠키에서만** 읽는데(`worker/routes/auth.js:2806`→`:1978-1980`) 쿠키는 `SameSite=Lax`라 앱 출처(`https://localhost`)의 cross-site 요청에 실리지 않는다. 결과: 앱 사용자는 30분 뒤 세션이 끊긴다. **다행히 해법이 이미 서버에 있다** — `/api/auth/app/exchange`(`auth.js:3657`)가 현재 유효한 Bearer 토큰으로 새 30분 토큰을 재발급하는 슬라이딩 갱신 엔드포인트인데 **호출자가 0건인 데드코드**다 | `auth.js:2806,1978-1980,606-611,3657-3683` |
| A2 | P2 | 앱 로그아웃이 403으로 막혀 **서버 세션(리프레시 토큰)이 폐기되지 않는다.** `logoutWithServer`가 `fetchWithTimeout`을 써서 `buildAuthRequest`를 우회 → 모바일 런타임 헤더 누락 → 워커 CSRF 가드 403. 클라는 예외를 삼키고 로컬만 지운다 | `app/_lib/auth-client.ts:431-436`, `http-client.ts:27-42`, `auth.js:1056` |
| A3 | P2 | **`@capacitor/status-bar`가 설치돼 있지 않다.** `MainActivity:60`이 `setAppearanceLightStatusBars(true)`로 고정하고, 셸(`index.html:29786`)은 `Capacitor.Plugins.StatusBar.setStyle`을 부르지만 플러그인이 없어 **no-op**. → 네오(다크) 모드에서 상태바 아이콘이 어두운 채 고정 | `capacitor.plugins.json`, `apps/mobile/package.json` |
| A4 | P2 | **CAMERA 권한 미선언** — 관상 '라이브 카메라'가 **기본 활성 모드**인데(`PhysiognomyUI.js:548`) `getUserMedia`가 앱에서 항상 실패. 병합 매니페스트에도 CAMERA 없음 | `AndroidManifest.xml:56` |
| A5 | P2 | 내비게이션 바 아이콘 대비 미설정 — `setAppearanceLightNavigationBars` 미호출 → 연이(크림) 모드에서 흰 제스처 핸들이 안 보임 | `MainActivity.java:41,58-60` |
| A6 | P2 | 스플래시가 웹 첫 페인트를 기다리지 않는다 — `setKeepOnScreenCondition` 미설정이라 2MB 셸 파싱 전 빈 윈도우 노출. `capacitor.config`의 SplashScreen 설정은 플러그인 미설치로 무효 | `MainActivity.java:27` |
| A7 | P2 | 키보드 인셋 미처리 가능성 — `adjustResize` + `setDecorFitsSystemWindows(false)` 조합, `@capacitor/keyboard` 미설치 → 생년월일/이름 입력 시 키보드가 필드를 가릴 수 있음(실기기 확인 필요) | `AndroidManifest.xml:24`, `MainActivity.java:39` |
| A8 | P2 | HTTPS 앱링크 부재 — 커스텀 스킴(`com.codedestiny.app://auth`)만 있고 `autoVerify`+`assetlinks.json`이 없어 **카톡 공유 링크가 앱으로 열리지 않는다** | `AndroidManifest.xml:32-39` |

### 3-B. 앱 — Play Billing 예외 처리

| ID | 심각도 | 결함 |
|---|---|---|
| B1 | **P1** | **Play 결제에는 서버측 자동 환불 경로가 없다.** 웹은 전달 실패 시 `autoRefundSinglePaymentDeliveryFailure`가 자동 환불하지만 Play 경로는 이 함수를 호출조차 하지 않는다 → 결제 성공 후 LLM 생성 실패 시 사용자가 직접 Google Play 환불 요청해야 함 |
| B2 | P2 | **PENDING(지연결제) 구매가 "결제 검증 실패"로 오표시** — 플러그인이 purchaseState를 그대로 성공 resolve, 서버는 402로 거부. PENDING 안내 UI는 `/app` 셸에만 있고 앱 메인(정적 셸) 경로엔 없음 |
| B3 | P2 | **결제 콜백 유실 시 세션 전체 고착** — `pendingPurchaseCall`/가드 `inFlight` 어느 쪽에도 타임아웃이 없어 앱 재시작 전까지 모든 결제가 `PURCHASE_IN_PROGRESS`로 거부됨 |
| B4 | P2 | **`ITEM_ALREADY_OWNED` 자가치유 없음** — 티어 SKU가 가격대별 공유라 한 번 막히면 같은 가격대 기능 수십 개가 동시에 막힘. 복구는 다음 포그라운드 복귀까지 대기 |
| B5 | **P1(미확인)** | 운영 전제 미검증: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` / `GOOGLE_PLAY_RTDN_TOKEN` / `GOOGLE_PLAY_PACKAGE_NAME` 시크릿 주입 여부, Pub/Sub→RTDN 연결, `migrate:app-purchase-intent-indexes` 실행 여부 — **저장소만으로 확인 불가**. 미설정 시 verify가 503으로 전면 실패 |

### 3-C. 모바일 웹 UI/UX

| ID | 심각도 | 결함 | 근거 |
|---|---|---|---|
| W1 | P2 | **전역 `body{touch-action:pan-y}`가 핀치 줌을 차단** — `app/layout.js:144`가 `maximumScale:5`로 확대를 허용하려는 의도와 정면 충돌(WCAG 1.4.4). `pan-y pinch-zoom`으로 고치면 기존 효과는 유지 | `styles/globals.css:96`, `styles/core-ui.css:89` |
| W2 | P2 | **iOS 자동줌 방지 16px가 15px!important에 덮인다** — `cosmic-main.css:2123·2172`(특이도 1,2,1)가 셸의 16px(1,1,0)을 이김. 사주 입력 폼 전체. 6개 셸 미러 동일 | `styles/cosmic-main.css:2123,2172` |
| W3 | P2 | **44px 미만 터치 타깃 다수** — 앱바 이용권 CTA 34px, 허브 칩 38px, 하단 네비 칩 32px. 전역 규칙(`index.html:854`)은 `!important` 없는 요소 셀렉터라 클래스에 전부 밀림 | `index.html:5666,2538,2878` |
| W4 | P2 | **그 44px를 "통과"라고 보고한 검증 게이트가 substring 존재 검사에 불과** — `verify-mobile-runtime-readiness.mjs:59`가 `index.html`에 `"min-height:44px"` 문자열이 있는지만 본다. `MOBILE_FINAL_COMPLETION_AUDIT.md:32`의 완료 판정은 무효 | 동 파일 |
| W5 | P2 | 오버레이 lifecycle 가드가 미등록 모달(`#tarotModalOverlay` 등)을 감지 못해 **열린 모달의 스크롤락을 360ms 뒤 해제** | `js/mobile-interaction-patch.js:134-172` |
| W6 | P2 | **자미두수 12궁 요약표가 모바일에서 압착** — `overflow-x-auto` 래퍼 안의 `min-w-full`은 가로 스크롤을 만들지 못해 6열이 360px에서 각 40~55px | `AdvancedZiweiSectionV2.tsx:2306-2307` |
| W7 | P2 | **가로모드 사실상 미대응** — 루트 셸에 orientation 미디어쿼리 0건, 전체 로드 CSS 통틀어 1건 | `styles/fortune-ui.css:16148` |
| ~~W8~~ | ~~P2~~ | **해결(2026-09-06 실측)** — 셸은 `portone_redirect=1` 을 심기만 하고, 읽는 쪽은 셸이 defer 로 싣는 `js/destiny-profile.js` 의 `_dpResumeDirectPaymentAfterRedirect`(부팅 시 자동 실행)다. #1594 가 그 함수의 결함 4건(대기 mode·완료 문구·GRANT_PENDING·access 갱신)을 고쳤고, `verify:direct-confirm-pending-recovery` 가 셸 7벌의 defer 태그와 마커 짝(심는 쪽·읽는 쪽)을 진입점 가드로 고정한다. **후속(2026-09-06)**: confirm 성공 뒤 **기능을 다시 여는** 단계가 빠져 있어 "결제했는데 메인 화면"이 남아 있었다 — 결제 영수증(재과금 차단)·재개 서술자·`registerPaidResumeHandler` 공통 뼈대를 넣고 숙요 기본 궁합을 1호로 배선했다. **잔여**: 나머지 유료 기능의 재개 배선(`docs/handoff/paid-feature-resume-2026-09-06.md`). 실결제 복귀 1건은 미실측(`docs/handoff/kakaopay-golive-2026-08-31.md`) | `index.html:20680` · `js/destiny-profile.js:12432` |
| W9 | P2 | 수비학 타로 `.title`이 900px 이하에서 42px로 **고정**되어 clamp의 모바일 값(34px)보다 오히려 커짐 | `numerology-tarot.module.css:1408` |
| ~~W10~~ | ~~P2~~ | **해결(2026-09-06 실측)** — `useCoinGate.ts`·`billing-client.ts`·`PointsClient.tsx`·`lib/payment/**` 등 `app/`·`lib/` 의 결제 파일이 트리거 `paths` 에 개별 등재됐고, `verify:billing-pass-policy`·`verify:paid-gate-ui`·`verify:payment-freeze`·`verify:pass-tier-policy`·`verify:payment-reconcile` 은 `scripts/run-paid-gate-suite.mjs` 가 실행한다(미배선 검증기는 `verify:guard-wiring` 이 실패시킨다). **잔여**: 트리거가 디렉터리가 아니라 파일 단위 열거라 `app/`·`lib/` 아래 **새** 결제 파일은 등재 전까지 게이트를 깨우지 않는다 — 워크플로 머리주석이 대가를 명시한 의도된 절충(2026-08-08)이다 | `.github/workflows/paid-flow-gates.yml` · `scripts/run-paid-gate-suite.mjs` |

### 3-D. 빌드/릴리즈

| ID | 심각도 | 결함 |
|---|---|---|
| R1 | **P1** | **`npm run mobile:android:sync`는 `dist/`·`out/`을 먼저 삭제한 뒤** Windows에서 완주가 보장되지 않는 `next build`를 돌린다(`clean-cloudflare-build.mjs:31-40`). 릴리즈 직전에 무심코 실행하면 **이미 동기화된 산출물을 잃는다** |
| R2 | P2 | 현재 `assets/public`은 **HEAD보다 약 1시간 stale** — 최근 mobile-home 커밋 4건(별먼지/네오 로고/여백)이 반영돼 있지 않다. 기존 `app-release.apk`(versionCode 20)는 그보다 더 오래됨 |
| R3 | P2 | versionCode/Name이 **수동 파일 편집 단일 경로**, 자동 증가·중복 업로드 가드 없음(현재 20). 서명에는 fail-closed 가드가 있는데 버전에는 없음 |
| R4 | P2 | `build-mobile-app.mjs:245`가 정본이라 지목한 **`scripts/verify-app-remote-assets.mjs`가 존재하지 않는다** — CDN에서 자산이 사라지면 앱 번들에도 원본이 없어 런타임에 깨짐 |
| R5 | P2 | **안드로이드 빌드에 CI가 전혀 없다** — `verify:app-no-portone`(Play 정책 게이트) 포함 전 과정이 로컬 수동. 릴리즈 재현성이 PC 한 대에 묶여 있음 |

**빌드 환경은 준비 완료**: JDK 21.0.11 + `JAVA_HOME` 설정, SDK platforms `android-36/36.1`, build-tools 35/36.1/37, `sdk.dir` 유효, keystore 실재(`C:/Users/user/Documents/CodeDestinyKeys/upload-keystore.jks`), 서명 4키 구성됨. → **오늘 바로 릴리즈 APK 산출 가능.**

---

## 4. 반증된(=오탐) 주장 — 작업 대상 아님

시간 낭비를 막기 위해 기록한다. 초기 감사가 P0/P1로 올렸으나 반증 에이전트가 기각했다.

- ~~첫 진입 시 백버튼 무반응~~ → `app-native-bridge.js:498`이 이미 처리
- ~~스크롤락 3중 구현으로 상호 무력화~~ → `__cdForceUnlockBodyScroll` + leak-guard가 화해시킴(P3 정리 대상)
- ~~앱 refresh에 헤더 누락이 P0~~ → 헤더를 붙여도 쿠키가 없어 결과 동일. **진짜 원인은 A1**
- ~~상단 세이프에어리어 전역 미적용~~ → `app-native-bridge.js:54`가 `mobile-app`에서 `padding-top` 적용
- ~~confirm 5xx 시 자동복구 없음~~ → 웹훅 재검증 + 재조정 크론이 지급을 확정
- ~~저사양 안드로이드 스크립트 영구 미로딩(P0)~~ → 해당 스크립트들은 애초에 지연 대상
- ~~첫 페인트 3.4MB(P0)~~ → 실제 렌더블로킹 CSS는 17개가 아니라 6개
- ~~service-worker.js 방치~~ → 의도된 폐기(버전당 1회 해제)
- ~~앱 번들 셸 17벌 중복 33MB / daily JSON 16.5MB / fuctionassets 16.4MB 미참조~~ → 셸 중복은 정적 export의 정상 구조, fuctionassets는 URL 인코딩 미해독으로 인한 오탐(실제 미참조는 훨씬 적음)
- ~~OAuth 커스텀 스킴 재생 공격(P1)~~ → 공격 전제가 다른 곳에서 차단됨(P3)

**단, 앱 번들 실측치는 사실이다**: `assets/public` = **169.7MB / 2,051파일**(webp 59MB, html 48.8MB, js 19.5MB, json 19.1MB) → 기존 릴리즈 APK **98.6MB**. 낭비는 아니지만 다이어트 여지는 실재한다.

---

## 5. 결정이 필요한 사항 (Phase 2 진입 전)

1. **작업 범위**: 앱 우선인가, 웹 우선인가, 둘 다인가? (APK가 최종 산출물이므로 앱 우선을 권장)
2. **A4 카메라**: 관상 라이브 카메라를 앱에서 지원할 것인가? 지원 시 CAMERA 권한 + Play 데이터 세이프티 신고 갱신 필요. 미지원 시 앱에서 '라이브 카메라' 탭을 숨기고 파일 업로드만 노출
3. **A3 상태바**: `@capacitor/status-bar` 신규 설치 vs 기존 `CodeDestinyNavigationPlugin`에 `setStyle` 추가(셸 6미러 호출부 수정 필요)
4. **A8 앱링크**: HTTPS 앱링크를 붙일 것인가? (카톡 공유 유입 흡수. `assetlinks.json` 배포 + 릴리즈 키 SHA-256 등록 선행)
5. **B5 운영 전제**: Play Console 상품 17개 등록·서비스계정 시크릿·RTDN 연결·인덱스 마이그레이션이 실제로 끝나 있는가? (저장소로는 확인 불가)
6. **W2 폰트**: `cosmic-main.css`의 15px가 의도된 밀도 조정인가 잔재인가? 16px로 올리면 ≤640px 폼 높이가 늘어 '화면 길이 축소' 작업과 충돌
7. **W7 가로모드**: 지원 범위에 넣을 것인가?
8. **versionCode 20**이 이미 Play Console에 업로드된 값인가? (업로드됐다면 다음은 21 이상)
9. **산출물 문서**: 신규 4종 생성 vs 기존 유사 문서 갱신

---

## 6. Phase 9(APK) 실행 계획 초안

R1 함정을 피하는 순서:

```
1) dist/ 백업 (또는 assets/public 백업)  ← clean:build가 지우기 때문
2) npm run build:mobile:app              ← next build 완주 여부를 여기서 실측
   실패 시: 백업 복원 후 gradle만 실행(기존 assets/public 사용)
3) cd apps/mobile && npx cap sync android
4) release-signing.properties의 VERSION_CODE 21 / VERSION_NAME 1.0.21로 상향
5) powershell -File .\scripts\android-release-check.ps1 -RequireSigning
6) cd apps\mobile\android && .\gradlew.bat assembleRelease
7) 산출물 → %USERPROFILE%\Desktop\CodeDestiny-v1.0.21-release.apk 복사
```

---

## 7. 테스트 전수 조사 (2026-07-22 추가) — "죽은 가드" 문제의 전모

Phase 2 중 로그인 보안 테스트 8건이 죽어 있던 것을 발견해, 전체 테스트를 전수 조사했다.

### 규모

| | 조사 전 | 조사 후 |
|---|---|---|
| 실행되는 테스트 파일 | 54개 중 **8개** | **54개 전부** |
| 실패 스위트 | 16 | 0 |
| 통과 테스트 | 338 | **384** (jest 360 + node:test 24) |
| `npm test` | **없음** | 추가 (26초) |
| CI가 도는 테스트 | 손으로 지목한 6개 | 전체 |

**앱 문제가 아니라 웹 서비스 문제였다.** 죽어 있던 스위트 대부분이 웹 경로다 — 로그인 열거·무차별 대입 방어, 리프레시 토큰 재사용 탐지, 구독 자동갱신 동시성, 찻집 정산, 네오 결제 플로우.

### 썩은 원인 세 갈래

1. **ESM 목의 export 누락** — `jest.unstable_mockModule` 은 명명 export가 정적으로 맞아야 로드된다. `worker/lib/db.js` 에 `isTransientMongoError` 가, `models.js` 에 `RECENT_CONSUME_REQUEST_ID_CAP` 가 추가되자 **이름 하나 때문에 스위트가 통째로 로드 실패**했다. 실패가 한 건씩 늘지 않고 스위트가 사라지는데 겉보기엔 빨간 줄 몇 개라 아무도 눈치채지 못했다.
2. **옛 계약에 멈춘 단언** — 코드가 의도적으로 바뀐 자리에 테스트가 남아 있었다(아래 참조).
3. **러너가 섞임** — `node:test` 로 쓰인 7개 파일을 jest 가 수집해 "must contain at least one test" 로 실패시켰다. 정작 그 7개는 어떤 러너도 돌리지 않았다.

### 되살린 뒤 확인한 것: 코드는 멀쩡했고 검증만 죽어 있었다

| 스위트 | 되살린 결과 |
|---|---|
| 로그인 열거·무차별 대입 | 8/8 통과 — 가드 정상 |
| 리프레시 재사용 탐지 | 3/3 통과 — 정상 |
| 구독 자동갱신 동시성 · 네오 결제 · 찻집 정산 | 14/14 통과 — 정상 |

**단 하나의 실제 결함**: `setGender` 가 지연로딩 등록 두 곳 모두에 빠져 있어, 사주 코어(2.1MB) 도착 전 첫 성별 탭이 버려졌다(커밋 `50379597`). 이 결함을 지키던 테스트는 **존재했지만 러너가 없어 한 번도 실행되지 않았다** — 죽은 가드가 실제로 결함을 통과시킨 유일한 사례.

### 계약이 바뀐 자리(테스트가 낡은 것 — 결함 아님)

- **인프라 오류를 401로 강등하지 않는다**: `requireUserFromRequest` 가 `surfaceDbInfraError:true` 를 넘긴다. 401 강등이 "로그인했는데 로그인 필요" 증상의 원인이었다. 유료 라우트는 `resolvePaidRouteAuth` 가 503 retryable 로 옮긴다.
- **구독 상태는 503 이 아니라 200 + `degraded:true`**: 503 이면 클라이언트가 `!response.ok` 에서 끊겨 본문을 못 읽는다. `auth-store.ts:398` 과 `destiny-profile.js:3936` 양쪽이 `degraded` 를 보고 이전 값을 유지함을 확인했다 — **이용권 보유자가 free 로 확정되지 않는다.**
- `unlock.animal_destiny` 별칭 제거(참조 0건), 탭 라벨의 i18n 이동, `alert()` → 인라인 폼 상태.

### 남은 항목 (판단 필요)

- ~~`__tests__/api/auth/withdraw.test.js` (538줄)~~ — **해결.** 워커 `handleWithdraw` 가 같은 계약(429·401·403 CSRF·400·409·비식별화·Payment 익명화·감사로그 emailHash)을 그대로 들고 있어 삭제 대신 `__tests__/worker/auth.withdraw.test.js` 로 이식했다(20건). 이식 과정에서 **탈퇴 계정은 재탈퇴 요청 이전에 인증 자체가 성립하지 않는다**는 더 강한 계약을 확인해 함께 못박았고, 핸들러의 409/404 는 경합 방어 분기로 별도 검사한다.
- **`verify:public-parity` 실패** — 커밋 `e1cddf44`(타로 탭 수정, 동시 세션)가 루트 `js/mobile-interaction-patch.js` 만 고치고 `public/` 미러를 빠뜨렸다. **그 수정이 프로덕션 셸에 반영되지 않는다.** 해당 세션 소유라 건드리지 않았다.
