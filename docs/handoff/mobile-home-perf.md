# 인수인계 — 모바일 홈 성능 (프로덕션 39점 → 목표 60점대)

> 2026-08-15 **3차 개정**. 이 문서만 읽고 바로 이어서 시작할 수 있게 쓴다.
> 1차본의 L1·L2(이미지·로고)는 **실측으로 기각**됐다(§3). 되살리지 말 것.
> 2차 세션이 CSS 분할과 하단 내비 옵저버를 고쳤고, **아직 배포하지 않았다**(사용자 지시).

---

## 0. 30초 요약

- 점수 손실의 본체는 **TBT(30%) + LCP(25%) = 55%** 이고, 둘은 **같은 원인(메인스레드 작업량)** 을 공유한다.
- **LCP 는 이미지가 아니다.** `h1.moon-hero__title` **텍스트**이고 지연이 전부 `Element render delay` 다(자원 로드 지연 **0ms**). 이미지로는 못 움직인다.
- 지금까지 고친 것 2개 — **CSS 분할**(FCP −382 · LCP −896)과 **하단 내비 옵저버**(TBT −377). 둘 다 밴드 비겹침으로 검증됐다.
- **다음 지렛대 = 셸 인라인 부트 스크립트의 690~842ms 롱태스크를 태스크 분할.** TBT 는 태스크당 50ms 초과분만 세므로, **일을 줄이지 않고 쪼개기만 해도** −600~750ms 가 예상된다.
- 🔴 **TBT 노이즈가 크다.** 판정은 항상 **min~max 밴드 비겹침**으로 한다. 1차 세션이 결론을 뒤집힌 이유가 이것이다(§3-1).

---

## 1. 지금 어디까지 와 있나 (작업 상태)

| 항목 | 값 |
|---|---|
| 워크트리 | `.claude/worktrees/perf-home-shell` (node_modules 보유) |
| 브랜치 | `perf/home-css-split` |
| PR | **#667 — 열려 있음. 🔴 사용자가 "아직 배포하지 말라"고 했다.** |
| 커밋 | `a8565083a` CSS 분할 · `6d2c2bf0d` main 병합 재동기화 · `0ebc10a21` 옵저버 수정 |
| 이미 머지된 것 | **#662** (`perf:home` 측정 확장 + 문서 2차본) — 배포까지 완료 |

**PR #667 에 들어 있는 변경**
1. `scripts/build-fortune-ui-critical.mjs` (신설) + `styles/fortune-ui-home.css` (생성물) + `index.html` 의 CSS 로딩 배선
2. `index.html` 하단 내비 옵저버 범위 축소
3. `scripts/measure-home-lighthouse.mjs` 데스크탑 크래시 수정(`details.items` 가 배열이 아닐 수 있다)
4. 미러 6벌·`public/styles/`·`public/js/` 는 전부 `sync:public` 산출물

🔴 **남은 검증**: **시각 파리티를 옵저버 수정 전/후로 아직 못 돌렸다.** 다음 세션의 첫 작업이다(§6 에 방법). 나머지 verify 체인(typecheck·public-parity·locale-main-sync·payment-freeze·hero-contrast·mobile-detail-nonintrusive)은 통과했다.

---

## 2. 사용자 요구 (원문)

> 성능이 너무 처참해 이전에는 50점 대였는데 … 대체 무엇이 원인이라서 모바일 성능이 이렇게까지 떨어졌는지 분석해주고 쓸데없는 중복 css라든지 모든 측면을 다 고려해서 서비스 모바일 성능을 완벽하게 최적화해주면 좋겠어 많이 바라지도 않아 60점대정도만 나와도 만족한다

> cls 제외하고는 점수가 최하점이므로 … 목표 점수가 될때까지 계속 수정해

> TBT는 오히려 나빠졌는데 아직 배포하지 말고 이 부분을 모바일, 데스크탑 모두 개선해줘

> tbt를 더 낮출 수 있는 방향성은 없는거야? 예전에는 아주 쾌적했었어

**확정 사항**
1. 기준 도구는 **PSI**. 🔴 **키는 발급하지 않는다** — 라운드마다 **사용자가 pagespeed.web.dev 에서 직접 1회 실행해 점수를 알려준다.** 반복 측정은 `perf:home --url=`(같은 Lighthouse 엔진, 키 불필요).
2. **부트 베일 유지** — 작업량을 먼저 줄인다.
3. **모바일 홈 요소 축소 허용** — 단 *"ui/ux적으로 매우 편리하게 모든 기능들에 접근할 수 있어야"* 한다.
4. **배포 보류.** 머지는 사용자가 한다.

---

## 3. 🔴 실측으로 기각된 것 — 절대 반복하지 말 것

### 3-1. "하단 내비는 병목이 아니다" (1차 세션 결론) → **틀렸다**

1차 세션은 `update()` 를 즉시 return 시키는 ablation 으로 "효과 없음"이라고 결론지었다. **그 결론은 노이즈 밴드에 묻힌 것이다.** 2차 세션이 같은 파일로 다시 재니 밴드가 겹치지 않는 −524ms 였다(§4-2). **교훈: 판정은 반드시 min~max 밴드로 한다.**

### 3-2. 이미지 최적화 전반 — **점수 기여 0**

홈 셸 `<img>` 59개 중 Lighthouse 가 **실제로 받는 것은 9개·373KB** 뿐이다. 나머지는 `loading="lazy"` + 스크롤 아래라 요청조차 안 된다. 1차본 L1 이 지목한 5개(`saju`·`ai tarrot`·`info`·`유명인 사주 분석`·`sybila`)는 **한 개도 다운로드되지 않는다.** 그리고 LCP 가 텍스트라 이미지로는 LCP(25%)도 못 움직인다.

부수 실측(점수용 아님, 데이터 비용용): 리사이즈가 항상 이득은 아니다 — `자는 연이.webp` 10,950→20,770(+90%) · `flower-pig-honey-hug` 22,890→41,737(+82%) · `info@1600` 336,464→374,348(+11%). **전환 전 반드시 원본 대비 프로브할 것.**
실제 낭비는 `네오와 연이의 운명의 섬` 60KB · `orbs/core` 33KB · `app-logo-512` 30KB · `luck-sync-diary-v2` 23KB · `flower-pig-honey-hug` 21KB, 그리고 CSS 배경 `vvip-destiny-archive-v1.webp` **110KB** 와 `/icons/neo.webp` 48KB.
🔴 `#neoLogo` 는 `srcset`(96w/130w/512w)이 있는데도 512 를 받는다 — DPR 2.625 × 88px = 231px 가 필요한데 후보가 130 다음이 512 다. **고치려면 ~256w 변형을 만들어야 한다**(`sharp` 보유, `scripts/webp-exclusions.mjs:18` 이 `app-logo*` 를 자동 변환에서 제외하므로 수동 생성).

### 3-3. L2(로고 srcset)의 전제도 틀렸다

`app-logo-176.webp` 는 "참조 0회"가 아니라 **결제창 안내 자산**이고 `scripts/verify-payment-choice-parity.mjs:138` 이 가드한다. `#honeypigLogo` 의 `srcset` 은 부팅 때 `js/share.js:1103,1223` 과 `index.html` 의 `syncHeroMascot` 이 **512 를 가리키는 degenerate srcset 으로 무조건 덮어쓴다** — HTML 만 고치면 무효다. `index.html:548` preload 는 `verify-portone-single-payment-regression.mjs:513` 이 `href="/icons/app-logo-512.webp"` **접두사로** 단언하므로, `imagesrcset`/`imagesizes` 를 href **뒤에** 붙이는 것만 통과한다.

### 3-4. `:has()` 셀렉터 — 기각

홈 CSS 3면에 42개(문서 전역 `body:has(...)` 포함). dist 에서 전부 무력화해도 RecalcStyle 38,307 → 37,122ms(밴드 겹침). **노이즈다.**

### 3-5. 그 외 (1차 세션 결론, 유효)

- **중복 CSS 제거** — 전체 1.55MiB 중 16.1KiB(1.0%). 사용자가 지목했지만 건드릴 가치 없음.
- **정적 판정으로 CSS 삭제** — "매칭 불가" 판정의 **83%가 JS 문자열로 되살아났다**.
- **`@font-face` 189개 정리** — 3개 패밀리의 unicode-range 샤드. 낭비 아님, 렌더 블로킹도 아님.
- **부트 베일 조건 변경** — 사용자가 유지 선택 + `dc6129747` 의 53→30 전례.
- **`cosmic-main.css` 통짜 지연** — `8fc05dd53` 이 CLS 로 기각.
- **소스 `index.html` 구조 변경** — 문자열로 읽는 verify 61개, 함수 본문을 중괄호로 잘라 쓰는 것 19개.

---

## 4. 지금까지 고친 것과 그 근거

### 4-1. CSS 분할 (커밋 `a8565083a`)

**원인**: `styles/fortune-ui.css` 474KB 를 홈이 첫 페인트 전에 통째로 받았다. RecalcStyle 이 메인스레드 task 시간의 **88%** 이고, dist 에서 이 시트만 빼면 **38,307 → 21,733ms**(밴드 비겹침).

**통째로 뺄 수는 없다** — 비우면 모바일 computed style 1,621건이 달라지고 `#fsnNavBar`(`pointer-events:none`→`auto`)·`#destinyFlowerStudioSheet`(`opacity 0`→`1`)가 드러나는 기능 회귀가 난다.

**처방**: `scripts/build-fortune-ui-critical.mjs` 신설. 실제 렌더에서 `element.matches()` 가 참인 규칙만 **4셀(모바일/데스크탑 × 연이/네오) 합집합**으로 모아 `styles/fortune-ui-home.css`(1,077 규칙)를 만들고, 홈은 그것을 먼저 받고 **전체 시트는 `data-cd-noncritical-style-src` 로 미룬다**(사라지는 게 아니라 늦게 온다). JS off 는 `noscript` 가 전체 시트(상위집합) 한 줄로 덮는다.

**결과**(동일 DOM A/B, 모바일 5회 중앙값): score **45 → 49** · FCP 3,152 → **2,770** · LCP 4,956 → **4,060** · TBT 2,071 → 2,394. 시각 파리티 4/4 통과.

🔴 **생성기가 맞춰야 했던 4가지 — 전부 실패로 발견했다. 되돌리지 말 것:**
1. 테마 키가 셸의 `NEO_KEY`(`fortuneThemeModeStateV1`)와 같아야 한다. 아니면 `body.neo-mode` 규칙이 통째로 빠진다.
2. 자식을 가진 at-규칙(`@keyframes`·`@layer`)은 순회하지 말고 **통째로** 내보낸다. 아니면 transform 이 죽고 flower studio 시트가 드러난다.
3. 합집합을 **시트 원래 순서로 정렬**한다. 아니면 데스크탑 전용 규칙이 뒤로 밀려 `font-weight` 를 이긴다.
4. **생성기가 전체 시트를 스스로 붙여야 한다.** 셸이 지연 로드로 바뀐 뒤로는 6초 안에 CSSOM 에 없어서 **재생성이 0규칙을 뽑는다**(0규칙 가드가 덮어쓰기를 막았다). 시트 필터도 `/styles/fortune-ui.css` 로 정확히 — `fortune-ui.css` 부분일치는 우리가 만든 `fortune-ui-home.css` 까지 잡는다.

🔴 **`styles/fortune-ui.css` 를 수정하면 `node scripts/build-fortune-ui-critical.mjs` 로 재생성 + `npm run sync:public`.**

### 4-2. 하단 내비 옵저버 (커밋 `0ebc10a21`)

**원인**: 하단 내비가 `document.body` 를 `childList+attributes+subtree` 로 관찰해, **하이드레이션이 거는 class/style 변경마다** `update()` 가 돌았다. `update()` 는 `getComputedStyle`·`offsetWidth` 로 오버레이를 훑는다.

**ablation (동일 요소 수, 로컬 dist, 모바일 3회 중앙값)**

| 변형 | score | TBT |
|---|---:|---:|
| 베이스라인 | 48 | 1,724 (1,690–1,735) |
| 내비 스크립트 통째 제거 | 52 | 1,200 (1,158–1,300) |
| body 옵저버만 분리 | 52 | 1,282 (1,206–1,460) |
| **옵저버 유지 · 콜백만 빈 함수** | 52 | **1,271** (1,238–1,291) |

마지막 줄이 핵심이다 — **관찰은 싸고, `update()` 를 도는 것이 비싸다.**

🔴 **실패한 대안 2가지(재시도 금지, 코드 주석에도 남김)**
- `childList` 만 빼고 `attributes+subtree` 유지 → TBT **1,791ms** (효과 없음)
- 콜백에서 오버레이 변이만 필터 → TBT **1,656~1,723ms** (`matches()` 비용이 `update()` 비용을 대체할 뿐)

**처방**: 관찰 범위 자체를 좁힌다. 오버레이 루트는 기존 per-node 옵저버가 정확히 보고, body 는 **직계 childList 만**(subtree 아님) 관찰해 그때 per-node 옵저버를 재바인딩한다. 재바인딩은 `load` 와 첫 `pointerdown` 에도 건다. 오버레이 셀렉터는 상수 하나로 합쳐 `isVisible()` 과 옵저버가 같은 기준을 쓰게 했다.

**결과** — 모바일 48 → **51** · TBT 1,724 → **1,347**(1,326–1,436) / 데스크탑 80 → **82** · TBT 223 → **161**(142–212, 5회). 양쪽 다 밴드 비겹침.

---

## 5. 🔴 다음에 할 일 (우선순위 · 측정 근거 포함)

### N1. 셸 인라인 부트 스크립트 태스크 분할 — **가장 큰 남은 지렛대**

TBT 1,347ms 의 남은 출처(모바일 롱태스크, 프로덕션 실측):

| 롱태스크 | 길이 | 비고 |
|---|---:|---|
| 문서 자체(`https://code-destiny.com/`) | **690–842 ms** | 셸 인라인 스크립트. bootup 4,605ms |
| `s-884dcf881587689b.js` | 300 ms | auth 부트 신호 — 블로킹 유지 필요 |

**TBT 는 태스크당 50ms 초과분만 센다.** 800ms 태스크 하나는 750ms 를 물지만 같은 일을 50ms 짜리 16개로 나누면 **0ms** 다. 일을 줄이지 않고 쪼개기만 해도 **−600~750ms** 가 기대된다.
레포도 이미 이 사실을 기록해 뒀다 — 하단 내비 주석: *"작은 태스크 여러 개가 큰 태스크 몇 개보다 유리하다"*(150ms 스로틀이 CPU 는 줄였는데 데스크탑 TBT 는 206 → 282ms 로 **악화**한 실측).

**방법**: 부팅 시점에 꼭 필요하지 않은 인라인 블록을 `setTimeout(fn, 0)` / `requestIdleCallback` / `scheduler.yield` 로 넘긴다.
🔴 **블로킹 유지 5개는 옮기지 말 것**: `s-a912e5da6adadd69`(`window.fetch` 교체) · `s-7bcdba92aaa3009d`(히어로 마크업 주입→지연 시 CLS) · `s-49eb61aeb0e25642`(히어로 문구 교체) · `s-884dcf881587689b`(auth 부트 신호→베일 지연) · `s-a99efd85dbb93094`(내비 재부모화).
🔴 **FCP 를 더 당기면 TBT 가 더 나빠질 수 있다**(§7 메커니즘). 분할은 작업량을 옮기는 것이라 안전하지만, 함께 `defer` 를 늘리는 것은 별개 라운드로.

### N2. 잔여 강제 동기 레이아웃 — −150ms 규모

`perf:home` 의 `Forced synchronous layout` 표(프로덕션 실측): `s-0b7dc2b6e9301fdf.js:0:2466` **139ms** · `js/mobile-interaction-patch.js:1:7756` 25ms · `js/core/index-inline-runtime.js:7:77189` 24ms.
🔴 이름이 뜬다고 범인 확정이 아니다 — **ablation 으로 확인할 것**(§3-1).

### N3. Style & Layout ~6,000ms 축소 — 큰 작업, 마지막

🔴 **비용은 "시트에 있는 규칙 수"가 아니라 "매칭되는 규칙 수"에 붙는다.** 안 쓰는 2,600 규칙을 걷어냈는데 RecalcStyle 은 **−13%** 였다(38,307 → 33,222). 전체 제거가 −43% 였던 것은 매칭되는 규칙까지 같이 없앴기 때문이다. 안 맞는 규칙은 해시 버킷에서 싸게 걸러진다.

그래서 남은 지렛대는 CSS 다이어트가 아니라 **매칭 대상 자체**다:
- **매칭 규칙이 가장 많은 표면은 셸의 인라인 CSS — 1,992 규칙**(`cosmic-main.css` 540 · `core-ui.css` 171 · `fortune-ui.css` 228). 그리고 **깊이 4 이상 셀렉터 1,981개 중 1,548개가 그 인라인**이다.
- **요소 수 축소(L6)** — 2,164 요소. 비용은 `매칭 규칙 × 요소` 다. 사용자 승인 범위이며 조건은 **"숨기기가 아니라 하단 탭 + 전체 기능 시트로 흡수"**. PR 에 축소 항목 수 + 접근 경로 표 필수.

### N4. `content-visibility` 재시도 — 조건부

`18e28782e` 가 데스크탑 LCP −365ms 를 실측했는데 `d29310c4a` 로 되돌아갔고 **사유가 레포 어디에도 없다.**
🔴 **착수 전 사용자에게 "그때 무엇이 보였는지" 먼저 물을 것. 아직 안 물어봤다.**

---

## 6. 검증 절차

### 라운드마다

```bash
npm run build:cf
npm run perf:home -- --runs=5 --preset=both --label=<R>
npm run perf:style-cost -- --runs=3 --preset=mobile --label=<R>
node scripts/verify-home-visual-parity.mjs --snapshot --label=<R>
node scripts/verify-home-visual-parity.mjs --compare=<이전>,<R> --noise=<R>,<R2>
MOBILE_CDP_TARGET=dist npm run verify:mobile-cdp-smoke
npm run typecheck && npm run lint
npm run verify:public-parity && npm run verify:locale-main-sync && npm run verify:payment-freeze
npm run verify:mobile-detail-nonintrusive && npm run verify:mobile-detail-render && npm run verify:hero-contrast
```

**판정 규칙(사전 고정)**: 5회 중앙값이 베이스라인 **min~max 밴드 밖**일 때만 개선으로 인정. 주 지표 **TBT·LCP**.
**배포 후**: `perf:home --url=https://code-destiny.com` + **사용자에게 PSI 1회 요청**.

### 🔴 시각 동일성 검증기 사용 시 반드시 알아야 할 것

1. `*{animation:none!important}` 는 **안 먹는다** — `*` 는 특이도 0.
2. 재생속도 0 도 부족. 현재 방식: `anim.currentTime=0; anim.pause()` + `svg.setCurrentTime(0)`.
3. 남는 흔들림은 `--noise=<A>,<B>`(같은 dist 두 벌)로 **측정해서** 제외. 손으로 무시 목록 쓰지 말 것.
4. `background-image` 는 문자열이 아니라 **실제 렌더**로 비교한다.
5. 🔴 **요소 수가 바뀌면 비교가 무의미하다** — 이 도구는 **인덱스로 짝을 맞춘다.** `<link>` 하나만 늘어도 허수 14,541건이 난다. **CSS 를 죽이려면 태그를 지우지 말고 파일 내용을 비울 것.** A/B 는 요소 수를 맞춰서 할 것(예: preload href 만 부분집합↔전체 시트로 바꾸기).
6. 🔴 **노이즈 기준선은 같은 빌드에서 뽑아야 한다.** 다른 빌드의 노이즈 쌍을 쓰면 `<img>` 서브픽셀 흔들림이 회귀로 오독된다(실제로 한 번 그랬다).

### ablation 요령

- `dist` 를 직접 고쳐도 된다(다음 빌드가 덮어쓴다). 백업 후 반드시 복원할 것. `dist/` 는 커밋 대상이 아니다.
- 스크립트 블록을 통째로 끄려면 **`dist/index.html` 에서 그 `<script src>` 태그를 지운다** — 미니파이 코드를 건드리지 않아 깔끔하다.
- 미니파이 청크 안을 고쳐야 하면 문자열 치환으로 하고, 원본을 `/tmp` 에 백업해 두었다가 되돌린다.

---

## 7. 배경 — 왜 점수가 떨어졌나 (규명 완료, 재조사 금지)

`dc6129747` 본문:
> 베일이 덮여 있으면 FCP 가 늦어지고, TBT 는 정의상 **FCP 이후의 롱태스크만** 세므로 같은 작업량이 점수에서 빠진다. 베일을 걷으면 원래 있던 메인스레드 점유가 그대로 드러난다.

부트 베일이 FCP 를 메인스레드 폭풍 뒤로 미뤄 TBT 를 숨기고 있었다. 이후 배포된 최적화들(externalize·JS minify·CSS minify)이 **작업량은 그대로 둔 채 FCP 만 앞당겨** 숨어 있던 작업이 계상되기 시작했다.
사용자가 *"예전에는 아주 쾌적했었어"* 라고 한 것과도 맞는다 — 그때는 같은 작업이 TBT 창 **밖**에 있었을 뿐이다. 그래서 **롤백은 무의미하다**(FCP 가 다시 늦어져 TBT 가 숨겨질 뿐).

**프로덕션 베이스라인** (`084ef01b0c25`, 모바일 5회 중앙값, 2026-08-15): score **39**(35–42) · FCP 5,119 · LCP 6,696 · TBT 1,216(832–1,722) · CLS 0.038 · SI 6,609.
메인스레드: Style & Layout **6,698** · Other 2,022 · Script Evaluation 1,110 · Rendering 632.
LCP 분해: TTFB 302ms + **Element render delay 781~1,060ms** + resource load delay **0ms**.

**목표 역산** (TBT 30% · LCP 25% · CLS 25% · FCP 10% · SI 10%)

| 지표 | 현재(프로덕션) | 목표 |
|---|---|---|
| TBT | 1,216 ms | ≤ 600 ms |
| LCP | 6,696 ms | ≤ 4,000 ms |
| CLS | 0.038 | 유지 |
| FCP | 5,119 ms | ≤ 3,000 ms |
| SI | 6,609 ms | ≤ 5,000 ms |
| | **39** | **~63** |

---

## 8. 이 레포 고유의 작업 규칙

1. 🔴 **성능 최적화는 `dist` 단계에서만.** 소스 `index.html` 구조를 바꾸면 문자열 가드 61개가 깨진다. 정본 자리는 `scripts/run-postbuild.mjs` 의 `verify-adsense-readiness` **뒤** steps(`externalize-dist-inline-scripts` → `minify-dist-js` → `minify-dist-css`).
2. `index.html` 을 고쳤으면 **`npm run sync:public`**. 미러는 **6벌**(`public/index.html`·`public/static/`·`public/{en,ja,zh,zh-tw}/`) 이며 전부 루트에서 **생성**된다 — 미러를 손으로 고치지 말 것. `sync:public` 은 셸 전역 `?v=` 캐시키를 재생성하므로 diff 가 커진다(정상).
3. `sitemap.xml`·`public/sitemap.xml` 의 `lastmod` 는 빌드 부산물. 커밋 금지 — `git checkout -- sitemap.xml public/sitemap.xml`.
4. 격리된 **git worktree** 에서 작업(동시 세션이 디렉터리 공유).
5. **머지는 사용자가 한다. PR 까지만.**
6. 🔴 **CI 에 새 게이트 금지**(사용자 지시). 새 `verify:*` 는 `scripts/verify-guard-wiring.mjs` 의 `UNWIRED_BY_DESIGN` 등재 의무가 생기므로 **측정 도구는 `perf:*` 로 이름 지을 것**.
7. 🔴 **main 이 빠르게 움직인다.** 이 브랜치는 이미 두 번 뒤처져 병합했다(#663~#666). 셸·미러·캐시키를 건드리는 PR 이라 충돌이 잦다 — **병합 후 반드시 `sync:public` → `build:cf` → 부분집합 재생성 → 파리티 재확인** 순으로 다시 검증할 것. 홈 DOM 이 바뀌면 `fortune-ui-home.css` 도 바뀌어야 한다.
8. 🔴 **`/cdn-cgi/image/` 는 zone 기능이라 로컬·`*.pages.dev` 프리뷰에서 404**(`scripts/deploy-smoke.mjs:68-74`). 새 `/cdn-cgi/` 태그에는 정본 `onerror` 폴백(`dataset.cdImgFallback` 가드 + `removeAttribute('srcset')`)이 **필수**다.

---

## 9. 도구

| 명령 | 파일 | 용도 |
|---|---|---|
| `npm run perf:home` | `scripts/measure-home-lighthouse.mjs` | 로컬 dist brotli Lighthouse. **`--url=` 로 프로덕션도 가능(키 불필요)**. LCP 요소·LCP 단계 분해·실제 로드된 이미지·이미지 절감 여지·**강제 동기 레이아웃(소스 위치별)** 을 함께 낸다 |
| `npm run perf:style-cost` | `scripts/measure-home-style-cost.mjs` | CDP 로 RecalcStyleCount/ms·LayoutCount·DOM 인구조사·실제 매칭 규칙 수. **Lighthouse 보다 노이즈가 훨씬 작다** |
| `node scripts/verify-home-visual-parity.mjs` | 동명 파일 | 4셀 computed style 전수 + scrollHeight + 스크린샷 |
| `node scripts/build-fortune-ui-critical.mjs` | 동명 파일 | 홈 CSS 부분집합 재생성(4셀 합집합) |

🔴 **감사 id 가 Lighthouse 13 에서 갈렸다.** `largest-contentful-paint-element` 는 **없어졌고**, `lcp-discovery-insight` 는 **LCP 가 이미지일 때만** 값이 있으며(텍스트 LCP 면 `lcp-breakdown-insight` 만 답한다), `uses-responsive-images` 는 `image-delivery-insight` 에 흡수됐다. **한쪽만 보면 실패하지 않고 조용히 빈 값이 나온다.** 세 id 를 순서대로 훑도록 해 뒀다.
🔴 `slow-css-selector-insight` 는 LH13 에 **존재하지만 구현이 비어 있다**(`// TODO: implement`). 기대하지 말 것.
🔴 감사 `details.items` 가 **항상 배열은 아니다**(체크리스트는 객체). `Array.isArray` 로 막지 않으면 **데스크탑 프리셋이 죽는다** — 실제로 죽었고 `0ebc10a21` 에서 고쳤다.

---

## 10. 별건 (이 작업과 무관, 확인 권장)

- 🔴 `MOBILE_CDP_TARGET=dist npm run verify:mobile-cdp-smoke` 가 실패한다:
  `Tap point occluded for .moon-preview-card[href="/tarot/mingri"]: top element is div.cd-pwa-install-prompt__backdrop`
  **변경 전 변형에서도 동일하게 재현**되므로 이 PR 원인이 아니다. PWA 설치 배너 배경이 홈 카드 탭을 가린다는 뜻이라 실사용 영향 가능성이 있다.
- 엣지가 **404 를 2일간 캐시**하는 대시보드 Cache Rule 이 아직 살아 있다(`/js/shell/` 404 응답에 `max-age=172800`). `_headers` 에는 그 값이 없다.

---

## 11. 근거를 못 찾으면

추측으로 메우지 말고 **사용자에게 물을 것.** 이 레포에서 가장 큰 사고가 그 형태였다(상세 팝업에 지어낸 결과 예시).
