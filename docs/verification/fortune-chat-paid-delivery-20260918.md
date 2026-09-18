# 연이 운명 상담 유료 전달 검증 — 2026-09-18

대상은 재검증표 17행(`fortune-chat-consultation`, "연이 운명 상담 1회")이다. 인수인계 문서가 정본으로 지목한 `worker/routes/fortune.js`는 실제로는 여러 상품이 섞인 공유 라우트 파일이며, 이 행 전용 핸들러는 그 안의 `handleGuardianFortuneGenerateRoute`/`buildGuardianFortunePaidAccessResolver`(POST `/api/fortune/guardian/generate`, 6301~6367행)와 GET `/api/fortune/guardian/result`(6588~6593행, `deliverGuardianPaid({ readOnly: true, ... })` 호출)다. 같은 파일 안에 별도의 SSE 채팅 라우트 `handleGuardianFortuneChatRoute`(POST `/api/fortune/guardian/chat`, 6595~6597행)도 있지만, `FortuneChatClient.tsx`의 실제 fetch 호출 4곳(329·389·455·539행)을 grep으로 전수 확인한 결과 이 화면은 `/api/fortune-chat/bootstrap`·`/api/fortune-chat/sessions/:id`·`/api/fortune/guardian/generate`·`/api/fortune/guardian/result`만 부르고 `/guardian/chat`은 호출하지 않는다 — SSE 라우트는 이 행의 검증 범위 밖이다. 대화 이력 저장·조회는 또 다른 별도 파일 `worker/routes/fortune-chat.js`(111행, `bootstrap`/`merge-anonymous`/`sessions/:id` GET·POST)가 전담하며, 결제·LLM 코드가 전혀 없는 순수 MongoDB CRUD다. 화면(`app/fortune-chat/FortuneChatClient.tsx`, `PAID_FEATURE_KEY` 219행)에서 결과 생성·재열람까지 이어지는 실제 호출 사슬을 코드로 확인한 뒤, 5~16행에서 13번째로 반복된 동일 패턴의 client-side 깨어남 복구 결함을 재현·수정했다.

## 발견과 수정

`FortuneChatClient.tsx`의 중단된 무료/유료 턴 복구 `useEffect`(약 525~565행)가 `online`·`visibilitychange` 두 이벤트만 구독하고 있었다(`pageshow`·`focus` 누락). bfcache 복원(pageshow 필요)이나 OS 레벨 앱 전환으로 인한 포커스 복귀(focus 필요, 일부 브라우저는 이 경로에서 visibilitychange를 쏘지 않는다) 시 중단된 턴이 복구되지 않을 수 있었다 — rows 5-16에서 반복 확인된 것과 동일한 결함 클래스다.

**수정:** `window.addEventListener('pageshow', wake)`·`window.addEventListener('focus', wake)`와 대응하는 `removeEventListener`를 cleanup에 추가했다. `usePaidResume`(`app/hooks/usePaidResume.ts`)는 별도 관심사(모바일 PG 리다이렉트로 인한 클로저 소실 복구, 게이트 없는 코어를 직접 호출)이며 pageshow/focus 커버리지를 제공하지 않는다는 점을 코드로 확인해, 이 화면 자체의 수정이 필요함을 확정했다.

**재현·변이 검증:** 실제 파일의 `useEffect` 콜백 소스를 TypeScript AST(`ts.createSourceFile` + 트리 순회)로 직접 추출해 `vm.runInNewContext` 샌드박스에서 실행하는 신규 테스트(`__tests__/ui/fortune-chat-wake-recovery.behavior.test.js`)를 작성했다(기존 `nakshatra-wake-recovery.behavior.test.js` 템플릿을 재확인 후 이 화면의 클로저·ref 구조에 맞게 이식). 수정 전 코드에 대해 먼저 실행해 `AssertionError [ERR_ASSERTION]: window:pageshow must be registered`(`actual: 'undefined', expected: 'function'`)로 **실패**함을 확인한 뒤 수정을 적용했고, 재실행해 **통과**(1/1, 약 68ms)함을 확인했다. `pageshow`·`focus`·`online`·`visibilitychange` 4개 모두 마운트 시 복구를 1회 수행하고 각 이벤트마다 재트리거하는지, `document.hidden`일 때는 복구하지 않는지, 이미 진행 중인 복구와 겹치지 않는지, 이미 화면에 렌더된 턴은 재요청하지 않는지, unmount 시 리스너 4개가 전부 제거되는지까지 확인한다.

## 대조 결과

- **"무료 3회" 문서 기재는 낡았다 — 실제는 "로그인 시 총 1회":** `worker/lib/guardian-fortune-usage.js` 9~17행에 2026-08-17 정책 변경이 코드 주석으로 명시돼 있다 — `GUARDIAN_FORTUNE_GUEST_LIMIT = 0`(비로그인 무료 없음, 로그인 유도), `GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT = 1`(로그인 계정은 총 1회, 일일 반복 아님). 이전 정책은 "비로그인 1회 + 계정 하루 3회"였다. 같은 주석(12~14행)은 계정 문서의 `freeLimit` 필드가 `$setOnInsert`로 박제되어 기존 회원 문서에는 여전히 3이 저장돼 있음을 밝히고, 그래서 판정 로직이 저장값이 아니라 이 상수를 **상한**으로 강제해 기존 계정도 함께 1회로 내려간다고 설명한다 — 신규 가입자만이 아니라 기존 회원 전체에 적용되는 정책임을 코드로 확인했다. 반면 `docs/PAYMENT_AND_ACCESS.md:27`("`fortune-chat-consultation` — 50코인(5,000원). 무료 3회 이후 1회.")과 `docs/FEATURE_MAP.md:88·99`("하루 최대 3회", "무료 3회 이후 표준 회당 결제")는 여전히 옛 정책을 기재하고 있다 — **실측으로 확인한 문서 드리프트**이며, 인수인계 문서의 17행 섹션 자체도 이 "3회" 수치를 이어받으면서 스스로 "grep만 확인"이라 명시해 두었다. 코딩 원칙 14(범위 밖 결함은 보고만 한다)에 따라 `docs/PAYMENT_AND_ACCESS.md`·`docs/FEATURE_MAP.md`는 고치지 않고 이 문서와 인수인계 갱신으로만 보고한다.
- **무료 소진 후 가격 정본:** `worker/lib/paid-feature-registry.js:346` `{ cost: 50, amountKRW: 5000, reason: "연이 운명 상담 1회" }` — 화면·문서가 공통으로 쓰는 50코인/5,000원과 일치.
- **별칭 테이블 없음(16행과 다른 구조):** `paid-feature-registry.js` 530~544행의 `"fortune-chat-consultation"`(539행)은 다른 14개 형제 feature-key와 나란히 있는 평범한 배열 멤버십 항목이다 — 16행(`premium-naming-prompt`)이 가진 705~720행 별도 별칭 테이블 같은 구조가 없다. 추가로 확인할 별칭 매핑이 없음을 확인했다.
- **재열람 시 추가 과금·생성 불가 — F축을 실제 호출 사슬로 증명:** GET `/api/fortune/guardian/result` → `deliverGuardianPaid({ readOnly: true, ... })`(`worker/lib/guardian-paid-delivery.js:16-56`). (1) `readOnly && !found`(과거 유료 턴 기록 없음)이면 23행에서 즉시 `{ status: 404 }`를 반환하며 생성 시도 자체가 없다. (2) 기록이 있으면 28행이 `runPaidNarrativeDelivery`(`./paid-narrative-delivery.js`, 4행에서 import)를 **`method: readOnly ? 'GET' : 'POST'`**로 만든 합성 `Request`로 호출한다. (3) `paid-narrative-delivery.js:59` `if (doc?.premiumStatus === "completed" || doc?.metadata?.paidNarrative?.exhaustionClaimed || request.method === "GET") return respond(doc, render);` — GET 메서드는 무조건 이미 저장된 문서로 즉시 응답하며, LLM 생성 호출이 들어 있는 `produce` 콜백(`guardian-paid-delivery.js:39-46`, 43행 `await generator(...)`)은 **호출되지 않는다**. `verify(original)`(결제 증빙 조회, 56행)은 GET에서도 실행되지만 같은 requestId에 대한 멱등 재확인이지 신규 차감이 아니다. (4) 대화 이력 저장·조회(`worker/routes/fortune-chat.js`)는 이 사슬과 완전히 분리된 순수 MongoDB CRUD 파일로, 111행 전체에 결제·LLM 코드가 없어 구조적으로 과금·생성이 불가능하다.
- **"품질 게이트 전량 모킹" 함정(8·14행 반복 패턴) — 해당 없음, 이번 세션에서 직접 재확인:** `__tests__/worker/guardian-paid-delivery.test.js`(21~26행)를 읽어 모킹 경계를 확인했다. `jest.unstable_mockModule`로 대체되는 것은 `db.js`(connectDb만), `auth.js`(requireAuth만), `access-control.js`(전체 — 결제 인가는 이 스위트의 범위 밖), `models.js`(트랜잭션 문서용 인메모리 스텁), `gemini.js`(`callGeminiText`만, `provider` jest.fn으로 라우팅)뿐이다. **`deliverGuardianPaid` 자신은 모킹 없이 실제 함수 그대로 import되어 실행**되며, 체크포인트 저장/재시도, `usedFallback`/`isMock`/`deliverable===false` 거부(43행 `%s is retained as incomplete, never sold as successful` 테스트가 202로 거부됨을 직접 검증), 결제 취소·소유자 불일치 403, 동시 요청 클레임 공유(overlapping requests) 등 실제 품질·과금 게이트 로직이 그대로 실행된다. 이번 수정과 무관하게, 이번 세션에서 3개 worker 스위트(`guardian-paid-delivery.test.js`+`guardian-fortune-usage.test.js`+`guardian-fortune-generate.test.js`)를 재실행해 **56/56 통과**로 재확인했다.

## A~F mock 근거와 경계

- **A 입력·계산:** `deliverGuardianPaid`의 `contextBuilder`(기본값 `buildGuardianFortuneContext`)가 `calculated.context.availableSystems`를 원래 카테고리와 대조해 계산 근거 불일치 시 422로 거부함을 코드로 확인(`guardian-paid-delivery.js:34-37`). 실결제·실제 LLM 호출은 하지 않았다.
- **B 무료/유료 턴 경계:** 위 "대조 결과"에서 코드로 확정 — 비로그인 0회, 로그인 계정 총 1회, 이후 매 턴 50코인/5,000원. `worker/lib/guardian-fortune-usage.js`의 `reserveGuardianFortuneUsage`(guest_free → daily_free → paid 순서 시도, 소진된 예약 스윕 후 1회 재시도)를 읽어 순서를 확인했다.
- **C 생성:** 새로 주입하지 않음. 기존 `guardian-paid-delivery.test.js`의 저장 throw/null/낙관적 락 불일치(체크포인트·최종저장 각 3변형), 동시 중복 요청 시 클레임 공유, provider가 폴백/mock/무효 결과를 반환하면 3회 재시도 후 202로 거부(완료로 팔리지 않음), 결제 취소·타인 조회 차단, LLM 미설정 시 폴백 없이 503을 재실행해 재확인(위 56/56에 포함).
- **D 전달:** 이번 수정의 핵심. 신규 변이 테스트 1/1(수정 전 실패 → 수정 후 통과) + 기존 UI 회귀 26/26(`fortune-chat-storage.behavior.test.js`·`fortune-chat.static.test.js`·`guardian-fortune.static.test.js`·`guardian-paid-turn-recovery.test.js`, 무회귀, 합계 27/27) 재확인. **실제 브라우저 렌더(390/430px·데스크톱 화면 증거)는 이번 차례에도 만들지 않았다** — 함수 단위 행동 검사로만 확인했으며, 이전 모든 행과 동일한 경계다.
- **E 저장·권한:** 새로 주입하지 않음. `deliverGuardianPaid`의 결제 취소·타인 조회 차단 테스트(위 56/56에 포함) 재확인. 대화 이력(`fortune-chat.js`)은 결제 개념이 없는 별도 저장소이므로 이 축의 대상이 아니다.
- **F 재열람 예산:** 이번 행의 핵심 확인 대상. 별도 전후 호출 diff 스크립트는 새로 만들지 않았지만, 위 "대조 결과"의 호출 사슬 추적(`deliverGuardianPaid` → `runPaidNarrativeDelivery` GET 단락)으로 `produce`(LLM 생성)가 GET 경로에서 구조적으로 호출될 수 없음을 코드 레벨에서 확정했다 — 실행 로그 diff보다 강한 증거로 판단해 별도 스크립트를 생략했다(이전 행들과 다른 근거로 같은 경계에 도달).

이번 차례는 client-side 깨어남 복구 버그 재현·수정 1건, "무료 3회" 문서 드리프트 발견·보고 1건(코드는 정상, 문서만 낡음), F축 재열람 무과금을 실제 호출 사슬로 확정 1건, "품질 게이트 모킹" 함정 부정 확인 1건(8·14행과 달리 해당 없음), 별칭 테이블 없음 확인 1건에 한정했다. **D의 실제 화면 증거와 F의 전용 전후 diff 스크립트는 여전히 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정/신규 파일:

- 화면: `app/fortune-chat/FortuneChatClient.tsx` — 재개 effect에 `pageshow`/`focus` 추가.
- 행동 검사(신규): `__tests__/ui/fortune-chat-wake-recovery.behavior.test.js`.
- 검증 기록(신규): 이 문서.

```bash
node --test __tests__/ui/fortune-chat-wake-recovery.behavior.test.js __tests__/ui/fortune-chat-storage.behavior.test.js __tests__/ui/fortune-chat.static.test.js __tests__/ui/guardian-fortune.static.test.js __tests__/ui/guardian-paid-turn-recovery.test.js
node scripts/run-mock-tests.mjs jest --runInBand __tests__/worker/guardian-paid-delivery.test.js __tests__/worker/guardian-fortune-usage.test.js __tests__/worker/guardian-fortune-generate.test.js
npm run check:fast -- --plan
npm run check:fast
```

결과: UI 행동 검사 **27/27 통과**(신규 1 + 기존 26, 무회귀, 360ms). Worker jest 3개 스위트 **56/56 통과**(1.6초). `check:fast --plan`은 `FortuneChatClient.tsx`가 "shared UI/state/API/routing code"로 분류되어 critical 등급으로 자동 승격됨을 확인했다. `npm run check:fast`(critical tier 전체)는 `verify:doc-freshness`·`lint`·`verify:sitemap-drift`(추적본이 재생성 결과와 일치, URL 1,281개 — **사이트맵 재생성 불필요**, `npm run sitemap:generate` 별도 실행 없이 이 결과 자체로 확정)·`typecheck`·`test:node`(160+ 검사 전부 OK, `verify:staging-llm-mock`·`verify:analytics-events`·`verify:no-nested-retry`·`verify:worker-no-undef`·`verify:mongo-reset-callers`·`verify:cron-mongo-op-coverage`·`verify:admin-route-error-context` 포함)·`build:worker`(dry-run 성공)·`verify:entry-encoding --strict-core`(OK)를 전부 통과한 뒤 전체 Jest로 승격해 **281개 스위트 / 3,959개 테스트 전부 통과**(170.6초, 종료 코드 0)로 끝났다.

## 전달

워크트리 `change-20260918-144328`(base `17dda1b37c`)에서 2개 파일을 `9d74b3ee0`으로 커밋했다. `git fetch origin main` 결과 origin/main이 여전히 이 워크트리의 base(`17dda1b37c`)와 같아(다른 세션의 SEO P9 커밋은 메인 체크아웃에 로컬로만 존재하고 아직 push되지 않은 상태로 확인) 병합 없이 `git push origin wt/change-20260918-144328:main`으로 fast-forward push했다(`17dda1b37c..9d74b3ee0`).

**CI 확인(`9d74b3ee0`):** [체크런](https://github.com/rei1237/codedestiny/commit/9d74b3ee0/checks)을 `gh api`로 전수 조회했다. 비동기 `Deploy staging`(대기 대상 아님, 확인 시점 진행 중) 1건을 제외한 20개 체크런 중 `CI required`·`Static guards`·`Critical checks`·`Typecheck and lint`·`Build Pages and Worker`·`Risk tier`·`Main drift`·`gitleaks`·`AI locale pipeline invariants` 포함 13개 success·7개 skipped(스테이징/릴리스/롤백 조건부 매트릭스 잡, 경로 미해당)·실패 0을 확인했다.

🔴 **커밋 `9d74b3ee0`에 `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` 트레일러가 빠졌다.** 이미 `origin/main`에 push되고 CI가 그 SHA로 통과한 뒤 발견해, main 직접 개발 규칙(강제 push·히스토리 재작성 금지)에 따라 `commit --amend`로 고치지 않고 이 사실만 기록한다. 이후 커밋(이 문서 커밋 포함)부터는 트레일러를 포함한다.
