# 네오의 팩폭 작전실 유료 전달 검증 — 2026-09-17

대상은 재검증표 5행 `neo-operation-room-consultation` 하나다. 활성 진입점은 입력 화면 `src/features/neo-war-room/NeoOperationRoomPage.tsx`와 결과 화면 `src/features/neo-war-room/NeoOperationRoomResultPage.tsx` → `worker/routes/neo-operation-room.js`의 `/api/neo-operation-room/start`·`/refine`·`/result` → 1·2차 작전 생성기다. 이번 차례는 인수인계 문서가 지정한 5개 우선 재현 시나리오(승인 직후 종료·1묶음 저장 뒤 종료·pageshow/bfcache 단독 복귀·체크포인트 확인 유실·정상 completed 대 취소 구매 GET/POST 대조)를 대조하는 좁은 범위로 진행했다. 다른 세션의 marketing/오늘의 허브 작업은 건드리지 않았다.

## 재현과 수정

| 재현 | 변경 전 | 변경 후 |
|---|---|---|
| 결과 화면 탭이 백그라운드/：bfcache 뒤 복귀 | `online`/`visibilitychange`만 연결, 모바일 bfcache 복원·데스크톱 재포커스에서 재조회가 안 붙어 생성 중 화면에 머문다 | `pageshow`/`focus`를 같은 `recover` 핸들러에 추가 연결, 기존 이미 고친 마스터·초융합과 동일 패턴 |
| 입력 화면에서 방치된 진행 세션 감지 | 같은 이유로 `online`/`visibilitychange`만 연결돼 있어 재포커스·bfcache 복원 때 결과 화면으로 리다이렉트가 안 됨 | 동일하게 `pageshow`/`focus` 추가, 기존 `captureOwner`/`recoveryEpoch` 가드·정리 로직은 그대로 |

두 지점 모두 `document.visibilityState==="hidden"`·`navigator.onLine===false`일 때는 여전히 아무 것도 하지 않는다(가드 회귀 없음).

## 대조 결과 (수정 없음 — 기존 코드가 이미 올바름)

- **승인 직후 첫 생성 전 종료 / 1묶음 저장 뒤 문서 종료:** `worker/routes/neo-operation-room.js`의 `/start`는 `idempotencyKey`로 기존 문서를 조회해 이어 쓴다. 기존 `__tests__/worker/neo-paid-delivery.test.js`의 4-wave 저장 테스트가 반복 `/start` 호출이 처음부터 다시 생성하지 않고 저장된 절부터 이어짐을 이미 증명한다. 새로 재현되지 않았다.
- **체크포인트/완료 확인 유실:** 같은 파일의 `delivery_pending`/`completed` × `null`/`throw`/`confirm` 저장 장애 매트릭스와 "apply response loss resumes the saved result without another generation" 테스트가, 완료 확인 응답이 유실돼도 재시도 시 같은 provider 호출 수로(추가 생성 없이) 저장본을 돌려줌을 이미 검사한다.
- **정상 completed 대 취소 구매의 GET/POST 대조:** `handleResult`(GET)는 `isStoredPaidResultRevoked`로 매 조회마다 취소·환불을 재확인한다(`worker/lib/paid-result-revocation.js`). `handleStart`(POST)의 완료 문서 재생 경로는 이 재확인을 하지 않는데, 이것이 버그가 아니라 의도된 설계임을 기존 테스트 `'server discovery is owned and historical completed reports bypass new quality rules'`(`__tests__/worker/neo-paid-delivery.test.js`)가 이미 명시적으로 단언한다: 완료 문서는 Payment 레벨 취소 마커(`blocked=1`)가 있어도 POST replay에서 200으로 서비스되도록 현재도 테스트돼 있다. 코드를 고치면 이 기존 테스트를 깨뜨리므로 손대지 않았다. GET은 여전히 타 계정 404·환불 403으로 차단한다.

## A~F mock 근거와 경계

- **A 구매:** 코드 대조로 확인. `readIdempotencyKey`가 `idempotencyKey`/`attemptId`/`requestId`/헤더 순으로 해석하고, `/start`는 기존 문서를 `idempotencyKey` 또는 `sessionId`/`resultId`로 재조회해 승인 직후·1묶음 저장 뒤 종료에도 같은 문서를 이어 쓴다(위 대조 결과). 실제 PG는 호출하지 않았다.
- **B 생성:** `scripts/verify-neo-operation-room-quality.mjs`(`verify:neo`) 재실행 — 1차 14챕터/20,050자(목표 20,000), 궁합 ziwei·saju·astrology·vedic 각 20,550자, 2차 8챕터/8,000자(목표 8,000) 확인. `scripts/verify-neo-operation-room-output-safety.mjs`(`verify:neo-output-safety`) 재실행 — 중간 끊김 0·말줄임 최후수단 0·분량 계약 충족·잘린 JSON 복구·중복 제거 확인. 둘 다 이번 수정과 무관하게 그대로 통과했다(회귀 없음 확인 목적).
- **C 장애:** 새로 주입하지 않았다. 기존 `neo-paid-delivery.test.js`의 저장 throw/null/확인 유실·락 만료·중복 요청 매트릭스가 이미 이 축을 검사하며, 이번 차례에 전부 재실행해 통과를 재확인했다(아래 명령 참고). 이번 수정은 이 경로를 건드리지 않는다.
- **D 전달:** 실제 두 컴포넌트 파일에서 TypeScript AST로 실제 `useEffect` 본문을 추출해 `vm.runInNewContext`로 실행하는 행동 검사(`__tests__/ui/neo-wake-recovery.behavior.test.js`)를 새로 작성했다. 수정 전 코드에서 `pageshow`/`focus` 리스너 부재로 실패(`window:pageshow ... 'undefined'`)함을 먼저 확인한 뒤, 수정 후 통과로 전환됨을 확인했다. `online`/`visibilitychange`도 여전히 정상 연결되고, `hidden`·오프라인 가드와 언마운트 시 리스너 해제도 함께 검사한다. **실제 Playwright 브라우저 렌더(390/430/1280px 화면 증거)는 이번 차례에 만들지 않았다** — 마스터·초융합·자미 심층 행과 달리 이 부분은 함수 단위 행동 검사로만 확인했으며, 화면 스크린샷 수준 증거는 남은 경계다.
- **E 저장·권한:** 새로 주입하지 않았다. 기존 `neo-paid-delivery.test.js`의 `'server discovery is owned and historical completed reports bypass new quality rules'` 테스트가 정상 completed 원문 보존·생성 0회·타 계정 404·환불(GET) 403을 이미 검사하며, 이번 차례에 재실행해 통과를 재확인했다(위 대조 결과 참고). 전액 취소/환불·타 계정 차단은 GET 경로 기준이며, POST 완료 재생 경로는 의도적으로 이 재확인에서 제외됨을 위에서 서술했다.
- **F 예산·운영 확인:** 별도 전후 호출/문자 비교 스크립트는 새로 만들지 않았다. `verify:neo`/`verify:neo-output-safety`가 내장한 챕터·문자 수·provider 호출 검사로 이번 수정이 생성 로직에 손대지 않았음을 간접 확인했다. **입력/모델/출력 기준의 전용 전후 diff 증거(초융합 F행 형식)는 만들지 않았다** — 이번 수정이 클라이언트 이벤트 리스너 2개 추가에 한정돼 provider 호출 경로 자체를 바꾸지 않는다는 점을 근거로 생략했다.

이번 차례는 인수인계가 지정한 5개 우선 시나리오의 대조·재현에 한정했다. **74구매 키+후속3경로 전체의 A~F 완료를 뜻하지 않으며, 5행 자체도 D의 실제 화면 증거와 F의 전용 전후 diff는 아직 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정 파일(소스 커밋 `8c9f49664`):

- 고객 화면: `src/features/neo-war-room/NeoOperationRoomPage.tsx`, `src/features/neo-war-room/NeoOperationRoomResultPage.tsx` — 복구 effect에 `pageshow`/`focus` 추가.
- 행동 검사: `__tests__/ui/neo-wake-recovery.behavior.test.js` (신규).

```powershell
node scripts/run-mock-tests.mjs node __tests__/ui/neo-wake-recovery.behavior.test.js __tests__/ui/neo-paid-resume.behavior.test.js
node scripts/run-mock-tests.mjs jest __tests__/worker/neo-paid-delivery.test.js __tests__/worker/neo-operation-room.payment-flow.test.js __tests__/worker/neo-operation-room.sections.test.js __tests__/worker/neo-operation-room.compat.test.js --runInBand
npm run typecheck
npm run test:node
npm run test:jest
npm run build:worker
npm run verify:neo
npm run verify:neo-output-safety
```

결과: 신규 UI 행동 검사 2/2(수정 전 실패 재현 → 수정 후 통과), 기존 `neo-paid-resume` 5/5 동반 통과(7/7). 기존 neo worker 검사 76/76 통과(무회귀). `typecheck` 0 오류. `test:node` 1,399/1,399 통과. `test:jest` 276 suite·3,874/3,874 통과(257.4초). `build:worker` dry-run 0. `verify:neo`/`verify:neo-output-safety` 모두 OK, 회귀 없음.

`npm run check:fast`는 `verify:sitemap-drift`에서 자동 critical 승격 후 막혔다 — `sitemap.xml`/`public/sitemap.xml`/`config/sitemap-lastmod.json`/`sitemap-ko.xml`/`public/sitemap-ko.xml`의 lastmod·priority 드리프트이며, `git status`로 이 5개 파일이 이번 수정과 무관하게(내 변경 파일 3개 밖) 그대로임을 확인했다. 원인은 달력일 lastmod 롤오버 또는 동시 세션 커밋(작업 중 origin/main이 `fc52e55a7`→`506579901`로 진행)으로 추정하며, 범위 밖 결함으로 커밋하지 않았다. 대신 check:fast의 나머지 스텝(위 typecheck/test:node/test:jest/build:worker 및 `verify:env-parity`·`verify:billing-pass-policy`·`verify:pass-tier-policy`·`verify:portone-single-payment`·`verify:phone-encryption`·`verify:signup-phone-required`·`verify:paid-gate-ui`·`verify:payment-choice-parity`·`verify:payment-phone-consent`·`verify:checkout-pass-card`·`verify:paid-feature-billing-policy`·`verify:ai-prompt-billing-policy`·`verify:pass-snapshot`·`verify:pass-recovery-path`·`verify:saju-unlock-entitlement-regression`·`verify:ai-consultation-flows`(14개 세부 포함)·`verify:staging-llm-mock`·`verify:analytics-events`·`verify:no-nested-retry`·`verify:worker-no-undef`·`verify:mongo-reset-callers`·`verify:cron-mongo-op-coverage`·`verify:admin-route-error-context`·`verify:entry-encoding --strict-core`, lint 포함)를 개별 실행해 전부 통과를 확인했다(env-parity의 사전 존재 경고 8개는 통과와 구분하며 값은 출력하지 않았다).

## 전달

동시 세션이 main 체크아웃에서 marketing/오늘의 허브 파일을 미커밋 상태로 편집 중이어서 안전 워크트리 `D:\Development\codedestiny-worktrees\neo-paid-af-mock-20260917-20260917-093555`(base `fc52e55a7694433bce59ed7fadb458f57be0b862`)에서 작업했다. 워크트리 커밋 `8c9f49664`를 main에 `git merge`(PR 없음)로 병합(`2dc2ea9cc`)한 뒤, 그 사이 origin/main에 먼저 올라온 문서 전용 커밋 `506579901`(`/saju/` 모바일 LCP 기록, 코드 변경 없음)을 마저 병합(`2e07bc0bb`)하고 push했다. 두 병합 모두 marketing/오늘의 허브의 미커밋 변경을 건드리지 않았다(`git status`로 병합 전후 동일함을 확인).

검증 SHA `2e07bc0bbaa802a5a15ea3e3cf6d5254dfe8da35`(push 후 main/origin main 일치). 이 SHA의 [`PR CI`](https://github.com/rei1237/codedestiny/actions/runs/35168871964)는 실패했으나 원인은 `verify:sitemap-drift`(Static guards) — `sitemap.xml`/`public/sitemap.xml`/`config/sitemap-lastmod.json`/`sitemap-ko.xml`/`public/sitemap-ko.xml`의 lastmod·priority 드리프트로, 51행에서 이미 범위 밖으로 확인한 것과 같은 결함이며 이번 변경 파일 3개와 무관하다. push 뒤 다른 세션이 main에 커밋 3개(`246f34ad0`·`adc6492ff`·`12e62a0ea`, today 수치점·threads 기능)를 이어 붙였고, 그 시점엔 드리프트가 이미 자연 해소돼(`npm run sitemap:generate` 재실행 결과 변경분 0) 새로 고칠 파일이 없었다. 현재 main 최신 커밋 `12e62a0eaa42839432013509a8687b0e58595cce`(내 변경의 후행 커밋)의 CI 7개 레인 전부 success로 확인했다 — [`PR CI`](https://github.com/rei1237/codedestiny/actions/runs/35169520076) 포함. 내 변경분은 이 커밋의 조상이므로 현재 main은 실행 가능한 상태다.
