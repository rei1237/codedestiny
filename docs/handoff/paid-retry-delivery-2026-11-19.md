---
status: in-progress
updated: 2026-11-19
next: "사용자 결정 2건(① 네오 첫 브리핑 다시 시도 우선 — 체크포인트 가드·실행 스위퍼·네오 환불 수집기 변경 필요 ② R1 다시 시도 창 의미) 확인 → R3 인생의 책 다시 시도 엔드포인트·UI(R1 reopenRetryableConsultation 사용). R1 은 R3·R4 없이 머지·push 금지"
---

# 유료 LLM "다시 시도로 반드시 결과 받기" 인수인계

## 요청 원문 (2026-11-19)
> 네오 환불은 다시 시도가 가능하도록 그리고 신년 운세 등 대표 상담들도 전달 실패할 경우에 다른 기능들도 다시 시도를 통해서 반드시 결과를 받을 수 있도록해주고 컨텍스트가 너무 길어졌으니 인수인계해서 진행하자

앞 세션 760e7f24(상태 파일 `.claude/state/760e7f24.md`, 계획 `C:\Users\user\.claude\plans\lazy-finding-kay.md` 의 S16 절)에서 이어진다.

## 첫 행동
1. `git branch --show-current`·`git status`·`git pull --ff-only`. 루트 체크아웃은 다른 세션(iOS)이 쓰고 있을 수 있으니 `scripts/create-safe-worktree.ps1 -Slug paid-retry` 로 워크트리를 만든다.
   - PS 5.1 에서 git stderr 때문에 스크립트가 중간에 멈추면 남은 단계(`node scripts/setup-git-merge-drivers.mjs`, node_modules 정션, `.env.local`·`.env.cloudflare.local` 하드링크)를 손으로 한다.
   - 새 워크트리는 `npm run fortune:build-data` 를 먼저 돌려야 check:fast 가 된다.
2. 이 문서의 단계 체크박스를 보고 `next` 부터 진행한다.

## 지금 상태
- main = `b3b77221c` 시점에 작성. 운영 = `25d9bc034`(2026-11-19 Release run 44501694109 성공, S13·S15·S16 반영).
- 워크트리 `D:\Development\codedestiny-worktrees\paid-retry-20261119-195316`, 브랜치 `wt/paid-retry-20261119-195316`, 기점 `bcce826eb`.
- 커밋(push·main 머지 안 함): `e11840bf4` R1 · `e62ce85fd` R2 수정 라운드 · `89c05a3bc` sitemap 원장(네오 결과 화면 서명) · 이 문서 갱신 커밋.
- 🔴 R1 은 단독으로 머지·push 하지 않는다 — 신년·인생의 책에 다시 시도 UI·재개 엔드포인트(R3·R4)가 없어, 그 상태로 나가면 고객은 최대 7일간 실패 화면만 보고 환불도 받지 못한다.

## 승인 상태
- 이 요청은 **코드 수정·main push(스테이징 배포까지)** 승인이다.
- 🔴 **운영 승격은 승인 없음.** 끝나면 결과를 보고하고 사용자에게 1회 승인을 받은 뒤에만 Release production 을 dispatch 한다. push 를 승격 승인으로 확대하지 않는다.
- 과금 LLM 실호출 승인 없음 → 전부 mock(`scripts/run-mock-tests.mjs`, LLM_DRY_RUN).
- 실결제·운영 DB 쓰기·환불 실행 금지.

## 설계 (가정 — 최종 보고에 명시하고 사용자 확인을 받는다)
현재(S16): 대표 6종은 완성본만 전달하고, 진전 없이 약 1시간이면 `generation_failed` + 자동 전액 환불(`worker/lib/paid-delivery-stuck.js` `settleStuckConsultation`). 신년운세는 기존 구제·환불 경로.
사용자 요구: 실패해도 **다시 시도로 결과를 끝까지 받게** 한다. 그래서 정책을 "실패 → 즉시 환불"에서 **"실패 → 다시 시도 가능(무료) → 끝내 못 받으면 환불"** 로 바꾼다.

1. **다시 시도 가능 상태**: 생성 실패·정체로 끝난 건은 결과를 숨긴 채 `retryable` 로 둔다(상태명은 기존 enum 을 확인해 최소 추가). 고객 화면에는 "생성이 잠시 막혔어요 — 다시 시도" 버튼과 "추가 결제·차감 없음" 문구를 보인다.
2. **다시 시도 동작**: 완성된 장은 보존하고 **빠진 장만** 다시 생성한다. 추가 결제·이용권 차감·라운드 차감 없음. 같은 결제 건(주문·이용권 증빙)에 묶어 다른 계정·다른 입력으로는 재사용할 수 없게 한다. 동시 클릭은 기존 lock(`llmMeta.lockedAt`/lease) 으로 하나만.
3. **자동 재시도 먼저**: 고객이 누르기 전에 복구 크론(`worker/lib/consultation-recovery-task.js`)이 기존처럼 이어 생성한다. 정체 판정(6회 무진전)은 이제 환불이 아니라 `retryable` 전환이다.
4. **환불은 마지막**: 다시 시도 가능 상태로 **7일**이 지나도 완성되지 않았거나, 고객이 환불을 요청하면 기존 공용 환불(`settleFailedConsultationRefund` / 카드 자동 환불 / 이용권 `refundPassUseEvidence`)로 전액 환불한다. 환불되면 다시 시도는 닫힌다(기존 환불 시 접근 회수 규칙). 7일은 기존 복구 무시 창과 맞춘다 — 코드에서 실제 값을 확인해 같게 둔다.
5. **네오 팩폭 작전실**
   - 수정 라운드: 실패 시 `retryable: true` + 라운드 미차감(`worker/routes/neo-operation-room.js:2140-2147`)은 이미 있다. 결과 페이지(`src/features/neo-war-room/NeoOperationRoomResultPage.tsx`)에서 **같은 답변으로 다시 시도 버튼**이 실제로 보이고 반복 가능한지 확인·보강한다.
   - 첫 브리핑 실패도 위 1~4 정책을 따른다(즉시 환불 → 다시 시도 우선).
6. **결과 보존 규칙 유지**: 이미 완성된 결과는 바꾸지 않는다. 완성본 판정(`is<Service>Complete`)·도중 비노출(S16)은 그대로 둔다.

## 범위·단계
대표 상담 = `lib/saju/saju-service-catalog.mjs` saju-signature 7종(흑월·네오·찻집·마스터 인연의 서·연애 비책·신년운세·인생의 책). "다른 기능들" = `scripts/verify-paid-llm-delivery-contract.mjs` 계약 목록의 나머지 유료 LLM 서비스.

- [x] R0 지도: 대표 7종마다 실패·정체 시 상태/환불 호출 위치/클라이언트 표시/재시도 진입점(API·버튼)을 `파일:줄` 표로. 이 문서 아래 "실측"에 붙인다.
- [x] R1 공용: `paid-delivery-stuck.js` 정체 → `retryable` 전환, 7일 뒤 환불로 이동. 공용 "다시 시도" 헬퍼(빠진 장만 재생성 대기로 되돌림, 결제 건 소유 확인). 테스트 먼저(TDD). — `e11840bf4`
- [ ] R2 네오(첫 브리핑 + 수정 라운드 버튼 확인) — **부분 완료.** 수정 라운드 '같은 답변으로 다시 시도'는 완료(`e62ce85fd`). 첫 브리핑 다시 시도 우선은 기존 환불 장치와 충돌해 멈춤(실측 "R2 네오 첫 브리핑 차단 근거", 사용자 결정 대기).
- [ ] R3 인생의 책
- [ ] R4 신년운세 (S16 대상 밖이었으므로 완성본 판정·비노출 여부도 먼저 확인. 비노출 추가는 하지 않고 다시 시도만 붙인다 — 요청 범위)
- [ ] R5 연애 비책
- [ ] R6 흑월(웹 + `worker/toss/native-heukwol.js` Toss 경로)
- [ ] R7 찻집 · 마스터 인연의 서
- [ ] R8 검증기: 계약 목록 각 서비스가 "실패 시 retryable + 다시 시도 경로 + 7일 환불"을 갖는지 fail-closed 로 검사(`scripts/verify-paid-llm-delivery-contract.mjs` 확장, 변이 1종으로 무는지 확인). 문서 `docs/context/ai-and-db.md` 유료 LLM 전달 계약 절 갱신.
- [ ] R9 대표 7종 머지 → `npm test --prefix apps/toss` → `npm run check:fast -- --base=<origin/main SHA>` → `node scripts/run-paid-gate-suite.mjs --base=<SHA>` → `node scripts/verify-myeongri-tables.mjs` → `npm run check:pre-push` → push → main CI(PR CI·Paid Flow Gates) 녹색.
- [ ] R10 "다른 기능들": 계약 목록 나머지 서비스에 같은 정책을 묶음별로(서비스마다 커밋). 지도 → TDD → 검사 체인 → push.
- [ ] R11 최종 보고 + 운영 승격 승인 질문(AskUserQuestion, 추천 "CI 녹색 뒤 1회 승격"). 승격 직전 `git log 25d9bc034..origin/main` 으로 다른 세션 커밋을 확인해 질문에 적는다.
- [ ] R12 정리: 워크트리 배수(`npm run worktree:remove -- <경로>`, 다른 체크아웃에서), 스크래치 삭제, 이 문서 `status: done`.

## 작업 규칙과 함정 (앞 세션 실측)
- main 직접, 브랜치·PR 없음. 워크트리 → main 머지 후 `git push origin HEAD:main`(push 전 `git merge-base --is-ancestor origin/main HEAD`).
- origin 이 자주 움직인다(iOS 세션). 머지할 때마다: `config/sitemap-lastmod.json` 충돌은 `git checkout --theirs` → `npm run sync:public` → `npm run sitemap:generate` → `node scripts/extract-saju-section-runtime.mjs --check` → `node scripts/build-saju-natal-core.mjs --check` → 미러 커밋.
- 🔴 로컬 `check:fast` 는 `verify:myeongri-tables` 와 Toss 테스트를 돌리지 않는다 — 위 R9 체인에 따로 넣었다(2026-11-19 CI 실패 원인).
- Toss 앱(`apps/toss`)에 서비스 하네스가 있다. 라우트를 바꾸면 Toss 테스트 픽스처도 깨질 수 있다(S16 에서 3건).
- 결제·환불 파일을 고치기 전에 paid-gate-auditor 로 동결 매니페스트·금지 패턴 확인.
- S16 의 인생의 책 흐름 검증기는 시도 횟수를 하드코딩한다(`verify-life-book-ai-flow`) — 시도·상태를 바꾸면 같이 갱신.
- 보관함 보존: 완성 결과는 숨기거나 지우지 않는다. 자동 삭제 TTL 은 결과에 쓰지 않는다.
- `.claude/skills/fire-your-seo-agency/` 는 남의 미추적 파일 — add 금지. `git add .` 금지, `git status`·`git diff --stat` 확인 후 파일 지정.
- 커밋 트레일러: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## 열린 후속 (이번 범위 밖, 보고만)
S15 품질: 한자 증가, 연애 비책 용신 데이터("금") vs 판정(토) 불일치, 흑월 근거 실패 3→5, '조심'인데 '기회' 톤. 연애 비책 정체 환불 재시도가 `refundEligibleAt` 미사용. 마스터 인연의 서 운영 스크립트 재개방 위험 미확인. S14 프롬프트 최적화 대기.

## 실측
### R0 실패 경로 지도 (2026-11-19, 읽기 전용 조사 · 기점 bcce826eb · 줄 번호는 R1·R2 변경 전)

#### 공통 장치
- **복구 크론** `worker/lib/consultation-recovery-task.js`
  - 7일 창: `MAX_AGE_MS = 7*86400000`, `IDLE_MS = 300000` (:33)
  - 처리 대상 상태는 generating / partial / delivery_pending, 흑월은 pending까지입니다. **generation_failed는 대상에서 빠집니다** (:34-37).
  - 먼저 `runPendingConsultationRefunds`를 돌립니다 (:44).
  - 서비스에 전용 `settleStuckDelivery`가 있으면 그것을 쓰고, 없으면 범용 `settleStuckConsultation`을 씁니다 (:61-71).
- **정체 확정** `worker/lib/paid-delivery-stuck.js`
  - 조건: 정체 6회(약 1시간) 또는 경과 6일. `STUCK_SETTLE_STALLS=6` (:13), `STUCK_SETTLE_AGE_MS=6일` (:14, "7일 창 전에 확정").
  - 범용 처리(:72):
    - delivery_pending이면서 완성 판정을 통과하면(또는 판정 함수가 없으면) completed로 "rescued" 처리합니다 (:86).
    - 그 밖에는 generation_failed + `llmMeta.refundEligibleAt`을 기록하고 (:93) `settleFailedConsultationRefund`를 부릅니다 (:98-99).
- **환불 정산** `worker/lib/consultation-delivery-refund.js`
  - `SERVICES`는 new-year-ai, life-book-ai, fusion뿐입니다 (:14-19).
  - `settleFailedConsultationRefund`(:169)
    - Toss 결제는 자동 환불하지 않고 manual_review로 넘깁니다 (:181).
    - generation_failed 상태가 필요합니다 (:184).
    - `llmMeta.deliveryRefund`를 예약합니다 (:190-197).
  - `runPendingConsultationRefunds`(:265)는 7일이 지나도 refundEligibleAt이 있거나 환불 대기 중인 문서를 다시 처리합니다 (:271-275).
- **환불 상태 응답** `worker/lib/consultation-refund-state.js:7` — 403 PAYMENT_REFUNDED 또는 409 REFUND_PENDING을 돌려줍니다.

#### 서비스별 표

| 서비스 | 요청 중 실패(상태·환불) | 크론 정체 확정 | 클라이언트 표시 | 재시도 진입점 | 완성 판정 |
|---|---|---|---|---|---|
| 흑월 (`worker/routes/heukwol.js`) | v1: 3회 실패 시 `failServiceExecution(HEUKWOL_GENERATION_FAILED, forceRefundOnClose)` → 503 (:109). v2: `failHeukwolWaveV2` 3라운드×3회 (:22, :120-145, 최종 호출 :138). 즉시 환불 플래그는 `service-execution-task.js:1341`. 화면 상태는 `visible()`이 failed+refundStatus로 매핑 (:37-45). | 전용 `settleStuckDelivery` (:149). 완성이면 "rescued" (:163-166), 아니면 attempts를 MAX로 봉인 (:170) 후 HEUKWOL_DELIVERY_STUCK + 즉시 환불 (:173). | `app/heukwol/HeukwolClient.tsx`: failed면 "상담서를 완성하지 못했어요"와 환불 안내 (:20-24, :152). "이어서 작성하기"는 generating일 때만 보입니다 (:142, :152). "다시 시도하기"는 세션이 생기기 전 결제 시작 단계용입니다 (:123). failed 상태 재시도 버튼 없음. | POST /continue (:194)와 기존 세션으로 /start 재요청 (:206). 둘 다 `advanceHeukwol`로 이어지며 남은 장만 생성합니다 (`pendingChapters` :57). `mayGenerate`가 pending·환불 없음·시도 3회 미만을 요구하므로 (:26) **failed에서는 동작하지 않습니다**. | `isHeukwolComplete` :31 |
| 흑월 Toss 네이티브 (`worker/toss/native-heukwol.js`) | 3라운드 실패 시 `savedResult.failed` 기록 (:42, :58-67, :73). 화면 상태 failed (:30), 보관함 GENERATION_FAILED (:38). **환불 호출 없음**. | 위 흑월 경로와 같은 문서를 쓰는지 (추정) | 없음(검색: failed\|retry, 이 파일) | 없음 | 위와 같음 |
| 네오 팩폭 전략실 (`worker/routes/neo-operation-room.js`) | handleStart catch에서 generation_failed + generationError (:1956). 이어서 `refundNeoGenerationFailure` (:1957, 정의 :1436): `failRefundableExecution` (:1366-1377), 이용권 환불 (:1385), 카드 자동 환불 (:1407). 503 LLM_ERROR (:1958). 장당 8회 상한 (:1070, :1864). | 전용 `settleStuckDelivery` (:2246). 완성이면 "rescued" (:2263-2274), 아니면 generation_failed + 환불 (:2276, :2282). | `src/features/neo-war-room/NeoOperationRoomResultPage.tsx`: LLM_ERROR·CALCULATION_ERROR면 본문을 걷고 실패·환불 안내 (:523-527, 문구 `result-copy.ts:101`). 실패 카드의 버튼(:815)은 다시 조회만 합니다. "작전 다시 짜기"는 새 상담 링크입니다 (:1536, 문구 `result-copy.ts:117`). | 같은 키로 /start 재요청하면 resumeBody 사용 (:1788, :1797). **generation_failed면 409 LLM_ERROR** (:1801), 생성 선점도 제외 (:1835). GET /result도 409 (:2006-2013). 선례: refine의 실패 섹션만 무료 재개, retryable:true (:2077-2079, :2144-2146). | `isNeoOperationRoomComplete` :1746 |
| 연이 찻집 (`worker/routes/fortune-tea-house.js`) | catch에서 `markFortuneTeaHouseGenerationFailed` (:5147). 재시도 가능하면 partial로 두고 202 (:6537-6538). 아니면 generation_failed (:5166), 이용권 환불 (:6541, 정의 :5103), 과금 증빙 해제 (:6544), 이연 차감 취소 (:6546-6560), 409 "새 상담으로 다시 신청" (:6563-6567). | 전용 `settleStuckDelivery` (:6771). 완성이면 delivered (:6786), 아니면 generation_failed DELIVERY_STUCK retryable:false (:6796-6797) + 이용권 환불 (:6802). 환불 재시도 `retryPendingFortuneTeaHousePassRefunds` (:5129). | `src/features/fortune-tea-house/FortuneTeaHousePage.tsx`: GENERATION_FAILED·PASS_ALREADY_REFUNDED면 복구 기록과 attemptId를 지우고 `paymentRequired=true`로 설정 (:1435-1442). 결과적으로 **새 결제 흐름**으로 갑니다. 진행 중 끊김 안내는 (:834). | /consult 재요청 (:6715). 선점 로직(:4994-5050)이 generation_failed를 명시적으로 막지는 않습니다(환불 완료 시점만 차단, :4996). checkpoint를 넘기므로 남은 부분만 생성합니다 (:5050). 실패한 재개도 소유 판정에 포함됩니다 (:6356). (추정) 시도 예산이 소진됐고 과금 증빙도 해제돼 다시 실패합니다. 클라이언트는 이 시도 자체를 버립니다. | `isFortuneTeaHouseComplete` :4600 |
| 마스터 연애 코덱스 (`worker/routes/master-love-codex.js`) | 장당 4회 소진 (:152) 시 `runCodexWave` (:1616)에서 `settleCodexFinalFailure` (:1664-1667, 정의 :1479). generation_failed + reviewReason DELIVERY_FAILED (:1481-1487), 환불 `retryCodexFinalRefund` (:1489, 정의 :1449). 이용권 환불 :1328, 결제 환불 :1374, Toss는 관리자 검토 (:1375). /generate 응답 retryable:false (:1567). | `worker/lib/master-love-codex-recovery-task.js`: 정체 판정 `codexDeliveryStuck` (:138), DELIVERY_STUCK 확정 (:268-277), 미정산 환불 재시도 (:143, :153). 선례: `planCodexReopen`·`reopenClosedSessions`가 GENERATION_BUDGET_EXCEEDED로 닫힌 generation_failed를 1회 재개 (:114-124, :186). | `app/master-love-codex/result/MasterLoveCodexResultClient.tsx`: GENERATION_FAILED_REFUNDED면 본문 없이 환불 안내 (:145-149, :363). 닫힌 실패면 `onRetry` 없음 (:365). 생성 화면의 `retryGeneration` (`MasterLoveCodexPage.tsx:415`, :736)은 진행 중 오류용입니다. | POST /generate. 남은 장만 생성 (`splitPendingChapters` :886, :937). generation_failed면 retryable:false (:1567). | `isCodexArchiveComplete` :1852 |
| 연애 비책 (`worker/routes/love-secret-ai.js`) | handleStart catch에서 먼저 `restoreBillingGateAccessOnFailure`로 이용권·월정석·카드·코인을 되돌립니다 (:1955, 정의 :1306, :1214, :1287). 이어서 generation_failed (:1961-1975), 503 LLM_ERROR (:1983). 3라운드/12회 (:80). | 전용 `settleStuckDelivery` (:2152, 대상 상태 :2147). 완성이면 confirm (:2164), 아니면 generation_failed DELIVERY_STUCK (:2196-2197) + 복원 (:2200). | `app/love-secret-ai/result/LoveSecretAiResultClient.tsx`: 실패 판정 (:884) 후 "차감된 내역이 있다면 자동으로 복구" 안내 (:135, :887, Toss는 고객지원 안내). 버튼은 입력 화면으로 가는 "다시 상담하기" 링크뿐 (:144, :1105). 생성 화면도 실패 시 throw (`LoveSecretAiClient.tsx:2198`). | /generate·/start에 `resumeSessionId` (:1712-1722). generation_failed를 명시적으로 막지는 않습니다 (:1769-1775). 환불 증빙 때문에 접근이 회수돼 막힙니다 (:1639-1650, :1982-1983). GET /result는 503 LLM_ERROR (:2057-2064). | `isStuckDeliveryComplete` :1674, `isLoveSecretComplete` (`worker/lib/love-secret-ai-prompt.js:797`) |
| 신년운세 (`worker/routes/new-year-ai.js`) | catch에서 일시 장애면 partial 503 retryable (:2981-2985). 아니면 generation_failed + refundEligibleAt (:2988), 증빙 해제 (:2994), 이연 차감 취소 (:2995-2998). finally에서 `settleNewYearFailureRefund` (:3004, 정의 :2830 → 공통 정산). 섹션당 2회 (:321). | 범용 `settleStuckConsultation`. **`isStuckDeliveryComplete` 없음**(검색: `isStuckDeliveryComplete`, 이 파일)이라 delivery_pending은 무조건 rescued (`paid-delivery-stuck.js:86`). | `app/new-year-ai-consultation/NewYearAiClient.tsx`: LLM_ERROR·GENERATION_FAILED·환불 사유면 환불 안내로 끝냄 (:620-632, :1687-1691, :1741-1744). "다시 시도"는 멈춘 생성(pending) 재개용 (:1764, :1779). 문구 `LLM_ERROR_MESSAGE` "같은 요청 권한으로 다시 이어집니다" (:349)는 실제 서버 동작과 맞지 않습니다. | /start에 `resumeSessionId` (:2847-2856). generation_failed면 409 GENERATION_FAILED (:2873). GET /result도 미완료면 409 (:3084-3086, 환불 응답 :3072). | 없음(위 검색) |
| 인생의 책 (`worker/routes/life-book-ai.js`) | 섹션 웨이브 종결 실패면 generation_failed + refundEligibleAt (:3489-3496), finally에서 `settleLifeBookFailureRefund` (:3503, 정의 :2716). 바깥 catch도 같습니다 (:3532-3542). 미완성 전달도 generation_failed (:2744-2752). 503 llmFailed + refunded (:3557). 섹션당 4회 (:130). | 범용 처리에 `isStuckDeliveryComplete` (:1921) 사용. | `app/life-book-ai/LifeBookAiClient.tsx`: 오류 블록에 refunded 안내 "새로 한 권을 여시겠어요?" (:1944, `lifeBookCopy.ts:49`)와 재시도 버튼 (:1945, `handleRetry`)이 함께 있습니다. 결과 화면은 폴링 상한에서 exhausted 안내 (`result/LifeBookAiResultClient.tsx:1565`). | /generate·/start에 `resumeSessionId` (:2894-2905). generation_failed면 "generate_blocked_duplicate"로 막힘 (:2985-2991). GET /result는 실패 분기 (:2841-2850), pending이면 202 retryable (:2839). (추정) 재시도 버튼은 서버에서 막힙니다. | `isLifeBookComplete` :1901, `isStuckDeliveryComplete` :1921 |

#### 7일 관련 상수
- `consultation-recovery-task.js:33` — `MAX_AGE_MS` 7일
- `paid-delivery-stuck.js:14` — `STUCK_SETTLE_AGE_MS` 6일
- `consultation-delivery-refund.js:265` — 7일이 지나도 환불 의무를 다시 처리한다는 주석
- 이 밖의 서비스별 7일 상수는 없습니다(검색 범위: 위 7개 라우트 파일, 키워드 `7 \* 86400000`·`MAX_AGE`, 앞 단계 조사).

#### 빈틈과 위험
- **실패 상태는 모든 서비스에서 최종입니다.** 복구 크론이 generation_failed를 건드리지 않고 (`consultation-recovery-task.js:34-37`), 시작·재개 진입점이 모두 막혀 있습니다.
  - 흑월 `mayGenerate` :26
  - 네오 :1801
  - 신년 :2873
  - 인생의 책 :2985
  - 코덱스 :1567
  - 연애 비책·찻집은 환불이 끝나 접근이 회수돼서 막힙니다.
  - 예외는 코덱스가 GENERATION_BUDGET_EXCEEDED로 닫힌 경우 한 번 재개하는 것뿐입니다 (`master-love-codex-recovery-task.js:114-124`).
- **모든 서비스가 실패 즉시 환불합니다.** 7종 모두 요청 안에서 그리고 크론 정체 확정 시 바로 환불합니다. 새 정책(숨김 → 무료 재시도 → 7일 뒤 또는 요청 시 환불)으로 바꾸려면 7곳을 각각 고쳐야 합니다.
  - 흑월 :109/:138/:173
  - 네오 :1957/:2282
  - 찻집 :6541/:6802
  - 코덱스 :1489/:277
  - 연애 비책 :1955/:2200
  - 신년 :3004 및 크론
  - 인생의 책 :3503/:3542 및 크론
  - 신년·인생의 책만 공통 `settleFailedConsultationRefund`를 쓰고, 나머지 5종은 각자 환불 함수가 있습니다.
- **환불 타이밍 주의.** 정체 확정은 6일 시점, 복구 창은 7일입니다. 환불을 7일 뒤로 미루면 `runPendingConsultationRefunds`의 `refundEligibleAt` 의미를 "실패 시각"에서 "실패 시각+7일"로 바꿔야 합니다. 이 함수는 SERVICES 3종에만 연결돼 있습니다 (:14-19). 나머지 5종은 별도의 지연 환불 수거기가 필요합니다. (추정)
- **이미 끝난 일을 되돌리는 문제.** 찻집·신년은 실패 시 과금 증빙 해제와 이연 차감 취소를 즉시 합니다 (찻집 :6544-6560, 신년 :2994-2998). 실패 뒤 다시 시도하려면 이 해제 시점도 함께 미뤄야 합니다. 시도 예산도 소진된 채로 남습니다 (흑월 attempts=MAX 봉인 :170, 코덱스 장당 4회, 네오 8회).
- **Toss 경로.**
  - 공통 정산은 manual_review로 넘깁니다 (`consultation-delivery-refund.js:181`).
  - 코덱스는 관리자 검토로 갑니다 (:1375).
  - `native-heukwol.js`에는 환불 호출이 아예 없습니다.
  - Toss 쪽 재시도·환불 정책은 따로 설계해야 합니다.
- **신년운세만 완성 판정 함수가 없습니다.** 그래서 delivery_pending은 내용 확인 없이 rescued 처리됩니다 (`paid-delivery-stuck.js:86`). 미완성 결과가 전달될 위험이 있습니다(코드 읽기 근거, 실측 아님).
- **클라이언트 쪽 상태.**
  - 실패 상태에서 무료로 "다시 시도"하는 버튼은 7종 모두 없습니다.
  - 인생의 책은 재시도 버튼이 보이지만 (`LifeBookAiClient.tsx:1945`) 서버가 막는 것으로 추정됩니다.
  - 찻집은 실패하면 새 결제로 보냅니다 (:1441).
  - 신년운세 `LLM_ERROR_MESSAGE` (:349)는 "다시 이어집니다"라고 안내해서 실제 동작과 어긋납니다.
- **재사용할 수 있는 선례.**
  - 네오 refine: 실패 섹션만 무료로 재개, retryable:true (:2077-2079, :2144-2146)
  - 코덱스 `planCodexReopen` (:114-124)
  - 찻집 checkpoint 재개 (:5050)
  - 남은 장만 생성하는 함수는 이미 있습니다: 흑월 `pendingChapters` :57, 코덱스 `splitPendingChapters` :886. 새 경로에서 그대로 쓸 수 있습니다.

#### 미검증
- 각 클라이언트 재시도 버튼이 실패 상태에서 실제로 렌더되는지 화면으로 확인하지 않았습니다.
- 인생의 책 `handleRetry`가 서버에서 거절되는지 끝까지 따라가지 않았습니다.
- 흑월 Toss 네이티브와 일반 흑월이 같은 문서를 쓰는지 확인하지 않았습니다.

### R1 공용 다시 시도 (`e11840bf4`, 2026-11-19)
- `worker/lib/paid-delivery-stuck.js`
  - `RECOVERY_WINDOW_MS = 7일`, `RETRY_REFUND_AFTER_MS = RECOVERY_WINDOW_MS`. 복구 크론 `MAX_AGE_MS` 도 이 상수를 쓴다(값 동일, 7일).
  - `settleStuckConsultation` 미완성 분기: 환불하지 않는다. `generation_failed` + `generationError DELIVERY_STUCK` + `llmMeta.retryable {since, refundAt = since+7일, code}` 를 쓰고 `{outcome:'retryable', refundAt}` 를 돌려준다. `refundEligibleAt` 이 없으므로 `runPendingConsultationRefunds` 가 고르지 않는다. 결제·이용권 차감은 그대로다.
  - 다시 정체돼도 처음 `refundAt` 을 늘리지 않는다. `refundAt` 이 지난 뒤의 정체만 예전처럼 `refundEligibleAt` + `retryable.refundReason = RETRY_WINDOW_EXPIRED` → `settleFailedConsultationRefund`.
  - `llmMeta` 가 null 인 문서는 점 경로 `$set` 대신 객체째 쓴다(`llmMetaFields`).
  - 새 export
    - `reopenRetryableConsultation(model, {id, userId}, now)`: 소유자 + 문서 id 로만 찾는다. `generation_failed` + `retryable` + 환불 미시작(`deliveryRefund`·`refundEligibleAt`·`billingCleanupPending` 없음) + 창 안일 때만 `partial` 로 되돌린다(CAS: id·userId·status·updatedAt, lock 해제, `reopens+1`, `deliveryWatch: null`). 거절 사유는 NOT_FOUND·NOT_RETRYABLE·REFUND_STARTED·RETRY_WINDOW_EXPIRED·CONFLICT. 실제 이어쓰기는 각 서비스 기존 경로(lease·장별 예산)가 맡는다.
    - `markRetryableRefundDue(model, owner, now, reason='CUSTOMER_REQUEST')`: 고객 환불 요청 → `refundEligibleAt` 을 붙여 기존 공용 환불 크론에 넘긴다.
    - `expireRetryableConsultations(model, now, {limit:50})`: 창이 지난 `generation_failed`·`partial`·`generating` 을 환불 대상으로 바꾼다. 살아 있는 lease(120초)는 건너뛰고, 질의 조건을 JS 에서 다시 확인한다(fail-closed).
- `worker/lib/consultation-recovery-task.js`: `refundRecovery` 보다 먼저 `GENERIC_STUCK_SETTLERS`(new-year-ai·life-book-ai) 모델마다 expire 를 돈다. 그래서 같은 크론 회차의 환불 정산이 그 건을 바로 고른다. 실패는 `{service, code:'RETRY_EXPIRE_PENDING'}` 로 기록한다.
- 테스트: `__tests__/worker/paid-delivery-stuck.test.js` 19/19. `paid-llm-delivery-contract.test.js` ②를 새 정책으로 바꿨다(정체 → 다시 시도 가능·차감 유지 → `refundAt` 시점 크론이 `refundEligibleAt` 부여 → 공용 환불 크론이 실복원). 복구·계약·정체 묶음 70/70. 찻집 정체·코덱스 복구·네오 유료 전달·인생의 책 섹션 묶음 154/154. `verify-paid-llm-delivery-contract` exit 0(계약 36개, 변이 36/36 탐지). `verify-life-book-ai-flow` PASS. `verify-new-year-ai-flow` ok.

### R2 네오 수정 라운드 (`e62ce85fd`)
- 서버는 이미 맞다. 수정 라운드 실패 → 503 `{reason:'LLM_ERROR', retryable:true, refinementStatus:'generation_failed'}`, 라운드 미차감. body `{sessionId}` 만 보내면 저장된 `llmMeta.refinement.realityCheck` 를 재사용하고 `resumeFailed` 가 시도 수를 새로 연다. 서버 변경은 없다.
- 결과 화면(`NeoOperationRoomResultPage.tsx`, `paid-delivery.ts` `neoRefinementRetryable`)
  - 완성된 첫 브리핑은 그대로 둔다. 실패한 수정 라운드에는 안내, '같은 답변으로 다시 시도' 버튼(sessionId 만 전송, 입력 검사 생략), '추가 결제·차감 없음' 문구를 보인다.
  - 즉시 실패, 폴링 중 실패, 새로고침 뒤 GET 실패가 모두 같은 안내로 돌아오므로 반복할 수 있다. 남은 포함 횟수가 0이면 숨긴다.
  - 원시 오류 코드나 '오래 걸린다' 페이지 오류는 더 이상 띄우지 않는다.
- 문구는 `result-copy.ts` 5개 로케일(ko·en·ja·zh-CN·zh-TW)에 있다. 안내 본문은 원래 있었지만 쓰이지 않던 `refineGenericErrorRetry` 를 쓴다.
- 테스트: 새 `__tests__/ui/neo-refinement-retry.behavior.test.js` 4건 추가, `neo-wake-recovery.behavior.test.js` 1건을 새 동작에 맞게 갱신. 네오 UI 13/13, tsc 오류 0.

### R2 네오 첫 브리핑 차단 근거 (다시 시도 우선으로 바꾸지 않았다 — 사용자 결정 필요)
첫 브리핑 실패를 '환불 보류 → 다시 시도'로 바꾸면 기존 환불 장치와 정면으로 충돌한다(코드 읽기 근거).
- `worker/lib/checkpoint-refund-guard.js:41` 은 `generation_failed` 를 '결과 없음'으로 분류한다. 그래서 `service-execution-task.js` `settleExecutionById`(:846)와 `sweepStaleServiceExecutions`(:1484/:1502)가 약 10분 뒤 timeout_auto_refund 로 환불한다. 환불만 미뤄도 스위퍼가 먼저 환불한다.
- 네오는 `consultation-delivery-refund.js` `SERVICES` 에 없다. 그래서 7일 뒤 환불할 지연 환불 수집기가 없다.
- `refundNeoGenerationFailure`(:1436)는 핸들러 catch(:1953–1958)에서 즉시 실행된다. 장당 시도는 8회 상한이고(:1070, :1864), `generation_failed` 면 시작·재개가 409 로 막힌다(:1801, GET /result :2006-2013).
- 바꾸려면 체크포인트 가드 분류, 실행 스위퍼, 네오 전용 지연 환불 수집기, 시작 차단, 시도 예산 재개를 함께 고쳐야 한다. 결제·환불 RED 이고 문서가 정하지 않은 범위라 멈췄다.

### 설계 가정·위험 (최종 보고에 명시)
- (a) 새 상태 enum 을 추가하지 않고 `generation_failed` + `llmMeta.retryable` 표지로 '다시 시도 가능'을 나타낸다. 기존 화면·크론이 `generation_failed` 를 실패로 다루는 경로를 그대로 쓴다.
- (b) 7일은 다시 시도 가능으로 바뀐 시각부터 센다. 그래서 `refundAt` 은 생성 기준 최대 약 13일까지 갈 수 있다. 복구 크론은 생성 7일 이내 문서만 보므로, 7일 뒤 다시 연 건은 클라이언트 재개 경로에만 기댄다. 또 생성 6일 뒤 다시 연 건은 경과일 기준 정체 확정에 바로 다시 걸린다(환불은 아니고 다시 retryable 로 돌아간다). 사용자가 '생성 기준 7일'을 원하면 `since` 대신 문서 생성 시각을 쓰도록 바꾼다.
- (c) 🔴 R1 단독 배포 금지(위 '지금 상태').
- (d) 네오 첫 브리핑은 위 차단 근거 때문에 기존 즉시 환불을 유지한다.
- (e) `expireRetryableConsultations` 는 공용 설정자(new-year-ai·life-book-ai)에만 걸려 있다. 전용 `settleStuckDelivery` 를 쓰는 5종(흑월·네오·찻집·코덱스·연애 비책)은 아직 즉시 환불이다(R5~R7 대상).

### R0~R2 최종 검사 (워크트리 HEAD `89c05a3bc`, --base=`bcce826eb`)
- `npm run check:fast -- --base=bcce826eb` → exit 0 (critical 자동 승격, typecheck·lint·sitemap-drift·verify 다수 통과, jest 483 스위트 · 8261 통과 / 1 skip).
- `node scripts/run-paid-gate-suite.mjs --base=bcce826eb` → exit 0 (91개 통과 / 실패 0, 벽시계 1135s).
- `npm test --prefix apps/toss` → exit 0 (1765/1765). 첫 실행은 exit 1(3건 `Could not resolve "@apps-in-toss/web-framework"`). 원인은 워크트리에 `apps/toss/node_modules` 가 없던 것이다(코드 문제 아님). 메인 체크아웃 `apps/toss/node_modules` 로 임시 정션을 걸어 다시 돌렸고, 끝난 뒤 `rmdir` 로 정션만 해제했다(메인 모듈 보존 확인).
- 🔴 함정: `create-safe-worktree.ps1` 은 루트 node_modules 만 정션한다. Toss 테스트 전에 `apps/toss/node_modules` 임시 정션이 필요하고, 워크트리 배수 전에 반드시 해제해야 한다(폴더 삭제가 정션 너머 원본을 지우지 않게).
- `node scripts/verify-myeongri-tables.mjs` → exit 0 (검사 29건, LunarUtil 대조 216키 잔차 0).
- 첫 회 check:fast 는 `verify:sitemap-drift` 에서 막혔다. 원인은 네오 결과 화면 편집으로 `/neo-operation-room/` 서명이 바뀐 것(lastmod 는 같은 날 2026-11-19). `npm run sitemap:generate` 로 고쳐 `89c05a3bc` 에 담았다. SEO 영향: 공개 URL 의 title·H1·canonical·robots 는 변경 없음. 결과 화면 안의 안내 블록만 추가됐다.
