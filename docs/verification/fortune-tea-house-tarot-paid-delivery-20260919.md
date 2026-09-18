# 운명 찻집 타로 상담(3카드) 유료 전달 검증 — 2026-09-19

대상은 재검증표 23행(`fortune-tea-house-tarot-consultation`, 50코인 / ₩5,000, [`worker/lib/paid-feature-registry.js`](../../worker/lib/paid-feature-registry.js) 241행)이다.

🔴 **여기서 라우트 계보가 바뀐다.** 5~22행이 공유하던 [`worker/routes/fortune.js`](../../worker/routes/fortune.js)·`runPaidNarrativeDelivery`·`deliverFeatureQuestion` 을 이 상품은 **한 줄도 쓰지 않는다**. 정본은 독자 구현 [`worker/routes/fortune-tea-house.js`](../../worker/routes/fortune-tea-house.js)(5,629행, 단일 export `handleFortuneTeaHouseRoutes` 5584행)이며 공유 결제 원시함수 중 import 하는 것은 `isStoredPaidResultRevoked`(23행) 하나뿐이다. 그래서 22행 인수인계 지시대로 A~F 를 상속 없이 처음부터 다시 훑었다. 화면은 App Router [`src/features/fortune-tea-house/FortuneTeaHousePage.tsx`](../../src/features/fortune-tea-house/FortuneTeaHousePage.tsx)(`app/fortune-tea-house/page.tsx` → `FortuneTeaHouseClient.tsx`)다.

24~27행(5카드·사주·사주궁합·꿈해몽)은 같은 라우트·같은 화면을 쓰므로 이번 수정 혜택을 그대로 받지만, 이번 범위는 **23행 하나**이고 나머지는 완료 처리하지 않았다.

## 축별 판정

| 축 | 판정 | 실측 근거 |
|---|---|---|
| A 구매 | 기존 코드 정상 | 접근 판정 `verifyFortuneTeaHouseConsultAccess`(1452행), 금액·상품 조작 차단 `expectedFortuneTeaHouseFeatureKey`(1071행)와 불일치 거부(4457~4463행). 3카드/5카드 feature key 분리를 `fortune-tea-house-tarot-cardwise.test.js` 303·309·315행이 단언 |
| B 생성 | 기존 코드 정상 | 20,000자 하한 + `assertConsultQuality` + `hasRepeatedReportPassage`(4233~4239행)가 **실제로 실행**되고, 스위트가 `mode === 'gemini'`·`degraded` falsy 를 단언 |
| C 장애 | 구조적으로 무결함 | **후불 과금**이다 — 사용 확정 `apply` 는 생성·저장이 모두 성공한 뒤(5534행)에만 호출된다. 전량 실패 시 `apply` 자체가 없으므로 21·22행에서 고친 "이용권(월정석) 환불 누락"이 원리적으로 성립하지 않는다. 예약 해제 `cancel`(5476행)은 `markFortuneTeaHouseGenerationFailed`(4525행)가 `{status:"generating", generationLock.token}` 일치를 확인한 뒤에만 돈다 |
| D 전달 | 🔴 **결함 재현·수정** | 아래 |
| E 저장·권한 | 기존 코드 정상 | `isStoredPaidResultRevoked`(23·4795행), 교차상품 fixture [`paid-completed-result-access-fixtures.mjs`](../../__tests__/fixtures/paid-completed-result-access-fixtures.mjs) 19행에 찻집 5개 키가 `fortune-tea-house.js`·`isStoredPaidResultRevoked` 마커로 등록 |
| F 예산 | 기존 코드 정상 | `/pending`(4749행)·`/results/:id`(4801행) GET 에는 LLM 경로가 없다. 같은 `attemptId` 재POST 는 `cached: true`(5432~5445행)로 돌아가고, 진행 중 중복은 생성 잠금이 막는다(4473~4476행) |
| 🟡 "품질 게이트 전량 모킹" 함정(8·14행 패턴) | **해당 없음** | 실행 스위트는 실제 `handleFortuneTeaHouseRoutes` 에 POST 하고 모킹은 인프라 경계(auth·db·모델·billing·gemini)뿐이다 |

## 발견과 수정 — 깨어남 복구 부재 1건 (D축, 결제한 상담 유실 / 화면)

**재현된 결함.** `FortuneTeaHousePage.tsx` 는 `pageshow`·`focus`·`online`·`visibilitychange` 를 **하나도 구독하지 않았다**(기능 디렉터리 전수 grep: 깨어남 리스너는 꿀편지용 `TeaHouseResultSheet.tsx` 625~626행뿐이며 그건 75행 소관, `addEventListener` 나머지는 BGM 잠금 해제·오디오용). 서버에 남은 진행 중 유료 상담을 되찾는 `GET /api/fortune-tea-house/pending` 조회가 `useEffect(..., [recoveryOwner])` **안에 인라인**돼 있어 마운트·계정 변경 때 1회만 돌았다.

- **도달 가능성(실측):** 폴링 백오프 `FORTUNE_TEA_POLL_BACKOFFS_MS`(317행) 합계는 약 263초다. 모바일에서 탭이 백그라운드로 내려가 그 예산이 소진되면 화면은 `goToStage("questionInput")`(1331행)로 떨어지는데 **서버는 아직 생성 중일 수 있다**. 돌아온 사용자는 전체 리마운트 전까지 결제한 상담을 화면에서 잃는다. 5~19행에서 15회 반복된 것과 같은 결함 클래스다.
- **수정:** `/pending` 조회를 `probeFortuneTeaPending(owner)`(597행, `useCallback(..., [])`)로 들어올리고 마운트 effect 는 `if (recoveryOwner) void probeFortuneTeaPending(recoveryOwner);`(649행)로 축약했다. 그 뒤 깨어남 effect(655~677행)가 `pageshow`·`focus`·`online`(window)과 `visibilitychange`(document)를 구독하고 대칭 cleanup 을 둔다. `src/features/fortune-tea-house/FortuneTeaHousePage.tsx` +50/-13행, 워커·가격·정책 무수정.
- 🔴 **`consultRunRef` 를 건드리지 않는 것이 이 수정의 핵심 제약이다.** 올리면 1130·1205·1221·1239행의 폴링 취소 검사가 참이 되어 깨어난 탭이 **살아 있는 유료 생성을 죽인다**. 기존 `[recoveryOwner]` effect 는 `consultRunRef.current += 1`·`setConsultResult(null)` 로 파괴적 리셋을 하므로 그 effect 자체를 깨어남에 재사용할 수 없었다 — 조회만 분리한 이유다.
- **복구는 "상태 되살리기"까지만 하고 자동 재폴링은 하지 않는다.** 자동 재개는 `submitQuestion` 호출을 뜻하고 그건 1010~1011행에서 `consultRunRef` 를 올린다. 또한 탭 복귀 한 번에 최대 4개 신호가 발화하는 핸들러가 **금전 이동(POST /consult)** 을 트리거하게 두지 않는다 — 서버가 중복을 막더라도 50코인 경로의 기준으로 "아마 안 된다"는 근거가 아니다. 되살린 `unusedPaidAttemptRef` 가 `requestPayload`·`billingGate` 를 들고 있어 다음 제출은 `carriedPaid` 분기(1103~1111·1173행)로 결제창·ensure-access 없이 동일 본문을 보낸다(기존 계약 그대로).

### 가드와 변이 검증

신규 테스트는 [`__tests__/ui/fortune-tea-house-recovery.behavior.test.js`](../../__tests__/ui/fortune-tea-house-recovery.behavior.test.js) 3건이다. 기존 13건 단언은 손대지 않았고, 하네스에는 `useCallback` 초기화자를 AST 로 꺼내는 `hookCallbackSource` 와 ref 2개만 더했다(리팩터 후 마운트 effect 가 이 조회를 호출하므로 정의가 없으면 기존 테스트가 `ReferenceError` 로 깨진다 — 프로덕션 코드를 optional chaining 으로 눙치지 않았다).

가드 7개를 하나씩 변이시켜 **지목한 테스트 1건만 깨지는지** 실측했다.

| 변이 | 깨진 테스트 | 결과 |
|---|---|---|
| `event.persisted` 게이트 제거 | 깨어남 복구는 bfcache 복귀에서만… | 물림 |
| `pendingProbeRef` 재진입 가드 제거 | 〃 (조회 1회 → 4회) | 물림 |
| cleanup `removeEventListener("focus")` 삭제 | 〃 (해제 후에도 조회 증가) | 물림 |
| 조회 진입부 `submitLockRef` 검사 제거 | 진행 중인 유료 생성도 이미 열린 결과도… | 물림 |
| `wakeBlockedRef` 검사 제거 | 〃 (결과 열림) | 물림 |
| 조회에 `consultRunRef.current += 1` 추가 | 〃 (7 → 8) | 물림 |
| `if (!recoveryOwner) return` 제거 | 〃 (로그아웃 상태에서 리스너 4개 등록) | 물림 |

첫 회차에서 "조회 진입부 `submitLockRef` 검사 제거" 변이가 **아무 테스트도 깨뜨리지 못했다** — 깨어남 핸들러가 같은 검사를 중복하고 있어 어느 쪽도 단독으로는 하중을 받지 않았기 때문이다. 핸들러의 중복 검사를 지우고 조회 자신을 단일 판정처로 만든 뒤 재실행해 물림을 확인했다(마운트 경로도 같은 판정을 쓰게 된다).

## 재검사 명령과 결과

- `npm run test:jest -- --runInBand __tests__/worker/fortune-tea-house-tarot-cardwise.test.js __tests__/worker/fortune-tea-house-honey-drops.test.js __tests__/worker/fortune-tea-house-evidence-cast.test.js __tests__/worker/fortune-tea-house-saju-timing.test.js __tests__/worker/paid-completed-result-access.test.js` → **통과(exit 0)**. A·B·E·F 의 실측 근거.
- `node --test __tests__/ui/fortune-tea-house-recovery.behavior.test.js` → 수정 전 신규 3건 실패 → 수정 후 **16/16 통과**.
- `node --test __tests__/ui/fortune-tea-house-recovery.behavior.test.js __tests__/ui/fortune-tea-house-paid-resume.static.test.js` → **19/19 통과**.
- `npm run check:fast` → 결제 인접 파일 수정으로 RED 자동 승격, 전체 게이트 통과.
- `npm run sitemap:generate` → 같은 커밋에 포함. `npm run verify:sitemap-drift` OK, `npm run verify:public-mirror-fresh` OK.

## 경계

**D축 실제 브라우저 렌더 증거는 이번에도 없다** — 5~22행과 동일한 경계다. 테스트는 `vm` 안에서 실제 `useCallback`·`useEffect` 본문을 그대로 실행하지만 DOM·네트워크는 스텁이다. 실결제·과금 LLM 실호출·운영 DB 쓰기·운영 승격은 하지 않았고 모든 결제·LLM 경로는 mock 이다.

## 남은 후속 과제 (범위 밖, 보고만)

- 🟡 재검증표가 23~27행의 "기존 검사"로 지목한 [`__tests__/worker/fortune-tea-house-delivery-billing.test.js`](../../__tests__/worker/fortune-tea-house-delivery-billing.test.js)(52행)는 이름과 달리 `worker/routes/billing.js` 의 `handleDeferredUsageApply`·`completeDeferredUsageRecord` 두 함수만 vm 실행하는 파일이다. **찻집 코드가 한 줄도 돌지 않는다.** 실제 커버리지는 `fortune-tea-house-tarot-cardwise.test.js`(319행)·`fortune-tea-house-honey-drops.test.js`(1,048행)에 있으므로 24~27행 진행 때 표의 링크를 바로잡는 편이 좋다.
- 🟡 `apply` 성공 후 `completeFortuneTeaHouseDelivery`(5543행)가 throw 했을 때의 과금 유지·멱등 복구 의도(5525~5526행 주석)에 대한 전용 테스트가 없다.
- 🟡 폴링 중 429(325행)는 전용 분기 없이 일반 실패로 떨어진다.
- 🟡 꿀편지(75행) 재개 effect 도 `pageshow`·`focus` 를 구독하지 않는다 — 이번 수정과 같은 결함 클래스이나 다른 행 소관이다.
