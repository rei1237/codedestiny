# 운영 검증 보고 (PRODUCTION_VERIFICATION_REPORT)

2026-11-28. 이번 변경은 main 에 push 까지만 한다. **운영 승격은 하지 않았다** — 승격은 명시적 1회 요청 때만 한다.
그래서 아래 "운영" 칸은 지금 운영(`e0777b28b0ba`)에 대한 읽기 전용 관찰이고, 이번 변경의 운영 동작은 전부 NOT_TESTED 다.

| 항목 | 로컬 mock | 스테이징 | 운영 |
|---|---|---|---|
| S1 환불 실패 재시도 | PASS | NOT_TESTED (cron 꺼짐) | NOT_TESTED (미승격) |
| S2 10분 실행 스윕 | PASS | NOT_TESTED (cron 꺼짐) | NOT_TESTED |
| S3 서사 재개 6일 | PASS | NOT_TESTED | NOT_TESTED |
| S5 운영자 검토 알림 | PASS | NOT_TESTED | NOT_TESTED — 알림 채널 실제 수신 미확인 |
| S8 판매 중지 플래그 | PASS | NOT_TESTED | NOT_TESTED — 평소엔 비워 둠 |
| S8 외부 감시 스크립트 | PASS (3/3) | — | PASS: 1회 실측 health ok, SHA 일치 |
| S8 감시 워크플로 | — | — | NOT_TESTED — main 머지 후 첫 스케줄 실행에서 확인 |
| 운영 DB 감사 | — | — | PASS (읽기 전용 1회 실행) · 영냥이 범위 NOT_TESTED |

## 실행한 검증

- `npm run check:fast` (결제 변경 → critical 자동 승격) — 단계별 실행, 결과는 커밋 메시지·상태 파일에 기록.
- targeted jest: S1 17/17, S2·S3 350/350, S5 5/5 + 기존 26, S8 판매 중지 3/3.
- `node --test`: 감사 스크립트 4/4, 감시 스크립트 3/3.
- 변이 확인: S1 CAS, S5 표식, S8 호출 제거 — 각각 테스트 1개 실패를 확인하고 원복.
- 머지 전 `npm run check:pre-push`, push 후 main CI 1회 확인.

## 승격 뒤 확인할 것 (승격 요청 시)

1. 감시 워크플로 첫 실행이 성공하고 이슈가 열리지 않는다.
2. Worker 로그에 `[refund-retry]`, `[paid-delivery-review-alert]` 오류가 없다.
3. 운영자 알림 채널에 검토 알림이 오면 문구에 개인정보가 없는지 본다.
