# 그 사람의 바람끼 테스트 — 유료 전달 검증 (재검증표 32행)

- 대상: `relationship-boundary-test`, 100코인 / ₩10,000
- 정본: [worker/routes/relationship-boundary-test.js](../../worker/routes/relationship-boundary-test.js), [worker/lib/relationship-report-delivery.js](../../worker/lib/relationship-report-delivery.js), [worker/lib/relationship-delivery-store.js](../../worker/lib/relationship-delivery-store.js)
- 날짜: 2026-09-19 · 과금 LLM 실호출 0회(전부 mock)

## 결론

**25~31행에서 일곱 번 반복된 "계산 근거 fail-open" 이 이 라우트에서 여덟 번째로 재현됐다.** 확인 포인트가 대놓고 "장별 근거·점수 계산 보존" 인데, 품질 게이트는 저장될 본문을 계산된 확정 점수와 **전혀 대조하지 않았다** — 유일한 근거 검사인 `evidenceHash` 는 프롬프트가 정답을 그대로 실어 보내는 echo 필드였다. 본문이 다른 점수를 말해도, 점수를 한 번도 말하지 않아도 200 completed 로 배송됐다. 계산값 대조를 넣어 fail-closed 로 바꿨다.

## ① 기존 스위트가 무엇을 대역하는가 (사각)

[`__tests__/worker/relationship-paid-delivery.test.js`](../../__tests__/worker/relationship-paid-delivery.test.js) 는 인프라만 대역한다(`db`·`auth`·`nakshatra-paid-access`·`models`·`structured-consultation`·`service-execution-task`). 계산기(`calculateLoveSecretAiSaju`·`scoreBoundary`)는 실물이다 — 여기까지는 건강하다.

사각은 **목 제공자의 본문**이었다. `prose(id)` 는 `id` 와 번호만 조합할 뿐 **점수를 한 번도 쓰지 않는다**. 즉 기존 단언들은 "본문이 확정 점수를 말하지 않아도 200 completed" 를 정답으로 고정하고 있었다(30·31행과 같은 형태). 기존 위조 테스트도 `evidenceHash`·길이·중복만 건드려 이 구멍을 비껴간다.

## ② 라우트를 실제로 돌린 재현

새 스위트 [`__tests__/worker/relationship-score-basis.test.js`](../../__tests__/worker/relationship-score-basis.test.js) 로 실제 POST 했다. 제공자는 `evidenceHash` 를 **정확히 그대로 되돌려주면서** 본문에서는 계산된 확정 점수 대신 다른 점수를 말하거나(위조), 점수를 한 번도 말하지 않는다(침묵).

수정 전 출력 — 두 경우 모두:

```
Expected: 202
Received: 200
```

위조 본문이 그대로 저장돼 11개 part 가 완성되고 completed 로 배송됐다. `evidenceHash` 의 출처는 프롬프트 자신이다([relationship-delivery-store.js:65](../../worker/lib/relationship-delivery-store.js#L65) 에서 `sha256(seed.meta)` 로 만들어 [relationship-report-delivery.js:56-57](../../worker/lib/relationship-report-delivery.js#L56) 지시문에 실어 보낸다) — 같은 값을 되돌려받았는지만 보므로 echo 만으로 통과한다.

프롬프트는 이미 계약을 글로 적어 두었다: `anchors()`([routes:124](../../worker/routes/relationship-boundary-test.js#L124))가 모든 장 프롬프트에 `[확정 점수] ${score}/100, 등급=${grade}` 를 싣는다. 검사만 없었다.

## 수정

1. [relationship-report-delivery.js:13-33](../../worker/lib/relationship-report-delivery.js#L13) — `relationshipScoreAnchor(meta)` 는 대조 기준(계산이 확정한 점수)을 읽고, `relationshipScoreBasisOk(text, score, {citation})` 은 **저장될 본문**만 검사한다. 본문이 말하는 모든 점수 표기(`NN점`·`NN/100`)가 확정 점수와 같아야 하고, 장 앞부분(짝수 id = 근거 절반)은 확정 점수를 **최소 한 번 인용**해야 한다. 앵커가 없으면 통과가 아니라 거절이다(코딩 원칙 10, fail-closed).
2. [relationship-report-delivery.js:74](../../worker/lib/relationship-report-delivery.js#L74) — `valid` 가 `shaped && relationshipScoreBasisOk(...)` 로 바뀌었다. frame 은 저장되는 네 필드(title·caption·summary·finalMessage)를 이어 붙여 대조한다.
3. 지시문에 인용 조건을 명시했다(같은 파일 56~57행): frame·홀수 절반은 "확정 점수 N점 외의 다른 점수를 쓰지 말 것", 짝수 절반은 "확정 점수 N점을 최소 한 번 그대로 인용할 것".
4. [routes/relationship-boundary-test.js:218](../../worker/routes/relationship-boundary-test.js#L218) — `meta.scoreAnchor = { score, grade }`. 프롬프트에 실리는 확정 점수와 **같은 출처**(`boundary`)다. 이 배포 전에 시작돼 `scoreAnchor` 가 없는 진행 중 문서는 `framePrompt` 의 `[확정 점수] N/100` 에서 같은 값을 읽는 폴백으로 계속 돈다.

거절된 part 는 저장되지 않고 기존 복구 루프를 그대로 탄다 — `invalidAttempts` 증가, 최대 3회 재생성, 소진 시 `knownFailed` → `generation_failed` → 환불 503. 새 반환 경로·새 계층을 만들지 않았다(원칙 6).

## 변이 확인 (가드가 실제로 무는가)

대조 한 줄을 `(true || relationshipScoreBasisOk(...))` 로 끄자 즉시 `Expected: 503 / Received: 200` 으로 되돌아갔다. 되살리면 다시 통과. 원복은 node 치환 스크립트로 했고 `git checkout <파일>` 은 쓰지 않았다.

## 기존 스위트 수리

가드를 고치자 기존 16건이 깨졌다 — 목 본문이 점수를 말하지 않기 때문이다. **테스트 쪽을 고쳤다**: `prose()` 앞에 프롬프트의 `[확정 점수] N/100` 줄에서 읽은 실제 점수 인용을 붙였다. 단언 자체는 하나도 낮추지 않았다.

## 새 회귀 5건

| 단언 | 내용 |
| --- | --- |
| 전제 | 6개 생일 × 2성별 12케이스 모두 정수 확정 점수를 갖고, `framePrompt` 가 그 값을 싣고, `relationshipScoreAnchor` 가 `scoreAnchor`·`framePrompt` 양쪽에서 같은 값을 읽는다. `relationshipScoreAnchor({})` 는 `null` |
| 위조 → 환불 | 0번 part 만 다른 점수를 말하면 503 · `reason:'GENERATION_FAILED'` · `retryable:false` · `refunded:true` · `status:'generation_failed'` · `attempts['0']=3` · `invalidAttempts['0']=3`, 나머지 아홉 part(`'1'`~`'9'`)는 보존 |
| 침묵 → 환불 | 근거 절반(2번)이 점수를 한 번도 말하지 않으면 같은 경로로 503 · 환불 |
| 과차단 아님 | 조언 절반(홀수 3번)은 점수를 말하지 않아도 200 completed · 제공자 정확히 11회 |
| 정상 | 정직하게 인용하면 200 completed · `docs[0].score === 38` · 제공자 정확히 11회 |

## 과차단 경계 (솔직한 한계)

30·31행과 달리 이 상품에는 **로컬이 결정론적으로 만드는 본문이 없다** — 장 본문은 전부 LLM 이 쓴다. 따라서 "실제 모델 출력이 확정 점수를 항상 인용하는가" 는 과금 실호출 없이 전수 실측할 수 없다. 대신 (a) 인용 조건을 지시문에 명시했고, (b) 거절은 기존 3회 재생성 루프를 타며, (c) 인용 요구는 11개 part 중 근거 절반 5개(짝수 id `0·2·4·6·8`)에만 걸고 나머지는 "다른 점수를 말하지 말 것" 이라는 약한 조건만 본다.

## A축 — 가격 정합

[paid-feature-registry.js:331](../../worker/lib/paid-feature-registry.js#L331) 에 `{ cost: 100, amountKRW: 10000 }` 이 둘 다 있고, 라우트 [47행](../../worker/routes/relationship-boundary-test.js#L47)이 결제 payload 를 만들 때 `coinPrice !== 100 || amountKRW !== 10000` 이면 `PRICE_NOT_FOUND` 로 던진다 — 가격 불일치가 런타임에 fail-closed 다. [docs/payments/payment-p0-inventory.md:108](../payments/payment-p0-inventory.md) 도 10000 으로 일치. 31행에 있던 `amountKRW` 누락 문제는 이 상품엔 없다.

## ③ 차감–기록 창

이 라우트는 28~31행보다 **창이 넓다**. 결제 증빙 `callbacks.verify`([store:50](../../worker/lib/relationship-delivery-store.js#L50))는 이용권 커버 경로에서 **그 자리에서 `monthlySpendCoin` 을 차감한다**([nakshatra-paid-access.js:141-143](../../worker/lib/nakshatra-paid-access.js#L141)). 환불 가능한 실행 기록이 열리는 `callbacks.open`(=`startServiceExecution`)은 [store:87](../../worker/lib/relationship-delivery-store.js#L87)이다. 그 사이의 실패 반환·throw:

| 위치 | 반환 |
| --- | --- |
| store:51 | `storageFailure` throw (증빙 조회 자체 실패) |
| store:52·53 | 402 `PAYMENT_REQUIRED` / 403 `PAYMENT_REVOKED` |
| store:54·55 | 200 완료본 / 503 `GENERATION_FAILED` (재방문 — 차감 없음) |
| store:58·80·84 | 202 `relationshipPending` (리스 점유) |
| **store:63** | **422 `CALCULATION_FAILED`** — 계산 실패인데 기록은 아직 안 열렸다 |
| store:72·74·75·82 | `storageFailure` throw |

이용권 경로로 들어온 사용자가 여기서 걸리면 예산은 깎였는데 열린 실행 기록이 없다 — 30·31행 관측 (a)/(b) 와 같은 부류다. 다만 회수 장치는 있다: [checkpoint-refund-guard.js:12](../../worker/lib/checkpoint-refund-guard.js#L12) 가 이 featureKey 를 `RelationshipBoundaryTest` 에 매핑해, **기록이 열린 뒤**의 타임아웃 환불은 문서 상태(`partial`·`delivery_pending`·`generating`+진행 흔적)를 보고 `recoverable` 로 되돌린다. 기록이 열리기 전 구간은 그 장치의 사정권 밖이다.

## 검증 명령

```
npm run test:jest -- __tests__/worker/relationship-score-basis.test.js \
  __tests__/worker/relationship-paid-delivery.test.js \
  __tests__/worker/relationship-boundary-test.route.test.js
  → 3 suites / 38 tests passed
npm run check:fast
  → exit 0
```

`npx jest` 는 쓰지 않았다(러너 전용 가드가 뚫린다). 전부 `scripts/run-mock-tests.mjs` 경유.

## 범위 밖 관측 (보고만)

- 🔴 **(a) `scoreBoundary` 가 신살을 못 읽는다 — 점수·등급이 실제로 어긋난다.** [routes:75-78](../../worker/routes/relationship-boundary-test.js#L75) 은 `chart.shinsal["도화"]` / `["홍염"]` 을 찾지만 실제 명식의 모양은 `shinsal.byName["도화살"]` · `shinsal.intensity.dohwa` 다. 그래서 +20·+12 가산이 **한 번도 발화하지 않는다**. 실제 명식 1,152개(6년 × 6월 × 4일 × 4시 × 2성별, 계산 실패 0건) 전수 실측:
  - 도화살 보유 789건, 홍염살 697건, 둘 중 하나 이상 1,017건(88.3%)
  - 의도대로 읽으면 등급이 바뀌는 케이스 872건(75.7%), 평균 점수 20.96점 과소
  - 현재 등급 분포 `{low:794, medium:358, high:0}` ↔ 의도 분포 `{low:114, medium:599, high:439}`
  - 즉 **등급 `high` 와 그에 붙은 서사(경계가 흐려지기 쉬운 구간)는 운영에서 도달 불가능**하다.
  이번 수정은 "본문이 계산값을 지키는가" 축이고, 이것은 "계산값 자체가 맞는가" 축이다. 점수 분포가 바뀌면 상품 서사가 바뀌므로 별도 결정·별도 커밋으로 다룬다(메모리 규칙: 범위 밖 결함은 보고만).
- (b) frame part 의 `character.title/caption` 은 점수를 말할 이유가 없어 인용 요구 대상이 아니다 — "다른 점수 금지" 만 건다.
- (c) D(실제 화면 증거)·F(전용 diff 스크립트)는 이번에도 만들지 않았다 — 23~31행과 같은 경계.
