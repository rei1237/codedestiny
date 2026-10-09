# 영냥이 대화형 상담 준비

Primary target: app/yeongnyangi/_components/IntakeChat.tsx
Related targets: app/yeongnyangi/_components/Consultation.tsx
Mode: Operate. 한국어 질문형 상담의 고민 입력부터 결제 직전까지.

## Direction contract
- THESIS: 긴 주문서 대신 필요한 정보 하나를 묻고 확정한 답변을 대화로 남긴다.
- OWN-WORLD: 기존 영냥이 밤색 --yn-* 표면, 금빛 사용자 말풍선, 기존 welcome 캐릭터 자산.
- STORY: 고민 → 주제와 범위 → 필요한 상황 → 범위·가격 확인 → 프로필/타로 → 최종 확인.
- FIRST VIEWPORT: 작은 상담가 헤더와 말투 선택, 첫 질문 말풍선, 하단 답장 입력창. 이전 답변의 수정이 대표 상호작용이다.
- FORM: 사용자 승인 메신저 구성, code-led, seed 없음(사용자 지정 방향).
- FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Boundaries and proof
기존 QuestionDecision, 가격·추가 질문 정책, 프로필 저장, 결제 준비 요청 계약 재사용. 실제 LLM·결제·운영 DB 호출 없이 mock 검증. 말풍선 원문은 분석 로그에 보내지 않는다.
기존 자산 출처: public/assets/yeongnyangi/profiles/welcome.webp. 새 raster 생성 없음.

## Implemented and reviewed
- 구현: `IntakeChat.tsx`와 `intake-chat.module.css`. 최대 760px의 헤더·대화 내역·답장 영역, 단계별 질문/선택, 이전 답변 수정, 최근 대화 이동, 범위·가격 확인, 기존 프로필/타로 준비 및 최종 확인을 연결했다.
- 접근성/입력: 최소 44px 버튼, 16px 입력 글자, 금빛 focus-visible, 현재 질문의 polite 알림, 한글 조합 중 단축키 전송 차단. 대화·답장 영역 스크롤과 visualViewport 높이 대응을 적용했다.
- Finish disposition: **ship — mock 및 캡처 검증 범위**. 최종 reviewer가 지적한 CSS/답장 영역의 material finding 4건은 모두 해결했다.
- 실제 렌더 캡처: `.impeccable/review/desktop.png`, `mobile.png`, `mobile-active.png`, `mobile-conversation.png`, `mobile-review.png`, `mobile-keyboard-viewport.png`.
- 확인한 근거: 390px 화면의 가로 넘침 없음, mock 사주·진로·타로 요청 payload, 새로고침 복원 및 실패 경로. 390×520 모의 viewport에서 입력창에 포커스한 상태로 전송 버튼이 보임을 확인했다.
- 미검증: 실제 기기의 소프트 키보드 동작, 실제 결제·LLM·운영 DB. 모의 viewport 캡처는 물리 기기 키보드 검증이 아니다.
- 자산 provenance: 위 기존 저장소 `welcome.webp`를 그대로 재사용. 신규 raster 생성·외부 이미지 취득 없음.
- 답장 영역 개편(2026-10-10): 상시 노출되던 `n/1000 · Enter 줄바꿈, Ctrl/⌘+Enter 전송` 안내와 전체 폭 전송 바를 걷어내고 알약형 입력 바·원형 전송 버튼·가로 칩 줄·떠 있는 최근 대화 버튼·입력 중 표시로 바꿨다. 데스크톱 Enter 전송/Shift+Enter 줄바꿈, 터치 Enter 줄바꿈은 `verify-yeongnyangi-intake.mjs`와 hasTouch 모의 캡처로 확인했다. 단계 사이에 textarea를 재생성하지 않고 전송 버튼이 포커스를 가져가지 않게 해 키보드가 유지되도록 했으나, 실제 iOS·Android 키보드에서는 아직 확인하지 않았다.
- 프로필 입력 하단 통일(2026-10-10): `ProfileChatFields`가 현재 필드의 입력 UI를 IntakeChat 답장 영역 슬롯(`IntakeComposerContext`)에 포털로 그린다. 입력은 `form` 속성으로 원래 `<form>`의 FormData에 포함돼 저장·지오코딩·`profileId`·401 처리는 그대로다. 공통 `ChatInputBar`(알약형 바 + 원형 전송)를 질문 단계와 같이 쓰고, 성별·달력·시간 모름은 칩, 현재 위치는 칩 모양 버튼으로 바꿨다. 프로필 입력 중 ‘선택 확인하고 계속하기’는 숨겨 전송 버튼이 하나다. 지난 답변은 아바타 말풍선+‘수정’, 필드 전환 시 맨 아래로 스크롤, 데스크톱은 이름 칸 자동 포커스·Enter 다음 필드(터치 기기는 자동 포커스 생략). `.page input`·`.page button:hover` 전역 규칙이 입력 바 안에 테두리·보라 호버를 그리던 우선순위 문제도 함께 막았다.
  - 확인한 근거: mock QA(`verify-yeongnyangi-intake.mjs`)에 전송 버튼 1개·데스크톱 포커스·Enter 이동·맨 아래 스크롤·저장 오류 후 값 유지·재시도 같은 `profileId`·payload 검사를 추가해 통과. 1000×760, 390×844(터치 에뮬레이션), 390×520 캡처에서 전송 버튼이 화면 안(44×48)이고 390px 가로 넘침 없음. 대화형이 아닌 기존 프로필 폼(`/yeongnyangi/room/` 출석 운세)의 저장·실패 후 재시도도 그대로 동작함을 확인.
  - 미검증: 실제 iOS·Android 소프트 키보드에서 포털 입력의 포커스 유지와 Enter(이동/완료) 동작, 실제 위치 권한 흐름.
- 문서화: `DESIGN.md`의 ‘영냥이 대화형 상담 준비 (2026-10-09)’에 구현된 시각·상호작용 규칙만 추가. PRODUCT.md와 기존 디자인 섹션은 유지했다.
