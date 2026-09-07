---
status: active
updated: 2026-09-07
next: PR #1734 머지 후 프로덕션 승격 → 24시간 뒤 Cloudflare Web Analytics 로 LCP P75/P90/P99 재측정. 그 다음은 아래 "남은 작업" 1번(/points).
---

# 프로덕션 CWV 개선 — 홈 LCP·INP·CLS

## 왜

프로덕션 `code-destiny.com`(스테이징 아님) 의 CWV 를 고친다. Before(2026-09-06~07 Cloudflare Web Analytics): **LCP P75 1,340 · P90 1,967 · P99 5,252ms · INP Poor 12% · CLS Poor 5%**.
목표 1차: LCP P75 <1.5s · P90 <2.0s · P99 5.25s 대비 확연히 아래 · INP/CLS Poor 비율 하락.

## 지금 상태

- PR **#1734** (`perf/home-lcp-bytes`) — **미머지, CI 통과 이력 있음**. 이번 패스 = "LCP 바이트 + 홈 CLS/INP" 만.
- 코드 변경 실질은 `index.html` 3곳뿐(히어로 preload srcset · 히어로 `<img>` srcset · 오버레이 `scrollTop` 가드). 나머지는 전부 생성물(미러·캐시 핀·sitemap).
- 🔴 `main` 이 자주 움직여 **`config/sitemap-lastmod.json` 에서 충돌이 반복된다** — 아래 §함정 1.

## 남은 작업

- [ ] **PR #1734 머지 → 프로덕션 승격 → 24시간 뒤 필드 재측정.** 판정 기준: LCP P90/P99 하락이 Web Analytics 에 찍히는 것. 🔴 24시간 창을 채우기 전 값은 인용하지 않는다.
- [ ] **`/points` LCP 5,364ms · CLS 0.524** (후속 1순위, **결제 인접 RED — 별도 PR**). 원인 3개 특정 완료: ① `app/points/PointsRouteClient.tsx:5-8` 의 `ssr:false` 로 HTML 에 이미지가 없음 ② 스켈레톤 `PointsShell`(2열 그리드)과 실제 `main.moon-shop`(세로 8섹션)의 높이 불일치 ③ `styles/globals.css:1603-1609` 의 `body:has(main.moon-shop)` 가 클라이언트 렌더 순간 header/footer 를 제거.
- [ ] **`#iljuCard` CLS 1.517** — 재현 완료(§정본). 원인은 결과 카드가 입력→결과 전환 **4~8초 뒤 지연 태스크**에서 0 높이부터 자라 `hadRecentInput`(500ms) 제외를 못 받는 것. 수정은 구조적: 결과 카드 높이 예약 / 오프스크린 렌더 후 일괄 공개 / 라우트 전환 셋 중 택1. **국소 패치로는 안 된다.**
- [ ] `contain-intrinsic-size` 드리프트 2건 — `#cdSignatureConsult` 실측 827 vs 힌트 792(모바일) · 999 vs 965(데스크톱, 둘 다 과소예약), `#fortuneGatewayEntry` 539 vs 561(과대) · 613 vs 603(과소). 판정 명령은 §검증.
- [ ] `h1.moon-hero__title` 이 107 ↔ 54px 로 리플로우 — 홈 자체 로컬 CLS 0.08 의 **실제** 구동원(`#dpMasterCard` 아님).
- [ ] `.moon-hero__cta--primary` INP 360ms — 205요소·1,173px 폼 일괄 노출(`index.html:15024-15031`).
- [ ] 홈 문서 2.94MB 인라인 외부화(script 1.48MB / style 1.59MB) — CLS·LCP·TBT 를 한 번에 움직이는 유일한 구조 레버. 대공사, 단독 과제.
- [ ] `.cd-hero-island` 스타일 블록 중복 — `index.html:1490-1495` 와 `:10662-10669` 가 바이트 동일.

## 정본 예시

- 히어로 이미지 정본 2줄(**문자열이 같아야 프리로드가 재사용된다**): `index.html:901` · `index.html:9482`
- 오버레이 강제 동기 레이아웃 가드: `index.html:14052`
- `#iljuCard` 재현 수치(제출 단계 CLS 2.1596 / 0.9179 ×2 / 0.3024) 와 기각 3건의 근거: **PR #1734 본문**이 정본이다.

## 함정

1. 🔴 **`main` 재병합 시 `config/sitemap-lastmod.json` 이 매번 충돌한다.** 원장은 생성물이므로 `git checkout --theirs config/sitemap-lastmod.json` → `npm run sitemap:generate` → `npm run sync:public` 순으로 해소한다. 순서를 바꾸면 핀이 다시 낡는다.
2. 🔴 **병합 뒤 `index.html` 이 90줄 바뀌는 것은 정상이다(전부 `?v=build-…` 핀).** 내 수정이 살아 있는지는 줄 수가 아니라 내용으로 본다 — `grep -c 'width=960,quality=72' index.html` = **3**, `grep -c 'savedOverviewScroll' index.html` = **2**.
3. 🔴 **`paid-flow-gates` 잡이 경로 필터로 자가 스킵된다.** 스킵되면 결제 검증기를 로컬에서 손으로 채운다(§검증).
4. 🔴 **부팅 게이트 로고를 176px 로 줄이지 말 것.** `index.html:608-616` 의 계약 주석대로 같은 맨 URL 을 네 소비자가 공유하고(부팅 게이트 · `#honeypigLogo` 130×130 · 결제 오버레이/paid-gate 스프라이트 배경 · `js/io-image-lazy-loader.js` 의 `SRCSET_HINTS`), `scripts/verify-portone-single-payment-regression.mjs` 가 그 줄을 리터럴로 검사한다. 쪼개면 두 번 받는다. **결제 경로 정책 변경이다.**
5. 🔴 **`#dpMasterCard` 의 `min-height:0!important`(`index.html:2844`) 를 되돌리지 말 것.** 스로틀 프로브에서 이 카드의 성장(420→634px)은 **어떤 시프트도 만들지 않았다.** 이득 0 에 366px 폭 삐져나옴 회귀 위험만 진다.
6. 오버레이 `scrollTop` 대입을 `classList.add('is-open')` **앞으로 옮기는 것은 오답**이다 — `#cdMobileFortuneOverview` 는 그 전까지 `display:none` 이라 대입이 조용히 무시된다(`index.html:37125`).
7. 이미 기록된 것들(perf:home 은 dist 를 잰다 · CLS 는 스로틀 필수 · `.ignore` 윈도우 헛실패)은 메모리 `perf-and-visual-measurement-pitfalls` · `static-shell-pitfalls` 참조.

## 검증

```
npm run lint && npm run typecheck && npm run check:quick -- --skip-build
npm run verify:payment-choice-parity && npm run verify:payment-freeze
npm run verify:paid-gate-ui && npm run verify:billing-pass-policy && npm run verify:checkout-pass-card
node scripts/measure-home-section-heights.mjs      # contain-intrinsic-size 드리프트 판정
```
- 🔴 이미지 바이트는 **프로덕션에서만** 판정한다 — 로컬은 `/cdn-cgi/` 가 404 라 원본 폴백으로 낭비를 부풀린다.
- 🔴 CLS 는 **CPU 4x + Slow 4G** 를 걸어야 재현된다(무제한이면 0.001 로 나와 오판).
- Cloudflare Pages 빌드는 로컬에서 exit 1(`workers-og`)이라 `--skip-build` 로 건너뛰고 CI `Build Pages and Worker` 가 정본이다.

## 모르는 것

- 이번 수정의 **필드 효과**. 확정된 것은 히어로 전송량 −69,015 B(−39.8%, 390×844 DPR3, 프로덕션 CDN 실측)뿐이고, LCP P90/P99 하락 폭은 배포 전이라 미측정이다. 🔴 수치가 확인되기 전까지 성공으로 간주하지 않는다(사용자 지시).
- `#cdSigGrid` INP 832ms(n=2): 클릭 경로를 함수 본문까지 열었으나 **핸들러가 사실상 없다**(카드는 순수 `<a href>`, 캡처 리스너 3개 전부 조기 return). 하드 내비게이션 비용으로 `추정`하며 **코드 레버를 못 찾았다.**
