---
status: active
updated: 2026-09-01
next: "사용자만 실행 가능한 확인 2건 — ① 이니시스 카드창에 간편결제가 뜨는지(계약 승인 후) ② 카카오페이 1건 실결제로 리다이렉트 복귀. 둘 다 코드 작업 없음."
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

- [ ] **이니시스 카드창의 간편결제 노출 확인**(2026-09-01 추가). 이니시스가 간편결제를 허가했으므로
      프로덕션에서 단건 결제 → `[신용카드 · 간편결제]` 까지만 눌러 창 안에 카카오페이가 함께 뜨는지 본다.
      **실결제 불필요** — 창만 확인하고 닫으면 PENDING 주문 1건이 남는다.
      뜨면 코드 작업 0이다(아래 "정본 예시" 밑 noeasypay 항목 참고).
- [ ] **실사용 1건** — 모바일에서 카카오페이를 실제로 결제해 리다이렉트 복귀 확인.
      판정: 복귀 후 콘텐츠가 열리고 결제내역에 "카카오페이"로 뜬다.
      🔴 실결제는 사용자만 실행한다(CLAUDE.md 절대규칙 2).
- [x] (2026-08-31 해결) 결제수단 코드 원문 노출. 🔴 앞선 기록의 "현재 영향 0" 은 **오판이었다** —
      주문 상세는 이미 V2(`worker/index.js` 의 `legacyShape`)를 타므로 `compat.js` 가 라이브였고,
      게다가 `markOrderPaid` 가 승인 순간 `paymentMethod` 를 PortOne 타입으로 덮어써 카카오페이·
      계좌이체·상품권이 지워지고 있었다. 라벨 정본은 `worker/lib/payment-method-label.js` 하나다.

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
- 🔴 **이니시스 카드창의 간편결제 동반 노출은 `payMethod:"CARD"` 의 기본 동작이다**(2026-09-01 문서 확인).
  끄는 스위치만 있고 켜는 스위치는 없다 — PC 는 `bypass.inicis_v2.acceptmethod` 의 `noeasypay`,
  모바일은 `P_RESERVED` 의 `noeasypay=Y` 가 "(카드결제 시) 간편결제 미노출 옵션"이다
  (developers.portone.io/opi/ko/integration/pg/v2/inicis-v2). 우리는 둘 다 안 보낸다
  (`js/core/checkout-entry.js` `portoneBypass()` 는 `P_RESERVED: ["global_visa3d=Y"]` 하나뿐).
  🔴 **결제창을 "정리"한다며 noeasypay 를 넣지 말 것** — 이니시스 계약분 간편결제가 통째로 사라지고,
  이니시스는 간편결제사별 노출제어가 불가라 카카오페이만 남길 수도 없다. 전용 채널 카카오페이 카드와는
  별개 경로이므로 그 카드가 살아 있어도 증상이 가려진다.
- 🔴 새 채널키를 `PORTONE_REQUIRED_ENV_KEYS` 에 넣지 말 것 — 값이 없을 때 카드·계좌이체·상품권까지 503.
- 🔴 `--only-key=` 는 스테이징 제외 필터를 우회한다 — `.env.staging.local` 이 비면 프로덕션 키가 스테이징으로 간다.
- `easyPayProvider` 는 넣지 않는다 — 카카오페이는 PG사 자체가 간편결제사라 채워도 무시된다.
- 🔴 **결제수단 라벨표를 어느 파일 안에 직접 두지 말 것.** 읽기 경로가 셋이라(주문 상세 `compat.js` ·
  결제내역 `routes/payments.js` · 영수증 메일) 표를 복제하면 반드시 갈라진다. 정본은
  `worker/lib/payment-method-label.js` 뿐이고, `verify:checkout-pass-card` 가 그 모듈을 **실행해**
  결제창 표의 `orderMethod` 전수를 단언한다.
- 🔴 **확정은 PG 가 준 굵은 타입으로 우리 코드를 덮지 않는다.** PortOne V2 는 `PaymentMethodEasyPay`
  까지만 알려줘서, 그대로 저장하면 결제창에서 고른 브랜드가 승인 순간 사라진다.

## 검증

```
npm run verify:checkout-pass-card · verify:payment-choice-parity · verify:paid-gate-ui
npm run verify:portone-single-payment · verify:billing-pass-policy · node scripts/verify-payment-freeze.mjs
```

## 모르는 것

- 카카오페이 최소 결제금액. 이 레포의 최저 단건은 1,000원(음악 트랙)이고 하한 가드 근거는
  `scripts/verify-billing-pass-policy.mjs:452`. 🔴 하한 값을 추측해 코드에 넣지 말 것.
- (2026-09-01 갱신) "카드창 안의 카카오페이"의 레버는 **코드가 아니라 이니시스 MID 계약**이었다.
  스테이징 창의 노출은 테스트 MID 기본값이었고, 실서비스는 별도 신청이 필요했다 — 그 신청이 승인됐다.
  승인이 프로덕션 MID 에 반영되면 배포본 그대로 카드창에 간편결제가 뜬다(위 noeasypay 항목).
  전용 채널 카카오페이 카드는 **그대로 둔다** — 결제내역에 브랜드(`orderMethod:"kakaopay"`)를 남기는 건
  그 경로뿐이고, 카드창 안에서 결제하면 PG 가 `PaymentMethodEasyPay` 까지만 알려줘
  `resolveConfirmedPaymentMethod` 가 "간편결제" 로 접는다.
- 카드창 안 간편결제가 PortOne 응답에서 `PaymentMethodCard` 로 오는지 `PaymentMethodEasyPay` 로 오는지.
  라벨 정밀도만 갈리고 데이터 손상은 없다. 실결제 1건이 나오면 그때 확정된다.
