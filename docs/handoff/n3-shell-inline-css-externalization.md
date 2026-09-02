---
status: active
updated: 2026-09-02
next: 착수 조건(검증기 전수 판정)은 충족됐다 — 다만 이득 전제(`no-store`)가 틀린 것으로 확인돼 **효과 재산정이 먼저**다. 실행 여부는 사용자와 재합의
---

# N3 조사 — 셸 인라인 CSS 의 dist 단계 외부화

## 왜

앱/웹 최적화 로드맵(2026-09-02)에서 셸 인라인 CSS 재구조화(N3)는 **조사만, 실행 제외**로 결정됐다. 이 문서가 그 조사 산출물이다. 실행은 별도 세션에서 재합의.

## 실측 (2026-09-02, 이 워크트리)

- 소스 `index.html`: HTML 레벨 `<style>` **86블록 · 816.5KB** (측정: node 로 줄 단위 태그 스캔. 정규식 전역 매칭은 JS 문자열 안 `<style>` 을 오인해 1,432KB 로 부풀린다 — 재측정 시 주의)
- dist(미니파이 후) 기준 감사값: 85블록 · 645.8KB (`home-ux-audit-2026-09-01.md`)
- 분포는 평평하다: 최대 블록 61.6KB(`index.html:1391`), 상위 5개가 전체의 **30.5%**(약 249KB), 20KB 이상이 10개 남짓. 한 방에 큰 덩어리가 없어 "상위 N 개만" 전략의 한계 효용이 빨리 꺾인다.

## 채택 가능성 — dist 단계 후처리 (추천안)

`scripts/externalize-dist-inline-scripts.mjs` 와 같은 자리: **소스는 그대로, dist 의 바이트만** `<link rel="stylesheet" href="/css/shell/<해시>.css">` 로 치환. 근거는 그 스크립트 머리말 — index.html 을 문자열로 읽는 verify 가 61개(함수 본문 절단 19개)라 소스 분리는 시도 즉시 가드가 깨진다(실전례 있음). dist 방식이면 이 61개는 전부 무관하고, 미러 십수 벌이 같은 해시 파일을 공유해 중복 저장도 준다. 배선 자리는 `scripts/run-postbuild.mjs` 의 externalize(JS) 단계 옆, `minify-dist-css.mjs` 와의 순서 조정 필요.

## 🔴 예상 효과 — 전제가 틀렸다 (2026-09-02 정정)

**셸 HTML 은 `no-store` 가 아니라 `no-cache` 다.** 정본은 `public/_headers:187-191`(`/`), `:193-197`(`/index.html`), `:199-203`(`/*.html`), `:205-209`(`/*/`) — 2026-08-15 에 Googlebot 재다운로드 40.4MB 를 막으려고 바꿨고, 그 이유가 같은 파일 26~42행 주석에 있다. `no-cache` 는 **매 요청 재검증**이지 매 요청 재전송이 아니다. 셸이 안 바뀐 재방문은 지금도 304(본문 0바이트)를 받는다.

(이 문서의 옛 서술뿐 아니라 `scripts/minify-dist-css.mjs:17` 과 `scripts/externalize-dist-inline-scripts.mjs:17` 의 머리말도 `no-store` 라고 적혀 있다 — 둘 다 낡은 문장이다.)

그래서 남는 이득은 셋으로 줄어든다:

1. **배포 직후 재방문**. 배포마다 셸 HTML 해시가 바뀌어 304 가 깨지고 1.3MB 를 통째로 다시 받는다. CSS 가 해시 파일로 빠져 있으면 안 바뀐 CSS 는 재전송되지 않는다. ← 가장 큰 남은 이득이며 아직 실측 안 됨.
2. **앱 번들 크기**. dist 에 같은 셸이 십수 벌이라 미러끼리 해시 파일을 공유하면 중복 저장이 준다. 네트워크 이득은 없다.
3. 첫 방문 총 바이트는 동일(오히려 왕복 1회 증가).

## dist 검증기 전수 판정 — 착수 조건 충족 (2026-09-02)

`git grep -l dist -- "scripts/verify-*.mjs"` 34개를 전수 판정했다. **34는 과대집계이고, 실제로 dist 를 읽는 것은 10개다.**

노이즈 24개:
- **부분문자열 오탐 6** — `distinct`·`distance`·`distinguish` 가 걸린 것: `auth-p0p1-regression` · `fortune-chat-reading` · `ganji-surface-parity` · `mongo-query-index-shapes` · `payment-choice-parity` · `tarot-topic-lock`
- **제외 목록 10** — `SKIP_DIRS`/`ignoredDirs` 에 `"dist"` 를 넣어 **스캔에서 빼는** 것: `analytics-events` · `daeun-korean-calendar` · `lunar-conversion-core` · `myeongri-tables` · `natal-day-pillar-axis` · `paid-feature-common-flow` · `paid-gate-price-coverage` · `pig-sprite-crop` · `saju-solar-term-core` · `sukuyo-korean-calendar`
- **주석·문자열 7** — `guard-wiring` · `hero-firstpaint-lock` · `no-dev-server` · `novel-player-start` · `portone-single-payment-regression` · `public-mirror-fresh` · `worker-single-deploy-guard`
- **설정 텍스트 1** — `cloudflare-migration-readiness` (`pages_build_output_dir = "dist"` 문자열 검사)

실판독기 10개와 CSS 의존 판정:

| 검증기 | dist 에서 읽는 것 | 인라인 → `<link>` 영향 |
|---|---|---|
| `adsense-readiness` | 셸 본문 텍스트·사이트맵·`_headers`·RSC 플라이트 | 없음. CSS 는 일부러 안 본다(`:1695` 주석) |
| `indexable-prose-depth` | 본문 산문 | 없음. `<style>` 을 이미 걷어낸다(`:122`) |
| `internal-link-depth` | `href` | 없음 |
| `hydrated-h1-integrity` | `<h1[\s>]` 마크업 | 없음 |
| `mobile-feature-coverage` | 파일 존재 여부 | 없음 |
| `no-secret-leak` | dist 텍스트 전수 | 없음. `.css` 가 스캔 확장자에 있다(`:22`) — 빠져나온 CSS 도 계속 검사된다 |
| `app-no-portone` | 셸 마크업·자산 참조 색인 | 없음. 참조 색인이 `.css` 를 읽는다(`build-mobile-app.mjs:60`) |
| `app-bottom-clearance` | 실렌더 `getComputedStyle` | 없음. dist 를 http 로 서빙하고(`:69-93`) `.css` MIME 이 있다 |
| `home-visual-parity` | 실렌더 `getComputedStyle` | 없음. 같은 구조(`:448-476`), `waitUntil:"load"` |
| `mobile-cdp-smoke` | 실렌더 `getComputedStyle` | 없음. 같은 구조(`:854-877`), `Page.loadEventFired` 대기 |

🔴 **CSS 를 텍스트로 읽는 dist 검증기는 0건이다** — 착수 조건의 끝 판정을 만족한다.

🔴 이 문서가 1순위 위험으로 지목했던 **`verify:payment-choice-parity` 의 89룰은 오탐이었다.** 그 검증기는 소스 `index.html` 과 `public/` 미러만 읽고 dist 를 전혀 보지 않는다(`:39-45`). `dist` 매치는 `:632` 의 `distinct` 였다. 같은 이유로 `verify-hero-firstpaint-lock` 도 소스 `index.html` 을 읽는다(`:35`) — **dist 만 고치는 방식이 성립하는 근거가 한 겹 더 확인된 셈이다.**

## 위험 (실행 시 반드시 선결)

1. ~~dist 를 읽는 검증기 34개 전수 판정~~ → **완료, 의존 0건**(위 절).
2. 🔴 **하이드레이션 대상 HTML 의 `<style>` 은 절대 건드리지 말 것.** `scripts/minify-dist-css.mjs:26-36` 이 이미 겪은 사고다 — React 가 렌더한 `<style>` 의 텍스트를 dist 에서만 고치면 하이드레이션 불일치로 **Minified React error #418** 이 나고 `FeatureLandingPage.tsx` 라우트 18개가 전부 깨졌다(배포 스모크가 릴리스를 막는다). 외부화기는 그 파일의 블록 선별 로직(`<script>` 구간 제외 · 템플릿 리터럴 보간 제외 · 하이드레이션 HTML 제외)을 **그대로 재사용해야 한다.**
3. 🔴 **히어로 첫 페인트 잠금 블록은 인라인으로 남긴다.** `<style id="cd-hero-firstpaint-lock-v20260820">` 이 외부 `<link>` 로 밀리면 왕복 1회만큼 첫 페인트가 늦어 **layout-shift 0.5433** 회귀가 그대로 돌아온다(`verify-hero-firstpaint-lock.mjs:6-15`). 🔴 그 가드는 **소스**를 읽으므로 dist 가 회귀해도 초록불이다 — 가드가 못 잡는다. 메모리 `late-css-blocks-are-cls-in-the-shell` 도 같은 축.
4. **첫 방문 렌더 경로**: `<link>` 는 렌더 블로킹은 유지하나 네트워크 왕복이 추가된다 — LCP 가 늘 수 있다. 상위 블록만 빼는 절충 검토.
5. 본문 중간 블록(`:35621` 등)의 캐스케이드 순서 보존 — 86블록이 마크업과 교차 배치라 순서가 곧 우선순위다.
6. 신규 경로 엣지 404 캐시(메모리 `edge-404-cache-on-new-assets`).

## 배선 자리 (실측 2026-09-02)

- **`run-postbuild.mjs` steps 에서 `minify-dist-css.mjs` 뒤 · `strip-dist-html-comments.mjs` 앞.** minify 뒤에 두면 빼내는 바이트가 이미 압축본이라 **해시가 실제 배포 바이트와 일치**한다(앞에 두면 해시 후 내용이 다시 바뀐다 — `minify-dist-css` 는 dist 의 `.css` 전량을 스캔한다, `:96`). `verify-adsense-readiness` 뒤라는 조건도 자동으로 만족한다.
- **`_headers`**: 현재 규칙 **80개**(Cloudflare Pages 상한 100, `verify-adsense-readiness.mjs:1176` 이 집행) — 여유 20. 🔴 `/css/*.css` 가 **이미 매칭한다**(`:342`, 7일 캐시 · immutable 아님). 해시 파일에는 immutable 이 필요하므로 `/css/shell/*` 규칙을 **`/css/*.css` 보다 뒤에** 넣어야 한다 — 이 파일은 뒤 규칙이 이긴다(`:22-23` 주석의 실사고).

## 남은 작업 (실행 합의 시)

- [x] dist 읽는 검증기 34개 → CSS 텍스트 의존 여부 전수 판정 — **의존 0건** (2026-09-02)
- [ ] 🔴 **이득 실측이 먼저다** — 배포 직후 재방문에서 실제로 줄어드는 바이트. 안 재고 착수하면 왕복만 늘릴 수 있다.
- [ ] 프로토타입: 상위 5블록만 외부화(히어로 잠금 블록 제외) → `measure:home-score` 축3 + LCP 밴드 비교 (끝 판정: LCP 밴드 비악화 + 배포 직후 재방문 전송량 감소 실측)
- [ ] `/css/shell/*` immutable 규칙을 `/css/*.css` 뒤에 추가 + 배포 후 첫 요청 404 캐시 확인

## 모르는 것

- 배포 직후 재방문에서 해시 CSS 가 실제로 아끼는 바이트 — 실측 전엔 숫자를 못 박는다. (재방문 일반은 지금도 304 라 절감분이 0 에 가깝다는 것까지가 위 정정으로 확인된 것이다.)
