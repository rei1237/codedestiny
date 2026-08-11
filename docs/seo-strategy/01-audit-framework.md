# SEO Audit — 분류 기준과 판정 절차

> [세트 인덱스](README.md) · 이 문서는 1/10부다.

## 1. 범위

이 문서는 **기능 허브·SEO 랜딩·유틸리티 라우트**(예: `/saju`, `/ziwei`, `/famous-saju`,
`/oracle/*`, `/flower/*`)를 대상으로 한다. `/insights/[slug]` 아티클 층은 이미
[docs/insight-hub-authoring.md](../insight-hub-authoring.md)가 KEEP/MERGE 판정과 저자 투입
파이프라인을 운영 중인 정본이므로 **이 문서는 그 범위를 다루지 않는다.** 아티클 층에서 [확정필요]로
남아 있는 잔여 통합 항목은 그 문서 §2를 따라 진행하고, 진행 상태만 필요 시 §5에서 인용한다.

## 2. 분류 기준

| 라벨 | 판정 조건 |
|---|---|
| **KEEP** | 실제 검색 유입/색인 신호가 있거나, 검색 의도와 정확히 일치하거나, 독창적 정보를 담고 있거나, 다른 콘텐츠의 허브 역할을 하거나, 브랜드 핵심 페이지 |
| **IMPROVE** | 내용은 유지할 가치가 있으나 SEO 구조가 약함(내부 링크 부족, 제목·검색의도 불일치, 과도하게 포괄적인 주제) |
| **MERGE** | 동일 데이터 소스 + 동일 핵심 검색 의도를 가진 페이지가 둘 이상 존재하고, 양쪽 모두 색인 대상인 경우(카니발라이제이션) |
| **DELETE** | 중복 콘텐츠, 트래픽·전환 모두 없음, 검색 의도가 불명확, SEO를 위해 억지로 만든 페이지 |

**MERGE와 DELETE는 URL을 실제로 없애는 조치이므로**, 판정 즉시 실행하지 않고
[04-url-architecture.md](04-url-architecture.md)의 예외 인정 기준을 통과해야 조치로 넘어간다
(기존 URL을 이유 없이 없애지 않는다는 세트 전체 원칙).

## 3. 판정 표 템플릿

전수 재검토 실행 시 아래 컬럼으로 채운다.

| URL | 유형(허브/스포크/유틸) | 색인 상태 | entity-registry 등록 여부 | 중복/근접 페이지 | 판정 | 근거 | 조치 오너 | 상태 |
|---|---|---|---|---|---|---|---|---|
| _(전수 재검토 시 append)_ | | | | | | | | |

## 4. 전수 재검토 실행 방법 (별도 세션)

1. 소스: 커밋된 `sitemap.xml`(정본) + `scripts/generate-sitemap.mjs`의 라우트 정의 + `app/` 디렉터리
   스캔.
2. 각 URL을 `lib/seo/entity-registry.mjs`의 `SEO_ROUTE_PROFILES`와 대조해 등록 여부를 표기.
3. 완전 중복 후보는 데이터 소스(어느 `lib/*-service.ts`를 참조하는지)를 grep으로 확인해 §2 MERGE
   조건("동일 데이터 소스")을 기계적으로 검증한다 — 추측으로 판정하지 않는다.
4. 실행은 이 세션 범위 밖. 착수 시 이 표를 append 방식으로 채운다.

## 5. 이번 감사에서 이미 확정된 항목 (조사 완료분)

| URL 쌍 | 판정 | 근거 | 상세 |
|---|---|---|---|
| `/famous-saju` vs `/insights/famous-saju` | MERGE 후보(예외 검토 중) | 둘 다 `lib/famous-saju/celebrity-saju-service.ts`의 동일 데이터 사용, 둘 다 sitemap 색인 대상, 헤드 키워드 겹침. 단 `/famous-saju/category/*`는 `/insights/famous-saju`가 대체 못 하는 고유 크롤링 URL 보유 | [04-url-architecture.md §3](04-url-architecture.md) |
| `/fusion-fortune` | KEEP(noindex 유지) | 결제 후 진입하는 클라이언트 렌더 상담 라우트. 2026-08-05 커밋에서 의도적 noindex — 버그 아님 | [02-topic-cluster-map.md §4](02-topic-cluster-map.md) |
| `/insights/fusion` | 신설 대상(공백 확인) | "초융합" 개념을 설명하는 색인 가능 페이지 부재 확인 | [06-content-roadmap.md P0](06-content-roadmap.md) |

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-11 | 최초 작성. famous-saju MERGE 후보와 fusion-fortune noindex 근거를 조사 완료분으로 기록 |
