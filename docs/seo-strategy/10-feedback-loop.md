# SEO Feedback Loop

> [세트 인덱스](README.md) · 이 문서는 10/10부다. 검색데이터 → 콘텐츠 결정 순환 구조를 기존
> `verify:*`/`seo:*` 스크립트와 연결한다. 새 자동화 스크립트를 설계하지 않는다 — 있는 것을 순서대로
> 배치한다.

## 1. 순환 구조

```
09 측정(GSC/네이버 데이터)
  → 01 감사 재분류 트리거(IMPROVE/MERGE/DELETE 재판정)
  → 06 로드맵 우선순위 조정(P0~P3 재배치)
  → (필요시) 04/05 예외·리다이렉트 추가
  → 구현
  → 08 체크리스트 갱신 + verify 재검증
  → 09 복귀
```

## 2. 단계별 오너·산출물

| 단계 | 오너 | 산출물 |
|---|---|---|
| 측정 | 데이터 확보 담당(GSC/네이버 접근 권한 보유자) | [09](09-measurement-plan.md) 표 갱신 |
| 감사 재분류 | 콘텐츠/SEO 담당 | [01](01-audit-framework.md) 판정 표 갱신 |
| 로드맵 조정 | 콘텐츠/SEO 담당 | [06](06-content-roadmap.md) P0~P3 재배치 |
| 구현 | 개발 담당 | 코드 변경 + PR |
| 검증 | 개발 담당 | §3 게이트 통과 |

## 3. 트리거 규칙

| 신호 | 조치 |
|---|---|
| 특정 클러스터 CTR 저조(노출은 있는데 클릭 없음) | [01](01-audit-framework.md)에서 해당 페이지 IMPROVE로 재분류(제목/설명 검색의도 불일치 의심) |
| GSC 검색어 리포트에서 신규 non-brand/롱테일 질의 발견 | Page Value Gate 통과 시 [06](06-content-roadmap.md) P1로 승격 |
| 두 페이지가 같은 질의에서 경쟁(자기잠식) 확인 | [04](04-url-architecture.md) 예외 후보로 등록 |
| 색인 커버리지 리포트에서 "noindex 있음" 경고 | `public/_headers`의 noindex 목록과 `scripts/generate-sitemap.mjs`의 `noindexPathPrefixes` 동기화 확인(기존 운영 절차, `SEO_SUBMISSION_GUIDE.md §5` 이미 명시) |

## 4. 자동 게이트 연결 (구현 후 검증 단계에 고정 배치)

`npm run lint` → `npm run typecheck` → `npm run seo:generate` → `npm run verify:sitemap` →
`npm run verify:seo-entity-registry` → `npm run build:cf`(postbuild의 `verify:adsense-readiness`가
최종 안전망). 신규 스크립트를 만들지 않고 기존 게이트를 그대로 재사용한다.

## 5. 운영 로그

이 표가 루프의 실행 기록장 역할을 한다.

| 날짜 | 트리거 소스 | 변경된 문서 | 요약 |
|---|---|---|---|
| 2026-08-11 | 최초 감사(코드베이스 조사) | 전체 세트(01~10) | 원 기획안의 "제로베이스 재설계"를 "기존 자산 감사+강화"로 재조정. `/insights/fusion` 공백 확인(P0), famous-saju 카니발라이제이션 확인(예외 후보, 확정 대기) |

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-11 | 최초 작성. 순환 구조와 트리거 규칙 정의, 운영 로그 첫 행 기록 |
