# 찻집 나머지 모드·연이 등급형·네오 상대방 입력

2026-11-14 후속 구현 기록. [직전 11경로 검증](./character-rooms-20261114.md)에서 남겼던 입력 모드를 다룬다. 개발 모의 검증과 실제 상품 판매를 구분하며, 다른 상품의 성공으로 해당 기능 전체를 완료 처리하지 않는다.

## 기능별 원본과 이번 범위

| 기능 | 웹 원본·생성 경로 | 입력·결과 구분 | 개발 상태 |
|---|---|---|---|
| 찻집 공동 사주 | FortuneTeaHousePage → QuestionInputScene → worker/toss/native-tea.js → worker/routes/fortune-tea-house.js | 본인 출생정보·질문·직업 범주, saju-specialist-v2, 원본 공동 상담 챕터 | 공동 상담 버전이 초안 변경 시 사라지는 결함 수정. 최종 AIT 재검사 중 |
| 찻집 타로 3장 | 같은 찻집 원본 + TeaConsultConfirmation·카드 선택 화면 | 출생정보 없이 질문·3장 선택·결제 전 뽑기 확정·카드별 해석 | 독립 모의 상품·뽑기 저장·재시도 구현. 최종 AIT 재검사 중 |
| 찻집 타로 5장 | 같은 원본, tarotSpread=five | 5장 선택·카드별 해석, 3장과 별도 상품 | 독립 모의 상품·선택 장수 보존. 최종 AIT 재검사 중 |
| 찻집 사주 궁합 | 원본 궁합 입력 → TeaHouseSajuCompatResultPanel → 같은 Worker | 두 사람 이름·출생정보·관계 상황·질문, 계산 근거·강점·주의점·관계 조언 | Windows AIT 구매·재열람 통과. 원본 결과 CSS 연결 수정 후 최종 재검사 중 |
| 찻집 숙요 궁합 | 원본 숙요 입력·결과 → 같은 Worker | 두 사람 출생정보·관계 상황·질문, 숙요 체계의 관계 결과 | Windows AIT 구매·재열람 통과. 최종 AIT 재검사 중 |
| 연이 등급형 질문 편지 | TossLetterRoom·LetterQuestionScope → 원본 ConsultationIntake/Result → worker/toss/letter.js → worker/yeongnyangi/delivery.js | 사주·자미두수·베다 4등급씩, 숙요·서양 점성술·타로 3등급씩: 총 21개 상품 | 기존 원본 입력과 타로 뽑기·후속 대화를 재사용. Windows AIT 21조합 통과 |
| 네오 상대방 입력 | NeoOperationRoomPage → TossNeoGate → worker/toss/native-neo.js → worker/routes/neo-operation-room.js | 연애/재회·본인과 상대 출생정보·관계 상태·말투·사주/자미두수/베다/점성술 | 관계 판독·갈등 패턴·관계 작전 및 수정 작전. Windows AIT 4방식 통과 |

원본 계산·프롬프트·페르소나는 그대로다. 테스트 전용 모의 응답은 운영 생성기를 대체하지 않는다. 특히 숙요 모의 응답의 `mock-response-no-astronomy`는 천문 계산을 수행했다는 표시가 아니다.

## 수정 의도와 실제 발견한 결함

- `QuestionInputScene.tsx`: 공동 상담을 선택한 뒤 입력을 바꾸면 `sajuReportVersion`이 빠져 일반 사주로 바뀌었다. 기존 초안 전달 계약에 선택한 버전을 보존했다.
- `TeaConsultConfirmation.tsx`: 타로의 attemptId가 확정되어 컴포넌트가 다시 마운트될 때 가격 확인 증거가 결제 전에 삭제됐다. 실제 결제 흐름에 넘긴 경우만 정리하도록 `handedToCheckout`으로 구분했다. 가격값·가격 근거의 내용·검증 정책은 변경하지 않는다.
- `TeaHouseSajuCompatResultPanel.tsx`: 오래된 CSS 클래스 대신 이미 존재하는 찻집 리포트 스타일로 연결했다. 기존 달빛 예화 색상·아트·서체·결과 내용을 유지한다.
- `offline/tea-modes.mjs`, `offline/room-fixture.mjs`: 찻집 6상품을 별도 모의 SKU로 나누고 입력·선택 카드·결과 형식을 유지한다. 같은 주문의 상품·입력을 바꾸면 거절한다.
- `offline/neo-partner-fixture.mjs`: 원본 상대방 입력 별칭과 관계 상태를 읽어 관계 판독 결과 형식을 모의 구현한다. 다른 상대방으로 같은 주문을 재사용하지 않는다.
- `offline/letter-fixture.mjs`: 원본 입력 스냅샷을 모의 저장소에 보존해 등급·질문 범위·타로 입력 전달을 확인한다. 기존 `TossLetterRoom`의 원본 질문·말투·결과·뽑기·후속 질문 기능을 다시 만들지 않는다.
- `TossLetterRoom.tsx`·`letter-shared-tokens.module.css`: 공유 타로·후속 질문 컴포넌트가 요구하는 `--yn-*` 토큰을 기존 상담 팔레트에 연결했다. 토큰 누락 때문에 카드 배치칸 테두리·배경이 사라졌던 문제다. 카드 아트 파일은 정상이며 긴 화면 캡처의 빈 덱은 lazy 이미지가 아직 로드되지 않은 별도 현상이었다. 실제 덱으로 스크롤하고 이미지 decode를 기다린 뷰포트 캡처로 구분했다.
- AIT 검사 helper와 CI 실행을 확장했다. 테스트는 일반 홈 카드에서 시작하며 개발 전용 메뉴나 결과 URL로 진입을 대신하지 않는다.

## 검증 기록과 한계

### 확인된 결과

- 연이 기존 입력·prepare·선택 및 새 등급형 API 검사: **43/43 PASS**. 그중 21개 상품별 모의 검사는 잘못된 사주 SKU 거절, 같은 attempt 재사용, 입력 변경 거절, 결제 전 타로 뽑기 강제, 중복 카드 거절, 후속 질문 한도 0/1/2/6회와 중복 요청 보존, 계정 B 접근 거절, 영냥이 기록 분리를 확인했다.
- Windows AIT `01a1d861-fcaa-792a-bada-b65fa094eab5`: 연이 **21조합**, 네오 상대방 **4방식** 통과. 360×740에서 홈 → 입력 → 모의 로그인·구매 → 원문·후속 답변 → 창을 닫고 재진입 → 구매 기록 재열람 → 계정 B 거절을 실행했다.
- 위 연이 검사의 로그는 `D:/Development/Temp/remaining-letter-21.txt`. 모든 상품은 주문 1건이며 재열람 뒤 원장과 결과가 바뀌지 않았다. 타로는 확정한 카드와 장수, 참치는 장기 흐름과 기간 입력을 확인했다.
- 최초 참치 검사에서 ‘살펴볼 흐름’ select를 찾는 exact label이 선택지 텍스트 때문에 일치하지 않았다. 원본 DOM의 ‘장기 시기 전환’ option을 포함한 select로 검사 locator를 수정한 뒤 21조합을 통과했다. 제품 입력 화면의 결함으로 기록하지 않는다.
- 최신 Windows AIT `01a1d870-4551-7929-a087-fe938f3921a6`: 해제 크기 **99,915,648 bytes**. 찻집 6모드 최종 회귀와 시각 검사는 진행 중이며 아직 통과로 기록하지 않는다.

- 토큰 연결 뒤 `letter-room.test.mjs`·`letter-intake.test.mjs` 회귀 **65/65 PASS**. 최종 AIT의 실제 색상·카드 캡처는 새 빌드에서 재확인한다.

### 최종 확정 전 항목

- 최종 Linux AIT·커밋 SHA·main CI·비공개 QR은 아직 이 문서의 확인된 결과가 아니다. 검증 후 별도 증거에 반영한다.
- 최종 Linux 검사는 연이 기본 6 + 등급형 21 + 찻집 6 + 네오 단독 4 + 상대방 4 = **41개 경로**를 실행할 예정이다.
- 실제 토스 기기의 키보드·네이티브 뒤로가기·앱 강제 종료·접근성 읽기와 실제 로그인/IAP는 브라우저 모의 검사로 통과 처리하지 않는다.

### 재현 명령

```text
node --test apps/toss/test/letter-tier-simulation.test.mjs
node --test apps/toss/test/tea-modes-api.test.mjs apps/toss/test/tea-confirmation-handoff.test.mjs apps/toss/test/neo-partner-api.test.mjs apps/toss/test/neo-partner-fixture.test.mjs
node apps/toss/test/private-simulation-archive.mjs <Linux AIT> --character-rooms tea --tea-mode <saju|sajuJoint|tarot|tarotFive|sajuCompatibility|sukuyo>
node apps/toss/test/private-simulation-archive.mjs <Linux AIT> --character-rooms letter --letter-domain <saju|ziwei|sukuyo|vedic|astrology|tarot> --letter-tier <mackerel|salmon|flounder|tuna>
node apps/toss/test/private-simulation-archive.mjs <Linux AIT> --character-rooms neo --neo-method <saju|ziwei|vedic|astrology> --neo-partner
```

참치는 사주·자미두수·베다만 허용한다. Windows 준비 검사는 `--local-windows`를 붙이고 Linux 검증과 구분한다. 외부 API는 차단하며 실패 시 실 LLM이나 실제 결제로 폴백하지 않는다.

## 휴대폰에서 누를 버튼과 기대 결과

최종 새 QR이 준비된 후 사용한다. 기존 `20261114-14` QR은 직전 커밋의 번들이므로 이번 수정 확인에 사용하지 않는다. 모의판의 **비공개 모의 상담 · 실제 결제 없음**, **모의 계정 A** 표시를 확인한다.

공통 진입은 **연이 그림 카드 → 운세 골라보기**다. 로그인은 화면의 **토스로 로그인하기**로 모의 로그인한다.

| 기능 | 버튼·입력 순서 | 기대 결과 |
|---|---|---|
| 공동 사주 | **연이 · 운명의 찻집 → 계정 → 모의 로그인 → 공동 상담 자세히 보기** → 본인 출생정보·질문·분야 → **상담 내용과 가격 확인 → 상담 시작하기** | 일반 사주로 바뀌지 않고 공동 상담 챕터가 표시됨 |
| 타로 3·5장 | 찻집 타로 카드의 **이 상담 시작하기** → **3카드 스프레드** 또는 **5카드 스프레드** → 질문 → **상담 내용과 가격 확인 → 질문에 맞는 카드 배열에서 3장 또는 5장 선택 → 이 질문으로 카드 준비하기 → 자동으로 선택하기 → 상담 시작하기** | 출생정보 요구 없음. 확인 화면에서 선택한 장수와 카드가 저장되고 결과가 열림. 카드 다시 펼치기는 결과 화면의 선택 동작 |
| 사주 궁합 | 찻집의 **두 사람의 사주 궁합도 볼 수 있어요** → 두 사람 이름·생일·성별·시간 모름·현재 상황·질문 → 가격 확인·상담 시작 | 두 사람의 사주 궁합 결과·강점·주의점·관계 조언. 달빛 예화 리포트 레이아웃 |
| 숙요 궁합 | 찻집 숙요 카드의 **이 상담 시작하기** → 두 사람 출생정보·현재 상황·질문 → 가격 확인·상담 시작 | 숙요 체계의 별도 관계 결과. 사주 궁합 상품으로 바뀌지 않음 |
| 연이 등급형 | **연이의 상담 편지** → 질문 → **계속하기** → 로그인 → 해석 방식·**상담 상품** 등급·**현재 상황** → **질문과 상담 범위를 확인했어요** → 프로필·계속하기·**상담 준비하기** | 선택한 체계·등급의 모의 1원 상품. 타로는 78장 화면에서 **연이에게 맡기기** 후 결제. 고등어/연어/광어/참치별 후속 질문 한도 유지 |
| 연이 참치 장기 흐름 | 사주·자미두수·베다 중 하나의 참치 → **살펴볼 흐름: 장기 시기 전환** → **살펴볼 기간** 입력 | 재진입 후 질문·등급·기간 복원, 같은 선택으로 상담 준비 |
| 네오 상대방 | **네오 · 팩폭 전략실 → 고민부터 적어보기 → 연애 / 재회** → 분석 방식·본인 출생정보 → **둘이 함께 본다 → 재회 시도** → 상대 출생정보·매운맛 → **상담 시작하기** | 두 사람의 관계 판독·갈등 패턴·관계 작전. 현실 점검 후 **수정 작전 명령서 받기**로 후속 결과 |

- 찻집은 결과에서 질문을 입력하고 **연이에게 묻기**로 추가 답변을 받는다.
- 결과를 받은 뒤 앱을 닫고 같은 새 QR을 연다. **운세 골라보기 → 꿀꿀운세 구매 기록 → 해당 질문의 다시 보기**에서 같은 본문·후속 답변·선택 카드를 확인한다. 새 결제나 생성이 없어야 한다.
- **모의 계정 B**로 바꾸면 A의 본문이 숨겨지고, B로 로그인해도 A의 결과 주소와 구매 기록을 읽을 수 없어야 한다. 영냥이 보관함에 연이·찻집·네오 기록이 섞이지 않아야 한다.
- 키보드가 열린 상태에서 두 사람의 출생정보·현재 상황을 입력하고 다음 버튼을 눌러 가림 여부를 확인한다. 토스 상단 뒤로가기가 입력/결과의 올바른 단계로 돌아가는지 확인한다.

## 유지한 정책과 운영 게이트

- 웹 이용권·월정석·단건 결제 정책과 기존 구매자의 저장 결과를 유지한다. 완료 결과는 저장 원문을 읽으며 구매 만료나 카탈로그 변경 때문에 삭제하지 않는다.
- 이번에 콘솔 상품·가격·노출을 추가하거나 바꾸지 않았다. 실 LLM·실결제·운영 DB 쓰기·Worker 승격·비밀값 등록·검토 요청·최종 출시를 실행하지 않는다.
- 기존 **4,950원 SKU는 연이 기본 사주 `chat_saju`만**이다. 등급형 편지·찻집·네오에 재사용하지 않는다. 모의 1원 표시는 실제 판매가가 아니다.
- 찻집 6개 featureKey는 각각 `fortune-tea-house-saju-consultation`, `fortune-tea-house-saju-joint-consultation`, `fortune-tea-house-tarot-consultation`, `fortune-tea-house-tarot-five-consultation`, `fortune-tea-house-saju-compatibility-consultation`, `fortune-tea-house-sukuyo-compatibility-consultation`이다. 각 실제 판매에는 대응하는 승인 SKU·표시가·서버 원장 근거가 필요하다.
- 연이 등급형은 `serviceId=yeoni`, `productId=chat_<domain>_<fish>`별 승인 근거가 필요하다. 네오는 `nativeService=neo`, `featureKey=neo-operation-room-consultation`의 승인 상품이 필요하며 단독/상대방 입력은 같은 기능의 입력 구분이다.
- 운영 Worker 승격, mTLS·신원/데이터 암호화·연결 해제 설정, 상품 노출, 판매 개방, 검토 요청, 출시는 각각 별도 게이트로 남는다.

## 수정 파일 안내

주요 변경은 `src/features/fortune-tea-house/components/{QuestionInputScene,TeaConsultConfirmation,TeaHouseSajuCompatResultPanel}.tsx`, `apps/toss/private-simulation/api.mjs`, `apps/toss/test/offline/{room-fixture,tea-modes,neo-partner-fixture,letter-fixture}.mjs`, 실제 AIT 검사 helper와 관련 계약 테스트, `.github/workflows/pr-ci.yml`이다. 최종 커밋과 기능표의 검증 근거는 Linux AIT 검증이 끝난 뒤 확정한다.
