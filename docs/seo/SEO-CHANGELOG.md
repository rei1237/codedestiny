# SEO-CHANGELOG

SEO 관련 변경(구조화 데이터·sitemap·메타·콘텐츠·인프라 등)을 역연대순으로
한 줄씩 남기는 로그. 원 요청("SEO 개편 22개 항목") 중 하나로 신설됐다
(`docs/handoff/2026-09-17-seo-p1-followup.md`).

**이 문서와 다른 두 문서의 역할 차이**
- `docs/seo/SEO_STATE.json`의 `history[]` — GSC/네이버 **지표 스냅샷**(클릭·노출·CTR 등)을
  관측 주기마다 저장. 사람이 읽는 변경 이력이 아니라 숫자 기록.
- `docs/handoff/*seo*.md` — 세션별 **상세 작업 로그**(조사 과정·근거·재현 명령 포함).
  이 changelog는 그 로그들을 한 줄로 압축해 훑어보기 쉽게 만든 색인이다. 상세는 각 항목의
  링크를 따라간다.

## 관례

앞으로 SEO 관련 변경을 커밋할 때마다 아래 목록 맨 위에 한 줄을 추가한다.
형식: `- YYYY-MM-DD: <한 줄 요약> (커밋/PR, [상세 문서](경로))`.

## 로그 (역연대순)

- 2026-09-18: `SEO-CHANGELOG.md`(이 문서) 신규 작성 — 원 요청 22개 중 P6 항목.
  ([2026-09-18-seo-p6-next-item.md](../handoff/2026-09-18-seo-p6-next-item.md))
- 2026-09-18: `SEO-KEYWORD-MAP.md` 신규 작성 — 원 요청 22개 중 P5 항목
  (`31fb5365f` 작성 + `013f527c1` 체크리스트 반영).
  ([2026-09-18-seo-p5-next-item.md](../handoff/2026-09-18-seo-p5-next-item.md),
  [SEO-KEYWORD-MAP.md](SEO-KEYWORD-MAP.md))
- 2026-09-17: 구조화 데이터 확장 — 홈페이지에 `SoftwareApplication`+`AggregateRating`
  추가(P4, `/reviews`는 noindex라 범위를 홈으로 변경). `948cc990b` → merge `9090784ef`.
  ([2026-09-17-seo-p4-structured-data.md](../handoff/2026-09-17-seo-p4-structured-data.md))
- 2026-09-17: sitemap 중복 제출 정리(P2, 옵션 A). `579e154dd`,
  check:fast(277 suites/3881 tests)·verify:sitemap-drift 통과.
  ([2026-09-17-seo-p2-sitemap-dedup.md](../handoff/2026-09-17-seo-p2-sitemap-dedup.md))
- 2026-09-17: P1 완료 — zh-TW 4허브 신설, compatibility 다국어화, 소개 페이지 FAQ 확장,
  sitemap lastmod 드리프트 정리 (`91326b771` 기준).
  ([2026-09-17-seo-p1-followup.md](../handoff/2026-09-17-seo-p1-followup.md))
- 2026-09-16: 영냥이 검색 유입 P0 — 천원사주 허브(`/yeongnyangi/1000-won-fortune/`) 신설,
  무료 랜딩 7곳에 허브 링크 추가. 운영 승격 `a3d1b471f`.
  ([yeongnyangi-seo-1000won-2026-09-16.md](../handoff/yeongnyangi-seo-1000won-2026-09-16.md),
  [YEONGNYANGI_SEARCH_STRATEGY.md](YEONGNYANGI_SEARCH_STRATEGY.md))
- 2026-09-14: SEO Growth 후속 확인 — 숙요 관계 검색어 페이지·표본 점검. 마지막 구현 커밋
  `6065e9c6a`.
  ([seo-growth-operations-20260908.md](../handoff/seo-growth-operations-20260908.md))
- 2026-09-08: 검색 유입 회복 후속 — 언어 초기화 수정, 홈 잔여 한국어 정리 착수. PR #1817
  머지 `ff2d524c6`.
  ([seo-search-recovery-20260908.md](../handoff/seo-search-recovery-20260908.md))
- 2026-09-08: (관측 주기 개선 묶음, `SEO_STATE.json.history[0]` 근거)
  - 일일 검사에 meta/HTTP noindex·canonical·robots·sitemap 누락 검출 추가.
  - 전체 감사의 HTTP `X-Robots-Tag` 누락 수정, 요청 timeout 추가.
  - 숙요·베다 비교 글의 계산 기준 혼동 수정, 결과 대조 절차 추가.
  - 정적 정책 생성기가 정본 모듈의 hreflang 반환 링크를 유지하도록 수정.
  - 일본어·영어·중국어 홈 신규 문구 번역, 일본어·중국어 제목 줄바꿈 보정.
  - 일본어 베다 소개·한국어 출생시각 FAQ의 입력 조건 설명 보완.
  ([SEO_STATE.json](SEO_STATE.json) `history[0]`)
- 2026-09-06: SEO·AdSense "가치 낮은 콘텐츠" 구조 보강(콘텐츠 신설 없음) — `/saju/guide`·
  `/nakshatra/codex/0`·`/ziwei-ai` 등에 검수 노트 보강, 인사이트 8편 보강.
  ([seo-adsense-structure-2026-09-06.md](../handoff/seo-adsense-structure-2026-09-06.md))
- 2026-09-05~06: SEO 진단 + AdSense 승인 최적화 Phase 2 — 2-1(#1595)·2-2(#1598) 머지,
  2-4 구현 완료.
  ([seo-adsense-phase2-2026-09-05.md](../handoff/seo-adsense-phase2-2026-09-05.md))
- 2026-08-30: 검색 수요 기반 SEO + 신규 콘텐츠 확장 로드맵 §2 닫힘(공백 0곳, 계측 이슈는
  PR로 처리).
  ([seo-content-expansion-roadmap.md](../handoff/seo-content-expansion-roadmap.md))
- 2026-08-29: 홈 CLS 회귀 대응 + 브랜드 색인 회복. PR #1288.
  ([home-cls-and-brand-seo-2026-08-29.md](../handoff/home-cls-and-brand-seo-2026-08-29.md))
- 2026-08-28: SEO 렌더 감사 후속(PR #1184·#1186 이후 잔여 항목).
  ([seo-followups-2026-08-27.md](../handoff/seo-followups-2026-08-27.md))
- 2026-08-28: 네이버 서치어드바이저 진단 대응(중복 제목/설명·lastmod 원장·IndexNow·sameAs·
  고아 페이지 조사).
  ([seo-naver-diagnostic-2026-08-16.md](../handoff/seo-naver-diagnostic-2026-08-16.md))
- 2026-08-16: SEO 작업 세션 — 비교 문서(`/compare/astrology-vs-myeongri` 등) 착수.
  ([seo-session-2026-08-16.md](../handoff/seo-session-2026-08-16.md))
- 2026-08-15~09-02: 색인 부진 대응 — 원인 3층 진단(도메인 신뢰도·GSC/GA4 인증 시점 등).
  ([seo-indexing-2026-08-15.md](../handoff/seo-indexing-2026-08-15.md))
