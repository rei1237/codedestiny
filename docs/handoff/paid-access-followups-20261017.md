---
status: active
updated: 2026-10-17
next: "P0-1 — 재회·연애 타로 /api/tarot/reading에 서버 결제 확인(verifyPerUsePayment + claim)을 건다. 결제한 사람이 402를 받지 않는지 먼저 클라이언트 결제 흐름을 읽는다"
---

# 유료 접근 무결성 — 후속 과제

## 왜

- 사용자 요청(2026-10-17): "후속 과제도 수정해줄 인수인계 문서 만들어줘"
- 원 작업: `docs/handoff/fortune-tea-pass-billing-holes-20261016.md`
  - 원 지시: "찻집 이외에도 다른 유료 상담 등이 결제 없이 열리거나 개발자 콘솔 등으로 조작이 불가능해야해"
  - A~F단계가 main에 들어갔다. 마지막 push는 `fe6b0f30b`이다.
- 이 문서는 원 작업이 남긴 후속 과제를 우선순위대로 모은 것이다.
  - 모든 항목은 2026-10-17에 origin/main `0c80c4b5d` 기준으로 코드를 다시 확인했다. 줄 번호도 그 기준이다.
  - 작업 전에 `git grep`으로 줄 번호를 다시 찾는다.

## 작업 규칙 (원 문서에서 이어진다)

- `AGENTS.md`·`CLAUDE.md`를 먼저 읽는다.
  - 루트에 다른 세션의 미커밋 파일이 있으면 `scripts/create-safe-worktree.ps1`로 워크트리를 만든다.
  - 루트에서 `reset --hard`·`stash`·`checkout --`를 쓰지 않는다.
  - `scripts/grant-family-pass.mjs`·`scripts/revoke-pass-and-block-account.mjs`는 다른 세션 것이다. 지우거나 실행하지 않는다.
- **운영 DB 조회·운영 쓰기는 매번 사용자 승인이 필요하다.** 회수·차단·환불도 사용자가 결정한다.
- **전달이 최우선이다.**
  - 결제한 사람에게 거짓 402·409를 주지 않는다.
  - 저장소 장애는 503(재시도)으로 낸다. 402로 바꾸지 않는다.
- **서버 가격(`worker/lib/paid-feature-registry.js`)은 바꾸지 않는다.** 화면 가격을 서버에 맞춘다.
- 공용 부품
  - 회당 결제 확인: `verifyPerUsePayment`(`worker/lib/nakshatra-paid-access.js`)
  - 증빙 1건 = 요청 1건: `claimRequestBillingEvidence`·`releaseRequestBillingEvidence`(`worker/lib/billing-evidence-claim.js`)
  - 이용권 환불: `refundPassCoverage`(`worker/lib/pass-consumption.js`)
  - 정적 가드: `verify:paid-access-integrity`
- 서버 이전 본문
  - 원문 사본은 `worker/lib/saju-section/paid-*.src.js`·`worker/lib/astro-section/paid-*.src.js`에 있다.
  - 고친 뒤 `node scripts/extract-saju-section-runtime.mjs --write`(점성은 `extract-astro-section-runtime.mjs`)로 다시 만든다.
  - 클라이언트를 고쳤으면 `npm run sync:public`을 돌리고 결과를 같은 커밋에 담는다. `verify:public-mirror-fresh`는 커밋된 상태만 판정한다.
- **gitleaks**
  - `runtime.generated.mjs` 8행의 i18n 값 "Api Karma"는 다시 만들 때마다 새 커밋 지문으로 잡힌다.
  - push 전에 로컬 gitleaks(`gitleaks git --redact --log-opts="origin/main..HEAD" .`)를 돌린다.
  - 잡히면 `.gitleaksignore`에 지문과 사유 주석을 추가하고 사용자에게 보고한다. 같은 유형은 승인된 오탐이다.
  - rebase하면 SHA가 바뀌므로 지문을 다시 확인한다.
- **push 순서**
  - `npm run check:pre-push && git fetch -q origin && git merge-base --is-ancestor origin/main HEAD && git push origin HEAD:main`
  - **`;`로 잇지 않는다.** 2026-10-17에 `;` 체인이 pre-push 실패를 무시하고 push한 사고가 있었다.
- **check:fast**
  - `verify:doc-freshness`가 멈춘다(`docs/CURRENT_DEV_BASELINE.md` 정리일 초과). 사용자 결정은 "그대로 push, 문서는 따로"다.
  - 나머지 단계는 `node scripts/check-changed.mjs --profile=fast --skip-build --plan`으로 목록을 뽑아 하나씩 돌린다.
- 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`을 붙인다.

## 남은 작업 (우선순위 순)

### P0 — 결제 없이 열림 / 결제했는데 못 받음

- [ ] **1. 재회·연애 타로 `/api/tarot/reading`에 서버 결제 확인이 없다**
  - 현재: `worker/routes/tarot.js:1888-1903`은 `requireAuth`만 거친다. `/reading`은 인증 장애도 삼킨다.
  - `:1918-1966`이 리딩을 만들어 돌려준다. 연간 스프레드만 `requireYearTarotAccess`를 거친다.
  - 클라이언트는 코인을 따로 차감한 뒤 이 API를 부른다(`js/tarot-reunion-experience.js`, `js/tarot-love-experience.js`). 그래서 콘솔에서 API를 바로 부르면 무료로 받는다.
  - 할 일
    - 클라이언트 결제 흐름에서 requestId와 차감 행이 어떻게 남는지 먼저 읽는다.
    - 그다음 `verifyPerUsePayment(requireExisting)`과 claim(requestId에 묶음)을 건다.
    - 기능 키·가격은 레지스트리 정본을 쓴다.
  - 완료 판정
    - 증빙 없음 → 402
    - 정상 결제 → 200
    - 같은 requestId 재요청 → 같은 결과
    - 다른 요청에 같은 증빙 → 409
    - 결제 DB 장애 → 503
    - `verify:paid-access-integrity`에 이 라우트를 넣는다.
- [ ] **2. 생성 실패 시 이용권 환불이 없는 회당 라우트 7곳**
  - 배경: `verifyPerUsePayment`는 이용권을 차감하면 `passRefund`를 돌려준다(`nakshatra-paid-access.js:200-216`). 아래 라우트는 그 값을 쓰지 않는다.
    - dream: `dream.js:81`, `:114`. `runPaidNarrativeDelivery`에 `onExhausted`가 없다.
    - tarot numerology·ijik·crystal-soul: `tarot.js:335`, `:545`
    - ziwei-deep-report: `:339-340` 주석이 "되돌릴 것도 없다"고 한다.
    - ziwei-ai: 이용권 차감 `:2364`. 실패 처리 `:2650-2652`는 코인·월정석·카드만 환불한다.
    - sukuyo-compatibility-ai: 정산 `:1295`. 환불 `:1780-1800`은 코인·월정석만 한다.
    - neo-operation-room: 정산 `:579`. 카드 환불만 있다(`:1326`, `:1764`).
    - naming-prompt: 정산 `:1218`. `restoreNamingAccessOnFailure`(`:1497`)는 월구독만 처리한다.
  - 본보기: `master-love-codex.js:1226`, `fortune-tea-house.js:4929-4935`
  - 할 일: 최종 실패(재시도 불가)에서 `refundPassCoverage`를 부른다.
    - refundId는 `<기능>:<requestId>` 형태로 멱등하게 만든다.
    - 실패한 요청의 claim도 푼다.
  - 완료 판정: 라우트마다 "이용권 차감 → 생성 최종 실패 → 한도 복구, 두 번 실패해도 한 번만 복구" 테스트.
- [ ] **3. 자미 궁합: 결제 뒤 서버 호출이 실패하면 재시도가 결제 게이트를 다시 거친다**
  - `js/saju-engine.js:20181`이 access 문맥을 꺼낸 뒤 지운다. catch(`:20321`)는 requestId를 남기지 않는다.
  - 본보기: 숙요 궁합은 전달 못 한 requestId를 기억하고 다시 열 때 게이트를 건너뛴다(`_syCompatUndelivered`, `js/saju-engine-tarot-sukuyo-quantum.js:13412-13436`).
  - 완료 판정: 서버 503 뒤 다시 누르면 같은 requestId로 재요청한다. 서버는 같은 조합이면 200을 준다.
- [ ] **4. 숙요 정밀 확장: 옛 복귀 서술자에 `baseRequestId`가 없어 400이 난다**
  - `syRunCompatPrecisionResume`(`saju-engine-tarot-sukuyo-quantum.js:13301-13317`)은 `args.baseRequestId`가 있을 때만 requestId를 붙인다.
  - 그 필드가 생기기 전에 저장된 서술자는 requestId 없이 가서 `REQUEST_ID_INVALID`를 받는다(`worker/routes/saju-section.js:112`).
  - 할 일: 대체 경로를 만든다. 서술자의 결제 정보로 새 requestId를 만들거나, 게이트로 정중히 돌려보낸다. 거짓 400은 없애야 한다.
- [ ] **5. fortune.js AI 프롬프트의 claim이 한 번도 풀리지 않는다**
  - `worker/routes/fortune.js:3044`에서 claim한다. 그런데 이 파일은 `releaseRequestBillingEvidence`를 import하지 않는다.
  - 환불 경로: `:3986-4060`, `:4520-4569`, `:4685-4749`
  - 영향: 자동 환불이 실패하면 결제한 사람이 같은 결제로 다시 시도할 때 409를 받는다.
  - 할 일: 본문을 전달하지 못했고 환불도 되지 않은 경우에만 claim을 푼다.
- [ ] **6. 카르마: `generation_failed`면 409**
  - 위치: `karma-destiny-ai.js:2504`, `:2678`, `:2814`
  - 결제한 사람이 재시도할 때 막히는지 확인한다. 막히면 같은 requestId 재생성을 허용한다.
- [ ] **7. 숙요·자미 궁합: 이용권 차감 뒤 claim이 실패하면 환불이 없다**
  - `provePerUseCompat`(`saju-section.js:62-92`)는 `:69`에서 이용권을 차감하고, claim이 실패하면 `:86-90`에서 409만 낸다.
  - 할 일: 이 요청이 새로 차감한 경우에만 `refundPassCoverage`를 부른다.

### P1 — 증빙 판정의 남은 틈

- [ ] **8. 리포트 증빙의 바인딩 전용 대체 조회가 너무 넓다**
  - `worker/lib/access-control.js:831-842`가 바인딩 조건을 `$or`로 묶는다. profileId 하나만 맞아도 통과한다(`:686-707`).
  - 그래서 같은 기능·같은 프로필의 예전 차감도 증빙으로 인정된다.
  - 할 일: requestId나 transactionId를 필수로 하거나, 모든 조건을 AND로 묶는다.
  - 먼저 정상 사용자가 거짓 402를 받지 않는지 호출부를 확인한다.
- [ ] **9. 리포트 증빙이 Payment(PG 결제) 행을 보지 않는다**
  - `findEvidenceByPaymentTokens`(`access-control.js:726-845`)는 PointHistory만 찾는다.
  - 카드로 바로 결제한 경우 증빙을 못 찾는지 재현한 뒤 Payment 조회를 추가한다.
- [ ] **10. 최근 결제 창 `findRecentDeductionEvidence`가 아직 쓰인다**
  - 정의: `access-control.js:425-462`(30분 창). 호출: `:1242`. claim으로 "아직 안 쓴 차감만" 연다.
  - 대상 7종: celestialHarmony, geomancyOracle, yogaGuruCourse, sajuCompatBasic, petSajuReport, petCompatReport, destinyCompassDeepReport
  - 할 일: 클라이언트가 requestId나 transactionId를 보내게 하고, 창을 없앤다.
- [ ] **11. 생성 중 환불하면 그래도 전달된다**
  - `isPaidResultRevoked`(`worker/lib/paid-result-revocation.js:12-37`)는 차감 행의 `metadata.*Refunded*` 표식만 본다.
  - `handlePigCoinRefund`(`fortune.js:3256`, 환불 기록 `:3374-3398`)는 차감 행에 표식을 남기지 않는다.
  - 할 일: 차감 행에 표식을 남기거나, 확인할 때 `refundForPointHistoryId` 환불 행도 본다.
- [ ] **12. 서버 전달 기록이 없어 "열람 후 환불"을 막을 수 없다**
  - tarot-ijik(`tarot.js:1818-1853`)
  - crystal-soul(`:1994-2029`)
  - destiny-compass: `destiny-compass-ai.js:264-273`이 `completeServiceExecution` 실패를 삼킨다.
  - 할 일: mindscan처럼 `runPaidNarrativeDelivery`로 감싼다. 본보기는 `mindscan-delivery.js:84`다.
- [ ] **13. 클라이언트 롤백 환불이 클라이언트 가격 상수를 보낸다**
  - 위치
    - `js/tarot-reunion-experience.js:503`, `:1287`
    - `js/tarot-love-experience.js:691`, `:1559`
    - `js/tarot-year-fortune-experience.js:452`, `:1448`
  - 서버의 기본 조회는 `delta:-cost`가 맞아야 해서(`fortune.js:3232`), 화면 가격이 낡으면 환불이 안 된다.
  - 할 일: 차감 응답의 transactionId로 환불하거나, `js/core/feature-pricing-store.js`의 정본 가격을 쓴다.
  - 참고: 원 문서는 이 파일을 "쓰이지 않는다"고 적었지만 틀렸다. index.html·saju-engine 등이 쓴다.
- [ ] **14. 작은 정리**
  - 찻집 `FORTUNE_TEA_HOUSE_BILLING_STATUSES`(`fortune-tea-house.js:107`)에서 `generation_failed`를 뺀다. 사용처는 `:1327`이다.
  - `handlePigCoinRefund`(`fortune.js:3228-3252`)가 `metadata.accessType:"membership_credit"` 행을 건너뛰게 한다. 옛 월정석 행이 포인트로 환불되기 때문이다. `service-execution-task.js:461`처럼 하면 된다.
  - neo-operation-room `:579`의 `const settled` 들여쓰기를 고친다.

### P2 — 서버 이전 상품의 품질

- [ ] **15. 화면 버그**
  - **자미 USER_NAME 이중 escape**
    - `worker/lib/saju-section/report.js:367`이 이미 escape한다.
    - `paid-ziwei.src.js:1589-1591`(`loveNameSafe`)·`:3780`(`userLabel`)이 한 번 더 한다. `&`가 있는 이름이 `&amp;`로 보인다.
    - 안쪽 escape를 빼고 runtime을 다시 만든다. 다른 렌더러는 미리 escape된 값에 기대므로 공용 쪽은 건드리지 않는다.
  - **자미 서버 로딩 상태가 어두운 모달에서 밝은 상자로 보인다**
    - `js/core/saju/section-client.js:75-80` `statusNode()`가 밝은 인라인 색을 쓰고, `loadZiwei`(`:838`, `:851`)가 이것을 쓴다.
    - 어두운 변형 `extremeTStatus()`(`:230-234`)가 이미 있다.
  - **숙요 인연 도감 필터가 서버 재렌더 뒤 동작하지 않는다**
    - `saju-engine-tarot-sukuyo-quantum.js:11356-11371`의 `__syDogamFilterBound` 1회 가드가 예전 노드만 묶는다.
    - 부분 문자열 일치(`cats.indexOf(key)>=0`)의 경계 버그도 있다.
- [ ] **16. 서버 계산에 CMS 문구 덮어쓰기가 적용되지 않는다**
  - 브라우저: `syReadingOverrideByIndex`(`:7528`)·`syCompatOverrideByIndex`(`:7700`)가 `window.__cdCmsRecord`를 쓴다.
  - 서버 사본은 `typeof window` 확인 때문에 항상 기본 문구를 쓴다(`runtime.generated.mjs:5448`, `:5609`).
  - 동물점 `cmsRecordRow`는 스텁이다(`:25033`). 관리자 stage-result 항목도 지워졌다(`app/admin/cms/_lib/base-values.ts:126`).
  - 할 일: 서버가 CMS 레코드를 읽어 runtime 문맥으로 넘긴다.
  - 운영에 덮어쓰기가 실제로 있는지는 DB 조회라 사용자 승인이 필요하다.
- [ ] **17. 퀀텀 카드 상태**
  - `__cdQuantumRendered`는 true로만 바뀐다(`section-client.js:219`). 차트를 바꿔도 초기화되지 않는다.
  - `_sajuPromptPrepareQuantumDigest`(`saju-engine.js:6974-6985`)는 비동기 로드만 걸고 false를 돌려준다. 그래서 해금 직후 첫 AI 프롬프트에 퀀텀 본문이 빠진다.
- [ ] **18. 숙요 극T**
  - `requestBody()`(`section-client.js:38-49`)가 모달에 보이는 프로필이 아니라 전역 `cdBirthScopeCurrentProfileId`를 쓴다.
  - 본문 캐시가 없어 다시 그릴 때마다 서버를 왕복한다(`loadExtremeT` `:239`).
- [ ] **19. 클라이언트에 남은 데이터**
  - `ENERGY_COORD_DB`(`js/saju-engine.js:2081-2332`)는 쓰는 곳이 없다. 클라이언트 사본을 지운다.
  - 재능 카드 `QUEST_DB`(`js/entertain-engine.js:616`)와 퀘스트 그리드는 아직 클라이언트에 있다.
  - 인연 도감 요청이 클라이언트 숙 인덱스(`userMansionIdx`, `section-client.js:298`)를 보낸다. 서버가 출생으로 다시 계산하게 한다.
- [ ] **20. 리포트 카드 다듬기 (낮음)**
  - 매력 카드 영어 출력에 한국어가 섞인다(`paid-charm.src.js`에 언어 분기 없음).
  - 응답마다 CSS를 다시 보낸다(`report.js:405`, `:416`, `:422`, `:436`).
  - 건강 대체 계산 `getHealthFallbackTodayElement`(`paid-health.src.js:604`)가 로컬 Date로 일간을 만든다.
- [ ] **21. 동물점 페이지**
  - 제목에 "무료"가 있다(`app/saju/animal-destiny/page.tsx:6`).
  - 페이지 안에 구매 버튼이 없고 "홈에서 해금 확인하기"(`copy.ts:370`)뿐이다. 잠금 문구는 "코인"이다(`:366`).
  - 제목은 S, 구매 버튼은 M이다.
- [ ] **22. 숙요 궁합 상대 출생지**
  - `saju-section.js:128-129`가 두 사람 모두 `body.place`를 쓴다. 입력 칸이 없어서 의도한 것이다.
  - 상대 출생지 입력 칸을 추가할지는 사용자가 결정한다.

### P3 — 가드·QA 스크립트·문서

- [ ] **23. 낡은 브라우저 QA 스크립트**
  - `scripts/verify-ziwei-report-browser.mjs:75`: 자미 궁합 가격 30을 50으로 고친다(레지스트리 `:275`).
  - `scripts/verify-saju-daewun-quality-browser.mjs:71`, `:92`, `:137`: 지워진 `renderQuantumStrategy`를 부른다. 서버 전달 기준으로 다시 쓰거나 지운다.
  - `scripts/verify-crafted-quantum-saju.cjs`: 모든 `/api/*`에 일반 응답을 줘서 서버 본문이 오지 않는다.
  - `scripts/verify-crafted-astro-unlocks.cjs`: 로컬 서버가 필요하고, package.json과 CI 어디에도 연결돼 있지 않다.
- [ ] **24. 문서·원장 갱신**
  - `docs/product-details/product-ledger.json:666`이 아직 `transit-reading.js year/renderYear`를 렌더러로 적는다. `:659` 근처의 `priceSnapshotKRW: 3000`은 정본 5,000원과 다르다.
  - `docs/product-details/sale-symbol-evidence.json:116`이 옛 `R.renderYear(y)` 줄을 인용한다.
  - `docs/payments/payment-p0-inventory.json:3992-4020`(`astro_yearly_transit`)에 `paid-yearly.cjs`가 없다. 다른 서버 이전 상품(퀀텀·리포트 카드·숙요·자미·점성)의 출처 칸도 같이 맞춘다.
  - `docs/context/payment-gating.md`는 현행과 맞는지 다시 읽는다. 명시적 오류는 아직 못 찾았다.
- [ ] **25. 달력 가드 허용 목록 2건**
  - `scripts/verify-shell-korean-calendar.mjs:706-707`(`_t24TermDate`·`_t24BirthDate`)
  - 대상 `js/saju-engine.js:10046`, `:10062`를 벽시계 부품으로 만들고 허용 목록에서 뺀다.
- [ ] **26. gitleaks 경로 허용**
  - `.gitleaksignore`에 "Api Karma" 지문이 쌓인다(9개 이상).
  - `.gitleaks.toml`에 `runtime.generated.mjs` 경로나 그 i18n 값의 정규식 허용을 넣으면 끝난다.
  - **규칙 변경이라 사용자 승인이 먼저다.**
- [ ] **27. 선택**
  - `verify:sukuyo-role-direction`은 PR CI(`.github/workflows/pr-ci.yml:562`)와 `--profile=all`에서는 돈다. fast 프로필에도 숙요 경로 트리거를 넣을 수 있다.
  - 마야 홈 타일(`index.html:15545-15556`)에 `data-feature-key`·`data-coin-cost`를 붙여 가격 가드에 묶는다.

### 다른 문서에서 다루는 것

- `verify:mobile-journeys` 간헐 실패(뒤로 가기 뒤 스크롤 잠김, 고정 220ms 대기)
  - 원 작업의 push 2건(`9582030b4`, `fe6b0f30b`)에서도 실패했다. 실패 job을 다시 돌려 통과했다.
  - 이 과제는 `docs/handoff/fusion-v2-home-followups-20261017.md` 3번이 맡는다.
- 자미두수 생애·연간 흐름(`ziwei_life_yearly_flow`) 서버 이전
  - 원 문서의 `next:`가 맡는다. 가드 확장이 자동 모드에 막혀 사용자 처리를 기다린다.
  - WIP: `D:/Development/codedestiny-worktrees/ziwei-life-yearly-flow-wip-20261017.patch`

## 사용자 결정 대기

- **계정 묶음 해금을 프로필과 상관없이 인정할지**
  - `hasLegacyBundlePurchase`(`worker/lib/paid-content-read-access.js:51-66`)는 userId로만 찾는다. 호출은 `saju-section.js:236`이다.
  - 매핑(`saju-section.js:21`): 에너지·건강 → allPaidSaju, 재능 → allPaidSaju·rpgCharacter, 비밀의 집 → allPaidSaju·secretHouseEpisodes
  - 프로필로 좁히면 예전 구매자가 다른 프로필에서 재잠금될 수 있다.
- **마야 홈 타일 "1회 5,000원"**
  - 키 `maya-prompt-generator`는 회당 50코인(`paid-feature-registry.js:252`, `:581`)이라 지금 문구와 맞는다. 표기를 유지할지 확인한다.
- **CURRENT_DEV_BASELINE.md 정리**: 다른 담당이 하기로 했다. 그 전까지 check:fast는 doc-freshness에서 멈춘다.
- **운영 확인(읽기 전용 조회 승인 필요)**: 10-14 결제 완료된 융합 운세 2건(`dh*****@naver.com`, `hs********@naver.com`)의 상담 문서가 `status: partial`로 남아 있다.

## 받아들인 위험 (고치지 않는다)

- 배포 전에 이미 쓰인 증빙은 claim 기록이 없어서, 배포 뒤 한 번은 더 쓰일 수 있다.
- moonstone은 "부여 → 차감 → 실패 시 되돌림" 순서를 유지한다(전달 우선).
- Google Play 빈 `obfuscatedExternalAccountId`: 예전 구매 복원 때문에 통과시킨다.
- 엔티틀먼트가 생기기 전에 이용권으로 본 FPTI 사용자는 게이트를 한 번 다시 거친다.

## 확인만 하면 되는 것

- `__tests__/worker/fortune-today-hub.route.test.js`: 원 작업 초기(10-16)에 main에서 8건 실패했다. 10-17 check:fast의 test:jest는 통과했다. 전체 jest에서 다시 확인한 뒤 닫는다.

## 결과 기록

- (항목을 끝낼 때마다 날짜·SHA·검증을 여기에 적는다)
