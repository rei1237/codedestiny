---
status: active
updated: 2026-09-02
next: N3 는 조사가 끝났다(착수 조건 충족 + 이득 실측 완료 — 재방문 −79~92KB, 첫 방문 +8.8KB). **실행 여부는 사용자 결정 대기.** 🔴 그 과정에서 별건으로 **셸에 ETag 가 안 내려오는 것**을 찾았다 — N3 보다 큰 레버이고 원인 미조사. 나머지 후보는 전부 사용자 판단 대기
---

# 앱 최적화 — 남은 작업 (2026-09-02)

로드맵 본문은 [app-optimization-roadmap-2026-09-02.md](app-optimization-roadmap-2026-09-02.md). 이 문서는 **그 로드맵을 다 소화한 뒤 남은 것**과, 다음 세션이 같은 함정에 다시 빠지지 않게 할 측정 규약을 담는다.

## 🔴 터치 타깃 축은 이미 끝났다 — 선언값으로 세지 말 것

`docs/app-audit/DIAGNOSIS_REPORT.md` 와 승인 계획의 **"홈 44px 미만 39/162 = 24.3%"** 는 CSS 선언값·`getBoundingClientRect` 기준이라 크게 부풀려진 수치다. 실제로 탭이 먹는 범위로 다시 재면 **147개 중 5개(3.4%)** 뿐이다(staging, 390x844, 2026-09-02).

부풀려지는 이유 두 가지 — 둘 다 실측으로 확인했다:

1. 셸 최상위에 `button,[role="button"],input[type=button|submit|reset]{min-height:48px;min-width:48px}` 규칙이 있다(index.html 첫 `<style>`, `@media` 밖). **`min-height` 가 `height` 를 이기므로** `height:34px` 로 선언된 버튼도 실제로는 48x48 이다.
2. 이 레포는 시각 크기를 유지한 채 `::after` 로 히트 영역만 넓히는 관례를 쓴다(`.cd-mobile-appbar__action::after` 계열). 이 확장은 rect 에 안 잡힌다.

🔴 **이걸 모르고 `.sy-basic-calendar__icon-btn{height:34px}` 를 "미달"로 읽어 무효 PR #1458 을 머지시켰다.** 그 버튼은 이미 48x48 이었고, 44px 히트 영역을 48px 상자 안에 넣은 셈이라 아무것도 바뀌지 않았다(이 PR 에서 되돌린다).

**재는 법**: `npm run measure:touch-targets [url] [width] [height]` (기본 staging 390x844). `elementFromPoint` 로 사방 탐침해 실효 범위를 재고, 판정 불가(가려짐·화면 밖) 개수를 함께 찍는다. 🔴 스크롤이 smooth 면 대부분이 "화면 밖"으로 빠져 **미달 0건이라는 위양성**이 나온다 — 스크립트가 `scroll-behavior:auto` 를 강제하는 이유다.

남은 5건(전부 근소차, 앱 체감 영향 낮음): `a.cd-footer-legal__link` ×4 (실효 65x41) · `input#subDailyHome` ×1 (44x39).

## 남은 최적화 후보

1. **N3 — 셸 인라인 CSS 외부화**. 조사 완료: [n3-shell-inline-css-externalization.md](n3-shell-inline-css-externalization.md). 소스 `index.html` `<style>` 86블록 816.5KB / dist 85블록 645.8KB. 추천안은 **dist 단계 후처리**(소스 분리는 index.html 을 문자열로 읽는 verify 61개가 깨져 불가).
   - **착수 조건 충족** — dist 를 읽는 검증기는 34개가 아니라 10개고, CSS 를 텍스트로 읽는 것은 0건이다(2026-09-02 전수 판정, 그 문서의 "dist 검증기 전수 판정" 절).
   - **이득 실측 완료** (`npm run measure:shell-css`, 프로덕션 실물): 재방문 **−78.9~92.0KB**(셸 전송량의 약 46%), 첫 방문 **+8.8~9.0KB**, 배포당 묶음 무효화 19.2%. 🔴 단 **연속 구간별 묶음**(7개)이어야 한다 — 블록별 86개로 쪼개면 첫 방문이 +44KB 로 뛰고, 전량 1개로 합치면 끼어 있는 `<link rel=stylesheet>` 22개 때문에 캐스케이드가 뒤집힌다.
   - **남은 미지수는 왕복 1회 추가의 LCP 영향 하나뿐**(바이트는 쟀고 시간은 안 쟀다). **실행 여부는 사용자 결정 대기.**
2. 🔴 **셸에 ETag·Last-Modified 가 없다 (신규 발견 · N3 보다 큰 레버)**. `_headers` 는 셸을 `no-cache`(조건부 재검증)로 두었고 그 목적이 파일 26~42행 주석에 "Googlebot 재다운로드 40.4MB 차단"으로 적혀 있는데, 프로덕션·스테이징 `/` 둘 다 **검증자를 안 내려보내서 304 가 원천적으로 불가능**하다(2026-09-02 실측). 복구되면 재방문·크롤 1회당 셸 전량(brotli 173~200KB)이 0바이트가 된다. `/` 는 `_routes.json` include 밖이라 `_worker.js` 가설은 기각됐고, 그 다음 원인은 미조사. 재현: `npm run measure:shell-css` 의 [1] 절.
3. **쿠키 배너 앱 억제 여부** — `#cdCookieConsent` 는 앱에서도 900ms 뒤 뜬다(PG 창 억제만 존재). 앱 첫 화면을 가리는 유일한 오버레이이고 실효 히트 스캔에서도 유일한 전면 가림 요소였다. 컴플라이언스 판단 사항.
4. **`.sy-basic-calendar__month`(월 입력 112x32)** — `<input type=month>` 는 터치 타깃 절 1)의 전역 규칙 대상이 아니고 의사요소도 안 먹는다. 44px 로 올리면 헤드가 12px 커지는 디자인 변경.
5. **admin/ 프루닝** — 사용자 결정 대기. index.html 이 `/admin/login` 으로 실제 네비게이션하므로 지우면 앱 내 관리자 진입이 죽는다. 승인 시 `build-mobile-app.mjs` 의 `WEB_ONLY_ARTIFACTS` 에 `"admin"` 추가 + `verify-app-no-portone.mjs` 의 존치 단언 교체.
6. **실기기 검증** — IME(키보드), OS다크+연이 라이트 다크 플래시. 정적 검증기로는 안 잡힌다.
7. **vc41 릴리스(사용자 액션)** — `VERSION_CODE 40→41` → `mobile:android:sync` → `bundleRelease` → AAB+mapping 업로드 → FGS 신고. 근거: [android-vc41-r8-crash-2026-09-01.md](android-vc41-r8-crash-2026-09-01.md).

## 다시 하지 말 것 (승인 계획에서 이미 기각)

렌더 블로킹 CSS 제거 · 미사용 CSS 67KB 제거 · `app-logo-512.webp` 리사이즈 · 히어로 앞 차단 스크립트 제거 · 강제 동기 레이아웃 재시도(rAF 로 미뤄도 되레 늘어난다 — 75.3 → 203.9ms 실측) · 이미지 lazy 최적화. 홈 축3 성능(3-A/3-B)은 병행 세션(`feat/home-pr7-axis3-perf`) 소유다.

## 셸(index.html) 을 고칠 때 필수 후속

`npm run sync:public` → `npm run sitemap:generate`(셸 라우트 5개 서명이 반드시 바뀐다 — 빠뜨리면 CI 가 **"Typecheck and lint"** 이름으로 실패한다) → `npm run verify:payment-freeze`. `verify:public-mirror-fresh` 가 `.ignore` **하나만** 다르다고 하면 윈도우 개행 위양성이니 CI 판정을 따른다.
