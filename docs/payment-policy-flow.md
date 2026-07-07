# 결제 정책 — 결제 플로우 & 변경 이력 (2026-07-04)

> [1부. 개요](payment-policy-overview.md) · [2부. 콘텐츠 접근 유형](payment-policy-content-access.md) · **3부. 결제 플로우 & 변경 이력 (이 문서)**

## 게이팅 우선순위

모든 유료 결제는 다음 순서로 판정한다(구현 정본: `worker/routes/billing.js`의 `buildPassPaymentDecision`, `worker/lib/profile-limits.js`의 `canUseByPass`/`PASS_LIMITS`):

1. **이용권 선(先)검사** — `canUseByPass(이용권, 가격)`: 이용권 등급 한도(standard 30 / premium 50 / vvip 100코인, family 무제한)가 기능 가격을 커버하면 **결제창 없이 무료 통과**(`paymentPriority: "PASS_FIRST"`, 결제수단 전부 `hiddenMethods` 처리, `accessSource: "subscription"` / `code: "PASS_FREE"`)
2. **미커버/미보유 → 결제창 노출** — 결제창 옵션은 **단건결제(KRW, PortOne)** 와 **월정석** 2가지를 동등하게 제시(`equalPriorityMethods: ["DIRECT_KRW", "MOONLIGHT_STONE"]`, `paymentPriority: "USER_CHOICE_EQUAL"`). 월정석 버튼은 잔액 ≥ `membershipCreditCost`(=코인×10)일 때만 활성, 부족하면 비활성(회색)으로 표시. **월정석은 자동 차감 단계가 아니라 결제창 안의 선택지다.**
3. **코인은 결제창 옵션이 아님** — 코인은 내부 계산 단위일 뿐 사용자에게 결제 수단으로 노출하지 않는다([1부 코인 표시 규칙](payment-policy-overview.md#2-코인레거시-내부-단위-표시-규칙)과 동일).

### 결제창 노출 규칙 (공통)

- 모든 유료 서비스(A 잠금·B 회당 공통)에 적용된다. **이용권 선검사 없이 결제창/PortOne으로 직행하는 구현 금지.**
- **서버 runtimeGate/paymentPayload에 `paymentMode` 하드코딩 금지** — 예: `paymentMode: "DIRECT_KRW"`가 클라이언트 게이트에 전달되면 이용권 선검사를 건너뛰고 단건결제로 직행하며 월정석 옵션도 사라진다(2026-07-08 ziwei-ai에서 제거). 결제수단 판정은 게이트가 서버 `unlock-status`/`buildPassPaymentDecision` 결과로 스스로 정한다.
- 예외: 프로필 카드 추가/삭제(D유형)는 이용권 결제 불가 기능(`passExcluded`)이므로 이용권 선검사 없이 곧바로 결제창(단건결제/월정석)을 연다 — [2부 D유형](payment-policy-content-access.md#d-프로필-카드-추가삭제-고정-관리-수수료) 참고.
- 결제창 UI 구현: React 폴백 `openReactPaymentChoiceModal`(`app/_lib/billing-client.ts`), 런타임 정본 `_cdChooseServicePaymentMode`(`public/js/destiny-profile.js`).

### 잠금 콘텐츠(A유형) 접근 시
```
이용권 유효 여부 확인
  → 유효: 가격이 이용권 커버 범위 이내인지 확인
    → 이내(또는 family): 무료 해제
    → 초과: 결제창(단건결제 / 월정석)
  → 무효/없음: 결제창(단건결제 / 월정석)
```

### 회당 결제(B유형) 서비스
```
이용권 선검사(canUseByPass)
  → 커버: 결제창 없이 무료 통과
  → 미커버/미보유: 결제창(단건결제 / 월정석) — 코인은 내부 계산 단위일 뿐, 최종 청구는 원화
```

## 변경 이력

| 날짜 | 변경 내용 |
|---|---|
| 2026-07-04 | 결제 정책 3부작 최초 작성(개요/콘텐츠 접근 유형/결제 플로우로 분할). 코인 단위 사용자 노출 UI 5곳을 원화 표시로 수정(코드 내부 변수명은 유지). 이용권=구독형(자동갱신 없음)/월정석=비구독 방침 확정. 숙요점 궁합은 유료 회당 결제로 유지 확정 |
| 2026-07-08 | 공통 결제 게이팅 정책 명문화: 모든 유료 결제는 이용권 선검사(등급 한도가 가격 커버 시 결제창 없이 통과) 후 미커버 시에만 결제창 노출, 결제창은 단건결제(KRW)+월정석 2옵션 동등 제시(월정석은 자동 차감 아님). "결제창 노출 규칙(공통)" 신설(서버 `paymentMode` 하드코딩 금지). ziwei-ai runtimeGate의 `paymentMode:"DIRECT_KRW"` 제거 |
