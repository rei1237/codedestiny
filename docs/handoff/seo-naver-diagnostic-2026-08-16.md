# 네이버 서치어드바이저 진단 대응 — 인수인계 (2026-08-16)

> 이 문서만 읽고 이어서 작업할 수 있게 쓴다. 수치는 전부 그날의 라이브 실측이고 재현 명령을 함께 남긴다.
> 선행 문서: [seo-indexing-2026-08-15.md](seo-indexing-2026-08-15.md) — 그쪽 §3-A(로케일 한국어 크롬)·§C(lastmod 원장)·§D(IndexNow)·§E(sameAs)·§F(고아 페이지)는 **여전히 미착수**이며 이 문서와 중복되지 않는다.

## 0. 입력 — 네이버가 보고한 것과 그 정체

| 항목 | 수 | 정체 (실측으로 규명됨) | 상태 |
|---|---|---|---|
| 접근 불가한 페이지 | 38 | `_redirects` 상한에 잘려 죽은 `/fortune/{weekly,monthly}/*.html` | ✅ #708 |
| `<title>` 2개 이상 | 2 | `/nakshatra/` 의 SVG `<title>` 2개 | ✅ #714 |
| Alt 속성 누락 | 11 | `HwatuFortune.js` 10 + `PhysiognomyUI.js` 1 (런타임 주입) | ✅ #714 |
| 리다이렉션된 페이지 | 140 | RSS 링크 38개 무슬래시 + 셸 내부 링크 고유 94경로 무슬래시 | 🟡 RSS 는 #710, 내부 링크는 **미착수(§3-A)** |
| meta robots 색인 제외 | 740 | **famous-saju 별칭 사본 606 + 나머지 noindex 약 120~134** | 🟡 별칭 URL 회수는 #713, 정책 자체는 의도됨 |
| 동일 제목 / 동일 설명문 | 각 1,900 | **famous-saju 별칭 606개가 본문·title·description 바이트 동일** × URL 변형 | 🟡 생성은 이미 중단(2026-06-04), 누적 데이터가 빠지길 기다리는 중 |
| `<H1>` 2개 이상 | 53 | 서버 HTML 이 아니라 **하이드레이션 이후 DOM** | ❌ **미착수(§3-B)** |
| description 누락 | 13 | Next metadata 밖의 레거시 단독 HTML 19개 | ❌ **미착수(§3-D)** |
| robots.txt 차단 | 4 | 사이트맵 429개 중 Disallow 충돌 0건 — 정상 동작 | — |
| 색인 | 350 | — | — |

### 🔴 가장 중요한 진단 — 사이트맵은 결백하다

**라이브 429개 URL 전수 실측: 중복 title 0 · 중복 description 0 · h1 정확히 1개 · canonical 불일치 0 · noindex 0 · 전부 200.**
네이버가 지적한 것은 **전부 사이트맵 밖 URL 공간**에 있다. 사이트맵·robots·canonical 을 고치는 작업은 하지 말 것 — 이미 정상이다.

### 🔴 "1,900 / 740" 의 출처 (사용자 제보 + 실측으로 확정)

`lib/famous-saju/celebrity-data.ts:376-381` 이 기록하고 있다:

> 예전에는 slug + nameKo + aliases 를 전부 돌려서 인물 1명이 URL 여러 개를 만들었고
> **(134명 → 303 URL, `/famous-saju` 와 `/insights/famous-saju` 두 트리라 실제 파일 606개)**,
> 별칭 페이지는 본문이 정본과 **100% 동일한 사본**이었다.

- 606개가 title·description·본문까지 바이트 동일 + 전부 noindex → **740 / 1,900 과 자릿수가 맞는다.**
- 생성은 **2026-06-04 `9396dc8ce`** 에서 이미 중단됐다(현재 134개, 중복 title 0, h1 전부 1개 — 실측).
- 즉 네이버 수치는 **그 이전 크롤의 누적**이다. 새 크롤이 돌면 빠진다.
- 다만 **구 URL 을 회수하지 않아** 별칭 169개가 404 였고 `/famous-saju/<별칭>` 은 301→404 였다 → #713 에서 회수.

## 1. 완료 (PR 4건)

| PR | 브랜치 | 내용 | 상태 |
|---|---|---|---|
| #708 | `fix/seo-redirect-budget` | `_redirects` 상한 사고 — §2-1 | ✅ 머지 |
| #712 | `docs/seo-naver-diagnostic-handoff` | 이 문서 최초본 | ✅ 머지 |
| #713 | `fix/seo-famous-saju-alias-redirects` | 별칭 169개 회수 — §2-3 | ✅ 머지 |
| #710 | `fix/seo-canonical-link-slash` | RSS·동적 사이트맵 링크 후행 슬래시 — §2-2 | 🟡 오픈 |
| #714 | `fix/seo-metadata-defects` | SVG `<title>` + alt 18개 — §2-4 | 🟡 오픈 |

🔴 **#708 은 이미 라이브다. `npm run verify:redirects:live` 를 아직 안 돌렸다면 지금 돌릴 것.** 개수 가드가 구조적으로 볼 수 없는 것(상한이 규칙 수인지 바이트인지)을 이것만 본다.

### 2-1. `_redirects` 규칙 상한 — "접근 불가 38건" 의 정체

🔴 **Cloudflare Pages 는 `public/_redirects` 의 첫 102개 규칙만 적용하고 나머지를 에러도 경고도 없이 무시한다.** 규칙이 303개였으므로 **201개가 죽어 있었다.** 경계는 #102 → #103 사이로 **연속된 동일 블록 한가운데서 끊긴다**(스테일 배포도 파싱 오류도 아니다).

조치: `_redirects` 303 → 89개, `/fortune/**` 108개는 `public/_worker.js` 로 이관, 새 가드 `verify:redirects-budget`(빌드 배선) + `verify:redirects:live`(수동).

**같이 알아낸 엣지 동작 3가지 — 앞으로 리다이렉트 설계의 전제로 삼을 것 (전부 실측)**
1. `_redirects` 규칙은 **정적 에셋을 이긴다.** 넓은 splat 하나가 사이트맵 라우트를 통째로 삼킨다.
2. `X/*` 는 `X/`(빈 splat)를 매칭하지만 `X` 는 매칭하지 않는다. → 별칭은 `X` + `X/*` 두 줄이 한 쌍.
3. `.html`·`index.html`·`www`·`http` 정규화는 Pages 가 이미 308/301 로 처리한다. 규칙을 둘 필요가 없다.

**미확정**: 상한의 근거가 규칙 수(100)인지 바이트(#102 까지 9,477B)인지.

### 2-2. RSS 링크 38개가 전부 308 (#710, 오픈)

`trailingSlash: true` 인데 `scripts/generate-rss.mjs` 가 무슬래시로 링크를 만들었다. 네이버 제출 피드의 `<link>` 38개가 전부 리다이렉트였고 사이트맵 `<loc>` 과 하나도 일치하지 않았다. `worker/routes/content.js` 의 동적 피드(정적 rss.xml 에 병합됨)와 동적 사이트맵 `<loc>` 도 함께 고쳤다.

### 2-3. famous-saju 별칭 169개 회수 (#713)

`scripts/generate-famous-saju-aliases.mjs` 가 `celebrity-data.ts` 에서 별칭→정본 맵을 전수 파생 → `public/famous-saju-aliases.json` → 워커가 `env.ASSETS` 로 읽어 한 홉 301. `_routes.json` 에 `/insights/famous-saju/*` 추가. 드리프트·충돌·2홉 체인·무한 루프를 `verify:redirects-budget` 과 `__tests__/ui/famous-saju-alias-map.static.test.js` 가 fail-closed 로 막는다.

### 2-4. SVG `<title>` + alt (#714, 오픈)

- `NakshatraSymbols.tsx:45,59`·`MoonIcon.tsx:38` 의 `<title>` → `aria-label`. **빌드 산출물 687개 중 `<title>` 2개 이상 0건** 실측.
- `HwatuFortune.js` 10 + `PhysiognomyUI.js` 1 + `tadagochi.html` 7 에 alt. **산출물 alt 누락 0건** 실측.
- 새 테스트 `__tests__/ui/svg-title-not-document-title.static.test.js` 가 재발을 막는다.

---

## 2. 남은 작업

### 시작 절차 (다음 세션이 제일 먼저 할 것)

```bash
# 1) 격리된 워크트리 — 기본 디렉터리에는 다른 세션의 미커밋 변경이 있다(§6)
cd /d/Development/code-destiny/.claude/worktrees/seo-indexing-fixes   # node_modules 있음
pwd                                                                   # 🔴 매번 확인
git fetch origin && git checkout -B fix/<주제> origin/main

# 2) 고치기 전에 결함을 먼저 재현한다 — 수치가 안 나오면 이미 남이 고친 것이다
npm run verify:redirects:live          # #708 이후 상한 재발 감지 (아직 안 돌렸다면 이게 최우선)
node scripts/verify-redirects-budget.mjs
npm run test:node
```

**착수 순서 추천** — 앞의 것이 뒤의 것을 막지 않으므로 병렬 분기해도 되지만, 효과 대비 위험은 이 순서다.

| # | 항목 | 왜 이 순서인가 | 예상 분량 |
|---|---|---|---|
| 1 | **C. description 19건** | 위험이 가장 낮고 네이버 항목 하나를 통째로 닫는다. 판정만 하면 되고 공유 코드에 손대지 않는다 | 작음 |
| 2 | **E. 루트 layout 메타 상속** | `robots`-only layout 17개에 메타를 채우는 기계적 작업. 전부 noindex 라 색인 회귀 위험 0 | 중간 |
| 3 | **B. H1 하이드레이션 중복** | 공유 템플릿 2개(각 18페이지)를 건드릴 수 있어 회귀 점검이 필요하다. 가드 확장이 본체 | 중간~큼 |
| 4 | **A. 내부 링크 후행 슬래시** | SEO 효과는 가장 크지만 CI 단언 9곳 + 조용히 깨지는 로케일 분기 + 결제 동결이 얽혀 있다. **한 세션을 통째로 쓸 것** | 큼 |

🔴 A 와 B 는 **같은 PR 에 넣지 말 것.** 둘 다 회귀 표면이 넓어서 CI 가 빨개졌을 때 원인 분리가 안 된다.

### A. 🔴 P0 — 내부 링크 후행 슬래시 (리다이렉션 140건의 나머지 102건)

**증상:** `next.config.mjs:184` `trailingSlash: true` 인데 셸 내부 링크가 무슬래시다.
실측: `public/index.html` 의 `href="/..."` 204개 중 **무슬래시 160개(고유 94경로)** / 슬래시 6개. `SiteFooterHub` 48/2. `data-fallback-href` 21개 중 11개, `data-service-detail-href` **18개 전부** 무슬래시.
→ 크롤러가 발견하는 거의 모든 URL 이 2회 요청이 된다. **남은 작업 중 SEO 효과가 가장 크다.**

**🔴 그냥 고치면 CI 가 즉사한다 — 동반 수정 9곳** (전부 `href="/x"` 를 문자열로 단언):

| 파일:줄 | 단언 문자열 |
|---|---|
| `scripts/verify-public-parity.mjs:16` | `'href="/naming-ai"'` |
| `scripts/verify-public-parity.mjs:17` | `'href="/privacy-policy"'` |
| `scripts/verify-naming-prompt-flow.mjs:68` | `'href="/naming-ai"'` |
| `scripts/verify-karma-destiny-ai-flow.mjs:39` | `'href="/karma-destiny-ai"'` |
| `scripts/verify-life-book-ai-flow.mjs:249` | `'href="/premium-unlock"'` |
| `scripts/verify-master-love-codex-flow.mjs:510` | `'href="/master-love-codex"'` |
| `scripts/verify-new-year-ai-flow.mjs:54` | `'href="/new-year-ai-consultation"'` |
| `scripts/verify-mobile-entry-actions.mjs:40` | `'href="/tarot/mingri"'` |
| `scripts/verify-mobile-cdp-smoke.mjs:126` | `.moon-preview-card[href="/tarot/mingri"]` |

**🔴 더 위험한 것 — `js/core/index-inline-runtime.js:624-636`**
```js
var basePath = cdStripLocalePrefix(u.pathname);
var isAppLocalized = (basePath === '/oracle/rune' || … || basePath === '/insights' || …);
var isStandaloneHtml = (basePath === '/vedic-ai' || …);
```
`href="/insights"` → `"/insights/"` 가 되면 `basePath` 가 `/insights/` 라 **모든 조건이 조용히 false** 가 되고 ja/zh/en 사용자가 한국어 페이지로 간다. **에러도 테스트도 없다.** 이 함수의 슬래시 정규화가 **반드시 같은 PR** 에 포함돼야 한다.

**그 외 제약**
- `data-fallback-href`·`data-service-detail-href` 도 함께 — `js/mobile-interaction-patch.js:1362,1595` 가 실제 내비게이션 값(`window.location.href = href`)으로 쓴다.
- 🔴 미러 6개(`public/index.html`, `public/{en,ja,zh,zh-tw,static}/index.html`)는 **직접 패치 금지** — `npm run sync:public` 산출물이므로 같은 커밋에 담는다.
- 제외 대상: 확장자 있는 경로, `#`·`?` 시작, 외부 URL, `javascript:`.
- 🔴 `index.html` 은 결제창 정본이다 → `config/payment-freeze.json` 등재 여부를 확인하고 필요하면 `node scripts/verify-payment-freeze.mjs --update` 를 **같은 커밋**에 담는다.
- GA4 영향: `js/core/analytics.js:132` 의 `cross_sell_click.to_service` 값이 `/ziwei`→`/ziwei/` 로 바뀌어 대시보드 세그먼트가 끊긴다. GA4 설치가 2026-08-14 라 지금이 가장 싼 시점.
- 모바일 앱 빌드: `scripts/build-mobile-app.mjs:359` 의 `HREF_RE` 가 `/x/` 도 캡처하고 `:257` 이 `replace(/\/+$/,"")` 로 벗기므로 결과 동일(실측). 그래도 `npm run build:mobile:app` 로 확인.
- 🔴 `index.html` 편집이 한글을 `\uXXXX` 로 이스케이프시킨 사례가 있다. 커밋 전 `npm run verify:entry-encoding` 과 diff 확인.

**새 가드 권장**: `verify:internal-link-trailing-slash` — 대상 파일을 소스에서 전수 발견, 예외는 인라인 마커로만 선언(배열 열거 금지), 대상 0개면 실패. `scripts/build-cf-main.mjs` steps 에 `["run","<name>"]` 로 배선하면 워크플로를 안 건드린다.

**실행 계획**

| 단계 | 하는 일 | 검증 |
|---|---|---|
| 1 | `js/core/index-inline-runtime.js:624-636` 의 `basePath` 비교를 **먼저** 슬래시 정규화(`basePath.replace(/\/$/,"")`)로 고친다 | 이 커밋만으로 기존 동작이 안 바뀌는지 `npm run test:node` |
| 2 | 루트 `index.html` 의 `href`·`data-fallback-href`·`data-service-detail-href` 를 스크립트로 일괄 정규화(제외 규칙은 위 목록) | `npm run verify:entry-encoding`(한글 `\uXXXX` 0) + `git diff` 육안 |
| 3 | `npm run sync:public` 으로 미러 6개 + `public/js/*` 재생성 | `npm run verify:public-parity`, `npm run verify:runtime-cache-sync` |
| 4 | CI 단언 9곳을 `href="/x/"` 로 갱신 | 각 `verify:*` 개별 실행 |
| 5 | `config/payment-freeze.json` 등재 확인 → 필요 시 `node scripts/verify-payment-freeze.mjs --update` 를 **같은 커밋**에 | PR 의 paid-gate scope 잡 출력 확인 |
| 6 | 새 가드 작성 + `build-cf-main.mjs` 배선 | 가드를 **역방향으로도 증명**(슬래시 하나 지웠을 때 실패하는지) |
| 7 | `npm run build:cf` | exit 0 + `[adsense-readiness] OK` |

**완료 판정**: 배포 후 `curl -s -o /dev/null -w "%{http_code}" https://code-destiny.com/about` 가 308 이 아니라 200 인 게 아니라(그건 안 바뀐다), **셸에서 나가는 링크가 308 을 안 타는 것** — `node scratchpad/live-outside.mjs` 류로 셸 링크 집합을 뽑아 3xx 가 0인지 본다.

### B. 🔴 P1 — H1 중복 53건은 **하이드레이션 이후** DOM 에서 생긴다

서버 HTML 전수 스캔에서 h1 ≥2 인 파일은 `out/pet-saju.html` **1개뿐**이다. 네이버가 본 53건은 `ssr:false` 클라이언트가 그리는 h1 과 `page.tsx` 의 서버 h1 이 합쳐진 결과다.

기존 가드 `scripts/verify-seo-heading-integrity.mjs` 는 **구조적으로 이걸 못 본다**(스크립트 20행이 스스로 명시). 그래서 "h1 0개"로 잡힌 라우트를 `page.tsx` 에 정적 h1 을 넣어 고치면 **하이드레이션 후 2개**가 된다 — **가드를 통과할수록 실제 중복이 늘어나는 구조**다.

| 라우트 | 서버 h1 | 클라이언트 h1 (`ssr:false`) |
|---|---|---|
| `/points` | `app/points/layout.tsx:39` (레이아웃 소유 → 하위 전체 주입) | `app/points/PointsClient.tsx:2312` |
| `/points/history` | 같은 레이아웃 h1 | `app/points/history/PointHistoryClient.tsx:914` |
| `/naming-ai` | `app/naming-ai/page.tsx:96` | `app/naming-ai/NamingAiClient.tsx:714` |
| `/love-secret-ai` | `app/love-secret-ai/page.tsx:96` | `app/love-secret-ai/LoveSecretAiClient.tsx:999` |
| `/new-year-ai-consultation` | `app/new-year-ai-consultation/page.tsx:106` | `app/new-year-ai-consultation/NewYearAiClient.tsx:1823` |
| `/yeon-star-hug` | `app/yeon-star-hug/page.tsx:19` | `app/yeon-star-hug/YeonStarHugClient.tsx:1961` |
| `/insights` | `app/insights/page.js:161` (`sr-only` 안) | `app/insights/InsightsCosmicClient.js:497` |

- 레포 관례: **페이지 h1 은 `page.tsx`/`ServiceIntroSection` 이 소유, 기능 히어로는 h2.** 선례 커밋 `91c644e5d`.
- ⚠️ `app/insights/page.js:161` 의 `sr-only` h1 은 `app/components/ServiceIntroSection.tsx:4-6` 이 "Hidden text 정책 소지"로 없앤 패턴이다.
- ⚠️ `app/saju-guardian/SajuGuardianClient.tsx:1749,2136,2153,2303` 의 h1 4개가 상호배타인지 **미검증**.
- ⚠️ 회귀 위험: `app/components/SeoLandingTemplate.jsx:224`(18페이지 공유)·`app/components/FeatureLandingPage.tsx:808`(18페이지 공유)가 h1 을 소유한다. 소비 페이지에 h1 을 더하면 즉시 깨진다. 후자의 h1 은 인라인 그라디언트 클립 스타일이라 JSX 만 바꾸면 디자인이 깨진다.

**가드 확장(사용자 승인 완료)**: 라우트별로 (서버 HTML h1) + (그 라우트가 `ssr:false` 로 마운트하는 클라이언트 컴포넌트의 h1)을 **정적 분석으로 합산**해 1개 초과면 실패. 브라우저 불필요. 대상은 사이트맵뿐 아니라 **빌드 산출물 전수**로 넓힌다(현재는 `/pet-saju.html` 처럼 사이트맵 밖이 영구 미검사).

**실행 계획**

| 단계 | 하는 일 | 검증 |
|---|---|---|
| 1 | 가드를 **먼저** 확장한다 — 지금 상태에서 7개 라우트가 실패로 잡히는지 확인 | 실패 목록이 위 표와 일치해야 한다. 다르면 표가 낡은 것이니 표부터 갱신 |
| 2 | 라우트별로 h1 하나를 h2 로 내린다. 관례상 **`page.tsx`/`ServiceIntroSection` 이 h1 을 소유**하고 클라이언트 히어로가 h2 (선례 `91c644e5d`) | 각 수정마다 가드 재실행 |
| 3 | `/points` 는 반대로 판단할 것 — 레이아웃 h1(`layout.tsx:39`)이 하위 전체에 주입되므로 **레이아웃 쪽을 지우고** 클라이언트 h1 을 남기는 게 자연스럽다 | `/points`·`/points/history` 둘 다 1개 |
| 4 | `app/insights/page.js:161` 의 `sr-only` h1 은 Hidden-text 정책 소지라 함께 정리 | — |
| 5 | `app/saju-guardian/SajuGuardianClient.tsx` 의 h1 4개가 상호배타인지 확인(**미검증**) — 아니면 목록에 추가 | 분기 조건을 실제로 열어볼 것 |
| 6 | `npm run build:cf` | `npm run verify:seo-heading-integrity` + 확장 가드 |

🔴 **2단계 전에 반드시**: 대상 라우트가 `SeoLandingTemplate.jsx:224` / `FeatureLandingPage.tsx:808` 을 쓰는지 확인한다. 그 둘은 h1 을 소유한 채 각각 18페이지에 공유되므로, 소비 페이지에 h1 을 더하면 그 18개가 즉시 깨진다. `FeatureLandingPage` 의 h1 은 인라인 그라디언트 클립 스타일이라 JSX 만 바꾸면 디자인도 깨진다.

**완료 판정**: 확장 가드가 산출물 전수에서 0건. 네이버 「H1 2개 이상」은 재크롤까지 2~4주 걸리므로 그걸로 판정하지 않는다.

### C. P1 — description 누락 19건 (레거시 단독 HTML)

`scripts/sync-legacy-static-to-public.mjs` 가 루트→`public/` 로 복사하는 정적 HTML 은 Next metadata 파이프라인을 타지 않아 아무도 `description` 을 채우지 않는다.

```
blood-type-app  celestial-harmony  codedestiny-novel*  destiny-island*
destiny-poker   emoi_omikuji_v2    fortune-teller-fish geomancy-oracle-v4
ifa-oracle-about ifa_oracle_v2_full myungwun_final    neville-meditation
prompt-hub-3004(title 도 없음)     royal-tea-oracle   secret-house_real
tadagochi       vedic-astrology    yoga-guru          static/geomancy-oracle-v4
500                                                   (* = 이미 noindex)
```

색인 대상은 description 을 채우고, 실서비스가 아닌 것은 noindex 로 확정한다 — **둘 중 하나로 전부 분류**하고 미분류를 남기지 않는다. 판정 근거는 `public/_headers` 의 `X-Robots-Tag`(예: `/tadagochi*` 는 이미 noindex).

**실행 계획** — 가장 먼저 하기 좋은 항목이다(위험 낮음, 공유 코드 무관).

| 단계 | 하는 일 | 검증 |
|---|---|---|
| 1 | 19개 각각에 대해 `public/_headers` 의 `X-Robots-Tag` 를 조회해 **색인 대상 / noindex** 두 통으로 나눈다 | 미분류 0건 |
| 2 | 색인 대상: `<meta name="description">` 을 그 페이지 실제 내용으로 작성(템플릿 복붙 금지 — 그러면 "동일 설명문" 을 새로 만든다) | — |
| 3 | noindex 대상: HTML 에 `<meta name="robots" content="noindex, nofollow">` 를 직접 넣는다. `_headers` 만 믿지 않는다 — `/insights/famous-saju/*`·`/fortune/*` 처럼 워커가 가로채는 경로에서는 `_headers` 적용이 **미검증**이다(#708 에서 같은 이유로 `public/fortune/sikojen-povailu/index.html` 에 meta 를 직접 넣었다) | `node scripts/verify-redirects-budget.mjs` 가 이 쌍을 강제한다 |
| 4 | `prompt-hub-3004.html` 은 `<title>` 도 없다 — 함께 채운다 | — |
| 5 | 루트 파일을 고치고 `npm run sync:public` 으로 미러 재생성 | `npm run verify:public-parity` |
| 6 | `npm run build:cf` 후 산출물 전수 스캔 | description 없는 색인가능 페이지 0건 |

**완료 판정**: 산출물에서 `description` 없는 파일이 전부 noindex.

### D. P2 — 판단이 필요한 2건

1. 🔴 **`google-site-verification` 이 프로덕션에 리터럴 플레이스홀더로 나간다** — `content="GOOGLE_SITE_VERIFICATION_CODE_HERE"` (`app/layout.js` + 정적 셸 6개, 라이브 확인). 실제 코드가 있어야 고칠 수 있다. **사용자에게 Search Console 코드를 받을 것.** 값이 리터럴 플레이스홀더라 지금 아무 검증도 하고 있지 않다(= 지워도 인증이 깨지지 않는다).
2. **`components/fortune/SukuyoWheel.tsx:127` 의 SVG `<title>` 27개** — `/sukuyo-compatibility-ai/`(색인 대상)에서 하이드레이션 후 문서 title 이 28개가 된다. 다만 이건 **hover 툴팁**(27수의 한글 독음)이라 없애면 기능이 사라진다. `__tests__/ui/svg-title-not-document-title.static.test.js` 에 인라인 예외로 선언돼 있다. 유지/제거는 사용자 판단.

### E. P1 — 루트 layout 기본 메타 상속 30건

`app/layout.js:52-56` 의 `title.default`·`description` 과 `:91` 의 `alternates.canonical: "/"` 가 하위로 내려간다. **실측 51개 문서가 `canonical=https://code-destiny.com/`** 를 선언한다.

- **(a) `redirect()` 스텁 13개** — `app/{en-us,ja-jp,zh-cn,face-reading,fpti,landing,sukyo}/page.js` 등. `export const metadata` 가 정적 export 에서 **실효 없이 버려진다**(실측). #708 의 `_redirects` 가 엣지에서 잡으므로 도달 불가 — 라우트 삭제는 하지 말 것(절대규칙 6, 원칙 9).
- **(b) `robots` 만 선언한 layout 17개** — `app/astrology-ai/result/layout.tsx:5-11` 등. title·description·canonical 을 채운다. 전부 noindex 라 색인 영향은 없지만 네이버 중복 카운트에 들어간다. 저비용.

**실행 계획**

| 단계 | 하는 일 | 검증 |
|---|---|---|
| 1 | `app/**` 에서 `metadata` 에 `robots` 만 있고 `title`/`description` 이 없는 layout·page 를 **전수 발견**(손으로 목록 만들지 말 것) | 발견 수가 17 근처인지 대조 |
| 2 | 각각에 `buildSeoMetadata`(`lib/seo.ts:34`)를 쓰거나 title·description·`alternates.canonical` 을 직접 채운다 | — |
| 3 | 🔴 `app/layout.js:91` 의 `alternates.canonical: "/"` 자체는 **건드리지 말 것** — 하위가 안 덮는 페이지의 폴백이라, 지우면 canonical 이 아예 없는 페이지가 생긴다. 하위를 채우는 방향으로만 고친다 | 산출물에서 `canonical=https://code-destiny.com/` 인 문서 수가 51 → 1(홈)로 줄어드는지 |
| 4 | (a) 의 redirect 스텁 13개는 **건드리지 않는다** — `_redirects` 가 엣지에서 잡아 도달 불가고, 라우트 삭제는 절대규칙 6·원칙 9 위반이다 | — |

**완료 판정**: 산출물에서 루트 기본 title 을 그대로 쓰는 문서가 홈 1개.

---

## 2-Z. 시도했다가 기각한 접근 (다시 하지 말 것)

- ❌ **`_redirects` 압축만으로 해결** — 압축 최소치가 **240개**인데 상한이 102다. 별칭 정규화를 거의 다 포기해도 fortune 구 `.html` 96개를 담을 수 없다(최소 구조 21 + 96 = 117). 그래서 워커 이관이 유일한 길이었다.
- ❌ **`/fortune/today/*` 같은 넓은 splat 으로 압축** — `_redirects` 는 정적 에셋을 이기므로(실측) 사이트맵에 있는 살아 있는 96개를 통째로 삼킨다.
- ❌ **`/fortune/{period}/:sign` placeholder 로 96줄 압축** — placeholder 는 세그먼트 전체를 잡아 `aries.html` 을 통째로 캡처한다. 목적지에서 확장자를 벗길 수단이 없다.
- ❌ **famous-saju 별칭을 "알 수 없는 slug 는 허브로" 폴백 처리** — 한 줄로 끝나지만 정상 404 까지 삼켜 소프트404 가 된다. 목록을 정본에서 파생하는 쪽이 이 레포 관례(원칙 10)에도 맞다.
- ⚠️ **미검증으로 남은 것**: `X*`(슬래시 없이 붙는 splat)가 `X`·`X/`·`X/...` 를 한 줄로 잡는지. 되면 `_redirects` 압축 여력이 크게 는다. 확인하려면 규칙 하나를 그 형태로 배포한 뒤 `verify:redirects:live` 로 찔러 보면 된다.

---

## 3. 손대지 말 것 (실측으로 정상 확인됨)

- 사이트맵 429개 URL 의 메타·canonical — 결함 0
- `robots.txt` Disallow 21개 — 사이트맵과 충돌 0건
- 호스트 정규화 — `www`→apex 301, `http`→https 301, `index.html`→디렉터리 308 전부 정상
- 로케일 셸 6개의 `<html lang>`·canonical·hreflang 12링크 — 전부 정합
- **famous-saju 상세 134개의 noindex 정책** — `app/insights/famous-saju/[slug]/page.tsx:113` 이 "이름·생년월일만 바뀌는 템플릿"이라 의도적으로 막은 것이다. 색인 전환은 콘텐츠 차별화가 선행돼야 하고 GSC 「크롤링됨–색인되지 않음」 실데이터를 본 뒤 판단할 일이다.

## 4. 아직 설명되지 않은 것

- **H1 53건의 정확한 출처.** 서버 HTML 은 1건뿐이라 렌더링 크롤 기준 집계로 `추정`한다. §2-B 의 7개 라우트는 좌표까지 확정했지만 53 에는 못 미친다. 나머지는 famous-saju 별칭 606개 시절의 템플릿에서 왔을 가능성이 있다(그 템플릿의 h1 이 몇 개였는지는 **미검증** — `git show 9396dc8ce^:app/insights/famous-saju/[slug]/page.tsx` 로 확인 가능).
- **네이버 수치가 언제 갱신되는지.** 606개 사본은 2026-06-04 에 사라졌는데 진단에는 아직 남아 있다. 재크롤 이후 1,900/740 이 얼마나 떨어지는지가 §0 표의 검증이다.

## 5. 효과 측정

머지 전에 네이버 「접근 불가」·「리다이렉션된 페이지」 수를 기록해 둔다.
- #708 → 접근 불가 38 → 0
- #710 → 리다이렉션 −38
- #713 → 별칭 169개가 404/301→404 에서 벗어남
- #714 → `<title>` 2개 이상 2 → 0, alt 누락 11 → 0

색인 개선 판정에는 **2~4주**가 걸린다 — 그 전에 "개선됐다"고 말하지 않는다.

## 6. 작업 환경 주의

이 작업은 `.claude/worktrees/seo-indexing-fixes` 워크트리에서 했다. 기본 디렉터리 `D:/Development/code-destiny` 에는 **다른 세션의 미커밋 변경이 있을 수 있다.**
🔴 셸 작업 디렉터리가 조용히 기본 디렉터리로 돌아가 있는 일이 실제로 있었다(2026-08-16, 편집 5개가 그쪽에 들어갔다가 패치로 회수). **파일을 고치기 전에 `pwd` 로 확인할 것.**
