# 네이버 서치어드바이저 진단 대응 — 인수인계 (2026-08-16)

> 이 문서만 읽고 이어서 작업할 수 있게 쓴다. 수치는 전부 그날의 라이브 실측이고 재현 명령을 함께 남긴다.
> 선행 문서: [seo-indexing-2026-08-15.md](seo-indexing-2026-08-15.md) — 그쪽 §3-A(로케일 한국어 크롬)·§C(lastmod 원장)·§D(IndexNow)·§E(sameAs)·§F(고아 페이지)는 **여전히 미착수**이며 이 문서와 중복되지 않는다.

## 0. 입력 — 네이버가 보고한 것

| 항목 | 수 |
|---|---|
| 색인 | 350 |
| robots.txt 차단 | 4 |
| 리다이렉션된 페이지 | 140 |
| 접근 불가한 페이지 | 38 |
| meta robots 색인 제외 | 740 |
| description 누락 | 13 |
| `<title>` 2개 이상 | 2 |
| 동일 제목 웹문서 | 1,900 |
| 동일 설명문 | 1,900 |
| `<H1>` 2개 이상 | 53 |
| alt 누락 | 11 |

## 1. 가장 중요한 진단 — 사이트맵은 결백하다

**라이브 429개 URL 전수 실측(2026-08-16): 중복 title 0 · 중복 description 0 · h1 정확히 1개 · canonical 불일치 0 · noindex 0 · 전부 200.**

```bash
# 재현 (Yeti UA, 사이트맵 전수)
node scripts/verify-redirects-live.mjs   # ← 5번 항목이 같은 검사를 한다
```

네이버가 지적한 것은 **전부 사이트맵 밖 URL 공간**에 있다. 사이트맵·robots·canonical 을 고치는 작업은 하지 말 것 — 이미 정상이다(선행 문서 §1 의 결론과 동일하며 이번에 재확인했다).

## 2. 완료 (PR 2건)

| PR | 브랜치 | 내용 |
|---|---|---|
| #708 | `fix/seo-redirect-budget` | `_redirects` 상한 사고. 아래 §2-1 |
| #710 | `fix/seo-canonical-link-slash` | RSS·동적 사이트맵 링크 후행 슬래시. 아래 §2-2 |

**머지 순서: #708 → #710.** 파일이 겹치지 않아 순서가 강제되지는 않지만, #708 이 404 38건을 즉시 없애는 최대 효과라 먼저 넣는다.

🔴 **#708 머지 후 반드시** `npm run verify:redirects:live` **를 돌린다.** 개수 가드가 구조적으로 볼 수 없는 것(상한이 규칙 수인지 바이트인지)을 이것만 볼 수 있다.

### 2-1. `_redirects` 규칙 상한 — "접근 불가 38건" 의 정체

🔴 **Cloudflare Pages 는 `public/_redirects` 의 첫 102개 규칙만 적용하고 나머지를 에러도 경고도 없이 무시한다.** 규칙이 303개였으므로 **201개가 죽어 있었다.**

경계는 #102(`/fortune/weekly/capricorn.html`, L144) → #103(`/fortune/weekly/aquarius.html`, L145). **연속된 동일 블록 한가운데서 끊긴다** — 스테일 배포도 파싱 오류도 아니다(중복 `from` 0, 비표준 코드 0).

- `/fortune/{weekly,monthly}/*.html` 38개 → 404 = **네이버 "접근 불가 38"**
- `/blog/*` 55개, insights 통합 104개 → 404
- `/en-us/` `/ja-jp/` `/zh-cn/` → 리다이렉트 대신 200 중복 페이지

조치: `_redirects` 303 → 89개, `/fortune/**` 108개는 `public/_worker.js` 로 이관(`_routes.json` 에 `/fortune/*`), 새 가드 `verify:redirects-budget`(빌드 배선) + `verify:redirects:live`(수동).

**같이 알아낸 엣지 동작 3가지(전부 실측, 앞으로 이걸 전제로 설계할 것)**
1. `_redirects` 규칙은 **정적 에셋을 이긴다.** `/sukyo/`·`/fortune/today/aries.html` 은 산출물에 파일이 있는데도 301 이 나갔다. → 넓은 splat 은 사이트맵 라우트를 통째로 삼킨다.
2. `X/*` 는 `X/`(빈 splat)를 매칭하지만 `X` 는 매칭하지 않는다. → 별칭은 `X` + `X/*` 두 줄이 한 쌍.
3. `.html`·`index.html`·`www`·`http` 정규화는 Pages 가 이미 308/301 로 처리한다. 규칙을 둘 필요가 없다.

**미확정**: 상한의 근거가 규칙 수(100)인지 바이트(#102 까지 9,477B)인지. `verify:redirects:live` 로만 확인 가능.

### 2-2. RSS 링크 38개가 전부 308

`trailingSlash: true` 인데 `scripts/generate-rss.mjs` 가 `/insights/<slug>`(무슬래시)로 링크를 만들었다. 네이버에 제출하는 피드의 `<link>` 38개가 전부 리다이렉트였고 사이트맵 `<loc>` 과 하나도 일치하지 않았다. `worker/routes/content.js` 의 동적 피드(=`public/_worker.js` 가 정적 rss.xml 에 병합)와 동적 사이트맵 `<loc>` 도 같이 고쳤다.

---

## 3. 남은 작업

### A. 🔴 P0 — 내부 링크 후행 슬래시 (리다이렉션 140건의 나머지)

**증상:** `next.config.mjs:184` `trailingSlash: true` 인데 셸 내부 링크가 무슬래시다.
실측: `public/index.html` 의 `href="/..."` 204개 중 **무슬래시 160개(고유 94경로)** / 슬래시 6개. `SiteFooterHub` 48/2. `data-fallback-href` 21개 중 11개, `data-service-detail-href` **18개 전부** 무슬래시.
→ 크롤러가 발견하는 거의 모든 URL 이 2회 요청이 된다.

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
`href="/insights"` → `"/insights/"` 가 되면 `basePath` 가 `/insights/` 라 **모든 조건이 조용히 false** 가 되고 ja/zh/en 사용자가 한국어 페이지로 간다. **에러도 테스트도 없다 — 사용자 제보로만 발견된다.** 이 함수의 슬래시 정규화가 **반드시 같은 PR** 에 포함돼야 한다.

**그 외 제약**
- `data-fallback-href`·`data-service-detail-href` 도 함께 고칠 것 — `js/mobile-interaction-patch.js:1362,1595` 가 실제 내비게이션 값(`window.location.href = href`)으로 쓴다.
- 🔴 미러 6개(`public/index.html`, `public/{en,ja,zh,zh-tw,static}/index.html`)는 **직접 패치 금지** — `npm run sync:public` 산출물이므로 같은 커밋에 담는다.
- 제외 대상: 확장자 있는 경로, `#`·`?` 시작, 외부 URL, `javascript:`.
- 🔴 `index.html` 은 결제창 정본이다 → `config/payment-freeze.json` 등재 여부를 확인하고 필요하면 `node scripts/verify-payment-freeze.mjs --update` 를 **같은 커밋**에 담는다.
- GA4 영향: `js/core/analytics.js:132` 의 `cross_sell_click.to_service` 값이 `/ziwei`→`/ziwei/` 로 바뀌어 대시보드 세그먼트가 끊긴다. GA4 설치가 2026-08-14 라 지금이 가장 싼 시점.
- 모바일 앱 빌드: `scripts/build-mobile-app.mjs:359` 의 `HREF_RE` 가 `/x/` 도 캡처하고 `:257` 이 `replace(/\/+$/,"")` 로 벗기므로 결과 동일(실측). 그래도 `npm run build:mobile:app` 로 확인.
- 🔴 `index.html` 편집은 한글을 `\uXXXX` 로 이스케이프시킨 사례가 있다. 커밋 전 diff 확인.

**새 가드 권장**: `verify:internal-link-trailing-slash` — 대상 파일을 소스에서 전수 발견, 예외는 인라인 마커로만 선언(배열 열거 금지), 대상 0개면 실패. `scripts/build-cf-main.mjs` steps 에 `["run","<name>"]` 로 배선하면 워크플로를 안 건드린다.

### B. P1 — H1 중복 53건은 **하이드레이션 이후** DOM 에서 생긴다

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

### C. P1 — `<title>` 2개 이상 = SVG `<title>`

`/nakshatra/` 는 `<title>` 이 3개다. Next metadata 1개 + `<svg role="img">` 안의 2개.
- `app/nakshatra/NakshatraSymbols.tsx:45,59`
- `components/fortune/SukuyoWheel.tsx:127` — 27개(클라이언트 렌더). 네이버 2건 중 나머지 1건으로 `추정`
- `components/ui/MoonIcon.tsx:38` — `/points`(noindex)

🔴 그냥 지우면 접근성이 깨진다. `role="img"` 그래픽의 접근명이므로 **`<title>` → `aria-label`** 로 옮긴다.

### D. P1 — alt 누락 11건

주석·`<script>` 를 제거하고 재측정한 실측 좌표만 고칠 것. **홈 셸 5개는 오탐**(실 누락 0, `alt=""` 20개는 장식용 선언).

- `tadagochi.html` 7건 (+ `public/tadagochi.html` 미러) — `#t-egg`, `#te-{moon,strawberry,cherry,star,angel}`, `#h-egg`
- `app/admin/feedback/page.tsx:83`
- `HwatuFortune.js`(10)·`PhysiognomyUI.js`(1) — **참조처를 못 찾았다**(`추정`: 죽은 코드). 삭제 전 `deletion-auditor` 3면 grep 필수.
- ⚠️ 구조적 결함(별건): `app/insights/_lib/sanitizePublicHtml.js:114` 외 3곳(`worker/routes/insights.js:140`, `app/admin/insights/_lib/sanitizeContent.ts:128`, `worker/routes/admin.js:2185`)이 원본 alt 없으면 `alt=""` 로 대체한다 → 인사이트 기사 116편의 본문 이미지가 전부 "장식용"으로 발행된다. 검사기는 통과하지만 SEO 가치는 0.

### E. P1 — description 누락 19건 (레거시 단독 HTML)

`scripts/sync-legacy-static-to-public.mjs` 가 루트→`public/` 로 복사하는 정적 HTML 은 Next metadata 파이프라인을 타지 않아 아무도 `description` 을 채우지 않는다.

```
blood-type-app  celestial-harmony  codedestiny-novel*  destiny-island*
destiny-poker   emoi_omikuji_v2    fortune-teller-fish geomancy-oracle-v4
ifa-oracle-about myungwun_final    neville-meditation  royal-tea-oracle
secret-house_real tadagochi        vedic-astrology     yoga-guru
static/geomancy-oracle-v4   fortune/sikojen-povailu   500        (* = 이미 noindex)
```
(19 − noindex 2 − `/500/` 1 − `/static/` 중복 1 ≈ 15 ≈ 네이버 13)

색인 대상은 description 을 채우고, 실서비스가 아닌 것은 noindex 로 확정한다 — **둘 중 하나로 전부 분류**하고 미분류를 남기지 않는다. `/500/` 은 `<title>` 도 0개. `/static/geomancy-oracle-v4.html` 은 `/geomancy-oracle-v4.html` 과 title 까지 같은 미러다.

> ⚠️ `public/fortune/sikojen-povailu/index.html` 은 PR #708 에서 이미 `robots noindex` 를 받았다(워커 경유 경로라 `_headers` 만으로는 불충분).

### F. P1 — 루트 layout 기본 메타 상속 30건

`app/layout.js:52-56` 의 `title.default`·`description` 과 `:91` 의 `alternates.canonical: "/"` 가 하위로 내려간다. **실측 51개 문서가 `canonical=https://code-destiny.com/`** 를 선언한다. `app/layout.js:202-207` 은 같은 뿌리의 hreflang 하드코딩을 이미 제거했는데 canonical 은 남아 있다.

- **(a) `redirect()` 스텁 13개** — `app/{en-us,ja-jp,zh-cn,face-reading,fpti,landing,sukyo}/page.js`, `app/saju/{lifebook,love-bible,animal-test}/page.js`, `app/pdf/life-book`, `app/premium/{saju-lifebook,saju-love-bible}`. `export const metadata` 가 정적 export 에서 **실효 없이 버려진다**(실측). PR #708 의 `_redirects` 가 엣지에서 잡으므로 도달 불가 — 라우트 삭제는 하지 말 것(절대규칙 6, 원칙 9).
- **(b) `robots` 만 선언한 layout 17개** — `app/astrology-ai/result/layout.tsx:5-11`, `app/nakshatra/calc/layout.tsx:5-8` 등. title·description·canonical 을 채운다. 전부 noindex 라 색인 영향은 없지만 네이버 중복 카운트에 들어간다. 저비용.

### G. P2 — 나머지

- `<meta name="google-site-verification" content="GOOGLE_SITE_VERIFICATION_CODE_HERE">` — **플레이스홀더가 프로덕션에 나가고 있다.**
- `/contact-us/`·`/privacy-policy/`·`/terms-of-service/` 는 색인 가능한데 canonical 이 `/contact/`·`/privacy/`·`/terms/` 를 가리킨다. 의도된 alias 인지 확인하고 아니면 `_redirects` 로 통합(예산 89/95, 여유 6).
- `worker/routes/insights.js:357` `buildShareUrl` 이 무슬래시 → 공유 링크마다 308.

## 4. 손대지 말 것 (실측으로 정상 확인됨)

- 사이트맵 429개 URL 의 메타·canonical — 결함 0
- `robots.txt` Disallow 21개 — 사이트맵과 충돌 0건
- 호스트 정규화 — `www`→apex 301, `http`→https 301, `index.html`→디렉터리 308 전부 정상
- 로케일 셸 6개의 `<html lang>`·canonical·hreflang 12링크 — 전부 정합

## 5. 아직 설명되지 않은 것

- **네이버 "동일 제목/설명문 1,900"**. 라이브 실측 코어는 41건뿐이다(홈 메타 상속 25 + admin 14 + 2). 구조적 후보 3군은 ① 루트 layout 기본 메타 상속 30 ② **셸 사본 19 + 미러 6 = 25개 URL 이 본문 바이트 동일**(`scripts/promote-static-shell-to-root.mjs:185-188` 이 `<title>`·`description`·`canonical` 세 줄만 정규식 치환한다 — 주석 `:188` 도 자인) ③ famous-saju 템플릿 134. 여기에 슬래시/`.html` URL 변형 배수가 곱해진 것으로 `추정`. **확정하려면 서치어드바이저의 "동일 제목" 목록에서 실제 URL 10개를 뽑아 대조해야 한다.**
- **"meta robots 색인 제외 740"**. 레포가 만드는 noindex 는 284개(meta 259 + `_headers` X-Robots-Tag 64, 합집합). 차이는 슬래시 변형·삭제된 구 라우트의 잔존으로 `추정`.
- **H1 53건의 정확한 출처**. 서버 HTML 은 1건뿐이라 렌더링 크롤 기준 집계로 `추정`한다(§3-B 의 7개 라우트는 좌표까지 확정).

## 6. 효과 측정

머지 전에 네이버 「접근 불가」·「리다이렉션된 페이지」 수를 기록해 둔다. #708 은 접근 불가 38 → 0 을, #710 은 리다이렉션 −38 을 노린다. 색인 개선 판정에는 **2~4주**가 걸린다 — 그 전에 "개선됐다"고 말하지 않는다.
