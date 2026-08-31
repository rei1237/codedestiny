---
status: blocked
updated: 2026-08-31
next: "PortOne 콘솔에 카카오페이 채널이 등록됐는지 사용자에게 확인받는다. 등록 전에는 아래 3단계 중 어느 것도 시작하지 않는다 — 배관은 이미 전부 머지돼 있고 남은 건 이 승인뿐이다."
---

# 카카오페이 결제수단 — 개통 (배관 완료, 개통 대기)

## 왜

결제창 2단계(결제수단 고르기)에 카카오페이를 넣는다. PortOne V2 는 `requestPayment` 호출당
채널키를 **하나만** 받으므로 이니시스 채널에 얹을 수 없고 전용 채널키가 필요하다.

## 지금 상태

- **배관은 끝났다.** PR #1375 머지(`2764a5cb3`). 셸·dp 코어·워커·env 계약·가드까지 양끝이 이어져 있다.
- 카드는 `enabled: false` 라 UI 에 **"준비 중"** 으로만 보인다. 채널키가 없어도 카드·계좌이체·상품권은 정상.
- 남은 것은 코드가 아니라 **PG 계약 → 시크릿 투입 → 한 줄 플립** 순서다.

## 남은 작업

- [ ] **1. PG 등록 (사용자)** — PortOne 콘솔에 카카오페이 채널을 만들고 채널키를 받는다.
      판정: 콘솔에 카카오페이 채널이 보이고 채널키 문자열을 손에 넣었다.
- [ ] **2. 시크릿 투입 (사용자 승인 1회)** — 프로덕션 워커에 `PORTONE_KAKAOPAY_CHANNEL_KEY` 를 넣는다.
      🔴 **반드시 `--only-key` 를 준다.** 없으면 프로덕션 시크릿 27개를 통째로 덮어쓴다.
      판정: `getPortOnePublicConfig` 응답의 `kakaopayConfigured` 가 `true`.
- [ ] **3. 플립 (에이전트, 1줄)** — `js/core/checkout-entry.js:536` 의 `enabled: false` → `true`.
      🔴 1번 없이 켜면 PG 가 결제창을 그리기 전에 거절해 **"결제창이 아예 안 뜬다"** 가 된다(#104 회귀와 같은 증상).
      판정: 결제창 2단계에서 카카오페이가 활성으로 뜨고, 누르면 카카오페이 창이 열린다(이니시스 카드창이 아니라).

## 정본 예시

`js/core/checkout-entry.js:536` — `DIRECT_PAY_METHODS` 표 한 줄이 ① 준비중 배지 ② 선택 허용 ③ 요청 payMethod 를 동시에 정한다.

## 함정

- 🔴 `PORTONE_KAKAOPAY_CHANNEL_KEY` 를 `PORTONE_REQUIRED_ENV_KEYS` 에 **넣지 말 것** — 넣으면 값이 없을 때
  카드·계좌이체·상품권까지 전부 503 이 된다. `config/env.contract.json` 의 `required_in: []` 은 의도된 빈 값이다.
- 🔴 접두사 없는 `KAKAOPAY_CHANNEL_KEY` 를 `scripts/sync-cloudflare-worker-secrets.mjs` 의 `SECRET_KEYS` 에
  **넣지 말 것** — `scripts/lib/staging-secret-policy.mjs` 가 `/^PORTONE_/` 로 결제 시크릿을 걸러 스테이징
  동기화에서 빼므로, 접두사가 없으면 **프로덕션 채널키가 스테이징 워커로 들어간다.**
  그 별칭은 로컬 `.env.local` 전용이다(`scripts/dev-with-local-auth.mjs:12`).
- `easyPayProvider` 는 넣지 않는다 — 카카오페이는 PG사 자체가 간편결제사라 채워도 무시된다.
- 결제 코드이므로 손대기 전 [docs/context/payment-gating.md](../context/payment-gating.md) 를 읽고,
  커밋에 `config/payment-freeze.json` 갱신을 **같이** 담는다(`verify:payment-freeze --update`).

## 검증

```
npm run verify:checkout-pass-card      # 채널키 이름이 서버 config 까지 이어졌는지 전수 확인
npm run verify:payment-choice-parity
npm run verify:paid-gate-ui
npm run verify:payment-freeze
```

2026-08-31 실측: 위 4개 전부 통과(`verify-checkout-pass-card` PASS, `payment-freeze` region 4 · file 3).

## 모르는 것

- PortOne 콘솔에 카카오페이 채널이 이미 있는지 **확인하지 못했다.** 콘솔 접근은 사용자만 가능하다.
- 카카오페이의 최소 결제금액 제약 여부. 이니시스 일반 카드결제는 1,000원 미만을 거부하는데
  (`lib/music-access-policy.js:2`) 카카오페이에도 같은 하한이 있는지는 미검증이다.
  🔴 추측해서 코드에 하한을 넣지 말고 개통 시 실제로 확인할 것.
