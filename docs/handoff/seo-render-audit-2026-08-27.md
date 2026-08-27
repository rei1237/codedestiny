# 렌더 실측 SEO 감사 — 인수인계 (2026-08-27)

> **이 문서만 읽고 이어서 작업할 수 있게 쓴다.** 모든 수치는 그날의 실측이고 재현 명령을 함께 남긴다.
> 브랜치: `worktree-seo-render-audit` · 기준 커밋 `2ffd4716b`
>
> 🔴 **2차 세션(2026-08-27, PR #1186)이 §5-1 · §5-3 · §5-6 의 제목 축을 처리했다 — §10 을 먼저 읽을 것.**
> §5-6 의 길이 측정축이 틀렸다는 것도 거기서 나온다(글자 수 → 표시 폭).

---

## 0. 한 줄 요약

소스 계층에서는 P0 급 결함이 안 나왔다. **렌더된 HTML 을 전수로 재는 도구가 없어서 안 보이던 층**이
하나 있었고, 거기서 **55개 페이지가 자기 URL 대신 홈을 canonical 로 내보내고 있었다.**
도구(`seo-audit.mjs --source=out`)를 만들고, 나온 것을 고치고, 재발 가드를 붙였다.
`dist/` 기준 이슈 **293 → 1**.

---

## 1. 왜 이 층이 안 보였나

`scripts/seo-audit.mjs` 는 **HTTP fetch 전용**이었다. 로컬 서버나 프로덕션에 요청을 쏘는 구조라
빌드 산출물을 못 읽고, 어느 워크플로에도 배선돼 있지 않다. 그래서 다음 다섯 가지는 아무도 재고
있지 않았다.

1. `app/layout.js` 의 metadata 가 자식 페이지로 **상속**되면서 생기는 canonical·hreflang
2. `<meta robots>` 와 `_headers` 의 `X-Robots-Tag` 가 **어긋나는** 라우트
3. hreflang **상호참조**(A→B 는 있는데 B→A 가 없는 경우)
4. BreadcrumbList item URL 이 실제로 존재하는지
5. **진짜 링크 그래프** — 소스 grep 은 템플릿 문자열(`/fortune/${period}/${sign}`) 때문에
   고아 판정 위양성이 148건 났다

## 2. 만든 것 — `node scripts/seo-audit.mjs --source=out`

기존 파서(`getTitle`/`getCanonical`/`getHreflang`/`getJsonLd`/`getH1s`/`getInternalLinks`/
`hasNoindex`)를 그대로 재사용하고 `fetchText()` 에 파일 읽기 분기만 붙였다. **새 스크립트도,
새 `verify:*` npm 스크립트도 만들지 않았다** — 후자는 `verify-guard-wiring` 이 배선을 요구하고
CI 게이트 추가는 사용자 승인 사항이기 때문이다(`docs/CURRENT_DEV_BASELINE.md` §6).

```bash
npm run build:cf
SEO_AUDIT_OUT_DIR=dist node scripts/seo-audit.mjs --source=out --crawl-sitemap
# 리포트: seo-audit-report-out.json / .md (.gitignore 등재, 커밋하지 않는다)
```

🔴 **반드시 `SEO_AUDIT_OUT_DIR=dist` 로 돌릴 것.** 기본값 `out/` 은 Next export 원본이라
배포 정본이 아니다. 이번에도 `out/index.html` 에는 hreflang 이 0개인데 `dist/index.html` 에는
12개였다(정적 셸 승격 + `locale-prerender` 가 dist 에만 적용된다). **out 만 보고 "홈에 hreflang
이 없다" 고 판정할 뻔했다** — [dist-is-the-deploy-artifact-not-public] 사고의 재현이다.

### 새로 넣은 판정 7종

| # | 판정 | 근거 |
|---|---|---|
| 1 | 사이트맵 URL 은 canonical 이 자기 자신 | Google Canonicalization ("self-referential canonical") |
| 2 | 사이트맵 밖 페이지의 cross-canonical 목적지가 실재·색인 대상인지 (자기가 noindex 면 건너뜀) | 〃 |
| 3 | 사이트맵 URL 에 meta/헤더 noindex 가 붙지 않았는지 | GSC "제출된 URL에 noindex" |
| 4 | hreflang 상호참조 + x-default 정확히 1개. **역방향은 HTML 태그 또는 사이트맵 alternate 중 하나면 성립** | Localized versions — 세 방법은 동등하고, 역방향이 없으면 "may be ignored or not interpreted correctly" |
| 5 | JSON-LD 파싱·`@type`·BreadcrumbList item 실재 | Structured data general guidelines |
| 6 | `dist/**/*.html` 전량의 `<a href>` 로 센 인바운드 0인 사이트맵 URL | — |
| 7 | 사이트맵에 없고 noindex 신호도 없고 다른 URL 로 위임하지도 않는 페이지 | 색인 정책 사각지대 |

---

## 3. 실측 — 무엇이 나왔나

### 3-1. 🔴 P1 — 55개 페이지가 홈을 canonical 로 가리키고 있었다

`app/layout.js` 가 `alternates: { canonical: "/", languages: {...11개} }` 를 들고 있었다.
Next 는 **자식이 `alternates` 를 선언하지 않으면 이 객체를 통째로 상속**시킨다. 그래서 평범한
`export const metadata = {...}` 만 쓰는 페이지들이 자기 URL 대신 홈을 canonical 로,
그리고 홈의 hreflang 11줄을 그대로 내보냈다.

- 실측 56건(= 상속 55 + 정당한 `/static` 1). 그중 **4건은 `index, follow`** 였다
  (`/flower/{astrology,destiny,jamidusu,sukuyo}`).
- `generatePageMetadata()`·`createI18nMetadata()` 를 쓰는 페이지는 자기 `alternates` 를
  선언하므로 애초에 상속되지 않았다. **즉 이 값은 의도한 대상(홈)에는 안 닿고**
  — 홈 `/` 은 정적 셸 승격본이라 레이아웃 메타데이터가 덮인다 —
  **의도하지 않은 55곳에만 닿고 있었다.**
- 🔴 **가드가 이걸 통과시키는 쪽으로 작동했다.** `verifyIndexableRouteCoverage` 는
  "색인 대상이면 사이트맵에 있거나 / 사이트맵에 있는 URL 로 canonical 하거나 / X-Robots noindex"
  를 요구하는데, **홈은 당연히 사이트맵에 있다.** 그래서 상속된 canonical 이 `/flower/*` 4개를
  가드에서 빠져나가게 해 줬다.

### 3-2. P2 — `/static/geomancy-oracle-v4` 가 색인에 열려 있었다

루트 사본 `/geomancy-oracle-v4` 는 `_headers` 가 noindex 로 막는데, `public/static/` 아래의
**두 번째 사본**은 Cloudflare 규칙이 경로 선두에 앵커되므로 안 걸렸다. canonical·robots meta 도
하나도 없었다.

### 3-3. P2 — 정적 셸 사본 3개가 홈의 hreflang 을 들고 나갔다

`/oracle/juyuk` · `/oracle/hwatu` · `/static` 은 루트 셸의 `<head>` 만 갈아 끼운 사본이라
홈의 alternate 12줄을 그대로 갖고 있었다 — 즉 "이 사본이 이 사이트의 한국어판이자 x-default" 라고
주장하는 상태. 세 라우트 모두 noindex 라 실제 처리는 안 되지만 신호를 남길 이유가 없다.

### 3-4. P2 — `/destiny-poker` 는 색인 대상 중 유일하게 홀로 떠 있었다

- 인바운드 내부 링크 **0** (사이트맵 388개 중 유일)
- `og:*` **0개**, JSON-LD **0개** (나머지 387개는 전부 갖고 있다)

### 3-5. 프로덕션 실측 — HTML 에 ETag/Last-Modified 가 없다 (미해결)

```
GET https://code-destiny.com/saju/  (UA: Googlebot/2.1)
→ 200 · cache-control: no-cache · cf-cache-status: DYNAMIC · etag 없음 · last-modified 없음
```
14개 URL 전수 200, `x-robots-tag` 헤더 없음(의도대로 — noindex 는 meta 로 건다).

🔴 **`docs/handoff/seo-indexing-2026-08-15.md` §2 가 "배포 전에는 확인 불가" 로 남겨 둔 2건에
대한 답이다.** PR #673 의 `no-store → no-cache` 는 **적용돼 있다**(cache-control 이 no-cache).
그런데 **ETag 는 발급되지 않는다.** 원인은 대시보드 Cache Rules 가 아니라
`cf-cache-status: DYNAMIC` — HTML 이 Pages 정적 자산 핸들러가 아니라 **Worker 를 타고 나간다.**
Worker 응답에는 ETag 가 없으므로 304 재검증이 불가능하고, 크롤러는 재방문마다 전문을 다시 받는다
(median 93KB, `/insights` 는 1.8MB).

### 3-6. 그 밖에 잰 것 (색인 대상 388개, dist 기준)

| 항목 | 값 |
|---|---|
| 중복 title / 중복 description | **0 / 0** |
| H1 개수가 1이 아닌 페이지 | **0** |
| canonical 자기참조 | **388 / 388** |
| JSON-LD 보유 / 파싱 실패 | 387 → **388 / 0** (`/destiny-poker` 추가 후) |
| title 길이 | 최소 11 · 중앙 35 · 최대 91 (60자 초과 5개) |
| description 길이 | 최소 50 · 중앙 96 · 최대 170 (160자 초과 4개, 70자 미만 79개) |
| 서버 렌더 본문 길이 | 최소 1,677 · 중앙 4,608 · 최대 51,302자 |
| 페이지당 아웃바운드 내부 링크 | 최소 0 · 중앙 81 · 최대 210 |
| **아웃바운드 링크가 0인 색인 대상** | **18개** (§5-2) |
| alt 없는 `<img>` | **0** (기존 신고 10건은 전부 위양성 — §4 표 8번) |

---

## 4. 고친 것

| # | 파일 | 무엇을 |
|---|---|---|
| 1 | `app/layout.js` | 루트 `alternates`(canonical + languages) 제거. 홈은 정적 셸이 담당하고, 나머지는 각 페이지가 선언한다 |
| 2 | `app/flower/{astrology,destiny,jamidusu,sukuyo}/page.tsx` | `robots: { index: false, follow: true }` 선언. 파일 주석이 "원래 noindex 였다"고 적어 둔 그대로 복구 |
| 3 | `app/fortune-planner/page.tsx` · `app/luck-sync-diary/page.tsx` | `noindex` 와 **홈을 가리키는 canonical** 을 함께 두던 것을 canonical 쪽만 제거 |
| 4 | `_headers` (+ `public/_headers` 미러) | `/static/geomancy-oracle-v4*` X-Robots noindex 1줄 추가 (규칙 81→82, 상한 100) |
| 5 | `scripts/verify-adsense-readiness.mjs` | ① 위 패턴을 강제 목록에 등재 ② **`verifyNoInheritedHomeCanonical` 신규** — 산출물 전수 발견, 홈 canonical 허용 목록(`/`·`/static`) 외는 실패 |
| 6 | `scripts/lib/static-shell-route-meta.mjs` · `scripts/promote-static-shell-to-root.mjs` | 셸 사본에서 hreflang alternate 제거 (`withoutHreflangLinks`) |
| 7 | `app/tarot/prompt-maker/layout.tsx` · `app/yeon-star-hug/layout.tsx` · `destiny-poker.html` | og:image 채움 + `/destiny-poker` 에 og/twitter·WebPage JSON-LD 추가 (기존 title·description·canonical 재사용, 새 문구 0) |
| 8 | `scripts/seo-audit.mjs` | `--source=out` + 판정 7종 + 위양성 2종 제거(`.html` 라우트 별칭 · 주석/스크립트 속 `<img>` 문자열) |
| 9 | `.gitignore` | `seo-audit-report-out.{json,md}` |

### 3번을 그렇게 고른 이유

Google "Consolidate duplicate URLs" 는 canonical 선택을 위해 noindex 를 쓰는 것을 권하지 않는다
("it will completely block the page from Search"). 두 신호가 모순이면 어느 쪽이 이길지 보장되지
않고, 최악의 경우 noindex 가 canonical 목적지 — 여기서는 **홈** — 로 옮겨붙을 수 있다.
두 스텁은 페이지 메타데이터라 제거 비용이 0이었다.

🔴 **같은 조합이 `dist/static/index.html` 에는 그대로 남아 있다**(§5-1). 거긴 셸 승격 파이프라인이
만드는 것이고, `out/` 쪽 사본은 noindex 가 아니라서 어느 동작을 정본으로 삼을지 결정이 먼저다.

---

## 5. 안 고친 것 — 사유와 다음 행동

### 5-1. `dist/static/index.html` 의 noindex + 홈 canonical 병존 (P2)

`promote-static-shell-to-root.mjs` 의 `withNoindexRobots` 주석이 이미 인정하고 있다 —
"`/static/` 는 `/` 와 바이트까지 동일한 사본이고, `/about` 이 `/static/#…` 앵커 4개로 링크해
발견 가능하다. 지금은 cross-canonical 하나만 그걸 막고 있다." 여기에 noindex 가 더해진 상태다.
**의도된 이중 방어이지 사고가 아니다.** 다만 §4 「3번을 그렇게 고른 이유」와 같은 이유로 이론적 위험이 있으므로,
canonical 만 남길지 noindex 만 남길지는 별도 결정이 필요하다. 건드리면 셸 승격 파이프라인과
`out`/`dist` 두 사본의 동작이 갈리므로 이 PR 범위 밖으로 둔다.

### 5-2. 아웃바운드 내부 링크가 0인 색인 대상 18개 (P2)

```
/sukuyo-compatibility-ai /life-book-ai /love-secret-ai /master-love-codex /naming-ai
/neo-operation-room /new-year-ai-consultation /oracle/rune /reviews /saju-guardian
/saju/destiny-bias /saju/destiny-meeting-place /saju/love-simulation /tarot/prompt-maker
/vedic-ai /yeon-star-hug /ziwei-ai /ziwei/chart
```
`docs/CURRENT_DEV_BASELINE.md` "Working Rules" 4번이 **몰입형 React 운세 라우트는 공유 헤더·
푸터·하단 네비를 렌더하지 않는다**고 정하고 있어서 생긴 구조다. 즉 의도된 UI 결정의 부작용이고,
고치려면 "몰입형 화면에도 최소한의 관련 링크 블록을 둘 것인가" 를 먼저 정해야 한다.
링크 신호를 받기만 하고 내보내지 않는 페이지가 색인 대상의 4.6% 다.

### 5-3. `/destiny-poker` 인바운드 0 (P2)

og·JSON-LD 는 채웠지만 **내부 링크는 여전히 0** 이다. 걸 만한 자리(셸 홈 컬렉션 그리드 등)를
고르는 것은 IA 결정이고, 셸을 고치면 `sync:public` 캐시키가 돌아 미러 13개가 함께 움직인다.
다음 세션에서 "무료 기능 허브에 어디까지 노출할 것인가" 와 함께 결정할 것.

### 5-4. `dist/insights/index.html` 1.83 MB (P1 — 성능/크롤 예산)

`app/insights/page.js` 의 `toClientInsightItem()` 이 **126개 아티클의 `body` 전문**을 클라이언트
컴포넌트로 넘긴다. RSC flight 페이로드가 HTML 에 그대로 실려 1.8MB 가 된다.
`InsightsCosmicClient.js:199` 가 `stripHtml(item.body)` 로 **전문 검색**을 하기 때문에 단순히
빼면 기능이 죽는다. 사전 계산한 검색 인덱스(제목+요약+태그, 또는 축약 토큰)로 바꾸는 리팩터링이
필요하다 — 별도 세션.

### 5-5. HTML ETag 부재 (P1 — 크롤 예산)

§3-5. 고치려면 Worker 응답에 ETag/`If-None-Match` 처리를 넣거나 HTML 을 Pages 정적 자산 경로로
되돌려야 한다. 배포 파이프라인에 닿는 변경이라 이 PR 범위 밖.

### 5-6. 문구 다듬기 (P3)

title 60자 초과 5개(`/en` 91자 포함), description 160자 초과 4개·70자 미만 79개.
전부 잘림/정보량 문제이고 색인에는 영향이 없다. 문구를 고치면 `/en` 은 로케일 4개가 함께 움직인다.

### 5-7. 이번 감사가 **재지 않은** 것

Core Web Vitals(LCP/INP/CLS) 실측, 모바일 UX, 콘텐츠 품질·검색 의도 적합성, AI Overviews 노출,
네이버 서치어드바이저 상태, 전환율. 전부 이번 세션 범위 밖이며 아래 점수표에 **미채점**으로 둔다.

---

## 6. 점수표

🔴 **잰 것만 점수를 준다.** 안 잰 항목에 숫자를 만들지 않았다.

| 영역 | 점수 | 근거 (전부 2026-08-27 실측) |
|---|---:|---|
| Crawlability | 88/100 | sitemap 388 URL 무결성 OK · robots 정본 2곳 동기화 · AI 크롤러 정책 명시. 감점: HTML 에 ETag/Last-Modified 없음 → 304 불가 |
| Indexability | 96/100 | canonical 자기참조 388/388 · noindex 5곳 동기화 · 상속 canonical 55건 제거 · 사각지대 0. 감점: `/static` 의 noindex+canonical 병존 |
| Technical SEO | 92/100 | 판정 7종 통과, 잔여 이슈 **1건**(`/destiny-poker` 인바운드 0 — IA 결정 필요) |
| On-page SEO | 93/100 | 중복 title/desc 0 · H1=1 이 388/388. 감점: desc 79개 70자 미만, title 5개 60자 초과 |
| Information Architecture | 78/100 | 서비스 도메인 계층은 명확. 감점: 색인 대상 18개가 링크를 내보내지 않는 막다른 길 |
| Internal Linking | 80/100 | 아웃바운드 중앙값 81. 감점: 인바운드 0 URL 1개 + 아웃바운드 0 페이지 18개 |
| Structured Data | 97/100 | JSON-LD 388/388 · 파싱 실패 0 · `@type` 누락 0 · BreadcrumbList item 결손 0 |
| Multilingual SEO | 90/100 | hreflang 상호참조 위반 0 · x-default 페이지당 1개 · 사이트맵 alternate 600개 전부 실재. 감점: 로케일 URL 41/388(저작 범위가 4개 로케일로 확정돼 있어 구조 결함은 아님) |
| Image SEO | 90/100 | alt 누락 0(위양성 제거 후) · og:image 388/388(조치 후). 감점: 이미지 sitemap 없음, 리사이즈 경로가 `/cdn-cgi/image/` 하나뿐 |
| Performance (부분) | 60/100 | dist HTML 크기만 실측 — 중앙 93KB인데 `/insights` 1.83MB, `/static` 1.46MB. **CWV 는 미측정** |
| Content Quality | 미채점 | 본문 분량만 실측(중앙 4,608자). 품질·독창성은 이번 범위 밖 |
| Search Intent | 미채점 | SERP 대조를 하지 않았다 |
| Mobile SEO | 미채점 | 이번 세션에서 재지 않았다 |
| AI Search Readiness | 미채점 | robots 가 GPTBot·ClaudeBot·PerplexityBot 등을 허용하고 있다는 것만 확인 |
| Conversion SEO | 미채점 | `docs/handoff/seo-content-expansion-roadmap.md` §2 의 CTA 공백 9곳이 미조사로 남아 있다 |
| Naver SEO | 미채점 | 서치어드바이저 상태를 보지 않았다 |

**종합(잰 10개 항목 평균): 86.4 / 100**

---

## 7. 검증 — 실행한 명령과 결과

```
npm run lint                      → exit 0 (경고만, 기존 경고)
npm run typecheck                 → exit 0 (tsc --noEmit, 출력 없음)
npm run test:node                 → tests 551 / pass 551 / fail 0
npm run verify:sitemap            → local sitemap OK (388 URLs)
npm run verify:sitemap-drift      → OK — 추적본이 재생성 결과와 일치 (URL 388개)
npm run verify:www-canonical      → PASS
npm run verify:staging-noindex    → OK
npm run verify:seo-entity-registry→ PASS profiles=57 fusion=published
npm run build:cf                  → [adsense-readiness] OK   (신규 가드 포함)
SEO_AUDIT_OUT_DIR=dist node scripts/seo-audit.mjs --source=out --crawl-sitemap
                                  → Issues 293 → **1** (남은 1건은 /destiny-poker 인바운드 0, §5-3)
npm run verify:seo-heading-integrity → OK — 색인 라우트 388개 전부 H1 이 정확히 1개
npm run verify:indexable-prose-depth → OK — dist/ 색인 388개 전부 문장급 본문 900단위 이상
```

🔴 신규 가드가 실제로 잡는지 확인했다: 1차 수정 후 빌드가
`out/fortune-planner: canonical 이 홈(...)을 가리킨다` 로 **실패**했고, 그 2건을 고친 뒤 통과했다.
검사 대상이 없어서 통과한 것이 아니라 **잡을 것을 잡고 통과**했다.

---

## 8. 다음 단계

**단기 (다음 세션 후보 순서)**
1. `/destiny-poker` 인바운드 링크 1개 확보 (§5-3) — IA 결정 필요, 셸 미러 동반
2. `dist/static/index.html` 의 noindex vs canonical 정본 결정 (§5-1)
3. title/description 길이 정리 (§5-6) — `/en` 은 로케일 4개 동반

**중기**
4. `/insights` 1.83MB 페이로드 축소 (§5-4) — 검색 인덱스 분리 설계 선행
5. 몰입형 라우트 18개의 링크 정책 결정 (§5-2)
6. HTML ETag/304 (§5-5) — Worker 응답 헤더, 배포 파이프라인 결정

**장기 (이번 감사 범위 밖, 기존 문서에 이미 있음)**
7. `docs/handoff/seo-content-expansion-roadmap.md` §I 의 **P1 미착수분**:
   `/insights/sukuyo-ankai` 본문 보강 · `/tarot/guide` ↔ 무료 타로 ↔ AI 타로 내부링크 ·
   "무료 점성술" 검색 의도 랜딩 존재 여부 재검토
8. 무료→유료 CTA 공백 9곳 (같은 문서 §2 — 페이지별 사전 조사가 선행돼야 한다)

---

## 9. 이어받을 때 주의할 것

- 🔴 **감사는 `dist` 로 돌린다.** `out` 은 배포 정본이 아니다(§2).
- 🔴 **`npm run build:cf` 는 추적 파일을 다시 쓴다.** `rss.xml`(루트·`public/`·`insights/`·
  `public/insights/`) 4개가 매번 `lastBuildDate` 와 최신 아티클로 갱신된다. 이번 PR 에서는
  범위 밖이라 `git checkout` 으로 되돌렸다. **커밋할지 되돌릴지 매번 판단할 것** —
  `sync:public` 산출물(`public/_headers` 등)은 반대로 **반드시 커밋**한다.
- 🔴 `.ignore` 가 내용 변화 없이 `M` 으로 뜨면 CRLF 정규화다. `git checkout -- .ignore` 로 되돌린다.
- 워크트리에는 `node_modules` 심링크가 안 생긴다. 빌드 전에
  `cmd /c mklink /J "<워크트리>\node_modules" "<저장소 루트>\node_modules"` (지울 때는 링크부터 끊는다).

---

## 10. 2차 세션 — PR #1186 (2026-08-27)

브랜치 `fix/seo-render-audit-followups` · 기준 커밋 `50beb2a72`(= #1184 머지본).

### 10-1. 🔴 §5-6 의 측정축이 틀렸다 — 글자 수가 아니라 표시 폭

Google 은 데스크톱 검색결과의 제목을 **픽셀 폭**(약 600px)으로 자른다. 한중일 글자는 라틴의 약
2배 폭이라 한국어 사이트에서 60**자**는 폭으로 120 — 한계의 두 배다. 축을 바꿔 다시 재니:

| 측정축 | 제목 한계 초과 (색인 388개) |
|---|---:|
| 글자 수 (§5-6 이 쓴 축) | 5 |
| 표시 폭 (정정) | **125** — 중앙 51 · 최대 111 |

재현:

```bash
node -e "const r=require('./seo-audit-report-out.json');\
const W=/[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/;\
const w=s=>[...String(s)].reduce((n,c)=>n+(W.test(c)?2:1),0);\
const i=r.routes.filter(x=>x.shouldBeIndexed!==false&&x.title);\
console.log(i.filter(x=>w(x.title)>60).length)"
```

🔴 **함정: 폭 계산 정규식의 한자 범위를 빠뜨리기 쉽다.** 이 세션에서 `⺀-䶿`(U+2E80–U+4DBF)로
쓴 판이 한 번 있었는데, CJK 통합 한자(U+4E00–)가 빠져 `/ja` 가 61 → 48 로 잘못 나왔다.
정본 범위는 `scripts/verify-adsense-readiness.mjs` 의 `EAST_ASIAN_WIDE` 다.

### 10-2. 고친 것

| # | 파일 | 무엇을 |
|---|---|---|
| 1 | `app/insights/seo-titles.js` **(신규)** | 기사 104개의 문서 제목을 손으로 재작성(폭 ≤60, 접미사 없음). 슬러그 → 제목 표 |
| 2 | `app/insights/[slug]/page.js` | 위 표를 우선 적용, 없으면 기존 동작(`제목 \| 운세 인사이트`) |
| 3 | `app/insights/{page.js,astrology,compatibility,fusion,saju,tarot,vedic,ziwei}` | 허브 8개 제목 축약(브랜드 접미사는 유지) |
| 4 | `index.html` · `public/i18n/{en,ja}.json` | 셸 홈 3개(`/`·`/en`·`/ja`). `/zh`·`/zh-tw` 는 원래 한계 안이라 미변경 |
| 5 | `app/stories/[episode]/page.tsx` | 템플릿에서 ` \| Code Destiny` 제거 → 회차 44개 전부 한계 안(최대 47) |
| 6 | 개별 라우트 7개 | `/master-love-codex`·`/fortune/prompt-hub`·`/compare/sukuyo-vs-vedic`·`/naming-ai`·`/destiny-poker`(`destiny-poker.html`)·`/destiny-compass`·`/saju/sibyl`·`/vedic-ai` |
| 7 | `scripts/verify-adsense-readiness.mjs` | **`verifyIndexableTitleWidth` 신규** — 사이트맵 URL 전량(`.html` 단독 라우트 포함) 폭 ≤60 강제 + `homeCanonicalAllowedRoutes` 를 산출물별로 |
| 8 | `scripts/promote-static-shell-to-root.mjs` | noindex `/static` 사본에서 홈 canonical 제거(§5-1 해소) |
| 9 | `scripts/seo-audit.mjs` | 인바운드 집계에서 `/x.html` → `/x` 별칭 접기(§5-3 해소) |

#### 왜 기사 레코드가 아니라 별도 표인가

🔴 `seed-articles.js` 는 이미 `metaTitle`/`seoTitle` 을 받아 정규화된 `seoTitle` 을 만들고,
**그 값을 인사이트 허브 카드(`app/insights/page.js`·`InsightsCosmicClient.js`)가 화면 문구로 읽는다.**
거기에 SEO 제목을 넣으면 문서 제목만이 아니라 목록 UI 까지 바뀐다. 화면 H1 은 설명적이어야 하고
문서 제목은 폭 안에 들어와야 하므로 둘을 분리했다.

#### §5-3 은 결함이 아니라 감사 도구의 위양성이었다

`/destiny-poker` 로 들어오는 링크는 8개 페이지에 있었는데(셸 홈·`/static`·`/oracle/{juyuk,hwatu}`·
로케일 4개) 표기가 `/destiny-poker.html` 이라 사이트맵 표기와 키가 갈렸다.
**프로덕션 실측 2026-08-27**: `curl -I https://code-destiny.com/destiny-poker.html` → `308` →
`/destiny-poker`. IA 결정은 필요 없었다.

### 10-3. 실측 (dist, 색인 388개)

| 항목 | 전 | 후 |
|---|---:|---:|
| 제목 표시 폭 중앙 / 최대 | 51 / 111 | **42 / 60** |
| 폭 60 초과 | 125 | **0** |
| 중복 title / 중복 description | 0 / 0 | 0 / 0 |
| H1 ≠ 1 · JSON-LD 없음 | 0 · 0 | 0 · 0 |
| 렌더 감사 Issues | 1 | **0** |

### 10-4. 🔴 아직 안 고친 것 — 설명(description) 폭

같은 축으로 재면 **183개가 폭 160 초과**다(중앙 153, 최대 277). §5-6 이 "160자 초과 4개" 로
본 그 층이고, "70자 미만 79개" 는 **폭으로 재면 대부분 정상 범위**다(폭 110 미만은 64개).
즉 §5-6 의 두 숫자는 둘 다 뒤집힌다. 이번 세션의 사용자 결정 범위는 제목이었다.

고칠 때 주의: 기사 설명은 `articleDescription()` 이 `seoDescription → metaDescription →
description → excerpt → subtitle` 순으로 골라 **160자로 자른다**(`app/insights/[slug]/page.js`).
폭이 아니라 글자 수로 자르므로 한국어에서는 잘린 뒤에도 폭 한계를 넘는다. 제목과 같은 모양의
별도 표를 만들 것인지, 자르는 기준을 폭으로 바꿀 것인지가 첫 결정이다.

### 10-5. 갱신된 다음 단계

**단기**
1. **설명 폭 정리 183개** (§10-4) — 결정 먼저: 별도 표 vs 절단 기준 변경
2. §5-2 몰입형 라우트 18개의 아웃바운드 링크 0 — "몰입형 화면에 최소 링크 블록을 둘 것인가" 결정 필요

**중기**
3. §5-4 `/insights` 1.83MB 페이로드 축소 — 검색 인덱스 분리 설계 선행
4. §5-5 HTML ETag/304 — Worker 응답 헤더, 배포 파이프라인 결정

**해소됨**: §5-1(/static 이중 신호) · §5-3(/destiny-poker 고아) · §5-6 의 제목 축.

🔴 **남은 작업은 [seo-followups-2026-08-27.md](seo-followups-2026-08-27.md) 로 옮겼다** — 그 문서만
읽고 시작할 수 있게 써 두었다(결정 대기 항목·재현 명령·생성 파일 충돌 해소법 포함).

### 10-6. 검증

```
npm run lint                          → exit 0 (기존 경고만)
npm run typecheck                     → exit 0
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest
                                      → 176 suites / 2002 tests / 0 fail
npm run test:node                     → tests 551 / pass 551 / fail 0
npm run build:cf                      → exit 0 · [adsense-readiness] OK
SEO_AUDIT_OUT_DIR=dist node scripts/seo-audit.mjs --source=out --crawl-sitemap → Issues 0
npm run verify:sitemap / sitemap-drift / seo-heading-integrity /
         indexable-prose-depth / www-canonical / staging-noindex /
         seo-entity-registry / i18n-runtime / i18n-ko-coverage /
         i18n-no-fallback / public-parity / guard-wiring / doc-freshness → 전부 OK
node scripts/verify-payment-freeze.mjs → 통과
```

🔴 신규 가드 2개를 **음성 테스트**로 확인했다:
- `dist/insights/ziwei-vs-saju` 에 옛 제목을 되돌려 넣으니 `표시 폭 99 > 60` 으로 실패 → 복원 후 통과
- `dist/static/index.html` 에 홈 canonical 을 되돌려 넣으니 실패 → 복원 후 통과

### 10-7. 이어받을 때 추가로 주의할 것

- 🔴 **`__tests__/ui/svg-title-not-document-title.static.test.js` 는 소스에서 리터럴 `<` + `title` + `>` 를 찾는다.**
  `app/**` 주석에 그 표기를 쓰면 SVG title 회귀로 오탐된다. 이 세션에서 한 번 걸렸고, 주석 표기를
  "문서 제목" 으로 바꿔 피했다(가드는 건드리지 않았다).
- **셸 제목을 고치면 `index.html` diff 가 90줄로 부푼다** — 실제 변경은 4줄(title·og:title·
  twitter:title·JSON-LD name)이고 나머지는 `sync:public` 캐시버스트 회전이다. 미러 13개도 함께 커밋한다.
- `verify:public-mirror-fresh` 가 `.ignore` 한 줄만 차이라고 하면 윈도우 개행 헛실패다(기존 기록).
