# 사주 전문가 상담 결과 생성 유료 전달 검증 — 2026-09-18

대상은 재검증표 18행(`saju_ai_question_prompt`, "사주 전문가 상담 결과 생성")이다. 인수인계 문서가 정본으로 지목한 `worker/routes/fortune.js`는 17행과 마찬가지로 여러 상품이 섞인 공유 라우트 파일이며, 이 행의 실제 로직은 전용 lib 파일 [`worker/lib/saju-ai-prompt.js`](../../worker/lib/saju-ai-prompt.js)(프롬프트 조립·`validateSajuMyeongsikTenGodText` 등)와 `fortune.js` 안의 `handleSajuAIPrompt`/`beginSajuAIConsultationGeneratingRecord`/`saveSajuAIConsultationResultRecord` 등 사주 전용 함수군에 있다. **클라이언트 화면 진입점은 이번 세션에서 확정했다** — 인수인계가 "grep으로 못 찾았다"고 남긴 것과 달리, `app/**`가 아니라 정적 셸 쪽 [`js/saju-engine.js`](../../js/saju-engine.js)의 `_bindSajuQuestionPromptCard`(7843~9566행)이 실제 화면 바인딩이다. `app/_lib/billing-client.ts`에서 걸렸던 리터럴은 다수 상품이 공유하는 청구 클라이언트 참조일 뿐 전용 화면이 아니었다. 이 파일은 `sync:public`으로 `public/js/saju-engine.js`에 바이트 동일하게 미러된다.

## 발견과 수정

`_bindSajuQuestionPromptCard`의 대기 작업 재개 장치(`activePendingJob`·`isLoading`·`resumePendingJob()`·`pollPendingJob()`)가 정의된 전체 구간(7843~9566행)을 `addEventListener` 기준으로 전수 확인한 결과 `pageshow`·`focus`·`online`·`visibilitychange` 리스너가 **하나도 없었다** — 5~17행에서 14번째로 반복되는 동일 결함 클래스다.

다만 이 화면은 형제 카드(`_cdMountQuestionRecovery` 계열)와 다른 계약을 갖고 있다. 마운트 시 초기화 코드(8585~8623행)는 로컬 저장소 복원이든 서버 발견이든 항상 재개 버튼과 안내 문구("이전 상담문이 있어요...")만 노출하고 **명시적 클릭 전에는 자동으로 이어받지 않는다** — 의도된 UX다. 형제 계열의 "마운트·깨어남에 동일하게 발화" 관례를 기계적으로 복사했다면 이 계약이 새로고침마다 자동 이어받기로 깨졌을 것이므로, 그 방식은 채택하지 않았다.

**수정(8481~8489행):** 기존 `resumePendingJob()`을 재사용하는 `resumeOnWake` 함수를 추가하고 4개 리스너를 등록했다.

```js
function resumeOnWake(event) {
  if (event && event.type === 'pageshow' && !event.persisted) return;
  if (!activePendingJob || isLoading) return;
  resumePendingJob();
}
window.addEventListener('pageshow', resumeOnWake);
window.addEventListener('focus', resumeOnWake);
window.addEventListener('online', resumeOnWake);
document.addEventListener('visibilitychange', function() { if (!document.hidden) resumeOnWake(); });
```

`pageshow`는 새로고침을 포함한 모든 페이지 로드에서 발생하므로 `event.persisted`(진짜 bfcache 복귀)로만 좁혀 마운트 시 "눌러서 이어보기" 계약을 새로고침마다 깨지 않게 했다. `focus`·`online`·`visibilitychange`는 진짜 상태 전환에서만 발생해 이 misfire 위험이 없다.

**재현·변이 검증:** `__tests__/ui/saju-paid-delivery.behavior.test.js`에 2건을 추가했다 — (1) `persisted:false` pageshow는 재개하지 않고 `persisted:true` pageshow만 재개하는지, (2) `focus`가 재개하는지. `git stash`로 수정 전 상태로 되돌려 두 신규 테스트가 `actual: [], expected: [{resumeJobId: 'job'}]`로 **실패**함을 확인한 뒤 `stash pop`으로 복원했다. `node --test __tests__/ui/saju-paid-delivery.behavior.test.js` 결과 기존 3건 + 신규 2건 **5/5 통과**.

수정 후 `node scripts/sync-legacy-static-to-public.mjs`로 `public/js/saju-engine.js`를 재동기화하고, 기존 회귀 가드 `node scripts/verify-saju-ai-consultation-recovery.mjs`(마지막 단언이 두 사본의 바이트 동일성을 확인)로 **PASS**를 재확인했다.

## 대조 결과

- **"같은 job" 의미 확정:** 재개는 새 생성 요청이 아니라 **같은 `jobId`/`PaidExecutionRecord`를 재사용**한다. 클라이언트는 재개 시 `{ resumeJobId: 'job' }`만 보낸다(신규 테스트로 확인). 서버는 `saju-paid-delivery-recovery.test.js`의 5단계 완성 테스트에서 동일 `requestId`로 5회 이어붙여도 매번 이전 단계까지의 십성 근거·완성된 챕터를 그대로 보존한 채 마지막 단계에서만 저장·완료로 표시함을 확인했다 — 새 실행을 만들지 않는다.
- **품질 게이트 전량 모킹 함정(8·14행 반복 패턴) — 해당 없음, 이번 세션에서 직접 재확인:** `saju-paid-delivery-recovery.test.js`는 `worker/lib/saju-ai-prompt.js`·`worker/lib/paid-report-quality.js`·`llm-result-delivery.js`의 `isCompleteLlmResponse`를 실제 모듈 그대로 import하고, `worker/routes/fortune.js`에서 `handleSajuAIPrompt` 등 26개 실제 함수/상수를 AST로 추출해 `vm.runInContext`로 그대로 실행한다. 모킹은 인프라 경계(가짜 `PaidExecutionRecord`, `callGeminiText`, `refundSajuAIPromptMonthlyCredit`)에만 한정된다. 이 파일 안에서 `validateSajuMyeongsikTenGodText`만 단순 스텁으로 대체돼 있으나, 별도 파일 `__tests__/worker/saju-ai-prompt-domain-templates.test.js`가 실제 함수를 직접 호출해 십성 불일치를 진짜로 검증함을 확인했다 — 테스트 책임 분담이지 게이트 우회가 아니다.
- **가격 정본:** `worker/lib/paid-feature-registry.js:306` `{ cost: 200, reason: "사주 전문가 상담 결과 생성" }` — 이 항목만 형제 항목들과 달리 `amountKRW` 필드가 명시돼 있지 않다. `docs/pricing/PRICING_AUDIT.md:131`의 "코인 200 = ₩20,000" 표에 `saju_ai_question_prompt`가 같은 티어의 다른 7개 상품(전부 `amountKRW:20000` 명시)과 함께 열거돼 있어 200코인=₩20,000임을 교차 확인했다(감사 문서의 줄 번호 인용 "(261)"은 레지스트리가 그 뒤로 자라며 낡은 것으로, 가격 값 자체의 드리프트는 아니다 — 사소해 별도 보고하지 않는다).
- **별칭 구조(16행과 다른 구조, 17행과 동일):** `paid-feature-registry.js:641` `"saju_ai_prompt_generator": "saju_ai_question_prompt"`는 형제 14개와 나란한 평범한 1:1 별칭이며, 530행은 단순 배열 멤버십이다. 16행 같은 별도 별칭 테이블 구조는 없다.
- **문서 드리프트 — 이번 행은 없음:** `docs/PAYMENT_AND_ACCESS.md`·`docs/FEATURE_MAP.md`를 `saju_ai_question_prompt`·"사주 전문가 상담" 기준으로 grep했으나(머지 후 재확인 포함) 이 상품에 대한 기재 자체가 없다 — 17행(가디언 "무료 3회" 낡음)과 달리 대조할 대상이 없어 드리프트도 없다.

## A~F mock 근거와 경계

- **A 구매 내성:** `saju-paid-delivery-recovery.test.js`의 동일 `requestId` 중복 제출 단일 클레임 거부 테스트, 레지스트리 가격 확인(위).
- **B 생성·품질 계약:** `describe.each(["pass","monthly","single"])` 5단계 테스트 — 매 단계 이전 챕터·십성 근거 보존, 마지막 단계에서만 `saved:true`+`status 200`. `paid-report-quality.js`의 `countPaidReportBodyChars`(≥20,000자)와 `isCompleteLlmResponse`, 그리고 별도 파일에서 실제 검증되는 `validateSajuMyeongsikTenGodText`(위)가 품질 게이트를 구성한다.
- **C 장애 주입:** 새로 주입하지 않음. 기존 `test.each(["checkpoint","null","final","confirm"])` 실패 모드(체크포인트·저장 null·최종 저장 실패·확정 실패) 재확인 + 분량 미달 응답 영구 미완성 테스트 + 19999/20000자 경계 테스트 — 전부 오탐 환불·거짓 완료 없음을 확인.
- **D 전달(이번 행의 핵심):** `resumeOnWake` 수정 + 신규 변이 테스트 2건(수정 전 실패 → 수정 후 통과) + 기존 UI 3건, 합계 **5/5 통과**. **실제 브라우저 렌더 화면 증거는 이번에도 없다** — 함수 단위 행동 검사로만 확인했으며 이전 모든 행과 동일한 경계다.
- **E 저장·권한·재열람:** 새로 주입하지 않음. `__tests__/fixtures/paid-completed-result-access-fixtures.mjs:17`(`isStoredPaidResultRevoked` 마커)에 `saju_ai_question_prompt`가 포함돼 공유 스위트 `paid-completed-result-access.test.js`로 커버됨을 확인, 재실행해 **96/96 통과**.
- **F 재열람 예산:** `saju-paid-delivery-recovery.test.js:150` `expect(h.charges.size).toBe(1)` — 동일 `requestId`로 5단계 생성(`h.calls` 길이 5, 매 단계 LLM 호출) 완료 후 추가로 1회 더 요청해도 `status 200`이면서 `h.calls`가 여전히 5(신규 LLM 호출 없음)이고 과금은 전체 6회 요청에 걸쳐 1회뿐임을 명시적으로 단언한다 — 17행처럼 별도 전후 diff 스크립트 없이 기존 테스트의 명시적 단언으로 대체했다.

이번 차례는 wake/resume 복구 결함 재현·수정 1건(14번째 반복, 형제와 다른 UX 계약을 보존하며 수정), 클라이언트 진입점 미확정 인수인계 해소 1건, "같은 job" 의미 확정 1건, "품질 게이트 모킹" 함정 부정 확인 1건, 가격·별칭 대조 확인 각 1건에 한정했다. **D의 실제 화면 증거와 F의 전용 전후 diff 스크립트는 여전히 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정/신규 파일:

- 화면: `js/saju-engine.js`(→ `public/js/saju-engine.js` 미러) — 재개 코드(8481~8489행)에 `pageshow`/`focus`/`online`/`visibilitychange` 추가.
- 행동 검사: `__tests__/ui/saju-paid-delivery.behavior.test.js` — 신규 2건.
- 검증 기록(신규): 이 문서.

```bash
node --test __tests__/ui/saju-paid-delivery.behavior.test.js
node scripts/sync-legacy-static-to-public.mjs
node scripts/verify-saju-ai-consultation-recovery.mjs
node scripts/run-mock-tests.mjs jest __tests__/worker/saju-paid-delivery-recovery.test.js __tests__/worker/saju-ai-prompt-domain-templates.test.js __tests__/worker/saju-ai-consultation-stale.guard.test.js __tests__/worker/saju-ai-prompt-advanced-factors.test.js --silent
node scripts/run-mock-tests.mjs jest __tests__/worker/paid-completed-result-access.test.js --silent
npm run check:fast   # 1차 — test:node 2건 실패(아래 원인)
npm run sitemap:generate
npm run sitemap:check
npm run sync:marketing-copy
npm run check:fast   # 2차 — 전부 통과
```

결과: UI 행동 검사 **5/5 통과**(신규 2 + 기존 3, 무회귀). 미러 동기화 후 회귀 가드 **PASS**. Worker jest 4개 스위트 **61/61 통과**, E축 공유 스위트 **96/96 통과**.

작업 도중 `origin/main`이 워크트리 기준 커밋보다 2개 앞서 있음을 발견했다(`1fd367afa` 법무 문서, `6b76c2f5a` 17행 `fortune-chat-consultation` 가격 5,000원→3,000원 정정 — 둘 다 이 행과 무관). 이 두 커밋이 나와 같은 정적 셸 미러 7개 파일을 함께 건드려 우연히 겹칠 수 있었으므로, 생성된 미러 사본을 먼저 되돌리고(`git checkout --`) `git pull --ff-only origin main`으로 병합 없이 앞당긴 뒤 `sync-legacy-static-to-public.mjs`를 다시 실행해 미러를 현재 병합 기준으로 새로 생성했다.

**1차 `npm run check:fast`가 실패했다** — `test:node` 안의 두 단언이 깨졌다:

1. `__tests__/release/sitemap-volatile-lastmod-kst.test.js`의 "주간 상세가 주 시작일을 쓰지 않습니다" — 원인: `js/saju-engine.js`(클라이언트 라우팅 코드) 수정이 추적본 `config/sitemap-lastmod.json`/`sitemap*.xml`을 낡게 만들었다. 같은 세션이 아닌 다른 워크트리의 `docs/payment/inicis-overseas-card/08-test-results.md`에 동일 패턴("결제 선택 스크립트의 핀을 돌리면서 라우트 서명이 바뀌었고, sitemap 추적본의 lastmod 가 재생성 결과와 어긋났다")이 이미 기록돼 있어 문구 회귀가 아님을 교차 확인했다. `npm run sitemap:generate`(1281 URL, lastmod 785개 중 갱신 53)로 수정, `npm run sitemap:check` → `OK — 추적본이 재생성 결과와 일치한다 (URL 1281개)`로 확정.
2. `lib/marketing/feature-marketing-copy.generated.json` 가 `index.html` 의 `FEATURE_MARKETING_COPY` 와 어긋난다는 단언(에러 메시지 자체가 `npm run sync:marketing-copy` 를 지시) — `git diff`로 실제 어긋난 내용을 확인한 결과 이 행의 변경이 아니라 이미 병합된 `6b76c2f5a`(가격 5,000원→3,000원)가 `index.html`의 인라인 마케팅 문안 블록을 바꾸면서 동기화 스크립트를 재실행하지 않은 것이 원인이었다(`"그 뒤로는 한 번 주고받을 때마다 5,000원이"` → `"...3,000원이"` diff로 확정). 이 행 자신의 결함이 아니라 이미 병합된 다른 커밋의 누락이므로, 게이트를 막고 있는 만큼 지정된 재생성 명령(`npm run sync:marketing-copy`)으로만 고치고 별도 수정은 하지 않았다.

**2차 `npm run check:fast`는 결제 인접 파일 변경으로 자동 승격된 lint·`verify:sitemap-drift`·typecheck·`test:node`·`build:worker`(dry-run)·`verify:entry-encoding --strict-core`를 전부 통과한 뒤 전체 Jest로 이어져 281개 스위트 / 3,959개 테스트 전부 통과(종료 코드 0)로 끝났다** — 1차와 동일한 테스트 총량이라 두 재생성이 새로운 회귀를 만들지 않았음을 확인했다.

## 전달

커밋 `f0f6588ff`(`resumeOnWake` 수정 + `public/js/saju-engine.js` 미러 + `sitemap:generate` 재생성분 25개 파일)와 `0c9d11ae5`(`lib/marketing/feature-marketing-copy.generated.json` 재생성 1개 파일, 원인은 이 행이 아니라 이미 병합된 `6b76c2f5a`의 `fortune-chat` 가격 5,000원→3,000원 변경이 `index.html` 인라인 마케팅 문안만 바꾸고 `sync:marketing-copy`를 재실행하지 않은 것)를 별도 커밋으로 나눠 워크트리에서 만들었다. `git fetch origin main`으로 origin/main이 이 워크트리의 병합 기준(`6b76c2f5a`)과 정확히 같음을 확인해 병합 없이 `git push origin HEAD:main`으로 fast-forward했다(`6b76c2f5a..0c9d11ae5`).

**push 후 `gh api repos/rei1237/codedestiny/commits/0c9d11ae5/check-runs`로 전수 조회한 결과 로컬 `check:fast`가 잡지 못한 CI 전용 실패 2건을 발견했다** — `CI required`(집계)·`Static guards`·`Main drift` 3건 failure, 나머지는 전부 success/skipped. 추정하지 않고 `gh run view --log-failed`/`gh api .../jobs/<id>`로 실패 스텝의 로그 전문을 직접 읽어 원인을 확정했다:

1. **`Static guards` / `verify:home-service-registry`:** 손수 관리하는 `js/core/service-registry.js`의 `fortune-chat` 타일이 `price: "5,000원"`으로 남아 결제 정본(`fortune-chat-consultation`, cost=30 → ₩3,000)과 불일치. 이 파일은 `worker/lib/paid-feature-registry.js`를 정본으로 교차 검증하는 fail-closed 가드([`scripts/verify-home-service-registry.mjs`](../../scripts/verify-home-service-registry.mjs))의 대상이지만 자동 재생성기가 없어 직접 손으로 고쳐야 하는 구조다. `6b76c2f5a`가 마케팅 카피는 재생성했지만 이 레지스트리는 누락한 것과 같은 뿌리 원인. `price: "3,000원"`으로 정정.
2. **`Main drift` / `verify:public-mirror-fresh`:** `index.html` + 로케일/정적 미러 6개(`public/{en,ja,zh,zh-tw}/index.html`·`public/index.html`·`public/static/index.html`)가 `scripts/sync-legacy-static-to-public.mjs`의 현재 출력보다 낡음. 원인은 순서 실수였다 — 병합 직후 한 번 `sync:public`을 돌렸으나 그 **다음에** `js/saju-engine.js`를 수정해 캐시버스터가 다시 낡아졌다. `sync:public`은 소스를 더 이상 안 고칠 마지막 단계로, 커밋 직전에 돌려야 한다는 교훈.

`npm run sync:public`(내부적으로 `sync-legacy-static-to-public.mjs` + `sync:marketing-copy` 순차 실행)을 재실행해 7개 미러 파일의 캐시버스터를 갱신하고, 방금 고친 `service-registry.js` 가격을 `public/js/core/service-registry.js`에도 반영했다. `lib/marketing/feature-marketing-copy.generated.json`은 diff에 나타나지 않아 새 마케팅 카피 드리프트가 생기지 않았음을 확인했다. 로컬에서 `npm run verify:home-service-registry`(OK) 재확인 후 `js/core/service-registry.js`+`public/js/core/service-registry.js`+미러 7개를 커밋 `a3e6651ec`로 묶어(로그가 명시한 "같은 커밋에 담을 것" 지시를 따름) `git push origin HEAD:main`으로 push했다(`0c9d11ae5..a3e6651ec`).

**재확인 결과 `Main drift`는 success로 전환했으나 `Static guards`·`CI required`는 여전히 failure였다.** `gh api repos/rei1237/codedestiny/commits/a3e6651ec/check-runs`로 실패한 잡 ID를 특정한 뒤 `gh run view --job=105535137419 --log-failed`로 로그 전문을 다시 읽었다 — 이번엔 `verify:home-service-registry`가 아니라 **완전히 다른 스텝**("Verify handoff frontmatter contract", `npm run verify:handoff-contract`)이 실패하고 있었다:

```
[verify:handoff-contract] FAIL — 1건
  docs/handoff/2026-09-18-seo-p9-next-item.md  —  `status: completed` 는 허용값이 아니다 (active | blocked | done)
```

`git fetch origin main` + `git rev-parse`로 origin/main이 여전히 `a3e6651ec`(로컬 HEAD와 동일)임을 확인해 동시 편집이 아님을 배제한 뒤, `git log --oneline -- docs/handoff/2026-09-18-seo-p9-next-item.md`로 도입 커밋 `f5914285d`를 찾고 `git merge-base --is-ancestor f5914285d 6b76c2f5a`·`git merge-base --is-ancestor f5914285d 0c9d11ae5`를 각각 실행해 둘 다 `yes`(exit 0)를 확인했다 — **이 결함은 18행이 시작하기 전부터 있던, 18행과 무관한 선행 결함**이다(16행이 겪은 것과 동일한 클래스: 다른 세션의 handoff 문서가 `status` 계약을 어겨 `Static guards`/`CI required`를 막음). 문서 본문이 "P9 완료"·다음 P10 문서로의 포인터로 이미 종료 상태를 서술하고 있어 16행 전례와 같은 논리로 `status: completed` → `status: done`(허용값이자 문서 의미와 일치)으로 교체하는 트리비얼 GREEN 수정을 적용했다. 이 파일 1개만 담아 커밋 `90960c74d`를 만들고, `git fetch origin main`으로 동시 편집이 없음을 재확인한 뒤 `git push origin HEAD:main`으로 push했다(`a3e6651ec..90960c74d`).

**최종 재확인:** `gh api repos/rei1237/codedestiny/commits/90960c74d/check-runs`를 전수 대기·조회한 결과 `CI required`·`Static guards`·`Main drift`·`gitleaks`·`Risk tier` 등 10개 success, `Typecheck and lint`·`Build Pages and Worker`·`Critical checks` 등 14개는 이 커밋이 문서 전용이라 조건부 스킵, 비동기 `Deploy staging` 1건만 조회 시점에 `in_progress`였으나 CLAUDE.md 정책상("스테이징은 main push마다 비동기로 배포된다... push마다 대기·확인하지 않는다") 대기 대상이 아니다. **실패 0건.**

이후 origin/main이 결제 체크아웃 기능 브랜치(`wt/inicis-overseas-card-p2-direct-legal-20260918-160111`)의 대규모 동시 작업(74개 파일 — 결제 체크아웃·`config/sitemap-lastmod.json`·다수 정적 미러·i18n JSON 등)으로 전진했다. `git diff --stat 90960c74d 317c0875a -- <18행 문서 3개 경로>`로 겹치는 경로가 없음을 먼저 확인한 뒤 `git merge origin/main`으로 병합했다(충돌 0건, 'ort' 전략). 병합에 RED 등급 결제 파일이 포함돼 안전장치로 `npm run sync:public`을 재실행(드리프트 없음, `git status --short` 빈 결과)하고 `npm run check:fast`를 다시 돌려 281 suite·3,960 test 전부 통과를 확인한 뒤 병합 커밋 `a73f3928a`를 push했다(`317c0875a..a73f3928a`).

**재확인 결과 `Static guards`·`CI required`가 다시 failure였다.** `gh api repos/rei1237/codedestiny/commits/a73f3928a.../check-runs`로 실패한 잡 ID(`105547283964`)를 특정한 뒤 `gh run view --job=105547283964 --log-failed`로 로그 전문을 읽었다:

```
로케일 텍스트 팽창에 취약한 지점이 있습니다:

  - js/core/checkout-entry.js: 127행 [input] 'fixed-height' 미분류 — 세로 고정 — 2줄이 되면 잘린다.
  - js/core/checkout-entry.js: 127행 [input] 'fixed-width' 미분류 — 가로 고정 — 넓어질 수 없다.
  - js/core/checkout-entry.js: 127행 [input] 'flex-rigid' 미분류 — 축소·확장 불가 — 형제와 같이 밀려난다.
```

`Static guards`의 `verify:locale-text-fit` 스텝이었다 — 병합 브랜치가 새로 추가한 [`js/core/checkout-entry.js`](../../js/core/checkout-entry.js)가 원인이라 18행 자신의 작업과는 무관했다. `git fetch origin main`으로 origin/main 최신 tip(`686c98ddf`, 같은 결제 세션이 그 사이 두 차례 더 병합)을 확인하고 그 tip의 `Static guards` 잡도 동일한 실패를 그대로 재현하는지 직접 재조회해 확정했다(같은 결함이 병합 이전부터 있었고 그 세션이 아직 고치지 않은 상태임을 실측으로 증명, 16행·`seo-p9`와 동일한 확인 방법론).

`grep -n '<input' js/core/checkout-entry.js`로 파일 안의 유일한 `<input>`이 `<input type="checkbox" data-refund-consent-input>`(환불·청약철회 동의 체크박스)임을 확인했고, 이를 스타일링하는 CSS 규칙(`.cd-direct-payment-consent input{flex:0 0 auto;width:16px;height:16px;...}`)이 세 위험(고정폭·고정높이·flex-rigid) 모두의 근원임을 로컬 재현(`node scripts/verify-locale-text-fit.mjs`)으로 확인했다. 체크박스는 채움 여부만 그릴 뿐 글자를 담지 않으므로 로케일 팽창과 무관한 안전한 케이스로 판단해, 결제 파일(`js/core/checkout-entry.js`)은 그대로 두고 가드 스크립트 [`scripts/verify-locale-text-fit.mjs`](../../scripts/verify-locale-text-fit.mjs)의 `ACCEPTED`에 `input|fixed-height`·`input|fixed-width`·`input|flex-rigid` 3건을 한국어 사유와 전제조건(`needs`: 해당 input이 계속 `type="checkbox"`인지 검사, 기존 결제창 예외 2건과 동일한 패턴)과 함께 등재했다. 로컬 재확인: 가드 재실행 통과(`Locale text fit OK — 위험 선언 47건 분류 완료`), `npm run check:fast` 281/281 suite·3,960/3,960 test 통과. `git fetch origin main`으로 동시 편집이 없음을 재확인한 뒤 이 파일 1개만 담은 커밋 `2f9047061`을 push했다(`686c98ddf..2f9047061`).

**최종 재확인(2회차):** `gh api repos/rei1237/codedestiny/commits/2f9047061/check-runs`를 전수 대기·조회한 결과 `CI required`·`Static guards`·`Main drift`·`gitleaks`·`Typecheck and lint`·`Build Pages and Worker`·`Deploy staging`·`Risk tier`·`AI locale pipeline invariants` 포함 전부 success, 나머지는 스킵. **실패 0건.**
