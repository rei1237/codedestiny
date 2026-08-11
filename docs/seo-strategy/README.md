# SEO 전략 문서 세트 — 감사 + 강화 (2026-08-11)

> 이 세트는 "사주 사이트 → 자미두수·숙요점·베다점성술·서양점성술·사주·타로 초융합 지식 플랫폼"으로
> SEO를 전면 재설계하라는 기획안을 코드베이스 조사 후 재해석한 결과다. **재설계가 아니라 감사+강화**로
> 방향이 확정됐다 — 기획안이 요구한 토픽 클러스터 비전(세부 개념 아티클, 체계 간 비교, 브랜드 별칭
> 색인화)이 `/insights/[slug]` 아래 100개+ 아티클과 기존 브랜드 인프라로 이미 상당 부분 구현되어
> 있었기 때문이다. 이 문서 세트는 "이미 지어진 것을 정확히 지도화하고, 실제로 비어 있는 지점만
> 식별"하는 데 집중한다.

## 1. 범위와 원칙

- 기존 URL을 이유 없이 대량 마이그레이션하지 않는다. 이미 검색 유입·색인이 걸려 있을 가능성이 높은
  구조를 그대로 유지한다.
- 정량 검색 트렌드 데이터(Google Trends, 네이버 데이터랩)는 확보 도구가 없어 이번 버전에 포함하지
  않는다. GSC/네이버 서치어드바이저 실측 데이터가 들어갈 자리는 마련하되, 값을 추정·창작하지 않고
  `[대기: ...]`로 비워 둔다.
- 신규 콘텐츠는 [06-content-roadmap.md](06-content-roadmap.md)의 **Page Value Gate**를 통과해야
  로드맵에 오를 수 있다. 검색량만 보고 콘텐츠를 양산하지 않는다.

## 2. 문서 목록

| 문서 | 다루는 것 |
|---|---|
| [01-audit-framework.md](01-audit-framework.md) | 기능 허브/랜딩/유틸리티 라우트의 KEEP/IMPROVE/MERGE/DELETE 분류 기준 |
| [02-topic-cluster-map.md](02-topic-cluster-map.md) | 자미두수·숙요점·베다·서양점성술·사주·타로·초융합 — 실제 존재하는 구조 지도 |
| [03-brand-seo-map.md](03-brand-seo-map.md) | "꿀꿀운세"/"꽃돼지" 등 브랜드 자산 인벤토리 |
| [04-url-architecture.md](04-url-architecture.md) | URL 유지 원칙 + 확인된 예외(중복 허브 등) |
| [05-redirect-plan.md](05-redirect-plan.md) | 위 예외에 한정된 리다이렉트 계획 |
| [06-content-roadmap.md](06-content-roadmap.md) | Page Value Gate 기반 P0~P3 콘텐츠 로드맵 |
| [07-internal-link-graph.md](07-internal-link-graph.md) | `entity-registry.mjs` 토픽 클러스터 링크 현황과 감사 방법 |
| [08-technical-seo-checklist.md](08-technical-seo-checklist.md) | 기술부채 체크리스트(SEO 유틸 파편화, GSC 미인증 등) |
| [09-measurement-plan.md](09-measurement-plan.md) | GSC/네이버 연동 후 추적할 지표와 실측 데이터 입력 자리 |
| [10-feedback-loop.md](10-feedback-loop.md) | 검색데이터 → 콘텐츠 결정 순환 구조와 기존 `verify:*`/`seo:*` 스크립트 연결 |

## 3. 기존 문서와의 관계

이 세트는 기존 SEO 운영 문서를 대체하지 않는다. 겹치는 부분은 링크만 하고 내용을 복제하지 않는다.

| 기존 문서 | 역할 | 이 세트가 침범하지 않는 이유 |
|---|---|---|
| `docs/insight-hub-authoring.md` | `/insights/[slug]` 아티클 층의 KEEP/MERGE 원장(저자 투입 파이프라인, 통합 완료 이력) | **인사이트 아티클 층의 정본.** 이 세트는 그 위 계층(기능 허브·랜딩·유틸리티 라우트)만 다룬다 |
| `docs/seo-before-after.md` | 2026-07 SEO 리팩터의 변경 전/후 스냅샷 | 과거 히스토리 기록물 — 갱신하지 않는다 |
| `docs/seo-deploy-checklist.md` | 배포 시점 실행 체크리스트(로컬 검증 → 제출 → Day7/14/30 추적) | 1회성 배포 운영 절차 — [08](08-technical-seo-checklist.md)/[09](09-measurement-plan.md)/[10](10-feedback-loop.md)은 링크만 한다 |
| `SEO_SUBMISSION_GUIDE.md`(루트) | GSC/네이버/Bing/다음 등록 조작법 | 콘솔 조작 가이드 — [03](03-brand-seo-map.md)/[09](09-measurement-plan.md)은 링크만 한다 |

## 4. 실행 순서 권장

`01`(분류 기준 확정) → `02`·`03`(기존 구조 문서화, 병렬 가능) → `04`·`05`(01에서 나온 예외만 처리)
→ `06`(02에서 드러난 공백 기반 로드맵) → `07`·`08`(기술 감사, 병렬 가능) → `09`·`10`(사후 운영 단계).

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-11 | 세트 최초 작성. 자미두수/숙요점/베다/서양점성술/사주/타로 세부 콘텐츠와 브랜드 SEO 자산이 이미 상당 부분 구현되어 있음을 확인하고, 원 기획안의 "제로베이스 재설계"를 "기존 자산 감사+강화"로 재조정. `/insights/fusion` 허브 신설(별도 PR)과 `lib/seo.v2.ts` 죽은 export 정리(별도 PR)를 병행 |
