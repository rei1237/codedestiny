# Content Roadmap — P0~P3

> [세트 인덱스](README.md) · 이 문서는 6/10부다. [02-topic-cluster-map.md](02-topic-cluster-map.md)에서
> 드러난 공백만을 대상으로 한다. 신규 콘텐츠 수백 개를 한 번에 만들지 않는다 — 우선순위를 매겨
> 후속 세션에 순차적으로 넘긴다.

## 1. 원칙

키워드만 바꾼 반복 페이지, 검색량만 보고 만든 저차별성 콘텐츠는 만들지 않는다. 모든 신규 항목은
**Page Value Gate**를 통과해야 한다.

## 2. Page Value Gate

아래 6개 중 **5개 이상** 충족해야 페이지를 생성한다:

1. 실제 검색 의도가 존재하는가
2. 독립적인 정보가 존재하는가(기존 정보 재구성이 아니라 실질적으로 다른 내용)
3. 다른 페이지와 중복되지 않는가
4. 내부 링크 가치가 있는가(허브·스포크 구조에 자연스럽게 연결되는가)
5. 사용자에게 실제 도움이 되는가
6. 서비스와 자연스럽게 연결되는가

## 3. 우선순위 등급

| 등급 | 정의 |
|---|---|
| P0 | 즉시 착수 — 이번 세션에서 별도 PR로 병행 진행 |
| P1 | 다음 세션 착수 권장 — 근거가 이미 확인됨 |
| P2 | 검증(등록/구현 난이도 확인) 후 착수 |
| P3 | 장기 백로그 |

## 4. P0 — `/insights/fusion` 콘텐츠 허브

Page Value Gate 체크:
1. 검색 의도 ✅("초융합 운세"/"AI 초융합 운세" 등 브랜드 고유 질의 + 일반 "여러 운세 같이 보기" 의도)
2. 독립 정보 ✅(기존 비교 아티클 4편을 큐레이션 연결하는 신규 개념 설명 페이지, 콘텐츠 창작 아님)
3. 비중복 ✅([01-audit-framework.md §5](01-audit-framework.md)에서 공백 확인됨)
4. 내부 링크 가치 ✅(`ziwei-vs-saju`, `sukuyo-vs-saju-compatibility`, `astrology-vs-saju-differences`,
   `saju-and-tarot-combined-reading-framework`를 한 허브로 묶음)
5. 사용자 도움 ✅("초융합"이 무엇인지 무료로 이해한 뒤 유료 서비스로 넘어가는 경로 제공)
6. 서비스 연결 ✅(`serviceCtaPath="/fusion-fortune"`)

→ 6/6 충족, 승인. 구현은 별도 PR(이 세션 내 병행 진행)로 처리하고 이 문서는 추적만 한다.

## 5. P1 — 다국어(ja/zh/en) SSR 커버리지 확장

현재 SSR 다국어 지원은 `home`/`ziwei`/`sukuyo`/`today`/`insights`(허브+아티클) 5개 라우트군뿐이다.
사주·타로·서양점성술·베다는 다국어 전용 정적 랜딩이 없다(한국어 페이지 내 `generateMetadata`로
다국어 메타데이터만 처리하는 경우가 대부분). 확장 후보 우선순위(착수 전 실제 해외 검색 의도 재확인
필요 — [09](09-measurement-plan.md) §6 로케일별 실적 템플릿 참고):

| 후보 | 근거 |
|---|---|
| `/ja/saju` | 일본어권 "四柱推命" 검색 의도 존재(`SEO_SUBMISSION_GUIDE.md §7`에 이미 타겟 키워드 기록됨) |
| `/ja/tarot`, `/ja/astrology` | 기존 ja 인프라(hreflang, locale 라우팅)를 그대로 재사용 가능 |
| `/en/*`, `/zh/*` 동일 확장 | ja 확장 패턴 검증 후 순차 적용 |

## 6. P2 — entity-registry 미등록 허브 보강

[02-topic-cluster-map.md §10](02-topic-cluster-map.md)에서 확인된 미등록 허브(`/insights/*` 8개
서브허브, `/oracle/sukuyo`, `/nakshatra/codex/[index]`, `/famous-saju`)의 registry 등록 여부는
[08-technical-seo-checklist.md](08-technical-seo-checklist.md)에서 구현 난이도(등록 시
`verify:seo-entity-registry` 전체 계약 충족 필요)를 먼저 확인한 뒤 착수한다.

## 7. P3 — 장기 백로그

- famous-saju 통합 후 콘텐츠 차별화([04-url-architecture.md §3](04-url-architecture.md) 확정 이후)
- sameAs 확장([03-brand-seo-map.md §3](03-brand-seo-map.md)의 SNS 채널 공백 — 운영 결정 필요)
- 전수 재검토([01-audit-framework.md](01-audit-framework.md))로 새로 드러나는 IMPROVE 대상

## 8. 신규 항목 제안 절차

새 콘텐츠 아이디어가 나오면 §2 Page Value Gate 표를 채워 이 문서에 append한다. 5개 미만 충족 시
보류(P3에도 넣지 않음 — 근거 불충분 항목은 로드맵에 올리지 않는다).

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-11 | 최초 작성. P0(`/insights/fusion`) Page Value Gate 통과 확인, P1(다국어 확장) 근거 기록 |
