---
status: active
updated: 2026-11-01
next: 찻집 최종 전달 SHA의 main CI required 결과를 한 번 확인하고 이 단계만 확정한다.
---

# 앱인토스 운명의 찻집 검증

## 왜

사용자가 영냥이 CI 성공 후 운명의 찻집 한 서비스만 정확히 이식·검증하도록 승인했다. 영냥이 전달 4995da636의 CI 41306639631은 성공했고 개발 검증 완료로 닫았다. 네오 이후는 시작하지 않는다.

## 지금 상태

- 기준 main `4995da6362129462c9c901b1e025e9acbd19ea4d`. 기능 커밋 `08d56081a9de99a71b626e6ec6555bb9de08092d`. PR 없음. 다른 세션 변경을 보존한다.
- 추가 질문 생성 전·저장 직전의 토스 권한 거절이 저장소 503으로 바뀌던 문제를 재현해 수정했다. 인증된 Toss context의 TossError만 원래 code/status로 반환한다. 5xx/429 재시도와 실제 저장소 오류·웹 정책은 유지했다.
- 로컬 검증 완료. 최종 main CI 확인 전까지 완료 대기. 실제 전달 SHA·push 여부·CI URL은 아래 verification.json의 delivery 항목을 따른다.

## 남은 작업

- [ ] 최종 전달 SHA의 CI required 결과 1건. 성공이면 개발 검증 완료로 닫고 보고한다. 실패하면 해당 로그의 원인만 수정한다.
- [ ] 실기기·실결제·유료 AI·운영 DB·토스 상품 등록·업로드·심사·출시는 별도 단계다. 미검증을 완료로 기록하지 않는다.

## 검증

- 원본 핸들러 mock 통합에서 카드 선택 → 체크포인트 → 원문 저장 → 추가 질문 → 재전송 멱등성 → 1회 한도 → 재열람 → 환불 차단 확인. 생성 도중 세션 만료 시 답변 저장·횟수 소모 없음.
- 수정 전 환불409/세션401 대신503 재현. 수정 후 401/403/409 비재시도, 429/502 재시도, 실제 저장소503 일반 오류 및 정보 비노출 통과.
- 찻집 및 추가 질문 계약 174/174, 토스 전체 162/162, lint 오류0(기존 경고6), 앱 로컬 빌드 통과. 업로드 없음.
- `check:fast -- --plan` 확인 후 `check:fast` 종료0. 전체 lint·typecheck·Node·정책·Worker·인코딩 및 Jest443개 묶음/7,228개 통과.
- 원본 preview fixture 브라우저: 입력·카드·결과·재열람·오류 × 360/390/430/1280px 20개 통과. 넘침·깨진 이미지·페이지 오류0. 선택3장의 위치·방향 유지, 재열람 상담 생성0. 실제 토스 SDK 구매 증거는 아니다.
- 정본 `worker/routes/fortune-tea-house.js:6025`. 상세 근거 `D:\Development\code-destiny\outputs\toss-tea-20261101\verification.json`.

## 재개

`D:\Development\code-destiny`에서 `D:\Development\code-destiny\docs\handoff\toss-tea-stage-20261101.md`를 읽고, 기능 커밋 `08d56081a9de99a71b626e6ec6555bb9de08092d`를 포함한 최종 전달 SHA의 CI 결과 확인부터 진행한다. 최종 전달 SHA와 작업공간 정리는 위 근거 폴더 state.json을 따른다. 원래 checkout을 초기화하지 않는다.
