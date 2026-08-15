# 인수인계 — 모바일 홈 셸 성능 (34점 → PSI 60점대)

> 2026-08-15 갱신. 이 문서만 읽고 이어서 시작할 수 있게 쓴다.

## 왜 하는 작업인가

사용자 요구 원문:
> 성능이 너무 처참해 이전에는 50점 대였는데 … 대체 무엇이 원인이라서 모바일 성능이 이렇게까지 떨어졌는지 분석해주고 쓸데없는 중복 css라든지 모든 측면을 다 고려해서 서비스 모바일 성능을 완벽하게 최적화해주면 좋겠어 많이 바라지도 않아 60점대정도만 나와도 만족한다
> cls 제외하고는 점수가 최하점이므로 … 목표 점수가 될때까지 계속 수정해

사용자 확정: 기준 도구 **PSI** · **부트 베일 유지**(작업량 먼저) · **모바일 홈 요소 축소 허용, 단 모든 기능에 매우 편리하게 접근 가능해야 함**.

---

## 1. 원인 (규명 완료)

**점수가 떨어진 건 페이지가 느려져서가 아니다. 가려져 있던 TBT 가 드러난 것이다.**

커밋 `8fc05dd53` 본문에 53점 시점 실측이 있다. 사용자의 34점 실측과 비교:

| 지표 | 53점 시점 | 34점 지금 | 방향 | 가중치 |
|---|---|---|---|---|
| FCP | 5.8s | 5.3s | 개선 | 10% |
| LCP | 7.7s | 6.6s | 개선 | 25% |
| Speed Index | 10.9s | 6.6s | 크게 개선 | 10% |
| CLS | — | 0.003 | 만점 | 25% |
| **TBT** | **≈300ms**(곡선 역산) | **2,110ms** | **7배 악화** | **30%** |

`reports/psi-mobile.json`(2026-05-19, PSI 52점)이 뒷받침한다: **TBT 100ms · 메인스레드 총량 12.1s · 최장 롱태스크 144ms**. 지금은 총량이 ~9.5s로 **줄었는데도** 최장 롱태스크가 1,200~1,400ms다.

메커니즘은 `dc6129747` 이 이미 적어 뒀다 — 베일이 FCP 를 늦춰 TBT 를 숨기고 있었고, HTML 2.6MB→1.32MB(externalize)·JS minify·CSS minify 가 **작업량은 그대로 둔 채 FCP 만 앞당겨** 숨은 작업이 계상되기 시작했다.

**기각된 가설(근거 있음)**: externalize 가 점수를 떨어뜨렸다(FCP·LCP·SI 는 전부 개선됨) / CSS 미니파이 캐시 오염(키는 커밋 SHA 라 배포마다 회전, 프로덕션 실측 확인) / PR #651·#653 이 홈 임계경로를 건드렸다(둘 다 정적 셸 밖).

**롤백은 무의미하다** — 되돌리면 FCP 가 다시 늦어져 TBT 가 숨겨질 뿐, 작업량은 그대로다.

---

## 2. 🔴 이미 시도했고 **실패한** 것 — 다시 하지 말 것

### 하단 내비 상태기(`cdMobileBottomNav`)는 병목이 아니다 — **ablation 으로 반증됨**

`perf:home` 의 bootup-time·long-tasks 가 이 9KB 청크를 1위로 지목해서 세 가지 방식으로 고쳐 봤다. **전부 노이즈 범위**였다:

| 시도 | score | TBT | LCP | Style&Layout | 최장 롱태스크 |
|---|---:|---:|---:|---:|---:|
| 기준(CSS 미니파이 상태) | 47 | 1,478 | 5,106 | 5,816 | 1,141ms |
| body 전역 옵저버를 오버레이 관련 변경에만 승격 | 48 | **1,668** | 4,805 | 6,271 | **1,401ms** |
| `isVisible()` 에서 `getComputedStyle`/`offsetWidth` 전면 제거 | 46 | 1,525 | 4,926 | 5,824 | 1,221ms |
| **ABLATION: `update()` 를 즉시 return 시켜 전면 비활성** | 45 | **1,573** | 5,107 | 6,241 | **1,199ms** |

**`update()` 를 통째로 죽여도 TBT 도 최장 롱태스크도 안 줄었다.** 즉 Lighthouse 가 이 파일에 붙인 1.2초는 이 스크립트가 하는 일이 아니라, **이 스크립트의 rAF 콜백이 올라탄 프레임의 스타일·레이아웃 비용**이다. 롱태스크는 스택 맨 아래 스크립트로 귀속되므로 이런 오귀속이 생긴다.

🔴 **교훈: `bootup-time`/`long-tasks` 의 URL 귀속만 보고 범인을 정하지 말 것. ablation 으로 확인할 것.**
(첫 번째 시도인 `recordsHintOverlay` 게이팅은 **더 나빠졌다** — 추가 노드마다 `querySelector` 로 서브트리를 훑은 게 원인. 되살리지 말 것.)

### 그래서 진짜 병목은

**Style & Layout 5,800~6,300ms 가 부팅 전체에 퍼져 있고, 어떤 단일 스크립트도 소유하지 않는다.** 네 변형 전부에서 이 값이 거의 안 변했다. `dc6129747` 이 남긴 프로덕션 트레이스와 같은 그림이다: **Recalculate Style 681회 × 평균 12.3ms**.

즉 줄여야 하는 건 `규칙 수 × 요소 수 × 무효화 횟수` 다.

---

## 3. 실측된 지표 (2026-08-15, 로컬 dist·brotli·CPU 4x, 5회 중앙값)

| 항목 | 값 |
|---|---|
| 배포 셸 `dist/index.html` | 1,320,517 B (brotli 240,861) · `no-store` 라 **매 방문 재다운로드** |
| **head** | **399,724 B, 그중 인라인 `<style>` 41블록이 364,878 B (91.3%)** |
| FCP 요소에 닿기까지 파싱해야 할 양 | **brotli 60,598 B** |
| 렌더 블로킹 CSS | 6개 · 343,143 raw / 46,783 brotli (`cosmic-main.css` 가 69.6%) |
| 렌더 블로킹 JS(head) | 7개 · 29,165 raw / 9,722 brotli |
| 파서 블로킹 `<script src>` 전체 | **49개 · 1,558,908 raw / 343,019 brotli** |
| externalize 가 만든 셸 청크 | 18개 · 684,006 raw / 158,500 brotli (**17개가 body**) |
| 모바일 런타임 DOM | **2,164 요소**(박스 있음 1,184 / 숨김 980) |
| 런타임 스타일시트 / CSSOM 규칙 | 95개 / **7,116 규칙** |
| 상위 DOM 분포 | `#inputPage 235 · #cdSigGrid 119 · #cdAiFeatures 98 · #fsp-grid 74 · #destinyCardForm 70 · #birthMinute 61` |
| `<option>` 정적 요소 | 91개 (`birthMinute` 60 + `birthHour` 24) |

---

## 4. 남은 레버 (근거와 함께, 우선순위 순)

### L1. 파서 블로킹 셸 청크 18개 중 13개를 `defer` — **파일별 근거 확보 완료**

`externalize-dist-inline-scripts.mjs` 가 실행 순서 보존을 위해 `defer` 없이 낸다(`:23-25`, `:131`, `MIN_BYTES=8192` at `:39`). 13개는 파스 시점 소비자가 없다 → **140,513 B brotli** 를 블로킹 체인에서 제거. 그중 **114,667 B 가 단 두 파일**:

| 파일 | brotli | 근거 |
|---|---:|---|
| `s-3b8e573f09dee186.js` | 63,091 | `isTileKeyUnlocked`/`formatWon`/`unlockedFeatureMap` HTML 참조 **0회**. 문서 98.5% 지점 |
| `s-81b309f01cb83ca9.js` | 51,576 | `_cdInvokeActionDirect`/`_cdOpenTilePreview`/`__cdOpenMainVvipModal` 참조 **0회**. 전부 클릭 리스너 |

**반드시 블로킹 유지 5개**: `s-a912e5da6adadd69`(`window.fetch` 교체 — access-store 의 defer 안전성이 여기 의존) · `s-7bcdba92aaa3009d`(히어로 마크업 주입 → 지연 시 CLS) · `s-49eb61aeb0e25642`(히어로 문구 교체) · `s-884dcf881587689b`(auth 부트 신호 → 베일 지연) · `s-a99efd85dbb93094`(내비 재부모화).

구현: 스크립트에 **명시적 안전 목록**을 두고 목록 밖은 기본 블로킹(fail-safe).
🔴 주의: 이건 FCP 를 더 당긴다 → §1 메커니즘 때문에 **TBT 가 더 나빠질 수 있다.** 작업량을 줄이는 레버와 **함께** 내보낼 것.

### L2. head 인라인 CSS 364,878 B 축소 (FCP + 재방문 비용)

파서가 FCP 요소에 닿으려면 brotli 60,598 B 를 받아 파싱해야 하고, HTML 이 `no-store` 라 **매 방문 반복**된다. 첫 화면에 관여하지 않는 `<style>` 블록을 dist 단계에서 body 하단/외부 캐시 가능 파일로 옮긴다.
🔴 판정은 정적 grep 금지 — **CDP `CSS.startRuleUsageTracking`** 으로 첫 페인트 시점 매칭 규칙을 실측해서 정한다(정적 판정은 런타임 생성 클래스를 오판했다).

### L3. 요소 수 축소 (사용자 승인 범위 — Style & Layout 직격)

Style & Layout 이 `규칙 × 요소` 이므로 요소를 줄이는 게 직접적이다.
- `<option>` 91개를 최초 포커스 시 생성
- `#cdSigGrid`(119)·`#cdAiFeatures`(98)·`#fsp-grid`(74)를 모바일에서 **접힌 요약 + 전체 보기**로
- 🔴 사용자 조건: 축소는 "숨기기"가 아니라 **하단 탭 + 전체 기능 시트로 흡수**. PR 에 **축소 항목 수 + 접근 경로 표**를 반드시 기재하고 사용자 확인 후 머지.

### L4. `content-visibility` 재시도 — **조건부**

`18e28782e` 가 오프스크린 containment 를 첫 스타일 해석부터 적용해 데스크탑 LCP −365ms, Style&Layout 5,361→5,245 를 실측했는데 `d29310c4a` 로 되돌아갔다. **되돌린 사유가 레포 어디에도 없다.**
지금은 `scripts/verify-home-visual-parity.mjs` 로 시각 동일성을 증명할 수 있으니 재시도 가치가 있다. 🔴 **착수 전 사용자에게 "그때 무엇이 보였는지" 먼저 묻는다.**

### L5. 중복·미사용 CSS

2026-05-19 PSI 가 `unused-css-rules` **318 KiB** 절감 여지 보고. 조사 미완.

### 하지 않기로 한 것

부트 베일 조건 변경(사용자가 유지 선택 + `dc6129747` 의 53→30 전례) · `cosmic-main.css`(238KB, 블로킹 CSS 의 69.6%) 통짜 지연(`8fc05dd53` 이 CLS 로 기각) · 소스 `index.html` 구조 변경(문자열로 읽는 가드 61개).

---

## 5. 목표 역산

Lighthouse 10 모바일: TBT 30% · LCP 25% · CLS 25% · FCP 10% · SI 10%

| 지표 | 현재 | 목표 | 기여 |
|---|---|---|---|
| TBT | 2,110ms | ≤ 600ms | ~15/30 |
| LCP | 6.6s | ≤ 4.0s | ~12.5/25 |
| CLS | 0.003 | 유지 | 25/25 |
| FCP | 5.3s | ≤ 3.0s | ~5/10 |
| SI | 6.6s | ≤ 5.0s | ~6/10 |
| | **34** | | **~63** |

🔴 **TBT(작업량)를 먼저, 페인트를 나중에.** 반대로 하면 점수가 더 떨어진다 — 지금까지 정확히 그 순서로 일어났다.

---

## 6. 도구와 검증

이번 세션에 추가된 것(이미 `main`):
- `npm run perf:home` — 로컬 dist brotli Lighthouse, `--url=` 로 프로덕션도 가능(**API 키 불필요**)
- `npm run perf:style-cost` — CDP 로 RecalcStyleCount/LayoutCount/DOM 인구조사/실제 매칭 규칙 수
- `node scripts/verify-home-visual-parity.mjs` — 4셀(모바일/데스크탑 × 연이/네오) computed style 전수 + scrollHeight + 스크린샷. `--noise=` 로 측정한 노이즈만 제외, `background-image` 는 실제 렌더로 비교

**판정 규칙(사전 고정)**: 5회 중앙값이 베이스라인 min~max 밴드 밖으로 나갈 때만 개선. 주 지표 **TBT·LCP**.

```bash
npm run build:cf
npm run perf:home -- --runs=5 --preset=mobile --label=<R> --out=<tmp>
node scripts/verify-home-visual-parity.mjs --snapshot --label=<R>
node scripts/verify-home-visual-parity.mjs --compare=<이전>,<R> --noise=<이전>,<이전2>
MOBILE_CDP_TARGET=dist npm run verify:mobile-cdp-smoke
npm run typecheck && npm run lint && npm run verify:public-parity && npm run verify:locale-main-sync
npm run verify:payment-freeze && npm run verify:mobile-detail-nonintrusive && npm run verify:hero-contrast
```
`index.html` 수정 시 `npm run sync:public`(셸 7벌).

**PSI 측정**: `scripts/psi-lighthouse-audit.mjs` 를 키 없이도 호출하도록 고쳤지만(예전엔 키 없으면 `exit 0` 으로 조용히 건너뜀), **공용 할당량이 소진돼 429 가 난다.** PSI 로 판정하려면 `PAGESPEED_API_KEY` 가 필요하다 — 사용자에게 요청할 것. 그 전까지는 `perf:home --url=https://code-destiny.com` 이 키 없이 쓸 수 있는 프로덕션 실측 수단이다.

## 7. 근거 못 찾으면 추측하지 말고 물어라

1. **`d29310c4a` 가 containment 를 되돌린 이유** — 커밋 메시지가 한 줄뿐이고 문서에도 없다. L4 착수 전 필수.
2. **`PAGESPEED_API_KEY`** 존재 여부.
3. 프로덕션 배포본과 `main` 이 어긋나 있을 수 있다 — 착수 전 `/version.json` 과 `git log origin/main` 대조.

---

## 8. 중복 CSS / 이미지 조사 결과 (2026-08-15 실측 — 사용자 가설 정정 포함)

### 🔴 "쓸데없는 중복 CSS" 는 병목이 아니다 — 전체 CSS 1.55 MiB 중 **1.0%**

| 측정 | 규칙 | 바이트 |
|---|---|---|
| 인라인 81블록 **내부** 완전 중복 | 49 / 3,710 | **8,758 B** |
| 인라인 규칙이 외부 시트와 바이트 동일 | 78 / 3,710 (2.1%) | **7,752 B** |
| **합계** | | **≈16.1 KiB (1.0%)** |

인라인 CSS 는 **이미 미니파이돼 있다**(주석 0 B, 잉여 공백 41 B). 레이어드 오버라이드 블록들은 같은 셀렉터에 **다른 속성**을 선언하는 것이지 같은 블록의 복사가 아니다. **중복 제거는 건드릴 가치가 없다.**

### 절대 매칭 불가 셀렉터 — 상한값이며 삭제 대상이 아니다

| | 셀렉터 그룹 | 마크업 미매칭 | +JS 문자열도 없음 |
|---|---|---|---|
| 전체 | 11,280 | 5,853 (51.9%) / 722.5 KB | **1,027 (9.1%) / 124.3 KB** |
| `fortune-ui.css` | 4,127 | **3,098 (75.1%) / 316.5 KB** | 660 / 75.1 KB |

🔴 **51.9% 는 상한선일 뿐 오답이다** — 그중 **4,751개가 JS 문자열 매칭으로 되살아났다**(83%가 오탐). `.cd-refund-toast`·`.tarot-tile__lock-icon` 이 그 예다. 그리고 **홈에서 안 쓰인다 ≠ 지워도 된다** — `fortune-ui.css` 는 전 사이트 시트다.
→ **처방은 규칙 삭제가 아니라 "홈에서 474 KB 짜리 전 사이트 시트를 안 받는 것".**

### `@font-face` 189개는 낭비가 아니다 (내 이전 서술 정정)

189 = **3 패밀리의 unicode-range 서브셋 샤드**이고 전부 `font-display:swap`. 홈에서 안 쓰는 패밀리는 **0개**. 브라우저는 교집합 샤드만 받는다. `media="print"` 스왑이라 렌더 블로킹도 아니다. **그대로 둘 것.**

- 다만 실제 버그 하나: 홈 렌더 경로에서 `var(--font-serif)` 를 쓰는데 **`--font-serif` 가 정의되지 않는다.** 정의는 `styles/globals.css:37-40` 에 있고 `globals.css` 는 `dist/index.html` 에서 **참조 0회**다. 조용히 빈 값으로 해석된다.

### `!important` 전쟁의 진원지 = `cosmic-main.css` 의 히어로 테마 분기

`!important` 총계: 인라인 6,184 · **cosmic-main 3,159** · fortune-ui 385 · mobile-lite 357. 상위는 전부 `body:not(.neo-mode) .moon-hero*` / `body.neo-mode .moon-hero*` 계열(단일 셀렉터에 `!important` 46·40·40·32…). **238,716 B 렌더 블로킹 1위 파일이자 레이어링 손상의 중심.**

### 🔴 가장 큰 실측 낭비 — 이미지가 리사이즈 파이프라인을 우회한다 (~3.35 MB 추정)

같은 페이지의 `<img>` 48개 중 **19개는 이미 `/cdn-cgi/image/width=…,quality=80,format=auto/` 를 쓴다.** 그런데 **26개는 원본 그대로** 나간다 — `srcset` 도 CF 리사이즈도 없이, `width="200"` 로 선언된 타일에.

| 바이트 | 원본 크기 | 선언 폭 | 파일 |
|---:|---|---:|---|
| 392,674 | 1672×941 | 200 | `/fuctionassets/심리테스트.webp` |
| 336,464 | 1808×1024 | 1600 | `/fuctionassets/info.webp` |
| 255,004 | 1536×1024 | 200 | `/fuctionassets/meditation.webp` |
| 252,592 | 1672×941 | 200 | `/fuctionassets/soul-origin-cover.webp` |
| 242,638 | 1536×1024 | 200 | `/fuctionassets/r=vd.webp` |
| 228,968 | 1536×1024 | 200 | `/fuctionassets/stonetaro.webp` |
| 220,114 | 1536×1024 | 200 | `/images/Celestial Harmony.webp` |
| … 26개 합계 | | | **4,193,972 B** |

`loading="lazy"` 라 Lighthouse 가 과소 보고하지만 대역폭·SI 에는 그대로 든다. **파이프라인이 이미 같은 페이지에서 돌고 있으므로 URL 만 바꾸면 된다.**

### LCP 요소의 이미지가 8배 크다 — 올바른 자산이 이미 레포에 있다

`#honeypigLogo`(`data-lcp-candidate="1"`, `index.html:11946-11957`)와 부트 베일 로고(`:7121`, FCP 요소)가 **`/icons/app-logo-512.webp` 31,916 B(512×512)** 를 **48~130 px** 로 그린다. `srcset` 없음, CF 리사이즈 없음.
**`/icons/app-logo-176.webp`(6,182 B, 176×176)가 이미 레포에 있는데 참조가 0회다.** 절감 ≈ **25.7~29 KiB**, 그것도 LCP/FCP 요소에서.

바로 옆 `#neoLogo` 는 `srcset`(96w/130w/512w)+`sizes` 로 **제대로 하고 있다** — 같은 패턴을 복사하면 된다.

🔴 **주의**: `/cdn-cgi/image/` 는 **zone 기능이라 로컬 정적 서버와 `*.pages.dev` 프리뷰에서 404 난다**(`scripts/deploy-smoke.mjs:68`). 이미 19개가 그 상태라 **로컬 `perf:home` 측정에는 그 이미지들이 빠져 있다.** 로컬에서도 유효한 개선을 원하면 정적 `srcset`(`app-logo-176.webp` 등)을, 프로덕션 최적화를 원하면 CF 리사이즈를 쓴다. **둘의 측정 가능성이 다르다는 걸 알고 고를 것.**

### 이 절의 우선순위

1. **이미지 리사이즈 우회 26개** — ~3.35 MB, 파이프라인 기존재, 시각 동일
2. **`fortune-ui.css` 474 KB 를 홈에서 빼기** — 316.5 KB 가 홈 마크업과 매칭 불가
3. **`cosmic-main.css` 238 KB** — 렌더 블로킹 1위 + `!important` 3,159
4. **LCP 로고 25~29 KiB** — 올바른 자산이 이미 있음
5. ~~중복 CSS 16 KiB~~ — **1%. 건드리지 말 것.**
