---
status: done
updated: 2026-11-22
next: "없음 — D2·토스 CI 수정 push 완료(main cdb1b8bb4c, PR CI 45022219611 success). 후속은 남은 위험 절"
---

# 사주 고급 궁합(10,000원) 재구축 인수인계

## 요청 원문 (2026-11-20)
1. "사주 화면의 사주 궁합 분석은 5천원인데 현재 결제 후 제대로 생성이 안되는 버그가 있는데 기존 쓰레기 코드를 참조하지말고 현재 세팅된 로직으로 정확하게 만들어주길 바래 전생이라든지 그런 부분은 불필요하거나 정확하지 않으므로 정적으로 제공해주면 될것 같다."
2. "그냥 가격도 만원으로 올리도록해 그리고 정확하게 버그 없이 생성되도록해주고 기존 정적으로 생성하는 기능은 간단 연예인 궁합이나 유명인 궁합 등은 무료로 볼 수 있도록해줘 이 궁합 서비스는 고급 궁합 기능이 되어야하며, 상대방의 바람끼라든지 이미 세팅된 계산 값으로도 볼 수 있도록해줘"
3. "그외에도 최고의 서버 전문가로서 llm 상담들이 결제 이후에 제공이 안되어서 매출을 날리는 문제가 없도록 문제점을 분석해서 해결해도 함께 해줘"
4. "그리고 새로 만든 사주 궁합 진입점을 고급스러운 달빛 예화 느낌으로 만들어줘"
5. (코디네이터 전달, 2026-11-20) "llm 서비스들의 다시 시도는 이미 생성된 부분은 살리면서 안된 부분만 생성하도록해주고 중복해서 수정하지 않도록 주의해"

## 첫 행동
- 작업 위치는 이 워크트리다: `D:\Development\codedestiny-worktrees\saju-compat-premium-20261120-175330`, 브랜치 `wt/saju-compat-premium-20261120-175330`, 기점 `34f58616f`.
- 루트 체크아웃은 다른 세션과 공유한다. 루트에서 `reset`·`stash`·`checkout --`를 쓰지 않는다.
- 이 문서의 단계 체크박스를 보고 `next`부터 진행한다.
- 새 워크트리에서 check:fast가 데이터 누락으로 실패하면 `npm run fortune:build-data`부터 돌린다.

## 승인 상태
- 2026-11-20 사용자가 계획(`C:\Users\user\.claude\plans\witty-greeting-minsky.md`)을 승인했다.
  - 승인 범위: 코드 수정과 main 머지·push(스테이징까지).
  - 운영 승격은 승인되지 않았다.
  - 과금 LLM 실호출은 승인되지 않았다. 검증은 전부 mock으로 한다.
  - 실결제·운영 DB 쓰기·환불 실행은 금지다.
- 사용자 결정(AskUserQuestion, 2026-11-20):
  1. 고급 궁합은 App Router 새 페이지로 만든다. 사주 탭에는 진입만 둔다.
  2. 기존 정적 궁합 결과는 무료로 공개한다. 유명인 궁합을 새로 만들지는 않는다.
- 이미 확정된 정책(다른 세션 문서 `docs/handoff/paid-retry-delivery-2026-11-19.md`, 사용자 결정 2026-11-19):
  - 유료 LLM은 실패하면 먼저 "다시 시도"를 무료로 제공한다.
  - 생성 시각에서 7일이 지나거나 고객이 요청하면 그때 환불한다.
  - 대표 7종(`RETRY_FIRST_POLICY`)은 이미 이 정책을 따른다. 새 상품도 이 정책으로 만든다. 즉시 환불로 만들지 않는다.

## 작업 규칙과 함정
- 🔴 기존 `worker/routes/saju-compat-basic.js`, `worker/lib/saju-compat-schema.js`, `worker/lib/saju-compat-prompts.js`, `js/saju-compat-flow.mjs`, `js/saju-engine.js`의 LLM 경로는 템플릿으로 참조하지 않는다(사용자 지시). 삭제도 하지 않는다. 기존 구매자 보관함과 Toss 네이티브가 이 경로를 쓴다.
- 템플릿은 연애 비책이다.
  - 라우트: `worker/routes/love-secret-ai.js`
  - 프롬프트: `worker/lib/love-secret-ai-prompt.js`
  - 계산: `worker/lib/love-secret-ai-calculation.js`, `worker/lib/love-secret-ai-facts.js`
  - 화면: `app/love-secret-ai/` (`love-secret-retry.ts` 포함)
  - 테스트: `__tests__/ui/love-secret-paid-delivery.behavior.test.js`
  - 이미 다시 시도 우선 정책이 적용된 상태이므로 그 구조를 그대로 따른다.
- 결정적 궁합 계산 재료:
  - `buildSajuLoveCompatibility` (`worker/lib/master-love-codex-compat.js:648`)
  - `calculateLifeBookAiSaju` (`worker/lib/life-book-ai-saju.js:701`, `timeUnknown` 지원)
  - `approvedCompatSupportFacts` (`worker/lib/saju-authority-consumer.js:176`)
  - 도화·홍염 강도는 `love-secret-ai-facts.js:244,290`의 방식을 따른다.
- 새 유료 LLM 서비스는 아래 두 곳에 반드시 등록한다. 둘 다 fail-closed라 빠뜨리면 검사가 실패한다.
  - `worker/lib/consultation-recovery-registry.js`의 `PAID_LLM_DELIVERY_CONTRACT`와 `PAID_LLM_DELIVERY_TESTS`
  - `scripts/verify-paid-llm-delivery-contract.mjs`의 `RETRY_FIRST_POLICY` 분류
- LLM 안전 규칙 17:
  - 분량 하한은 목표의 80% 이하로 둔다.
  - 출력 토큰은 목표 상한에 머리말과 thinking 몫을 더한 값 이상으로 잡는다.
  - 형식 위반은 거부하지 말고 결정적으로 교정한다.
- 바람기 지표는 계산값(근거 항목 목록과 낮음·보통·높음 등급)으로만 판정한다. 단정·비난 표현은 쓰지 않는다. LLM은 그 근거만 해석한다.
- 전생 인연은 LLM 없이 정적 표로 만든다. 일주와 상대 년주를 교차한다.
- 메모리의 함정 목록(결제·정적 셸·가드·윈도우 CRLF)을 지킨다. index.html을 고치면 `npm run sync:public`을 돌리고 미러도 커밋한다.

## 감사 결과: 결제 후 미제공 경로 (C·D단계 입력)
다른 세션의 paid-retry R10("계약 목록 나머지 서비스에 다시 시도 우선 정책")이 같은 파일을 다룬다. 해당 파일은 `checkpoint-refund-guard`, `paid-delivery-stuck`, `paid-narrative-delivery`, 계약 검사기다. 그래서 C·D는 이 워크트리에서 따로 구현하지 않고 R10에 넘긴다. 코드를 읽어 확인한 내용이다.
1. `runPaidNarrativeDelivery`의 `onExhausted`를 넘기는 곳은 `worker/lib/feature-question-delivery.js:71` 하나뿐이다. 서술형 상품 12종은 시도를 다 써도 환불 경로가 없다.
2. `paid-narrative-delivery.js:273`은 저장된 장이 0개일 때만 소진 처리를 한다. 일부 장이 저장된 뒤 소진되면 영구히 `partial` 상태로 남는다.
3. `worker/lib/checkpoint-refund-guard.js:25-28`
   - 서술형 실행을 attempts나 `reviewRequired` 확인 없이 `recoverable`로 판정한다.
   - 하드코딩된 14개 키는 `includeResumable` 게이트를 거치지 않는다.
   - 그 결과 `service-execution-task.js:847-852`가 600초씩 미루기만 반복해 영구 pending이 된다.
4. `paid-narrative-recovery-task.js:11,22`는 24시간 뒤, 그리고 `reviewRequired`가 되면 재개를 멈춘다.
5. 레코드가 생기기 전 4xx로 끝나는데도 결제가 이미 차감된 경우:
   - `saju-compat-basic.js:134`(시간 모름이면 시주가 비어 422, 클라이언트는 이를 TRANSPORT 재시도로 분류: `js/saju-compat-flow.mjs:127`)
   - `yoga-guru.js:81`, `oracle.js:145`, `animal-totem.js:682`
   - feature-question seed의 422(`feature-question-delivery.js:58-63`)
   - `ziwei-deep-report.js:~765`
   - love-secret `REPRESENTATIVE_FACTS_MISMATCH` 409(`love-secret-ai.js:1793`, restore 누락)
6. `KNOWN_STUCK_SETTLE_GAPS` 12개 서비스는 isolate가 죽으면 정산 경로가 없다.
7. 외부 정책 결정이 필요한 것: Toss 네이티브, palm-reading 카드 환불, fortune-chat 단건 카드 환불, 스토리지 장애 시 503.

## 설계 요약
상세는 승인된 계획 파일에 있다.
- featureKey `saju-compat-premium`, 100코인(10,000원), reason "사주 고급 궁합".
- 클라이언트는 두 사람의 출생 입력(날짜, 양력·음력·윤달, 시각 또는 모름, 성별, 이름)과 관계 유형만 보낸다. 명식과 facts는 서버가 계산한다.
- 결제 전 `/prepare`(validate)로 입력을 검증한다. 검증을 통과해야만 결제창을 연다.
- 전달 방식:
  - 완성본만 전달한다.
  - 실패하면 무료로 다시 시도하게 한다.
  - 7일이 지나거나 고객이 요청하면 환불한다.
- 결과 화면 구성:
  - 정적 계산 카드: 궁합 축 점수, 오행 보완, 합충, 상대 바람기 지표와 근거, 전생 인연
  - LLM 4장: 관계 총론 / 성향·소통 / 신뢰·이성 기질 / 시기·실천
- 진입점: 사주 탭의 무료 정적 궁합 결과 아래와 SEO 소개 페이지 `/saju/compatibility/`에 둔다. 디자인은 고급스러운 달빛 예화 톤이다(`docs/context/design-canon.md` §달빛 예화 기본 UI 계약, `DESIGN.md` §2, `styles/yehwa-motifs.css`의 생성 마스크 재사용).

## 단계
- [x] A1 계산 모듈 `worker/lib/saju-compat-premium-facts.js`와 테스트 `__tests__/worker/saju-compat-premium-facts.test.js` → check:fast → 커밋
- [x] A2 카탈로그(paid-feature-registry·billing·saju-service-catalog·service-registry), 프롬프트, 라우트, 모델, worker 배선, 계약·RETRY_FIRST 등록, paid-delivery 테스트 → 커밋
- [x] A3 App Router 입력·결과 페이지, dev-preview fixture, 보관함 등록, SEO 소개 페이지 갱신 → 커밋
- [x] B 사주 탭: 결제 없이 정적 궁합 결과를 보여 주고, 그 아래 달빛 예화 톤의 고급 궁합 CTA를 둔다(sessionStorage 프리필). 그다음 sync:public → 커밋
- [x] A4 화면 검증: headed 브라우저로 `?preview=success|failed`와 사주 탭 무료 궁합(시간 모름 포함)을 확인하고, visual-checker로 판정한다.
- [x] M 머지와 push: main으로 머지 → check:pre-push → push → CI 1회 확인 → `verify:staging -- --sha=<SHA>` (실측은 아래 "M 머지·push")
- [x] C·D 실측: 아래 "C·D 실측 (2026-11-21)"
- [x] C1 가드 판정 정정(서술형 includeResumable 게이트·소진/창 경과 종결, 코인 복원 경로 확인 선행) — ef3b6b83e (held 종결, 환불은 C2)
- [x] C2 서술형 엔진 다시 시도 우선 — 서버(빠진 장만 재개·7일·요청 환불·cron 배선·검증기 10종 이동). 실측은 아래 C2 절
- [x] C2-UI 제품 10종 보류 화면에 다시 시도·환불 요청 버튼 — fe089da75·7bb121d14·0fe7a4f78·01812dbe3, main b28bd771e (아래 "C2-UI 완료"). 항목4 보관함 표식은 갭으로 남김
- [x] C3 과금 후 레코드 전 4xx 실패(감사 5) — 7d8f2e8f4·b517a51cc·88fcfa0f6·cb8867ece·93fd5a25c·3e7109b12 (아래 "C3·C3b·C4")
- [x] C3b 환불(요청·승인·정산) 뒤 재개 거절, 무료 재생성 없음 — 41ec5e085
- [x] C4 클라이언트 400/422 → INPUT_INVALID 분류 — 9e98190d0·e82fef6fa(사전)·01d5c639a(sitemap 원장)
- [x] D 서비스별 stuck settle — **10/12 자동 확정, 2종은 근거와 함께 경보 유지**(D2 2026-11-22, push 대기 — 머지 13b7e0e68 기준 verify:paid-llm-delivery ok·jest 8 suite 317 pass·check:pre-push EXIT 0; check-changed fast 는 로컬 메모리 고갈(vips out of memory·native crash)로 __tests__/ui 19건 헛실패, 변경과 무관). D1(2026-11-22). 공용 헬퍼 `settleStuckRetryFirst`(worker/lib/paid-delivery-stuck.js): 창 안은 generation_failed+retryable(저장 장 보존·빠진 장만 재생성·환불 없음), 생성+7일 뒤엔 서비스 기존 보류 환불(settle<Svc>RetryRefund). 커밋 1d13afe7f(헬퍼·크론 unsettled 이어쓰기), 7bfd2cadd vedic, e7a4bf0f3 astrology, 1989484d2 ziwei, 916d65316 sukuyo(읽기 전용 증빙 — resolveStartAccess 는 이용권 차감 가능해 쓰지 않음), 0658bee74 karma, 37cad9969 감사 B2(증빙 조회 실패 pending 도 이어쓰기·회전 — 안 하면 가장 오래된 1건이 서비스 크론을 막음), 4cba2f230·bfec7eddc·3e62fa12d 감사 B1(이용권 재판정 거절 시 `{}` 저장 → 7일 뒤 이용권 환불 누락; 서비스별 pass 모양으로 대체, refundId 멱등). paid-gate-auditor B1 재감사 PASS·verify-payment-freeze exit 0.
  - 실측: verify:paid-llm-delivery ok(정체 자동 확정 12개·경보만 7개, 변이 37/37, 100/100). jest ziwei 59·vedic 54·astrology 56·sukuyo+karma+stuck+recovery 159 pass.
  - D2 커밋(워크트리, push 안 함 — main 이 남의 커밋으로 빨강): 051c5855a naming-prompt(settleStuckRetryFirst idKey executionId·metaKey result.namingPrompt, 환불 settleNamingRetryRefund; 크론 투영에 result.namingPrompt.tossIntentId·retryable.reopenedAt 추가 — 이전엔 토스 작명이 크론에서 handleGenerate 로 오배선, stuckAgeStart 가 작명 재개방 시각을 읽음), 76c6c7dd7+cccb82cd1 nakshatra-ai, 3716a8ef3+8b9b3fe64 human-design-report, fd13dbab0 destiny-compass-ai, a3bc7e763 relationship-boundary-test(4종 모두 기존 즉시 환불: CAS generation_failed 를 환불 앞에 — checkpoint-refund-guard 가 partial 을 recoverable 로 보고 admin review 로 돌리는 것 회피, 결제 회수 확인 선행으로 이중 환불 방지, 토스 unsettled, 완성 delivery_pending 은 서비스 완성 검사가 있을 때만 구제).
  - 경보 유지(KNOWN_STUCK_SETTLE_GAPS 2): celestial-harmony — 결제 증빙(sourceTransactionId·paymentRef·metadata.billing)을 실패 시점 요청 access 로 쓰고 insert 에 저장하지 않아 크론에선 이용권 외(코인·월정석·카드) 환불 증빙이 없음 → 증빙 재구성 리팩터 필요. fortune — 환불이 요청 범위 consumePayload(미저장)에 의존하고 코인 환불은 Request 필요, 기존 stale 처리(markSajuAIPromptStaleExecutionFailed)는 결제 보존(환불 없음) → 리팩터 없이 자동 확정 불가.
  - D2 실측: jest naming 5종 129 pass, 4종 각 98·199·208·142 pass; verify:paid-llm-delivery ok(정체 자동 확정 17개·경보만 2개, 변이 37/37·100/100); verify:naming-prompt PASS, verify:human-design-report·destiny-compass·nakshatra-ai-flow PASS; verify-payment-freeze 통과; paid-gate-auditor BLOCKING 은 human-design B1(회수 건 이중 환불) 1건 → 8b9b3fe64 로 수정.
  - D2 남은 위험(보고만): relationship refundExecution 반환값 항상 false(relationship-boundary-test.js:243, `result?.refundStatus` → 실제 형태는 settlement.status) → 정체 확정이 refundStatus pending·거짓 경보, 환불 자체는 됨. naming settleNamingRetryRefund 는 access 가 비면 not_required 로 닫음(fail-open, 2026-09-15 이후 문서는 access 저장). STE 없는 건(월정석 원장·실행 시작 실패)은 pending 경보만. unsupported 결과가 크론 회전 없이 continue(레거시 문서 큐 정체 가능). paid-flow-gates 트리거에 라우트·paid-delivery-stuck.js 없음. 실 Mongo CAS 미검증.
  - D1 남은 위험(보고만): delivery_pending 정체 건은 구조 대신 retryable 로 감(가정), 크론 동시 실행 경합 미검증, paid-flow-gates.yml 이 paid-delivery-stuck.js 변경에 트리거 안 됨, ziwei Payment 확인이 CAS 전에 돌 수 있음(경미), vedic 은 증빙 없을 때 refundStatus 가 not_required 대신 requested 로 기록(금액 영향 없음).
- [x] 정리: 이 문서를 `status: done`으로 바꾸고, 워크트리를 배수하고, 임시 파일을 지운다. (2026-11-22: D2 + 토스 세션 수정 cherry-pick 0612e3438d·87a1a6c955·060d0d1bc4 → main cdb1b8bb4c, CI success. 후속: celestial·fortune 증빙 리팩터, relationship refundExecution 반환값 오판(:243), 자미 이용권 환불 누락(:661-664), paid-flow-gates 트리거 공백)

## 실측 (단계마다 추가)

### A1·A2 서버 (2026-11-20, 서브에이전트, mock 만)
커밋(워크트리 `wt/saju-compat-premium-20261120-175330`, push·머지 안 함):
- f7af59f98 A1 계산 모듈 `worker/lib/saju-compat-premium-facts.js` + jest 6/6
- af940f015 A2-a 서버 SKU(`paid-feature-registry.js:367` saju-compat-premium 100코인/10,000원 "사주 고급 궁합", `compat-saju-compatibility` 유지) + P0 인벤토리(내 항목만 접합)
- d6d08605e A2-b 모델 `SajuCompatPremiumConsultation`(models.js) + 프롬프트 `worker/lib/saju-compat-premium-prompt.js`(4그룹 overview·temperament·trust·timing) + jest
- 3d365a0cb A2-c 라우트 `worker/routes/saju-compat-premium.js`
- 5c6d3dcf2 A2-e 행동 테스트 `__tests__/ui/saju-compat-premium-paid-delivery.behavior.test.js` (node --test 6/6)
- 740d2bf6c A2-d 배선·등록(공용 모듈은 등록 한 줄씩만)
- 8f37a3217 sitemap lastmod 재생성(paid-feature-registry 가 다수 라우트 import 그래프에 있어 서명 이동 — M 머지 뒤 다시 `npm run sitemap:generate` 필요)
- d50ef70b5 늦은 정산 models 에 MonthlyCreditLedger 추가(감사 지적 3). 이 커밋의 `npm run check:fast` 는 test:node 5536 통과·1 실패 — 실패는 `__tests__/fortune/sky-and-range.test.mjs` 가 워크트리에 없는 gitignore 산출물 `fortune/data/daily-2026-11-20.json` ENOENT(환경, 무관; `npm run fortune:build-data` 후 재확인 가능)

설계 결정(계획과 다른 점): 계획의 love-secret 식 자체 정산기 대신 **신년운세식 공용 경로**를 따랐다.
`RETRY_FIRST_POLICY` = `{ marker: "retryableFailureMeta", settle: { symbol: "expireRetryableConsultations", cron: RECOVERY_CRON, generic: true } }`.
이유: 검증된 공용 환불 엔진(`settleFailedConsultationRefund`)을 재사용하고 공용 파일 diff 를 한 줄씩으로 줄여 R10 과의 충돌면을 최소화.
등록 위치: `paid-delivery-stuck.js` GENERIC_STUCK_SETTLERS, `consultation-delivery-refund.js` import+SERVICES, `consultation-recovery-task.js` loadAdapters, `consultation-recovery-registry.js`(어댑터·계약·테스트), `security/index.js` CHECKPOINT_RESUME_MODELS(재개 호출은 batch 버킷), `scripts/lib/paid-delivery-inventory.mjs`, `scripts/verify-paid-llm-delivery-contract.mjs` RETRY_FIRST_POLICY, `worker/index.js` lazy 핸들러+`/api/saju-compat-premium` 분기. KNOWN_RETRY_PENDING·KNOWN_REFUND_GAPS·KNOWN_STUCK_SETTLE_GAPS 불변. auth.js 경로 목록은 RED 라 건드리지 않음.

요청 5 구현: 한 요청 = 한 그룹 생성·체크포인트(`llmMeta.groups.<key>`). /retry·복구 크론 재개 모두 완성 그룹은 고르지 않고 빠진 그룹만 생성. 다시 시도 reset(`sajuCompatPremiumRetryReset`)은 완성 그룹의 행·시도 수를 그대로 두고 미완성 그룹만 비운다. 완성 전 본문 비노출.
테스트가 단언: overview·temperament 저장 → trust 2회 실패 → /retry → LLM 호출은 `['trust','timing']` 뿐, 저장 행 바이트 동일, 차감 1회. 변이(리셋이 전부 비우게) 시 이 테스트만 실패하는 것 확인.

검증 명령(전부 exit 0):
- `npm run verify:paid-llm-delivery` — 다시 시도 우선 8개, 계약 37, 변이 37/37·32/32
- `verify:paid-feature-billing-policy`, `verify:ai-prompt-billing-policy`, `verify:ai-consultation-flows`(5/5), `verify:staging-llm-mock`, `verify:worker-security-guards`, `verify:payment-p0-inventory`(173종), `verify:payment-freeze`
- `node scripts/run-mock-tests.mjs jest security.ai-route-buckets + 프롬프트·facts` 69/69
- `node scripts/check-changed.mjs --profile=fast --skip-build --committed-head --base=d6d08605e` → 처음 sitemap 드리프트로 막힘 → 재생성 커밋 8f37a3217 후 나머지 검사 통과
- paid-gate-auditor: 차단 사유 없음. 비차단 위험은 아래.

프런트 API 계약(A3 입력):
- 공통: 로그인 필수(401 `LOGIN_REQUIRED`). 본문 JSON. 에러는 `{ok:false, reason, message}`.
- `POST /api/saju-compat-premium/prepare` body `{ self, partner, relationType, idempotencyKey(≥12자) }`
  (person = `{ birthDate:'YYYY-MM-DD', birthTime?:'HH:mm', birthTimeUnknown?:bool, gender:'male'|'female', name?, calendar? }` — facts 정규화 기준)
  → 200 `{ok:true, validation:{version,mode:'validate',self:{dayPillar,timeUnknown},partner:{...}}, accessType}`
  → 402 `{ok:false, reason:'PAYMENT_REQUIRED', validation, paymentPayload}` (paymentPayload = coin-gate 결제창 payload, featureKey `saju-compat-premium`, amountKRW 10000, coinPrice 100)
  → 400 `INVALID_INPUT` / 422 `CALCULATION_FAILED {side}`
- `POST /generate` body = prepare 와 같은 입력 + idempotencyKey + 결제 증빙(billingGate/billingConsume/paymentId 등, 신년운세와 같은 키) 또는 `{ resumeSessionId }`
  → 202 `{ok, sessionId, resumeSessionId, status:'partial'|'generating', progress:{completed,total:4}, continue?}` — 클라이언트는 `{resumeSessionId}` 로 /generate 를 반복(한 요청 한 그룹, ~90초 이내)
  → 200 `{ok, sessionId, status:'completed', saved:true, accessType, relationType, progress, result}` (result = assembleSajuCompatPremiumResult: chapters[4], staticCards(pastLife·partner.timeUnknown 등), actionTips, temperamentCaution …)
  → 402 `PAYMENT_REQUIRED {paymentPayload}` / 409 `GENERATION_FAILED` + retry
  → 503 `{reason:'LLM_ERROR', sessionId, refunded:false, retry:{available:true, refundAt, sessionId}}`
  → 503 `RESULT_STORAGE_UNAVAILABLE`/`RESULT_DELIVERY_PENDING` (같은 세션으로 재시도)
- `GET /result?sessionId=` → 200 완성본 / 202 진행 중(`continue:true` 면 /generate 재개) / 409 `GENERATION_FAILED {retry}` / 403 `PAYMENT_REVOKED`·`PAYMENT_REFUNDED`
  `GET /result` (sessionId 없음) → `{ok, pendingSessionId, sessions:[{sessionId,relationType,selfName,partnerName,createdAt,updatedAt}]}` (보관함용, 최근 10건)
- `POST /retry {sessionId}` → 무료 이어쓰기(추가 결제·차감 없음). 응답은 /generate 와 같음.
- `POST /refund-request {sessionId}` → 200 `{ok, sessionId, refunded, refundStatus}` / 409 `NOT_RETRYABLE`

남은 위험·A3 필수:
1. 🔴 월정석: 클라이언트가 deferUsage 없이 즉시 차감하면 `finishDelivery` 가 `MONTHLY_CREDIT_GATE_REQUIRED` 로 delivery_pending 에 갇힌다. A3 는 `NewYearAiClient.tsx:790-791` 처럼 `deferUsage:true, usagePolicy:"apply_after_success"` 를 보내고 `verify-new-year-ai-flow.mjs:66-67` 같은 단언을 추가할 것.
2. 코인만 결제 건의 환불은 공용 엔진에서 manual_review 로 간다(신년운세와 동일).
3. 테스트는 이용권 접근만 다룬다. 월정석/deferred·직접 결제·증빙 재사용(409) 경로는 코드 읽기로만 확인.
4. paid-flow-gates.yml 트리거 glob 이 `worker/routes/*-ai.js` 라 이 라우트·prompt·facts 단독 변경은 그 워크플로가 안 돈다(CI 변경 = RED, 사용자 결정 필요).
5. 공용 파일(paid-delivery-stuck·consultation-delivery-refund·검증기)을 R10 도 수정 중 — M 머지 때 한 줄 충돌 가능.
6. (A3 에서 payment-gating.md:375 가격 정정 완료) 범위 밖 보고: P0 인벤토리 재생성 시 saju-guardian-unlock 5000→3000 드리프트(기존), `docs/context/payment-gating.md:375` 가 compat-saju-compatibility 를 10,000원으로 적음(레지스트리는 5,000원).
7. (A3 에서 적용·패치 삭제 완료) 카탈로그 표시 전환(js/core/service-registry.js·lib/saju/saju-service-catalog.mjs)은 감사가 가격 불일치를 지적해 A3 로 미룸 — 패치 보관 `.tmp/a3-registry-switch.patch`(미추적, A3 에서 적용 후 삭제).

### B 사주 탭 무료 궁합 + 달빛 예화 CTA (2026-11-20, 서브에이전트, mock 만)

커밋(워크트리 브랜치, push·머지 안 함):
- a3860d093 고급 궁합 페이지 prefill 리더(`premium-delivery.ts` readPremiumPrefill: sessionStorage `cd:sajuCompatPremium:prefill:v1`, 30분 TTL, 읽으면 삭제, 형식 검증; URL 에 개인정보 없음)
- c33c7ed25 runCompat 무료화(정적 analyzeCompat+전생, 시간 모름이면 정오 안내), 레거시 결제 대기만 재개(`_seSajuCompatLegacyPending`), 달빛 예화 CTA(`_seSajuCompatAppendPremiumCta`, `.cd-scp-*` in fortune-ui.css), 쇼케이스·배지(기본 무료/고급 궁합 10,000원, i18n 4키), 상품 상세 notice 3곳, 마케팅 ctaNote, SEO 소개(description·FAQ “네, 기본 궁합은 무료”·시간 모름=정오), test 227 갱신, verifier fail-closed 단언(runCompat 본문에 게이트·레거시 진입 호출 금지, 변이로 무는 것 확인), sync:public 미러, sitemap 원장 재생성

검증(실측): verify:paid-feature-billing-policy PASS; node --test saju-bundle-copy·feature-visual-details·saju-compat-zero-hour·saju-crafted-static 43/43, per-use-price-parity·feature-marketing-copy-generated 8/8; verify-payment-policy-md 통과; check:fast 1차 sitemap drift 실패 → sitemap:generate 후 재실행 exit 0(jest 486 suites/8333 pass). paid-gate-auditor 조건부 PASS(결제 verify 9종·freeze 통과). 화면(next dev :3127, Playwright 390px, 결과 세션만 로컬 stub): 시간 모름/앎 두 경우 CTA·href·문구 렌더, 시간 모름만 정오 안내, 결제창 0, pageerror 0, CTA 클릭 → prefill 저장 → 고급 궁합 입력에 서윤·1995-03-14·09:00·도윤·1993-08-02 채움(모름=체크박스 on / 앎=14:30), 읽은 뒤 키 삭제. visual-checker: CTA 카드 PASS(대비 9.6~13.8:1, 버튼 48px), 정오 안내 PASS. 결과 전체·prefill 화면 재촬영본(scratchpad shots) 재판정 회수(같은 날): CTA 카드·prefill 나 칸(서윤·1995-03-14·09:00) PASS. 결과 상단·끝 촬영본은 점수/등급과 CTA 가 프레임 밖이고 페인트 전 빈 띠가 찍혀 판정 불가, partner 촬영본은 나 칸과 바이트 동일(스크롤 누락)이라 판정 불가 → A4 에서 재촬영: 결과 상단은 #compatResult scrollIntoView+대기, 끝은 .cd-scp 카드 scrollIntoView, partner 는 상대 fieldset 으로 스크롤해 모름/앎 두 장 따로.

남은 위험(B):
1. 서버 `paid-feature-registry.js:284` compat-saju-compatibility 에 saleEnabled:false 없음 — 낡은 번들·직접 호출로 5,000원 판매 가능. 선례(명리 타로·운명의 섬)는 서버에서 닫음. RED(결제 정본)라 사용자 결정 필요. payment-gating.md 에 무료 전환 절 미기재.
2. 홈 레지스트리 별칭 runCompat → saju-compat-premium(`js/core/service-registry.js:959`)은 home-service-finder 중복 제거에만 쓰여 게이팅 영향 없음 — 수정 안 함(홈 검색엔 고급 진입만 노출).
3. `_seSajuCompatLlmEntry` 호출부 0, `se_23638_call_confirm` 키 미사용 — 레거시 보존 요구로 남김.
4. 무료 결과에 CompatLlm 프롬프트 모듈(서버 비용 0)이 함께 붙음 — 기존 정적 경로 동작 그대로.
5. prefill relationType: love→dating, 그 외 빈 값→dating(고급은 연애형 옵션만).
6. CTA 잔가지 장식이 우상단에서 설명 2행 끝에 옅게 겹침(뒤 레이어·대비 10.6:1 유지) — 필요 시 크기 축소.
7. fortune-ui-home.css 미재생성(새 선택자는 홈 밖). docs/product-details/product-ledger.json·docs/toss/full-service-inventory.json 의 runCompat/LLM 언급 미갱신.
8. 화면 확인 팁: /ggulggul/ 는 모바일 지연 장착이 #resultPage 를 떼어 낸다 → `location.hash='resultPage'` 후 계산.

### A3 프런트·보관함·SEO (2026-11-20, 서브에이전트, mock 만)

커밋(워크트리 브랜치, push·머지 안 함):
- e0afd07bc 입력·결과 페이지(`app/saju/compatibility/premium/`, `result/`), `_lib/premium-delivery.ts`, dev-preview fixture(`lib/dev-preview/fixtures/saju-compat-premium.ts`), `scripts/verify-saju-compat-premium-flow.mjs`(+ `verify:ai-consultation-flows` 체인), 프롬프트 랩 제외 등록, 리뷰 카탈로그 love-coach 에 키 추가
- b82dcaf26 보관함: `lib/records/service-registry.js`·`reading-registry.js`(view 'saju-compat')·`SavedServiceReading.tsx`, record-library 테스트
- f43d058a7 SEO: 소개 페이지 달빛 예화 진입 카드(`PremiumCompatEntry.jsx`, tea-saju-compat 이미지), 소개 문구에 고급 궁합 10,000원(“무료” 주장 제거), `/saju/compatibility/premium*` noindex(index-policy·_headers·public/_headers·adsense 원장·index-policy 테스트), sitemap lastmod 재생성, payment-gating.md:375 가격 정정(5,000원/cost 50)
- 2914c74fb 카탈로그 표시 전환(js/core/service-registry.js·lib/saju/saju-service-catalog.mjs) + sync:public 미러 + generated JSON + feature-visual-details 인벤토리(recordFeatureKey 분리)
- 6c08b6e93 화면 검증에서 나온 대비 수정: premium.module.css 가 /saju 어두운 몸체 위에서 진한 글자를 쓰던 문제 → 화면 자체 밤 표면·밝은 토큰

흐름: prepare → runBillingCoinGate(`buildBillingGateInput` 은 verify:paid-gate-price-coverage 때문에 클라이언트 파일 안에 둠, `deferUsage:true`·`usagePolicy:"apply_after_success"`·membershipCreditCost 1000) → generate 루프(resumeSessionId) → 완성본만 결과 화면, 실패 시 무료 다시 시도·환불 요청. idempotency 키는 결과 이동 때 초기화.

검증(실측):
- check:fast: test:node·결제 verify 전부 통과, jest 2건(admin-prompt-lab-coverage·review-catalog-moderation) 실패 → 등록 후 개별 재실행 65/65 통과. CSS 수정 뒤 check:fast 전체 재실행 exit 0(jest 포함).
- verify 통과: checkout-pass-card, portone-single-payment, ai-prompt-billing-policy, pass-tier-policy, payment-p0-inventory, paid-feature-billing-policy, payment-freeze, paid-llm-delivery, paid-resume-wiring, paid-gate-no-dead-end, paid-gate-scope, paid-feature-common-flow, paid-service-offer, paid-gate-profile-scope, paid-access-integrity, paid-gate-price-coverage, saju-compat-premium-flow(변이 deferUsage:false → exit 1 확인)
- 단위: saju-service-catalog.static 4/4, home-service-finder 45/45, index-policy 11/11, feature-visual-details 15/15, record-library 32, records-reading-content 6, tsc 0, lint ok, sitemap drift OK
- paid-gate-auditor: 조건부 PASS(문구·verify 배선·크레딧 fallback·키 초기화 반영)
- 렌더(next dev :3127, Playwright 390px): `/saju/compatibility/` 200 index·진입 카드·이미지 로드 확인, `/saju/compatibility/premium/` 200 noindex, `result/?preview=success|failed|truncated` 200 noindex·pageerror 0. visual-checker: 1차 대비 실패(1.29:1) → CSS 수정 후 입력·성공·실패·중단 PASS(제목 13:1, 본문 9.5:1 이상). 성공 화면 정적 카드 + 4장 렌더·비난조 라벨 없음, 실패 화면 무료 다시 시도·환불 요청 노출, 미완성 본문 비노출.

남은 위험:
1. B 에서 “기본 궁합 무료” 문구를 넣을 때 `__tests__/ui/saju-bundle-copy.static.test.js:227`(무료 주장 금지 단언)·정적 셸 레거시 문구·feature-visual-details 인벤토리를 함께 바꿔야 한다.
2. 감사 2: `/prepare` 가 진입 때 이용권을 판정(AI 상담 11종 기존 패턴). 감사 6: 홈 레지스트리 `saju-compatibility` 항목이 aliases `runCompat` 을 유지한 채 고급으로 바뀌어 레거시 5,000원 상품이 따로 안 보일 수 있다(미검증).
3. paid-flow-gates.yml 트리거가 `app/saju/**` 를 덮지 않는다(CI 변경 = RED, 사용자 결정).
4. 프롬프트 랩 미등록(제외 사유만 등록).
5. verify:adsense-readiness 는 dist 가 필요해 로컬 미실행 — CI 에서 확인.
6. 입력 화면 경미: 날짜 placeholder 대비 2.44:1, “태어난 시간” 칸만 어두운 바탕(대비 6.2:1 통과). A4 에서 재확인.
7. 전체페이지 스크린샷에서 lazy 이미지가 단색으로 찍힐 수 있다(요소 스크린샷으로 실렌더 확인) — A4 촬영 때 주의.

### A4 화면 검증 + 레거시 판매 종료 (2026-11-20~21, 서브에이전트, mock 만)

커밋: 74e366e8b(`compat-saju-compatibility` saleEnabled:false, 가격 50 유지, payment-gating.md 기록, 테스트 2건), b74a3a499(입력 placeholder·태어난 시간 칸 CSS + sitemap 원장 재생성).

- 판매 종료 선감사: paid-gate-auditor·regression-scout 모두 SAFE. assertFeatureEnabled 는 신규 과금 진입점에서만 불리고, 재열람(/api/saju-compat-basic/generate·보관함·_seSajuCompatLegacyPending·_seRunSajuCompatResume·Toss 네이티브·복구)은 판매 상태를 읽지 않는다.
- verify 전부 exit 0: paid-feature-billing-policy, payment-policy-md, payment-freeze, payment-p0-inventory, app-store-billing-policy, paid-llm-delivery, paid-gate-price-coverage, paid-access-integrity. jest(run-mock-tests) 6 suites 200/200, node --test per-use-price-parity 1/1·native-saju-compat 1/1.
- check:fast: 1차 sitemap drift → sitemap:generate → 재실행 exit 0(jest 8 suites 116/116, node --test 47/47 등).
- 화면(next dev :3127, headed Chrome, 390 isMobile·1280, 쿠키 동의 사전 설정, 결과 세션만 로컬 stub): visual-checker 판정 30+2장. 무료 궁합 상단(B급·73/100)·CTA·끝(탭바 비겹침, 시간 모름만 정오 안내), prefill 나(사용자·1995-03-14·09:00·여성)·상대(모름=빈 칸+체크 / 앎=14:30), 진입 카드(실제 일러스트·CTA), 입력 390 우측 여백 16px·가로 넘침 없음, success 4장·failed(다시 시도+환불 요청)·truncated(안내+이어서 보기) 모두 PASS. truncated 버튼이 흐린 것은 preview 모드 disabled(의도).
- A3 경미 항목: placeholder 2.44:1 → 4.83:1, 태어난 시간 칸 배경 #fffaf3 로 다른 칸과 일치(수정). CTA 카드 꽃가지 겹침은 최악 5.67:1 로 가독성 문제 없음 → 변경 없음.

남은 위험·후속(보고만):
1. Google Play: 판매 종료 전에 만든 intent 의 verify/restore 가 PRODUCT_SALE_DISABLED 를 낼 수 있다(app-store.js:1138·:358·:383, payment-gating.md:399 와 상충). 미승인 Play 구매는 자동 환불이라 금전 손실은 없다.
2. 이용권 복귀 재게이트(destiny-profile.js:5054)·coin-gate 같은 requestId 재생이 403 — 사용자 혼란, 금전 손실 없음. PRODUCT_SALE_DISABLED 문구가 "준비 중"으로 읽힌다.
3. docs/product-details/product-ledger.json:965 saleStatus 미갱신. Toss 네이티브는 판매 상태 검사가 없다(나중에 승인될 경우 대비).
4. 상대 시간칸에 포커스 후 비워 두면 blur 가 12:00 을 다시 채워 시간을 아는 것으로 처리된다(js/destiny-profile.js _dpBindTypedBirthInputs, 기존 동작). 상대 성별은 궁합 폼에 없어 prefill 안 됨(설계).
5. 무료 궁합 등급 배지(흰 글자/파란 그라데이션) 대비 3.1~3.55:1 — 기존 디자인, 범위 밖.
6. CTA·진입 카드 머리말 "달빛 아래 연이가 쓰는 두 사람의 이야기" — 11-19 달빛 명칭 폐기 결정 범위에 문구도 들어가는지 확인 필요.
7. 빈 입력의 시간칸에 "08:35" 회색이 보인다(placeholder 예시로 추정, 미확인).
8. M 머지 때 루트 main 이 앞서 있으므로 fetch 후 머지, 머지 뒤 sitemap:generate·sync:public 재실행 필요.

### M 머지·push (2026-11-21, 서브에이전트, mock 만)

루트 체크아웃 `d:\Development\code-destiny` 에 다른 세션(홈 서비스 찾기·allFortunesFilter)의 미커밋 추적 변경 28개가 있어 루트는 건드리지 않았다(조율 결정). 워크트리에서 origin/main 을 머지하고 `git push origin HEAD:main`(fast-forward) 했다. wt 브랜치 자체는 push 안 함.
🔴 루트 체크아웃은 그 세션이 미커밋 작업을 커밋한 뒤 소유 세션이 `git pull --ff-only` 해야 한다.

- 머지 1: 08e169807 (origin/main 8d76d7cc9, 충돌은 `config/sitemap-lastmod.json` 하나 → main 쪽 채택 후 재생성) + 8ce69cdb1 (sync:public cache-bust 해시·sitemap 원장 재생성)
- check:fast(`--base=origin/main`, 머지 영향 전체): jest 488 suites/8382 pass, exit 0. check:pre-push exit 0.
- origin/main 이 12커밋 전진 → 머지 2: b7f914571 (같은 원장 충돌, 같은 처리) + d81e6591e (재생성). 델타 check:fast(`--base=8ce69cdb1`) jest 488/8382 exit 0.
- 다시 2커밋(docs·test) 전진 → 머지 3: 4e4f6cda1. 그 테스트(daily-tarot-guided.behavior) 5/5, check:pre-push exit 0.
- push 1: `88cb09326..4e4f6cda1`. CI 1회 확인: 🔴 AI Locale Gate 실패 — 새 라우트 `worker/routes/saju-compat-premium.js` 가 `config/ai-locale-call-inventory.json` 에 없었다(우리 브랜치 누락, 머지 무관). `audit-ai-locale-calls.mjs --write` 로 재생성(그 항목 추가 + 줄 번호 이동만), 게이트 3스크립트·verify:ai-locale-pipeline 로컬 통과 → 33c1c3ac6.
- 첫 verify:staging(4e4f6cda1): 스테이징이 아직 1289bb804 라 SHA 불일치 FAIL(배포 미완, 기능 실패 아님).
- push 2: `4e4f6cda1..65d1d4c03`(인벤토리 수정 + 이 문서). verify:staging `--sha=65d1d4c034433abd475473e47689c72e3154561b` PASS(Pages·Worker 모두 65d1d4c03). 프로덕션 승격 없음.
- 65d1d4c03 CI 1회 확인: AI Locale Gate·Release·Landing·drift watchdog 통과. 🔴 Secret Scan(gitleaks 전체 이력) 실패 — 5c6d3dcf2 행동 테스트의 `scp-key-*` idempotencyKey 3곳(184·232·247행) generic-api-key 오탐. 기존 관례대로 `.gitleaksignore` 에 정확한 지문 3개 등록(bfbed2aff, gitleaks-config 테스트 5/5). PR CI 는 확인 시점에 진행 중.
- 다음 확인: 이 문서 커밋의 push 뒤 Secret Scan·PR CI 결과를 다음 세션이 `gh run list --branch main --limit 10` 1회로 확인.

### C·D 실측 (2026-11-21)

Base `58ed3c39d` (= origin/main). Worktree `D:\Development\codedestiny-worktrees\delivery-gaps-c-20261121-215250`, branch `wt/delivery-gaps-c-20261121-215250`. Code reading only; nothing executed yet.

**감사 항목 판정**

| # | 판정 | 근거 (현재 코드) |
|---|---|---|
| 1 | OPEN | `worker/lib/feature-question-delivery.js:71` is still the only place that passes `onExhausted`. The other `runPaidNarrativeDelivery` callers (expert-follow-up, guardian, love-tarot, mindscan, tarot-oracle, animal-totem, dream, oracle, pet-saju-ai, saju-compat-basic, yoga-guru, toss native 4 files) pass none. The engine imports nothing from paid-delivery-stuck. |
| 2 | OPEN, request-5 violation | `paid-narrative-delivery.js:47-49` sets `limited` when a missing part has attempts>=2. `:197-200`: once `partialReview` is set (limited and at least one part saved), `missing` is empty, so nothing is ever generated again. No path reopens it, so the result stays smaller than what was paid for. `:272-281` claims exhaustion only when `parts` is 0. |
| 3 | OPEN | `checkpoint-refund-guard.js:48-49`: the server-resume pair returns `recoverable` without checking attempts, exhaustionClaimed, reviewRequired, or age. `:51`: 14 hardcoded featureKeys return `recoverable` without the `includeResumable` gate, so an explicit close also cannot refund. `service-execution-task.js:846-857` only pushes nextRetryAt forward (on a non-timeout reason it also sets adminReviewRequired). Result: permanent pending. |
| 4 | OPEN | `paid-narrative-recovery-task.js`: IDLE_MS 300000, MAX_AGE_MS 86400000. Resume stops after 24h and on reviewRequired/exhaustionClaimed. After that, only `paid-narrative-monitor.js` sends an operator alert once (no refund). |
| 5 | Not re-checked (C3 scope) | Only the love-secret line moved: `love-secret-ai.js:1799` (`REPRESENTATIVE_FACTS_MISMATCH` 409). The other lines need re-confirmation when C3 starts. |
| 6 | OPEN (accurate, D scope) | All 12 entries in `KNOWN_STUCK_SETTLE_GAPS` (`verify-paid-llm-delivery-contract.mjs:67-71`) are absent from `STUCK_SETTLERS` in `paid-delivery-stuck.js`. The R10 retry-first services (astrology, vedic, ziwei, sukuyo, naming, karma) have a 7-day retry-window settle (RETRY_FIRST_POLICY), but no settle for a stuck isolate. The list is not stale. |

**검증기 목록 재도출**
- KNOWN_REFUND_GAPS: 13 entries (L59-63). All are still gaps in the narrative engine or route-bound refunds.
- KNOWN_STUCK_SETTLE_GAPS: 12 entries, accurate (see above).
- KNOWN_RETRY_PENDING: 22 entries (L107-112). The narrative family (feature-question, tarot-oracle, love-tarot, mindscan, dream, yoga-guru, saju-compat-basic, pet-saju-ai, geomancy-oracle, animal-totem, guardian-fortune, toss-native) does not meet the 4 RETRY_FIRST_POLICY evidence items: the marker import, `/retry`, `/refund-request`, and the cron settle symbol. C2 can remove these only where the evidence genuinely passes.

**요청 5 위반 (이미 저장된 장을 다시 생성하거나 결과를 줄이는 경로)**
- Narrative engine `paid-narrative-delivery.js:197-200`: an exhausted part is never reopened, so the result shrinks. This is the C2 core.
- karma `karma-destiny-ai.js:2775-2779`: when a doc in `generating` has a different `schemaVersion`, it is regenerated from scratch. Billing is deferredUsage, so there is no money loss, and it only happens on a schema bump (current REPORT_SCHEMA_VERSION=2). `partial`/`delivery_pending` with a mismatched version gets 409 `REPORT_SCHEMA_CHANGED` at `:2973`. Low risk; leave as is, report only.
- Shared reopen in `paid-delivery-stuck.js` (`reopenRetryableConsultation`), the representative 7 services, and the R10 services: they keep saved chapters, reset only the budget and lock, and fill only the missing chapters (2026-11-20 Explore audit, consistent with current code).

**C1·C2 설계 메모 (구현 전, 이어받는 쪽 필독)**
- 🔴 Do not simply have the guard return `missing`. `service-execution-task.js:434` `runCoinRefund` skips when `sourceTransactionId` is absent, and narrative executions don't have one. Coin purchases would end as refund_failed with nothing restored. Only passes have a fallback, via `runPassQuotaRefund` `:487` `passUsageEvidenceId(userId, featureKey, idempotencyKey)`. The claim "코인 자동 복원" in `consultation-recovery-registry.js:33` NARRATIVE_CARD_GAP is likely wrong (needs re-check).
- C1 (guard): apply the `includeResumable` gate to the 14 keys in `:51`, the same way as `:48`. Make records with exhaustionClaimed or a closed retry window terminal (not `recoverable`). Keep R1 behavior (hold while inside the window).
- C2 (engine): on exhaustion, whether 0 or some parts are saved, record `paidNarrative.retryable {since, refundAt=createdAt+7d, code}` and let a retry entry reset attempts **only for missing or exhausted parts** (saved parts stay as they are). After 7 days or on a customer request, refund through each product's existing refund adapter (route-bound refunds like feature-question's `refund(state.paymentProof, state.body)` are a constraint: for a settle from cron, the adapter needs to store a re-callable payment proof). Wire it to the cron chain, then remove from the verifier lists only the items that pass.
- Pitfalls: toss native esbuild stubs, mongo index shape registration, CRLF, regenerating ai-locale-call-inventory, re-running sitemap:generate.

### C1 가드 판정 정정 (2026-11-21, 서브에이전트, mock 만)
커밋: ef3b6b83e (워크트리 브랜치, push·머지 안 함. C2와 한 묶음으로 push한다)

**복원 경로 실측(편집 전, 코드 읽기).** 서술형 레코드(`paid-narrative-delivery.js` insert)에는 `sourceTransactionId`·`cost`·`paymentRef`가 없다. idempotencyKey는 body.requestId다.
- 코인: `runCoinRefund`는 sourceTransactionId가 없으면 건너뛴다. 환불하면 아무것도 복원하지 못하고 refund_failed로 끝난다.
- 이용권: `runPassQuotaRefund`가 `passUsageEvidenceId(userId, featureKey, idempotencyKey)`로 대체 조회한다. 아마 복원될 것이다(미검증).
- 월정석: `runMonthlyCreditRefund` 토큰에 idempotencyKey가 들어 있다. V2 원장과 맞는지는 미검증이다.
- 단건 카드: paymentRef가 비어 있어서 `runPaymentCancel`은 skipped다.
- 결론: 지금은 서술형 실행이 스윕으로 자동 복원되는 경로가 사실상 없다(가드가 늘 recoverable을 돌려줬다). 자동 환불이 실제로 일어나는 곳은 feature-question의 라우트 결합 `onExhausted` 하나뿐이다. `consultation-recovery-registry.js:33` NARRATIVE_CARD_GAP의 "이용권·코인·월정석만 자동 복원" 문구는 코인 부분이 사실과 다르다. C2에서 고친다(C1에서는 손대지 않음).

**결정: C1에서는 환불하지 않고 `held`로 보낸다.** 코인·카드 복원을 증명할 수 없어서 조용히 실패하는 환불을 막기 위해서다.
- 바뀐 곳은 `worker/lib/checkpoint-refund-guard.js`(`paidNarrativeHoldCode`, `paidNarrativeHoldUntil`, `PAID_NARRATIVE_FEATURES` Set으로 하드코딩된 14개 키를 대체)와 `worker/lib/service-execution-task.js` `settleExecutionById`의 held 분기다.
- held가 되면:
  - status는 pending으로 유지하고(스키마 enum이 닫혀 있고, 서술형 재개가 pending에 의존한다) 저장된 장도 그대로 둔다.
  - refundStatus는 none, 환불 클레임은 없다. 잠금은 해제한다.
  - nextRetryAt은 createdAt+7d로 둔다. 이미 지났으면 now+24h로 둔다.
  - reasonCode에는 아래 코드 중 하나를 쓴다.
  - 명시적 닫기(includeResumable=false)면 `compensation.adminReviewRequired=true`도 붙인다(paid-gate-auditor 지적 1을 반영).
- held 코드(우선순위 순서):
  1. `PAID_NARRATIVE_EXHAUSTION_CLAIMED`
  2. `PAID_NARRATIVE_REVIEW_REQUIRED`(복구 태스크의 reviewRequired)
  3. `PAID_NARRATIVE_EXHAUSTED`(v1: 빠진 장 attempts≥2, v2: 모든 장이 저장됐거나 attempts≥4)
  4. `PAID_NARRATIVE_RESUME_WINDOW_CLOSED`(생성 후 24h 초과, 복구 태스크의 MAX_AGE와 같다)
  5. `PAID_NARRATIVE_CLOSE_REQUESTED`(명시적 닫기 + 저장된 장 0개)
- includeResumable 게이트: 하드코딩된 14개 키와 재개 키 쌍을 같은 규칙으로 처리한다. 진행 가능한 레코드가 recoverable이 되는 조건은 includeResumable이거나 저장된 장이 1개 이상인 경우다. 진행 불가면 held다.
  - 동작 변화: 재개 키 쌍(expertFollowUp, featureQuestion×4, fortune-chat)을 장 0개 상태에서 명시적으로 닫으면, 예전에는 환불 클레임으로 떨어져 refund_failed가 됐다. 이제는 held다.
- R1 유지: 기한 안의 retryable 마커는 계속 hold다(기존 테스트 그대로 통과).
- 무료 재개는 막히지 않는다. 복구 cron(`paid-narrative-recovery-task.js`)은 nextRetryAt이 아니라 timeoutAt·createdAt으로 대상을 고른다.

**검증(실측)**
- TDD: 적색 10 failed / 48 passed → 녹색 `node scripts/run-mock-tests.mjs jest --runInBand __tests__/worker/checkpoint-timeout-refund.test.js` 58/58 통과.
- 관련 묶음(heukwol, paid-narrative-*, saju-compat-basic-delivery, service-execution-*, card-single-payment-auto-refund, feature-question-*, checkpoint): 19 suites, 355/355 통과(adminReviewRequired 보강 전에 실행).
- `npm run verify:paid-llm-delivery` ok: 계약 37개, 변이 37/37, 60/60 탐지.
  - 함정: 가드 주석에 `runPaidNarrativeDelivery` 토큰이 들어가면 PAY_RE에 걸려 "미분류 유료 LLM 파일"로 실패한다. 주석에는 파일명으로 적는다.
- paid-gate-auditor: 금지 패턴 위반 없음, 돈 나가는 경로·이중 환불 경로 없음. verify:payment-freeze 통과, payment-p0-inventory PASS, payment-concurrency-guards OK, payment-service-boundary PASS.
- `npm run check:fast` exit 0(critical 승격, 전체 jest 489 suites 통과·1 skipped, 8459 tests 통과). verify:paid-llm-delivery 재실행 ok.
- CRLF: 편집한 파일 모두 CR 0.

**남은 위험(C2 이후로 넘김)**
- held는 7일 뒤에도 하루마다 다시 held될 뿐 환불되지 않는다. "7일 뒤·요청 시 환불"은 C2 전까지 서술형에서 미구현이다. 다만 예전에도 이 레코드들은 환불되지 않았으므로 새 손실은 아니다. C1만 단독으로 운영에 내보내지 않는다.
- held(pending) 레코드는 같은 결제 근거의 다른 환불을 `FUNDING_ACTIVE_OR_COMPLETED`/`EXECUTION_DELIVERED`로 막는다(`refund-delivery-protection.js`, `coin-refund-eligibility.js:72-84`). recoverable 때도 같았다. C2 어댑터는 같은 executionId로 정산해야 한다.
- 범위 밖(보고만):
  - held·recoverable 분기의 갱신 필터 `"lock.token": execution.lock?.token`이 생성 중인 uuid 잠금과 일치하면 잠금을 비울 수 있다.
  - `/executions/fail`에 사용자가 reasonCode `timeout_auto_refund`를 보내면 includeResumable이 켜진다.
  - `compensation.adminReviewRequired`가 스키마에 선언되지 않아 strict 모드에서 버려질 수 있다(미검증, 기존 분기도 같다).
  - 브라우저 재개에는 나이 제한이 없다.
  - 두 파일이 `paid-flow-gates.yml` 트리거에 없다(change-risk가 `deepRequired=false`로 판정).
  - payment-p0-inventory.json의 sha가 현재 파일과 다르다. 강제하는 검사는 없다. `node scripts/audit-payment-p0-inventory.mjs`로 재생성할지는 선택이다.
  - 검증 안 함: toss 네이티브 서술형(`worker/toss/native-pet-paid.js`)의 sourceTransactionId, 그리고 deliveryStatus failed + status pending 레코드를 클라이언트가 어떻게 표시하는지.
- feature-question의 exhaustionClaimed 건은 onExhausted가 이미 환불했는데 held(pending)로 남는다. C2가 failureResult를 근거로 종결해야 한다.

**C2 포인터(이어받는 쪽 첫 행동)**
1. held 조회: status pending, reasonCode가 `PAID_NARRATIVE_*`, nextRetryAt ≤ now. 스윕(`lockNextTimedOutExecution`)이 7일 시점에 다시 집어 `settleExecutionById` → 가드 → held로 돌아온다. C2는 이 held 분기 앞에서 "환불 시점 도달 + 복원 증명 가능"이면 어댑터 환불로 가게 한다. 판단 근거: `paidNarrativeHoldUntil`, createdAt+7d.
2. 다시 시도 리셋: `paid-narrative-delivery.js:197-200`. 빠진 장과 소진된 장의 attempts만 0으로 되돌리고, `exhaustionClaimed`는 그대로 둔다. 저장된 장은 유지한다. reasonCode는 비우고 nextRetryAt은 now로 되돌린다. 그러지 않으면 7일 동안 스윕이 다시 보지 않는다.
3. 환불 어댑터: feature-question의 `refund(state.paymentProof, state.body)`는 라우트에 묶여 있다. cron에서 다시 부를 수 있는 결제 증거(코인 sourceTransactionId 등)를 레코드 metadata에 저장해야 코인 복원이 성립한다. 이용권은 `passUsageEvidenceId` 대체 조회로 성립할 가능성이 높다(미검증). 월정석은 토큰 매칭을 실측해야 한다.
4. 고객 요청 환불: 명시적 닫기(`/api/billing/executions/fail`)를 하면 held + `compensation.adminReviewRequired`로 표시된다. C2의 `/refund-request`가 이걸 즉시 환불로 바꿔야 한다.
5. 정리: NARRATIVE_CARD_GAP 문구(`consultation-recovery-registry.js:33`)를 바로잡는다. KNOWN_RETRY_PENDING과 알려진 자동 환불 구멍 13개는 증거 4종이 실제로 통과하는 항목만 `scripts/verify-paid-llm-delivery-contract.mjs` 목록에서 뺀다.
6. 회귀 테스트: `__tests__/worker/checkpoint-timeout-refund.test.js`의 'paid narrative terminal hold' 묶음을 C2 동작(7일 도달 → 환불)에 맞게 확장한다. held 기대값을 그대로 지우지 않는다.

### C2 서술형 엔진 다시 시도 우선 — 서버 (2026-11-21, 서브에이전트, mock 만)
커밋: 2cab7d658(결제 근거 저장), eaa4eebd9(다시 시도·환불 라우트·보호·크론·검증기·테스트), 이 문서 커밋

**구현 (서버)**
- 결제 시점 근거 저장: 10종 라우트 verify 콜백이 `{transactionId, passRefund}` 를 돌려주고 `paid-narrative-intent.js`·`paid-narrative-delivery.js` 가 `metadata.paidNarrative.refundEvidence` 로 저장한다(tarot 3종·dream·animal-totem·oracle·saju-compat-basic·yoga-guru·guardian·geomancy).
- 새 라우트 `worker/routes/paid-narrative-retry.js` (`worker/index.js` 의 `/api/paid-narrative/` 디스패치)
  - `POST /api/paid-narrative/retry {resultId}`: 무료 다시 시도. **빠진 장만** attempts 를 0 으로 되돌리고 저장된 parts 는 건드리지 않는다(요청 5). reasonCode 를 비우고 nextRetryAt=now, `paidNarrativeRetry.reopenedAt` 을 남겨 24시간 재개 창을 새로 연다. 응답에 `resumeBody {resumeResultId}` 가 있다. 범위 밖 featureKey → 404.
  - `POST /api/paid-narrative/refund-request {resultId}`: 즉시 정산. 모든 장이 저장돼 있으면 `409 RESULT_READY` 와 resumeBody 를 돌려준다(환불하지 않음).
  - `settleDuePaidNarrativeRetryRefunds`: 생성 + 7일 경과 또는 `PAID_NARRATIVE_CLOSE_REQUESTED` 건을 정산한다. `consultation-delivery-refund.js` 크론 체인에 배선했다.
  - 정산 순서: 근거 증명(prove) → `paidNarrativeRetry.refundApprovedAt` → 같은 executionId 로 `settleExecutionById`. 근거가 없으면 held 로 두고(`heldAt`·`holdCode`, PAID_NARRATIVE_REFUND_EVIDENCE_MISSING) `compensation.adminReviewRequired` 를 세운다. settle 이 failed 이면 `refund_failed` + 운영 검토 플래그를 세운다. feature-question 의 exhaustionClaimed 건은 failureResult 로 종결하고 이중 환불하지 않는다.
- 보호 해제: `findProtectedFundingExecution` 에 `releasedExecutionId` 를 추가했다. refundApprovedAt 이 있는 실행 **자신의** parts 만 보호에서 뺀다. 다른 실행의 parts 는 계속 보호한다.
- 가드: `checkpoint-refund-guard.js` 에서 heldAt 이면 holdCode 를 유지한다. 창의 기준은 max(createdAt, reopenedAt) 이다. 명시적 정산 + refundApprovedAt 이면 unmanaged(환불)다.
- 검증기: RETRY_FIRST_POLICY 에 10종을 넣었다(marker retryRefundAt, settle 심볼 + REFUND_CRON). KNOWN_RETRY_PENDING 은 12개 남았다. NARRATIVE_CARD_GAP 문구와 ai-and-db.md 계약을 고쳤다.

**실측 (명령·출력)**
- `node scripts/run-mock-tests.mjs jest --runInBand __tests__/worker/service-execution- __tests__/worker/pig-coin-refund __tests__/worker/paid-narrative __tests__/worker/checkpoint-timeout-refund.test.js` → 스위트 14/14, 테스트 223/223 통과
- `node --test __tests__/ui/consultation-delivery-refund.test.mjs` → 56/56 통과
- `npm run verify:paid-llm-delivery` → ok, 다시 시도 우선 25개·대기 12개, 변이 37/37 + 100/100 탐지
- `verify:mongo-query-index-shapes` OK, `verify:cron-mongo-op-coverage` 통과, `verify-payment-freeze` 통과(동결 파일 무변경)
- `npm run check:fast` → EXIT 0, 테스트 8485 통과·1 건너뜀(첫 실행은 paid-llm-delivery-contract ②④ 가 5초 타임아웃: 테스트 deps 에 새 크론 정산 스텁이 없어 실제 라우트 import 가 DB 를 열었다 → `paidNarrativeRetryRefunds: async () => []` 주입으로 해결)
- paid-gate-auditor 를 커밋 전에 돌렸다. 차단 1건(보호 자기 제외가 monthly-credit 회귀를 일으킴)은 releasedExecutionId 게이트로 고쳤다. should-fix 2·3·4·5 를 반영했다.

**함정 (이번에 실제로 밟음)**
- Bash 가 `node -e`·heredoc 안의 백슬래시를 한 겹 벗긴다. 정규식 치환은 Edit 도구나 JSON 사양 스크립트로 한다.
- 검증기는 `git ls-files worker lib` 만 읽는다. 새 파일은 `git add -N` 을 해야 보인다.
- 보호 쿼리에서 정산 중인 실행 자신을 무조건 빼면 다른 환불 경로(월정석 테스트 18-20)가 깨진다. 승인된 서술형 실행만 빼도록 게이트로 막는다.
- 테스트 이름에 작은따옴표(`run's`)를 넣으면 babel 파싱 실패로 스위트 전체가 죽는다.
- runPendingConsultationRefunds 에 정산기를 새로 넣으면 그 함수를 부르는 테스트의 deps 에도 스텁을 넣어야 한다(expertRetrySettlers 와 같은 방식). 빠뜨리면 실제 import 가 DB 를 열어 타임아웃이 난다.

**남은 위험**
- 24시간이 지난 레코드를 다시 열어도 클라이언트가 resume 을 호출해야 재생성된다. 지금은 그 버튼이 없다 → C2-UI.
- oracle·yoga-guru·saju-compat-basic 의 `requirePremiumReportAccess` 에는 최근 결제 120분 창이 있다. 며칠 뒤 다시 시도하면 402 가 날 수 있다(미검증, C2-UI 화면 검증 때 확인).
- pet-saju-ai 근거 캡처(.access 언래핑)는 미검증이다.
- 근거 없는 옛 기록·원장만 있는 월정석·꿀단지·지오맨시 이용권(openGeomancyOracle 키)은 자동 환불하지 않고 운영 검토로 간다. 건수 조회: `ServiceExecutionTransaction.countDocuments({status:"pending", reasonCode:{$in:["PAID_NARRATIVE_REFUND_EVIDENCE_MISSING","PAID_NARRATIVE_EXHAUSTION_REFUND_UNCONFIRMED"]}})`
- 실제 settleExecutionById 를 통과하는 통합 테스트는 없다(auditor should-fix 6). 단위 테스트는 settle 주입으로 본다.
- 카드 환불 전제조건(paymentRef)은 정산 전에 미리 확인하지 않는다. 실패하면 refund_failed + 운영 검토로 남는다.
- change-risk 가 이 파일들을 deepRequired=false 로 분류한다(이번 변경 이전부터 있던 공백).

**C2-UI 갭 (제품별, 다음 단계)**
10종 모두 결과 화면에 아래 두 버튼이 없다. 미완성 결과는 노출하지 않는다.
1. "무료로 다시 시도": `POST /api/paid-narrative/retry {resultId}` → 응답의 `resumeBody` 로 각 제품 라우트를 다시 호출한다(`{resumeResultId}`).
2. "환불 요청": `POST /api/paid-narrative/refund-request {resultId}`. 409 RESULT_READY 이면 결과를 연다.
대상과 서버 라우트(클라이언트 파일은 C2-UI 에서 찾는다):
- tarot-oracle / love-tarot / mindscan → `worker/routes/tarot.js`
- dream → `worker/routes/dream.js`
- yoga-guru → `worker/routes/yoga-guru.js`
- saju-compat-basic → `worker/routes/saju-compat-basic.js`
- pet-saju-ai(펫 사주·펫 궁합)
- geomancy-oracle → `worker/routes/oracle.js`
- animal-totem → `worker/routes/animal-totem.js`
- guardian-fortune → `worker/lib/guardian-paid-delivery.js`

**C2-UI 진행 (2026-11-22, 워크트리 커밋 fe089da75, push 안 함)**
- 항목 2. 120분 창 402 위험은 실측으로 확인했고 수정했다. resume 때 paidNarrativeProof 가 없으면 verify(requirePremiumReportAccess)를 다시 불렀다. 그래서 토큰(30분)이나 최근 결제 창(120분)이 지나면 402 가 나고, 이용권 settle 이 다시 돌 수 있었다. 고친 내용: `metadata.paidNarrativeRetry.reopenedAt` 이 있는 resume 은 verify 를 건너뛴다(`worker/lib/paid-narrative-delivery.js` 약 141행). revoked 검사는 그대로 둔다. 테스트는 `__tests__/worker/paid-narrative-intent.test.js` 'a run reopened by the free retry resumes without a second payment check' 이다. 먼저 402 로 빨간불을 확인한 뒤 녹색이 됐다.
  - 검증: paid-gate-auditor ok(blocking 0), verify-payment-freeze 통과, verify-paid-llm-delivery-contract exit 0(37/37·100/100), cron-mongo-op-coverage 통과, jest 서술형 5스위트 205 pass.
- 항목 3. pet-saju-ai 환불 근거 캡처는 실측으로 정상이다(코드 변경 없음). 회귀 테스트 'pet report and pet compatibility keep the coin proof the route verifier returned' 를 `__tests__/worker/pet-paid-delivery.test.js` 에 추가했다(67 pass).
- auditor 후속(보고만, 미수정):
  - (a) `paid-narrative-delivery.js` 가 `.github/workflows/paid-flow-gates.yml` 의 paths 에 없다. change-risk 도 deepRequired=false 다.
  - (b) resume 진입 때 refundApprovedAt·heldAt 이 있어도 막지 않는다(기존 경쟁). 409 로 막는 후속을 권한다.
  - (c) 새 테스트의 변이 검사는 하지 않았다.
- 항목 1(UI)은 미착수다. 설계와 지도:
  - App 공용: `app/components/ExpertRetryPanel.tsx` 를 재사용한다. CRLF 파일이고, `__tests__/ui/expert-retry-panel.test.mjs` 가 `postSession(`/retry`, hold.sessionId)`·`JSON.stringify({ sessionId })`·ko 라벨·숫자 없음·5개 로케일을 글자 그대로 단언한다. 그래서 형제 컴포넌트를 만들거나 선택 props(endpoint·idKey resultId·onRetried·onResultReady·서술형 문구)로 하위호환을 지키며 확장한다.
  - 레거시 공용: UMD 헬퍼(예: `js/core/paid-narrative-retry.js`)를 만든다. `CDPaidNarrativeReader.run` 이 202 retryable===false 에서 persist 뒤 throw 하므로, 저장된 resultId 로 패널을 붙인다. 다시 시도가 성공하면 resumeBody 로 reader 를 다시 돌린다.
  - 클라이언트 지도:
    - tarot-oracle: `app/tarot/prompt-maker/TarotPromptMakerClient.tsx` ~2805(continueOracleDelivery)
    - love-tarot: `app/components/LoveRelationshipTarot.tsx` ~465, 레거시 `js/tarot-love-experience.js` ~1442
    - mindscan: `app/components/MindScanTarot.tsx` ~1582
    - guardian: `app/saju-guardian/SajuGuardianClient.tsx`
    - dream: `js/psycho-dream-analyzer-freuds-study.js` ~745-778
    - yoga: `yoga-guru.html` ~2083-2090(runSavedYoga, yogaSaved.resultId)
    - geomancy: `geomancy-oracle-v4.html` ~770-800(geomancySaved.resultId)
    - pet: `pet-saju.html`
    - animal-totem: `js/animal-totem-experience.js` ~1047-1091
    - saju-compat-basic: `js/saju-compat-flow.mjs`:126, `js/core/index-inline-runtime.js`:2449-2462. 레거시 LLM 파일은 템플릿으로 쓰거나 지우지 않는다. 버튼 추가만 한다.
  - HTML 정적 셸을 건드리면 sync:public 을 돌리고 미러도 커밋한다.
- 항목 4(보관함 `/records/` 다시 시도 표식)는 미착수다.
- 함정: PowerShell `[IO.File]` 의 상대 경로는 프로세스 cwd(루트 `D:\Development\code-destiny`)로 풀린다. 워크트리가 아닌 루트 파일을 고친 사고가 있었다(`git apply -R` 로 복구했다). 반드시 절대 경로를 쓴다. `>` 리디렉션은 UTF-16 이 되므로 패치는 `git diff --output=` 로 만든다.

**C2-UI 완료 (2026-11-22, main b28bd771e, PR CI run 44929631159 success)**
- 커밋
  - 7bb121d14: App 4종에 형제 컴포넌트 `app/components/PaidNarrativeRetryPanel.tsx` 를 붙였다. tarot-oracle(TarotPromptMaker), love-tarot, mindscan, guardian(FortuneChatClient)이다. 공용 판정은 `app/_lib/oracle-delivery.ts` 에 있다. ExpertRetryPanel 은 건드리지 않았다.
  - 0fe7a4f78: 레거시 6종에 UMD 헬퍼 `js/core/paid-narrative-retry.js`(+.d.ts, `mount(host, opts)`)를 붙였다. yoga-guru.html, geomancy-oracle-v4.html, dream(`js/psycho-dream-analyzer-freuds-study.js`), animal-totem(`js/animal-totem-experience.js`), pet-saju.html, saju-compat-basic(`js/saju-engine.js`)이다. sync:public 미러도 함께 넣었다.
  - 01812dbe3: next.config 의 HMR 제외 목록을 고치고, 한글 줄바꿈을 keep-all 로 바꿨다.
- 동작
  - 202 보류(`retryable:false`·`reviewRequired`)가 오면 미완성 결과 대신 패널만 보인다.
  - 패널 버튼은 두 개다.
    - "무료로 다시 시도 · 추가 결제·차감 없음": `/api/paid-narrative/retry` 를 부르고, 응답의 resumeBody 로 각 제품 라우트를 다시 부른다.
    - "다시 시도 대신 환불 요청": `/api/paid-narrative/refund-request` 를 부른다.
  - 응답 코드별 처리는 다음과 같다.

    | 응답 | 처리 |
    |---|---|
    | 409 RESULT_READY | 결과를 연다 |
    | RETRY_WINDOW_CLOSED | 다시 시도 버튼만 숨기고 환불 버튼은 남긴다 |
    | 환불 요청 접수 | 두 버튼을 모두 숨기고 상태 문구를 남긴다 |
- 검증
  - `__tests__/ui/paid-narrative-retry.test.mjs` 8 tests. jsdom mount 테스트와 레거시 6종 배선 테스트가 들어 있다.
  - fortune-chat.static 과 함께 node --test 로 돌려 24 pass 였다.
  - `npm run verify:paid-llm-delivery` ok(37, 37/37·100/100). check:fast EXIT 0(jest 8487 pass, 1 skip). check:pre-push EXIT 0.
  - headed Chrome 화면 검증을 했다. 대상은 레거시 3종(yoga·geomancy·pet) held/retry-closed 와 /fortune-chat/ 실제 흐름 held→환불 요청이고, 둘 다 mock API 를 썼다. visual-checker 는 10장을 모두 PASS 로 판정했다. 버튼 높이는 48 CSS px 이상이었고 대비는 5.8:1 이상이었다. 미완성 본문은 노출되지 않았다.
- SEO: 결제 뒤 보류 상태는 비공개 화면이라 영향 없음. 공개 URL 의 title·description·H1·canonical·robots·sitemap 은 바꾸지 않았다. 원장은 App 파일 서명 3건(/fortune-tea-house/·/tarot/mindscan/·/tarot/prompt-maker/)만 갱신했다.
- 항목 4 보관함 `/records/` 표식은 갭으로 남겼다. 싸지 않다.
  - 보류 서술형 실행은 `status:'pending'` 에 reasonCode·`paidNarrativeRecovery.reviewRequired` 가 붙은 상태다. 그런데 `worker/lib/record-library.js` 의 `retryHeld` 에는 이 분기가 없어서 'partial/generating' 으로 보인다.
  - executions 원천에는 resultPath 가 없어서 recoveryHref 가 `/points/history/` 다.
  - 레거시 페이지는 URL 이 아니라 localStorage 로만 재개한다.
  - 서버 복구 태스크는 생성 후 24시간 안, SERVER_RESUME 기능만 재개한다.
  - 그래서 보관함에서 retry 를 불러도 생성까지 끝나지 않는다.
  - 하려면 세 가지가 필요하다. (1) record-library 에 held 분기, (2) 제품별 재개 URL(`?resume=<resultId>`) 수신, (3) 패널 재사용.
  - 관찰(보고만): `/records/view` 가 executions 의 저장된 부분 장을 보여 준다. 기존 동작이다.
- 함정
  - App 이 import 하는 `js/core/*.js` UMD 는 `next.config.mjs` 의 `LEGACY_SHARED_BROWSER_MODULE` 정규식에 넣어야 한다. 빠지면 dev React Refresh 가 `import.meta` 를 주입해 dev 500 이 난다(빌드·테스트는 통과해서 놓치기 쉽다).
  - App 파일을 고치면 sitemap 원장 서명이 바뀐다. `sitemap:generate` 는 KST 날짜 드리프트로 수백 항목을 바꾼다. 서명이 바뀐 항목만 원장에 반영하고 xml 은 되돌린다. 그다음 `generate-sitemap.mjs --check` OK 를 확인한다.
  - jest 는 `node scripts/run-mock-tests.mjs jest <이름 패턴>` 으로 돌린다. 윈도우 경로 패턴은 0건이 된다. `__tests__/ui/*.test.mjs` 일부는 node --test 다.
  - Playwright 번들 chromium 이 없다. `channel:'chrome'` 을 쓴다.
  - yoga-guru.html 픽스처는 인증 mock 이 없으면 /login 으로 간다. `**/api/**` 를 `{ok:true,user:{...}}` 로 mock 한다. pet-saju 는 자체 오류 모달·blur 를 걷어 낸다.
  - check:fast 의 esbuild "The service was stopped" 는 환경 플레이크다. 다시 돌린다.
- 남은 것(보고만)
  - `verify:paid-llm-delivery` 는 KNOWN_REFUND_GAPS 13개(서술형 10종 포함)를 그대로 나열한다. 검증기 인벤토리 정리는 별도 작업이다.
  - 레거시 `js/tarot-love-experience.js` 에는 붙이지 않았다. App love-tarot 이 대체한다.
  - impeccable gradient-text 는 기존 코드다(MindScanTarot L383, TarotPromptMaker L3172/3179).
  - geomancy 버튼은 픽스처에서 회색 기본 버튼으로 보였다. 실제 페이지 테마 클래스를 확인하지 않았다(미검증).
  - auditor 후속 (a)(b)(c)는 위와 같다.

### C3·C3b·C4 (2026-11-22, 서브에이전트, mock 만)
- 감사 5 재확인 판정(현재 코드)
  | 제품 | 이전 | 판정 | 커밋 | 근거 |
  |---|---|---|---|---|
  | saju-compat-basic | 미해결 | 고침: 시간 모름 + 빈 시주를 허용. 검증은 결제 확인 전(`saju-compat-basic.js:134`) | 7d8f2e8f4 | `saju-compat-schema.js` pillarsOf |
  | pet | 미해결 | 고침: 새 POST 는 verify 전에 seedPetNarrativePlan 으로 검증 → 400 | b517a51cc | `pet-saju-ai.js` handlePetDelivery |
  | feature-question | 미해결 | 고침: seed 의 4xx(proof 있음)에서 route refund 를 호출한다. 환불이 실패하면 retryable·paymentRetainedForRetry 로 남긴다 | 88fcfa0f6·cb8867ece | `feature-question-delivery.js` |
  | ziwei 계산 실패(:765) | 미해결 | 고침: startRefundableExecution + refundExecution → 422 {CALCULATION_FAILED, refunded} | 93fd5a25c | `ziwei-deep-report.js` |
  | love-secret 근거 불일치(:1799) | 미해결 | 고침: 409 전에 restoreBillingGateAccessOnFailure. 기존 테스트 계약(손상 pin 은 환불 없음)을 바꿨다 | 3e7109b12 | `love-secret-ai.js` |
  | yoga-guru·oracle·animal-totem·dream | — | 해당 없음: 검증이 verify 전(yoga-guru.js:82, oracle.js:152, animal-totem.js:681, dream.js:799-803) | — | animal-totem seed 의 resolveSystemPrompt 가 던질 수 있는지는 미검증 |
- C3b `paid-narrative-delivery.js`: 원본 조회 직후 GET 이 아니고, 미완료이고, 소진 청구가 아닌 문서는 거른다. refunded·cancelled → 403 PAYMENT_REVOKED. refundStatus≠none 또는 refundApprovedAt → 409 REFUND_IN_PROGRESS. 둘 다 provider 를 호출하지 않는다.
- C4 `js/saju-compat-flow.mjs` classifyFailure: 400/422 → INPUT_INVALID(재시도 없음, 대기 기록 지움). 새 문구 키 `sajuCompat.flow.inputInvalid`(SAJU_COMPAT_KO + authored 12개 언어): 입력 거절은 결제되지 않고, 이미 결제된 건은 보존·환불·복구한다. 같은 계열 `paid-narrative-reader.js`(4xx 는 서버 문구를 던지고 재시도 안 함)와 `oracle-delivery.ts`(<500 즉시 반환)는 이미 재시도하지 않아 손대지 않았다. sync:public 미러 커밋 포함.
- 실측
  - jest(run-mock-tests) 9 스위트 291 pass. paid-narrative-retry.test.mjs 8 pass. saju-compat-flow.test.mjs 12 pass.
  - verify:paid-llm-delivery EXIT 0(계약 37, 변이 37/37·100/100). verify:paid-gate-ui PASS. llm-generation-resilience·audit-ai-locale-calls --check EXIT 0.
  - paid-gate-auditor PASS: love-secret·ziwei-deep-report·saju-ai-consultation-recovery·pet-saju(180)·payment-choice-parity·payment-freeze 검증기 모두 통과.
  - check:fast(--base=ae356190a) EXIT 0: node --test 5733 pass·0 fail, jest 490 스위트 8497 pass(1 skip). 처음 두 번은 아래 함정 두 개로 막혔다
- 함정
  - 커밋을 끝낸 뒤의 `npm run check:fast` 는 "변경 없음" 으로 끝난다(기본 베이스 HEAD). `node scripts/check-changed.mjs --profile=fast --skip-build --base=<기점>` 으로 돌린다.
  - 새 `sajuCompat.*` 문구 키는 authored JSON 만으로 끝나지 않는다. `node scripts/i18n-merge-authored.mjs --core --file sajuCompat-02.json` 으로 `public/i18n/<lang>.json` 12개에 병합해야 한다(saju-compat-render.test.mjs:130). `--namespace` 를 쓰면 엉뚱한 `public/i18n/<lang>/sajuCompat.json` 이 생긴다. e82fef6fa
  - 코어 사전을 바꾸면 sitemap 원장 서명 480개가 바뀐다(verify:sitemap-drift). `sitemap:generate` 를 돌린 뒤 서명이 바뀐 항목만 원장에 남기고 xml 은 되돌린다. 그다음 `--check` OK 를 확인한다. 01d5c639a
  - love-secret vm 하니스 ctx 에는 factDigest 가 없다. 불일치를 재현하려면 실제 헬퍼를 import 하는 기존 corrupt-pin 테스트를 쓴다.
  - KNOWN_REFUND_GAPS 13개는 "소진 시 자동 환불" 축이라 이번 수정과 축이 다르다. 검증기가 통과하므로 바꾸지 않았다.
- 남은 위험(보고만)
  - ziwei 의 `refunded` 가 과대 보고될 수 있다. failServiceExecution 이 비대기 실행에 ok:true 를 돌려준다(service-execution-task.js:1367, 1432-1438). 읽는 클라이언트는 없다.
  - ziwei 이용권 경로는 resolveGenerateAccess 가 settle transactionId 를 버려서 환불이 없다(:661-664). 기존 결함이다.
  - love-secret 은 기존 부분 기록도 환불한다. 부분 장은 계속 읽힌다.
  - 이 라우트들은 deepRequired·paid-flow-gates 에 없다. CI 변경은 RED 라 사용자 결정이 필요하다.
  - 크론(paid-narrative-recovery-task.js:72-75)이 환불 상태 문서를 reviewRequired(REFUND_IN_PROGRESS)로 표시한다. checkpoint-refund-guard.js:79-80 덕분에 정산에는 해가 없다. buildRecoverableNarrativeFilter 제외는 하지 않았다.
  - 409 REFUND_IN_PROGRESS 의 클라이언트 문구는 일반 문구다(paid-narrative-reader.js:16, LoveRelationshipTarot.tsx:475). Toss 클라이언트 처리는 미검증이다.
  - love-secret 이 readRepresentativeFacts 를 recompute 없이 불러서, v1 로 고정된 저장 기록은 항상 불일치가 된다. 기존 결함이다.
