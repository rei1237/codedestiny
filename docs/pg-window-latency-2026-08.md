# 정적 셸 카드결제 — PG 결제창 오픈 전 구간 실측 (2026-08-13)

신고: 정적 셸에서 카드 단건결제를 고르면 PG(KG이니시스) 결제창이 뜨기까지 오래 걸린다.

측정 도구는 [scripts/verify-pg-window-live-e2e.mjs](../scripts/verify-pg-window-live-e2e.mjs).
프로덕션(`https://code-destiny.com`)에 실브라우저로 로그인해 셸의 단건 결제 파이프라인
(`_cdRunDirectKrwCheckout`)을 실제로 호출하고, `api.portone.io` 를 끊어 결제창이 뜨기 직전에서 멈춘다.
카드 정보를 넣지 않으므로 과금은 없고, 1회당 PENDING 주문 문서가 1건 생긴다(30분 만료 크론이 정리).

```
node scripts/verify-pg-window-live-e2e.mjs --live --iterations 4
```

## 결론 — 병목은 `POST /api/billing/checkout` 한 왕복이고, 그 안은 전부 서버 시간이다

셸이 원래 찍고 있던 단계 계측(`_cdMarkPgStep`)을 회수한 값이다. 4회 연속:

| run | checkout | sdk | config | customer | total |
|---|---|---|---|---|---|
| 1 (cold) | **11,102ms** | 0ms | 0ms | 0ms | 11,111ms |
| 2 | **4,633ms** | 0ms | 0ms | 0ms | 4,633ms |
| 3 | **4,307ms** | 0ms | 0ms | 0ms | 4,308ms |
| 4 | **9,871ms** | 0ms | 0ms | 0ms | 9,872ms |

- **클릭→PG창 준비 구간의 99.9% 가 checkout 한 단계다.** `sdk`·`config`·`customer` 는 4회 모두 0ms —
  SDK 프리로드([index.html](../index.html) `_cdWarmPortOneV2Sdk`, 첫 pointerdown), 인라인 storeId/channelKey
  지연 getter, 서버가 실어 보내는 customer 가 **이미 제 몫을 하고 있다**. 클라이언트 쪽에 더 깎을 것이 없다.
- 그 checkout 왕복도 **다운로드가 아니라 대기**다: `ttfb ≈ total`(4,302 / 4,629 / 9,867 / 11,097ms),
  `tcp+tls connect = 0ms`(커넥션 재사용). 즉 전부 워커·Mongo 안에서 소비된다.

## 이건 결제 전용 문제가 아니다

같은 세션에서 오간 다른 워커 API 도 같은 크기로 느리다:

```
GET  /api/me/payment-phone      → 503  8,868ms
GET  /api/subscription/status   → 200 13,673ms
GET  /api/sukuyo/calendar/      → 200 15,758ms
GET  /api/auth/me               → 200 16,510ms
POST /api/billing/checkout      → 200 11,114ms
POST api.portone.io/prepare/v2  → 200    169ms   ← 외부 PG 는 정상
```

PortOne 자체 왕복이 **169ms** 인 것과 대비된다. 즉 "PG 사가 느리다"가 아니라 **우리 워커→Atlas 구간이
초 단위로 느리다**. 결제창 지연은 그 전역 지연이 결제 임계경로에서 드러난 증상이다.

7,978 / 8,008 / 8,026ms 처럼 **8,000ms 부근에 몰리는 표본**이 반복 관측됐다. 그 값은
`MONGO_OP_ATTEMPT_TIMEOUT_MS` 기본값(8000, [worker/lib/db.js](../worker/lib/db.js))과 정확히 같다 —
첫 시도가 op 예산에서 끊기고 재시도가 성공하는 그림이 유력하지만, **아직 확증 전이다.**

## 그래서 다음이 필요했다 — 서버 내부 귀속

`durationMs` 한 덩어리로는 admission 대기 / Mongo 커넥션 수립 / 실제 쿼리를 못 가른다.
이번 변경이 그 축을 만든다:

- [worker/lib/db.js](../worker/lib/db.js) — `withMongoRetry(env, op, { timings })` 로 성공한 시도의
  `admissionMs` · `connectMs` · `opMs` · `attempts` 를 채운다(옵션을 안 주면 아무 일도 하지 않는다).
- [worker/payments/db.js](../worker/payments/db.js) — `withPaymentDb` 가 그 객체를 `ctx.dbTimings` 로 들고 다닌다.
- [worker/payments/index.js](../worker/payments/index.js) — `[pay]` 로그에 그대로 싣고, **정상 응답에도**
  `Server-Timing: cd;dur=… , cdadm;dur=… , cdconn;dur=… , cdop;dur=…` 를 붙인다(기존엔 오류 응답에만 있었다).

프로브는 이 헤더를 자동으로 읽어 출력한다. 배포 후 같은 명령을 다시 돌리면 checkout 의 초 단위가
셋 중 어디로 가는지 바로 나온다:

```
server: total=…ms admission=…ms connect=…ms query=…ms
```

## 아직 답하지 않은 것

1. checkout 의 4~11초가 admission 대기인지, 콜드 핸드셰이크인지, 쿼리 자체인지 — **Pass 2 에서 확정.**
2. 8,000ms 클러스터가 op-타임아웃+재시도인지 — `attempts` 값이 답한다.
3. `GET /api/me/payment-phone` 이 503 을 낸 건(8.9초) 별개 사안이다. 저장된 번호가 없는 계정의 **첫 결제**는
   이 왕복이 임계경로에 하나 더 붙는다.

## 프로브 사용 시 주의

- 저장된 결제 전화번호가 없는 계정은 셸이 결제창 직전에 **대화형 번호 입력 모달**을 띄우고 사람을 기다린다
  ([index.html](../index.html) `_cdPromptDirectCheckoutPhoneNumber`). 프로브는 이를 감지해 번호를 주입하고
  건너뛴다 — 저장된 번호가 있는 재구매 사용자와 같은 왕복 수가 된다.
- `window.PortOne.requestPayment` 는 **스텁으로 못 바꾼다**(V2 SDK 가 속성을 잠근다). 그래서 in-page 스텁이
  아니라 `api.portone.io` 네트워크 차단으로 멈춘다.
- 도달 판정의 정본은 셸이 `requestPayment` 직전에 찍는 `[direct-checkout] click→PG steps` 한 줄이다.
