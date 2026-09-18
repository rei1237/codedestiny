# 점성술 AI 질문 프롬프트 생성 유료 전달 검증 — 2026-09-18

대상은 재검증표 19행(`astrology_ai_prompt_generator`, "점성술 AI 질문 프롬프트 생성")이다. 정본은 `worker/routes/fortune.js`의 `handleAstrologyAIPrompt`이며, 실제 전달 로직은 형제 3개 상품(ziwei/sukuyo/vedic)과 공유하는 [`worker/lib/feature-question-delivery.js`](../../worker/lib/feature-question-delivery.js)의 `deliverFeatureQuestion`/`readFeatureQuestionRequest`(더 깊은 공유 원시함수 `runPaidNarrativeDelivery`)에 있다. 클라이언트 진입점은 정적 셸 [`js/saju-engine.js`](../../js/saju-engine.js)의 `_astroMountPromptSection`(14605행)이 `_cdBindQuestionRecovery('astrology', ...)`(14622행)을 호출해, 같은 파일의 공유 함수 `_cdMountQuestionRecovery`/`_cdBindQuestionRecovery`(7235·7289행)로 복구를 위임하는 구조다. 이 함수는 ziwei(`js/saju-engine.js:21960`)·sukuyo(`js/saju-engine-tarot-sukuyo-quantum.js:16752`)도 그대로 호출한다.

## 발견과 수정

`_cdMountQuestionRecovery`(7235행)를 `addEventListener` 기준으로 전수 확인한 결과 `online`·`visibilitychange`만 구독하고 `pageshow`·`focus`는 **구독하지 않았다** — 5~18행에서 반복된 동일 결함 클래스의 15번째 반복이다.

이 화면은 마운트 시 이미 `recover()`를 1회 호출해 대기 결과를 자동으로 이어받는 계약이다(18행 사주 카드의 "눌러서 이어보기"와 달리 자동 재개). 그래서 `pageshow`를 무조건 구독하면 정상적인 모든 페이지 로드마다(`pageshow`는 새로고침을 포함해 `load` 뒤에 항상 발생) 마운트 시점 호출과 중복되는 재호출이 생긴다. `event.persisted`(진짜 bfcache 복귀)로만 좁히는 게이트를 적용했다 — 18행 `resumeOnWake`와 `destiny-profile.js`의 `dpCloseList()` 가드에 이미 쓰인 것과 같은 관례다.

**수정:** `_cdMountQuestionRecovery` 안에 `event.persisted !== true`면 반환하는 `onPageShow` 래퍼를 추가해 `pageshow`에 연결하고, 무조건 발화하는 `focus` 리스너를 추가했다. `stop()`이 두 리스너를 포함한 전체 구독을 해제하도록 갱신했다.

**재현·변이 검증:** `__tests__/ui/feature-question-recovery.behavior.test.js`에 3건을 추가했다 — `pageshow`(`persisted:false`)는 추가 호출을 만들지 않는지, `pageshow`(`persisted:true`)는 오프라인으로 중단된 전달을 재개하는지, `focus`도 동일하게 재개하는지. `git stash`로 수정 전 상태로 되돌려 확인한 결과, `persisted:true` 케이스와 `focus` 케이스 2건이 리스너 자체가 없어 `f.shown.at(-1).saved`가 끝내 `true`가 되지 못하고 **정확히 실패**했다(`persisted:false` 케이스는 리스너가 없으면 반복할 이벤트가 0건이라 수정 전에도 트리비얼하게 통과하므로 변이 신호가 아니다). `stash pop`으로 복원 후 `node --test __tests__/ui/feature-question-recovery.behavior.test.js` 결과 기존 7건 + 신규 3건 **10/10 통과**.

## 대조 결과

- **가격:** `worker/lib/paid-feature-registry.js:308` `{ cost: 100, reason: "점성술 AI 질문 프롬프트 생성" }`. `docs/pricing/PRICING_AUDIT.md:105-122`의 "코인 100 = ₩10,000" 표에 `astrology_ai_prompt_generator(263)`가 형제 `ziwei_ai_prompt_generator(262)`·`vedic_ai_prompt_generator(264)`·`sukuyo_ai_prompt_generator(265)`와 같은 줄에 열거돼 있어 100코인=₩10,000임을 교차 확인했다.
- **별칭 구조(17행과 동일, 16행과 다름):** `paid-feature-registry.js:546`은 단순 배열 멤버십이며 별도 별칭 테이블은 없다.
- **품질 게이트 전량 모킹 함정(8·14·18행 반복 패턴) — 이번에도 해당 없음:** `__tests__/worker/feature-question-paid-delivery.test.js`를 전체(79행) 재열람해 직접 확인했다 — `worker/routes/fortune.js`를 `ts.createSourceFile`로 파싱해 `handle{Kind}AIPrompt`(`Astrology`/`Vedic`/`Ziwei`/`Sukuyo`)의 실제 함수 본문을 `getText`로 추출한 뒤 `vm.runInContext`로 그대로 실행하고, `readFeatureQuestionRequest`/`deliverFeatureQuestion`도 실제 모듈에서 그대로 import한다. 모킹은 인프라 경계(`connectDb`·`requireAuth`·Mongo 모델 셈·`callGeminiText`)에만 한정된다.
- **형제 상품 영향:** ziwei·sukuyo는 `_cdMountQuestionRecovery`를 그대로 호출해(위 grep) 이번 수정의 혜택을 자동으로 받지만, 각 행은 여전히 독립적인 A~F 검증이 필요하다(공유 함수 수정이 곧 검증 완료를 의미하지 않음). vedic은 `_cdMountQuestionRecovery`/`_cdBindQuestionRecovery` 참조가 0건이라(grep 전수 확인) 이번 수정과 무관하며, `vedic-astrology.html`에 별도 구현을 갖고 있어 22행에서 독립적으로 다뤄야 한다.

## A~F mock 근거와 경계

- **A 구매 내성:** `feature-question-paid-delivery.test.js:77` `'rejected access, wrong owner and revocation prevent provider calls'` — 미결제(402류)·소유자 불일치·권한 취소 3개 경로 모두 provider(LLM) 호출이 발생하지 않음을 확인.
- **B 생성·품질 계약:** 같은 파일 74~76행 `test.each(['short','hash','claim','truncated'])('%s cannot complete a paid report', ...)` — 분량 미달·`evidenceHash` 불일치·클레임 값 오류·truncated 플래그 4가지 모두 완료를 막고, 중간 상태 `Object.keys(docs[0].metadata.paidNarrative.parts)).toHaveLength(3)`로 부분 진행이 보존됨을 확인한 뒤 정상 재시도로 `provider` 호출이 11회에서 완료됨을 확인.
- **C 장애 주입:** 72행 `test.each(['throw','null','confirm'])('final save %s preserves paid body and restores without another generation', ...)`(최종 저장 단계 장애 3건) + 73행 동일 축의 체크포인트 단계 장애 3건(provider 호출 전에 중단) + 79행 `test.each(['monthly','single','pass'])('exhausted %s refund runs once despite a repeated request', ...)`(소진 후 환불이 반복 요청에도 1회만 실행됨 3건).
- **D 전달(이번 행의 핵심):** `_cdMountQuestionRecovery` 수정 + `__tests__/ui/feature-question-recovery.behavior.test.js` 신규 3건 + 기존 7건, 합계 **10/10 통과**. 변이 검증(수정 전 stash)으로 신규 3건 중 실질 신호가 있는 2건이 정확히 실패함을 확인(위 "발견과 수정" 절). **실제 브라우저 렌더 화면 증거는 이번에도 없다** — 5~18행과 동일한 경계.
- **E 저장·권한·재열람:** `__tests__/fixtures/paid-completed-result-access-fixtures.mjs:18`에 `astrology_ai_prompt_generator`가 ziwei·sukuyo·vedic과 함께 `runPaidNarrativeDelivery` 마커로 등록돼 있어 공유 스위트 `paid-completed-result-access.test.js`로 커버됨을 확인.
- **F 재열람 예산("계산 사실·같은 질문 결과" — 이번 행의 보존할 특성 그 자체):** `feature-question-paid-delivery.test.js:68` `test.each([...4개 kind × 3개 access mode])('%s %s confirms ten parts and reopens without another generation', ...)`의 Astrology 조합 — 10개 파트 완료(`provider` 호출 10회) 후 같은 요청을 다시 열어도(`start()` 재호출) `status 200`이며 `provider` 호출은 여전히 10회(재호출 없음), `refund`도 호출되지 않음을 명시적으로 단언. 78행 `'same input key cannot substitute new calculations'`는 같은 `requestId`로 질문만 바꿔 보내면 `409`로 거부되고 `provider` 호출이 4회에서 멈춰 있음을 확인 — "계산 사실"이 같은 요청 키로 대체될 수 없음을 직접 증명한다.

이번 차례는 wake/resume 복구 결함 재현·수정 1건(15번째 반복), "품질 게이트 모킹" 함정 부정 재확인 1건, 형제 3개 상품(ziwei/sukuyo 혜택 확인·vedic 무관 확정) 대조 1건, 가격·별칭 대조 확인 각 1건에 한정했다. 백엔드 코드(`worker/routes/fortune.js`·`worker/lib/feature-question-delivery.js`)는 이번 행에서 수정하지 않았다 — 공유 worker 테스트 27/27은 회귀 없음의 재확인이다. **D의 실제 화면 증거는 여전히 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정/신규 파일:

- 화면: `js/saju-engine.js`(→ `public/js/saju-engine.js` 미러) — `_cdMountQuestionRecovery`(7235행)에 `pageshow`(persisted 게이트)·`focus` 추가.
- 행동 검사: `__tests__/ui/feature-question-recovery.behavior.test.js` — 신규 3건.
- 검증 기록(신규): 이 문서, `docs/verification/paid-llm-service-checklist-20260916.md` 19행.

```bash
node --test __tests__/ui/feature-question-recovery.behavior.test.js
node scripts/sync-legacy-static-to-public.mjs
node scripts/run-mock-tests.mjs jest __tests__/worker/feature-question-paid-delivery.test.js --silent
node scripts/run-mock-tests.mjs jest __tests__/worker/paid-completed-result-access.test.js --silent
npm run check:fast
```

결과: UI 행동 검사 **10/10 통과**(신규 3 + 기존 7, 무회귀). Worker jest **27/27 통과**(4개 형제 상품 × 여러 축, 무회귀). `check:fast`가 결제 인접 변경으로 자동 승격돼 전체 Jest로 이어졌고 **281 suite / 3,966 test 전부 통과**(종료 코드 0).

## 전달

커밋 `3302ad453`(`_cdMountQuestionRecovery` 수정 + `public/js/saju-engine.js` 미러 + UI 테스트 3건)을 워크트리에서 만들었다. `git fetch origin main` 결과 origin/main이 2커밋 앞서 있어(`a1659212c` tip) `git rebase origin/main`으로 앞당긴 뒤 `ed0444a89`로 `git push origin HEAD:main`(`a1659212c..ed0444a89`)했다.

**push 후 `gh api repos/rei1237/codedestiny/commits/ed0444a89/check-runs`로 확인한 결과 `CI required`·`Static guards`·`Main drift` 3건이 failure였다.** `gh run view --log-failed`로 로그 전문을 읽어 둘 다(`Main drift`·`Static guards`) 동일한 `verify:public-mirror-fresh` 실패임을 확인했다 — 워크트리 rebase 직후 미러 7개(`index.html` + `public/*` 6개)의 캐시버스터가 재차 낡아진 것으로, 메모리 `worktree-merge-restales-mirrors.md`와 18행 자신의 선례([`saju-ai-prompt-paid-delivery-20260918.md`](saju-ai-prompt-paid-delivery-20260918.md) "전달" 절 2번)가 이미 기록한 원인과 동일했다.

`npm run sync:public`을 출력이 더 이상 바뀌지 않을 때까지 3회 반복 실행해 고정점을 확인(스테이징 후 추가 diff 0건)하고, 내용이 캐시버스터 해시 변경뿐임을 diff로 확인한 뒤 커밋 `fe76fbc2d`로 push했다(`ed0444a89..fe76fbc2d`).

**최종 재확인:** `CI required`·`Static guards`·`Main drift`·`gitleaks`·`Typecheck and lint`·`Risk tier`·`scope`·`AI locale pipeline invariants`·`Registered business details are verbatim`·`Deploy staging` 포함 전부 success, 나머지는 문서·미러 전용 커밋이라 조건부 skip. **실패 0건.**
