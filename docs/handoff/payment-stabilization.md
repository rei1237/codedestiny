---
status: active
updated: 2026-09-08
next: PR #1820의 main 병합 보호 정책을 충족한 뒤 canonical staging SHA를 다시 확인하고, payment-inventory.json의 남은 1,218개 미검토 상품/source/call을 실제 route부터 추적해 Phase 1 게이트를 완료한다
---

# 결제 안정화 구현 계속하기

## 왜

사용자 요청: 전체 결제 안정화 계획 구현. “이용권은 0원이 되면 소진”, “기한 동안에는 프로필 카드 개수 상한 유지”. 음원 다운로드 이용권 허용과 모든 서비스 보기의 1,000원 분류도 포함한다.

## 지금 상태

- 격리 브랜치 `codex/payment-recovery-pass-quota`, ready PR #1820. P0 서비스 코드와 회귀 테스트를 구현했으며 main 병합은 보호 정책(관리자 우회 또는 저장소 자동 병합 미설정)으로 대기 중이다.
- PR head `2ddef4e541094f717c8e375093bf50f9ac8d56c7`는 PR CI와 Paid Flow Gates를 모두 통과했다. 공식 staging 릴리스 run `34217097646`도 성공했으며 Pages·Worker 모두 같은 SHA, `robots.txt: Disallow: /`, `X-Robots-Tag: noindex, nofollow`를 확인했다. production release job은 skipped다.
- `docs/payments/payment-stabilization.md`에 architecture·발견·정책·검토 형식. 전체 요청은 미완료.
- 최신 main에는 서버 resume 저장과 동일 소비 재시도 수정이 이미 있다. 이를 덮어쓰지 않는다.

## 남은 작업

- [ ] 305개 상품/변형/SKU 후보 및 JSON coverage.issues 1,218개의 전체 호출·source 검토. 서버 키146 + 실제 음원123을 서비스 개수로 합산하지 않는다.
- [x] 음원123개와 generic reason7개 prepare→grant 해석 실패 및 reason 변형 가격 불일치 수정(Inventory 지급 실패/가격 차이 0).
- [x] 이용권 잔여0원/기간·등급·프로필 상한 보존, v2+레거시+snapshot+eligibility, 마지막 소비 지급과 멱등 감사 마커.
- [x] 음원 이용권·동일 곡 재다운로드, 1,000원 low 필터와 곡 선택 탐색 항목. Android 무료 정책 유지.
- [ ] 전체 서버 resume/recover/멱등성/환불·재구매/TTL/결과 저장 연결.
- [ ] 과거 조기 종료 복원은 read-only 후보 보고부터. 사용량 보존, 0원은 프로필 상한만 복원.
- [ ] Mongo/Cloudflare/중복 호출 최적화, 전 기능 자동 E2E, 동일 staging SHA의 실제 기기·PG 시험 증거, 성능 비교.
- [ ] 사용자/관리자 권한으로 main 병합. 저장소가 auto-merge를 허용하지 않으므로 보호 규칙을 우회하지 않는다. 병합 뒤 canonical staging의 merge SHA를 다시 확인한다.

## 정본 예시

`worker/payments/index.js:768`의 grantOrderEntitlement는 주문의 productId/featureKey를 catalog로 재해석한다. 준비의 legacy-pricing과 맞지 않으면 PAID 이후 지급이 누락된다.

## 검증

검증 명령과 상세 정책은 `docs/payments/payment-stabilization.md`. 결제 P0 대상 mock PASS, Inventory 10개 PASS. 지급 실패/가격 차이 0, 미검토 항목은 10,135→1,218개다. critical `npm run check:fast` PASS(Node 940/940, Jest 2,427/2,427, Worker dry-run 포함). staging 코드/SHA/noindex 검증은 완료했지만 전체 기능/실기기/실제 PG 검증은 미실행이다.

## 함정

`verify-all-paid-services-payment-flow.mjs`는 환경 로딩 후 실제 DB를 쓸 수 있으므로 개발 검증에 실행 금지. mock network guard 사용. 이 워크트리에는 env를 복사하지 않았다. sync:public/동결 hash 절차 준수. 원래 공유 체크아웃에 unrelated 변경113경로가 있어 origin/main에서 새 워크트리를 만들었다.

## 모르는 것

실제 PG 앱 전환·운영 index·과거 복원 대상 수는 미확인. 근거가 없으면 추측해서 채우지 말고 필요한 환경 정보를 확인한다.
