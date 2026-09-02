---
status: active
updated: 2026-09-02
next: N3 착수 조건(검증기 전수 판정)은 끝났다 — 그런데 그 과정에서 **N3 의 이득 전제가 틀린 것**을 찾았다(셸은 no-store 가 아니라 no-cache). 다음은 이득 실측이고, 그 전에 실행 여부 재합의. 나머지 후보는 전부 사용자 판단 대기
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
   - **착수 조건은 충족됐다** — dist 를 읽는 검증기는 34개가 아니라 10개고, CSS 를 텍스트로 읽는 것은 0건이다(2026-09-02 전수 판정, 그 문서의 "dist 검증기 전수 판정" 절).
   - 🔴 **대신 이득 전제가 무너졌다.** 셸 HTML 은 `no-store` 가 아니라 `no-cache` 다(`public/_headers:187-209`, 2026-08-15 변경). 재방문은 지금도 304 라 "매 방문 646KB 재전송"이 아니다. 남는 이득은 *배포 직후* 재방문과 앱 번들 중복 제거뿐이고, 둘 다 미실측이다.
   - **다음은 실행이 아니라 그 이득 실측이다. 실행은 여전히 별도 재합의 대상.**
2. **쿠키 배너 앱 억제 여부** — `#cdCookieConsent` 는 앱에서도 900ms 뒤 뜬다(PG 창 억제만 존재). 앱 첫 화면을 가리는 유일한 오버레이이고 실효 히트 스캔에서도 유일한 전면 가림 요소였다. 컴플라이언스 판단 사항.
3. **`.sy-basic-calendar__month`(월 입력 112x32)** — `<input type=month>` 는 위 1)의 전역 규칙 대상이 아니고 의사요소도 안 먹는다. 44px 로 올리면 헤드가 12px 커지는 디자인 변경.
4. **admin/ 프루닝** — 사용자 결정 대기. index.html 이 `/admin/login` 으로 실제 네비게이션하므로 지우면 앱 내 관리자 진입이 죽는다. 승인 시 `build-mobile-app.mjs` 의 `WEB_ONLY_ARTIFACTS` 에 `"admin"` 추가 + `verify-app-no-portone.mjs` 의 존치 단언 교체.
5. **실기기 검증** — IME(키보드), OS다크+연이 라이트 다크 플래시. 정적 검증기로는 안 잡힌다.
6. **vc41 릴리스(사용자 액션)** — `VERSION_CODE 40→41` → `mobile:android:sync` → `bundleRelease` → AAB+mapping 업로드 → FGS 신고. 근거: [android-vc41-r8-crash-2026-09-01.md](android-vc41-r8-crash-2026-09-01.md).

## 다시 하지 말 것 (승인 계획에서 이미 기각)

렌더 블로킹 CSS 제거 · 미사용 CSS 67KB 제거 · `app-logo-512.webp` 리사이즈 · 히어로 앞 차단 스크립트 제거 · 강제 동기 레이아웃 재시도(rAF 로 미뤄도 되레 늘어난다 — 75.3 → 203.9ms 실측) · 이미지 lazy 최적화. 홈 축3 성능(3-A/3-B)은 병행 세션(`feat/home-pr7-axis3-perf`) 소유다.

## 셸(index.html) 을 고칠 때 필수 후속

`npm run sync:public` → `npm run sitemap:generate`(셸 라우트 5개 서명이 반드시 바뀐다 — 빠뜨리면 CI 가 **"Typecheck and lint"** 이름으로 실패한다) → `npm run verify:payment-freeze`. `verify:public-mirror-fresh` 가 `.ignore` **하나만** 다르다고 하면 윈도우 개행 위양성이니 CI 판정을 따른다.
