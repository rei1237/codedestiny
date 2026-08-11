# Internal Link Graph — 감사 설계

> [세트 인덱스](README.md) · 이 문서는 7/10부다. `getTopicClusterLinks()` 실사용 현황의 **감사 방법을
> 설계**한다. 전량 실행은 별도 세션.

## 1. 목적

`lib/seo/entity-registry.mjs`가 관리하는 토픽 클러스터 링크가 실제로 렌더되고 있는지, 등록되지 않은
페이지가 고아(orphan) 상태인지 확인한다.

## 2. 대상 범위

1차: registry 등록 18개 노드(17 core + `FUSION_FORTUNE_PROFILE`). 인사이트 아티클 층(`/insights/[slug]`
100개+)은 §5에서 별도 다룬다 — registry가 아니라 `app/insights/seed-articles.js`의 prev/next/related
로직으로 관리되는 별도 계층이기 때문이다.

## 3. 이미 확인된 사실 (2026-08-11 조사)

- `getTopicClusterLinks()`를 실제로 소비하는 렌더 컴포넌트는 **`app/components/SeoLandingTemplate.jsx`
  1곳뿐**이다(`getSeoRouteProfile`/`getTopicClusterLinks` import, `buildRelatedServices()`에서 사용).
- `SeoLandingTemplate`은 20개 파일에서 사용된다: `/ziwei`, `/tarot`, `/tarot/reunion`, `/today`,
  `/vedic`, `/saju`, `/sukuyo/compatibility`, `/sukuyo`, `/premium`, `/premium-reports`,
  `/pdf/love-report`, `/physiognomy`, `/love`, `/manse`, `/dream`, `/daily-fortune`, `/astrology`,
  `/compatibility`, `/saju/compatibility` 등. 즉 **registry에 등록된 허브는 실제로 "관련 서비스" 링크가
  렌더된다** — 설계와 구현이 일치함.
- `/insights/*` 서브허브 8개는 이 템플릿을 쓰지 않고 `InsightTopicArchive.jsx`를 쓰므로, registry
  기반 상호링크의 대상이 아니다(등록 안 된 것과 별개로, 애초에 다른 렌더 경로).

## 4. 감사 절차 (전량 실행 시)

1. `getSeoRouteProfile`/`getTopicClusterLinks` 호출처 grep(§3에서 이미 1건 확인 — 재검색 시 증가
   여부만 확인).
2. `SeoLandingTemplate`을 쓰는 20개 파일 각각에서 `relatedServices`가 실제로 화면에 렌더되는지(조건부
   숨김 로직 없는지) 확인.
3. `app/` 전역 `href="/..."` grep으로 인바운드 링크 집계 → registry의 `relatedPaths`와 대조해 누락된
   양방향 링크 후보 확인(예: A→B는 있는데 B→A는 없는 경우).
4. `sitemap.xml`과 대조해 registry에도 SeoLandingTemplate에도 안 걸리는 완전 고아 페이지 후보 산출.

## 5. 산출 표 템플릿

| 노드 | registry 등록 | outbound 수(relatedPaths) | 렌더 확인 | 추정 inbound 수 | 고아 위험 | 비고 |
|---|---|---|---|---|---|---|
| _(전량 실행 시 18개 노드 + 미등록 후보 append)_ | | | | | | |

## 6. 인사이트 아티클 층 별도 감사

`app/insights/seed-articles.js`의 prev/next/related 로직을 기준으로 하고,
`docs/insight-hub-authoring.md §1-4`의 품질 기준(본문 첫 1,800자 지문 중복 금지)과 함께 감사한다.
이 세트에서 별도 구현하지 않는다.

## 7. 도구화 메모

`scripts/verify-seo-entity-registry.mjs`는 registry **구조**(고유 primary 키워드, `relatedPaths`가
전부 존재 등) 무결성만 검사하고, 실제 렌더 여부나 인바운드 카운트는 검사하지 않는다. §4의 감사
절차를 스크립트화하려면 이 검증기를 확장하거나 별도 스크립트를 만들어야 한다 — 이번 세션 범위 밖.

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-11 | 최초 작성. `SeoLandingTemplate.jsx`가 유일한 소비처임을 확인, 20개 사용처 목록화 |
