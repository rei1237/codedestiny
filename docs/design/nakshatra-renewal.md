# 나크샤트라 달빛 서고

status: in-progress

## 승인된 계약
- 무료 주제별 요약 + 기존 개인 유료 심화 유지. 궁합 단건 20,000원, 선구매 불필요. 기존 이용권·월정석 정책 유지.
- 나크샤트라 범위만 일본 구력 숙요로 확장. 기존 결과 원본과 다른 숙요 서비스 보존.
- 남청색 달빛 서고: 인도 석조 아치, 일본 병풍, 금박·주홍. 이미지 밖 HTML 제목, 첫 화면에 무료 범위·CTA.
- 구현 → mock 계산·결제 검사 → 실제 모바일/데스크톱 렌더 검사 → scoped commit → main 통합·push·CI.
- 실결제·과금 LLM·운영 DB·운영 승격은 포함하지 않는다.

## 계산 출처와 선택
- 천문: 기존 Swiss Ephemeris Lahiri 항성황경. https://www.astro.com/swisseph/swephprg.htm
- 해석: P.V.R. Narasimha Rao 저자 공개 교재. https://www.vedicastrologer.org/articles/vedic_astro_textbook.pdf
- 일본 구력: 현대 천문 삭/중기(JST 민간일), 동지 포함월=11월, 동지월 사이 13개월일 때 첫 무중기월 윤달. 천보력의 역사적 완전 재현이나 유일한 공인 역법이라고 표기하지 않는다.
- 2033년은 윤11월 규약을 채택. https://eco2.mtk.nao.ac.jp/koyomi/topics/html/topics2014.html
- 월초 숙/윤달: 八雲院이 직접 설명한 室·奎·胃·畢·參·鬼·張·角·氐·心·斗·虛, 윤달은 본월과 동일. https://yakumoin.net/about/unsei_and_lunar_calendar
- 원전 역사 자료: https://buddhism.lib.ntu.edu.tw/FULLTEXT/sutra/T/T21n1299.pdf — 고대 월건표와 현대 일본 표를 동일하다고 주장하지 않는다.
- 역법 계산은 기존 astronomy-engine 의 SearchMoonPhase/SearchSunLongitude/Seasons 사용. https://github.com/cosinekitty/astronomy/tree/master/source/js
- 숙요 이름과 나크샤트라를 고정 오프셋으로 일치시키거나, 불일치를 경계일이라고 해석하지 않는다.
- 차크라는 전통 상징을 사용한 자기 돌봄 안내. 출생 차트로 건강 점수·질병·임신·수명 판단 금지.
- 출생시간 미상: `worker/lib/nakshatra-birth-evidence.js`는 출생지 정오를 베다 참고값으로 사용하고 당일 00:00/23:59 달 위치로 가능한 나크샤트라 구간을 제공한다. 파다·상승궁·하우스·D9·정밀 다샤는 제외한다. 일본 숙요는 입력 생일을 JST 날짜로 읽는 규약이며 임의의 출생시각을 사실처럼 표시하지 않는다.
- 아쉬타쿠타: `worker/lib/nakshatra-ashtakuta.js`의 `ashtakuta-maitreya-tables-v2`는 Saravali 계열 표를 명시한 방법이다. Tara는 Janma(1)를 포함하고 3·5·7만 무점수로 처리하며, Graha Maitri는 친구/적 2점, 중립/적 1점을 사용한다. 다른 유파와 동일하다고 주장하지 않는다. [Dina](https://saravali.github.io/astrology/koota_dina.html), [Graha](https://saravali.github.io/astrology/koota_graha.html), [Rasi](https://saravali.github.io/astrology/koota_rasi.html), [Nadi](https://saravali.github.io/astrology/koota_nadi.html), [기존 Yoni 표](https://saravali.github.io/astrology/koota_yoni.html)를 근거로 읽는다.
- 일본 관계: `worker/lib/nakshatra-compat.js`의 `jp-sanku-v1`은 방향별 역할과 거리 구분을 유지한다. 영친(栄親)은 최단거리 1=근거리, 8=중거리, 10=원거리이며 [八雲院 관계 설명](https://yakumoin.net/about/aisyou)을 따른다.
- 위 규약과 고정 fixture 검증은 모든 날짜의 천문 정확성·역사 역법 재현·해석의 예측력을 증명하지 않는다. 점수는 관계나 건강의 미래를 보장하지 않는다.

## 자산
- imagegen 내장 도구로 새 대표 삽화 제작. 원본 1672×941.
- 프롬프트: Nakshatra Moonlight Library; Indian carved sandstone arch, midnight indigo moon and lotus pond, Japanese gold-leaf astronomical folding screen and manuscript desk; restrained brass light, vermilion accent, no people, text, logos or UI.
- 출처: C:/Users/user/.codex/generated_images/01a11c07-d171-7891-b95c-4b4e36a4acb3/exec-d5d3a08b-3ad4-42cb-858b-e7864471ae5b.png
- 배포용 파생 자산: `public/images/nakshatra/moonlight-library-{480,960,1672}.webp`. 원본 비율을 유지하고 각 이미지 옆 `.webp.json`에 provenance를 기록했다. 세 파생 이미지의 embedded provenance 검사 결과 scanned 3 / missing 0.
- 랜딩은 명시적 `srcSet`·`sizes`와 원본 치수를 제공한다. 이미지 안에는 제목이나 UI 문구를 넣지 않으며, 제목·CTA·가격 안내는 HTML로 유지한다.

## Overview

**Creative North Star: "나크샤트라 달빛 서고"**

승인된 남청색 서고를 실제 화면에 적용했다. 인도 석조 아치와 일본 천문 병풍을 한 장의 삽화로 연결하고, 두 체계의 계산·해석은 각각 구분해 읽는다. 전문성은 계산 출처와 한계의 명확한 표시로, 몰입감은 삽화와 서체·여백으로 만든다.

이 문서는 나크샤트라 기능의 구현 기록이다. 전역 `DESIGN.md`나 다른 서비스의 세계관을 대체하지 않는다. `PRODUCT.md`의 따뜻함·전문성·모바일 가독성 원칙을 따르되, 결제 표현은 승인된 이용권·월정석·단건 결제 계약을 우선한다.

## Colors

새 서고 화면의 정본은 `app/nakshatra/library.module.css`의 페이지 범위 토큰이다.

| 토큰 | 값 | 역할 |
| --- | --- | --- |
| `--nl-deep` | `#091321` | 페이지 바탕·주 버튼 글자 |
| `--nl-ink` | `#101d2d` | 남청색 계열 기준 |
| `--nl-paper` | `#f3eee1` | 주요 본문·제목 |
| `--nl-muted` | `#c0cbd5` | 보조 설명·출처 |
| `--nl-gold` | `#dbc18b` | 제목 강조·링크·주 CTA·포커스 |
| `--nl-vermilion` | `#e6a394` | 행동 조언 강조 |
| `--nl-rule` | `#3c4b59` | 구획선·테두리 |

기존 폼·결과 CSS의 범위 토큰은 유지하며 새 서고 CSS와 혼동하지 않는다. 궁합 입력 placeholder는 어두운 표면에서도 읽히도록 밝게 조정했다.

## Typography

- 본문은 전역 `--font-body`, 제목은 `--font-display`와 `--font-heading`·serif 폴백을 사용한다.
- 랜딩 제목은 `clamp(32px, 4.7vw, 58px)`, 굵기 500, 줄높이 1.35. 760px 이하에서는 32px이다.
- 주요 섹션 제목은 `clamp(23px, 3vw, 32px)`, 굵기 500, 줄높이 1.5이다.
- 리드 문장은 16px/1.95, 모바일 15px이며 최대 55ch다. 리딩 본문은 최대 72ch와 줄높이 1.95를 사용한다.
- 한글 단어를 유지하고 제목 줄바꿈을 조절한다. 최종 수정에서 반복 eyebrow와 제목 장식 글리프를 제거했다.

## Layout

콘텐츠 최대 너비는 1120px, 페이지 좌우 여백은 20px이다. 데스크톱 히어로는 `.85fr 1.15fr` 두 열과 44px 간격을 사용한다. 760px 이하에서는 삽화를 먼저 보여주는 한 열로 전환하고 간격은 28px로 줄인다. 무료 요약 범위, 개인 심화의 기존 유료 구분, 선택형 궁합 CTA를 진입 흐름에 함께 둔다.

설명·차크라 영역은 두 열에서 모바일 한 열로 변한다. 본문은 반복 카드보다 챕터와 가는 구획선으로 읽힌다. 360/390/430/1440px 렌더 기록을 아래 증거 절에 남긴다.

## Elevation & Depth

새 서고 화면은 그림자 카드보다 남청색 표면과 얇은 구획선으로 깊이를 만든다. 대표 삽화가 공간감을 담당한다. 기존 개별 결과·폼 스타일의 잔존 효과를 전역 금지나 공통 토큰으로 일반화하지 않는다.

## Shapes

주 버튼·보조 버튼·안내 상자는 6px 모서리다. 대표 삽화는 데스크톱 `110px 110px 4px 4px`, 모바일 `56px 56px 4px 4px` 아치 형태를 사용한다. 결과 배너는 8px 모서리와 3:1 비율로 배치된다.

## Components

- 주 CTA는 금색 바탕·짙은 글자, 보조 CTA는 밝은 글자·구획선 테두리다. 최소 높이는 48px, 패딩은 12px 22px이다. 주 CTA hover는 밝기 1.08, 보조 CTA hover는 금색 테두리다.
- 탐색 링크와 펼침 요약은 최소 높이 44px이다. 페이지 `:focus-visible`은 금색 2px 외곽선과 5px offset을 사용한다.
- 궁합 입력은 placeholder 외에 항상 보이는 label을 제공한다. 출생시간 미상은 계산에서 제외되는 항목과 함께 안내한다.
- 결과는 개인 리딩·일본 숙요·인도 베다·궁합 항목의 출처와 한계를 구분한다. 값이 없는 결과 설명은 빈 문단으로 렌더하지 않는다.
- 가격은 `app/nakshatra/_lib/pricing`의 기존 연결을 사용한다. 문서의 승인 금액을 별도 UI 하드코딩의 근거로 사용하지 않는다.

## Do's and Don'ts

- Do: 이미지 밖 HTML 제목, 지속적으로 보이는 입력 label, 밝은 보조 문구, 모바일 짧은 문단을 유지한다.
- Do: 일본 구력 숙요와 베다 달 위치를 각각의 계산 방법과 함께 보여준다.
- Don't: 반복 eyebrow·장식 글리프·빈 결과 문단을 다시 추가하지 않는다.
- Don't: 궁합 점수로 관계를 단정하거나 차크라로 건강·임신·수명을 예측하지 않는다.
- Don't: 이 기능 문서로 전역 디자인·결제 정책·다른 숙요 서비스를 변경하지 않는다.

## 렌더와 검증 증거

- 로컬 실제 브라우저 렌더, mock 계산/결제 상태 기준이다. `.impeccable/review/nakshatra/`에는 `landing`, `personal`, `compat-input`, `compat-result`, `paid` 각각 360/390/430/1440px의 20개 스크린샷과 `metrics.json`이 있다. 기록된 20개 상태에서 가로 overflow 0, 브라우저 errors 0이다.
- 마지막 결과 화면 수정 후 `compat-result-360.png`·`compat-result-1440.png`를 재촬영했다. `metrics-fixes.json` 두 항목 모두 overflow 0, errors 0이다. 이 후속 확인을 나머지 모든 화면의 재검사로 확대 해석하지 않는다.
- 독립 generic reviewer의 `ship` 판정은 네 수정점(궁합 입력 label 상시 표시, placeholder 밝기, 빈 결과 문단 제거, eyebrow/제목 글리프 제거) 해소에만 한정된다. 전체 기능·계산·운영 전달 승인 판정이 아니다.
- mechanical detector를 한 번 실행한 결과는 `[]`였다. 이는 도구가 포착한 패턴 결과이며 완전한 접근성·디자인 검증을 뜻하지 않는다.
- ESLint: errors 0, `@next/next/no-img-element` warnings 3. 해당 이미지는 명시적 `srcSet`/`sizes`를 사용한다. TypeScript 검사는 마지막 소규모 수정 전에 통과했으며, 그 이후 재통과를 이 문서에서 주장하지 않는다.
- `npm run check:fast`는 문서 갱신 시점에 진행 중이다. commit·main 통합·push·GitHub CI 완료 여부는 아직 확정하지 않는다.
- 실결제·과금 LLM·운영 DB·배포는 실행하지 않았다. 고정 fixture와 mock 통과는 실제 결제·실제 LLM 문장 품질·전 기간 천문 정확성의 증거가 아니다.

## 작업 상태
- 격리 기준: origin/main 269a27b9ebf5889d3436fb88970a97fac6e03630.
- 원래 main의 index.html/js/app.js 및 미러 변경은 타 세션 소유이며 보존한다.
- 검증 결과와 전달 SHA는 완료 시 갱신한다.
