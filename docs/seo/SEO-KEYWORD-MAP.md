> 2026-09-21 갱신: 사용자가 이전 대화에서 제공한 대통령 관련 원문 3건을 회수하고 게시일·본문을 확인했다. 아래 과거 조사 시점의 “출처 없음” 판정은 최신 상태가 아니다. 현재 출처와 표현 범위는 [사업 마스터](../business-refactor.md#되찾은-공개-원문) 및 `lib/brand/prediction-records.json` 참조. 원문 수정 이력이나 모든 예측의 정확성을 독립 검증했다는 뜻은 아니다.

# SEO 키워드 맵 (사이트 전체)

작성 2026-09-18. 원 요청 22개 항목(`docs/handoff/2026-09-17-seo-p1-followup.md`)
중 P5로 착수.

## 이 문서의 역할

기존에 이미 두 개의 키워드 맵이 있다:

- [SEARCH_INTENT_MAP.md](SEARCH_INTENT_MAP.md) — 숙요·사주·점성술·베다·작명·
  브랜드·해외·유명인 클러스터의 Query→URL→Position→Action 표(2026-09-08
  관측). "전체 URL 수동 검수 완료로 읽지 말 것"이라 스스로 명시한 부분 집합.
- [YEONGNYANGI_SEARCH_STRATEGY.md](YEONGNYANGI_SEARCH_STRATEGY.md) — 영냥이
  천원사주 허브 단일 클러스터의 상세 키워드 맵(TOP 100 등급 A/B/C/D).

이 문서는 그 둘을 대체하지 않는다. 위 두 문서에 실측 데이터가 있는 URL은
그 값을 인용만 하고, **아직 어느 문서에도 없던 축**(타로·관상·꿈해몽·연애운·
궁합·오라클·프리미엄 리포트·나크샤트라·작명·인사이트 허브·마스터 인연의 서·
FPTI 등)까지 포함해 **사이트 전체 주요 URL의 "이 페이지가 노리는 키워드가
무엇인가"를 한 곳에서 확인**하기 위한 상위 인벤토리다. URL 목록의 정본은
`scripts/generate-sitemap.mjs`의 `coreRoutes`다.

### 근거 표기

`[자동완성]` 네이버 자동완성 실측 · `[네이버]` [SEO_STATE.json](SEO_STATE.json)
네이버 서치어드바이저 로그인 실측(`naver.topPages`/`naver.topQueries`,
2026-09-14) · `[GSC]` 같은 파일 `gscRows`(2026-06-12~09-11) ·
`[페이지제목]` 현재 배포된 title 메타데이터를 그대로 인용(검색 수요 실측은
아님, 페이지가 지금 무엇을 타깃하고 있는지의 사실) · `[편집]` 수요 미확인
편집 설계. **검색량 수치를 새로 만들지 않는다** — 위 네 태그 중 하나가 없는
키워드는 "이 페이지가 편집상 노리는 말"이지 "검색 수요가 확인된 말"이 아니다.

## URL 인벤토리

### 실측 데이터가 이미 있는 클러스터 (기존 문서 인용)

| URL | 대표 키워드 | 실측 근거 | 상세 |
| --- | --- | --- | --- |
| `/` | 코드데스티니, CODE DESTINY | GSC 22클릭/181노출/30.5위(전체 페이지 1위) [GSC] | [SEARCH_INTENT_MAP.md](SEARCH_INTENT_MAP.md#전략-키워드-전체-의도-분류) |
| `/manse/` | 만세력 | GSC 19.6위(5노출); 최근28일 클릭 3·노출 17 [GSC] | 위 문서 |
| `/saju/` | 무료 사주, 사주 | GSC "사주" 2클릭/2노출/19위 [GSC] | 위 문서 |
| `/sukuyo/` | 숙요점 사이트, 숙요점 | 네이버 21클릭/724노출("숙요점 사이트"), 20/591("숙요점") [네이버] | 위 문서 |
| `/sukuyo/compatibility/` | 숙요 궁합, 숙요점 궁합 | GSC 4노출/28.8위 [GSC] | 위 문서 |
| `/insights/sukuyo-antai/` | 숙요점 업태 | GSC 3노출/8위 [GSC] | 위 문서 |
| `/insights/sukuyo-eishin/` | 숙요점 영친 | GSC 3노출/8.7위 [GSC] | 위 문서 |
| `/vedic/` | 베다점, 인도 점성술 | 네이버 78클릭/1,687노출 [네이버] | 위 문서 |
| `/naming-ai/` | 무료작명사이트 | 네이버 15클릭/101노출, 43클릭/1,319노출(2026-09-14 topPages) [네이버] | 위 문서 |
| `/kkul-kkul-unse/` | 꿀꿀운세, 꽃돼지 사주 | 네이버 13클릭/40노출 [네이버] | 위 문서 |
| `/astrology/` | 점성술 | GSC 4노출/89.3위 [GSC] | 위 문서 |
| `/insights/fusion/` | 초융합운세, 초융합 사주 | 관측 Query 표 없음, 편집 설계 [편집] | 위 문서 |
| `/fortune/tomorrow/*`(띠·별자리 12종) | 오늘/내일 운세(띠·별자리별) | 네이버 topPages 상위 다수(예: scorpio 57클릭/12,168노출, ox 71/5,092) [네이버] | [SEO_STATE.json](SEO_STATE.json) `naver.topPages` |
| `/ja/` | 算命学 忌神 無料(일본어) | GSC 4노출/88.8위 [GSC] | [SEARCH_INTENT_MAP.md](SEARCH_INTENT_MAP.md) |
| `/yeongnyangi/1000-won-fortune/` | 천원사주, 천원 사주풀이, 사주보는 고양이 | 자동완성 실측(2026-09-16) [자동완성] | [YEONGNYANGI_SEARCH_STRATEGY.md](YEONGNYANGI_SEARCH_STRATEGY.md#4-keyword-map) TOP 100 |

### 실측 없이 편집 설계만 있던 클러스터 (이번에 신규 정리)

아래는 `SEARCH_INTENT_MAP.md`/`YEONGNYANGI_SEARCH_STRATEGY.md`에 없던 축이다.
대표 키워드는 현재 배포된 페이지 title(실제 값)을 그대로 인용했고, 검색
수요는 아직 확인되지 않았다 — `[편집]`으로만 표시한다.

| URL | 현재 title(실측) | 대표 키워드(편집 추정) | Intent |
| --- | --- | --- | --- |
| `/tarot/` | 무료 타로 카드 리딩 \| 연애·재회·마음 해석 [페이지제목] | 무료 타로, 타로 카드 리딩 [편집] | T |
| `/physiognomy/` | 무료 관상 보는 곳 \| 오관·삼정으로 읽는 얼굴 인상 해석 [페이지제목] | 무료 관상, 관상 보는 곳 [편집] | T |
| `/dream/` | 무료 꿈해몽 \| 꿈 상징과 감정으로 읽는 해몽 보는 곳 [페이지제목] | 무료 꿈해몽, 꿈해몽 [편집] | T |
| `/love/` | 무료 연애운 \| 사주로 보는 지금의 관계 흐름과 시기 [페이지제목] | 무료 연애운, 연애운 [편집] | T |
| `/compatibility/` | 무료 궁합 보기 \| 사주·숙요점·타로 궁합 보는 곳 [페이지제목] | 무료 궁합, 사주 궁합 [편집] | T |
| `/oracle/sukuyo/` | 숙요 인연 레이더 \| Code Destiny [페이지제목] | 숙요 인연 레이더 [편집] | C |
| `/premium/` | 프리미엄 운세 리포트 \| 사주·자미두수·점성술 심층 해석 [페이지제목] | 프리미엄 운세 리포트 [편집] | C |
| `/premium-reports/` | 프리미엄 운세 리포트 안내 \| 사주·연애·신년 PDF [페이지제목] | 프리미엄 운세 리포트 PDF [편집] | C |
| `/nakshatra/` | 나크샤트라 무료 보는 곳 \| 27수 × 27 나크샤트라 통합 별자리 [페이지제목] | 나크샤트라, 무료 나크샤트라 [편집] | T |
| `/insights/` | 운세 인사이트 허브 · 사주·타로·자미두수 \| Code Destiny [페이지제목] | 운세 인사이트 [편집] | I |
| `/master-love-codex/` | 사주 연애 리포트 · 자미두수 융합 20장 \| 마스터 인연의 서 [페이지제목] | 사주 연애 리포트, 마스터 인연의 서 [편집] | C |
| `/saju-fpti/` | 사주 FPTI 테스트 \| 코드 데스티니 [페이지제목] | 사주 FPTI 테스트 [편집] | T |
| `/fortune/`(허브) | 무료 운세 \| 오늘·내일·주간·월간 별자리·띠별 운세 [페이지제목] | 무료 운세(시점별 96개 클러스터 루트) [편집] | T |

`insights/*` 113개·`stories/*` 44화·`nakshatra/codex/*` 27개 같은 대량 하위
페이지는 개별 행으로 나열하지 않는다 — 위 허브가 대표하고, 얇은 신규 행을
쌓는 대신 실측이 쌓이면 그때 개별 키워드를 추가한다(`YEONGNYANGI_SEARCH_
STRATEGY.md` 6절의 "체계별 페이지 분리 조건"과 동일 원칙).

## 기각/보류 키워드 (기존 결정 인용, 재판단 없음)

- 대통령·적중 관련 키워드("대통령 사주 적중" 등) — 사전 공개 원본 없음,
  title·description·JSON-LD 사용 금지. 근거:
  [YEONGNYANGI_SEARCH_STRATEGY.md §9](YEONGNYANGI_SEARCH_STRATEGY.md#9-대통령유명인-활용-현황),
  [CELEBRITY_CONTENT_AUDIT.md](CELEBRITY_CONTENT_AUDIT.md).
- 천원 축 개별 체계 페이지(천원 숙요·천원 자미두수·천원 베다점 등) — 자동완성
  수요 없음, 허브 앵커로 흡수. 근거:
  [YEONGNYANGI_SEARCH_STRATEGY.md §6](YEONGNYANGI_SEARCH_STRATEGY.md#개별-천원-페이지-분리-조건).
- 무료/천원 역할 중복(예: 영냥이 허브에 "무료" 표기) — CD 무료 랜딩과 천원
  상담의 역할 분리를 무너뜨림. 근거: 같은 문서 §3.

## 갱신 방법

이 문서는 자동 생성물이 아니다. `SEO_STATE.json`(주간 SEO 운영 사이클로
갱신됨, `automation.nextWeeklyKst` 참고)이나 네이버 서치어드바이저·GSC를 다시
확인할 때, 여기 표의 해당 행에 새 실측 근거 태그를 덧붙인다. 편집 설계
클러스터에 실측(자동완성·네이버·GSC)이 처음 생기면 그 행을 "실측 데이터가
이미 있는 클러스터" 표로 옮긴다.
