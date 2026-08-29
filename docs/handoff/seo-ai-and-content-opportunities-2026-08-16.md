---
status: done
updated: 2026-08-16
next: "이 문서의 큐는 docs/handoff/seo-session-2026-08-16.md §3 으로 넘어갔다"
---

# SEO 추가 최적화 기회 분석 — 마케팅 스킬 대조 (2026-08-16)

> **이 문서만 읽고 시작할 수 있게 쓴다.** 모든 판정은 이 레포의 **빌드 산출물·소스 실측**이며 재현 명령을 함께 남긴다.
>
> `.claude/skills/{ai-seo,seo-audit,schema,site-architecture,programmatic-seo,content-strategy}`
> (PR #719 로 머지됨)의 체크리스트를 레포 실제 상태와 대조한 결과다.
>
> 🔴 **스킬의 권고를 그대로 실행하지 말 것.** 일반 SaaS 마케팅용으로 쓰인 문서라 이 레포가 금지하는
> 항목이 섞여 있다 — 페이지 대량 생성, 키워드 삽입, 페이지가 제공하지 않는 rich result 용 스키마.
> CLAUDE.md 절대규칙 6과 SEO 요청서 22장 금지 목록이 **항상 우선**한다. §5 에 기각 목록을 남겼다.

---

## 0. 이 문서의 위치 — 이미 있는 큐와 겹치지 않는다

| 문서 | 다루는 것 |
|---|---|
| `docs/handoff/seo-indexing-2026-08-15.md` | 색인 부진 진단 3층 + 잔여 A~F |
| `docs/handoff/locale-footer-hub-2026-08-16.md` | §3-A 완료 기록 + **§7 에 §3-B·§3-C 실행안** |
| **이 문서** | 위 두 문서에 **없는** 신규 기회 — AI/GEO 레이어, E-E-A-T, 콘텐츠 유형 공백 |

**먼저 처리해야 할 것은 이 문서가 아니다.** 우선순위는 여전히
①`locale-footer-hub-2026-08-16.md` §7-1(§3-B 내부 링크 슬래시) → ②§7-2(§3-C lastmod 원장) 다.
이 문서의 항목들은 그 다음이거나 병렬로 가능한 것들이다.

---

## 1. 실측 현황 요약 (2026-08-16)

| 지표 | 값 | 판정 |
|---|---|---|
| 색인 라우트 | 429 | — |
| `FAQPage` 보유 라우트 | **313 / 429 (73%)** | ✅ 이미 강함 |
| `BreadcrumbList` 보유 라우트 | **414 / 429 (96%)** | ✅ 이미 강함 |
| URL depth 분포 | 1단 45 · 2단 234 · 3단 149 | ✅ 3-Click Rule 충족 |
| AI 크롤러 차단 | **0건** (`GPTBot`·`ClaudeBot`·`PerplexityBot`·`Google-Extended`·`CCBot` 규칙 없음) | ✅ 기본 허용 |
| `llms.txt` | **없음** | ❌ §2-1 |
| `/pricing.md` | **없음** | ⚠️ §2-2 (위험 있음) |
| Article `author` | **조직명 폴백** (`siteSeo.siteName` = "Code Destiny") | ❌ §3-1 |
| 비교(vs/alternative) 페이지 | **0개** | ❌ §4-1 |

재현:
```bash
grep -c '<loc>' sitemap.xml                                                    # 429
grep -rl '"@type":"FAQPage"' out --include=index.html | wc -l                   # 313
grep -rl '"@type":"BreadcrumbList"' out --include=index.html | wc -l            # 414
grep -iE 'GPTBot|ClaudeBot|PerplexityBot|Google-Extended|CCBot' robots.txt app/robots.ts   # 0건
ls llms.txt public/llms.txt pricing.md 2>/dev/null                              # 없음
grep -n 'author' lib/structured-data.ts                                         # :214 폴백이 siteSeo.siteName
```

---

## 2. AI / GEO 레이어 — 전혀 손대지 않은 영역

### 2-1. `llms.txt` 추가 (P2, 저위험 · 권장)

**근거**: `ai-seo` 스킬 — 비Google 엔진(ChatGPT·Claude·Perplexity)은 `llms.txt` 를 파싱한다.
Google 은 "필요 없다"고 명시했으므로 **Google 을 위한 작업이 아니다**. 손해도 없다.

**왜 이 서비스에 맞나**: 사주·자미두수·숙요점·베다점은 **용어 자체가 설명을 요구하는 도메인**이다.
AI 가 "숙요점이 뭐냐"에 답할 때 인용될 후보가 되려면 서비스 정의가 기계가 읽을 수 있는 형태여야 한다.

**구현**
- 위치: `public/llms.txt` (정적 자산). 🔴 루트 `llms.txt` 를 따로 두지 말 것 —
  `sync:public` 미러 규칙과 어긋나면 `verify:public-parity` 가 잡는다. 어느 쪽이 정본인지 먼저 확인할 것
  (`robots.txt`·`ads.txt` 는 **루트+public 양쪽**을 두고 `ensure-ads-txt.mjs` 가 동기화하는 패턴이다).
- 내용: 서비스 정의 · 6개 체계(사주/자미두수/숙요점/베다/서양점성술/타로) 각각 한 문단 · 주요 허브 링크 ·
  운세 콘텐츠의 성격·한계 고지.
- 🔴 **`lib/seo/entity-registry.mjs` 의 `FUSION_FORTUNE_PROFILE` 과 용어가 어긋나면 안 된다**
  (`verify:seo-entity-registry` 가 그 표를 지킨다). 초융합 운세 정의는 거기서 가져올 것.
- 🔴 사이트맵에 넣지 말 것 — `verify-adsense-readiness` 가 사이트맵 라우트에 HTML 산출물을 요구한다.

**검증**: `npm run build:cf` 후 `dist/llms.txt` 존재 확인 + `npm run verify:public-parity`.

### 2-2. `/pricing.md` — ⚠️ 하려면 결제 정책을 먼저 읽어야 한다

**스킬 권고**: AI 에이전트가 파싱할 수 있는 가격 파일. 없으면 AI 매개 비교에서 탈락.

🔴 **이 레포에서는 위험도가 높다.** 하기 전에 `docs/context/payment-gating.md` 를 **반드시** 읽을 것.
- 재화 순서가 **이용권(30일, 자동갱신 없음) → 월정석(이벤트 지급, 구매 불가) → 코인(레거시 내부 단위)** 이다.
- 🔴 **코인은 폐지된 개념**이라 사용자에게는 항상 KRW 환산(`1코인=100원`)으로만 표시한다.
  `coinPrice`/`cost` 를 그대로 적으면 정책 위반이다.
- 가격을 문서에 박으면 **실제 가격과 갈라지는 순간 잘못된 정보를 AI 에게 먹인다.** 스킬도
  "stale pricing is worse than no file" 이라고 적고 있다.

**권고**: 가격 **숫자를 하드코딩하지 말고**, 파일을 만들 거라면 상품 **구조**(이용권/월정석의 성격, 환불 조건,
자동갱신 없음)만 적고 실제 금액은 `/points/` 같은 라이브 페이지로 링크한다.
그것도 부담이면 **하지 않는 편이 낫다** — 이 항목은 "안 하기"가 정당한 선택이다.

### 2-3. AI 크롤러 정책을 명시할지 결정 (P3, 판단 필요)

**현황 실측**: `robots.txt` 에 AI 봇 규칙이 **하나도 없다.** `User-agent: *` + `Allow: /` 라
GPTBot·ClaudeBot·PerplexityBot·Google-Extended 는 **전부 이미 허용**돼 있다. 즉 **지금 당장 막힌 건 없다.**

결정할 것은 "명시할 것인가"뿐이다.
- 명시의 이점: 의도가 기록돼 나중에 누가 `Disallow` 를 넣는 사고를 막는다.
- 명시의 비용: `robots.txt` 는 **루트/`public`/`app/robots.ts` 3곳**이 같아야 하고
  `verify-sitemap-integrity.mjs` 가 루트 파일을 읽어 사이트맵과 대조한다. 3곳을 함께 고쳐야 한다.
- 선택지: 학습 전용 크롤러(`CCBot`)만 막고 검색·인용 봇은 허용 — 스킬이 제시한 중간 지대.
  🔴 **인용을 원하면 GPTBot·ClaudeBot·PerplexityBot·Google-Extended 를 막지 말 것.**

**사용자 판단 필요 항목이다.** 임의로 정하지 말 것.

---

## 3. E-E-A-T — 가장 값싼 개선 여지

### 3-1. `Article.author` 가 조직명으로 폴백된다 (P2)

**실측**: `lib/structured-data.ts:214` 가 `author: { name: input.author || siteSeo.siteName }`.
즉 저자 미지정 기사는 **"Code Destiny"(조직)를 저자로 선언**한다.
`app/insights/seed-articles.js:872-874` 도 `DEFAULT_AUTHOR` 로 떨어진다.

**왜 문제인가**: Princeton GEO 연구(스킬 §Pillar 2) 기준 **전문가 귀속은 인용률 +25~30%** 로
"통계 추가(+37%)" 다음가는 레버다. 운세는 Google 이 신뢰성을 특히 까다롭게 보는 카테고리이기도 하다.

🔴 **없는 사람을 만들어 내지 말 것.** 가짜 저자·가짜 자격은 요청서 22장 금지 목록이다.
실재하는 운영자(사업자 정보상 대표자)나 실제 감수 주체가 있을 때만 `Person` 으로 승격한다.
**사용자 확인이 선행돼야 하는 항목이다** — 누가 저자로 표기될 수 있는지 물어볼 것.

대안(사람 이름을 못 쓰는 경우): `author` 는 조직으로 두되 `publisher` 와 분리하고,
`/methodology`(이미 존재)를 `Article` 의 `citation`/`isBasedOn` 으로 연결해 **방법론 투명성**으로 신뢰 신호를 만든다.
이건 사실 관계를 지어내지 않으므로 안전하다.

### 3-2. 갱신일 노출은 이미 되어 있다 ✅

`app/insights/[slug]/page.js:222` 의 `ContentIntegrityNote` 가 `datePublished`/`dateModified` 를 렌더한다.
**추가 작업 불필요.** (스킬의 "no freshness signals" 흔한 실수에 해당하지 않는다.)

---

## 4. 콘텐츠 유형 공백

### 4-1. 비교 콘텐츠가 0개다 — 인용률 1위 유형 (P2, 기회 큼)

**스킬 데이터**: 비교 문서가 AI 인용의 **약 33%** 로 1위. 이 레포에는 `app/compare`·`app/*-vs-*` 가 **없다**.

🔴 **경쟁사 비교를 만들라는 뜻이 아니다.** 이 서비스에 맞는 형태는 **체계 간 비교**다 —
실제로 6개 체계를 다 제공하므로 지어내는 내용이 아니다:

- 사주 vs 자미두수 — 같은 생년월일로 무엇이 다르게 보이는가
- 숙요점 vs 베다 점성술 — 27수를 공유하지만 해석 축이 다름 (`/nakshatra` 가 이미 통합 페이지다)
- 서양 점성술 vs 동양 명리 — 좌표계·시간 개념 차이
- 타로 vs 명리 — 시점 질문 vs 구조 질문

**왜 이 레포에서 정당한가**: `docs/seo-strategy/02-topic-cluster-map.md` 의 클러스터 구조와 맞고,
`/methodology` 가 이미 방법론 페이지로 존재하며, 각 체계 허브(`/saju`·`/ziwei`·`/sukuyo`·`/vedic`·`/astrology`·`/tarot`)가
전부 색인 가능하다. 비교 문서는 그 허브들을 잇는 **내부 링크 허브** 역할도 한다.

🔴 **제약**
- 신규 색인 라우트는 `verify-adsense-readiness` 게이트를 탄다. `canLoadAdsense()` 여부에 따라
  **1,200자 또는 1,800자** 가시 텍스트가 필요하고, `dynamic(..., {ssr:false})` 로 붙인 것은 **0자로 센다**
  (`docs/context/seo-and-adsense.md` 필독).
- 제목·설명은 **사이트맵 전역에서 유일**해야 한다(같은 게이트가 중복을 잡는다).
- H1 은 정확히 1개(`verify:seo-heading-integrity`).
- 사이트맵 등재는 `scripts/generate-sitemap.mjs` 를 고쳐야 한다 — `lib/seo-site-urls.ts` 가 아니다.

**권고 규모**: 4~6개. 스킬의 "페이지 수를 늘려라"에 끌려가지 말 것 —
`programmatic-seo` 스킬 자신도 "Quality Over Quantity"를 원칙 5로 둔다.

### 4-2. 기존 programmatic 세트의 품질 (P3, GSC 데이터 대기)

실측 규모: `/fortune` **102** · `/stories` **45** · `/nakshatra/codex` **27** · `/high-value` **19** · `/flower` 4.

`seo-indexing-2026-08-15.md` §4 가 이미 근중복으로 지목한 것:
`nakshatra/codex` 토큰 72% 공유 · `famous-saju/category/*` 79% 공유 · `/flower/*` 390~441자.

🔴 **지금 손대지 말 것.** 그 문서의 결론대로 **GSC 「크롤링됨–색인되지 않음」 실데이터를 본 뒤**
noindex 전환/통합/본문 보강을 판단한다. 지금 지우면 근거 없이 콘텐츠를 삭제하는 것이다(절대규칙 6).

---

## 5. 스킬이 권하지만 **하지 않기로 판정한 것** (다시 검토하지 말 것)

| 스킬 권고 | 기각 사유 |
|---|---|
| 페이지 대량 생성(programmatic 확대) | 이미 429개이고 근중복 55개(17%)가 미해결이다. 늘리기 전에 품질부터 — `programmatic-seo` 원칙 5와도 일치 |
| `Review`/`AggregateRating` 스키마로 별점 노출 | `/reviews/` 는 실제 사용자 후기 페이지지만, **집계 평점을 스키마로 선언하면 실데이터와 어긋나는 순간 조작 신고 대상**이다. 요청서 22장 "가짜 리뷰/평점 schema" 금지에 직접 걸린다 |
| `Product`/`Offer` 스키마로 이용권 가격 선언 | 결제 정책상 코인 표시 금지·KRW 환산 규칙이 있고, 가격 변경 시 스키마가 조용히 낡는다. `config/payment-freeze.json` 영역과도 인접 |
| 키워드 삽입 / "best 사주" 류 목록 문서 | Princeton GEO 기준 키워드 스터핑은 AI 가시성 **-10%**. 자사 홍보형 목록은 경쟁사 추천을 유발한 사례(69%)가 스킬에 기록돼 있다 |
| 콘텐츠를 AI 용으로 조각내기 | Google 이 "scaled content abuse" 로 명시 경고 |
| `FAQPage`·`BreadcrumbList` 추가 확대 | **이미 73% / 96%.** 남은 라우트는 대부분 FAQ 가 자연스럽지 않은 도구 페이지다 |

---

## 6. 권장 실행 순서

| # | 항목 | 근거 위치 | 위험 | 선행 조건 |
|---|---|---|---|---|
| 1 | **§3-B 내부 링크 슬래시** | `locale-footer-hub-2026-08-16.md` §7-1 | 중(런타임 분기) | — |
| 2 | **§3-C lastmod 원장** | 같은 문서 §7-2 | 중(빌드 경로) | — |
| 3 | `llms.txt` | 이 문서 §2-1 | 저 | — |
| 4 | 체계 간 비교 문서 4~6개 | §4-1 | 중(게이트) | 콘텐츠 작성 |
| 5 | `author` E-E-A-T 정리 | §3-1 | 저 | 🔴 **사용자 확인** — 저자로 표기 가능한 실재 주체 |
| 6 | AI 크롤러 정책 명시 | §2-3 | 저 | 🔴 **사용자 판단** |
| 7 | `/pricing.md` | §2-2 | **고** | 🔴 `payment-gating.md` 정독 + 가격 하드코딩 금지 |
| 8 | programmatic 품질 정리 | §4-2 | 고 | 🔴 **GSC 실데이터** |
| — | §3-D IndexNow | `seo-indexing-2026-08-15.md` §3-D | 중 | §3-C 선행 + 🔴 외부 POST 1회 승인 |

## 7. 사용자에게 물어야 하는 것 (임의 결정 금지)

1. **저자 표기** — `Article.author` 를 실명(대표자 또는 감수자)으로 올릴 수 있는가? 불가하면 §3-1 대안으로 간다.
2. **AI 크롤러 정책** — 학습 전용 크롤러(`CCBot`)를 막을 것인가? 검색·인용 봇은 계속 허용이 기본값이다.
3. **`/pricing.md`** — 만들 것인가. 만든다면 금액을 넣지 않는 구조 설명본으로 갈 것인가.
4. **비교 문서 주제** — §4-1 의 4개 후보 중 무엇부터인가. 콘텐츠 원문은 누가 쓰는가.
5. **GSC 「페이지」 사유별 분포** — `seo-indexing-2026-08-15.md` §1 부터 계속 대기 중인 값이다. 이게 있어야 §4-2 를 판단할 수 있다.

## 8. 코드로 해결 불가 (계속 열려 있음)

네이버 서치어드바이저 사이트+RSS 제출 · Bing Webmaster(GSC 임포트) · 다음 검색등록 ·
네이버 블로그 주 2~3회 포스팅 · 커뮤니티 참여(숙요 니치는 dcinside·포스타입·cboard 가 상위 점유) ·
색인 재요청. 판정에는 **2~4주** 필요하며 그 전에 개선 여부를 단정하지 않는다.

🔴 유료 백링크·링크 팜·자동 디렉터리 대량 제출은 **하지 않는다** — 운세는 Google 스팸 감시가 강한
카테고리라 신규 도메인(2026-03-01 등록)에서 회복이 오래 걸린다.
