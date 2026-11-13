---
status: blocked
updated: 2026-11-13
next: 별도 웹툰 세션의 메타 설명 폭 수정이 main에 전달되어 PR CI가 복구되면 최신 origin/main을 병합하고 pre-push 후 HEAD:main으로 전달한다.
---

# 앱인토스 유료 상담 결제 활성화·출시

## 첫 행동

`git fetch origin` 후 웹툰 메타 설명 폭 수정이 main에 들어왔는지 확인한다. 들어왔다면 병합하고 targeted 검사와 `npm run check:pre-push`를 실행한 뒤 `HEAD:main`으로 전달한다.

## 지금 상태

- 작업 디렉터리: `D:\Development\codedestiny-worktrees\toss-paid-launch-20261113-163222`
- 브랜치: `wt/toss-paid-launch-20261113-163222`
- 시작 SHA: `a6158fde0cb950d9c21157a5b71cae13e489fc82`
- 안전 워크트리에서만 수정 중이며 원래 main 작업 디렉터리의 다른 세션 변경은 건드리지 않았다.
- 토스 콘솔에 소모품 5개를 생성했으며 모두 비노출 상태다.
- 실제 SKU, 공급가, VAT 포함 판매가, 증거 URL과 1024px 불투명 이미지를 원장에 반영했다.
- `NEW_PURCHASES_AVAILABLE=false`, `TOSS_RELEASE_READY=false/미설정` 상태를 유지한다.
- 코드 커밋: `2db788061`, 설정·개인정보 커밋: `dce6f135d`, 공개 미러 커밋: `eb6642b51`.
- Secret Scan 실패 원인 확인: workflow가 범위 없는 `gitleaks git`을 실행해 main에서 도달할 수 없는 오래된 원격 `wt/*` 브랜치 3개의 이력까지 검사했다. 실패한 88건은 13개 비-main 커밋에만 있었고 모두 origin/main의 조상이 아니었다.
- Gitleaks v8.24.2로 `--log-opts=HEAD` 범위를 직접 검사한 결과 12,288개 main 도달 커밋, 1.13GB에서 검출 0건이었다. 규칙과 allowlist는 변경하지 않았다.
- workflow를 `gitleaks git --log-opts=HEAD --redact --verbose`로 제한하고, bare 명령으로 회귀하지 않는 테스트를 추가했다.
- 위 수정 포함 `npm run check:fast` 통과: Jest 476개 스위트·7,978개 테스트 통과(1개 스킵).
- Secret Scan 수정 커밋 `66b62789e`, 원인 기록 커밋 `4ddab8e08`; 이후 `npm run check:pre-push` 통과.
- 현재 전달 차단은 이번 변경이 아니다. origin/main `c3d692272`의 PR CI run `43397659983`이 `out/yeongnyangi/season-1` meta description 폭 197 > 160으로 실패했다. 별도 활성 워크트리 `yeoni-prologue-webtoon-20261113`의 커밋 `79615c45b`가 정확히 이 문제를 수정했지만 아직 origin/main에 전달되지 않아 중복 수정·체리픽하지 않았다.
- 같은 main의 Yeongnyangi Browser Shadow run `43397659964`는 WebKit `chromium-read-503` 단계에서 로컬 `/api/reviews/eligibility` CORS page error 1건으로 실패했다. 그 전 결제 매트릭스는 통과했으며 새 main push 때 다시 실행될 비결정적 CI 실패로 분류했다.

## 승인 상태

- 2026-11-13 사용자 승인: 무료 5개와 현재 연이·영냥이 유료 상담을 함께 출시 준비한다.
- 2026-11-13 사용자 확정 가격: 토스 판매가 `4,950·9,900·14,850·19,800·29,700원`; 웹 가격은 유지한다.
- 사용자 계획에 따라 콘솔 상품 등록과 코드/설정 준비는 승인되었다.
- 프로덕션 Worker 승격과 비밀값 등록, 상품 노출, 비공개 QR 실결제 1회, 토스 검토 요청, 최종 출시 버튼은 각각 별도 승인 게이트다.

## 작업 규칙과 함정

- 웹 가격과 이용권·월정석·단건 결제 정책을 바꾸지 않는다.
- 공개 API 형식, DB 스키마, 인증 토큰 형식을 바꾸지 않는다.
- 콘솔 생성 SKU가 아니거나 표시 가격과 서버 가격이 다르면 구매를 열지 않는다.
- 기존 구매 복구·재열람은 구매 당시 SKU/가격/주문 상태로 검증한다.
- 프로덕션 비밀값은 출력하거나 저장소에 기록하지 않는다.
- main 전달 전 origin/main 이동과 기존 CI 상태를 확인한다. 브랜치/PR은 만들지 않는다.
- 검토 요청 및 `출시하기`는 누르지 않는다.

## 설계

- `worker/toss/catalog.js`가 실제 토스 SKU와 공급가/판매가/증거의 정본이다.
- Toss 어댑터는 플랫폼 판매가를 기존 `priceKRW` 응답 필드에 담되 웹 가격 원장은 그대로 둔다.
- 상담 준비 요청 지문·스냅샷·구매 기록에는 Toss 결제액을 전달해 결제 시점의 값을 보존한다.
- Worker는 mTLS 인증서 바인딩과 만료일을 설정 파일로 검증하고, 민감 비밀값은 원격 secret으로만 공급한다.
- 개인정보처리방침은 토스 결제, Cloudflare/MongoDB 처리 위탁·국외 이전, 토스 식별자/세션/복구 기록을 반영한다.

## 단계

- [x] 토스 콘솔에 유료 상품 5개 생성 및 비노출 확인
- [x] 실제 SKU·가격·증거·상품 이미지 원장 작성
- [x] Toss 가격 분리와 구매 준비/복구 구현
- [x] 테스트 추가 및 앱 테스트 1,440개·타입 검사 통과
- [x] 개인정보처리방침·로그인 동의 초안·mTLS 설정 준비
- [x] `npm run check:fast` 종료 확인 — Jest 476개 스위트·7,978개 테스트 통과(1개 스킵)
- [x] 기능 단위 커밋
- [x] 최신 origin/main 병합 및 Toss 앱 1,440개 테스트·타입 검사 재확인
- [x] `npm run check:pre-push`
- [x] 기존 main Secret Scan 실패 원인 확인 및 main 도달 이력 검출 0건 확인
- [x] Secret Scan을 `HEAD` 도달 이력으로 제한하고 회귀 테스트 추가
- [x] Secret Scan 수정 커밋과 pre-push
- [ ] 별도 웹툰 수정이 origin/main에 전달되어 기존 PR CI red가 해소되는지 확인
- [ ] 최신 origin/main 병합·pre-push 후 main 전달
- [ ] main CI 1회 확인
- [ ] 프로덕션 승격 승인 후 비밀값/콜백/로그인 등록
- [ ] 비공개 QR 실결제 승인 후 4,950원 1회 검증
- [ ] 검토 요청 승인 후 제출
- [ ] 토스 승인 후 최종 출시 승인
