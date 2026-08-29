---
status: active
updated: 2026-08-29
next: worker/lib/app-store-pricing.js 의 amountKRW 8개를 웹가로 내리고, 같은 커밋에서 가드 2개·등록 스크립트 이름 8개·문서를 맞춘다
---

# 앱가 = 웹가 동일화 (Play 콘텐츠 티어 8개)

## 왜

> 사용자 요구 원문: "웹 서비스와 Android 앱의 기능·UI·가격·결제·회원·API·로케일·정책을
> 완전히 동기화하고, 모바일 최적화 후, 최종 배포 파일을 바탕화면에 정리하라."

앱은 Play 수수료 15% 때문에 **콘텐츠 티어만** 웹 대비 20~30% 비쌌다. 이용권 4종은
2026-08-24 개정으로 이미 앱=웹이다. 남은 것은 콘텐츠 티어 8개를 웹가로 내리는 것.

## 이미 끝난 것

- PR #1271 머지 — 앱 빌드 복구(`prebuild:cf`) + 로케일 프루닝. 베이스라인 APK 성립.
- PR #1272 머지 — `docs/pricing/PLAY_CONSOLE_PRICE_UPDATE_2026-08-29.md`(Play 작업표).
- 🔴 **사용자가 2026-08-29 에 Play Console 가격 수정 완료를 확인했다** — 코드 인하의
  선행조건("Play 인하가 코드 배포보다 먼저")이 풀렸다. 이제 코드를 내려도 된다.

## 남은 작업 — 값 8개 + 그 값을 지키던 것들

`worker/lib/app-store-pricing.js` 의 `CONTENT_TIER_TABLE`(`:35-49`) `amountKRW`:

`tier_01` 3900→3000 · `tier_02` 6000→5000 · `tier_14` 8900→7000 · `tier_06` 13000→10000 ·
`tier_09` 25000→20000 · `tier_10` 39000→30000 · `tier_11` 49000→39000 · `tier_13` 89000→70000

전부 **같은 행의 `webAmountKRW` 와 같은 값**이다. 이용권 `PASS_TIER_TABLE`(`:66-71`)은
손대지 않는다. 파일 상단 주석(`:3-4`, `:34`)도 "20~30% 인상" 전제라 같이 고친다.

**같은 커밋에 반드시 함께** (값만 내리면 가드가 깨진다):

- `scripts/verify-app-store-pricing.mjs` — `:35-36` `MIN_MARKUP`/`MAX_MARKUP` 제거,
  `:85-90` 밴드 루프를 동일가 단언으로 교체, `:191` 요약 문구
- `scripts/verify-app-store-billing-policy.mjs` — `:101` `amountKRW > webAmountKRW` → `===`,
  `:154` `[["standard",6000],["premium",13000],["vvip",25000]]` → 5000/10000/20000
- `scripts/create-play-console-products.mjs` — `:40-53` `CONTENT_LISTINGS` 이름 8개
  (**이름에 금액이 박혀 있다**: "운세 콘텐츠 3,900원" → "3,000원"), `:61-63` `PASS_LISTINGS`
  의 `coverage` "6,000원 이하"→"5,000원 이하" / 13,000→10,000 / 25,000→20,000.
  🔴 죽은 SKU(`03`·`04`·`05`·`07`·`08`·`12`)는 건드리지 않는다.
- 문서 4: `docs/play-console-submission-values.md`(가드가 문자열로 대조한다) ·
  `docs/pricing/PRICING_TIERS.md` · `docs/pricing/PLAY_CONSOLE_TASKS.md` ·
  `docs/play-billing-app.md`

새 값의 전체 표(상품 이름 포함)는 `docs/pricing/PLAY_CONSOLE_PRICE_UPDATE_2026-08-29.md`
1절에 이미 있다 — **그 표를 정본으로 옮겨 적으면 된다.**

## 정본 예시

동일가 단언은 새로 쓸 필요가 없다. `scripts/verify-app-store-pricing.mjs:92-100` 의 이용권
루프가 이미 `pass.amountKRW !== pass.webAmountKRW` 면 실패시킨다 — 콘텐츠 티어 루프를
그 모양으로 바꾼다.

## 이 레포 고유 규칙

- 🔴 파일을 고치기 전에 `EnterWorktree` 로 격리한다. 기본 작업 디렉터리는 여러 세션이 공유한다.
- 🔴 `main` 직접 작업·배포 금지. 브랜치 → 커밋 → push → PR → CI → **머지는 사용자**.
- 🔴 **CRLF 파일**: `verify-app-store-pricing.mjs` · `verify-app-store-billing-policy.mjs` ·
  `create-play-console-products.mjs`. Edit/sed 로 고치면 전 파일 diff 가 된다 → node 패치
  스크립트로 쓰고 개행 개수를 검산한다. `app-store-pricing.js` 는 LF.
- 🔴 `verify:app-store-billing-policy` 는 **CI 배선돼 있다** — 값만 내리면 머지 전에 깨진다.
- 🔴 `npm run play:products:apply` 는 Play 에 실제로 쓴다 — 실행 금지. 실결제 승인도 금지.
- `build:cf` 가 다시 쓰는 `rss.xml`·`insights/rss.xml`(+`public/` 미러)은 커밋 전 되돌린다.
  반대로 `sync:public` 산출물은 반드시 같은 커밋에 담는다.

## 검증

```
npm run verify:app-store-pricing
npm run verify:app-store-billing-policy
npm run verify:play-console-products
npm run verify:mobile-pricing-parity
npm run verify:payment-freeze
npm run lint
npm run typecheck
```

## 그 다음 (이 작업 뒤)

- **D. 앱 `/api/*` 리타게팅 31개** — `docs/handoff/android-web-sync-2026-08-29.md` "남은 작업 D"
- **F. 실기기 검증** / **G. 릴리스** — 업로드 키스토어 분실, 재설정 승인 대기.
  APK 가 121MB 인 것(VN·음원 CDN 오프로드 0건)도 같은 문서의 "함정" 절에 있다.

## 모르는 것

- Play Console 의 실제 등록가는 코드가 확인할 수 없다. 사용자의 2026-08-29 확인에 의존한다.
  앱 표시가 < 청구가면 정책 위반이므로, 배포 뒤 앱에서 티어 1건씩 결제 시트를 열어 육안 대조할 것.
- 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라.
