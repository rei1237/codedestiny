---
status: active
updated: 2026-09-23
next: "스테이징 검증(verify:staging) 후 운영 승격 1회 승인을 받고, 포트원·이니시스 문의 항목을 확인한다."
---

# KG이니시스 가맹점 보안 권고(2026-09-18) 적용 — 인수인계

다음 세션 첫 문장: "docs/handoff/inicis-security-advisory-2026-09.md 를 읽고 '남은 일'부터 이어서 해."

## 결론
- 웹 단건 결제는 **전부 포트원 V2 경유**다. KG이니시스 직접 연동은 0건이고(`stdpay`·`INIpayPRO`·`P_CHKFAKE`·`P_IDCCODE`·`centerCd`·`acceptmethod` 없음), authUrl 을 fetch 하는 코드도 없다.
  따라서 권고 ①의 `P_CHKFAKE`/`signature` 와 권고 ②의 IDC 승인 URL 검증은 **포트원↔이니시스 구간의 책임**이다. 우리 코드에는 넣지 않았다(추측 주입 금지).
- 앱(Capacitor)은 Google Play Billing 만 쓰고 포트원이 없다(`scripts/app-payment-guard.js`).
- 우리 쪽에서 해당되는 부분만 커밋 3개로 보강했다.

| 커밋 | 내용 | 파일 |
|---|---|---|
| 2eccfcf58 | 구 단건 `returnPath` 오픈 리다이렉트 차단: `/\evil.com`, 탭, `https://x//evil.com` 이 외부 origin 으로 새던 것 | `worker/routes/payments.js`(동결, 매니페스트 갱신), `__tests__/worker/payments.return-path.test.js` |
| 0158a4bc9 | 포트원 조회 대조 강화: 금액을 `amount.total` 로 비교(공식 예시), `channel.key` 가 있으면 우리 채널(이니시스·카카오페이)인지 대조 → `CHANNEL_MISMATCH`(422) | `worker/payments/pg.js`, `errors.js`, `reconcile.js` |
| dcb3f9153 | 웹훅 Failed·전액 Cancelled 는 PortOne 재조회 뒤 상태가 맞을 때만 적용. 불일치는 `PG_STATUS_MISMATCH` 로 ack, 조회 실패는 503 + 이벤트 failed(재전송으로 복구) | `worker/payments/index.js`, `__tests__/worker/payments-v2.webhook-events.test.js` |

## 상품 매핑(실측)
- 서버 카탈로그 `listProducts()` 의 유료 상품 158개(영냥이 28개 포함)가 모두 `resolveProduct` → `/prepare` → `confirmOrder` → `verifyPgPayment` 한 경로를 탄다.
- 영냥이는 `confirmOrder` 안에서 `enqueuePaidConsultation` 으로 이어진다(`worker/payments/index.js` 의 영냥이 분기). 이후 큐 → `attachPayment`(금액·소유자 재대조) → 챕터 생성 순서이고, 복구 크론이 10분마다 돈다.

## 검증(전부 mock, 실결제·유료 LLM 호출 0)
- `__tests__/worker/payments-v2*` + webhook-ledger + return-path: 32 suites / 617 tests 통과.
- 재조회 가드 변이 검사: 판정 함수를 항상 true 로 바꾸면 새 테스트 4개가 실패했다.
- resume UI(node --test) 45개, 영냥이 intent·queue·recovery 27개 통과.
- `run-paid-gate-suite` 88/88, `verify-security-hardening`, `verify-payment-concurrency-guards`, `verify-portone-single-payment-regression`, `verify-worker-security-guards`, `verify-payment-freeze` 모두 통과.

## 하지 않은 것(근거)
- 키 재발급: 유출 증거가 없다. 조사 범위는 추적 파일, out/·dist/·.next/·public/·안드로이드 에셋, git 이력 전체, 로그 호출이다. 이력 리터럴 5건은 전부 placeholder 였다.
- 웹훅 타임스탬프 24h 창: 재전송 지평에 맞춘 의도적 설계다(`worker/payments/webhook.js` 주석). eventId unique 가 1차 방어다.
- 구 `/api/payments/single/*` 삭제: 프런트 호출 0건이지만, 삭제는 규칙 6에 따라 별도 변경으로 다룬다.

## 남은 일 / 미확인(완료로 표시하지 말 것)
1. 스테이징 검증(`npm run verify:staging -- --sha=<SHA>`)과 운영 승격(명시적 1회 승인 필요).
2. 운영 결제 성공률과 결제→결과 제공 지표: 이 세션에서는 조회하지 않았으므로 미확인이다.
3. 운영 로그의 `channelCheck`/`storeIdCheck` absent 비율을 실측한 뒤 엄격 모드 전환을 검토한다.
4. 포트원 문의: V2 KG이니시스 채널에서 `P_CHKFAKE`/`signature` 검증과 IDC centerCd 승인 URL 검증을 포트원이 수행하는가? 권고 메일 대응 공지가 있는가?
5. 포트원 콘솔: 운영·스테이징 웹훅 시크릿과 웹훅 URL 이 등록돼 있는지.
6. 이니시스 가맹점 관리자: 포트원 연동 MID 가 권고 대상인 "직접 연동"으로 분류되는지.
7. (결제 외) 커밋 42a28e593 의 `server/.env` `MONGO_URI` 가 템플릿인지 사람이 확인한다. 실제 값이었다면 DB 비밀번호를 교체한다.
