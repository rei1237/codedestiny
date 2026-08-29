---
status: active
updated: 2026-08-16
next: "§1 남은 주제 2개 — `/compare/astrology-vs-myeongri` · `/compare/tarot-vs-saju` (1·2호는 완료)"
---

# 체계 간 비교 문서 — 인수인계 (2026-08-16)

> **이 문서만 읽고 시작할 수 있게 쓴다.** 수치는 전부 실측이고 재현 명령을 함께 남긴다.
>
> 1호(`/compare/saju-vs-ziwei`)는 **완성돼 머지 대기 중**이다. 이 문서는 나머지 3개를 같은 방식으로
> 만들기 위한 것이고, 게이트 제약은 1호를 실제로 빌드해서 확인한 값이다.

---

## 0. 왜 이 작업인가

`.claude/skills/ai-seo` 의 데이터: **비교 콘텐츠가 AI 인용의 약 33% 로 1위 유형**이다.
이 레포에는 비교 문서가 **0개**였다(2026-08-16 실측: `ls -d app/compare app/*-vs-*` → 없음).

🔴 **경쟁사 비교가 아니다.** 이 서비스는 6개 체계를 **실제로 전부 제공**하므로 체계 간 비교는
지어낸 내용이 아니다. 경쟁사 비교나 "best 사주 사이트" 류 목록은 만들지 않는다 —
ai-seo 스킬 자신이 자사 홍보형 목록의 69%가 오히려 경쟁사 추천을 유발한 사례를 기록하고 있다.

부수 효과로 각 체계 허브(`/saju`·`/ziwei`·`/sukuyo`·`/vedic`·`/astrology`·`/tarot`)를 잇는
**내부 링크 허브**가 된다.

---

## 1. 남은 주제 3개 (1호는 완료)

| # | 경로 | 주제 | 상태 |
|---|---|---|---|
| 1 | `/compare/saju-vs-ziwei` | 사주 vs 자미두수 | ✅ **완료** — 정본 예시로 삼을 것 |
| 2 | `/compare/sukuyo-vs-vedic` | 숙요점 vs 베다 점성술 | ✅ **완료** |
| 3 | `/compare/astrology-vs-myeongri` | 서양 점성술 vs 동양 명리 | 미착수 |
| 4 | `/compare/tarot-vs-saju` | 타로 vs 사주 | 미착수 |

남은 두 주제의 차이축(초안 — 쓰기 전에 허브 프로필에서 용어를 다시 확인할 것):

- **서양 점성술 vs 동양 명리**: 좌표계가 다르다(황도 12궁 vs 간지). 시간 개념도 다르다
  (트랜짓의 연속 흐름 vs 대운의 구간). 출생시간의 무게도 다르다.
- **타로 vs 사주**: 타로는 지금 이 질문에 답하고, 사주는 구조를 답한다. 질문의 유효기간이 다르다.
  이 문서는 "무엇을 볼지 고르는 안내" 성격이 강해 서비스 진입 동선으로도 쓸모가 있다.

🔴 **용어는 지어내지 말 것.** 1·2호는 쓰기 전에 `lib/seo/entity-registry.mjs` 의 해당 허브
프로필(`title`·`topicSummary`·`longTail`)을 읽어 그 안에서 확인된 개념만 썼다
(예: 숙요점 → 본명숙·27수 / 베다 → 조티쉬·라그나·다샤). 같은 절차를 밟을 것.

---

## 2. 🔴 게이트 제약 — 1호를 빌드해 확인한 값

### 2-1. 가시 텍스트 **1,800자** (1,200자가 아니다)

`/compare` 는 `app/components/adsense-route-policy.js` 의 `CONTENT_PREFIXES`(:106)에 **없다**.
따라서 `canLoadAdsense()` 가 false 이고, `scripts/verify-adsense-readiness.mjs:28` 의
`minimumBlockedIndexableVisibleTextLength = 1800` 을 탄다.

🔴 **광고 정책을 바꿔 1,200자로 낮추지 말 것.** `/compare` 를 `CONTENT_PREFIXES` 에 넣으면
비교 문서에 광고가 붙고 기준이 1,200자로 내려가지만, 그건 수익·UX 판단이라 **별건이고 사용자 승인 사항**이다.
1호는 정책을 건드리지 않고 본문으로 채웠다.

재현:
```bash
grep -n "CONTENT_PREFIXES" -A 12 app/components/adsense-route-policy.js
grep -n "minimumBlockedIndexableVisibleTextLength" scripts/verify-adsense-readiness.mjs
```

### 2-2. 그 밖의 게이트

- **H1 정확히 1개** — `verify:seo-heading-integrity` 가 산출물을 전수 스캔한다.
  FAQ 항목 제목은 `<h3>` 로 둘 것(1호가 그렇게 했다). `<h2>` 를 쓰면 구조는 통과하지만
  FAQ 블록이 본문 섹션과 같은 층위가 되어 추출 품질이 떨어진다.
- **title·description 이 사이트맵 전역에서 유일** — 같은 게이트가 중복을 잡는다.
- 🔴 **`dynamic(..., { ssr: false })` 로 붙인 본문은 가시 텍스트 0자로 세어진다.** 전부 서버 렌더여야 한다.
- **사이트맵 등재는 `scripts/generate-sitemap.mjs` 를 고친다.** `lib/seo-site-urls.ts` 가 아니다
  (그 파일은 실제 사이트맵과 별개인 병렬 목록이다 — 경로 95개 vs 사이트맵 429개).

---

## 3. 만드는 절차 (1호에서 검증된 순서)

1. `app/compare/<slug>/page.tsx` 생성. **정본 예시: `app/compare/saju-vs-ziwei/page.tsx`**
2. `scripts/generate-sitemap.mjs` 의 `coreRoutes` 에 항목 추가
   (1호는 `/editorial-policy` 다음 줄에 넣었다. `changefreq: "monthly", priority: 0.8`)
3. `npm run typecheck`
4. `npm run build:cf`
5. 가시 텍스트·H1·스키마 실측 (§4 스크립트)
6. `npm run test:node`

### 3-1. 페이지 구조 (ai-seo 스킬의 추출 패턴을 따른다)

1호가 쓴 순서이고, 이유가 각각 있다:

| 순서 | 블록 | 왜 |
|---|---|---|
| 1 | H1 + **자립형 정의 문단** | AI 는 페이지가 아니라 구절을 뽑는다. 첫 문단이 그 구절이 된다 |
| 2 | **비교 표** | 스킬: "Tables beat prose for comparison content". `X vs Y` 질의의 1순위 추출 대상 |
| 3 | 체계별 설명 섹션 2개 | 각 체계를 그 체계의 언어로 |
| 4 | **"어느 쪽부터 보면 좋은가"** 목록 | 의사결정 블록. 서비스 선택 안내로도 기능한다 |
| 5 | **FAQ 4개** | `FAQPage` 스키마로 직접 추출됨 |
| 6 | 한계 고지 | 운세는 신뢰성 판단이 까다로운 카테고리다. 우리가 먼저 규정한다 |
| 7 | 관련 링크 chip | 내부 링크 허브 역할 |

### 3-2. 스키마

`lib/structured-data.ts` 의 헬퍼를 쓴다(직접 만들지 말 것):
`buildWebPageJsonLd` · `buildBreadcrumbJsonLd` · `buildFaqPageJsonLd`.
`<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(x) }} />` 로 방출한다.

🔴 **브레드크럼에 `/compare` 허브를 넣지 말 것 — 아직 없는 URL 이다.** 1호는 `홈 > 문서` 2단으로 뒀다.
4개가 다 생기면 그때 허브를 만들고 3단으로 올린다(§5 참고).

### 3-3. 스타일

- 🔴 `cd-compare-table`·`cd-table-scroll` 같은 클래스는 **존재하지 않는다.** 1호를 쓰다가 처음엔
  그걸 썼고 실재하지 않아 고쳤다. 레포는 표에 **Tailwind** 를 쓴다.
- 표는 `<div className="mt-4 overflow-x-auto">` 안에 `min-w-[36rem]` 로 둔다
  (정본 패턴: `app/fortune/[period]/[sign]/SignFortuneView.tsx:191`). 본문이 가로로 밀리면 안 된다.
- 나머지 레이아웃은 `cd-main-shell`·`cd-guide`·`cd-card`·`cd-card-grid`·`cd-chip-wrap` 을 쓴다
  (`styles/globals.css:175~`). 🔴 그 "Classic Card System" 은 `/about`·`/faq`·`/methodology`·
  `/high-value`·홈이 함께 쓰므로 **한 줄도 고치지 말 것**(파일 주석 :307).

---

## 4. 검증 스크립트 (그대로 복사해 쓸 것)

```bash
npm run typecheck
npm run build:cf          # verify-adsense-readiness·seo-heading-integrity 가 여기서 돈다
npm run test:node
```

가시 텍스트·H1·스키마 실측:

```bash
node -e "
const fs=require('fs');
const f='out/compare/<slug>/index.html';
const html=fs.readFileSync(f,'utf8');
const t=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
            .replace(/<[^>]+>/g,' ').replace(/&[a-z]+;/gi,' ').replace(/\s+/g,' ').trim();
console.log('가시 텍스트', t.length, '자  (1800 이상이어야 함)');
console.log('H1', (html.match(/<h1/gi)||[]).length, ' (정확히 1)');
console.log('FAQPage', html.includes('\"@type\":\"FAQPage\"'));
"
```

---

## 5. 4개가 다 생긴 뒤에 할 것

- **`/compare` 허브 페이지**. 지금 만들면 링크 1개짜리 얇은 페이지라 1,800자 게이트를 못 넘는다.
  4개가 되면 각 문서 요약으로 본문이 채워진다. 만들 때 브레드크럼도 3단으로 올린다.
- **각 체계 허브에서 비교 문서로 거는 링크**. 지금은 비교 문서 → 허브 단방향이다.
  🔴 허브 페이지들은 `SeoLandingTemplate` 을 공유하므로 한 곳을 고치면 여러 라우트가 바뀐다 —
  회귀 범위를 먼저 확인할 것(원칙 7).
- `lib/seo/entity-registry.mjs` 에 비교 문서 프로필 추가 여부 판단. 넣으면 `llms.txt` 에도
  자동으로 실린다(`scripts/generate-llms-txt.mjs` 가 레지스트리에서 파생한다).

---

## 6. 하지 말 것 (재검토 금지)

| 항목 | 사유 |
|---|---|
| 경쟁사 비교 / "best 사주 사이트" 목록 | 자사 홍보형 목록은 오히려 경쟁사 추천을 유발한다(ai-seo 스킬 기록: 69%) |
| 비교 문서를 6개 이상으로 확대 | 이미 429개 라우트에 근중복 55개(17%)가 미해결이다. `programmatic-seo` 스킬 원칙 5도 "Quality Over Quantity" |
| 키워드 삽입("사주 자미두수 차이"를 반복) | Princeton GEO 기준 키워드 스터핑은 AI 가시성 **-10%**. 전통 SEO 와 달리 **적극적 해악**이다 |
| `Review`/`AggregateRating` 스키마 | 실데이터와 어긋나는 순간 조작 신고 대상 |
| `/compare` 를 `CONTENT_PREFIXES` 에 넣어 게이트 완화 | 광고 노출 정책 변경이라 사용자 승인 사항 |

---

## 7. 열려 있는 다른 SEO 건 (이 작업과 별개)

| 항목 | 상태 |
|---|---|
| `llms.txt` | ✅ PR #728 (머지 대기) |
| §5-5 페이지 단위 `WebPage` 노드 | 미착수. **실측: 169/693 페이지 보유** = 524개 없음 |
| §5-6 `WebSite.name` 드리프트 | 미착수. 렌더 `CODE DESTINY (꿀꿀 운세)` 687개 vs `app/kkul-kkul-unse/page.js:138` 의 `꿀꿀 운세 — Code Destiny` 1개. `app/layout.js:164` 에 인지 주석 있음. 🔴 **정본 이름 선택은 브랜드 결정** |
| `Article.author` E-E-A-T | 🔴 **사용자 확인 필요** — 실재 주체가 있을 때만. 없는 사람을 만들지 말 것 |
| AI 크롤러 정책 명시 | 🔴 **사용자 판단**. 현재 차단 0건이라 이미 인용 가능하다 |
| programmatic 근중복 정리 | 🔴 **GSC 실데이터 대기** |
