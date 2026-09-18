# 운명 찻집 숙요점 궁합 상담 유료 전달 검증 — 2026-09-19

대상은 재검증표 27행(`fortune-tea-house-sukuyo-compatibility-consultation`, **200코인 / ₩20,000**, [`worker/lib/paid-feature-registry.js`](../../worker/lib/paid-feature-registry.js) 245행)이다. 정본은 [`worker/routes/fortune-tea-house.js`](../../worker/routes/fortune-tea-house.js), 화면은 [`src/features/fortune-tea-house/FortuneTeaHousePage.tsx`](../../src/features/fortune-tea-house/FortuneTeaHousePage.tsx)로 23~26행과 같은 라우트다. 깨어남 복구(D축)는 23행 수정을 코드 변경 없이 상속한다.

**27행은 사주 계열이 아니다.** `isSajuFamilyMode`(490행) 밖이라 25·26행이 세운 `assertSajuCalculationBasis` 가 **5433행에서 그대로 빠져나간다**. 체크포인트 그룹도 숙요 전용 3 + 공통 5 = 8개로 다르고, 품질 게이트도 별도 블록이다. 그래서 26행 인수인계의 지시대로 표의 기재를 믿지 않고 **닫힌 계산 근거로 상담문이 완주하는지를 직접 실행해 확인했다.**

**결론: 완주했다. 같은 계열의 fail-open 을 실측으로 닫았다.** 25·26행과 같은 자리에 2겹 fail-closed 를 세웠다. 커밋 `8deacfaad`.

## 실측 — 닫힌 27숙 계산으로 200코인 상담문이 완주한다

임시 프로브를 [`fortune-tea-house-honey-drops.test.js`](../../__tests__/worker/fortune-tea-house-honey-drops.test.js) 하네스 위에 올려 실제 `handleFortuneTeaHouseRoutes` 에 POST 했다(모킹은 인프라 경계 auth/db/billing/gemini 뿐). 프롬프트의 `preserveExactly.sukuyoCompatibility` 를 가로채 초안 상태를 읽고, LLM 응답에는 **계산과 무관한 본명숙·관계**를 실어 돌려줬다.

수정 전:

| 입력 | 초안 `available` | 응답 | 저장 상태 | LLM |
|---|---|---|---|---|
| 정상(양력/양력) | true | 200 | completed | 8회 |
| 본인 `1991-02-31` | **false** | **200** | **completed** | 8회 |
| 상대 생년월일 공백 | **false** | **200** | **completed** | 8회 |
| 본인 음력 `1960-02-30` | **false** | **200** | **completed** | 8회 |

닫힌 세 경우 모두 전달된 `sukuyoCompatibility.title`·`summary`·`strengths`·`cautions` 가 **전부 LLM 창작**이었다. 계산 근거가 없다는 표시는 `available:false` 하나뿐이고, 그 플래그는 결과 화면의 숙요 패널에만 쓰인다 — 상담문 본문(`yeoniReading`·`synthesis`·`actionPrescription`)은 정상과 똑같은 분량으로 나간다.

수정 후 같은 프로브: 닫힌 세 경우 모두 **422 · `generation_failed` · LLM 0회**, 정상은 그대로 200.

## 왜 뚫렸나 — 게이트가 스스로 꺼진다

숙요의 값 대조 게이트는 3360~3409행 한 블록이다. 그중 **항상** 도는 것은 `assertText` 4개(제목·요약·두 사람 이름)뿐이고, 나머지 전부가 `if (fallback.sukuyoCompatibility?.available) {`(3365행) 안에 있다.

닫히면 함께 꺼지는 것:

- 본명숙·관계·점수·방향 동일성 검사(3366~3380행)
- **8,000자 하한** `SUKUYO_MIN_RESULT_CHARS`(60행, 검사는 3397행)
- **앵커 포함 검사**(3400~3408행) — 계산된 본명숙 이름과 관계가 본문에 실제로 나오는지 보는 유일한 장치

그리고 닫힌 초안에서 켜지는 것: `mergeFortuneTeaSukuyoCompatibility` 의 `if (!fallbackCompatibility.available) return merged;`(2692행). 열린 초안이면 본명숙·관계·점수·계산근거를 서버 값으로 되돌리지만, **닫히면 LLM 이 쓴 필드가 그대로 병합돼 나간다.**

남아 있는 방어는 그룹별 `minChars`(4165~4178행)와 최종 20,000자 하한뿐이다 — 둘 다 **길이만** 본다. 그래서 실패 모양이 "짧은 글로 완주" 가 아니라 **"제 길이로 완주하되 본명숙을 창작"** 이다.

## 도달 경로 — 조용히 닫히는 실재 생일

`prepareFortuneTeaSukuyoAstronomy`(723~744행)는 `parseFortuneTeaSukuyoBirthDate` 가 `null` 이면 **`continue` 로 조용히 건너뛴다**(727행). 그러면 `astronomySukuyo` 가 붙지 않고, `calculateFortuneTeaSukuyoPerson` 이 `SUKUYO_ASTRONOMY_CONTEXT_REQUIRED` 를 던지며, 그 예외는 `buildFortuneTeaSukuyoCompatibility` 의 `} catch { return buildUnavailable… }`(1023행)가 삼킨다. 예외도 로그도 남지 않는다.

문제는 그 파서가 **달력 기준과 무관하게 그레고리력 왕복**만 본다는 점이다(686~687행). 음력 입력도 `Date.UTC` 로 검사하므로 **실재하는 음력 2월 29·30일이 걸린다.**

레포의 한국 음양력 코어(`lib/korean-calendar`)로 1940~2010년 실재 음력 날짜를 전수 열거해 같은 규칙을 적용했다:

```
{ range: '1940-2010', totalLunarDates: 25169, rejectedByGregorianCheck: 92, ratio: '0.37%' }
samples: 1940-02-30, 1941-02-29, 1941-02-30, 1942-02-29, 1943-02-29, …
```

**실재 음력 생일 25,169일 중 92일(0.37%)** 이 서버에서 읽히지 않는다. 화면 검증([`QuestionInputScene.tsx:759`](../../src/features/fortune-tea-house/components/QuestionInputScene.tsx#L759))은 두 사람의 `birthDate`·`gender`·`relationshipType` 이 **비어 있지 않은지만** 보므로 그대로 결제까지 간다. 25행의 음력 변환 실패(15.2%)보다 좁지만 성격은 같다 — 사용자는 정당한 생일을 넣었고 어디에서도 경고를 받지 못한다.

## 축별 판정

| 축 | 판정 | 실측 근거 |
|---|---|---|
| A 구매 | 기존 코드 정상 | featureKey 는 서버가 요청에서 도출한다 — `expectedFortuneTeaHouseFeatureKey` 1072행이 `consultationMode === "sukuyo"` 에서 71행 표의 키를 돌려주고, 클라가 보낸 키는 정본과 같을 때만 인정된다(1085~1087행). 200코인=₩20,000 이 레지스트리 245행 ↔ [`consultPricing.ts`](../../src/features/fortune-tea-house/data/consultPricing.ts) 31~35행 ↔ [`PAYMENT_POLICY.md`](../../PAYMENT_POLICY.md) 42행에서 일치하고, 허용 키 배열 485행에 등재돼 있다. 같은 20,000원인 26행과 **별도 키**라는 정책 문구도 PAYMENT_POLICY 52행에 명시돼 있다 |
| B 생성 | 🔴 **fail-open 닫음** | 위 "왜 뚫렸나" 절. `assertSajuCalculationBasis` 는 5433행에서 숙요를 그냥 통과시킨다 |
| C 장애 | 구조적으로 무결함(모드 무분기) | 23~26행과 같은 **후불 과금**이다. `apply` 는 생성·저장이 모두 성공한 뒤 1회만 돌고, 실패 경로는 `markFortuneTeaHouseGenerationFailed` → `cancel` 로 예약을 되돌린다. 모드 분기가 없으므로 가드를 `runGeneration` try 의 첫 문장 자리(5514행, 26행 가드 바로 다음 줄)에 둔 것이 중요하다 — 여기서 던지면 기존 실패 경로를 그대로 타고 차감이 확정되지 않는다. 실측에서 422 응답의 `applyCalls` 는 0이고 저장 상태는 `generation_failed` 였다 |
| D 전달 | 23행 수정 상속(코드 변경 없음) | `/pending` 이 `requestPayload` 를 통째로 돌려주고, 화면 복원 `buildFortuneTeaQuestionInputFromRequestPayload` 311행이 `sukuyo: payload.sukuyo` 로 궁합 입력을 되살린다. 깨어난 탭이 단독 모드로 강등되지 않는다 |
| E 저장·권한 | 기존 코드 정상 | 교차상품 fixture [`paid-completed-result-access-fixtures.mjs`](../../__tests__/fixtures/paid-completed-result-access-fixtures.mjs) 19행에 이 키가 등록돼 있고 해당 스위트가 통과한다 |
| F 예산 | 기존 코드 정상 | `buildTeaCheckpointGroups`(4156행)의 숙요 분기(4164~4168행)가 `sukuyo-summary`(3,000자) / `sukuyo-strengths`(2,000) / `sukuyo-cautions`(2,000) 를 만들고 공통 5그룹(`emotion` 1,500 · `reading-main` 3,500 · `reading-advice` 3,500 · `synthesis` 3,500 · `action` 2,500)이 붙어 **8그룹**이다. POST 당 4그룹(4204행)이므로 **2회 POST / LLM 8회**로 완주한다 — 프로브의 `llmCalls: 8` 과 일치하고, 그 2회는 재과금이 아니다(`apply` 1회) |
| 🟡 "품질 게이트 전량 모킹" 함정 | **해당 없음** | 신규 회귀가 실제 `handleFortuneTeaHouseRoutes` 에 POST 한다 |

## 수정

fail-closed 2겹(원칙 10), 25·26행과 같은 자리.

1. **서버 가드** — `assertSukuyoCalculationBasis`(5437행, 호출 5514행). 숙요 모드에서 초안의 `sukuyoCompatibility.available` 이 true 일 때만 통과하고, 아니면 `422` / `FORTUNE_TEA_HOUSE_SUKUYO_BASIS_MISSING` 을 던진다. **가드가 게이트와 같은 값을 보는 것이 핵심이다** — 게이트가 실제로 도는 초안만 생성으로 넘어간다.
2. **위조 차단** — `mergeFortuneTeaSukuyoCompatibility` 에서 `available` 을 서버 계산 값으로 고정했다(2690행). 이 줄이 없으면 초안에 `available:true` 만 얹은 요청이 가드를 통과하고, 게이트는 위조된 값끼리 대조해 통과시킨다.
3. **화면** — `localPreviewResult` 대입 **앞**(1119~1124행)에서 두 사람의 생년월일이 서버가 읽을 수 있는 형태인지 확인하고, 아니면 던져 결제창을 열지 않는다. 대입 뒤였다면 catch 의 로컬 프리뷰 분기가 오류를 삼켜 가짜 성공이 된다(25행에서 확인한 자리 그대로).

🔴 **화면에서 `sukuyoCompatibility.available` 을 볼 수 없는 이유**: 클라 어댑터 [`sukuyoCompatibilityAdapter.ts`](../../src/features/fortune-tea-house/lib/sukuyoCompatibilityAdapter.ts) 는 달 황경(`options.userMoonLongitude`)을 받아야 본명숙을 세우는데(123~132행), [`buildConsultResult.ts:746`](../../src/features/fortune-tea-house/lib/buildConsultResult.ts#L746) 은 그 옵션을 넘기지 않는다. 즉 **화면의 로컬 초안은 정상 입력에서도 항상 `available:false`** 다(숙요는 서버 천문 계산 전용 — 사주·타로와 다른 점). 26행처럼 초안 플래그를 조건으로 쓰면 모든 숙요 상담이 막힌다. 그래서 화면 쪽은 서버 파서와 같은 규칙(`isServerReadableSukuyoBirthDate`, 542행)만 복제했다.

## 가드 변이 검증 — 도는 가드인가, 무는 가드인가

| 변이 | 기대 | 결과 |
|---|---|---|
| 가드 조건을 `if (true) return;` 으로 고정 | 신규 2건 실패 | **물림** — 2 failed / 93 passed |
| merge 의 `available` 고정 줄 삭제 | 위조 초안 1건 실패 | **물림** — "ignores an available flag forged on the client draft" 1건만 실패 |
| 가드 호출(5514행) 삭제 | 신규 2건 실패 | **물림** — 2 failed / 93 passed |

세 절이 모두 독립적으로 문다. 처음에는 가드에 `astronomySukuyo` 존재 검사를 함께 두었는데, 변이를 넣어 보니 merge 고정과 서로를 가려 **어느 쪽 변이도 잡히지 않았다**(겹치는 조건은 "선언만 된 가드"가 된다). 겹치는 절을 걷어내고 위 3절 구성으로 정리했다.

🔴 변이 원복에 `git checkout <파일>` 을 쓰지 않았다 — 같은 파일의 실제 수정까지 날아간다(25행 사고). 넣을 때와 같은 국소 편집으로 되돌리고 원복 후 95/95 를 재확인했다.

## 신규 회귀

[`__tests__/worker/fortune-tea-house-honey-drops.test.js`](../../__tests__/worker/fortune-tea-house-honey-drops.test.js) 에 기존 숙요 완주 테스트 옆으로 2건을 추가했다(이웃 크기에 맞춰 동작당 1건).

- **계산이 닫히면 생성 전에 멈춘다** — 양력 왕복 실패(`1991-02-31`)와 상대 생년월일 공백 → 둘 다 422, `callGeminiText` 호출 0회
- **초안에 위조된 `available` 을 무시한다** — 닫힌 입력 + `draftResult.sukuyoCompatibility.available:true` → 422, LLM 0회

정상 요청이 막히지 않는다는 반대 방향 증명은 기존 `sukuyo completes saved groups while preserving calculated relationship facts` 가 그대로 맡는다(수정 후에도 200 · LLM 8회).

## 측정

- `npm run test:jest -- __tests__/worker/fortune-tea-house-honey-drops.test.js` → **95/95**
- `npm run test:jest -- __tests__/worker/fortune-tea-house` → **6스위트 125/125**
- 찻집 화면 `node --test` 4파일 → **31/31**
- `npm run sitemap:generate` → 1,282 URL, 원장 갱신 1건(`/fortune-tea-house/` 서명) — `.tsx` 수정과 같은 커밋에 포함
- `npm run check:fast` → **exit 0**, `test:jest` 281스위트 **3,977/3,977** 포함 전 단계 통과
- 음력 도달 가능성: `lib/korean-calendar` 로 1940~2010 실재 음력 날짜 25,169일 전수 열거 → 92일(0.37%) 거부
- 🔴 `npx jest` 금지 — `npm run test:jest --`(`scripts/run-mock-tests.mjs`)로만 돌린다

## 범위 밖 관측 (보고만, 수정하지 않음)

1. **🔴 실재하는 음력 2월 29·30일 생일은 숙요 상담을 아예 받을 수 없다(0.37%).** 이번 수정으로 "돈 받고 창작" 은 사라졌지만 그 사용자는 이제 422 를 본다. 옳은 방향이되 완결은 아니다. 근본 원인은 `parseFortuneTeaSukuyoBirthDate`(679행)가 달력 기준과 무관하게 그레고리력 왕복으로 날짜를 거른다는 것이고, 음력 실재 여부는 이미 `lunarForFortuneTeaSukuyoPerson`(696행)과 `resolveSolarMoment`([`sukuyo-astronomy.js`](../../worker/lib/sukuyo-astronomy.js) 129~143행)가 `lunarToSolar` 로 판정한다. 파서를 범위 검사로 완화하면 그 92일이 열리지만, `resolveSolarMoment` 의 `RangeError` 가 `handleConsult` 바깥 catch 로 새어 500 이 되는 경로를 함께 다뤄야 해서 별도 변경으로 분리했다.
2. **닫힌 숙요 초안의 병합 정책이 여전히 느슨하다.** 2692행은 `available:false` 일 때 LLM 이 쓴 `relationType`·`scores` 를 막지 않는다(이번에는 그 앞에서 요청을 세우므로 도달하지 않는다). 체크포인트 그룹 경로가 `sukuyoCompatibility.title/summary/strengths/cautions/adviceKeywords` 만 넘기고 있어 실제로는 그 필드들이 걸러지지만, 이는 그룹 정의에 기댄 우연한 방어다.
3. **8,000자 하한과 앵커 검사가 `available` 에 매달려 있는 구조 자체**는 그대로다. 이번 가드가 앞에서 막아 도달하지 않게 됐을 뿐, 게이트를 `available` 밖으로 끌어내는 정리는 하지 않았다.

## 남은 위험

- **D 실화면 증거 없음(경계).** 숙요 2회 POST(202 → 200)를 실제 브라우저에서 눈으로 확인하지 않았다. 워커·화면 테스트 대조까지다.
- **F 전용 전후 diff 스크립트 없음(경계).** 그룹 수·POST 분할은 소스(4164·4204행)와 프로브의 `llmCalls: 8` 로 확정했고 숙요 전용 계측은 돌리지 않았다.
- 천문 계산 자체(Swiss ephemeris WASM 달 황경 → 27숙)의 정확성은 이번 축이 아니다. 이번 가드는 "계산이 열렸는가" 만 본다.
