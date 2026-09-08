---
status: active
updated: 2026-09-08
next: payment-inventory.json의 미검토 상품과 호출을 실제 route부터 추적해 Phase 1 게이트를 완료한다
---

# 결제 안정화 구현 계속하기

## 왜

사용자 요청: 전체 결제 안정화 계획 구현. “이용권은 0원이 되면 소진”, “기한 동안에는 프로필 카드 개수 상한 유지”. 음원 다운로드 이용권 허용과 모든 서비스 보기의 1,000원 분류도 포함한다.

## 지금 상태

- 격리 브랜치 `codex/payment-recovery-pass-quota`. 서비스 코드 수정 없음, Phase 1 조사 도구만 구현. 머지하지 않음.
- `docs/payments/payment-stabilization.md`에 architecture·발견·정책·검토 형식. 전체 요청은 미완료.
- 최신 main에는 서버 resume 저장과 동일 소비 재시도 수정이 이미 있다. 이를 덮어쓰지 않는다.

## 남은 작업

- [ ] 306개 상품/변형/SKU 후보 및 JSON coverage.issues의 전체 호출·source 검토. 서버 키146 + 실제 음원123을 서비스 개수로 합산하지 않는다.
- [ ] 미분류 0개 이후 P0: 음원123개와 generic reason7개 prepare→grant 해석 실패를 실제 호출 경로와 함께 수정.
- [ ] 이용권 소진0원/기간·등급 보존, v2+레거시+snapshot+eligibility, 마지막 소비 지급, 동시 두 곡 한도 차감.
- [ ] 음원 이용권·동일 곡 재다운로드, 1,000원 low 필터와 곡 선택 탐색 항목. Android 무료 정책 유지.
- [ ] 전체 서버 resume/recover/멱등성/환불·재구매/TTL/결과 저장 연결.
- [ ] 과거 조기 종료 복원은 read-only 후보 보고부터. 사용량 보존, 0원은 프로필 상한만 복원.
- [ ] Mongo/Cloudflare/중복 호출 최적화, 전 기능 자동 E2E, 동일 staging SHA의 실제 기기·PG 시험 증거, 성능 비교.
- [ ] 검증·커밋·푸시·PR 검사·사용자 머지. 미통과 게이트를 완료로 표시하지 않는다.

## 정본 예시

`worker/payments/index.js:768`의 grantOrderEntitlement는 주문의 productId/featureKey를 catalog로 재해석한다. 준비의 legacy-pricing과 맞지 않으면 PAID 이후 지급이 누락된다.

## 검증

검증 명령과 상세 정책은 `docs/payments/payment-stabilization.md`. 결제 v2 26 suites/377 tests PASS, Inventory9개 PASS. check:fast는 Node934개 중933 PASS, 기존 yehwa SVG의 CRLF/LF 비교1개 FAIL로 중단. 뒤 검사 미실행. Inventory gate는 미검토10,134항목으로 FAIL. 전체 기능/실기기/staging 미검증.

## 함정

`verify-all-paid-services-payment-flow.mjs`는 환경 로딩 후 실제 DB를 쓸 수 있으므로 개발 검증에 실행 금지. mock network guard 사용. 이 워크트리에는 env를 복사하지 않았다. sync:public/동결 hash 절차 준수. 원래 공유 체크아웃에 unrelated 변경113경로가 있어 origin/main에서 새 워크트리를 만들었다.

## 모르는 것

실제 PG 앱 전환·운영 index·과거 복원 대상 수는 미확인. 근거가 없으면 추측해서 채우지 말고 필요한 환경 정보를 확인한다.
