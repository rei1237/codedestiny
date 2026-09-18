# 운명 찻집 사주 궁합 상담 유료 전달 검증 — 2026-09-19

대상은 재검증표 26행(`fortune-tea-house-saju-compatibility-consultation`, **200코인 / ₩20,000**, [`worker/lib/paid-feature-registry.js`](../../worker/lib/paid-feature-registry.js) 244행)이다. 정본은 [`worker/routes/fortune-tea-house.js`](../../worker/routes/fortune-tea-house.js), 화면은 [`src/features/fortune-tea-house/FortuneTeaHousePage.tsx`](../../src/features/fortune-tea-house/FortuneTeaHousePage.tsx)로 23~25행과 같은 라우트다. 깨어남 복구(D축)는 23행 수정을 코드 변경 없이 상속하고, 이번에는 **사주 단독과 갈리는 지점 = 두 사람의 명식**을 독립 실측했다.

**결론: 25행이 의도적으로 남긴 fail-open 을 실측으로 닫았다.** 25행 인수인계가 지정한 첫 일 그대로, 궁합 모드의 초안 계약을 추정이 아니라 실행으로 확인한 뒤 `assertSajuCalculationBasis` 를 그 모드까지 확장했다. 확장 과정에서 **궁합의 유일한 값 대조 게이트가 스스로 꺼지는 두 번째 fail-open** 을 추가로 발견해 함께 닫았다. 커밋 `3a0afc235`·`a9dfd1cfc`.

## 25행이 답을 미뤄 둔 질문 — 초안 모양 실측

25행 기록 57행은 "`sajuCompatibility` 의 초안 모양(최상위 `birthDate` 인지 `sajuCompatibility.user.birthDate` 인지)을 실측하지 않아 제외했다" 고 남겼다. **둘 다였다.**

화면 [`QuestionInputScene.tsx`](../../src/features/fortune-tea-house/components/QuestionInputScene.tsx) 의 `buildInput`(688~733행)이 궁합 폼의 '나' 값을 **최상위로 복사해서** 보낸다 — `const effectiveBirthDate = isCompat ? nextSajuCompatInput.user.birthDate || "" : birthDate;` 식으로 `birthTime`·`gender`·`calendarType` 까지 같이 간다. 그래서 [`buildConsultResult.ts`](../../src/features/fortune-tea-house/lib/buildConsultResult.ts) 는 궁합을 내부적으로 `consultationMode = "saju"` 로 접어(739~740행) 최상위 `saju` 를 채우고(896행), 별도로 `sajuCompatibility = buildFortuneTeaSajuCompatibility(request)`(747행)를 붙인다.

정리하면 초안의 명식 자리는 이렇다.

| 사람 | 초안 경로 |
|---|---|
| 본인 | `draft.saju` **그리고** `draft.sajuCompatibility.user.saju` (같은 계산의 두 사본) |
| 상대 | `draft.sajuCompatibility.partner.saju` 만 |

추정이 아니라 실제 빌더를 실행해 확인했다(esbuild 로 `buildConsultResult.ts` 를 CJS 로 묶어 직접 호출, `--loader:.wasm=empty` 필요).

| 입력 | `draft.saju.available` | `compat.available` | `compat.user.saju.available` | `compat.partner.saju.available` |
|---|---|---|---|---|
| 양력/양력 정상 | true | true | true | true |
| 상대 입력 자체가 없음 | true | false | true | **false** |
| `sajuCompatibility` 블록 자체가 없음 | true | false | true | **false** |
| 상대만 음력 `1960-02-30` | true | false | true | **false** |
| 본인만 음력 `1960-02-30` | **false** | false | **false** | true |

어느 경우에도 예외는 던지지 않는다 — 25행에서 실측한 `sajuAdapter` 3중 catch 가 그대로 흡수한다.

## 축별 판정

| 축 | 판정 | 실측 근거 |
|---|---|---|
| A 구매 | 기존 코드 정상 | featureKey 는 서버가 요청 모양에서 도출한다 — `expectedFortuneTeaHouseFeatureKey` 1073행이 `consultationMode === "sajuCompatibility"` 에서 70행 표의 `fortune-tea-house-saju-compatibility-consultation` 을 돌려주고, 불일치 명시 키는 24·25행과 같은 경로로 fail-closed 거부된다. 200코인=₩20,000 이 레지스트리 244행 ↔ [`consultPricing.ts`](../../src/features/fortune-tea-house/data/consultPricing.ts) 26~30행 ↔ [`PAYMENT_POLICY.md`](../../PAYMENT_POLICY.md) 41행 ↔ [`paid-feature-registry.integrity.test.js`](../../__tests__/worker/paid-feature-registry.integrity.test.js) 41행에서 모두 일치, 허용 키 배열 484행 등재 |
| B 생성 | 🔴 **fail-open 2건 닫음** | 아래 "닫은 fail-open" 절 |
| C 장애 | 구조적으로 무결함(모드 무분기) | 23~25행과 동일한 **후불 과금**이다. `apply`(5563행)는 생성·저장이 모두 성공한 뒤에만 1회 돌고, 실패 경로는 `markFortuneTeaHouseGenerationFailed`(5498행) → `cancel`(5510행)로 예약을 되돌린다. 이 경로에 모드 분기가 없다 — 그래서 가드를 `runGeneration` try 의 **첫 문장**(5491행)에 둔 것이 중요하다. 여기서 던지면 기존 실패 경로를 그대로 타고 차감이 확정되지 않는다 |
| D 전달 | 23행 수정 상속(코드 변경 없음) | `/pending`(4767행)이 `requestPayload: state.requestBody` 를 통째로 돌려주고 저장 시(4200행) 토큰류 키만 제거하므로 `sajuCompatibility` 입력과 `draftResult`(두 명식)가 그대로 살아남는다. 화면 복원 [`buildFortuneTeaQuestionInputFromRequestPayload`](../../src/features/fortune-tea-house/FortuneTeaHousePage.tsx#L295) 312행이 `sajuCompatibility` 를 복원하므로 깨어난 탭이 단독 사주로 강등되지 않는다(24행의 `tarotSpread` 와 같은 구조) |
| E 저장·권한 | 기존 코드 정상 | 교차상품 fixture [`paid-completed-result-access-fixtures.mjs`](../../__tests__/fixtures/paid-completed-result-access-fixtures.mjs) 19행에 이 키가 등록돼 있고 해당 스위트가 통과한다 |
| F 예산 | 기존 코드 정상, 사주와 동일 | `isSajuFamilyMode` 가 궁합을 포함하므로(490행) `buildTeaCheckpointGroups`(4156~4159행)가 **요약 1 + 필수 9섹션 + 공통 5 = 15그룹**을 만든다. 궁합 전용 섹션 제목 9개는 `teaCompatSajuRule.requiredSections`(1654행: 당신의 사주 / 상대방의 사주 / 두 사람의 궁합 / …)로 단독 사주와 문구만 다르고 **개수가 같다**. POST 당 4그룹(4201행)이라 25행과 같은 **4회 POST / LLM 16회**로 완주하고, 그 4회는 재과금이 아니다(`apply` 1회) |
| 🟡 "품질 게이트 전량 모킹" 함정 | **해당 없음** | 신규 스위트가 실제 `handleFortuneTeaHouseRoutes` 에 POST 하고 모킹은 인프라 경계(auth/db/billing/gemini)뿐이다 |

## 닫은 fail-open

### ① 상대 명식 없이 "두 사람의 결" 이 창작된다

`buildSajuPersonProfile`(1887~1890행)은 `personSaju.available !== true` 면 **`undefined` 를 돌려준다**. 그러면 `buildSajuFactInput`(1989행)의 `partnerProfile` 이 통째로 비고, `dataCheck.partnerDayMaster` 가 빈 문자열이 된다(2007행). 프롬프트에 상대 명식이 한 글자도 실리지 않은 채 "두 사람의 사주를 각각 독립적으로 읽은 뒤 대조하는 상담"(1651행) 지시만 남으므로, LLM 은 본인 명식 하나로 궁합을 창작한다. 그 상태로 200코인이 확정됐다.

도달 경로는 25행과 같다 — 음력 변환 실패(1960~2005년 작은달 30일 등 15.2%)가 조용히 `available:false` 로 떨어지고, 입력 검증([`QuestionInputScene.tsx:754`](../../src/features/fortune-tea-house/components/QuestionInputScene.tsx#L754))은 두 사람의 `birthDate` 가 **비어 있지 않은지만** 보기 때문에 그대로 통과한다. 상대 쪽은 화면 어디에도 명식 미리보기가 없어 사용자가 눈치챌 방법도 없다.

### ② 궁합의 유일한 값 대조 게이트가 스스로 꺼진다

찻집 품질 게이트 전체에서 명식 **값**을 본문과 대조하는 곳은 3434~3453행 한 군데뿐이다 — 상대 이름이 본문에 있는지, 상대 일간의 천간 글자가 본문에 있는지, 두 일간이 다른데 본인 천간이 빠지지 않았는지. 그런데 이 블록의 진입 조건이 `fallback.sajuCompatibility?.available` 이다. 궁합 블록이 닫히면 **검사 자체가 건너뛰어진다.** 나머지 게이트(`assertSajuDeepQuality` 3133행)는 25행에서 확인한 대로 "일간/오행/십성" 낱말 2개와 `/대운|세운/` 정규식, 그리고 궁합 전용 `requiredTerms: ["궁합","상대"]`(1662행) — 전부 낱말 대조라 명식 없이도 통과한다.

### 수정

fail-closed 2겹(원칙 10), 25행과 같은 자리.

1. **서버** — `assertSajuCalculationBasis`(5408~5422행, 호출은 5491행)를 `sajuCompatibility` 까지 확장했다. 궁합은 `draft.saju.available` 에 더해 `sajuCompatibility.available`·`user.saju.available`·`partner.saju.available` 이 **모두** true 일 때만 통과하고, 아니면 `422` / `FORTUNE_TEA_HOUSE_SAJU_BASIS_MISSING` 에 "두 사람의 생년월일로…" 메시지를 실어 던진다.
2. **화면** — `localPreviewResult` 대입 **앞**(1096~1104행)에서 같은 조건을 던져 결제창을 열지 않는다. 대입 뒤였다면 catch 의 로컬 프리뷰 분기가 오류를 삼켜 가짜 성공이 된다(25행에서 확인한 자리 그대로).

`available` 플래그까지 조인 것이 오차단이 아닌 근거: 클라 어댑터 [`sajuCompatibilityAdapter.ts`](../../src/features/fortune-tea-house/lib/sajuCompatibilityAdapter.ts) 는 두 명식이 모두 열렸을 때만 `available: true` 를 세우고(168~169·190행), 아니면 `buildUnavailable` 로 떨어진다. 즉 정상 화면이 만드는 초안은 **항상** 이 조건을 만족한다. 서버 폴백 `buildMinimalDraft`(2509행)에는 `sajuCompatibility` 키 자체가 없으므로(전수 grep 0건) 초안 없이 API 를 직접 때리는 경로도 `undefined` 로 fail-closed 다.

## 가드 변이 검증 — 도는 가드인가, 무는 가드인가

| 변이 | 기대 | 결과 |
|---|---|---|
| 모드 조건을 원래대로 `if (consultationMode !== "saju") return;` 로 되돌림 | 궁합 차단 3건만 실패 | **물림** — 정확히 3건 실패 / 7건 통과 |
| `const compatReady = true;` 로 고정 | 상대 닫힘 1건 실패 | **물림** — "상대 명식이 닫혔을 때" 1건만 실패 |
| `sajuCompatibility.available` 절만 `true` 로 고정 | 블록 닫힘 1건 실패 | **물림** — "궁합 블록만 닫혔을 때" 1건만 실패, 원복 후 11/11 |

오차단 위험도 사전 실측했다 — `git grep -c "sajuCompatibility" -- __tests__` 결과 이 모드를 실제로 태우는 워커 테스트가 **0건**이었다(무관한 `dangsaju-calc.test.js` 1건만 매칭). 따라서 조여도 깨질 기존 계약이 없다.

🔴 변이 원복에 `git checkout <파일>` 을 쓰지 않는다 — 같은 파일의 실제 수정까지 날아간다(25행에서 겪은 사고). 넣을 때와 같은 국소 편집으로 되돌리고, `git grep -n "MUTATION-"` 으로 잔재 0건을 확인했다.

## 신규 회귀

[`__tests__/worker/fortune-tea-house-saju-timing.test.js`](../../__tests__/worker/fortune-tea-house-saju-timing.test.js) 에 "운명 찻집 사주 궁합 — 두 사람 명식 계산 근거" 4건을 추가했다.

- 초안 없음 / 상대 명식 닫힘 / 본인 명식 닫힘 / 궁합 블록만 닫힘 → **422 · `ok:false` · 메시지에 "사주 명식" · `callGeminiText` 호출 0회**
- 두 명식이 모두 열린 초안 → 422 가 아니고 LLM 호출이 실제로 일어남(가드가 정상 요청을 막지 않는다는 반대 방향 증명)

`test.each` 라벨을 그대로 `attemptId` 에 쓰면 헤더로 나가 `ByteString` 오류가 나므로(한글 코드포인트 > 255) ASCII `attemptKey` 를 따로 둔다.

## 측정

- `npm run test:jest -- __tests__/worker/fortune-tea-house-saju-timing.test.js` → **11/11**
- `npm run test:jest -- --testPathPatterns fortune-tea-house` → **6스위트 123/123**
- 찻집 화면 `node --test` 8파일 → **50/50**
- `npm run sitemap:generate` → 1,282 URL, 원장 갱신 1건(`/fortune-tea-house/` 서명) — `.tsx` 수정과 동일 커밋(`3a0afc235`)에 포함
- `npm run check:fast -- --committed-head`(base `deae141f6` → head `3a0afc235`) → **exit 0**, tier `critical` 자동 승격, `test:jest` 281스위트 **3,974/3,974** 포함 전 단계 통과
- 🔴 `npx jest` 금지 — `npm run test:jest --`(`scripts/run-mock-tests.mjs`)로만 돌린다

## 범위 밖 관측 (보고만, 수정하지 않음)

1. **`buildUnavailable` 의 본인 정보 출처가 어긋난다.** [`sajuCompatibilityAdapter.ts`](../../src/features/fortune-tea-house/lib/sajuCompatibilityAdapter.ts) 131~145행은 실패 경로에서 본인 프로필을 `input?.user || {}` 로 만드는데, 화면은 본인 값을 최상위로 복사해 보내므로(위 실측) `compat.user.birthDate` 가 `undefined` 로 돌아온다. 정상 경로(`buildFortuneTeaSajuSnapshot(request)`)와 출처가 다르다. 이번 가드는 `saju.available` 만 보므로 영향이 없고, 실패 경로의 표시용 필드라 현재 도달 화면도 없다.
2. **품질 게이트의 값 대조가 여전히 이름·천간 한 글자 수준이다.** ②를 닫아 게이트가 항상 돌게는 됐지만, 대조 항목은 상대 이름 포함 여부와 일간 천간 1글자뿐이다. 오행·십성·대운이 실제 명식과 맞는지는 아무도 보지 않는다(25행 관측 2번의 연장).
3. **`fortune-tea-house.module.css` 디자인 훅 지적 5건**(사이드탭 accent, bounce easing, layout-transition 3건)은 이번 변경이 건드리지 않은 파일의 선행 사항이라 그대로 뒀다.

## 남은 위험

- **D 실화면 증거 없음(경계).** 궁합 4회 POST(202×3 → 200)를 실제 브라우저에서 눈으로 확인하지 않았다. 워커·화면 테스트 대조까지다.
- **F 전용 전후 diff 스크립트 없음(경계).** 그룹 수·POST 분할은 소스와 25행 실측의 동형성으로 확정했고 궁합 전용 계측은 돌리지 않았다.
- 27행(`fortune-tea-house-sukuyo-compatibility-consultation`)은 **사주 계열이 아니다** — `isSajuFamilyMode` 밖이라 이번 가드가 적용되지 않고 체크포인트 그룹도 3+5 구조다. 27행에서 숙요 본명숙 계산 근거에 같은 종류의 구멍이 있는지는 별도로 봐야 한다.
