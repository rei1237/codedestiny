# 키워드 → 대표 페이지 맵 (묶음 2-2)

작성일 2026-11-14. 검색어 하나에 대표 페이지를 하나만 정해 두고, 같은 검색어를 노리는 다른 페이지가 있으면 역할을 나눈다. **이 문서는 표만 정리한 것이고 코드에는 아무것도 적용하지 않았다.**

근거

- 대표 URL: `docs/seo/2026-10-18-search-rebuild.md`의 "검색 의도와 대표 URL" 표, `scripts/seo/keyword-research.mjs`의 `URL_RULES`.
- 현재 제목: 묶음 1 빌드 결과의 `<title>`(`docs/seo/meta-table.md` §4).
- 검색량: `docs/seo/2026-10-18-search-rebuild.md`가 인용한 2026-10-08 네이버 검색광고 관측값(PC+모바일 월간 합산)만 옮겼다. **지금 다시 잰 값이 아니다.** 근거가 없는 칸은 "미확인"이다.
- 표의 URL은 모두 `sitemap-ko.xml`에 있는 색인 대상이다.

## 1. 대표 페이지

| 검색어 묶음 | 대표 페이지 | 월간 검색량(2026-10-08 관측) | 같은 검색어를 노리는 다른 페이지 | 겹침 |
|---|---|---|---|---|
| 꿀꿀 운세(서비스 이름) | `/` | 미확인 | `/ggulggul/`, `/about/` | 있음 — §2-1 |
| 꽃돼지 운세, 연이 운세 | `/ggulggul/` | 미확인 | `/` | 있음 — §2-1 |
| 사주보는 고양이, 영냥이 | `/yeongnyangi/` | 미확인 | 없음 | 없음 |
| 사주, 사주풀이, 사주팔자, 오행 | `/saju/` | 미확인 | `/manse/`, `/saju/free/` | 있음 — §2-2 |
| 무료사주 | `/saju/free/` | 30,770 | `/saju/`, `/manse/` | 있음 — §2-2 |
| 만세력 | `/manse/` | 140,300 | `/saju/` | 있음 — §2-2 |
| 궁합 | `/compatibility/` | 미확인 | `/saju/compatibility/`, `/sukuyo/compatibility/` | 있음 — §2-3 |
| 사주 궁합 | `/saju/compatibility/` | 미확인 | `/compatibility/` | 있음 — §2-3 |
| 오늘의 운세 | `/today/` | 미확인 | `/fortune/`, `/fortune/today/` | 있음 — §2-4 |
| 내일 운세 | `/fortune/tomorrow/` | 21,260 (내일운세) | `/today/`, `/fortune/` | 있음 — §2-4 |
| 띠별 운세, 별자리 운세 | `/fortune/` | 미확인 | `/fortune/today/` | 있음 — §2-4 |
| 신년운세, 2027 운세, 토정비결 | `/new-year-ai-consultation/` | 미확인 | `/fortune/2027/`, 인사이트 글 2개, `/tarot/year/` | 있음 — §2-5 |
| 2027 띠별 운세, 삼재 | `/fortune/2027/` | 미확인 | `/new-year-ai-consultation/` | 있음 — §2-5 |
| 자미두수, 자미두수 사이트, 무료 자미두수 | `/ziwei/` | 13,700 / 770 / 290 | `/ziwei/chart/` | 있음 — §2-6 |
| 타로, 속마음 타로 | `/tarot/` | 미확인 | 없음 | 없음 |
| 재회 타로, 재회운 | `/tarot/reunion/` | 940 / 1,740 | `/love/` | 있음 — §2-7 |
| 연애운 | `/love/` | 미확인 | `/tarot/reunion/` | 있음 — §2-7 |
| 숙요점, 숙요점 사이트 | `/sukuyo/` | 410 / 550 | `/sukuyo/compatibility/` | 없음(궁합만 §2-3) |
| 베다점, 인도 점성술 | `/vedic/` | 미확인 | 없음 | 없음 |
| 점성술, 네이탈 차트, 상승궁 | `/astrology/` | 미확인 | 없음 | 없음 |
| 꿈해몽 | `/dream/` | 미확인 | 없음 | 없음 |
| 작명 | `/naming-ai/` | 미확인 | 없음 | 없음 |
| 사주와 자미두수 차이 | `/compare/saju-vs-ziwei/` | 미확인 | `/ziwei/`(설명에 "사주와의 차이") | 약함 |

## 2. 겹치는 곳과 역할 나누기(제안)

### 2-1. 서비스 이름: `/` · `/ggulggul/` · `/about/`
- 지금: `/`의 제목은 "꿀꿀 운세 · 운세보는 영냥이 | 서비스 선택", `/ggulggul/`은 "꽃돼지 연이 운세 | 사주·타로 시작하기 – 꿀꿀 운세". hreflang의 ko·x-default는 `/ggulggul/`에만 있고 `/`에는 hreflang이 없다.
- 제안: "꿀꿀 운세" = `/`, "꽃돼지·연이" = `/ggulggul/`, "운영자·기준" = `/about/`. 홈 제목은 `docs/seo/meta-table.md` §1에서, 홈 이원화는 `docs/seo/bundle2-decisions.md` §2에서 사용자 결정을 기다린다.

### 2-2. 사주: `/saju/` · `/manse/` · `/saju/free/`
- 지금: 세 페이지 설명이 모두 "생년월일로 … 무료로 확인"으로 시작한다. 제목은 "사주 원국 확인·사주팔자 해석 안내" / "무료 만세력 보는 법" / "무료 사주 모음"으로 나뉘어 있다.
- 제안: `/saju/` = 사주 해석을 읽는 법, `/manse/` = 만세력(원국·오행 표), `/saju/free/` = 결제 없이 볼 수 있는 것 모음. 설명의 첫 문장도 이 역할대로 서로 다르게 쓴다(`meta-table.md` §4-1의 제안).

### 2-3. 궁합: `/compatibility/` · `/saju/compatibility/` · `/sukuyo/compatibility/`
- 지금: `/compatibility/`는 방법 비교("무료 안내·사주·숙요점·타로 비교"), `/saju/compatibility/`는 유료 분석 상품 안내다. 역할은 이미 나뉘어 있다.
- 제안: 유지. "궁합"만 치고 온 사람은 `/compatibility/`, "사주 궁합"은 `/saju/compatibility/`.

### 2-4. 오늘·내일 운세: `/today/` · `/fortune/` · `/fortune/today/` · `/fortune/tomorrow/`
- 지금: `/today/`는 4체계 비교 허브, `/fortune/`은 띠·별자리 무료 운세 허브, `/fortune/today/`·`/fortune/tomorrow/`는 날짜별 페이지다. 2026-11-13에 다른 세션이 오늘·내일 차별화를 운영에 반영했다(`docs/seo/2026-11-13-today-tomorrow-overlap-*.json`).
- 제안: 그 세션의 결과를 따르고 여기서 다시 정하지 않는다. `/tomorrow/`라는 페이지는 없다.

### 2-5. 신년운세: `/new-year-ai-consultation/` · `/fortune/2027/` · 인사이트 2개 · `/tarot/year/`
- 지금: `/new-year-ai-consultation/`은 유료 신년 상담 상품 안내("2027 신년운세 보는 곳"), `/fortune/2027/`은 무료 12띠 운세·삼재다. 인사이트는 `/insights/new-year-fortune-framework/`, `/insights/saju-2027-monthly-planning-framework/`.
- 제안: "신년운세·토정비결" = `/new-year-ai-consultation/`, "띠별·삼재" = `/fortune/2027/`, 인사이트는 읽을거리로 두 페이지에 링크. 자세한 안은 `docs/seo/bundle2-decisions.md` §1.

### 2-6. 자미두수: `/ziwei/` · `/ziwei/chart/`
- 지금: `/ziwei/`는 "무료 자미두수 명반 계산기·12궁 풀이", `/ziwei/chart/`는 "심화 자미두수 상담 · 12궁·사화·대한 해석".
- 제안: "자미두수·무료 자미두수" = `/ziwei/`, "자미두수 심화·상담" = `/ziwei/chart/`. 묶음 1에서 `/ziwei/`의 버튼이 `/ziwei/chart/`로 가게 했으므로, 그 화면이 처음에 무엇을 보여 주는지 확인한 뒤 `/ziwei/chart/` 제목을 정한다(`meta-table.md` §4-1).

### 2-7. 재회·연애: `/love/` · `/tarot/reunion/`
- 지금: `/love/`는 "무료 연애운 | 사주로 보는…", `/tarot/reunion/`은 재회 타로다. `/tarot/` 제목에도 "재회"가 들어 있다.
- 제안: "연애운" = `/love/`(사주), "재회 타로·재회운" = `/tarot/reunion/`. `/tarot/`은 타로 종류를 고르는 허브라 제목의 "재회"는 그대로 둔다.

## 3. 아직 모르는 것
- 표의 "미확인" 칸. 네이버 검색광고 키워드 도구에서 다시 조회해야 채울 수 있다. 사용자 계정이 필요하다.
- 실제 유입 검색어. 서치어드바이저의 "검색어" 리포트에서 대표 페이지와 실제 노출 페이지가 같은지 확인한다(`docs/seo/naver-console-checklist.md` §5).
