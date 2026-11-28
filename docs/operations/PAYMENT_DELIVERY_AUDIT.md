# 결제 전달 감사 (PAYMENT_DELIVERY_AUDIT)

- 작성: 2026-11-28 · 기준 코드: 워크트리 `wt/payment-gap-p0-20261128-141643` (base `7feed900a7`)
- 운영 DB 조회: 2026-11-28 사용자 승인 **읽기 전용 1회** (`node scripts/audit-paid-orphans.mjs --db code_destiny`, 최근 90일, 결제 후 24시간 지난 건만)
- 쓰기·복구·환불 실행: **없음**. 아래 건들의 복구·환불은 별도 승인 대상이다.
- 마스킹: `ref` 는 결제 식별자의 SHA-256 앞 12자다. 회원 ID·생년월일·이메일·상담 본문은 이 문서에 없다.

## 읽기 전용 보장(실측)

- 스크립트는 `find()` 만 쓰고 `globalThis.fetch` 를 막는다(PG·외부 호출 불가).
- `connectDb` 는 `autoIndex:false`, `autoCreate:false` 라 연결만으로 인덱스·컬렉션을 만들지 않는다 (`worker/lib/db.js:996,1248,1389`).
- 컬렉션당 2,000건 상한을 넘으면 부분 합계를 내지 않고 실패한다.

## 조회 범위와 결과 요약

| 항목 | 건수 | 판정 |
|---|---:|---|
| 스캔한 결제(단건 LLM 상품, paid) | 145 | — |
| 전달 확인 | 28 | PASS |
| **미전달 의심(결과 partial/생성 중)** | **6** | **FAIL — 운영자 확인 필요** |
| 증빙 미발견 | 109 | **NOT_TESTED** (아래 "감사 범위 틈") |
| 멈춘 실행 기록(paid_execution_records) | 1 | FAIL — 확인 필요 |
| 멈춘 서비스 실행 원장 | 3 | FAIL — 확인 필요 (2건은 미전달 의심과 같은 결제) |
| (분류 합계 143 · 스캔 145 와의 차이 2건은 결제 후 24시간 미만 등 분류 대상 밖으로 추정 — 미확인) | | |
| 토스 고아 구매 | 0 | PASS |
| 카드 환불 실패(`refund_failed`) | 0 | PASS |
| 보류된 유료 서사 | 0 | PASS |
| 토스·수동 검토 상담 | 0 | PASS |

## 미전달 의심 6건

모두 결과 문서가 `partial` 이거나 전달 상태가 `generating` 에서 멈췄다. 고객이 결과를 다 받지 못했을 가능성이 높다.

| ref | 상품 | 결제 시각(UTC) | 결과 상태 | 원장 상태 |
|---|---|---|---|---|
| 756a1430e24c | fusion-fortune-consultation | 2026-10-14 08:39 | partial | — |
| 291a1da67f47 | fusion-fortune-consultation | 2026-10-14 10:45 | partial | — |
| 7c986fced41e | destiny-compass-future-sim | 2026-10-14 13:33 | — | generating |
| 42c29352eafd | human-design-report | 2026-10-17 17:29 | partial | generating, retry 0 |
| 15d7a355b006 | human-design-report | 2026-10-29 16:25 | partial | generating, retry 0 |
| 70ddbcfa109e | new-year-ai-consultation | 2026-11-05 10:18 | partial | — |

자동 복구 가능 여부:
- 6건 모두 서사 재개 창(이번 변경 후 6일)과 무료 재시도 창(7일)을 이미 넘었다. 새 cron 이 자동으로 다시 만들지 **않는다**.
- 재생성(과금 LLM 호출)이나 환불은 건별로 운영자가 고른다. 권장 순서: 고객이 결과 화면에서 재시도할 수 있는지 관리자 HQ에서 확인 → 안 되면 환불.

## 멈춘 기록

| ref | 종류 | 상품 | 생성(UTC) | 상태 |
|---|---|---|---|---|
| c9a1158bdd44 | 실행 기록 | vedic_prashna_prompt | 2026-09-06 | single, 미완료 |
| 98fdfecfae0f | 실행 원장 | human-design-report | 2026-10-17 | generating (위 42c2… 와 같은 결제) |
| 0aab94e0dc22 | 실행 원장 | human-design-report | 2026-10-29 | generating (위 15d7… 와 같은 결제) |
| 35f99ca465c7 | 실행 원장 | vedic_ai_prompt_generator | 2026-11-10 | generating, PAID_NARRATIVE_REVIEW_REQUIRED |

human-design 원장 2건은 retry 0 으로 멈춰 있다. 이번 S2 변경(10분 스윕)이 배포되면 이런 원장이 하루가 아니라 10분 단위로 스윕된다. 다만 위 2건은 오래돼 스윕 창 밖일 수 있다 — **운영 미검증**.

## 감사 범위 틈: 영냥이 109건 (NOT_TESTED)

- 증빙 미발견 109건 중 104건이 `yeongnyangi-*` 상품이다.
- 영냥이 결과는 `yeongnyangi_requests` 컬렉션(`worker/lib/yeongnyangi-models.js:69`)에 저장된다. 이 컬렉션이 감사 스크립트의 `RESULT_COLLECTIONS`(`scripts/audit-paid-orphans.mjs:11`)에 없다.
- 그래서 109건은 "미전달 증거"가 아니라 "이 스크립트가 보지 않은 곳"이다(`evidenceNotFoundIsNotProof: true`).
- 나머지 5건: compat-saju-compatibility 2, fortune-tea-house-saju(-joint) 2, fortune-chat-consultation 1 — 역시 결과 저장 위치를 스크립트가 덮지 않거나 결제 연결 키가 달라 대조되지 않은 상품이다.
- 후속: 스크립트에 `yeongnyangi_requests` 결제 연결 키를 확인해 추가한 뒤, **읽기 전용 재조회 1회 승인**을 받아 다시 돌린다.

## 기존 구매자 402 조사 (S4)

실제로 재현되는 "이미 산 사람에게 결제창" 틈은 찾지 못했다. 코드상 이론적 틈 3건:
1. `worker/routes/billing.js` `resolvePaidContentAccess` 는 해금 기록이 없을 때 Payment 를 대체 조회하지 않는다 — 해금 기록 없는 레거시 Payment 만 해당.
2. 출생 범위 키를 profileId 없이 부르는 라우트는 402 를 준다. 화면 문구는 "구매 기록을 못 찾음"이고 결제창을 열지 않는다.
3. tarot-year-fortune 이 다시 유료가 되면 게이트가 완료 기록 조회보다 먼저 돈다(현재는 11-12 부터 무료).

## 다음 조치 (전부 승인 필요)

1. 미전달 의심 6건: 건별로 재생성 또는 환불을 결정한다. dry-run 목록 = 위 표.
2. 멈춘 원장 4건: 관리자 HQ에서 상태를 확인한다.
3. 영냥이 감사 범위 보강 후 읽기 전용 재조회 1회.
