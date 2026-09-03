---
status: active
updated: 2026-09-03
next: PR #1515 머지 확인 후 새 워크트리에서 2-A(js/core/pass-verdict.js resolveVerdict 의 monthlyFresh 거부 조건 제거)부터 시작한다
---

# 이용권 월 한도 미집행 (PR 2)

## 왜

> "이용권 정책의 금액 한도가 제대로 지켜지지 않고 있는 심각한 문제가 있어 예를들어서 스탠다드는 3만원 한도인데 얼마든지 가능한 문제가 있다. … 이용권 한도를 다 쓰면 그에 맞는 ui와 메시지가 나와야하고"
> "스탠다드만 월 한도를 고치는게 아니라 모든 이용권들을 다 고쳐야해"

서버는 정상이다(`worker/payments/passes.js` 의 `evaluatePassCoverage` + `consumePassCoverage` CAS). 구멍은 전적으로 클라이언트다.

## 지금 상태

- PR #1515(막다른 길 제거, 버그 2) — CI 전체 통과, **사용자 머지 대기**. PR 2 는 그 위에 쌓는다(같은 `sync:public` 생성물).
- PR 2 는 **미착수**. 설계 전문은 플랜 파일 `C:\Users\user\.claude\plans\valiant-crafting-dragonfly.md` 의 "PR 2" 절에 있다 — 착수 전 반드시 읽는다.

## 남은 작업

- [ ] **2-A** `js/core/pass-verdict.js` `resolveVerdict` — 거부 방향의 `monthlyFresh` 요구만 제거(허용 방향은 손대지 않는다). `storeMonthlyQuotaFromPayload` 신설 + `pass-verdict.d.ts` 갱신.
- [ ] **2-B** `worker/routes/fortune.js` `handleSubscriptionStatus` 응답에 `monthlySpendRemaining`/`monthlyPassLimit` 추가(새 Mongo 왕복 0). React 진입(`worker/routes/billing.js`)은 `growthCeilings.maxLines` 여유가 1줄뿐이라 이번엔 건드리지 않는다.
- [ ] **2-C** 되쓰기 + 회수 — 3런타임(`index.html` `_cdRecordMembershipPassInBackground` / `app/_lib/billing-client.ts` / `js/destiny-profile.js`). React `buildSnapshotPaymentEligibility` 의 `canUseByPass` 자체 계산도 `resolveVerdict(...).coversNow` 로 교체.
- [ ] **2-D** 낡은 한도표 **4곳** 제거 — `index.html` 의 `vvip:100/premium:50/standard:30` 삼항(정본 200/100/50). `passLimitForTier` 위임 + `verify-pass-tier-policy.mjs` 에 **0개 단언** 추가.
- [ ] **2-E** 소진 문구 + `/points` 튕김 차단 + 결제창 3렌더러에 잔여 한도 KRW 상시 표시.
- [ ] `__tests__/billing/pass-verdict.test.js` — 4등급 표 구동(**family 5000 포함이 핵심**), 경계 `remaining === cost` 통과, 6시간 전 캐시 + 잔여 0 → 거부, 잔여 `null` → 거부 안 함.

**판정 기준**: 4등급 전부에서 잔여 0 + cost 10 이 `cannotCover` / `reason === "monthly_pass_limit_exceeded"` 이고, `verify:pass-snapshot` 과 `verify:pass-recovery-path` 가 그대로 통과한다.

## 정본 예시

`js/core/pass-verdict.js:394` (`resolveVerdict`) · `index.html:27556` (`_cdBuildFastMembershipCoverage`, 낡은 표 4곳 중 하나)

## 함정

- 🔴 `storeMonthlyQuotaFromPayload` 를 `buildSnapshotFromStatus` 로 태우면 월 필드만 든 페이로드가 `state:'none'` 을 합성해 **보유자를 미보유로 뒤집는다.** 절대 경유하지 않는다.
- 🔴 되쓰기 호출은 `status === 'pass_applied'` 조기 반환보다 **앞**이어야 한다(성공 응답이 소비 후 잔여를 담는다). `passLimitForTier` 분기는 `verify:pass-recovery-path` 가 본문에 남아 있을 것을 요구하므로 삭제 금지.
- 🔴 `js/core/pass-verdict.js` 를 바꾸면 `verify:payment-choice-parity` 의 캐시 핀 12곳(`app/layout.js` + 정적 페이지 11개)이 회전한다. 안 돌리면 `_headers` max-age 7일 때문에 수정이 최대 7일간 도달하지 않는다. 기대값은 가드 실패 메시지가 알려 준다.
- 회수는 access store 에 **키 단위** 낙관 제거 API 가 필요하다 — 기존 `rollbackOptimisticUpdate` 는 `state.optimistic` 을 통째로 비운다.

## 검증

```
npm run typecheck && npm run lint
npx jest __tests__/billing/pass-verdict.test.js
npm run verify:pass-snapshot && npm run verify:pass-tier-policy && npm run verify:pass-recovery-path
npm run sync:public && npm run verify:public-parity && npm run verify:payment-choice-parity
npm run verify:payment-freeze -- --update
node scripts/run-paid-gate-suite.mjs
```

## 모르는 것

- 2-E 의 잔여 한도 표시 문구·자릿수 형식은 사용자 확인을 받지 않았다. 새 i18n 키는 12로케일 수작업이므로 **키를 늘리기 전에 물어본다.**
