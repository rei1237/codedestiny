# 셀레스티얼 하모니 타로 리딩 — 유료 전달 검증 (재검증표 31행)

- 대상: `tarot-celestial-harmony`, 100코인 / ₩10,000
- 정본: [worker/routes/celestial-harmony.js](../../worker/routes/celestial-harmony.js), [worker/lib/celestial-report-delivery.js](../../worker/lib/celestial-report-delivery.js), [worker/lib/celestial-delivery-store.js](../../worker/lib/celestial-delivery-store.js)
- 날짜: 2026-09-19 · 과금 LLM 실호출 0회(전부 mock)

## 결론

**25~30행에서 여섯 번 반복된 "계산 근거 fail-open" 이 이 라우트에서 일곱 번째 형태로 재현됐다.** 품질 게이트 `validateCard` 가 저장될 본문을 계산된 카드·행성과 **전혀 대조하지 않았다** — 유일한 근거 검사인 `evidence` 는 프롬프트가 정답을 그대로 실어 보내는 echo 필드였다. 대조 한 줄을 추가해 fail-closed 로 바꿨다.

## ① 기존 스위트가 무엇을 대역하는가 (사각)

[`__tests__/worker/celestial-paid-delivery.test.js`](../../__tests__/worker/celestial-paid-delivery.test.js) 는 인프라만 대역한다(`db`·`auth`·`access-control`·`models`·`gemini`). 계산기(`buildCelestialMelodyReading`)와 품질 모듈은 실물이다 — 여기까지는 건강하다.

사각은 **목 제공자의 본문**이었다. `prose(id,field)` 는 `id`·`field`·번호만 조합할 뿐 **카드명도 행성명도 한 번도 쓰지 않는다**. 즉 기존 13개 단언은 "본문이 뽑힌 카드를 말하지 않아도 200 completed" 를 정답으로 고정하고 있었다(30행에서 실제로 겪은 것과 같은 형태). `test.each(['fact','short','repeat'])` 도 `evidence.planetId` 위조·길이·중복만 건드려 이 구멍을 비껴간다.

## ② 라우트를 실제로 돌린 재현

새 스위트 [`__tests__/worker/celestial-card-basis.test.js`](../../__tests__/worker/celestial-card-basis.test.js) 로 실제 POST 했다. 제공자는 `evidence` 를 **정확히 그대로 되돌려주면서** 본문에서는 계산된 카드·행성을 한 번도 부르지 않는다.

수정 전 출력:

```
● a card body that never names the drawn card is rejected instead of delivered
    Expected: 202
    Received: 200
```

위조 카드가 그대로 저장돼 11장 + summary 가 완성되고 200 completed 로 배송됐다. `evidence` 의 출처는 프롬프트 자신이다([celestial-report-delivery.js:51](../../worker/lib/celestial-report-delivery.js#L51)) — `JSON.stringify({evidence:{planetId,cardNameKo,orientation},...})` 를 모델에 건네고 같은 값을 되돌려받았는지만 보므로, echo 만으로 통과한다. 게다가 `evidence` 는 저장되는 part 에서 버려진다(`CARD_FIELDS` 만 저장).

프롬프트 작성 조건 4번은 이미 계약을 글로 적어 두었다: "각 카드 항목에는 해당 행성명, 카드명, 정역방향 의미가 최소 한 번 자연스럽게 살아 있어야 합니다." 검사만 없었다.

## 수정

[celestial-report-delivery.js `validateCard`](../../worker/lib/celestial-report-delivery.js#L22): 저장되는 6개 본문 필드(`CELESTIAL_CARD_BODY_FIELDS`)에 **계산된 `cardNameKo` 와 `planetKo` 가 둘 다 실제로 등장**해야 통과시킨다. 앵커가 비어 있으면 통과가 아니라 거절이다(코딩 원칙 10, fail-closed).

거절된 part 는 저장되지 않고 기존 복구 루프를 그대로 탄다 — `invalidAttempts` 증가, 최대 3회 재생성, 소진 시 `limited` → 202 `celestialPending`(`retryable:false`). 새 반환 경로·새 계층을 만들지 않았다(원칙 6).

## 과차단이 아님 (전수 실측)

로컬 계산기가 만드는 본문이 이 두 이름을 항상 담는지 **전수** 확인했다. 11개 행성 슬롯 × 전체 타로 78장 × 정/역 = 1,716개 섹션:

```
{ "tarotCards": 78, "total": 1716, "missingCard": 0, "missingPlanet": 0, "missingEitherName": 0, "samples": [] }
```

빠진 경우 0건. 또 `resolveCardModel`([celestial-melody-reading.mjs:326](../../lib/tarot/celestial-melody-reading.mjs#L326))은 최종 폴백 `major[idx % major.length]` 까지 있어 항상 실제 카드로 해석되고 `resolveOrientation`(366)도 항상 upright/reversed 를 낸다 — 30행식 "빈 앵커" 구멍은 이 라우트엔 없다.

## 변이 확인 (가드가 실제로 무는가)

대조 한 줄만 `if (false && ...)` 로 끄자 즉시 `Expected: 202 / Received: 200` 으로 되돌아갔다. 되살리면 다시 통과. 원복은 node 치환 스크립트로 했고 `git checkout <파일>` 은 쓰지 않았다.

## 기존 스위트 수리

가드를 고치자 기존 18건이 깨졌다 — 목 본문이 이름을 말하지 않기 때문이다. **테스트 쪽을 고쳤다**: `prose()` 앞에 프롬프트의 `cards=` 줄(`[N] 행성 - 카드명 / orientation`)에서 읽은 실제 카드·행성 인용을 붙였다(`evidence` 는 `planetKo` 를 싣지 않으므로 이 줄이 유일한 출처). 단언 자체는 하나도 낮추지 않았다.

## 새 회귀 3건

| 단언 | 내용 |
| --- | --- |
| 전제 | 뽑힌 11장 모두 `cardNameKo`·`planetKo` 가 있고 로컬 본문이 둘 다 인용한다 |
| 위조 → 거절 | 0번 카드만 위조하면 202 · `retryable:false` · `premiumStatus:'generating'` · parts 에 `'0'` 없음 · `attempts['0']=3` · `invalidAttempts['0']=3`, 나머지 11개 part 는 보존 |
| 과차단 아님 | 정직하게 인용하면 200 completed · 제공자 정확히 12회 |

## A축 — `amountKRW` 누락은 결함이 아님

사전 관측대로 [paid-feature-registry.js:222](../../worker/lib/paid-feature-registry.js#L222) 는 `cost: 100` 만 있고 `amountKRW` 가 없다. 다만 [billing-policy.js:20](../../worker/lib/billing-policy.js#L20) 이 `cost × KRW_PER_COIN(100)` 으로 자동 환산해 ₩10,000 이 된다. 정합 확인:

- 정적 결제창 `celestial-harmony.html:1017-1018` — `FEATURE_KEY`, `COIN_COST=100`
- `app/_lib/serviceSections.js:46` — "10,000원"
- `docs/payments/payment-inventory.md:124`, `payment-p0-inventory.md:16` — 10000
- `docs/refactor/payment-quality-2026-09-14.md:105`, `MOBILE_FEATURE_REGISTRY.md:65`, `PRICING_AUDIT.md:111` — 10,000원

전부 일치. 원화가를 따로 적는 행과 표기 방식만 다르다.

## 표의 "PDF" — 구현이 없다 (보고만)

재검증표 31행 확인 포인트는 "카드별 필수 해석·PDF" 인데, **이 상품에 PDF 저장·내보내기 경로가 없다.** 추적 파일 전체 `git grep` 으로 `pdf`·`jspdf`·`html2canvas`·`savePdf`·`downloadPdf`·`exportPdf`·`window.print`·`@media print` 를 훑어 `celestial-harmony.html`·`worker/routes/celestial-harmony.js`·`src/features/**` 어디에서도 0건이었다.

라우트 9행의 `withPdfFastDbEnv` 는 이름만 PDF 이고 실제로는 Mongo 연결 타임아웃·재시도 오버라이드다([pdf-runtime.js:11](../../worker/lib/pdf-runtime.js#L11)). 표의 항목이 계획이었는지 다른 상품과 혼동인지는 이 세션 범위 밖이라 수정하지 않고 보고만 한다.

## ③ 차감–기록 창 — 28~30행보다 건강함

- `requirePremiumReportAccess`([access-control.js:767~1097](../../worker/lib/access-control.js#L767))는 **차감하지 않는다**(읽기 판정 + ContentUnlock 권한 upsert). 차감은 프론트 공용 코인 게이트가 POST 전에 끝낸다.
- 실행 기록은 열린다: [celestial-delivery-store.js:60](../../worker/lib/celestial-delivery-store.js#L60) 의 `ServiceExecutionTransaction` upsert 가 `timeoutAt`(10분)·`retentionUntil`(90일)까지 함께 심는다.
- 그리고 [checkpoint-refund-guard.js:18](../../worker/lib/checkpoint-refund-guard.js#L18) 이 이 featureKey 를 `recoverable` 로 분류한다 — 29·30행에 없던 **자동 회수 경로가 살아 있다**.

## 검증 명령

```
npm run test:jest -- __tests__/worker/celestial-card-basis.test.js __tests__/worker/celestial-paid-delivery.test.js
  → 2 suites / 29 tests passed
npm run check:fast
  → exit 0, test:jest 285 suites / 3,994 tests passed
```

## 범위 밖 관측 (보고만)

- (a) 차감–기록 창: 프론트 차감과 line 60 upsert 사이에 실패 반환이 있다(41·43·45·46·48·49·53행 반환, 61~64 throw). 30행 관측 (b) 와 같은 부류로, 자동 회수는 `checkpoint-refund-guard` 가 열린 기록에만 걸리므로 이 구간의 실패는 고아 차감이 될 수 있다.
- (b) `validateSummary` 에는 대조할 계산값 자체가 없어(summary 는 11장 종합) 이번 앵커 검사 대상이 아니다. summary 가 실제 카드 구성을 반영하는지는 분량·중복 검사만 본다.
- (c) D(실제 화면 증거)·F(전용 diff 스크립트)는 이번에도 만들지 않았다 — 23~30행과 같은 경계.
