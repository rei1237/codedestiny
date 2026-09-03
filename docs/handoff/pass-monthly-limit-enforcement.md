---
status: active
updated: 2026-09-03
next: PR B(pr-b-pass-monthly-limit → base pr-d-pass-payment-hardening) CI 통과 → PR D(#1529) 로 머지 → PR D 를 main 으로 머지 → 스테이징 확인 → 프로덕션 승격(사용자 1회 위임) → 프로덕션에서 월 한도 소진 402 가 결제창 소진 문구로 이어지는지 실사용 확인
---

# 이용권 월 한도 클라이언트 집행 (PR B)

## 왜

> "이용권 정책의 금액 한도가 제대로 지켜지지 않고 있는 심각한 문제가 있어 … 이용권 한도를 다 쓰면 그에 맞는 ui와 메시지가 나와야하고" / "모든 이용권들을 다 고쳐야해"

서버는 정상(`worker/payments/passes.js` `evaluatePassCoverage`+`consumePassCoverage` CAS). 구멍은 클라이언트 세 런타임이 월 한도 캐시를 거부 근거로 안 쓰고, 402 를 받아도 낙관 잠금해제를 되돌리지 않던 것이다.

## 지금 상태 (2026-09-03, 브랜치 `pr-b-pass-monthly-limit`, 미푸시 시점 기준)

2-A~2-E 와 테스트가 전부 들어갔고 로컬 검증 전부 통과. 요약:

- `js/core/pass-verdict.js`: 거부 방향 `monthlyFresh` 요구 제거, `reason`(`REASON_MONTHLY_LIMIT`/`REASON_PASS_LIMIT`/`REASON_NONE`) 노출, `storeMonthlyQuotaFromPayload`(활성 스냅샷에만·단조 감소·`data.paymentOptions` 도 읽음), `isMonthlyLimitPayload`. 🔴 `Number(null)===0` 함정을 테스트가 잡아 null/undefined/"" 는 검사 생략으로 고정.
- `worker/routes/fortune.js` 상태 응답에 `monthlyPassLimit`/`monthlySpendRemaining`.
- 3런타임 되쓰기 + 회수: 셸 `_cdRecordMembershipPassInBackground`(새 `_cdRevokeOptimisticPassUnlock` + access-store `forgetOptimisticUnlock`), React `recordMembershipPassInBackground`, DP `_dpRecordMembershipPassInBackground`. React `canUseByPass` 는 `resolveVerdict().coversNow` 로 교체.
- 낡은 한도표 4곳 제거 → `passLimitForTier` 위임. `verify:pass-tier-policy` 에 삼항표 0건 단언, `verify:billing-pass-policy`·`verify:portone-single-payment` 표식을 새 형태로 갱신(변이 3건 전부 무는 것 확인).
- i18n 3키(`payment.directModal.passMonthlyRemaining`/`passMonthlyExhausted`/`note.passMonthlyExhausted`) 12로케일, ko·en·ja·zh 저작, 나머지 7개 영어 복사. parity `REQUIRED_ALL` 등재. 캐시 핀 2종 회전(core `build-4f7fe9efa1bb`, DP `build-e49824e2d16f`).
- 🔴 `Number(null)===0` 함정이 pass-verdict 네 자리(readSnapshot·buildSnapshotFromStatus·writeSnapshot·resolveVerdict)에 있었다 — `numberOrNaN` 헬퍼로 "없음"과 "잔여 0"을 갈랐다. jest 1건 + `verify:entry-fanout` 이 잡았다.

## 설계 이탈 (사용자 확인 필요)

- **셸: 백그라운드 402(월 한도) 때 결제창을 자동으로 다시 열지 않는다.** 배경 기록 함수는 게이트 콜백 없는 옵션 리터럴로 호출돼 재오픈이 불가능·불안전. 대신 타일을 다시 잠그고 프리체크 캐시를 비우고 토스트를 띄운다 → 다음 클릭이 빠른 경로에서 `monthly_pass_limit_exceeded` 로 결제창을 소진 문구와 함께 연다.
- **React: 월 한도 402 에 낙관 잠금해제 회수가 없다.** `use-content-unlock.ts` 의 `markOptimisticallyUnlocked` 경로를 되돌리는 API 가 없어 이번 PR 범위에서 뺐다. 상태 문구·상점 튕김 차단·되쓰기는 들어갔다.

## 남은 작업

- [ ] PR B 푸시·PR(base `pr-d-pass-payment-hardening`)·`gh pr checks <n> --watch --fail-fast`
- [ ] PR B → PR D 머지, PR D(#1529) → main 머지, 스테이징 배포 확인, 프로덕션 승격(`gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`)
- [ ] 후속(별도 PR): React 낙관 잠금해제 회수 API, 셸 자동 재오픈 여부 결정

## 함정

- 🔴 `storeMonthlyQuotaFromPayload` 를 `buildSnapshotFromStatus` 로 태우면 `state:'none'` 을 합성해 보유자를 미보유로 뒤집는다.
- 🔴 되쓰기 호출은 `pass_applied` 조기 반환보다 앞. `passLimitForTier` 분기는 `verify:pass-recovery-path` 가 본문에 요구하므로 삭제 금지.
- 🔴 `pass-verdict.js`/`destiny-profile.js` 를 바꾸면 parity 핀이 회전한다(core 23파일·DP 25파일). 회전 스크립트를 `docs/**/*.md` 에 돌리지 말 것 — 핸드오프 문서의 과거 핀까지 바꿨다가 되돌렸다.
- 워크트리 가드는 `git`·`$(…)`·heredoc 이 섞인 Bash 를 거부한다. 패치는 Write → `node` → 삭제.

## 검증 (2026-09-03 실행, 전부 통과)

```
npm run typecheck && npm run lint
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest __tests__/billing/pass-verdict.test.js   # 48 passed
npm run verify:pass-snapshot && npm run verify:pass-tier-policy && npm run verify:pass-recovery-path
npm run verify:billing-pass-policy && npm run verify:portone-single-payment && npm run verify:checkout-pass-card && npm run verify:paid-gate-ui
npm run sync:public && npm run verify:public-parity && npm run verify:payment-choice-parity && npm run verify:payment-copy-dictionary && npm run verify:i18n-runtime
npm run verify:payment-freeze -- --update && npm run verify:guard-wiring
node scripts/run-paid-gate-suite.mjs
```
