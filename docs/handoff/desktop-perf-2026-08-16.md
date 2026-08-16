# 인수인계 — 데스크탑 홈 성능 (2026-08-16)

> 모바일 INP 라운드(`docs/handoff/inp-round3-2026-08-16.md`, 5라운드까지)는 **끝났다.**
> 이 문서는 **데스크탑 홈** 최적화를 처음부터 시작하는 세션을 위한 것이다.
> 🔴 **이 문서만 읽고 시작할 수 있게** 쓴다. 수치는 전부 아래 §2 의 명령으로 재현된다.

---

## 0. 30초 요약

- 🔴 **데스크탑의 병목은 모바일과 다르다.** 모바일은 TBT(1,431ms)였지만
  **데스크탑은 TBT 373ms 로 이미 괜찮고, LCP 2,410ms 가 문제다.**
  모바일에서 통했던 `content-visibility` 식 접근을 그대로 가져오면 헛돈다.
- LCP 2,410ms 의 내역: **리소스 로드 1,141ms + 요소 렌더 지연 493ms**. 둘 다 봐야 한다.
- 근거가 확실한 후보 3개(§3): **① 리사이즈를 안 거치는 이미지 4개(≈221KB 낭비)**
  **② 데스크탑 전용 강제 리플로우 221ms 한 지점** **③ 데스크탑에 실려 오는 모바일 전용 CSS 11KB**.
- 🔴 **데스크탑 INP 는 잴 도구가 없다**(§4). `perf:interaction`·`perf:tap-cost` 가 모바일 뷰포트로
  하드코딩돼 있다. INP 를 건드릴 거면 **도구 확장이 1번 작업**이다.
- 🔴 이 레포에서 가장 큰 사고는 전부 "문서에 적힌 근거가 실측과 달랐던 것"이다. 직전 라운드에서만
  그런 전제가 4개 나왔다. **§5 를 착수 전에 읽어라.**

---

## 1. 작업 환경

- **워크트리**: `D:\Development\codedestiny-worktrees\inp-p1` (`node_modules` 정션 보유).
  🔴 기본 디렉터리 `D:\Development\code-destiny` 는 **다른 세션이 붙어 있다** — 거기서 작업하지 말 것.
- **브랜치**: `origin/main` 에서 딴다. `index.html` 이나 `js/core/*` 를 건드리는 PR 이 동시에 열려 있으면
  `sync:public` 이 미러 6벌 + `?v=build-…` 를 재생성하므로 **100% 충돌한다** — 그때는 앞 브랜치 위에 쌓아라.
- **머지는 사용자가 한다. PR 까지만.**
- 커밋 전 되돌릴 빌드 부산물 6개: `rss.xml` · `sitemap.xml` · `insights/rss.xml` + 그 `public/` 사본.
- 커밋 전 `git diff -- index.html | grep -E "^\+.*\\\\u[0-9a-fA-F]{4}"` 로 한글 이스케이프 유입 확인.
- `index.html` 의 **구조**(`data-marker`·id·태그 배치)는 바꾸지 않는다 — `verify-*.mjs` 74개가 문자열로 단언한다.

---

## 2. 🔴 데스크탑 기준선 실측 (2026-08-16)

재현 명령 (`dist` 를 먼저 `npm run build:cf` 로 만든다):

```bash
npm run perf:home -- --preset=desktop --runs=5 --label=<라벨> --out=<경로>
```

측정 대상은 `main` `f2b5d6d2b` + PR [#705](https://github.com/rei1237/codedestiny/pull/705)
(모바일 전용 `content-visibility`, `html.cd-mobile-runtime` 게이트라 **데스크탑에는 영향이 없다**).
#705 는 그 뒤 `e2082ae4b` 로 머지됐으므로 **이 수치는 지금 main 의 데스크탑 상태**다.
Lighthouse desktop 프리셋(1440×1000).

🔴 **이 문서의 `index.html` 줄 번호는 전부 `main` `b8924a124` 기준이다.** 이 파일은 자주 밀리므로
좌표가 안 맞으면 **함께 적어 둔 grep 문자열로 다시 찾아라.** (앞 라운드 사고의 대부분이 밀린 좌표였다.)

| 지표 | 중앙값 | min–max |
|---|---:|---|
| Performance | 68 | 63–83 |
| FCP | **617ms** | 613–622 |
| **LCP** | **2,410ms** | 2,186–2,533 |
| TBT | **373ms** | 125–464 |
| CLS | 0.000 | 0.000–0.008 |
| Speed Index | 1,806ms | 1,661–2,011 |

비교용 — 같은 날 같은 기계의 **모바일**: TBT 1,431ms · Performance 51 · SI 4,966ms.
👉 **데스크탑은 TBT 가 모바일의 1/4 이다. 여기서 TBT 를 더 깎는 것은 우선순위가 아니다.**

### 2-1. LCP 내역 (중앙값)

| 구간 | ms |
|---|---:|
| **리소스 로드 시간** | **1,141** |
| **요소 렌더 지연** | **493** |
| 리소스 로드 지연 | 14 |
| TTFB | 4 |

**LCP 요소는 5/5 회차 모두 히어로 이미지**다:
`header.logo-area > div.normal-logo > div.cd-hero-island > img.cd-hero-island__img`
— 표시 크기 **1154×769**, 실제 전송 `/cdn-cgi/image/width=1280,quality=72,format=auto/…webp` **170KB**.
Lighthouse 판정: 1280 폭은 1154 표시에 대해 과대 — **32KB 낭비**.

### 2-2. 부팅 CPU / 강제 리플로우

| 항목 | ms | 출처 |
|---|---:|---|
| 최장 롱태스크 | 407 | 문서 인라인 |
| 롱태스크 2위 | 240 | `js/shell/s-332b43a8c943fe68.js` (9KB) |
| 스크립트 CPU 1위 | 1,304 | 문서 인라인 |
| 스크립트 CPU 2위 | 223 | `js/shell/s-49eb61aeb0e25642.js` (7KB) |
| **강제 동기 레이아웃 1위** | **221.3** | `js/shell/s-49eb61aeb0e25642.js:0:6824` |
| 강제 동기 레이아웃 2위 | 50.3 | `js/core/index-inline-runtime.js:7:77400` |

`js/shell/*.js` 는 **빌드 산출물**이다(`scripts/split-dist-boot-tasks.mjs` ·
`scripts/externalize-dist-inline-scripts.mjs` 가 `index.html` 인라인 스크립트를 떼어낸 것).
소스로 되짚으려면 `dist/js/shell/<이름>.js` 를 열어 해당 오프셋 부근 문자열을 `index.html` 에서 grep 한다.
🔴 **셸 청크 이름은 빌드마다 바뀐다** — 이름을 근거로 삼지 말고 매번 다시 되짚어라.

### 2-3. 이미지 (데스크탑 첫 로드 — 27개 파일 · 714KB 전송)

| 파일 | 전송 | 실제 크기 → 표시 크기 | 낭비 |
|---|---:|---|---:|
| `/fuctionassets/luck-sync-diary-v2.webp` | 100KB | 1448×1086 → 318×239 | **95KB** |
| `/images/fusion-fortune/orbs/core.webp` | 72KB | 512×512 → 208×208 | **65KB** |
| `/icons/app-logo-512.webp` | 63KB | 512×512 → 70×70 | **61KB** |
| `/cdn-cgi/image/width=768,…/DestinyWar/네오의 팩폭 운명 작전실.webp` | 61KB | 768×432 → 247×139 | 55KB |
| `/cdn-cgi/image/width=768,…/마스터 운명 연애 비책.webp` | 52KB | 768×512 → 247×165 | 46KB |
| `/cdn-cgi/image/width=768,…/숙요점x베다점.webp` | 46KB | 768×432 → 247×139 | 41KB |
| `/cdn-cgi/image/width=1280,…/네오와 연이의 운명의 섬.webp` (**LCP**) | 170KB | 1280×853 → 1154×769 | 32KB |
| `/images/fortune-tea-house/flower-pig-honey-hug.webp` | 23KB | 361×411 → 208×237 | 15KB |

### 2-4. 미사용 CSS (데스크탑)

| 낭비 | 파일 |
|---|---|
| 27KB | `styles/fortune-ui-home.css` |
| 21KB | `styles/cosmic-main.css` |
| 13KB | `styles/fonts-serif.css` |
| **11KB** | 인라인 `@media (max-width:768px),(hover:none) and (pointer:coarse){…}` — **모바일 전용인데 데스크탑이 받는다** |

---

## 3. 근거가 있는 후보 (실측 순, 착수 순서 제안)

### 3-1. 🥇 리사이즈를 안 거치는 이미지 4개 — 확실하고 위험이 낮다

`/cdn-cgi/image/` 를 **안 거치는** 4개가 낭비의 대부분이다:
`luck-sync-diary-v2.webp`(95KB) · `fusion-fortune/orbs/core.webp`(65KB) ·
`icons/app-logo-512.webp`(61KB) · `fortune-tea-house/flower-pig-honey-hug.webp`(15KB) = **≈236KB**.

🔴 **이 레포에서 이미지 리사이즈 수단은 `/cdn-cgi/image/` 하나뿐이다** — `next.config` 가
`images.unoptimized` 라 `<Image>` 최적화가 꺼져 있다. PR [#704](https://github.com/rei1237/codedestiny/pull/704)
가 홈 이미지 일부를 그 경로로 옮겼지만 위 4개는 **남았다**(그래서 지금도 원본이 나간다).

⚠ `/icons/app-logo-512.webp` 는 참조가 5곳이고 **성격이 다르다**:
`index.html:554`(`<link rel=preload as=image fetchpriority=high>`) · `:1627`(CSS `background-image`) ·
`:7183`(부트 게이트 로고, 88×88) · `:12032` · `:19755`(86×86, lazy).
**preload 는 LCP 경쟁 자원이므로 이것부터 줄여라.** 표시 크기가 전부 ≤88px 인데 512px 원본이 나간다.

착수 전 확인: 그 4개가 `assets.code-destiny.com` 이 아니라 **같은 출처 경로**다.
`/cdn-cgi/image/` 가 같은 출처 경로에도 붙는지 **먼저 한 장으로 확인**하고 나머지를 옮겨라
(붙는다면 `/cdn-cgi/image/width=…,quality=…,format=auto/icons/app-logo-512.webp` 형태).

🔴 **새 경로는 엣지에 굳은 404 가 캐시될 수 있다** — 참조에 `?v=` 캐시 키를 반드시 붙여라
(memory `edge-404-cache-on-new-assets`).

### 3-2. 🥈 데스크탑 전용 강제 리플로우 221ms — 주석이 코드와 다르다

`index.html:14074-14094` 의 배경 패럴럭스 IIFE 다(주석 `:14074-14075`, 본문 `:14076-14094`).
🔴 **이 코드는 데스크탑에서만 돈다** — `matchMedia('(max-width:767px)').matches` 면 return 한다.

🔴 **줄 번호는 `main` `b8924a124` 기준이다. 밀렸으면 문자열로 다시 찾아라**:
`grep -n "배경 패럴럭스 — 스크롤 리스너" index.html`

```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
if (window.matchMedia('(max-width:767px)').matches) return;
...
function apply(){ atmos.style.setProperty('--cd-atmos-scroll', (window.scrollY || window.pageYOffset || 0) + 'px'); }
window.addEventListener('scroll', ..., { passive: true });
apply();          // ← 부팅 중 동기 호출
```

🔴 **그 자리 주석은 "transform 전용, layout 미접촉" 이라고 적혀 있지만 Lighthouse 는 이 지점에
강제 동기 레이아웃 221.3ms 를 귀속시킨다.** 주석은 *CSS 쪽*(변수가 `transform` 에만 쓰인다) 이야기이고,
**`window.scrollY` 를 부팅 중에 읽는 것이 레이아웃을 강제**한다는 사실은 반영돼 있지 않다.

👉 **먼저 확인할 것**: 부팅 중 동기 `apply()` 호출을 빼거나 rAF 로 미뤘을 때 그 221ms 가 실제로
사라지는지. 🔴 **추측하지 말고 `perf:home --preset=desktop` 의 `Forced synchronous layout` 표로 확인해라.**
`matchMedia().matches` 자체도 스타일 계산을 강제할 수 있으니 어느 쪽이 범인인지 갈라야 한다.

⚠ 스크롤 시 배경이 안 움직이면 회귀다. 첫 페인트에 `--cd-atmos-scroll` 이 0 이어도 되는지
(=페이지가 스크롤된 채 복원 진입하는 경우)를 함께 봐라. `history.scrollRestoration = 'manual'`
이 `js/core/init.js` 에 걸려 있다.

### 3-3. 🥉 LCP 히어로 이미지 — 로드 1,141ms + 렌더 지연 493ms

- **로드 쪽**: `width=1280` 이 1154 표시에 과대(32KB). `srcset` 으로 1440 뷰포트에 맞는 폭을 주거나
  `width=1160` 으로 낮춘다. ⚠ 1440 이 아닌 더 넓은 데스크탑(1920 등)에서 흐려지지 않는지 확인.
- **렌더 지연 493ms**: 이미지가 도착한 뒤에도 0.5초를 더 기다린다는 뜻이다. **원인 미조사.**
  후보는 렌더블로킹 시트(`styles/core-ui.css` 가 `index.html` 에서 렌더블로킹으로 로드된다)와
  부트 게이트 베일(`.cd-boot-gate__veil`, `index.html:7182` 부근)이다. **먼저 무엇이 붙잡는지 재라.**

### 3-4. 모바일 전용 CSS 11KB 를 데스크탑이 받는다

인라인 `@media (max-width:768px),(hover:none) and (pointer:coarse){…}` 블록들이다.
⚠ **`@media` 로 분리해 별도 시트로 빼는 것은 겉보기만큼 안전하지 않다** — `cd-mobile-runtime` 은
`index.html:477` 에서 **MQ 또는 UA 정규식**으로 붙으므로, 미디어 쿼리로만 나누면
"UA 는 모바일인데 폭은 넓은" 기기에서 규칙이 사라진다. 이 함정은 `docs/handoff/inp-round3-2026-08-16.md`
§6-8 에 실측으로 적혀 있으니 **그것부터 읽어라.**

---

## 4. 🔴 도구 현황 — 무엇이 되고 무엇이 없나

| 도구 | 데스크탑 | 비고 |
|---|---|---|
| `perf:home -- --preset=desktop` | ✅ | 1440×1000. TBT·LCP·롱태스크·강제리플로우·이미지 낭비·미사용 CSS 를 한 번에 준다 |
| `perf:style-cost -- --preset=desktop` | ✅ | 1440×1000 (`scripts/measure-home-style-cost.mjs:52`) |
| `verify-home-visual-parity` | ✅ | 데스크탑 셀 2개(`desktop-yeon`·`desktop-neo`, 1440×1000) |
| **`perf:interaction`** | ❌ | 390×844·`isMobile:true` **하드코딩**. 데스크탑 INP 를 못 잰다 |
| **`perf:tap-cost`** | ❌ | 390×844 하드코딩 (`scripts/measure-tap-fixed-cost.mjs:190`) |

🔴 **데스크탑 INP 를 건드릴 거면 도구 확장이 1번 작업이다.** 그리고 그건 이미 예약돼 있다 —
`scripts/measure-home-interaction.mjs:67-69` 주석이 `.cd-nav-group__toggle`(탑바 드롭다운)과
`#themeToggleLabel` 을 **"데스크탑 전용 요소라 모바일 TARGETS 에서 뺐다. 데스크탑 프리셋을 붙일 때
되살린다"** 고 적어 뒀다. `measure-home-style-cost.mjs:51-52` 의 `PRESETS` 형태를 그대로 베끼면 된다.
런타임 영향 0인 측정 스크립트 변경이다.

⚠ `perf:style-cost` 에는 `--allow-stale` 이 없다(`scripts/measure-home-style-cost.mjs:314` 가
fail-closed 로 죽인다). **`npm run build:cf` 직후에 돌려라.**

---

## 5. 🔴 착수 전에 반드시 지킬 것 — 직전 라운드가 비싸게 배운 것

1. **문서에 적힌 전제를 브라우저에서 먼저 확인해라.** 모바일 라운드 3·4·5 에서 문서 전제가
   **4개** 틀렸다(있다고 한 폴백이 없었고, 죽었다는 규칙이 살아 있었고, 넣으라는 TARGETS 는
   누르면 아무 일도 안 하는 요소였다). 정적 읽기로는 안 보이는 것이 있다.
2. **착수 전에 그 항목의 baseline 부터 봐라.** baseline 이 이미 바닥이면 개선을 증명할 수 없다
   (실제로 그래서 판정 불가로 끝난 PR 이 있다).
3. **베이스가 움직이면 절대값이 통째로 바뀐다.** #704 가 머지되자 `main` 의 모바일 TBT 가
   1,135 → 1,431 로 **올라갔다.** before/after 는 **같은 날 같은 기계에서 둘 다** 떠라.
4. **중앙값 차이는 표본을 늘려 확인해라.** 어떤 후보가 n=12 에서 104→80 으로 보였지만
   **n=51 에서 88 vs 88 로 같았다.** 그 차이가 PR 하나를 여는지 마는지를 갈랐다.
5. **노이즈 바닥을 같은 상태 2회로 먼저 뽑아라.** 그걸 안 하면 무엇을 봐도 판정이 안 된다.
6. **CI 에 새 게이트를 추가하지 마라.** 측정 스크립트는 `perf:*` 로 이름 짓는다.
   확인: `git grep -n "perf:" origin/main -- .github/workflows/` 가 비어 있어야 한다.
7. 일회성 하네스는 **워크트리 루트**에 `_tmp_*.mjs` 로 둔다(`.gitignore` 가 무시한다).
   🔴 스크래치패드에 두면 playwright import 가 안 된다.

### 5-1. 하네스 함정 — `docs/handoff/inp-round3-2026-08-16.md` §3-8 을 그대로 읽어라

요약만 옮기면: `fullPage` 스크린샷은 `content-visibility` 서브트리를 **백지로 찍는다** ·
절대 스크롤 좌표를 두 패스에 재사용하면 **420px 밀린 거짓 회귀**가 난다 ·
`scroll-behavior:smooth` 라 rAF 한 번으로는 스크롤이 안 도착한다 ·
살아 있는 페이지에 `addStyleTag` 로 A/B 하면 **촬영이 통째로 백지**가 된다.

🔴 그리고 **`verify-home-visual-parity` 는 요소를 문서 순서 인덱스로 식별한다** — `<style>` 이든
뭐든 **요소를 하나만 늘려도** 4셀 전부 FAIL 하고 차이가 1만 건대로 찍힌다(전부 정렬 어긋남이지
시각 변화가 아니다). 요소 수가 바뀌는 변경에는 이 도구를 쓸 수 없고, 그때는 직접 crop diff 를 만들어야 한다.

---

## 6. 매 PR 공통 검증

```
typecheck · lint · verify:public-parity · verify:locale-main-sync · verify:payment-freeze ·
verify:mobile-detail-nonintrusive · verify:hero-contrast ·
MOBILE_CDP_TARGET=dist verify:mobile-cdp-smoke ·
node scripts/run-paid-gate-suite.mjs --base <merge-base sha>
```

- `verify:mobile-cdp-smoke` 의 아래 실패는 **기존 항목**이다(사용자가 "문제 없다"고 확인). 글자 단위로
  같으면 회귀가 아니다:
  `Tap point occluded for .moon-preview-card[href="/tarot/mingri"]: top element is div.cd-pwa-install-prompt__backdrop`
- `index.html` 을 고쳤으면 `npm run build:cf` 가 prebuild 에서 `sync:public` 을 이미 돈다.
  `js/core/*` 의 `?v=build-…` 재생성은 **정당한 산출물이니 함께 커밋**한다.

---

## 7. 이 문서가 **재지 못한 것** (미검증 — 추측으로 메우지 말 것)

- **`perf:style-cost --preset=desktop`** — dist 신선도 가드에 막혀 못 돌렸다
  (`js/vendor/sweph-wasm/wasm/swisseph.wasm` 의 mtime 이 `dist/index.html` 보다 새로웠다).
  `npm run build:cf` 직후에 다시 돌려라. **데스크탑의 스타일 재계산 비용은 아직 모른다.**
- **데스크탑 INP / 인터랙션 지연** — 잴 도구가 없다(§4). 숫자가 하나도 없다.
- **LCP 요소 렌더 지연 493ms 의 원인** — 후보만 적었고 조사하지 않았다(§3-3).
- **데스크탑 요소 수 4,321** vs 모바일 2,033 (`verify-home-visual-parity` 스냅샷 메타에서 읽은 값).
  왜 2배인지, 그 차이가 비용인지는 **조사하지 않았다.**
- 위 이미지 낭비 수치는 **Lighthouse 판정값**이지 직접 잰 바이트가 아니다.

---

## 8. 관련 문서

- 모바일 INP 라운드 전체 이력·좌표·함정: `docs/handoff/inp-round3-2026-08-16.md` (5라운드까지, **끝남**)
- 그 앞: `docs/handoff/inp-round2-2026-08-16.md` · `docs/handoff/mobile-home-perf.md`
- 미해결로 남은 것(성능 아님): 같은 문서 §6-4('최근 이용' 기록 미동작 — **기능 버그**) ·
  §6-5(`showOverview()` 2회 호출) · §4-4 말미(사주 코어 순차 체인 11개)
- 🔴 모바일 쪽 최대 미해결 수치: **부팅 이후 레이아웃 시프트 0.357**(목표 ≤0.1)이고
  그중 **0.319 가 '서비스 검색 입력' 하나**에서 나온다(같은 문서 §6-6).
