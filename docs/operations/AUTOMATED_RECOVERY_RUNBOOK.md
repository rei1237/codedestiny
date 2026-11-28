# 자동 복구 런북 (AUTOMATED_RECOVERY_RUNBOOK)

2026-11-28 기준. "결제했는데 결과를 못 받음"을 자동으로 막는 장치, 사람이 손대야 하는 지점, 비상 조치를 정리한다.
스테이징은 cron 이 꺼져 있다(`crons=[]`). 아래 자동 동작은 mock 테스트로만 증명됐고 **운영 미검증**이다.

## 10분 cron 이 하는 일 (worker/index.js scheduled)

| 순서 | 장치 | 하는 일 | 상한·안전장치 | 출처 |
|---|---|---|---|---|
| 1 | 결제 재조정 | PG 결제됐는데 지급 안 된 주문 확정, 이상 알림 | 기존 | `worker/payments/reconcile.js` |
| 2 | 상담 복구 어댑터 19종 | 생성 실패 상담 재생성·전달 실패 환불 | 어댑터당 1건/tick | 기존 |
| 3 | **환불 실패 재시도 (S1 신규)** | `refund_failed` 카드 환불을 PG 상태 먼저 조회한 뒤 재취소 | 5회, 10분×2ⁿ 백오프, 3일 창, 2026-11-28T15:00Z 이후 실패분만, CAS 선점 | `worker/lib/payment-refund.js` |
| 4 | **실행 원장 스윕 (S2: 하루 1회 → 10분)** | 시간 초과 유료 실행 재시도·종결 | tick당 5건, 다음 재시도 시각이 이른 건부터 | `worker/lib/service-execution-task.js` |
| 5 | 유료 서사 서버 재개 | 끊긴 서사 이어 쓰기 | **창 24h → 6일 (S3)**, 무료 재시도 7일보다 하루 짧게 | `paid-narrative-recovery-task.js` |
| 6 | **운영자 검토 알림 (S5 신규)** | 보류 서사·PG 환불 실패 서사·토스 상담·`*_REVIEW` 상담을 마스킹해 알림 | 전달 성공 뒤에만 표식 해제, 실패 시 다음 tick 재발송, 10건/tick | `worker/lib/paid-delivery-review-alert.js` |

환불 재시도가 5회 실패하면 `manual_review` 로 바뀌고 운영자 알림 C 가 나간다(`reconcile.js`, `fulfillment-alert.js` refundFailures 섹션).

## 사람이 처리하는 경우

| 상황 | 알림 문구 단서 | 할 일 |
|---|---|---|
| 카드 환불 5회 실패 | `refundFailures` / manual_review | PortOne 콘솔에서 결제 상태 확인 → 수동 취소 → 관리자 HQ 기록 |
| 토스 앱 결제 실패 | `[토스] … 토스 콘솔 환불 요청 승인·고객 안내` | 토스는 파트너 환불 API가 없다. 고객이 토스 앱에서 환불 요청 → 콘솔에서 승인 |
| 서사 환불 증빙 없음 | `PAID_NARRATIVE_REFUND_EVIDENCE_MISSING` | 결제 수단(카드·이용권·월정석)을 관리자 HQ에서 확인한 뒤 해당 수단으로 환불 |
| 금액·주문 불일치 검토 | `PAYMENT_AMOUNT_REVIEW` 등 `*_REVIEW` | 주문·PG 금액 대조 후 결정 |

알림에는 결제 식별자 앞 12자, 상품 키, 코드, 날짜만 들어간다. 회원 ID·생년월일·이메일·본문은 넣지 않는다(테스트가 단언).

## 비상: 상품별 새 결제 중지 (S8 신규)

생성 장애로 결제 뒤 결과를 못 줄 때 배포 없이 새 결제를 멈춘다.

1. Cloudflare 대시보드 → 운영 Worker → 변수 `PAYMENT_SALE_PAUSED_FEATURE_KEYS` 에 featureKey 를 쉼표로 넣는다. `*` 는 전체.
2. 효과: 그 상품의 **새 PG 주문(createOrder)** 만 409 `PRODUCT_SALE_PAUSED`. 이미 연 결제창의 확정, 환불, 복구, 재열람은 그대로다.
3. 복구 뒤 변수를 지운다.

미검증: 화면은 전용 처리 없이 일반 결제 오류 메시지 경로로 이 문구를 보여 줄 것으로 보이나 실제 화면으로 확인하지 않았다. 이용권·월정석 차감 경로는 이 플래그로 막히지 않는다(돈이 새로 나가지 않는 경로).

## 외부 감시 (S8 신규)

- `.github/workflows/production-health-watch.yml`: 30분마다(매시 7·37분) `/api/health`, `/version.json`, `/api/version` 을 GET.
- 2분 간격 두 번 모두 실패하면 이슈 "[운영 감시] 운영 상태 이상"을 열거나 댓글을 단다. 회복되면 닫는다.
- 배포·머지 게이트가 아니다. 아무것도 막지 않는다.

## 롤백

각 단계는 독립 커밋이다. 문제가 생기면 그 커밋만 `git revert` 한다(스키마 변경 없음, 기존 필드 + `metadata.*` 표식만 사용).
