---
status: active
updated: 2026-09-05
next: PR #1577 머지 여부 확인 → 머지됐으면 프로덕션 승격 1회(사용자 요청 있음) → 승격 뒤 10분 크론 로그에서 `[CRON] payments-v2 webhook replay` 가 미지급 이벤트를 processed 로 닫는지 확인
---

# 이용권 결제 후 미지급(P0) 복구

## 왜

사용자 원문: 모바일에서 결제·출금은 되는데 이용권이 안 붙는다. 프로덕션에서 "이용권 적용을 확인하고 있어요"가 계속 남는다(여러 수단 전부, 버튼 없이 스피너). 웹훅은 레거시 말고 V2 로 새로 만들고, 서버 설정을 확실히 해서 바로 승격해 직접 확인하고 싶다. 카카오페이 전용 타일은 삭제.

## 지금 상태

- 근본 원인 확정: 프로덕션 워커 `PORTONE_API_SECRET` 이 죽은 값 → PortOne 401 → 웹훅 `PG_UNAVAILABLE`·크론 대조 실패. 시크릿은 `.env.local` `PORTONE_V2_API_Secret`(실연동)으로 교체 완료(08:10Z 크론 `settled:1`, 프로브 200).
- 브랜치 `fix/payment-mobile-entitlement` = PR #1577 (V2 웹훅 재생 + 동기화 스크립트 우선 소스). 미머지.
- 프로덕션 승격은 사용자가 명시 요청함 — 머지 뒤 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production` 1회.

## 남은 작업

- [ ] B-1 카카오페이 전용 타일 삭제: `js/core/checkout-entry.js` 4곳(:611/:629/:651/:694) + `checkout-entry.d.ts:19` + `scripts/verify-payment-choice-parity.mjs:512` → `sync:public` → `?v=` 핀 22개 → `verify:payment-freeze -- --update`
- [ ] B-2 `app/points/PointsClient.tsx` `confirmSubscriptionWithServer`: `GRANT_PENDING` 이면 `pollUrl` 3회(3/6/12s) → 재확정, 실패면 202 오류 → 불확실 갈래(버튼), 대기 주문 미삭제, `subscription_confirm_uncertain` 보고, 45s 상한. 파일은 BOM+CRLF — node 패치 스크립트만.
- [ ] B-3 `grantOrderEntitlement` 에 `[payments] pass-grant {orderId, method, source, outcome, ms}` 1줄
- [ ] B-4 테스트 ≥3 (KAKAOPAY 부재 / PointsClient 정적 가드 4단언 / 지급 로그)
- [ ] 브랜치 A `fix/payment-method-waiting-copy`: `PaymentLoading.tsx:292` 첫 줄 제목 승격 + `whitespace-pre-line`, `PointsClient.tsx:4435` 리터럴 2개 → i18n 키(ko+en·ja·zh-CN·zh-TW 저작), 렌더 테스트 1
- [ ] 보정(backfill): PG paid 인데 `ORDER_EXPIRED` 로 남은 주문 5건(`sub_s1m_a65e41…`·`2766c5…`·`353800…`·`541227…`·`52ee5f…`) — **별도 승인 뒤** dry-run → 실행. `0051d9…`·`1f628e…` 는 PG 취소됨.
- [ ] `.env.cloudflare.local` 의 죽은 `PORTONE_API_Secret` 은 사용자가 직접 지운다(에이전트는 `.env*` 편집 금지).
- 끝 판정: 프로덕션에서 이용권 결제 1건이 결제창 닫힘 후 활성 표시, `payment_webhook_events` 에 failed 잔존 0.

## 정본 예시

`worker/payments/index.js` `replayWebhookEvents` (runPaymentsV2Reconcile 바로 위).

## 함정

- 테스트/실연동은 채널키로 갈리고 storeId 는 같다 — 프로덕션에 테스트 시크릿을 넣어도 조회는 되고, V2 확정 경로에는 PG 취소·환불 호출이 없어 자동 환불은 안 난다. 다만 웹훅 서명 시크릿은 콘솔 환경별이다.
- 동기화 스크립트에 `--only-key` 없이 돌리면 프로덕션 시크릿 전부를 덮는다.
- `check:quick` 의 `build:worker` 는 로컬 `workers-og` 미설치로 항상 실패 — 코드 회귀 아님, 뒤의 `verify:entry-encoding -- --strict-core` 를 따로 돌린다.

## 검증

```
node scripts/verify-payment-reconcile.mjs && node scripts/verify-payment-concurrency-guards.mjs
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest __tests__/worker/payments-v2 __tests__/worker/payment-reconcile-v2-settle.test.js __tests__/worker/cron-failure-alert.test.js
```

## 모르는 것

- "버튼 없이 무한 대기"의 클라이언트 갈래는 코드로 재현되지 않았다(최대 ≈64s 유한 대기 + 버튼). 시크릿 사고가 사라진 뒤에도 재현되면 DevTools 의 `POST /api/payments/subscription/confirm` 상태·code·소요시간이 필요하다.
