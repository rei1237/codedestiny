---
status: active
updated: 2026-08-31
next: "npm run diag:resend-domains 를 돌려 403 원인이 (a) 미인증인지 (b) 키가 다른 계정 소속인지 가른다"
---

# 운세 이메일 — Resend 403 으로 발송 정지

## 왜

2026-08-19 부터 Resend 가 `403 The code-destiny.com domain is not verified` 를 돌려주어
일일 운세 메일이 12일간 0통이었다. 그런데 크론은 매일 정상 실행됐고 로그도 정상으로 보였다.

## 지금 상태

- PR #1367 (`worktree-email-config-failure-alarm`) — CI 6/6 통과, **머지 대기**.
- 코드 쪽 침묵은 닫혔다. **발송 자체는 아직 막혀 있다** — 원인이 Resend 계정 상태라 코드로 못 푼다.

## 🔴 남은 작업 (순서대로)

### 1. 403 의 진짜 원인 가르기 — 먼저 할 일

사용자 확인: "도메인은 이미 설정돼 있다"(2026-08-31). 그렇다면 원인은 둘 중 **후자가 유력**하다.

```
npm run diag:resend-domains      # GET /domains 읽기 전용, 메일 발송 0
```

- 목록에 `code-destiny.com` 이 **안 보이면** → 워커에 들어간 API 키가 **다른 Resend 계정/팀 소속**이다.
  키를 그 계정의 것으로 교체한다. 🔴 `--only-key` 없이 시크릿을 동기화하면 프로덕션 27개를 덮어쓴다.
- 보이는데 `status != verified` → DNS(Cloudflare) 레코드 문제.
- 🔴 이 스크립트는 `.env.local` 의 키를 읽는다. **프로덕션 워커 시크릿과 같은 값인지 별도로 확인할 것** —
  로컬만 초록불이면 아무것도 증명하지 못한다.

### 2. 발신 도메인을 바꾸게 되면

`EMAIL_FROM`(별칭 `RESEND_FROM`)이 이제 `config/env.contract.json` 에 등재돼 있다.
코드 수정 없이 워커 시크릿/`[vars]` 로 바꿀 수 있다. 🔴 `[vars]` 에 넣으면 그 값이 프로덕션 값이 되고
`worker/lib/resend.js` 의 `DEFAULT_EMAIL_FROM` 폴백은 죽는다.

### 3. 결제 영수증 배치 — 같은 결함, 별도 PR

`worker/payments/receipt-email.js` 의 `sendPendingReceiptEmails` 도 같은 키·같은 발신 도메인을 쓰고,
실패해도 배치를 끝까지 돈다. 다만 `claimReceipt`/`releaseReceipt` 가 실패 시 선점을 풀어
**데이터 손실이 없고 설정이 풀리면 자가 복구**되므로 급하지 않다. 결제 코드라 단독 PR 로 둔다.
분류기(`isResendConfigFailure`)는 이미 있으니 `break` 한 줄과 테스트가 전부다.

### 4. 재개 확인

403 이 풀린 뒤 다음 KST 07:00 크론에서 워커 로그의
`[CRON] Daily Fortune Task completed. sent=...` 가 0이 아닌지 본다.
여전히 막혀 있으면 **텔레그램으로 알림이 온다** — 이제 로그를 뒤질 필요가 없다.

## 이 PR 이 바꾼 계약 (알고 있어야 할 것)

- `sendEmail` 반환에 `configError`·`from` 이 추가됐다. 기존 필드는 그대로다.
- `configError` = 401 · 403 · 키 누락 · 발신자/도메인을 지목한 422. **수신자별 실패(5xx·잘못된 `to`)는
  아니다** — 종전대로 배치를 끝까지 돈다. 이 경계가 무너지면 일시적 실패 한 건이 그날 발송을 죽인다.
- 알림 채널은 텔레그램(`worker/lib/telegram.js`, SNS 일일 발행과 같은 봇). 크론 실행 1회당 최대 1건.
- 회귀 가드: `__tests__/worker/resend-config-failure.test.js` ·
  `__tests__/worker/daily-fortune-provider-config-abort.test.js` (jest 라 PR CI 가 돌린다).

## 하지 말 것

- 🔴 발송 검증에 실메일을 쓰지 말 것. `--check-domains` 가 무발송 진단이고, `--live` 는 1회 한정 허락이 필요하다.
- 새 크론을 만들지 말 것 — `worker/wrangler.toml` 의 `crons` 는 수정 금지 대상이다.
- 별도 "이탈 유저 재방문 메일"과 혼동하지 말 것. 그건 다른 축이고 착수 불가 사유가 따로 있다:
  `docs/handoff/reengagement-email-blocked-2026-08-28.md` (2026-08-31 현재 로컬에만 있고 커밋되지 않았다).
