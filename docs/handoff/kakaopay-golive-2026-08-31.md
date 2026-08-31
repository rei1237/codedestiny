---
status: active
updated: 2026-08-31
next: "실기기에서 카카오페이 1건을 실제로 결제해 리다이렉트 복귀를 확인한다(사용자만 실행 가능). 코드 작업 없음."
---

# 카카오페이 결제수단 — 프로덕션 라이브

## 왜

"카카오페이가 `포트원 V2 결제 설정값(storeId/channelKey)이 누락되었습니다` 로 죽는다.
상품권은 결제창 한 칸에서 다 되게 묶고, 결제내역 라벨도 같이 고쳐라."

## 지금 상태 (2026-08-31 프로덕션 실측, `71a6e0999`)

- PR #1392 머지 → 프로덕션 수동 승격 완료. `/api/version` → `71a6e0999cd3`.
- `/api/payments/config` → `kakaopayConfigured:true`.
- 배포본에 셸·dp 양쪽 투영기의 `/ChannelKey$/` 스윕이 실려 있다. 🔴 셸 인라인 블록은 빌드가
  `js/shell/s-<hash>.js` 로 뽑아내므로 `/` 를 grep 하면 **안 나온다**(2026-08-31 오판 1회).
- 결제창 2단계는 상품권 1칸 3칩 = 그리드 5칸. 계좌이체·상품권 3종이 `orderMethod` 를 갖게 돼
  결제내역이 더는 "카드 결제"로 뜨지 않는다.
- 🔴 **스테이징은 여전히 카카오페이가 막힌다** — 정책상 `/^PORTONE_/` 를 스테이징에 안 넣는다
  (`scripts/lib/staging-secret-policy.mjs`). 버그가 아니다. 눌러 보려면 PortOne **테스트** 채널키를
  `.env.staging.local` 에 두고 `--target=staging --only-key=PORTONE_KAKAOPAY_CHANNEL_KEY`.

## 남은 작업

- [ ] **실사용 1건** — 모바일에서 카카오페이를 실제로 결제해 리다이렉트 복귀 확인.
      판정: 복귀 후 콘텐츠가 열리고 결제내역에 "카카오페이"로 뜬다.
      🔴 실결제는 사용자만 실행한다(CLAUDE.md 절대규칙 2).
- [ ] **V2 컷오버 때** `worker/payments/compat.js:62` 에는 라벨표가 없다 — `paymentMethodLabel` 을
      쓰는 곳이 하나도 없어 `order.paymentMethod` 원문(`gift_cultureland` 등)이 그대로 노출된다.
      지금 라이브 읽기 경로는 `worker/routes/payments.js:743` 이라 **현재 영향 0**.

## 정본 예시

`js/core/checkout-entry.js` 의 `DIRECT_PAY_METHODS` — `payMethod`(PortOne enum) ·
`orderMethod`(주문 기록 코드) · `channelKeyName` 이 여기서 갈라진다.

## 함정

- 🔴 **클라 투영기가 채널키를 떨어뜨리면 그 수단은 환경과 무관하게 100% 죽는다.** 호출부의
  early-return 때문에 키를 제대로 실어 주는 `/api/payments/config` 폴백이 영영 안 돈다. 그래서
  키 이름을 나열하지 않고 **접미사로 전수 통과**시킨다. `verify:checkout-pass-card` 가 두 투영기를
  잘라 내 **실제로 호출**해 표의 `channelKeyName` 전수를 단언한다(문자열 존재 검사가 아니다).
- 🔴 코어 한 줄이 미러 43개 + 독립 정적 `?v=` 핀 22곳을 움직인다. 핀은 `sync:public` 이 안 건드리고,
  안 고치면 `_headers` 7일 캐시 때문에 변경이 사용자에게 도달하지 않는다. 기대 핀 값은
  `verify:payment-choice-parity` 가 알려 준다.
- 🔴 새 채널키를 `PORTONE_REQUIRED_ENV_KEYS` 에 넣지 말 것 — 값이 없을 때 카드·계좌이체·상품권까지 503.
- 🔴 `--only-key=` 는 스테이징 제외 필터를 우회한다 — `.env.staging.local` 이 비면 프로덕션 키가 스테이징으로 간다.
- `easyPayProvider` 는 넣지 않는다 — 카카오페이는 PG사 자체가 간편결제사라 채워도 무시된다.

## 검증

```
npm run verify:checkout-pass-card · verify:payment-choice-parity · verify:paid-gate-ui
npm run verify:portone-single-payment · verify:billing-pass-policy · node scripts/verify-payment-freeze.mjs
```

## 모르는 것

- 카카오페이 최소 결제금액. 이 레포의 최저 단건은 1,000원(음악 트랙)이고 하한 가드 근거는
  `scripts/verify-billing-pass-policy.mjs:452`. 🔴 하한 값을 추측해 코드에 넣지 말 것.
- (해결) "카드창 안의 카카오페이"는 설정으로 켤 수 없다 — 스테이징 이니시스 창의 노출은 테스트
  환경 기본값이고 실서비스는 이니시스와 별도 계약 신청이 필요하다. 전용 채널이 있으니 이전 불필요.
