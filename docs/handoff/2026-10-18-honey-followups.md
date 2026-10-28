---
status: active
updated: 2026-10-18
next: "honey-followups-20261018-153856 워크트리에서 「재개 순서」대로 P1-A(프롬프트 꿀방울 1개 복원) → P1-B(연이 상담 1건 조회 perUseSource 노출) 진행. P2는 그 뒤 개별 확인."
---

# 꿀방울 후속 작업 인수인계 (2026-10-18)

연이 상담 꿀방울 30개·영냥이 배너 복원·네오 가격 v3 작업(main `96d5372bd`, 커밋 `e46e33467`·`1e0dbd3b4`·`7e94e07b5`)을 마친 뒤 남은 문제다.
**P1 두 건은 사용자가 "반드시 수정"으로 지정했다.** P2는 확인 후 처리한다.

- 작업 경로(이 작업 전용으로 만들어 둔 워크트리, 바로 사용): `D:\Development\codedestiny-worktrees\honey-followups-20261018-153856`
- 문서 절대 경로: `D:\Development\codedestiny-worktrees\honey-followups-20261018-153856\docs\handoff\2026-10-18-honey-followups.md`
- 브랜치: `wt/honey-followups-20261018-153856` (`origin/main` 추적)
- 기준 원격 SHA: `c1160ec0e` (워크트리 생성 시점 origin/main). 이 문서를 갱신한 커밋은 `git log -1 --format=%h -- docs/handoff/2026-10-18-honey-followups.md`로 확인한다.
- 마지막 코드 커밋(앞 작업): `e46e33467` (연이 상담 히어로 높이 수정). 이 문서 범위의 코드 변경은 아직 없다.
- push: 앞 작업 전부 main에 push 완료. P1-A·P1-B는 미착수.

## 재개 순서

1. 작업 경로로 이동해 최신화하고 깨끗한지 확인한다.
   ```powershell
   Set-Location -LiteralPath 'D:\Development\codedestiny-worktrees\honey-followups-20261018-153856'
   git status --short
   git pull --ff-only
   git log -1 --format='%h %s'
   ```
   워크트리가 사라졌으면 `D:\Development\code-destiny`에서 `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create-safe-worktree.ps1 -Slug 'honey-followups'`로 새로 만든다(공유 main 체크아웃에서 직접 편집하지 않는다).
2. P1-A부터 아래 「P1-A」 절의 수정·검증 순서대로 진행한다. 첫 행동: `git show 9336b44a0 --stat`으로 되돌릴 프롬프트 관련 범위를 확인하고 `worker/lib/honey-wallet.js` `spendPromptHubHoney`의 `HONEY_GGULGGUL_ONLY` 차단을 전용 허용 검사로 바꾼다.
3. P1-B를 「P1-B」 절대로 진행한다.
4. 둘 다 끝나면 최신 origin/main을 merge → `npm run check:pre-push` → `git push origin HEAD:main`.
5. P2는 항목별로 확인만 하고, 결정이 필요한 것(찻집 토큰)은 사용자에게 묻는다.
6. 끝나면 이 문서를 `status: done`으로 닫고 워크트리를 정리한다(「작업 규칙」의 정리 순서).

## 작업 규칙

- 공유 main 체크아웃(`D:\Development\code-destiny`)은 다른 세션의 미커밋 변경이 있다. 건드리지 말고 `scripts/create-safe-worktree.ps1 -Slug <이름>`으로 origin/main 기반 워크트리에서 작업한다.
- 전달: 워크트리 브랜치에 최신 origin/main을 merge → `npm run check:pre-push` → `git push origin HEAD:main`(PR 없음). 사이트맵 드리프트로 막히면 `npm run sitemap:generate` 결과를 같이 커밋한다.
- 정리: `node_modules` junction을 먼저 `(Get-Item -LiteralPath '<wt>\node_modules' -Force).Delete()`로 끊은 뒤 `git worktree remove --force`. dev 서버가 `.next`를 잡고 있으면 그 PID만 종료한다.
- 유료 LLM 실행·실결제·운영 DB 쓰기 금지. 검증은 mock으로 한다.

## P1-A. 운세 프롬프트 생성에 꿀방울 1개 사용 복원 (사용자 결정)

### 결정
- 2026-10-18 사용자 결정: 프롬프트 1회 생성 = **꿀방울 1개**(2026-10-12 원래 정책). 3,000원 단건 결제(`fortune-prompt-hub-generate`, cost 30)는 그대로 둔다.
- 이 결정은 같은 날 숙요 작업의 확정 정책 "종합 프롬프트 신규 꿀방울 사용 차단"(`docs/handoff/sukuyo-moonlight-honey-20261018.md` 「사용자 확정 정책」, 커밋 `9336b44a0`)을 **프롬프트에 한해** 뒤집는다. 꿀편지·타로 앨범·프로필 정령 차단은 유지한다.
- 출석 보상은 현재 하루 1개(`worker/lib/honey-wallet.js` `HONEY_ATTENDANCE_EVERY = 1`)라 매일 1회를 꿀방울로 만들 수 있다. 사용자가 이 조건으로 1개를 골랐다.

### 현재 막힌 곳
- 서버: `worker/lib/honey-wallet.js` `spendPromptHubHoney` 안의 `if (!isHoneySpendProduct('fortune-prompt-hub-generate')) throw ... HONEY_GGULGGUL_ONLY`(약 140행). `isHoneySpendProduct`는 `HONEY_UNLOCK_PRODUCTS`(`worker/lib/honey-unlock-catalog.js`)에 있는 키만 참이고, 프롬프트 키는 없다. 그래서 신규 생성은 잔액과 관계없이 항상 403이다. 같은 `requestId` 재사용(이미 차감된 영수증)은 그 앞에서 통과한다.
- 라우트 `worker/routes/prompt-hub.js` `settle()`: `paymentRequestId`가 없으면 `spendPromptHubHoney`를 부른다. 이 흐름은 그대로 두어도 된다.
- 클라이언트 `app/fortune/prompt-hub/PromptHubClient.tsx`: `9336b44a0`에서 로그인 사용자의 생성 버튼이 서버 호출 없이 곧바로 `setHoneyShortfall`(결제 안내)로 가도록 바뀌었다(약 2155–2165행). 403 `HONEY_GGULGGUL_ONLY`도 결제 안내로 처리한다(약 2108행). 문구 ko(약 1424–1456행)·en(약 924–956행)도 "꿀방울은 꿀꿀운세 지정 상품에서 사용해요"로 바뀌었다.
- 홈 위젯 `js/prompt-hub-honey.js`(+ `public/js/` 미러)도 같은 커밋에서 바뀌었다. 무엇이 바뀌었는지는 `git show 9336b44a0 -- js/prompt-hub-honey.js`로 확인한다.

### 고치는 방법
1. 서버 허용 판정: 프롬프트 키를 `HONEY_UNLOCK_PRODUCTS`에 **넣지 않는다**. 이 목록은 홈 "꿀방울 사용처" 24상품 UI의 정본이고 `__tests__/worker/honey-unlocks.test.js:43`, `honey-unlocks-route.test.js:18`, `content-unlock-roundtrip.test.js:160`이 개수를 고정한다. 대신 `honey-unlock-catalog.js`에 프롬프트 1회 사용만 허용하는 명시 판정(예: `isHoneyPromptHubSpend()` 또는 요청별 사용 키 집합)을 두고, `spendPromptHubHoney`의 검사를 그것으로 바꾼다. 범위 안내 문구 `HONEY_SCOPE_MESSAGE`와 홈 사용처 안내에 "운세 프롬프트 1회 1개"가 보이게 할지는 사용처 UI의 정본 개수와 함께 판단한다.
2. 클라이언트: 로그인 사용자는 다시 `runPromptGeneration(toolId, draft)`로 서버에 꿀방울 생성을 요청한다. 402 `INSUFFICIENT_HONEY_DROPS`일 때만 출석·3,000원 결제 안내를 띄운다. `9336b44a0` 이전 동작이 참고 기준이다(`git show 9336b44a0 -- app/fortune/prompt-hub/PromptHubClient.tsx`). 단 출석 규칙 문구는 "하루 한 번 출석하면 꿀방울 1개 · 프롬프트 1회에 1개"로 쓴다(3회마다 아님). 문구를 바꾸는 로케일을 모두 갱신한다.
3. 테스트 기대 수정: `__tests__/worker/prompt-hub-honey.test.js` 137행 "프롬프트 신규 꿀방울 사용은 잔액과 관계없이 거절한다"를 "잔액 1개 이상이면 1개 차감 / 0개면 402 / 같은 requestId 재시도는 무차감 / 다른 입력은 409"로 바꾼다. `__tests__/ui/honey-ui.test.mjs`의 프롬프트 관련 단언도 확인한다.
4. 문서: `PAYMENT_POLICY.md` 「운세 프롬프트 허브 — 꿀방울과 대체 결제」의 "출석 3회마다 1개"를 현재 규칙(하루 1개)으로 고치고, 2026-10-18 결정(프롬프트 1개 복원)을 적는다. `docs/context/payment-gating.md` 맨 위에 승인 기록을 추가하고, 숙요 인수인계의 정책 줄에 "프롬프트는 2026-10-18 후속 결정으로 복원"을 덧붙인다.
5. 검증: 위 jest + `npm run test:node` + `verify:payment-policy-md`·`verify:krw-copy-canonical`·`verify:i18n-price-drift` + `check:pre-push`. 브라우저(390·1280px)는 mock API로 잔액 0/1/5와 결제 경로를 확인한다.

## P1-B. 연이 상담 1건 조회에 꿀방울로 열었는지 노출

### 현재
- 목록(`GET /api/fortune-chat/consultations`)은 `perUseSource`를 내려준다(`worker/routes/fortune-chat-consultations.js` `list()` select·출력).
- 1건 조회·생성·활성화·재시도 응답은 `present()`(같은 파일 약 68행)를 거친다. `present()`는 `presentFortune(row)`(`worker/yeongnyangi/service.ts`)에 persona·paidFeatureKey·paymentRequestId만 더하므로 `perUseSource`가 **빠진다**. 그래서 상담 화면은 열린 상담이 꿀방울로 열렸는지 알 수 없다(지난 상담 배지만 보인다).

### 고치는 방법
1. `present()`에 `perUseSource: row.perUseSource || ''`를 더한다. **`presentFortune`에는 넣지 않는다** — 영냥이 라우트·`worker/yeongnyangi/report-share.js`(공유)·`worker/lib/record-library.js`가 같이 쓰므로 공유 페이지로 결제 수단이 새지 않게 한다.
2. 클라이언트 `app/fortune-chat/consultation-api.ts`의 `ChatConsultation` 타입에 `perUseSource?: string`을 더한다. `ConsultationRoom.tsx`에서 열린 상담 머리(kicker `stateLabel` 근처)나 메타 줄에 "꿀방울로 연 상담" 표시를 붙인다. 지난 상담 배지는 `accessBadge()`(약 60행)·`styles.accessBadge`를 재사용한다. 새 hex 색 금지, module css에서 `--cd-*` 재선언 금지.
3. 테스트: `__tests__/worker/fortune-chat-consultations-route.test.js`에 꿀방울로 연 상담 1건 조회가 `perUseSource: 'honey'`를 돌려준다는 단언, 결제 상담은 `'payment'` 또는 빈 값이라는 단언을 추가한다. `__tests__/ui/fortune-chat.static.test.js`에 표시 고정 단언을 추가한다.

## P2. 확인 후 처리 (사용자 지정 없음)

- **무료 이용 주석·문구가 낡았다.** `.github/workflows/paid-flow-gates.yml` 312행 "무료 3회 이후 회당 5,000원", `worker/lib/paid-feature-registry.js` 376행 주석 "비회원 1회 + 계정 3회". 실제 한도는 `worker/lib/guardian-fortune-usage.js` 13·15행에서 0이고 `worker/yeongnyangi/per-use-access.js` 101–102행 주석은 신규 무료 접근 종료로 적혀 있다. 주석만 맞추면 된다(동작 변경 없음).
- **홈 검증 스크립트가 현재 홈과 어긋난다.** `node scripts/design/verify-home-funnel.cjs`(정적 서버 `public`이 4180에 떠 있어야 함)가 3건 실패한다: strict-mode `.cdh-primary`가 3개(히어로 + 꿀방울 출석·확인 버튼), "story cards open side by side", "first viewport has one filled CTA". 영냥이 배너 복원 전 기준(`9c139bc3c`)에서도 똑같이 실패하므로 기존 문제다. 스크립트 선택자·기대를 현재 홈 구조에 맞춘다(검사 약화 금지 — 의도를 유지한 채 선택자를 좁힌다).
- **운명 찻집 색 토큰이 정본과 다르다.** 찻집 사설 토큰이 아직 어두운 보라 톤이다. 정본은 연이의 크림·로즈 팔레트다. 디자인 결정이 필요하니 사용자 확인 후 진행한다.
- **네오 운영실 `hasPaidPayment`가 금액을 보지 않는다**(`worker/routes/neo-operation-room.js` 488행). `userId·featureKey·paymentType·status`로만 찾는다. `astrology-ai.js`·`nakshatra-ai.js`의 정본 패턴도 같으므로 단독 결함은 아니다. 금액 대조를 넣을지는 결제 정본(`docs/payment-policy-flow.md`) 기준으로 판단한다. 결제 코드라 사용자 승인 범위를 확인한다.
- **견적 없는 예전 네오 임시저장.** 네오 v3(사주 기본)부터 신규 입력에서 레거시 모드(`ziwei`·`ziwei_saju`, `lib/neo-consultation/contract.js` `LEGACY_MODES`)를 거절한다. 브라우저에 남은 예전 임시저장은 사용자가 옵션을 다시 골라야 한다. 의도된 동작이고, 안내 문구가 충분한지만 확인한다.

## 참고 위치

- 연이 꿀방울 정본: `worker/lib/honey-wallet.js`(`FORTUNE_CHAT_HONEY_COST`, `debitFortuneChatHoney`, `refundFortuneChatHoney`), `worker/yeongnyangi/repository.js`(`attachChatAccess` 꿀방울 분기, `attachChatHoney`, `refundChatHoney`).
- 정책 문서: `PAYMENT_POLICY.md` 「연이 운명 상담 — 꿀방울 30개로 열기」, `docs/context/payment-gating.md` 2026-10-18 절.
- 이전 화면 검증 스크린샷: `D:\Development\verify-out\yeoni-room\`.
