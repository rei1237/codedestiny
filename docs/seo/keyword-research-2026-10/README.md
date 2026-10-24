# 키워드 확장 조사 — 2026-10

status: 수집 완료, 검색량·문서 수 대기

## 목적

대형 키워드(H)는 모두 대표 허브에 넣는다. 수요는 있으나 경쟁이 적은 틈새 키워드(N)와 정보형 롱테일(L)은 이미 있는 대표 URL의 본문과 FAQ로 흡수한다. 수요가 실측됐고 기존 페이지와 의도가 다른 클러스터만 신규 가이드로 만든다(최대 10개).

## 실행

```
node scripts/seo/keyword-research.mjs collect   # 네이버·구글 자동완성 확장 (키 불필요, .cache에 캐시)
node scripts/seo/keyword-research.mjs enrich    # 검색광고 API 조회수 + 검색 API 문서 수 (.env.local 키 5개)
node scripts/seo/keyword-research.mjs report    # 등급·대표 URL 배정 → keywords.csv, summary.json
node --test scripts/seo/keyword-research.test.mjs
```

`enrich`에 필요한 키: `NAVER_SEARCHAD_CUSTOMER_ID`, `NAVER_SEARCHAD_ACCESS_LICENSE`, `NAVER_SEARCHAD_SECRET_KEY`, `NAVER_OPENAPI_CLIENT_ID`, `NAVER_OPENAPI_CLIENT_SECRET`.

## 2026-10-24 수집 결과

| 항목 | 값 |
| --- | --- |
| 시드 | 상품·체계명 약 130개 × 수식어 12개, 핵심 시드는 초성 14개 추가 |
| 질의 | 3,179회(2단계 재확장 포함), 실패 0 |
| 고유 자동완성 | 9,854개 |
| 제외·미배정 뒤 후보 | 6,930개. 이 중 1,369개는 네이버와 구글 양쪽 자동완성에 나타남(S2) |

## 등급

| 등급 | 조건 | 적용 위치 |
| --- | --- | --- |
| H | 월 조회 1만 이상 | 대표 허브 title·H1·description·첫 문단 |
| N | 월 조회 100 이상, 포화도(블로그 문서 수 ÷ 월 조회)가 하위 25% | 대표 URL의 H2 섹션·FAQ, 내부 링크 앵커 |
| L | 정보형(뜻·보는법·종류·차이) 월 조회 50 이상 | FAQ·해설 문단 |
| M | 월 조회 100 이상이지만 포화도가 높음 | 메타 keywords·관련 링크 정도 |
| W | 월 조회 100 미만 | 보류 |
| S2 / S1 | 검색량 미조회. 양쪽 자동완성 / 한쪽 자동완성 | `enrich` 전 임시 등급 |

## 근거와 해석 제한

- `evidence` 열은 `naver-ac`, `google-ac`, `searchad-related` 중 실제로 나온 출처만 적는다. 자동완성은 수요가 있다는 신호이지 검색량이 아니다.
- 검색량을 추정하지 않는다. 검색광고 도구가 돌려주지 않은 키워드는 빈칸이며 0으로 해석하지 않는다. `< 10` 표시는 5로 계산한다.
- 검색광고 `compIdx`는 광고 경쟁이며 자연 검색 난이도가 아니다. 경쟁도는 문서 수 기반 포화도로 본다. 순위를 보장하는 지표는 아니다.
- 대표 URL은 `scripts/seo/keyword-research.mjs`의 `URL_RULES`가 정한다. 기준은 [검색 의도와 대표 URL](../2026-10-18-search-rebuild.md#검색-의도와-대표-url) 표다.
- 제외 대상:
  - 동음이의어: 영화 「관상」, 라그나로크, 전생 애니, 타로 음료, 명궁 식당 등
  - 다른 업체나 사람 이름
  - 커뮤니티 수식어(디시, 더쿠)
  - 지역 오프라인 수요
  - 전화 상담, 개명 행정 절차
  - 성인 의도, 제왕절개·출산 택일
