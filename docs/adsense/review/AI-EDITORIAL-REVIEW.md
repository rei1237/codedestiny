# 20편 AI 편집 검토 기록

2026-09-09. 사용자 요청에 따라 AI가 기존 원고 20편을 읽고 계산 설명, 용어, 근거, 과장, 본문과 검색 설명의 일치를 검토했다. **박병하의 검수나 자격을 가진 인간 전문가의 검수로 기록하지 않는다.** 전통적 해석의 적중률을 검증한 작업도 아니다.

8편은 잘못된 전제와 반복을 줄여 본문을 재구성했고, 12편은 기존 설명을 유지하며 해당 오류와 한계를 수정했다. 신규 URL·대량 글·유료 기능 변경은 없다. 본문 해시와 원고별 판단은 [AI 검토 원장](ai-editorial-reviews.json)에 고정했다. 이 기록으로 인간 검수 또는 광고 허용 상태를 자동 승격하지 않는다.

| 원고 slug | 주요 발견과 수정 | 판단 범위 |
|---|---|---|
| how-we-calculate-saju | 원본 날짜·23시 경계·보정 시주를 실제 호출부와 대조. 모든 경로가 KST 또는 외부 KASI API 우선이라는 보장 제거 | 기본 원국 코드만 확인. 해외 역사 시간대 전수 검증 아님 |
| midnight-birth-day-pillar | ‘야자시 인정’의 명칭 혼동, 보정된 날짜가 다르면 무조건 오답이라는 주장 수정. 00:10−30분 가정 명시 | 유파의 정답 판정 아님 |
| why-saju-results-differ-between-services | 같은 명식이 계산 정확성의 증거라는 주장 제거. 시간대·서머타임 등 다른 원인 추가 | 네 원인이 전체 원인 목록은 아님 |
| saju-without-birth-time-three-pillars-guide | 시간 없이 여섯 글자 확정이라는 오류 수정. 절입일·일진 경계·대운 시작 시점 불확실성 추가 | 시간 미상은 후보를 남김 |
| manseoryeok-what-is | 임의 간지 네 쌍을 실제 명식처럼 제시한 예 제거. 시각 경계 예 수정. 기둥 중요도 고정 순위 제거 | 만세력 입문 설명 |
| ten-gods-beginner-map | 오행·음양의 열 관계표 확인. 갑목 기준 병·정·무·기 계산 예 추가. 편재=큰돈 축약 수정 | 관계명 계산과 인물 평가 구분 |
| ten-gods-practical-map-love-work-money | ‘나머지 여섯 글자’를 일곱 글자·지장간으로 수정. 인성 약함=학습 느림, 재성 약함=금전 손실 단정 제거 | 생활 질문은 편집 제안 |
| yongshin-finding-method-practical-guide | 자평진전의 월령용신과 격을 돕는 상신 혼동 수정. 억부·조후·격국의 정의 차이 설명 | 전통 원문 의미 확인, 실제 명식 용신 확정 아님 |
| daewoon-sewoon-reading-complete-guide | 20·30세 고정 예 수정. 나이 변화의 원인을 대운에만 귀속하는 주장 제거. 세운 입춘 경계 추가 | 성공 확률 주장 제거 |
| ziwei-vs-saju | 명반의 별을 관측 천체와 구분. 음력 월·절기 월 차이, 윤달·시간 설정 확인 추가 | 교차 해석은 예측력 검증 아님 |
| sukuyo-vs-saju-compatibility | ‘관계는 숙요가 더 잘 맞힌다’는 우열과 반복 비유 제거. 날짜표와 명식 비교 예로 재구성 | 관계의 실제 동의·행동 우선 |
| astrology-vs-saju-differences | 사주가 시기 예측에서 더 정교하다는 근거 없는 우열 제거. 황도·하우스·시간 설정 비교 | 계산 정밀도와 해석 타당성 분리 |
| sukuyo-bonmyeongsuk-vs-wolmyeongsuk | ‘월명숙=사회적 성격’의 문헌·유파 미확인. 해당 단정을 삭제하고 실제 본명숙 계산과 명칭 확인법으로 재구성 | 월명숙 전통 전체의 존재를 부정하지 않음 |
| ziwei-star-brightness | 출처 없는 고전 인용, 별점·100% 능력 표현 제거. 등급표 차이·사화·가정 사례 중심으로 축약 | 특정 유파 밝기표 전수 대조는 남음 |
| sukuyo-27-mansions | 음력 날짜표를 실제 달 황경과 혼동한 전제 수정. 27개 이름·월별 수열·위숙 한자 구분 확인 | 성격 표는 편집 상징이며 관찰 통계·고전 직역 아님 |
| sukuyo-love | 안괴 끌림 최강·업태 재회 빈발이라는 미확인 빈도 주장 제거. 거절·차단의 경계 명시 | 커플 추적 연구를 수행하지 않음 |
| sukuyo-compatibility-guide | 실제 연구 경험처럼 보이는 표현 수정. 관계 방향·계산 기준·해석의 출처 범위 추가 | 현대 연애 조언을 고전 번역으로 제시하지 않음 |
| astrology-birth-chart-guide | 상승점과 사인·1하우스 구분. 시간 미상 행성 경계, 회귀·항성 차이와 서양 전체=태양 중심 단순화 수정 | 천문 계산 참고 자료와 예측 근거 구분 |
| vedic-lagna-what-is | 하우스 위치와 지배 혼동, 달의 사인 체류 시간, 라그나 로드=건강 단정 수정 | 라그나가 같아도 도수·분할차트는 변동 가능 |
| tarot-reunion-reading | 특정 카드의 재회 질문 출현 빈도 주장 제거. 상대 마음의 증거라는 표현 수정. 심판의 원전 도상과 편집 적용 구분 | 동의·연락 거절이 카드 해석보다 우선 |

## 대조한 자료

- 저장소 `js/saju-engine.js`: `_cdCivilDayPillar`, `_cdHourPillarFromDayStem`과 두 원국 호출 경로. 계산 로직은 변경하지 않았다.
- 저장소 `js/saju-engine-tarot-sukuyo-quantum.js`: `calcSukuyoData`, 27숙 목록·월별 시작 수열·기본 윤달 옵션. `lib/sukuyo-engine-server.ts`의 날짜표 계산도 대조했다. 서로 다른 관계 계산 함수까지 동일하다고 인증하지 않는다.
- [Swiss Ephemeris 공식 계산 문서](https://www.astro.com/swisseph/swephprg.htm): 시간, 아야남샤, 상승점과 하우스 반환값·체계 구분. 이 문서를 링크한 것이 모든 서비스의 사용 라이브러리 선언은 아니다.
- [『자평진전』 「논용신」 원문](https://donglishuzhai.net/chapter/3721.html): 월령에서 용신을 구하는 원문을 현대의 좋은 오행·상신 개념과 구분했다. 현대 사이트의 추가 주석은 원문과 구별했다.
- [『숙요경』 T1299, CBETA 전자본](https://buddhism.lib.ntu.edu.tw/FULLTEXT/sutra/T/T21n1299.pdf): 날짜별 숙 배정과 문헌 맥락을 확인했다. 판본 표가 현재 서비스 수열과 동일하다고 주장하거나 원문을 대량 복제하지 않았다.
- [A. E. Waite, The Pictorial Key to the Tarot, Judgement](https://sacred-texts.com/tarot/pkt/pktar20.htm): 심판 도상과 현대 재회 적용의 범위를 구분했다.
- KASI 생활천문관 페이지는 이번 재조회에서 유효한 본문을 확인하지 못했다. 직접 확인하지 못한 최신 절입값을 새 사례로 만들지 않았으며, 서비스의 KASI 실시간 우선 보장도 제거했다.

## AdSense·SEO 판단

Google의 [생성형 AI 콘텐츠 안내](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)는 AI 사용 여부만으로 품질을 판단하지 않고 정확성·품질·관련성과 메타데이터의 일치를 강조한다. [Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938?hl=en)는 제작 주체·콘텐츠에 대한 잘못된 표시를 금지한다. 이에 따라 실제 AI 편집과 미확인 인간 검수를 구분했다.

이번 20편의 수정은 콘텐츠 위험 감소의 증거다. 사이트 전체의 113편·유명인·다국어 심사, 인간 운영자가 책임지는 최종 출판 확인, ads.txt 계정 불일치, 운영 배포 후 검증까지 대신하지 않는다. **사이트 재심사 판정은 NOT READY를 유지한다.** AI 편집을 했다는 이유로 광고를 켜거나 90점을 부여하지 않는다.
