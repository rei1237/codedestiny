# Topic Cluster Map — 자미두수 · 숙요점 · 베다 · 서양점성술 · 사주 · 타로 · 초융합

> [세트 인덱스](README.md) · 이 문서는 2/10부다. 신규 IA 설계가 아니라 **실제로 존재하는 구조를
> 지도화**한 문서다. 코드가 정본이며, 아래 표는 2026-08-11 조사 시점 스냅샷이다.

## 1. 표기 규칙

- **허브**: 사용자가 진입하는 SEO 랜딩(`/saju`, `/ziwei` 등)
- **스포크**: 허브 아래 유료 서비스·기능 라우트
- **인사이트 허브**: `/insights/<topic>` — 세부 개념 아티클의 진입점(`app/insights/InsightTopicArchive.jsx` 공용 렌더러)
- **registry**: `lib/seo/entity-registry.mjs`의 `SEO_ROUTE_PROFILES` 등록 여부(✅/❌). 등록된 허브는
  `app/components/SeoLandingTemplate.jsx`를 통해 `getTopicClusterLinks()`가 만든 "관련 서비스" 링크를
  실제로 렌더한다([07-internal-link-graph.md](07-internal-link-graph.md) 참고)

## 2. 자미두수 (Ziwei)

- 허브: `/ziwei` ✅registry — 서비스: `/ziwei/chart`(심화 유료 상담), `/ziwei-ai`(AI 상담), `/flower/jamidusu`
- 가이드: `/ziwei/guide`
- 인사이트 허브: `/insights/ziwei` ❌registry — 대표 아티클: `ziwei-minggong`(명궁), `ziwei-life-palaces`(12궁),
  `ziwei-sihua`/`ziwei-four-transformations-lu-quan-ke-ji-guide`(사화), `ziwei-14-main-stars-complete-guide`(14주성),
  `ziwei-compatibility-palace-method`(궁합) 등 25편+(`docs/insight-hub-authoring.md` §2 자미두수 절 기준 28편,
  다수 통합 완료)
- 다국어: `/en/ziwei`, `/ja/ziwei`, `/zh/ziwei`(홈 외에 SSR 지원되는 5개 라우트군 중 하나)

## 3. 숙요점 (Sukuyo)

- 허브: `/sukuyo` ✅registry — 서비스: `/sukuyo/calendar`(27숙 달력), `/sukuyo/compatibility`,
  `/sukuyo-compatibility-ai`, `/oracle/sukuyo`(숙요 인연 레이더), `/flower/sukuyo`
- 가이드: `/sukuyo/guide`, 정적 콘텐츠: `/sukyo/relationship-encyclopedia`(27가지 인연 도감)
- 인사이트 허브: `/insights/sukuyo` ❌registry — 대표 아티클: `sukuyo-27-mansions`(27숙), `sukuyo-eishin`(영친),
  `sukuyo-antai`/`sukuyo-ankai`(안괴), `sukuyo-myeongseong`(명성), `sukuyo-wiseong`(위성), `sukuyo-useo`(우서),
  `sukuyo-vs-saju-compatibility`(사주 비교) 등 30편+
- 레거시: `/sukyo` → `/sukuyo` 301 리다이렉트(기존)
- 다국어: `/en/sukuyo`, `/ja/sukuyo`, `/zh/sukuyo`

## 4. 베다 점성술 (Vedic / Jyotish / Nakshatra)

- 허브: `/vedic` ✅registry — 서비스: `/vedic-ai`, `/nakshatra`(+`/ai`,`/calc`,`/result`,`/compat`,
  `/dasha-map`,`/lord-report`,`/muhurta`,`/vvip`)
- 가이드: `/vedic/guide`, 심화: `/vedic/jyotish`(라시/다샤 읽는 법)
- **크로스워크 도감**: `/nakshatra/codex/[index]` — 숙요 27수 × 나크샤트라를 1:1 매핑한 27개 정적
  페이지(`constants/nakshatra-crosswalk.ts`, `constants/nakshatra-fusion.ts`). **이미 존재하는 초융합형
  콘텐츠**로 §7과 함께 취급
- 인사이트 허브: `/insights/vedic` ❌registry — 대표 아티클: `vedic-lagna-what-is`(라그나), `nakshatra-what-is`,
  `vedic-astrology-navamsa-basics`(나밤샤), `vedic-astrology-12-rasi-complete-personality-guide`(12라시),
  `vedic-dasha-transit-remedy-practical-guide`(다샤)
- 계산 엔진: `lib/vedicSwissChart.js`(Swiss Ephemeris WASM, 실사용) — `lib/vedicCalculator.js`는 미사용 레거시
- 다국어: 없음(위 4개 다국어 라우트군에 vedic 미포함 — [06 P1](06-content-roadmap.md) 공백)

## 5. 서양 점성술 (Astrology)

- 허브: `/astrology` ✅registry — 서비스: `/astrology-ai`, `/flower/astrology`
- 가이드: `/astrology/guide`, 심화: `/astrology/cosmic`(태양·달·상승궁)
- 인사이트 허브: `/insights/astrology` ❌registry — 대표 아티클: `astrology-birth-chart-guide`(출생차트),
  `astrology-houses-what-is`(하우스), `astrology-synastry-compatibility-fun-guide`(시너스트리),
  `astrology-vs-saju-differences`(사주 비교)
- 다국어: 없음([06 P1](06-content-roadmap.md) 공백)

## 6. 사주/명리학 (Saju)

- 허브: `/saju` ✅registry — 30개+ 라우트(기본/오행/십성/궁합/lifebook/love-bible/love-simulation/
  animal-destiny/destiny-bias 등)
- 가이드: `/saju/guide`, `/saju/five-elements`, `/saju/ten-gods`
- 유명인 아카이브: `/famous-saju`(카테고리 그리드) — `/insights/famous-saju`와 중복 이슈,
  [01-audit-framework.md §5](01-audit-framework.md) 참고
- 인사이트 허브: `/insights/saju` ❌registry — 35편(2026-07-10 대규모 통합 완료). 대표 아티클:
  `cheongan-jiji-complete-explanation`(천간지지), `singang-sinyak-judgment-complete-guide`(신강신약),
  `yongshin-finding-method-practical-guide`(용신), `iljoo-personality-complete-guide-60-pillars`(60일주),
  `daewoon-sewoon-reading-complete-guide`(대운세운), `saju-12-unseong-complete-guide`(12운성)
- `/manse`(만세력) ✅registry — 사주 해석의 입력 단계 허브로 별도 등록

## 7. 타로 (Tarot)

- 허브: `/tarot` ✅registry — 12개+ 인터랙티브 스포크(love/year/reunion/self-esteem/healing/mindscan/
  mingri/numerology/crystal-soul/prompt-maker)
- 가이드: `/tarot/guide`
- 융합 서비스: `/fortune-tea-house`(사주+숙요+타로 결합 서사형, 연이 캐릭터) — `src/features/fortune-tea-house/`
- 인사이트 허브: `/insights/tarot` ❌registry — 대표 아티클: `tarot-major-arcana-22-complete-meanings`,
  `tarot-minor-arcana-four-suits-practical-guide`, `saju-and-tarot-combined-reading-framework`(사주 통합)

## 8. 초융합 — 이미 존재하는 자산과 공백

**서비스 3종(전부 인터랙티브·유료, noindex는 fusion-fortune만)**:
- `/fusion-fortune` — 6체계(사주·자미두수·숙요점·베다·서양점성술·타로) AI 교차 해석. `noindex: true`
  (2026-08-05 커밋, 결제 후 진입 클라이언트 렌더 라우트라 의도적 — 버그 아님). `entity-registry.mjs`의
  `FUSION_FORTUNE_PROFILE`에 등록되어 있고, `getTopicClusterLinks()`가 다른 모든 핵심 허브의 관련 링크에
  자동으로 끼워 넣는다(색인 여부와 별개로 "개념 등록"은 되어 있음)
- `/destiny-compass` — 사주+자미두수 2체계 결합(색인됨)
- `/flower/destiny` — 사주·점성술·자미두수·숙요점 4체계 탭 통합(색인됨)

**정적 비교 콘텐츠(이미 존재)**: `ziwei-vs-saju`, `sukuyo-vs-saju-compatibility`,
`astrology-vs-saju-differences`, `saju-and-tarot-combined-reading-framework`

**공백**: 위 서비스·비교 아티클을 하나로 묶어 "초융합"이라는 개념 자체를 설명하는 색인 가능한
콘텐츠 허브가 없다. `/insights/fusion` 신설로 메운다([06-content-roadmap.md P0](06-content-roadmap.md)).

## 9. entity-registry.mjs 스냅샷 (2026-08-11, 18개 프로필)

> 코드가 정본. 아래는 발췌 스냅샷이며 갱신 시 `lib/seo/entity-registry.mjs`를 직접 확인할 것.

| path | title | primary keyword | relatedPaths 수 |
|---|---|---|---|
| `/kkul-kkul-unse` | 꿀꿀 운세 브랜드 안내 | 꿀꿀운세 | 6 |
| `/saju` | 사주 해석 | 무료 사주 | 5 |
| `/manse` | 만세력 | 무료 만세력 | 4 |
| `/ziwei` | 자미두수 | 자미두수 명반 | 4 |
| `/sukuyo` | 숙요점 | 숙요점 궁합 | 4 |
| `/vedic` | 베다 점성술 | 베다 점성술 | 4 |
| `/astrology` | 서양 점성술 | 출생차트 | 4 |
| `/tarot` | 타로 | 무료 타로 | 4 |
| `/saju/compatibility` | 사주 궁합 | 사주 궁합 | 4 |
| `/compatibility` | 궁합 | 무료 궁합 | 4 |
| `/love` | 연애운 | 연애운 | 4 |
| `/today` | 오늘의 운세 | 오늘의 운세 | 4 |
| `/daily-fortune` | 일일 운세 | 일일 운세 | 4 |
| `/dream` | 꿈해몽 | 무료 꿈해몽 | 4 |
| `/high-value` | 운세 가이드 | 운세 가이드 | 6 |
| `/insights` | 운세 인사이트 | 운세 인사이트 | 5 |
| `/methodology` | 운세 콘텐츠 방법론 | 운세 해석 방법론 | 5 |
| `/fusion-fortune` | 초융합 운세 | 초융합 운세 | 6 |

## 10. 미등록 허브 후보 (감사 발견, 조치는 08로 라우팅)

`/insights/*` 서브허브 8개(ziwei/sukuyo/vedic/astrology/saju/tarot/compatibility/dream) 전부와
`/oracle/sukuyo`, `/nakshatra/codex/[index]`, `/famous-saju`는 `SEO_ROUTE_PROFILES`에 등록되어 있지
않다 — 즉 `SeoLandingTemplate.jsx`의 자동 상호링크 대상이 아니다. 등록 여부와 우선순위는
[08-technical-seo-checklist.md](08-technical-seo-checklist.md)와 [06 P2](06-content-roadmap.md)에서 다룬다.

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-08-11 | 최초 작성. 6체계+초융합 실제 구조 조사 결과 반영, entity-registry 18개 프로필 스냅샷 기록 |
