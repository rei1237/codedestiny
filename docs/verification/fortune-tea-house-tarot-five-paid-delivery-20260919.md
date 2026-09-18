# 운명 찻집 타로 프리미엄 상담(5카드) 유료 전달 검증 — 2026-09-19

대상은 재검증표 24행(`fortune-tea-house-tarot-five-consultation`, 100코인 / ₩10,000, [`worker/lib/paid-feature-registry.js`](../../worker/lib/paid-feature-registry.js) 242행)이다.

**23행과 같은 라우트·같은 화면이다.** 정본은 [`worker/routes/fortune-tea-house.js`](../../worker/routes/fortune-tea-house.js), 화면은 [`src/features/fortune-tea-house/FortuneTeaHousePage.tsx`](../../src/features/fortune-tea-house/FortuneTeaHousePage.tsx)이며, 23행에서 고친 깨어남 복구는 스프레드로 분기하지 않으므로 이 상품이 **코드 변경 없이 그대로 상속**한다. 그래서 A~F 를 처음부터 다시 훑지 않고 22행 인수인계 지시대로 **3카드와 갈리는 지점(스프레드 → featureKey → 금액 → 카드 수 → 품질 하한 → 체크포인트 분할)과 E축 fixture** 만 독립 실측했다. 20행(자미두수)이 19행 수정을 상속하며 세운 것과 같은 처리다.

**결론: 이 상품 고유의 신규 결함 없음, 코드 변경 없음, 신규 테스트 없음.** 관측 4건은 전부 범위 밖 보고로 아래에 남긴다.

## 축별 판정

| 축 | 판정 | 실측 근거 |
|---|---|---|
| A 구매 | 기존 코드 정상 | 스프레드는 클라이언트가 고르지만 featureKey 는 **서버가 요청 모양에서 도출**한다 — `expectedFortuneTeaHouseFeatureKey`(1071~1078행)가 `normalizeTarotSpread(consultRequest.tarotSpread) === "five"` 일 때만 `tarotFive` 를 돌려주고, `resolveFortuneTeaHouseFeatureKey`(1080~1089행)는 본문·`payment`·`_paymentContext` 어디서 온 명시 키든 도출값과 다르면 **빈 문자열로 떨어뜨려 fail-closed 거부**한다. 가격표 정본은 [`consultPricing.ts`](../../src/features/fortune-tea-house/data/consultPricing.ts) 17행(`tarotFive`) ↔ 레지스트리 242행(100코인·₩10,000)로 일치, 허용 키 배열 482행에 등재 |
| B 생성 | 기존 코드 정상 | 카드 수가 실제로 다르게 흐른다: [`tarotAdapter.ts`](../../src/features/fortune-tea-house/lib/tarotAdapter.ts) 17~23행 5자리표(현재·상대/상황·장애·가능성·조언) → `pickSpreadCards`(126~139행)가 **중복 없는 5장**을 뽑고, 워커 품질 게이트(3271~3294행)가 카드별 필수 항목을 **실제 카드 수만큼** 검사한다. 체크포인트 분할도 카드당 그룹이라 5카드는 1,500자/장(4168~4169행), POST 당 최대 4그룹(4201행)이므로 5카드는 **2회 POST 로 완주**한다(3카드는 1회). 20,000자 본문 하한(4236행)은 스프레드 무관 공통 |
| C 장애 | 구조적으로 무결함 | 23행과 동일한 **후불 과금**이다. 사용 확정 `apply`(5534행)는 생성·저장이 모두 성공한 뒤에만 돌고, 키·가격을 서버 도출 `access.featureKey`/`access.pricing` 으로 넘긴다 — 즉 100코인 상품은 100코인으로만 확정된다. 예약 해제 `cancel`(5477~5482행)도 같은 `access.featureKey` 를 쓴다. 전량 실패 시 `apply` 자체가 없으므로 21·22행의 이용권 환불 누락이 성립하지 않는다 |
| D 전달 | 23행 수정 상속(코드 변경 없음) | `probeFortuneTeaPending`·깨어남 effect(597·649·655~677행)는 스프레드 분기가 없다. 복구 시 스프레드가 살아남는 것도 실측했다 — `/pending` 이 `requestPayload: state.requestBody`(4749~4767행)를 돌려주고 `buildFortuneTeaQuestionInputFromRequestPayload`(295~315행)가 `tarotSpread: payload.tarotSpread` 를 복원하므로, 깨어난 탭의 다음 제출은 다시 5카드 = 100코인 경로로 간다(3카드로 강등되지 않는다) |
| E 저장·권한 | 기존 코드 정상 | `saveFortuneTeaHouseResult`(4648~4677행)가 `featureKey: cleanText(result.featureKey, 160)` 를 최상위에 박고, 열람 취소 판정(4794행)이 그 값으로 `isStoredPaidResultRevoked` 를 탄다. 교차상품 fixture [`paid-completed-result-access-fixtures.mjs`](../../__tests__/fixtures/paid-completed-result-access-fixtures.mjs) 19행에 이 키가 등록돼 있고 해당 스위트가 통과한다 |
| F 예산 | 기존 코드 정상 | 23행과 동일 경로 — `/pending`·`/results/:id` GET 에 LLM 호출이 없고, 같은 `attemptId` 재POST 는 `cached: true`(5432~5445행)로 돌아온다. 5카드가 2회 POST 를 쓰는 것은 **재과금이 아니다**: 1차는 202 부분 응답이고 `apply` 는 마지막 성공 저장 뒤 1회뿐이다 |
| 🟡 "품질 게이트 전량 모킹" 함정(8·14행 패턴) | **해당 없음** | 23행과 같은 스위트가 실제 `handleFortuneTeaHouseRoutes` 에 POST 하고 모킹은 인프라 경계뿐임을 재확인 |

## 가드 변이 검증 — 프리미엄 분리가 실제로 무는가

"기존 회귀가 있다"는 표의 기재를 그대로 믿지 않고, 5카드 분리 가드를 직접 변이시켜 지목 테스트만 깨지는지 실측했다.

| 변이 | 기대 | 결과 |
|---|---|---|
| `expectedFortuneTeaHouseFeatureKey` 의 스프레드 분기를 제거해 **항상 3카드 키**를 반환 | 5카드 단언만 깨짐 | **물림** — 10건 중 정확히 2건 실패: "5카드 요청은 5카드 featureKey로 처리된다"(303행), "5카드 요청에 3카드 featureKey를 보내면 거부한다(금액 조작 차단)"(309행). 3번째 가격 테스트(315행, 3카드 요청 + 5카드 키 거부)는 변이 후에도 통과하는 것이 정상이다(도출값이 3카드로 바뀌어도 명시 5카드 키는 여전히 불일치라 거부) |

변이 원복 후 `git status --porcelain` 빈 출력·10/10 재통과를 확인했다. 즉 24행의 핵심 계약(5카드 = 100코인, 3카드 키로의 강등 불가)은 **살아 있는 가드**로 지켜지고 있다.

## 측정

작업 트리 무변경 상태에서 잰 값이다(이 문서·재검증표·인수인계 외 소스 수정 0).

- 워커 Jest 7스위트 **212/212 통과** — `fortune-tea-house-{delivery-billing,evidence-cast,honey-drops,saju-timing,staging-fallback.static,tarot-cardwise}` + 교차상품 `paid-completed-result-access`
- 화면 `node --test` 8파일 **50/50 통과** — `fortune-tea-{attempt-reuse,generation-concurrency}` · `fortune-tea-house-{i18n,mood,paid-resume,recovery.behavior}` · `tea-house-{pdf-export,result-localization}`
- 🔴 **워크트리에서는 `npx jest` 를 직접 쓰면 안 된다.** 루트 `node_modules` 링크만으로는 ESM 변환 설정을 못 잡아 7스위트 중 5개가 `SyntaxError: Cannot use import statement outside a module` 로 헛실패한다(93 failed). `npm run test:jest --`(= `scripts/run-mock-tests.mjs`)로 돌려야 212/212 가 나온다

## 범위 밖 관측 4건 (보고만, 수정하지 않음)

1. **품질 게이트가 "5장"을 세지 않는다.** 3208·3230~3239행은 `if (!spreadCards.length) throw` 로 **비어 있지 않음**만 본다. 다만 전달되는 카드는 클라이언트 초안에서 오고(2742~2774행 병합, 카드 수 검증 없음) 100코인을 낸 사용자가 카드를 줄이는 것은 **자기 손해**일 뿐 과금 우회가 아니다 — featureKey 는 `tarotSpread` 로 결정되지 카드 배열 길이로 결정되지 않기 때문이다. 결제 축 위험은 아니나 "5카드를 샀는데 4장 리포트"가 이론상 가능하다.
2. **5카드 글자수 보너스가 사문(死文)이다.** `TAROT_FIVE_CARD_EXTRA_CHARS = 1200`(57행)이 `getTarotMinResultChars`(1721~1725행)에서 6,000 + 1,200 = 7,200 을 만들지만, 실제 확정 게이트는 4236행의 **공통 20,000자 하한**이라 7,200 은 한 번도 지배하지 못한다. 죽은 분기이므로 범위 밖 정리 대상(원칙 14).
3. **위치 ID 드리프트 `block` ↔ `obstacle`.** 5카드 3번 자리를 화면([`tarotAdapter.ts`](../../src/features/fortune-tea-house/lib/tarotAdapter.ts) 20행)은 `block`, 워커(493~518행)는 `obstacle` 로 부른다. 워커 표는 초안이 없는 퇴화 경로에서만 쓰이므로 현재 사용자 영향은 없지만, 그 폴백이 활성화되면 두 표의 `positionId` 가 갈린다.
4. **저장 문서에 최상위 `tarotSpread` 가 없다.** 그래서 4794행 폴백 `resolveFortuneTeaHouseFeatureKey(doc, doc)` 은 프리미엄 문서에도 **구조적으로 3카드 키만** 돌려줄 수 있다. 도달 가능성을 실측했다 — 결과 컬렉션 writer 전수 조회(`results.updateOne|insertOne|findOneAndUpdate`, 워커 전체 12곳, 전부 `fortune-tea-house.js`) 결과 본문을 쓰는 경로는 `saveFortuneTeaHouseResult` 하나뿐이고 그 경로는 **항상** `featureKey` 를 쓴다. 따라서 현재 코드가 만든 문서에서는 폴백이 도달 불가이고, 위험은 필드 도입 이전의 과거 데이터에 한정된다(운영 DB 조회는 계약상 금지라 미측정).

## 남은 위험

- **D 실화면 증거 없음(경계).** 5카드 2회 POST(202 → 200) 를 실제 브라우저에서 눈으로 확인하지 않았다. 워커·화면 테스트 대조까지만이다.
- 위 관측 1·2는 신규 과제로 남는다. 3·4는 현재 사용자 영향 0으로 판정했다.
