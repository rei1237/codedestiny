# SEO 변경 전/후 비교표

| 항목 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 인사이트 아카이브 | 클라이언트 fetch 실패 시 0건 노출 가능 | SSR 초기 데이터(Seed)로 최소 글 목록 보장 |
| 인사이트 상세 | API 의존도 높음 | seed fallback + related/prev/next SSR 보장 |
| 랜딩 구조 | 일부 키워드만 대응 | 사주/자미두수/숙요점/점성술/베다/관상 포함 허브 확장 |
| canonical 정규화 | `sukyo`, `face-reading` 혼재 | `sukuyo`, `physiognomy`로 표준화 + 레거시 redirect |
| robots 정책 | 사설 경로 차단 일관성 부족 | `/admin/`, `/me/`, `/mypage/private/` disallow 정리 |
| sitemap 범위 | 일부 핵심 허브 누락 가능 | 핵심 랜딩 + 인사이트 카테고리 허브 + 상세 확장 |
| 브랜드 메타 | 브랜드 질의 대응 약함 | layout/about/footer 중심 브랜드 신호 강화 |
| 홈 페이지 SEO | 허브 성격 미약 | 서비스 링크 + 최신 인사이트 SSR 허브화 |
| 구조화 데이터 | 페이지별 편차 큼 | 공통 JSON-LD 빌더 + 랜딩 Service schema 확장 |
| 운영 검증 | 수동 점검 중심 | `scripts/seo-audit.mjs` 자동 점검 도입 |

## 핵심 기대 효과

1. `/insights` 0건 노출 리스크 감소
2. 자미두수/숙요점 희소 키워드 클러스터 색인 확장
3. 랜딩-카테고리-상세 내부링크 강화로 크롤링 효율 개선
4. 브랜드 키워드(꿀꿀 만세력/코드 데스티니/Code Destiny) 회복 기반 확보
