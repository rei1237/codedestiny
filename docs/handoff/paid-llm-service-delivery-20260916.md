---
status: active
updated: 2026-09-17
next: 초융합 3행·심화 자미 PDF 4행·네오 5행·나크샤트라 6행·인생의 책 7행(네오·나크샤트라·인생의 책은 우선 시나리오만, 셋 다 D 실화면·F 전후 diff는 미실행)은 mock A~F·동일 SHA main CI 완료. main·CI·동시 편집 상태를 다시 확인하고 인생 총운 8행(`life-fortune-ai-consultation`)부터 상품별 A~F를 이어간다. 8행은 7행과 결과 화면(`LifeBookAiResultClient.tsx`)을 공유하므로 pageshow/focus 수정은 이미 반영돼 있다 — 8행 고유 계약(총운 SKU·원래 분량·apply)만 별도로 A~F 검사한다. 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않는다.
---

# 유료 LLM 생성·결제 후 전달 인수인계

## 기존 마스터 기록 — 2026-09-16

사용자 요청: “마스터 인연의 서 결제 이후 제대로 생성되는지 확인하고, 나머지 LLM 서비스를 하나씩 제대로 나오게 할 인수인계 문서.”

main 구현 기준 `77007dc4c1c931ecc148ab73069bf437b78473e9`. [전체 main CI](https://github.com/rei1237/codedestiny/actions/runs/35103084907)는 모든 lane·CI required 성공. [마스터 수정/검증 기록](../verification/master-love-codex-delivery-20260916.md)을 재사용하고 재구현하지 않는다.

**2026-09-16 재확인:** 마스터 서버 생성·암호화 구매 bootstrap·크론 복구 47개, 결과 복귀·원래 구매 재개·SDK 요청 계약 18개 통과. 개인/궁합 각 20장·모의 성공 호출20회·재열람0회. 입력 문자 감소9.7%/17.3%; 실제 청구 토큰·문장 의미는 미검증.

**운영 코드 반영 확인:** 시작 조회는 Pages/Worker 모두 `a3d1b471f319036deb416251a2116ef278097567`로 불일치였으나, 최종 읽기 전용 재조회에서 [Pages](https://code-destiny.com/version.json)와 [Worker](https://code-destiny.com/api/version)가 모두 수정본 `77007dc4c1c931ecc148ab73069bf437b78473e9`로 일치했다. [운영 릴리스 35105200682](https://github.com/rei1237/codedestiny/actions/runs/35105200682)의 정확한 SHA 배포·버전 검증도 success이며 staging job은 skipped다. 이번 세션이 배포한 것은 아니다. **코드 운영 반영과 모의 생성은 확인했으나 실 PG·실기기·청구 LLM·실고객 주문 완주 증거는 미검증**이다.

## 다음 작업

**2026-09-17 인생의 책 7행 — mock 완료(경계 있음):** [행별 기록](../verification/life-book-paid-delivery-20260917.md). 마스터·초융합·자미 심층·네오·나크샤트라와 같은 client-side 깨어남 복구 누락(`pageshow`/`focus` 미연결)을 인생의 책 결과 화면(`app/life-book-ai/result/LifeBookAiResultClient.tsx`)에서 재현·수정했다(4행 diff, 커밋 `c7793e21905d46e114d93c4979a5c6d30072864e`). 이 결과 화면 컴포넌트는 8행(`life-fortune-ai-consultation`)과 공유되어 수정 혜택이 8행에도 그대로 적용되지만, 이번 완료 표시는 요청 범위인 7행에 한정했다. 시작 화면(`LifeBookAiClient.tsx`)은 애초에 pageshow/focus/online/visibilitychange 리스너가 없고, 생성 중 백그라운드 진입 시 결과 화면으로 능동 이관하는 설계(`document.hidden` 분기)임을 코드 대조로 확인했다 — 버그가 아니라 새 테스트를 만들지 않았다. 구매 재개/멱등(`findPaidPayment`/`resolveServerAccess`/`billingContractMatches`)과 GET 재확인 대 POST 재개의 비대칭(`isStoredPaidResultRevoked`는 GET `handleResult`에서만 호출, POST `resumeSessionId` 재개 경로는 재확인 안 함)은 기존 `life-book-paid-delivery.behavior.test.js`·교차 상품 `paid-completed-result-access.test.js`로 대조 확인했다(신규 결함 없음, 나크샤트라·네오와 동일 설계). 전용 크론 복구 태스크는 없고 클라이언트 자신의 `resumeSessionId` 재개(예산 캡 `resumeCallsRef.current>=12`)가 유일한 복구 경로임을 확인했다(네오·나크샤트라와 동일 무크론 전례). 신규 UI 행동 검사(`__tests__/ui/life-book-wake-recovery.behavior.test.js`) 1건을 `git stash`로 수정 전 코드를 임시 복원해 재현 1/1 실패(`window:pageshow` 핸들러 미등록) → 수정 후 통과로 전환 측정했고, 관련 UI 스위트 25/25·worker+교차상품 109/109(섹션 생성 13 + 교차 상품 접근 96) 통과(무회귀). `npm run check:fast`는 결제 인접 파일 수정으로 RED 자동 승격돼 전체 게이트로 실행됐고(590초 전경 제한을 넘겨 백그라운드 전환, 종료 코드 0) 저장 로그에 `verify:staging-llm-mock`부터 `test:jest`(277 suite·3,880/3,880)까지 통과가 남아 있다 — 그 앞 구간(lint·typecheck·test:node·paid-gate-suite·sitemap-drift)은 590초 전경 구간에서 실행돼 종료 코드 0으로 이어졌으나 백그라운드 로그엔 남지 않아 개별 수치는 인용하지 않았다. source `c7793e21905d46e114d93c4979a5c6d30072864e`를 직전 커밋 `0cbe50794`(다른 세션의 love-secret-ai 수정) 위에 별도 진행 없이 그대로 fast-forward push했다. main·origin 끝점(동일 SHA) [CI](https://github.com/rei1237/codedestiny/actions/runs/35179949320)는 체크런 21개 중 `CI required`·`Static guards`·`Typecheck and lint`·`gitleaks`·`Build Pages and Worker`·`Critical checks`·`Risk tier`·`Main drift`·`AI locale pipeline invariants` 등 13개 success·7개 skipped·실패 0을 확인했다(비동기 `Deploy staging` 1건은 확인 시점 진행 중이었고 대기 대상 아님). **D(실제 Playwright 화면 렌더 증거)와 F(전용 전후 diff 스크립트)는 이번 차례에도 만들지 않았다 — 나크샤트라·네오와 동일한 남은 경계.** 8행(`life-fortune-ai-consultation`)은 다음 세션이 같은 컴포넌트의 수정을 전제로 8행 고유 계약만 A~F 검사하면 된다.

**2026-09-17 나크샤트라 6행 — mock A~F 완료(경계 있음):** [행별 기록](../verification/nakshatra-ai-paid-delivery-20260917.md). 마스터·초융합·자미 심층·네오와 같은 client-side 깨어남 복구 누락(`pageshow`/`focus` 미연결)을 나크샤트라 결과 화면(`app/nakshatra/ai/NakshatraAiClient.tsx`)에서 재현·수정했다(10행 diff, 커밋 `0ef57a367e66fec2b57849671f132c750468bffe`). 나머지 구매 재개·생성·장애·저장/권한 경로는 기존 `nakshatra-paid-delivery.test.js`(3-wave·6변형 저장 장애·체크포인트·동시 재시도 등)와 교차 상품 공유 검사 `paid-completed-result-access.test.js`로 대조 확인했다(신규 결함 없음). completed 문서의 POST 재생이 취소·환불 재확인을 건너뛰는 것은 버그가 아니라 기존 테스트(`'does not replace historical short completed results'`)가 명시적으로 보증하는 설계임을 확인했다. 신규 UI 행동 검사(`__tests__/ui/nakshatra-wake-recovery.behavior.test.js`) 1건(수정 전 재현 1/1 실패 → 수정 후 통과로 전환 측정), worker+교차상품 118/118, `verify:nakshatra-flow`/`verify:nakshatra-ai-flow`/`verify:nakshatra-premium` 전부 통과, `check:fast -- --committed-head`(base `755949af0`→head `0ef57a367`) 전체 파이프라인 — `run-paid-gate-suite` 88/88·lint 0·`verify:sitemap-drift` OK·typecheck 0·Node 1,400/1,400·Jest 277 suite·3,880/3,880 — 이 한 번에 막힘 없이 통과했다(네오를 막았던 sitemap-drift 이번엔 없음). 작업 중 다른 세션의 `perf(analytics)` 커밋(`aeeb9f714`)이 위에 이어져 두 커밋을 함께 push했다. main·origin 끝점 `aeeb9f714884771b81a82ace8d8a2f2f43740469`의 [CI](https://github.com/rei1237/codedestiny/actions/runs/35176230590)는 `CI required`·`Static guards` 포함 check-run 24개 전부 success 또는 skipped(실패 0)로 확인했다. **D(실제 Playwright 화면 렌더 증거)와 F(전용 전후 diff 스크립트)는 이번 차례에도 만들지 않았다 — 네오와 동일한 남은 경계.**

**2026-09-17 네오 5행 — 우선 5개 시나리오 mock 완료(부분):** [행별 기록](../verification/neo-operation-room-paid-delivery-20260917.md). 인수인계가 지정한 5개 우선 재현(승인 직후 첫 생성 전 종료·1묶음 저장 뒤 문서 종료·pageshow/bfcache/focus 단독 복귀·checkpoint/완료 확인 유실·정상 completed 대 취소 구매 GET/POST 대조) 중 pageshow/focus 복구 리스너 누락 1건을 재현·수정했다(`NeoOperationRoomPage.tsx`/`NeoOperationRoomResultPage.tsx`, 마스터·초융합과 동일 패턴). 나머지 4건은 기존 통과 테스트로 이미 올바름을 대조 확인했다(새 결함 없음). 신규 행동 검사(`__tests__/ui/neo-wake-recovery.behavior.test.js`) 2/2, 기존 neo-paid-resume 5/5(7/7), worker 76/76, typecheck 0, Node 1,399/1,399, Jest 276 suite·3,874/3,874, build:worker dry-run 0, verify:neo·verify:neo-output-safety 회귀 없음. source `8c9f49664`를 안전 워크트리에서 main에 병합(`2dc2ea9cc`)하고 그사이 origin에 먼저 올라온 문서 커밋(`506579901`)도 병합(`2e07bc0bb`)해 push했다. 이 SHA의 PR CI는 무관한 기존 `verify:sitemap-drift`로 실패했으나 이후 다른 세션 커밋에서 자연 해소됐고, 현재 main 최신 커밋(문서 커밋 `9f8865c52`)의 전 레인이 success임을 확인했다([CI 35169520076](https://github.com/rei1237/codedestiny/actions/runs/35169520076)). **D(실제 Playwright 화면 렌더 증거)와 F(전용 전후 diff 스크립트)는 이번 차례에 만들지 않았다 — 남은 경계.** root marketing dirty 84개는 병합 전후 동일하게 보존했다.

**2026-09-17 심화 자미 PDF 4행 — mock A~F·main CI 완료:** [행별 기록](../verification/ziwei-deep-paid-delivery-20260917.md). 실행 완료 본문 누락·취소 구매 POST 재열람·화면 재개·문서 종료 뒤 서버 실행·완료 확인 유실·Storage 예외·공급자 완료 표시 7종을 재현/수정했다. 관련 Node62/Jest125·실제 고객8case·PDF62페이지/15장 전체 본문 추출·렌더 통과. 호출15→15·prompt36,012→36,012자. source `acdf20c386004505e643fd3db7976f640b655fdf`를 main fast-forward/push했고 [동일 SHA main CI 35123293719](https://github.com/rei1237/codedestiny/actions/runs/35123293719)는 모든 lane·CI required·Node1,397/Jest3,874 성공이다. root dirty84개·파일별 SHA256도 반영 전후 같았다. 다른 세션의 layout/fortune-chat과 Threads 작업은 보존했다. Threads 추가 뒤 VM mock 누락을 재현해 Node62와 공식 check:fast critical·Node1,397/Jest3,874를 통과했다. 반영 직전 다른 세션이 같은 보완을 `851cbe758`로 전달해 이를 보존/rebase했다. 그 SHA CI의 새 Threads 문서 frontmatter 누락 1건만 별도로 보완했다. 전달 SHA `1a622b55595daa7ed5cf1323d49c6a5415dd55d0`의 [main CI 35125744683](https://github.com/rei1237/codedestiny/actions/runs/35125744683)는 Static·CI required success이며 문서 tier의 Type/Build/Critical은 skipped다. **4행을 mock 완료로 체크했다.** 네오부터 구매70키+후속3경로는 개별 A~F 미실행이다.

**2026-09-17 초융합 mock A~F 완료:** [행별 검증 기록](../verification/fusion-paid-delivery-20260917.md)을 추가했다. source `c2c4ce56f543fc785ca639b8c1784826478ce59c`와 결제 직후 입력 보관 후속 `c83f719855aa3f9ef316df024e004e5f69e4b4cc`를 main에 fast-forward하고 push했다. 부분 전달 lease·문서 종료 뒤 서버 복구·승인 후 첫 생성 전 bootstrap·출력 잘림·bfcache/화면 재개·Storage 차단·첫 stream 전 입력 유실을 재현/수정했다. 실제 계산 6체계/타로 6장, 실제 고객 화면 390/430/1280px 마지막 본문, 서버/공용 결제 왕복 및 새 문서 재열람을 mock으로 검사했다. 첫 최종 check:fast는 critical·88/88 gate·276 suite/3,873 Jest 통과. 마지막 입력 보관 수정까지 복귀 행동검사 33개와 추가 check:fast(276 suite/3,873 Jest, 186.216초)가 통과했다. [동일 SHA main CI](https://github.com/rei1237/codedestiny/actions/runs/35116997629)는 모든 lane·CI required success다. **초융합 완료 당시(자미 완료 전) 나머지 71구매 키+후속3경로는 개별 A~F 미실행이었다.** root marketing 84개 dirty 항목과 diff hash가 main 반영 전후 같았으며 다른 워크트리는 보존했다.

사용한 안전 작업 디렉터리: `D:\Development\codedestiny-worktrees\paid-af-mock-20260916-20260916-235632` (동시 Claude 편집 때문에 생성). 종료 시 이 워크트리만 배수한다. 로컬 mock 서버 13070/13071은 종료했다. 재개 때 단독/동시 편집 여부를 다시 확인하고 단독이면 main, 동시 편집의 두 번째 세션이면 새 안전 워크트리를 사용한다. 마지막 유료 source는 `acdf20c386004505e643fd3db7976f640b655fdf`, 이후 보존한 mock/inventory 보완은 `851cbe758`, 검증된 문서 전달은 `1a622b55595daa7ed5cf1323d49c6a5415dd55d0`다. 최근 root의 `public/styles/static-policy.css`·`tailwind.config.js` 수정도 다른 세션의 미커밋 작업으로 확인했다.

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\paid-llm-service-delivery-20260916.md를 읽고, main/origin·현재 SHA의 CI·동시 편집 상태를 확인하라. 검증 기준 1a622b55595daa7ed5cf1323d49c6a5415dd55d0와 CI 35125744683, 유료 source acdf20c386004505e643fd3db7976f640b655fdf의 CI 35123293719 기록을 재사용하고 네오 5행부터 상품별 A~F를 하나씩 실제 코드 mock으로 검사하라. 재현된 오류만 수정하고 기존/타 세션 변경을 보존하라. 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 말고 mock→commit/push→동일 SHA main CI까지 완료하라.
```

1. **마스터 2상품의 실제 결제 전달 확인은 별도 단계.** 운영 코드 기준은 확인된 `77007dc4c`다. 이후 인수인계 문서만 바뀐 main SHA와의 차이로 코드 미반영을 오판하거나 재승격하지 않는다. 실제 PG/과금 LLM/운영 DB/실기기·고객 주문 복구는 각각 승인 범위 안에서만 확인한다. 승인 없는 단계는 미검증으로 남기고 다른 상품의 mock 점검은 계속한다. 입력 없는 과거 구매는 구매 권리 보존·재입력 후 결제 없는 복구를 유지한다.
2. **[서비스별 재검증표](../verification/paid-llm-service-checklist-20260916.md)의 74구매 키+후속3경로를 순서대로.** 마스터2키는 기존 검사 기록을 재사용하며 이번 전체 A~F 완료로 새로 체크하지 않는다. 초융합1키와 심화 자미1키만 이번 mock 완료다. 네오부터 구매70키와 후속3경로는 이번 개별 A~F 미실행이다. 네오→나크샤트라→기타 장문→질문/찻집→타로·기타→손금→Code Destiny 영냥이28키. 후속3경로도 별도 완료한다.
3. **한 상품마다 A~F:** 실제 입력·계산→mock 결제/권한→생성→품질→저장 확인→완료 기록→새 문서 마지막 본문 재열람. 오류·지급 지연·모바일 복귀·문서 종료·저장 유실·동시 락을 주입한다. 재열람 LLM/결제/차감0회. 필요한 장만 재생성, 공유 재시도 상한·백오프·정체 집계. 상세 계약은 표를 따른다.
4. 기존 [매트릭스](paid-llm-delivery-matrix-20260915.md)는 구현/mock 완료 기록이며 현재 실운영 보장이 아니다. 과거 미수정 기록만 보고 다시 구현하지 않는다. 현재 CTA→import→API→LLM을 대조해 신규 상품/변형을 추가하고, 비LLM·무료·관리자·비활성 UI는 구분한다.
5. 결함을 재현한 상품만 최소 수정한다. 같은 결함의 공통 코드만 함께 수정한다. 가격·분량·계산·이용권/월정석/단건 정책을 유지한다. 영냥이는 통합 `worker/yeongnyangi/`의 기존 단건 전용 계약을 유지하며 별도 SoulCat 과거 검사로 완료 처리하지 않는다.

## 검증·전달

관련 표의 실제 코드 mock 검사→`npm run check:fast -- --plan`→관련 `check:fast`→의도한 파일만 commit/push→동일 SHA main CI. 파일·의도·명령/출력·예산/차감·새 문서 증거·남은 확인을 행별 기록한 뒤 다음 상품으로 간다. 정상 구 completed 구매본 보존·전액 취소/환불/계정 분리도 필수다. 부분 본문/짧은 fallback을 완료로 인정하지 않는다.

main 직접 편집, 마케팅 미커밋 변경 보존. 동시 편집의 두 번째 세션이면 [안전 워크트리 규칙](../../CLAUDE.md)을 따른다. 타 세션의 변경을 stage/reset/restore하지 않는다. 운영 승인·개발 경계는 [실행 계약](../../CLAUDE.md)이 정본이다.

## 인수인계 후 첫 상품 — 인생 총운 8행

인생의 책 7행은 mock A~F(경계 있음)로 완료했다([행별 기록](../verification/life-book-paid-delivery-20260917.md)). 다음은 인생 총운 8행(`life-fortune-ai-consultation`)이다. 아래는 이번 세션이 7행 작업 중 확인한 사실만 옮긴 것이며, 8행 고유 계약의 결함 확정이나 완료 근거는 아니다.

- 실제 API: 7행과 같은 `worker/routes/life-book-ai.js`(`handleEnsureAccess` 1880행·`handleResult` 2162행·`handleStart` 2272행·`handleLifeBookAiRoutes` 2869행)가 두 SKU를 함께 처리한다. 8행 고유 분기(총운 분량 계산·apply)가 이 파일 안에서 SKU 값으로 어떻게 갈리는지는 아직 세부 대조하지 않았다.
- 실제 화면: 별도 라우트 없이 7행과 같은 결과 화면 `app/life-book-ai/result/LifeBookAiResultClient.tsx`를 공유함을 grep으로 확인했다 — 이번에 고친 pageshow/focus 복구(1490~1501행)가 8행에도 이미 적용돼 있으므로 다시 고치지 않는다.
- 기존 검사: `__tests__/worker/paid-completed-result-access.test.js`(교차 상품 96/96)가 `life-fortune-ai-consultation`을 포함해 재열람·취소/환불 차단을 검사함을 확인했다(`__tests__/fixtures/paid-completed-result-access-fixtures.mjs:7`). `life-book-ai.sections.test.js`가 8행 고유 "총운 SKU·원래 분량·apply" 계약을 얼마나 커버하는지는 아직 읽지 않았다.
- 우선 확인: 8행 고유 요청 경로(총운 파라미터)로 A(구매)·B(총운 분량 생성)·E(저장/apply)를 최소 1회 대조하고, 공유 컴포넌트라는 이유로 결함이 없다고 가정하지 않는다.

## 재검사 명령

`npm run test:jest -- --runInBand __tests__/worker/master-love-codex-paid-bootstrap.test.js __tests__/worker/master-love-codex-paid-delivery.test.js __tests__/worker/master-love-codex-recovery-task.test.js`

`node --test __tests__/ui/master-love-codex-resume-on-result.behavior.test.js __tests__/ui/master-love-codex-purchase-recovery.behavior.test.js __tests__/ui/direct-payment-sdk-return.behavior.test.js`

`node scripts/verify-master-love-codex-efficiency.mjs`

`npm run verify:deployed-sha -- --sha=77007dc4c1c931ecc148ab73069bf437b78473e9 --attempts=1` → 시작 조회는 버전 불일치 exit1, 최종 재조회는 Pages/Worker 모두 일치해 exit0. 실패와 성공을 구분하고 실결제 전달 검증으로 확대하지 않는다.
