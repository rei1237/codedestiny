# 검색 수요 기반 SEO + 신규 콘텐츠 확장 로드맵 (핸드오프)

작성: 2026-08-22 · 상태: **P4 일부만 구현, 나머지는 계획**

이 문서만 읽고 다음 단계를 이어받을 수 있게 쓴다. 원 요청은 사용자가 제시한 20개 섹션짜리
대규모 브리프(오늘의 운세·띠별/별자리 운세·MBTI 테스트·심리 테스트 신설 + SEO 자산 보호 +
무료→유료 전환 구조)였다. 실측 결과 **브리프의 여러 전제가 실제 코드와 달랐다** — 아래는 그
실측을 반영해 다시 짠 우선순위다. 원 브리프 전문은 이 세션의 대화 기록에 있고, 여기엔 실측
근거와 다음 행동만 남긴다.

---

## 0. 핵심 재발견 — 브리프 전제와 실제 코드의 차이

| 브리프의 전제 | 실측 결과 |
|---|---|
| "오늘의 운세·띠별 운세·별자리 운세"가 없다 | **이미 있다.** `app/fortune/[period]/[sign]/page.tsx`가 4기간(today/tomorrow/weekly/monthly)×24별자리·띠=96개 정적 라우트를 규칙 기반(AI 미사용, `lib/fortune/build-view.ts`)으로 서빙 중. sitemap·구조화 데이터(`buildWebPageJsonLd`/`buildCollectionPageJsonLd`/`ItemList`/breadcrumb) 포함. `app/today/page.js`가 허브. |
| "MBTI 테스트·심리 테스트"가 없다 | **라우트는 있지만 실체가 없다.** `app/psychotest/page.tsx`(14종 카탈로그)·`app/animal/mbti/page.tsx`(MBTI×동물 궁합 랜딩)는 실제 문항·채점 로직이 사이트 내부에 없고 `PSYCHOTEST_APP_BASE_URL`(`lib/psychotest-catalog.ts:34-35`)로 **외부 Replit 앱**(`aesthetic-pig-design--youngchan1237.replit.app`)에 리다이렉트한다. 검색 신호를 얻어도 전환은 사이트 밖에서 끝난다. |
| "무료 결과 하단 유료 CTA가 0건이라 신설해야 한다" | **부분적으로 이미 있다.** `docs/handoff/monetization-free-paid-boundary.md`(2026-08-17)는 "/today 결과 CTA 0건"이라 적어놨지만 그 이후 `app/components/FusionCrossSell.tsx`가 만들어져 `/today`(`TodayHubClient.tsx:442`)·`/fortune/[period]/[sign]`(`SignFortuneView.tsx:437`)·`/insights/[slug]`(`page.js:225`)에 이미 붙어 있다. 문서가 낡았을 뿐 실제로는 P4가 상당 부분 진행돼 있었다. |

**결론**: 이번 세션은 "신규 기능을 만드는" 작업이 아니라 "이미 있는 것과 실제로 빈 곳을 실측으로
구분하는" 작업이었다. 다음 세션도 브리프를 그대로 실행하지 말고, 이 문서의 실측을 기준으로
시작할 것.

---

## 1. 현황 진단 (A~I)

### A. SEO 구조
- sitemap 정본은 **`scripts/generate-sitemap.mjs`** 하나뿐(`lib/seo-site-urls.ts`는 어디서도 import되지 않는 미사용 파일 — 근거로 삼지 말 것). 소스 구성: `coreRoutes` 하드코딩 배열, `i18nRouteGroups`(hreflang alternates 포함), `STATIC_CANONICAL_ROUTES`(`scripts/static-canonical-route-map.mjs`), `app/insights/seed-articles.js`의 `INSIGHT_SEED_ARTICLES`, `lib/famous-saju/celebrity-data.ts`, **`lib/fortune/sign-profiles.ts`(별자리·띠 24종×기간 4종=96경로)**, `app/high-value/content.js`.
- robots 정본은 `app/robots.ts`(`dynamic="force-static"`) + `public/robots.txt`(정적 폴백, 양쪽 동기화 필요).
- canonical/hreflang 로직: `lib/seo.ts`, `lib/seo/createI18nMetadata.ts`, `lib/generate-page-metadata.ts`, `lib/seo/siteSeo.ts`, `lib/i18n/routes.ts`.
- 구조화 데이터·breadcrumb 유틸은 이미 있다: `lib/structured-data.ts`(`buildBreadcrumbJsonLd`/`buildWebsiteJsonLd`/`buildWebPageJsonLd`/`buildCollectionPageJsonLd`/`buildFaqPageJsonLd`) — 신규 페이지는 이걸 재사용하면 되고 새로 만들 필요 없음.

### B. 서비스 구조 (app/ 최상위 도메인)
`saju`(+`saju-fpti`,`saju-guardian`,`saju-picture`), `ziwei`(+`ziwei-ai`), `sukuyo`(+`sukyo`[오타,
noindex+리다이렉트, 실질 콘텐츠 없음], `sukuyo-compatibility-ai`), `vedic`(+`vedic-ai`),
`astrology`(+`astrology-ai`), `tarot`, `nakshatra`, `fortune`(+`fortune-chat`,`fortune-planner`,
`fortune-tea-house`), `insights`(콘텐츠 허브), `compare`, `[locale]`/`ja`/`zh-cn`/`en-us`(다국어),
`high-value`, `dream`, `love`, `compatibility`, `physiognomy`, `palm-reading`, `face-reading`,
`oracle`, `maya`, `music`, `psychotest`, `stories`, `premium`/`premium-reports`.

결과 생성 방식은 두 갈래로 갈린다:
- **규칙 기반(AI 미사용, 결정론적)**: 오늘의 운세/띠별/별자리(`lib/fortune/*`), 관상(`AnalysisEngine.js`).
- **AI 기반**: 사주/자미두수/베다/타로 심화 리포트 — `lib/llm-client.ts`(Gemini `gemini-2.5-flash` REST 직접 호출 + Workers AI 폴백 체인 `@cf/zai-org/glm-4.7-flash`→`@cf/meta/llama-3.3-70b-instruct-fp8-fast`).

### C·D. 검색어 → 페이지 매칭

| 검색어(GSC/네이버 신호) | 현재 페이지 |
|---|---|
| 숙요점 / 숙요 궁합 | `app/sukuyo/page.js`, `app/sukuyo/compatibility/page.js` |
| 근거리/중거리/원거리 안괴 | 독립 페이지 아님 — `app/insights/seo-growth-articles.js`(slug `sukuyo-ankai`, h2 소제목으로만 존재), 라우트 `/insights/sukuyo-ankai` |
| 명궁 천동 | 독립 페이지 아님 — `app/ziwei` 허브 + `app/_lib/ziwei-star-interpretations.ts`의 별 해석 데이터 안에 매칭 |
| 타로카드 보는 법 | 정확 매칭 페이지 없음 — 근접 페이지 `app/tarot/guide/page.js` |
| 베다 점성술 / 인도 점성술 / 무료 점성술 | `app/vedic/jyotish/page.tsx`, `app/vedic/guide/page.js`, 허브 `app/vedic/page.js` — "무료 점성술" 전용 페이지는 없음 |
| 사수자리 오늘의 운세 | `app/fortune/[period]/[sign]/page.tsx` (동적 라우트, `lib/fortune/sign-profiles.ts`의 `sagittarius`) |

### E. 기존 기능과 신규 기능의 중복 여부
- 오늘의 운세/띠별/별자리 운세 = **이미 구현** → 신규 아님, CTA/내부링크 보강 대상.
- MBTI/심리테스트 = 라우트만 있고 로직은 외부 위탁 → **실질 공백**, 온사이트화가 필요하면 사실상 신규 구축.

### F~H. 난이도 / SEO 효과 / 비용 (정성 평가, 미정량화)
| 항목 | 난이도 | SEO 효과 | 비고 |
|---|---|---|---|
| `/fortune/[period]/` 허브 CTA 추가 | 매우 낮음 | 없음(전환 목적, 신규 색인 아님) | 이번 세션에서 완료(§3) |
| 나머지 9개 무료 결과 페이지 CTA | 중간 | 없음(전환 목적) | 정적 셸 vs App Router 구분 선행 필요 |
| 안괴/명궁 천동/타로가이드 내부링크·본문 보강 | 낮음~중간 | 중간(이미 노출 중인 페이지라 상한 있음) | 콘텐츠 큐레이션 위주 |
| MBTI/심리테스트 온사이트화 | 높음 | 큼(검색량 큰 키워드, 미정량화) | 신규 UI+채점 로직+5개 SSR 로케일(`lib/i18n/locales.ts`: ko/ja/zh/zh-TW/en) 대응+구조화 데이터, 다세션 필요 |

### I. 우선순위 (P0~P4, 실측 반영)

- **P0 — 보호 (조치 없음, 이번 세션에서 지켰음)**: 숙요점·숙요궁합·안괴·명궁 천동·타로 가이드·
  베다/인도점성술 페이지는 URL·canonical·구조 어디도 건드리지 않았다. 오타 디렉터리
  `app/sukyo/relationship-encyclopedia`(noindex+리다이렉트)는 기록만 하고 삭제하지 않았다.
- **P1 — 기존 신호 강화 (미착수)**: 안괴 인사이트 아티클(`/insights/sukuyo-ankai`) 본문 보강,
  `/tarot/guide` ↔ 무료 타로 ↔ AI 타로 내부링크 연결, "무료 점성술" 검색 의도에 대응하는
  랜딩 존재 여부 재검토. 다음 세션 후보 1순위.
- **P2 — 오늘의 운세류 (부분 완료)**: 기능 자체는 이미 있음. 남은 갭은 P4와 겹치는 CTA/내부링크
  보강뿐. 신규 페이지 생성 불필요.
- **P3 — MBTI/심리테스트 온사이트화 (미착수, 최대 규모)**: 외부 Replit 리다이렉트 구조를 사이트
  내 문항→채점→결과 플로우로 교체할지, 교체한다면 몇 종부터 시작할지는 별도 세션에서 Plan이
  필요하다. 참고 가능한 기존 인터랙티브 UI: `app/destiny-compass/_components/`(입력→진행→
  리포트 흐름), `app/tarot/crystal-soul/CrystalSoulTarotClient.jsx`(카드/원석 선택 UI). MBTI를
  의료·심리 진단처럼 표현하지 않는다는 브리프의 원칙은 유효하며, 온사이트화 착수 시에도
  지킬 것.
- **P4 — 무료→유료 CTA 연결 (부분 완료)**: `FusionCrossSell`이 `/today`·`/fortune/[period]/[sign]`·
  `/insights/[slug]`에 이미 있었고, 이번 세션에서 `/fortune/[period]/` 허브에 추가했다(§3).
  나머지 9곳은 §2에서 다룬다.

---

## 2. 다음 세션 선행 조사 항목 — CTA 공백 9곳

`app/saju/basic`, `app/ziwei/chart`, `app/astrology`, `app/vedic/jyotish`, `app/sukuyo`,
`app/tarot/healing`, `app/physiognomy`, `app/love`, `app/compatibility` — App Router 컴포넌트
레벨(`FusionCrossSell`/`cross-sell`/`fusion-fortune`/`useCoinGate`/`ensurePaidAccess` 키워드)에서는
CTA가 확인되지 않았다(2026-08-22 code-locator 조사).

**손대기 전에 반드시 개별 확인할 것**: 이 페이지들이 실제 "무료 결과 화면"인지, 아니면 SEO
소개 페이지(`SeoLandingTemplate` 공용 컴포넌트로 렌더되는 곳이 다수 확인됨)이고 진짜 결과는
정적 셸의 클라이언트 엔진(`js/saju-engine.js` 등, `docs/handoff/monetization-free-paid-boundary.md`
§0이 언급하는 "사주·자미두수·점성술·관상은 전량 클라이언트 계산" 구조)이 별도로 렌더하는지
페이지마다 다를 수 있다. 전자면 이번 PR과 같은 패턴(`FusionCrossSell` 추가)이 통하지만, 후자면
정적 셸 + `sync:public` 미러 양쪽을 고쳐야 하고 검증 방법도 완전히 달라진다
(`verify:public-parity`, `verify:entry-encoding` 등). 9곳을 한 번에 같은 방식으로 고치려 하지 말 것 —
`app/tarot` 안에서도 이미 `useCoinGate`를 직접 쓰는 결이 다른 페이지(`crystal-soul`,
`numerology`, `prompt-maker`)가 섞여 있어 사전 조사 없이 일괄 패턴을 적용하면 사고가 난다.

**재사용할 기존 CTA 부류 2가지** (신규 발명 금지):
1. 게이트를 열지 않는 단순 이동 링크 — `FusionCrossSell`(`next/link`만, `/fusion-fortune/`로 이동),
   또는 `app/fortune/prompt-hub/page.tsx:187-196`류의 `<Link href="/life-book-ai">` 패턴.
2. 클릭 시 결제 게이트를 직접 여는 CTA — React 훅 `app/hooks/useCoinGate.ts`의
   `ensurePaidAccess`(타로/나크샤트라 계열이 사용) 또는 더 저수준인 `runBillingCoinGate`
   (`app/ziwei-ai/ZiweiAiClient.tsx:913`, `app/vedic-ai/VedicAiClient.tsx:1323`가 사용). 셸 쪽
   `_cdOpenPaidServiceGate`는 React 번들 밖 정적 HTML 페이지 전용이라 App Router 페이지에는
   필요 없다.

`docs/context/payment-gating.md`의 "공유 게이트 우회 금지" 규칙은 2번 유형에만 해당한다. 1번
유형(단순 이동)은 게이트를 열지 않으므로 이 규칙과 무관하지만, 페이지 성격상 "지금 바로 더 깊은
분석"을 유도하려면 2번이 맞는 경우도 있을 수 있다 — 페이지별로 판단할 것.

---

## 3. 이번 세션에서 실행한 것

- `app/fortune/[period]/page.tsx`: `FusionCrossSell` import 추가 + "이어서 보기" 섹션과 하단
  면책 문구 사이에 `<FusionCrossSell fromPath={`/fortune/${period}`} tone="yeoni" />` 삽입.
  상세 페이지(`SignFortuneView.tsx:437`)와 동일한 배치·`tone` 값으로 일관성을 맞췄다.
- 이 문서(`docs/handoff/seo-content-expansion-roadmap.md`) 신설.

**하지 않은 것**: 신규 SEO 페이지 생성, 기존 URL/canonical/hreflang/sitemap/robots 변경, 12로케일
신규 카피 작성, MBTI/심리테스트 실제 구현, 나머지 9곳 CTA 추가, P1(기존 신호 강화) 착수.

---

## 4. 검증

```bash
npm run lint
npm run typecheck
npm run verify:paid-gate-price-coverage
```

- `git diff --name-only` — `app/fortune/[period]/page.tsx` + 이 문서 2개만 바뀌었는지 확인.
- dev 서버로 `/fortune/today` 등 접속해 허브 하단 CTA 렌더·스타일 일관성 육안 확인.
- `config/payment-freeze.json`에 `app/fortune/**`가 없어 매니페스트 갱신 불필요(2026-08-22 확인).
