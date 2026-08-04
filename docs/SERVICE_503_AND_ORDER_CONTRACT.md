# 서비스 503 방어와 주문 계약

## 적용 범위

달빛 상점에서 검증한 조회 안전장치를 계정 접근 상태와 주문 읽기 경로에 단계적으로 적용한다. 결제 승인·차감·지급 POST는 이 문서의 조회 retry나 stale 값을 사용하지 않는다.

## 공통 응답 계약

성공 응답은 기존 호환 필드를 유지하면서 다음 필드를 추가한다.

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "generatedAt": "ISO_DATE",
    "schemaVersion": "1",
    "stale": false,
    "source": "db"
  },
  "requestId": "..."
}
```

일시 장애와 계약 오류는 정상 잔량 0으로 변환하지 않는다.

```json
{
  "ok": false,
  "error": {
    "code": "ACCESS_STATE_UNAVAILABLE",
    "retryable": true,
    "message": "..."
  },
  "requestId": "..."
}
```

`401/403/404/409/422`와 계약 오류는 자동 retry하지 않는다. 읽기 `429/502/503/504`만 공통 client에서 최대 1회, `Retry-After` 우선 및 지수 backoff+jitter를 사용한다. 변경 요청은 자동 retry하지 않는다.

## 조회 소유권과 key

- 전역 계정 접근: `/api/me/access-state`와 AccessStore/UserAccessSnapshot
- 달빛 상점 요약: `/api/payments/me?view=shop`와 `remoteQueryKeys.commerce.moonlightSnapshot()`
- 주문 목록: `/api/payments/me?view=history`와 `remoteQueryKeys.orders.list("history")`
- 주문 상세: `/api/payments/orders/:id`와 `remoteQueryKeys.orders.detail(id)`

`authFetch`는 위 GET 경로를 method+URL+refresh 상태 기준으로 single-flight dedupe한다. caller별 `AbortSignal`은 공유 네트워크 요청을 끊지 않고 해당 caller의 결과만 취소해 다른 소비자를 보호한다.

## 주문 데이터 경계

주문 목록은 금액·상품 식별용 요약·상태만 제공한다. 승인번호, 영수증 URL, 원 주문 식별자와 같은 상세 값은 주문을 클릭한 뒤 사용자 소유 검증을 통과한 detail route에서만 제공한다. UI는 `OrderDetailViewModel` adapter를 거쳐 상태·마스킹·legacy nullable 필드를 처리한다.

## 관측

`/api/payments/me`와 주문 상세는 requestId, 비식별 사용자 hash, duration, DB query count, cache/result, deployment SHA를 구조화 로그에 남긴다. 주문번호·paymentId 원문·결제 payload·전화번호·토큰은 로그에 남기지 않는다.

## 미적용/운영 승인 필요

- MongoDB 운영 인덱스와 schema migration은 이 단계에서 실행하지 않는다. 필요한 후보는 `payments.userId + createdAt`, `payments._id`, `payments.merchantUid`이며 테스트 DB explain 후 별도 승인한다.
- Cloudflare preview/production 배포는 사용자 승인 전 수행하지 않는다.
- 실사용자 주문·잔액·이용권을 변경하지 않는다.
