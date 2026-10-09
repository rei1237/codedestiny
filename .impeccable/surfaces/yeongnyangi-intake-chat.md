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
- 문서화: `DESIGN.md`의 ‘영냥이 대화형 상담 준비 (2026-10-09)’에 구현된 시각·상호작용 규칙만 추가. PRODUCT.md와 기존 디자인 섹션은 유지했다.
