# 연이·찻집·네오의 비공개 AIT 상담 검증

2026-11-14 후속 작업. 기존 110개 후보 중 96개 '일부만 이식'에서 연이의 기본 편지 6가지, 찻집 사주, 네오의 4가지 분석 방식 등 11개 입력 흐름을 연결한다. 다른 상품의 성공으로 같은 화면 전체를 완료 처리하지 않는다.

| 기능 | 원본·생성 경로 | 토스 경로 | 이번 구현·검증 범위 | 아직 남은 단계 |
|---|---|---|---|---|
| 연이 상담 편지 | app/fortune-chat/ConsultationIntake.tsx, ConsultationResult.tsx → worker/toss/letter.js → worker/yeongnyangi/delivery.js | 홈 → 꿀꿀운세 → 연이의 상담 편지 | 원본 질문·프로필·준비·사주/자미두수/숙요/베다/서양 점성술/타로 기본 편지, 로그인 후 질문 복원, 별도 mock-yeoni 주문, 앱 재진입 및 꿀꿀운세 구매 기록의 원문 | 등급형 질문 편지·등급형 타로 뽑기, 실기기 |
| 운명의 찻집 | src/features/fortune-tea-house/FortuneTeaHousePage.tsx → worker/toss/native-tea.js → worker/routes/fortune-tea-house.js | 홈 → 꿀꿀운세 → 연이 · 운명의 찻집 | 찻잔 선택·출생일·시간 모름·성별·서울 확인·질문·직업 카테고리·가격 확인, 모의 사주 상담 및 추가 질문 1회, 구매 기록 재열람 | 타로 3·5장, 공동 사주·사주 궁합·숙요 궁합의 별도 계약·모의 AIT 검증, 실기기 |
| 네오 팩폭 전략실 | src/features/neo-war-room/NeoOperationRoomPage.tsx → worker/toss/native-neo.js → worker/routes/neo-operation-room.js | 홈 → 꿀꿀운세 → 네오 · 팩폭 전략실 | 고민 작성 후 재진입·질문 복원·직업/이직·사주/자미두수/베다/점성술·출생정보·매운맛, 모의 브리핑·현실 점검·수정 작전, 구매 기록 원문 | 상대방을 추가하는 궁합 입력, 현실 점검 한도·중단 복원의 실기기 검증 |

## 수정과 경계

- 일반 AIT와 같은 main.tsx → AppEntry.tsx → App.tsx 홈을 사용한다. 개발 메뉴나 결과 URL로 시작하지 않는다.
- private-simulation에서만 연이 편지 SKU와 찻집·네오의 독립 모의 SKU를 연다. 기존 영냥이 29개 목록은 별도로 유지한다.
- 모의 letters/intents/orders를 계정 A/B의 기존 격리 저장소에 함께 저장한다. 결과 원문·추가 질문·수정 작전은 재진입 시 그대로 읽는다.
- 네오의 미결제 질문을 Toss 어댑터에서 계정별로 24시간 보관한다. 다시 열면 질문을 복원하고, 직접 비우거나 새로 쓰면 해당 계정의 초안만 갱신한다. 과거 결과를 열어도 작성 중인 질문을 지우지 않는다. 이 만료는 구매 결과에 적용하지 않는다. 웹의 저장 정책은 바꾸지 않는다.
- 찻집의 ensure-access 모의 응답을 연결했다. 토스 화면은 localhost에서도 웹 미리보기 결과로 폴백하지 않는다.
- 편지·찻집·전략실 모의 처리기는 기존 오프라인 검사와 공유한다. 실제 LLM 계산·프롬프트를 대체하는 운영 코드가 아니다. 모의 결과에는 테스트 전용 표시가 남는다.
- 네오 모의 응답은 원본 Worker처럼 method/selectedMethod 입력을 같은 방식으로 읽는다. 선택 방식은 1차 브리핑·수정 작전에 보존하며 같은 주문의 방식을 바꿔 요청하면 거절한다.
- 원본 차분한 달빛 예화 화면과 아트를 유지한다. 찻집 배경과 네오 본문·배경을 이미 번들에 든 캐릭터 그림으로 연결한다. 네오 휘장은 원본 CDN 파일을 320px WebP로 줄여 함께 넣었다.
- 4,950원 mock 표시와 mock-yeoni는 연이 사주 편지에만 사용한다. 찻집·네오는 각각 독립된 1원 가상 SKU이며 실제 판매가가 아니다.
- 웹 이용권·월정석·단건 결제, 기존 결과의 소유권, 서버 판매 원장은 변경하지 않는다. 운영 Worker·비밀값·상품 노출·실결제·검토 요청·출시는 실행하지 않는다.

## 검증 명령

- node --test apps/toss/test/private-simulation.test.mjs apps/toss/test/offline-room.test.mjs apps/toss/test/neo-question-draft.test.mjs
- npm --prefix apps/toss run build:private-simulation
- node apps/toss/test/private-simulation-archive.mjs <AIT 파일> --character-rooms letter --letter-domain <saju|ziwei|sukuyo|vedic|astrology|tarot>
- node apps/toss/test/private-simulation-archive.mjs <AIT 파일> --character-rooms tea
- node apps/toss/test/private-simulation-archive.mjs <AIT 파일> --character-rooms neo --neo-method <saju|ziwei|vedic|astrology>

Windows 준비 검사는 --local-windows를 명시한다. 최종 Linux 결과와 QR은 아래에 기록했다. 각 경로는 360×740, 주문 1건, 저장된 결과, 창을 닫고 재진입, 다른 계정으로 기존 URL 접근 거절, 외부 API 요청 0건을 확인한다. 찻집·네오는 지급 응답 유실 뒤 저장소를 새로 열어 원 주문 복구·재시도·생성 1회를 API 검사에서도 확인한다.

## 확정된 Linux 번들과 새 QR

- 런타임 커밋: b69eea884e8cb431fd40d96cda39a7214d8ed9a6.
- [main CI 43551511758](https://github.com/rei1237/codedestiny/actions/runs/43551511758), [Linux AIT CI 43551511688](https://github.com/rei1237/codedestiny/actions/runs/43551511688) 모두 success. 11개 경로를 Linux AIT의 실제 저장 바이트로 실행했다.
- 새 비공개 모의 버전 **20261114-14**, deployment **01a1d833-9ead-7076-89f6-a79bf93d3921**. 콘솔에서 임시저장·테스트만 진행했고 QR PNG를 디코딩해 같은 배포 ID를 확인했다.
- 산출물 폴더: C:/Users/user/Downloads/CodeDestiny/43551511688. 모의 AIT는 simulation/ai-saju-studio.ait, QR은 toss-mock-20261114-14.png. 실제 판매용 일반 AIT는 regular/ai-saju-studio.ait이며 이번 콘솔에는 올리지 않았다.
- 모의 AIT SHA256: cfa878f98ef89720656db229f948c4405f482f3d1f62fe54a79144947b992b8c. 압축 87,872,283 bytes / 해제 99,882,470 bytes / 비호환 경로 0.
- 일반 AIT deployment 01a1d832-b812-7d83-99b6-059b49ca5a17, SHA256 ed71a142bfaf9cd30b4ce4109a98ec32cf419ec5a5eccfabdb0f3d03ffae0749. 해제 99,803,954 bytes / 비호환 경로 0.
- 전체 기능표는 110개 중 이미 동작 14개·일부만 이식 96개를 유지한다. 이번 11개 하위 흐름의 성공을 상담 전체 또는 전체 이식 완료로 확대하지 않는다.

## 휴대폰 확인

새 비공개 모의판에서 상단 **비공개 모의 상담 · 실제 결제 없음**과 **모의 계정 A**를 확인한다. 홈의 연이 그림 카드에서 **운세 골라보기**를 누른다.

| 경로 | 누를 버튼과 입력 | 기대 결과 |
|---|---|---|
| 연이 편지 | **연이의 상담 편지** → 질문 → **계속하기** → **토스로 로그인하기** → 로그인 화면의 같은 버튼 → **계속하기** → 해석 방식·테스트 프로필 → **계속하기** → **상담 준비하기** → 모의 단건 결제 | 로그인 뒤 작성 질문 유지. 선택한 기본 편지의 테스트 전용 원문. 사주만 모의 4,950원, 나머지는 모의 1원으로 표시되며 실제 결제 없음 |
| 운명의 찻집 | **연이 · 운명의 찻집** → 상단 **계정**에서 모의 로그인 → 첫 사주 찻잔의 **이 상담 시작하기** → 1990-01-01·시간 모름·여성·서울 → **출생지 확인** → 질문·직업 진로 → **상담 내용과 가격 확인** → **상담 시작하기** | 모의 사주 원문과 추가 질문 입력. **연이에게 묻기**로 답변을 받고 함께 재열람 |
| 네오 전략실 | **네오 · 팩폭 전략실** → 모의 로그인 → **고민부터 적어보기** → 질문·직업/이직·해석 방식·테스트 출생정보·매운맛 → **상담 시작하기** | 선택 방식의 모의 브리핑. 현실 점검 입력 후 **수정 작전 명령서 받기**로 수정 작전 표시 |

- 각 결과를 받은 뒤 토스 앱을 닫고 같은 QR로 다시 연다. **운세 골라보기 → 꿀꿀운세 구매 기록 → 해당 질문의 다시 보기**에서 같은 원문과 추가 답변이 보여야 한다. 새 구매나 생성은 없어야 한다.
- 네오에서 새 질문을 쓰고 닫았다 돌아오면 질문이 남아야 한다. 이전 구매 결과를 읽었다가 입력 화면으로 돌아와도 새 질문이 보존되어야 한다.
- 현재 결과에서 **모의 계정 B**로 바꾼다. A의 본문이 숨겨지고 B로 로그인해도 A의 구매 기록이 보이지 않아야 한다.
- 키보드를 띄운 상태로 질문·출생정보와 다음 버튼을 누른다. 토스 상단 뒤로가기, 입력 위치, 하단 버튼 가림, BGM을 확인한다. 이 항목은 브라우저 검사로 실기기 통과를 대신하지 않는다.
- 주문·LLM은 모두 기기에 저장되는 모의 데이터다. 실제 토스 로그인·IAP·운영 저장은 이 QR의 검증 범위가 아니다. 기존 웹 계정의 구매 권리는 웹 보관함에 유지된다.

## 개발 검사 기록

- 최종 런타임 b69eea884: `npm run check:fast -- --base=f63ff9bb069a41bbfe9c93ee61f2d287c63430e1` 종료코드 0. paid-gate 77개, 타입·린트·정책 검사, Node 5,037개, Jest 479 suites/8,000개 통과(기존 1개 skipped). `npm run check:pre-push`도 종료코드 0.
- Windows AIT 최종 네오 4방식: deployment 01a1d811-b7a6-730c-9744-dbc17dc96dd0, expanded 99,888,038 bytes. 방식 보존·새 질문 복원·과거 결과 열람 중 초안 보존·원문·다른 계정 거절을 모두 확인했다. 최종 Linux 번들에서도 11개 흐름이 모두 통과했다.

- private-simulation/offline-room 7개, 네오 질문 초안 2개, 기능표 계약 6개 통과. 네오 초안은 계정 분리·만료·손상 저장소와 구매 전 재진입을 검사했다.
- 첫 check:fast는 sitemap 원본 서명 갱신이 필요해 중단됐다. 해당 공개 URL만 갱신했다. 날짜별 계산 데이터 부재로 Node 검사 하나가 실패해 외부 통신 없는 fortune:build-data로 로컬 파일을 만들고 관련 90개를 재검사했다. 나머지 계획은 이어 실행해 Jest 479 suites / 8000 tests 통과했다.
- 첫 main CI 43547532590은 사용자 지침의 in-progress 상태와 검사기의 active 허용값 불일치로 실패했다. 기존 값과 오타 거절을 유지하면서 in-progress를 허용하는 별도 호환 수정 및 self-test 12개를 통과했다. 후속 main CI와 Linux 아티팩트 CI는 모두 성공했다.
- 웹 SEO는 제목·검색 문구·색인 정책을 바꾸지 않았다. 공유 원본 소스가 바뀐 찻집·전략실 URL의 sitemap 서명과 lastmod만 갱신했다.

## 상품별 운영 게이트

| 대상 | 서버 원장 키 | 남은 설정과 영향 |
|---|---|---|
| 연이 기본 사주 편지 | serviceId=yeoni, productId=chat_saju | 콘솔 4,950원 근거가 있는 기존 SKU만 사용. 새 실판매는 계속 닫힘 |
| 연이 나머지 기본 편지 | chat_ziwei, chat_sukuyo, chat_vedic, chat_astrology, chat_tarot | 각각 독립된 콘솔 SKU·소비자 표시가와 priceEvidence 필요. 사주 SKU 재사용 금지 |
| 찻집 사주 | nativeService=tea, fortune-tea-house-saju-consultation | APPROVED_TOSS_NATIVE_PRODUCTS에 올바른 상품·SKU·가격 근거 필요 |
| 찻집 나머지 모드 | fortune-tea-house-saju-joint-consultation, fortune-tea-house-saju-compatibility-consultation, fortune-tea-house-sukuyo-compatibility-consultation, fortune-tea-house-tarot-consultation, fortune-tea-house-tarot-five-consultation | 각각의 입력·생성·복구 개발 검증과 독립 상품 등록 필요. 이번 사주 성공으로 통과시키지 않음 |
| 네오 전략실 | nativeService=neo, neo-operation-room-consultation | 네 분석 방식은 이 상품의 입력 구분. 네오 전용 SKU·가격 근거 필요 |

2026-11-14 콘솔에서 연이 SKU ait.0000019957.fd8ddb69.45f047076c.4555473325의 판매가 4,950원·미노출을 재확인했다. 등록 상품은 연이 1개·영냥이 4개이며 찻집·네오 상품은 없었다. 가격·노출은 수정하지 않았다. 앱 정보에는 아이콘·썸네일을 배경색이 포함된 사각형으로 제출하라는 기존 반려 사유가 남아 있다. 별도 검토 게이트이며 이번에 검토 요청하지 않았다.

Worker 승격, 기존 TOSS_MTLS 바인딩·만료일과 신원/데이터 암호화 키·연결 해제 인증 설정, TOSS_RELEASE_READY와 NEW_PURCHASES_AVAILABLE 판매 개방은 각각 별도 승인이다. 이 작업에서는 설정값·비밀값·운영 원장을 변경하지 않는다. 검토 요청과 최종 출시는 계속 보류한다.

## 변경 파일

기능 커밋 기준: a5d6f5814 → b69eea884. 검증 증거 JSON과 기능표에 최종 Linux 결과를 반영했다.

- [.github/workflows/pr-ci.yml](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/.github/workflows/pr-ci.yml)
- [apps/toss/private-simulation/api.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/private-simulation/api.mjs)
- [apps/toss/private-simulation/sdk.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/private-simulation/sdk.mjs)
- [apps/toss/service/TossNeoGate.tsx](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/service/TossNeoGate.tsx)
- [apps/toss/service/artwork.md](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/service/artwork.md)
- [apps/toss/service/character-room-art.ts](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/service/character-room-art.ts)
- [apps/toss/service/neo-question-draft.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/service/neo-question-draft.mjs)
- [apps/toss/service/vite-service.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/service/vite-service.mjs)
- [apps/toss/test/character-room-steps.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/test/character-room-steps.mjs)
- [apps/toss/test/neo-question-draft.test.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/test/neo-question-draft.test.mjs)
- [apps/toss/test/offline/fixture.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/test/offline/fixture.mjs)
- [apps/toss/test/offline/letter-fixture.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/test/offline/letter-fixture.mjs)
- [apps/toss/test/offline/room-fixture.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/test/offline/room-fixture.mjs)
- [apps/toss/test/private-character-rooms.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/test/private-character-rooms.mjs)
- [apps/toss/test/private-simulation-archive.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/test/private-simulation-archive.mjs)
- [apps/toss/test/private-simulation.test.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/test/private-simulation.test.mjs)
- [apps/toss/test/room-browser.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/apps/toss/test/room-browser.mjs)
- [config/sitemap-lastmod.json](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/config/sitemap-lastmod.json)
- [docs/CONTEXT_AUDIT.md](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/docs/CONTEXT_AUDIT.md)
- [docs/handoff/_TEMPLATE.md](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/docs/handoff/_TEMPLATE.md)
- [docs/handoff/toss-three-rooms-2026-11-14.md](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/docs/handoff/toss-three-rooms-2026-11-14.md)
- [docs/toss/build-service-inventory.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/docs/toss/build-service-inventory.mjs)
- [docs/toss/character-rooms-20261114.md](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/docs/toss/character-rooms-20261114.md)
- [docs/toss/feature-matrix.md](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/docs/toss/feature-matrix.md)
- [docs/toss/full-service-inventory.json](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/docs/toss/full-service-inventory.json)
- [public/assets/toss-art/neo-war-room-seal.webp](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/public/assets/toss-art/neo-war-room-seal.webp)
- [public/sitemap-ko.xml](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/public/sitemap-ko.xml)
- [public/sitemap.xml](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/public/sitemap.xml)
- [scripts/verify-handoff-contract.mjs](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/scripts/verify-handoff-contract.mjs)
- [sitemap-ko.xml](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/sitemap-ko.xml)
- [sitemap.xml](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/sitemap.xml)
- [src/features/fortune-tea-house/FortuneTeaHousePage.tsx](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/src/features/fortune-tea-house/FortuneTeaHousePage.tsx)
- [src/features/neo-war-room/NeoOperationRoomPage.tsx](https://github.com/rei1237/codedestiny/blob/b69eea884e8cb431fd40d96cda39a7214d8ed9a6/src/features/neo-war-room/NeoOperationRoomPage.tsx)
