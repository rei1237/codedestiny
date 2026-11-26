---
status: in-progress
updated: 2026-11-27
next: 단계 3 — 점성술·베딕 마지막 시도 dedupe·scrub 후 유지
---

# 유료 LLM 결제 후 미제공 제거 + 이용권 혜택 정확 적용

## 첫 행동
`D:\Development\codedestiny-worktrees\paid-final-attempt-delivery-20261127-080753`에서 작업한다.
1. `git status`가 깨끗한지 확인한다.
2. 아래 단계 중 체크되지 않은 첫 단계부터 진행한다.
3. 단계마다 mock 테스트 → 대상 jest(`node scripts/run-mock-tests.mjs <파일>` 또는 저장소 러너) → `npm run check:fast` → 커밋한다.
4. 문서의 체크박스와 결과를 갱신하고 커밋한다.

## 지금 상태
- 워크트리 브랜치는 `wt/paid-final-attempt-delivery-20261127-080753`이고, 기준은 origin/main `0914f3bee2`다.
- 메인 체크아웃(`D:\Development\code-destiny`)에는 옆 세션의 미커밋 변경이 있다. 그쪽에서 `reset`·`stash`·`checkout --`을 하지 않는다.

## 요청 원문
1. "사주 고급 궁합 cd45bb4a12d829b395835e0bcb908125ed226c74 고객 주문 번호가 취소되었는데 결제 후 llm으로 정확하게 생성되어서 고객에게 전달되는지 제대로 검증해서 안된다면 고친 이후에 운영에 반영해줘"
2. "sub_p1m_f7fda4b80fc1c1f3abbd9c9e107d 중간 꿀단지도 결제 취소가 되었는데 제대로 결제 후 이용권 혜택이 설정한대로 모든 이용권이 적용되도록 해주고 운영 반영해"
3. "분량 하한이 적용되는 서비스들을 분석해서 결제 후 제공 안되는 문제가 절대로 없도록 수정해줘"
4. "목표 글자 수 자체도 좀 줄이도록해줘 꿀단지는 내가 취소한거였는데 정확하게 이용권 혜택이 적용되도록 더 코드를 개선해줘"

## 승인 상태 (2026-11-27)
- **운영 반영**: 사용자가 원문 1·2에서 명시적으로 요청했다. 전부 끝나면 `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production`을 1회 실행한다. 직전 main에 다른 세션의 커밋이 올라와 있으면 범위를 다시 묻는다.
- **운영 DB 읽기 전용 조회**: 승인됨. 이미 끝났다.
- **복구 스윕 범위**: 사용자 선택은 "최근 30일 전부"다. 코드에 들어가는 자동 스윕의 범위이며, 운영 DB를 수동으로 쓰는 것이 아니다.
- **고급 궁합 전달 방식**: 사용자 선택은 "고객이 다시 열면 생성"이다.
- **승인 범위 밖**: 운영 DB 수동 쓰기, 환불, 환불된 주문의 재생성, 과금 LLM 실호출. 검증은 전부 mock이다.

## 운영 조회 실측
- **고급 궁합 cd45bb4a…**
  - PortOne 결제는 정상이었다(14:59:15Z).
  - overview 그룹이 gemini-2.5-flash로 2회 모두 1,427자를 냈고, 받는 하한 1,440자(2,400×0.6)에 걸려 `LENGTH_SHORT`가 났다. 결과는 `generation_failed`였다.
  - 고객이 5회 다시 연 뒤 환불을 요청했고, API로 10,000원이 전액 환불됐다.
- **꿀단지 sub_p1m_f7fda4…**
  - 결제 1초 뒤 이용권이 지급됐고, 사용은 0건이었다.
  - 19:59Z에 PortOne 콘솔에서 취소됐다. 사용자 본인이 취소했다고 확인했다.
  - 웹훅이 이용권을 정상 회수했다. 코드 결함은 없다.

## 원칙
마지막 허용 시도에서 **파싱 가능하고 비지 않은 본문**이 있으면 반드시 전달한다. 거부하지 않고 결정적으로 교정한다.
- 분량이 모자라면 받는다. 행에 `shortAccepted: true`를 남긴다.
- 반복 문단은 dedupe한다.
- 잘린 응답은 마지막 완결 문장까지 살린다.
- 빠진 부가 필드는 계산값으로 채운다.
- 문단 수 하한은 1개 이상으로 둔다.

본문이 완전히 비었거나 파싱이 불가능할 때만 기존의 실패·환불 경로로 간다. 1차 시도의 품질 기준, 시도 횟수, 결제·가격·게이트는 바꾸지 않는다.

본보기 구현:
- `karmaChapterReady(acceptShort)`: worker/routes/karma-destiny-ai.js:2955
- `acceptShortDraft`: worker/lib/guardian-fortune-llm.js:101
- `finalAttempt`: worker/lib/paid-narrative-delivery.js:195

## 함정
- 전체 저장소 Grep은 시간 초과가 난다. `git grep`을 쓴다.
- jest는 run-mock-tests 러너로 돌리고, `__tests__/ui`는 `node --test`로 돌린다(메모리 참조).
- CRLF 파일을 Edit하면 줄끝이 바뀔 수 있다. 커밋 전에 `git diff --stat`으로 확인한다.
- 목표 분량을 내릴 때 하한은 목표 하한의 약 80% 이하로 둔다(규칙 17). 토큰 한도는 내리지 않는다.
- `worker/payments/*`는 payment-freeze 대상이 아니다. 그래도 RED이므로 mock 테스트를 반드시 붙인다.

## 단계
- [x] 1. **고급 궁합** (웹+토스 공용)
  - 파서 `parseSajuCompatPremiumGroupResponse(text, group, { finalAttempt })`는 worker/lib/saju-compat-premium-prompt.js:209에 있다. final이면 LENGTH_SHORT와 섹션 하한을 빼고, 반복은 dedupe한다. 빈 섹션은 그대로 거부한다.
  - worker/routes/saju-compat-premium.js:500의 `generateSajuCompatPremiumGroup`이 finalAttempt를 전달한다.
  - 목표 분량을 내린다. GROUP_MIN 2400→1900, GROUP_MAX 3200→2600으로 하고, 프롬프트 분량 줄과 테스트도 고친다.
  - 테스트: 1,427자 응답은 기본에서 거부되고 final에서 수용된다. 짧은 응답이 2회 나온 뒤에도 completed이고 환불이 없다.
- [x] 2. **연애 비책**
  - worker/lib/love-secret-ai-prompt.js:228·232의 GROUP_MIN을 5000→4000, V2는 6000→4800으로 내리고, MAX도 비례해 내린다.
  - 하드캡 마지막 시도(라우트 worker/routes/love-secret-ai.js:1003-1020, 1143)에서 salvage는 kept>0이면 수용하고, 반복은 dedupe한다. `INVALID_SECTION_BODY`는 빈 섹션일 때만 거부한다.
- [ ] 3. **점성술·베딕**
  - 대상: worker/routes/astrology-ai.js:1247-1307, worker/routes/vedic-ai.js:1535-1578.
  - 마지막 시도에서는 반복·품질 이슈를 dedupe·scrub한 뒤 유지한다.
- [ ] 4. **낙샤트라**
  - 대상: worker/routes/nakshatra-ai.js:714-737, 948, 983.
  - final이면 잘린 응답을 salvage하고, 빠진 evidence 필드를 계산값으로 채우고, 교차 섹션 반복은 dedupe한다.
- [ ] 5. **타로 어댑터** (love-tarot-delivery.js, mindscan-delivery.js, tarot-oracle-delivery.js)
  - paid-narrative-delivery.js:195의 finalAttempt를 어댑터에 전달한다.
  - final이면 문단 수 하한을 1개 이상으로 하고, 반복은 dedupe한다.
- [ ] 6. **지오맨시**
  - 대상: worker/routes/oracle.js:115-125.
  - final이면 잘린 응답을 마지막 완결 문장까지 유지한다.
- [ ] 7. **보고만**
  - 자미두수 V1 2종, 흑월 V1, 시빌 V1이 대상이다.
  - V2 플래그가 기본값으로 켜져 있는지 `worker/wrangler.toml` vars와 코드 기본값으로 확인만 한다.
- [ ] 8. **이용권 개선** (RED, mock 테스트 필수)
  - (a) `expireStalePendingOrders`(worker/payments/reconcile.js:114-139): 취소 전에 PortOne에 다시 조회한다. paid면 `settleOrderFromReconcile`로 확정하고, 조회에 실패하면 건너뛴다(fail-closed). 지금은 낡은 `metadata.reconcile.lastPgStatus`만 보고 취소한다.
  - (b) `evaluateConfirmable`(worker/payments/index.js:866-897)과 `markOrderPaid`(worker/payments/orders.js:282, `NOT_CONFIRMABLE_RAW_STATUSES`): `cancelled`이면서 `failureCode`가 ORDER_EXPIRED 또는 client_failure인 주문을, PortOne이 PAID이고 금액이 일치하면 되살린다. PortOne이 cancelled/refunded인 주문은 그대로 둔다.
  - (c) 복구 스윕: 최근 30일 안에서 ORDER_EXPIRED로 취소된 주문 중 PortOne이 PAID인 주문을 확정하고 혜택을 지급한다. `runPaymentsV2Reconcile`(index.js:2389)에 붙인다. 1회 처리량에 상한을 둔다.
  - (d) `evaluatePassCoverage`(worker/payments/passes.js:406-446)에서 `passExcluded`를 서버에서 강제하고, `PASS_FAILURE_CODES`에 `pass_excluded`를 추가한다.
  - (e) worker/routes/payments.js:2554-2780에서 legacy success 이용권 주문을 셀프 취소하면 `profileSubscription`을 회수한다. 지금은 `isDigitalSinglePurchase`(2747)만 회수한다.
  - (f) `derivePassOrderId`(passes.js:93-98)에서 standard와 s 티어의 접두가 충돌한다. id 변경은 RED이므로 안전하지 않으면 보고만 한다.
  - 테스트: lastPgStatus가 "ready"인데 PortOne이 PAID면 expire하지 않고 확정한다. 실행 대상은 `__tests__/worker/payments-v2.reconcile.test.js`, `payments-v2.subscription`, `payments-v2.entitlements`, `payments-v2.webhook-events`, `pass-policy-v5`, `pass-coverage-matrix`, `scripts/verify-payment-reconcile.mjs`, `verify-payment-concurrency-guards.mjs`다.
- [ ] 9. **전달**
  1. `npm run check:pre-push`를 돌린다.
  2. 메인 체크아웃에서 `git merge`(PR 없음)한 뒤 push하고, main CI를 1회 확인한다.
  3. production dispatch를 1회 실행한다.
  4. 워크트리를 배수하고, 이 문서를 done으로 닫는다.

## 결과 기록
(단계마다 커밋 SHA·테스트 결과를 여기에 적는다)

### 단계 1 — 3f31047e31
- GROUP 1900~2600(종전 2400~3200). ACCEPT_RATIO 0.6 유지, 받는 하한 1140(목표 하한의 60%). MAX_OUTPUT_TOKENS 8192 유지.
- `parseSajuCompatPremiumGroupResponse(..., { finalAttempt })`: final이면 LENGTH_SHORT·섹션 하한·REPEATED_PASSAGE를 `shortAccepted`/`acceptedIssues`로 받는다. 0자 섹션(REQUIRED_SECTIONS_INCOMPLETE)과 PARSE_FAILED는 그대로 거부.
- 가정: 운영 사고의 1,427자는 새 하한 1140 위라 첫 시도부터 받는다. 기본-거부/final-수용 대조는 1140 미만 응답으로 테스트했다.
- 테스트: jest saju-compat-premium-prompt `Tests: 8 passed`; node --test saju-compat-premium-paid-delivery `pass 7 fail 0`(overview 짧은 응답 2회 → completed·shortAccepted·passConsumed 1·환불 0); verify-saju-compat-premium-flow ok; verify-paid-llm-delivery-contract ok.
- check:fast: paid-gate-suite 통과 78 / 실패 0, lint 통과. 이어서 `verify:sitemap-drift`에서 BLOCKED. 원인은 날짜 경과(config/sitemap-lastmod.json 월간 운세 lastmod 11-26→11-27)로 이 변경과 무관하며, 재생성 파일은 되돌렸다. 그 뒤 단계는 실행되지 않았다.

### 단계 2 — b9ae2db0bc
- 그룹 목표 V1 4000~5500, V2 4800~6300(종전 5000~6500 / 6000~7500). 상한은 verify-llm-generation-resilience의 분량 여유 1,500자 요구 때문에 5200/6000이 아니라 5500/6300으로 했다. 합계 TARGET 28000~36400, MIN 16000(MAX 52000 유지). 받는 하한 GROUP_MIN×0.7 = 2800(V2 목표 하한의 약 58%). salvage 하한 ×0.6=2400, ×0.3=1200. 토큰·시도 횟수 변경 없음.
- 하드 한도 마지막 시도(attempts+1 ≥ HARD_CAP 12)에만 `lastChance`를 넘긴다: 잘린 응답도 파싱, 문자열이 아닌 섹션 본문은 그 섹션만 버리고, 되풀이는 덜어 낸 뒤 필수 섹션이 모두 남으면 분량과 관계없이 받는다(`shortAccepted`). 필수 섹션이 비거나 금지·위험 표현이 남으면 그대로 거부.
- V1 프롬프트 해시 2개 갱신(분량 줄만 바뀐 것을 HEAD 모듈과 줄 단위 비교로 확인).
- 테스트: jest love-secret-ai-prompt.gate·love-secret-ai-rejection-repair·paid-report-length-recovery·love-secret-native-contract `Tests: 73 passed, 73 total`; node --test __tests__/ui/love-secret-*.behavior.test.js `pass 87 fail 0`; verify-love-secret-ai-flow PASS; verify-llm-generation-resilience ok (1357 checks); verify-paid-llm-delivery-contract exit 0.
- check:fast: paid-gate-suite 통과 78 / 실패 0, 이후 단계 1과 같은 sitemap 날짜 드리프트로 BLOCKED(무관).
