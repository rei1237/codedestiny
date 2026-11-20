---
status: in-progress
updated: 2026-11-20
next: "A4 화면 검증 — 사주 탭 무료 궁합 결과 상단·끝 타일과 고급 궁합 prefill 화면을 visual-checker 로 최종 판정(B 재판정 미회수), ?preview=success|failed 확인"
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
- [ ] A4 화면 검증: headed 브라우저로 `?preview=success|failed`와 사주 탭 무료 궁합(시간 모름 포함)을 확인하고, visual-checker로 판정한다.
- [ ] M 머지와 push: main으로 머지 → check:pre-push → push → CI 1회 확인 → `verify:staging -- --sha=<SHA>`
- [ ] C·D 감사 결과를 paid-retry R10에 넘긴다. 상대 세션이 끝났으면 이어서 구현하고, 아니면 보고만 한다.
- [ ] 정리: 이 문서를 `status: done`으로 바꾸고, 워크트리를 배수하고, 임시 파일을 지운다.

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
