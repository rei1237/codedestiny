---
status: active
updated: 2026-09-24
next: "paid-gate-auditor 로 /checkout/ 두 버튼안(단건 명시·Family 명시)을 먼저 감사하고 위험·검증·롤백을 사용자에게 보고한다 — RED·payment-freeze 인접, 승인 전 구현 금지. 속도 문서 후보 6과 합류."
---

# 영냥이 결제 확인 단계 줄이기

## 왜

> 결제 플로우도 너무 확인이 많은것 같고 로직을 가장 효율적으로 최대한 수정해서 최적화시켜주면 좋겠다. (2026-09-24)

## 지금 상태

- 미구현·미승인. 같은 날 챕터 생성 세션이 설계 조사만 하고 넘겼다.
- [`yeongnyangi-paid-flow-speed-2026-09-24.md`](yeongnyangi-paid-flow-speed-2026-09-24.md) 후보 6(선택 모달 생략)과 같은 축이다 — 그 문서와 합쳐 진행한다.

## 현재 흐름

상담 폼 "결제 내용 확인하기" → `/checkout/` 결제 버튼(`copy.payAction`, `app/checkout/CheckoutClient.tsx:250`) → 선택 모달(Family 이용권 / 단건) → PG 창.
`CheckoutClient.tsx:190-200` 이 `runPaidAccessGate` 를 `paymentMode` 없이 `allowedPaymentModes:["pass","direct"]`·`disablePassFirst:true` 로 불러서 모달이 뜬다.

## 권장안

`/checkout/` 에 "단건 결제"·"Family 이용권으로 열기" 두 버튼을 두고 버튼마다 `paymentMode` 를 명시해 모달을 건너뛴다. 동결 파일 `app/_lib/billing-client.ts` 는 고치지 않고 `CheckoutClient.tsx`(동결 목록 밖)만 바꾸는 것이 목표.
- 단건: `paymentMode:"DIRECT_KRW"` → `billing-client.ts:4153-4163` 명시 모드 분기, `:2550-2551` `forceDirectPayment`·`__cdDirectPaymentChoiceConfirmed`. "단건은 사용자의 선택 후에만"(CLAUDE.md)은 명시 클릭으로 충족한다.

## 남은 작업

- [ ] paid-gate-auditor 선행 감사(렌더러 3종·금지 패턴·동결 매니페스트).
- [ ] 위험·검증·롤백 선보고 → 승인 → 구현.
- [ ] 판정: 웹에서 단건 클릭 1번에 PG 창, Family 클릭 1번에 이용권 확인 — 모달 0회. 기존 결제 게이트 verify 전부 통과.

## 함정

- Family 버튼: `disablePassFirst:true` 를 그대로 두면 `billing-client.ts:4154-4155` 가 `MEMBERSHIP_PASS` 명시를 끈다. 버튼별로 이 옵션을 바꾸는 것이 "결제 진입은 로컬 스냅샷, 서버 이용권 판정은 결제창에서" 안인지 감사가 판정한다.
- 앱 런타임에서는 `DIRECT_KRW` 가 명시 모드가 아니다(`directKrwUsesNativeBilling`, `:4156`) — 앱은 네이티브 결제 경로가 그대로 남는다.
- `billing-client.ts` 를 건드리게 되면 payment-freeze 절차(`config/payment-freeze.json`, `scripts/verify-payment-freeze.mjs`).

## 검증

```
npm run check:fast
node scripts/verify-yeongnyangi-browser.mjs --build-static
```

그 뒤 루프백 서버와 브라우저 매트릭스는 `.github/workflows/yeongnyangi-browser-shadow.yml:79-93` 순서를 따른다. 결제 경로 push 는 그 섀도 잡이 자동으로 돈다. 실PG·실결제 금지.

## 모르는 것

- Family 이용권이 없는 사용자에게 Family 버튼을 보여줄지(구매 유도) 숨길지 — 제품 결정, 사용자에게 묻는다.
