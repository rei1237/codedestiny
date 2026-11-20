---
status: in-progress
updated: 2026-11-20
next: "R10 남은 4종(sukuyo-compatibility-ai(PG 단건 포함) → karma-destiny-ai(7일 차감 보류) → naming-prompt(PG 단건) → fusion-fortune(24시간 → 7일 창))을 베다점·점성술·자미두수(실측 'R10 베다점'·'R10 점성술'·'R10 자미두수')와 같은 모양으로 서비스마다 TDD·커밋. 사용자 결정 2026-11-20 3건은 위 결정 절에 있다(다시 묻지 않는다). 공용 패널 app/components/ExpertRetryPanel.tsx 와 환불 크론 EXPERT_RETRY_SETTLERS 표에 한 줄씩 붙인다. 4종 끝나면 R9 절차로 머지·체인·push"
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
- 커밋(push·main 머지 안 함): `e11840bf4` R1 · `e62ce85fd` R2 수정 라운드 · `89c05a3bc` sitemap 원장(네오 결과 화면 서명) · `3915323c7` 7일=생성 시각 · `9f725b7a3`+`39fcbd4a0` R3 · `14a12f0d1`+`d7eea47b5` R4 · `7ed35229a` 보안 버킷(R3·R4 공통) · `0a3f1942d` Toss 하네스 · `b402a1ef7` 문서 · R2b `e86b0c779`·`d113288d1`·`e89217af9`·`4e5eae70d`·`d7be2c558` · R5 `4c81511e5`(워커)·`3926da828`(클라이언트)·`1968b0488`(sitemap 원장) · R6 `4d13f4692`(워커)·`35caa1280`(클라이언트)·`8e0f4eb51`(sitemap 원장) · R7 찻집 `1cec195b8`(워커)·`dd51e5355`(클라이언트)·`6759ad789`(sitemap 원장) · R7 코덱스 `d16920bf3`(워커)·`5ed4f9258`(클라이언트+원장) · R7b `384d3b8f6`(보관함+원장) · 이 문서 갱신 커밋.
- 2026-11-20 R9: 위 커밋 전부 + R8 `2c36ae32f`·`acce61a44` 를 origin/main 과 머지(`30d6c6a95`)해 main 에 push 했다(스테이징까지, 운영 승격 없음). 이후 R10 은 같은 워크트리에서 이어 가거나, 새로 시작하면 main 에서 새 워크트리를 만든다.
- R2b 의 `d113288d1`(환불 크론)은 `e89217af9`(라우트의 `settleDueNeoRetryRefunds`)와 함께 머지해야 한다 — 단독이면 try/catch 로 막히지만 네오 창 경과 환불이 돌지 않는다. R1·R2b·R3·R4 를 한 묶음으로.
- 🔴 R1 은 단독으로 머지·push 하지 않는다 — 신년·인생의 책에 다시 시도 UI·재개 엔드포인트(R3·R4)가 없어, 그 상태로 나가면 고객은 최대 7일간 실패 화면만 보고 환불도 받지 못한다. → 2026-11-19 R3·R4 완료로 R1·R3·R4 는 한 묶음으로 머지 가능(R9 에서, 묶음째로만).

## 승인 상태
- 이 요청은 **코드 수정·main push(스테이징 배포까지)** 승인이다.
- 🔴 **운영 승격은 승인 없음.** 끝나면 결과를 보고하고 사용자에게 1회 승인을 받은 뒤에만 Release production 을 dispatch 한다. push 를 승격 승인으로 확대하지 않는다.
- 과금 LLM 실호출 승인 없음 → 전부 mock(`scripts/run-mock-tests.mjs`, LLM_DRY_RUN).
- 실결제·운영 DB 쓰기·환불 실행 금지.
- **사용자 결정 2026-11-19 (AskUserQuestion, 원문)**
  1. 네오 첫 브리핑: **"다시 시도 먼저로 변경 (추천)"** → 승인됨. 이번 묶음(R1·R3·R4) 밖이라 R2b 단계로 둔다. 다시 묻지 않는다.
  2. 환불 기한: **"결제(생성 시작) 후 7일 (추천)"** → `refundAt` 은 다시 시도 가능으로 바뀐 시각이 아니라 **상담 생성 시각 + 7일**, 늘리지 않는다. 복구 크론 7일 창과 같다. 반영 `3915323c7`.
- **사용자 추가 요청 2026-11-20 (원문, 승인된 범위)**: "보관함에서도 다시 시도 가능한 건은 따로 표시해주고 대표 상담, 전문가 상담은 그렇게 가능하도록해" → R7b(보관함 표시) 추가, R10 범위를 전문가 상담 전체로 확대. 다시 묻지 않는다.
- **사용자 결정 2026-11-20 (AskUserQuestion, 원문 — 막혀 있던 3건 해제, 다시 묻지 않는다)**
  1. fusion-fortune: **"7일 다시 시도로 통일 (추천)"** → 24시간 자동 환불을 다른 서비스와 같은 7일 다시 시도 창으로 바꾼다(refundAt = 생성 + 7일, 무료 다시 시도, 고객 환불 요청은 언제든).
  2. naming-prompt·sukuyo-compatibility PG 카드 단건: **"다시 시도+7일 환불 도입 (추천)"** → 무료 다시 시도 + 7일 경과/환불 요청 시 자동 환불을 넣는다(기존 공용 카드 자동 환불 함수 재사용, mock 으로만 검증).
  3. karma-destiny-ai: **"7일간 차감 보류 (추천)"** → 다시 시도 대기 동안 deferred usage 취소를 미룬다. 다시 시도가 성공하면 차감 확정, 7일 경과·환불 요청 시 취소.
  - 순서: astrology-ai → ziwei-ai → sukuyo-compatibility-ai(PG 포함) → karma-destiny-ai → naming-prompt → fusion-fortune. 컨텍스트가 부족하면 커밋된 서비스 경계에서 멈추고 `next` 갱신.

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
- [x] R2 네오(첫 브리핑 + 수정 라운드 버튼 확인) — 수정 라운드 '같은 답변으로 다시 시도'(`e62ce85fd`), 첫 브리핑은 R2b 에서 완료.
  - [x] R1 기한 정정(사용자 결정 2): 생성 + 7일, 연장 없음, 생성 7일 지난 첫 정체는 바로 환불. — `3915323c7`
- [x] R2b 네오 첫 브리핑 다시 시도 우선(사용자 승인 2026-11-19 "다시 시도 먼저로 변경 (추천)") — `e86b0c779`+`d7be2c558` 가드 · `d113288d1` 환불 크론 · `e89217af9` 라우트·클라이언트·테스트 · `4e5eae70d` sitemap 원장. 상세·검사는 실측 "R2b 네오 첫 브리핑". 아래는 고친 차단 요소(당시 줄 번호):
  - `worker/lib/checkpoint-refund-guard.js:41` — `generation_failed` 를 '결과 없음'으로 분류해 `service-execution-task.js` `settleExecutionById`(:846)·`sweepStaleServiceExecutions`(:1484/:1502)가 약 10분 뒤 자동 환불한다. retryable 표지가 있고 창 안이면 결과 없음이 아니라 보류로 분류해야 한다.
  - 네오가 `consultation-delivery-refund.js` `SERVICES` 에 없다 → 7일 뒤/고객 요청 환불 수집기가 없다(추가 또는 네오 전용 수집기).
  - 핸들러 catch 의 즉시 환불 `refundNeoGenerationFailure`(:1957), 장당 8회 상한(:1070, :1864), 시작·재개 409 차단(:1801, GET /result :2006-2013).
- [x] R3 인생의 책 — `9f725b7a3`(워커·클라이언트·테스트) + `39fcbd4a0`(sitemap 원장). 종결 실패 → generation_failed + llmMeta.retryable(생성+7일), 본문 비노출 유지. POST /api/life-book-ai/retry(실패·보수 대기 장만 시도 수 0 으로 열고 웨이브 예산 초기화, 같은 CAS) · POST /refund-request(markRetryableRefundDue → settle). 소개·결과 화면에 "다시 시도 · 추가 결제·차감 없음" + "다시 시도 대신 환불 요청", 다시 시도 가능할 때 새 책(새 결제) 링크 숨김. 즉시 환불 유지(가정): Toss 네이티브·supportRecovery·DEFERRED_USAGE_APPLY_FAILED·LIFE_BOOK_RESULT_INCOMPLETE(전달 단계 조립 실패, 다시 시도해도 같은 결과). 다시 시도 경로는 증빙 해제·차감 취소를 하지 않는다(같은 결제 건 이어 쓰기). 검증: life-book behavior 78/78, ux.static 10/10, wake-recovery 등 node --test 94/94, jest stuck·recovery-task·delivery-contract 75/75, verify life-book-flow·paid-llm-delivery·payment-freeze·legal-copy·paid-gate-scope·audit-ai-locale --check 통과, tsc 0.
- [x] R4 신년운세 — `14a12f0d1`(워커·클라이언트·테스트) + `d7eea47b5`(sitemap 원장) + `7ed35229a`(보안 분류기: `/retry`→start, `/refund-request`→ensure — R3 에서 빠졌던 것도 함께) + `0a3f1942d`(Toss 하네스 스텁). handleStart catch → generation_failed + llmMeta.retryable(생성+7일), 503 `{reason:'LLM_ERROR', refunded:false, retry:{available, refundAt, sessionId}}`(최상위 `retryable` 은 클라이언트에서 "계속 폴링"이라 쓰지 않음). handleStart·handleResult 409 에 같은 retry 표지. POST /api/new-year-ai/retry(소유자 확인 → reopen + `newYearRetryReset`: 받아들여지지 않은 savedSections 의 실패·사유 초기화, 다시 연 섹션 접두 attempts 삭제 → 한 웨이브) · POST /refund-request. 클라이언트: "다시 시도 · 추가 결제·차감 없음" + "다시 시도 대신 환불 요청"(웹 전용), 다시 시도 가능하면 폼 제출도 무료 다시 시도로 보냄(새 결제 없음), LLM_ERROR_MESSAGE 정정. 즉시 환불 유지(가정): Toss 네이티브·supportRecovery·DEFERRED_USAGE_APPLY_FAILED·창 만료.
- [x] R5 연애 비책 — `4c81511e5`(워커·환불 크론·테스트) + `3926da828`(웹 다시 시도·환불 요청 UI, 12로케일) + `1968b0488`(sitemap 원장). 상세·검사는 실측 "R5 연애 비책".
- [x] R6 흑월 — `4d13f4692`(워커·가드·환불 크론·복구 레지스트리·테스트) + `35caa1280`(웹 다시 시도·환불 요청 UI) + `8e0f4eb51`(sitemap 원장). Toss 네이티브(`worker/toss/native-heukwol.js`)는 변경 없음(아래 가정). 상세·검사는 실측 "R6 흑월".
- [x] R7 찻집 · 마스터 인연의 서
  - [x] R7 찻집 — `1cec195b8`(워커·환불 크론·테스트) + `dd51e5355`(웹 다시 시도·환불 요청 UI) + `6759ad789`(sitemap 원장). 상세·검사는 실측 "R7 찻집".
  - [x] R7 마스터 인연의 서 — `d16920bf3`(워커·복구 크론·테스트) + `5ed4f9258`(결과 화면 다시 시도·환불 요청 버튼 + sitemap 원장). 상세·검사는 실측 "R7 마스터 인연의 서".
- [x] R7b 보관함(사용자 요청 2026-11-20): 꿀꿀운세 `/records` 에서 다시 시도 가능한 상담(retry 표지, 창 안)을 일반 '실패'가 아니라 별도 상태 "다시 시도 가능"으로 표시하고, 서비스별 다시 시도 진입(결과 화면 링크 또는 버튼)을 단다. `/yeongnyangi/library/` 분리 규칙 유지(영냥이 기록 섞지 않음), 완성 결과는 숨기거나 지우지 않는다. 참고: 흑월 보류 건은 지금 pending 이라 "생성 중"으로 보이고(record-library.js:35,49), 연애 비책·인생의 책·신년·네오는 '실패'로 보인다 — 서비스마다 retry 표지 위치가 다르다(흑월 `metadata.retryable`, 나머지 `llmMeta.retryable`). → `384d3b8f6`. 상세는 실측 "R7b 보관함".
- [x] R8 검증기: 계약 목록 각 서비스가 "실패 시 retryable + 다시 시도 경로 + 7일 환불"을 갖는지 fail-closed 로 검사(`scripts/verify-paid-llm-delivery-contract.mjs` 확장, 변이 1종으로 무는지 확인). 문서 `docs/context/ai-and-db.md` 유료 LLM 전달 계약 절 갱신. — `2c36ae32f`(검증기) + `acce61a44`(문서). 상세는 실측 "R8 검증기".
- [x] R9 대표 7종 머지 → `npm test --prefix apps/toss` → `npm run check:fast -- --base=<origin/main SHA>` → `node scripts/run-paid-gate-suite.mjs --base=<SHA>` → `node scripts/verify-myeongri-tables.mjs` → `npm run check:pre-push` → push → main CI(PR CI·Paid Flow Gates) 녹색. — `30d6c6a95`(origin/main `a933d2a1b` 머지) + 이 문서 커밋, `git push origin HEAD:main`. 상세는 실측 "R9 머지". push 뒤 main CI 결과는 다음 세션이 첫 push 전에 1회 확인한다.
- [ ] R10 "다른 기능들" + 전문가 상담(사용자 요청 2026-11-20으로 범위 확대): 서비스 안내의 전문가 상담 묶음(`#guide-expert` / `/consultations/`)의 유료 LLM 상담 전부 — 예: vedic·ziwei·astrology·nakshatra·karma·sukuyo 등 계약 목록에 있는 전문가 상담 — 에 같은 다시 시도 우선 정책(무료 다시 시도 → 생성 + 7일 또는 고객 요청 시 환불). 🔴 추측하지 말고 정확한 목록을 먼저 지도로 만든다(안내 소스·계약 목록 대조). 그다음 계약 목록 나머지 서비스에 같은 정책을 묶음별로(서비스마다 커밋). 지도 → TDD → 검사 체인 → push.
  - [x] 지도 — `22f171334` (실측 "R10 전문가 상담 지도")
  - [x] vedic-ai — `b0dd824ba`(워커·환불 크론·보관함·검증기·테스트) + `f474e9484`(공용 패널·웹 UI·보존 해시) + `4e78dc0f9`(sitemap 원장). 실측 "R10 베다점"
  - [x] astrology-ai — `ff1da44e5`(워커·실행 가드·환불 크론·보관함·검증기·테스트) + `f665216e0`(입력·결과 화면 패널·보존 해시). 실측 "R10 점성술"
  - [x] ziwei-ai — `ac855a7d1`(워커·환불 크론·보관함·검증기·테스트) + `835dc1e75`(단일 화면 패널) + `cf8e4f6c4`(sitemap 원장). 실측 "R10 자미두수"
  - [ ] sukuyo-compatibility-ai
  - [ ] karma-destiny-ai
  - [ ] naming-prompt
  - [ ] fusion-fortune
  - [ ] 6종 끝 → R9 절차(origin/main 머지·미러/sitemap 재생성·체인·check:pre-push·조상 확인·push·CI 1회). 그 전에는 push 하지 않는다(지시).
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
S15 품질: 한자 증가, 연애 비책 용신 데이터("금") vs 판정(토) 불일치, 흑월 근거 실패 3→5, '조심'인데 '기회' 톤. 연애 비책 정체 환불 재시도가 `refundEligibleAt` 미사용(R5: 창 안 정체는 해소, 생성 7일 경과 정체는 기존 경로). 마스터 인연의 서 운영 스크립트 재개방 위험 미확인. S14 프롬프트 최적화 대기.

## 실측
### R10 점성술·자미두수 검사 체인 (2026-11-20, HEAD `cf8e4f6c4`, push 안 함)
- 모두 exit 0: `npm run check:fast -- --base=34f58616f`(critical 자동 승격, jest 484 스위트(1 skip) 8341 통과) · `node scripts/run-paid-gate-suite.mjs --base=34f58616f` 통과 91 / 실패 0(벽시계 1277s, 전체 npm test 포함) · `npm test --prefix apps/toss` 1765/1765(임시 정션 → 정션만 제거, 본 체크아웃 node_modules 유지 확인) · `node scripts/verify-myeongri-tables.mjs` OK(검사 29건, 대조 키 216개 잔차 0).
- 미검증: 두 서비스 패널의 headed 브라우저 화면 확인은 하지 않았다(동작 테스트만).

### R10 자미두수 (2026-11-20, `ac855a7d1`·`835dc1e75`·`cf8e4f6c4`)
- 서버(`worker/routes/ziwei-ai.js`): 베다점 모양. `calculated` = 이어서 하기(`delivery_pending`)이거나 명반이 풀린 뒤. 웹 결제 건 생성 실패만 보류(`ziweiRetryMeta`, 접근 스냅샷 `ziweiRefundAccessSnapshot` — 토큰 없음) → 503 + retry payload, 시작 409 에도. `POST /retry`·`POST /refund-request`, `ziweiRetryReset` 은 상한을 다 쓴 미사용 묶음만 풀고 그 묶음의 `:skipped`·`:salvaged`·`:emptyRescue` 표지를 지운다. `ziweiRetryOwner` 는 Toss·다른 serviceType(운명의 섬, 컬렉션 공유) 거절. 정산 `settleZiweiRetryRefund`: 이용권 복원 → 카드 환불(실패면 "failed", claim 유지) → 증빙 해제 → `refundSettledAt` → `logStuckSettled`. 크론 export `settleDueZiweiRetryRefunds` → `EXPERT_RETRY_SETTLERS`. 검증기 ziwei-ai → `RETRY_FIRST_POLICY`. 보관함 테스트 `recoveryHref:'/ziwei-ai/?cid=z1'`.
- 🔴 함정: `__tests__/ui/ziwei-execution-lifecycle.test.mjs` 가 `resolveStartAccess`·`handleResult`·`applyUsageOnce`·`verifyPaymentForStart`·`saveZiweiDelivery` 를 기준 커밋 20904183a 에 고정한다. `handleResult` 를 고쳤다가 가드에 걸려 되돌리고, `/result` 409 의 retry payload 는 웹 래퍼 `handleWebZiweiResult` 에서 붙였다(가드 약화 없음). Toss `handleTossZiweiResult` 는 의도적으로 그대로.
- 클라이언트(`app/ziwei-ai/ZiweiAiClient.tsx`, 결과 화면 없음): `retryHold` 상태 + `showHeldRetry`/`heldRetryFor`(Toss 는 null), 저장 상담 재개 catch·폴링 catch·생성 응답에서 보류를 잡아 같은 화면에 `ExpertRetryPanel`(apiBase `/api/ziwei-ai`, CSS `.ziweiRetryPanel` 등 전역 style 블록).
- 검사(모두 exit 0): jest ziwei-paid-delivery 55/55(변이 `calculated`→false 시 10 실패), 관련 23 스위트 295/295, ziwei-paid·섬·만료 주문 75/75, consultation-recovery-task·expert-consult-system-term 9/9; node --test consultation-delivery-refund 56/56, ziwei-execution-lifecycle 15/15, ziwei UI 14파일 전부, expert-retry-panel 6/6; Toss native-ziwei 3종 17/17, ziwei-chart-flow·japanese-copy·ui-poll 통과; verify:paid-llm-delivery(다시 시도 우선 10 · 대기 26 · 변이 36/36·40/40 · 알려진 자동 환불 공백 13), verify-ziwei-ai-consultation-flow·llm-generation-resilience·analysis-basis-contract·payment-service-boundary·ziwei-worker-chart-facts·ziwei-consult-categories·ziwei-personality-context·phone-encryption.

### R10 점성술 (2026-11-20, `ff1da44e5`·`f665216e0`)
- 서버(`worker/routes/astrology-ai.js`): 베다점 모양(`astrologyRetryMeta`·`astrologyRefundAccessSnapshot`·`astrologyRetryPayload`·`astrologyRetryReset`·`astrologyRetryOwner`·`handleRetry`·`handleRefundRequest`·`settleAstrologyRetryRefund`, export `settleDueAstrologyRetryRefunds` → `EXPERT_RETRY_SETTLERS`). 계산 오류 422·Toss·표지 저장 실패·창 지남은 기존 즉시 환불(`failServiceExecution(forceRefundOnClose)` 포함).
- 실행 가드: `worker/lib/checkpoint-refund-guard.js` 의 다시 시도 창 기능 키를 `RETRY_WINDOW_FEATURES`(neo + `astrology-ai-consultation`)로 넓혔다 — 창 안 보류는 `recoverable`(타임아웃 환불 아님), 창이 지나면 기존 `missing` → 환불. 테스트 `checkpoint-timeout-refund` 1건 추가.
- 클라이언트: 입력 화면 `AstrologyAiClient.tsx` 는 보류를 `RETRY_HELD:<id>` 로 받아 `/astrology-ai/result/?id=` 로 이동, 결과 화면 `AstrologyAiResultClient.tsx` 는 `/result` 409 의 retry 로 `ExpertRetryPanel`. 보존 픽스처 해시 재고정(`009a9124…`→`50a02bba…`, 의도한 결제 흐름 함수 변경, 커밋 메시지에 기록).
- 검사(모두 exit 0): 서버 jest 224/224, UI 12/12·10/10, Toss 38/38, verify:paid-llm-delivery 통과.

### R10 점성술·자미두수 범위 밖 발견 (보고만, 고치지 않음)
- paid-flow-gates 트리거 경로에 astrology 라우트·`ExpertRetryPanel`·가드·환불 lib 파일이 없고, change-risk 가 이들에 deepRequired=false.
- 자미두수 웹 `handleResult` 의 완료 목록 조회에 serviceType 필터가 없다(운명의 섬과 컬렉션 공유).
- 보류된 실행이 600초마다 다시 큐에 올라 sweeper 를 굶길 수 있다. `failServiceExecution` 결과를 무시한다.
- 점성술: 완성됐지만 품질 검사에 떨어지는 결과는 다시 시도가 같은 실패를 반복할 수 있다.
- 정산 중 이용권 환불이 throw 하면 점성술은 대기로 남지만, 자미두수 `restorePrepaidAccessOnFailure` 는 실패를 삼키고 false → 기록이 "not_required" 로 정산될 수 있다(기존 함수 동작).
- 자미두수 라우터가 `ctx` 를 `handleStart` 의 `recoveryAuth` 인자로 넘긴다(기존).

### R10 베다점 (2026-11-20, 워크트리 커밋 `b0dd824ba`·`f474e9484`·`4e78dc0f9`, push 안 함)
- 시작 전: R9 push `34f58616f` 의 PR CI 44697640465·Paid Flow Gates 44697640393 둘 다 success(1회 확인).
- paid-gate-auditor 사전 감사 반영: 다시 시도 전용 문구(llmFailed "자동으로 복구됩니다" 금지), 표지 저장 try/catch(실패 시 기존 즉시 환불로 떨어짐), isLive 보수적(generating/partial + updatedAt < 120s), 카드 환불이 실패하면 증빙 claim 을 풀지 않고 표지도 정산 안 함(크론이 다시 돈다), 새 라우트의 Toss 는 404/409. 결제 동결 영향 없음(verify:payment-freeze 통과). 보안 분류기 접미사 정규식(`worker/security/index.js:583,585`)이 `/retry`→start, `/refund-request`→ensure 로 서비스 무관하게 덮는다.
- 서버(`worker/routes/vedic-ai.js`): 차트 계산이 끝난 뒤(`calculated`) 웹 결제 건의 생성 실패만 `generation_failed` + `llmMeta.retryable`(`retryableFailureMeta`, refundAt = 생성 + 7일, `access` 스냅샷: accessType·paymentId·paymentDocId·source·evidenceType·evidenceId·purchaseId·prepaid·amount 화이트리스트) → 503 `LLM_FAILED` + `{refunded:false, retry:{available, refundAt, sessionId}}`. 시작 409·`/result` 409 에도 같은 payload. Toss·계산 오류·표지 저장 실패·창 지남은 기존 즉시 환불.
  - `POST /api/vedic-ai/retry`: 소유자만(`reopenRetryableConsultation` CAS), 상한 다 쓴 묶음만 시도 수 0 으로(`vedicRetryReset`, ":" 없는 키만), 완성 묶음 유지 → `handleStart`(resumeSessionId). `POST /api/vedic-ai/refund-request`: `markRetryableRefundDue` → `settleVedicRetryRefund`(이용권 복원 → 카드 환불 → 성공 시에만 claim 해제·`refundSettledAt`).
  - 크론: export `settleDueVedicRetryRefunds` → `worker/lib/consultation-delivery-refund.js` 의 새 표 `EXPERT_RETRY_SETTLERS`(리터럴 dynamic import, 서비스마다 try/catch, 테스트는 `options.expertRetrySettlers`로 교체 — 두 테스트 deps 에 `expertRetrySettlers: []` 추가). 남은 6종은 이 표에 한 줄씩.
  - 보관함: `worker/lib/record-library.js` `retryHeld` 가 이미 일반형이라 주석만, 테스트에 vedic → `retry_available`·`/vedic-ai/result/?id=v1`.
  - 검증기: vedic-ai 를 `KNOWN_RETRY_PENDING` → `RETRY_FIRST_POLICY`(`retryableFailureMeta`, `settleDueVedicRetryRefunds`, REFUND_CRON).
- 클라이언트: 공용 `app/components/ExpertRetryPanel.tsx`(ko·en·ja·zh-CN·zh-TW, 나머지 영어 폴백, 날짜·일수 약속 없음; `expertRetryHoldOf`·`probeExpertRetryHold`·패널은 sessionId 만 POST). 결과 화면은 폴링 실패 시 `/result?id` 를 한 번 더 읽어 보류면 패널. 입력 흐름(`startConsultation`/`handleSubmit`)은 보류 실패를 `RETRY_HELD:<id>` 로 받아 `/vedic-ai/result/?id=` 로 이동. 테스트 `__tests__/ui/expert-retry-panel.test.mjs`(4).
- 🔴 함정: `__tests__/fixtures/result-presentation-preservation.json` 이 vedic(그리고 astrology 결과·new-year·sukuyo)의 이름 붙은 함수 해시를 고정한다 — `startConsultation`·`handleSubmit`·`pollVedicResult`·`resumeSavedConsultation` 포함. 의도한 결제 함수 변경이면 그 함수만 같은 방식(ts AST getText, CRLF→LF, sha256)으로 다시 고정하고 커밋 메시지에 적는다. `pollVedicResult`·`resumeSavedConsultation` 은 건드리지 않았다(래핑으로 우회).
- 🔴 함정: Edit 도구가 CRLF 파일을 LF 로 바꾼다(검증기에서 실측) — CRLF 파일은 node 패치(\r\n 정규화 후 되돌림). 모의 모델의 `instanceof Date` 는 structuredClone 된 Date 에서 거짓(다른 realm) → toString 검사. 앱 파일을 고칠 때마다 sitemap 원장 드리프트 → 마지막 수정 뒤 `npm run sitemap:generate`.
- 검사(모두 exit 0): jest vedic-paid-delivery·record-library·paid-llm-delivery-contract 125/125, node --test consultation-delivery-refund 56/56, vedic UI 2종 6/6, ziwei-result-disclosure 외 3 25/25, expert-retry-panel 4/4, verify:paid-llm-delivery("다시 시도 우선 8개 … 대기 28개, 변이 32/32"), verify:vedic-ai-flow·payment-freeze·no-nested-retry·ai-prompt-billing-policy·worker-no-undef·cron-mongo-op-coverage, `npm run check:fast -- --base=34f58616f` critical 자동 승격 jest 484 스위트(1 skip) 8324 통과, `npm test --prefix apps/toss` 1765/1765(임시 정션 → 정션만 제거), verify-myeongri-tables OK, `node scripts/run-paid-gate-suite.mjs --base=34f58616f` 통과 91 / 실패 0(벽시계 941s, 전체 npm test 포함)
- 감사 메모(보고만): 보류 동안 코인 자동 환불 `/api/billing/refund` 는 claim 이 잡혀 있어 409 REFUND_NOT_ELIGIBLE. `consultation-delivery-refund.js`·`paid-delivery-stuck.js` 는 paid-flow-gates 트리거 경로에 없다(기존 공백). 미확인: resolveBillingEvidence 의 증빙 시간 제한 유무.

### R10 전문가 상담 지도 (2026-11-20, 읽기 전용 조사 · 기점 `34f58616f`)
- 대상 정본: `lib/brand/service-guide-webtoon.mjs:72-74` `guideGroups` expert ids = `app/consultations/stories.ts:5` `expertStoryIds` = ziwei·astrology·vedic·sukuyo-compat·legacy-naming·karma·fusion(7). 라우트 매핑 `app/consultations/ConsultationHub.tsx:31-33`, 기록 `lib/records/service-registry.js`. 계약 서비스 id = ziwei-ai·astrology-ai·vedic-ai·sukuyo-compatibility-ai·naming-prompt·karma-destiny-ai·fusion-fortune — 7개 모두 `KNOWN_RETRY_PENDING` 에 있다. nakshatra·human-design 등은 안내의 전문가 묶음이 아니다(나머지 계약 서비스는 R10 밖, 후속).
- 공통: 7개 모두 `settleStuckDelivery` 없음(fusion 제외 6개는 `KNOWN_STUCK_SETTLE_GAPS` — 정체 감시는 경보만), 7개 모두 Toss 네이티브 분기(`nativeTossContext`/`worker/toss/native-*.js`)가 있고 Toss 는 실패 시 환불 없이 lease 재시도. `/retry`·`/refund-request` 없음.

| 서비스 | 모델(models.js) · id · userId | 웹 종결 실패(줄은 기점 기준) | 응답 | 재개·차단 | 클라이언트 | 하네스(apps/toss/test) |
|---|---|---|---|---|---|---|
| vedic-ai | `VedicAiConsultation` :1447, status 5종 :1493, userId String | catch :1754-1764: generation_failed :1760 → 증빙 해제 :1761 → `restorePrepaidAccessOnFailure` :1762(이용권 :716) → 카드 환불 :1763(:856-879). 계산 불일치 409 :1755, 저장 장애 503 :1756 | 503 `LLM_FAILED` | `resumeSessionId` :1776-1785, generation_failed 409 :1677, `/result` 409 :1856 | `VedicAiClient.tsx` 오류 :3648(웹 재시도 없음), 결과 `result/VedicAiResultClient.tsx` 실패→missing :120-166, `resultCopy.ts` 5로케일 | native-vedic-boundary, vedic-ui-* (vm) |
| astrology-ai | `AstrologyAiConsultation` :1509, userId **ObjectId** | catch :1933-1947: generation_failed :1939 → 증빙 해제 → `failServiceExecution(forceRefundOnClose)` :1941 → 이용권 :1943 → 카드 :1945. 계산 오류 422/409 | 503 `LLM_ERROR` / 422 `CALCULATION_ERROR` | resume :1827-1835, 409 :1845, `/result` 409 :2002 | `AstrologyAiClient.tsx` 오류 :2303-2319(폼 재제출·새 상담), 결과 `result/AstrologyAiResultClient.tsx` :632-640, :754-761(한국어 하드코딩) | astrology-route-authority, astrology-poll/result-authority |
| ziwei-ai | `ZiweiAiConsultation` :1081(운명의 섬과 컬렉션 공유 → `serviceType` 필터 필수), userId String | catch :2859-2871: generation_failed :2866 → `restorePrepaidAccessOnFailure` :2867 → 증빙 해제 :2868 → 카드 :2869. V2 는 salvage(:1992-2005)라 종결 실패 적음 | 503 `LLM_ERROR` | resume :2757-2765, 409 :2775, `/result` 409 :3015 | `ZiweiAiClient.tsx` 단일(오류 :1432, 웹 재시도 없음, ERROR_TEXT 한국어만) | native-ziwei-boundary, ziwei-ui-poll |
| sukuyo-compatibility-ai | `SukuyoCompatibilityAiConsultation` :1402, userId ObjectId | 본문 없음 → generation_failed + 환급(:2299-2315; 이용권 :1910, 월정석 :1933, 코인 :1937, PG 단건은 환불 안 함 :1921). 판1 partial 은 `recoveryReviewRequired` 로 굳음(:2289-2297) | throw → `LLM_FAILED` | resume :2017-2027, 웹 409; Toss 만 `retryGeneration` + `manualRetryCount<2`(:2080-2083) | `SukuyoCompatibilityAiClient.tsx` 오류 :2173-2180, ERROR_TEXT 한국어 | sukuyo-failed-retry(라우트), sukuyo-retry-ui, sukuyo-ui-boundaries |
| karma-destiny-ai | `KarmaDestinyAiConsultation` :989, userId String | `/start` 실패 :2873-2908, `/generate-batch` 실패 :3138-3146: generation_failed → 증빙 해제 → 이용권 환급 → deferred usage 취소(:2477-2489) | 503 `LLM_ERROR` / 422 `CALCULATION_ERROR` | `/generate-batch` 1장씩, 409 :2748/:2959/:2987, `/result` 409 :3196 | `result/KarmaDestinyAiResultClient.tsx` 실패 :1235-1243(웹은 입력 다시 링크만), `KARMA_RESULT_COPY` 12로케일 | karma-ui-recovery |
| naming-prompt | `PaidExecutionRecord`(featureId premium-naming-prompt) :883, **llmMeta 없음**(`result.namingPrompt`·`error`), status 8종 | 빈 실패 확정 → `markNamingGenerationFailed` :1474 → `restoreNamingAccessOnFailure` :1810(월정석·이용권만, 단건 환불 없음 :1485) | 503 `LLM_ERROR` retryable:false; 그 밖 503 `RESULT_STORAGE_UNAVAILABLE` retryable:true | `resumeExecutionId` :1708-1716, 409 `GENERATION_LIMIT_REACHED` :1446; `limited` partial 정체 가능(:1833) | `result/NamingAiResultClient.tsx` 실패 :449-468(retry 버튼 + 링크), 문구 5로케일 — 이미 "결제 유지·다시 시도" 안내(서버와 불일치) | 없음(vm) |
| fusion-fortune | `FusionFortuneConsultation` :1982, userId String, `generationLease` | 요청 중엔 실패로 닫지 않음(매번 retryable, lib/fusion-fortune.js:1888-1918). 종결은 자체 크론 `markUndeliveredFusionRefunds`(fusion-fortune-recovery-task.js:79-137: BUDGET_EXHAUSTED·UNDELIVERED_24H·INPUT_MISSING_7D → generation_failed + refundEligibleAt) → `consultation-delivery-refund.js` SERVICES | 409 REFUND_PENDING(`fusionRefundResponse` :214-218) | `resumeGeneration` + manualGranted(:397); CLOSED_STATUSES 차단(consultation.js:22) | `FusionFortuneClient.tsx` 실패 카드 :3091-3102, 12로케일 | native-fusion-boundary, fusion-billing |

- 정책 판단(새 결정 아님, 같은 정책 적용 가정): naming 단건 카드·sukuyo PG 단건은 지금도 실패 시 자동 환불이 없다(기존 결함) — 다시 시도 우선으로 바꿔도 환불 경로는 기존 그대로(창 만료·요청 시 같은 복원 함수). fusion 은 요청 중엔 이미 무료 재시도이고 24시간 미전달 크론이 환불로 닫는다 → 이 크론을 "다시 시도 가능(생성+7일)"로 바꾸는 것이 변경점. karma 는 실패 시 deferred usage 를 바로 취소한다 → 보류 동안 취소를 미룬다(신년 R4 와 같은 모양).

### R9 머지 (2026-11-20)
- 머지: origin/main `a933d2a1b` → `30d6c6a95`. 충돌 2건: `src/features/neo-war-room/data/result-copy.ts`(ja·zh-CN·zh-TW — main 의 `generationFailedRefundError` 월정석 문구 + 우리 `briefing*` 7키 둘 다 유지), `config/sitemap-lastmod.json`(--theirs 뒤 재생성).
- 재생성: sync:public OK · sitemap:generate 1086 URL, 원장 879, 갱신 7 · extract-saju-section-runtime --check PASS · build-saju-natal-core --check PASS (미러·sitemap 은 머지 커밋에 포함).
- 체인(merge-base = origin/main `a933d2a1b`, 모두 exit 0):
  - `npm test --prefix apps/toss` 1765/1765 (57.6s, main 체크아웃 node_modules 임시 정션 → 정션만 제거)
  - `node scripts/verify-myeongri-tables.mjs` OK (29 검사, 216 키, 잔차 0)
  - `npm run check:fast -- --base=a933d2a1b…` critical 자동 승격, jest 484 스위트(1 skip) 8318 통과
  - `node scripts/run-paid-gate-suite.mjs --base=a933d2a1b…` 통과 91 / 실패 0 (780.7s), 플레이크 재실행 없음
  - `npm run check:pre-push` exit 0
- push 직전: `git fetch` 뒤 origin/main 그대로(`a933d2a1b`), `merge-base --is-ancestor` OK. main 의 PR CI(`a933d2a1b`)·Paid Flow Gates(`bb4a65b7d`) 녹색 확인 후 push.
- 운영 승격은 하지 않았다(승인 없음).

### R8 검증기 (2026-11-20, 워크트리 커밋 `2c36ae32f`·`acce61a44`)
- `scripts/verify-paid-llm-delivery-contract.mjs` 검사 8 추가(`checkRetryFirst`·`retryFirstMutationCheck`, `main` 에서 기존 오류와 합침).
  - 분류(fail-closed): 계약 36개 서비스는 `RETRY_FIRST_POLICY`(7) 또는 `KNOWN_RETRY_PENDING`(29, 정확히 일치) 중 정확히 하나. 미분류·이중 분류·낡은 항목 실패. 대표 상담 = `lib/saju/saju-service-catalog.mjs` `saju-signature` featureKey 7개 → 전부 retry-first 여야 함(읽지 못하면 실패).
  - 서비스마다 4근거: (1) 표지 — 계약 파일이 `paid-delivery-stuck.js` 의 `retryableFailureMeta`(네오·인생의 책·신년·연애 비책) 또는 `retryRefundAt`(흑월·찻집·코덱스)을 import 해 사용 (2) `path === ".../retry"` (3) `path === ".../refund-request"` (4) 7일 정산 기호 export + 크론 파일 참조: 네오·연애 비책·흑월·찻집 `settleDue…RetryRefunds` → `consultation-delivery-refund.js`, 신년·인생의 책 `expireRetryableConsultations` → `consultation-recovery-task.js` + `GENERIC_STUCK_SETTLERS` + 환불 cron `SERVICES` 키, 코덱스 `codexRetryDue` → `master-love-codex-recovery-task.js`. 크론 사슬(`RETRY_CRON_CHAIN`)을 `worker/index.js`(`runConsultationRecovery`·`runMasterLoveCodexRecovery`)까지 확인.
  - 자기 변이: 7서비스 × 4근거를 하나씩 지운 소스로 재판정 → 28/28 실패(탐지).
  - 가정: 지시문은 "refund cron(`consultation-delivery-refund.js`)에 배선"이라 했지만 신년·인생의 책은 복구 cron → `refundEligibleAt` → 환불 cron, 코덱스는 자체 복구 cron 이 실제 배선이라 그대로 검사한다.
- 실행: `node scripts/verify-paid-llm-delivery-contract.mjs` exit 0 — "계약 36개 … 변이 36/36 탐지 / 다시 시도 우선 7개(대표 상담 7종), 대기 29개, 변이 28/28 탐지". eslint 0.
- 수동 변이(소스 직접 수정 → 복원, 복원 뒤 git status 깨끗): ① `consultation-delivery-refund.js` 찻집 `settleDueTeaHouseRetryRefunds` 호출 제거 → exit 1 "fortune-tea-house: 7일 정산 … 크론 … 에 배선되지 않았다" ② `heukwol.js` `/api/heukwol/refund-request` 분기 제거 → exit 1 "heukwol: POST /refund-request 라우트가 없다". 탐침: palm 을 대기 목록에서 빼면 "미분류", 흑월을 정책에서 빼면 "대표 상담 … 다시 시도 우선이 아니다", 대표 키 빈 배열·GENERIC 에서 new-year 제거도 각각 실패.
- 배선: `package.json` `verify:paid-llm-delivery` → `scripts/run-paid-gate-suite.mjs:138`(항상 실행 목록) → `.github/workflows/paid-flow-gates.yml:551`. 새 배선 불필요.
- 문서: `docs/context/ai-and-db.md` 보장·우선순위 4·정체 감시·대표 상담 완성본 문장을 새 정책으로 고치고 "### 다시 시도 우선 (대표 상담, 2026-11-20 R8)" 절 추가(흐름·표지·경로·즉시 환불 예외·검증기). check:fast(fast tier, doc-freshness) exit 0.

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
- (b) ~~7일은 다시 시도 가능으로 바뀐 시각부터 센다~~ → **사용자 결정(2026-11-19 "결제(생성 시작) 후 7일 (추천)")으로 생성 시각 + 7일**(`retryRefundAt(doc)`: createdAt → `_id` 시각 → now 순). 기존 `refundAt` 은 늘리지 않는다. `3915323c7`.
- (c) 🔴 R1 단독 배포 금지(위 '지금 상태').
- (d) 네오 첫 브리핑은 이번 묶음에서는 기존 즉시 환불을 유지한다. 사용자가 '다시 시도 먼저'를 승인했으므로 R2b 에서 바꾼다. → R2b 완료.

### R2b 네오 첫 브리핑 (2026-11-19~20, 워크트리 커밋 `e86b0c779`·`d113288d1`·`e89217af9`·`4e5eae70d`·`d7be2c558`)
- 사전 감사: paid-gate-auditor · regression-scout(공용 스위퍼 `service-execution-task.js`·`checkpoint-refund-guard.js`) 실행 뒤 착수.
- 가드: `checkpoint-refund-guard.js` 가 `neo-operation-room-consultation` 의 `generation_failed` 중 retryable 표지가 있고 창(생성+7일) 안·환불 전(deliveryRefund·refundEligibleAt·billingCleanupPending 없음)인 것만 `recoverable`. 그 밖의 서비스·창 경과·환불 시작·`includeResumable:false` 는 기존 `missing`. 🔴 함정: 처음엔 `paid-delivery-stuck.js` 의 `publicRetryState` 를 import 했는데 그 모듈이 mongoose `Types` 를 끌어와 `cron-shared-connection-teardown` jest 2건이 깨졌다(mongoose 모의에 Types 없음) → 같은 판정을 가드 안에 인라인(`d7be2c558`).
- 환불 크론: `runPendingConsultationRefunds` 끝에 `settleDueNeoRetryRefunds`(옵션 `neoRetryRefunds` 로 주입 가능, try/catch 로 격리 — 실패는 `{service:'neo-operation-room', refundStatus:'pending'}`). 직접 호출 테스트(`paid-llm-delivery-contract`)는 스텁 주입 필요 — 안 하면 실제 라우트 DB 대기로 5s 타임아웃.
- 라우트(`worker/routes/neo-operation-room.js`): handleStart catch → `neoRetryMeta` 가 null 이 아니면 `generation_failed` + `llmMeta.retryable` 저장, 503 `{reason:'LLM_ERROR', refunded:false, retry:{available, refundAt, sessionId}}`. 시작 409·GET /result 409 에도 같은 retry 표지(계산 오류 제외). POST `/retry`(소유자 CAS reopen + `neoRetryReset`: 8회 상한에 닿은 장 시도 수 0·`:lengthRepair` 삭제 → `handleStart` 한 웨이브) · POST `/refund-request`(`markRetryableRefundDue` → `settleNeoRetryRefund`). `settleDueNeoRetryRefunds`: 창 경과 건을 `expireRetryableConsultations` 로 환불 예약 → 예약 건을 `refundNeoGenerationFailure`(증빙 해제·실행 실패·이용권 복원·카드 환불, 단계별 멱등)로 정산, 카드 환불 'failed' 면 표지를 남겨 다음 크론에서 재시도. 정체(`settleStuckDelivery`)도 창 안이면 retryable 로, 창 밖이면 기존 환불.
- 즉시 환불 유지(가정): Toss 네이티브(요청·저장 문서), 계산 오류(`/BIRTH|CHART|CALCULATION/`), 결정론적 조립 실패(반복 문단·완성 판정 실패 — `noRetry`), 결제 취소(revoked) 정체.
- 클라이언트: `paid-delivery.ts` `readNeoRetryOffer` + 1차 브리핑 오류에 `retryOffer` 를 실음. 결과 화면 실패 카드에 "다시 시도 · 추가 결제·차감 없음"·"다시 시도 대신 환불 요청"(웹 전용), 그동안 '작전 다시 짜기' 버튼 숨김. 두 버튼은 sessionId 만 보내고 결제·충전으로 가지 않는다. 문구 7키 × 5로케일(`result-copy.ts`), 일수 약속 없음. 기한 경과·환불 시작 응답이면 기존 자동 환불 안내로 닫는다.
- 보안 버킷: `/retry`·`/refund-request` 는 R4 의 접미 정규식(`7ed35229a`)이 이미 덮는다 — 변경 없음, `verify-worker-security-guards` 통과.
- Toss 하네스: `apps/toss/test/neo-result-permissions.test.mjs` vm 컨텍스트에 `setRetryOffer` 스텁. 웹 UI `neo-wake-recovery` 도 같은 스텁.
- 대상 실행: 네오·가드 jest 129/129(teardown 포함), contract·recovery-task·stuck·guard·neo 198/198, UI collector node 52/52, 네오 UI node 42/42. verify paid-llm-delivery·payment-legal-copy·no-nested-retry·llm-generation-resilience·payment-service-boundary·worker-security-guards·payment-freeze(--update 없이) 통과, build:worker + worker-size OK(6.18 MiB gzip).
- 체인(베이스 `bcce826eb`, HEAD `d7be2c558`, 2026-11-20 실측, 전부 exit 0): ① check:fast — critical, jest 483 스위트 8280 통과(1 skip), 내부 paid-gate 78/78 ② `run-paid-gate-suite` 단독 91/91(749s) ③ `npm test --prefix apps/toss`(정션) 1765/1765 ④ verify-myeongri-tables OK(29건·잔차 0). 첫 check:fast 는 sitemap 드리프트, 두 번째는 위 teardown 2건으로 막혔다가 고친 뒤 통과.
- sitemap: 원장 재생성(`4e5eae70d`) — 실제 변경은 네오 결과 화면 서명 1건, 나머지 376줄은 KST 자정 lastmod 롤링(11-19→11-20). R9 머지 때 main 원장과 다시 맞춘다.
- 위험·가정(최종 보고): 창 안 이용권 만료 시 다시 시도가 402 가 될 수 있음(미검증) · 일반 실패에 붙는 관리자 검토 표지는 아직 읽는 곳 없음 · 스위퍼 일일 30건 한도에서 다른 건 지연 가능성 · 환불 요청과 크론 동시 실행은 단계별 멱등에 기댄다 · Paid Flow Gates CI 는 이 파일들로 트리거되지 않을 수 있음.

### R6 흑월 (2026-11-20, 워크트리 커밋 `4d13f4692`·`35caa1280`·`8e0f4eb51`)
- 사전 감사: paid-gate-auditor · regression-scout(공용 환불 크론·가드·복구 레지스트리) 실행 뒤 착수.
- 보류 방식: 흑월은 `ServiceExecutionTransaction`(status pending) 위에서 돈다. 종결 실패(v1 3웨이브 실패·v2 장 라운드 상한·정체)는 실패로 닫지 않고 pending 그대로 `metadata.retryable={since, refundAt(생성+7일, retryRefundAt), code}` + attempts=MAX(3, 생성 금지) + 락 해제 + `timeoutAt`·`nextRetryAt`=refundAt + reasonCode `HEUKWOL_RETRY_AVAILABLE`(`holdHeukwolForRetry`, CAS). CAS 실패·창 밖이면 기존 실패·환불 경로(fail-closed). 응답 503 `HEUKWOL_DELIVERY_FAILED` + `retry:{available, refundAt, sessionId}`(그동안 refundStatus 없음, 본문 비노출).
- 즉시 환불 유지(가정): v1 결정적 실패 `HEUKWOL_REPORT_(TOO_SHORT|INCOMPLETE)`(다시 써도 같은 결과)·정체 시 v1 장 키가 모두 있는 문서·창 만료·Toss 네이티브.
- 가드(`checkpoint-refund-guard.js`): `includeResumable`(시간 초과 스위퍼) + featureKey 흑월 + 창 안 보류 → "recoverable"(환불 안 함). 명시적 닫기(includeResumable=false)는 그대로 환불. 창이 지나면 스위퍼의 settleExecutionById 가 기존 환불로 닫는다.
- 복구 레지스트리: 흑월 필터에 `'metadata.retryable': null` — 보류 건을 자동 재개하지 않는다.
- POST `/api/heukwol/retry`: 소유자(readOwned) → 보류 없음 409 `RETRY_NOT_AVAILABLE`, 창 만료면 환불 정산 후 409 `RETRY_WINDOW_EXPIRED`, 아니면 CAS(`refundAt>now`·락 비어 있음)로 attempts=0·retryable=null·retryReopens+1(v2 는 chapterRounds·lastIssue 초기화)·timeoutAt now+1h → 202 visible. 결제 확인·차감 없음, 완성 장 보존, 같은 이어쓰기 루프.
- POST `/api/heukwol/refund-request`: 생성 중이면 409 `REFUND_NOT_AVAILABLE`, 이미 닫힌 건은 visible, 아니면 refundAt=now·refundRequestedAt CAS → `settleHeukwolRetryRefund`(`failServiceExecution` forceRefundOnClose).
- 환불 크론: `consultation-delivery-refund.js` 연애 비책 블록 뒤 `options.heukwolRetryRefunds` 주입 + try/catch → `settleDueHeukwolRetryRefunds`(refundAt≤now·환불 미시작·살아 있는 락 제외, 건별 1회). 보안 버킷은 `7ed35229a` 접미 정규식이 덮음(security.ai-route-buckets 통과).
- 클라이언트(`app/heukwol/HeukwolClient.tsx`·`types.ts`): retry.available 이면 "상담서 작성이 잠시 멈췄어요" + 안내(일수·날짜 약속 없음) + "N / 27장 보관" + "다시 시도 · 추가 결제·차감 없음" · "다시 시도 대신 환불 요청". 두 버튼은 상담 id 만 보낸다. Toss(`apps/toss/service/TossHeukwol.tsx`)는 타입만 공유(선택 필드) — 하네스 스텁 불필요(Toss 테스트 통과).
- Toss 네이티브(`worker/toss/native-heukwol.js`, TossNativeConsultation): 변경 없음 — 앞 서비스들과 같이 즉시 처리 유지. 단 이 경로는 원래 `savedResult.failed` 만 남기고 환불 호출·Toss 크론이 없다(기존 결함, 보고만).
- 대상 실행: jest 8 스위트 243/243(checkpoint-timeout-refund 46 · heukwol 27 · paid-llm-delivery-contract · consultation-recovery-task · paid-delivery-stuck · security.ai-route-buckets · record-library · cron-shared-connection-teardown), node --test consultation-delivery-refund 54/54 · heukwol-paid-resume 13/13. 변이: DETERMINISTIC 정규식을 바꾸면 2건 실패(무는 가드). verify paid-llm-delivery-contract(36 계약·변이 36/36)·worker-security-guards·no-nested-retry·payment-freeze 통과.
- 체인(베이스 `bcce826eb`, HEAD `8e0f4eb51`, 2026-11-20 실측, 전부 exit 0): ① `check:fast -- --base=bcce826eb` — critical, jest 483 스위트 8294 통과(1 skip). 첫 회는 sitemap 원장 드리프트로 막힘 → `8e0f4eb51` ② `run-paid-gate-suite --base=bcce826eb` 91/91(1453s). 첫 회 exit 1: `npm test` 안 yeongnyangi-reading-v7-golden·yeongnyangi-v7-checkpoint-import 2건이 자식 프로세스 시간 초과(status null, 60s·258s). 이 브랜치는 영냥이 파일 변경 0, 단독 재실행 3/3(174s) → 부하 플레이크, 재실행 통과 ③ `npm test --prefix apps/toss`(정션) 1765/1765(109s), 정션 제거 확인 ④ verify-myeongri-tables OK(29건·잔차 0).
- 위험·가정(최종 보고): 흑월 카드 환불에 paymentRef 가 없어 refund_failed/manual_review 로 끝날 수 있음(범위 밖, 기존) · 창 만료 환불 경로가 스위퍼·settleDue 둘 — settleExecutionById 멱등에 기댐 · 월정석 환불 경로 미실측 · 보관함(/records)은 보류 건을 "생성 중"으로 표시(record-library.js:35,49) · `scripts/fixtures/mock-heukwol.mjs` 에 retry·refund-request 없음(낮음).

### R7 찻집 (2026-11-20, 워크트리 커밋 `1cec195b8`·`dd51e5355`·`6759ad789`)
- 사전 감사: paid-gate-auditor 실행 뒤 착수, 구현 뒤 재감사. 위반 1(보류 건 재제출 시 결제 증빙 해제)·경미 2건(환불 실패를 정산 완료로 표시, 고객 환불 요청 뒤 문구) 수정. 경미 3(재개방 횟수 상한 없음)은 승인 범위 밖이라 보고만. payment-freeze 통과(--update 불필요), 본문 노출 없음, `/retry` CAS 건전, 이중 환불은 `refundPassCoverage` refundId(=resultId) 멱등에 기댐(코드 미검증).
- 저장소: 찻집은 원시 컬렉션 `honeyCollections().results`(`_id` `fortune-tea-house-result:…`, scope `FORTUNE_TEA_HOUSE`).
- 보류 방식(`markFortuneTeaHouseGenerationFailed`): 종결 실패(라운드 상한 등)·정체를 `generation_failed` + `llmMeta.retryable={since, refundAt(생성+7일, retryRefundAt, 연장 없음), code, evidenceIds, reopens}` + `deliveryWatch:null` 로 저장하고 409 `RETRY_AVAILABLE`(`refunded:false`, `retry:{available, refundAt, resultId}`, 본문 없음)을 돌려준다. 환불·증빙 해제·지연 취소를 하지 않는다.
- 즉시 환불 유지(가정): 결정적 실패 `/BASIS_MISSING|INVALID_INPUT/` · checkpoint 없는 옛 문서(`generationCheckpoint.requestBody` 없음) · Toss 네이티브(`auth.tossNative` 또는 `doc.tossNative`) · 창 밖 실패.
- 재제출(`/consult` 같은 resultId): 보류 중이면 증빙을 해제하지 않고 409 보류 본문(표지의 evidenceIds 가 비었으면 현재 증빙을 기록). 이미 닫힌 보류(환불 요청·만료)면 정산 후 409 `GENERATION_FAILED`(환불 요청 건은 "환불을 요청하신 상담이에요…").
- POST `/api/fortune-tea-house/retry`: 소유자 → 보류 없음 409, 창 만료면 정산 후 409, 아니면 CAS 로 generating 재개 + round=1 · 열린 그룹(`teaGroupNeedsWork`) attempts=0 · reopens+1. 결제 확인·차감 없음, 클라이언트가 같은 질문으로 `/consult` 재제출(같은 checkpoint 이어 쓰기).
- POST `/api/fortune-tea-house/refund-request`: refundAt=now·refundRequestedAt CAS → `settleTeaRetryRefund`.
- `settleTeaRetryRefund` 순서: 이용권 환불(`refundFortuneTeaHousePassSettlement`, refundId=resultId) → 실패하면 문서를 다시 읽어 `passRefund.pendingAt`·`refundedAt` 둘 다 없으면 'pending' 으로 두고 정산 표시 안 함(fail-closed, 크론이 재시도) → 표지 evidenceIds 해제 → 내부 Request 로 지연 취소 → `llmMeta.retryable.settledAt`·`refundReason`.
- 정체(`settleStuckDelivery`): delivery_pending 이 아니고 창 안이면 retryable 보류(`outcome:'retryable'`). 아니면 기존 실패·환불, 표지가 있으면 `settledAt`·`RETRY_WINDOW_EXPIRED` 를 함께 쓰고 표지 증빙 해제.
- `/pending`: 보류 건은 202 + 진행 + 보류 본문 + requestPayload, 닫힌 generation_failed 는 404.
- 환불 크론: `consultation-delivery-refund.js` 흑월 블록 뒤 `options.teaHouseRetryRefunds || settleDueTeaHouseRetryRefunds`(limit 5) + try/catch(`{service:'fortune-tea-house', refundStatus:'pending'}`).
- 복구 레지스트리: 변경 없음 — `consultationRecoveryFilter` 상태 목록(generating·partial·delivery_pending)에 generation_failed 가 없어 보류 건을 자동 재개하지 않는다.
- 클라이언트(`src/features/fortune-tea-house/FortuneTeaHousePage.tsx`): `/pending` 탐침·제출 실패의 `RETRY_AVAILABLE` 이면 "상담문 작성이 잠시 멈췄어요" 카드 + "다시 시도 · 추가 결제·차감 없음" · "다시 시도 대신 환불 요청" · 내 상담함 링크(일수·날짜 약속 없음). 환불 요청 성공 시 복구 상태·attemptId 초기화 + 안내. 새 import 없음 → Toss 하네스 스텁 불필요. 🔴 app/** 를 안 고쳐도 원장 서명은 `src/features/**` 를 따라 바뀐다 → 체인 첫 회가 sitemap 드리프트로 막혀 `6759ad789` 로 재생성(/fortune-tea-house/ 서명 1건).
- 테스트: 새 `__tests__/worker/fortune-tea-house-retry-hold.test.js`(정체 보류·/retry·/refund-request·settleDue), `fortune-tea-checkpoint-failure`(보류 재제출이 증빙을 해제하지 않음), `fortune-tea-house-tarot-cardwise`(라운드 상한 → RETRY_AVAILABLE·refunded:false 로 기대 변경), UI `fortune-tea-house-recovery.behavior`(다시 시도·환불 요청 2건), `consultation-delivery-refund`(크론 1건), 픽스처 `fortune-tea-result-store.cjs`(비교 연산자·$or·project).
- 대상 실행: jest 찻집 관련 21 스위트 406 통과 · node --test 찻집 UI 41/41 · consultation-delivery-refund 55/55 · tsc 0 · verify paid-llm-delivery(36 계약·변이 36/36)·tea perf budget·paid-gate-ui-regression 통과.
- 체인(베이스 `bcce826eb`, HEAD `6759ad789`, 2026-11-20 실측, 전부 exit 0): ① `check:fast -- --base=bcce826eb` — critical(typecheck 포함), jest 484 스위트 8308 통과(1 skip). 첫 회는 sitemap 원장 드리프트로 막힘 → `6759ad789` ② `run-paid-gate-suite --base=bcce826eb` 91/91(764.8s, 플레이크 없음. `dd51e5355` 기준 앞 회차도 91/91·1562s) ③ `npm test --prefix apps/toss`(정션) 1765/1765(58s), 정션 제거·원본 node_modules 무사 확인 ④ verify-myeongri-tables OK(29건·잔차 0).
- 위험·가정(최종 보고): 이용권 구매의 `deliveryAccessKey` 가 재개 때 바뀔 수 있음 · 증빙 재청구 멱등(replayed) 가정 · 지연 사용(deferred usage) TTL 없음 가정 · 보류 건은 일반 환불을 막으므로 환불은 `/refund-request`·크론으로만 · 보류 건 `/pending` 접근 확인 유지 · 감사 미검증: 해제된 증빙이 다른 resultId 에 재사용될 수 있는지, 이용권 만료 뒤 재제출이 정산 재생인지 402 인지, `refundPassCoverage` 동시 호출 멱등 · `consultation-delivery-refund.js` 가 paid-flow-gates·deep tier 에 없음(기존, 보고만) · 보관함(/records) 표시는 R7b.

### R7 마스터 인연의 서 (2026-11-20, 워크트리 커밋 `d16920bf3`·`5ed4f9258`)
- 사전 감사: paid-gate-auditor·regression-scout 실행 뒤 착수.
- 운영 스크립트 충돌 확인 결과: `reviewRequired:true` 는 이미 `acquireBatchLock`·`buildAbandonedFilter`·`reopenClosedSessions`(GENERATION_BUDGET_EXCEEDED 만)에서 빠진다. 그래도 `planCodexReopen` 은 `reviewReason === 'RETRY_AVAILABLE'` 또는 `deliveryMeta.retryable` 이 있으면 null 을 돌려주게 막았다(보류·그 뒤 닫힌 세션을 크론이 다시 열지 않음).
- 보류 방식(`settleCodexFinalFailure`): 웹 종결 실패(장당 시도 소진)를 `generation_failed` + `deliveryMeta.reviewRequired:true` + `reviewReason:'RETRY_AVAILABLE'` + `deliveryMeta.retryable={since, refundAt(retryRefundAt = 생성+7일, 연장 없음), code, exhaustedChapterIds, reopens}` 로 저장하고 환불하지 않는다. `/generate` 는 503 + `retry:{available, refundAt, sessionId}`(본문 없음).
- 즉시 처리 유지(가정): Toss 네이티브(`deliveryMeta.tossIntentId`, 관리자 검토) · 환불 마커가 이미 있는 세션 · 창 경과.
- POST `/api/master-love-codex/retry`: 소유자 확인 → 창 만료면 `closeCodexRetryHold`(RETRY_WINDOW_EXPIRED) + 환불 1회 + 409 `RETRY_WINDOW_EXPIRED` · 보류 아님 409 `RETRY_NOT_AVAILABLE` · 아니면 CAS 로 generating 재개(`retryable.reopenedAt`·`reopens+1`, 소진 장 시도 수 초기화) → 202 + 접근 토큰. 결제 확인·차감 없음.
- POST `/api/master-love-codex/refund-request`: `closeCodexRetryHold`(CUSTOMER_REQUEST, refundRequestedAt) → `retryCodexFinalRefund` 1회. 반복 요청은 환불을 다시 돌리지 않고 상태(settled/admin_review/pending)만 200 — 덜 끝난 환불은 기존 `retryUnsettledRefunds` 크론이 잇는다. 보류 아님·Toss 는 409 `REFUND_NOT_AVAILABLE`.
- 복구 크론(`master-love-codex-recovery-task.js`): `expireCodexRetryHolds`(`buildCodexRetryExpiryFilter`: RETRY_AVAILABLE + refundAt≤now, JS 재판정 `codexRetryDue`) → DELIVERY_FAILED 로 닫고 환불 1회, 결과 `retryExpired`. 정체 나이는 `retryable.reopenedAt || codexReopenedAt || createdAt` 부터 잰다. 정체 결과에 `held` 필드.
- 클라이언트: `MasterLoveCodexResultClient.tsx` — `reason === 'RETRY_AVAILABLE'` + `retry.available` 이면 `CodexGenerating` 에 "다시 시도 · 추가 결제·차감 없음"·"다시 시도 대신 환불 요청"(sessionId 만 POST, 결제창 없음), 실패 안내는 `copy.errorText.RETRY_AVAILABLE`(5로케일, 일수 약속 없음). 응답 뒤 세션을 다시 읽어 서버 상태를 그대로 보인다.
- 테스트: `master-love-codex-paid-delivery.test.js` R7 6건(67 통과), `master-love-codex-recovery-task.test.js` R7 3건, UI `master-love-codex-resume-on-result.behavior` 62/62.
- sitemap: `/master-love-codex/` 서명 1건(lastmod 그대로).
- 위험·가정(최종 보고): 웹 종결 실패는 결정적 오류 구분 없이 모두 보류(compat 의 LLM_PARTNER_EVIDENCE_MISSING 은 다시 시도해도 다시 실패할 수 있음 → 결국 7일 뒤 또는 고객 요청으로 환불) · 관리자 접근 세션도 보류 · reviewNeeded/stalled 지표에 보류 건 포함 · 서버 한국어 메시지는 미현지화(클라이언트는 copy 사용) · 보류 세션도 /session 으로 접근 토큰이 나오지만 /generate 는 503 · 감사 미검증: pass 증빙 환불 마커를 session-access 가 읽는지, 코덱스 구매에 ServiceExecutionTransaction 행이 있는지 · `verify-master-love-codex-sharing` 은 로컬 프리뷰 서버가 없어 ERR_CONNECTION_REFUSED(환경, 미검증) · 범위 밖(보고만): `/records/view` 가 generation_failed·generating 코덱스의 부분 본문을 보일 수 있음(record-library.js 상세, StoredReading.tsx:63).

### R7b 보관함 "다시 시도 가능" (2026-11-20, 워크트리 커밋 `384d3b8f6`)
- `worker/lib/record-library.js` `recordStatus(doc, source, now)`: 환불 상태(revoked·refund_pending)가 먼저, 그다음 `retryHeld` 가 참이면 `retry_available`. 판정은 각 라우트와 같다 — 연애 비책·인생의 책·신년·네오·찻집 `generation_failed` + `llmMeta.retryable`(deliveryRefund·refundEligibleAt·billingCleanupPending·settledAt·refundRequestedAt 없음, refundAt>now) · 흑월 `pending` + `metadata.retryable`(refundStatus none, refundRequestedAt 없음, refundAt>now) · 코덱스 `generation_failed` + `deliveryMeta.reviewReason RETRY_AVAILABLE` + `deliveryMeta.retryable`(closedAt·refundRequestedAt 없음, refundAt>now). 그 밖은 기존 상태(fail-closed).
- 목록 projection 에 `llmMeta.retryable`·`llmMeta.refundEligibleAt`·`llmMeta.billingCleanupPending`·`metadata.retryable`·`deliveryMeta.retryable`·`deliveryMeta.reviewReason` 추가(작은 표지만, 본문 없음).
- 다시 시도 진입 = 기존 `recoveryHref`(흑월 `/heukwol/?result=`, 찻집 `/fortune-tea-house/?recoverResultId=`, 나머지 각 결과 화면 `resultPath+id`). 각 화면의 다시 시도·환불 요청 버튼(R2b~R7)이 실제 행동을 맡는다. 보관함은 결제·생성을 시작하지 않는다.
- UI: `lib/records/copy.ts` `retry_available`·`retryLead`·`retryAction` 5로케일(ko "다시 시도 가능"/"다시 시도하러 가기"), `RecordsClient.tsx` 카드에 "다시 시도하러 가기" 링크 추가(기존 결과 보기 링크 유지), `SavedRecordClient.tsx` 상태 안내 문구·링크 분기. 완료 판정 allowlist(recommendations·saved-record-next)는 그대로라 무료 다음 단계·완료 조회 이벤트가 붙지 않는다.
- 영냥이 분리: `/yeongnyangi/library/` 와 `chat-consultation` 소스 판정은 변경 없음. 완성 결과는 숨기거나 지우지 않는다.
- SEO: `/records`·`/records/view` 는 noindex·sitemap 밖 — 영향 없음. 원장은 `/fortune-tea-house/` 서명 1건만 바뀜(lastmod 그대로).
- 테스트: `record-library.test.js` R7b 1건(32/32), `records-view-next` + `recommendations-context` node --test 21/21.
- 가정(최종 보고): 신년 `?sid=`·인생의 책·연애 비책·네오 결과 화면이 로드 시 보류 표지를 받아 다시 시도 버튼을 보인다(R3~R2b 에서 구현, 이번에 화면 실측은 안 함) · 흑월 보류 건 목록 판정은 refundStatus 를 projection 하지 않아 refundAt 창으로만 가른다(환불 요청·만료 경로가 모두 refundAt≤now 로 만들므로 같은 결과).
- 체인(2026-11-20, base `bcce826eb`, 커밋 `384d3b8f6` + 이 문서 수정 트리): ① `check:fast --base=bcce826eb` exit 0 — critical, jest 484 스위트 8318 통과·1 skip(첫 실행은 기계 절전으로 느려져 무관한 `auth.apple-signin`·`destiny-compass-free-narration` 2 스위트가 5s 타임아웃 → 단독 재실행 20/20 통과 → 재실행 exit 0) ② `run-paid-gate-suite --base=bcce826eb` exit 0, 통과 91 / 실패 0 ③ `npm test --prefix apps/toss` (임시 정션, 실행 뒤 정션만 제거) exit 0, 1765/1765 ④ `verify-myeongri-tables` OK 29건·216키 잔차 0.

### R5 연애 비책 (2026-11-20, 워크트리 커밋 `4c81511e5`·`3926da828`·`1968b0488`)
- 사전 감사: paid-gate-auditor · regression-scout 실행 뒤 착수(앞 세션).
- 라우트(`worker/routes/love-secret-ai.js`): runGeneration catch → `loveSecretRetryMeta`(웹·계산 오류 아님) 이면 CAS(status generating + lease)로 `generation_failed` + `llmMeta.retryable`(생성+7일) 저장, 503 `{reason:'LLM_ERROR', refunded:false, retry:{available, refundAt, sessionId}}`. CAS 실패면 기존 즉시 복원·표시(fail-closed). 시작 재요청(같은 inputHash)·GET /result 에도 같은 retry 표지. 완료 llmMeta 는 seed 의 retryable 을 보존.
  - POST `/retry`: Toss 409 `RETRY_NOT_AVAILABLE`, toss 문서 404, 소유자 CAS reopen + `loveSecretRetryReset`(그룹 하드 한도에 닿은 시도 키만 0, `length:*` 보존) → `handleStart({resumeSessionId})`.
  - POST `/refund-request`: Toss 409, `markRetryableRefundDue(CUSTOMER_REQUEST)` → `settleLoveSecretRetryRefund`(`restoreBillingGateAccessOnFailure`, 'failed' 면 표지를 남겨 크론이 재시도).
  - `settleDueLoveSecretRetryRefunds`: `expireRetryableConsultations(isLive)`(lease·updatedAt 으로 살아 있는 생성 제외 — 공용 헬퍼에 `isLive` 옵션 추가) → 예약 건 정산, `accessSource:{$ne:'toss'}`.
  - 정체(`settleStuckDelivery`): `storedLoveSecretRefundAccess` 로 접근을 다시 확인해 창 안·웹·확인됨이면 retryable, 아니면 retry 표지를 닫고 기존 환불. (열린 후속 "정체 환불 재시도가 refundEligibleAt 미사용": 창 안 정체는 이제 retryable → refundEligibleAt 경로, 창 밖(생성 7일 경과) 정체는 기존 즉시 환불 경로 그대로 — 일부만 해소.)
- 환불 크론: `consultation-delivery-refund.js` 네오 블록 뒤에 `options.loveSecretRetryRefunds` 주입 + try/catch(실패는 `{service:'love-secret-ai', refundStatus:'pending'}`).
- 가드·보안 버킷: 가드 변경 없음(연애 비책은 checkpoint 스위퍼 대상 아님). `/retry`·`/refund-request` 는 `7ed35229a` 접미 정규식이 덮는다.
- 클라이언트: 새 모듈 `app/love-secret-ai/love-secret-retry.ts`(문구 9키 × 12로케일, 일수·날짜 약속 없음 · `loveSecretRetryOffer` · `loveSecretRetryClosed`). 결과 화면(`LoveSecretAiResultClient.tsx`): 실패 카드에 "다시 시도 · 추가 결제·차감 없음"·"다시 시도 대신 환불 요청"(웹 전용), 그동안 머리 "다시 상담하기" 링크 숨김, 다시 시도 성공 시 폴링 재개(reloadEpoch). 두 버튼은 sessionId 만 보내고 결제·코인·/points 로 가지 않는다. 기한 경과·환불 시작 응답이면 환불 안내로 닫는다. 입력 화면(`LoveSecretAiClient.tsx`): retry 표지가 있는 LLM_ERROR 는 결과 화면 링크(`moveResultWindow`)와 다시 시도 안내로 끝낸다(새 결제 없음, pendingGenerationRef 유지 → 다시 제출해도 서버가 409 + retry 표지).
- Toss: 클라이언트 Toss 경로는 새 식별자를 평가하지 않는다(`paymentSurface === "toss"` 단락) → Toss 하네스 스텁 추가 없이 통과. 웹 하네스(`love-secret-ai-wake-recovery`·`love-secret-paid-delivery`)에는 스텁 추가.
- 즉시 환불 유지(가정): Toss 네이티브(요청·저장 문서), 계산 오류, retryable 저장 CAS 실패, 정체 시 접근 재확인 실패.
- 대상 실행: love-secret UI node --test 72/72(paid-delivery + wake-recovery), 워커 쪽(앞 세션) behavior 63/63 · consultation-delivery-refund 등 58 · jest 11 스위트 214. verify love-secret-ai-flow·paid-gate-ui-regression·paid-llm-delivery-contract·payment-freeze·payment-legal-copy 통과. 작업 트리 check:fast critical exit 0(jest 483 스위트 8280 통과 / 1 skip, typecheck 포함).
- 체인(베이스 `bcce826eb`, HEAD `1968b0488`, 2026-11-20 실측, 전부 exit 0): ① `check:fast -- --base=bcce826eb` — critical, 1911s, jest 483 스위트 8280 통과(1 skip) ② `run-paid-gate-suite --base=bcce826eb` 91/91(898s) ③ `npm test --prefix apps/toss`(정션, 커밋 직전 같은 소스 트리) 1765/1765 ④ verify-myeongri-tables OK(29건·잔차 0).
- sitemap: 원장 재생성(`1968b0488`) — 연애 비책 결과 화면 서명 1건만 바뀜. R9 머지 때 main 원장과 다시 맞춘다.
- 위험·가정(최종 보고): `claimRequestBillingEvidence` 를 다시 시도에서 같은 requestId 로 다시 부르며 멱등이라고 가정(미검증) · 창 안 이용권 만료 시 다시 시도 402 가능성(저장 접근으로 대체) · 카드 refund_failed 건 다시 시도 시 유효 결제 없음 가능성 · 보관함(/records)은 여전히 '실패'로 표시 · `docs/context/ai-and-db.md:166,174,184,208` 은 아직 즉시 환불 서술(R8).

### R3·R4 최종 검사 (워크트리 HEAD `7ed35229a` + `0a3f1942d`, --base=`bcce826eb`)
- 대상 실행: 신년 UI·관련 node --test 150/150, 신년 워커 jest 34/34, paid-delivery-stuck·consultation-recovery-task jest 32/32, 보안 jest 79/79, tsc --noEmit 0. verify new-year-ai-flow·llm-generation-resilience·paid-gate-ui-regression·payment-freeze·payment-legal-copy·no-nested-retry·paid-gate-no-dead-end·static-paid-gate-failsafe·report-paid-delivery-inventory 통과.
- `npm run check:fast -- --base=bcce826eb` (HEAD `7ed35229a`) → exit 0 (1504s, jest 483 스위트 · 8266 통과 / 1 skip). 첫 회는 `security.ai-route-buckets` 실패 — `/api/{new-year,life-book}-ai/{retry,refund-request}` 미분류(R3 도 놓쳤음) → `7ed35229a`.
- `node scripts/run-paid-gate-suite.mjs --base=bcce826eb` → exit 0 (1108s, 91 통과 / 0 실패).
- `node scripts/verify-myeongri-tables.mjs` → exit 0 (검사 29건, 잔차 0).
- `npm test --prefix apps/toss` → 첫 회 exit 1: 인생의 책 하네스 2건(`native-delivery-messages`·`native-result-permission` 의 vm 컨텍스트에 R3 의 `readLifeBookRetryOffer`·`FAILURE_COPY` 가 없어 ReferenceError). Toss 응답엔 retry 표지가 없으므로 실제 함수와 같은 판정의 스텁을 넣음(`0a3f1942d`). 둘째 회 `psychotest-shell` 1건 실패 — 이 브랜치는 apps/toss 소스 변경 0, 단독 3회 20/20 → 부하 플레이크. 셋째 회 exit 0 (1765/1765). 하네스 수정분 `npm run check:fast`(작업 트리) → exit 0 (jest 483 스위트 · 8266 통과 / 1 skip).
- 🔴 함정: R5~R7 에서 클라이언트에 새 import 를 쓰면 `apps/toss/test/*` vm 하네스 컨텍스트에도 스텁을 넣어야 한다(R9 전에 Toss 테스트를 꼭 돌린다).
- 보안 버킷(`/retry`=start, `/refund-request`=ensure)은 버튼 1회 1호출 기준으로 정했다. 운영 실측 아님.

### R3 설계 (인생의 책, paid-gate-auditor 확인 반영)
- 공용 헬퍼(`paid-delivery-stuck.js`): `retryableFailureMeta(doc, now, code)` — 창 안이고 환불 미시작이면 retryable 표지를 돌려주고, 아니면 null(호출부는 예전 즉시 환불로). `publicRetryState(doc, now)` — 응답용 `{retryable:true, refundAt}`. `reopenRetryableConsultation(..., {reset})` — 같은 CAS 로 추가 `$set`(실패 장의 attempts 0·failure null, waveCount 0).
- 라우트: 요청 중 종결 실패(웨이브 catch, 바깥 catch, `finishLifeBookDelivery` 미완성)는 `retryableFailureMeta` 가 있으면 `refundEligibleAt`·환불·증빙 해제 없이 표지만 쓰고 503 `{reason:'LLM_ERROR', retryable:true, retry:{refundAt}}`. Toss(`accessSource==='toss'`/tossNative)는 다시 시도 UI 가 없어 기존 즉시 처리 유지(후속 보고).
- `POST /api/life-book-ai/retry {sessionId}`: 소유자 확인 → reopen(reset) → 기존 재개(`handleStart` + `resumeSessionId`) 한 웨이브. 새 차감 없음(차감은 전달 시 `applyUsageOnce` 1회, 같은 멱등 키).
- `POST /api/life-book-ai/refund-request {sessionId}`: `markRetryableRefundDue` → 즉시 `settleLifeBookFailureRefund`(크론은 예비).
- 금지(감사): 새 `resolveBillingGateAccess`·`applyUsageOnce`·`claim*BillingEvidence` 호출 금지, 클라이언트 다시 시도가 결제창·/points 로 가지 않음, 환불 문구에 'N일 이내 환불 가능' 약속 금지, `restoreAccessBeforeGenerationFailure`·`cancelDeferredBillingUsage`·`settleFailedConsultationRefund` 참조 유지(검증기). worker 와 클라이언트를 한 커밋에(Paid Flow Gates 트리거).
- (e) `expireRetryableConsultations` 는 공용 설정자(new-year-ai·life-book-ai)에만 걸려 있다. 전용 `settleStuckDelivery` 를 쓰는 5종(흑월·네오·찻집·코덱스·연애 비책)은 아직 즉시 환불이다(R5~R7 대상). → 네오는 R2b 에서 전용 `settleStuckDelivery` 안에 retryable 분기 + `settleDueNeoRetryRefunds` 크론으로 처리했다. R5~R7 도 같은 모양(서비스 라우트에 settleDue…, `consultation-delivery-refund.js` 에 주입 가능한 옵션 + try/catch, 가드는 서비스 featureKey 로 좁혀 인라인)을 참고한다.

### R0~R2 최종 검사 (워크트리 HEAD `89c05a3bc`, --base=`bcce826eb`)
- `npm run check:fast -- --base=bcce826eb` → exit 0 (critical 자동 승격, typecheck·lint·sitemap-drift·verify 다수 통과, jest 483 스위트 · 8261 통과 / 1 skip).
- `node scripts/run-paid-gate-suite.mjs --base=bcce826eb` → exit 0 (91개 통과 / 실패 0, 벽시계 1135s).
- `npm test --prefix apps/toss` → exit 0 (1765/1765). 첫 실행은 exit 1(3건 `Could not resolve "@apps-in-toss/web-framework"`). 원인은 워크트리에 `apps/toss/node_modules` 가 없던 것이다(코드 문제 아님). 메인 체크아웃 `apps/toss/node_modules` 로 임시 정션을 걸어 다시 돌렸고, 끝난 뒤 `rmdir` 로 정션만 해제했다(메인 모듈 보존 확인).
- 🔴 함정: `create-safe-worktree.ps1` 은 루트 node_modules 만 정션한다. Toss 테스트 전에 `apps/toss/node_modules` 임시 정션이 필요하고, 워크트리 배수 전에 반드시 해제해야 한다(폴더 삭제가 정션 너머 원본을 지우지 않게).
- `node scripts/verify-myeongri-tables.mjs` → exit 0 (검사 29건, LunarUtil 대조 216키 잔차 0).
- 첫 회 check:fast 는 `verify:sitemap-drift` 에서 막혔다. 원인은 네오 결과 화면 편집으로 `/neo-operation-room/` 서명이 바뀐 것(lastmod 는 같은 날 2026-11-19). `npm run sitemap:generate` 로 고쳐 `89c05a3bc` 에 담았다. SEO 영향: 공개 URL 의 title·H1·canonical·robots 는 변경 없음. 결과 화면 안의 안내 블록만 추가됐다.
