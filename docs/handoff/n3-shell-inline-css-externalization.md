---
status: active
updated: 2026-09-02
next: 착수 조건·이득 실측 **둘 다 끝났다**(재방문 −79~92KB, 첫 방문 +8.8KB). 남은 건 실행 합의 하나뿐 — 합의되면 `run-postbuild.mjs` 의 `minify-dist-css` 뒤에 외부화기를 넣는다. 🔴 그 전에 별건으로 **셸에 ETag 가 없는 것**(더 큰 레버)을 먼저 볼지 결정
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

## 효과 — 실측 완료 (2026-09-02, `npm run measure:shell-css`)

🔴 **헤더 값과 실제 동작이 다르다. 값만 읽고 결론 내면 틀린다 — 이 문서가 한 번 그렇게 틀렸다.**

- 셸의 `Cache-Control` 은 `no-store` 가 **아니라 `no-cache`** 다(`public/_headers:187-209`, 2026-08-15 변경). 여기까지는 맞다.
- 🔴 **그런데 프로덕션·스테이징 `/` 둘 다 `ETag` 도 `Last-Modified` 도 내려오지 않는다**(실측 2026-09-02). 검증자가 없으면 조건부 요청 자체가 불가능하므로 **304 는 나오지 않고 재방문마다 본문 전량이 다시 내려온다.** 즉 옛 문서의 *결론*("매 방문 재전송")은 결과적으로 맞았고, 그 사이 이 문서가 적었던 "재방문은 지금도 304 를 받는다"가 **틀린 서술이다**(같은 날 정정).
- 원인 미검증. `/` 는 `public/_routes.json` 의 `include` 에 없어 `_worker.js` 가 아니라 Pages 정적 자산 경로로 나간다 — 워커가 벗긴다는 가설은 기각됐다. 이건 N3 와 별건이며 **더 큰 레버다**(아래 절).

실측값 — 프로덕션 `/` 실물, brotli q=11(보수) / q=5(엣지 동적 압축에 가까움):

| | 현재(전부 인라인) | 연속 구간별 7파일로 외부화 |
|---|---|---|
| 첫 방문 | 173.2 / 200.2KB | 181.8 / 209.3KB (**+8.8 / +9.0KB**) |
| 재방문 | 173.2 / 200.2KB | 94.1 / 108.2KB (**−78.9 / −92.0KB**) |

- 셸 HTML 1,236.1KB 중 `<style>` 86블록 640.6KB = **51.8%**. 압축 후로도 셸 전송량의 **약 46%** 가 CSS다.
- 🔴 **블록별 86개 파일로 쪼개면 안 된다** — brotli 사전이 파일마다 끊겨 첫 방문이 **+44KB** 로 뛴다(같은 재방문 절감에 5배 비싼 값). 묶어야 한다.
- 🔴 **전량 1개 번들도 안 된다** — `<style>` 구간 안에 `<link rel=stylesheet>` 가 **22개** 끼어 있다(전부 문서 앞 126KB, `theme-tokens`·`core-ui`·`fortune-*`·`tarot-*` 계열). 그 지점을 넘겨 합치면 캐스케이드가 뒤집힌다. **낀 링크에서 끊어 연속 구간별로 묶으면 7개**가 되고, 이게 캐스케이드를 정확히 보존하면서 압축을 거의 다 회복하는 지점이다.
- **배포당 캐시 무효화**: 바이트로는 평균 1.6%뿐이지만 🔴 **캐시는 파일 단위**라 실제로는 **묶음 6개 중 평균 1.2개(19.2%)** 가 매 배포 무효화된다(소스 `index.html` 을 바꾼 최근 커밋 40개, 연속 쌍 39건). CSS 를 하나도 안 건드린 배포는 **0/39건**. 즉 절감의 약 80%가 배포를 넘겨 살아남는다.
- **앱 번들**: dist 에 같은 셸이 십수 벌이라 미러끼리 해시 파일을 공유하면 중복 저장이 준다(미실측).

## 🔴 별건 — 셸에 검증자가 없다 (N3 보다 큰 레버로 보인다)

`public/_headers:26-42` 의 2026-08-15 주석은 `no-cache` 로 바꾼 목적을 "ETag/Last-Modified 로 304 를 받아 Googlebot 재다운로드 40.4MB 를 막는다"로 적어 두었다. **그 목적이 달성되지 않았다** — 검증자가 실제로 안 내려온다. 복구되면 재방문·크롤 1회당 셸 전량(brotli 173~200KB, 비압축 1.24MB)이 통째로 0바이트가 되므로, N3 의 −79KB 보다 크고 코드 변경도 훨씬 적다. 원인 조사는 미착수. 재현: `npm run measure:shell-css` 의 [1] 절.

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
4. **첫 방문 렌더 경로**: `<link>` 는 렌더 블로킹은 유지하나 네트워크 왕복이 추가된다 — LCP 가 늘 수 있다. 바이트로는 +8.8KB 뿐이지만(위 실측) **왕복 비용은 안 쟀다.** 프로토타입에서 LCP 밴드로 확인해야 한다.
5. 🔴 **캐스케이드 순서 — 묶음 경계는 임의로 정할 수 없다.** `<style>` 구간 안에 `<link rel=stylesheet>` 가 **22개** 끼어 있다(실측). 외부화기는 낀 링크를 경계로 삼아 **연속 구간만** 한 파일로 묶어야 한다. 이 경계를 무시하고 합치면 스타일이 조용히 뒤집힌다.
6. 신규 경로 엣지 404 캐시(메모리 `edge-404-cache-on-new-assets`).

## 배선 자리 (실측 2026-09-02)

- **`run-postbuild.mjs` steps 에서 `minify-dist-css.mjs` 뒤 · `strip-dist-html-comments.mjs` 앞.** minify 뒤에 두면 빼내는 바이트가 이미 압축본이라 **해시가 실제 배포 바이트와 일치**한다(앞에 두면 해시 후 내용이 다시 바뀐다 — `minify-dist-css` 는 dist 의 `.css` 전량을 스캔한다, `:96`). `verify-adsense-readiness` 뒤라는 조건도 자동으로 만족한다.
- **`_headers`**: 현재 규칙 **80개**(Cloudflare Pages 상한 100, `verify-adsense-readiness.mjs:1176` 이 집행) — 여유 20. 🔴 `/css/*.css` 가 **이미 매칭한다**(`:342`, 7일 캐시 · immutable 아님). 해시 파일에는 immutable 이 필요하므로 `/css/shell/*` 규칙을 **`/css/*.css` 보다 뒤에** 넣어야 한다 — 이 파일은 뒤 규칙이 이긴다(`:22-23` 주석의 실사고).

## 남은 작업 (실행 합의 시)

- [x] dist 읽는 검증기 34개 → CSS 텍스트 의존 여부 전수 판정 — **의존 0건** (2026-09-02)
- [x] 이득 실측 — 재방문 **−78.9~92.0KB**, 첫 방문 **+8.8~9.0KB**, 배포당 묶음 무효화 **19.2%** (2026-09-02, `npm run measure:shell-css`)
- [ ] 프로토타입: 연속 구간별 묶음 외부화(히어로 잠금 블록 인라인 존치) → `measure:home-score` 축3 + LCP 밴드 비교 (끝 판정: **LCP 밴드 비악화** + 재방문 전송량 감소 실측)
- [ ] `/css/shell/*` immutable 규칙을 `/css/*.css` 뒤에 추가 + 배포 후 첫 요청 404 캐시 확인

## 모르는 것

- **왕복 1회 추가의 LCP 영향** — 바이트는 쟀지만 시간은 안 쟀다. 프로토타입 없이는 못 박는다. 이게 유일한 남은 미지수이자 실행 여부의 판정 기준이다.
- **셸에 ETag 가 없는 원인** (위 별건 절). 워커 가설은 기각됐고 그 다음은 미조사.
- 미러 십수 벌의 중복 저장 절감분(앱 번들 크기 축) — 미실측.
