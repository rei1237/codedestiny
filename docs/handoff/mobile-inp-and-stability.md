---
status: done
updated: 2026-08-15
next: "후속은 inp-round2 → docs/handoff/inp-round3-2026-08-16.md 다. §6-5(CLS 진단 미완)만 이 문서에 남아 있다"
---

# 인수인계 — 체감 성능(INP)과 안정성

> 2026-08-15 1차본. **이 문서만 읽고 이어서 시작할 수 있게** 쓴다.
> 로딩 점수 작업은 [mobile-home-perf.md](mobile-home-perf.md) 가 정본이고, 이 문서는 **그 뒤에 사용자가 우선순위를 바꾼 뒤**의 작업이다.

---

## 0. 30초 요약

- 사용자가 순서를 다시 정했다: **① 안정성 → ② 체감 성능 → ③ CWV(LCP 2.5s · INP 200ms · CLS 0.1) → ④ Lighthouse 점수**.
- 🔴 **필드 INP 가 처참하다. 최악 2,672ms.** 그런데 그 요소가 `#inputPage > header.logo-area` — **핸들러가 없는 영역**이다. 즉 비용은 처리 시간이 아니라 **입력 대기**(메인스레드 점유)다.
- 🔴 **랩에서는 이 수치를 재현하지 못했다.** 로컬 dist 최악 112ms, 프로덕션 최악 80ms. 이유는 §3 에 있다 — **랩의 한계이지 문제가 없다는 뜻이 아니다.**
- 안정성(①)은 **관측 자체가 없다.** 프로덕션 `/api/health/route-metrics` 가 `enabled:false`.
- 새로 만든 측정 도구: `npm run perf:interaction`(§4). 이게 이 작업의 유일한 판정 수단이다.

---

## 1. 사용자 요구 (원문)

> 사실 더 중요한 것은 사용자 경험이므로 아래의 부분에 초점을 맞춰서 나머지 최적화 작업을 해주면 좋을것 같다
>
> 1단계 — 안정성: 페이지가 정상적으로 뜬다 / API 503이 거의 없다 / 로그인·결제·이용권 조회가 안정적이다
> 2단계 — 실제 체감 성능: 모바일에서 첫 화면이 빠르게 나타난다 / 버튼·입력이 즉각 반응한다 / 스크롤이 버벅이지 않는다 / 결제창 진입이 빠르다
> 3단계 — Core Web Vitals: LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1
> 4단계 — 그 이후에 남는 여유가 있다면: Lighthouse 80 → 85 → 90
>
> 이 순서.

이어서:

> 보면 inp 구간만 최적화 시켜주면 상당히 좋아질것 같고 아래가 그 데이터이므로 그 작업을 진행해줘

---

## 2. 🔴 사용자가 준 필드 INP 데이터 (이 작업의 정본 근거)

| 요소 | INP | 횟수 |
|---|---:|---:|
| `#inputPage > header.logo-area > div.normal-logo.moon-hero` | **2,672 ms** | 1 |
| `#inputPage > header.logo-area` | **2,504 ms** | 1 |
| `#cdMobileBottomNav > div.cd-mobile-bottom-nav__main > a.cd-mobile-bottom-nav__item` | **1,592 ms** | 2 |
| `div.cd-mobile-collection-rail > div.cd-mobile-collection-tabs > button.cd-mobile-collection-tab` | 1,280 ms | 1 |
| `div.tarot-collection__grid > a.tarot-tile.tarot-tile--mindscan` | 1,224 ms | 1 |
| `button.tarot-tile.prem-card.tarot-tile--ziwei-premium` | 1,160 ms | 1 |
| `#cdTodayPanelSaju` | 1,032 ms | 1 |
| `a.cd-mobile-bottom-nav__item.is-active` | 864 ms | 1 |
| `html > body.cd-overlay-shell-open` | 800 ms | 1 |
| `#cdTodayTabVedic` | 624 ms | 1 |
| `.dp-fsel-btn--saju` | 416 ms | 1 |
| `html.runtime-safe-lite.cd-mobile-runtime > body` | 352 ms | 1 |
| `button.backdrop-blur-xl…`(원형 아이콘) | 272 ms | 1 |
| `#inputPage > header.logo-area` | 216 ms | 1 |

**읽는 법**: 상위 2건이 `header.logo-area` 계열인데 거기엔 **누를 것도, 붙은 핸들러도 없다.** 그런데도 2.5~2.7초가 걸렸다는 것은 그 시각 메인스레드가 다른 일로 막혀 있었다는 뜻이다. 반대로 `.cd-mobile-collection-tab`(1,280) · `tarot-tile`(1,224) · `#cdTodayPanelSaju`(1,032)는 **자기 핸들러가 무거운** 쪽일 가능성이 크다. **두 부류를 섞어서 고치면 안 된다.**

---

## 3. 🔴 랩으로 재현하지 못했다 — 그 사실과 이유

`perf:interaction` 으로 부팅 도중(800·1,600·2,600·4,000ms) 핸들러 없는 영역을 눌러 봤다.

| 대상 | 800ms | 1,600ms | 2,600ms | 4,000ms |
|---|---|---|---|---|
| 로컬 dist | 측정 실패 | 측정 실패 | **112 ms** | 56 ms |
| 프로덕션 | 측정 실패 | 측정 실패 | 측정 실패 | **80 ms** |

"측정 실패" = 그 시점에 `#inputPage > header.logo-area` 가 아직 렌더되지 않아 좌표를 못 잡았다(부트 베일 구간).

**즉 랩은 "사용자가 실제로 누르는 순간"을 잡지 못한다.** 실사용자는 화면이 보이자마자 누르는데, 베일이 걷히는 그 순간이 정확히 메인스레드가 가장 바쁜 때다. 그리고 헤드리스에는 실제 터치·소프트키보드가 없다.

🔴 **그러므로 "랩에서 80ms 니까 괜찮다"고 쓰지 말 것.** 필드가 정본이다. 다음 세션이 할 일은 랩 재현이 아니라 **필드에서 다시 재는 것**이다(§6-1).

---

## 4. 도구 — `npm run perf:interaction`

`scripts/measure-home-interaction.mjs` (이번에 신설, 커밋 `7b16615af`).

```bash
npm run build:cf
npm run perf:interaction -- --runs=3 --label=base
npm run perf:interaction -- --url=https://code-destiny.com --runs=3 --label=prod
```

내는 것:
1. **부팅 중 탭** — 핸들러 없는 영역을 여러 시점에 눌러 입력 대기 바닥값
2. **부팅 이후 인터랙션 지연** — 대상별로 `총 지연 / 입력 대기 / 처리 / 렌더` 분해
3. **스크롤** — 50ms 초과 프레임 수 · 최장 프레임 · 블로킹 합계
4. **부팅 이후 레이아웃 시프트** — **어느 인터랙션이 일으켰는지** + 무엇이 밀렸는지

🔴 알아야 할 것:
- 판정은 `perf:home` 과 같이 **min~max 밴드 비겹침**. 인터랙션 지연은 노이즈가 크다.
- 대상이 하나도 안 잡히면 **통과가 아니라 실패**로 죽는다(원칙 10).
- `TARGETS` 에 **화면을 떠나는 요소를 넣지 말 것** — 이동하면 그 뒤 측정이 다른 페이지를 잰다. 그래서 필드 상위인 `a.cd-mobile-bottom-nav__item` · `a.tarot-tile--mindscan` 이 아직 빠져 있다(§6-2).
- 실패하는 대상의 클릭 타임아웃을 길게 주면 **수 초의 조용한 구간**이 생기고, 그 사이 도착한 지연 이미지 시프트가 "입력과 무관한 시프트"로 계상돼 귀속이 통째로 어긋난다. 그래서 1,200ms 로 묶어 뒀다.

**현재 잡히지 않는 대상 2개** — 다음 세션이 셀렉터를 고쳐야 한다:
- `모바일 컬렉션 탭`(`.cd-mobile-collection-tab`) → "요소 없음". 필드에서는 1,280ms 였다.
- `오늘의 운세 탭`(`#cdTodayTabVedic`) → 클릭 타임아웃. 필드에서는 624ms.
- `테마 전환`(`#themeToggleLabel`) → 클릭 타임아웃(모바일에서 가려져 있다).

---

## 5. 이번에 고친 것

### 5-1. 서비스 검색 레지스트리 예열 (커밋 `7b16615af`)

첫 타이핑 때 홈의 모든 타일을 훑어 레지스트리를 만들고 있었다. 유휴·포커스 시점으로 옮겼다.

**실측**(로컬 dist, 모바일 CPU 4배, 3회 중앙값): 검색 입력 지연 **128 → 64ms** (입력 대기 44 → 3 · 렌더 85 → 61).

🔴 **focus 핸들러 안에서 동기로 만들지 말 것** — 비용이 focus 인터랙션 지연으로 옮겨갈 뿐이다. 그래서 유휴/다음 태스크로 넘긴다.

### 5-2. 8KB 함정 (같은 커밋)

5-1 을 넣자 그 블록이 8,330 B 가 되어 `externalize-dist-inline-scripts` 의 `MIN_BYTES`(8KB)를 넘었다. 그러면 블록이 **외부 청크로 빠지면서 `data-marker` 를 포함한 속성이 전부 버려지고**, `split-dist-boot-tasks` 의 허용목록이 대상을 잃어 빌드가 선다(fail-closed 라 정상 동작이다).

주석을 줄여 **7,893 B**(여유 299 B)로 되돌렸고, 가드 실패 메시지에 이 경계를 명시했다. 🔴 **이 블록에 몇 줄 더할 때는 크기를 먼저 재라.**

---

## 6. 🔴 다음에 할 일

### 6-1. 먼저 필드에서 다시 재라 (측정 없이 고치지 말 것)

랩이 못 재는 것이 §3 에서 확인됐다. 사용자에게 **같은 형식의 INP 데이터를 한 번 더** 받아라 — 그래야 이번 변경(#675 부트 태스크 분할 + 5-1)의 효과를 판정할 수 있다. 그 전에는 어떤 개선도 "추정"이다.

받을 때 함께 요청할 것: **그 INP 가 언제 발생했는지**(페이지 로드 후 몇 초). 상위 2건이 부팅 구간인지 아닌지가 처방을 가른다.

### 6-2. 도구를 필드 상위 요소까지 덮게 하라

`a.cd-mobile-bottom-nav__item`(1,592ms)과 `a.tarot-tile--mindscan`(1,224ms)은 이동하는 요소라 지금 빠져 있다. **이동을 막고 재는 방법**을 붙여라 — 예: `page.route` 로 문서 요청을 가로채 취소하거나, 탭 직전 `beforeunload`/`click` 캡처 단계에서 `preventDefault`. 🔴 **`window.location` 을 덮어쓰는 방식은 쓰지 말 것** — 셸이 그 경로를 스스로 쓰므로 측정 대상의 동작이 바뀐다.

### 6-3. 두 부류를 갈라서 고쳐라

- **입력 대기가 지배하는 것**(`header.logo-area` 2,672ms): 처방은 핸들러 최적화가 아니라 **부팅 중 메인스레드 비우기**다. [mobile-home-perf.md](mobile-home-perf.md) §5 의 남은 후보(스크롤락 인프라·자유 카드 랜덤 그리드·저사양 GPU 감지 등)를 하나씩 ablation 하면 된다. 프로덕션 TBT 는 중앙값 625ms 인데 **최댓값이 1,480ms** 다 — 이 꼬리가 INP 를 때린다.
- **처리가 지배하는 것**(컬렉션 탭 1,280 · 타일 1,224 · 오늘 패널 1,032): 처방은 **핸들러 안에서 양보(yield)** 다. 첫 프레임에 꼭 필요한 것만 하고 나머지를 `setTimeout(…,0)`/`scheduler.yield` 뒤로 넘긴다. 🔴 어느 쪽인지는 `perf:interaction` 의 `입력 대기 / 처리 / 렌더` 분해로 판정하고, **추측하지 말 것.**

### 6-4. 안정성(1단계)은 관측부터

프로덕션 `/api/health/route-metrics` 를 직접 찔러 `{"ok":true,"enabled":false,"total":0}` 를 확인했다(2026-08-15). `WORKER_ROUTE_METRICS` 가 `[vars]` 에 없어 꺼져 있고, 켜져 있어도 `console.log` 로 요청 수만 남기며 상태코드 분해가 없다. 값도 아이솔레이트 메모리라 한 번 조회로는 전체를 대표하지 못한다.

🔴 **워커에 계측을 심기 전에 Cloudflare 대시보드를 먼저 볼 것**(원칙 6 — 바깥에 이미 있는 장치를 안쪽에 또 만들지 않는다). 위치: **Workers & Pages → `code-destiny-web` → Metrics**, 최근 24시간 요청 수와 5xx 비율. **사용자가 그 값을 알려주기로 했고 아직 못 받았다.**

확인해 둔 것: MongoDB 노브는 `worker/wrangler.toml [vars]` 와 `worker/lib/db.js` 코드 기본값이 **전부 일치**한다(3000/5000/7000/4000/60000/2000/3). 이 레포가 실사고로 기록한 "한쪽만 고쳐 조용히 무효" 드리프트는 **현재 없다**(검색 범위: `[vars]` 전체 + `db.js` 의 env 읽는 지점 14곳, 2026-08-15).

### 6-5. CLS 는 아직 미해결 — 그리고 내 진단이 끝나지 않았다

`perf:interaction` 이 **부팅 이후 시프트 0.3185** 를 잡았고(목표 ≤ 0.1), 구간 귀속은 **서비스 검색 입력** 하나로 나왔다. 5-1 로 지연을 절반으로 줄인 뒤에도 **값이 0.3185 그대로**다(3회 모두 동일 — 노이즈가 아니다).

실측으로 좁힌 것:
- 검색 입력을 **클릭만** 하면 시프트도 DOM 변이도 없다. `#featureBegin` 은 449px 로 불변.
- **클릭 + 타이핑**이면 시프트 2건: `0.3185`(`hadRecentInput=false`) → `0.1036`(`hadRecentInput=true`).
- 큰 쪽의 사각형 변화: `nav#featureBegin` y 0→442 · h **0→402**, `section#cdServiceIndex` y **720→281** · h 124→212, `span.cd-svc-index__search-icon` h 0→23.
- `render()` 는 새 노드만 만들고 기존 노드를 옮기지 않는다(확인함).

🔴 **아직 설명되지 않은 것**: `previousRect` 가 높이 0 인데 `#cdServiceIndex` 가 439px **위로** 이동했다. 단순히 결과 패널이 아래를 밀어낸 그림이 아니다(그건 두 번째 시프트 `0.1036` 이고 그건 입력에 귀속돼 제외된다). **포커스에 따른 스크롤/뷰포트 변화일 가능성이 남아 있고 확인하지 못했다.**

다음 세션이 할 일: 시프트 시각 전후로 `window.scrollY` 와 `#cdServiceIndex` 의 문서 기준 좌표를 함께 찍어, **뷰포트가 움직인 것인지 문서가 재배치된 것인지** 먼저 가른다. 그 답이 처방을 정한다(스크롤이면 CLS 계산에서 빠져야 하므로 브라우저 동작을 다시 볼 것이고, 재배치면 위쪽에서 커진 요소를 찾아야 한다).

재현 명령:
```bash
npm run build:cf
npm run perf:interaction -- --runs=3 --label=base
# 상세 사각형이 필요하면 scripts/measure-home-interaction.mjs 의 shifts 관찰자에
# previousRect/currentRect 를 그대로 찍는 일회용 스크립트를 repo 루트에서 돌린다
# (playwright 해석 때문에 스크래치패드에서는 import 가 안 된다 — 루트에서 실행할 것).
```

---

## 7. 이 레포 고유의 작업 규칙 (요약, 상세는 mobile-home-perf.md §8)

1. 성능 변경은 **dist 단계에서**. 소스 `index.html` 구조를 바꾸면 문자열 가드 61개가 깨진다. 블록 **내용** 수정은 가능하되 8KB 경계(§5-2)를 조심할 것.
2. `index.html` 을 고쳤으면 **`npm run sync:public`**(미러 6벌).
3. `sitemap.xml` · `rss.xml` · `insights/rss.xml` 과 그 `public/` 사본은 **빌드 부산물**이다. 커밋 금지 — `git checkout --` 로 되돌린다.
4. 격리 **git worktree** 에서 작업(동시 세션이 디렉터리를 공유한다).
5. **머지는 사용자가 한다. PR 까지만.**
6. 🔴 **CI 에 새 게이트 금지.** 측정 도구는 `perf:*` 로 이름 짓는다(`verify:guard-wiring` 이 `verify:` 키만 센다).
7. 별건으로 확인된 것: PWA 설치 배너가 홈 카드 탭을 가리는 문제는 **사용자가 "문제 없다"고 확인**했다. `verify:mobile-cdp-smoke` 의 그 실패는 무시해도 된다.

---

## 8. 근거를 못 찾으면

추측으로 메우지 말고 **사용자에게 물어라.** 이 문서의 §6-5 처럼 **끝나지 않은 진단은 끝나지 않았다고 쓴다.** 이 레포에서 가장 큰 사고가 근거 없이 채워 넣은 형태였다.
