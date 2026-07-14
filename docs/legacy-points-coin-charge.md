# 레거시: 포인트/코인 충전 (`/points`, `PointsClient.tsx`)

> 상태: **레거시(현재 미사용)** — 삭제하지 말고 보존. 향후 코인 충전 시스템 부활 가능성 있음.

## 요약

- `app/points/PointsClient.tsx` 및 `/points` 라우트는 **구버전 코인/포인트 충전** 화면이다.
- 현재 서비스는 **코인 충전을 사용하지 않는다**(재화 체계는 이용권/월정석/코인이며, 코인은 폐지된 내부 단위 — `CLAUDE.md` 결제 시스템 섹션 참고). 유료 기능은 잠금 콘텐츠 단건 결제(DIRECT_KRW, PortOne V2 → KG이니시스)와 이용권/월정석 게이팅으로 처리한다.
- 이 파일은 **나중에 코인 충전 시스템을 다시 도입할 가능성** 때문에 삭제하지 않고 레거시로 남겨둔다.

## 단건 결제 문구 변경 범위에서 제외한 이유 (2026-07-14)

단건 카드 결제 진행 문구를 `잔액을 확인하는 중이에요` → `단건으로 카드 결제를 준비 중이에요`로 바꾸는 작업에서, `PointsClient.tsx:3408`의 동일 문구는 **의도적으로 원문(`잔액을 확인하는 중이에요`)으로 유지**했다.

- 이유: `/points`는 잠금 콘텐츠 단건 결제가 아니라 **코인 충전 화면**이며 현재 미사용/레거시다. "단건으로 카드 결제를 준비 중이에요" 문구는 이 화면의 UX 맥락에 맞지 않는다.
- 실제 단건 카드 결제 경로의 문구만 변경됨: `constants/loadingMessages.ts`(12개 로케일 `access_check.single`), 루트 `index.html`과 6개 미러의 `CD_LOADING_MESSAGES.access_check.single`, `js/core/index-inline-runtime.js`(+ `public/js` 사본)의 `indexRuntime.message.004`.

## 코인 충전을 부활시킬 때 유의

- 이 화면을 재활성화하려면 `/points` 진입 경로·결제 게이트가 현행 pass-first 게이팅 규칙(`CLAUDE.md` 참고)과 충돌하지 않는지 먼저 점검할 것.
- 사용자 노출 문구는 코인 금액을 그대로 렌더링하지 말고 통화(KRW) 환산 표기 규칙을 따를 것(`lib/payment/coin-pricing.ts`).
