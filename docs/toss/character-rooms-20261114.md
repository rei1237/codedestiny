# 연이·찻집·네오의 비공개 AIT 상담 검증

2026-11-14 후속 작업. 기존 110개 후보 중 96개 '일부만 이식'에서 세 서비스의 대표 사주 흐름을 우선 연결한다. 다른 상품의 성공으로 같은 화면 전체를 완료 처리하지 않는다.

| 기능 | 원본·생성 경로 | 토스 경로 | 이번 구현·검증 범위 | 아직 남은 단계 |
|---|---|---|---|---|
| 연이 상담 편지 | app/fortune-chat/ConsultationIntake.tsx, ConsultationResult.tsx → worker/toss/letter.js → worker/yeongnyangi/delivery.js | 홈 → 꿀꿀운세 → 연이의 상담 편지 | 원본 질문·프로필·준비·사주 편지, 로그인 후 질문 복원, 별도 mock-yeoni 주문, 앱 재진입 및 꿀꿀운세 구매 기록의 원문 | 질문 등급·타로 뽑기·다른 점술 방식의 Linux AIT 전수 검증, 실기기 |
| 운명의 찻집 | src/features/fortune-tea-house/FortuneTeaHousePage.tsx → worker/toss/native-tea.js → worker/routes/fortune-tea-house.js | 홈 → 꿀꿀운세 → 연이 · 운명의 찻집 | 찻잔 선택·출생일·시간 모름·성별·서울 확인·질문·직업 카테고리·가격 확인, 모의 사주 상담 및 추가 질문 1회, 구매 기록 재열람 | 타로 3·5장, 공동 사주·사주 궁합·숙요 궁합의 별도 계약·모의 AIT 검증, 실기기 |
| 네오 팩폭 전략실 | src/features/neo-war-room/NeoOperationRoomPage.tsx → worker/toss/native-neo.js → worker/routes/neo-operation-room.js | 홈 → 꿀꿀운세 → 네오 · 팩폭 전략실 | 고민·직업/이직·사주·출생정보·매운맛, 모의 브리핑·현실 점검·수정 작전, 구매 기록 원문 | 다른 분석 방식·현실 점검 한도·중단 복원의 실기기 검증 |

## 수정과 경계

- 일반 AIT와 같은 main.tsx → AppEntry.tsx → App.tsx 홈을 사용한다. 개발 메뉴나 결과 URL로 시작하지 않는다.
- private-simulation에서만 연이 편지 SKU와 찻집·네오의 독립 모의 SKU를 연다. 기존 영냥이 29개 목록은 별도로 유지한다.
- 모의 letters/intents/orders를 계정 A/B의 기존 격리 저장소에 함께 저장한다. 결과 원문·추가 질문·수정 작전은 재진입 시 그대로 읽는다.
- 찻집의 ensure-access 모의 응답을 연결했다. 토스 화면은 localhost에서도 웹 미리보기 결과로 폴백하지 않는다.
- 편지·찻집·전략실 모의 처리기는 기존 오프라인 검사와 공유한다. 실제 LLM 계산·프롬프트를 대체하는 운영 코드가 아니다. 모의 결과에는 테스트 전용 표시가 남는다.
- 원본 차분한 달빛 예화 화면과 아트를 유지한다. 찻집 배경과 네오 본문·배경을 이미 번들에 든 캐릭터 그림으로 연결한다. 네오 휘장은 원본 CDN 파일을 320px WebP로 줄여 함께 넣었다.
- 4,950원 mock 표시와 mock-yeoni는 연이 사주 편지에만 사용한다. 찻집·네오는 각각 독립된 1원 가상 SKU이며 실제 판매가가 아니다.
- 웹 이용권·월정석·단건 결제, 기존 결과의 소유권, 서버 판매 원장은 변경하지 않는다. 운영 Worker·비밀값·상품 노출·실결제·검토 요청·출시는 실행하지 않는다.

## 검증 명령

- node --test apps/toss/test/private-simulation.test.mjs apps/toss/test/offline-room.test.mjs
- npm --prefix apps/toss run build:private-simulation
- node apps/toss/test/private-simulation-archive.mjs <AIT 파일> --character-rooms letter
- node apps/toss/test/private-simulation-archive.mjs <AIT 파일> --character-rooms tea
- node apps/toss/test/private-simulation-archive.mjs <AIT 파일> --character-rooms neo

Windows 준비 검사는 --local-windows를 명시한다. Linux 결과와 QR은 확정 후 아래에 별도 기록한다. 각 경로는 360×740, 주문 1건, 저장된 결과, 창을 닫고 재진입, 다른 계정으로 기존 URL 접근 거절, 외부 API 요청 0건을 확인한다. 찻집·네오는 지급 응답 유실 뒤 저장소를 새로 열어 원 주문 복구·재시도·생성 1회를 API 검사에서도 확인한다.

## 휴대폰 확인

새 비공개 모의판에서 상단 '비공개 모의 상담 · 실제 결제 없음'을 확인하고 계정 A로 시작한다. 위 표의 홈 버튼으로 들어가 질문을 작성한다. 출생지 확인은 모의 지원 도시 '서울'을 사용한다.

1. 상담 시작 뒤 토스 앱을 닫았다 열고 홈 → 꿀꿀운세 → 꿀꿀운세 구매 기록 → 다시 보기. 같은 원문과 추가 답변이 보여야 한다.
2. 상단 모의 계정 B로 바꾸고 A의 결과 주소를 열면 원문을 볼 수 없어야 한다.
3. 실제 키보드를 띄워 질문·출생정보·다음 버튼을 눌러 본다. 토스 상단 뒤로가기 후 작성 내용 및 구매 기록 복원을 확인한다.
4. 주문·LLM은 모두 기기의 모의 데이터다. 실제 토스 로그인·IAP·운영 저장은 이 QR의 검증 범위가 아니다.
