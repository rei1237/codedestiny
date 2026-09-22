# 영냥 신점과 영냥 호라리

2026-09-22 구현. `spirit-v1` 기존 구매·저장 결과는 그대로 읽는다. 새 `/yeongnyangi/fortune/?mode=spirit`는 `prashna-v1`, `?mode=horary`는 `horary-v1`을 생성한다. 기존 프롬프트 허브의 호라리 입력 틀에는 실제 상담 링크를 추가했다. 프롬프트 복사 도구를 실제 계산으로 표시하지 않는다.

## 계산과 문체

| 기능 | 재사용 | 새 해석 계층 |
| --- | --- | --- |
| 영냥 신점 | `createPrashnaCalculationSnapshot`, `calculatePrashnaChart`, `getSwissVedicPlanets`, `buildVedicLocalChartJson` | 항성황도 Lahiri / Whole Sign. 질문 주제별 주인, 동궁·전통 전방위 시선, 본궁·고양·손상·추락, 역행, 상호 교환을 구조화 |
| 영냥 호라리 | `getSwissWesternChart`, `getSwissTropicalLongitudes` | 열대황도 / Regiomontanus, 전통 7개 천체와 전통 주인. 주요 5개 각·순행/역행을 반영한 접근/이탈, 본궁·고양·손상·추락, 상호 수용, 각궁, 연소, 초기/말기 상승점, 달의 별자리 이탈 전 접촉을 구조화 |

공용 서양 엔진의 기본 Placidus는 유지한다. Regiomontanus 요청만 `swe_houses_ex(..., 'R')`를 사용하고, 외부 Placidus 차트나 저정밀 대체 계산으로 폴백하지 않는다. 위도 66도 이상은 거부한다. 프라슈나도 기존 strictPremium 경로를 재사용한다. 출생정보·임의 생시·상대방 프로필을 넣지 않는다.

질문별 명시 키워드가 선택 주제보다 우선한다. 여러 주제가 나오면 각각의 근거를 남긴다. 분류가 불명확하면 선택 주제는 임시 범위이며 결론 유보임을 함께 전달한다. 최대 8개 질문이 같은 질문 순간의 차트를 공유하고 각각 답변 슬롯을 가진다. LLM에는 원시 차트가 아니라 질문별 연결·자원·부담·상충·자리 상징만 보낸다. 사용자 상황은 비신뢰 문맥이다.

자리의 상은 관련 대상의 상징에 한정한다. 활동/정돈/왕래/쉼, 변화/머무름/조율 정도만 제공하며 주소·방향·건물·실제 위치를 도출하지 않는다. ‘우주의 기운’은 문체다. 생성문과 공유에는 내부 계산 용어를 넣지 않는다. 구매 전과 결과 하단에 전통 운세와 AI의 상징적 해석이라는 안내를 표시한다.

## 시각과 지역

사용자가 질문을 떠올렸을 때의 현지 날짜·분과 도시를 선택한다. 도시 목록의 중심 좌표를 서버에서 조회하고 `tz-lookup`으로 시간대를 정한다. 서버가 UTC를 확정하고 원 입력·현지 시각·시간대·접수 시각을 함께 저장한다. 5분을 초과한 미래와 5년 이전 시각, 잘못된 날짜, DST 중복·존재하지 않는 시각은 거부한다. 주소나 GPS는 받지 않는다. 미지원 도시를 다른 도시로 대신 선택하지 않도록 안내한다.

## 해석상 한계

- 호라리 접근/이탈은 현시점 위치·속도와 6도 이내 주요 각의 국소 움직임이다. 접근이 곧 사건 성립을 뜻하지 않는다. 별자리 경계 밖 성립, 수용의 세부 품위(삼분성·텀·페이스), 광선 전달·수집, 금지·좌절·굴절을 종합하는 완전한 전통 판정은 제공하지 않는다.
- 달의 공전은 3시간 간격으로 4일까지 기존 천체력에서 구해 현재 별자리 이탈 전 주요 각의 교차를 확인한다. 샘플 사이의 경계는 선형 보간이며 사건 시각으로 제시하지 않는다. 이탈이 관측되지 않으면 `unknown`이다.
- 프라슈나의 판창가·나밤샤·Tajika 적용/성립 규칙 등 기존 엔진의 미산출 항목은 해석 근거로 사용하지 않는다. 서양 연소 8.5도 규칙을 프라슈나에 섞지 않는다.
- 도시 중심·분 단위 입력이므로 경계 부근 해석에 한계가 있다. 넓은 사건 기간을 결정할 검증된 규칙이 없어 시기 항목은 한계를 명시한다. 정확한 연락·재회 날짜나 결과를 보장하지 않는다.
- 출력 검증은 금칙 패턴과 질문별 근거 포함을 검사한다. 모든 자연어의 의미를 완전하게 증명하는 장치는 아니다. 실 LLM 콘텐츠 품질은 별도 승인 후 검증할 대상이다.

## 구매와 복구

기존 `saju_mackerel` 상품의 가격·feature key·5장/총 최소 3,000자 계약을 재사용한다. 새 가격·혜택·이용권을 만들지 않는다. 계산 도메인은 snapshot.analysis 안에서 분리되며 사주 출생 계산은 호출하지 않는다. 기존 `spirit-v1` 구매는 원래 결과로 복구하며 새 방식으로 재생성하거나 재결제시키지 않는다.

사용자+정규화 입력+버전으로 서버 요청 ID를 만들고 기존 요청을 계산·제공자 확인보다 먼저 읽는다. 같은 입력의 중복 실행은 같은 구매와 부분 결과로 돌아간다. 계산 결과·원 입력·판정 근거는 서버 snapshot에 저장되고 공개 API에는 포함되지 않는다. 저장·결제·환불·큐·lease·체크포인트 재읽기 완료 규칙은 기존 저장소 흐름 그대로 사용한다. 장당 최대 3번, 전체 최대 15번의 제공자 호출과 호출당 최대 16,384 출력 토큰으로 제한한다. 추가 복구 횟수로 상한을 늘리지 않는다. 저장된 장을 재생성하지 않는다. `COMPLETED`는 최종 저장 재확인 후에만 가능하다.

## 이미지

내장 imagegen으로 생성. 참조: 사용자가 지정한 `신들린 영냥이2-Photoroom.webp`. 저장: `public/assets/yeongnyangi/spirit/eastern-oracle.webp` (640×640, alpha, WebP). 생성 원본을 보존하고 배포 자산만 압축했다.

최종 프롬프트: “Create a new polished stylized illustration asset for a Korean fortune-telling mobile service, 영냥 신점. Reference image is character identity and linework reference, not an edit target: preserve the adorable white cat, purple eyes, chubby proportions, violet and gold palette, hand-drawn detailed clean storybook/chibi style. Reimagine the same cat as a calm Korean traditional shaman, in elegant ivory and deep violet hanbok ceremonial robes with restrained gold embroidery, traditional small ceremonial headpiece instead of Western witch hat. Cat holds a folded ritual fan and tiny brass bells. A soft violet cosmic crescent halo and a few gentle gold stars suggest contemplation. Eastern Korean spiritual aesthetic, warm and reassuring, no horror. Full body centered, instantly readable at 160px. Genuine transparent background, square composition, generous clear margins, no lettering, no symbols resembling text, no watermark, no UI, no other characters. This is fictional symbolic fortune imagery.”

## 근거 문헌

- [Swiss Ephemeris 프로그래밍 인터페이스](https://www.astro.com/swisseph/swephprg.htm): 하우스 시스템 R 및 황경·속도 계산.
- [Deborah Houlding 호라리 강의](https://www.skyscript.co.uk/horary1a.html): 질문 대상과 주인의 구분.
- [Application](https://direct.skyscript.co.uk/glossary/application/): 접근과 실제 성립의 구분. 이 문서들은 전통 체계의 구현 근거이며 예측 정확도의 실증 근거가 아니다.

## 검증 재현

`node --test __tests__/ui/yeongnyangi-question-sky.test.mjs __tests__/ui/yeongnyangi-spirit-service.test.mjs __tests__/ui/yeongnyangi-spirit.test.mjs`

계산은 실제 로컬 Swiss, 결제·DB·LLM은 mock이며 외부 네트워크를 차단한다. `scripts/verify-yeongnyangi-spirit-ui.mjs`는 두 모드의 390/1280px 입력→mock 결제 준비→부분 결과→새로고침→완료→공유→보관함 재열기를 확인한다. 실제 결제나 유료 LLM 검증이 아니다.

로컬 확인: `check:fast` 종료 코드 0, node 테스트 1,570개 / Jest 290 suites·4,071개 통과. 최신 핵심 재검사 18개 통과. 브라우저 2개 모드 × 2개 너비에서 위 복구·공유 흐름 및 메인 진입 확인. 운영 배포·실결제·실 LLM은 수행하지 않음.
