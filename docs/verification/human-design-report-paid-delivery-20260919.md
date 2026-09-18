# 휴먼 디자인 프리미엄 리포트 유료 전달 검증 — 2026-09-19

대상은 재검증표 28행(`human-design-report`, 100코인 / ₩10,000, [`worker/lib/paid-feature-registry.js`](../../worker/lib/paid-feature-registry.js) 269행)이다. 정본은 [`worker/routes/human-design-report.js`](../../worker/routes/human-design-report.js)로, 23~27행 운명 찻집 계열과 **한 줄도 공유하지 않는 별도 라우트**다. 깨어남 복구·후불 과금·체크포인트 구조를 하나도 상속하지 않으므로 A~F를 처음부터 다시 세웠다. 🔴 휴먼 디자인 계산 엔진 자체는 외부 검증이 끝난 코드라 손대지 않았다.

**결론 1 — 25~27행에서 세 번 연속 나온 패턴은 이 라우트에서 닫혀 있다.** 계산 근거가 닫힌 채로는 유료 리포트가 시작조차 하지 못하고, 품질 게이트는 낱말이 아니라 **계산 값을 대조**한다. 세 행 연속의 "게이트 자가 비활성"은 여기서 재현되지 않았다.

**결론 2 — 대신 B축에서 신규 결함 1건을 재현·수정했다.** `/start` 가 차감을 마친 뒤 되돌릴 자리를 열기까지 **실패 창이 셋** 있었고, 그 창에서 죽으면 차감만 남고 회수 경로가 아예 없었다. 코드 커밋 `cc62cc694`.

## 축별 판정

| 축 | 판정 | 실측 근거 |
|---|---|---|
| A 구매 | 기존 코드 정상 | `FEATURE_KEY`/`COIN_PRICE`/`AMOUNT_KRW`(라우트 68~70행)가 레지스트리 269행(100코인·₩10,000)과 일치하고, [`scripts/verify-human-design-report.mjs`](../../scripts/verify-human-design-report.mjs) ①절이 이 셋의 정합성을 강제한다. 차트는 클라이언트가 보낸 값을 믿지 않고 서버가 아카이브 조회 또는 재계산으로 얻는다(402행 주석의 계약) |
| B 생성 | 🔴 **결함 재현·수정** | 아래 "재현한 결함" 절. 한편 **계산 근거 fail-closed 는 진짜로 문다** — `ensureHumanDesignCalculationPresence`([`worker/lib/human-design-ai-prompt.js`](../../worker/lib/human-design-ai-prompt.js) 71~89행)가 7개 필수 필드·`activations` 26개·`definedCenters`/`channels` 배열·`incarnationCross.gates` 를 검사해 **실제로 던지고**, `buildHumanDesignFactSnapshot`·`buildAllowedIds` 가 둘 다 첫 줄에서 그것을 부른다 |
| C 장애 | 기존 코드 정상(수정 후) | 찻집과 달리 **선불**이다. `/start` 가 결제를 확인하고 되돌릴 자리를 연 뒤, `/generate` 는 결제를 재검증하지 않는다(문서 자체가 증빙). 전달 하한 미달이면 `generation_failed` + `refundExecution` → 503 `REPORT_UNDELIVERABLE`. `/start` 쪽 실패 창 3곳이 이번 수정 대상이었다 |
| D 전달 | 기존 코드 정상 | **25행의 낱말 대조와 다르다.** `validateHumanDesignReportSection`([`worker/lib/human-design-report-contract.js`](../../worker/lib/human-design-report-contract.js) 248~316행)이 차트 실값과 모순을 잡는다 — 12개 프로파일 전수 대조 `foreign_profile`, `foreign_type`, 열린 센터를 정의됨으로 쓴 `open_center_called_defined`, `snapshot.channels` 에 없는 `unknown_channel`, `allowed.all` 밖 소제목, `missing_evidence`, `too_short`, `repetition`, `hangulRatio` 로케일 드리프트. 검증기 ③절(243~304행)이 이 모순 분류를 **각각 변이로** 태우고, 오탐 방지 대조군도 함께 돌린다 |
| E 저장·권한 | 기존 코드 정상 | [`__tests__/worker/human-design-paid-delivery.test.js`](../../__tests__/worker/human-design-paid-delivery.test.js) 가 실측한다 — `delivery_pending`·`completed` 에서의 저장 장애(throw/null/확인실패)는 **환불도 재생성도 하지 않고** 503 `RESULT_STORAGE_UNAVAILABLE`, 취소된 증빙 4종 → 402, 타 계정 → 404, 동시 요청 → `[202, 409]`, 체크포인트 실패는 형제 섹션을 보존 |
| F 예산 | 기존 코드 정상 | 18유닛을 **5요청**에 나눠 완주하고 제공자 호출 18회, 환불 0회(같은 스위트). 재열람은 `GET /result` — 검증기가 "🔴 /result 에 결제 게이트가 없다"와 "경과 시간으로 환불하지 않는다"를 강제하고, 과거 `completed` 본문은 새 분량 검사 없이 그대로 나간다. 재열람 LLM·결제·차감 0회 |
| 🟡 "품질 게이트 전량 모킹" 함정 | **해당함(경계)** | 아래 "남은 경계" 절 |

## 재현한 결함 — 차감은 됐는데 되돌릴 자리가 없던 창 3곳

### 증상

`verifyPerUsePayment`([`worker/lib/nakshatra-paid-access.js`](../../worker/lib/nakshatra-paid-access.js) 107행~)는 **조회 전용이 아니다.** 코인·월정석을 통과시키는 그 자리에서 차감하고 `transactionId` 를 돌려주며, 이용권 통과도 2026-09-06 기록대로 `monthlySpendCoin` 을 그 자리에서 깎는다. 그런데 `openRefundableExecution` 은 문서 저장이 **모두 끝난 뒤에야** 호출됐다. 그 사이에 실패 반환이 셋 있었다.

| 창 | 지점 | 응답 |
|---|---|---|
| ① 차트 계산 예외 | `calculateHumanDesignChart` catch | 502 `EPHEMERIS_UNAVAILABLE` |
| ② 확정표 조립 거부 | `buildHumanDesignFactSnapshot`/`buildAllowedIds` catch (fail-closed) | 500 `CALCULATION_INCOMPLETE` |
| ③ 저장 실패 | `resultStorageUnavailable` | 503 |

세 창 전부 **차감은 끝났고 실행 기록은 없다.** 실측은 표 읽기가 아니라 실제 `handleHumanDesignReportRoutes` 에 `/start` 를 POST 해서 잰 것이다 — 세 창 모두 `verifyPerUsePayment` **1회** / `startServiceExecution` **0회**.

### 왜 회수되지 않나

고아 차감을 되돌릴 후보는 `sweepStaleServiceExecutions`([`worker/lib/service-execution-task.js`](../../worker/lib/service-execution-task.js) 1778행) 하나뿐인데, 이것은 `lockNextTimedOutExecution()`(1792행)으로 **이미 있는 실행 기록**을 잠가서 훑는다. 기록이 아예 없으면 잠글 건도 없어 그냥 지나친다. 즉 이 세 창의 차감에는 자동 회수 경로가 **없다**. (전수 확인 범위: `worker/`·`scripts/` 에서 `reconcile|orphan|refundStale|stale.*execution|sweep` grep — 걸린 것은 `reconcilePendingPayments`·`sweepExpiredMonthlyCreditForUser`·`sweepStaleServiceExecutions` 셋이고 앞의 둘은 각각 결제 승인 대기분과 월정석 만료분이라 이 경로와 무관하다.)

①은 특히 재현이 쉽다. 아카이브는 **무료 라우트만** 쓴다([`worker/routes/human-design.js`](../../worker/routes/human-design.js) 105~118행 `archiveChart`) — 유료 `/start` 는 읽기만 하므로, 무료 차트를 먼저 뽑지 않은 사용자는 결제 직후 항상 실계산 경로를 탄다.

### 수정 (선불 계약을 지키는 최소 수정)

1. **실행 기록을 증빙 직후에 연다**(395~396행). `reportId` 는 `inputHash`·`locale` 만 있으면 만들어지므로 계산보다 앞에서 확정된다. 결제 증빙 병렬 읽기(`Promise.all`, 364행)의 지연 최적화는 그대로 둔다.
2. **계산 실패 두 창은 그 자리에서 환불한다**(408·421행). 이 둘은 문서를 아직 한 글자도 쓰지 않은 지점이라 환불과 동시에 살아남는 결과물이 없다.
3. **저장 실패 창은 즉시 환불하지 않는다**(498행 주석). 쓰기가 들어갔는지 확인할 수 없는 창이라(재읽기 실패 포함) 환불과 문서가 함께 살면 **무료 리포트**가 된다 — `verifyStoredHdAccess`(509행)는 취소 증빙만 보고 실행 기록을 보지 않으므로 그 문서로 `/generate` 가 그대로 돈다. 대신 실행 기록이 위에서 열려 있으므로 완주하지 못하면 만료 스윕이 되돌린다.
4. `openRefundableExecution` 이 **실제로 열렸는지 boolean 으로** 알린다(196행~). 차감이 없는 관리자 통과는 `false` 라 없는 실행 건에 환불을 걸지 않는다.

### 가드가 무는지 — 변이 7종

🔴 도는 가드와 무는 가드는 다르다. 전부 국소 편집으로 넣고 국소 편집으로 되돌렸다(`git checkout <파일>` 미사용).

| 변이 | 기대 | 실측 |
|---|---|---|
| M1 실행 기록 열기를 저장부 뒤로 되돌림(원래 코드) | ①②③ 실패 | 3 failed / 5 passed — start-revive 는 **통과**(기존 스위트가 이 창을 덮지 않았다는 증거) |
| M2 ①의 환불 호출 삭제 | ①만 실패 | 1 failed / 7 passed |
| M3 ②의 환불 호출 삭제 | ②만 실패 | 1 failed / 7 passed |
| M4 저장 실패 창에 즉시 환불 추가 | ③만 실패 | 1 failed / 7 passed |
| M5 차감 없는 통과의 `return false` → `true` | 관리자 케이스만 실패 | 1 failed / 7 passed |
| V1 M1 과 동일, 검증기 기준 | 순서 검사만 실패 | ❌ 1건, 나머지 전량 ✅ |
| V2 환불 호출 하나 삭제, 검증기 기준 | 개수 검사만 실패 | ❌ 1건, 나머지 전량 ✅ |

겹쳐서 서로를 가리는 절은 없다(27행에서 배운 실패 형태). 원복 후 전부 녹색.

### 새 검사

- 회귀 [`__tests__/worker/human-design-report.start-charge-window.test.js`](../../__tests__/worker/human-design-report.start-charge-window.test.js) 5건. 🔴 이 스위트는 확정표 조립 함수를 **대역하지 않는다** — 기존 두 스위트가 둘 다 그것을 덮고 있어서, 케이스 ②(500 `CALCULATION_INCOMPLETE`)가 **fail-closed 가 실제로 무는 것의 Jest 쪽 첫 증거**다.
- 검증기 ④절에 순서 검사 2개(404·406행). 기존 "환불 3층이 모두 배선돼 있다"(391행)는 **배선 존재**만 봤고 **열리는 시점**은 보지 않았다.

## 측정

전부 mock, 과금 LLM 실호출 0회, 실결제·운영 DB 쓰기·실환불 0회.

- `node scripts/verify-human-design-report.mjs` — 전량 ✅ (`모든 휴먼 디자인 리포트 검증 통과 ✅ (LLM 실호출 0회)`)
- `npm run test:jest --` — **282스위트 3,982/3,982**(기준선 281스위트 3,977건 + 이번 스위트 1개·5건)
- 표적 2스위트(`human-design-report.`) 8/8
- `npm run check:fast` — **exit 0**(`--plan` 이 뽑은 목록에 `test:jest`·`build:worker`·`verify:entry-encoding --strict-core` 포함)
- 기준선은 작업 시작 시점에 먼저 찍었다 — 검증기 전량 통과 / jest 281스위트 3,977건.

격리 워크트리 `human-design-report-28-20260919-062638`(기저 `f9cea101b`)에서 작업했다. 옆 세션이 공유 체크아웃에서 `index.html`·`js/**`·`public/**`·`marketing/**` 과 `package.json` 을 쓰고 있어 그쪽은 건드리지 않았다. `js/**` 미변경이라 `sync:public` 대상 아님.

## 남은 경계·후속

- 🟡 **품질 게이트 전량 모킹 함정이 이 라우트에는 있다.** `human-design-paid-delivery.test.js` 가 `validateHumanDesignReportSection` 을 `{ok:true, issues:[]}` 로, `requiredSubsectionIds` 를 `[]` 로 대역한다. 그래서 **Jest 쪽에는 품질 게이트가 무는 증거가 없다** — D축 판정의 근거는 전적으로 검증기 ③절의 변이 검사다. 기존 스위트의 목적(전달·환불·저장 계약)과 다른 축이라 이번 최소 수정 범위 밖으로 두고 보고만 한다. 게이트가 실제로 무는 통합 회귀를 Jest 쪽에 한 건 세우는 것이 후속 과제다.
- 🟡 `openRefundableExecution` 은 `startServiceExecution` 실패를 여전히 삼켜 `false` 로 떨어뜨린다(212~215행). 기록 열기 자체가 실패하면 차감은 다시 고아가 되고 만료 스윕도 주울 수 없다. 이번 창 3곳과는 다른 층이고 기존 동작이라 보고만 한다.
- **D 실화면 증거 없음** — 23~27행과 같은 경계다. 이번 판정은 워커·검증기 실행 기준이고 브라우저 실화면 확인은 하지 않았다.
- F 전용 diff 증거 없음(같은 경계).
