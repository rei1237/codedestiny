---
status: active
updated: 2026-09-17
next: 2-4 ① gtag 주입 지연 적용 완료(3절). 남은 후보는 ② ko 페이지 ko.json 요청 조사 — 사용자 선택 대기
---

# 전역 렌더 차단: 루트 Suspense(완료) + 전역 Tailwind CSS(남음)

출발점: `docs/handoff/music-lounge-perf-2026-09-16.md` 남은 과제 1번.

## 다음 세션 첫 문장
"docs/handoff/global-css-render-blocking-2026-09-17.md 의 3절(gtag 지연 결과)과 2-4 를 읽고, 사용자가 ② ko.json 조사를 고르면 어느 컴포넌트가 ko 사전을 실제로 읽는지부터 실측한다."

## 1a 루트 Suspense 제거 — 완료 (`28b88e330`, push 됨)

원인(실측): `app/layout.js` 의 `<Suspense>` 는 프리렌더에서 멈추지 않지만, React Fizz 가 12.8KB(progressiveChunkSize)
넘는 경계를 떼어 내보내 본문 전체가 `<div hidden id="S:0">` 로 나갔다. 인라인 `$RC` 가 돌아야 보였고
(JS 꺼지면 본문 0px), React 19.2 노출 스로틀(`$RT+300ms`)에 걸릴 수 있었다.
경계에 기대던 곳은 `/fortune-chat/`(page 가 `useSearchParams` 클라이언트를 바로 렌더) 하나 — page 에 자기 경계를 달았다.
나머지 `useSearchParams` 5곳은 이미 자기 경계가 있거나 useEffect 동적 import.

검증(같은 HEAD 로 BEFORE/AFTER 전체 빌드, 로컬 dist, iPhone 13, 스크래치 `probe-suspense.mjs`):

| 라우트 | S:0 | JS-off 본문 텍스트 | 에러 |
|---|---|---|---|
| /music/ | 1→0 | 0→627 | 0 |
| /saju/ | 1→0 | 0→4058 | 0 |
| /tarot/ | 1→0 | 0→3795 | 0 |
| /share/ · /fortune/share/ | 1→0 | 0→1079 | 0 |
| /points/ | 1→0 | 0→189 | 0 |
| /insights/ | 1→0 | 0→7836 | 0 |
| /fortune-chat/ · /login/ · 결과 페이지 2종 | 0→0 | 변화 없음(자체 CSR) | 0 (login 1회 `Event` 는 3회 재실행에서 0 — 흔들림) |

클라이언트 이동 /saju/→/tarot/ 정상. 빌드 1637/1637 페이지 생성, `useSearchParams` 빌드 오류 없음.
Lighthouse mobile 3회 중앙값(perf:home --route, 옆 세션 dev 서버 2개 가동 중이라 편차 큼):

| | Perf | FCP | LCP | TBT |
|---|---|---|---|---|
| /music/ BEFORE | 85 (70–86) | 2118 | 3755 | 175 |
| /music/ AFTER | 88 (88–88) | 2103 | 3460 | 134 |
| /saju/ BEFORE | 67 (67–85) | 3097 | 7667 | 111 |
| /saju/ AFTER | 67 (66–69) | 3383 | 7882 | 71 |

시뮬 LCP 는 네트워크 그래프로 계산되고 이 변경은 그래프를 바꾸지 않으므로 차이는 노이즈 범위다.
확정 효과는 JS 없는 본문 노출과 `$RC` 대기 제거. 남은 LCP 는 아래 CSS 가 잡는다.
check:fast exit 0(jest 276 스위트/3873). 롤백: `git revert 28b88e330`.

선행 결함(범위 밖): 로컬 `npm run build` 후처리 `verify:adsense-readiness` 가
`out/fortune/date/2026-09-15/dog: 사이트맵 URL 의 HTML 이 산출물에 없다` 로 실패(BEFORE 에서도 동일, 날짜 의존).
빌드 가드 `[no-dev-server]` 는 다른 워크트리의 dev 서버도 잡는다 — 그 `.next` 가 다른 체크아웃이면 `ALLOW_DEV_SERVER_DURING_BUILD=1`.
빌드는 `rss.xml`·`insights/rss.xml`·`public/{,insights/}rss.xml` 4개를 고친다 — 커밋하지 말고 되돌린다.

## 1b 전역 Tailwind CSS — saju 파일럿 결과 기각 (코드 변경 없음, 되돌림)

실측(music 워크트리 dist, `8f2b1a38…css` 563KB, br 70KB):
- Tailwind 유틸리티가 약 450KB(이스케이프 선택자 규칙만 402KB/3814개). 나머지는 globals.css 본문·preflight.
- 다른 전역 시트: `05b29…`(98KB, @font-face 189개), `12508…`(59KB, theme-tokens·feature-marketing-detail·mobile-bottom-nav·yehwa-motifs-nav), `771df…`(20KB, GlobalHeader 모듈).
- content 글롭별(Tailwind CLI, utilities 만): 전체 522KB · app 만 451KB · src 만 96KB · src 제외 451KB. src/** 는 실사용(샘플 173/173 이 번들에 있음) — 글롭 축소로는 못 줄인다.
- **한 라우트 그룹만 쓰는 유틸리티 바이트(클래스 토큰 포함 검색, 스크래치 `tw-route-rank.cjs`)**: 공유 101KB · 미매칭 10KB · 그룹 전용 합계 약 410KB.
  saju 109KB · app/components 59KB(공유 컴포넌트라 전역 유지) · src/features/fortune-tea-house 48KB · src/components 21KB · points 17KB · tarot 15KB · fortune 14KB · palm-reading 13KB · oracle 13KB · admin 12KB · fusion-fortune 9KB · insights 8KB · feedback 7KB · naming-ai 7KB · life-book-ai 7KB …
  → 라우트 그룹 전용분을 빼면 전역 유틸리티는 이론상 약 450→170KB.

설계안(미검증):
- 그룹별 CSS `app/<group>/<group>-utilities.css` = `@config "<그룹 전용 tailwind config>"; @tailwind utilities;` 를 그 그룹 layout 에서 import.
  그룹 config 의 content 는 그 그룹 파일(+그 그룹이 쓰는 src/features/*), 전역 config 는 그 그룹을 제외. 겹치는 클래스는 양쪽에 생성돼도 무해.
- 🔴 캐스케이드 위험: 지금은 유틸리티가 globals.css 사용자 규칙·CSS 모듈보다 **앞**에 있다. 그룹 시트는 전역 시트 **뒤**에 오므로,
  같은 요소에서 같은 속성을 두고 겹치던 사용자 규칙(`.cd-*` 등)·preflight 보다 유틸리티가 이기게 뒤집힌다.
  native `@layer` 로 감싸면 비레이어 preflight(요소 선택자)에 져서 더 크게 깨진다 — 쓰지 말 것.
- 검증 기준: 그룹 내 전 라우트, 모바일·데스크탑, 모든 요소의 computed style BEFORE/AFTER diff 0(A-vs-A 노이즈 대조군 먼저 —
  메모리 css-move-regressions-need-a-computed-style-diff). 전역에서 빠진 클래스를 쓰는 그룹 밖 파일이 없는지(미매칭 10KB 확인).
  클라이언트 이동 시 그룹 시트 로드 전 FOUC 여부(다른 그룹 → saju 이동).
- 파일럿: saju(109KB) 하나로 효과(전역 시트 br 크기·/music/ LCP)와 diff 를 먼저 잰다. diff 가 0 이 아니면 되돌리고 보고.

### 파일럿 결과(2026-09-17, 1a `28b88e330` 이후 main 소스) — 기각

구현: `app/saju/layout.js`(통과 레이아웃) → `app/saju/saju-utilities.css`(`@config` + `@tailwind utilities`),
`tailwind.saju.config.js`(content=app/saju, **blocklist=전역 content 후보 전부**라 saju 전용 클래스만 생성),
전역 config content 에 `!./app/saju/**`. 커밋하지 않고 되돌렸다.

좋았던 것(실측):
- 규칙 분할은 정확했다: 옛 유틸리티 5496 규칙 = 새 전역 4588 + saju 908, 잃음 0·추가 0·겹침 0(postcss 로 직접 생성해 대조).
- 전역 Tailwind 시트 563KB/br 59.5KB → 447KB/br 49.4KB(**-10KB br**), saju 시트 117KB/br 13.2KB. /music/·/tarot/·/saju/ computed style 차이 0.
- saju 시트는 전역 시트 4개 뒤에 링크된다(예상대로).

🔴 기각 이유 — **유틸리티끼리의 순서가 뒤집힌다**(핸드오프가 걱정한 사용자 CSS 역전이 아니라 다른 축):
Tailwind 는 한 시트 안에서 기본 → 반응형/상태 변형 순으로, 같은 CSS 변수를 쓰는 from/via → to 순으로 규칙을 정렬해 승자를 정한다.
saju 전용 클래스만 뒤 시트로 빼면, 전역에 남은 짝(`sm:w-auto`·`to-*`)보다 뒤에 와서 이긴다.
- 런타임(iPhone 13·1366px, A-vs-A 노이즈 차감): `/saju/destiny-meeting-place/` 데스크탑 48건 — `h-[220px] sm:h-[300px]` 에서 220 이 이겨 main 1104→1024px.
  `/saju/love-simulation/` 10/20건 — `via-*` 가 `to-*` 의 `--tw-gradient-to` 를 덮어 그라디언트 끝 색 소실. `/saju/destiny-bias/stage/` 구분선 그라디언트 동일.
- 정적(옛 시트 순서+명시도로 승자 비교, 같은 문자열 공출현 근사): 20쌍 — `w-[190px] sm:w-auto`, `leading-[1.02] sm:text-6xl`, `hover:scale` vs `active:scale`, 그라디언트 11쌍 등.
- "뒤로 옮겨도 승자가 안 바뀌는" 클래스만 고르면(공출현 근사 없이 보수적으로) **0개**다 — 명시도 (0,1,0) 이 같은 전역 사용자 규칙·유틸리티가 뒤에 너무 많다.
- blocklist 를 빼고 saju 가 쓰는 유틸리티 전부를 saju 시트에 두면 saju 파일 안 순서는 보존되지만, (1) 공유 컴포넌트 내부 클래스와의 순서, (2) 공용 유틸리티가 루트 사용자 CSS 뒤로 가는 역전, (3) 클라이언트 이동 후 남는 시트가 다른 라우트에 번지는 문제가 생긴다 — 미측정, 권장하지 않음.
- 순서를 제대로 지키려면 Tailwind 산출물 전체를 native `@layer` 로 재구성해야 하는데, 비레이어 사용자 CSS·CSS 모듈과의 승자가 광범위하게 바뀌는 대형 RED 다.

효과 상한: saju 전용 규칙 전체가 br 약 15KB(전역 Tailwind br 59.5KB 의 약 1/4). 그룹 전용 합계 410KB(원본)를 전부 빼도 br 수십 KB 수준이다.
→ /saju/ LCP 7.7초(시뮬)에 비해 작을 가능성이 크다. 다음은 LCP 분해 실측이 먼저다.

재현 도구(스크래치, 커밋 안 함): computed style 전수 대조(A 두 번+B, `MSYS_NO_PATHCONV=1` 필요 — Git Bash 가 `/saju/` 인자를 경로로 바꾼다),
라우트별 CSS 규칙 집합 대조(Next 최적화기가 선언이 같은 규칙을 다르게 묶어 `transform`/`filter` 묶음 49건은 의미 없는 차이), 승자 역전 정적 검사.
빌드는 두 번 모두 1637/1637 생성 후 선행 결함 `verify:adsense-readiness`(날짜 의존)에서 멈췄다 — dist 는 CSS minify 전 단계, 비교 조건은 동일.
로컬 `out/`·`.next/` 는 파일럿 빌드 산출물이다(dist 는 HEAD 빌드로 복원). 가드가 out/ 을 읽는 작업 전에는 다시 빌드할 것.

## 2 /saju/ 모바일 LCP 분해 (2026-09-17, 코드 변경 없음)

조건: 로컬 dist(1a `28b88e330` 반영, `S:0` 0개), LCP 요소는 두 조건 모두 `header > p.mt-7` 본문 텍스트(이미지 아님).
옆 세션 `next dev` 2개 가동 중 — CPU 노이즈 있음. 모든 값은 3회 중앙값.

### 2-1 Lighthouse 13.1 simulate (7.7초의 정체)

Lantern LCP 는 **관측 LCP 시각 이전에 끝난 모든 요청 + 그 전에 실행된 스크립트**를 Slow 4G 로 재생한 값의 평균이다
(`@paulirish/trace_engine/.../lantern/metrics/LargestContentfulPaint.js`: optimistic·pessimistic 모두 저우선순위 이미지만 뺀다).
무스로틀 트레이스 회차에서 첫 페인트가 약 1.24초로 늦고, 그 전에 Next 청크 39개(br 527KB)·/js/core·gtag(171KB)·ko.json(132KB)이 다 끝나므로 전부 LCP 선행 조건이 된다.
측정: Lighthouse `blockedUrlPatterns` 로 하나씩 막음(스크래치 `lh-ablate.mjs`, 서버는 perf:home 과 같은 dist 정적 서빙).

| 막은 것 | 시뮬 LCP | 기준 대비 | 관측 FCP(트레이스) |
|---|---|---|---|
| 없음(기준) | 8175 | — | 1242 |
| CSS 전부 | 3157 | −5.0초 | 157 (LCP 요소가 GlobalHeader 로 바뀜) |
| JS 전부(+gtag) | 3489 | −4.7초 | 1157 |
| Next 청크 `/_next/static/chunks/*` | 4287 | −3.9초 | 1269 |
| `/js/core/*`(+analytics→gtag)·destiny-profile | 5963 | −2.2초 | 1236 |
| gtag·GA 수집 | 6205 | −2.0초 | 1236 |
| `/i18n/*`(ko.json 519KB, br 132KB) | 7504 | −0.7초 | 1237 |
| gtag + i18n | 5642 | −2.5초 | 1234 |
| gtag + i18n + /js/core·destiny-profile | 3308 | −4.9초 | 431 (3회 중 2회) |
| 폰트 `*.woff2` | 11202 | 판정 불가 | 1222 — 차단된 실패 요청이 그래프를 왜곡 |

값은 더해지지 않는다(가장 늦게 끝나는 노드가 LCP). 기준 3회는 4655·8175·8199 로 흔들렸다(4655 회차는 관측 LCP 가 2323 으로 늦음).

### 2-2 스로틀 실측 (실사용 체감에 가까운 값)

Playwright + 시스템 Chrome, 412×823·DPR 1.75, CDP `Emulation.setCPUThrottlingRate 4` + `Network.emulateNetworkConditions`
(지연 562.5ms·다운 1474.56kbps — LH 모바일 값), 차단은 CDP `Network.setBlockedURLs`(스크래치 `lcp-ablate.mjs`).
🔴 첫 시도는 프로브 서버가 요청마다 brotli q11 동기 압축 + Playwright `page.route` 가 모든 요청을 지연시켜 FCP≈DCL≈1.3초로 오염됐다 — 압축 캐시·CDP 차단으로 바꾼 뒤의 값만 쓴다.

| 막은 것 | FCP | LCP |
|---|---|---|
| 없음(기준, 세트 3개) | 2660–2720 | 2660–2720 (세트 하나는 2296/3356) |
| CSS 전부 | 1120 | 1260 (요소가 NAV 로 바뀜) |
| Tailwind 시트 `8f2b1a38…` 만 | 1928 | 2536 (레이아웃 바뀜) |
| @font-face 시트 `05b29…` 만 | 2676 | 2676 |
| 폰트 · 이미지 · JS 전부 · Next 청크 · ko.json | 2724 · 2748 · 2724 · 2752 · 2772 | 차이 없음(노이즈) |
| `/js/core/*`·destiny-profile | 2364 | 2364 (−350, 노이즈 경계) |
| gtag·GA | 2508 | 2508 (−150, 노이즈 안) |

무스로틀 Playwright 는 FCP=LCP≈300ms, 폰트·JS·이미지 차단해도 동일.
스로틀 폭포(기준 1회): 문서 응답 끝 ~690 → CSS 4개 645→**1861**(Tailwind br 71KB 가 마지막) → FCP 2296.
같은 구간에 `beforeInteractive` /js/core 6개(br 약 73KB, **High** 우선순위 프리로드)가 646→2261, Next 청크가 →3100 으로 대역폭을 나눠 쓴다.

### 2-3 몫 요약

| 몫 | Lighthouse 시뮬 LCP(7.7–8.2초) | 스로틀 실측(≈2.7초) |
|---|---|---|
| 문서 | 작음 | ~0.7초 |
| CSS | 첫 페인트를 늦춰 JS 를 끌어들이는 **원인** | 다운로드 ~1.2초 + 처리 ~0.4–0.8초 — **대부분** |
| JS | **결과로 대부분**(Next ~3.9 · core ~2.2 · gtag ~2.0 · ko.json ~0.7, 비가산) | 직접 영향 없음, 대역폭 경쟁만 |
| 폰트 | 0 (swap, 텍스트가 기다리지 않음) | 0 |
| 이미지 | 0 (LCP 가 텍스트) | 0 |

### 2-4 다음 수단 (추천순, 사용자 결정 대기)

1. ✅ **적용됨(3절) — gtag 주입 지연**(`js/core/analytics.js:78-81` 가 afterInteractive 에서 바로 주입 → window load 이후 idle 로).
   실측 대리값: 시뮬 −2.0초, 체감 노이즈 안. 결제 동결 밖, 파일 1개(+public 미러). 🔴 빠른 이탈 page_view 누락 가능 — GA 계측 정책 결정이 필요한 RED.
   주의: 차단은 지연의 대리값이다. 지연된 요청이 트레이스 첫 페인트(~1.24초) **뒤에** 시작해야 같은 효과가 난다.
2. **ko 페이지의 ko.json 요청 제거 여부 조사** — `lib/i18n/useT.ts` `useDictionary` 가 ko 에서도 `loadDictionary` 를 부른다(LocaleRuntimeBridge 는 ko 에서 조기 반환).
   어느 컴포넌트가 ko 사전을 실제로 읽는지 확인 전. ①과 합치면 시뮬 −2.5초, 모바일 데이터 br 132KB 절약.
3. `/js/core` beforeInteractive 6개 우선순위·시점 조정 — ①②와 합치면 시뮬 3.3초·트레이스 첫 페인트 431ms, 체감 −350ms(노이즈 경계).
   결제 진입 런타임(`checkout-entry`·`access-store`·`pass-verdict`)이라 payment-freeze + paid-gate-auditor 가 필요한 대형 RED — 보류.
4. CSS 자체(체감에 가장 큰 몫) — 1b 기각. 크리티컬 CSS 인라인·비동기 전체 시트는 캐스케이드·FOUC·CLS 대형 RED — 보류.
5. Next 청크 — 레이아웃 클라이언트 트리 축소가 필요한 범위 큰 작업 — 보류. 폰트·이미지 — 레버 없음.

참고: 사이트는 CrUX 표본이 없어 CWV 가 랭킹 입력이 아니다 — 이 작업은 체감 과제로만 다룬다.

## 3 gtag 주입 지연 — 적용 (2026-09-17)

사용자 승인: 빠른 이탈(load 전 이탈) 방문의 page_view 누락을 감수한다.
변경: `js/core/analytics.js` 가 `<script src=gtag/js>` 만 window load 뒤 `requestIdleCallback`(timeout 2000, 없으면 setTimeout 1)에 주입.
dataLayer·consent default·config·cdTrack·위임 리스너는 종전대로 즉시 설치 — 대기 중 이벤트는 태그 로드 때 전송된다.
정적 셸(index.html, defer)과 Next(`app/layout.js` afterInteractive) 둘 다 이 파일 하나라 함께 바뀐다.
가드: `verify:analytics-events` ⑥-b(load 전 태그 0개·config 즉시·load 뒤 정확히 1개). HEAD 원본으로 바꾸면 실패함을 변이로 확인.
미러: sync:public(public/js/core/analytics.js + 셸 7개 캐시 키). `app/layout.js` 의 `?v=20260814-ga4-v1` 는 안 바꿨다 — 옛 캐시 사본은 즉시 주입일 뿐 기능 차이 없음.

측정(같은 로컬 dist, /saju/, analytics.js 만 대체 서빙 — dist 무수정, 스크래치 측정 복사본):

Lighthouse mobile simulate 3회(옆 세션 가동 중, 관측 첫 페인트가 0.43–1.27초로 흔들림):

| 회차 | 시뮬 LCP | 관측 LCP | gtag 요청 |
|---|---|---|---|
| BEFORE 1 · 2 · 3 | 7373 · 3933 · 4051 | 1250 · 429 · 515 | 469–751 · 551–806 · 616–890 |
| AFTER 1 · 2 · 3 | 5724 · 6375 · 3681 | 1190 · 1268 · 681 | 1455–1758 · 1271–1509 · 1494–1765 |

- AFTER 3회 모두 gtag 가 관측 LCP **뒤**에 시작 → Lantern LCP 선행 그래프에서 빠짐(메커니즘 확인).
- 중앙값(4051 → 5724)은 관측 첫 페인트 편차가 지배해 비교 불가. 첫 페인트가 느린 회차끼리(관측 ≈1.2초) 7373 → 5724·6375(−1.0~−1.6초), 빠른 회차끼리 3933·4051 → 3681.

스로틀 Playwright 3회(CPU 4x, 562.5ms/1474.56kbps, 412×823·DPR 1.75, GA 수집 차단):

| | FCP | LCP | load | gtag 요청 시작(벽시계) |
|---|---|---|---|---|
| BEFORE 중앙값 | 2584 | 2584 | 5240 | ≈5.36초 |
| AFTER 중앙값 | 2616 | 2616 | 5285 | ≈5.59초 |

체감 차이 없음(노이즈). 스로틀 조건에서는 BEFORE 도 gtag 요청이 load 무렵에 나가므로 page_view 지연 폭은 약 0.2초 — 누락 증가는 주로 빠른 네트워크의 1초 미만 이탈이다.
check:fast exit 0(jest 277 스위트/3880). 롤백: 이 커밋 `git revert` 후 sync:public.
