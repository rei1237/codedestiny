---
status: active
updated: 2026-09-17
next: GSC에서 국가/페이지별 클릭 데이터를 뽑아온 뒤 이 문서 "결정 절차"부터 진행
---

# zh-TW 번역 — astrology/vedic/tarot 우선순위 (saju는 완료)

## 왜

`2026-09-17-seo-p1-followup.md` P1 항목("zh-TW 4개 허브: saju, astrology, vedic,
tarot, 순서는 트래픽 근거로 정할 것")의 후속. saju는 이번 세션에서 완료·push
(`ea3417fb6`). 나머지 3개는 레포 안 데이터만으로는 순서를 정할 근거가 부족해서
범위 밖으로 남긴다.

## 지금 상태

- saju zh-tw: `ea3417fb6`(main, push 완료). 라우트 `/zh-tw/saju/`, hreflang 상호참조
  확인, `check:fast` 전체 통과(277 suites / 3881 tests).
- astrology/vedic/tarot zh-tw: **미착수**. 콘텐츠도 라우트도 없음.

## 왜 순서를 못 정했는가 (실측 vs 추정 구분)

레포에서 찾은 트래픽 근거 두 가지가 서로 다른 결론을 가리킴:

| 출처 | 기간 | 내용 |
|---|---|---|
| `docs/adsense/search-console-observations.json` | 2026-06-07~09-06 | **사이트 전체** 31클릭/391노출. 허브별 분해 없음. |
| `docs/seo/SEARCH_INTENT_MAP.md` | 명시 안 됨(문서 내 경고: 표본 작음) | `/vedic/` 61클릭, `/saju/` 16.5(2회), `/manse/` 19.6(5회), astrology synastry 14.8(9회). tarot 언급 없음. |

- 두 표의 기간·집계 방식이 다르고 어느 쪽이 최신/정확인지 문서에 명시 안 됨.
- tarot는 **어느 문서에도 클릭 데이터가 없음** — 4개 중 근거가 가장 약함.
- `SEARCH_INTENT_MAP.md` 자체가 "저표본을 확정적으로 쓰지 말 것"이라고 경고함.
- 이번 세션에서 `docs/analytics-kpi.md`, `docs/seo/SEO_AUDIT.md`,
  `docs/seo/GROWTH_OPERATIONS.md`, `docs/seo/SEO_STATE.json`,
  `docs/adsense/baseline/summary.md`도 grep했으나 허브별 우선순위를 정할 만한
  추가 근거 없음.

→ 레포 안 문서로는 astrology/vedic/tarot 순서를 결정할 수 없음. **여기서 추정으로
순서를 매기지 않는다** (코딩 원칙 8).

## 결정 절차 (다음 세션 or GSC 접근 가능한 사람이 할 일)

1. Google Search Console에서 최근 28~90일, **페이지별**(`/saju/`, `/astrology/`,
   `/vedic/`, `/tarot/` 각각) 클릭수를 새로 뽑는다. 레포에 스크립트 없음 —
   GSC UI 또는 API 콘솔에서 수동 조회 필요.
2. 세 허브 중 클릭수가 유의미하게 높은 순서대로 착수한다. 표본이 여전히 작으면
   (예: 전부 한 자릿수) 순서를 확정하지 말고 사용자에게 다시 보고한다.
3. 순서가 정해지면 saju 구현 패턴을 그대로 따른다 — 아래 "재사용 패턴" 참고.

## 재사용 패턴 (saju에서 검증됨)

허브 하나에 새 로케일을 추가할 때, 8개 허브가 공유하는
`lib/i18n/feature-introductions.mjs`의 전역 `INTRO_LOCALES` 배열을 직접 건드리면
안 됨 — 나머지 7개 허브가 해당 로케일 콘텐츠 없이 `generateStaticParams`/
`generateMetadata`에 걸려 빌드가 깨짐 (saju 작업 중 실제로 grep해서 확인한 blast
radius: 11개 파일, 8개 허브 라우트 전부 `FEATURE_INTRODUCTIONS[topic][locale]`를
무가드 직접 접근).

대신 허브별로:
1. `feature-introductions.mjs`에 `INTRO_UI["zh-tw"]`(없으면 추가)와
   `FEATURE_INTRODUCTIONS[<topic>]["zh-tw"]` 콘텐츠 블록 추가.
2. `app/[locale]/<topic>/page.js`에 그 허브 전용 `<TOPIC>_LOCALES = [...INTRO_LOCALES, "zh-tw"]`를
   로컬로 만들어 `generateStaticParams`/`getLocale`에서만 사용 (전역 배열 미변경).
3. `PublicFeatureIntroduction.jsx`의 관련 허브 nav 방어 필터
   (`FEATURE_INTRODUCTIONS[key][locale]` 존재 확인)는 이미 saju 작업에서
   공통으로 고쳐뒀으므로 재작업 불필요.
4. `scripts/generate-sitemap.mjs`의 `zh-tw → zh-TW` hreflang 키 매핑도 이미
   공통 로직이라 재작업 불필요 — `introductionRoutes()`가 새 허브에 `zh-tw` 키를
   반환하기 시작하면 자동으로 커버됨.
5. `node scripts/generate-sitemap.mjs` 재실행 후 `git diff sitemap-zh-tw.xml`로
   새 허브 항목의 hreflang이 양방향으로 채워졌는지 반드시 diff로 확인
   (가정 금지 — `lib/generate-page-metadata.ts:88`의 🔴 경고 참고).
6. `npm run check:fast` 통과 확인 후 커밋.

## 정본

- `lib/i18n/feature-introductions.mjs` — saju `"zh-tw"` 블록이 콘텐츠 톤/구조 예시.
- `app/[locale]/saju/page.js` — `SAJU_LOCALES` 패턴 예시.
- `scripts/generate-sitemap.mjs`의 `INTRO_TOPICS.map(...)` 안 zh-tw→zh-TW 리매핑.
- `docs/seo/SEARCH_INTENT_MAP.md`, `docs/adsense/search-console-observations.json`
  — 현재 있는 유일한 트래픽 근거(상충·저표본 상태 그대로).

## 함정

- [[locale-i18n-pitfalls]] — 로케일 관련 기존 함정 전반.
- [[seo-sitemap-adsense-pitfalls]] — sitemap 원장/hreflang 관련 기존 함정.
- 전역 `INTRO_LOCALES`를 직접 건드리면 8개 허브 전부 동시에 깨짐 — 반드시 허브별
  로컬 배열로.

## 검증

```
node scripts/generate-sitemap.mjs   # 콘텐츠 추가 후
node --experimental-vm-modules --test __tests__/ui/seo-trust-locales.test.js
node scripts/verify-sitemap-integrity.mjs
npm run check:fast
```

## 모르는 것

astrology/vedic/tarot 중 실제 순서 — GSC 페이지별 실측 없이는 이 문서 안에서
결론 낼 수 없음. 다음 세션 시작 시 "결정 절차" 1번부터 수행.
