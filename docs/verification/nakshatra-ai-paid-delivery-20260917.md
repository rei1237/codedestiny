# 나크샤트라 결정판 전문가 심화 상담 유료 전달 검증 — 2026-09-17

대상은 재검증표 6행 `nakshatra-ai-consultation` 하나다. 활성 진입점은 결과 화면 `app/nakshatra/ai/NakshatraAiClient.tsx` → `worker/routes/nakshatra-ai.js`의 `/api/nakshatra-ai/start`·`/generate`·`/result` → 숙요(宿曜)·베다(Jyotish) 9장 생성기다. 마스터·초융합·자미 심층·네오(행 3~5)에서 이미 확인된 것과 같은 뼈대의 client-side 깨어남 복구 버그를 나크샤트라에서도 재현·수정하는 좁은 범위로 진행했다. 다른 세션의 marketing/오늘의 허브·numerology 작업은 건드리지 않았다.

## 재현과 수정

| 재현 | 변경 전 | 변경 후 |
|---|---|---|
| 결과 화면이 백그라운드/모바일 bfcache 뒤 복귀 | `recover` effect가 `online`/`visibilitychange`만 연결, 모바일 bfcache 복원·데스크톱 재포커스에서 방치된 세션이 재조회되지 않아 생성 중 화면에 머문다 | 같은 `recover` 핸들러에 `pageshow`/`focus`를 추가 연결, cleanup에서도 4개 모두 해제(`app/nakshatra/ai/NakshatraAiClient.tsx` 270~284행) — 기존 마스터·초융합·자미·네오와 동일 패턴 |

`document.visibilityState==="hidden"`·`navigator.onLine===false`·이미 진행 중(`busyRef.current`)·소유권 상실(`captureOwner`) 가드는 그대로이며 회귀 없음(아래 D 검사로 확인).

## 대조 결과 (수정 없음 — 기존 코드가 이미 올바름)

- **구매 키 해석과 재개:** `readIdempotencyKey`(`worker/routes/nakshatra-ai.js:117-118`)는 `idempotencyKey`→`attemptId`→`requestId`→헤더 순으로 해석하며, `resolveEnsureAccess`(324행)가 `{userId, idempotencyKey}`로 기존 문서를 재조회해 이어 쓴다. 기존 `__tests__/worker/nakshatra-paid-delivery.test.js`의 3-wave 테스트(93행)가 반복 `/generate` 호출이 처음부터 다시 생성하지 않고 저장된 장부터 이어짐을, `'restores partial chapters from the account server record'`(97행)가 방치된 세션을 GET으로 이어받음을 이미 증명한다. 새로 재현되지 않았다.
- **정상 completed 대 취소 구매의 GET/POST 대조:** `handleResult`(GET, 1001~1047행)만 `isStoredPaidResultRevoked`를 호출해(1047행) 매 조회마다 취소·환불을 재확인한다. `handleStart`(POST, 799행)의 완료 문서 재생 경로는 이 재확인을 하지 않는데, 이것이 버그가 아니라 의도된 설계임을 기존 테스트 `'does not replace historical short completed results'`(103행)가 이미 명시적으로 단언한다: 총 5자짜리 구버전 completed 문서도 `mode='none'`(활성 이용권 없음) 상태에서 POST replay 시 200으로 그대로 서비스되며 provider는 4회(진입 시 생성분)에서 더 늘지 않는다. 코드를 고치면 이 기존 테스트를 깨뜨리므로 손대지 않았다 — 네오 5행에서 같은 구조로 이미 확인된 것과 동일한 결론이다.

## A~F mock 근거와 경계

- **A 구매:** 코드 대조(`readIdempotencyKey`/`resolveEnsureAccess`, 위 대조 결과)와 기존 3-wave 테스트(93행, 반복 `/start`·`/generate`가 같은 문서를 이어 씀)·`'restores partial chapters...'`(97행, GET이 `progress:{completed:4}`로 방치 세션을 복원)로 확인. 실제 PG는 호출하지 않았다.
- **B 생성:** `npm run verify:nakshatra-ai-flow` 재실행 — 이용권·월정석·단건 결제 선택 계약, 결제 재개·이중 차감 방지, 단일 통합 생성 단계, 신규/구 schema 동시 지원, 클라이언트 9장 진행률·Hero·long-form 구성·360px 이하 모바일 보정을 확인, 전부 통과(회귀 없음). 기존 3-wave 테스트(93행)가 `pass`/`monthly`/`paid` 3경로 모두 9장 완료·20,000자 이상·provider 9회(4번째 유휴 폴링에서 추가 없음)를 검사하며 재확인했다.
- **C 장애:** 새로 주입하지 않았다. 기존 `nakshatra-paid-delivery.test.js`의 `delivery_pending`/`completed` × `null`/`throw`/`confirm` 6변형 저장 장애 매트릭스(94행, 환불 없이 503/`RESULT_STORAGE_UNAVAILABLE`), 체크포인트 1개 유실 시 나머지 3장 보존(101행), 계산 근거와 모순되는 장만 단독 재시도(105행), 재시도 소진 시 조용히 완료 처리하지 않고 503 유지(107행), 짧은 본문은 완료·차감 처리하지 않음(102행), 동시 재시도가 한 wave만 공유(100행)를 재실행해 통과를 재확인했다. `npm run verify:nakshatra-premium`이 심화 상담 전용 일시 장애 재시도 예산(폴링 전환·진행 예산 별도 카운터·상한 비복구·벽시계 상한 4개)도 통과했다. 이번 수정은 이 경로를 건드리지 않는다.
- **D 전달:** 실제 클라이언트 파일에서 TypeScript AST로 `recover` effect 본문을 추출해 `vm.runInNewContext`로 실행하는 행동 검사(`__tests__/ui/nakshatra-wake-recovery.behavior.test.js`, 신규)를 작성했다. 수정 전 코드(커밋 `755949af0`의 파일 스냅샷을 별도 추출해 실행)가 `window:pageshow` 리스너 미등록으로 실패(`actual 'undefined'`, `expected 'function'`)함을 이번 세션에서 직접 재현·측정했고, 수정 후(현재 코드)는 마운트 1회 복구·`pageshow`/`focus`/`online`/`visibilitychange` 4개 이벤트 각각 재복구·hidden 가드·오프라인 가드·busy 가드(중복 방지)·stale-owner 가드(늦은 응답 폐기)·언마운트 시 리스너 전부 해제까지 전부 통과로 전환됨을 확인했다. **실제 Playwright 브라우저 렌더(390/430/1280px 화면 증거)는 이번 차례에 만들지 않았다** — 마스터·초융합·자미 심층 행과 달리 함수 단위 행동 검사로만 확인했으며, 화면 스크린샷 수준 증거는 남은 경계다(네오 5행과 동일한 경계).
- **E 저장·권한:** 새로 주입하지 않았다. 기존 `nakshatra-paid-delivery.test.js`의 `'rejects another account without provider calls'`(98행, 타 계정 404·provider 추가 호출 없음)·`'rejects revoked evidence source ${source}'`(99행, 4개 증빙 소스 각각 402·usage 미호출)·`'does not replace historical short completed results'`(103행, 위 대조 결과)를 재실행해 통과를 재확인했다. 추가로 상품에 무관한 공유 검사 `__tests__/worker/paid-completed-result-access.test.js`가 `PAID_COMPLETED_RESULT_PRODUCT_KEYS`에 `nakshatra-ai-consultation`을 포함해(`__tests__/fixtures/paid-completed-result-access-fixtures.mjs:6`) "정상 과거 구매본은 재검사 없이 재열람"·"취소·환불된 구매본은 completed여도 차단"을 `test.each`로 함께 검사한다 — 네오 5행이 단일 파일 증거였던 것보다 넓은 교차 상품 증거다. 전액 취소/환불·타 계정 차단은 GET 경로 기준이며, POST 완료 재생 경로는 의도적으로 이 재확인에서 제외됨을 위에서 서술했다.
- **F 예산·운영 확인:** 별도 전후 호출/문자 비교 스크립트는 새로 만들지 않았다. `nakshatra-paid-delivery.test.js`에 내장된 provider 호출 수 단언(3-wave 완료 후 반복 호출해도 9회 고정, 타 계정·증빙 차단 시나리오에서 4회 고정, 동시 재시도에서 8회로 wave 1개만 공유)이 이번 수정과 무관하게 그대로 유지됨을 재확인해 생성 경로 자체는 건드리지 않았음을 간접 확인했다. **입력/모델/출력 기준의 전용 전후 diff 증거(초융합 F행 형식)는 만들지 않았다** — 이번 수정이 클라이언트 이벤트 리스너 2개 추가에 한정돼 provider 호출 경로를 바꾸지 않는다는 점을 근거로 생략했다(네오 5행과 동일한 경계).

이번 차례는 client-side 깨어남 복구 버그 재현·수정 1건에 한정했다. **74구매 키+후속3경로 전체의 A~F 완료를 뜻하지 않으며, 6행 자체도 D의 실제 화면 증거와 F의 전용 전후 diff는 아직 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정 파일(커밋 `0ef57a367e66fec2b57849671f132c750468bffe`):

- 고객 화면: `app/nakshatra/ai/NakshatraAiClient.tsx` — 복구 effect에 `pageshow`/`focus` 추가(10행 diff).
- 행동 검사: `__tests__/ui/nakshatra-wake-recovery.behavior.test.js` (신규, 75행).

```powershell
# 수정 전 재현 (커밋 755949af0 스냅샷을 임시로 추출해 실행, 실제 파일은 건드리지 않음)
git show 755949af0:app/nakshatra/ai/NakshatraAiClient.tsx > <scratch>/NakshatraAiClient.pre.tsx
node --test <scratch>/prefix.behavior.test.js   # extractEffect 대상 경로만 위 파일로 치환한 사본

# 수정 후
node scripts/run-mock-tests.mjs jest __tests__/worker/nakshatra-paid-delivery.test.js __tests__/worker/paid-completed-result-access.test.js --runInBand
npm run verify:nakshatra-flow
npm run verify:nakshatra-ai-flow
npm run verify:nakshatra-premium
npm run check:fast -- --committed-head
```

결과: 수정 전 재현 1/1 실패(`window:pageshow` 핸들러 미등록, `actual 'undefined'` vs `expected 'function'`) → 수정 후 신규 UI 행동 검사 통과로 전환. 기존 nakshatra worker 검사 + 교차 상품 검사 2 suite·118/118 통과(무회귀). `verify:nakshatra-flow`/`verify:nakshatra-ai-flow`/`verify:nakshatra-premium` 전부 OK, 회귀 없음.

`npm run check:fast -- --committed-head`(base `755949af0`→head `0ef57a367`, 커밋 범위만 스코프)는 처음부터 끝까지 막힘 없이 통과했다: `run-paid-gate-suite.mjs` 88/88 ok(`failClosed:false`, nakshatra 3개 verify 포함), `lint` 0 오류, `verify:sitemap-drift` OK(추적본 일치, URL 1265개 — 네오 5행을 막았던 드리프트가 이번엔 없음), `typecheck` 0 오류, `test:node` 1,400/1,400 통과, `verify:env-parity`·`verify:billing-pass-policy`·`verify:pass-tier-policy`·`verify:portone-single-payment`·`verify:phone-encryption`·`verify:signup-phone-required`·`verify:paid-gate-ui`·`verify:payment-choice-parity`·`verify:payment-phone-consent`·`verify:checkout-pass-card`·`verify:paid-feature-billing-policy`·`verify:ai-prompt-billing-policy`·`verify:pass-snapshot`·`verify:pass-recovery-path`·`verify:saju-unlock-entitlement-regression`·`verify:ai-consultation-flows`(세부 포함)·`verify:staging-llm-mock`·`verify:analytics-events`·`verify:no-nested-retry`·`verify:worker-no-undef`·`verify:mongo-reset-callers`·`verify:cron-mongo-op-coverage`·`verify:admin-route-error-context` 전부 통과, `build:worker` dry-run 정상(바인딩 목록 출력, 오류 0), `verify:entry-encoding --strict-core` OK, `test:jest` 277 suite·3,880/3,880 통과(152.1초). 네오 5행과 달리 이번엔 `verify:sitemap-drift`를 포함해 개별 스텝 fallback 없이 파이프라인 전체가 한 번에 깨끗하게 통과했다.

## 전달

작업 중 다른 세션이 같은 main 체크아웃에서 `perf(analytics): inject gtag.js after window load idle`(`aeeb9f714`)를 내 커밋 위에 이어 커밋했다. marketing/오늘의 허브의 미커밋 변경은 이번에도 건드리지 않았고(`git status`로 커밋 전후 동일함을 확인), 두 커밋을 함께 `git push origin main`(`755949af0..aeeb9f714`, fast-forward)으로 반영했다.

검증 SHA `0ef57a367e66fec2b57849671f132c750468bffe`는 현재 main·origin main 끝점 `aeeb9f714884771b81a82ace8d8a2f2f43740469`의 조상이다. 이 끝점의 [`PR CI`](https://github.com/rei1237/codedestiny/actions/runs/35176230590)를 포함해 `CI required`·`Static guards`(네오 5행을 막았던 `verify:sitemap-drift`류 포함)·`Critical checks`·`Typecheck and lint`·`Build Pages and Worker`·`paid-flow-gates`·`Deploy staging`·`gitleaks`·`Main drift` 등 check-run 24개를 전부 확인했다 — 실패 0, 나머지는 success 또는 skipped(비대상 잡)다. 네오 5행과 달리 이번엔 push한 SHA에서 개별 실패나 후속 커밋 대기 없이 곧바로 전 레인 success다.
