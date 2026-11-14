# 찻집 나머지 모드·연이 등급형·네오 상대방 입력

2026-11-14 후속 구현 기록. [직전 11경로 검증](./character-rooms-20261114.md)에서 남겼던 입력 모드를 다룬다. 개발 모의 검증과 실제 상품 판매를 구분하며, 다른 상품의 성공으로 해당 기능 전체를 완료 처리하지 않는다.

이번 추가 범위는 **30개 입력 경로**(찻집 5종 + 연이 등급형 21종 + 네오 상대방 4종)다. 기존 기본 11경로를 포함한 최종 회귀 범위는 **41경로**이며, 서로 다른 완성 서비스 41개라는 뜻이 아니다.

## 기능별 원본과 이번 범위

| 기능 | 웹 원본·생성 경로 | 입력·결과 구분 | 개발 상태 |
|---|---|---|---|
| 찻집 공동 사주 | FortuneTeaHousePage → QuestionInputScene → worker/toss/native-tea.js → worker/routes/fortune-tea-house.js | 본인 출생정보·질문·직업 범주, saju-specialist-v2, 원본 공동 상담 챕터 | 공동 상담 버전이 초안 변경 시 사라지는 결함 수정. Windows·Linux AIT 전체 경로 통과 |
| 찻집 타로 3장 | 같은 찻집 원본 + TeaConsultConfirmation·카드 선택 화면 | 출생정보 없이 질문·3장 선택·결제 전 뽑기 확정·카드별 해석 | 독립 모의 상품·뽑기 저장·재시도 구현. Windows·Linux AIT 전체 경로 통과 |
| 찻집 타로 5장 | 같은 원본, tarotSpread=five | 5장 선택·카드별 해석, 3장과 별도 상품 | 독립 모의 상품·선택 장수 보존. Windows·Linux AIT 전체 경로 통과 |
| 찻집 사주 궁합 | 원본 궁합 입력 → TeaHouseSajuCompatResultPanel → 같은 Worker | 두 사람 이름·출생정보·관계 상황·질문, 계산 근거·강점·주의점·관계 조언 | Windows AIT 구매·재열람 통과. 원본 결과 CSS 연결 및 번들 아트 수정 후 Windows·Linux 재검사 통과 |
| 찻집 숙요 궁합 | 원본 숙요 입력·결과 → 같은 Worker | 두 사람 출생정보·관계 상황·질문, 숙요 체계의 관계 결과 | Windows AIT 구매·재열람 통과. Windows·Linux AIT 전체 경로 통과 |
| 연이 등급형 질문 편지 | TossLetterRoom·LetterQuestionScope → 원본 ConsultationIntake/Result → worker/toss/letter.js → worker/yeongnyangi/delivery.js | 사주·자미두수·베다 4등급씩, 숙요·서양 점성술·타로 3등급씩: 총 21개 상품 | 기존 원본 입력과 타로 뽑기·후속 대화를 재사용. Windows·Linux AIT 21조합 통과 |
| 네오 상대방 입력 | NeoOperationRoomPage → TossNeoGate → worker/toss/native-neo.js → worker/routes/neo-operation-room.js | 연애/재회·본인과 상대 출생정보·관계 상태·말투·사주/자미두수/베다/점성술 | 관계 판독·갈등 패턴·관계 작전 및 수정 작전. Windows·Linux AIT 4방식 통과 |

원본 계산·프롬프트·페르소나는 그대로다. 테스트 전용 모의 응답은 운영 생성기를 대체하지 않는다. 특히 숙요 모의 응답의 `mock-response-no-astronomy`는 천문 계산을 수행했다는 표시가 아니다.

## 수정 의도와 실제 발견한 결함

- `QuestionInputScene.tsx`: 공동 상담을 선택한 뒤 입력을 바꾸면 `sajuReportVersion`이 빠져 일반 사주로 바뀌었다. 기존 초안 전달 계약에 선택한 버전을 보존했다.
- `TeaConsultConfirmation.tsx`: 타로의 attemptId가 확정되어 컴포넌트가 다시 마운트될 때 가격 확인 증거가 결제 전에 삭제됐다. 실제 결제 흐름에 넘긴 경우만 정리하도록 `handedToCheckout`으로 구분했다. 가격값·가격 근거의 내용·검증 정책은 변경하지 않는다.
- `TeaHouseSajuCompatResultPanel.tsx`: 오래된 CSS 클래스 대신 이미 존재하는 찻집 리포트 스타일로 연결했다. 기존 달빛 예화 색상·아트·서체·결과 내용을 유지한다.
- `offline/tea-modes.mjs`, `offline/room-fixture.mjs`: 찻집 6상품을 별도 모의 SKU로 나누고 입력·선택 카드·결과 형식을 유지한다. 같은 주문의 상품·입력을 바꾸면 거절한다.
- `offline/neo-partner-fixture.mjs`: 원본 상대방 입력 별칭과 관계 상태를 읽어 관계 판독 결과 형식을 모의 구현한다. 다른 상대방으로 같은 주문을 재사용하지 않는다.
- `offline/letter-fixture.mjs`: 원본 입력 스냅샷을 모의 저장소에 보존해 등급·질문 범위·타로 입력 전달을 확인한다. 기존 `TossLetterRoom`의 원본 질문·말투·결과·뽑기·후속 질문 기능을 다시 만들지 않는다.
- `TossLetterRoom.tsx`·`letter-shared-tokens.module.css`: 공유 타로·후속 질문 컴포넌트가 요구하는 `--yn-*` 토큰을 기존 상담 팔레트에 연결했다. 토큰 누락 때문에 카드 배치칸 테두리·배경이 사라졌던 문제다. 카드 아트 파일은 정상이며 긴 화면 캡처의 빈 덱은 lazy 이미지가 아직 로드되지 않은 별도 현상이었다. 실제 덱으로 스크롤하고 이미지 decode를 기다린 뷰포트 캡처로 구분했다.
- `character-room-art.ts`: 궁합 장식의 CDN 전용 연이 반신상 대신 이미 번들에 있는 웹 원본 찻집 인물화를 연결했다. 새 이미지나 외부 요청 없이 캐릭터를 유지한다. AIT `01a1d87e-34bb-73b6-8269-3963a008f585`에서 궁합의 모든 표시 이미지로 스크롤해 로드·실패 상태를 확인하고 재열람까지 통과했다(99,916,331 bytes).
- AIT 검사 helper와 CI 실행을 확장했다. 테스트는 일반 홈 카드에서 시작하며 개발 전용 메뉴나 결과 URL로 진입을 대신하지 않는다.

## 검증 기록과 한계

### 확인된 결과

- 연이 기존 입력·prepare·선택 및 새 등급형 API 검사: **43/43 PASS**. 그중 21개 상품별 모의 검사는 잘못된 사주 SKU 거절, 같은 attempt 재사용, 입력 변경 거절, 결제 전 타로 뽑기 강제, 중복 카드 거절, 후속 질문 한도 0/1/2/6회와 중복 요청 보존, 계정 B 접근 거절, 영냥이 기록 분리를 확인했다.
- Windows AIT `01a1d861-fcaa-792a-bada-b65fa094eab5`: 연이 **21조합**, 네오 상대방 **4방식** 통과. 360×740에서 홈 → 입력 → 모의 로그인·구매 → 원문·후속 답변 → 창을 닫고 재진입 → 구매 기록 재열람 → 계정 B 거절을 실행했다.
- 위 연이 검사의 로그는 `D:/Development/Temp/remaining-letter-21.txt`. 모든 상품은 주문 1건이며 재열람 뒤 원장과 결과가 바뀌지 않았다. 타로는 확정한 카드와 장수, 참치는 장기 흐름과 기간 입력을 확인했다.
- 최초 참치 검사에서 ‘살펴볼 흐름’ select를 찾는 exact label이 선택지 텍스트 때문에 일치하지 않았다. 원본 DOM의 ‘장기 시기 전환’ option을 포함한 select로 검사 locator를 수정한 뒤 21조합을 통과했다. 제품 입력 화면의 결함으로 기록하지 않는다.
- 최신 Windows AIT `01a1d870-4551-7929-a087-fe938f3921a6`: 해제 크기 **99,915,648 bytes**. 찻집 6모드의 모의 구매·생성·재열람·다른 계정 차단을 모두 통과했다.

- 토큰 연결 뒤 `letter-room.test.mjs`·`letter-intake.test.mjs` 회귀 **65/65 PASS**. AIT `01a1d87a`에서 실제 색상·배치칸 테두리·불투명 덱 배경·442px 내부 스크롤·원본 카드 decode와 연어 타로 전체 경로도 통과했다.

### 최종 Linux 검증

- runtime 커밋 `80bd0336aeb9f7db61c681693344dce42a01fc10`, [Linux run 43566721402](https://github.com/rei1237/codedestiny/actions/runs/43566721402)의 Critical job `132370661041` **성공**. 연이 기본 6 + 등급형 21 + 찻집 6 + 네오 단독 4 + 상대방 4 = **41개 경로 모두 통과**했다. 신규 30개 입력 경로와 기존 11개 회귀를 합친 수치다.
- 일반 AIT 배포 ID `01a1d8e9-c1e0-70c0-a4b0-b3becc522d27`: 압축 87,854,267 / 해제 99,820,536 bytes. 모의 AIT `01a1d8ea-a09b-7e48-b1bc-e70faae36c8c`: 압축 87,886,190 / 해제 **99,910,754 bytes**. 둘 다 appName `ai-saju-studio`, 비포터블 경로 0, 100MB 제한 통과. 모의 해제 크기의 남은 여유는 89,246 bytes다.
- 모의 AIT SHA-256: `ed565f8d3fc4468ea217ebc5187907343afed14fad2668cf0e501f1dde1c509a`. 실제 AIT 로그의 상품별 PASS 41개와 같은 배포 ID 41회를 대조해 [검증 JSON](./ait-verification-20261114.json)에 기록했다. 전체 기능 판정은 **110개 중 14개 동작·96개 일부만 이식**으로 유지한다.
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

새 **20261114-15** QR을 사용한다. 파일은 `C:/Users/user/Downloads/CodeDestiny/43566721402/toss-mock-20261114-15.png`이며 같은 이름 `.txt`에 앱 링크를 보관했다. 콘솔 버전·배포 ID를 대조하고 PNG 디코딩으로 링크 일치를 확인했다. 기존 `20261114-14` QR은 직전 번들이다. 모의판의 **비공개 모의 상담 · 실제 결제 없음**, **모의 계정 A** 표시를 확인한다.

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

### 로컬 전달 검사

- 구현 커밋: `7c3adc51f`, `81fef3994`, `f2558769d`. 가격 불일치 테스트 상수 수정: `fece5889d7c5ec451fbc1d1884916f63d14dde3d` (main 반영).
- `check:fast --base=0a2561b26b74c501ae5c17b8345fb99c1a53411a` 계획의 전체 단계 완료. 처음에는 당일 무료 운세 생성 파일 누락을 오프라인 `fortune:build-data`로 보완했다. 이어 모의 테스트의 가격 불일치 문자열을 정본 가격 가드가 지적해 `2원`으로 수정했으며 운영 가격은 바꾸지 않았다.
- 이미 통과한 검사를 반복하지 않고 `verify:krw-copy-canonical`과 실제 React 가격 인계 회귀 테스트를 재검사한 뒤 계획의 잔여 3~33단계를 실행했다. Node **5,071/5,071**, Jest **479 스위트·8,004 테스트 통과, 1개 스킵**. 타입·린트·정책·Worker 빌드·인코딩도 통과.
- 최종 커밋 트리에서 `npm run check:pre-push` 통과. 실행 로그는 `remaining-checkfast-resumed-node24.txt`, `remaining-runtime-prepush.txt`에 보관했다.
- 최초 main CI는 기존 웹 변경의 테스트 대역 누락과 로또 안내 제목 폭 때문에 실패했다. LoveSecret 진행 상태 함수, 구매 기록 후기 링크 함수의 대역을 현재 원본에 맞추고 제목 폭을 61에서 54로 줄였다. 동일 결함을 복구한 다른 사용자 세션의 main 변경(`65d8accfe`, `9733ee4ce`, `00433b122`, `eeebfadaf`)을 보존해 `80bd0336aeb9f7db61c681693344dce42a01fc10`에 병합했다. 테스트 대역 7개·무료 기능 7개·제목 폭·사이트맵 1,081 URL 검사 및 병합 트리 pre-push 통과. 상담 기능 코드는 이 복구 과정에서 추가 변경하지 않았다.
- 이어진 `80bd` main CI의 Critical·Build·Typecheck는 성공했지만 Static guards가 취소되어 전체 성공으로 기록하지 않는다. 기존 영냥이 기다리는 화면 테스트의 Next Image 대역이 DOM에 전용 속성을 넘겨 경고 스택 **7,716,181 bytes**를 출력했다. 테스트 8개 자체는 로컬 0.72초에 통과했다. `8ef82c75b`에서 대역의 속성 변환만 바로잡아 같은 8개가 0.39초·901 bytes 출력으로 통과했다. 검사를 지우거나 경고를 전역 차단하지 않았고 AIT 런타임 코드는 바꾸지 않았다.

주요 변경은 `src/features/fortune-tea-house/components/{QuestionInputScene,TeaConsultConfirmation,TeaHouseSajuCompatResultPanel}.tsx`, `apps/toss/private-simulation/api.mjs`, `apps/toss/test/offline/{room-fixture,tea-modes,neo-partner-fixture,letter-fixture}.mjs`, 실제 AIT 검사 helper와 관련 계약 테스트, `.github/workflows/pr-ci.yml`이다. `build-service-inventory.mjs`는 찻집 6개 featureKey와 연이 등급형 21개를 각각 실제 AIT 증거에 연결한다. `full-service-inventory.json`·`feature-matrix.md`를 재생성했고 `inventory-contract.test.mjs` **6/6 PASS**다.

## 최종 전달 증거

- 비공개 QR **20261114-15**, `ai-saju-studio` / `01a1d8ea-a09b-7e48-b1bc-e70faae36c8c`. 업로드·임시저장·테스트 QR만 실행했고 검토 요청·푸시 알림·상품 등록/노출은 하지 않았다.
- 실제 링크: `intoss-private://ai-saju-studio?_deploymentId=01a1d8ea-a09b-7e48-b1bc-e70faae36c8c&host=appsInTossHost`. PNG 450×450의 jsQR 디코딩과 일치했다. Ego TaskSpace64는 `finish({keep:[]})` 한 번으로 종료했다.
- 테스트 대역 복구까지 반영한 main `26b2f860ba8edad2cef5b10b05e7af8ccafc1aa5`의 [CI43569727847](https://github.com/rei1237/codedestiny/actions/runs/43569727847)는 **CI required 포함 모든 lane 성공**. AIT runtime80bd와 이후 테스트·문서 전달 커밋을 구분한다.
- Linux artifact run은 Critical job에서 41경로와 두 AIT 보관을 완료했다. 구형 테스트 대역이 있는 Static guards를 계속 기다리지 않고 산출물 다운로드와 복구 main CI 성공 확인 뒤 전체 run 취소를 요청했다. 이를 전체 CI 성공으로 표시하지 않는다.
- 보관 폴더 `C:/Users/user/Downloads/CodeDestiny/43566721402/`: 일반/모의 `.ait`, 각각의 `metadata.json`, `artifact-job.txt`, QR PNG·앱 링크·디코딩 JSON 및 이 보고서 사본. 기존 Windows 시각 검수 자료는 `C:/Users/user/Downloads/CodeDestiny/remaining-modes-20261114/`에 유지한다.
- 최종 증거 문서의 `npm run check:fast -- --plan`은 fast(whitespace·문서 신선도)로 판정했고 `npm run check:fast` 통과. 재생성 후 inventory 계약 6/6, handoff 계약 235개 문서 통과. 찻집 6개 상품 각각에 실제 AIT 검사 근거 1개씩 연결됐고 110/14/96 집계를 다시 대조했다.
- 공개 URL·검색 노출·canonical·robots·sitemap 정책은 이번 AIT 증거 갱신에 영향 없음. 휴대폰 키보드·네이티브 뒤로가기·실로그인/IAP·운영 SKU·Worker 승격은 여전히 미검증/미실행이다. Ego 업데이트 알림은 확인했으나 업그레이드하지 않았다.
