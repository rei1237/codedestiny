# 운명의 섬 12궁 심층 상담 유료 전달 검증 — 2026-09-19

대상은 재검증표 30행(`ziwei-island-palace-consult`, 200코인 / ₩20,000, [`worker/lib/paid-feature-registry.js`](../../worker/lib/paid-feature-registry.js) 338행)이다. 정본은 [`worker/routes/ziwei-island-ai.js`](../../worker/routes/ziwei-island-ai.js). 29행 운명의 지도와 마찬가지로 차감이 프론트 공용 코인 게이트에서 POST **이전에** 끝나는 선불이고, 엣지 컷 때문에 한 요청이 **4부분짜리 유계 파도 한 번**만 돌린다(725행 `slice(0, 4)`). 결과 id 는 `zwisl_<sha256(userId:idempotencyKey)>` 로 결정적이라(654행) 클라이언트가 같은 키로 재진입해 이어 그린다.

**결론 — 25~29행에서 다섯 번 나온 "계산 근거 fail-open" 이 이 라우트에서 여섯 번째 형태로 재현됐다.** 품질 게이트의 **유일한** 근거 대조가 `if (evidence.mainStars.length && ...)` 였다. 대상 궁에 주성이 없으면(무주성) 그 검사가 스스로 꺼져, 명반에 존재하지 않는 별만 쓴 본문이 200코인을 확정하며 완주했다. 실명반 480장 × 12궁 = 5,760건 중 **914건(15.9%)** 이 무주성이므로 유료 상담 6건 중 1건꼴로 근거 대조가 아예 없었다. 실제 라우트를 돌려 **200 `completed` · 제공자 8회 · 환불 0** 으로 재현하고 닫았다. 코드 커밋 `30e2ec0f4`, `npm run check:fast` exit 0(284스위트 3,991건).

## 축별 판정

| 축 | 판정 | 실측 근거 |
|---|---|---|
| A 구매 | 기존 코드 정상 | 라우트 `FEATURE_KEY`(31행)·`COIN_PRICE = 200`(35행)·`AMOUNT_KRW = 20000`(36행)이 레지스트리 338행(200코인·₩20,000)과 일치. 차감은 라우트가 아니라 프론트 공용 코인 게이트가 POST 전에 끝내고, 라우트는 `resolveStartAccess` 로 그 증빙(코인 `PointHistory` / 월정석 / 단건 결제)을 확인한다(677행) |
| B 생성 | 🔴 **결함 1건 재현·수정** | 아래 "재현한 결함". 수정 후 인용할 계산 근거가 없으면 **제공자 호출 0회**로 422 `CALCULATION_INCOMPLETE` + 선차감 복구(692~696행) |
| C 장애 | 기존 코드 정상 | 부분별 `attempts` 3회 상한으로 유계 실패를 끊고(725행), 한 부분이라도 3회를 소진하면 `generation_failed` + `restorePrepaidAccessOnFailure` 환불(757·758행). 동시 요청은 120초 만료 `generationLease` 로 직렬화(711·712행) |
| D 전달 | 🟡 **부분 정상(가드 보강 후)** | 완주 판정은 부분당 공백 제외 2,500자 하한(8부분 = 20,000자)과 구절 반복 검사로 분량·중복을 잡는다. `value.evidence` 동치 검사는 **근거 대조가 아니다** — `palacePartPrompt`(38행)가 그 evidence JSON 을 통째로 프롬프트에 실어 주므로 되풀이만으로 맞출 수 있다. 실제 대조는 "본문이 계산된 별을 인용했는가" 한 줄뿐이었고 그 줄이 무주성에서 자가 비활성이었다. 이번 수정은 그 줄을 fail-closed 로 바꿨고, **인용한 그 별 밖의 위조**는 여전히 못 잡는다(29행과 같은 경계, 아래 보고만) |
| E 저장·권한 | 기존 코드 정상 | 기존 회귀 [`__tests__/worker/ziwei-island-paid-delivery.test.js`](../../__tests__/worker/ziwei-island-paid-delivery.test.js) 25건이 실측한다 — 저장 장애 503, 취소 증빙, 타 계정 404, 동시 요청, 재열람 결제·LLM 0회, `resumeSessionId` 소유자 검증(662행) |
| F 예산 | 기존 코드 정상 | 명궁 4섹션 × 2 = **8부분**(부분당 `minChars` 2,500 = 20,000자), 파도당 4부분이므로 **2회 POST · 제공자 8회**로 완주(신규 스위트 3번 테스트 실측: 200 `completed`, 환불 0). 궁마다 섹션 수가 달라 부분 수는 `palaceParts` 가 결정하고 하한 총합은 항상 20,000자로 고정된다 |
| 🟡 "기존 스위트가 무엇을 대역하는가" | **해당함 — 여기가 사각이었다** | 기존 스위트는 `calculateZiweiAiChart` 를 **`{ palaces: [{ name: "명궁", mainStars: ["자미"], majorLuck: { range: "23-32" } }] }` 단일 궁 스텁**으로 대역한다(12궁 상품인데 궁이 하나다). `sanFangSiZheng` 이 없고 주성이 항상 존재하므로 **무주성 궁을 단 한 번도 태우지 못했다** — 결함이 숨어 있던 자리가 정확히 그 대역된 자리다. 신규 스위트는 명반 계산기를 **대역하지 않는다** |

## 재현한 결함 — 무주성 궁에서 근거 대조가 통째로 꺼진다

### 증상

`1988-02-29` 시간미상 · 명궁(실제 계산기가 만든 **무주성** 궁)으로 실제 라우트에 POST 했다. 본문은 그 명반에 **없는** 자미·천부·무곡만 인용했다.

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| 응답 | **200 `completed`** | **503 `LLM_ERROR`**(3회 시도 소진) |
| 제공자 호출 | 8회(전량 통과) | 부분마다 3회 시도 후 중단 |
| 저장 문서 | `completed` | `generation_failed` |
| 환불 | **0회** | **1회** |

수정 전 실행의 테스트 출력은 `Expected: 202  Received: 200` 이었다 — 위조 본문이 파도 2회로 그대로 완주했다는 뜻이다.

### 왜 잡히지 않았나

[`worker/lib/island/consult/palace-delivery.js`](../../worker/lib/island/consult/palace-delivery.js) `validPalacePart` 의 근거 대조는 한 줄이었다.

```js
if (evidence.mainStars.length && !evidence.mainStars.some(star => value.body.includes(star))) return false;
```

`evidence.mainStars` 는 `palaceEvidence` 가 **대상 궁의 주성만** 담은 값이다(12~15행). 무주성 궁에서는 `[]` 이므로 조건 앞절이 거짓이 되어 검사 자체가 사라진다. 같은 함수의 나머지 검사는 근거가 아니라 **되풀이** 를 본다 — `palacePartPrompt` 38행이 `{"body":..., "evidence":<그 JSON 그대로>}` 로 정답을 실어 보내기 때문이다. 즉 무주성 궁에서는 분량·중복 검사만 남는다.

### 도달 가능성 실측

추정하지 않고 실제 계산기(`calculateZiweiAiChart`)로 480장을 만들어 12궁 전수를 셌다(연 10 × 월 4 × 일 3 × 시각 4, 시간미상 포함).

```json
{ "표본_궁수": 5760, "무주성": 914, "삼방사정_주성없음": 0, "앵커_전무": 0, "대운_없음": 0, "무주성_비율": "15.9%" }
```

- **무주성은 흔하다(15.9%)** — 예외 상황이 아니라 정상 명반의 일부다.
- **삼방사정 주성까지 빈 궁은 0건** — 그래서 무주성일 때의 대체 인용 기준으로 삼방사정 주성 총합을 쓰면 과차단이 생기지 않는다. 이 값은 이미 프롬프트에 실려 있다([`palace-prompts.js`](../../worker/lib/island/consult/palace-prompts.js) 100행 `"무주성(주성 없음 — 삼방사정으로 읽음)"`, 109행 `삼방사정 주성 총합`).
- **둘 다 빈 경우는 0건** — 계산기가 정상 동작하는 한 새 가드는 발화하지 않는다. 그럼에도 남겨 둔 이유는 아래 "가드를 어디에 두었나" 참조.

### 수정

1. `palaceAnchorStars`(palace-delivery.js 17~26행) — 대상 궁 주성이 있으면 그것, 없으면 삼방사정 주성 총합을 인용 기준으로 돌려준다.
2. `validPalacePart` 의 근거 대조를 fail-closed 로 바꿨다(45·50행) — `if (!anchors.length || !anchors.some(...)) return false;`. 빈 목록은 "검사 생략"이 아니라 **거절**이다(코딩 원칙 10).
3. 라우트에 생성 진입 전 가드(692~696행) — 앵커가 없으면 제공자를 부르기 전에 422 `CALCULATION_INCOMPLETE`(157행) + `restorePrepaidAccessOnFailure`(433행)로 선차감을 되돌린다.

🔴 대조 기준은 **요청이 신고한 값이 아니라 계산된(또는 저장된) 명반**이다 — 29행에서 확인한 실패 형태를 반복하지 않기 위한 선택이다.

### 가드를 어디에 두었나 — `/prepare` 에는 두지 않았다

처음에는 `handleEnsureAccess`(`/prepare`)에도 같은 가드를 넣었다가 **되돌렸다**. 실측상 실제 계산기는 5,760/5,760 전부 앵커를 내므로 `/prepare` 의 갓 계산된 명반에서는 그 가드가 **영원히 발화할 수 없다** = 검사할 수 없는 죽은 코드다. `handleStart` 쪽은 다르다 — 685행이 `doc.llmMeta.chart` / `doc.ziweiChart` 를 **저장된 그대로** 재사용하므로, 명반 스키마가 바뀐 배포를 건너 살아남은 문서가 실제 도달 경로다. 그래서 살아 있는 한 곳에만 뒀고, 그 경로를 신규 회귀 4번 테스트가 실제로 태운다.

## 변이 검사 — 두 가드가 실제로 무는지

`git checkout` 대신 유일성 검사를 하는 node 치환 스크립트로 국소 변이·원복했다.

| 변이 | 내용 | 결과 |
|---|---|---|
| M1 | 근거 대조를 옛 자가 비활성 형태로 원복 | **1 failed, 29 passed** — 실패한 것은 "무주성 궁: 명반에 없는 주성만 인용한 본문은 유료 완주하지 못하고 환불된다" 하나 |
| M2 | 라우트 사전 가드(692~696행) 삭제 | **1 failed, 29 passed** — 실패한 것은 "대조할 확정값이 없는 저장 명반은 제공자를 부르기 전에 422 로 닫고 선차감을 되돌린다" 하나 |

각 변이가 **정확히 하나씩** 물었고 서로를 가리는 절이 없다 — 두 가드 모두 살아 있으며 어느 쪽도 잉여가 아니다. 원복 후 30/30 통과.

## 검사

- 신규 [`__tests__/worker/ziwei-island-palace-basis.test.js`](../../__tests__/worker/ziwei-island-palace-basis.test.js) 5건 — 명반 계산기를 **대역하지 않는다**. ① 전제 단언(명궁이 실제로 무주성이고 대운·삼방사정 주성은 있다) ② 위조 본문 → 503 + `generation_failed` + 환불 1 ③ **과차단 아님**: 같은 무주성 궁에서 삼방사정 주성을 인용하면 200 `completed` · 환불 0 ④ 저장 명반에서 앵커를 지우면 제공자 호출 수가 **그대로**인 채 422 + 환불 1 ⑤ 유주성 궁(재백궁)은 자기 주성 인용으로 200 `completed`. 선차감은 코인 `PointHistory` 로 깔아 환불이 관측 가능하게 했다.
- 기존 [`ziwei-island-paid-delivery.test.js`](../../__tests__/worker/ziwei-island-paid-delivery.test.js) 25건 무수정 통과 → 2스위트 **30/30**.
- 🔴 [`__tests__/ui/island-report-quality.behavior.test.js`](../../__tests__/ui/island-report-quality.behavior.test.js) 12행은 **결함을 정답으로 고정하고 있었다** — `mainStars: []` 에 '가' 20,000자만 채운 본문이 `true` 라고 단언했다. 그 단언을 계산 근거를 인용하는 형태로 바꾸고, fail-closed 계약과 `palaceAnchorStars` 를 직접 재는 테스트를 덧붙였다(node `--test` 3/3).

## 남은 경계 — 보고만 (원칙 14)

1. 🟡 **인용한 앵커 밖의 위조는 여전히 통과한다.** 본문이 앵커 별 하나만 포함하면 나머지 문장에서 없는 별·연도·대운을 지어내도 게이트가 못 잡는다. 29행이 남긴 같은 후속 과제다.
2. 🟡 **차감은 됐는데 되돌릴 자리가 없는 조기 반환 4곳.** 663(요청 키 불일치 409)·665(키 12자 미만 422)·668(정규화 실패 422)·669(inputHash 불일치 409)행은 `resolveStartAccess`(677행) **이전에** 돌아간다. 선차감은 이미 끝난 뒤이므로 환불 호출 없이 코인만 남는다 — 29행 `normalizeReportInput` 관측과 같은 형태다.
3. 🟡 **자동 회수 경로가 없다.** 이 라우트는 `startServiceExecution` 계열 실행 기록을 만들지 않으므로 `sweepStaleServiceExecutions` 가 주울 대상이 0건이다. 회수는 클라이언트가 결정적 결과 id 로 재진입하는 길뿐이다(28·29행과 같은 논증).
4. 🟡 **부분 소진이 섞이면 문서가 영구 `partial` 로 202 를 돈다.** 환불 조건(756행)은 `!Object.keys(meta.parts).length` — 즉 **한 부분도 저장되지 않았을 때만** 환불한다. 일부 부분은 저장되고 다른 부분이 3회를 소진하면 761·762행으로 떨어져 `partial` + **202 `pending`** 이 되고, 이후 모든 재요청은 `wave` 가 비어 같은 202 를 되돌려준다. `applyUsageOnce` 는 끝내 실행되지 않고 환불도 없다. (이번 재현이 503 까지 간 것은 8부분 전부가 위조라 저장분이 0건이었기 때문이다.)

**D 실화면 증거 없음·F 전용 diff 증거 없음(경계)** — 이번 검증은 전부 mock 이며 과금 LLM 호출 0회다.
