# 인수인계 — 모바일 홈 셸 성능

> 2026-08-15 작성. 이 문서만 읽고 이어서 시작할 수 있게 쓴다.

## 왜 하는 작업인가

사용자 요구 원문:

> 현재 모바일 성능이 너무 낮은데 ui/ux는 유지하면서도 표시되는 요소들은 최대한 줄여서 최대한 가볍고 빠르고 쾌적하게 만드는 방법이 없을지 한번 분석해줘 언제나 실측으로 해야하고 실제로 배포 후 검증까지도 진행되어야해

사용자가 확정한 범위(질문으로 확인):
1. **홈 정적 셸(`/`) 우선**
2. **보이는 화면은 100% 동일** — 안 보이는 DOM/CSS 만 손댄다. 모바일에서 섹션을 줄이는 것은 선택하지 않았다.
3. **로컬 전후 측정 + 배포 후 프로덕션 측정** 둘 다

과거에 이 작업이 두 번 되돌아갔다: `d29310c4a`(← `18e28782e`, 오프스크린 containment), `dc6129747`(← `8fc05dd53` 의 부트 게이트 조건). 그래서 이번에는 **시각 동일성 증명 장치를 먼저 만들고** 그 뒤에만 코드를 고친다.

## 이미 끝난 것 (다시 하지 말 것)

브랜치 `perf/dist-css-minify` (origin/main `8d46e8cdf` 기준), 워크트리 `.claude/worktrees/perf-home-shell`.

| 파일 | 상태 | 내용 |
|---|---|---|
| `scripts/measure-home-style-cost.mjs` | 신규 | `perf:style-cost` — CDP 로 RecalcStyleCount/LayoutCount/DOM 인구조사/CSS 규칙 매칭수. playwright(선언된 dep) 사용 |
| `scripts/verify-home-visual-parity.mjs` | 신규 | 시각 동일성 증명기. 4셀(모바일/데스크탑 × 연이/네오) computed style 전수 + scrollHeight + 스크린샷 |
| `scripts/minify-dist-css.mjs` | 신규 | **1단계** — dist 의 외부 CSS + 인라인 `<style>` 미니파이 |
| `scripts/run-postbuild.mjs` | 1줄 추가 | 위 스크립트를 steps 마지막에 배선 |
| `package.json` | 1줄 추가 | `perf:style-cost` |

🔴 `sitemap.xml`·`public/sitemap.xml` 의 `lastmod` 변경은 **빌드 부산물**이다. 커밋하지 말고 `git checkout -- sitemap.xml public/sitemap.xml`.

## 실측된 것 (전부 이 세션에서 직접 측정, 2026-08-15)

### 베이스라인 — `npm run perf:home -- --runs=5 --preset=mobile`
```
Performance 44 (44–45) · FCP 3,601ms · LCP 5,406ms · TBT 1,457ms (1,356–1,535) · CLS 0.001 · SI 5,101ms
메인스레드:
  Style & Layout               5,821ms   ← 예산의 본체
  Other                        1,681ms
  Script Evaluation              884ms
  Rendering                      593ms
  Parse HTML & CSS               208ms
  Script Parsing & Compilation   140ms
```
커밋 `18e28782e` 에 기록된 과거 트레이스(Style & Layout 5,361 / Script Eval 900)를 그대로 재현했다. **진단은 유효하다.**

### 🔴 가장 큰 단일 CPU 소비자 — 아직 손대지 않았다

`perf:home` 의 bootup-time 상위:
```
2,974ms   9KB   /js/shell/s-61d550aa8640e310.js   ← 롱태스크 1,249ms 도 이 파일
2,889ms   --    /  (셸 문서에 남은 인라인 스크립트)
  969ms   7KB   /js/shell/s-49eb61aeb0e25642.js
  615ms 298KB   /js/shell/s-e75bdf4c8f3c0f23.js
```
`s-61d550aa8640e310.js`(8,833B)는 `externalize-dist-inline-scripts` 가 셸에서 빼낸 **모바일 하단 내비 상태기**다. 소스 위치는 `index.html` 의 `cdMobileBottomNav` 블록.

**메커니즘(코드를 열어 확인함):**
- `update()` (`index.html:16157-16168`): `document.body.classList.toggle(...)` **쓰기** → `overlayOpen()` **읽기** → 강제 동기 레이아웃
- `overlayOpen()` (`index.html:16021-16030`): `overlayIds` 18개 + `document.querySelectorAll('[role="dialog"],[aria-modal="true"],…')` 결과 전부에 `isVisible()`
- `isVisible()` (`index.html:16005-16019`): `matches()` 게이트를 통과한 노드마다 `getComputedStyle` + `offsetWidth`. 같은 함수 주석에 **"부팅 중 오버레이 18개에 대해 매 프레임 돌아 2.4초를 썼다 — 2026-08-14 실측"** 이 이미 적혀 있다. `51d3569a7` 이 `matches()` 를 앞으로 옮겨 줄였지만 `[role="dialog"]` 8개 등은 여전히 게이트를 통과한다.
- `schedule()` (`index.html:16169-16172`): rAF 로 프레임당 1회 코얼레싱
- 발화원 2개가 **같은 일을 이중으로** 한다 (`index.html:16303-16315`):
  1. 오버레이별 전용 옵저버 — `attributeFilter:['aria-hidden','class','style','data-mode']`, 정확하고 저렴
  2. `document.body` 전역 옵저버 — `{childList:true, attributes:true, subtree:true}`, **모든 DOM 변경**에 발화

**🔴 스로틀은 금지 경로다.** `index.html:16290-16295` 주석에 실측이 있다 — 150ms 스로틀로 이 블록 CPU 는 2,429→1,790ms 로 줄었는데 **데스크탑 TBT 는 206→282ms 로 악화**했다(변이를 모으면 태스크가 길어지고 TBT 는 태스크당 50ms 초과분만 센다). 그러니 **"덜 자주"가 아니라 "덜 읽기"** 로 고쳐야 한다.

**제안하는 고침 (미구현):** `update()` 를 두 갈래로 나눈다.
- `updateCheap()` — `fullscreenShellOpen()`(인라인 `style.display` 읽기, 무료) + `setActive(activeKey())`(URL 기반). body 전역 옵저버·scroll·popstate·hashchange 는 이쪽만 부른다.
- `updateOverlay()` — `overlayOpen()` 을 부르는 비싼 쪽. **오버레이 전용 옵저버**·`cd:collection-toggle`·클릭에서만 부른다.
- body 전역 옵저버 콜백에서 `records` 를 훑어 오버레이 셀렉터에 해당하는 변경이면 `updateOverlay()` 로 승격한다(`matches()` 는 레이아웃을 강제하지 않으므로 안전). 나중에 동적으로 생성되는 오버레이를 놓치지 않기 위한 안전망이다.

이건 **새 장치를 만드는 게 아니라 이미 있는 두 장치의 중복을 푸는 것**이다(CLAUDE.md 원칙 6).

**착수 전 필수:** `index.html` 을 고치면 `npm run sync:public` 으로 셸 7벌 전파. 검증은 `verify:mobile-cdp-smoke` 가 이 블록의 계약(`navDisplay`·`navPointerEvents`·`navAriaHidden`)을 직접 단언하므로 **여기서 회귀가 잡힌다**.

### 셸 구조 실측
| 항목 | 값 |
|---|---|
| `dist/index.html` | 1,478,403 B (미니파이 전) |
| 인라인 CSS | 836,713자 · 81 블록 · 4,216 규칙 · `!important` 6,171 · `@media` 189 |
| 렌더 블로킹 외부 CSS | 6개 420,287 B (cosmic-main 270,931 이 64%) |
| 렌더 블로킹 외부 JS | 23개 692,617 B (상위 2개가 526,359) |
| 첫 페인트 이후 스타일시트 삽입 | **13회** (fortune-ui swap, fonts-serif print-swap, 지연로더 11개 순차) |
| 마크업 요소(정적) | ~4,219 (parse5 기준 4,294) |
| 런타임 요소(모바일, load+8s) | **2,524** — 기존 lazy-mount 장치가 오버레이를 떼어냈다 |
| 런타임 요소(데스크탑) | 4,813 — 데스크탑은 아무것도 안 뗀다 |

### `unused-css-rules` (Lighthouse, 베이스라인)
```
110KB wasted  fortune-ui.css   (609KB 중)
 23KB wasted  cosmic-main.css  (271KB 중)
 14KB wasted  fonts-serif.css
```
→ **데드 CSS 제거는 큰 레버가 아니다.** 대부분의 규칙은 실제로 쓰인다.

## 남은 작업 (우선순위 순)

| # | 레버 | 근거 | 위험 | 상태 |
|---|---|---|---|---|
| 1 | **하단 내비 상태기 읽기 분리** (위 참조) | CPU 2,974ms 실측 — 단일 최대 | 중(동작 로직) | **미착수. 가장 큰 값.** |
| 2 | 지연 CSS 11개를 postbuild 에서 1개로 병합 | 첫 페인트 후 재계산 삽입 13→2 | 하 (선언 순서 보존 = 캐스케이드 동일) | 미착수 |
| 3 | `annotateAll` 코얼레싱 | `index.html:36179` body 전역 옵저버가 코얼레싱 없이 오버레이 18개에 속성 재기록 | 하 | 미착수 |
| 4 | 오버레이 전용 인라인 CSS 를 dist 에서 지연 로더로 | Parse HTML&CSS 208ms 와 셸 재전송분만 — Style&Layout 은 거의 안 준다 | 상 | **하지 말 것을 권함**(값 대비 위험) |

🔴 **하지 않기로 한 것**: 부트 베일(`cd-boot-gate`) 조건 변경(`dc6129747` 이 사용자 판단으로 확정한 트레이드오프), `cosmic-main.css` 통짜 지연(`8fc05dd53` 이 CLS 로 기각, 1,116 규칙 중 488~843 이 레이아웃을 나름), Next.js 라우트 번들(홈은 정적 셸이라 무관), 소스 `index.html` 구조 변경(가드 61개가 문자열로 읽는다).

## 이 레포 고유의 작업 규칙

1. 🔴 **성능 최적화는 `dist` 단계에서만.** `index.html` 을 읽는 verify 스크립트가 **61개**, 그중 함수 본문을 중괄호 균형으로 잘라 쓰는 것이 **19개**다(`scripts/externalize-dist-inline-scripts.mjs:1-30` 의 2026-08-14 실측). 소스에서 인라인 블록을 빼내면 가드가 줄줄이 깨진다. 정본 자리는 `scripts/run-postbuild.mjs` 의 `verify-adsense-readiness` **뒤** steps 다.
2. `index.html` 을 고쳤으면 `npm run sync:public` 으로 셸 7벌 전파.
3. `config/payment-freeze.json` 등재 함수(`_cdChooseServicePaymentMode`/`_cdRunDirectKrwCheckout`/`_cdOpenPaidServiceGate`)를 건드리면 `verify:payment-freeze` 가 실패한다. 위 레버 중 그 함수를 건드리는 것은 없다 — **걸리면 `--update` 가 아니라 변경을 되돌린다.**
4. 격리된 git worktree 에서 작업한다(동시 세션이 작업 디렉터리를 공유한다).
5. 머지는 사용자가 한다. PR 까지만 만든다.
6. 🔴 **CI 에 새 게이트를 붙이지 않는다** (사용자 지시). 새 `verify:*` 스크립트를 만들면 `scripts/verify-guard-wiring.mjs` 의 `UNWIRED_BY_DESIGN` 에 사유와 함께 선언해야 한다 — 그래서 측정·증명 도구는 `perf:*` 로 이름 짓는다(그 가드는 `verify:` 로 시작하는 키만 센다).
   - 🔴 예외: `scripts/verify-home-visual-parity.mjs` 는 `verify-` 로 시작하지만 **npm 스크립트 키가 없다.** `verify-guard-wiring` 은 package.json 의 `verify:*` **키**를 세므로 걸리지 않는다. npm 스크립트로 승격하려면 그때 `UNWIRED_BY_DESIGN` 에 선언할 것.

## 검증 명령

```bash
# 0) 반드시 먼저 — dist 가 낡으면 두 측정기 모두 fail-closed 로 거부한다
npm run build:cf

# 1) 성능 (5회 중앙값). 판정선: 중앙값이 베이스라인 min~max 밖으로 나가야 개선으로 인정
npm run perf:home -- --runs=5 --preset=mobile --label=<단계명> --out=<tmp>
npm run perf:style-cost -- --runs=3 --preset=mobile --label=<단계명>

# 2) 시각 동일성 — 이번 작업의 성패
node scripts/verify-home-visual-parity.mjs --snapshot --label=before
node scripts/verify-home-visual-parity.mjs --snapshot --label=before2   # 노이즈 기준선용
(변경 적용 + 재빌드)
node scripts/verify-home-visual-parity.mjs --snapshot --label=after
node scripts/verify-home-visual-parity.mjs --compare=before,after --noise=before,before2

# 3) 기존 가드
npm run typecheck && npm run lint
npm run verify:public-parity && npm run verify:locale-main-sync
npm run verify:payment-freeze && npm run verify:payment-choice-parity
npm run verify:checkout-pass-card && npm run verify:paid-gate-ui
npm run verify:mobile-detail-nonintrusive && npm run verify:mobile-detail-render
npm run verify:hero-contrast
MOBILE_CDP_TARGET=dist npm run verify:mobile-cdp-smoke

# 4) 배포 후 프로덕션 (API 키 불필요 — --url 이 외부 URL 을 받는다)
npm run perf:home -- --url=https://code-destiny.com --runs=5 --preset=mobile --label=prod-after
```

### 🔴 시각 동일성 검증기를 쓸 때 알아야 할 것

같은 dist 를 두 번 찍어도 값이 달랐다. 두 번 실패한 뒤 원인을 찾았으니 반복하지 말 것:

1. **`*{animation:none!important}` 는 안 먹는다.** `*` 는 특이도 0 이라, 클래스 선택자로 선언된 `animation` 이 그대로 이긴다(`!important` 끼리는 특이도로 갈린다).
2. **재생속도 0 도 부족하다.** 멈추기는 하지만 **멈추는 지점**이 회차마다 달라 값이 여전히 다르다.
3. 지금 쓰는 방법은 **시각 0 으로 되감고 멈추기** — `anim.currentTime = 0; anim.pause()` + `svg.setCurrentTime(0); svg.pauseAnimations()`. 특이도와 무관하고 회차마다 같다.
4. 그래도 남는 흔들림은 `--noise=<labelA>,<labelB>`(같은 dist 두 벌)로 **측정해서** 제외한다. 손으로 무시 목록을 쓰지 말 것 — 그 목록이 곧 거짓말이 된다(원칙 11).
5. 흔들리던 요소들: `.logo-star`, `.moon-hero__petal`, `.cd-atmos__layer--near`(`animation:cdAtmosTwinkle 9s infinite`), `.cd-cookie-consent__moon`(`cdCookieMoonFloat 4.2s`), `#fsnDecoL/R`, SVG `<circle>`. 전부 CSS 애니메이션이다.
6. **스크린샷 해시는 보조 신호다.** 판정은 computed style + scrollHeight 로 한다(헤드리스 폰트 래스터라이즈 편차 때문).

## 근거를 못 찾으면 추측하지 말고 물어라

특히 이 두 가지는 저장소 안에서 답을 못 찾았다:
1. **`d29310c4a` 가 `18e28782e`(오프스크린 containment)를 되돌린 이유.** 되돌림 커밋 메시지가 `This reverts commit …` 한 줄뿐이고, `CLAUDE.md`·`AGENTS.md`·`docs/**` grep 에도 없다. containment 를 재시도하려면 **먼저 사용자에게 "그때 무엇이 보였는지"를 묻고**, 그 현상을 `verify-home-visual-parity` 의 단언으로 심은 뒤에 착수한다.
2. `PAGESPEED_API_KEY` 레포 시크릿의 존재 여부. 없으면 `perf:psi:audit` 은 **exit 0 으로 조용히 건너뛴다**(`scripts/psi-lighthouse-audit.mjs:57-65`) — 배포 후 검증에 쓸 때는 `PSI_FAIL_ON_API_KEY_ERROR=true` 를 붙여 "건너뜀"이 "통과"로 보이지 않게 할 것. 다만 위 4)의 `perf:home --url=` 이 키 없이도 프로덕션 Lighthouse 를 돌리므로 PSI 는 보조다.
