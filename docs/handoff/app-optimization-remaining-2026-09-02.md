---
status: active
updated: 2026-09-02
next: 셸 ETag(§2)와 쿠키 배너(후보 3)는 **종결**됐다. 남은 유일한 코드 레버는 **N3**(조사·이득 실측 완료 — 재방문 −79~92KB, 첫 방문 +8.8KB, 남은 미지수는 왕복 1회의 LCP 영향뿐) 이고 **실행 여부는 사용자 결정 대기**. 나머지 후보(월 입력 44px 현행 유지 · admin/ 프루닝 · 실기기 검증 · vc41 릴리스)는 사용자 판단·액션 대기
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
   - 🔴 **새 사실(2026-09-02)**: 셸 본문은 §2 때문에 **영원히 304 를 못 받는다.** 즉 재방문 절감을 캐시로 얻을 길이 닫혔고, N3 가 그 축에 남은 **유일한** 레버다.
2. ✅ **셸에 ETag·Last-Modified 가 없다 — 원인 확정, 코드로는 못 고침 (2026-09-02 종결)**. 아래 §2 참조. 후보에서 **제외**한다.
3. ✅ **쿠키 배너 앱 억제 — 완료 (2026-09-02)**. 앱에서는 배너를 띄우지 않고 **동의는 미설정으로 남긴다**(사용자 결정). `js/core/analytics.js` 가 `cd_cookie_consent` 부재를 `analytics_storage: denied` 로 읽으므로 추적은 꺼진 상태가 된다. 판정은 정본 `window.__cdAppContext.isApp()` 뿐이고, 회귀 가드는 `verify:analytics-events` ⑬ 이다(그 가드를 pr-ci 의 critical → fast 잡으로 옮겼다 — index.html 은 change-risk 상 **low** 라 critical 잡에 있으면 셸만 고친 PR 에서 통째로 스킵된다). 🔴 **앱에는 동의를 다시 열 경로가 없다** — `#cdCookieSettingsBtn` 이 배너 안에만 있기 때문이다. 나중에 앱에서 동의를 받아야 하면 배너 재노출이 아니라 설정 화면에 진입점을 만들어야 한다.
4. **`.sy-basic-calendar__month`(월 입력 112x32)** — **현행 유지 결정(2026-09-02).** `<input type=month>` 는 터치 타깃 절 1)의 전역 규칙 대상이 아니고 의사요소도 안 먹는다. 44px 로 올리면 헤드가 12px 커지는 디자인 변경이라, 근소차 1건 대비 이득이 낮다고 판단했다.
5. **admin/ 프루닝** — 사용자 결정 대기. index.html 이 `/admin/login` 으로 실제 네비게이션하므로 지우면 앱 내 관리자 진입이 죽는다. 승인 시 `build-mobile-app.mjs` 의 `WEB_ONLY_ARTIFACTS` 에 `"admin"` 추가 + `verify-app-no-portone.mjs` 의 존치 단언 교체.
6. **실기기 검증** — IME(키보드), OS다크+연이 라이트 다크 플래시. 정적 검증기로는 안 잡힌다.
7. **vc41 릴리스(사용자 액션)** — `VERSION_CODE 40→41` → `mobile:android:sync` → `bundleRelease` → AAB+mapping 업로드 → FGS 신고. 근거: [android-vc41-r8-crash-2026-09-01.md](android-vc41-r8-crash-2026-09-01.md).

## §2. 셸 ETag 소실 — 원인 확정 (2026-09-02, 종결)

🔴 **이 축은 코드로 못 고친다. 다시 조사하지 말 것 — 이미 세 번 틀렸다.**

원인은 Cloudflare 의 **JavaScript Detections(Bot Fight Mode)** 다. 엣지가 모든 HTML 응답 본문에
`/cdn-cgi/challenge-platform/scripts/jsd/main.js` 를 주입한다. 본문을 다시 쓰므로 응답이
`Transfer-Encoding: chunked` 가 되고 **`Content-Length` 와 `ETag` 가 함께 사라진다.**
비-HTML 자산은 손대지 않으니 검증자가 그대로 남는다.

| URL | Cache-Control | ETag | Content-Length |
|---|---|---|---|
| `/` | `no-cache` | ✗ | ✗ (chunked) |
| `/fortune/` (워커 경로) | `no-cache` | ✗ | ✗ |
| `/tarot/guide/` (Pages 정적) | `no-cache` | ✗ | ✗ |
| `/version.json` | `no-store, no-cache, must-revalidate, proxy-revalidate` | ✓ | 448 |
| `/manifest.json` | 위와 동일 | ✓ | 1302 |
| `/ads.txt` (`_headers` 가 Content-Type 재지정) | `public, max-age=86400` | ✓ | 59 |
| `/sitemap.xml` | `public, max-age=0, must-revalidate` | ✓ | 141999 |

결정적 증거: 소스 `index.html` 의 `challenge-platform` **0건** / 배포된 `/`(1,265,774B)와
staging `/`(1,273,042B)는 **각 1건**. `email-protection` 은 0건이라 Email Obfuscation 은 아니다.

기각된 가설 4종 — 전부 실측으로 닫혔다:

| 가설 | 기각 근거 |
|---|---|
| `_worker.js` 를 타서 (2026-08-27) | `/tarot/guide/` 는 `_routes.json` include 밖인데 증상 동일 |
| 대시보드 Cache Rule 이 `_headers` 를 이겨서 (2026-08-15) | `/ads.txt` 는 `_headers` 로 Content-Type 을 재지정받고도 ETag 유지 |
| `no-cache` 토큰이 검증자를 지워서 | `/version.json`·`/manifest.json` 은 `no-cache` 인데 ETag 있음 |
| 브로틀리 압축 때문에 | `accept-encoding: identity` 로 받아도 `/` 는 ETag 없음. 반대로 `/sitemap.xml` 은 `br` 로도 유지(`W/` 로 약화될 뿐) |

**유일한 레버는 Cloudflare 대시보드에서 JavaScript Detections 를 끄는 것이고, 사용자는 봇 보호를
유지하기로 결정했다(2026-09-02).** 그러므로 셸 본문의 재방문 절감은 캐시가 아니라 **전송량**으로만
가능하다 — 그게 N3(후보 1)가 유일하게 남은 레버인 이유다.

재현: `npm run measure:shell-css` 의 `[1]` 절이 검증자 부재와 함께 `challenge-platform` 주입 여부·
`transfer-encoding` 을 찍는다.

## 다시 하지 말 것 (승인 계획에서 이미 기각)

렌더 블로킹 CSS 제거 · 미사용 CSS 67KB 제거 · `app-logo-512.webp` 리사이즈 · 히어로 앞 차단 스크립트 제거 · 강제 동기 레이아웃 재시도(rAF 로 미뤄도 되레 늘어난다 — 75.3 → 203.9ms 실측) · 이미지 lazy 최적화. 홈 축3 성능(3-A/3-B)은 병행 세션(`feat/home-pr7-axis3-perf`) 소유다.

## 셸(index.html) 을 고칠 때 필수 후속

`npm run sync:public` → `npm run sitemap:generate`(셸 라우트 5개 서명이 반드시 바뀐다 — 빠뜨리면 CI 가 **"Typecheck and lint"** 이름으로 실패한다) → `npm run verify:payment-freeze`. `verify:public-mirror-fresh` 가 `.ignore` **하나만** 다르다고 하면 윈도우 개행 위양성이니 CI 판정을 따른다.
