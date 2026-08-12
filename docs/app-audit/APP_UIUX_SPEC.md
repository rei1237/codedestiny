# APP_UIUX_SPEC — 앱(Android WebView) 전용 UI/UX 스펙

> Phase 1 산출물 · 2026-08-12 · **문서만, 코드 0줄**
> 근거: [DIAGNOSIS_REPORT.md](DIAGNOSIS_REPORT.md) (Phase 0 정적 진단)
> 이 문서는 "웹 모바일과 앱이 무엇을 어떻게 다르게 하는가"를 확정한다. Phase 2 구현은 여기 적힌 것만 만든다.

---

## 0. 확정된 결정 (사용자 승인)

| # | 결정 | 근거 |
|---|---|---|
| D1 | **앱 탭바 정본 = 정적 셸 네비**(`app/_lib/mobile-tabs.ts` `MOBILE_TABS`). React `AppTabBar`는 이 정본으로 교체한다 | React `AppShell`은 `/app`·`/app/store` 2개 페이지만 덮고, 그 탭 5개 중 **4개가 셸을 벗어나 탭바가 사라진다**. 셸 네비는 이미 대부분 화면을 덮고 동기화 가드(`verify:mobile-bottom-nav-sync`)까지 있다 |
| D2 | **'보관함' 탭·화면은 만들지 않는다** | 레포에 통합 보관함 라우트가 없다. 신규 화면 제작은 "있는 것을 앱에서 완성시키는" 이번 범위 밖 |
| D3 | 진단 P0 5건은 Phase 2 이전에 선행 수정 | [PR #514](https://github.com/rei1237/codedestiny/pull/514) — 완료 |

---

## 1. 프롬프트 ↔ 실물 재매핑 (스펙 전제)

작업 프롬프트가 전제한 구조 중 이 레포에 없는 것이 많다. Phase 2는 **오른쪽 열 기준**으로 만든다.

| 프롬프트 전제 | 실물 | 스펙에서의 처리 |
|---|---|---|
| React SPA + `AppShell`로 전 화면 감싸기 | **다중 페이지 정적 export**. 홈·6엔진 중 5개가 바닐라 셸(`index.html`) 모달. React `/app/*`는 2페이지 | 셸(바닐라)을 1급으로 두고 React는 그에 맞춘다 (§3) |
| `components/app-shell/` 신설 | `app/app/_components/AppShell.tsx`·`AppTabBar.tsx` 기존재 | 신설하지 않고 기존을 개편 |
| `styles/app.css` 신설 | `styles/app-shell.css` 기존재 (`--cd-app-*` 토큰 완비) | 신설하지 않고 기존을 확장 (§6) |
| `lib/platform/appContext.ts` 단독 정본 | 판별식이 **6그룹**으로 분산, 그중 절반이 바닐라 | 바닐라 정본 + TS 래퍼 2층 (§2) |
| 최소 Android 9 | **minSdk 24 (Android 7.0)**, target 36 | 7.0 기준으로 CSS/JS 하한 판단 |
| 하단 탭 5개(홈/오늘의운세/나침반/보관함/마이) | 셸 5탭(홈/사주/모든운세/이용권/마이) | D1·D2에 따라 셸 5탭 유지, 앱만 '이용권' 목적지 분기 (§5) |
| 화면 전환 slide-in-right | 문서 간 이동은 **풀 페이지 로드** — JS로 슬라이드 불가 | 크로스도큐먼트 View Transition으로 대체 (§7) |

---

## 2. 아키텍처 원칙 — 판별 단일 진실 원천

### 2-1. 왜 2층인가

프롬프트는 `lib/platform/appContext.ts` 하나를 정본으로 제시하지만, 앱 화면의 다수(홈·타로·사주·숙요·자미두수·점성술 모달)는 **TS를 통과하지 않는 바닐라 셸**이다. TS 모듈 하나로는 그쪽을 덮지 못해 판별식이 다시 갈라진다. 따라서:

```
scripts/app-native-bridge.js   (이미 모든 앱 HTML <head>에 주입 — 가장 먼저 실행)
        │  __CODE_DESTINY_RUNTIME_TARGET / <html data-runtime-target> 를 심는다
        ▼
js/core/app-context.js         ← 🟢 판별 정본 (바닐라, window.__cdAppContext 노출)
        │
        ├── 바닐라 소비자: checkout-entry.js · destiny-profile.js ·
        │                  index-inline-runtime.js · pwa-install-prompt.js · PhysiognomyUI.js
        │
        └── lib/platform/appContext.ts   ← 얇은 TS 래퍼 (window.__cdAppContext 판독 + SSR 기본값)
                 └── TS 소비자: billing-client.ts · auth-client.ts · api-config.ts
```

### 2-2. 판정식 (확정)

```
isApp = __CODE_DESTINY_RUNTIME_TARGET === 'mobile-app'
     || document.documentElement.dataset.runtimeTarget === 'mobile-app'
     || Capacitor.isNativePlatform() === true
```

- 🔴 **`!!window.Capacitor` 단독 폴백은 금지**한다 — 현재 바닐라 4벌이 쓰는 이 폴백은 웹에서 Capacitor JS가 로드되기만 해도 true가 된다.
- 🔴 **주입 스크립트 실행 여부 단독 의존도 금지**한다 — `shouldUseAppStoreEntry()`가 현재 `__cdAppPaymentGuard.installed`만 보는데, 주입이 어긋나면 앱인데도 false가 되어 `/points`(앱 번들에 없음)로 간다.
- 빌드 상수 `NEXT_PUBLIC_RUNTIME_TARGET`은 **SSR/빌드 시점 폴백 전용**이다(런타임에는 위 3개가 우선).

### 2-3. 노출 값

| 필드 | 내용 | 출처 |
|---|---|---|
| `isApp` | 위 판정식 | 런타임 |
| `appVersion` | 앱 버전 문자열 (없으면 `null`) | 브릿지가 네이티브에서 주입 |
| `insets` | `{ top, right, bottom, left }` — `env(safe-area-inset-*)` 실측값(px) | CSS 계산값 판독 |
| `capabilities` | `{ haptic, billing, lockScreen }` | 브릿지 설치 여부 + 플러그인 존재로 판정 |

### 2-4. 교체 규칙

- 기존 판별식은 **삭제가 아니라 위임으로 교체**한다(`return appContext.isApp`). 호출부 시그니처는 그대로 둬 회귀면을 줄인다.
- 죽은 브릿지 탐지 코드(`lib/navigation/backHandler.ts:99-121`, `js/mobile-backstack-navigation.js:346-375`의 `window.Android`·`webkit.messageHandlers`·`ReactNativeWebView`)는 **이번에 삭제하지 않고 보고만** 한다(CLAUDE.md 3항 — 무관한 데드코드).
- 🔴 **회귀 위험**: `isApp` 판정이 넓어지면 **결제 경로 분기**(`checkout-entry.js` → `/app/store` vs `/points`)가 함께 바뀐다. Phase 2에서 이 파일을 건드릴 때 `verify:checkout-pass-card`·`verify:billing-pass-policy`·`verify:paid-gate-ui`를 반드시 먼저 돌린다.

---

## 3. 셸 우선 원칙 (기존 컴포넌트 오염 금지)

- 기능 컴포넌트에 `if (isApp)` 분기를 심지 않는다. 차이는 **셸 레이어**(주입 스크립트 CSS + `data-runtime-target` 속성 선택자)에서 만든다.
- 앱 전용 CSS는 전부 `html[data-runtime-target="mobile-app"]` 스코프 안에 둔다. 이 선택자 밖으로 나가면 웹 모바일이 함께 바뀐다.
- 🔴 **CLAUDE.md "모바일 최적화 = 인체공학만" 규칙이 그대로 적용된다.** 앱 셸 레이어가 건드려도 되는 것은 **탭 타깃·safe-area·오버플로·스크롤·키보드·모션**까지다. 기능이 소유한 **색·타이포·배경·테두리**를 덮지 않는다.
- 웹 모바일 코드 경로는 그대로 둔다 — 회귀 0이 목표. (예외: 진단에서 웹에도 동일한 버그로 확인된 건은 공통 수정하고 PR에 명시한다. PR #514의 테마 토글 위치가 그 사례)

---

## 4. 웹 모바일 ↔ 앱 차별화 (확정표)

| # | 항목 | 웹 모바일 (현행 유지) | 앱 | 상태 |
|---|---|---|---|---|
| 1 | 주 내비게이션 | 셸 하단 네비 5탭 | **같은 5탭**, '이용권'만 `/app/store`로 분기 | 신규 (§5) |
| 2 | 헤더 | 슬림 헤더(`#cdMobileHeader`) | 동일 + safe-area top 보정 | 기존 유지 |
| 3 | 푸터 | SEO 링크트리 노출 | **숨김** (`display:none`, 마크업은 유지) | 신규 |
| 4 | 뒤로가기 | 브라우저 제스처 | 하드웨어 백 계약 (§7) | PR #514에서 1차 완료 |
| 5 | 화면 전환 | 즉시 교체 | 크로스도큐먼트 View Transition (§7-2) | 신규 |
| 6 | 스크롤 | 기본 | `overscroll-behavior:none`(셸 루트) | 부분 존재(`cd-app-html`) |
| 7 | 롱프레스 | 기본 컨텍스트 메뉴 | 억제. **단 결과 텍스트 영역은 복사 허용** | 신규 |
| 8 | 로딩 | 스피너 | 기존 스켈레톤 유지(신규 로더 제작 안 함) | 범위 밖 |
| 9 | 촉각 | 없음 | 햅틱 (§8 — **승인 필요**) | 미결 |
| 10 | 오프라인 | 브라우저 기본 오류 | 전용 화면(연이 톤) | 신규 |
| 11 | 안전영역 | 불필요 | `env(safe-area-inset-*)` 전면 | 부분 존재 |
| 12 | PWA 설치 유도 | 노출 | **완전 숨김** | 1곳 누락(`js/luck-sync-diary.js`) |
| 13 | 외부 링크 | 새 탭 | 커스텀탭 위임 | 기존 완료(네이티브) |
| 14 | 쿠키 동의 배너 | 노출 | **숨김** | 신규 |
| 15 | 스플래시 연속성 | 없음 | 스플래시색 = 첫 페인트색 | 불일치 2건 (§9) |

---

## 5. 탭바 스펙 (D1 확정안)

### 5-1. 구성 — 셸 정본 5탭 유지

| 순서 | key | 라벨 | 웹 목적지 | **앱 목적지** |
|---|---|---|---|---|
| 1 | `home` | 홈 | `/` | 동일 |
| 2 | `saju` | 사주 | `/?action=cdSajuTabEntry` | 동일 |
| 3 | `fortunes` | 모든 운세 | `/?action=cdOpenAllFortunes` | 동일 |
| 4 | `pass` | 이용권 | `/points` | **`/app/store/`** |
| 5 | `my` | 마이 | `/?action=dpOpenList` | 동일 |

- 4번 분기는 **탭 정의를 고치지 않고** 클릭 시 `appContext.isApp`으로 목적지를 바꾼다. `MOBILE_TABS`의 `href`를 바꾸면 `verify:mobile-bottom-nav-sync`가 셸 6벌 미러와 함께 깨진다.
- 현재도 `app-payment-guard.js`가 `/points` → `/app/store/`로 리다이렉트해 **동작은 한다**. 이 스펙의 목적은 리다이렉트 이전에 올바른 목적지로 보내 한 번 튕기는 것을 없애는 것.

### 5-2. React `AppTabBar` 교체

- 현행 5탭(홈/운세/찻집/전략실/마이)을 **폐기**하고 `MOBILE_TABS`를 렌더한다.
- `/app`·`/app/store`에서도 셸 네비와 **같은 탭·같은 활성 표시**가 보인다. 활성 판정은 기존 `resolveMobileTabKey()` 재사용.
- 기존 로딩 상태(`TAB_PENDING_FAILSAFE_MS` 6초 흡수)는 **유지**한다 — 콜드 청크 전환 시 "안 눌렸다" 오인을 막는 실측 기반 장치다.

### 5-3. 치수

- 탭바 높이 = `56px + env(safe-area-inset-bottom)`. 현재 `--cd-app-tab-h: 60px` 선언과 실측 ≈50px가 어긋나 있으므로(진단 P3) **선언값을 실측에 맞춘다**.
- 탭 1개 터치 타깃 ≥ 48×48dp. 360px 화면 5탭 = 각 68.8px → 폭은 여유.
- 콘텐츠 스크롤 컨테이너 하단 여백 = `calc(탭바높이 + 16px + env(safe-area-inset-bottom))`.
- 라벨은 `text-overflow: ellipsis` 필수 — 현재 `nowrap`+`overflow:hidden`만 있어 en/ja에서 잘린다(진단 P2).

---

## 6. 디자인 언어 — 기존 토큰 확장 (새 팔레트 발명 금지)

`styles/app-shell.css`에 이미 "달빛 예화" 계열 토큰이 완비되어 있다. **새로 만들지 않고 이것을 앱 전역으로 넓힌다.**

| 역할 | 토큰 | 값 |
|---|---|---|
| 배경(기본/융기/침강) | `--cd-app-bg` / `-raised` / `-sunken` | `#0a0d1c` / `#111527` / `#070915` |
| 잉크(본문/보조/희미) | `--cd-app-ink` / `-muted` / `-subtle` | `#f4f1ea` / `#a8a596` / `#6f6d63` |
| 강조(달빛 골드) | `--cd-app-gold` / `-deep` | `#e8d5a3` / `#b99b56` |
| 보조 강조 | `--cd-app-accent` | `#9db4d8` |
| 간격 | `--cd-app-space-1..6` | 4/8/16/24/32/48 (8px 그리드) |
| 반경 | `--cd-app-radius-sm/md/lg/pill` | 10/16/24/999 |
| 그림자 | `--cd-app-shadow-1..3` | 2~3겹 (Glow-Not-Shadow) |
| 모션 | `--cd-app-ease` / `--cd-app-dur` | `cubic-bezier(.2,0,0,1)` / 240ms |

### 규칙

- 🔴 **연이/네오 분기를 앱 셸에 도입하지 않는다.** `app-shell.css` 파일 주석이 이미 그렇게 선언하고 있고, CLAUDE.md도 "신규 기능은 일반 다크모드만"이다.
- 본문 대비 **4.5:1 이상**. `--cd-app-ink-subtle`(#6f6d63)은 `--cd-app-bg`(#0a0d1c) 위에서 본문용으로 쓰지 않는다 — 비활성 탭 라벨·캡션 등 큰 글자/보조 요소 전용.
- 대비를 맞출 때 **색상 계열을 바꾸지 않는다**(DESIGN.md *The Hue-Stays Rule*) — 명도/채도만 조정.
- 탭 아이콘: 비활성 `strokeWidth 1.8` + `--cd-app-ink-subtle`, 활성 `2.4` + `--cd-app-gold`. (현행 유지)
- `prefers-reduced-motion: reduce`에서 모든 전환·애니메이션의 대체 경로를 제공한다.

---

## 7. 하드웨어 백버튼 계약 (확정)

### 7-1. 우선순위

```
1) 열린 모달·오버레이·바텀시트가 있으면        → 닫기 (페이지 이동 없음)
2) 페이지 레이어가 인터셉트를 등록했으면        → 그 처리에 위임
3) 히스토리가 있고 루트가 아니면                → history.back()
4) 루트(셸 "/" 또는 /app)                       → "한 번 더 누르면 종료" 토스트(2초) → 재입력 시 exitApp()
```

- 리스너는 **브릿지 하나만** 등록한다. 페이지 레이어(React)는 리스너를 새로 달지 않고 `window.__cdAppBackIntercept` 슬롯에 함수를 끼운다. → 이중 등록 시 백 1회에 2단계 후퇴하는 회귀 방지.
- 1단계의 오버레이 판정은 셸의 `overlayOpen()`과 **같은 규칙**(id 목록 + `[aria-modal="true"]` + 가시성)을 쓴다. 두 벌로 갈라지면 "네비는 숨었는데 백은 안 닫히는" 상태가 생긴다.
- 닫기 실행은 각 오버레이의 **자기 닫기 버튼 click** → 실패 시 `Escape` 디스패치 순서. 정리 로직(스크롤락 해제·포커스 복원)을 재사용하기 위함이다.

**PR #514 반영 상태**: 1·2·3·4 배선 완료. **잔여 과제** — 모달 open 시 `history.pushState` 배선은 넣지 않았다(현재는 이벤트 가로채기로만 처리). 이는 의도된 선택으로, 셸 오버레이 수십 개에 일괄로 history를 붙이면 뒤로가기 스택이 오염될 위험이 더 크다. Phase 3에서 화면별로 필요한 곳만 판단한다.

### 7-2. 화면 전환 모션

- 문서 간 이동은 풀 페이지 로드라 JS 슬라이드가 불가능하다. **크로스도큐먼트 View Transition**(`@view-transition { navigation: auto; }`)으로 대체한다.
- 앱 스코프(`html[data-runtime-target="mobile-app"]`)에만 선언하고, 미지원 WebView에서는 조용히 전환 없이 동작한다(점진적 향상).
- `prefers-reduced-motion: reduce`에서 비활성화.
- 동일 문서 내 오버레이(모달·시트)는 기존 애니메이션을 유지한다 — 새 모션 시스템을 얹지 않는다.

---

## 8. 미결 — Phase 2 착수 전 승인 필요

| # | 항목 | 선택지 | 권고 |
|---|---|---|---|
| M1 | **햅틱** | (a) `AndroidManifest.xml`에 `android.permission.VIBRATE` 추가 + `navigator.vibrate` 래퍼 — **신규 npm 의존성 0** (b) `@capacitor/haptics` 도입 (c) 미구현 | **(a) 추천**. `js/touch-perf.js:34`에 `safeVibrate()`가 이미 있는데 매니페스트에 VIBRATE 권한이 없어 앱에서 무음이다. 권한 1줄이면 살아난다. VIBRATE는 런타임 동의가 필요 없는 normal 권한 |
| M2 | **`/me` 라우트 불일치** | `verify:mobile-runtime-readiness`가 `href="/me"`를 요구하는데 그 라우트도, 셸의 해당 링크도 없다. HEAD에서도 실패 중 | 검사를 실물(`/?action=dpOpenList`)에 맞춰 고칠지, `/me`를 만들지 **사용자 판단 필요**. 스펙 기본값은 "검사를 실물에 맞춘다"(신규 화면 미제작 = D2와 일관) |
| M3 | **동기화 가드 누락** | `verify-mobile-bottom-nav-sync.mjs`의 `SHELL_FILES`에 `public/zh-tw/index.html`이 빠져 있다(zh-TW는 나중에 추가된 로케일) | 목록에 추가 권고. 지금은 zh-TW 셸의 탭이 어긋나도 검사가 통과한다 |

---

## 9. Phase 2 실행 순서 (승인 후)

| 단계 | 내용 | 검증 |
|---|---|---|
| 1 | `js/core/app-context.js` + `lib/platform/appContext.ts` 신설. 기존 판별식 6그룹을 **위임으로 교체**(삭제 아님) | `verify:checkout-pass-card` · `verify:billing-pass-policy` · `verify:paid-gate-ui` · typecheck |
| 2 | 탭바 통합 — React `AppTabBar`를 `MOBILE_TABS` 렌더로 교체, '이용권' 앱 분기, 치수·ellipsis 보정 | `verify:mobile-bottom-nav-sync` · `verify:mobile-detail-nonintrusive` |
| 3 | 앱 스코프 CSS 정리 — safe-area 전면 적용, 푸터·쿠키배너 숨김, 롱프레스 억제(결과 텍스트 제외), overscroll | `verify:hero-contrast` · `verify:mobile-detail-nonintrusive` |
| 4 | 화면 전환 View Transition + reduced-motion 대체 | 육안(기기) |
| 5 | 오프라인/에러 화면 | 육안(기기) |
| 6 | 햅틱 (M1 승인 시) | 육안(기기) |
| 7 | PWA 설치 유도 잔존 1곳(`js/luck-sync-diary.js`) 억제 | 정적 확인 |

각 단계 완료 시 `변경 파일 / 변경 이유 / 검증 방법`을 보고하고, 단계 사이에 멈춘다.

---

## 10. 비목표 (이번에 하지 않는 것)

- 보관함 등 **신규 화면 제작** (D2)
- 가격·결제 금액 로직 (프롬프트 §1-A/§1-B — 열람만)
- 6개 역학 엔진 계산 로직, `calculateLocalResult()`, KASI prefetch, `normalizeSaju`
- 데스크톱 960px 레이아웃
- 웹 모바일 동작 변경 (§3 예외 조항 제외)
- 죽은 브릿지 탐지 코드 삭제 — 보고만
- 연이/네오 테마 분기의 앱 도입
