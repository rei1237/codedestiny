---
status: active
updated: 2026-09-07
next: FortuneTeaHousePage.tsx 의 "게이트 통과 이후" 구간을 runTeaConsultCore 로 뽑고 usePaidResume 를 등록한다
---

# 운명 찻집 모바일 결제 후 결과 미생성 — 재개(resume) 배선

## 왜

> "운명 찻집에서 모바일에서 결제 이후에 운명 찻집 메인 화면으로 갔다가 결과는 생성되지 않고 돈은 냈는데 결과는 볼 수 없는 치명적인 버그가 존재하고 있어"

회당 ₩5,000~₩20,000. 재클릭하면 **또 결제된다**.

## 지금 상태

- 이 축은 **아직 손대지 않았다.** 코드 변경 0.
- 직전 세션은 별개 회귀(이용권 월 한도 소진 안내)만 처리했다 — PR #1746, CI 통과, 머지 대기.
- 계획 전문은 `C:\Users\user\.claude\plans\dynamic-munching-charm.md` 에 있다(계획 A·B·C). 이 문서는 그 요약이다.

## 원인 (실측)

모바일 PortOne 은 상위 프레임을 리다이렉트한다 → `runBillingCoinGate` 의 `await` 가 문서와 함께 죽는다 → 게이트 **이후** 같은 클로저에 있는 상담 생성 호출이 영영 실행되지 않는다. 복귀 처리기는 결제 전에 저장된 **재개 서술자(`resume`)** 가 있어야 기능을 다시 여는데, `src/features/fortune-tea-house/**` 에 `resume`·`usePaidResume` 문자열이 **0건**(Grep 전수).

재과금까지 열려 있다 — 복귀 영수증 소비 지점 두 곳 모두 찻집을 안 탄다(React 는 `internalMainGate: true` 로 진입하고, 찻집은 `useCoinGate` 를 안 쓴다).

## 남은 작업

- [ ] **A. 운명 찻집** (본 요청) — 게이트 없는 생성 코어 분리 → `usePaidResume("fortune-tea-house", run)` 등록 → 서술자에 `cupId`·`questionInput`(JSON)·**`attemptId`** 를 `packPaidResumeArg` 로 접어 넣기 → `buildFortuneTeaBillingGateInput` 에 `resume` 필드 추가 → 재개 시 `grant` 로 증빙 본문 재조립. 복원 실패면 `false` 반환해 기존 "지금 열기" 카드로 떨어뜨린다.
- [ ] **B. 같은 구멍 2건** — 마스터 러브 코덱스(`src/features/master-love-codex/MasterLoveCodexPage.tsx:450`), 관상(`js/PhysiognomyUI.js:1625`·`:2425`, 정적 축이라 `_cdCoinGatePerUse(..., { resume })`).
- [ ] **C. 가드** — `scripts/verify-paid-resume-wiring.mjs` 신규. 유료 게이트 호출부를 소스에서 **전수 발견**해(`runBillingCoinGate|ensurePaidAccess|requestPaidAccess|_cdCoinGatePerUse`, 인자가 변수든 리터럴이든) `usePaidResume`·`registerPaidResumeHandler` 가 없으면 실패. 🔴 손으로 쓴 예외 배열 금지 — 그게 이번 사고의 원인이다. `package.json` 배선 + `verify:guard-wiring` 등재 + PR CI `paths`.

**"됐다" 판정**: 스테이징 모바일에서 결제 → 리다이렉트 복귀 → **결과가 자동 생성**되고, 뒤로 갔다 다시 눌러도 결제창이 다시 뜨지 않는다.

## 정본 예시

배선된 짝을 먼저 열어 형태를 그대로 따른다 — `app/hooks/usePaidResume.ts:15-16`(공개 진입점을 재호출하면 게이트를 또 타서 재과금된다는 계약이 여기 적혀 있다). 게이트 호출부는 `src/features/fortune-tea-house/FortuneTeaHousePage.tsx:246`.

## 함정

- 🔴 **`attemptId` 를 복귀 문서에서 재계산하면 안 된다** — `src/features/fortune-tea-house/lib/honeyDrops.ts:28-41` 이 `Date.now()+Math.random()` 기반이라 값이 달라지고, 서버가 이 값으로 결제 증빙을 매칭하므로(`worker/routes/fortune-tea-house.js:1234-1315`) 402 로 떨어진다. 서술자에 반드시 싣는다.
- 🔴 **`:246` 호출 형태를 바꾸지 말 것**(인자는 변수 그대로) — 형태를 고정하는 테스트와 `verify:paid-gate-price-coverage` 가 걸린다.
- 서술자에는 **원시값만 살아남는다** → `packPaidResumeArg` 로 접는다.
- **주문번호로 결과를 재생성하는 범용 엔드포인트는 없다.** 서버가 입력을 보관하지 않으므로 서술자가 상담 입력 전체를 실어야 한다.
- 찻집은 자동 환불 경로(`worker/lib/payment-refund.js:416`)에 배선돼 있지 않다 — 현재 상태는 "결제만 되고 이용은 미확정".
- 손금·운명 나침반은 배선돼 있지만 **sessionStorage** 라 카카오페이 새 탭 복귀에서 복원 데이터가 사라진다(별건, 보고만).

## 검증

```
npm run verify:guard-wiring
npm run verify:billing-pass-policy && npm run verify:paid-gate-ui && npm run verify:payment-choice-parity
npm run lint && npm run typecheck && npm run check:quick -- --skip-build
```

`app/_lib/billing-client.ts` 를 건드리면 같은 커밋에 `npm run verify:payment-freeze -- --update`.

## 모르는 것

- **이미 돈을 내고 결과를 못 받은 기존 사용자 구제 방법.** 서버에 입력이 없어 재생성이 불가능하다 — 수동 환불인지, 이용권 지급인지 사용자에게 물어야 한다. 🔴 환불 실행은 절대 규칙 2.
- 계획 A·B·C 를 한 PR 로 낼지 나눌지. 🔴 C(가드)를 먼저 내면 A·B 미배선이 CI 를 빨갛게 만든다 — **A·B 를 먼저 고치고 C 를 마지막에** 내는 순서를 권한다.
