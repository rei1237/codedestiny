---
status: active
updated: 2026-08-31
next: "PR #1390 을 머지하고 프로덕션으로 수동 승격한다. 채널키는 프로덕션 워커에 이미 들어갔다. 🔴 스테이징에는 넣지 않았으므로(정책) 스테이징에서 카카오페이를 고르면 오류가 나는 것이 정상이다."
---

# 카카오페이 결제수단 — 개통 (머지·승격만 남음)

## 왜

결제창 2단계(결제수단 고르기)에 카카오페이를 넣는다. PortOne V2 는 `requestPayment` 호출당
채널키를 **하나만** 받으므로 이니시스 채널에 얹을 수 없고 전용 채널키가 필요하다.

## 지금 상태

- **배관은 끝났다.** PR #1375 머지(`2764a5cb3`). 셸·dp 코어·워커·env 계약·가드까지 양끝이 이어져 있다.
- **플립도 끝났다.** 브랜치 `worktree-kakaopay-golive` / PR #1390 — `enabled: false → true` + 미러 + 캐시 핀.
- **이니시스 쪽 별도 허가는 필요 없다**(사용자 확인 2026-08-31). 남은 관문은 머지와 승격뿐이다.
- **주문 기록 코드도 맞췄다**(`92d96e318`). 정본 표의 `orderMethod: "kakaopay"` 가 셸·dp 코어의 요청
  조립부를 거쳐 주문에 실리므로 결제내역·환불 화면이 "카카오페이"로 뜬다(전에는 전부 `card_general`).
- **채널키를 프로덕션 워커에 넣었다**(2026-08-31, `--only-key=PORTONE_KAKAOPAY_CHANNEL_KEY`,
  `wrangler secret put` 성공). 🔴 **스테이징에는 넣지 않았다** — 정책상 `/^PORTONE_/` 는 스테이징에서
  비워 둔다(`scripts/lib/staging-secret-policy.mjs`).
- 실측 2026-08-31 (`curl /api/payments/config`):
  - 프로덕션: kakaopay 필드가 **아예 없다** — 워커가 main 보다 뒤처져 있어서다(정상). 승격해야 나타난다.
  - 스테이징: `kakaopayChannelKey:""` · `kakaopayConfigured:false` — 채널키를 안 넣었으니 맞는 값이다.

## 남은 작업

- [x] **1. 채널키 수령 (사용자)** — 완료(2026-08-31).
- [x] **2. 시크릿 투입** — 완료(2026-08-31). 저장소 루트 `.env.local` 에
      `PORTONE_KAKAOPAY_CHANNEL_KEY=<채널키>` 를 넣은 뒤:
      ```
      npm run secrets:cf:worker -- --target=production --only-key=PORTONE_KAKAOPAY_CHANNEL_KEY
      ```
      🔴 **`--only-key=` 를 빠뜨리지 말 것.** 없으면 프로덕션 시크릿 27개를 통째로 덮어쓴다.
      🔴 등호(`=`) 형식이다(`--only-key PORTONE_...` 는 인자로 안 잡힌다 — `scripts/sync-cloudflare-worker-secrets.mjs:12`).
      🔴 이 명령은 **저장소 루트에서** 돌린다 — 스크립트가 `process.cwd()` 를 기준으로 `.env.local` 과
      `worker/wrangler.toml` 을 찾는다. 워크트리 안에는 `.env.local` 이 없다.
- [ ] **3. 머지 (사용자)** — PR #1390 머지 → 스테이징 자동 배포 → 프로덕션 수동 승격.
      판정(프로덕션): `/api/payments/config` 의 `kakaopayConfigured` 가 `true` → 결제창 2단계에서
      카카오페이가 활성으로 뜨고, 누르면 카카오페이 창이 열린다(이니시스 카드창이 아니라).
      🔴 **스테이징에서는 카카오페이가 오류로 떨어진다** — 채널키를 안 넣었기 때문이고 버그가 아니다.
      스테이징에서도 눌러 보려면 PortOne **테스트** 채널키를 `.env.staging.local` 에 두고
      `--target=staging --only-key=PORTONE_KAKAOPAY_CHANNEL_KEY` 로 넣는다.

## 정본 예시

`js/core/checkout-entry.js:599` — `DIRECT_PAY_METHODS` 표 한 줄이 ① 준비중 배지 ② 선택 허용
③ 요청 payMethod 를 동시에 정한다. 채널키는 값이 아니라 **서버 config 의 필드 이름**(`kakaopayChannelKey`)으로 들어 있고,
요청 조립부가 `config[channelKeyName]` 로 꺼낸다.

## 함정

- 🔴 **플립은 "한 줄"이 아니다 — 43개 파일이다**(2026-08-31 실측). 코어 한 줄을 고치면 ① `sync:public` 이
  미러 전체의 빌드 해시를 돌리고 ② **독립 정적 페이지 22곳의 `?v=` 캐시 핀은 sync:public 이 안 건드린다.**
  그 핀을 안 바꾸면 `_headers` 의 `/js/*.js`(max-age 7일) 때문에 변경이 사용자에게 도달하지 않는다.
  `npm run verify:payment-choice-parity` 가 기대 핀 값을 알려 주므로, 그 값으로 전부 치환한 뒤 다시 돌린다.
- 🔴 채널키 없이 카드만 켜면 **카카오페이를 고른 사람만** `포트원 V2 결제 설정값(storeId/channelKey)이
  누락되었습니다` 오류를 본다(`index.html:22752` fail-closed). 카드·계좌이체·상품권은 영향 없다.
  조용히 이니시스 채널로 폴백하지 않는 것은 의도다("카카오페이를 눌렀는데 이니시스 카드창" 방지).
- 🔴 `PORTONE_KAKAOPAY_CHANNEL_KEY` 를 `PORTONE_REQUIRED_ENV_KEYS` 에 **넣지 말 것** — 넣으면 값이 없을 때
  카드·계좌이체·상품권까지 전부 503 이 된다. `config/env.contract.json` 의 `required_in: []` 은 의도된 빈 값이다.
- 🔴 **`--only-key=` 는 스테이징 제외 목록을 우회한다**(`sync-cloudflare-worker-secrets.mjs` 의
  `targetFilteredKeys`). 그래서 `--target=staging --only-key=PORTONE_KAKAOPAY_CHANNEL_KEY` 를
  `.env.local` 만 채운 채로 돌리면 **프로덕션 채널키가 스테이징 워커로 들어간다.** 스테이징에 넣을
  때는 반드시 테스트 채널키를 `.env.staging.local` 에 먼저 둔다(그 파일이 스테이징에서 가장 먼저 읽힌다).
- 🔴 접두사 없는 `KAKAOPAY_CHANNEL_KEY` 를 `scripts/sync-cloudflare-worker-secrets.mjs` 의 `SECRET_KEYS` 에
  **넣지 말 것** — `scripts/lib/staging-secret-policy.mjs` 가 `/^PORTONE_/` 로 결제 시크릿을 걸러 스테이징
  동기화에서 빼므로, 접두사가 없으면 **프로덕션 채널키가 스테이징 워커로 들어간다.**
  그 별칭은 로컬 `.env.local` 전용이다(`scripts/dev-with-local-auth.mjs:12`).
- 🔴 **`payMethod` 와 `orderMethod` 는 다른 값이다.** 앞은 PortOne 에 보내는 enum(`EASY_PAY`), 뒤는
  주문에 기록되는 코드(`kakaopay`)다. 뒤를 서버 라벨표(`worker/routes/payments.js`
  `resolvePaymentMethodLabel`)가 모르는 값으로 두면 결제내역에 코드 원문이 그대로 노출된다 —
  `verify:checkout-pass-card` 가 그 존재를 확인한다.
- **인접한 기존 부정확**(미수정, 2026-08-31 실측): 계좌이체·상품권 3종도 주문에는 `card_general` 로
  기록돼 결제내역이 "카드 결제"로 뜬다. 고치려면 워커 라벨표와 `app/points/PointsClient.tsx:1131`
  로케일 라벨표를 함께 늘려야 해서(로케일 문구 작업 동반) 이번 범위에서 뺐다. 카카오페이는 라벨
  분기가 이미 있어 문구 작업 없이 정확해진다.
- `easyPayProvider` 는 넣지 않는다 — 카카오페이는 PG사 자체가 간편결제사라 채워도 무시된다.
- 결제 코드이므로 손대기 전 [docs/context/payment-gating.md](../context/payment-gating.md) 를 읽는다.
  `verify:payment-freeze` 는 이 플립에 반응하지 않았다(2026-08-31 실측: 통과 — region 4 · file 3 · 상한 2).

## env 배선 실측 (2026-08-31, `git grep` 전수)

키 하나가 콘솔에서 결제창까지 이어지는 경로. 중간에 끊긴 곳은 없다.

```
PORTONE_KAKAOPAY_CHANNEL_KEY (+별칭 3종)
  → worker/lib/portone.js:80   getExactEnvWithAlias
  → worker/lib/portone.js:261  kakaopayChannelKey / :281 kakaopayConfigured
  → worker/payments/index.js:746 · compat.js:99 · routes/payments.js:1241,3629
  → 클라 config.kakaopayChannelKey
  → js/core/checkout-entry.js:599 channelKeyName → index.html:22749 / js/destiny-profile.js:4782
```

## 검증

```
npm run verify:checkout-pass-card      # 채널키 이름이 서버 config 까지 이어졌는지 전수 확인
npm run verify:payment-choice-parity   # 캐시 핀·12로케일 문구
npm run verify:paid-gate-ui
npm run verify:portone-single-payment
npm run verify:billing-pass-policy
node scripts/verify-payment-freeze.mjs
```

2026-08-31 실측: 위 6개 + `lint` + `typecheck` 전부 통과(플립 브랜치 기준).

## 모르는 것

- 카카오페이의 최소 결제금액 제약 여부. 이니시스 일반 카드결제는 1,000원 미만을 거부하는데
  (`lib/music-access-policy.js:2`) 카카오페이에도 같은 하한이 있는지는 미검증이다.
  🔴 추측해서 코드에 하한을 넣지 말고 개통 시 실제로 확인할 것.
- 카카오페이 결제창의 **모바일 리다이렉트 복귀**는 카드와 같은 티켓(`cd_direct_payment_resume`)을 타지만
  실제로 태워 본 적이 없다. 개통 직후 모바일에서 한 건 확인할 것.
