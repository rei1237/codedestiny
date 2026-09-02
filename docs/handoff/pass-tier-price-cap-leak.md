---
status: active
updated: 2026-09-02
next: 5천원 초과 유료 기능의 진입 게이트가 스냅샷 판정에 넣는 coinCost 실값을 추적해 누수 지점을 확정한다
---

# 이용권 티어 가격 상한 누수 (9,900원권이 5천원 초과 서비스를 연다)

## 왜

사용자 제보: "9900원 이용권이어도 5천원 이상 서비스가 바로 열리는 매우 치명적인 버그. 각 이용권에 할당된 가격 상한에 맞게 열리도록 수정." (2026-09-02, 미수정 상태로 인수인계)

## 지금 상태

- 조사만 진행, 코드 변경 0. 관련 선행 PR #1455(이용권 결제 SDK 멈춤 수정, `fix/points-portone-sdk-stall`)는 push 완료·머지 대기.
- 같은 계획의 PR-2(이용권 결제수단 2단계 확장)도 미착수 — `C:\Users\user\.claude\plans\glimmering-sauteeing-pancake.md` 참조.

## 조사 실측 (2026-09-02)

- 9,900원권 = `standard` 티어, 건당 상한 50코인=5,000원 (`worker/lib/app-store-pricing.js:73`, `worker/lib/profile-limits.js:97-101`). 월 누적 한도 300코인은 별개 AND 게이트.
- 판정 코어는 서버·클라 모두 상한을 집행한다 — 여기는 결백해 보인다(미변경):
  - 서버: `worker/payments/passes.js:335-366` `evaluatePassCoverage` (cost≤0 은 invalid_price 로 fail-closed), pass-check 라우트 `worker/payments/index.js:1069-1192` 는 `resolveLegacyProduct(body).priceCoins` 를 넣는다.
  - 클라 스냅샷: `js/core/pass-verdict.js:394-439` `resolveVerdict` (cost>limit 확정 거부, cost≤0 은 coversNow=false), `app/_lib/billing-client.ts:770` 도 `coinCost <= passLimit` 비교 + :763 KRW→코인(ceil(KRW/100)) 폴백 존재.
- 따라서 누수는 **판정 코어가 아니라 입력 또는 우회 호출부**로 추정(미검증): ① 어떤 기능이 coinCost 를 안 넣거나 0/축소값을 넣고도 열리는 경로 ② `hasActivePass` 만 보고 여는 게이트 ③ snapshot.tier 오염(상위 티어로 저장) ④ 서버 `resolveLegacyProduct` 가 클라 body 가격을 신뢰하는지 미확인.

## 남은 작업

- [ ] 재현 대상 확정: 사용자에게 "어떤 서비스(기능명)가 열렸는지" 확인 — 전 기능 공통인지 특정 기능인지가 ①/②를 가른다.
- [ ] `resolveLegacyProduct`(worker/payments/) 가격 출처 확인 — body 신뢰면 서버도 뚫린다.
- [ ] 유료 기능 진입 게이트 전수(App Router + 셸 dp 코어)에서 스냅샷 판정 호출부의 coinCost 실값 추적. 진입 판정은 로컬 스냅샷만 쓰는 구조(docs/context/payment-gating.md)라 클라 한 곳만 틀려도 무료 개방된다.
- [ ] 수정 + 회귀 가드(변이로 무는지 확인) + jest. 판정 기준: standard 스냅샷으로 51코인 이상 기능 진입 시 결제창이 뜨고, 서버 pass-check 도 price_exceeds_pass_limit 를 낸다.

## 함정

- 코인은 폐지 개념이라 신규 기능은 KRW 가격만 가질 수 있다 — KRW→코인 변환 누락이 유력 후보축.
- `scripts/verify-paid-gate-price-coverage.mjs` · `verify-pass-snapshot-single-source.mjs` · `verify-entry-fanout.mjs` 가 이 축의 기존 가드 — 도는데도 뚫렸다면 가드가 안 무는 변이다(메모리: a-guard-that-runs-is-not-a-guard-that-bites).

## 검증

```
npm run verify:paid-gate-price-coverage; npm run verify:pass-snapshot-single-source
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest __tests__/billing/pass-verdict.test.js
```

## 모르는 것

- 실제로 열린 서비스가 무엇인지(재현 URL/기능명) — 🔴 사용자에게 물을 것. 전 기능인지 특정 기능인지에 따라 원인 축이 갈린다.
