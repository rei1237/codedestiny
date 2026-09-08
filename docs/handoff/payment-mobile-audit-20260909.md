---
status: active
updated: 2026-09-09
next: 전체 회귀와 PR CI 통과 후 머지, staging 동일 SHA 확인, 승인된 1회 production 승격
---

# 유료 서비스 환경별 결제 검수

## 범위와 발견

최신 main `357108ef056a4783915ef0e5a143d51306b9df52`에서 공통 결제 코어, 유료 기능 registry와 게이트/복귀 배선, 웹 이용권 상점, Android Play Billing, DB 결제 레인과 PG 시간 제한을 검토했다. 실 PG 결제, 실 LLM, 운영 DB 쓰기는 수행하지 않았다.

- P1: `worker/lib/portone.js`가 fetch 응답 헤더 수신 직후 타이머를 해제했다. 본문이 멈추면 8초 기본 제한 밖에서 대기할 수 있었다. 동일 AbortController와 제한을 JSON 수신 완료까지 유지했다. 재시도, 기본 시간, PG 검증 조건은 변경하지 않았다.
- P1: `app/points/PointsClient.tsx`의 이용권 리다이렉트가 주문 A의 paymentId에 localStorage의 주문 B 등급/수단을 붙일 수 있었다. 서버의 등급 대조에서 거절되어 승인 후 반영이 지연될 수 있다. 주문번호를 대조하며, 불일치 시 서버 주문 정보로 확정한다. A 완료/실패 시 B의 대기 주문을 지우지 않는다.
- 두 결함은 수정 전 실패하는 mock 회귀로 재현했고 수정 후 통과했다. 서버 소유자·금액·통화·등급 검증, 가격·이용권·월정석·단건 결제 정책, 환불 정책 및 DB 스키마는 유지했다.

## 환경별 확인

| 환경 | 확인 근거 | 한계 |
|---|---|---|
| 웹 공통/데스크톱 | 결제 v2·상품·권한·동시성·확정·환불 mock, 공통 게이트 정책 검사 | 실제 카드 승인 미실행 |
| 모바일 웹/외부 앱 복귀 | 새 탭/저장소 없음, 주문별 복귀 입력, GRANT_PENDING, 취소, 실패 후 재개 jsdom; 이용권 주문 분리 실행 검사 | 실제 iPhone/Android PG 앱 왕복 미실행 |
| Android 앱 | Play Billing 서버 mock 및 app-store-billing-policy 검사 | 기기에 설치된 앱 버전과 Play 승인 미검증; 웹 배포는 앱 바이너리 배포가 아님 |
| 서버 | 전용 결제 DB 레인·입장 분리·시간 초과 회귀, worker 설정 parity, 중첩 재시도 검사 | 운영 DB/PG 부하 시험 미실행 |

서버 설정: staging/production 소스에 결제 전용 레인이 활성화되어 있다. Mongo 선택 3초, 연결 5초, 소켓 7초, 작업/트랜잭션 8초 제한의 parity와 기존 회귀가 통과했다. 운영 부하 증거 없이 풀 크기나 제한을 늘리지 않았다. 이번 서버 수정은 실제로 제한이 누락되던 PG 응답 본문 수신 구간을 고친 것이다.

읽기 전용 배포 전 확인: 두 환경의 `/api/payments/config`가 HTTP 200, 카드/카카오페이 채널 존재, KRW, `no-store`로 응답했다. 키 값은 기록하지 않았다. 이는 설정 존재 증거이며 PG 계약/승인 성공 증거가 아니다.

배포 전 staging Pages·Worker는 모두 `357108ef056a4783915ef0e5a143d51306b9df52`, production 양쪽은 `06b0ad911b575abad74e049e4fdef36041fb376b`였다.

## 관련 워크트리 대조

- `codex/payment-recovery-pass-quota`, `wt/payment-resume-recovery-20260908-185528`: main 대비 고유 커밋 없음.
- `codex/payment-stabilization-review`: PR #1837 병합 확인, 남은 커밋은 patch-equivalent.
- `fix/card-single-payment-auto-refund`, `worktree-fix-moonstone-autorefund`: 브랜치 커밋은 남아 있지만 관련 구현/테스트 파일을 main과 대조하면 동일하다. 중복 적용하지 않았다.
- `feat/paid-resume-react-remaining`: 찻집 attempt 재사용과 복귀 인자 전달은 main에 있고 실행 검사 통과.
- `feat-paid-resume-static5`: React/정적 복귀 배선은 최신 가드에서 40/40, 46/46 통과. 오래된 체크포인트 전체를 합치지 않았다.
- `worktree-perf-points-cls`의 PointsClient 차이는 최신 서버 복귀 구현이 없는 낡은 상태다. `codex/sukuyo-reading-house`의 같은 파일은 main과 동일하다. 두 워크트리는 수정하지 않았다.
- 관련 기존 워크트리의 미커밋 변경은 없었으며 전부 보존했다. 전체 과거 inventory 1,091개 수동 검토가 완료됐다는 의미는 아니다.

## 검증

- 결제 v2/브라우저 결제/Play Billing/DB 결제/시간 예산/카드 환불: 33 suites, 427 tests PASS.
- direct-payment-resume + payment-resume-context + tea-attempt-reuse: 25 tests PASS.
- 새 PG 본문 지연 회귀 + subscription 서버: 33 tests PASS.
- 새 이용권 주문 분리 회귀: 3 tests PASS. points-shop-request-budget도 PASS.
- billing-pass-policy, portone-single-payment, paid-gate-ui, payment-choice-parity, checkout-pass-card, paid-feature-billing-policy, ai-prompt-billing-policy, paid-resume-wiring, worker-config-parity, no-nested-retry, payment-concurrency-guards, app-store-billing-policy, payment-freeze PASS.
- `npm run check:fast -- --plan`: critical 전체 회귀 계획 확인. `npm run check:fast` 실행 결과와 PR/배포 결과는 아래 기록한다.

실행 경로: `D:/Development/codedestiny-worktrees/payment-mobile-audit-20260909`
브랜치: `codex/payment-mobile-audit-20260909`

재개 명령: `Set-Location D:/Development/codedestiny-worktrees/payment-mobile-audit-20260909; Get-Content docs/handoff/payment-mobile-audit-20260909.md`

운영 승격은 사용자의 이번 배포 요청 범위이며 CI/스테이징 게이트를 우회하지 않는다. 문제 발생 시 릴리스의 Pages/Worker 동시 롤백 절차를 따르고, 코드 수정은 revert PR로 되돌린다. 로컬에서 운영 배포하지 않는다.

공식 계약 참고: https://developers.portone.io/opi/ko/integration/start/v2/checkout — 모바일 redirectUrl 및 서버 결제 검증.

## 전달 결과

검사 및 배포 진행 중.
