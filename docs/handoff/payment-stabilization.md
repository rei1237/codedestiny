---
status: active
updated: 2026-09-08
next: 후속 PR의 최신 검사와 staging SHA를 확인하고, 미검토 1,091개 source/product/call 및 결과 저장 완료 시 복구 입력 삭제 연결부터 계속한다
---

# 결제 안정화 구현 계속하기

## 왜

사용자 요청: 전체 결제 안정화 계획 구현. “이용권은 0원이 되면 소진”, “기한 동안에는 프로필 카드 개수 상한 유지”. 음원 다운로드 이용권 허용과 모든 서비스 보기의 1,000원 분류도 포함한다.

## 지금 상태

- PR #1820은 2026-09-08 11:01Z에 merge commit `f66dd8f96c09bcec3586848bd4c71f9e5314c48d`로 main에 병합됐다. PR CI·Paid Flow Gates·staging release #34218466714가 모두 성공했다.
- staging Pages·Worker는 `f66dd8f96`를 같은 값으로 응답했고, `robots.txt: Disallow: /` 및 `X-Robots-Tag: noindex, nofollow`를 실측했다. production Pages는 여전히 `174c363ee`이며 이번 작업으로 production release는 실행하지 않았다.
- 그 뒤 main에는 PR #1828과 #1830이 추가 병합되어 최신 SHA는 `8cc8d24b7f6a60b715e58750a30bf3e9738c1699`다. 자동 staging release #34219052566은 `7fad20ae9`에 대해 실행 중이고 #34219474242는 `8cc8d24b7`에 대해 대기 중이다. staging이 이 최신 SHA로 수렴하기 전에는 수동 재배포·production 승격을 하지 않는다.
- 다음 작업용 clean worktree/branch는 `D:\Development\codedestiny-worktrees\payment-inventory-phase1` / `codex/payment-inventory-phase1`이며, 최신 main `8cc8d24b7`로 rebase하고 `npm run session:start -- --handoff=docs/handoff/payment-stabilization.md`를 통과했다. `npm ci --ignore-scripts`로 이 worktree에만 의존성을 설치했다.
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
- [x] staging이 최신 main `8cc8d24b7`에 수렴했는지 확인. Pages `/version.json`과 Worker `/api/version`가 같은 SHA인지, `robots.txt`·`X-Robots-Tag`가 staging 차단 상태인지 확인한다. release가 실패하면 run log만 확인하고 임의 재배포하지 않는다.

## 정본 예시

`worker/payments/index.js:768`의 grantOrderEntitlement는 주문의 productId/featureKey를 catalog로 재해석한다. 준비의 legacy-pricing과 맞지 않으면 PAID 이후 지급이 누락된다.

## 검증

검증 명령과 상세 정책은 `docs/payments/payment-stabilization.md`. 결제 P0 대상 mock PASS, Inventory 10개 PASS. 지급 실패/가격 차이 0, 미검토 항목은 10,135→1,218개다. critical `npm run check:fast` PASS(Node 940/940, Jest 2,427/2,427, Worker dry-run 포함). 결제 merge SHA `f66dd8f96`의 staging Pages·Worker/noindex 검증은 완료했지만, 후속 main 병합 때문에 canonical staging의 최신 main 수렴은 대기 중이다. 전체 기능/실기기/실제 PG 검증은 미실행이다.

## 함정

`verify-all-paid-services-payment-flow.mjs`는 환경 로딩 후 실제 DB를 쓸 수 있으므로 개발 검증에 실행 금지. mock network guard 사용. 이 워크트리에는 env를 복사하지 않았다. sync:public/동결 hash 절차 준수. 원래 공유 체크아웃에 unrelated 변경113경로가 있어 origin/main에서 새 워크트리를 만들었다.

## 모르는 것

실제 PG 앱 전환·운영 index·과거 복원 대상 수는 미확인. 근거가 없으면 추측해서 채우지 말고 필요한 환경 정보를 확인한다. production은 명시적인 별도 승격 요청 전까지 `174c363ee`를 유지한다.


## 후속 세션 2026-09-08

- 작업 위치: `D:\Development\codedestiny-worktrees\payment-stabilization-review`
- 브랜치: `codex/payment-stabilization-review`, base `8cc8d24b7`.
- 기존 작업 브랜치의 `1a409e7b6` 인계 커밋은 보존했다. 새 linked worktree의 `session:start` PASS.
- 회당 결제/프로필 접근 캐시 범위, 서버 복구 binding, 환불 후 재구매 CAS를 수정했다. 각각 재현 테스트와 대조군이 있다.
- 음원 123개와 4개 source/2개 call 검토를 `payment-inventory-reviews.json`에 기록했다. 현재 잔여는 1,091개이며 `--check`는 의도대로 exit 1이다.
- 결제 v2 26 suites / 389 tests, 접근 캐시 10 tests, 복구 7 tests PASS. 전체 check:fast는 실행 중이며 PR 및 최종 결과를 이어 기록한다.
- staging #34219474242 성공. `verify-deployed-sha --origin=https://staging.code-destiny.com --sha=8cc8d24b7f6a60b715e58750a30bf3e9738c1699 --attempts=1` PASS. Pages·Worker 모두 `8cc8d24b7`, 홈/robots HTTP 200 및 noindex/Disallow 확인. 이번 수정 SHA의 배포 증거와는 구분한다. 배포나 운영 승격을 직접 실행하지 않았다.
- 정정: `reconcile.js`의 7일 초과 복구 payload 정리는 이미 있다. 결과 완료 시 즉시 삭제·route allowlist·원본 이미지 저장 차단 전수 검토는 남아 있다.
- 기존 문서의 1,218개는 이전 추출치다. 위 최신 수치와 검토 파일을 사용한다.

재개: 이 작업 위치에서 본 문서를 읽고 `codex/payment-stabilization-review` PR 상태를 확인한 뒤, `node --require ./scripts/lib/mock-network-guard.cjs scripts/payment-inventory.mjs --check`의 남은 항목부터 추적한다. 실결제·실 LLM·운영 DB 접근을 mock 검증에 섞지 않는다.

로컬 Windows의 `public/icons/yehwa-branch.svg` CRLF 때문에 첫 check:fast가 Node 956/957에서 실패했다. 변경 전 워크트리에서도 동일 실패를 확인했고, 현재 격리 워크트리만 Git 원본 LF 바이트로 복원했다(Git 내용 변경 없음). 생성물 검사 PASS 후 전체 검사를 재실행했다.
