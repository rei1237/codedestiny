# 운명의 지도 심층 리포트 유료 전달 검증 — 2026-09-19

대상은 재검증표 29행(`destiny-compass-deep-report`, 100코인 / ₩10,000, [`worker/lib/paid-feature-registry.js`](../../worker/lib/paid-feature-registry.js) 273행)이다. 정본은 [`worker/routes/destiny-compass-ai.js`](../../worker/routes/destiny-compass-ai.js)로, 23~27행 운명 찻집 계열과도 28행 휴먼 디자인과도 **한 줄도 공유하지 않는 별도 라우트**다. 차감이 프론트 공용 코인 게이트에서 POST **이전에** 끝나는 선불이고, 엣지 100초 컷 때문에 `ctx.waitUntil`+폴링이 아니라 **동기 POST 를 여러 회** 나눠 10섹션을 완주한다.

**결론 1 — 25~27행에서 세 번, 28행에서 한 번 다뤄진 "계산 근거 fail-open" 이 이 라우트에서 5번째 형태로 재현됐다.** 체계 섹션(사주·자미·숙요·타로)의 확정값 버킷이 비어도 그 섹션 프롬프트는 확정값 블록 **없이** 그대로 나가고, 품질 게이트는 방향·항로 라벨이 늘 허용 목록에 있어 창작된 명반을 통과시킨다. 실측으로 사주 버킷 하나만 든 팩이 **200 `completed` · 10/10 · 환불 0** 으로 완주했다.

**결론 2 — B축에서 차감–기록 창 1건을 추가로 재현·수정했다.** 되돌릴 실행 기록이 결과 저장 **뒤에** 열려 있어, 저장 실패 창(503)에서는 차감만 남고 만료 스윕이 주울 기록이 0건이었다. 28행에서 닫은 창과 같은 형태가 이 라우트에도 하나 남아 있었다. 코드 커밋 `668be1b5c`.

## 축별 판정

| 축 | 판정 | 실측 근거 |
|---|---|---|
| A 구매 | 기존 코드 정상 | `FEATURE_KEY`(49행)·`REPORT_COST = 100`(52행)이 레지스트리 273행(100코인·₩10,000)과 일치. 차감은 라우트가 아니라 프론트 공용 코인 게이트가 POST 전에 끝내고, 라우트는 `access.matchedTransactionId` 로 그 증빙을 확인해 되돌릴 자리를 연다(242~254행) |
| B 생성 | 🔴 **결함 2건 재현·수정** | 아래 "재현한 결함". 수정 후 체계 근거가 비면 **제공자 호출 0회**로 422 `CALCULATION_INCOMPLETE`(346~352행), 실행 기록은 저장보다 먼저 열린다(560행) |
| C 장애 | 기존 코드 정상 | 섹션별 `attempts`/`failures` 누적으로 유계 실패를 끊고(359행), 완주 못 하면 `generation_failed` + 환불. 저장 장애는 `resultStorageUnavailable` 로 503(304·310·318·320·571·574행)이며 **즉시 환불하지 않는다** — 문서가 실제로 써졌는지 확인할 수 없는 창이라 환불하면 무료로 읽히는 리포트가 남는다(28행과 같은 판단). 대신 실행 기록이 먼저 열려 있으므로 만료 스윕이 되돌린다 |
| D 전달 | 🟡 **부분 정상(가드 보강 후)** | 완주 판정은 공백 제외 **20,000자 하한 + 구절 반복 검사**(394행)로 분량·중복은 잡는다. 그러나 `validateCompassSection`(계약 390~440행)의 확정값 대조는 `ctx.allowedLabels` 를 하나라도 인용했는지만 보는데(423~426행) 이 목록에 방향·항로 라벨(직장·커리어/재물/30일 항로…)이 늘 들어 있어 **창작된 명반을 걸러내지 못한다**. 이번 수정은 "확정값이 아예 없는 섹션을 생성 전에 끊는" 쪽으로 닫았고, 게이트가 계산 값 자체를 대조하도록 바꾸는 일은 범위 밖으로 두고 보고만 한다(아래 남은 경계) |
| E 저장·권한 | 기존 코드 정상 | 기존 회귀 [`__tests__/worker/destiny-compass-paid-delivery.test.js`](../../__tests__/worker/destiny-compass-paid-delivery.test.js) 24건이 실측한다 — 저장 throw/미확인 → 503 `RESULT_STORAGE_UNAVAILABLE`, 취소 증빙 → 402, 타 계정 → 404, 동시 요청 → 409, 락 만료 120초(337행), 재열람은 결제·LLM 0회 |
| F 예산 | 기존 코드 정상 | 10섹션 = 제공자 **10회**를 **3회 POST** 로 나눠 완주(실측: 다섯 체계 정상 팩 → 200 `completed`, `progress {completed:10,total:10}`, `degraded:false`, 환불 0, 완료 처리 1회). 섹션당 2,000~3,600자 계약(계약 50~104행)이 20,000자 하한과 정합 |
| 🟡 "품질 게이트 전량 모킹" 함정 | **해당함(경계)** | 기존 스위트가 `validateCompassSection`→`[]`, `buildAllowedLabels`→`[]`, `buildCompassBasisPayload`→`{}`, `computeSystemStars`→`[]`, `resolveGrounds`→`[]`, `buildCompassSectionPrompt`→`spec.key` 로 **대역**한다. 즉 Jest 쪽에서 품질 게이트는 한 번도 돈 적이 없다 — 이 대역된 자리가 결함 A 가 숨어 있던 사각이다. 신규 스위트는 계약 모듈을 **대역하지 않는다** |

## 재현한 결함 A — 체계 확정값이 비어도 유료 리포트가 완주한다

### 증상

`evidencePack.systems` 에 사주 버킷 하나만 담아 실제 라우트에 POST 했다(대역 없이 계약 모듈 실행). 실측:

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| 응답 | **200 `completed`** | **422 `CALCULATION_INCOMPLETE`**, `missingSystems: ["ziwei","sukuyo","tarot"]` |
| 섹션 | 10/10 `ok` | 0/10(생성 진입 전 차단) |
| 제공자 호출 | **10회** | **0회** |
| 환불 | **0회** | 1회(`destiny-compass-deep-report:<idempotencyKey>`) |
| 저장 문서 | `completed` | `generation_failed` + `generationError.refunded: true`, 재진입 409 |

창작 경로도 직접 떠서 확인했다 — 자미 섹션 프롬프트 1,014자 안에 `[자미두수 확정값]` 블록이 **아예 없는데도** "명궁 주성 → 삼방사정 회조 → 사화 착지" 지시는 그대로 실려 나간다. 그 지시에 맞춰 자미성·천부·무곡·화록을 지어낸 본문을 `validateCompassSection` 에 넣으면 issues 는 **`[]`**(통과). `grounds` 는 `[]`, `systemStars` 는 사주 `weightPct:100` — 화면에는 다섯 체계 리포트로 나간다.

### 왜 잡히지 않았나

1. 어댑터 예외를 `directionScore` 가 `catch { c = null }` 로 흡수하므로 그 체계는 **조용히** 팩에서 빠진다. 라우트는 "팩이 통째로 비었는가"만 봤다(`normalizeEvidencePack`).
2. `factLinesForSystem`(계약 268~281행)은 버킷이 없으면 예외가 아니라 **빈 배열**을 돌려주고, `buildCompassSectionPrompt` 는 그 빈 배열을 그대로 써서 확정값 블록만 생략한 프롬프트를 만든다.
3. 품질 게이트의 확정값 검사(423~426행)는 `allowedLabels` 중 **하나라도** 인용했으면 통과인데, 방향·항로 라벨은 체계와 무관하게 늘 목록에 있다. 금칙어 정규식(`UNGROUNDED`/`UNCOMPUTED`/`RISKY`/`STOCK_PHRASE`/`FAKE_SCORE`)도 베다·점성술·신살 어휘만 덮고 명궁·자미성·천부·무곡·화록은 덮지 않는다.

### 수정

계약에 `missingSectionSystems`(125행~)를 새로 두고, 라우트 전달 진입부(346~352행)에서 **생성 전에** fail-closed 로 끊는다. 🔴 대조 기준은 요청이 신고한 `field.sources` 가 아니라 `COMPASS_SECTIONS` 의 **고정 목록**이다 — 어댑터가 던지면 `collectDeepEvidence` 가 그 체계를 sources 에서도 빼기 때문에, 신고값과 대조하면 가드가 스스로 비활성화된다(25~27행에서 세 번 나온 실패 형태).

과차단이 아님을 두 방향으로 확인했다. (a) 생년월일이 필수 입력이고(제출 버튼 비활성) `dateSeed` 가 항상 생성되므로 유료 흐름에서 네 어댑터는 언제나 가용하다. (b) 다섯 체계 정상 팩은 수정 후에도 **200 · 10/10 · 환불 0** 으로 완주한다(신규 테스트 ②).

## 재현한 결함 B — 차감은 끝났는데 되돌릴 자리가 저장 뒤에 열린다

### 증상

차감은 프론트 공용 코인 게이트가 POST **전에** 끝낸다. 그런데 `startRefundableExecution` 은 결과 문서 `$setOnInsert` 가 끝난 **뒤에** 호출됐다. 그 사이 `resultStorageUnavailable` 세 갈래(571·573·574행)가 있다. 실측(실제 라우트 POST):

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| 저장 실패 시 응답 | 503 `RESULT_STORAGE_UNAVAILABLE` | 503(동일) |
| 결제 증빙 확인 | 1회 | 1회 |
| `startServiceExecution` | **0회** | **1회**(`destiny-compass-deep-report:<idempotencyKey>`) |
| 그 자리 환불 | 0회 | 0회(의도) |

### 왜 회수되지 않나

고아 차감을 되돌릴 후보는 `sweepStaleServiceExecutions` 하나뿐인데, 이것은 `lockNextTimedOutExecution()` 으로 **이미 있는 실행 기록**을 잠가서 훑는다. 기록이 없으면 잠글 건도 없어 그냥 지나친다 — 자동 회수 경로가 **없다**. 28행에서 같은 논증을 한 창이고, 이 라우트에는 저장 창 하나가 남아 있었다.

### 수정

`reportId` 는 `seedHash`+`idempotencyKey` 해시만으로 확정되므로 저장보다 앞에서 만들 수 있다. 실행 기록을 그 직후(560행)로 올렸다. 저장 실패 창에서 **즉시 환불하지는 않는다** — 문서가 실제로 만들어졌는데 확인만 실패했을 수 있고, 그러면 환불과 문서가 함께 살아 결제 없이 읽히는 리포트가 된다. 위에서 연 기록을 만료 스윕이 되돌리게 둔다(28행과 같은 판단).

차감이 없던 통과(이용권·관리자)는 `access.matchedTransactionId` 가 비어 `startRefundableExecution` 이 `false` 로 빠지므로 없는 실행 건을 열지 않는다(243행) — 신규 테스트 4번째가 `startCalls 0` 으로 고정한다.

## 가드가 무는지 — 변이 3종

🔴 도는 가드와 무는 가드는 다르다. 전부 국소 편집으로 넣고 국소 편집으로 되돌렸다(`git checkout <파일>` 미사용).

| 변이 | 기대 | 실측 |
|---|---|---|
| M1 `missingSectionSystems` 가 항상 `[]` 를 돌려주게 무력화 | 신규 ①만 실패 | ① 실패(422 → 202), 나머지 3건 통과 |
| M2 `startRefundableExecution` 호출을 저장부 뒤로 되돌림(원래 코드) | 신규 ③만 실패 | ③ 실패(`startCalls` 1 → 0), 나머지 3건 통과 |
| V1 M1+M2 를 라우트에 넣고 검증기 기준 | §10 의 신규 단언만 실패 | ❌ 정확히 3건(`missingSectionSystems` 호출·422 차단·순서), 나머지 전량 ✅ |

겹쳐서 서로를 가리는 절은 없다(27행에서 배운 실패 형태). 원복 후 전부 녹색.

### 새 검사

- 회귀 [`__tests__/worker/destiny-compass-report.basis-and-charge-window.test.js`](../../__tests__/worker/destiny-compass-report.basis-and-charge-window.test.js) 4건. 🔴 이 스위트는 **계약 모듈을 대역하지 않는다** — 기존 스위트가 품질 게이트·프롬프트 조립을 통째로 대역하고 있어서, 케이스 ①이 **계산 근거 fail-closed 가 실제로 무는 것의 Jest 쪽 첫 증거**다. ②는 반대 방향(정상 팩 완주), ③은 저장 창의 기록 선행, ④는 차감 없는 통과의 비개시.
- 검증기 [`scripts/verify-destiny-compass-determinism.mjs`](../../scripts/verify-destiny-compass-determinism.mjs) §10(139~168행) 5개 단언. 기존 §1~§9 는 엔진 결정론만 봤고 **유료 전달 경로는 한 줄도 보지 않았다**.
- 기존 스위트의 픽스처(76행)를 다섯 체계로 넓혔다. 사주 버킷 하나짜리 픽스처는 새 가드에 정당하게 걸리므로, 가드를 약화하지 않고 픽스처를 고쳤다.

## 측정

전부 mock, 과금 LLM 실호출 0회, 실결제·운영 DB 쓰기·실환불 0회.

- 기준선(작업 시작 시점 실측): 기존 스위트 **24/24**, `node scripts/verify-destiny-compass-determinism.mjs` ✅
- 표적 2스위트 `destiny-compass-` — **28/28**
- `node scripts/verify-destiny-compass-determinism.mjs` — ✅ 전량 통과
- `npm run check:fast` — **exit 0**, jest **283스위트 3,986/3,986**(28행 종료 시점 282스위트 3,982건 + 이번 스위트 1개·4건), `verify:entry-encoding --strict-core` OK
- 변경 파일 4개 + 신규 테스트 1개, `git diff --stat` 66 insertions / 2 deletions

격리 워크트리 `destiny-compass-29-20260919-075231`(기저 `e3331376b`)에서 작업했다. 옆 세션이 공유 체크아웃에서 `index.html`·`js/**`·`public/**`·`marketing/**` 을 쓰고 있어 그쪽은 건드리지 않았다. `js/**` 미변경이라 `sync:public` 대상 아님.

## 남은 경계·후속

- 🟡 **품질 게이트가 계산 값을 대조하지 않는다.** `validateCompassSection` 의 확정값 검사(423~426행)는 "allowedLabels 중 하나라도 인용" 이고, 방향·항로 라벨이 늘 목록에 있어 사실상 무조건 통과다. 이번 수정은 "확정값이 통째로 없는 경우"만 닫았을 뿐, 확정값이 **있는데 본문이 다른 값을 지어내는** 경우는 여전히 통과한다. 28행처럼 섹션별 확정값과 본문을 대조하는 검사가 후속 과제다.
- 🟡 **`normalizeReportInput` 이 인증·증빙 확인보다 먼저 422 를 던진다**(156행 `idempotencyKey.length >= 12` 포함). 이미 차감을 끝낸 사용자가 잘못된 페이로드를 보내면 라우트가 그 차감을 귀속시킬 수 없다. 선불 구조 전체에 걸린 층이라 이번 최소 수정 범위 밖으로 두고 보고만 한다.
- 🟡 **`tarot_vara_reading` 은 베다 확정값을 프롬프트에 받지 않는다.** 섹션 가이드가 요일 지배성을 요구하는데 `spec.system` 이 `tarot` 하나라 vedic 사실이 실리지 않는다. 이번 가드는 tarot 버킷만 요구하므로 이 불일치는 그대로다.
- 🟡 `refundExecution` 은 실행 기록 유무와 무관하게 `failServiceExecution(forceRefundOnClose: true)` 를 부른다(273~287행). 기존 동작이고 이번 창과는 다른 층이라 보고만 한다.
- **D 실화면 증거 없음** — 23~28행과 같은 경계다. 이번 판정은 워커·검증기 실행 기준이고 브라우저 실화면 확인은 하지 않았다.
- F 전용 diff 증거 없음(같은 경계).
