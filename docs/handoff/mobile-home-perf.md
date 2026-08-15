# 인수인계 — 모바일 홈 성능 (프로덕션 39점 → 목표 60점대)

> 2026-08-15 **2차 개정**. 이 문서만 읽고 바로 이어서 시작할 수 있게 쓴다.
> 1차 개정본의 **L1·L2 는 실측으로 기각됐다.** 아래 §3 에 반증 근거가 있다. 되살리지 말 것.

---

## 0. 30초 요약

- 점수가 떨어진 건 페이지가 느려져서가 아니다. **TBT 하나만 악화**됐고, 부트 베일이 가려 주던 작업이 드러난 것이다. 롤백은 무의미하다.
- **LCP 는 이미지가 아니다.** `h1.moon-hero__title` **텍스트**이고, 그 지연은 전부 `Element render delay` 다(자원 로드 지연 **0ms**). → **이미지로는 LCP 를 못 움직인다.**
- **TBT(30%) 와 LCP(25%) 가 같은 원인 하나를 공유한다 — 메인스레드 작업량.** 점수의 55% 다.
- 그 작업량의 정체가 이번에 밝혀졌다: **CSS 를 전부 걷어내면 RecalcStyle 이 38,307ms → 515ms 로 98.7% 사라진다.** 무효화 **횟수**는 그대로다(71 → 64). 즉 **회당 매칭 비용**이 문제다.
- 그중 **`styles/fortune-ui.css` 한 파일이 43%.** 하지만 **통째로 뺄 수는 없다** — 홈이 실제로 쓰고 있고, 빼면 숨어 있어야 할 요소가 드러난다(§4).
- ✅ **그 분할은 끝났다(PR #667).** 동일 DOM A/B 로 **score 45 → 49 · FCP −382ms · LCP −896ms**, 시각 파리티 4/4 통과.
- 🔴 **그 과정에서 방향이 하나 더 밝혀졌다 — 비용은 "규칙 수"가 아니라 "매칭되는 규칙 수"에 붙는다.** 시트에서 안 쓰는 2,600 규칙을 걷어냈는데 RecalcStyle 은 −13% 였다(38,307 → 33,222). 전체 제거가 −43% 였던 것은 **매칭되는 규칙까지 같이 없앴기 때문**이다. 그래서 남은 지렛대는 CSS 다이어트가 아니라 **매칭 대상 자체를 줄이는 것**이다(§4-4).

---

## 1. 사용자 요구 (원문)

> 성능이 너무 처참해 이전에는 50점 대였는데 니가 이건 뭔가 잘못했던거야 그래서 롤백하라고 했음에도 롤백도 변경이 많아서 불가능한 상황으로 판단되는데 대체 무엇이 원인이라서 모바일 성능이 이렇게까지 떨어졌는지 분석해주고 쓸데없는 중복 css라든지 모든 측면을 다 고려해서 서비스 모바일 성능을 완벽하게 최적화해주면 좋겠어 많이 바라지도 않아 60점대정도만 나와도 만족한다

> cls 제외하고는 점수가 최하점이므로 오히려 최하이므로 개선의 여지가 많을것으로 보이므로 목표 점수가 될때까지 계속 수정해

**질문으로 확정받은 사항**
1. 기준 도구는 **PSI**. 🔴 **키는 발급하지 않는다** — 라운드마다 **사용자가 pagespeed.web.dev 에서 1회 직접 실행해 점수를 알려준다.** 그 사이 반복 측정은 `perf:home --url=` (동일 Lighthouse 엔진, 키 불필요).
2. **부트 베일은 유지** — 작업량을 먼저 줄인다.
3. **모바일 홈 요소 축소 허용** — 단 원문: *"모바일에서 컬렉션 카드를 줄이든지 홈 요소를 축소해도 좋아 대신 ui/ux적으로 매우 편리하게 모든 기능들에 접근할 수 있는 있어야해"*
4. (2026-08-15) 이미지 최적화가 점수에 기여 0 으로 나온 뒤 **"Style & Layout 공략으로 전환"** 을 사용자가 선택했다.

---

## 2. 프로덕션 베이스라인 (실측 · 이 문서의 기준점)

`npm run perf:home -- --url=https://code-destiny.com --runs=5 --preset=mobile` · 커밋 `084ef01b0c25` · 2026-08-15

| 지표 | 값 | 가중치 |
|---|---:|---:|
| **Performance** | **39** (35–42) | |
| FCP | 5,119 ms | 10% |
| LCP | 6,696 ms | 25% |
| **TBT** | **1,216 ms** (832–1,722) | **30%** |
| CLS | 0.038 | 25% |
| Speed Index | 6,609 ms | 10% |

**메인스레드 내역 (중앙값)**

| ms | 항목 |
|---:|---|
| **6,698** | **Style & Layout** ← 65% |
| 2,022 | Other |
| 1,110 | Script Evaluation |
| 632 | Rendering |
| 217 | Parse HTML & CSS |
| 141 | Script Parsing & Compilation |

**LCP 의 주인 (열린 항목이었음 — 이제 확정)**

```
LCP element : h1.moon-hero__title   (텍스트, 렌더 박스 304x72)
  Time to first byte      302 ms
  Element render delay  781~1,060 ms
  resource load delay       0 ms   ← 이미지·네트워크 무관
```

🔴 **TBT 노이즈가 크다(832~1,722ms, ±45%).** 5회 중앙값을 쓰고, **min~max 밴드가 겹치면 개선으로 인정하지 않는다.** 1차 세션의 ablation 3건이 전부 이 밴드 안에서 흔들렸다.

---

## 3. 🔴 실측으로 기각된 것 — **절대 반복하지 말 것**

### 3-1. 하단 내비 상태기(`cdMobileBottomNav` = `s-61d550aa8640e310.js`)

`bootup-time` 1위(CPU 3,894ms)이자 최장 롱태스크(1,422ms)이자 **강제 동기 레이아웃 1위(589ms)** 다. 그런데 1차 세션이 세 갈래로 고쳐 봤고 **`update()` 를 통째로 즉시 return 시켜도** TBT·최장 롱태스크가 안 줄었다(전부 노이즈 밴드 안).
그리고 589ms 는 Style & Layout 6,698ms 의 **9%** 일 뿐이다 — **나머지 91% 는 강제 리플로가 아니라 평범한 스타일 재계산이다.**
🔴 `bootup-time`/`long-tasks`/`forced-reflow` 의 URL 귀속만 보고 범인을 정하지 말 것.

### 3-2. 이미지 최적화 전반 — **점수 기여 0**

`perf:home` 에 "실제로 다운로드된 이미지" 추출을 붙여 확인했다. 홈 셸 `<img>` 59개 중 **Lighthouse 가 실제로 받는 것은 9개, 373KB 뿐**이다. 나머지는 전부 `loading="lazy"` + 스크롤 아래라 **아예 요청되지 않는다.**

1차 개정본 L1 이 지목한 `saju.webp`·`ai tarrot.webp`·`info.webp`·`유명인 사주 분석.webp`·`sybila.webp` **5개는 한 개도 다운로드되지 않는다.** 전환했어도 점수는 1점도 안 움직였다.

그리고 **LCP 요소가 텍스트**이고 `resource load delay` 가 0 이므로, 이미지를 아무리 줄여도 LCP(25%)는 그대로다.

**부수적으로 알아낸 것 (점수용이 아니라 데이터 비용용)**
- 리사이즈가 항상 이득이 아니다 — `자는 연이.webp` 10,950→20,770(+90%) · `flower-pig-honey-hug.webp` 22,890→41,737(+82%) · `info.webp@1600` 336,464→374,348(+11%). **전환 전 반드시 원본 vs 리사이즈본을 프로브할 것.**
- 실제 낭비는 여기 있다(합 ~167KB): `네오와 연이의 운명의 섬` 60KB(768x512 인데 표시 332x221) · `orbs/core.webp` 33KB(448→96) · `app-logo-512.webp` 30KB(512→88) · `luck-sync-diary-v2` 23KB(640→116) · `flower-pig-honey-hug` 21KB(361→96). 별도로 `vvip-destiny-archive-v1.webp` **110KB**(CSS 배경, 리사이즈 미적용)와 `/icons/neo.webp` 48KB.
- 🔴 `#neoLogo` 는 `srcset`(96w/130w/512w)이 **제대로 있는데도 512px 원본을 받는다.** Lighthouse 모바일 DPR 2.625 × 88px = 231px 가 필요한데 후보가 130w 다음이 512w 라 512w 가 뽑힌다. `app-logo-512.webp`(176w/512w)도 같은 함정. **고치려면 ~256w 변형을 만들어야 한다**(`sharp` 보유, `scripts/webp-exclusions.mjs:18` 이 `app-logo*` 를 자동 변환에서 제외하므로 수동 생성).

### 3-3. L2(로고 srcset) 의 전제도 틀렸다

- `app-logo-176.webp` 는 "참조 0회"가 아니다 — **결제창 안내 자산**이고 `scripts/verify-payment-choice-parity.mjs:138` 이 가드한다.
- `#honeypigLogo` 의 `srcset` 은 부팅 때 `js/share.js:1103,1223` 과 `index.html` 인라인 `syncHeroMascot` 이 **전부 512 를 가리키는 degenerate srcset 으로 무조건 덮어쓴다.** HTML 만 고치면 무효다.
- `index.html:548` 의 preload 는 `scripts/verify-portone-single-payment-regression.mjs:513` 이 **`href="/icons/app-logo-512.webp"` 접두사로** 단언한다. `imagesrcset`/`imagesizes` 를 **href 뒤에** 붙이는 것은 통과하지만 href 를 바꾸면 깨진다.

### 3-4. `:has()` 셀렉터 — 기각

홈 CSS 3면에 `:has()` 셀렉터가 42개 있고(`body:has(.tile-pvw-overlay.pvw-open)` 같은 문서 전역 것 포함) 유력해 보였다. **dist 의 `:has()` 를 전부 무력화해 측정했더니 RecalcStyle 38,307ms → 37,122ms** (밴드 38,122–43,966 vs 35,523–39,699, 겹침). **노이즈다.**

### 3-5. 그 외 (1차 세션 결론, 유효)

- **중복 CSS 제거** — 전체 1.55MiB 중 16.1KiB(1.0%)뿐. 사용자가 지목했지만 건드릴 가치 없음.
- **정적 판정으로 CSS 삭제** — "매칭 불가 51.9%" 중 **83%가 JS 문자열로 되살아났다**(`.cd-refund-toast`, `.tarot-tile__lock-icon`).
- **`@font-face` 189개 정리** — 3개 패밀리의 unicode-range 서브셋 샤드다. 낭비 아님. `media=print` 스왑이라 렌더 블로킹도 아님.
- **부트 베일 조건 변경** — 사용자가 유지 선택 + `dc6129747` 의 53→30 전례.
- **`cosmic-main.css` 통짜 지연** — `8fc05dd53` 이 CLS 로 기각.
- **소스 `index.html` 구조 변경** — 문자열로 읽는 verify 61개, 함수 본문을 중괄호로 잘라 쓰는 것 19개.

---

## 4. 🔴 확정된 원인과 다음 작업

### 4-1. 원인 — 스타일 재계산의 **회당 비용**

`npm run perf:style-cost -- --runs=3 --preset=mobile` (로컬 dist, CPU 4x, settle 6s)

| 실험 | RecalcStyle 횟수 | RecalcStyle ms | Task ms |
|---|---:|---:|---:|
| **베이스라인** | 71 | **38,307** | 43,279 |
| `:has()` 전부 무력화 | 73 | 37,122 | 42,224 |
| `fortune-ui.css` 만 제거 | 121 | **21,733** | 27,015 |
| 외부 시트 22개 전부 제거 | 408 | **13,055** | 19,061 |
| **CSS 전부 제거(바닥)** | 64 | **515** | 3,409 |

읽는 법:
- **횟수는 거의 안 변하는데 총량이 98.7% 사라진다** → 무효화를 줄이는 게 아니라 **매칭 비용**을 줄여야 한다.
- **`fortune-ui.css` 단독 −43%**(밴드 20,644–22,833, 베이스라인과 겹치지 않음).
- 외부 시트 전체가 −66%, 나머지 −34% 는 **인라인 `<style>` 81블록**(head 364,878 B).

부수 실측: DOM 2,164 요소(박스 1,184 / 숨김 980 / `display:none` 445) · 스타일시트 95개(`<style>` 87 + `<link>` 8) · CSS 규칙 7,108개.
셀렉터 모양(정적 카운트): `:not()` 1,507개 · 깊이 4 이상 1,981개(그중 인라인 셸이 1,548개) · 키가 맨 태그인 것 1,374개.

### 4-2. 🔴 그런데 통째로 뺄 수는 없다 — 실측으로 확인

`dist/styles/fortune-ui.css` 를 **빈 파일로 바꾸고**(요소 인덱스를 유지하려고 `<link>` 제거가 아니라 내용 비우기) 시각 파리티를 돌렸다:

```
node scripts/verify-home-visual-parity.mjs --compare=base1,emptyfui --noise=base1,base2
  mobile-yeon   FAIL  scrollHeight 17465 → 17548 · computed style 차이 1,621건
  mobile-neo    FAIL  scrollHeight 17023 → 17104 · 3,055건
  desktop-yeon  FAIL  scrollHeight 19026 → 19930 · 7,085건
  desktop-neo   FAIL  scrollHeight 18362 → 19312 · 실측 다수
```

단순한 색 차이가 아니라 **기능 회귀**가 섞여 있다:
- `#fsnNavBar` — `transform: matrix(...,-56)` → `none`, `pointer-events:none` → `auto`. **숨어 있어야 할 내비가 드러난다.**
- `#destinyFlowerStudioSheet` — `opacity: 0` → `1`. **숨은 시트가 보인다.**
- 네오 모드 `body` 텍스트색 `rgb(200,200,200)` → `rgb(248,250,252)`.

즉 **홈은 이 시트를 실제로 쓴다.** 처방은 삭제가 아니라 **분할**이다.

### 4-3. ✅ 완료 — `fortune-ui.css` 분할 (PR #667)

`scripts/build-fortune-ui-critical.mjs` 신설. 실제 렌더에서 `element.matches()` 가 참인 규칙만 **4셀 합집합**으로 모아 `styles/fortune-ui-home.css`(1,077 규칙)를 만들고, 홈은 그것을 먼저 받고 **전체 시트는 기존 `data-cd-noncritical-style-src` 로 미룬다**(사라지는 게 아니라 늦게 온다).

동일 DOM A/B(로컬 dist, 모바일 5회 중앙값): **score 45 → 49 · FCP 3,152 → 2,770 · LCP 4,956 → 4,060 · TBT 2,071 → 2,394.** 시각 파리티 4/4 통과.

🔴 **생성기가 맞춰야 했던 3가지 — 전부 파리티 실패로 발견했다. 고치면서 되돌리지 말 것:**
1. 테마 키가 셸의 `NEO_KEY`(`fortuneThemeModeStateV1`)와 같아야 한다. 아니면 `body.neo-mode` 규칙이 통째로 빠진다.
2. 자식을 가진 at-규칙(`@keyframes`·`@layer`)은 순회하지 말고 **통째로** 내보낸다. 아니면 transform 이 죽고 flower studio 시트가 드러난다.
3. 합집합을 **시트 원래 순서로 정렬**한다. 아니면 데스크탑 전용 규칙이 뒤로 밀려 `font-weight` 를 이긴다.

🔴 **TBT 는 일부러 나빠졌다.** FCP 를 당기면 원래 TBT 창 밖에 있던 작업이 창 안으로 들어온다(§2 메커니즘). 다음 라운드가 작업량을 줄이면 이 손실은 되돌아온다.

### 4-4. 🔴 다음 라운드 — 매칭 규칙 수를 줄여야 한다 (CSS 다이어트가 아니라)

분할이 알려준 가장 중요한 사실: **비용은 "시트에 있는 규칙 수"가 아니라 "매칭되는 규칙 수"에 붙는다.**
안 쓰는 2,600 규칙을 걷어냈는데 RecalcStyle 은 38,307 → 33,222ms, **−13%** 였다. 전체 제거가 −43% 였던 것은 매칭되는 규칙까지 같이 없앴기 때문이다. 안 맞는 규칙은 해시 버킷에서 싸게 걸러진다.

그래서 남은 지렛대는 두 개다:
- **매칭 규칙이 가장 많은 표면은 셸의 인라인 CSS 다 — 1,992 규칙**(`cosmic-main.css` 540 · `core-ui.css` 171 · `fortune-ui.css` 228). 그리고 **깊이 4 이상 셀렉터 1,981개 중 1,548개가 그 인라인**이다. 깊은 후손 셀렉터는 조상 walk 를 강요한다.
- **요소 수 축소(L6)** — 2,164 요소. 비용은 `매칭 규칙 × 요소` 라 이쪽도 같은 곱을 줄인다. 사용자 승인 범위이며 조건은 "숨기기가 아니라 하단 탭 + 전체 기능 시트로 흡수".

같은 방법(`build-fortune-ui-critical.mjs`)을 `cosmic-main.css` 에도 적용할 수 있으나, 위 이유로 기대 이득은 규칙 수 비례보다 작다. **먼저 재 볼 것.**

### 4-5. 이전 라운드 계획 (참고)

목표: 홈이 매칭하는 규칙만 남긴 작은 시트를 홈에 주고, 609KB 원본은 홈에서 안 받게 한다.

- 🔴 **정적 grep 으로 "안 쓰는 규칙"을 판정하지 말 것** — 위 §3-5. 판정은 **`CSS.startRuleUsageTracking`**(이미 `scripts/measure-home-style-cost.mjs` 가 쓴다) 으로 브라우저가 실제 매칭한 규칙만 센다.
- 🔴 **런타임에 나중에 생기는 클래스를 놓친다**는 것이 그 방법의 약점이다. 그래서 **커버리지를 한 번만 걷지 말고**, 모달·오버레이·컬렉션 펼침 등 홈에서 도달 가능한 상태를 밟은 뒤에도 걷어 합집합을 쓴다.
- 안전망은 `verify-home-visual-parity.mjs` 다. **분할본으로 4셀 전부 통과**해야 한다.
- 그 다음 지렛대는 **인라인 `<style>` 81블록(−34%)** 이다. 같은 방법을 적용한다.
- ⚠️ 이 작업은 `dist` 단계에서 한다(§6-1). 소스 `index.html` 구조를 바꾸면 문자열 가드 61개가 깨진다.

**남은 후순위** (1차 개정본에서 그대로 유효):
- L4 파서 블로킹 셸 청크 18개 중 13개 `defer` (140,513 B br). 🔴 FCP 를 더 당겨 TBT 가 더 나빠질 수 있으니 **작업량 감축과 함께** 낼 것. 블로킹 유지 5개: `s-a912e5da6adadd69`·`s-7bcdba92aaa3009d`·`s-49eb61aeb0e25642`·`s-884dcf881587689b`·`s-a99efd85dbb93094`.
- L6 요소 축소(`<option>` 91개 지연 생성, `#cdSigGrid` 119·`#cdAiFeatures` 98·`#fsp-grid` 74). 🔴 사용자 조건: 축소는 "숨기기"가 아니라 **하단 탭 + 전체 기능 시트로 흡수**. PR 에 축소 항목 수 + 접근 경로 표 필수.
- L7 `content-visibility` 재시도. 🔴 **착수 전 사용자에게 "`d29310c4a` 로 되돌렸을 때 무엇이 보였는지" 먼저 물을 것** — 사유가 레포 어디에도 없다. **아직 안 물어봤다.**

---

## 5. 목표 역산

Lighthouse 모바일: **TBT 30% · LCP 25% · CLS 25% · FCP 10% · SI 10%**

| 지표 | 현재 | 목표 | 기여 |
|---|---|---|---|
| TBT | 1,216 ms | ≤ 600 ms | ~15/30 |
| LCP | 6,696 ms | ≤ 4,000 ms | ~12.5/25 |
| CLS | 0.038 | 유지 | 25/25 |
| FCP | 5,119 ms | ≤ 3,000 ms | ~5/10 |
| SI | 6,609 ms | ≤ 5,000 ms | ~6/10 |
| | **39** | | **~63** |

🔴 **TBT(작업량)를 먼저, 페인트를 나중에.** 반대로 하면 점수가 더 떨어진다 — 지금까지 정확히 그 순서로 일어났다. **그리고 LCP 도 페인트가 아니라 작업량 문제다**(§2).

---

## 6. 이 레포 고유의 작업 규칙

1. 🔴 **성능 최적화는 `dist` 단계에서만.** 정본 자리는 `scripts/run-postbuild.mjs` 의 `verify-adsense-readiness` **뒤** steps(`externalize-dist-inline-scripts` → `minify-dist-js` → `minify-dist-css`).
2. `index.html` 을 고쳤으면 **`npm run sync:public`**. 미러는 **6벌**(`public/index.html`·`public/static/`·`public/{en,ja,zh,zh-tw}/`) 이고 전부 `scripts/sync-legacy-static-to-public.mjs` 가 루트에서 **생성**한다 — 미러를 손으로 고치지 말 것.
3. `sitemap.xml`·`public/sitemap.xml` 의 `lastmod` 는 빌드 부산물. 커밋 금지 — `git checkout -- sitemap.xml public/sitemap.xml`.
4. 격리된 **git worktree** 에서 작업(동시 세션이 디렉터리 공유). 2차 세션은 `.claude/worktrees/perf-home-shell` 사용(node_modules 보유).
5. **머지는 사용자가 한다.** PR 까지만.
6. 🔴 **CI 에 새 게이트 금지**(사용자 지시). 새 `verify:*` 는 `scripts/verify-guard-wiring.mjs` 의 `UNWIRED_BY_DESIGN` 등재 의무가 생기므로 **측정 도구는 `perf:*` 로 이름 지을 것**.
7. 🔴 **`/cdn-cgi/image/` 는 zone 기능이라 로컬·`*.pages.dev` 프리뷰에서 404**(`scripts/deploy-smoke.mjs:68-74`). 새 `/cdn-cgi/` 태그에는 정본 `onerror` 폴백(`dataset.cdImgFallback` 가드 + `removeAttribute('srcset')`)이 **필수**다. 없으면 프리뷰 스모크가 릴리스를 막는다.
8. **ablation 은 `dist` 에 직접 해도 된다** — 다음 빌드가 덮어쓴다. 다만 백업 후 반드시 복원할 것. `dist/` 는 커밋 대상이 아니다.

---

## 7. 도구와 검증

| 명령 | 파일 | 용도 |
|---|---|---|
| `npm run perf:home` | `scripts/measure-home-lighthouse.mjs` | 로컬 dist brotli Lighthouse. **`--url=` 로 프로덕션도 가능(키 불필요)** |
| `npm run perf:style-cost` | `scripts/measure-home-style-cost.mjs` | CDP 로 RecalcStyleCount/ms·LayoutCount·DOM 인구조사·실제 매칭 규칙 수 |
| `node scripts/verify-home-visual-parity.mjs` | 동명 파일 | 4셀(모바일/데스크탑 × 연이/네오) computed style 전수 + scrollHeight + 스크린샷 |

**2차 세션이 `perf:home` 에 추가한 것** (커밋 `9b6d8bdbf`·`477de5a27`)
- **LCP 요소**(선택자·스니펫·렌더 박스) 와 **LCP 단계 분해**(TTFB / load delay / load duration / render delay)
- **실제 다운로드된 이미지**와 바이트 · **이미지 전송 절감 여지**(이유 문구 포함)
- **강제 동기 레이아웃**을 소스 위치별로

🔴 **감사 id 가 Lighthouse 13 에서 갈렸다.** `largest-contentful-paint-element` 는 **없어졌고**, `lcp-discovery-insight` 는 **LCP 가 이미지일 때만** 값이 있으며(텍스트 LCP 면 `lcp-breakdown-insight` 만 답한다), `uses-responsive-images` 는 `image-delivery-insight` 에 흡수됐다. **한쪽만 보면 실패하지 않고 조용히 빈 값이 나온다** — 실제로 첫 실행이 그랬다. 세 id 를 순서대로 훑도록 해 뒀다. `slow-css-selector-insight` 는 **LH13 에 존재하지만 구현이 비어 있다**(`// TODO: implement`) — 기대하지 말 것.

**시각 동일성 검증기 사용 시 반드시 알아야 할 것**
1. `*{animation:none!important}` 는 **안 먹는다** — `*` 는 특이도 0.
2. 재생속도 0 도 부족 — 멈추는 지점이 회차마다 다르다. 현재 방식: `anim.currentTime=0; anim.pause()` + `svg.setCurrentTime(0)`.
3. 남는 흔들림은 `--noise=<A>,<B>`(같은 dist 두 벌)로 **측정해서** 제외. 손으로 무시 목록 쓰지 말 것.
4. `background-image` 는 문자열이 아니라 **실제 렌더**로 비교한다.
5. 🔴 **요소 수가 바뀌는 ablation 은 비교가 무의미하다** — 이 도구는 **인덱스로 짝을 맞춘다.** `<link>` 를 지우면 전 요소가 한 칸 밀려 차이가 6,398건으로 튄다(전부 허수). CSS 를 죽이려면 **태그를 지우지 말고 파일 내용을 비울 것.** 2차 세션이 이걸로 한 번 헛디뎠다.

### 라운드마다 돌릴 것

```bash
npm run build:cf
npm run perf:home -- --runs=5 --preset=mobile --label=<R> --out=<tmp>
npm run perf:style-cost -- --runs=3 --preset=mobile --label=<R>
node scripts/verify-home-visual-parity.mjs --snapshot --label=<R>
node scripts/verify-home-visual-parity.mjs --compare=<이전>,<R> --noise=<이전>,<이전2>
MOBILE_CDP_TARGET=dist npm run verify:mobile-cdp-smoke
npm run typecheck && npm run lint
npm run verify:public-parity && npm run verify:locale-main-sync && npm run verify:payment-freeze
npm run verify:mobile-detail-nonintrusive && npm run verify:mobile-detail-render && npm run verify:hero-contrast
```

**판정 규칙(사전 고정)**: 5회 중앙값이 베이스라인 **min~max 밴드 밖**으로 나갈 때만 개선으로 인정. 주 지표 **TBT·LCP**.
**배포 후**: `npm run perf:home -- --url=https://code-destiny.com --runs=5 --preset=mobile` + **사용자에게 PSI 1회 요청**.

---

## 8. 열린 항목 / 사용자에게 물어야 할 것

1. 🔴 **`d29310c4a` 가 containment(`18e28782e`)를 되돌린 이유** — 커밋 메시지가 한 줄뿐이고 `CLAUDE.md`·`AGENTS.md`·`docs/**` 어디에도 없다. **L7 착수 전 필수. 아직 안 물어봤다.**
2. **현재 PSI 모바일 점수** — 미확정. 위 39점은 `perf:home --url=` 값이다.
3. 별건 보고 대상: 엣지가 **404 를 2일간 캐시**하는 대시보드 Cache Rule 이 아직 살아 있다(`/js/shell/` 404 응답에 `max-age=172800`). `_headers` 에는 그 값이 없다.

---

## 9. PR 이력

| PR | 상태 | 내용 |
|---|---|---|
| #658 | 머지·배포됨 | `scripts/minify-dist-css.mjs` 신설 + postbuild 배선 |
| #660 | **머지됨** | `psi-lighthouse-audit.mjs` 의 조용한 건너뜀 제거 + 이 문서 1차본 |
| #662 | **머지·배포됨** (`cf9335180`) | `perf:home` 측정 확장(LCP 요소·단계 / 실제 로드 이미지 / 강제 리플로) + 이 문서 2차 개정 |
| #667 | 열림 | `fortune-ui.css` 분할 — 생성기 신설 + 홈 부분집합 + 전체 시트 지연 |

## 10. 별건 (이 작업과 무관, 확인 권장)

- 🔴 `MOBILE_CDP_TARGET=dist npm run verify:mobile-cdp-smoke` 가 실패한다:
  `Tap point occluded for .moon-preview-card[href="/tarot/mingri"]: top element is div.cd-pwa-install-prompt__backdrop`
  **분할 전 변형에서도 동일하게 재현**되므로 #667 원인이 아니다. PWA 설치 배너 배경이 홈 카드 탭을 가린다는 뜻이라 실사용 영향 가능성이 있다.
- 엣지가 **404 를 2일간 캐시**하는 대시보드 Cache Rule 이 아직 살아 있다(`/js/shell/` 404 응답에 `max-age=172800`). `_headers` 에는 그 값이 없다.
