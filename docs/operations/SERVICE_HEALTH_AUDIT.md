# 서비스 상태 감사 (SERVICE_HEALTH_AUDIT)

2026-11-28. 결제 전달 경로의 틈(Phase 0 조사)과 이번 조치 결과. 판정: PASS / FAIL / BLOCKED / NOT_TESTED.

## 틈별 판정

| # | 틈 | 이전 | 조치 | 판정 | 근거 |
|---|---|---|---|---|---|
| 1 | 카드 자동 환불 실패를 아무도 다시 보지 않음 | 고객은 결과도 환불도 없음 | S1 재시도 스위퍼 + 알림 C | PASS (mock) · 운영 미검증 | 테스트 17/17, CAS 변이 시 1 실패 |
| 2 | 시간 초과 실행 원장 스윕이 하루 1회 | 백오프가 사실상 하루 | S2 10분 tick, 이른 재시도부터 | PASS (mock) · 운영 미검증 | targeted jest 350/350 |
| 3 | 서사 서버 재개 24h vs 무료 재시도 7일 | 2~7일 차 끊김은 방치 | S3 창 6일 | PASS (mock) · 운영 미검증 | verify:paid-llm-delivery ok |
| 4 | 이상 알림이 환불 실패를 안 봄 | — | S1 에 포함 | PASS (mock) | 위와 같음 |
| 5 | 기존 구매자 402 → 재결제 유도 | — | 조사만(재현 틈 없음) | NOT_TESTED (운영 화면) | 이론상 틈 3건 → PAYMENT_DELIVERY_AUDIT |
| 6a | 토스 결제 실패 자동 환불 없음 | 무알림 | 공식 문서상 파트너 환불 API 없음 → 운영자 알림(S5) | PASS (mock) | 테스트 5/5 |
| 6b | fortune-chat 단건 카드 자동 환불 없음 | — | 이미 hold 알림·perUseEvidenceId 연결 존재 | PASS (기존) | 코드 확인. 검증기 예외 문구(`scripts/verify-paid-llm-delivery-contract.mjs:63-66`)는 낡음 — 기준을 낮추지 않으려고 그대로 둠 |
| 6c | 보류 서사·수동 검토 상담 무알림 | 아무도 안 읽음 | S5 표식 + 10분 알림 | PASS (mock) | 표식 제거 변이 시 1 실패 |
| 7 | 인벤토리가 복구 어댑터를 하드코딩 | — | 베이스에서 이미 레지스트리 도출로 닫힘 | PASS | 174 상품, 복구 없는 LLM 상품 0 |
| 8 | 처리량(어댑터당 1건/tick) | — | 관찰 후 조정(이번 범위 밖) | NOT_TESTED | 운영 백로그 실측 없음 |
| 9 | 장애 때 새 결제 멈출 수단 없음 | 배포 필요 | S8 env 판매 중지 | PASS (mock) · 화면 미검증 | 테스트 3/3, 호출 제거 변이 시 1 실패 |
| 10 | 운영 외부 감시 없음 | — | S8 GitHub Actions 30분 감시 | PASS (스크립트 1회 실측) · 워크플로 미실행 | 아래 |

## 운영 실측 (2026-11-28, 읽기 전용)

- `/api/health` 200 ok, Pages·Worker 모두 `e0777b28b0ba` (`node scripts/production-health-watch.mjs`).
- 운영 DB 감사: 미전달 의심 6건, 멈춘 기록 4건, 환불 실패 0건 → PAYMENT_DELIVERY_AUDIT.

## 이번에 하지 않은 것

- 고객센터(S9) — 다음 묶음. 설계는 AI_SUPPORT_ARCHITECTURE.
- 전환 분석(Phase 5), 관리자 대시보드 확장, 처리량 상향.
- 과금 LLM 실호출, 실결제, 운영 DB 쓰기, 운영 승격.
