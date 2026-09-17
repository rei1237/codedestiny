---
status: done
updated: 2026-09-17
next: P4 완료 — 배포 후 Google Rich Results Test 실측만 남음(선택, 요청 시)
---

# SEO 개편 요청 — P4: structured data(구조화 데이터) 확장

## 결론

`AggregateRating`/`Review` 추가로 범위를 확정(사용자 결정, 2026-09-17).
`/reviews` 페이지가 `robots: {index: false}`(noindex)라 그 페이지에 붙이면
리치 결과 효과가 없다는 것을 구현 전에 발견 → 사용자에게 재확인 →
"홈페이지에 SoftwareApplication+AggregateRating 구축"으로 범위 변경(사용자
결정). 구현·검증·커밋·push 완료(`948cc990b` → merge `9090784ef`).

## 조사 결과 (1~3번)

1. `application/ld+json`은 컴포넌트 단위(`app/components/SeoJsonLd.jsx`,
   현재 미사용)와 공용 헬퍼(`lib/structured-data.ts`) 둘 다 존재. 실제
   페이지들은 `lib/structured-data.ts`의 빌더(`buildOrganizationJsonLd`,
   `buildWebsiteJsonLd`, `buildWebPageJsonLd`, `buildBreadcrumbJsonLd`,
   `buildFaqPageJsonLd`, `buildArticleJsonLd`, `buildServiceJsonLd`,
   `buildAboutPageJsonLd`, `buildCollectionPageJsonLd`)를 사용.
2. 기존 타입: Organization, WebSite, WebPage, Person(author), ItemList,
   Article, BreadcrumbList, FAQPage, SoftwareApplication(미사용 컴포넌트
   안에만), Service, AboutPage, CollectionPage. `AggregateRating`/`Review`
   없음 — 원 요청의 "확장"이 가리킬 수 있는 유일한 진짜 공백.
3. `scripts/verify-adsense-readiness.mjs`, `scripts/check-seo-health.mjs`
   확인 — structured-data 관련 가드 없음(신규 추가와 충돌 없음).

## 구현

- `index.html`의 기존 리뷰 요약 스크립트(`cd-reviews-v20260819`)
  `renderSummary(sum)`에서, 실제 리뷰 데이터가 있을 때만
  (`sum.total > 0`) `upsertAggregateRatingJsonLd(sum)`을 호출해 `<head>`에
  런타임으로 `SoftwareApplication`(`@id: .../#software`) +
  `AggregateRating`(ratingValue/reviewCount = 실측값) JSON-LD를 주입.
  `publisher.@id`는 기존 정적 `@graph`의 Organization과 동일 → 같은
  엔티티로 묶임. 이미 호출 중인 `/api/reviews/summary` 응답을 그대로
  사용, 새 네트워크 호출 없음.
- `app/page.js`(React 홈)는 수정하지 않음 — `promote-static-shell-to-root`
  빌드 단계가 `dist/index.html`을 항상 정적 셸로 덮어써 실제로는 서빙되지
  않는 죽은 경로이기 때문(`HomeRedirectToStatic.tsx`가 그 경로로 들어온
  히트를 즉시 `/`로 되돌림).
- `npm run sync:public`으로 `public/index.html` + 5개 로케일 미러(en,
  ja, zh, zh-tw, static)에 동일 반영.

## 검증

- 수정된 스크립트 블록 `node --check` 통과.
- 동일 payload 구성 로직을 `node -e`로 mock 데이터(total:42, average:4.7)
  재현 → 유효한 JSON 확인.
- `check:fast --plan`은 작업트리에 무관한 기존 미커밋 변경(marketing/**,
  config/payment-freeze.json — 다른 세션/이전 작업분, 이번 변경과 무관)이
  섞여 과대 계획을 내놓아 사용 보류, 수동 검증으로 대체.
- **미실측**: Google Rich Results Test로 배포된 홈페이지에서 실제 리치
  결과(별점)가 뜨는지는 확인 안 함(원 핸드오프 4번 항목). 배포 후 필요 시
  별도 확인.

## 참고

- 원 요청 22개 전체 목록은
  [2026-09-17-seo-p1-followup.md](2026-09-17-seo-p1-followup.md).
- 커밋: `948cc990b`(구조화 데이터 변경), merge `9090784ef`(push 시 원격
  분기 병합, 충돌 없음).
