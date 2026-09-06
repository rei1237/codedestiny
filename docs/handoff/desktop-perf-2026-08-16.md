---
status: active
updated: 2026-08-16
next: "§7-1 \"PR #716 이후 남은 것\" 순서대로 — 인라인 46블록 분리가 첫 항목이다"
---

# 인수인계 — 데스크탑 홈 성능 (2026-08-16)

> 모바일 INP 라운드(`docs/handoff/inp-round3-2026-08-16.md`, 5라운드까지)는 **끝났다.**
> 이 문서는 **데스크탑 홈** 최적화를 처음부터 시작하는 세션을 위한 것이다.
> 🔴 **이 문서만 읽고 시작할 수 있게** 쓴다. 수치는 전부 아래 §2 의 명령으로 재현된다.
>
> 🔴🔴 **2026-08-16 정정됨 — 착수 전에 아래 §0-A 를 먼저 읽어라.** 이 문서의 후보 3개 중
> **①은 대부분 실재하지 않았고, ②는 좌표만 맞고 처방이 틀렸으며, ③은 수치가 8배 어긋났다.**
> 정정은 PR [#716](https://github.com/rei1237/codedestiny/pull/716) 의 실측이며, 각 절 안에도 그 자리에 표시해 뒀다.

---

## 0-A. 🔴 2026-08-16 정정 (PR #716 실측)

| 이 문서의 주장 | 실측 | 판정 |
|---|---|---|
| §0·§3-1 리사이즈 미경유 이미지 4개 ≈221~236KB | `luck-sync-diary-v2`(`index.html:13648`)·`orbs/core`(`:13673`)는 **이미** `/cdn-cgi/image/` 경유였다(#704) | **≈160KB 는 실재하지 않음** |
| 그 수치가 나온 이유 | `perf:home` 은 `dist/` 를 **로컬 정적 서버**로 띄우는데 로컬에는 `/cdn-cgi/` 가 없다 → **같은 출처** 리사이즈 URL 이 404 → #704 의 `onerror` 폴백이 **원본**을 다시 받는다. 리포트에 `…/cdn-cgi/image/…/luck-sync-diary-v2.webp` **0KB**(404)와 `/fuctionassets/luck-sync-diary-v2.webp` **100KB**(폴백)가 나란히 찍힌다. `assets.code-destiny.com` 절대 URL 은 진짜 CDN 이라 로컬에서도 동작하므로 **두 종류가 한 표에 섞인다** | 🔴 **로컬 측정 아티팩트** |
| §3-1 `app-logo-512` 63KB 낭비 | 실파일 **31,916 B**. 63KB 는 ≈31.9×2 로 **2회 다운로드** 신호이며 같은 실측이 `js/mobile-performance-bootstrap.js:219-223` 에 이미 있다. 게다가 `index.html:544-553` 에 리사이즈 **금지 정책 주석**이 있고 verify 6곳(`verify-portone-single-payment-regression.mjs:571,575,576,577,582` · `verify-paid-gate-ui-regression.mjs:155,177`)이 이 URL 을 리터럴로 단언한다 | **손대면 안 되는 대상** |
| §2 "Lighthouse desktop 프리셋(1440×1000)" | `node_modules/lighthouse/core/config/constants.js:30-32` → **1350×940, dSF 1** | 오기 |
| §3-3 히어로 `width=1280` → 1160 으로 낮춰라 | 표시폭은 1350뷰포트 ≈1171 / 1440 ≈1269 / **1920 ≈1256**(`--cd-w-wide` 1440 캡). `sizes` 의 `1260px` 슬롯이 이미 그 값에 맞춰져 있다 | 🔴 **낮추면 역효과** |
| §3-3 렌더 지연 후보 = 부트 게이트 베일 | `index.html:507` 조건상 **데스크탑 비로그인은 `.cd-boot-gate` 미부착**이고 `.cd-boot-gate__veil{display:none}`(`:522`)이 유지된다. `:487-489` 주석이 *"Lighthouse·CrUX·AdSense 심사·크롤러가 전부 이 경우"* 라고 직접 명시 | **기각** |
| §3-3 렌더 지연 후보 = 히어로 등장 연출 | `.cd-hero-island*` 에 opacity/transform/animation/transition **0건**, JS 클래스 토글 없음 | **기각** |
| §2-1 요소 렌더 지연 493ms | 같은 dist 두 배치에서 **217ms / 324ms** — 이 지표의 배치 간 변동이 ±107ms 다 | **판정 불가 지표** |
| §3-4 모바일 전용 인라인 CSS 11KB | 실측 46블록 **raw 372.8KB / gzip 62.4KB / brotli 기여 45.6KB**. 어떤 계산으로도 11KB 가 안 나온다 | **8배 이상 어긋남** |
| §2-2·§3-2 강제 리플로우 221.3ms 귀속 | **좌표는 정확하다** — 청크 오프셋 `0:6824` 가 `window.scrollY` 토큰과 바이트 단위로 일치하고(`matchMedia` 는 6639/6702 로 배제), 데스크탑 부팅 동기 경로의 레이아웃 강제 읽기는 전수 분류(67건) 결과 이 한 곳뿐이다. **그러나 처방이 틀렸다** — §3-2 참조 | 좌표 ✅ / 처방 ❌ |

**베이스라인도 다시 재라.** #708·#710~#713 이 머지되며 베이스가 움직였다 — 같은 명령 5회 중앙값이
Performance 68→**76~78**, LCP 2,410→**2,213/2,234**, TBT 373→**246/228**, 렌더 지연 493→**217/324** 였다.

🔴 **판정에 쓸 수 있는 지표와 없는 지표가 갈린다** (같은 dist 를 두 번 재서 얻은 노이즈 바닥):

| 지표 | 배치 간 차이 | 판정용 |
|---|---|---|
| FCP | 617 / 615 (±2ms) | ✅ |
| Style & Layout(메인스레드 breakdown) | 971 / 970 (±1ms) | ✅ **가장 안정** |
| 강제 리플로우 `@6824` | 118 / 115 (이상치 224 한 번) | ⚠️ 대체로 안정 |
| LCP | 2213 / 2234, 밴드 1,670–2,789 | ❌ 밴드 1,100ms |
| LCP 렌더 지연 | 217 / 324 | ❌ |

---

## 0. 30초 요약

- 🔴 **데스크탑의 병목은 모바일과 다르다.** 모바일은 TBT(1,431ms)였지만
  **데스크탑은 TBT 373ms 로 이미 괜찮고, LCP 2,410ms 가 문제다.**
  모바일에서 통했던 `content-visibility` 식 접근을 그대로 가져오면 헛돈다.
- LCP 2,410ms 의 내역: **리소스 로드 1,141ms + 요소 렌더 지연 493ms**. 둘 다 봐야 한다.
  - 🔴 **정정(§0-A)**: 렌더 지연은 같은 dist 두 배치에서 217/324ms 로 흔들린다. **이 지표로는 판정하지 마라.**
- ~~근거가 확실한 후보 3개(§3)~~ 🔴 **셋 다 정정됐다(§0-A)**: **① 리사이즈를 안 거치는 이미지 4개(≈221KB 낭비)**
  — 실제로는 2개가 이미 처리돼 있었고 나머지 수치도 로컬 404 폴백 아티팩트다.
  **② 데스크탑 전용 강제 리플로우 221ms 한 지점** — 좌표는 맞지만 §3-2 의 처방은 **측정으로 기각됐다**.
  **③ 데스크탑에 실려 오는 모바일 전용 CSS 11KB** — 실측 raw 372.8KB. 다만 **진짜 이득은 여기가 아니라
  `index.html:731` 의 `mobile-lite.css`(36KB, `media="all"`)였고 그것은 PR #716 에서 처리했다.**
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

🔴 **정정(2026-08-16, PR #716)**: 프리셋은 **1440×1000 이 아니라 1350×940**이다
(`node_modules/lighthouse/core/config/constants.js:30-32`). 그리고 **이 표는 이미 낡았다** —
#708·#710~#713 머지 후 같은 명령의 5회 중앙값은 Performance **76 / 78**, LCP **2,213 / 2,234**,
TBT **246 / 228**, FCP **617 / 615**, SI **1,721 / 1,678** 이었다(두 배치 = 노이즈 바닥).
**before/after 는 반드시 같은 날 같은 기계에서 둘 다 뜰 것.**

비교용 — 같은 날 같은 기계의 **모바일**: TBT 1,431ms · Performance 51 · SI 4,966ms.
👉 **데스크탑은 TBT 가 모바일의 1/4 이다. 여기서 TBT 를 더 깎는 것은 우선순위가 아니다.**

### 2-1. LCP 내역 (중앙값)

| 구간 | ms |
|---|---:|
| **리소스 로드 시간** | **1,141** |
| **요소 렌더 지연** | **493** |
| 리소스 로드 지연 | 14 |
| TTFB | 4 |

🔴 **정정**: 요소 렌더 지연은 **같은 dist 두 배치에서 217ms / 324ms** 로 나왔다(2026-08-16 재측정).
배치 간 변동이 ±107ms 라 **이 숫자로는 개선을 증명할 수 없다.** 493ms 를 목표로 삼지 마라.
LCP 자체도 밴드가 1,670–2,789ms 라 5회 표본으로는 판정이 안 된다 — 판정에는 **FCP(±2ms)** 와
**메인스레드 `Style & Layout`(±1ms)** 을 써라(§0-A 의 노이즈 표).

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

🔴🔴 **이 표는 로컬 측정 아티팩트다 — 프로덕션 수치가 아니다(2026-08-16 확인).**
`perf:home` 은 `dist/` 를 로컬 정적 서버로 서빙하는데 로컬에 `/cdn-cgi/` 가 없어 **같은 출처**
리사이즈 URL 이 전부 404 가 되고, #704 가 붙인 `onerror` 폴백이 **원본**을 다시 받는다.
같은 리포트 안에 증거가 나란히 있다 — `…/cdn-cgi/image/width=320,…/luck-sync-diary-v2.webp` **0KB**(404)와
`/fuctionassets/luck-sync-diary-v2.webp` **100KB**(폴백). 반면 `assets.code-destiny.com` 절대 URL 은
진짜 CDN 이라 로컬에서도 200 이다. **즉 아래 표에는 "리사이즈된 것"과 "폴백된 원본"이 섞여 있다.**
👉 **이미지 바이트는 `perf:home -- --url=https://code-destiny.com/` 으로만 판정할 것.**

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

🔴 **정정**: 마지막 줄의 "11KB" 는 재현되지 않는다. 인라인 모바일 블록은 **46개 / raw 372.8KB**
(gzip 62.4KB · brotli 기여 45.6KB)다. 그리고 `fonts-serif.css`(`index.html:782`)는 이미 print-swap 이라
**렌더블로킹이 아니다** — 그 13KB 는 로드 방식이 아니라 `@font-face` 189개 중 실제 사용분이 적다는 뜻이다.
🔴 이 표가 놓친 진짜 항목 둘: **`styles/cosmic-main.css` 는 21KB 미사용이 문제가 아니라 `index.html:1920`
에서 264KB 통째로 렌더블로킹**이고(바로 위 `:1916-1918` 주석은 "비동기 로드"라고 적혀 있어 코드와 어긋난다),
**`styles/mobile-lite.css` 36KB 가 `media="all"` 로 데스크탑까지 블로킹**이었다(PR #716 에서 처리).

---

## 3. 근거가 있는 후보 (실측 순, 착수 순서 제안)

### 3-1. ~~🥇 리사이즈를 안 거치는 이미지 4개 — 확실하고 위험이 낮다~~ 🔴 대부분 실재하지 않았다

> **정정 (2026-08-16, PR #716)** — 4개 중 **실제로 남아 있던 것은 1개뿐**이다.
>
> | 자산 | 실측 |
> |---|---|
> | `luck-sync-diary-v2.webp` | `index.html:13648` 이 **이미** `/cdn-cgi/image/width=320,quality=80,format=auto/…` + 1x/2x srcset + `onerror` 폴백 (#704 `634018fc1`) |
> | `fusion-fortune/orbs/core.webp` | `index.html:13673` 이 **이미** `width=224` 적용 |
> | `icons/app-logo-512.webp` | 실파일 **31,916 B**(문서의 63KB 는 2배). `index.html:544-553` 이 리사이즈·`?v=` 를 **금지**하고 verify 6곳이 이 URL 을 리터럴로 단언한다 → **손대지 말 것** |
> | `flower-pig-honey-hug.webp` | `index.html:13662` 맨 `<img src>`, srcset 없음 — **유일하게 유효**. 단 `docs/handoff/mobile-home-perf.md:66` 에 이 자산을 리사이즈했더니 22,890 → **41,737 B(+82%)** 로 커진 실측이 있다. **전환 전 원본 대비 바이트 프로브 필수.** |
>
> 아래 원문은 대조용으로 남긴다.

`/cdn-cgi/image/` 를 **안 거치는** 4개가 낭비의 대부분이다:
`luck-sync-diary-v2.webp`(95KB) · `fusion-fortune/orbs/core.webp`(65KB) ·
`icons/app-logo-512.webp`(61KB) · `fortune-tea-house/flower-pig-honey-hug.webp`(15KB) = **≈236KB**.

🔴 **이 레포에서 이미지 리사이즈 수단은 `/cdn-cgi/image/` 하나뿐이다** — `next.config` 가
`images.unoptimized` 라 `<Image>` 최적화가 꺼져 있다. PR [#704](https://github.com/rei1237/codedestiny/pull/704)
가 홈 이미지 일부를 그 경로로 옮겼지만 위 4개는 **남았다**(그래서 지금도 원본이 나간다).

⚠ `/icons/app-logo-512.webp` 는 참조가 5곳이고 **성격이 다르다**:
`index.html:554`(`<link rel=preload as=image fetchpriority=high>`) · `:1627`(CSS `background-image`) ·
`:7183`(부트 게이트 로고, 88×88) · `:12032` · `:19755`(86×86, lazy).
~~**preload 는 LCP 경쟁 자원이므로 이것부터 줄여라.**~~ 표시 크기가 전부 ≤88px 인데 512px 원본이 나간다.

🔴 **정정: 이 지시를 따르지 마라.** 참조는 5곳이 아니라 **8곳**(`:554` `:1627` `:7183` `:12032` `:19755`
`:27203` `:28747` `:35821`)이고, `index.html:544-553` 에 *"이 로고에는 리사이즈를 쓰지 않는다 …
그건 결제 경로 정책 변경이라 임의로 하지 말 것"* 이라는 정책 주석이 박혀 있다. 이유는 URL 이 갈리면
캐시 키가 갈려 **같은 그림을 두 번 받고** 결제 오버레이가 콜드 캐시가 되기 때문이다.
게다가 `js/io-image-lazy-loader.js:84-87,127-128` 이 **데스크탑에서도** 맨 URL srcset 을 주입해
HTML 만 고치면 무효가 된다. 문서의 "63KB" 자체가 31.9KB × 2 = **이중 다운로드 신호**일 가능성이 높다
(같은 실측이 `js/mobile-performance-bootstrap.js:219-223` 에 있다).

~~착수 전 확인: `/cdn-cgi/image/` 가 같은 출처 경로에도 붙는지 먼저 한 장으로 확인하고~~
🔴 **이미 실증됐다** — #704(`634018fc1`) 가 같은 출처 상대 경로 10개를 옮기고 *"All ten resized URLs
verified 200 against production"* 을 남겼다. 현재 `index.html` 의 `/cdn-cgi/image/` 참조는 **77개**
(같은 출처 상대 39 + `assets.code-destiny.com` 절대 38)다.

~~🔴 새 경로는 엣지에 굳은 404 가 캐시될 수 있으니 `?v=` 캐시 키를 반드시 붙여라~~
🔴 **정정: `/cdn-cgi/image/` URL 에는 `?v=` 를 붙이지 마라.** 현행 77개 전부 쿼리스트링이 없고,
#704 도 붙이지 않았다. `?v=` 는 원본 자산 참조의 규약이고, 특히 `app-logo-512` 에는 **금지**다
(`js/share.js:1099-1101` · `js/io-image-lazy-loader.js:16-20` 이 각각 사유를 적어 뒀다).

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

~~👉 **먼저 확인할 것**: 부팅 중 동기 `apply()` 호출을 빼거나 rAF 로 미뤘을 때 그 221ms 가 실제로 사라지는지.~~

## 🔴 확인했다 — rAF 이월은 **측정으로 기각됐다** (2026-08-16, PR #716)

`apply()` 를 `pending = true; window.requestAnimationFrame(apply)` 로 바꿔 5회 측정한 결과:

| | 변경 전 | **rAF 이월 후** |
|---|---:|---:|
| 강제 동기 레이아웃 `@6824` | 118 / 115ms | **175.1ms — 사라지지 않았다** (+ 신규 항목 1개 + 미귀속 174.6ms) |
| TBT | 246 / 228ms | **411ms** [288–449] |
| Performance | 76 / 78 | **68** [63–74] |
| Style & Layout | 971 / 970ms | **1,155ms** |

읽기를 미루면 **그 사이 DOM 이 더 쌓여 레이아웃이 오히려 커진다.** 되돌렸고 기각 사유를
`index.html` 그 자리 주석에 박아 뒀다 — **다시 시도하지 마라.**

**범인 판별은 끝났다**(따라서 아래 "어느 쪽이 범인인지 갈라야 한다"는 이미 해결됨):
청크 오프셋 `0:6824` 는 `window.scrollY` 토큰 시작과 바이트 단위로 일치하고(`window.` 7자 + 6817),
`matchMedia` 호출은 6639 / 6702 라 배제된다. 데스크탑 부팅 동기 경로에서 레이아웃을 강제하는 읽기는
`scrollY|pageYOffset|getBoundingClientRect|offsetTop|offsetHeight|clientHeight|scrollHeight|getComputedStyle|matchMedia`
**67건 전수 분류** 결과 **이 한 곳뿐**이다.

⚠ 그리고 이 지표에도 이상치가 있다 — 같은 코드에서 **118 / 115 / 124ms 에 224ms 가 한 번** 나왔다.
문서 서두의 221.3ms 는 그 이상치와 같은 대역이니 **한 번의 측정으로 착수 근거를 삼지 마라.**

⚠ 스크롤 시 배경이 안 움직이면 회귀다. 첫 페인트에 `--cd-atmos-scroll` 이 0 이어도 되는지
(=페이지가 스크롤된 채 복원 진입하는 경우)를 함께 봐라. `history.scrollRestoration = 'manual'`
이 `js/core/init.js:28-32` 에 걸려 있지만 `index.html:34272` 의 `type="module"`(암묵적 defer)로 실행돼
**패럴럭스보다 20,186줄 뒤**에 설정된다 — 즉 새로고침 시 브라우저 복원이 먼저다.

### 3-3. 🥉 LCP 히어로 이미지 — 로드 1,141ms + 렌더 지연 493ms

- **로드 쪽**: `width=1280` 이 1154 표시에 과대(32KB). ~~`width=1160` 으로 낮춘다.~~
  🔴 **정정: 낮추면 역효과다.** 표시폭은 `min(뷰포트,1440) − 2×clamp(16,4vw,64) − 36 − 20` 이라
  1350뷰포트 ≈1171 / 1440 ≈1269 / **1920 ≈1256**(`--cd-w-wide` 1440 캡)다. `sizes` 세 번째 슬롯
  `1260px` 이 이미 그 캡에 맞춰져 있다. 1280w 를 없애면 실제 데스크탑에서 화질만 떨어진다.
  손댈 거면 1280w 를 **유지한 채** 중간 후보를 추가하고 `86vw` 를 실제 폭에 맞게 좁히는 쪽이다.
  🔴 그리고 **`index.html:787` 에 같은 URL 의 `<link rel=preload as=image imagesrcset imagesizes>` 쌍둥이가 있다**
  — `srcset`/`sizes` 를 고치면 **반드시 동시에** 고쳐라(불일치 시 두 번 받는다). 이 문서는 그것을 빠뜨렸다.
- ~~**렌더 지연 493ms**~~ 🔴 **정정: 후보 2개 모두 기각됐고, 지표 자체가 판정 불가다.**
  - **부트 게이트 베일 — 기각.** `index.html:507` 이 `(cdTouch || cdAuthHint) && !cdBooted && …` 일 때만
    `.cd-boot-gate` 를 붙인다. 데스크탑 비로그인은 `cdTouch=false`·`cdAuthHint=false` 라 **미부착**이고
    `.cd-boot-gate__veil{display:none}`(`:522`)이 유지돼 렌더 트리에 아예 없다.
    `:487-489` 주석이 *"Lighthouse·CrUX·AdSense 심사·크롤러가 전부 이 경우"* 라고 직접 적어 뒀다.
  - **히어로 등장 연출 — 기각.** `.cd-hero-island*` 에 opacity/transform/animation/transition **0건**,
    JS 클래스 토글 없음, 정적 마크업 + preload + `fetchpriority=high`.
  - **지표 자체가 못 쓴다.** 같은 dist 두 배치에서 217 / 324ms.
  - 🔴 **`styles/core-ui.css` 를 비블로킹으로 바꾸지 마라** — `scripts/verify-paid-gate-ui-regression.mjs:490`
    이 `<link rel="stylesheet" href="/styles/core-ui.css` 를 리터럴로 단언하고 그 가드는
    `deploy:critical`·`check:critical` 양쪽에 들어 있다.
  - **진짜 후보는 따로 있다**: `index.html:1920` 의 `cosmic-main.css` **264KB 렌더블로킹**
    (`:1916-1918` 주석은 "비동기 로드"라고 적혀 있어 코드와 어긋나고, `:784` 에 preload 까지 있는데
    형제 시트 10여 개가 쓰는 `data-cd-noncritical-style-src`+`media=print` 패턴에서 이 한 줄만 빠졌다) ·
    `<head>` 인라인 `<style>` 43블록 **436KB**(첫 페인트 전 CSSOM 총 ≈837KB).
    ⚠ 단 `cosmic-main.css` 통짜 지연은 `mobile-home-perf.md:95` 에 **`8fc05dd53` 이 CLS 로 기각**한 기록이
    있으니 기각 사유 재현이 선행돼야 한다.

### 3-4. ~~모바일 전용 CSS 11KB 를 데스크탑이 받는다~~ 🔴 수치 정정 + 더 싼 표적이 따로 있었다

> **정정 (2026-08-16, PR #716)**
> - 인라인 모바일 블록은 **46개 / raw 372.8KB**(gzip 62.4KB · brotli 기여 45.6KB)다. "11KB" 는 재현 불가.
> - 🔴 **그런데 인라인을 분리하기 전에 훨씬 싼 표적이 있었다** — `index.html:731` 의
>   `styles/mobile-lite.css` **36,325 B 가 `media="all"`** 이라 데스크탑까지 렌더블로킹이었다.
>   그 파일은 **최상위(비-`@media`) 규칙이 0개**이고 93개 규칙 전부가 `@media` 안 +
>   `html.cd-mobile-runtime`(62) · `html.cd-mobile-lite`(14) · `[data-component="MobileFeatureDetail"]`(17,
>   그 자체가 모바일 MQ 안) 스코프라 **데스크탑 매칭이 0개**였다.
>   `media` 를 파일이 실제로 쓰는 조건들의 합집합(`(max-width: 1024px), (hover: none) and (pointer: coarse)`)
>   으로 좁혀 처리했다. 요소 수가 안 바뀌어 시각 파리티로 검증 가능했고 **4/4 셀 computed style 동일**이었다.
>   측정: Style & Layout 971/970 → **933/924ms**, LCP 2213/2234 → **1898/1896ms**, Performance 76/78 → **80/82**.
>   FCP 는 **안 움직였다** — 이 시트는 첫 페인트의 장대가 아니었다는 뜻이다.
> - 🔴 `media` 를 좁힐 때 **파일 안의 가장 넓은 조건**을 봐야 한다. `mobile-lite.css` 에는
>   `(max-width: 1024px)` 블록이 있어 768 로 좁히면 769~1024px 구간이 사라진다.
> - 인라인 46블록 분리는 **여전히 미착수**이며 아래 함정이 그대로 적용된다.

인라인 `@media (max-width:768px),(hover:none) and (pointer:coarse){…}` 블록들이다.
⚠ **`@media` 로 분리해 별도 시트로 빼는 것은 겉보기만큼 안전하지 않다** — `cd-mobile-runtime` 은
`index.html:477` 에서 **MQ 또는 UA 정규식**으로 붙으므로, 미디어 쿼리로만 나누면
"UA 는 모바일인데 폭은 넓은" 기기에서 규칙이 사라진다. 이 함정은 `docs/handoff/inp-round3-2026-08-16.md`
§6-8 에 실측으로 적혀 있으니 **그것부터 읽어라.**

---

## 4. 🔴 도구 현황 — 무엇이 되고 무엇이 없나

| 도구 | 데스크탑 | 비고 |
|---|---|---|
| `perf:home -- --preset=desktop` | ✅ | **1350×940**(1440×1000 아님 — lighthouse `desktop-config` 정본). TBT·LCP·롱태스크·강제리플로우·이미지 낭비·미사용 CSS 를 한 번에 준다. 🔴 **이미지 항목은 로컬에서 못 믿는다(§2-3)** — `--url=https://code-destiny.com/` 을 써라. 🔴 미사용 CSS·main-thread breakdown 은 **콘솔에만** 나오고 `.md` 에는 없다(콘솔을 캡처할 것) |
| `perf:style-cost -- --preset=desktop` | ✅ | 1440×1000 (`scripts/measure-home-style-cost.mjs:52`) |
| `verify-home-visual-parity` | ✅ | 데스크탑 셀 2개(`desktop-yeon`·`desktop-neo`, 1440×1000) |
| **`perf:interaction`** | ❌ | 390×844·`isMobile:true` **하드코딩**. 데스크탑 INP 를 못 잰다 |
| **`perf:tap-cost`** | ❌ | 390×844 하드코딩 (`scripts/measure-tap-fixed-cost.mjs:190`) |

🔴 **데스크탑 INP 를 건드릴 거면 도구 확장이 1번 작업이다.** ~~그리고 그건 이미 예약돼 있다 —
`scripts/measure-home-interaction.mjs:67-69` 주석이 …되살린다 고 적어 뒀다.~~

🔴 **정정 (2026-08-16): 그 주석의 지시를 그대로 따르면 데스크탑 런이 무조건 죽는다.**
- `.cd-nav-group__toggle` 은 "데스크탑 전용 요소"가 아니라 **마크업이 어디에도 없는 죽은 셀렉터**다
  (`class="cd-nav-group"` 이 `index.html`·`public/`·`dist/` 전부 0건. 남은 것은 CSS 와 그것을 찾기만
  하는 JS 뿐이고, 실제 탑바는 `index.html:11952-11962` 의 평평한 `<a>` 7개다 — `:11956-11957` 주석의
  "1뎁스 평서화(nav-flatten-v20260730)").
- `#themeToggleLabel`(`index.html:11935`)은 부모 `#cdMobileHeader` 가 `index.html:7443` 에서
  **미디어쿼리 밖 기본 규칙으로 `display:none`** 이라 데스크탑에서 더 확실히 못 잡는다.
  데스크탑의 진짜 토글은 **`.theme-switch-wrapper--desktop .tsp-option`**(`index.html:11249-11250`).
- 심볼명도 다르다 — `measure-home-style-cost.mjs` 의 것은 `PRESETS` 가 아니라 **`PROFILES`**(`:50-53`).
- 🔴 `TARGETS`(`:64-131`) 7개 중 **3개가 모바일 전용 DOM**(`.cd-mobile-collection-tab` ·
  `#cdMobileBottomNav [data-nav-key='pass']` · `a.tarot-tile--mindscan`)이다. 프리셋 필터 필드를
  추가하지 않으면 `:595-600` 의 fail-closed(`unmeasured` 1건이라도 `exit 1`)에 걸린다.
- `measure-tap-fixed-cost.mjs` 는 CDP `Input.dispatchTouchEvent`(`:247-252`)를 쓰므로 `hasTouch:false`
  컨텍스트용 마우스 분기가 별도로 필요하다.
- 🔴 `measure-home-lighthouse.mjs` 는 **베끼지도 손대지도 마라** — `measure-home-style-cost.mjs:17-19`
  가 "그 파일은 before/after 기준선을 만드는 도구라 손대면 두 측정이 다른 코드로 재는 셈"이라고 금지해 뒀다.
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
- **데스크탑 INP / 인터랙션 지연** — 잴 도구가 없다(§4). 숫자가 하나도 없다. **여전히 미해결**(PR #716 범위 밖).
- ~~**LCP 요소 렌더 지연 493ms 의 원인**~~ → **조사 완료(§3-3)**: 문서가 적은 후보 2개(베일·히어로 연출)는
  둘 다 **기각**됐고, 지표 자체가 배치 간 217/324ms 로 흔들려 판정에 못 쓴다. 남은 진짜 후보는
  `cosmic-main.css:1920` 264KB 렌더블로킹 + `<head>` 인라인 `<style>` 436KB 이며 **둘 다 미착수**다.
- **데스크탑 요소 수 4,321** vs 모바일 2,033 (`verify-home-visual-parity` 스냅샷 메타에서 읽은 값).
  왜 2배인지, 그 차이가 비용인지는 **조사하지 않았다.** (2026-08-16 재확인: 데스크탑 4,321 / 모바일 2,032)
- ~~위 이미지 낭비 수치는 **Lighthouse 판정값**이지 직접 잰 바이트가 아니다.~~
  🔴 **그보다 나쁘다 — 로컬 404 폴백이 섞인 값이다(§2-3).** 프로덕션 URL 로 다시 재기 전에는 인용 금지.

### 7-1. PR #716 이후 남은 것 (착수 순서 제안)

1. `index.html:1920` **`cosmic-main.css` 264KB 렌더블로킹** — 단일 항목 최대.
   ⚠ `8fc05dd53` 이 CLS 로 기각한 이력 재현이 선행돼야 한다(`mobile-home-perf.md:95`).
2. `<head>` 인라인 `<style>` 43블록 436KB / 모바일 전용 인라인 46블록 raw 372.8KB — §3-4 의 3중 게이트 함정 주의.
3. 이미지 잔여 2건: `flower-pig-honey-hug` 리사이즈(**바이트 프로브 필수** — 과거 +82% 사례) ·
   히어로 `sizes` 보정(`index.html:787` preload 쌍둥이와 **동시에**).
4. 데스크탑 INP 도구 확장 — §4 의 정정을 먼저 읽을 것.

---

## 8. 관련 문서

- 모바일 INP 라운드 전체 이력·좌표·함정: `docs/handoff/inp-round3-2026-08-16.md` (5라운드까지, **끝남**)
- 그 앞의 1·2라운드 문서는 2026-09-06 에 위 문서로 흡수·삭제됐다(정본 근거는 그 문서 §1). 나란한 문서: `docs/handoff/mobile-home-perf.md`
- 미해결로 남은 것(성능 아님): 같은 문서 §6-4('최근 이용' 기록 미동작 — **기능 버그**) ·
  §6-5(`showOverview()` 2회 호출) · §4-4 말미(사주 코어 순차 체인 11개)
- 🔴 모바일 쪽 최대 미해결 수치: **부팅 이후 레이아웃 시프트 0.357**(목표 ≤0.1)이고
  그중 **0.319 가 '서비스 검색 입력' 하나**에서 나온다(같은 문서 §6-6).
