# SEO 렌더 감사 — 남은 작업 인수인계 (2026-08-27)

> **이 문서만 읽고 이어서 작업할 수 있게 쓴다.** 모든 수치는 실측이고 재현 명령을 함께 남긴다.
> 선행 문서: [seo-render-audit-2026-08-27.md](seo-render-audit-2026-08-27.md) (1차 감사 + 2차 세션 §10)
> 이 문서는 **PR #1184 · #1186 이후 남은 것**만 다룬다.

---

## 왜 하는 작업인가

사용자 요구 원문(2026-08-27, 순서대로):

> `docs/handoff/seo-render-audit-2026-08-27.md` 읽고 나머지 seo 최적화 작업 진행해
> / `#1186에 충돌이있으니 해소해`
> / `#1186가 여전히 충돌이고 해소하고 머지후 남은 작업 인수인계 문서 만들어`
> / `PR #1189 머지했으니 실측해줘`
> / `docs/handoff/seo-followups-2026-08-27.md 그 다음 인수인계 작업 진행해`
> / `docs/handoff/seo-followups-2026-08-27.md 읽고 인수 인계받아서 작업 진행해`
> / `#1193은 머지 불가야` / `다음 세션도 인수인계받아서 진행시켜`

즉 **렌더 실측 SEO 감사(#1184)가 남긴 후속 항목을 순서대로 닫는 작업**이다. 각 항목은
"결정이 필요한 것"과 "결정 없이 바로 할 수 있는 것"이 섞여 있어서, **결정이 필요한 것은
사용자에게 물어보고 진행**해 왔다(아래 §0 표의 ✅ 항목은 전부 그렇게 처리됐다).

🔴 **다음 세션이 다시 하면 안 되는 것** — 아래 PR 들은 이미 나갔다.

| PR | 내용 | 상태 |
|---|---|---|
| #1184 | 렌더 감사 도구 + 상속 canonical 55건 | **머지됨** |
| #1186 | 제목 표시 폭 125 → 0, `/static` 이중 신호, `/destiny-poker` 위양성 | **머지됨** (`1b4700c5`) |
| #1189 | 이 인수인계 문서 신규 | **머지됨** |
| #1191 | 설명 표시 폭 183 → 0 (§1) | **머지됨** (`87ae1f77f`) |
| #1193 | 몰입형 라우트 18개의 아웃바운드 링크 0 → 4 (§2) | **머지됨** (`bc341de78`) |
| #1195 | 문장 중간에서 끊긴 설명 42 → 0 (§1-4(a)) | **머지됨** (`048bf120e`) |
| #1197 | `/insights` 허브 페이로드 1.83MB → 560KB (§3) | **머지됨** (`b0ddd7c91`) |
| #1199 | 정적 셸 구성 실측 + dist 저작 주석 제거 (§3-3) | **머지됨** (`1090e02e8`) |
| #1201 | CWV 최초 실측 + 기각된 레버 2개 기록 (§5) | 🔴 **사용자 머지 대기** |

🔴 **프로덕션 승격은 아직 안 됐다.** 머지는 스테이징(`staging.code-destiny.com`)까지만 자동으로
간다. 2026-08-27 실측: 스테이징은 새 제목을 서빙하는데 프로덕션은 옛 제목이다.
승격은 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production` 이고,
**그때 한 번의 명시적 허락이 있어야 실행한다**(CLAUDE.md 절대 규칙 3).

---

## 0. 지금까지 닫힌 것 / 열려 있는 것

| 항목 | 상태 | 근거 |
|---|---|---|
| 상속된 홈 canonical 55건 | ✅ #1184 | `verifyNoInheritedHomeCanonical` 가 막는다 |
| `/static/geomancy-oracle-v4` 색인 노출 | ✅ #1184 | `_headers` X-Robots |
| 셸 사본 3개의 홈 hreflang | ✅ #1184 | `withoutHreflangLinks` |
| `/static` 의 noindex + 홈 canonical 병존 | ✅ #1186 | canonical 제거, 허용목록을 산출물별로 |
| `/destiny-poker` 인바운드 0 | ✅ #1186 | 감사 도구 위양성이었다(프로덕션 308 실측) |
| **제목 표시 폭 초과 125개** | ✅ #1186 | 125 → 0, `verifyIndexableTitleWidth` 가 막는다 |
| **설명 표시 폭 초과 183개** | ✅ #1191 | 183 → 0, `verifyIndexableDescriptionWidth` 가 막는다 |
| **아웃바운드 링크 0인 색인 대상 18개** | ✅ #1193 | 18 → 0, `verifyIndexableOutboundLinks` 가 막는다 |
| **문장 중간에서 끊긴 설명 42개** | ✅ #1195 | 42 → 0. 가드는 없다 — 폭 가드가 이미 상한을 막고 `…` 는 품질 문제라 §1-4(a) 참고 |
| **`/insights` 허브 페이로드 1.83MB** | ✅ PR #1197 | 1,835,788 → 560,769. `verifyIndexableFlightPayloadBudget` 가 막는다 |
| **정적 셸 5개가 HTML 1.29~1.41MB** | ✅ PR #1199 | 구성을 실측했다(§3-3). 저작 주석 제거로 전선 −7.5%. 남은 큰 레버는 인라인 CSS 653KB 로 **결정 필요** |
| HTML 에 ETag/Last-Modified 없음 | ❌ **§4** | 배포 파이프라인 결정 |
| **Core Web Vitals** | ✅ 실측 §5 | 2026-08-28 최초 측정. 프로덕션 `/insights` LCP 8.2s·CLS 0.275 — **스테이징에선 이미 해소**. 남은 것은 홈 LCP 2,832ms |
| 모바일 UX·검색 의도·AI Overviews·네이버 | ❌ **§5-4** | 아직 안 쟀다 |

---

## 1. ✅ 설명(description) 표시 폭 — PR #1191 에서 183 → 0

### 1-1. 근본 원인은 측정축 + **생성기가 문구를 늘리고 있었다**

제목(#1186)과 같은 축 문제인데 생성기가 하나 더 얹혀 있었다.

| 위치 | 하던 일 |
|---|---|
| `seed-articles.js` `normalizeSeoDescription()` | 짧으면 일반 문장을 **덧붙여** 120~160**자**로 채우고 길면 160자로 자른다 |
| `[slug]/page.js` `articleDescription()` | 그 결과를 다시 `.slice(0, 160)` — 또 글자 수 |

실측: 씨드 기사 113개의 `seoDescription` 폭이 **전부 160 초과**(최소 204 · 중앙 266)였고,
렌더 결과에서 **설명이 정확히 160자인 페이지가 58개**였다(절단의 흔적).

### 1-2. 고친 것

| # | 파일 | 무엇을 |
|---|---|---|
| 1 | `lib/seo.ts` | `truncateToDisplayWidth()` 신규 + `buildSeoMetadata` 에 적용(43개 라우트 공통 진입점) |
| 2 | `lib/generate-page-metadata.ts` · `lib/seo/createI18nMetadata.ts` | 다시 구현하지 않고 위 함수를 부른다(라우트 11개) |
| 3 | `app/nakshatra/codex/[index]/page.tsx` | metadata 를 손으로 조립하므로 직접 부른다. 예전 `convergence.slice(0, 90)` 은 글자 수 절단이라 폭 207~242 였다 |
| 4 | `app/insights/seo-descriptions.js` **(신규)** | 기사 114개 문안 재작성(폭 ≤152 · 중앙 142). 기계가 덧붙이던 일반 문구 제거 |
| 5 | `lib/seo-landing-pages.js` | 랜딩 12개 재작성 — 공통 절단에 맡기면 문장이 중간에서 끊긴다 |
| 6 | 개별 라우트 13개 · `index.html`(`/`) · `sync-legacy-static-to-public.mjs`(`/en`) | `export const metadata` 를 직접 쓰는 것들 |
| 7 | `scripts/verify-adsense-readiness.mjs` | **`verifyIndexableDescriptionWidth` 신규** — 사이트맵 URL 전량, 손으로 든 목록 없음 |

### 1-3. 실측 (dist, 색인 388개)

| 항목 | 전 | 후 |
|---|---:|---:|
| 설명 표시 폭 중앙 / 최대 | 153 / 277 | **141 / 160** |
| 폭 160 초과 | 183 | **0** |
| 중복 설명 · 빈 설명 | 0 · 0 | 0 · 0 |

### 1-4. 남은 것 — (a) 는 닫혔고 (b) 는 사용자가 보류했다

**(a) ✅ 공통 절단이 만든 `…` 42개 — PR #1195 에서 42 → 0.**

| 갈래 | 개수 | 한 일 |
|---|---:|---|
| 손으로 쓴 문안 | 10 | `/animal/mbti` `/compare/fortune-apps` `/dream/psycho` `/insights/fusion` `/ja/tokushoho` `/psychotest` `/refund-policy` `/sukuyo/compatibility` `/tarot/healing` `/vedic/jyotish` |
| 템플릿 2개 | 5 | `/fortune/{today,tomorrow}`(`app/fortune/[period]/page.tsx`) · `/stories/{prologue,ep-02,ep-08}`(`app/stories/[episode]/page.tsx`) |
| 템플릿 1개 | 27 | `/nakshatra/codex/0~26` — 문장 경계 절단으로 교체 |

🔴 **템플릿을 고치면 그 템플릿의 전 페이지 문구가 함께 바뀐다.** `/stories` 는 전 에피소드가
`읽는 시간 약 N분의 창작 소설입니다.` → `창작 소설, 읽는 시간 약 N분.` 으로 바뀌었고,
`/fortune` 은 `산출 근거를 함께 공개합니다` 를 빼고 대신 잘려 나가던
`총운·애정운·재물운·건강운·직장운` 을 살렸다. 사이트맵 원장에서 83개 항목의 signature 가
움직인 것이 그 범위다.

🔴 **codex 27개는 `truncateToDisplayWidth` 를 고쳐서 푼 것이 아니다.** 그 함수는
`buildSeoMetadata` 를 통해 라우트 43개가 공유하므로 절단 방식을 바꾸면 범위 밖 설명이 전부
움직인다. 대신 `app/nakshatra/codex/[index]/page.tsx` 안에 `toLastCompleteSentence()` 를 두고
**한계 안에 온전히 들어오는 마지막 문장**까지만 쓴다(문장이 2개 미만이면 공통 절단으로 떨어진다).

실측(2026-08-27 dist, 색인 388개): `…` 로 끝나는 설명 **42 → 0**. 폭 최소 73 / 중앙 138 /
최대 160, 중복 0 · 빈 것 0 · 폭 50 미만 0. codex 27개는 폭 117~150.

🔴 ~~**`/fortune/weekly` 는 아직 `…` 로 끝난다 — 의도한 것이다.**~~ **2026-08-28 에 고쳤다.**
그 페이지는 그때 `noindex` 라 사이트맵에 없고 SERP 폭 기준의 대상이 아니었다
(`기간 2026-08-24 ~ 2026-08-30` 이 길어 한계를 넘었다). 색인으로 되돌리면서 주간 허브만
압축 날짜 + `요일별 일진 배치` 로 문장을 바꿔 최악 폭 151 로 내렸다 —
`app/fortune/[period]/page.tsx` 의 `seoText`. 이제 색인 439개 전부 `…` 로 끝나는 설명이 0 이다.

**(b) 🔴 사용자가 2026-08-27 에 "이번 세션은 손대지 않음" 으로 보류했다.**
`normalizeSeoDescription()` 의 160**자** 천장은 그대로다. 🔴 그 함수의 결과
(`seoDescription`)를 인사이트 허브 카드(`app/insights/page.js`·`InsightsCosmicClient.js`)가
**화면 문구로 읽는다** — 고치면 목록 UI 가 함께 바뀐다. 지금은 `<title>`/description 이 별도 표를
쓰므로 색인에는 영향이 없지만, 허브 카드에는 여전히 기계가 덧붙인 일반 문구가 남아 있다.
손대려면 그 UI 변경을 먼저 승인받을 것.

### 1-5. 이 작업에서 가드가 잡아낸 것

🔴 문구를 줄이면서 `/tarot/prompt-maker` 의 `의료·법률·투자` 와 `/yeon-star-hug` 의
`엔터테인먼트` 를 함께 날렸는데 `verifyPublicFeatureMetadataSource` 가 빌드를 세웠다.
**설명 문구를 줄일 때는 그 라우트가 필수 마커를 갖고 있는지 먼저 볼 것**
(`scripts/verify-adsense-readiness.mjs` 의 `routeMetadataChecks`, 현재 3개 파일).

## 2. ✅ 아웃바운드 내부 링크 0인 색인 대상 18개 — PR #1193 에서 18 → 0

### 2-1. 결정

사용자가 2026-08-27 에 **"결과 하단 관련 링크 3~4개"** 를 골랐다(대안이던 "영구 예외 등재"는
채택되지 않았다). `docs/CURRENT_DEV_BASELINE.md` Working Rule 4(몰입형 라우트는 공유 헤더·
푸터·하단 네비를 렌더하지 않는다)는 **그대로 둔다** — 새 블록은 공유 크롬이 아니라 페이지
자신의 본문 최하단이다.

### 2-2. 고친 것

| # | 파일 | 무엇을 |
|---|---|---|
| 1 | `app/components/ImmersiveRelatedLinks.tsx` **(신규)** | 서버 컴포넌트. 링크 4개(`/naming-ai` 만 3개) |
| 2 | `page.tsx` 18개 | 몰입형 클라이언트 **뒤**에 한 줄씩(각 +2줄) |
| 3 | `scripts/verify-adsense-readiness.mjs` | `verifyIndexableOutboundLinks` 신규 |

🔴 **서버 컴포넌트여야 한다.** 크롤러가 보는 것은 정적 HTML 이라, 링크를 클라이언트 컴포넌트
안에 넣으면 산출물의 `<a href>` 수가 **그대로 0** 이다. 선례는 `app/tarot/mindscan/page.tsx:210`
(같은 모양이라 `/tarot/mindscan` 은 18개 목록에 없었다).

🔴 **링크 목적지는 손으로 들지 않았다.** `lib/seo/entity-registry.mjs` 의
`getTopicClusterLinks(path)` 가 9개 라우트를 덮고, 프로필이 없는 나머지 9개만 컴포넌트 안
`CURATED_RELATED_PATHS` 로 **경로만** 보완한다. 라벨은 어느 쪽이든 목적지 프로필의 `title` 을
읽으므로 문구가 두 벌로 갈리지 않는다.
🔴 **레지스트리에 프로필을 새로 추가하지 않았다** — `SEO_ROUTE_PROFILES` 는 랜딩 템플릿의
키워드·클러스터 링크·구조화 데이터가 함께 읽는 공용 정본이라, 항목을 늘리면 범위 밖 페이지
문구까지 움직인다.

### 2-3. 실측 (2026-08-27)

| 항목 | 전 | 후 |
|---|---:|---:|
| 아웃바운드 내부 링크 0인 색인 URL (dist, 388개) | 18 | **0** |
| 같은 것 (out) | 18 | **0** |
| `seo-audit --source=out` (dist) Issues | 0 | **0** |

재현: `node -e` 로 사이트맵 `<loc>` 을 훑어 각 HTML 의 `<body>` 이후 `<a href>` 중
`/` 또는 `code-destiny.com` 으로 시작하는 것을 세면 된다. 같은 판정이 이제 가드에 들어 있다.

### 2-4. 🔴 남은 것 — 일부 라우트에서 이 블록은 몰입형 셸에 가려진다

헤드리스 실측(390×844, **무상호작용 진입 상태**, 클립 스크린샷의 실제 픽셀로 대비 계산):

- 잘 보인다(대비 7.9~16.0) — `/life-book-ai` `/master-love-codex` `/neo-operation-room`
  `/new-year-ai-consultation` `/reviews` `/saju/destiny-meeting-place` `/saju/love-simulation`
  `/vedic-ai` `/yeon-star-hug` `/ziwei-ai` `/ziwei/chart`
- 몰입형 셸이 위를 덮는다(대비 1.0~3.5) — `/love-secret-ai` `/naming-ai`
  `/sukuyo-compatibility-ai` `/oracle/rune` `/saju-guardian` `/saju/destiny-bias`
  `/tarot/prompt-maker`

🔴 **이건 #1193 이 만든 조건이 아니다.** 같은 방법으로 **기존** `ServiceIntroSection` 을 재 보니
`/love-secret-ai` 1.10 · `/naming-ai` 1.07 · `/sukuyo-compatibility-ai` 1.10 으로 **똑같이 덮여
있었다** — 그 라우트들에 이미 배포돼 있는 블록과 정확히 같은 가시성이다. 셸의 `position: fixed`
를 걷어내는 것은 Working Rule 4 영역이라 별도 결정이 선행돼야 한다.
**SEO 목표(크롤 가능한 아웃바운드 링크)는 가시성과 무관하게 달성됐다.**

🔴 **측정할 때 두 번 헛짚었으니 반복하지 말 것** —
① `element.scrollIntoView()` 는 이 페이지들에서 안 먹는다(하이드레이션·지연 로딩이 계속 높이를
바꾼다). 뷰포트에 들어올 때까지 `window.scrollTo` 를 **반복**해야 한다.
② `page.screenshot({ fullPage: true, clip })` 는 판정에 쓸 수 없다 — Chromium 이 뷰포트를 페이지
높이로 늘려서 `position: fixed; inset: 0` 오버레이가 페이지 전체를 덮어 버린다. 실제로 스크롤한
뒤 **뷰포트 좌표로 클립**할 것.
③ `elementFromPoint` 는 `pointer-events: none` 인 오버레이를 통과하므로 "안 가려졌다"고 답한다.
가림 판정은 반드시 **칠해진 픽셀**로 한다([computed-style-misreads-translucent-paint] 와 같은 함정).

---

## 3. ✅ `/insights` 허브 페이로드 — PR #1197 에서 1,835,788 → 560,769

### 3-1. 🔴 먼저: 이 문서가 적었던 "1.83MB" 는 측정 지점이 틀렸다

원래 §3 은 측정 명령을 `dist/insights/index.html` 로 적어 두고 값을 1.83MB 라고 했는데,
**그 값은 `out/` 값이다.** 2026-08-28 실측(수정 전 트리, `048bf120e`):

| 파일 | 바이트 |
|---|---:|
| `out/insights/index.html` | 1,833,765 |
| `dist/insights/index.html` | **314,633** |

차이는 결함이 아니라 `scripts/externalize-dist-inline-scripts.mjs` 가 큰 인라인 `<script>` 를
`/js/shell/*.js` 로 빼내기 때문이다. **총 전송량은 같았다** — 빠져나간 것이
**85개 파일 1,521,155바이트**였고, 그 스크립트 자신의 머리말대로 `defer`·`async` 없는
**파서 차단** `<script src>` 라 성능으로는 오히려 나빴다. 진단(본문 전문이 실린다)은 옳았고
**측정 지점만 틀렸다.**

🔴 **그래서 이 계열을 다시 잴 때는 HTML 크기만 재지 말 것.** `dist` HTML 은 작아 보이고
페이로드는 옆 파일에 가 있다. 정본 측정은 아래 §3-4 의 "플라이트 바이트"다.

### 3-2. 고친 것

`toClientInsightItem()` 이 씨드 기사 113개의 `contentHtml` 전문(1,115,537바이트)을 `body`
props 로 넘기고 있었다. 화면에는 어디에도 렌더되지 않고 `filterPosts` 검색 필터 한 곳만 읽는다.

| # | 파일 | 무엇을 |
|---|---|---|
| 1 | `app/insights/page.js` | `buildInsightSearchText()` 신규 — 소제목(h1~h4) + `mainKeyword` + `relatedKeywords`. `toClientInsightItem` 의 `body` → `searchText` |
| 2 | `app/insights/InsightsCosmicClient.js` | `normalizePost` 에 `searchText`, `filterPosts` 의 bag 을 `item.searchText \|\| stripHtml(item.body)` 로 |
| 3 | `scripts/verify-adsense-readiness.mjs` | `verifyIndexableFlightPayloadBudget` 신규 |

**인덱스에 무엇을 넣었나** — 소제목은 기사의 하위 주제를 그대로 열거하므로
(`궁위별 해석`·`재물운과 직업운`) 본문을 뺐을 때 재현율 손실이 가장 적다.
🔴 `searchIntent` 와 FAQ 질문은 **전 기사 공용 템플릿 문장**이라
(`…관련 기능으로 연결하려는 정보 탐색 의도` / `{주제} 결과는 얼마나 자주 다시 봐야 하나요?`)
검색 노이즈만 늘리고 제목과 중복이라 뺐다. 다시 넣지 말 것.

| 인덱스 후보 | 씨드 113개 합계 |
|---|---:|
| 본문 전문(종전) | 1,003,447 |
| 본문 앞 300자 | 81,071 |
| 소제목 + 키워드 + `searchIntent` + FAQ | 95,022 |
| **소제목 + 키워드(채택)** | **~78,000** |

🔴 **기존 동작을 어디서 지켰는지** — `/api/insights` 응답에는 `searchText` 가 없고 `body` 가
온다(`worker/routes/insights.js:236`). `filterPosts` 가 `||` 로 둘 다 받으므로 API 모드의
본문 전문 검색은 그대로다. 씨드 지연 로드 폴백(`import("./seed-articles")`)도 raw 기사를
넘기므로 같은 경로가 산다. `estimateReadingTime(body)` 폴백은 원래 안 탔다 —
`toClientInsightItem` 이 `readingTime` 을 항상 1 이상으로 보낸다.

🔴 **사용자에게 보이는 변화 하나** — 정적 허브에서 검색어가 **기사 본문 한가운데 문장에만**
있으면 더 이상 매칭되지 않는다. 제목·요약·태그·카테고리·소제목·키워드는 그대로 검색된다.

### 3-3. ✅ 정적 셸 5개가 왜 큰지 쟀다 — 저작 주석은 걷어냈고, 남은 것은 CSS 결정 하나

이 문서가 "원인 미분석"으로 넘겼던 항목이다. **2026-08-28 에 실제로 쟀다.**

#### (1) 무엇이 1.3MB 인가 (dist/index.html, 총 1,293,860B)

| 구성 | 바이트 | 비중 |
|---|---:|---:|
| 인라인 `<style>` 84블록 | 653,843 | 50.5% |
| 마크업(태그 390,704 + 텍스트 117,837) | 508,541 | 39.3% |
| 인라인 `<script>` 53블록 | 79,548 | 6.1% |
| **HTML 저작 주석 325개** | **47,699** | **3.7%** |
| `<link>` · `<script src>` 태그 | 10,423 | 0.8% |

로케일 셸도 같은 CSS·주석을 그대로 갖고(653,843 · 47,699 로 바이트 동일), 커지는 부분은
마크업뿐이다(`/ja` 615,395 vs `/` 502,347 — 로케일 프리렌더가 문구를 늘린다).

#### (2) 🔴 raw 바이트로 겁먹지 말 것 — 전선에서는 1/6 이다

| 지점 | `/` | `/en` | 참고 `/insights` | 참고 `/saju/` |
|---|---:|---:|---:|---:|
| dist raw | 1,293,860 | 1,395,096 | 120,435 | 128,562 |
| 로컬 brotli q11 | 188,136 | 208,444 | 19,089 | 16,470 |
| **프로덕션 실측(br)** | **253,700** | **280,813** | 76,152 | 20,485 |

프로덕션 재현(2026-08-28): `curl -sS -o /dev/null -H "Accept-Encoding: br" -w "%{size_download}\n" https://code-destiny.com/`
응답 헤더는 `content-encoding: br` · `cache-control: no-cache` · `cf-cache-status: DYNAMIC` 다.
엣지가 쓰는 압축은 로컬 q11 보다 약하다(q5 상당 — 로컬 q5 로 재면 216,221 로 프로덕션에 가깝다).
**셸은 일반 라우트의 12배지만 1.3MB 가 아니라 254KB 를 보낸다.** 숫자를 그렇게 쓸 것.

#### (3) ✅ 한 일 — dist 저작 주석 제거 (PR #1199)

주석은 다음 세션이 "이 블록이 왜 있는지"를 아는 유일한 근거라 **소스에서는 지우지 않는다.**
`scripts/strip-dist-html-comments.mjs` 를 postbuild 마지막 단계에 넣어 **배포 바이트에서만** 뺀다
(minify-dist-css.mjs 와 같은 자리·같은 정책).

| 항목 | 전 | 후 |
|---|---:|---:|
| `dist/index.html` raw | 1,293,860 | **1,246,161** (−47,699, −3.7%) |
| 같은 파일 brotli q5(엣지 상당) | 216,221 | **200,062** (−16,159, −7.5%) |
| 같은 파일 brotli q11 | 188,136 | **173,441** (−14,695, −7.8%) |
| dist 정적 HTML 전체에서 제거된 주석 | — | 2,789블록 · 385,361B (파일 28개) |

🔴 **하이드레이션 HTML 709개는 건드리지 않는다.** 그쪽 주석은 저작 주석이 아니라 Suspense 경계
마커(`<!--$-->` `<!--/$-->` `<!--$?-->` `<!--$!-->`)와 텍스트 구분자(`<!-- -->`)이고 실측 18,188블록이다.
판정은 `minify-dist-css.mjs` 와 같은 `__next_f` 표식으로 한다.

🔴 **정규식으로 `<script>` 구간을 먼저 잡는 구현은 틀린다** — 주석 본문에 적힌 `<script>` 라는
**글자가 가짜 구간을 열어** 그 뒤의 진짜 주석을 삼킨다. 셸의 preconnect 설명 주석이 정확히 그
모양이라 첫 구현이 주석 1개를 남겼다. 그래서 좌→우 한 번의 스캔으로 찾는다(먼저 열린 쪽이 이긴다).
회귀 가드: `__tests__/ui/strip-dist-html-comments.static.test.js`.

#### (4) 🔴 여기서 다시 재지 말 것 — 이미 재서 이득이 없다고 나온 것들

전부 2026-08-28 dist 실측이다.

| 후보 | 실측 | 판정 |
|---|---:|---|
| 인라인 CSS minify 여지 | 접을 공백 38B · CSS 주석 0B | `minify-dist-css.mjs` 가 이미 다 했다 |
| 정확히 중복된 CSS 규칙 | 12,862B (규칙 바이트의 2.0%) | 뒤 규칙을 지우면 캐스케이드 순서가 바뀐다. 이득 대비 위험이 크다 |
| 죽은 CSS(셀렉터의 클래스·ID 가 마크업·JS 어디에도 없음) | 191규칙 27,868B (4.4%) | 대청소해도 raw 2% 다. 3,700규칙은 진짜로 쓰이고 있다 |
| `data-*` 속성 117,370B 중 i18n 83,258B<br>(`data-cd-trans` 30,561 · `data-key` 30,048 · `data-cd-trans-attr` 22,649) | — | **못 지운다.** `js/cd-lang-native.js:336-389` 가 런타임 언어 전환에서 읽는다 |
| `hidden` 서브트리 29개 | 22,017B (마크업의 4.3%) | 홈 정리를 삭제 대신 감추기로 한 결과([hiding-preserves-adsense-text-budget])지만 양이 작다 |

재현: 이 세션의 측정 스크립트는 스크래치에만 있었다. 다시 필요하면 `<style>`/`<script>`/주석을
구간별로 잘라 바이트를 세는 30줄짜리이고, 위 표의 수치가 기대값이다.

#### (5) ❌ 인라인 CSS 외부화 — **재서 기각했다. 다시 꺼내지 말 것**

이 문서는 원래 여기에 "이득 −80,701B(셸의 43%), 지금까지 잰 것 중 가장 큼"이라고 적어 두었다.
🔴 **그 수치는 틀렸다** — HTML 쪽만 세고 **브라우저가 대신 내려받아야 할 시트를 빼먹은 값**이다.
2026-08-28 재측정(dist, 첫 화면 미사용 23블록을 실제로 들어내 본 결과):

| | HTML brotli q11 | 외부 시트 | **첫 방문 합계** |
|---|---:|---:|---:|
| 현재 | 173,441 | — | **173,441** |
| 23블록 외부화 | 158,359 | 18,931 | **177,290 (+3,849)** |

쪼개면 압축 사전이 갈려 **총 전송량이 오히려 는다.** 크롤러는 대부분 첫 방문이므로 크롤 예산
관점에서는 순손해다. 남는 이득은 ①HTML 자체 −15,082B(파싱이 빨라진다) ②시트는 캐시 가능
(HTML 은 `no-cache`)로 재방문 이득뿐인데, 그 대가로 첫 페인트 경로를 건드린다. **하지 않는다.**

같이 확인한 것 — **죽어서 지울 수 있는 블록은 0개다.** CSS 커버리지로 재면 첫 화면에서
0바이트 쓰이는 인라인 블록이 27개(131,656B) 있지만, 그 27개의 셀렉터 토큰은 전부 셸의
마크업·JS 에 존재한다(가장 낮은 것이 `cd-social-footer-v20260630` 10%). **첫 화면에 안 쓰일 뿐
셸의 다른 화면에서 쓰인다** — 셸은 한 문서 안에 전 화면이 들어 있는 단일 파일 앱이다.

재현: Playwright `page.coverage.startCSSCoverage()` + dist 를 로컬 서빙. 기대값 —
인라인 CSS 648,149B 중 첫 화면 사용 158,939B(**24.5%**), 84블록이 커버리지 entry 84개와 1:1 매칭.

---

## 5. ✅ Core Web Vitals — 2026-08-28 에 **처음으로** 쟀다

이 문서가 "한 번도 재지 않았다"고 적어 둔 항목이다. PSI(`npm run perf:psi:audit`)는 그날
**일일 할당량 초과**라 못 썼고, Playwright + CDP 로 직접 쟀다.

측정 조건: 모바일 에뮬레이션 390×844 · DPR 3 · **CPU 4x 스로틀** · **Slow 4G(1.6Mbps / 150ms)** ·
load 후 6초까지 · 각 3회 중앙값. TBT 는 `longtask` 의 50ms 초과분 합(근사).

### 5-1. 🔴 프로덕션 (2026-08-28, 승격 전 = #1191~#1199 미반영)

| URL | FCP | LCP | CLS | TBT* | 전송 | 요청 |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 1,712 | **3,188** ❌ | 0 ✅ | **2,050** ❌ | 864KB | 76 |
| `/saju/` | 2,340 | 2,340 ⚠️ | 0.001 ✅ | 968 ❌ | 685KB | 73 |
| `/insights/` | 4,800 | **8,200** ❌❌ | **0.275** ❌ | 1,121 ❌ | **1,643KB** | **164** |
| `/fortune/today/` | 2,276 | 2,276 ⚠️ | **0.275** ❌ | 892 ❌ | 982KB | 75 |

기준: LCP ≤2,500 · CLS ≤0.1 · TBT ≤200.

### 5-2. ✅ 스테이징 (= main HEAD) — 머지된 수정이 이미 큰 폭으로 고쳐 놨다

| URL | 지표 | 프로덕션 | 스테이징 | 차이 |
|---|---|---:|---:|---:|
| `/insights/` | LCP | 8,200 | **5,184** | **−3,016ms** |
| | CLS | 0.275 | **0** | 해소 |
| | 전송 | 1,643KB | **958KB** | −685KB |
| | 요청 | 164 | **69** | −95 |
| `/fortune/today/` | CLS | 0.275 | **0** | 해소 |
| | 전송 | 982KB | 746KB | −236KB |
| `/` | LCP | 3,188 | 2,832 | −356ms |

🔴 **그러니 지금 가장 값싼 SEO 개선은 코드가 아니라 프로덕션 승격이다.** `/insights` 의
LCP −3.0초와 CLS 0.275 해소가 머지된 채 대기 중이다. 승격은
`gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production` 이고
**그때 한 번의 명시적 허락**이 있어야 실행한다(CLAUDE.md 절대 규칙 3).

### 5-3. 🔴 승격해도 남는 것 — 홈 LCP 2,832ms · TBT 2,065ms

스테이징에서도 홈은 기준을 넘는다. 메인스레드를 쪼갠 실측(스테이징 `/`, 같은 조건):

| 항목 | 시간 | 비중 |
|---|---:|---:|
| TaskDuration(총) | 9,809ms | 100% |
| **RecalcStyle** | **4,170ms** | **42.5%** (531회) |
| Layout | 1,885ms | 19.2% (174회) |
| Script | 1,133ms | 11.5% |
| 그 외(파싱·GC) | 2,622ms | — |

대조군 `/saju/`: RecalcStyle **220ms / 56회**. 홈이 19배다.

🔴 **원인은 JS 실행이 아니다.** CPU 프로파일에서 함수 self time 최댓값은 251ms 이고 57.7%가
`(program)`(파싱·스타일·레이아웃)이다. 트레이스로 보면 `UpdateLayoutTree` 4,239ms 중
**3,782ms(497회)에 호출 스택이 없다** — 즉 **파서가 문서 곳곳의 인라인 `<style>` 84블록을
만날 때마다 하는 재계산**이다(`v8.parseOnBackground` 9,740ms 도 같이 크다).

🔴 **그래서 "전부 head 로 모으면 되지 않나"를 실제로 해 봤고, 그건 답이 아니다.** dist 셸의
body 뒤 `<style>`/`<link rel=stylesheet>` **44개**를 순서를 유지한 채 `</head>` 앞으로 모아 A/B:

| 지표 | 현재(흩어짐) | head 로 모음 |
|---|---:|---:|
| RecalcStyle | 2,716ms | **2,007ms (−26%)** |
| TaskDuration | 6,954ms | 6,355ms |
| **FCP** | **236ms** | 272ms |
| **LCP** | **916ms** | **1,156ms (+240ms)** |

재계산은 줄지만 **CSS 가 전부 렌더 차단으로 앞당겨져 첫 페인트가 늦어진다.** LCP 가 나빠지므로
채택하지 않았다(로컬 서빙이라 네트워크 지연이 빠진 조건이고, 실제 망에서는 더 나빠진다).

**남은 후보(미검증)**: DOM 2,234 엘리먼트 · 시트 100개 · 규칙 4,977개를 줄이는 쪽. 셸이 한
문서에 전 화면을 담는 구조 자체를 건드려야 하므로 **별도 설계 결정**이다. 여기서 추측으로
손대지 말 것.

### 5-4. 아직 안 잰 것

- INP 실측(여기 TBT 는 longtask 근사다) · 실사용자 필드 데이터(CrUX)
- 모바일 UX · 콘텐츠 품질/검색 의도 적합성(SERP 대조 없음) · AI Overviews 노출
- 네이버 서치어드바이저 상태
- 전환율 — [conversion-bottleneck-is-audience-not-funnel] 대로 **병목은 전환율이 아니라 모수**다

### 5-5. 재현 방법

이 세션의 측정기는 스크래치에만 있었다(레포에 안 넣었다). 다시 만들 때 필요한 것만 적는다.

- CWV: Playwright `newContext({viewport:390x844, deviceScaleFactor:3, isMobile:true})` +
  CDP `Network.emulateNetworkConditions`(latency 150, down 1.6Mbps) + `Emulation.setCPUThrottlingRate{rate:4}`,
  `addInitScript` 로 LCP/CLS/FCP/longtask PerformanceObserver 를 심고 load 후 6초 대기.
- 메인스레드 분해: CDP `Performance.enable` → `Performance.getMetrics` 의
  `TaskDuration`/`ScriptDuration`/`RecalcStyleDuration`/`LayoutDuration`.
  🔴 `npm run perf:style-cost` 로 재지 말 것 — 룰 추적이 켜져 recalc 을 부풀린다
  ([perf-style-cost-inflates-recalc]).
- recalc 원인: CDP `Tracing.start` 에 `disabled-by-default-devtools.timeline.stack` 을 포함하고
  `UpdateLayoutTree` 이벤트의 `args.beginData.stackTrace` 를 집계. **스택이 없는 것이 파서 몫**이다.
- CSS 커버리지: `page.coverage.startCSSCoverage({resetOnNavigation:false})`.

---

## 6. 작업 순서 (추천)

1. ~~§1 제목·설명 폭~~ · ~~§2 몰입형 아웃바운드 링크~~ · ~~§3 `/insights` 페이로드~~ · ~~§3-3 셸 크기 실측 + 주석 제거~~ — 전부 닫혔다(#1186·#1191·#1193·#1195·#1197·#1199).
2. 🔴 **프로덕션 승격 — 지금 가장 값싼 SEO 개선이고, 코드 작업이 아니다.** `/insights` LCP −3.0초와
   CLS 0.275 해소가 머지된 채 대기 중이다(§5-2). `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`.
   🔴 **그 실행이 곧 프로덕션 배포 행위라 그때 한 번의 명시적 허락이 필요하다**(CLAUDE.md 절대 규칙 3).
3. **홈 LCP 2,832ms / TBT 2,065ms** — 승격해도 남는다. 원인은 파서 주도 recalc 4,170ms(§5-3)이고,
   🔴 "head 로 모으기"는 이미 A/B 로 재서 **LCP 가 나빠져 기각**했다. 다시 하지 말 것.
   남은 방향은 DOM 2,234개·시트 100개를 줄이는 구조 변경이라 **설계 결정이 선행**된다.
4. §1-4(b) 허브 카드 문구 — 🔴 사용자가 2026-08-27 에 **"이번 세션은 손대지 않음"** 으로 보류했다.
   §3-5 가 이 항목의 전제 하나를 반증했으니 함께 볼 것
5. §4 ETag — 🔴 사용자가 2026-08-27 에 **보류**했다(배포 파이프라인 결정 선행)
6. §5-4 미측정 영역(INP·모바일 UX·검색 의도·네이버) — 새 측정 세션

🔴 **다시 하지 말아야 할 것 3개**: 인라인 CSS 외부화(§3-3(5), 첫 방문 전송량 +3,849B) ·
`<style>` head 모으기(§5-3, LCP +240ms) · 셸 죽은 CSS 대청소(§3-3(4), 죽은 블록 0개).

## 7. 🔴 이어받을 때 반드시 지킬 것

### 감사 도구

```bash
npm run build:cf
SEO_AUDIT_OUT_DIR=dist node scripts/seo-audit.mjs --source=out --crawl-sitemap
# 리포트: seo-audit-report-out.json / .md (.gitignore 등재, 커밋하지 않는다)
```

- 🔴 **반드시 `SEO_AUDIT_OUT_DIR=dist`.** 기본값 `out/` 은 Next export 원본이지 배포 정본이 아니다.
  정적 셸 승격과 `locale-prerender` 가 dist 에만 적용된다.
- 현재 이슈 **0**. 새로 뜨는 것이 있으면 그게 회귀다.

### 빌드 산출물 취급

- 🔴 `npm run build:cf` 는 **추적 파일을 다시 쓴다.** `rss.xml`(루트·`public/`·`insights/`·
  `public/insights/`) 4개가 매번 갱신된다 — **범위 밖이면 `git checkout` 으로 되돌린다.**
- 반대로 `sync:public` 산출물(`public/**` 미러 13개)은 **반드시 커밋**한다.
- `.ignore` 가 내용 변화 없이 `M` 으로 뜨면 CRLF 정규화다 — `git checkout -- .ignore`.
- `verify:public-mirror-fresh` 가 `.ignore` 한 줄만 차이라고 하면 윈도우 헛실패다.

### 🔴 이 브랜치가 계속 충돌한 이유 — 생성 파일 경쟁

2026-08-27 에 한국 음양력 이관 PR 들(#1183 · #1185 · #1187, E1~E5 시리즈)이 연달아 머지되면서
`config/sitemap-lastmod.json` · `sitemap.xml` · `public/sitemap.xml` 이 매번 회전했다.
**#1186 은 이 때문에 두 번 CONFLICTING 이 됐다.** 소스 충돌은 0건이었다.

해소법 — 어느 쪽 해시도 고르지 말고 **재생성**한다:

```bash
git rebase origin/main
git checkout --theirs config/sitemap-lastmod.json   # 마커 제거용일 뿐
npm run sitemap:generate                            # 양쪽 소스가 다 있는 상태에서 재계산
npm run verify:sitemap-drift                        # "추적본이 재생성 결과와 일치" 확인
git add config/sitemap-lastmod.json sitemap.xml public/sitemap.xml
git rebase --continue
git push --force-with-lease
```

✅ **이 레시피는 2026-08-27 에 #1193 에서 그대로 통했다** — `#1192`(PR-E5) 머지로 CONFLICTING 이
됐고, 충돌 파일은 `config/sitemap-lastmod.json` 하나였으며 소스 충돌은 0건이었다. 재생성 후
`verify:sitemap-drift` OK, `mergeable: MERGEABLE` 로 복귀했다. **의심하지 말고 이대로 할 것.**

🔴 **라우트를 건드리는 SEO 작업은 이 시리즈가 끝난 뒤에 시작하거나, 브랜치를 짧게 유지할 것.**
E 시리즈 진행 상황은 [korean-calendar-migration-2026-08-27.md](korean-calendar-migration-2026-08-27.md).

### 함정 모음

- 🔴 **`dist` 의 HTML 크기는 그 페이지가 실어 나르는 양이 아니다** (2026-08-28 실측).
  `scripts/externalize-dist-inline-scripts.mjs` 가 큰 인라인 `<script>` 를 `/js/shell/*.js` 로
  빼내므로 HTML 만 재면 페이로드가 줄어든 것처럼 보인다 — `/insights` 는 `out` 1,833,765 ·
  `dist` 314,633 이었지만 dist 에서 대신 **파서 차단 스크립트가 85개**로 늘어 있었다.
  크기 판정은 **HTML + 그 파일이 참조하는 `/js/shell/*.js`** 를 함께 세야 한다
  (정본: `verify-adsense-readiness.mjs` 의 `flightPayloadBytes()`).
  이 문서 §3 이 실제로 이 함정에 한 번 걸려 잘못된 수치를 남겼다.
- 🔴 **`__tests__/ui/svg-title-not-document-title.static.test.js` 는 `app/**` 소스에서 리터럴
  `<` + `title` + `>` 를 찾는다.** 주석에 그 표기를 써도 SVG title 회귀로 **오탐**된다.
  "문서 제목" 이라고 적을 것. 이 세션에서 한 번 걸렸다(가드는 건드리지 않았다).
- 🔴 **기사 레코드의 `metaTitle`/`seoTitle` 은 화면 문구이기도 하다** — 정규화를 거쳐
  `seed-articles.js` 의 `seoTitle` 이 되고, 인사이트 허브 카드
  (`app/insights/page.js`·`InsightsCosmicClient.js`)가 그 값을 렌더한다.
  head 메타만 바꾸고 싶으면 `app/insights/seo-titles.js` 처럼 **별도 표**를 쓸 것.
  🔴 설명(§1)도 같은 함정을 갖는다 — `seoDescription` 역시 목록 UI 가 읽는다.
- **셸(`index.html`) 문구를 고치면 diff 가 90줄로 부푼다** — 실제 변경은 4줄
  (title·og:title·twitter:title·JSON-LD name)이고 나머지는 `sync:public` 캐시버스트 회전이다.
- **로케일 홈 문서 제목은 `public/i18n/{locale}.json` 의 `shell.CODEDESTINY` 가 정한다.**
  `sync-legacy-static-to-public.mjs` 의 `LOCALE_SHELL_SEO.title` 은 og:title/twitter:title 전용이다
  (스크립트 555행 주석이 그렇게 적어 두었다). 색인 로케일은 `en`·`ja`·`zh`·`zh-tw` 4개뿐.
- **`/x.html` 링크는 Cloudflare Pages 가 308 로 `/x` 에 붙인다**(2026-08-27 프로덕션 실측).
  링크 그래프 판정에서 이 별칭을 접지 않으면 고아 위양성이 난다 — `seo-audit.mjs` 는 이제 접는다.

### 워크트리

- `node_modules` 심링크가 안 생길 수 있다. 빌드 전에 `ls -ld node_modules` 로 확인하고,
  없으면 `cmd /c mklink /J "<워크트리>\node_modules" "<저장소 루트>\node_modules"`.
  지울 때는 **링크부터 끊는다**(`cmd /c rmdir`).
- jest 는 `NODE_OPTIONS=--experimental-vm-modules npx --no-install jest` 로 돌린다.
- 🔴 이 환경에는 **`jq` 가 없다.** `gh pr checks` 를 jq 로 파싱하는 감시 스크립트는 조용히
  아무것도 안 한다(이 세션에서 CI 신호를 한 번 놓쳤다). 텍스트 출력을 grep 할 것.

---

## 8. 🔴 정본 예시 — 폭 문제를 고치는 표준 모양

새 라우트나 새 문구가 폭 한계를 넘으면 **아래 네 조각을 그대로 따라 한다.** 이미 두 번
(제목 #1186 · 설명 #1191) 같은 모양으로 처리했고, 세 번째도 같아야 한다.

**(1) 폭 계산은 한 곳에만 둔다** — `lib/seo.ts:42`(`SEO_DESCRIPTION_WIDTH_LIMIT`) ·
`lib/seo.ts:50`(`truncateToDisplayWidth`). 🔴 **다시 구현하지 말 것.**
`lib/generate-page-metadata.ts` 와 `lib/seo/createI18nMetadata.ts` 는 이 함수를 **부르기만** 한다.

**(2) 공통 진입점에서 자른다** — `lib/seo.ts:71` 에서 `buildSeoMetadata` 의 description 에 적용.
43개 라우트가 이 진입점을 공유하므로 개별 파일을 41곳 고칠 필요가 없었다.

**(3) 문구 품질이 필요한 곳만 별도 표** — `app/insights/seo-descriptions.js`(설명 114개) ·
`app/insights/seo-titles.js`(제목 104개). 소비는 `app/insights/[slug]/page.js:84`(설명) ·
`app/insights/[slug]/page.js:110`(제목)에서 `표 우선, 없으면 기존 동작` 한 줄이다.

🔴 **기사 레코드의 `metaTitle`/`seoTitle`/`seoDescription` 에 넣지 않는 이유** — 그 값들은
`seed-articles.js` 의 정규화를 거쳐 인사이트 허브 카드(`app/insights/page.js` ·
`InsightsCosmicClient.js`)의 **화면 문구로도** 쓰인다. 거기에 쓰면 목록 UI 까지 바뀐다.

**(4) 가드는 산출물에서 전수 발견한다** — `scripts/verify-adsense-readiness.mjs` 의
`EAST_ASIAN_WIDE` · `serpTitleWidth` · `verifyIndexableTitleWidth` ·
`verifyIndexableDescriptionWidth` · `verifyIndexableOutboundLinks`(2026-08-27 추가, §2).
손으로 든 목록이 없고, `out/`·`dist/` 의 사이트맵
URL 전량(`/x.html` 단독 라우트 포함)을 훑으며, URL 이 0개여도 실패한다.
🔴 신규 `verify:*` npm 스크립트를 만들지 않는다 — `verify-guard-wiring` 이 배선을 요구하고
CI 게이트 추가는 사용자 승인 사항이다(`docs/CURRENT_DEV_BASELINE.md` §6). 이미 `build:cf` 가
부르는 이 파일 안에 판정을 하나 더 다는 것이 정본이다.
🔴 **가드를 넣었으면 반드시 음성 테스트를 한다** — dist 의 아무 페이지를 옛 값으로 되돌려 넣어
실패하는 것을 보고 복원한다. 검사 대상이 없어서 통과하는 가드는 가드가 아니다(CLAUDE.md 원칙 10).

🔴 **문구를 줄이기 전에 필수 마커부터 확인한다** —
`scripts/verify-adsense-readiness.mjs` 의 `routeMetadataChecks`(현재 3개 파일).
이번에 `의료·법률·투자`·`엔터테인먼트` 를 날려 빌드가 두 번 섰다.

---

## 9. 🔴 근거를 못 찾으면 추측하지 말고 물어라

이 레포에서 추측이 사고로 이어진 실제 이력이 있다.

- 이번 세션에서도 이 문서에 "`/nakshatra` 28개는 같은 템플릿에서 나온다"고 **추정으로** 적었는데,
  실제로는 `lib/seo-landing-pages.js` 의 개별 문안이었다. 열어 보고 나서야 알았다.
- "임포터 0" 은 죽었다는 증거가 아니다(`lib/payment/portone.ts`).
- "없다/영향 없다" 는 **전수 검색을 실제로 돌린 뒤에만** 쓰고 검색 범위를 함께 적는다.
  🔴 그 grep 은 반드시 `git grep` — 리포 루트 `.ignore` 가 `sync:public` 미러 172개를
  Grep/Glob 에서 빼므로 rg 로는 미러의 참조를 못 본다.

**정책·IA·UI 가 갈리는 지점은 임의로 고르지 말고 사용자에게 묻는다.** 2026-08-27 에 §2 ·
§1-4(b) · §4 를 그렇게 물었고, 답은 **§2 = 관련 링크 넣기 / §1-4(b) = 보류 / §4 = 보류** 였다.
**보류는 "다시 물어라"가 아니라 "이 세션에서 하지 말라"는 뜻이다** — 되살리려면 사용자가 먼저
꺼내야 한다.

---

## 10. 참고 문서

- [seo-render-audit-2026-08-27.md](seo-render-audit-2026-08-27.md) — 1차 감사 전문 + 2차 세션 §10
- [seo-content-expansion-roadmap.md](seo-content-expansion-roadmap.md) — §I 의 P1 미착수분,
  §2 의 무료→유료 CTA 공백 9곳(페이지별 사전 조사가 선행돼야 한다)
- [seo-indexing-2026-08-15.md](seo-indexing-2026-08-15.md) — §2 의 미해결 2건은 §4 가 답한다
- [korean-calendar-migration-2026-08-27.md](korean-calendar-migration-2026-08-27.md) — 충돌을 만든 E 시리즈
