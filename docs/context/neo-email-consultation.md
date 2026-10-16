# 네오에게 물어봐 — mock 구현 계약

status: done

## 승인 범위

질문별 독립 입력, 질문당 10,000원 합산 단건 결제, 자유 질문, 네오가 외부 AI로 작성한 답변의 수동 입력·검수, 통합 이메일. 자동 AI 호출 없음.

추가 승인: 메인 화면에 진입점, 기존 인간형 네오 이미지, 블루 문 콘셉트. 기존 neo-strategy-portrait.webp를 재사용하며 파란 표면·은빛 글자·Framer Motion의 절제한 등장 모션을 사용한다. reduced-motion에서는 이동을 제거한다. 홈 소스는 템플릿·전용 렌더러·home-funnel.css이며 sync:public으로 생성한다.

## 판매 경계

가격 정본의 neo-email-consultation은 saleEnabled:false, direct_only, per_use다. 고객·관리자 런타임 API는 서비스 어댑터를 주입하지 않아 503으로 닫힌다. URL, 헤더, 환경변수로 mock을 켤 수 없다. 실결제·메일·운영 DB 연결·운영 승격을 하지 않는다.

## 인터페이스

- 고객 /api/neo-consultations: POST 초안, GET 본인 목록, /:id GET 상세, POST /update, /quote, /prepare, /correction.
- 관리자 /api/admin/neo-consultations: 기존 관리자 인증. 목록·상세, POST /answer, /review, /correction, /send, /deliver, /resolve-delivery.
- version은 CAS 조건. 준비 중에는 질문 수정 금지. 견적 ID가 멱등키이며 수량·단가는 저장된 서버 견적에서 계산한다.
- 결제 코어의 createOrder 스냅샷에 상담 견적 신원을 기록한다. 서버 PG 검증 후 지급 경로에서 상담 접수/outbox만 기록한다. 발송 I/O를 결제에 결합하지 않는다.
- 상담 문서는 _id 기본 유니크와 version CAS를 사용한다. 기존 컬렉션 이관·운영 인덱스 생성 없음.
- 발송 중·불명확한 메일은 자동 재시도 금지. 관리자가 제공자 기록을 확인해 전달 완료 또는 미전달로 해소한다. 확실한 실패만 재시도하며 같은 idempotency key를 유지한다.
- 미발송 답변 초안은 고객 응답에서 제외하고, 완료 답변은 deliveries의 검수 스냅샷으로 재열람한다.

## 검증·출시 전 확인

필수 CI node suite가 __tests__/ui/neo-consultation.test.mjs를 자동 실행한다. UI mock 검증기는 scripts/verify-neo-consultation-ui.mjs이며 고객·관리자 실제 React 컴포넌트에 인증·API mock만 주입한다.

출시 전 답변 기한, 환불·취소, 개인정보 보존, 일일 접수 한도를 확정해야 한다. 런타임 어댑터 연결·지속 outbox 실행·실메일 제공자 상태 대조는 출시 작업이다. 이번 산출물은 판매 차단 mock 구현이며 운영 준비 완료를 의미하지 않는다.

## 구현 검증 기록 (2026-10-16)

- 고객 360·390·430·1280px, 관리자 390·1280px, 홈 390·1280px mock 브라우저 검증 통과. 외부 요청 차단, mock 결제 1건·메일 1건으로 통합 답변 재열람까지 확인.
- 상담·홈 Node 검사 19개 및 실제 결제 코어·전달 분류·후기 제외 계약 Jest 검사 23개 통과. 타입 검사, Worker dry-run 빌드, guard-wiring 통과.
- check:fast의 결제 가드 87개 통과. 전체 Jest 6,132개 중 신규 상품 분류 누락 2개 실패를 확인했고 해당 목록을 수정한 뒤 관련 23개를 재검증했다. 전체 Jest 재실행은 CI에서 수행한다.
- 원래 main 작업 폴더의 미커밋 홈 변경 때문에 로컬 fast-forward가 차단됐다. 해당 변경을 보존하며 최신 origin/main을 병합한 작업본을 원격 main으로 전달한다. 로컬 main은 해당 세션 변경 정리 후 동기화해야 한다.
