# 묶음 2 — 사용자 결정이 필요한 것

> **2026-11-14 확정.** 사용자 답변 원문: "결정에 대해서는 가장 추천되는 방식으로 진행해줘 seo에 유리하도록". 아래 각 절의 추천안으로 확정해 적용했다.
> 1절 신년운세 = 새 URL 없이 `/fortune/2027/` 내부 링크 보강(`ba3269622`) · 2절 홈 이원화 = A안(`9dc6743e1`) · 3절 `/compare/` = A안(`7241b2ba6`) · 4절 about 정의 = 1안(`7241b2ba6`) · 5절 llms.txt = about과 같은 문장(`7241b2ba6`).
> 6절 가운데 `/consultations/` noindex, "운세보는 영냥이" 설명 문장 3곳, C5 이용권 이름, 번역 페이지 색인은 **유지로 확정**했다. 아래 본문은 결정 전 기록이다.

작성일 2026-11-14. 아래 다섯 가지는 **구현하지 않았다.** 선택지와 추천만 정리했다. 수치는 묶음 1 빌드 결과(`dist/`)에서 센 것이고, "내부 링크 수"는 그 페이지로 링크하는 색인 대상 한국어 페이지 수다.

## 1. 2027 신년운세 허브

### 지금 있는 것
Phase 0 보고서는 "색인 가능한 신년운세 허브가 없다"고 적었지만, 다시 보니 색인 대상 페이지가 이미 있다.

| URL | 무엇 | 제목 | 내부 링크 수 |
|---|---|---|---|
| `/new-year-ai-consultation/` | 유료 신년 상담 상품 안내 | 2027 신년운세 보는 곳 \| 정미년 월별·재물·연애운 풀이 | 475 |
| `/fortune/2027/` + 12띠 하위 페이지 | 무료 띠별 운세·삼재 | 2027년 띠별 운세·삼재띠 \| 정미년 12띠 무료 풀이 | 15 |
| `/insights/new-year-fortune-framework/` | 신년운세 읽는 법(글) | — | 34 |
| `/insights/saju-2027-monthly-planning-framework/` | 2027 월별 계획(글) | — | 2 |
| `/tarot/year/` | 한 해 타로 | — | 472 |

- 데이터: `lib/fortune/new-year-registry.mjs`의 `NEW_YEAR_SEASON`(연도 2027, 경로 `/fortune/2027`)과 `NEW_YEAR_SIGNS`(12띠 원고). `lib/fortune/new-year-sign.ts`의 `getNewYearSeason()`·`getNewYearSignPages()`가 페이지에 넘긴다. 월별 길흉은 페이지가 절기로 계산한다.
- `scripts/seo/keyword-research.mjs`의 `URL_RULES`는 신년운세·토정비결·2027·정미년 검색어의 대표 URL을 `/new-year-ai-consultation/`로 정해 두었다.
- 토정비결 전용 페이지는 없다. 언급은 인사이트 글과 신년 상담 페이지의 질문·답에만 있다.
- 약한 곳: 무료인 `/fortune/2027/`로 가는 내부 링크가 15쪽뿐이다(자기 띠 페이지들과 신년 상담 페이지 정도).

### 선택지
- **A. 새 URL을 만들지 않고 내부 링크만 보강한다(추천).**
  - 신년운세·토정비결 대표 = `/new-year-ai-consultation/`, 띠별·삼재 대표 = `/fortune/2027/`로 역할을 고정한다.
  - `/fortune/`, `/today/`, 홈 바로가기, 인사이트 두 글에서 `/fortune/2027/`로 가는 링크를 넣는다. 문구는 i18n 키로.
  - 새 데이터가 필요 없고, 같은 검색어를 두 페이지가 다투는 일도 생기지 않는다.
- B. 해마다 다시 쓰는 연도 없는 허브(예: `/new-year-fortune/`)를 새로 만든다.
  - `getNewYearSeason()`, `NEW_YEAR_SIGNS`의 12띠 요약, 인사이트 글, 신년 상담 링크를 한 화면에 묶는다.
  - 해가 바뀌어도 주소가 유지되는 장점이 있다. 대신 `/new-year-ai-consultation/`과 "신년운세"가 겹쳐서 어느 쪽을 대표로 둘지 다시 정해야 하고, 라우팅 추가라 저장소 규칙상 RED 범위다.
- C. `/fortune/2027/` 주소를 바꾼다. 추천하지 않는다(이미 색인된 주소를 옮기는 비용만 든다).

### 같이 정할 것
- 토정비결 전용 페이지를 만들지. 지금은 계산 엔진이 없어 "토정비결"이라는 이름으로 결과를 내면 사실과 다르다. 만들지 않는 쪽을 추천한다.
- `lib/fortune/new-year-registry.mjs`의 주석대로 12띠 문장은 다음 해에 재사용하지 않는다. 2028년 원고는 따로 써야 한다.

## 2. 홈 이원화 (B3)

### 지금
- `/` : 서비스 선택 화면. canonical은 자기 자신, hreflang 없음.
- `/ggulggul/` : 꽃돼지 연이 운세 시작 화면. canonical은 자기 자신, hreflang ko·x-default가 `/ggulggul/`을 가리킨다.
- 그래서 다국어 신호로는 `/ggulggul/`이 한국어 대표로 읽히고, 사이트 대표 주소는 `/`다. 두 신호가 어긋난다.

### 선택지
- **A. `/`를 대표로 맞춘다(추천).** `/`에 hreflang(ko·x-default = `/`, 다른 언어는 각 언어 홈)을 달고, `/ggulggul/`의 x-default는 뺀다. `/ggulggul/`은 "꽃돼지·연이 운세"의 대표로 남는다. 브랜드 결정("꿀꿀 운세" 하나)과 맞는다.
- B. 지금대로 둔다. 바뀌는 것이 없어 안전하지만 어긋난 신호가 남는다.
- C. `/ggulggul/`을 `/`로 합친다(canonical 또는 301). `/ggulggul/?action=` 진입 동선과 묶음 1의 K3 처리를 다시 손봐야 해서 추천하지 않는다.

A를 고르면 `app/page.js`, hreflang 생성부, `scripts/verify-home-identity.mjs`, 사이트맵이 함께 바뀐다. UX 세션이 `app/page.js`를 만지고 있어 그쪽이 main에 들어온 뒤에 하는 편이 낫다.

## 3. `/compare/` 인덱스 (A3)

### 지금
- `app/compare/` 아래에 `fortune-apps`, `saju-vs-ziwei`, `sukuyo-vs-vedic` 세 페이지만 있고 목록 페이지가 없다. `https://code-destiny.com/compare/`는 404다.
- 내부 링크 수: `saju-vs-ziwei` 79, `sukuyo-vs-vedic` 4, `fortune-apps` 2.

### 선택지
- **A. 만들지 않는다(추천).** 3쪽짜리 목록은 내용이 얇다. 대신 `sukuyo-vs-vedic`과 `fortune-apps`로 가는 링크를 관련 허브(`/sukuyo/`, `/vedic/`, `/about/`)에 넣는다.
- B. 가벼운 목록 페이지를 만든다. 세 비교 글의 제목과 한 줄 요약만 싣는다. 비교 글이 5개 이상으로 늘 계획이 있을 때 한다.
- C. `/compare/`를 `/insights/`로 301. 주소를 직접 치는 사람을 위한 최소 처리다. `public/_redirects`나 `_worker.js`를 건드려야 한다.

## 4. about 한 문장 정의

### 지금
- `/about/`의 H1은 "마음은 가볍게. 내 이야기는 조금 더 깊게."이고, 본문 첫머리에 "꿀꿀 운세는 무엇이다"라는 문장이 없다.
- description: "꿀꿀 운세에서 제공하는 무료 만세력, 타로, 자미두수, 점성술, 숙요점 서비스와 운영자 CODE DESTINY, 콘텐츠 운영 원칙을 소개합니다."

### 제안 문구(본문 첫 문단에 넣을 한 문장)
- **1안(추천)**: "꿀꿀 운세는 명리학자 박병하(네오)가 운영하는 사주·타로·자미두수 운세 상담 서비스예요."
- 2안: "꿀꿀 운세는 CODE DESTINY가 운영하는 사주·타로·자미두수·숙요점·점성술 운세 서비스예요." (llms.txt 첫 줄과 같은 틀)
- 3안: 1안 + "꽃돼지 연이와 영냥이가 풀이를 안내해요."

정할 것
- 운영자를 사람 이름(박병하)으로 쓸지 회사 이름(CODE DESTINY)으로 쓸지. `lib/brand/brand-facts.mjs`의 값과 같아야 한다.
- H1은 그대로 두고 정의 문장만 넣는 쪽을 추천한다. 문구는 i18n 키로 넣는다.

## 5. llms.txt 문구

### 지금
- 첫 줄: "꿀꿀 운세는 CODE DESTINY가 운영하는 사주·명리학·자미두수·숙요점·베다점·서양 점성술·타로 운세 상담 서비스입니다. …"
- 생성기: `scripts/generate-llms-txt.mjs`. `llms.txt`와 `llms-full.txt`를 만든다.

### 선택지
- **A. about 정의(§4)를 정한 뒤 같은 문장으로 맞춘다(추천).** 사이트 안의 소개 문장이 한 가지가 된다. 묶음 1에서 바뀐 사실(이용권 가격, 무료 범위, `/saju/free/` 동선)이 본문에 반영돼 있는지도 그때 같이 본다.
- B. 지금대로 둔다.

참고: llms.txt는 네이버·구글 검색 순위에 쓰이지 않는다. AI 답변 엔진이 읽을 수 있는 요약 정도로 본다.

## 6. 함께 묻는 것(다른 문서에 있는 결정)
- 홈 title·H1 3안: `docs/seo/meta-table.md` §1.
- 핵심 허브 description 제안과 제목에 서비스 이름을 붙일지: `docs/seo/meta-table.md` §4.
- `/consultations/` 색인 여부: `docs/seo/internal-links-noindex.md` §5.
