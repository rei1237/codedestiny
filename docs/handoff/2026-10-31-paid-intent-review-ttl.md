---
status: active
updated: 2026-10-31
next: "운영 reviewRequired 의도 건수 읽기 전용 확인 → RED 승인 → mark()에서 retentionUntil $unset (재등록 함정 포함) 실패 테스트 먼저"
---

# 결제 확인된 서사형 의도(reviewRequired)가 24시간 TTL로 지워진다

색인: [2026-10-31-infra-followups-index.md](2026-10-31-infra-followups-index.md) (2순위)
출처: 인프라 최적화 브랜치 최종 리뷰 fix wave의 "발견, 미수정". 이 브랜치는 주석만 바로잡았다(`25729b770`).

## 요약

- 대상은 유료 서사형 의도다(`ServiceExecutionTransaction`, `status:"awaiting_payment"`, `metadata.paidIntent`). 브라우저가 결제 전에 요청 본문을 맡겨 두고, 10분 크론(`promotePaidIntents`)이 결제를 확인하면 실제 실행 기록으로 승격한다.
- 결제 확인 뒤 승격이 3회(`MAX_ERRORS`) 실패하면 `metadata.paidIntent.reviewRequired:true`로 멈춘다. 6B 알림(`delivery-review-alert.js`의 `paidIntent` 섹션)이 운영자에게 알린다.
- 앱 코드의 만료 삭제(`deleteMany`)와 승격 선택은 `reviewRequired`를 건너뛰도록 이 브랜치에서 고쳤다.
- 그러나 **운영 DB의 TTL 인덱스가 앱 가드와 상관없이 지운다.** 인덱스는 `unpaid_intent_retention_v1`(`{retentionUntil:1}`, `expireAfterSeconds:0`, partial `{status:"awaiting_payment"}`)이고 운영 실재를 확인했다(10D drift dry-run). 등록 때 `retentionUntil = 등록 시각 + 24h`이므로, 검토 대기 의도는 등록 24시간 뒤 사라진다.
- 영향: 결제 기록(Payment·PaidExecutionRecord)은 남는다. 고객이 같은 requestId로 다시 오면 라우트가 그 증빙으로 생성할 수 있다. 하지만 브라우저를 닫은 고객이라면 서버가 대신 만들어 줄 유일한 단서(맡겨 둔 요청 본문)가 24시간 뒤 없어진다. 운영자는 알림을 받은 뒤 남은 시간 안에 처리해야 한다.
- 분류: **RED**(결제 상태·DB 보존 규칙). 착수 전에 위험·검증·롤백을 보고하고 승인을 받는다.

## 근거

줄 번호는 `25729b770` 기준이다.

| 위치 | 내용 |
|---|---|
| `worker/lib/paid-narrative-intent.js:19-20` | `RETENTION_MS = 86400000`, `MAX_ERRORS = 3` |
| `worker/lib/paid-narrative-intent.js:127-132` | 등록. `$set: { timeoutAt: retentionUntil, retentionUntil, "metadata.paidIntent": {..., reviewRequired:false} }`. 객체를 **통째로** 교체한다 |
| `worker/lib/paid-narrative-intent.js:139` `mark()` | `$set`만 쓴다(`metadata.paidIntent.<key>`) |
| `worker/lib/paid-narrative-intent.js:194` | `errors >= MAX_ERRORS`이면 `{ errors, code, reviewRequired: true }` |
| `worker/lib/paid-narrative-intent.js:200-212` | 앱 만료 삭제와 승격 선택에 `"metadata.paidIntent.reviewRequired": { $ne: true }` 가드. 주석이 TTL 한계를 적고 있다 |
| `worker/lib/models.js:869-872` | TTL 선언 |
| `worker/lib/delivery-review-alert.js:86-99` | `paidIntent` 알림 섹션. `select`에 `metadata.paidIntent.body`(고객 요청 본문)를 넣지 않는다 |

## 수정안

**안 1 (권장): `reviewRequired:true`를 쓰는 같은 `updateOne`에 `$unset: { retentionUntil: "" }`를 더한다.**

- MongoDB TTL은 인덱스 필드가 없거나 날짜가 아닌 문서를 만료시키지 않는다. 인덱스 변경이 없다.
- `timeoutAt`은 그대로 둔다. 앱 만료 삭제는 기존 `$ne: true` 가드로 막힌다.
- 저장소 규칙("TTL은 미결제 의도와 임시 캐시에만")과도 맞는다. 결제가 확인된 의도는 TTL 대상이 아니다.
- 함정, 즉 재등록이 검토 상태를 지운다: 같은 키로 등록이 다시 오면(:127-132) `retentionUntil`이 다시 세워지고 `metadata.paidIntent`가 `reviewRequired:false`로 통째 교체된다. `reviewAlertAt`도 초기화돼 알림이 다시 나간다. 등록 단계에서 `reviewRequired:true` 문서는 건드리지 않게 해야 한다.
  - 같은 `{userId, executionKey}` 필터로 upsert하므로, 필터에 조건을 더하면 새 문서 삽입과 unique 충돌을 고려해야 한다.
  - 먼저 읽고 조기 반환하는 쪽이 단순하다. 다만 읽기 1회가 늘어난다.
  - 응답 계약(200 / 409 / 429)도 정한다.

**기각한 안:**

- 안 2, TTL `partialFilterExpression`에 "reviewRequired 아님"을 추가: partial filter는 `$ne`와 `$exists:false`를 지원하지 않아 표현이 어색하다. 또한 운영 인덱스를 drop+create해야 한다. 이는 전역 제약상 변경 계획과 승인이 필요하다.
- 안 3, 검토 대기 시 `status`를 다른 값으로 변경: 사용자별 활성 의도 상한(`countDocuments({status:"awaiting_payment"})`), 6B 조회, 승격 CAS가 모두 `awaiting_payment`에 걸려 있어 공유 동작이 바뀐다.

**운영자 처리 후 정리:** `retentionUntil`을 지운 의도는 자동으로 사라지지 않는다. 처리가 끝난 의도의 정리 방법(운영자 수동 삭제 또는 처리 표식 후 보존)을 계획에 적는다. 결제 기록 보존이 기본값이다.

## 0단계: 운영 현황 (읽기 전용)

- `countDocuments({ status: "awaiting_payment", "metadata.paidIntent.reviewRequired": true })` 건수만 본다. 요청 본문은 열지 않는다.
- 1건 이상이면 그 문서들은 등록 24시간 안에 TTL로 사라진다. 수정보다 먼저 사용자에게 보고한다. 보존을 위한 운영 쓰기(`$unset`)는 승인 항목이다.

## 실패 테스트

`__tests__/worker/paid-narrative-intent.test.js`를 확장한다.

1. 오류가 `MAX_ERRORS`에 닿는 승격 실패: 업데이트 문서에 `$unset.retentionUntil`이 있고 `$set["metadata.paidIntent.reviewRequired"] === true`.
2. 3회 미만 오류: `retentionUntil`을 건드리지 않는다.
3. `reviewRequired:true` 문서에 같은 키로 재등록: `reviewRequired`·`reviewAlertAt`·`errors`가 유지되고, `retentionUntil`이 다시 생기지 않는다.
4. 회귀: `npm run test:jest -- paid-narrative-intent delivery-review-alert`, `npm run verify:cron-mongo-op-coverage`

TTL 동작 자체는 jest로 볼 수 없다. 스테이징 DB에서 테스트 문서 1건으로 확인한다(`retentionUntil` 없음 + `reviewRequired:true` → TTL 모니터 주기(60초) 두 번 뒤에도 남아 있음). 운영 DB 쓰기는 금지다.

## 롤백

- 커밋 revert.
- 이미 `retentionUntil`이 지워진 문서는 TTL 대상 밖으로 남는다. 이는 보존 쪽으로 실패하는 것이라 안전하다. 정리가 필요하면 운영자가 처리한 뒤 승인을 받아 한다.
