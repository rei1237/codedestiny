---
status: done
updated: 2026-08-31
next: "개통 완료(프로덕션 라이브). 남은 것은 실사용 1건 확인뿐 — 모바일에서 실제로 카카오페이 결제를 한 건 태워 리다이렉트 복귀가 도는지 본다. 코드 작업 없음."
---

# 카카오페이 결제수단 — 개통 완료

## 결과 (2026-08-31 프로덕션 실측)

결제창 2단계에 카카오페이가 라이브다. PR #1375(배관) → #1390(플립·주문기록) 머지, `57aa0e133` 수동 승격.

```
/api/payments/config  → kakaopayConfigured:true, kakaopayChannelKey:channel-key-aeef…
/js/core/checkout-entry.js → KAKAOPAY:{enabled:!0,payMethod:"EASY_PAY",
                             channelKeyName:"kakaopayChannelKey",orderMethod:"kakaopay"}
index.html 캐시 핀 → checkout-entry.js?v=build-57aa0e133e73  (배포 SHA 와 동일 — 낡은 핀 없음)
/api/version → gitSha 57aa0e133e73…, environment production
```

🔴 **스테이징은 여전히 카카오페이가 오류로 떨어진다** — 정책상 `/^PORTONE_/` 를 스테이징에 안 넣는다
(`scripts/lib/staging-secret-policy.mjs`). 버그가 아니다. 스테이징에서도 눌러 보려면 PortOne **테스트**
채널키를 `.env.staging.local` 에 두고 `--target=staging --only-key=PORTONE_KAKAOPAY_CHANNEL_KEY`.

## 남은 확인 — 실사용 1건

- **모바일 리다이렉트 복귀** (코드상 안전, 실사용 미검증). 복귀 처리는 `js/destiny-profile.js:4005-4075`
  (`cd_direct_payment_resume`, TTL 30분) 한 곳이고 **결제수단을 전혀 보지 않는다** — `portone_redirect=1`
  과 티켓 존재만 본다. 셸(`index.html:22860`)이 티켓을 쓰고 dp 코어가 읽는 구조라 정적 셸·React 양쪽이
  같은 경로를 탄다(그 파일 4003행 주석). 카카오페이도 동일 배관을 타며 티켓에 `paymentMethod:'kakaopay'`
  가 실린다. 남은 것은 실제 기기에서 한 건 태워 보는 것뿐이다.
- **최소 결제금액** — 이 레포에서 단건결제로 갈 수 있는 **최저 금액은 1,000원**(음악 트랙)이고
  나머지 상품은 전부 3,000원 이상이다. 1,000원 하한은 이미 가드가 지킨다
  (`scripts/verify-billing-pass-policy.mjs:452` — 이니시스 최소 결제금액 근거). 따라서 카카오페이 하한이
  1,000원 이하이면 영향 0, 초과할 때만 음악 트랙 한 건이 걸린다. 🔴 하한 값을 추측해서 코드에 넣지 말 것.

## 함정 (다음에 결제수단을 하나 더 켤 때)

- 🔴 **플립은 "한 줄"이 아니다 — 43개 파일이다.** 코어 한 줄을 고치면 ① `sync:public` 이 미러 전체의
  빌드 해시를 돌리고 ② **독립 정적 페이지 22곳의 `?v=` 핀은 sync:public 이 안 건드린다.** 그 핀을 안
  바꾸면 `_headers` 의 `/js/*.js`(max-age 7일) 때문에 변경이 사용자에게 도달하지 않는다.
  `npm run verify:payment-choice-parity` 가 기대 핀 값을 알려 준다.
- 🔴 **`payMethod` 와 `orderMethod` 는 다른 값이다.** 앞은 PortOne 에 보내는 enum(`EASY_PAY`), 뒤는
  주문에 기록되는 코드(`kakaopay`). 뒤를 서버 라벨표(`worker/routes/payments.js`
  `resolvePaymentMethodLabel`)가 모르는 값으로 두면 결제내역에 코드 원문이 노출된다.
  `verify:checkout-pass-card` 가 그 존재를 확인한다.
- 🔴 채널키 없이 카드만 켜면 **그 수단을 고른 사람만** `포트원 V2 결제 설정값(storeId/channelKey)이
  누락되었습니다` 오류를 본다(`index.html:22752` fail-closed). 조용히 이니시스로 폴백하지 않는 것은 의도다.
- 🔴 새 채널키를 `PORTONE_REQUIRED_ENV_KEYS` 에 **넣지 말 것** — 넣으면 값이 없을 때 카드·계좌이체·상품권까지
  전부 503 이 된다. `config/env.contract.json` 의 `required_in: []` 은 의도된 빈 값이다.
- 🔴 **`--only-key=` 는 스테이징 제외 목록을 우회한다**(`sync-cloudflare-worker-secrets.mjs` 의
  `targetFilteredKeys`). `--target=staging --only-key=…` 를 `.env.local` 만 채운 채 돌리면 프로덕션
  채널키가 스테이징 워커로 들어간다.
- 🔴 접두사 없는 `KAKAOPAY_CHANNEL_KEY` 를 `SECRET_KEYS` 에 **넣지 말 것** — `/^PORTONE_/` 필터를 피해
  프로덕션 키가 스테이징으로 간다. 그 별칭은 로컬 `.env.local` 전용(`scripts/dev-with-local-auth.mjs:12`).
- `easyPayProvider` 는 넣지 않는다 — 카카오페이는 PG사 자체가 간편결제사라 채워도 무시된다.

## 인접한 기존 부정확 (미수정)

계좌이체·상품권 3종은 주문에 여전히 `card_general` 로 기록돼 결제내역이 "카드 결제"로 뜬다
(2026-08-31 실측). 고치려면 워커 라벨표 + `app/points/PointsClient.tsx:1131` 로케일 라벨표를 함께
늘려야 해서(로케일 문구 작업 동반) 이번 범위에서 뺐다. 정본 표
`js/core/checkout-entry.js` `DIRECT_PAY_METHODS` 에 `orderMethod` 를 선언하면 배관은 이미 이어져 있다.

## env 배선 (2026-08-31 `git grep` 전수 — 끊긴 곳 없음)

```
PORTONE_KAKAOPAY_CHANNEL_KEY (+별칭 3종)
  → worker/lib/portone.js:80 getExactEnvWithAlias
  → worker/lib/portone.js:261 kakaopayChannelKey / :281 kakaopayConfigured
  → worker/payments/index.js:746 · compat.js:99 · routes/payments.js:1241,3629
  → 클라 config.kakaopayChannelKey
  → js/core/checkout-entry.js:603 channelKeyName → index.html:22749 / js/destiny-profile.js:4782
```

## 검증

```
npm run verify:checkout-pass-card · verify:payment-choice-parity · verify:paid-gate-ui
npm run verify:portone-single-payment · verify:billing-pass-policy · node scripts/verify-payment-freeze.mjs
```

2026-08-31 실측: 위 6개 + `lint` + `typecheck` 통과. 결제 코드는 손대기 전
[docs/context/payment-gating.md](../context/payment-gating.md) 를 읽는다.
