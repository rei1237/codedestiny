---
status: active
updated: 2026-09-02
next: "**PR-0~PR-7 전부 완료. 총점 77.3 / 목표 70, 축 3 만 59.0 으로 목표 60 에 1.0 부족하다**(축1 73.8 · 축2 77.1 · 축3 59.0 · 축4 100.0, 2026-09-02 실측). 🔴 **그 1.0 은 LCP 행 하나이고 코드 레버가 아니라 루브릭 문제다** — 점수가 먹는 simulated LCP 는 9,462ms 인데 observed 는 1,272ms 이고, 그 94%가 simulated Slow 4G 에서의 교차출처 히어로 다운로드다(preconnect·preload·fetchpriority 는 이미 다 붙어 있다). **다음 세션은 성능 코드를 더 짜지 말고 셋 중 하나를 고른다** — ① 사용자에게 **LCP 임계를 observed 기준으로 바꿀지** 묻는다, ② 축 2 의 `44px 미만 탭 타깃 37.0%`(0점)를 손본다(🔴 절대 개수는 39 → 27 로 줄었고 **비율만** 올랐다 — PR-5 접기로 분모가 162 → 73 이 된 탓이라 회귀가 아니다), ③ 축 1 의 `랜딩 섹션 수 14`(25점)·`목적지 중복 쌍 2 → 4`. 🔴 **축 3 을 다시 재려면 `npm run build:cf` 다음에 `npm run perf:home -- --runs=5 --preset=mobile` 을 먼저 돌린다** — 하네스는 성능을 직접 재지 않고 `%TEMP%/code-destiny-perf/perf-head.json` 을 읽으므로, 안 돌리면 남의 회차를 인용한다(이 문서가 한동안 45.2 를 적고 있던 이유다). 루브릭·축별 가중·임계표의 정본은 `C:\\Users\\user\\.claude\\plans\\docs-handoff-home-ux-audit-2026-09-01-md-crispy-badger.md`"
---

# 홈 4축 현황 진단 (2026-09-01)

## 왜

사용자 요구 원문: "메인 화면의 UI/UX에서 굳이 없어도 되는 것은 빼고 한눈에 직관적으로, 모바일은 모바일에 맞게, 성능도, 그리고 각 서비스를 클릭할 때 **이걸 쓰면 어떤 장점·혜택이 있고 뭘 볼 수 있는가**가 풍부·정확해야 한다. **먼저 현황분석부터 하고 최적화하자.**"

이 문서는 그 현황분석 산출물이다. **코드 수정 0건** — 최적화 PR 은 다음 세션.

## 지금 상태

- PR **#1402**(`#cdFinder` 기본 추천 6개) · PR **#1403**(이 문서) 모두 머지됐다(2026-09-01).
- 아래 실측에 루브릭을 씌워 **점수화와 목표 설정이 끝났다** — [점수와 목표](#점수와-목표-2026-09-01-확정) 절.
- 🔴 **PR-0(하네스) 완료.** 하네스 기준선(2026-09-01, `dist/` PR-B 반영본): **축1 33.0 · 축2 26.1 · 축3 37.8 · 축4 12.6 → 총점 27.4**. 손측정 28 과의 차이는 위 정의 3건과 **축 4 프리뷰 표면 1 → 0**(아래) 때문이다. 앞으로의 델타는 이 숫자를 기준으로 잰다.
- 🔴 **PR-2 완료(2026-09-01, 머지 대기).** 현재 하네스 값: **축1 33.7 · 축2 80.8 · 축3 37.8 · 축4 13.0 → 총점 41.4**. 축 2 는 목표 60 을 넘겼다. 아래 축 2 절의 표가 그 전/후다.
- PR-A(홈 INP · 강제 동기 레이아웃 2곳)는 그 계획의 **PR-3** 으로 편입됐다. 근거는 `docs/handoff/home-three-axis-2026-09-01.md`.
- 🔴 **PR-3 완료(2026-09-01, 머지 대기) — 다만 명세대로가 아니다.** 명세된 편집 2건(`savedScrollY` 를 `__cdExpandHome()` 앞으로 · `panel.scrollTop` 을 rAF 로)은 **실측 변화 없음**이라 둘 다 넣지 않았다. 대신 실측이 지목한 원인 한 곳만 고쳤다. 상세는 [축 3 절](#축-3--성능)의 "PR-3 실측"을 볼 것.
- 🔴 **PR-4 완료(2026-09-01, 머지 대기) — 레버 3개 중 2개는 실측으로 기각됐다.** 넣은 것은 `styles/fortune-gateway.css` 를 렌더 블로킹에서 뺀 것 하나뿐이고, **FCP 는 −3ms(노이즈)** 다. 상세와 기각 사유는 [축 3 절](#축-3--성능)의 "PR-4 실측".
- 🔴 **PR-5 완료(#1426 머지, 2026-09-02).** 첫 3화면 밖 랜딩 섹션을 `<details>` 로 접었다(삭제·통합 0건). 축1 **33.7 → 73.8**.
- 🔴 **PR-6 완료(#1430, 머지 대기, 2026-09-02).** 레지스트리 44개에 진입 전 상세 문안(16/44 → **44/44**)과 카드 `desc` 의 12개 로케일을 채웠다. 축4 **30.5 → 100.0**.
- 🔴 **PR-7 완료(#1442, 머지 대기, 2026-09-02).** 로드 중 강제 동기 레이아웃 3건을 걷어냈다. 축3 **44.2 → 59.0**(목표 60 에 1.0 부족) · 총점 **77.3**. 곁들여 **노치 기기에서 쿠키 배너가 하단 탭 5개를 덮던 결함**(PR-2 #1410 때부터 존재, `verify:mobile-bottom-nav-clearance` 는 CI 미배선이라 조용히 통과해 왔다)을 같은 PR 에서 고쳤다.
- 🔴 **이 문서가 적었던 축3 45.2 · 총점 74.0 은 낡은 INP 인용값 탓이다.** 하네스는 축 3 을 직접 재지 않고 `perf-head.json` 을 읽는데 그 값이 PR-3 이전 것이었다. `perf:home` 을 실제로 다시 돌린 `origin/main`(04101c757) 기준선은 축3 **32.7** 이고, PR-3 이후 프로덕션에서 INP 를 재측정(**328ms**, 밴드 288–328 / PR-3 이전 **656** [640-688])해 인용값을 바로잡으면 축3 **44.2 · 총점 73.6** 이 옳다(#1442 첫 커밋). PR-7 의 델타는 그 위에서 잰 것이다.
- ✅ **4축 목표 달성 — 총점 77.3 / 목표 70.** 축별 최저 60 은 **축 3 만 1.0 부족**하고, 그 부족분은 LCP 행 하나다(아래 축 3 절 "PR-7 실측").
- 🔴 **축 2·축 1 의 남은 저점은 PR-7 이 안 건드렸다.** 축 2 `44px 미만 탭 타깃` 이 24.1%(09-01) → **37.0%**(0점)로 올랐는데 **회귀가 아니다** — 절대 개수는 39 → **27** 로 줄었고, PR-5 접기로 보이는 인터랙티브 요소가 162 → **73** 이 되며 분모가 준 탓이다. 축 1 은 `랜딩 섹션 수 14`(25점)·`목적지 중복 쌍 2 → 4` 가 남았다.

## 측정 하네스 (모든 수치의 조건)

`npm run build:cf` 로 만든 `dist/` 를 정적 서버로 띄우고, Playwright chromium **390×844 / DPR 3 / 모바일 UA** 로 계측했다. 성능만 `npm run perf:home --runs=3 --preset=mobile`.

**PR-0 이 그 하네스를 `scripts/measure-home-score.mjs` 로 되살렸다.** 재측정은 두 줄이다:

```
npm run build:cf
npm run measure:home-score
```

축 3 은 하네스가 재지 않고 `perf:home` 산출물(`%TEMP%/code-destiny-perf/perf-head.json`)을 읽는다. 없으면 아래 2026-09-01 값을 **인용으로 표시하고** 돈다. INP 는 언제나 인용이거나 `--inp=` 주입값이다.

🔴 **그래서 축 3 을 판정에 쓰려면 순서가 셋이다** (2026-09-02 에 이 함정을 밟았다):

```
npm run build:cf
npm run perf:home -- --runs=3 --preset=mobile   # ← 빠뜨리면 남의 회차 캐시를 읽는다
npm run measure:home-score
```

🔴 **그 LCP 는 시뮬레이션 값이지 관측값이 아니다.** 2026-09-02 실측에서 시뮬레이션 LCP 9575ms 옆의 **관측 LCP 는 1667ms** 였고, LCP 요소는 `header.logo-area … img.cd-hero-island__img` — `assets.code-destiny.com` 에서 오는 **크로스오리진** 히어로 이미지다. LCP 소분해도 `Resource load duration 1558ms` 가 거의 전부라 **네트워크 왕복이 지표를 정한다.** 회차 편차(8736~10763ms)도 크다. 그래서 축 3 의 숫자 하나만으로 "회귀"나 "개선"을 단정하면 안 되고, 판정하려면 같은 세션에서 A/B 빌드를 번갈아 재야 한다. 아래 수치는 전부 **2026-09-01**, `dist/` 는 PR-B 반영본이다.

🔴 **하네스와 아래 손측정의 정의가 갈리는 지표 3개** (이제는 하네스가 정본, 아래 표는 참고선):
- **랜딩 섹션** 13 → **14**. 하네스는 `#inputPage section[id]` 중 CSS 로 보이는 것을 센다. 아래 13개 목록에 없는 `moonMusicEntry`·`cdFeedbackGate`·`cdReviews` 가 더 잡히고, `display:none` 인 `destinyCardForm`·`cdTodayPick` 이 빠진다.
- **가림 결함** 2건 = 덮은 **고정 레이어 수**다(요소 수로는 4개). 하네스도 고정/스티키 조상으로 묶어 센다.
- **첫 화면 서비스 링크** 0 → **1**. 아래 4번 문단 참고.

---

## 축 1 · 홈 정리 ("굳이 없어도 되는 것")

| 지표 | 값 |
|---|---|
| 모바일 문서 높이 | **12,816px = 15.2 화면** |
| 화면에 보이는 인터랙티브 | **162개** (모달·스테이지 포함 전체는 이전 실측 308개) |
| `<section id>` 총수 | 73개 — 그중 랜딩 구간 **13개** |
| 랜딩 13개 간 목적지 중복 | **2쌍, 각 1개 항목** |

랜딩 13개(`index.html` 줄): `destinyCardForm` 9622 · `cdConcernPick` 9757 · `cdTodayHub` 10001 · `cdTodayPick` 11239 · `cdWhyUs` 11294 · `cdSignatureConsult` 11334 · `cdQuickServices` 11451 · `cdFinder` 11493 · `fortuneGatewayEntry` 11543 · `cdServiceIndex` 14498 · `cdDiaryPlannerEntry` 14518 · `cdAiFeatures` 14541 · `cdFortunePick` 14580.

**문제**: 중복이 아니라 **밀도**다. 15 화면을 스크롤해야 끝나고, 13개 섹션이 각자 다른 목적지를 들이민다.

**후보 레버**
1. 랜딩 섹션을 접기/합치기 — 세로 픽셀을 줄이는 유일한 큰 레버. 🔴 삭제가 아니라 **통합·접기**여야 한다(절대규칙 6: 사용자 요청 없는 기능·배지 삭제 금지).
2. 인터랙티브 162개 → 첫 3화면에 등장하는 것만 남기고 나머지는 `#cdFinder` 뒤로 — PR-B 가 그 그릇을 이미 만들어 뒀다.

**기각한 것**
- 🔴 **"`#cdConcernPick` 이 `#cdFinder` 와 중복"이라는 내 가설은 실측으로 기각됐다.** 13개 섹션의 목적지 URL 을 전수 대조하니 겹치는 쌍은 2쌍·각 1개 항목뿐이다. 섹션을 지워서 얻을 것은 거의 없다.
- `innerText` 로 섹션 본문 분량을 재는 방법 — `content-visibility: auto` 가 걸린 5개(`cdSignatureConsult`·`fortuneGatewayEntry`·`cdAiFeatures`·`cdFortunePick`·`moonMusicEntry`)가 화면 밖에서 **빈 문자열**을 돌려준다.

---

## 축 2 · 모바일 (390×844)

| 지표 | 진단(09-01) | PR-2 후 |
|---|---|---|
| 가림 원인(고정 레이어) | **2건** | **0건** |
| 첫 방문 시 고정 UI 점유 | **359 / 844px = 43%** | **29.5%** |
| 재방문 시 고정 UI 점유 | 130 / 844px = 15% | 15% |
| 44px 미만 탭 타깃 | **39 / 162** | 24.3% |
| 가로 오버플로 | 없음 | 없음 |
| 첫 화면 안의 운세 서비스 링크 | **0개**(레지스트리 기준 1개) | **3개** |

🔴 **가림 결함 2건 (둘 다 CTA 를 완전히 덮는다) — PR-2 에서 해소, 아래는 원인 기록이다**
- **첫 방문**: `#cdCookieConsent`(y 521~750, `z-index` 100260)가 대표 CTA **"✦ 무료로 오늘의 운세 보기"** 를 **완전히** 덮는다.
- **상시**: `#cdMobileBottomNav`(y 767~838)가 히어로 칩 **"무료 시작 가능"·"전체 서비스 검색"** 을 **완전히** 덮는다. 쿠키 배너와 달리 이건 닫을 수 없어 **영구 결함**이다.

**첫 화면 진입 순서**: `/signup/` y114(284×56) → 로그인 y180(284×56) → … → `h1` **y440(첫 화면의 52% 지점)**. 즉 첫 화면은 회원가입·로그인이 먼저 차지하고, 운세 서비스로 가는 링크는 **한 개도 없다.**

**PR-2 가 실제로 한 것** (`index.html` 의 `cd-home-fold-compact-v20260901` · `cd-mobile-nav-h-v20260901`)
- 바닥에 붙는 **전폭** 동의 배너는 위치만 옮겨서는 무언가를 반드시 덮는다. 그래서 배너를 옮기는 대신 **히어로를 접힘선 위에서 끝냈다**(본문 605px 종료, 여유 36px).
- 탭바 높이는 **런타임 실측 → `--cd-mobile-nav-h`**. 쿠키 배너가 쓰던 `calc(14px + 84px + env(safe-area-inset-bottom))` 은 safe-area 를 두 번 세고 실제 높이(71px)보다 13px 길었다. CSS 폴백은 그 스크립트가 죽었을 때만 쓴다.
- 신뢰칩에 `/compatibility/` 를 **추가**(기존 칩 삭제 0건) + `/fusion-fortune` 레지스트리 등재 → 첫 화면 서비스 링크 3개.

**남은 레버**
1. 44px 미만 24.3%(23점) — 축 2 에서 유일하게 남은 저점. 첫 3화면 것부터.
2. 고정 UI 29.5%(62점) — 더 낮추려면 쿠키 배너 자체를 줄여야 한다.
3. 🔴 **손대지 않고 남긴 인접 상수 3곳**: `#inputPage{padding-bottom:calc(136px + env(…))}`(`index.html:3021`) · 테마 스위치 `bottom:calc(72px + env(…))`(3030) · 푸터 `padding-bottom:calc(96px + env(…))`(3035). 이들은 탭바 높이의 사본이 아니라 **의도적 여유를 얹은 콘텐츠 하단 예약**이라 변수로 바꾸면 의미가 달라진다.

**기각한 것**
- 첫 측정에서 `#cdHomeAtmos` 를 가림 요소로 셌다 — `z-index: -1` 배경 레이어라 오답. 이후 `z-index < 0` 을 걸러 재측정했다.
- CDP 스캔의 "위반 0건" 은 앱이 백그라운드면 rect 가 전부 0 이라 위양성이다(메모리). 스캔한 개수를 함께 찍어야 한다.

---

## 축 3 · 성능

`npm run perf:home --runs=3 --preset=mobile` (2026-09-01):

| 지표 | 값 |
|---|---|
| Performance | **63** (60–67) |
| FCP / LCP | 2,867ms / **4,580ms** (LCP 요소 `h1.moon-hero__title`) |
| TBT / SI | 495ms / 4,426ms |
| CLS | **0.001** (PR-B 전후 동일) |

메인 스레드 내역: **Style & Layout 3,021ms 가 최대 비용**. DOM 4,436개 / 깊이 14. 렌더 블로킹 제거 시 FCP **-600ms**. 미사용 CSS 29+25+13KB. 강제 동기 레이아웃 91.6 / 61.3 / 48.8ms. 문서 롱태스크 1,300ms. `app-logo-512.webp` 가 154/88px 자리에 512² 를 실어 **60KB 낭비**. 총 80 요청 / 1,185KB.

**인용(재측정 안 함)**: INP **616ms**(기준 200) · `perf:recalc-origin` 프로덕션 기준선 656 [640-688].

### PR-3 실측 (2026-09-01) — 🔴 진단이 틀렸고 원인은 다른 데 있었다

조건: 로컬 `dist`, 390×844 · DPR 3 · CPU 4x · Slow 4G, `--passes=stack --variants=A --runs=3`, 탭 대상 `#cdMobileBottomNav [data-nav-key='fortunes']`. 🔴 프로덕션 밴드(656)와 섞지 말 것 — URL 이 다르다.

| | 탭 지연 중앙값 [밴드] | 탭 구간 `Layout` |
|---|---|---|
| 기준선(HEAD `1498ce040`) | 760ms [744–840] | 425ms / 25회 |
| 명세대로 편집 2건 | 808ms [776–840] | 465ms / 24회 |
| **실제로 넣은 것** | **280ms [280–288]** | **103ms / 7회** |

- **명세된 2건은 변화 없음이다**(밴드가 기준선과 겹친다). `openOverlay` 의 317ms 와 `showOverview` 의 143ms 는 *중복 작업*이 아니라 **한 번은 반드시 치러야 하는 문서 전체 레이아웃**이었다. 읽는 줄을 옮기면 비용이 그다음 레이아웃 접촉 지점(내가 넣은 rAF 콜백)으로 **371ms 그대로 이동**했다. `home-lcp-inp-2026-08-28.md` §9-3 의 "강제 동기 레이아웃 2곳" 해석은 그래서 오독이다.
- **진짜 원인**: `openOverlay()` 가 진입만으로 `__cdExpandHome()` 을 불러 `[data-cd-home-secondary]` 17개를 `display:none` 에서 한꺼번에 풀었다. 그런데 '모든 운세' 첫 진입은 **개요 모드**이고, 개요 패널은 `body` 직속이라 홈 DOM 을 한 조각도 쓰지 않는다. 전체화면 오버레이 뒤에서 아무도 안 보는 문서를 레이아웃한 것이다.
- **수정**: 펼치기를 `ensureHomeExpanded()` 로 빼서 **홈 DOM 을 실제로 보여주는 지점**에서만 부른다 — `switchCollection()`(컬렉션은 `.fg-group[data-cd-home-secondary]` 안이라 펼치지 않으면 렌더 자체가 안 된다)과 즐겨찾기/최근 카드가 원본 타일을 누르는 지점. `expandedHomeForOverlay` 는 "오버레이가 실제로 펼쳤을 때"만 켜져 되접기 동작이 그대로다.
- 기능 확인 10/10 통과(개요는 접힌 채 열림 · 컬렉션 탭이 펼치고 렌더 · 닫으면 되접힘 · 개요 카테고리 카드 경로도 동일).
- 🔴 **축 3 점수는 이 PR 로 안 움직인다.** `measure:home-score` 의 축 3 은 Lighthouse JSON 과 `--inp=` 인용값을 읽는데 둘 다 프로덕션 수치다. 재채점하려면 **머지·배포 후 프로덕션에서 INP 를 다시 재야** 한다.

#### 곁다리로 드러난 것 — `verify:mobile-cdp-smoke` 는 HEAD 에서도 깨져 있었다

이 PR 을 검증하다 걸렸고, **HEAD 의 `index.html` 로 되돌려 다시 돌려도 같은 자리에서 같은 오류**였다(2026-09-01 실측). 내 변경이 만든 게 아니다. 원인 2건 모두 *가드가 옛 DOM 을 셀렉터에 박아 둔 것*이고, `verify:guard-wiring` 상 이 검증기는 **미배선**(`실브라우저 CDP — 로컬 개발 서버 필요`)이라 CI 가 못 잡았다.

| # | 증상 | 원인 | 수정 |
|---|---|---|---|
| 1 | `.fc-toggle-btn[data-target="animalCollection"]` 가 `exists:true / 0×0` 으로 타임아웃 | 애니멀 토템 블록(2026-08-15)이 홈 축약(`cd-home-secondary-v20260817`)보다 **먼저** 쓰였다. `.fg-group--animal` 이 접혀 `display:none` | 같은 파일의 이용권 블록과 같은 방식으로 `#cdHomeExpandToggle` 을 눌러 사용자와 같은 경로로 펼친다(진입 2곳) |
| 2 | 히어로 주 CTA 가 `exists:false`, 그리고 `primaryCtaInFirstView:false` | 주 CTA 의 `href` 가 `#cdConcernPick` → `#cdTodayHub` 로 바뀌었는데(커밋 `6c605edd4`) 가드 2곳이 옛 앵커를 셀렉터에 박고 있었다 | 셀렉터에서 목적지를 빼고 **CTA 가 실제로 가리키는 앵커를 읽어서** 잰다 |

🔴 2번은 가드가 **조용히 뒤집힌** 유형이다 — `querySelector` 가 null 을 주면 `primaryCtaInFirstView` 가 `false` 가 되어 "첫 화면에 CTA 가 없다"는 **거짓 실패**를 낸다. 반대 방향(널이면 통과)이었으면 위양성 초록이 됐을 자리다.

🔴 **이 검증기는 여전히 CI 미배선이다.** 배선은 이 PR 범위 밖이라 손대지 않았다(게이트 추가는 지시가 있어야 한다). 홈 셸을 고치는 세션은 `npm run verify:mobile-cdp-smoke` 를 **손으로** 돌릴 것.

### PR-4 실측 (2026-09-01) — 🔴 레버 3개 중 2개는 기각, 남은 하나도 FCP 를 안 움직인다

같은 빌드 위에서 `dist/index.html` 의 전달 방식만 바꿔 **5런씩 A/B** 했다(390×844 · mobile preset · 로컬 dist).

| | 블로킹(기존) | 지연(적용본) |
|---|---:|---:|
| Performance | 53 (52–56) | 53 (51–57) |
| FCP | 2,902ms | **2,899ms** |
| LCP 중앙 [범위] | 6,010 [4,358–6,796] | 6,667 [4,349–6,826] |
| TBT | 703ms | 712ms |
| CLS | 0.001 | 0.001 |
| 렌더 블로킹 감사(`savingsFcp`) | 650ms | **500ms** |

- **넣은 것**: `styles/fortune-gateway.css`(32.7KB raw / 6.1KB br)를 `rel=preload as=style` + `<noscript>` 로 뺐다. 이 시트가 칠하는 호스트 4개가 전부 폴드보다 최소 **4,043px** 아래다(2026-09-01 실측, dist·networkidle, 모바일 기준 top: `.cd-quick__grid` 4283 · `#cdFinder` 4611 · `#fortuneGatewayEntry` 5894 · `#cdDiaryPlannerEntry` 7036). 로드 후 `rel` 이 stylesheet 로 바뀌고 규칙이 적용되는 것(`display:grid`·`border-radius:16px`)까지 확인했다.
- 🔴 **FCP 는 안 움직인다(−3ms).** 결정적으로 움직인 건 감사 수치(650→500)뿐이다. LCP·TBT 차이는 **범위가 거의 완전히 겹쳐** 노이즈다. 이유: FCP 를 잡고 있는 건 CSS 가 아니라 **문서 자신**이다 — `dist/index.html` 은 1,231KB raw / **199KB 전송**이고 그중 **인라인 `<style>` 85블록이 645.8KB(52.4%)**, 마크업 500.2KB(40.6%), 인라인 `<script>` 85.3KB(6.9%)다. 하네스 주석(`scripts/measure-home-lighthouse.mjs:283`)의 "cosmic-main 2,120ms 제거 → FCP +1ms" 와 같은 현상이다.
- 🔴 **"렌더 블로킹 제거 시 FCP −600ms" 는 틀린 전제였다.** `cosmic-main.css`(258KB)는 애초에 블로킹이 아니다 — `index.html:867` 의 `rel=preload as=style` 이 이미 데운다. 남은 블로킹 4개는 전부 못 뺀다: `core-ui.css`(`verify:paid-gate-ui` 가 blocking 링크를 리터럴로 못 박음) · `theme-tokens.css`(테마 플래시) · `mobile-lite.css` · `mobile-totem-flower-fix.css`(문서상 blocking 유지 대상).
- 🔴 **"미사용 CSS 67KB" 기각.** 세 시트 모두 **이미 논블로킹**이라 FCP 와 무관하고 잘라낼 수도 없다 — `fonts-serif.css`(110KB · `@font-face` **189개**)의 13KB 는 브라우저가 애초에 안 받는 unicode-range 서브셋, `cosmic-main.css` 는 258KB 중 25KB(**9.7%**)만 미사용, `fortune-ui-home.css` 는 이미 `build-fortune-ui-critical.mjs` 가 만든 크리티컬 서브셋이다.
- 🔴 **`app-logo-512.webp` 기각 — 손대면 안 된다.** ⑴ `index.html:609-616` 정책 주석이 "이 로고에는 리사이즈(`/cdn-cgi/image/`)를 쓰지 않는다"고 못 박는다(URL 이 한 글자라도 갈리면 캐시키가 쪼개져 결제 오버레이가 콜드캐시가 된다). ⑵ `verify:portone-single-payment`(:846·:852)와 `verify:paid-gate-ui`(:182·:204)가 리터럴 URL 을 단언한다. ⑶ **"63KB 전송 / 60KB 낭비" 자체가 로컬 하네스 산물이다** — 실파일은 **31,916B** 이고, `measure-home-lighthouse.mjs` 의 정적 서버가 `cache-control: no-store` 를 주는 탓에 `<img>` 와 CSS `background-image` 가 같은 파일을 두 번 받아 한 줄로 합산된다. 프로덕션은 `public/_headers:348` `/icons/*` 가 `max-age=604800` 이다.

**후보 레버**
1. ~~PR-A(강제 동기 레이아웃 2곳)~~ — 위 실측으로 기각. 그 자리의 실제 레버였던 진입 시 홈 펼치기는 **PR-3 에서 처리했다.**
2. ~~렌더 블로킹 CSS 정리 — FCP 600ms, 미사용 CSS 67KB~~ · ~~`app-logo-512.webp` 크기 정정~~ — **PR-4 에서 전부 판정했다**(위 절). 남은 것은 없다.
3. 🔴 **인라인 `<style>` 645.8KB(문서의 52.4%)** — 축 3 에 남은 유일한 큰 레버. 미착수.
4. DOM 4,436개 축소는 축 1(섹션 정리)과 같은 작업이다.

**기각한 것**
- `perf:style-cost` 의 recalc 수치 — 룰 추적 ON 이라 3배 부풀린다(메모리).
- 스테이징에서 CLS 판정 — 광고발 CLS 를 숨긴다(스테이징 0 vs 프로덕션 0.275).
- CWV 를 SEO 근거로 쓰는 것 — 이 사이트는 **CrUX 필드 데이터가 없다**. 성능은 체감·이탈 과제로만 다룬다.

---

### PR-7 실측 (2026-09-02) — 병목은 JS 바이트가 아니라 **강제 동기 레이아웃 횟수**였다

파서 블로킹 셸 JS 729KB 중 80%를 차지하는 두 청크(307KB·276KB)는 롱태스크 목록에 **한 번도 안 나오고**, 7,753바이트짜리 청크가 409ms 태스크를 냈다. 답은 메인스레드 내역에 있었다 — **Style & Layout 2,915ms vs Script Evaluation 718ms**. 비용은 4,506개 DOM + 약 657KB 인라인 `<style>` 를 **로드 중 몇 번 강제로 레이아웃시키느냐**이고, Lighthouse 의 강제 리플로 귀속이 그 지점을 정확히 짚어 준다. 고친 3곳(캐러셀 init · 하단 탭바 높이 동기 읽기 · 히어로 `data-lcp-candidate`)의 상세는 #1442 본문과 커밋 메시지에 있다.

🔴 **`requestAnimationFrame` 으로 미뤄도 강제 레이아웃은 안 피해진다.** 캐러셀의 rect 읽기를 rAF 로 미뤘더니 75.3ms → **203.9ms 로 되레 늘었다** — rAF 콜백은 프레임 **시작**(레이아웃 패스 전)에 돌기 때문이다. 해법은 미루기가 아니라 **안 재기**였다.

A/B(로컬 `dist`, mobile preset, 각 **n=5**): Performance 49 → **63** · TBT 735 → **237ms** · SI 5,039 → 4,576 · Style & Layout 3,802 → **2,875ms** · CLS 0.001 유지. 원시 TBT 는 base `[735,735,713,637,1772]` vs fix `[850,222,237,227,289]` 로 밴드가 거의 안 겹친다. 총 강제 리플로 297.3 → **155.9ms(−47.6%)**.

🔴 **남은 강제 리플로 2건은 일부러 안 건드렸다** — `initMobileSajuDetails`(51.1ms, 사주 폼의 첫 펼침 상태를 결정)과 `--cd-safe-vh`(43.7ms). 둘 다 **첫 페인트 상태를 정하는 코드**라 미루면 페인트 후 접힘/리플로가 눈에 보인다. 루브릭 1.3점과 실사용 회귀를 맞바꾸지 않았다.

🔴 **축 3 에 남은 유일한 0점(LCP)은 코드가 아니라 루브릭 문제다.** 점수는 simulated **9,462ms** 를 먹지만 observed 는 **1,272ms** 이고, 그 9.4초의 94%가 simulated Slow 4G 에서의 교차출처 히어로 다운로드다. 이미지엔 preconnect·preload(`imagesrcset`/`imagesizes`)·`fetchpriority=high`·`width`/`height` 가 이미 전부 붙어 있다. 문서 구조 개편은 `measure-home-lcp-budget.mjs` 로 이미 쟀고 살아남은 최선안이 **−188ms**(필요분 약 **−5,700ms**)라 기각됐다. **다음 세션은 코드를 더 짜지 말고 사용자에게 임계 변경 여부를 물어야 한다.**

## 축 4 · 서비스 설명 (사용자 결정: 카드 설명 + 진입 전 상세)

🔴 **실측이 전제를 뒤집었다 — 풍부한 진입 전 화면은 이미 있다.** 없는 것은 문안이 아니라 **배선**이다.

| 자산 | 위치 | 규모 |
|---|---|---|
| 진입 전 상세 시트 | `index.html:32506` `tilePvwOverlay` | CRO 순서 계약 `feature-marketing-cro-v20260731` |
| 마케팅 문안 | `index.html:32958` `FEATURE_MARKETING_COPY` | **98개 키** |
| 상세 템플릿 | `index.html:33101` `FEATURE_MARKETING_TEMPLATES` | 9종(saju·tarot·sukuyo·ziwei·astrology·vedic·oracle·report·music) |

**문제 4건**

1. ~~🔴 **모바일에서는 프리뷰가 통째로 꺼져 있다.**~~ **2026-09-01 PR-1 에서 해결(결정 ⓒ).** 아래는 그 전 실측이다 — PR-0 하네스가 표면 4종을 **실제로 눌러** 판정했다(390×844 / 모바일 UA):

   | 표면 | 선택자 | 요소 | 시트 |
   |---|---|---:|---|
   | 컬렉션 타일 | `.tarot-tile,…,.moon-preview-card` | 12 | 안 열림 |
   | `#cdFinder` 추천 카드 | `.fortune-gateway__rec` | 6 | 안 열림 |
   | 서비스 인덱스 결과 | `.cd-svc-hit` | **0** | 안 열림 |
   | 무료 면제 표식 | `[data-pvw-free]` | **0** | 안 열림 |

   원인은 선택자가 아니라 **마스터 게이트**다. `index.html:2040-2042` 의 `applyCdMobilePreviewPolicy()` 가 모바일에서 `window.__cdFeatureMarketingPreviewEnabled = false` 로 두고, 델리게이션 핸들러(`index.html:~34044`)의 **첫 줄이 그 플래그를 보고 즉시 return** 한다. 실측 게이트 값 `false`. 이건 버그가 아니라 2026-08-15 의 의도적 정책(주석: "모바일은 카드 탭 = 즉시 진입이다")이었다. 그래서 **축 4 프리뷰 표면은 1/4 이 아니라 0/4** 였고, 선택자만 늘리는 PR-1 은 모바일에서 0줄짜리 변경이 됐을 것이다.
   🔴 **지금은 다르다** — PR-1 이 모바일에서도 `__cdFeatureMarketingPreviewEnabled = true` 로 두고, 새 플래그 `__cdFeatureMarketingPreviewPaidOnly = true` 가 무료 타일만 되돌린다. 판정은 두 생산 지점(델리게이션 인터셉터 · `window._cdOpenTilePreview`)이 **같은 술어 `_hasPaidPreviewSignal(tile)`** 를 쓴다 — 갈라지면 8개 호출자가 조용히 어긋나기 때문이다.
   🔴 **2026-09-01 사용자 결정: ⓒ — 유료 항목만 시트를 켠다.**(기각: ⓐ 전면 개방 · ⓑ 카드 자리 문안 확장) 유료 신호는 `data-coin-cost>0` · `data-tile-lock-cost>0` · `data-tile-lock-key` · 유료 feature-key · href 패턴이고, 무료 타일은 예전대로 즉시 진입한다. **데스크톱은 전과 같다**(전부 시트).
   🔴 2026-08-15 정책의 근거 ②(가격 확정 전 CTA 가 `disabled` + `pointer-events:none` 이라 시트가 막다른 길)는 **이미 소멸했다** — `_onCta` 가 버튼을 죽이지 않고 가격을 기다리도록 바뀌어서, 시트를 열어도 CTA 는 살아 있다. 근거 ①(타일마다 동작이 갈린다)은 유료/무료 이분이 답한다. 소멸한 ② 가 되살아나면 `verify:mobile-cdp-smoke` 가 잡는다 — 시트가 열린 순간 CTA 가 존재·비disabled·`pointer-events≠none`·히트테스트 통과여야 한다는 회귀 가드를 같이 넣었다.

   `.cd-svc-hit` 는 **DOM 에 0개다** — `renderSimpleResults()`(`js/core/home-service-finder.js:261`)를 부르는 곳이 없고(유일한 마운트가 `layout:"rich"`), 그래서 루브릭의 분모 4 에는 **존재하지 않는 표면**이 하나 들어 있다. 정책이 정해지면 분모도 같이 정정한다.
2. **무료 서비스는 조기 반환에 걸린다.** `<a href>` 이면서 cost·lock·`data-pvw-free`·유료 신호가 없으면 그대로 이동한다. `data-pvw-free` 는 `index.html` 전체에 **2번**뿐이다.
3. ~~**문안 커버리지 16/43** — 유료 14/20, **무료 2/23**.~~ **해결(PR-6, #1430) — 44/44.** `FEATURE_MARKETING_COPY` 에 28개 + 별칭 14개(`inherit`)를 넣었다. 🔴 카테고리 추론 템플릿이 상품을 오설명하는 항목은 `analysisSteps`/`unlockBenefits`/`faq` 를 **빈 배열로 못 박아야** 일반론이 빈칸을 메우지 않는다. 대조는 `verify:home-service-registry` 가 fail-closed 로 집행한다(예외 목록 없음).
4. ~~**`desc` 는 12개 로케일 전부 한국어다.**~~ **해결(PR-6, #1430) — 12/12.** `js/core/home-service-finder.js` 가 `data-cd-trans`·`data-key="home.svcDesc.<id>"` 를 붙인다. 🔴 **`data-cd-origin-text` 를 한국어로 먼저 고정하는 것이 핵심** — 안 그러면 `markNativeNodes` 가 방금 칠한 번역문을 원문으로 저장해 ko 로 돌아올 때 영어가 굳는다(`cd-lang-native.js` 의 ko 분기는 사전이 아니라 `data-cd-origin-text` 를 복원한다).

**후보 레버**
1. **배선부터** — 델리게이션 선택자에 결과 카드 클래스를 넣고, 무료 항목에 `data-pvw-free` 를 붙인다. 문안 한 줄 안 쓰고 21개 무료 서비스의 상세가 열린다. **가성비 최고.**
2. 문안 27개 보강(43-16) — 무료 21개가 주 대상. 🔴 우선순위는 PR-B 기본 추천 6개 중 빠진 5개.
3. `service-registry.js` 에 "무엇을 볼 수 있는가 · 누구에게 맞는가 · 결과물 형태" 필드 신설 — 정본 한 곳, 표면 여럿. 🔴 `verify:home-service-registry` 도 같이 늘려 미분류를 실패시킨다(원칙 10).

**기각한 것**
- **"43개 `desc` 를 전부 길게 다시 쓴다"** — 진짜 병목이 아니다. 상세 시트가 열리지도 않는 카드에 카드 문구만 길게 써 봐야 홈 분량만 늘고 `[adsense-readiness]`·`verify:indexable-prose-depth` 부담만 커진다.

---

## 점수와 목표 (2026-09-01 확정)

위 실측에 루브릭을 씌운 결과다. 🔴 **임계(100점/0점 기준)는 선언한 잣대이지 업계 상수가 아니다** — 이견이 있으면 임계를 바꾸면 된다. `home-three-axis-2026-09-01.md` 의 점수(UI/UX 62 · 성능 54 · 마케팅 41)는 루브릭 없는 총평이라 **직접 비교하면 안 된다.** 축 4개 동일 가중.

| 축 | 현재 | 목표 | 도달 후 | 가장 아픈 지표 |
|---|---:|---:|---:|---|
| 1 정리 | 32 | ≥60 | 67 | 문서 높이 15.2 화면 (20점) |
| 2 모바일 | ~~20~~ **80.8** | ≥60 | 81 | ✅ 달성(PR-2). 남은 저점은 44px 미만 24.3%(23점) |
| 3 성능 | 38 | ≥60 | 63 | LCP 4,580ms · INP 616ms (둘 다 0점) |
| 4 설명 | 23 | ≥60 | 96 | 무료 서비스 문안 2/23 (9점) |
| **총점** | **28** | **≥70** | **77** | |

🔴 위 "현재" 열은 손측정이다. **PR-0 하네스 기준선은 축1 33.0 · 축2 26.1 · 축3 37.8 · 축4 12.6 → 총점 27.4**, **PR-2 후는 축1 33.7 · 축2 80.8 · 축3 37.8 · 축4 13.0 → 총점 41.4** 이고, 판정은 이쪽이다. 축 4 가 23 → 12.6 으로 내려간 것은 회귀가 아니라 **프리뷰 표면 1/4 이 실제로는 0/4** 였다는 정정이다(축 4 절 1번). "도달 후" 열은 손측정 기준으로 계산된 값이다. PR-1 정책은 2026-09-01 에 **ⓒ(유료 한정)** 로 정해졌으므로 무료 표면은 애초에 시트 대상이 아니다 — ~~🔴 **분모 정정과 축 4 재측정이 아직 남았다**~~ **둘 다 했다(2026-09-02)** — 분모는 4 → **2**. 뺀 둘: `.cd-svc-hit` 은 2026-08-19 에 지운 **존재하지 않는 표면**이라 분모에 두면 만점이 영구히 불가능하고, `[data-pvw-free]` 는 모바일에서 **안 열리는 것이 정상**이라 열림으로 채점하면 결정 ⓒ 를 지킨 코드가 감점된다(둘 다 진단용으로는 계속 찍는다).

**실행 순서** — 누적 총점 28 → 35 → 50 → 54 → 56 → 65 → **77** (실제 진행: 27.4 → PR-2 후 **41.4**)

| PR | 내용 | 움직이는 축 |
|---|---|---|
| ~~0~~ | ~~점수 하네스~~ **완료** — `scripts/measure-home-score.mjs` (`measure:home-score`) | 판정 수단 |
| ~~1~~ | ~~축 4 배선~~ **부분 완료**(2026-09-01 결정 ⓒ) — 모바일 마스터 게이트를 **유료 한정**으로 열었다. `index.html` 3곳(마스터 게이트 · 델리게이션 인터셉터 · `_cdOpenTilePreview`) + `verify:mobile-cdp-smoke` 모바일 계약 재작성 + `measure:home-score` 가 두 플래그를 함께 찍는다. ~~🔴 **남은 절반**~~ **완료(2026-09-02)** — `openerNode()` 가 `data-pvw-paid`/`data-pvw-free`·유료 항목 한정 `data-feature-key`·`[data-pvw-title]` 을 낸다. 유료 판정은 `featureKey && price && bucket!=="free"` 하나뿐이고, 그래야 `points`(이용권 상점)와 `human-design`(무료 시작)이 유료에서 빠진다 | 4: 13.0 → **30.5**(총점 39.6 → **44.0**) |
| ~~2~~ | ~~축 2 가림 2건 + 첫 화면 서비스 링크 + `/fusion-fortune` 레지스트리 등재~~ **완료** | 2: 26.1→**80.8** |
| ~~3~~ | ~~홈 INP (기존 PR-A)~~ **완료 — 명세와 다른 수정**. 진입 시 홈 펼치기를 늦춰 탭 지연 760→280ms(로컬). 🔴 축 3 점수는 프로덕션 INP 재측정 전까지 그대로 37.8 이다 | 3: 38→**재측정 필요** |
| ~~4~~ | ~~렌더 블로킹 CSS + `app-logo-512.webp` 크기~~ **완료 — 레버 3개 중 2개 기각**. `fortune-gateway.css` 만 논블로킹으로 뺐고 FCP 는 −3ms(노이즈). 🔴 남은 레버는 인라인 `<style>` 645.8KB | 3: 변화 없음 |
| ~~5~~ | ~~축 1 접기~~ **완료(#1426, 2026-09-02)** — 첫 3화면 밖 섹션을 `<details>` 로 접었다. 삭제·통합 0건, `hidden`·`sr-only` 0건 | 1: 33.7→**73.8** |
| ~~6~~ | ~~축 4 문안 27개 + en 1벌 → 10개 로케일 복사~~ **완료(#1430, 2026-09-02)** — 문안 **16/44 → 44/44**(무료 23/23), 카드 `desc` 에 `data-cd-trans` 배선으로 **desc 로케일 12/12**. 저작은 `i18n/authored/core-04.json`(44키 × 12 로케일), 대조는 `verify:home-service-registry` 가 fail-closed 로 집행 | 4: 30.5→**100.0** |
| ~~7~~ | ~~축 3 성능~~ **완료(#1442, 머지 대기, 2026-09-02)** — 로드 중 강제 동기 레이아웃 3건 제거. TBT 735 → **237ms**, Performance 49 → **63**. 🔴 남은 0점(LCP)은 루브릭 문제라 코드 레버가 없다 | 3: 44.2→**59.0** |

🔴 ~~**PR-5 와 PR-6 이 둘 다 있어야 70을 넘는다**~~ — **PR-7 까지 끝나 총점 77.3 이다(2026-09-02).** 축별 최저 60 은 **축 3 만 1.0 부족**(59.0)이고, 그 1.0 은 LCP 행이라 코드로 못 메운다 — **다음 행동은 사용자에게 임계 변경 여부를 묻는 것**이다.

**사용자 결정 3건**(아래 "모르는 것" 1·2를 닫는다): ① 로케일은 **ko 저작 + en 1벌 → 나머지 10개 복사**(유료 번역 실호출 없음). ② 축 1 은 통합이 아니라 **접기**. ③ 목표는 **총점 70 · 축별 최저 60**.

🔴 **계획 정본**(축별 지표 가중·임계표 · PR 별 함정 · 검증 명령): `C:\Users\user\.claude\plans\docs-handoff-home-ux-audit-2026-09-01-md-crispy-badger.md`

## 모르는 것 (🔴 추측 금지 — 사용자에게 물을 것)

1. ~~**로케일 정책**~~ — 2026-09-01 결정: **ko 저작 + en 1벌 → 나머지 10개 복사**. 자동 번역은 유료 실호출이라 하지 않는다.
2. ~~**축 1 의 섹션 통합 대상**~~ — 2026-09-01 결정: 통합하지 않고 **첫 3화면 밖을 접는다**. 삭제·통합 0건.
3. ~~`openerNode()` 에 프리뷰 신호를 붙였을 때 결제 게이팅에 미치는 영향~~ **닫힘(2026-09-02, `paid-gate-auditor`)**. 결론만: `data-feature-key` 리더 35곳 중 결제로 이어지는 것은 3곳뿐이고 셋 다 **비용 속성이 있어야** 무장된다(`_cdRunPerUseCoinGate` 진입점 5곳 전부 `data-coin-cost>0` 또는 `data-tile-lock-key`+`cost>0` 요구). `_applyRegistryPricingToTiles` 만이 벌거벗은 featureKey 로 `data-coin-cost` 를 써 넣는데 선택자가 `.tarot-tile/.lifebook-tile/.lovebible-tile` 로 고정이라 추천 카드에 안 닿는다 — 🔴 **그 세 클래스 중 하나라도 추천 카드에 붙이면 그 순간 게이트가 무장된다(리뷰 체크포인트)**. `_hasPaidPreviewSignal` 호출부 6곳은 전부 표시 계층이고 금전 이동 0건. 결제 동결 매니페스트는 4 region·3 file 어디에도 안 걸린다. 감사가 잡은 위험 4건은 이 PR 에서 함께 닫았다(경계 항목 2건 = `points`·`human-design`, 시트 프레이밍 불일치, CI 트리거 구멍). 아래는 착수 전 기록이다:

   > `openerNode()` 의 결제 영향은 미검증이었다. 🔴 PR-1(ⓒ)은 여기를 **안 건드렸다** — 마스터 게이트만 열었다. `data-feature-key` 가 `_cdPaidFeatureKey`(`index.html:31355`·`31402`)의 입력이라 결제 인터셉터와 맞물린다. 착수 전 `paid-gate-auditor` 를 태운다.
4. ~~**"첫 화면 서비스 링크 0개"가 쿠키 배너 가림 탓일 가능성**~~ — PR-0 에서 판정했다. **셋 다 맞물린 결과였고, PR-2 의 3번 항목은 없어지지 않는다.**
   - 히어로 1번 CTA "✦ 무료로 오늘의 운세 보기"(`index.html:9319`)는 `href="#cdTodayHub"` — **같은 페이지 앵커라 애초에 서비스 링크가 아니다.**
   - 히어로 2번 CTA `/fusion-fortune/`(`index.html:9320`)은 첫 화면 안(y708)이 맞다. **첫 방문에는 쿠키 배너가 완전히 덮고**, 재방문에는 보인다 — 가림 가설은 이 링크에 한해 사실이다.
   - 그런데 `/fusion-fortune` 은 **`window.__cdServiceRegistry` 43개에 없다**(`js/core/service-registry.js` 전수 검색 0건). 그래서 레지스트리 기준 첫 화면 서비스 링크는 배너를 닫아도 **1개**(`/points/` "이용권", 하단 탭바)뿐이다.
   - 🔴 파생 결함: 초융합 리딩이 레지스트리에 없다는 것은 **`#cdFinder` 검색·추천에서도 안 나온다**는 뜻이었다. **PR-2 에서 등재했다**(44개). 축 4 문안 커버리지 분모도 같은 커밋에서 43 → 44 로 옮겼다(`scripts/measure-home-score.mjs`).
5. ~~`<details>` 접힘이 `[adsense-readiness]` 의 `getVisibleText` 에 어떻게 잡히는지~~ — **2026-09-01 소스 실측으로 닫았다. 접어도 분량은 안 깎인다.**
   - `getVisibleText`(`scripts/verify-adsense-readiness.mjs:602`)는 `<script>`·`<style>`·`<svg>` 블록만 걷어내고 나머지 태그를 공백으로 치환하는 **문자열 스캔**이다. `open` 속성도 `hidden` 도 CSS 도 아예 안 본다. `verify:indexable-prose-depth` 도 같다(`scripts/verify-indexable-prose-depth.mjs:127` 의 `split(/<[^>]*>/)`).
   - 🔴 **진짜 함정은 분량이 아니라 링크다.** 인바운드(고아 페이지) 가드 `collectVisibleInternalLinkTargets`(`scripts/verify-adsense-readiness.mjs:1748-1761`)는 앵커 여는 태그에 `hidden`·`sr-only`·`aria-hidden="true"` 가 있거나 `sr-only` 컨테이너 안이면 **가시 링크로 안 센다.** `<details>` 접기는 이 셋 중 아무것도 아니라 안전하지만, **PR-5 를 `hidden` 속성이나 `sr-only` 클래스로 구현하면 접힌 섹션의 내부 링크가 통째로 사라져 그 링크를 받던 라우트가 고아로 잡힌다.** CSS 로만 숨긴 것은 정적 판정 불가라 가드가 안 본다(같은 파일 1695 주석).
   - 검색 범위: `git grep -n "getVisibleText" -- scripts/` → 5개 파일(`verify-adsense-readiness` · `audit-content-headroom` · `generate-adsense-route-audit` · `verify-editor-notes` · `verify-insight-authored`). **다섯 구현 전부 열어 확인**했고 모두 같은 문자열 스캔이다.

## 검증

재측정 명령(PR 하나 머지할 때마다 이대로 돌려 델타를 잰다):

```
npm run build:cf
npm run perf:home -- --runs=3 --preset=mobile   # 축 3 재료. 생략하면 축 3 은 인용값
npm run measure:home-score                       # 표 + JSON(%TEMP%/code-destiny-home-score/)
```

PR-7 에서 돌린 것: `lint`(경고만, 기존) · `typecheck`(clean) · `verify:sitemap-drift` · `verify:payment-freeze` · `verify:hero-contrast` · `verify:mobile-detail-nonintrusive` · `verify:mobile-bottom-nav-sync` · `verify:mobile-bottom-nav-clearance`(**손으로** — CI 미배선. safe-area 0px·47px 통과) · `verify:app-bottom-clearance` · `verify:hero-firstpaint-lock` · `verify:home-service-registry`(44/31) · `perf:home -- --runs=5 --preset=mobile` **A/B 2회** · `measure:home-score`. PR CI(#1442) 는 `Typecheck and lint`·`Build Pages and Worker` 포함 전부 통과.
🔴 **셸(`index.html`)을 고쳤으면 `config/sitemap-lastmod.json` 의 `/`·`/en/`·`/ja/`·`/zh/`·`/zh-tw/` 서명 5개를 같은 PR 에 담아야 한다** — `build:cf` 생성물이라고 되돌리면 PR CI 의 `Typecheck and lint` 가 실패한다. 반대로 `js/**`·`public/**` 의 `?v=build-` 대량 회전은 `sync:public` 산출물이라 **담는 게 맞다**(PR-7 에서 비-캐시버스트 변경 줄 0 임을 확인하고 담았다).

PR-2 에서 돌린 것: `lint`(경고만, 기존) · `typecheck`(clean) · `verify:home-service-registry`(레지스트리 44개 OK) · `verify:hero-contrast` · `verify:mobile-detail-nonintrusive` · `verify:i18n-public-parity`/`i18n-ko-coverage`/`locale-main-sync`/`i18n-no-hardcoded-korean` · `verify:payment-freeze` · `verify:guard-wiring` · `build:cf`(`[adsense-readiness] OK`) · `test:node`·`jest`(615/615) · `measure:home-score`(축2 80.8 / 총점 41.4) · `perf:home -- --runs=3 --preset=mobile`(**CLS 0.00082**, 기준선 0.001 이하).
🔴 `verify:public-mirror-fresh` 는 윈도우에서 `.ignore` 개행 하나로 헛실패한다(내용 diff 0줄) — 판정은 CI 를 믿는다.

🔴 **PR-1 남은 절반(2026-09-02)에서 돌린 것**: `test:node` **616/616** · `lint`(오류 0, 경고는 기존) · `typecheck`(clean) · `verify:payment-freeze` · `verify:home-service-registry`(44/31) · `verify:rpt-preview-cta` · `verify:payment-choice-parity` · `verify:paid-gate-ui` · `verify:checkout-pass-card` · `verify:billing-pass-policy` · `verify:portone-single-payment` · `verify:mobile-lazy-mount-openers`(22/22) · `verify:guard-wiring` · `verify:mobile-cdp-smoke`(손으로 — CI 미배선, OK) · `build:cf` → `measure:home-score`. 🔴 `npm test`(jest) 는 2179 중 **2 실패**인데 `__tests__/worker/fortune-today-hub.route.test.js` 의 **5초 타임아웃**이고 단언 실패가 아니다 — 이 PR 이 건드린 파일과 겹치지 않는다(환경/속도 플레이크로 판단, **미확정**). `verify:public-mirror-fresh` 는 `.ignore` **하나만** 어긋난다고 실패하는데 내용 diff 는 0 이고 개행뿐인 알려진 윈도우 헛실패다.

PR-1(전반)에서 돌린 것: `lint`(경고만, 기존) · `typecheck`(clean) · `verify:mobile-cdp-smoke`(**손으로** — CI 미배선. 모바일 계약 재작성 후 OK) · `verify:rpt-preview-cta`(데스크톱 20단언) · `verify:paid-gate-ui` · `verify:payment-freeze` · `verify:sitemap-drift` · `verify:home-service-registry`(44/31) · `verify:shell-overlay-nav-coverage` · `verify:mobile-lazy-mount-openers`(22/22) · `verify:fortune-hub-shell` · `verify:hero-firstpaint-lock` · `verify:auth-bar-reservation` · `verify:js-module-graph` · `verify:guard-wiring`. 🔴 `measure:home-score` 로 축 4 를 다시 재지는 **않았다**(미검증). 🔴 smoke 의 "tarot touch opens route, sheet, or modal" 단언은 **간헐 실패**한다 — 같은 빌드 재실행에서 통과했고, 컬렉션 오프너 캡처 핸들러가 프리뷰 인터셉터보다 먼저 `preventDefault` 하므로 ⓒ 플래그와 무관하다.

PR-4 에서 돌린 것: `lint`(경고만, 기존) · `typecheck`(clean) · `verify:paid-gate-ui` · `verify:portone-single-payment` · `verify:payment-freeze` · `verify:hero-firstpaint-lock` · `verify:hero-contrast` · `verify:guard-wiring` · `verify:mobile-cdp-smoke`(**손으로** — CI 미배선) · `build:cf`(`[adsense-readiness] OK`) · `test:node`(615/615) · `test:jest`(191스위트 / 2,179 테스트) · `perf:home -- --runs=5` A/B 2회 · `measure:home-score`.

PR-0 에서 돌린 것: `npx eslint scripts/measure-home-score.mjs`(0) · `npm run verify:guard-wiring`(OK — `measure:*` 라 배선 의무 없음) · `npm run measure:home-score`(위 기준선). 🔴 축 3 은 이 하네스가 재지 않으므로 성능 PR 의 판정은 `perf:home` 을 먼저 돌린 뒤에만 유효하고, **CLS 는 프로덕션에서만 유효하다**(스테이징은 광고발 CLS 를 숨긴다).
