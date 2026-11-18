<!-- 보관: 2026-11-18 사용자 제공 마스터 프롬프트(01 Android 출시 마무리) 원문. 출처 C:\Users\user\Downloads\01_android_release_hardening.md.
실행 순서: 01 → 02 → 03(01·02의 Phase 0과 브리지 계약 v1 확정 뒤).
저장소 규칙이 우선한다: 브랜치·PR 대신 main 직접(CLAUDE.md 절대 규칙 3), 앱가=웹가(worker/lib/app-store-pricing.js), Capacitor 셸·Bearer 세션. 진단 결과는 docs/app-audit/2026-11-18-android-release-phase0.md. -->

# Code Destiny Android 앱 — 출시 마무리 (결제 · 로그인 · 성능)

## 0. 역할

너는 아래 네 명의 시니어 전문가로 이루어진 팀으로 일한다. 결정을 내릴 때마다 어느 전문가의 관점에서 판단했는지 한 줄로 밝혀라.

1. **Android 플랫폼 엔지니어**: WebView 하이브리드 앱, Android 16(API 36) 동작 변경, edge-to-edge, predictive back을 다룬다.
2. **Google Play 결제·서버 검증 엔지니어**: Play Billing Library 8/9, Play Developer API, RTDN(실시간 개발자 알림)을 다룬다.
3. **인증·보안 엔지니어**: OAuth 2.0 + PKCE, App Links, 세션 쿠키 주입, JS 브리지 보안을 다룬다.
4. **모바일 성능·릴리스 엔지니어**: 콜드 스타트, Web Vitals, Play Vitals, 단계적 출시를 다룬다.

목표는 **결제와 로그인이 어떤 상황에서도 깨지지 않고, 빠르고, 심사를 한 번에 통과하는 프로덕션 빌드**다.

---

## 1. 프로젝트 컨텍스트

- 서비스: code-destiny.com. 한국어 운세 플랫폼이며 사주, 타로, 자미두수, 서양 점성술, 숙요점, 베다(낙샤트라) 6개 엔진을 제공한다.
- 스택: Next.js 15 + Cloudflare Pages/Workers, MongoDB Atlas M10이다. 스테이징 환경은 `codedestiny-staging`이다.
- Android: 하이브리드 WebView 앱이며 패키지명은 `com.codedestiny.app`이다.
- 결제는 두 갈래로 나뉜다.
  - 앱: Google Play Billing을 쓴다.
  - 웹: PortOne/Inicis를 쓴다.
  - 앱 가격은 `pricing.app.ts`로 관리하며 웹보다 20–30% 높다.
- 로그인: 앱의 Google OAuth는 Custom Tabs만 사용한다.
- 과거 이슈 이력이다. 회귀했는지 반드시 확인하라.
  - 메인 화면 이중 로드. 서비스 워커의 `controllerchange` 패턴이 원인으로 의심된다.
  - FOUC, safe-area 인셋 문제.
  - `@JavascriptInterface` 메서드에 대한 R8/ProGuard keep 규칙.
  - PG 결제창 실패, 503 응답을 미인증으로 오인한 강제 로그아웃, 결제는 됐는데 기능이 해금되지 않던 문제. 이 문제들은 D1 분산락, 멱등 orderId, 버튼 상태머신으로 해결했다.
  - 이용권이 없는 사용자가 결제 플로우에서 차단되던 게이트 버그.

### 1-1. 2026-11-18 기준 스토어 요건 (작업 시작 시 공식 문서로 재확인하고, 다르면 보고하라)

| 요건 | 내용 |
|---|---|
| Target API | 신규 앱과 업데이트는 **Android 16(API 36)** 이상을 타깃해야 한다. 2026-08-31부터 시행됐고 연장 기한(11-01)도 끝났다. |
| Play Billing Library | **8.0.0 이상 필수**이며 7.x 이하는 업로드가 거부된다. 최신 버전은 9.1.0이다. 9.x 채택 여부를 검토하라. |
| 16KB 페이지 크기 | 네이티브 `.so`가 포함되어 있다면 16KB 정렬이 필수다. |
| AI 생성 콘텐츠 정책 | LLM 운세 결과에 대해 **앱 안에서 신고·플래그하는 기능**이 있어야 한다. |
| 사용자 데이터 정책 | 서드파티 AI(LLM)에 생년월일시 등을 전송하는 것은 사용자 데이터 처리에 해당한다. 데이터 보안 양식에 공개해야 한다. |
| 계정 삭제 | **앱 안 경로**와 **웹 URL**을 모두 제공해야 한다. |
| 비공개 테스트 | 2023-11-13 이후에 만든 개인 개발자 계정이라면 프로덕션 출시 전에 테스터 12명 이상으로 14일 연속 비공개 테스트를 해야 한다. 계정 유형을 확인하라. |
| 수수료 | 연 매출 첫 100만 달러까지 15%가 적용된다. 등록 상태를 확인하라. |

---

## 2. 절대 불변 규칙 (위반하면 즉시 중단하고 보고)

1. `sajuAdapter.ts`의 `calculateLocalResult()`는 변경 금지다.
2. KASI prefetch에 timezone을 주입하지 않는다. `normalizeSaju.ts`에 timezone 필드를 추가하지 않는다.
3. 6개 운세 엔진 코드베이스는 읽기 전용이다. 접근은 어댑터 래퍼로만 한다.
4. **PortOne/Inicis 결제 실행 파일과 결제 관련 서버 로직을 변경하려면 별도의 승인 게이트를 거친다.** 구현 전에 diff 계획을 보여주고 명시적 승인을 받아라.
5. 960px 데스크톱 레이아웃을 유지한다. 앱 전용 스타일은 앱 컨텍스트 셀렉터로 격리한다.
6. 사용자에게 보이는 모든 문자열은 i18n 키를 사용한다.
7. Android에서 Google OAuth는 **Custom Tabs로만** 처리한다. WebView 안에서 OAuth를 진행하는 것은 금지다.
8. 폐기 코드는 `_graveyard/` 격리 패턴을 따른다.
9. 결제 데이터 포맷, KV/R2 스키마, 사용자 자산 포맷은 **forward-fix만** 허용한다. 롤백형 마이그레이션은 금지다.
10. **파일 경로를 추측하지 않는다.** 실제로 탐색해서 확인한 경로만 `파일:라인` 형식으로 인용하라.

## 3. 작업 방식

- 순서: **진단(읽기 전용) → 구조화된 보고서 → 명시적 승인 → 구현 → 검증**. 각 Phase가 끝날 때마다 멈추고 승인을 기다린다.
- 브랜치: `feat/android-release-hardening`. 하위 작업은 `feat/android-*`를 쓴다.
- 커밋: Conventional Commits 형식이다. 예: `fix(billing): acknowledge purchase only after server grant`
- 변경은 외과적 최소 수정으로 한다. 리팩터링 욕심은 보고서의 "제안"란에만 적는다.
- 위험도 표기: **P0**(출시 차단) / **P1**(매출·로그인 영향) / **P2**(UX·성능) / **P3**(개선)

---

## Phase 0 — 진단 (읽기 전용, 코드 수정 금지)

아래 항목을 모두 점검하고 **항목 | 현재 상태 | 근거(파일:라인) | 위험도 | 제안 | 검증 방법** 표로 보고하라.

### A. 빌드 구성
- compileSdk, targetSdk, minSdk와 AGP, Gradle, Kotlin 버전
- R8 full mode 여부, `@JavascriptInterface` keep 규칙, 난독화 후 브리지가 작동하는지
- 서명: Play App Signing, 업로드 키 보관 위치(저장소에 커밋되어 있지 않은지), versionCode/versionName 전략
- AAB 빌드 여부, `.so` 포함 여부와 16KB 정렬(`zipalign -P 16`, `check_elf_alignment`)

### B. WebView 셸
- WebSettings: JS, DOM storage, mixed content 차단, file/content access 최소화, Safe Browsing
- URL 라우팅 (`shouldOverrideUrlLoading`)
  - 내부 도메인(prod/staging)은 WebView에서 연다.
  - 외부 링크는 Custom Tabs로 연다.
  - `intent://`, `market://`, `tel:`, `mailto:`, 카카오톡 스킴을 처리한다.
- WebChromeClient: 파일 선택기, `window.open`·`target=_blank` 처리
- `onRenderProcessGone`을 처리해서 렌더러가 죽어도 앱 크래시 대신 복구되는지
- **뒤로가기**: API 36에서는 predictive back이 기본이고 `onBackPressed`가 호출되지 않는다. `OnBackPressedCallback`으로 다음을 처리해야 한다.
  - WebView history가 있으면 뒤로 간다.
  - 웹 모달이 열려 있으면 닫는다.
  - 홈에서는 종료를 확인한다.
- **edge-to-edge**: API 36에서는 opt-out이 불가능하다. 시스템 바와 디스플레이 컷아웃 인셋을 CSS 변수로 웹에 전달하는지 확인하라. IME(키보드) 인셋 처리도 확인하라.
- 다크 모드, 시스템 폰트 배율(`textZoom`)이 레이아웃을 깨뜨리지 않는지
- CookieManager: 세션 쿠키 영속화, `flush()` 타이밍
- User-Agent에 앱 식별 토큰과 버전이 붙는지. 웹이 플랫폼을 판별하는 근거가 된다.

### C. JS 브리지
- 노출된 메서드 전체 목록과 각 메서드의 호출 출처 검증. 허용 origin이 아닌 페이지에서는 호출을 거부해야 한다.
- 메인 스레드 블로킹 여부, 비동기 콜백 계약(Promise 래핑, 타임아웃, 에러 코드)
- 브리지 버전 핸드셰이크. 웹이 구버전 앱을 감지해서 기능을 축소하거나 업데이트를 유도할 수 있어야 한다.
- 이 브리지 계약은 iOS 이식의 기준이 된다. **현재 계약을 문서화**해서 `docs/native-bridge-contract.md` 초안을 작성하라. 경로는 저장소 구조를 확인한 뒤 제안하라.

### D. 결제 (Google Play Billing)
- PBL 버전. 8 미만이면 **P0**다.
- BillingClient 생명주기: 연결 유지, `SERVICE_DISCONNECTED` 재연결과 백오프, `enablePendingPurchases(PendingPurchasesParams)`
- 상품 조회는 `queryProductDetailsAsync`로 하고, **가격 표시는 `formattedPrice`를 사용**하는지. 하드코딩 가격은 금지다. `pricing.app.ts`와 Play Console 상품이 일치하는지도 확인하라.
- 상품 유형 매핑
  - 소모성: 이용권, 크레딧
  - 비소모성: 타로 영구 해금
  - 구독: 있는 경우
- `setObfuscatedAccountId`로 구매와 사용자 계정을 연결하는지
- **처리 순서 검증** (클라이언트는 절대 스스로 권한을 지급하지 않는다)
  1. 구매 결과를 받는다.
  2. 서버(Worker)가 Play Developer API로 purchaseToken을 검증한다.
  3. DB에 권한을 지급한다(멱등).
  4. 서버 또는 클라이언트가 acknowledge하거나 consume한다.
  5. UI 해금은 그다음이다.
- **3일 안에 acknowledge하지 않으면 자동 환불**된다. 미승인 구매가 생길 수 있는 경로를 전부 찾아라.
- `PENDING` 구매 처리. 결제 대기 상태를 사용자에게 안내해야 한다.
- 앱 시작과 resume 시 `queryPurchasesAsync`로 미처리 구매를 복구하는지
- **RTDN**: Pub/Sub push가 Worker 엔드포인트로 오는지, 엔드포인트가 OIDC 토큰을 검증하는지
- 환불·취소: `voidedpurchases` 또는 RTDN을 받아 권한을 회수하는지
- 기존 멱등 orderId와 D1 분산락이 **purchaseToken 기준 멱등성**과 어떻게 통합되는지. 중복 지급과 미지급이 모두 불가능함을 증명하라.
- **앱 컨텍스트에서 PortOne/Inicis 결제 UI, 링크, 문구가 하나도 노출되지 않는지** 확인하라. 정책 위반이다.

### E. 로그인과 세션
- 전체 흐름: Custom Tabs → (state + PKCE) → App Links(`assetlinks.json`, `autoVerify`)로 복귀 → 1회용 코드를 서버에서 교환 → WebView CookieManager에 세션 쿠키 주입 → 페이지 로드
- Custom Tabs를 지원하는 브라우저가 없는 기기에서의 폴백
- 카카오, 네이버 등 다른 소셜 로그인이 있는지 확인하고, 있다면 앱에서 어떻게 처리하는지
- 503이나 네트워크 오류를 미인증으로 오인하는 강제 로그아웃이 회귀하지 않았는지
- 로그아웃할 때 쿠키, localStorage, 브리지 캐시를 정리하는지
- 계정 삭제 경로(앱 안 + 웹 URL)

### F. 성능
- 콜드 스타트 구간 측정: `Application.onCreate` → 첫 프레임 → WebView 첫 의미 있는 페인트
- SplashScreen API를 쓰는지, 스플래시와 웹 첫 화면 배경이 이어지는지
- 서비스 워커 이중 로드가 재현되는지, 앱 컨텍스트에서 SW 전략을 어떻게 가져갈지
- 앱 UA 기준 LCP, INP, CLS. JS 번들 크기와 코드 스플리팅 상태
- 무거운 SVG(운명의 섬 아이소메트릭 맵 등)의 렌더링 비용과 메모리
- 메인 스레드 I/O로 인한 ANR 위험, StrictMode 위반
- 오프라인 화면, 타임아웃 화면, 서버 오류 화면이 있는지

### G. 정책과 스토어
- 데이터 보안 양식과 실제 수집 데이터가 일치하는지 대조하라. 대상은 생년월일시, 출생지, 이메일, AI 처리, 결제 정보다.
- AI 결과 신고 기능, 개인정보처리방침 URL, 콘텐츠 등급, 스토어 등록정보(스크린샷, 설명, 카테고리)

### H. 관측
- Crashlytics 또는 Sentry 연동, 결제 퍼널 이벤트(상품 조회 → 시트 표시 → 구매 → 검증 → 지급)
- Play Vitals 임계값: 사용자 인지 비정상 종료율 1.09%, ANR 0.47%. 이 기준 아래로 유지할 수 있는 구조인지 평가하라.

**산출물**: 진단 표 + P0~P3 우선순위 구현 계획 + 항목별 검증 방법. → **여기서 멈추고 승인을 기다린다.**

---

## Phase 1 — P0 출시 차단 해소 (승인 후)

- targetSdk 36으로 올리고 동작 변경에 대응한다. 대상은 edge-to-edge, predictive back, 인텐트와 권한 변경이다.
- PBL 8 이상(가능하면 9.x)으로 마이그레이션한다. 제거된 API(`querySkuDetailsAsync`, 인자 없는 `enablePendingPurchases()` 등)를 교체한다.
- 16KB 정렬, keep 규칙, 서명 문제를 정리한다.
- 각 변경마다 **실기기 검증 결과**(기종, OS 버전, 결과)를 첨부한다.

## Phase 2 — 결제 하드닝 (⚠️ 별도 승인 게이트)

- 결제 상태머신을 명시한다: `IDLE → LAUNCHING → PURCHASED | PENDING | CANCELED | ERROR → VERIFYING → GRANTED → FINALIZED(ack/consume)`. 모든 상태는 앱이 종료돼도 재개 가능해야 한다.
- 서버가 단일 진실 원천이다. 클라이언트에는 `GRANTED`를 받은 뒤에만 해금 이벤트를 보낸다.
- 멱등 키는 `purchaseToken`이다. 기존 orderId 체계와 매핑 테이블을 설계하고, 스키마는 forward-fix 방식으로 바꾼다.
- RTDN Worker 엔드포인트: 먼저 2xx로 즉시 응답하고 처리는 큐로 넘긴다. 과거 웹훅 장애의 교훈이다. 기존 MongoDB 비동기 큐가 있으면 재사용하라.
- 환불과 취소가 들어오면 권한을 회수한다. 정책(이미 소비한 콘텐츠를 어떻게 처리할지)은 보고서에 제안만 하고 결정은 나에게 맡긴다.
- 사용자 문구: 결제 대기, 실패, 재시도, 복구 안내를 i18n 키로 작성한다. 막다른 화면이 없어야 한다.

## Phase 3 — 로그인과 세션 안정화

- Custom Tabs ↔ App Links 왕복을 검증한다. 대상은 콜드 스타트 상태, 백그라운드 상태, 앱이 종료된 상태에서의 복귀다.
- 쿠키 주입이 끝나기 전에 페이지가 로드되는 레이스 컨디션을 제거한다.
- 세션 만료, 401, 503을 구분해서 처리한다. 401만 재로그인으로 유도한다.
- (제안만 할 것) Credential Manager 기반 네이티브 Google 로그인을 쓸 때의 UX 이점과, 불변 규칙 7과의 관계를 분석해서 보고하라.

## Phase 4 — 성능 최적화

**목표치** (중급 기기인 갤럭시 A 시리즈급 기준, 측정 방법도 함께 보고)

| 지표 | 목표 |
|---|---|
| 콜드 스타트 → 첫 의미 있는 화면 | ≤ 2.0초 |
| 웜 스타트·재방문 | ≤ 1.2초 |
| INP | ≤ 200ms |
| CLS | ≤ 0.1 |
| 결제 시트 표시 | 탭 후 ≤ 1초 |
| Crash-free 사용자 비율 | ≥ 99.5% |

적용을 검토할 기법이다. 효과를 측정한 것만 채택한다.
- `Application`에서 WebView 사전 워밍, 첫 URL preconnect
- SplashScreen API의 유지 조건을 웹 첫 페인트 신호(브리지 이벤트)와 연동해서 흰 화면을 없앤다.
- 앱 컨텍스트 서비스 워커 정책을 정리해서 이중 로드를 근절한다.
- 정적 자산은 장기 캐시(immutable)로, HTML은 짧은 캐시로 분리한다.
- 앱 UA 대상 번들 다이어트: 엔진별 동적 import, 폰트 서브셋, 이미지 AVIF/WebP
- 네이티브 셸에 Baseline Profile 적용, R8 full mode 적용
- 무거운 SVG는 레이어 단순화, `will-change` 남용 제거, 화면 밖 요소 지연 렌더

## Phase 5 — 릴리스

- 테스트 매트릭스: Android 10~16, 저사양·중급·고급 기기, 폴더블 1종, 다크 모드, 폰트 200%
- 결제 테스트: 라이선스 테스터, Play Billing Lab, 테스트 카드(항상 승인, 항상 거절, 지연 결제), 네트워크 단절 중 구매, 구매 직후 앱 강제 종료
- 내부 테스트 → 비공개 테스트(요건 해당 시 12명·14일) → 프로덕션 단계적 출시(10% → 50% → 100%). 단계마다 Vitals와 결제 퍼널을 확인한다.
- 사전 출시 보고서(Pre-launch report) 결과를 검토하고 대응한다.

---

## 완료 기준 (Definition of Done)

- [ ] targetSdk 36, PBL 8 이상, 16KB 정렬, AAB 서명 빌드가 Play Console 업로드 검증을 통과한다.
- [ ] 결제: 정상, 취소, 실패, 대기, 강제 종료, 네트워크 단절, 환불의 7개 시나리오에서 중복 지급 0건, 미지급 0건, 미승인 0건을 로그로 증명한다.
- [ ] 앱 안에서 PortOne/Inicis 노출 0건, 가격은 전부 Play `formattedPrice`를 사용한다.
- [ ] 로그인: 콜드, 백그라운드, 종료 상태 복귀가 모두 성공한다. 503 오인 로그아웃 0건.
- [ ] 뒤로가기(predictive back 포함)가 WebView 히스토리와 웹 모달을 정확히 처리한다.
- [ ] 성능 목표치를 달성했거나, 미달 항목에 원인과 다음 조치를 적었다.
- [ ] 데이터 보안 양식, AI 신고 기능, 계정 삭제(앱 + 웹)가 준비됐다.
- [ ] 불변 규칙 위반 0건.

## 보고 형식 (Phase마다)

1. 요약 (3줄)
2. 변경 파일 목록 (`파일:라인`, 변경 이유)
3. 검증 결과 (기기, OS, 시나리오, 결과, 로그 발췌)
4. 남은 위험과 다음 Phase 제안
5. 승인 요청 사항
