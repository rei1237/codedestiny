# Phase 3 남은 우선 콘텐츠 16편 검수 기록

- 상태: 공개 소스 및 운영 배포 반영
- 진행 승인: 2026-09-26
- 코드·문헌 사실 대조: 완료
- 사람 전문 검수: 미확인
- 광고 적합 판단: 미실시
- 운영 반영: 2026-09-26, `15878288f092072c605701b4c910f210e9060148` (Pages·Worker 실제 SHA 일치)

이 문서는 남은 우선 콘텐츠 16편에 어떤 고유 정보를 더했고, 어떤 근거로 표현을 제한했는지 기록한다. 공개 원고는 locale 키 기반 `app/insights/phase3-editorial-batch2.js`에서 관리한다. 여기서 말하는 사실 대조는 현재 서비스 구현과 아래 명시한 자료의 범위에 한정되며, 전통 전체에 대한 학술 감수나 상담 결과의 유효성 검증을 뜻하지 않는다.

## 공통 편집 기준

1. 첫 문단에서 검색 질문에 직접 답한다.
2. 계산값, 전통적 상징, 현실에서 확인할 사실을 분리한다.
3. 교육용 가상 예시는 실제 상담 사례로 표현하지 않는다.
4. 사랑·재회·질병·수익·성공 확률을 점술 결과로 확정하지 않는다.
5. 공개 본문은 공백 제외 2,500자 이상, 고유 내부 링크는 3개 이상으로 검사한다.
6. 저자·감수 이력이나 통계를 새로 만들지 않는다.

## 원고별 대조 결과

| slug | 반영 방식과 고유 요소 | 대조 근거 | 남긴 한계 |
|---|---|---|---|
| `sukuyo-27-mansions` | 기존 원고 보강. 27숙·28수 구분표, 숙 이름을 성격표로 고정하지 않는 절차 | `worker/lib/swiss-ephemeris.js`, 『숙요경』 T1299 전자본 | 경계 시각·배열·전통 차이를 함께 표시 |
| `sukuyo-compatibility-guide` | 전면 교체. 여섯 관계군 거리표, 양방향 계산 예시, 관계 기록표 | `worker/lib/sukuyo-relation-core.js` | 관계군은 사랑·결혼·재회 확률이 아님 |
| `sukuyo-ankai` | 전면 교체. 안·괴 방향 역할, 관찰/추측 비교표, 동의·회복 절차 | `worker/lib/sukuyo-relation-core.js` | 가해·피해·이별 필연성으로 해석하지 않음 |
| `sukuyo-antai` | 전면 교체. 거리 9·18과 업·태 역할, 현실 책임 분담 예시 | `worker/lib/sukuyo-relation-core.js` | 전생·업보를 개인 이력의 사실로 주장하지 않음 |
| `ziwei-what-is` | 전면 교체. 12궁·성요·강약·사화·삼방사정의 읽기 순서 | `worker/routes/ziwei-ai.js`의 상담 근거 계약 | 기원 연대와 유파 통합표를 확정하지 않음 |
| `ziwei-life-palaces` | 전면 교체. 12궁 질문표, 삼방사정 기록, 부부궁·질액궁 오해 교정 | `worker/routes/ziwei-ai.js` | 타인의 마음·이혼·병명을 궁 하나로 판정하지 않음 |
| `ziwei-star-brightness` | 전면 교체. 묘·왕·득·리·평·한·함의 질문형 표, 무점수 원칙 | `worker/routes/ziwei-ai.js` | 실제 명반에 없는 강약값을 만들지 않음 |
| `nakshatra-what-is` | 기존 원고 보강. 27등분·4파다 계산 재현과 숙요 비교표 | `worker/lib/vedic-derived-calculations.js`, `worker/lib/swiss-ephemeris.js` | 같은 달 분할 전통이 곧 같은 해석 체계라는 주장을 배제 |
| `vedic-lagna-what-is` | 기존 원고 보강. 라히리 항성황도·출생시각·whole-sign 설정표와 경계 예시 | `worker/lib/swiss-ephemeris.js`, `worker/lib/vedic-ai-chart.js` | 출생시각 미상에서는 라그나를 확정하지 않음 |
| `vedic-astrology-navamsa-basics` | 기존 원고 보강. 30도를 9분할하는 D9 구현과 D1/D9 기록표 | `worker/lib/vedic-ai-chart.js`의 divisional chart 계산 | D9 하나로 결혼 시기·배우자 성격을 확정하지 않음 |
| `how-we-calculate-saju` | 기존 원고 보강. 달력·절기·시간대·경도·23시 경계의 영향표 | `app/saju/animal-destiny/engine/localSajuCalculator.ts` | 같은 입력과 설정의 계산 재현과 해석을 분리 |
| `ten-gods-beginner-map` | 기존 원고 보강. 갑목/경금에서 병화가 달라지는 식신·편관 비교 | 기존 십성 원고와 음양·생극 규칙 대조 | 십성 수량으로 직업·돈·관계를 확정하지 않음 |
| `five-elements-ohang-complete-guide` | 제목·본문 보강. 오행별 강점/그림자 표와 과다·부족 오해 교정 | 기존 사주 원고와 `localSajuCalculator.ts`의 오행 산출 범위 대조 | 오행 개수만으로 용신을 정하지 않음 |
| `tarot-major-arcana-22-complete-meanings` | 제목·본문 보강. 카드 뜻을 관찰·해석·행동으로 나누는 기록표 | A. E. Waite, *The Pictorial Key to the Tarot* | 카드로 타인의 의사·건강·법률·투자 결과를 확정하지 않음 |
| `astrology-birth-chart-guide` | 기존 원고 보강. 서양 차트 기본 설정과 같은 태양궁의 다른 맥락 예시 | `worker/lib/swiss-ephemeris.js`, Swiss Ephemeris 공식 문서 | 출생시각 오차와 하우스 시스템 차이를 먼저 확인 |
| `astrology-houses-what-is` | 제목·본문 보강. 빈 하우스 읽기와 하우스 체계 변경 비교 | `worker/lib/swiss-ephemeris.js`, Swiss Ephemeris 공식 문서 | 빈 하우스를 삶의 영역 부재로 해석하지 않음 |

## 확인한 공개 자료

- 『숙요경』 T1299 전자본: <https://buddhism.lib.ntu.edu.tw/FULLTEXT/sutra/T/T21n1299.pdf>
- Swiss Ephemeris Programmer's Manual: <https://www.astro.com/swisseph/swephprg.htm>
- Swiss Ephemeris Lahiri 문서: <https://www.astro.com/swisseph/sweph_sla_e.htm>
- A. E. Waite, *The Pictorial Key to the Tarot*: <https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot>

## 운영 반영 후 남은 확인

- [ ] 네오가 16편의 문체와 공개 범위를 검수한다.
- [ ] 전통 체계에 대한 외부 전문가 감수를 받았다면 실제 이름·범위·날짜만 기록한다.
- [x] 운영 배포 뒤 핵심40 URL×2 UA의80건에서 초기 HTML, canonical,200 응답을 확인했다(2026-09-26).
- [ ] Search Console 색인은 배포 후 별도 관찰한다.

공개 반영 승인은 받았으며 [운영 릴리스](https://github.com/rei1237/codedestiny/actions/runs/36246787626)도 성공했다. 남은 항목이 끝나기 전에는 저자·감수 완료 표시나 AdSense 제출 준비 완료로 기록하지 않는다.
