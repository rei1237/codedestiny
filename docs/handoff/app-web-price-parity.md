---
status: done
updated: 2026-08-29
next: 없음 — 이어지는 작업(D·F·G)은 docs/handoff/android-web-sync-2026-08-29.md 로 간다
---

# 앱가 = 웹가 동일화 (Play 콘텐츠 티어 8개) — 완료

콘텐츠 티어 8개를 웹가로 내렸다. 이용권 4종은 2026-08-24 에 먼저 같아졌으므로 이제
**앱의 모든 SKU 가 웹가와 같다.** Play 수수료 15%를 그대로 부담한다 — 의도된 선택이다.

- 가격 정본: `worker/lib/app-store-pricing.js` (`CONTENT_TIER_TABLE`)
- Play 등록 작업 기록: [../pricing/PLAY_CONSOLE_PRICE_UPDATE_2026-08-29.md](../pricing/PLAY_CONSOLE_PRICE_UPDATE_2026-08-29.md)
- 정책 이력: `docs/payment-policy-flow.md` 변경 이력 2026-08-29 행

## 남은 확인 (배포 뒤, 사람 손)

🔴 앱에서 티어 1건씩 결제 시트를 열어 **표시가 = 청구가**를 육안 대조한다. Play Console 의
실제 등록가는 코드가 확인할 수 없고(`purchases.products.get` 이 가격을 안 돌려준다)
사용자의 2026-08-29 확인에 의존한다. 표시가 < 청구가면 정책 위반이다.

🔴 **다시 인상하려면 Play Console 등록가를 사람이 먼저 올린 뒤** 코드를 올린다. 반대 순서면
그 사이가 통째로 위반 구간이 된다. 가드 `verify:app-store-pricing`·
`verify:app-store-billing-policy` 가 오차 0 동일가를 단언하므로 코드만 올리면 먼저 깨진다.

## 다음 작업

[android-web-sync-2026-08-29.md](android-web-sync-2026-08-29.md) 의 "남은 작업" D·F·G.
